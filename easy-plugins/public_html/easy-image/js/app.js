// Make functions available globally
window.showQualityInfo = function() {
    document.getElementById('qualityInfoModal').style.display = 'block';
};

window.showEnhanceInfo = function() {
    document.getElementById('enhanceInfoModal').style.display = 'block';
};

window.showCropUpscaleInfo = function() {
    document.getElementById('cropUpscaleInfoModal').style.display = 'block';
};

// Whether a too-small crop selection may be enlarged to the target size
window.allowCropUpscale = false;

window.showFormatInfo = function() {
    document.getElementById('formatInfoModal').style.display = 'block';
};

// Global variables
const BATCH_SIZE = 8;
const MAX_PARALLEL_UPLOADS = 3;
const RETRY_DELAY_MS = 750;
const UPLOAD_OVERHEAD_BYTES = 64 * 1024;
const APP_MAX_FILE_BYTES = 50 * 1024 * 1024;
const APP_MAX_TOTAL_BYTES = 256 * 1024 * 1024;

// What the server's ImageMagick supports; updated from check_imagick.php
let serverFormats = { heicInput: false, avifOutput: false };

function isHeicFile(file) {
    const type = (file && file.type ? file.type : '').toLowerCase();
    if (type === 'image/heic' || type === 'image/heif') {
        return true;
    }
    const extension = (file && file.name ? file.name : '').split('.').pop().toLowerCase();
    return extension === 'heic' || extension === 'heif';
}

const ORIENT_DEBUG = new URLSearchParams(window.location.search).has('orient_debug');
const SHOW_STATS = new URLSearchParams(window.location.search).has('stats');
let lastOrientationDebugReports = [];
let lastOrientationLogFile = null;

const SERVER_LIMITS_DEFAULTS = {
    post_max_size_bytes: 8 * 1024 * 1024,
    upload_max_filesize_bytes: 2 * 1024 * 1024,
    post_max_size: '8M',
    upload_max_filesize: '2M'
};

let serverLimits = Object.assign({ loaded: false }, SERVER_LIMITS_DEFAULTS);

let uploadedFiles = [];
let processedImages = [];
let currentMode = 'resize';
let suppressUrlSync = false;
let currentQuality = 70;
let currentQualityTier = 'lossy';
let selectedDimension = 'width';
let selectedAlignment = 'center-middle';
let selectedFormat = 'webp';
let currentImageIndex = 0;
let cropper = null;
let pendingCropData = {};
let lastDownloadRequestedCount = 0;
let lastDownloadFailures = [];
let fileDimensions = {};
let cropSourceMeta = {};
let fileFlags = {};
let cropPreviewObjectUrl = null;
let cropperReady = false;
let previewThumbUrls = [];
let cropEditorMode = 'crop';
let effectSettings = {
    blur: 0,
    sharpen: 0,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    autoEnhance: false,
    normalize: false,
    equalize: false,
    enhance: false,
    emboss: false,
    edge: false,
    charcoal: false
};

function getCropPreviewMeta(index) {
    return cropSourceMeta[index] || {
        sourceWidth: 0,
        sourceHeight: 0,
        previewScale: 1,
        usesFullPreview: true
    };
}

function getPreviewToSourceScale(meta, imageData) {
    const sourceWidth = meta.sourceWidth || imageData.naturalWidth;
    const sourceHeight = meta.sourceHeight || imageData.naturalHeight;
    return {
        scaleX: sourceWidth / imageData.naturalWidth,
        scaleY: sourceHeight / imageData.naturalHeight
    };
}

function mapCropDataToSourceSpace(previewCrop, meta, imageData) {
    if (meta.usesFullPreview) {
        return {
            x: previewCrop.x,
            y: previewCrop.y,
            width: previewCrop.width,
            height: previewCrop.height,
            sourceWidth: meta.sourceWidth,
            sourceHeight: meta.sourceHeight,
            sourceSpace: true
        };
    }

    const { scaleX, scaleY } = getPreviewToSourceScale(meta, imageData);
    return {
        x: Math.round(previewCrop.x * scaleX),
        y: Math.round(previewCrop.y * scaleY),
        width: Math.round(previewCrop.width * scaleX),
        height: Math.round(previewCrop.height * scaleY),
        sourceWidth: meta.sourceWidth,
        sourceHeight: meta.sourceHeight,
        sourceSpace: true
    };
}

function syncCropPreviewMetaFromCropper(index) {
    if (!cropper) {
        return;
    }

    const imageData = cropper.getImageData();
    const meta = cropSourceMeta[index];
    if (!meta || !imageData.naturalWidth) {
        return;
    }

    meta.previewNaturalWidth = imageData.naturalWidth;
    meta.previewNaturalHeight = imageData.naturalHeight;
    meta.usesFullPreview = Math.abs(imageData.naturalWidth - meta.sourceWidth) <= 2
        && Math.abs(imageData.naturalHeight - meta.sourceHeight) <= 2;
}

function computeFileLargeFlag(file, width, height) {
    const reasons = [];
    const largeBytes = Config.LARGE_FILE_BYTES || (10 * 1024 * 1024);
    const largeDim = Config.LARGE_MAX_DIMENSION || 5000;

    if (file.size > largeBytes) {
        reasons.push('size');
    }
    if (width > largeDim || height > largeDim) {
        reasons.push('dimensions');
    }

    return {
        isLarge: reasons.length > 0,
        reason: reasons.length === 2 ? 'both' : (reasons[0] || null)
    };
}

function anyLargeFiles(files) {
    return files.some((file) => {
        const globalIndex = uploadedFiles.indexOf(file);
        return globalIndex >= 0 && fileFlags[globalIndex]?.isLarge;
    });
}

function revokeCropPreviewUrl() {
    if (cropPreviewObjectUrl && cropPreviewObjectUrl.startsWith('blob:')) {
        URL.revokeObjectURL(cropPreviewObjectUrl);
    }
    cropPreviewObjectUrl = null;
}

function revokePreviewThumbUrls() {
    previewThumbUrls.forEach((url) => {
        if (url && url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
    });
    previewThumbUrls = [];
}

async function readDisplayDimensions(file) {
    if (typeof createImageBitmap === 'function') {
        try {
            const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
            const dimensions = {
                width: bitmap.width,
                height: bitmap.height
            };
            bitmap.close();
            return dimensions;
        } catch (error) {
            return readImageDimensionsFallback(file);
        }
    }

    return readImageDimensionsFallback(file);
}

async function logClientOrientationPreview(file) {
    if (!ORIENT_DEBUG) {
        return;
    }

    try {
        const storage = await readImageDimensionsFallback(file);
        const display = await readDisplayDimensions(file);
        console.group(`[orient_debug] Client preview: ${file.name}`);
        console.log('storage (naturalWidth):', `${storage.width}x${storage.height}`);
        console.log('display (from-image):', `${display.width}x${display.height}`);
        console.log('match:', storage.width === display.width && storage.height === display.height);
        console.groupEnd();
    } catch (error) {
        console.warn('[orient_debug] Client preview failed:', file.name, error);
    }
}

function renderOrientationDebugPanel(reports, logFile) {
    const panel = document.getElementById('orientationDebugPanel');
    if (!panel) {
        return;
    }

    if (!ORIENT_DEBUG || !Array.isArray(reports) || reports.length === 0) {
        panel.style.display = 'none';
        panel.innerHTML = '';
        return;
    }

    const summaryRows = reports.map((report) => ({
        file: report.original_name || report.file,
        exif: report.exif_orientation_label || report.exif_orientation,
        used: report.orientation_used_label || report.orientation_used,
        rotated: report.pixels_rotated,
        reason: report.normalize_reason || report.stale_guard_reason,
        before: report.dimensions_before,
        after: report.dimensions_after,
        output: report.output_dimensions,
        output_orient: report.output_orientation_label || report.output_orientation
    }));

    panel.style.display = 'block';
    panel.innerHTML = `
        <h3><i class="fas fa-bug"></i> Orientation debug</h3>
        <p class="orientation-debug-hint">Enabled via <code>?orient_debug=1</code>. Full JSON is in the browser console and <code>${escapeHtml(logFile || 'logs/orientation_debug.log')}</code>.</p>
        <pre class="orientation-debug-json">${escapeHtml(JSON.stringify(reports, null, 2))}</pre>
    `;

    console.group('[orient_debug] Server orientation reports');
    console.table(summaryRows);
    console.log('Full reports:', reports);
    if (logFile) {
        console.log('Log file:', logFile);
    }
    console.groupEnd();
}

function readImageDimensionsFallback(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => resolve({
                width: img.naturalWidth,
                height: img.naturalHeight
            });
            img.onerror = () => reject(new Error('Failed to read image dimensions'));
            img.src = event.target.result;
        };
        reader.onerror = () => reject(new Error('Failed to read image file'));
        reader.readAsDataURL(file);
    });
}

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = () => reject(new Error('Failed to read image file'));
        reader.readAsDataURL(file);
    });
}

function getPreviewOutputMime(file) {
    const mimeType = getMimeTypeForFile(file);
    if (mimeType === 'image/png' || mimeType === 'image/webp' || mimeType === 'image/gif') {
        return 'image/png';
    }
    return 'image/jpeg';
}

function downscaleImageToBlobUrl(src, width, height, outputMime = 'image/jpeg') {
    const quality = outputMime === 'image/jpeg' ? 0.85 : undefined;
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Failed to create preview canvas'));
                return;
            }
            if (outputMime !== 'image/jpeg') {
                ctx.clearRect(0, 0, width, height);
            }
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error('Failed to create preview thumbnail'));
                    return;
                }
                resolve(URL.createObjectURL(blob));
            }, outputMime, quality);
        };
        img.onerror = () => reject(new Error('Failed to decode preview image'));
        img.src = src;
    });
}

async function downscaleFileToBlobUrl(file, width, height) {
    const outputMime = getPreviewOutputMime(file);
    const quality = outputMime === 'image/jpeg' ? 0.85 : undefined;

    if (typeof createImageBitmap === 'function') {
        const bitmap = await createImageBitmap(file, {
            imageOrientation: 'from-image',
            resizeWidth: width,
            resizeHeight: height
        });
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            bitmap.close();
            throw new Error('Failed to create preview canvas');
        }
        if (outputMime !== 'image/jpeg') {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close();
        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob((result) => {
                if (result) {
                    resolve(result);
                } else {
                    reject(new Error('Failed to create preview thumbnail'));
                }
            }, outputMime, quality);
        });
        return URL.createObjectURL(blob);
    }

    return downscaleImageToBlobUrl(await fileToDataUrl(file), width, height, outputMime);
}

async function createPreviewThumbnail(file, maxEdge = 400) {
    const dataUrl = await fileToDataUrl(file);
    const dimensions = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({
            width: img.naturalWidth,
            height: img.naturalHeight
        });
        img.onerror = () => reject(new Error('Failed to decode preview image'));
        img.src = dataUrl;
    });

    const sourceWidth = dimensions.width;
    const sourceHeight = dimensions.height;
    const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));

    if (scale >= 1) {
        return {
            url: dataUrl,
            width: sourceWidth,
            height: sourceHeight
        };
    }

    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));

    return {
        url: await downscaleFileToBlobUrl(file, width, height),
        width: sourceWidth,
        height: sourceHeight
    };
}

function getMimeTypeForFilename(filename) {
    const extension = (filename || '').split('.').pop().toLowerCase();
    if (extension === 'webp') {
        return 'image/webp';
    }
    if (extension === 'avif') {
        return 'image/avif';
    }
    if (extension === 'heic' || extension === 'heif') {
        return 'image/heic';
    }
    if (extension === 'png') {
        return 'image/png';
    }
    if (extension === 'gif') {
        return 'image/gif';
    }
    if (extension === 'bmp') {
        return 'image/bmp';
    }
    if (extension === 'jpg' || extension === 'jpeg') {
        return 'image/jpeg';
    }
    return 'image/jpeg';
}

function getMimeTypeForFile(file) {
    const type = (file && file.type ? file.type : '').toLowerCase();
    if (type === 'image/x-webp') {
        return 'image/webp';
    }
    if (type.startsWith('image/')) {
        return type;
    }
    return getMimeTypeForFilename(file && file.name);
}

function splitFilename(filename) {
    const lastDot = (filename || '').lastIndexOf('.');
    if (lastDot <= 0) {
        return { base: filename || 'image', extension: '' };
    }
    return {
        base: filename.slice(0, lastDot),
        extension: filename.slice(lastDot)
    };
}

function sanitizeFilenameBase(base) {
    return (base || '').replace(/[\\/:*?"<>|]/g, '').trim();
}

function buildFilename(base, extension) {
    const safeBase = sanitizeFilenameBase(base);
    return safeBase ? `${safeBase}${extension}` : '';
}

// Shown/downloaded names keep the uploaded filename (with the new extension).
// The token-prefixed name in image.url exists only to keep files from
// different visitors apart on the server.
function displayFilenameFor(originalName, serverName) {
    const extension = splitFilename(serverName || '').extension || '';
    const base = sanitizeFilenameBase(splitFilename(originalName || '').base) || 'image';
    return base + extension;
}

function commitProcessedImageFilename(index, inputEl) {
    const image = processedImages[index];
    if (!image || !inputEl) {
        return;
    }

    const { base, extension } = splitFilename(image.name);
    const newName = buildFilename(inputEl.value, extension);

    if (!newName) {
        inputEl.value = base;
        return;
    }

    image.name = newName;
    inputEl.value = splitFilename(newName).base;
}

// ===== Enhancement selector: none / auto / custom =====

const EFFECT_DEFAULTS = {
    blur: 0, sharpen: 0, brightness: 100, contrast: 100, saturation: 100,
    autoEnhance: false, normalize: false, equalize: false, enhance: false,
    emboss: false, edge: false, charcoal: false
};
let enhanceMode = 'none';
// UI percentage: 50% equals the full adaptive recipe, 100% doubles it
let autoEnhanceStrength = 50;

function countActiveEffects() {
    return Object.keys(EFFECT_DEFAULTS).reduce(
        (count, key) => count + (effectSettings[key] !== EFFECT_DEFAULTS[key] ? 1 : 0), 0
    );
}

function updateEnhanceUi() {
    document.querySelectorAll('.enhance-btn').forEach((b) => {
        b.classList.toggle('active', b.dataset.enhance === enhanceMode);
    });
    const badge = document.getElementById('customEffectsCount');
    if (badge) {
        const n = countActiveEffects();
        badge.textContent = enhanceMode === 'custom' && n > 0 ? ` (${n})` : '';
    }
    // Custom Enhance block only exists in Custom mode
    const customGroup = document.getElementById('customEnhanceGroup');
    if (customGroup) {
        customGroup.style.display = enhanceMode === 'custom' ? '' : 'none';
    }
    // Strength slider only applies to Auto enhance
    const strengthGroup = document.getElementById('autoStrengthGroup');
    if (strengthGroup) {
        strengthGroup.style.display = enhanceMode === 'auto' ? '' : 'none';
    }

    const hasWork = enhanceMode !== 'none' || countActiveEffects() > 0;
    document.querySelectorAll('.enhance-preview-trigger').forEach((btn) => {
        btn.style.display = hasWork && uploadedFiles.length ? '' : 'none';
    });
}

function resetEffectsToDefaults() {
    Object.assign(effectSettings, EFFECT_DEFAULTS);
    const sliderMap = {
        blurSlider: 'blur', sharpenSlider: 'sharpen', brightnessSlider: 'brightness',
        contrastSlider: 'contrast', saturationSlider: 'saturation'
    };
    Object.entries(sliderMap).forEach(([id, key]) => {
        const slider = document.getElementById(id);
        if (slider) {
            slider.value = EFFECT_DEFAULTS[key];
            const valueSpan = slider.parentElement?.querySelector('.effect-value');
            if (valueSpan) {
                valueSpan.textContent = EFFECT_DEFAULTS[key] + '%';
            }
        }
    });
    document.querySelectorAll('.effect-btn').forEach((b) => b.classList.remove('active'));
}

function setEnhanceMode(mode) {
    if (mode !== 'none' && mode !== 'auto' && mode !== 'custom') {
        return;
    }
    enhanceMode = mode;
    if (mode === 'none' || mode === 'auto') {
        resetEffectsToDefaults();
        if (mode === 'auto') {
            effectSettings.autoEnhance = true;
        }
    } else {
        // Custom has no Auto Enhance button; it belongs to Auto mode only
        effectSettings.autoEnhance = false;
    }
    updateEnhanceUi();
    syncEnhanceUrl();
}

// Slider % -> server strength. 50% is the full adaptive recipe; the upper
// half climbs faster so 100% is a clearly bigger jump (quadruple the recipe)
function uiToServerStrength(ui) {
    return ui <= 50 ? ui * 2 : 100 + (ui - 50) * 6;
}

// Keep Auto enhance shareable (URL) and refresh/revisit-proof (localStorage)
function syncEnhanceUrl() {
    try {
        localStorage.setItem('easyImageEnhance', JSON.stringify({
            mode: enhanceMode === 'auto' ? 'auto' : 'none',
            strength: autoEnhanceStrength
        }));
    } catch (e) {
        // Private browsing without storage; the URL still carries the setting
    }
    if (!window.history || !window.history.replaceState) {
        return;
    }
    const params = new URLSearchParams(window.location.search);
    if (enhanceMode === 'auto') {
        params.set('enhance', 'auto');
        params.set('strength', String(autoEnhanceStrength));
    } else {
        params.delete('enhance');
        params.delete('strength');
    }
    const qs = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : '') + window.location.hash);
}

// Any manual effect change means the user is in Custom territory
function noteManualEffectChange() {
    if (enhanceMode !== 'custom') {
        enhanceMode = 'custom';
    }
    updateEnhanceUi();
}

// --- Before/after comparison slider ---

function setComparePosition(percent) {
    const clamped = Math.max(0, Math.min(100, percent));
    const clip = document.getElementById('compareBeforeClip');
    const handle = document.getElementById('compareHandle');
    if (clip) clip.style.width = clamped + '%';
    if (handle) handle.style.left = clamped + '%';
}

function syncCompareImageWidth() {
    // The clipped "before" image must be sized to the full wrap width,
    // otherwise it would squeeze instead of reveal
    const wrap = document.getElementById('compareWrap');
    const beforeImg = document.getElementById('compareBeforeImg');
    if (wrap && beforeImg) {
        beforeImg.style.width = wrap.clientWidth + 'px';
    }
}

function openComparePreview(beforeUrl, afterUrl, filename) {
    const modal = document.getElementById('comparePreviewModal');
    const beforeImg = document.getElementById('compareBeforeImg');
    const afterImg = document.getElementById('compareAfterImg');
    const nameEl = document.getElementById('compareFilename');

    if (nameEl) nameEl.textContent = filename;
    afterImg.onload = () => {
        syncCompareImageWidth();
        setComparePosition(50);
    };
    beforeImg.src = beforeUrl;
    afterImg.src = afterUrl;
    modal.style.display = 'block';
    // In case images are cached and load instantly
    setTimeout(() => { syncCompareImageWidth(); setComparePosition(50); }, 50);
}

document.addEventListener('DOMContentLoaded', function() {
    const wrap = document.getElementById('compareWrap');
    if (wrap) {
        let dragging = false;
        const positionFromEvent = (e) => {
            const rect = wrap.getBoundingClientRect();
            setComparePosition(((e.clientX - rect.left) / rect.width) * 100);
        };
        wrap.addEventListener('pointerdown', (e) => {
            e.preventDefault(); // block the browser's native image drag
            dragging = true;
            try {
                wrap.setPointerCapture(e.pointerId);
            } catch (captureError) {
                // Not all pointer types support capture; dragging still works
            }
            positionFromEvent(e);
        });
        wrap.addEventListener('dragstart', (e) => e.preventDefault());
        wrap.addEventListener('pointermove', (e) => {
            if (dragging) positionFromEvent(e);
        });
        wrap.addEventListener('pointerup', () => { dragging = false; });
        wrap.addEventListener('pointercancel', () => { dragging = false; });
    }
    window.addEventListener('resize', syncCompareImageWidth);
});

window.previewEnhancement = async function(triggerBtn, fileIndex = 0) {
    const file = uploadedFiles[fileIndex];
    if (!file) {
        return;
    }
    const btn = triggerBtn || document.getElementById('enhancePreviewBtn');
    const originalLabel = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = btn.classList.contains('preview-eye-btn')
        ? '<i class="fas fa-cog spinning"></i>'
        : '<i class="fas fa-cog spinning"></i> Making preview...';

    try {
        // Small client-side copy for a fast round-trip
        const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
        const scale = Math.min(1, 700 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.92));
        const beforeUrl = URL.createObjectURL(blob);

        const formData = new FormData();
        formData.append('settings', JSON.stringify({
            mode: 'optimize', quality: 92, qualityTier: 'lossy', format: 'jpg',
            effects: buildEffectsSettings()
        }));
        formData.append('images[]', new File([blob], 'enhance-preview.jpg', { type: 'image/jpeg' }));
        const response = await fetch('process.php', { method: 'POST', body: formData });
        const result = await response.json();
        if (!result.success || !result.images || !result.images.length) {
            throw new Error(result.error || 'Preview failed');
        }

        openComparePreview(beforeUrl, result.images[0].url, file.name);
    } catch (error) {
        alert('Could not create the preview: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalLabel;
    }
};

// ===== Renamer: batch-rename results before downloading =====

// Common replacers: toggleable transforms applied to the final name
const renamerReplacers = {
    lowercase: false, spaceToDash: false, spaceToUnderscore: false,
    removeSpaces: false, removeAccents: false, removeCopyMarkers: false, urlSafe: false
};

function stripAccents(text) {
    return text
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/ø/g, 'o').replace(/Ø/g, 'O')
        .replace(/æ/g, 'ae').replace(/Æ/g, 'AE')
        .replace(/œ/g, 'oe').replace(/Œ/g, 'OE')
        .replace(/ß/g, 'ss');
}

// Fixed, predictable order: copy markers -> accents -> case -> spaces -> URL safe
function applyRenamerReplacers(base) {
    if (renamerReplacers.removeCopyMarkers) {
        base = base
            .replace(/\s*\(\d+\)/g, '')
            .replace(/\s*[-–]?\s*(copy|kopie)(\s*\d+)?$/i, '');
    }
    if (renamerReplacers.removeAccents || renamerReplacers.urlSafe) {
        base = stripAccents(base);
    }
    if (renamerReplacers.lowercase || renamerReplacers.urlSafe) {
        base = base.toLowerCase();
    }
    if (renamerReplacers.spaceToDash) {
        base = base.replace(/\s+/g, '-');
    }
    if (renamerReplacers.spaceToUnderscore) {
        base = base.replace(/\s+/g, '_');
    }
    if (renamerReplacers.removeSpaces) {
        base = base.replace(/\s+/g, '');
    }
    if (renamerReplacers.urlSafe) {
        base = base
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9._-]/g, '')
            .replace(/-{2,}/g, '-')
            .replace(/^[-_.]+|[-_.]+$/g, '');
    }
    return base;
}

function getRenamerSettings() {
    // Every search/replace row with a non-empty search becomes a rule,
    // applied top to bottom
    const pairs = [];
    document.querySelectorAll('#renamerSearchRows .renamer-search-row').forEach((row) => {
        const search = row.querySelector('.renamer-search-input')?.value ?? '';
        const replace = row.querySelector('.renamer-replace-input')?.value ?? '';
        if (search !== '') {
            pairs.push([search, replace]);
        }
    });
    return {
        pattern: document.getElementById('renamerPattern')?.value ?? '{name}',
        pairs,
        start: parseInt(document.getElementById('renamerStart')?.value, 10) || 1,
        prefix: document.getElementById('renamerPrefix')?.value ?? '',
        suffix: document.getElementById('renamerSuffix')?.value ?? '',
        regex: (document.getElementById('renamerRegex')?.value ?? '').slice(0, 200),
        regexReplace: document.getElementById('renamerRegexReplace')?.value ?? '',
        regexIgnoreCase: !!document.getElementById('renamerRegexIgnoreCase')?.checked
    };
}

window.toggleRenamerSection = function(headerBtn) {
    const body = headerBtn.nextElementSibling;
    const chevron = headerBtn.querySelector('i');
    if (!body) {
        return;
    }
    const opening = body.style.display === 'none';
    body.style.display = opening ? '' : 'none';
    headerBtn.setAttribute('aria-expanded', opening ? 'true' : 'false');
    if (chevron) {
        chevron.classList.toggle('fa-chevron-right', !opening);
        chevron.classList.toggle('fa-chevron-down', opening);
    }
};

window.showRegexInfo = function() {
    document.getElementById('regexInfoModal').style.display = 'block';
};

window.addRenamerSearchRow = function() {
    const container = document.getElementById('renamerSearchRows');
    if (!container) {
        return;
    }
    const row = document.createElement('div');
    row.className = 'renamer-row renamer-search-row renamer-search-row-extra';
    row.innerHTML = `
        <div class="renamer-field">
            <input type="text" class="renamer-search-input" placeholder="Search" autocomplete="off" spellcheck="false">
        </div>
        <div class="renamer-field">
            <input type="text" class="renamer-replace-input" placeholder="leave empty to remove" autocomplete="off" spellcheck="false">
        </div>
        <button type="button" class="btn btn-outline-secondary btn-sm renamer-row-btn" title="Remove this rule" aria-label="Remove this rule">
            <i class="fas fa-minus"></i>
        </button>
    `;
    row.querySelectorAll('input').forEach((inp) => inp.addEventListener('input', updateRenamerPreview));
    row.querySelector('.renamer-row-btn').addEventListener('click', () => {
        row.remove();
        updateRenamerPreview();
    });
    container.appendChild(row);
    row.querySelector('.renamer-search-input').focus();
};

// Only show the helper fields the current pattern actually uses
function updateRenamerFieldVisibility() {
    const pattern = document.getElementById('renamerPattern')?.value ?? '';
    const show = (id, on) => {
        const el = document.getElementById(id);
        if (el) el.style.display = on ? '' : 'none';
    };
    show('renamerStartField', /\{n{1,3}\}/.test(pattern));
    show('renamerPrefixField', pattern.includes('{prefix}'));
    show('renamerSuffixField', pattern.includes('{suffix}'));
}

function computeRenamedNames() {
    const { pattern, pairs, start, prefix, suffix, regex, regexReplace, regexIgnoreCase } = getRenamerSettings();
    let regexRule = null;
    if (regex) {
        try {
            regexRule = new RegExp(regex, regexIgnoreCase ? 'gi' : 'g');
        } catch (e) {
            regexRule = null; // invalid pattern: skip silently, error shown in the preview UI
        }
    }
    const today = new Date();
    const yyyy = String(today.getFullYear());
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    let sawIllegalChar = false;
    let duplicateCount = 0;
    const takenNames = new Set();

    const results = processedImages.map((image, index) => {
        // Base on the CURRENT name so Apply can be used multiple times,
        // each round building on the previous one
        let base = splitFilename(image.name).base;
        pairs.forEach(([search, replace]) => {
            base = base.split(search).join(replace);
        });
        if (regexRule) {
            base = base.replace(regexRule, regexReplace);
        }

        const counter = start + index;
        let newBase = pattern
            .split('{prefix}').join(prefix)
            .split('{suffix}').join(suffix)
            .split('{name}').join(base)
            .split('{nnn}').join(String(counter).padStart(3, '0'))
            .split('{nn}').join(String(counter).padStart(2, '0'))
            .split('{n}').join(String(counter))
            .split('{date}').join(dateStr)
            .split('{yyyy}').join(yyyy)
            .split('{yy}').join(yyyy.slice(-2))
            .split('{mm}').join(mm)
            .split('{dd}').join(dd);

        newBase = applyRenamerReplacers(newBase);

        // Slashes, backslashes and colons are folder/drive separators
        if (/[\\/:]/.test(newBase)) {
            sawIllegalChar = true;
            newBase = newBase.replace(/[\\/:]+/g, '-');
        }
        newBase = sanitizeFilenameBase(newBase) || 'image';

        const extension = splitFilename(image.name).extension || '';
        let candidate = newBase + extension;
        let dupCounter = 1;
        while (takenNames.has(candidate.toLowerCase())) {
            candidate = newBase + '-' + dupCounter + extension;
            dupCounter++;
        }
        if (dupCounter > 1) {
            duplicateCount++;
        }
        takenNames.add(candidate.toLowerCase());

        return {
            before: image.name,
            beforeHtml: markRenamerMatches(splitFilename(image.name).base, pairs, regexRule) +
                escapeHtml(splitFilename(image.name).extension || ''),
            after: candidate
        };
    });

    return { results, sawIllegalChar, duplicateCount };
}

// Strike through the parts of the original name that the search rules
// and the regex will replace or remove
function markRenamerMatches(base, pairs, regexRule) {
    const ranges = [];
    pairs.forEach(([search]) => {
        if (!search) {
            return;
        }
        let idx = 0;
        while ((idx = base.indexOf(search, idx)) !== -1) {
            ranges.push([idx, idx + search.length]);
            idx += search.length;
        }
    });
    if (regexRule) {
        regexRule.lastIndex = 0;
        let match;
        while ((match = regexRule.exec(base)) !== null) {
            if (match[0] === '') {
                regexRule.lastIndex++;
                continue;
            }
            ranges.push([match.index, match.index + match[0].length]);
        }
        regexRule.lastIndex = 0;
    }
    if (!ranges.length) {
        return escapeHtml(base);
    }
    ranges.sort((a, b) => a[0] - b[0]);
    const merged = [ranges[0].slice()];
    ranges.slice(1).forEach((range) => {
        const last = merged[merged.length - 1];
        if (range[0] <= last[1]) {
            last[1] = Math.max(last[1], range[1]);
        } else {
            merged.push(range.slice());
        }
    });
    let html = '';
    let pos = 0;
    merged.forEach(([start, end]) => {
        html += escapeHtml(base.slice(pos, start)) + '<s>' + escapeHtml(base.slice(start, end)) + '</s>';
        pos = end;
    });
    return html + escapeHtml(base.slice(pos));
}

let renamerPreviewExpanded = false;

window.toggleRenamerPreviewExpand = function() {
    renamerPreviewExpanded = !renamerPreviewExpanded;
    updateRenamerPreview();
};

function updateRenamerPreview() {
    updateRenamerFieldVisibility();
    // Live regex validation feedback
    const regexInput = document.getElementById('renamerRegex');
    const regexErrorEl = document.getElementById('renamerRegexError');
    if (regexInput && regexErrorEl) {
        let regexOk = true;
        if (regexInput.value) {
            try {
                new RegExp(regexInput.value);
            } catch (e) {
                regexOk = false;
            }
        }
        regexErrorEl.style.display = regexOk ? 'none' : 'block';
    }
    const previewEl = document.getElementById('renamerPreview');
    const hintEl = document.getElementById('renamerSlashHint');
    if (!previewEl || !processedImages.length) {
        return;
    }

    const { results, sawIllegalChar, duplicateCount } = computeRenamedNames();
    const shown = renamerPreviewExpanded ? results : results.slice(0, 3);
    let html = shown.map(r =>
        `<div><span class="renamer-before">${r.beforeHtml || escapeHtml(r.before)}</span><span class="renamer-arrow">&rarr;</span><strong class="renamer-after">${escapeHtml(r.after)}</strong></div>`
    ).join('');
    if (results.length > 3) {
        html += renamerPreviewExpanded
            ? `<button type="button" class="renamer-more" onclick="toggleRenamerPreviewExpand()">Show fewer</button>`
            : `<button type="button" class="renamer-more" onclick="toggleRenamerPreviewExpand()">&hellip;and ${results.length - 3} more &ndash; show all</button>`;
    }
    previewEl.innerHTML = html;

    if (hintEl) {
        hintEl.style.display = sawIllegalChar ? 'block' : 'none';
    }

    // Duplicate names get an automatic -1/-2 suffix; explain that
    const dupHintEl = document.getElementById('renamerDupHint');
    if (dupHintEl) {
        if (duplicateCount > 0) {
            const countEl = document.getElementById('renamerDupCount');
            if (countEl) {
                countEl.textContent = String(duplicateCount);
            }
            dupHintEl.style.display = 'block';
        } else {
            dupHintEl.style.display = 'none';
        }
    }
}

window.toggleRenamer = function() {
    const panel = document.getElementById('renamerPanel');
    if (!panel) {
        return;
    }
    const opening = panel.style.display === 'none';
    panel.style.display = opening ? 'block' : 'none';
    if (opening) {
        updateRenamerPreview();
    }
};

// Clears every rename control back to neutral (names stay as they are)
function resetRenamerForm() {
    const patternInput = document.getElementById('renamerPattern');
    const searchInput = document.getElementById('renamerSearch');
    const replaceInput = document.getElementById('renamerReplace');
    const startInput = document.getElementById('renamerStart');
    const prefixInput = document.getElementById('renamerPrefix');
    const suffixInput = document.getElementById('renamerSuffix');
    if (patternInput) patternInput.value = '{name}';
    if (searchInput) searchInput.value = '';
    if (replaceInput) replaceInput.value = '';
    if (startInput) startInput.value = '1';
    if (prefixInput) prefixInput.value = '';
    if (suffixInput) suffixInput.value = '';
    Object.keys(renamerReplacers).forEach((key) => { renamerReplacers[key] = false; });
    document.querySelectorAll('.renamer-replacer').forEach((btn) => btn.classList.remove('active'));
    document.querySelectorAll('.renamer-search-row-extra').forEach((row) => row.remove());
    const regexInput = document.getElementById('renamerRegex');
    const regexReplaceInput = document.getElementById('renamerRegexReplace');
    const regexCase = document.getElementById('renamerRegexIgnoreCase');
    if (regexInput) regexInput.value = '';
    if (regexReplaceInput) regexReplaceInput.value = '';
    if (regexCase) regexCase.checked = false;
}

window.applyRenamer = function() {
    if (!processedImages.length) {
        return;
    }
    const { results } = computeRenamedNames();
    processedImages.forEach((image, index) => {
        // Remember the very first name once, so Reset can always go back
        if (image.defaultName === undefined) {
            image.defaultName = image.name;
        }
        image.name = results[index].after;
    });
    window.renderProcessedDownloadStep();
    // Start the next round clean: the applied result is now the base,
    // so another search/replace builds on top instead of starting over
    resetRenamerForm();
    updateRenamerPreview();
};

window.resetRenamer = function() {
    let restored = false;
    processedImages.forEach((image) => {
        if (image.defaultName !== undefined) {
            image.name = image.defaultName;
            restored = true;
        }
    });
    resetRenamerForm();
    if (restored) {
        window.renderProcessedDownloadStep();
    }
    updateRenamerPreview();
};

function insertRenamerToken(token) {
    const input = document.getElementById('renamerPattern');
    if (!input) {
        return;
    }
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    input.value = input.value.slice(0, start) + token + input.value.slice(end);
    const caret = start + token.length;
    input.focus();
    input.setSelectionRange(caret, caret);
    updateRenamerPreview();
}

document.addEventListener('DOMContentLoaded', function() {
    ['renamerPattern', 'renamerSearch', 'renamerReplace', 'renamerStart', 'renamerPrefix', 'renamerSuffix', 'renamerRegex', 'renamerRegexReplace'].forEach((id) => {
        document.getElementById(id)?.addEventListener('input', updateRenamerPreview);
    });
    document.getElementById('renamerRegexIgnoreCase')?.addEventListener('change', updateRenamerPreview);
    document.querySelectorAll('.renamer-regex-preset').forEach((btn) => {
        btn.addEventListener('click', () => {
            const regexInput = document.getElementById('renamerRegex');
            const replaceInput = document.getElementById('renamerRegexReplace');
            const caseInput = document.getElementById('renamerRegexIgnoreCase');
            if (regexInput) regexInput.value = btn.dataset.regex || '';
            if (replaceInput) replaceInput.value = btn.dataset.replace || '';
            if (caseInput) caseInput.checked = btn.dataset.icase === '1';
            updateRenamerPreview();
        });
    });
    document.querySelectorAll('.renamer-preset').forEach((btn) => {
        btn.addEventListener('click', () => {
            const patternInput = document.getElementById('renamerPattern');
            if (patternInput) {
                patternInput.value = btn.dataset.pattern;
                updateRenamerPreview();
                // Put the cursor where the typing should happen next
                if (btn.dataset.pattern.includes('{prefix}')) {
                    document.getElementById('renamerPrefix')?.focus();
                } else if (btn.dataset.pattern.includes('{suffix}')) {
                    document.getElementById('renamerSuffix')?.focus();
                }
            }
        });
    });
    document.querySelectorAll('.renamer-token').forEach((btn) => {
        // mousedown, so the pattern field's cursor position is not lost first
        btn.addEventListener('mousedown', (event) => {
            event.preventDefault();
            insertRenamerToken(btn.dataset.token);
        });
    });
    document.querySelectorAll('.renamer-replacer').forEach((btn) => {
        btn.addEventListener('click', () => {
            const key = btn.dataset.replacer;
            if (!(key in renamerReplacers)) {
                return;
            }
            renamerReplacers[key] = !renamerReplacers[key];
            btn.classList.toggle('active', renamerReplacers[key]);
            updateRenamerPreview();
        });
    });
});

function normalizeRotationDegrees(degrees) {
    const normalized = ((degrees % 360) + 360) % 360;
    return normalized === 0 || normalized === 90 || normalized === 180 || normalized === 270
        ? normalized
        : 0;
}

function loadImageElement(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load processed image'));
        img.src = url;
    });
}

function canvasToBlob(canvas, mimeType, quality) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob);
            } else {
                reject(new Error('Failed to export rotated image'));
            }
        }, mimeType, quality);
    });
}

async function exportProcessedImageBlob(image) {
    const rotation = normalizeRotationDegrees(image.userRotation || 0);
    const mimeType = getMimeTypeForFilename(image.name);
    // Rotation is a lossless operation conceptually; re-encode at high quality
    // instead of the batch slider value so a rotated download doesn't degrade
    const quality = 0.95;

    if (rotation === 0) {
        const response = await fetch(image.url);
        if (!response.ok) {
            throw new Error(`Failed to fetch image (${response.status})`);
        }
        return await response.blob();
    }

    const img = await loadImageElement(image.url);
    const swapDimensions = rotation === 90 || rotation === 270;
    const canvas = document.createElement('canvas');
    canvas.width = swapDimensions ? img.naturalHeight : img.naturalWidth;
    canvas.height = swapDimensions ? img.naturalWidth : img.naturalHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Failed to create export canvas');
    }

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

    return canvasToBlob(canvas, mimeType, quality);
}

function formatSizeMb(bytes) {
    return (bytes / 1024 / 1024).toFixed(1);
}

function formatPreviewFileSize(bytes) {
    return (bytes / 1024 / 1024).toFixed(2) + 'mb';
}

function formatCompactFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) {
        return '—';
    }
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) {
        return mb.toFixed(2) + 'mb';
    }
    return Math.max(1, Math.round(bytes / 1024)) + 'kb';
}

function getProcessedImageDisplayDimensions(image) {
    let width = image.width;
    let height = image.height;
    const rotation = normalizeRotationDegrees(image.userRotation || 0);

    if ((rotation === 90 || rotation === 270) && width && height) {
        return { width: height, height: width };
    }

    return { width, height };
}

function formatProcessedImageMeta(image) {
    const { width, height } = getProcessedImageDisplayDimensions(image);
    const sizeLabel = image.bytes != null ? formatCompactFileSize(image.bytes) : '—';
    const dimensionsLabel = width && height ? `${width}x${height}` : '—';
    return `${sizeLabel} (${dimensionsLabel})`;
}

function hasCropInUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.has('crop') || params.has('cropMode');
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function getMaxSingleFileBytes() {
    const uploadMax = serverLimits.upload_max_filesize_bytes || SERVER_LIMITS_DEFAULTS.upload_max_filesize_bytes;
    const postMax = serverLimits.post_max_size_bytes || SERVER_LIMITS_DEFAULTS.post_max_size_bytes;
    return Math.min(uploadMax, Math.floor(postMax * 0.95) - UPLOAD_OVERHEAD_BYTES);
}

function getMaxBatchBytes() {
    const postMax = serverLimits.post_max_size_bytes || SERVER_LIMITS_DEFAULTS.post_max_size_bytes;
    return Math.floor(postMax * 0.9);
}

function validateFileAgainstServerLimits(file) {
    const maxSingle = getMaxSingleFileBytes();
    if (file.size <= maxSingle) {
        return null;
    }

    const fileMb = formatSizeMb(file.size);
    const uploadLabel = serverLimits.upload_max_filesize || formatSizeMb(serverLimits.upload_max_filesize_bytes) + 'MB';
    const postLabel = serverLimits.post_max_size || formatSizeMb(serverLimits.post_max_size_bytes) + 'MB';

    return `${file.name} (${fileMb}MB) exceeds server limits (upload_max_filesize: ${uploadLabel}, post_max_size: ${postLabel}). Increase PHP limits or use a smaller file.`;
}

function validateBatchAgainstServerLimits(batchFiles) {
    for (const file of batchFiles) {
        const fileError = validateFileAgainstServerLimits(file);
        if (fileError) {
            return fileError;
        }
    }

    const totalSize = batchFiles.reduce((sum, file) => sum + file.size, 0) + UPLOAD_OVERHEAD_BYTES;
    const maxBatch = getMaxBatchBytes();

    if (totalSize > maxBatch) {
        const postLabel = serverLimits.post_max_size || formatSizeMb(maxBatch) + 'MB';
        return `This upload batch (${formatSizeMb(totalSize)}MB) exceeds server post_max_size (${postLabel}). Fewer or smaller images will be sent per request automatically when possible.`;
    }

    return null;
}

function buildUploadBatches(files, singleFilePerRequest = false) {
    if (singleFilePerRequest) {
        return files.map((file, index) => ({
            files: [file],
            startIndex: index
        }));
    }

    const maxBatchBytes = getMaxBatchBytes();
    const batches = [];
    let currentFiles = [];
    let currentSize = UPLOAD_OVERHEAD_BYTES;
    let startIndex = 0;

    files.forEach((file, index) => {
        const exceedsSize = currentFiles.length > 0 && (currentSize + file.size > maxBatchBytes);
        const exceedsCount = currentFiles.length >= BATCH_SIZE;

        if (exceedsSize || exceedsCount) {
            batches.push({ files: currentFiles, startIndex });
            currentFiles = [];
            currentSize = UPLOAD_OVERHEAD_BYTES;
            startIndex = index;
        }

        if (currentFiles.length === 0) {
            startIndex = index;
        }

        currentFiles.push(file);
        currentSize += file.size;
    });

    if (currentFiles.length > 0) {
        batches.push({ files: currentFiles, startIndex });
    }

    return batches;
}

async function loadServerLimits() {
    try {
        const response = await fetch('check_limits.php', { cache: 'no-store' });
        if (!response.ok) {
            return;
        }

        const data = await response.json();
        serverLimits = {
            loaded: true,
            post_max_size: data.post_max_size,
            upload_max_filesize: data.upload_max_filesize,
            post_max_size_bytes: data.post_max_size_bytes,
            upload_max_filesize_bytes: data.upload_max_filesize_bytes,
            memory_limit: data.memory_limit,
            memory_limit_bytes: data.memory_limit_bytes
        };
        updateServerLimitsNotice();
    } catch (error) {
        // Server limits are optional; UI works without them.
    }
}

function updateServerLimitsNotice() {
    const noticeEl = document.getElementById('serverLimitsNotice');
    if (!noticeEl || !serverLimits.loaded) {
        return;
    }

    const perFileMb = formatSizeMb(getMaxSingleFileBytes());
    const postLabel = serverLimits.post_max_size;
    let notice = ` Server upload limit: ~${perFileMb}MB per file (PHP post_max_size: ${postLabel}).`;

    const memoryBytes = serverLimits.memory_limit_bytes || 0;
    if (memoryBytes > 0 && memoryBytes < 256 * 1024 * 1024) {
        notice += ` PHP memory_limit (${serverLimits.memory_limit || formatSizeMb(memoryBytes) + 'M'}) is below 256M; large image processing may fail.`;
    }

    noticeEl.textContent = notice;
}

function getNumericQuality() {
    const quality = parseInt(currentQuality, 10);
    return Number.isFinite(quality) ? Math.max(1, Math.min(100, quality)) : 70;
}

function getQualityTier() {
    if (currentQualityTier === 'near-lossless' || currentQualityTier === 'lossless') {
        return currentQualityTier;
    }
    return 'lossy';
}

// Quality control: percentage or a target file size (mutually exclusive tabs)
let qualityControlMode = 'percent'; // 'percent' | 'target'
let currentTargetKB = 200;

function getTargetKB() {
    if (currentTargetKB === 'custom') {
        const val = parseInt(document.getElementById('targetSizeKb')?.value, 10);
        return Number.isFinite(val) ? Math.max(10, Math.min(10240, val)) : null;
    }
    return currentTargetKB;
}

function isTargetSizeActive() {
    return qualityControlMode === 'target' && selectedFormat !== 'png';
}

function setQualityControlMode(mode) {
    if (mode !== 'percent' && mode !== 'target') {
        return;
    }
    if (mode === 'target' && selectedFormat === 'png') {
        return;
    }
    qualityControlMode = mode;
    document.querySelectorAll('.quality-tab-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.qualityTab === mode);
    });
    const percentPanel = document.getElementById('qualityPercentPanel');
    const targetPanel = document.getElementById('qualityTargetPanel');
    if (percentPanel) {
        percentPanel.style.display = mode === 'percent' ? 'block' : 'none';
    }
    if (targetPanel) {
        targetPanel.style.display = mode === 'target' ? 'block' : 'none';
    }
    if (typeof updatePreviewOutputLabels === 'function') {
        updatePreviewOutputLabels();
    }
}

function setTargetSizePreset(value) {
    const customRow = document.getElementById('customTargetSize');
    document.querySelectorAll('.target-size-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.targetKb === String(value));
    });
    if (value === 'custom') {
        currentTargetKB = 'custom';
        if (customRow) {
            customRow.style.display = 'block';
        }
    } else {
        currentTargetKB = parseInt(value, 10) || 200;
        if (customRow) {
            customRow.style.display = 'none';
        }
    }
    if (typeof updatePreviewOutputLabels === 'function') {
        updatePreviewOutputLabels();
    }
}

function updateQualityTabsForFormat() {
    const targetTab = document.getElementById('qualityTabTarget');
    const pngHint = document.getElementById('targetPngHint');
    const lossy = selectedFormat !== 'png';
    if (targetTab) {
        targetTab.disabled = !lossy;
    }
    if (pngHint) {
        pngHint.style.display = lossy ? 'none' : 'block';
    }
    if (!lossy && qualityControlMode === 'target') {
        setQualityControlMode('percent');
    }
}

function buildEffectsSettings() {
    return {
        blur: parseInt(effectSettings.blur, 10) || 0,
        sharpen: parseInt(effectSettings.sharpen, 10) || 0,
        brightness: parseInt(effectSettings.brightness, 10) || 100,
        contrast: parseInt(effectSettings.contrast, 10) || 100,
        saturation: parseInt(effectSettings.saturation, 10) || 100,
        autoEnhance: effectSettings.autoEnhance || false,
        autoEnhanceStrength: enhanceMode === 'auto' ? uiToServerStrength(autoEnhanceStrength) : 100,
        normalize: effectSettings.normalize || false,
        equalize: effectSettings.equalize || false,
        enhance: effectSettings.enhance || false,
        emboss: effectSettings.emboss || false,
        edge: effectSettings.edge || false,
        charcoal: effectSettings.charcoal || false
    };
}

function getOutputPreviewLabel() {
    const format = (selectedFormat || 'webp').toUpperCase();
    if (isTargetSizeActive()) {
        const kb = getTargetKB();
        if (kb) {
            const sizeLabel = kb >= 1024 ? (kb / 1024).toFixed(kb % 1024 === 0 ? 0 : 1) + 'MB' : kb + 'KB';
            return `→ ${format} ≤ ${sizeLabel}`;
        }
        return `→ ${format} target size`;
    }
    const tier = getQualityTier();
    if (tier === 'near-lossless') {
        return `→ ${format} near-lossless`;
    }
    return `→ ${format} @ ${getNumericQuality()}%`;
}

function buildSettings(overrides = {}) {
    const activeCropModeBtn = document.querySelector('.quality-btn[data-crop-mode].active');
    const widthValue = document.getElementById('width').value;
    const heightValue = document.getElementById('height').value;
    let width = widthValue ? parseInt(widthValue, 10) : null;
    let height = heightValue ? parseInt(heightValue, 10) : null;

    if (currentMode === 'optimize' || currentMode === 'custom') {
        width = null;
        height = null;
    }

    if (currentMode === 'resize') {
        // Only send the dimension(s) the user is actually resizing by
        if (selectedDimension === 'width') {
            height = null;
        } else if (selectedDimension === 'height') {
            width = null;
        }
    }

    return Object.assign({
        mode: currentMode,
        cropMode: currentMode === 'crop'
            ? (activeCropModeBtn ? activeCropModeBtn.dataset.cropMode : 'manual')
            : null,
        width: width,
        height: height,
        resizeMode: currentMode === 'resize' ? selectedDimension : null,
        noUpscale: currentMode === 'resize' ? !!document.getElementById('noUpscale')?.checked : false,
        targetKB: isTargetSizeActive() ? getTargetKB() : null,
        quality: getNumericQuality(),
        qualityTier: getQualityTier(),
        alignment: currentMode === 'crop' ? (selectedAlignment || 'center-middle') : null,
        format: selectedFormat || 'webp',
        effects: buildEffectsSettings(),
        debugOrientation: ORIENT_DEBUG
    }, overrides);
}

document.addEventListener('DOMContentLoaded', function() {
    loadServerLimits();

    if (ORIENT_DEBUG) {
        console.info('[orient_debug] Orientation debugging enabled. Upload and process an image, then check this console and logs/orientation_debug.log.');
        const container = document.querySelector('.container');
        if (container && !document.getElementById('orientationDebugBanner')) {
            const banner = document.createElement('div');
            banner.id = 'orientationDebugBanner';
            banner.className = 'orientation-debug-banner';
            banner.innerHTML = '<strong>Orientation debug on</strong> — process an image, then check the browser console and the debug panel on the download step.';
            container.insertBefore(banner, container.firstChild);
        }
    }

    // Check if Imagick is available
    fetch('check_imagick.php')
        .then(response => response.json())
        .then(data => {
            if (data.formats) {
                serverFormats = Object.assign({}, serverFormats, data.formats);
            }
            if (serverFormats.avifOutput) {
                const avifBtn = document.getElementById('avifFormatBtn');
                if (avifBtn) {
                    avifBtn.style.display = '';
                }
            }
            if (serverFormats.heicInput) {
                if (window.Config && Array.isArray(Config.SUPPORTED_EXTENSIONS)) {
                    Config.SUPPORTED_EXTENSIONS.push('heic', 'heif');
                }
                const picker = document.getElementById('fileInput');
                if (picker && picker.accept && picker.accept.indexOf('heic') === -1) {
                    picker.accept += ',image/heic,image/heif,.heic,.heif';
                }
            }
            if (!data.available) {
                alert('Please enable Imagick on your server.');
                // Disable all interactive elements
                document.querySelectorAll('button, input').forEach(element => {
                    element.disabled = true;
                });
                // Show error message in the container
                const container = document.querySelector('.container');
                container.innerHTML = `
                    <div class="error-message">
                        <h1>Imagick Not Available</h1>
                        <p>Please enable Imagick on your server to use this application.</p>
                        <p>Contact your server administrator for assistance.</p>
                    </div>
                `;
            }
        })
        .catch(() => {
            // Imagick check failed; leave the app usable and surface errors on process.
        });

    // DOM elements
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const previewContainer = document.getElementById('previewContainer');
    const processBtn = document.querySelector('.settings-controls .process-btn');

    // Initialize dropzone
    initializeDropzone();

    // Initialize all event listeners (suppress URL sync until settings are applied from the URL)
    suppressUrlSync = true;
    initializeEventListeners();

    // Functions
    function initializeDropzone() {
        dropzone.addEventListener('click', () => fileInput.click());
        dropzone.addEventListener('dragover', handleDragOver);
        dropzone.addEventListener('drop', handleDrop);
        fileInput.addEventListener('change', handleFileSelect);
        
        // Add drag and drop to the entire page
        document.addEventListener('dragover', handlePageDragOver);
        document.addEventListener('drop', handlePageDrop);
        document.addEventListener('dragleave', handlePageDragLeave);
    }

    function initializeEventListeners() {
        // Mode selection
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                setMode(btn.dataset.mode);
            });
        });

        // Dimension selection
        document.querySelectorAll('.dimension-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                setDimension(btn.dataset.dimension);
            });
        });

        // Resize preset selection
        const resizePresetButtons = document.querySelectorAll('.resize-preset-btn');
        const widthField = document.getElementById('width');

        resizePresetButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                setDimensions({ width: parseInt(btn.dataset.width, 10) });
            });
        });

        if (resizePresetButtons.length > 0 && widthField && !widthField.value) {
            setDimensions({ width: parseInt(resizePresetButtons[0].dataset.width, 10) });
        }

        // Quality selection
        document.querySelectorAll('.quality-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.dataset.quality) {
                    if (btn.dataset.quality === 'custom') {
                        setQuality('custom');
                    } else {
                        setQuality(parseInt(btn.dataset.quality, 10));
                    }
                } else if (btn.dataset.width && btn.dataset.height) {
                    setDimensions({
                        width: parseInt(btn.dataset.width, 10),
                        height: parseInt(btn.dataset.height, 10)
                    });
                } else if (btn.dataset.cropMode) {
                    setCropMode(btn.dataset.cropMode);
                } else if (btn.dataset.effect) {
                    btn.classList.toggle('active');
                    effectSettings[btn.dataset.effect] = btn.classList.contains('active');
                } else if (btn.dataset.qualityTab) {
                    setQualityControlMode(btn.dataset.qualityTab);
                } else if (btn.dataset.targetKb) {
                    setTargetSizePreset(btn.dataset.targetKb);
                } else if (btn.dataset.enhance) {
                    setEnhanceMode(btn.dataset.enhance);
                }
            });
        });

        // Auto enhance strength slider
        const strengthSlider = document.getElementById('autoStrengthSlider');
        if (strengthSlider) {
            strengthSlider.addEventListener('input', () => {
                autoEnhanceStrength = parseInt(strengthSlider.value, 10) || 50;
                const valueEl = document.getElementById('autoStrengthValue');
                if (valueEl) {
                    valueEl.textContent = autoEnhanceStrength + '%';
                }
                syncEnhanceUrl();
            });
        }

        // Restore Auto enhance: the URL wins (?enhance=auto&strength=70, shareable),
        // otherwise the last choice saved in this browser is applied
        const applyEnhanceStrengthUi = (value) => {
            const parsed = parseInt(value, 10);
            if (isNaN(parsed)) {
                return;
            }
            autoEnhanceStrength = Math.max(10, Math.min(100, parsed));
            if (strengthSlider) {
                strengthSlider.value = autoEnhanceStrength;
            }
            const valueEl = document.getElementById('autoStrengthValue');
            if (valueEl) {
                valueEl.textContent = autoEnhanceStrength + '%';
            }
        };
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('enhance') === 'auto') {
            applyEnhanceStrengthUi(urlParams.get('strength'));
            setEnhanceMode('auto');
        } else if (!urlParams.has('enhance')) {
            try {
                const saved = JSON.parse(localStorage.getItem('easyImageEnhance') || 'null');
                if (saved && saved.mode === 'auto') {
                    applyEnhanceStrengthUi(saved.strength);
                    setEnhanceMode('auto');
                }
            } catch (e) {
                // No storage available; nothing to restore
            }
        }

        // Custom target size input
        const targetSizeInput = document.getElementById('targetSizeKb');
        if (targetSizeInput) {
            targetSizeInput.addEventListener('input', () => {
                updatePreviewOutputLabels();
            });
        }

        // Alignment selection - separate event listener for alignment buttons
        document.querySelectorAll('.alignment-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                setAlignment(btn.dataset.align);
            });
        });

        // Quality slider
        const qualitySlider = document.getElementById('qualitySlider');
        if (qualitySlider) {
            qualitySlider.addEventListener('input', (e) => {
                currentQuality = parseInt(e.target.value, 10);
                currentQualityTier = 'lossy';
                document.getElementById('qualityValue').textContent = currentQuality + '%';
                document.querySelectorAll('.quality-btn[data-quality="custom"]').forEach(b => b.classList.add('active'));
                document.querySelectorAll('.quality-btn[data-quality]:not([data-quality="custom"])').forEach(b => b.classList.remove('active'));
                updatePreviewOutputLabels();
                scheduleSyncUrlFromSettings();
            });
        }

        const widthInput = document.getElementById('width');
        const heightInput = document.getElementById('height');
        [widthInput, heightInput].forEach(input => {
            if (!input) {
                return;
            }
            input.addEventListener('change', () => {
                setDimensions({
                    width: widthInput?.value ? parseInt(widthInput.value, 10) : null,
                    height: heightInput?.value ? parseInt(heightInput.value, 10) : null
                });
            });
        });

        // Effect sliders
        const effectSliders = ['blurSlider', 'sharpenSlider', 'brightnessSlider', 'contrastSlider', 'saturationSlider'];
        effectSliders.forEach(sliderId => {
            const slider = document.getElementById(sliderId);
            if (slider) {
                slider.addEventListener('input', (e) => {
                    const effectName = sliderId.replace('Slider', '');
                    effectSettings[effectName] = parseInt(e.target.value, 10);
                    e.target.nextElementSibling.textContent = e.target.value + '%';
                    noteManualEffectChange();
                });
            }
        });

        // Effect info icons
        document.querySelectorAll('.effect-info').forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('effectsInfoModal').style.display = 'block';
            });
        });

        // Quality and Format info icons
        document.querySelectorAll('.quality-info, .format-info').forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        // Close modals when clicking outside
        window.addEventListener('click', function(event) {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                if (event.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Close modals when clicking X button
        document.querySelectorAll('.modal .close').forEach(closeBtn => {
            closeBtn.addEventListener('click', function() {
                const modal = this.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Effects buttons
        document.querySelectorAll('.effect-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.classList.toggle('active');
                effectSettings[btn.dataset.effect] = btn.classList.contains('active');
                noteManualEffectChange();
            });
        });

        // Format buttons
        document.querySelectorAll('.format-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                setFormat(btn.dataset.format);
            });
        });

        // Initialize process button as disabled
        if (processBtn) {
            processBtn.style.display = 'flex';
            processBtn.disabled = true;
            processBtn.innerHTML = '<i class="fas fa-cog"></i> Process Images';
        }
    }

    function updateModeOptions() {
        const cropOptions = document.getElementById('cropOptions');
        const resizeOptions = document.getElementById('resizeOptions');
        const cropModeOptions = document.getElementById('cropModeOptions');
        const alignmentOptions = document.getElementById('alignmentOptions');
        const dimensionGroup = document.getElementById('dimensionGroup');
        const resizePresets = document.getElementById('resizePresets');
        const widthInput = document.getElementById('widthInput');
        const heightInput = document.getElementById('heightInput');
        const optimizeInfo = document.getElementById('optimizeInfo');
        const customInfo = document.getElementById('customInfo');

        if (currentMode === 'crop') {
            cropOptions.style.display = 'block';
            resizeOptions.style.display = 'none';
            cropModeOptions.style.display = 'block';
            // Hide alignment options by default - they will show only when Automatic is selected
            alignmentOptions.style.display = 'none';
            // Show both inputs in crop mode
            if (dimensionGroup) {
                dimensionGroup.style.display = 'block';
            }
            if (resizePresets) {
                resizePresets.style.display = 'none';
            }
            widthInput.style.display = 'block';
            heightInput.style.display = 'block';
            if (optimizeInfo) {
                optimizeInfo.style.display = 'none';
            }
            if (customInfo) {
                customInfo.style.display = 'none';
            }
        } else if (currentMode === 'optimize') {
            cropOptions.style.display = 'none';
            resizeOptions.style.display = 'none';
            cropModeOptions.style.display = 'none';
            alignmentOptions.style.display = 'none';
            if (dimensionGroup) {
                dimensionGroup.style.display = 'none';
            }
            if (resizePresets) {
                resizePresets.style.display = 'none';
            }
            widthInput.style.display = 'none';
            heightInput.style.display = 'none';
            if (optimizeInfo) {
                optimizeInfo.style.display = 'block';
            }
            if (customInfo) {
                customInfo.style.display = 'none';
            }
        } else if (currentMode === 'custom') {
            cropOptions.style.display = 'none';
            resizeOptions.style.display = 'none';
            cropModeOptions.style.display = 'none';
            alignmentOptions.style.display = 'none';
            if (dimensionGroup) {
                dimensionGroup.style.display = 'none';
            }
            if (resizePresets) {
                resizePresets.style.display = 'none';
            }
            if (optimizeInfo) {
                optimizeInfo.style.display = 'none';
            }
            if (customInfo) {
                customInfo.style.display = 'block';
            }
        } else {
            cropOptions.style.display = 'none';
            resizeOptions.style.display = 'block';
            cropModeOptions.style.display = 'none';
            alignmentOptions.style.display = 'none';
            if (dimensionGroup) {
                dimensionGroup.style.display = 'block';
            }
            if (resizePresets) {
                resizePresets.style.display = selectedDimension === 'width' ? 'block' : 'none';
            }
            // Show only selected dimension in resize mode
            updateDimensionInputs();
            if (optimizeInfo) {
                optimizeInfo.style.display = 'none';
            }
            if (customInfo) {
                customInfo.style.display = 'none';
            }
        }
    }

    function updateDimensionInputs() {
        const widthInput = document.getElementById('widthInput');
        const heightInput = document.getElementById('heightInput');
        const resizePresets = document.getElementById('resizePresets');
        const fitBoxHelp = document.getElementById('fitBoxHelp');

        if (fitBoxHelp) {
            fitBoxHelp.style.display = currentMode === 'resize' && selectedDimension === 'fit' ? 'block' : 'none';
        }

        if (currentMode === 'optimize' || currentMode === 'custom') {
            widthInput.style.display = 'none';
            heightInput.style.display = 'none';
            if (resizePresets) {
                resizePresets.style.display = 'none';
            }
            return;
        }

        if (currentMode === 'resize' && selectedDimension === 'fit') {
            widthInput.style.display = 'block';
            heightInput.style.display = 'block';
            if (resizePresets) {
                resizePresets.style.display = 'none';
            }
            return;
        }

        if (selectedDimension === 'width') {
            widthInput.style.display = 'block';
            heightInput.style.display = 'none';
            if (resizePresets && currentMode === 'resize') {
                resizePresets.style.display = 'block';
            }
        } else {
            widthInput.style.display = 'none';
            heightInput.style.display = 'block';
            if (resizePresets) {
                resizePresets.style.display = 'none';
            }
        }
    }

    function updateQualitySlider() {
        const customQualitySlider = document.getElementById('customQualitySlider');
        const qualitySlider = document.getElementById('qualitySlider');
        const qualityValue = document.getElementById('qualityValue');

        if (currentQuality === 'custom' || document.querySelector('.quality-btn[data-quality="custom"].active')) {
            customQualitySlider.style.display = 'block';
        } else {
            customQualitySlider.style.display = 'none';
            if (qualitySlider && qualityValue) {
                qualitySlider.value = getNumericQuality();
                qualityValue.textContent = getNumericQuality() + '%';
            }
        }
    }

    function updateCropModeOptions() {
        const alignmentOptions = document.getElementById('alignmentOptions');
        const activeCropMode = document.querySelector('.quality-btn[data-crop-mode].active');
        
        if (activeCropMode && activeCropMode.dataset.cropMode === 'auto') {
            alignmentOptions.style.display = 'block';
        } else {
            alignmentOptions.style.display = 'none';
        }
    }

    function handleModeDefaults() {
        if (currentMode === 'crop') {
            const firstCropPreset = document.querySelector('#cropOptions .quality-btn[data-width][data-height]');
            if (firstCropPreset) {
                firstCropPreset.click();
            }
        } else if (currentMode === 'resize') {
            const firstResizePreset = document.querySelector('#resizePresets .resize-preset-btn');
            if (firstResizePreset) {
                firstResizePreset.click();
            }
        }
    }

    let syncUrlTimer = null;

    function collectUrlSettings() {
        const activeCropModeBtn = document.querySelector('.quality-btn[data-crop-mode].active');
        const settings = {
            mode: currentMode,
            format: selectedFormat || 'webp'
        };

        if (currentMode === 'resize') {
            settings.dimension = selectedDimension;
            const widthVal = document.getElementById('width')?.value;
            const heightVal = document.getElementById('height')?.value;
            if (selectedDimension === 'width' && widthVal) {
                settings.width = parseInt(widthVal, 10);
            } else if (selectedDimension === 'height' && heightVal) {
                settings.height = parseInt(heightVal, 10);
            } else if (selectedDimension === 'fit') {
                if (widthVal) {
                    settings.width = parseInt(widthVal, 10);
                }
                if (heightVal) {
                    settings.height = parseInt(heightVal, 10);
                }
            }
        } else if (currentMode === 'crop') {
            const widthVal = document.getElementById('width')?.value;
            const heightVal = document.getElementById('height')?.value;
            if (widthVal) {
                settings.width = parseInt(widthVal, 10);
            }
            if (heightVal) {
                settings.height = parseInt(heightVal, 10);
            }
            settings.crop = activeCropModeBtn ? activeCropModeBtn.dataset.cropMode : 'manual';
            if (settings.crop === 'auto') {
                settings.align = selectedAlignment;
            }
        }

        const customActive = document.querySelector('.quality-btn[data-quality="custom"].active');
        if (customActive) {
            settings.quality = getNumericQuality();
        } else {
            const activeQuality = document.querySelector('.quality-btn[data-quality].active:not([data-quality="custom"])');
            const qualityNum = activeQuality ? parseInt(activeQuality.dataset.quality, 10) : 70;
            settings.quality = typeof UrlParams !== 'undefined'
                ? UrlParams.qualityToUrlValue(qualityNum)
                : String(qualityNum);
        }

        return settings;
    }

    function syncUrlFromSettings() {
        if (suppressUrlSync || typeof UrlParams === 'undefined') {
            return;
        }
        UrlParams.writeToLocation(collectUrlSettings());
    }

    function scheduleSyncUrlFromSettings() {
        if (suppressUrlSync) {
            return;
        }
        clearTimeout(syncUrlTimer);
        syncUrlTimer = setTimeout(syncUrlFromSettings, 150);
    }

    function updatePreviewOutputLabels() {
        document.querySelectorAll('.preview-output-info').forEach(function(el) {
            el.textContent = getOutputPreviewLabel();
        });
    }

    function setMode(mode, options) {
        const opts = options || {};
        const validModes = ['resize', 'crop', 'optimize', 'custom'];
        if (!validModes.includes(mode)) {
            return;
        }

        document.querySelectorAll('.mode-btn').forEach(function(b) {
            b.classList.remove('active');
        });
        const btn = document.querySelector('.mode-btn[data-mode="' + mode + '"]');
        if (btn) {
            btn.classList.add('active');
        }
        currentMode = mode;
        updateModeOptions();
        if (!opts.skipDefaults) {
            handleModeDefaults();
        }
        if (mode === 'crop' && !opts.skipCropDefault && !hasCropInUrl()) {
            setCropMode('manual');
        }
        syncUrlFromSettings();
    }

    function setDimension(dimension) {
        if (dimension !== 'width' && dimension !== 'height' && dimension !== 'fit') {
            return;
        }

        document.querySelectorAll('.dimension-btn').forEach(function(b) {
            b.classList.remove('active');
        });
        const btn = document.querySelector('.dimension-btn[data-dimension="' + dimension + '"]');
        if (btn) {
            btn.classList.add('active');
        }
        selectedDimension = dimension;
        updateDimensionInputs();
        syncUrlFromSettings();
    }

    function setDimensions(dimensions) {
        const widthField = document.getElementById('width');
        const heightField = document.getElementById('height');

        if (dimensions.width != null && widthField) {
            widthField.value = String(dimensions.width);
        }
        if (dimensions.height != null && heightField) {
            heightField.value = String(dimensions.height);
        }

        document.querySelectorAll('.resize-preset-btn').forEach(function(b) {
            b.classList.remove('active');
        });
        if (dimensions.width != null && currentMode === 'resize' && selectedDimension === 'width') {
            const resizeMatch = document.querySelector('.resize-preset-btn[data-width="' + dimensions.width + '"]');
            if (resizeMatch) {
                resizeMatch.classList.add('active');
            }
        }

        document.querySelectorAll('.quality-btn[data-width][data-height]').forEach(function(b) {
            b.classList.remove('active');
        });
        if (dimensions.width != null && dimensions.height != null && currentMode === 'crop') {
            const cropMatch = document.querySelector(
                '.quality-btn[data-width="' + dimensions.width + '"][data-height="' + dimensions.height + '"]'
            );
            if (cropMatch) {
                cropMatch.classList.add('active');
            }
        }

        syncUrlFromSettings();
    }

    function setQuality(value) {
        let targetQuality;
        let useCustom = false;

        if (value === 'custom') {
            useCustom = true;
            targetQuality = parseInt(document.getElementById('qualitySlider').value, 10) || 70;
        } else if (typeof value === 'string' && typeof UrlParams !== 'undefined' && UrlParams.QUALITY_ALIASES[value]) {
            targetQuality = UrlParams.QUALITY_ALIASES[value];
        } else {
            const num = typeof value === 'number' ? value : parseInt(value, 10);
            if (!Number.isFinite(num) || num < 1 || num > 100) {
                return;
            }
            if (typeof UrlParams !== 'undefined' && UrlParams.qualityAliasForValue(num)) {
                targetQuality = num;
            } else {
                useCustom = true;
                targetQuality = num;
            }
        }

        document.querySelectorAll('.quality-btn[data-quality]').forEach(function(b) {
            b.classList.remove('active');
        });

        if (useCustom) {
            const customBtn = document.querySelector('.quality-btn[data-quality="custom"]');
            if (customBtn) {
                customBtn.classList.add('active');
            }
            const slider = document.getElementById('qualitySlider');
            if (slider) {
                slider.value = targetQuality;
            }
            const qualityValue = document.getElementById('qualityValue');
            if (qualityValue) {
                qualityValue.textContent = targetQuality + '%';
            }
            currentQuality = targetQuality;
            currentQualityTier = 'lossy';
        } else {
            const presetBtn = document.querySelector('.quality-btn[data-quality="' + targetQuality + '"]');
            if (presetBtn) {
                presetBtn.classList.add('active');
                currentQuality = targetQuality;
                currentQualityTier = presetBtn.dataset.tier || 'lossy';
            }
        }

        updateQualitySlider();
        updatePreviewOutputLabels();
        syncUrlFromSettings();
    }

    function setCropMode(mode) {
        if (mode !== 'auto' && mode !== 'manual') {
            return;
        }

        document.querySelectorAll('.quality-btn[data-crop-mode]').forEach(function(b) {
            b.classList.remove('active');
        });
        const btn = document.querySelector('.quality-btn[data-crop-mode="' + mode + '"]');
        if (btn) {
            btn.classList.add('active');
        }
        updateCropModeOptions();
        syncUrlFromSettings();
    }

    function setAlignment(align) {
        const validAlignments = [
            'top-left', 'top-center', 'top-right',
            'left-middle', 'center-middle', 'right-middle',
            'bottom-left', 'bottom-center', 'bottom-right'
        ];
        if (!validAlignments.includes(align)) {
            return;
        }

        document.querySelectorAll('.alignment-btn').forEach(function(b) {
            b.classList.remove('active');
        });
        const btn = document.querySelector('.alignment-btn[data-align="' + align + '"]');
        if (btn) {
            btn.classList.add('active');
        }
        selectedAlignment = align;
        syncUrlFromSettings();
    }

    function setFormat(format) {
        if (format !== 'jpg' && format !== 'png' && format !== 'webp' && format !== 'avif') {
            return;
        }
        if (format === 'avif' && !serverFormats.avifOutput) {
            return;
        }

        document.querySelectorAll('.format-btn').forEach(function(b) {
            b.classList.remove('active');
        });
        const btn = document.querySelector('.format-btn[data-format="' + format + '"]');
        if (btn) {
            btn.classList.add('active');
        }
        selectedFormat = format;
        updateQualityTabsForFormat();
        updatePreviewOutputLabels();
        syncUrlFromSettings();
    }

    function applyUrlSettingsFromLocation() {
        suppressUrlSync = true;

        if (typeof UrlParams === 'undefined') {
            setCropMode('manual');
            suppressUrlSync = false;
            return;
        }

        const parsed = UrlParams.readFromLocation();
        if (!UrlParams.hasSettings(parsed)) {
            setCropMode('manual');
            suppressUrlSync = false;
            return;
        }

        if (parsed.mode) {
            setMode(parsed.mode, { skipDefaults: true, skipCropDefault: true });
        }
        if (parsed.dimension) {
            setDimension(parsed.dimension);
        }
        if (parsed.width != null || parsed.height != null) {
            setDimensions({ width: parsed.width, height: parsed.height });
        }
        if (parsed.quality != null) {
            setQuality(parsed.quality);
        }
        if (parsed.crop) {
            setCropMode(parsed.crop);
        } else if (currentMode === 'crop') {
            setCropMode('manual');
        }
        if (parsed.align) {
            setAlignment(parsed.align);
        }
        if (parsed.format) {
            setFormat(parsed.format);
        }

        updateQualitySlider();
        updatePreviewOutputLabels();
        suppressUrlSync = false;
        syncUrlFromSettings();
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation(); // Prevent page drag from interfering
        dropzone.classList.add('dragover');
        // Remove page drag class when over dropzone
        document.body.classList.remove('page-dragover');
    }

    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation(); // Prevent page drop from interfering
        dropzone.classList.remove('dragover');
        document.body.classList.remove('page-dragover');
        const files = Array.from(e.dataTransfer.files);
        handleFiles(files);
    }

    function handleFileSelect(e) {
        const files = Array.from(e.target.files);
        handleFiles(files);
    }

    function handleFiles(files) {
        const validFiles = Array.from(files).filter(file => {
            if (isHeicFile(file) && !serverFormats.heicInput) {
                alert(`${file.name}: HEIC photos are not supported on this server. Please convert to JPG first (on iPhone: Settings > Camera > Formats > Most Compatible).`);
                return false;
            }
            const isValid = Config.validateFile(file);
            if (!isValid) {
                alert(`Invalid file: ${file.name}. Please select a valid image file.`);
            }
            return isValid;
        });

        if (validFiles.length === 0) return;

        // Check individual file sizes
        const oversizedFiles = validFiles.filter(file => file.size > APP_MAX_FILE_BYTES);

        if (oversizedFiles.length > 0) {
            const fileNames = oversizedFiles.map(f => f.name).join(', ');
            alert(`The following files are too large (max 50MB each): ${fileNames}\n\nFor large images, try:\n1. Resizing them first\n2. Converting to WebP format\n3. Processing fewer images at once`);
            return;
        }

        const serverLimitErrors = validFiles
            .map(file => validateFileAgainstServerLimits(file))
            .filter(Boolean);

        if (serverLimitErrors.length > 0) {
            alert(serverLimitErrors.join('\n\n'));
            return;
        }

        // Check total size of all files
        const totalSize = validFiles.reduce((sum, file) => sum + file.size, 0);
        const maxTotalSize = APP_MAX_TOTAL_BYTES;
        const maxFiles = 100; // Maximum number of files

        if (totalSize > maxTotalSize) {
            alert(`Total file size (${(totalSize / 1024 / 1024).toFixed(1)}MB) exceeds the maximum limit of 256MB. Please select fewer images or smaller images.`);
            return;
        }

        if (validFiles.length > maxFiles) {
            alert(`Maximum ${maxFiles} images allowed. Please select fewer images.`);
            return;
        }

        // Append new files to existing ones
        uploadedFiles = [...uploadedFiles, ...validFiles];
        
        // Show previews
        showPreviews();

        // Show process button
        if (processBtn) {
            processBtn.style.display = 'flex';
            processBtn.disabled = false;
            processBtn.innerHTML = '<i class="fas fa-cog"></i> Process Images';
        }

        // Reset the file input
        fileInput.value = '';
    }

    function showPreviews() {
        previewContainer.innerHTML = '';
        revokePreviewThumbUrls();
        fileDimensions = {};
        fileFlags = {};

        if (uploadedFiles.length === 0) {
            previewContainer.classList.remove('has-images');
            return;
        }

        previewContainer.classList.add('has-images');

        uploadedFiles.forEach((file, index) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            previewItem.innerHTML = `
                <div class="preview-thumb-loading">Loading preview…</div>
                <div class="preview-info">
                    <p class="preview-name">
                        <span class="preview-filename">${escapeHtml(file.name)}</span>
                        <span class="preview-filesize">(${formatPreviewFileSize(file.size)})</span>
                    </p>
                    <p class="preview-dimensions">—</p>
                </div>
                <button class="remove-btn" onclick="removeFile(${index})" type="button" aria-label="Remove ${escapeHtml(file.name)}">
                    <i class="fas fa-times"></i>
                </button>
                <button class="preview-eye-btn enhance-preview-trigger" onclick="previewEnhancement(this, ${index})" type="button" style="display: none;" title="Show enhance preview" aria-label="Show enhance preview of ${escapeHtml(file.name)}">
                    <i class="fas fa-eye"></i>
                </button>
            `;
            previewContainer.appendChild(previewItem);

            createPreviewThumbnail(file).then((thumb) => {
                if (!uploadedFiles[index] || uploadedFiles[index] !== file) {
                    if (thumb.url.startsWith('blob:')) {
                        URL.revokeObjectURL(thumb.url);
                    }
                    return;
                }

                fileDimensions[index] = {
                    width: thumb.width,
                    height: thumb.height
                };
                fileFlags[index] = computeFileLargeFlag(file, thumb.width, thumb.height);
                logClientOrientationPreview(file);

                const dimsEl = previewItem.querySelector('.preview-dimensions');
                if (dimsEl) {
                    dimsEl.textContent = `${thumb.width} × ${thumb.height} px`;
                }

                const loadingEl = previewItem.querySelector('.preview-thumb-loading');
                if (loadingEl) {
                    loadingEl.remove();
                }

                const img = document.createElement('img');
                img.src = thumb.url;
                img.alt = file.name;
                if (thumb.url.startsWith('blob:')) {
                    previewThumbUrls.push(thumb.url);
                }
                previewItem.insertBefore(img, previewItem.firstChild);

                if (fileFlags[index].isLarge) {
                    const badge = document.createElement('button');
                    badge.type = 'button';
                    badge.className = 'preview-badge-large';
                    badge.setAttribute('role', 'button');
                    badge.setAttribute('aria-label', 'Large image — click for guidance');
                    badge.innerHTML = 'Large <i class="fas fa-info-circle" aria-hidden="true"></i>';
                    badge.title = 'Large image — click for guidance';
                    badge.addEventListener('click', (event) => {
                        event.stopPropagation();
                        showLargeImageInfo(index);
                    });
                    previewItem.appendChild(badge);
                }
            }).catch(() => {
                const loadingEl = previewItem.querySelector('.preview-thumb-loading');
                if (loadingEl) {
                    loadingEl.textContent = 'Preview unavailable';
                }
                fileFlags[index] = computeFileLargeFlag(file, 0, 0);
                if (file.size > (Config.LARGE_FILE_BYTES || 10 * 1024 * 1024)) {
                    fileFlags[index].isLarge = true;
                    fileFlags[index].reason = 'size';
                }
            });
        });

        // After the thumbnails exist, so the per-image eye buttons get their visibility
        updateEnhanceUi();
    }

    window.removeFile = function(index) {
        uploadedFiles.splice(index, 1);
        showPreviews();
        
        // Disable process button if no files
        if (uploadedFiles.length === 0 && processBtn) {
            processBtn.disabled = true;
            processBtn.innerHTML = '<i class="fas fa-cog"></i> Process Images';
        }
    };

    async function runServerProcessing(settings, files, cropDataMap = {}) {
        const activeProcessBtn = document.querySelector('.settings-controls .process-btn');
        const cropControlsBtn = document.getElementById('applyCropBtn');
        const cropStep = document.getElementById('cropStep');
        const failures = [];
        let lastError = null;
        lastOrientationDebugReports = [];
        lastOrientationLogFile = null;

        if (!serverLimits.loaded) {
            await loadServerLimits();
        }

        const hasCropData = Object.keys(cropDataMap).length > 0;
        if (hasCropData) {
            validateCropDataForAllFiles(files, cropDataMap);
        }

        const forceSingleFile = files.length > 1 || hasCropData || anyLargeFiles(files);
        const batches = buildUploadBatches(files, forceSingleFile);

        const setProgress = (message) => {
            if (activeProcessBtn) {
                activeProcessBtn.innerHTML = message;
            }
            if (cropControlsBtn) {
                cropControlsBtn.innerHTML = message;
            }
        };

        if (activeProcessBtn) {
            activeProcessBtn.disabled = true;
        }
        if (cropControlsBtn) {
            cropControlsBtn.disabled = true;
        }
        setProgress('<i class="fas fa-cog spinning"></i> Processing...');

        const allProcessedImages = [];
        const abortController = typeof AbortController !== 'undefined' ? new AbortController() : null;
        let cancelledByUser = false;

        let tossToyWait = Promise.resolve();
        if (window.TossToyBridge) {
            try {
                tossToyWait = window.TossToyBridge.start(files, fileFlags, {
                    onCancel: function () {
                        cancelledByUser = true;
                        if (abortController) {
                            abortController.abort();
                        }
                    }
                }) || Promise.resolve();
            } catch (tossToyError) {
                console.warn('[TossToy] start failed:', tossToyError);
            }
        }

        try {
            let completedFiles = 0;

            const reportProgress = () => {
                const progress = Math.min(100, Math.round(completedFiles / files.length * 100));
                setProgress(
                    `<i class="fas fa-cog spinning"></i> Processing... ${completedFiles}/${files.length} (${progress}%)`
                );
            };
            reportProgress();

            const sendBatchRequest = async (batch, batchSettings, batchCropData) => {
                const formData = new FormData();
                formData.append('settings', JSON.stringify(batchSettings));
                batch.forEach((file, batchIndex) => {
                    formData.append('images[]', file);
                    if (batchCropData[batchIndex]) {
                        formData.append(`cropData[${batchIndex}]`, JSON.stringify(batchCropData[batchIndex]));
                    }
                });

                let response;
                try {
                    response = await fetch('process.php', {
                        method: 'POST',
                        body: formData,
                        signal: abortController ? abortController.signal : undefined
                    });
                } catch (networkError) {
                    if (cancelledByUser || networkError.name === 'AbortError') {
                        const error = new Error('Processing stopped.');
                        error.cancelled = true;
                        throw error;
                    }
                    const error = new Error('Network error while uploading. Please check your connection.');
                    error.transient = true;
                    throw error;
                }

                const responseText = await response.text();
                let result;

                try {
                    result = JSON.parse(responseText);
                } catch (parseError) {
                    let error;
                    if (responseText.includes('Internal Server Error') || responseText.includes('<!DOCTYPE')) {
                        error = new Error(
                            'Server error while processing (often a PHP timeout on large images). ' +
                            'Try one image at a time, or increase max_execution_time in MAMP PHP settings.'
                        );
                    } else {
                        error = new Error(responseText || 'Invalid server response');
                    }
                    error.transient = true;
                    throw error;
                }

                if (!response.ok) {
                    const error = new Error(result.error || `HTTP error! status: ${response.status}`);
                    // Server errors are worth one retry; validation errors (4xx) are not
                    error.transient = response.status >= 500;
                    throw error;
                }

                if (!result.success) {
                    throw new Error(result.error || 'Processing failed');
                }

                return result;
            };

            const processBatch = async (batchEntry) => {
                const batch = batchEntry.files;
                const i = batchEntry.startIndex;

                const finishBatch = () => {
                    completedFiles += batch.length;
                    reportProgress();
                };

                const batchValidationError = validateBatchAgainstServerLimits(batch);
                if (batchValidationError) {
                    lastError = new Error(batchValidationError);
                    batch.forEach((file, batchIndex) => {
                        failures.push({
                            index: i + batchIndex,
                            name: file.name,
                            error: batchValidationError
                        });
                    });
                    finishBatch();
                    return;
                }

                const batchSettings = Object.assign({}, settings);
                const batchCropData = {};

                batch.forEach((file, batchIndex) => {
                    const globalIndex = i + batchIndex;
                    if (cropDataMap[globalIndex]) {
                        batchCropData[batchIndex] = cropDataMap[globalIndex];
                    }
                });

                if (Object.keys(batchCropData).length > 0) {
                    batchSettings.cropData = batchCropData;
                }

                let result;
                try {
                    try {
                        result = await sendBatchRequest(batch, batchSettings, batchCropData);
                    } catch (error) {
                        if (error.cancelled || !error.transient) {
                            throw error;
                        }
                        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
                        result = await sendBatchRequest(batch, batchSettings, batchCropData);
                    }
                } catch (error) {
                    if (error.cancelled) {
                        // User chose to stop; not a failure worth reporting
                        return;
                    }
                    lastError = error;
                    batch.forEach((file, batchIndex) => {
                        failures.push({
                            index: i + batchIndex,
                            name: file.name,
                            error: error.message
                        });
                    });
                    finishBatch();
                    return;
                }

                result.images.forEach((image, batchIndex) => {
                    const globalIndex = i + batchIndex;
                    const originalName = image.originalName || batch[batchIndex].name;
                    allProcessedImages.push({
                        ...image,
                        sourceIndex: globalIndex,
                        originalName,
                        name: displayFilenameFor(originalName, image.name),
                        userRotation: 0
                    });
                    if (window.TossToyBridge) {
                        try {
                            window.TossToyBridge.imageDone(globalIndex);
                        } catch (tossToyError) {
                            console.warn('[TossToy] imageDone failed:', tossToyError);
                        }
                    }
                });

                if (Array.isArray(result.errors) && result.errors.length > 0) {
                    result.errors.forEach((errorMessage) => {
                        failures.push({
                            index: i,
                            name: batch[0]?.name || `Image ${i + 1}`,
                            error: errorMessage
                        });
                    });
                }

                if (ORIENT_DEBUG && Array.isArray(result.orientationDebug)) {
                    lastOrientationDebugReports = lastOrientationDebugReports.concat(result.orientationDebug);
                    if (result.orientationLogFile) {
                        lastOrientationLogFile = result.orientationLogFile;
                    }
                }

                finishBatch();
            };

            // Worker pool: several uploads in flight at once instead of one
            // request at a time with fixed sleeps in between
            let nextBatchIndex = 0;
            const workerCount = Math.max(1, Math.min(MAX_PARALLEL_UPLOADS, batches.length));
            const workers = Array.from({ length: workerCount }, () => (async () => {
                while (!cancelledByUser && nextBatchIndex < batches.length) {
                    const batchEntry = batches[nextBatchIndex];
                    nextBatchIndex += 1;
                    await processBatch(batchEntry);
                }
            })());
            await Promise.all(workers);

            if (cancelledByUser && allProcessedImages.length === 0) {
                // User stopped processing before anything finished; just restore the UI
                return;
            }

            if (allProcessedImages.length === 0) {
                throw lastError || new Error('No images were successfully processed');
            }

            if (window.TossToyBridge) {
                try {
                    window.TossToyBridge.finishProcessing();
                } catch (tossToyError) {
                    console.warn('[TossToy] finishProcessing failed:', tossToyError);
                }
            }
            await tossToyWait;

            allProcessedImages.sort((a, b) => (a.sourceIndex ?? 0) - (b.sourceIndex ?? 0));

            // Two uploads with the same name must not download as the same file
            const takenNames = new Set();
            allProcessedImages.forEach((image) => {
                const { base, extension } = splitFilename(image.name);
                let candidate = image.name;
                let counter = 1;
                while (takenNames.has(candidate.toLowerCase())) {
                    candidate = `${base}-${counter}${extension}`;
                    counter++;
                }
                takenNames.add(candidate.toLowerCase());
                image.name = candidate;
            });

            processedImages = allProcessedImages.map((image) => ({
                ...image,
                userRotation: normalizeRotationDegrees(image.userRotation || 0)
            }));
            lastDownloadRequestedCount = files.length;
            lastDownloadFailures = failures;
            showDownloadStep(processedImages, files.length, failures);
            renderOrientationDebugPanel(lastOrientationDebugReports, lastOrientationLogFile);

            if (cropStep) {
                cropStep.style.display = 'none';
                cropStep.classList.remove('active');
            }
        } catch (error) {
            if (window.TossToyBridge) {
                try {
                    window.TossToyBridge.abort();
                } catch (tossToyError) {
                    console.warn('[TossToy] abort failed:', tossToyError);
                }
            }
            alert('Error processing images: ' + error.message);
        } finally {
            if (activeProcessBtn) {
                activeProcessBtn.disabled = false;
                activeProcessBtn.innerHTML = '<i class="fas fa-cog"></i> Process Images';
            }
            if (cropControlsBtn) {
                cropControlsBtn.disabled = false;
                cropControlsBtn.innerHTML = '<i class="fas fa-check"></i> Apply & Next <i class="fas fa-chevron-right"></i>';
            }
        }
    }

    function showDownloadStep(allProcessedImages, requestedCount = allProcessedImages.length, failures = []) {
        const splitScreen = document.querySelector('.split-screen');
        if (splitScreen) {
            splitScreen.style.display = 'none';
        }

        const cropStep = document.getElementById('cropStep');
        if (cropStep) {
            cropStep.style.display = 'none';
            cropStep.classList.remove('active');
        }

        const downloadStep = document.getElementById('downloadStep');
        if (downloadStep) {
            downloadStep.style.display = 'block';
            downloadStep.classList.add('active');
        }

        const summaryEl = document.getElementById('downloadSummary');
        if (summaryEl) {
            summaryEl.textContent = `${allProcessedImages.length} of ${requestedCount} image${requestedCount === 1 ? '' : 's'} ready to download.`;
        }

        const warningsEl = document.getElementById('downloadWarnings');
        if (warningsEl) {
            if (failures.length > 0) {
                const failureList = failures
                    .map((failure) => `${failure.name}: ${failure.error}`)
                    .join(' · ');
                warningsEl.style.display = 'block';
                warningsEl.textContent = `Some images could not be processed: ${failureList}`;
            } else {
                warningsEl.style.display = 'none';
                warningsEl.textContent = '';
            }
        }

        const container = document.getElementById('processedImages');
        if (!container) {
            return;
        }

        container.innerHTML = '';
        allProcessedImages.forEach((image, index) => {
            const item = document.createElement('div');
            item.className = 'processed-item';
            const cacheBust = `?t=${Date.now()}-${index}`;
            const imageUrl = `${image.url}${cacheBust}`;
            const rotation = normalizeRotationDegrees(image.userRotation || 0);

            const thumbWrap = document.createElement('div');
            thumbWrap.className = 'processed-item-thumb';

            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = image.name;
            if (rotation) {
                img.style.transform = `rotate(${rotation}deg)`;
            }

            thumbWrap.appendChild(img);

            const info = document.createElement('div');
            info.className = 'processed-item-info';

            const { base: filenameBase, extension: filenameExtension } = splitFilename(image.name);
            const filenameRow = document.createElement('div');
            filenameRow.className = 'processed-item-filename';

            const filenameInput = document.createElement('input');
            filenameInput.type = 'text';
            filenameInput.className = 'processed-item-filename-input';
            filenameInput.value = filenameBase;
            filenameInput.setAttribute('aria-label', `Filename for ${image.name}`);
            filenameInput.addEventListener('blur', () => commitProcessedImageFilename(index, filenameInput));
            filenameInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    commitProcessedImageFilename(index, filenameInput);
                    filenameInput.blur();
                }
            });

            const filenameExt = document.createElement('span');
            filenameExt.className = 'processed-item-filename-ext';
            filenameExt.textContent = filenameExtension;

            filenameRow.appendChild(filenameInput);
            filenameRow.appendChild(filenameExt);
            info.appendChild(filenameRow);

            const meta = document.createElement('p');
            meta.className = 'processed-item-meta';
            meta.textContent = formatProcessedImageMeta(image);
            info.appendChild(meta);

            const actions = document.createElement('div');
            actions.className = 'processed-item-actions';

            const downloadBtn = document.createElement('button');
            downloadBtn.className = 'download-btn';
            downloadBtn.type = 'button';
            downloadBtn.title = 'Download';
            downloadBtn.setAttribute('aria-label', `Download ${image.name}`);
            downloadBtn.innerHTML = '<i class="fas fa-download"></i>';
            downloadBtn.addEventListener('click', () => downloadProcessedImage(index));

            const rotateBtn = document.createElement('button');
            rotateBtn.className = 'rotate-btn';
            rotateBtn.type = 'button';
            rotateBtn.title = rotation ? `Rotate (${rotation}°)` : 'Rotate';
            rotateBtn.setAttribute('aria-label', `Rotate ${image.name}`);
            rotateBtn.innerHTML = '<i class="fas fa-rotate-right"></i>';
            rotateBtn.addEventListener('click', () => rotateProcessedImage(index));

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.type = 'button';
            deleteBtn.title = 'Remove';
            deleteBtn.setAttribute('aria-label', `Remove ${image.name}`);
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.addEventListener('click', () => deleteProcessedImage(index));

            actions.appendChild(downloadBtn);
            actions.appendChild(rotateBtn);
            actions.appendChild(deleteBtn);
            item.appendChild(thumbWrap);
            item.appendChild(info);
            item.appendChild(actions);
            container.appendChild(item);
        });

        const downloadAllBtn = document.querySelector('.download-all');
        if (downloadAllBtn) {
            downloadAllBtn.style.display = allProcessedImages.length > 1 ? 'inline-flex' : 'none';
        }
    }

    window.renderProcessedDownloadStep = function() {
        showDownloadStep(processedImages, lastDownloadRequestedCount, lastDownloadFailures);
    };

    window.processImages = async function() {
        if (!uploadedFiles || uploadedFiles.length === 0) {
            alert('Please upload at least one image');
            return;
        }

        const settings = buildSettings();
        const activeCropModeBtn = document.querySelector('.quality-btn[data-crop-mode].active');

        if (!activeCropModeBtn && settings.mode === 'crop') {
            alert('Please select a crop mode (Automatic or Manual)');
            return;
        }

        if (settings.mode === 'crop' && (!settings.width || !settings.height)) {
            alert('Please enter both width and height for crop mode');
            return;
        }

        if (settings.mode === 'resize' && selectedDimension === 'width' && !settings.width) {
            alert('Please enter a width for resize mode');
            return;
        }

        if (settings.mode === 'resize' && selectedDimension === 'height' && !settings.height) {
            alert('Please enter a height for resize mode');
            return;
        }

        if (settings.mode === 'resize' && selectedDimension === 'fit' && (!settings.width || !settings.height)) {
            alert('Please enter both a width and a height for the fit box');
            return;
        }

        if (isTargetSizeActive() && !getTargetKB()) {
            alert('Please enter a target size in KB, or switch to Quality %.');
            return;
        }

        if ((settings.mode === 'crop' || settings.mode === 'custom') && uploadedFiles.some(isHeicFile)) {
            alert('HEIC photos can\'t be shown in the crop editor by the browser. Use Resize or Optimize for HEIC photos, or convert them to JPG first.');
            return;
        }

        if (settings.mode === 'crop' && settings.cropMode === 'manual') {
            pendingCropData = {};
            cropEditorMode = 'crop';
            currentImageIndex = 0;
            editCrop(0);
            return;
        }

        if (settings.mode === 'custom') {
            pendingCropData = {};
            cropEditorMode = 'custom';
            currentImageIndex = 0;
            editCrop(0);
            return;
        }

        await runServerProcessing(settings, uploadedFiles, {});
    };

    // Initialize the interface
    updateModeOptions();
    updateDimensionInputs();
    updateQualitySlider();
    updateQualityTabsForFormat();
    applyUrlSettingsFromLocation();

    async function loadProcessingStats() {
        try {
            const response = await fetch('metrics.php', { cache: 'no-store' });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            if (!data) return;

            const images = document.getElementById('statsImages');
            const processedMB = document.getElementById('statsProcessedMB');
            const savedMB = document.getElementById('statsSavedMB');
            const subtitle = document.getElementById('statsSubtitle');
            const container = document.getElementById('processingStats');

            if (!images || !processedMB || !savedMB || !container) return;

            const totalImages = data.totalImages || 0;
            const totalProcessed = data.totalBytesProcessed || 0;
            const totalSaved = data.totalBytesSaved || 0;

            images.textContent = totalImages.toLocaleString();
            const processedMegabytes = totalProcessed / 1024 / 1024;
            const savedMegabytes = totalSaved / 1024 / 1024;

            processedMB.textContent = processedMegabytes >= 100 ? Math.round(processedMegabytes).toString() : processedMegabytes.toFixed(1);
            savedMB.textContent = savedMegabytes >= 100 ? Math.round(savedMegabytes).toString() : savedMegabytes.toFixed(1);

            if (subtitle && data.lastUpdated) {
                const now = Date.now();
                const delta = now - (data.lastUpdated * 1000);
                let relative = 'just now';
                const minute = 60 * 1000;
                const hour = 60 * minute;
                const day = 24 * hour;

                if (delta > day) {
                    const days = Math.round(delta / day);
                    relative = `${days} day${days !== 1 ? 's' : ''} ago`;
                } else if (delta > hour) {
                    const hours = Math.round(delta / hour);
                    relative = `${hours} hour${hours !== 1 ? 's' : ''} ago`;
                } else if (delta > minute) {
                    const minutes = Math.round(delta / minute);
                    relative = `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
                }

                subtitle.textContent = `Totals refreshed ${relative}`;
            }

            container.style.display = 'block';
        } catch (error) {
            // Stats are optional; hide the block when unavailable.
        }
    }

    if (SHOW_STATS) {
        loadProcessingStats();
        setInterval(loadProcessingStats, 60 * 1000);
    }

    async function loadCropPreviewSrc(file, index) {
        const sourceMeta = await readDisplayDimensions(file);
        const sourceWidth = sourceMeta.width;
        const sourceHeight = sourceMeta.height;
        const maxEdge = Config.CROP_PREVIEW_MAX_EDGE || 2048;
        const previewScale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));
        const previewWidth = Math.max(1, Math.round(sourceWidth * previewScale));
        const previewHeight = Math.max(1, Math.round(sourceHeight * previewScale));

        const meta = {
            sourceWidth,
            sourceHeight,
            previewScale,
            usesFullPreview: previewScale >= 1
        };
        cropSourceMeta[index] = meta;

        revokeCropPreviewUrl();
        if (previewScale >= 1) {
            cropPreviewObjectUrl = URL.createObjectURL(file);
        } else {
            cropPreviewObjectUrl = await downscaleFileToBlobUrl(file, previewWidth, previewHeight);
        }

        return Object.assign({ url: cropPreviewObjectUrl }, meta);
    }

    function validateCropDataForAllFiles(files, cropDataMap) {
        const missing = [];
        for (let i = 0; i < files.length; i++) {
            if (!cropDataMap[i]) {
                missing.push(files[i].name || `Image ${i + 1}`);
            }
        }
        if (missing.length > 0) {
            throw new Error(`Crop selection missing for: ${missing.join(', ')}`);
        }
    }

    function updateCropStepProgress(index, total) {
        const cropStepTitle = document.getElementById('cropStepTitle');
        const applyCropBtn = document.getElementById('applyCropBtn');
        const isLast = index >= total - 1;
        const progressLabel = `Image ${index + 1} of ${total}`;

        if (cropEditorMode === 'custom') {
            if (cropStepTitle) {
                cropStepTitle.innerHTML = `<i class="fas fa-cut"></i> Trim Image <span class="crop-progress">(${progressLabel})</span>`;
            }
        } else if (cropStepTitle) {
            cropStepTitle.innerHTML = `<i class="fas fa-crop"></i> Crop Image <span class="crop-progress">(${progressLabel})</span>`;
        }

        if (applyCropBtn) {
            applyCropBtn.innerHTML = isLast
                ? '<i class="fas fa-check"></i> Apply & Process All'
                : '<i class="fas fa-check"></i> Apply & Next <i class="fas fa-chevron-right"></i>';
        }
    }

    function getNaturalCropData() {
        if (!cropper) {
            return null;
        }

        const data = cropper.getData(true);
        return {
            x: Math.max(0, Math.round(data.x || 0)),
            y: Math.max(0, Math.round(data.y || 0)),
            width: Math.max(1, Math.round(data.width || 1)),
            height: Math.max(1, Math.round(data.height || 1))
        };
    }

    function setNaturalCropData(natural) {
        if (!cropper || cropEnforcing) {
            return;
        }

        cropEnforcing = true;
        cropper.setData({
            x: Math.round(natural.x),
            y: Math.round(natural.y),
            width: Math.round(natural.width),
            height: Math.round(natural.height)
        });

        requestAnimationFrame(() => {
            cropEnforcing = false;
        });
    }

    function cropCoordsChanged(a, b, tolerance = 1) {
        return Math.abs(a.x - b.x) > tolerance ||
            Math.abs(a.y - b.y) > tolerance ||
            Math.abs(a.width - b.width) > tolerance ||
            Math.abs(a.height - b.height) > tolerance;
    }

    function clampCropPosition(x, y, width, height, imageWidth, imageHeight) {
        const newW = Math.min(width, imageWidth);
        const newH = Math.min(height, imageHeight);
        let newX = x;
        let newY = y;

        if (newX + newW > imageWidth) {
            newX = imageWidth - newW;
        }
        if (newY + newH > imageHeight) {
            newY = imageHeight - newH;
        }

        return {
            x: Math.max(0, Math.round(newX)),
            y: Math.max(0, Math.round(newY)),
            width: newW,
            height: newH
        };
    }

    function getMaxCropFit(targetW, targetH, imageW, imageH) {
        const aspect = targetW / targetH;
        let width;
        let height;

        if (imageW / imageH >= aspect) {
            height = imageH;
            width = Math.round(height * aspect);
        } else {
            width = imageW;
            height = Math.round(width / aspect);
        }

        return {
            width: Math.min(width, imageW),
            height: Math.min(height, imageH)
        };
    }

    function configureCropMinConstraints() {
        if (!cropper || cropEditorMode === 'custom') {
            return;
        }

        const imageData = cropper.getImageData();
        if (!imageData.naturalWidth || !imageData.width) {
            return;
        }

        const meta = getCropPreviewMeta(currentImageIndex);
        const sourceNatW = meta.sourceWidth || imageData.naturalWidth;
        const sourceNatH = meta.sourceHeight || imageData.naturalHeight;
        const ratioW = imageData.naturalWidth / sourceNatW;
        const ratioH = imageData.naturalHeight / sourceNatH;
        const { width: targetW, height: targetH } = getTargetCropDimensions();
        const minW = Math.min(targetW, sourceNatW);
        const minH = Math.min(targetH, sourceNatH);

        cropper.options.minCropBoxWidth = minW * ratioW;
        cropper.options.minCropBoxHeight = minH * ratioH;
    }

    function updateCropDimensionReadout() {
        if (!cropper) {
            return;
        }

        const imageData = cropper.getImageData();
        const cropData = getNaturalCropData();
        if (!cropData) {
            return;
        }

        const meta = getCropPreviewMeta(currentImageIndex);
        const naturalWidth = meta.sourceWidth || Math.round(imageData.naturalWidth);
        const naturalHeight = meta.sourceHeight || Math.round(imageData.naturalHeight);
        const { scaleX, scaleY } = getPreviewToSourceScale(meta, imageData);
        const selW = Math.max(1, Math.round(cropData.width * scaleX));
        const selH = Math.max(1, Math.round(cropData.height * scaleY));
        const trimLeft = Math.max(0, Math.round(cropData.x * scaleX));
        const trimTop = Math.max(0, Math.round(cropData.y * scaleY));
        const trimRight = Math.max(0, naturalWidth - trimLeft - selW);
        const trimBottom = Math.max(0, naturalHeight - trimTop - selH);

        const originalEl = document.getElementById('cropOriginalSize');
        const trimEl = document.getElementById('cropTrimSize');
        const selectionEl = document.getElementById('cropSelectionSize');
        const outputEl = document.getElementById('cropOutputSize');

        if (originalEl) {
            originalEl.textContent = `${naturalWidth} × ${naturalHeight} px`;
        }
        if (trimEl) {
            trimEl.textContent = `left ${trimLeft} · top ${trimTop} · right ${trimRight} · bottom ${trimBottom}`;
        }
        if (selectionEl) {
            selectionEl.textContent = `${selW} × ${selH} px`;
        }
        if (outputEl) {
            if (cropEditorMode === 'custom') {
                outputEl.textContent = `${selW} × ${selH} px`;
            } else {
                const { width: targetW, height: targetH } = getTargetCropDimensions();
                outputEl.textContent = `${targetW} × ${targetH} px`;
            }
        }

        // Selection smaller than the output: warn, and only allow
        // continuing when the user explicitly accepts enlarging
        let tooSmall = false;
        if (cropEditorMode !== 'custom') {
            const { width: targetW, height: targetH } = getTargetCropDimensions();
            tooSmall = selW < targetW || selH < targetH;
        }
        if (selectionEl) {
            selectionEl.classList.toggle('crop-selection-small', tooSmall);
        }
        const warnIcon = document.getElementById('cropSelectionWarnIcon');
        if (warnIcon) {
            warnIcon.style.display = tooSmall ? '' : 'none';
        }
        const upscaleSwitch = document.getElementById('cropUpscaleInline');
        if (upscaleSwitch) {
            upscaleSwitch.style.display = tooSmall ? '' : 'none';
        }
        const applyBtn = document.getElementById('applyCropBtn');
        if (applyBtn && cropperReady) {
            applyBtn.disabled = tooSmall && !window.allowCropUpscale;
        }
    }
    window.refreshCropReadout = updateCropDimensionReadout;

    function getTargetCropDimensions() {
        const width = parseInt(document.getElementById('width').value, 10) || 400;
        const height = parseInt(document.getElementById('height').value, 10) || 300;
        return { width, height };
    }

    let cropEnforcing = false;

    function isCropOutOfBounds(data, imageWidth, imageHeight, tolerance = 2) {
        return data.x < -tolerance ||
            data.y < -tolerance ||
            (data.x + data.width) > (imageWidth + tolerance) ||
            (data.y + data.height) > (imageHeight + tolerance);
    }

    function enforceCropBounds() {
        if (!cropper || cropEnforcing) {
            return;
        }

        const imageData = cropper.getImageData();
        const data = getNaturalCropData();
        if (!data || !isCropOutOfBounds(data, imageData.naturalWidth, imageData.naturalHeight)) {
            return;
        }

        const clamped = clampCropPosition(
            data.x,
            data.y,
            data.width,
            data.height,
            imageData.naturalWidth,
            imageData.naturalHeight
        );

        if (cropCoordsChanged(data, clamped)) {
            setNaturalCropData(clamped);
        }
    }

    function enforceMinCropSize() {
        if (!cropper || cropEditorMode === 'custom' || cropEnforcing) {
            return;
        }

        const { width: targetW, height: targetH } = getTargetCropDimensions();
        const imageData = cropper.getImageData();
        const meta = getCropPreviewMeta(currentImageIndex);
        const data = getNaturalCropData();
        if (!data) {
            return;
        }

        const ratioW = imageData.naturalWidth / meta.sourceWidth;
        const ratioH = imageData.naturalHeight / meta.sourceHeight;
        const minW = Math.min(targetW, meta.sourceWidth) * ratioW;
        const minH = Math.min(targetH, meta.sourceHeight) * ratioH;

        if (data.width >= minW && data.height >= minH) {
            return;
        }

        const aspect = targetW / targetH;
        const centerX = data.x + (data.width / 2);
        const centerY = data.y + (data.height / 2);

        let newW = Math.max(minW, data.width);
        let newH = Math.max(minH, data.height);

        if (Math.abs((newW / newH) - aspect) > 0.001) {
            if ((newW / newH) > aspect) {
                newW = Math.round(newH * aspect);
            } else {
                newH = Math.round(newW / aspect);
            }
        }

        newW = Math.max(minW, Math.min(newW, imageData.naturalWidth));
        newH = Math.max(minH, Math.min(newH, imageData.naturalHeight));

        const clamped = clampCropPosition(
            Math.round(centerX - (newW / 2)),
            Math.round(centerY - (newH / 2)),
            newW,
            newH,
            imageData.naturalWidth,
            imageData.naturalHeight
        );

        setNaturalCropData(clamped);
    }

    function initializeMaxCropBox() {
        if (!cropper || cropEditorMode === 'custom') {
            return;
        }

        const { width: targetW, height: targetH } = getTargetCropDimensions();
        const imageData = cropper.getImageData();
        const meta = getCropPreviewMeta(currentImageIndex);
        const sourceW = meta.sourceWidth || imageData.naturalWidth;
        const sourceH = meta.sourceHeight || imageData.naturalHeight;
        const ratioW = imageData.naturalWidth / sourceW;
        const ratioH = imageData.naturalHeight / sourceH;
        const fit = getMaxCropFit(targetW, targetH, sourceW, sourceH);
        const x = Math.max(0, Math.round(((sourceW - fit.width) / 2) * ratioW));
        const y = Math.max(0, Math.round(((sourceH - fit.height) / 2) * ratioH));

        setNaturalCropData({
            x: x,
            y: y,
            width: Math.round(fit.width * ratioW),
            height: Math.round(fit.height * ratioH)
        });
    }

    function initializeMaxCustomCropBox() {
        if (!cropper || cropEditorMode !== 'custom') {
            return;
        }

        const imageData = cropper.getImageData();
        setNaturalCropData({
            x: 0,
            y: 0,
            width: imageData.naturalWidth,
            height: imageData.naturalHeight
        });
    }

    function onCropperCrop() {
        updateCropDimensionReadout();
    }

    function onCropperCropEnd() {
        if (cropEditorMode === 'custom') {
            enforceCropBounds();
        } else {
            enforceMinCropSize();
        }
        updateCropDimensionReadout();
    }

    async function editCrop(index) {
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
        revokeCropPreviewUrl();
        cropperReady = false;

        const applyCropBtn = document.getElementById('applyCropBtn');
        if (applyCropBtn) {
            applyCropBtn.disabled = true;
        }

        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

        currentImageIndex = index;
        const file = uploadedFiles[index];
        const cropImage = document.getElementById('cropImage');

        updateCropStepProgress(index, uploadedFiles.length);
        showCropStep();

        try {
            const preview = await loadCropPreviewSrc(file, index);
            cropImage.src = preview.url;

            const startCropper = () => {
                cropImage.onload = null;
                initCropper();
            };
            cropImage.onload = startCropper;
            if (cropImage.complete && cropImage.naturalWidth > 0) {
                startCropper();
            }
        } catch (error) {
            alert('Failed to load image for cropping: ' + error.message);
            if (applyCropBtn) {
                applyCropBtn.disabled = false;
            }
        }
    }

    function initCropper() {
        if (cropper) {
            cropper.destroy();
        }

        cropperReady = false;
        const applyCropBtn = document.getElementById('applyCropBtn');
        if (applyCropBtn) {
            applyCropBtn.disabled = true;
        }

        const cropStepTitle = document.getElementById('cropStepTitle');
        const cropImage = document.getElementById('cropImage');
        const commonOptions = {
            viewMode: 1,
            autoCropArea: 1,
            restore: false,
            guides: true,
            center: true,
            highlight: true,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: false,
            zoomable: true,
            zoomOnWheel: true,
            background: true,
            modal: true,
            crop: onCropperCrop,
            cropend: onCropperCropEnd
        };

        if (cropEditorMode === 'custom') {
            if (cropStepTitle) {
                cropStepTitle.innerHTML = '<i class="fas fa-cut"></i> Trim Image';
            }
            updateCropStepProgress(currentImageIndex, uploadedFiles.length);
            cropper = new Cropper(cropImage, Object.assign({}, commonOptions, {
                aspectRatio: NaN,
                dragMode: 'crop',
                ready() {
                    syncCropPreviewMetaFromCropper(currentImageIndex);
                    initializeMaxCustomCropBox();
                    updateCropDimensionReadout();
                    cropperReady = true;
                    if (applyCropBtn) {
                        applyCropBtn.disabled = false;
                    }
                }
            }));
        } else {
            if (cropStepTitle) {
                cropStepTitle.innerHTML = '<i class="fas fa-crop"></i> Crop Image';
            }
            updateCropStepProgress(currentImageIndex, uploadedFiles.length);
            const { width, height } = getTargetCropDimensions();
            cropper = new Cropper(cropImage, Object.assign({}, commonOptions, {
                aspectRatio: width / height,
                dragMode: 'crop',
                ready() {
                    syncCropPreviewMetaFromCropper(currentImageIndex);
                    configureCropMinConstraints();
                    initializeMaxCropBox();
                    cropperReady = true;
                    if (applyCropBtn) {
                        applyCropBtn.disabled = false;
                    }
                    // After enabling: re-evaluates the too-small state and
                    // disables again when enlarging is not allowed
                    updateCropDimensionReadout();
                }
            }));
        }
    }

    function showCropStep() {
        document.querySelector('.split-screen').style.display = 'none';
        const cropStep = document.getElementById('cropStep');
        cropStep.style.display = 'block';
        cropStep.classList.add('active');
    }

    window.applyCrop = async function() {
        if (!cropper || !cropperReady) {
            return;
        }

        const cropButton = document.getElementById('applyCropBtn') || document.querySelector('.crop-controls .btn');
        const originalButtonContent = cropButton.innerHTML;
        cropButton.disabled = true;
        cropButton.innerHTML = '<i class="fas fa-cog spinning"></i> Saving...';

        try {
            const data = getNaturalCropData();
            if (!data) {
                return;
            }

            const meta = getCropPreviewMeta(currentImageIndex);
            const imageData = cropper.getImageData();
            const { scaleX, scaleY } = getPreviewToSourceScale(meta, imageData);
            const sourceCropWidth = Math.max(1, Math.round(data.width * scaleX));
            const sourceCropHeight = Math.max(1, Math.round(data.height * scaleY));

            if (cropEditorMode !== 'custom' && !window.allowCropUpscale) {
                const { width: minW, height: minH } = getTargetCropDimensions();
                if (sourceCropWidth < minW || sourceCropHeight < minH) {
                    alert(`Selection must be at least ${minW}×${minH} pixels, or turn on "Allow enlarging" below the size info.`);
                    return;
                }
            }

            if (!data.width || !data.height) {
                alert('Please select a valid trim area before continuing.');
                return;
            }

            // Always crop server-side from coordinates: the original file is uploaded
            // untouched and Imagick does a single Lanczos resample + encode, instead
            // of a lossy canvas re-encode followed by a second server encode.
            pendingCropData[currentImageIndex] = mapCropDataToSourceSpace(data, meta, imageData);

            if (currentImageIndex < uploadedFiles.length - 1) {
                editCrop(currentImageIndex + 1);
                setTimeout(() => {
                    cropButton.disabled = false;
                    cropButton.innerHTML = originalButtonContent;
                }, 300);
                return;
            }

            const settings = buildSettings();
            if (cropEditorMode === 'custom') {
                settings.mode = 'custom';
                settings.width = null;
                settings.height = null;
            } else {
                settings.cropMode = 'manual';
            }

            await runServerProcessing(settings, uploadedFiles, pendingCropData);
        } catch (error) {
            alert('Error processing images: ' + error.message);
        } finally {
            cropButton.disabled = false;
            cropButton.innerHTML = originalButtonContent;
        }
    };

    function handlePageDragOver(e) {
        e.preventDefault();
        // Only show page drag feedback if we're not over the dropzone
        if (!dropzone.contains(e.target)) {
            document.body.classList.add('page-dragover');
        }
    }

    function handlePageDrop(e) {
        e.preventDefault();
        document.body.classList.remove('page-dragover');
        
        // Only handle if we're not dropping on the dropzone (to avoid double handling)
        if (!dropzone.contains(e.target)) {
            const files = Array.from(e.dataTransfer.files);
            handleFiles(files);
        }
    }

    function handlePageDragLeave(e) {
        // Only remove the class if we're leaving the page entirely
        if (!e.relatedTarget || !document.body.contains(e.relatedTarget)) {
            document.body.classList.remove('page-dragover');
        }
    }

    window.showLargeImageInfo = function(index) {
        const file = uploadedFiles[index];
        if (!file) {
            return;
        }

        const dims = fileDimensions[index] || {};
        const flags = fileFlags[index] || {};
        const modal = document.getElementById('largeImageModal');
        const body = document.getElementById('largeImageModalBody');
        if (!modal || !body) {
            return;
        }

        const reasons = [];
        if (flags.reason === 'size' || flags.reason === 'both') {
            reasons.push('file size exceeds 10MB');
        }
        if (flags.reason === 'dimensions' || flags.reason === 'both') {
            reasons.push('dimensions exceed 5000px');
        }

        body.innerHTML = `
            <p><strong>${escapeHtml(file.name)}</strong></p>
            <p>${formatSizeMb(file.size)}MB · ${dims.width || '—'} × ${dims.height || '—'} px</p>
            <p>This image is flagged as large (${reasons.join(' and ') || 'size or dimensions'}). You can still try processing it.</p>
            <p>If you run into errors or odd results, process your images <strong>one at a time</strong>.</p>
            <p><strong>Tips:</strong></p>
            <ul>
                <li>Try your batch as usual — many large images work fine</li>
                <li>If processing fails, upload and process <strong>one image at a time</strong></li>
                <li>Or resize below 5000px / 10MB before uploading</li>
                <li>For crop mode, crop each image separately before processing the next batch</li>
            </ul>
            <div class="large-image-modal-actions">
                <button type="button" class="btn btn-secondary" onclick="resizeLargeImageFirst(${index})">
                    <i class="fas fa-compress"></i> Resize this image first
                </button>
            </div>
        `;
        modal.style.display = 'block';
    };

    window.closeLargeImageInfo = function() {
        const modal = document.getElementById('largeImageModal');
        if (modal) {
            modal.style.display = 'none';
        }
    };

    window.resizeLargeImageFirst = async function(index) {
        const file = uploadedFiles[index];
        if (!file) {
            return;
        }

        window.closeLargeImageInfo();

        const resizeModeBtn = document.querySelector('.mode-btn[data-mode="resize"]');
        if (resizeModeBtn) {
            resizeModeBtn.click();
        }

        const widthInput = document.getElementById('width');
        const heightInput = document.getElementById('height');
        const widthDimBtn = document.querySelector('.dimension-btn[data-dimension="width"]');
        if (widthDimBtn) {
            widthDimBtn.click();
        }
        if (widthInput) {
            widthInput.value = String(Config.LARGE_RESIZE_TARGET || 5000);
        }
        if (heightInput) {
            heightInput.value = '';
        }

        const settings = buildSettings({
            mode: 'resize',
            width: Config.LARGE_RESIZE_TARGET || 5000,
            height: null
        });

        await runServerProcessing(settings, [file], {});
    };
});

// Download functions
window.rotateProcessedImage = function(index) {
    const image = processedImages[index];
    if (!image) {
        return;
    }

    image.userRotation = normalizeRotationDegrees((image.userRotation || 0) + 90);
    if (typeof window.renderProcessedDownloadStep === 'function') {
        window.renderProcessedDownloadStep();
    }
};

window.downloadProcessedImage = async function(index) {
    const image = processedImages[index];
    if (!image) {
        return;
    }

    try {
        const blob = await exportProcessedImageBlob(image);
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = image.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(objectUrl);
    } catch (error) {
        alert('Error downloading image: ' + error.message);
    }
};

// Ask the server to sweep files older than 30 minutes; fire-and-forget
function pingServerCleanup() {
    try {
        if (navigator.sendBeacon) {
            navigator.sendBeacon('cleanup.php');
        } else {
            fetch('cleanup.php', { method: 'POST', keepalive: true }).catch(() => {});
        }
    } catch (e) {
        // Cleanup is best-effort; never interrupt a download
    }
}

window.downloadImage = function(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    pingServerCleanup();
};

window.downloadAll = async function() {
    if (!processedImages || processedImages.length === 0) {
        alert('No images to download');
        return;
    }

    const downloadAllBtn = document.querySelector('.download-all');
    const originalLabel = downloadAllBtn ? downloadAllBtn.innerHTML : '';
    const setLabel = (html) => {
        if (downloadAllBtn) {
            downloadAllBtn.innerHTML = html;
        }
    };
    if (downloadAllBtn) {
        downloadAllBtn.disabled = true;
    }

    try {
        const zip = new JSZip();
        let fetched = 0;
        setLabel(`<i class="fas fa-cog spinning"></i> Zipping... 0/${processedImages.length}`);

        // Fetch a few blobs at a time instead of strictly one-by-one
        let nextIndex = 0;
        const workers = Array.from({ length: Math.min(4, processedImages.length) }, () => (async () => {
            while (nextIndex < processedImages.length) {
                const index = nextIndex;
                nextIndex += 1;
                const image = processedImages[index];
                const blob = await exportProcessedImageBlob(image);
                zip.file(image.name, blob);
                fetched += 1;
                setLabel(`<i class="fas fa-cog spinning"></i> Zipping... ${fetched}/${processedImages.length}`);
            }
        })());
        await Promise.all(workers);

        // STORE: the images are already compressed; deflating them again is slow for nothing
        const content = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = 'processed_images.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        pingServerCleanup();
    } catch (error) {
        alert('Error creating zip file. Please try downloading images individually.');
    } finally {
        if (downloadAllBtn) {
            downloadAllBtn.disabled = false;
            downloadAllBtn.innerHTML = originalLabel;
        }
    }
};

window.deleteProcessedImage = function(index) {
    if (confirm('Are you sure you want to delete this image?')) {
        processedImages.splice(index, 1);

        if (typeof window.renderProcessedDownloadStep === 'function') {
            window.renderProcessedDownloadStep();
        }
    }
};

// Effects info modal functions
function showEffectsInfo() {
    document.getElementById('effectsInfoModal').style.display = 'block';
}

function closeEffectsInfo() {
    document.getElementById('effectsInfoModal').style.display = 'none';
}

// Quality info modal functions
function showQualityInfo() {
    document.getElementById('qualityInfoModal').style.display = 'block';
}

function closeQualityInfo() {
    document.getElementById('qualityInfoModal').style.display = 'none';
}

// Format info modal functions
function showFormatInfo() {
    document.getElementById('formatInfoModal').style.display = 'block';
}

function closeFormatInfo() {
    document.getElementById('formatInfoModal').style.display = 'none';
}

// Crop info modal functions
function showCropInfo() {
    document.getElementById('cropInfoModal').style.display = 'block';
}

function closeCropInfo() {
    document.getElementById('cropInfoModal').style.display = 'none';
}

// Privacy modal functions - uses Bootstrap modal
function showPrivacyModal() {
    const modal = new bootstrap.Modal(document.getElementById('privacyModal'));
    modal.show();
}

// Close modals when clicking outside
window.onclick = function(event) {
    const qualityModal = document.getElementById('qualityInfoModal');
    const formatModal = document.getElementById('formatInfoModal');
    const cropModal = document.getElementById('cropInfoModal');
    const effectsModal = document.getElementById('effectsInfoModal');
    const largeModal = document.getElementById('largeImageModal');
    if (event.target === qualityModal) {
        closeQualityInfo();
    }
    if (event.target === formatModal) {
        closeFormatInfo();
    }
    if (event.target === cropModal) {
        closeCropInfo();
    }
    if (event.target === effectsModal) {
        closeEffectsInfo();
    }
    if (event.target === largeModal) {
        closeLargeImageInfo();
    }
}