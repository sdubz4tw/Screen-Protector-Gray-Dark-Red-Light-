document.getElementById('onboardingForm').addEventListener('submit', (e) => {
  e.preventDefault();
  
  const userName = document.getElementById('userName').value.trim();
  const userEmail = document.getElementById('userEmail').value.trim();
  
  const userId = typeof crypto.randomUUID === 'function' 
    ? crypto.randomUUID() 
    : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  const url = "https://pfhbzefiyxheqignpmfo.supabase.co/rest/v1/profiles";
  const key = "sb_publishable_S_DoBN2Lpin0x3T4x8z4ZA_-4hyyiC3";

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
    console.log("Successfully saved to Supabase!", data);
    
    // Cache details locally to unblock the extension toggles
    chrome.storage.local.set({
      userId: userId,
      userName: userName,
      userEmail: userEmail,
      installDate: Date.now()
    }, () => {
      window.close();
    });
  })
  .catch(err => {
    console.error("Error saving:", err);
    
    // Graceful fallback to avoid locking user out of extension on connection failure
    chrome.storage.local.set({
      userId: userId,
      userName: userName,
      userEmail: userEmail,
      installDate: Date.now()
    }, () => {
      window.close();
    });
  });
});
