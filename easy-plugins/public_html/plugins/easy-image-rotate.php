<?php 
$pageTitle = 'Easy Image Rotate - Rotate Images Online | Easy Plugins';
$faviconPath = '../favicon.ico';
$cssPath = '../shared/master.css';
$themePath = '../shared/theme.js';
include '../shared/header.php'; 

$articleUrl = easyPluginsArticleUrl();
?>

<meta name="description" content="Easy Image Rotate lets you rotate images in your browser with real-time preview. Free online tool for JPG, PNG, WebP, and GIF — no upload to server required.">
<meta name="keywords" content="rotate image, image rotation, rotate photo online, easy image rotate, flip image">
<meta property="og:title" content="Easy Image Rotate - Rotate Images Online">
<meta property="og:description" content="Rotate images with real-time preview in your browser. Free, private, and instant.">
<meta property="og:type" content="article">
<meta property="og:url" content="<?= $articleUrl ?>">
<link rel="canonical" href="<?= $articleUrl ?>">

<div class="container-fluid">
    <div class="container py-5">
        <div class="row mb-5">
            <div class="col-lg-8 mx-auto">
                <div class="d-flex align-items-center mb-4">
                    <img src="/brand/tools/easy-image-rotate.svg" alt="" width="58" height="58" class="me-3">
                    <div>
                        <h1 class="display-4 mb-2">Easy Image Rotate</h1>
                        <p class="text-muted lead">Rotate Images with Real-Time Preview</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="row">
            <div class="col-lg-8 mx-auto">
                <article>
                    <section class="mb-5">
                        <p class="lead">
                            Easy Image Rotate is a simple browser-based tool for rotating images by 90°, 180°, or custom angles.
                            See the result instantly in the preview panel and download the rotated image — all processing happens locally in your browser.
                        </p>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4"><i class="fas fa-star me-2"></i>Key Features</h2>
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-redo me-2 text-primary"></i>Quick Rotation</h3>
                                <p>Rotate left or right by 90° with one click, or set a custom angle with the slider.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-eye me-2 text-primary"></i>Live Preview</h3>
                                <p>Watch your image update in real time as you adjust the rotation angle.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-shield-alt me-2 text-primary"></i>100% Private</h3>
                                <p>Images never leave your device. No server upload, no storage, no tracking.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-download me-2 text-primary"></i>Download Result</h3>
                                <p>Export the rotated image in PNG format with one click.</p>
                            </div>
                        </div>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4"><i class="fas fa-question-circle me-2"></i>How to Use Easy Image Rotate</h2>
                        <ol>
                            <li class="mb-3"><strong>Upload:</strong> Drag and drop or select a JPG, PNG, WebP, or GIF image</li>
                            <li class="mb-3"><strong>Rotate:</strong> Use the rotation buttons or angle slider to adjust orientation</li>
                            <li class="mb-3"><strong>Preview:</strong> Check the live preview on the right</li>
                            <li class="mb-3"><strong>Download:</strong> Save the rotated image to your computer</li>
                        </ol>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4"><i class="fas fa-lightbulb me-2"></i>Use Cases</h2>
                        <ul>
                            <li class="mb-2">Fix photos taken in the wrong orientation on your phone</li>
                            <li class="mb-2">Prepare images for documents or presentations</li>
                            <li class="mb-2">Correct scanned document alignment</li>
                            <li class="mb-2">Quick rotation before uploading to social media</li>
                        </ul>
                    </section>
                    <?php $articleFaqSlug = 'easy-image-rotate'; include __DIR__ . '/../shared/article-faq-section.php'; ?>
                    <?php $articlePrivacySlug = 'easy-image-rotate'; include __DIR__ . '/../shared/article-privacy-section.php'; ?>


                    <section class="mb-5 text-center">
                        <div class="card bg-primary text-white">
                            <div class="card-body p-5">
                                <h2 class="h3 mb-3">Try Easy Image Rotate Now</h2>
                                <p class="mb-4">Rotate your images instantly in the browser.</p>
                                <a href="../easy-image-rotate/" class="btn btn-light btn-lg">
                                    <i class="fas fa-arrow-right me-2"></i>Use Easy Image Rotate Tool
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
