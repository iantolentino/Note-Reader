/**
 * Enhanced file upload with GitHub integration
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
                customInput.focus();
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
    
    // Remove all existing event listeners first
    uploadArea.replaceWith(uploadArea.cloneNode(true));
    const newUploadArea = document.getElementById('fileUploadArea');
    const newFileInput = document.getElementById('fileInput');
    
    // Single click handler - only trigger on actual area click
    newUploadArea.addEventListener('click', (e) => {
        // Only trigger if clicking the upload area itself, not children
        if (e.target === newUploadArea || 
            e.target.classList.contains('upload-icon') || 
            e.target.tagName === 'H5' || 
            e.target.tagName === 'P') {
            e.preventDefault();
            e.stopPropagation();
            newFileInput.click();
        }
    });
    
    // File input change handler
    newFileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    newUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        newUploadArea.style.borderColor = '#ffffff';
        newUploadArea.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    });
    
    newUploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        if (!newUploadArea.contains(e.relatedTarget)) {
            newUploadArea.style.borderColor = '#38444d';
            newUploadArea.style.backgroundColor = 'transparent';
        }
    });
    
    newUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        newUploadArea.style.borderColor = '#38444d';
        newUploadArea.style.backgroundColor = 'transparent';
        
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
        event.target.value = ''; // Reset input
        return;
    }
    
    selectedFile = file;
    displayFileInfo(file);
    
    // Auto-focus on category selection after file is chosen
    document.getElementById('noteCategory').focus();
}

function resetFileInput() {
    const fileInput = document.getElementById('fileInput');
    fileInput.value = '';
}

function displayFileInfo(file) {
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    fileInfo.style.display = 'block';
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

// Enhanced upload function
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
            return;
        }
    }
    
    if (!category) {
        showAlert('Please select or specify a category', 'warning');
        return;
    }

    try {
        const uploadBtn = document.getElementById('uploadBtn');
        const originalText = uploadBtn.innerHTML;
        uploadBtn.innerHTML = '<span class="loading-spinner"></span> Uploading...';
        uploadBtn.disabled = true;
        
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
            selectedFile = null;
            document.getElementById('fileInfo').style.display = 'none';
            document.getElementById('fileInput').value = '';
            categorySelect.value = '';
            
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
            }
            throw new Error(errorMsg);
        }
        
    } catch (error) {
        console.error('Upload error:', error);
        showAlert('❌ Upload failed: ' + error.message, 'error');
        
        const uploadBtn = document.getElementById('uploadBtn');
        uploadBtn.innerHTML = 'Upload File';
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