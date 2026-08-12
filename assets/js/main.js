// ===== Before / after compare slider =====
(function initCompareSlider() {
  const slider = document.getElementById('compareSlider');
  const clip = document.getElementById('compareClip');
  const handle = document.getElementById('compareHandle');
  if (!slider || !clip || !handle) return;

  // Blokada kierunku gestu: gdy ruch jest poziomy, przejmujemy go i blokujemy
  // przewijanie strony; gest wyraźnie pionowy oddajemy przeglądarce.
  const LOCK_THRESHOLD = 6;
  let activeId = null;
  let startX = 0, startY = 0;
  let lock = null;              // null = jeszcze nie wiemy, 'h' = poziom, 'v' = pion

  function syncBeforeImageWidth() {
    const rect = slider.getBoundingClientRect();
    const beforeImg = clip.querySelector('.compare-img');
    if (beforeImg) beforeImg.style.width = rect.width + 'px';
  }

  function setPosition(percent) {
    const clamped = Math.min(100, Math.max(0, percent));
    clip.style.width = clamped + '%';
    handle.style.left = clamped + '%';
  }

  function updateFromClientX(clientX) {
    const rect = slider.getBoundingClientRect();
    const percent = ((clientX - rect.left) / rect.width) * 100;
    setPosition(percent);
  }

  slider.addEventListener('pointerdown', (e) => {
    activeId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    if (e.pointerType === 'touch') {
      lock = null;                       // czekamy, aż kierunek gestu się wyjaśni
    } else {
      lock = 'h';                        // mysz: reagujemy od razu
      slider.setPointerCapture(e.pointerId);
      updateFromClientX(e.clientX);
    }
  });

  slider.addEventListener('pointermove', (e) => {
    if (activeId === null || e.pointerId !== activeId) return;

    if (lock === null) {
      const dx = Math.abs(e.clientX - startX);
      const dy = Math.abs(e.clientY - startY);
      if (dx < LOCK_THRESHOLD && dy < LOCK_THRESHOLD) return;
      if (dy > dx) { lock = 'v'; activeId = null; return; }   // pion → przewijanie strony
      lock = 'h';
      slider.setPointerCapture(e.pointerId);
    }
    if (lock !== 'h') return;
    updateFromClientX(e.clientX);
    if (e.cancelable) e.preventDefault();
  }, { passive: false });

  // twarda blokada: po zaryglowaniu poziomu strona nie może zacząć się przewijać
  slider.addEventListener('touchmove', (e) => {
    if (lock === 'h' && e.cancelable) e.preventDefault();
  }, { passive: false });

  function endGesture(e) {
    if (activeId !== null && e.pointerId !== activeId) return;
    activeId = null;
    lock = null;
  }
  slider.addEventListener('pointerup', endGesture);
  slider.addEventListener('pointercancel', endGesture);

  window.addEventListener('resize', syncBeforeImageWidth);

  syncBeforeImageWidth();
  setPosition(50);
})();

// ===== Packages carousel =====
// Pozycję kontroluje wyłącznie transform — bez overflow-scroll i bez scroll-snap.
// Wcześniej o tę samą wartość scrollLeft walczyły trzy strony (własna animacja,
// natywny snap przeglądarki i przeskok pętli), co dawało losowe zatrzymania.
// Ruch myszy/palca czytamy z window w fazie capture, więc kontrolki <video>
// nie mogą ich pochłonąć i kafelki da się ciągnąć również za filmik.
(function initCarousel() {
  const track = document.getElementById('carouselTrack');
  const dotsWrap = document.getElementById('carouselDots');
  if (!track || !dotsWrap) return;

  const wrap = track.parentElement;
  const realCards = Array.from(track.children);
  const count = realCards.length;
  if (count === 0) return;

  const DRAG_THRESHOLD = 8;    // px — mniejszy ruch to klik, nie przesuwanie
  const FLICK_VELOCITY = 0.45; // px/ms — od tej prędkości uznajemy szybki gest
  const REAL_START = count;
  const REAL_END = 2 * count - 1;

  // Pełny zestaw klonów z obu stron, nie jeden kafelek. Przy kafelkach 86vw
  // sąsiad jest widoczny, więc stojąc na skrajnym klonie widać puste miejsce
  // tam, gdzie powinien być następny kafelek. Z pełnym zestawem każda osiągalna
  // pozycja ma sąsiadów po obu stronach.
  // W klonach podmieniamy <video> na <img> z posterem — wygląda identycznie
  // (ten sam plik, więc trafienie w cache), a nie mnoży dekoderów wideo.
  function makeClone(card) {
    const clone = card.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    clone.querySelectorAll('video').forEach((v) => {
      const poster = v.getAttribute('poster');
      if (!poster) { v.removeAttribute('controls'); return; }
      const img = document.createElement('img');
      img.src = poster;
      img.alt = '';
      v.replaceWith(img);
    });
    return clone;
  }

  realCards.map(makeClone).forEach((c) => track.insertBefore(c, realCards[0]));
  realCards.map(makeClone).forEach((c) => track.appendChild(c));

  const slides = Array.from(track.children);

  let index = REAL_START;
  let step = 0;        // szerokość kafelka + odstęp
  let baseOffset = 0;  // przesunięcie centrujące kafelek
  let offset = 0;      // aktualny transform
  let dragging = false;
  let armed = false;
  let pointerId = null;
  let startX = 0, startY = 0, startOffset = 0;
  let lastX = 0, lastT = 0, velocity = 0;

  // Wymiary ułamkowe, nie offsetWidth — zaokrąglenie do pełnych pikseli
  // kumulowałoby się z każdym kafelkiem (przy 86vw nawet ~7px przy trzecim).
  function measure() {
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const slideWidth = slides[REAL_START].getBoundingClientRect().width;
    step = slideWidth + gap;
    baseOffset = (wrap.getBoundingClientRect().width - slideWidth) / 2;
  }

  function offsetFor(i) {
    return baseOffset - i * step;
  }

  function render(withTransition) {
    track.style.transition = withTransition
      ? 'transform 460ms cubic-bezier(0.22, 0.61, 0.36, 1)'
      : 'none';
    track.style.transform = 'translate3d(' + offset + 'px, 0, 0)';
  }

  function setActiveDot() {
    const real = ((index - REAL_START) % count + count) % count;
    dots.forEach((d, i) => d.classList.toggle('active', i === real));
  }

  function goTo(i, animate) {
    index = i;
    offset = offsetFor(index);
    render(animate);
    setActiveDot();
  }

  // Przeskok z klona na jego bliźniaka. Zachowujemy bieżące odchylenie od pozycji
  // docelowej, więc przeskok jest niewidoczny także w trakcie animacji — klon
  // i bliźniak wyglądają identycznie, więc na ekranie nic się nie zmienia.
  // Wywoływane nie tylko z transitionend, ale i przy każdym nowym chwyceniu,
  // bo przerwana animacja nie emituje transitionend (to psuło zapętlenie).
  function normalize() {
    let shift = 0;
    if (index < REAL_START) shift = count;
    else if (index > REAL_END) shift = -count;
    if (!shift) return;
    const delta = offset - offsetFor(index);
    index += shift;
    offset = offsetFor(index) + delta;
    render(false);
    setActiveDot();
  }

  track.addEventListener('transitionend', (e) => {
    if (e.propertyName === 'transform') normalize();
  });

  realCards.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', 'Przejdź do slajdu ' + (i + 1));
    if (i === 0) dot.classList.add('active');
    dot.addEventListener('click', () => { normalize(); goTo(i + REAL_START, true); });
    dotsWrap.appendChild(dot);
  });
  const dots = Array.from(dotsWrap.children);

  // ---- chwytanie i przesuwanie ----
  function onDown(e) {
    if (e.button != null && e.button !== 0) return;
    if (e.target.closest('a, button, input')) return;
    normalize();   // startujemy zawsze z realnego kafelka, nie z klona
    armed = true;
    dragging = false;
    pointerId = e.pointerId;
    startX = lastX = e.clientX;
    startY = e.clientY;
    startOffset = offset;
    lastT = e.timeStamp;
    velocity = 0;
  }

  function onMove(e) {
    if (!armed || e.pointerId !== pointerId) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (!dragging) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return;
      // gest głównie w pionie zostawiamy przeglądarce (przewijanie strony)
      if (Math.abs(dy) > Math.abs(dx)) { armed = false; return; }
      dragging = true;
      track.style.transition = 'none';
      track.classList.add('dragging');
    }

    const dt = e.timeStamp - lastT;
    if (dt > 0) {
      velocity = velocity * 0.7 + ((e.clientX - lastX) / dt) * 0.3;
      lastT = e.timeStamp;
      lastX = e.clientX;
    }

    offset = startOffset + dx;
    track.style.transform = 'translate3d(' + offset + 'px, 0, 0)';
    if (e.cancelable) e.preventDefault();
  }

  function onUp(e) {
    if (!armed || (pointerId !== null && e.pointerId !== pointerId)) return;
    armed = false;
    pointerId = null;
    if (!dragging) return;
    dragging = false;
    track.classList.remove('dragging');

    // po przeciągnięciu blokujemy jeden klik, żeby wideo nie startowało
    const swallow = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
    window.addEventListener('click', swallow, { capture: true, once: true });
    setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 250);

    // zawsze lądujemy na konkretnym kafelku — maksymalnie o jeden od bieżącego
    const dx = e.clientX - startX;
    let target = index;
    if (velocity < -FLICK_VELOCITY || dx < -step / 3) target = index + 1;
    else if (velocity > FLICK_VELOCITY || dx > step / 3) target = index - 1;
    // nigdy poza pasek kafelków — nawet gdyby normalize() zostało pominięte
    target = Math.max(0, Math.min(slides.length - 1, target));
    goTo(target, true);
  }

  track.addEventListener('pointerdown', onDown);
  // capture na window: kontrolki <video> nie zdążą pochłonąć zdarzeń
  window.addEventListener('pointermove', onMove, { capture: true, passive: false });
  window.addEventListener('pointerup', onUp, true);
  window.addEventListener('pointercancel', onUp, true);
  track.addEventListener('dragstart', (e) => e.preventDefault());

  wrap.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') goTo(index + 1, true);
    else if (e.key === 'ArrowLeft') goTo(index - 1, true);
  });

  // ---- responsywność: przeliczamy wymiary i trzymamy ten sam kafelek ----
  function relayout() {
    measure();
    if (index < REAL_START) index += count;
    else if (index > REAL_END) index -= count;
    offset = offsetFor(index);
    render(false);
    setActiveDot();
  }

  if (typeof ResizeObserver !== 'undefined') {
    let first = true;
    new ResizeObserver(() => {
      if (first) { first = false; return; }
      relayout();
    }).observe(wrap);
  }
  window.addEventListener('resize', relayout);
  window.addEventListener('orientationchange', relayout);

  measure();
  goTo(REAL_START, false);
})();

// ===== Lead form (placeholder submit) =====
(function initForm() {
  const form = document.getElementById('quoteForm');
  const note = document.getElementById('formNote');
  if (!form || !note) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    // TODO: podłącz docelowy endpoint wysyłki formularza (np. Formspree, backend, e-mail).
    note.textContent = 'Dziękujemy! Odezwiemy się z propozycją w ciągu 24h.';
    form.reset();
  });
})();
