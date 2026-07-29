<?php 
$pageTitle = 'Articles - Easy Plugins Tools & Features';
$faviconPath = '../favicon.ico';
$cssPath = '../shared/master.css';
$themePath = '../shared/theme.js';
include '../shared/header.php'; 
?>

<!-- SEO Meta Tags -->
<meta name="description" content="Discover all Easy Plugins tools with detailed articles covering features, use cases, and how-to guides for image processing, text conversion, HTML cleaning, and more.">
<meta name="keywords" content="easy plugins, web tools, image tools, text tools, online tools, free tools, image processing, text conversion">
<meta property="og:title" content="Articles - Easy Plugins Tools & Features">
<meta property="og:description" content="Discover all Easy Plugins tools with detailed articles covering features, use cases, and how-to guides.">
<meta property="og:type" content="website">
<meta property="og:url" content="<?= easyPluginsArticleUrl() ?>">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Articles - Easy Plugins Tools & Features">
<meta name="twitter:description" content="Discover all Easy Plugins tools with detailed articles covering features, use cases, and how-to guides.">
<link rel="canonical" href="<?= easyPluginsArticleUrl() ?>">

<!-- Structured Data -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Blog",
  "name": "Easy Plugins Articles",
  "description": "Articles and guides for Easy Plugins tools",
  "url": "<?= 'https://' . $_SERVER['HTTP_HOST'] . '/articles/' ?>",
  "publisher": {
    "@type": "Organization",
    "name": "Easy Plugins"
  }
}
</script>

<div class="container-fluid">
    <div class="container">
        <!-- Hero Section -->
        <div class="hero-section py-5 mb-5">
            <div class="text-center">
                <h1 class="display-4 mb-3">
                    <i class="fas fa-newspaper me-3"></i>Articles
                </h1>
                <p class="lead text-muted">
                    Learn about all our tools, features, and how to use them effectively
                </p>
            </div>
        </div>

        <!-- Articles Grid -->
        <div class="row g-4 mb-5">
            <!-- Easy Image -->
            <div class="col-lg-6 col-md-6">
                <article class="article-card card h-100 shadow-sm">
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-3">
                            <i class="fas fa-image article-icon me-3" style="color: #667eea; font-size: 2rem;"></i>
                            <h2 class="card-title h4 mb-0">Easy Image</h2>
                        </div>
                        <p class="card-text text-muted">
                            Professional image processing tool with resize, crop, effects, and optimization features. Perfect for photographers, designers, and content creators who need powerful image editing capabilities without complex software.
                        </p>
                        <a href="easy-image" class="btn btn-primary">
                            Read More <i class="fas fa-arrow-right ms-2"></i>
                        </a>
                    </div>
                </article>
            </div>

            <!-- Easy PNG -->
            <div class="col-lg-6 col-md-6">
                <article class="article-card card h-100 shadow-sm">
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-3">
                            <i class="fas fa-file-image article-icon me-3" style="color: #4CAF50; font-size: 2rem;"></i>
                            <h2 class="card-title h4 mb-0">Easy PNG</h2>
                        </div>
                        <p class="card-text text-muted">
                            Add solid or gradient backgrounds to PNG and WebP images with real-time preview. Transform transparent images into beautiful designs with customizable background colors and gradients.
                        </p>
                        <a href="easy-png" class="btn btn-primary">
                            Read More <i class="fas fa-arrow-right ms-2"></i>
                        </a>
                    </div>
                </article>
            </div>

            <!-- Easy Watermark -->
            <div class="col-lg-6 col-md-6">
                <article class="article-card card h-100 shadow-sm">
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-3">
                            <i class="fas fa-tint article-icon me-3" style="color: #4CAF50; font-size: 2rem;"></i>
                            <h2 class="card-title h4 mb-0">Easy Watermark</h2>
                        </div>
                        <p class="card-text text-muted">
                            Add watermarks to your images with drag-and-drop positioning, opacity control, and rotation. Protect your images with text or image watermarks, perfect for photographers and content creators.
                        </p>
                        <a href="easy-watermark" class="btn btn-primary">
                            Read More <i class="fas fa-arrow-right ms-2"></i>
                        </a>
                    </div>
                </article>
            </div>

            <!-- Easy HTML -->
            <div class="col-lg-6 col-md-6">
                <article class="article-card card h-100 shadow-sm">
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-3">
                            <i class="fas fa-code article-icon me-3" style="color: #dc3545; font-size: 2rem;"></i>
                            <h2 class="card-title h4 mb-0">Easy HTML</h2>
                        </div>
                        <p class="card-text text-muted">
                            Clean and optimize your HTML code for better email client compatibility. Remove unnecessary code, fix formatting issues, and ensure your HTML works perfectly across all email clients.
                        </p>
                        <a href="easy-html" class="btn btn-primary">
                            Read More <i class="fas fa-arrow-right ms-2"></i>
                        </a>
                    </div>
                </article>
            </div>

            <!-- Easy Pricing -->
            <div class="col-lg-6 col-md-6">
                <article class="article-card card h-100 shadow-sm">
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-3">
                            <i class="fas fa-calculator article-icon me-3" style="color: #28a745; font-size: 2rem;"></i>
                            <h2 class="card-title h4 mb-0">Easy Pricing</h2>
                        </div>
                        <p class="card-text text-muted">
                            Calculate percentages, discounts, and VAT with ease. Perfect for businesses, freelancers, and anyone who needs quick and accurate pricing calculations without complex spreadsheets.
                        </p>
                        <a href="easy-pricing" class="btn btn-primary">
                            Read More <i class="fas fa-arrow-right ms-2"></i>
                        </a>
                    </div>
                </article>
            </div>

            <!-- Easy Text Converter -->
            <div class="col-lg-6 col-md-6">
                <article class="article-card card h-100 shadow-sm">
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-3">
                            <i class="fas fa-text-width article-icon me-3" style="color: #17a2b8; font-size: 2rem;"></i>
                            <h2 class="card-title h4 mb-0">Easy Text Converter</h2>
                        </div>
                        <p class="card-text text-muted">
                            Transform your text with powerful conversion tools and get instant statistics. Convert between cases, encode/decode, count words, and analyze your text with comprehensive statistics.
                        </p>
                        <a href="easy-text-converter" class="btn btn-primary">
                            Read More <i class="fas fa-arrow-right ms-2"></i>
                        </a>
                    </div>
                </article>
            </div>

            <!-- Easy CSV Converter -->
            <div class="col-lg-6 col-md-6">
                <article class="article-card card h-100 shadow-sm">
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-3">
                            <i class="fas fa-file-csv article-icon me-3" style="color: #4CAF50; font-size: 2rem;"></i>
                            <h2 class="card-title h4 mb-0">Easy CSV Converter</h2>
                        </div>
                        <p class="card-text text-muted">
                            Convert CSV delimiters, search & replace, and transform date formats with ease. Handle CSV files from different sources and convert them to your preferred format quickly and accurately.
                        </p>
                        <a href="easy-csv-converter" class="btn btn-primary">
                            Read More <i class="fas fa-arrow-right ms-2"></i>
                        </a>
                    </div>
                </article>
            </div>

            <!-- Easy Search & Replace -->
            <div class="col-lg-6 col-md-6">
                <article class="article-card card h-100 shadow-sm">
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-3">
                            <i class="fas fa-search article-icon me-3" style="color: #17a2b8; font-size: 2rem;"></i>
                            <h2 class="card-title h4 mb-0">Easy Search & Replace</h2>
                        </div>
                        <p class="card-text text-muted">
                            Search and replace text patterns with regex support, truncate, prefix, and line numbering. Powerful text manipulation tool for developers, writers, and data processors.
                        </p>
                        <a href="easy-search-replace" class="btn btn-primary">
                            Read More <i class="fas fa-arrow-right ms-2"></i>
                        </a>
                    </div>
                </article>
            </div>

            <!-- Easy Identify Me -->
            <div class="col-lg-6 col-md-6">
                <article class="article-card card h-100 shadow-sm">
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-3">
                            <i class="fas fa-id-card article-icon me-3" style="color: #6f42c1; font-size: 2rem;"></i>
                            <h2 class="card-title h4 mb-0">Easy Identify Me</h2>
                        </div>
                        <p class="card-text text-muted">
                            Get comprehensive system information including IP address, location, browser details, device information, and browser capabilities. Perfect for developers and tech enthusiasts.
                        </p>
                        <a href="easy-identify-me" class="btn btn-primary">
                            Read More <i class="fas fa-arrow-right ms-2"></i>
                        </a>
                    </div>
                </article>
            </div>

            <!-- Easy Image Rotate -->
            <div class="col-lg-6 col-md-6">
                <article class="article-card card h-100 shadow-sm">
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-3">
                            <i class="fas fa-redo article-icon me-3" style="color: #667eea; font-size: 2rem;"></i>
                            <h2 class="card-title h4 mb-0">Easy Image Rotate</h2>
                        </div>
                        <p class="card-text text-muted">
                            Rotate images in your browser with real-time preview. Fix photo orientation instantly without uploading to a server.
                        </p>
                        <a href="easy-image-rotate" class="btn btn-primary">
                            Read More <i class="fas fa-arrow-right ms-2"></i>
                        </a>
                    </div>
                </article>
            </div>

            <!-- Easy Less -->
            <div class="col-lg-6 col-md-6">
                <article class="article-card card h-100 shadow-sm">
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-3">
                            <i class="fas fa-file-code article-icon me-3" style="color: #1e88e5; font-size: 2rem;"></i>
                            <h2 class="card-title h4 mb-0">Easy Less</h2>
                        </div>
                        <p class="card-text text-muted">
                            Compile LESS syntax to CSS in your browser with real-time compilation, syntax highlighting, and error detection.
                        </p>
                        <a href="easy-less" class="btn btn-primary">
                            Read More <i class="fas fa-arrow-right ms-2"></i>
                        </a>
                    </div>
                </article>
            </div>

            <!-- Easy SASS -->
            <div class="col-lg-6 col-md-6">
                <article class="article-card card h-100 shadow-sm">
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-3">
                            <i class="fas fa-code article-icon me-3" style="color: #bf4080; font-size: 2rem;"></i>
                            <h2 class="card-title h4 mb-0">Easy SASS</h2>
                        </div>
                        <p class="card-text text-muted">
                            Compile SASS/SCSS to CSS in your browser. Supports both indented SASS and SCSS syntax with instant output.
                        </p>
                        <a href="easy-sass" class="btn btn-primary">
                            Read More <i class="fas fa-arrow-right ms-2"></i>
                        </a>
                    </div>
                </article>
            </div>

        </div>
    </div>
</div>

<style>
.article-card {
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    border: none;
}

.article-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
}

.article-icon {
    flex-shrink: 0;
}
</style>

<?php include '../shared/footer.php'; ?>


