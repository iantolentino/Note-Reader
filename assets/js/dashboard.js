/**
 * Dashboard functionality for file-based notes
 */

let notesIndex = [];

// Initialize dashboard
async function initDashboard() {
    if (!checkAuth()) {
        window.location.href = 'index.html';
        return;
    }
    
    try {
        showLoadingState();
        await loadNotes();
        renderNotesList(notesIndex);
        updateStats(notesIndex);
        
    } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        showErrorState('Failed to load notes');
    }
}

// Load notes from local storage
async function loadNotes() {
    try {
        // Try to load from local storage first (uploaded files)
        const userNotes = JSON.parse(localStorage.getItem('userNotes') || '[]');
        
        // Also try to load from search-index.json for existing notes
        let existingNotes = [];
        try {
            const response = await fetch('search-index.json');
            if (response.ok) {
                existingNotes = await response.json();
            }
        } catch (e) {
            console.log('No existing search-index.json found');
        }
        
        // Combine both note sources
        notesIndex = [...existingNotes, ...userNotes];
        console.log(`Loaded ${notesIndex.length} notes`);
        
    } catch (error) {
        console.error('Error loading notes:', error);
        notesIndex = [];
    }
}

// Render notes list
function renderNotesList(notes) {
    const container = document.getElementById('notesList');
    const noResults = document.getElementById('noResults');
    
    if (!container) return;
    
    container.innerHTML = '';
    
    if (notes.length === 0) {
        if (noResults) noResults.style.display = 'block';
        return;
    }
    
    if (noResults) noResults.style.display = 'none';
    
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
                    <button class="btn btn-outline-primary btn-sm w-100" onclick="viewNote(${note.id ? `'${note.id}'` : `'${note.path}'`})">
                        Read Note
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return colDiv;
}

// View note content
async function viewNote(noteIdOrPath) {
    try {
        showLoadingState();
        
        let noteContent = '';
        let noteTitle = '';
        
        // Check if it's a locally stored note (has ID)
        if (typeof noteIdOrPath === 'string' && !noteIdOrPath.includes('/')) {
            const userNotes = JSON.parse(localStorage.getItem('userNotes') || '[]');
            const note = userNotes.find(n => n.id === noteIdOrPath);
            if (note) {
                noteContent = note.content;
                noteTitle = note.title;
            }
        } else {
            // It's a file path from search-index.json
            const response = await fetch(noteIdOrPath);
            if (response.ok) {
                noteContent = await response.text();
                noteTitle = noteIdOrPath.split('/').pop().replace('.md', '').replace(/-/g, ' ');
            }
        }
        
        if (!noteContent) {
            throw new Error('Note not found');
        }
        
        const html = markdownToHTML(noteContent);
        showNoteDetail(html, noteTitle);
        
    } catch (error) {
        console.error('Error loading note:', error);
        showErrorState('Failed to load the note');
    }
}

// Show note in detail view (blog-style)
function showNoteDetail(html, title) {
    const container = document.getElementById('notesList');
    if (!container) return;
    
    container.innerHTML = `
        <div class="col-12">
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h4 class="mb-0">${escapeHtml(title)}</h4>
                    <button class="btn btn-secondary btn-sm" onclick="backToList()">
                        Back to List
                    </button>
                </div>
                <div class="card-body">
                    <article class="markdown-content">
                        ${html}
                    </article>
                </div>
            </div>
        </div>
    `;
}

// Update statistics
function updateStats(notes) {
    document.getElementById('totalNotes').textContent = notes.length;
    
    const categories = [...new Set(notes.map(note => note.category))];
    document.getElementById('totalCategories').textContent = categories.length;
    
    const currentMonth = new Date().toISOString().slice(0, 7);
    const recentNotes = notes.filter(note => note.date && note.date.startsWith(currentMonth));
    document.getElementById('recentNotes').textContent = recentNotes.length;
}

// Utility functions (keep existing ones)
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

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

function backToList() {
    renderNotesList(notesIndex);
    updateStats(notesIndex);
}

function filterResults() {
    const query = document.getElementById('searchBox').value.toLowerCase().trim();
    
    if (!query) {
        renderNotesList(notesIndex);
        updateStats(notesIndex);
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
    updateStats(filteredNotes);
}

function logout() {
    sessionStorage.removeItem('notesAppSession');
    window.location.href = 'index.html';
}