import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onChildAdded,
  query,
  orderByChild,
  limitToLast,
  startAt,
  endBefore,
  get,
  remove,
  onChildRemoved,
  set
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAvQ8uDrpWsRkpnba2khTuIBZeFWB0fHEw",
  authDomain: "school-chatroom-b93a4.firebaseapp.com",
  projectId: "school-chatroom-b93a4",
  storageBucket: "school-chatroom-b93a4.firebasestorage.app",
  messagingSenderId: "172550937165",
  appId: "1:172550937165:web:6e0fed43716495c0531a04",
  measurementId: "G-CPP231DLCZ",
  databaseURL: "https://school-chatroom-b93a4-default-rtdb.firebaseio.com/"
};

function stringToColor(str) {
  if (!str) return '#CCCCCC'; 
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; 
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).slice(-2);
  }
  return color;
}

function generateDefaultPfpDataUrl(username) {
    const bgColor = stringToColor(username);

    const svg = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                   <rect width="100" height="100" fill="${bgColor}"/>
                   <g stroke="white" stroke-width="5" fill="white">
                     <circle cx="50" cy="30" r="20"/>
                     <path d="M15 95 C15 75 30 60 50 60 C70 60 85 75 85 95 Z"/>
                   </g>
                 </svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
}

try {
  const app = initializeApp(firebaseConfig);
  const database = getDatabase(app);
  const messagesRef = ref(database, 'messages');
  const credentialsRef = ref(database, 'user_credentials');

  const nameInput     = document.getElementById('name');
  const setNameButton = document.getElementById('set-name');
  const chatbox       = document.getElementById('chatbox');
  const messageInput  = document.getElementById('message');
  const sendButton    = document.getElementById('send');
  const authStatus    = document.getElementById('auth-status');

  const currentUserPfpImg     = document.getElementById('current-user-pfp');
  const toggleBioEditorButton = document.getElementById('toggle-bio-editor-button');
  const bioEditorPanel        = document.getElementById('bio-editor-panel');
  const bioInput              = document.getElementById('bio-input');
  const setBioButton          = document.getElementById('set-bio-button');
  const bioCharCount          = document.getElementById('bio-char-count');

  const pfpUploadInput        = document.getElementById('pfp-upload-input');
  const pfpUploadButton       = document.getElementById('pfp-upload-button');
  const pfpPreviewImg         = document.getElementById('pfp-preview');
  const setPfpButton          = document.getElementById('set-pfp-button');

  const bioModal              = document.getElementById('bio-modal');
  const modalPfpImg           = document.getElementById('modal-pfp');
  const modalUsername         = document.getElementById('modal-username');
  const modalBioText          = document.getElementById('modal-bio-text');
  const closeModalButtonBio   = document.querySelector('#bio-modal .close-button'); 

  const imageUrlButton = document.getElementById('image-url-button');
  let isSendingImage = false;

  const imageLightboxModal = document.getElementById('image-lightbox-modal');
  const lightboxImage = document.getElementById('lightbox-image');
  const closeLightboxButton = document.querySelector('#image-lightbox-modal .close-button');

  const localStorageNameKey = 'chatUserName';
  const localStorageAuthKey = 'chatUserAuthenticated';
  let userName = null;
  let isAuthenticated = false;
  let selectedPfpFile = null;
  const pfpCache = new Map();

  async function resizeAndEncodeImage(file) {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            reject(new Error('File is not an image.'));
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 256;
                canvas.height = 256;
                ctx.drawImage(img, 0, 0, 256, 256);
                resolve(canvas.toDataURL('image/png', 0.9)); 
            };
            img.onerror = (err) => reject(new Error("Image could not be loaded: " + err));
            img.src = e.target.result;
        };
        reader.onerror = (err) => reject(new Error("File could not be read: " + err));
        reader.readAsDataURL(file);
    });
  }

  if (pfpUploadButton) pfpUploadButton.addEventListener('click', () => pfpUploadInput.click());

  if (pfpUploadInput) {
    pfpUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            selectedPfpFile = file;
            const reader = new FileReader();
            reader.onload = (e) => { if(pfpPreviewImg) pfpPreviewImg.src = e.target.result; }
            reader.readAsDataURL(file);
            if (setPfpButton) setPfpButton.disabled = false;
        } else {
            selectedPfpFile = null;
            if (pfpPreviewImg) pfpPreviewImg.src = currentUserPfpImg.src || generateDefaultPfpDataUrl(userName);
            if (setPfpButton) setPfpButton.disabled = true;
        }
    });
  }

  if (setPfpButton) {
    setPfpButton.addEventListener('click', async () => {
        if (!isAuthenticated || !userName || !selectedPfpFile) {
            alert("Please select an image file first.");
            return;
        }
        setPfpButton.disabled = true;
        setPfpButton.textContent = "Saving...";
        try {
            const base64Pfp = await resizeAndEncodeImage(selectedPfpFile);
            const sanitizedName = sanitizeFirebaseKey(userName);
            const userPfpRef = ref(database, `user_credentials/${sanitizedName}/pfpBase64`);
            await set(userPfpRef, base64Pfp);

            if (currentUserPfpImg) currentUserPfpImg.src = base64Pfp;
            pfpCache.set(userName, base64Pfp);
            if (pfpPreviewImg) pfpPreviewImg.src = base64Pfp;
            updateDisplayedPfpsForUser(userName, base64Pfp); 

            alert("Profile picture updated successfully!");
            selectedPfpFile = null;
            if(pfpUploadInput) pfpUploadInput.value = ''; 
        } catch (error) {
            console.error("Error updating PFP:", error);
            alert("Failed to update profile picture: " + error.message);
        } finally {
            if (setPfpButton) {
                setPfpButton.disabled = true; 
                setPfpButton.textContent = "Set Profile Picture";
            }
        }
    });
  }

  async function loadCurrentUserPfp() {
    if (!isAuthenticated || !userName || !currentUserPfpImg) return;
    const cachedPfp = pfpCache.get(userName);
    const defaultPfp = generateDefaultPfpDataUrl(userName);

    if (cachedPfp) {
        currentUserPfpImg.src = cachedPfp;
        if (pfpPreviewImg) pfpPreviewImg.src = cachedPfp;
        return;
    }

    const sanitizedName = sanitizeFirebaseKey(userName);
    const userPfpRef = ref(database, `user_credentials/${sanitizedName}/pfpBase64`);
    try {
        const snapshot = await get(userPfpRef);
        const pfpData = snapshot.exists() ? snapshot.val() : defaultPfp;
        currentUserPfpImg.src = pfpData;
        if (pfpPreviewImg) pfpPreviewImg.src = pfpData;
        pfpCache.set(userName, pfpData);
    } catch (error) {
        console.error("Error loading current user PFP:", error);
        currentUserPfpImg.src = defaultPfp;
        if (pfpPreviewImg) pfpPreviewImg.src = defaultPfp;
    }
  }

  async function getPfpDataForUser(userNameForPfp) {
      if (!userNameForPfp) return generateDefaultPfpDataUrl('unknown');
      if (pfpCache.has(userNameForPfp)) {
          return pfpCache.get(userNameForPfp);
      }
      const sanitizedName = sanitizeFirebaseKey(userNameForPfp);
      const userPfpRef = ref(database, `user_credentials/${sanitizedName}/pfpBase64`);
      const defaultPfp = generateDefaultPfpDataUrl(userNameForPfp);
      try {
          const snapshot = await get(userPfpRef);
          const pfpData = snapshot.exists() ? snapshot.val() : defaultPfp;
          pfpCache.set(userNameForPfp, pfpData);
          return pfpData;
      } catch (error) {
          console.warn(`Could not fetch PFP for ${userNameForPfp}:`, error);
          pfpCache.set(userNameForPfp, defaultPfp);
          return defaultPfp;
      }
  }

  function updateDisplayedPfpsForUser(targetUserName, newPfpDataUrl) {

    const pfpImagesInChat = document.querySelectorAll(`#chatbox img.message-pfp`);
    pfpImagesInChat.forEach(img => {
        if (img.getAttribute('data-pfp-for-user') === targetUserName) {
            img.src = newPfpDataUrl;
        }
    });

    if (bioModal && bioModal.style.display === 'flex' && modalUsername && modalUsername.textContent.startsWith(targetUserName)) {
        if (modalPfpImg) modalPfpImg.src = newPfpDataUrl;
    }
  }

  async function hashPassword(password) {
    const encoder = new TextEncoder(); const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  function sanitizeFirebaseKey(key) { return key.replace(/[.#$[\]]/g, '_'); }

  function updateBioCharCount() {
    if (!bioInput || !bioCharCount) return;
    const currentLength = bioInput.value.length; bioCharCount.textContent = `${currentLength}/200`;
  }

  async function loadCurrentUserBio() {
    if (!isAuthenticated || !userName || !bioInput) return;
    const sanitizedName = sanitizeFirebaseKey(userName);
    const userBioRef = ref(database, `user_credentials/${sanitizedName}/bio`);
    try { const snapshot = await get(userBioRef); bioInput.value = snapshot.exists() ? snapshot.val() : '';
    } catch (error) { console.error("Error loading user bio:", error); bioInput.value = ''; }
    updateBioCharCount();
  }

  async function saveUserBio() { 
    if (!isAuthenticated || !userName || !bioInput) { alert("You must be logged in to set a bio."); return; }
    const bioText = bioInput.value.trim();
    if (bioText.length > 200) { alert("Bio cannot exceed 200 characters."); return; }
    const sanitizedName = sanitizeFirebaseKey(userName);
    const userCredBioRef = ref(database, `user_credentials/${sanitizedName}/bio`);
    try { await set(userCredBioRef, bioText); alert("Bio updated successfully!");
    } catch (error) { console.error("Error setting bio:", error); alert("Failed to update bio. Please try again."); }
  }

  async function showBioModal(clickedUserName) { 
    if (!bioModal || !modalUsername || !modalBioText || !modalPfpImg) return;
    modalUsername.textContent = `${clickedUserName}'s Bio`;
    modalBioText.textContent = "Loading...";
    modalPfpImg.src = generateDefaultPfpDataUrl(clickedUserName); 
    bioModal.style.display = 'flex';

    const sanitizedClickedName = sanitizeFirebaseKey(clickedUserName);
    const userCredRef = ref(database, `user_credentials/${sanitizedClickedName}`);
    try {
        const snapshot = await get(userCredRef);
        if (snapshot.exists()) {
            const userData = snapshot.val();
            modalBioText.textContent = (userData.bio && userData.bio.trim() !== "") ? userData.bio : "This user hasn't set a bio yet, or it's empty.";
            modalPfpImg.src = userData.pfpBase64 || generateDefaultPfpDataUrl(clickedUserName);
            pfpCache.set(clickedUserName, modalPfpImg.src); 
        } else {
            modalBioText.textContent = "User data not found.";
        }
    } catch (error) {
        console.error("Error fetching bio/PFP for modal:", error);
        modalBioText.textContent = "Could not load user data due to an error.";
    }
  }

  if (setBioButton) setBioButton.addEventListener('click', saveUserBio);
  if (bioInput) bioInput.addEventListener('input', updateBioCharCount);
  if (closeModalButtonBio) closeModalButtonBio.addEventListener('click', () => { if(bioModal) bioModal.style.display = 'none'; });

  function toggleProfilePanel() { 
      if (bioEditorPanel) {
          const isVisible = bioEditorPanel.style.display === 'flex';
          bioEditorPanel.style.display = isVisible ? 'none' : 'flex';
          if (!isVisible && isAuthenticated) { 
              loadCurrentUserBio();
              loadCurrentUserPfp(); 
              if(bioInput) bioInput.focus();
              if(setPfpButton) setPfpButton.disabled = true; 
              selectedPfpFile = null;
              if(pfpUploadInput) pfpUploadInput.value = '';
          }
      }
  }

  if (toggleBioEditorButton) {
    toggleBioEditorButton.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleProfilePanel();
    });
  }
  if (currentUserPfpImg) { 
      currentUserPfpImg.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleProfilePanel();
      });
  }

  async function isValidImageUrl(url) {
    return new Promise((resolve) => {
        if (!url || typeof url !== 'string') { resolve(false); return; }
        const trimmedUrl = url.trim();
        if (!trimmedUrl.match(/^https?:\/\/[^\s/$.?#].[^\s]*\.(jpe?g|png|gif|webp)(\?[^\s]*)?$/i)) { resolve(false); return; }
        const img = new Image(); img.onload = () => resolve(true); img.onerror = () => resolve(false); img.src = trimmedUrl;
    });
  }
  if (imageUrlButton) {
    imageUrlButton.addEventListener('click', async () => {
        if (!isAuthenticated || !messageInput || !imageUrlButton) return;
        if (isSendingImage) { isSendingImage = false; messageInput.value = ''; messageInput.placeholder = "Enter message"; imageUrlButton.innerHTML = '🔗'; imageUrlButton.title = "Send Image from URL"; return; }
        const url = prompt("Enter the URL of the image you want to send:"); if (url === null || url.trim() === '') { return; }
        const trimmedUrl = url.trim(); const isValid = await isValidImageUrl(trimmedUrl);
        if (isValid) { messageInput.value = trimmedUrl; isSendingImage = true; messageInput.placeholder = "Image URL entered. Press Send."; imageUrlButton.innerHTML = '✓'; imageUrlButton.title = "Clear image URL / Send text instead"; if(messageInput) messageInput.focus();
        } else { alert("Invalid image URL. Must be http/https, end with .jpg, .png, .gif, or .webp, and be loadable."); }
    });
    if (messageInput) { messageInput.addEventListener('input', () => { if (isSendingImage && !messageInput.value.startsWith('http')) { isSendingImage = false; messageInput.placeholder = "Enter message"; if (imageUrlButton) { imageUrlButton.innerHTML = '🔗'; imageUrlButton.title = "Send Image from URL"; }}}); }
  }
  function openImageLightbox(imageUrl) {
    if (imageLightboxModal && lightboxImage) { lightboxImage.src = imageUrl; imageLightboxModal.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
  }
  function closeImageLightbox() {
    if (imageLightboxModal) { imageLightboxModal.style.display = 'none'; if (lightboxImage) lightboxImage.src = ''; document.body.style.overflow = ''; }
  }
  if (closeLightboxButton) closeLightboxButton.addEventListener('click', closeImageLightbox);
  if (imageLightboxModal) imageLightboxModal.addEventListener('click', (event) => { if (event.target === imageLightboxModal) closeImageLightbox(); });

  window.addEventListener('click', (event) => {

    if (bioEditorPanel && toggleBioEditorButton && bioEditorPanel.style.display === 'flex' &&
        !bioEditorPanel.contains(event.target) &&
        event.target !== toggleBioEditorButton && !toggleBioEditorButton.contains(event.target) &&
        (!currentUserPfpImg || event.target !== currentUserPfpImg) ) { 
        bioEditorPanel.style.display = 'none';
    }

    if (bioModal && bioModal.style.display === 'flex' && event.target === bioModal) {
        bioModal.style.display = 'none';
    }

  });

  function updateUIBasedOnAuthState() {
    if (isAuthenticated && userName) {
      if (nameInput) { nameInput.value = userName; nameInput.disabled = true; }
      if (setNameButton) setNameButton.textContent = `Logout (${userName})`;
      if (messageInput) messageInput.disabled = false;
      if (sendButton) sendButton.disabled = false;
      if (authStatus) { authStatus.textContent = `Authenticated as ${userName}. You can now chat.`; authStatus.style.color = 'green';}

      if (currentUserPfpImg) currentUserPfpImg.style.display = 'block';
      if (toggleBioEditorButton) toggleBioEditorButton.style.display = 'inline-block';
      if (bioInput) bioInput.disabled = false;
      if (setBioButton) setBioButton.disabled = false;
      if (pfpUploadButton) pfpUploadButton.disabled = false;

      loadCurrentUserBio();
      loadCurrentUserPfp(); 

      if (imageUrlButton) imageUrlButton.disabled = false;
      loadRecent();
      startLiveListener();
    } else { 
      if (nameInput) { nameInput.value = userName || ''; nameInput.disabled = false; }
      if (setNameButton) setNameButton.textContent = userName ? `Login as ${userName}` : "Set Name / Register";
      if (messageInput) messageInput.disabled = true;
      if (sendButton) sendButton.disabled = true;
      if (authStatus) { authStatus.textContent = "Please set your name and authenticate to chat."; authStatus.style.color = 'red'; }
      if (chatbox) chatbox.innerHTML = '';
      displayedKeys.clear();
      oldestTimestamp = null;

      if (currentUserPfpImg) currentUserPfpImg.style.display = 'none';
      if (toggleBioEditorButton) toggleBioEditorButton.style.display = 'none';
      if (bioEditorPanel) bioEditorPanel.style.display = 'none';
      if (bioInput) { bioInput.disabled = true; bioInput.value = ''; }
      if (setBioButton) setBioButton.disabled = true;
      if (pfpUploadButton) pfpUploadButton.disabled = true;
      if (setPfpButton) setPfpButton.disabled = true;
      if (pfpPreviewImg) pfpPreviewImg.src = generateDefaultPfpDataUrl('loggedout'); 

      updateBioCharCount();
      pfpCache.clear(); 

      if (imageUrlButton) { imageUrlButton.disabled = true; imageUrlButton.innerHTML = '🔗'; imageUrlButton.title = "Send Image from URL"; }
      isSendingImage = false;
      if (messageInput) messageInput.placeholder = "Enter message";
      if (window._liveListenerUnsubscribe) { window._liveListenerUnsubscribe.forEach(unsub => unsub()); window._liveListenerUnsubscribe = []; }
    }
  }

  async function handleAuthentication() {
    const enteredName = nameInput.value.trim(); if (!enteredName) { alert("Please enter a name."); return; }
    const sanitizedName = sanitizeFirebaseKey(enteredName); const userCredRef = ref(database, `user_credentials/${sanitizedName}`);
    try {
      const snapshot = await get(userCredRef);
      if (snapshot.exists()) { 
        const storedHash = snapshot.val().hashedPassword; const password = prompt(`User "${enteredName}" exists. Enter password to login:`); if (!password) return;
        const inputHash = await hashPassword(password);
        if (inputHash === storedHash) { userName = enteredName; localStorage.setItem(localStorageNameKey, userName); localStorage.setItem(localStorageAuthKey, 'true'); isAuthenticated = true; alert(`Login successful for ${userName}!`);
        } else { alert("Incorrect password."); isAuthenticated = false; localStorage.removeItem(localStorageAuthKey); }
      } else { 
        const newPassword = prompt(`User "${enteredName}" not found. Create a password to register:`); if (!newPassword) return;
        const confirmPassword = prompt("Confirm your password:"); if (!confirmPassword) return;
        if (newPassword === confirmPassword) { const newHashedPassword = await hashPassword(newPassword);
          await set(userCredRef, { hashedPassword: newHashedPassword });
          userName = enteredName; localStorage.setItem(localStorageNameKey, userName); localStorage.setItem(localStorageAuthKey, 'true'); isAuthenticated = true; alert(`User "${userName}" registered successfully!`);
        } else { alert("Passwords do not match. Registration failed."); isAuthenticated = false; localStorage.removeItem(localStorageAuthKey); }
      }
    } catch (error) { console.error("Authentication error:", error); alert("An error occurred during authentication. Check console."); isAuthenticated = false; localStorage.removeItem(localStorageAuthKey); }
    updateUIBasedOnAuthState();
  }

  if(setNameButton) setNameButton.addEventListener('click', () => {
    if (isAuthenticated) { userName = null; isAuthenticated = false; localStorage.removeItem(localStorageNameKey); localStorage.removeItem(localStorageAuthKey); if(nameInput) nameInput.value = ''; if (bioEditorPanel) bioEditorPanel.style.display = 'none'; updateUIBasedOnAuthState(); alert("You have been logged out.");
    } else { handleAuthentication(); }
  });

  let oldestTimestamp = null;
  const displayedKeys = new Set();
  window._lastTs = null;
  const snapToMsg = snap => ({ key: snap.key, ...snap.val() });

  const displayMessage = async (msg, { prepend = false } = {}) => {
      if (!isAuthenticated || !msg || !chatbox) return;
      if (displayedKeys.has(msg.key)) return;
      displayedKeys.add(msg.key);

      const wrapper = document.createElement('div'); 
      const p = document.createElement('p');        
      wrapper.setAttribute('data-message-key', msg.key);
      const ts = new Date(msg.timestamp);
      const formatted = ts.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });

      if (msg.name === userName) p.classList.add('same-sender');

      if (window._lastTs && !prepend) {
        const diffMin = (ts - window._lastTs) / 60000;
        if (diffMin > 10) {
          const hr = document.createElement('hr'); hr.classList.add('message-spacer');
          wrapper.appendChild(hr);
        }
      }
      if (!prepend) window._lastTs = ts;

      const pfpImg = document.createElement('img');
      pfpImg.classList.add('message-pfp');
      pfpImg.src = await getPfpDataForUser(msg.name);
      pfpImg.setAttribute('data-pfp-for-user', msg.name);
      p.appendChild(pfpImg);

      const contentWrapper = document.createElement('div');
      contentWrapper.classList.add('message-content-wrapper');

      const messageHeader = document.createElement('div');
      messageHeader.classList.add('message-header');

      const nameStrong = document.createElement('strong');
      nameStrong.textContent = msg.name;
      nameStrong.classList.add('message-username');
      nameStrong.addEventListener('click', (e) => { e.stopPropagation(); showBioModal(msg.name); });
      messageHeader.appendChild(nameStrong);

      const messageControls = document.createElement('div');
      messageControls.classList.add('message-controls');

      const timestampSpan = document.createElement('span');
      timestampSpan.classList.add('timestamp');
      timestampSpan.textContent = formatted;
      messageControls.appendChild(timestampSpan);

      if (msg.name === userName) { 
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.classList.add('delete-button');
        deleteButton.addEventListener('click', () => {
            if (confirm(`Are you sure you want to delete this message?`)) {
                remove(ref(database, `messages/${msg.key}`))
                    .then(() => { console.log('Message deleted successfully!'); })
                    .catch(error => { console.error('Error deleting message:', error); alert('Error deleting message. Please try again.'); });
            }
        });
        messageControls.appendChild(deleteButton);
      }
      messageHeader.appendChild(messageControls);
      contentWrapper.appendChild(messageHeader);

      const messageBody = document.createElement('div');
      messageBody.classList.add('message-body');

      if (msg.type === 'image' && msg.imageUrl) {
          const imgElement = document.createElement('img');
          imgElement.src = msg.imageUrl;
          imgElement.alt = `${msg.name}'s image`;
          imgElement.classList.add('chat-image');
          imgElement.addEventListener('click', () => openImageLightbox(msg.imageUrl));
          imgElement.onerror = function() {
              const errorText = document.createElement('span');
              errorText.textContent = ` (Image: ${this.src.substring(0,30)}... failed to load)`;
              errorText.classList.add('image-error-text');
              if (this.parentNode) this.parentNode.insertBefore(errorText, this.nextSibling);
              this.remove();
          };
          messageBody.appendChild(imgElement);
      } else {
          const textSpan = document.createElement('span');
          textSpan.textContent = msg.text || ''; 
          messageBody.appendChild(textSpan);
      }
      contentWrapper.appendChild(messageBody);

      p.appendChild(contentWrapper);
      wrapper.appendChild(p);

      if (prepend) chatbox.insertBefore(wrapper, chatbox.firstChild);
      else chatbox.appendChild(wrapper);
  };

  const loadRecent = async () => { 
    if (!isAuthenticated || !chatbox) return;
    const recentQ = query( messagesRef, orderByChild('timestamp'), limitToLast(30) );
    const snap = await get(recentQ);
    if (!snap.exists()) { oldestTimestamp = null; return; }
    const arr = Object.entries(snap.val()).map(([key,val]) => ({ key, ...val })).sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
    chatbox.innerHTML = ''; displayedKeys.clear(); window._lastTs = null;

    const uniqueUserNames = [...new Set(arr.map(m => m.name))];
    await Promise.all(uniqueUserNames.map(name => getPfpDataForUser(name)));

    for (const m of arr) { await displayMessage(m); } 

    if (chatbox.firstChild) chatbox.scrollTop = chatbox.scrollHeight;
    oldestTimestamp = arr.length > 0 ? arr[0].timestamp : null;
  };

  window._liveListenerUnsubscribe = [];
  const startLiveListener = () => { 
      if (!isAuthenticated) return;
      if (window._liveListenerUnsubscribe.length > 0) { window._liveListenerUnsubscribe.forEach(unsub => unsub()); window._liveListenerUnsubscribe = []; }
      const nowISO = new Date().toISOString(); const liveQ = query( messagesRef, orderByChild('timestamp'), startAt(nowISO) );
      const unsubChildAdded = onChildAdded(liveQ, async snap => { 
          if (!isAuthenticated) return; const msg = snapToMsg(snap);
          await displayMessage(msg); 
          if (chatbox && chatbox.lastChild) chatbox.scrollTop = chatbox.scrollHeight;
      }, err => { console.error("Live listener error (onChildAdded):", err); });
      window._liveListenerUnsubscribe.push(unsubChildAdded);
      const unsubChildRemoved = onChildRemoved(messagesRef, snap => {
          if (!isAuthenticated) return; displayedKeys.delete(snap.key);
          const messageElement = document.querySelector(`div[data-message-key="${snap.key}"]`);
          if (messageElement) { messageElement.remove(); } 
      }, err => { console.error("Live listener error (onChildRemoved):", err); });
      window._liveListenerUnsubscribe.push(unsubChildRemoved);
  };

  if(chatbox) chatbox.addEventListener('scroll', async () => { 
    if (!isAuthenticated || chatbox.scrollTop !== 0 || !oldestTimestamp) return;
    const oldQ = query( messagesRef, orderByChild('timestamp'), endBefore(oldestTimestamp), limitToLast(30) );
    const snap = await get(oldQ); if (!snap.exists()) { oldestTimestamp = null; return; }
    const olderOriginal = Object.entries(snap.val()).map(([key,val]) => ({ key, ...val })).sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
    if (olderOriginal.length === 0) { oldestTimestamp = null; return; }

    const uniqueUserNames = [...new Set(olderOriginal.map(m => m.name))];
    await Promise.all(uniqueUserNames.map(name => getPfpDataForUser(name)));

    const beforeHeight = chatbox.scrollHeight;
    for (const m of olderOriginal) { 
        await displayMessage(m, { prepend: true });
    }
    oldestTimestamp = olderOriginal[0].timestamp; 
    const afterHeight = chatbox.scrollHeight;
    chatbox.scrollTop = (afterHeight - beforeHeight); 
  });

  const sendMessage = () => {
    if (!isAuthenticated) { alert("You must be authenticated to send messages."); return; }
    const content = messageInput.value.trim(); if (!userName) { return alert("Error: User name not set."); }
    if (!content) { return alert("Please enter a message or image URL."); }
    let messageData;
    if (isSendingImage) { messageData = { name: userName, type: 'image', imageUrl: content, timestamp: new Date().toISOString() };
    } else { messageData = { name: userName, type: 'text', text: content, timestamp: new Date().toISOString() }; }
    push(messagesRef, messageData).then(() => {
      messageInput.value = '';
      if (isSendingImage && imageUrlButton) { isSendingImage = false; messageInput.placeholder = "Enter message"; imageUrlButton.innerHTML = '🔗'; imageUrlButton.title = "Send Image from URL"; }
    }).catch(err => { console.error("Push error:", err); alert("Error sending message. Please try again."); });
  };

  if(sendButton) sendButton.addEventListener('click', sendMessage);
  if(messageInput) messageInput.addEventListener('keypress', e => { if (e.key === 'Enter'||e.keyCode===13) { e.preventDefault(); sendMessage(); }});

  async function initializeAppAsync() { 
    const storedUserName = localStorage.getItem(localStorageNameKey); const sessionInitiallyActive = localStorage.getItem(localStorageAuthKey) === 'true';
    if (storedUserName) { if(nameInput) nameInput.value = storedUserName; userName = storedUserName;
        if (sessionInitiallyActive) { const sanitizedName = sanitizeFirebaseKey(storedUserName); const userCredRef = ref(database, `user_credentials/${sanitizedName}`);
            try { const snapshot = await get(userCredRef);
                if (snapshot.exists()) { isAuthenticated = true; }
                else { alert(`User "${storedUserName}" from your previous session was not found. Please log in or register again.`); localStorage.removeItem(localStorageNameKey); localStorage.removeItem(localStorageAuthKey); userName = null; isAuthenticated = false; if(nameInput) nameInput.value = '';}
            } catch (dbError) { console.error("Error checking user credentials during session validation:", dbError); alert("Error validating session. Please try logging in."); localStorage.removeItem(localStorageAuthKey); isAuthenticated = false; }
        } else { isAuthenticated = false; }
    } else { userName = null; isAuthenticated = false; if(nameInput) nameInput.value = ''; }
    updateUIBasedOnAuthState(); updateBioCharCount();
  }

  initializeAppAsync();

} catch (error) {
  console.error("Initialization error:", error);
  const authStatusDiv = document.getElementById('auth-status');
  if (authStatusDiv) { authStatusDiv.textContent = "Error initializing application. Check console."; authStatusDiv.style.color = "red"; }
  else { alert("Error initializing application. Check console."); }
}