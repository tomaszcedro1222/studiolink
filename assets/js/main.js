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

// ===== Packages carousel: infinite loop + drag + dots =====
(function initCarousel() {
  const track = document.getElementById('carouselTrack');
  const dotsWrap = document.getElementById('carouselDots');
  if (!track || !dotsWrap) return;

  const realCards = Array.from(track.children);
  const count = realCards.length;
  if (count === 0) return;

  const firstClone = realCards[0].cloneNode(true);
  const lastClone = realCards[count - 1].cloneNode(true);
  firstClone.setAttribute('aria-hidden', 'true');
  lastClone.setAttribute('aria-hidden', 'true');
  track.insertBefore(lastClone, realCards[0]);
  track.appendChild(firstClone);

  const slides = Array.from(track.children);
  const REAL_START = 1;
  const REAL_END = count;

  // Kafelki mają scroll-snap-align: center, więc pozycja docelowa musi
  // wyśrodkowywać kafelek — inaczej przeglądarka dosuwałaby go po nas (skok).
  function slideTargetLeft(el) {
    const left = el.getBoundingClientRect().left - track.getBoundingClientRect().left + track.scrollLeft;
    return left - (track.clientWidth - el.offsetWidth) / 2;
  }

  function jumpTo(index, smooth) {
    track.scrollTo({ left: slideTargetLeft(slides[index]), behavior: smooth ? 'smooth' : 'auto' });
  }

  function closestSlideIndex() {
    const trackRect = track.getBoundingClientRect();
    const trackCenter = trackRect.left + track.clientWidth / 2;
    let closestIndex = REAL_START;
    let closestDist = Infinity;
    slides.forEach((slide, i) => {
      const r = slide.getBoundingClientRect();
      const dist = Math.abs(r.left + r.width / 2 - trackCenter);
      if (dist < closestDist) { closestDist = dist; closestIndex = i; }
    });
    return closestIndex;
  }

  realCards.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', 'Przejdź do slajdu ' + (i + 1));
    if (i === 0) dot.classList.add('active');
    dot.addEventListener('click', () => jumpTo(i + 1, true));
    dotsWrap.appendChild(dot);
  });
  const dots = Array.from(dotsWrap.children);

  function setActiveDot(realIndex) {
    dots.forEach((d, i) => d.classList.toggle('active', i === realIndex));
  }

  let dragging = false;
  let animating = false;

  let settleTimer = null;
  track.addEventListener('scroll', () => {
    if (animating || dragging) return;
    if (settleTimer) clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      const idx = closestSlideIndex();
      if (idx === 0) {
        jumpTo(REAL_END, false);
        setActiveDot(REAL_END - 1);
      } else if (idx === slides.length - 1) {
        jumpTo(REAL_START, false);
        setActiveDot(0);
      } else {
        setActiveDot(idx - 1);
      }
    }, 80);
  }, { passive: true });

  window.addEventListener('resize', () => jumpTo(closestSlideIndex(), false));

  // ===== Chwytanie i przesuwanie kafelków (także za wideo) z wyhamowaniem =====
  const DRAG_THRESHOLD = 6;   // px — poniżej tego traktujemy gest jako klik
  const GLIDE = 180;          // mnożnik wybiegu z prędkości gestu
  const SETTLE_MS = 480;      // czas dojechania do najbliższego kafelka

  let armed = false;
  let startX = 0;
  let startScroll = 0;
  let lastX = 0;
  let lastT = 0;
  let velocity = 0;           // px/ms

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function animateTo(targetLeft, duration) {
    const from = track.scrollLeft;
    const delta = targetLeft - from;
    if (Math.abs(delta) < 1) { track.classList.remove('dragging'); return; }
    animating = true;
    const t0 = performance.now();
    (function step(now) {
      const p = Math.min(1, (now - t0) / duration);
      track.scrollLeft = from + delta * easeOutCubic(p);
      if (p < 1) {
        requestAnimationFrame(step);
      } else {
        animating = false;
        track.classList.remove('dragging');   // snap wraca dopiero na pozycji docelowej
        const idx = closestSlideIndex();
        if (idx === 0) { jumpTo(REAL_END, false); setActiveDot(REAL_END - 1); }
        else if (idx === slides.length - 1) { jumpTo(REAL_START, false); setActiveDot(0); }
        else { setActiveDot(idx - 1); }
      }
    })(t0);
  }

  function nearestSlideLeftTo(scrollPos) {
    let best = null;
    let bestDist = Infinity;
    slides.forEach((slide) => {
      const left = slideTargetLeft(slide);
      const dist = Math.abs(left - scrollPos);
      if (dist < bestDist) { bestDist = dist; best = left; }
    });
    return best;
  }

  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return;   // dotyk: zostawiamy natywne przewijanie
    if (e.button !== 0) return;
    armed = true;
    dragging = false;
    startX = lastX = e.clientX;
    startScroll = track.scrollLeft;
    lastT = performance.now();
    velocity = 0;
  });

  track.addEventListener('pointermove', (e) => {
    if (!armed) return;
    const dx = e.clientX - startX;

    // dopóki nie przekroczymy progu, nie przechwytujemy gestu —
    // dzięki temu klikanie kontrolek wideo nadal działa
    if (!dragging) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return;
      dragging = true;
      track.classList.add('dragging');
      track.setPointerCapture(e.pointerId);
    }

    const now = performance.now();
    const dt = now - lastT;
    if (dt > 0) {
      const inst = (e.clientX - lastX) / dt;
      velocity = velocity * 0.7 + inst * 0.3;   // wygładzona prędkość
      lastT = now;
      lastX = e.clientX;
    }
    track.scrollLeft = startScroll - dx;
    e.preventDefault();
  });

  function endDrag(e) {
    if (!armed) return;
    armed = false;
    if (!dragging) return;
    dragging = false;

    // po przeciągnięciu blokujemy klik, by wideo nie startowało/nie pauzowało
    if (e && e.target) {
      const swallow = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
      track.addEventListener('click', swallow, { capture: true, once: true });
      setTimeout(() => track.removeEventListener('click', swallow, { capture: true }), 0);
    }

    // wybieg ograniczony do ~1 kafelka, by szybki flick nie przelatywał całej karuzeli
    const slideStep = slides[REAL_START].offsetWidth + 24;
    const glide = Math.max(-slideStep, Math.min(slideStep, -velocity * GLIDE));
    animateTo(nearestSlideLeftTo(track.scrollLeft + glide), SETTLE_MS);
  }

  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);
  track.addEventListener('dragstart', (e) => { if (dragging) e.preventDefault(); });

  jumpTo(REAL_START, false);
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
