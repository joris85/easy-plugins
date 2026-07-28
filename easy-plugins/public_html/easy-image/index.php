<?php 
$pageTitle = 'Easy Image';
$faviconPath = '../favicon.ico';
$cssPath = '../shared/master.css';
$themePath = '../shared/theme.js';
/** Toss the Pics waiting toy — set false to disable without deleting toss-toy/ */
$easyImageTossToyEnabled = true;
include '../shared/header.php'; 
?>

    <!-- Cropper.js -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.css" integrity="sha384-1arqhTHsGLPVJdhZo8SAycbI+y5k+G7khi5bTZ4BxHJIpCfvWoeSDgXEXXRxB/9G" crossorigin="anonymous">
    <!-- Easy Image Specific CSS -->
    <link rel="stylesheet" href="css/styles.css?v=2.1">
<?php if (!empty($easyImageTossToyEnabled)): ?>
    <link rel="stylesheet" href="toss-toy/toss-toy.css?v=7">
    <link rel="stylesheet" href="toss-toy/toss-toy-easter-egg.css?v=3">
<?php endif; ?>
    <div class="container-fluid">
        <div class="container tool-page-inner">
        <?php $toolInfoSlug = 'easy-image'; include __DIR__ . '/../shared/tool-info-bar.php'; ?>
       
        
        <!-- Split Screen Layout -->
        <div class="split-screen">
            <!-- Left Side - Image Upload -->
            <div class="upload-section">
                <h2><i class="fas fa-upload"></i> <span data-translate="IMAGE_UPLOAD_LABEL">Upload Images</span></h2>
                <div id="dropzone" class="dropzone">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <p data-translate="IMAGE_UPLOAD_PLACEHOLDER">Drag & drop images here or click to select</p>
                    <input type="file" id="fileInput" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,.jpg,.jpeg,.png,.webp,.gif,.bmp" style="display: none;">
                </div>
                <div id="previewContainer" class="preview-container"></div>
                <div class="upload-controls">
                    <button type="button" class="btn back-btn" onclick="window.location.reload()">
                        <i class="fas fa-redo"></i> Refresh images
                    </button>
                </div>
            </div>

            <!-- Right Side - Settings -->
            <div class="settings-section">
                <h2><i class="fas fa-cogs"></i> <span data-translate="IMAGE_SETTINGS_TITLE">Settings</span></h2>
                <form id="settingsForm">
                    <!-- Mode Selection -->
                    <div class="mode-selection">
                        <button type="button" class="mode-btn active" data-mode="resize">
                            <i class="fas fa-expand"></i> <span data-translate="IMAGE_RESIZE_MODE">Resize</span>
                        </button>
                        <button type="button" class="mode-btn" data-mode="crop">
                            <i class="fas fa-crop"></i> <span data-translate="IMAGE_CROP_MODE">Crop</span>
                        </button>
                        <button type="button" class="mode-btn" data-mode="optimize">
                            <i class="fas fa-magic"></i> <span data-translate="IMAGE_OPTIMIZE_MODE">Optimize</span>
                        </button>
                        <button type="button" class="mode-btn" data-mode="custom">
                            <i class="fas fa-cut"></i> <span data-translate="IMAGE_CUSTOM_MODE">Custom</span>
                        </button>
                    </div>

                    <!-- Preset Sizes (Only in crop mode) -->
                    <div id="cropOptions" class="form-group" style="display: none;">
                      
                            <label>Choose a preset size:</label>
                            <div class="preset-buttons">
                                <button type="button" class="quality-btn" data-width="300" data-height="300">
                                    <i class="fas fa-image"></i>
                                    <small>300 × 300</small>
                                </button>
                                <button type="button" class="quality-btn" data-width="600" data-height="600">
                                    <i class="fas fa-image"></i>
                                    <small>600 × 600</small>
                                </button>
                                <button type="button" class="quality-btn" data-width="1200" data-height="1200">
                                    <i class="fas fa-image"></i>
                                    <small>1200 × 1200</small>
                                </button>
                                <button type="button" class="quality-btn" data-width="1920" data-height="1080">
                                    <i class="fas fa-image"></i>
                                    <small>1920 × 1080</small>
                                </button>
                           
                        </div>
                    </div>

                    <!-- Resize Options -->
                    <div id="resizeOptions" class="form-group">
                        <label>Choose dimension to resize:</label>
                        <div class="dimension-buttons">
                            <button type="button" class="dimension-btn active" data-dimension="width">
                                <i class="fas fa-arrows-alt-h"></i> Width
                            </button>
                            <button type="button" class="dimension-btn" data-dimension="height">
                                <i class="fas fa-arrows-alt-v"></i> Height
                            </button>
                        </div>
                    </div>

                    <!-- Optimize Info -->
                    <div id="optimizeInfo" class="form-group" style="display: none;">
                        <label>Optimize Settings</label>
                        <p class="form-help">
                            Adjust quality, format, and effects below to compress or enhance your images without changing their dimensions.
                        </p>
                    </div>

                    <!-- Custom trim info -->
                    <div id="customInfo" class="form-group" style="display: none;">
                        <label>Custom Trim</label>
                        <p class="form-help">
                            Drag the crop lines on each image to trim edges. Output size matches the area you keep — great for cutting off borders or unwanted sides.
                        </p>
                    </div>

                    <!-- Resize Presets -->
                    <div id="resizePresets" class="form-group">
                        <label>Choose a preset width:</label>
                        <div class="preset-buttons">
                            <button type="button" class="quality-btn resize-preset-btn active" data-width="300">
                                <i class="fas fa-image"></i>
                                <small>300 px</small>
                            </button>
                            <button type="button" class="quality-btn resize-preset-btn" data-width="600">
                                <i class="fas fa-image"></i>
                                <small>600 px</small>
                            </button>
                            <button type="button" class="quality-btn resize-preset-btn" data-width="1200">
                                <i class="fas fa-image"></i>
                                <small>1200 px</small>
                            </button>
                            <button type="button" class="quality-btn resize-preset-btn" data-width="1920">
                                <i class="fas fa-image"></i>
                                <small>1920 px</small>
                            </button>
                        </div>
                    </div>

                    <!-- Dimension inputs -->
                    <div id="dimensionGroup" class="form-group">
                        <label>Image Dimensions:</label>
                        <div class="dimension-inputs">
                            <div id="widthInput" class="dimension-input">
                                <label for="width">Width (pixels):</label>
                                <input type="number" id="width" name="width" min="1" placeholder="Enter width" value="300">
                            </div>
                            <div id="heightInput" class="dimension-input">
                                <label for="height">Height (pixels):</label>
                                <input type="number" id="height" name="height" min="1" placeholder="Enter height">
                            </div>
                        </div>
                    </div>

                    <!-- Quality Options -->
                    <div class="form-group">
                        <label>Image Quality: <i class="fas fa-info-circle quality-info" onclick="showQualityInfo()"></i></label>
                        <div class="quality-preset-groups">
                            <div class="quality-buttons quality-buttons-row">
                                <button type="button" class="quality-btn quality-preset-btn" data-quality="50" data-tier="lossy">
                                    Low (50%)
                                </button>
                                <button type="button" class="quality-btn quality-preset-btn" data-quality="60" data-tier="lossy">
                                    Medium (60%)
                                </button>
                                <button type="button" class="quality-btn quality-preset-btn active" data-quality="70" data-tier="lossy">
                                    Web Smart (70%)
                                </button>
                            </div>
                            <div class="quality-buttons quality-buttons-row">
                                <button type="button" class="quality-btn quality-preset-btn" data-quality="85" data-tier="lossy">
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
                            <input type="range" id="qualitySlider" min="1" max="100" value="70" class="slider">
                            <span id="qualityValue">70%</span>
                        </div>
                    </div>

                    <!-- Crop mode options -->
                    <div id="cropModeOptions" class="form-group" style="display: none;">
                        <label>Crop mode: <i class="fas fa-info-circle crop-info" onclick="showCropInfo()"></i></label>
                        <div class="quality-buttons">
                            <button type="button" class="quality-btn" data-crop-mode="auto">
                                <i class="fas fa-magic"></i> Automatic
                            </button>
                            <button type="button" class="quality-btn active" data-crop-mode="manual">
                                <i class="fas fa-crop"></i> Manual
                            </button>
                        </div>
                    </div>

                    <div id="alignmentOptions" class="alignment-options form-group" style="display: none;">
                        <div class="intro-text">
                            <p> <label>Crop alignment:</label>
                            <p class="alignment-info">Choose where to focus when auto-cropping your images. Perfect for keeping the important parts in frame!</p>
                            </p>
                        
                            <div class="alignment-grid">
                                <button type="button" class="alignment-btn" data-align="top-left">
                                    Top Left
                                </button>
                                <button type="button" class="alignment-btn" data-align="top-center">
                                    Top Center
                                </button>
                                <button type="button" class="alignment-btn" data-align="top-right">
                                    Top Right
                                </button>
                                <button type="button" class="alignment-btn" data-align="left-middle">
                                    Left Middle
                                </button>
                                <button type="button" class="alignment-btn active" data-align="center-middle">
                                    Center Middle
                                </button>
                                <button type="button" class="alignment-btn" data-align="right-middle">
                                    Right Middle
                                </button>
                                <button type="button" class="alignment-btn" data-align="bottom-left">
                                    Bottom Left
                                </button>
                                <button type="button" class="alignment-btn" data-align="bottom-center">
                                    Bottom Center
                                </button>
                                <button type="button" class="alignment-btn" data-align="bottom-right">
                                    Bottom Right
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Output Format Options -->
                    <div class="form-group">
                        <label>Output Format: <i class="fas fa-info-circle format-info" onclick="showFormatInfo()"></i></label>
                        <div class="format-buttons">
                            <button type="button" class="format-btn" data-format="jpg">JPG</button>
                            <button type="button" class="format-btn" data-format="png">PNG</button>
                            <button type="button" class="format-btn active" data-format="webp">WebP</button>
                        </div>
                    </div>

                    <!-- Advanced Options -->
                    <div class="form-group advanced-options">
                        <div class="advanced-header" onclick="toggleAdvanced()">
                            <label>Advanced Options</label>
                            <i class="fas fa-chevron-down"></i>
                        </div>
                        <div class="advanced-content" style="display: none;">
                            <div class="performance-notice">
                                <i class="fas fa-info-circle"></i>
                                <p>Performance Notice: Each additional effect and image will increase processing time. Maximum 100 images or 256MB total. For best results, apply effects selectively and process images in smaller batches.<span id="serverLimitsNotice"></span></p>
                            </div>
                            <div class="effect-options">
                                <label>Image Effects</label>
                                <div class="effect-sliders">
                                    <div class="effect-slider">
                                        <label for="blurSlider">Blur <i class="fas fa-info-circle effect-info" onclick="showEffectsInfo()"></i></label>
                                        <input type="range" id="blurSlider" min="0" max="100" value="0">
                                        <span class="effect-value">0%</span>
                                    </div>
                                    <div class="effect-slider">
                                        <label for="sharpenSlider">Sharpen <i class="fas fa-info-circle effect-info" onclick="showEffectsInfo()"></i></label>
                                        <input type="range" id="sharpenSlider" min="0" max="100" value="0">
                                        <span class="effect-value">0%</span>
                                    </div>
                                    <div class="effect-slider">
                                        <label for="brightnessSlider">Brightness <i class="fas fa-info-circle effect-info" onclick="showEffectsInfo()"></i></label>
                                        <input type="range" id="brightnessSlider" min="0" max="200" value="100">
                                        <span class="effect-value">100%</span>
                                    </div>
                                    <div class="effect-slider">
                                        <label for="contrastSlider">Contrast <i class="fas fa-info-circle effect-info" onclick="showEffectsInfo()"></i></label>
                                        <input type="range" id="contrastSlider" min="0" max="200" value="100">
                                        <span class="effect-value">100%</span>
                                    </div>
                                    <div class="effect-slider">
                                        <label for="saturationSlider">Saturation <i class="fas fa-info-circle effect-info" onclick="showEffectsInfo()"></i></label>
                                        <input type="range" id="saturationSlider" min="0" max="200" value="100">
                                        <span class="effect-value">100%</span>
                                    </div>
                                </div>

                                <!-- Basic Effects -->
                                <div class="effect-buttons">
                                    <label>Basic Effects <i class="fas fa-info-circle effect-info" onclick="showEffectsInfo()"></i></label>
                                    <div class="effect-button-group">
                                        <button type="button" class="effect-btn" data-effect="normalize">
                                            <i class="fas fa-balance-scale"></i> Normalize
                                        </button>
                                        <button type="button" class="effect-btn" data-effect="equalize">
                                            <i class="fas fa-adjust"></i> Equalize
                                        </button>
                                        <button type="button" class="effect-btn" data-effect="enhance">
                                            <i class="fas fa-magic"></i> Enhance
                                        </button>
                                    </div>
                                </div>

                                <!-- Special Effects -->
                                <div class="effect-buttons">
                                    <label>Special Effects <i class="fas fa-info-circle effect-info" onclick="showEffectsInfo()"></i></label>
                                    <div class="effect-button-group">
                                        <button type="button" class="effect-btn" data-effect="emboss">
                                            <i class="fas fa-mountain"></i> Emboss
                                        </button>
                                        <button type="button" class="effect-btn" data-effect="edge">
                                            <i class="fas fa-border-all"></i> Edge
                                        </button>
                                        <button type="button" class="effect-btn" data-effect="charcoal">
                                            <i class="fas fa-pencil-alt"></i> Charcoal
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
                
                <!-- Process Button in Settings Section -->
                <div class="settings-controls">
                    <button type="button" class="btn process-btn" onclick="processImages()">
                        <i class="fas fa-cog"></i> <span data-translate="IMAGE_PROCESS_BUTTON">Process Images</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- Download Step (Hidden by default) -->
        <div id="downloadStep" class="step">
            <h2><i class="fas fa-download"></i> Download Images</h2>
            <p id="downloadSummary" class="download-summary"></p>
            <div id="downloadWarnings" class="download-warnings" style="display: none;"></div>
            <div id="orientationDebugPanel" class="orientation-debug-panel" style="display: none;"></div>
            <div id="processedImages" class="processed-images"></div>
            <div class="download-controls">
                <button onclick="downloadAll()" class="btn download-all" style="display: none;">
                    <i class="fas fa-download"></i> <span data-translate="IMAGE_DOWNLOAD_BUTTON">Download All as ZIP</span>
                </button>
                <button onclick="window.location.reload()" class="btn back-btn">
                    <i class="fas fa-redo"></i> Start Over
                </button>
            </div>
        </div>

        <!-- Crop Step (Hidden by default) -->
        <div id="cropStep" class="step">
            <h2 id="cropStepTitle"><i class="fas fa-crop"></i> Crop Image</h2>
            <div id="cropDimensions" class="crop-dimensions">
                <div class="crop-dimension-row">
                    <span class="crop-dimension-label">Original:</span>
                    <span id="cropOriginalSize">—</span>
                </div>
                <div class="crop-dimension-row">
                    <span class="crop-dimension-label">Trim:</span>
                    <span id="cropTrimSize">—</span>
                </div>
                <div class="crop-dimension-row">
                    <span class="crop-dimension-label">Selection:</span>
                    <span id="cropSelectionSize">—</span>
                </div>
                <div class="crop-dimension-row crop-dimension-output">
                    <span class="crop-dimension-label">Final output:</span>
                    <span id="cropOutputSize">—</span>
                </div>
            </div>
            <div class="crop-area">
                <img id="cropImage" src="" alt="Crop preview">
            </div>
            <div class="crop-controls">
                <button id="applyCropBtn" onclick="applyCrop()" class="btn">
                    <i class="fas fa-check"></i> Apply & Next <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        </div>
        
        </div>
        
        <section id="processingStats" class="processing-stats" style="display: none;">
            <div class="processing-stats__inner">
                <div class="processing-stats__icon">
                    <i class="fas fa-chart-line"></i>
                </div>
                <div class="processing-stats__content">
                    <p class="processing-stats__title">Community Savings</p>
                    <div class="processing-stats__metrics">
                        <div class="processing-stats__metric">
                            <span class="processing-stats__metric-value" id="statsImages">0</span>
                            <span class="processing-stats__metric-label">Images optimized</span>
                        </div>
                        <div class="processing-stats__divider"></div>
                        <div class="processing-stats__metric">
                            <span class="processing-stats__metric-value" id="statsProcessedMB">0</span>
                            <span class="processing-stats__metric-label">MB processed</span>
                        </div>
                        <div class="processing-stats__divider"></div>
                        <div class="processing-stats__metric">
                            <span class="processing-stats__metric-value" id="statsSavedMB">0</span>
                            <span class="processing-stats__metric-label">MB saved</span>
                        </div>
                    </div>
                    <p class="processing-stats__subtitle" id="statsSubtitle">Join thousands of creators keeping media fast and sharp.</p>
                </div>
            </div>
        </section>

        <?php include '../shared/footer.php'; ?>
    </div>

    <!-- Effects Info Modal -->
    <div id="effectsInfoModal" class="modal">
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2><i class="fas fa-magic"></i> Image Effects Guide</h2>
            <div class="effects-info-content">
                <div class="effects-section">
                    <h3>Basic Adjustments</h3>
                    <div class="effects-info-item">
                        <h4><i class="fas fa-adjust"></i> Brightness</h4>
                        <p><strong>How it works:</strong> Adjust the overall lightness of your image. 50% is neutral, lower values make it darker, higher values make it brighter.</p>
                        <p><strong>Best for:</strong> Correcting underexposed or overexposed images</p>
                        <p><strong>Use when:</strong> You need to brighten dark photos or tone down overly bright ones</p>
                    </div>
                    <div class="effects-info-item">
                        <h4><i class="fas fa-contrast"></i> Contrast</h4>
                        <p><strong>How it works:</strong> Control the difference between light and dark areas. Higher contrast makes images more dramatic, lower contrast creates a softer look.</p>
                        <p><strong>Best for:</strong> Making images pop or creating a softer, more dreamy effect</p>
                        <p><strong>Use when:</strong> You want to enhance visual impact or create a specific mood</p>
                    </div>
                    <div class="effects-info-item">
                        <h4><i class="fas fa-palette"></i> Saturation</h4>
                        <p><strong>How it works:</strong> Adjust the intensity of colors. 50% is natural, lower values create black and white, higher values make colors more vibrant.</p>
                        <p><strong>Best for:</strong> Making colors pop or creating artistic black and white effects</p>
                        <p><strong>Use when:</strong> You want to enhance colors or create dramatic monochrome images</p>
                    </div>
                    <div class="effects-info-item">
                        <h4><i class="fas fa-blur"></i> Blur</h4>
                        <p><strong>How it works:</strong> Add a soft, dreamy effect to your images. Great for creating depth of field or artistic effects.</p>
                        <p><strong>Best for:</strong> Creating artistic effects and softening backgrounds</p>
                        <p><strong>Use when:</strong> You want to add a dreamy, artistic quality to your images</p>
                    </div>
                    <div class="effects-info-item">
                        <h4><i class="fas fa-sharp"></i> Sharpen</h4>
                        <p><strong>How it works:</strong> Enhance fine details and edges. Useful for making images appear crisper and more defined.</p>
                        <p><strong>Best for:</strong> Making images appear sharper and more detailed</p>
                        <p><strong>Use when:</strong> You want to enhance fine details and make images appear crisper</p>
                    </div>
                </div>
                
                <div class="effects-section">
                    <h3>Basic Effects</h3>
                    <div class="effects-info-item">
                        <h4><i class="fas fa-balance-scale"></i> Normalize</h4>
                        <p><strong>How it works:</strong> Automatically adjusts the color distribution to use the full range of available colors, improving overall image quality.</p>
                        <p><strong>Best for:</strong> Improving overall image quality and color balance</p>
                        <p><strong>Use when:</strong> You want to automatically enhance image quality without manual adjustments</p>
                    </div>
                    <div class="effects-info-item">
                        <h4><i class="fas fa-adjust"></i> Equalize</h4>
                        <p><strong>How it works:</strong> Redistributes pixel values to create a more balanced histogram, often improving contrast and detail visibility.</p>
                        <p><strong>Best for:</strong> Improving contrast and revealing hidden details</p>
                        <p><strong>Use when:</strong> You want to enhance contrast and make details more visible</p>
                    </div>
                    <div class="effects-info-item">
                        <h4><i class="fas fa-magic"></i> Enhance</h4>
                        <p><strong>How it works:</strong> Applies intelligent image enhancement algorithms to improve overall quality, sharpness, and color balance.</p>
                        <p><strong>Best for:</strong> One-click image improvement for better overall quality</p>
                        <p><strong>Use when:</strong> You want a quick, intelligent enhancement of your image</p>
                    </div>
                </div>
                
                <div class="effects-section">
                    <h3>Special Effects</h3>
                    <div class="effects-info-item">
                        <h4><i class="fas fa-mountain"></i> Emboss</h4>
                        <p><strong>How it works:</strong> Creates a 3D embossed effect by highlighting edges and creating depth, giving images a textured, sculptural appearance.</p>
                        <p><strong>Best for:</strong> Creating artistic, textured effects with 3D appearance</p>
                        <p><strong>Use when:</strong> You want to add a unique, artistic texture to your images</p>
                    </div>
                    <div class="effects-info-item">
                        <h4><i class="fas fa-border-all"></i> Edge</h4>
                        <p><strong>How it works:</strong> Detects and highlights edges in the image, creating a sketch-like effect that emphasizes outlines and boundaries.</p>
                        <p><strong>Best for:</strong> Creating sketch-like artistic effects</p>
                        <p><strong>Use when:</strong> You want to create a drawing or sketch effect from your photos</p>
                    </div>
                    <div class="effects-info-item">
                        <h4><i class="fas fa-pencil-alt"></i> Charcoal</h4>
                        <p><strong>How it works:</strong> Simulates a charcoal drawing effect, creating artistic, monochromatic images with textured, hand-drawn appearance.</p>
                        <p><strong>Best for:</strong> Creating artistic charcoal drawing effects</p>
                        <p><strong>Use when:</strong> You want to transform photos into artistic charcoal drawings</p>
                    </div>
                </div>
                
                <div class="quick-tips">
                    <h3>Quick Tips</h3>
                    <ul>
                        <li><strong>Start subtle:</strong> Use effects in moderation for best results</li>
                        <li><strong>Combine effects:</strong> Multiple effects can create unique artistic results</li>
                        <li><strong>Experiment freely:</strong> You can always adjust or remove effects</li>
                        <li><strong>Preview first:</strong> Check how effects look before processing</li>
                        <li><strong>Enhance mode:</strong> Great starting point for quick improvements</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>

    <!-- Quality Info Modal -->
    <div id="qualityInfoModal" class="modal">
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2><i class="fas fa-compress"></i> Image Quality Guide</h2>
            <div class="quality-info-content">
                <div class="quality-section">
                    <h3>Quality Settings Explained</h3>
                    <div class="quality-info-item">
                        <h4>Low (50%)</h4>
                        <p><strong>Best for:</strong> Thumbnails, previews, and when file size matters most</p>
                        <p><strong>Use when:</strong> You need the smallest files and slight quality loss is acceptable</p>
                    </div>
                    <div class="quality-info-item">
                        <h4>Medium (60%)</h4>
                        <p><strong>Best for:</strong> Blog images, cards, and mobile-first pages</p>
                        <p><strong>Use when:</strong> You want noticeably smaller files with good-enough quality</p>
                    </div>
                    <div class="quality-info-item quality-info-recommended">
                        <h4>Web Smart (70%) — recommended</h4>
                        <p><strong>Best for:</strong> Most website images — the default for everyday use</p>
                        <p><strong>Use when:</strong> You want the best balance of quality and file size for typical web photos</p>
                    </div>
                    <div class="quality-info-item">
                        <h4>Web Sharp (85%)</h4>
                        <p><strong>Best for:</strong> Hero images, portfolios, and detail that must stay crisp</p>
                        <p><strong>Use when:</strong> Quality clearly matters more than saving a few extra kilobytes</p>
                    </div>
                    <div class="quality-info-item">
                        <h4>Web Max (100%)</h4>
                        <p><strong>Best for:</strong> Maximum lossy quality before custom tuning</p>
                        <p><strong>Use when:</strong> File size is secondary and you want the smallest possible compression artifacts</p>
                    </div>
                    <div class="quality-info-item">
                        <h4><i class="fas fa-sliders-h"></i> Custom</h4>
                        <p><strong>Best for:</strong> A specific quality percentage not covered by the presets</p>
                        <p><strong>Use when:</strong> You need precise control over the compression level</p>
                    </div>
                </div>
                
                <div class="quick-tips">
                    <h3>Quick Tips</h3>
                    <ul>
                        <li><strong>Start with Web Smart (70%)</strong> — it works well for most cases</li>
                        <li><strong>Web Sharp (85%)</strong> — for serious high-quality needs</li>
                        <li><strong>Low / Medium</strong> — faster loads on mobile and listing pages</li>
                        <li><strong>Web Max (100%)</strong> — largest files; use when quality is paramount</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>

    <!-- Format Info Modal -->
    <div id="formatInfoModal" class="modal">
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2><i class="fas fa-file-image"></i> Output Format Guide</h2>
            <div class="format-info-content">
                <div class="format-section">
                    <h3>Format Options Explained</h3>
                    <div class="format-info-item">
                        <h4><i class="fas fa-file-image"></i> WebP - RECOMMENDED</h4>
                        <p><strong>Best for:</strong> All modern websites and applications</p>
                        <p><strong>File size:</strong> 25-35% smaller than JPG with same quality</p>
                        <p><strong>Quality:</strong> Excellent compression with minimal quality loss</p>
                        <p><strong>Browser support:</strong> All modern browsers (Chrome, Firefox, Safari, Edge)</p>
                        <p><strong>Features:</strong> Supports transparency, animation, and both lossy and lossless compression</p>
                        <p><strong>Use when:</strong> You want the best compression for modern web use</p>
                    </div>
                    <div class="format-info-item">
                        <h4><i class="fas fa-file-image"></i> JPG</h4>
                        <p><strong>Best for:</strong> Maximum compatibility and older systems</p>
                        <p><strong>File size:</strong> Good compression, larger than WebP</p>
                        <p><strong>Quality:</strong> Good quality with some compression artifacts</p>
                        <p><strong>Browser support:</strong> Universal support across all browsers and devices</p>
                        <p><strong>Features:</strong> No transparency support, lossy compression only</p>
                        <p><strong>Use when:</strong> You need maximum compatibility or are targeting older devices</p>
                    </div>
                    <div class="format-info-item">
                        <h4><i class="fas fa-file-image"></i> PNG</h4>
                        <p><strong>Best for:</strong> Images with transparency or graphics with sharp edges</p>
                        <p><strong>File size:</strong> Larger files due to lossless compression</p>
                        <p><strong>Quality:</strong> Perfect quality with no compression loss</p>
                        <p><strong>Browser support:</strong> Universal support across all browsers</p>
                        <p><strong>Features:</strong> Supports transparency, lossless compression, great for graphics</p>
                        <p><strong>Use when:</strong> You need transparency, logos, or graphics with sharp edges</p>
                    </div>
                </div>
                
                <div class="quick-tips">
                    <h3>Quick Selection Guide</h3>
                    <ul>
                        <li><strong>Website images:</strong> Use WebP for best performance</li>
                        <li><strong>Mobile apps:</strong> WebP for smaller app sizes</li>
                        <li><strong>Print materials:</strong> JPG or PNG depending on needs</li>
                        <li><strong>Graphics with transparency:</strong> PNG is essential</li>
                        <li><strong>Maximum compatibility:</strong> JPG for universal support</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>

    <!-- Crop Info Modal -->
    <div id="cropInfoModal" class="modal">
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2><i class="fas fa-crop"></i> Crop Mode Guide</h2>
            <div class="crop-info-content">
                <div class="crop-section">
                    <h3>Crop Modes Explained</h3>
                    <div class="crop-info-item">
                        <h4><i class="fas fa-magic"></i> Automatic Crop</h4>
                        <p><strong>How it works:</strong> Uses the selected alignment option (center-middle, top-left, etc.) to automatically crop all images to that same position.</p>
                        <p><strong>Best for:</strong> Batch processing multiple images with consistent cropping</p>
                        <p><strong>Perfect when:</strong> You want all images cropped to the same position without manual selection</p>
                        <p><strong>Use when:</strong> You need quick, consistent cropping across all uploaded images</p>
                    </div>
                    <div class="crop-info-item">
                        <h4><i class="fas fa-crop"></i> Manual Crop</h4>
                        <p><strong>How it works:</strong> Interactive crop tool that lets you manually select the exact area to crop for each image</p>
                        <p><strong>Best for:</strong> Precise control over the final composition of each image</p>
                        <p><strong>Perfect when:</strong> You need different cropping for different images</p>
                        <p><strong>Use when:</strong> You want to see the crop result before processing and need individual control</p>
                    </div>
                </div>
                
                <div class="quick-tips">
                    <h3>Quick Selection Guide</h3>
                    <ul>
                        <li><strong>Batch processing:</strong> Use Automatic for consistent results across all images</li>
                        <li><strong>Individual control:</strong> Use Manual when each image needs different cropping</li>
                        <li><strong>Quick workflow:</strong> Automatic saves time when all images can use the same crop</li>
                        <li><strong>Preview needed:</strong> Manual lets you see exactly what will be cropped</li>
                        <li><strong>Alignment options:</strong> Both modes support the 3x3 grid alignment system</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>

    <!-- Large Image Warning Modal -->
    <div id="largeImageModal" class="modal">
        <div class="modal-content">
            <span class="close" onclick="closeLargeImageInfo()">&times;</span>
            <h2><i class="fas fa-exclamation-triangle"></i> Large image detected</h2>
            <div id="largeImageModalBody" class="large-image-modal-body"></div>
        </div>
    </div>

    <script>
        // Close effects modal when clicking outside of it
        window.onclick = function(event) {
            var effectsModal = document.getElementById('effectsInfoModal');
            if (event.target == effectsModal) {
                effectsModal.style.display = 'none';
            }
        }
    </script>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.js" integrity="sha384-P65gU1u4/dZpqRQ0AVqW+DHPwXmNAR84Qk31dC95hjk0WatF1GsVF1zRm/0uB+o0" crossorigin="anonymous"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js" integrity="sha384-+mbV2IY1Zk/X1p/nWllGySJSUN8uMs+gUAN10Or95UBH0fpj6GfKgPmgC5EXieXG" crossorigin="anonymous"></script>
    <script src="js/config.js"></script>
    <script src="js/urlParams.js?v=2.10.0"></script>
<?php if (!empty($easyImageTossToyEnabled)): ?>
    <script src="toss-toy/toss-toy.config.js?v=3"></script>
    <script src="toss-toy/toss-toy-tetris-scores.js?v=1"></script>
    <script src="toss-toy/toss-toy-tetris.js?v=6"></script>
    <script src="toss-toy/toss-toy-easter-egg.js?v=2"></script>
    <script src="toss-toy/toss-toy.js?v=9"></script>
    <script src="toss-toy/toss-toy-bridge.js?v=1"></script>
<?php endif; ?>
    <script src="js/app.js?v=2.10.0"></script>
    <!-- Bootstrap for shared components -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js" integrity="sha384-geWF76RCwLtnZ8qwWowPQNguL3RmwHVBC9FhGdlKrxdiJJigb/j/68SIy3Te4Bkz" crossorigin="anonymous"></script>
</body>
</html> 