const STORAGE_KEYS = [
  'masterEnabled', 'redLight', 'grayscale', 'darkMode', 'lightMode',
  'redIntensity', 'grayIntensity', 'darkIntensity', 'lightIntensity'
];

// Extension Context Safety Guard: safely fetch storage without throwing on extension reload
function safeGetStorage(callback) {
  try {
    if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) return;
    chrome.storage.local.get(STORAGE_KEYS, (res) => {
      if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.lastError) return;
      if (res) callback(res);
    });
  } catch (e) {
    // Context invalidated during reload
  }
}

// Master Unified Filter & Mode Execution Engine
function applyEyeCareFilter(settings) {
  const root = document.documentElement;
  if (!root) return;

  // Master Toggle Bypass
  if (!settings || settings.masterEnabled === false) {
    root.removeAttribute('data-eyecare-active');
    root.removeAttribute('data-eyecare-mode');
    root.style.removeProperty('--eyecare-filter');
    root.style.removeProperty('--eyecare-bg-color');
    root.style.removeProperty('--eyecare-text-color');
    root.style.removeProperty('filter');
    return;
  }

  root.setAttribute('data-eyecare-active', 'true');

  // Mode Selection: Light vs Dark vs Standard
  if (settings.lightMode) {
    root.setAttribute('data-eyecare-mode', 'light');
    root.style.setProperty('--eyecare-bg-color', '#ffffff', 'important');
    root.style.setProperty('--eyecare-text-color', '#111111', 'important');
  } else if (settings.darkMode) {
    root.setAttribute('data-eyecare-mode', 'dark');
    root.style.setProperty('--eyecare-bg-color', '#121212', 'important');
    root.style.setProperty('--eyecare-text-color', '#ffffff', 'important');
  } else {
    root.removeAttribute('data-eyecare-mode');
    root.style.removeProperty('--eyecare-bg-color');
    root.style.removeProperty('--eyecare-text-color');
  }

  // Composable Filter Pipeline
  const filterParts = [];

  // Red / Warm Light Filter (+25% Boosted Intensity)
  if (settings.redLight) {
    const intensity = settings.redIntensity !== undefined ? settings.redIntensity : 100;
    const ratio = intensity / 100;
    filterParts.push(`sepia(${1.06 * ratio}) hue-rotate(-32deg) saturate(${1 + 0.6 * ratio})`);
  }

  // Grayscale Filter
  if (settings.grayscale) {
    const intensity = settings.grayIntensity !== undefined ? settings.grayIntensity : 100;
    filterParts.push(`grayscale(${intensity / 100})`);
  }

  // Dark Mode Dimming
  if (settings.darkMode) {
    const dimming = settings.darkIntensity !== undefined ? settings.darkIntensity : 100;
    if (dimming < 100) {
      filterParts.push(`brightness(${0.5 + 0.5 * (dimming / 100)})`);
    }
  }

  // Light Mode Contrast Adjustment
  if (settings.lightMode) {
    const contrast = settings.lightIntensity !== undefined ? settings.lightIntensity : 100;
    if (contrast < 100) {
      filterParts.push(`contrast(${0.7 + 0.3 * (contrast / 100)})`);
    }
  }

  const filterString = filterParts.join(' ');
  if (filterString) {
    root.style.setProperty('--eyecare-filter', filterString, 'important');
    if (root.style.getPropertyValue('filter') !== filterString) {
      root.style.setProperty('filter', filterString, 'important');
    }
  } else {
    root.style.removeProperty('--eyecare-filter');
    root.style.removeProperty('filter');
  }
}

// Single Dispatch Message Listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request) return false;

  switch (request.action) {
    case "APPLY_FILTERS":
    case "APPLY_FILTER":
    case "TOGGLE":
    case "MODE_CHANGE":
    case "SLIDER_CHANGE":
      if (request.state) {
        applyEyeCareFilter(request.state);
      } else {
        syncActiveState();
      }
      sendResponse({ status: "ok" });
      break;
    default:
      sendResponse({ status: "ignored" });
      break;
  }
  return false;
});

// Throttled storage sync handler
let syncTimer = null;
function syncActiveState() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    safeGetStorage((res) => {
      applyEyeCareFilter(res);
    });
  }, 50);
}

// Storage sync across open tabs
try {
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener(syncActiveState);
  }
} catch (e) {}

// Initial state sync
syncActiveState();

// Smart DOM Mutation Observer for infinite feeds & dynamic stream items
const observer = new MutationObserver((mutations) => {
  let meaningfulChange = false;
  for (let i = 0; i < mutations.length; i++) {
    const target = mutations[i].target;
    if (target && (target.id === 'eyecare-style' || target.nodeName === 'STYLE')) continue;
    const attr = mutations[i].attributeName;
    if (attr === 'data-eyecare-mode' || attr === 'data-eyecare-active' || attr === 'style') continue;
    meaningfulChange = true;
    break;
  }
  if (meaningfulChange) {
    syncActiveState();
  }
});

if (document.documentElement) {
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}

document.addEventListener('DOMContentLoaded', syncActiveState);
window.addEventListener('load', syncActiveState);
