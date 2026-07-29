/**
 * EasyUpload — shared client-side upload validation for the Easy Plugins tools.
 * One place for the allowed types and size caps that every tool used to
 * re-implement (each slightly differently).
 */
(function (window) {
    'use strict';

    const MAX_FILE_BYTES = 50 * 1024 * 1024; // matches the easy-image server cap

    // Raster formats a canvas can draw and export safely.
    // SVG is deliberately excluded: drawing it taints the canvas in several
    // browsers, which makes toBlob() fail silently at export time.
    const RASTER_MIME_TYPES = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/x-webp',
        'image/gif',
        'image/bmp'
    ];
    const RASTER_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'];

    function getExtension(filename) {
        const parts = String(filename || '').split('.');
        return parts.length > 1 ? parts.pop().toLowerCase() : '';
    }

    function formatBytes(bytes) {
        if (bytes >= 1024 * 1024) {
            return Math.round(bytes / (1024 * 1024)) + 'MB';
        }
        return Math.round(bytes / 1024) + 'KB';
    }

    /**
     * Validate an image file for canvas-based tools.
     * Returns { ok: true } or { ok: false, error: '<human readable reason>' }.
     * options: { maxBytes, allowedTypes, allowedExtensions }
     */
    function validateImageFile(file, options) {
        const opts = options || {};
        const maxBytes = opts.maxBytes || MAX_FILE_BYTES;
        const allowedTypes = opts.allowedTypes || RASTER_MIME_TYPES;
        const allowedExtensions = opts.allowedExtensions || RASTER_EXTENSIONS;

        if (!file) {
            return { ok: false, error: 'No file selected.' };
        }

        const type = String(file.type || '').toLowerCase();
        const extension = getExtension(file.name);

        if (type === 'image/svg+xml' || extension === 'svg') {
            return {
                ok: false,
                error: 'SVG files are not supported. Please convert the SVG to PNG first.'
            };
        }

        const typeOk = allowedTypes.indexOf(type) !== -1;
        const extensionOk = allowedExtensions.indexOf(extension) !== -1;
        if (!typeOk && !extensionOk) {
            const names = allowedExtensions.map(function (ext) {
                return ext.toUpperCase();
            });
            const list = names.length > 1
                ? names.slice(0, -1).join(', ') + ' or ' + names[names.length - 1]
                : names[0];
            return {
                ok: false,
                error: 'Unsupported file type. Please use ' + list + '.'
            };
        }

        if (file.size > maxBytes) {
            return {
                ok: false,
                error: 'File is too large (' + formatBytes(file.size) + '). Maximum is ' + formatBytes(maxBytes) + '.'
            };
        }

        return { ok: true };
    }

    window.EasyUpload = {
        MAX_FILE_BYTES: MAX_FILE_BYTES,
        RASTER_MIME_TYPES: RASTER_MIME_TYPES,
        RASTER_EXTENSIONS: RASTER_EXTENSIONS,
        validateImageFile: validateImageFile
    };
})(window);
