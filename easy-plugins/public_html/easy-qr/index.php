<?php
$pageTitle = 'Easy QR - Free QR Code Generator';
$metaDescription = 'Free QR code generator for a link, text, WiFi login or contact card. Custom shapes, colours, gradients and a logo. Download as PNG, SVG, JPG or WebP.';
$canonicalPath = '/easy-qr/';
$faviconPath = '../favicon.ico';
$cssPath = '../shared/master.css';
$themePath = '../shared/theme.js';
include '../shared/header.php';
?>

    <link rel="stylesheet" href="css/styles.css?v=2.1">

    <div class="container-fluid">
        <div class="container tool-page-inner">
            <?php $toolInfoSlug = 'easy-qr'; include __DIR__ . '/../shared/tool-info-bar.php'; ?>

            <div class="row g-4">
                <!-- Left: content + settings -->
                <div class="col-lg-7">

                    <!-- 1. Content -->
                    <div class="card shadow-sm mb-4">
                        <div class="card-body">
                            <h2 class="qr-section-title"><span class="qr-step">1</span><?= easyPluginsText('What goes in the code?', 'Wat komt er in de code?') ?></h2>
                            <div class="qr-tabs mb-3">
                                <button type="button" class="qr-tab active" data-type="url"><i class="fas fa-link me-1"></i><?= easyPluginsText('Link', 'Link') ?></button>
                                <button type="button" class="qr-tab" data-type="text"><i class="fas fa-font me-1"></i><?= easyPluginsText('Text', 'Tekst') ?></button>
                                <button type="button" class="qr-tab" data-type="wifi"><i class="fas fa-wifi me-1"></i>WiFi</button>
                                <button type="button" class="qr-tab" data-type="vcard"><i class="fas fa-address-card me-1"></i><?= easyPluginsText('Contact', 'Contact') ?></button>
                            </div>

                            <div id="qr-panel-url" class="qr-panel">
                                <label class="form-label" for="qrUrl"><?= easyPluginsText('Website address', 'Webadres') ?></label>
                                <input type="text" id="qrUrl" class="form-control" placeholder="example.com" value="https://easy-plugins.com">
                            </div>
                            <div id="qr-panel-text" class="qr-panel" style="display:none;">
                                <label class="form-label" for="qrText"><?= easyPluginsText('Text', 'Tekst') ?></label>
                                <textarea id="qrText" class="form-control" rows="4" placeholder="<?= easyPluginsText('Any text…', 'Willekeurige tekst…') ?>"></textarea>
                            </div>
                            <div id="qr-panel-wifi" class="qr-panel" style="display:none;">
                                <label class="form-label" for="qrWifiSsid"><?= easyPluginsText('Network name (SSID)', 'Netwerknaam (SSID)') ?></label>
                                <input type="text" id="qrWifiSsid" class="form-control mb-2">
                                <label class="form-label" for="qrWifiPass"><?= easyPluginsText('Password', 'Wachtwoord') ?></label>
                                <input type="text" id="qrWifiPass" class="form-control mb-2">
                                <div class="row g-2">
                                    <div class="col-sm-6">
                                        <label class="form-label" for="qrWifiEnc"><?= easyPluginsText('Security', 'Beveiliging') ?></label>
                                        <select id="qrWifiEnc" class="form-select">
                                            <option value="WPA">WPA/WPA2</option>
                                            <option value="WEP">WEP</option>
                                            <option value="nopass"><?= easyPluginsText('None', 'Geen') ?></option>
                                        </select>
                                    </div>
                                    <div class="col-sm-6 d-flex align-items-end">
                                        <div class="form-check mb-2">
                                            <input class="form-check-input" type="checkbox" id="qrWifiHidden">
                                            <label class="form-check-label" for="qrWifiHidden"><?= easyPluginsText('Hidden network', 'Verborgen netwerk') ?></label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div id="qr-panel-vcard" class="qr-panel" style="display:none;">
                                <label class="form-label" for="qrVcName"><?= easyPluginsText('Name', 'Naam') ?></label>
                                <input type="text" id="qrVcName" class="form-control mb-2">
                                <div class="row g-2">
                                    <div class="col-md-6"><label class="form-label" for="qrVcPhone"><?= easyPluginsText('Phone', 'Telefoon') ?></label><input type="text" id="qrVcPhone" class="form-control"></div>
                                    <div class="col-md-6"><label class="form-label" for="qrVcEmail"><?= easyPluginsText('Email', 'E-mail') ?></label><input type="text" id="qrVcEmail" class="form-control"></div>
                                    <div class="col-md-6"><label class="form-label" for="qrVcOrg"><?= easyPluginsText('Company', 'Bedrijf') ?></label><input type="text" id="qrVcOrg" class="form-control"></div>
                                    <div class="col-md-6"><label class="form-label" for="qrVcUrl"><?= easyPluginsText('Website', 'Website') ?></label><input type="text" id="qrVcUrl" class="form-control"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 2. Design -->
                    <div class="card shadow-sm mb-4">
                        <div class="card-body">
                            <h2 class="qr-section-title"><span class="qr-step">2</span><?= easyPluginsText('Design', 'Ontwerp') ?></h2>

                            <label class="form-label small text-muted"><?= easyPluginsText('Quick styles', 'Snelle stijlen') ?></label>
                            <div class="qr-presets mb-4">
                                <button type="button" class="qr-preset" data-preset="classic"><?= easyPluginsText('Classic', 'Klassiek') ?></button>
                                <button type="button" class="qr-preset" data-preset="rounded"><?= easyPluginsText('Rounded', 'Afgerond') ?></button>
                                <button type="button" class="qr-preset" data-preset="dots"><?= easyPluginsText('Dots', 'Stippen') ?></button>
                                <button type="button" class="qr-preset" data-preset="leaf"><?= easyPluginsText('Leaf', 'Blad') ?></button>
                                <button type="button" class="qr-preset" data-preset="brand"><?= easyPluginsText('Gradient', 'Kleurverloop') ?></button>
                            </div>

                            <div class="row g-3">
                                <div class="col-sm-6">
                                    <label class="form-label" for="qrDotStyle"><?= easyPluginsText('Dot shape', 'Vorm van de stippen') ?></label>
                                    <select id="qrDotStyle" class="form-select qr-opt">
                                        <option value="square"><?= easyPluginsText('Square', 'Vierkant') ?></option>
                                        <option value="rounded"><?= easyPluginsText('Rounded', 'Afgerond') ?></option>
                                        <option value="smooth"><?= easyPluginsText('Smooth', 'Vloeiend') ?></option>
                                        <option value="dots"><?= easyPluginsText('Dots', 'Stippen') ?></option>
                                    </select>
                                </div>
                                <div class="col-sm-3">
                                    <label class="form-label" for="qrEyeStyle"><?= easyPluginsText('Corner frame', 'Hoekkader') ?></label>
                                    <select id="qrEyeStyle" class="form-select qr-opt">
                                        <option value="square"><?= easyPluginsText('Square', 'Vierkant') ?></option>
                                        <option value="rounded"><?= easyPluginsText('Rounded', 'Afgerond') ?></option>
                                        <option value="extra"><?= easyPluginsText('Extra rounded', 'Extra afgerond') ?></option>
                                        <option value="circle"><?= easyPluginsText('Circle', 'Rond') ?></option>
                                        <option value="leaf"><?= easyPluginsText('Leaf', 'Blad') ?></option>
                                        <option value="leafalt"><?= easyPluginsText('Leaf flipped', 'Blad gespiegeld') ?></option>
                                        <option value="shield"><?= easyPluginsText('Shield', 'Schild') ?></option>
                                        <option value="cut"><?= easyPluginsText('Cut corner', 'Afgesneden hoek') ?></option>
                                    </select>
                                </div>
                                <div class="col-sm-3">
                                    <label class="form-label" for="qrEyeDotStyle"><?= easyPluginsText('Corner dot', 'Hoekstip') ?></label>
                                    <select id="qrEyeDotStyle" class="form-select qr-opt">
                                        <option value="square"><?= easyPluginsText('Square', 'Vierkant') ?></option>
                                        <option value="rounded"><?= easyPluginsText('Rounded', 'Afgerond') ?></option>
                                        <option value="circle"><?= easyPluginsText('Circle', 'Rond') ?></option>
                                        <option value="leaf"><?= easyPluginsText('Leaf', 'Blad') ?></option>
                                        <option value="leafalt"><?= easyPluginsText('Leaf flipped', 'Blad gespiegeld') ?></option>
                                        <option value="diamond"><?= easyPluginsText('Diamond', 'Ruit') ?></option>
                                        <option value="cut"><?= easyPluginsText('Cut corner', 'Afgesneden hoek') ?></option>
                                    </select>
                                </div>
                            </div>

                            <hr class="my-4">

                            <div class="row g-3 align-items-end">
                                <div class="col-auto">
                                    <label class="form-label mb-1" for="qrFg"><?= easyPluginsText('Dot colour', 'Kleur stippen') ?></label><br>
                                    <input type="color" id="qrFg" value="#1e1e1e" class="form-control form-control-color qr-opt">
                                </div>
                                <div class="col-auto">
                                    <label class="form-label mb-1" for="qrBg"><?= easyPluginsText('Background', 'Achtergrond') ?></label><br>
                                    <input type="color" id="qrBg" value="#ffffff" class="form-control form-control-color qr-opt">
                                </div>
                                <div class="col-auto">
                                    <div class="form-check">
                                        <input class="form-check-input qr-opt" type="checkbox" id="qrTransparent">
                                        <label class="form-check-label" for="qrTransparent"><?= easyPluginsText('Transparent', 'Transparant') ?></label>
                                    </div>
                                </div>
                                <div class="col-auto">
                                    <div class="form-check">
                                        <input class="form-check-input qr-opt" type="checkbox" id="qrEyeSame" checked>
                                        <label class="form-check-label" for="qrEyeSame"><?= easyPluginsText('Corners same colour', 'Hoeken zelfde kleur') ?></label>
                                    </div>
                                </div>
                                <div class="col-auto">
                                    <label class="form-label mb-1" for="qrEyeColor"><?= easyPluginsText('Corner colour', 'Kleur hoeken') ?></label><br>
                                    <input type="color" id="qrEyeColor" value="#1e1e1e" class="form-control form-control-color qr-opt">
                                </div>
                            </div>

                            <div class="row g-3 align-items-end mt-1">
                                <div class="col-auto">
                                    <label class="form-label mb-1" for="qrGradType"><?= easyPluginsText('Gradient', 'Kleurverloop') ?></label>
                                    <select id="qrGradType" class="form-select form-select-sm qr-opt">
                                        <option value="none"><?= easyPluginsText('None', 'Geen') ?></option>
                                        <option value="linear"><?= easyPluginsText('Linear', 'Lineair') ?></option>
                                        <option value="radial"><?= easyPluginsText('Radial', 'Radiaal') ?></option>
                                    </select>
                                </div>
                                <div class="col-auto" id="qrGradRow" style="display:none;">
                                    <div class="d-flex align-items-end gap-3">
                                        <div>
                                            <label class="form-label mb-1" for="qrGradTo"><?= easyPluginsText('Second colour', 'Tweede kleur') ?></label><br>
                                            <input type="color" id="qrGradTo" value="#1e88e5" class="form-control form-control-color qr-opt">
                                        </div>
                                        <div id="qrGradAngleWrap">
                                            <label class="form-label mb-1" for="qrGradAngle"><?= easyPluginsText('Angle', 'Hoek') ?> <span id="qrGradAngleOut" class="text-muted small"></span></label>
                                            <input type="range" id="qrGradAngle" min="0" max="360" value="45" class="form-range qr-opt" style="width:130px;">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 3. Logo + output -->
                    <div class="card shadow-sm">
                        <div class="card-body">
                            <h2 class="qr-section-title"><span class="qr-step">3</span><?= easyPluginsText('Logo &amp; output', 'Logo &amp; uitvoer') ?></h2>

                            <label class="form-label" for="qrLogo"><?= easyPluginsText('Logo in the centre', 'Logo in het midden') ?></label>
                            <div class="d-flex align-items-center gap-2 mb-3">
                                <input type="file" id="qrLogo" accept="image/*" class="form-control form-control-sm" style="max-width:220px;">
                                <button type="button" id="qrLogoClear" class="btn btn-sm btn-outline-secondary" style="display:none;"><i class="fas fa-times"></i></button>
                            </div>
                            <div id="qrLogoOptions" class="row g-3 align-items-end mb-3" style="display:none;">
                                <div class="col-auto" style="min-width:200px;">
                                    <label class="form-label mb-1" for="qrLogoSize"><?= easyPluginsText('Logo size', 'Logogrootte') ?> <span id="qrLogoSizeOut" class="text-muted small"></span></label>
                                    <input type="range" id="qrLogoSize" min="8" max="35" value="20" class="form-range qr-opt">
                                </div>
                                <div class="col-auto">
                                    <div class="form-check">
                                        <input class="form-check-input qr-opt" type="checkbox" id="qrLogoPad" checked>
                                        <label class="form-check-label" for="qrLogoPad"><?= easyPluginsText('Padding behind logo', 'Ruimte achter logo') ?></label>
                                    </div>
                                </div>
                            </div>

                            <hr class="my-3">

                            <div class="row g-3 align-items-end">
                                <div class="col-sm-4">
                                    <label class="form-label mb-1" for="qrSize"><?= easyPluginsText('Size', 'Grootte') ?> <span id="qrSizeOut" class="text-muted small"></span></label>
                                    <input type="range" id="qrSize" min="200" max="2000" step="50" value="600" class="form-range qr-opt">
                                </div>
                                <div class="col-sm-4">
                                    <label class="form-label mb-1" for="qrMargin"><?= easyPluginsText('Margin', 'Marge') ?> <span id="qrMarginOut" class="text-muted small"></span></label>
                                    <input type="range" id="qrMargin" min="0" max="8" value="4" class="form-range qr-opt">
                                </div>
                                <div class="col-sm-4">
                                    <label class="form-label mb-1" for="qrEcl"><?= easyPluginsText('Error correction', 'Foutcorrectie') ?></label>
                                    <select id="qrEcl" class="form-select form-select-sm qr-opt">
                                        <option value="L">L (7%)</option>
                                        <option value="M" selected>M (15%)</option>
                                        <option value="Q">Q (25%)</option>
                                        <option value="H"><?= easyPluginsText('H (30%) — best with a logo', 'H (30%) — beste met logo') ?></option>
                                    </select>
                                </div>
                            </div>

                            <button type="button" id="qrReset" class="btn btn-sm btn-outline-secondary mt-3">
                                <i class="fas fa-rotate-left me-1"></i><?= easyPluginsText('Reset design', 'Ontwerp resetten') ?>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Right: preview -->
                <div class="col-lg-5">
                    <div class="card shadow-sm qr-sticky">
                        <div class="card-body text-center">
                            <div class="qr-output">
                                <p id="qrEmpty" class="text-muted my-5"><?= easyPluginsText('Fill in the fields to see your QR code.', 'Vul de velden in om je QR-code te zien.') ?></p>
                                <div id="qrPreview" class="qr-preview"></div>
                            </div>

                            <div id="qrWarn" class="qr-warn" style="display:none;"></div>

                            <div id="qrDownloadRow" class="qr-downloads" style="display:none;">
                                <button type="button" id="qrDownloadPng" class="btn btn-primary btn-sm"><i class="fas fa-download me-1"></i>PNG</button>
                                <button type="button" id="qrDownloadSvg" class="btn btn-outline-primary btn-sm"><i class="fas fa-download me-1"></i>SVG</button>
                                <button type="button" id="qrDownloadJpg" class="btn btn-outline-secondary btn-sm"><i class="fas fa-download me-1"></i>JPG</button>
                                <button type="button" id="qrDownloadWebp" class="btn btn-outline-secondary btn-sm"><i class="fas fa-download me-1"></i>WebP</button>
                                <button type="button" id="qrCopy" class="btn btn-outline-secondary btn-sm"><i class="fas fa-copy me-1"></i><?= easyPluginsText('Copy', 'Kopieer') ?></button>
                            </div>
                        </div>
                    </div>
                    <p class="text-muted small mt-3 mb-0 text-center">
                        <i class="fas fa-shield-alt me-1"></i>
                        <?= easyPluginsText('Generated in your browser. No tracking, no expiry.', 'Gemaakt in je browser. Geen tracking, geen vervaldatum.') ?>
                    </p>
                </div>
            </div>
        </div>

        <?php include '../shared/footer.php'; ?>
    </div>

    <script src="/libraries/qr/qrcode.js?v=2.0"></script>
    <script src="js/app.js?v=2.1"></script>
