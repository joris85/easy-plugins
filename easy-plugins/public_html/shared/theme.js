/**
 * Easy Plugins - Theme Management
 * Light/dark toggle with localStorage persistence.
 * No page reloads: everything keys off the .dark class on <html> and <body>.
 * Flash-free: an inline script in <head> sets the class before first paint
 * (see shared/header.php), this file only manages toggling and widgets.
 */

// One source of truth: saved choice, otherwise the OS preference
function resolveTheme() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') {
        return saved;
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Apply a theme to the document, icon and embedded editors
function applyTheme(theme) {
    const dark = theme === 'dark';
    document.documentElement.classList.toggle('dark', dark);
    if (document.body) {
        document.body.classList.toggle('dark', dark);
    }
    updateThemeIcon(theme);
    updateTinyMCETheme();
}

function toggleTheme() {
    const next = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    applyTheme(next);
}

// Update TinyMCE editor content theme (Easy HTML page)
function updateTinyMCETheme() {
    if (typeof tinymce !== 'undefined' && tinymce.get('htmlEditor')) {
        const editor = tinymce.get('htmlEditor');
        const editorBody = editor && editor.getBody && editor.getBody();
        if (editorBody) {
            editorBody.classList.toggle('dark', document.documentElement.classList.contains('dark'));
        }
    }
}

// Icon shows the CURRENT mode's switch action: moon in light, sun in dark
function updateThemeIcon(theme) {
    const icon = document.getElementById('theme-icon');
    if (!icon) {
        return;
    }
    icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// On load: the <head> script already set the html class before paint;
// here we only sync the icon and late widgets (TinyMCE loads async)
function initTheme() {
    const theme = resolveTheme();
    applyTheme(theme);
    setTimeout(updateTinyMCETheme, 600);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
} else {
    initTheme();
}

// Follow OS changes live when the visitor has no explicit choice saved
if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
        if (!localStorage.getItem('theme')) {
            applyTheme(resolveTheme());
        }
    });
}
