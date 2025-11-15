/**
 * Markdown to HTML converter
 * Basic implementation for note rendering
 */

function markdownToHTML(markdown) {
    if (!markdown || typeof markdown !== 'string') {
        return '<p>No content available</p>';
    }
    
    console.log('Converting markdown to HTML, length:', markdown.length);
    
    let html = markdown;
    
    // Headers
    html = html.replace(/^###### (.*$)/gim, '<h6>$1</h6>');
    html = html.replace(/^##### (.*$)/gim, '<h5>$1</h5>');
    html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // Bold and Italic
    html = html.replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
    
    // Links
    html = html.replace(/\[([^\[]+)\]\(([^\)]+)\)/gim, '<a href="$2" target="_blank">$1</a>');
    
    // Lists
    html = html.replace(/^\s*\- (.*$)/gim, '<ul><li>$1</li></ul>');
    html = html.replace(/^\s*\* (.*$)/gim, '<ul><li>$1</li></ul>');
    html = html.replace(/^\s*\+ (.*$)/gim, '<ul><li>$1</li></ul>');
    html = html.replace(/^\s*\d+\. (.*$)/gim, '<ol><li>$1</li></ol>');
    
    // Fix nested lists
    html = html.replace(/<\/ul>\s*<ul>/gim, '');
    html = html.replace(/<\/ol>\s*<ol>/gim, '');
    
    // Code blocks
    html = html.replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>');
    html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');
    
    // Blockquotes
    html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');
    
    // Horizontal rule
    html = html.replace(/^\-\-\-$/gim, '<hr>');
    html = html.replace(/^\*\*\*$/gim, '<hr>');
    
    // Paragraphs (handle line breaks properly)
    html = html.replace(/\n\n/gim, '</p><p>');
    html = html.replace(/\n/gim, '<br>');
    html = '<p>' + html + '</p>';
    
    // Clean up empty paragraphs
    html = html.replace(/<p><\/p>/gim, '');
    html = html.replace(/<p><br><\/p>/gim, '');
    
    console.log('Markdown conversion completed');
    return html;
}

// Utility function to escape HTML in markdown (for safety)
function escapeMarkdownHTML(markdown) {
    return markdown
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}