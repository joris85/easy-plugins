<?php 
$pageTitle = 'Easy PNG - Add Background to Images';
$metaDescription = 'Add a solid or gradient background to transparent PNG and WebP images with live preview. Free online tool, no account needed.';
$canonicalPath = '/easy-png/';
$faviconPath = '../favicon.ico';
$cssPath = '../shared/master.css';
$themePath = '../shared/theme.js';
include '../shared/header.php'; 
?>

    <!-- Easy PNG Specific CSS -->
    <link rel="stylesheet" href="css/styles.css?v=1.0">
    
    <div class="container-fluid">
        <div class="container tool-page-inner">
            <?php $toolInfoSlug = 'easy-png'; include __DIR__ . '/../shared/tool-info-bar.php'; ?>
            <!-- Split Screen Layout -->
            <div class="split-screen">
                <!-- Left Side - Upload & Options -->
                <div class="upload-section">
                    <h2><i class="fas fa-upload"></i> Upload Image</h2>
                    
                    <!-- Upload Dropzone -->
                    <div id="dropzone" class="dropzone">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <p>Drag & drop image here or click to select</p>
                        <small>Supports PNG and WebP files</small>
                        <input type="file" id="fileInput" accept=".png,.webp,.svg,image/png,image/webp,image/svg+xml" style="display: none;">
                    </div>
                    
                    <!-- Background Options -->
                    <div class="background-options">
                        <h3><i class="fas fa-palette"></i> Background Options</h3>
                        
                        <!-- Background Type Toggle -->
                        <div class="form-group">
                            <label>Background Type:</label>
                            <div class="background-type-buttons">
                                <button type="button" class="bg-type-btn active" data-type="solid">
                                    <i class="fas fa-fill"></i> Solid
                                </button>
                                <button type="button" class="bg-type-btn" data-type="gradient">
                                    <i class="fas fa-gradient"></i> Gradient
                                </button>
                            </div>
                        </div>
                        
                        <!-- Solid Background -->
                        <div id="solidBackground" class="background-panel active">
                            <div class="form-group">
                                <label for="solidColor">Background Color:</label>
                                <div class="color-input-group">
                                    <input type="color" id="solidColor" value="#ffffff">
                                    <input type="text" id="solidColorText" value="#ffffff" placeholder="#ffffff">
                                </div>
                            </div>
                        </div>
                        
                        <!-- Gradient Background -->
                        <div id="gradientBackground" class="background-panel">
                            <div class="form-group">
                                <label>Gradient Type:</label>
                                <div class="gradient-type-buttons">
                                    <button type="button" class="gradient-type-btn active" data-gtype="linear">
                                        <i class="fas fa-arrows-alt-v"></i> Linear
                                    </button>
                                    <button type="button" class="gradient-type-btn" data-gtype="radial">
                                        <i class="fas fa-circle"></i> Radial
                                    </button>
                                </div>
                            </div>
                            
                            <!-- Linear Gradient Options -->
                            <div id="linearGradientOptions" class="gradient-options">
                                <div class="form-group">
                                    <label>Direction:</label>
                                    <div class="direction-buttons">
                                        <button type="button" class="direction-btn active" data-direction="top-bottom">
                                            <i class="fas fa-arrow-down"></i> Top to Bottom
                                        </button>
                                        <button type="button" class="direction-btn" data-direction="bottom-top">
                                            <i class="fas fa-arrow-up"></i> Bottom to Top
                                        </button>
                                        <button type="button" class="direction-btn" data-direction="left-right">
                                            <i class="fas fa-arrow-right"></i> Left to Right
                                        </button>
                                        <button type="button" class="direction-btn" data-direction="right-left">
                                            <i class="fas fa-arrow-left"></i> Right to Left
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Radial Gradient Options -->
                            <div id="radialGradientOptions" class="gradient-options" style="display: none;">
                                <div class="form-group">
                                    <label>Position:</label>
                                    <div class="position-buttons">
                                        <button type="button" class="position-btn active" data-position="center">
                                            <i class="fas fa-dot-circle"></i> Center
                                        </button>
                                        <button type="button" class="position-btn" data-position="top-left">
                                            <i class="fas fa-arrow-up-left"></i> Top Left
                                        </button>
                                        <button type="button" class="position-btn" data-position="top-right">
                                            <i class="fas fa-arrow-up-right"></i> Top Right
                                        </button>
                                        <button type="button" class="position-btn" data-position="bottom-left">
                                            <i class="fas fa-arrow-down-left"></i> Bottom Left
                                        </button>
                                        <button type="button" class="position-btn" data-position="bottom-right">
                                            <i class="fas fa-arrow-down-right"></i> Bottom Right
                                        </button>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="radialRadius">Radius: <span id="radiusValue">50%</span></label>
                                    <input type="range" id="radialRadius" min="10" max="200" value="50" class="slider">
                                </div>
                            </div>
                            
                            <!-- Gradient Colors -->
                            <div class="form-group">
                                <label>Gradient Colors:</label>
                                <div class="gradient-colors">
                                    <div class="color-item">
                                        <input type="color" class="gradient-color" data-index="0" value="#ffffff">
                                        <input type="text" class="gradient-color-text" data-index="0" value="#ffffff" placeholder="#ffffff">
                                        <button type="button" class="remove-color-btn" data-index="0" style="display: none;">
                                            <i class="fas fa-times"></i>
                                        </button>
                                    </div>
                                    <div class="color-item">
                                        <input type="color" class="gradient-color" data-index="1" value="#000000">
                                        <input type="text" class="gradient-color-text" data-index="1" value="#000000" placeholder="#000000">
                                        <button type="button" class="remove-color-btn" data-index="1">
                                            <i class="fas fa-times"></i>
                                        </button>
                                    </div>
                                </div>
                                <button type="button" class="btn btn-sm add-color-btn" id="addColorBtn">
                                    <i class="fas fa-plus"></i> Add Color
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Right Side - Preview -->
                <div class="preview-section">
                    <h2><i class="fas fa-eye"></i> Preview</h2>
                    <div class="preview-container">
                        <div id="previewPlaceholder" class="preview-placeholder">
                            <i class="fas fa-image"></i>
                            <p>Upload an image to see preview</p>
                        </div>
                        <canvas id="previewCanvas" style="display: none;"></canvas>
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

