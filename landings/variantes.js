/* Variantes de primeira tela por utm_content (2026-09-16).

   Uma landing, várias promessas. O anúncio do Google chega com
   ?utm_content=mp1376 (ou renegociacao, alongamento, arrendamento,
   parceria-comodato, modelo) e o do Meta com o slug do criativo. A página
   declara as variantes num <script type="application/json" id="variantes">
   e este arquivo troca título, subtítulo, etiqueta, texto do botão e a
   mensagem do WhatsApp antes da primeira pintura (por isso ele é carregado
   síncrono, logo depois do hero, e não no fim da página).

   Regra que veio do diagnóstico de 16/09: 453 visitas pagas, zero ação. A
   causa nº 1 era o título não repetir o gancho de quem clicou. */
(function () {
  var el = document.getElementById('variantes');
  if (!el) return;
  var mapa;
  try { mapa = JSON.parse(el.textContent); } catch (e) { return; }

  function param(nome) {
    try {
      var v = new URLSearchParams(location.search).get(nome);
      if (v) return v;
      var toque = sessionStorage.getItem('lc_rastreio') || '';
      var m = toque.match(new RegExp('(?:^|&)' + nome + '=([^&]*)'));
      return m ? decodeURIComponent(m[1]) : '';
    } catch (e) { return ''; }
  }

  var conteudo = (param('utm_content') || '').toLowerCase();
  var fonte = (param('utm_source') || '').toLowerCase();
  var chave = '_padrao';

  /* casa a chave exata, depois qualquer alias, depois prefixo ("card-garantia-b" → "garantia") */
  Object.keys(mapa).forEach(function (k) {
    if (k === '_padrao' || chave !== '_padrao') return;
    var v = mapa[k];
    var nomes = [k].concat(v.alias || []);
    if (nomes.some(function (n) { return conteudo === n || conteudo.indexOf(n) >= 0; })) chave = k;
  });

  var v = mapa[chave] || mapa._padrao;
  if (!v) return;

  var origem = fonte === 'google' ? 'pelo Google' : (fonte === 'meta' || fonte === 'facebook' || fonte === 'instagram') ? 'pelo Instagram' : 'pelo site';

  function texto(campo) {
    var alvo = document.querySelector('[data-v="' + campo + '"]');
    if (alvo && v[campo]) alvo.textContent = v[campo];
  }
  ['tag', 'h1', 'sub', 'cta', 'cta2', 'passo1'].forEach(texto);

  /* Os links do hero já existem; a barra fixa e o rodapé ainda não foram
     lidos pelo navegador quando este script roda, por isso aplica de novo
     quando o documento terminar. */
  function aplicarLinks() {
    if (!v.msg) return;
    var msg = v.msg.replace('{origem}', origem);
    var href = 'https://wa.me/5564992086744?text=' + encodeURIComponent(msg);
    var links = document.querySelectorAll('a[data-v="wa"]');
    for (var i = 0; i < links.length; i++) links[i].setAttribute('href', href);
  }
  aplicarLinks();
  document.addEventListener('DOMContentLoaded', aplicarLinks);

  /* Pro GA4 saber qual primeira tela a pessoa viu */
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: 'variante', variante: chave, utm_content: conteudo || '(sem utm)' });
  document.documentElement.setAttribute('data-variante', chave);
})();
