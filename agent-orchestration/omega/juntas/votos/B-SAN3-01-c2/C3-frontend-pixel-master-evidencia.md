# Evidência — C3 `frontend-pixel-master` — junta B-SAN3-01, ciclo 2 (objeto `8adaaa31`)

- Modelo que rodou: Opus 5 (`claude-opus-5[1m]`), herdado da sessão (R-E).
- Declaração (R-C / §2-bis C3): identidade NOVA nesta cadeira; o ciclo 1 da C3 foi da `cognicao-visual` (que achou C3-B1). Fui suplente nomeado da C3 no briefing v2 do ciclo 1 e NÃO fui acionado; nada do caso lido antes deste briefing. Não planejei, não desenvolvi, não consertei nada.
- Somente leitura no código (R-E): escrevo só no scratchpad e no meu worktree `j-bsan301-c3` para medir.

## Medições (P2, incremental)

### M0 — Terreno da cadeira
- P1/P2: `ls votos-B-SAN3-01-c2/ | grep C3` → nenhum arquivo C3 antes do meu esqueleto (nada a copiar para `*.parcial-anterior.*`).
- `git -C bsan301 -c core.longpaths=true worktree add --detach .../j-bsan301-c3 8adaaa31` → "HEAD is now at 8adaaa31"; `rev-parse HEAD` → `8adaaa31f3709e2a01ad81b8154aba0243fa7a66`; `status --porcelain | wc -l` → 0. (O diretório `j-bsan301-c3` NÃO existia; havia `j-bsan301-c2`, da cadeira C2 — não tocado.)
- `npm ci` (raiz) → "added 326 packages", exit 0; `npm --prefix frontend ci` → "added 103 packages", exit 0 (logs `c3-npm-ci-root.log`/`c3-npm-ci-front.log`). Diretórios reais criados pelo npm, sem junction.
- Portas: `netsh int ipv4 show excludedportrange protocol=tcp` → faixas 5357, 49680–50559, 51083–51918, 56500–57306, 60966–61165; 56413/56414/3313/5313 fora delas e sem LISTEN antes. Contêineres alheios vistos e não tocados: `j-bsan301-c2-pg/redis` (56411/56412), `j-b04a-*`, `bsan301-*`, `pastrack-*`, `erp-*`.
- `docker run -d --name j-bsan301-c3-pg ... -p 127.0.0.1:56413:5432 postgres:16` + `docker run -d --name j-bsan301-c3-redis -p 127.0.0.1:56414:6379 redis:7-alpine` → Up; `pg_isready` → accepting connections.
- **URLs (sem senha):** `DATABASE_URL=postgresql://postgres:***@127.0.0.1:56413/erp_techsolutions?schema=public` · `REDIS_URL=redis://127.0.0.1:56414` — exportadas ANTES do `prisma generate` (R-H). Worktree sem `.env`.
- `npx prisma generate` → ok · `npx prisma migrate deploy` → "All migrations have been successfully applied." · `npm run db:seed` → "The seed command has been executed." · `select count(*) from _prisma_migrations` → 107 · `select count(*) from work_orders` → 0 · usuários: `admin.demo@example.com`, `platform.admin@erp.local`.
- API: `CORE_SAAS_PERSISTENCE=prisma NODE_ENV=test PORT=3313 LOG_LEVEL=warn npx tsx src/server.ts` (+ as duas URLs) → `GET /api/v1/health` 200. Web: `VITE_API_BASE_URL=http://127.0.0.1:3313/api/v1 VITE_DEFAULT_TENANT_ID="" VITE_USE_MOCKS=false npx vite --host 127.0.0.1 --port 5313 --strictPort` → 200 (vite v6.4.2). Mocks DESLIGADOS.

### M1 — Ficha extraída do protótipo (FATO, lido na ref `8adaaa31`)
`sed -n 300,385p "docs/claude-code-handoff/ERP Web.dc.html"` + lógica dos chips l.3315-3318 (`woShowTable = normal||offline`; vazio/erro/sem permissão TROCAM o card da tabela; busca e filtros l.306-313 ficam FORA do card e seguem na tela). Ícones: `w-alert` l.72, `w-shield` l.76, `w-os` l.92.

| Estado | Card | Círculo 60×60 | Ícone | Título | Detalhe | Ação |
|---|---|---|---|---|---|---|
| vazio l.362-368 | #fff, 1px #E2E8F0, r13, 54px 32px, coluna, gap 10 | #F1F5F9 | w-os 28 #94A3B8 | 16/800 #334155 | 13 #94A3B8, max 330, lh 1.5 | "Nova OS" 10px 18px, #2563EB, r10, 13/700, sem borda, mt 6 |
| erro l.370-376 | #fff, 1px **#FECACA**, r13, 50px 32px | **#FEF2F2** | w-alert 28 **#DC2626** | 16/800 #334155 | 13 #94A3B8, max 340 | "Tentar novamente" 10px 20px (demais iguais) |
| sem permissão l.378-382 | #fff, 1px #E2E8F0, r13, 50px 32px | #F1F5F9 | w-shield **26** #94A3B8 | 16/800 #334155 | 13 #94A3B8, max 340 ("tenant" → §3 manda "organização") | nenhuma |

Hover/foco do padrão: `ERP Web - Telas Padronizadas.dc.html` (primário `style-hover background:#1D4ED8`; `button:focus-visible{outline:2px solid #2563EB;outline-offset:2px}`). `screen-refs/web/` não tem PNG dos estados → referência = protótipo renderizado.

### M2 — Estilo COMPUTADO, protótipo renderizado × app real
Script `scratchpad/c3c2-measure.cjs` (exit 0; saída `c3c2-measure.out`; fatos `c3c2-shots/facts.json`); 1440×900; login `admin.demo@example.com` (tenant_admin); recusas por `page.route`. Protótipo por `file://` com o chip de estado; app em `http://127.0.0.1:5313` (API real 3313, mocks desligados). Posições relativas ao canto do card (px).

**Erro — protótipo l.370-376 × lista 500 (`[data-state=error]`, role=alert)**

| Medida | Protótipo | App | Δ |
|---|---|---|---|
| card | 1156×293, #fff, 1px rgb(254,202,202)=#FECACA, r13, 50px 32px, flex col, gap 10 | 1156×297, idem | h +4 (soma dos Δ abaixo) |
| círculo | (548,51) 60×60 rgb(254,242,242)/rgb(220,38,38) | (548,51) 60×60 idem | 0 |
| ícone | `#w-alert` 28×28 em (564,67) | `lucide-triangle-alert` 28×28 em (564,67), stroke #DC2626 | 0 |
| título | y121 h20 w278.5, 16px/800 rgb(51,65,85) | y121 h21 w277.2, 16px/800 rgb(51,65,85) | h +1 |
| detalhe | y151 w340, 13px rgb(148,163,184), max 340, lh 19.5 | y152 w340, idem | y +1 |
| botão | y206 155.4×36, #2563EB, 10px 20px, r10, 13/700, **borda 0 none** | y207 152.7×39, `pat-btn pat-btn--primary`, #2563EB, 10px 20px, r10, 13/700, **borda 1px solid #2563EB** | y +1 · h +3 · w −2.7 |

Cópia: "Não foi possível carregar as ordens" (= protótipo) + "A consulta às ordens de serviço falhou. Tente novamente em instantes." (sem "API").

**Sem permissão — protótipo l.378-382 × lista 403 (`[data-state=forbidden]`, sem role)**: card 1156×241 × 1156×242 (Δh +1); borda #E2E8F0, r13, 50px 32px iguais; círculo (548,51) #F1F5F9/#94A3B8 igual; ícone escudo 26×26 em (565,68) igual (`#w-shield` × `lucide-shield`); título 16/800 #334155, texto idêntico; detalhe 13 #94A3B8 max 340, "neste tenant" → "nesta organização" (§3); **nenhum botão** nos dois.

**Vazio — protótipo l.362-368 × lista vazia real (base sem OS, `[data-state=empty]`, D-C2-1 embutido)**: protótipo = card próprio 1156×301, 1px #E2E8F0, r13. App = painel 1154×283.5 SEM borda própria dentro do card da tabela (`1px solid rgb(226,232,240)`, **r14**, w1156); a toolbar fica (busca `aria-label="Buscar por código, cliente ou endereço"`, 4 abas, "0 ordens") e o cabeçalho de colunas (CÓDIGO…AÇÃO) também. Miolo: padding 54px 32px igual; círculo em y55 (protótipo, inclui a borda de 1px do card) × y54 (app, painel sem borda) = mesma distância à caixa de padding; `lucide-clipboard-list` 28 #94A3B8 (= `w-os`); título 16/800 #334155 "Nenhuma ordem de serviço" (sem filtro) / "Nenhuma OS para os filtros atuais" (com filtro, = protótipo); detalhe 13 #94A3B8 max 330 lh 19.5 igual; CTA "Nova OS" (sem filtro, com `work_orders:create`) 90.8×39 × 90.5×36, 10px 18px, r10, 13/700, #2563EB (Δh +3, mesma causa do botão do erro). Com filtro (`i06`): sem CTA, detalhe "Ajuste a busca ou os filtros acima — ou crie uma nova ordem de serviço."

**Detalhe (sem ficha própria no protótipo; gramática da lista aplicada)**: `i07` 404 real do backend → `not-found`, borda #E2E8F0, círculo #F1F5F9 + `lucide-clipboard-list` 28 #94A3B8, 16/800 #334155, 13 #94A3B8, "Voltar às ordens" primário. `i08` 403 → `forbidden`, borda #E2E8F0, círculo #F1F5F9 + `lucide-shield` 26 #94A3B8, "Acesso não permitido", "Voltar às ordens" primário. `i09` 500 → `error` role=alert, borda #FECACA, círculo #FEF2F2 + `lucide-triangle-alert` 28 #DC2626, "Tentar novamente" (`pat-btn pat-btn--primary`) + "Voltar às ordens" (`pat-btn`, #fff, borda #E2E8F0, texto #475569). Nenhum `#BFDBFE`. 404 × 403 × 500 distintos a olho: prancheta × escudo (cinza) × alerta (vermelho + borda vermelha). Composição lado a lado: `c3c2-shots/sbs-estados.png`.

**Lista 200 sem `items`** (`i04`): `data-state` = ["error"] — erro, não vazio.

### M3 — Hover e foco por TECLADO (Tab real até o elemento)

| Botão | Antes | Hover | Foco (`:focus-visible` = true) |
|---|---|---|---|
| lista-erro "Tentar novamente" | bg rgb(37,99,235) | bg rgb(29,78,216)=#1D4ED8 | `solid 2px rgb(37,99,235)`, offset 2px (55 Tabs) |
| vazio "Nova OS" | rgb(37,99,235) | #1D4ED8 | `solid 2px rgb(37,99,235)`, offset 2px (64 Tabs; `c3c2-measure2.cjs`); clique → `/work-orders/new` |
| detalhe-404 "Voltar às ordens" | rgb(37,99,235) | #1D4ED8 | solid 2px #2563EB, offset 2px |
| detalhe-403 "Voltar às ordens" | rgb(37,99,235) | #1D4ED8 | solid 2px #2563EB, offset 2px |
| detalhe-500 "Tentar novamente" | rgb(37,99,235) | #1D4ED8 | solid 2px #2563EB, offset 2px |
| detalhe-500 "Voltar às ordens" (secundário) | #fff, texto #475569, borda #E2E8F0 | texto e borda rgb(37,99,235) | solid 2px #2563EB, offset 2px |
| protótipo "Tentar novamente" (controle) | #2563EB | sem mudança (o `ERP Web.dc.html` não tem hover) | `auto 1px` (padrão do navegador) |

### M4 — KPIs com "—" (C3-A3) e desatualizado
- `i02`/`i03` (500 e 403): os 4 tiles `rgb(148,163,184)` sobre `rgb(241,245,249)` (#94A3B8/#F1F5F9), valor "—", sem selo (`tag: null`), `cursor: auto`. Nenhuma cor de sucesso/perigo sobre "—".
- `i01` (base vazia real, status empty): "0" com cores e selos ("no prazo", "sob controle", "finalizadas") — número REAL, não desconhecido.
- `i10` (1 OS real, refresh de fundo 503 após 33 s): `[data-state=stale]` role=status, #FFFBEB / #FDE68A / #92400E, 10px 14px, r10, "Dados desatualizados — última atualização às 21:38 Tentar novamente"; a linha da OS FICA (`.pat-os-row` = 1); só o estado `stale` presente. Distinto do erro (faixa âmbar sobre o dado × card vermelho no lugar do dado).

### M5 — Cópia técnica e andaime (§3, §11)
- Varredura do `innerText` do body em i01/i02/i03/i04/i07/i08/i09 (regex: fallback/mock/API/HTTP/null/undefined/NaN/WORK_ORDER_*/invalid_*/forbidden/not_found/unavailable/tenant/TODO/PLANNED/WIP/stub/placeholder, `/api/v1…`, `P0\d`, `B-SAN3`, `data-state`, `OS-000nnn`, `OS-FALLBACK`, UUID): único termo = "Tenant" de **"Tenant Demo"**, nome da organização no seletor do topo = DADO do seed (`prisma/seed.ts:214,219`), fora do bloco. 0 UUID, 0 andaime.
- Strings novas do diff `ec8492fd..8adaaa31` em `frontend/src` (grep das literais adicionadas): todas PT-BR com acento correto ("Não foi possível…", "Sem permissão para ver ordens de serviço", "Seu perfil não inclui o módulo de OS nesta organização…", "Ordem de serviço não encontrada", "Voltar às ordens"); "OS-RASCUNHO" é do `repository.ts` legado, atrás de `isMockMode()` (l.25), origem `fb0ea65b` (2026-05-26), não renderizado.

### M6 — A ficha é vigiada por teste? (mutação no MEU worktree, restaurada por `git checkout -- <arquivo>` no meu worktree; porcelain 0 após cada)
`(cd frontend && node --test --import tsx tests/work-orders-honest-errors.test.tsx)` no objeto → `# tests 67 · pass 67 · fail 0` (V1–V6 = ok 62–67).

| Mutação em `components/StatePanel.tsx` | Resultado |
|---|---|
| VM-C3a título `#334155`→`#0F172A` (a cor do ciclo 1) | fail 4: V1 V2 V3 V4 |
| VM-C3b detalhe `#94A3B8`→`#64748B` | fail 4: V1 V2 V3 V4 |
| VM-C3c botão sem `pat-btn` (hover/foco perdidos, C3-A2) | fail 3: V1 V3 V4 |
| VM-C3d sem permissão com prancheta no lugar do escudo | fail 3: V2 V4 V6 |
| VM-C3e círculo do erro `#FEF2F2`→`#F1F5F9` | fail 2: V1 V4 |

### M7 — Fonte efetiva (CDP `CSS.getPlatformFontsForNode`, `c3c2-measure3.cjs`)
- Protótipo: botão → `Inter-Bold` (custom font), título → `Inter-ExtraBold` (carregado por `<link … fonts.googleapis.com/css2?family=Inter…>` no `.dc.html` l.13).
- App: botão → **`SegoeUI-Bold`**, título 800 → **`SegoeUIBlack`** (fonte do sistema). `document.fonts` do app = 0 faces; `frontend/index.html` sem `Inter`/`@font-face`/`googleapis` (grep → 0); `C:/Windows/Fonts` sem Inter; `frontend/src/styles/tokens/tokens.css:70` `--font-sans: Inter, ui-sans-serif, system-ui, …` (origem `fb0ea65b`, 2026-05-26). É a causa do Δ de 1px nas alturas de texto e do −4,7px na largura do rótulo do botão.

### M8 — Largura estreita e Despachos/Dashboard (`c3c2-measure2.cjs`, `c3c2-measure3.cjs`)
- Painel de erro sem estouro próprio a 1024 (740 px) e 768 (484 px). A 768 a página estoura 44 px — origem: a topbar (sino, `right 812`), **idêntica** na lista normal com OS (`o768-normal-com-os`) → não é do painel. A 390 o shell (sidebar) espreme o painel a 106 px — a web é console desktop; o shell não é do bloco.
- `/operations/dispatches` com a API real (0 despachos): vazio honesto, 0 mock/"Dados demonstrativos"/"Fallback", 0 alertas. `/dashboard` real: "Nenhum despacho ativo", 0 mock/fallback. (Os ramos de ERRO dessas telas são as pendências com dono `B-SAN3-06c`, emenda 3 (q).)

### M9 — Origem (escopo) dos achados
- `git diff --quiet 02bd7dab 8adaaa31 -- frontend/index.html frontend/src/styles` → ec 0; `grep -c -i "inter|font" frontend/index.html` → 0; `git log -- frontend/index.html` → `fb0ea65b 2026-05-26`; `tokens.css:70` idem. `git show 8adaaa31:agent-orchestration/controle/pendencias.md | grep -w "Inter|Segoe"` → 0 linhas; `grep -i "tipograf|font-family"` → 0 → nenhuma pendência nomeia a fonte.
- `.pat-btn--primary` em `app.css` nasce em `0a38f1be` (2026-08-04); `StatePanelAction` com a classe nasce em `619fb2b5` (ciclo 2).
- Vazio por filtro em `02bd7dab`: `WorkOrdersPage.tsx:375` "Ajuste a busca ou os filtros acima." — o "— ou crie uma nova ordem de serviço." é do ciclo 2.
- `git diff --quiet 02bd7dab 8adaaa31 -- frontend/src/layouts frontend/src/components` → ec 0 (shell não tocado).

## Relatório de fidelidade (Fase 5)

| Item | Resultado |
|---|---|
| Cores (borda, círculo, ícone, título, detalhe, botão, KPI degradado, faixa desatualizada) | ✓ exatas (rgb computado = hex da ficha) |
| Tipografia — tamanhos/pesos/cores | ✓ 16/800 #334155 · 13 #94A3B8 lh 19.5 · 13/700 |
| Tipografia — família | ✗ pré-existente (C3c2-A1): Segoe UI no app × Inter no protótipo |
| Espaçamentos | ✓ 50px 32px / 54px 32px, gap 10, círculo em (548,51), Δ ≤ 1px nos textos |
| Raios / bordas | ✓ r13 nos painéis, r10 nos botões; botão com borda 1px invisível (C3c2-N1, ±2px) |
| Ícones | ✓ triangle-alert 28 · shield 26 · clipboard-list 28 (lucide-react do repo; mesma semântica dos símbolos w-*) |
| Estados | ✓ erro ≠ vazio ≠ sem permissão ≠ não encontrada ≠ desatualizado, a olho (cor + ícone + título; faixa âmbar com dado mantido) |
| Interação | ✓ hover #1D4ED8 e foco 2px #2563EB offset 2px por teclado em todos os botões novos |
| Responsivo | ✓ painel sem estouro a 1024/768; estouro da topbar a 768 é pré-existente (C3c2-N4) |
| Cópia | ✓ PT-BR acentuada, sem termo técnico nem andaime |

**Divergências conscientes aceitas:** "tenant" → "organização" (§3); detalhe do erro sem "API" (§3); D-C2-1 (vazio embutido no card, busca preservada) — ACEITO; título do vazio sem filtro "Nenhuma ordem de serviço" (o do protótipo fala de filtros que não estão ativos) e o do protótipo usado quando há filtro.

## Limpeza (pelo nome)
- Servidores: API `tsx src/server.ts` (PID 26700, porta 3313) e web `vite --port 5313` (PID 19440) encerrados por `taskkill /F /PID`; `netstat` LISTEN em 3313/5313 → 0; nenhum processo com `j-bsan301-c3` além do próprio comando de conferência.
- `docker rm -f j-bsan301-c3-pg j-bsan301-c3-redis` → removidos; `docker ps -a | grep -c '^j-bsan301-c3'` → 0. `j-bsan301-c2-*` (outra cadeira) não tocados.
- `git -C bsan301 worktree remove --force .../j-bsan301-c3` → ec 0; `worktree list | grep -c j-bsan301-c3` → 0; diretório ausente. `bsan301`: HEAD `8adaaa31`, porcelain 0 (intocado). Nenhum `git worktree prune`, `git clean` nem remoção por prefixo.
- Apagados: `c3-api.log`, `c3-web.log`. Mantidos no scratchpad como evidência: `c3c2-measure.cjs`, `c3c2-measure2.cjs`, `c3c2-measure3.cjs`, `c3c2-sbs.cjs`, `votos-B-SAN3-01-c2/c3c2-measure*.out`, `c3c2-shots/` (PNG + facts*.json + sbs-estados.png), logs de `npm ci`. Livre em C: 14 GB (95%).

## Veredito
**APROVADO.** 0 bloqueia · 1 ajuste (pré-existente: C3c2-A1, fonte Inter não carregada na web) · 4 notas (3 dentro do bloco, sem efeito visível ou só de composição; 1 pré-existente). C3-B1, C3-A1, C3-A2, C3-A3 e C3-P2 fechados, medidos por estilo computado; D-C2-1 aceita contra a ficha. Detalhe no `C3-frontend-pixel-master-voto.json`.
