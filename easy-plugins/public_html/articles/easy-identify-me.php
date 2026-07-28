<?php 
$pageTitle = 'Easy Identify Me - System Information Tool | Easy Plugins';
$faviconPath = '../favicon.ico';
$cssPath = '../shared/master.css';
$themePath = '../shared/theme.js';
include '../shared/header.php'; 

$articleUrl = easyPluginsArticleUrl();
?>

<meta name="description" content="Easy Identify Me provides comprehensive system information including IP address, location, browser details, device information, and browser capabilities.">
<meta name="keywords" content="easy identify me, system information, ip address, browser info, device info, system tool">
<meta property="og:title" content="Easy Identify Me - System Information Tool">
<meta property="og:description" content="Get comprehensive system information including IP, location, browser, device, and capabilities with Easy Identify Me.">
<meta property="og:type" content="article">
<meta property="og:url" content="<?= $articleUrl ?>">
<link rel="canonical" href="<?= $articleUrl ?>">

<div class="container-fluid">
    <div class="container py-5">
        <div class="row mb-5">
            <div class="col-lg-8 mx-auto">
                <div class="d-flex align-items-center mb-4">
                    <i class="fas fa-id-card me-3" style="color: #6f42c1; font-size: 3rem;"></i>
                    <div>
                        <h1 class="display-4 mb-2">Easy Identify Me</h1>
                        <p class="text-muted lead">System Information Tool</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="row">
            <div class="col-lg-8 mx-auto">
                <article>
                    <section class="mb-5">
                        <p class="lead">
                            Easy Identify Me is a comprehensive system information tool that reveals details about your IP address, location, 
                            browser, device, and browser capabilities. Perfect for developers and tech enthusiasts.
                        </p>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4"><i class="fas fa-star me-2"></i>Key Features</h2>
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-network-wired me-2 text-primary"></i>IP Address Information</h3>
                                <p>Get your public IP address, location, ISP, and network information.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-globe me-2 text-primary"></i>Location Details</h3>
                                <p>View your approximate geographic location based on IP address.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-window-maximize me-2 text-primary"></i>Browser Information</h3>
                                <p>See detailed browser information including name, version, and user agent.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-mobile-alt me-2 text-primary"></i>Device Information</h3>
                                <p>Get device type, screen resolution, operating system, and hardware details.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-check-circle me-2 text-primary"></i>Browser Capabilities</h3>
                                <p>Check which features and APIs your browser supports.</p>
                            </div>
                        </div>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4"><i class="fas fa-question-circle me-2"></i>How to Use Easy Identify Me</h2>
                        <ol>
                            <li class="mb-3"><strong>Open Tool:</strong> Simply visit the Easy Identify Me page</li>
                            <li class="mb-3"><strong>View Information:</strong> All system information is displayed automatically</li>
                            <li class="mb-3"><strong>Explore Details:</strong> Browse through IP, location, browser, and device information</li>
                            <li class="mb-3"><strong>Copy Information:</strong> Copy any information you need for reference</li>
                        </ol>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4"><i class="fas fa-lightbulb me-2"></i>Use Cases</h2>
                        <ul>
                            <li class="mb-2">Check your public IP address and location</li>
                            <li class="mb-2">Verify browser and device information</li>
                            <li class="mb-2">Debug browser compatibility issues</li>
                            <li class="mb-2">Check browser capabilities for web development</li>
                            <li class="mb-2">Gather system information for troubleshooting</li>
                        </ul>
                    </section>
                    <?php $articlePrivacySlug = 'easy-identify-me'; include __DIR__ . '/../shared/article-privacy-section.php'; ?>


                    <section class="mb-5 text-center">
                        <div class="card bg-primary text-white">
                            <div class="card-body p-5">
                                <h2 class="h3 mb-3">Identify Your System</h2>
                                <p class="mb-4">Get comprehensive system information with Easy Identify Me.</p>
                                <a href="../easy-identify-me/" class="btn btn-light btn-lg">
                                    <i class="fas fa-arrow-right me-2"></i>Use Easy Identify Me Tool
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


