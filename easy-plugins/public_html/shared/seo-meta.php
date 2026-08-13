<?php
/**
 * Central SEO metadata per tool: used for JSON-LD (WebApplication), Open Graph
 * tags and the share images. Keyed by URL slug.
 */

if (!function_exists('easyPluginsSeoMeta')) {
    function easyPluginsSeoMeta() {
        static $merged = null;
        if ($merged !== null) {
            return $merged;
        }
        $tools = [
            'easy-image' => [
                'name' => 'Easy Image',
                'tagline' => 'Resize, crop & compress images online',
                'category' => 'MultimediaApplication',
                'features' => [
                    'Resize by width, height or fit inside a box',
                    'Crop with presets, free selection or automatic focus',
                    'Compress to an exact file size in KB',
                    'Convert to WebP, JPG or PNG',
                    'Process up to 100 images in one batch',
                    'Adjustable Auto enhance with before/after preview',
                    'Batch renamer: patterns, search & replace and regex',
                    'Color-accurate output, EXIF/GPS data removed',
                    'Uploads are deleted automatically within 30 minutes',
                ],
            ],
            'easy-png' => [
                'name' => 'Easy PNG',
                'tagline' => 'Add backgrounds to transparent images',
                'category' => 'MultimediaApplication',
                'features' => [
                    'Solid color or gradient backgrounds',
                    'Live preview while you adjust',
                    'Works with PNG and WebP',
                    'Export as PNG, JPG or WebP',
                ],
            ],
            'easy-watermark' => [
                'name' => 'Easy Watermark',
                'tagline' => 'Watermark your photos in the browser',
                'category' => 'MultimediaApplication',
                'features' => [
                    'Text and image watermarks',
                    'Drag-and-drop positioning, opacity and rotation',
                    'Watermark whole batches at once',
                    'Download everything as a ZIP',
                ],
            ],
            'easy-image-rotate' => [
                'name' => 'Easy Image Rotate',
                'tagline' => 'Rotate images to any angle',
                'category' => 'MultimediaApplication',
                'features' => [
                    'Any rotation angle with live preview',
                    'Runs fully in your browser — nothing is uploaded',
                    'Export as WebP, JPG or PNG',
                ],
            ],
            'easy-html' => [
                'name' => 'Easy HTML',
                'tagline' => 'Clean pasted HTML for e-mail',
                'category' => 'DeveloperApplication',
                'features' => [
                    'One-click presets for Word, Google Docs, CMS and email',
                    'Strips styles, classes and clutter while keeping structure and links',
                    'Convert div to p, straighten smart quotes, remove tracking from links',
                    'Search & replace in the text, ideal for filling in placeholders',
                    'Side-by-side visual editor and code view',
                ],
            ],
            'easy-text-converter' => [
                'name' => 'Easy Text',
                'tagline' => 'Convert text case & count words',
                'category' => 'UtilitiesApplication',
                'features' => [
                    'UPPERCASE, lowercase, Title Case, sentence case and more',
                    'Word, character and line statistics',
                    'Remove duplicates, sort lines, strip spaces',
                ],
            ],
            'easy-csv-converter' => [
                'name' => 'Easy CSV',
                'tagline' => 'Convert CSV delimiters & dates',
                'category' => 'UtilitiesApplication',
                'features' => [
                    'Convert between comma, semicolon, tab and custom delimiters',
                    'Handles quoted fields correctly',
                    'Transform date formats',
                    'Everything stays in your browser',
                ],
            ],
            'easy-search-replace' => [
                'name' => 'Easy Search & Replace',
                'tagline' => 'Find & replace text with regex',
                'category' => 'UtilitiesApplication',
                'features' => [
                    'Plain text or regular expression search',
                    'Match counting before you commit',
                    'Truncate, prefix and number lines',
                ],
            ],
            'easy-pricing' => [
                'name' => 'Easy Pricing',
                'tagline' => 'Percentage, discount & VAT calculators',
                'category' => 'FinanceApplication',
                'features' => [
                    'Percentage calculations',
                    'Discount and sale price calculator',
                    'VAT (BTW) calculator',
                ],
            ],
            'easy-less' => [
                'name' => 'Easy LESS',
                'tagline' => 'Compile LESS to CSS online',
                'category' => 'DeveloperApplication',
                'features' => [
                    'Instant LESS to CSS compilation in the browser',
                    'Syntax highlighting and clear error messages',
                    'Optional minified output',
                ],
            ],
            'easy-sass' => [
                'name' => 'Easy SASS',
                'tagline' => 'Compile SASS/SCSS to CSS online',
                'category' => 'DeveloperApplication',
                'features' => [
                    'Supports both SASS and SCSS syntax',
                    'Instant compilation with error messages',
                    'Optional minified output',
                ],
            ],
            'easy-identify-me' => [
                'name' => 'Easy Identify Me',
                'tagline' => 'Your IP, browser & device info',
                'category' => 'UtilitiesApplication',
                'features' => [
                    'IP address and approximate location',
                    'Browser, device and screen details',
                    'One-click copy to share with support',
                ],
            ],
            'easy-website-audit' => [
                'name' => 'Easy Website Audit',
                'tagline' => 'Free SEO & speed check of any page',
                'category' => 'DeveloperApplication',
                'features' => [
                    'Measured performance: TTFB, page weight and request count',
                    'SEO checks: title, meta description, H1, alt text, content length',
                    'Technical checks: HTTPS, sitemap, robots.txt, viewport, canonical, noindex',
                    'Structured data and social: JSON-LD, Open Graph, Twitter Card',
                    '0-100 score with a prioritized to-do list',
                ],
            ],
            'easy-broken-links' => [
                'name' => 'Easy Broken Links',
                'tagline' => 'Find broken links on any page',
                'category' => 'DeveloperApplication',
                'features' => [
                    'Checks internal and external links with real HTTP requests',
                    'Scans the page plus two linked pages',
                    'Bot-blocked links reported separately, not as broken',
                    'Shows which page each broken link lives on',
                ],
            ],
            'easy-image-audit' => [
                'name' => 'Easy Image Audit',
                'tagline' => 'Check images for size, format & alt text',
                'category' => 'DeveloperApplication',
                'features' => [
                    'Grades every image like Lighthouse: format, size, lazy loading, alt text',
                    'Shows how many KB you can save per image',
                    'Detects oversized images served to small slots',
                    'Detects JavaScript-rendered pages honestly',
                ],
            ],
            'easy-domain-check' => [
                'name' => 'Easy Domain Check',
                'tagline' => 'Is your domain name available?',
                'category' => 'UtilitiesApplication',
                'features' => [
                    'Checks 12 popular extensions at once (.com, .nl, .net, .org, .io, .dev and more)',
                    'Live registry data via RDAP and DNS, no stale caches',
                    'Shows registration year for taken domains',
                    'Honest three-way answer: available, taken, or verify',
                ],
            ],
        ];

        foreach (easyPluginsSeoNlOverlay() as $slug => $extra) {
            if (isset($tools[$slug])) {
                $tools[$slug] = array_merge($tools[$slug], $extra);
            }
        }
        $merged = $tools;
        return $merged;
    }
}

if (!function_exists('easyPluginsSeoNlOverlay')) {
    /**
     * Dutch page metadata + short crawlable intros (blurbs) per tool.
     * The blurb/blurb_nl also gives the tool pages real descriptive text.
     */
    function easyPluginsSeoNlOverlay() {
        return [
            'easy-image' => [
                'title_nl' => 'Easy Image - Afbeeldingen verkleinen, bijsnijden en comprimeren',
                'desc_nl' => 'Verklein, comprimeer en converteer afbeeldingen online, tot 100 tegelijk. Kies een exacte bestandsgrootte in KB, output WebP, JPG of PNG. Gratis, zonder account.',
                'tagline_nl' => 'Afbeeldingen verkleinen, bijsnijden & comprimeren',
                'blurb' => 'Resize, crop, compress and convert images in one place. Pick an exact file size in KB, process up to 100 photos in one batch and download everything as a ZIP.',
                'blurb_nl' => "Verklein, knip, comprimeer en converteer afbeeldingen op één plek. Kies een exacte bestandsgrootte in KB, verwerk tot 100 foto's in één batch en download alles als ZIP.",
            ],
            'easy-png' => [
                'title_nl' => 'Easy PNG - Achtergrond toevoegen aan transparante afbeeldingen',
                'desc_nl' => 'Voeg een effen kleur of verloop toe achter transparante PNG en WebP afbeeldingen, met live voorbeeld. Gratis online tool, zonder account.',
                'tagline_nl' => 'Achtergronden voor transparante afbeeldingen',
                'blurb' => 'Put a solid color or gradient behind a transparent PNG or WebP image, with a live preview while you adjust.',
                'blurb_nl' => 'Zet een effen kleur of kleurverloop achter een transparante PNG of WebP afbeelding, met live voorbeeld terwijl je aanpast.',
            ],
            'easy-watermark' => [
                'title_nl' => "Easy Watermark - Watermerk op je foto's zetten",
                'desc_nl' => "Zet tekst of een logo als watermerk op je foto's, met slepen, transparantie en rotatie. Hele series tegelijk, download als ZIP. Gratis en privé.",
                'tagline_nl' => "Watermerk je foto's in de browser",
                'blurb' => 'Protect your photos with a text or logo watermark. Drag it into place, tune opacity and rotation, and export whole batches as a ZIP.',
                'blurb_nl' => "Bescherm je foto's met een tekst- of logowatermerk. Sleep het op zijn plek, stel transparantie en rotatie in en exporteer hele series als ZIP.",
            ],
            'easy-image-rotate' => [
                'title_nl' => 'Easy Image Rotate - Afbeeldingen roteren',
                'desc_nl' => 'Roteer afbeeldingen naar elke hoek in je browser met live voorbeeld. Privé: je foto verlaat je apparaat niet. Exporteer als WebP, JPG of PNG.',
                'tagline_nl' => 'Roteer afbeeldingen naar elke hoek',
                'blurb' => 'Rotate a photo to any angle with a live preview. Everything happens in your browser, so the photo never leaves your device.',
                'blurb_nl' => 'Roteer een foto naar elke gewenste hoek met live voorbeeld. Alles gebeurt in je browser, dus je foto verlaat je apparaat niet.',
            ],
            'easy-html' => [
                'title_nl' => 'Easy HTML - HTML opschonen voor e-mail',
                'desc_nl' => 'Maak geplakte HTML uit Word, Google Docs of Gmail schoon met presets voor e-mail en CMS: stijlen en rommel weg, div naar p, tracking uit links, structuur en links intact.',
                'tagline_nl' => 'Geplakte HTML opschonen voor e-mail',
                'blurb' => 'Paste messy HTML from Word, Google Docs or Gmail and clean it with one-click presets for e-mail and CMS use, with links kept intact.',
                'blurb_nl' => 'Plak rommelige HTML uit Word, Google Docs of Gmail en maak die schoon met presets voor e-mail en CMS, met behoud van links.',
            ],
            'easy-text-converter' => [
                'title_nl' => 'Easy Text - Tekst omzetten en woorden tellen',
                'desc_nl' => 'Zet tekst om online: HOOFDLETTERS, kleine letters, Title Case, zinnen en meer. Tel direct woorden en tekens. Gratis, zonder account.',
                'tagline_nl' => 'Tekst omzetten & woorden tellen',
                'blurb' => 'Convert text between cases, clean up spaces and duplicates, and see live word and character counts while you type.',
                'blurb_nl' => 'Zet tekst om tussen hoofdletterstijlen, ruim spaties en dubbele regels op en zie direct het aantal woorden en tekens terwijl je typt.',
            ],
            'easy-csv-converter' => [
                'title_nl' => 'Easy CSV - CSV scheidingstekens en datums converteren',
                'desc_nl' => 'Converteer CSV scheidingstekens, vervang tekst en zet datumformaten om. Gaat correct om met aanhalingstekens. Alles blijft in je browser.',
                'tagline_nl' => 'CSV scheidingstekens & datums omzetten',
                'blurb' => 'Convert a CSV between commas, semicolons, tabs or custom delimiters and transform date formats, with quoted fields handled correctly.',
                'blurb_nl' => "Converteer een CSV tussen komma's, puntkomma's, tabs of eigen scheidingstekens en zet datumformaten om, met correcte afhandeling van aanhalingstekens.",
            ],
            'easy-search-replace' => [
                'title_nl' => 'Easy Search & Replace - Zoeken en vervangen in tekst',
                'desc_nl' => 'Zoek en vervang tekst online met regex ondersteuning, telling van vervangingen, afkappen en regelnummering. Je tekst blijft op je apparaat.',
                'tagline_nl' => 'Zoek & vervang met regex',
                'blurb' => 'Find and replace text with plain search or regular expressions, see how many matches were replaced, and number or truncate lines.',
                'blurb_nl' => 'Zoek en vervang tekst met gewone zoekopdrachten of reguliere expressies, zie hoeveel treffers zijn vervangen en nummer of kort regels in.',
            ],
            'easy-pricing' => [
                'title_nl' => 'Easy Pricing - Percentage, korting en BTW berekenen',
                'desc_nl' => 'Gratis rekentools voor percentages, kortingen en BTW. Snel en accuraat rekenen voor winkels, freelancers en bedrijven.',
                'tagline_nl' => 'Percentage, korting & BTW berekenen',
                'blurb' => 'Quick calculators for percentages, discounts and VAT, without spreadsheets.',
                'blurb_nl' => 'Snelle rekentools voor percentages, kortingen en BTW, zonder spreadsheets.',
            ],
            'easy-less' => [
                'title_nl' => 'Easy LESS - LESS naar CSS compileren',
                'desc_nl' => 'Compileer LESS direct naar CSS in je browser, met syntax highlighting en duidelijke foutmeldingen. Gratis online LESS compiler.',
                'tagline_nl' => 'LESS naar CSS in je browser',
                'blurb' => 'Compile LESS to plain CSS instantly in your browser, with clear error messages when something is off.',
                'blurb_nl' => 'Compileer LESS direct naar gewone CSS in je browser, met duidelijke foutmeldingen als er iets mis is.',
            ],
            'easy-sass' => [
                'title_nl' => 'Easy SASS - SASS/SCSS naar CSS compileren',
                'desc_nl' => 'Compileer SASS en SCSS naar CSS in je browser met directe output en foutmeldingen. Gratis online Sass compiler.',
                'tagline_nl' => 'SASS/SCSS naar CSS in je browser',
                'blurb' => 'Compile SASS or SCSS to CSS instantly in your browser, supporting both syntaxes.',
                'blurb_nl' => 'Compileer SASS of SCSS direct naar CSS in je browser, met ondersteuning voor beide schrijfwijzen.',
            ],
            'easy-identify-me' => [
                'title_nl' => 'Easy Identify Me - Je IP, browser en apparaatgegevens',
                'desc_nl' => 'Bekijk je IP-adres, locatie, browser en apparaatgegevens in één overzicht, makkelijk te kopiëren en te delen met een ontwikkelaar of helpdesk.',
                'tagline_nl' => 'Je IP, browser & apparaatinfo',
                'blurb' => 'See your IP address, location, browser and device details in one overview that is easy to copy and share with support.',
                'blurb_nl' => 'Bekijk je IP-adres, locatie, browser en apparaatgegevens in één overzicht dat je makkelijk kopieert en deelt met een helpdesk.',
            ],
            'easy-website-audit' => [
                'title_nl' => 'Easy Website Audit - Gratis SEO en snelheidscheck',
                'desc_nl' => 'Controleer gratis de SEO, snelheid en techniek van elke webpagina: laadtijd, titels, meta descriptions, sitemap, structured data en meer, met een score en concrete verbeterpunten.',
                'tagline_nl' => 'Gratis SEO- & snelheidscheck van elke pagina',
                'blurb' => 'Enter a web address and get a 0-100 score across performance, SEO, technical setup and structured data, with a prioritized list of what to fix.',
                'blurb_nl' => 'Vul een webadres in en krijg een score van 0-100 voor snelheid, SEO, techniek en structured data, met een prioriteitenlijst van verbeterpunten.',
            ],
            'easy-broken-links' => [
                'title_nl' => 'Easy Broken Links - Kapotte links vinden',
                'desc_nl' => 'Vind gratis kapotte links op elke webpagina. Interne en externe links worden echt gecontroleerd; geblokkeerde links worden apart gemeld.',
                'tagline_nl' => 'Vind kapotte links op elke pagina',
                'blurb' => 'Every link on the page is checked with a real HTTP request. Broken links are listed with their status code and the page they live on.',
                'blurb_nl' => 'Elke link op de pagina wordt gecontroleerd met een echt HTTP-verzoek. Kapotte links zie je met statuscode en de pagina waar ze staan.',
            ],
            'easy-image-audit' => [
                'title_nl' => 'Easy Image Audit - Afbeeldingen op je site controleren',
                'desc_nl' => 'Controleer gratis de afbeeldingen op een webpagina: formaat, bestandsgrootte, lazy loading en alt-teksten, met per afbeelding hoeveel KB je kunt besparen.',
                'tagline_nl' => 'Check afbeeldingen op formaat, grootte & alt-tekst',
                'blurb' => 'Every image on the page is graded like Lighthouse does: modern format, file size, oversizing, lazy loading and alt text, with the KB you can save.',
                'blurb_nl' => 'Elke afbeelding op de pagina wordt beoordeeld zoals Lighthouse dat doet: modern formaat, bestandsgrootte, lazy loading en alt-tekst, met de KB die je kunt besparen.',
            ],
            'easy-domain-check' => [
                'title_nl' => 'Easy Domain Check - Is je domeinnaam nog vrij?',
                'desc_nl' => 'Check gratis of een domeinnaam vrij is, in 12 populaire extensies tegelijk (.nl, .com, .be en meer). Live registerdata via RDAP en DNS, zonder account.',
                'tagline_nl' => 'Is je domeinnaam nog vrij?',
                'blurb' => 'Type a name and see instantly which of 12 popular extensions are still available, straight from the domain registries (RDAP and DNS).',
                'blurb_nl' => 'Typ een naam en zie direct welke van 12 populaire extensies nog vrij zijn, rechtstreeks uit de domeinregisters (RDAP en DNS).',
            ],
        ];
    }
}

if (!function_exists('easyPluginsSeoSlugFromPath')) {
    function easyPluginsSeoSlugFromPath($canonicalPath) {
        $slug = trim((string) $canonicalPath, '/');
        $meta = easyPluginsSeoMeta();
        return isset($meta[$slug]) ? $slug : null;
    }
}

if (!function_exists('easyPluginsToolFaq')) {
    /**
     * FAQ per tool: rendered as a visible section on the /plugins/ info pages
     * AND emitted as FAQPage structured data. Written to answer the questions
     * people actually type into search engines and AI assistants.
     */
    function easyPluginsToolFaq() {
        return [
            'easy-image' => [
                ['Is Easy Image free?', 'Yes. Easy Image is completely free, with no account, no watermarks on your images and no limits beyond 100 images or 256MB per batch.'],
                ['How do I make a photo smaller than a specific file size, like 200 KB?', 'Choose the Optimize mode (or any mode), open Image Quality, switch to the Target size tab and pick or type the size, for example 200 KB. The best possible quality within that limit is chosen automatically for each image.'],
                ['What happens to my uploaded images?', 'Images are processed on the server and the files are deleted automatically within minutes. Nothing is kept, analysed or shared, and the download links are not guessable.'],
                ['Which formats can I convert to?', 'WebP, JPG and PNG on every server, plus AVIF where the server supports it. HEIC photos from iPhones can be uploaded when the server supports them.'],
                ['Does resizing reduce image quality?', 'Downscaling uses a high-quality Lanczos filter with light sharpening, colors stay accurate through ICC-aware processing, and images that are already small are not enlarged. Private EXIF data such as GPS location is removed from the output.'],
                ['Can I process many images at once?', 'Yes, up to 100 images in one batch (256MB total). Results can be downloaded individually or all together as a ZIP.'],
                ['Can I rename all images before downloading?', 'Yes. The built-in Renamer changes every filename at once: search and replace with multiple rules, name patterns with numbering and dates, one-click transforms like lowercase and URL-safe, and a regex option for advanced patterns like removing image sizes (600x400). A live preview shows every new name before you apply.'],
                ['What does Auto enhance do?', 'Auto enhance measures each photo and applies an adaptive correction: the tonal range is stretched, flat photos get an extra contrast curve and dull colors are lifted, while overall brightness is preserved. A strength slider controls the intensity, and a before/after preview shows the effect on your own photo before processing.'],
            ],
            'easy-png' => [
                ['Is Easy PNG free?', 'Yes, completely free with no account.'],
                ['What does Easy PNG do?', 'It puts a solid color or gradient background behind transparent PNG or WebP images, with a live preview while you adjust.'],
                ['Does my image get uploaded?', 'No. Everything happens in your browser; the image never leaves your device.'],
                ['Which formats can I download?', 'PNG, JPG or WebP, with an adjustable quality setting for JPG and WebP.'],
            ],
            'easy-watermark' => [
                ['Is Easy Watermark free?', 'Yes, completely free with no account and no watermark-on-the-watermark tricks.'],
                ['Can I watermark multiple photos at once?', 'Yes. Add your text or logo once, upload multiple photos, and download them all as a ZIP.'],
                ['Does my photo get uploaded?', 'No. Watermarking happens entirely in your browser; photos never leave your device.'],
                ['Can I use my own logo as a watermark?', 'Yes. Upload a PNG logo (transparency is preserved), position it by dragging, and adjust size, opacity and rotation.'],
            ],
            'easy-image-rotate' => [
                ['Is Easy Image Rotate free?', 'Yes, completely free with no account.'],
                ['Does my photo get uploaded?', 'No. Rotation happens entirely in your browser; the photo never leaves your device.'],
                ['Can I rotate by any angle, not just 90 degrees?', 'Yes. Use the presets for 90, 180 or 270 degrees, or the custom slider for any angle, with a live preview.'],
                ['What happens to the corners when I rotate?', 'You choose the background: transparent (PNG/WebP), white, black or a custom color.'],
            ],
            'easy-html' => [
                ['Is Easy HTML free?', 'Yes, completely free with no account.'],
                ['What does Easy HTML do?', 'It cleans up messy HTML from Word, Google Docs, Gmail or old websites so it works reliably in email and CMS editors: it strips inline styles, classes, empty tags and clutter while keeping structure and links intact. One-click presets set the right options for common jobs.'],
                ['What do the presets do?', 'One click configures everything for a job: "From Google Docs / Word" strips paste clutter, "For CMS editor" keeps semantic tags and turns div into p, "Plain paragraphs" keeps only the text structure, "Sending email styled" keeps inline styles (email clients need them), and "Sending email clean" produces minimal markup without divs, classes or styles.'],
                ['Will my links survive the cleaning?', 'Yes. URLs are protected during cleaning and restored exactly as they were. There is also an option to strip utm_* and other tracking parameters from links while keeping the links working.'],
                ['Does my HTML get uploaded?', 'The HTML is sent to the server for cleaning, processed in memory and returned immediately. Nothing is stored or logged; your text never ends up in a database.'],
                ['Can I search and replace in the text?', 'Yes. Add one or more search and replace rules and they run on the text after cleaning, never inside HTML tags. Handy for filling in placeholders like [price] or [date].'],
                ['Why does my pasted email HTML look bloated?', 'Word and Google Docs add hidden spans, styles and metadata to copied text. Pasting it here and cleaning it removes that invisible clutter.'],
            ],
            'easy-text-converter' => [
                ['Is Easy Text free?', 'Yes, completely free with no account.'],
                ['Which case conversions are supported?', 'UPPERCASE, lowercase, Capitalized Case, Title Case (with correct handling of small words), Sentence case, aLtErNaTiNg, iNVERSE and reverse, plus removing extra spaces, line breaks and duplicate lines.'],
                ['Does my text get uploaded?', 'No. All conversions and statistics run in your browser.'],
                ['Can it count words and characters?', 'Yes, it shows live word, character, sentence and line counts while you type.'],
            ],
            'easy-csv-converter' => [
                ['Is Easy CSV free?', 'Yes, completely free with no account.'],
                ['Can it convert semicolons to commas in a CSV?', 'Yes, it converts between commas, semicolons, tabs, pipes or any custom delimiter, and it handles quoted fields containing delimiters or line breaks correctly.'],
                ['Does my data get uploaded?', 'No. The file is read and converted entirely in your browser.'],
                ['Can it change date formats in a column?', 'Yes. Tell it the current format (like DD/MM/YYYY) and the target format (like YYYY-MM-DD), optionally limited to one column.'],
            ],
            'easy-search-replace' => [
                ['Is Easy Search & Replace free?', 'Yes, completely free with no account.'],
                ['Does it support regular expressions?', 'Yes, including capture groups in the replacement ($1, $2). It reports how many matches were replaced.'],
                ['Does my text get uploaded?', 'No. Everything runs in your browser.'],
                ['What else can it do besides replacing?', 'Truncate lines to a length, add prefixes or suffixes, and add or remove line numbers.'],
            ],
            'easy-pricing' => [
                ['Is Easy Pricing free?', 'Yes, completely free with no account.'],
                ['What can I calculate?', 'Percentages (what is X% of Y, what percentage is X of Y), discounts and sale prices, and VAT (adding or extracting BTW).'],
                ['Which VAT rates does it support?', 'The common Dutch rates (21% and 9%) plus a custom rate for other countries.'],
            ],
            'easy-less' => [
                ['Is Easy LESS free?', 'Yes, completely free with no account.'],
                ['What does Easy LESS do?', 'It compiles LESS code to plain CSS instantly in your browser, with syntax highlighting and clear error messages when something is wrong.'],
                ['Does my code get uploaded?', 'No. Compilation happens entirely in your browser.'],
                ['Can I get minified output?', 'Yes, there is a minify option for compact production CSS.'],
            ],
            'easy-sass' => [
                ['Is Easy SASS free?', 'Yes, completely free with no account.'],
                ['Does it support both SASS and SCSS?', 'Yes, both the indented SASS syntax and the CSS-like SCSS syntax.'],
                ['Does my code get uploaded?', 'No. Compilation happens entirely in your browser.'],
                ['Can I get minified output?', 'Yes, there is a minify option for compact production CSS.'],
            ],
            'easy-identify-me' => [
                ['Is Easy Identify Me free?', 'Yes, completely free with no account.'],
                ['What information does it show?', 'Your public IP address, approximate location and ISP, plus browser, operating system, device, screen and capability details, in one overview.'],
                ['Is my information stored?', 'No. The overview is built for your eyes only and nothing is saved; you decide what to copy and share.'],
                ['What is this useful for?', 'Sharing exact system details with a developer, helpdesk or support team so they can reproduce and fix your issue faster.'],
            ],
            'easy-website-audit' => [
                ['Is Easy Website Audit free?', 'Yes. Auditing a page is completely free, with no account. Free audits check one page and are limited to a few runs per 10 minutes; the full version in Easy Studio audits up to 100 pages with history and monitoring.'],
                ['What does the audit check?', 'Four categories: measured performance (server response time, page weight, request count), SEO and content (title, meta description, H1, alt text, content length), technical setup (HTTPS, robots.txt, sitemap, viewport, canonical, noindex) and structured data and social tags (JSON-LD, Open Graph, Twitter Card).'],
                ['Is this the same as Google PageSpeed?', 'It overlaps but is broader: PageSpeed measures loading performance in a simulated browser, while this audit also checks SEO, technical and structured-data basics. The performance numbers here are real measurements from our server to yours.'],
                ['Can I audit any website?', 'Any publicly reachable page. Sites behind a login, on an intranet or blocking automated tools cannot be audited, and the tool says so instead of guessing a score.'],
                ['How do I audit my whole website?', 'The free check audits one page at a time. The full version in Easy Studio crawls up to 100 pages, tracks your score over time, monitors the site and produces white-label PDF reports for clients.'],
            ],
            'easy-broken-links' => [
                ['Is Easy Broken Links free?', 'Yes. Checking a page is completely free, with no account. The free check scans the page plus two linked pages and verifies up to 40 links; the full version in Easy Studio crawls up to 100 pages.'],
                ['How are links checked?', 'Every unique link gets a real HTTP request (HEAD first, then a small GET for servers that reject HEAD). Status 400 and up, or no response at all, counts as broken.'],
                ['Why are some links reported as "blocked" instead of broken?', 'Some sites answer automated tools with 403 or 999 (LinkedIn famously does) even though the link works fine in a browser. Those are listed separately so you do not chase links that are not actually broken.'],
                ['Are external links checked too?', 'Yes, both internal links and links to other websites are verified.'],
            ],
            'easy-image-audit' => [
                ['Is Easy Image Audit free?', 'Yes. Auditing a page is completely free, with no account. The free audit checks up to 30 images on one page; the full version in Easy Studio audits up to 100 pages.'],
                ['What does it check per image?', 'Format (WebP/AVIF vs older JPG/PNG), file size, whether the image is much larger than the space it is shown in, lazy loading and alt text, in the same spirit as Google Lighthouse. Each image shows how many KB you could save.'],
                ['My page shows zero images but I know there are images. Why?', 'The page is probably rendered by JavaScript (React, Vue, Next.js). Crawlers, including this one and most SEO tools, only see the raw HTML. The audit detects this and tells you instead of reporting a perfect empty score.'],
                ['How do I fix the images it finds?', 'Use the free Easy Image tool on this site: it converts to WebP, resizes to the dimensions you actually need and compresses to an exact file size, up to 100 images in one batch.'],
            ],
            'easy-domain-check' => [
                ['Is Easy Domain Check free?', 'Yes, completely free with no account. Checks are limited to 5 per 10 minutes.'],
                ['How reliable is the availability data?', 'Very. "Available" and "taken" come straight from the domain registries themselves via RDAP (the modern WHOIS) and DNS. A few extensions (.io, .co, .be, .de, .eu) have no public registry API; those show "verify" when DNS suggests the name is free.'],
                ['Which extensions are checked?', '.com, .nl, .net, .org, .be, .de, .eu, .io, .co, .dev, .app and .shop. Type a full domain with another extension (like myproject.fr) and that one is checked too when its registry supports RDAP.'],
                ['Can this tool register the domain for me?', 'No, it only checks availability. You register at any registrar you like, or ask a webmaster like jorsites.com to arrange the domain and website in one go.'],
                ['Is my search stored or shared?', 'No. The result is cached for 10 minutes so repeat checks are instant, and nothing else is stored. Your searches are not logged, sold or used to pre-register domains.'],
            ],
        ];
    }
}

if (!function_exists('easyPluginsRelatedTools')) {
    /** Small "also useful" links shown on tool pages; keys are slugs. */
    function easyPluginsRelatedTools() {
        return [
            'easy-image' => ['easy-watermark', 'easy-image-rotate', 'easy-png'],
            'easy-png' => ['easy-image', 'easy-watermark'],
            'easy-watermark' => ['easy-image', 'easy-image-rotate'],
            'easy-image-rotate' => ['easy-image', 'easy-watermark'],
            'easy-html' => ['easy-text-converter', 'easy-search-replace'],
            'easy-text-converter' => ['easy-search-replace', 'easy-html'],
            'easy-csv-converter' => ['easy-search-replace', 'easy-text-converter'],
            'easy-search-replace' => ['easy-text-converter', 'easy-csv-converter'],
            'easy-pricing' => ['easy-csv-converter'],
            'easy-less' => ['easy-sass', 'easy-html'],
            'easy-sass' => ['easy-less', 'easy-html'],
            'easy-identify-me' => [],
            'easy-website-audit' => ['easy-broken-links', 'easy-image-audit', 'easy-image'],
            'easy-broken-links' => ['easy-website-audit', 'easy-image-audit'],
            'easy-image-audit' => ['easy-image', 'easy-website-audit', 'easy-broken-links'],
            'easy-domain-check' => ['easy-website-audit', 'easy-identify-me'],
        ];
    }
}
