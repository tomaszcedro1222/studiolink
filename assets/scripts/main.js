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
const lazyVideos = [...document.querySelectorAll('video[data-lazy-video]')];
const servicesMarquee = document.querySelector('.services-marquee');
const uiLanguage = window.StudioLinkI18n?.language || document.documentElement.lang || 'pl';
const ui = (polish, english) => uiLanguage === 'en' ? english : polish;
const trackAnalytics = (eventName, parameters = {}, options = {}) => window.StudioLinkAnalytics?.track(eventName, parameters, options);

const hasMarketingConsent = () => window.Cookiebot?.consent?.marketing === true;
const showCookieSettings = () => {
  if (!window.Cookiebot) return;
  if (window.Cookiebot.hasResponse) window.Cookiebot.renew();
  else window.Cookiebot.show();
};
document.querySelectorAll('[data-cookie-settings]').forEach((button) => button.addEventListener('click', showCookieSettings));

const youtubeProjects = [...document.querySelectorAll('[data-youtube-id]')];
let pendingYoutubeProject;
const pauseYouTubeProject = (project) => {
  const iframe = project.querySelector('iframe');
  if (!iframe?.contentWindow) return;
  iframe.contentWindow.postMessage(JSON.stringify({
    event: 'command',
    func: 'pauseVideo',
    args: [],
  }), '*');
};
const resetYouTubeProject = (project) => {
  project.querySelector('iframe')?.remove();
  project.classList.remove('is-loading','is-loaded');
  delete project.dataset.youtubeLoaded;
};
const loadYouTubeProject = (project) => {
  if (project.dataset.youtubeLoaded) return;
  youtubeProjects.forEach((otherProject) => {
    if (otherProject !== project) resetYouTubeProject(otherProject);
  });
  project.dataset.youtubeLoaded = 'true';
  project.classList.add('is-loading');
  const videoId = project.dataset.youtubeId;
  const iframe = document.createElement('iframe');
  iframe.title = project.dataset.youtubeTitle || ui('Przykładowa realizacja Studio Link', 'Studio Link project example');
  iframe.loading = 'lazy';
  iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
  iframe.allowFullscreen = true;
  iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}&playsinline=1&rel=0&enablejsapi=1`;
  iframe.addEventListener('load', () => {
    project.classList.remove('is-loading');
    project.classList.add('is-loaded');
    if (project.dataset.youtubeVisible === 'false' || document.hidden) pauseYouTubeProject(project);
  }, { once:true });
  project.append(iframe);
};
const activateYouTubeProject = (project) => {
  if (project.dataset.youtubeLoaded) return;
  trackAnalytics('video_open', {
    video_id: project.dataset.youtubeId,
    video_title: project.dataset.youtubeTitle,
    marketing_consent: hasMarketingConsent() ? 'granted' : 'required',
  });
  if (!hasMarketingConsent()) {
    pendingYoutubeProject = project;
    showCookieSettings();
    return;
  }
  loadYouTubeProject(project);
};
const disableYouTubeProjects = () => {
  youtubeProjects.forEach(resetYouTubeProject);
};
youtubeProjects.forEach((project) => {
  project.setAttribute('aria-label', `${ui('Obejrzyj', 'Watch')}: ${project.dataset.youtubeTitle || ui('realizacja Studio Link', 'Studio Link project')}`);
  project.addEventListener('click', (event) => {
    event.preventDefault();
    activateYouTubeProject(project);
  });
});
const syncYouTubeConsent = () => {
  if (hasMarketingConsent() && pendingYoutubeProject) {
    loadYouTubeProject(pendingYoutubeProject);
    pendingYoutubeProject = undefined;
  } else if (!hasMarketingConsent()) {
    pendingYoutubeProject = undefined;
    disableYouTubeProjects();
  }
};
window.addEventListener('CookiebotOnConsentReady', syncYouTubeConsent);
window.addEventListener('CookiebotOnAccept', syncYouTubeConsent);
window.addEventListener('CookiebotOnDecline', syncYouTubeConsent);
if ('IntersectionObserver' in window) {
  const youtubeVisibilityObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.dataset.youtubeVisible = String(entry.isIntersecting);
      if (!entry.isIntersecting) pauseYouTubeProject(entry.target);
    });
  }, { threshold:0.01 });
  youtubeProjects.forEach((project) => youtubeVisibilityObserver.observe(project));
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) youtubeProjects.forEach(pauseYouTubeProject);
});
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

const loadLazyVideo = (video) => {
  if (video.dataset.videoLoaded) return;
  video.querySelectorAll('source[data-src]').forEach((source) => {
    source.src = source.dataset.src;
    delete source.dataset.src;
  });
  video.dataset.videoLoaded = 'true';
  video.load();
};

if (lazyVideos.length) {
  if ('IntersectionObserver' in window) {
    const lazyVideoObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        loadLazyVideo(entry.target);
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '500px 0px' });
    lazyVideos.forEach((video) => lazyVideoObserver.observe(video));
  } else {
    lazyVideos.forEach(loadLazyVideo);
  }
}

autoplayVideos.forEach((video) => {
  video.addEventListener('loadedmetadata', () => playVideo(video), { once:true });
  video.addEventListener('canplay', () => playVideo(video), { once:true });
  document.addEventListener('click', () => playVideo(video), { once: true });
  document.addEventListener('touchstart', () => playVideo(video), { once: true, passive: true });
  if (!video.hasAttribute('data-lazy-video')) playVideo(video);
});

menuButton?.addEventListener('click', () => {
  const open = menu.classList.toggle('is-open');
  document.body.classList.toggle('menu-open', open);
  menuButton.setAttribute('aria-expanded', String(open));
  trackAnalytics('menu_toggle', { menu_state: open ? 'open' : 'closed' });
});

menu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  menu.classList.remove('is-open');
  document.body.classList.remove('menu-open');
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
  let autoplayPaused = false;
  let dragStartX = 0;
  let dragStartScroll = 0;

  if (slides.length < 2) return;

  const pauseAutoplay = () => {
    autoplayPaused = true;
  };

  const cloneSlides = () => slides.map((slide) => {
    const clone = slide.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    clone.querySelectorAll('img').forEach((image) => {
      image.loading = 'eager';
    });
    return clone;
  });
  slides.forEach((slide) => {
    slide.querySelectorAll('img').forEach((image) => {
      image.loading = 'eager';
    });
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
    loopSlides.forEach((slide, index) => {
      slide.classList.toggle('is-active', index === physicalIndex);
      slide.classList.toggle('is-before-active', index === physicalIndex - 1);
      slide.classList.toggle('is-after-active', index === physicalIndex + 1);
    });
  };
  const normalizeLoopPosition = () => {
    const physicalIndex = currentPhysicalIndex();
    let normalizedIndex = physicalIndex;
    if (physicalIndex < slides.length) normalizedIndex = physicalIndex + slides.length;
    if (physicalIndex >= slides.length * 2) normalizedIndex = physicalIndex - slides.length;

    if (normalizedIndex !== physicalIndex) {
      track.classList.add('is-repositioning');
      jumpToPhysicalSlide(normalizedIndex);
      updateDots(normalizedIndex);
      window.requestAnimationFrame(() => {
        track.classList.remove('is-repositioning');
      });
      return;
    }

    updateDots(physicalIndex);
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
    dot.setAttribute('aria-label', `${ui('Slajd', 'Slide')} ${index + 1}`);
    if (index === 0) dot.classList.add('is-active');
    dot.addEventListener('click', () => {
      pauseAutoplay();
      trackAnalytics('scenery_interaction', { interaction_type: 'dot', slide_number: index + 1 });
      goTo(index);
    });
    dots.append(dot);
  });

  carousel.querySelector('.carousel__nav--prev').addEventListener('click', () => {
    pauseAutoplay();
    trackAnalytics('scenery_interaction', { interaction_type: 'arrow', direction: 'previous' });
    animateToPhysicalSlide(currentPhysicalIndex() - 1);
  });
  carousel.querySelector('.carousel__nav--next').addEventListener('click', () => {
    pauseAutoplay();
    trackAnalytics('scenery_interaction', { interaction_type: 'arrow', direction: 'next' });
    animateToPhysicalSlide(currentPhysicalIndex() + 1);
  });
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
    if (Math.abs(event.clientX - dragStartX) > 4) pauseAutoplay();
    track.scrollLeft = dragStartScroll - (event.clientX - dragStartX);
    updateDots();
  });
  track.addEventListener('touchmove', pauseAutoplay, { passive: true });
  track.addEventListener('wheel', pauseAutoplay, { passive: true });
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

  window.setInterval(() => {
    if (autoplayPaused || document.hidden || isAnimating || isDragging) return;
    animateToPhysicalSlide(currentPhysicalIndex() + 1);
  }, 3000);

  requestAnimationFrame(() => {
    jumpToPhysicalSlide(slides.length);
    updateDots(slides.length);
  });
});

let reloadStudioAvailability = null;
let clearStudioBookingSelection = null;
const studioCalendar = document.querySelector('[data-studio-calendar]');

if (studioCalendar) {
  const daysContainer = studioCalendar.querySelector('[data-calendar-days]');
  const slotsContainer = studioCalendar.querySelector('[data-calendar-slots]');
  const calendarNotice = studioCalendar.querySelector('[data-calendar-notice]');
  const waitlistButton = studioCalendar.querySelector('[data-calendar-waitlist]');
  const monthLabel = studioCalendar.querySelector('[data-calendar-month]');
  const selectedDateLabel = studioCalendar.querySelector('[data-calendar-selected-date]');
  const summary = studioCalendar.querySelector('[data-calendar-summary]');
  const summaryDate = studioCalendar.querySelector('[data-calendar-summary-date]');
  const summaryTime = studioCalendar.querySelector('[data-calendar-summary-time]');
  const summaryPrice = studioCalendar.querySelector('[data-calendar-summary-price]');
  const priceLabel = studioCalendar.querySelector('[data-calendar-price]');
  const priceNote = studioCalendar.querySelector('[data-calendar-price-note]');
  const durationButtons = [...studioCalendar.querySelectorAll('[data-calendar-duration]')];
  const prompterCheckbox = studioCalendar.querySelector('[data-calendar-prompter]');
  const previousButton = studioCalendar.querySelector('[data-calendar-prev]');
  const nextButton = studioCalendar.querySelector('[data-calendar-next]');
  const confirmButton = studioCalendar.querySelector('[data-calendar-confirm]');
  const availabilityEndpoint = studioCalendar.dataset.availabilityEndpoint;
  const studioClockFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  });
  const getStudioCalendarDates = () => {
    const parts = Object.fromEntries(studioClockFormatter.formatToParts(new Date())
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]));
    const studioToday = new Date(parts.year, parts.month - 1, parts.day);
    const firstDate = new Date(studioToday);
    firstDate.setDate(firstDate.getDate() + (parts.hour < 14 ? 1 : 2));
    return { studioToday, firstDate };
  };
  let { studioToday: today, firstDate: firstBookableDate } = getStudioCalendarDates();
  let firstAllowedMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  let lastAllowedMonth = new Date(today.getFullYear(), today.getMonth() + 2, 1);
  let displayedMonth = new Date(firstAllowedMonth);
  let selectedDate = null;
  let selectedStart = '';
  let selectedDuration = 3;
  let selectedPrompter = false;
  let unavailableInterestStart = '';
  let availabilityState = 'loading';
  let busyBookings = new Map();
  let availabilityRequestInFlight = false;

  const locale = uiLanguage === 'en' ? 'en-GB' : 'pl-PL';
  const monthFormatter = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
  const fullDateFormatter = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  const summaryDateFormatter = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const interestDateFormatter = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  const priceFormatter = new Intl.NumberFormat(locale, { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 });
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
  const isWorkingDay = (date) => date >= firstBookableDate && date.getDay() !== 0 && date.getDay() !== 6;
  const addHours = (time, hours) => {
    const [hour, minute] = time.split(':').map(Number);
    return `${String(hour + hours).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  };
  const calculatePrice = (hours) => {
    const prompterPrice = selectedPrompter ? 250 : 0;
    if (hours >= 5) {
      const extraHours = hours - 5;
      return {
        value: 2000 + extraHours * 400 + prompterPrice,
        note: `${extraHours === 0 ? ui('pakiet p\u00f3\u0142 dnia \u2022 400 z\u0142/h', 'half-day package \u2022 PLN 400/h') : ui('400 z\u0142/h', 'PLN 400/h')}${selectedPrompter ? ui(' \u2022 prompter +250 z\u0142', ' \u2022 teleprompter +PLN 250') : ''}`,
      };
    }
    return {
      value: hours * 450 + prompterPrice,
      note: `${ui(`${hours} \u00d7 450 z\u0142/h`, `${hours} \u00d7 PLN 450/h`)}${selectedPrompter ? ui(' \u2022 prompter +250 z\u0142', ' \u2022 teleprompter +PLN 250') : ''}`,
    };
  };
  const getBookings = (date) => busyBookings.get(toIsoDate(date)) || [];
  const isSlotAvailable = (date, startMinutes, duration) => {
    const endMinutes = startMinutes + duration * 60;
    return availabilityState === 'ready'
      && date >= firstBookableDate
      && !getBookings(date).some((booking) => startMinutes < booking.end && endMinutes > booking.start);
  };
  const getLastStartMinutes = (duration) => (18 - duration) * 60;
  const getUnavailableInterestStart = (preferredStart, duration) => {
    const earliestStart = 8 * 60;
    const latestStart = getLastStartMinutes(duration);
    const [preferredHour, preferredMinute] = (preferredStart || '08:00').split(':').map(Number);
    const preferredMinutes = Number.isFinite(preferredHour) && Number.isFinite(preferredMinute)
      ? preferredHour * 60 + preferredMinute
      : earliestStart;
    const minutes = Math.min(Math.max(preferredMinutes, earliestStart), latestStart);
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  };
  const hasAvailableSlot = (date, duration) => {
    for (let minutes = 8 * 60; minutes <= getLastStartMinutes(duration); minutes += 30) {
      if (isSlotAvailable(date, minutes, duration)) return true;
    }
    return false;
  };
  const getAvailableDurations = (date) => durationButtons
    .map((button) => Number(button.dataset.calendarDuration))
    .filter((duration) => hasAvailableSlot(date, duration));
  const formatDurationOptions = (durations) => {
    const options = durations.map(String);
    if (options.length < 2) return options[0] || '';
    return `${options.slice(0, -1).join(', ')} ${ui('lub', 'or')} ${options.at(-1)}`;
  };
  const getDurationUnavailableNotice = (date, duration) => {
    const availableDurations = getAvailableDurations(date);
    if (!availableDurations.length) {
      return ui(
        'Tego dnia studio jest ju\u017c zaj\u0119te i nie ma wolnego wariantu wynajmu.',
        'The studio is already booked on this date and no rental option is available.',
      );
    }
    const availableOptions = formatDurationOptions(availableDurations);
    return ui(
      `Tego dnia studio nie jest dost\u0119pne przez ${duration} godz. Mo\u017ce wystarczy Ci kr\u00f3tszy wariant? Dost\u0119pne opcje: ${availableOptions} godz.`,
      `The studio is not available for ${duration} hours on this date. Would a shorter session work? Available options: ${availableOptions} hours.`,
    );
  };
  const setCalendarNotice = (message = '', reason = '') => {
    if (!calendarNotice) return;
    calendarNotice.textContent = message;
    calendarNotice.hidden = !message;
    calendarNotice.dataset.reason = reason;
    if (waitlistButton) {
      waitlistButton.textContent = ui(
        'Poinformuj, jeśli ten termin się zwolni.',
        'Notify me if this time becomes available',
      );
      waitlistButton.hidden = reason !== 'duration' || !selectedDate;
    }
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
    summaryTime.textContent = `${selectedStart}\u2013${addHours(selectedStart, selectedDuration)} (${selectedDuration} ${ui('godz.', 'hrs')})`;
    summaryPrice.textContent = `${ui('Cena', 'Price')}: ${priceFormatter.format(price.value)}${selectedPrompter ? ui(' • z prompterem', ' • with teleprompter') : ''}`;
    summary.hidden = false;
  };

  const renderSlots = () => {
    slotsContainer.replaceChildren();
    selectedDateLabel.textContent = selectedDate
      ? capitalize(fullDateFormatter.format(selectedDate))
      : ui('Wybierz dat\u0119', 'Choose a date');

    if (!selectedDate) {
      const prompt = document.createElement('p');
      prompt.className = 'studio-calendar__empty';
      prompt.textContent = availabilityState === 'loading'
        ? ui('Pobieramy wolne terminy z kalendarza\u2026', 'Loading available times\u2026')
        : availabilityState === 'error'
          ? ui('Nie uda\u0142o si\u0119 pobra\u0107 termin\u00f3w. Spr\u00f3buj ponownie p\u00f3\u017aniej.', 'We could not load availability. Please try again later.')
          : ui('Najpierw wybierz dost\u0119pny dzie\u0144 w kalendarzu.', 'Choose an available date in the calendar first.');
      slotsContainer.append(prompt);
      renderSummary();
      return;
    }

    if (!hasAvailableSlot(selectedDate, selectedDuration)) {
      const prompt = document.createElement('p');
      prompt.className = 'studio-calendar__empty';
      prompt.textContent = ui(
        'Brak dost\u0119pnej godziny rozpocz\u0119cia dla wybranej d\u0142ugo\u015bci.',
        'No start time is available for the selected duration.',
      );
      slotsContainer.append(prompt);
      renderSummary();
      return;
    }

    const lastStartMinutes = getLastStartMinutes(selectedDuration);
    for (let minutes = 8 * 60; minutes <= lastStartMinutes; minutes += 30) {
      const hour = Math.floor(minutes / 60);
      const minute = minutes % 60;
      const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      const button = document.createElement('button');
      const overlapsBooking = !isSlotAvailable(selectedDate, minutes, selectedDuration);
      button.type = 'button';
      button.className = 'studio-calendar__slot';
      button.textContent = time;
      button.disabled = overlapsBooking;
      button.setAttribute('aria-label', overlapsBooking ? `${time}, ${ui('termin niedost\u0119pny', 'time unavailable')}` : `${time}, ${ui('wybierz godzin\u0119 rozpocz\u0119cia', 'choose start time')}`);
      button.setAttribute('aria-pressed', String(selectedStart === time));
      button.classList.toggle('is-selected', selectedStart === time);
      button.addEventListener('click', () => {
        selectedStart = time;
        setCalendarNotice();
        trackAnalytics('booking_time_selected', {
          start_time: time,
          rental_duration: selectedDuration,
          value: calculatePrice(selectedDuration).value,
          currency: 'PLN',
        });
        renderSlots();
      });
      slotsContainer.append(button);
    }
    renderSummary();
  };

  const selectDate = (date) => {
    selectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    selectedStart = '';
    unavailableInterestStart = '';
    setCalendarNotice();
    trackAnalytics('booking_date_selected', {
      days_ahead: Math.round((selectedDate.getTime() - today.getTime()) / 86400000),
      weekday: selectedDate.getDay(),
    });
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
      button.setAttribute('aria-label', `${capitalize(fullDateFormatter.format(date))}${available ? '' : `, ${ui('niedost\u0119pny', 'unavailable')}`}`);
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
    trackAnalytics('booking_month_changed', { direction: 'previous' });
    renderDays();
  });
  nextButton.addEventListener('click', () => {
    displayedMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + 1, 1);
    trackAnalytics('booking_month_changed', { direction: 'next' });
    renderDays();
  });
  durationButtons.forEach((button) => button.addEventListener('click', () => {
    const previousStart = selectedStart;
    selectedDuration = Number(button.dataset.calendarDuration);
    selectedStart = '';
    if (selectedDate && !hasAvailableSlot(selectedDate, selectedDuration)) {
      unavailableInterestStart = getUnavailableInterestStart(previousStart || unavailableInterestStart, selectedDuration);
      setCalendarNotice(getDurationUnavailableNotice(selectedDate, selectedDuration), 'duration');
    } else {
      unavailableInterestStart = '';
      setCalendarNotice();
    }
    trackAnalytics('booking_duration_selected', {
      rental_duration: selectedDuration,
      value: calculatePrice(selectedDuration).value,
      currency: 'PLN',
    });
    renderDuration();
    renderDays();
    renderSlots();
  }));
  prompterCheckbox?.addEventListener('change', () => {
    selectedPrompter = prompterCheckbox.checked;
    trackAnalytics('booking_prompter_changed', {
      prompter_needed: selectedPrompter,
      value: calculatePrice(selectedDuration).value,
      currency: 'PLN',
    });
    renderDuration();
    renderSummary();
  });

  const loadAvailability = async ({ silent = false } = {}) => {
    if (availabilityRequestInFlight) return;
    availabilityRequestInFlight = true;
    if (!silent) {
      availabilityState = 'loading';
      renderDays();
      renderSlots();
    }

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
      trackAnalytics('calendar_availability_loaded', { status: 'success' });
      const selectedSlotBecameUnavailable = Boolean(selectedDate && selectedStart && (() => {
        const [hour, minute] = selectedStart.split(':').map(Number);
        return !isSlotAvailable(selectedDate, hour * 60 + minute, selectedDuration);
      })());
      if (selectedSlotBecameUnavailable) {
        unavailableInterestStart = getUnavailableInterestStart(selectedStart, selectedDuration);
        selectedStart = '';
        setCalendarNotice(ui(
          'Wybrany termin został właśnie zarezerwowany. Wybierz inną godzinę.',
          'The selected time has just been booked. Please choose another start time.',
        ), 'conflict');
        document.dispatchEvent(new CustomEvent('studio-booking-conflict'));
      } else if (selectedDate && !hasAvailableSlot(selectedDate, selectedDuration)) {
        unavailableInterestStart = getUnavailableInterestStart(selectedStart || unavailableInterestStart, selectedDuration);
        selectedStart = '';
        setCalendarNotice(getDurationUnavailableNotice(selectedDate, selectedDuration), 'duration');
      } else if (calendarNotice?.dataset.reason === 'duration') {
        setCalendarNotice();
      }
    } catch {
      if (!silent) {
        busyBookings = new Map();
        availabilityState = 'error';
        trackAnalytics('calendar_availability_loaded', { status: 'error' });
        selectedDate = null;
        selectedStart = '';
      }
    } finally {
      availabilityRequestInFlight = false;
    }

    if (!silent || availabilityState === 'ready') {
      renderDays();
      renderSlots();
    }
  };
  const refreshStudioCalendarClock = () => {
    const { studioToday, firstDate } = getStudioCalendarDates();
    if (sameDay(studioToday, today) && sameDay(firstDate, firstBookableDate)) return;
    today = studioToday;
    firstBookableDate = firstDate;
    firstAllowedMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    lastAllowedMonth = new Date(today.getFullYear(), today.getMonth() + 2, 1);
    if (displayedMonth < firstAllowedMonth) displayedMonth = new Date(firstAllowedMonth);
    if (selectedDate && !isWorkingDay(selectedDate)) {
      selectedDate = null;
      selectedStart = '';
    }
    loadAvailability();
  };
  reloadStudioAvailability = loadAvailability;
  clearStudioBookingSelection = () => {
    selectedStart = '';
    renderSlots();
  };
  waitlistButton?.addEventListener('click', () => {
    if (!selectedDate || calendarNotice?.dataset.reason !== 'duration') return;
    const form = document.querySelector('.contact-form');
    const messageField = form?.elements.message;
    if (!form || !messageField) return;
    const requestedStart = unavailableInterestStart || getUnavailableInterestStart('', selectedDuration);
    const formattedDate = interestDateFormatter.format(selectedDate);
    const durationLabel = ui(
      `${selectedDuration} ${selectedDuration === 3 || selectedDuration === 4 ? 'godziny' : 'godzin'}`,
      `${selectedDuration} hours`,
    );
    messageField.value = ui(
      `Interesuje mnie wynajem studia ${formattedDate} od godz. ${requestedStart} na ${durationLabel}. Termin jest obecnie niedostępny. Proszę o informację, jeśli się zwolni.`,
      `I am interested in renting the studio on ${formattedDate} from ${requestedStart} for ${durationLabel}. This time is currently unavailable. Please let me know if it becomes available.`,
    );
    ['preferredDate', 'preferredTime', 'rentalDuration', 'estimatedPrice', 'prompterNeeded'].forEach((name) => {
      if (form.elements[name]) form.elements[name].value = '';
    });
    form.querySelector('[data-contact-booking]')?.setAttribute('hidden', '');
    form.classList.remove('was-validated');
    form.querySelector('.form-message').textContent = '';
    trackAnalytics('calendar_waitlist_clicked', {
      requested_date: toIsoDate(selectedDate),
      requested_start: requestedStart,
      rental_duration: selectedDuration,
    });
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => messageField.focus({ preventScroll: true }), 500);
  });
  confirmButton.addEventListener('click', () => {
    if (!selectedDate || !selectedStart) return;
    const form = document.querySelector('.contact-form');
    if (!form) return;
    form.elements.preferredDate.value = toIsoDate(selectedDate);
    form.elements.preferredTime.value = selectedStart;
    form.elements.rentalDuration.value = String(selectedDuration);
    form.elements.prompterNeeded.value = selectedPrompter ? '1' : '0';
    const price = calculatePrice(selectedDuration);
    trackAnalytics('booking_details_confirmed', {
      rental_duration: selectedDuration,
      start_time: selectedStart,
      days_ahead: Math.round((selectedDate.getTime() - today.getTime()) / 86400000),
      value: price.value,
      currency: 'PLN',
    });
    form.elements.estimatedPrice.value = String(price.value);
    const bookingPreview = form.querySelector('[data-contact-booking]');
    bookingPreview.querySelector('[data-contact-booking-date]').textContent = capitalize(summaryDateFormatter.format(selectedDate));
    bookingPreview.querySelector('[data-contact-booking-time]').textContent = `${selectedStart}\u2013${addHours(selectedStart, selectedDuration)} (${selectedDuration} ${ui('godz.', 'hrs')})`;
    bookingPreview.querySelector('[data-contact-booking-price]').textContent = `${ui('Koszt wynajmu', 'Rental price')}: ${priceFormatter.format(price.value)}${selectedPrompter ? ui(' • z prompterem', ' • with teleprompter') : ''}`;
    bookingPreview.hidden = false;
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => form.elements.name.focus({ preventScroll: true }), 500);
  });

  renderDays();
  renderDuration();
  renderSlots();
  loadAvailability();
  window.setInterval(() => loadAvailability({ silent: true }), 60 * 1000);
  window.setInterval(refreshStudioCalendarClock, 60 * 1000);
}

const contactForm = document.querySelector('.contact-form');
const contactBookingPreview = contactForm?.querySelector('[data-contact-booking]');
const clearContactBookingSelection = () => {
  if (!contactForm || !contactBookingPreview) return;
  ['preferredDate', 'preferredTime', 'rentalDuration', 'estimatedPrice', 'prompterNeeded'].forEach((name) => {
    contactForm.elements[name].value = '';
  });
  contactBookingPreview.hidden = true;
  clearStudioBookingSelection?.();
};

contactBookingPreview?.querySelector('[data-contact-booking-remove]')?.addEventListener('click', () => {
  trackAnalytics('booking_details_removed');
  clearContactBookingSelection();
  contactForm.querySelector('.form-message').textContent = '';
});

document.addEventListener('studio-booking-conflict', () => {
  clearContactBookingSelection();
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

  const hasBooking = Boolean(form.elements.preferredDate?.value && form.elements.preferredTime?.value);
  const rentalDuration = Number(form.elements.rentalDuration?.value) || undefined;
  const estimatedValue = Number(form.elements.estimatedPrice?.value) || undefined;
  trackAnalytics('form_submit_attempt', {
    form_name: 'contact',
    includes_booking: hasBooking,
    rental_duration: rentalDuration,
    value: estimatedValue,
    currency: estimatedValue ? 'PLN' : undefined,
  });

  form.classList.add('was-validated');
  if (!form.checkValidity()) {
    const invalidFields = [...form.elements]
      .filter((field) => field.willValidate && !field.validity.valid)
      .map((field) => field.name)
      .filter(Boolean);
    trackAnalytics('form_validation_error', {
      form_name: 'contact',
      invalid_field_count: invalidFields.length,
      invalid_fields: invalidFields.join(','),
    });
    setMessage(ui('Uzupe\u0142nij wymagane pola i sprawd\u017a poprawno\u015b\u0107 danych.', 'Complete the required fields and check that the details are correct.'), 'error');
    form.reportValidity();
    return;
  }

  const formData = new FormData(form);
  if (formData.get('website')) {
    setMessage(ui('Dzi\u0119kujemy! Wiadomo\u015b\u0107 zosta\u0142a przyj\u0119ta.', 'Thank you! Your message has been received.'), 'success');
    form.reset();
    clearContactBookingSelection();
    return;
  }

  const endpoint = form.dataset.endpoint;
  if (!endpoint) {
    setMessage(ui('Formularz jest gotowy. Wysy\u0142ka zostanie uruchomiona po pod\u0142\u0105czeniu docelowego serwera.', 'The form is ready. Sending will be enabled once the production server is connected.'), 'info');
    return;
  }

  const payload = Object.fromEntries(formData.entries());
  delete payload.website;
  payload.consent = formData.get('consent') === 'on';

  submitButton.disabled = true;
  form.setAttribute('aria-busy', 'true');
  setMessage(ui('Wysy\u0142amy wiadomo\u015b\u0107\u2026', 'Sending your message\u2026'), 'info');

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
    const leadEvent = responseData.booked ? 'booking_request' : 'generate_lead';
    trackAnalytics(leadEvent, {
      form_name: 'contact',
      includes_booking: Boolean(responseData.booked),
      rental_duration: rentalDuration,
      value: estimatedValue,
      currency: estimatedValue ? 'PLN' : undefined,
    }, {
      meta: responseData.booked
        ? { name: 'Schedule', parameters: { value: estimatedValue, currency: 'PLN' } }
        : { name: 'Lead', parameters: { content_name: 'contact_form' } },
    });
    setMessage(responseData.booked
      ? ui('Termin zosta\u0142 zapisany w kalendarzu. Skontaktujemy si\u0119 z Tob\u0105, aby potwierdzi\u0107 szczeg\u00f3\u0142y.', 'Your time has been added to the calendar. We will contact you to confirm the details.')
      : ui('Dzi\u0119kujemy! Odpowiemy najszybciej, jak to mo\u017cliwe.', 'Thank you! We will reply as soon as possible.'), 'success');
    form.reset();
    clearContactBookingSelection();
    form.classList.remove('was-validated');
    if (responseData.booked) reloadStudioAvailability?.();
  } catch (error) {
    trackAnalytics('form_error', {
      form_name: 'contact',
      includes_booking: hasBooking,
      error_code: error.code || 'request_failed',
    });
    if (error.code === 'slot_unavailable') {
      setMessage(ui('Ten termin zosta\u0142 w\u0142a\u015bnie zaj\u0119ty. Wr\u00f3\u0107 do kalendarza i wybierz inny.', 'This time has just been booked. Return to the calendar and choose another one.'), 'error');
      clearContactBookingSelection();
      reloadStudioAvailability?.();
    } else if (error.code === 'booking_rate_limited') {
      setMessage(ui('Wys\u0142ano ju\u017c rezerwacj\u0119 z tego urz\u0105dzenia. Odczekaj kilka minut albo zadzwo\u0144 do nas.', 'A booking has already been sent from this device. Wait a few minutes or call us.'), 'error');
    } else if (error.code === 'calendar_unavailable') {
      setMessage(ui('Kalendarz jest chwilowo niedost\u0119pny. Spr\u00f3buj ponownie p\u00f3\u017aniej lub skontaktuj si\u0119 z nami telefonicznie.', 'The calendar is temporarily unavailable. Try again later or call us.'), 'error');
    } else {
      setMessage(ui('Nie uda\u0142o si\u0119 wys\u0142a\u0107 wiadomo\u015bci. Spr\u00f3buj ponownie lub skontaktuj si\u0119 z nami telefonicznie.', 'We could not send your message. Try again or call us.'), 'error');
    }
  } finally {
    submitButton.disabled = false;
    form.removeAttribute('aria-busy');
  }
});
