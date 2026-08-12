const DATABASE_URL = "https://pfhbzefiyxheqignpmfo.supabase.co/rest/v1/profiles";
const API_KEY = "sb_publishable_S_DoBN2Lpin0x3T4x8z4ZA_-4hyyiC3";

const keys = ['masterEnabled', 'redLight', 'grayscale', 'darkMode', 'lightMode', 'redIntensity', 'grayIntensity', 'darkIntensity', 'lightIntensity'];
const modes = ['redLight', 'grayscale', 'darkMode', 'lightMode'];

// Load saved configurations and initialize UI
chrome.storage.local.get([...keys, 'userEmail', 'installDate', 'userPaid', 'launchOnStartup'], (res) => {
  const masterToggle = document.getElementById('masterToggle');
  if (masterToggle) {
    const isMasterOn = res.masterEnabled !== undefined ? !!res.masterEnabled : true;
    masterToggle.checked = isMasterOn;
    updateMasterUI(isMasterOn);
  }

  // Restore independent filter checkbox & range values
  keys.forEach(key => {
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
    if (!enabled) {
      iosGroup.style.opacity = '0.4';
      iosGroup.style.pointerEvents = 'none';
    } else {
      iosGroup.style.opacity = '1';
      iosGroup.style.pointerEvents = 'auto';
    }
  }
}

if (masterToggle) {
  masterToggle.addEventListener('change', (e) => {
    updateMasterUI(e.target.checked);
    syncState();
  });
}

// Header title click handler opens main homepage / welcome page
const headerTitle = document.getElementById('headerTitle');
if (headerTitle) {
  headerTitle.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
  });
}

// Progressive disclosure accordion drawer handlers
document.querySelectorAll('.gear-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.dataset.target;
    const drawer = document.getElementById(targetId);
    if (drawer) {
      drawer.classList.toggle('open');
      btn.classList.toggle('active');
    }
  });
});

// Attach slider live label update listeners
['redIntensity', 'grayIntensity', 'darkIntensity', 'lightIntensity'].forEach(id => {
  const slider = document.getElementById(id);
  const label = document.getElementById(`${id}-val`);
  if (slider && label) {
    slider.addEventListener('input', (e) => {
      label.textContent = `${e.target.value}%`;
      syncState();
    });
  }
});

// Attach independent checkbox change listeners
modes.forEach(modeId => {
  const cb = document.getElementById(modeId);
  if (cb) {
    cb.addEventListener('change', syncState);
  }
});

// Reset to Default button handler
document.getElementById('resetDefaultsBtn').addEventListener('click', () => {
  modes.forEach(modeId => {
    const cb = document.getElementById(modeId);
    if (cb) cb.checked = false;
  });
  ['redIntensity', 'grayIntensity', 'darkIntensity', 'lightIntensity'].forEach(id => {
    const slider = document.getElementById(id);
    const label = document.getElementById(`${id}-val`);
    if (slider) slider.value = 100;
    if (label) label.textContent = '100%';
  });
  syncState();
});

// Launch on Startup preference checkbox handler
const startupCb = document.getElementById('launchOnStartup');
if (startupCb) {
  startupCb.addEventListener('change', (e) => {
    chrome.storage.local.set({ launchOnStartup: e.target.checked });
  });
}

// Unify state updates to sync storage & content script
function syncState() {
  const state = {};
  keys.forEach(key => {
    const el = document.getElementById(key);
    if (el) {
      state[key] = el.type === 'checkbox' ? el.checked : parseInt(el.value, 10);
    }
  });

  chrome.storage.local.set(state, () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "APPLY_FILTERS",
          state: state
        }).catch(() => {});
      }
    });
  });
}

// Database check (Fetch profile from Supabase 'profiles' table & update UI badge)
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
      if (data && data[0]) {
        const profile = data[0];
        if (profile.payment_status === "Paid" || res.userPaid) {
          chrome.storage.local.set({ userPaid: true });
          badge.textContent = "✅ Active";
          badge.style.color = "#34C759";
          badge.style.background = "rgba(52, 199, 89, 0.15)";
        } else {
          let createdTime = profile.created_at ? new Date(profile.created_at).getTime() : (res.installDate || Date.now());
          const daysElapsed = Math.floor((Date.now() - createdTime) / (1000 * 60 * 60 * 24));
          if (daysElapsed <= 7) {
            badge.textContent = "✨ Trial User";
            badge.style.color = "#FFD700";
            badge.style.background = "rgba(255, 215, 0, 0.15)";
          } else {
            badge.textContent = "✨ Trial User";
            badge.style.color = "#FFD700";
            badge.style.background = "rgba(255, 215, 0, 0.15)";
          }
        }
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