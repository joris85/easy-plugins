<?php
$pageTitle = 'Easy Domain Check - Free Domain Availability Checker | Easy Plugins';
$faviconPath = '../favicon.ico';
$cssPath = '../shared/master.css';
$themePath = '../shared/theme.js';
include '../shared/header.php';

$articleUrl = easyPluginsArticleUrl();
?>

<meta name="description" content="Free domain name checker: see instantly whether a name is available across .com, .nl, .net, .org, .io, .dev, .app and more, with live registry data via RDAP and DNS.">
<meta name="keywords" content="domain check, domain availability, domain name search, is domain available, whois, rdap, free domain checker">
<meta property="og:title" content="Easy Domain Check - Free Domain Availability Checker">
<meta property="og:description" content="Check a name across 12 popular extensions at once with live registry data. Free, no account, searches not logged.">
<meta property="og:type" content="article">
<meta property="og:url" content="<?= $articleUrl ?>">
<link rel="canonical" href="<?= $articleUrl ?>">

<div class="container-fluid">
    <div class="container py-5">
        <div class="row mb-5">
            <div class="col-lg-8 mx-auto">
                <div class="d-flex align-items-center mb-4">
                    <img src="/brand/tools/easy-domain-check.svg" alt="" width="58" height="58" class="me-3">
                    <div>
                        <h1 class="display-4 mb-2">Easy Domain Check</h1>
                        <p class="text-muted lead">Is Your Domain Name Available?</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="row">
            <div class="col-lg-8 mx-auto">
                <article>
                    <section class="mb-5">
                        <p class="lead">
                            Type a name and see in seconds which of 12 popular extensions are still available. The answers
                            come straight from the domain registries themselves, via RDAP (the modern WHOIS) and DNS, so
                            you are not looking at a stale cache or a sales page.
                        </p>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4"><i class="fas fa-star me-2"></i>Key Features</h2>
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-globe me-2 text-primary"></i>12 Extensions at Once</h3>
                                <p>.com, .nl, .net, .org, .be, .de, .eu, .io, .co, .dev, .app and .shop in one check. Type a full domain with another extension and that one is checked too.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-database me-2 text-primary"></i>Live Registry Data</h3>
                                <p>Availability is confirmed by the registry that actually manages the extension, via RDAP. Taken domains show their registration year.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-scale-balanced me-2 text-primary"></i>Honest Answers</h3>
                                <p>Three clear statuses: available (registry-confirmed), taken, or "verify" for the few extensions without a public registry API.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-user-secret me-2 text-primary"></i>No Search Logging</h3>
                                <p>Your searches are not logged, sold or used to pre-register domains, a real concern with some commercial domain search sites.</p>
                            </div>
                        </div>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4"><i class="fas fa-question-circle me-2"></i>How to Use Easy Domain Check</h2>
                        <ol>
                            <li class="mb-3"><strong>Type a name:</strong> Just the name ("myproject") or a full domain ("myproject.com")</li>
                            <li class="mb-3"><strong>Check availability:</strong> All 12 extensions are checked in parallel, usually in a few seconds</li>
                            <li class="mb-3"><strong>Pick your domain:</strong> Green cards are confirmed available</li>
                            <li class="mb-3"><strong>Register it:</strong> At any registrar you like, or let a webmaster arrange domain and website in one go</li>
                        </ol>
                    </section>
                    <?php $articleFaqSlug = 'easy-domain-check'; include __DIR__ . '/../shared/article-faq-section.php'; ?>

                    <section class="mb-5 text-center">
                        <div class="card bg-primary text-white">
                            <div class="card-body p-5">
                                <h2 class="h3 mb-3">Check Your Domain Name</h2>
                                <p class="mb-4">Free, live registry data, no account.</p>
                                <a href="../easy-domain-check/" class="btn btn-light btn-lg">
                                    <i class="fas fa-arrow-right me-2"></i>Use Easy Domain Check
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
                                <a href="easy-identify-me" class="text-decoration-none">
                                    <div class="card">
                                        <div class="card-body">
                                            <h4 class="h6"><i class="fas fa-id-card me-2"></i>Easy Identify Me</h4>
                                            <p class="text-muted small mb-0">Your IP, browser &amp; device info</p>
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
