<?php
require_once __DIR__ . '/shared/site-config.php';
header('Content-Type: application/xml; charset=utf-8');

// Always the canonical host, never the (client-controlled) Host header, so
// the sitemap cannot be poisoned with attacker URLs.
$baseUrl = SITE_CANONICAL_HOST;
// Derive lastmod from the newest source file so it never goes stale after a
// deploy (falls back to the constant if the scan finds nothing).
$lastmod = SITE_SITEMAP_LASTMOD;
$newest = 0;
foreach (['index.php', 'shared/seo-meta.php', 'shared/header.php'] as $probe) {
    $mt = @filemtime(__DIR__ . '/' . $probe);
    if ($mt !== false && $mt > $newest) {
        $newest = $mt;
    }
}
if ($newest > 0) {
    $lastmod = gmdate('Y-m-d', $newest);
}

$toolPages = [
    '/easy-image/',
    '/easy-png/',
    '/easy-watermark/',
    '/easy-image-rotate/',
    '/easy-html/',
    '/easy-pricing/',
    '/easy-text-converter/',
    '/easy-csv-converter/',
    '/easy-search-replace/',
    '/easy-identify-me/',
    '/easy-less/',
    '/easy-sass/',
    '/easy-website-audit/',
    '/easy-broken-links/',
    '/easy-image-audit/',
    '/easy-domain-check/',
];

$pluginPages = [
    '/plugins/easy-image',
    '/plugins/easy-png',
    '/plugins/easy-watermark',
    '/plugins/easy-image-rotate',
    '/plugins/easy-html',
    '/plugins/easy-pricing',
    '/plugins/easy-text-converter',
    '/plugins/easy-csv-converter',
    '/plugins/easy-search-replace',
    '/plugins/easy-identify-me',
    '/plugins/easy-less',
    '/plugins/easy-sass',
    '/plugins/easy-website-audit',
    '/plugins/easy-broken-links',
    '/plugins/easy-image-audit',
    '/plugins/easy-domain-check',
];

echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
    <url>
        <loc><?= $baseUrl ?>/</loc>
        <xhtml:link rel="alternate" hreflang="en" href="<?= $baseUrl ?>/"/>
        <xhtml:link rel="alternate" hreflang="nl" href="<?= $baseUrl ?>/nl/"/>
        <lastmod><?= $lastmod ?></lastmod>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc><?= $baseUrl ?>/nl/</loc>
        <xhtml:link rel="alternate" hreflang="en" href="<?= $baseUrl ?>/"/>
        <xhtml:link rel="alternate" hreflang="nl" href="<?= $baseUrl ?>/nl/"/>
        <lastmod><?= $lastmod ?></lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.9</priority>
    </url>
<?php foreach ($toolPages as $path): ?>
    <url>
        <loc><?= $baseUrl ?><?= $path ?></loc>
        <xhtml:link rel="alternate" hreflang="en" href="<?= $baseUrl ?><?= $path ?>"/>
        <xhtml:link rel="alternate" hreflang="nl" href="<?= $baseUrl ?>/nl<?= $path ?>"/>
        <lastmod><?= $lastmod ?></lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>
    <url>
        <loc><?= $baseUrl ?>/nl<?= $path ?></loc>
        <xhtml:link rel="alternate" hreflang="en" href="<?= $baseUrl ?><?= $path ?>"/>
        <xhtml:link rel="alternate" hreflang="nl" href="<?= $baseUrl ?>/nl<?= $path ?>"/>
        <lastmod><?= $lastmod ?></lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>
    </url>
<?php endforeach; ?>
<?php foreach ($pluginPages as $path): ?>
    <url>
        <loc><?= $baseUrl ?><?= $path ?></loc>
        <lastmod><?= $lastmod ?></lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.7</priority>
    </url>
<?php endforeach; ?>
</urlset>
