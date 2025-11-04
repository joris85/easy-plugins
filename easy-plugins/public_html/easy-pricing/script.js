// Bereken Tools - JavaScript Functionaliteit voor Percentages, Kortingen en BTW

document.addEventListener('DOMContentLoaded', function() {
    // Calculator 1: Neem een percentage van een getal
    document.getElementById('calculator1').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const percent = parseFloat(document.getElementById('percent1').value);
        const amount = parseFloat(document.getElementById('amount1').value);
        
        if (isNaN(percent) || isNaN(amount) || percent < 0 || amount < 0) {
            showError('result1', 'Voer geldige getallen in (groter dan of gelijk aan 0)');
            return;
        }
        
        const result = (percent / 100) * amount;
        const formattedResult = formatNumber(result);
        const formattedAmount = formatNumber(amount);
        
        // Bereken opgeteld en afgetrokken
        const added = amount + result;
        const subtracted = amount - result;
        const formattedAdded = formatNumber(added);
        const formattedSubtracted = formatNumber(subtracted);
        
        showResult('result1', `<span class="clickable-amount" data-value="${formattedResult}">€${formattedResult}</span>`);
        showCalculation('result1', `${percent}% van €${formattedAmount} = €${formattedResult}`);
        
        // Toon extra berekeningen
        showAdditionalResults('result1', {
            added: `${formattedAmount} + ${formattedResult} = ${formattedAdded}`,
            subtracted: `${formattedAmount} - ${formattedResult} = ${formattedSubtracted}`
        });
    });

    // Calculator 2: Welk percentage is een getal?
    document.getElementById('calculator2').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const amountA = parseFloat(document.getElementById('amount2a').value);
        const amountB = parseFloat(document.getElementById('amount2b').value);
        
        if (isNaN(amountA) || isNaN(amountB) || amountA < 0 || amountB < 0) {
            showError('result2', 'Voer geldige getallen in (groter dan of gelijk aan 0)');
            return;
        }
        
        if (amountB === 0) {
            showError('result2', 'Het totaal kan niet 0 zijn');
            return;
        }
        
        const percentage = (amountA / amountB) * 100;
        const formattedPercentage = formatNumber(percentage);
        
        showResult('result2', `<span class="clickable-amount" data-value="${formattedPercentage}">${formattedPercentage}%</span>`);
        showCalculation('result2', `€${formatNumber(amountA)} is ${formattedPercentage}% van €${formatNumber(amountB)}`);
    });

    // Calculator 3: Verhoging / Verlaging
    document.getElementById('calculator3').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const amount = parseFloat(document.getElementById('amount3').value);
        const percent = parseFloat(document.getElementById('percent3').value);
        const operation = document.getElementById('operation3').value;
        
        if (isNaN(amount) || isNaN(percent) || amount < 0 || percent < 0) {
            showError('result3', 'Voer geldige getallen in (groter dan of gelijk aan 0)');
            return;
        }
        
        let result;
        let operationText;
        
        if (operation === 'plus') {
            result = amount + (percent / 100) * amount;
            operationText = 'plus';
        } else {
            result = amount - (percent / 100) * amount;
            operationText = 'minus';
        }
        
        const formattedResult = formatNumber(result);
        const formattedAmount = formatNumber(amount);
        const formattedPercent = formatNumber(percent);
        
        showResult('result3', `<span class="clickable-amount" data-value="${formattedResult}">€${formattedResult}</span>`);
        showCalculation('result3', `€${formattedAmount} ${operationText} ${formattedPercent}% = €${formattedResult}`);
    });

    // Calculator 4: Percentage verschil
    document.getElementById('calculator4').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const amountA = parseFloat(document.getElementById('amount4a').value);
        const amountB = parseFloat(document.getElementById('amount4b').value);
        
        if (isNaN(amountA) || isNaN(amountB) || amountA < 0 || amountB < 0) {
            showError('result4', 'Voer geldige getallen in (groter dan of gelijk aan 0)');
            return;
        }
        
        if (amountA === 0) {
            showError('result4', 'De eerste waarde kan niet 0 zijn');
            return;
        }
        
        const percentageDiff = ((amountB - amountA) / amountA) * 100;
        const formattedPercentage = formatNumber(Math.abs(percentageDiff));
        const formattedAmountA = formatNumber(amountA);
        const formattedAmountB = formatNumber(amountB);
        
        let changeType = percentageDiff > 0 ? 'stijging' : 'daling';
        let sign = percentageDiff > 0 ? '+' : '-';
        
        showResult('result4', `<span class="clickable-amount" data-value="${sign}${formattedPercentage}">${sign}${formattedPercentage}%</span>`);
        showCalculation('result4', `Van €${formattedAmountA} naar €${formattedAmountB} is een ${changeType} van ${sign}${formattedPercentage}%`);
    });




    // Enhanced real-time calculation for all calculators
    addEnhancedRealTimeCalculation('calculator1');
    addEnhancedRealTimeCalculation('calculator2');
    addEnhancedRealTimeCalculation('calculator3');
    addEnhancedRealTimeCalculation('calculator4');
    addEnhancedRealTimeCalculation('korting-calculator');
    addEnhancedRealTimeCalculation('btw-calculator');
    
    // Also keep the original real-time calculation for backward compatibility
    addRealTimeCalculation('percent1', 'amount1', 'calculator1');
    addRealTimeCalculation('amount2a', 'amount2b', 'calculator2');
    addRealTimeCalculation('amount3', 'percent3', 'calculator3');
    addRealTimeCalculation('amount4a', 'amount4b', 'calculator4');
    
    // Only add real-time calculations if elements exist
    if (document.getElementById('original-price') && document.getElementById('discount-percent')) {
        addRealTimeCalculation('original-price', 'discount-percent', 'korting-calculator');
    }
    if (document.getElementById('original-price') && document.getElementById('discount-amount')) {
        addRealTimeCalculation('original-price', 'discount-amount', 'korting-calculator');
    }
    if (document.getElementById('btw-amount') && document.getElementById('btw-rate')) {
        addRealTimeCalculation('btw-amount', 'btw-rate', 'btw-calculator');
    }

    // Add input validation styling
    addInputValidation();

    // Korting Calculator
    document.getElementById('korting-calculator').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const originalPrice = parseFloat(document.getElementById('original-price').value);
        const discountType = document.querySelector('input[name="discount-type"]:checked').value;
        
        if (isNaN(originalPrice) || originalPrice < 0) {
            showError('korting-result', 'Voer een geldige originele prijs in');
            return;
        }
        
        let discountAmount, newPrice, discountText;
        
        if (discountType === 'percent') {
            const discountPercent = parseFloat(document.getElementById('discount-percent').value);
            
            if (isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
                showError('korting-result', 'Voer een geldig kortingspercentage in (0-100%)');
                return;
            }
            
            discountAmount = (discountPercent / 100) * originalPrice;
            discountText = `${discountPercent}%`;
        } else {
            discountAmount = parseFloat(document.getElementById('discount-amount').value);
            
            if (isNaN(discountAmount) || discountAmount < 0) {
                showError('korting-result', 'Voer een geldig kortingsbedrag in');
                return;
            }
            
            if (discountAmount > originalPrice) {
                showError('korting-result', 'Korting kan niet groter zijn dan de originele prijs');
                return;
            }
            
            discountText = `€${formatNumber(discountAmount)}`;
        }
        
        newPrice = originalPrice - discountAmount;
        
        const formattedOriginal = formatNumber(originalPrice);
        const formattedDiscount = formatNumber(discountAmount);
        const formattedNew = formatNumber(newPrice);
        
        showResult('korting-result', `<span class="clickable-amount" data-value="${formattedNew}">€${formattedNew}</span>`);
        showCalculation('korting-result', 
            `Originele prijs: <span class="clickable-amount" data-value="${formattedOriginal}">€${formattedOriginal}</span><br>` +
            `Korting (${discountText}): <span class="clickable-amount" data-value="${formattedDiscount}">€${formattedDiscount}</span><br>` +
            `Nieuwe prijs: <span class="clickable-amount" data-value="${formattedNew}">€${formattedNew}</span>`);
    });

    // BTW Calculator
    document.getElementById('btw-calculator').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const amount = parseFloat(document.getElementById('btw-amount').value);
        const btwRate = parseFloat(document.getElementById('btw-rate').value);
        const btwType = document.querySelector('input[name="btw-type"]:checked').value;
        
        if (isNaN(amount) || amount < 0) {
            showError('btw-result', 'Voer een geldig bedrag in (groter dan of gelijk aan 0)');
            return;
        }
        
        let exclusiveAmount, inclusiveAmount, btwAmount;
        
        if (btwType === 'inclusive') {
            inclusiveAmount = amount;
            exclusiveAmount = amount / (1 + btwRate / 100);
            btwAmount = inclusiveAmount - exclusiveAmount;
        } else {
            exclusiveAmount = amount;
            btwAmount = amount * (btwRate / 100);
            inclusiveAmount = exclusiveAmount + btwAmount;
        }
        
        const formattedExclusive = formatNumber(exclusiveAmount);
        const formattedInclusive = formatNumber(inclusiveAmount);
        const formattedBtw = formatNumber(btwAmount);
        
        showResult('btw-result', `<span class="clickable-amount" data-value="${formattedInclusive}">€${formattedInclusive}</span>`);
        showCalculation('btw-result', 
            `Bedrag inclusief BTW: <span class="clickable-amount" data-value="${formattedInclusive}">€${formattedInclusive}</span><br>` +
            `Bedrag exclusief BTW: <span class="clickable-amount" data-value="${formattedExclusive}">€${formattedExclusive}</span><br>` +
            `BTW (${btwRate}%): <span class="clickable-amount" data-value="${formattedBtw}">€${formattedBtw}</span>`);
    });

    // Toggle discount type inputs
    document.addEventListener('change', function(e) {
        if (e.target && e.target.name === 'discount-type') {
            const percentGroup = document.getElementById('discount-percent-group');
            const amountGroup = document.getElementById('discount-amount-group');
            
            if (percentGroup && amountGroup) {
                if (e.target.value === 'percent') {
                    percentGroup.style.display = 'block';
                    amountGroup.style.display = 'none';
                } else {
                    percentGroup.style.display = 'none';
                    amountGroup.style.display = 'block';
                }
            }
        }
    });

    // Initialize korting calculator
    function initializeKortingCalculator() {
        const kortingCalculator = document.getElementById('korting-calculator');
        console.log('Korting calculator found:', kortingCalculator);
        if (kortingCalculator) {
            console.log('Initializing korting calculator');
            
            // Toggle discount type inputs
            const discountTypeRadios = document.querySelectorAll('input[name="discount-type"]');
            if (discountTypeRadios.length > 0) {
                discountTypeRadios.forEach(function(radio) {
                    radio.addEventListener('change', function() {
                        const percentGroup = document.getElementById('discount-percent-group');
                        const amountGroup = document.getElementById('discount-amount-group');
                        
                        if (percentGroup && amountGroup) {
                            if (this.value === 'percent') {
                                percentGroup.style.display = 'block';
                                amountGroup.style.display = 'none';
                            } else {
                                percentGroup.style.display = 'none';
                                amountGroup.style.display = 'block';
                            }
                        }
                    });
                });
            }
            
            kortingCalculator.addEventListener('submit', function(e) {
                e.preventDefault();
                console.log('Korting calculator form submitted');
                
                const originalPrice = parseFloat(document.getElementById('original-price').value);
                const discountType = document.querySelector('input[name="discount-type"]:checked').value;
                console.log('Original price:', originalPrice, 'Discount type:', discountType);
                
                if (isNaN(originalPrice) || originalPrice < 0) {
                    showError('korting-result', 'Voer een geldige originele prijs in');
                    return;
                }
                
                let discountAmount, newPrice, discountText;
                
                if (discountType === 'percent') {
                    const discountPercent = parseFloat(document.getElementById('discount-percent').value);
                    
                    if (isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
                        showError('korting-result', 'Voer een geldig kortingspercentage in (0-100%)');
                        return;
                    }
                    
                    discountAmount = (discountPercent / 100) * originalPrice;
                    discountText = `${discountPercent}%`;
                } else {
                    discountAmount = parseFloat(document.getElementById('discount-amount').value);
                    
                    if (isNaN(discountAmount) || discountAmount < 0) {
                        showError('korting-result', 'Voer een geldig kortingsbedrag in');
                        return;
                    }
                    
                    // Controleer of korting niet groter is dan originele prijs
                    if (discountAmount > originalPrice) {
                        showError('korting-result', 'Korting kan niet groter zijn dan de originele prijs');
                        return;
                    }
                    
                    discountText = `€${formatNumber(discountAmount)}`;
                }
                
                newPrice = originalPrice - discountAmount;
                
                const formattedOriginal = formatNumber(originalPrice);
                const formattedDiscount = formatNumber(discountAmount);
                const formattedNew = formatNumber(newPrice);
                
                showResult('korting-result', `€${formattedNew}`);
                showCalculation('korting-result', 
                    `Originele prijs: €${formattedOriginal}<br>` +
                    `Korting (${discountText}): €${formattedDiscount}<br>` +
                    `Nieuwe prijs: €${formattedNew}`);
            });
        }
    }

    // Initialize BTW calculator
    function initializeBTWCalculator() {
        const btwCalculator = document.getElementById('btw-calculator');
        console.log('BTW calculator found:', btwCalculator);
        if (btwCalculator) {
            console.log('Initializing BTW calculator');
            
            btwCalculator.addEventListener('submit', function(e) {
                e.preventDefault();
                console.log('BTW calculator form submitted');
                
                const amount = parseFloat(document.getElementById('btw-amount').value);
                const btwRate = parseFloat(document.getElementById('btw-rate').value);
                const btwType = document.querySelector('input[name="btw-type"]:checked').value;
                console.log('Amount:', amount, 'BTW Rate:', btwRate, 'BTW Type:', btwType);
                
                if (isNaN(amount) || amount < 0) {
                    showError('btw-result', 'Voer een geldig bedrag in (groter dan of gelijk aan 0)');
                    return;
                }
                
                let exclusiveAmount, inclusiveAmount, btwAmount;
                
                if (btwType === 'inclusive') {
                    // Bedrag is inclusief BTW, bereken exclusief
                    inclusiveAmount = amount;
                    exclusiveAmount = amount / (1 + btwRate / 100);
                    btwAmount = inclusiveAmount - exclusiveAmount;
                } else {
                    // Bedrag is exclusief BTW, bereken inclusief
                    exclusiveAmount = amount;
                    btwAmount = amount * (btwRate / 100);
                    inclusiveAmount = exclusiveAmount + btwAmount;
                }
                
                const formattedExclusive = formatNumber(exclusiveAmount);
                const formattedInclusive = formatNumber(inclusiveAmount);
                const formattedBtw = formatNumber(btwAmount);
                
                showResult('btw-result', `€${formattedInclusive}`);
                showCalculation('btw-result', 
                    `Bedrag exclusief BTW: €${formattedExclusive}<br>` +
                    `BTW (${btwRate}%): €${formattedBtw}<br>` +
                    `Bedrag inclusief BTW: €${formattedInclusive}`);
            });
        }
    }
});

// Helper functions
function formatNumber(num) {
    return new Intl.NumberFormat('nl-NL', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
}

function showResult(resultId, result) {
    const resultElement = document.getElementById(resultId);
    const resultTextId = resultId + '-text';
    const resultText = document.getElementById(resultTextId);
    
    if (resultElement && resultText) {
        resultText.innerHTML = result;
        resultElement.style.display = 'block';
        
        // Add animation
        resultElement.style.animation = 'none';
        setTimeout(() => {
            resultElement.style.animation = 'slideIn 0.5s ease';
        }, 10);
    }
}

function showCalculation(resultId, calculation) {
    const resultElement = document.getElementById(resultId);
    const resultTextId = resultId + '-text';
    const resultText = document.getElementById(resultTextId);
    
    if (resultElement && resultText) {
        // Don't overwrite the HTML if it contains clickable amounts, but still show the calculation
        if (resultText.innerHTML.includes('clickable-amount')) {
            // Find the existing result text and add the calculation below it
            const existingContent = resultText.innerHTML;
            resultText.innerHTML = existingContent + `<br><small class="text-muted">${calculation}</small>`;
            return;
        }
        resultText.innerHTML = `<div class="mb-2">${resultText.textContent}</div><small class="text-muted">${calculation}</small>`;
    }
}

function showAdditionalResults(resultId, additionalResults) {
    const additionalElement = document.getElementById(resultId + '-additional');
    const addedTextElement = document.getElementById(resultId + '-added-text');
    const subtractedTextElement = document.getElementById(resultId + '-subtracted-text');
    
    if (additionalElement && addedTextElement && subtractedTextElement) {
        // Split the calculation text to make only the amounts clickable
        const addedParts = additionalResults.added.split(' = ');
        const subtractedParts = additionalResults.subtracted.split(' = ');
        
        addedTextElement.innerHTML = `${addedParts[0]} = <span class="clickable-amount" data-value="${addedParts[1]}">${addedParts[1]}</span>`;
        subtractedTextElement.innerHTML = `${subtractedParts[0]} = <span class="clickable-amount" data-value="${subtractedParts[1]}">${subtractedParts[1]}</span>`;
        additionalElement.style.display = 'block';
    }
}

function showError(resultId, errorMessage) {
    const resultElement = document.getElementById(resultId);
    const resultTextId = resultId + '-text';
    const resultText = document.getElementById(resultTextId);
    
    if (resultElement && resultText) {
        resultText.innerHTML = `<span class="text-danger"><i class="fas fa-exclamation-triangle me-2"></i>${errorMessage}</span>`;
        resultElement.style.display = 'block';
        resultElement.style.borderLeftColor = '#dc3545';
        
        // Reset border color after 3 seconds
        setTimeout(() => {
            resultElement.style.borderLeftColor = '#667eea';
        }, 3000);
    }
}

function addRealTimeCalculation(input1Id, input2Id, formId) {
    const input1 = document.getElementById(input1Id);
    const input2 = document.getElementById(input2Id);
    
    if (input1 && input2) {
        [input1, input2].forEach(input => {
            input.addEventListener('input', function() {
                // Clear previous timeout
                clearTimeout(input.calculationTimeout);
                
                // Set new timeout for calculation
                input.calculationTimeout = setTimeout(() => {
                    const form = document.getElementById(formId);
                    if (form && input1.value && input2.value && !isNaN(parseFloat(input1.value)) && !isNaN(parseFloat(input2.value))) {
                        form.dispatchEvent(new Event('submit'));
                    }
                }, 200); // Reduced timeout to 200ms for faster response
            });
            
            // Also trigger on blur (when user leaves the field)
            input.addEventListener('blur', function() {
                const form = document.getElementById(formId);
                if (form && input1.value && input2.value && !isNaN(parseFloat(input1.value)) && !isNaN(parseFloat(input2.value))) {
                    form.dispatchEvent(new Event('submit'));
                }
            });
        });
    }
}

// Enhanced real-time calculation for all form inputs
function addEnhancedRealTimeCalculation(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    // Get all inputs, selects, and radio buttons in the form
    const inputs = form.querySelectorAll('input[type="number"], input[type="radio"], select');
    
    inputs.forEach(input => {
        // For number inputs
        if (input.type === 'number') {
            input.addEventListener('input', function() {
                clearTimeout(input.calculationTimeout);
                input.calculationTimeout = setTimeout(() => {
                    triggerCalculation(formId);
                }, 200);
            });
            
            input.addEventListener('blur', function() {
                triggerCalculation(formId);
            });
        }
        
        // For radio buttons and selects
        if (input.type === 'radio' || input.tagName === 'SELECT') {
            input.addEventListener('change', function() {
                triggerCalculation(formId);
            });
        }
    });
}

function triggerCalculation(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    // Check if form has required inputs with values
    const requiredInputs = form.querySelectorAll('input[type="number"][required], input[type="number"]:not([required])');
    let hasValidInputs = false;
    
    // For different calculators, check different requirements
    if (formId === 'calculator1') {
        const percent1 = document.getElementById('percent1');
        const amount1 = document.getElementById('amount1');
        hasValidInputs = percent1 && amount1 && percent1.value && amount1.value && 
                        !isNaN(parseFloat(percent1.value)) && !isNaN(parseFloat(amount1.value));
    } else if (formId === 'calculator2') {
        const amount2a = document.getElementById('amount2a');
        const amount2b = document.getElementById('amount2b');
        hasValidInputs = amount2a && amount2b && amount2a.value && amount2b.value && 
                        !isNaN(parseFloat(amount2a.value)) && !isNaN(parseFloat(amount2b.value));
    } else if (formId === 'calculator3') {
        const amount3 = document.getElementById('amount3');
        const percent3 = document.getElementById('percent3');
        const operation3 = document.getElementById('operation3');
        hasValidInputs = amount3 && percent3 && operation3 && amount3.value && percent3.value && operation3.value && 
                        !isNaN(parseFloat(amount3.value)) && !isNaN(parseFloat(percent3.value));
    } else if (formId === 'calculator4') {
        const amount4a = document.getElementById('amount4a');
        const amount4b = document.getElementById('amount4b');
        hasValidInputs = amount4a && amount4b && amount4a.value && amount4b.value && 
                        !isNaN(parseFloat(amount4a.value)) && !isNaN(parseFloat(amount4b.value));
    } else if (formId === 'korting-calculator') {
        const originalPrice = document.getElementById('original-price');
        const discountType = form.querySelector('input[name="discount-type"]:checked');
        const discountPercent = document.getElementById('discount-percent');
        const discountAmount = document.getElementById('discount-amount');
        
        hasValidInputs = originalPrice && originalPrice.value && !isNaN(parseFloat(originalPrice.value));
        if (discountType && discountType.value === 'percent') {
            hasValidInputs = hasValidInputs && discountPercent && discountPercent.value && !isNaN(parseFloat(discountPercent.value));
        } else if (discountType && discountType.value === 'amount') {
            hasValidInputs = hasValidInputs && discountAmount && discountAmount.value && !isNaN(parseFloat(discountAmount.value));
        }
    } else if (formId === 'btw-calculator') {
        const btwAmount = document.getElementById('btw-amount');
        const btwRate = document.getElementById('btw-rate');
        hasValidInputs = btwAmount && btwRate && btwAmount.value && btwRate.value && 
                        !isNaN(parseFloat(btwAmount.value)) && !isNaN(parseFloat(btwRate.value));
    }
    
    if (hasValidInputs) {
        form.dispatchEvent(new Event('submit'));
    }
}

function addInputValidation() {
    const inputs = document.querySelectorAll('input[type="number"]');
    
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            const value = parseFloat(this.value);
            
            // Remove previous validation classes
            this.classList.remove('is-valid', 'is-invalid');
            
            if (this.value === '') {
                return; // Don't validate empty inputs
            }
            
            if (isNaN(value) || value < 0) {
                this.classList.add('is-invalid');
            } else {
                this.classList.add('is-valid');
            }
        });
        
        input.addEventListener('blur', function() {
            // Clear validation classes when input loses focus if empty
            if (this.value === '') {
                this.classList.remove('is-valid', 'is-invalid');
            }
        });
    });
}

// Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Enter key submits the form
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
        e.preventDefault();
        const form = e.target.closest('form');
        if (form) {
            form.dispatchEvent(new Event('submit'));
        }
    }
    
    // Escape key clears the form
    if (e.key === 'Escape' && e.target.tagName === 'INPUT') {
        e.target.value = '';
        e.target.classList.remove('is-valid', 'is-invalid');
        
        // Hide result
        const form = e.target.closest('form');
        if (form) {
            const resultId = form.id.replace('calculator', 'result');
            const resultElement = document.getElementById(resultId);
            if (resultElement) {
                resultElement.style.display = 'none';
            }
        }
    }
});

// Add copy to clipboard functionality
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(function() {
        // Show success message
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.innerHTML = '<i class="fas fa-check-circle me-2"></i>Gekopieerd naar klembord!';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 10px;
            z-index: 9999;
            animation: slideInRight 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    });
}

// Add click to copy functionality to results
document.addEventListener('click', function(e) {
    // Handle clickable amounts
    if (e.target.classList.contains('clickable-amount')) {
        const value = e.target.getAttribute('data-value');
        if (value) {
            copyToClipboard(value);
        }
        return;
    }
});

// Add smooth scrolling for better UX
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add loading states for better UX
function addLoadingState(formId) {
    const form = document.getElementById(formId);
    const button = form.querySelector('button[type="submit"]');
    const originalText = button.innerHTML;
    
    button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>' + translate('CALCULATING_MESSAGE', 'Berekenen...');
    button.disabled = true;
    
    setTimeout(() => {
        button.innerHTML = originalText;
        button.disabled = false;
    }, 1000);
}

// Add form submission loading states
document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', function() {
        addLoadingState(this.id);
    });
});
