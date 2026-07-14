const menuButton = document.querySelector('.menu-button');
const menu = document.querySelector('.menu');
const mobileBookingCta = document.querySelector('.mobile-booking-cta');
const bookingSection = document.querySelector('#rezerwacja');
const newsletterSection = document.querySelector('.newsletter');
const clientsSection = document.querySelector('.clients');
const segmentedVideos = [...document.querySelectorAll('video[data-loop-start]')];

if (clientsSection && 'IntersectionObserver' in window) {
  clientsSection.classList.add('clients--animate');
  const clientsVisibilityObserver = new IntersectionObserver(([entry], observer) => {
    if (!entry.isIntersecting) return;
    clientsSection.classList.add('is-visible');
    observer.disconnect();
  }, { threshold: 0.18 });
  clientsVisibilityObserver.observe(clientsSection);
}

if (mobileBookingCta && bookingSection && 'IntersectionObserver' in window) {
  const visibleBookingSections = new Set();
  const bookingVisibilityObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) visibleBookingSections.add(entry.target);
      else visibleBookingSections.delete(entry.target);
    });
    mobileBookingCta.classList.toggle('is-hidden', visibleBookingSections.size > 0);
  }, { threshold: 0.08 });
  bookingVisibilityObserver.observe(bookingSection);
  if (newsletterSection) bookingVisibilityObserver.observe(newsletterSection);
}

const playVideo = (video) => {
  video.muted = true;
  video.defaultMuted = true;
  const playback = video.play();
  if (playback) playback.catch(() => {});
};

segmentedVideos.forEach((video) => {
  const loopStart = Number(video.dataset.loopStart) || 0;
  const configuredEnd = Number(video.dataset.loopEnd);
  const loopEnd = Number.isFinite(configuredEnd) && configuredEnd > loopStart ? configuredEnd : null;

  const restartSegment = () => {
    video.currentTime = loopStart;
    playVideo(video);
  };
  const enforceSegmentEnd = () => {
    if (loopEnd && video.currentTime >= loopEnd) restartSegment();
  };

  video.addEventListener('loadedmetadata', () => {
    if (video.currentTime < loopStart || (loopEnd && video.currentTime >= loopEnd)) video.currentTime = loopStart;
    playVideo(video);
  }, { once: true });
  video.addEventListener('timeupdate', enforceSegmentEnd);
  video.addEventListener('ended', restartSegment);
  video.addEventListener('canplay', () => playVideo(video), { once: true });
  document.addEventListener('click', () => playVideo(video), { once: true });
  document.addEventListener('touchstart', () => playVideo(video), { once: true, passive: true });
  if (loopEnd && 'requestVideoFrameCallback' in video) {
    const checkVideoFrame = () => {
      enforceSegmentEnd();
      video.requestVideoFrameCallback(checkVideoFrame);
    };
    video.requestVideoFrameCallback(checkVideoFrame);
  }
  playVideo(video);
});

menuButton?.addEventListener('click', () => {
  const open = menu.classList.toggle('is-open');
  menuButton.setAttribute('aria-expanded', String(open));
});

menu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  menu.classList.remove('is-open');
  menuButton.setAttribute('aria-expanded', 'false');
}));

document.querySelectorAll('[data-carousel]').forEach((carousel) => {
  const track = carousel.querySelector('.carousel__track');
  const slides = [...track.children];
  const dots = carousel.querySelector('.carousel__dots');
  let scrollEndTimer;
  let animationFrame;
  let isAnimating = false;

  if (slides.length < 2) return;

  const cloneSlides = () => slides.map((slide) => {
    const clone = slide.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    return clone;
  });
  track.prepend(...cloneSlides());
  track.append(...cloneSlides());

  const loopSlides = [...track.children];
  const slidePosition = (slide) => slide.offsetLeft - ((track.clientWidth - slide.clientWidth) / 2);
  const jumpToPhysicalSlide = (index) => {
    track.scrollLeft = slidePosition(loopSlides[index]);
  };
  const currentPhysicalIndex = () => {
    const trackCenter = track.scrollLeft + (track.clientWidth / 2);
    return loopSlides.reduce((closest, slide, index) => {
      const distance = Math.abs((slide.offsetLeft + (slide.clientWidth / 2)) - trackCenter);
      return distance < closest.distance ? { index, distance } : closest;
    }, { index: 1, distance: Infinity }).index;
  };
  const logicalIndex = (physicalIndex) => {
    return physicalIndex % slides.length;
  };
  const updateDots = (physicalIndex = currentPhysicalIndex()) => {
    const active = logicalIndex(physicalIndex);
    dots.querySelectorAll('button').forEach((dot, index) => dot.classList.toggle('is-active', index === active));
  };
  const normalizeLoopPosition = () => {
    const physicalIndex = currentPhysicalIndex();
    if (physicalIndex < slides.length) jumpToPhysicalSlide(physicalIndex + slides.length);
    if (physicalIndex >= slides.length * 2) jumpToPhysicalSlide(physicalIndex - slides.length);
    updateDots();
  };
  const animateToPhysicalSlide = (index) => {
    if (!loopSlides[index]) return;
    window.cancelAnimationFrame(animationFrame);
    window.clearTimeout(scrollEndTimer);
    isAnimating = true;
    track.style.scrollSnapType = 'none';

    const start = track.scrollLeft;
    const destination = slidePosition(loopSlides[index]);
    const distance = destination - start;
    const duration = 800;
    const startedAt = performance.now();

    const animate = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const easedProgress = 0.5 - (Math.cos(Math.PI * progress) / 2);
      track.scrollLeft = start + (distance * easedProgress);
      updateDots();

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(animate);
        return;
      }

      normalizeLoopPosition();
      animationFrame = window.requestAnimationFrame(() => {
        track.style.scrollSnapType = '';
        isAnimating = false;
      });
    };

    animationFrame = window.requestAnimationFrame(animate);
  };

  const goTo = (index) => animateToPhysicalSlide(index + slides.length);
  slides.forEach((_, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', `Slajd ${index + 1}`);
    if (index === 0) dot.classList.add('is-active');
    dot.addEventListener('click', () => goTo(index));
    dots.append(dot);
  });

  carousel.querySelector('.carousel__nav--prev').addEventListener('click', () => animateToPhysicalSlide(currentPhysicalIndex() - 1));
  carousel.querySelector('.carousel__nav--next').addEventListener('click', () => animateToPhysicalSlide(currentPhysicalIndex() + 1));
  track.addEventListener('scroll', () => {
    updateDots();
    if (isAnimating) return;
    window.clearTimeout(scrollEndTimer);
    scrollEndTimer = window.setTimeout(normalizeLoopPosition, 220);
  }, { passive: true });

  requestAnimationFrame(() => jumpToPhysicalSlide(slides.length));
});

const galleryItems = [...document.querySelectorAll('.facilities .photo-grid figure')];
const lightbox = document.querySelector('.lightbox');

if (lightbox && galleryItems.length) {
  const lightboxImage = lightbox.querySelector('.lightbox__image');
  const lightboxCaption = lightbox.querySelector('.lightbox__caption');
  const lightboxCounter = lightbox.querySelector('.lightbox__counter');
  const closeButton = lightbox.querySelector('.lightbox__close');
  const previousButton = lightbox.querySelector('.lightbox__nav--prev');
  const nextButton = lightbox.querySelector('.lightbox__nav--next');
  const pageRegions = [...document.querySelectorAll('body > header, body > main, body > footer')];
  let activeImageIndex = 0;
  let lastFocusedElement;
  let touchStartX = 0;

  const showImage = (index) => {
    activeImageIndex = (index + galleryItems.length) % galleryItems.length;
    const item = galleryItems[activeImageIndex];
    const image = item.querySelector('img');
    const caption = item.querySelector('figcaption')?.textContent.trim() || image.alt;
    lightboxImage.src = image.currentSrc || image.src;
    lightboxImage.alt = image.alt;
    lightboxCaption.textContent = caption;
    lightboxCounter.textContent = `${activeImageIndex + 1} / ${galleryItems.length}`;
  };

  const openLightbox = (index) => {
    lastFocusedElement = document.activeElement;
    showImage(index);
    lightbox.hidden = false;
    document.body.classList.add('lightbox-open');
    pageRegions.forEach((region) => region.setAttribute('inert', ''));
    closeButton.focus();
  };

  const closeLightbox = () => {
    lightbox.hidden = true;
    document.body.classList.remove('lightbox-open');
    pageRegions.forEach((region) => region.removeAttribute('inert'));
    lastFocusedElement?.focus();
  };

  galleryItems.forEach((item, index) => {
    const caption = item.querySelector('figcaption')?.textContent.trim() || `zdj\u0119cie ${index + 1}`;
    item.tabIndex = 0;
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', `Powi\u0119ksz: ${caption}`);
    item.addEventListener('click', () => openLightbox(index));
    item.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      openLightbox(index);
    });
  });

  closeButton.addEventListener('click', closeLightbox);
  previousButton.addEventListener('click', () => showImage(activeImageIndex - 1));
  nextButton.addEventListener('click', () => showImage(activeImageIndex + 1));
  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) closeLightbox();
  });
  lightboxImage.addEventListener('touchstart', (event) => {
    touchStartX = event.changedTouches[0].clientX;
  }, { passive: true });
  lightboxImage.addEventListener('touchend', (event) => {
    const distance = event.changedTouches[0].clientX - touchStartX;
    if (Math.abs(distance) < 50) return;
    showImage(activeImageIndex + (distance < 0 ? 1 : -1));
  }, { passive: true });
  document.addEventListener('keydown', (event) => {
    if (lightbox.hidden) return;
    if (event.key === 'Escape') closeLightbox();
    if (event.key === 'ArrowLeft') showImage(activeImageIndex - 1);
    if (event.key === 'ArrowRight') showImage(activeImageIndex + 1);
  });
}

const studioCalendar = document.querySelector('[data-studio-calendar]');

if (studioCalendar) {
  const daysContainer = studioCalendar.querySelector('[data-calendar-days]');
  const slotsContainer = studioCalendar.querySelector('[data-calendar-slots]');
  const monthLabel = studioCalendar.querySelector('[data-calendar-month]');
  const selectedDateLabel = studioCalendar.querySelector('[data-calendar-selected-date]');
  const summary = studioCalendar.querySelector('[data-calendar-summary]');
  const summaryDate = studioCalendar.querySelector('[data-calendar-summary-date]');
  const summaryTime = studioCalendar.querySelector('[data-calendar-summary-time]');
  const summaryPrice = studioCalendar.querySelector('[data-calendar-summary-price]');
  const priceLabel = studioCalendar.querySelector('[data-calendar-price]');
  const priceNote = studioCalendar.querySelector('[data-calendar-price-note]');
  const durationButtons = [...studioCalendar.querySelectorAll('[data-calendar-duration]')];
  const previousButton = studioCalendar.querySelector('[data-calendar-prev]');
  const nextButton = studioCalendar.querySelector('[data-calendar-next]');
  const confirmButton = studioCalendar.querySelector('[data-calendar-confirm]');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstAllowedMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastAllowedMonth = new Date(today.getFullYear(), today.getMonth() + 2, 1);
  let displayedMonth = new Date(firstAllowedMonth);
  let selectedDate = null;
  let selectedStart = '';
  let selectedDuration = 3;

  const monthFormatter = new Intl.DateTimeFormat('pl-PL', { month: 'long', year: 'numeric' });
  const fullDateFormatter = new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
  const summaryDateFormatter = new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const priceFormatter = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 });
  const capitalize = (value) => value.charAt(0).toUpperCase() + value.slice(1);
  const sameDay = (first, second) => first && second
    && first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate();
  const toIsoDate = (date) => [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
  const isWorkingDay = (date) => date > today && date.getDay() !== 0 && date.getDay() !== 6;
  const addHours = (time, hours) => {
    const [hour, minute] = time.split(':').map(Number);
    return `${String(hour + hours).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  };
  const calculatePrice = (hours) => {
    if (hours >= 5) {
      const extraHours = hours - 5;
      return {
        value: 2000 + extraHours * 400,
        note: extraHours === 0 ? 'pakiet p\u00f3\u0142 dnia \u2022 400 z\u0142/h' : '400 z\u0142/h',
      };
    }
    return { value: hours * 450, note: `${hours} \u00d7 450 z\u0142/h` };
  };
  const getDemoBookings = (date) => {
    const bookings = [];
    if (date.getDate() % 3 === 1) bookings.push({ start: 13 * 60, end: 16 * 60 });
    if (date.getDate() % 4 === 0) bookings.push({ start: 10 * 60, end: 11 * 60 + 30 });
    return bookings;
  };
  const isSlotAvailable = (date, startMinutes, duration) => {
    const endMinutes = startMinutes + duration * 60;
    return !getDemoBookings(date).some((booking) => startMinutes < booking.end && endMinutes > booking.start);
  };
  const getLastStartMinutes = (duration) => (duration === 10 ? 9 : 18 - duration) * 60;
  const hasAvailableSlot = (date, duration) => {
    for (let minutes = 9 * 60; minutes <= getLastStartMinutes(duration); minutes += 30) {
      if (isSlotAvailable(date, minutes, duration)) return true;
    }
    return false;
  };

  const renderDuration = () => {
    const price = calculatePrice(selectedDuration);
    durationButtons.forEach((button) => {
      const selected = Number(button.dataset.calendarDuration) === selectedDuration;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    priceLabel.textContent = priceFormatter.format(price.value);
    priceNote.textContent = price.note;
  };

  const renderSummary = () => {
    if (!selectedDate || !selectedStart) {
      summary.hidden = true;
      return;
    }
    summaryDate.textContent = capitalize(summaryDateFormatter.format(selectedDate));
    const price = calculatePrice(selectedDuration);
    summaryTime.textContent = `${selectedStart}\u2013${addHours(selectedStart, selectedDuration)} (${selectedDuration} godz.)`;
    summaryPrice.textContent = `Cena: ${priceFormatter.format(price.value)}`;
    summary.hidden = false;
  };

  const renderSlots = () => {
    slotsContainer.replaceChildren();
    selectedDateLabel.textContent = selectedDate
      ? capitalize(fullDateFormatter.format(selectedDate))
      : 'Wybierz dat\u0119';

    if (!selectedDate) {
      const prompt = document.createElement('p');
      prompt.className = 'studio-calendar__empty';
      prompt.textContent = 'Najpierw wybierz dost\u0119pny dzie\u0144 w kalendarzu.';
      slotsContainer.append(prompt);
      renderSummary();
      return;
    }

    const lastStartMinutes = getLastStartMinutes(selectedDuration);
    for (let minutes = 9 * 60; minutes <= lastStartMinutes; minutes += 30) {
      const hour = Math.floor(minutes / 60);
      const minute = minutes % 60;
      const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      const button = document.createElement('button');
      const overlapsBooking = !isSlotAvailable(selectedDate, minutes, selectedDuration);
      button.type = 'button';
      button.className = 'studio-calendar__slot';
      button.textContent = time;
      button.disabled = overlapsBooking;
      button.setAttribute('aria-label', overlapsBooking ? `${time}, rezerwacja nak\u0142ada si\u0119 na zaj\u0119ty termin` : `${time}, wybierz godzin\u0119 rozpocz\u0119cia`);
      button.setAttribute('aria-pressed', String(selectedStart === time));
      button.classList.toggle('is-selected', selectedStart === time);
      button.addEventListener('click', () => {
        selectedStart = time;
        renderSlots();
      });
      slotsContainer.append(button);
    }
    renderSummary();
  };

  const selectDate = (date) => {
    selectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    selectedStart = '';
    renderDays();
    renderSlots();
  };

  const renderDays = () => {
    daysContainer.replaceChildren();
    monthLabel.textContent = capitalize(monthFormatter.format(displayedMonth));
    const firstDay = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth(), 1);
    const daysInMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + 1, 0).getDate();
    const mondayOffset = (firstDay.getDay() + 6) % 7;

    for (let index = 0; index < mondayOffset; index += 1) {
      const spacer = document.createElement('span');
      spacer.className = 'studio-calendar__day-spacer';
      spacer.setAttribute('aria-hidden', 'true');
      daysContainer.append(spacer);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth(), day);
      const button = document.createElement('button');
      const available = isWorkingDay(date) && hasAvailableSlot(date, selectedDuration);
      button.type = 'button';
      button.className = 'studio-calendar__day';
      button.textContent = String(day);
      button.disabled = !available;
      button.setAttribute('role', 'gridcell');
      button.setAttribute('aria-label', `${capitalize(fullDateFormatter.format(date))}${available ? '' : ', niedost\u0119pny'}`);
      button.setAttribute('aria-selected', String(sameDay(date, selectedDate)));
      button.classList.toggle('is-today', sameDay(date, today));
      button.classList.toggle('is-selected', sameDay(date, selectedDate));
      if (available) button.addEventListener('click', () => selectDate(date));
      daysContainer.append(button);
    }

    previousButton.disabled = displayedMonth <= firstAllowedMonth;
    nextButton.disabled = displayedMonth >= lastAllowedMonth;
  };

  previousButton.addEventListener('click', () => {
    displayedMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() - 1, 1);
    renderDays();
  });
  nextButton.addEventListener('click', () => {
    displayedMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + 1, 1);
    renderDays();
  });
  durationButtons.forEach((button) => button.addEventListener('click', () => {
    selectedDuration = Number(button.dataset.calendarDuration);
    selectedStart = '';
    if (selectedDate && !hasAvailableSlot(selectedDate, selectedDuration)) selectedDate = null;
    renderDuration();
    renderDays();
    renderSlots();
  }));
  confirmButton.addEventListener('click', () => {
    if (!selectedDate || !selectedStart) return;
    const form = document.querySelector('.contact-form');
    if (!form) return;
    form.elements.preferredDate.value = toIsoDate(selectedDate);
    form.elements.preferredTime.value = selectedStart;
    form.elements.rentalDuration.value = String(selectedDuration);
    form.elements.estimatedPrice.value = String(calculatePrice(selectedDuration).value);
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => form.elements.name.focus({ preventScroll: true }), 500);
  });

  renderDays();
  renderDuration();
  renderSlots();
}

const contactForm = document.querySelector('.contact-form');

contactForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const message = form.querySelector('.form-message');
  const submitButton = form.querySelector('button[type="submit"]');
  const setMessage = (text, type) => {
    message.textContent = text;
    message.className = `form-message ${type ? `is-${type}` : ''}`.trim();
  };

  form.classList.add('was-validated');
  if (!form.checkValidity()) {
    setMessage('Uzupe\u0142nij wymagane pola i sprawd\u017a poprawno\u015b\u0107 danych.', 'error');
    form.reportValidity();
    return;
  }

  const formData = new FormData(form);
  if (formData.get('website')) {
    setMessage('Dzi\u0119kujemy! Wiadomo\u015b\u0107 zosta\u0142a przyj\u0119ta.', 'success');
    form.reset();
    return;
  }

  const endpoint = form.dataset.endpoint;
  if (!endpoint) {
    setMessage('Formularz jest gotowy. Wysy\u0142ka zostanie uruchomiona po pod\u0142\u0105czeniu docelowego serwera.', 'info');
    return;
  }

  const payload = Object.fromEntries(formData.entries());
  delete payload.website;
  payload.consent = formData.get('consent') === 'on';

  submitButton.disabled = true;
  form.setAttribute('aria-busy', 'true');
  setMessage('Wysy\u0142amy wiadomo\u015b\u0107\u2026', 'info');

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Contact form request failed');
    setMessage('Dzi\u0119kujemy! Odpowiemy najszybciej, jak to mo\u017cliwe.', 'success');
    form.reset();
    form.classList.remove('was-validated');
  } catch {
    setMessage('Nie uda\u0142o si\u0119 wys\u0142a\u0107 wiadomo\u015bci. Spr\u00f3buj ponownie lub skontaktuj si\u0119 z nami telefonicznie.', 'error');
  } finally {
    submitButton.disabled = false;
    form.removeAttribute('aria-busy');
  }
});
