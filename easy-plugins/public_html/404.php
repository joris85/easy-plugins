<?php
http_response_code(404);
$pageTitle = 'Page not found - Easy Plugins';
$metaDescription = 'This page does not exist. Browse the free Easy Plugins tools for images, text, CSV and more.';
include 'shared/header.php';
?>

    <div class="container text-center" style="padding: 4rem 1rem;">
        <h1 class="mb-3"><i class="fas fa-compass me-2"></i>Page not found</h1>
        <p class="text-muted mb-4">That page does not exist (anymore). These tools do:</p>
        <div class="d-flex flex-wrap gap-2 justify-content-center mb-4">
            <a href="/easy-image/" class="btn btn-primary">Easy Image</a>
            <a href="/easy-watermark/" class="btn btn-outline-secondary">Easy Watermark</a>
            <a href="/easy-png/" class="btn btn-outline-secondary">Easy PNG</a>
            <a href="/easy-image-rotate/" class="btn btn-outline-secondary">Easy Image Rotate</a>
            <a href="/easy-html/" class="btn btn-outline-secondary">Easy HTML</a>
            <a href="/easy-text-converter/" class="btn btn-outline-secondary">Easy Text</a>
            <a href="/easy-csv-converter/" class="btn btn-outline-secondary">Easy CSV</a>
            <a href="/easy-search-replace/" class="btn btn-outline-secondary">Easy Search &amp; Replace</a>
            <a href="/easy-pricing/" class="btn btn-outline-secondary">Easy Pricing</a>
        </div>
        <a href="/" class="btn btn-link">Back to the homepage</a>
    </div>

<?php include 'shared/footer.php'; ?>
