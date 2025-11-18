/**
 * Create note functionality
 */

// Initialize create page
function initCreate() {
    console.log('Initializing create page...');
    
    if (!checkAuth()) {
        console.log('Not authenticated, redirecting to login');
        window.location.href = 'index.html';
        return;
    }
    
    console.log('User is authenticated');
    setupCategorySelector();
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

// Enhanced create function with better mobile UX
async function createNote() {
    const titleInput = document.getElementById('noteTitle');
    const categorySelect = document.getElementById('noteCategory');
    const customCategoryInput = document.getElementById('customCategoryInput');
    const contentInput = document.getElementById('markdownInput');
    
    if (!titleInput.value.trim()) {
        showAlert('Please enter a title for your note', 'warning');
        titleInput.focus();
        return;
    }
    
    if (!contentInput.value.trim()) {
        showAlert('Please enter content for your note', 'warning');
        contentInput.focus();
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
        const createBtn = document.getElementById('createBtn');
        const originalText = createBtn.innerHTML;
        createBtn.innerHTML = '<span class="loading-spinner"></span> Creating...';
        createBtn.disabled = true;
        
        const content = contentInput.value;
        
        // FIXED: Better filename sanitization for mobile
        const title = titleInput.value.trim();
        const sanitizedTitle = title
            .replace(/[^a-zA-Z0-9\s\-_]/g, '') // Remove special characters except spaces, hyphens, underscores
            .replace(/\s+/g, '_') // Replace spaces with underscores
            .substring(0, 100); // Limit length
        
        const fileName = `${sanitizedTitle || 'note'}.md`;
        
        console.log('Creating note:', fileName, 'Category:', category);
        
        // Upload to server
        const uploadData = {
            fileName: fileName,
            content: content,
            category: category,
            message: `Create note: ${title} in ${category}`
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
            showAlert('✅ Note created successfully!', 'success');
            // Reset form
            titleInput.value = '';
            categorySelect.value = '';
            contentInput.value = '';
            if (customCategoryInput) customCategoryInput.value = '';
            document.getElementById('customCategory').style.display = 'none';
            document.getElementById('markdownPreview').innerHTML = '';
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
        } else {
            throw new Error(result.message || 'Creation failed');
        }
        
    } catch (error) {
        console.error('Create error:', error);
        showAlert('❌ Creation failed: ' + error.message, 'error');
        
        const createBtn = document.getElementById('createBtn');
        createBtn.innerHTML = 'Create Note';
        createBtn.disabled = false;
    }
}

// Alert system
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
document.addEventListener('DOMContentLoaded');