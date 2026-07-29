<?php
if (empty($toolInfoSlug)) {
    return;
}
require_once __DIR__ . '/seo-meta.php';
require_once __DIR__ . '/site-lang.php';
$toolInfoMeta = easyPluginsSeoMeta()[$toolInfoSlug] ?? null;
$infoUrl = '/plugins/' . preg_replace('/[^a-z0-9\-]/', '', $toolInfoSlug);
$toolTagline = $toolInfoMeta
    ? (easyPluginsIsNl() && !empty($toolInfoMeta['tagline_nl']) ? $toolInfoMeta['tagline_nl'] : $toolInfoMeta['tagline'])
    : '';
$toolBlurb = $toolInfoMeta
    ? (easyPluginsIsNl() ? ($toolInfoMeta['blurb_nl'] ?? '') : ($toolInfoMeta['blurb'] ?? ''))
    : '';
?>
<div class="tool-info-bar-wrap">
    <div class="tool-info-bar">
<?php if ($toolInfoMeta && empty($toolPageHasOwnHeading)): ?>
        <h1 class="tool-page-title">
            <?= htmlspecialchars($toolInfoMeta['name'], ENT_QUOTES, 'UTF-8') ?>
            <span class="tool-page-tagline"><?= htmlspecialchars($toolTagline, ENT_QUOTES, 'UTF-8') ?></span>
        </h1>
<?php endif; ?>
        <a href="<?= htmlspecialchars($infoUrl) ?>" class="tool-info-btn">
            <i class="fas fa-info-circle" aria-hidden="true"></i>
            <span data-translate="TOOL_MORE_INFO"><?= easyPluginsIsNl() ? 'Meer informatie' : 'More information' ?></span>
        </a>
    </div>
<?php if ($toolBlurb && empty($toolPageHasOwnHeading)): ?>
    <p class="tool-page-blurb"><?= htmlspecialchars($toolBlurb, ENT_QUOTES, 'UTF-8') ?></p>
<?php endif; ?>
</div>
