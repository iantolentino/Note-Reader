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
            // Add sample notes if no notes exist
            addSampleNotes();
        }
        
        renderNotesList(notesIndex);
        updateStats(notesIndex);
        updateResultsCount(notesIndex);
        
    } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        showErrorState('Failed to load notes: ' + error.message);
    }
}

// Enhanced notes loading with better debugging
async function loadNotes() {
    try {
        console.log('🔄 Loading notes from server...');
        
        // Try to load from server first (GitHub + local)
        const response = await fetch('/api/notes');
        console.log('API Response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('API Response data:', data);
            
            if (data.success && data.notes) {
                notesIndex = data.notes;
                allNotes = [...data.notes];
                console.log(`✅ Loaded ${notesIndex.length} notes from server`);
                console.log('Notes details:', notesIndex.map(n => ({ title: n.title, category: n.category, id: n.id })));
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
        console.error('Error loading notes from server:', error);
        
        // Fallback to local storage only
        const userNotes = JSON.parse(localStorage.getItem('userNotes') || '[]');
        notesIndex = userNotes;
        allNotes = [...userNotes];
        console.log(`📱 Loaded ${notesIndex.length} notes from local storage as fallback`);
    }
}

function updateStats(notes) {
    // Only update elements that exist
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
        // Handle both GitHub and local notes
        const noteUrl = note.url || '#';
        const noteId = note.id || note.sha || 'unknown';
        const noteTitle = note.title || 'Untitled Note';
        const noteCategory = note.category || 'uncategorized';
        const noteDate = formatDate(note.lastModified || note.date);
        const notePreview = note.preview || (note.content ? note.content.substring(0, 150) + '...' : 'No preview available');
        const isLocalNote = noteUrl === '#local' || noteId.startsWith('local-');
        
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
                ${!isLocalNote && noteUrl !== '#' ? `
                <a href="${noteUrl}" target="_blank" class="note-action" onclick="event.stopPropagation()">
                    <span>${noteUrl.includes('github.com') ? 'View on GitHub' : 'View Note'}</span>
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
        // Handle various date formats
        let date;
        
        if (dateString.includes('T')) {
            // ISO format (2023-12-25T10:30:00Z)
            date = new Date(dateString);
        } else if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // YYYY-MM-DD format
            date = new Date(dateString + 'T12:00:00Z');
        } else {
            // Fallback to current date
            date = new Date();
        }
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return 'Recent';
        }
        
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    } catch (e) {
        console.log('Date formatting error for:', dateString, e);
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
        // Show local note in a modal
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

function viewOnGitHub(url) {
    if (url && url !== '#' && url !== '#local') {
        window.open(url, '_blank');
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
        // Fallback: copy to clipboard
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

// Add sample notes for testing
function addSampleNotes() {
    const sampleNotes = [
        {
            id: 'sample-1',
            title: 'Welcome to Notes',
            category: 'general',
            content: '# Welcome to Notes App\n\nThis is a sample note to get you started.\n\n## Features:\n- Upload markdown files\n- Create notes directly\n- GitHub integration\n- Dark mode',
            date: new Date().toISOString(),
            preview: 'Welcome to Notes App - This is a sample note to get you started...',
            url: '#local',
            lastModified: new Date().toISOString()
        },
        {
            id: 'sample-2',
            title: 'Markdown Tips',
            category: 'tips',
            content: '# Markdown Tips\n\nUse **bold** and *italic* text.\n\n- Lists are easy\n- Just use dashes\n\n`Code` looks like this.',
            date: new Date().toISOString(),
            preview: 'Markdown Tips - Use bold and italic text. Lists are easy...',
            url: '#local',
            lastModified: new Date().toISOString()
        }
    ];
    
    // Save to local storage
    localStorage.setItem('userNotes', JSON.stringify(sampleNotes));
    
    // Also save to server local file
    fetch('/api/upload-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            fileName: 'welcome.md',
            content: sampleNotes[0].content,
            category: 'general',
            message: 'Add welcome note'
        })
    });
    
    console.log('✅ Added sample notes');
    // Refresh the dashboard
    initDashboard();
}

// Debug functions for browser console
window.debugNotes = {
    showAllNotes: () => console.log('All notes:', allNotes),
    showNotesIndex: () => console.log('Notes index:', notesIndex),
    reloadNotes: () => loadNotes().then(() => renderNotesList(notesIndex)),
    addSamples: () => addSampleNotes(),
    testAPI: () => fetch('/api/notes').then(r => r.json()).then(console.log)
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', initDashboard);