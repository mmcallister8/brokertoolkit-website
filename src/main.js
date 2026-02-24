/* Broker Toolkit — Main JS */
(function () {
  'use strict';

  // Mobile nav toggle with hamburger/X swap
  var hamburger = document.querySelector('.nav-hamburger');
  var navLinks = document.querySelector('.nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', function () {
      var isOpen = navLinks.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', isOpen);
      // Swap hamburger ↔ X
      hamburger.innerHTML = isOpen
        ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
        : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
    });
    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        navLinks.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        hamburger.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
      });
    });
  }

  // Scroll-based nav background
  var nav = document.querySelector('nav');
  if (nav) {
    function updateNav() {
      if (window.scrollY > 50) {
        nav.classList.add('nav-scrolled');
      } else {
        nav.classList.remove('nav-scrolled');
      }
    }
    updateNav();
    window.addEventListener('scroll', updateNav, { passive: true });
  }

  // Fade-in on scroll with staggered delays for grids
  var observerOptions = { threshold: 0.1, rootMargin: '0px 0px -40px 0px' };
  var fadeObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in-visible');
        fadeObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Apply fade-in to key elements
  var fadeTargets = document.querySelectorAll('.feature-card, .pricing-card, .feature-detail, .screenshot-frame, .section-header, .cta-bar, .cta-content, .comparison-table, .section-explore-tools');
  fadeTargets.forEach(function (el) {
    el.classList.add('fade-in');
    fadeObserver.observe(el);
  });

  // Add staggered delays to cards in grids
  document.querySelectorAll('.features-grid').forEach(function (grid) {
    var cards = grid.querySelectorAll('.feature-card');
    cards.forEach(function (card, i) {
      if (i < 4) card.classList.add('delay-' + (i + 1));
    });
  });
})();
