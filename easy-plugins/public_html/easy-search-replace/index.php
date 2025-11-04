<?php 
$pageTitle = 'Easy Search & Replace - Text Pattern Tool';
$faviconPath = '../favicon.ico';
$cssPath = '../shared/master.css';
$themePath = '../shared/theme.js';
include '../shared/header.php'; 
?>

    <!-- Easy Search & Replace Specific CSS -->
    <link rel="stylesheet" href="css/styles.css?v=1.0">
    
    <div class="container-fluid">
        <!-- Main Content -->
        <div class="container py-4">
            
            <!-- Input Section -->
            <div class="row">
                <div class="col-12">
                    <div class="card shadow-sm">
                        <div class="card-header">
                            <h5 class="mb-0">
                                <i class="fas fa-search me-2"></i>
                                <span data-translate="SEARCH_INPUT_TITLE">Input Text</span>
                            </h5>
                        </div>
                        <div class="card-body">
                            <textarea id="textInput" class="form-control font-monospace" rows="8" placeholder="Enter or paste your text here..."></textarea>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tool Options Section -->
            <div class="row mt-4">
                <div class="col-lg-6">
                    <div class="card shadow-sm">
                        <div class="card-header">
                            <h5 class="mb-0">
                                <i class="fas fa-cog me-2"></i>
                                <span data-translate="SEARCH_FIND_OPTIONS">Find Options</span>
                            </h5>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <label for="searchPattern" class="form-label">
                                    <span data-translate="SEARCH_FIND_PATTERN">Find This Pattern in Text</span>
                                </label>
                                <input type="text" class="form-control" id="searchPattern" placeholder="Enter text to find...">
                            </div>
                            <div class="form-check mb-3">
                                <input class="form-check-input" type="checkbox" id="caseSensitive">
                                <label class="form-check-label" for="caseSensitive">
                                    <span data-translate="SEARCH_CASE_SENSITIVE">Case sensitive</span>
                                </label>
                            </div>
                            <div class="mb-3">
                                <label for="useRegex" class="form-label">
                                    <span data-translate="SEARCH_USE_REGEX">Find a Pattern Using a RegExp</span>
                                </label>
                                <input type="text" class="form-control font-monospace" id="useRegex" placeholder="Enter regex pattern...">
                                <small class="form-text text-muted">
                                    <span data-translate="SEARCH_REGEX_HINT">Use regular expressions for advanced pattern matching</span>
                                </small>
                            </div>
                            <div class="mb-3">
                                <button type="button" class="btn btn-outline-info btn-sm" onclick="showRegexExamples()">
                                    <i class="fas fa-info-circle me-1"></i>
                                    <span data-translate="SEARCH_SHOW_EXAMPLES">Show Regex Examples</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-lg-6">
                    <div class="card shadow-sm">
                        <div class="card-header">
                            <h5 class="mb-0">
                                <i class="fas fa-arrow-right me-2"></i>
                                <span data-translate="SEARCH_REPLACE_OPTIONS">Replace Options</span>
                            </h5>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <label for="replaceText" class="form-label">
                                    <span data-translate="SEARCH_REPLACE_WITH">Replace for</span>
                                </label>
                                <input type="text" class="form-control" id="replaceText" placeholder="Enter replacement text...">
                            </div>
                            <div class="mb-3">
                                <button type="button" class="btn btn-primary w-100" onclick="performSearchReplace()">
                                    <i class="fas fa-exchange-alt me-2"></i>
                                    <span data-translate="SEARCH_REPLACE_BUTTON">Search & Replace</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Advanced Tools Section (Accordion) -->
            <div class="row mt-4">
                <div class="col-12">
                    <div class="accordion" id="advancedToolsAccordion">
                        <div class="accordion-item">
                            <h2 class="accordion-header" id="advancedToolsHeading">
                                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#advancedToolsCollapse" aria-expanded="false" aria-controls="advancedToolsCollapse">
                                    <i class="fas fa-cogs me-2"></i>
                                    <span data-translate="SEARCH_ADVANCED_TOOLS">Advanced Tools</span>
                                </button>
                            </h2>
                            <div id="advancedToolsCollapse" class="accordion-collapse collapse" aria-labelledby="advancedToolsHeading" data-bs-parent="#advancedToolsAccordion">
                                <div class="accordion-body">
                                    <div class="row">
                                        <!-- Truncate Text -->
                                        <div class="col-lg-4 mb-3">
                                            <div class="card shadow-sm">
                                                <div class="card-header">
                                                    <h5 class="mb-0">
                                                        <i class="fas fa-cut me-2"></i>
                                                        <span data-translate="SEARCH_TRUNCATE_TITLE">Truncate Text</span>
                                                    </h5>
                                                </div>
                                                <div class="card-body">
                                                    <div class="mb-3">
                                                        <label for="truncateLength" class="form-label">
                                                            <span data-translate="SEARCH_TRUNCATE_LENGTH">Length</span>
                                                        </label>
                                                        <input type="number" class="form-control" id="truncateLength" placeholder="Enter length..." min="1">
                                                    </div>
                                                    <div class="mb-3">
                                                        <label for="truncateMode" class="form-label">
                                                            <span data-translate="SEARCH_TRUNCATE_MODE">Mode</span>
                                                        </label>
                                                        <select class="form-control" id="truncateMode">
                                                            <option value="characters" data-translate="SEARCH_TRUNCATE_CHARS">Characters</option>
                                                            <option value="words" data-translate="SEARCH_TRUNCATE_WORDS">Words</option>
                                                            <option value="lines" data-translate="SEARCH_TRUNCATE_LINES">Lines</option>
                                                        </select>
                                                    </div>
                                                    <button type="button" class="btn btn-outline-primary w-100" onclick="performTruncate()">
                                                        <i class="fas fa-scissors me-1"></i>
                                                        <span data-translate="SEARCH_TRUNCATE_BUTTON">Truncate</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Prefix Function -->
                                        <div class="col-lg-4 mb-3">
                                            <div class="card shadow-sm">
                                                <div class="card-header">
                                                    <h5 class="mb-0">
                                                        <i class="fas fa-plus-circle me-2"></i>
                                                        <span data-translate="SEARCH_PREFIX_TITLE">Add Prefix</span>
                                                    </h5>
                                                </div>
                                                <div class="card-body">
                                                    <div class="mb-3">
                                                        <label for="prefixText" class="form-label">
                                                            <span data-translate="SEARCH_PREFIX_TEXT">Prefix text</span>
                                                        </label>
                                                        <input type="text" class="form-control" id="prefixText" placeholder="Enter prefix...">
                                                    </div>
                                                    <div class="mb-3">
                                                        <label for="prefixMode" class="form-label">
                                                            <span data-translate="SEARCH_PREFIX_MODE">Prefix Mode</span>
                                                        </label>
                                                        <select class="form-control" id="prefixMode">
                                                            <option value="single" data-translate="SEARCH_PREFIX_SINGLE">Single Prefix Mode</option>
                                                            <option value="lines" data-translate="SEARCH_PREFIX_LINES">Line-by-line Mode</option>
                                                            <option value="paragraphs" data-translate="SEARCH_PREFIX_PARAGRAPHS">Paragraph Mode</option>
                                                        </select>
                                                    </div>
                                                    <div class="form-check mb-3">
                                                        <input class="form-check-input" type="checkbox" id="skipEmptyLines">
                                                        <label class="form-check-label" for="skipEmptyLines">
                                                            <span data-translate="SEARCH_SKIP_EMPTY">Skip Empty Lines</span>
                                                        </label>
                                                    </div>
                                                    <button type="button" class="btn btn-outline-primary w-100" onclick="performPrefix()">
                                                        <i class="fas fa-plus me-1"></i>
                                                        <span data-translate="SEARCH_PREFIX_BUTTON">Add Prefix</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Add Line Numbers -->
                                        <div class="col-lg-4 mb-3">
                                            <div class="card shadow-sm">
                                                <div class="card-header">
                                                    <h5 class="mb-0">
                                                        <i class="fas fa-list-ol me-2"></i>
                                                        <span data-translate="SEARCH_LINE_NUMBERS_TITLE">Line Numbers</span>
                                                    </h5>
                                                </div>
                                                <div class="card-body">
                                                    <div class="mb-3">
                                                        <label class="form-label">
                                                            <span data-translate="SEARCH_LINE_NUMBERS_MODE">Numbering Mode</span>
                                                        </label>
                                                        <div class="form-check">
                                                            <input class="form-check-input" type="radio" name="lineNumberMode" id="lineNumbersAll" value="all" checked>
                                                            <label class="form-check-label" for="lineNumbersAll">
                                                                <span data-translate="SEARCH_LINE_NUMBERS_ALL">Number All Lines</span>
                                                            </label>
                                                        </div>
                                                        <div class="form-check">
                                                            <input class="form-check-input" type="radio" name="lineNumberMode" id="lineNumbersNonEmpty" value="nonempty">
                                                            <label class="form-check-label" for="lineNumbersNonEmpty">
                                                                <span data-translate="SEARCH_LINE_NUMBERS_NONEMPTY">Number Non-empty Lines</span>
                                                            </label>
                                                        </div>
                                                    </div>
                                                    <div class="mb-3">
                                                        <label for="lineNumberFormat" class="form-label">
                                                            <span data-translate="SEARCH_LINE_NUMBERS_FORMAT">Number Format</span>
                                                        </label>
                                                        <select class="form-control" id="lineNumberFormat">
                                                            <option value="single" data-translate="SEARCH_LINE_NUMBERS_SINGLE">Single Number: 1 2 3</option>
                                                            <option value="dot" data-translate="SEARCH_LINE_NUMBERS_DOT">With Dot: 1. 2. 3.</option>
                                                            <option value="bracket" data-translate="SEARCH_LINE_NUMBERS_BRACKET">With Bracket: 1) 2) 3)</option>
                                                            <option value="custom" data-translate="SEARCH_LINE_NUMBERS_CUSTOM">Custom</option>
                                                        </select>
                                                    </div>
                                                    <div class="mb-3" id="customFormatContainer" style="display: none;">
                                                        <label for="customLineNumberFormat" class="form-label">
                                                            <span data-translate="SEARCH_LINE_NUMBERS_CUSTOM_FORMAT">Custom Format</span>
                                                        </label>
                                                        <input type="text" class="form-control" id="customLineNumberFormat" placeholder="e.g., (%n) or %n. ">
                                                        <small class="form-text text-muted">
                                                            <span data-translate="SEARCH_LINE_NUMBERS_CUSTOM_HINT">Use %n for the line number</span>
                                                        </small>
                                                    </div>
                                                    <button type="button" class="btn btn-outline-primary w-100 mb-2" onclick="performAddLineNumbers()">
                                                        <i class="fas fa-plus me-1"></i>
                                                        <span data-translate="SEARCH_LINE_NUMBERS_ADD">Add Line Numbers</span>
                                                    </button>
                                                    <button type="button" class="btn btn-outline-danger w-100" onclick="performRemoveLineNumbers()">
                                                        <i class="fas fa-minus me-1"></i>
                                                        <span data-translate="SEARCH_LINE_NUMBERS_REMOVE">Remove Line Numbers</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Output Section -->
            <div class="row mt-4">
                <div class="col-12">
                    <div class="card shadow-sm">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h5 class="mb-0">
                                <i class="fas fa-file-alt me-2"></i>
                                <span data-translate="SEARCH_OUTPUT_TITLE">Output Text</span>
                            </h5>
                            <div class="btn-group btn-group-sm" role="group">
                                <button type="button" class="btn btn-outline-success" onclick="copyToClipboard()">
                                    <i class="fas fa-copy me-1"></i>
                                    <span data-translate="SEARCH_COPY_BUTTON">Copy</span>
                                </button>
                                <button type="button" class="btn btn-outline-primary" onclick="downloadText()">
                                    <i class="fas fa-download me-1"></i>
                                    <span data-translate="SEARCH_DOWNLOAD_BUTTON">Download</span>
                                </button>
                                <button type="button" class="btn btn-outline-secondary" onclick="clearAll()">
                                    <i class="fas fa-trash me-1"></i>
                                    <span data-translate="SEARCH_CLEAR_BUTTON">Clear</span>
                                </button>
                            </div>
                        </div>
                        <div class="card-body">
                            <textarea id="textOutput" class="form-control font-monospace" rows="12" readonly placeholder="Output text will appear here..."></textarea>
                        </div>
                    </div>
                </div>
            </div>

        </div>
        
        <?php include '../shared/footer.php'; ?>
    </div>

    <!-- Regex Examples Modal -->
    <div class="modal fade" id="regexExamplesModal" tabindex="-1" aria-labelledby="regexExamplesModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="regexExamplesModalLabel" data-translate="SEARCH_REGEX_EXAMPLES_TITLE">Common Regex Examples</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <ul class="nav nav-tabs mb-3" id="regexTabs" role="tablist">
                        <li class="nav-item" role="presentation">
                            <button class="nav-link active" id="common-tab" data-bs-toggle="tab" data-bs-target="#common" type="button" role="tab">
                                <span data-translate="SEARCH_REGEX_TAB_COMMON">Common</span>
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="html-tab" data-bs-toggle="tab" data-bs-target="#html" type="button" role="tab">
                                <span data-translate="SEARCH_REGEX_TAB_HTML">HTML</span>
                            </button>
                        </li>
                    </ul>
                    <div class="tab-content" id="regexTabContent">
                        <div class="tab-pane fade show active" id="common" role="tabpanel">
                            <div class="table-responsive">
                                <table class="table table-striped">
                                    <thead>
                                        <tr>
                                            <th data-translate="SEARCH_REGEX_PATTERN">Pattern</th>
                                            <th data-translate="SEARCH_REGEX_DESCRIPTION">Description</th>
                                            <th data-translate="SEARCH_REGEX_EXAMPLE">Example</th>
                                        </tr>
                                    </thead>
                                    <tbody id="regexExamplesTable">
                                        <!-- Common examples will be added by JavaScript -->
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div class="tab-pane fade" id="html" role="tabpanel">
                            <div class="table-responsive">
                                <table class="table table-striped">
                                    <thead>
                                        <tr>
                                            <th data-translate="SEARCH_REGEX_PATTERN">Pattern</th>
                                            <th data-translate="SEARCH_REGEX_DESCRIPTION">Description</th>
                                            <th data-translate="SEARCH_REGEX_EXAMPLE">Example</th>
                                        </tr>
                                    </thead>
                                    <tbody id="regexHtmlExamplesTable">
                                        <!-- HTML examples will be added by JavaScript -->
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" data-translate="SEARCH_CLOSE_BUTTON">Close</button>
                </div>
            </div>
        </div>
    </div>

    <script src="js/app.js"></script>
    
    <!-- Initialize theme -->
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            if (typeof initTheme === 'function') {
                initTheme();
            }
            initializeRegexExamples();
        });
    </script>
</body>
</html>

