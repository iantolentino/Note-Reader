/**
 * Enhanced dashboard with GitHub integration - Fixed Notes Loading
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
        
        console.log('Notes loaded:', notesIndex.length, 'notes');
        
        renderNotesList(notesIndex);
        updateStats(notesIndex);
        updateResultsCount(notesIndex);
        
    } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        showErrorState('Failed to load notes: ' + error.message);
    }
}

// Enhanced notes loading that works with your GitHub structure
async function loadNotes() {
    try {
        console.log('🔄 Loading notes from server...');
        
        const response = await fetch('/api/notes');
        console.log('API Response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('API Response success:', data.success);
            console.log('Notes count:', data.notes ? data.notes.length : 0);
            
            if (data.success && data.notes) {
                notesIndex = data.notes;
                allNotes = [...data.notes];
                console.log(`✅ Loaded ${notesIndex.length} notes from server`);
                return;
            }
        }
        
        throw new Error('Server load failed');
        
    } catch (error) {
        console.error('Error loading notes from server:', error);
        // Fallback to empty array
        notesIndex = [];
        allNotes = [];
    }
}


// Direct GitHub notes loading as fallback
async function loadNotesFromGitHub() {
    try {
        console.log('🔄 Loading notes directly from GitHub...');
        
        const response = await fetch('/api/github-notes');
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.notes) {
                notesIndex = data.notes;
                allNotes = [...data.notes];
                console.log(`✅ Loaded ${notesIndex.length} notes from GitHub`);
                return;
            }
        }
        
        // Final fallback: local storage
        const userNotes = JSON.parse(localStorage.getItem('userNotes') || '[]');
        notesIndex = userNotes;
        allNotes = [...userNotes];
        console.log(`📱 Loaded ${notesIndex.length} notes from local storage`);
        
    } catch (error) {
        console.error('GitHub direct load failed:', error);
        const userNotes = JSON.parse(localStorage.getItem('userNotes') || '[]');
        notesIndex = userNotes;
        allNotes = [...userNotes];
    }
}

function updateStats(notes) {
    const totalNotesElem = document.getElementById('totalNotesMini');
    const totalCategoriesElem = document.getElementById('totalCategoriesMini');
    const recentNotesElem = document.getElementById('recentNotesMini');
    
    if (totalNotesElem) {
        totalNotesElem.textContent = notes.length;
    }
    
    const categories = [...new Set(notes.map(note => note.category))];
    if (totalCategoriesElem) {
        totalCategoriesElem.textContent = categories.length;
    }
    
    const thisMonth = notes.filter(note => {
        const noteDate = new Date(note.lastModified || note.date);
        const now = new Date();
        return noteDate.getMonth() === now.getMonth() && 
               noteDate.getFullYear() === now.getFullYear();
    });
    
    if (recentNotesElem) {
        recentNotesElem.textContent = thisMonth.length;
    }
}

function updateResultsCount(notes) {
    const resultsCountElem = document.getElementById('resultsCount');
    if (resultsCountElem) {
        resultsCountElem.textContent = `${notes.length} notes`;
    }
}

function renderNotesList(notes) {
    const notesList = document.getElementById('notesList');
    const noResults = document.getElementById('noResults');
    
    if (!notesList) {
        console.error('Notes list element not found');
        return;
    }
    
    console.log('Rendering notes:', notes);
    
    if (notes.length === 0) {
        notesList.innerHTML = '';
        if (noResults) {
            noResults.style.display = 'block';
        }
        return;
    }
    
    if (noResults) {
        noResults.style.display = 'none';
    }
    
    // Sort notes by date (newest first)
    notes.sort((a, b) => new Date(b.lastModified || b.date) - new Date(a.lastModified || a.date));
    
    notesList.innerHTML = notes.map(note => {
        const noteId = note.id || note.sha || 'unknown';
        const noteTitle = note.title || 'Untitled Note';
        const noteCategory = note.category || 'uncategorized';
        const noteDate = formatDate(note.lastModified || note.date);
        const notePreview = note.preview || (note.content ? note.content.substring(0, 150) + '...' : 'No preview available');
        const noteUrl = note.url || note.html_url || '#';
        
        return `
        <div class="note-card" onclick="viewNote('${noteId}')">
            <div class="note-header">
                <div class="note-avatar">
                    ${noteCategory.charAt(0).toUpperCase()}
                </div>
                <div class="note-meta">
                    <div class="d-flex justify-content-between align-items-start w-100">
                        <div class="flex-grow-1">
                            <div class="note-author">${noteTitle}</div>
                            <div class="note-category">${noteCategory}</div>
                        </div>
                        <div class="note-date">${noteDate}</div>
                    </div>
                </div>
            </div>
            <div class="note-content">
                <div class="note-preview">${notePreview}</div>
            </div>
            <div class="note-actions">
                ${noteUrl && noteUrl !== '#' && noteUrl !== '#local' ? `
                <a href="${noteUrl}" target="_blank" class="note-action" onclick="event.stopPropagation()">
                    <span>View on GitHub</span>
                </a>
                ` : `
                <button class="note-action" onclick="event.stopPropagation(); viewNote('${noteId}')">
                    <span>View Note</span>
                </button>
                `}
                <button class="note-action" onclick="event.stopPropagation(); shareNote('${noteId}')">
                    <span>Share</span>
                </button>
            </div>
        </div>
        `;
    }).join('');
}

function formatDate(dateString) {
    try {
        let date;
        
        if (dateString.includes('T')) {
            date = new Date(dateString);
        } else if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
            date = new Date(dateString + 'T12:00:00Z');
        } else {
            date = new Date();
        }
        
        if (isNaN(date.getTime())) {
            return 'Recent';
        }
        
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    } catch (e) {
        return 'Recent';
    }
}

function filterResults() {
    const searchBox = document.getElementById('searchBox');
    if (!searchBox) return;
    
    const searchTerm = searchBox.value.toLowerCase().trim();
    
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
    if (note && note.url && note.url !== '#' && note.url !== '#local') {
        window.open(note.url, '_blank');
    } else if (note && note.content) {
        showNoteModal(note);
    } else {
        alert('Note content not available');
    }
}

function showNoteModal(note) {
    const modalHtml = `
        <div class="modal-overlay" id="noteModal" style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        ">
            <div class="modal-content" style="
                background: var(--card-bg);
                padding: 2rem;
                border-radius: var(--radius-lg);
                max-width: 90%;
                max-height: 90%;
                overflow: auto;
                position: relative;
                color: var(--text);
            ">
                <button onclick="closeNoteModal()" style="
                    position: absolute;
                    top: 1rem;
                    right: 1rem;
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: var(--text);
                ">×</button>
                <h2 style="margin-bottom: 1rem;">${note.title || 'Untitled Note'}</h2>
                <div class="note-meta" style="margin-bottom: 1rem; display: flex; align-items: center;">
                    <span class="note-category">${note.category || 'uncategorized'}</span>
                    <span style="margin: 0 1rem;">•</span>
                    <span class="note-date">${formatDate(note.lastModified || note.date)}</span>
                </div>
                <div class="note-content" style="white-space: pre-wrap; line-height: 1.6;">${note.content || 'No content available'}</div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeNoteModal() {
    const modal = document.getElementById('noteModal');
    if (modal) {
        modal.remove();
    }
}

function shareNote(noteId) {
    const note = allNotes.find(n => n.id === noteId);
    if (note && navigator.share) {
        navigator.share({
            title: note.title,
            text: note.preview,
            url: note.url || window.location.href
        });
    } else if (note) {
        const noteText = `${note.title}\n\n${note.preview}\n\n${note.url || 'Local note'}`;
        navigator.clipboard.writeText(noteText);
        showAlert('Note info copied to clipboard!');
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
            <div class="error-state text-center">
                <div class="empty-icon">⚠️</div>
                <h5 class="mt-3">${message}</h5>
                <button onclick="initDashboard()" class="btn btn-primary mt-2">Retry</button>
            </div>
        `;
    }
}

function showAlert(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success';
    alertDiv.innerHTML = `
        <span class="alert-message">${message}</span>
        <button class="alert-close" onclick="this.parentElement.remove()">×</button>
    `;
    document.body.appendChild(alertDiv);
    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 3000);
}

function refreshNotes() {
    showLoadingState();
    setTimeout(async () => {
        await loadNotes();
        renderNotesList(notesIndex);
        updateStats(notesIndex);
        updateResultsCount(notesIndex);
        showAlert('Notes refreshed successfully!');
    }, 1000);
}

function exportNotes() {
    const dataStr = JSON.stringify(allNotes, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = 'notes-export.json';
    link.click();
    
    showAlert('Notes exported successfully!');
}

// Debug functions
window.debugNotes = {
    showAllNotes: () => console.log('All notes:', allNotes),
    showNotesIndex: () => console.log('Notes index:', notesIndex),
    reloadNotes: () => loadNotes().then(() => renderNotesList(notesIndex)),
    addSamples: () => addSampleNotes(),
    testAPI: () => fetch('/api/notes').then(r => r.json()).then(console.log)
};

// Add search functionality
document.addEventListener('DOMContentLoaded', function() {
    const searchBox = document.getElementById('searchBox');
    if (searchBox) {
        searchBox.addEventListener('input', filterResults);
    }
    
    initDashboard();
});