<!-- Footer styles now in master.css -->
<!-- Shared Footer Component -->
<?php require_once __DIR__ . '/site-config.php'; ?>
<?php
// Related tools row (shown on tool pages that set $toolInfoSlug)
if (!empty($toolInfoSlug)) {
    require_once __DIR__ . '/seo-meta.php';
    require_once __DIR__ . '/site-lang.php';
    $relatedSlugs = easyPluginsRelatedTools()[$toolInfoSlug] ?? [];
    $allToolMeta = easyPluginsSeoMeta();
    $relatedPrefix = easyPluginsIsNl() ? '/nl' : '';
    if ($relatedSlugs) {
?>
<div class="container related-tools-row" style="margin-top: 3rem;">
    <div class="text-center">
        <p class="text-muted mb-2"><?= easyPluginsIsNl() ? 'Ook handig:' : 'Also useful:' ?></p>
        <div class="d-flex flex-wrap gap-2 justify-content-center">
<?php foreach ($relatedSlugs as $relSlug): if (empty($allToolMeta[$relSlug])) { continue; }
    $relTagline = easyPluginsIsNl() && !empty($allToolMeta[$relSlug]['tagline_nl'])
        ? $allToolMeta[$relSlug]['tagline_nl'] : $allToolMeta[$relSlug]['tagline'];
?>
            <a href="<?= $relatedPrefix ?>/<?= htmlspecialchars($relSlug) ?>/" class="btn btn-outline-secondary btn-sm">
                <?= htmlspecialchars($allToolMeta[$relSlug]['name'], ENT_QUOTES, 'UTF-8') ?>
                <span class="text-muted">&nbsp;<?= htmlspecialchars(strtolower($relTagline), ENT_QUOTES, 'UTF-8') ?></span>
            </a>
<?php endforeach; ?>
        </div>
    </div>
</div>
<?php
    }
}
?>
<footer class="footer mt-5 py-4 bg-light">
    <div class="container">
        <div class="row">
            <div class="col-12 text-center">
                <div class="version">
                    <p><strong>Easy Plugins</strong> - <a href="https://jorsites.com">jorsites.com</a></p>
                    <p>Bug reports to <a href="mailto:web@easy-plugins.com">web@easy-plugins.com</a></p>
                    <p>Saved you time? <a target="_blank" href="https://bunq.me/jornature">Buy Joris a coffee ></a></p>
                    <p><span data-translate="FOOTER_LATEST_UPDATE">Latest update</span> <?= SITE_LATEST_UPDATE ?></p>
                    <p><a href="#" class="privacy-link" onclick="showPrivacyModal(); return false;">Privacy and data storage Policy</a></p>
                </div>
            </div>
        </div>
    </div>
</footer>

<!-- Bootstrap JS -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js" integrity="sha384-geWF76RCwLtnZ8qwWowPQNguL3RmwHVBC9FhGdlKrxdiJJigb/j/68SIy3Te4Bkz" crossorigin="anonymous"></script>

<!-- Privacy Modal -->
<?php include 'privacy-modal.php'; ?>
</body>
</html>
