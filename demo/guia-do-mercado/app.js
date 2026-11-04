(() => {
  // ../../../../../../home/guilhermerisson/orca/projects/guia-do-mercado/bot/src/texto.ts
  function normalizar(texto) {
    return texto.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/(?<=\d),(?=\d)/g, ".").replace(/[^a-z0-9.]+/g, " ").replace(/(?<!\d)\.|\.(?!\d)/g, " ").replace(/\s+/g, " ").trim();
  }
  var MASSA = { kg: 1e3, kgs: 1e3, quilo: 1e3, quilos: 1e3, g: 1, gr: 1, grs: 1, grama: 1, gramas: 1 };
  var VOLUME = { l: 1e3, lt: 1e3, lts: 1e3, litro: 1e3, litros: 1e3, ml: 1 };
  var UNIDADES = Object.keys({ ...MASSA, ...VOLUME }).sort((a, b) => b.length - a.length).join("|");
  var RE_MEDIDA = new RegExp(`(?<![a-z0-9.])(\\d+(?:\\.\\d+)?)\\s*(${UNIDADES})\\b`);
  function extrairMedida(normalizado) {
    const m = RE_MEDIDA.exec(normalizado);
    if (!m) return { medida: null, resto: normalizado };
    const valor = Number(m[1]);
    const unidade = m[2];
    const medida = unidade in MASSA ? { valor: valor * MASSA[unidade], unidade: "g" } : { valor: valor * VOLUME[unidade], unidade: "ml" };
    const resto = (normalizado.slice(0, m.index) + " " + normalizado.slice(m.index + m[0].length)).replace(/\s+/g, " ").trim();
    return { medida, resto };
  }
  var NUMERAIS = {
    um: 1,
    uma: 1,
    dois: 2,
    duas: 2,
    tres: 3,
    quatro: 4,
    cinco: 5,
    seis: 6,
    sete: 7,
    oito: 8,
    nove: 9,
    dez: 10,
    duzia: 12,
    "meia duzia": 6
  };
  function lerLista(mensagem) {
    const partes = mensagem.split(/\n|,|;|\s+e\s+/i).map((p) => p.replace(/^\s*[-*•·]+\s*/, "").trim()).filter((p) => p.length > 0);
    return partes.map(lerEntrada).filter((e) => normalizar(e.texto).length > 0);
  }
  function lerEntrada(parte) {
    let texto = parte.trim();
    let quantidade = 1;
    const inicio = /^(\d+)\s*(?:x|un|und|unid|unidades?)?\s+(?!kg\b|g\b|ml\b|l\b|litros?\b|gramas?\b)(.+)$/i.exec(texto);
    const fim = /^(.+?)\s+(?:x\s*(\d+)|(\d+)\s*x|\((\d+)\))$/i.exec(texto);
    const porExtenso = /^(meia d[uú]zia|um|uma|dois|duas|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez|d[uú]zia)\s+(?:de\s+)?(.+)$/i.exec(texto);
    if (inicio) {
      quantidade = Number(inicio[1]);
      texto = inicio[2];
    } else if (fim) {
      quantidade = Number(fim[2] ?? fim[3] ?? fim[4]);
      texto = fim[1];
    } else if (porExtenso) {
      quantidade = NUMERAIS[normalizar(porExtenso[1])] ?? 1;
      texto = porExtenso[2];
    }
    return { texto: texto.trim(), quantidade: quantidade > 0 ? quantidade : 1 };
  }
  function lerValor(mensagem) {
    const m = /(\d{1,6}(?:[.,]\d{1,2})?)/.exec(mensagem.replace(/\s/g, ""));
    if (!m) return null;
    const v = Number(m[1].replace(",", "."));
    return Number.isFinite(v) && v > 0 && v < 1e5 ? Math.round(v * 100) / 100 : null;
  }

  // ../../../../../../home/guilhermerisson/orca/projects/guia-do-mercado/bot/src/sugestao.ts
  var VAZIAS = /* @__PURE__ */ new Set(["de", "do", "da", "e", "em", "com", "para", "tipo", "sem", "o", "a", "os", "as", "pacote", "pct"]);
  function raiz(p) {
    return p.length > 3 && p.endsWith("s") ? p.slice(0, -1) : p;
  }
  function casaPalavra(palavra, busca) {
    const r = raiz(palavra);
    return busca.some((b) => {
      const rb = raiz(b);
      return rb === r || r.length >= 4 && rb.startsWith(r);
    });
  }
  function sugerir(texto, catalogo, limite = 4) {
    const { medida, resto } = extrairMedida(normalizar(texto));
    const palavras = resto.split(" ").filter((p) => p && !VAZIAS.has(p) && !/^\d+$/.test(p));
    if (palavras.length === 0) return { sugestoes: [], unica: null, medida };
    const pontuadas = [];
    for (const item of catalogo) {
      const busca = item.busca.split(" ");
      const acertos = palavras.filter((p) => casaPalavra(p, busca)).length;
      if (acertos === 0) continue;
      let pontos = acertos / palavras.length;
      if (casaPalavra(palavras[0], [normalizar(item.nome).split(" ")[0]])) pontos += 0.2;
      if (medida && item.conteudoValor !== null) {
        pontos += item.conteudoUnidade === medida.unidade && Math.abs(item.conteudoValor - medida.valor) < 1 ? 0.5 : -0.2;
      }
      if (medida && item.granel && medida.unidade === "g") pontos += 0.3;
      pontuadas.push({ item, pontos, completa: acertos === palavras.length });
    }
    pontuadas.sort((a, b) => b.pontos - a.pontos || a.item.ordem - b.item.ordem);
    const completas = pontuadas.filter((s) => s.completa);
    const sugestoes = (completas.length > 0 ? completas : pontuadas).slice(0, limite);
    const unica = completas.length === 1 ? completas[0].item : null;
    return { sugestoes, unica, medida };
  }
  function quantidadeFinal(item, quantidade, medida) {
    if (item.granel && medida && medida.unidade === "g") return Math.round(quantidade * medida.valor / 10) / 100;
    return quantidade;
  }
  function distancia(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const custo = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + custo);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        }
      }
    }
    return d[a.length][b.length];
  }
  function vocabulario(catalogo) {
    const v = /* @__PURE__ */ new Set();
    for (const i of catalogo) for (const p of [...i.busca.split(" "), ...normalizar(i.nome).split(" ")]) if (p.length >= 3 && !/\d/.test(p)) v.add(p);
    return [...v];
  }
  function corrigir(texto, catalogo) {
    const vocab = vocabulario(catalogo);
    const palavras = normalizar(texto).split(" ");
    const trocas = [];
    const corrigidas = palavras.map((p) => {
      if (p.length < 3 || /\d/.test(p) || VAZIAS.has(p) || vocab.some((v) => casaPalavra(p, [v]))) return p;
      const limite = p.length <= 5 ? 1 : 2;
      let melhor = null;
      let menor = limite + 1;
      for (const v of vocab) {
        if (Math.abs(v.length - p.length) > limite) continue;
        const dist = distancia(raiz(p), raiz(v));
        if (dist < menor || dist === menor && melhor !== null && v.length < melhor.length) {
          melhor = v;
          menor = dist;
        }
      }
      if (melhor && menor <= limite) {
        trocas.push({ de: p, para: melhor });
        return melhor;
      }
      return p;
    });
    if (trocas.length === 0) return null;
    const corrigido = corrigidas.join(" ");
    return sugerir(corrigido, catalogo).sugestoes.length > 0 ? { texto: corrigido, trocas } : null;
  }

  // ../../../../../../home/guilhermerisson/orca/projects/guia-do-mercado/bot/src/montagem.ts
  function classificar(texto, quantidade, catalogo, preferido = null) {
    const r = sugerir(texto, catalogo);
    if (preferido) return { tipo: "certo", item: preferido, quantidade: quantidadeFinal(preferido, quantidade, r.medida) };
    const melhor = r.sugestoes[0];
    if (melhor?.completa) return { tipo: "certo", item: melhor.item, quantidade: quantidadeFinal(melhor.item, quantidade, r.medida) };
    const c = corrigir(texto, catalogo);
    if (c) return { tipo: "correcao", texto: c.texto, trocas: c.trocas };
    if (melhor) return { tipo: "incerto", item: melhor.item, quantidade: quantidadeFinal(melhor.item, quantidade, r.medida) };
    return { tipo: "livre" };
  }
  function alternativas(texto, atual, catalogo, limite = 5) {
    return sugerir(texto, catalogo, limite + 1).sugestoes.map((s) => s.item).filter((i) => i.id !== atual).slice(0, limite);
  }

  // grammy-shim.ts
  var InlineKeyboard = class {
    inline_keyboard = [[]];
    text(text, callback_data) {
      this.inline_keyboard[this.inline_keyboard.length - 1].push({ text, callback_data });
      return this;
    }
    url(text, url) {
      this.inline_keyboard[this.inline_keyboard.length - 1].push({ text, url });
      return this;
    }
    row() {
      if (this.inline_keyboard[this.inline_keyboard.length - 1].length) this.inline_keyboard.push([]);
      return this;
    }
  };

  // ../../../../../../home/guilhermerisson/orca/projects/guia-do-mercado/bot/src/formato.ts
  function brl(v) {
    return "R$ " + v.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d),)/g, ".");
  }
  function qtd(item) {
    if (item.granel) return `${String(item.quantidade).replace(".", ",")} kg`;
    return item.quantidade === 1 ? "" : `\xD7${item.quantidade}`;
  }
  function encurtar(t, max) {
    return t.length <= max ? t : t.slice(0, max - 1) + "\u2026";
  }
  function centavos(v) {
    return Math.round((v + Number.EPSILON) * 100) / 100;
  }
  function totais(itens2) {
    let estimado = 0, carrinho = 0, falta = 0, marcados = 0;
    for (const i of itens2) {
      const est = centavos((i.precoEstimado ?? 0) * i.quantidade);
      estimado += est;
      if (i.marcado) {
        carrinho += centavos((i.precoReal ?? i.precoEstimado ?? 0) * i.quantidade);
        marcados++;
      } else {
        falta += est;
      }
    }
    return {
      estimado: centavos(estimado),
      carrinho: centavos(carrinho),
      falta: centavos(falta),
      previsao: centavos(carrinho + falta),
      marcados,
      total: itens2.length
    };
  }
  var ITENS_POR_PAGINA = 15;
  function paginas(itens2) {
    return Math.max(1, Math.ceil(itens2.length / ITENS_POR_PAGINA));
  }
  function textoRevisao(nome, itens2, pagina, temRemovidos = false) {
    if (itens2.length === 0 && temRemovidos) {
      return `\u{1F6D2} *${esc(nome)}*

Todos os itens foram removidos\\. Toque em \u21A9\uFE0F para voltar algum, ou me mande novos itens\\.`;
    }
    if (itens2.length === 0) {
      return `\u{1F6D2} *${esc(nome)}*

Sua lista est\xE1 vazia\\. Me mande os itens, por exemplo:
_2 leite, arroz 5kg, caf\xE9_`;
    }
    const t = totais(itens2);
    const semPreco = itens2.filter((i) => i.precoEstimado === null).length;
    const incertos = itens2.filter((i) => i.incerto).length;
    const linhas = [
      `\u{1F6D2} *${esc(nome)}* \u2014 ${itens2.length} ${itens2.length === 1 ? "item" : "itens"}`,
      `*Total estimado: ${esc(brl(t.estimado))}*`,
      "",
      "Toque em *E* \\(econ\xF4mico\\), *T* \\(t\xEDpico\\) ou *P* \\(premium\\) em cada item; o total muda na hora\\.",
      "\u2795 adiciona \xB7 \u{1F504} troca o item \xB7 \u{1F5D1} remove \\(\u21A9\uFE0F desfaz\\)"
    ];
    if (incertos) linhas.push(`\u2753 ${incertos} ${incertos === 1 ? "item precisa" : "itens precisam"} de confer\xEAncia: toque no nome para trocar\\.`);
    if (semPreco) linhas.push(`\u270F\uFE0F ${semPreco} sem pre\xE7o da regi\xE3o: toque em \u270F\uFE0F para informar\\.`);
    const n = paginas(itens2);
    if (n > 1) linhas.push("", `_P\xE1gina ${pagina + 1} de ${n}_`);
    return linhas.join("\n");
  }
  function rotuloFaixa(letra, valor, quantidade, marcado) {
    return `${marcado ? "\u25CF" : ""}${letra} ${brl(centavos(valor * quantidade)).replace("R$ ", "")}`;
  }
  function tecladoRevisao(itens2, pagina, temAlternativas, removidos2 = []) {
    const k = new InlineKeyboard().text("\u2795 Adicionar item", "add").row();
    const n = paginas(itens2);
    const pag = Math.min(Math.max(pagina, 0), n - 1);
    for (const i of itens2.slice(pag * ITENS_POR_PAGINA, (pag + 1) * ITENS_POR_PAGINA)) {
      const q = qtd(i);
      const nome = `${i.incerto ? "\u2753 " : ""}${encurtar(i.nomeExibicao, 30)}${q ? " " + q : ""}${temAlternativas(i) ? " \u{1F504}" : ""}`;
      k.text(nome, `a:${i.id}:${pag}`).text("\u{1F5D1}", `d:${i.id}:${pag}`).row();
      if (i.faixa) {
        k.text(rotuloFaixa("E", i.faixa.p10, i.quantidade, i.perfil === "economico"), `t:${i.id}:e:${pag}`).text(rotuloFaixa("T", i.faixa.p50, i.quantidade, i.perfil === "tipico"), `t:${i.id}:t:${pag}`).text(rotuloFaixa("P", i.faixa.p90, i.quantidade, i.perfil === "premium"), `t:${i.id}:p:${pag}`).row();
        if (i.perfil === "manual" && i.precoEstimado !== null) {
          k.text(`\u25CF\u270F\uFE0F ${brl(centavos(i.precoEstimado * i.quantidade))}`, `w:${i.id}:${pag}`).row();
        }
      } else {
        const v = i.precoEstimado === null ? "\u270F\uFE0F informar pre\xE7o" : `\u270F\uFE0F ${brl(centavos(i.precoEstimado * i.quantidade))}`;
        k.text(v, `w:${i.id}:${pag}`).row();
      }
    }
    for (const r of removidos2) k.text(`\u21A9\uFE0F Voltar: ${encurtar(r.nome, 34)}`, `u:${r.id}:${pag}`).row();
    if (n > 1) {
      if (pag > 0) k.text("\u2B05\uFE0F Anterior", `g:${pag - 1}`);
      if (pag < n - 1) k.text("Pr\xF3xima \u27A1\uFE0F", `g:${pag + 1}`);
      k.row();
    }
    return k.text("\u2705 Pronto", "ok").text("\u{1F6CD}\uFE0F Estou no mercado", "v:mercado").row().text("\u{1F465} Compartilhar", "sh");
  }
  function tecladoAlternativas(itemListaId, pagina, opcoes) {
    const k = new InlineKeyboard();
    for (const o of opcoes) k.text(o.nome, `s:${itemListaId}:${o.id}:${pagina}`).row();
    return k.text("Item livre (sem pre\xE7o da regi\xE3o)", `s:${itemListaId}:-:${pagina}`).row().text("\u2B05\uFE0F Voltar", `g:${pagina}`);
  }
  function textoResumo(nome, itens2) {
    const t = totais(itens2);
    const linhas = itens2.map((i) => {
      const preco = i.precoEstimado === null ? "sem pre\xE7o" : brl(centavos(i.precoEstimado * i.quantidade));
      const q = qtd(i);
      return `\u2022 ${esc(i.nomeExibicao)}${q ? " " + esc(q) : ""} \u2014 ${esc(preco)}`;
    });
    return `\u{1F6D2} *${esc(nome)}*

${linhas.join("\n")}

*Total estimado: ${esc(brl(t.estimado))}*`;
  }
  function tecladoResumo() {
    return new InlineKeyboard().text("\u2795 Adicionar item", "add").text("\u270F\uFE0F Ajustar", "g:0").row().text("\u{1F465} Compartilhar", "sh").row().text("\u{1F6CD}\uFE0F Estou no mercado", "v:mercado").row().text("\u{1F9FE} Finalizar lista", "x:finalizar");
  }
  function textoMercado(nome, itens2) {
    const t = totais(itens2);
    return [
      `\u{1F6CD}\uFE0F *${esc(nome)}* \u2014 ${t.marcados} de ${t.total} no carrinho`,
      "",
      `No carrinho: *${esc(brl(t.carrinho))}*`,
      `Falta pegar: ${esc(brl(t.falta))}`,
      `Previs\xE3o final: *${esc(brl(t.previsao))}*`,
      "",
      "_Toque no item para marcar\\. \u270F\uFE0F corrige o pre\xE7o que voc\xEA viu\\. \u{1F504} mostra o que quem divide a lista com voc\xEA j\xE1 pegou\\._"
    ].join("\n");
  }
  function tecladoMercado(itens2) {
    const k = new InlineKeyboard();
    for (const i of itens2) {
      const unit = i.precoReal ?? i.precoEstimado;
      const preco = unit === null ? "?" : brl(centavos(unit * i.quantidade)).replace("R$ ", "");
      const q = qtd(i);
      k.text(`${i.marcado ? "\u2705" : "\u2B1C"} ${encurtar(i.nomeExibicao, 26)}${q ? " " + q : ""} \xB7 ${preco}`, `m:${i.id}`).text("\u270F\uFE0F", `r:${i.id}`).row();
    }
    return k.text("\u{1F504} Atualizar", "v:atualizar").text("\u{1F9FE} Finalizar compra", "x:finalizar");
  }
  function esc(t) {
    return t.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
  }

  // demo.ts
  var NOME_LISTA = "Lista de compras";
  var $ = (s) => document.querySelector(s);
  var dados;
  var cidade;
  var itens = [];
  var removidos = [];
  var pendentes = [];
  var proximoId = 1;
  var aguardando = null;
  var mensagemLista = null;
  function markdown(t) {
    let html = "";
    let negrito = false;
    let italico = false;
    for (let i = 0; i < t.length; i++) {
      const c = t[i];
      if (c === "\\" && i + 1 < t.length) {
        html += escapar(t[++i]);
      } else if (c === "*") {
        html += negrito ? "</b>" : "<b>";
        negrito = !negrito;
      } else if (c === "_") {
        html += italico ? "</i>" : "<i>";
        italico = !italico;
      } else if (c === "\n") {
        html += "<br>";
      } else {
        html += escapar(c);
      }
    }
    return html;
  }
  function escapar(c) {
    return c.replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[m]);
  }
  var feed = () => $(".tg__feed");
  var esperar = (ms) => new Promise((r) => setTimeout(r, ms));
  var quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function rolar() {
    const f = feed();
    f.scrollTo({ top: f.scrollHeight, behavior: quieto ? "auto" : "smooth" });
  }
  function mensagemEu(texto) {
    const el = document.createElement("div");
    el.className = "msg msg--eu";
    el.textContent = texto;
    feed().append(el);
    rolar();
  }
  async function digitando() {
    const el = document.createElement("div");
    el.className = "msg msg--bot msg--digitando";
    el.innerHTML = "<span></span><span></span><span></span>";
    feed().append(el);
    rolar();
    await esperar(quieto ? 0 : 520);
    el.remove();
  }
  function teclado(k) {
    if (!k) return "";
    const linhas = k.inline_keyboard.filter((l) => l.length);
    return '<div class="tg__teclado">' + linhas.map(
      (l) => '<div class="tg__linha">' + l.map(
        (b) => b.url ? `<a class="tecla" href="#" data-cb="sh-url">${escapar(b.text)}</a>` : `<button class="tecla${/^●/.test(b.text) ? " tecla--escolhida" : ""}" type="button" data-cb="${escapar(b.callback_data)}">${escapar(b.text.replace(/^●/, ""))}</button>`
      ).join("") + "</div>"
    ).join("") + "</div>";
  }
  async function responder(texto, k, opcoes = {}) {
    const corpo = `<div class="msg__texto">${opcoes.md === false ? escapar(texto).replace(/\n/g, "<br>") : markdown(texto)}</div>${teclado(k)}`;
    if (opcoes.editar) {
      opcoes.editar.innerHTML = corpo;
      opcoes.editar.classList.remove("msg--editada");
      void opcoes.editar.offsetWidth;
      opcoes.editar.classList.add("msg--editada");
      atualizarPainel();
      return opcoes.editar;
    }
    await digitando();
    const el = document.createElement("div");
    el.className = "msg msg--bot";
    el.innerHTML = corpo;
    feed().append(el);
    rolar();
    atualizarPainel();
    return el;
  }
  function faixaDe(id) {
    const f = cidade.faixas[id];
    return f ? { p10: f[0], p50: f[1], p90: f[2] } : null;
  }
  function novoItem(texto, quantidade, livre, item, incerto = false) {
    const faixa = item && !livre ? faixaDe(item.id) : null;
    return {
      id: proximoId++,
      textoOriginal: texto,
      itemCanonicoId: item && !livre ? item.id : null,
      nomeExibicao: item && !livre ? item.nome : texto,
      quantidade,
      granel: Boolean(item?.granel) && !livre,
      incerto,
      faixa,
      perfil: faixa ? "tipico" : null,
      precoEstimado: faixa ? faixa.p50 : null,
      precoReal: null,
      marcado: false
    };
  }
  function adicionarTexto(mensagem) {
    const entradas = lerLista(mensagem);
    if (!entradas.length) return false;
    for (const e of entradas) {
      const c = classificar(e.texto, e.quantidade, dados.catalogo);
      if (c.tipo === "correcao") pendentes.push({ texto: e.texto, quantidade: e.quantidade, correcao: c.texto });
      else if (c.tipo === "livre") itens.push(novoItem(e.texto, e.quantidade, true));
      else itens.push(novoItem(e.texto, c.quantidade, false, c.item, c.tipo === "incerto"));
    }
    return true;
  }
  var temAlt = (i) => alternativas(i.textoOriginal, i.itemCanonicoId, dados.catalogo).length > 0;
  async function continuar(pagina = 0, editar = false) {
    const p = pendentes[0];
    if (p) {
      const k = new (teclasVazias())().text("\u2713 Sim", "k:s").text("\u2717 N\xE3o, deixar como escrevi", "k:n");
      await responder(`N\xE3o encontrei *${esc2(p.texto)}*\\. Voc\xEA quis dizer *${esc2(p.correcao)}*?`, k);
      return;
    }
    await mostrarRevisao(pagina, editar);
  }
  async function mostrarRevisao(pagina = 0, editar = false) {
    const texto = textoRevisao(NOME_LISTA, itens, pagina, removidos.length > 0);
    const k = itens.length || removidos.length ? tecladoRevisao(itens, pagina, temAlt, removidos) : void 0;
    mensagemLista = await responder(texto, k, { editar: editar ? mensagemLista : null });
  }
  function esc2(t) {
    return t.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
  }
  var Classe = null;
  function teclasVazias() {
    Classe ??= tecladoResumo().constructor;
    return Classe;
  }
  async function aoTocar(cb, origem) {
    const partes = cb.split(":");
    const item = (id) => itens.find((i) => i.id === Number(id));
    const pag = Number(partes.at(-1)) || 0;
    const naLista = origem === mensagemLista;
    switch (partes[0]) {
      case "t": {
        const i = item(partes[1]);
        if (!i?.faixa) return;
        const perfil = { e: "economico", t: "tipico", p: "premium" }[partes[2]];
        i.perfil = perfil;
        i.precoEstimado = perfil === "economico" ? i.faixa.p10 : perfil === "premium" ? i.faixa.p90 : i.faixa.p50;
        return mostrarRevisao(pag, naLista);
      }
      case "d": {
        const i = item(partes[1]);
        if (!i) return;
        itens = itens.filter((x) => x !== i);
        removidos = [{ id: i.id, nome: i.nomeExibicao, item: i }, ...removidos].slice(0, 3);
        return mostrarRevisao(pag, naLista);
      }
      case "u": {
        const r = removidos.find((x) => x.id === Number(partes[1]));
        if (!r) return;
        removidos = removidos.filter((x) => x.id !== r.id);
        itens.push(r.item);
        return mostrarRevisao(pag, naLista);
      }
      case "a": {
        const i = item(partes[1]);
        if (!i) return;
        const opcoes = alternativas(i.textoOriginal, i.itemCanonicoId, dados.catalogo).map((o) => ({ id: o.id, nome: o.nome }));
        mensagemLista = await responder(`Trocar *${esc2(i.nomeExibicao)}* por:`, tecladoAlternativas(i.id, pag, opcoes), {
          editar: naLista ? mensagemLista : null
        });
        return;
      }
      case "s": {
        const i = item(partes[1]);
        if (!i) return;
        const novo = partes[2] === "-" ? null : dados.catalogo.find((c) => c.id === partes[2]);
        const troca = novoItem(i.textoOriginal, novo?.granel ? i.quantidade : Math.max(1, Math.round(i.quantidade)), !novo, novo ?? void 0);
        troca.id = i.id;
        itens = itens.map((x) => x === i ? troca : x);
        return mostrarRevisao(pag, naLista);
      }
      case "g":
        return mostrarRevisao(Number(partes[1]) || 0, naLista);
      case "k": {
        const p = pendentes.shift();
        if (!p) return;
        if (partes[1] === "s") {
          const c = classificar(p.correcao, p.quantidade, dados.catalogo);
          if (c.tipo === "certo" || c.tipo === "incerto") itens.push(novoItem(p.correcao, c.quantidade, false, c.item, c.tipo === "incerto"));
          else itens.push(novoItem(p.correcao, p.quantidade, true));
        } else {
          itens.push(novoItem(p.texto, p.quantidade, true));
        }
        return continuar();
      }
      case "add":
        await responder("Me mande os itens que faltam, como numa mensagem normal.", void 0, { md: false });
        $(".tg__entrada input").focus();
        return;
      case "ok":
        await responder(textoResumo(NOME_LISTA, itens), tecladoResumo());
        return;
      case "v":
        if (partes[1] === "mercado" || partes[1] === "atualizar") {
          mensagemLista = await responder(textoMercado(NOME_LISTA, itens), tecladoMercado(itens), {
            editar: partes[1] === "atualizar" || naLista && origem?.querySelector("[data-cb^='m:']") ? mensagemLista : null
          });
        }
        return;
      case "m": {
        const i = item(partes[1]);
        if (!i) return;
        i.marcado = !i.marcado;
        mensagemLista = await responder(textoMercado(NOME_LISTA, itens), tecladoMercado(itens), { editar: naLista ? mensagemLista : null });
        return;
      }
      case "r":
      case "w": {
        const i = item(partes[1]);
        if (!i) return;
        aguardando = { tipo: partes[0] === "r" ? "real" : "preco", itemId: i.id };
        await responder(
          partes[0] === "r" ? `Quanto custou *${esc2(i.nomeExibicao)}* no mercado? Digite o valor de uma unidade, por exemplo: 12,90` : `Qual o pre\xE7o de *${esc2(i.nomeExibicao)}*? Digite o valor de uma unidade, por exemplo: 12,90`
        );
        $(".tg__entrada input").focus();
        return;
      }
      case "x": {
        const t = totais(itens);
        await responder(
          `\u{1F9FE} *Compra finalizada*

Voc\xEA pegou ${t.marcados} de ${t.total} itens\\.
Total no carrinho: *${esc2(brl(t.carrinho))}*

_No bot de verdade, os pre\xE7os que voc\xEA corrigiu ajustam a estimativa da sua regi\xE3o\\._`
        );
        return;
      }
      case "sh":
      case "sh-url":
        await responder(
          "\u{1F465} No Telegram, aqui sai um link da lista. Quem abrir entra na mesma lista: o que um marca no mercado, o outro v\xEA ao tocar em \u{1F504} Atualizar.",
          void 0,
          { md: false }
        );
        return;
    }
  }
  async function enviar(texto) {
    texto = texto.trim();
    if (!texto) return;
    mensagemEu(texto);
    if (aguardando) {
      const valor = lerValor(texto);
      const i = itens.find((x) => x.id === aguardando.itemId);
      const tipo = aguardando.tipo;
      aguardando = null;
      if (valor === null || !i) {
        await responder("N\xE3o entendi o valor. Toque em \u270F\uFE0F de novo e digite s\xF3 o n\xFAmero, por exemplo: 12,90", void 0, { md: false });
        return;
      }
      if (tipo === "real") {
        i.precoReal = valor;
        i.marcado = true;
        mensagemLista = await responder(textoMercado(NOME_LISTA, itens), tecladoMercado(itens));
      } else {
        i.precoEstimado = valor;
        i.perfil = "manual";
        await mostrarRevisao();
      }
      return;
    }
    if (!adicionarTexto(texto)) {
      await responder("Me mande os itens separados por v\xEDrgula, por exemplo: 2 leite, arroz 5kg, caf\xE9", void 0, { md: false });
      return;
    }
    await continuar();
  }
  var NIVEL = {
    imediata: "regi\xE3o imediata",
    intermediaria: "regi\xE3o intermedi\xE1ria",
    uf: "estado",
    brasil: "Brasil"
  };
  function atualizarPainel() {
    const corpo = $("[data-origem]");
    const comFaixa = itens.filter((i) => i.itemCanonicoId);
    if (!comFaixa.length) {
      corpo.innerHTML = '<p class="vazio">Mande uma lista no chat para ver de onde vem cada pre\xE7o.</p>';
      return;
    }
    corpo.innerHTML = comFaixa.map((i) => {
      const f = cidade.faixas[i.itemCanonicoId];
      if (!f) return `<li><span>${escapar(i.nomeExibicao)}</span><small>sem faixa: o bot pergunta o pre\xE7o</small></li>`;
      return `<li><span>${escapar(i.nomeExibicao)}</span><small>${NIVEL[f[3]]} \xB7 ${f[4]} ${f[4] === 1 ? "rede" : "redes"} \xB7 ${f[5]} marcas</small><b>${brl(f[0])} \xB7 ${brl(f[1])} \xB7 ${brl(f[2])}</b></li>`;
    }).join("");
    const t = totais(itens);
    $("[data-total]").textContent = brl(t.estimado);
  }
  async function iniciar() {
    dados = await fetch("precos.json").then((r) => r.json());
    const seletor = $("[data-cidade]");
    seletor.innerHTML = dados.cidades.map((c) => `<option value="${c.municipio}">${escapar(c.nome)} (${c.uf})</option>`).join("");
    cidade = dados.cidades[0];
    const data = new Date(dados.gerado_em).toLocaleDateString("pt-BR");
    $("[data-coleta]").textContent = data;
    seletor.addEventListener("change", async () => {
      cidade = dados.cidades.find((c) => c.municipio === Number(seletor.value));
      for (const i of itens) {
        if (!i.itemCanonicoId) continue;
        i.faixa = faixaDe(i.itemCanonicoId);
        if (i.faixa && i.perfil !== "manual") {
          i.perfil ??= "tipico";
          i.precoEstimado = i.perfil === "economico" ? i.faixa.p10 : i.perfil === "premium" ? i.faixa.p90 : i.faixa.p50;
        }
      }
      await responder(`\u{1F4CD} Cidade trocada para ${cidade.nome}. Os pre\xE7os agora s\xE3o da regi\xE3o de ${cidade.regiao}.`, void 0, { md: false });
      if (itens.length) await mostrarRevisao();
    });
    feed().addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-cb]");
      if (!b) return;
      ev.preventDefault();
      b.classList.add("tecla--toque");
      void aoTocar(b.dataset.cb, b.closest(".msg"));
    });
    const form = $(".tg__entrada");
    form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const input = form.querySelector("input");
      void enviar(input.value);
      input.value = "";
    });
    document.querySelectorAll("[data-exemplo]").forEach(
      (b) => b.addEventListener("click", () => void enviar(b.dataset.exemplo))
    );
    await responder(
      `Ol\xE1\\! Eu organizo sua lista de compras e estimo quanto ela vai custar com pre\xE7os de mercados da sua regi\xE3o\\.

Voc\xEA est\xE1 em *${esc2(cidade.nome)}*\\. Me mande os itens numa mensagem, por exemplo:
_2 leite, arroz 5kg, caf\xE9, tomate 1kg_`
    );
    atualizarPainel();
  }
  void iniciar();
})();
