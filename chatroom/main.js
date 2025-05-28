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

  const toggleBioEditorButton = document.getElementById('toggle-bio-editor-button');
  const bioEditorPanel    = document.getElementById('bio-editor-panel');
  const bioInput          = document.getElementById('bio-input');
  const setBioButton      = document.getElementById('set-bio-button');
  const bioCharCount      = document.getElementById('bio-char-count');
  const bioModal          = document.getElementById('bio-modal');
  const modalUsername     = document.getElementById('modal-username');
  const modalBioText      = document.getElementById('modal-bio-text');
  const closeModalButton  = document.querySelector('#bio-modal .close-button');

  const imageUrlButton = document.getElementById('image-url-button');
  let isSendingImage = false;

  const imageLightboxModal = document.getElementById('image-lightbox-modal');
  const lightboxImage = document.getElementById('lightbox-image');
  const closeLightboxButton = document.querySelector('#image-lightbox-modal .close-button');

  const localStorageNameKey = 'chatUserName';
  const localStorageAuthKey = 'chatUserAuthenticated';
  let userName = null;
  let isAuthenticated = false;

  async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  function sanitizeFirebaseKey(key) { return key.replace(/[.#$[\]]/g, '_'); }

  function updateBioCharCount() {
    if (!bioInput || !bioCharCount) return;
    const currentLength = bioInput.value.length;
    bioCharCount.textContent = `${currentLength}/200`;
  }

  async function loadCurrentUserBio() {
    if (!isAuthenticated || !userName || !bioInput) return;
    const sanitizedName = sanitizeFirebaseKey(userName);
    const userBioRef = ref(database, `user_credentials/${sanitizedName}/bio`);
    try {
        const snapshot = await get(userBioRef);
        if (snapshot.exists()) {
            bioInput.value = snapshot.val();
        } else {
            bioInput.value = '';
        }
    } catch (error) {
        console.error("Error loading user bio:", error);
        bioInput.value = '';
    }
    updateBioCharCount();
  }

  async function saveUserBio() {
    if (!isAuthenticated || !userName || !bioInput) {
        alert("You must be logged in to set a bio.");
        return;
    }
    const bioText = bioInput.value.trim();
    if (bioText.length > 200) {
        alert("Bio cannot exceed 200 characters.");
        return;
    }
    const sanitizedName = sanitizeFirebaseKey(userName);
    const userCredBioRef = ref(database, `user_credentials/${sanitizedName}/bio`);
    try {
        await set(userCredBioRef, bioText);
        alert("Bio updated successfully!");
        if (bioEditorPanel) bioEditorPanel.style.display = 'none';
    } catch (error) {
        console.error("Error setting bio:", error);
        alert("Failed to update bio. Please try again.");
    }
  }

  async function showBioModal(clickedUserName) {
    modalUsername.textContent = `${clickedUserName}'s Bio`;
    modalBioText.textContent = "Loading bio...";
    bioModal.style.display = 'flex';
    const sanitizedClickedName = sanitizeFirebaseKey(clickedUserName);
    const userBioRef = ref(database, `user_credentials/${sanitizedClickedName}/bio`);
    try {
        const snapshot = await get(userBioRef);
        if (snapshot.exists() && snapshot.val() && snapshot.val().trim() !== "") {
            modalBioText.textContent = snapshot.val();
        } else {
            modalBioText.textContent = "This user hasn't set a bio yet, or it's empty.";
        }
    } catch (error) {
        console.error("Error fetching bio for modal:", error);
        modalBioText.textContent = "Could not load bio due to an error.";
    }
  }

  if (setBioButton) setBioButton.addEventListener('click', saveUserBio);
  if (bioInput) bioInput.addEventListener('input', updateBioCharCount);
  if (closeModalButton) closeModalButton.addEventListener('click', () => { if(bioModal) bioModal.style.display = 'none'; });
  if (toggleBioEditorButton) {
    toggleBioEditorButton.addEventListener('click', (e) => {
        e.stopPropagation();
        if (bioEditorPanel) {
            const isVisible = bioEditorPanel.style.display === 'flex';
            bioEditorPanel.style.display = isVisible ? 'none' : 'flex';
            if (!isVisible) {
                loadCurrentUserBio();
                if(bioInput) bioInput.focus();
            }
        }
    });
  }

  async function isValidImageUrl(url) {
    return new Promise((resolve) => {
        if (!url || typeof url !== 'string') { resolve(false); return; }
        const trimmedUrl = url.trim();
        if (!trimmedUrl.match(/^https?:\/\/[^\s/$.?#].[^\s]*\.(jpe?g|png|gif|webp)(\?[^\s]*)?$/i)) {
            resolve(false); return;
        }
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = trimmedUrl;
    });
  }

  if (imageUrlButton) {
    imageUrlButton.addEventListener('click', async () => {
        if (!isAuthenticated || !messageInput || !imageUrlButton) return;
        if (isSendingImage) {
            isSendingImage = false;
            messageInput.value = '';
            messageInput.placeholder = "Enter message";
            imageUrlButton.innerHTML = '🔗';
            imageUrlButton.title = "Send Image from URL";
            return;
        }
        const url = prompt("Enter the URL of the image you want to send:");
        if (url === null || url.trim() === '') { return; }
        const trimmedUrl = url.trim();
        const isValid = await isValidImageUrl(trimmedUrl);
        if (isValid) {
            messageInput.value = trimmedUrl;
            isSendingImage = true;
            messageInput.placeholder = "Image URL entered. Press Send.";
            imageUrlButton.innerHTML = '✓';
            imageUrlButton.title = "Clear image URL / Send text instead";
            if(messageInput) messageInput.focus();
        } else {
            alert("Invalid image URL. Must be http/https, end with .jpg, .png, .gif, or .webp, and be loadable.");
        }
    });
    if (messageInput) {
        messageInput.addEventListener('input', () => {
            if (isSendingImage && !messageInput.value.startsWith('http')) {
                isSendingImage = false;
                messageInput.placeholder = "Enter message";
                if (imageUrlButton) {
                    imageUrlButton.innerHTML = '🔗';
                    imageUrlButton.title = "Send Image from URL";
                }
            }
        });
    }
  }

  function openImageLightbox(imageUrl) {
    if (imageLightboxModal && lightboxImage) {
        lightboxImage.src = imageUrl;
        imageLightboxModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
  }
  function closeImageLightbox() {
    if (imageLightboxModal) {
        imageLightboxModal.style.display = 'none';
        if (lightboxImage) lightboxImage.src = '';
        document.body.style.overflow = '';
    }
  }
  if (closeLightboxButton) {
    closeLightboxButton.addEventListener('click', closeImageLightbox);
  }
  if (imageLightboxModal) {
    imageLightboxModal.addEventListener('click', (event) => {
        if (event.target === imageLightboxModal) {
            closeImageLightbox();
        }
    });
  }

  window.addEventListener('click', (event) => {
    if (bioEditorPanel && toggleBioEditorButton && bioEditorPanel.style.display === 'flex' &&
        !bioEditorPanel.contains(event.target) &&
        event.target !== toggleBioEditorButton && !toggleBioEditorButton.contains(event.target)) {
        bioEditorPanel.style.display = 'none';
    }
    if (bioModal && bioModal.style.display === 'flex' && event.target === bioModal) {
        bioModal.style.display = 'none';
    }
  });

  function updateUIBasedOnAuthState() {
    if (isAuthenticated && userName) {
      nameInput.value = userName;
      nameInput.disabled = true;
      setNameButton.textContent = `Logout (${userName})`;
      messageInput.disabled = false;
      sendButton.disabled = false;
      authStatus.textContent = `Authenticated as ${userName}. You can now chat.`;
      authStatus.style.color = 'green';
      if (toggleBioEditorButton) toggleBioEditorButton.style.display = 'inline-block';
      if (bioInput) bioInput.disabled = false;
      if (setBioButton) setBioButton.disabled = false;
      loadCurrentUserBio();
      if (imageUrlButton) imageUrlButton.disabled = false;
      loadRecent();
      startLiveListener();
    } else {
      nameInput.disabled = false;
      setNameButton.textContent = userName ? `Login as ${userName}` : "Set Name / Register";
      messageInput.disabled = true;
      sendButton.disabled = true;
      authStatus.textContent = "Please set your name and authenticate to chat.";
      authStatus.style.color = 'red';
      chatbox.innerHTML = '';
      displayedKeys.clear();
      oldestTimestamp = null;
      if (toggleBioEditorButton) toggleBioEditorButton.style.display = 'none';
      if (bioEditorPanel) bioEditorPanel.style.display = 'none';
      if (bioInput) { bioInput.disabled = true; bioInput.value = ''; }
      if (setBioButton) setBioButton.disabled = true;
      updateBioCharCount();
      if (imageUrlButton) {
        imageUrlButton.disabled = true;
        imageUrlButton.innerHTML = '🔗';
        imageUrlButton.title = "Send Image from URL";
      }
      isSendingImage = false;
      if (messageInput) messageInput.placeholder = "Enter message";
      if (window._liveListenerUnsubscribe) {
          window._liveListenerUnsubscribe.forEach(unsub => unsub());
          window._liveListenerUnsubscribe = [];
      }
    }
  }

  async function handleAuthentication() {
    const enteredName = nameInput.value.trim();
    if (!enteredName) { alert("Please enter a name."); return; }
    const sanitizedName = sanitizeFirebaseKey(enteredName);
    const userCredRef = ref(database, `user_credentials/${sanitizedName}`);
    try {
      const snapshot = await get(userCredRef);
      if (snapshot.exists()) {
        const storedHash = snapshot.val().hashedPassword;
        const password = prompt(`User "${enteredName}" exists. Enter password to login:`);
        if (!password) return;
        const inputHash = await hashPassword(password);
        if (inputHash === storedHash) {
          userName = enteredName; localStorage.setItem(localStorageNameKey, userName); localStorage.setItem(localStorageAuthKey, 'true'); isAuthenticated = true; alert(`Login successful for ${userName}!`);
        } else { alert("Incorrect password."); isAuthenticated = false; localStorage.removeItem(localStorageAuthKey); }
      } else {
        const newPassword = prompt(`User "${enteredName}" not found. Create a password to register:`);
        if (!newPassword) return;
        const confirmPassword = prompt("Confirm your password:");
        if (!confirmPassword) return;
        if (newPassword === confirmPassword) {
          const newHashedPassword = await hashPassword(newPassword);
          await set(userCredRef, { hashedPassword: newHashedPassword });
          userName = enteredName; localStorage.setItem(localStorageNameKey, userName); localStorage.setItem(localStorageAuthKey, 'true'); isAuthenticated = true; alert(`User "${userName}" registered successfully!`);
        } else { alert("Passwords do not match. Registration failed."); isAuthenticated = false; localStorage.removeItem(localStorageAuthKey); }
      }
    } catch (error) { console.error("Authentication error:", error); alert("An error occurred during authentication. Check console."); isAuthenticated = false; localStorage.removeItem(localStorageAuthKey); }
    updateUIBasedOnAuthState();
  }

  if(setNameButton) setNameButton.addEventListener('click', () => {
    if (isAuthenticated) {
        userName = null; isAuthenticated = false; localStorage.removeItem(localStorageNameKey); localStorage.removeItem(localStorageAuthKey);
        if(nameInput) nameInput.value = '';
        if (bioEditorPanel) bioEditorPanel.style.display = 'none';
        updateUIBasedOnAuthState();
        alert("You have been logged out.");
    } else { handleAuthentication(); }
  });

  let oldestTimestamp = null;
  const displayedKeys = new Set();
  window._lastTs = null;

  const snapToMsg = snap => ({ key: snap.key, ...snap.val() });

  const displayMessage = (msg, { prepend = false } = {}) => {
      if (!isAuthenticated || !msg) return;
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
          const hr = document.createElement('hr');
          hr.classList.add('message-spacer');
          wrapper.appendChild(hr);
        }
      }
      if (!prepend) window._lastTs = ts;

      const deleteButton = document.createElement('button');
      deleteButton.textContent = 'Delete';
      deleteButton.classList.add('delete-button');
      deleteButton.style.display = msg.name === userName ? 'inline' : 'none';
      deleteButton.addEventListener('click', () => {
          if (confirm(`Are you sure you want to delete this message?`)) {
              remove(ref(database, `messages/${msg.key}`))
                  .then(() => { console.log('Message deleted successfully!'); })
                  .catch(error => { console.error('Error deleting message:', error); alert('Error deleting message. Please try again.'); });
          }
      });

      const nameStrong = document.createElement('strong');
      nameStrong.textContent = msg.name;
      nameStrong.classList.add('message-username');
      nameStrong.addEventListener('click', (e) => { e.stopPropagation(); showBioModal(msg.name); });

      p.appendChild(nameStrong);
      p.append(": ");

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
          p.appendChild(imgElement);
      } else {
          const textSpan = document.createElement('span');
          textSpan.textContent = msg.text || '';
          p.appendChild(textSpan);
      }

      const timestampSpan = document.createElement('span');
      timestampSpan.classList.add('timestamp');
      timestampSpan.textContent = formatted;
      p.appendChild(timestampSpan);
      p.appendChild(deleteButton);
      wrapper.appendChild(p);

      if (prepend) chatbox.insertBefore(wrapper, chatbox.firstChild);
      else chatbox.appendChild(wrapper);
  };

  const loadRecent = async () => {
    if (!isAuthenticated) return;
    const recentQ = query( messagesRef, orderByChild('timestamp'), limitToLast(30) );
    const snap = await get(recentQ);
    if (!snap.exists()) { oldestTimestamp = null; return; }
    const arr = Object.entries(snap.val()).map(([key,val]) => ({ key, ...val })).sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
    if(chatbox) chatbox.innerHTML = '';
    displayedKeys.clear(); window._lastTs = null;
    arr.forEach(m => displayMessage(m));
    if (chatbox && chatbox.firstChild) chatbox.scrollTop = chatbox.scrollHeight;
    oldestTimestamp = arr.length > 0 ? arr[0].timestamp : null;
  };

  window._liveListenerUnsubscribe = [];
  const startLiveListener = () => {
      if (!isAuthenticated) return;
      if (window._liveListenerUnsubscribe.length > 0) { window._liveListenerUnsubscribe.forEach(unsub => unsub()); window._liveListenerUnsubscribe = []; }
      const nowISO = new Date().toISOString();
      const liveQ = query( messagesRef, orderByChild('timestamp'), startAt(nowISO) );
      const unsubChildAdded = onChildAdded(liveQ, snap => {
          if (!isAuthenticated) return;
          const msg = snapToMsg(snap); displayMessage(msg);
          if (chatbox && chatbox.lastChild) chatbox.scrollTop = chatbox.scrollHeight;
      }, err => { console.error("Live listener error (onChildAdded):", err); });
      window._liveListenerUnsubscribe.push(unsubChildAdded);
      const unsubChildRemoved = onChildRemoved(messagesRef, snap => {
          if (!isAuthenticated) return;
          displayedKeys.delete(snap.key);
          const messageElement = document.querySelector(`div[data-message-key="${snap.key}"]`);
          if (messageElement) { const hrSpacer = messageElement.querySelector('hr.message-spacer'); if (hrSpacer) hrSpacer.remove(); messageElement.remove(); }
      }, err => { console.error("Live listener error (onChildRemoved):", err); });
      window._liveListenerUnsubscribe.push(unsubChildRemoved);
  };

  if(chatbox) chatbox.addEventListener('scroll', async () => {
    if (!isAuthenticated || chatbox.scrollTop !== 0 || !oldestTimestamp) return;
    const oldQ = query( messagesRef, orderByChild('timestamp'), endBefore(oldestTimestamp), limitToLast(30) );
    const snap = await get(oldQ);
    if (!snap.exists()) { oldestTimestamp = null; return; }
    const older = Object.entries(snap.val()).map(([key,val]) => ({ key, ...val })).sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
    if (older.length === 0) { oldestTimestamp = null; return; }
    const beforeHeight = chatbox.scrollHeight; const currentScrollTop = chatbox.scrollTop;
    older.forEach(m => displayMessage(m, { prepend: true }));
    oldestTimestamp = older[0].timestamp; const afterHeight = chatbox.scrollHeight;
    chatbox.scrollTop = (afterHeight - beforeHeight) + currentScrollTop;
  });

  const sendMessage = () => {
    if (!isAuthenticated) { alert("You must be authenticated to send messages."); return; }
    const content = messageInput.value.trim();
    if (!userName) { return alert("Error: User name not set."); }
    if (!content) { return alert("Please enter a message or image URL."); }
    let messageData;
    if (isSendingImage) {
        messageData = { name: userName, type: 'image', imageUrl: content, timestamp: new Date().toISOString() };
    } else {
        messageData = { name: userName, type: 'text', text: content, timestamp: new Date().toISOString() };
    }
    push(messagesRef, messageData)
    .then(() => {
      messageInput.value = '';
      if (isSendingImage && imageUrlButton) {
          isSendingImage = false; messageInput.placeholder = "Enter message"; imageUrlButton.innerHTML = '🔗'; imageUrlButton.title = "Send Image from URL";
      }
      if (chatbox && chatbox.lastChild) chatbox.scrollTop = chatbox.scrollHeight;
    })
    .catch(err => { console.error("Push error:", err); alert("Error sending message. Please try again."); });
  };

  if(sendButton) sendButton.addEventListener('click', sendMessage);
  if(messageInput) messageInput.addEventListener('keypress', e => { if (e.key === 'Enter'||e.keyCode===13) { e.preventDefault(); sendMessage(); }});

  async function initializeAppAsync() {
    const storedUserName = localStorage.getItem(localStorageNameKey);
    const sessionInitiallyActive = localStorage.getItem(localStorageAuthKey) === 'true';
    if (storedUserName) {
        if(nameInput) nameInput.value = storedUserName; userName = storedUserName;
        if (sessionInitiallyActive) {
            const sanitizedName = sanitizeFirebaseKey(storedUserName);
            const userCredRef = ref(database, `user_credentials/${sanitizedName}`);
            try {
                const snapshot = await get(userCredRef);
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