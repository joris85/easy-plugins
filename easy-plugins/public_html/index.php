<?php 
$pageTitle = 'Easy Plugins - Simple Tools for Everyone';
include 'shared/header.php'; 
?>
    
    <!-- Hero Section -->
    <div class="hero-section">
        <div class="container">
            <div class="row justify-content-center text-center">
                <div class="col-lg-8">
                    <h1 class="hero-title" data-translate="HOME_TITLE">
                        <i class="fas fa-puzzle-piece me-3"></i>
                        Easy Plugins
                    </h1>
                    <p class="hero-subtitle" data-translate="HOME_SUBTITLE">
                        Simple, powerful tools designed to make your work easier. 
                        No complex setup, no learning curve - just results.
                    </p>
                </div>
            </div>
        </div>
    </div>

    <!-- Plugins Section -->
    <div class="container">
        <div class="row g-5 mb-5">
            <!-- Row 1 -->
            <div class="col-lg-6">
                <a href="easy-image/index.php" class="text-decoration-none">
                    <div class="plugin-card">
                        <i class="fas fa-image plugin-icon" style="color: #667eea;"></i>
                        <h3 class="plugin-title" data-translate="PLUGIN_EASY_IMAGE_TITLE">Easy Image</h3>
                        <p class="plugin-description" data-translate="PLUGIN_EASY_IMAGE_DESC">
                            Professional image processing with resize, crop, effects, and optimization.
                        </p>
                    </div>
                </a>
            </div>
            
            <div class="col-lg-6">
                <a href="easy-pricing/index.php" class="text-decoration-none">
                    <div class="plugin-card">
                        <i class="fas fa-calculator plugin-icon" style="color: #28a745;"></i>
                        <h3 class="plugin-title" data-translate="PLUGIN_EASY_PRICING_TITLE">Easy Pricing</h3>
                        <p class="plugin-description" data-translate="PLUGIN_EASY_PRICING_DESC">
                            Calculate percentages, discounts, and VAT with ease.
                        </p>
                    </div>
                </a>
            </div>
            
            <!-- Row 2 -->
            <div class="col-lg-6">
                <a href="easy-html/index.php" class="text-decoration-none">
                    <div class="plugin-card">
                        <i class="fas fa-code plugin-icon" style="color: #dc3545;"></i>
                        <h3 class="plugin-title" data-translate="PLUGIN_EASY_HTML_TITLE">Easy HTML</h3>
                        <p class="plugin-description" data-translate="PLUGIN_EASY_HTML_DESC">
                            Clean and optimize your HTML code for better email client compatibility.
                        </p>
                    </div>
                </a>
            </div>
            
            <div class="col-lg-6">
                <a href="easy-text-converter/index.php" class="text-decoration-none">
                    <div class="plugin-card">
                        <i class="fas fa-text-width plugin-icon" style="color: #17a2b8;"></i>
                        <h3 class="plugin-title" data-translate="PLUGIN_EASY_TEXT_TITLE">Easy Text</h3>
                        <p class="plugin-description" data-translate="PLUGIN_EASY_TEXT_DESC">
                            Transform your text with powerful conversion tools and get instant statistics.
                        </p>
                    </div>
                </a>
            </div>
            
            <!-- Row 3 -->
            <div class="col-lg-6">
                <a href="easy-csv-converter/index.php" class="text-decoration-none">
                    <div class="plugin-card">
                        <i class="fas fa-file-csv plugin-icon" style="color: #4CAF50;"></i>
                        <h3 class="plugin-title" data-translate="PLUGIN_EASY_CSV_TITLE">Easy CSV</h3>
                        <p class="plugin-description" data-translate="PLUGIN_EASY_CSV_DESC">
                            Convert CSV delimiters, search & replace, and transform date formats with ease.
                        </p>
                    </div>
                </a>
            </div>
            
            <div class="col-lg-6">
                <a href="easy-search-replace/index.php" class="text-decoration-none">
                    <div class="plugin-card">
                        <i class="fas fa-search plugin-icon" style="color: #17a2b8;"></i>
                        <h3 class="plugin-title" data-translate="PLUGIN_EASY_SEARCH_TITLE">Easy Search & Replace</h3>
                        <p class="plugin-description" data-translate="PLUGIN_EASY_SEARCH_DESC">
                            Search and replace text patterns with regex support, truncate, prefix, and line numbering.
                        </p>
                    </div>
                </a>
            </div>
        </div>
        
    
    </div>

    <?php include 'shared/footer.php'; ?>