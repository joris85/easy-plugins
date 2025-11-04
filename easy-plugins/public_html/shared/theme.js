/**
 * Easy Plugins - Theme Management
 * Simple light/dark theme toggle with localStorage persistence
 */

// Toggle between light and dark theme
function toggleTheme() {
    const body = document.body;
    const isDark = body.classList.contains('dark');
    
    if (isDark) {
        // Switching to light mode - refresh page to ensure clean styles
        localStorage.setItem('theme', 'light');
        window.location.reload();
    } else {
        // Switching to dark mode - apply immediately
        body.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        updateThemeIcon('dark');
        
        // Update TinyMCE editor content theme
        updateTinyMCETheme();
    }
}

// Update TinyMCE editor content theme
function updateTinyMCETheme() {
    if (typeof tinymce !== 'undefined' && tinymce.get('htmlEditor')) {
        const editor = tinymce.get('htmlEditor');
        if (editor) {
            const editorBody = editor.getBody();
            const isDark = document.body.classList.contains('dark');
            
            if (isDark) {
                editorBody.classList.add('dark');
            } else {
                editorBody.classList.remove('dark');
            }
        }
    }
}

// Update the theme icon and label
function updateThemeIcon(theme) {
    const icon = document.getElementById('theme-icon');
    
    if (!icon) return;
    
    if (theme === 'dark') {
        // Currently in dark mode, show sun icon to switch to light
        icon.className = 'fas fa-sun';
    } else {
        // Currently in light mode, show moon icon to switch to dark
        icon.className = 'fas fa-moon';
    }
}

// Load saved theme on page load
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    
    if (savedTheme === 'dark') {
        document.body.classList.add('dark');
    }
    
    // Wait a bit for DOM to be ready, then update icon
    setTimeout(() => {
        updateThemeIcon(savedTheme);
        // Also update TinyMCE theme after a delay to ensure editor is initialized
        setTimeout(() => {
            updateTinyMCETheme();
        }, 500);
    }, 100);
}

// Initialize theme when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
} else {
    initTheme();
}

