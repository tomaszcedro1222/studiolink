(() => {
  const STORAGE_KEY = 'studioLinkLanguage';
  const supported = new Set(['pl', 'en']);
  const requested = new URLSearchParams(window.location.search).get('lang');
  let saved = '';
  try { saved = window.localStorage.getItem(STORAGE_KEY) || ''; } catch {}
  const browserLanguage = (navigator.languages?.[0] || navigator.language || 'en').toLowerCase();
  const language = supported.has(requested) ? requested : supported.has(saved) ? saved : browserLanguage.startsWith('pl') ? 'pl' : 'en';
  if (supported.has(requested)) try { window.localStorage.setItem(STORAGE_KEY, requested); } catch {}
  document.documentElement.lang = language;

  const english = new Map(Object.entries({
    'Studio Link — studio podcastowe Warszawa': 'Studio Link — podcast studio in Warsaw',
    'Studio Link — profesjonalne studio podcastowe i videocastowe w centrum Warszawy.': 'Studio Link — a professional podcast and videocast studio in central Warsaw.',
    'Otwórz menu': 'Open menu', 'Główne menu': 'Main menu', 'Cennik': 'Pricing', 'Realizacje': 'Our work', 'Kontakt': 'Contact',
    'Sprawdź wolne terminy': 'Check availability', 'Profesjonalne studio podcastowe': 'Professional podcast studio', 'w samym centrum Warszawy': 'in the heart of Warsaw',
    'Zadzwoń': 'Call us', 'Zadzwoń: +48 533 633 991': 'Call: +48 533 633 991',
    'Nagrywamy: podcasty, videocasty, rolki, castingi online, streamingi na żywo, filmy szkoleniowe i webinary': 'We record podcasts, videocasts, reels, online castings, live streams, training videos and webinars',
    'Podcasty': 'Podcasts', 'Videocasty': 'Videocasts', 'Rolki': 'Reels', 'Castingi online': 'Online castings', 'Streamingi na żywo': 'Live streams', 'Filmy szkoleniowe': 'Training videos', 'Webinary': 'Webinars',
    'Scenografia': 'Studio setups', 'Poprzednie zdjęcie': 'Previous photo', 'Następne zdjęcie': 'Next photo', 'Wybór slajdu': 'Choose a slide',
    'Jak wygląda nagranie u nas?': 'What does a recording session look like?',
    'Od przygotowanego studia do gotowych plików — w trzech prostych krokach.': 'From a prepared studio to finished files — in three simple steps.',
    'Przed nagraniem': 'Before the session', 'Przygotujemy wybrane ustawienie studia przed Twoim przyjazdem.': 'We will prepare your chosen studio setup before you arrive.',
    'W trakcie': 'During the session',
    'Nagrywamy i realizujemy na żywo, tak żebyś po nagraniu dostał zmiksowany materiał. Nie musisz wynajmować dodatkowej obsługi. Realizator studia jest już w cenie.': 'We record and produce live, so you receive a mixed recording after the session. You do not need to hire an additional crew — a studio producer is included in the price.',
    'Po nagraniu': 'After the session', 'Dostajesz pliki w chmurze lub na własny dysk — jak Ci wygodniej.': 'You receive the files in the cloud or on your own drive — whichever works best for you.',
    'Wszystko, czego potrzebujesz do nagrania': 'Everything you need for your recording',
    'profesjonalne': 'professional', 'studio': 'studio', '4 mikrofony': '4 microphones', '3 kamery': '3 cameras', 'realizacja obrazu': 'video and audio', 'i dźwięku': 'production',
    'pokój kliencki': 'client room', 'stanowisko': 'makeup', 'do makijażu': 'station', 'kuchnia z kawą': 'kitchen with coffee', 'i herbatą': 'and tea', 'prywatny': 'private', 'parking': 'parking',
    'Cztery mikrofony': 'Four microphones', 'Trzy kamery w studiu': 'Three studio cameras', 'Realizacja obrazu i dźwięku': 'Video and audio production', 'Pokój kliencki': 'Client room', 'Stanowisko do makijażu': 'Makeup station', 'Kuchnia z kawą i herbatą': 'Kitchen with coffee and tea', 'Prywatny parking': 'Private parking',
    '3–4 godziny': '3–4 hours', 'Krótka sesja': 'Short session', '/ godz.': '/ hour', '5 godzin': '5 hours', 'Najczęściej wybierany!': 'Most popular!', '10 godzin': '10 hours', 'Pełny dzień nagrań': 'Full recording day',
    'Wybierz dogodny termin': 'Choose a convenient time', 'Sprawdź aktualną dostępność studia.': 'Check current studio availability.', 'Zarezerwuj': 'Book now',
    'Masz pytania?': 'Have questions?', 'Napisz do nas. Doradzimy najlepszy wariant nagrania. Odpowiadamy w ciągu kilku godzin.': 'Write to us. We will recommend the best recording option and reply within a few hours.',
    'Rezerwujesz termin': 'Your selected time', 'Usuń termin': 'Remove date', 'Imię i nazwisko': 'Full name', 'Wpisz imię i nazwisko': 'Enter your full name', 'Adres e-mail': 'Email address', 'Numer telefonu': 'Phone number',
    'Co chcesz wiedzieć?': 'What would you like to know?', 'Napisz, czego chcesz się dowiedzieć.': 'Tell us what you would like to know.',
    'Zgadzam się na wykorzystanie podanych danych w celu odpowiedzi na moje zapytanie.': 'I agree to the use of the information provided in order to respond to my enquiry.',
    'Nie wypełniaj tego pola': 'Leave this field empty', 'Wyślij zapytanie': 'Send enquiry', 'Pola wymagane': 'Required fields',
    'Zarezerwuj termin': 'Book a session', 'Wybierz datę i godzinę rozpoczęcia. Minimalny czas wynajmu studia to 3 godziny.': 'Choose a date and start time. The minimum studio rental time is 3 hours.',
    'Jeśli masz niestandardowy projekt,': 'If you have a custom project,', 'skontaktuj się z nami': 'contact us', 'Poprzedni miesiąc': 'Previous month', 'Następny miesiąc': 'Next month',
    'Pon': 'Mon', 'Wt': 'Tue', 'Śr': 'Wed', 'Czw': 'Thu', 'Pt': 'Fri', 'Sob': 'Sat', 'Nd': 'Sun', 'Wybierz dzień nagrania': 'Choose a recording date',
    'Dostępny': 'Available', 'Wybrany': 'Selected', 'Niedostępny': 'Unavailable', 'Wybrany dzień': 'Selected date', 'Wybierz datę': 'Choose a date',
    'Godziny rozpoczęcia • studio czynne 8:00–18:00': 'Start times • studio open 8:00–18:00', 'Na ile godzin wynajmujesz studio?': 'How many hours would you like to rent the studio for?',
    '3 godz.': '3 hrs', '4 godz.': '4 hrs', '5 godz.': '5 hrs', '6 godz.': '6 hrs', '7 godz.': '7 hrs', '8 godz.': '8 hrs', '9 godz.': '9 hrs', '10 godz.': '10 hrs',
    'Szacowana cena': 'Estimated price', 'Twój termin': 'Your booking', 'Wybieram ten termin': 'Select this time', 'Przykładowe ustawienia studia': 'Example studio setups', 'Zaufali nam': 'Trusted by',
    'Zapraszamy': 'Join us', 'na nagranie!': 'for a recording!', 'Otwórz lokalizację Studio Link w Mapach Google': 'Open Studio Link location in Google Maps',
    'Szybki kontakt i rezerwacja': 'Quick contact and booking', 'Przejdź do danych kontaktowych, telefon: +48 533 633 991': 'Go to contact details, phone: +48 533 633 991', 'Przejdź do kalendarza rezerwacji': 'Go to booking calendar',
    'Polityka prywatności': 'Privacy policy', 'Polityka prywatności — Studio Link': 'Privacy policy — Studio Link', 'Polityka prywatności i cookies Studio Link.': 'Studio Link privacy and cookies policy.', 'Ustawienia cookies': 'Cookie settings', 'Wróć na stronę': 'Back to website', '← Wróć na stronę': '← Back to website', 'Strona główna': 'Home',
    'Ostatnia aktualizacja: 16 lipca 2026 r.': 'Last updated: 16 July 2026', '1. Administrator danych': '1. Data controller',
    'Administratorem danych przekazywanych za pośrednictwem strony Studio Link jest Link Visuals sp. z o.o., NIP: 7010577845, ul. Hoża 86 lok. 410, 00-682 Warszawa. W sprawach związanych z prywatnością możesz napisać na': 'The controller of data submitted through the Studio Link website is Link Visuals sp. z o.o., tax ID: 7010577845, ul. Hoża 86 lok. 410, 00-682 Warsaw, Poland. For privacy-related matters, contact',
    '2. Jakie dane przetwarzamy': '2. What data we process', 'Formularz może obejmować imię i nazwisko, adres e-mail, numer telefonu, treść pytania oraz informacje o wybranym terminie, godzinie, długości i orientacyjnej cenie wynajmu. Dane podajesz dobrowolnie, ale bez pól oznaczonych jako wymagane nie możemy odpowiedzieć na zapytanie.': 'The form may include your full name, email address, phone number, enquiry and information about the selected date, time, duration and estimated rental price. Providing data is voluntary, but we cannot respond without the required fields.',
    '3. Cele i podstawy przetwarzania': '3. Purposes and legal bases for processing', 'udzielenie odpowiedzi i kontakt w sprawie nagrania — na podstawie Twojej zgody;': 'responding and contacting you about a recording — based on your consent;', 'przygotowanie oferty lub podjęcie działań przed zawarciem umowy — gdy o to prosisz;': 'preparing an offer or taking steps before entering into a contract — at your request;', 'ustalenie, dochodzenie lub obrona roszczeń — gdy jest to prawnie uzasadnione.': 'establishing, pursuing or defending claims — where legally justified.',
    '4. Odbiorcy i czas przechowywania': '4. Recipients and retention period', 'Dane mogą być powierzane dostawcom hostingu, poczty, systemu rezerwacji lub wysyłki wiadomości wyłącznie w zakresie potrzebnym do obsługi strony i zapytania. Nie sprzedajemy danych. Przechowujemy je przez czas obsługi sprawy, a następnie przez okres wymagany przepisami lub potrzebny do zabezpieczenia ewentualnych roszczeń. Dane oparte wyłącznie na zgodzie usuwamy po jej wycofaniu, o ile nie istnieje inna podstawa przetwarzania.': 'Data may be entrusted to hosting, email, booking or messaging providers only to the extent necessary to operate the website and handle your enquiry. We do not sell data. We retain it while handling the matter and afterwards for the period required by law or necessary to protect against potential claims. Data processed solely on consent is deleted when consent is withdrawn, unless another legal basis applies.',
    '5. Twoje prawa': '5. Your rights', 'Masz prawo dostępu do danych, ich sprostowania, usunięcia, ograniczenia przetwarzania, przenoszenia, wniesienia sprzeciwu oraz wycofania zgody. Możesz też złożyć skargę do Prezesa Urzędu Ochrony Danych Osobowych.': 'You have the right to access, rectify, erase, restrict and transfer your data, object to processing and withdraw consent. You may also lodge a complaint with the President of the Polish Personal Data Protection Office.',
    '6. Cookies i pamięć przeglądarki': '6. Cookies and browser storage',
    'Strona zapisuje w pamięci lokalnej przeglądarki pozycję': 'The website stores the following item in your browser local storage:',
    ', której celem jest zapamiętanie wybranych ustawień prywatności. Po zaakceptowaniu wszystkich cookies i kliknięciu wybranej realizacji może zostać załadowany osadzony odtwarzacz YouTube oraz zapisane dane niezbędne do jego działania. Przy wyborze „Tylko niezbędne” odtwarzacze nie są pobierane, a w ich miejscu pozostają lokalne zdjęcia. Swoją decyzję możesz w każdej chwili zmienić przez przycisk „Ustawienia cookies” w stopce.': ', which remembers your privacy settings. After accepting all cookies and selecting a project, an embedded YouTube player may load and store data required for its operation. If you choose “Essential only”, players are not downloaded and local images remain in their place. You can change your choice at any time using “Cookie settings” in the footer.',
    '7. Usługi zewnętrzne': '7. External services', 'Strona pobiera krój pisma z Google Fonts. W module realizacji korzystamy również z osadzonych odtwarzaczy YouTube w trybie zwiększonej prywatności. Odtwarzacze są ładowane dopiero po wyrażeniu zgody na wszystkie cookies. Połączenie z serwerami tych dostawców może wiązać się z przekazaniem adresu IP, danych technicznych przeglądarki oraz zapisaniem danych niezbędnych do działania odtwarzacza.': 'The website loads fonts from Google Fonts. Our work section also uses embedded YouTube players in privacy-enhanced mode. Players load only after consent to all cookies. Connecting to these providers may involve sharing your IP address and technical browser data and storing information required for the player to work.',
    '8. Zmiany polityki': '8. Changes to this policy', 'Polityka może być aktualizowana, gdy zmienią się funkcje strony, dostawcy usług albo obowiązujące wymagania. Aktualna wersja jest zawsze dostępna pod tym adresem.': 'This policy may be updated when website features, service providers or applicable requirements change. The current version is always available at this address.'
  }));
  const translate = (value) => language === 'en' ? (english.get(value) || value) : value;
  window.StudioLinkI18n = { language, translate };
  if (language === 'en') {
    document.title = translate(document.title);
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const match = node.nodeValue.match(/^(\s*)(.*?)(\s*)$/s);
      if (!match || !match[2]) return;
      const translated = translate(match[2]);
      if (translated !== match[2]) node.nodeValue = `${match[1]}${translated}${match[3]}`;
    });
    document.querySelectorAll('[aria-label],[placeholder],[title],[content]').forEach((element) => {
      ['aria-label', 'placeholder', 'title', 'content'].forEach((attribute) => {
        if (element.hasAttribute(attribute)) element.setAttribute(attribute, translate(element.getAttribute(attribute)));
      });
    });
  }
  document.querySelectorAll('[data-language]').forEach((button) => {
    const active = button.dataset.language === language;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
    button.addEventListener('click', () => {
      const next = button.dataset.language;
      if (!supported.has(next) || next === language) return;
      try { window.localStorage.setItem(STORAGE_KEY, next); } catch {}
      const url = new URL(window.location.href);
      url.searchParams.delete('lang');
      window.location.assign(url.href);
    });
  });
})();
