/**
 * Simplified file upload with better error handling
 */

let selectedFile = null;

// Initialize upload page
function initUpload() {
    console.log('Initializing upload page...');

    if (!checkAuth()) {
        window.location.href = 'index.html';
        return;
    }

    setupFileUpload();
}

function setupFileUpload() {
    console.log('Setting up file upload...');
    
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('uploadArea');
    
    if (!fileInput || !uploadArea) {
        console.error('File upload elements not found');
        return;
    }
    
    // Make file input accessible
    // fileInput.style.position = 'absolute';
    // fileInput.style.width = '100%';
    // fileInput.style.height = '100%';
    // fileInput.style.opacity = '0';
    // fileInput.style.cursor = 'pointer';

    fileInput.style.display = 'none';
    
    // Click handler for upload area
    uploadArea.addEventListener('click', function(e) {
        // Don't trigger if clicking on close button or file info
        if (!e.target.classList.contains('btn-close') && 
            !e.target.closest('#fileInfo')) {
            fileInput.click();
        }
    });
    
    // File input change handler
    fileInput.addEventListener('change', function(e) {
        console.log('File input changed');
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            handleFileSelect(file);
        }
    });
    
    // Drag and drop support
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        if (e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            handleFileSelect(file);
        }
    });
    
    console.log('File upload setup completed');
}

function handleFileSelect(file) {
    console.log('Handling file:', file.name);
    
    if (!file) return;
    
    // Only validate that it's a markdown file, no size limits
    if (!file.name.toLowerCase().endsWith('.md')) {
        showAlert('Please select a Markdown (.md) file', 'warning');
        resetFileInput();
        return;
    }
    
    selectedFile = file;
    displayFileInfo(file);
}

function resetFileInput() {
    const fileInput = document.getElementById('fileInput');
    fileInput.value = '';
    selectedFile = null;
}

function clearFileSelection() {
    resetFileInput();
    const fileInfo = document.getElementById('fileInfo');
    if (fileInfo) {
        fileInfo.style.display = 'none';
    }
}

function displayFileInfo(file) {
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');

    if (fileInfo && fileName && fileSize) {
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        fileInfo.style.display = 'block';
        showAlert('File selected: ' + file.name, 'success');
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

async function uploadFile() {
    if (!selectedFile) {
        showAlert('Please select a markdown file first', 'warning');
        return;
    }

    const categorySelect = document.getElementById('noteCategory');
    const customCategoryInput = document.getElementById('customCategoryInput');

    let category = categorySelect.value;
    if (category === 'other') {
        category = customCategoryInput.value.trim().toLowerCase();
        if (!category) {
            showAlert('Please specify a custom category', 'warning');
            return;
        }
    }

    if (!category) {
        showAlert('Please select a category', 'warning');
        return;
    }

    try {
        const uploadBtn = document.getElementById('uploadBtn');
        const originalText = uploadBtn.innerHTML;
        uploadBtn.innerHTML = '<span class="loading-spinner"></span> Uploading...';
        uploadBtn.disabled = true;
        
        console.log('Reading file content...');
        const content = await readFileContent(selectedFile);
        console.log('File content read, length:', content.length);
        
        // FIXED: Better filename handling for mobile
        const originalFileName = selectedFile.name;
        const sanitizedFileName = originalFileName
            .replace(/[^a-zA-Z0-9\s\-_.]/g, '') // Remove special characters except allowed ones
            .replace(/\s+/g, '_'); // Replace spaces with underscores
        
        const fileName = sanitizedFileName || 'uploaded_note.md';
        
        const uploadData = {
            fileName: fileName,
            content: content,
            category: category,
            message: `Add note: ${originalFileName} in ${category}`
        };
        
        console.log('Sending upload request...');
        const response = await fetch('/api/upload-note', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(uploadData)
        });
        
        const result = await response.json();
        console.log('Upload response:', result);
        
        if (result.success) {
            showAlert('✅ Note uploaded successfully!', 'success');
            
            // Clear the form
            resetFileInput();
            categorySelect.value = '';
            if (customCategoryInput) customCategoryInput.value = '';
            document.getElementById('customCategory').style.display = 'none';
            document.getElementById('fileInfo').style.display = 'none';
            
            // Redirect to dashboard after short delay
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            throw new Error(result.message || 'Upload failed');
        }
        
    } catch (error) {
        console.error('Upload error:', error);
        showAlert('❌ Upload failed: ' + error.message, 'error');
        
        const uploadBtn = document.getElementById('uploadBtn');
        uploadBtn.innerHTML = 'Upload Note';
        uploadBtn.disabled = false;
    }
}

function showAlert(message, type = 'info') {
    // Remove any existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <span class="alert-message">${message}</span>
        <button class="alert-close" onclick="this.parentElement.remove()">×</button>
    `;

    document.body.appendChild(alertDiv);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 5000);
}

// Make functions globally available
window.uploadFile = uploadFile;
window.clearFileSelection = clearFileSelection;
window.initUpload = initUpload;

// Initialize on page load
document.addEventListener('DOMContentLoaded', initUpload);