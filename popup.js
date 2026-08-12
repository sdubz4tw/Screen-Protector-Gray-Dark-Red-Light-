const DATABASE_URL = "https://pfhbzefiyxheqignpmfo.supabase.co/rest/v1/profiles";
const API_KEY = "sb_publishable_S_DoBN2Lpin0x3T4x8z4ZA_-4hyyiC3";

const STORAGE_KEYS = ['masterEnabled', 'redLight', 'grayscale', 'darkMode', 'lightMode', 'redIntensity', 'grayIntensity', 'darkIntensity', 'lightIntensity'];
const FILTER_MODES = ['redLight', 'grayscale', 'darkMode', 'lightMode'];

// Load saved configurations & initialize popup UI
chrome.storage.local.get([...STORAGE_KEYS, 'userEmail', 'installDate', 'userPaid', 'launchOnStartup'], (res) => {
  const masterToggle = document.getElementById('masterToggle');
  if (masterToggle) {
    const isMasterOn = res.masterEnabled !== undefined ? !!res.masterEnabled : true;
    masterToggle.checked = isMasterOn;
    updateMasterUI(isMasterOn);
  }

  // Restore independent filter checkboxes & range slider values
  STORAGE_KEYS.forEach(key => {
    if (key === 'masterEnabled') return;
    const el = document.getElementById(key);
    if (el) {
      if (el.type === 'checkbox') {
        el.checked = !!res[key];
      } else {
        const val = res[key] !== undefined ? res[key] : 100;
        el.value = val;
        const valLabel = document.getElementById(`${key}-val`);
        if (valLabel) valLabel.textContent = `${val}%`;
      }
    }
  });

  // Restore Launch on Startup preference
  const startupCb = document.getElementById('launchOnStartup');
  if (startupCb) {
    startupCb.checked = !!res.launchOnStartup;
  }

  checkUserStatus(res);
});

// Master Toggle change handler and UI dimmer
const masterToggle = document.getElementById('masterToggle');
const iosGroup = document.querySelector('.ios-group');

function updateMasterUI(enabled) {
  if (iosGroup) {
    iosGroup.style.opacity = enabled ? '1' : '0.4';
    iosGroup.style.pointerEvents = enabled ? 'auto' : 'none';
  }
}

if (masterToggle) {
  masterToggle.addEventListener('change', (e) => {
    updateMasterUI(e.target.checked);
    syncState("TOGGLE");
  });
}

// Header title click opens home/welcome page
const headerTitle = document.getElementById('headerTitle');
if (headerTitle) {
  headerTitle.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
  });
}

// Slider live label updates
['redIntensity', 'grayIntensity', 'darkIntensity', 'lightIntensity'].forEach(id => {
  const slider = document.getElementById(id);
  const label = document.getElementById(`${id}-val`);
  if (slider && label) {
    slider.addEventListener('input', (e) => {
      label.textContent = `${e.target.value}%`;
      syncState("SLIDER_CHANGE");
    });
  }
});

// Checkbox mode change listeners
FILTER_MODES.forEach(modeId => {
  const cb = document.getElementById(modeId);
  if (cb) {
    cb.addEventListener('change', () => syncState("MODE_CHANGE"));
  }
});

// Reset Defaults button handler
const resetBtn = document.getElementById('resetDefaultsBtn');
if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    FILTER_MODES.forEach(modeId => {
      const cb = document.getElementById(modeId);
      if (cb) cb.checked = false;
    });
    ['redIntensity', 'grayIntensity', 'darkIntensity', 'lightIntensity'].forEach(id => {
      const slider = document.getElementById(id);
      const label = document.getElementById(`${id}-val`);
      if (slider) slider.value = 100;
      if (label) label.textContent = '100%';
    });
    syncState("RESET");
  });
}

// Launch on Startup handler
const startupCb = document.getElementById('launchOnStartup');
if (startupCb) {
  startupCb.addEventListener('change', (e) => {
    chrome.storage.local.set({ launchOnStartup: e.target.checked });
  });
}

// Synchronize state with storage and active content tab
function syncState(action = "APPLY_FILTERS") {
  const state = {};
  STORAGE_KEYS.forEach(key => {
    const el = document.getElementById(key);
    if (el) {
      state[key] = el.type === 'checkbox' ? el.checked : parseInt(el.value, 10);
    }
  });

  chrome.storage.local.set(state, () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: action,
          state: state
        }).catch(() => {});
      }
    });
  });
}

// User status check (Supabase profiles query)
function checkUserStatus(res) {
  const badge = document.getElementById('statusBadge');
  if (!badge) return;

  if (res.userPaid) {
    badge.textContent = "✅ Active";
    badge.style.color = "#34C759";
    badge.style.background = "rgba(52, 199, 89, 0.15)";
    return;
  }

  if (res.userEmail) {
    fetch(`${DATABASE_URL}?select=payment_status,created_at&email=eq.${encodeURIComponent(res.userEmail)}`, {
      method: "GET",
      headers: {
        "apikey": API_KEY,
        "Authorization": `Bearer ${API_KEY}`
      }
    })
    .then(response => response.json())
    .then(data => {
      if (data && data[0] && data[0].payment_status === "Paid") {
        chrome.storage.local.set({ userPaid: true });
        badge.textContent = "✅ Active";
        badge.style.color = "#34C759";
        badge.style.background = "rgba(52, 199, 89, 0.15)";
      } else {
        badge.textContent = "✨ Trial User";
        badge.style.color = "#FFD700";
        badge.style.background = "rgba(255, 215, 0, 0.15)";
      }
    })
    .catch(() => {
      badge.textContent = "✨ Trial User";
      badge.style.color = "#FFD700";
      badge.style.background = "rgba(255, 215, 0, 0.15)";
    });
  } else {
    badge.textContent = "✨ Trial User";
    badge.style.color = "#FFD700";
    badge.style.background = "rgba(255, 215, 0, 0.15)";
  }
}