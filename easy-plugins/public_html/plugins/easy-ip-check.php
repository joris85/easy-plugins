<?php
$pageTitle = 'Easy IP Check - Free IP & DNS Lookup | Easy Plugins';
$faviconPath = '../favicon.ico';
$cssPath = '../shared/master.css';
$themePath = '../shared/theme.js';
include '../shared/header.php';
$articleUrl = easyPluginsArticleUrl();
?>

<meta name="description" content="Free IP and DNS lookup: enter an IP or domain and see resolved IPs, reverse DNS, MX/NS/TXT/SOA records and the IP location, ISP and ASN. No account.">
<meta property="og:title" content="Easy IP Check - Free IP & DNS Lookup">
<meta property="og:description" content="Look up any IP or domain: resolved IPs, reverse DNS, DNS records and IP location, ISP and ASN.">
<meta property="og:type" content="article">
<meta property="og:url" content="<?= $articleUrl ?>">
<link rel="canonical" href="<?= $articleUrl ?>">

<div class="container-fluid">
    <div class="container py-5">
        <div class="row mb-5"><div class="col-lg-8 mx-auto">
            <div class="d-flex align-items-center mb-4">
                <img src="/brand/tools/easy-ip-check.svg" alt="" width="58" height="58" class="me-3">
                <div><h1 class="display-4 mb-2">Easy IP Check</h1><p class="text-muted lead">Free IP &amp; DNS Lookup</p></div>
            </div>
        </div></div>
        <div class="row"><div class="col-lg-8 mx-auto"><article>
            <section class="mb-5"><p class="lead">Enter an IP address or a domain name and get everything public about it in one view: the IP addresses a domain resolves to, the reverse DNS name of an IP, the full DNS record set, and the location, ISP and network (ASN) the IP belongs to.</p></section>

            <section class="mb-5"><h2 class="h3 mb-4"><i class="fas fa-star me-2"></i>Key Features</h2>
                <div class="row">
                    <div class="col-md-6 mb-3"><h3 class="h5"><i class="fas fa-arrows-left-right me-2 text-primary"></i>IP &amp; Reverse DNS</h3><p>Resolve a domain to its A and AAAA addresses, or an IP back to its hostname (PTR).</p></div>
                    <div class="col-md-6 mb-3"><h3 class="h5"><i class="fas fa-server me-2 text-primary"></i>Full DNS Records</h3><p>MX, NS, TXT, SOA and CNAME, exactly as other servers see them — handy for checking mail and delegation.</p></div>
                    <div class="col-md-6 mb-3"><h3 class="h5"><i class="fas fa-location-dot me-2 text-primary"></i>Location &amp; ASN</h3><p>Country, city, ISP and the ASN the IP sits in, from a live public database.</p></div>
                    <div class="col-md-6 mb-3"><h3 class="h5"><i class="fas fa-bolt me-2 text-primary"></i>Instant &amp; Free</h3><p>No account, results cached briefly so repeat checks are instant.</p></div>
                </div>
            </section>

            <section class="mb-5"><h2 class="h3 mb-4"><i class="fas fa-lightbulb me-2"></i>Use Cases</h2>
                <ul>
                    <li class="mb-2">Check which servers receive a domain's email (MX records)</li>
                    <li class="mb-2">Find out where a website is hosted and by which provider</li>
                    <li class="mb-2">Verify DNS changes have propagated</li>
                    <li class="mb-2">Identify an unfamiliar IP address from your logs</li>
                </ul>
            </section>
            <?php $articleFaqSlug = 'easy-ip-check'; include __DIR__ . '/../shared/article-faq-section.php'; ?>
            <section class="mb-5 text-center"><div class="card bg-primary text-white"><div class="card-body p-5">
                <h2 class="h3 mb-3">Look Up an IP or Domain</h2><p class="mb-4">Free, instant, no account.</p>
                <a href="../easy-ip-check/" class="btn btn-light btn-lg"><i class="fas fa-arrow-right me-2"></i>Use Easy IP Check</a>
            </div></div></section>
        </article></div></div>
    </div>
</div>
<?php include '../shared/footer.php'; ?>
