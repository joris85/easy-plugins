<?php
require __DIR__ . '/../libraries/audit/audit-lib.php';
require __DIR__ . '/../libraries/audit/audit-runner.php';

epAuditRespond('links', static fn (string $url): array => EpLinkAudit::run($url));
