// popup.js
// Check if the current tab is a YouTube tab and update the status text accordingly.

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const statusEl = document.getElementById('status-text');
  if (!statusEl) return;

  const url = tabs[0]?.url || '';
  if (url.includes('youtube.com')) {
    statusEl.textContent = 'Active on this tab';
  } else {
    statusEl.textContent = 'Navigate to YouTube';
    // Dim the dot to indicate inactive state.
    const dot = document.querySelector('.dot');
    if (dot) dot.style.background = '#888';
  }
});
