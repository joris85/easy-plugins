<?php
require_once __DIR__ . '/../src/security.php';
easyImageSendSecurityHeaders();

const TETRIS_SCORES_MAX_ENTRIES = 25;
const TETRIS_SCORES_MAX_SCORE = 99999999;

$scoresFile = __DIR__ . '/../data/tetris-scores.json';
$scoresDir = dirname($scoresFile);

if (!is_dir($scoresDir)) {
    mkdir($scoresDir, 0755, true);
}

if (!file_exists($scoresFile)) {
    file_put_contents($scoresFile, json_encode(['entries' => []], JSON_PRETTY_PRINT));
}

function tetrisScoresRead($scoresFile) {
    $raw = @file_get_contents($scoresFile);
    $data = json_decode($raw, true);
    if (!is_array($data) || !isset($data['entries']) || !is_array($data['entries'])) {
        return ['entries' => []];
    }
    return $data;
}

function tetrisScoresWrite($scoresFile, array $data) {
    $handle = fopen($scoresFile, 'c+');
    if (!$handle) {
        return false;
    }

    $ok = false;
    if (flock($handle, LOCK_EX)) {
        $encoded = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        if ($encoded !== false) {
            ftruncate($handle, 0);
            rewind($handle);
            fwrite($handle, $encoded);
            fflush($handle);
            $ok = true;
        }
        flock($handle, LOCK_UN);
    }
    fclose($handle);
    return $ok;
}

function tetrisScoresNormalizeName($name) {
    $name = trim((string) $name);
    $name = preg_replace('/\s+/u', ' ', $name);
    $name = preg_replace('/[^\p{L}\p{N}\- _]/u', '', $name);
    return $name;
}

function tetrisScoresSortEntries(array $entries) {
    usort($entries, function ($a, $b) {
        $scoreA = (int) ($a['score'] ?? 0);
        $scoreB = (int) ($b['score'] ?? 0);
        if ($scoreA !== $scoreB) {
            return $scoreB <=> $scoreA;
        }
        return (int) ($a['at'] ?? 0) <=> (int) ($b['at'] ?? 0);
    });
    return $entries;
}

function tetrisScoresTopEntries(array $entries, $limit = TETRIS_SCORES_MAX_ENTRIES) {
    $entries = tetrisScoresSortEntries($entries);
    return array_slice($entries, 0, $limit);
}

function tetrisScoresHighest(array $entries) {
    $top = tetrisScoresTopEntries($entries, 1);
    if (!$top) {
        return 0;
    }
    return (int) ($top[0]['score'] ?? 0);
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $data = tetrisScoresRead($scoresFile);
    $entries = tetrisScoresTopEntries($data['entries']);
    easyImageSendJson([
        'success' => true,
        'entries' => $entries,
        'best' => tetrisScoresHighest($data['entries']),
    ], 200, JSON_PRETTY_PRINT);
    exit;
}

if ($method !== 'POST') {
    easyImageSendJson(['success' => false, 'error' => 'Method not allowed'], 405);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    easyImageSendJson(['success' => false, 'error' => 'Invalid request body'], 400);
    exit;
}

$name = tetrisScoresNormalizeName($input['name'] ?? '');
$score = (int) ($input['score'] ?? 0);

if ($name === '' || mb_strlen($name) < 2 || mb_strlen($name) > 20) {
    easyImageSendJson(['success' => false, 'error' => 'Name must be 2–20 characters'], 400);
    exit;
}

if ($score <= 0 || $score > TETRIS_SCORES_MAX_SCORE) {
    easyImageSendJson(['success' => false, 'error' => 'Invalid score'], 400);
    exit;
}

$data = tetrisScoresRead($scoresFile);
$data['entries'][] = [
    'name' => $name,
    'score' => $score,
    'at' => time(),
];

$data['entries'] = tetrisScoresTopEntries($data['entries']);

if (!tetrisScoresWrite($scoresFile, $data)) {
    easyImageSendJson(['success' => false, 'error' => 'Could not save score'], 500);
    exit;
}

easyImageSendJson([
    'success' => true,
    'entries' => $data['entries'],
    'best' => tetrisScoresHighest($data['entries']),
    'saved' => true,
]);
