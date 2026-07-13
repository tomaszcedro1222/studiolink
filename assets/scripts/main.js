const menuButton = document.querySelector('.menu-button');
const menu = document.querySelector('.menu');

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

  const goTo = (index) => slides[index]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  slides.forEach((_, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', `Slajd ${index + 1}`);
    if (index === 0) dot.classList.add('is-active');
    dot.addEventListener('click', () => goTo(index));
    dots.append(dot);
  });

  const currentIndex = () => Math.round(track.scrollLeft / (slides[0].getBoundingClientRect().width + parseFloat(getComputedStyle(track).gap || 0)));
  carousel.querySelector('.carousel__nav--prev').addEventListener('click', () => goTo(Math.max(0, currentIndex() - 1)));
  carousel.querySelector('.carousel__nav--next').addEventListener('click', () => goTo(Math.min(slides.length - 1, currentIndex() + 1)));
  track.addEventListener('scroll', () => {
    const active = Math.max(0, Math.min(slides.length - 1, currentIndex()));
    dots.querySelectorAll('button').forEach((dot, index) => dot.classList.toggle('is-active', index === active));
  }, { passive: true });
});

document.querySelector('.newsletter__form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const message = event.currentTarget.nextElementSibling;
  message.textContent = 'Dziękujemy! Skontaktujemy się z Tobą.';
  event.currentTarget.reset();
});
