const Config = {
    CROP_PREVIEW_MAX_EDGE: 2048,
    LARGE_FILE_BYTES: 10 * 1024 * 1024,
    LARGE_MAX_DIMENSION: 5000,
    LARGE_RESIZE_TARGET: 5000,
    SUPPORTED_EXTENSIONS: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'],

    getExtension: function(filename) {
        const parts = (filename || '').split('.');
        return parts.length > 1 ? parts.pop().toLowerCase() : '';
    },

    isSupportedImageFile: function(file) {
        if (!file) {
            return false;
        }

        const type = (file.type || '').toLowerCase();
        if (type === 'image/x-webp' || type === 'image/webp') {
            return true;
        }
        if (type.startsWith('image/')) {
            return true;
        }

        return this.SUPPORTED_EXTENSIONS.includes(this.getExtension(file.name));
    },

    validateFile: function(file) {
        if (!this.isSupportedImageFile(file)) {
            return false;
        }

        const maxSize = 50 * 1024 * 1024;
        if (file.size > maxSize) {
            return false;
        }

        return true;
    }
};
