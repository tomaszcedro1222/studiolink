<?php

declare(strict_types=1);

require_once __DIR__ . '/google-calendar.php';

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
$preferredDate = trim((string) ($payload['preferredDate'] ?? ''));
$preferredTime = trim((string) ($payload['preferredTime'] ?? ''));
$rentalDuration = trim((string) ($payload['rentalDuration'] ?? ''));
$hasBookingSelection = $preferredDate !== '' || $preferredTime !== '' || $rentalDuration !== '';

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

$booking = null;
if ($hasBookingSelection) {
    $duration = (int) $rentalDuration;
    if (
        !preg_match('/^\d{4}-\d{2}-\d{2}$/', $preferredDate)
        || !preg_match('/^(?:0\d|1\d|2[0-3]):(?:00|30)$/', $preferredTime)
        || !in_array($duration, range(3, 10), true)
        || $rentalDuration !== (string) $duration
    ) {
        respond(422, ['ok' => false, 'message' => 'Invalid booking data']);
    }

    $price = $duration >= 5 ? 2000 + ($duration - 5) * 400 : $duration * 450;
    $booking = [
        'date' => $preferredDate,
        'time' => $preferredTime,
        'duration' => $duration,
        'price' => $price,
    ];
}

$configPath = dirname(__DIR__, 2) . '/private/mailersend.php';
if (!is_file($configPath)) {
    error_log('MailerSend config file is missing: ' . $configPath);
    respond(503, ['ok' => false, 'message' => 'Mail service is not configured']);
}

$config = require $configPath;
if (!is_array($config)) {
    error_log('MailerSend config is invalid');
    respond(503, ['ok' => false, 'message' => 'Mail service is not configured']);
}
$recipientEmails = $config['to_emails'] ?? [($config['to_email'] ?? '')];
$recipientEmails = array_values(array_filter(
    is_array($recipientEmails) ? $recipientEmails : [],
    static fn ($address): bool => is_string($address) && filter_var($address, FILTER_VALIDATE_EMAIL) !== false
));
if (empty($config['api_token']) || empty($config['from_email']) || count($recipientEmails) < 1 || count($recipientEmails) > 2) {
    error_log('MailerSend config is invalid');
    respond(503, ['ok' => false, 'message' => 'Mail service is not configured']);
}

$optional = static fn (string $key): string => trim((string) ($payload[$key] ?? ''));
$details = [
    'Imię i nazwisko' => $name,
    'E-mail' => $email,
    'Telefon' => $phone,
    'Preferowana data' => $booking['date'] ?? '',
    'Preferowana godzina' => $booking['time'] ?? '',
    'Czas wynajmu' => $booking !== null ? $booking['duration'] . ' h' : '',
    'Szacowana cena' => $booking !== null ? $booking['price'] . ' zł' : '',
    'Wiadomość' => $message,
];

$bookingCreated = false;
if ($booking !== null) {
    try {
        $calendarConfig = google_calendar_load_config();
        $timezone = new DateTimeZone($calendarConfig['timezone']);
        $bookingStart = DateTimeImmutable::createFromFormat(
            '!Y-m-d H:i',
            $booking['date'] . ' ' . $booking['time'],
            $timezone
        );
        $dateErrors = DateTimeImmutable::getLastErrors();
        if (
            !$bookingStart
            || ($dateErrors !== false && ($dateErrors['warning_count'] > 0 || $dateErrors['error_count'] > 0))
            || $bookingStart->format('Y-m-d H:i') !== $booking['date'] . ' ' . $booking['time']
        ) {
            respond(422, ['ok' => false, 'message' => 'Invalid booking data']);
        }

        $today = new DateTimeImmutable('today', $timezone);
        $minimumBookingStart = (new DateTimeImmutable('now', $timezone))->modify('+47 hours');
        $lastAllowedDay = $today->modify('first day of this month')->modify('+3 months')->modify('-1 day');
        $startMinutes = (int) $bookingStart->format('H') * 60 + (int) $bookingStart->format('i');
        $lastStartMinutes = (18 - $booking['duration']) * 60;
        if (
            $bookingStart < $minimumBookingStart
            || $bookingStart > $lastAllowedDay->setTime(23, 59, 59)
            || (int) $bookingStart->format('N') > 5
            || $startMinutes < 8 * 60
            || $startMinutes > $lastStartMinutes
        ) {
            respond(422, ['ok' => false, 'message' => 'Invalid booking data']);
        }

        $bookingEnd = $bookingStart->modify('+' . $booking['duration'] . ' hours');
        $privateDirectory = dirname(google_calendar_config_path());
        $lock = fopen($privateDirectory . '/google-calendar-booking.lock', 'c');
        if ($lock === false || !flock($lock, LOCK_EX)) {
            throw new RuntimeException('Could not acquire booking lock');
        }

        try {
            $ratePath = $privateDirectory . '/google-calendar-booking-rate.json';
            $rateData = is_file($ratePath) ? json_decode((string) file_get_contents($ratePath), true) : [];
            $rateData = is_array($rateData) ? $rateData : [];
            $now = time();
            $clientKey = hash('sha256', (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
            $recent = array_values(array_filter(
                is_array($rateData[$clientKey] ?? null) ? $rateData[$clientKey] : [],
                static fn ($timestamp): bool => is_int($timestamp) && $timestamp > $now - 86400
            ));
            if (count($recent) >= 3 || (!empty($recent) && end($recent) > $now - 300)) {
                flock($lock, LOCK_UN);
                fclose($lock);
                respond(429, [
                    'ok' => false,
                    'code' => 'booking_rate_limited',
                    'message' => 'Too many booking attempts',
                ]);
            }

            $busy = google_calendar_busy_periods($calendarConfig, $bookingStart, $bookingEnd);
            if (google_calendar_has_overlap($busy, $bookingStart, $bookingEnd)) {
                flock($lock, LOCK_UN);
                fclose($lock);
                respond(409, [
                    'ok' => false,
                    'code' => 'slot_unavailable',
                    'message' => 'Selected slot is no longer available',
                ]);
            }

            google_calendar_insert_booking($calendarConfig, $bookingStart, $bookingEnd, [
                'name' => $name,
                'email' => $email,
                'phone' => $phone,
                'duration' => $booking['duration'],
                'price' => $booking['price'],
                'message' => $message,
            ]);
            $recent[] = $now;
            $rateData[$clientKey] = $recent;
            foreach ($rateData as $key => $timestamps) {
                $valid = array_values(array_filter(
                    is_array($timestamps) ? $timestamps : [],
                    static fn ($timestamp): bool => is_int($timestamp) && $timestamp > $now - 86400
                ));
                if ($valid === []) {
                    unset($rateData[$key]);
                } else {
                    $rateData[$key] = $valid;
                }
            }
            @file_put_contents(
                $ratePath,
                json_encode($rateData, JSON_UNESCAPED_SLASHES),
                LOCK_EX
            );
            $bookingCreated = true;
        } finally {
            if (is_resource($lock)) {
                flock($lock, LOCK_UN);
                fclose($lock);
            }
        }
    } catch (Throwable $error) {
        error_log('Google Calendar booking error: ' . $error->getMessage());
        respond(503, [
            'ok' => false,
            'code' => 'calendar_unavailable',
            'message' => 'Calendar is temporarily unavailable',
        ]);
    }
}

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
    'reply_to' => ['email' => $email, 'name' => $name],
    'subject' => 'Nowe zapytanie ze strony — ' . $name,
    'text' => implode("\n", $textLines),
    'html' => '<h2>Nowe zapytanie ze strony Studio Link</h2><table>' . implode('', $htmlRows) . '</table>',
];

$failed = false;
foreach ($recipientEmails as $recipientEmail) {
    $mail['to'] = [['email' => $recipientEmail, 'name' => 'Studio Link']];

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
        $failed = true;
        $diagnostic = sprintf(
            "[%s] Recipient %s; MailerSend HTTP %d; cURL: %s; response: %s\n",
            gmdate('c'),
            $recipientEmail,
            $status,
            $curlError,
            (string) $responseBody
        );
        error_log(trim($diagnostic));
        @file_put_contents(dirname($configPath) . '/mailersend-error.log', $diagnostic, FILE_APPEND | LOCK_EX);
    }
}

if ($failed) {
    if ($bookingCreated) {
        respond(202, ['ok' => true, 'booked' => true, 'emailWarning' => true]);
    }
    respond(502, ['ok' => false, 'message' => 'Email could not be sent']);
}

respond(202, ['ok' => true, 'booked' => $bookingCreated]);
