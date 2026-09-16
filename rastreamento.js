/* Rastreamento do site e das landings — um arquivo só, incluído em toda página.
   Preencher os IDs abaixo quando as contas existirem (ver
   marketing/campanhas/meta-ads-2026-08-31/plano-rastreamento.md no MazyOS).
   Com os IDs vazios o arquivo não carrega nada de fora: só monta o dataLayer
   e marca os cliques de WhatsApp/telefone, então pode ir pro ar antes deles. */
(function () {
  var GTM_ID = 'GTM-TC595VV3'; /* container único (criado 09/09/2026, conta no e-mail
     de marketing do Lucas). Pixel 1374710610974005 e GA4 vivem DENTRO dele — não
     colar o snippet do GTM à mão em página nenhuma, senão carrega duas vezes. */

  window.dataLayer = window.dataLayer || [];

  /* ------------------------------------------------------ primeiro toque */
  /* Guarda, uma vez por sessão, de onde a pessoa veio. 'lc_rastreio' leva os
     UTM/click IDs da primeira URL (mesmo formato que landings/script.js já
     usava — quem gravar primeiro vale). 'lc_ref' leva o referenciador e a
     página de entrada: é o que separa orgânico (instagram, google sem UTM,
     whatsapp) de acesso direto quando não há UTM nenhuma. Os formulários do
     site e das landings anexam os dois à mensagem do lead. */
  try {
    var params = new URLSearchParams(location.search);
    var chaves = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'];
    var toque = [];
    chaves.forEach(function (k) { var v = params.get(k); if (v) toque.push(k + '=' + v); });
    if (toque.length && !sessionStorage.getItem('lc_rastreio')) {
      sessionStorage.setItem('lc_rastreio', toque.join('&'));
    }
    if (!sessionStorage.getItem('lc_ref')) {
      var ref = '';
      try { ref = document.referrer ? new URL(document.referrer).host : ''; } catch (e) { ref = document.referrer || ''; }
      sessionStorage.setItem('lc_ref', (ref || 'direto') + ' -> ' + location.pathname);
    }
  } catch (e) { /* navegação privada sem sessionStorage: segue sem rastreio */ }

  /* ---------------------------------------------------------------- GTM */
  if (GTM_ID) {
    window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtm.js?id=' + GTM_ID;
    document.head.appendChild(s);
  }

  /* ------------------------------------------- clique em WhatsApp / tel */
  /* Cada clique vira um evento com a página e a origem do tráfego (UTM
     guardada pelo script.js das landings, quando houver). No GTM isso vira
     a tag de Contact do Pixel e o evento clique_whatsapp do GA4. */
  function origem() {
    try { return sessionStorage.getItem('lc_rastreio') || ''; } catch (e) { return ''; }
  }

  /* 2026-09-16: o GA4 mostrou que 25 dos 31 "cliques no WhatsApp" das landings
     vinham de Prineville, Forest City, Fort Worth, Dublin e Luleå, que são os
     data centers do Meta (o revisor de anúncio abre a página e aciona os
     botões). Como clique_whatsapp agora é conversão principal no Google Ads,
     um robô viraria "conversão". Humano não clica em 3 segundos; o revisor
     clica em menos de 1. O clique continua abrindo o WhatsApp; só o evento
     deixa de ser contado. */
  var ABERTA_EM = Date.now();
  var MINIMO_MS = 3000;

  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (Date.now() - ABERTA_EM < MINIMO_MS) return;
    if (href.indexOf('wa.me') !== -1 || href.indexOf('whatsapp') !== -1) {
      window.dataLayer.push({ event: 'clique_whatsapp', pagina: location.pathname, rastreio: origem() });
    } else if (href.indexOf('tel:') === 0) {
      window.dataLayer.push({ event: 'clique_telefone', pagina: location.pathname, rastreio: origem() });
    }
  }, true);
})();
