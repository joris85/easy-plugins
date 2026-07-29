/**
 * EasyCanvas — shared canvas export helpers for the Easy Plugins image tools.
 * Centralizes export quality so every tool resamples and encodes the same way.
 */
(function (window) {
    'use strict';

    const DEFAULT_QUALITY = 85; // percent; 70 was visibly lossy for photos

    function applyHighQualitySmoothing(ctx) {
        if (!ctx) {
            return ctx;
        }
        ctx.imageSmoothingEnabled = true;
        if ('imageSmoothingQuality' in ctx) {
            ctx.imageSmoothingQuality = 'high';
        }
        return ctx;
    }

    function getContext2D(canvas, options) {
        const ctx = canvas.getContext('2d', options || {});
        return applyHighQualitySmoothing(ctx);
    }

    /**
     * Encode a canvas to a Blob.
     * qualityPercent (1-100) applies to image/jpeg and image/webp only;
     * PNG ignores it per the canvas spec.
     */
    function toBlob(canvas, mimeType, qualityPercent) {
        const type = mimeType || 'image/png';
        const lossy = type === 'image/jpeg' || type === 'image/webp';
        const percent = parseInt(qualityPercent, 10);
        const quality = lossy
            ? Math.max(1, Math.min(100, Number.isFinite(percent) ? percent : DEFAULT_QUALITY)) / 100
            : undefined;

        return new Promise(function (resolve, reject) {
            canvas.toBlob(function (blob) {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Could not export the image. If the source is an SVG or cross-origin image, the canvas may be tainted.'));
                }
            }, type, quality);
        });
    }

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || 'image';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(function () {
            URL.revokeObjectURL(url);
        }, 1000);
    }

    // Browsers (mobile Safari especially) silently fail canvas exports above a
    // certain pixel count — toBlob just returns null. Guard at load time instead.
    const MAX_SOURCE_PIXELS = 24 * 1000 * 1000; // ~24 megapixels

    /**
     * Returns a human-readable error when an image is too large to edit safely
     * on a canvas, or null when it is fine. maxPixels overrides the default cap.
     */
    function sourceSizeError(width, height, maxPixels) {
        const limit = maxPixels || MAX_SOURCE_PIXELS;
        if (width * height > limit) {
            const mp = Math.round((width * height) / 1e6);
            const limitMp = Math.round(limit / 1e6);
            return 'This image is about ' + mp + ' megapixels — more than the ' + limitMp
                + ' MP this tool can safely edit in the browser. Please resize it first (Easy Image can do that).';
        }
        return null;
    }

    /** Derive an export filename from the original, e.g. photo.png -> photo-edited.webp */
    function exportFilename(originalName, suffix, extension) {
        const base = (originalName || 'image').replace(/\.[^.]+$/, '') || 'image';
        return base + (suffix ? '-' + suffix : '') + '.' + extension.replace(/^\./, '');
    }

    window.EasyCanvas = {
        DEFAULT_QUALITY: DEFAULT_QUALITY,
        MAX_SOURCE_PIXELS: MAX_SOURCE_PIXELS,
        applyHighQualitySmoothing: applyHighQualitySmoothing,
        getContext2D: getContext2D,
        toBlob: toBlob,
        downloadBlob: downloadBlob,
        exportFilename: exportFilename,
        sourceSizeError: sourceSizeError
    };
})(window);
