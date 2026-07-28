#!/bin/bash
# Download script for SASS compiler library

echo "Downloading sass.sync.min.js..."

# Try multiple sources
curl -L "https://cdnjs.cloudflare.com/ajax/libs/sass.js/0.10.13/sass.sync.min.js" -o sass.sync.min.js 2>/dev/null

# Check if download was successful (file should be > 1MB)
if [ -f sass.sync.min.js ] && [ $(wc -c < sass.sync.min.js) -gt 1000000 ]; then
    echo "✓ Download successful!"
    echo "File size: $(wc -c < sass.sync.min.js) bytes"
else
    echo "✗ Download failed from first source, trying alternative..."
    rm -f sass.sync.min.js
    curl -L "https://cdnjs.cloudflare.com/ajax/libs/sass.js/0.11.1/sass.min.js" -o sass.sync.min.js 2>/dev/null
    
    if [ -f sass.sync.min.js ] && [ $(wc -c < sass.sync.min.js) -gt 1000000 ]; then
        echo "✓ Download successful from alternative source!"
        echo "File size: $(wc -c < sass.sync.min.js) bytes"
    else
        echo "✗ Download failed. Please download manually:"
        echo "  https://cdnjs.cloudflare.com/ajax/libs/sass.js/0.10.13/sass.sync.min.js"
        echo "  Save as: sass.sync.min.js"
    fi
fi

