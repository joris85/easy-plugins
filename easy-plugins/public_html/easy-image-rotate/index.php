<?php 
$pageTitle = 'Easy Image Rotate - Rotate Images';
$metaDescription = 'Rotate images to any angle in your browser with live preview. Private: your photo never leaves your device. Export as WebP, JPG or PNG.';
$canonicalPath = '/easy-image-rotate/';
$faviconPath = '../favicon.ico';
$cssPath = '../shared/master.css';
$themePath = '../shared/theme.js';
include '../shared/header.php'; 
?>

    <!-- Easy Image Rotate Specific CSS -->
    <link rel="stylesheet" href="css/styles.css?v=1.0">
    
    <div class="container-fluid">
        <div class="container tool-page-inner">
            <?php $toolInfoSlug = 'easy-image-rotate'; include __DIR__ . '/../shared/tool-info-bar.php'; ?>
            <!-- Split Screen Layout -->
            <div class="split-screen">
                <!-- Left Side - Upload & Options -->
                <div class="upload-section">
                    <h2><i class="fas fa-upload"></i> Upload Image</h2>
                    
                    <!-- Upload Dropzone -->
                    <div id="dropzone" class="dropzone">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <p>Drag & drop image here or click to select</p>
                        <small>Supports JPG, PNG, WebP, GIF and other image formats</small>
                        <input type="file" id="fileInput" accept="image/*" style="display: none;">
                    </div>
                    
                    <!-- Image Info -->
                    <div id="imageInfo" class="image-info" style="display: none;">
                        <div class="info-item">
                            <i class="fas fa-image"></i>
                            <span id="imageName">-</span>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-expand"></i>
                            <span id="imageDimensions">-</span>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-weight"></i>
                            <span id="imageSize">-</span>
                        </div>
                    </div>
                    
                    <!-- Rotation Controls -->
                    <div class="rotation-controls" id="rotationControls" style="display: none;">
                        <h3><i class="fas fa-redo"></i> Rotation</h3>
                        <div class="form-group">
                            <label>Angle:</label>
                            <div class="quality-preset-groups">
                                <div class="quality-buttons quality-buttons-row">
                                    <button type="button" class="quality-btn rotation-btn active" data-angle="0">0°</button>
                                    <button type="button" class="quality-btn rotation-btn" data-angle="90">90°</button>
                                    <button type="button" class="quality-btn rotation-btn" data-angle="180">180°</button>
                                </div>
                                <div class="quality-buttons quality-buttons-row">
                                    <button type="button" class="quality-btn rotation-btn" data-angle="270">270°</button>
                                    <button type="button" class="quality-btn rotation-btn" data-angle="custom">
                                        <i class="fas fa-sliders-h"></i> Custom
                                    </button>
                                </div>
                            </div>
                            <div id="customRotationSlider" class="custom-quality" style="display: none;">
                                <input type="range" id="rotationSlider" min="0" max="360" value="0" class="slider">
                                <span id="angleValue">0°</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Right Side - Preview -->
                <div class="preview-section">
                    <h2><i class="fas fa-eye"></i> Preview</h2>
                    <div class="preview-container" id="previewContainer">
                        <div id="previewPlaceholder" class="preview-placeholder">
                            <i class="fas fa-image"></i>
                            <p>Upload an image to see preview</p>
                        </div>
                        <canvas id="previewCanvas" style="display: none;"></canvas>
                    </div>
                    <div class="preview-controls" id="previewControls" style="display: none;">
                        <div class="form-group">
                            <label>Image Quality:</label>
                            <div class="quality-preset-groups">
                                <div class="quality-buttons quality-buttons-row">
                                    <button type="button" class="quality-btn quality-preset-btn" data-quality="50" data-tier="lossy">
                                        Low (50%)
                                    </button>
                                    <button type="button" class="quality-btn quality-preset-btn" data-quality="60" data-tier="lossy">
                                        Medium (60%)
                                    </button>
                                    <button type="button" class="quality-btn quality-preset-btn" data-quality="70" data-tier="lossy">
                                        Web Smart (70%)
                                    </button>
                                </div>
                                <div class="quality-buttons quality-buttons-row">
                                    <button type="button" class="quality-btn quality-preset-btn active" data-quality="85" data-tier="lossy">
                                        Web Sharp (85%)
                                    </button>
                                    <button type="button" class="quality-btn quality-preset-btn" data-quality="100" data-tier="lossy">
                                        Web Max (100%)
                                    </button>
                                    <button type="button" class="quality-btn quality-preset-btn" data-quality="custom">
                                        <i class="fas fa-sliders-h"></i> Custom
                                    </button>
                                </div>
                            </div>
                            <div id="customQualitySlider" class="custom-quality" style="display: none;">
                                <input type="range" id="qualitySlider" min="1" max="100" value="85" class="slider">
                                <span id="qualityValue">85%</span>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Output Format:</label>
                            <div class="format-buttons">
                                <button type="button" class="format-btn" data-format="jpg">JPG</button>
                                <button type="button" class="format-btn" data-format="png">PNG</button>
                                <button type="button" class="format-btn active" data-format="webp">WebP</button>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Background:</label>
                            <div class="format-buttons">
                                <button type="button" class="format-btn bg-btn active" data-background="transparent" id="bgTransparentBtn">Transparent</button>
                                <button type="button" class="format-btn bg-btn" data-background="white">White</button>
                                <button type="button" class="format-btn bg-btn" data-background="black">Black</button>
                                <button type="button" class="format-btn bg-btn" data-background="custom">Custom</button>
                            </div>
                            <div id="customBackgroundPicker" class="custom-quality" style="display: none;">
                                <label for="backgroundColorInput" class="color-picker-label">Pick a color:</label>
                                <input type="color" id="backgroundColorInput" value="#ffffff" class="color-picker-input">
                                <span id="backgroundColorValue">#ffffff</span>
                            </div>
                            <small id="backgroundJpgNote" class="background-note" style="display: none;">JPG does not support transparency. Transparent is unavailable for JPG export.</small>
                        </div>
                        <div class="download-controls">
                            <button type="button" class="btn process-btn" id="downloadBtn">
                                <i class="fas fa-download"></i> Download Image
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


