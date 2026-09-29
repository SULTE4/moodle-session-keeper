// Runs on every Moodle page. Finds the session key, answers "ping" requests from the
// service worker by touching the session, and clicks Moodle's "Extend session"
// dialog if it ever shows up.
(() => {
  // Button label and dialog text in English / Russian / Kazakh Moodle language packs.
  const EXTEND_BUTTON_RE = /extend|продл|ұзарт/i;
  const SESSION_TEXT_RE = /session|сесси|сеанс/i;

  let enabled = true;

  const alive = () => Boolean(chrome.runtime?.id); // false after the extension is reloaded

  function unescapeJson(s) {
    try {
      return JSON.parse(`"${s}"`);
    } catch {
      return s;
    }
  }

  // Returns { sesskey, wwwroot } for a logged-in page, or null.
  function readSession() {
    // Guests and the login page also get a sesskey, but touching it is useless.
    if (document.body?.classList.contains("notloggedin")) return null;

    // Moodle prints M.cfg = {"wwwroot":"https:\/\/...","sesskey":"...",...} inline.
    for (const script of document.querySelectorAll("script:not([src])")) {
      const text = script.textContent;
      if (!text.includes("sesskey")) continue;
      const sesskey = text.match(/"sesskey":"([^"]+)"/)?.[1];
      if (!sesskey) continue;
      const wwwroot = text.match(/"wwwroot":"([^"]+)"/)?.[1];
      return { sesskey, wwwroot: wwwroot ? unescapeJson(wwwroot) : location.origin };
    }

    const input = document.querySelector('input[name="sesskey"]');
    if (input?.value) return { sesskey: input.value, wwwroot: location.origin };

    const logout = document.querySelector('a[href*="/login/logout.php?sesskey="]');
    if (logout) {
      const url = new URL(logout.href);
      const sesskey = url.searchParams.get("sesskey");
      if (sesskey) {
        return { sesskey, wwwroot: url.href.slice(0, url.href.indexOf("/login/logout.php")) };
      }
    }
    return null;
  }

  const clicked = new WeakSet();

  function clickExtendDialog() {
    if (!enabled) return;
    for (const modal of document.querySelectorAll(".modal")) {
      if (clicked.has(modal) || getComputedStyle(modal).display === "none") continue;
      if (!SESSION_TEXT_RE.test(modal.textContent)) continue;
      const button = [...modal.querySelectorAll("button, [data-action]")].find(
        (b) => EXTEND_BUTTON_RE.test(b.textContent) && b.getClientRects().length > 0
      );
      if (!button) continue;
      clicked.add(modal);
      button.click();
      // Moodle's Extend button touches the session, so this counts as an extension.
      if (alive()) chrome.runtime.sendMessage({ type: "extended" }).catch(() => {});
    }
  }

  let checkPending = false;
  function scheduleDialogCheck() {
    // Throttle rather than debounce, so busy pages can't keep postponing the check.
    // Modals are appended first and made visible after a short animation.
    if (checkPending) return;
    checkPending = true;
    setTimeout(() => {
      checkPending = false;
      clickExtendDialog();
    }, 300);
    setTimeout(clickExtendDialog, 1500);
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type !== "ping") return;
    const session = readSession();
    if (!session) {
      sendResponse({ status: "loggedout" });
      return;
    }
    touchMoodleSession(session.wwwroot, session.sesskey).then(sendResponse);
    return true; // async response
  });

  chrome.storage.sync.get("enabled").then(({ enabled: value = true }) => {
    enabled = value;
    if (enabled) clickExtendDialog();
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && "enabled" in changes) enabled = changes.enabled.newValue ?? true;
  });

  const observer = new MutationObserver(() => {
    if (!alive()) return observer.disconnect();
    scheduleDialogCheck();
  });
  // Attributes too: a reused modal node is shown again by toggling class/style only.
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style"],
  });

  // Backstop in case a mutation is missed.
  const interval = setInterval(() => {
    if (!alive()) return clearInterval(interval);
    clickExtendDialog();
  }, 30_000);

  chrome.runtime.sendMessage({ type: "hello", session: readSession() }).catch(() => {});
})();
