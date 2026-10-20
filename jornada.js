/* Início: a jornada (lavoura → sede → mesa) e o caderno de contas.

   A jornada é uma sequência de quadros em WebP desenhada num canvas conforme a
   rolagem. Os quadros vêm de quatro trechos gerados na Higgsfield a partir de
   quadros-chave (marketing/conteudo/_imagens-geradas/site-jornada-2026-10-19/).
   Duas versões: d/ (16:9) e m/ (recorte 9:16 pro celular em pé).

   Peso: o celular de fazenda em 4G manda. Os quadros carregam espaçados
   primeiro (de 16 em 16) e vão se completando; a rolagem funciona desde o
   começo, só fica mais "picada" até tudo chegar. Com Save-Data ou rede 2G
   carrega só de 8 em 8. Com movimento reduzido não carrega nada: a seção fica
   nas três telas estáticas que o HTML já traz. */
(function () {
  var reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ================================================================ jornada */
  var sec = document.querySelector('.jornada');
  if (sec) iniciarJornada(sec);

  function iniciarJornada(sec) {
    var total = parseInt(sec.getAttribute('data-quadros'), 10) || 0;
    if (reduz || total < 2 || !window.HTMLCanvasElement) return;

    var conexao = navigator.connection || {};
    var economia = !!conexao.saveData || /(^|slow-)2g/.test(conexao.effectiveType || '');
    var emPe = window.matchMedia('(max-aspect-ratio: 4/5)').matches;
    var pasta = sec.getAttribute('data-base') + (emPe ? 'm/' : 'd/');
    var versao = sec.getAttribute('data-versao') || '';

    var canvas = sec.querySelector('.jornada__tela');
    var ctx = canvas.getContext('2d', { alpha: false });
    var poster = sec.querySelector('.jornada__poster');
    var capitulos = Array.prototype.slice.call(sec.querySelectorAll('.capitulo'));
    var trilho = Array.prototype.slice.call(sec.querySelectorAll('.jornada__trilho li'));

    var quadros = new Array(total);
    var prontos = new Uint8Array(total);
    var largura = 0, altura = 0;

    sec.classList.add('is-viva');

    function nomeDo(i) {
      return pasta + String(i + 1).padStart(4, '0') + '.webp' + (versao ? '?v=' + versao : '');
    }

    /* ----------------------------------------------- carga em passadas */
    var fila = [];
    var passos = economia ? [8] : [16, 8, 4, 2, 1];
    var vistos = new Uint8Array(total);
    passos.forEach(function (passo) {
      for (var i = 0; i < total; i += passo) {
        if (!vistos[i]) { vistos[i] = 1; fila.push(i); }
      }
    });
    if (!vistos[total - 1]) fila.splice(1, 0, total - 1);

    var emVoo = 0;
    var MAX_EM_VOO = economia ? 2 : 6;
    function carregarMais() {
      while (emVoo < MAX_EM_VOO && fila.length) {
        (function (i) {
          emVoo++;
          var img = new Image();
          img.decoding = 'async';
          img.onload = function () {
            quadros[i] = img;
            prontos[i] = 1;
            emVoo--;
            if (i === 0) agendar();
            else if (Math.abs(i - posAtual) < 3) agendar();
            carregarMais();
          };
          img.onerror = function () { emVoo--; carregarMais(); };
          img.src = nomeDo(i);
        })(fila.shift());
      }
    }

    /* --------------------------------------------------------- desenho */
    function medir() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      largura = canvas.clientWidth;
      altura = canvas.clientHeight;
      canvas.width = Math.round(largura * dpr);
      canvas.height = Math.round(altura * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingQuality = 'high';
    }

    /* No computador o quadro 16:9 sobra dos lados numa tela 16:10: encosta à
       esquerda, e a sede (que já vem um pouco à direita no quadro) fica livre do
       título. No celular o recorte 9:16 já vem centrado no assunto. */
    var ALINHA_X = emPe ? 0.5 : 0;
    function pintar(img, alfa) {
      var esc = Math.max(largura / img.naturalWidth, altura / img.naturalHeight);
      var w = img.naturalWidth * esc;
      var h = img.naturalHeight * esc;
      ctx.globalAlpha = alfa;
      ctx.drawImage(img, (largura - w) * ALINHA_X, (altura - h) / 2, w, h);
    }

    function vizinhoAbaixo(i) { while (i >= 0 && !prontos[i]) i--; return i; }
    function vizinhoAcima(i) { while (i < total && !prontos[i]) i++; return i < total ? i : -1; }

    var posAtual = 0;
    var desenhouAlgum = false;
    function desenhar(pos) {
      var base = Math.floor(pos);
      var a = vizinhoAbaixo(base);
      var b = vizinhoAcima(base + 1);
      if (a < 0 && b < 0) return;
      if (a < 0) { pintar(quadros[b], 1); }
      else if (b < 0 || b === a) { pintar(quadros[a], 1); }
      else {
        /* mistura entre os dois quadros carregados mais próximos */
        var t = (pos - a) / (b - a);
        pintar(quadros[a], 1);
        if (t > 0.01) pintar(quadros[b], t);
      }
      ctx.globalAlpha = 1;
      if (!desenhouAlgum) {
        desenhouAlgum = true;
        if (poster) poster.classList.add('is-oculto');
      }
    }

    /* ----------------------------------------------------- capítulos */
    function suave(a, b, x) {
      var t = Math.min(1, Math.max(0, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    }
    var faixas = capitulos.map(function (c) {
      return { el: c, de: parseFloat(c.getAttribute('data-de')), ate: parseFloat(c.getAttribute('data-ate')) };
    });

    function atualizarCapitulos(p) {
      faixas.forEach(function (f, n) {
        var entra = f.de <= 0 ? 1 : suave(f.de - 0.04, f.de + 0.03, p);
        var sai = 1 - suave(f.ate - 0.03, f.ate + 0.04, p);
        var o = entra * sai;
        f.el.style.opacity = o.toFixed(3);
        f.el.style.transform = 'translateY(' + ((1 - entra) * 34 - (1 - sai) * 34).toFixed(1) + 'px)';
        f.el.classList.toggle('is-ativo', o > 0.02);
        if (trilho[n]) {
          var proximo = faixas[n + 1] ? faixas[n + 1].de : 1;
          var enchido = Math.min(1, Math.max(0, (p - f.de) / (proximo - f.de)));
          trilho[n].style.setProperty('--enchido', (enchido * 100).toFixed(1) + '%');
          trilho[n].classList.toggle('is-ativo', p >= f.de && p < proximo);
        }
      });
    }

    /* ------------------------------------------------------ rolagem */
    /* o pouso na página em branco já está nos quadros (câmera virtual em
       montar_jornada2.py), então aqui não há zoom de CSS */
    var agendado = false;
    var visivel = true;
    var parado = 0;

    function quadro() {
      agendado = false;
      var r = sec.getBoundingClientRect();
      var curso = sec.offsetHeight - window.innerHeight;
      var p = curso > 0 ? Math.min(1, Math.max(0, -r.top / curso)) : 0;
      posAtual = p * (total - 1);
      desenhar(posAtual);
      /* rolagem parou no meio de dois quadros: assenta no mais próximo, senão
         a mistura deixa imagem dupla parada na tela */
      clearTimeout(parado);
      parado = setTimeout(function () { desenhar(Math.round(posAtual)); }, 160);
      atualizarCapitulos(p);
      sec.classList.toggle('ja-rolou', p > 0.015);
    }
    function agendar() {
      if (!agendado && visivel) { agendado = true; requestAnimationFrame(quadro); }
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        visivel = es[0].isIntersecting;
        if (visivel) agendar();
      }).observe(sec);
    }

    medir();
    carregarMais();
    quadro();
    window.addEventListener('scroll', agendar, { passive: true });
    window.addEventListener('resize', function () { medir(); agendar(); });
  }

  /* ================================================================ caderno */
  var folha = document.getElementById('folha');
  if (folha) iniciarCaderno(folha);

  function iniciarCaderno(folha) {
    var linhas = Array.prototype.slice.call(folha.querySelectorAll('[data-passo]'));
    var passos = Array.prototype.slice.call(document.querySelectorAll('.caderno__passos .passo'));
    /* observa o cartão, não o bloco alto que o contém: a linha só se escreve
       quando o cartão dela está na tela */
    var cartoes = passos.map(function (p) { return p.querySelector('.passo__cartao') || p; });
    var maior = 0;

    function escreverAte(n) {
      if (n <= maior) return;
      maior = n;
      linhas.forEach(function (l) {
        if (parseInt(l.getAttribute('data-passo'), 10) <= n) l.classList.add('is-escrita');
      });
    }

    if (reduz || !('IntersectionObserver' in window)) {
      escreverAte(99);
      passos.forEach(function (p) { p.classList.add('is-ativo'); });
    } else {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          var passo = e.target.closest('.passo') || e.target;
          var n = parseInt(passo.getAttribute('data-passo'), 10);
          if (e.isIntersecting) {
            passos.forEach(function (p) { p.classList.toggle('is-ativo', p === passo); });
            escreverAte(n);
          }
        });
      }, {
        /* no celular a folha ocupa o alto da tela: o passo vale quando o cartão
           está na metade de baixo, onde ele aparece inteiro */
        rootMargin: window.matchMedia('(max-width: 900px)').matches ? '-62% 0px -14% 0px' : '-45% 0px -45% 0px'
      });
      cartoes.forEach(function (c) { io.observe(c); });
    }

    /* ---------------------------------------- "usar os meus números" */
    var botao = document.getElementById('folha-editar');
    var zap = document.getElementById('folha-zap');
    var modo = document.getElementById('folha-modo');
    var aviso = document.getElementById('folha-aviso');
    var campos = {};
    var reais = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
    var num = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
    var UNIDADE = { area: 'ha', sacas: 'sc/ha' };
    var PREFIXO = { preco: 'R$', custo: 'R$', parcelas: 'R$' };

    function lerNumero(txt) {
      var limpo = String(txt).replace(/[^\d,.-]/g, '');
      if (limpo.indexOf(',') !== -1) limpo = limpo.replace(/\./g, '').replace(',', '.');
      else if (/\.\d{3}($|\.)/.test(limpo)) limpo = limpo.replace(/\./g, '');
      var v = parseFloat(limpo);
      return isFinite(v) ? v : 0;
    }

    function valores() {
      var v = {};
      Object.keys(campos).forEach(function (k) { v[k] = lerNumero(campos[k].value); });
      return v;
    }

    function recalcular() {
      var v = valores();
      var entra = v.area * v.sacas * v.preco;
      var custo = v.area * v.custo;
      var sobra = entra - custo - v.parcelas;
      var emSacas = v.preco > 0 ? Math.abs(sobra) / v.preco : 0;

      folha.querySelector('[data-saida="entra"]').textContent = 'R$ ' + reais.format(entra);
      folha.querySelector('[data-saida="sobra"]').textContent = (sobra < 0 ? '− ' : '') + 'R$ ' + reais.format(Math.abs(sobra));
      folha.querySelector('[data-saida="sacas"]').textContent =
        Math.round(sobra) === 0 ? 'Fechou no zero.' : (sobra < 0 ? 'Faltam ' : 'Sobram ') + reais.format(Math.round(emSacas)) + ' sacas.';

      var frase = 'Olá, Lucas. Fiz a conta no site: ' + num.format(v.area) + ' ha, ' + num.format(v.sacas) +
        ' sc/ha, saca a R$ ' + reais.format(v.preco) + ', custo de R$ ' + reais.format(v.custo) +
        '/ha e R$ ' + reais.format(v.parcelas) + ' de parcelas no ano. Pela conta, ' +
        (sobra < 0 ? 'faltam R$ ' : 'sobram R$ ') + reais.format(Math.abs(sobra)) + '. Queria conversar.';
      zap.href = 'https://wa.me/5564992086744?text=' + encodeURIComponent(frase);
    }

    if (botao) {
      botao.addEventListener('click', function () {
        if (folha.getAttribute('data-modo') === 'meus') {
          var primeiro = folha.querySelector('.folha__campo');
          if (primeiro) primeiro.focus();
          return;
        }
        folha.setAttribute('data-modo', 'meus');
        escreverAte(99);
        folha.querySelectorAll('[data-campo]').forEach(function (alvo) {
          var chave = alvo.getAttribute('data-campo');
          var input = document.createElement('input');
          input.className = 'folha__campo';
          input.type = 'text';
          input.inputMode = 'decimal';
          input.autocomplete = 'off';
          input.value = reais.format(parseFloat(alvo.getAttribute('data-exemplo')));
          input.setAttribute('aria-label', alvo.closest('.folha__linha').querySelector('.folha__rotulo').textContent +
            (UNIDADE[chave] ? ' (' + UNIDADE[chave] + ')' : ' (R$)'));
          /* largura do tamanho do número (onde field-sizing não existe) */
          var ajustar = function () { input.style.width = (Math.max(2, input.value.length) + 0.4) + 'ch'; };
          ajustar();
          input.addEventListener('input', function () { ajustar(); recalcular(); });
          input.addEventListener('focus', function () { input.select(); });
          campos[chave] = input;

          var caixa = document.createElement('span');
          caixa.className = 'folha__caixa' + (alvo.classList.contains('folha__valor') ? ' folha__valor' : '');
          if (PREFIXO[chave]) caixa.appendChild(document.createTextNode(PREFIXO[chave] + ' '));
          caixa.appendChild(input);
          if (UNIDADE[chave]) {
            var u = document.createElement('span');
            u.className = 'folha__unidade';
            u.textContent = UNIDADE[chave];
            caixa.appendChild(u);
          }
          alvo.replaceWith(caixa);
        });
        if (modo) modo.textContent = 'A sua conta';
        if (aviso) aviso.textContent = 'Os números ficam só no seu aparelho. Custo por hectare; parcelas somadas no ano.';
        botao.textContent = 'Editar os números';
        recalcular();
        campos.area.focus();
        var topo = folha.getBoundingClientRect().top + window.scrollY - 90;
        if (folha.getBoundingClientRect().top < 0) window.scrollTo({ top: topo, behavior: 'smooth' });
      });
    }
  }
})();
