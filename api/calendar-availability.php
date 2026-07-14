<?php

declare(strict_types=1);

require_once __DIR__ . '/google-calendar.php';

const ALLOWED_CALENDAR_ORIGINS = [
    'https://studio.linkvisuals.pl',
    'https://tomaszcedro1222.github.io',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
];

function availability_respond(int $status, array $body): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && in_array($origin, ALLOWED_CALENDAR_ORIGINS, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
}

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    if ($origin !== '' && !in_array($origin, ALLOWED_CALENDAR_ORIGINS, true)) {
        availability_respond(403, ['ok' => false]);
    }
    availability_respond(204, []);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    availability_respond(405, ['ok' => false, 'message' => 'Method not allowed']);
}
if ($origin !== '' && !in_array($origin, ALLOWED_CALENDAR_ORIGINS, true)) {
    availability_respond(403, ['ok' => false]);
}

$fromValue = (string) ($_GET['from'] ?? '');
$toValue = (string) ($_GET['to'] ?? '');
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fromValue) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $toValue)) {
    availability_respond(422, ['ok' => false, 'message' => 'Invalid date range']);
}

try {
    $config = google_calendar_load_config();
    $timezone = new DateTimeZone($config['timezone']);
    $from = (new DateTimeImmutable($fromValue . ' 00:00:00', $timezone));
    $to = (new DateTimeImmutable($toValue . ' 00:00:00', $timezone))->modify('+1 day');
    $today = new DateTimeImmutable('today', $timezone);

    if ($from < $today || $to <= $from || $from->diff($to)->days > 100) {
        availability_respond(422, ['ok' => false, 'message' => 'Invalid date range']);
    }

    $periods = google_calendar_busy_periods($config, $from, $to);
    availability_respond(200, [
        'ok' => true,
        'timezone' => $config['timezone'],
        'busy' => google_calendar_local_intervals($periods, $timezone),
    ]);
} catch (Throwable $error) {
    $diagnostic = sprintf(
        "[%s] Google Calendar availability error: %s\n",
        gmdate('c'),
        $error->getMessage()
    );
    error_log(trim($diagnostic));
    @file_put_contents(
        dirname(google_calendar_config_path()) . '/google-calendar-error.log',
        $diagnostic,
        FILE_APPEND | LOCK_EX
    );
    availability_respond(503, ['ok' => false, 'message' => 'Calendar is temporarily unavailable']);
}
