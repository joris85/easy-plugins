<?php 
$pageTitle = 'Easy Less - LESS to CSS Compiler | Easy Plugins';
$faviconPath = '../favicon.ico';
$cssPath = '../shared/master.css';
$themePath = '../shared/theme.js';
include '../shared/header.php'; 

$articleUrl = easyPluginsArticleUrl();
?>

<meta name="description" content="Easy Less compiles LESS syntax to CSS in your browser. Real-time compilation with syntax highlighting, error detection, and instant CSS output.">
<meta name="keywords" content="easy less, less compiler, less to css, less preprocessor, css compiler, less syntax">
<meta property="og:title" content="Easy Less - LESS to CSS Compiler">
<meta property="og:description" content="Compile LESS syntax to CSS in your browser with Easy Less. Real-time compilation with syntax highlighting and error detection.">
<meta property="og:type" content="article">
<meta property="og:url" content="<?= $articleUrl ?>">
<link rel="canonical" href="<?= $articleUrl ?>">

<div class="container-fluid">
    <div class="container py-5">
        <div class="row mb-5">
            <div class="col-lg-8 mx-auto">
                <div class="d-flex align-items-center mb-4">
                    <img src="/brand/tools/easy-less.svg" alt="" width="58" height="58" class="me-3">
                    <div>
                        <h1 class="display-4 mb-2">Easy Less</h1>
                        <p class="text-muted lead">LESS to CSS Compiler</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="row">
            <div class="col-lg-8 mx-auto">
                <article>
                    <section class="mb-5">
                        <p class="lead">
                            Easy Less is a powerful browser-based LESS compiler that converts LESS syntax to CSS instantly. 
                            Write your LESS code and see the compiled CSS output in real-time with syntax highlighting and error detection.
                        </p>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4"><i class="fas fa-star me-2"></i>Key Features</h2>
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-bolt me-2 text-primary"></i>Real-Time Compilation</h3>
                                <p>See your LESS code compiled to CSS instantly as you type, with automatic updates every 300ms.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-code me-2 text-primary"></i>Syntax Highlighting</h3>
                                <p>Beautiful syntax highlighting for both LESS input and CSS output using CodeMirror editor.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-exclamation-triangle me-2 text-primary"></i>Error Detection</h3>
                                <p>Get clear error messages with line and column numbers when compilation fails.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-chart-bar me-2 text-primary"></i>Statistics</h3>
                                <p>View real-time statistics including line counts and character counts for both LESS and CSS.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-clipboard me-2 text-primary"></i>Copy & Download</h3>
                                <p>Easily copy compiled CSS to clipboard or download as a CSS file with one click.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-save me-2 text-primary"></i>Auto-Save</h3>
                                <p>Your code is automatically saved to browser localStorage, so you never lose your work.</p>
                            </div>
                        </div>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4"><i class="fas fa-question-circle me-2"></i>How to Use Easy Less</h2>
                        <ol>
                            <li class="mb-3"><strong>Enter LESS Code:</strong> Type or paste your LESS code into the left editor</li>
                            <li class="mb-3"><strong>Auto-Compile:</strong> The CSS output appears automatically in the right editor as you type</li>
                            <li class="mb-3"><strong>Review Output:</strong> Check the compiled CSS and fix any errors if needed</li>
                            <li class="mb-3"><strong>Copy or Download:</strong> Copy the CSS to clipboard or download it as a file</li>
                            <li class="mb-3"><strong>Use Example:</strong> Click "Example" to load sample LESS code and see how it works</li>
                        </ol>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4"><i class="fas fa-lightbulb me-2"></i>Use Cases</h2>
                        <ul>
                            <li class="mb-2">Compile LESS files to CSS for web projects</li>
                            <li class="mb-2">Test LESS syntax and see CSS output instantly</li>
                            <li class="mb-2">Learn LESS by experimenting with different syntax features</li>
                            <li class="mb-2">Quick conversion of LESS code snippets to CSS</li>
                            <li class="mb-2">Debug LESS compilation errors with detailed error messages</li>
                        </ul>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4"><i class="fas fa-keyboard me-2"></i>Keyboard Shortcuts</h2>
                        <ul>
                            <li class="mb-2"><strong>Ctrl/Cmd + Enter:</strong> Force compile LESS to CSS</li>
                            <li class="mb-2"><strong>Auto-compile:</strong> Compilation happens automatically 300ms after you stop typing</li>
                        </ul>
                    </section>
                    <?php $articleFaqSlug = 'easy-less'; include __DIR__ . '/../shared/article-faq-section.php'; ?>
                    <?php $articlePrivacySlug = 'easy-less'; include __DIR__ . '/../shared/article-privacy-section.php'; ?>


                    <section class="mb-5 text-center">
                        <div class="card bg-primary text-white">
                            <div class="card-body p-5">
                                <h2 class="h3 mb-3">Compile LESS to CSS</h2>
                                <p class="mb-4">Use Easy Less for all your LESS compilation needs.</p>
                                <a href="../easy-less/" class="btn btn-light btn-lg">
                                    <i class="fas fa-arrow-right me-2"></i>Use Easy Less Tool
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


