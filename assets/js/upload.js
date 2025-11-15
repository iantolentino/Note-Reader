/**
 * File upload functionality for markdown files
 */

let selectedFile = null;

// Initialize upload page
function initUpload() {
    if (!checkAuth()) {
        window.location.href = 'index.html';
        return;
    }
    
    setupCategorySelector();
    setupFileUpload();
}

// Check authentication
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

// Setup category selector
function setupCategorySelector() {
    const categorySelect = document.getElementById('noteCategory');
    const customCategory = document.getElementById('customCategory');
    
    categorySelect.addEventListener('change', function() {
        if (this.value === 'other') {
            customCategory.style.display = 'block';
        } else {
            customCategory.style.display = 'none';
        }
    });
}

// Setup file upload with drag and drop
function setupFileUpload() {
    const fileUploadArea = document.getElementById('fileUploadArea');
    const fileInput = document.getElementById('fileInput');
    
    // Drag and drop functionality
    fileUploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('dragover');
    });
    
    fileUploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
    });
    
    fileUploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect({ target: { files: files } });
        }
    });
}

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.name.endsWith('.md')) {
        alert('Please select a .md file');
        return;
    }
    
    selectedFile = file;
    displayFileInfo(file);
}

// Display file information
function displayFileInfo(file) {
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    fileInfo.style.display = 'block';
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Upload file
async function uploadFile() {
    const categorySelect = document.getElementById('noteCategory');
    const customCategory = document.getElementById('customCategoryInput');
    
    // Validation
    if (!selectedFile) {
        alert('Please select a markdown file to upload');
        return;
    }
    
    const category = categorySelect.value === 'other' 
        ? customCategory?.value.trim().toLowerCase() 
        : categorySelect.value;
    
    if (!category) {
        alert('Please select or specify a category');
        return;
    }
    
    try {
        // Show loading state
        const uploadBtn = document.getElementById('uploadBtn');
        const originalText = uploadBtn.innerHTML;
        uploadBtn.innerHTML = '<span class="loading-spinner"></span> Uploading...';
        uploadBtn.disabled = true;
        
        // Read file content
        const content = await readFileContent(selectedFile);
        
        // Prepare file data
        const fileData = {
            filename: selectedFile.name,
            category: category,
            content: content,
            timestamp: new Date().toISOString()
        };
        
        // Save to local storage (simulating upload)
        await saveNoteToStorage(fileData);
        
        // Success
        alert('File uploaded successfully!');
        window.location.href = 'dashboard.html';
        
    } catch (error) {
        console.error('Upload error:', error);
        alert('Error uploading file: ' + error.message);
        
        // Reset button
        const uploadBtn = document.getElementById('uploadBtn');
        uploadBtn.innerHTML = originalText;
        uploadBtn.disabled = false;
    }
}

// Read file content
function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            resolve(e.target.result);
        };
        
        reader.onerror = function(e) {
            reject(new Error('Failed to read file'));
        };
        
        reader.readAsText(file);
    });
}

// Save note to local storage (simulating server upload)
function saveNoteToStorage(fileData) {
    return new Promise((resolve) => {
        // Get existing notes
        const existingNotes = JSON.parse(localStorage.getItem('userNotes') || '[]');
        
        // Add new note
        const newNote = {
            id: Date.now().toString(),
            title: fileData.filename.replace('.md', '').replace(/-/g, ' '),
            category: fileData.category,
            path: `notes/${fileData.category}/${fileData.filename}`,
            date: new Date().toISOString().split('T')[0],
            content: fileData.content,
            preview: fileData.content.substring(0, 200) + '...'
        };
        
        existingNotes.push(newNote);
        localStorage.setItem('userNotes', JSON.stringify(existingNotes));
        
        resolve(newNote);
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initUpload);