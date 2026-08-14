<?php
$pageTitle = 'Easy JSON - Format, Validate & Minify JSON';
$metaDescription = 'Free JSON formatter and validator: pretty-print with your indent, minify, sort keys, and get clear error messages with line and column. Runs in your browser.';
$canonicalPath = '/easy-json/';
$faviconPath = '../favicon.ico';
$cssPath = '../shared/master.css';
$themePath = '../shared/theme.js';
include '../shared/header.php';
?>

    <link rel="stylesheet" href="css/styles.css?v=1.0">

    <div class="container-fluid">
        <div class="container tool-page-inner">
            <?php $toolInfoSlug = 'easy-json'; include __DIR__ . '/../shared/tool-info-bar.php'; ?>

            <div class="row g-4">
                <div class="col-lg-6">
                    <div class="card shadow-sm h-100">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h2 class="h6 mb-0"><i class="fas fa-arrow-right-to-bracket me-2"></i><?= easyPluginsText('Input', 'Invoer') ?></h2>
                            <a href="#" id="jsonExample" class="small"><?= easyPluginsText('Try an example', 'Probeer een voorbeeld') ?></a>
                        </div>
                        <div class="card-body d-flex flex-column">
                            <textarea id="jsonInput" class="form-control font-monospace flex-grow-1" rows="16" spellcheck="false"
                                placeholder='{"paste": "your JSON here"}'></textarea>
                            <div id="jsonStatus" class="json-status"></div>
                        </div>
                    </div>
                </div>
                <div class="col-lg-6">
                    <div class="card shadow-sm h-100">
                        <div class="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
                            <h2 class="h6 mb-0"><i class="fas fa-arrow-right-from-bracket me-2"></i><?= easyPluginsText('Output', 'Uitvoer') ?></h2>
                            <div class="d-flex align-items-center gap-2 flex-wrap">
                                <select id="jsonIndent" class="form-select form-select-sm" style="width:auto;">
                                    <option value="2"><?= easyPluginsText('2 spaces', '2 spaties') ?></option>
                                    <option value="4"><?= easyPluginsText('4 spaces', '4 spaties') ?></option>
                                    <option value="tab">Tab</option>
                                </select>
                                <div class="form-check form-check-inline mb-0">
                                    <input class="form-check-input" type="checkbox" id="jsonSortKeys">
                                    <label class="form-check-label small" for="jsonSortKeys"><?= easyPluginsText('Sort keys', 'Sorteer keys') ?></label>
                                </div>
                            </div>
                        </div>
                        <div class="card-body d-flex flex-column">
                            <div class="d-flex gap-2 mb-3 flex-wrap">
                                <button id="jsonFormat" class="btn btn-primary btn-sm"><i class="fas fa-align-left me-1"></i><?= easyPluginsText('Format', 'Formatteer') ?></button>
                                <button id="jsonMinify" class="btn btn-outline-primary btn-sm"><i class="fas fa-compress me-1"></i><?= easyPluginsText('Minify', 'Minify') ?></button>
                                <button id="jsonCopy" class="btn btn-outline-secondary btn-sm"><i class="fas fa-copy me-1"></i><?= easyPluginsText('Copy', 'Kopieer') ?></button>
                                <button id="jsonDownload" class="btn btn-outline-secondary btn-sm"><i class="fas fa-download me-1"></i>Download</button>
                                <button id="jsonClear" class="btn btn-outline-secondary btn-sm ms-auto"><i class="fas fa-eraser me-1"></i><?= easyPluginsText('Clear', 'Wissen') ?></button>
                            </div>
                            <textarea id="jsonOutput" class="form-control font-monospace flex-grow-1" rows="14" spellcheck="false" readonly></textarea>
                        </div>
                    </div>
                </div>
            </div>

            <p class="text-muted small mt-4 mb-0">
                <i class="fas fa-shield-alt me-1"></i>
                <?= easyPluginsText('Everything runs in your browser — your JSON is never uploaded.', 'Alles gebeurt in je browser — je JSON wordt nooit geüpload.') ?>
            </p>
        </div>

        <?php include '../shared/footer.php'; ?>
    </div>

    <script src="js/app.js?v=1.0"></script>
