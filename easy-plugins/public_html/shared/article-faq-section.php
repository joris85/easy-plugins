<?php
/**
 * FAQ section for /plugins/ info pages: renders the visible Q&A plus
 * FAQPage and BreadcrumbList structured data. Set $articleFaqSlug first.
 */
if (empty($articleFaqSlug)) {
    return;
}
require_once __DIR__ . '/seo-meta.php';
$faqItems = easyPluginsToolFaq()[$articleFaqSlug] ?? [];
$faqToolMeta = easyPluginsSeoMeta()[$articleFaqSlug] ?? null;
if (!$faqItems || !$faqToolMeta) {
    return;
}

$faqSchema = [
    '@context' => 'https://schema.org',
    '@type' => 'FAQPage',
    'mainEntity' => array_map(function ($qa) {
        return [
            '@type' => 'Question',
            'name' => $qa[0],
            'acceptedAnswer' => ['@type' => 'Answer', 'text' => $qa[1]],
        ];
    }, $faqItems),
];

$breadcrumbSchema = [
    '@context' => 'https://schema.org',
    '@type' => 'BreadcrumbList',
    'itemListElement' => [
        ['@type' => 'ListItem', 'position' => 1, 'name' => 'Easy Plugins', 'item' => 'https://easy-plugins.com/'],
        ['@type' => 'ListItem', 'position' => 2, 'name' => $faqToolMeta['name'], 'item' => "https://easy-plugins.com/plugins/{$articleFaqSlug}"],
    ],
];
?>
<!-- FAQ -->
<section class="mb-5">
    <h2 class="h3 mb-4"><i class="fas fa-circle-question me-2"></i>Frequently asked questions</h2>
<?php foreach ($faqItems as $qa): ?>
    <div class="mb-4">
        <h3 class="h5"><?= htmlspecialchars($qa[0], ENT_QUOTES, 'UTF-8') ?></h3>
        <p class="mb-0"><?= htmlspecialchars($qa[1], ENT_QUOTES, 'UTF-8') ?></p>
    </div>
<?php endforeach; ?>
</section>
<script type="application/ld+json">
<?= json_encode($faqSchema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) ?>
</script>
<script type="application/ld+json">
<?= json_encode($breadcrumbSchema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) ?>
</script>
