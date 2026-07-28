<?php 
$pageTitle = 'Easy HTML - Clean HTML for Email';
$faviconPath = '../favicon.ico';
$cssPath = '../shared/master.css';
$themePath = '../shared/theme.js';
include '../shared/header.php'; 
?>

    <!-- TinyMCE CDN -->
    <script src="https://cdn.jsdelivr.net/npm/tinymce@6/tinymce.min.js"></script>
    <!-- CodeMirror -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/codemirror.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/theme/monokai.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/codemirror.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/mode/xml/xml.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/mode/htmlmixed/htmlmixed.min.js"></script>
    <!-- Easy HTML Specific CSS -->
    <link rel="stylesheet" href="css/styles.css?v=1.8">
    
    <!-- Override Bootstrap button styles -->
    <style>
        .btn-primary {
            background: var(--primary) !important;
            border-color: var(--primary) !important;
            color: #495057 !important;
        }
        
        .btn-primary:hover {
            background: var(--primary-hover) !important;
            border-color: var(--primary-hover) !important;
            color: #495057 !important;
        }
        
        .btn-primary:focus {
            background: var(--primary) !important;
            border-color: var(--primary) !important;
            color: #495057 !important;
            box-shadow: 0 0 0 0.2rem rgba(76, 175, 80, 0.25) !important;
        }
    </style>
    
    <div class="container-fluid">
        <!-- Main Content -->
        <div class="container tool-page-inner">
            <?php $toolInfoSlug = 'easy-html'; include __DIR__ . '/../shared/tool-info-bar.php'; ?>
            <div class="row">
                <!-- Left Side - Visual Editor -->
                <div class="col-lg-6">
                    <div class="card h-100">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h5 class="mb-0">
                                <i class="fas fa-edit me-2"></i>
                                <span id="visualEditorLabel" data-translate="HTML_EDITOR_VISUAL">Visual Editor</span>
                            </h5>
                            <div class="btn-group btn-group-sm" role="group">
                                <button type="button" class="btn btn-outline-primary" onclick="resetEditor()">
                                    <i class="fas fa-undo me-1"></i><span data-translate="HTML_RESET_BUTTON">Reset</span>
                                </button>
                                <button type="button" class="btn btn-outline-success" onclick="copyToClipboard()">
                                    <i class="fas fa-copy me-1"></i><span data-translate="HTML_COPY_BUTTON">Copy</span>
                                </button>
                            </div>
                        </div>
                        <div class="card-body p-0">
                            <textarea id="htmlEditor"></textarea>
                        </div>
                    </div>
                </div>

                <!-- Right Side - Code Editor -->
                <div class="col-lg-6">
                    <div class="card h-100">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h5 class="mb-0">
                                <i class="fas fa-code me-2"></i>
                                <span id="codeEditorLabel" data-translate="HTML_EDITOR_CODE">Code Editor</span>
                            </h5>
                            <div class="btn-group btn-group-sm" role="group">
                                <button type="button" class="btn btn-outline-primary" onclick="resetEditor()">
                                    <i class="fas fa-undo me-1"></i><span data-translate="HTML_RESET_BUTTON">Reset</span>
                                </button>
                                <button type="button" class="btn btn-outline-success" onclick="copyToClipboard()">
                                    <i class="fas fa-copy me-1"></i><span data-translate="HTML_COPY_BUTTON">Copy</span>
                                </button>
                            </div>
                        </div>
                        <div class="card-body p-0">
                            <div id="codeViewer" class="code-viewer"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Clean HTML Button -->
            <div class="row mt-4">
                <div class="col-12">
                    <button type="button" class="btn btn-primary btn-lg w-100" onclick="cleanHTML()" id="cleanBtn">
                        <i class="fas fa-magic me-2"></i><span data-translate="HTML_CLEAN_BUTTON">Clean HTML</span>
                    </button>
                </div>
            </div>

            <!-- Cleaning Options -->
            <div class="row mt-4">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0">
                                <i class="fas fa-magic me-2"></i>HTML Cleaning Options
                            </h5>
                        </div>
                        <div class="card-body">
                            <div class="alert alert-info">
                                <i class="fas fa-info-circle me-2"></i>
                                <strong>Email-Optimized Cleaning:</strong> Default options are pre-selected for email compatibility. 
                                Uncheck options you want to preserve, or check additional options for more aggressive cleaning.
                            </div>
                            
                            <div class="row">
                                <!-- Email Optimization -->
                                <div class="col-md-4">
                                    <h6>Email Optimization</h6>
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="removeInlineStyles" checked>
                                        <label class="form-check-label" for="removeInlineStyles">
                                            Remove inline styles
                                            <i class="fas fa-info-circle ms-1" data-bs-toggle="tooltip" title="Removes all style attributes from HTML elements"></i>
                                        </label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="removeClasses" checked>
                                        <label class="form-check-label" for="removeClasses">
                                            Remove classes, IDs, and editor attributes
                                            <i class="fas fa-info-circle ms-1" data-bs-toggle="tooltip" title="Removes class, id, and editor-specific attributes like data-*, aria-*, role, dir"></i>
                                        </label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="removeSpans" checked>
                                        <label class="form-check-label" for="removeSpans">
                                            Remove span tags
                                            <i class="fas fa-info-circle ms-1" data-bs-toggle="tooltip" title="Removes all span elements while preserving their content"></i>
                                        </label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="removeDivs" checked>
                                        <label class="form-check-label" for="removeDivs">
                                            Remove div tags
                                            <i class="fas fa-info-circle ms-1" data-bs-toggle="tooltip" title="Removes all div elements while preserving their content"></i>
                                        </label>
                                    </div>
                                </div>

                                <!-- Content Cleanup -->
                                <div class="col-md-4">
                                    <h6>Content Cleanup</h6>
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="removeEmptyTags" checked>
                                        <label class="form-check-label" for="removeEmptyTags">
                                            Remove empty tags
                                            <i class="fas fa-info-circle ms-1" data-bs-toggle="tooltip" title="Removes empty elements like empty paragraphs, divs, spans, etc."></i>
                                        </label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="removeComments" checked>
                                        <label class="form-check-label" for="removeComments">
                                            Remove comments
                                            <i class="fas fa-info-circle ms-1" data-bs-toggle="tooltip" title="Removes HTML comments like <!-- comment -->"></i>
                                        </label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="removeSuccessiveSpaces">
                                        <label class="form-check-label" for="removeSuccessiveSpaces">
                                            Remove successive &nbsp;s
                                            <i class="fas fa-info-circle ms-1" data-bs-toggle="tooltip" title="Removes multiple consecutive non-breaking spaces and normalizes whitespace"></i>
                                        </label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="convertTags" checked>
                                        <label class="form-check-label" for="convertTags">
                                            Convert &lt;b&gt; to &lt;strong&gt;, &lt;i&gt; to &lt;em&gt;
                                            <i class="fas fa-info-circle ms-1" data-bs-toggle="tooltip" title="Converts deprecated b and i tags to semantic strong and em tags"></i>
                                        </label>
                                    </div>
                                </div>

                                <!-- Advanced Options -->
                                <div class="col-md-4">
                                    <h6>Advanced Options</h6>
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="convertGoogleBold" checked>
                                        <label class="form-check-label" for="convertGoogleBold">
                                            Convert Google Docs bold to &lt;strong&gt;
                                            <i class="fas fa-info-circle ms-1" data-bs-toggle="tooltip" title="Converts Google Docs span tags with font-weight: bold to proper strong tags"></i>
                                        </label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="removeImages">
                                        <label class="form-check-label" for="removeImages">
                                            Remove images
                                            <i class="fas fa-info-circle ms-1" data-bs-toggle="tooltip" title="Removes all img tags from the HTML"></i>
                                        </label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="removeLinks">
                                        <label class="form-check-label" for="removeLinks">
                                            Remove links
                                            <i class="fas fa-info-circle ms-1" data-bs-toggle="tooltip" title="Removes all a tags while preserving their text content"></i>
                                        </label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="removeTables">
                                        <label class="form-check-label" for="removeTables">
                                            Remove tables
                                            <i class="fas fa-info-circle ms-1" data-bs-toggle="tooltip" title="Removes all table elements while preserving their content"></i>
                                        </label>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <?php include '../shared/footer.php'; ?>
    </div>

    <script src="js/app.js"></script>
    
    <!-- Initialize theme -->
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            if (typeof initTheme === 'function') {
                initTheme();
            }
        });
    </script>
</body>
</html>
