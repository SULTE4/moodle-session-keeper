# Moodle Session Keeper

A small Chrome extension that keeps you logged in to [lms.astanait.edu.kz](https://lms.astanait.edu.kz). You stop getting kicked out after a few minutes of reading a PDF or working in another window.

## Features

- Keeps your Moodle session alive while a Moodle tab is open
- Clicks Moodle's **Extend session** dialog for you if it shows up
- Shows the current status on the toolbar badge
- Can be paused and resumed with one click
- No accounts, passwords or tracking. It only talks to lms.astanait.edu.kz

## Installation

1. Download `moodle-session-keeper-vX.Y.Z.zip` from the [latest release](https://github.com/SULTE4/moodle-session-keeper/releases/latest) and unzip it.
2. Open `chrome://extensions` and turn on **Developer mode** (top right corner).
3. Click **Load unpacked** and select the unzipped `moodle-session-keeper` folder.
4. Reload any Moodle tabs that are already open.

It works in Chrome, Edge, Brave, Opera and other Chromium-based browsers.

> Keep the unzipped folder where it is. Chrome loads the extension from that folder, so the extension stops working if you delete or move it.

### Updating

Download the new release, replace the folder contents, then click the reload icon on the extension card in `chrome://extensions`.

## Usage

There is nothing to set up. Log in to Moodle as usual and the extension takes over.

| Badge | Meaning |
| ----- | ------- |
| `ON` (green) | Your session is being kept alive |
| `!` (red) | You are logged out. Sign in again and it resumes automatically |
| `?` (orange) | Moodle could not be reached, for example when you are offline |
| `OFF` (grey) | Paused |
| no badge | No Moodle tab is open |

Click the extension icon to pause or resume it, or to see when your session was last extended.

## How it works

Moodle logs you out after a period without any requests. Before that happens, it shows a *"Your session is about to time out"* dialog, and its **Extend session** button calls Moodle's `core_session_touch` web service.

The extension makes that same call every 4 minutes, but only while at least one Moodle tab is open. When you close all Moodle tabs it does nothing, and Moodle's normal timeout applies.

If Chrome's Memory Saver freezes the Moodle tab, the extension's background worker sends the request itself.

## Using it with a different Moodle site

1. Change `MOODLE_HOST` and `MOODLE_MATCH` in [`src/config.js`](src/config.js).
2. Update `host_permissions` and `content_scripts.matches` in [`manifest.json`](manifest.json) to match.
3. Reload the extension in `chrome://extensions`.

## Troubleshooting

- **Badge stays empty on a Moodle page:** reload the tab. Pages that were already open when you installed the extension don't have it running yet.
- **Still getting logged out:** open `chrome://extensions` and click **service worker** under the extension to see its log. In the Moodle tab's DevTools Network panel, filter by `core_session_touch`; you should see one request every 4 minutes.

## Building a release zip

```sh
git archive --prefix=moodle-session-keeper/ -o moodle-session-keeper.zip HEAD manifest.json src icons README.md
```
