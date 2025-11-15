// Configuration file - Keep this private and add to .gitignore
const CONFIG = {
    // GitHub Pages deployment - update with your actual repo info
    GITHUB_USERNAME: "iantolentino",
    GITHUB_REPO: "Note-Reader",
    
    // Login credentials (base64 encoded)
    CREDENTIALS: {
        username: "QWRtaW4=", // Base64 encoded "Admin" - CORRECT
        password: "dGVzdHBhc3N3b3Jk" // Base64 encoded "testpassword" - CORRECT
    },
    
    // App settings
    APP: {
        name: "My Notes",
        version: "1.0.0",
        sessionTimeout: 2 // hours
    }
};

// Debug helper - remove in production
console.log('Config loaded:', {
    username: atob(CONFIG.CREDENTIALS.username),
    repo: CONFIG.GITHUB_REPO
});