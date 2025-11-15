/**
 * Enhanced file upload with GitHub integration - Mobile Optimized
 */

let selectedFile = null;

// Initialize upload page
function initUpload() {
    console.log('Initializing upload page...');
    
    if (!checkAuth()) {
        console.log('Not authenticated, redirecting to login');
        window.location.href = 'index.html';
        return;
    }
    
    console.log('User is authenticated');
    setupCategorySelector();
    setupFileUpload();
    checkGitHubStatus();
}

function setupCategorySelector() {
    const categorySelect = document.getElementById('noteCategory');
    const customCategoryDiv = document.getElementById('customCategory');
    
    if (!categorySelect || !customCategoryDiv) {
        console.error('Category elements not found');
        return;
    }
    
    categorySelect.addEventListener('change', function() {
        if (this.value === 'other') {
            customCategoryDiv.style.display = 'block';
            // Add placeholder and focus
            const customInput = document.getElementById('customCategoryInput');
            if (customInput) {
                customInput.placeholder = 'Enter category name...';
                setTimeout(() => customInput.focus(), 100);
            }
        } else {
            customCategoryDiv.style.display = 'none';
        }
    });
    
    console.log('Category selector setup complete');
}

function setupFileUpload() {
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('fileUploadArea');
    
    if (!fileInput || !uploadArea) {
        console.error('File upload elements not found');
        return;
    }
    
    // Click handler for upload area
    uploadArea.addEventListener('click', (e) => {
        // Only trigger if clicking the upload area itself or its direct children
        if (e.target === uploadArea || 
            e.target.classList.contains('upload-icon') || 
            e.target.tagName === 'H5' || 
            e.target.tagName === 'P' ||
            e.target.classList.contains('btn')) {
            e.preventDefault();
            e.stopPropagation();
            fileInput.click();
        }
    });
    
    // File input change handler
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop (for desktop)
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        if (!uploadArea.contains(e.relatedTarget)) {
            uploadArea.classList.remove('dragover');
        }
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect({ target: { files: files } });
        }
    });
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.name.endsWith('.md')) {
        showAlert('Please select a Markdown (.md) file', 'error');
        resetFileInput();
        return;
    }
    
    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
        showAlert('File size too large. Please select a file smaller than 10MB.', 'error');
        resetFileInput();
        return;
    }
    
    selectedFile = file;
    displayFileInfo(file);
    
    // Auto-focus on category selection after file is chosen
    setTimeout(() => {
        document.getElementById('noteCategory').focus();
    }, 300);
}

function resetFileInput() {
    const fileInput = document.getElementById('fileInput');
    fileInput.value = '';
    selectedFile = null;
}

function clearFileSelection() {
    resetFileInput();
    document.getElementById('fileInfo').style.display = 'none';
}

function displayFileInfo(file) {
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    
    if (fileInfo && fileName && fileSize) {
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        fileInfo.style.display = 'block';
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

// Enhanced upload function with better mobile UX
async function uploadFile() {
    const categorySelect = document.getElementById('noteCategory');
    const customCategoryInput = document.getElementById('customCategoryInput');
    
    if (!selectedFile) {
        showAlert('Please select a markdown file to upload', 'warning');
        return;
    }
    
    let category = categorySelect.value;
    if (category === 'other') {
        category = customCategoryInput?.value.trim().toLowerCase();
        if (!category) {
            showAlert('Please specify a custom category', 'warning');
            customCategoryInput?.focus();
            return;
        }
    }
    
    if (!category) {
        showAlert('Please select or specify a category', 'warning');
        categorySelect.focus();
        return;
    }

    try {
        const uploadBtn = document.getElementById('uploadBtn');
        const originalText = uploadBtn.innerHTML;
        uploadBtn.innerHTML = '<span class="loading-spinner"></span> Uploading...';
        uploadBtn.disabled = true;
        
        // Show progress for large files
        if (selectedFile.size > 1024 * 1024) { // Over 1MB
            showAlert('Uploading large file, please wait...', 'info');
        }
        
        const content = await readFileContent(selectedFile);
        
        console.log('Uploading file:', selectedFile.name, 'Category:', category);
        
        // Upload to server
        const uploadData = {
            fileName: selectedFile.name.endsWith('.md') ? selectedFile.name : selectedFile.name + '.md',
            content: content,
            category: category,
            message: `Add note: ${selectedFile.name} in ${category}`
        };
        
        const response = await fetch('/api/upload-note', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(uploadData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('✅ Note uploaded to GitHub successfully!', 'success');
            // Reset form
            clearFileSelection();
            categorySelect.value = '';
            document.getElementById('customCategoryInput').value = '';
            document.getElementById('customCategory').style.display = 'none';
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
        } else {
            // Better error messages
            let errorMsg = result.message || 'Upload failed';
            if (errorMsg.includes('Bad credentials')) {
                errorMsg = 'GitHub authentication failed. Check your token in the .env file.';
            } else if (errorMsg.includes('Not Found')) {
                errorMsg = 'Repository not found. Check GITHUB_OWNER and GITHUB_REPO in .env.';
            } else if (errorMsg.includes('large')) {
                errorMsg = 'File too large for GitHub. Try a smaller file.';
            }
            throw new Error(errorMsg);
        }
        
    } catch (error) {
        console.error('Upload error:', error);
        showAlert('❌ Upload failed: ' + error.message, 'error');
        
        const uploadBtn = document.getElementById('uploadBtn');
        uploadBtn.innerHTML = 'Upload to GitHub';
        uploadBtn.disabled = false;
    }
}

// Alert system
function showAlert(message, type = 'info') {
    // Remove any existing alerts
    const existingAlerts = document.querySelectorAll('.custom-alert');
    existingAlerts.forEach(alert => alert.remove());
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `custom-alert alert-${type}`;
    alertDiv.innerHTML = `
        <div class="alert-content">
            <span class="alert-message">${message}</span>
            <button class="alert-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 5000);
}

async function checkGitHubStatus() {
    try {
        const response = await fetch('/api/github-token');
        const data = await response.json();
        
        if (!data.hasToken) {
            showAlert('GitHub not configured - notes will be saved locally only', 'warning');
        }
    } catch (error) {
        console.log('GitHub status check failed:', error);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initUpload);