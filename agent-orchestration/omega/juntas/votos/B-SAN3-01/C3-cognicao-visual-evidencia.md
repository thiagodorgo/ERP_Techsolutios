# C3 cognicao-visual — evidência (B-SAN3-01, PR #387, objeto bb540fb3)

- Modelo: claude-opus-5[1m] (Opus 5)
- Início: 2026-09-18
- Estado: EM APURAÇÃO (apensado incrementalmente, P2)

## M0 — Terreno da cadeira (anomalia registrada antes de qualquer medição)

- Ao começar (10:22), `votos-B-SAN3-01/` já tinha `C3-cognicao-visual-voto.json` (173 B, 10:16) e `-evidencia.md` (228 B, 10:16) de uma instância anterior da C3 que não consta em `00-quedas.md` (última entrada 09:29). **Eu os sobrescrevi com o meu esqueleto antes de medir** (erro de ordem meu: não li o diretório antes de escrever). Pelo tamanho, eram só esqueletos (o voto de 173 B tem o tamanho exato do esqueleto do briefing com veredito EM APURAÇÃO e achados vazios; a evidência de 228 B cabe só um cabeçalho). Nenhuma medição foi perdida que eu possa afirmar; declaro a sobrescrita para a ata/P6.
- `git worktree list` já mostrava `.claude/worktrees/j-bsan301-c3` em `bb540fb3` (detached), criado 10:16:34, com `node_modules` (raiz 10:17, 222 entradas) e `frontend/node_modules` (10:18, 61 entradas) — instalados pela instância anterior. `git -C j-bsan301-c3 status --porcelain` → 0 linhas; `rev-parse HEAD` → `bb540fb3139031f40eea93ec5d7a47e987167bc2`.
- Processo concorrente? `Get-CimInstance Win32_Process | ? CommandLine -match 'j-bsan301-c3'` às 10:22:42 → só o meu próprio comando. `docker ps -a | grep c3` → nenhum contêiner `j-bsan301-c3-*`. Conclusão: instância anterior inativa (provável queda). Reuso o worktree com o nome da minha cadeira e **refaço `npm ci` e `npm --prefix frontend ci` eu mesmo** para não herdar instalação que não vi.
- `npm ci` (raiz) → `ROOT_EC=0`; `npm --prefix frontend ci` → `FRONT_EC=0` (logs `scratchpad/c3-npmci-*.log`); `git -C j-bsan301-c3 status --porcelain | wc -l` → 0. Sem junction (diretórios criados pelo próprio npm).

## M1 — Ficha de estilo do protótipo (EXTRAÇÃO, antes do veto)

Fonte dos estados da lista de OS: `docs/claude-code-handoff/ERP Web.dc.html` (lido em `bb540fb3`). O protótipo define 6 estados da lista (`woStateChips`, l.3315-3318: normal · loading · empty · offline+cache · error · noperm). O protótipo padronizado `ERP Web - Telas Padronizadas.dc.html` (`0a38f1be`, #331, 2026-08-04; `sc_os` l.239-316) redesenha cabeçalho/KPIs/tabela (é a origem das classes `pat-os-*`) e **não desenha nenhum estado** (grep de erro/vazio/permissão/desatualizado → 0) — então os estados vêm do `ERP Web.dc.html`.

| Estado | Protótipo (arquivo:linha) | Ficha |
|---|---|---|
| vazio | `ERP Web.dc.html:362-368` | card `#fff`, borda `1px #E2E8F0`, raio 13, padding `54px 32px`, coluna centrada gap 10; círculo 60×60 `#F1F5F9` com ícone OS 28px `#94A3B8`; título 16/800 `#334155` "Nenhuma OS para os filtros atuais"; detalhe 13 `#94A3B8` max-w 330 lh 1.5; CTA primário "Nova OS" (`#2563EB`, padding `10px 18px`, raio 10, 13/700 branco) |
| erro | `:370-376` | card `#fff`, **borda `1px #FECACA`**, raio 13, padding `50px 32px`; círculo 60×60 **`#FEF2F2` ícone alerta `#DC2626`** 28px; título 16/800 `#334155` "Não foi possível carregar as ordens"; detalhe 13 `#94A3B8` max-w 340; **botão primário cheio** "Tentar novamente" (`#2563EB`, padding `10px 20px`, raio 10, 13/700 branco) |
| sem permissão | `:378-382` | card borda `#E2E8F0`, padding `50px 32px`; círculo 60×60 `#F1F5F9` **ícone escudo** 26px `#94A3B8`; título 16/800 `#334155` "Sem permissão para ver ordens de serviço"; detalhe 13 `#94A3B8` (cópia do protótipo diz "tenant" — §3 manda "organização") |
| offline + cache (= desatualizado) | `:322-324` | faixa `#FFFBEB`, borda `#FDE68A`, raio 10, padding `10px 14px`, mb 12; ícone alerta 16px `#D97706`; texto 12.5/600 `#92400E` |
| carregando | `:351-360` | skeleton de 5 linhas `#EEF1F5`/`#F1F5F9` |

Detalhe da OS: o protótipo não desenha não-encontrada/erro/sem-permissão (grep `encontrad|indispon` → 0); a referência do detalhe é o painel "não encontrada" que já existia no próprio arquivo (`02bd7dab:WorkOrderDetailPage.tsx:50-57`) e a gramática de estados da lista acima.

## M2 — Terreno de execução (back + front reais, sem mocks)

- Portas: `netsh int ipv4 show excludedportrange protocol=tcp` → faixas 5357, 49680-50559, 51083-51918, 56500-57306, 60966-61165; 56413/56414/3213/5213 fora e sem escuta (`netstat -ano`).
- `docker run -d --name j-bsan301-c3-pg ... -p 127.0.0.1:56413:5432 postgres:16` · `docker run -d --name j-bsan301-c3-redis -p 127.0.0.1:56414:6379 redis:7-alpine` → Up.
- **URLs usadas (sem senha):** `DATABASE_URL=postgresql://postgres:***@127.0.0.1:56413/erp_techsolutions?schema=public` · `REDIS_URL=redis://127.0.0.1:56414`. Worktree sem `.env` (só `.env.example`).
- `npx prisma generate` → ec 0 · `npx prisma migrate deploy` → "All migrations have been successfully applied." ec 0 · `npm run db:seed` → "The seed command has been executed." ec 0.
- API: `CORE_SAAS_PERSISTENCE=prisma NODE_ENV=test PORT=3213 npx tsx src/server.ts` (+ as duas URLs) → `GET /api/v1/health` 200. Web: `VITE_API_BASE_URL=http://127.0.0.1:3213/api/v1 VITE_USE_MOCKS=false npx vite --port 5213` → 200.
- Captura: `scratchpad/c3-capture.cjs` (Playwright chromium, 1440×900, login `admin.demo@example.com` = `tenant_admin`, recusas forçadas por `page.route`) → ec 0; 20 PNG em `scratchpad/c3-shots/` + `facts.json` (data-state, KPIs, alertas, estilo computado, varredura de termo técnico/UUID/mock no `innerText`). Protótipo renderizado por `scratchpad/c3-proto.cjs` (file:// do `ERP Web.dc.html`, chips de estado) → `p-vazia/p-erro/p-sem-permissao/p-offline/p-normal.png`.

## M3 — Lista de OS: erro × vazio × sem permissão, lado a lado com o protótipo

Estilo computado (facts.json):
- `02-lista-erro` `[data-state=error]`: padding `48px 18px`, **borda nenhuma** (`0px none`), fundo transparente; título **14px/700 `rgb(15,23,42)`=#0F172A**; detalhe **12.5px `rgb(100,116,139)`=#64748B**; "Tentar novamente" = `.pat-link` (12px/700, sem fundo). **Sem ícone.**
- `03-lista-403` `[data-state=forbidden]`: mesmo `statePanel`/`stateTitle`/`stateDetail` — padding `48px 18px`, sem borda, título 14/700 #0F172A, detalhe 12.5 #64748B. **Sem ícone.**
- `01-lista-real` (seed sem OS) `[data-state=empty]`: idem, texto "Nenhuma ordem de serviço".
- Protótipo (`p-erro.png`, `ERP Web.dc.html:370-376`): card com **borda #FECACA**, círculo 60px **#FEF2F2 + alerta #DC2626**, título 16/800 #334155, detalhe 13 #94A3B8, **botão primário cheio** "Tentar novamente". `p-sem-permissao.png` (`:378-382`): círculo #F1F5F9 + **escudo** #94A3B8, título 16/800. `p-vazia.png` (`:362-368`): círculo + ícone OS + CTA "Nova OS".
- Resultado a olho (02 × 03 lado a lado): o painel de erro e o de sem permissão têm **a mesma forma, a mesma cor e o mesmo peso** — só o texto difere (e o erro tem um link azul). O protótipo separa os dois por cor (vermelho × cinza) e por ícone (alerta × escudo).
- Origem: `git show 02bd7dab:.../WorkOrdersPage.tsx | grep -c 'data-state="error"'` → 0; `'Acesso não permitido'` → 0; `'Não foi possível carregar as ordens de serviço'` → 0; em `bb540fb3` → 1 cada (l.575-591). Os painéis de erro e de sem permissão **nascem neste bloco**, no arquivo permitido (`frontend/src/modules/work-orders/**`). O painel de vazio só-texto é anterior (`git log -S"As ordens atribuídas à sua organização aparecem aqui."` → `38facb24`, 2026-07-03, #117) e foi movido para `WorkOrdersLoadState` com a mesma forma.
- Comando do bloco (`B-SAN3-01-web-wo-sem-fallback-fabricado.md`, "Contexto"): **"Estados obrigatórios (§7): error e empty recriados do protótipo"**.
- Veredito parcial: **divergência de cor e de espaçamento nos painéis novos** (borda #FECACA ausente; ícone #FEF2F2/#DC2626 ausente; título #0F172A×#334155 e 14/700×16/800; detalhe #64748B×#94A3B8; padding horizontal 18×32 = 14px fora de ±2px; retry link×botão). Erro e sem permissão não são distintos a olho.

## M4 — Detalhe, criação, desatualizado (capturas 04-11)

- `06-detalhe-404` (404 real do backend): `[data-state=not-found]`, padding 40, título 15/800 #0F172A, detalhe 13 #64748B, botão "Voltar às ordens". Forma idêntica à de `02bd7dab` (pré-existente).
- `07-detalhe-403`: `[data-state=forbidden]` — **mesma forma, cor, peso e botão** do não-encontrada; só o texto muda ("Acesso não permitido"). Novo no bloco (`git show 02bd7dab:.../WorkOrderDetailPage.tsx | grep -c 'data-state'` → 0).
- `08-detalhe-500`: `[data-state=error]` role=alert, "Tentar novamente" (primário) + "Voltar às ordens" (secundário, borda #BFDBFE) — distinguível do 404/403 pelo segundo botão; sem ícone nem cor de erro.
- `04b-criar-422`: URL segue `/work-orders/new`; título digitado preservado (`titleValue` = o digitado); `Alert` do repo, tom `danger` (fundo rgb(255,240,239), borda rgb(220,106,96), texto #DC2626) "Não foi possível salvar a OS / Este tipo de serviço exige endereço de destino." — distinto e sem termo técnico. Ao lado: o formulário (não tocado) mostra "ORDENS DE SERVICO", "Identificacao", "Titulo", "Descricao", "Media" sem acento (pré-existente, ver achado de nota).
- `09-timeline-500`: `[data-state=error]` "Histórico indisponível no momento." em #B45309 — distinto de "Sem eventos registrados." (#94A3B8). OS real `OS-000001` (criada nesta sessão, não mock) segue na tela.
- `10b-lista-stale` e `11-detalhe-stale` (refresh de fundo 503 após 32 s): faixa `[data-state=stale]` role=status, fundo rgb(255,251,235)=#FFFBEB, borda #FDE68A, texto #92400E 12.5/600, padding 10px 14px, raio 10 — **bate com o protótipo** (`ERP Web.dc.html:323`) exceto o ícone (14px na cor do texto #92400E × 16px #D97706 — padrão `.pat-banner--warning` pré-existente). A lista (1 OS) e o detalhe **ficam** na tela; "última atualização às 10:36" com horário real.
- KPIs no erro (`02`/`03`): os 4 valores "—", sem selo, sem pop-up, "N ordens" some. **Mas o ícone de "Atrasadas" fica verde** (#15803D sobre #F0FDF4 — a cor de "sob controle") no estado degradado: `WorkOrdersPage.tsx@bb540fb3` `iconColor={!degraded && kpis.atrasadas > 0 ? "#DC2626" : "#15803D"}`.
- Varredura de termo técnico/UUID/mock no `innerText` das telas de OS (facts.json): 0 UUID, 0 `fallback/mock/API/HTTP/invalid_*/WORK_ORDER_*`; único "Tenant" = nome da organização do seed no seletor do topo ("Tenant Demo", dado do seed, fora do bloco).

## M5 — Despachos e Dashboard: vazio honesto? (capturas 12-13)

- `12a-despachos-real` (API real, 0 despachos): cards 0 + `EmptyState` "Nenhum despacho encontrado / Ajuste status, prioridade, operador ou busca por OS."; sem alerta; 0 termo técnico, 0 mock → **vazio honesto**.
- `12b-despachos-500` / `12c-despachos-403`: alerta âmbar **"Dados demonstrativos"** + "A consulta aos despachos falhou…" / "Sem permissão para consultar os despachos." **+ os 7 cards com "0" (clicáveis, pop-up de composição) + o `EmptyState` "Nenhum despacho encontrado / Ajuste status, prioridade, operador…"** debaixo do alerta. Nada fabricado, mas o erro sai rotulado como demonstração, com contagem zero e com o vazio; 500 e 403 só se distinguem pelo texto do alerta. Código: `OperationsDispatchesPage.tsx@bb540fb3:98-102` (alerta), `:125-127` (vazio), `DispatchesSummaryCards` (cards). Origem: alerta e vazio `5aa14ec8` (2026-06-10); cards `308c9efb` (2026-07-20). Fora do escopo (a emenda (a) limita a página ao `loadDetail`).
  - Pendência registrada pelo bloco: `P-SAN3-01-DESPACHOS-ALERTA-DADOS-DEMONSTRATIVOS` (`pendencias.md@bb540fb3:9379-9386`) cobre **só o título**; afirma que os cards "ficam zerados — não fabricam" e o teste de encerramento (500 → `data-state="error"` sem "demonstrativos"; 403 → `forbidden`) **não pede** a ausência do "0" nem do vazio sob o erro. Dono declarado `B-SAN3-06a` "(dono de `operations/**` da web)" — mas o escopo do `B-SAN3-06a` em `PLANO_SAN3.md@bb540fb3:270` é `frontend/src/modules/{purchase-orders,reports}/**`, `modules/dispatch/pages/DispatchConsolePage.tsx` e os arquivos de menu; `git show bb540fb3:docs/revisoes/SAN3/PLANO_SAN3.md | grep -n "modules/operations"` → só a linha do `B-SAN3-01` (l.265). **Nenhum bloco SAN3 tem `operations/dispatches/pages/**` no escopo.**
- `13a-dashboard-real`: painel "Despachos ativos" → "Nenhum despacho ativo no momento." sem selo → honesto.
- `13b-dashboard-desp-500`: faixa âmbar "Alguns dados de campo estão indisponíveis agora. Exibindo o que foi possível carregar." **+ selo "Despachos: Fallback local"** (termo interno visível; varredura do `innerText` achou `Fallback`) **+ "Nenhum despacho ativo no momento."** no painel — afirmação de vazio sobre consulta que falhou. `frontend/src/pages/DashboardPage.tsx@bb540fb3:167` (selo, origem `0a38f1be` 2026-08-04 #331) e `:496` (vazio, origem `dcfa2506` 2026-07-05 #125); `git diff --quiet 02bd7dab bb540fb3 -- frontend/src/pages/DashboardPage.tsx` → ec 0 (não tocado); `frontend/src/pages/**` é proibido ao bloco. Antes do bloco o mesmo erro mostrava 4 despachos inventados com o mesmo selo; o bloco trocou a ficção pelo vazio. **Nenhuma pendência do bloco nomeia o Dashboard** (grep `P-SAN3-01-` em `pendencias.md@bb540fb3` → 10 IDs, nenhum de Dashboard), embora o §8.2 R1 do plano o tenha previsto e delegado a esta cadeira.

## M6 — Hover/foco dos elementos interativos novos (`scratchpad/c3-hover.cjs`, ec 0)

| Elemento | Hover muda? | Foco (Tab) |
|---|---|---|
| lista-erro "Tentar novamente" (`.pat-link`) | sim (#2563EB→#1D4ED8 + sublinhado) | `solid 2px #2563EB` (padrão) |
| stale "Tentar novamente" (`.pat-link`) | sim (mesma classe) | idem |
| detalhe-erro "Tentar novamente" (inline, novo) | **não** (bg rgb(37,99,235) antes e depois) | anel padrão do navegador `auto 1px rgb(16,16,16)` |
| detalhe-erro "Voltar às ordens" (inline, novo) | **não** | idem |
| detalhe-403 "Voltar às ordens" (inline, novo) | **não** | idem |
| detalhe-404 "Voltar às ordens" (inline, pré-existente `02bd7dab`) | não | idem |

Protótipo: `ERP Web - Telas Padronizadas.dc.html` dá `style-hover="background:#1D4ED8"` ao primário e `button:focus-visible{outline:2px solid #2563EB;outline-offset:2px}` (l.20). Os três botões novos do detalhe clonam o botão sem hover do não-encontrada.

## M7 — Cópia e tokens
- Sem termo técnico nas mensagens novas (M4). `createErrorMessage` cai em `ApiError.safeMessage` (`client.ts:22-27`: frases PT-BR por status) — sem `reason`/`code`.
- Pré-existente no formulário de criação (arquivo `WorkOrderForm.tsx` não tocado; eyebrow no `WorkOrderCreatePage.tsx:45`, linha não tocada): "Ordens de Servico", "Identificacao", "Titulo", "Descricao" sem acento — origem `9f12ea99` (2026-06-09).
- Hex novos fora do `tokens.css`: `#BFDBFE` (borda do botão secundário do detalhe-erro) e um `#B45309` a mais ("Histórico indisponível") — `grep -c` em `frontend/src/styles/tokens/tokens.css` → 0 para ambos. A página inteira já usa hex inline (convenção pré-existente do padrão `pat`).
- **Correção de numeração (M5):** em `bb540fb3` o alerta "Dados demonstrativos" está em `OperationsDispatchesPage.tsx:103-107` (título l.104), os cards em l.109 e o `EmptyState` em l.130 (os "98-102" da pendência são do head-base `b2da5ede`). Detalhe: `WorkOrderDetailPage.tsx@bb540fb3` l.88-92 (estilos), l.121 (forbidden), l.130 (not-found), l.138 (error). Lista: `WorkOrdersPage.tsx@bb540fb3` l.228 (`degraded`), l.315/317 (painéis), l.524 (ícone de Atrasadas), l.551-597 (`WorkOrdersLoadState`). `GeneralInfoTab.tsx@bb540fb3:175`.
- **Correção (M6):** a regra `button:focus-visible{outline:2px solid #2563EB;outline-offset:2px}` está na l.21 do `ERP Web - Telas Padronizadas.dc.html` (não l.20); `style-hover="background:#1D4ED8"` do primário em l.127/l.251.

## M8 — Limpeza (pelo nome)
- Servidores: API (`tsx src/server.ts`, porta 3213) e web (`vite --port 5213`) encerrados por PID (`taskkill /F`); `Get-CimInstance ... -match 'j-bsan301-c3'` → 0; `netstat` LISTEN em 3213/5213 → 0.
- `docker rm -f j-bsan301-c3-pg j-bsan301-c3-redis` → removidos; `docker ps -a | grep -c j-bsan301-c3` → 0.
- `git -C bsan301 worktree remove --force .../j-bsan301-c3` → ec 0; `worktree list | grep -c j-bsan301-c3` → 0. `bsan301`: `status --porcelain` 0 linhas, HEAD `74f3f7c9` (intocado). `j-bsan301-c2` (outra cadeira) e `san2-r` (resíduo alheio, R5) não tocados.
- Mantidos no scratchpad como evidência: `c3-capture.cjs`, `c3-proto.cjs`, `c3-hover.cjs`, `c3-capture.out`, `c3-shots/` (25 PNG + `facts.json`). Logs de npm/servidor apagados. Nada escrito em `bsan301`, na árvore principal nem na base viva.
- Estado deste arquivo: FINAL.
- **Correção (M8):** `c3-shots/` tem 23 PNG + `facts.json` (não 25). `scratchpad/c3-npmci.log` (10:18, "front ec=0") é da instância anterior da C3 — não é meu, não tocado.

## Veredito
**REPROVADO**. Bloqueia dentro do bloco: C3-B1 (os painéis de erro e de sem permissão da lista de OS nascem sem o estado desenhado no protótipo; divergência de cor e de espaçamento; erro e sem permissão não se distinguem a olho). 11 achados: bloqueia 2 (1 dentro-do-bloco, 1 pré-existente → pendência Dashboard), ajuste 5 (4 dentro, 1 pré-existente), nota 4. Detalhe no `C3-cognicao-visual-voto.json`.
