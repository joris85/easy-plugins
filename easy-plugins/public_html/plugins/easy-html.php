<?php 
$pageTitle = 'Easy HTML - Clean HTML Code for Email Compatibility | Easy Plugins';
$faviconPath = '../favicon.ico';
$cssPath = '../shared/master.css';
$themePath = '../shared/theme.js';
include '../shared/header.php'; 

$articleUrl = easyPluginsArticleUrl();
?>

<meta name="description" content="Easy HTML cleans and optimizes HTML code for better email client compatibility. Remove unnecessary code and fix formatting issues for perfect email rendering.">
<meta name="keywords" content="easy html, html cleaner, email html, html optimizer, clean html code, email compatibility">
<meta property="og:title" content="Easy HTML - Clean HTML Code for Email Compatibility">
<meta property="og:description" content="Clean and optimize your HTML code for better email client compatibility with Easy HTML.">
<meta property="og:type" content="article">
<meta property="og:url" content="<?= $articleUrl ?>">
<link rel="canonical" href="<?= $articleUrl ?>">

<div class="container-fluid">
    <div class="container py-5">
        <div class="row mb-5">
            <div class="col-lg-8 mx-auto">
                <div class="d-flex align-items-center mb-4">
                    <img src="/brand/tools/easy-html.svg" alt="" width="58" height="58" class="me-3">
                    <div>
                        <h1 class="display-4 mb-2">Easy HTML</h1>
                        <p class="text-muted lead">Clean HTML Code for Email Compatibility</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="row">
            <div class="col-lg-8 mx-auto">
                <article>
                    <section class="mb-5">
                        <p class="lead">
                            Easy HTML cleans messy pasted HTML from Word, Google Docs, Gmail and old websites so it works reliably in email and CMS editors.
                            One-click presets set everything up for common jobs, a real HTML parser keeps even malformed input safe, and links always survive the cleaning.
                        </p>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4"><i class="fas fa-star me-2"></i>Key Features</h2>
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-bolt me-2 text-primary"></i>One-Click Presets</h3>
                                <p>From Google Docs / Word, For CMS editor, Plain paragraphs, Sending email styled and Sending email clean: one click sets all options for the job.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-broom me-2 text-primary"></i>Deep Paste Cleaning</h3>
                                <p>Strips inline styles, classes, editor attributes, Word leftovers, comments, empty tags and &amp;nbsp; clutter, while structure and links stay intact.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-exchange-alt me-2 text-primary"></i>Search &amp; Replace</h3>
                                <p>Replace text after cleaning with multiple rules, never touching the HTML tags. Ideal for filling in placeholders like [price] or [date].</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-link me-2 text-primary"></i>Link &amp; Typography Cleanup</h3>
                                <p>Convert div to p, straighten smart quotes, and strip utm_* and other tracking parameters from links while the links keep working.</p>
                            </div>
                        </div>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4"><i class="fas fa-question-circle me-2"></i>How to Use Easy HTML</h2>
                        <ol>
                            <li class="mb-3"><strong>Paste HTML:</strong> Copy your text from Word, Google Docs, Gmail or a website and paste it into the editor</li>
                            <li class="mb-3"><strong>Pick a preset:</strong> Choose the preset that matches your job, or fine-tune the options by hand</li>
                            <li class="mb-3"><strong>Clean:</strong> Click Clean HTML and review the result in the visual editor and the code view</li>
                            <li class="mb-3"><strong>Copy:</strong> Copy the cleaned HTML straight into your email tool or CMS</li>
                        </ol>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4"><i class="fas fa-lightbulb me-2"></i>Use Cases</h2>
                        <ul>
                            <li class="mb-2">Clean HTML for email marketing campaigns</li>
                            <li class="mb-2">Optimize HTML exported from design tools</li>
                            <li class="mb-2">Fix HTML formatting issues</li>
                            <li class="mb-2">Prepare HTML for email clients</li>
                            <li class="mb-2">Remove unnecessary code from HTML files</li>
                        </ul>
                    </section>
                    <?php $articleFaqSlug = 'easy-html'; include __DIR__ . '/../shared/article-faq-section.php'; ?>
                    <?php $articlePrivacySlug = 'easy-html'; include __DIR__ . '/../shared/article-privacy-section.php'; ?>


                    <section class="mb-5 text-center">
                        <div class="card bg-primary text-white">
                            <div class="card-body p-5">
                                <h2 class="h3 mb-3">Clean Your HTML Code</h2>
                                <p class="mb-4">Optimize HTML for email compatibility with Easy HTML.</p>
                                <a href="../easy-html/" class="btn btn-light btn-lg">
                                    <i class="fas fa-arrow-right me-2"></i>Use Easy HTML Tool
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

