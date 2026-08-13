<?php
/**
 * Easy Studio upsell block, shown under every audit tool. Set
 * $auditUpsellCampaign to the tool slug before including for UTM tracking.
 */
require_once __DIR__ . '/site-lang.php';
$auditUpsellCampaign = $auditUpsellCampaign ?? 'audit';
$auditUpsellUrl = 'https://easy-image.app/?utm_source=easy-plugins&utm_medium=audit&utm_campaign=' . rawurlencode($auditUpsellCampaign);
?>
<section class="audit-upsell">
    <div class="audit-upsell__inner">
        <div class="audit-upsell__icon" aria-hidden="true">
            <svg width="30" height="30" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><circle cx="14" cy="17" r="7" fill="none" stroke="currentColor" stroke-width="4.4"/><circle cx="34" cy="17" r="7" fill="none" stroke="currentColor" stroke-width="4.4"/><line x1="21" y1="17" x2="27" y2="17" stroke="currentColor" stroke-width="4.4" stroke-linecap="round"/><path d="M9 33 C 15 41.5, 33 41.5, 39 33" fill="none" stroke="currentColor" stroke-width="4.4" stroke-linecap="round"/></svg>
        </div>
        <div class="audit-upsell__content">
            <p class="audit-upsell__title"><?= easyPluginsText('Need the full picture?', 'Het complete beeld nodig?') ?></p>
            <p class="audit-upsell__text"><?= easyPluginsText(
                'The free check audits one page. Easy Studio audits your whole site (up to 100 pages), tracks your score over time, monitors it and creates white-label PDF reports for your clients.',
                'De gratis check controleert één pagina. Easy Studio controleert je hele site (tot 100 pagina\'s), volgt je score over tijd, monitort de site en maakt white-label PDF-rapporten voor je klanten.'
            ) ?></p>
        </div>
        <a href="<?= htmlspecialchars($auditUpsellUrl, ENT_QUOTES, 'UTF-8') ?>" target="_blank" rel="noopener" class="btn audit-upsell__btn">
            <?= easyPluginsText('Get the full version', 'Naar de volledige versie') ?> <i class="fas fa-arrow-right ms-1"></i>
        </a>
    </div>
</section>
