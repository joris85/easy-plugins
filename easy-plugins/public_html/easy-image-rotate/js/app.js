// Easy Image Rotate - Rotate Images with Real-Time Preview

const QUALITY_PRESETS = [50, 60, 70, 85, 100];

// State
let currentImage = null;
let currentImageData = null;
let rotationAngle = 0;
let originalFileName = null;
let currentQuality = 85;
let selectedFormat = 'webp';
let selectedBackground = 'transparent';
let customBackgroundColor = '#ffffff';
let backgroundBeforeJpgLock = null;

// DOM Elements
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const previewCanvas = document.getElementById('previewCanvas');
const previewPlaceholder = document.getElementById('previewPlaceholder');
const previewControls = document.getElementById('previewControls');
const rotationControls = document.getElementById('rotationControls');
const imageInfo = document.getElementById('imageInfo');
const rotationSlider = document.getElementById('rotationSlider');
const customRotationSlider = document.getElementById('customRotationSlider');
const angleValue = document.getElementById('angleValue');
const qualitySlider = document.getElementById('qualitySlider');
const qualityValue = document.getElementById('qualityValue');
const customQualitySlider = document.getElementById('customQualitySlider');
const imageName = document.getElementById('imageName');
const imageDimensions = document.getElementById('imageDimensions');
const imageSize = document.getElementById('imageSize');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const previewContainer = document.getElementById('previewContainer');
const customBackgroundPicker = document.getElementById('customBackgroundPicker');
const backgroundColorInput = document.getElementById('backgroundColorInput');
const backgroundColorValue = document.getElementById('backgroundColorValue');
const backgroundJpgNote = document.getElementById('backgroundJpgNote');
const bgTransparentBtn = document.getElementById('bgTransparentBtn');

document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
});

function initializeEventListeners() {
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', handleDragOver);
    dropzone.addEventListener('dragleave', handleDragLeave);
    dropzone.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFileSelect);

    if (rotationSlider) {
        rotationSlider.addEventListener('input', (e) => {
            updateRotation(parseInt(e.target.value, 10), true);
        });
    }

    document.querySelectorAll('.rotation-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setRotationPreset(btn.dataset.angle);
        });
    });

    document.querySelectorAll('.quality-btn[data-quality]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.quality === 'custom') {
                setQuality('custom');
            } else {
                setQuality(parseInt(btn.dataset.quality, 10));
            }
        });
    });

    if (qualitySlider) {
        qualitySlider.addEventListener('input', (e) => {
            currentQuality = parseInt(e.target.value, 10);
            if (qualityValue) {
                qualityValue.textContent = currentQuality + '%';
            }
            document.querySelectorAll('.quality-btn[data-quality]').forEach(b => {
                b.classList.remove('active');
            });
            const customBtn = document.querySelector('.quality-btn[data-quality="custom"]');
            if (customBtn) {
                customBtn.classList.add('active');
            }
            updateQualitySlider();
        });
    }

    document.querySelectorAll('.format-btn[data-format]').forEach(btn => {
        btn.addEventListener('click', () => {
            setFormat(btn.dataset.format);
        });
    });

    document.querySelectorAll('.bg-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!btn.disabled) {
                setBackground(btn.dataset.background);
            }
        });
    });

    if (backgroundColorInput) {
        backgroundColorInput.addEventListener('input', (e) => {
            customBackgroundColor = e.target.value;
            if (backgroundColorValue) {
                backgroundColorValue.textContent = customBackgroundColor;
            }
            setBackground('custom');
        });
    }

    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadImage);
    }
    if (resetBtn) {
        resetBtn.addEventListener('click', resetAll);
    }
}

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
    const validation = EasyUpload.validateImageFile(file);
    if (!validation.ok) {
        alert(validation.error);
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        loadImage(e.target.result, file.type, file.name, file.size);
    };
    reader.readAsDataURL(file);
}

function loadImage(src, mimeType, fileName, fileSize) {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = function() {
        // Half the shared cap: a 45° rotation makes the canvas up to 2x the area
        const sizeError = EasyCanvas.sourceSizeError(img.width, img.height, EasyCanvas.MAX_SOURCE_PIXELS / 2);
        if (sizeError) {
            alert(sizeError);
            return;
        }

        currentImage = img;
        currentImageData = { src, mimeType, fileName, fileSize };
        originalFileName = fileName;

        setRotationPreset('0');

        previewPlaceholder.style.display = 'none';
        previewCanvas.style.display = 'block';
        previewControls.style.display = 'block';
        rotationControls.style.display = 'block';
        imageInfo.style.display = 'flex';

        updateImageInfo();
        updatePreview();
    };

    img.onerror = function() {
        alert('Error loading image. Please try another file.');
    };

    img.src = src;
}

function updateImageInfo() {
    if (!currentImage || !currentImageData) return;

    imageName.textContent = currentImageData.fileName || 'Unknown';
    imageDimensions.textContent = `${currentImage.width} × ${currentImage.height} px`;

    const sizeInMB = (currentImageData.fileSize / 1024 / 1024).toFixed(2);
    imageSize.textContent = `${sizeInMB} MB`;
}

function setRotationPreset(angle) {
    document.querySelectorAll('.rotation-btn').forEach(b => {
        b.classList.remove('active');
    });

    if (angle === 'custom') {
        const customBtn = document.querySelector('.rotation-btn[data-angle="custom"]');
        if (customBtn) {
            customBtn.classList.add('active');
        }
        if (customRotationSlider) {
            customRotationSlider.style.display = 'block';
        }
        updateRotation(parseInt(rotationSlider.value, 10) || rotationAngle, true);
        return;
    }

    if (customRotationSlider) {
        customRotationSlider.style.display = 'none';
    }

    const numAngle = parseInt(angle, 10);
    const presetBtn = document.querySelector('.rotation-btn[data-angle="' + numAngle + '"]');
    if (presetBtn) {
        presetBtn.classList.add('active');
    }

    updateRotation(numAngle, false);
}

function updateRotation(angle, fromCustomSlider) {
    rotationAngle = ((angle % 360) + 360) % 360;

    if (rotationSlider) {
        rotationSlider.value = rotationAngle;
    }
    if (angleValue) {
        angleValue.textContent = rotationAngle + '°';
    }

    if (fromCustomSlider) {
        document.querySelectorAll('.rotation-btn').forEach(b => {
            b.classList.remove('active');
        });
        const customBtn = document.querySelector('.rotation-btn[data-angle="custom"]');
        if (customBtn) {
            customBtn.classList.add('active');
        }
        if (customRotationSlider) {
            customRotationSlider.style.display = 'block';
        }
    }

    updatePreview();
}

function setQuality(value) {
    let targetQuality;
    let useCustom = false;

    if (value === 'custom') {
        useCustom = true;
        targetQuality = parseInt(qualitySlider.value, 10) || EasyCanvas.DEFAULT_QUALITY;
    } else {
        const num = typeof value === 'number' ? value : parseInt(value, 10);
        if (!Number.isFinite(num) || num < 1 || num > 100) {
            return;
        }
        if (QUALITY_PRESETS.includes(num)) {
            targetQuality = num;
        } else {
            useCustom = true;
            targetQuality = num;
        }
    }

    document.querySelectorAll('.quality-btn[data-quality]').forEach(b => {
        b.classList.remove('active');
    });

    if (useCustom) {
        const customBtn = document.querySelector('.quality-btn[data-quality="custom"]');
        if (customBtn) {
            customBtn.classList.add('active');
        }
        if (qualitySlider) {
            qualitySlider.value = targetQuality;
        }
        if (qualityValue) {
            qualityValue.textContent = targetQuality + '%';
        }
        currentQuality = targetQuality;
    } else {
        const presetBtn = document.querySelector('.quality-btn[data-quality="' + targetQuality + '"]');
        if (presetBtn) {
            presetBtn.classList.add('active');
            currentQuality = targetQuality;
        }
    }

    updateQualitySlider();
}

function updateQualitySlider() {
    const isCustom = document.querySelector('.quality-btn[data-quality="custom"].active');
    if (customQualitySlider) {
        customQualitySlider.style.display = isCustom ? 'block' : 'none';
    }
    if (!isCustom && qualitySlider && qualityValue) {
        qualitySlider.value = getNumericQuality();
        qualityValue.textContent = getNumericQuality() + '%';
    }
}

function getNumericQuality() {
    const quality = parseInt(currentQuality, 10);
    return Number.isFinite(quality) ? Math.max(1, Math.min(100, quality)) : EasyCanvas.DEFAULT_QUALITY;
}

function supportsTransparency() {
    return selectedFormat !== 'jpg';
}

function getBackgroundColor() {
    if (selectedBackground === 'transparent') {
        return supportsTransparency() ? null : '#ffffff';
    }
    if (selectedBackground === 'white') {
        return '#ffffff';
    }
    if (selectedBackground === 'black') {
        return '#000000';
    }
    if (selectedBackground === 'custom') {
        return customBackgroundColor || '#ffffff';
    }
    return null;
}

function applyCanvasBackground(ctx, width, height) {
    const color = getBackgroundColor();
    ctx.clearRect(0, 0, width, height);
    if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, width, height);
    }
}

function setBackground(value) {
    if (value === 'transparent' && !supportsTransparency()) {
        return;
    }

    selectedBackground = value;

    document.querySelectorAll('.bg-btn').forEach(b => {
        b.classList.remove('active');
    });
    const btn = document.querySelector('.bg-btn[data-background="' + value + '"]');
    if (btn && !btn.disabled) {
        btn.classList.add('active');
    }

    if (customBackgroundPicker) {
        customBackgroundPicker.style.display = value === 'custom' ? 'block' : 'none';
    }

    if (value === 'custom' && backgroundColorInput) {
        customBackgroundColor = backgroundColorInput.value;
        if (backgroundColorValue) {
            backgroundColorValue.textContent = customBackgroundColor;
        }
    }

    updatePreviewContainerBackground();
    updatePreview();
}

function updateBackgroundForFormat() {
    const isJpg = selectedFormat === 'jpg';

    if (bgTransparentBtn) {
        bgTransparentBtn.disabled = isJpg;
        bgTransparentBtn.classList.toggle('disabled', isJpg);
        if (isJpg) {
            bgTransparentBtn.classList.remove('active');
        }
    }

    if (backgroundJpgNote) {
        backgroundJpgNote.style.display = isJpg ? 'block' : 'none';
    }

    if (isJpg) {
        if (selectedBackground === 'transparent') {
            backgroundBeforeJpgLock = 'transparent';
            selectedBackground = 'white';
            document.querySelectorAll('.bg-btn').forEach(b => {
                b.classList.remove('active');
            });
            const whiteBtn = document.querySelector('.bg-btn[data-background="white"]');
            if (whiteBtn) {
                whiteBtn.classList.add('active');
            }
            if (customBackgroundPicker) {
                customBackgroundPicker.style.display = 'none';
            }
        }
    } else if (backgroundBeforeJpgLock === 'transparent') {
        backgroundBeforeJpgLock = null;
        setBackground('transparent');
        return;
    }

    updatePreviewContainerBackground();
    updatePreview();
}

function updatePreviewContainerBackground() {
    if (!previewContainer) {
        return;
    }

    const showCheckerboard = selectedBackground === 'transparent' && supportsTransparency();
    previewContainer.classList.toggle('transparent-preview', showCheckerboard);
}

function setFormat(format) {
    if (format !== 'jpg' && format !== 'png' && format !== 'webp') {
        return;
    }

    document.querySelectorAll('.format-btn').forEach(b => {
        b.classList.remove('active');
    });
    const btn = document.querySelector('.format-btn[data-format="' + format + '"]');
    if (btn) {
        btn.classList.add('active');
    }
    selectedFormat = format;
    updateBackgroundForFormat();
}

function renderRotatedToCanvas(canvas) {
    if (!currentImage) return null;

    const ctx = canvas.getContext('2d');

    const radians = (rotationAngle * Math.PI) / 180;
    const cos = Math.abs(Math.cos(radians));
    const sin = Math.abs(Math.sin(radians));
    canvas.width = currentImage.width * cos + currentImage.height * sin;
    canvas.height = currentImage.width * sin + currentImage.height * cos;

    // Resizing the canvas resets context state, so set smoothing after
    EasyCanvas.applyHighQualitySmoothing(ctx);

    applyCanvasBackground(ctx, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(radians);
    ctx.drawImage(
        currentImage,
        -currentImage.width / 2,
        -currentImage.height / 2
    );
    ctx.restore();

    return canvas;
}

function updatePreview() {
    if (!currentImage) return;

    renderRotatedToCanvas(previewCanvas);
    updatePreviewContainerBackground();
}

function getRotatedCanvas() {
    if (!currentImage) return null;

    return renderRotatedToCanvas(document.createElement('canvas'));
}

function downloadImage() {
    if (!currentImage) {
        alert('Please upload an image first');
        return;
    }

    const canvas = getRotatedCanvas();
    if (!canvas) {
        alert('Error generating rotated image. Please try again.');
        return;
    }

    const format = selectedFormat || 'webp';
    let mimeType;
    let fileExtension;

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

    const fileName = EasyCanvas.exportFilename(
        originalFileName,
        `rotated-${rotationAngle}deg`,
        fileExtension
    );

    EasyCanvas.toBlob(canvas, mimeType, getNumericQuality())
        .then(function(blob) {
            EasyCanvas.downloadBlob(blob, fileName);
        })
        .catch(function() {
            alert('Error generating image. Please try again.');
        });
}

function resetAll() {
    if (confirm('Are you sure you want to reset? This will clear the uploaded image.')) {
        currentImage = null;
        currentImageData = null;
        rotationAngle = 0;
        originalFileName = null;

        previewPlaceholder.style.display = 'block';
        previewCanvas.style.display = 'none';
        previewControls.style.display = 'none';
        rotationControls.style.display = 'none';
        imageInfo.style.display = 'none';

        setRotationPreset('0');
        setQuality(85);
        setFormat('webp');
        setBackground('transparent');
        backgroundBeforeJpgLock = null;
        customBackgroundColor = '#ffffff';
        if (backgroundColorInput) {
            backgroundColorInput.value = '#ffffff';
        }
        if (backgroundColorValue) {
            backgroundColorValue.textContent = '#ffffff';
        }
        if (customBackgroundPicker) {
            customBackgroundPicker.style.display = 'none';
        }

        fileInput.value = '';

        const ctx = previewCanvas.getContext('2d');
        ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    }
}
