<?php
$pageTitle = 'Easy Image Audit - Check Images for Size, Format & Alt Text | Easy Plugins';
$faviconPath = '../favicon.ico';
$cssPath = '../shared/master.css';
$themePath = '../shared/theme.js';
include '../shared/header.php';

$articleUrl = easyPluginsArticleUrl();
?>

<meta name="description" content="Free image audit: every image on a page graded on format, file size, oversizing, lazy loading and alt text, with the KB you can save per image.">
<meta name="keywords" content="image audit, image seo, webp checker, image optimization check, alt text checker, page image analysis">
<meta property="og:title" content="Easy Image Audit - Check Images for Size, Format & Alt Text">
<meta property="og:description" content="Every image on a page graded like Lighthouse: format, size, lazy loading and alt text, with the KB you can save.">
<meta property="og:type" content="article">
<meta property="og:url" content="<?= $articleUrl ?>">
<link rel="canonical" href="<?= $articleUrl ?>">

<div class="container-fluid">
    <div class="container py-5">
        <div class="row mb-5">
            <div class="col-lg-8 mx-auto">
                <div class="d-flex align-items-center mb-4">
                    <img src="/brand/tools/easy-image-audit.svg" alt="" width="58" height="58" class="me-3">
                    <div>
                        <h1 class="display-4 mb-2">Easy Image Audit</h1>
                        <p class="text-muted lead">Check Images for Size, Format &amp; Alt Text</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="row">
            <div class="col-lg-8 mx-auto">
                <article>
                    <section class="mb-5">
                        <p class="lead">
                            Images are usually the heaviest part of a page. Easy Image Audit inventories every image on the page
                            you point it at and grades each one the way Google Lighthouse does: modern format, file size,
                            oversizing, lazy loading and alt text, with a headline number of how many KB you can save.
                        </p>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4"><i class="fas fa-star me-2"></i>Key Features</h2>
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-file-image me-2 text-primary"></i>Format Check</h3>
                                <p>Finds JPG and PNG images that would be 25-30% smaller as WebP or AVIF, the formats every modern browser supports.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-weight-hanging me-2 text-primary"></i>Savings Per Image</h3>
                                <p>Each image shows its actual size and how many KB a re-encode or resize would save, sorted by biggest win first.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-expand me-2 text-primary"></i>Oversizing Detection</h3>
                                <p>Spots originals served into much smaller slots, like a 3000px photo in a 300px column, allowing for retina screens.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-universal-access me-2 text-primary"></i>Alt Text &amp; Lazy Loading</h3>
                                <p>Flags missing alt attributes (bad for accessibility and SEO) and images that load eagerly when they could load lazily.</p>
                            </div>
                        </div>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4"><i class="fas fa-question-circle me-2"></i>How to Use Easy Image Audit</h2>
                        <ol>
                            <li class="mb-3"><strong>Enter a URL:</strong> Type the address of the page whose images you want to check</li>
                            <li class="mb-3"><strong>Run the audit:</strong> Up to 30 images are downloaded and measured</li>
                            <li class="mb-3"><strong>Review the table:</strong> Worst offenders first, with size, format and issues per image</li>
                            <li class="mb-3"><strong>Fix them for free:</strong> The <a href="easy-image">Easy Image tool</a> converts, resizes and compresses up to 100 images in one batch</li>
                        </ol>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4"><i class="fas fa-shield-alt me-2 text-success"></i>Privacy &amp; Fair Use</h2>
                        <p>
                            The tool fetches the public page and its images with a clearly identified user agent
                            (<code>easy-plugins-audit</code>) that site owners can block. Downloaded images are measured in
                            memory and discarded; only the result summary is cached for 10 minutes. Free audits are limited
                            to one page and 5 runs per 10 minutes.
                        </p>
                    </section>
                    <?php $articleFaqSlug = 'easy-image-audit'; include __DIR__ . '/../shared/article-faq-section.php'; ?>

                    <section class="mb-5 text-center">
                        <div class="card bg-primary text-white">
                            <div class="card-body p-5">
                                <h2 class="h3 mb-3">Audit Your Images Now</h2>
                                <p class="mb-4">Free, no account, sorted by biggest saving first.</p>
                                <a href="../easy-image-audit/" class="btn btn-light btn-lg">
                                    <i class="fas fa-arrow-right me-2"></i>Use Easy Image Audit
                                </a>
                            </div>
                        </div>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4">Related Tools</h2>
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <a href="easy-image" class="text-decoration-none">
                                    <div class="card">
                                        <div class="card-body">
                                            <h4 class="h6"><i class="fas fa-image me-2"></i>Easy Image</h4>
                                            <p class="text-muted small mb-0">Fix what the audit finds: resize, convert &amp; compress</p>
                                        </div>
                                    </div>
                                </a>
                            </div>
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
                        </div>
                    </section>
                </article>
            </div>
        </div>
    </div>
</div>

<?php include '../shared/footer.php'; ?>
