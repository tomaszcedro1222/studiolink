const menuButton = document.querySelector('.menu-button');
const menu = document.querySelector('.menu');
const mobileBookingCta = document.querySelector('.mobile-booking-cta');
const mobilePhoneCta = document.querySelector('.mobile-phone-cta');
const desktopQuickActions = document.querySelector('.desktop-quick-actions');
const heroSection = document.querySelector('.hero');
const bookingSection = document.querySelector('#rezerwacja');
const newsletterSection = document.querySelector('.newsletter');
const clientsSection = document.querySelector('.clients');
const autoplayVideos = [...document.querySelectorAll('video[autoplay]')];
const servicesMarquee = document.querySelector('.services-marquee');

const COOKIE_CONSENT_KEY = 'studioLinkCookieConsent';
const readCookieConsent = () => {
  try { return window.localStorage.getItem(COOKIE_CONSENT_KEY); } catch { return null; }
};
const saveCookieConsent = (value) => {
  try { window.localStorage.setItem(COOKIE_CONSENT_KEY, value); } catch {}
  document.documentElement.dataset.cookieConsent = value;
  window.dispatchEvent(new CustomEvent('studioLinkCookieConsent', { detail: { value } }));
};
const closeCookieBanner = (banner) => {
  banner.classList.remove('is-visible');
  document.body.classList.remove('cookie-consent-open');
  window.setTimeout(() => banner.remove(), 300);
};
const showCookieBanner = () => {
  document.querySelector('.cookie-banner')?.remove();
  const banner = document.createElement('section');
  banner.className = 'cookie-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-modal', 'true');
  banner.setAttribute('aria-labelledby', 'cookie-banner-title');
  banner.innerHTML = `
    <h2 id="cookie-banner-title">Twoja prywatność</h2>
    <p>Używamy pamięci przeglądarki do zapisania Twojego wyboru. Obecnie nie korzystamy z cookies analitycznych ani reklamowych. <a href="privacy.html#cookies">Dowiedz się więcej</a>.</p>
    <div class="cookie-banner__actions">
      <button type="button" data-cookie-choice="essential">Tylko niezbędne</button>
      <button class="is-primary" type="button" data-cookie-choice="all">Akceptuję wszystkie</button>
    </div>`;
  document.body.append(banner);
  document.body.classList.add('cookie-consent-open');
  window.requestAnimationFrame(() => banner.classList.add('is-visible'));
  banner.querySelectorAll('[data-cookie-choice]').forEach((button) => button.addEventListener('click', () => {
    saveCookieConsent(button.dataset.cookieChoice);
    closeCookieBanner(banner);
  }));
};

const storedCookieConsent = readCookieConsent();
if (storedCookieConsent) saveCookieConsent(storedCookieConsent);
else showCookieBanner();
document.querySelectorAll('[data-cookie-settings]').forEach((button) => button.addEventListener('click', showCookieBanner));
let desktopScrollFrame;

const cancelDesktopScroll = () => {
  if (!desktopScrollFrame) return;
  cancelAnimationFrame(desktopScrollFrame);
  desktopScrollFrame = null;
};

const animateDesktopScroll = (target) => {
  cancelDesktopScroll();
  const scrollingElement = document.scrollingElement || document.documentElement;
  const startPosition = scrollingElement.scrollTop;
  const targetPosition = Math.max(0, target.getBoundingClientRect().top + startPosition);
  const distance = targetPosition - startPosition;
  if (Math.abs(distance) < 2) return;

  const duration = Math.min(850, Math.max(520, Math.abs(distance) * 0.16));
  const startTime = performance.now();
  const step = (currentTime) => {
    const progress = Math.min((currentTime - startTime) / duration, 1);
    const easedProgress = 1 - Math.pow(1 - progress, 3);
    scrollingElement.scrollTop = startPosition + distance * easedProgress;
    if (progress < 1) desktopScrollFrame = requestAnimationFrame(step);
    else desktopScrollFrame = null;
  };

  desktopScrollFrame = requestAnimationFrame(step);
};

window.addEventListener('wheel', cancelDesktopScroll, { passive: true });

document.addEventListener('click', (event) => {
  if (window.innerWidth <= 700 || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;

  const hash = link.getAttribute('href');
  if (!hash || hash === '#') return;

  let target;
  try {
    target = document.querySelector(hash);
  } catch {
    return;
  }
  if (!target) return;

  event.preventDefault();
  history.pushState(null, '', hash);
  animateDesktopScroll(target);
});

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
  const visibleBookingSections = new Set(heroSection ? [heroSection] : []);
  const bookingVisibilityObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) visibleBookingSections.add(entry.target);
      else visibleBookingSections.delete(entry.target);
    });
    const shouldHide = visibleBookingSections.size > 0;
    mobileBookingCta.classList.toggle('is-hidden', shouldHide);
    mobilePhoneCta?.classList.toggle('is-hidden', shouldHide);
  }, { threshold: 0.08 });
  if (heroSection) bookingVisibilityObserver.observe(heroSection);
  bookingVisibilityObserver.observe(bookingSection);
  if (newsletterSection) bookingVisibilityObserver.observe(newsletterSection);
}

if (desktopQuickActions && heroSection && bookingSection && 'IntersectionObserver' in window) {
  const hiddenBySections = new Set([heroSection]);
  const quickActionsVisibilityObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) hiddenBySections.add(entry.target);
      else hiddenBySections.delete(entry.target);
    });
    desktopQuickActions.classList.toggle('is-hidden', hiddenBySections.size > 0);
  }, { threshold:0.08 });
  quickActionsVisibilityObserver.observe(heroSection);
  quickActionsVisibilityObserver.observe(bookingSection);
  if (newsletterSection) quickActionsVisibilityObserver.observe(newsletterSection);
}

if (servicesMarquee) {
  const firstGroup = servicesMarquee.querySelector('.services-marquee__group');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const automaticSpeed = 0.025;
  let dragging = false;
  let lastPointerX = 0;
  let lastPointerTime = 0;
  let lastFrame = performance.now();
  let currentSpeed = automaticSpeed;
  let marqueePosition = 0;

  const wrapMarquee = () => {
    const loopWidth = firstGroup?.offsetWidth || 0;
    if (!loopWidth) return;
    if (marqueePosition >= loopWidth * 2) marqueePosition -= loopWidth;
    else if (marqueePosition <= 0) marqueePosition += loopWidth;
    servicesMarquee.scrollLeft = marqueePosition;
  };
  const moveMarquee = (time) => {
    const elapsed = Math.min(time - lastFrame, 40);
    if (!reducedMotion && !dragging) {
      const easing = 1 - Math.exp(-elapsed / 650);
      currentSpeed += (automaticSpeed - currentSpeed) * easing;
      marqueePosition += elapsed * currentSpeed;
      wrapMarquee();
    }
    lastFrame = time;
    requestAnimationFrame(moveMarquee);
  };
  const finishDrag = (event) => {
    if (!dragging) return;
    dragging = false;
    if (performance.now() - lastPointerTime > 80) currentSpeed = 0;
    servicesMarquee.classList.remove('is-dragging');
    if (servicesMarquee.hasPointerCapture?.(event.pointerId)) servicesMarquee.releasePointerCapture(event.pointerId);
    wrapMarquee();
  };

  servicesMarquee.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    dragging = true;
    marqueePosition = servicesMarquee.scrollLeft;
    lastPointerX = event.clientX;
    lastPointerTime = performance.now();
    servicesMarquee.classList.add('is-dragging');
    servicesMarquee.setPointerCapture?.(event.pointerId);
  });
  servicesMarquee.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const now = performance.now();
    const elapsed = Math.max(now - lastPointerTime, 1);
    const distance = lastPointerX - event.clientX;
    marqueePosition += distance;
    currentSpeed = Math.max(-1.8, Math.min(1.8, distance / elapsed));
    lastPointerX = event.clientX;
    lastPointerTime = now;
    wrapMarquee();
  });
  servicesMarquee.addEventListener('pointerup', finishDrag);
  servicesMarquee.addEventListener('pointercancel', finishDrag);
  requestAnimationFrame(() => {
    marqueePosition = firstGroup?.offsetWidth || 0;
    servicesMarquee.scrollLeft = marqueePosition;
  });
  requestAnimationFrame(moveMarquee);
}

const playVideo = (video) => {
  video.muted = true;
  video.defaultMuted = true;
  const playback = video.play();
  if (playback) playback.catch(() => {});
};

autoplayVideos.forEach((video) => {
  video.addEventListener('loadedmetadata', () => playVideo(video), { once:true });
  video.addEventListener('canplay', () => playVideo(video), { once:true });
  document.addEventListener('click', () => playVideo(video), { once: true });
  document.addEventListener('touchstart', () => playVideo(video), { once: true, passive: true });
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
  let isDragging = false;
  let dragStartX = 0;
  let dragStartScroll = 0;

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
  track.addEventListener('dragstart', (event) => event.preventDefault());
  track.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    window.cancelAnimationFrame(animationFrame);
    window.clearTimeout(scrollEndTimer);
    isAnimating = false;
    isDragging = true;
    dragStartX = event.clientX;
    dragStartScroll = track.scrollLeft;
    track.style.scrollSnapType = 'none';
    track.classList.add('is-dragging');
    track.setPointerCapture?.(event.pointerId);
  });
  track.addEventListener('pointermove', (event) => {
    if (!isDragging) return;
    track.scrollLeft = dragStartScroll - (event.clientX - dragStartX);
    updateDots();
  });
  const finishCarouselDrag = (event) => {
    if (!isDragging) return;
    isDragging = false;
    track.classList.remove('is-dragging');
    if (track.hasPointerCapture?.(event.pointerId)) track.releasePointerCapture(event.pointerId);
    animateToPhysicalSlide(currentPhysicalIndex());
  };
  track.addEventListener('pointerup', finishCarouselDrag);
  track.addEventListener('pointercancel', finishCarouselDrag);
  track.addEventListener('scroll', () => {
    updateDots();
    if (isAnimating || isDragging) return;
    window.clearTimeout(scrollEndTimer);
    scrollEndTimer = window.setTimeout(normalizeLoopPosition, 220);
  }, { passive: true });

  requestAnimationFrame(() => jumpToPhysicalSlide(slides.length));
});

let reloadStudioAvailability = null;
let clearStudioBookingSelection = null;
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
  const availabilityEndpoint = studioCalendar.dataset.availabilityEndpoint;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstAllowedMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastAllowedMonth = new Date(today.getFullYear(), today.getMonth() + 2, 1);
  let displayedMonth = new Date(firstAllowedMonth);
  let selectedDate = null;
  let selectedStart = '';
  let selectedDuration = 3;
  let availabilityState = 'loading';
  let busyBookings = new Map();

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
  const getBookings = (date) => busyBookings.get(toIsoDate(date)) || [];
  const isSlotAvailable = (date, startMinutes, duration) => {
    const endMinutes = startMinutes + duration * 60;
    return availabilityState === 'ready'
      && !getBookings(date).some((booking) => startMinutes < booking.end && endMinutes > booking.start);
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
      prompt.textContent = availabilityState === 'loading'
        ? 'Pobieramy wolne terminy z kalendarza\u2026'
        : availabilityState === 'error'
          ? 'Nie uda\u0142o si\u0119 pobra\u0107 termin\u00f3w. Spr\u00f3buj ponownie p\u00f3\u017aniej.'
          : 'Najpierw wybierz dost\u0119pny dzie\u0144 w kalendarzu.';
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
      const available = availabilityState === 'ready'
        && isWorkingDay(date)
        && hasAvailableSlot(date, selectedDuration);
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

  const loadAvailability = async () => {
    availabilityState = 'loading';
    renderDays();
    renderSlots();

    try {
      if (!availabilityEndpoint) throw new Error('Missing availability endpoint');
      const lastAllowedDay = new Date(lastAllowedMonth.getFullYear(), lastAllowedMonth.getMonth() + 1, 0);
      const endpointUrl = new URL(availabilityEndpoint, window.location.href);
      endpointUrl.searchParams.set('from', toIsoDate(today));
      endpointUrl.searchParams.set('to', toIsoDate(lastAllowedDay));
      const response = await fetch(endpointUrl, { headers: { Accept: 'application/json' } });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok || !Array.isArray(data.busy)) {
        throw new Error('Availability request failed');
      }

      const nextBusyBookings = new Map();
      data.busy.forEach((booking) => {
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(booking.date)
          || !Number.isFinite(booking.start)
          || !Number.isFinite(booking.end)
        ) return;
        if (!nextBusyBookings.has(booking.date)) nextBusyBookings.set(booking.date, []);
        nextBusyBookings.get(booking.date).push({ start: booking.start, end: booking.end });
      });
      busyBookings = nextBusyBookings;
      availabilityState = 'ready';
      if (selectedDate && !hasAvailableSlot(selectedDate, selectedDuration)) {
        selectedDate = null;
        selectedStart = '';
      } else if (selectedDate && selectedStart) {
        const [hour, minute] = selectedStart.split(':').map(Number);
        if (!isSlotAvailable(selectedDate, hour * 60 + minute, selectedDuration)) selectedStart = '';
      }
    } catch {
      busyBookings = new Map();
      availabilityState = 'error';
      selectedDate = null;
      selectedStart = '';
    }

    renderDays();
    renderSlots();
  };
  reloadStudioAvailability = loadAvailability;
  clearStudioBookingSelection = () => {
    selectedStart = '';
    renderSlots();
  };
  confirmButton.addEventListener('click', () => {
    if (!selectedDate || !selectedStart) return;
    const form = document.querySelector('.contact-form');
    if (!form) return;
    form.elements.preferredDate.value = toIsoDate(selectedDate);
    form.elements.preferredTime.value = selectedStart;
    form.elements.rentalDuration.value = String(selectedDuration);
    const price = calculatePrice(selectedDuration);
    form.elements.estimatedPrice.value = String(price.value);
    const bookingPreview = form.querySelector('[data-contact-booking]');
    bookingPreview.querySelector('[data-contact-booking-date]').textContent = capitalize(summaryDateFormatter.format(selectedDate));
    bookingPreview.querySelector('[data-contact-booking-time]').textContent = `${selectedStart}\u2013${addHours(selectedStart, selectedDuration)} (${selectedDuration} godz.)`;
    bookingPreview.querySelector('[data-contact-booking-price]').textContent = `Koszt wynajmu: ${priceFormatter.format(price.value)}`;
    bookingPreview.hidden = false;
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => form.elements.name.focus({ preventScroll: true }), 500);
  });

  renderDays();
  renderDuration();
  renderSlots();
  loadAvailability();
}

const contactForm = document.querySelector('.contact-form');
const contactBookingPreview = contactForm?.querySelector('[data-contact-booking]');
const clearContactBookingSelection = () => {
  if (!contactForm || !contactBookingPreview) return;
  ['preferredDate', 'preferredTime', 'rentalDuration', 'estimatedPrice'].forEach((name) => {
    contactForm.elements[name].value = '';
  });
  contactBookingPreview.hidden = true;
  clearStudioBookingSelection?.();
};

contactBookingPreview?.querySelector('[data-contact-booking-remove]')?.addEventListener('click', () => {
  clearContactBookingSelection();
  contactForm.querySelector('.form-message').textContent = '';
});

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
    clearContactBookingSelection();
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
    const responseData = await response.json().catch(() => ({}));
    if (!response.ok) {
      const requestError = new Error('Contact form request failed');
      requestError.code = responseData.code || '';
      throw requestError;
    }
    setMessage(responseData.booked
      ? 'Termin zosta\u0142 zapisany w kalendarzu. Skontaktujemy si\u0119 z Tob\u0105, aby potwierdzi\u0107 szczeg\u00f3\u0142y.'
      : 'Dzi\u0119kujemy! Odpowiemy najszybciej, jak to mo\u017cliwe.', 'success');
    form.reset();
    clearContactBookingSelection();
    form.classList.remove('was-validated');
    if (responseData.booked) reloadStudioAvailability?.();
  } catch (error) {
    if (error.code === 'slot_unavailable') {
      setMessage('Ten termin zosta\u0142 w\u0142a\u015bnie zaj\u0119ty. Wr\u00f3\u0107 do kalendarza i wybierz inny.', 'error');
      clearContactBookingSelection();
      reloadStudioAvailability?.();
    } else if (error.code === 'booking_rate_limited') {
      setMessage('Wys\u0142ano ju\u017c rezerwacj\u0119 z tego urz\u0105dzenia. Odczekaj kilka minut albo zadzwo\u0144 do nas.', 'error');
    } else if (error.code === 'calendar_unavailable') {
      setMessage('Kalendarz jest chwilowo niedost\u0119pny. Spr\u00f3buj ponownie p\u00f3\u017aniej lub skontaktuj si\u0119 z nami telefonicznie.', 'error');
    } else {
      setMessage('Nie uda\u0142o si\u0119 wys\u0142a\u0107 wiadomo\u015bci. Spr\u00f3buj ponownie lub skontaktuj si\u0119 z nami telefonicznie.', 'error');
    }
  } finally {
    submitButton.disabled = false;
    form.removeAttribute('aria-busy');
  }
});
