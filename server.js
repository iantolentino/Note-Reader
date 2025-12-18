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
        this.repo = process.env.GITHUB_REPO || 'Note-Reader';
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

    async getContents(path = '') {
        try {
            // If no GitHub token, return local notes
            if (!this.token) {
                console.log('📝 Local mode: Returning local notes');
                return this.getLocalNotesForAPI();
            }

            console.log(`🔗 Fetching GitHub contents: ${path}`);
            const response = await axios.get(
                `${this.baseURL}/repos/${this.owner}/${this.repo}/contents/${path}?ref=${this.branch}`,
                {
                    headers: {
                        'Authorization': `token ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            console.log(`✅ GitHub API success for path: ${path}, items: ${Array.isArray(response.data) ? response.data.length : 'single'}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching contents from GitHub:', error.response?.data || error.message);
            
            // If GitHub fails, return local notes for root notes path
            if (path === 'notes') {
                return this.getLocalNotesForAPI();
            }
            return [];
        }
    }
    async getFileContent(downloadUrl) {
        try {
            // Handle local notes
            if (downloadUrl === '#local') {
                return 'Local note content';
            }
            
            const response = await axios.get(downloadUrl);
            return response.data;
        } catch (error) {
            console.error('Error fetching file content:', error);
            return 'Content not available';
        }
    }

    async getFilePreview(downloadUrl) {
        try {
            const content = await this.getFileContent(downloadUrl);
            return content.substring(0, 150) + '...';
        } catch (error) {
            return 'Preview not available';
        }
    }

    // For API responses - returns notes in the format expected by frontend
    getLocalNotesForAPI() {
        try {
            if (fs.existsSync('local-notes.json')) {
                const notes = JSON.parse(fs.readFileSync('local-notes.json', 'utf8'));
                return notes;
            }
        } catch (error) {
            console.error('Error reading local notes:', error);
        }
        return [];
    }

    // For directory structure - used in getContents
    getLocalNotes() {
        try {
            if (fs.existsSync('local-notes.json')) {
                const notes = JSON.parse(fs.readFileSync('local-notes.json', 'utf8'));
                // Group by category for directory structure
                const categories = {};
                notes.forEach(note => {
                    if (!categories[note.category]) {
                        categories[note.category] = [];
                    }
                    categories[note.category].push({
                        type: 'file',
                        name: note.title + '.md',
                        download_url: '#local',
                        html_url: '#local',
                        sha: note.id,
                        content: note.content
                    });
                });

                return Object.keys(categories).map(categoryName => ({
                    type: 'dir',
                    name: categoryName,
                    notes: categories[categoryName]
                }));
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

app.get('/api/github-notes', async (req, res) => {
    try {
        const notes = await getNotesFromGitHub();
        res.json({ success: true, notes: notes });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
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

        // Validate filename
        if (!/^[a-zA-Z0-9\s\-_.]+\.md$/.test(fileName)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid filename. Only letters, numbers, spaces, hyphens, underscores, and periods are allowed.'
            });
        }

        // Validate category
        if (!/^[a-zA-Z0-9\s\-_]+$/.test(category)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category name. Only letters, numbers, spaces, hyphens, and underscores are allowed.'
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
        const notes = await getNotesFromGitHub();
        res.json({ success: true, notes: notes });
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.json({ success: false, error: error.message, notes: [] });
    }
});

// Helper function to get notes from GitHub
// Helper function to get notes from GitHub - FIXED VERSION
async function getNotesFromGitHub() {
    const notes = [];
    
    try {
        // Get all categories (folders in notes/)
        const categories = await githubService.getContents('notes');
        
        console.log('📁 Categories found:', categories ? categories.length : 0);
        
        // If categories is already an array of notes (local mode) or empty
        if (Array.isArray(categories) && categories.length > 0 && categories[0].id) {
            console.log('📝 Returning local notes format');
            return categories;
        }
        
        // If no categories found or it's empty, try local notes
        if (!categories || categories.length === 0) {
            console.log('📝 No categories found, using local notes');
            const localNotes = githubService.getLocalNotesForAPI();
            return Array.isArray(localNotes) ? localNotes : [];
        }
        
        // GitHub directory structure - process each category
        for (const category of categories) {
            // Skip if it's not a directory or doesn't have a name
            if (category.type !== 'dir' || !category.name) {
                console.log('Skipping non-directory:', category);
                continue;
            }
            
            console.log(`📂 Processing category: ${category.name}`);
            
            try {
                // Get all files in this category
                const files = await githubService.getContents(`notes/${category.name}`);
                
                if (!files || !Array.isArray(files)) {
                    console.log(`No files found in category ${category.name}`);
                    continue;
                }
                
                console.log(`📄 Found ${files.length} files in ${category.name}`);
                
                for (const file of files) {
                    // Check if it's a markdown file
                    if (file.type === 'file' && file.name && file.name.endsWith('.md')) {
                        console.log(`📝 Processing file: ${file.name}`);
                        
                        try {
                            const noteContent = await githubService.getFileContent(file.download_url);
                            const notePreview = noteContent.substring(0, 150) + (noteContent.length > 150 ? '...' : '');
                            
                            notes.push({
                                id: file.sha || file.name,
                                title: file.name.replace('.md', ''),
                                category: category.name,
                                content: noteContent,
                                preview: notePreview,
                                url: file.html_url || `https://github.com/${githubService.owner}/${githubService.repo}/blob/${githubService.branch}/notes/${category.name}/${file.name}`,
                                lastModified: file.last_modified || new Date().toISOString()
                            });
                            
                            console.log(`✅ Added note: ${file.name}`);
                        } catch (fileError) {
                            console.error(`Error processing file ${file.name}:`, fileError);
                        }
                    }
                }
            } catch (categoryError) {
                console.error(`Error accessing category ${category.name}:`, categoryError);
                continue;
            }
        }
        
        console.log(`📝 Total notes found: ${notes.length}`);
        
        // If no notes found in GitHub, try local notes
        if (notes.length === 0) {
            const localNotes = githubService.getLocalNotesForAPI();
            console.log(`📝 Fallback to ${localNotes.length} local notes`);
            return Array.isArray(localNotes) ? localNotes : [];
        }
        
        return notes;
    } catch (error) {
        console.error('Error in getNotesFromGitHub:', error);
        // Return local notes as fallback
        const localNotes = githubService.getLocalNotesForAPI();
        console.log(`📝 Error fallback to ${localNotes.length} local notes`);
        return Array.isArray(localNotes) ? localNotes : [];
    }
}
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

