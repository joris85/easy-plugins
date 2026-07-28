<?php 
$pageTitle = 'Easy Search & Replace - Text Search with Regex Support | Easy Plugins';
$faviconPath = '../favicon.ico';
$cssPath = '../shared/master.css';
$themePath = '../shared/theme.js';
include '../shared/header.php'; 

$articleUrl = easyPluginsArticleUrl();
?>

<meta name="description" content="Easy Search & Replace searches and replaces text patterns with regex support, truncate, prefix, and line numbering. Powerful text manipulation tool.">
<meta name="keywords" content="easy search replace, regex search, text search replace, text manipulation, find and replace, regex tool">
<meta property="og:title" content="Easy Search & Replace - Text Search with Regex Support">
<meta property="og:description" content="Search and replace text patterns with regex support, truncate, prefix, and line numbering with Easy Search & Replace.">
<meta property="og:type" content="article">
<meta property="og:url" content="<?= $articleUrl ?>">
<link rel="canonical" href="<?= $articleUrl ?>">

<div class="container-fluid">
    <div class="container py-5">
        <div class="row mb-5">
            <div class="col-lg-8 mx-auto">
                <div class="d-flex align-items-center mb-4">
                    <i class="fas fa-search me-3" style="color: #17a2b8; font-size: 3rem;"></i>
                    <div>
                        <h1 class="display-4 mb-2">Easy Search & Replace</h1>
                        <p class="text-muted lead">Text Search with Regex Support</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="row">
            <div class="col-lg-8 mx-auto">
                <article>
                    <section class="mb-5">
                        <p class="lead">
                            Easy Search & Replace is a powerful text manipulation tool that helps you find and replace text patterns with regex support. 
                            Perfect for developers, writers, and data processors who need advanced text manipulation capabilities.
                        </p>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4"><i class="fas fa-star me-2"></i>Key Features</h2>
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-search me-2 text-primary"></i>Search & Replace</h3>
                                <p>Find and replace text patterns with simple or complex search queries. Support for case-sensitive and case-insensitive matching.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-code me-2 text-primary"></i>Regex Support</h3>
                                <p>Use regular expressions for advanced pattern matching. Create complex search patterns for sophisticated text manipulation.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-cut me-2 text-primary"></i>Truncate & Prefix</h3>
                                <p>Truncate text to specific lengths and add prefixes or suffixes to lines. Perfect for formatting and data preparation.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-list-ol me-2 text-primary"></i>Line Numbering</h3>
                                <p>Add line numbers to your text. Customize numbering format and starting number.</p>
                            </div>
                        </div>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4"><i class="fas fa-question-circle me-2"></i>How to Use Easy Search & Replace</h2>
                        <ol>
                            <li class="mb-3"><strong>Enter Text:</strong> Paste or type your text into the input field</li>
                            <li class="mb-3"><strong>Set Search Pattern:</strong> Enter the text or regex pattern to find</li>
                            <li class="mb-3"><strong>Set Replacement:</strong> Enter the replacement text or pattern</li>
                            <li class="mb-3"><strong>Configure Options:</strong> Choose regex mode, case sensitivity, and other options</li>
                            <li class="mb-3"><strong>Replace:</strong> Execute the search and replace operation</li>
                            <li class="mb-3"><strong>Copy Result:</strong> Copy the processed text</li>
                        </ol>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4"><i class="fas fa-lightbulb me-2"></i>Use Cases</h2>
                        <ul>
                            <li class="mb-2">Find and replace patterns in code files</li>
                            <li class="mb-2">Clean and format text data</li>
                            <li class="mb-2">Add line numbers to documents</li>
                            <li class="mb-2">Transform text with regex patterns</li>
                            <li class="mb-2">Prepare text for data processing</li>
                        </ul>
                    </section>
                    <?php $articlePrivacySlug = 'easy-search-replace'; include __DIR__ . '/../shared/article-privacy-section.php'; ?>


                    <section class="mb-5 text-center">
                        <div class="card bg-primary text-white">
                            <div class="card-body p-5">
                                <h2 class="h3 mb-3">Manipulate Text with Power</h2>
                                <p class="mb-4">Use Easy Search & Replace for advanced text manipulation.</p>
                                <a href="../easy-search-replace/" class="btn btn-light btn-lg">
                                    <i class="fas fa-arrow-right me-2"></i>Use Easy Search & Replace Tool
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

