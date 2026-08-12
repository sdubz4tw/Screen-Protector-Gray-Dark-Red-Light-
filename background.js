// Background service worker for EYEsorenomore
chrome.runtime.onInstalled.addListener(() => {
  // Inject content.js into existing open web tabs
  chrome.tabs.query({ url: ["http://*/*", "https://*/*"] }, (tabs) => {
    if (tabs && tabs.length > 0) {
      tabs.forEach(tab => {
        if (tab && tab.id) {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content.js"]
          }).catch(() => {});
        }
      });
    }
  });
});

// Clean synchronous response handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  sendResponse({ status: "ok" });
  return false;
});
