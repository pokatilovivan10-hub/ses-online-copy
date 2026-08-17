<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function respond(int $status, array $payload): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    respond(405, ['ok' => false, 'error' => 'Метод не поддерживается']);
}

$configPath = dirname(__DIR__, 3) . '/private/ses-config.php';
if (!is_file($configPath)) {
    error_log('[lead] Missing private configuration');
    respond(500, ['ok' => false, 'error' => 'Не удалось отправить заявку']);
}

$config = require $configPath;
$token = (string)($config['telegram_bot_token'] ?? '');
$chatId = (string)($config['telegram_chat_id'] ?? '');
if ($token === '' || $chatId === '') {
    error_log('[lead] Telegram configuration is incomplete');
    respond(500, ['ok' => false, 'error' => 'Не удалось отправить заявку']);
}

$raw = file_get_contents('php://input');
if ($raw === false || strlen($raw) > 10240) {
    respond(400, ['ok' => false, 'error' => 'Некорректный запрос']);
}

try {
    $data = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
} catch (JsonException) {
    respond(400, ['ok' => false, 'error' => 'Некорректный запрос']);
}

if (!is_array($data)) {
    respond(400, ['ok' => false, 'error' => 'Некорректный запрос']);
}

$name = mb_substr(trim((string)($data['name'] ?? '')), 0, 100);
$phone = mb_substr(trim((string)($data['phone'] ?? '')), 0, 32);
$address = mb_substr(trim((string)($data['address'] ?? '')), 0, 200);
$digits = preg_replace('/\D+/', '', $phone) ?? '';
if (strlen($digits) !== 11) {
    respond(400, ['ok' => false, 'error' => 'Укажите телефон полностью']);
}

$escape = static fn(string $value): string => htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$message = "🪳 <b>Новая заявка с сайта СЭС Москва</b>\n\n"
    . '<b>Имя:</b> ' . ($name !== '' ? $escape($name) : '—') . "\n"
    . '<b>Телефон:</b> ' . $escape($phone) . "\n"
    . '<b>Адрес:</b> ' . ($address !== '' ? $escape($address) : '—') . "\n"
    . '<b>Скидка:</b> 10% (заказ с сайта)';

$url = 'https://api.telegram.org/bot' . rawurlencode($token) . '/sendMessage';
$payload = json_encode([
    'chat_id' => $chatId,
    'text' => $message,
    'parse_mode' => 'HTML',
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

if ($payload === false) {
    respond(500, ['ok' => false, 'error' => 'Не удалось отправить заявку']);
}

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_TIMEOUT => 12,
]);
$body = curl_exec($ch);
$status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
$curlError = curl_error($ch);
curl_close($ch);

$telegram = is_string($body) ? json_decode($body, true) : null;
if ($status !== 200 || !is_array($telegram) || ($telegram['ok'] ?? false) !== true) {
    error_log('[lead] Telegram delivery failed: HTTP ' . $status . ($curlError !== '' ? '; ' . $curlError : ''));
    respond(502, ['ok' => false, 'error' => 'Не удалось отправить заявку']);
}

respond(200, ['ok' => true]);
