import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js";
import { getDatabase, ref, push, onChildAdded, get } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-database.js";

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

  let userName = "Anonymous";
  const localStorageNameKey = 'chatUserName';

  const nameInput = document.getElementById('name');
  const setNameButton = document.getElementById('set-name');
  const chatbox = document.getElementById('chatbox');
  const messageInput = document.getElementById('message');
  const sendButton = document.getElementById('send');

  const savedName = localStorage.getItem(localStorageNameKey);
  if (savedName) {
    userName = savedName;
    nameInput.value = savedName;
    setNameButton.textContent = "Change Name";
  } else {
    setNameButton.textContent = "Set Name";
  }

  setNameButton.addEventListener('click', () => {
    const enteredName = nameInput.value.trim();
    if (enteredName) {
      userName = enteredName;
      localStorage.setItem(localStorageNameKey, userName);
      setNameButton.textContent = "Change Name";
    } else {
      alert("Please enter a valid name.");
      localStorage.removeItem(localStorageNameKey);
      userName = "Anonymous";
      setNameButton.textContent = "Set Name";
    }
  });

  const displayMessage = (message) => {
  const messageElement = document.createElement('p');
  messageElement.textContent = `${message.name}: ${message.text}`;

  if (message.name === savedName) {
    messageElement.classList.add('same-sender');
  }

  chatbox.appendChild(messageElement);
  };

  

  const displayedMessageKeys = new Set(); // To track shown messages

  get(messagesRef).then((snapshot) => {
    if (snapshot.exists()) {
      const messages = snapshot.val();
      chatbox.innerHTML = '';

      Object.entries(messages).forEach(([key, msg]) => {
        displayMessage(msg);
        displayedMessageKeys.add(key);
      });

      chatbox.scrollTop = chatbox.scrollHeight;
    }

    onChildAdded(messagesRef, (snapshot) => {
      const newMessage = snapshot.val();
      const messageKey = snapshot.key;

      if (!displayedMessageKeys.has(messageKey)) {
        displayMessage(newMessage);
        displayedMessageKeys.add(messageKey);
        chatbox.scrollTop = chatbox.scrollHeight;
      }
    }, (error) => {
      console.error("Error listening for new child_added:", error);
    });

  }).catch((error) => {
    console.error("Error fetching initial messages:", error);
  });

  const sendMessage = () => {
    const messageText = messageInput.value.trim();
    if (userName !== "Anonymous" && messageText) {
      push(messagesRef, { name: userName, text: messageText })
        .then(() => {
          messageInput.value = '';
          chatbox.scrollTop = chatbox.scrollHeight;
        })
        .catch((error) => {
          console.error("Error pushing message:", error);
          alert("Error sending message. Please try again.");
        });
    } else if (userName === "Anonymous") {
      alert("Please set your name first.");
    } else {
      alert("Please enter a message to send.");
    }
  };

  sendButton.addEventListener('click', sendMessage);

  messageInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter' || event.keyCode === 13) {
      event.preventDefault();
      sendMessage();
    }
  });

} catch (error) {
  console.error("Error initializing Firebase or getting database:", error);
}