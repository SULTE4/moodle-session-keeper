const STATE_TEXT = {
  ok: "Keeping your session alive",
  expired: "Logged out - sign in to Moodle again",
  error: "Could not reach Moodle",
  off: "Paused",
  idle: "No Moodle tab open",
};

const $ = (id) => document.getElementById(id);

function formatTime(ts) {
  return ts ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;
}

function render({ enabled = true, status = {} }) {
  $("enabled").checked = enabled;
  const state = status.state || (enabled ? "idle" : "off");
  $("dot").dataset.state = state;
  $("state").textContent =
    STATE_TEXT[state] + (state === "error" && status.detail ? ` (${status.detail})` : "");
  const last = formatTime(status.lastOkAt);
  $("last").textContent = last ? `Last extended at ${last}` : "";
}

async function load() {
  const [{ enabled }, { status }] = await Promise.all([
    chrome.storage.sync.get("enabled"),
    chrome.storage.local.get("status"),
  ]);
  render({ enabled, status });
}

$("host").textContent = globalThis.AE_CONFIG.MOODLE_HOST;
$("enabled").addEventListener("change", (e) => {
  chrome.storage.sync.set({ enabled: e.target.checked });
});
chrome.storage.onChanged.addListener(load);
load();
