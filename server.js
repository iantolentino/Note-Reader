const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Check for required environment variables
if (!process.env.GITHUB_TOKEN) {
    console.warn('⚠️  GITHUB_TOKEN is not set in environment variables');
    console.log('💡 Notes will be saved locally only');
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
            // If no GitHub token, simulate success for local testing
            if (!this.token) {
                console.log('📝 Local mode: Simulating GitHub commit');
                const localNote = {
                    id: 'local-' + Date.now(),
                    title: fileName.replace('.md', ''),
                    category: category,
                    content: content,
                    date: new Date().toISOString(),
                    preview: content.substring(0, 150) + '...',
                    url: '#local',
                    lastModified: new Date().toISOString()
                };
                
                // Save to local file
                const localNotes = this.getLocalNotes();
                localNotes.push(localNote);
                this.saveLocalNotes(localNotes);
                
                return {
                    success: true,
                    html_url: '#local',
                    sha: 'local-' + Date.now(),
                    localNote: localNote
                };
            }

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
            // If no GitHub token, return empty array for local testing
            if (!this.token) {
                console.log('📝 Local mode: No GitHub token, returning empty files');
                return [];
            }

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

    getLocalNotes() {
        try {
            if (fs.existsSync('local-notes.json')) {
                return JSON.parse(fs.readFileSync('local-notes.json', 'utf8'));
            }
        } catch (error) {
            console.error('Error reading local notes:', error);
        }
        return [];
    }

    saveLocalNotes(notes) {
        try {
            fs.writeFileSync('local-notes.json', JSON.stringify(notes, null, 2));
        } catch (error) {
            console.error('Error saving local notes:', error);
        }
    }
}

const githubService = new GitHubService();

// Routes
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    // Simple authentication
    if (username === (process.env.ADMIN_USER || 'admin') && password === (process.env.ADMIN_PASS || 'admin')) {
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
            message: process.env.GITHUB_TOKEN ? 'Note uploaded to GitHub successfully' : 'Note saved locally',
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
        let notes = [];
        
        console.log('📝 Fetching notes...');
        
        // Try to get notes from GitHub first
        if (process.env.GITHUB_TOKEN) {
            try {
                const files = await githubService.getFiles();
                console.log('GitHub API response received');
                
                if (Array.isArray(files)) {
                    for (const item of files) {
                        if (item.type === 'dir' && item.name !== '.github') { // Skip .github directory
                            console.log(`Processing category: ${item.name}`);
                            
                            try {
                                // Get files in this category
                                const categoryResponse = await axios.get(item.url, {
                                    headers: {
                                        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                                        'Accept': 'application/vnd.github.v3+json'
                                    }
                                });
                                
                                const categoryFiles = categoryResponse.data;
                                
                                for (const file of categoryFiles) {
                                    if (file.type === 'file' && file.name.endsWith('.md') && file.name !== 'README.md') {
                                        console.log(`Found markdown file: ${file.name}`);
                                        
                                        try {
                                            const content = await githubService.getFileContent(file.download_url);
                                            
                                            // FIXED: Better date handling
                                            let noteDate;
                                            try {
                                                // Try to extract date from filename (format: YYYY-MM-DD-filename.md)
                                                const dateMatch = file.name.match(/^(\d{4}-\d{2}-\d{2})-/);
                                                if (dateMatch) {
                                                    noteDate = dateMatch[1];
                                                } else {
                                                    // Use GitHub's last modified date
                                                    noteDate = new Date().toISOString().split('T')[0];
                                                }
                                            } catch (dateError) {
                                                noteDate = new Date().toISOString().split('T')[0];
                                            }
                                            
                                            const note = {
                                                id: file.sha,
                                                title: file.name.replace('.md', '')
                                                              .replace(/^\d{4}-\d{2}-\d{2}-/, '') // Remove date prefix
                                                              .replace(/[-_]/g, ' ')
                                                              .replace(/\b\w/g, l => l.toUpperCase()), // Capitalize words
                                                category: item.name,
                                                path: file.path,
                                                date: noteDate,
                                                content: content,
                                                preview: content.substring(0, 150).replace(/[#*`\[\]]/g, '') + '...',
                                                url: file.html_url,
                                                sha: file.sha,
                                                lastModified: file.last_modified || noteDate
                                            };
                                            
                                            notes.push(note);
                                            console.log(`✅ Added GitHub note: ${file.name}`);
                                        } catch (contentError) {
                                            console.error(`Error getting content for ${file.name}:`, contentError.message);
                                        }
                                    }
                                }
                            } catch (categoryError) {
                                console.error(`Error fetching category ${item.name}:`, categoryError.message);
                            }
                        }
                    }
                }
                
                console.log(`✅ Loaded ${notes.length} notes from GitHub`);
            } catch (githubError) {
                console.error('GitHub API error:', githubError.message);
            }
        }
        
        // Always include local notes
        const localNotes = githubService.getLocalNotes();
        console.log(`📁 Found ${localNotes.length} local notes`);
        
        // Merge notes, avoiding duplicates by ID
        const allNotesMap = new Map();
        
        // Add GitHub notes first
        notes.forEach(note => allNotesMap.set(note.id, note));
        
        // Add local notes (will overwrite if same ID, but local IDs are different)
        localNotes.forEach(note => allNotesMap.set(note.id, note));
        
        notes = Array.from(allNotesMap.values());
        
        console.log(`🎯 Total notes to return: ${notes.length}`);
        
        res.json({
            success: true,
            notes: notes,
            source: process.env.GITHUB_TOKEN ? 'github' : 'local'
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

app.get('/create', (req, res) => {
    res.sendFile(path.join(__dirname, 'create.html'));
});

// Create local notes file if it doesn't exist
if (!fs.existsSync('local-notes.json')) {
    fs.writeFileSync('local-notes.json', '[]');
    console.log('📝 Created local-notes.json file');
}

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log('📝 Notes Application Ready!');
    if (!process.env.GITHUB_TOKEN) {
        console.log('💡 Running in local mode - set GITHUB_TOKEN in .env for GitHub integration');
    } else {
        console.log('🔗 GitHub integration enabled');
    }
});