<?php
$pageTitle = 'Easy Favicon - Free Favicon Generator';
$metaDescription = 'Turn any image into a complete favicon set: favicon.ico, all PNG sizes, apple-touch-icon, site.webmanifest and the HTML to paste. Free, runs in your browser.';
$canonicalPath = '/easy-favicon/';
$faviconPath = '../favicon.ico';
$cssPath = '../shared/master.css';
$themePath = '../shared/theme.js';
include '../shared/header.php';
?>

    <link rel="stylesheet" href="css/styles.css?v=1.0">

    <div class="container-fluid">
        <div class="container tool-page-inner">
            <?php $toolInfoSlug = 'easy-favicon'; include __DIR__ . '/../shared/tool-info-bar.php'; ?>

            <div class="row g-4">
                <!-- Left: upload + options -->
                <div class="col-lg-5">
                    <div class="card shadow-sm">
                        <div class="card-body">
                            <div id="faviconDropzone" class="favicon-dropzone">
                                <i class="fas fa-cloud-upload-alt"></i>
                                <p class="mb-1 fw-semibold"><?= easyPluginsText('Drop an image here or click to choose', 'Sleep hier een afbeelding of klik om te kiezen') ?></p>
                                <small class="text-muted"><?= easyPluginsText('PNG, JPG, SVG or WebP — a square image works best', 'PNG, JPG, SVG of WebP — een vierkante afbeelding werkt het beste') ?></small>
                                <input type="file" id="faviconFile" accept="image/*" hidden>
                            </div>

                            <div id="faviconOptions" style="display:none;" class="mt-4">
                                <div class="form-check form-switch mb-3">
                                    <input class="form-check-input" type="checkbox" id="faviconBg">
                                    <label class="form-check-label" for="faviconBg"><?= easyPluginsText('Add a background color', 'Achtergrondkleur toevoegen') ?></label>
                                    <input type="color" id="faviconBgColor" value="#4CAF50" class="ms-2 align-middle" style="width:38px;height:28px;vertical-align:middle;">
                                </div>
                                <label class="form-label mb-1"><?= easyPluginsText('Padding', 'Marge') ?>: <span class="text-muted small"><?= easyPluginsText('space around the image', 'ruimte rond de afbeelding') ?></span></label>
                                <input type="range" id="faviconPad" min="0" max="30" value="0" class="form-range mb-3">
                                <label class="form-label mb-1"><?= easyPluginsText('Rounded corners', 'Ronde hoeken') ?></label>
                                <input type="range" id="faviconRadius" min="0" max="100" value="0" class="form-range">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right: preview + downloads -->
                <div class="col-lg-7">
                    <div id="faviconPreview" class="card shadow-sm" style="display:none;">
                        <div class="card-body">
                            <h2 class="h6 mb-3"><i class="fas fa-eye me-2"></i><?= easyPluginsText('Preview', 'Voorbeeld') ?></h2>
                            <div class="favicon-preview-row">
                                <div class="favicon-tab-mock">
                                    <img id="previewTab" alt="" width="16" height="16">
                                    <span><?= easyPluginsText('Your Site', 'Jouw Site') ?></span>
                                </div>
                                <div class="favicon-swatch">
                                    <img id="preview32" alt="" width="32" height="32">
                                    <small>32&times;32</small>
                                </div>
                                <div class="favicon-swatch">
                                    <img id="previewApple" alt="" width="60" height="60" style="border-radius:12px;">
                                    <small>iOS 180</small>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="faviconDownload" class="card shadow-sm mt-4" style="display:none;">
                        <div class="card-body">
                            <h2 class="h6 mb-3"><i class="fas fa-download me-2"></i><?= easyPluginsText('Download', 'Downloaden') ?></h2>
                            <div class="d-flex flex-wrap gap-2 mb-4">
                                <button id="faviconDownloadZip" class="btn btn-primary">
                                    <i class="fas fa-file-zipper me-1"></i><?= easyPluginsText('Download full package (ZIP)', 'Download volledig pakket (ZIP)') ?>
                                </button>
                                <button id="faviconDownloadIco" class="btn btn-outline-secondary">
                                    <i class="fas fa-file me-1"></i><?= easyPluginsText('Just favicon.ico', 'Alleen favicon.ico') ?>
                                </button>
                            </div>
                            <p class="mb-2 fw-semibold"><?= easyPluginsText('Then paste this into your site\'s &lt;head&gt;:', 'Plak dit vervolgens in de &lt;head&gt; van je site:') ?></p>
                            <pre class="favicon-snippet"><code id="faviconSnippet"></code></pre>
                            <button id="faviconCopySnippet" class="btn btn-sm btn-outline-primary">
                                <i class="fas fa-copy me-1"></i><?= easyPluginsText('Copy HTML', 'Kopieer HTML') ?>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <p class="text-muted small mt-4 mb-0">
                <i class="fas fa-shield-alt me-1"></i>
                <?= easyPluginsText('Everything runs in your browser — your image is never uploaded.', 'Alles gebeurt in je browser — je afbeelding wordt nooit geüpload.') ?>
            </p>
        </div>

        <?php include '../shared/footer.php'; ?>
    </div>

    <script src="js/app.js?v=1.1"></script>
