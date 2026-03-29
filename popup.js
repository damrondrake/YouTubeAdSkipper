// popup.js

const logEl = document.getElementById('log');
const statusEl = document.getElementById('status-text');
const dot = document.getElementById('dot');

// Show active/inactive status based on whether we're on YouTube.
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const url = tabs[0]?.url || '';
  if (!url.includes('youtube.com')) {
    statusEl.textContent = 'Navigate to YouTube';
    dot.style.background = '#888';
  }
});

// Render the log from storage.
function renderLog() {
  chrome.storage.local.get({ adSkipperLog: [] }, (data) => {
    const entries = data.adSkipperLog;
    if (entries.length === 0) {
      logEl.innerHTML = '<span class="empty">No activity yet.</span>';
    } else {
      logEl.innerHTML = entries
        .map((e) => `<div>${e}</div>`)
        .join('');
    }
  });
}

renderLog();

// Clear the log.
document.getElementById('clear-btn').addEventListener('click', () => {
  chrome.storage.local.set({ adSkipperLog: [] }, renderLog);
});

// Auto-refresh the log every second while the popup is open.
setInterval(renderLog, 1000);
