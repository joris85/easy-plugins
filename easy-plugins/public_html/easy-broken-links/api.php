<?php
require __DIR__ . '/../libraries/audit/audit-lib.php';
require __DIR__ . '/../libraries/audit/audit-runner.php';

epAuditRespond('links', static fn (string $url, string $lang): array => EpLinkAudit::run($url));
