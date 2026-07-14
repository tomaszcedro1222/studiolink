<?php

// 1. Skopiuj ten plik na serwer jako:
//    ~/studio.linkvisuals.pl/private/google-calendar.php
// 2. Plik JSON konta serwisowego zapisz obok jako:
//    ~/studio.linkvisuals.pl/private/google-service-account.json
// 3. Udostępnij wybrany kalendarz adresowi e-mail konta serwisowego
//    z uprawnieniem „Wprowadzanie zmian w wydarzeniach”.
// Nigdy nie umieszczaj właściwego pliku JSON w public_html ani w repozytorium Git.
return [
    'calendar_id' => 'c_e6dd8efff5a7888b1148e24496ac9aadf560ca47a04662bf7f1c4fe8270ace65@group.calendar.google.com',
    'credentials_path' => __DIR__ . '/google-service-account.json',
    'subject' => 'drive@linkvisuals.pl',
    'timezone' => 'Europe/Warsaw',
    'location' => 'Link Visuals, Langiewicza 16, 02-071 Warszawa',
];
