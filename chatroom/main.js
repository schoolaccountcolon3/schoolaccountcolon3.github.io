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

// Initialize Firebase
try {
  const app = initializeApp(firebaseConfig);
  const database = getDatabase(app);
  const messagesRef = ref(database, 'messages');

  let userName = "Anonymous"; // Default name
  const localStorageNameKey = 'chatUserName'; // Key for localStorage

  // Get elements
  const nameInput = document.getElementById('name');
  const setNameButton = document.getElementById('set-name');
  const chatbox = document.getElementById('chatbox');
  const messageInput = document.getElementById('message');
  const sendButton = document.getElementById('send');

  // --- Load name from localStorage on page load ---
  const savedName = localStorage.getItem(localStorageNameKey);
  if (savedName) {
    userName = savedName;
    nameInput.value = savedName;
    setNameButton.textContent = "Change Name"; // Change button text
  } else {
      setNameButton.textContent = "Set Name"; // Ensure correct initial text
  }
  // --- End Load name ---


  // Set name event listener
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


  // --- Display messages (Initial Load and New Messages) ---

  // Function to display a single message
  const displayMessage = (message) => {
    const messageElement = document.createElement('p');
    messageElement.textContent = `${message.name}: ${message.text}`;
    chatbox.appendChild(messageElement);
  };

  // Fetch initial messages and then listen for new ones
  get(messagesRef).then((snapshot) => {
    if (snapshot.exists()) {
      const messages = Object.values(snapshot.val()).sort((a, b) => {
           // Assuming keys are timestamp-based push IDs, comparing the raw objects should work for sorting
           // A more robust sort would compare timestamps if available, or parse the push ID
           // For simplicity with Firebase push IDs, direct comparison of the objects might approximate time
           // Alternatively, if messages contain a timestamp property:
           // return a.timestamp - b.timestamp;
           return 0; // Keep original order from Object.values as a fallback
      });

       chatbox.innerHTML = ''; // Clear chatbox before displaying initial messages


      messages.forEach(msg => displayMessage(msg));
       // Scroll to the bottom after displaying initial messages
       chatbox.scrollTop = chatbox.scrollHeight;


    }
    // Now, listen for new messages added *after* the initial load
    onChildAdded(messagesRef, (snapshot) => {
        const newMessage = snapshot.val();
        displayMessage(newMessage);
        chatbox.scrollTop = chatbox.scrollHeight;
    }, (error) => {
        console.error("Error listening for new child_added:", error);
    });

  }).catch((error) => {
    console.error("Error fetching initial messages:", error);
  });

  // --- End Display messages ---


  // Function to send a message (to avoid code duplication)
  const sendMessage = () => {
    const messageText = messageInput.value.trim(); // Trim whitespace
    if (userName !== "Anonymous" && messageText) { // Ensure name is set and message is not empty
      push(messagesRef, { name: userName, text: messageText })
        .then(() => {
          messageInput.value = ''; // Clear message input
          // Scroll to the bottom after sending a message
          chatbox.scrollTop = chatbox.scrollHeight;
        })
        .catch((error) => {
          console.error("Error pushing message:", error);
          alert("Error sending message. Please try again."); // Provide user feedback on error
        });
    } else if (userName === "Anonymous") {
      alert("Please set your name first.");
    } else {
      alert("Please enter a message to send.");
    }
  };


  // Send message button event listener
  sendButton.addEventListener('click', sendMessage);

  // Send message on Enter key press in message input
  messageInput.addEventListener('keypress', (event) => {
    // Check if the key pressed was the Enter key (key code 13 or key "Enter")
    if (event.key === 'Enter' || event.keyCode === 13) {
      event.preventDefault(); // Prevent the default form submission or newline
      sendMessage(); // Call the sendMessage function
    }
  });


} catch (error) {
  console.error("Error initializing Firebase or getting database:", error);
}
