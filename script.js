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
  /* ------------------------------------------------ formulário de contato */
  /* Mesmo destino das landings: o /api/leads do painel. O HTML original
     apontava pra um Formspree que nunca foi configurado — quem enviava,
     enviava pro nada. A API só aceita nome, telefone, origem, landing_page e
     mensagem, então os campos extras entram rotulados na mensagem, junto com
     a origem do clique e o referenciador guardados pelo rastreamento.js. */
  var LEADS_API_URL = 'https://lucas-cabral-painel.vercel.app/api/leads';
  var contatoForm = document.getElementById('contatoForm');

  if (contatoForm) {
    contatoForm.addEventListener('submit', function (event) {
      event.preventDefault();

      var feedback = document.getElementById('contatoFormFeedback');
      var submitButton = contatoForm.querySelector('button[type="submit"]');
      var formData = new FormData(contatoForm);

      /* Campo-isca preenchido = robô. Finge sucesso e não manda nada. */
      if ((formData.get('site') || '').toString().trim()) {
        contatoForm.reset();
        if (feedback) {
          feedback.className = 'form__feedback is-ok';
          feedback.textContent = 'Recebemos seus dados.';
        }
        return;
      }

      var extras = [];
      contatoForm.querySelectorAll('[data-rotulo]').forEach(function (field) {
        var valor = field.tagName === 'SELECT' && field.selectedIndex >= 0
          ? field.options[field.selectedIndex].text
          : (formData.get(field.name) || '').toString();
        valor = valor.trim();
        if (valor) extras.push(field.getAttribute('data-rotulo') + ': ' + valor);
      });

      try {
        var rastreio = sessionStorage.getItem('lc_rastreio');
        var ref = sessionStorage.getItem('lc_ref');
        if (rastreio) extras.push('Origem do clique: ' + rastreio);
        if (ref) extras.push('Referência: ' + ref);
      } catch (e) { /* sem sessionStorage, o landing_page ainda carrega a URL atual */ }

      var payload = {
        nome: (formData.get('nome') || '').toString().trim(),
        telefone: (formData.get('telefone') || '').toString().trim(),
        origem: contatoForm.getAttribute('data-origem') || 'site-contato',
        landing_page: window.location.href,
        mensagem: extras.join('\n') || null,
      };

      if (submitButton) submitButton.disabled = true;
      if (feedback) {
        feedback.className = 'form__feedback';
        feedback.textContent = 'Enviando...';
      }

      fetch(LEADS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(function (response) {
          if (!response.ok) throw new Error('Falha no envio');
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({ event: 'lead_enviado', origem: payload.origem });
          contatoForm.reset();
          if (feedback) {
            feedback.className = 'form__feedback is-ok';
            feedback.textContent =
              'Recebemos seus dados. O escritório entra em contato pelo telefone que você informou.';
          }
        })
        .catch(function () {
          if (feedback) {
            feedback.className = 'form__feedback is-error';
            feedback.textContent =
              'Não foi possível enviar agora. Tente novamente em instantes ou chame no WhatsApp.';
          }
        })
        .finally(function () {
          if (submitButton) submitButton.disabled = false;
        });
    });
  }

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
