// Easy HTML - HTML Cleaner for Email
let editor;
let codeViewer;
let previewTimeout;
let syncTimeout; // Add debounce for sync operations
let isShowingCleanedContent = false;
let isUpdatingFromCodeMirror = false;
let isUpdatingFromTinyMCE = false;
let isCleaning = false; // Prevent multiple simultaneous cleaning requests
let tinyMCEHasFocus = false; // Track if TinyMCE has focus
let codeMirrorHasFocus = false; // Track if CodeMirror has focus

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeEditor();
    initializeCodeViewer();
    setupEventListeners();
    
    // Initialize Bootstrap tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Add debug function to window for troubleshooting
    window.debugEasyHTML = function() {
        console.log('=== Easy HTML Debug Info ===');
        console.log('isCleaning:', isCleaning);
        console.log('isShowingCleanedContent:', isShowingCleanedContent);
        console.log('isUpdatingFromCodeMirror:', isUpdatingFromCodeMirror);
        console.log('isUpdatingFromTinyMCE:', isUpdatingFromTinyMCE);
        console.log('Editor initialized:', !!editor);
        console.log('CodeViewer initialized:', !!codeViewer);
        
        const cleanBtn = document.getElementById('cleanBtn');
        console.log('Clean button disabled:', cleanBtn ? cleanBtn.disabled : 'not found');
        console.log('Clean button text:', cleanBtn ? cleanBtn.innerHTML : 'not found');
        
        const options = getCleaningOptions();
        console.log('Current cleaning options:', options);
    };
    
    // Add function to force reset all checkboxes
    window.resetAllCheckboxes = function() {
        const checkboxes = [
            'removeInlineStyles', 'removeClasses', 'removeSpans', 'removeEmptyTags',
            'removeComments', 'removeSuccessiveSpaces', 'convertTags', 'encodeSpecialChars',
            'removeImages', 'removeLinks', 'removeTables', 'replaceTablesWithDivs',
            'removeDivs', 'replaceDivsWithP'
        ];
        
        checkboxes.forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                checkbox.checked = false;
                console.log(`Reset ${id} to unchecked`);
            } else {
                console.log(`Checkbox ${id} not found`);
            }
        });
        
        console.log('All checkboxes reset to unchecked');
    };
    
    // Add function to force sync between editors
    window.forceSync = function() {
        console.log('=== Force Sync Between Editors ===');
        if (editor && codeViewer) {
            const tinyMCEContent = editor.getContent();
            const codeMirrorContent = codeViewer.getValue();
            
            console.log('TinyMCE content length:', tinyMCEContent.length);
            console.log('CodeMirror content length:', codeMirrorContent.length);
            
            // Force sync from TinyMCE to CodeMirror
            codeViewer.setValue(tinyMCEContent);
            codeViewer.refresh();
            
            console.log('Forced sync: TinyMCE -> CodeMirror');
        } else {
            console.log('Editors not initialized');
        }
    };
    
    // Add function to reset sync state
    window.resetSyncState = function() {
        console.log('=== Resetting Sync State ===');
        isShowingCleanedContent = false;
        isUpdatingFromCodeMirror = false;
        isUpdatingFromTinyMCE = false;
        isCleaning = false;
        
        const label = document.querySelector('.card-header h5');
        if (label) {
            label.innerHTML = '<i class="fas fa-code me-2"></i>Live HTML Editor';
        }
        
        console.log('Sync state reset - all flags cleared');
    };
});

function initializeEditor() {
    // Check if TinyMCE is loaded
    if (typeof tinymce === 'undefined') {
        console.error('TinyMCE is not loaded! Check if the script is included.');
        return;
    }
    
    console.log('TinyMCE version:', tinymce.majorVersion);
    console.log('Initializing TinyMCE editor...');
    
    try {
        tinymce.init({
        selector: '#htmlEditor',
        height: '100%',
        plugins: 'code link image table lists',
        toolbar: 'undo redo | bold italic underline | alignleft aligncenter alignright | bullist numlist | link image | table | code',
        menubar: false,
        statusbar: true,
        branding: false,
        // Custom CSS for editor content
        content_css: '../shared/tinymce-content.css',
        // HTML preservation settings (TinyMCE 6 compatible)
        valid_elements: '*[*]',
        extended_valid_elements: '*[*]',
        // Use valid string for forced_root_block (TinyMCE 6 requirement)
        forced_root_block: 'p',
        convert_urls: false,
        remove_script_host: false,
        relative_urls: false,
        // Disable problematic features that require additional plugins
        paste_data_images: false,
        paste_auto_cleanup_on_paste: false,
        paste_remove_styles: false,
        paste_remove_styles_if_webkit: false,
        paste_merge_formats: false,
        // Prevent URL truncation and modification
        url_converter: function(url, node, on_save) {
            // Never modify URLs - return as-is
            return url;
        },
        url_converter_scope: 'document',
        setup: function(ed) {
            editor = ed;
            
            // Apply dark mode to editor content
            ed.on('init', function() {
                const isDark = document.body.classList.contains('dark');
                if (isDark) {
                    ed.getBody().classList.add('dark');
                }
            });
            
            // Track focus events for TinyMCE
            ed.on('focus', function() {
                tinyMCEHasFocus = true;
            });
            
            ed.on('blur', function() {
                tinyMCEHasFocus = false;
            });
            
            // Prevent URL truncation on paste
            ed.on('PastePostProcess', function(e) {
                // Restore any truncated URLs in the pasted content
                let content = e.node.innerHTML || '';
                // Fix URLs with ellipsis patterns
                content = content.replace(/\[%E2%80%A6\]/g, '');
                content = content.replace(/…/g, '');
                content = content.replace(/\[\.\.\.\]/g, '');
                // Update the content if it was modified
                if (content !== (e.node.innerHTML || '')) {
                    e.node.innerHTML = content;
                }
            });
            
            // Also handle paste events to prevent URL truncation
            ed.on('paste', function(e) {
                // Get the pasted content
                let pastedContent = e.clipboardData ? e.clipboardData.getData('text/plain') : '';
                // If it looks like a URL, ensure it's not truncated
                if (pastedContent && /^https?:\/\//i.test(pastedContent)) {
                    // Prevent default paste handling that might truncate
                    // The content will be inserted as-is
                }
            });
            
            // Real-time HTML preview with debounce (NO CLEANING - just preview)
            // Only sync FROM TinyMCE TO CodeMirror when TinyMCE has focus
            ed.on('change keyup input paste', function() {
                        // Always reset the cleaned content flag when user starts editing
                        if (isShowingCleanedContent) {
                            isShowingCleanedContent = false;
                            const label = document.querySelector('.card-header h5');
                            if (label) {
                                label.innerHTML = '<i class="fas fa-code me-2"></i>Live HTML Editor';
                            }
                        }
                        
                        // Only sync FROM TinyMCE if it has focus AND CodeMirror doesn't have focus
                        // This prevents syncing when user is editing in CodeMirror
                        if (tinyMCEHasFocus && !codeMirrorHasFocus && !isUpdatingFromCodeMirror) {
                            clearTimeout(previewTimeout);
                            // Use debounce to batch rapid typing
                            previewTimeout = setTimeout(() => {
                                // Double check focus hasn't changed
                                if (tinyMCEHasFocus && !codeMirrorHasFocus) {
                                    syncTinyMCEToCodeMirror();
                                }
                            }, 300);
                        }
                    });
                    
                    // Remove SetContent handler to prevent infinite loops
                    // The change event handler above is sufficient for sync
            
            // Initial preview (with small delay to ensure editor is fully initialized)
            // On initial load, sync from TinyMCE to CodeMirror regardless of focus
            setTimeout(() => {
                if (editor && codeViewer) {
                    const htmlContent = editor.getContent();
                    if (htmlContent) {
                        codeViewer.setValue(htmlContent);
                        codeViewer.refresh();
                    }
                }
            }, 100);
        },
        // Add success callback
        init_instance_callback: function(ed) {
            console.log('TinyMCE editor initialized successfully!');
            console.log('Editor ID:', ed.id);
        }
    });
    } catch (error) {
        console.error('TinyMCE initialization error:', error);
        // Fallback: Initialize with minimal configuration (TinyMCE 6 compatible)
        tinymce.init({
            selector: '#htmlEditor',
            height: '100%',
            plugins: 'code',
            toolbar: 'undo redo | bold italic | code',
            menubar: false,
            statusbar: true,
            branding: false,
            // TinyMCE 6 compatible settings
            valid_elements: '*[*]',
            extended_valid_elements: '*[*]',
            forced_root_block: 'div',
            convert_urls: false,
            // Prevent URL truncation and modification
            url_converter: function(url, node, on_save) {
                // Never modify URLs - return as-is
                return url;
            },
            url_converter_scope: 'document',
            setup: function(ed) {
                editor = ed;
                
                // Track focus events for TinyMCE
                ed.on('focus', function() {
                    tinyMCEHasFocus = true;
                });
                
                ed.on('blur', function() {
                    tinyMCEHasFocus = false;
                });
                
                // Prevent URL truncation on paste
                ed.on('PastePostProcess', function(e) {
                    // Restore any truncated URLs in the pasted content
                    let content = e.node.innerHTML || '';
                    // Fix URLs with ellipsis patterns
                    content = content.replace(/\[%E2%80%A6\]/g, '');
                    content = content.replace(/…/g, '');
                    content = content.replace(/\[\.\.\.\]/g, '');
                    // Update the content if it was modified
                    if (content !== (e.node.innerHTML || '')) {
                        e.node.innerHTML = content;
                    }
                });
                
                // Also handle paste events to prevent URL truncation
                ed.on('paste', function(e) {
                    // Get the pasted content
                    let pastedContent = e.clipboardData ? e.clipboardData.getData('text/plain') : '';
                    // If it looks like a URL, ensure it's not truncated
                    if (pastedContent && /^https?:\/\//i.test(pastedContent)) {
                        // Prevent default paste handling that might truncate
                        // The content will be inserted as-is
                    }
                });
                
                ed.on('change keyup input paste', function() {
                    // Only sync FROM TinyMCE if it has focus AND CodeMirror doesn't have focus
                    if (tinyMCEHasFocus && !codeMirrorHasFocus && !isUpdatingFromCodeMirror) {
                        clearTimeout(previewTimeout);
                        previewTimeout = setTimeout(() => {
                            if (tinyMCEHasFocus && !codeMirrorHasFocus) {
                                syncTinyMCEToCodeMirror();
                            }
                        }, 300);
                    }
                });
                
                // Initial preview - on initial load, sync from TinyMCE to CodeMirror regardless of focus
                setTimeout(() => {
                    if (editor && codeViewer) {
                        const htmlContent = editor.getContent();
                        if (htmlContent) {
                            codeViewer.setValue(htmlContent);
                            codeViewer.refresh();
                        }
                    }
                }, 100);
            },
            // Add success callback for fallback
            init_instance_callback: function(ed) {
                console.log('TinyMCE fallback editor initialized successfully!');
                console.log('Editor ID:', ed.id);
            }
        });
    }
}

function initializeCodeViewer() {
    codeViewer = CodeMirror(document.getElementById('codeViewer'), {
        mode: 'htmlmixed',
        theme: 'default',
        lineNumbers: true,
        readOnly: false, // Make it editable
        lineWrapping: true,
        foldGutter: true,
        gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
        placeholder: 'Edit HTML directly here or paste code...',
        value: '',
        viewportMargin: Infinity // Allow scrolling for long content
    });
    
    // Track focus events for CodeMirror
    codeViewer.on('focus', function() {
        codeMirrorHasFocus = true;
    });
    
    codeViewer.on('blur', function() {
        codeMirrorHasFocus = false;
    });
    
    // Add live synchronization from CodeMirror to TinyMCE with debouncing
    // Only sync FROM CodeMirror TO TinyMCE when CodeMirror has focus
    codeViewer.on('change', function() {
        // Always reset the cleaned content flag when user starts editing
        if (isShowingCleanedContent) {
            isShowingCleanedContent = false;
            const label = document.querySelector('.card-header h5');
            if (label) {
                label.innerHTML = '<i class="fas fa-code me-2"></i>Live HTML Editor';
            }
        }
        
        // Clear any existing sync timeout
        clearTimeout(syncTimeout);
        
        // Only sync FROM CodeMirror if it has focus AND TinyMCE doesn't have focus
        // This prevents syncing when user is editing in TinyMCE
        if (codeMirrorHasFocus && !tinyMCEHasFocus && !isUpdatingFromTinyMCE) {
            syncTimeout = setTimeout(() => {
                // Double check focus hasn't changed
                if (codeMirrorHasFocus && !tinyMCEHasFocus) {
                    syncCodeMirrorToTinyMCE();
                }
            }, 300); // Debounce sync operations
        }
    });
}

function setupEventListeners() {
    // No auto-cleaning - only manual cleaning when button is clicked
    // The real-time preview will still work, but no automatic cleaning
}

// Sync FROM TinyMCE TO CodeMirror (only called when TinyMCE has focus)
function syncTinyMCEToCodeMirror() {
    if (!editor || !codeViewer) return;
    
    // Preserve TinyMCE cursor position before syncing
    let bookmark = null;
    try {
        if (editor.selection && editor.selection.getBookmark && tinyMCEHasFocus) {
            // Get bookmark before reading content - this preserves the selection
            // Use type 2 for persistent bookmarks that survive DOM changes
            bookmark = editor.selection.getBookmark(2);
        }
    } catch (e) {
        console.log('Could not preserve cursor position:', e);
    }
    
    // Get HTML content from TinyMCE
    const htmlContent = editor.getContent();
    
    // Update CodeMirror only if not showing cleaned content
    if (!isShowingCleanedContent) {
        // Only update if content is different to prevent unnecessary updates
        const currentCodeMirrorContent = codeViewer.getValue();
        if (currentCodeMirrorContent !== htmlContent) {
            // Mark that we're updating CodeMirror to prevent loops
            isUpdatingFromTinyMCE = true;
            
            // Update CodeMirror content
            codeViewer.setValue(htmlContent);
            codeViewer.refresh();
            
            // Reset flag after a brief delay
            setTimeout(() => {
                isUpdatingFromTinyMCE = false;
            }, 50);
        }
    }
    
    // Restore TinyMCE cursor position after syncing
    if (bookmark && tinyMCEHasFocus) {
        try {
            // Use requestAnimationFrame to ensure DOM is ready
            requestAnimationFrame(() => {
                if (editor && editor.selection && editor.selection.moveToBookmark && bookmark) {
                    try {
                        editor.selection.moveToBookmark(bookmark);
                        // Ensure focus is maintained
                        if (tinyMCEHasFocus) {
                            editor.focus();
                        }
                    } catch (bookmarkError) {
                        // If bookmark restoration fails, just maintain focus
                        if (tinyMCEHasFocus) {
                            try {
                                editor.focus();
                            } catch (focusError) {
                                // Ignore focus errors
                            }
                        }
                    }
                }
            });
        } catch (e) {
            // Ignore errors
        }
    }
    
    // Update the label to indicate it's showing raw HTML
    const label = document.querySelector('.card-header h5');
    if (label) {
        label.innerHTML = '<i class="fas fa-code me-2"></i>Live HTML Editor';
    }
}

// Sync FROM CodeMirror TO TinyMCE (only called when CodeMirror has focus)
function syncCodeMirrorToTinyMCE() {
    if (!editor || !codeViewer) return;
    
    const htmlContent = codeViewer.getValue();
    
    // Only update TinyMCE if content is actually different
    if (editor) {
        const currentTinyMCEContent = editor.getContent();
        if (currentTinyMCEContent !== htmlContent) {
            // Mark that we're updating TinyMCE to prevent loops
            isUpdatingFromCodeMirror = true;
            
            console.log('Syncing CodeMirror to TinyMCE');
            editor.setContent(htmlContent);
            
            // Reset flag after a brief delay
            setTimeout(() => {
                isUpdatingFromCodeMirror = false;
            }, 50);
        }
    }
}

// Legacy function for initial preview and backwards compatibility
function updateHtmlPreview() {
    // This is now just an alias that syncs from TinyMCE if it has focus
    if (tinyMCEHasFocus && !codeMirrorHasFocus) {
        syncTinyMCEToCodeMirror();
    }
}

function cleanHTML() {
    // THIS IS THE ONLY FUNCTION THAT CLEANS HTML
    // No automatic cleaning happens anywhere else
    
    // Prevent multiple simultaneous cleaning requests
    if (isCleaning) {
        console.log('Cleaning already in progress, please wait...');
        return;
    }
    
    if (!editor) {
        alert('Editor not initialized. Please refresh the page.');
        return;
    }

    // Get HTML content from TinyMCE
    const htmlContent = editor.getContent();
    
    if (!htmlContent.trim()) {
        alert('Please enter some HTML content to clean.');
        return;
    }

    // Get cleaning options (fresh check every time)
    const options = getCleaningOptions();
    console.log('Current cleaning options:', options);
    console.log('removeInlineStyles checkbox element:', document.getElementById('removeInlineStyles'));
    console.log('removeInlineStyles checked state:', document.getElementById('removeInlineStyles').checked);
    
    // Set cleaning flag
    isCleaning = true;
    
    // Reset state flags
    isShowingCleanedContent = false;
    isUpdatingFromCodeMirror = false;
    isUpdatingFromTinyMCE = false;

    // Show loading state
    const cleanBtn = document.getElementById('cleanBtn');
    if (!cleanBtn) {
        alert('Clean button not found. Please refresh the page.');
        isCleaning = false;
        return;
    }
    cleanBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Cleaning...';
    cleanBtn.disabled = true;

    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
        console.error('Cleaning request timed out');
        cleanBtn.innerHTML = '<i class="fas fa-magic me-2"></i>Clean HTML';
        cleanBtn.disabled = false;
        isCleaning = false;
        alert('Cleaning request timed out. Please try again.');
    }, 10000); // 10 second timeout

    // Send to backend for cleaning
    fetch('api/clean.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            html: htmlContent,
            options: options
        })
    })
    .then(async response => {
        const text = await response.text();
        if (!text.trim()) {
            throw new Error('Server returned an empty response (HTTP ' + response.status + ')');
        }
        let data;
        try {
            data = JSON.parse(text);
        } catch (parseError) {
            throw new Error('Invalid server response (HTTP ' + response.status + ')');
        }
        if (!response.ok && !data.error) {
            throw new Error('Server error (HTTP ' + response.status + ')');
        }
        return data;
    })
    .then(data => {
        if (data.success) {
            // Update CodeMirror with cleaned HTML
            codeViewer.setValue(data.cleanedHtml);
            codeViewer.refresh();
            
            // Update TinyMCE with cleaned HTML (synchronize both)
            // Temporarily disable sync flags to prevent conflicts
            isUpdatingFromTinyMCE = true;
            isUpdatingFromCodeMirror = true;
            
            // Set content and force immediate sync
            editor.setContent(data.cleanedHtml);
            
            // Force immediate sync to CodeMirror
            setTimeout(() => {
                codeViewer.setValue(data.cleanedHtml);
                codeViewer.refresh();
                console.log('Forced sync after cleaning');
            }, 100);
            
            // Update the label to show it's cleaned HTML
            const label = document.querySelector('.card-header h5');
            if (label) {
                label.innerHTML = '<i class="fas fa-magic me-2"></i>Cleaned HTML';
            }
            
            // Reset flags after a short delay to allow proper sync
            setTimeout(() => {
                isShowingCleanedContent = true;
                isUpdatingFromTinyMCE = false;
                isUpdatingFromCodeMirror = false;
            }, 300);
            
            // Show success message after a brief delay to allow button reset
            setTimeout(() => {
                showSuccessMessage();
            }, 100);
        } else {
            alert('Error cleaning HTML: ' + (data.error || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error cleaning HTML: ' + error.message);
    })
    .finally(() => {
        // Clear timeout
        clearTimeout(timeoutId);
        
        // Reset button state and flags
        cleanBtn.innerHTML = '<i class="fas fa-magic me-2"></i>Clean HTML';
        cleanBtn.disabled = false;
        isUpdatingFromCodeMirror = false;
        isUpdatingFromTinyMCE = false;
        isCleaning = false; // Reset cleaning flag
    });
}

function getCleaningOptions() {
    // Force refresh of all checkbox elements to ensure we get current state
    const removeInlineStylesEl = document.getElementById('removeInlineStyles');
    const removeClassesEl = document.getElementById('removeClasses');
    const removeSpansEl = document.getElementById('removeSpans');
    const removeEmptyTagsEl = document.getElementById('removeEmptyTags');
    const removeCommentsEl = document.getElementById('removeComments');
    const removeSuccessiveSpacesEl = document.getElementById('removeSuccessiveSpaces');
    const convertTagsEl = document.getElementById('convertTags');
    const encodeSpecialCharsEl = document.getElementById('encodeSpecialChars');
    const removeImagesEl = document.getElementById('removeImages');
    const removeLinksEl = document.getElementById('removeLinks');
    const removeTablesEl = document.getElementById('removeTables');
    const replaceTablesWithDivsEl = document.getElementById('replaceTablesWithDivs');
    const removeDivsEl = document.getElementById('removeDivs');
    const replaceDivsWithPEl = document.getElementById('replaceDivsWithP');
    const convertGoogleBoldEl = document.getElementById('convertGoogleBold');
    
    const options = {
        convertGoogleBold: convertGoogleBoldEl ? convertGoogleBoldEl.checked : false,
        removeInlineStyles: removeInlineStylesEl ? removeInlineStylesEl.checked : false,
        removeClasses: removeClassesEl ? removeClassesEl.checked : false,
        removeSpans: removeSpansEl ? removeSpansEl.checked : false,
        removeEmptyTags: removeEmptyTagsEl ? removeEmptyTagsEl.checked : false,
        removeComments: removeCommentsEl ? removeCommentsEl.checked : false,
        removeSuccessiveSpaces: removeSuccessiveSpacesEl ? removeSuccessiveSpacesEl.checked : false,
        convertTags: convertTagsEl ? convertTagsEl.checked : false,
        encodeSpecialChars: encodeSpecialCharsEl ? encodeSpecialCharsEl.checked : false,
        removeImages: removeImagesEl ? removeImagesEl.checked : false,
        removeLinks: removeLinksEl ? removeLinksEl.checked : false,
        removeTables: removeTablesEl ? removeTablesEl.checked : false,
        replaceTablesWithDivs: replaceTablesWithDivsEl ? replaceTablesWithDivsEl.checked : false,
        removeDivs: removeDivsEl ? removeDivsEl.checked : false,
        replaceDivsWithP: replaceDivsWithPEl ? replaceDivsWithPEl.checked : false
    };
    
    // Debug: Log each checkbox state
    console.log('removeInlineStyles element found:', !!removeInlineStylesEl);
    console.log('removeInlineStyles checked:', removeInlineStylesEl ? removeInlineStylesEl.checked : 'element not found');
    
    return options;
}

function copyToClipboard() {
    if (!codeViewer) {
        alert('Code viewer not initialized.');
        return;
    }
    
    const content = codeViewer.getValue();
    if (!content.trim()) {
        alert('No content to copy.');
        return;
    }
    
    try {
        navigator.clipboard.writeText(content).then(() => {
            showCopySuccess();
        });
    } catch (err) {
        alert('Failed to copy. Please select and copy manually.');
    }
}

function resetEditor() {
    if (confirm('Are you sure you want to reset the editor? This will clear all content.')) {
        if (editor) {
            editor.setContent('');
        }
        if (codeViewer) {
            codeViewer.setValue('');
        }
        
        // Reset all state flags
        isShowingCleanedContent = false;
        isUpdatingFromCodeMirror = false;
        isUpdatingFromTinyMCE = false;
        isCleaning = false;
        
        // Reset the label
        const label = document.querySelector('.card-header h5');
        if (label) {
            label.innerHTML = '<i class="fas fa-code me-2"></i>Live HTML Editor';
        }
        
        // Reset button state
        const cleanBtn = document.getElementById('cleanBtn');
        if (cleanBtn) {
            cleanBtn.innerHTML = '<i class="fas fa-magic me-2"></i>Clean HTML';
            cleanBtn.disabled = false;
        }
    }
}

function showSuccessMessage() {
    const cleanBtn = document.getElementById('cleanBtn');
    if (!cleanBtn) return;
    cleanBtn.innerHTML = '<i class="fas fa-check me-2"></i>Cleaned & Synced!';
    cleanBtn.classList.add('btn-success');
    cleanBtn.classList.remove('btn-primary');
    
    setTimeout(() => {
        // Reset to original "Clean HTML" text, not the "Cleaning..." text
        cleanBtn.innerHTML = '<i class="fas fa-magic me-2"></i>Clean HTML';
        cleanBtn.classList.remove('btn-success');
        cleanBtn.classList.add('btn-primary');
    }, 2000);
}

function showCopySuccess() {
    const copyBtn = document.querySelector('button[onclick="copyToClipboard()"]');
    const originalText = copyBtn.innerHTML;
    copyBtn.innerHTML = '<i class="fas fa-check me-2"></i>Copied!';
    copyBtn.classList.add('btn-success');
    copyBtn.classList.remove('btn-outline-primary');
    
    setTimeout(() => {
        copyBtn.innerHTML = originalText;
        copyBtn.classList.remove('btn-success');
        copyBtn.classList.add('btn-outline-primary');
    }, 2000);
}