// Easy PNG - Add Background to Images

// State
let currentImage = null;
let currentImageData = null;
let backgroundType = 'solid';
let gradientType = 'linear';
let gradientDirection = 'top-bottom';
let gradientPosition = 'center';
let radialRadius = 50;
let gradientColors = ['#ffffff', '#000000'];
let solidColor = '#ffffff';

// DOM Elements
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const previewCanvas = document.getElementById('previewCanvas');
const previewPlaceholder = document.getElementById('previewPlaceholder');
const previewControls = document.getElementById('previewControls');
const downloadPngBtn = document.getElementById('downloadPngBtn');
const downloadJpgBtn = document.getElementById('downloadJpgBtn');
const downloadWebpBtn = document.getElementById('downloadWebpBtn');
const resetBtn = document.getElementById('resetBtn');
const qualitySlider = document.getElementById('qualitySlider');
const qualityValue = document.getElementById('qualityValue');

// Background type buttons
const bgTypeButtons = document.querySelectorAll('.bg-type-btn');
const solidBackground = document.getElementById('solidBackground');
const gradientBackground = document.getElementById('gradientBackground');
const solidColorInput = document.getElementById('solidColor');
const solidColorText = document.getElementById('solidColorText');

// Gradient controls
const gradientTypeButtons = document.querySelectorAll('.gradient-type-btn');
const linearGradientOptions = document.getElementById('linearGradientOptions');
const radialGradientOptions = document.getElementById('radialGradientOptions');
const directionButtons = document.querySelectorAll('.direction-btn');
const positionButtons = document.querySelectorAll('.position-btn');
const radialRadiusSlider = document.getElementById('radialRadius');
const radiusValue = document.getElementById('radiusValue');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    // Initialize gradient color listeners for existing color inputs
    setupGradientColorListeners();
});

function initializeEventListeners() {
    // File upload
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', handleDragOver);
    dropzone.addEventListener('dragleave', handleDragLeave);
    dropzone.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFileSelect);
    
    // Background type toggle
    bgTypeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            bgTypeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            backgroundType = btn.dataset.type;
            
            if (backgroundType === 'solid') {
                solidBackground.classList.add('active');
                gradientBackground.classList.remove('active');
            } else {
                solidBackground.classList.remove('active');
                gradientBackground.classList.add('active');
            }
            
            updatePreview();
        });
    });
    
    // Solid color
    solidColorInput.addEventListener('input', (e) => {
        solidColor = e.target.value;
        solidColorText.value = solidColor;
        updatePreview();
    });
    
    solidColorText.addEventListener('input', (e) => {
        const color = e.target.value;
        if (isValidColor(color)) {
            solidColor = color;
            solidColorInput.value = color;
            updatePreview();
        }
    });
    
    // Gradient type toggle
    gradientTypeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            gradientTypeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gradientType = btn.dataset.gtype;
            
            if (gradientType === 'linear') {
                linearGradientOptions.style.display = 'block';
                radialGradientOptions.style.display = 'none';
            } else {
                linearGradientOptions.style.display = 'none';
                radialGradientOptions.style.display = 'block';
            }
            
            updatePreview();
        });
    });
    
    // Direction buttons
    directionButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            directionButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gradientDirection = btn.dataset.direction;
            updatePreview();
        });
    });
    
    // Position buttons
    positionButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            positionButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gradientPosition = btn.dataset.position;
            updatePreview();
        });
    });
    
    // Radial radius
    radialRadiusSlider.addEventListener('input', (e) => {
        radialRadius = parseInt(e.target.value);
        radiusValue.textContent = radialRadius + '%';
        updatePreview();
    });
    
    // Gradient colors
    setupGradientColorListeners();
    
    // Add color button
    document.getElementById('addColorBtn').addEventListener('click', addGradientColor);
    
    // Quality slider
    if (qualitySlider && qualityValue) {
        qualitySlider.addEventListener('input', (e) => {
            qualityValue.textContent = e.target.value;
        });
    }
    
    // Download and reset
    downloadPngBtn.addEventListener('click', () => downloadImage('png'));
    downloadJpgBtn.addEventListener('click', () => downloadImage('jpg'));
    downloadWebpBtn.addEventListener('click', () => downloadImage('webp'));
    resetBtn.addEventListener('click', resetAll);
}

function setupGradientColorListeners() {
    const colorInputs = document.querySelectorAll('.gradient-color');
    const colorTexts = document.querySelectorAll('.gradient-color-text');
    const removeButtons = document.querySelectorAll('.remove-color-btn');
    
    colorInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            const index = parseInt(e.target.dataset.index);
            gradientColors[index] = e.target.value;
            const textInput = document.querySelector(`.gradient-color-text[data-index="${index}"]`);
            if (textInput) textInput.value = e.target.value;
            updatePreview();
        });
    });
    
    colorTexts.forEach(input => {
        input.addEventListener('input', (e) => {
            const index = parseInt(e.target.dataset.index);
            const color = e.target.value;
            if (isValidColor(color)) {
                gradientColors[index] = color;
                const colorInput = document.querySelector(`.gradient-color[data-index="${index}"]`);
                if (colorInput) colorInput.value = color;
                updatePreview();
            }
        });
    });
    
    removeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.closest('.remove-color-btn').dataset.index);
            removeGradientColor(index);
        });
    });
}

function addGradientColor() {
    if (gradientColors.length >= 4) {
        alert('Maximum 4 colors allowed');
        return;
    }
    
    // Add a new color (interpolate between last two colors or use a default)
    const newColor = gradientColors.length > 0 
        ? gradientColors[gradientColors.length - 1] 
        : '#808080';
    gradientColors.push(newColor);
    
    updateGradientColorUI();
    updatePreview();
}

function removeGradientColor(index) {
    if (gradientColors.length <= 2) {
        alert('Minimum 2 colors required');
        return;
    }
    
    gradientColors.splice(index, 1);
    updateGradientColorUI();
    updatePreview();
}

function updateGradientColorUI() {
    const container = document.querySelector('.gradient-colors');
    container.innerHTML = '';
    
    gradientColors.forEach((color, index) => {
        const colorItem = document.createElement('div');
        colorItem.className = 'color-item';
        colorItem.innerHTML = `
            <input type="color" class="gradient-color" data-index="${index}" value="${color}">
            <input type="text" class="gradient-color-text" data-index="${index}" value="${color}" placeholder="#ffffff">
            <button type="button" class="remove-color-btn" data-index="${index}" ${gradientColors.length <= 2 ? 'style="display: none;"' : ''}>
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(colorItem);
    });
    
    setupGradientColorListeners();
}

function isValidColor(color) {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

// File handling
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFile(file) {
    // SVG is rejected: it taints the canvas and export fails silently
    const validation = EasyUpload.validateImageFile(file, {
        allowedTypes: ['image/png', 'image/webp', 'image/x-webp'],
        allowedExtensions: ['png', 'webp']
    });
    if (!validation.ok) {
        alert(validation.error);
        return;
    }

    // Read file
    const reader = new FileReader();
    reader.onload = function(e) {
        loadImage(e.target.result, file.type, file.name);
    };
    reader.readAsDataURL(file);
}

function loadImage(src, mimeType, fileName) {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = function() {
        const sizeError = EasyCanvas.sourceSizeError(img.width, img.height);
        if (sizeError) {
            alert(sizeError);
            return;
        }

        currentImage = img;
        currentImageData = { src, mimeType, fileName };
        
        // Show preview
        previewPlaceholder.style.display = 'none';
        previewCanvas.style.display = 'block';
        previewControls.style.display = 'block';
        
        updatePreview();
    };
    
    img.onerror = function() {
        alert('Error loading image. Please try another file.');
    };
    
    // Set image source (PNG and WebP)
    img.src = src;
}

function updatePreview() {
    if (!currentImage) return;
    
    const canvas = previewCanvas;
    const ctx = EasyCanvas.getContext2D(canvas);

    // Set canvas size
    canvas.width = currentImage.width;
    canvas.height = currentImage.height;
    EasyCanvas.applyHighQualitySmoothing(ctx);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    if (backgroundType === 'solid') {
        ctx.fillStyle = solidColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        // Draw gradient
        const gradient = createGradient(ctx, canvas.width, canvas.height);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Draw image on top
    ctx.drawImage(currentImage, 0, 0);
}

function createGradient(ctx, width, height) {
    if (gradientType === 'linear') {
        return createLinearGradient(ctx, width, height);
    } else {
        return createRadialGradient(ctx, width, height);
    }
}

function createLinearGradient(ctx, width, height) {
    let x0, y0, x1, y1;
    
    switch (gradientDirection) {
        case 'top-bottom':
            x0 = width / 2;
            y0 = 0;
            x1 = width / 2;
            y1 = height;
            break;
        case 'bottom-top':
            x0 = width / 2;
            y0 = height;
            x1 = width / 2;
            y1 = 0;
            break;
        case 'left-right':
            x0 = 0;
            y0 = height / 2;
            x1 = width;
            y1 = height / 2;
            break;
        case 'right-left':
            x0 = width;
            y0 = height / 2;
            x1 = 0;
            y1 = height / 2;
            break;
    }
    
    const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
    const step = 1 / (gradientColors.length - 1);
    
    gradientColors.forEach((color, index) => {
        gradient.addColorStop(index * step, color);
    });
    
    return gradient;
}

function createRadialGradient(ctx, width, height) {
    let centerX, centerY;
    const radius = Math.max(width, height) * (radialRadius / 100);
    
    switch (gradientPosition) {
        case 'center':
            centerX = width / 2;
            centerY = height / 2;
            break;
        case 'top-left':
            centerX = 0;
            centerY = 0;
            break;
        case 'top-right':
            centerX = width;
            centerY = 0;
            break;
        case 'bottom-left':
            centerX = 0;
            centerY = height;
            break;
        case 'bottom-right':
            centerX = width;
            centerY = height;
            break;
    }
    
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    const step = 1 / (gradientColors.length - 1);
    
    gradientColors.forEach((color, index) => {
        gradient.addColorStop(index * step, color);
    });
    
    return gradient;
}

function downloadImage(format) {
    if (!currentImage) {
        alert('Please upload an image first');
        return;
    }
    
    const canvas = previewCanvas;
    let mimeType, fileExtension;

    const qualityPercent = qualitySlider ? parseInt(qualitySlider.value) : EasyCanvas.DEFAULT_QUALITY;

    if (format === 'jpg') {
        mimeType = 'image/jpeg';
        fileExtension = 'jpg';
    } else if (format === 'webp') {
        mimeType = 'image/webp';
        fileExtension = 'webp';
    } else {
        mimeType = 'image/png';
        fileExtension = 'png';
    }

    EasyCanvas.toBlob(canvas, mimeType, qualityPercent)
        .then(function(blob) {
            const originalName = currentImageData && currentImageData.fileName;
            const filename = EasyCanvas.exportFilename(originalName, 'with-background', fileExtension);
            EasyCanvas.downloadBlob(blob, filename);
        })
        .catch(function() {
            alert('Error generating image. Please try again.');
        });
}

function resetAll() {
    if (confirm('Are you sure you want to reset? This will clear the uploaded image.')) {
        currentImage = null;
        currentImageData = null;
        previewPlaceholder.style.display = 'block';
        previewCanvas.style.display = 'none';
        previewControls.style.display = 'none';
        fileInput.value = '';
        
        // Reset to defaults
        backgroundType = 'solid';
        solidColor = '#ffffff';
        gradientType = 'linear';
        gradientDirection = 'top-bottom';
        gradientPosition = 'center';
        radialRadius = 50;
        gradientColors = ['#ffffff', '#000000'];
        
        // Reset UI
        bgTypeButtons[0].click();
        gradientTypeButtons[0].click();
        directionButtons[0].click();
        positionButtons[0].click();
        solidColorInput.value = '#ffffff';
        solidColorText.value = '#ffffff';
        radialRadiusSlider.value = 50;
        radiusValue.textContent = '50%';
        updateGradientColorUI();
    }
}

