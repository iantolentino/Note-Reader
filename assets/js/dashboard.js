
/**
 * Enhanced dashboard with GitHub integration
 */

let notesIndex = [];
let allNotes = [];

// Initialize dashboard
async function initDashboard() {
    if (!checkAuth()) {
        window.location.href = 'index.html';
        return;
    }
    
    try {
        showLoadingState();
        await loadNotes();
        
        console.log('Notes loaded:', notesIndex);
        
        if (notesIndex.length === 0) {
            console.log('No notes found - showing empty state');
        }
        
        renderNotesList(notesIndex);
        updateStats(notesIndex);
        updateResultsCount(notesIndex);
        
    } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        showErrorState('Failed to load notes: ' + error.message);
    }
}
// Enhanced notes loading
async function loadNotes() {
    try {
        console.log('🔄 Loading notes from GitHub...');
        
        // Try to load from server first (GitHub)
        const response = await fetch('/api/notes');
        console.log('API Response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('API Response data:', data);
            
            if (data.success && data.notes) {
                notesIndex = data.notes;
                allNotes = [...data.notes];
                console.log(`✅ Loaded ${notesIndex.length} notes from GitHub`);
                return;
            } else {
                console.log('❌ API returned unsuccessful:', data);
            }
        } else {
            console.log('❌ API request failed:', response.status, response.statusText);
        }
        
        // If we get here, server load failed
        throw new Error('Server load failed');
        
    } catch (error) {
        console.error('Error loading notes from GitHub:', error);
        
        // Fallback to local storage
        const userNotes = JSON.parse(localStorage.getItem('userNotes') || '[]');
        notesIndex = userNotes;
        allNotes = [...userNotes];
        console.log(`📱 Loaded ${notesIndex.length} notes from local storage as fallback`);
    }
}

function renderNotesList(notes) {
    const notesList = document.getElementById('notesList');
    const noResults = document.getElementById('noResults');
    
    if (!notesList) return;
    
    if (notes.length === 0) {
        notesList.innerHTML = '';
        noResults.style.display = 'block';
        return;
    }
    
    noResults.style.display = 'none';
    
    notesList.innerHTML = notes.map(note => `
        <div class="note-card" onclick="viewNote('${note.id}')">
            <div class="note-header">
                <div class="note-avatar">
                    ${note.category ? note.category.charAt(0).toUpperCase() : 'N'}
                </div>
                <div class="note-meta">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <div class="note-author">${note.title || 'Untitled Note'}</div>
                            <div class="note-category">${note.category || 'uncategorized'}</div>
                        </div>
                        <div class="note-date">${formatDate(note.lastModified || note.date)}</div>
                    </div>
                </div>
            </div>
            <div class="note-content">
                <div class="note-preview">${note.preview || 'No preview available'}</div>
            </div>
            <div class="note-actions">
                <button class="note-action" onclick="event.stopPropagation(); viewOnGitHub('${note.url}')">
                    <span>View on GitHub</span>
                </button>
                <button class="note-action" onclick="event.stopPropagation(); shareNote('${note.id}')">
                    <span>Share</span>
                </button>
            </div>
        </div>
    `).join('');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function updateStats(notes) {
    document.getElementById('totalNotes').textContent = notes.length;
    
    const categories = [...new Set(notes.map(note => note.category))];
    document.getElementById('totalCategories').textContent = categories.length;
    
    const thisMonth = notes.filter(note => {
        const noteDate = new Date(note.lastModified || note.date);
        const now = new Date();
        return noteDate.getMonth() === now.getMonth() && 
               noteDate.getFullYear() === now.getFullYear();
    });
    document.getElementById('recentNotes').textContent = thisMonth.length;
}

function updateResultsCount(notes) {
    document.getElementById('resultsCount').textContent = `${notes.length} notes`;
}

function filterResults() {
    const searchTerm = document.getElementById('searchBox').value.toLowerCase().trim();
    
    if (!searchTerm) {
        notesIndex = [...allNotes];
    } else {
        notesIndex = allNotes.filter(note => 
            (note.title && note.title.toLowerCase().includes(searchTerm)) ||
            (note.category && note.category.toLowerCase().includes(searchTerm)) ||
            (note.content && note.content.toLowerCase().includes(searchTerm)) ||
            (note.preview && note.preview.toLowerCase().includes(searchTerm))
        );
    }
    
    renderNotesList(notesIndex);
    updateResultsCount(notesIndex);
}

function viewNote(noteId) {
    const note = allNotes.find(n => n.id === noteId);
    if (note && note.url) {
        window.open(note.url, '_blank');
    } else {
        alert('Note URL not available');
    }
}

function viewOnGitHub(url) {
    if (url) {
        window.open(url, '_blank');
    }
}

function shareNote(noteId) {
    const note = allNotes.find(n => n.id === noteId);
    if (note && navigator.share) {
        navigator.share({
            title: note.title,
            text: note.preview,
            url: note.url
        });
    } else if (note) {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(note.url || note.title);
        showAlert('Note link copied to clipboard!');
    }
}

function showLoadingState() {
    const notesList = document.getElementById('notesList');
    if (notesList) {
        notesList.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading your notes...</p>
            </div>
        `;
    }
}

function showErrorState(message) {
    const notesList = document.getElementById('notesList');
    if (notesList) {
        notesList.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <h5>${message}</h5>
                <button onclick="initDashboard()" class="btn btn-primary">Retry</button>
            </div>
        `;
    }
}

function showAlert(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'custom-alert alert-success';
    alertDiv.innerHTML = `
        <div class="alert-content">
            <span class="alert-message">${message}</span>
            <button class="alert-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 3000);
}

// Add these new functions to dashboard.js
function refreshNotes() {
    showLoadingState();
    setTimeout(async () => {
        await loadNotes();
        renderNotesList(notesIndex);
        updateStats(notesIndex);
        updateResultsCount(notesIndex);
        showAlert('Notes refreshed successfully!', 'success');
    }, 1000);
}

function exportNotes() {
    const dataStr = JSON.stringify(allNotes, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = 'notes-export.json';
    link.click();
    
    showAlert('Notes exported successfully!', 'success');
}

// Update the render function to use the new design
function renderNotesList(notes) {
    const notesList = document.getElementById('notesList');
    const noResults = document.getElementById('noResults');
    
    if (!notesList) return;
    
    if (notes.length === 0) {
        notesList.innerHTML = '';
        noResults.style.display = 'block';
        return;
    }
    
    noResults.style.display = 'none';
    
    notesList.innerHTML = notes.map(note => `
        <div class="note-card" onclick="viewNote('${note.id}')">
            <div class="note-header">
                <div class="note-avatar">
                    ${note.category ? note.category.charAt(0).toUpperCase() : 'N'}
                </div>
                <div class="note-meta">
                    <div class="d-flex justify-content-between align-items-start w-100">
                        <div class="flex-grow-1">
                            <div class="note-author">${note.title || 'Untitled Note'}</div>
                            <div class="note-category">${note.category || 'uncategorized'}</div>
                        </div>
                        <div class="note-date">${formatDate(note.lastModified || note.date)}</div>
                    </div>
                </div>
            </div>
            <div class="note-content">
                <div class="note-preview">${note.preview || 'No preview available'}</div>
            </div>
            <div class="note-actions">
                <button class="note-action" onclick="event.stopPropagation(); viewOnGitHub('${note.url}')">
                    <span>View on GitHub</span>
                </button>
                <button class="note-action" onclick="event.stopPropagation(); shareNote('${note.id}')">
                    <span>Share</span>
                </button>
            </div>
        </div>
    `).join('');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initDashboard);