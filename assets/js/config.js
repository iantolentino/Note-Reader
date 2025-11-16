// Client-side configuration
const CONFIG = {
    IS_PRODUCTION: true,
    
    // Base64 encoded credentials (admin/admin)
    CREDENTIALS: {
        username: "YWRtaW4=", // admin
        password: "YWRtaW4="  // admin
    },
    
    // GitHub Configuration
    GITHUB: {
        OWNER: 'iantolentino',
        REPO: 'Note-Reader',
        BRANCH: 'main'
    }
};

// Base64 decode helper
function decodeBase64(str) {
    try {
        return atob(str);
    } catch (e) {
        console.error('Error decoding base64:', e);
        return null;
    }
}