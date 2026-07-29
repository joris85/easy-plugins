<?php 
$pageTitle = 'Easy Identify Me - System Information Tool';
$metaDescription = 'See your IP address, location, browser and device details in one overview, easy to copy and share with a developer or support desk.';
$canonicalPath = '/easy-identify-me/';
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
    // ipwho.is: keyless and works over HTTPS (ip-api.com's free tier is HTTP-only)
    $url = "https://ipwho.is/{$ip}";
    $context = stream_context_create([
        'http' => ['timeout' => 3, 'method' => 'GET'],
        'https' => ['timeout' => 3, 'method' => 'GET'],
    ]);
    $response = @file_get_contents($url, false, $context);
    if ($response) {
        $who = json_decode($response, true);
        if (is_array($who) && !empty($who['success'])) {
            // Map to the ip-api-style shape the frontend expects
            $locationData = [
                'status' => 'success',
                'country' => $who['country'] ?? null,
                'countryCode' => $who['country_code'] ?? null,
                'regionName' => $who['region'] ?? null,
                'city' => $who['city'] ?? null,
                'zip' => $who['postal'] ?? null,
                'lat' => $who['latitude'] ?? null,
                'lon' => $who['longitude'] ?? null,
                'timezone' => $who['timezone']['id'] ?? null,
                'isp' => $who['connection']['isp'] ?? null,
                'org' => $who['connection']['org'] ?? null,
                'as' => isset($who['connection']['asn']) && $who['connection']['asn']
                    ? 'AS' . $who['connection']['asn'] : null,
            ];
        }
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
            <?php $toolInfoSlug = 'easy-identify-me'; $toolPageHasOwnHeading = true; include __DIR__ . '/../shared/tool-info-bar.php'; ?>
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
    
    <script src="js/app.js?v=2026-07-18"></script>
</body>
</html>

