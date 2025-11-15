/**
 * Note upload functionality
 * Handles creating new notes and organizing by category
 */

// Initialize upload page
function initUpload() {
    // Check authentication
    if (!checkAuth()) {
        window.location.href = 'index.html';
        return;
    }
    
    // Set up category selector
    setupCategorySelector();
}

// Check authentication (same as dashboard)
function checkAuth() {
    const session = sessionStorage.getItem('notesAppSession');
    if (!session) return false;
    
    try {
        const sessionData = JSON.parse(session);
        return sessionData.loggedIn && (Date.now() - sessionData.timestamp < 2 * 60 * 60 * 1000);
    } catch (e) {
        return false;
    }
}

// Set up category selector with existing categories
function setupCategorySelector() {
    const categorySelect = document.getElementById('noteCategory');
    const customCategory = document.getElementById('customCategory');
    
    if (!categorySelect) return;
    
    // Default categories
    const categories = [
        'programming',
        'personal', 
        'finance',
        'misc',
        'work',
        'study',
        'ideas'
    ];
    
    // Populate category dropdown
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
        categorySelect.appendChild(option);
    });
    
    // Add "Other" option
    const otherOption = document.createElement('option');
    otherOption.value = 'other';
    otherOption.textContent = 'Other (specify below)';
    categorySelect.appendChild(otherOption);
    
    // Show/hide custom category input
    categorySelect.addEventListener('change', function() {
        if (this.value === 'other') {
            customCategory.style.display = 'block';
        } else {
            customCategory.style.display = 'none';
        }
    });
}

// Upload note to GitHub
async function uploadNote() {
    const filename = document.getElementById('noteName').value.trim();
    const content = document.getElementById('noteContent').value.trim();
    const categorySelect = document.getElementById('noteCategory');
    const customCategory = document.getElementById('customCategoryInput');
    
    // Validation
    if (!validateInputs(filename, content)) {
        return;
    }
    
    // Determine category
    let category = categorySelect.value;
    if (category === 'other' && customCategory) {
        category = customCategory.value.trim().toLowerCase();
    }
    
    if (!category) {
        alert('Please select or specify a category');
        return;
    }
    
    // Prepare file path
    const filePath = `notes/${category}/${filename}`;
    
    try {
        // Show loading state
        const uploadBtn = document.querySelector('#uploadBtn');
        const originalText = uploadBtn.innerHTML;
        uploadBtn.innerHTML = '<span class="loading-spinner"></span> Uploading...';
        uploadBtn.disabled = true;
        
        // Upload to GitHub
        await uploadToGitHub(filePath, content);
        
        // Success
        alert('Note uploaded successfully!');
        window.location.href = 'dashboard.html';
        
    } catch (error) {
        console.error('Upload error:', error);
        alert('Error uploading note: ' + error.message);
        
        // Reset button
        const uploadBtn = document.querySelector('#uploadBtn');
        uploadBtn.innerHTML = originalText;
        uploadBtn.disabled = false;
    }
}

// Validate inputs
function validateInputs(filename, content) {
    if (!filename) {
        alert('Please enter a filename');
        return false;
    }
    
    if (!filename.endsWith('.md')) {
        alert('Filename must end with .md');
        return false;
    }
    
    // Validate filename format
    const filenameRegex = /^[a-zA-Z0-9_-]+\.[a-zA-Z]+$/;
    if (!filenameRegex.test(filename)) {
        alert('Filename can only contain letters, numbers, hyphens, and underscores');
        return false;
    }
    
    if (!content) {
        alert('Please enter note content');
        return false;
    }
    
    return true;
}

// Upload to GitHub (simplified for GitHub Pages)
async function uploadToGitHub(filePath, content) {
    // Temporary testing - remove this in production
    if (typeof SECRET !== 'undefined' && SECRET.GITHUB_TOKEN) {
        const response = await fetch(`https://api.github.com/repos/${CONFIG.GITHUB_USERNAME}/${CONFIG.GITHUB_REPO}/contents/${filePath}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${SECRET.GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: `Add note: ${filename}`,
                content: Buffer.from(content).toString('base64')
            })
        });
        
        if (response.ok) return await response.json();
    }
    
    // Fallback to manual download
    throw new Error('Auto-upload not configured. Use manual download.');
}

// Alternative: Download note as file for manual upload
function downloadNote() {
    const filename = document.getElementById('noteName').value.trim();
    const content = document.getElementById('noteContent').value.trim();
    const categorySelect = document.getElementById('noteCategory');
    const customCategory = document.getElementById('customCategoryInput');
    
    if (!validateInputs(filename, content)) {
        return;
    }
    
    // Determine category
    let category = categorySelect.value;
    if (category === 'other' && customCategory) {
        category = customCategory.value.trim().toLowerCase();
    }
    
    // Create and download file
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert(`Note downloaded! Please manually add it to: notes/${category}/`);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initUpload);