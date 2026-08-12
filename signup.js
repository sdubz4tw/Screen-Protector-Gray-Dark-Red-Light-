document.getElementById('signupForm').addEventListener('submit', (e) => {
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
  statusMsg.style.color = '#0000aa';
  statusMsg.textContent = "Registering user profile with database...";

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
    statusMsg.style.color = '#008800';
    statusMsg.textContent = "Registration successful! Loading Screen Oasis...";

    const redirectTarget = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL)
      ? chrome.runtime.getURL('welcome.html')
      : 'welcome.html';

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        userId: userId,
        userName: userName,
        userEmail: userEmail,
        installDate: Date.now()
      }, () => {
        setTimeout(() => { window.location.href = redirectTarget; }, 600);
      });
    } else {
      setTimeout(() => { window.location.href = redirectTarget; }, 600);
    }
  })
  .catch(err => {
    console.error("Database registration error:", err);
    statusMsg.style.color = '#aa0000';
    statusMsg.textContent = "Offline mode active. Registration saved locally.";

    const redirectTarget = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL)
      ? chrome.runtime.getURL('welcome.html')
      : 'welcome.html';

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        userId: userId,
        userName: userName,
        userEmail: userEmail,
        installDate: Date.now()
      }, () => {
        setTimeout(() => { window.location.href = redirectTarget; }, 600);
      });
    } else {
      setTimeout(() => { window.location.href = redirectTarget; }, 600);
    }
  });
});
