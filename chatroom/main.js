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
  onDisconnect,
  onValue,
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

const SUPABASE_URL = "https://fegozfcnrfwabapgfxxy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlZ296ZmNucmZ3YWJhcGdmeHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjcxNDksImV4cCI6MjA3MzY0MzE0OX0.awrBnLpskHP2Q9k5nmPH2_8fzBvxwvDUyV2fLRBrW68";
const BUCKET = "pfps"; // A dedicated bucket for chat profile pictures
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// For the migration button - add this after your other element selectors
const migratePfpsBtn = document.getElementById('migrate-pfps-btn');

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

  // --- START: Favicon Notification Code ---
  let originalFaviconUrl = null;
  let isFaviconNotified = false;
  const faviconLink = document.querySelector("link[rel~='icon']");
  if (faviconLink) {
    originalFaviconUrl = faviconLink.href;
  }

  function drawFaviconWithDot() {
    if (!originalFaviconUrl || isFaviconNotified || !faviconLink) return;

    const img = new Image();
    img.src = originalFaviconUrl;
    img.crossOrigin = 'anonymous'; 

    img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = img.width || 32;
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');

        context.drawImage(img, 0, 0, size, size);

        const dotRadius = size * 0.25;
        const dotX = size - dotRadius;
        const dotY = size - dotRadius;
        context.beginPath();
        context.arc(dotX, dotY, dotRadius, 0, 2 * Math.PI, false);
        context.fillStyle = '#ff0000';
        context.fill();

        faviconLink.href = canvas.toDataURL('image/png');
        isFaviconNotified = true;
    };
    img.onerror = () => {
        console.warn("Could not load favicon to draw notification dot.");
    };
  }

  function resetFavicon() {
      if (originalFaviconUrl && isFaviconNotified && faviconLink) {
          faviconLink.href = originalFaviconUrl;
          isFaviconNotified = false;
      }
  }

  window.addEventListener('focus', resetFavicon);
  // --- END: Favicon Notification Code ---

  function showCustomAlert(message, title = 'Alert') {
    if (alertMessage && alertTitle && customAlertModal) {
      alertMessage.textContent = message;
      alertTitle.textContent = title;
      customAlertModal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      
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
        
        if (promptInput) promptInput.focus();
        
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

  if (alertOkButton) alertOkButton.addEventListener('click', hideCustomAlert);
  if (alertCloseButton) alertCloseButton.addEventListener('click', hideCustomAlert);
  if (customAlertModal) customAlertModal.addEventListener('click', (event) => {
    if (event.target === customAlertModal) hideCustomAlert();
  });

  const localStorageNameKey = 'chatUserName';
  const localStorageAuthKey = 'chatUserAuthenticated';
  const sessionChatContextKey = 'chatSessionContext';
  let userName = null;
  let userStatusRef = null;
  let isAuthenticated = false;
  let selectedPfpFile = null;
  const pfpCache = new Map();

  const saveProfileButton = document.getElementById('save-profile-button');

  async function resizeAndGetBlob(file) {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            return reject(new Error('File is not an image.'));
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
                canvas.toBlob(blob => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Canvas to Blob conversion failed.'));
                    }
                }, 'image/png', 0.9);
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

  async function loadCurrentUserPfp() {
    if (!isAuthenticated || !userName || !currentUserPfpImg) return;
    
    const pfpData = await getPfpDataForUser(userName);

    currentUserPfpImg.src = pfpData;
    if (pfpPreviewImg) pfpPreviewImg.src = pfpData;
  }

  async function getPfpDataForUser(userNameForPfp) {
      if (!userNameForPfp) return generateDefaultPfpDataUrl('unknown');
      
      // Use in-memory session cache
      if (pfpCache.has(userNameForPfp)) {
          return pfpCache.get(userNameForPfp);
      }

      const sanitizedName = sanitizeFirebaseKey(userNameForPfp);
      const userCredRef = ref(database, `user_credentials/${sanitizedName}`);
      const defaultPfp = generateDefaultPfpDataUrl(userNameForPfp);

      try {
          const snapshot = await get(userCredRef);
          if (snapshot.exists()) {
              const userData = snapshot.val();
              // Prioritize new URL, fallback to old Base64, then to default
              const pfpData = userData.pfpUrl || userData.pfpBase64 || defaultPfp;
              pfpCache.set(userNameForPfp, pfpData);
              return pfpData;
          } else {
              // User not found in credentials, use default
              pfpCache.set(userNameForPfp, defaultPfp);
              return defaultPfp;
          }
      } catch (error) {
          console.warn(`Could not fetch PFP for ${userNameForPfp}:`, error);
          pfpCache.set(userNameForPfp, defaultPfp); // Cache default on error
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
        const snapshot = await get(userCredRef);
        const currentData = snapshot.exists() ? snapshot.val() : {};

        const updateData = {
            ...currentData,
            bio: bioText,
            pronouns: pronounsText
        };

        if (selectedPfpFile) {
            try {
                const imageBlob = await resizeAndGetBlob(selectedPfpFile);
                // Use a consistent filename to prevent clutter in your bucket
                const fileName = `${sanitizedName}.png`; 
                
                const { error } = await supabase.storage.from(BUCKET).upload(fileName, imageBlob, {
                    contentType: "image/png",
                    upsert: true // This will overwrite the user's existing PFP
                });
                if (error) throw error;

                const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
                if (!publicUrlData) throw new Error("Could not get public URL for the image.");

                updateData.pfpUrl = `${publicUrlData.publicUrl}?t=${new Date().getTime()}`; // Cache-busting
                delete updateData.pfpBase64; // IMPORTANT: Remove old Base64 data

                if (currentUserPfpImg) currentUserPfpImg.src = updateData.pfpUrl;
                pfpCache.set(userName, updateData.pfpUrl);
                updateDisplayedPfpsForUser(userName, updateData.pfpUrl);

            } catch (error) {
                console.error("Error processing profile picture:", error);
                showCustomAlert("Failed to process profile picture. Other changes were saved.", 'Update Error');
            }
        }

        await set(userCredRef, updateData);

        selectedPfpFile = null;
        if (pfpUploadInput) pfpUploadInput.value = '';
        if (pfpPreviewImg && updateData.pfpUrl) pfpPreviewImg.src = updateData.pfpUrl;

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
            
            if (userData.bio && userData.bio.trim() !== "") {
                modalBioText.textContent = userData.bio;
            } else {
                modalBioText.textContent = "No bio yet";
                modalBioText.className = 'empty-bio';
            }
            
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
          const usersSnapshot = await get(credentialsRef);
          if (!usersSnapshot.exists()) return;

          const users = usersSnapshot.val();
          const statusSnapshot = await get(ref(database, 'status'));
          const statuses = statusSnapshot.exists() ? statusSnapshot.val() : {};

          const userPromises = Object.keys(users).map(async (sanitizedName) => {
              const realName = sanitizedName.replace(/_/g, '.');
              if (realName === userName) return null;

              const userPfp = await getPfpDataForUser(realName);
              const userStatus = statuses[sanitizedName] || 'offline';
              
              return { name: realName, pfp: userPfp, sanitized: sanitizedName, status: userStatus };
          });

          const userList = (await Promise.all(userPromises)).filter(Boolean);

          userList.forEach(userData => {
              const userElement = document.createElement('div');
              userElement.classList.add('user-item');
              userElement.setAttribute('data-username', userData.sanitized); // Add attribute for real-time updates

              if (currentChatContext.type === 'dm' && currentChatContext.with === userData.name) {
                  userElement.classList.add('active');
              }

              const presenceIndicator = document.createElement('span');
              presenceIndicator.classList.add('presence-indicator', userData.status);

              const pfpImg = document.createElement('img');
              pfpImg.src = userData.pfp;
              pfpImg.alt = `${userData.name}'s PFP`;

              const nameSpan = document.createElement('span');
              nameSpan.textContent = userData.name;

              userElement.appendChild(presenceIndicator);
              userElement.appendChild(pfpImg);
              userElement.appendChild(nameSpan);

              userElement.addEventListener('click', () => {
                  startDirectMessage(userData.name);
                  closeNav();
              });
              dmUserList.appendChild(userElement);
          });
      } catch (error) {
          console.error("Error populating user list:", error);
          const errorItem = document.createElement('div');
          errorItem.textContent = 'Error loading users.';
          errorItem.classList.add('user-item');
          dmUserList.appendChild(errorItem);
      }
  }

  function startPresenceListener() {
      const statusRef = ref(database, 'status');
      onValue(statusRef, (snapshot) => {
          if (!snapshot.exists()) return;
          const statuses = snapshot.val();
          Object.entries(statuses).forEach(([sanitizedName, status]) => {
              const userElement = document.querySelector(`.user-item[data-username="${sanitizedName}"]`);
              if (userElement) {
                  const indicator = userElement.querySelector('.presence-indicator');
                  if (indicator) {
                      indicator.className = `presence-indicator ${status}`;
                  }
              }
          });
      });
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

  function showImageUploadModal() {
    return new Promise((resolve) => {
      const modal = document.getElementById('image-upload-modal');
      const closeBtn = document.getElementById('image-upload-close-btn');
      const cancelBtn = document.getElementById('image-upload-cancel-btn');
      const sendBtn = document.getElementById('image-upload-send-btn');
      
      const uploadArea = document.getElementById('image-upload-area');
      const fileInput = document.getElementById('image-file-input');
      const previewContainer = document.getElementById('image-preview-container');
      const urlInput = document.getElementById('image-url-input');
      
      const tabs = document.querySelectorAll('#image-upload-modal .tab-button');
      const tabContents = document.querySelectorAll('#image-upload-modal .tab-content');

      let activeTab = 'upload-tab';
      let imageData = null;

      function resetModal() {
        fileInput.value = '';
        urlInput.value = '';
        previewContainer.innerHTML = '';
        sendBtn.disabled = true;
        imageData = null;
      }

      function hideModal(valueToResolve) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
        resolve(valueToResolve);
      }

      // --- Event Listeners for the Modal ---

      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          tabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          activeTab = tab.dataset.tab;
          
          tabContents.forEach(content => {
            content.classList.remove('active');
            if (content.id === activeTab) {
              content.classList.add('active');
            }
          });
          // Re-validate when switching tabs
          if (activeTab === 'url-tab') handleUrlInput();
          else handleFileChange();
        });
      });

      closeBtn.onclick = () => hideModal(null);
      cancelBtn.onclick = () => hideModal(null);
      sendBtn.onclick = () => hideModal(imageData);
      modal.onclick = (event) => { if (event.target === modal) hideModal(null); };

      // --- File Upload Logic ---
      async function handleFileChange() {
        const file = fileInput.files[0];
        if (!file) {
          imageData = null;
          sendBtn.disabled = true;
          return;
        }
        previewContainer.innerHTML = `<p>Processing image...</p>`;
        try {
          const resizedDataUrl = await resizeImageForSending(file);
          imageData = resizedDataUrl;
          previewContainer.innerHTML = `<img src="${resizedDataUrl}" alt="Preview"><p>Resized to fit chat.</p>`;
          sendBtn.disabled = false;
        } catch (error) {
          console.error("Image processing error:", error);
          previewContainer.innerHTML = `<p style="color:red;">Error: ${error.message}</p>`;
          imageData = null;
          sendBtn.disabled = true;
        }
      }
      fileInput.onchange = handleFileChange;
      
      // Drag and Drop Logic
      uploadArea.ondragover = (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); };
      uploadArea.ondragleave = () => uploadArea.classList.remove('dragover');
      uploadArea.ondrop = (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
          fileInput.files = files; // Assign dropped file to the input
          handleFileChange(); // Trigger the handler
        }
      };
      
      // --- URL Link Logic ---
      async function handleUrlInput() {
        const url = urlInput.value.trim();
        if (!url) {
          imageData = null;
          sendBtn.disabled = true;
          return;
        }
        const isValid = await isValidImageUrl(url);
        if (isValid) {
          imageData = url;
          sendBtn.disabled = false;
        } else {
          imageData = null;
          sendBtn.disabled = true;
        }
      }
      urlInput.oninput = handleUrlInput;
      
      // --- Show the Modal ---
      resetModal();
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    });
  }

  async function resizeImageForSending(file) {
    const MAX_WIDTH = 512;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          if (img.width <= MAX_WIDTH) {
            // If the image is already small enough, just return the original file data
            return resolve(e.target.result);
          }
          
          // Calculate new height to maintain aspect ratio
          const aspectRatio = img.height / img.width;
          const newHeight = Math.round(MAX_WIDTH * aspectRatio);
          
          const canvas = document.createElement('canvas');
          canvas.width = MAX_WIDTH;
          canvas.height = newHeight;
          const ctx = canvas.getContext('2d');
          
          // Draw the resized image onto the canvas
          ctx.drawImage(img, 0, 0, MAX_WIDTH, newHeight);
          
          // Convert canvas to Base64 Data URL and resolve the promise
          resolve(canvas.toDataURL(file.type, 0.9)); // 0.9 quality
        };
        img.onerror = (err) => reject(new Error("Image could not be loaded."));
        img.src = e.target.result;
      };
      reader.onerror = (err) => reject(new Error("File could not be read."));
      reader.readAsDataURL(file);
    });
  }

  if (imageUrlButton) {
    imageUrlButton.addEventListener('click', async () => {
        if (!isAuthenticated) return;

        const imageUrl = await showImageUploadModal();

        if (imageUrl) {
            messageInput.value = imageUrl;
            // The isSendingImage flag tells sendMessage to treat the content as an image
            isSendingImage = true; 
            sendMessage();
        }
    });
  }

  async function isValidImageUrl(url) {
    return new Promise((resolve) => {
        if (!url || typeof url !== 'string') { resolve(false); return; }
        const trimmedUrl = url.trim();
        if (!trimmedUrl.match(/^(https?:\/\/[^\s/$.?#].[^\s]*\.(jpe?g|png|gif|webp)(\?[^\s]*)?$)|(^data:image\/(jpeg|png|gif|webp);base64,)/i)) { resolve(false); return; }
        const img = new Image(); img.onload = () => resolve(true); img.onerror = () => resolve(false); img.src = trimmedUrl;
    });
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
      startPresenceListener();
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

  function manageUserPresence(sanitizedName) {
    const userStatusRef = ref(database, `status/${sanitizedName}`);

    // Set the user's status to 'online' when they connect
    set(userStatusRef, 'online');

    // Use onDisconnect to set their status to 'offline' when they close the browser
    onDisconnect(userStatusRef).set('offline');

    // Return the reference so we can manually set to 'offline' on logout
    return userStatusRef;
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
        if (inputHash === storedHash) { userName = enteredName; localStorage.setItem(localStorageNameKey, userName); localStorage.setItem(localStorageAuthKey, 'true'); isAuthenticated = true; userStatusRef = manageUserPresence(sanitizedName); showCustomAlert(`Login successful for ${userName}!`, 'Login Successful');
        } else { showCustomAlert("Incorrect password.", 'Login Failed'); isAuthenticated = false; localStorage.removeItem(localStorageAuthKey); }
      } else { 
        const newPassword = await showCustomPrompt(`User "${enteredName}" not found. Create a password to register:`, 'Create Password');
        if (!newPassword) return;
        const confirmPassword = await showCustomPrompt("Confirm your password:", 'Confirm Password');
        if (!confirmPassword) return;
        if (newPassword === confirmPassword) { const newHashedPassword = await hashPassword(newPassword);
          await set(userCredRef, { hashedPassword: newHashedPassword });
          userName = enteredName; localStorage.setItem(localStorageNameKey, userName); localStorage.setItem(localStorageAuthKey, 'true'); isAuthenticated = true; userStatusRef = manageUserPresence(sanitizedName); showCustomAlert(`User "${userName}" registered successfully!`, 'Registration Successful');
        } else { showCustomAlert("Passwords do not match. Registration failed.", 'Registration Failed'); isAuthenticated = false; localStorage.removeItem(localStorageAuthKey); }
      }
    } catch (error) { console.error("Authentication error:", error); showCustomAlert("An error occurred during authentication. Check console.", 'Authentication Error'); isAuthenticated = false; localStorage.removeItem(localStorageAuthKey); }
    updateUIBasedOnAuthState();
  }

  if(setNameButton) setNameButton.addEventListener('click', () => {
    if (isAuthenticated) { 
      userName = null; 
      isAuthenticated = false; 
      if (userStatusRef) set(userStatusRef, 'offline');
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

  function formatTimestamp(timestamp) {
    const now = new Date();
    const msgDate = new Date(timestamp);

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

    const timeFormat = { hour: 'numeric', minute: '2-digit' };
    const dateFormat = { month: '2-digit', day: '2-digit', year: 'numeric' };

    if (msgDate >= startOfToday) {
      // Today
      return `Today at ${msgDate.toLocaleTimeString([], timeFormat)}`;
    } else if (msgDate >= startOfYesterday) {
      // Yesterday
      return `Yesterday at ${msgDate.toLocaleTimeString([], timeFormat)}`;
    } else {
      // Older than yesterday
      const formattedDate = msgDate.toLocaleDateString([], dateFormat);
      const formattedTime = msgDate.toLocaleTimeString([], timeFormat);
      return `${formattedDate} ${formattedTime}`;
    }
  }

  const displayMessage = async (msg, { prepend = false } = {}) => {
      if (!isAuthenticated || !msg || !chatbox) return;
      if (displayedKeys.has(msg.key)) return;
      displayedKeys.add(msg.key);

      const ts = new Date(msg.timestamp);
      const formatted = formatTimestamp(msg.timestamp);

      let shouldGroupWithPrev = false;
      let shouldGroupWithNext = false;
      let nextMessage = null;
      let prevMessage = null;

      if (!prepend && chatbox.lastChild) {
          prevMessage = chatbox.lastChild;
          const prevMessageName = prevMessage.querySelector('.message-username')?.textContent;
          const prevMessageTime = new Date(prevMessage.getAttribute('data-timestamp'));
          const timeDiff = (ts - prevMessageTime) / 1000;
          
          shouldGroupWithPrev = prevMessageName === msg.name && timeDiff < 300;
      }

      if (prepend && chatbox.firstChild) {
          nextMessage = chatbox.firstChild;
          const nextMessageName = nextMessage.querySelector('.message-username')?.textContent;
          const nextMessageTime = new Date(nextMessage.getAttribute('data-timestamp'));
          const timeDiff = (nextMessageTime - ts) / 1000;
          
          shouldGroupWithNext = nextMessageName === msg.name && timeDiff < 300;
      }

      if (shouldGroupWithPrev) {
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
              // Use the new formatter function
              textSpan.innerHTML = formatMessageWithMentions(msg, userName);
              messageBody.appendChild(textSpan);
          }

          const timestampSpan = prevMessage.querySelector('.timestamp');
          if (timestampSpan) {
              timestampSpan.textContent = formatted;
          }
          prevMessage.setAttribute('data-timestamp', msg.timestamp);
          return;
      }

      if (shouldGroupWithNext) {
          const wrapper = document.createElement('div');
          wrapper.setAttribute('data-message-key', msg.key);
          wrapper.setAttribute('data-timestamp', msg.timestamp);
          const p = document.createElement('p');
          if (msg.name === userName) p.classList.add('same-sender');

          const pfpContainer = document.createElement('div');
          pfpContainer.classList.add('pfp-container');

          // 2. Create the PFP image
          const pfpImg = document.createElement('img');
          pfpImg.classList.add('message-pfp');
          pfpImg.src = await getPfpDataForUser(msg.name);
          pfpImg.setAttribute('data-pfp-for-user', msg.name);
          
          // 3. Get the user's status
          const sanitizedName = sanitizeFirebaseKey(msg.name);
          const statusRef = ref(database, `status/${sanitizedName}`);
          const statusSnapshot = await get(statusRef);
          const userStatus = statusSnapshot.exists() ? statusSnapshot.val() : 'offline';

          // 4. Create the indicator dot
          const presenceIndicator = document.createElement('span');
          presenceIndicator.classList.add('presence-indicator', userStatus);
          
          // 5. Append everything in the correct order
          pfpContainer.appendChild(pfpImg);
          pfpContainer.appendChild(presenceIndicator);
          p.appendChild(pfpContainer); // Add the container to the message

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

          chatbox.insertBefore(wrapper, nextMessage);

          const nextMessageBody = nextMessage.querySelector('.message-body');
          const currentMessageBody = wrapper.querySelector('.message-body');

          const newContentDiv = document.createElement('div');
          newContentDiv.innerHTML = currentMessageBody.innerHTML;
          
          nextMessageBody.insertBefore(newContentDiv, nextMessageBody.firstChild);

          const nextTimestampSpan = nextMessage.querySelector('.timestamp');
          if (nextTimestampSpan) {
              nextTimestampSpan.textContent = formatted;
          }
          nextMessage.setAttribute('data-timestamp', msg.timestamp);

          wrapper.remove();
          return;
      }

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

      const pfpContainer = document.createElement('div');
      pfpContainer.classList.add('pfp-container');

      // 2. Create the PFP image
      const pfpImg = document.createElement('img');
      pfpImg.classList.add('message-pfp');
      pfpImg.src = await getPfpDataForUser(msg.name);
      pfpImg.setAttribute('data-pfp-for-user', msg.name);
      
      // 3. Get the user's status
      const sanitizedName = sanitizeFirebaseKey(msg.name);
      const statusRef = ref(database, `status/${sanitizedName}`);
      const statusSnapshot = await get(statusRef);
      const userStatus = statusSnapshot.exists() ? statusSnapshot.val() : 'offline';

      // 4. Create the indicator dot
      const presenceIndicator = document.createElement('span');
      presenceIndicator.classList.add('presence-indicator', userStatus);
      
      // 5. Append everything in the correct order
      pfpContainer.appendChild(pfpImg);
      pfpContainer.appendChild(presenceIndicator);
      p.appendChild(pfpContainer); // Add the container to the message

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
          // --- START: THIS IS THE CORRECTED BLOCK ---
          const textSpan = document.createElement('span');
          // Use the formatter function that handles mentions
          textSpan.innerHTML = formatMessageWithMentions(msg, userName);
          messageBody.appendChild(textSpan);
          // --- END: THIS IS THE CORRECTED BLOCK ---
      }
      contentWrapper.appendChild(messageBody);

      p.appendChild(contentWrapper);
      wrapper.appendChild(p);

      if (prepend) chatbox.insertBefore(wrapper, chatbox.firstChild);
      else chatbox.appendChild(wrapper);
  };

  if (chatbox) {
    chatbox.addEventListener('click', (event) => {
        const target = event.target;
        if (target.classList.contains('mention') && target.dataset.mentionedUser) {
            event.stopPropagation(); // Prevent other click events from firing
            const mentionedUserName = target.dataset.mentionedUser;
            showBioModal(mentionedUserName);
        }
    });
  }

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
          if (!isAuthenticated) return; 
          const msg = snapToMsg(snap);

          // --- MODIFICATION: Trigger favicon notification ---
          if (document.hidden && msg.name !== userName) {
              drawFaviconWithDot();
          }

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

  function formatMessageWithMentions(msg, currentUserName) {
    if (!msg.text) return '';

    let formattedText = md.renderInline(msg.text); // Use markdown-it first

    if (msg.mentions && msg.mentions.length > 0) {
        msg.mentions.forEach(mentionedUser => {
            const mentionRegex = new RegExp(`@${mentionedUser}`, 'g');
            const isSelfMention = mentionedUser === currentUserName;
            const mentionClass = isSelfMention ? 'mention highlight' : 'mention';
            const replacement = `<span class="${mentionClass}" data-mentioned-user="${mentionedUser}">@${mentionedUser}</span>`;
            
            formattedText = formattedText.replace(mentionRegex, replacement);
        });
    }

    return formattedText;
  }

  const sendMessage = () => {
    if (!isAuthenticated) { showCustomAlert("You must be authenticated to send messages.", 'Authentication Required'); return; }
    const content = messageInput.value.trim(); if (!userName) { return showCustomAlert("Error: User name not set.", 'Error'); }
    if (!content) { return showCustomAlert("Please enter a message or image URL.", 'No Message'); }

    let messageData;
    const isBase64Image = content.startsWith('data:image');

    if (isSendingImage || isBase64Image) {
        messageData = { name: userName, type: 'image', imageUrl: content, timestamp: new Date().toISOString() };
    } else {
        // --- MENTION PARSING LOGIC ---
        const mentionRegex = /@([a-zA-Z0-9_.]+)/g;
        const mentions = [...content.matchAll(mentionRegex)].map(match => match[1]);
        
        messageData = { 
            name: userName, 
            type: 'text', 
            text: content, 
            timestamp: new Date().toISOString(),
            ...(mentions.length > 0 && { mentions: mentions }) // Add mentions array if any are found
        };
        // --- END MENTION LOGIC ---
    }
    
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
                if (snapshot.exists()) { isAuthenticated = true; userStatusRef = manageUserPresence(sanitizeFirebaseKey(storedUserName)); }
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