// Easy Less - LESS to CSS Compiler
let lessEditor;
let cssEditor;
let compileTimeout;
let isCompiling = false;

// Example LESS code
const exampleLess = `@primary-color: #4CAF50;
@secondary-color: #2196F3;
@font-size-base: 16px;

.button {
  background-color: @primary-color;
  color: white;
  padding: 10px 20px;
  border-radius: 4px;
  font-size: @font-size-base;
  transition: background-color 0.3s;
  
  &:hover {
    background-color: darken(@primary-color, 10%);
  }
  
  &.secondary {
    background-color: @secondary-color;
    
    &:hover {
      background-color: darken(@secondary-color, 10%);
    }
  }
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  
  .row {
    display: flex;
    flex-wrap: wrap;
    margin: 0 -10px;
    
    .col {
      flex: 1;
      padding: 0 10px;
    }
  }
}`;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeEditors();
    setupEventListeners();
    
    // Load from localStorage if available
    loadFromLocalStorage();
});

function initializeEditors() {
    // Initialize LESS editor
    lessEditor = CodeMirror(document.getElementById('lessEditor'), {
        mode: 'css',
        theme: 'default',
        lineNumbers: true,
        lineWrapping: true,
        foldGutter: true,
        gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
        placeholder: 'Enter your LESS code here...',
        value: '',
        viewportMargin: Infinity
    });
    
    // Initialize CSS editor (read-only)
    cssEditor = CodeMirror(document.getElementById('cssEditor'), {
        mode: 'css',
        theme: 'default',
        lineNumbers: true,
        lineWrapping: true,
        readOnly: true,
        foldGutter: true,
        gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
        placeholder: 'Compiled CSS will appear here...',
        value: '',
        viewportMargin: Infinity
    });
    
    // Apply dark mode theme if needed
    applyTheme();
    
    // Watch for theme changes
    const observer = new MutationObserver(applyTheme);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    
    // Real-time compilation with debouncing
    lessEditor.on('change', function() {
        clearTimeout(compileTimeout);
        compileTimeout = setTimeout(() => {
            compileLess();
        }, 300);
        
        updateStatistics();
        saveToLocalStorage();
    });
    
    // Initial statistics
    updateStatistics();
}

function applyTheme() {
    const isDark = document.body.classList.contains('dark');
    if (isDark) {
        lessEditor.setOption('theme', 'monokai');
        cssEditor.setOption('theme', 'monokai');
    } else {
        lessEditor.setOption('theme', 'default');
        cssEditor.setOption('theme', 'default');
    }
}

function setupEventListeners() {
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + Enter to compile
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            compileLess();
        }
    });
}

function compileLess() {
    if (isCompiling) return;

    // less.js comes from a CDN; without it there is no compiler at all
    if (typeof less === 'undefined' || typeof less.render !== 'function') {
        showError('The LESS compiler could not be loaded (no internet connection, or the CDN is blocked). Reload the page to try again.');
        return;
    }

    const lessCode = lessEditor.getValue();

    if (!lessCode.trim()) {
        cssEditor.setValue('');
        updateStatistics();
        return;
    }
    
    isCompiling = true;
    showCompilingIndicator(true);
    
    // Get minify option
    const minify = document.getElementById('minify')?.checked || false;
    
    // Use less.js to compile
    less.render(lessCode, {
        compress: minify,
        sourceMap: false
    })
    .then(function(output) {
        let css = output.css;
        
        // Remove comments if option is checked
        const removeComments = document.getElementById('removeComments')?.checked || false;
        if (removeComments) {
            // Remove CSS comments (/* ... */)
            css = css.replace(/\/\*[\s\S]*?\*\//g, '');
            // Remove single-line comments that might remain
            css = css.replace(/\/\/.*$/gm, '');
            // Clean up extra whitespace left by removed comments
            css = css.replace(/\n\s*\n\s*\n/g, '\n\n');
        }
        
        cssEditor.setValue(css);
        hideError();
        updateStatistics();
    })
    .catch(function(error) {
        const errorMessage = `Error: ${error.message}\nLine: ${error.line || 'N/A'}\nColumn: ${error.column || 'N/A'}`;
        cssEditor.setValue(`/* Compilation Error:\n${errorMessage}\n*/`);
        showError(errorMessage);
        updateStatistics();
        showAlert('Compilation error occurred!', 'danger');
    })
    .finally(function() {
        isCompiling = false;
        showCompilingIndicator(false);
    });
}

function updateStatistics() {
    const lessCode = lessEditor.getValue();
    const cssCode = cssEditor.getValue();
    
    // LESS statistics
    const lessLines = lessCode.split('\n').length;
    const lessChars = lessCode.length;
    
    // CSS statistics
    const cssLines = cssCode.split('\n').length;
    const cssChars = cssCode.length;
    
    document.getElementById('lessLines').textContent = lessLines;
    document.getElementById('lessChars').textContent = lessChars.toLocaleString();
    document.getElementById('cssLines').textContent = cssLines;
    document.getElementById('cssChars').textContent = cssChars.toLocaleString();
}

function copyToClipboard() {
    const cssCode = cssEditor.getValue();
    
    if (!cssCode.trim()) {
        showAlert('No CSS to copy!', 'warning');
        return;
    }
    
    try {
        navigator.clipboard.writeText(cssCode).then(() => {
            showAlert('CSS copied to clipboard!', 'success');
        });
    } catch (err) {
        // Fallback
        cssEditor.select();
        document.execCommand('copy');
        showAlert('CSS copied to clipboard!', 'success');
    }
}

function downloadCSS() {
    const cssCode = cssEditor.getValue();
    
    if (!cssCode.trim()) {
        showAlert('No CSS to download!', 'warning');
        return;
    }
    
    const blob = new Blob([cssCode], { type: 'text/css' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'compiled.css';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showAlert('CSS downloaded!', 'success');
}

function resetEditor() {
    if (confirm('Are you sure you want to reset the editor? This will clear all content.')) {
        lessEditor.setValue('');
        cssEditor.setValue('');
        updateStatistics();
        clearLocalStorage();
        showAlert('Editor reset!', 'info');
    }
}

function loadExample() {
    if (confirm('Load example LESS code? This will replace your current code.')) {
        lessEditor.setValue(exampleLess);
        compileLess();
        showAlert('Example loaded!', 'info');
    }
}

function showError(message) {
    hideError();
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `<strong>Compilation Error:</strong><br>${message.replace(/\n/g, '<br>')}`;
    
    const cardBody = cssEditor.getWrapperElement().parentElement;
    cardBody.insertBefore(errorDiv, cssEditor.getWrapperElement());
}

function hideError() {
    const errorDiv = document.querySelector('.error-message');
    if (errorDiv) {
        errorDiv.remove();
    }
}

function showCompilingIndicator(show) {
    let indicator = document.querySelector('.compiling-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'compiling-indicator';
        indicator.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Compiling...';
        document.body.appendChild(indicator);
    }
    
    if (show) {
        indicator.classList.add('active');
    } else {
        indicator.classList.remove('active');
    }
}

function showAlert(message, type) {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert-temp');
    existingAlerts.forEach(alert => alert.remove());
    
    // Create new alert
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-temp alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 3000);
}

// LocalStorage functions
function saveToLocalStorage() {
    try {
        const lessCode = lessEditor.getValue();
        localStorage.setItem('easy-less-code', lessCode);
    } catch (e) {
        // Ignore localStorage errors
    }
}

function loadFromLocalStorage() {
    try {
        const savedCode = localStorage.getItem('easy-less-code');
        if (savedCode) {
            lessEditor.setValue(savedCode);
            compileLess();
        }
    } catch (e) {
        // Ignore localStorage errors
    }
}

function clearLocalStorage() {
    try {
        localStorage.removeItem('easy-less-code');
    } catch (e) {
        // Ignore localStorage errors
    }
}


