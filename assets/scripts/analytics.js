(() => {
  const language = () => window.StudioLinkI18n?.language || document.documentElement.lang || 'pl';
  const deviceType = () => window.innerWidth <= 700 ? 'mobile' : 'desktop';
  const clean = (parameters = {}) => Object.fromEntries(
    Object.entries(parameters).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
  const track = (eventName, parameters = {}, options = {}) => {
    const eventParameters = clean({
      site_language: language(),
      device_type: deviceType(),
      page_type: window.location.pathname.endsWith('/privacy.html') ? 'privacy' : 'home',
      ...parameters,
    });

    if (typeof window.gtag === 'function') window.gtag('event', eventName, eventParameters);
    else {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: eventName, ...eventParameters });
    }

    if (options.meta && typeof window.fbq === 'function') {
      const method = options.meta.standard === false ? 'trackCustom' : 'track';
      window.fbq(method, options.meta.name, clean(options.meta.parameters || eventParameters));
    }

    window.dispatchEvent(new CustomEvent('studioLinkAnalyticsEvent', {
      detail: { event: eventName, parameters: eventParameters },
    }));
  };

  const locationOf = (element) => {
    if (element.closest('.hero')) return 'hero';
    if (element.closest('.menu')) return 'navigation';
    if (element.closest('.facilities')) return 'facilities';
    if (element.closest('.pricing')) return 'pricing';
    if (element.closest('.desktop-quick-actions')) return 'desktop_floating';
    if (element.matches('.mobile-booking-cta,.mobile-phone-cta')) return 'mobile_floating';
    if (element.closest('.booking')) return 'booking';
    if (element.closest('.contact')) return 'contact';
    if (element.closest('.footer')) return 'footer';
    return 'other';
  };

  window.StudioLinkAnalytics = { track };
  track('site_view');

  const trackConsent = () => track('consent_update', {
    analytics_consent: window.Cookiebot?.consent?.statistics ? 'granted' : 'denied',
    marketing_consent: window.Cookiebot?.consent?.marketing ? 'granted' : 'denied',
    preferences_consent: window.Cookiebot?.consent?.preferences ? 'granted' : 'denied',
  });
  window.addEventListener('CookiebotOnAccept', trackConsent);
  window.addEventListener('CookiebotOnDecline', trackConsent);

  document.addEventListener('click', (event) => {
    const target = event.target.closest('a,button');
    if (!target) return;
    const href = target.matches('a') ? (target.getAttribute('href') || '') : '';
    const placement = locationOf(target);

    if (target.matches('[data-cookie-settings]')) {
      track('cookie_settings_open', { cta_location: placement });
      return;
    }
    if (target.matches('[data-language]')) return;
    if (href.startsWith('tel:')) {
      track('phone_click', { cta_location: placement }, { meta: { name: 'Contact', parameters: { contact_method: 'phone' } } });
      return;
    }
    if (href.startsWith('mailto:')) {
      track('email_click', { cta_location: placement }, { meta: { name: 'Contact', parameters: { contact_method: 'email' } } });
      return;
    }
    if (href === '#rezerwacja') {
      track('cta_click', { cta_name: 'booking', cta_location: placement });
      return;
    }
    if (href === '#kontakt' || href === '#oferta') {
      track('cta_click', { cta_name: 'contact', cta_location: placement });
      return;
    }
    if (target.closest('.menu') && href.startsWith('#')) {
      track('navigation_click', { destination: href.slice(1), cta_location: placement });
      return;
    }
    if (target.closest('.footer__socials')) {
      track('social_click', { network: target.getAttribute('aria-label')?.toLowerCase() || 'unknown' });
      return;
    }
    if (target.matches('.contact-card__address')) track('map_click', { cta_location: placement });
  }, true);

  const observedSections = new WeakSet();
  if ('IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || observedSections.has(entry.target)) return;
        observedSections.add(entry.target);
        track('section_view', { section_name: entry.target.id });
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.35 });
    ['cennik', 'kontakt', 'rezerwacja', 'realizacje'].forEach((id) => {
      const section = document.getElementById(id);
      if (section) sectionObserver.observe(section);
    });
  }

  const reachedDepths = new Set();
  let scrollScheduled = false;
  const measureScroll = () => {
    scrollScheduled = false;
    const maximum = document.documentElement.scrollHeight - window.innerHeight;
    if (maximum <= 0) return;
    const depth = Math.round((window.scrollY / maximum) * 100);
    [25, 50, 75, 90].forEach((threshold) => {
      if (depth < threshold || reachedDepths.has(threshold)) return;
      reachedDepths.add(threshold);
      track('scroll_depth', { percent_scrolled: threshold });
    });
  };
  window.addEventListener('scroll', () => {
    if (scrollScheduled) return;
    scrollScheduled = true;
    window.requestAnimationFrame(measureScroll);
  }, { passive: true });

  const contactForm = document.querySelector('.contact-form');
  contactForm?.addEventListener('focusin', () => {
    if (contactForm.dataset.analyticsStarted) return;
    contactForm.dataset.analyticsStarted = 'true';
    track('form_start', { form_name: 'contact' });
  });
})();
