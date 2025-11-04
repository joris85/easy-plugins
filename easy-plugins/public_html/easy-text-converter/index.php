<?php 
$pageTitle = 'Easy Text - Transform Your Text';
include '../shared/header.php'; 
?>
    
    <div class="container-fluid">
        <!-- Main Content -->
        <div class="container py-4">
   

            <!-- Text Input Section -->
            <div class="row">
                <div class="col-lg-8">
                    <div class="card shadow-sm">
                        <div class="card-header">
                            <h5 class="mb-0">
                                <i class="fas fa-edit me-2"></i>Text Input
                            </h5>
                        </div>
                        <div class="card-body">
                            <textarea id="textInput" class="form-control" rows="8" placeholder="Enter your text here..."></textarea>
                        </div>
                    </div>
                </div>

                <!-- Statistics Panel -->
                <div class="col-lg-4">
                    <div class="card shadow-sm">
                        <div class="card-header">
                            <h5 class="mb-0">
                                <i class="fas fa-chart-bar me-2"></i><span data-translate="TEXT_STATS_TITLE">Statistics</span>
                            </h5>
                        </div>
                        <div class="card-body">
                            <div class="row text-center text-converter-stats">
                                <div class="col-6 mb-3">
                                    <div class="stat-item">
                                        <div class="stat-number" id="charCount">0</div>
                                        <div class="stat-label" data-translate="TEXT_CHARS_LABEL">Characters</div>
                                    </div>
                                </div>
                                <div class="col-6 mb-3">
                                    <div class="stat-item">
                                        <div class="stat-number" id="wordCount">0</div>
                                        <div class="stat-label" data-translate="TEXT_WORDS_LABEL">Words</div>
                                    </div>
                                </div>
                                <div class="col-6 mb-3">
                                    <div class="stat-item">
                                        <div class="stat-number" id="sentenceCount">0</div>
                                        <div class="stat-label" data-translate="TEXT_SENTENCES_LABEL">Sentences</div>
                                    </div>
                                </div>
                                <div class="col-6 mb-3">
                                    <div class="stat-item">
                                        <div class="stat-number" id="lineCount">0</div>
                                        <div class="stat-label" data-translate="TEXT_LINES_LABEL">Lines</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Conversion Tools -->
            <div class="row mt-4">
                <div class="col-12">
                    <div class="card shadow-sm">
                        <div class="card-header">
                            <h5 class="mb-0">
                                <i class="fas fa-magic me-2"></i><span data-translate="TEXT_CONVERSION_OPTIONS">Conversion Tools</span>
                            </h5>
                        </div>
                        <div class="card-body">
                            <!-- Case Conversion -->
                            <div class="mb-4">
                                <h6 class="mb-3">
                                    <i class="fas fa-font me-2"></i>Case Conversion
                                </h6>
                                <div class="row g-2">
                                    <div class="col-md-3 col-sm-6">
                                        <button class="btn btn-outline-success w-100" onclick="convertText('sentence')">
                                            <i class="fas fa-sentence me-1"></i><span data-translate="TEXT_TO_SENTENCECASE">Sentence Case</span>
                                        </button>
                                    </div>
                                    <div class="col-md-3 col-sm-6">
                                        <button class="btn btn-outline-success w-100" onclick="convertText('lower')">
                                            <i class="fas fa-text-height me-1"></i><span data-translate="TEXT_TO_LOWERCASE">lowercase</span>
                                        </button>
                                    </div>
                                    <div class="col-md-3 col-sm-6">
                                        <button class="btn btn-outline-success w-100" onclick="convertText('upper')">
                                            <i class="fas fa-text-height me-1"></i><span data-translate="TEXT_TO_UPPERCASE">UPPERCASE</span>
                                        </button>
                                    </div>
                                    <div class="col-md-3 col-sm-6">
                                        <button class="btn btn-outline-success w-100" onclick="convertText('capitalized')">
                                            <i class="fas fa-text-height me-1"></i><span data-translate="TEXT_TO_TITLECASE">Capitalized</span>
                                        </button>
                                    </div>
                                    <div class="col-md-3 col-sm-6">
                                        <button class="btn btn-outline-success w-100" onclick="convertText('title')">
                                            <i class="fas fa-text-height me-1"></i>Title Case
                                        </button>
                                    </div>
                                    <div class="col-md-3 col-sm-6">
                                        <button class="btn btn-outline-success w-100" onclick="convertText('alternating')">
                                            <i class="fas fa-text-height me-1"></i>aLtErNaTiNg
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Text Transformation -->
                            <div class="mb-4">
                                <h6 class="text-success mb-3">
                                    <i class="fas fa-cogs me-2"></i>Text Transformation
                                </h6>
                                <div class="row g-2">
                                    <div class="col-md-3 col-sm-6">
                                        <button class="btn btn-outline-success w-100" onclick="convertText('reverse')">
                                            <i class="fas fa-undo me-1"></i>Reverse
                                        </button>
                                    </div>
                                    <div class="col-md-3 col-sm-6">
                                        <button class="btn btn-outline-success w-100" onclick="convertText('inverse')">
                                            <i class="fas fa-exchange-alt me-1"></i>Inverse Case
                                        </button>
                                    </div>
                                    <div class="col-md-3 col-sm-6">
                                        <button class="btn btn-outline-success w-100" onclick="convertText('removeSpaces')">
                                            <i class="fas fa-compress me-1"></i>Remove Spaces
                                        </button>
                                    </div>
                                    <div class="col-md-3 col-sm-6">
                                        <button class="btn btn-outline-success w-100" onclick="convertText('removeLineBreaks')">
                                            <i class="fas fa-compress me-1"></i>Remove Line Breaks
                                        </button>
                                    </div>
                                    <div class="col-md-3 col-sm-6">
                                        <button class="btn btn-outline-success w-100" onclick="convertText('removeDuplicates')">
                                            <i class="fas fa-trash me-1"></i>Remove Duplicates
                                        </button>
                                    </div>
                                    <div class="col-md-3 col-sm-6">
                                        <button class="btn btn-outline-success w-100" onclick="convertText('sortLines')">
                                            <i class="fas fa-sort me-1"></i>Sort Lines
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Action Buttons -->
                            <div class="text-center">
                                <div class="btn-group" role="group">
                                    <button class="btn btn-outline-success" onclick="copyToClipboard()">
                                        <i class="fas fa-copy me-1"></i>Copy Text
                                    </button>
                                    <button class="btn btn-outline-warning" onclick="clearText()">
                                        <i class="fas fa-trash me-1"></i>Clear All
                                    </button>
                                    <button class="btn btn-outline-info" onclick="downloadText()">
                                        <i class="fas fa-download me-1"></i>Download
                                    </button>
                                    <button class="btn btn-outline-secondary" onclick="resetText()">
                                        <i class="fas fa-undo me-1"></i>Undo
                                    </button>
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
