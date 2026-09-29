importScripts("config.js", "session.js");

const { MOODLE_MATCH, PING_MINUTES } = globalThis.AE_CONFIG;
const ALARM = "keepalive";
const PING_TIMEOUT_MS = 10_000;

const BADGES = {
  ok: { text: "ON", color: "#2e7d32", title: "Keeping your Moodle session alive" },
  expired: { text: "!", color: "#c62828", title: "Logged out - sign in to Moodle again" },
  error: { text: "?", color: "#ef6c00", title: "Could not reach Moodle" },
  off: { text: "OFF", color: "#757575", title: "Paused" },
  idle: { text: "", color: "#757575", title: "No Moodle tab open" },
};

async function ensureAlarm() {
  const alarm = await chrome.alarms.get(ALARM);
  if (!alarm || alarm.periodInMinutes !== PING_MINUTES) {
    await chrome.alarms.create(ALARM, { periodInMinutes: PING_MINUTES });
  }
}

async function setStatus(state, detail = "") {
  const { status: prev = {} } = await chrome.storage.local.get("status");
  const now = Date.now();
  const status = {
    state,
    detail,
    checkedAt: now,
    lastOkAt: state === "ok" ? now : prev.lastOkAt ?? null,
  };
  await chrome.storage.local.set({ status });

  const badge = BADGES[state];
  await chrome.action.setBadgeText({ text: badge.text });
  await chrome.action.setBadgeBackgroundColor({ color: badge.color });
  await chrome.action.setBadgeTextColor?.({ color: "#ffffff" });
  await chrome.action.setTitle({
    title: `Moodle Session Keeper - ${badge.title}${detail ? ` (${detail})` : ""}`,
  });
}

function pingTab(tabId) {
  // A frozen tab never answers, so don't wait on it forever.
  return Promise.race([
    chrome.tabs.sendMessage(tabId, { type: "ping" }),
    new Promise((resolve) => setTimeout(() => resolve(null), PING_TIMEOUT_MS)),
  ]).catch(() => null); // no content script (tab opened before install, etc.)
}

async function keepAlive() {
  const { enabled = true } = await chrome.storage.sync.get("enabled");
  if (!enabled) return setStatus("off");

  const tabs = await chrome.tabs.query({ url: MOODLE_MATCH });
  if (!tabs.length) return setStatus("idle");

  let sawLoggedOut = false;
  let lastError = null;
  for (const tab of tabs) {
    if (tab.discarded || tab.frozen) continue;
    const result = await pingTab(tab.id);
    if (!result) continue;
    if (result.status === "loggedout") {
      sawLoggedOut = true;
      continue;
    }
    if (result.status === "ok" || result.status === "expired") {
      return setStatus(result.status, result.detail);
    }
    lastError = result;
  }

  // No tab could do it (all frozen/discarded by Memory Saver, or no content script):
  // touch the session from here with the last sesskey a page reported.
  const { session } = await chrome.storage.session.get("session");
  if (session) {
    const result = await touchMoodleSession(session.wwwroot, session.sesskey, {
      credentials: "include",
    });
    return setStatus(result.status, result.detail);
  }
  if (sawLoggedOut) return setStatus("expired", "Not logged in");
  return setStatus("error", lastError?.detail || "No Moodle tab could be reached");
}

let running = null;
function tick() {
  running ??= keepAlive()
    .catch((e) => setStatus("error", e.message))
    .finally(() => {
      running = null;
    });
  return running;
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM) tick();
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type !== "hello") return;
  (async () => {
    if (msg.session) await chrome.storage.session.set({ session: msg.session });
    const { enabled = true } = await chrome.storage.sync.get("enabled");
    if (!enabled) return setStatus("off");
    // A page load is itself a request, so a logged-in page means the session is fresh.
    return msg.session ? setStatus("ok") : setStatus("expired", "Not logged in");
  })();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && "enabled" in changes) tick();
});

chrome.runtime.onInstalled.addListener(tick);
chrome.runtime.onStartup.addListener(tick);
ensureAlarm();
