// Calls Moodle's core_session_touch web service - the same request Moodle's own
// "Extend session" button makes. Shared by the content script and the service worker.
// Resolves to { status: "ok" | "expired" | "error", detail? }.
globalThis.touchMoodleSession = async function (wwwroot, sesskey, fetchInit = {}) {
  const url =
    `${wwwroot}/lib/ajax/service.php` +
    `?sesskey=${encodeURIComponent(sesskey)}&info=core_session_touch`;

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ index: 0, methodname: "core_session_touch", args: {} }]),
      ...fetchInit,
    });
  } catch (e) {
    return { status: "error", detail: `Network error: ${e.message}` };
  }
  if (!res.ok) return { status: "error", detail: `HTTP ${res.status}` };

  let body;
  try {
    body = await res.json();
  } catch {
    return { status: "error", detail: "Unexpected response from Moodle" };
  }

  const item = Array.isArray(body) ? body[0] : body;
  if (item && item.error === false) return { status: "ok" };

  // e.g. servicerequireslogin, requireloginerror, invalidsesskey
  const code = item?.exception?.errorcode || item?.errorcode || "";
  if (/login|sesskey|session/i.test(code)) return { status: "expired", detail: code };
  return { status: "error", detail: code || "Unknown Moodle error" };
};
