// Easy Search & Replace - Text Pattern Tool
let originalText = '';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Show/hide custom format field based on format selection
    const formatSelect = document.getElementById('lineNumberFormat');
    const customContainer = document.getElementById('customFormatContainer');
    
    if (formatSelect) {
        formatSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                customContainer.style.display = 'block';
            } else {
                customContainer.style.display = 'none';
            }
        });
    }
});

// Initialize regex examples
function initializeRegexExamples() {
    const commonExamples = [
        {
            pattern: '\\d+',
            description: 'Matches one or more digits',
            example: 'Matches: 123, 456, 789'
        },
        {
            pattern: '[a-zA-Z]+',
            description: 'Matches one or more letters',
            example: 'Matches: hello, World, ABC'
        },
        {
            pattern: '\\s+',
            description: 'Matches one or more whitespace characters',
            example: 'Matches spaces, tabs, newlines'
        },
        {
            pattern: '^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}',
            description: 'Matches email addresses',
            example: 'Matches: user@example.com'
        },
        {
            pattern: 'https?://[^\\s]+',
            description: 'Matches HTTP/HTTPS URLs',
            example: 'Matches: http://example.com, https://site.org'
        },
        {
            pattern: '\\b[A-Z][a-z]+\\b',
            description: 'Matches capitalized words',
            example: 'Matches: Hello, World, Text'
        },
        {
            pattern: '\\d{4}-\\d{2}-\\d{2}',
            description: 'Matches dates in YYYY-MM-DD format',
            example: 'Matches: 2024-01-15, 2023-12-25'
        },
        {
            pattern: '\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\b',
            description: 'Matches IP addresses',
            example: 'Matches: 192.168.1.1, 10.0.0.1'
        },
        {
            pattern: '#[a-fA-F0-9]{6}',
            description: 'Matches hex color codes',
            example: 'Matches: #FF5733, #00FF00'
        },
        {
            pattern: '[0-9]{4}\\s?[0-9]{4}\\s?[0-9]{4}\\s?[0-9]{4}',
            description: 'Matches credit card numbers',
            example: 'Matches: 1234 5678 9012 3456'
        },
        {
            pattern: '(\\+?[0-9]{1,3}[-.\\s]?)?\\(?[0-9]{1,4}\\)?[-.\\s]?[0-9]{1,4}[-.\\s]?[0-9]{1,9}',
            description: 'Matches phone numbers (international format)',
            example: 'Matches: +31 6 12345678, (020) 123-4567, +1-555-123-4567'
        },
        {
            pattern: '[A-Z]{2}\\d{2}\\s?[A-Z0-9]{4}\\s?\\d{4}\\s?\\d{4}\\s?\\d{4}\\s?\\d{4}',
            description: 'Matches IBAN (International Bank Account Number)',
            example: 'Matches: NL91 ABNA 0417 1643 00, GB82 WEST 1234 5698 7654 32'
        },
        {
            pattern: '[A-Z]{2}[0-9A-Z]{2,12}',
            description: 'Matches VAT ID (European format)',
            example: 'Matches: NL123456789B01, GB123456789, DE123456789'
        }
    ];
    
    const htmlExamples = [
        {
            pattern: '<span[^>]*>.*?</span>',
            description: 'Matches everything between span tags',
            example: 'Matches: <span class="text">Hello</span>, <span>World</span>'
        },
        {
            pattern: '<div[^>]*>.*?</div>',
            description: 'Matches everything between div tags (including content)',
            example: 'Matches: <div class="container">Content</div>'
        },
        {
            pattern: '<div[^>]*>\\s*</div>',
            description: 'Matches empty div tags',
            example: 'Matches: <div></div>, <div class="empty"></div>'
        },
        {
            pattern: '<p[^>]*>.*?</p>',
            description: 'Matches everything between paragraph tags',
            example: 'Matches: <p>Text</p>, <p class="intro">Content</p>'
        },
        {
            pattern: '<a[^>]*href=["\']([^"\']*)["\'][^>]*>.*?</a>',
            description: 'Matches anchor tags with href attribute',
            example: 'Matches: <a href="http://example.com">Link</a>'
        },
        {
            pattern: '<img[^>]*src=["\']([^"\']*)["\'][^>]*>',
            description: 'Matches image tags with src attribute',
            example: 'Matches: <img src="image.jpg" alt="Photo">'
        },
        {
            pattern: '<[^>]+class=["\']([^"\']*)["\']',
            description: 'Matches class attributes in HTML tags',
            example: 'Matches: class="container", class="btn-primary"'
        },
        {
            pattern: '<script[^>]*>.*?</script>',
            description: 'Matches script tags and their content',
            example: 'Matches: <script>alert("test");</script>'
        },
        {
            pattern: '<style[^>]*>.*?</style>',
            description: 'Matches style tags and their content',
            example: 'Matches: <style>.class { color: red; }</style>'
        },
        {
            pattern: '<!--.*?-->',
            description: 'Matches HTML comments',
            example: 'Matches: <!-- This is a comment -->'
        },
        {
            pattern: '<h[1-6][^>]*>.*?</h[1-6]>',
            description: 'Matches heading tags (h1-h6)',
            example: 'Matches: <h1>Title</h1>, <h2 class="sub">Subtitle</h2>'
        },
        {
            pattern: '<input[^>]*type=["\']([^"\']*)["\'][^>]*>',
            description: 'Matches input tags with type attribute',
            example: 'Matches: <input type="text" name="email">'
        },
        {
            pattern: '<(\\w+)[^>]*>\\s*</\\1>',
            description: 'Matches any self-closing or empty HTML tag',
            example: 'Matches: <div></div>, <span></span>, <p></p>'
        }
    ];
    
    // Populate common examples table
    const tableBody = document.getElementById('regexExamplesTable');
    if (tableBody) {
        commonExamples.forEach(ex => {
            const row = document.createElement('tr');
            row.style.cursor = 'pointer';
            row.innerHTML = `
                <td><code>${escapeHtml(ex.pattern)}</code></td>
                <td>${escapeHtml(ex.description)}</td>
                <td><small>${escapeHtml(ex.example)}</small></td>
            `;
            
            // Add click handler to insert pattern and close modal
            row.addEventListener('click', function() {
                const regexField = document.getElementById('useRegex');
                if (regexField) {
                    regexField.value = ex.pattern;
                    
                    // Close the modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('regexExamplesModal'));
                    if (modal) {
                        modal.hide();
                    }
                    
                    // Show success message
                    showAlert('Regex pattern inserted!', 'success');
                }
            });
            
            // Add hover effect
            row.addEventListener('mouseenter', function() {
                this.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
            });
            row.addEventListener('mouseleave', function() {
                this.style.backgroundColor = '';
            });
            
            tableBody.appendChild(row);
        });
    }
    
    // Populate HTML examples table
    const htmlTableBody = document.getElementById('regexHtmlExamplesTable');
    if (htmlTableBody) {
        htmlExamples.forEach(ex => {
            const row = document.createElement('tr');
            row.style.cursor = 'pointer';
            row.innerHTML = `
                <td><code>${escapeHtml(ex.pattern)}</code></td>
                <td>${escapeHtml(ex.description)}</td>
                <td><small>${escapeHtml(ex.example)}</small></td>
            `;
            
            // Add click handler to insert pattern and close modal
            row.addEventListener('click', function() {
                const regexField = document.getElementById('useRegex');
                if (regexField) {
                    regexField.value = ex.pattern;
                    
                    // Close the modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('regexExamplesModal'));
                    if (modal) {
                        modal.hide();
                    }
                    
                    // Show success message
                    showAlert('Regex pattern inserted!', 'success');
                }
            });
            
            // Add hover effect
            row.addEventListener('mouseenter', function() {
                this.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
            });
            row.addEventListener('mouseleave', function() {
                this.style.backgroundColor = '';
            });
            
            htmlTableBody.appendChild(row);
        });
    }
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show regex examples modal
function showRegexExamples() {
    const modal = new bootstrap.Modal(document.getElementById('regexExamplesModal'));
    modal.show();
}

// Perform search and replace
function performSearchReplace() {
    const textInput = document.getElementById('textInput');
    const searchPattern = document.getElementById('searchPattern').value;
    const useRegex = document.getElementById('useRegex').value;
    const replaceText = document.getElementById('replaceText').value;
    const caseSensitive = document.getElementById('caseSensitive').checked;
    
    let text = textInput.value;
    if (!text.trim()) {
        showAlert('Please enter text first!', 'warning');
        return;
    }
    
    try {
        let regex;
        let pattern;
        const usingCustomRegex = !!(useRegex && useRegex.trim());

        // Determine which pattern to use
        if (usingCustomRegex) {
            pattern = useRegex;
            // A complex user regex on a huge text can freeze the browser
            // (catastrophic backtracking) — cap the input for that path.
            const MAX_REGEX_TEXT = 200000;
            if (text.length > MAX_REGEX_TEXT) {
                showAlert(
                    'Text is too long for a custom regular expression (max '
                    + Math.round(MAX_REGEX_TEXT / 1000) + 'k characters). '
                    + 'Use the simple search field instead, or split the text.',
                    'warning'
                );
                return;
            }
        } else if (searchPattern && searchPattern.trim()) {
            pattern = escapeRegex(searchPattern);
        } else {
            showAlert('Please enter a search pattern!', 'warning');
            return;
        }

        // Create regex with flags
        let flags = 'g';
        if (!caseSensitive) {
            flags += 'i';
        }

        regex = new RegExp(pattern, flags);

        // Perform replacement, counting matches in the same pass
        let matchCount = 0;
        const replacement = replaceText || '';
        const newText = text.replace(regex, function(...args) {
            matchCount++;
            // Re-apply normal $1/$& semantics via manual expansion is overkill;
            // delegate to String.replace's own handling by rebuilding the call:
            return replacement.replace(/\$(\d+|&)/g, function(token, ref) {
                if (ref === '&') {
                    return args[0];
                }
                const groupIndex = parseInt(ref, 10);
                return groupIndex > 0 && groupIndex < args.length - 2 && args[groupIndex] !== undefined
                    ? args[groupIndex]
                    : token;
            });
        });

        // Update output
        document.getElementById('textOutput').value = newText;

        if (matchCount === 0) {
            showAlert('No matches found — nothing was replaced.', 'warning');
        } else {
            const overrideNote = usingCustomRegex && searchPattern && searchPattern.trim()
                ? ' (the regular expression was used; the simple search field is ignored when both are filled)'
                : '';
            showAlert('Replaced ' + matchCount + ' match' + (matchCount === 1 ? '' : 'es') + '!' + overrideNote, 'success');
        }

    } catch (error) {
        showAlert('Error: ' + error.message, 'danger');
    }
}

// Escape special regex characters
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Perform truncate
function performTruncate() {
    const textInput = document.getElementById('textInput');
    const length = parseInt(document.getElementById('truncateLength').value);
    const mode = document.getElementById('truncateMode').value;
    
    let text = textInput.value;
    if (!text.trim()) {
        showAlert('Please enter text first!', 'warning');
        return;
    }
    
    if (!length || length < 1) {
        showAlert('Please enter a valid length!', 'warning');
        return;
    }
    
    try {
        let result = '';
        
        switch (mode) {
            case 'characters':
                result = text.substring(0, length);
                break;
            case 'words':
                const words = text.split(/\s+/);
                result = words.slice(0, length).join(' ');
                break;
            case 'lines':
                const lines = text.split('\n');
                result = lines.slice(0, length).join('\n');
                break;
        }
        
        document.getElementById('textOutput').value = result;
        showAlert('Text truncated successfully!', 'success');
        
    } catch (error) {
        showAlert('Error truncating text: ' + error.message, 'danger');
    }
}

// Perform prefix
function performPrefix() {
    const textInput = document.getElementById('textInput');
    const prefixText = document.getElementById('prefixText').value;
    const prefixMode = document.getElementById('prefixMode').value;
    const skipEmptyLines = document.getElementById('skipEmptyLines').checked;
    
    let text = textInput.value;
    if (!text.trim()) {
        showAlert('Please enter text first!', 'warning');
        return;
    }
    
    if (!prefixText) {
        showAlert('Please enter prefix text!', 'warning');
        return;
    }
    
    try {
        let result = '';
        
        switch (prefixMode) {
            case 'single':
                result = prefixText + text;
                break;
            case 'lines':
                const lines = text.split('\n');
                result = lines.map(line => {
                    if (skipEmptyLines && line.trim() === '') {
                        return line;
                    }
                    return prefixText + line;
                }).join('\n');
                break;
            case 'paragraphs':
                // Paragraphs are separated by two or more newlines
                const paragraphs = text.split(/\n\s*\n/);
                result = paragraphs.map(para => {
                    if (skipEmptyLines && para.trim() === '') {
                        return para;
                    }
                    return prefixText + para;
                }).join('\n\n');
                break;
        }
        
        document.getElementById('textOutput').value = result;
        showAlert('Prefix added successfully!', 'success');
        
    } catch (error) {
        showAlert('Error adding prefix: ' + error.message, 'danger');
    }
}

// Perform add line numbers
function performAddLineNumbers() {
    const textInput = document.getElementById('textInput');
    const format = document.getElementById('lineNumberFormat').value;
    const customFormat = document.getElementById('customLineNumberFormat').value;
    const mode = document.querySelector('input[name="lineNumberMode"]:checked').value;
    
    let text = textInput.value;
    if (!text.trim()) {
        showAlert('Please enter text first!', 'warning');
        return;
    }
    
    try {
        const lines = text.split('\n');
        let lineNumber = 1;
        let result = '';
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Skip empty lines if mode is non-empty
            if (mode === 'nonempty' && line.trim() === '') {
                result += line;
                if (i < lines.length - 1) {
                    result += '\n';
                }
                continue;
            }
            
            // Format line number
            let numberFormat = '';
            if (format === 'custom' && customFormat) {
                numberFormat = customFormat.replace(/%n/g, lineNumber);
            } else {
                switch (format) {
                    case 'single':
                        numberFormat = lineNumber.toString();
                        break;
                    case 'dot':
                        numberFormat = lineNumber + '. ';
                        break;
                    case 'bracket':
                        numberFormat = lineNumber + ') ';
                        break;
                }
            }
            
            result += numberFormat + line;
            
            if (mode === 'nonempty' || line.trim() !== '') {
                lineNumber++;
            }
            
            if (i < lines.length - 1) {
                result += '\n';
            }
        }
        
        document.getElementById('textOutput').value = result;
        showAlert('Line numbers added successfully!', 'success');
        
    } catch (error) {
        showAlert('Error adding line numbers: ' + error.message, 'danger');
    }
}

// Perform remove line numbers
function performRemoveLineNumbers() {
    const textInput = document.getElementById('textInput');
    let text = textInput.value;
    
    if (!text.trim()) {
        showAlert('Please enter text first!', 'warning');
        return;
    }
    
    try {
        const lines = text.split('\n');
        const result = lines.map(line => {
            // Remove common line number patterns:
            // - Numbers at start: "1 ", "1. ", "1) ", "(1) ", etc.
            // - Numbers with dots: "1. "
            // - Numbers with brackets: "1) ", "(1)"
            // - Custom formats with %n
            return line.replace(/^\s*\(?\d+\)?\s*[\.\)]?\s*/, '').replace(/^\s*\d+\.?\s*/, '');
        }).join('\n');
        
        document.getElementById('textOutput').value = result;
        showAlert('Line numbers removed successfully!', 'success');
        
    } catch (error) {
        showAlert('Error removing line numbers: ' + error.message, 'danger');
    }
}

// Copy to clipboard
async function copyToClipboard() {
    const textOutput = document.getElementById('textOutput');
    const text = textOutput.value;
    
    if (!text.trim()) {
        showAlert('No text to copy!', 'warning');
        return;
    }
    
    try {
        await navigator.clipboard.writeText(text);
        showAlert('Text copied to clipboard!', 'success');
    } catch (err) {
        // Fallback for older browsers
        textOutput.select();
        document.execCommand('copy');
        showAlert('Text copied to clipboard!', 'success');
    }
}

// Download text
function downloadText() {
    const textOutput = document.getElementById('textOutput');
    const text = textOutput.value;
    
    if (!text.trim()) {
        showAlert('No text to download!', 'warning');
        return;
    }
    
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'search-replace-output.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showAlert('Text downloaded!', 'success');
}

// Clear all
function clearAll() {
    document.getElementById('textInput').value = '';
    document.getElementById('textOutput').value = '';
    document.getElementById('searchPattern').value = '';
    document.getElementById('useRegex').value = '';
    document.getElementById('replaceText').value = '';
    showAlert('All fields cleared!', 'info');
}

// Show alert message
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

