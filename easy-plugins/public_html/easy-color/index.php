<?php
$pageTitle = 'Easy Color - Color Picker, Palettes & Contrast Checker';
$metaDescription = 'Pick a colour and read it as HEX, RGB or HSL. Build shades, matching palettes and CSS gradients with unlimited stops, and check WCAG contrast. Free, in your browser.';
$canonicalPath = '/easy-color/';
$faviconPath = '../favicon.ico';
$cssPath = '../shared/master.css';
$themePath = '../shared/theme.js';
include '../shared/header.php';
?>

    <link rel="stylesheet" href="css/styles.css?v=2.0">

    <div class="container-fluid">
        <div class="container tool-page-inner">
            <?php $toolInfoSlug = 'easy-color'; include __DIR__ . '/../shared/tool-info-bar.php'; ?>

            <div class="cc-grid">
                <!-- Left: the picker -->
                <div class="card shadow-sm cc-card">
                    <div class="card-body">
                        <!-- The big block is the picker itself: it is what the eye
                             goes to, so it is what should be clickable. The real
                             input lies invisibly across it. -->
                        <div class="cc-big" id="ccBig">
                            <input type="color" id="ccPicker" value="#4caf50" aria-label="<?= easyPluginsText('Pick a colour', 'Kies een kleur') ?>">
                            <span class="cc-big-hex" id="ccBigHex">#4CAF50</span>
                            <span class="cc-big-hint"><i class="fas fa-eye-dropper"></i> <?= easyPluginsText('Click to pick a colour', 'Klik om een kleur te kiezen') ?></span>
                        </div>

                        <button type="button" id="ccEyedropper" class="btn btn-sm btn-outline-secondary w-100 mt-2" style="display:none;">
                            <i class="fas fa-eye-dropper me-1"></i><?= easyPluginsText('Pick from screen', 'Kies van het scherm') ?>
                        </button>

                        <div class="cc-seg mt-3" id="ccFormats" role="group" aria-label="<?= easyPluginsText('Copy as', 'Kopieer als') ?>">
                            <span class="cc-seg-label"><?= easyPluginsText('Copy as', 'Kopieer als') ?></span>
                            <button type="button" data-format="hex" class="on" aria-pressed="true">HEX</button>
                            <button type="button" data-format="rgb" aria-pressed="false">RGB</button>
                            <button type="button" data-format="hsl" aria-pressed="false">HSL</button>
                        </div>
                        <p class="cc-note"><?= easyPluginsText('This sets what the swatches show and what lands on your clipboard.', 'Dit bepaalt wat de stalen tonen en wat je op je klembord krijgt.') ?></p>

                        <div class="cc-field">
                            <label for="ccHex">HEX</label>
                            <input type="text" id="ccHex" spellcheck="false" autocomplete="off" class="form-control">
                            <button type="button" class="btn btn-sm btn-outline-secondary" data-copy="ccHex" title="<?= easyPluginsText('Copy', 'Kopiëren') ?>"><i class="fas fa-copy"></i></button>
                        </div>
                        <div class="cc-field">
                            <label for="ccRgb">RGB</label>
                            <input type="text" id="ccRgb" spellcheck="false" autocomplete="off" class="form-control">
                            <button type="button" class="btn btn-sm btn-outline-secondary" data-copy="ccRgb" data-wrap="rgb" title="<?= easyPluginsText('Copy', 'Kopiëren') ?>"><i class="fas fa-copy"></i></button>
                        </div>
                        <div class="cc-field">
                            <label for="ccHsl">HSL</label>
                            <input type="text" id="ccHsl" spellcheck="false" autocomplete="off" class="form-control">
                            <button type="button" class="btn btn-sm btn-outline-secondary" data-copy="ccHsl" data-wrap="hsl" title="<?= easyPluginsText('Copy', 'Kopiëren') ?>"><i class="fas fa-copy"></i></button>
                        </div>

                        <div id="ccRecentWrap" style="display:none;">
                            <p class="cc-sub"><?= easyPluginsText('Recent colours', 'Recente kleuren') ?></p>
                            <div class="cc-recent" id="ccRecent"></div>
                        </div>
                    </div>
                </div>

                <!-- Right: derived colours -->
                <div class="cc-stack">
                    <div class="card shadow-sm">
                        <div class="card-body">
                            <h2 class="cc-h"><i class="fas fa-layer-group"></i><?= easyPluginsText('Shades &amp; tints', 'Tinten') ?></h2>
                            <div class="cc-chips" id="ccShades"></div>
                        </div>
                    </div>

                    <div class="card shadow-sm">
                        <div class="card-body">
                            <h2 class="cc-h"><i class="fas fa-swatchbook"></i><?= easyPluginsText('Matching palette', 'Bijpassend palet') ?></h2>
                            <div class="cc-chips" id="ccPalette"></div>
                        </div>
                    </div>

                    <div class="card shadow-sm">
                        <div class="card-body">
                            <h2 class="cc-h"><i class="fas fa-sliders"></i><?= easyPluginsText('CSS gradient', 'CSS-gradiënt') ?></h2>
                            <div class="cc-grad">
                                <div>
                                    <div class="cc-seg" id="ccGradType" role="group" aria-label="Type">
                                        <span class="cc-seg-label">Type</span>
                                        <button type="button" data-gtype="linear" class="on" aria-pressed="true"><i class="fas fa-arrows-up-down me-1"></i><?= easyPluginsText('Linear', 'Lineair') ?></button>
                                        <button type="button" data-gtype="radial" aria-pressed="false"><i class="fas fa-circle-dot me-1"></i><?= easyPluginsText('Radial', 'Radiaal') ?></button>
                                    </div>

                                    <div id="ccGradLinear">
                                        <div class="cc-seg" role="group" aria-label="<?= easyPluginsText('Direction', 'Richting') ?>">
                                            <span class="cc-seg-label"><?= easyPluginsText('Direction', 'Richting') ?></span>
                                            <button type="button" data-dir="180"><i class="fas fa-arrow-down"></i></button>
                                            <button type="button" data-dir="0"><i class="fas fa-arrow-up"></i></button>
                                            <button type="button" data-dir="90" class="on"><i class="fas fa-arrow-right"></i></button>
                                            <button type="button" data-dir="270"><i class="fas fa-arrow-left"></i></button>
                                            <button type="button" data-dir="135"><i class="fas fa-arrow-down-long fa-rotate-by" style="--fa-rotate-angle:-45deg"></i></button>
                                        </div>
                                        <div class="cc-range">
                                            <label for="ccAngle"><?= easyPluginsText('Angle', 'Hoek') ?></label>
                                            <input type="range" id="ccAngle" min="0" max="360" value="90" class="form-range">
                                            <span id="ccAngleOut" class="cc-out">90°</span>
                                        </div>
                                    </div>

                                    <div id="ccGradRadial" hidden>
                                        <div class="cc-seg" role="group" aria-label="<?= easyPluginsText('Position', 'Positie') ?>">
                                            <span class="cc-seg-label"><?= easyPluginsText('Position', 'Positie') ?></span>
                                            <button type="button" data-pos="center" class="on"><?= easyPluginsText('Centre', 'Midden') ?></button>
                                            <button type="button" data-pos="top-left"><i class="fas fa-arrow-up-long fa-rotate-by" style="--fa-rotate-angle:-45deg"></i></button>
                                            <button type="button" data-pos="top-right"><i class="fas fa-arrow-up-long fa-rotate-by" style="--fa-rotate-angle:45deg"></i></button>
                                            <button type="button" data-pos="bottom-left"><i class="fas fa-arrow-down-long fa-rotate-by" style="--fa-rotate-angle:45deg"></i></button>
                                            <button type="button" data-pos="bottom-right"><i class="fas fa-arrow-down-long fa-rotate-by" style="--fa-rotate-angle:-45deg"></i></button>
                                        </div>
                                        <div class="cc-range">
                                            <label for="ccRadius"><?= easyPluginsText('Radius', 'Straal') ?></label>
                                            <input type="range" id="ccRadius" min="10" max="200" value="70" class="form-range">
                                            <span id="ccRadiusOut" class="cc-out">70%</span>
                                        </div>
                                    </div>

                                    <p class="cc-sub"><?= easyPluginsText('Colours in the gradient', 'Kleuren in het verloop') ?></p>
                                    <div class="cc-stops" id="ccStops"></div>
                                    <button type="button" class="btn btn-sm btn-outline-secondary mt-2" id="ccAddStop">
                                        <i class="fas fa-plus me-1"></i><?= easyPluginsText('Add colour', 'Kleur toevoegen') ?>
                                    </button>
                                </div>
                                <div class="cc-grad-preview" id="ccGradPreview"></div>
                            </div>

                            <div class="cc-code">
                                <code id="ccGradCode"></code>
                                <button type="button" class="btn btn-sm btn-outline-primary" id="ccGradCopy"><i class="fas fa-copy me-1"></i><?= easyPluginsText('Copy', 'Kopiëren') ?></button>
                            </div>
                        </div>
                    </div>

                    <div class="card shadow-sm">
                        <div class="card-body">
                            <h2 class="cc-h"><i class="fas fa-circle-half-stroke"></i><?= easyPluginsText('Contrast check (WCAG)', 'Contrastcheck (WCAG)') ?></h2>
                            <div class="cc-ct-row">
                                <div class="cc-ct-field">
                                    <label for="ccCtText"><?= easyPluginsText('Text', 'Tekst') ?></label>
                                    <input type="color" id="ccCtText" value="#ffffff">
                                    <input type="text" id="ccCtTextHex" class="form-control cc-hexbox" spellcheck="false" autocomplete="off" aria-label="HEX text">
                                </div>
                                <div class="cc-ct-field">
                                    <label for="ccCtBg"><?= easyPluginsText('Background', 'Achtergrond') ?></label>
                                    <input type="color" id="ccCtBg" value="#4caf50">
                                    <input type="text" id="ccCtBgHex" class="form-control cc-hexbox" spellcheck="false" autocomplete="off" aria-label="HEX background">
                                </div>
                                <button type="button" class="btn btn-sm btn-outline-secondary" id="ccCtUse"><?= easyPluginsText('Use picked colour as text', 'Gebruik gekozen kleur als tekst') ?></button>
                                <button type="button" class="btn btn-sm btn-outline-secondary" id="ccCtSwap" title="<?= easyPluginsText('Swap', 'Wisselen') ?>"><i class="fas fa-right-left"></i></button>
                            </div>
                            <div class="cc-ct-preview" id="ccCtPreview">
                                <?= easyPluginsText('The quick brown fox jumps over the lazy dog.', 'Een snelle bruine vos springt over de luie hond.') ?>
                            </div>
                            <div class="cc-verdicts">
                                <span class="cc-ratio" id="ccCtRatio"></span>
                                <span id="ccCtGrades" class="cc-grades"></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <?php include '../shared/footer.php'; ?>
    </div>

    <div class="cc-toast" id="ccToast" role="status" aria-live="polite"></div>

    <script src="js/app.js?v=2.0"></script>
