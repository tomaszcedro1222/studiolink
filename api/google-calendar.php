<?php

declare(strict_types=1);

const GOOGLE_CALENDAR_SCOPES = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.events.freebusy',
];

function google_calendar_config_path(): string
{
    return dirname(__DIR__, 2) . '/private/google-calendar-config.php';
}

function google_calendar_load_config(): array
{
    $configPath = google_calendar_config_path();
    if (!is_file($configPath)) {
        throw new RuntimeException('Google Calendar configuration is missing');
    }

    $config = require $configPath;
    if (!is_array($config)) {
        throw new RuntimeException('Google Calendar configuration is invalid');
    }

    $calendarId = trim((string) ($config['calendar_id'] ?? ''));
    $credentialsPath = (string) ($config['credentials_path'] ?? '');
    $timezone = (string) ($config['timezone'] ?? 'Europe/Warsaw');

    if ($calendarId === '' || $credentialsPath === '' || !is_file($credentialsPath)) {
        throw new RuntimeException('Google Calendar configuration is incomplete');
    }

    try {
        new DateTimeZone($timezone);
    } catch (Throwable) {
        throw new RuntimeException('Google Calendar timezone is invalid');
    }

    $config['calendar_id'] = $calendarId;
    $config['credentials_path'] = $credentialsPath;
    $config['timezone'] = $timezone;

    return $config;
}

function google_calendar_base64url(string $value): string
{
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}

function google_calendar_access_token(array $config): string
{
    $credentialsJson = file_get_contents($config['credentials_path']);
    $credentials = is_string($credentialsJson) ? json_decode($credentialsJson, true) : null;
    if (
        !is_array($credentials)
        || ($credentials['type'] ?? '') !== 'service_account'
        || empty($credentials['client_email'])
        || empty($credentials['private_key'])
    ) {
        throw new RuntimeException('Google service account credentials are invalid');
    }

    $now = time();
    $header = ['alg' => 'RS256', 'typ' => 'JWT'];
    if (!empty($credentials['private_key_id'])) {
        $header['kid'] = $credentials['private_key_id'];
    }
    $claims = [
        'iss' => $credentials['client_email'],
        'scope' => implode(' ', GOOGLE_CALENDAR_SCOPES),
        'aud' => (string) ($credentials['token_uri'] ?? 'https://oauth2.googleapis.com/token'),
        'iat' => $now - 5,
        'exp' => $now + 3500,
    ];
    if (!empty($config['subject'])) {
        $claims['sub'] = (string) $config['subject'];
    }

    $unsigned = google_calendar_base64url((string) json_encode($header, JSON_UNESCAPED_SLASHES))
        . '.' . google_calendar_base64url((string) json_encode($claims, JSON_UNESCAPED_SLASHES));
    if (!openssl_sign($unsigned, $signature, $credentials['private_key'], OPENSSL_ALGO_SHA256)) {
        throw new RuntimeException('Could not sign Google authentication request');
    }

    $curl = curl_init($claims['aud']);
    curl_setopt_array($curl, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
        CURLOPT_POSTFIELDS => http_build_query([
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $unsigned . '.' . google_calendar_base64url($signature),
        ]),
    ]);
    $responseBody = curl_exec($curl);
    $curlError = curl_error($curl);
    $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    curl_close($curl);

    $response = is_string($responseBody) ? json_decode($responseBody, true) : null;
    if ($status < 200 || $status >= 300 || !is_array($response) || empty($response['access_token'])) {
        throw new RuntimeException(sprintf('Google authentication failed (HTTP %d): %s', $status, $curlError));
    }

    return (string) $response['access_token'];
}

function google_calendar_request(string $method, string $url, string $token, ?array $body = null): array
{
    $curl = curl_init($url);
    $options = [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $token,
            'Accept: application/json',
            'Content-Type: application/json; charset=utf-8',
        ],
    ];
    if ($body !== null) {
        $options[CURLOPT_POSTFIELDS] = json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
    curl_setopt_array($curl, $options);

    $responseBody = curl_exec($curl);
    $curlError = curl_error($curl);
    $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    curl_close($curl);

    $response = is_string($responseBody) && $responseBody !== '' ? json_decode($responseBody, true) : [];
    if ($status < 200 || $status >= 300 || !is_array($response)) {
        $googleMessage = is_array($response) ? (string) ($response['error']['message'] ?? '') : '';
        throw new RuntimeException(sprintf(
            'Google Calendar request failed (HTTP %d): %s%s',
            $status,
            $curlError,
            $googleMessage !== '' ? '; ' . $googleMessage : ''
        ));
    }

    return $response;
}

function google_calendar_busy_periods(array $config, DateTimeImmutable $start, DateTimeImmutable $end): array
{
    $token = google_calendar_access_token($config);
    $response = google_calendar_request(
        'POST',
        'https://www.googleapis.com/calendar/v3/freeBusy',
        $token,
        [
            'timeMin' => $start->format(DateTimeInterface::RFC3339),
            'timeMax' => $end->format(DateTimeInterface::RFC3339),
            'timeZone' => $config['timezone'],
            'items' => [['id' => $config['calendar_id']]],
        ]
    );

    $calendar = $response['calendars'][$config['calendar_id']] ?? null;
    if (!is_array($calendar) || !empty($calendar['errors']) || !is_array($calendar['busy'] ?? null)) {
        throw new RuntimeException('Google Calendar did not return availability');
    }

    return $calendar['busy'];
}

function google_calendar_has_overlap(array $periods, DateTimeImmutable $start, DateTimeImmutable $end): bool
{
    foreach ($periods as $period) {
        try {
            $busyStart = new DateTimeImmutable((string) ($period['start'] ?? ''));
            $busyEnd = new DateTimeImmutable((string) ($period['end'] ?? ''));
        } catch (Throwable) {
            continue;
        }
        if ($start < $busyEnd && $end > $busyStart) {
            return true;
        }
    }

    return false;
}

function google_calendar_local_intervals(array $periods, DateTimeZone $timezone): array
{
    $result = [];
    foreach ($periods as $period) {
        try {
            $start = (new DateTimeImmutable((string) ($period['start'] ?? '')))->setTimezone($timezone);
            $end = (new DateTimeImmutable((string) ($period['end'] ?? '')))->setTimezone($timezone);
        } catch (Throwable) {
            continue;
        }

        for ($day = $start->setTime(0, 0); $day < $end; $day = $day->modify('+1 day')) {
            $nextDay = $day->modify('+1 day');
            $intervalStart = $start > $day ? $start : $day;
            $intervalEnd = $end < $nextDay ? $end : $nextDay;
            if ($intervalStart >= $intervalEnd) {
                continue;
            }
            $startMinutes = $intervalStart <= $day
                ? 0
                : ((int) $intervalStart->format('H') * 60 + (int) $intervalStart->format('i'));
            $endMinutes = $intervalEnd >= $nextDay
                ? 1440
                : ((int) $intervalEnd->format('H') * 60 + (int) $intervalEnd->format('i'));
            $result[] = [
                'date' => $day->format('Y-m-d'),
                'start' => $startMinutes,
                'end' => $endMinutes,
            ];
        }
    }

    return $result;
}

function google_calendar_insert_booking(
    array $config,
    DateTimeImmutable $start,
    DateTimeImmutable $end,
    array $booking
): string {
    $token = google_calendar_access_token($config);
    $calendarId = rawurlencode($config['calendar_id']);
    $event = [
        'summary' => 'Rezerwacja Studio Link — ' . $booking['name'],
        'description' => implode("\n", [
            'Rezerwacja przesłana przez stronę studio.linkvisuals.pl',
            '',
            'Imię i nazwisko: ' . $booking['name'],
            'E-mail: ' . $booking['email'],
            'Telefon: ' . $booking['phone'],
            'Czas wynajmu: ' . $booking['duration'] . ' h',
            'Szacowana cena: ' . $booking['price'] . ' zł',
            '',
            'Wiadomość:',
            $booking['message'],
        ]),
        'location' => (string) ($config['location'] ?? 'Link Visuals, Langiewicza 16, Warszawa'),
        'start' => [
            'dateTime' => $start->format(DateTimeInterface::RFC3339),
            'timeZone' => $config['timezone'],
        ],
        'end' => [
            'dateTime' => $end->format(DateTimeInterface::RFC3339),
            'timeZone' => $config['timezone'],
        ],
        'transparency' => 'opaque',
        'visibility' => 'private',
        'extendedProperties' => [
            'private' => ['source' => 'studio-link-website'],
        ],
    ];
    $response = google_calendar_request(
        'POST',
        'https://www.googleapis.com/calendar/v3/calendars/' . $calendarId . '/events',
        $token,
        $event
    );

    if (empty($response['id'])) {
        throw new RuntimeException('Google Calendar did not return an event identifier');
    }

    return (string) $response['id'];
}
