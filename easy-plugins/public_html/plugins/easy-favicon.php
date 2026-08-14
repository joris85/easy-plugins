<?php
$pageTitle = 'Easy Favicon - Free Favicon Generator | Easy Plugins';
$faviconPath = '../favicon.ico';
$cssPath = '../shared/master.css';
$themePath = '../shared/theme.js';
include '../shared/header.php';
$articleUrl = easyPluginsArticleUrl();
?>

<meta name="description" content="Turn any image into a complete favicon set: favicon.ico, all PNG sizes, apple-touch-icon, site.webmanifest and the HTML to paste. Free, runs in your browser.">
<meta property="og:title" content="Easy Favicon - Free Favicon Generator">
<meta property="og:description" content="One image in, a complete favicon package out: favicon.ico, every PNG size, web manifest and the HTML to paste.">
<meta property="og:type" content="article">
<meta property="og:url" content="<?= $articleUrl ?>">
<link rel="canonical" href="<?= $articleUrl ?>">

<div class="container-fluid">
    <div class="container py-5">
        <div class="row mb-5"><div class="col-lg-8 mx-auto">
            <div class="d-flex align-items-center mb-4">
                <img src="/brand/tools/easy-favicon.svg" alt="" width="58" height="58" class="me-3">
                <div><h1 class="display-4 mb-2">Easy Favicon</h1><p class="text-muted lead">Free Favicon Generator</p></div>
            </div>
        </div></div>
        <div class="row"><div class="col-lg-8 mx-auto"><article>
            <section class="mb-5"><p class="lead">Upload one image and get a complete, modern favicon set in seconds: a multi-size favicon.ico, every PNG size browsers and phones expect, an apple-touch-icon, a web manifest and the exact HTML to paste. Everything is generated in your browser, so your image is never uploaded.</p></section>

            <section class="mb-5"><h2 class="h3 mb-4"><i class="fas fa-star me-2"></i>Key Features</h2>
                <div class="row">
                    <div class="col-md-6 mb-3"><h3 class="h5"><i class="fas fa-icons me-2 text-primary"></i>Every Size</h3><p>A favicon.ico with 16, 32 and 48px built in, plus separate PNGs at 16, 32, 48, 64, 180, 192 and 512 pixels for browsers, iOS and Android.</p></div>
                    <div class="col-md-6 mb-3"><h3 class="h5"><i class="fas fa-code me-2 text-primary"></i>Paste-Ready HTML</h3><p>The exact link and manifest tags to drop into your page head, matching the generated filenames.</p></div>
                    <div class="col-md-6 mb-3"><h3 class="h5"><i class="fas fa-sliders me-2 text-primary"></i>Quick Adjustments</h3><p>Add a background color behind a transparent image, padding, and rounded corners, with a live preview.</p></div>
                    <div class="col-md-6 mb-3"><h3 class="h5"><i class="fas fa-shield-alt me-2 text-primary"></i>Private</h3><p>Everything runs on the canvas in your browser. Your image never leaves your device.</p></div>
                </div>
            </section>

            <section class="mb-5"><h2 class="h3 mb-4"><i class="fas fa-question-circle me-2"></i>How to Use</h2>
                <ol>
                    <li class="mb-3"><strong>Upload an image:</strong> A square PNG or SVG of at least 512x512 works best</li>
                    <li class="mb-3"><strong>Adjust if needed:</strong> Background, padding and rounded corners</li>
                    <li class="mb-3"><strong>Download the ZIP:</strong> All files in one package</li>
                    <li class="mb-3"><strong>Install:</strong> Upload the files to your site root and paste the HTML into your head</li>
                </ol>
            </section>
            <?php $articleFaqSlug = 'easy-favicon'; include __DIR__ . '/../shared/article-faq-section.php'; ?>
            <section class="mb-5 text-center"><div class="card bg-primary text-white"><div class="card-body p-5">
                <h2 class="h3 mb-3">Create Your Favicon</h2><p class="mb-4">Free, private, ready in seconds.</p>
                <a href="../easy-favicon/" class="btn btn-light btn-lg"><i class="fas fa-arrow-right me-2"></i>Use Easy Favicon</a>
            </div></div></section>
        </article></div></div>
    </div>
</div>
<?php include '../shared/footer.php'; ?>
