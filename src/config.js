// Single place to point the extension at a different Moodle site.
// Keep in sync with "host_permissions" and "content_scripts.matches" in manifest.json.
globalThis.AE_CONFIG = Object.freeze({
  MOODLE_HOST: "lms.astanait.edu.kz",
  MOODLE_MATCH: "https://lms.astanait.edu.kz/*",
  // The site logs out after ~15 min idle; touch the session well before that.
  PING_MINUTES: 4,
});
