const axios = require('axios');
require('dotenv').config();

async function setupRepository() {
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;

    if (!token || !owner || !repo) {
        console.error('Missing GitHub configuration in .env file');
        process.exit(1);
    }

    try {
        // Check if repository exists
        console.log('Checking repository...');
        await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        console.log('✅ Repository exists');

        // Create notes directory structure
        console.log('Setting up directory structure...');
        await createDirectory('notes');
        await createDirectory('notes/programming');
        await createDirectory('notes/personal');
        await createDirectory('notes/work');
        await createDirectory('notes/study');
        await createDirectory('notes/ideas');

        console.log('✅ Setup completed successfully!');

    } catch (error) {
        if (error.response?.status === 404) {
            console.log('Repository does not exist. Please create it first on GitHub.');
            console.log(`Create here: https://github.com/new?name=${repo}`);
        } else {
            console.error('Setup failed:', error.response?.data || error.message);
        }
    }
}

async function createDirectory(path) {
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;

    try {
        // Create directory by adding a README file
        await axios.put(
            `https://api.github.com/repos/${owner}/${repo}/contents/${path}/README.md`,
            {
                message: `Create ${path} directory`,
                content: Buffer.from(`# ${path}\n\nThis directory contains notes.`).toString('base64')
            },
            {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log(`✅ Created directory: ${path}`);
    } catch (error) {
        if (error.response?.status === 422) {
            console.log(`📁 Directory already exists: ${path}`);
        } else {
            console.error(`❌ Failed to create directory ${path}:`, error.response?.data?.message);
        }
    }
}

setupRepository();