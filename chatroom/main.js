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
  const bioCharCount          = document.getElementById('bio-char-count');
  const pronounsInput         = document.getElementById('pronouns-input');

  const pfpUploadInput        = document.getElementById('pfp-upload-input');
  const pfpUploadButton       = document.getElementById('pfp-upload-button');
  const pfpPreviewImg         = document.getElementById('pfp-preview');
  const setPfpButton          = document.getElementById('set-pfp-button');

  const bioModal              = document.getElementById('bio-modal');
  const modalPfpImg           = document.getElementById('modal-pfp');
  const modalUsername         = document.getElementById('modal-username');
  const modalBioText          = document.getElementById('modal-bio-text');
  const closeModalButtonBio   = document.querySelector('#bio-modal .close-button'); 
  const modalPronouns         = document.getElementById('modal-pronouns');

  const imageUrlButton = document.getElementById('image-url-button');
  let isSendingImage = false;

  const imageLightboxModal = document.getElementById('image-lightbox-modal');
  const lightboxImage = document.getElementById('lightbox-image');
  const closeLightboxButton = document.querySelector('#image-lightbox-modal .close-button');

  const md = window.markdownit();

  const openDmSidebarButton = document.getElementById('open-dm-sidebar');
  const closeDmSidebarButton = document.getElementById('close-dm-sidebar');
  const dmSidebar = document.getElementById('dm-sidebar');
  const dmUserList = document.getElementById('dm-user-list');
  const mainContent = document.getElementById('main-content');

  const customAlertModal = document.getElementById('custom-alert-modal');
  const alertTitle = document.getElementById('alert-title');
  const alertMessage = document.getElementById('alert-message');
  const alertOkButton = document.getElementById('alert-ok-button');
  const alertCloseButton = document.getElementById('alert-close-button');

  const customPromptModal = document.getElementById('custom-prompt-modal');
  const promptTitle = document.getElementById('prompt-title');
  const promptMessage = document.getElementById('prompt-message');
  const promptInput = document.getElementById('prompt-input');
  const promptOkButton = document.getElementById('prompt-ok-button');
  const promptCancelButton = document.getElementById('prompt-cancel-button');
  const promptCloseButton = document.getElementById('prompt-close-button');

  let currentChatContext = { type: 'global' }; // 'global' or 'dm'

  function showCustomAlert(message, title = 'Alert') {
    if (alertMessage && alertTitle && customAlertModal) {
      alertMessage.textContent = message;
      alertTitle.textContent = title;
      customAlertModal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      
      // Focus the OK button for accessibility
      if (alertOkButton) alertOkButton.focus();
    }
  }

  function hideCustomAlert() {
    if (customAlertModal) {
      customAlertModal.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  function showCustomPrompt(message, title = 'Enter Password') {
    return new Promise((resolve) => {
      if (promptMessage && promptTitle && promptInput && customPromptModal) {
        promptMessage.textContent = message;
        promptTitle.textContent = title;
        promptInput.value = '';
        customPromptModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Focus the input field
        if (promptInput) promptInput.focus();
        
        // Set up one-time event listeners
        const handleOk = () => {
          const value = promptInput.value;
          hideCustomPrompt();
          resolve(value);
        };
        
        const handleCancel = () => {
          hideCustomPrompt();
          resolve(null);
        };
        
        const handleClose = () => {
          hideCustomPrompt();
          resolve(null);
        };
        
        const handleKeyPress = (e) => {
          if (e.key === 'Enter') {
            handleOk();
          } else if (e.key === 'Escape') {
            handleCancel();
          }
        };
        
        if (promptOkButton) promptOkButton.addEventListener('click', handleOk, { once: true });
        if (promptCancelButton) promptCancelButton.addEventListener('click', handleCancel, { once: true });
        if (promptCloseButton) promptCloseButton.addEventListener('click', handleClose, { once: true });
        if (customPromptModal) customPromptModal.addEventListener('click', (event) => {
          if (event.target === customPromptModal) handleCancel();
        }, { once: true });
        if (promptInput) promptInput.addEventListener('keydown', handleKeyPress, { once: true });
      } else {
        resolve(null);
      }
    });
  }

  function hideCustomPrompt() {
    if (customPromptModal) {
      customPromptModal.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  // Set up event listeners for the custom alert
  if (alertOkButton) alertOkButton.addEventListener('click', hideCustomAlert);
  if (alertCloseButton) alertCloseButton.addEventListener('click', hideCustomAlert);
  if (customAlertModal) customAlertModal.addEventListener('click', (event) => {
    if (event.target === customAlertModal) hideCustomAlert();
  });

  const localStorageNameKey = 'chatUserName';
  const localStorageAuthKey = 'chatUserAuthenticated';
  const localStoragePfpCacheKey = 'chatPfpCache';
  const sessionChatContextKey = 'chatSessionContext';
  let userName = null;
  let isAuthenticated = false;
  let selectedPfpFile = null;
  const pfpCache = new Map();

  // Load cached profile pictures from localStorage
  try {
    const cachedPfps = localStorage.getItem(localStoragePfpCacheKey);
    if (cachedPfps) {
      const parsedCache = JSON.parse(cachedPfps);
      Object.entries(parsedCache).forEach(([key, value]) => {
        pfpCache.set(key, value);
      });
    }
  } catch (error) {
    console.warn('Error loading cached profile pictures:', error);
  }

  // Function to save pfpCache to localStorage
  function savePfpCache() {
    try {
      const cacheObject = Object.fromEntries(pfpCache);
      localStorage.setItem(localStoragePfpCacheKey, JSON.stringify(cacheObject));
    } catch (error) {
      console.warn('Error saving profile picture cache:', error);
    }
  }

  const saveProfileButton = document.getElementById('save-profile-button');

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
        } else {
            selectedPfpFile = null;
            if (pfpPreviewImg) pfpPreviewImg.src = currentUserPfpImg.src || generateDefaultPfpDataUrl(userName);
        }
    });
  }

  if (setPfpButton) {
    setPfpButton.addEventListener('click', async () => {
        if (!isAuthenticated || !userName || !selectedPfpFile) {
            showCustomAlert("Please select an image file first.", 'No Image Selected');
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

            showCustomAlert("Profile picture updated successfully!", 'Success');
            selectedPfpFile = null;
            if(pfpUploadInput) pfpUploadInput.value = ''; 
        } catch (error) {
            console.error("Error updating PFP:", error);
            showCustomAlert("Failed to update profile picture: " + error.message, 'Update Error');
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
          savePfpCache(); // Save to localStorage when new profile picture is cached
          return pfpData;
      } catch (error) {
          console.warn(`Could not fetch PFP for ${userNameForPfp}:`, error);
          pfpCache.set(userNameForPfp, defaultPfp);
          savePfpCache(); // Save to localStorage even for default profile pictures
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
    
    // Update cache and save to localStorage
    pfpCache.set(targetUserName, newPfpDataUrl);
    savePfpCache();
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
    if (!isAuthenticated || !userName || !bioInput || !pronounsInput) return;
    const sanitizedName = sanitizeFirebaseKey(userName);
    const userBioRef = ref(database, `user_credentials/${sanitizedName}`);
    try {
        const snapshot = await get(userBioRef);
        if (snapshot.exists()) {
            const userData = snapshot.val();
            bioInput.value = userData.bio || '';
            pronounsInput.value = userData.pronouns || '';
        } else {
            bioInput.value = '';
            pronounsInput.value = '';
        }
    } catch (error) {
        console.error("Error loading user bio:", error);
        bioInput.value = '';
        pronounsInput.value = '';
    }
    updateBioCharCount();
  }

  async function saveUserProfile() { 
    if (!isAuthenticated || !userName || !bioInput || !pronounsInput) {
        showCustomAlert("You must be logged in to set your profile.", 'Authentication Required');
        return;
    }

    const bioText = bioInput.value.trim();
    const pronounsText = pronounsInput.value.trim();
    
    if (bioText.length > 200) {
        showCustomAlert("Bio cannot exceed 200 characters.", 'Invalid Input');
        return;
    }

    if (saveProfileButton) {
        saveProfileButton.disabled = true;
        saveProfileButton.classList.add('saving');
        saveProfileButton.textContent = "Saving...";
    }
    
    const sanitizedName = sanitizeFirebaseKey(userName);
    const userCredRef = ref(database, `user_credentials/${sanitizedName}`);

    try {
        // Get current user data
        const snapshot = await get(userCredRef);
        const currentData = snapshot.exists() ? snapshot.val() : {};
        
        // Prepare update data
        const updateData = {
            ...currentData,
            bio: bioText,
            pronouns: pronounsText
        };

        // If there's a new profile picture, process and add it
        if (selectedPfpFile) {
            try {
                const base64Pfp = await resizeAndEncodeImage(selectedPfpFile);
                updateData.pfpBase64 = base64Pfp;
                
                // Update the current user's PFP display
                if (currentUserPfpImg) currentUserPfpImg.src = base64Pfp;
                pfpCache.set(userName, base64Pfp);
                updateDisplayedPfpsForUser(userName, base64Pfp);
            } catch (error) {
                console.error("Error processing profile picture:", error);
                showCustomAlert("Failed to process profile picture. Other changes were saved.", 'Update Error');
            }
        }

        // Save all changes
        await set(userCredRef, updateData);
        
        // Reset the file input and preview
        selectedPfpFile = null;
        if (pfpUploadInput) pfpUploadInput.value = '';
        if (pfpPreviewImg) pfpPreviewImg.src = currentUserPfpImg.src;

        showCustomAlert("Profile updated successfully!", 'Success');
    } catch (error) {
        console.error("Error updating profile:", error);
        showCustomAlert("Failed to update profile. Please try again.", 'Update Error');
    } finally {
        if (saveProfileButton) {
            saveProfileButton.disabled = false;
            saveProfileButton.classList.remove('saving');
            saveProfileButton.textContent = "Save Profile";
        }
    }
  }

  if (saveProfileButton) {
    saveProfileButton.addEventListener('click', saveUserProfile);
  }

  if (bioInput) bioInput.addEventListener('input', updateBioCharCount);
  if (closeModalButtonBio) closeModalButtonBio.addEventListener('click', () => { if(bioModal) bioModal.style.display = 'none'; });

  async function showBioModal(clickedUserName) { 
    if (!bioModal || !modalUsername || !modalBioText || !modalPfpImg || !modalPronouns) return;
    modalUsername.textContent = clickedUserName;
    modalBioText.textContent = "Loading...";
    modalPronouns.textContent = "Loading...";
    modalBioText.className = '';
    modalPronouns.className = '';
    modalPfpImg.src = generateDefaultPfpDataUrl(clickedUserName); 
    bioModal.style.display = 'flex';

    const sanitizedClickedName = sanitizeFirebaseKey(clickedUserName);
    const userCredRef = ref(database, `user_credentials/${sanitizedClickedName}`);
    try {
        const snapshot = await get(userCredRef);
        if (snapshot.exists()) {
            const userData = snapshot.val();
            
            // Handle bio
            if (userData.bio && userData.bio.trim() !== "") {
                modalBioText.textContent = userData.bio;
            } else {
                modalBioText.textContent = "No bio yet";
                modalBioText.className = 'empty-bio';
            }
            
            // Handle pronouns
            if (userData.pronouns && userData.pronouns.trim() !== "") {
                modalPronouns.textContent = userData.pronouns;
            } else {
                modalPronouns.textContent = "No pronouns set";
                modalPronouns.className = 'empty-bio';
            }
            
            modalPfpImg.src = userData.pfpBase64 || generateDefaultPfpDataUrl(clickedUserName);
            pfpCache.set(clickedUserName, modalPfpImg.src); 
        } else {
            modalBioText.textContent = "No bio yet";
            modalBioText.className = 'empty-bio';
            modalPronouns.textContent = "No pronouns set";
            modalPronouns.className = 'empty-bio';
        }
    } catch (error) {
        console.error("Error fetching bio/PFP for modal:", error);
        modalBioText.textContent = "Could not load user data";
        modalBioText.className = 'empty-bio';
        modalPronouns.textContent = "Could not load user data";
        modalPronouns.className = 'empty-bio';
    }
  }

  function toggleProfilePanel() { 
      if (bioEditorPanel) {
          const isVisible = bioEditorPanel.classList.contains('visible');
          if (!isVisible) {
              bioEditorPanel.style.display = 'flex';
              // Force a reflow
              bioEditorPanel.offsetHeight;
              bioEditorPanel.classList.add('visible');
              if (isAuthenticated) { 
                  loadCurrentUserBio();
                  loadCurrentUserPfp(); 
                  if(bioInput) bioInput.focus();
                  selectedPfpFile = null;
                  if(pfpUploadInput) pfpUploadInput.value = '';
              }
          } else {
              bioEditorPanel.classList.remove('visible');
              // Wait for the animation to complete before hiding
              setTimeout(() => {
                  bioEditorPanel.style.display = 'none';
              }, 300);
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

  function openNav() {
    if (dmSidebar) {
      dmSidebar.style.width = "250px";
      document.body.classList.add('sidebar-open');
      populateUserList();
    }
  }

  function closeNav() {
    if (dmSidebar) {
      dmSidebar.style.width = "0";
      document.body.classList.remove('sidebar-open');
    }
  }

  async function populateUserList() {
    if (!dmUserList) return;
    dmUserList.innerHTML = ''; 

    // Add Global Chat
    const globalChatItem = document.createElement('div');
    globalChatItem.textContent = 'Global Chat';
    globalChatItem.classList.add('user-item');
    if (currentChatContext.type === 'global') {
        globalChatItem.classList.add('active');
    }
    globalChatItem.addEventListener('click', () => {
        switchToGlobalChat();
    });
    dmUserList.appendChild(globalChatItem);

    try {
        const snapshot = await get(credentialsRef);
        if (snapshot.exists()) {
            const users = snapshot.val();
            const promises = Object.keys(users).map(async (sanitizedName) => {
                const realName = sanitizedName.replace(/_/g, '.');
                if (realName === userName) return null;

                const userPfp = await getPfpDataForUser(realName);
                return { name: realName, pfp: userPfp, sanitized: sanitizedName };
            });

            const userList = (await Promise.all(promises)).filter(Boolean);

            userList.forEach(userData => {
                const userElement = document.createElement('div');
                userElement.classList.add('user-item');
                if (currentChatContext.type === 'dm' && currentChatContext.with === userData.name) {
                    userElement.classList.add('active');
                }

                const pfpImg = document.createElement('img');
                pfpImg.src = userData.pfp;
                pfpImg.alt = `${userData.name}'s PFP`;

                const nameSpan = document.createElement('span');
                nameSpan.textContent = userData.name;

                userElement.appendChild(pfpImg);
                userElement.appendChild(nameSpan);

                userElement.addEventListener('click', () => {
                    startDirectMessage(userData.name);
                    closeNav();
                });
                dmUserList.appendChild(userElement);
            });
        }
    } catch (error) {
        console.error("Error populating user list:", error);
        const errorItem = document.createElement('div');
        errorItem.textContent = 'Error loading users.';
        errorItem.classList.add('user-item');
        dmUserList.appendChild(errorItem);
    }
  }

  function startDirectMessage(otherUserName) {
    if (!userName || !otherUserName || userName === otherUserName) return;
    const sanitizedCurrentUser = sanitizeFirebaseKey(userName);
    const sanitizedOtherUser = sanitizeFirebaseKey(otherUserName);
    const dmID = [sanitizedCurrentUser, sanitizedOtherUser].sort().join('_');
    currentChatContext = { type: 'dm', dmId: dmID, with: otherUserName };
    sessionStorage.setItem(sessionChatContextKey, JSON.stringify(currentChatContext));
    updateChatHeader();
    loadRecent();
    startLiveListener();
  }

  function switchToGlobalChat() {
    currentChatContext = { type: 'global' };
    sessionStorage.setItem(sessionChatContextKey, JSON.stringify(currentChatContext));
    updateChatHeader();
    loadRecent();
    startLiveListener();
    closeNav();
  }

  function updateChatHeader() {
    const chatHeader = document.getElementById('chat-header');
    if (!chatHeader) return;

    if (currentChatContext.type === 'dm') {
        chatHeader.textContent = `Chat with ${currentChatContext.with}`;
    } else {
        chatHeader.textContent = 'Global Chat';
    }
  }

  if(openDmSidebarButton) openDmSidebarButton.addEventListener('click', openNav);
  if(closeDmSidebarButton) closeDmSidebarButton.addEventListener('click', closeNav);


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
        } else { showCustomAlert("Invalid image URL. Must be http/https, end with .jpg, .png, .gif, or .webp, and be loadable.", 'Invalid URL'); }
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
      if(openDmSidebarButton) openDmSidebarButton.style.display = 'inline-block';
      if (bioInput) bioInput.disabled = false;
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
      if(openDmSidebarButton) openDmSidebarButton.style.display = 'none';
      if (bioEditorPanel) bioEditorPanel.style.display = 'none';
      if (bioInput) { bioInput.disabled = true; bioInput.value = ''; }
      if (pfpUploadButton) pfpUploadButton.disabled = true;
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
    const enteredName = nameInput.value.trim(); if (!enteredName) { showCustomAlert("Please enter a name.", 'No Name'); return; }
    const sanitizedName = sanitizeFirebaseKey(enteredName); const userCredRef = ref(database, `user_credentials/${sanitizedName}`);
    try {
      const snapshot = await get(userCredRef);
      if (snapshot.exists()) { 
        const storedHash = snapshot.val().hashedPassword; 
        const password = await showCustomPrompt(`User "${enteredName}" exists. Enter password to login:`, 'Login');
        if (!password) return;
        const inputHash = await hashPassword(password);
        if (inputHash === storedHash) { userName = enteredName; localStorage.setItem(localStorageNameKey, userName); localStorage.setItem(localStorageAuthKey, 'true'); isAuthenticated = true; showCustomAlert(`Login successful for ${userName}!`, 'Login Successful');
        } else { showCustomAlert("Incorrect password.", 'Login Failed'); isAuthenticated = false; localStorage.removeItem(localStorageAuthKey); }
      } else { 
        const newPassword = await showCustomPrompt(`User "${enteredName}" not found. Create a password to register:`, 'Create Password');
        if (!newPassword) return;
        const confirmPassword = await showCustomPrompt("Confirm your password:", 'Confirm Password');
        if (!confirmPassword) return;
        if (newPassword === confirmPassword) { const newHashedPassword = await hashPassword(newPassword);
          await set(userCredRef, { hashedPassword: newHashedPassword });
          userName = enteredName; localStorage.setItem(localStorageNameKey, userName); localStorage.setItem(localStorageAuthKey, 'true'); isAuthenticated = true; showCustomAlert(`User "${userName}" registered successfully!`, 'Registration Successful');
        } else { showCustomAlert("Passwords do not match. Registration failed.", 'Registration Failed'); isAuthenticated = false; localStorage.removeItem(localStorageAuthKey); }
      }
    } catch (error) { console.error("Authentication error:", error); showCustomAlert("An error occurred during authentication. Check console.", 'Authentication Error'); isAuthenticated = false; localStorage.removeItem(localStorageAuthKey); }
    updateUIBasedOnAuthState();
  }

  if(setNameButton) setNameButton.addEventListener('click', () => {
    if (isAuthenticated) { 
      userName = null; 
      isAuthenticated = false; 
      localStorage.removeItem(localStorageNameKey); 
      localStorage.removeItem(localStorageAuthKey); 
      if(nameInput) nameInput.value = ''; 
      if (bioEditorPanel) bioEditorPanel.style.display = 'none'; 
      updateUIBasedOnAuthState(); 
      showCustomAlert("You have been logged out.", 'Logout');
    } else { 
      handleAuthentication(); 
    }
  });

  let oldestTimestamp = null;
  const displayedKeys = new Set();
  window._lastTs = null;
  const snapToMsg = snap => ({ key: snap.key, ...snap.val() });

  const displayMessage = async (msg, { prepend = false } = {}) => {
      if (!isAuthenticated || !msg || !chatbox) return;
      if (displayedKeys.has(msg.key)) return;
      displayedKeys.add(msg.key);

      const ts = new Date(msg.timestamp);
      const formatted = ts.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });

      // Check if we should group with adjacent messages
      let shouldGroupWithPrev = false;
      let shouldGroupWithNext = false;
      let nextMessage = null;
      let prevMessage = null;

      if (!prepend && chatbox.lastChild) {
          prevMessage = chatbox.lastChild;
          const prevMessageName = prevMessage.querySelector('.message-username')?.textContent;
          const prevMessageTime = new Date(prevMessage.getAttribute('data-timestamp'));
          const timeDiff = (ts - prevMessageTime) / 1000; // difference in seconds
          
          shouldGroupWithPrev = prevMessageName === msg.name && timeDiff < 300; // group if same user and within 5 minutes
      }

      if (prepend && chatbox.firstChild) {
          nextMessage = chatbox.firstChild;
          const nextMessageName = nextMessage.querySelector('.message-username')?.textContent;
          const nextMessageTime = new Date(nextMessage.getAttribute('data-timestamp'));
          const timeDiff = (nextMessageTime - ts) / 1000; // difference in seconds
          
          shouldGroupWithNext = nextMessageName === msg.name && timeDiff < 300; // group if same user and within 5 minutes
      }

      if (shouldGroupWithPrev) {
          // Add message to existing group
          const messageBody = prevMessage.querySelector('.message-body');
          
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
              textSpan.innerHTML = md.renderInline(msg.text || '');
              messageBody.appendChild(textSpan);
          }

          // Update timestamp
          const timestampSpan = prevMessage.querySelector('.timestamp');
          if (timestampSpan) {
              timestampSpan.textContent = formatted;
          }
          prevMessage.setAttribute('data-timestamp', msg.timestamp);
          return;
      }

      if (shouldGroupWithNext) {
          // Create new message group that will be merged with next message
          const wrapper = document.createElement('div');
          wrapper.setAttribute('data-message-key', msg.key);
          wrapper.setAttribute('data-timestamp', msg.timestamp);
          const p = document.createElement('p');
          if (msg.name === userName) p.classList.add('same-sender');

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

          const timestampSpan = document.createElement('span');
          timestampSpan.classList.add('timestamp');
          timestampSpan.textContent = formatted;
          messageHeader.appendChild(timestampSpan);

          const messageControls = document.createElement('div');
          messageControls.classList.add('message-controls');

          if (msg.name === userName) {
              const deleteButton = document.createElement('button');
              deleteButton.textContent = 'Delete';
              deleteButton.classList.add('delete-button');
              deleteButton.addEventListener('click', () => {
                  if (confirm(`Are you sure you want to delete this message?`)) {
                      remove(ref(database, `messages/${msg.key}`))
                          .then(() => { console.log('Message deleted successfully!'); })
                          .catch(error => { console.error('Error deleting message:', error); showCustomAlert('Error deleting message. Please try again.', 'Delete Error'); });
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
              textSpan.innerHTML = md.renderInline(msg.text || '');
              messageBody.appendChild(textSpan);
          }
          contentWrapper.appendChild(messageBody);

          p.appendChild(contentWrapper);
          wrapper.appendChild(p);

          // Insert before the next message
          chatbox.insertBefore(wrapper, nextMessage);

          // Move the content to the next message's body
          const nextMessageBody = nextMessage.querySelector('.message-body');
          const currentMessageBody = wrapper.querySelector('.message-body');

          const newContentDiv = document.createElement('div');
          newContentDiv.innerHTML = currentMessageBody.innerHTML;
          
          nextMessageBody.insertBefore(newContentDiv, nextMessageBody.firstChild);

          // Update timestamp
          const nextTimestampSpan = nextMessage.querySelector('.timestamp');
          if (nextTimestampSpan) {
              nextTimestampSpan.textContent = formatted;
          }
          nextMessage.setAttribute('data-timestamp', msg.timestamp);

          // Remove the temporary wrapper
          wrapper.remove();
          return;
      }

      // Create new message group (no grouping)
      const wrapper = document.createElement('div');
      wrapper.setAttribute('data-message-key', msg.key);
      wrapper.setAttribute('data-timestamp', msg.timestamp);
      const p = document.createElement('p');
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

      const timestampSpan = document.createElement('span');
      timestampSpan.classList.add('timestamp');
      timestampSpan.textContent = formatted;
      messageHeader.appendChild(timestampSpan);

      const messageControls = document.createElement('div');
      messageControls.classList.add('message-controls');

      if (msg.name === userName) {
          const deleteButton = document.createElement('button');
          deleteButton.textContent = 'Delete';
          deleteButton.classList.add('delete-button');
          deleteButton.addEventListener('click', () => {
              if (confirm(`Are you sure you want to delete this message?`)) {
                  remove(ref(database, `messages/${msg.key}`))
                      .then(() => { console.log('Message deleted successfully!'); })
                      .catch(error => { console.error('Error deleting message:', error); showCustomAlert('Error deleting message. Please try again.', 'Delete Error'); });
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
          textSpan.innerHTML = md.renderInline(msg.text || '');
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

    chatbox.innerHTML = '';
    displayedKeys.clear();
    window._lastTs = null;
    oldestTimestamp = null;
    
    try {
        const chatRef = currentChatContext.type === 'dm' 
            ? ref(database, `dms/${currentChatContext.dmId}`) 
            : messagesRef;

        const recentQ = query(chatRef, orderByChild('timestamp'), limitToLast(30));
        const snap = await get(recentQ);

        if (!snap.exists()) {
            oldestTimestamp = null;
            if (currentChatContext.type === 'dm') {
                chatbox.innerHTML = '<div class="chat-notice">This is the beginning of your direct message history.</div>';
            }
            return;
        }

        const arr = Object.entries(snap.val()).map(([key,val]) => ({ key, ...val })).sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        const uniqueUserNames = [...new Set(arr.map(m => m.name))];
        await Promise.all(uniqueUserNames.map(name => getPfpDataForUser(name)));

        for (const m of arr) { await displayMessage(m); } 

        if (chatbox.firstChild) chatbox.scrollTop = chatbox.scrollHeight;
        oldestTimestamp = arr.length > 0 ? arr[0].timestamp : null;

    } catch (error) {
        console.error("Error loading recent messages:", error);
        chatbox.innerHTML = '<div class="chat-notice error">Could not load messages.</div>';
    }
  };

  window._liveListenerUnsubscribe = [];
  const startLiveListener = () => { 
      if (!isAuthenticated) return;
      if (window._liveListenerUnsubscribe.length > 0) { window._liveListenerUnsubscribe.forEach(unsub => unsub()); window._liveListenerUnsubscribe = []; }
      
      const chatRef = currentChatContext.type === 'dm' ? ref(database, `dms/${currentChatContext.dmId}`) : messagesRef;

      const nowISO = new Date().toISOString(); const liveQ = query( chatRef, orderByChild('timestamp'), startAt(nowISO) );
      const unsubChildAdded = onChildAdded(liveQ, async snap => { 
          if (!isAuthenticated) return; const msg = snapToMsg(snap);
          await displayMessage(msg); 
          if (chatbox && chatbox.lastChild) chatbox.scrollTop = chatbox.scrollHeight;
      }, err => { console.error("Live listener error (onChildAdded):", err); });
      window._liveListenerUnsubscribe.push(unsubChildAdded);
      const unsubChildRemoved = onChildRemoved(chatRef, snap => {
          if (!isAuthenticated) return; displayedKeys.delete(snap.key);
          const messageElement = document.querySelector(`div[data-message-key="${snap.key}"]`);
          if (messageElement) { messageElement.remove(); } 
      }, err => { console.error("Live listener error (onChildRemoved):", err); });
      window._liveListenerUnsubscribe.push(unsubChildRemoved);
  };

  if(chatbox) chatbox.addEventListener('scroll', async () => { 
    if (!isAuthenticated || chatbox.scrollTop !== 0 || !oldestTimestamp) return;

    const chatRef = currentChatContext.type === 'dm' ? ref(database, `dms/${currentChatContext.dmId}`) : messagesRef;

    const oldQ = query( chatRef, orderByChild('timestamp'), endBefore(oldestTimestamp), limitToLast(30) );
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
    if (!isAuthenticated) { showCustomAlert("You must be authenticated to send messages.", 'Authentication Required'); return; }
    const content = messageInput.value.trim(); if (!userName) { return showCustomAlert("Error: User name not set.", 'Error'); }
    if (!content) { return showCustomAlert("Please enter a message or image URL.", 'No Message'); }
    let messageData;
    if (isSendingImage) { messageData = { name: userName, type: 'image', imageUrl: content, timestamp: new Date().toISOString() };
    } else { messageData = { name: userName, type: 'text', text: content, timestamp: new Date().toISOString() }; }
    
    const chatRef = currentChatContext.type === 'dm' ? ref(database, `dms/${currentChatContext.dmId}`) : messagesRef;
    
    push(chatRef, messageData).then(() => {
      messageInput.value = '';
      if (isSendingImage && imageUrlButton) { isSendingImage = false; messageInput.placeholder = "Enter message"; imageUrlButton.innerHTML = '🔗'; imageUrlButton.title = "Send Image from URL"; }
    }).catch(err => { console.error("Push error:", err); showCustomAlert("Error sending message. Please try again.", 'Send Error'); });
  };

  if(sendButton) sendButton.addEventListener('click', sendMessage);
  if(messageInput) messageInput.addEventListener('keypress', e => { if (e.key === 'Enter'||e.keyCode===13) { e.preventDefault(); sendMessage(); }});

  async function initializeAppAsync() { 
    const storedUserName = localStorage.getItem(localStorageNameKey); const sessionInitiallyActive = localStorage.getItem(localStorageAuthKey) === 'true';
    if (storedUserName) { if(nameInput) nameInput.value = storedUserName; userName = storedUserName;
        if (sessionInitiallyActive) { const sanitizedName = sanitizeFirebaseKey(storedUserName); const userCredRef = ref(database, `user_credentials/${sanitizedName}`);
            try { const snapshot = await get(userCredRef);
                if (snapshot.exists()) { isAuthenticated = true; }
                else { showCustomAlert(`User "${storedUserName}" from your previous session was not found. Please log in or register again.`, 'Session Expired'); localStorage.removeItem(localStorageNameKey); localStorage.removeItem(localStorageAuthKey); userName = null; isAuthenticated = false; if(nameInput) nameInput.value = '';}
            } catch (dbError) { console.error("Error checking user credentials during session validation:", dbError); showCustomAlert("Error validating session. Please try logging in.", 'Session Error'); localStorage.removeItem(localStorageAuthKey); isAuthenticated = false; }
        } else { isAuthenticated = false; }
    } else { userName = null; isAuthenticated = false; if(nameInput) nameInput.value = ''; }
    
    const savedContext = sessionStorage.getItem(sessionChatContextKey);
    if (isAuthenticated && savedContext) {
        try {
            currentChatContext = JSON.parse(savedContext);
        } catch (e) {
            console.warn("Could not parse saved chat context, defaulting to global.", e);
            currentChatContext = { type: 'global' };
        }
    } else {
        currentChatContext = { type: 'global' };
    }

    if (isAuthenticated && currentChatContext.type === 'dm') {
      const sanitizedCurrentUser = sanitizeFirebaseKey(userName);
      const participants = currentChatContext.dmId.split('_');
      if (!participants.includes(sanitizedCurrentUser)) {
          console.warn(`Attempted to access unauthorized DM (${currentChatContext.dmId}). Reverting to global chat.`);
          currentChatContext = { type: 'global' };
          sessionStorage.setItem(sessionChatContextKey, JSON.stringify(currentChatContext));
      }
    }

    updateChatHeader();
    updateUIBasedOnAuthState(); updateBioCharCount();
  }

  initializeAppAsync();

} catch (error) {
  console.error("Initialization error:", error);
  const authStatusDiv = document.getElementById('auth-status');
  if (authStatusDiv) { authStatusDiv.textContent = "Error initializing application. Check console."; authStatusDiv.style.color = "red"; }
  else { alert("Error initializing application. Check console."); }
}