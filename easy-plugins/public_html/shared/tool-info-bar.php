<?php
if (empty($toolInfoSlug)) {
    return;
}
$infoUrl = '/plugins/' . preg_replace('/[^a-z0-9\-]/', '', $toolInfoSlug);
?>
<div class="tool-info-bar-wrap">
    <div class="tool-info-bar">
        <a href="<?= htmlspecialchars($infoUrl) ?>" class="tool-info-btn">
            <i class="fas fa-info-circle" aria-hidden="true"></i>
            <span data-translate="TOOL_MORE_INFO">More information</span>
        </a>
    </div>
</div>
