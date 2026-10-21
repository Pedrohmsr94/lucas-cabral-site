/* Landings: a ferramenta do meio da página e o prazo da MP (outubro de 2026).

   Cada página tem um teste de toque, e o resultado vai pronto pro WhatsApp:
   - teste (renegociação): três perguntas de sim ou não, os critérios da MP;
   - escolha (execução, recuperação): uma opção, "em que pé está";
   - checklist (arrendamento, contratos): o que o contrato já diz;
   - caderno (gestão): a conta da safra com os números da pessoa.

   Enquanto a pessoa não mexe, a mensagem é genérica: o exemplo não é a conta
   dela, e "ficou tudo em aberto" sem ela ter marcado nada seria mentira.

   Nada sai do aparelho até ela tocar no botão. O link é wa.me, então o
   rastreamento.js conta o clique como qualquer outro botão de WhatsApp. */
(function () {
  var NUMERO = '5564992086744';
  var inteiro = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
  var centavos = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

  function link(texto) {
    return 'https://wa.me/' + NUMERO + '?text=' + encodeURIComponent(texto);
  }

  function reais(v) {
    return 'R$ ' + (Math.round(v * 100) % 100 === 0 ? inteiro.format(v) : centavos.format(v));
  }

  function lerNumero(txt) {
    var limpo = String(txt).replace(/[^\d,.-]/g, '');
    if (limpo.indexOf(',') !== -1) limpo = limpo.replace(/\./g, '').replace(',', '.');
    else if (/\.\d{3}($|\.)/.test(limpo)) limpo = limpo.replace(/\./g, '');
    var v = parseFloat(limpo);
    return isFinite(v) ? v : 0;
  }

  function paragrafo(classe, texto) {
    var p = document.createElement('p');
    p.className = classe;
    p.textContent = texto;
    return p;
  }

  /* --------------------------------------------------- prazo da MP 1.376 */
  /* Conta por data de calendário, não por hora: no dia 12 é "último dia". */
  var prazo = document.querySelector('[data-prazo]');
  if (prazo) {
    var p = prazo.getAttribute('data-prazo').split('-');
    var hoje = new Date();
    var dias = Math.round((Date.UTC(+p[0], +p[1] - 1, +p[2]) - Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) / 864e5);
    var alvo = prazo.querySelector('[data-prazo-dias]');
    if (dias < 0) prazo.hidden = true;
    else if (alvo) alvo.textContent = dias === 0 ? ' · hoje é o último dia' : dias === 1 ? ' · falta 1 dia' : ' · faltam ' + dias + ' dias';
  }

  /* ---------------------------------------------------- teste: sim ou não */
  var teste = document.querySelector('[data-teste]');
  if (teste) {
    var perguntas = Array.prototype.slice.call(teste.querySelectorAll('[data-pergunta]'));
    var resultado = teste.querySelector('[data-teste-resultado]');
    var zapTeste = teste.querySelector('[data-teste-zap]');
    var rotuloTeste = teste.querySelector('[data-teste-rotulo]');

    teste.addEventListener('change', function () {
      var respostas = [];
      var sims = 0;
      var faltam = perguntas.filter(function (q) {
        var marcada = q.querySelector('input:checked');
        if (!marcada) return true;
        if (marcada.value === 'sim') sims++;
        respostas.push(q.getAttribute('data-pergunta') + ': ' + marcada.value);
        return false;
      });
      if (faltam.length) return;
      var chave = sims >= 3 ? '3' : String(Math.max(sims, 1));
      resultado.textContent = '';
      resultado.appendChild(paragrafo('teste__veredito', teste.getAttribute('data-r' + chave)));
      resultado.appendChild(paragrafo('teste__detalhe', teste.getAttribute('data-d' + chave)));
      zapTeste.href = link(teste.getAttribute('data-msg').replace('{respostas}', respostas.join('; ')));
      if (rotuloTeste) rotuloTeste.textContent = teste.getAttribute('data-rotulo-depois');
    });
  }

  /* --------------------------------------------------- escolha: uma opção */
  var escolha = document.querySelector('[data-escolha]');
  if (escolha) {
    var resultadoEscolha = escolha.querySelector('[data-escolha-resultado]');
    var zapEscolha = escolha.querySelector('[data-escolha-zap]');
    var rotuloEscolha = escolha.querySelector('[data-escolha-rotulo]');

    escolha.addEventListener('change', function (ev) {
      var opcao = ev.target;
      if (!opcao || opcao.type !== 'radio') return;
      resultadoEscolha.textContent = opcao.getAttribute('data-resultado');
      zapEscolha.href = link(escolha.getAttribute('data-msg').replace('{valor}', opcao.value));
      if (rotuloEscolha) rotuloEscolha.textContent = escolha.getAttribute('data-rotulo-depois');
    });
  }

  /* ---------------------------------------------------------- caderno */
  var folha = document.querySelector('[data-caderno]');
  if (folha) {
    var campos = {};
    var editou = false;
    var zap = document.querySelector('[data-caderno-zap]');
    var rotulo = document.querySelector('[data-caderno-rotulo]');
    var assunto = folha.getAttribute('data-caderno') || 'a conta da safra';

    var recalcular = function () {
      var v = {};
      Object.keys(campos).forEach(function (k) { v[k] = lerNumero(campos[k].value); });
      var entra = v.area * v.sacas * v.preco;
      var sobra = entra - v.area * v.custo - v.parcelas;
      var emSacas = v.preco > 0 ? Math.round(Math.abs(sobra) / v.preco) : 0;
      folha.querySelector('[data-saida="entra"]').textContent = reais(Math.round(entra));
      folha.querySelector('[data-saida="sobra"]').textContent = (sobra < 0 ? '− ' : '') + reais(Math.round(Math.abs(sobra)));
      folha.querySelector('[data-saida="sacas"]').textContent =
        Math.round(sobra) === 0 ? 'Fechou no zero.' : (sobra < 0 ? 'Faltam ' : 'Sobram ') + inteiro.format(emSacas) + ' sacas.';
      if (!zap) return;
      zap.href = link(editou
        ? 'Oi, Lucas. Fiz ' + assunto + ' na página: ' + decimal.format(v.area) + ' ha, ' + decimal.format(v.sacas) +
          ' sc/ha, saca a ' + reais(v.preco) + ', custo de ' + reais(v.custo) + '/ha e ' + reais(v.parcelas) +
          ' de parcelas no ano. Pela conta, ' + (sobra < 0 ? 'faltam ' : 'sobram ') + reais(Math.round(Math.abs(sobra))) + '. Sou de ___.'
        : 'Oi, Lucas. Vi o caderno na página e quero fazer ' + assunto + ' com você. Sou de ___.');
      if (rotulo) rotulo.textContent = editou ? 'Mandar essa conta pro Lucas' : 'Fazer a minha conta com o Lucas';
    };

    folha.querySelectorAll('.folha__campo').forEach(function (input) {
      campos[input.name] = input;
      var ajustar = function () { input.style.width = (Math.max(2, input.value.length) + 0.4) + 'ch'; };
      ajustar();
      input.addEventListener('input', function () { editou = true; ajustar(); recalcular(); });
      input.addEventListener('focus', function () { input.select(); });
    });
    recalcular();
  }

  /* --------------------------------------------------------- checklist */
  var lista = document.querySelector('[data-checagem]');
  if (lista) {
    var caixas = Array.prototype.slice.call(lista.querySelectorAll('input[type="checkbox"]'));
    var placar = document.querySelector('[data-checagem-placar]');
    var zapLista = document.querySelector('[data-checagem-zap]');
    var rotuloLista = document.querySelector('[data-checagem-rotulo]');
    var contrato = lista.getAttribute('data-checagem') || 'o contrato';
    var marcou = false;

    var atualizar = function () {
      var abertos = caixas.filter(function (c) { return !c.checked; }).map(function (c) { return c.value; });
      var feitos = caixas.length - abertos.length;
      if (placar && marcou) {
        placar.hidden = false;
        placar.textContent = abertos.length === 0
          ? 'O seu contrato fala de tudo. Vale uma leitura pra ver se fala do jeito certo.'
          : feitos + ' de ' + caixas.length + ' já estão no papel. ' + abertos.length + (abertos.length === 1 ? ' ficou em aberto.' : ' ficaram em aberto.');
      }
      if (rotuloLista) {
        rotuloLista.textContent = !marcou ? 'Mandar o contrato pro Lucas'
          : abertos.length ? 'Mandar o que ficou em aberto' : 'Pedir a leitura do contrato';
      }
      if (!zapLista) return;
      zapLista.href = link(!marcou
        ? 'Oi, Lucas. Quero que você confira ' + contrato + '. Sou de ___.'
        : abertos.length
          ? 'Oi, Lucas. Conferi ' + contrato + ' pela página e ficou em aberto: ' + abertos.join('; ') + '. Quero mandar o contrato. Sou de ___.'
          : 'Oi, Lucas. Conferi ' + contrato + ' pela página e ele fala de tudo da lista. Quero uma leitura antes de assinar. Sou de ___.');
    };
    caixas.forEach(function (c) { c.addEventListener('change', function () { marcou = true; atualizar(); }); });
    atualizar();
  }
})();
