<?php
/**
 * Privacy & data storage section for tool article pages.
 * Set $articlePrivacySlug before including (e.g. 'easy-png').
 */
if (empty($articlePrivacySlug)) {
    return;
}

$slug = preg_replace('/[^a-z0-9\-]/', '', $articlePrivacySlug);

$toolDescKeys = [
    'easy-png' => ['PRIVACY_EASY_PNG_DESC', 'Background addition to images happens in your browser'],
    'easy-watermark' => ['PRIVACY_EASY_WATERMARK_DESC', 'Watermark addition to images happens in your browser'],
    'easy-image-rotate' => ['PRIVACY_EASY_IMAGE_ROTATE_DESC', 'Image rotation happens entirely in your browser'],
    'easy-html' => ['PRIVACY_EASY_HTML_DESC', 'Text cleaning and formatting happens in your browser'],
    'easy-pricing' => ['PRIVACY_EASY_PRICING_DESC', 'All calculations are performed locally'],
    'easy-text-converter' => ['PRIVACY_EASY_TEXT_DESC', 'Text conversion happens in your browser'],
    'easy-csv-converter' => ['PRIVACY_EASY_CSV_DESC', 'CSV conversion, search & replace, and date transformation happen in your browser'],
    'easy-search-replace' => ['PRIVACY_EASY_SEARCH_DESC', 'Text search, replace, truncate, and line numbering happen in your browser'],
    'easy-less' => ['PRIVACY_EASY_LESS_DESC', 'LESS compilation happens entirely in your browser'],
    'easy-sass' => ['PRIVACY_EASY_SASS_DESC', 'SASS/SCSS compilation happens entirely in your browser'],
];

$isServerTool = ($slug === 'easy-image');
$isExternalTool = ($slug === 'easy-identify-me');
$usesLocalStorage = in_array($slug, ['easy-less', 'easy-sass'], true);
$toolDescKey = $toolDescKeys[$slug] ?? null;
?>
<section class="mb-5 article-privacy-section">
    <div class="card">
        <div class="card-body p-4">
            <h2 class="h3 mb-4">
                <i class="fas fa-shield-alt text-success me-2"></i>
                <span data-translate="ARTICLE_PRIVACY_TITLE">Privacy &amp; Data Storage</span>
            </h2>

            <?php if ($isServerTool): ?>
                <p data-translate="PRIVACY_EASY_IMAGE_DESC">
                    This tool requires server processing for image manipulation. Here's how we handle your images:
                </p>
                <ul>
                    <li data-translate="PRIVACY_EASY_IMAGE_1">Images are temporarily stored on our server for processing</li>
                    <li data-translate="PRIVACY_EASY_IMAGE_2">Automatic deletion within about 40 minutes — no action needed</li>
                    <li data-translate="PRIVACY_EASY_IMAGE_4">No sharing or commercial use of your images</li>
                </ul>
            <?php elseif ($isExternalTool): ?>
                <p data-translate="PRIVACY_EASY_IDENTIFY_DESC">
                    Looks up your public IP address via a third-party service (ipwho.is, with api.ipify.org as a fallback) to show location and ISP information. Your IP is sent to those services only when you use this tool.
                </p>
                <p data-translate="ARTICLE_PRIVACY_IDENTIFY_LOCAL">
                    Browser and device details are collected only after you click &ldquo;Gather my information&rdquo;, and are processed locally in your browser. Nothing is stored on our servers unless you copy and share it yourself.
                </p>
            <?php elseif ($toolDescKey): ?>
                <p data-translate="<?= htmlspecialchars($toolDescKey[0]) ?>"><?= htmlspecialchars($toolDescKey[1]) ?></p>
                <p data-translate="ARTICLE_PRIVACY_LOCAL_NO_SERVER">
                    Your files and data are not uploaded to our servers and are not stored by us.
                </p>
            <?php endif; ?>

            <?php if ($usesLocalStorage): ?>
                <p class="mb-0 mt-3" data-translate="ARTICLE_PRIVACY_LOCAL_STORAGE">
                    Your code may be saved in your browser&rsquo;s local storage so you don&rsquo;t lose work between visits. This stays on your device only.
                </p>
            <?php endif; ?>

            <?php if (!$isServerTool): ?>
                <h3 class="h5 mt-4 mb-3" data-translate="PRIVACY_DATA_RETENTION_TITLE">Data Retention</h3>
                <ul class="mb-0">
                    <li data-translate="ARTICLE_PRIVACY_RETENTION_NONE">Nothing from this tool is stored on our servers.</li>
                    <?php if ($slug === 'easy-csv-converter'): ?>
                        <li><span data-translate="PRIVACY_DATA_RETENTION_CSV">CSV Data:</span> <span data-translate="PRIVACY_DATA_RETENTION_CSV_DESC">Never stored on our servers, processed entirely in your browser</span></li>
                    <?php endif; ?>
                    <?php if (in_array($slug, ['easy-html', 'easy-text-converter', 'easy-search-replace'], true)): ?>
                        <li data-translate="PRIVACY_DATA_RETENTION_TEXT">Text/HTML: Never stored on our servers</li>
                    <?php endif; ?>
                    <?php if ($slug === 'easy-pricing'): ?>
                        <li data-translate="PRIVACY_DATA_RETENTION_CALC">Calculations: Performed locally, not stored</li>
                    <?php endif; ?>
                </ul>
            <?php endif; ?>

            <p class="mt-4 mb-0">
                <a href="#" class="privacy-link" onclick="showPrivacyModal(); return false;" data-translate="ARTICLE_PRIVACY_FULL_POLICY">View full privacy and data storage policy</a>
            </p>
        </div>
    </div>
</section>
