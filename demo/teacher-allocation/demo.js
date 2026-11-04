// Modo demonstração: a interface real, sem backend. As respostas da API foram gravadas de uma
// rodada de verdade sobre a base sintética do repositório (exemplos/BASE_DEMONSTRACAO_ANONIMIZADA_M52.xlsx).
// Leituras vêm de api/*.json; o envio de planilha reproduz a mesma rodada com as etapas reais do CP-SAT.
(() => {
  const BASE = new URL(".", document.currentScript.src).href;
  const JOB = "e9b792e9e63d43e69f0e13045a441da7";
  const realFetch = window.fetch.bind(window);
  let index = null;
  let allocations = null;
  let run = null; // { started, polls }

  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  const load = (name) => realFetch(BASE + name).then((r) => r.json());
  const getIndex = () => (index ??= load("api/index.json"));
  const fixture = async (path) => {
    const key = (await getIndex())[path];
    return key ? load(`api/${key}.json`) : null;
  };

  async function allocationsPage(url) {
    allocations ??= await load("api/allocations.json");
    const status = url.searchParams.get("status") || "";
    const search = (url.searchParams.get("search") || "").toLowerCase();
    const page = Number(url.searchParams.get("page") || 1);
    const size = Number(url.searchParams.get("page_size") || 25);
    const rows = allocations.filter(
      (a) =>
        (!status || a.status === status) &&
        (!search ||
          [a.discipline_name, a.discipline_code, a.teacher_name, a.curriculum].some((v) =>
            String(v || "").toLowerCase().includes(search),
          )),
    );
    return {
      items: rows.slice((page - 1) * size, page * size),
      page,
      page_size: size,
      total: rows.length,
      pages: Math.max(1, Math.ceil(rows.length / size)),
    };
  }

  async function handle(url, method) {
    const path = url.pathname.replace(/^.*?(\/api\/)/, "/api/") + url.search;
    const bare = url.pathname.replace(/^.*?(\/api\/)/, "/api/");

    if (method === "POST" && bare === "/api/uploads") return json(await load("api/upload.json"));
    if (method === "POST" && bare === "/api/jobs") {
      run = { started: performance.now(), polls: await load("api/run.json") };
      return json(run.polls[0]);
    }
    if (method !== "GET") {
      return json(
        { detail: "Esta é uma demonstração somente leitura. Para criar cenários e lotes, rode o projeto localmente." },
        403,
      );
    }

    if (bare === `/api/jobs/${JOB}` && run) {
      // Mesma cadência da rodada gravada (~5 s), uma etapa a cada 450 ms
      const step = Math.floor((performance.now() - run.started) / 450);
      if (step < run.polls.length - 1) return json(run.polls[step]);
      run = null;
    }
    if (bare === `/api/jobs/${JOB}/allocations`) return json(await allocationsPage(url));

    const exact = await fixture(path);
    if (exact) return json(exact);
    if (bare.startsWith("/api/dashboard/") && url.search) {
      return json({ detail: "Na demonstração os filtros do dashboard funcionam um de cada vez." }, 422);
    }
    const loose = await fixture(bare);
    if (loose) return json(loose);
    return json({ detail: "Esta tela não foi gravada na demonstração." }, 404);
  }

  window.fetch = (input, init = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url, location.href);
    if (!url.pathname.includes("/api/")) return realFetch(input, init);
    const method = (init.method || (typeof input === "string" ? "GET" : input.method) || "GET").toUpperCase();
    return new Promise((resolve) => setTimeout(resolve, 120)).then(() => handle(url, method));
  };

  // Downloads apontam para os arquivos reais da rodada gravada
  const FILES = {
    allocation_workbook: "resultado_alocacao.xlsx",
    allocation_summary: "resumo_alocacao.json",
    audit_report: "auditoria_alocacao.json",
    validation_issues: "inconsistencias.csv",
    manifest: "manifesto.json",
    status: "status.json",
    "validation.xlsx": "inconsistencias.csv",
  };
  document.addEventListener(
    "click",
    (event) => {
      const a = event.target.closest?.("a[href*='/api/']");
      if (!a) return;
      const key = a.getAttribute("href").split("/").pop();
      event.preventDefault();
      if (FILES[key]) window.open(BASE + "files/" + FILES[key], "_blank", "noopener");
    },
    true,
  );

  // Faixa fixa avisando que é demonstração, com a base para baixar e arrastar
  addEventListener("DOMContentLoaded", () => {
    const bar = document.createElement("div");
    bar.setAttribute("role", "note");
    bar.innerHTML =
      '<span><b>Demonstração</b> · interface real, base sintética, respostas gravadas de uma rodada CP-SAT</span>' +
      `<a href="${BASE}base-demonstracao-m52.xlsx" download>Baixar a base e arrastar em Processamento</a>` +
      '<a href="https://github.com/guilhermerissondev/teacher-allocation-optimizer" target="_blank" rel="noopener">Código</a>' +
      '<a href="https://guilhermerissondev.github.io/">Portfólio</a>';
    bar.style.cssText =
      "position:fixed;left:0;right:0;bottom:0;z-index:9999;display:flex;flex-wrap:wrap;gap:6px 18px;align-items:center;" +
      "padding:8px 16px;background:#111;color:#fff;font:12px/1.4 ui-monospace,SFMono-Regular,Consolas,monospace;";
    bar.querySelectorAll("a").forEach((a) => (a.style.cssText = "color:#fff;text-decoration:underline"));
    document.body.append(bar);
    document.body.style.paddingBottom = "44px";
  });
})();
