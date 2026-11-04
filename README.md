# guilhermerissondev.github.io

Portfólio pessoal, https://guilhermerissondev.github.io

Página estática (`index.html`) mais o retrato em `guilherme-risson.jpg`, sem
build e sem dependências externas: as fontes são as do sistema. Servida pelo GitHub Pages a partir da branch `main`, raiz do
repositório.

Para editar: mexa em `index.html` e faça push. O Pages republica em ~1 minuto.

Para conferir localmente, basta abrir o arquivo no navegador.

## Demos

As demos em `demo/` são artefatos gerados, não código para editar à mão:

- `demo/guia-do-mercado/`: `app.js` é o bundle (esbuild) dos módulos do bot
  (`bot/src/texto.ts`, `sugestao.ts`, `montagem.ts`, `formato.ts`) com o grammY
  trocado por um shim de teclado. `precos.json` é o retrato das faixas de preço
  de 12 cidades, exportado do banco de desenvolvimento.
- `demo/teacher-allocation/`: build do frontend React com `--base ./` e um
  `demo.js` que intercepta `fetch` e responde com as respostas gravadas de uma
  rodada real sobre a base sintética do repositório
  (`exemplos/BASE_DEMONSTRACAO_ANONIMIZADA_M52.xlsx`).

As telas dos cards ficam em `img/`.
