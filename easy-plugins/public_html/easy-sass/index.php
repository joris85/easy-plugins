<?php 
$pageTitle = 'Easy SASS - SASS/SCSS to CSS Compiler';
$faviconPath = '../favicon.ico';
$cssPath = '../shared/master.css';
$themePath = '../shared/theme.js';
include '../shared/header.php'; 
?>

    <!-- CodeMirror -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/codemirror.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/theme/monokai.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/codemirror.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/mode/css/css.min.js"></script>
    <!-- Sass.js will be loaded dynamically with fallbacks -->
    <!-- Easy SASS Specific CSS -->
    <link rel="stylesheet" href="css/styles.css?v=1.0">
    
    <div class="container-fluid">
        <!-- Main Content -->
        <div class="container tool-page-inner">
            <?php $toolInfoSlug = 'easy-sass'; include __DIR__ . '/../shared/tool-info-bar.php'; ?>
            <div class="row">
                <!-- Left Side - SASS/SCSS Input -->
                <div class="col-lg-6">
                    <div class="card h-100">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h5 class="mb-0">
                                <i class="fas fa-code me-2"></i>SASS/SCSS Input
                            </h5>
                            <div class="btn-group btn-group-sm" role="group">
                                <button type="button" class="btn btn-outline-primary" onclick="resetEditor()">
                                    <i class="fas fa-undo me-1"></i>Reset
                                </button>
                                <button type="button" class="btn btn-outline-info" onclick="loadExample()">
                                    <i class="fas fa-lightbulb me-1"></i>Example
                                </button>
                                <button type="button" class="btn btn-outline-secondary" id="syntaxToggle" onclick="toggleSyntax()">
                                    <i class="fas fa-exchange-alt me-1"></i>SCSS
                                </button>
                            </div>
                        </div>
                        <div class="card-body p-0">
                            <div id="sassEditor" class="code-editor"></div>
                        </div>
                    </div>
                </div>

                <!-- Right Side - CSS Output -->
                <div class="col-lg-6">
                    <div class="card h-100">
                        <div class="card-header">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <h5 class="mb-0">
                                    <i class="fas fa-file-code me-2"></i>Compiled CSS
                                </h5>
                                <div class="btn-group btn-group-sm" role="group">
                                    <button type="button" class="btn btn-outline-success" onclick="copyToClipboard()">
                                        <i class="fas fa-copy me-1"></i>Copy
                                    </button>
                                    <button type="button" class="btn btn-outline-info" onclick="downloadCSS()">
                                        <i class="fas fa-download me-1"></i>Download
                                    </button>
                                </div>
                            </div>
                            <div class="form-check form-check-inline">
                                <input class="form-check-input" type="checkbox" id="removeComments" onchange="compileSass()">
                                <label class="form-check-label" for="removeComments">
                                    Remove comments
                                </label>
                            </div>
                            <div class="form-check form-check-inline">
                                <input class="form-check-input" type="checkbox" id="minify" onchange="compileSass()">
                                <label class="form-check-label" for="minify">
                                    Minify
                                </label>
                            </div>
                        </div>
                        <div class="card-body p-0">
                            <div id="cssEditor" class="code-editor"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Loading Indicator -->
            <div id="sassLoadingIndicator" class="alert alert-info text-center" style="display: none;">
                <i class="fas fa-spinner fa-spin me-2"></i>
                <span>Loading SASS compiler...</span>
            </div>

            <!-- Statistics Panel -->
            <div class="row mt-4">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0">
                                <i class="fas fa-chart-bar me-2"></i>Statistics
                            </h5>
                        </div>
                        <div class="card-body">
                            <div class="row text-center">
                                <div class="col-md-3 mb-3">
                                    <div class="stat-item">
                                        <div class="stat-number" id="sassLines">0</div>
                                        <div class="stat-label">SASS/SCSS Lines</div>
                                    </div>
                                </div>
                                <div class="col-md-3 mb-3">
                                    <div class="stat-item">
                                        <div class="stat-number" id="sassChars">0</div>
                                        <div class="stat-label">SASS/SCSS Characters</div>
                                    </div>
                                </div>
                                <div class="col-md-3 mb-3">
                                    <div class="stat-item">
                                        <div class="stat-number" id="cssLines">0</div>
                                        <div class="stat-label">CSS Lines</div>
                                    </div>
                                </div>
                                <div class="col-md-3 mb-3">
                                    <div class="stat-item">
                                        <div class="stat-number" id="cssChars">0</div>
                                        <div class="stat-label">CSS Characters</div>
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

    <script src="js/app.js?v=2.3"></script>
    
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

