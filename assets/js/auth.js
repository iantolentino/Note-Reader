/**
 * Authentication utilities
 */

function checkAuth() {
    const session = sessionStorage.getItem('notesAppSession');
    if (!session) {
        return false;
    }
    
    try {
        const sessionData = JSON.parse(session);
        // Check if session is still valid (2 hours)
        if (Date.now() - sessionData.timestamp < 2 * 60 * 60 * 1000) {
            return true;
        } else {
            sessionStorage.removeItem('notesAppSession');
            return false;
        }
    } catch (e) {
        sessionStorage.removeItem('notesAppSession');
        return false;
    }
}

function logout() {
    try {
        sessionStorage.removeItem('notesAppSession');
        localStorage.removeItem('userNotes'); // Clear any local data too
        // Force redirect to login page
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
        // Fallback: simple redirect
        window.location.href = 'index.html';
    }
}

function getCurrentUser() {
    const session = sessionStorage.getItem('notesAppSession');
    if (session) {
        return JSON.parse(session);
    }
    return null;
}