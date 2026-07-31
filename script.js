(function () {
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var navToggle = document.querySelector('.header__toggle');
  var nav = document.querySelector('.header__nav');
  if (navToggle && nav) {
    navToggle.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  var parallaxTargets = document.querySelectorAll('.masthead__bg img, .page-banner__bg img');
  if (parallaxTargets.length && !prefersReducedMotion) {
    var onScroll = function () {
      var offset = Math.min(window.scrollY * 0.25, 160);
      parallaxTargets.forEach(function (img) {
        img.style.transform = 'translateY(' + offset + 'px)';
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function getGroupId(el) {
    var container = el.closest('.grid, .index-list, .method-list, .values-row, .footer__grid') || el.parentElement;
    if (!container.dataset.revealGroupId) {
      container.dataset.revealGroupId = 'g' + Math.random().toString(36).slice(2);
    }
    return container.dataset.revealGroupId;
  }

  var groupCounters = {};
  var revealEls = document.querySelectorAll('.reveal');
  revealEls.forEach(function (el) {
    var groupId = getGroupId(el);
    var index = groupCounters[groupId] || 0;
    groupCounters[groupId] = index + 1;
    el.style.transitionDelay = (index % 4) * 90 + 'ms';
  });

  if ('IntersectionObserver' in window && !prefersReducedMotion) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    revealEls.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add('is-visible');
    });
  }
})();
