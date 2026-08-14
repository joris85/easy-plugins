<?php
$pageTitle = 'Easy QR - Free QR Code Generator';
$metaDescription = 'Free QR code generator for a link, text, WiFi login or contact card. Custom colors and a center logo. Download as sharp PNG or scalable SVG. Runs in your browser.';
$canonicalPath = '/easy-qr/';
$faviconPath = '../favicon.ico';
$cssPath = '../shared/master.css';
$themePath = '../shared/theme.js';
include '../shared/header.php';
?>

    <link rel="stylesheet" href="css/styles.css?v=1.0">

    <div class="container-fluid">
        <div class="container tool-page-inner">
            <?php $toolInfoSlug = 'easy-qr'; include __DIR__ . '/../shared/tool-info-bar.php'; ?>

            <div class="row g-4">
                <!-- Left: input -->
                <div class="col-lg-6">
                    <div class="card shadow-sm">
                        <div class="card-body">
                            <div class="qr-tabs mb-3">
                                <button class="qr-tab active" data-type="url"><i class="fas fa-link me-1"></i><?= easyPluginsText('Link', 'Link') ?></button>
                                <button class="qr-tab" data-type="text"><i class="fas fa-font me-1"></i><?= easyPluginsText('Text', 'Tekst') ?></button>
                                <button class="qr-tab" data-type="wifi"><i class="fas fa-wifi me-1"></i>WiFi</button>
                                <button class="qr-tab" data-type="vcard"><i class="fas fa-address-card me-1"></i><?= easyPluginsText('Contact', 'Contact') ?></button>
                            </div>

                            <div id="qr-panel-url" class="qr-panel">
                                <label class="form-label"><?= easyPluginsText('Website address', 'Webadres') ?></label>
                                <input type="text" id="qrUrl" class="form-control" placeholder="example.com" value="https://easy-plugins.com">
                            </div>
                            <div id="qr-panel-text" class="qr-panel" style="display:none;">
                                <label class="form-label"><?= easyPluginsText('Text', 'Tekst') ?></label>
                                <textarea id="qrText" class="form-control" rows="4" placeholder="<?= easyPluginsText('Any text…', 'Willekeurige tekst…') ?>"></textarea>
                            </div>
                            <div id="qr-panel-wifi" class="qr-panel" style="display:none;">
                                <label class="form-label"><?= easyPluginsText('Network name (SSID)', 'Netwerknaam (SSID)') ?></label>
                                <input type="text" id="qrWifiSsid" class="form-control mb-2">
                                <label class="form-label"><?= easyPluginsText('Password', 'Wachtwoord') ?></label>
                                <input type="text" id="qrWifiPass" class="form-control mb-2">
                                <div class="row">
                                    <div class="col">
                                        <label class="form-label"><?= easyPluginsText('Security', 'Beveiliging') ?></label>
                                        <select id="qrWifiEnc" class="form-select">
                                            <option value="WPA">WPA/WPA2</option>
                                            <option value="WEP">WEP</option>
                                            <option value="nopass"><?= easyPluginsText('None', 'Geen') ?></option>
                                        </select>
                                    </div>
                                    <div class="col d-flex align-items-end">
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" id="qrWifiHidden">
                                            <label class="form-check-label" for="qrWifiHidden"><?= easyPluginsText('Hidden network', 'Verborgen netwerk') ?></label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div id="qr-panel-vcard" class="qr-panel" style="display:none;">
                                <label class="form-label"><?= easyPluginsText('Name', 'Naam') ?></label>
                                <input type="text" id="qrVcName" class="form-control mb-2">
                                <div class="row g-2">
                                    <div class="col-md-6"><label class="form-label"><?= easyPluginsText('Phone', 'Telefoon') ?></label><input type="text" id="qrVcPhone" class="form-control"></div>
                                    <div class="col-md-6"><label class="form-label"><?= easyPluginsText('Email', 'E-mail') ?></label><input type="text" id="qrVcEmail" class="form-control"></div>
                                    <div class="col-md-6"><label class="form-label"><?= easyPluginsText('Company', 'Bedrijf') ?></label><input type="text" id="qrVcOrg" class="form-control"></div>
                                    <div class="col-md-6"><label class="form-label"><?= easyPluginsText('Website', 'Website') ?></label><input type="text" id="qrVcUrl" class="form-control"></div>
                                </div>
                            </div>

                            <hr class="my-4">

                            <div class="row g-3 align-items-end">
                                <div class="col-auto">
                                    <label class="form-label mb-1"><?= easyPluginsText('Dots', 'Kleur') ?></label><br>
                                    <input type="color" id="qrFg" value="#1e1e1e" class="form-control form-control-color">
                                </div>
                                <div class="col-auto">
                                    <label class="form-label mb-1"><?= easyPluginsText('Background', 'Achtergrond') ?></label><br>
                                    <input type="color" id="qrBg" value="#ffffff" class="form-control form-control-color">
                                </div>
                                <div class="col-auto">
                                    <label class="form-label mb-1"><?= easyPluginsText('Error correction', 'Foutcorrectie') ?></label>
                                    <select id="qrEcl" class="form-select form-select-sm">
                                        <option value="L">L (7%)</option>
                                        <option value="M" selected>M (15%)</option>
                                        <option value="Q">Q (25%)</option>
                                        <option value="H"><?= easyPluginsText('H (30%) — best with a logo', 'H (30%) — beste met logo') ?></option>
                                    </select>
                                </div>
                                <div class="col-auto">
                                    <label class="form-label mb-1"><?= easyPluginsText('Center logo', 'Logo in het midden') ?></label>
                                    <div class="d-flex align-items-center gap-2">
                                        <input type="file" id="qrLogo" accept="image/*" class="form-control form-control-sm" style="max-width:180px;">
                                        <button id="qrLogoClear" class="btn btn-sm btn-outline-secondary" style="display:none;"><i class="fas fa-times"></i></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right: output -->
                <div class="col-lg-6">
                    <div class="card shadow-sm">
                        <div class="card-body text-center">
                            <div class="qr-output">
                                <p id="qrEmpty" class="text-muted my-5"><?= easyPluginsText('Fill in the fields to see your QR code.', 'Vul de velden in om je QR-code te zien.') ?></p>
                                <canvas id="qrCanvas" style="display:none; max-width:100%; height:auto;"></canvas>
                            </div>
                            <div id="qrDownloadRow" class="d-flex justify-content-center gap-2 mt-3" style="display:none;">
                                <button id="qrDownloadPng" class="btn btn-primary"><i class="fas fa-download me-1"></i>PNG</button>
                                <button id="qrDownloadSvg" class="btn btn-outline-secondary"><i class="fas fa-download me-1"></i>SVG</button>
                            </div>
                        </div>
                    </div>
                    <p class="text-muted small mt-3 mb-0 text-center">
                        <i class="fas fa-shield-alt me-1"></i>
                        <?= easyPluginsText('Generated in your browser — no tracking, no expiry.', 'Gemaakt in je browser — geen tracking, geen vervaldatum.') ?>
                    </p>
                </div>
            </div>
        </div>

        <?php include '../shared/footer.php'; ?>
    </div>

    <script src="/libraries/qr/qrcode.js?v=2.0"></script>
    <script src="js/app.js?v=1.2"></script>
