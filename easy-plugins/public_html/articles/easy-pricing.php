<?php 
$pageTitle = 'Easy Pricing - Calculate Percentages, Discounts & VAT | Easy Plugins';
$faviconPath = '../favicon.ico';
$cssPath = '../shared/master.css';
$themePath = '../shared/theme.js';
include '../shared/header.php'; 

$articleUrl = easyPluginsArticleUrl();
?>

<meta name="description" content="Easy Pricing calculates percentages, discounts, VAT, and pricing with ease. Free online pricing calculator for businesses and freelancers.">
<meta name="keywords" content="easy pricing, percentage calculator, discount calculator, vat calculator, pricing tool, percentage tool">
<meta property="og:title" content="Easy Pricing - Calculate Percentages, Discounts & VAT">
<meta property="og:description" content="Calculate percentages, discounts, and VAT with Easy Pricing. Free online pricing calculator.">
<meta property="og:type" content="article">
<meta property="og:url" content="<?= $articleUrl ?>">
<link rel="canonical" href="<?= $articleUrl ?>">

<div class="container-fluid">
    <div class="container py-5">
        <div class="row mb-5">
            <div class="col-lg-8 mx-auto">
                <div class="d-flex align-items-center mb-4">
                    <i class="fas fa-calculator me-3" style="color: #28a745; font-size: 3rem;"></i>
                    <div>
                        <h1 class="display-4 mb-2">Easy Pricing</h1>
                        <p class="text-muted lead">Calculate Percentages, Discounts & VAT</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="row">
            <div class="col-lg-8 mx-auto">
                <article>
                    <section class="mb-5">
                        <p class="lead">
                            Easy Pricing is a comprehensive pricing calculator that helps you calculate percentages, discounts, VAT, and price changes 
                            quickly and accurately. Perfect for businesses, freelancers, and anyone who needs quick pricing calculations.
                        </p>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4"><i class="fas fa-star me-2"></i>Key Features</h2>
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-percent me-2 text-primary"></i>Percentage Calculations</h3>
                                <p>Calculate what percentage one number is of another, or find a percentage of a given value.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-tag me-2 text-primary"></i>Discount Calculator</h3>
                                <p>Calculate discounts, sale prices, and savings with ease. Perfect for pricing products and services.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-receipt me-2 text-primary"></i>VAT Calculator</h3>
                                <p>Add or remove VAT from prices. Calculate VAT amounts and net/gross prices accurately.</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <h3 class="h5"><i class="fas fa-chart-line me-2 text-primary"></i>Price Changes</h3>
                                <p>Calculate price increases or decreases as percentages. Track price changes and differences.</p>
                            </div>
                        </div>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4"><i class="fas fa-question-circle me-2"></i>How to Use Easy Pricing</h2>
                        <ol>
                            <li class="mb-3"><strong>Select Calculation Type:</strong> Choose from percentage, discount, VAT, or price change calculations</li>
                            <li class="mb-3"><strong>Enter Values:</strong> Input the required numbers in the calculation fields</li>
                            <li class="mb-3"><strong>Calculate:</strong> Get instant results with clear explanations</li>
                            <li class="mb-3"><strong>Copy Results:</strong> Copy calculations for use in documents or spreadsheets</li>
                        </ol>
                    </section>

                    <section class="mb-5">
                        <h2 class="h3 mb-4"><i class="fas fa-lightbulb me-2"></i>Use Cases</h2>
                        <ul>
                            <li class="mb-2">Calculate discounts for sales and promotions</li>
                            <li class="mb-2">Add or remove VAT from invoices</li>
                            <li class="mb-2">Calculate percentage increases or decreases</li>
                            <li class="mb-2">Determine commission percentages</li>
                            <li class="mb-2">Calculate markup and margin percentages</li>
                        </ul>
                    </section>
                    <?php $articlePrivacySlug = 'easy-pricing'; include __DIR__ . '/../shared/article-privacy-section.php'; ?>


                    <section class="mb-5 text-center">
                        <div class="card bg-primary text-white">
                            <div class="card-body p-5">
                                <h2 class="h3 mb-3">Calculate Prices Easily</h2>
                                <p class="mb-4">Use Easy Pricing for quick and accurate pricing calculations.</p>
                                <a href="../easy-pricing/" class="btn btn-light btn-lg">
                                    <i class="fas fa-arrow-right me-2"></i>Use Easy Pricing Tool
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


