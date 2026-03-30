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
  let skipCooldown = false; // Prevent hammering the skip button on every observer tick.

  // --- Logging ---

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

  // --- Skip Logic ---

  // Dispatch a realistic mouse click event on an element.
  // YouTube's player ignores bare .click() calls on some button variants —
  // dispatching a full MouseEvent with bubbles:true is required.
  function simulateClick(el) {
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
    el.dispatchEvent(new MouseEvent('mouseup',   { bubbles: true, cancelable: true, view: window }));
    el.dispatchEvent(new MouseEvent('click',     { bubbles: true, cancelable: true, view: window }));
  }

  // Find and click the skip button. Returns true if a button was found and clicked.
  function trySkipAd() {
    // Bail out if we recently attempted a skip — prevents flooding clicks on every observer tick.
    if (skipCooldown) return false;

    for (const selector of SKIP_BUTTON_SELECTORS) {
      const container = document.querySelector(selector);
      if (!container) continue;

      // YouTube's modern skip button wraps an inner <button> element.
      // We need to click the inner element, not just the outer container.
      const clickTarget = container.querySelector('button') || container;

      // Only attempt the click if the element has actual dimensions (i.e. it's visible).
      const rect = clickTarget.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;

      simulateClick(clickTarget);
      addLogEntry(`Skip button clicked (${selector})`);

      // Set a cooldown so we don't re-fire until the DOM settles.
      skipCooldown = true;
      setTimeout(() => { skipCooldown = false; }, 2000);

      return true;
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
  //
  // We debounce the callback with requestAnimationFrame so that a rapid burst of DOM mutations
  // (which YouTube triggers constantly) only results in one handleAdState() call per frame,
  // rather than hundreds of calls per second.

  let rafPending = false;

  const observer = new MutationObserver(() => {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      handleAdState();
    });
  });

  observer.observe(document.body, {
    childList: true,        // Watch for added/removed nodes (skip button appearing).
    subtree: true,          // Watch all descendants, not just direct children.
    attributes: true,       // Watch attribute changes (e.g. class changes that signal ad state).
    attributeFilter: ['class'], // Only care about class changes for performance.
  });

  // Run once immediately in case an ad is already playing when the script loads.
  handleAdState();

  console.log('[AdSkipper] YouTube Ad Skipper active.');
})();
