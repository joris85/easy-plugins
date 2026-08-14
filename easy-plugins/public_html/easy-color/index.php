<?php
$pageTitle = 'Easy Color - Color Picker, Palettes & Contrast Checker';
$metaDescription = 'Pick a color and get HEX, RGB and HSL, build shades and matching palettes, generate CSS gradients and check WCAG contrast. Free, runs in your browser.';
$canonicalPath = '/easy-color/';
$faviconPath = '../favicon.ico';
$cssPath = '../shared/master.css';
$themePath = '../shared/theme.js';
include '../shared/header.php';
?>

    <link rel="stylesheet" href="css/styles.css?v=1.0">

    <div class="container-fluid">
        <div class="container tool-page-inner">
            <?php $toolInfoSlug = 'easy-color'; include __DIR__ . '/../shared/tool-info-bar.php'; ?>

            <div class="row g-4">
                <!-- Picker + formats -->
                <div class="col-lg-5">
                    <div class="card shadow-sm">
                        <div class="card-body">
                            <div id="colorBigSwatch" class="color-big-swatch">#4CAF50</div>
                            <input type="color" id="colorPicker" value="#4caf50" class="form-control form-control-color w-100 mb-3" style="height:48px;">

                            <div class="color-field">
                                <label>HEX</label>
                                <input type="text" id="colorHex" class="form-control">
                                <button class="btn btn-sm btn-outline-secondary" data-copy-field="colorHex" title="Copy"><i class="fas fa-copy"></i></button>
                            </div>
                            <div class="color-field">
                                <label>RGB</label>
                                <input type="text" id="colorRgb" class="form-control">
                                <button class="btn btn-sm btn-outline-secondary" data-copy-field="colorRgb" data-copy-prefix="rgb(" data-copy-suffix=")" title="Copy"><i class="fas fa-copy"></i></button>
                            </div>
                            <div class="color-field">
                                <label>HSL</label>
                                <input type="text" id="colorHsl" class="form-control">
                                <button class="btn btn-sm btn-outline-secondary" data-copy-field="colorHsl" data-copy-prefix="hsl(" data-copy-suffix=")" title="Copy"><i class="fas fa-copy"></i></button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Shades, palette, gradient, contrast -->
                <div class="col-lg-7">
                    <div class="card shadow-sm mb-4">
                        <div class="card-body">
                            <h2 class="h6 mb-3"><?= easyPluginsText('Shades &amp; tints', 'Tinten') ?></h2>
                            <div id="colorShades" class="color-swatch-grid"></div>
                        </div>
                    </div>
                    <div class="card shadow-sm mb-4">
                        <div class="card-body">
                            <h2 class="h6 mb-3"><?= easyPluginsText('Matching palette', 'Bijpassend palet') ?></h2>
                            <div id="colorPalette" class="color-swatch-grid"></div>
                        </div>
                    </div>
                    <div class="card shadow-sm mb-4">
                        <div class="card-body">
                            <h2 class="h6 mb-3"><?= easyPluginsText('CSS gradient', 'CSS-gradiënt') ?></h2>
                            <div id="gradPreview" class="color-grad-preview"></div>
                            <div class="d-flex align-items-center gap-3 my-2 flex-wrap">
                                <label class="mb-0"><?= easyPluginsText('End color', 'Eindkleur') ?>
                                    <input type="color" id="gradEnd" value="#2f855a" class="form-control form-control-color d-inline-block align-middle ms-1" style="width:44px;height:30px;">
                                </label>
                                <label class="mb-0"><?= easyPluginsText('Angle', 'Hoek') ?>
                                    <input type="range" id="gradAngle" min="0" max="360" value="90" class="align-middle ms-1" style="width:120px;">
                                </label>
                            </div>
                            <div class="d-flex align-items-center gap-2">
                                <code id="gradCode" class="color-code flex-grow-1"></code>
                                <button id="gradCopy" class="btn btn-sm btn-outline-primary"><i class="fas fa-copy me-1"></i><?= easyPluginsText('Copy', 'Kopieer') ?></button>
                            </div>
                        </div>
                    </div>
                    <div class="card shadow-sm">
                        <div class="card-body">
                            <h2 class="h6 mb-3"><?= easyPluginsText('Contrast checker (WCAG)', 'Contrastcheck (WCAG)') ?></h2>
                            <div class="d-flex align-items-center gap-3 mb-3 flex-wrap">
                                <label class="mb-0"><?= easyPluginsText('Text', 'Tekst') ?>
                                    <input type="color" id="contrastText" value="#ffffff" class="form-control form-control-color d-inline-block align-middle ms-1" style="width:44px;height:30px;">
                                </label>
                                <label class="mb-0"><?= easyPluginsText('Background', 'Achtergrond') ?>
                                    <input type="color" id="contrastBg" value="#4caf50" class="form-control form-control-color d-inline-block align-middle ms-1" style="width:44px;height:30px;">
                                </label>
                                <button id="contrastUseCurrent" class="btn btn-sm btn-outline-secondary"><?= easyPluginsText('Use picked color as text', 'Gebruik gekozen kleur als tekst') ?></button>
                            </div>
                            <div id="contrastPreview" class="color-contrast-preview">
                                <?= easyPluginsText('The quick brown fox jumps over the lazy dog.', 'Een snelle bruine vos springt over de luie hond.') ?>
                            </div>
                            <div class="d-flex align-items-center gap-3 mt-2 flex-wrap">
                                <strong id="contrastRatio" class="fs-5"></strong>
                                <div id="contrastGrades" class="small d-flex gap-3 flex-wrap"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <?php include '../shared/footer.php'; ?>
    </div>

    <script src="js/app.js?v=1.0"></script>
