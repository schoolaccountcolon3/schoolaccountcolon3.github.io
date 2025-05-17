import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
import {
  getAuth
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js";
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
  get
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

  // DOM elements
  const nameInput     = document.getElementById('name');
  const setNameButton = document.getElementById('set-name');
  const chatbox       = document.getElementById('chatbox');
  const messageInput  = document.getElementById('message');
  const sendButton    = document.getElementById('send');

  // User name / persistence
  const localStorageNameKey = 'chatUserName';
  let userName = localStorage.getItem(localStorageNameKey) || "Anonymous";
  if (userName !== "Anonymous") {
    nameInput.value = userName;
    setNameButton.textContent = "Change Name";
  } else {
    setNameButton.textContent = "Set Name";
  }

  setNameButton.addEventListener('click', () => {
    const entered = nameInput.value.trim();
    if (entered) {
      userName = entered;
      localStorage.setItem(localStorageNameKey, userName);
      setNameButton.textContent = "Change Name";
      window.location.reload();
    } else {
      alert("Please enter a valid name.");
      localStorage.removeItem(localStorageNameKey);
      userName = "Anonymous";
      setNameButton.textContent = "Set Name";
    }
  });

  // Helpers
  let oldestTimestamp = null;
  const displayedKeys = new Set();

  // Convert snapshot to object
  const snapToMsg = snap => ({ key: snap.key, ...snap.val() });

  // Main display function; allow prepend for older messages
  const displayMessage = (msg, { prepend = false } = {}) => {
    if (displayedKeys.has(msg.key)) return;
    displayedKeys.add(msg.key);

    const wrapper = document.createElement('div');
    const p = document.createElement('p');

    const ts = new Date(msg.timestamp);
    const formatted = ts.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });

    if (msg.name === localStorage.getItem(localStorageNameKey)) {
      p.classList.add('same-sender');
    }

    // Spacer if more than 10 minutes since last
    if (window._lastTs) {
      const diffMin = (ts - window._lastTs) / 60000;
      if (diffMin > 10) {
        const hr = document.createElement('hr');
        hr.classList.add('message-spacer');
        wrapper.appendChild(hr);
      }
    }
    window._lastTs = ts;

    p.innerHTML = `
      <span class="message-text"><strong>${msg.name}:</strong> ${msg.text}</span>
      <span class="timestamp">${formatted}</span>
    `;
    wrapper.appendChild(p);

    if (prepend) {
      chatbox.insertBefore(wrapper, chatbox.firstChild);
    } else {
      chatbox.appendChild(wrapper);
    }
  };

  // Load the most recent 30 messages
  const loadRecent = async () => {
    const recentQ = query(
      messagesRef,
      orderByChild('timestamp'),
      limitToLast(30)
    );
    const snap = await get(recentQ);
    if (!snap.exists()) return;

    // Convert & sort ascending
    const arr = Object.entries(snap.val())
      .map(([key,val]) => ({ key, ...val }))
      .sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));

    chatbox.innerHTML = '';
    arr.forEach(m => displayMessage(m));
    chatbox.scrollTop = chatbox.scrollHeight;

    // Record the oldest timestamp
    oldestTimestamp = arr[0].timestamp;
  };

  // Listen for brand-new messages (timestamp ≥ now)
  const startLiveListener = () => {
    const nowISO = new Date().toISOString();
    const liveQ = query(
      messagesRef,
      orderByChild('timestamp'),
      startAt(nowISO)
    );
    onChildAdded(liveQ, snap => {
      const msg = snapToMsg(snap);
      displayMessage(msg);
      chatbox.scrollTop = chatbox.scrollHeight;
    }, err => {
      console.error("Live listener error:", err);
    });
  };

  // Infinite scroll—load older when scrolled to top
  chatbox.addEventListener('scroll', async () => {
    if (chatbox.scrollTop !== 0 || !oldestTimestamp) return;

    const oldQ = query(
      messagesRef,
      orderByChild('timestamp'),
      endBefore(oldestTimestamp),
      limitToLast(30)
    );
    const snap = await get(oldQ);
    if (!snap.exists()) return;

    const older = Object.entries(snap.val())
      .map(([key,val]) => ({ key, ...val }))
      .sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Save scroll position to restore later
    const beforeHeight = chatbox.scrollHeight;

    older.forEach(m => displayMessage(m, { prepend: true }));
    oldestTimestamp = older[0].timestamp;

    // Restore scroll so user stays “at” the same messages
    const afterHeight = chatbox.scrollHeight;
    chatbox.scrollTop = afterHeight - beforeHeight;
  });

  // Send logic
  const sendMessage = () => {
    const text = messageInput.value.trim();
    if (userName === "Anonymous") {
      return alert("Please set your name first.");
    }
    if (!text) {
      return alert("Please enter a message to send.");
    }
    push(messagesRef, {
      name: userName,
      text,
      timestamp: new Date().toISOString()
    })
    .then(() => {
      messageInput.value = '';
      chatbox.scrollTop = chatbox.scrollHeight;
    })
    .catch(err => {
      console.error("Push error:", err);
      alert("Error sending message. Please try again.");
    });
  };
  sendButton.addEventListener('click', sendMessage);
  messageInput.addEventListener('keypress', e => {
    if (e.key === 'Enter' || e.keyCode === 13) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Kick things off
  loadRecent();
  startLiveListener();

} catch (error) {
  console.error("Initialization error:", error);
}
