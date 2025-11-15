const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Add this at the top of server.js
if (!process.env.GITHUB_TOKEN) {
    console.error('❌ GITHUB_TOKEN is not set in environment variables');
    console.log('💡 Create a .env file with your GitHub credentials');
    process.exit(1);
}

// GitHub API service
class GitHubService {
    constructor() {
        this.token = process.env.GITHUB_TOKEN;
        this.owner = process.env.GITHUB_OWNER || 'iantolentino';
        this.repo = process.env.GITHUB_REPO || 'Notes-Reader';
        this.branch = process.env.GITHUB_BRANCH || 'main';
        this.baseURL = 'https://api.github.com';
    }

    async commitFile(fileName, content, category, message) {
        try {
            const filePath = `notes/${category}/${fileName}`;
            const encodedContent = Buffer.from(content).toString('base64');

            // Check if file exists to get SHA for update
            let sha = null;
            try {
                const existingFile = await axios.get(
                    `${this.baseURL}/repos/${this.owner}/${this.repo}/contents/${filePath}`,
                    {
                        headers: {
                            'Authorization': `token ${this.token}`,
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    }
                );
                sha = existingFile.data.sha;
            } catch (error) {
                // File doesn't exist, this is a new file
                console.log('Creating new file:', filePath);
            }

            const response = await axios.put(
                `${this.baseURL}/repos/${this.owner}/${this.repo}/contents/${filePath}`,
                {
                    message: message,
                    content: encodedContent,
                    branch: this.branch,
                    sha: sha
                },
                {
                    headers: {
                        'Authorization': `token ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    }
                }
            );

            return {
                success: true,
                html_url: response.data.content.html_url,
                sha: response.data.content.sha
            };

        } catch (error) {
            console.error('GitHub API error:', error.response?.data || error.message);
            throw new Error(`GitHub commit failed: ${error.response?.data?.message || error.message}`);
        }
    }

    async getFiles() {
        try {
            const response = await axios.get(
                `${this.baseURL}/repos/${this.owner}/${this.repo}/contents/notes?ref=${this.branch}`,
                {
                    headers: {
                        'Authorization': `token ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('Error fetching files:', error.response?.data || error.message);
            return [];
        }
    }

    async getFileContent(downloadUrl) {
        try {
            const response = await axios.get(downloadUrl);
            return response.data;
        } catch (error) {
            console.error('Error fetching file content:', error);
            throw error;
        }
    }
}

const githubService = new GitHubService();

// Routes
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    // Simple authentication (replace with proper auth in production)
    if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
        const sessionToken = require('crypto').randomBytes(32).toString('hex');
        res.json({ 
            success: true, 
            token: sessionToken,
            user: { username: username }
        });
    } else {
        res.status(401).json({ 
            success: false, 
            message: 'Invalid credentials' 
        });
    }
});

app.get('/api/github-token', (req, res) => {
    // This endpoint would verify the user session and return a token
    // For now, we'll handle GitHub operations server-side
    res.json({ 
        hasToken: !!process.env.GITHUB_TOKEN,
        owner: process.env.GITHUB_OWNER,
        repo: process.env.GITHUB_REPO
    });
});

app.post('/api/upload-note', async (req, res) => {
    try {
        const { fileName, content, category, message } = req.body;

        if (!fileName || !content || !category) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: fileName, content, category'
            });
        }

        const result = await githubService.commitFile(
            fileName.endsWith('.md') ? fileName : fileName + '.md',
            content,
            category,
            message || `Add note: ${fileName} in ${category}`
        );

        res.json({
            success: true,
            message: 'Note uploaded to GitHub successfully',
            data: result
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.get('/api/notes', async (req, res) => {
    try {
        const files = await githubService.getFiles();
        
        // Process files to create note index
        const notes = [];
        
        for (const category of files) {
            if (category.type === 'dir') {
                const categoryFiles = await axios.get(category.url, {
                    headers: {
                        'Authorization': `token ${githubService.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                
                for (const file of categoryFiles.data) {
                    if (file.name.endsWith('.md')) {
                        const contentResponse = await githubService.getFileContent(file.download_url);
                        
                        notes.push({
                            id: file.path,
                            title: file.name.replace('.md', '').replace(/[-_]/g, ' '),
                            category: category.name,
                            path: file.path,
                            date: file.name.split('-')[0] || new Date().toISOString().split('T')[0],
                            content: contentResponse,
                            preview: contentResponse.substring(0, 150).replace(/[#*`\[\]]/g, '') + '...',
                            url: file.html_url,
                            sha: file.sha,
                            lastModified: file.name.split('-')[0] || new Date().toISOString().split('T')[0]
                        });
                    }
                }
            }
        }
        
        res.json({
            success: true,
            notes: notes
        });
        
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notes',
            notes: []
        });
    }
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/upload', (req, res) => {
    res.sendFile(path.join(__dirname, 'upload.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Make sure to set up your .env file with GitHub credentials');
});

// Add to server.js
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    // Verify token (implement proper JWT validation in production)
    if (token === 'valid-token') { // Replace with proper validation
        next();
    } else {
        res.status(403).json({ message: 'Invalid token' });
    }
}