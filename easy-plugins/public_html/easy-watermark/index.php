<?php 
$pageTitle = 'Easy Watermark - Add Watermarks to Images';
$metaDescription = 'Add text or image watermarks to your photos with drag-and-drop positioning, opacity and rotation. Batch watermark and download as ZIP. Free and private.';
$canonicalPath = '/easy-watermark/';
$faviconPath = '../favicon.ico';
$cssPath = '../shared/master.css';
$themePath = '../shared/theme.js';
include '../shared/header.php'; 
?>

    <!-- Easy Watermark Specific CSS -->
    <link rel="stylesheet" href="css/styles.css">
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;700&family=Roboto:wght@400;700&family=Roboto+Condensed:wght@400;700&family=Lato:wght@400;700&family=Montserrat:wght@400;700&family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet">
    
    <div class="container-fluid">
        <div class="container tool-page-inner">
            <?php $toolInfoSlug = 'easy-watermark'; include __DIR__ . '/../shared/tool-info-bar.php'; ?>
            <!-- Split Screen Layout -->
            <div class="split-screen">
                <!-- Left Side - Upload & Options -->
                <div class="upload-section">
                    <h2><i class="fas fa-upload"></i> Upload Images</h2>
                    
                    <!-- Main Image Upload Dropzone -->
                    <div class="form-group">
                        <label>Main Image(s):</label>
                        <div id="mainImageDropzone" class="dropzone">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <p>Drag & drop image(s) here or click to select</p>
                            <small>Supports PNG, JPG, WebP files (multiple images supported)</small>
                            <input type="file" id="mainImageInput" accept="image/*" multiple style="display: none;">
                        </div>
                        <!-- Image List -->
                        <div id="imageListContainer" class="image-list-container"></div>
                    </div>
                    
                    <!-- Watermark Upload Section -->
                    <div class="watermark-upload-section">
                        <h3><i class="fas fa-tint"></i> Watermarks</h3>
                        
                        <div class="form-group">
                            <label>Add Watermark Image:</label>
                            <div id="watermarkDropzone" class="dropzone">
                                <i class="fas fa-plus-circle"></i>
                                <p>Drag & drop watermark image here or click to select</p>
                                <small>Supports PNG, JPG, WebP files</small>
                                <input type="file" id="watermarkInput" accept="image/*" style="display: none;" multiple>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Add Watermark Text:</label>
                            <div class="text-watermark-input">
                                <input type="text" id="textWatermarkInput" placeholder="Enter watermark text (e.g., Copyright)" class="form-control">
                                <button type="button" class="btn btn-primary" id="addTextWatermarkBtn">
                                    <i class="fas fa-plus"></i> Add Text
                                </button>
                            </div>
                        </div>
                        
                        <!-- Watermark List -->
                        <div id="watermarkList" class="watermark-list">
                            <!-- Watermarks will be added here dynamically -->
                        </div>
                    </div>
                </div>
                
                <!-- Right Side - Preview -->
                <div class="preview-section">
                    <h2><i class="fas fa-eye"></i> Preview <span id="previewImageCount" class="preview-count"></span></h2>
                    <div id="downloadProgress" class="download-progress" style="display: none;"></div>
                    <div class="preview-container">
                        <div id="previewPlaceholder" class="preview-placeholder">
                            <i class="fas fa-image"></i>
                            <p>Upload a main image to see preview</p>
                        </div>
                        <div id="canvasWrapper" style="display: none; position: relative; width: 100%; height: 100%;">
                            <canvas id="previewCanvas"></canvas>
                        </div>
                    </div>
                    <div class="preview-controls" id="previewControls" style="display: none;">
                        <div class="quality-control" style="width: 100%; margin-bottom: 1.5rem;">
                            <label for="qualitySlider" style="display: block; margin-bottom: 0.75rem; color: var(--text-primary); font-weight: 500;">
                                <i class="fas fa-sliders-h me-1"></i> Export Quality: <span id="qualityValue">85</span>%
                            </label>
                            <input type="range" id="qualitySlider" min="0" max="100" value="85" class="slider" style="width: 100%; margin-bottom: 0.5rem;">
                            <small style="color: var(--text-muted); font-size: 0.85rem; display: block;">Note: Quality only affects JPG and WebP formats</small>
                        </div>
                        <div class="button-group" style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                            <button type="button" class="btn download-btn" id="downloadPngBtn">
                                <i class="fas fa-download"></i> Download PNG
                            </button>
                            <button type="button" class="btn download-btn" id="downloadJpgBtn">
                                <i class="fas fa-download"></i> Download JPG
                            </button>
                            <button type="button" class="btn download-btn" id="downloadWebpBtn">
                                <i class="fas fa-download"></i> Download WebP
                            </button>
                            <button type="button" class="btn reset-btn" id="resetBtn">
                                <i class="fas fa-redo"></i> Reset
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <?php include '../shared/footer.php'; ?>
    </div>

    <script src="/shared/upload.js?v=1.1"></script>
    <script src="/shared/canvas-export.js?v=1.1"></script>
    <script src="js/app.js?v=2026-07-18"></script>
</body>
</html>

