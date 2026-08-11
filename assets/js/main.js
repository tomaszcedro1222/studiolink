// ===== Before / after compare slider =====
(function initCompareSlider() {
  const slider = document.getElementById('compareSlider');
  const clip = document.getElementById('compareClip');
  const handle = document.getElementById('compareHandle');
  if (!slider || !clip || !handle) return;

  let dragging = false;

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
    dragging = true;
    slider.setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  });
  slider.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    updateFromClientX(e.clientX);
  });
  slider.addEventListener('pointerup', () => { dragging = false; });
  slider.addEventListener('pointercancel', () => { dragging = false; });

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
  const REAL_START = 1;
  const REAL_END = count;

  // klony na oba końce dają wrażenie nieskończonej pętli
  const headClone = realCards[count - 1].cloneNode(true);
  const tailClone = realCards[0].cloneNode(true);
  [headClone, tailClone].forEach((c) => {
    c.setAttribute('aria-hidden', 'true');
    c.querySelectorAll('video').forEach((v) => v.removeAttribute('controls'));
  });
  track.insertBefore(headClone, realCards[0]);
  track.appendChild(tailClone);

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
