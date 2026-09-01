/* Rastreamento do site e das landings — um arquivo só, incluído em toda página.
   Preencher os IDs abaixo quando as contas existirem (ver
   marketing/campanhas/meta-ads-2026-08-31/plano-rastreamento.md no MazyOS).
   Com os IDs vazios o arquivo não carrega nada de fora: só monta o dataLayer
   e marca os cliques de WhatsApp/telefone, então pode ir pro ar antes deles. */
(function () {
  var GTM_ID = ''; /* ex.: 'GTM-XXXXXXX' — container único; Pixel e GA4 vivem dentro dele */

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

  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href.indexOf('wa.me') !== -1 || href.indexOf('whatsapp') !== -1) {
      window.dataLayer.push({ event: 'clique_whatsapp', pagina: location.pathname, rastreio: origem() });
    } else if (href.indexOf('tel:') === 0) {
      window.dataLayer.push({ event: 'clique_telefone', pagina: location.pathname, rastreio: origem() });
    }
  }, true);
})();
