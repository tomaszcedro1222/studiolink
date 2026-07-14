# Studio Link — strona internetowa

Responsywna strona typu one-page odwzorowana na podstawie projektów `desktop.pdf` i `mobile.pdf`.

## Struktura

- `index.html` — semantyczna struktura strony i treści
- `assets/styles/main.css` — wygląd, layout i breakpointy responsywne
- `assets/scripts/main.js` — menu mobilne, karuzela i obsługa formularza
- `assets/images/` — uporządkowane materiały używane przez stronę
- `assets/media/` — filmy używane na stronie
- `modelowa strona/` — oryginalne pliki referencyjne PDF

## Uruchomienie

Strona nie wymaga procesu budowania. Otwórz `index.html` lub uruchom lokalny serwer HTTP w katalogu projektu.

Przykład:

```powershell
python -m http.server 8080
```

Następnie otwórz `http://localhost:8080`.

## Google Calendar

Kalendarz rezerwacji korzysta z Google Calendar API po stronie PHP. Kod przeglądarki
nie zawiera danych dostępowych. Aby uruchomić synchronizację na serwerze:

1. Utwórz projekt w Google Cloud i włącz **Google Calendar API**.
2. Utwórz konto serwisowe oraz pobierz jego klucz w formacie JSON.
3. Włącz delegowanie dostępu w całej domenie dla konta serwisowego i zatwierdź w
   Google Workspace dwa zakresy: `calendar.events` oraz `calendar.events.freebusy`.
4. Skopiuj `server-config/google-calendar.example.php` poza katalog publiczny jako
   `~/studio.linkvisuals.pl/private/google-calendar.php` i wpisz ID kalendarza.
5. Zapisz klucz jako
   `~/studio.linkvisuals.pl/private/google-service-account.json`.

Pliku JSON i właściwego pliku konfiguracyjnego nie wolno dodawać do repozytorium.
Endpoint `api/calendar-availability.php` zwraca wyłącznie zajęte przedziały, bez
tytułów ani opisów firmowych wydarzeń. Przy wysyłce formularza backend ponownie
sprawdza kolizję i dopiero wtedy zapisuje prywatne wydarzenie w kalendarzu.

## Kolory

- czerwony: `#EE6155`
- tło główne: `#222226`
- tło formularza: `#000000`
- kafelki: `#3C3C40`
