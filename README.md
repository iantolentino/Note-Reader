# Notes App - Personal Knowledge Base

## Overview

A personal markdown notes management system with GitHub integration for secure storage and synchronization. This web application allows you to create, upload, and manage markdown notes across multiple categories with a clean, dark-themed interface optimized for both desktop and mobile use.

## Features

- **Secure Authentication**: Protected login system with session management
- **Markdown Support**: Create and edit notes using markdown syntax with live preview
- **File Upload**: Upload existing markdown files from any device
- **GitHub Integration**: Automatic synchronization with GitHub repositories for backup
- **Category Organization**: Organize notes into customizable categories
- **Responsive Design**: Mobile-optimized interface that works on all devices
- **Search Functionality**: Quickly find notes by title, content, or category
- **Export Capability**: Export all notes as JSON for backup

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Storage**: GitHub Repository integration with local fallback
- **Authentication**: Client-side session management
- **Styling**: Custom CSS with CSS variables for theming
- **Icons**: Unicode emojis for cross-platform compatibility

## Project Structure

```
notes-app/
├── index.html              # Login page
├── dashboard.html          # Main dashboard
├── upload.html            # File upload interface
├── create.html            # Note creation interface
├── assets/
│   ├── css/
│   │   └── styles.css     # Main stylesheet
│   ├── js/
│   │   ├── auth.js        # Authentication utilities
│   │   ├── config.js      # Configuration settings
│   │   ├── dashboard.js   # Dashboard functionality
│   │   ├── login.js       # Login handling
│   │   ├── upload.js      # File upload handling
│   │   ├── create.js      # Note creation handling
│   │   ├── github.js      # GitHub API integration
│   │   └── renderer.js    # Markdown to HTML converter
│   └── logo/
│       └── logo-n.png     # Application logo
└── setup.js               # Repository setup script
```

## Setup Instructions

### Prerequisites

- Node.js installed on your system
- A GitHub account
- A GitHub repository for storing notes

### Configuration

1. **Clone or download the project files** to your desired directory.

2. **Create a GitHub repository** for storing your notes.

3. **Set up environment configuration**:
   - Update `config.js` with your GitHub credentials:
     ```javascript
     const CONFIG = {
         GITHUB: {
             OWNER: 'your-github-username',
             REPO: 'your-repository-name',
             BRANCH: 'main'
         }
     };
     ```

4. **Configure authentication**:
   - Default credentials are set to admin/admin (base64 encoded)
   - Modify the credentials in `config.js` for security:
     ```javascript
     CREDENTIALS: {
         username: "base64-encoded-username",
         password: "base64-encoded-password"
     }
     ```

### Server Setup

This application requires a backend server to handle GitHub API requests securely. You'll need to set up a server with the following endpoints:

- `POST /api/upload-note` - Handle note creation and uploads
- `GET /api/notes` - Retrieve notes list
- `GET /api/github-token` - Provide GitHub token securely

### Initial Setup

Run the setup script to initialize your repository structure:

```bash
node setup.js
```

## Usage

### Authentication

1. Open `index.html` in your web browser
2. Enter your credentials (default: admin/admin)
3. Session valid for 2 hours

### Creating Notes

1. Navigate to the Create page
2. Enter a title and select a category
3. Write your content in markdown format
4. Use the toolbar for quick formatting
5. Preview your note in real-time
6. Save to automatically upload to GitHub

### Uploading Files

1. Go to the Upload page
2. Select a category or create a custom one
3. Choose a markdown file from your device
4. Upload to sync with GitHub

### Managing Notes

- **Dashboard**: View all notes with search and filtering
- **Categories**: Automatic organization by category
- **Search**: Find notes by title, content, or category
- **Export**: Download all notes as JSON backup

## Security Notes

- Credentials are base64 encoded but should be properly secured in production
- GitHub tokens should be stored server-side, not in client code
- Sessions expire after 2 hours for security
- Consider implementing proper backend authentication for production use

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Mobile Support

Fully responsive design with:
- Touch-optimized interface
- Mobile file upload support
- Responsive grid layout
- Mobile-friendly navigation

## Customization

### Theming

Modify CSS variables in `styles.css`:

```css
:root {
    --primary: #4A70A9;
    --background: #1a1a1a;
    --secondary: #2d3748;
    --text: #ffffff;
    /* Additional variables... */
}
```

### Categories

Default categories include:
- Programming
- Personal
- Work
- Study
- Ideas
- Other (custom)

## Troubleshooting

### Common Issues

1. **GitHub Authentication Failed**
   - Verify repository name and owner in config
   - Check GitHub token permissions
   - Ensure repository exists and is accessible

2. **File Upload Issues**
   - Verify file is markdown (.md) format
   - Check file size (10MB limit)
   - Ensure category is selected

3. **Notes Not Loading**
   - Check internet connection
   - Verify GitHub repository accessibility
   - Check browser console for errors

### Debugging

Use browser developer tools and check the console for detailed error messages. The application includes comprehensive logging for troubleshooting.

## License

Personal use - adapt as needed for your requirements.

## Support

This is a personal project designed for individual use. For issues, refer to the troubleshooting section or modify the code to suit your specific needs.
