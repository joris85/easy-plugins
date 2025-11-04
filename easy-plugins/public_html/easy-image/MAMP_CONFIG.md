# MAMP Configuration for Large Images

## The Problem
You're getting 500 Internal Server Error with larger images because MAMP has restrictive PHP limits by default.

## The Solution

### 1. Update MAMP PHP Configuration

1. **Open MAMP Preferences**
2. **Go to PHP tab**
3. **Click "Edit" next to the PHP version**
4. **Add these settings to your php.ini file:**

```ini
; File Upload Limits
upload_max_filesize = 100M
post_max_size = 200M
max_file_uploads = 100

; Memory and Execution Limits
memory_limit = 512M
max_execution_time = 300
max_input_time = 300

; Input Limits
max_input_vars = 3000
max_input_nesting_level = 64
```

### 2. Restart MAMP
After making changes, restart MAMP servers.

### 3. Test the Configuration
Visit: `http://localhost:8890/easy-image/check_limits.php`

This will show you the current limits and recommendations.

## Alternative: Use Smaller Images

The app now has built-in protection:
- **Maximum file size**: 50MB per image
- **Maximum total size**: 100MB for all images
- **Maximum files**: 20 images at once

If you get errors, try:
1. **Smaller images** (under 10MB each)
2. **Fewer images** at once
3. **Convert to WebP** format first

## Why This Happens

MAMP's default PHP configuration is designed for small websites, not image processing:
- `upload_max_filesize` is often 2M (too small for photos)
- `post_max_size` is often 8M (too small for multiple images)
- `memory_limit` is often 128M (too small for image processing)

## Quick Fix for Testing

If you can't change MAMP settings, the app will now:
1. **Warn you** about large files before upload
2. **Give better error messages** when things fail
3. **Suggest solutions** for large image problems

Try uploading smaller images first to test the functionality!


