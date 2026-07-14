<?php

// Skopiuj ten plik na serwer jako:
// ~/studio.linkvisuals.pl/private/mailersend.php
// Nigdy nie umieszczaj właściwego tokenu w public_html ani w repozytorium Git.
return [
    'api_token' => 'WKLEJ_TUTAJ_TOKEN_MAILERSEND',
    'from_email' => 'formularz@TWOJA_DOKLADNA_DOMENA_TESTOWA.mlsender.net',
    'from_name' => 'Formularz Studio Link',
    'to_emails' => [
        'stanislaw.komar@linkvisuals.pl',
        'DRUGI_ADRES_EMAIL',
    ],
];
