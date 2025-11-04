#!/bin/bash

# Image Cleanup Script Wrapper
# This script runs the PHP cleanup script and handles logging

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PHP_SCRIPT="$SCRIPT_DIR/cleanup_images.php"
LOG_FILE="$SCRIPT_DIR/cleanup_cron.log"
LOCK_FILE="$SCRIPT_DIR/cleanup.lock"

# Function to log messages
log_message() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $1" >> "$LOG_FILE"
}

# Check if script is already running
if [ -f "$LOCK_FILE" ]; then
    PID=$(cat "$LOCK_FILE" 2>/dev/null)
    if ps -p "$PID" > /dev/null 2>&1; then
        log_message "Cleanup script is already running (PID: $PID)"
        exit 1
    else
        log_message "Removing stale lock file"
        rm -f "$LOCK_FILE"
    fi
fi

# Create lock file
echo $$ > "$LOCK_FILE"

# Log start
log_message "Starting image cleanup process"

# Check if PHP script exists
if [ ! -f "$PHP_SCRIPT" ]; then
    log_message "ERROR: PHP script not found: $PHP_SCRIPT"
    rm -f "$LOCK_FILE"
    exit 1
fi

# Check if PHP is available
if ! command -v php &> /dev/null; then
    log_message "ERROR: PHP is not installed or not in PATH"
    rm -f "$LOCK_FILE"
    exit 1
fi

# Run the PHP cleanup script
log_message "Executing PHP cleanup script"
if php "$PHP_SCRIPT" >> "$LOG_FILE" 2>&1; then
    log_message "Cleanup completed successfully"
    exit_code=0
else
    log_message "ERROR: Cleanup script failed with exit code $?"
    exit_code=1
fi

# Remove lock file
rm -f "$LOCK_FILE"

# Log completion
log_message "Cleanup process finished"
log_message "----------------------------------------"

exit $exit_code 