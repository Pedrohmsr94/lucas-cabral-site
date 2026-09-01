/* Landings do Google Ads — comportamento compartilhado.
   Cada página só declara `data-origem` no <form>; o resto é igual. */
(function () {
  var LEADS_API_URL = 'https://lucas-cabral-painel.vercel.app/api/leads';

  /* ------------------------------------------------- Rastreio de origem */

  /* O anúncio chega com ?utm_source=...&utm_content=<criativo>. O payload já
     manda a URL inteira em `landing_page`, mas se a pessoa navegar entre
     páginas antes de preencher, a query se perde — então o primeiro toque
     fica guardado na sessão e volta no envio. */
  var CHAVES_RASTREIO = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'];

  try {
    var params = new URLSearchParams(window.location.search);
    var toque = [];
    CHAVES_RASTREIO.forEach(function (chave) {
      var valor = params.get(chave);
      if (valor) toque.push(chave + '=' + valor);
    });
    if (toque.length && !sessionStorage.getItem('lc_rastreio')) {
      sessionStorage.setItem('lc_rastreio', toque.join('&'));
    }
  } catch (e) { /* navegação privada sem sessionStorage: segue sem rastreio */ }

  /* ---------------------------------------------------------- Formulário */

  var leadForm = document.getElementById('leadForm');

  if (leadForm) {
    leadForm.addEventListener('submit', function (event) {
      event.preventDefault();

      var feedback = document.getElementById('leadFormFeedback');
      var submitButton = leadForm.querySelector('button[type="submit"]');
      var formData = new FormData(leadForm);

      /* O /api/leads do painel só aceita nome, telefone, origem, landing_page
         e mensagem. Todo campo extra da LP (cidade, se já foi citado, área,
         situação) entra rotulado dentro de `mensagem` — senão o dado se perde
         no caminho e o Lucas liga sem saber nada do caso. */
      var extras = [];
      leadForm.querySelectorAll('[data-rotulo]').forEach(function (field) {
        var valor = (formData.get(field.name) || '').toString().trim();
        if (valor) extras.push(field.getAttribute('data-rotulo') + ': ' + valor);
      });

      try {
        var rastreio = sessionStorage.getItem('lc_rastreio');
        if (rastreio) extras.push('Origem do clique: ' + rastreio);
      } catch (e) { /* sem sessionStorage, o landing_page ainda carrega a URL atual */ }

      var payload = {
        nome: (formData.get('nome') || '').toString().trim(),
        telefone: (formData.get('telefone') || '').toString().trim(),
        origem: leadForm.getAttribute('data-origem') || 'landing',
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
          /* Evento de conversão: o GTM transforma isso em Lead (Pixel) e
             gerar_lead (GA4). Só dispara em envio aceito pelo painel. */
          window.dataLayer = window.dataLayer || [];
          try {
            window.dataLayer.push({
              event: 'lead_enviado',
              origem: payload.origem,
              rastreio: sessionStorage.getItem('lc_rastreio') || '',
            });
          } catch (e) {
            window.dataLayer.push({ event: 'lead_enviado', origem: payload.origem });
          }
          leadForm.reset();
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

  /* ------------------------------------------------------- Header e hero */

  var header = document.querySelector('.header');
  var heroBg = document.getElementById('heroBg');
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var heroHasImage = heroBg && heroBg.querySelector('img');

  function onScroll() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 40);
    if (heroHasImage && !prefersReducedMotion) {
      heroBg.style.transform = 'translateY(' + Math.min(window.scrollY * 0.3, 200) + 'px)';
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ------------------------------------------------------- Reveal ao rolar */

  var revealEls = document.querySelectorAll('.reveal');

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

    /* O atraso conta a posição dentro do próprio bloco, não da página: assim
       os três cartões de uma seção entram em cascata, e a seção seguinte
       recomeça do zero em vez de herdar um atraso cada vez maior. */
    revealEls.forEach(function (el) {
      var irmaos = el.parentNode ? el.parentNode.children : [el];
      var pos = Array.prototype.indexOf.call(irmaos, el);
      el.style.transitionDelay = Math.min(pos, 4) * 80 + 'ms';
      observer.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

  /* --------------------------------------------- Barra fixa depois do hero */

  var barraFixa = document.getElementById('stickyCta');
  var hero = document.getElementById('hero');

  if (barraFixa && hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(
      function (entries) {
        barraFixa.classList.toggle('is-visivel', !entries[0].isIntersecting);
      },
      { threshold: 0 }
    ).observe(hero);
  } else if (barraFixa) {
    barraFixa.classList.add('is-visivel');
  }
})();
