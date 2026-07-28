<?php

class OrientationDebug {
    private static $sessionReports = [];
    private static $enabled = false;

    public static function setEnabled($enabled) {
        self::$enabled = (bool) $enabled;
    }

    public static function isEnabled() {
        return self::$enabled;
    }

    public static function resetSession() {
        self::$sessionReports = [];
    }

    public static function getSessionReports() {
        return self::$sessionReports;
    }

    public static function record(array $report) {
        $report['timestamp'] = date('c');
        self::$sessionReports[] = $report;

        if (self::$enabled) {
            self::writeLog($report);
        }
    }

    public static function writeLog(array $report) {
        $logDir = defined('BASE_PATH') ? BASE_PATH . '/logs' : __DIR__ . '/../../logs';
        if (!is_dir($logDir)) {
            @mkdir($logDir, 0755, true);
        }

        $line = json_encode($report, JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
        if ($line === false) {
            $line = '{}';
        }
        $line .= "\n";
        @file_put_contents($logDir . '/orientation_debug.log', $line, FILE_APPEND | LOCK_EX);
    }
}
