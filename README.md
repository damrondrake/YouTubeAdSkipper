# YouTube Ad Skipper

A lightweight Chrome extension that automatically skips YouTube ads and mutes your tab while they play — no configuration, no dependencies, just load it and forget it.

Built this for myself because I got tired of unskippable ads interrupting music and long-form videos. Ended up being a good exercise in working with Chrome's Extension APIs, DOM mutation observation, and how YouTube's player actually works under the hood.

---

## What it does

- **Auto-skips ads** the instant the skip button appears — no delay, no waiting
- **Auto-mutes** the tab when an ad starts, unmutes when it ends (so unskippable ads play silently)
- **Activity log** — tracks every skip and mute event with a timestamp, viewable by clicking the extension icon
- Works across all YouTube pages automatically, including navigation between videos (YouTube is a SPA, so this required a MutationObserver rather than a simple page-load hook)

---

## Technical breakdown

**Manifest V3** — built to the current Chrome extension standard, not the deprecated V2 API.

**`content.js`** — the core of the extension. Runs on every `youtube.com` page and does three things:

1. Registers a `MutationObserver` on `document.body` watching for DOM and class attribute changes. YouTube dynamically injects ad UI elements without a full page reload, so polling or load events won't catch them reliably — a MutationObserver fires synchronously on each change, which means the skip button gets clicked the moment it exists in the DOM.

2. Detects active ads by checking for the `.ad-showing` class that YouTube adds to the player container. Uses this to gate the mute/unmute logic so it doesn't interfere with a user who already has their volume muted.

3. Handles multiple skip button selectors (`.ytp-skip-ad-button`, `.ytp-ad-skip-button`, `.ytp-ad-skip-button-modern`) because YouTube A/B tests its UI and different users see different class names.

**`popup.html` / `popup.js`** — a minimal toolbar popup that reads from `chrome.storage.local` and renders a live activity log. Auto-refreshes every second while open. Includes a clear button to reset the log.

**`chrome.storage.local`** — used instead of `localStorage` because content scripts and popup scripts are separate execution contexts. Storage is the correct cross-context persistence layer in the Chrome Extension API. Log is capped at 100 entries to avoid unbounded growth.

---

## File structure

```
YouTubeAdSkipper/
├── manifest.json   # Extension config, permissions, content script registration
├── content.js      # MutationObserver, skip logic, mute logic, storage logging
├── popup.html      # Toolbar popup UI
└── popup.js        # Popup logic — reads log from storage, auto-refreshes
```

---

## How to install (unpacked)

1. Clone or download this repo
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top-right)
4. Click **Load unpacked** and select the project folder
5. The extension is now active — open any YouTube video to test it

No build step, no npm install, no bundler. It's plain JavaScript.

---

## Permissions used

| Permission | Why |
|---|---|
| `tabs` | Read the active tab's URL in the popup to show active/inactive status |
| `storage` | Persist the activity log across the content script and popup contexts |

---

## Why I built this instead of installing one

Most ad-blocker extensions either require broad permissions I'm not comfortable granting, pull in heavy dependencies, or do far more than I need. I wanted something minimal, readable, and that I actually understood end-to-end. This whole extension is under 150 lines of code across all files.

---

## Potential improvements

- Per-video stats (how many ads skipped per session)
- Optional notification when an ad is skipped
- Toggle to enable/disable without uninstalling
- Firefox compatibility (would need minor manifest adjustments)
