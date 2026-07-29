window.UrlParams = (function() {
    const QUALITY_ALIASES = {
        low: 50,
        medium: 60,
        smart: 70,
        sharp: 85,
        max: 100
    };

    const QUALITY_BY_VALUE = Object.fromEntries(
        Object.entries(QUALITY_ALIASES).map(function(entry) {
            return [String(entry[1]), entry[0]];
        })
    );

    const DEFAULTS = {
        mode: 'resize',
        dimension: 'width',
        quality: 'smart',
        crop: 'manual',
        align: 'center-middle',
        format: 'webp'
    };

    const VALID_MODES = ['resize', 'crop', 'optimize', 'custom'];
    const VALID_DIMENSIONS = ['width', 'height', 'fit'];
    const VALID_CROP_MODES = ['auto', 'manual'];
    const VALID_FORMATS = ['jpg', 'png', 'webp'];
    const VALID_ALIGNMENTS = [
        'top-left', 'top-center', 'top-right',
        'left-middle', 'center-middle', 'right-middle',
        'bottom-left', 'bottom-center', 'bottom-right'
    ];

    const SETTING_KEYS = new Set([
        'mode', 'width', 'height', 'dimension', 'quality', 'crop', 'cropMode', 'align', 'format'
    ]);

    // enhance/strength are owned by the enhance selector (app.js) and must
    // survive every settings rewrite of the URL
    const PRESERVE_PARAMS = ['orient_debug', 'enhance', 'strength'];

    function parsePositiveInt(value) {
        const n = parseInt(value, 10);
        return Number.isFinite(n) && n > 0 ? n : null;
    }

    function qualityAliasForValue(num) {
        return QUALITY_BY_VALUE[String(num)] || null;
    }

    function qualityToUrlValue(quality) {
        if (typeof quality === 'string' && QUALITY_ALIASES[quality]) {
            return quality;
        }
        const num = typeof quality === 'number' ? quality : parseInt(quality, 10);
        if (!Number.isFinite(num)) {
            return DEFAULTS.quality;
        }
        return qualityAliasForValue(num) || String(num);
    }

    function parseQuality(value) {
        if (value == null || value === '') {
            return null;
        }
        const lower = String(value).toLowerCase();
        if (lower === 'custom') {
            return 'custom';
        }
        if (QUALITY_ALIASES[lower] != null) {
            return lower;
        }
        const num = parseInt(value, 10);
        if (Number.isFinite(num) && num >= 1 && num <= 100) {
            return qualityAliasForValue(num) || num;
        }
        return null;
    }

    function parseUrlSettings(search) {
        const params = new URLSearchParams(search || window.location.search);
        const settings = {};

        if (params.has('mode')) {
            const mode = params.get('mode').toLowerCase();
            if (VALID_MODES.includes(mode)) {
                settings.mode = mode;
            }
        }

        if (params.has('width')) {
            const width = parsePositiveInt(params.get('width'));
            if (width != null) {
                settings.width = width;
            }
        }

        if (params.has('height')) {
            const height = parsePositiveInt(params.get('height'));
            if (height != null) {
                settings.height = height;
            }
        }

        if (params.has('dimension')) {
            const dimension = params.get('dimension').toLowerCase();
            if (VALID_DIMENSIONS.includes(dimension)) {
                settings.dimension = dimension;
            }
        }

        if (params.has('quality')) {
            const quality = parseQuality(params.get('quality'));
            if (quality != null) {
                settings.quality = quality;
            }
        }

        const cropParam = params.has('crop') ? params.get('crop') : (params.has('cropMode') ? params.get('cropMode') : null);
        if (cropParam != null) {
            const crop = cropParam.toLowerCase();
            if (VALID_CROP_MODES.includes(crop)) {
                settings.crop = crop;
            }
        }

        if (params.has('align')) {
            const align = params.get('align').toLowerCase();
            if (VALID_ALIGNMENTS.includes(align)) {
                settings.align = align;
            }
        }

        if (params.has('format')) {
            const format = params.get('format').toLowerCase();
            if (VALID_FORMATS.includes(format)) {
                settings.format = format;
            }
        }

        return settings;
    }

    function filterDefaultSettings(settings) {
        const filtered = {};
        if (!settings) {
            return filtered;
        }

        if (settings.mode && settings.mode !== DEFAULTS.mode) {
            filtered.mode = settings.mode;
        }

        if (settings.dimension && settings.dimension !== DEFAULTS.dimension) {
            filtered.dimension = settings.dimension;
        }

        if (settings.width != null) {
            filtered.width = settings.width;
        }

        if (settings.height != null) {
            filtered.height = settings.height;
        }

        if (settings.quality != null) {
            const qualityUrl = qualityToUrlValue(settings.quality);
            if (qualityUrl !== DEFAULTS.quality) {
                filtered.quality = settings.quality;
            }
        }

        if (settings.crop && settings.crop !== DEFAULTS.crop) {
            filtered.crop = settings.crop;
        }

        if (settings.align && settings.align !== DEFAULTS.align) {
            filtered.align = settings.align;
        }

        if (settings.format && settings.format !== DEFAULTS.format) {
            filtered.format = settings.format;
        }

        return filtered;
    }

    function hasSettings(settings) {
        return Object.keys(filterDefaultSettings(settings)).length > 0;
    }

    function readFromLocation() {
        return parseUrlSettings(window.location.search);
    }

    function buildQueryString(settings) {
        const params = new URLSearchParams();
        const current = new URLSearchParams(window.location.search);

        PRESERVE_PARAMS.forEach(function(key) {
            if (current.has(key)) {
                params.set(key, current.get(key));
            }
        });

        const mode = settings.mode || DEFAULTS.mode;

        if (mode !== DEFAULTS.mode) {
            params.set('mode', mode);
        }

        if (mode === 'resize') {
            const dimension = settings.dimension || DEFAULTS.dimension;
            if (dimension !== DEFAULTS.dimension) {
                params.set('dimension', dimension);
            }
            if (dimension === 'width' && settings.width != null) {
                params.set('width', String(settings.width));
            }
            if (dimension === 'height' && settings.height != null) {
                params.set('height', String(settings.height));
            }
        } else if (mode === 'crop') {
            if (settings.width != null) {
                params.set('width', String(settings.width));
            }
            if (settings.height != null) {
                params.set('height', String(settings.height));
            }
            const crop = settings.crop || DEFAULTS.crop;
            if (crop !== DEFAULTS.crop) {
                params.set('crop', crop);
            }
            if (crop === 'auto') {
                const align = settings.align || DEFAULTS.align;
                if (align !== DEFAULTS.align) {
                    params.set('align', align);
                }
            }
        }

        const qualityUrl = qualityToUrlValue(settings.quality != null ? settings.quality : DEFAULTS.quality);
        if (qualityUrl !== DEFAULTS.quality) {
            params.set('quality', qualityUrl);
        }

        const format = settings.format || DEFAULTS.format;
        if (format !== DEFAULTS.format) {
            params.set('format', format);
        }

        return params.toString();
    }

    function writeToLocation(settings) {
        const qs = buildQueryString(settings);
        const url = qs ? window.location.pathname + '?' + qs : window.location.pathname;
        history.replaceState(null, '', url);
    }

    return {
        QUALITY_ALIASES: QUALITY_ALIASES,
        DEFAULTS: DEFAULTS,
        parseUrlSettings: parseUrlSettings,
        hasSettings: hasSettings,
        readFromLocation: readFromLocation,
        buildQueryString: buildQueryString,
        writeToLocation: writeToLocation,
        qualityAliasForValue: qualityAliasForValue,
        qualityToUrlValue: qualityToUrlValue
    };
})();
