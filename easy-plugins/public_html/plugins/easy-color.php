<?php
$pageTitle = 'Easy Color - Color Picker, Palettes & Contrast Checker | Easy Plugins';
$faviconPath = '../favicon.ico';
$cssPath = '../shared/master.css';
$themePath = '../shared/theme.js';
include '../shared/header.php';
$articleUrl = easyPluginsArticleUrl();
?>

<meta name="description" content="Pick a color and get HEX, RGB and HSL, build shades and matching palettes, generate CSS gradients and check WCAG contrast. Free, runs in your browser.">
<meta property="og:title" content="Easy Color - Color Picker, Palettes & Contrast Checker">
<meta property="og:description" content="HEX/RGB/HSL, shades and palettes, CSS gradients and a WCAG contrast checker in one tool.">
<meta property="og:type" content="article">
<meta property="og:url" content="<?= $articleUrl ?>">
<link rel="canonical" href="<?= $articleUrl ?>">

<div class="container-fluid">
    <div class="container py-5">
        <div class="row mb-5"><div class="col-lg-8 mx-auto">
            <div class="d-flex align-items-center mb-4">
                <img src="/brand/tools/easy-color.svg" alt="" width="58" height="58" class="me-3">
                <div><h1 class="display-4 mb-2">Easy Color</h1><p class="text-muted lead">Color Picker, Palettes &amp; Contrast Checker</p></div>
            </div>
        </div></div>
        <div class="row"><div class="col-lg-8 mx-auto"><article>
            <section class="mb-5"><p class="lead">Everything you need to work with a color in one place: pick it, read it as HEX, RGB and HSL, build shades and matching palettes, generate a CSS gradient, and check whether text on it meets accessibility contrast. It all runs in your browser.</p></section>

            <section class="mb-5"><h2 class="h3 mb-4"><i class="fas fa-star me-2"></i>Key Features</h2>
                <div class="row">
                    <div class="col-md-6 mb-3"><h3 class="h5"><i class="fas fa-eye-dropper me-2 text-primary"></i>HEX / RGB / HSL</h3><p>Pick a color or type any format; the others update instantly, each with a copy button.</p></div>
                    <div class="col-md-6 mb-3"><h3 class="h5"><i class="fas fa-swatchbook me-2 text-primary"></i>Palettes</h3><p>Shades and tints plus complementary, analogous and triadic colors, all one click to copy.</p></div>
                    <div class="col-md-6 mb-3"><h3 class="h5"><i class="fas fa-fill-drip me-2 text-primary"></i>CSS Gradient</h3><p>Two colors and an angle into ready-to-paste CSS.</p></div>
                    <div class="col-md-6 mb-3"><h3 class="h5"><i class="fas fa-universal-access me-2 text-primary"></i>WCAG Contrast</h3><p>Check text against a background and see AA and AAA pass or fail for normal and large text.</p></div>
                </div>
            </section>
            <?php $articleFaqSlug = 'easy-color'; include __DIR__ . '/../shared/article-faq-section.php'; ?>
            <section class="mb-5 text-center"><div class="card bg-primary text-white"><div class="card-body p-5">
                <h2 class="h3 mb-3">Work With Color</h2><p class="mb-4">Picker, palettes, gradients and contrast in one tool.</p>
                <a href="../easy-color/" class="btn btn-light btn-lg"><i class="fas fa-arrow-right me-2"></i>Use Easy Color</a>
            </div></div></section>
        </article></div></div>
    </div>
</div>
<?php include '../shared/footer.php'; ?>
