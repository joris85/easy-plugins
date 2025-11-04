# Image Cleanup System

This system automatically removes images older than 48 hours from the uploads and temp directories.

## Files

- `cleanup_images.php` - Main PHP script that performs the cleanup
- `run_cleanup.sh` - Shell script wrapper for cron execution
- `cleanup_log.txt` - Detailed log of file removals
- `cleanup_cron.log` - Cron execution log
- `cleanup.lock` - Lock file to prevent multiple executions

## Setup Instructions

### 1. Make sure the script is executable
```bash
chmod +x /path/to/public_html/run_cleanup.sh
```

### 2. Test the script manually
```bash
cd /path/to/public_html
./run_cleanup.sh
```

### 3. Set up the cronjob

#### Option A: Using crontab (recommended)
```bash
# Edit crontab
crontab -e

# Add this line to run daily at 2:00 AM
0 2 * * * /path/to/public_html/run_cleanup.sh
```

#### Option B: Using system cron
```bash
# Edit system crontab
sudo nano /etc/crontab

# Add this line (replace 'username' with your actual username)
0 2 * * * username /path/to/public_html/run_cleanup.sh
```

### 4. Verify the cronjob is set
```bash
crontab -l
```

## Configuration

You can modify the cleanup settings in `cleanup_images.php`:

- `$maxAgeHours = 48;` - Change this to adjust the age limit
- `$uploadsDir` - Path to uploads directory
- `$tempDir` - Path to temp directory

## Logs

- **cleanup_log.txt** - Contains detailed information about each file removed
- **cleanup_cron.log** - Contains cron execution status and errors

## Manual Execution

To run the cleanup manually:

```bash
# Using the shell script (recommended)
./run_cleanup.sh

# Or directly with PHP
php cleanup_images.php
```

## Safety Features

1. **Lock file protection** - Prevents multiple instances from running simultaneously
2. **Detailed logging** - All actions are logged with timestamps
3. **Error handling** - Script exits gracefully on errors
4. **File type filtering** - Only removes image files (jpg, png, gif, etc.)
5. **Age verification** - Only removes files older than the specified age

## Troubleshooting

### Script not running
1. Check if PHP is installed: `php --version`
2. Check file permissions: `ls -la run_cleanup.sh`
3. Check cron logs: `tail -f /var/log/cron`

### Files not being removed
1. Check the cleanup_log.txt for detailed information
2. Verify file timestamps: `ls -la uploads/`
3. Check if directories exist and are writable

### Permission errors
```bash
# Make sure the web server can write to the directories
chmod 755 uploads/ temp/
chown www-data:www-data uploads/ temp/  # Replace www-data with your web server user
```

## Example cron schedule variations

```bash
# Daily at 2:00 AM
0 2 * * * /path/to/public_html/run_cleanup.sh

# Every 6 hours
0 */6 * * * /path/to/public_html/run_cleanup.sh

# Every Sunday at 3:00 AM
0 3 * * 0 /path/to/public_html/run_cleanup.sh

# Twice daily (2 AM and 2 PM)
0 2,14 * * * /path/to/public_html/run_cleanup.sh
``` 