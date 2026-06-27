<?php 
$pageTitle = 'Easy PDF Preflight';
$faviconPath = '../favicon.ico';
$cssPath = '../shared/master.css';
$themePath = '../shared/theme.js';
include '../shared/header.php'; 
?>

    <!-- PDF.js Library -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
    <!-- Easy PDF Preflight Specific CSS -->
    <link rel="stylesheet" href="css/styles.css">
    
    <div class="container-fluid">
        <div class="container">
            <!-- Split Screen Layout -->
            <div class="split-screen">
                <!-- Left Side - Upload -->
                <div class="upload-section">
                    <h2><i class="fas fa-upload"></i> Upload PDF</h2>
                    
                    <!-- Upload Dropzone -->
                    <div id="dropzone" class="dropzone">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <p>Drag & drop PDF here or click to select</p>
                        <small>Supports PDF files</small>
                        <input type="file" id="fileInput" accept=".pdf,application/pdf" style="display: none;">
                    </div>
                    
                    <!-- Loading Indicator -->
                    <div id="loadingIndicator" class="loading-indicator" style="display: none;">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Analyzing PDF...</p>
                    </div>
                    
                    <!-- Quick Info (Client-side) -->
                    <div id="quickInfo" class="quick-info" style="display: none;">
                        <h3><i class="fas fa-info-circle"></i> Quick Info</h3>
                        <div id="quickInfoContent"></div>
                    </div>
                </div>
                
                <!-- Right Side - Results -->
                <div class="results-section">
                    <h2><i class="fas fa-file-pdf"></i> Preflight Report</h2>
                    
                    <div id="resultsPlaceholder" class="results-placeholder">
                        <i class="fas fa-file-pdf"></i>
                        <p>Upload a PDF to see preflight analysis</p>
                    </div>
                    
                    <!-- Results Container -->
                    <div id="resultsContainer" class="results-container" style="display: none;">
                        <!-- Document Info -->
                        <div class="info-section">
                            <h3><i class="fas fa-file-alt"></i> Document Information</h3>
                            <div id="documentInfo" class="info-grid"></div>
                        </div>
                        
                        <!-- Fonts -->
                        <div class="info-section">
                            <h3><i class="fas fa-font"></i> Fonts</h3>
                            <div id="fontsInfo" class="info-content">
                                <p class="loading-text">Analyzing fonts...</p>
                            </div>
                        </div>
                        
                        <!-- Images -->
                        <div class="info-section">
                            <h3><i class="fas fa-image"></i> Images</h3>
                            <div id="imagesActions" class="images-actions" style="display: none;">
                                <button type="button" class="btn extract-btn" id="extractImagesBtn">
                                    <i class="fas fa-download"></i> Extract Images
                                </button>
                                <a href="api/download_zip.php" class="btn download-zip-btn" id="downloadZipBtn" style="display: none;">
                                    <i class="fas fa-file-archive"></i> Download All as ZIP
                                </a>
                                <p id="extractStatus" class="extract-status" style="display: none;"></p>
                            </div>
                            <div id="imagesInfo" class="info-content">
                                <p class="loading-text">Analyzing images...</p>
                            </div>
                        </div>
                        
                        <!-- Metadata -->
                        <div class="info-section">
                            <h3><i class="fas fa-info-circle"></i> Metadata</h3>
                            <div id="metadataInfo" class="info-grid"></div>
                        </div>
                        
                        <!-- Actions -->
                        <div class="actions-section">
                            <button type="button" class="btn reset-btn" id="resetBtn">
                                <i class="fas fa-redo"></i> Analyze Another PDF
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <?php include '../shared/footer.php'; ?>
    </div>

    <script src="js/app.js"></script>
</body>
</html>



