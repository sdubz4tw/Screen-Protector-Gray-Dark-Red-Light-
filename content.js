const keys = ['masterEnabled', 'redLight', 'grayscale', 'darkMode', 'lightMode', 'redIntensity', 'grayIntensity', 'darkIntensity', 'lightIntensity'];

// Extension Context Safety Guard: safely fetch storage without throwing on extension reload
function safeGetStorage(callback) {
  try {
    if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) {
      return;
    }
    chrome.storage.local.get(keys, (res) => {
      if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.lastError) {
        return;
      }
      if (res) callback(res);
    });
  } catch (e) {
    // Extension context invalidated during extension reload
  }
}

// Detect background color of the body or root html element
function getBgColor() {
  if (!document.body) return 'rgb(255, 255, 255)';
  const bodyBg = window.getComputedStyle(document.body).backgroundColor;
  const htmlBg = window.getComputedStyle(document.documentElement).backgroundColor;
  const val = (bodyBg && bodyBg !== 'rgba(0, 0, 0, 0)' && bodyBg !== 'transparent') ? bodyBg : htmlBg;
  return (val && val !== 'rgba(0, 0, 0, 0)' && val !== 'transparent') ? val : 'rgb(255, 255, 255)';
}

// Convert native background color to relative luminance and check if it is natively dark
function isNativePageDark() {
  const root = document.documentElement;
  if (!root) return false;

  // Use cached native dark determination if already computed for this page state
  if (root.dataset.eyecareNativeDark !== undefined) {
    return root.dataset.eyecareNativeDark === 'true';
  }

  // Temporarily strip active theme attribute so getBgColor() measures native site styling
  const activeTheme = root.getAttribute('data-eyecare-theme');
  if (activeTheme) {
    root.removeAttribute('data-eyecare-theme');
  }

  const bg = getBgColor();

  // Restore active theme attribute
  if (activeTheme) {
    root.setAttribute('data-eyecare-theme', activeTheme);
  }

  const matches = bg.match(/\d+/g);
  let isDark = false;
  if (matches && matches.length >= 3) {
    const r = parseInt(matches[0], 10);
    const g = parseInt(matches[1], 10);
    const b = parseInt(matches[2], 10);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    isDark = luminance < 0.5;
  }

  // Cache native dark value once DOM body is available
  if (document.body) {
    root.dataset.eyecareNativeDark = isDark ? 'true' : 'false';
  }

  return isDark;
}

// Helper to inject structural layout variables & media overrides without DOM thrashing
function injectStyle(themeType) {
  let styleEl = document.getElementById('eyecare-style');
  if (styleEl && styleEl.getAttribute('data-eyecare-applied') === themeType) {
    return; // Theme style already active; avoid DOM mutation thrashing
  }

  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'eyecare-style';
  }

  styleEl.setAttribute('data-eyecare-applied', themeType);

  if (themeType === "dark") {
    styleEl.textContent = `
      /* Lightweight Root & Landmark Overrides */
      html[data-eyecare-theme="dark"],
      html[data-eyecare-theme="dark"] body,
      html[data-eyecare-theme="dark"] main,
      html[data-eyecare-theme="dark"] article,
      html[data-eyecare-theme="dark"] section,
      html[data-eyecare-theme="dark"] nav,
      html[data-eyecare-theme="dark"] header,
      html[data-eyecare-theme="dark"] footer,
      html[data-eyecare-theme="dark"] [class*="story"],
      html[data-eyecare-theme="dark"] [class*="article"] {
        background-color: #121212 !important;
        border-color: #333333 !important;
      }

      /* Card & Container Background Harmony */
      html[data-eyecare-theme="dark"] [class*="card"],
      html[data-eyecare-theme="dark"] [class*="post"],
      html[data-eyecare-theme="dark"] [class*="container"],
      html[data-eyecare-theme="dark"] shreddit-post {
        background-color: #1A1A1A !important;
      }

      /* High-contrast text rule for titles and headings */
      html[data-eyecare-theme="dark"] h1,
      html[data-eyecare-theme="dark"] h2,
      html[data-eyecare-theme="dark"] h3,
      html[data-eyecare-theme="dark"] h4,
      html[data-eyecare-theme="dark"] h5,
      html[data-eyecare-theme="dark"] h6,
      html[data-eyecare-theme="dark"] p,
      html[data-eyecare-theme="dark"] a,
      html[data-eyecare-theme="dark"] [class*="title"],
      html[data-eyecare-theme="dark"] [id*="title"],
      html[data-eyecare-theme="dark"] [class*="post-title"],
      html[data-eyecare-theme="dark"] shreddit-post {
        color: #FFFFFF !important;
      }

      /* Subtext & Metadata Contrast */
      html[data-eyecare-theme="dark"] span,
      html[data-eyecare-theme="dark"] time,
      html[data-eyecare-theme="dark"] [class*="meta"],
      html[data-eyecare-theme="dark"] [class*="subtext"],
      html[data-eyecare-theme="dark"] [class*="byline"] {
        color: #E0E0E0 !important;
      }

      /* Make sure media elements and their direct wrappers are visible and unmasked */
      html[data-eyecare-theme="dark"] img,
      html[data-eyecare-theme="dark"] video,
      html[data-eyecare-theme="dark"] picture,
      html[data-eyecare-theme="dark"] canvas,
      html[data-eyecare-theme="dark"] svg,
      html[data-eyecare-theme="dark"] iframe,
      html[data-eyecare-theme="dark"] [style*="background-image"] {
        display: inline-block !important;
        visibility: visible !important;
        opacity: 1 !important;
        z-index: auto !important;
      }

      /* Ensure parent containers holding media don't block visibility with solid fills */
      html[data-eyecare-theme="dark"] :has(> img),
      html[data-eyecare-theme="dark"] :has(> video),
      html[data-eyecare-theme="dark"] :has(> picture),
      html[data-eyecare-theme="dark"] :has(> svg),
      html[data-eyecare-theme="dark"] :has(> canvas) {
        background-color: transparent !important;
      }
    `;
  } else if (themeType === "light") {
    styleEl.textContent = `
      /* 1. Yahoo Top Search Bar - White Background with Black Text */
      html[data-eyecare-theme="light"] #ybar-sbq,
      html[data-eyecare-theme="light"] #ybar-sf,
      html[data-eyecare-theme="light"] form[action*="search"],
      html[data-eyecare-theme="light"] input[type="text"],
      html[data-eyecare-theme="light"] [data-test-locator="search-box"],
      html[data-eyecare-theme="light"] [class*="search-input"],
      html[data-eyecare-theme="light"] [class*="SearchInput"] {
        background-color: #ffffff !important;
        background-image: none !important;
        color: #000000 !important;
        border: 1.5px solid #d1d5db !important;
        box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05) !important;
      }

      /* 2. Distinct Module Card Box Outlines & Linings */
      html[data-eyecare-theme="light"] [class*="Card"],
      html[data-eyecare-theme="light"] [class*="card"],
      html[data-eyecare-theme="light"] [class*="Module"],
      html[data-eyecare-theme="light"] [class*="module"],
      html[data-eyecare-theme="light"] [class*="Box"],
      html[data-eyecare-theme="light"] [class*="box"],
      html[data-eyecare-theme="light"] [class*="Container"],
      html[data-eyecare-theme="light"] [class*="container"],
      html[data-eyecare-theme="light"] [data-test-locator="stream-item"],
      html[data-eyecare-theme="light"] [data-component] {
        background-color: #ffffff !important;
        background-image: none !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 8px !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04) !important;
      }

      /* Exclude plain body & main wrapper from card borders */
      html[data-eyecare-theme="light"],
      html[data-eyecare-theme="light"] body,
      html[data-eyecare-theme="light"] #atomic,
      html[data-eyecare-theme="light"] #mrt-node-main,
      html[data-eyecare-theme="light"] [role="main"] {
        background-color: #ffffff !important;
        border: none !important;
        box-shadow: none !important;
      }

      /* 3. Darken All Subtext, Links & "See More Stories" Text to Solid Black (#000000) */
      html[data-eyecare-theme="light"] a,
      html[data-eyecare-theme="light"] button,
      html[data-eyecare-theme="light"] p,
      html[data-eyecare-theme="light"] h1,
      html[data-eyecare-theme="light"] h2,
      html[data-eyecare-theme="light"] h3,
      html[data-eyecare-theme="light"] h4,
      html[data-eyecare-theme="light"] h5,
      html[data-eyecare-theme="light"] h6,
      html[data-eyecare-theme="light"] span,
      html[data-eyecare-theme="light"] li,
      html[data-eyecare-theme="light"] label,
      html[data-eyecare-theme="light"] time,
      html[data-eyecare-theme="light"] [class*="title"],
      html[data-eyecare-theme="light"] [class*="menu"],
      html[data-eyecare-theme="light"] [class*="nav"],
      html[data-eyecare-theme="light"] [class*="headline"],
      html[data-eyecare-theme="light"] [class*="subtext"],
      html[data-eyecare-theme="light"] [class*="meta"],
      html[data-eyecare-theme="light"] [class*="see-more"],
      html[data-eyecare-theme="light"] [class*="explore"] {
        color: #000000 !important;
        opacity: 1 !important;
        text-shadow: none !important;
      }

      /* 4. CSS Custom Variable Tree Override across Frameworks & Web Components */
      html[data-eyecare-theme="light"],
      html[data-eyecare-theme="light"] * {
        --bg-color: #ffffff !important;
        --theme-bg-color: #ffffff !important;
        --bg-primary: #ffffff !important;
        --bg-secondary: #f8f9fa !important;
        --surface-color: #ffffff !important;
        --text-color: #000000 !important;
        --primary-text-color: #000000 !important;
        --secondary-text-color: #222222 !important;
        --yt-spec-base-background: #ffffff !important;
        --yt-spec-brand-background-solid: #ffffff !important;
      }

      /* 5. Restore Yahoo Logo & Keep Logo Background-Images / SVGs Intact */
      html[data-eyecare-theme="light"] #ybar-logo,
      html[data-eyecare-theme="light"] #ybar-logo *,
      html[data-eyecare-theme="light"] [data-test-locator="logo"],
      html[data-eyecare-theme="light"] [data-test-locator="logo"] *,
      html[data-eyecare-theme="light"] [class*="logo"],
      html[data-eyecare-theme="light"] [class*="Logo"] {
        background-color: transparent !important;
        background-image: inherit !important;
        filter: none !important;
        opacity: 1 !important;
        visibility: visible !important;
        isolation: isolate;
      }

      html[data-eyecare-theme="light"] img,
      html[data-eyecare-theme="light"] video,
      html[data-eyecare-theme="light"] canvas,
      html[data-eyecare-theme="light"] picture,
      html[data-eyecare-theme="light"] iframe {
        background-color: transparent !important;
        filter: none !important;
        opacity: 1 !important;
        visibility: visible !important;
        isolation: isolate;
      }

      html[data-eyecare-theme="light"] svg,
      html[data-eyecare-theme="light"] svg * {
        opacity: 1 !important;
        visibility: visible !important;
      }
    `;
  }

  if (!styleEl.parentNode) {
    const targetParent = document.head || document.documentElement || document.body;
    if (targetParent) {
      targetParent.appendChild(styleEl);
    }
  }
}

// Master Composable Filter Execution Engine
function applyFilterRules(state) {
  const root = document.documentElement;
  if (!root) return;

  // Master switch bypass
  if (!state || state.masterEnabled === false) {
    root.removeAttribute('data-eyecare-active');
    root.removeAttribute('data-eyecare-theme');
    root.style.removeProperty('filter');
    const styleEl = document.getElementById('eyecare-style');
    if (styleEl) styleEl.remove();
    return;
  }

  // Set active attribute on root
  root.setAttribute('data-eyecare-active', 'true');

  // 1. Theme Override Processing
  if (state.darkMode) {
    if (root.getAttribute('data-eyecare-theme') !== 'dark') {
      root.setAttribute('data-eyecare-theme', 'dark');
    }
    injectStyle("dark");
  } else if (state.lightMode) {
    if (root.getAttribute('data-eyecare-theme') !== 'light') {
      root.setAttribute('data-eyecare-theme', 'light');
    }
    injectStyle("light");
  } else {
    root.removeAttribute('data-eyecare-theme');
    const styleEl = document.getElementById('eyecare-style');
    if (styleEl) styleEl.remove();
  }

  // 2. Composable CSS Filter Functions Processing
  const filterParts = [];

  // Red / Warm Light filter
  if (state.redLight) {
    const intensity = state.redIntensity !== undefined ? state.redIntensity : 100;
    const ratio = intensity / 100;
    filterParts.push(`sepia(${0.85 * ratio}) hue-rotate(-25deg) saturate(${1 + 0.4 * ratio})`);
  }

  // Grayscale filter
  if (state.grayscale) {
    const intensity = state.grayIntensity !== undefined ? state.grayIntensity : 100;
    filterParts.push(`grayscale(${intensity / 100})`);
  }

  // Dark Mode Dimming
  if (state.darkMode) {
    const dimming = state.darkIntensity !== undefined ? state.darkIntensity : 100;
    if (dimming < 100) {
      filterParts.push(`brightness(${0.5 + 0.5 * (dimming / 100)})`);
    }
  }

  // Light Mode Contrast
  if (state.lightMode) {
    const contrast = state.lightIntensity !== undefined ? state.lightIntensity : 100;
    if (contrast < 100) {
      filterParts.push(`contrast(${0.7 + 0.3 * (contrast / 100)})`);
    }
  }

  const filterString = filterParts.join(' ');
  if (filterString) {
    if (root.style.getPropertyValue('filter') !== filterString) {
      root.style.setProperty('filter', filterString, 'important');
    }
  } else {
    root.style.removeProperty('filter');
  }
}

// Runtime message listener for filter updates
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "APPLY_FILTERS" || request.action === "APPLY_FILTER") {
    if (request.state) {
      applyFilterRules(request.state);
    } else {
      syncActiveState();
    }
    sendResponse({ status: "ok" });
  }
  return false;
});

// Throttled sync function to avoid main-thread thrashing & safely query storage
let syncTimer = null;
function syncActiveState() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    safeGetStorage((res) => {
      applyFilterRules(res);
    });
  }, 100);
}

// Watch for storage changes to sync across open tabs
try {
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener(syncActiveState);
  }
} catch (e) {}

// Sync on page load/navigation
syncActiveState();

// Smart DOM Mutation Observer for infinite feeds and dynamic streams
const observer = new MutationObserver((mutations) => {
  let meaningfulChange = false;
  for (let i = 0; i < mutations.length; i++) {
    const target = mutations[i].target;
    if (target && target.id === 'eyecare-style') continue;
    if (mutations[i].attributeName === 'data-eyecare-theme' || mutations[i].attributeName === 'data-eyecare-active' || mutations[i].attributeName === 'style') continue;
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

// Re-check once DOM is fully loaded
document.addEventListener('DOMContentLoaded', syncActiveState);
window.addEventListener('load', syncActiveState);
