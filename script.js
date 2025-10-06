// Base URL for your backend API
const API_BASE_URL = 'https://vaulttodo-backend.onrender.com/api';

// --- DOM Elements ---
const focusLoginContainer = document.getElementById('focus-login-container');
const loginWindow = document.getElementById('login-window');
const unlockButton = document.getElementById('unlock-button');
const loginFormWrapper = document.getElementById('login-form-wrapper');
const appLayout = document.getElementById('app-layout');

// Views within the Focus Window
const signinView = document.getElementById('signin-view');
const signupView = document.getElementById('signup-view');
const forgotPasswordView = document.getElementById('forgot-password-view');

// Messages
const signinMessage = document.getElementById('signin-message');
const signupMessage = document.getElementById('signup-message');
const forgotPasswordMessage = document.getElementById('forgot-password-message');

// Forms and Links
const signinForm = document.getElementById('signin-form');
const signupForm = document.getElementById('signup-form');
const forgotPasswordForm = document.getElementById('forgot-password-form');

const showSignup = document.getElementById('show-signup');
const showSignin = document.getElementById('show-signin');
const showForgotPasswordLink = document.getElementById('show-forgot-password');
const backToSigninLink = document.getElementById('back-to-signin');

// Main App Elements
const addTaskForm = document.getElementById('add-task-form');
const taskBoard = document.getElementById('task-board');
const logo = document.getElementById('logo');
// Removed old vaultModal/closeVaultModal IDs
const themeToggle = document.getElementById('theme-toggle');
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');
const copyrightYear = document.getElementById('copyright-year');
const taskSearchInput = document.getElementById('task-search');

// Sidebar navigation links
const dashboardLink = document.getElementById('dashboard-link');
const adminPanelLink = document.getElementById('admin-panel-link');
const showAdminPanelBtn = document.getElementById('show-admin-panel');

// Main content sections
const dashboardSection = document.getElementById('dashboard');
const adminDashboardSection = document.getElementById('admin-dashboard-section');

// Admin Dashboard elements
const adminUsersList = document.getElementById('admin-users-list');
const adminAllTasksList = document.getElementById('admin-all-tasks-list');


// Task Details Modal elements
const taskDetailsModal = document.getElementById('task-details-modal');
const modalCloseBtn = taskDetailsModal.querySelector('.close-button');
const modalTaskTitle = document.getElementById('modal-task-title');
const modalTaskStatus = document.getElementById('modal-task-status');
const modalTaskPriority = document.getElementById('modal-task-priority');
const modalTaskDueDate = document.getElementById('modal-task-due-date');
const modalTaskCreatedAt = document.getElementById('modal-task-created-at');
const modalTaskDescription = document.getElementById('modal-task-description');
const saveTaskDetailsBtn = document.getElementById('save-task-details-btn');
let currentTaskToEdit = null;

// Generic Modal elements (for alerts and confirmations)
const genericModal = document.getElementById('generic-modal');
const genericModalTitle = document.getElementById('generic-modal-title');
const genericModalMessage = document.getElementById('generic-modal-message');
const genericModalActions = document.getElementById('generic-modal-actions');
const genericModalCloseBtn = document.getElementById('generic-modal-close-btn');

// NEW: User Profile DOM Elements
const userMenuButton = document.getElementById('user-menu-button');
const userDropdownMenu = document.getElementById('user-dropdown-menu');
const userEmailDisplay = document.getElementById('user-email-display');
const profileLink = document.getElementById('profile-link');
const signoutLink = document.getElementById('signout-link');
const profilePage = document.getElementById('profile-page');
const profileForm = document.getElementById('profile-form');
const profileEmailInput = document.getElementById('profile-email');
const profileNameInput = document.getElementById('profile-name');
const profilePasswordInput = document.getElementById('profile-password');
const profileMessage = document.getElementById('profile-message');

// STANDARD File Storage DOM Elements (Used for explicit file page)
const fileStorageLink = document.getElementById('file-storage-link'); 
const fileStoragePage = document.getElementById('file-storage-page'); 
const fileUploadInput = document.getElementById('file-upload-input');
const triggerUploadBtn = document.getElementById('trigger-upload-btn');
const dropZone = document.getElementById('drop-zone');
const fileListDisplay = document.getElementById('file-list');
const storedFilesList = document.getElementById('stored-files-list');

// --- NEW SECRET VAULT ELEMENTS ---
const secretVaultModal = document.getElementById('secret-vault-modal');
const closeSecretVaultBtn = document.getElementById('close-secret-vault-btn');
const vaultAccessSetupView = document.getElementById('vault-access-setup-view');
const vaultAccessUnlockView = document.getElementById('vault-access-unlock-view');
const vaultStorageView = document.getElementById('vault-storage-view');
const vaultSetupForm = document.getElementById('vault-setup-form');
const vaultUnlockForm = document.getElementById('vault-unlock-form');
const vaultAccessMessage = document.getElementById('vault-access-message'); 
const vaultUnlockMessage = document.getElementById('vault-unlock-message'); 
const securityQuestionText = document.getElementById('security-question-text');
const vaultFileInput = document.getElementById('vault-secret-file-input');
const vaultTriggerUploadBtn = document.getElementById('vault-trigger-upload-btn');
const vaultDropZone = document.getElementById('vault-drop-zone');
const vaultFileListDisplay = document.getElementById('vault-file-list');
const vaultFilesUL = document.getElementById('vault-files-ul'); 

// Global state for Vault access
let vaultAccessKey = null; // Secret key held only upon successful unlock
let currentUserRole = 'user'; 
let storedFiles = []; 


// --- Helper Functions ---
// --- NEW VAULT SETUP AND UNLOCK LOGIC ---

/**
 * Handles the submission of the vault setup form.
 * Assumes fields: vault-key-new (for vaultKey) and vault-security-q (for securityQuestion).
 */
async function setupVault(e) {
    e.preventDefault();
    const token = localStorage.getItem('userToken');
    if (!token) return showLogin();

    const vaultKey = document.getElementById('vault-key-new').value;
    const securityQuestion = document.getElementById('vault-security-q').value;

    if (!vaultKey || !securityQuestion) {
        displayMessage(vaultAccessMessage, 'Key and Security Question cannot be empty.', 'error');
        return;
    }

    displayMessage(vaultAccessMessage, 'Setting up vault...', '');

    try {
        const response = await fetch(`${API_BASE_URL}/vault/setup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ vaultKey, securityQuestion })
        });

        const data = await response.json();

        if (response.ok) {
            // CRITICAL: Set the client-side key for the session
            vaultAccessKey = vaultKey;
            displayMessage(vaultAccessMessage, data.message || 'Vault setup complete! Unlocked for this session.', 'success');
            showVaultStorage();
        } else {
            displayMessage(vaultAccessMessage, data.error || 'Vault setup failed.', 'error');
        }
    } catch (error) {
        console.error('Vault setup error:', error);
        displayMessage(vaultAccessMessage, 'An API error occurred during setup.', 'error');
    }
}
// Function to check vault status (must be in global scope)
async function checkVaultAccessStatus() {
    const token = localStorage.getItem('userToken');
    if (!secretVaultModal || !token) {
        showLogin(); 
        return;
    }
    
    // Clear any existing key and show the modal
    vaultAccessKey = null; 
    secretVaultModal.classList.remove('hidden');

    try {
        // This is the fetch call that results in the 404 if the backend route is missing
        const response = await fetch(`${API_BASE_URL}/vault/status`, { 
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` } 
        });
        const data = await response.json();

        // Clear previous messages
        if (vaultAccessMessage) vaultAccessMessage.textContent = '';
        if (vaultUnlockMessage) vaultUnlockMessage.textContent = '';

        if (data.isSetup) {
            // Vault is set up, show the unlock view
            if(vaultAccessSetupView) vaultAccessSetupView.classList.add('hidden');
            if(vaultAccessUnlockView) vaultAccessUnlockView.classList.remove('hidden');
            if(vaultStorageView) vaultStorageView.classList.add('hidden');
            if (securityQuestionText) securityQuestionText.textContent = data.securityQuestion;
        } else {
            // Vault is not set up, show the setup view
            if(vaultAccessSetupView) vaultAccessSetupView.classList.remove('hidden');
            if(vaultAccessUnlockView) vaultAccessUnlockView.classList.add('hidden');
            if(vaultStorageView) vaultStorageView.classList.add('hidden');
        }
    } catch (error) {
        if (vaultAccessMessage) {
            vaultAccessMessage.textContent = 'API Error: Cannot check vault status.';
            vaultAccessMessage.className = 'message error';
        }
        console.error('Vault status check failed:', error);
    }
}
// You also need to ensure 'showVaultStorage', 'setupVault', and 'unlockVault' are defined globally.
/**
 * Handles the submission of the vault unlock form.
 * Assumes field: vault-key-unlock (for the key).
 */
async function unlockVault(e) {
    e.preventDefault();
    const token = localStorage.getItem('userToken');
    if (!token) return showLogin();

    const vaultKey = document.getElementById('vault-key-unlock').value;

    displayMessage(vaultUnlockMessage, 'Verifying key...', '');

    try {
        const response = await fetch(`${API_BASE_URL}/vault/unlock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ vaultKey })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // CRITICAL: Set the client-side key for the session
            vaultAccessKey = vaultKey;
            displayMessage(vaultUnlockMessage, 'Vault unlocked successfully! Access granted.', 'success');
            showVaultStorage();
        } else {
            vaultAccessKey = null; // Clear key on failure
            displayMessage(vaultUnlockMessage, data.error || 'Unlock failed. Invalid key.', 'error');
        }
    } catch (error) {
        console.error('Vault unlock error:', error);
        vaultAccessKey = null;
        displayMessage(vaultUnlockMessage, 'An API error occurred during unlock.', 'error');
    }
}

// -------------------------------------------------------------

// Function to decode JWT token
function decodeJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Error decoding JWT:', error);
        return null;
    }
}

// Displays a message on the UI (e.g., login errors, success messages)
function displayMessage(element, message, type) {
    element.textContent = message;
    element.className = `message ${type}`; 
}
/**
 * Function to show a specific page (dashboard, admin, profile, or file-storage)
 */
function showPage(pageId, activeLinkId) {
    const pages = [dashboardSection, adminDashboardSection, profilePage, fileStoragePage];
    const links = [dashboardLink, adminPanelLink, profileLink, fileStorageLink];

    // --- NEW LOGIC TO HIDE/SHOW SEARCH INPUT ---
    const searchContainer = taskSearchInput ? taskSearchInput.closest('.search-container') : null;
    
    if (pageId === 'dashboard') {
        if (searchContainer) searchContainer.classList.remove('hidden');
    } else {
        // Hide search input for Admin Panel, Profile, and File Storage
        if (searchContainer) searchContainer.classList.add('hidden');
    }
    // -------------------------------------------

    pages.forEach(page => {
        if (page && page.id === pageId) {
            page.classList.remove('hidden');
        } else if (page) {
            page.classList.add('hidden');
        }
    });

    links.forEach(link => {
        if (link) {
            const parentLi = link.closest('li');
            if (parentLi) {
                if (link.id === activeLinkId) {
                    parentLi.classList.add('active');
                } else {
                    parentLi.classList.remove('active');
                }
            } else if (link.id === activeLinkId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        }
    });

    if (adminPanelLink) {
        if (activeLinkId === 'admin-panel-link') {
            adminPanelLink.classList.add('active');
        } else {
            adminPanelLink.classList.remove('active');
        }
    }
}
// Controls UI visibility based on authentication state
function showLogin() {
    appLayout.classList.add('hidden');
    focusLoginContainer.classList.remove('hidden');
    loginWindow.classList.remove('success', 'expanded'); 
    loginFormWrapper.classList.add('collapsed');
    signinView.classList.remove('hidden');
    signupView.classList.add('hidden');
    forgotPasswordView.classList.add('hidden'); 
    displayMessage(signinMessage, '', ''); 
    displayMessage(signupMessage, '', '');
    displayMessage(forgotPasswordMessage, '', '');
    adminPanelLink.classList.add('hidden');
    currentUserRole = 'user'; 
}

// Shows the main application dashboard
function showApp() {
    focusLoginContainer.classList.add('hidden');
    appLayout.classList.remove('hidden');
    loginWindow.classList.remove('success');
}

/**
 * Function to show a specific page (dashboard, admin, profile, or file-storage)
 */
function showPage(pageId, activeLinkId) {
    const pages = [dashboardSection, adminDashboardSection, profilePage, fileStoragePage];
    const links = [dashboardLink, adminPanelLink, profileLink, fileStorageLink];

    pages.forEach(page => {
        if (page && page.id === pageId) {
            page.classList.remove('hidden');
        } else if (page) {
            page.classList.add('hidden');
        }
    });

    links.forEach(link => {
        if (link) {
            const parentLi = link.closest('li');
            if (parentLi) {
                if (link.id === activeLinkId) {
                    parentLi.classList.add('active');
                } else {
                    parentLi.classList.remove('active');
                }
            } else if (link.id === activeLinkId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        }
    });

    if (adminPanelLink) {
        if (activeLinkId === 'admin-panel-link') {
            adminPanelLink.classList.add('active');
        } else {
            adminPanelLink.classList.remove('active');
        }
    }
}


/**
 * Shows a generic modal for alerts or confirmations.
 */
function showGenericModal(title, message, buttonsConfig = [], onCloseCallback = () => {}) {
    genericModalTitle.textContent = title;
    genericModalMessage.textContent = message;
    genericModalActions.innerHTML = ''; 

    buttonsConfig.forEach(btn => {
        const button = document.createElement('button');
        button.textContent = btn.text;
        button.className = btn.className; 
        button.onclick = () => {
            hideGenericModal();
            if (btn.onClick) {
                btn.onClick();
            }
        };
        genericModalActions.appendChild(button);
    });

    genericModal.classList.remove('hidden');
    document.body.classList.add('modal-open');

    genericModal.onCloseCallback = onCloseCallback;
}

function hideGenericModal() {
    genericModal.classList.add('hidden');
    document.body.classList.remove('modal-open');
    if (genericModal.onCloseCallback) {
        genericModal.onCloseCallback();
        genericModal.onCloseCallback = null; 
    }
}

// Event listeners for generic modal close button and backdrop
if (genericModalCloseBtn) genericModalCloseBtn.addEventListener('click', hideGenericModal);
if (genericModal) {
    genericModal.addEventListener('click', (e) => {
        if (e.target === genericModal) {
            hideGenericModal();
        }
    });
}

// =========================================================================================
// === CORE FILE STORAGE FUNCTIONS (USED BY SIDEBAR LINK) ===
// =========================================================================================

/**
 * Fetches the list of stored files from the backend API.
 */
async function fetchStoredFiles() {
    if (!storedFilesList) return;
    const token = localStorage.getItem('userToken');
    if (!token) {
        storedFilesList.innerHTML = '<li class="placeholder-text">Please sign in to view files.</li>';
        return;
    }

    storedFilesList.innerHTML = '<li class="placeholder-text">Loading stored files...</li>';

    try {
        const response = await fetch(`${API_BASE_URL}/files`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` } 
        });

        if (response.ok) {
            const files = await response.json();
            storedFiles = files; 
            renderStoredFiles(files);
        } else {
            throw new Error(`Failed to fetch files. Status: ${response.status}`);
        }
    } catch (error) {
        console.error('Error fetching stored files:', error);
        storedFilesList.innerHTML = '<li class="placeholder-text error">Failed to load files. Check console for API errors.</li>';
    }
}

/**
 * Renders the "Your Stored Files" list.
 */
function renderStoredFiles(files) {
    if (!storedFilesList) return;

    storedFilesList.innerHTML = ''; 

    if (files.length === 0) {
        storedFilesList.innerHTML = '<li class="placeholder-text">No files currently stored.</li>';
        return;
    }

    files.forEach(file => {
        const filename = file.name;
        
        const li = document.createElement('li');
        li.style.borderBottom = '1px solid var(--border-color)';
        li.style.padding = '0.5rem 0';
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.alignItems = 'center';
        
        const fileSize = file.size ? (file.size / 1024).toFixed(2) : 'N/A';
        const uploadDate = file.uploadDate ? new Date(file.uploadDate).toLocaleDateString() : 'N/A';
        
        li.innerHTML = `
            <div>
                <strong>${filename}</strong> 
                <span style="font-size:0.8em; opacity:0.7;">(Uploaded: ${uploadDate} - ${fileSize} KB)</span>
            </div>
            <button class="delete-file-btn vault-btn secondary" data-file-id="${file._id}" style="padding: 0.2rem 0.5rem; background: var(--high-priority-color); color: white; margin-left: 10px;">Delete</button>
        `;
        storedFilesList.appendChild(li);
    });

    storedFilesList.querySelectorAll('.delete-file-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const fileIdToDelete = e.target.dataset.fileId;
            deleteStoredFile(fileIdToDelete); 
        });
    });
}

/**
 * Sends a DELETE request for a specific file.
 */
async function deleteStoredFile(fileId) {
    const token = localStorage.getItem('userToken');
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE_URL}/files/${fileId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            showGenericModal("Success", "File deleted successfully!", [{ text: "OK", className: "vault-btn primary" }]);
            fetchStoredFiles(); // Refresh the list
        } else {
            const errorData = await response.json();
             throw new Error(errorData.error || `Deletion failed with status: ${response.status}`);
        }
    } catch (error) {
        console.error('Error deleting file:', error);
        showGenericModal("Error", `Failed to delete file: ${error.message}`, [{ text: "OK", className: "vault-btn primary" }]);
    }
}




/**
 * Sends files to the backend server using FormData.
 */
async function uploadFiles(filesToUpload) {
    if (!triggerUploadBtn || filesToUpload.length === 0) return;
    const token = localStorage.getItem('userToken');
    if (!token) {
        showGenericModal("Authentication Error", "Please sign in to upload files.", [{ text: "OK", className: "vault-btn primary" }]);
        return;
    }

    // 1. Show Loading State
    const originalText = triggerUploadBtn.textContent;
    triggerUploadBtn.textContent = 'Uploading... Please wait.';
    triggerUploadBtn.disabled = true;

    const formData = new FormData();
    filesToUpload.forEach(file => {
        formData.append('files', file); 
    });

    try {
        const response = await fetch(`${API_BASE_URL}/files/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (response.ok) {
            await fetchStoredFiles(); 

            fileListDisplay.innerHTML = `<p style="color: var(--low-priority-color); font-weight: bold; margin: 0;">Upload Success! ${filesToUpload.length} file(s) saved.</p>`;
            
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || `Upload failed with status: ${response.status}`);
        }

    } catch (error) {
        console.error('File upload error:', error);
        fileListDisplay.innerHTML = `<p class="message error">Upload Failed: ${error.message}</p>`;
    } finally {
        triggerUploadBtn.textContent = originalText;
        triggerUploadBtn.disabled = false;
        if (fileUploadInput) fileUploadInput.value = null; 
    }
}
/**
 * Generic handler to visually update the UI with selected files
 * and trigger the upload for standard files.
 */
function handleFiles(files) {
    if (!triggerUploadBtn || files.length === 0) return;

    // Display selected files in the standard file list area
    if (fileListDisplay) {
        fileListDisplay.innerHTML = '';
        Array.from(files).forEach(file => {
            const p = document.createElement('p');
            p.textContent = `Selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
            fileListDisplay.appendChild(p);
        });
    }

    // Call the actual upload function
    uploadFiles(Array.from(files));
}




// --- 2. AUTHENTICATION LOGIC (MongoDB Backend) ---

// Checks if a user token exists in localStorage to determine login state
async function checkAuthStatus() {
    const token = localStorage.getItem('userToken');
    if (token) {
        const decodedToken = decodeJwt(token);
        if (decodedToken && decodedToken.role) {
            currentUserRole = decodedToken.role;
            if (currentUserRole === 'admin') {
                if (adminPanelLink) adminPanelLink.classList.remove('hidden');
            } else {
                if (adminPanelLink) adminPanelLink.classList.add('hidden');
            }
        }
        showApp();
        showPage('dashboard', 'dashboard-link'); 
        fetchTasks(); 
        fetchUserProfile();
    } else {
        showLogin();
    }
}

// Handles user sign-up - No automatic login
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        displayMessage(signupMessage, 'Registering...', '');
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;

        try {
            const response = await fetch(`${API_BASE_URL}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                displayMessage(signupMessage, data.message || 'Account created successfully! Please sign in.', 'success');
                signupView.classList.add('hidden');
                signinView.classList.remove('hidden');
                document.getElementById('signup-email').value = '';
                document.getElementById('signup-password').value = '';
            } else {
                displayMessage(signupMessage, data.error || 'Signup failed.', 'error');
            }
        } catch (error) {
            console.error('Signup fetch error:', error);
            displayMessage(signupMessage, 'An error occurred during signup. Please try again.', 'error');
        }
    });
}

// Handles user sign-in
if (signinForm) {
    signinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        displayMessage(signinMessage, 'Verifying...', '');
        const email = document.getElementById('signin-email').value;
        const password = document.getElementById('signin-password').value;

        try {
            const response = await fetch(`${API_BASE_URL}/auth/signin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('userToken', data.token); 
                const decodedToken = decodeJwt(data.token);
                if (decodedToken && decodedToken.role) {
                    currentUserRole = decodedToken.role;
                    if (currentUserRole === 'admin') {
                        if (adminPanelLink) adminPanelLink.classList.remove('hidden');
                    } else {
                        if (adminPanelLink) adminPanelLink.classList.add('hidden');
                    }
                }

                loginWindow.classList.add('success'); 
                setTimeout(() => {
                    showApp();
                    showPage('dashboard', 'dashboard-link');
                    fetchTasks(); 
                    fetchUserProfile();
                }, 600);
            } else {
                displayMessage(signinMessage, data.error || 'Login failed. Check your credentials.', 'error');
            }
        } catch (error) {
            console.error('Signin fetch error:', error);
            displayMessage(signinMessage, 'An error occurred during login. Please try again.', 'error');
        }
    });
}

// Handles forgot password request
if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        displayMessage(forgotPasswordMessage, 'Sending reset link...', '');
        const email = document.getElementById('forgot-password-email').value;

        try {
            const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (response.ok) {
                displayMessage(forgotPasswordMessage, data.message, 'success');
                document.getElementById('forgot-password-email').value = '';
                console.warn("NOTE: In a real app, check your email for the reset link (check backend console for token).");
            } else {
                displayMessage(forgotPasswordMessage, data.error || 'Failed to send reset link.', 'error');
            }
        } catch (error) {
            console.error('Forgot password fetch error:', error);
            displayMessage(forgotPasswordMessage, 'An error occurred during signup. Please try again.', 'error');
        }
    });
}

// --- Auth View Toggling ---
if (showSignup) showSignup.addEventListener('click', (e) => {
    e.preventDefault();
    displayMessage(signupMessage, '', ''); 
    signinView.classList.add('hidden');
    forgotPasswordView.classList.add('hidden'); 
    signupView.classList.remove('hidden');
});

if (showSignin) showSignin.addEventListener('click', (e) => {
    e.preventDefault();
    displayMessage(signinMessage, '', ''); 
    signupView.classList.add('hidden');
    forgotPasswordView.classList.add('hidden'); 
    signinView.classList.remove('hidden');
});

if (showForgotPasswordLink) showForgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    displayMessage(forgotPasswordMessage, '', ''); 
    signinView.classList.add('hidden');
    signupView.classList.add('hidden'); 
    forgotPasswordView.classList.remove('hidden');
});

if (backToSigninLink) backToSigninLink.addEventListener('click', (e) => {
    e.preventDefault();
    displayMessage(signinMessage, '', ''); 
    forgotPasswordView.classList.add('hidden');
    signupView.classList.add('hidden'); 
    signinView.classList.remove('hidden');
});


// --- 3. TASK MANAGEMENT (MongoDB Backend) ---

// Fetches tasks from the backend for the current user
const fetchTasks = async () => {
    const token = localStorage.getItem('userToken');
    if (!token) {
        console.warn('No token found, cannot fetch tasks.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/tasks`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` } 
        });

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('userToken');
                showLogin();
                displayMessage(signinMessage, 'Session expired. Please sign in again.', 'error');
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const tasks = await response.json();
        renderTasks(tasks);
    } catch (error) {
        console.error('Error fetching tasks:', error);
    }
};

// Renders tasks onto the Kanban board columns
const renderTasks = (tasks) => {
    const todoColumn = document.getElementById('To Do');
    const inProgressColumn = document.getElementById('In Progress');
    const doneColumn = document.getElementById('Done');

    if (todoColumn) todoColumn.innerHTML = '<h2>To Do</h2>';
    if (inProgressColumn) inProgressColumn.innerHTML = '<h2>In Progress</h2>';
    if (doneColumn) doneColumn.innerHTML = '<h2>Done</h2>';

    tasks.forEach(task => {
        const column = document.getElementById(task.status);
        if (column) {
            const card = document.createElement('div');
            card.className = `task-card priority-${task.priority.toLowerCase()}`;
            card.id = `task-${task._id}`; 
            card.draggable = true;
            card.dataset.id = task._id; 

            const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No Due Date';

            card.innerHTML = `
                <h3>${task.title}</h3>
                <p class="task-priority">${task.priority} Priority</p>
                <p class="task-due-date">Due: ${dueDate}</p>
                <div class="task-actions">
                    <button class="delete-task-btn" data-task-id="${task._id}" title="Delete Task">×</button>
                </div>
            `;
            card.addEventListener('dragstart', dragStart);
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.delete-task-btn')) {
                    showTaskDetailsModal(task);
                }
            });
            column.appendChild(card);
        }
    });
};

// Adds a new task
if (addTaskForm) {
    addTaskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const titleInput = document.getElementById('task-title');
        const priorityInput = document.getElementById('task-priority');
        const dueDateInput = document.getElementById('task-due-date'); 

        const title = titleInput.value.trim();
        const priority = priorityInput.value;
        const due_date = dueDateInput.value || null; 
        const token = localStorage.getItem('userToken');

        if (title && token) {
            try {
                const response = await fetch(`${API_BASE_URL}/tasks`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ title, priority, due_date, status: 'To Do' })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                titleInput.value = '';
                priorityInput.value = 'Medium'; 
                dueDateInput.value = ''; 
                fetchTasks();
            } catch (error) {
                console.error('Error adding task:', error);
                showGenericModal(
                    "Error",
                    "Failed to add task. Please try again.",
                    [{ text: "OK", className: "vault-btn primary" }]
                );
            }
        }
    });
}

// Handles task deletion via event delegation
if (taskBoard) {
    taskBoard.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-task-btn')) {
            const taskId = e.target.getAttribute('data-task-id');
            
            showGenericModal(
                "Confirm Deletion",
                "Are you sure you want to delete this task?",
                [
                    { text: "Delete", className: "vault-btn primary", onClick: async () => {
                        const token = localStorage.getItem('userToken');
                        if (!token) return;

                        try {
                            const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${token}` }
                            });

                            if (!response.ok) {
                                throw new Error(`HTTP error! status: ${response.status}`);
                            }
                            fetchTasks(); 
                        } catch (error) {
                            console.error('Error deleting task:', error);
                            showGenericModal(
                                "Error",
                                "Failed to delete task. Please try again.",
                                [{ text: "OK", className: "vault-btn primary" }]
                            );
                        }
                    }},
                    { text: "Cancel", className: "vault-btn secondary" }
                ]
            );
        }
    });
}

// --- Search and Filter Logic ---
if (taskSearchInput) taskSearchInput.addEventListener('input', filterTasks);

function filterTasks() {
    const searchTerm = taskSearchInput.value.toLowerCase();
    const tasks = document.querySelectorAll('.task-card');

    tasks.forEach(task => {
        const title = task.querySelector('h3').textContent.toLowerCase();
        if (title.includes(searchTerm)) {
            task.style.display = 'block';
        } else {
            task.style.display = 'none';
        }
    });
}

// --- 4. DRAG-AND-DROP LOGIC ---
function dragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.id);
    e.target.classList.add('dragging');
}

// Global drop function for drag-and-drop
window.drop = async (e) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    const draggedElement = document.getElementById(taskId);
    const targetColumn = e.target.closest('.task-column'); 
    document.querySelectorAll('.task-card').forEach(card => card.classList.remove('dragging')); 

    if (draggedElement && targetColumn) {
        const newStatus = targetColumn.id; 

        // Append the dragged card to the new column
        targetColumn.appendChild(draggedElement);

        // Update task status in the backend
        const token = localStorage.getItem('userToken');
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE_URL}/tasks/${draggedElement.dataset.id}`, { 
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error updating task status:', error);
            showGenericModal(
                "Error",
                "Failed to update task status. Please try again.",
                [{ text: "OK", className: "vault-btn primary" }]
            );
        }
    }
};

// --- 5. UI & SECRET VAULT LOGIC ---
if (themeToggle) themeToggle.addEventListener('click', () => document.body.classList.toggle('dark-mode'));

let clickCount = 0;
// =======================================================
// === MODIFIED LOGO CLICK: TRIGGER SECRET VAULT MODAL ===
// =======================================================
if (logo) {
    logo.addEventListener('click', () => {
        clickCount++;
        setTimeout(() => { clickCount = 0; }, 600); 
        if (clickCount === 3) {
            clickCount = 0;
            const token = localStorage.getItem('userToken');
            if (secretVaultModal && token) {
                checkVaultAccessStatus(); // Start the Vault flow
            } else {
                 showGenericModal("Access Denied", "Please sign in to access the Secret Vault.", [{ text: "OK", className: "vault-btn primary" }]);
            }
        }
    });
}

if (closeSecretVaultBtn) {
    closeSecretVaultBtn.addEventListener('click', () => {
        if (secretVaultModal) secretVaultModal.classList.add('hidden');
    });
}
// Removed closeVaultModal logic as the ID is no longer used.

// --- 6. Menu Toggle Logic ---
if (menuToggle) {
    menuToggle.addEventListener('click', () => {
        if (sidebar) sidebar.classList.toggle('collapsed');
    });
}

// --- Task Details Modal Logic ---
function showTaskDetailsModal(task) {
    currentTaskToEdit = task; 
    if (modalTaskTitle) modalTaskTitle.textContent = task.title;
    if (modalTaskStatus) modalTaskStatus.textContent = task.status;
    if (modalTaskPriority) modalTaskPriority.textContent = task.priority;
    if (modalTaskDueDate) modalTaskDueDate.textContent = task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A';
    if (modalTaskCreatedAt) modalTaskCreatedAt.textContent = new Date(task.created_at).toLocaleString();
    if (modalTaskDescription) modalTaskDescription.value = task.description || ''; 

    if (taskDetailsModal) taskDetailsModal.classList.remove('hidden');
    document.body.classList.add('modal-open'); 
}

function hideTaskDetailsModal() {
    if (taskDetailsModal) taskDetailsModal.classList.add('hidden');
    document.body.classList.remove('modal-open');
    currentTaskToEdit = null; 
}

// Event listeners for task details modal
if (modalCloseBtn) modalCloseBtn.addEventListener('click', hideTaskDetailsModal);
if (taskDetailsModal) {
    taskDetailsModal.addEventListener('click', (e) => {
        if (e.target === taskDetailsModal) {
            hideTaskDetailsModal();
        }
    });
}

// Save updated task details (e.g., description)
if (saveTaskDetailsBtn) {
    saveTaskDetailsBtn.addEventListener('click', async () => {
        if (!currentTaskToEdit) return;

        const newDescription = modalTaskDescription.value;
        const token = localStorage.getItem('userToken');

        try {
            const response = await fetch(`${API_BASE_URL}/tasks/${currentTaskToEdit._id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ description: newDescription })
            });

            if (response.ok) {
                currentTaskToEdit.description = newDescription; 
                hideTaskDetailsModal();
                fetchTasks(); 
            } else {
                const errorData = await response.json();
                console.error('Error saving task details:', errorData.error);
                showGenericModal(
                    "Error",
                    "Failed to save task details: " + (errorData.error || 'Unknown error'),
                    [{ text: "OK", className: "vault-btn primary" }]
                );
            }
        } catch (error) {
            console.error('Error in saveTaskDetails fetch:', error);
            showGenericModal(
                "Error",
                "An error occurred while saving task details.",
                [{ text: "OK", className: "vault-btn primary" }]
            );
        }
    });
}

// --- ADMIN PANEL LOGIC ---

// Function to show the admin dashboard and hide the regular dashboard
function showAdminDashboard() {
    showPage('admin-dashboard-section', 'admin-panel-link');
    fetchAllUsers();
    fetchAllTasksForAdmin(); 
}

// Function to show the regular dashboard and hide the admin dashboard
function showRegularDashboard() {
    showPage('dashboard', 'dashboard-link');
    fetchTasks(); 
}

// Event listener for Admin Panel link
if (showAdminPanelBtn) {
    showAdminPanelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentUserRole === 'admin') {
            showAdminDashboard();
        } else {
            showGenericModal("Access Denied", "You do not have administrative privileges.", [{ text: "OK", className: "vault-btn primary" }]);
        }
    });
}

// Event listener for Dashboard link
if (dashboardLink) {
    dashboardLink.addEventListener('click', (e) => {
        e.preventDefault();
        showRegularDashboard();
    });
}


// Fetches all users for admin view
const fetchAllUsers = async () => {
    const token = localStorage.getItem('userToken');
    if (!token || currentUserRole !== 'admin') {
        console.warn('Not authorized to fetch all users.');
        if (adminUsersList) adminUsersList.innerHTML = '<p class="placeholder-text">Access Denied: Admin privileges required.</p>';
        return;
    }

    if (adminUsersList) adminUsersList.innerHTML = '<p class="placeholder-text">Loading users...</p>'; 

    try {
        const response = await fetch(`${API_BASE_URL}/admin/users`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                showGenericModal("Access Denied", "You do not have permission to view users.", [{ text: "OK", className: "vault-btn primary" }]);
                if (adminUsersList) adminUsersList.innerHTML = '<p class="placeholder-text">Access Denied: Admin privileges required.</p>';
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const users = await response.json();
        renderUsersForAdmin(users);
    } catch (error) {
        console.error('Error fetching all users:', error);
        if (adminUsersList) adminUsersList.innerHTML = '<p class="placeholder-text">Failed to load users.</p>';
    }
};

// Renders users in the admin user list with role dropdown and save button
const renderUsersForAdmin = (users) => {
    if (!adminUsersList) return;
    adminUsersList.innerHTML = ''; 
    if (users.length === 0) {
        adminUsersList.innerHTML = '<p class="placeholder-text">No users found.</p>';
        return;
    }

    users.forEach(user => {
        const userCard = document.createElement('div');
        userCard.className = 'user-card task-card'; 
        userCard.innerHTML = `
            <h3>${user.email}</h3>
            <p>ID: ${user._id}</p>
            <div class="user-role-control">
                <label for="role-select-${user._id}">Role:</label>
                <select id="role-select-${user._id}" class="role-select ${user.role === 'admin' ? 'role-admin' : 'role-user'}">
                    <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                </select>
                <button class="save-role-btn vault-btn primary" data-user-id="${user._id}" data-original-role="${user.role}">Save Role</button>
            </div>
            <div class="user-actions">
                <button class="delete-user-btn" data-user-id="${user._id}" title="Delete User">Delete User</button>
            </div>
        `;
        adminUsersList.appendChild(userCard);

        // Add event listener for role select change to enable/disable save button
        const roleSelect = userCard.querySelector(`#role-select-${user._id}`);
        const saveRoleBtn = userCard.querySelector(`.save-role-btn`);

        // Disable save button initially if no change
        saveRoleBtn.disabled = true;

        roleSelect.addEventListener('change', () => {
            if (roleSelect.value !== saveRoleBtn.dataset.originalRole) {
                saveRoleBtn.disabled = false; 
                roleSelect.classList.remove('role-user', 'role-admin');
                roleSelect.classList.add(`role-${roleSelect.value}`);
            } else {
                saveRoleBtn.disabled = true; 
                roleSelect.classList.remove('role-user', 'role-admin');
                roleSelect.classList.add(`role-${roleSelect.value}`);
            }
        });
        
        // Delete User Button
        userCard.querySelector('.delete-user-btn').addEventListener('click', (e) => {
            const userIdToDelete = e.target.dataset.userId;
            showGenericModal(
                "Confirm User Deletion",
                `Are you sure you want to delete user: ${user.email}? This action cannot be undone.`,
                [
                    { text: "Delete User", className: "vault-btn primary", onClick: () => deleteUser(userIdToDelete) },
                    { text: "Cancel", className: "vault-btn secondary" }
                ]
            );
        });

        // Save Role Button
        saveRoleBtn.addEventListener('click', (e) => {
            const userIdToUpdate = e.target.dataset.userId;
            const newRole = roleSelect.value;
            showGenericModal(
                "Confirm Role Change",
                `Are you sure you want to change the role of ${user.email} to "${newRole}"?`,
                [
                    { text: "Change Role", className: "vault-btn primary", onClick: () => updateUserRole(userIdToUpdate, newRole) },
                    { text: "Cancel", className: "vault-btn secondary" }
                ]
            );
        });
    });
};

// Updates a user's role (admin action)
const updateUserRole = async (userId, newRole) => {
    const token = localStorage.getItem('userToken');
    if (!token || currentUserRole !== 'admin') {
        showGenericModal("Access Denied", "You do not have permission to change user roles.", [{ text: "OK", className: "vault-btn primary" }]);
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/role`, { 
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ newRole })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        showGenericModal("Success", `User role updated to ${newRole}.`, [{ text: "OK", className: "vault-btn primary" }]);
        fetchAllUsers(); 
    } catch (error) {
        console.error('Error updating user role:', error);
        showGenericModal("Error", `Failed to update user role: ${error.message}`, [{ text: "OK", className: "vault-btn primary" }]);
    }
};


// Deletes a user (admin action)
const deleteUser = async (userId) => {
    const token = localStorage.getItem('userToken');
    if (!token || currentUserRole !== 'admin') {
        showGenericModal("Access Denied", "You do not have permission to delete users.", [{ text: "OK", className: "vault-btn primary" }]);
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        showGenericModal("Success", "User deleted successfully.", [{ text: "OK", className: "vault-btn primary" }]);
        fetchAllUsers(); 
    } catch (error) {
        console.error('Error deleting user:', error);
        showGenericModal("Error", `Failed to delete user: ${error.message}`, [{ text: "OK", className: "vault-btn primary" }]);
    }
};

// Fetches all tasks for admin view (global tasks)
const fetchAllTasksForAdmin = async () => {
    const token = localStorage.getItem('userToken');
    if (!token || currentUserRole !== 'admin') {
        console.warn('Not authorized to fetch all tasks for admin.');
        if (adminAllTasksList) adminAllTasksList.innerHTML = '<p class="placeholder-text">Access Denied: Admin privileges required.</p>';
        return;
    }

    if (adminAllTasksList) adminAllTasksList.innerHTML = '<p class="placeholder-text">Loading all tasks...</p>'; 

    try {
        const response = await fetch(`${API_BASE_URL}/admin/tasks`, { 
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                showGenericModal("Access Denied", "You do not have permission to view all tasks.", [{ text: "OK", className: "vault-btn primary" }]);
                if (adminAllTasksList) adminAllTasksList.innerHTML = '<p class="placeholder-text">Access Denied: Admin privileges required.</p>';
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const tasks = await response.json();
        renderAllTasksForAdmin(tasks);
    } catch (error) {
        console.error('Error fetching all tasks for admin:', error);
        if (adminAllTasksList) adminAllTasksList.innerHTML = '<p class="placeholder-text">Failed to load all tasks.</p>';
    }
};

// Renders all tasks in the admin all tasks list
const renderAllTasksForAdmin = (tasks) => {
    if (!adminAllTasksList) return;
    adminAllTasksList.innerHTML = ''; 
    if (tasks.length === 0) {
        adminAllTasksList.innerHTML = '<p class="placeholder-text">No tasks found in the system.</p>';
        return;
    }

    tasks.forEach(task => {
        const taskCard = document.createElement('div');
        taskCard.className = `task-card priority-${task.priority.toLowerCase()}`;
        taskCard.id = `admin-task-${task._id}`; 
        
        const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No Due Date';

        taskCard.innerHTML = `
            <h3>${task.title}</h3>
            <p>Status: ${task.status}</p>
            <p>Priority: ${task.priority}</p>
            <p>Due: ${dueDate}</p>
            <p>Created by: ${task.userEmail || 'N/A'}</p> <div class="task-actions">
                <button class="delete-admin-task-btn" data-task-id="${task._id}" title="Delete Task">×</button>
                </div>
        `;
        adminAllTasksList.appendChild(taskCard);
    });

    // Add event listeners for delete admin task buttons
    adminAllTasksList.querySelectorAll('.delete-admin-task-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const taskIdToDelete = e.target.dataset.taskId;
            showGenericModal(
                "Confirm Task Deletion (Admin)",
                `Are you sure you want to delete this task (ID: ${taskIdToDelete})? This will delete it for all users.`,
                [
                    { text: "Delete Task", className: "vault-btn primary", onClick: () => deleteAdminTask(taskIdToDelete) },
                    { text: "Cancel", className: "vault-btn secondary" }
                ]
            );
        });
    });
};

// Deletes any task (admin action)
const deleteAdminTask = async (taskId) => {
    const token = localStorage.getItem('userToken');
    if (!token || currentUserRole !== 'admin') {
        showGenericModal("Access Denied", "You do not have permission to delete tasks globally.", [{ text: "OK", className: "vault-btn primary" }]);
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/admin/tasks/${taskId}`, { 
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        showGenericModal("Success", "Task deleted successfully from all users.", [{ text: "OK", className: "vault-btn primary" }]);
        fetchAllTasksForAdmin(); 
    } catch (error) {
        console.error('Error deleting admin task:', error);
        showGenericModal("Error", `Failed to delete task: ${error.message}`, [{ text: "OK", className: "vault-btn primary" }]);
    }
};

// --- Profile Form & Data Logic ---

// Function to fetch and display user data
const fetchUserProfile = async () => {
    const token = localStorage.getItem('userToken');
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE_URL}/profile`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const user = await response.json();
            // userEmailDisplay.textContent = user.email; // Display user's email in the header
            updateUserProfileUI(user);
        }
    } catch (error) {
        console.error('Error fetching user profile:', error);
    }
};

// Populate the profile form with user data
function updateUserProfileUI(user) {
    if (profileEmailInput) profileEmailInput.value = user.email;
    if (profileNameInput) profileNameInput.value = user.name || ''; 
}

// Event listener for the Profile link
if (profileLink) {
    profileLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (userDropdownMenu) userDropdownMenu.classList.add('hidden'); 
        if (userMenuButton) userMenuButton.classList.remove('active'); 
        showPage('profile-page', 'profile-link'); 
    });
}

// Update sign out logic to use the new dropdown link
if (signoutLink) {
    signoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('userToken');
        showLogin();
        // userEmailDisplay.textContent = ''; // Clear the user email display in the header on signout
    });
}

// --- Profile Form Submission Logic ---
if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (profileMessage) {
            profileMessage.textContent = 'Saving changes...';
            profileMessage.className = 'message';
        }

        const token = localStorage.getItem('userToken');
        const name = profileNameInput.value;
        const password = profilePasswordInput.value;

        const body = { name };
        if (password) {
            body.password = password;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/profile`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (response.ok) {
                if (profileMessage) {
                    profileMessage.textContent = data.message || 'Profile updated successfully!';
                    profileMessage.className = 'message success';
                }
                if (profilePasswordInput) profilePasswordInput.value = ''; 
                
                fetchUserProfile();

            } else {
                if (profileMessage) {
                    profileMessage.textContent = data.error || 'Failed to update profile.';
                    profileMessage.className = 'message error';
                }
            }
        } catch (error) {
            console.error('Profile update fetch error:', error);
            if (profileMessage) {
                profileMessage.textContent = 'An error occurred. Please try again.';
                profileMessage.className = 'message error';
            }
        }
    });
}


// ... existing code before DOMContentLoaded (around line 1110)

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    if (copyrightYear) copyrightYear.textContent = new Date().getFullYear();
    checkAuthStatus(); 

    // Add the event listener for the unlock button
    if (unlockButton) {
        unlockButton.addEventListener('click', () => {
            if (loginWindow) loginWindow.classList.add('expanded');
            if (loginFormWrapper) loginFormWrapper.classList.remove('collapsed');
        });
    }

    // --- FIX: ADD MISSING NAVIGATION LISTENERS (for Admin and Files) ---
    if (dashboardLink) {
        dashboardLink.addEventListener('click', (e) => {
            e.preventDefault();
            showRegularDashboard(); 
        });
    }
    
    if (adminPanelLink) {
        adminPanelLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentUserRole === 'admin') {
                showAdminDashboard(); 
            } else {
                showGenericModal("Access Denied", "You do not have administrative privileges to view this panel.", [{ text: "OK", className: "vault-btn primary" }]);
            }
        });
    }

    // Corrected logic for File Storage Link
    if (fileStorageLink) {
        fileStorageLink.addEventListener('click', (e) => {
            e.preventDefault();
            showPage('file-storage-page', 'file-storage-link'); 
            fetchStoredFiles(); 
        });
    }
    // --- END OF NAVIGATION FIXES ---

    // Add event listener for the user menu button on the dashboard
    if (userMenuButton) {
        userMenuButton.addEventListener('click', (e) => {
            e.stopPropagation(); 
            if (userDropdownMenu) userDropdownMenu.classList.toggle('hidden');
        });
    }

    // Close the user dropdown if the user clicks anywhere else
    document.addEventListener('click', (e) => {
        if (userMenuButton && userDropdownMenu && !userMenuButton.contains(e.target) && !userDropdownMenu.contains(e.target)) {
            userDropdownMenu.classList.add('hidden');
        }
    });

    // Disable dates before the current day in the task due date calendar
    const today = new Date().toISOString().split('T')[0];
    const dueDateInput = document.getElementById('task-due-date');
    if (dueDateInput) {
        dueDateInput.setAttribute('min', today);
    }

    // =======================================================
    // === FIX: SECRET VAULT LOGIC INTEGRATION (Forms and Trigger) ===
    // =======================================================

    // --- LOGO CLICK TRIGGER (Secret Vault) ---
    if (logo) {
        logo.addEventListener('click', () => {
            clickCount++;
            // Reset click count after a short delay
            setTimeout(() => { clickCount = 0; }, 600); 
            
            if (clickCount >= 3) { // Trigger on 3rd click
                clickCount = 0;
                const token = localStorage.getItem('userToken');
                if (secretVaultModal && token) {
                    checkVaultAccessStatus(); // This opens the modal and checks status
                } else {
                    showGenericModal("Access Denied", "Please sign in to access the Secret Vault.", [{ text: "OK", className: "vault-btn primary" }]);
                }
            }
        });
    }
    
    // --- Vault Setup Form Submission ---
    if (vaultSetupForm) {
        vaultSetupForm.addEventListener('submit', setupVault); // Uses new global setupVault function
    }

    // --- Vault Unlock Form Submission ---
    if (vaultUnlockForm) {
        vaultUnlockForm.addEventListener('submit', unlockVault); // Uses new global unlockVault function
    }

    // --- Close Vault Button ---
    if (closeSecretVaultBtn) {
        closeSecretVaultBtn.addEventListener('click', () => {
            if (secretVaultModal) secretVaultModal.classList.add('hidden');
            vaultAccessKey = null; // IMPORTANT: Clear key on modal close
            if (vaultUnlockForm) vaultUnlockForm.reset();
            if (vaultSetupForm) vaultSetupForm.reset();
            if (vaultFileListDisplay) vaultFileListDisplay.innerHTML = '';
        });
    }
    
    // --- VAULT FILE UPLOAD LISTENERS (Inside Modal) ---
    if (vaultTriggerUploadBtn && vaultFileInput) {
        vaultTriggerUploadBtn.addEventListener('click', () => {
            if (vaultAccessKey) { 
                vaultFileInput.click();
            } else {
                showGenericModal("Vault Locked", "Please unlock the vault before uploading files.", [{ text: "OK", className: "vault-btn primary" }]);
            }
        });
    }

    if (vaultFileInput) {
        vaultFileInput.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files.length > 0) {
                if (vaultFileListDisplay) {
                    vaultFileListDisplay.innerHTML = ''; // Clear existing file list display
                    Array.from(files).forEach(file => {
                         const li = document.createElement('li');
                         li.textContent = `• ${file.name} (${(file.size / 1024).toFixed(2)} KB) - Encrypting...`;
                         if(vaultFileListDisplay) vaultFileListDisplay.appendChild(li);
                    });
                }
                uploadSecretFiles(Array.from(files));
            }
        });
    }
    
    // --- Vault Drag and Drop Handlers (Corrected) ---
    if (vaultDropZone) {
        
        function vaultPreventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        function vaultHandleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (vaultAccessKey) {
                // Display files in the drop zone and start upload
                if (vaultFileListDisplay) {
                     vaultFileListDisplay.innerHTML = ''; 
                     Array.from(files).forEach(file => {
                         const li = document.createElement('li');
                         li.textContent = `• ${file.name} (${(file.size / 1024).toFixed(2)} KB) - Encrypting...`;
                         vaultFileListDisplay.appendChild(li);
                     });
                }
                uploadSecretFiles(Array.from(files));
            } else {
                showGenericModal("Vault Locked", "Please unlock the vault before dropping files.", [{ text: "OK", className: "vault-btn primary" }]);
            }
        }
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            vaultDropZone.addEventListener(eventName, vaultPreventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            vaultDropZone.addEventListener(eventName, () => vaultDropZone.classList.add('highlight'), false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            vaultDropZone.addEventListener(eventName, () => vaultDropZone.classList.remove('highlight'), false);
        });

        vaultDropZone.addEventListener('drop', vaultHandleDrop, false);
    }
    // =======================================================
    // === END OF VAULT FIXES ===
    // =======================================================
});
