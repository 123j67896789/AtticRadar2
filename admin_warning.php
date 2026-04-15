<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$storage_path = __DIR__ . '/data/admin_warning.json';
$passcode = '1172';

function respond($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit;
}

function load_warning($storage_path) {
    if (!file_exists($storage_path)) {
        return null;
    }
    $raw = file_get_contents($storage_path);
    if ($raw === false) {
        return null;
    }
    $json = json_decode($raw, true);
    if (!is_array($json)) {
        return null;
    }
    return $json['warning'] ?? null;
}

function save_warning($storage_path, $warning_data) {
    $payload = ['warning' => $warning_data];
    file_put_contents($storage_path, json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $warning = load_warning($storage_path);
    respond(['warning' => $warning]);
}

$input = file_get_contents('php://input');
$payload = json_decode($input, true);
if (!is_array($payload)) {
    respond(['message' => 'Invalid JSON payload.'], 400);
}

$client_passcode = $payload['passcode'] ?? '';
if ($client_passcode !== $passcode) {
    respond(['message' => 'Invalid admin passcode.'], 403);
}

$action = $payload['action'] ?? '';
if ($action === 'issue') {
    $warning = $payload['warning'] ?? null;
    if (!is_array($warning) || empty($warning['title']) || empty($warning['message'])) {
        respond(['message' => 'Title and message are required.'], 400);
    }
    save_warning($storage_path, $warning);
    respond(['warning' => $warning]);
}

if ($action === 'clear') {
    save_warning($storage_path, null);
    respond(['warning' => null]);
}

respond(['message' => 'Unknown action.'], 400);
