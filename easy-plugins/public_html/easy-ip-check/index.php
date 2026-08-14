<?php
$pageTitle = 'Easy IP Check - IP & DNS Lookup';
$metaDescription = 'Free IP and DNS lookup: enter an IP address or domain and see resolved IPs, reverse DNS, MX/NS/TXT/SOA records and IP location, ISP and ASN. No account.';
$canonicalPath = '/easy-ip-check/';
$faviconPath = '../favicon.ico';
$cssPath = '../shared/master.css';
$themePath = '../shared/theme.js';
include '../shared/header.php';
?>

    <link rel="stylesheet" href="/libraries/audit/audit-ui.css?v=1.5">
    <link rel="stylesheet" href="css/styles.css?v=1.0">

    <div class="container-fluid">
        <div class="container tool-page-inner">
            <?php $toolInfoSlug = 'easy-ip-check'; include __DIR__ . '/../shared/tool-info-bar.php'; ?>

            <div class="card shadow-sm audit-form-card">
                <div class="card-body">
                    <form id="ipForm">
                        <label for="ipQuery" class="form-label fw-semibold">
                            <?= easyPluginsText('Enter an IP address or domain name', 'Vul een IP-adres of domeinnaam in') ?>
                        </label>
                        <div class="audit-form-row">
                            <input type="text" id="ipQuery" class="form-control" placeholder="8.8.8.8 <?= easyPluginsText('or', 'of') ?> example.com" autocomplete="off" maxlength="253">
                            <button type="submit" id="ipRunBtn" class="btn audit-run-btn">
                                <i class="fas fa-magnifying-glass me-1"></i> <?= easyPluginsText('Look up', 'Opzoeken') ?>
                            </button>
                        </div>
                        <p class="audit-free-note">
                            <i class="fas fa-info-circle me-1"></i>
                            <?= easyPluginsText(
                                'Shows resolved IPs, reverse DNS, DNS records and IP location. Free, 5 lookups per 10 minutes.',
                                'Toont IP-adressen, reverse DNS, DNS-records en IP-locatie. Gratis, 5 lookups per 10 minuten.'
                            ) ?>
                        </p>
                        <p class="audit-example-line"><a href="#" id="ipExample"><i class="fas fa-wand-magic-sparkles me-1"></i><?= easyPluginsText('Try an example', 'Probeer een voorbeeld') ?></a></p>
                    </form>
                </div>
            </div>

            <div id="ipStatus" class="audit-status" style="display: none;"></div>
            <div id="ipError" class="audit-error" style="display: none;"></div>
            <div id="ipResults" class="ip-results" style="display: none;"></div>
        </div>

        <?php include '../shared/footer.php'; ?>
    </div>

    <script src="js/app.js?v=1.0"></script>
