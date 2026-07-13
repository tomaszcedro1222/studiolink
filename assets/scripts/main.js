const menuButton = document.querySelector('.menu-button');
const menu = document.querySelector('.menu');
const segmentedVideos = [...document.querySelectorAll('video[data-loop-start]')];

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
    const caption = item.querySelector('figcaption')?.textContent.trim() || `zdjęcie ${index + 1}`;
    item.tabIndex = 0;
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', `Powiększ: ${caption}`);
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
    setMessage('Uzupełnij wymagane pola i sprawdź poprawność danych.', 'error');
    form.reportValidity();
    return;
  }

  const formData = new FormData(form);
  if (formData.get('website')) {
    setMessage('Dziękujemy! Wiadomość została przyjęta.', 'success');
    form.reset();
    return;
  }

  const endpoint = form.dataset.endpoint;
  if (!endpoint) {
    setMessage('Formularz jest gotowy. Wysyłka zostanie uruchomiona po podłączeniu docelowego serwera.', 'info');
    return;
  }

  const payload = Object.fromEntries(formData.entries());
  delete payload.website;
  payload.consent = formData.get('consent') === 'on';

  submitButton.disabled = true;
  form.setAttribute('aria-busy', 'true');
  setMessage('Wysyłamy wiadomość…', 'info');

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Contact form request failed');
    setMessage('Dziękujemy! Odpowiemy najszybciej, jak to możliwe.', 'success');
    form.reset();
    form.classList.remove('was-validated');
  } catch {
    setMessage('Nie udało się wysłać wiadomości. Spróbuj ponownie lub skontaktuj się z nami telefonicznie.', 'error');
  } finally {
    submitButton.disabled = false;
    form.removeAttribute('aria-busy');
  }
});
