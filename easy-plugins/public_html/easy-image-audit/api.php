<?php
require __DIR__ . '/../libraries/audit/audit-lib.php';
require __DIR__ . '/../libraries/audit/audit-runner.php';

epAuditRespond('images', static fn (string $url): array => EpImageAudit::run($url));
