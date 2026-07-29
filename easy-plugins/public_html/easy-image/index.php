<?php 
$pageTitle = 'Easy Image';
$metaDescription = 'Resize, crop, compress and convert images online, up to 100 at once. Target an exact file size in KB, output WebP, JPG or PNG. Free, private, no account.';
$canonicalPath = '/easy-image/';
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
    <link rel="stylesheet" href="css/styles.css?v=2.27">
<?php if (!empty($easyImageTossToyEnabled)): ?>
    <link rel="stylesheet" href="toss-toy/toss-toy.css?v=8">
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
                            <button type="button" class="dimension-btn" data-dimension="fit">
                                <i class="fas fa-expand"></i> Fit box
                            </button>
                        </div>
                        <p id="fitBoxHelp" class="form-help" style="display: none;">
                            Images are scaled to fit within the width and height below, keeping their proportions.
                        </p>
                        <label class="no-upscale-option" style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.75rem; font-weight: normal; cursor: pointer;">
                            <input type="checkbox" id="noUpscale" checked>
                            Don't enlarge images that are already smaller
                        </label>
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

                    <!-- Output Format Options -->
                    <div class="form-group">
                        <label>Output Format: <i class="fas fa-info-circle format-info" onclick="showFormatInfo()"></i></label>
                        <div class="format-buttons">
                            <button type="button" class="format-btn" data-format="jpg">JPG</button>
                            <button type="button" class="format-btn" data-format="png">PNG</button>
                            <button type="button" class="format-btn active" data-format="webp">WebP</button>
                            <button type="button" class="format-btn" data-format="avif" id="avifFormatBtn" style="display: none;">AVIF</button>
                        </div>
                    </div>

                    <!-- Quality Options -->
                    <div class="form-group">
                        <label>Image Quality: <i class="fas fa-info-circle quality-info" onclick="showQualityInfo()"></i></label>
                        <div class="quality-buttons quality-buttons-row quality-control-tabs">
                            <button type="button" class="quality-btn quality-tab-btn active" data-quality-tab="percent">
                                <i class="fas fa-percentage"></i> Quality %
                            </button>
                            <button type="button" class="quality-btn quality-tab-btn" data-quality-tab="target" id="qualityTabTarget">
                                <i class="fas fa-bullseye"></i> Target size
                            </button>
                        </div>

                        <div id="qualityPercentPanel">
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

                        <div id="qualityTargetPanel" style="display: none;">
                            <div class="quality-preset-groups">
                                <div class="quality-buttons quality-buttons-row">
                                    <button type="button" class="quality-btn target-size-btn" data-target-kb="100">100 KB</button>
                                    <button type="button" class="quality-btn target-size-btn active" data-target-kb="200">200 KB</button>
                                    <button type="button" class="quality-btn target-size-btn" data-target-kb="500">500 KB</button>
                                </div>
                                <div class="quality-buttons quality-buttons-row">
                                    <button type="button" class="quality-btn target-size-btn" data-target-kb="1024">1 MB</button>
                                    <button type="button" class="quality-btn target-size-btn" data-target-kb="custom">
                                        <i class="fas fa-sliders-h"></i> Custom
                                    </button>
                                </div>
                            </div>
                            <div id="customTargetSize" class="custom-quality target-size-custom" style="display: none;">
                                <label for="targetSizeKb" class="target-size-custom-label">Maximum size per image:</label>
                                <div class="target-size-input-group">
                                    <input type="number" id="targetSizeKb" min="10" max="10240" step="10" placeholder="250">
                                    <span class="target-size-unit">KB</span>
                                </div>
                            </div>
                            <p class="form-help">
                                Each image comes out at or under this size; the best quality within that limit is chosen automatically.
                            </p>
                        </div>
                        <p id="targetPngHint" class="form-help" style="display: none;">
                            PNG is always lossless, so a size target is not possible. Choose JPG, WebP or AVIF to use Target size.
                        </p>
                    </div>

                    <!-- Enhance -->
                    <div class="form-group">
                        <label>Enhance your image: <i class="fas fa-info-circle enhance-info" onclick="showEnhanceInfo()"></i></label>
                        <div class="quality-buttons quality-buttons-row">
                            <button type="button" class="quality-btn enhance-btn active" data-enhance="none">
                                No enhancement
                            </button>
                            <button type="button" class="quality-btn enhance-btn" data-enhance="auto">
                                <i class="fas fa-star"></i> Auto enhance
                            </button>
                            <button type="button" class="quality-btn enhance-btn" data-enhance="custom">
                                <i class="fas fa-sliders-h"></i> Custom<span id="customEffectsCount"></span>
                            </button>
                        </div>

                        <!-- Strength (visible when Auto enhance is selected) -->
                        <div id="autoStrengthGroup" class="auto-strength" style="display: none;">
                            <label for="autoStrengthSlider">Strength <span id="autoStrengthValue">50%</span></label>
                            <input type="range" id="autoStrengthSlider" min="10" max="100" step="5" value="50">
                            <p class="form-help">50% is the balanced default. Slide left for a subtler correction or right for a stronger one.</p>
                        </div>

                        <!-- Custom Enhance (visible when the Custom enhance mode is selected) -->
                        <div class="advanced-options" id="customEnhanceGroup" style="display: none;">
                        <div class="advanced-header">
                            <label>Custom Enhance</label>
                        </div>
                        <div class="advanced-content">
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

                        <!-- Preview (Auto enhance and Custom) -->
                        <button type="button" id="enhancePreviewBtn" class="btn btn-outline-secondary btn-sm enhance-preview-trigger" style="display: none; margin-top: 0.75rem;" onclick="previewEnhancement(this)">
                            <i class="fas fa-eye"></i> Check preview on first image
                        </button>
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

            <!-- Renamer -->
            <div class="renamer-wrap">
                <button type="button" id="renamerToggleBtn" class="btn btn-outline-secondary renamer-toggle-btn" onclick="toggleRenamer()">
                    <i class="fas fa-i-cursor"></i> Renamer
                </button>
                <div id="renamerPanel" class="renamer-panel" style="display: none;">

                    <!-- Section 1: Search & replace (open by default) -->
                    <div class="renamer-section">
                        <button type="button" class="renamer-section-header" onclick="toggleRenamerSection(this)" aria-expanded="true">
                            <i class="fas fa-chevron-down"></i>
                            <span class="renamer-section-titles">
                                Search &amp; replace
                                <span class="renamer-section-sub">Find text in the names and change or remove it</span>
                            </span>
                        </button>
                        <div class="renamer-section-body">
                    <div class="renamer-presets renamer-replacers">
                        <span class="renamer-presets-label">Common replacers:</span>
                        <button type="button" class="btn btn-outline-secondary btn-sm renamer-replacer" data-replacer="urlSafe" title="Lowercase, accents flattened, spaces to dashes, all other non-URL characters removed">URL safe</button>
                        <button type="button" class="btn btn-outline-secondary btn-sm renamer-replacer" data-replacer="lowercase" title="Everything to lowercase letters">lowercase</button>
                        <button type="button" class="btn btn-outline-secondary btn-sm renamer-replacer" data-replacer="spaceToDash" title="Every space becomes a dash">Space &rarr; dash</button>
                        <button type="button" class="btn btn-outline-secondary btn-sm renamer-replacer" data-replacer="spaceToUnderscore" title="Every space becomes an underscore">Space &rarr; underscore</button>
                        <button type="button" class="btn btn-outline-secondary btn-sm renamer-replacer" data-replacer="removeSpaces" title="Delete all spaces">Remove spaces</button>
                        <button type="button" class="btn btn-outline-secondary btn-sm renamer-replacer" data-replacer="removeAccents" title="&eacute; becomes e, &uuml; becomes u, and so on">Remove accents</button>
                        <button type="button" class="btn btn-outline-secondary btn-sm renamer-replacer" data-replacer="removeCopyMarkers" title="Removes (1), (2), copy and kopie markers">Remove copy markers</button>
                    </div>
                    <div id="renamerSearchRows">
                        <div class="renamer-row renamer-search-row">
                            <div class="renamer-field">
                                <label for="renamerSearch">Search in original name</label>
                                <input type="text" id="renamerSearch" class="renamer-search-input" placeholder="e.g. IMG_" autocomplete="off" spellcheck="false">
                            </div>
                            <div class="renamer-field">
                                <label for="renamerReplace">Replace with</label>
                                <input type="text" id="renamerReplace" class="renamer-replace-input" placeholder="leave empty to remove" autocomplete="off" spellcheck="false">
                            </div>
                            <button type="button" class="btn btn-outline-secondary btn-sm renamer-row-btn" onclick="addRenamerSearchRow()" title="Add another search and replace rule" aria-label="Add another search and replace rule">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                    </div>
                        </div>
                    </div>

                    <!-- Section 2: Pattern structure -->
                    <div class="renamer-section">
                        <button type="button" class="renamer-section-header" onclick="toggleRenamerSection(this)" aria-expanded="false">
                            <i class="fas fa-chevron-right"></i>
                            <span class="renamer-section-titles">
                                Pattern structure
                                <span class="renamer-section-sub">Rebuild every name from blocks: your own text, numbering 01/02, today's date</span>
                            </span>
                        </button>
                        <div class="renamer-section-body" style="display: none;">
                    <div class="renamer-presets">
                        <span class="renamer-presets-label">Common patterns:</span>
                        <button type="button" class="btn btn-outline-secondary btn-sm renamer-preset" data-pattern="{prefix}{name}">Prefix + name</button>
                        <button type="button" class="btn btn-outline-secondary btn-sm renamer-preset" data-pattern="{name}{suffix}">Name + suffix</button>
                        <button type="button" class="btn btn-outline-secondary btn-sm renamer-preset" data-pattern="{prefix}{nnn}">Numbered series</button>
                        <button type="button" class="btn btn-outline-secondary btn-sm renamer-preset" data-pattern="{date}-{name}">Date + name</button>
                    </div>
                    <div class="renamer-row">
                        <div class="renamer-field renamer-field-wide">
                            <label for="renamerPattern">Custom pattern</label>
                            <input type="text" id="renamerPattern" value="{name}" autocomplete="off" spellcheck="false">
                            <div class="renamer-tokens">
                                <span class="renamer-tokens-label">Click to insert:</span>
                                <button type="button" class="renamer-token" data-token="{name}" title="The original filename, without extension"><code>{name}</code> original name</button>
                                <button type="button" class="renamer-token" data-token="{n}" title="Numbers your images automatically"><code>{n}</code> 1, 2, 3&hellip;</button>
                                <button type="button" class="renamer-token" data-token="{nn}" title="Numbering with a leading zero, so files sort correctly"><code>{nn}</code> 01, 02&hellip;</button>
                                <button type="button" class="renamer-token" data-token="{nnn}" title="Numbering with two leading zeros, for very large batches"><code>{nnn}</code> 001, 002&hellip;</button>
                                <button type="button" class="renamer-token" data-token="{date}" title="Today's date as year-month-day"><code>{date}</code> today</button>
                                <button type="button" class="renamer-token" data-token="{yyyy}" title="Current year, four digits"><code>{yyyy}</code> year</button>
                                <button type="button" class="renamer-token" data-token="{yy}" title="Current year, two digits"><code>{yy}</code> short year</button>
                                <button type="button" class="renamer-token" data-token="{mm}" title="Current month"><code>{mm}</code> month</button>
                                <button type="button" class="renamer-token" data-token="{dd}" title="Current day"><code>{dd}</code> day</button>
                                <button type="button" class="renamer-token" data-token="{prefix}" title="Your own text at the front — type it in the Prefix field"><code>{prefix}</code> your prefix</button>
                                <button type="button" class="renamer-token" data-token="{suffix}" title="Your own text at the end — type it in the Suffix field"><code>{suffix}</code> your suffix</button>
                            </div>
                        </div>
                        <div class="renamer-field renamer-field-small" id="renamerPrefixField" style="display: none;">
                            <label for="renamerPrefix">Prefix</label>
                            <input type="text" id="renamerPrefix" placeholder="e.g. magazine 01-" autocomplete="off" spellcheck="false">
                        </div>
                        <div class="renamer-field renamer-field-small" id="renamerSuffixField" style="display: none;">
                            <label for="renamerSuffix">Suffix</label>
                            <input type="text" id="renamerSuffix" placeholder="e.g. -magazine" autocomplete="off" spellcheck="false">
                        </div>
                        <div class="renamer-field renamer-field-small" id="renamerStartField" style="display: none;">
                            <label for="renamerStart">Start counting at</label>
                            <input type="number" id="renamerStart" value="1" min="0" step="1">
                        </div>
                    </div>
                        </div>
                    </div>

                    <!-- Section 3: Advanced regex -->
                    <div class="renamer-section">
                        <button type="button" class="renamer-section-header" onclick="toggleRenamerSection(this)" aria-expanded="false">
                            <i class="fas fa-chevron-right"></i>
                            <span class="renamer-section-titles">
                                Advanced: regex
                                <span class="renamer-section-sub">Remove flexible text patterns, like any number, date or size</span>
                            </span>
                        </button>
                        <div class="renamer-section-body" style="display: none;">
                            <div class="renamer-presets renamer-regex-presets">
                                <span class="renamer-presets-label">Common patterns:</span>
                                <button type="button" class="btn btn-outline-secondary btn-sm renamer-regex-preset" data-regex="\d+" title="Every number, anywhere in the name">All numbers</button>
                                <button type="button" class="btn btn-outline-secondary btn-sm renamer-regex-preset" data-regex="\d{4}[-._ ]?\d{2}[-._ ]?\d{2}" title="Dates like 2026-07-26, 2026_07_26 or 20260726">Date 2026-07-26</button>
                                <button type="button" class="btn btn-outline-secondary btn-sm renamer-regex-preset" data-regex="\d{2}[-._ ]\d{2}[-._ ]\d{4}" title="Dates like 26-07-2026 or 26.07.2026">Date 26-07-2026</button>
                                <button type="button" class="btn btn-outline-secondary btn-sm renamer-regex-preset" data-regex="^(IMG|DSC|DSCN|PXL|VID|GOPR)[-_ ]?" data-icase="1" title="Camera prefixes like IMG_, DSC, PXL at the start">Camera prefix</button>
                                <button type="button" class="btn btn-outline-secondary btn-sm renamer-regex-preset" data-regex="[-_ ]?\d+$" title="A number at the end of the name, including the separator before it">Numbers at end</button>
                                <button type="button" class="btn btn-outline-secondary btn-sm renamer-regex-preset" data-regex="\s*[(\[][^)\]]*[)\]]" title="Anything between (round) or [square] brackets">(text) in brackets</button>
                                <button type="button" class="btn btn-outline-secondary btn-sm renamer-regex-preset" data-regex="[-_ ]?\(?\d{2,5}\s?[x&times;]\s?\d{2,5}\)?" title="Image sizes like 600x246 or (600x246), including the separator before them">Size (600x246)</button>
                                <button type="button" class="btn btn-outline-secondary btn-sm renamer-regex-preset" data-regex="[-_ ]{2,}" data-replace="-" title="Two or more spaces, dashes or underscores in a row, replaced by one dash">Double separators</button>
                            </div>
                            <div class="renamer-row">
                                <div class="renamer-field">
                                    <label for="renamerRegex">Regex pattern <i class="fas fa-info-circle renamer-regex-info" onclick="showRegexInfo()" role="button" aria-label="Regex information"></i></label>
                                    <input type="text" id="renamerRegex" placeholder="e.g. ^IMG_\d+  or  \d{4}" autocomplete="off" spellcheck="false">
                                    <p id="renamerRegexError" class="form-help renamer-regex-error" style="display: none;">
                                        <i class="fas fa-exclamation-circle"></i> Invalid regular expression
                                    </p>
                                </div>
                                <div class="renamer-field">
                                    <label for="renamerRegexReplace">Replace with</label>
                                    <input type="text" id="renamerRegexReplace" placeholder="leave empty to remove" autocomplete="off" spellcheck="false">
                                    <label class="renamer-regex-case">
                                        <input type="checkbox" id="renamerRegexIgnoreCase"> Ignore upper/lowercase
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <p class="renamer-preview-title">Preview names</p>
                    <div id="renamerPreview" class="renamer-preview"></div>
                    <p id="renamerSlashHint" class="form-help renamer-slash-hint" style="display: none;">
                        <i class="fas fa-info-circle"></i> A <code>/</code> is not allowed in filenames and is replaced by <code>-</code>.
                    </p>
                    <p id="renamerDupHint" class="form-help renamer-dup-hint" style="display: none;">
                        <i class="fas fa-info-circle"></i> <span id="renamerDupCount">0</span> name(s) became identical after these changes. A number (<code>-1</code>, <code>-2</code>&hellip;) is added automatically so every file keeps a unique name. Prefer your own numbering? Use the <code>{nn}</code> token in Pattern structure.
                    </p>
                    <div class="renamer-actions">
                        <button type="button" class="btn btn-primary btn-sm" onclick="applyRenamer()">
                            <i class="fas fa-check"></i> Apply to all names
                        </button>
                        <button type="button" class="btn btn-outline-secondary btn-sm" onclick="resetRenamer()">
                            Reset names
                        </button>
                    </div>
                </div>
            </div>

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
                    <i id="cropSelectionWarnIcon" class="fas fa-info-circle crop-selection-warn" style="display: none;" onclick="showCropUpscaleInfo()" title="The selection is smaller than the final output — click for details" role="button" aria-label="Selection smaller than final output — more information"></i>
                    <label id="cropUpscaleInline" class="crop-upscale-switch" style="display: none;">
                        <input type="checkbox" id="allowUpscaleToggle" onchange="window.allowCropUpscale = this.checked; window.refreshCropReadout && window.refreshCropReadout();">
                        <span class="crop-switch-track" aria-hidden="true"></span>
                        <span class="crop-upscale-text">Allow enlarging</span>
                    </label>
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
    <div id="comparePreviewModal" class="modal">
        <div class="modal-content compare-modal-content">
            <span class="close">&times;</span>
            <h2><i class="fas fa-eye"></i> Before / after</h2>
            <p class="form-help" id="compareFilename"></p>
            <div class="compare-wrap" id="compareWrap">
                <img class="compare-after" id="compareAfterImg" alt="After" draggable="false">
                <div class="compare-before-clip" id="compareBeforeClip">
                    <img class="compare-before" id="compareBeforeImg" alt="Before" draggable="false">
                </div>
                <div class="compare-handle" id="compareHandle"></div>
                <span class="compare-label compare-label-before">Before</span>
                <span class="compare-label compare-label-after">After</span>
            </div>
            <p class="form-help">Drag the line over the image to compare before and after.</p>
        </div>
    </div>

    <!-- Regex rename info -->
    <div id="regexInfoModal" class="modal">
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2><i class="fas fa-asterisk"></i> Regex rename</h2>
            <div class="quality-info-content">
                <p>A regular expression (regex) describes a text pattern instead of literal text. Everything in the filename that matches the pattern is replaced with the "Replace with" text, or removed when that field is empty.</p>
                <div class="quality-section">
                    <h4>The common patterns explained</h4>
                    <ul class="regex-pattern-list">
                        <li><code>\d+</code> &mdash; <strong>All numbers</strong>: every group of digits, anywhere in the name.</li>
                        <li><code>\d{4}[-._ ]?\d{2}[-._ ]?\d{2}</code> &mdash; <strong>Date 2026-07-26</strong>: also matches 2026_07_26, 2026.07.26 and 20260726.</li>
                        <li><code>\d{2}[-._ ]\d{2}[-._ ]\d{4}</code> &mdash; <strong>Date 26-07-2026</strong>: day-month-year with a separator.</li>
                        <li><code>^(IMG|DSC|DSCN|PXL|VID|GOPR)[-_ ]?</code> &mdash; <strong>Camera prefix</strong>: removes IMG_, DSC, PXL and similar at the start (turn on "Ignore upper/lowercase").</li>
                        <li><code>[-_ ]?\d+$</code> &mdash; <strong>Numbers at end</strong>: a trailing number including the dash or space before it.</li>
                        <li><code>\s*[(\[][^)\]]*[)\]]</code> &mdash; <strong>(text) in brackets</strong>: anything between round or square brackets.</li>
                        <li><code>[-_ ]?\(?\d{2,5}\s?[x&times;]\s?\d{2,5}\)?</code> &mdash; <strong>Size (600x246)</strong>: image dimensions like 600x246, (600x246) or 1920&times;1080, including the separator before them.</li>
                        <li><code>[-_ ]{2,}</code> &mdash; <strong>Double separators</strong>: two or more spaces, dashes or underscores in a row; combine with "-" as replacement to tidy them up.</li>
                    </ul>
                </div>
                <div class="quality-section">
                    <h4>Good to know</h4>
                    <p><code>^</code> means "at the start", <code>$</code> "at the end", <code>\d</code> a digit, <code>+</code> "one or more" and <code>{4}</code> "exactly four". Round brackets make a capture group that you can reuse in the replacement as <code>$1</code>.</p>
                    <p class="mb-0">Learn more or test your pattern live: <a href="https://regex101.com/" target="_blank" rel="noopener">regex101.com</a> (interactive tester) &middot; <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions" target="_blank" rel="noopener">MDN regular expressions guide</a>.</p>
                </div>
            </div>
        </div>
    </div>

    <!-- Crop upscale info -->
    <div id="cropUpscaleInfoModal" class="modal">
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2><i class="fas fa-expand-arrows-alt"></i> Selection smaller than output</h2>
            <div class="quality-info-content">
                <p>Your selected area contains fewer pixels than the final output size, so the image would need to be enlarged. Enlarging stretches the existing pixels, which can make the result look softer or slightly blurry.</p>
                <p><strong>You have two options:</strong></p>
                <ul>
                    <li><strong>Make the selection bigger</strong> (or use a larger photo) — the result stays fully sharp.</li>
                    <li><strong>Turn on the "Allow enlarging" switch</strong> next to the size info — the image is scaled up to the final output size with a high-quality filter, but may look less sharp. Up to about 1.5&times; enlargement this is barely visible; beyond that, softness increases.</li>
                </ul>
                <p class="mb-0">The choice stays on for the rest of this batch, so you only have to decide once.</p>
            </div>
        </div>
    </div>

    <div id="enhanceInfoModal" class="modal">
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2><i class="fas fa-star"></i> Enhancement Guide</h2>
            <div class="quality-info-content">
                <div class="quality-section">
                    <div class="quality-info-item">
                        <h4>No enhancement (default)</h4>
                        <p>Your images are processed exactly as they are. Nothing about the colors, brightness or contrast is changed — only the size, crop and compression you asked for.</p>
                        <p><strong>Use when:</strong> Your photos already look the way you want them.</p>
                    </div>
                    <div class="quality-info-item">
                        <h4>Auto enhance</h4>
                        <p>An automatic correction tuned per photo. Each image is measured first: the tonal range is stretched to full contrast, flat or hazy photos get an extra contrast curve, and dull colors get a stronger lift than already-vivid ones. Overall brightness is preserved, so faces and skies never blow out. The Strength slider makes the correction lighter or stronger; 50% is the balanced default.</p>
                        <p><strong>Use when:</strong> Photos look dull, gray or washed out, or you are batch-processing a mix and want a safe automatic fix.</p>
                        <p><strong>Tip:</strong> Upload an image and use <em>Preview on first image</em> to see the before and after with your own photo.</p>
                    </div>
                    <div class="quality-info-item">
                        <h4>Custom</h4>
                        <p>Full manual control: blur, sharpen, brightness, contrast and saturation sliders, plus one-click effects like normalize, equalize, emboss and charcoal. Selecting Custom opens the effects panel, where every option has its own explanation.</p>
                        <p><strong>Use when:</strong> You want a specific look, or want to combine adjustments yourself.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

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
    <script src="js/config.js?v=2026-07-13"></script>
    <script src="js/urlParams.js?v=2.12.0"></script>
<?php if (!empty($easyImageTossToyEnabled)): ?>
    <script src="toss-toy/toss-toy.config.js?v=3"></script>
    <script src="toss-toy/toss-toy-tetris-scores.js?v=1"></script>
    <script src="toss-toy/toss-toy-tetris.js?v=6"></script>
    <script src="toss-toy/toss-toy-easter-egg.js?v=2"></script>
    <script src="toss-toy/toss-toy.js?v=10"></script>
    <script src="toss-toy/toss-toy-bridge.js?v=2"></script>
<?php endif; ?>
    <script src="js/app.js?v=2.36.0"></script>
    <!-- Bootstrap for shared components -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js" integrity="sha384-geWF76RCwLtnZ8qwWowPQNguL3RmwHVBC9FhGdlKrxdiJJigb/j/68SIy3Te4Bkz" crossorigin="anonymous"></script>
</body>
</html> 