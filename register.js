document.getElementById('registerForm').addEventListener('submit', (e) => {
  e.preventDefault();

  const userName = document.getElementById('userName').value.trim();
  const userEmail = document.getElementById('userEmail').value.trim();
  const statusMsg = document.getElementById('statusMsg');

  const userId = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  const url = "https://pfhbzefiyxheqignpmfo.supabase.co/rest/v1/profiles";
  const key = "sb_publishable_S_DoBN2Lpin0x3T4x8z4ZA_-4hyyiC3";

  statusMsg.style.display = 'block';
  statusMsg.style.color = '#8E8E93';
  statusMsg.textContent = "Syncing registration profile...";

  function completeRegistration() {
    statusMsg.style.color = '#34C759';
    statusMsg.textContent = "Registration complete! Closing setup tab...";

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        userId: userId,
        userName: userName,
        userEmail: userEmail,
        installDate: Date.now()
      }, () => {
        setTimeout(() => {
          if (chrome.tabs && chrome.tabs.getCurrent) {
            chrome.tabs.getCurrent(tab => {
              if (tab && tab.id) {
                chrome.tabs.remove(tab.id);
              } else {
                window.close();
              }
            });
          } else {
            window.close();
          }
        }, 500);
      });
    } else {
      setTimeout(() => { window.close(); }, 500);
    }
  }

  fetch(url, {
    method: "POST",
    headers: {
      "apikey": key,
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    },
    body: JSON.stringify({
      name: userName,
      email: userEmail,
      payment_status: "Trial",
      active_filter: "None"
    })
  })
  .then(res => res.json())
  .then(data => {
    console.log("Registered profile successfully:", data);
    completeRegistration();
  })
  .catch(err => {
    console.error("Database registration error:", err);
    completeRegistration();
  });
});
