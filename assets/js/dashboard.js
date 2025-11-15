/**
 * Dashboard functionality for notes management
 * Handles note loading, searching, and display
 */

// Global variables
let notesIndex = [];
let currentView = 'grid'; // 'grid' or 'detail'

// Initialize dashboard
async function initDashboard() {
    console.log('Initializing dashboard...');
    
    // Check authentication
    if (!checkAuth()) {
        window.location.href = 'index.html';
        return;
    }
    
    try {
        // Show loading state
        showLoadingState();
        
        // Load search index
        await loadSearchIndex();
        
        // Render initial notes list
        renderNotesList(notesIndex);
        
        // Update results count
        updateResultsCount(notesIndex.length);
        
    } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        showErrorState('Failed to load notes. Please try refreshing the page.');
    }
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

// Load search index
async function loadSearchIndex() {
    try {
        const response = await fetch('search-index.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        notesIndex = await response.json();
        console.log(`Loaded ${notesIndex.length} notes from search index`);
    } catch (error) {
        console.error('Error loading search index:', error);
        throw error;
    }
}

// Render notes list in grid view
function renderNotesList(notes) {
    const container = document.getElementById('notesList');
    const noResults = document.getElementById('noResults');
    
    if (!container) {
        console.error('Notes list container not found');
        return;
    }
    
    // Clear container
    container.innerHTML = '';
    
    // Show no results message if empty
    if (notes.length === 0) {
        if (noResults) noResults.style.display = 'block';
        return;
    }
    
    if (noResults) noResults.style.display = 'none';
    
    // Create notes grid
    notes.forEach(note => {
        const noteCard = createNoteCard(note);
        container.appendChild(noteCard);
    });
}

// Create individual note card
function createNoteCard(note) {
    const colDiv = document.createElement('div');
    colDiv.className = 'col';
    
    colDiv.innerHTML = `
        <div class="card note-card h-100">
            <div class="card-body d-flex flex-column">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h5 class="card-title text-primary">${escapeHtml(note.title || 'Untitled')}</h5>
                    <span class="note-category">${escapeHtml(note.category || 'Uncategorized')}</span>
                </div>
                
                ${note.date ? `<small class="text-muted mb-2">${escapeHtml(note.date)}</small>` : ''}
                
                <p class="card-text note-preview flex-grow-1">
                    ${escapeHtml(note.preview || 'No preview available...')}
                </p>
                
                <div class="mt-auto pt-3">
                    <button class="btn btn-outline-primary btn-sm w-100" onclick="loadNote('${escapeHtml(note.path)}')">
                        Open Note
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return colDiv;
}

// Load and display a single note
async function loadNote(notePath) {
    console.log('Loading note:', notePath);
    
    try {
        showLoadingState();
        
        const response = await fetch(notePath);
        if (!response.ok) {
            throw new Error(`Failed to load note: ${response.status}`);
        }
        
        const markdown = await response.text();
        const html = markdownToHTML(markdown);
        
        // Switch to detail view
        showNoteDetail(html, notePath);
        
    } catch (error) {
        console.error('Error loading note:', error);
        showErrorState('Failed to load the note. Please try again.');
    }
}

// Show note in detail view
function showNoteDetail(html, notePath) {
    const container = document.getElementById('notesList');
    if (!container) return;
    
    container.innerHTML = `
        <div class="col-12">
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">Note Preview</h5>
                    <button class="btn btn-secondary btn-sm" onclick="backToList()">
                        ← Back to List
                    </button>
                </div>
                <div class="card-body">
                    <div class="markdown-content">
                        ${html}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    currentView = 'detail';
}

// Return to notes list
function backToList() {
    renderNotesList(notesIndex);
    currentView = 'grid';
    updateResultsCount(notesIndex.length);
}

// Search/filter notes
function filterResults() {
    const query = document.getElementById('searchBox').value.toLowerCase().trim();
    
    if (!query) {
        // Show all notes if search is empty
        renderNotesList(notesIndex);
        updateResultsCount(notesIndex.length);
        return;
    }
    
    const filteredNotes = notesIndex.filter(note => {
        return (
            (note.title && note.title.toLowerCase().includes(query)) ||
            (note.category && note.category.toLowerCase().includes(query)) ||
            (note.date && note.date.includes(query)) ||
            (note.content && note.content.toLowerCase().includes(query)) ||
            (note.preview && note.preview.toLowerCase().includes(query))
        );
    });
    
    renderNotesList(filteredNotes);
    updateResultsCount(filteredNotes.length);
}

// Update results count display
function updateResultsCount(count) {
    const counter = document.getElementById('resultsCount');
    if (counter) {
        counter.textContent = `${count} note${count !== 1 ? 's' : ''} found`;
    }
}

// Show loading state
function showLoadingState() {
    const container = document.getElementById('notesList');
    if (container) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="loading-spinner mx-auto mb-3"></div>
                <p class="text-muted">Loading notes...</p>
            </div>
        `;
    }
}

// Show error state
function showErrorState(message) {
    const container = document.getElementById('notesList');
    if (container) {
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger">
                    <h5>Error</h5>
                    <p class="mb-0">${message}</p>
                </div>
            </div>
        `;
    }
}

// Utility function to escape HTML
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Logout function
function logout() {
    sessionStorage.removeItem('notesAppSession');
    window.location.href = 'index.html';
}