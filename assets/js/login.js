/**
 * Login functionality with basic security
 * Uses base64 encoding for basic credential obfuscation
 */

// Check if user is already logged in
function checkExistingSession() {
    const session = sessionStorage.getItem('notesAppSession');
    if (session) {
        const sessionData = JSON.parse(session);
        // Check if session is still valid (2 hours)
        if (Date.now() - sessionData.timestamp < 2 * 60 * 60 * 1000) {
            window.location.href = 'dashboard.html';
        } else {
            sessionStorage.removeItem('notesAppSession');
        }
    }
}

// Base64 decode helper
function decodeBase64(str) {
    try {
        return atob(str);
    } catch (e) {
        console.error('Error decoding base64:', e);
        return null;
    }
}

// Login function with basic validation
function login() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const loginBtn = document.querySelector('#loginBtn');
    
    // Basic input validation
    if (!username || !password) {
        showLoginError('Please enter both username and password');
        return;
    }
    
    // Show loading state
    loginBtn.innerHTML = '<span class="loading-spinner"></span> Signing in...';
    loginBtn.disabled = true;
    
    // Simulate API call delay
    setTimeout(() => {
        try {
            // Get credentials from config (base64 encoded)
            const validUsername = decodeBase64(CONFIG.CREDENTIALS.username);
            const validPassword = decodeBase64(CONFIG.CREDENTIALS.password);
            
            if (username === validUsername && password === validPassword) {
                // Create session
                const sessionData = {
                    loggedIn: true,
                    username: username,
                    timestamp: Date.now()
                };
                sessionStorage.setItem('notesAppSession', JSON.stringify(sessionData));
                
                // Redirect to dashboard
                window.location.href = 'dashboard.html';
            } else {
                showLoginError('Invalid credentials');
            }
        } catch (error) {
            console.error('Login error:', error);
            showLoginError('Login failed. Please try again.');
        } finally {
            // Reset button
            resetLoginButton(loginBtn);
        }
    }, 1000);
}

// Show login error
function showLoginError(message) {
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    } else {
        alert(message); // Fallback
    }
}

// Reset login button to original state
function resetLoginButton(button) {
    button.innerHTML = 'Sign In';
    button.disabled = false;
}

// Handle Enter key press in login form
function handleEnterKey(event) {
    if (event.key === 'Enter') {
        login();
    }
}

// Initialize login page
document.addEventListener('DOMContentLoaded', function() {
    checkExistingSession();
    
    // Add event listeners for Enter key
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('keypress', handleEnterKey);
    });
    
    // Form submission
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        login();
    });
});