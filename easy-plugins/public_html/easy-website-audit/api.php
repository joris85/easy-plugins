<?php
require __DIR__ . '/../libraries/audit/audit-lib.php';
require __DIR__ . '/../libraries/audit/audit-runner.php';

epAuditRespond('seo', static fn (string $url): array => EpSeoAudit::run($url));
