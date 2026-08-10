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

  function slideTargetLeft(el) {
    return el.getBoundingClientRect().left - track.getBoundingClientRect().left + track.scrollLeft;
  }

  function jumpTo(index, smooth) {
    track.scrollTo({ left: slideTargetLeft(slides[index]), behavior: smooth ? 'smooth' : 'auto' });
  }

  function closestSlideIndex() {
    const trackRect = track.getBoundingClientRect();
    let closestIndex = REAL_START;
    let closestDist = Infinity;
    slides.forEach((slide, i) => {
      const dist = Math.abs(slide.getBoundingClientRect().left - trackRect.left);
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

  let settleTimer = null;
  track.addEventListener('scroll', () => {
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

  // Mouse drag-to-scroll (touch keeps native swipe scrolling; video controls stay clickable)
  let dragging = false;
  let dragStartX = 0;
  let dragStartScroll = 0;

  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch' || e.target.closest('video')) return;
    dragging = true;
    dragStartX = e.clientX;
    dragStartScroll = track.scrollLeft;
    track.classList.add('dragging');
    track.setPointerCapture(e.pointerId);
  });
  track.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    track.scrollLeft = dragStartScroll - (e.clientX - dragStartX);
  });
  function endDrag() {
    if (!dragging) return;
    dragging = false;
    track.classList.remove('dragging');
    jumpTo(closestSlideIndex(), true);
  }
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);

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
