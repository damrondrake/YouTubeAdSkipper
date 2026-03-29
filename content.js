// YouTube Ad Skipper - Content Script
// Runs on all YouTube pages and handles ad skipping + muting logic.

(function () {
  // Selectors YouTube uses for the skip button (they rotate between these).
  const SKIP_BUTTON_SELECTORS = [
    '.ytp-skip-ad-button',
    '.ytp-ad-skip-button',
    '.ytp-ad-skip-button-modern',
  ];

  // The video player element selector.
  const VIDEO_SELECTOR = 'video.html5-main-video';

  let isMutedByUs = false; // Track whether WE muted the tab, so we don't unmute a user-muted tab.

  // --- Skip Logic ---

  // Append a timestamped entry to the persistent log in chrome.storage.local.
  // Keeps the last 100 entries to avoid unbounded growth.
  function addLogEntry(message) {
    const entry = `[${new Date().toLocaleTimeString()}] ${message}`;
    console.log('[AdSkipper]', entry);
    chrome.storage.local.get({ adSkipperLog: [] }, (data) => {
      const log = data.adSkipperLog;
      log.unshift(entry); // newest first
      if (log.length > 100) log.length = 100;
      chrome.storage.local.set({ adSkipperLog: log });
    });
  }

  // Attempt to click any visible skip button on the page.
  function trySkipAd() {
    for (const selector of SKIP_BUTTON_SELECTORS) {
      const btn = document.querySelector(selector);
      if (btn) {
        btn.click();
        addLogEntry(`Skipped ad (${selector})`);
        return true;
      }
    }
    return false;
  }

  // --- Mute Logic ---

  // Returns true if an ad is currently playing.
  function isAdPlaying() {
    // YouTube adds .ad-showing to the player container during ads.
    return !!document.querySelector('.ad-showing');
  }

  function muteVideo() {
    const video = document.querySelector(VIDEO_SELECTOR);
    if (video && !video.muted) {
      video.muted = true;
      isMutedByUs = true;
      addLogEntry('Muted — ad started');
    }
  }

  function unmuteVideo() {
    const video = document.querySelector(VIDEO_SELECTOR);
    if (video && isMutedByUs && video.muted) {
      video.muted = false;
      isMutedByUs = false;
      addLogEntry('Unmuted — ad ended');
    }
  }

  // Check ad state and apply mute/unmute accordingly.
  function handleAdState() {
    if (isAdPlaying()) {
      trySkipAd();
      muteVideo();
    } else {
      unmuteVideo();
    }
  }

  // --- MutationObserver ---
  // Watch the entire document body for DOM changes.
  // YouTube is a SPA, so ads are injected dynamically — MutationObserver catches them instantly.

  const observer = new MutationObserver(() => {
    handleAdState();
  });

  observer.observe(document.body, {
    childList: true,   // Watch for added/removed nodes (skip button appearing).
    subtree: true,     // Watch all descendants, not just direct children.
    attributes: true,  // Watch attribute changes (e.g. class changes that signal ad state).
    attributeFilter: ['class'], // Only care about class attribute changes for performance.
  });

  // Run once immediately in case an ad is already playing when the script loads.
  handleAdState();

  console.log('[AdSkipper] YouTube Ad Skipper active.');
})();
