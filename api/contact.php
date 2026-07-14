<?php

declare(strict_types=1);

const ALLOWED_ORIGINS = [
    'https://studio.linkvisuals.pl',
    'https://tomaszcedro1222.github.io',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
];

function respond(int $status, array $body): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && in_array($origin, ALLOWED_ORIGINS, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
}

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    if ($origin !== '' && !in_array($origin, ALLOWED_ORIGINS, true)) {
        respond(403, ['ok' => false]);
    }
    respond(204, []);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, ['ok' => false, 'message' => 'Method not allowed']);
}

if ($origin !== '' && !in_array($origin, ALLOWED_ORIGINS, true)) {
    respond(403, ['ok' => false]);
}

if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 20_000) {
    respond(413, ['ok' => false, 'message' => 'Request too large']);
}

$payload = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($payload)) {
    respond(400, ['ok' => false, 'message' => 'Invalid request']);
}

if (!empty($payload['website'])) {
    respond(200, ['ok' => true]);
}

$name = trim((string) ($payload['name'] ?? ''));
$email = trim((string) ($payload['email'] ?? ''));
$phone = trim((string) ($payload['phone'] ?? ''));
$message = trim((string) ($payload['message'] ?? ''));
$consent = ($payload['consent'] ?? false) === true;

if (
    mb_strlen($name) < 2 || mb_strlen($name) > 120
    || !filter_var($email, FILTER_VALIDATE_EMAIL)
    || mb_strlen($email) > 254
    || mb_strlen($phone) < 5 || mb_strlen($phone) > 40
    || mb_strlen($message) < 10 || mb_strlen($message) > 2000
    || !$consent
) {
    respond(422, ['ok' => false, 'message' => 'Invalid form data']);
}

$configPath = dirname(__DIR__, 2) . '/private/mailersend.php';
if (!is_file($configPath)) {
    error_log('MailerSend config file is missing: ' . $configPath);
    respond(503, ['ok' => false, 'message' => 'Mail service is not configured']);
}

$config = require $configPath;
if (!is_array($config) || empty($config['api_token']) || empty($config['from_email']) || empty($config['to_email'])) {
    error_log('MailerSend config is invalid');
    respond(503, ['ok' => false, 'message' => 'Mail service is not configured']);
}

$optional = static fn (string $key): string => trim((string) ($payload[$key] ?? ''));
$details = [
    'Imię i nazwisko' => $name,
    'E-mail' => $email,
    'Telefon' => $phone,
    'Preferowana data' => $optional('preferredDate'),
    'Preferowana godzina' => $optional('preferredTime'),
    'Czas wynajmu' => $optional('rentalDuration') !== '' ? $optional('rentalDuration') . ' h' : '',
    'Szacowana cena' => $optional('estimatedPrice') !== '' ? $optional('estimatedPrice') . ' zł' : '',
    'Wiadomość' => $message,
];

$textLines = [];
$htmlRows = [];
foreach ($details as $label => $value) {
    if ($value === '') {
        continue;
    }
    $textLines[] = $label . ': ' . $value;
    $htmlRows[] = '<tr><th style="text-align:left;vertical-align:top;padding:6px 12px 6px 0">'
        . htmlspecialchars($label, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8')
        . '</th><td style="padding:6px 0;white-space:pre-wrap">'
        . nl2br(htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'))
        . '</td></tr>';
}

$mail = [
    'from' => [
        'email' => (string) $config['from_email'],
        'name' => (string) ($config['from_name'] ?? 'Formularz Studio Link'),
    ],
    'to' => [[
        'email' => (string) $config['to_email'],
        'name' => (string) ($config['to_name'] ?? 'Studio Link'),
    ]],
    'reply_to' => ['email' => $email, 'name' => $name],
    'subject' => 'Nowe zapytanie ze strony — ' . $name,
    'text' => implode("\n", $textLines),
    'html' => '<h2>Nowe zapytanie ze strony Studio Link</h2><table>' . implode('', $htmlRows) . '</table>',
];

$curl = curl_init('https://api.mailersend.com/v1/email');
curl_setopt_array($curl, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT => 20,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . $config['api_token'],
        'Content-Type: application/json',
        'Accept: application/json',
    ],
    CURLOPT_POSTFIELDS => json_encode($mail, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
]);

$responseBody = curl_exec($curl);
$curlError = curl_error($curl);
$status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
curl_close($curl);

if ($responseBody === false || $status < 200 || $status >= 300) {
    error_log('MailerSend request failed. HTTP ' . $status . '; cURL: ' . $curlError . '; response: ' . (string) $responseBody);
    respond(502, ['ok' => false, 'message' => 'Email could not be sent']);
}

respond(202, ['ok' => true]);
