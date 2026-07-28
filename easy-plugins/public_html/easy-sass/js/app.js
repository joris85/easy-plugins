// Easy SASS - SASS/SCSS to CSS Compiler
let sassEditor;
let cssEditor;
let compileTimeout;
let isCompiling = false;
let currentSyntax = 'scss'; // 'scss' or 'sass'

// Example SCSS code
const exampleSCSS = `$primary-color: #4CAF50;
$secondary-color: #2196F3;
$font-size-base: 16px;

.button {
  background-color: $primary-color;
  color: white;
  padding: 10px 20px;
  border-radius: 4px;
  font-size: $font-size-base;
  transition: background-color 0.3s;
  
  &:hover {
    background-color: darken($primary-color, 10%);
  }
  
  &.secondary {
    background-color: $secondary-color;
    
    &:hover {
      background-color: darken($secondary-color, 10%);
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

// Example SASS code (indented syntax)
const exampleSASS = `$primary-color: #4CAF50
$secondary-color: #2196F3
$font-size-base: 16px

.button
  background-color: $primary-color
  color: white
  padding: 10px 20px
  border-radius: 4px
  font-size: $font-size-base
  transition: background-color 0.3s
  
  &:hover
    background-color: darken($primary-color, 10%)
  
  &.secondary
    background-color: $secondary-color
    
    &:hover
      background-color: darken($secondary-color, 10%)

.container
  max-width: 1200px
  margin: 0 auto
  padding: 20px
  
  .row
    display: flex
    flex-wrap: wrap
    margin: 0 -10px
    
    .col
      flex: 1
      padding: 0 10px`;

// SASS compiler state
let sassCompiler = null;
let sassLoadAttempts = 0;

// Local file path (will be tried first)
const localSassPath = 'libs/sass/sass.sync.min.js';

// CDN sources to try (in order of preference) - browser-compatible sass.js
const sassCDNSources = [
    'https://cdnjs.cloudflare.com/ajax/libs/sass.js/0.10.13/sass.sync.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/sass.js/0.11.1/sass.min.js',
    'https://cdn.jsdelivr.net/npm/sass.js@0.10.13/dist/sass.sync.min.js'
];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    showLoadingIndicator(true);
    loadSassCompiler();
});

function showLoadingIndicator(show) {
    const indicator = document.getElementById('sassLoadingIndicator');
    if (indicator) {
        indicator.style.display = show ? 'block' : 'none';
    }
}

function loadSassCompiler() {
    // Check if already loaded
    if (checkSassAvailable()) {
        initializeApp();
        return;
    }
    
    // Try loading from local file first
    loadSassFromLocal();
}

function loadSassFromLocal() {
    console.log('Attempting to load SASS from local file...');
    const script = document.createElement('script');
    script.src = localSassPath;
    script.async = true;
    
    script.onload = function() {
        console.log('Local SASS script loaded, checking availability...');
        // Wait and check multiple times
        let checkCount = 0;
        const maxChecks = 10;
        const checkInterval = 200;
        
        const checkIntervalId = setInterval(function() {
            checkCount++;
            if (checkSassAvailable()) {
                console.log('SASS compiler loaded successfully from local file!');
                clearInterval(checkIntervalId);
                initializeApp();
            } else if (checkCount >= maxChecks) {
                console.warn('Local SASS file loaded but compiler not available, trying CDN...');
                clearInterval(checkIntervalId);
                loadSassFromCDN();
            }
        }, checkInterval);
    };
    
    script.onerror = function() {
        console.warn('Local SASS file not found, trying CDN sources...');
        loadSassFromCDN();
    };
    
    document.head.appendChild(script);
}

function loadSassFromCDN() {
    // Try loading from CDN
    if (sassLoadAttempts < sassCDNSources.length) {
        loadSassFromCDNSource(sassCDNSources[sassLoadAttempts]);
    } else {
        // All CDN attempts failed
        console.error('All SASS sources (local and CDN) failed.');
        showSassError();
    }
}

function loadSassFromCDNSource(url) {
    console.log(`Attempting to load SASS from CDN: ${url} (Attempt ${sassLoadAttempts + 1}/${sassCDNSources.length})`);
    
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    
    script.onload = function() {
        console.log('SASS script loaded from CDN, checking availability...');
        // Wait and check multiple times (library might need time to initialize)
        let checkCount = 0;
        const maxChecks = 10;
        const checkInterval = 200;
        
        const checkIntervalId = setInterval(function() {
            checkCount++;
            if (checkSassAvailable()) {
                console.log('SASS compiler loaded successfully from CDN!');
                clearInterval(checkIntervalId);
                initializeApp();
            } else if (checkCount >= maxChecks) {
                console.warn('SASS script loaded but compiler not available after multiple checks, trying next CDN source...');
                clearInterval(checkIntervalId);
                sassLoadAttempts++;
                loadSassFromCDN();
            }
        }, checkInterval);
    };
    
    script.onerror = function() {
        console.warn(`Failed to load SASS from ${url}, trying next CDN source...`);
        sassLoadAttempts++;
        loadSassFromCDN();
    };
    
    document.head.appendChild(script);
}

function checkSassAvailable() {
    // Check for global Sass (sass.js library - most common)
    if (typeof Sass !== 'undefined') {
        sassCompiler = Sass;
        return true;
    }
    
    // Check for window.Sass
    if (typeof window !== 'undefined' && typeof window.Sass !== 'undefined') {
        sassCompiler = window.Sass;
        return true;
    }
    
    // Check for sass (modern Dart Sass - less common in browsers)
    if (typeof sass !== 'undefined') {
        if (typeof sass.compileString === 'function' || 
            typeof sass.compile === 'function' ||
            (sass.default && typeof sass.default.compileString === 'function')) {
            sassCompiler = sass;
            return true;
        }
    }
    
    // Check for window.sass
    if (typeof window !== 'undefined' && typeof window.sass !== 'undefined') {
        if (typeof window.sass.compileString === 'function' || 
            typeof window.sass.compile === 'function') {
            sassCompiler = window.sass;
            return true;
        }
    }
    
    return false;
}


function showSassError() {
    showLoadingIndicator(false);
    const errorMsg = 'Unable to load SASS compiler from local file or CDN. Please download the library manually. See libs/sass/README.md for instructions.';
    showAlert(errorMsg, 'danger');
    
    // Still initialize editors so user can see the error
    if (!sassEditor) {
        initializeEditors();
        setupEventListeners();
        updateSyntaxToggle();
    }
    
    // Show error in the CSS editor with instructions
    const errorInstructions = `/* Error: SASS compiler could not be loaded.

To fix this:
1. Download sass.sync.min.js from:
   https://cdnjs.cloudflare.com/ajax/libs/sass.js/0.10.13/sass.sync.min.js

2. Save it to: libs/sass/sass.sync.min.js

3. Refresh this page

Alternatively, check your internet connection and try again. */`;
    
    if (cssEditor) {
        cssEditor.setValue(errorInstructions);
    } else {
        // If editor not initialized yet, show in a visible place
        setTimeout(function() {
            if (cssEditor) {
                cssEditor.setValue(errorInstructions);
            }
        }, 1000);
    }
}

function initializeApp() {
    showLoadingIndicator(false);
    initializeEditors();
    setupEventListeners();
    updateSyntaxToggle();
    
    // Load from localStorage if available
    loadFromLocalStorage();
    
    // Show brief success message (less intrusive)
    console.log('SASS compiler initialized successfully');
}

function initializeEditors() {
    // Initialize SASS/SCSS editor
    sassEditor = CodeMirror(document.getElementById('sassEditor'), {
        mode: 'css',
        theme: 'default',
        lineNumbers: true,
        lineWrapping: true,
        foldGutter: true,
        gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
        placeholder: 'Enter your SASS/SCSS code here...',
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
    sassEditor.on('change', function() {
        clearTimeout(compileTimeout);
        compileTimeout = setTimeout(() => {
            compileSass();
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
        sassEditor.setOption('theme', 'monokai');
        cssEditor.setOption('theme', 'monokai');
    } else {
        sassEditor.setOption('theme', 'default');
        cssEditor.setOption('theme', 'default');
    }
}

function setupEventListeners() {
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + Enter to compile
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            compileSass();
        }
    });
}

function compileSass() {
    if (isCompiling) return;
    
    // Check if compiler is available
    if (!sassCompiler && !checkSassAvailable()) {
        showAlert('SASS compiler not loaded. Please wait a moment and try again, or refresh the page.', 'warning');
        // Try to reload compiler
        loadSassCompiler();
        return;
    }
    
    const sassCode = sassEditor.getValue();
    
    if (!sassCode.trim()) {
        cssEditor.setValue('');
        updateStatistics();
        return;
    }
    
    isCompiling = true;
    showCompilingIndicator(true);
    
    // Determine syntax based on current mode
    const syntax = currentSyntax;
    
    try {
        if (!sassCompiler) {
            throw new Error('SASS compiler not initialized.');
        }
        
        // Check for sass.js compile API first (most common for browser)
        // sass.js uses compile() not render()
        if (typeof sassCompiler.compile === 'function') {
            // sass.js API: Use Sass.options() to set options, then compile(code, callback)
            // Options supported: style, precision, comments, indentedSyntax, etc.
            // Note: sass.js uses 'style' not 'outputStyle', and it's a number (0=nested, 1=expanded, 2=compact, 3=compressed)
            // Get minify option
            const minify = document.getElementById('minify')?.checked || false;
            // sass.js 0.10.13 expects indentedSyntax as a number (0 or 1), not boolean
            const compileOptions = {
                indentedSyntax: syntax === 'sass' ? 1 : 0,  // 1 = true (SASS), 0 = false (SCSS)
                style: minify ? 3 : 1  // 3 = compressed (minified), 1 = expanded (readable)
            };
            
            // Set options using Sass.options(), then compile without passing options
            // This avoids issues with the options parameter interfering with compilation
            sassCompiler.options(compileOptions, function() {
                // Options set, now compile without passing options
                sassCompiler.compile(sassCode, function(result) {
                isCompiling = false;
                showCompilingIndicator(false);
                
                // sass.js 0.10.13 callback signature: callback(result)
                // result.status: 0 = success, non-zero = error
                // result.text: compiled CSS (when status === 0)
                // result.message or result.formatted: error message (when status !== 0)
                
                if (result && result.status === 0 && result.text) {
                    // Success: status is 0 and text contains the compiled CSS
                    let css = result.text || '';
                    
                    // Remove comments if option is checked
                    const removeComments = document.getElementById('removeComments')?.checked || false;
                    if (removeComments) {
                        // Remove CSS comments (/* ... */)
                        css = css.replace(/\/\*[\s\S]*?\*\//g, '');
                        // Remove single-line comments that might remain
                        css = css.replace(/\/\/.*$/gm, '');
                        // Clean up extra whitespace left by removed comments
                        if (!minify) {
                            css = css.replace(/\n\s*\n\s*\n/g, '\n\n');
                        }
                    }
                    
                    cssEditor.setValue(css);
                    hideError();
                    updateStatistics();
                    showAlert('SASS/SCSS compiled successfully!', 'success');
                } else if (result && result.status !== 0) {
                    // Error: status is non-zero
                    const line = result.line || result.lineNumber || (result.formatted && result.formatted.match(/line (\d+)/) ? result.formatted.match(/line (\d+)/)[1] : null) || 'N/A';
                    const column = result.column || result.columnNumber || 'N/A';
                    const errorMessage = result.message || result.formatted || (result.error ? result.error.message || result.error : 'Unknown compilation error');
                    const fullErrorMessage = `Error: ${errorMessage}\nLine: ${line}\nColumn: ${column}`;
                    cssEditor.setValue(`/* Compilation Error:\n${fullErrorMessage}\n*/`);
                    showError(fullErrorMessage);
                    updateStatistics();
                    showAlert('Compilation error occurred!', 'danger');
                } else {
                    // Unexpected result format
                    const errorMessage = 'Unexpected result format from SASS compiler. Result: ' + JSON.stringify(result);
                    cssEditor.setValue(`/* Compilation Error:\n${errorMessage}\n*/`);
                    showError(errorMessage);
                    updateStatistics();
                    showAlert('Compilation error occurred!', 'danger');
                }
                }); // Close compile callback
            }); // Close options callback
            return; // Async callback will handle completion
        }
        // Check for render API (older sass.js versions or different libraries)
        else if (typeof sassCompiler.render === 'function') {
            // Alternative render API
            const renderOptions = {
                data: sassCode,
                indentedSyntax: syntax === 'sass' ? 1 : 0  // Convert to number
            };
            
            sassCompiler.render(renderOptions, function(err, result) {
                isCompiling = false;
                showCompilingIndicator(false);
                
                if (err) {
                    const line = err.line || err.lineNumber || 'N/A';
                    const column = err.column || err.columnNumber || 'N/A';
                    const errorMessage = `Error: ${err.message || err}\nLine: ${line}\nColumn: ${column}`;
                    cssEditor.setValue(`/* Compilation Error:\n${errorMessage}\n*/`);
                    showError(errorMessage);
                    updateStatistics();
                    showAlert('Compilation error occurred!', 'danger');
                } else if (result && result.css) {
                    const css = result.css.toString ? result.css.toString() : String(result.css);
                    cssEditor.setValue(css);
                    hideError();
                    updateStatistics();
                    showAlert('SASS/SCSS compiled successfully!', 'success');
                } else {
                    cssEditor.setValue('/* Error: Unexpected result from SASS compiler */');
                    showError('Unexpected result format from SASS compiler');
                    updateStatistics();
                    showAlert('Compilation error occurred!', 'danger');
                }
            });
            return; // Async callback will handle completion
        }
        // Try modern Dart Sass API (synchronous - for Node.js, less common in browser)
        else if (typeof sassCompiler.compileString === 'function') {
            // Modern API (sass@1.69+) - synchronous
            const result = sassCompiler.compileString(sassCode, {
                style: 'expanded',
                syntax: syntax === 'sass' ? 'indented' : 'scss'
            });
            const css = result.css || result;
            cssEditor.setValue(css);
            hideError();
            updateStatistics();
            showAlert('SASS/SCSS compiled successfully!', 'success');
        }
        // Try ES module default export
        else if (sassCompiler.default && typeof sassCompiler.default.compileString === 'function') {
            const result = sassCompiler.default.compileString(sassCode, {
                style: 'expanded',
                syntax: syntax === 'sass' ? 'indented' : 'scss'
            });
            const css = result.css || result;
            cssEditor.setValue(css);
            hideError();
            updateStatistics();
            showAlert('SASS/SCSS compiled successfully!', 'success');
        }
        else {
            throw new Error('SASS compiler API not found. Available methods: ' + Object.keys(sassCompiler).join(', '));
        }
    } catch (error) {
        isCompiling = false;
        showCompilingIndicator(false);
        
        const line = error.span?.start?.line || error.line || error.lineNumber || 'N/A';
        const column = error.span?.start?.column || error.column || error.columnNumber || 'N/A';
        const errorMessage = `Error: ${error.message}\nLine: ${line}\nColumn: ${column}`;
        cssEditor.setValue(`/* Compilation Error:\n${errorMessage}\n*/`);
        showError(errorMessage);
        updateStatistics();
        showAlert('Compilation error occurred!', 'danger');
    }
}

function toggleSyntax() {
    currentSyntax = currentSyntax === 'scss' ? 'sass' : 'scss';
    updateSyntaxToggle();
    
    // Update placeholder
    sassEditor.setOption('placeholder', `Enter your ${currentSyntax.toUpperCase()} code here...`);
    
    // Reload example if needed
    const currentValue = sassEditor.getValue();
    if (currentValue === exampleSCSS || currentValue === exampleSASS) {
        loadExample();
    }
    
    showAlert(`Switched to ${currentSyntax.toUpperCase()} syntax`, 'info');
}

function updateSyntaxToggle() {
    const toggleBtn = document.getElementById('syntaxToggle');
    if (toggleBtn) {
        toggleBtn.innerHTML = `<i class="fas fa-exchange-alt me-1"></i>${currentSyntax.toUpperCase()}`;
    }
}

function updateStatistics() {
    const sassCode = sassEditor.getValue();
    const cssCode = cssEditor.getValue();
    
    // SASS/SCSS statistics
    const sassLines = sassCode.split('\n').length;
    const sassChars = sassCode.length;
    
    // CSS statistics
    const cssLines = cssCode.split('\n').length;
    const cssChars = cssCode.length;
    
    document.getElementById('sassLines').textContent = sassLines;
    document.getElementById('sassChars').textContent = sassChars.toLocaleString();
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
        sassEditor.setValue('');
        cssEditor.setValue('');
        updateStatistics();
        clearLocalStorage();
        showAlert('Editor reset!', 'info');
    }
}

function loadExample() {
    if (confirm('Load example code? This will replace your current code.')) {
        const example = currentSyntax === 'scss' ? exampleSCSS : exampleSASS;
        sassEditor.setValue(example);
        compileSass();
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
        const sassCode = sassEditor.getValue();
        localStorage.setItem('easy-sass-code', sassCode);
        localStorage.setItem('easy-sass-syntax', currentSyntax);
    } catch (e) {
        // Ignore localStorage errors
    }
}

function loadFromLocalStorage() {
    try {
        const savedCode = localStorage.getItem('easy-sass-code');
        const savedSyntax = localStorage.getItem('easy-sass-syntax');
        if (savedCode) {
            sassEditor.setValue(savedCode);
            if (savedSyntax) {
                currentSyntax = savedSyntax;
                updateSyntaxToggle();
            }
            compileSass();
        }
    } catch (e) {
        // Ignore localStorage errors
    }
}

function clearLocalStorage() {
    try {
        localStorage.removeItem('easy-sass-code');
        localStorage.removeItem('easy-sass-syntax');
    } catch (e) {
        // Ignore localStorage errors
    }
}

