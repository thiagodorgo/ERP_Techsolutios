# Revisão independente do PR #409 (B-OS-FILTRAR-EXPORTAR)

## VEREDITO: **APROVADO**, com 1 condição de merge (não é defeito do produto)

**Condição de merge:** o PR está `CONFLICTING` com a `main` (`026ff7b8`, depois do #400). O único arquivo em conflito é
`agent-orchestration/controle/pendencias-indice.md`, um índice **gerado**. Resolvê-lo **regenerando** o índice com
`agent-orchestration/controle/gerar-indice-pendencias.py` (não editar à mão), sem tocar em nada fora de
`agent-orchestration/controle/`, e mergear só com os check-runs **concluídos e verdes no head novo**. Medido: no resultado da
mescla, a árvore `frontend/` é a mesma do head revisado (`5babaa4776`), então esta revisão do código continua valendo depois do
rebase.

| Campo | Valor |
|---|---|
| PR | #409 · `feat/web-os-filtrar-exportar` · head `585d178a084678d3a67b0f50527b186ceee87aa9` |
| Base do plano | `c8af6458` (= merge-base medido com `git merge-base origin/main HEAD`) |
| Revisor | identidade independente: não planejou (planejador: Claude Opus) nem desenvolveu (dev: Codex gpt-5.6-sol) |
| Modelo | Claude Opus (bloco sem dinheiro; `D-FABLE-ASTRA-SO-DINHEIRO`) |
| Papel | `frontend-pixel-master`, subordinado ao plano e ao `CLAUDE.md` §11 |
| Rota | `D-GOV-PROPORCIONAL` regra (1): um revisor + CI verde. Classificação do plano §10 conferida: sem dinheiro, sem permissão nova (premissa §0.6), sem escrita. Considero a neutralização de fórmula **endurecimento de formato de saída**, não regra de segurança nova. Não peço junta completa. |
| Terreno | worktree próprio e destacado `C:/Users/AMP/w-rev409` · `npm ci` próprio na raiz (326 pacotes, ec 0) e em `frontend/` (103, ec 0) · sem junction · sem `.env` (só `.env.example`) · `env \| grep DATABASE_URL` vazio · nenhum banco nem Redis ligado (portas 5432/6379 sem escuta) |

---

## 1. Bateria §8.1 re-executada no head (comando · saída · N)

| # | Comando | Resultado medido |
|---|---|---|
| 1 | `npm --prefix frontend run check` | ec 0 |
| 2 | `cd frontend && node --test --import tsx tests/work-orders-list-tools.test.ts tests/work-orders.adapter.test.ts tests/work-orders-page-live.test.tsx` | **47/47**, 0 falha, 0 pulado, ec 0 (15 + 9 + 23: LT1–6, RL1, EX1–8, AD1, FE1–FE10 e os 13 vivos MD0/PV1–7/W1–2/GB1–3) |
| 3 | regressões nomeadas (honest-errors, row-actions, smoke-flow, kpi-cards-clickable, audit-events, auditoria-sessoes, remuneracoes-liquidar, telemetria-web, pattern-css-guard) | **191/191**, ec 0; `[G1]` e `[G1b]` verdes |
| 4 | `npm --prefix frontend run test:smoke` | **1268/1268**, 0 falha, 0 pulado, ec 0 (= 1242 + 26, como o plano previa) |
| 5 | `npm --prefix frontend run build` | ec 0 · 2170 módulos · 8,39 s |
| 6 | `node --test --import tsx tests/approval-frontend-contract.test.ts tests/checklist-editor-blockers-parity.test.ts tests/san3-04a-menu-front-x-catalogo.test.ts` | **16/16**, ec 0 |
| 7 | `npm run check` (raiz), depois de `DATABASE_URL=… npm run db:generate` só no processo | ec 0 (generate ec 0) |
| 8 | `npm test` (raiz) | ec 1 · **2705 testes · 2627 pass · 7 fail · 71 skip**, os mesmos números do dev. As 7 falhas são do ambiente (ver §4) |
| 9 | `npm run build` (raiz) | ec 0 |
| 10 | `node scripts/sync-agent-agents.mjs --check` | ec 0 |
| 11 | `git diff --check c8af6458...HEAD` e `git diff --check origin/main...HEAD` | ec 0, sem saída |
| 12 | escopo (ver §5) | ok |
| 13 | `git grep -nE "\[(LT\|EX\|FE\|AD\|RL)[0-9]+\]" -- frontend/tests \| wc -l` | **26** (piso ≥ 26) |
| 14 | mutações (ver §2) | 4 do plano + 3 novas; 7/7 hashes restaurados |
| 15 | QA visual 1440×900 (ver §3) | feito pelo revisor |

CI do head (`gh api repos/thiagodorgo/ERP_Techsolutios/commits/585d178a…/check-runs`): **7 check-runs, todos `completed/success`**:
backend, backend-postgres, frontend, flutter, docker, owner-portal e authority-portal. Log do job `backend`: `# tests 3054 · pass 3052 ·
fail 0 · skipped 2`. Log do job `frontend`: smoke `1268/1268`.

## 2. Mutações (protocolo §7.3, executor por bytes CRLF, âncora exigida 1×)

Executor: `scratchpad/rev409/work/mutate.mjs`. Por mutação, `git hash-object` → aplica → `git diff --stat` não vazio → os 3 arquivos
do bloco → desfaz → `git hash-object` = H0 e `git diff --stat` vazio. `git status --porcelain` ficou vazio antes e depois.

| Mutação | Arquivo | H0 (= tabela do dev) | Resultado | Esperado | Hash restaurado |
|---|---|---|---|---|---|
| N-SEQ | `useWorkOrders.ts` | `6cb6d864…` | 46/47, vermelho **FE7** | FE7 | sim |
| N-EXP-PAGINA | `WorkOrdersPage.tsx` | `1a6cb6a1…` | 46/47, vermelho **FE3** | FE3 | sim |
| N-FORMULA | `work-orders-export.ts` | `1eef92c0…` | 46/47, vermelho **EX4** | EX4 | sim |
| N-FIM-DO-DIA | `work-orders-list-filters.ts` | `32388c03…` | 44/47, vermelhos **LT2, LT3, FE5** | LT2, LT3, FE5 | sim |
| **M-NOVA-1** (neutralizar só a coluna Cliente) | `work-orders-export.ts` | `1eef92c0…` | **47/47 verde: sobreviveu** | — | sim |
| **M-NOVA-2** (`aria-controls` sempre presente) | `WorkOrdersPage.tsx` | `1a6cb6a1…` | **47/47 verde: sobreviveu** | — | sim |
| **M-NOVA-3** (cartão sem checar `showListActions`) | `WorkOrdersPage.tsx` | `1a6cb6a1…` | 46/47, vermelho **FE10** | FE10 (§7.2) | sim |

Os H0 batem com a tabela de mutações do relatório do dev, para os 4 arquivos. A M-NOVA-3 confirma uma afirmação do §7.2 que
não estava na lista das 16. As duas sobreviventes viram os achados A-2 e N-1.

## 3. QA visual (o dev não fez; feito aqui)

Vite dev do **meu** worktree (`configFile:false`, cache e envDir no scratchpad, nada escrito no repo), `VITE_USE_MOCKS=true`,
`VITE_API_BASE_URL=http://127.0.0.1:59999/api/v1` (porta morta), porta 5199 conferida livre antes. Chromium do Playwright da raiz
(sem dependência nova). Sessão mock `despacho@…` → perfil **Operador Logístico** (Operação de Campo, `work_orders:read` + `create`).
Execução: **0 requisições fora do Vite, 0 `pageerror`, 0 `console.error`**. Medidas em `work/medidas-rev409.json`.

**Imagem para o dono: `scratchpad/rev409/rev409-telas.png`** (11 painéis rotulados A–K). Capturas soltas em `scratchpad/rev409/shots/`.

### 3.1 Tokens dos botões × design (`ERP Web - Telas Padronizadas.dc.html`, `sc_os`, l.248-250)

| Token | Design | App (Filtrar / Exportar), medido | |
|---|---|---|---|
| display / align / gap | flex · center · 7px | flex · center · 7px | ✓ |
| padding | 9px 14px | 9px 14px | ✓ |
| fundo | #fff | rgb(255,255,255) | ✓ |
| borda | 1px solid #E2E8F0 | 1px solid rgb(226,232,240) | ✓ |
| raio | 9px | 9px | ✓ |
| fonte | 12,5px / 700 / #475569 | 12,5px / 700 / rgb(71,85,105) | ✓ |
| hover | borda e texto #2563EB | borda rgb(37,99,235), texto rgb(37,99,235) | ✓ |
| ícone | 15×15 (`#i-filter`, `#i-export`) | 15×15, lucide `funnel` / `download`, `aria-hidden="true"` | ✓ (traço 2 × 1,9: mesmo residual da Auditoria, §5.1) |
| grupo de ações | flex · gap 8 | `.pat-page-header__actions` gap 8px | ✓ |
| ordem | Filtrar · Exportar · Nova OS | Filtrar · Exportar · Nova OS | ✓ |
| altura | 35px (Inter) | **36px** nos três botões | residual conhecido: Inter não carrega e cai para Segoe UI. A `main` mede 36 no "Nova OS" e na Auditoria (item4 `medidas-app.json`) e 35 com Inter injetada. Fora do bloco |
| Nova OS | sem borda | borda 1px #2563EB | residual conhecido (`.pat-btn--primary`, ANALISE §2.2). Fora do bloco |

Cartão de filtros (medido): fundo #fff · borda 1px #E2E8F0 · raio 14px · folga 15px 18px · margem inferior 14px · grade
`1.2fr 1.2fr 1fr 1fr auto` (272/272/227/227/71 px) · gap 12px · `align-items:end` · rótulos 11px/700 #64748B · campos 9px 11px,
borda #E2E8F0, raio 9, 12,5px/600 #334155. Bate com §5.1. Posição: abaixo dos KPIs e acima da pílula e da tabela (cardTop 337 <
toolbarTop 475). Selo: 15×15 px, #2563EB, 10px/800, raio 99px; **o botão continua com 36 px de altura com selo**, base alinhada nos
três (bottom 151,2 px em todos).

### 3.2 Estados e a11y verificados na tela

- Ordem do Tab: … → busca global → **Filtrar → Exportar → Nova OS**. Foco: `outline 2px solid #2563EB`, offset 2px,
  `:focus-visible` verdadeiro (captura C). Enter no Filtrar abre o cartão (`aria-expanded="true"`, `aria-controls="os-filtros"`);
  fechado: `aria-expanded="false"`, sem `aria-controls`.
- Cartão `role="group"` com `aria-label`; 4 rótulos com `for` resolvendo id existente; opções "Todas as prioridades / Urgente / Alta /
  Média / Baixa" e "Qualquer data / Hoje / Últimos 7 dias / Últimos 30 dias", com acento e sem termo técnico.
- Prioridade Alta → "2 ordens", selo "1", nome acessível "Filtrar, 1 filtro ativo". Com o período 01/06–30/06 → selo "2", período
  "Período personalizado", Limpar habilitado. Cartão fechado → selo e azul continuam.
- De > Até → aviso âmbar rgb(180,83,9), 12px/600, `role="status"`.
- Período "Hoje" (mock é de 09/06) → `data-state="empty"`, "Nenhuma OS para os filtros atuais", **1** "Nova OS" na tela (só o do
  cabeçalho), "0 ordens", Exportar `disabled`, opacidade 0,55, `not-allowed`, title "Nenhuma ordem na lista para exportar.". Com o
  Exportar desabilitado, o Tab vai do Filtrar direto ao Nova OS.
- Limpar → selo some, "6 ordens", cartão continua aberto (§3.5).
- 900 px → grade do cartão em 2 colunas (captura J).

## 4. CSV real baixado no navegador

Três downloads via evento `download` do Playwright (`csv-sem-filtro.csv`, `csv-filtro-alta-junho.csv`, `csv-formula.csv`):
- nome sugerido `ordens-de-servico-demonstrativo.csv` (modo mock, §4.2) ✓
- bytes iniciais `ef bb bf` (BOM) ✓ · separador `;` ✓ · quebra `\r\n`, sem LF solto ✓
- cabeçalho exato `Código;Prioridade;Cliente;Serviço;Técnico;Agenda;Atrasada;Situação` ✓; 8 colunas em todas as linhas (a linha com
  `;` interno sai entre aspas)
- sem filtro: 6 linhas = "6 ordens"; com Alta + junho: 2 linhas = "2 ordens" ✓
- acentos íntegros (Média, Técnico, Atribuído, Concluída, "acentuação ção") ✓
- regex UUID: 0 ocorrências; nenhum nome de organização ("Techsolutions"/"Industrial"), nenhuma coordenada, nenhum telefone ✓
- agenda absoluta local: `09/06/2026 12:00` para `15:00Z` (BRT) ✓; "Sem agenda"; Atrasada Sim/Não respeitando a situação (Concluída/
  Cancelada = Não) ✓
- **fórmula**: com a resposta do módulo de mock reescrita **só no navegador** (`page.route`; nenhum arquivo alterado), os clientes
  `=HYPERLINK(…)`, `+5531…`, `@SOMA(A1:A2)` e `-Guincho; …` saíram como `"'=HYPERLINK(""…"")"`, `'+5531999999999`, `'@SOMA(A1:A2)` e
  `"'-Guincho; acentuação ção"` ✓

## 5. As 7 falhas do `npm test` da raiz são do ambiente, não do bloco

| TAP | Teste | Causa medida |
|---|---|---|
| 86 | `tests/core-saas-role-authority.test.ts` (arquivo silencioso) | rodado isolado: `Error: DATABASE_URL is required to initialize Prisma Client.` (banco ausente por mandato) |
| 639, 640 | eventos de domínio de checklist | `code: 'ECONNREFUSED'` (Redis) |
| 1278, 1279, 1280 | fila Redis / worker | `ECONNREFUSED` |
| 2675 | writer `SET … EX` com ida real ao Redis | `ECONNREFUSED` |

Prova de que não vêm do bloco: (a) a superfície backend tem **árvore idêntica** à da base. `git rev-parse c8af6458:<p>` =
`HEAD:<p>` para `src` (21e1c4f2), `tests` (2854a3ec), `scripts` (216ab0f1), `prisma`, `package.json`, `package-lock.json` e
`tsconfig.json`; o resultado no head é, por construção, o da base no mesmo terreno. (b) A CI do head, que tem serviços `postgres:16` e
`redis:7` e `REDIS_URL` (`ci.yml` l.35, 45-64), deu `backend` 3054/3052/0 fail/2 skip e `backend-postgres` success. Não houve remédio
improvisado.

## 6. Escopo

`git diff --name-only c8af6458...HEAD` = 16 caminhos: os 13 de A1..A13 e mais `docs/revisoes/B-OS-FILTRAR-EXPORTAR-plano.md`,
`agent-orchestration/controle/pendencias.md` e `pendencias-indice.md`. Esses 3 vêm **só** do commit do orquestrador `5d8d8f4d`
(`git show --stat`); `git diff --name-only 5d8d8f4d..HEAD` = exatamente 13 caminhos, nenhum de registro nem do plano. Grep dos
proibidos de §2.2 (`src/`, `prisma/`, `tests/`, `scripts/`, `.github/`, `Kpis/`, lockfiles, `csv.ts`, `patterns/`, `useAutoRefresh`,
`App.tsx`, `audit/`, `service/state/types/mock/index` do módulo, `WorkOrdersFilters.tsx`, as duas guardas, `.env`, `CLAUDE.md`,
`AGENTS.md`, `RBAC_MATRIX`): **nenhum**. `frontend/package.json`: comparação por JSON, `test:smoke` = antigo + `" tests/work-orders-list-tools.test.ts"`
e o resto idêntico. Os 13 casos vivos existentes não foram editados: as 3 linhas removidas do arquivo de teste são as mudanças de
arnês autorizadas (A10 a/b/c e §7.2 item 5: `listItem` com overrides, `RouteTable` com url, `installFetch` registrando a URL).
`work-orders-honest-errors.test.tsx` e `pattern-css-guard.test.ts`: `git diff --stat` vazio. Nenhuma dependência nova.

---

## Achados

| Id | Classe | Achado (com evidência) |
|---|---|---|
| **A-1** | **ajuste** (condição de merge, de registro) | PR `CONFLICTING`: `git merge-tree --write-tree --name-only origin/main HEAD` → conflito só em `agent-orchestration/controle/pendencias-indice.md`, um arquivo **gerado**; `pendencias.md` e o código mesclam limpo. Remédio de processo: regenerar o índice pelo script, re-rodar a CI no head novo e mergear só com check-runs concluídos e verdes. Quem resolve é o orquestrador; não é defeito do produto. |
| **A-2** | **ajuste** (teste, não bloqueia) | **M-NOVA-1 sobreviveu.** `[EX4]` se chama "fórmula CSV é neutralizada **em toda célula** de dado livre", mas, na linha, só assere a coluna Cliente (`rowWithFormula[2]`, l.215-218). Uma regressão que neutralizasse só Cliente e deixasse Serviço (título livre) cru passaria verde. O produto **está certo** (`.map(neutralizeCsvFormula)` sobre a linha inteira; CSV real ok), e o plano só exigia Cliente. Mas o título do teste promete uma propriedade que ele não enuncia. Sugestão ao próximo dev: asserir a coluna Serviço (e qualquer célula de texto livre) na mesma linha. |
| **A-3** | **ajuste** (texto do PR, não bloqueia) | O corpo do PR diz "O botão fica desabilitado, com explicação, quando a lista está vazia **ou parcial**". Falso para lista parcial: §4.4 e `exportAvailability` mantêm o botão **habilitado** quando `serverTotal > loaded`; só a dica avisa que o arquivo leva as da tela. O corpo também lista só verdes, omitindo as divergências que o relatório do dev declara (`npm test` raiz vermelho no ambiente local; QA visual não feito). O dono lê o corpo para vetar a premissa, então convém corrigir o texto. |
| N-1 | nota | **M-NOVA-2 sobreviveu.** O §6 do plano diz que `[FE4]` verifica `aria-controls` "só quando aberto", mas nenhum teste assere a **ausência** de `aria-controls` com o cartão fechado (`[FE1]` só olha `aria-expanded`). O produto está certo (medido no navegador: `null` fechado, `os-filtros` aberto). |
| N-2 | nota (UX, padrão herdado da Auditoria) | `<input type="date">` do Chromium: digitar "01062026" produz 4 valores (`0002-06-01`, `0020-06-01`, `0202-06-01`, `2026-06-01`; `work/typing-probe.json`). O memo depende das strings, então cada um gera uma busca em primeiro plano no modo real; a guarda de ordem garante que a última vence. Sem defeito de dado. Possível melhoria futura: aplicar a data no `blur` ou com espera curta. |
| N-3 | nota (pré-existente, gerador de registro) | O índice mostra `P-WO-PRIORIDADE-MEDIA-SEM-ACENTO` como **MÉDIA** (balde A, material), mas a entrada em `pendencias.md` diz **BAIXA**. Causa: `severidade()` de `gerar-indice-pendencias.py` (l.75-80, de 2026-08-29, #362) procura `\bMEDIA\b`/`\bALTA\b` sem distinguir maiúsculas no corpo inteiro, e o próprio ID contém `-MEDIA-`. Qualquer pendência cujo texto diga "Alta"/"média" (rótulos de prioridade, por exemplo) pode ser mal classificada. Escopo `pre-existente`; sugiro pendência própria ao orquestrador. |
| N-4 | nota (visual, herdado) | Limpar desabilitado não tem aparência de desabilitado (não existe `.pat-btn:disabled`), e o Exportar desabilitado fica azul no hover (R10). Os dois são idênticos à Auditoria (`AuditTenantPage.tsx` l.314), declarados no plano e fora do bloco. |
| N-5 | nota | A altura de 36 px (design 35) e a borda do "Nova OS" são resíduos conhecidos e transversais (fonte Inter não carregada; `.pat-btn--primary`), medidos iguais na `main`. Não são deste bloco. |
| N-6 | nota (positivo) | O dev falsificou com razão uma premissa do plano: `Blob.text()` consome o BOM. Por isso `[FE3]` mede os bytes `EF BB BF`. Conferi no navegador real: os bytes estão lá. |

**Nenhum `bloqueia`.** Nada perde dado, vaza entre organizações, quebra permissão ou erra dinheiro. A permissão (premissa §0.6)
segue `work_orders:read`, e em 403 os botões e o cartão somem (`[FE2]`, `[FE10]`, M-NOVA-3).

## Checklist §11 do plano (conferido por execução)

- [x] Escopo ⊆ A1–A13 + plano/registro do orquestrador; nenhum proibido (§6 acima)
- [x] `frontend/package.json` só com o acréscimo no fim de `test:smoke` (comparação JSON)
- [x] Corpo do PR declara a premissa de permissão em seção própria (há a ressalva A-3 sobre outra frase do corpo)
- [x] Cabeçalho Filtrar · Exportar · Nova OS; só `read` → Filtrar · Exportar; 403 sem contêiner (FE1/FE2 verdes; navegador)
- [x] Cartão abre e fecha entre os KPIs e a tabela; `aria-expanded`/`aria-controls`; 4 campos + Limpar (FE4; navegador)
- [x] `priority` e `from`/`to` ISO local, com início e fim do dia; o auto-refresh repete os filtros (FE4/FE5/FE8, LT2/LT3; N-FIM-DO-DIA vermelha)
- [x] Selo 0–2, azul, `.sr-only` (FE4, LT4; navegador)
- [x] Vazio com filtro sem CTA no painel (FE6; navegador)
- [x] Exportar desabilitado com a dica certa (FE2, EX6; navegador)
- [x] 8 colunas, BOM, `;`, linhas = "N ordens", todas as páginas, segue aba e busca (FE3/FE9; N-EXP-PAGINA vermelha; CSV real)
- [x] Sem id/UUID/endereço/telefone/organização; fórmula neutralizada; nome do arquivo (EX3/EX4/EX7; N-FORMULA vermelha; CSV real)
- [x] Corrida (FE7; N-SEQ vermelha)
- [x] Período por abertura (AD1 verde; a mutação N-DATA-AGENDA consta do relatório do dev; não a re-rodei)
- [x] `.pat-btn` sem estilo inline além do desabilitado; ícones `aria-hidden`; CSS novo só `.pat-btn--engaged` e `.pat-btn__count` (diff de `app.css`)
- [x] Botão com selo com a mesma altura dos outros (36 = 36 = 36, residual da fonte); acentos certos
- [x] Bateria §8.1 re-executada (§1); `npm test` vermelho só por ambiente (§5)
- [x] ≥ 3 mutações do §7.3 vermelhas e hashes restaurados (4 + 3 novas)
- [x] 13 casos vivos, `[G1]`/`[G1b]` e guard de CSS verdes sem edição
- [x] CI com check-runs concluídos e verdes **no head 585d178a** (7/7). Depois do rebase (A-1), exigir de novo no head novo
- [x] Relatório do dev com checklist, tabela de 16 mutações com hashes e linha de limpeza

## Limpeza do revisor

- Vite (PID **21744**, `node vite-server.mjs 5199`, conferido por `Win32_Process` antes do kill) finalizado com `taskkill //PID 21744 //F`;
  depois disso, `netstat` sem escuta em 5199 nem 59999.
- Chromium: cada roteiro fecha o navegador no `finally`. Contagem por linha de comando (`*ms-playwright*`, `*w-rev409*`,
  `*vite-server.mjs*`, sem os shells da consulta) = **0 vivos** antes da remoção.
- `git status --porcelain` do worktree vazio (nenhuma mudança rastreada; as mutações voltaram ao hash), então
  `git worktree remove --force C:/Users/AMP/w-rev409` → ec 0, diretório ausente, `git worktree list` sem `w-rev409`.
  `w-osfe` (585d178a) e `w-o05` (dee3f821) intactos; nenhum dos dois nem a árvore principal recebeu escrita.
- Scratchpad: apagado só `work/vite-cache` (15 MB, regenerável) e `work/vite.pid`. Ficam como evidência (6,6 MB): este parecer,
  `rev409-telas.png`, `shots/`, os 3 CSVs, os logs da bateria e das mutações, `mutacoes.json`, `work/medidas-rev409.json`,
  `work/typing-probe.json` e os roteiros.
