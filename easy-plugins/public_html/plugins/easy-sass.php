<?php 
$pageTitle = 'Easy SASS - SASS/SCSS to CSS Compiler | Easy Plugins';
$faviconPath = '../favicon.ico';
$cssPath = '../shared/master.css';
$themePath = '../shared/theme.js';
include '../shared/header.php'; 

$articleUrl = easyPluginsArticleUrl();
?>

<meta name="description" content="Easy SASS compiles SASS/SCSS syntax to CSS in your browser. Support for both SASS and SCSS with real-time compilation, error detection, and instant CSS output.">
<meta name="keywords" content="easy sass, sass compiler, scss compiler, sass to css, scss to css, sass preprocessor, css compiler">
<meta property="og:title" content="Easy SASS - SASS/SCSS to CSS Compiler">
<meta property="og:description" content="Compile SASS/SCSS syntax to CSS in your browser with Easy SASS. Support for both SASS and SCSS with real-time compilation and error detection.">
<meta property="og:type" content="article">
<meta property="og:url" content="<?= $articleUrl ?>">
<link rel="canonical" href="<?= $articleUrl ?>">

<div class="container-fluid">
    <div class="container py-5">
        <div class="row mb-5">
            <div class="col-lg-8 mx-auto">
                <div class="d-flex align-items-center mb-4">
                    <i class="fas fa-code me-3" style="color: #bf4080; font-size: 3rem;"></i>
                    <div>
                        <h1 class="display-4 mb-2">Easy SASS</h1>
                        <p class="text-muted lead">SASS/SCSS to CSS Compiler</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="row">
            <div class="col-lg-8 mx-auto">
                <article>
                    <section class="mb-5">
                        <p class="lead">
                            Easy SASS is a powerful browser-based SASS/SCSS compiler that converts both SASS (indented) and SCSS (CSS-like) syntax to CSS instantly. 
                            Write your SASS or SCSS code and see the compiled CSS output in real-time with syntax highlighting and error detection.
                        </p>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4"><i class="fas fa-star me-2"></i>Key Features</h2>
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-exchange-alt me-2 text-primary"></i>Dual Syntax Support</h3>
                                <p>Switch between SASS (indented) and SCSS (CSS-like) syntax with a single click toggle button.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-bolt me-2 text-primary"></i>Real-Time Compilation</h3>
                                <p>See your SASS/SCSS code compiled to CSS instantly as you type, with automatic updates every 300ms.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-code me-2 text-primary"></i>Syntax Highlighting</h3>
                                <p>Beautiful syntax highlighting for both SASS/SCSS input and CSS output using CodeMirror editor.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-exclamation-triangle me-2 text-primary"></i>Error Detection</h3>
                                <p>Get clear error messages with line and column numbers when compilation fails.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-chart-bar me-2 text-primary"></i>Statistics</h3>
                                <p>View real-time statistics including line counts and character counts for both SASS/SCSS and CSS.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-clipboard me-2 text-primary"></i>Copy & Download</h3>
                                <p>Easily copy compiled CSS to clipboard or download as a CSS file with one click.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-save me-2 text-primary"></i>Auto-Save</h3>
                                <p>Your code and syntax preference are automatically saved to browser localStorage.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-lightbulb me-2 text-primary"></i>Examples</h3>
                                <p>Load example code for both SASS and SCSS syntax to see how they work.</p>
                            </div>
                        </div>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4"><i class="fas fa-question-circle me-2"></i>How to Use Easy SASS</h2>
                        <ol>
                            <li class="mb-3"><strong>Choose Syntax:</strong> Select SASS or SCSS syntax using the toggle button</li>
                            <li class="mb-3"><strong>Enter Code:</strong> Type or paste your SASS/SCSS code into the left editor</li>
                            <li class="mb-3"><strong>Auto-Compile:</strong> The CSS output appears automatically in the right editor as you type</li>
                            <li class="mb-3"><strong>Review Output:</strong> Check the compiled CSS and fix any errors if needed</li>
                            <li class="mb-3"><strong>Copy or Download:</strong> Copy the CSS to clipboard or download it as a file</li>
                            <li class="mb-3"><strong>Use Example:</strong> Click "Example" to load sample code for the current syntax mode</li>
                        </ol>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4"><i class="fas fa-info-circle me-2"></i>SASS vs SCSS</h2>
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><strong>SASS (Indented Syntax)</strong></h3>
                                <p>SASS uses indentation instead of braces and semicolons. It's more concise but requires strict indentation.</p>
                                <pre class="bg-light p-3 rounded"><code>.button
  background-color: #4CAF50
  color: white
  &:hover
    background-color: darken(#4CAF50, 10%)</code></pre>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><strong>SCSS (Sassy CSS)</strong></h3>
                                <p>SCSS uses braces and semicolons like CSS. It's more familiar to CSS developers and easier to learn.</p>
                                <pre class="bg-light p-3 rounded"><code>.button {
  background-color: #4CAF50;
  color: white;
  &:hover {
    background-color: darken(#4CAF50, 10%);
  }
}</code></pre>
                            </div>
                        </div>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4"><i class="fas fa-lightbulb me-2"></i>Use Cases</h2>
                        <ul>
                            <li class="mb-2">Compile SASS/SCSS files to CSS for web projects</li>
                            <li class="mb-2">Test SASS/SCSS syntax and see CSS output instantly</li>
                            <li class="mb-2">Learn SASS or SCSS by experimenting with different syntax features</li>
                            <li class="mb-2">Quick conversion of SASS/SCSS code snippets to CSS</li>
                            <li class="mb-2">Debug SASS/SCSS compilation errors with detailed error messages</li>
                            <li class="mb-2">Switch between SASS and SCSS syntax to compare and learn</li>
                        </ul>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4"><i class="fas fa-keyboard me-2"></i>Keyboard Shortcuts</h2>
                        <ul>
                            <li class="mb-2"><strong>Ctrl/Cmd + Enter:</strong> Force compile SASS/SCSS to CSS</li>
                            <li class="mb-2"><strong>Auto-compile:</strong> Compilation happens automatically 300ms after you stop typing</li>
                        </ul>
                    </section>
                    <?php $articlePrivacySlug = 'easy-sass'; include __DIR__ . '/../shared/article-privacy-section.php'; ?>


                    <section class="mb-5 text-center">
                        <div class="card bg-primary text-white">
                            <div class="card-body p-5">
                                <h2 class="h3 mb-3">Compile SASS/SCSS to CSS</h2>
                                <p class="mb-4">Use Easy SASS for all your SASS and SCSS compilation needs.</p>
                                <a href="../easy-sass/" class="btn btn-light btn-lg">
                                    <i class="fas fa-arrow-right me-2"></i>Use Easy SASS Tool
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


