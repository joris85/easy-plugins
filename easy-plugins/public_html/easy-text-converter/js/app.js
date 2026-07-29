// Easy Text - Text Conversion and Formatting Tool
let lastConvertedText = '';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    const textInput = document.getElementById('textInput');
    
    // Add event listeners
    textInput.addEventListener('input', updateStatistics);
    
    // Initial statistics update
    updateStatistics();
});

// Update text statistics
function updateStatistics() {
    const text = document.getElementById('textInput').value;
    
    // Character count
    const charCount = text.length;
    document.getElementById('charCount').textContent = charCount;
    
    // Word count
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    const wordCount = text.trim() === '' ? 0 : words.length;
    document.getElementById('wordCount').textContent = wordCount;
    
    // Sentence count
    const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
    const sentenceCount = sentences.length;
    document.getElementById('sentenceCount').textContent = sentenceCount;
    
    // Line count
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const lineCount = text.trim() === '' ? 0 : lines.length;
    document.getElementById('lineCount').textContent = lineCount;
}

// Convert text based on type
function convertText(type) {
    const textInput = document.getElementById('textInput');
    const text = textInput.value;
    
    if (text.trim() === '') {
        showAlert('Please enter some text first!', 'warning');
        return;
    }
    
    let convertedText = '';
    
    switch (type) {
        case 'sentence':
            convertedText = toSentenceCase(text);
            break;
        case 'lower':
            convertedText = text.toLowerCase();
            break;
        case 'upper':
            convertedText = text.toUpperCase();
            break;
        case 'capitalize':
            convertedText = toCapitalizeCase(text);
            break;
        case 'title':
            convertedText = toTitleCase(text);
            break;
        case 'alternating':
            convertedText = toAlternatingCase(text);
            break;
        case 'reverse':
            // Array.from keeps emoji/surrogate pairs intact
            convertedText = Array.from(text).reverse().join('');
            break;
        case 'inverse':
            convertedText = toInverseCase(text);
            break;
        case 'removeSpaces':
            convertedText = text.replace(/\s+/g, '');
            break;
        case 'removeLineBreaks':
            convertedText = text.replace(/\n/g, ' ').replace(/\r/g, '');
            break;
        case 'removeDuplicates':
            convertedText = removeDuplicateLines(text);
            break;
        case 'sortLines':
            convertedText = sortLines(text);
            break;
        default:
            showAlert('Unknown conversion type!', 'danger');
            return;
    }
    
    // Store the text before conversion for reset functionality
    lastConvertedText = textInput.value;
    
    textInput.value = convertedText;
    updateStatistics();
    showAlert(`Text converted to ${getConversionName(type)}!`, 'success');
}

// Convert to sentence case
function toSentenceCase(text) {
    // Capitalize at start and after . ! ? (also across line breaks)
    return text.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w|\n\s*\w)/g, function(match) {
        return match.toUpperCase();
    });
}

// Convert to capitalize case
function toCapitalizeCase(text) {
    return text.toLowerCase().replace(/\b\w/g, function(match) {
        return match.toUpperCase();
    });
}

// Convert to title case
function toTitleCase(text) {
    const smallWords = ['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'if', 'in', 'of', 'on', 'or', 'the', 'to', 'up', 'with'];

    const words = text.toLowerCase().match(/\S+/g);
    if (!words) {
        return text;
    }

    const capitalize = (word) => word.charAt(0).toUpperCase() + word.slice(1);
    const result = words.map((word, index) => {
        // First and last word are always capitalized; small words stay lowercase
        if (index === 0 || index === words.length - 1) {
            return capitalize(word);
        }
        return smallWords.includes(word) ? word : capitalize(word);
    });

    return result.join(' ');
}

// Convert to alternating case
function toAlternatingCase(text) {
    return Array.from(text).map((char, index) => {
        if (char.match(/[a-zA-Z]/)) {
            return index % 2 === 0 ? char.toLowerCase() : char.toUpperCase();
        }
        return char;
    }).join('');
}

// Convert to inverse case
function toInverseCase(text) {
    return Array.from(text).map(char => {
        if (char === char.toUpperCase() && char !== char.toLowerCase()) {
            return char.toLowerCase();
        } else if (char === char.toLowerCase() && char !== char.toUpperCase()) {
            return char.toUpperCase();
        }
        return char;
    }).join('');
}

// Remove duplicate lines
function removeDuplicateLines(text) {
    const lines = text.split('\n');
    const uniqueLines = [...new Set(lines)];
    return uniqueLines.join('\n');
}

// Sort lines alphabetically
function sortLines(text) {
    const lines = text.split('\n');
    return lines.sort().join('\n');
}

// Get conversion name for display
function getConversionName(type) {
    const names = {
        'sentence': 'Sentence Case',
        'lower': 'Lower Case',
        'upper': 'Upper Case',
        'capitalize': 'Capitalized Case',
        'title': 'Title Case',
        'alternating': 'Alternating Case',
        'reverse': 'Reverse Text',
        'inverse': 'Inverse Case',
        'removeSpaces': 'Remove Spaces',
        'removeLineBreaks': 'Remove Line Breaks',
        'removeDuplicates': 'Remove Duplicates',
        'sortLines': 'Sort Lines'
    };
    return names[type] || type;
}

// Copy text to clipboard
async function copyToClipboard() {
    const textInput = document.getElementById('textInput');
    const text = textInput.value;
    
    if (text.trim() === '') {
        showAlert('No text to copy!', 'warning');
        return;
    }
    
    try {
        await navigator.clipboard.writeText(text);
        showAlert('Text copied to clipboard!', 'success');
    } catch (err) {
        // Fallback for older browsers
        textInput.select();
        document.execCommand('copy');
        showAlert('Text copied to clipboard!', 'success');
    }
}

// Clear text
function clearText() {
    const textInput = document.getElementById('textInput');
    textInput.value = '';
    lastConvertedText = '';
    updateStatistics();
    showAlert('Text cleared!', 'info');
}

// Download text as file
function downloadText() {
    const textInput = document.getElementById('textInput');
    const text = textInput.value;
    
    if (text.trim() === '') {
        showAlert('No text to download!', 'warning');
        return;
    }
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'converted-text.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showAlert('Text downloaded as file!', 'success');
}

// Reset to last converted text
function resetText() {
    const textInput = document.getElementById('textInput');
    
    if (lastConvertedText === '') {
        showAlert('No previous conversion to reset to!', 'warning');
        return;
    }
    
    textInput.value = lastConvertedText;
    updateStatistics();
    showAlert('Text reset to previous conversion!', 'info');
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

// Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + Enter to convert to sentence case
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        convertText('sentence');
    }
    
    // Ctrl/Cmd + C to copy
    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && e.target.id === 'textInput') {
        e.preventDefault();
        copyToClipboard();
    }
    
    // Ctrl/Cmd + A to select all
    if ((e.ctrlKey || e.metaKey) && e.key === 'a' && e.target.id === 'textInput') {
        // Allow default behavior
    }
});

// Add button click animations
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('btn')) {
        e.target.classList.add('success-animation');
        setTimeout(() => {
            e.target.classList.remove('success-animation');
        }, 600);
    }
});

// Privacy modal function - uses shared modal from privacy-modal.php
function showPrivacyModal() {
    const modal = new bootstrap.Modal(document.getElementById('privacyModal'));
    modal.show();
}
