<?php
/**
 * Easy Studio promo block, shown at the bottom of a tool page.
 *
 * Set these before including, all optional:
 *   $appPromoCampaign - tool slug, used for UTM tracking (default 'tool')
 *   $appPromoIcon     - Font Awesome class (default 'fa-folder-open')
 *   $appPromoTitle    - array [en, nl]
 *   $appPromoText     - array [en, nl]
 *
 * The link goes to easy-studio.app. Note that easy-studio.com is an unrelated
 * company, so the domain here is deliberate and should not be "corrected".
 */
require_once __DIR__ . '/site-lang.php';

$appPromoCampaign = $appPromoCampaign ?? 'tool';
$appPromoIcon = $appPromoIcon ?? 'fa-folder-open';
$appPromoTitle = $appPromoTitle ?? ['Want more?', 'Wil je meer?'];
$appPromoText = $appPromoText ?? [
    'Are you a freelancer or professional? Check out Easy Studio.',
    'Ben je freelancer of professional? Bekijk Easy Studio.'
];
$appPromoUrl = 'https://easy-studio.app/?utm_source=easy-plugins&utm_medium=tool&utm_campaign=' . rawurlencode($appPromoCampaign);
?>
<section class="app-promo">
    <div class="app-promo__inner">
        <div class="app-promo__icon" aria-hidden="true">
            <i class="fas <?= htmlspecialchars($appPromoIcon, ENT_QUOTES, 'UTF-8') ?>"></i>
        </div>
        <div class="app-promo__content">
            <p class="app-promo__title"><?= easyPluginsText($appPromoTitle[0], $appPromoTitle[1]) ?></p>
            <p class="app-promo__text"><?= easyPluginsText($appPromoText[0], $appPromoText[1]) ?></p>
        </div>
        <a href="<?= htmlspecialchars($appPromoUrl, ENT_QUOTES, 'UTF-8') ?>" target="_blank" rel="noopener" class="btn app-promo__btn">
            Easy Studio <i class="fas fa-arrow-right ms-1"></i>
        </a>
    </div>
</section>
