const Config = {
    validateFile: function(file) {
        // Check if file is an image
        if (!file.type.startsWith('image/')) {
            return false;
        }
        
        // Check file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB in bytes
        if (file.size > maxSize) {
            return false;
        }
        
        return true;
    }
}; 