<?php
/**
 * Generates the OG/Twitter share images (1200x630) for every tool plus the
 * site card, branded with the Easy Plugins face logo. Data comes from the
 * central registry, so titles and taglines never drift from the site.
 *
 * Run with MAMP PHP (has Imagick):
 *   /Applications/MAMP/bin/php/php8.4.15/bin/php scripts/generate-og.php
 */
error_reporting(E_ALL);
ini_set('display_errors', '1');

require_once __DIR__ . '/../public_html/shared/seo-meta.php';

const W = 1200;
const H = 630;
$outDir = __DIR__ . '/../public_html/og';
$iconPath = __DIR__ . '/og-icon-96.png'; // rasterized brand face
$fontRegular = '/System/Library/Fonts/Supplemental/Arial.ttf';
$fontBold = '/System/Library/Fonts/Supplemental/Arial Bold.ttf';

function makeCard($title, $tagline, $iconPath, $fontRegular, $fontBold) {
    $img = new Imagick();
    $img->newImage(W, H, new ImagickPixel('#181A18'));
    $img->setImageFormat('png');

    // Subtle green glow bottom-left + accent bar
    $draw = new ImagickDraw();
    $draw->setFillColor(new ImagickPixel('#223524'));
    $draw->circle(80, H + 140, 80, H - 280);
    $img->drawImage($draw);
    $bar = new ImagickDraw();
    $bar->setFillColor(new ImagickPixel('#4CAF50'));
    $bar->rectangle(0, H - 10, W, H);
    $img->drawImage($bar);

    // Brand row: face + wordmark
    $icon = new Imagick($iconPath);
    $icon->resizeImage(72, 72, Imagick::FILTER_LANCZOS, 1);
    $img->compositeImage($icon, Imagick::COMPOSITE_OVER, 84, 66);
    $text = new ImagickDraw();
    $text->setFont($fontRegular);
    $text->setFontSize(40);
    $text->setFillColor(new ImagickPixel('#f0f0f0'));
    $img->annotateImage($text, 176, 116, 0, 'easy');
    $textBold = new ImagickDraw();
    $textBold->setFont($fontBold);
    $textBold->setFontSize(40);
    $textBold->setFillColor(new ImagickPixel('#7ac97e'));
    $img->annotateImage($textBold, 268, 116, 0, 'plugins');

    // Title (wrap long titles onto two lines)
    $titleDraw = new ImagickDraw();
    $titleDraw->setFont($fontBold);
    $titleDraw->setFillColor(new ImagickPixel('#ffffff'));
    $fontSize = 92;
    $titleDraw->setFontSize($fontSize);
    $metrics = $img->queryFontMetrics($titleDraw, $title);
    while ($metrics['textWidth'] > W - 168 && $fontSize > 56) {
        $fontSize -= 4;
        $titleDraw->setFontSize($fontSize);
        $metrics = $img->queryFontMetrics($titleDraw, $title);
    }
    $img->annotateImage($titleDraw, 84, 330, 0, $title);

    // Tagline, wrapped
    $tagDraw = new ImagickDraw();
    $tagDraw->setFont($fontRegular);
    $tagDraw->setFontSize(42);
    $tagDraw->setFillColor(new ImagickPixel('#b6bab6'));
    $words = explode(' ', $tagline);
    $lines = [''];
    foreach ($words as $word) {
        $candidate = trim($lines[count($lines) - 1] . ' ' . $word);
        $m = $img->queryFontMetrics($tagDraw, $candidate);
        if ($m['textWidth'] > W - 168 && $lines[count($lines) - 1] !== '') {
            $lines[] = $word;
        } else {
            $lines[count($lines) - 1] = $candidate;
        }
    }
    $y = 408;
    foreach (array_slice($lines, 0, 2) as $line) {
        $img->annotateImage($tagDraw, 84, $y, 0, $line);
        $y += 56;
    }

    // Footer
    $footer = new ImagickDraw();
    $footer->setFont($fontRegular);
    $footer->setFontSize(34);
    $footer->setFillColor(new ImagickPixel('#7ac97e'));
    $img->annotateImage($footer, 84, 556, 0, 'Free  ·  No account  ·  easy-plugins.com');

    $img->setImageCompressionQuality(92);
    return $img;
}

$meta = easyPluginsSeoMeta();
foreach ($meta as $slug => $tool) {
    $card = makeCard($tool['name'], $tool['tagline'], $iconPath, $fontRegular, $fontBold);
    $card->writeImage($outDir . '/' . $slug . '.png');
    $card->destroy();
    echo "og/{$slug}.png\n";
}

$site = makeCard('Easy Plugins', 'Simple, free tools that make everyday tasks easy. No account, no installs.', $iconPath, $fontRegular, $fontBold);
$site->writeImage($outDir . '/site.png');
$site->destroy();
echo "og/site.png\ndone\n";
