/* Broker Toolkit — Main JS */
(function () {
  'use strict';

  // Mobile nav toggle
  const hamburger = document.querySelector('.nav-hamburger');
  const navLinks = document.querySelector('.nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', function () {
      navLinks.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', navLinks.classList.contains('open'));
    });
    // Close on link click
    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        navLinks.classList.remove('open');
      });
    });
  }

  // Scroll-based nav background — starts transparent, solidifies on scroll
  const nav = document.querySelector('nav');
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

  // Fade-in on scroll
  const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
  const fadeObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in-visible');
        fadeObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.feature-card, .pricing-card, .feature-detail, .screenshot-frame').forEach(function (el) {
    el.classList.add('fade-in');
    fadeObserver.observe(el);
  });

  // Add fade-in CSS dynamically
  var style = document.createElement('style');
  style.textContent = '.fade-in{opacity:0;transform:translateY(20px);transition:opacity .6s ease,transform .6s ease}.fade-in-visible{opacity:1;transform:translateY(0)}';
  document.head.appendChild(style);
})();
