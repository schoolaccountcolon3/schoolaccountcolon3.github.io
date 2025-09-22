import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
import { getDatabase, ref, get, set, push, serverTimestamp, query, orderByChild, limitToLast, onChildAdded, onChildRemoved, remove } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAvQ8uDrpWsRkpnba2khTuIBZeFWB0fHEw",
    authDomain: "school-chatroom-b93a4.firebaseapp.com",
    databaseURL: "https://school-chatroom-b93a4-default-rtdb.firebaseio.com/",
    projectId: "school-chatroom-b93a4",
    storageBucket: "school-chatroom-b93a4.firebasestorage.app",
    messagingSenderId: "172550937165",
    appId: "1:172550937165:web:6e0fed43716495c0531a04",
};
const app = initializeApp(firebaseConfig), database = getDatabase(app);

const SUPABASE_URL = "https://fegozfcnrfwabapgfxxy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlZ296ZmNucmZ3YWJhcGdmeHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjcxNDksImV4cCI6MjA3MzY0MzE0OX0.awrBnLpskHP2Q9k5nmPH2_8fzBvxwvDUyV2fLRBrW68";
const BUCKET = "forum-images";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const nameAuthArea = document.getElementById("name-auth-area"),
    createPostBtn = document.getElementById("create-post-btn"),
    postCreatorSection = document.getElementById("post-creator"),
    postForm = document.getElementById("post-form"),
    blogGrid = document.getElementById("blog-grid"),
    postModal = document.getElementById("postModal"),
    modalContent = document.getElementById("modal-body-content"),
    fileInput = document.getElementById("file-input"),
    imagePreviewContainer = document.getElementById("image-preview-container"),
    uploadProgress = document.getElementById("upload-progress"),
    imageLightboxModal = document.getElementById("image-lightbox-modal"),
    lightboxImage = document.getElementById("lightbox-image"),
    lightboxCloseButton = document.getElementById("lightbox-close-button");

const LS_USERNAME_KEY = "blogUsername", LS_AUTH_KEY = "blogUserAuthenticated";
let userName = null, isAuthenticated = false, posts = [], attachedImageUrl = null;

const sanitizeFirebaseKey = (k) => k.replace(/[.#$[\]]/g, "_");
async function hashPassword(p) {
    const d = new TextEncoder().encode(p), h = await crypto.subtle.digest("SHA-256", d);
    return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
const alertModal = document.getElementById("custom-alert-modal"), promptModal = document.getElementById("custom-prompt-modal");
function showCustomAlert(m, t = "Alert") {
    alertModal.querySelector("#alert-title").textContent = t;
    alertModal.querySelector("#alert-message").textContent = m;
    alertModal.style.display = "flex";
    const c = () => (alertModal.style.display = "none");
    alertModal.querySelector("#alert-ok-button").onclick = c;
    alertModal.querySelector("#alert-close-button").onclick = c;
}
function showCustomPrompt(m, t = "Input Required") {
    return new Promise((r) => {
        promptModal.querySelector("#prompt-title").textContent = t;
        promptModal.querySelector("#prompt-message").textContent = m;
        const i = promptModal.querySelector("#prompt-input");
        i.value = "";
        promptModal.style.display = "flex";
        i.focus();
        const c = (v) => { promptModal.style.display = "none"; r(v); };
        promptModal.querySelector("#prompt-ok-button").onclick = () => c(i.value);
        promptModal.querySelector("#prompt-cancel-button").onclick = () => c(null);
        promptModal.querySelector("#prompt-close-button").onclick = () => c(null);
    });
}

async function handleAuthentication() {
    const n = document.getElementById("name").value.trim();
    if (!n) return showCustomAlert("Please enter a name.", "Input Required");
    const s = sanitizeFirebaseKey(n), u = ref(database, `user_credentials/${s}`);
    try {
        const d = await get(u);
        if (d.exists()) {
            const p = await showCustomPrompt(`User "${n}" exists. Enter password:`, "Login");
            if (p === null) return;
            if ((await hashPassword(p)) === d.val().hashedPassword) {
                userName = n; isAuthenticated = true; showCustomAlert(`Login successful!`, "Success");
            } else { showCustomAlert("Incorrect password.", "Login Failed"); }
        } else {
            const p1 = await showCustomPrompt(`User "${n}" not found. Create a password:`, "Register");
            if (p1 === null || p1.length < 4) return p1 !== null && showCustomAlert("Password must be at least 4 characters.");
            const p2 = await showCustomPrompt("Confirm your password:", "Confirm");
            if (p2 === null) return;
            if (p1 === p2) {
                await set(u, { hashedPassword: await hashPassword(p1) });
                userName = n; isAuthenticated = true; showCustomAlert(`User "${n}" registered!`, "Success");
            } else { showCustomAlert("Passwords do not match.", "Registration Failed"); }
        }
    } catch (e) { console.error(e); showCustomAlert("An error occurred. Check console.", "Error"); }
    if (isAuthenticated) {
        localStorage.setItem(LS_USERNAME_KEY, userName);
        localStorage.setItem(LS_AUTH_KEY, "true");
    } else { localStorage.removeItem(LS_AUTH_KEY); }
    updateUserUI();
}
function updateUserUI() {
    nameAuthArea.innerHTML = "";
    if (isAuthenticated && userName) {
        nameAuthArea.innerHTML = `<div id="auth-status" style="text-align:center; font-weight:bold; margin-bottom: 15px;">Authenticated as ${userName}</div>`;
        createPostBtn.style.display = "block";
        postCreatorSection.style.display = "none";
    } else {
        nameAuthArea.innerHTML = `<div id="auth-status" style="margin-bottom: 10px; font-weight: bold;">Please log in or register to post.</div><div id="name-input-group"><input type="text" id="name" placeholder="Enter your name"><button id="auth-btn" class="button-16" style="margin:0;">Continue</button></div>`;
        createPostBtn.style.display = "none";
        postCreatorSection.style.display = "none";
        document.getElementById("auth-btn").addEventListener("click", handleAuthentication);
    }
}

async function resizeImage(file, maxWidth = 800, maxHeight = 800) {
    return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxWidth) { height *= maxWidth / width; width = maxWidth; } 
        else if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(blob => resolve(blob), "image/jpeg", 0.85);
    };
    img.src = URL.createObjectURL(file);
    });
}

async function handleImageUpload(file) {
    if (!file) return;
    imagePreviewContainer.innerHTML = `<img id="image-preview" src="${URL.createObjectURL(file)}" alt="Image preview">`;
    uploadProgress.style.display = 'block'; uploadProgress.value = 0;
    try {
        const blob = await resizeImage(file);
        const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const { error } = await supabase.storage.from(BUCKET).upload(fileName, blob, { contentType: "image/jpeg", upsert: false });
        if (error) throw error;
        const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
        if(!publicUrlData) throw new Error("Could not get public URL.");
        attachedImageUrl = publicUrlData.publicUrl;
        uploadProgress.value = 100;
        showCustomAlert("Image uploaded successfully!", "Success");
    } catch (error) {
        console.error("Upload failed:", error);
        showCustomAlert("Upload failed: " + error.message, "Error");
        imagePreviewContainer.innerHTML = ''; uploadProgress.style.display = 'none'; attachedImageUrl = null;
    }
}

function openImageLightbox(imageUrl) {
    if (!imageLightboxModal || !lightboxImage) return;
    lightboxImage.src = imageUrl;
    imageLightboxModal.style.display = 'flex';
}

function closeImageLightbox() {
    if (!imageLightboxModal) return;
    imageLightboxModal.style.display = 'none';
}

fileInput.addEventListener('change', (e) => { if(e.target.files[0]) handleImageUpload(e.target.files[0]); });
lightboxCloseButton.addEventListener('click', closeImageLightbox);
imageLightboxModal.addEventListener('click', (e) => { if (e.target === imageLightboxModal) closeImageLightbox(); });

postModal.addEventListener('click', (e) => {
    if (e.target && e.target.classList.contains('enlargeable-image')) {
        openImageLightbox(e.target.src);
    }
});

const blogsRef = ref(database, "blogs");

const renderPosts = () => {
    blogGrid.innerHTML = "";
    if (posts.length === 0) {
        blogGrid.innerHTML = '<p style="color: var(--color-fg-muted);">No posts yet. Login and be the first to create one!</p>';
        return;
    }
    posts.sort((a, b) => b.timestamp - a.timestamp).forEach((p) => {
        const excerpt = p.content.substring(0, 100).split(" ").slice(0, -1).join(" ") + "...";
        const imageHtml = p.imageUrl ? `<img src="${p.imageUrl}" alt="${p.title}" class="post-image">` : '';
        const deleteBtnHtml = (isAuthenticated && p.author === userName) ? `<button class="delete-post-btn" data-post-id="${p.id}">Delete</button>` : '';
        blogGrid.innerHTML += `<article class="post-preview" data-post-id="${p.id}"><h3>${p.title}</h3><div class="post-meta">By ${p.author} on ${new Date(p.timestamp).toLocaleDateString()}</div><p>${excerpt.replace(/<[^>]*>?/gm,"")}</p>${imageHtml}${deleteBtnHtml}</article>`;
    });
};

postForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newPost = { 
        title: postForm.querySelector("#post-title").value.trim(), 
        content: postForm.querySelector("#post-content").value.trim(), 
        author: userName, 
        timestamp: serverTimestamp(),
        imageUrl: attachedImageUrl
    };
    if (newPost.title && newPost.content) {
        try {
            await push(blogsRef, newPost);
            postForm.reset();
            imagePreviewContainer.innerHTML = '';
            uploadProgress.style.display = 'none';
            attachedImageUrl = null;
            postCreatorSection.style.display = "none";
        } catch (error) {
            console.error("Error posting to Firebase:", error);
            showCustomAlert("Could not save post. Please try again." + error);
        }
    } else { showCustomAlert("Please fill out all fields."); }
});

async function fetchInitialPosts() {
    const initialQuery = query(blogsRef, orderByChild("timestamp"), limitToLast(20));
    try {
        const snapshot = await get(initialQuery);
        if (snapshot.exists()) {
            const data = snapshot.val();
            posts = Object.keys(data).map((key) => ({ id: key, ...data[key] }));
        } else { posts = []; }
        renderPosts();
    } catch (error) {
        console.error("Error fetching initial posts:", error);
        blogGrid.innerHTML = '<p style="color:red;">Could not load posts from the database.</p>' + error;
    }
    startLiveListeners();
}

function startLiveListeners() {
    onChildAdded(blogsRef, (snapshot) => {
        const newPost = { id: snapshot.key, ...snapshot.val() };
        if (!posts.some((p) => p.id === newPost.id)) {
            posts.push(newPost);
            renderPosts();
        }
    });
    onChildRemoved(blogsRef, (snapshot) => {
        posts = posts.filter((p) => p.id !== snapshot.key);
        renderPosts();
    });
}

async function deletePost(postId) {
    if (!isAuthenticated) return showCustomAlert("You must be logged in to delete posts.", "Error");
    
    const postToDelete = posts.find(p => p.id === postId);
    if (!postToDelete || postToDelete.author !== userName) {
        return showCustomAlert("You can only delete your own posts.", "Permission Denied");
    }

    const confirmation = confirm("Are you sure you want to permanently delete this post?");
    if (confirmation) {
        try {
            await remove(ref(database, 'blogs/' + postId));
            showCustomAlert("Post deleted successfully.", "Success");
            if (postModal.style.display === "flex") closePostModal();
        } catch (error) {
            console.error("Error deleting post:", error);
            showCustomAlert("Failed to delete the post. Please try again.", "Error");
        }
    }
}

createPostBtn.addEventListener("click", () => (postCreatorSection.style.display = postCreatorSection.style.display === "block" ? "none" : "block"));

const openPostModal = (id) => {
    const postData = posts.find((p) => p.id === id);
    if (!postData) return;
    const postDate = new Date(postData.timestamp).toLocaleDateString();
    const imageHtml = postData.imageUrl ? `<img src="${postData.imageUrl}" alt="${postData.title}" class="post-image enlargeable-image" style="max-width: 400px; margin-bottom: 20px;">` : '';
    const deleteBtnHtml = (isAuthenticated && postData.author === userName) ? `<div class="post-modal-footer"><button class="delete-post-btn" data-post-id="${id}" style="position: static;">Delete Post</button></div>` : '';
    modalContent.innerHTML = `<span class="close-button">&times;</span><h2>${postData.title}</h2><div class="post-meta">By ${postData.author} on ${postDate}</div>${imageHtml}<p>${postData.content.replace(/\n/g, "</p><p>")}</p>${deleteBtnHtml}`;
    postModal.style.display = "flex";
    modalContent.querySelector(".close-button").addEventListener("click", closePostModal);
};

const closePostModal = () => (postModal.style.display = "none");

document.body.addEventListener("click", (e) => {
    if (e.target && e.target.classList.contains('delete-post-btn')) {
        e.stopPropagation();
        const postId = e.target.dataset.postId;
        deletePost(postId);
        return; 
    }
    
    const postPreview = e.target.closest(".post-preview");
    if (postPreview) {
        openPostModal(postPreview.dataset.postId);
    }
});

async function initializeAppAsync() {
    if (localStorage.getItem(LS_USERNAME_KEY) && localStorage.getItem(LS_AUTH_KEY) === "true") {
        userName = localStorage.getItem(LS_USERNAME_KEY);
        isAuthenticated = true;
    }
    updateUserUI();
    fetchInitialPosts();
}
initializeAppAsync();

particlesJS("particles-js", {
    particles: {
        number: { value: 80, density: { enable: true, value_area: 800 } },
        color: { value: "#ffffff" },
        shape: { type: "circle" },
        opacity: { value: 0.1, random: true, anim: { enable: true, speed: 1, opacity_min: 0.05, sync: false } },
        size: { value: 3, random: true },
        line_linked: { enable: true, distance: 150, color: "#ffffff", opacity: 0.1, width: 1 },
        move: { enable: true, speed: 1, direction: "none", random: true, straight: false, out_mode: "out", bounce: false },
    },
    interactivity: {
        detect_on: "canvas",
        events: { onhover: { enable: true, mode: "grab" }, onclick: { enable: true, mode: "push" }, resize: true },
        modes: { grab: { distance: 140, line_linked: { opacity: 0.2 } }, push: { particles_nb: 4 } },
    },
    retina_detect: true,
});