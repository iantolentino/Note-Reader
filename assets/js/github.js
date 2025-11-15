/**
 * GitHub API integration for file operations
 */
class GitHubService {
    constructor() {
        this.baseURL = 'https://api.github.com';
    }

    async commitFile(fileName, content, category, message = 'Add new note') {
        try {
            // Get GitHub token from secure source (should be server-side)
            const token = await this.getGitHubToken();
            
            const path = `notes/${category}/${fileName}`;
            const encodedContent = btoa(unescape(encodeURIComponent(content)));
            
            const response = await fetch(`${this.baseURL}/repos/${CONFIG.GITHUB.OWNER}/${CONFIG.GITHUB.REPO}/contents/${path}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify({
                    message: message,
                    content: encodedContent,
                    branch: CONFIG.GITHUB.BRANCH
                })
            });

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }

            const result = await response.json();
            return result.content.html_url;
            
        } catch (error) {
            console.error('GitHub commit failed:', error);
            throw error;
        }
    }

    async getGitHubToken() {
        // In a real application, this should be handled server-side
        // For now, we'll use a proxy approach
        try {
            const response = await fetch('/api/github-token');
            if (response.ok) {
                const data = await response.json();
                return data.token;
            }
            throw new Error('Failed to get GitHub token');
        } catch (error) {
            console.error('Token retrieval failed:', error);
            throw new Error('GitHub integration not configured properly');
        }
    }

    async getFiles() {
        try {
            const response = await fetch(`${this.baseURL}/repos/${CONFIG.GITHUB.OWNER}/${CONFIG.GITHUB.REPO}/contents/notes?ref=${CONFIG.GITHUB.BRANCH}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch files from GitHub');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching files:', error);
            return [];
        }
    }
}

const githubService = new GitHubService();