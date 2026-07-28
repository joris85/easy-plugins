// Easy Watermark - Add Watermarks to Images

// State
let mainImages = []; // Array of { image: Image, data: { src, mimeType, name } }
let currentPreviewIndex = 0; // Index of currently previewed image
let watermarks = [];
let selectedWatermarkIndex = -1;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let isResizingMultiplyArea = false;
let resizeHandle = null;

// DOM Elements
const mainImageDropzone = document.getElementById('mainImageDropzone');
const mainImageInput = document.getElementById('mainImageInput');
const watermarkDropzone = document.getElementById('watermarkDropzone');
const watermarkInput = document.getElementById('watermarkInput');
const textWatermarkInput = document.getElementById('textWatermarkInput');
const addTextWatermarkBtn = document.getElementById('addTextWatermarkBtn');
const previewCanvas = document.getElementById('previewCanvas');
const previewPlaceholder = document.getElementById('previewPlaceholder');
const canvasWrapper = document.getElementById('canvasWrapper');
const previewControls = document.getElementById('previewControls');
const downloadPngBtn = document.getElementById('downloadPngBtn');
const downloadJpgBtn = document.getElementById('downloadJpgBtn');
const downloadWebpBtn = document.getElementById('downloadWebpBtn');
const resetBtn = document.getElementById('resetBtn');
const qualitySlider = document.getElementById('qualitySlider');
const qualityValue = document.getElementById('qualityValue');
const watermarkList = document.getElementById('watermarkList');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
});

function initializeEventListeners() {
    // Main image upload
    mainImageDropzone.addEventListener('click', () => mainImageInput.click());
    mainImageDropzone.addEventListener('dragover', handleDragOver);
    mainImageDropzone.addEventListener('dragleave', handleDragLeave);
    mainImageDropzone.addEventListener('drop', (e) => handleDrop(e, 'main'));
    mainImageInput.addEventListener('change', (e) => handleFileSelect(e, 'main'));
    
    // Watermark upload
    watermarkDropzone.addEventListener('click', () => watermarkInput.click());
    watermarkDropzone.addEventListener('dragover', handleDragOver);
    watermarkDropzone.addEventListener('dragleave', handleDragLeave);
    watermarkDropzone.addEventListener('drop', (e) => handleDrop(e, 'watermark'));
    watermarkInput.addEventListener('change', (e) => handleFileSelect(e, 'watermark'));
    
    // Text watermark
    addTextWatermarkBtn.addEventListener('click', addTextWatermark);
    textWatermarkInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTextWatermark();
        }
    });
    
    // Canvas drag and drop
    previewCanvas.addEventListener('mousedown', handleCanvasMouseDown);
    previewCanvas.addEventListener('mousemove', handleCanvasMouseMove);
    previewCanvas.addEventListener('mouseup', handleCanvasMouseUp);
    previewCanvas.addEventListener('mouseleave', handleCanvasMouseUp);
    
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

// File handling
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('dragover');
}

function handleDrop(e, type) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        if (type === 'main') {
            Array.from(files).forEach(file => handleFile(file, 'main'));
        } else {
            Array.from(files).forEach(file => handleFile(file, 'watermark'));
        }
    }
}

function handleFileSelect(e, type) {
    const files = e.target.files;
    if (files.length > 0) {
        if (type === 'main') {
            Array.from(files).forEach(file => handleFile(file, 'main'));
        } else {
            Array.from(files).forEach(file => handleFile(file, 'watermark'));
        }
    }
}

function handleFile(file, type) {
    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
    }
    
    // Read file
    const reader = new FileReader();
    reader.onload = function(e) {
        if (type === 'main') {
            loadMainImage(e.target.result, file.type, file.name);
        } else {
            addWatermark(e.target.result, file.name, file.type);
        }
    };
    reader.readAsDataURL(file);
}

function loadMainImage(src, mimeType, name) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = function() {
        // Add to images array
        mainImages.push({
            image: img,
            data: { src, mimeType, name: name || `image-${mainImages.length + 1}` }
        });
        
        // Show preview with first image
        if (mainImages.length === 1) {
            currentPreviewIndex = 0;
            previewPlaceholder.style.display = 'none';
            canvasWrapper.style.display = 'flex';
            previewControls.style.display = 'block';
            
            // Set canvas size based on first image
            previewCanvas.width = img.width;
            previewCanvas.height = img.height;
            
            updatePreview();
        }
        
        // Update image list
        updateImageList();
    };
    
    img.onerror = function() {
        alert('Error loading image. Please try another file.');
    };
    
    img.src = src;
}

function addWatermark(src, name, mimeType) {
    if (!mainImages.length || currentPreviewIndex < 0 || currentPreviewIndex >= mainImages.length) {
        alert('Please upload a main image first');
        return;
    }
    
    const mainImg = mainImages[currentPreviewIndex].image;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = function() {
        // Calculate center position as percentages
        const centerX = mainImg.width / 2 - img.width / 2;
        const centerY = mainImg.height / 2 - img.height / 2;
        const pos = getWatermarkPercentPosition(centerX, centerY, mainImg.width, mainImg.height);
        
        const watermark = {
            type: 'image',
            id: Date.now() + Math.random(),
            image: img,
            name: name || `Watermark ${watermarks.length + 1}`,
            xPercent: pos.xPercent,
            yPercent: pos.yPercent,
            width: img.width,
            height: img.height,
            opacity: 0.5,
            size: 100, // Percentage
            rotation: 0,
            // Shadow properties
            shadowEnabled: false,
            shadowBlur: 5,
            shadowOffsetX: 2,
            shadowOffsetY: 2,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
            // Background properties
            backgroundEnabled: false,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            backgroundPadding: 10,
            // Border radius
            borderRadius: 0
        };
        
        watermarks.push(watermark);
        updateWatermarkList();
        updatePreview();
    };
    
    img.onerror = function() {
        alert('Error loading watermark image. Please try another file.');
    };
    
    img.src = src;
}

function addTextWatermark() {
    if (!mainImages.length || currentPreviewIndex < 0 || currentPreviewIndex >= mainImages.length) {
        alert('Please upload a main image first');
        return;
    }
    
    const mainImg = mainImages[currentPreviewIndex].image;
    const text = textWatermarkInput.value.trim();
    if (!text) {
        alert('Please enter some text for the watermark');
        return;
    }
    
    // Calculate center position as percentages
    const centerX = mainImg.width / 2;
    const centerY = mainImg.height / 2;
    const pos = getWatermarkPercentPosition(centerX, centerY, mainImg.width, mainImg.height);
    
    const watermark = {
        type: 'text',
        id: Date.now() + Math.random(),
        text: text,
        name: `Text: ${text.substring(0, 20)}${text.length > 20 ? '...' : ''}`,
        xPercent: pos.xPercent,
        yPercent: pos.yPercent,
        // Text properties
        fontSize: 100,
        lineHeight: 1.5,
        fontFamily: 'Roboto',
        fontWeight: 'normal', // 'normal' or 'bold'
        fontStyle: 'normal', // 'normal' or 'italic'
        textAlign: 'center', // 'left', 'center', 'right'
        textColor: 'rgba(0, 0, 0, 1)',
        // Multiply mode
        multiply: false,
        multiplyGrid: true,
        multiplyRandom: false,
        multiplyArea: {
            xPercent: 0,
            yPercent: 0,
            widthPercent: 100,
            heightPercent: 100,
            offsetX: 0, // Offset for grid pattern positioning
            offsetY: 0
        },
        // Common properties
        opacity: 1.0,
        rotation: 0,
        // Shadow properties
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 2,
        shadowOffsetY: 2,
        shadowColor: 'rgba(0, 0, 0, 0.5)',
        // Background properties
        backgroundEnabled: false,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backgroundPadding: 10,
        // Border radius
        borderRadius: 0
    };
    
    watermarks.push(watermark);
    textWatermarkInput.value = '';
    updateWatermarkList();
    updatePreview();
}

function updateWatermarkList() {
    watermarkList.innerHTML = '';
    
    watermarks.forEach((watermark, index) => {
        const item = document.createElement('div');
        item.className = `watermark-item ${selectedWatermarkIndex === index ? 'active' : ''}`;
        item.dataset.index = index;
        
        // Helper function to convert rgba string to hex for color input
        const rgbaToHex = (rgba) => {
            if (!rgba || rgba === 'transparent') return '#ffffff';
            const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
            if (!match) return '#ffffff';
            const r = parseInt(match[1]).toString(16).padStart(2, '0');
            const g = parseInt(match[2]).toString(16).padStart(2, '0');
            const b = parseInt(match[3]).toString(16).padStart(2, '0');
            return `#${r}${g}${b}`;
        };
        
        const shadowColorHex = rgbaToHex(watermark.shadowColor);
        const bgColorHex = rgbaToHex(watermark.backgroundColor);
        
        // Extract alpha from rgba
        const getAlpha = (rgba) => {
            if (!rgba || rgba === 'transparent') return 1;
            const match = rgba.match(/rgba?\([\d\s,]+,\s*([\d.]+)\)/);
            return match ? parseFloat(match[1]) : 1;
        };
        
        const shadowAlpha = getAlpha(watermark.shadowColor);
        const bgAlpha = getAlpha(watermark.backgroundColor);
        
        // Header - different for image vs text
        const headerHTML = watermark.type === 'text' 
            ? `<div class="watermark-item-header">
                <div class="watermark-thumbnail-text"><i class="fas fa-font"></i></div>
                <div class="watermark-item-title">${watermark.name}</div>
                <button type="button" class="watermark-delete-btn" data-index="${index}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>`
            : `<div class="watermark-item-header">
                <img src="${watermark.image.src}" alt="Watermark" class="watermark-thumbnail">
                <div class="watermark-item-title">${watermark.name}</div>
                <button type="button" class="watermark-delete-btn" data-index="${index}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>`;
        
        // Text-specific controls
        const textControlsHTML = watermark.type === 'text' ? `
                <!-- Text Input -->
                <div class="watermark-control">
                    <div class="watermark-control-label">
                        <span><i class="fas fa-text-width"></i> Text</span>
                    </div>
                    <input type="text" class="text-watermark-input-field" value="${watermark.text}" 
                           data-index="${index}" data-property="text" placeholder="Enter text">
                </div>
                
                <!-- Font Size -->
                <div class="watermark-control">
                    <div class="watermark-control-label">
                        <span>Letter Size</span>
                        <span>${watermark.fontSize}px</span>
                    </div>
                    <input type="range" class="slider font-size-slider" min="8" max="200" 
                           value="${watermark.fontSize}" 
                           data-index="${index}" data-property="fontSize">
                </div>
                
                <!-- Line Height -->
                <div class="watermark-control">
                    <div class="watermark-control-label">
                        <span>Line Height</span>
                        <span>${watermark.lineHeight}</span>
                    </div>
                    <input type="range" class="slider line-height-slider" min="0.5" max="3" step="0.1" 
                           value="${watermark.lineHeight}" 
                           data-index="${index}" data-property="lineHeight">
                </div>
                
                <!-- Font Family -->
                <div class="watermark-control">
                    <div class="watermark-control-label">
                        <span>Font</span>
                    </div>
                    <select class="font-family-select" data-index="${index}" data-property="fontFamily">
                        <option value="Arial" ${watermark.fontFamily === 'Arial' ? 'selected' : ''}>Arial (Default)</option>
                        <option value="Open Sans" ${watermark.fontFamily === 'Open Sans' ? 'selected' : ''}>Open Sans</option>
                        <option value="Roboto" ${watermark.fontFamily === 'Roboto' ? 'selected' : ''}>Roboto</option>
                        <option value="Roboto Condensed" ${watermark.fontFamily === 'Roboto Condensed' ? 'selected' : ''}>Roboto Condensed</option>
                        <option value="Lato" ${watermark.fontFamily === 'Lato' ? 'selected' : ''}>Lato</option>
                        <option value="Montserrat" ${watermark.fontFamily === 'Montserrat' ? 'selected' : ''}>Montserrat</option>
                        <option value="Playfair Display" ${watermark.fontFamily === 'Playfair Display' ? 'selected' : ''}>Playfair Display</option>
                    </select>
                </div>
                
                <!-- Text Color -->
                <div class="watermark-control">
                    <div class="watermark-control-label">
                        <span>Text Color</span>
                    </div>
                    <div class="color-input-group">
                        <input type="color" class="text-color-picker" value="${rgbaToHex(watermark.textColor)}" data-index="${index}">
                        <input type="range" class="slider text-alpha-slider" min="0" max="100" 
                               value="${Math.round(getAlpha(watermark.textColor) * 100)}" 
                               data-index="${index}" data-property="textAlpha">
                        <span class="alpha-value">${Math.round(getAlpha(watermark.textColor) * 100)}%</span>
                    </div>
                </div>
                
                <!-- Bold & Italic -->
                <div class="watermark-control">
                    <div class="watermark-control-label">
                        <span>Style</span>
                    </div>
                    <div class="style-buttons">
                        <label class="style-toggle">
                            <input type="checkbox" class="bold-toggle" data-index="${index}" ${watermark.fontWeight === 'bold' ? 'checked' : ''}>
                            <span><i class="fas fa-bold"></i> Bold</span>
                        </label>
                        <label class="style-toggle">
                            <input type="checkbox" class="italic-toggle" data-index="${index}" ${watermark.fontStyle === 'italic' ? 'checked' : ''}>
                            <span><i class="fas fa-italic"></i> Italic</span>
                        </label>
                    </div>
                </div>
                
                <!-- Text Align -->
                <div class="watermark-control">
                    <div class="watermark-control-label">
                        <span>Align</span>
                    </div>
                    <div class="align-buttons">
                        <button type="button" class="align-btn ${watermark.textAlign === 'left' ? 'active' : ''}" 
                                data-index="${index}" data-align="left">
                            <i class="fas fa-align-left"></i> Left
                        </button>
                        <button type="button" class="align-btn ${watermark.textAlign === 'center' ? 'active' : ''}" 
                                data-index="${index}" data-align="center">
                            <i class="fas fa-align-center"></i> Center
                        </button>
                        <button type="button" class="align-btn ${watermark.textAlign === 'right' ? 'active' : ''}" 
                                data-index="${index}" data-align="right">
                            <i class="fas fa-align-right"></i> Right
                        </button>
                    </div>
                </div>
                
                <!-- Multiply Mode -->
                <div class="watermark-control-group">
                    <div class="watermark-control-header">
                        <label class="watermark-toggle">
                            <input type="checkbox" class="multiply-toggle" data-index="${index}" ${watermark.multiply ? 'checked' : ''}>
                            <span><i class="fas fa-th"></i> Multiply</span>
                        </label>
                    </div>
                    <div class="watermark-control-subgroup" style="display: ${watermark.multiply ? 'block' : 'none'};">
                        <label class="watermark-toggle" style="margin-top: 0.5rem;">
                            <input type="checkbox" class="multiply-grid-toggle" data-index="${index}" ${watermark.multiplyGrid ? 'checked' : ''}>
                            <span>Grid</span>
                        </label>
                        <label class="watermark-toggle" style="margin-top: 0.5rem;">
                            <input type="checkbox" class="multiply-random-toggle" data-index="${index}" ${watermark.multiplyRandom ? 'checked' : ''}>
                            <span>Randomly</span>
                        </label>
                    </div>
                </div>
        ` : `
                <!-- Image Size (only for images) -->
                <div class="watermark-control">
                    <div class="watermark-control-label">
                        <span>Size</span>
                        <span>${watermark.size}%</span>
                    </div>
                    <input type="range" class="slider size-slider" min="10" max="200" 
                           value="${watermark.size}" 
                           data-index="${index}" data-property="size">
                </div>
        `;
        
        item.innerHTML = headerHTML + `
            <div class="watermark-controls">
                ${textControlsHTML}
                
                <!-- Common Controls -->
                <div class="watermark-control">
                    <div class="watermark-control-label">
                        <span>Opacity</span>
                        <span>${Math.round(watermark.opacity * 100)}%</span>
                    </div>
                    <input type="range" class="slider opacity-slider" min="0" max="100" 
                           value="${watermark.opacity * 100}" 
                           data-index="${index}" data-property="opacity">
                </div>
                <div class="watermark-control">
                    <div class="watermark-control-label">
                        <span>Rotation</span>
                        <span>${watermark.rotation}°</span>
                    </div>
                    <input type="range" class="slider rotation-slider" min="0" max="360" 
                           value="${watermark.rotation}" 
                           data-index="${index}" data-property="rotation">
                </div>
                
                <!-- Shadow Controls -->
                <div class="watermark-control-group">
                    <div class="watermark-control-header">
                        <label class="watermark-toggle">
                            <input type="checkbox" class="shadow-toggle" data-index="${index}" ${watermark.shadowEnabled ? 'checked' : ''}>
                            <span><i class="fas fa-shadow"></i> Shadow</span>
                        </label>
                    </div>
                    <div class="watermark-control-subgroup" style="display: ${watermark.shadowEnabled ? 'block' : 'none'};">
                        <div class="watermark-control">
                            <div class="watermark-control-label">
                                <span>Blur</span>
                                <span>${watermark.shadowBlur}px</span>
                            </div>
                            <input type="range" class="slider shadow-blur-slider" min="0" max="20" 
                                   value="${watermark.shadowBlur}" 
                                   data-index="${index}" data-property="shadowBlur">
                        </div>
                        <div class="watermark-control">
                            <div class="watermark-control-label">
                                <span>Offset X</span>
                                <span>${watermark.shadowOffsetX}px</span>
                            </div>
                            <input type="range" class="slider shadow-offset-x-slider" min="-20" max="20" 
                                   value="${watermark.shadowOffsetX}" 
                                   data-index="${index}" data-property="shadowOffsetX">
                        </div>
                        <div class="watermark-control">
                            <div class="watermark-control-label">
                                <span>Offset Y</span>
                                <span>${watermark.shadowOffsetY}px</span>
                            </div>
                            <input type="range" class="slider shadow-offset-y-slider" min="-20" max="20" 
                                   value="${watermark.shadowOffsetY}" 
                                   data-index="${index}" data-property="shadowOffsetY">
                        </div>
                        <div class="watermark-control">
                            <div class="watermark-control-label">
                                <span>Color</span>
                            </div>
                            <div class="color-input-group">
                                <input type="color" class="shadow-color-picker" value="${shadowColorHex}" data-index="${index}">
                                <input type="range" class="slider shadow-alpha-slider" min="0" max="100" 
                                       value="${Math.round(shadowAlpha * 100)}" 
                                       data-index="${index}" data-property="shadowAlpha">
                                <span class="alpha-value">${Math.round(shadowAlpha * 100)}%</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Background Controls -->
                <div class="watermark-control-group">
                    <div class="watermark-control-header">
                        <label class="watermark-toggle">
                            <input type="checkbox" class="background-toggle" data-index="${index}" ${watermark.backgroundEnabled ? 'checked' : ''}>
                            <span><i class="fas fa-square"></i> Background</span>
                        </label>
                    </div>
                    <div class="watermark-control-subgroup" style="display: ${watermark.backgroundEnabled ? 'block' : 'none'};">
                        <div class="watermark-control">
                            <div class="watermark-control-label">
                                <span>Color</span>
                            </div>
                            <div class="color-input-group">
                                <input type="color" class="background-color-picker" value="${bgColorHex}" data-index="${index}">
                                <input type="range" class="slider background-alpha-slider" min="0" max="100" 
                                       value="${Math.round(bgAlpha * 100)}" 
                                       data-index="${index}" data-property="backgroundAlpha">
                                <span class="alpha-value">${Math.round(bgAlpha * 100)}%</span>
                            </div>
                        </div>
                        <div class="watermark-control">
                            <div class="watermark-control-label">
                                <span>Padding</span>
                                <span>${watermark.backgroundPadding}px</span>
                            </div>
                            <input type="range" class="slider background-padding-slider" min="0" max="20" 
                                   value="${watermark.backgroundPadding}" 
                                   data-index="${index}" data-property="backgroundPadding">
                        </div>
                        <div class="watermark-control">
                            <div class="watermark-control-label">
                                <span><i class="fas fa-border-all"></i> Rounded Corners</span>
                                <span>${watermark.borderRadius}px</span>
                            </div>
                            <input type="range" class="slider border-radius-slider" min="0" max="50" 
                                   value="${watermark.borderRadius}" 
                                   data-index="${index}" data-property="borderRadius">
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        watermarkList.appendChild(item);
        
        // Add event listeners
        const deleteBtn = item.querySelector('.watermark-delete-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeWatermark(index);
        });
        
        const opacitySlider = item.querySelector('.opacity-slider');
        opacitySlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value) / 100;
            updateWatermarkProperty(index, 'opacity', value);
            e.target.closest('.watermark-control').querySelector('.watermark-control-label span:last-child').textContent = Math.round(value * 100) + '%';
        });
        
        const sizeSlider = item.querySelector('.size-slider');
        if (sizeSlider) {
            sizeSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                updateWatermarkProperty(index, 'size', value);
                e.target.closest('.watermark-control').querySelector('.watermark-control-label span:last-child').textContent = value + '%';
            });
        }
        
        // Text-specific controls
        if (watermark.type === 'text') {
            // Text input
            const textInput = item.querySelector('.text-watermark-input-field');
            textInput.addEventListener('input', (e) => {
                updateWatermarkProperty(index, 'text', e.target.value);
                // Update name
                const newName = `Text: ${e.target.value.substring(0, 20)}${e.target.value.length > 20 ? '...' : ''}`;
                updateWatermarkProperty(index, 'name', newName);
                item.querySelector('.watermark-item-title').textContent = newName;
            });
            
            // Font size
            const fontSizeSlider = item.querySelector('.font-size-slider');
            fontSizeSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                updateWatermarkProperty(index, 'fontSize', value);
                e.target.closest('.watermark-control').querySelector('.watermark-control-label span:last-child').textContent = value + 'px';
            });
            
            // Line height
            const lineHeightSlider = item.querySelector('.line-height-slider');
            lineHeightSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                updateWatermarkProperty(index, 'lineHeight', value);
                e.target.closest('.watermark-control').querySelector('.watermark-control-label span:last-child').textContent = value;
            });
            
            // Font family
            const fontFamilySelect = item.querySelector('.font-family-select');
            fontFamilySelect.addEventListener('change', (e) => {
                updateWatermarkProperty(index, 'fontFamily', e.target.value);
            });
            
            // Text color
            const textColorPicker = item.querySelector('.text-color-picker');
            const textAlphaSlider = item.querySelector('.text-alpha-slider');
            const updateTextColor = () => {
                const hex = textColorPicker.value;
                const alpha = parseInt(textAlphaSlider.value) / 100;
                const rgb = hexToRgb(hex);
                const rgba = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
                updateWatermarkProperty(index, 'textColor', rgba);
                textAlphaSlider.closest('.color-input-group').querySelector('.alpha-value').textContent = Math.round(alpha * 100) + '%';
            };
            textColorPicker.addEventListener('input', updateTextColor);
            textAlphaSlider.addEventListener('input', updateTextColor);
            
            // Bold toggle
            const boldToggle = item.querySelector('.bold-toggle');
            boldToggle.addEventListener('change', (e) => {
                updateWatermarkProperty(index, 'fontWeight', e.target.checked ? 'bold' : 'normal');
            });
            
            // Italic toggle
            const italicToggle = item.querySelector('.italic-toggle');
            italicToggle.addEventListener('change', (e) => {
                updateWatermarkProperty(index, 'fontStyle', e.target.checked ? 'italic' : 'normal');
            });
            
            // Align buttons
            const alignButtons = item.querySelectorAll('.align-btn');
            alignButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const align = e.target.closest('.align-btn').dataset.align;
                    updateWatermarkProperty(index, 'textAlign', align);
                    alignButtons.forEach(b => b.classList.remove('active'));
                    e.target.closest('.align-btn').classList.add('active');
                });
            });
            
            // Multiply toggle
            const multiplyToggle = item.querySelector('.multiply-toggle');
            if (multiplyToggle) {
                multiplyToggle.addEventListener('change', (e) => {
                updateWatermarkProperty(index, 'multiply', e.target.checked);
                if (e.target.checked && mainImages.length > 0 && currentPreviewIndex >= 0 && currentPreviewIndex < mainImages.length) {
                    // Always set multiply area to full image (100% coverage)
                    updateWatermarkProperty(index, 'multiplyArea', {
                        xPercent: 0,
                        yPercent: 0,
                        widthPercent: 100,
                        heightPercent: 100,
                        offsetX: 0,
                        offsetY: 0
                    });
                }
                    // Show/hide multiply options
                    const subgroup = item.querySelector('.watermark-control-subgroup');
                    if (subgroup && subgroup.previousElementSibling && subgroup.previousElementSibling.querySelector('.multiply-toggle')) {
                        subgroup.style.display = e.target.checked ? 'block' : 'none';
                    }
                    updatePreview();
                });
            }
            
            // Multiply Grid toggle
            const multiplyGridToggle = item.querySelector('.multiply-grid-toggle');
            if (multiplyGridToggle) {
                multiplyGridToggle.addEventListener('change', (e) => {
                    updateWatermarkProperty(index, 'multiplyGrid', e.target.checked);
                    // If grid is checked, uncheck random
                    if (e.target.checked) {
                        const randomToggle = item.querySelector('.multiply-random-toggle');
                        if (randomToggle && randomToggle.checked) {
                            randomToggle.checked = false;
                            updateWatermarkProperty(index, 'multiplyRandom', false);
                        }
                    }
                    updatePreview();
                });
            }
            
            // Multiply Random toggle
            const multiplyRandomToggle = item.querySelector('.multiply-random-toggle');
            if (multiplyRandomToggle) {
                multiplyRandomToggle.addEventListener('change', (e) => {
                    updateWatermarkProperty(index, 'multiplyRandom', e.target.checked);
                    // If random is checked, uncheck grid
                    if (e.target.checked) {
                        const gridToggle = item.querySelector('.multiply-grid-toggle');
                        if (gridToggle && gridToggle.checked) {
                            gridToggle.checked = false;
                            updateWatermarkProperty(index, 'multiplyGrid', false);
                        }
                    }
                    updatePreview();
                });
            }
        }
        
        const rotationSlider = item.querySelector('.rotation-slider');
        rotationSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            updateWatermarkProperty(index, 'rotation', value);
            e.target.closest('.watermark-control').querySelector('.watermark-control-label span:last-child').textContent = value + '°';
        });
        
        // Shadow controls
        const shadowToggle = item.querySelector('.shadow-toggle');
        shadowToggle.addEventListener('change', (e) => {
            updateWatermarkProperty(index, 'shadowEnabled', e.target.checked);
            const subgroup = e.target.closest('.watermark-control-group').querySelector('.watermark-control-subgroup');
            subgroup.style.display = e.target.checked ? 'block' : 'none';
        });
        
        const shadowBlurSlider = item.querySelector('.shadow-blur-slider');
        shadowBlurSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            updateWatermarkProperty(index, 'shadowBlur', value);
            e.target.closest('.watermark-control').querySelector('.watermark-control-label span:last-child').textContent = value + 'px';
        });
        
        const shadowOffsetXSlider = item.querySelector('.shadow-offset-x-slider');
        shadowOffsetXSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            updateWatermarkProperty(index, 'shadowOffsetX', value);
            e.target.closest('.watermark-control').querySelector('.watermark-control-label span:last-child').textContent = value + 'px';
        });
        
        const shadowOffsetYSlider = item.querySelector('.shadow-offset-y-slider');
        shadowOffsetYSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            updateWatermarkProperty(index, 'shadowOffsetY', value);
            e.target.closest('.watermark-control').querySelector('.watermark-control-label span:last-child').textContent = value + 'px';
        });
        
        const shadowColorPicker = item.querySelector('.shadow-color-picker');
        const shadowAlphaSlider = item.querySelector('.shadow-alpha-slider');
        const updateShadowColor = () => {
            const hex = shadowColorPicker.value;
            const alpha = parseInt(shadowAlphaSlider.value) / 100;
            const rgb = hexToRgb(hex);
            const rgba = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
            updateWatermarkProperty(index, 'shadowColor', rgba);
            shadowAlphaSlider.closest('.color-input-group').querySelector('.alpha-value').textContent = Math.round(alpha * 100) + '%';
        };
        shadowColorPicker.addEventListener('input', updateShadowColor);
        shadowAlphaSlider.addEventListener('input', updateShadowColor);
        
        // Background controls
        const backgroundToggle = item.querySelector('.background-toggle');
        backgroundToggle.addEventListener('change', (e) => {
            updateWatermarkProperty(index, 'backgroundEnabled', e.target.checked);
            const subgroup = e.target.closest('.watermark-control-group').querySelector('.watermark-control-subgroup');
            subgroup.style.display = e.target.checked ? 'block' : 'none';
        });
        
        const backgroundColorPicker = item.querySelector('.background-color-picker');
        const backgroundAlphaSlider = item.querySelector('.background-alpha-slider');
        const updateBackgroundColor = () => {
            const hex = backgroundColorPicker.value;
            const alpha = parseInt(backgroundAlphaSlider.value) / 100;
            const rgb = hexToRgb(hex);
            const rgba = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
            updateWatermarkProperty(index, 'backgroundColor', rgba);
            backgroundAlphaSlider.closest('.color-input-group').querySelector('.alpha-value').textContent = Math.round(alpha * 100) + '%';
        };
        backgroundColorPicker.addEventListener('input', updateBackgroundColor);
        backgroundAlphaSlider.addEventListener('input', updateBackgroundColor);
        
        const backgroundPaddingSlider = item.querySelector('.background-padding-slider');
        backgroundPaddingSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            updateWatermarkProperty(index, 'backgroundPadding', value);
            e.target.closest('.watermark-control').querySelector('.watermark-control-label span:last-child').textContent = value + 'px';
        });
        
        // Border radius (only available when background is enabled)
        const borderRadiusSlider = item.querySelector('.border-radius-slider');
        if (borderRadiusSlider) {
            borderRadiusSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                updateWatermarkProperty(index, 'borderRadius', value);
                e.target.closest('.watermark-control').querySelector('.watermark-control-label span:last-child').textContent = value + 'px';
            });
        }
        
        // Select watermark on click (but not on control clicks)
        item.addEventListener('click', (e) => {
            if (!e.target.closest('input') && !e.target.closest('button') && !e.target.closest('select') && !e.target.closest('label')) {
                selectedWatermarkIndex = index;
                updateWatermarkList();
            }
        });
    });
}

// Helper function to convert hex to RGB
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
}

function updateWatermarkProperty(index, property, value) {
    if (watermarks[index]) {
        watermarks[index][property] = value;
        updatePreview();
    }
}

function removeWatermark(index) {
    watermarks.splice(index, 1);
    if (selectedWatermarkIndex === index) {
        selectedWatermarkIndex = -1;
    } else if (selectedWatermarkIndex > index) {
        selectedWatermarkIndex--;
    }
    updateWatermarkList();
    updatePreview();
}

// Canvas interaction
function getCanvasCoordinates(e) {
    const rect = previewCanvas.getBoundingClientRect();
    const scaleX = previewCanvas.width / rect.width;
    const scaleY = previewCanvas.height / rect.height;
    
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

// Helper functions for percentage-based positioning
function getWatermarkPixelPosition(watermark, imageWidth, imageHeight) {
    return {
        x: (watermark.xPercent / 100) * imageWidth,
        y: (watermark.yPercent / 100) * imageHeight
    };
}

function getWatermarkPercentPosition(x, y, imageWidth, imageHeight) {
    return {
        xPercent: (x / imageWidth) * 100,
        yPercent: (y / imageHeight) * 100
    };
}

function getMultiplyAreaPixels(watermark, imageWidth, imageHeight) {
    const area = watermark.multiplyArea;
    return {
        x: (area.xPercent / 100) * imageWidth,
        y: (area.yPercent / 100) * imageHeight,
        width: (area.widthPercent / 100) * imageWidth,
        height: (area.heightPercent / 100) * imageHeight,
        offsetX: area.offsetX,
        offsetY: area.offsetY
    };
}

function getWatermarkBounds(watermark) {
    // Get current image dimensions for conversion
    const mainImg = mainImages[currentPreviewIndex].image;
    
    if (watermark.type === 'text') {
        if (watermark.multiply) {
            // Return multiply area bounds (convert from percentages)
            const area = getMultiplyAreaPixels(watermark, mainImg.width, mainImg.height);
            return {
                x: area.x,
                y: area.y,
                width: area.width,
                height: area.height
            };
        } else {
            // Estimate text bounds
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            const fontStyle = watermark.fontStyle === 'italic' ? 'italic' : 'normal';
            const fontWeight = watermark.fontWeight === 'bold' ? 'bold' : 'normal';
            const fontFamily = watermark.fontFamily || 'Arial';
            tempCtx.font = `${fontStyle} ${fontWeight} ${watermark.fontSize}px "${fontFamily}", Arial, sans-serif`;
            tempCtx.textAlign = 'left'; // Use left align for accurate measurement
            
            const lines = watermark.text.split('\n');
            const lineHeight = watermark.fontSize * watermark.lineHeight;
            const textWidth = Math.max(...lines.map(line => tempCtx.measureText(line).width));
            const textHeight = lines.length * lineHeight;
            const padding = watermark.backgroundEnabled ? watermark.backgroundPadding : 0;
            
            // Convert percentage position to pixels
            const pixelPos = getWatermarkPixelPosition(watermark, mainImg.width, mainImg.height);
            
            return {
                x: pixelPos.x - (textWidth / 2 + padding),
                y: pixelPos.y - (textHeight / 2 + padding),
                width: textWidth + (padding * 2),
                height: textHeight + (padding * 2)
            };
        }
    } else {
        // Image watermark
        const size = watermark.size / 100;
        const width = watermark.width * size;
        const height = watermark.height * size;
        
        // Calculate rotated bounds
        const rad = (watermark.rotation * Math.PI) / 180;
        const cos = Math.abs(Math.cos(rad));
        const sin = Math.abs(Math.sin(rad));
        
        const rotatedWidth = width * cos + height * sin;
        const rotatedHeight = width * sin + height * cos;
        
        // Convert percentage position to pixels
        const pixelPos = getWatermarkPixelPosition(watermark, mainImg.width, mainImg.height);
        
        return {
            x: pixelPos.x - rotatedWidth / 2,
            y: pixelPos.y - rotatedHeight / 2,
            width: rotatedWidth,
            height: rotatedHeight
        };
    }
}

function isPointInWatermark(x, y, watermark) {
    // Get current image dimensions for conversion
    const mainImg = mainImages[currentPreviewIndex].image;
    
    if (watermark.type === 'text' && watermark.multiply) {
        // Check if point is in multiply area or on resize handles
        const area = getMultiplyAreaPixels(watermark, mainImg.width, mainImg.height);
        const handleSize = 10;
        const handles = [
            { x: area.x, y: area.y }, // top-left
            { x: area.x + area.width, y: area.y }, // top-right
            { x: area.x, y: area.y + area.height }, // bottom-left
            { x: area.x + area.width, y: area.y + area.height } // bottom-right
        ];
        
        // Check resize handles
        for (let handle of handles) {
            if (x >= handle.x - handleSize && x <= handle.x + handleSize &&
                y >= handle.y - handleSize && y <= handle.y + handleSize) {
                return true;
            }
        }
        
        // Check if in area
        return x >= area.x && x <= area.x + area.width &&
               y >= area.y && y <= area.y + area.height;
    }
    
    const bounds = getWatermarkBounds(watermark);
    return x >= bounds.x && x <= bounds.x + bounds.width &&
           y >= bounds.y && y <= bounds.y + bounds.height;
}

function getResizeHandle(x, y, watermark) {
    if (watermark.type !== 'text' || !watermark.multiply) return null;
    
    // Get current image dimensions and convert multiply area percentages to pixels
    const mainImg = mainImages[currentPreviewIndex].image;
    const area = getMultiplyAreaPixels(watermark, mainImg.width, mainImg.height);
    const handleSize = 10;
    const handles = [
        { x: area.x, y: area.y, corner: 'nw' }, // top-left
        { x: area.x + area.width, y: area.y, corner: 'ne' }, // top-right
        { x: area.x, y: area.y + area.height, corner: 'sw' }, // bottom-left
        { x: area.x + area.width, y: area.y + area.height, corner: 'se' } // bottom-right
    ];
    
    for (let handle of handles) {
        if (x >= handle.x - handleSize && x <= handle.x + handleSize &&
            y >= handle.y - handleSize && y <= handle.y + handleSize) {
            return handle.corner;
        }
    }
    
    return null;
}

function handleCanvasMouseDown(e) {
    if (!mainImages.length || currentPreviewIndex < 0 || currentPreviewIndex >= mainImages.length || watermarks.length === 0) return;
    
    const coords = getCanvasCoordinates(e);
    
    // Check if clicking on a watermark (check from last to first for proper z-order)
    for (let i = watermarks.length - 1; i >= 0; i--) {
        const watermark = watermarks[i];
        
        // Check for resize handle first (text multiply mode)
        if (watermark.type === 'text' && watermark.multiply) {
            const handle = getResizeHandle(coords.x, coords.y, watermark);
            if (handle) {
                selectedWatermarkIndex = i;
                isResizingMultiplyArea = true;
                resizeHandle = handle;
                dragOffset.x = coords.x;
                dragOffset.y = coords.y;
                previewCanvas.style.cursor = getResizeCursor(handle);
                e.preventDefault();
                return;
            }
        }
        
        if (isPointInWatermark(coords.x, coords.y, watermark)) {
            selectedWatermarkIndex = i;
            isDragging = true;
            
            if (watermark.type === 'text' && watermark.multiply) {
                // Dragging multiply pattern (offsets)
                // Initialize offsets if they don't exist
                if (watermark.multiplyArea.offsetX === undefined) watermark.multiplyArea.offsetX = 0;
                if (watermark.multiplyArea.offsetY === undefined) watermark.multiplyArea.offsetY = 0;
                
                // Store initial offset and mouse position for dragging pattern
                dragOffset.x = coords.x;
                dragOffset.y = coords.y;
                dragOffset.initialOffsetX = watermark.multiplyArea.offsetX;
                dragOffset.initialOffsetY = watermark.multiplyArea.offsetY;
            } else {
                // Dragging watermark position - get pixel position for drag offset calculation
                const mainImg = mainImages[currentPreviewIndex].image;
                const pixelPos = getWatermarkPixelPosition(watermark, mainImg.width, mainImg.height);
                dragOffset.x = coords.x - pixelPos.x;
                dragOffset.y = coords.y - pixelPos.y;
            }
            
            previewCanvas.style.cursor = 'grabbing';
            previewCanvas.classList.add('dragging');
            updateWatermarkList();
            e.preventDefault();
            return;
        }
    }
    
    // If not clicking on watermark, deselect
    selectedWatermarkIndex = -1;
    updateWatermarkList();
}

function getResizeCursor(handle) {
    const cursors = {
        'nw': 'nw-resize',
        'ne': 'ne-resize',
        'sw': 'sw-resize',
        'se': 'se-resize'
    };
    return cursors[handle] || 'default';
}

function handleCanvasMouseMove(e) {
    const coords = getCanvasCoordinates(e);
    
    // Handle resize
    // Multiply area is always fullscreen - no resizing allowed
    // Only offset positioning is allowed via dragging
    if (isResizingMultiplyArea && selectedWatermarkIndex !== -1 && mainImages.length > 0 && currentPreviewIndex >= 0 && currentPreviewIndex < mainImages.length) {
        // Keep multiply area at fullscreen dimensions (100% coverage)
        const watermark = watermarks[selectedWatermarkIndex];
        watermark.multiplyArea.xPercent = 0;
        watermark.multiplyArea.yPercent = 0;
        watermark.multiplyArea.widthPercent = 100;
        watermark.multiplyArea.heightPercent = 100;
        
        dragOffset.x = coords.x;
        dragOffset.y = coords.y;
        updatePreview();
        return;
    }
    
    if (!isDragging || selectedWatermarkIndex === -1) {
        // Update cursor if hovering over watermark
        if (mainImages.length > 0 && currentPreviewIndex >= 0 && currentPreviewIndex < mainImages.length && watermarks.length > 0) {
            let hovering = false;
            for (let i = watermarks.length - 1; i >= 0; i--) {
                const watermark = watermarks[i];
                
                // Check resize handles
                if (watermark.type === 'text' && watermark.multiply) {
                    const handle = getResizeHandle(coords.x, coords.y, watermark);
                    if (handle) {
                        previewCanvas.style.cursor = getResizeCursor(handle);
                        hovering = true;
                        break;
                    }
                }
                
                if (isPointInWatermark(coords.x, coords.y, watermark)) {
                    previewCanvas.style.cursor = 'grab';
                    hovering = true;
                    break;
                }
            }
            if (!hovering) {
                previewCanvas.style.cursor = 'default';
            }
        }
        return;
    }
    
    const watermark = watermarks[selectedWatermarkIndex];
    
    if (watermark.type === 'text' && watermark.multiply && !isResizingMultiplyArea) {
        // Dragging multiply pattern (updating offsets)
        const deltaX = coords.x - dragOffset.x;
        const deltaY = coords.y - dragOffset.y;
        
        // Update offsets based on drag delta
        watermark.multiplyArea.offsetX = dragOffset.initialOffsetX + deltaX;
        watermark.multiplyArea.offsetY = dragOffset.initialOffsetY + deltaY;
        
        // Constrain offsets to reasonable range
        watermark.multiplyArea.offsetX = Math.max(-500, Math.min(500, watermark.multiplyArea.offsetX));
        watermark.multiplyArea.offsetY = Math.max(-500, Math.min(500, watermark.multiplyArea.offsetY));
    } else {
        // Update position - convert pixel coordinates to percentages
        const mainImg = mainImages[currentPreviewIndex].image;
        const newX = coords.x - dragOffset.x;
        const newY = coords.y - dragOffset.y;
        
        // Constrain within canvas bounds first
        const bounds = getWatermarkBounds(watermark);
        const minX = bounds.width / 2;
        const minY = bounds.height / 2;
        const maxX = previewCanvas.width - bounds.width / 2;
        const maxY = previewCanvas.height - bounds.height / 2;
        
        const constrainedX = Math.max(minX, Math.min(maxX, newX));
        const constrainedY = Math.max(minY, Math.min(maxY, newY));
        
        // Convert to percentages
        const percentPos = getWatermarkPercentPosition(constrainedX, constrainedY, mainImg.width, mainImg.height);
        watermark.xPercent = Math.max(0, Math.min(100, percentPos.xPercent));
        watermark.yPercent = Math.max(0, Math.min(100, percentPos.yPercent));
    }
    
    updatePreview();
}

function handleCanvasMouseUp(e) {
    if (isDragging) {
        isDragging = false;
        previewCanvas.style.cursor = 'default';
        previewCanvas.classList.remove('dragging');
    }
    if (isResizingMultiplyArea) {
        isResizingMultiplyArea = false;
        resizeHandle = null;
        previewCanvas.style.cursor = 'default';
    }
}

function updatePreview(drawSelectionIndicators = true) {
    if (!mainImages.length || currentPreviewIndex < 0 || currentPreviewIndex >= mainImages.length) return;
    
    const mainImg = mainImages[currentPreviewIndex].image;
    const canvas = previewCanvas;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw main image
    ctx.drawImage(mainImg, 0, 0);
    
    // Draw watermarks
    watermarks.forEach((watermark, index) => {
        if (watermark.type === 'text') {
            drawTextWatermark(ctx, watermark, index, drawSelectionIndicators);
        } else {
            drawImageWatermark(ctx, watermark, index, drawSelectionIndicators);
        }
    });
}

function drawImageWatermark(ctx, watermark, index, drawSelectionIndicators = true) {
    ctx.save();
    
    // Get current image dimensions
    const mainImg = mainImages[currentPreviewIndex].image;
    const pixelPos = getWatermarkPixelPosition(watermark, mainImg.width, mainImg.height);
    
    // Move to watermark center
    ctx.translate(pixelPos.x, pixelPos.y);
    
    // Rotate
    ctx.rotate((watermark.rotation * Math.PI) / 180);
    
    // Calculate size
    const size = watermark.size / 100;
    const width = watermark.width * size;
    const height = watermark.height * size;
    
    // Calculate bounds with padding for background
    const padding = watermark.backgroundEnabled ? watermark.backgroundPadding : 0;
    const totalWidth = width + (padding * 2);
    const totalHeight = height + (padding * 2);
    const offsetX = -totalWidth / 2;
    const offsetY = -totalHeight / 2;
    const imageOffsetX = -width / 2 + padding;
    const imageOffsetY = -height / 2 + padding;
    
    // Create rounded rectangle path for clipping
    const borderRadius = watermark.borderRadius;
    const path = createRoundedRectPath(offsetX, offsetY, totalWidth, totalHeight, borderRadius);
    
    // Draw background if enabled
    if (watermark.backgroundEnabled) {
        ctx.save();
        ctx.fillStyle = watermark.backgroundColor;
        if (borderRadius > 0) {
            ctx.fill(path);
        } else {
            ctx.fillRect(offsetX, offsetY, totalWidth, totalHeight);
        }
        ctx.restore();
    }
    
    // Apply clipping for rounded corners
    if (borderRadius > 0) {
        ctx.clip(path);
    }
    
    // Apply shadow if enabled
    if (watermark.shadowEnabled) {
        ctx.shadowBlur = watermark.shadowBlur;
        ctx.shadowOffsetX = watermark.shadowOffsetX;
        ctx.shadowOffsetY = watermark.shadowOffsetY;
        ctx.shadowColor = watermark.shadowColor;
    } else {
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowColor = 'transparent';
    }
    
    // Apply opacity
    ctx.globalAlpha = watermark.opacity;
    
    // Draw watermark image
    ctx.drawImage(
        watermark.image,
        imageOffsetX,
        imageOffsetY,
        width,
        height
    );
    
    ctx.restore();
    
    // Draw selection indicator (only in preview, not in export)
    if (drawSelectionIndicators && selectedWatermarkIndex === index) {
        ctx.save();
        ctx.translate(watermark.x, watermark.y);
        ctx.rotate((watermark.rotation * Math.PI) / 180);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        if (borderRadius > 0) {
            const selectionPath = createRoundedRectPath(offsetX - 2, offsetY - 2, totalWidth + 4, totalHeight + 4, borderRadius + 2);
            ctx.stroke(selectionPath);
        } else {
            ctx.strokeRect(offsetX - 2, offsetY - 2, totalWidth + 4, totalHeight + 4);
        }
        ctx.setLineDash([]);
        ctx.restore();
    }
}

function drawTextWatermark(ctx, watermark, index, drawSelectionIndicators = true) {
    ctx.save();
    
    // Set font
    const fontStyle = watermark.fontStyle === 'italic' ? 'italic' : 'normal';
    const fontWeight = watermark.fontWeight === 'bold' ? 'bold' : 'normal';
    const fontFamily = watermark.fontFamily || 'Arial';
    ctx.font = `${fontStyle} ${fontWeight} ${watermark.fontSize}px "${fontFamily}", Arial, sans-serif`;
    ctx.textAlign = watermark.textAlign || 'center';
    ctx.textBaseline = 'middle';
    
    // Apply opacity
    ctx.globalAlpha = watermark.opacity;
    
    // Apply shadow if enabled
    if (watermark.shadowEnabled) {
        ctx.shadowBlur = watermark.shadowBlur;
        ctx.shadowOffsetX = watermark.shadowOffsetX;
        ctx.shadowOffsetY = watermark.shadowOffsetY;
        ctx.shadowColor = watermark.shadowColor;
    } else {
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowColor = 'transparent';
    }
    
    if (watermark.multiply) {
        // Multiply mode - draw text in grid pattern
        drawTextMultiply(ctx, watermark, index, drawSelectionIndicators);
    } else {
        // Single text watermark
        drawSingleText(ctx, watermark, index, drawSelectionIndicators);
    }
    
    ctx.restore();
}

function drawSingleText(ctx, watermark, index, drawSelectionIndicators = true) {
    ctx.save();
    
    // Get current image dimensions and convert percentage to pixels
    const mainImg = mainImages[currentPreviewIndex].image;
    const pixelPos = getWatermarkPixelPosition(watermark, mainImg.width, mainImg.height);
    
    // Move to watermark position
    ctx.translate(pixelPos.x, pixelPos.y);
    
    // Rotate
    ctx.rotate((watermark.rotation * Math.PI) / 180);
    
    // Measure text
    const lines = watermark.text.split('\n');
    const lineHeight = watermark.fontSize * watermark.lineHeight;
    const totalHeight = lines.length * lineHeight;
    const startY = -totalHeight / 2 + lineHeight / 2;
    
    // Measure text width accurately (always use left align for measurement)
    ctx.textAlign = 'left';
    const textWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
    const textAlign = watermark.textAlign || 'center';
    ctx.textAlign = textAlign; // Set the actual alignment for drawing
    
    // Calculate text bounding box based on alignment
    let textLeft, textRight;
    if (textAlign === 'left') {
        textLeft = 0;
        textRight = textWidth;
    } else if (textAlign === 'right') {
        textLeft = -textWidth;
        textRight = 0;
    } else { // center
        textLeft = -textWidth / 2;
        textRight = textWidth / 2;
    }
    
    // Calculate actual text bounds (where text actually appears)
    // First line is at startY, last line is at startY + (lines.length - 1) * lineHeight
    const textTop = startY - lineHeight / 2; // Top of first line
    const textBottom = startY + (lines.length - 1) * lineHeight + lineHeight / 2; // Bottom of last line
    
    // Draw background if enabled
    if (watermark.backgroundEnabled) {
        ctx.save();
        ctx.fillStyle = watermark.backgroundColor;
        const padding = watermark.backgroundPadding;
        
        // Calculate background bounds to properly contain the text with padding on all sides
        const bgLeft = textLeft - padding;
        const bgRight = textRight + padding;
        const bgTop = textTop - padding; // Padding above first line
        const bgBottom = textBottom + padding; // Padding below last line
        
        const bgWidth = bgRight - bgLeft;
        const bgHeight = bgBottom - bgTop;
        const bgX = bgLeft;
        const bgY = bgTop;
        
        if (watermark.borderRadius > 0) {
            const bgPath = createRoundedRectPath(bgX, bgY, bgWidth, bgHeight, watermark.borderRadius);
            ctx.fill(bgPath);
        } else {
            ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
        }
        ctx.restore();
    }
    
    // Set text color - ensure it's explicitly set
    ctx.fillStyle = watermark.textColor || 'rgba(0, 0, 0, 1)';
    
    // Draw text lines
    lines.forEach((line, i) => {
        ctx.fillText(line, 0, startY + (i * lineHeight));
    });
    
    ctx.restore();
    
    // Draw selection indicator (only in preview, not in export)
    if (drawSelectionIndicators && selectedWatermarkIndex === index) {
        ctx.save();
        ctx.translate(watermark.x, watermark.y);
        ctx.rotate((watermark.rotation * Math.PI) / 180);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        // Use the same calculation as background for consistency
        const selLines = watermark.text.split('\n');
        const selLineHeight = watermark.fontSize * watermark.lineHeight;
        const selTotalHeight = selLines.length * selLineHeight;
        
        ctx.textAlign = 'left';
        const selTextWidth = Math.max(...selLines.map(line => ctx.measureText(line).width));
        const selTextAlign = watermark.textAlign || 'center';
        
        // Calculate bounds based on alignment
        let selTextLeft, selTextRight;
        if (selTextAlign === 'left') {
            selTextLeft = 0;
            selTextRight = selTextWidth;
        } else if (selTextAlign === 'right') {
            selTextLeft = -selTextWidth;
            selTextRight = 0;
        } else { // center
            selTextLeft = -selTextWidth / 2;
            selTextRight = selTextWidth / 2;
        }
        
        const selPadding = watermark.backgroundEnabled ? watermark.backgroundPadding : 0;
        const selLeft = selTextLeft - selPadding - 2;
        const selRight = selTextRight + selPadding + 2;
        const selTop = -selTotalHeight / 2 - selPadding - 2;
        const selBottom = selTotalHeight / 2 + selPadding + 2;
        
        const selWidth = selRight - selLeft;
        const selHeight = selBottom - selTop;
        
        ctx.strokeRect(selLeft, selTop, selWidth, selHeight);
        ctx.setLineDash([]);
        ctx.restore();
    }
}

function drawTextMultiply(ctx, watermark, index, drawSelectionIndicators = true) {
    // Get current image dimensions and convert multiply area percentages to pixels
    const mainImg = mainImages[currentPreviewIndex].image;
    const area = getMultiplyAreaPixels(watermark, mainImg.width, mainImg.height);
    
    // Draw background over whole multiply area if enabled
    if (watermark.backgroundEnabled) {
        ctx.save();
        ctx.fillStyle = watermark.backgroundColor;
        const borderRadius = watermark.borderRadius || 0;
        
        if (borderRadius > 0) {
            const bgPath = createRoundedRectPath(area.x, area.y, area.width, area.height, borderRadius);
            ctx.fill(bgPath);
        } else {
            ctx.fillRect(area.x, area.y, area.width, area.height);
        }
        ctx.restore();
    }
    
    ctx.save(); // Save context state before measurements
    
    const lines = watermark.text.split('\n');
    const lineHeight = watermark.fontSize * watermark.lineHeight;
    const textHeight = lines.length * lineHeight;
    
    // Measure text width for accurate spacing
    ctx.textAlign = 'left';
    const textWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
    
    ctx.restore(); // Restore context state after measurements
    
    // Calculate spacing based on text size with padding
    // Add padding to prevent overlap - use text width + extra space
    const paddingX = watermark.fontSize * 2; // Extra horizontal padding
    const paddingY = textHeight * 0.5; // Extra vertical padding
    const spacingX = textWidth + paddingX; // Horizontal spacing based on actual text width
    const spacingY = textHeight + paddingY; // Vertical spacing based on text height
    
    // Determine which pattern to use (default to grid if both are false or both are true)
    const useGrid = watermark.multiplyGrid !== false; // Default to grid
    const useRandom = watermark.multiplyRandom === true;
    
    if (useRandom) {
        // Random pattern - place watermarks randomly within the area
        const numInstances = Math.floor((area.width * area.height) / (spacingX * spacingY));
        const minInstances = Math.max(10, numInstances); // At least 10 instances
        
        for (let i = 0; i < minInstances; i++) {
            // Random position within the area
            const x = area.x + Math.random() * area.width;
            const y = area.y + Math.random() * area.height;
            
            // Random rotation (optional, can use watermark.rotation or random)
            const rotation = watermark.rotation + (Math.random() - 0.5) * 30; // ±15 degrees variation
            
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.fillStyle = watermark.textColor || 'rgba(0, 0, 0, 1)';
            
            lines.forEach((line, j) => {
                ctx.fillText(line, 0, (j * lineHeight) - textHeight / 2 + lineHeight / 2);
            });
            
            ctx.restore();
        }
    } else {
        // Grid pattern (default)
        // Apply offsets for grid positioning
        const offsetX = area.offsetX || 0;
        const offsetY = area.offsetY || 0;
        
        // Draw text in grid pattern with offsets
        for (let y = area.y + offsetY; y < area.y + area.height; y += spacingY) {
            for (let x = area.x + offsetX; x < area.x + area.width; x += spacingX) {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate((watermark.rotation * Math.PI) / 180);
                ctx.fillStyle = watermark.textColor || 'rgba(0, 0, 0, 1)'; // Ensure fillStyle is set
                
                lines.forEach((line, i) => {
                    ctx.fillText(line, 0, (i * lineHeight) - textHeight / 2 + lineHeight / 2);
                });
                
                ctx.restore();
            }
        }
    }
    
    // Draw multiply area indicator if selected (only in preview, not in export)
    // Note: Multiply area is always fullscreen, no resize handles needed
    if (drawSelectionIndicators && selectedWatermarkIndex === index) {
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(area.x, area.y, area.width, area.height);
        ctx.setLineDash([]);
        ctx.restore();
    }
}

// Helper function to create rounded rectangle path
function createRoundedRectPath(x, y, width, height, radius) {
    const path = new Path2D();
    if (radius === 0) {
        path.rect(x, y, width, height);
        return path;
    }
    const r = Math.min(radius, width / 2, height / 2);
    path.moveTo(x + r, y);
    path.lineTo(x + width - r, y);
    path.quadraticCurveTo(x + width, y, x + width, y + r);
    path.lineTo(x + width, y + height - r);
    path.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    path.lineTo(x + r, y + height);
    path.quadraticCurveTo(x, y + height, x, y + height - r);
    path.lineTo(x, y + r);
    path.quadraticCurveTo(x, y, x + r, y);
    path.closePath();
    return path;
}

function downloadImage(format) {
    if (!mainImages.length || currentPreviewIndex < 0 || currentPreviewIndex >= mainImages.length) {
        alert('Please upload an image first');
        return;
    }
    
    // If multiple images, process all and create ZIP
    if (mainImages.length > 1) {
        downloadAllImages(format);
        return;
    }
    
    // Single image download (existing logic)
    // Update preview without selection indicators for export
    updatePreview(false);
    
    const canvas = previewCanvas;
    let mimeType, fileExtension, quality;
    
    // Get quality from slider (default to 70 if slider not found)
    const qualityPercent = qualitySlider ? parseInt(qualitySlider.value) : 70;
    const qualityDecimal = qualityPercent / 100;
    
    if (format === 'jpg') {
        mimeType = 'image/jpeg';
        fileExtension = 'jpg';
        quality = qualityDecimal; // JPG quality from slider
    } else if (format === 'webp') {
        mimeType = 'image/webp';
        fileExtension = 'webp';
        quality = qualityDecimal; // WebP quality from slider
    } else {
        mimeType = 'image/png';
        fileExtension = 'png';
        quality = undefined; // PNG doesn't use quality parameter
    }
    
    canvas.toBlob(function(blob) {
        if (!blob) {
            alert('Error generating image. Please try again.');
            return;
        }
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `watermarked-image.${fileExtension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Restore preview with selection indicators after download
        updatePreview(true);
    }, mimeType, quality);
}

function resetAll() {
    if (confirm('Are you sure you want to reset? This will clear all uploaded images and watermarks.')) {
        mainImages = [];
        currentPreviewIndex = 0;
        watermarks = [];
        selectedWatermarkIndex = -1;
        isDragging = false;
        isResizingMultiplyArea = false;
        resizeHandle = null;
        
        previewPlaceholder.style.display = 'block';
        canvasWrapper.style.display = 'none';
        previewControls.style.display = 'none';
        watermarkList.innerHTML = '';
        
        mainImageInput.value = '';
        watermarkInput.value = '';
        
        // Clear image list
        updateImageList();
    }
}

function updateImageList() {
    const imageListContainer = document.getElementById('imageListContainer');
    const previewImageCount = document.getElementById('previewImageCount');
    
    // Update preview count
    if (previewImageCount) {
        if (mainImages.length > 1) {
            previewImageCount.textContent = `(Image ${currentPreviewIndex + 1} of ${mainImages.length})`;
            previewImageCount.style.display = 'inline';
        } else if (mainImages.length === 1) {
            previewImageCount.style.display = 'none';
        } else {
            previewImageCount.style.display = 'none';
        }
    }
    
    if (!imageListContainer) return;
    
    if (mainImages.length === 0) {
        imageListContainer.innerHTML = '';
        return;
    }
    
    let html = `<div class="image-list-header"><strong>${mainImages.length} image${mainImages.length > 1 ? 's' : ''} uploaded</strong></div>`;
    html += '<div class="image-list-grid">';
    
    mainImages.forEach((imgData, index) => {
        const isActive = index === currentPreviewIndex;
        html += `
            <div class="image-list-item ${isActive ? 'active' : ''}" data-image-index="${index}">
                <button class="image-remove-btn" data-image-index="${index}" title="Remove image">
                    <i class="fas fa-times"></i>
                </button>
                <div class="image-list-thumbnail">
                    <img src="${imgData.data.src}" alt="${imgData.data.name}">
                    ${isActive ? '<span class="preview-badge">Preview</span>' : ''}
                </div>
                <div class="image-list-name">${imgData.data.name}</div>
            </div>
        `;
    });
    
    html += '</div>';
    imageListContainer.innerHTML = html;
    
    // Add event listeners
    const imageItems = imageListContainer.querySelectorAll('.image-list-item');
    imageItems.forEach(item => {
        item.addEventListener('click', (e) => {
            // Don't switch if clicking the remove button
            if (e.target.closest('.image-remove-btn')) {
                return;
            }
            const index = parseInt(item.dataset.imageIndex);
            switchPreviewImage(index);
        });
    });
    
    const removeButtons = imageListContainer.querySelectorAll('.image-remove-btn');
    removeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering the item click
            const index = parseInt(btn.dataset.imageIndex);
            removeImage(index);
        });
    });
}

function switchPreviewImage(index) {
    if (index < 0 || index >= mainImages.length) return;
    
    currentPreviewIndex = index;
    const imgData = mainImages[index];
    const img = imgData.image;
    
    // Update canvas size
    previewCanvas.width = img.width;
    previewCanvas.height = img.height;
    
    // Update preview
    updatePreview();
    
    // Update image list to show active state
    updateImageList();
}

function removeImage(index) {
    if (index < 0 || index >= mainImages.length) return;
    
    // Confirm removal
    if (!confirm(`Are you sure you want to remove "${mainImages[index].data.name}"?`)) {
        return;
    }
    
    // Remove image
    mainImages.splice(index, 1);
    
    // Adjust preview index if needed
    if (mainImages.length === 0) {
        // No images left, reset everything
        currentPreviewIndex = 0;
        previewPlaceholder.style.display = 'block';
        canvasWrapper.style.display = 'none';
        previewControls.style.display = 'none';
        updateImageList();
        return;
    }
    
    // If we removed the currently previewed image or one before it, adjust index
    if (index <= currentPreviewIndex) {
        currentPreviewIndex = Math.max(0, currentPreviewIndex - 1);
    }
    
    // If currentPreviewIndex is now out of bounds, set to last image
    if (currentPreviewIndex >= mainImages.length) {
        currentPreviewIndex = mainImages.length - 1;
    }
    
    // Update preview with new image
    const imgData = mainImages[currentPreviewIndex];
    const img = imgData.image;
    
    previewCanvas.width = img.width;
    previewCanvas.height = img.height;
    
    updatePreview();
    updateImageList();
}

async function downloadAllImages(format) {
    if (!mainImages.length || watermarks.length === 0) {
        alert('Please upload images and add watermarks first');
        return;
    }
    
    // Show progress
    const progressContainer = document.getElementById('downloadProgress');
    if (progressContainer) {
        progressContainer.style.display = 'block';
        progressContainer.innerHTML = '<div class="progress-text">Processing images...</div>';
    }
    
    try {
        // Load JSZip library dynamically if not already loaded
        if (typeof JSZip === 'undefined') {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
        }
        
        const zip = new JSZip();
        const quality = qualitySlider ? parseInt(qualitySlider.value) / 100 : 0.7;
        
        let mimeType, fileExtension;
        if (format === 'png') {
            mimeType = 'image/png';
            fileExtension = 'png';
        } else if (format === 'jpg') {
            mimeType = 'image/jpeg';
            fileExtension = 'jpg';
        } else if (format === 'webp') {
            mimeType = 'image/webp';
            fileExtension = 'webp';
        }
        
        // Store original preview index to restore later
        const originalPreviewIndex = currentPreviewIndex;
        
        // Process each image
        for (let i = 0; i < mainImages.length; i++) {
            const imgData = mainImages[i];
            const img = imgData.image;
            
            // Temporarily set currentPreviewIndex to this image so drawing functions use correct dimensions
            currentPreviewIndex = i;
            
            // Create temporary canvas for this image
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = img.width;
            tempCanvas.height = img.height;
            const tempCtx = tempCanvas.getContext('2d');
            
            // Draw main image
            tempCtx.drawImage(img, 0, 0);
            
            // Draw all watermarks (without selection indicators)
            // These functions will use currentPreviewIndex to convert percentages to pixels
            watermarks.forEach((watermark, wIndex) => {
                if (watermark.type === 'image') {
                    drawImageWatermark(tempCtx, watermark, wIndex, false);
                } else if (watermark.type === 'text') {
                    drawTextWatermark(tempCtx, watermark, wIndex, false);
                }
            });
            
            // Convert canvas to blob
            const blob = await new Promise((resolve) => {
                tempCanvas.toBlob((blob) => resolve(blob), mimeType, quality);
            });
            
            // Add to ZIP
            const fileName = imgData.data.name.replace(/\.[^/.]+$/, '') || `image-${i + 1}`;
            zip.file(`${fileName}-watermarked.${fileExtension}`, blob);
            
            // Update progress
            if (progressContainer) {
                progressContainer.innerHTML = `<div class="progress-text">Processing image ${i + 1} of ${mainImages.length}...</div>`;
            }
        }
        
        // Generate ZIP file
        if (progressContainer) {
            progressContainer.innerHTML = '<div class="progress-text">Creating ZIP file...</div>';
        }
        
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        
        // Download ZIP
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'easy-plugins-watermark.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Restore original preview index
        currentPreviewIndex = originalPreviewIndex;
        
        // Hide progress
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
        
        // Restore preview
        updatePreview(true);
        
    } catch (error) {
        console.error('Error creating ZIP:', error);
        alert('Error creating ZIP file. Please try again.');
        
        // Restore original preview index in case of error
        if (typeof originalPreviewIndex !== 'undefined') {
            currentPreviewIndex = originalPreviewIndex;
        }
        
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
    }
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

