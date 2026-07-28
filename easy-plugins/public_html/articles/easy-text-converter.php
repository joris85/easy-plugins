<?php 
$pageTitle = 'Easy Text Converter - Transform Text & Get Statistics | Easy Plugins';
$faviconPath = '../favicon.ico';
$cssPath = '../shared/master.css';
$themePath = '../shared/theme.js';
include '../shared/header.php'; 

$articleUrl = easyPluginsArticleUrl();
?>

<meta name="description" content="Easy Text Converter transforms text with powerful conversion tools and provides instant statistics. Convert cases, encode/decode, count words and characters.">
<meta name="keywords" content="easy text converter, text transformer, case converter, text statistics, word counter, text tool">
<meta property="og:title" content="Easy Text Converter - Transform Text & Get Statistics">
<meta property="og:description" content="Transform your text with powerful conversion tools and get instant statistics with Easy Text Converter.">
<meta property="og:type" content="article">
<meta property="og:url" content="<?= $articleUrl ?>">
<link rel="canonical" href="<?= $articleUrl ?>">

<div class="container-fluid">
    <div class="container py-5">
        <div class="row mb-5">
            <div class="col-lg-8 mx-auto">
                <div class="d-flex align-items-center mb-4">
                    <i class="fas fa-text-width me-3" style="color: #17a2b8; font-size: 3rem;"></i>
                    <div>
                        <h1 class="display-4 mb-2">Easy Text Converter</h1>
                        <p class="text-muted lead">Transform Text & Get Statistics</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="row">
            <div class="col-lg-8 mx-auto">
                <article>
                    <section class="mb-5">
                        <p class="lead">
                            Easy Text Converter is a versatile text transformation tool that helps you convert text between different formats, 
                            encode and decode text, and get comprehensive statistics about your text content.
                        </p>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4"><i class="fas fa-star me-2"></i>Key Features</h2>
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-exchange-alt me-2 text-primary"></i>Case Conversion</h3>
                                <p>Convert text to uppercase, lowercase, title case, sentence case, and more with one click.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-key me-2 text-primary"></i>Encode/Decode</h3>
                                <p>Encode and decode text in various formats including Base64, URL encoding, and HTML entities.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-chart-bar me-2 text-primary"></i>Text Statistics</h3>
                                <p>Get detailed statistics including word count, character count, sentence count, and paragraph count.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-magic me-2 text-primary"></i>Text Transformations</h3>
                                <p>Reverse text, remove duplicates, sort lines, and apply various text transformations.</p>
                            </div>
                        </div>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4"><i class="fas fa-question-circle me-2"></i>How to Use Easy Text Converter</h2>
                        <ol>
                            <li class="mb-3"><strong>Paste Text:</strong> Enter or paste your text into the input field</li>
                            <li class="mb-3"><strong>Choose Operation:</strong> Select the conversion or transformation you need</li>
                            <li class="mb-3"><strong>Convert:</strong> Click to transform your text instantly</li>
                            <li class="mb-3"><strong>View Statistics:</strong> Check detailed statistics about your text</li>
                            <li class="mb-3"><strong>Copy Result:</strong> Copy the converted text or statistics</li>
                        </ol>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4"><i class="fas fa-lightbulb me-2"></i>Use Cases</h2>
                        <ul>
                            <li class="mb-2">Convert text case for coding or formatting</li>
                            <li class="mb-2">Encode text for URLs or data transmission</li>
                            <li class="mb-2">Get word and character counts for writing projects</li>
                            <li class="mb-2">Transform text for data processing</li>
                            <li class="mb-2">Analyze text content with comprehensive statistics</li>
                        </ul>
                    </section>
                    <?php $articlePrivacySlug = 'easy-text-converter'; include __DIR__ . '/../shared/article-privacy-section.php'; ?>


                    <section class="mb-5 text-center">
                        <div class="card bg-primary text-white">
                            <div class="card-body p-5">
                                <h2 class="h3 mb-3">Transform Your Text</h2>
                                <p class="mb-4">Use Easy Text Converter for all your text transformation needs.</p>
                                <a href="../easy-text-converter/" class="btn btn-light btn-lg">
                                    <i class="fas fa-arrow-right me-2"></i>Use Easy Text Converter Tool
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


