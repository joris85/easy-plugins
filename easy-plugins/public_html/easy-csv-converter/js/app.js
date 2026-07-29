// Easy CSV Converter - CSV Delimiter Conversion Tool
let originalCSV = '';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeFileUpload();
    initializeDragAndDrop();
});

// Initialize file upload
function initializeFileUpload() {
    const fileInput = document.getElementById('fileInput');
    const csvInput = document.getElementById('csvInput');
    
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            readFileAsText(file);
        }
    });
}

// Initialize drag and drop
function initializeDragAndDrop() {
    const dropArea = document.getElementById('dropArea');
    const csvInput = document.getElementById('csvInput');
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });
    
    // Handle dropped files
    dropArea.addEventListener('drop', handleDrop, false);
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function highlight() {
        dropArea.classList.add('drag-over');
    }
    
    function unhighlight() {
        dropArea.classList.remove('drag-over');
    }
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            readFileAsText(files[0]);
        }
    }
}

// Read file as text
function readFileAsText(file) {
    if (!file.type.includes('text') && !file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
        showAlert('Please select a CSV or text file!', 'warning');
        return;
    }

    // The parser runs on the main thread; very large files would freeze the tab
    const MAX_CSV_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_CSV_BYTES) {
        showAlert('This file is ' + (file.size / 1024 / 1024).toFixed(1)
            + 'MB — larger than the 10MB this tool can handle in the browser. Please split it first.', 'warning');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const text = e.target.result;
        document.getElementById('csvInput').value = text;
        originalCSV = text;
        showAlert('File loaded successfully!', 'success');
    };
    
    reader.onerror = function() {
        showAlert('Error reading file!', 'danger');
    };
    
    reader.readAsText(file);
}

// Convert CSV delimiter
function convertCSV() {
    const csvInput = document.getElementById('csvInput').value.trim();
    
    if (!csvInput) {
        showAlert('Please enter or upload CSV data first!', 'warning');
        return;
    }
    
    // Get settings
    let inputDelimiter = document.getElementById('inputDelimiter').value || ',';
    let inputQuote = document.getElementById('inputQuote').value || '"';
    let outputDelimiter = document.getElementById('outputDelimiter').value || ',';
    let outputQuote = document.getElementById('outputQuote').value || '"';
    const fullyQuoteAll = document.getElementById('fullyQuoteAll').checked;
    
    // Handle special characters
    if (inputDelimiter === '\\t') {
        inputDelimiter = '\t';
    }
    if (outputDelimiter === '\\t') {
        outputDelimiter = '\t';
    }
    
    try {
        // Parse CSV
        const parsed = parseCSV(csvInput, inputDelimiter, inputQuote);
        
        // Convert to new format
        const converted = convertToCSV(parsed, outputDelimiter, outputQuote, fullyQuoteAll);
        
        // Display result
        document.getElementById('csvOutput').value = converted;
        showAlert('CSV converted successfully!', 'success');
        
    } catch (error) {
        console.error('Conversion error:', error);
        showAlert('Error converting CSV: ' + error.message, 'danger');
    }
}

// Parse CSV with custom delimiter and quote
function parseCSV(csvText, delimiter, quote) {
    // Remove BOM if present
    csvText = csvText.replace(/^\uFEFF/, '');
    
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let insideQuotes = false;
    const quoteChar = quote;
    
    let i = 0;
    while (i < csvText.length) {
        const char = csvText[i];
        const nextChar = i + 1 < csvText.length ? csvText[i + 1] : null;
        
        if (char === quoteChar && !insideQuotes) {
            // Start of quoted field
            insideQuotes = true;
            i++;
        } else if (char === quoteChar && insideQuotes) {
            // Check if it's an escaped quote (double quote) or end of field
            if (nextChar === quoteChar) {
                // Escaped quote - add one quote to field
                currentField += quoteChar;
                i += 2; // Skip both quotes
            } else if (nextChar === delimiter || nextChar === '\n' || nextChar === '\r' || nextChar === null) {
                // End of quoted field
                insideQuotes = false;
                i++;
            } else {
                // Single quote not followed by delimiter or newline - treat as regular character
                // (some CSV files may have unescaped quotes)
                currentField += char;
                i++;
            }
        } else if (char === delimiter && !insideQuotes) {
            // Field separator
            currentRow.push(currentField);
            currentField = '';
            i++;
        } else if ((char === '\n' || (char === '\r' && nextChar !== '\n')) && !insideQuotes) {
            // End of row (handle both \n and \r\n)
            currentRow.push(currentField);
            rows.push(currentRow);
            currentRow = [];
            currentField = '';
            if (char === '\r' && nextChar === '\n') {
                i += 2; // Skip \r\n
            } else {
                i++;
            }
        } else {
            // Regular character (including newlines inside quoted fields)
            currentField += char;
            i++;
        }
    }
    
    // Handle last field/row
    if (currentField.length > 0 || currentRow.length > 0) {
        currentRow.push(currentField);
    }
    if (currentRow.length > 0) {
        rows.push(currentRow);
    }
    
    // Return all rows (preserving empty rows as they may be intentional)
    return rows;
}

// Convert parsed data to CSV with custom delimiter and quote
function convertToCSV(data, delimiter, quote, fullyQuoteAll) {
    if (!data || data.length === 0) {
        return '';
    }
    
    return data.map(row => {
        return row.map(field => {
            const fieldStr = String(field || '');
            
            // Determine if field needs quoting
            const needsQuoting = fullyQuoteAll || 
                                fieldStr.includes(delimiter) ||
                                fieldStr.includes('\n') ||
                                fieldStr.includes('\r') ||
                                fieldStr.includes(quote) ||
                                fieldStr.trim() !== fieldStr;
            
            if (needsQuoting) {
                // Escape quotes by doubling them
                const escapedField = fieldStr.replace(new RegExp(quote, 'g'), quote + quote);
                return quote + escapedField + quote;
            } else {
                return fieldStr;
            }
        }).join(delimiter);
    }).join('\n');
}

// Copy to clipboard
async function copyToClipboard() {
    const csvOutput = document.getElementById('csvOutput');
    const text = csvOutput.value;
    
    if (!text.trim()) {
        showAlert('No CSV to copy!', 'warning');
        return;
    }
    
    try {
        await navigator.clipboard.writeText(text);
        showAlert('CSV copied to clipboard!', 'success');
    } catch (err) {
        // Fallback for older browsers
        csvOutput.select();
        document.execCommand('copy');
        showAlert('CSV copied to clipboard!', 'success');
    }
}

// Download CSV
function downloadCSV() {
    const csvOutput = document.getElementById('csvOutput');
    const text = csvOutput.value;
    
    if (!text.trim()) {
        showAlert('No CSV to download!', 'warning');
        return;
    }
    
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'converted.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showAlert('CSV downloaded!', 'success');
}

// Clear all
function clearAll() {
    document.getElementById('csvInput').value = '';
    document.getElementById('csvOutput').value = '';
    document.getElementById('fileInput').value = '';
    originalCSV = '';
    showAlert('All fields cleared!', 'info');
}

// Perform search and replace on CSV input
function performSearchReplace() {
    const csvInput = document.getElementById('csvInput');
    const searchText = document.getElementById('searchText').value;
    const replaceText = document.getElementById('replaceText').value;
    const caseSensitive = document.getElementById('caseSensitive').checked;
    const columnIndex = document.getElementById('searchColumnIndex').value.trim();
    
    if (!searchText) {
        showAlert('Please enter text to search for!', 'warning');
        return;
    }
    
    let text = csvInput.value;
    if (!text.trim()) {
        showAlert('Please enter or upload CSV data first!', 'warning');
        return;
    }
    
    try {
        // If column index is specified, parse CSV and replace in specific column
        if (columnIndex !== '') {
            // Get delimiter from input settings
            let delimiter = document.getElementById('inputDelimiter').value || ',';
            if (delimiter === '\\t') {
                delimiter = '\t';
            }
            
            // Parse CSV
            const quote = document.getElementById('inputQuote').value || '"';
            const parsed = parseCSV(text, delimiter, quote);
            
            // Perform search and replace on specific column
            const targetColumn = parseInt(columnIndex);
            let flags = 'g';
            if (!caseSensitive) {
                flags += 'i';
            }
            const regex = new RegExp(escapeRegex(searchText), flags);
            
            let replacementCount = 0;
            for (let i = 0; i < parsed.length; i++) {
                const row = parsed[i];
                if (targetColumn >= 0 && targetColumn < row.length) {
                    const original = row[targetColumn];
                    row[targetColumn] = original.replace(regex, replaceText);
                    if (original !== row[targetColumn]) {
                        replacementCount++;
                    }
                }
            }
            
            // Convert back to CSV
            const quoteChar = document.getElementById('inputQuote').value || '"';
            const fullyQuoteAll = document.getElementById('fullyQuoteAll').checked;
            const converted = convertToCSV(parsed, delimiter, quoteChar, fullyQuoteAll);
            
            // Write to the output pane so the source text stays untouched
            document.getElementById('csvOutput').value = converted;
            showAlert(`Search and replace completed! Replaced in ${replacementCount} row(s). Result is in the output field.`, 'success');
        } else {
            // Replace in entire CSV text
            let flags = 'g';
            if (!caseSensitive) {
                flags += 'i';
            }
            
            const regex = new RegExp(escapeRegex(searchText), flags);
            const newText = text.replace(regex, replaceText);

            // Write to the output pane so the source text stays untouched
            document.getElementById('csvOutput').value = newText;
            showAlert('Search and replace completed! Result is in the output field.', 'success');
        }
    } catch (error) {
        showAlert('Error performing search and replace: ' + error.message, 'danger');
    }
}

// Escape special regex characters
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Perform date transformation
function performDateTransform() {
    const csvInput = document.getElementById('csvInput');
    const fromFormat = document.getElementById('fromDateFormat').value.trim();
    const toFormat = document.getElementById('toDateFormat').value.trim();
    const columnIndex = document.getElementById('dateColumnIndex').value.trim();
    
    if (!fromFormat || !toFormat) {
        showAlert('Please enter both from and to date formats!', 'warning');
        return;
    }
    
    let text = csvInput.value;
    if (!text.trim()) {
        showAlert('Please enter or upload CSV data first!', 'warning');
        return;
    }
    
    try {
        // Get delimiter from input settings
        let delimiter = document.getElementById('inputDelimiter').value || ',';
        if (delimiter === '\\t') {
            delimiter = '\t';
        }
        
        // Parse CSV
        const quote = document.getElementById('inputQuote').value || '"';
        const parsed = parseCSV(text, delimiter, quote);
        
        // Transform dates
        const targetColumn = columnIndex !== '' ? parseInt(columnIndex) : null;
        
        for (let i = 0; i < parsed.length; i++) {
            const row = parsed[i];
            
            if (targetColumn !== null) {
                // Transform specific column
                if (targetColumn >= 0 && targetColumn < row.length) {
                    row[targetColumn] = transformDateValue(row[targetColumn], fromFormat, toFormat);
                }
            } else {
                // Transform all columns
                for (let j = 0; j < row.length; j++) {
                    row[j] = transformDateValue(row[j], fromFormat, toFormat);
                }
            }
        }
        
        // Convert back to CSV
        const quoteChar = document.getElementById('inputQuote').value || '"';
        const fullyQuoteAll = document.getElementById('fullyQuoteAll').checked;
        const converted = convertToCSV(parsed, delimiter, quoteChar, fullyQuoteAll);
        
        // Write to the output pane so the source text stays untouched
        document.getElementById('csvOutput').value = converted;
        showAlert('Date transformation completed! Result is in the output field.', 'success');
        
    } catch (error) {
        console.error('Date transformation error:', error);
        showAlert('Error transforming dates: ' + error.message, 'danger');
    }
}

// Transform a single date value
function transformDateValue(value, fromFormat, toFormat) {
    if (!value || typeof value !== 'string') {
        return value;
    }
    
    // Try to parse the date using the fromFormat
    const date = parseDate(value.trim(), fromFormat);
    if (!date || isNaN(date.getTime())) {
        // If it's not a date, return as is
        return value;
    }
    
    // Format the date using toFormat
    return formatDate(date, toFormat);
}

// Parse date from a format string
function parseDate(dateString, format) {
    // Convert format to regex pattern
    const formatPattern = format
        .replace(/YYYY/g, '(\\d{4})')
        .replace(/MM/g, '(\\d{2})')
        .replace(/DD/g, '(\\d{2})')
        .replace(/YY/g, '(\\d{2})')
        .replace(/M/g, '(\\d{1,2})')
        .replace(/D/g, '(\\d{1,2})');
    
    // Escape special characters
    const escapedFormat = formatPattern.replace(/[/\-\.]/g, '([/\\-\\.])');
    const regex = new RegExp('^' + escapedFormat + '$');
    const match = dateString.match(regex);
    
    if (!match) {
        return null;
    }
    
    // Extract year, month, day from format
    let year, month, day;
    const parts = match.slice(1);
    
    // Find positions in format
    const yearPos = format.indexOf('YYYY');
    const monthPos = format.indexOf('MM');
    const dayPos = format.indexOf('DD');
    
    if (yearPos === -1 || monthPos === -1 || dayPos === -1) {
        // Try with shorter formats
        const yearPos2 = format.indexOf('YY');
        const monthPos2 = format.search(/M+/);
        const dayPos2 = format.search(/D+/);
        
        // Extract based on positions (simplified)
        let partIndex = 0;
        const dateParts = dateString.split(/[\/\-\.]/);
        
        for (let i = 0; i < format.split(/[\/\-\.]/).length; i++) {
            const formatPart = format.split(/[\/\-\.]/)[i];
            if (formatPart.includes('Y')) {
                year = parseInt(dateParts[i]);
                if (year < 100) {
                    year += 2000; // Assume 2000s
                }
            } else if (formatPart.includes('M')) {
                month = parseInt(dateParts[i]) - 1; // JS months are 0-indexed
            } else if (formatPart.includes('D')) {
                day = parseInt(dateParts[i]);
            }
        }
    } else {
        // Standard YYYY-MM-DD format
        const dateParts = dateString.split(/[\/\-\.]/);
        const formatParts = format.split(/[\/\-\.]/);
        
        for (let i = 0; i < formatParts.length; i++) {
            if (formatParts[i].includes('Y')) {
                year = parseInt(dateParts[i]);
                if (formatParts[i].length === 2 && year < 100) {
                    year += 2000;
                }
            } else if (formatParts[i].includes('M')) {
                month = parseInt(dateParts[i]) - 1;
            } else if (formatParts[i].includes('D')) {
                day = parseInt(dateParts[i]);
            }
        }
    }
    
    // month is 0-indexed, so January (0) is valid — check undefined/NaN explicitly
    if (!year || month == null || Number.isNaN(month) || month < 0 || month > 11 || !day) {
        return null;
    }

    return new Date(year, month, day);
}

// Format date to a format string
function formatDate(date, format) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    let formatted = format;
    formatted = formatted.replace(/YYYY/g, String(year));
    formatted = formatted.replace(/YY/g, String(year).slice(-2));
    formatted = formatted.replace(/MM/g, String(month).padStart(2, '0'));
    formatted = formatted.replace(/M/g, String(month));
    formatted = formatted.replace(/DD/g, String(day).padStart(2, '0'));
    formatted = formatted.replace(/D/g, String(day));
    
    return formatted;
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

