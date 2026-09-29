# Moodle Session Keeper

A Chrome extension that stops [lms.astanait.edu.kz](https://lms.astanait.edu.kz) from logging you out after ~15 minutes of inactivity.

## How it works

Moodle logs you out when you have not made a request for a while. Just before that, it shows a *"Your session is about to time out - Extend session"* dialog. The **Extend session** button calls Moodle's `core_session_touch` web service.

While at least one Moodle tab is open, this extension makes the same `core_session_touch` call every 4 minutes. If the dialog ever shows up anyway, the extension clicks **Extend session** for you. When you close all Moodle tabs, it stops, and the normal timeout applies again.

It needs no passwords and sends nothing anywhere except to lms.astanait.edu.kz itself.

### Toolbar badge

| Badge | Meaning |
| ----- | ------- |
| `ON` (green) | Session is being kept alive |
| `!` (red) | You are logged out - sign in again, then it picks up automatically |
| `?` (orange) | Moodle could not be reached (network problem) |
| `OFF` (grey) | Paused from the popup |
| none | No Moodle tab open |

Click the icon to pause or resume, or to see when the session was last extended.

## Install

1. Download this folder (or unzip the zip you were sent).
2. Open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and select the folder that contains `manifest.json`.
4. Reload any Moodle tabs that are already open.

This works in Chrome, Edge, Brave and other Chromium browsers.

## Share with classmates

```sh
zip -r moodle-session-keeper.zip manifest.json src icons README.md
```

## Use with another Moodle site

Change the host in `src/config.js` and in the `host_permissions` / `content_scripts.matches` entries of `manifest.json`, then reload the extension.

## Notes

- Chrome's Memory Saver can freeze background tabs. If that happens, the extension's background worker makes the request itself, using the last session key a Moodle page reported.
- Debugging: on `chrome://extensions`, click **service worker** under the extension to see its console, or watch the page's Network tab for `service.php?...info=core_session_touch`.
