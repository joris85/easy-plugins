<?php
/**
 * llms-full.txt — full tool documentation in one markdown file for AI
 * assistants and crawlers. Generated from the same registry that feeds the
 * on-page meta, JSON-LD and FAQ sections, so it can never drift out of sync.
 * Served via the .htaccess rewrite llms-full.txt -> llms-full.php.
 */
require_once __DIR__ . '/shared/seo-meta.php';

header('Content-Type: text/plain; charset=utf-8');
header('X-Robots-Tag: noindex'); // canonical content lives on the HTML pages

$meta = easyPluginsSeoMeta();
$faq = function_exists('easyPluginsToolFaq') ? easyPluginsToolFaq() : [];

echo "# Easy Plugins — full tool documentation\n\n";
echo "> Free, privacy-focused browser tools for everyday tasks. No account, no installs, no hidden limits. ";
echo "Built by webmaster Joris Stolker for his clients and free for anyone. ";
echo "Most tools run entirely in the browser; Easy Image and Easy HTML process on the server, where uploads and submitted content are deleted automatically and never stored.\n\n";
echo "Site: https://easy-plugins.com/ (English) and https://easy-plugins.com/nl/ (Dutch)\n\n";

foreach ($meta as $slug => $tool) {
    $name = $tool['name'] ?? $slug;
    echo '## ' . $name . "\n\n";
    if (!empty($tool['tagline'])) {
        echo $tool['tagline'] . ".\n\n";
    }
    if (!empty($tool['blurb'])) {
        echo $tool['blurb'] . "\n\n";
    }
    echo "- Tool: https://easy-plugins.com/{$slug}/\n";
    echo "- About: https://easy-plugins.com/plugins/{$slug}\n\n";

    if (!empty($tool['features']) && is_array($tool['features'])) {
        echo "Features:\n\n";
        foreach ($tool['features'] as $feature) {
            echo '- ' . $feature . "\n";
        }
        echo "\n";
    }

    if (!empty($faq[$slug])) {
        echo "Frequently asked questions:\n\n";
        foreach ($faq[$slug] as $qa) {
            echo '**' . $qa[0] . "**\n";
            echo $qa[1] . "\n\n";
        }
    }
}

echo "---\n\nQuestions or bug reports: web@easy-plugins.com\n";
