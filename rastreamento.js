/* Rastreamento do site e das landings — um arquivo só, incluído em toda página.
   Preencher os IDs abaixo quando as contas existirem (ver
   marketing/campanhas/meta-ads-2026-08-31/plano-rastreamento.md no MazyOS).
   Com os IDs vazios o arquivo não carrega nada de fora: só monta o dataLayer
   e marca os cliques de WhatsApp/telefone, então pode ir pro ar antes deles. */
(function () {
  var GTM_ID = ''; /* ex.: 'GTM-XXXXXXX' — container único; Pixel e GA4 vivem dentro dele */

  window.dataLayer = window.dataLayer || [];

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
