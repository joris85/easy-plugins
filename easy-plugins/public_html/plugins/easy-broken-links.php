<?php
$pageTitle = 'Easy Broken Links - Free Broken Link Checker | Easy Plugins';
$faviconPath = '../favicon.ico';
$cssPath = '../shared/master.css';
$themePath = '../shared/theme.js';
include '../shared/header.php';

$articleUrl = easyPluginsArticleUrl();
?>

<meta name="description" content="Free broken link checker: every link on a page verified with a real HTTP request. Internal and external links, with status codes and the page each link lives on.">
<meta name="keywords" content="broken link checker, dead link finder, check links, 404 checker, link audit, free link checker">
<meta property="og:title" content="Easy Broken Links - Free Broken Link Checker">
<meta property="og:description" content="Find broken links on any page. Every link verified with a real HTTP request; bot-blocked links reported separately.">
<meta property="og:type" content="article">
<meta property="og:url" content="<?= $articleUrl ?>">
<link rel="canonical" href="<?= $articleUrl ?>">

<div class="container-fluid">
    <div class="container py-5">
        <div class="row mb-5">
            <div class="col-lg-8 mx-auto">
                <div class="d-flex align-items-center mb-4">
                    <img src="/brand/tools/easy-broken-links.svg" alt="" width="58" height="58" class="me-3">
                    <div>
                        <h1 class="display-4 mb-2">Easy Broken Links</h1>
                        <p class="text-muted lead">Find Broken Links on Any Page</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="row">
            <div class="col-lg-8 mx-auto">
                <article>
                    <section class="mb-5">
                        <p class="lead">
                            Broken links frustrate visitors and quietly hurt your search rankings. Easy Broken Links crawls the
                            page you give it (plus two linked pages), collects every link and verifies each one with a real HTTP
                            request, so you see exactly what is broken, where it lives, and what is merely blocking bots.
                        </p>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4"><i class="fas fa-star me-2"></i>Key Features</h2>
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-satellite-dish me-2 text-primary"></i>Real HTTP Checks</h3>
                                <p>Every unique link gets a real request: HEAD first, then a small GET for servers that reject HEAD. No guessing from caches or old indexes.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-globe me-2 text-primary"></i>Internal &amp; External</h3>
                                <p>Links to your own pages and to other websites are both verified, each reported with its HTTP status code.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-robot me-2 text-primary"></i>No False Alarms</h3>
                                <p>Sites that block bots (403, LinkedIn's famous 999) are listed separately as "blocked, probably fine" instead of wrongly flagged as broken.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-map-pin me-2 text-primary"></i>Shows Where It Lives</h3>
                                <p>Each broken link reports the page it was found on and the anchor text, so you can find and fix it fast.</p>
                            </div>
                        </div>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4"><i class="fas fa-question-circle me-2"></i>How to Use Easy Broken Links</h2>
                        <ol>
                            <li class="mb-3"><strong>Enter a URL:</strong> Type the address of the page you want to check</li>
                            <li class="mb-3"><strong>Run the check:</strong> The page plus two linked pages are scanned, up to 40 links per run</li>
                            <li class="mb-3"><strong>Review broken links:</strong> Each one shows its status code and the page it lives on</li>
                            <li class="mb-3"><strong>Fix or remove:</strong> Update the URL, restore the target page, or remove the link</li>
                        </ol>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4"><i class="fas fa-shield-alt me-2 text-success"></i>Privacy &amp; Fair Use</h2>
                        <p>
                            The tool only fetches public pages, with a clearly identified user agent
                            (<code>easy-plugins-audit</code>) that site owners can block. Results are cached for 10 minutes;
                            nothing else is stored. Free checks are limited to 40 links per run and 5 runs per 10 minutes.
                        </p>
                    </section>
                    <?php $articleFaqSlug = 'easy-broken-links'; include __DIR__ . '/../shared/article-faq-section.php'; ?>

                    <section class="mb-5 text-center">
                        <div class="card bg-primary text-white">
                            <div class="card-body p-5">
                                <h2 class="h3 mb-3">Find Your Broken Links</h2>
                                <p class="mb-4">Free, no account, real HTTP checks.</p>
                                <a href="../easy-broken-links/" class="btn btn-light btn-lg">
                                    <i class="fas fa-arrow-right me-2"></i>Use Easy Broken Links
                                </a>
                            </div>
                        </div>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4">Related Tools</h2>
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <a href="easy-website-audit" class="text-decoration-none">
                                    <div class="card">
                                        <div class="card-body">
                                            <h4 class="h6"><i class="fas fa-gauge-high me-2"></i>Easy Website Audit</h4>
                                            <p class="text-muted small mb-0">Free SEO &amp; speed check of any page</p>
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
