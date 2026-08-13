<?php
$pageTitle = 'Easy Website Audit - Free SEO & Speed Check | Easy Plugins';
$faviconPath = '../favicon.ico';
$cssPath = '../shared/master.css';
$themePath = '../shared/theme.js';
include '../shared/header.php';

$articleUrl = easyPluginsArticleUrl();
?>

<meta name="description" content="Free website audit: check any page for speed, SEO, technical setup and structured data. Get a 0-100 score and a prioritized to-do list. No account needed.">
<meta name="keywords" content="website audit, seo check, free seo audit, page speed check, website checker, seo analyzer">
<meta property="og:title" content="Easy Website Audit - Free SEO & Speed Check">
<meta property="og:description" content="Check any page for speed, SEO, technical setup and structured data with a 0-100 score and concrete fixes.">
<meta property="og:type" content="article">
<meta property="og:url" content="<?= $articleUrl ?>">
<link rel="canonical" href="<?= $articleUrl ?>">

<div class="container-fluid">
    <div class="container py-5">
        <div class="row mb-5">
            <div class="col-lg-8 mx-auto">
                <div class="d-flex align-items-center mb-4">
                    <img src="/brand/tools/easy-website-audit.svg" alt="" width="58" height="58" class="me-3">
                    <div>
                        <h1 class="display-4 mb-2">Easy Website Audit</h1>
                        <p class="text-muted lead">Free SEO &amp; Speed Check of Any Page</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="row">
            <div class="col-lg-8 mx-auto">
                <article>
                    <section class="mb-5">
                        <p class="lead">
                            Enter a web address and get an honest 0-100 score across four categories: measured performance,
                            SEO and content, technical setup, and structured data. Every failing check comes with a concrete,
                            prioritized fix, in plain language instead of jargon.
                        </p>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4"><i class="fas fa-star me-2"></i>Key Features</h2>
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-gauge-high me-2 text-primary"></i>Measured Performance</h3>
                                <p>Real measurements, not estimates: server response time (TTFB), total page weight and request count, checked against the thresholds Google uses.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-magnifying-glass me-2 text-primary"></i>SEO &amp; Content Checks</h3>
                                <p>Title tag and meta description length, single H1, image alt text and content depth: the basics that decide how a page shows up in search.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-cogs me-2 text-primary"></i>Technical Setup</h3>
                                <p>HTTPS, robots.txt, XML sitemap, mobile viewport, canonical link, charset, favicon and an accidental-noindex check that has saved more than one launch.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-share-nodes me-2 text-primary"></i>Structured Data &amp; Social</h3>
                                <p>JSON-LD structured data, Open Graph and Twitter Card tags, so your pages qualify for rich results and look right when shared.</p>
                            </div>
                        </div>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4"><i class="fas fa-question-circle me-2"></i>How to Use Easy Website Audit</h2>
                        <ol>
                            <li class="mb-3"><strong>Enter a URL:</strong> Type any public web address, yours or a competitor's</li>
                            <li class="mb-3"><strong>Run the audit:</strong> The check takes up to a minute while the page and its resources are measured</li>
                            <li class="mb-3"><strong>Read the score:</strong> Four category scores roll up into one 0-100 total</li>
                            <li class="mb-3"><strong>Fix what matters:</strong> The "what to fix first" list is ordered by impact</li>
                        </ol>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4"><i class="fas fa-shield-alt me-2 text-success"></i>Privacy &amp; Fair Use</h2>
                        <p>
                            Nothing of yours is uploaded: the tool fetches the public page you point it at, the same way a search
                            engine crawler does, with a clearly identified user agent (<code>easy-plugins-audit</code>) that site
                            owners can block. Results are cached for 10 minutes; nothing else is stored. Free audits are limited
                            to one page per run and 5 runs per 10 minutes.
                        </p>
                    </section>
                    <?php $articleFaqSlug = 'easy-website-audit'; include __DIR__ . '/../shared/article-faq-section.php'; ?>

                    <section class="mb-5 text-center">
                        <div class="card bg-primary text-white">
                            <div class="card-body p-5">
                                <h2 class="h3 mb-3">Check Your Website Now</h2>
                                <p class="mb-4">Free, no account, results in under a minute.</p>
                                <a href="../easy-website-audit/" class="btn btn-light btn-lg">
                                    <i class="fas fa-arrow-right me-2"></i>Use Easy Website Audit
                                </a>
                            </div>
                        </div>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4">Related Tools</h2>
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <a href="easy-broken-links" class="text-decoration-none">
                                    <div class="card">
                                        <div class="card-body">
                                            <h4 class="h6"><i class="fas fa-link-slash me-2"></i>Easy Broken Links</h4>
                                            <p class="text-muted small mb-0">Find broken links on any page</p>
                                        </div>
                                    </div>
                                </a>
                            </div>
                            <div class="col-md-6 mb-3">
                                <a href="easy-image-audit" class="text-decoration-none">
                                    <div class="card">
                                        <div class="card-body">
                                            <h4 class="h6"><i class="fas fa-images me-2"></i>Easy Image Audit</h4>
                                            <p class="text-muted small mb-0">Check images for size, format &amp; alt text</p>
                                        </div>
                                    </div>
                                </a>
                            </div>
                        </div>
                    </section>
                </article>
            </div>
        </div>
    </div>
</div>

<?php include '../shared/footer.php'; ?>
