<?php 
$pageTitle = 'Easy Identify Me - System Information Tool';
$faviconPath = '../favicon.ico';
$cssPath = '../shared/master.css';
$themePath = '../shared/theme.js';
require_once __DIR__ . '/../shared/site-config.php';

// Server-side IP detection (shared by button label and JavaScript)
$ip = $_SERVER['REMOTE_ADDR'] ?? 'Unknown';
if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
    $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
    $ip = trim($ips[0]);
} elseif (!empty($_SERVER['HTTP_X_REAL_IP'])) {
    $ip = $_SERVER['HTTP_X_REAL_IP'];
}

$locationData = null;
if ($ip && $ip !== 'Unknown' && filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
    $url = "https://ip-api.com/json/{$ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as";
    $context = stream_context_create([
        'http' => ['timeout' => 3, 'method' => 'GET'],
        'https' => ['timeout' => 3, 'method' => 'GET'],
    ]);
    $response = @file_get_contents($url, false, $context);
    if ($response) {
        $locationData = json_decode($response, true);
    }
}

$isLocalhost = ($ip === '127.0.0.1' || $ip === '::1' || $ip === 'localhost' ||
    filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false);

$serverData = [
    'ip' => $ip,
    'isLocalhost' => $isLocalhost,
    'location' => $locationData,
];

$quickCopyIpLabel = '…';
if ($ip !== 'Unknown' && !$isLocalhost) {
    $quickCopyIpLabel = htmlspecialchars($ip, ENT_QUOTES, 'UTF-8');
} elseif ($isLocalhost) {
    $quickCopyIpLabel = 'Fetching IP…';
}

include '../shared/header.php'; 
?>

    <!-- Easy Identify Me Specific CSS -->
    <link rel="stylesheet" href="css/styles.css">
    
    <div class="container-fluid">
        <div class="container tool-page-inner">
            <?php $toolInfoSlug = 'easy-identify-me'; include __DIR__ . '/../shared/tool-info-bar.php'; ?>
            <div class="identify-me-container">
                <h1><i class="fas fa-id-card me-2"></i> Easy Identify Me</h1>
                <p class="subtitle">Get comprehensive system information to share with developers</p>
                
                <!-- Action Buttons Section (available immediately) -->
                <div class="action-buttons-section">
                    <button type="button" class="btn btn-outline-primary btn-lg" id="quickCopyIPBtn"<?= $quickCopyIpLabel === 'Fetching IP…' ? ' disabled' : '' ?> title="<?= $quickCopyIpLabel !== 'Fetching IP…' && $quickCopyIpLabel !== '…' ? 'Click to copy IP address' : '' ?>">
                        <i class="fas fa-copy me-2" aria-hidden="true"></i>
                        <span id="quickCopyIPLabel"><?= $quickCopyIpLabel ?></span>
                    </button>
                    <button type="button" class="btn btn-primary btn-lg" id="consentBtn">
                        <i class="fas fa-check me-2"></i> Gather my information
                    </button>
                    <button type="button" class="btn btn-outline-secondary btn-lg" id="privacyInfoBtn">
                        <i class="fas fa-shield-alt me-2"></i> Privacy information
                    </button>
                </div>
                
                <!-- Privacy Notice Section (accordion, collapsed by default) -->
                <div class="privacy-notice-section" id="privacyNotice">
                    <div class="privacy-notice-compact">
                        <div class="privacy-notice-content" id="privacyNoticeContent" style="display: none;">
                            <div class="privacy-notice-title">
                                <i class="fas fa-shield-alt me-2"></i>
                                <span>Privacy Notice</span>
                            </div>
                            <p class="privacy-intro">
                                This tool can gather information about your system, including:
                            </p>
                            <ul class="privacy-list">
                                <li><i class="fas fa-check-circle me-2"></i>Your IP address and approximate location</li>
                                <li><i class="fas fa-check-circle me-2"></i>Browser type, version, and settings</li>
                                <li><i class="fas fa-check-circle me-2"></i>Device information and operating system</li>
                                <li><i class="fas fa-check-circle me-2"></i>Screen resolution and display settings</li>
                                <li><i class="fas fa-check-circle me-2"></i>System capabilities and API support</li>
                                <li><i class="fas fa-check-circle me-2"></i>Network connection details</li>
                            </ul>
                            <p class="privacy-note">
                                <i class="fas fa-info-circle me-2"></i>
                                <strong>All information is processed locally in your browser.</strong> Nothing is sent to our servers until you explicitly copy and share it.
                            </p>
                        </div>
                    </div>
                </div>
                
                <!-- Content Section (hidden until consent) -->
                <div class="content-section" id="contentSection" style="display: none;">
                    <!-- Information Cards (Copy All button is now in the action buttons section) -->
                    
                    <!-- Loading indicator (shown when fetching public IP) -->
                    <div id="loadingIndicator" class="text-center" style="display: none;">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-2">Fetching your public IP address...</p>
                    </div>
                    
                    <!-- Information Cards -->
                    <div class="info-grid" id="infoGrid">
                        <!-- Cards will be populated by JavaScript -->
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <?php include '../shared/footer.php'; ?>
    
    <!-- Server Data (passed to JavaScript) -->
    <script>
        // Server-side data
        const serverData = <?= easyPluginsJsonEncode($serverData, JSON_PRETTY_PRINT | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;
    </script>
    
    <script src="js/app.js"></script>
</body>
</html>

