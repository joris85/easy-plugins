<?php 
$pageTitle = 'Easy Pricing - Calculate Tools';
$metaDescription = 'Free calculators for percentages, discounts and VAT. Quick and accurate pricing sums for shops, freelancers and businesses.';
$canonicalPath = '/easy-pricing/';
include '../shared/header.php'; 
?>
    
    <div class="container-fluid bg-gradient">
        <div class="container tool-page-inner">
            <?php $toolInfoSlug = 'easy-pricing'; include __DIR__ . '/../shared/tool-info-bar.php'; ?>

            <!-- Navigation Tabs -->
            <div class="row justify-content-center mb-4">
                <div class="col-lg-8">
                    <ul class="nav nav-pills justify-content-center calculator-nav" id="calculatorTabs" role="tablist">
                        <li class="nav-item" role="presentation">
                            <button class="btn btn-outline-info active" id="percentages-tab" data-bs-toggle="pill" data-bs-target="#percentages" type="button" role="tab" onclick="updateURL('percentages')">
                                <i class="fas fa-percentage me-2"></i><span id="tab-percentages" data-translate="TAB_PERCENTAGES">Percentages</span>
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="btn btn-outline-info" id="kortingen-tab" data-bs-toggle="pill" data-bs-target="#kortingen" type="button" role="tab" onclick="updateURL('kortingen')">
                                <i class="fas fa-tags me-2"></i><span id="tab-discounts" data-translate="TAB_DISCOUNTS">Kortingen</span>
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="btn btn-outline-info" id="btw-tab" data-bs-toggle="pill" data-bs-target="#btw" type="button" role="tab" onclick="updateURL('btw')">
                                <i class="fas fa-receipt me-2"></i><span id="tab-vat" data-translate="TAB_VAT">BTW</span>
                            </button>
                        </li>
                    </ul>
                </div>
            </div>

            <!-- Tab Content -->
            <div class="tab-content" id="calculatorTabContent">
                <!-- Percentages Section -->
                <div class="tab-pane fade show active" id="percentages" role="tabpanel">

            <!-- Calculator Cards -->
            <div class="row g-4">
                <!-- Calculator 1: Neem een percentage van een getal -->
                <div class="col-lg-6">
                    <div class="card calculator-card h-100">
                        <div class="card-header bg-primary text-white">
                            <h5 class="card-title mb-0">
                                <i class="fas fa-calculator me-2"></i>
                                <span data-translate="CALC_1_TITLE">Neem een percentage van een getal</span>
                            </h5>
                        </div>
                        <div class="card-body">
                            <form id="calculator1">
                                <div class="mb-3">
                                    <label for="percent1" class="form-label" data-translate="PERCENTAGE_LABEL">Percentage (%)</label>
                                    <input type="number" class="form-control" id="percent1" value="10" step="0.01" min="0" max="100">
                                </div>
                                <div class="mb-3">
                                    <label for="amount1" class="form-label" data-translate="AMOUNT_LABEL">Van welk bedrag</label>
                                    <input type="number" class="form-control" id="amount1" value="2000" step="0.01" min="0">
                                </div>
                                <button type="submit" class="btn btn-primary w-100">
                                    <i class="fas fa-calculate me-2"></i><span data-translate="CALCULATE_BUTTON">Berekenen</span>
                                </button>
                                <div id="result1" class="mt-3 p-3 bg-light rounded result-display" style="display: none;">
                                    <strong data-translate="RESULT_LABEL">Resultaat:</strong> <span id="result1-text"></span>
                                    <div id="result1-additional" class="mt-2" style="display: none;">
                                        <div>
                                            <strong data-translate="ADDED_LABEL">Opgeteld:</strong> <span id="result1-added-text"></span>
                                        </div>
                                        <div>
                                            <strong data-translate="SUBTRACTED_LABEL">Afgetrokken:</strong> <span id="result1-subtracted-text"></span>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <!-- Calculator 2: Welk percentage is een getal -->
                <div class="col-lg-6">
                    <div class="card calculator-card h-100">
                        <div class="card-header bg-success text-white">
                            <h5 class="card-title mb-0">
                                <i class="fas fa-percentage me-2"></i>
                                <span data-translate="CALC_2_TITLE">Welk percentage is een getal?</span>
                            </h5>
                        </div>
                        <div class="card-body">
                            <form id="calculator2">
                                <div class="mb-3">
                                    <label for="amount2a" class="form-label" data-translate="AMOUNT_A_LABEL">Bedrag</label>
                                    <input type="number" class="form-control" id="amount2a" value="50" step="0.01" min="0">
                                </div>
                                <div class="mb-3">
                                    <label for="amount2b" class="form-label" data-translate="AMOUNT_B_LABEL">Van welk totaal</label>
                                    <input type="number" class="form-control" id="amount2b" value="1000" step="0.01" min="0">
                                </div>
                                <button type="submit" class="btn btn-success w-100">
                                    <i class="fas fa-calculate me-2"></i><span data-translate="CALCULATE_BUTTON">Berekenen</span>
                                </button>
                                <div id="result2" class="mt-3 p-3 bg-light rounded result-display" style="display: none;">
                                    <strong>Resultaat:</strong> <span id="result2-text"></span>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <!-- Calculator 3: Verhoging / Verlaging -->
                <div class="col-lg-6">
                    <div class="card calculator-card h-100">
                        <div class="card-header bg-warning text-dark">
                            <h5 class="card-title mb-0">
                                <i class="fas fa-chart-line me-2"></i>
                                <span data-translate="CALC_3_TITLE">Verhoging / Verlaging</span>
                            </h5>
                        </div>
                        <div class="card-body">
                            <form id="calculator3">
                                <div class="mb-3">
                                    <label for="amount3" class="form-label" data-translate="START_AMOUNT_LABEL">Startbedrag</label>
                                    <input type="number" class="form-control" id="amount3" value="2000" step="0.01" min="0">
                                </div>
                                <div class="mb-3">
                                    <label for="percent3" class="form-label" data-translate="PERCENTAGE_LABEL">Percentage (%)</label>
                                    <input type="number" class="form-control" id="percent3" value="10" step="0.01" min="0" max="100">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label" data-translate="OPERATION_LABEL">Bewerking</label>
                                    <select class="form-select" id="operation3">
                                        <option value="plus" data-translate="PLUS_OPTION">Plus (+)</option>
                                        <option value="minus" data-translate="MINUS_OPTION">Minus (-)</option>
                                    </select>
                                </div>
                                <button type="submit" class="btn btn-warning w-100">
                                    <i class="fas fa-calculate me-2"></i><span data-translate="CALCULATE_BUTTON">Berekenen</span>
                                </button>
                                <div id="result3" class="mt-3 p-3 bg-light rounded result-display" style="display: none;">
                                    <strong>Resultaat:</strong> <span id="result3-text"></span>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <!-- Calculator 4: Percentage verschil -->
                <div class="col-lg-6">
                    <div class="card calculator-card h-100">
                        <div class="card-header bg-info text-white">
                            <h5 class="card-title mb-0">
                                <i class="fas fa-exchange-alt me-2"></i>
                                <span data-translate="CALC_4_TITLE">Percentage verschil</span>
                            </h5>
                        </div>
                        <div class="card-body">
                            <form id="calculator4">
                                <div class="mb-3">
                                    <label for="amount4a" class="form-label" data-translate="FIRST_VALUE_LABEL">Eerste waarde</label>
                                    <input type="number" class="form-control" id="amount4a" value="1000" step="0.01" min="0">
                                </div>
                                <div class="mb-3">
                                    <label for="amount4b" class="form-label" data-translate="SECOND_VALUE_LABEL">Tweede waarde</label>
                                    <input type="number" class="form-control" id="amount4b" value="1200" step="0.01" min="0">
                                </div>
                                <button type="submit" class="btn btn-info w-100">
                                    <i class="fas fa-calculate me-2"></i><span data-translate="CALCULATE_BUTTON">Berekenen</span>
                                </button>
                                <div id="result4" class="mt-3 p-3 bg-light rounded result-display" style="display: none;">
                                    <strong>Resultaat:</strong> <span id="result4-text"></span>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

                    <!-- Information Section -->
                    <div class="row mt-5">
                        <div class="col-lg-8 mx-auto">
                            <div class="card">
                                <div class="card-header bg-dark text-white">
                                    <h5 class="card-title mb-0">
                                        <i class="fas fa-info-circle me-2"></i>
                                        <span data-translate="INFO_PERCENTAGES_TITLE">Hoe werken percentage berekeningen?</span>
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <h6><i class="fas fa-calculator text-primary me-2"></i><span data-translate="FORMULA_PERCENTAGE_TITLE">Formule voor percentage berekenen:</span></h6>
                                            <p><code data-translate="FORMULA_PERCENTAGE">percentage = (deelbedrag / geheelbedrag) × 100</code></p>
                                            
                                            <h6><i class="fas fa-chart-line text-success me-2"></i><span data-translate="EXAMPLE_1_TITLE">Voorbeeld 1:</span></h6>
                                            <p><span data-translate="EXAMPLE_1_TEXT">Wat is 10% van €2000?</span><br>
                                            <strong><span data-translate="RESULT_LABEL">Antwoord:</span></strong> <span data-translate="EXAMPLE_1_ANSWER">€200</span></p>
                                        </div>
                                        <div class="col-md-6">
                                            <h6><i class="fas fa-percentage text-warning me-2"></i><span data-translate="FORMULA_PERCENTAGE_DIFF_TITLE">Formule voor percentage verschil:</span></h6>
                                            <p><code data-translate="FORMULA_PERCENTAGE_DIFF">verschil (%) = ((nieuw - oud) / oud) × 100</code></p>
                                            
                                            <h6><i class="fas fa-exchange-alt text-info me-2"></i><span data-translate="EXAMPLE_2_TITLE">Voorbeeld 2:</span></h6>
                                            <p><span data-translate="EXAMPLE_2_TEXT">€50 is welk percentage van €1000?</span><br>
                                            <strong><span data-translate="RESULT_LABEL">Antwoord:</span></strong> <span data-translate="EXAMPLE_2_ANSWER">5%</span></p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Kortingen Section -->
                <div class="tab-pane fade" id="kortingen" role="tabpanel">
                    <div class="row g-4">
                        <!-- Korting Calculator -->
                        <div class="col-lg-8 mx-auto">
                            <div class="card calculator-card">
                                <div class="card-header bg-danger text-white">
                                    <h5 class="card-title mb-0">
                                        <i class="fas fa-tags me-2"></i>
                                        <span data-translate="DISCOUNT_CALC_TITLE">Korting Berekenen</span>
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <form id="korting-calculator">
                                        <div class="mb-3">
                                            <label for="original-price" class="form-label" data-translate="ORIGINAL_PRICE_LABEL">Originele prijs (€)</label>
                                            <input type="number" class="form-control" id="original-price" value="100" step="0.01" min="0">
                                        </div>
                                        <div class="mb-3">
                                            <label class="form-label" data-translate="DISCOUNT_TYPE_LABEL">Korting type:</label>
                                            <div class="form-check">
                                                <input class="form-check-input" type="radio" name="discount-type" id="discount-percent-type" value="percent" checked>
                                                <label class="form-check-label" for="discount-percent-type" data-translate="PERCENTAGE_OPTION">
                                                    Percentage (%)
                                                </label>
                                            </div>
                                            <div class="form-check">
                                                <input class="form-check-input" type="radio" name="discount-type" id="discount-amount-type" value="amount">
                                                <label class="form-check-label" for="discount-amount-type" data-translate="AMOUNT_OPTION">
                                                    Vast bedrag (€)
                                                </label>
                                            </div>
                                        </div>
                                        <div class="mb-3" id="discount-percent-group">
                                            <label for="discount-percent" class="form-label" data-translate="DISCOUNT_PERCENT_LABEL">Kortingspercentage (%)</label>
                                            <input type="number" class="form-control" id="discount-percent" value="20" step="0.01" min="0" max="100">
                                        </div>
                                        <div class="mb-3" id="discount-amount-group" style="display: none;">
                                            <label for="discount-amount" class="form-label" data-translate="DISCOUNT_AMOUNT_LABEL">Kortingsbedrag (€)</label>
                                            <input type="number" class="form-control" id="discount-amount" value="20" step="0.01" min="0">
                                        </div>
                                        <button type="submit" class="btn btn-danger w-100">
                                            <i class="fas fa-calculate me-2"></i><span data-translate="CALCULATE_DISCOUNT_BUTTON">Bereken Korting</span>
                                        </button>
                                        <div id="korting-result" class="mt-3 p-3 bg-light rounded result-display" style="display: none;">
                                            <strong>Resultaat:</strong> <span id="korting-result-text"></span>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Korting Information -->
                    <div class="row mt-5">
                        <div class="col-lg-8 mx-auto">
                            <div class="card">
                                <div class="card-header bg-dark text-white">
                                    <h5 class="card-title mb-0">
                                        <i class="fas fa-info-circle me-2"></i>
                                        <span data-translate="DISCOUNT_INFO_TITLE">Hoe werkt korting berekenen?</span>
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <h6><i class="fas fa-tags text-danger me-2"></i><span data-translate="DISCOUNT_FORMULA_TITLE">Formules voor korting:</span></h6>
                                            <p><strong><span data-translate="DISCOUNT_TYPE_PERCENT">Percentage korting:</span></strong><br>
                                            <code data-translate="DISCOUNT_FORMULA_PERCENT">korting = originele prijs × (percentage / 100)</code></p>
                                            <p><strong><span data-translate="DISCOUNT_TYPE_AMOUNT">Vast bedrag korting:</span></strong><br>
                                            <code data-translate="DISCOUNT_FORMULA_AMOUNT">nieuwe prijs = originele prijs - kortingsbedrag</code></p>
                                            
                                            <h6><i class="fas fa-chart-line text-success me-2"></i><span data-translate="EXAMPLE_1_TITLE">Voorbeelden:</span></h6>
                                            <p><strong>€100 met 20% korting:</strong><br>
                                            Korting: €20, Nieuwe prijs: €80</p>
                                            <p><strong>€100 met €15 korting:</strong><br>
                                            Korting: €15, Nieuwe prijs: €85</p>
                                        </div>
                                        <div class="col-md-6">
                                            <h6><i class="fas fa-percentage text-warning me-2"></i>Korting berekenen:</h6>
                                            <p>Korting berekenen is handig voor:</p>
                                            <ul>
                                                <li>Sale acties</li>
                                                <li>Promoties</li>
                                                <li>Loyaliteitskortingen</li>
                                                <li>Bulk kortingen</li>
                                                <li>Vaste kortingsbedragen</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- BTW Section -->
                <div class="tab-pane fade" id="btw" role="tabpanel">
                    <div class="row g-4">
                        <!-- BTW Calculator -->
                        <div class="col-lg-8 mx-auto">
                            <div class="card calculator-card">
                                <div class="card-header bg-secondary text-white">
                                    <h5 class="card-title mb-0">
                                        <i class="fas fa-receipt me-2"></i>
                                        <span data-translate="VAT_CALC_TITLE">BTW Berekenen</span>
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <form id="btw-calculator">
                                        <div class="mb-3">
                                            <label for="btw-amount" class="form-label" data-translate="VAT_AMOUNT_LABEL">Bedrag (€)</label>
                                            <input type="number" class="form-control" id="btw-amount" value="100" step="0.01" min="0">
                                        </div>
                                        <div class="mb-3">
                                            <label for="btw-rate" class="form-label" data-translate="VAT_RATE_LABEL">BTW Tarief</label>
                                            <select class="form-select" id="btw-rate">
                                                <option value="21">21%</option>
                                                <option value="9">9%</option>
                                                <option value="0">0%</option>
                                                <option value="1">1%</option>
                                                <option value="2">2%</option>
                                                <option value="3">3%</option>
                                                <option value="4">4%</option>
                                                <option value="5">5%</option>
                                                <option value="6">6%</option>
                                                <option value="7">7%</option>
                                                <option value="8">8%</option>
                                                <option value="10">10%</option>
                                                <option value="11">11%</option>
                                                <option value="12">12%</option>
                                                <option value="13">13%</option>
                                                <option value="14">14%</option>
                                                <option value="15">15%</option>
                                                <option value="16">16%</option>
                                                <option value="17">17%</option>
                                                <option value="18">18%</option>
                                                <option value="19">19%</option>
                                                <option value="20">20%</option>
                                                <option value="22">22%</option>
                                                <option value="23">23%</option>
                                                <option value="24">24%</option>
                                                <option value="25">25%</option>
                                                <option value="26">26%</option>
                                                <option value="27">27%</option>
                                            </select>
                                        </div>
                                        <div class="mb-3">
                                            <label class="form-label" data-translate="VAT_TYPE_LABEL">Bedrag is:</label>
                                            <div class="form-check">
                                                <input class="form-check-input" type="radio" name="btw-type" id="btw-inclusive" value="inclusive" checked>
                                                <label class="form-check-label" for="btw-inclusive" data-translate="VAT_INCLUSIVE">
                                                    Inclusief BTW
                                                </label>
                                            </div>
                                            <div class="form-check">
                                                <input class="form-check-input" type="radio" name="btw-type" id="btw-exclusive" value="exclusive">
                                                <label class="form-check-label" for="btw-exclusive" data-translate="VAT_EXCLUSIVE">
                                                    Exclusief BTW
                                                </label>
                                            </div>
                                        </div>
                                        <button type="submit" class="btn btn-secondary w-100">
                                            <i class="fas fa-calculate me-2"></i><span data-translate="CALCULATE_VAT_BUTTON">Bereken BTW</span>
                                        </button>
                                        <div id="btw-result" class="mt-3 p-3 bg-light rounded result-display" style="display: none;">
                                            <strong>Resultaat:</strong> <span id="btw-result-text"></span>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- BTW Information -->
                    <div class="row mt-5">
                        <div class="col-lg-8 mx-auto">
                            <div class="card">
                                <div class="card-header bg-dark text-white">
                                    <h5 class="card-title mb-0">
                                        <i class="fas fa-info-circle me-2"></i>
                                        <span data-translate="VAT_INFO_TITLE">Hoe werkt BTW berekenen?</span>
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <h6><i class="fas fa-receipt text-secondary me-2"></i><span data-translate="VAT_RATES_TITLE">BTW Tarieven:</span></h6>
                                            <ul>
                                                <li><strong>21%</strong> - <span data-translate="VAT_RATE_21">Algemeen tarief (meeste goederen en diensten)</span></li>
                                                <li><strong>9%</strong> - <span data-translate="VAT_RATE_9">Laag tarief (voeding, medicijnen, boeken)</span></li>
                                                <li><strong>0%</strong> - <span data-translate="VAT_RATE_0">Nul tarief (export, bepaalde diensten)</span></li>
                                            </ul>
                                            
                                            <h6><i class="fas fa-calculator text-primary me-2"></i><span data-translate="VAT_FORMULA_TITLE">Formule:</span></h6>
                                            <p><code data-translate="FORMULA_VAT">BTW = bedrag × (tarief / 100)</code></p>
                                        </div>
                                        <div class="col-md-6">
                                            <h6><i class="fas fa-chart-line text-success me-2"></i><span data-translate="VAT_EXAMPLE_TITLE">Voorbeeld:</span></h6>
                                            <p><span data-translate="VAT_EXAMPLE_TEXT">€100 exclusief BTW (21%)</span><br>
                                            <strong><span data-translate="VAT_AMOUNT_LABEL">BTW:</span></strong> €21<br>
                                            <strong><span data-translate="VAT_TOTAL_LABEL">Totaal inclusief BTW:</span></strong> €121</p>
                                            
                                            <h6><i class="fas fa-exchange-alt text-info me-2"></i><span data-translate="VAT_REVERSE_TITLE">Terugrekenen:</span></h6>
                                            <p><span data-translate="VAT_REVERSE_TEXT">€121 inclusief BTW (21%)</span><br>
                                            <strong><span data-translate="VAT_AMOUNT_LABEL">BTW:</span></strong> €21<br>
                                            <strong><span data-translate="VAT_EXCLUSIVE_LABEL">Bedrag exclusief BTW:</span></strong> €100</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <?php include '../shared/footer.php'; ?>

    <script src="script.js?v=2026-07-13"></script>