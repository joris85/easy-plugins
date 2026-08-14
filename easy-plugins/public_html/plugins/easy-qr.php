<?php
$pageTitle = 'Easy QR - Free QR Code Generator | Easy Plugins';
$faviconPath = '../favicon.ico';
$cssPath = '../shared/master.css';
$themePath = '../shared/theme.js';
include '../shared/header.php';
$articleUrl = easyPluginsArticleUrl();
?>

<meta name="description" content="Free QR code generator for a link, text, WiFi login or contact card. Custom colors and a center logo. Download as sharp PNG or scalable SVG. Runs in your browser.">
<meta property="og:title" content="Easy QR - Free QR Code Generator">
<meta property="og:description" content="Make a QR code for a link, WiFi or contact card, with colors and a logo. PNG or SVG. No tracking, no expiry.">
<meta property="og:type" content="article">
<meta property="og:url" content="<?= $articleUrl ?>">
<link rel="canonical" href="<?= $articleUrl ?>">

<div class="container-fluid">
    <div class="container py-5">
        <div class="row mb-5"><div class="col-lg-8 mx-auto">
            <div class="d-flex align-items-center mb-4">
                <img src="/brand/tools/easy-qr.svg" alt="" width="58" height="58" class="me-3">
                <div><h1 class="display-4 mb-2">Easy QR</h1><p class="text-muted lead">Free QR Code Generator</p></div>
            </div>
        </div></div>
        <div class="row"><div class="col-lg-8 mx-auto"><article>
            <section class="mb-5"><p class="lead">Create a QR code for a website link, plain text, a WiFi login or a contact card, with your own colors and an optional logo in the center. The code is generated in your browser and encodes your data directly, so there is no redirect, no tracking and nothing that can expire.</p></section>

            <section class="mb-5"><h2 class="h3 mb-4"><i class="fas fa-star me-2"></i>Key Features</h2>
                <div class="row">
                    <div class="col-md-6 mb-3"><h3 class="h5"><i class="fas fa-list me-2 text-primary"></i>Four Types</h3><p>Link, plain text, WiFi (guests connect by scanning) and contact card (vCard adds you to a phone).</p></div>
                    <div class="col-md-6 mb-3"><h3 class="h5"><i class="fas fa-palette me-2 text-primary"></i>Colors &amp; Logo</h3><p>Set the dot and background colors and drop a logo into the middle; error correction keeps it scannable.</p></div>
                    <div class="col-md-6 mb-3"><h3 class="h5"><i class="fas fa-vector-square me-2 text-primary"></i>PNG or SVG</h3><p>PNG for web and social, SVG when it needs to scale to any size for print or signage.</p></div>
                    <div class="col-md-6 mb-3"><h3 class="h5"><i class="fas fa-shield-alt me-2 text-primary"></i>No Tracking</h3><p>Static codes with no redirect service behind them, so they never stop working and no one logs the scans.</p></div>
                </div>
            </section>

            <section class="mb-5"><h2 class="h3 mb-4"><i class="fas fa-question-circle me-2"></i>How to Use</h2>
                <ol>
                    <li class="mb-3"><strong>Pick a type:</strong> Link, text, WiFi or contact</li>
                    <li class="mb-3"><strong>Fill in the details:</strong> The code updates live as you type</li>
                    <li class="mb-3"><strong>Style it:</strong> Choose colors and add a logo</li>
                    <li class="mb-3"><strong>Download:</strong> PNG or SVG</li>
                </ol>
            </section>
            <?php $articleFaqSlug = 'easy-qr'; include __DIR__ . '/../shared/article-faq-section.php'; ?>
            <section class="mb-5 text-center"><div class="card bg-primary text-white"><div class="card-body p-5">
                <h2 class="h3 mb-3">Make a QR Code</h2><p class="mb-4">Free, no tracking, no expiry.</p>
                <a href="../easy-qr/" class="btn btn-light btn-lg"><i class="fas fa-arrow-right me-2"></i>Use Easy QR</a>
            </div></div></section>
        </article></div></div>
    </div>
</div>
<?php include '../shared/footer.php'; ?>
