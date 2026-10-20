(function () {
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('js');

  /* -------------------------------------------------------------- menu */
  var navToggle = document.querySelector('.header__toggle');
  var nav = document.querySelector('.header__nav');
  if (navToggle && nav) {
    var fechar = function () {
      nav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.setAttribute('aria-label', 'Abrir menu');
      document.body.classList.remove('menu-aberto');
    };
    navToggle.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      navToggle.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
      document.body.classList.toggle('menu-aberto', isOpen);
    });
    nav.addEventListener('click', function (ev) { if (ev.target.closest('a')) fechar(); });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') fechar(); });
  }

  /* ------------------------------------- cabeçalho, WhatsApp fixo, zoom */
  var header = document.querySelector('.header');
  var zapFixo = document.querySelector('.zap-fixo');
  /* onde a tela já tem botão de WhatsApp (caderno, fechamento, contato) o fixo sai */
  var semZap = Array.prototype.slice.call(document.querySelectorAll('[data-sem-zap], .footer'));
  var zooms = Array.prototype.slice.call(document.querySelectorAll('.zoom-lento, .page-banner'));
  var fileiras = Array.prototype.slice.call(document.querySelectorAll('.fileiras'));
  var agendado = false;

  var aoRolar = function () {
    agendado = false;
    var y = window.scrollY;
    var h = window.innerHeight;
    if (header) {
      /* sobre a jornada e a capa o cabeçalho fica transparente; sólido depois delas */
      var capa = document.querySelector('.jornada, .page-banner');
      var solido = capa ? capa.getBoundingClientRect().bottom < 80 : y > 40;
      header.classList.toggle('is-solido', solido);
    }

    if (zapFixo) {
      var passouTopo = y > h * 0.9;
      var temOutro = semZap.some(function (el) {
        var r = el.getBoundingClientRect();
        return r.top < h * 0.9 && r.bottom > h * 0.1;
      });
      zapFixo.classList.toggle('is-visivel', passouTopo && !temOutro);
    }

    if (!prefersReducedMotion) {
      zooms.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > h) return;
        /* 1.12 ao entrar por baixo, 1.0 ao sair por cima */
        var p = Math.min(1, Math.max(0, (h - r.top) / (h + r.height)));
        el.style.setProperty('--zoom', (1.12 - p * 0.12).toFixed(4));
      });
      fileiras.forEach(function (el) {
        el.style.setProperty('--fileiras-x', (-y * 0.15).toFixed(1) + 'px');
      });
    }
  };
  var agendar = function () {
    if (!agendado) { agendado = true; requestAnimationFrame(aoRolar); }
  };
  window.addEventListener('scroll', agendar, { passive: true });
  window.addEventListener('resize', agendar);
  aoRolar();

  /* ------------------------------------------------ vídeo de ambiente
     O vídeo de capa só baixa quando aparece na tela, e nunca com economia de
     dados ou movimento reduzido: aí fica o pôster, que já está no HTML. */
  var conexao = navigator.connection || {};
  var economia = !!conexao.saveData || /(^|slow-)2g/.test(conexao.effectiveType || '');
  var videos = Array.prototype.slice.call(document.querySelectorAll('video.video-ambiente[data-video]'));
  if (videos.length && !prefersReducedMotion && !economia && 'IntersectionObserver' in window) {
    var emPe = window.matchMedia('(max-aspect-ratio: 4/5)').matches;
    var ioVideo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var v = entry.target;
        if (entry.isIntersecting) {
          if (!v.getAttribute('src')) {
            v.src = (emPe && v.getAttribute('data-video-m')) || v.getAttribute('data-video');
          }
          var tocar = v.play();
          if (tocar && tocar.catch) tocar.catch(function () { /* autoplay negado: fica o pôster */ });
        } else if (!v.paused) {
          v.pause();
        }
      });
    }, { threshold: 0.05 });
    videos.forEach(function (v) { ioVideo.observe(v); });
  }

  function getGroupId(el) {
    var container = el.closest('.grid, .index-list, .method-list, .footer__grid, .radar-lista, .frentes, .metodo') || el.parentElement;
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
        cidade_estado: (formData.get('cidade') || '').toString().trim() || null,
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

  /* ------------------------------------------------- linha do tempo (Sobre)
     A linha dourada é desenhada pelo scroll e cada marco acende quando ela
     chega nele. Só cresce: rolar de volta não apaga o que já foi contado,
     senão a página pisca. Sem JS o CSS já nasce com a linha cheia. */
  var timeline = document.querySelector('.timeline');
  if (timeline) {
    var marcos = timeline.querySelectorAll('.timeline__item');
    timeline.classList.add('is-live');

    if (prefersReducedMotion) {
      marcos.forEach(function (marco) { marco.classList.add('is-reached'); });
      timeline.style.setProperty('--linha', '1');
    } else {
      var ANCORA = 0.62; /* altura da tela em que o "agora" da história passa */
      var maxProgresso = 0;
      var agendadoLinha = false;

      var desenhar = function () {
        agendadoLinha = false;
        var caixa = timeline.getBoundingClientRect();
        var linhaDaTela = window.innerHeight * ANCORA;
        var progresso = (linhaDaTela - caixa.top) / caixa.height;
        maxProgresso = Math.max(maxProgresso, Math.min(1, progresso));
        timeline.style.setProperty('--linha', maxProgresso.toFixed(4));

        marcos.forEach(function (marco) {
          if (marco.classList.contains('is-reached')) return;
          if (marco.getBoundingClientRect().top + 14 <= linhaDaTela) {
            marco.classList.add('is-reached');
          }
        });
      };

      var aoRolarLinha = function () {
        if (!agendadoLinha) {
          agendadoLinha = true;
          requestAnimationFrame(desenhar);
        }
      };

      window.addEventListener('scroll', aoRolarLinha, { passive: true });
      window.addEventListener('resize', aoRolarLinha);
      desenhar();
    }
  }

  /* ------------------------------------------------- revelação e faixas */
  var revealEls = document.querySelectorAll('.reveal, .faixas');
  revealEls.forEach(function (el) {
    if (!el.classList.contains('reveal')) return;
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
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
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
