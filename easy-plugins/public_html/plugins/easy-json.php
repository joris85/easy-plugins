<?php
$pageTitle = 'Easy JSON - Free JSON Formatter, Validator & Minifier | Easy Plugins';
$faviconPath = '../favicon.ico';
$cssPath = '../shared/master.css';
$themePath = '../shared/theme.js';
include '../shared/header.php';
$articleUrl = easyPluginsArticleUrl();
?>

<meta name="description" content="Free JSON formatter and validator: pretty-print with your indent, minify, sort keys, and get clear error messages with line and column. Runs in your browser.">
<meta property="og:title" content="Easy JSON - Free JSON Formatter, Validator & Minifier">
<meta property="og:description" content="Format, validate and minify JSON with clear line-and-column errors. Sort keys, copy or download. In the browser.">
<meta property="og:type" content="article">
<meta property="og:url" content="<?= $articleUrl ?>">
<link rel="canonical" href="<?= $articleUrl ?>">

<div class="container-fluid">
    <div class="container py-5">
        <div class="row mb-5"><div class="col-lg-8 mx-auto">
            <div class="d-flex align-items-center mb-4">
                <img src="/brand/tools/easy-json.svg" alt="" width="58" height="58" class="me-3">
                <div><h1 class="display-4 mb-2">Easy JSON</h1><p class="text-muted lead">Format, Validate &amp; Minify JSON</p></div>
            </div>
        </div></div>
        <div class="row"><div class="col-lg-8 mx-auto"><article>
            <section class="mb-5"><p class="lead">Paste JSON and tidy it up in one click: pretty-print it with the indentation you prefer, minify it for production, or sort every object's keys alphabetically. When the JSON is invalid you get a clear message with the exact line and column, so you can fix it fast. Everything runs in your browser.</p></section>

            <section class="mb-5"><h2 class="h3 mb-4"><i class="fas fa-star me-2"></i>Key Features</h2>
                <div class="row">
                    <div class="col-md-6 mb-3"><h3 class="h5"><i class="fas fa-align-left me-2 text-primary"></i>Format</h3><p>Pretty-print with 2 spaces, 4 spaces or tabs, so nested data becomes readable at a glance.</p></div>
                    <div class="col-md-6 mb-3"><h3 class="h5"><i class="fas fa-circle-check me-2 text-primary"></i>Validate</h3><p>Instant validation with the exact line and column of any syntax error.</p></div>
                    <div class="col-md-6 mb-3"><h3 class="h5"><i class="fas fa-compress me-2 text-primary"></i>Minify</h3><p>Strip all whitespace for the smallest possible payload for APIs and config.</p></div>
                    <div class="col-md-6 mb-3"><h3 class="h5"><i class="fas fa-arrow-down-a-z me-2 text-primary"></i>Sort Keys</h3><p>Order keys alphabetically (recursively) to make large files diffable.</p></div>
                </div>
            </section>

            <section class="mb-5"><h2 class="h3 mb-4"><i class="fas fa-lightbulb me-2"></i>Use Cases</h2>
                <ul>
                    <li class="mb-2">Read an unformatted API response</li>
                    <li class="mb-2">Find the exact spot a JSON file fails to parse</li>
                    <li class="mb-2">Minify a config file before shipping</li>
                    <li class="mb-2">Sort keys so two JSON files can be compared cleanly</li>
                </ul>
            </section>
            <?php $articleFaqSlug = 'easy-json'; include __DIR__ . '/../shared/article-faq-section.php'; ?>
            <section class="mb-5 text-center"><div class="card bg-primary text-white"><div class="card-body p-5">
                <h2 class="h3 mb-3">Format Your JSON</h2><p class="mb-4">Free, private, instant validation.</p>
                <a href="../easy-json/" class="btn btn-light btn-lg"><i class="fas fa-arrow-right me-2"></i>Use Easy JSON</a>
            </div></div></section>
        </article></div></div>
    </div>
</div>
<?php include '../shared/footer.php'; ?>
