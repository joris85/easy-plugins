<?php 
$pageTitle = 'Easy CSV - Convert CSV Delimiters';
$faviconPath = '../favicon.ico';
$cssPath = '../shared/master.css';
$themePath = '../shared/theme.js';
include '../shared/header.php'; 
?>

    <!-- Easy CSV Specific CSS -->
    <link rel="stylesheet" href="css/styles.css?v=1.0">
    
    <div class="container-fluid">
        <!-- Main Content -->
        <div class="container tool-page-inner">
            <?php $toolInfoSlug = 'easy-csv-converter'; include __DIR__ . '/../shared/tool-info-bar.php'; ?>
            
            <!-- File Upload / Text Input Section -->
            <div class="row">
                <div class="col-12">
                    <div class="card shadow-sm">
                        <div class="card-header">
                            <h5 class="mb-0">
                                <i class="fas fa-file-csv me-2"></i>
                                <span data-translate="CSV_INPUT_TITLE">Input CSV</span>
                            </h5>
                        </div>
                        <div class="card-body">
                            <!-- File Drop Area -->
                            <div class="drop-area mb-3" id="dropArea" onclick="document.getElementById('fileInput').click()">
                                <i class="fas fa-cloud-upload-alt fa-3x mb-3 text-muted"></i>
                                <p class="mb-2">
                                    <span data-translate="CSV_DROP_TEXT">Drag and drop your CSV file here</span>
                                </p>
                                <p class="text-muted small mb-3">
                                    <span data-translate="CSV_DROP_OR">or</span>
                                </p>
                                <button type="button" class="btn btn-outline-primary" onclick="event.stopPropagation(); document.getElementById('fileInput').click()">
                                    <i class="fas fa-folder-open me-1"></i>
                                    <span data-translate="CSV_BROWSE_FILES">Browse Files</span>
                                </button>
                                <input type="file" id="fileInput" accept=".csv,.txt" style="display: none;">
                            </div>
                            
                            <!-- Alternative: Paste Text -->
                            <div class="mb-3">
                                <label class="form-label">
                                    <i class="fas fa-paste me-2"></i>
                                    <span data-translate="CSV_PASTE_ALTERNATIVE">Alternative: Paste CSV text</span>
                                </label>
                                <textarea id="csvInput" class="form-control font-monospace" rows="8" placeholder="Paste your CSV data here..."></textarea>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Settings Section -->
            <div class="row mt-4">
                <div class="col-lg-6">
                    <div class="card shadow-sm">
                        <div class="card-header">
                            <h5 class="mb-0">
                                <i class="fas fa-cog me-2"></i>
                                <span data-translate="CSV_INPUT_SETTINGS">Input CSV Settings</span>
                            </h5>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <label for="inputDelimiter" class="form-label">
                                    <span data-translate="CSV_INPUT_DELIMITER">Input CSV Delimiter</span>
                                </label>
                                <input type="text" class="form-control" id="inputDelimiter" value="," placeholder=",">
                                <small class="form-text text-muted">
                                    <span data-translate="CSV_DELIMITER_HINT">Use \t for tab, , for comma, ; for semicolon</span>
                                </small>
                            </div>
                            <div class="mb-3">
                                <label for="inputQuote" class="form-label">
                                    <span data-translate="CSV_INPUT_QUOTE">Quote marks used in source CSV</span>
                                </label>
                                <input type="text" class="form-control" id="inputQuote" value='"' placeholder='"'>
                                <small class="form-text text-muted">
                                    <span data-translate="CSV_QUOTE_HINT">Usually double quote " or single quote '</span>
                                </small>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-lg-6">
                    <div class="card shadow-sm">
                        <div class="card-header">
                            <h5 class="mb-0">
                                <i class="fas fa-arrow-right me-2"></i>
                                <span data-translate="CSV_OUTPUT_SETTINGS">Output CSV Settings</span>
                            </h5>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <label for="outputDelimiter" class="form-label">
                                    <span data-translate="CSV_OUTPUT_DELIMITER">Output CSV Delimiter</span>
                                </label>
                                <input type="text" class="form-control" id="outputDelimiter" value="," placeholder=",">
                                <small class="form-text text-muted">
                                    <span data-translate="CSV_DELIMITER_HINT">Use \t for tab, , for comma, ; for semicolon</span>
                                </small>
                            </div>
                            <div class="mb-3">
                                <label for="outputQuote" class="form-label">
                                    <span data-translate="CSV_OUTPUT_QUOTE">Quote marks used in output CSV</span>
                                </label>
                                <input type="text" class="form-control" id="outputQuote" value='"' placeholder='"'>
                                <small class="form-text text-muted">
                                    <span data-translate="CSV_QUOTE_HINT">Usually double quote " or single quote '</span>
                                </small>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="fullyQuoteAll">
                                <label class="form-check-label" for="fullyQuoteAll">
                                    <span data-translate="CSV_FULLY_QUOTE">Fully Quote All Fields</span>
                                </label>
                                <br>
                                <small class="text-muted">
                                    <span data-translate="CSV_FULLY_QUOTE_DESC">Wrap all fields of the output CSV file in quotes</span>
                                </small>
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
                                    <span data-translate="CSV_ADVANCED_TOOLS">Advanced Tools</span>
                                </button>
                            </h2>
                            <div id="advancedToolsCollapse" class="accordion-collapse collapse" aria-labelledby="advancedToolsHeading" data-bs-parent="#advancedToolsAccordion">
                                <div class="accordion-body">
                                    <div class="row">
                                        <!-- Search and Replace -->
                                        <div class="col-lg-6 mb-3">
                                            <div class="card shadow-sm">
                                                <div class="card-header">
                                                    <h5 class="mb-0">
                                                        <i class="fas fa-search me-2"></i>
                                                        <span data-translate="CSV_SEARCH_REPLACE_TITLE">Search and Replace</span>
                                                    </h5>
                                                </div>
                                                <div class="card-body">
                                                    <div class="mb-3">
                                                        <label for="searchText" class="form-label">
                                                            <span data-translate="CSV_SEARCH_TEXT">Search for</span>
                                                        </label>
                                                        <input type="text" class="form-control" id="searchText" placeholder="Enter text to search...">
                                                    </div>
                                                    <div class="mb-3">
                                                        <label for="replaceText" class="form-label">
                                                            <span data-translate="CSV_REPLACE_TEXT">Replace with</span>
                                                        </label>
                                                        <input type="text" class="form-control" id="replaceText" placeholder="Enter replacement text...">
                                                    </div>
                                                    <div class="form-check mb-3">
                                                        <input class="form-check-input" type="checkbox" id="caseSensitive">
                                                        <label class="form-check-label" for="caseSensitive">
                                                            <span data-translate="CSV_CASE_SENSITIVE">Case sensitive</span>
                                                        </label>
                                                    </div>
                                                    <div class="mb-3">
                                                        <label for="searchColumnIndex" class="form-label">
                                                            <span data-translate="CSV_SEARCH_COLUMN">Column index (leave empty for all columns)</span>
                                                        </label>
                                                        <input type="number" class="form-control" id="searchColumnIndex" placeholder="e.g., 0, 1, 2..." min="0">
                                                        <small class="form-text text-muted">
                                                            <span data-translate="CSV_SEARCH_COLUMN_HINT">0 = first column, 1 = second column, etc. Leave empty to search & replace in all columns</span>
                                                        </small>
                                                    </div>
                                                    <button type="button" class="btn btn-outline-primary w-100" onclick="performSearchReplace()">
                                                        <i class="fas fa-exchange-alt me-1"></i>
                                                        <span data-translate="CSV_SEARCH_REPLACE_BUTTON">Search & Replace</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Date Transformer -->
                                        <div class="col-lg-6 mb-3">
                                            <div class="card shadow-sm">
                                                <div class="card-header">
                                                    <h5 class="mb-0">
                                                        <i class="fas fa-calendar-alt me-2"></i>
                                                        <span data-translate="CSV_DATE_TRANSFORM_TITLE">Date Transformer</span>
                                                    </h5>
                                                </div>
                                                <div class="card-body">
                                                    <div class="mb-3">
                                                        <label for="fromDateFormat" class="form-label">
                                                            <span data-translate="CSV_FROM_DATE_FORMAT">From date format</span>
                                                        </label>
                                                        <input type="text" class="form-control" id="fromDateFormat" placeholder="YYYY-MM-DD" value="YYYY-MM-DD">
                                                        <small class="form-text text-muted">
                                                            <span data-translate="CSV_DATE_FORMAT_HINT">Examples: YYYY-MM-DD, DD/MM/YYYY, MM-DD-YYYY</span>
                                                        </small>
                                                    </div>
                                                    <div class="mb-3">
                                                        <label for="toDateFormat" class="form-label">
                                                            <span data-translate="CSV_TO_DATE_FORMAT">To date format</span>
                                                        </label>
                                                        <input type="text" class="form-control" id="toDateFormat" placeholder="DD/MM/YYYY" value="DD/MM/YYYY">
                                                        <small class="form-text text-muted">
                                                            <span data-translate="CSV_DATE_FORMAT_HINT">Examples: YYYY-MM-DD, DD/MM/YYYY, MM-DD-YYYY</span>
                                                        </small>
                                                    </div>
                                                    <div class="mb-3">
                                                        <label for="dateColumnIndex" class="form-label">
                                                            <span data-translate="CSV_DATE_COLUMN">Column index (leave empty for all columns)</span>
                                                        </label>
                                                        <input type="number" class="form-control" id="dateColumnIndex" placeholder="e.g., 0, 1, 2..." min="0">
                                                        <small class="form-text text-muted">
                                                            <span data-translate="CSV_DATE_COLUMN_HINT">0 = first column, 1 = second column, etc. Leave empty to transform dates in all columns</span>
                                                        </small>
                                                    </div>
                                                    <button type="button" class="btn btn-outline-primary w-100" onclick="performDateTransform()">
                                                        <i class="fas fa-sync-alt me-1"></i>
                                                        <span data-translate="CSV_DATE_TRANSFORM_BUTTON">Transform Dates</span>
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

            <!-- Convert Button -->
            <div class="row mt-4">
                <div class="col-12">
                    <button type="button" class="btn btn-primary btn-lg w-100" onclick="convertCSV()" id="convertBtn">
                        <i class="fas fa-magic me-2"></i>
                        <span data-translate="CSV_CONVERT_BUTTON">Convert CSV</span>
                    </button>
                </div>
            </div>

            <!-- Output Section -->
            <div class="row mt-4">
                <div class="col-12">
                    <div class="card shadow-sm">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h5 class="mb-0">
                                <i class="fas fa-file-code me-2"></i>
                                <span data-translate="CSV_OUTPUT_TITLE">Output CSV</span>
                            </h5>
                            <div class="btn-group btn-group-sm" role="group">
                                <button type="button" class="btn btn-outline-success" onclick="copyToClipboard()">
                                    <i class="fas fa-copy me-1"></i>
                                    <span data-translate="CSV_COPY_BUTTON">Copy</span>
                                </button>
                                <button type="button" class="btn btn-outline-primary" onclick="downloadCSV()">
                                    <i class="fas fa-download me-1"></i>
                                    <span data-translate="CSV_DOWNLOAD_BUTTON">Download</span>
                                </button>
                                <button type="button" class="btn btn-outline-secondary" onclick="clearAll()">
                                    <i class="fas fa-trash me-1"></i>
                                    <span data-translate="CSV_CLEAR_BUTTON">Clear</span>
                                </button>
                            </div>
                        </div>
                        <div class="card-body">
                            <textarea id="csvOutput" class="form-control font-monospace" rows="12" readonly placeholder="Converted CSV will appear here..."></textarea>
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

