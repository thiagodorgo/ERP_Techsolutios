# PLANO B-SAN3-01 — ciclo 2 (correção após a reprovação 2 × 2) — ÚLTIMO ciclo (`D-TETO-DOIS-CICLOS`)

> **Papel:** `planejador-mestre` · **Modelo que rodou:** Fable 5.1 (`claude-fable-5-1`) — disponível, sem fallback ·
> **2ª instância.** A 1ª caiu por 429 às ~12:21 com só o §0 gravado (cópias intactas em
> `PLANO-B-SAN3-01-ciclo2.parcial-instancia1.md` e `…parcial-anterior.md`, 11.827 B cada, `cmp` idêntico). Usei-a como
> ROTEIRO; **nenhum número foi herdado** — cada medição abaixo foi reexecutada por esta instância (log em
> `scratchpad/plan-mut/i2-run-all.log`, 14:34–14:36).
> **Corpo aplicado:** `origin/main:.claude/agents/planejador-mestre.md` (lido por `git show` no worktree `bsan301`).
> **Objeto julgado:** `bb540fb3` (PR #387, branch `fix/web-wo-sem-fallback-fabricado`; head na junta `74f3f7c9` = objeto + 10 arquivos de registro).
> **Insumos lidos inteiros:** `R-B-SAN3-01-ciclo1.md`; votos + evidências C1/C2/C3/C4; `00-quedas.md`; plano do ciclo 1
> (`agent-orchestration/omega/planos/B-SAN3-01-plano.md`); comando com as emendas 1 e 2; o código do objeto (services, state,
> types, hooks, páginas, handlers, `StaleDataBanner`, `OperationsDispatchesPage`, `GeneralInfoTab`, o teste do bloco inteiro);
> `PLANO_SAN3.md` §5; `ERP Web.dc.html` l.318-382 e l.3310-3320; `ERP Web - Telas Padronizadas.dc.html` l.15-25, 127, 251.
> `screen-refs/web/` não tem PNG dos estados da lista: a referência é o `.dc.html` (fonte §A1).
> **Terreno:** worktree `.claude/worktrees/plan-bsan301-c2` (detached em `bb540fb3`, reusado da 1ª instância). Mutações só
> nele, uma por vez, restauradas por backup com `status --porcelain = 0` conferido após cada uma. `bsan301` só leitura.
> Nenhum contêiner criado. Removido pelo nome ao fim (§10).
> **Estado deste arquivo:** COMPLETO (§0 → §10). **Data:** 2026-09-18.

## 0. Registro de medições (comando → saída) — nenhuma premissa entra sem isto

- **M1 terreno.** `git worktree list` → `plan-bsan301-c2 bb540fb3 (detached HEAD)`; `rev-parse --short HEAD` → `bb540fb3`;
  `status --porcelain | wc -l` → `0`; `ls node_modules | wc -l` → 222; `ls frontend/node_modules | wc -l` → 61 (instalados pela
  1ª instância, sem junction). `bsan301`: HEAD `74f3f7c9`, porcelain 0. `docker ps -a | grep -c plan-bsan301` → 0.
- **M2 baseline do objeto.** `(frontend) node --test --import tsx tests/work-orders-honest-errors.test.tsx` → `# tests 47 · pass 47 · fail 0`.
- **M3 as mutações dos jurados, REPRODUZIDAS por mim** (`node scratchpad/plan-mut/run-mut.mjs <id>.json`, specs copiados dos
  de `c4-mut/`, sem `fullSmoke`; teste do bloco + `tsc` quando o spec pede + sonda `probe.mts`; restauro conferido):

  | id | mutação (arquivo) | teste do bloco | sonda de runtime (modo real) |
  |---|---|---|---|
  | G1d | `dispatches.service.ts`: `?? getMockDispatchDetail(id)` no `else` de `if (isMockMode()) {}` | **47/47 VERDE** | `ACEITO — getDispatchFromApi(200 {data:{}}) → dispatch-000101 (OS OS-000101) source=api` |
  | G1e | idem, com comentário no fim da linha citando `isMockMode()` | **47/47 VERDE** | `ACEITO … source=fallback` |
  | G1f | import de `mockDispatchItems` (constante sem prefixo `getMock`) na lista 200-vazia | 46/47 (`not ok 27 [X1]`) — o guard G1 fica verde; quem pega é o teste de comportamento | — |
  | G1g | arquivo NOVO `work-orders/work-orders-summary.service.ts` com `catch → getMockWorkOrderDetail` | `tsc` EXIT 0; **47/47 VERDE** | `ACEITO — getWorkOrderSummary(500) devolveu OS-000101 Atlas Refrigeracao` |
  | F403a | `work-orders.state.ts:61` `result.forbidden ? "empty"` | **47/47 VERDE** | `ESTADO ERRADO — lista 403 → painel "empty", KPIs [0,0,0,0]` |
  | F403b | `work-orders.service.ts` 403 sai com `source: "api"` | **47/47 VERDE** | idem (painel "empty", KPIs 0) |
  | F403c | `work-orders.state.ts:145` `forbidden → "not-found"` | **47/47 VERDE** | `ESTADO ERRADO — detalhe 403 → estado "not-found"` |
  | NS1 | `WorkOrdersListStatus` + `"unavailable"` emitido no 5xx; página intocada | `tsc` EXIT 0; **47/47 VERDE** | `ESTADO ERRADO — lista 500 → status "unavailable", painel "empty", KPIs [0,0,0,0]` |
  | NS2 | idem no detalhe (controle) | `tsc` EXIT 0; 47/47 | `ESTADO CERTO — detalhe 500 → data-state "error"` (a view cai no erro por default) |
  | R1c / R1d | hooks passam `false` no lugar de `background` | **47/47 VERDE** (ambos) | — |
  | SRC2 | `WorkOrdersSource` e `KpiSourceTag` + `"cache"` | `tsc` EXIT 1 **no `KpiDetailModal.tsx:12`** (pré-existente), 47/47 | reducer com `source:"cache"` → `status=ready` (denylist `source !== "fallback"`) |

  Conclusão: **os 4 bloqueios e o ajuste C4-04 reproduzem no objeto** com os meus próprios olhos; a suíte do ciclo 1 não vigia nenhum deles.
- **M4 guard por ALCANCE (protótipo AST, `scratchpad/plan-mut/guard-proto.mjs <worktree>`).** Escopo = `frontend/src/modules/work-orders/**` +
  `frontend/src/modules/operations/dispatches/**` enumerados do disco (sem `*.test.*`, sem os próprios módulos de mock); origem de mock =
  `*.mock.ts` ou `src/mocks/**`, direto ou via barrel um nível; permitido = só o `then` de `if (isMockMode())`, o `whenTrue` de
  `isMockMode() ? :` e a direita de `isMockMode() && …`. No objeto: **`FILES=79 MOCK_REFS=20 LEAKS=5`**, todas em
  `frontend/src/modules/work-orders/repository.ts` l.6, 11, 11, 15, 16 (`mockWorkOrders`, `mockTimeline`, `mockEvidence` de
  `../../mocks/work-orders/workOrders`, sem `isMockMode()`). Sob as mutações (`guard-mut.mjs`): G1d → `+1 dispatches.service.ts:76` ·
  G1e → `+1 :76` · G1f → `+1 :45 mockDispatchItems` (pego pela ORIGEM do import, não pelo nome) · G1g → `FILES=80`, `+2
  work-orders-summary.service.ts:11,13` (pego pela enumeração do disco). **As 4 formas que o guard léxico deixou passar ficam vermelhas por alcance.**
- **M5 o `repository.ts` morto na forma positiva** (`REPOFIX.json`: `if (isMockMode()) return …; throw new Error("work_orders_legacy_repository_unavailable")`,
  assinaturas inalteradas) → `FILES=79 MOCK_REFS=20 LEAKS=0`; `npx tsc -b --noEmit` com o REPOFIX aplicado → **EXIT 0** (as páginas mortas que o
  importam continuam compilando). Restaurado, porcelain 0. **O guard fecha em zero SEM lista de exceção.**
- **M6 `typescript` no arnês do teste.** `import ts from "typescript"` num `.test.mts` rodado de `frontend/` com `node --test --import tsx`: do
  scratchpad → `ERR_MODULE_NOT_FOUND` (resolução a partir do diretório do arquivo); copiado para `frontend/tests/` → `ts.version=5.9.3`,
  `1/1` (devDependency `"typescript": "^5.8.3"` em `frontend/package.json`). Arquivo temporário removido; porcelain 0.
- **M7 HTML que o SSR emite HOJE** (`ssr-probe.mts`): lista erro = `<div role="alert" data-state="error" style="padding:48px 18px;text-align:center">` +
  título `font-size:14px;font-weight:700;color:#0F172A` + detalhe `font-size:12.5px;color:#64748B` + `<button class="pat-link">`; forbidden e empty =
  mesmos estilos, sem ícone, sem borda; detalhe forbidden = `padding:40px`, título 15/800, botão inline `background:#2563EB…border-radius:10px` SEM
  classe. Serialização conferida: `style="border:1px solid #FECACA;padding:50px 32px;font-size:16px;font-weight:800"` — os tokens aparecem
  literalmente no HTML (a ficha pode ser afirmada por teste SSR). Classes do `lucide-react`: `AlertTriangle`/`TriangleAlert` → `lucide-triangle-alert`;
  `Shield` → `lucide-shield`; `ClipboardList` → `lucide-clipboard-list`; `SearchX`/`FileQuestion`/`ShieldOff` também existem.
- **M8 ficha do protótipo** (`docs/claude-code-handoff/ERP Web.dc.html`, rastreado; `sed -n 362,382p`; chips l.3315-3318; ícones l.72/76/92):
  - vazio (l.362-368): card `#fff`, `border:1px solid #E2E8F0`, raio 13, `padding:54px 32px`, coluna centrada, `gap:10px`; círculo 60×60 `#F1F5F9`
    com `w-os` (= `ClipboardList`) 28 `#94A3B8`; título `16px/800 #334155` "Nenhuma OS para os filtros atuais"; detalhe `13px #94A3B8`,
    `max-width:330px`, `line-height:1.5`; botão "Nova OS" `margin-top:6px;padding:10px 18px;background:#2563EB;border:none;border-radius:10px;font-size:13px;font-weight:700;color:#fff`.
  - erro (l.370-376): `border:1px solid #FECACA`, `padding:50px 32px`; círculo `#FEF2F2` com `w-alert` (= `AlertTriangle`) 28 `#DC2626`; título
    16/800 `#334155` "Não foi possível carregar as ordens"; detalhe 13 `#94A3B8` max-w 340 (a cópia diz "API" → §3 do contrato proíbe; adaptar);
    botão "Tentar novamente" `padding:10px 20px` (demais tokens iguais).
  - sem permissão (l.378-382): `border:1px solid #E2E8F0`, `padding:50px 32px`; círculo `#F1F5F9` com `w-shield` (= `Shield` liso, não `ShieldOff`)
    **26** `#94A3B8`; título 16/800 `#334155` "Sem permissão para ver ordens de serviço"; detalhe 13 `#94A3B8` max-w 340 (diz "tenant" → "organização"); SEM botão.
  - `ERP Web - Telas Padronizadas.dc.html` (raiz, rastreado): l.21 `button:focus-visible{outline:2px solid #2563EB;outline-offset:2px}`; l.127 e l.251
    primário `padding:9px 16px;…border-radius:9px;font-size:12.5px` + `style-hover="background:#1D4ED8"`. Os estados da lista NÃO estão redesenhados ali.
- **M9 `frontend/src/styles/app.css`** (fora do escopo — só se USA): `.pat-btn` l.3068-3081 (`9px 14px`, `#fff`, borda `#e2e8f0`, raio 9, 12.5/700 `#475569`) ·
  `.pat-btn:hover` l.3082 (borda/cor `#2563eb`) · `.pat-btn--primary` l.3086 (`9px 16px`, `#2563eb`) · `.pat-btn--primary:hover` l.3092 (`#1d4ed8`) ·
  `.pat-btn:focus-visible, .pat-link:focus-visible …` l.3322-3330 (`outline:2px solid #2563eb; outline-offset:2px`). Hover e foco do padrão vêm DA CLASSE.
  `frontend/tests/pattern-css-guard.test.ts` só exige regras estruturais no `app.css` — não proíbe estilo inline nem uso de classe existente em `.tsx`.
- **M10 `KpiStatCard`** (`components/patterns/KpiStatCard.tsx`): props `icon, iconColor, iconBg, value, label, hint?, tag?, border?, onClick?`; `iconColor`/`iconBg`
  viram `style="background:…;color:…"` no `.pat-kpi__tile` (afirmável por SSR).
- **M11 alcance do código "morto" e do `/logistics`.** grep exato de `work-orders/repository"` em `frontend/src` e `frontend/tests` → só `frontend/src/pages/WorkOrder{Detail,Form,sList}Page.tsx`
  (l.14/7/7); nenhuma dessas páginas é importada fora de `frontend/src/pages/` (`App.tsx:38` importa `modules/work-orders/pages/WorkOrderDetailPage`);
  o casamento em `modules/dashboard/*` era de `./repository` próprio (falso positivo do padrão). `/logistics`: `App.tsx:792-796` (`PermissionGuard logistics:dispatch`),
  `frontend/src/navigation/tenantNavigation.ts:62-70` (item `tenant-logistics`, `path:"/logistics"`, `moduleKey:"logistics"`); `pages/LogisticsPage.tsx:5` →
  `modules/logistics/repository.ts:1-2` importa `mocks/work-orders/workOrders` sem `isMockMode()`. **Rota viva, ficção incondicional** — a `P-SAN3-01-OS-LEGADO-MORTO` diz o contrário.
- **M12 quem lê `forbidden`/`notFound` DO ESTADO.** grep em `modules/work-orders` e `modules/operations` fora do `state.ts`/services → `useWorkOrders.ts:56`
  (`forbidden: state.forbidden`, exposto e não consumido: `WorkOrdersPage.tsx:137` desestrutura só `status`; `WorkOrderDetailPage.tsx:37` idem) e
  `useApprovalsQueue.ts:79` (`result.forbidden` de OUTRO service — fila de aprovações — fora desta propriedade). Nenhum importador do barrel `modules/work-orders` em `frontend/src`.
- **M13 seletores do e2e** (cópia avulsa `74f3f7c9:agent-orchestration/omega/juntas/votos/B-SAN3-01/apoio/e2e-copia-avulsa.spec.ts`, idêntica por função ao rastreado — C1/C2):
  `.pat-os-row` (l.45), `[data-state="empty"]` (l.47/62), `getByRole("alert")` = 0 na lista normal (l.55), `[data-state="error"]` = 0 (l.56), heading "Nova OS" na página de
  criação (l.71), alert do create (l.92/97), `[data-state="not-found"]` (l.125), `[data-state="error"]` + `getByRole("button", { name: "Tentar novamente" })` (l.137-143).
  **A recriação visual tem de preservar `data-state`, `role="alert"` só no erro, e "Tentar novamente" como `<button>`.**
- **M14 escopo por bloco no `PLANO_SAN3.md` §5** (awk do bloco `## 5` até `## 6`, grep `B-SAN3-`): `06a` (l.270) = `modules/{purchase-orders,reports}/**`, `modules/dispatch/pages/DispatchConsolePage.tsx`,
  `layouts/appSidebarNav.ts`, `navigation/tenantNavigation.ts`, `App.tsx` · `06b` (l.274) = `modules/platform/**`, `navigation/platformNavigation.ts` · `08` (l.272) =
  `registry/service-quotes/**`, `QuoteTab.tsx` · `25` (l.273) = `FinancialTab.tsx`, "o serviço de OS em `modules/work-orders/**`", `finance/pages/InvoicesPage.tsx` ·
  `12` (l.44) = `modules/finance/**`, `App.tsx`, `appSidebarNav.ts` · `21` (l.275) = literais de texto · `10` (l.298) = `tests/e2e/**`, `playwright.config.ts`, job e2e, docs ·
  `15` (l.284) = flutter + backend `src/modules/inventory/**`. **Nenhum bloco tem** `frontend/src/pages/**` (Dashboard, Logistics), `modules/operations/dispatches/pages/**`,
  `modules/inventory/**` (web), `modules/navigation/**`, `modules/logistics/**`, `layouts/AppShell.tsx`, `styles/app.css`.
- **M15 pendências.** grep de `P-SAN3-01-` → 10 IDs (l.9316-9397). `P-SAN3-01-OS-LEGADO-MORTO` (l.9361-9368): "Nada disso alcança um usuário" — falso por M11.
  `P-SAN3-01-DESPACHOS-ALERTA-DADOS-DEMONSTRATIVOS` (l.9379-9386): dono `B-SAN3-06a` "(dono de `operations/**` da web)" — falso por M14; cobre só o título.
  Emenda da `P-008` (l.101): "guard estrutural G1, provado por mutação" — falso por M3.
- **M16 texto dos services.** `work-orders.service.ts:29-30` e `dispatches.service.ts:25`: "é o ÚNICO caminho que alcança `getMock*` (guard G1)" — afirma o que M3 desmente.
- **M17 KPI.** `grep -c "2995/2997" Kpis/kpis-latest.json` → 2 (`release.summary` e `notes[]`) com `metrics.backend_tests = "2996/2998"` (A-C1-01 conferido). `kpis-history.json`:
  159 entradas de forma PLANA (`snapshot_date, version, pr, merge_commit, approved_head, backend_tests, frontend_smoke_tests, flutter_tests, blocks_completed, description`);
  precedente de ciclo 2 = **`B-O6R-07a-ciclo2`** (2ª entrada do pr 369, `blocks_completed` 158 INALTERADO, métricas remedidas) e `B-O6R-01-CICLO2-CORRECAO`;
  `Kpis/app.js` l.270-300: a rodada é lida do prefixo do `version` e o gráfico conta ENTRADAS (`tests/kpi-dashboard-charts.test.ts:46-49` afirma `barra.value === san3.length`) —
  uma 2ª entrada `B-SAN3-01-ciclo2` conta como 2ª PUBLICAÇÃO da rodada, exatamente como o precedente 07a.
- **M18 cópias cravadas por outros testes.** grep em `frontend/tests` → "Nenhuma ordem de serviço"/"Não foi possível carregar as ordens"/"Ordem de serviço não
  encontrada" só no `work-orders-honest-errors`; "Tentar novamente"/"Acesso não permitido"/"Voltar às ordens" aparecem em 13 arquivos de OUTRAS telas (não afetados).
- **M19 agentes em `origin/main:.claude/agents`**: `frontend-pixel-master`, `coordenador-de-acessos`, `validador-mestre`, `master-teste-telas-rotas`, `inspetor-de-terreno-da-junta`,
  `porteiro-pos-merge` existem (e `cognicao-visual`, `guardiao-fail-closed`, `critico-adversarial`). `frontend-pixel-master.md` declara `tools: … Write, Edit` e `model: inherit`:
  como JURADO não escreve no objeto (mandato §9) e roda no modelo da sessão.
- **M20 precedentes de nome.** `omega/reprovacoes/R-B-O6R-01-ciclo1.md` · `omega/planos/B-O6R-02-ciclo2-plano.md` · `juntas/votos/B-O6R-02-ciclo4/` · `juntas/BRIEFING-B-O6R-02-ciclo4.md` ·
  `juntas/J-B-GOV-ELENCO-ciclo2-A.md`. Nenhum comando tem "Emenda 3" ainda.
- **M21 `docs/screen-element-map.md`** l.5: "Toda lista tem os 4 estados (skeleton / vazio-com-ação / erro-com-retry / populado)"; l.23: "Estado vazio → CTA | cria".
- **M22 registro.** `status-geral.md` (2 menções) e `log-execucao.md` (4) já têm a entrada do `B-SAN3-01` — o ciclo 2 APENSA, não reescreve.

Scripts e resultados: `scratchpad/plan-mut/` (`run-all.sh`, `i2-run-all.log`, `run-mut.mjs`, `probe.mts`, `guard-proto.mjs`, `guard-mut.mjs`, `ssr-probe.mts`,
`REPOFIX.json`, `<id>.json`, `<id>.result.md`). Nada foi escrito em `bsan301`, na árvore principal nem em base viva.

## 1. O que a junta reprovou, enunciado como PROPRIEDADE (não como instância)

Lição do `R-B-SAN3-01-ciclo1.md` (c): o plano do ciclo 1 declarou garantias por INSTÂNCIA (G1a–c; "o 403 vira `forbidden`") e a junta achou a
classe pelo lado que não foi medido. Cada correção abaixo nasce de uma propriedade e é provada por mutação CONTRA a propriedade — as próprias
mutações dos jurados (reproduzidas em M3) mais as formas vizinhas que uma junta tentaria em seguida.

| P | Propriedade | Fecha | Prova |
|---|---|---|---|
| **P1 — uma verdade para "sem permissão"** | Lista e detalhe: `403` → `forbidden: true` no resultado do service → `status: "forbidden"` no estado (a ÚNICA verdade — o estado não carrega `forbidden`/`notFound` como campos) → painel `data-state="forbidden"` e KPIs "—". A flag decide ANTES de qualquer outra classificação (`source`, refresh em segundo plano). | C4-01 (F403a/b/c) | F1, F1b, F2, F2b, F3, F4 |
| **P2 — enumeração fechada, default = erro** | Todo membro de `WorkOrdersListStatus` e `WorkOrderDetailStatus` é classificado num `Record` exaustivo; membro novo sem classificação quebra `tsc`; em runtime, o não classificado cai em ERRO — nunca em vazio nem em número. | C4-03 (NS1); C4-07 (allowlist de `source`) | N1–N3; `tsc` vermelho sob NS1 |
| **P3 — mock só por ALCANCE** | Em todo `*.ts/*.tsx` de `frontend/src/modules/work-orders/**` e `frontend/src/modules/operations/dispatches/**` (enumerados do DISCO, arquivo novo incluído), toda referência a identificador cuja ORIGEM é módulo de mock (`*.mock.ts`, `src/mocks/**`, direto ou via barrel) está no ramo verdadeiro de `isMockMode()` importado de `config/env`. Decidido por AST: comentário não existe; `else` não é `then`; nome sem prefixo conta; `isMockMode` local não vale. Sem lista de exceção (M5). | C4-02 (G1d–g); textos M15/M16 | G1 (varredura), G2 (8 fixtures), G3 (enumeração) |
| **P4 — fiação vigiada** | Os hooks repassam `background` aos reducers — a regra "desatualizado mantém os dados" só existe se a linha do hook existir. | C4-04 (R1c/R1d) | W1, W2 |
| **P5 — estado desenhado = estado renderizado** | Painéis de erro / sem permissão / vazio (lista) e erro / sem permissão / não encontrada (detalhe) reproduzem a ficha `ERP Web.dc.html:362-382` (borda, círculo+ícone, título 16/800 `#334155`, detalhe 13 `#94A3B8`, botão cheio com hover/foco do padrão); erro ≠ sem permissão por COR e ÍCONE; nenhuma cor de sucesso/perigo quando o valor é "—". Uma ficha, um componente, dois consumidores. | C3-B1, C3-A1, C3-A2, C3-A3 (+ C3-P2, C3-N2 por consequência) | V1–V6 (SSR) + estilo computado pela C3 |
| **P6 — registro honesto** | Pendência nomeia o defeito INTEIRO e um dono que TEM o arquivo no §5 (ou diz que não há dono e propõe); prosa de KPI = medição; nenhum texto afirma prova que a mutação desmente. | C4-06, C3-A4, A-C1-01, M15/M16 | conferência da C1 |

## 2. Correção por bloqueio/ajuste — propriedade · desenho · arquivos · teste de encerramento com vermelho-controle

### 2.1 C4-01 → P1 (uma verdade para "sem permissão")

**Desenho.**
- `work-orders.state.ts`: `WorkOrdersListState` perde o campo `forbidden`; `WorkOrderDetailState` perde `notFound` e `forbidden`. `status` é a única
  verdade; quem precisar pergunta `status === "forbidden"`. O `data` guardado no estado da lista não carrega `forbidden` (o hook espalha `...state.data` — M12).
- `nextListState(prev, result, background)`: (1) `if (result.forbidden === true)` → `{ data vazio, status: "forbidden", error: razão, stale: false }` —
  SEMPRE, inclusive com `background === true` e dado na tela (permissão revogada em sessão não deixa a lista antiga "desatualizada": ela sai — fail-closed);
  (2) `switch (result.source)`: `"api" | "mock"` → `ready`/`empty`; `"fallback"` → a regra R1 do ciclo 1 (background + dado → `stale`; senão `error`);
  `default` → `assertNever(result.source)` — compila só se todo membro de `WorkOrdersSource` estiver classificado (fecha a nota C4-07 pela allowlist); em
  runtime o membro desconhecido cai em `error`.
- `nextDetailState`: mesma ordem — `detail?.forbidden === true` → `"forbidden"` antes de `notFound` e antes da regra de `background`; `notFound` → `"not-found"`; senão `error`/`stale`.
- `useWorkOrders.ts` deixa de expor `forbidden` (M12: ninguém consome). `useWorkOrderDetail.ts` idem (espalha `...state`, que já não os tem).
- O service NÃO muda: o `forbidden` do resultado É a fonte. `WorkOrdersData.forbidden?` (types) fica.

**Arquivos.** `frontend/src/modules/work-orders/work-orders.state.ts` · `useWorkOrders.ts` · `useWorkOrderDetail.ts`.

**Testes (§5): F1, F1b, F2, F2b, F3, F4.** Vermelho-controle POR MUTAÇÃO sobre a correção: F403a → F1/F3 vermelhos; F403b → F1 (cadeia
service → reducer → painel) e F3 (o reducer decide por `forbidden` antes de `source`); F403c → F2. F1b/F2b/F3/F4 são vermelhos no próprio `bb540fb3`.

### 2.2 C4-03 → P2 (enumeração fechada; default = erro)

**Desenho.**
- `work-orders.state.ts` exporta `LIST_STATUS_KIND: Record<WorkOrdersListStatus, "pending" | "data" | "failure">` (`loading: pending`, `ready: data`,
  `empty: data`, `error: failure`, `forbidden: failure`) e `DETAIL_STATUS_KIND: Record<WorkOrderDetailStatus, …>` (`loading: pending`, `ready: data`,
  `not-found | forbidden | error: failure`), mais `listStatusKind(status)` = `LIST_STATUS_KIND[status] ?? "failure"` (membro desconhecido em runtime =
  falha). O `Record` é o que faz `tsc` acusar o membro novo (NS1 → EXIT ≠ 0).
- `WorkOrdersPage.tsx`: `const kind = listStatusKind(status); const degraded = kind === "failure";` substitui `status === "error" || status === "forbidden"`.
  Corpo: `loading` → skeleton; `kind === "failure"` → `StatePanel` de falha NO LUGAR do card da tabela (§2.5); `kind === "data"` → linhas ou vazio.
- `WorkOrdersLoadState`: `empty` e `forbidden` são ramos EXPLÍCITOS; o `return` final é o painel de ERRO (era o vazio). Status desconhecido chega ao erro.
- `WorkOrderDetailView`: já cai no erro por default (NS2); ganha o `Record` para simetria de compilação.

**Arquivos.** `work-orders.state.ts` · `pages/WorkOrdersPage.tsx` · `pages/WorkOrderDetailPage.tsx`.

**Testes: N1, N2, N3.** N1 (`WorkOrdersLoadState({ status: "unavailable" as never })` → `data-state="error"` + `role="alert"`, nunca `empty`) e N2
(`listStatusKind("unavailable" as never) === "failure"`; `LIST_STATUS_KIND` tem exatamente 5 chaves) são vermelhos em `bb540fb3`; N3 (detalhe idem →
`data-state="error"`) é verde hoje e vigia a simetria. Sob NS1 sobre a correção: `tsc` EXIT ≠ 0 pelo `Record`; e, se alguém "consertar" o `Record` sem
tratar a página, N1/N2 continuam verdes porque o default é erro — a propriedade vale nas duas camadas (compilação e runtime).

### 2.3 C4-02 → P3 (mock só por alcance)

**Desenho — o guard G1 vira análise de ALCANCE por AST** (`typescript` já é devDependency, M6; protótipo medido em M4/M5):
1. Escopo enumerado do disco a partir do próprio teste: `new URL("../src/modules/work-orders/", import.meta.url)` e `../src/modules/operations/dispatches/`,
   recursivo, `*.ts|*.tsx`, excluindo `*.test.*` e os módulos de mock (`*.mock.ts`, qualquer caminho com `/mocks/`).
2. Por arquivo, os nomes importados cuja origem é mock: `import { a, b } from "x"` com `x` resolvido (`.ts`/`.tsx`/`index.ts`) para módulo de mock, ou
   para um barrel que `export * from` / `export { … } from` um módulo de mock (um nível — cobre `modules/work-orders/index.ts`); `import * as M from mock` → `M.qualquer` conta.
3. Toda referência (identificador) a esses nomes fora do `thenStatement` de `if (isMockMode())`, do `whenTrue` de `isMockMode() ? … : …` e da direita de
   `isMockMode() && …` é VAZAMENTO. Só a forma positiva vale (`if (!isMockMode()) … else mock` é vazamento — regra simples, sem buraco; o código de hoje só usa a positiva, 15/15).
4. `isMockMode` tem de ser o importado de `…/config/env`; `function isMockMode`/`const isMockMode` declarado no arquivo, ou importado de outro lugar, é
   VAZAMENTO ("autoridade local" — a forma seguinte que uma junta tentaria, cf. C4-08).
5. Comentário não existe no AST (G1e); `else` não é `then` (G1d); a origem é o import, não o prefixo do nome (G1f); o arquivo novo entra pela enumeração (G1g).
- `work-orders/repository.ts` (morto, mas dentro do escopo — 5 vazamentos em M4) é reescrito na forma positiva medida em M5 (`if (isMockMode()) return …;
  throw new Error("work_orders_legacy_repository_unavailable")`, assinaturas iguais, `tsc` EXIT 0, nenhuma rota — M11). **Sem lista de exceção.**
  A `P-SAN3-01-OS-LEGADO-MORTO` continua ABERTA para a remoção (exige `frontend/src/pages/**`).
- Textos que afirmavam o que a mutação desmentiu: cabeçalho de `work-orders.service.ts:29-30` e `dispatches.service.ts:25` passam a dizer "o guard G1
  (por alcance, AST) prova por mutação que identificador de origem mock só é alcançável no ramo verdadeiro de `isMockMode()` em todo arquivo destes dois
  módulos"; a emenda da `P-008` (`pendencias.md:101`) troca "guard estrutural G1, provado por mutação" por "guard G1 por alcance (AST), provado pelas
  mutações G1a–G1h do ciclo 2".

**Arquivos.** `frontend/tests/work-orders-honest-errors.test.tsx` (G1 reescrito; G2, G3 novos) · `frontend/src/modules/work-orders/repository.ts` ·
comentários de `work-orders.service.ts` e `dispatches.service.ts` · `agent-orchestration/controle/pendencias.md`.

**Testes: G1, G2, G3.** G1 (varredura real = 0 vazamentos) é VERMELHO em `bb540fb3` (5 do `repository.ts`) e verde na correção; sob G1d/G1e/G1f/G1g
reproduzidas sobre a correção → vermelho (M4 mostra a forma: `+1 :76`, `+1 :76`, `+1 :45`, `+2` no arquivo novo). G2 = 8 fixtures em memória
(`ts.createSourceFile` sobre strings): (a) `?? getMockX()` solto → 1; (b) `else` de `if (isMockMode()) {}` → 1; (c) código com comentário citando
`isMockMode()` → 1; (d) constante `mockItems` sem prefixo → 1; (e) bloco `if (isMockMode()) { … }` → 0; (f) `isMockMode() ? mock : real` → 0;
(g) `isMockMode() && mock` → 0; (h) `const isMockMode = () => true` local + `if (isMockMode()) mock` → 1. G3 = o guard sobre um diretório temporário
(`fs.mkdtempSync`) com `x.mock.ts` e um arquivo novo que o importa sem guarda → 1 (prova que a enumeração vem do disco, não de lista).

### 2.4 C4-04 → P4 (fiação dos hooks)

**Desenho.** Nenhuma mudança de código; a fiação existente (`useWorkOrders.ts:39`, `useWorkOrderDetail.ts:41`) passa a ser VIGIADA como o S1 vigia a do create.
**Testes: W1, W2** — leem os dois hooks por texto e afirmam `nextListState(prev, result, background)` e `nextDetailState(prev, { detail, timeline }, background)`
(o `background` da assinatura do `refresh` chega ao reducer). Sob R1c/R1d → vermelho; verdes em `bb540fb3` (a fiação está certa hoje — o teste existe para amanhã).

### 2.5 C3-B1 + C3-A1 + C3-A2 + C3-A3 → P5 (estado desenhado = estado renderizado)

**Desenho — um componente, uma ficha, dois consumidores.** Novo `frontend/src/modules/work-orders/components/StatePanel.tsx` (dentro do permitido;
`app.css` está fora, então a ficha é inline e hover/foco vêm das classes `.pat-btn`/`.pat-btn--primary` que já existem — M9):

| `tone` | borda | círculo 60×60 | ícone (lucide) | uso |
|---|---|---|---|---|
| `error` | `1px solid #FECACA` | `#FEF2F2` | `AlertTriangle` 28 `#DC2626` | lista erro · detalhe erro |
| `forbidden` | `1px solid #E2E8F0` | `#F1F5F9` | `Shield` **26** `#94A3B8` | lista sem permissão · detalhe sem permissão |
| `empty` | `1px solid #E2E8F0` | `#F1F5F9` | `ClipboardList` 28 `#94A3B8` | lista vazia (padding `54px 32px`) |
| `not-found` | `1px solid #E2E8F0` | `#F1F5F9` | `ClipboardList` 28 `#94A3B8` | detalhe não encontrada (o ícone de OS do protótipo, `w-os`; nada inventado) |

Container: `background:#fff; border; border-radius:13px; padding:50px 32px` (`54px 32px` no `empty`); `text-align:center; display:flex; flex-direction:column;
align-items:center; gap:10px`. Título `font-size:16px; font-weight:800; color:#334155`. Detalhe `font-size:13px; color:#94A3B8; max-width:340px` (330 no
`empty`); `line-height:1.5`. Ações: `<button type="button" className="pat-btn pat-btn--primary" style={{ marginTop: 6, padding: "10px 20px", borderRadius: 10,
fontSize: 13 }}>` — o inline só corrige as MEDIDAS para as do protótipo (`10px 20px`; `10px 18px` no "Nova OS"; raio 10; 13px); cor, hover `#1D4ED8` e
`focus-visible` vêm da classe. Secundário: `className="pat-btn"` com as mesmas medidas (branco, borda `#E2E8F0`, hover azul — substitui o `#BFDBFE` inline, C3-N2).
Props: `tone`, `dataState`, `title`, `detail`, `role?` (`"alert"` só no erro — M13), `actions?`, `embedded?` (sem borda/raio, para viver DENTRO do card da
tabela — abaixo). `data-state` no elemento RAIZ (E1/E3/P1–P4 dependem dele).

**Lista (`WorkOrdersPage.tsx` / `WorkOrdersLoadState`).** O protótipo TROCA o card da tabela pelo card do estado (`woShowTable` falso em erro/vazio/sem
permissão — l.3316-3317). Aqui a toolbar (busca + pílulas) vive dentro do card padronizado, então:
- erro e sem permissão (`kind === "failure"`) → `StatePanel` standalone NO LUGAR do card inteiro (não há o que buscar num erro);
- vazio SEM filtro (`items.length === 0`) → `StatePanel` standalone `empty`: título "Nenhuma ordem de serviço", detalhe "As ordens atribuídas à sua
  organização aparecem aqui." e CTA **"Nova OS"** (`onCreate` → `navigate("/work-orders/new")`) **só quando `permissions.includes("work_orders:create")`**
  — o CTA nasce com gate (não cria uma 2ª instância da C2-N5);
- vazio COM filtro (`items.length > 0 && total === 0`) → card mantido (o operador precisa da toolbar para limpar o filtro) e `StatePanel embedded` com o
  título do protótipo "Nenhuma OS para os filtros atuais" e detalhe "Ajuste a busca ou os filtros acima — ou crie uma nova ordem de serviço."; sem CTA.
Cópias: erro = "Não foi possível carregar as ordens" (protótipo) + a razão do service como detalhe (sem "API"); sem permissão = "Sem permissão para ver
ordens de serviço" + "Seu perfil não inclui o módulo de OS nesta organização. Solicite acesso ao administrador da organização." (M8: "tenant" → "organização", §3).
`WorkOrdersLoadState` continua exportada com a mesma assinatura (+ `onCreate?`, `embedded?`) e delega ao `StatePanel` — P1–P3, a sonda e o e2e seguem válidos.

**KPIs degradados (C3-A3).** Em `WorkOrdersKpiGrid` com `degraded`: os 4 tiles ficam neutros (`iconColor="#94A3B8"`, `iconBg="#F1F5F9"`), sem `tag`,
sem `border` — nenhuma cor afirma "sob controle"/"agir agora" sobre "—".

**Detalhe (`WorkOrderDetailView`, C3-A1/A2).** Os três painéis viram `StatePanel` standalone: `forbidden` (escudo), `not-found` (prancheta), `error`
(alerta + borda `#FECACA`, `role="alert"`); botões "Tentar novamente" (primário) e "Voltar às ordens" (primário em forbidden/not-found; secundário
`.pat-btn` no erro). `padding:40px` / 15/800 / `#BFDBFE` saem. Cópias inalteradas (já honestas).

**Arquivos.** `components/StatePanel.tsx` (novo) · `pages/WorkOrdersPage.tsx` · `pages/WorkOrderDetailPage.tsx`.

**Testes: V1–V6 (SSR, tokens literais no HTML — M7).**
- V1 lista erro: raiz `data-state="error"` + `role="alert"` com `border:1px solid #FECACA`, `padding:50px 32px`, `border-radius:13px`; `class="lucide lucide-triangle-alert"`
  com `width="28"`; círculo `background:#FEF2F2` + `color:#DC2626`; título `font-size:16px;font-weight:800;color:#334155`; detalhe `font-size:13px;color:#94A3B8`;
  `<button type="button" class="pat-btn pat-btn--primary"` "Tentar novamente" com `padding:10px 20px`.
- V2 sem permissão: borda `#E2E8F0`, `lucide-shield` `width="26"`, círculo `#F1F5F9`/`#94A3B8`, nenhum `<button`, nenhum `role="alert"`.
- V3 vazio standalone: `padding:54px 32px`, `lucide-clipboard-list`, CTA "Nova OS" com `pat-btn--primary` e `padding:10px 18px` quando `onCreate` é dado e
  ausente quando não; `embedded` → raiz sem `border`.
- V4 detalhe: forbidden/not-found/error com os tokens do `tone`; todo `<button` com `class="pat-btn`; HTML sem `#BFDBFE`.
- V5 grade de KPI degradada: 4 tiles com `color:#94A3B8`; HTML sem `#15803D|#DC2626|#F0FDF4|#FEF2F2|#FCA5A5`.
- V6 distinção: erro × sem permissão diferem na cor da borda E na classe do ícone; sem permissão × vazio diferem na classe do ícone (e no título).
**Todos vermelhos em `bb540fb3`** (M7: sem borda, sem ícone, 14/700, `pat-link`). A C3 do ciclo 2 (`frontend-pixel-master`) mede o estilo COMPUTADO no
navegador — inclusive hover → `#1D4ED8` e `focus-visible` → `outline 2px solid #2563EB` —, que o SSR não alcança.

**C3-P2 (vazio sem ação) fecha por consequência** — mesmo componente, mesma ficha; `docs/screen-element-map.md:5,23` exige "vazio-com-ação" (M21). Se o
orquestrador vetar o CTA, cai só o `onCreate` (e V3 perde a asserção do botão); a pendência fica ABERTA com dono `B-SAN3-10` (fluxos por persona).

### 2.6 C4-06 + C3-A4 + A-C1-01 → P6 (registro honesto)

- **C4-06 / A-C1-03.** `P-SAN3-01-OS-LEGADO-MORTO` reescrita: a prova deixa de dizer "Nada disso alcança um usuário"; passa a separar (i) o legado SEM rota
  (`pages/WorkOrder{sList,Form,Detail}Page.tsx`, `work-orders/repository.ts` — agora atrás de `isMockMode()`, §2.3) e (ii) o `/logistics`, ROTEADO (M11), que
  sai para pendência própria `P-SAN3-01-LOGISTICS-FICCAO-ROTEADA` (§3), MÉDIA (tela viva com 4 OS e ativos inventados em modo real).
- **C3-A4 / C2-N3.** `P-SAN3-01-DESPACHOS-ALERTA-DADOS-DEMONSTRATIVOS` reescrita com o defeito INTEIRO medido pela C3 (shots 12b/12c) e pela C2 (X2): título
  "Dados demonstrativos" + 7 cards "0" clicáveis com pop-up + `EmptyState` "Nenhum despacho encontrado / Ajuste…" sob o erro + sem "Tentar novamente"; 500 e 403
  só se distinguem pelo texto. Teste de encerramento: 500 → `data-state="error"` com retry, cards "—" sem pop-up, sem `EmptyState`, sem "demonstrativos";
  403 → `data-state="forbidden"`. Dono: **nenhum bloco do §5 tem `operations/dispatches/pages/**`** (M14) — proposta em §3.
- **A-C1-01.** `Kpis/kpis-latest.json` (`release.summary`, `notes[]`) e a entrada nova do history dizem o que o ciclo 2 MEDE (§7); a entrada de
  2026-09-17 não é reescrita (append-only) — a nova a supera, com a nota "a prosa da entrada anterior ficou no estado dos commits C/D (A-C1-01)".

## 3. Pré-existentes → pendência nomeada com dono REAL

Regra: dono = bloco que TEM o arquivo no §5 do `PLANO_SAN3.md` (M14). Onde nenhum tem, digo e proponho; **o orquestrador decide** (emenda de escopo
nominal no bloco proposto, ou bloco novo na frente 3).

| Achado | Pendência (nova ou reescrita) | Arquivo | Dono pelo §5 | Proposta |
|---|---|---|---|---|
| C3-P1 | `P-SAN3-01-DASHBOARD-DESPACHOS-ERRO-COMO-VAZIO` (MÉDIA) — selo "Despachos: Fallback local" (termo interno) + "Nenhum despacho ativo" sobre consulta que falhou | `frontend/src/pages/DashboardPage.tsx:167,496` | **nenhum** | bloco novo `B-SAN3-06c · fix/web-estados-despachos-e-dashboard` (frente 3, P, maioria + `cognicao-visual`), dono também da linha abaixo |
| C3-A4 / C2-N3 | `P-SAN3-01-DESPACHOS-ALERTA-DADOS-DEMONSTRATIVOS` reescrita (MÉDIA; §2.6) | `operations/dispatches/pages/OperationsDispatchesPage.tsx`, `components/DispatchesSummaryCards.tsx` | **nenhum** (06a NÃO tem) | mesmo `B-SAN3-06c` |
| C4-06 / A-C1-03 | `P-SAN3-01-LOGISTICS-FICCAO-ROTEADA` (MÉDIA) — `/logistics` serve `mocks/work-orders/` em modo real | `App.tsx`, `navigation/tenantNavigation.ts` (06a TEM); `pages/LogisticsPage.tsx`, `modules/logistics/**`, `mocks/logistics/**` (ninguém tem) | `B-SAN3-06a` para rota + menu (default §10.1: sai do menu e da rota) | emenda nominal ao 06a para apagar os 3 caminhos |
| C4-05 | `P-SAN3-01-INVENTARIO-FECHAMENTO-CONTAGEM-FABRICADO` (MÉDIA) — 2xx sem entidade → `cycleCount {id:"", status:"concluida"}` + relatório zerado na tela | `frontend/src/modules/inventory/cycle-counts.adapter.ts:88-90`, `CycleCountSessionDrawer.tsx:134-137` | **nenhum** (15 é backend) | emenda nominal ao `B-SAN3-15` (bloco de estoque) ou fila pós-gate |
| C4-08 | `P-SAN3-01-MOCKMODE-TRES-AUTORIDADES` (MÉDIA) — `shouldUseMocks()` com padrão MOCK em `cloud-billing.service.ts:163-165` e `platform.service.ts:122-124`; `VITE_USE_MOCKS` ausente/`0` → 3 organizações inventadas sem chamar a API | `modules/platform/**` | `B-SAN3-06b` | cruza com `P-WEB-PLATAFORMA-TELAS-FICCAO` (item 46) |
| C4-09 | `P-SAN3-01-NAV-MENU-DEMO-NO-ERRO` (BAIXA) — `catch → setState(menu de demonstração)`; hoje só calcula caminhos escondidos (C1), mas é `setState(mock)` fora do censo | `modules/navigation/useNavigationMenu.ts:15,47` | **nenhum** | fila pós-gate; registro para quem refizer o censo (`B-SAN3-10`) |
| C2-N2 | `P-SAN3-01-LISTA-2XX-MALFORMADO-VIRA-VAZIO` (BAIXA) — 200 sem `items`/`data` → `empty` com KPIs "0" e selos | `work-orders.adapter.ts:92-97` (na fronteira; pré-existente `9f12ea99`) | `B-SAN3-25` (serviço de OS) | pré-existente: não entra na correção (briefing §2); são ~4 linhas no service — o orquestrador pode mandar entrar |
| C2-N5 | `P-SAN3-01-NOVA-OS-SEM-GATE-NO-BOTAO` (BAIXA) — botão do cabeçalho visível sem `work_orders:create` | `WorkOrdersPage.tsx:239` (pré-existente `9f12ea99`) | `B-SAN3-10` (persona) | o CTA novo do vazio já nasce com gate (§2.5) |
| C2-N1 | `P-SAN3-01-BATERIA-TSX-CWD` (BAIXA) — testes `.tsx` só rodam com cwd `frontend/` | `tsconfig.json` raiz | orquestrador (forma das baterias) | a bateria do §6 já roda de `frontend/` |
| C3-N1 / C2-N7 | acentos no formulário de OS e no guard de acesso | `WorkOrderForm.tsx`, `WorkOrderCreatePage.tsx:45`, `PermissionGuard.tsx` | `B-SAN3-21` | já é `P-028` — só cruzar |
| C3-N3 | `P-SAN3-01-STALE-ICONE-COR` (BAIXA) — ícone da faixa 14px `#92400E` × protótipo 16px `#D97706` | `.pat-banner--warning` (`app.css:3309`) | **nenhum** | fila pós-gate |
| C4-07 | nota — allowlist de `source` | `work-orders.state.ts` | este ciclo | **fecha** por §2.1 (`assertNever`) |
| C3-P2 | `P-SAN3-01-OS-VAZIO-SEM-ACAO` | `WorkOrdersPage.tsx` | este ciclo | **FECHADA** por §2.5 (salvo veto do orquestrador) |

Já registradas e só cruzadas: `P-SAN3-01-E2E-LOGIN-DEFASADO` (C2-N6, A-C1-06 → `B-SAN3-10`), `P-SAN3-01-CREATE-INVALID-DATE-MENSAGEM` (A-C1-05),
`P-SAN3-01-SHELL-BADGES-ZERO-NO-ERRO` (A-C1-04: acrescentar a 2ª origem `78bbf4f9`).

## 4. Escopo arquivo a arquivo

Fronteira = a do ciclo 1 (comando + emendas 1 e 2). Acréscimos do ciclo 2, cada um justificado:

| Arquivo | Ação | Por quê |
|---|---|---|
| `frontend/src/modules/work-orders/work-orders.state.ts` | editar | §2.1, §2.2 |
| `frontend/src/modules/work-orders/useWorkOrders.ts` · `useWorkOrderDetail.ts` | editar (1-3 linhas) | §2.1 — deixam de expor `forbidden`/`notFound` |
| `frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx` | editar | §2.2, §2.5 |
| `frontend/src/modules/work-orders/pages/WorkOrderDetailPage.tsx` | editar | §2.2, §2.5 |
| `frontend/src/modules/work-orders/components/StatePanel.tsx` | **novo** | §2.5 (dentro de `modules/work-orders/**`) |
| `frontend/src/modules/work-orders/repository.ts` | editar (forma positiva, M5) | §2.3 — dentro do permitido; código morto que o guard por alcance não pode ignorar |
| `frontend/src/modules/work-orders/work-orders.service.ts` · `frontend/src/modules/operations/dispatches/dispatches.service.ts` | **só comentário** (cabeçalho) | M16 |
| `frontend/tests/work-orders-honest-errors.test.tsx` | editar (G1 reescrito) + F/N/W/G/V novos | §5 |
| `agent-orchestration/controle/pendencias.md` + `pendencias-indice.md` (pelo gerador, byte-idêntico) | editar | §2.6, §3 |
| `agent-orchestration/omega/reprovacoes/R-B-SAN3-01-ciclo1.md` | **novo** (versiona o registro do scratchpad) | §C7.4 |
| `agent-orchestration/omega/juntas/votos/B-SAN3-01/` (C1–C4 voto + evidência, `00-quedas.md`) | **novos** | rastreabilidade do ciclo 1 |
| `agent-orchestration/omega/planos/B-SAN3-01-ciclo2-plano.md` | **novo** (este arquivo) | M20 |
| `agent-orchestration/codex/comandos/B-SAN3-01-web-wo-sem-fallback-fabricado.md` | editar (Emenda 3, escrita pelo orquestrador) | ciclo 2 |
| `agent-orchestration/codex/log-execucao.md` · `agent-orchestration/docs/status-geral.md` | apensar | M22 |
| `Kpis/kpis-latest.json` · `kpis-history.json` · `kpis-history.md` (+ `index.html`/`app.js` só se o guard exigir) | editar / apensar | §7 |

**Não tocados, de propósito:** `work-orders.types.ts` (`WorkOrdersData.forbidden?` fica — é a fonte), `work-orders.adapter.ts` (C2-N2 é pendência),
`OperationsDispatchesPage.tsx` (a emenda (a) limitou a `loadDetail`; o resto é §3), `app.css`/`tokens.css` (fora), `frontend/src/pages/**`, `src/**`,
`prisma/**`, `.github/**`, lockfiles, `tests/e2e/**` (E1–E3 continuam válidos — M13), `frontend/package.json` (o arquivo de teste já está no `test:smoke`).

## 5. Testes — baseline recontado, casos novos, vermelho-controle por MUTAÇÃO

**Baseline (execução real, M2):** bloco 47/47; smoke `1173/1173` (C1 e C2 remediram no objeto). N do comportamento em causa = 0 (nenhum teste liga 403
ao estado, nenhum vigia a enumeração, o guard é léxico, nenhum vigia a fiação, nenhum afirma a ficha) → M ≥ 2N trivial; a meta que vale: **≥ 22 casos
novos + G1 reescrito**, cada um vermelho no objeto OU sob a mutação que o motiva.

| ID | Caso | Vermelho em `bb540fb3`? | Vermelho sob mutação (sobre a correção) |
|---|---|---|---|
| F1 | cadeia lista: fetch 403 → `listWorkOrdersFromApi` → `nextListState` → `"forbidden"` → `listStatusKind` = failure → `WorkOrdersLoadState` `data-state="forbidden"`; grade de KPI degradada sem dígito | não (funciona hoje) | F403a, F403b |
| F1b | `nextListState(prev com 3 itens, {source:"fallback", forbidden:true}, background=true)` → `"forbidden"`, `items 0`, `stale false` | **sim** (hoje vira `stale` com os 3) | — |
| F2 | cadeia detalhe: 403 → `getWorkOrderFromApi` → `nextDetailState` → `"forbidden"` → `WorkOrderDetailView` `data-state="forbidden"` | não | F403c |
| F2b | `nextDetailState(prev com OS, {forbidden:true}, background=true)` → `"forbidden"`, `workOrder null` | **sim** | — |
| F3 | `nextListState(_, {source:"api", forbidden:true})` → `"forbidden"` (a flag decide antes de `source`) | **sim** (hoje `empty`) | F403b |
| F4 | `JSON.stringify` do estado da lista e do detalhe não contém as chaves `"forbidden"`/`"notFound"` | **sim** | — |
| N1 | `WorkOrdersLoadState({ status: "unavailable" as never })` → `data-state="error"` + `role="alert"`, sem `empty` | **sim** | NS1 (+ `tsc` vermelho pelo `Record`) |
| N2 | `listStatusKind("unavailable" as never) === "failure"`; `LIST_STATUS_KIND` tem exatamente as 5 chaves | **sim** | NS1 |
| N3 | `WorkOrderDetailView({ status: "unavailable" as never, workOrder: null })` → `data-state="error"` | não (simetria) | mutação do default da view |
| W1 / W2 | fiação: os hooks repassam `background` aos reducers | não | R1c / R1d |
| G1 | varredura por alcance nos dois módulos = 0 vazamentos | **sim** (5 no `repository.ts`) | G1d, G1e, G1f, G1g |
| G2 | 8 fixtures (a–h de §2.3) | auto-teste do guard | — |
| G3 | enumeração do disco (diretório temporário com arquivo novo + `x.mock.ts`) → 1 vazamento | auto-teste do guard | — |
| V1–V6 | ficha dos painéis (§2.5) | **sim** (todos) | qualquer regressão de token |

Total: 47 → **≥ 69** (22 novos + G1 reescrito); smoke 1173 → **≥ 1195**. O dev publica o número exato medido.

**Protocolo do vermelho-controle (executado pelo dev, reexecutado pela junta):**
1. **Commit A** = só o teste (`work-orders-honest-errors.test.tsx` novo) sobre `bb540fb3`. Vermelhos esperados: **F1b, F2b, F3, F4, N1, N2, G1, V1–V6**
   (13); verdes: F1, F2, N3, W1, W2, G2, G3 (guardas de mutação — provados no passo 3). Contagem colada no PR.
2. **Commit B** = a correção (§4). `# fail 0` no bloco; suíte inteira `# fail 0`.
3. **Tabela de mutação** — `scratchpad/plan-mut/run-mut.mjs` com os 13 specs dos jurados (`G1d G1e G1f G1g F403a F403b F403c NS1 NS2 R1c R1d SRC2` + `F403c-sonda`),
   reaplicados SOBRE o commit B: cada linha da coluna "vermelho sob mutação" fica vermelha; NS1 e SRC2 além disso quebram `tsc` (o `Record` e o
   `assertNever`). A tabela vai para `votos/B-SAN3-01-ciclo2/00-dev.md`; a C4 (`coordenador-de-acessos`) repete e acrescenta as dela.
4. Contra a lição do ciclo 1: **nenhuma garantia declarada sem a mutação correspondente executada** — o que não estiver na tabela não é afirmado no PR.

## 6. Bateria (forma exata — a dos votos C1 §Item 2 e C2 M0–M1, com Postgres E Redis descartáveis e `REDIS_URL` explícita)

```bash
# terreno próprio do dev (worktree novo a partir da branch; npm ci próprios; sem junction)
docker run -d --name bsan301c2-pg -e POSTGRES_PASSWORD=<senha-local> -e POSTGRES_DB=erp_techsolutions -p 127.0.0.1:<PG>:5432 postgres:16
docker run -d --name bsan301c2-redis -p 127.0.0.1:<RD>:6379 redis:7-alpine     # portas fora de `netsh int ipv4 show excludedportrange protocol=tcp`
export DATABASE_URL="postgresql://postgres:***@127.0.0.1:<PG>/erp_techsolutions" REDIS_URL="redis://127.0.0.1:<RD>"   # nunca versionadas
npm ci && npm --prefix frontend ci
npx prisma generate && npx prisma migrate deploy && npm run db:seed            # 107 migrations
( cd frontend && node --test --import tsx tests/work-orders-honest-errors.test.tsx )   # cwd frontend/ (C2-N1) — commit A: 13 fail · commit B: 0
npm --prefix frontend run check && npm --prefix frontend run build
npm --prefix frontend run test:smoke                                           # esperado ≥ 1195 · fail 0
node --test --import tsx tests/approval-frontend-contract.test.ts             # lê WorkOrderDetailPage/GeneralInfoTab por texto
npm test                                                                       # backend inteiro, com Postgres E Redis descartáveis (§C3.3) — número publicado = medido
node --test --import tsx tests/kpi-dashboard-charts.test.ts tests/kpi-achados-paridade.test.ts tests/kpi-dashboard-contraste.test.ts
node --check Kpis/app.js && node scripts/kpi-freeze.mjs --check
node scripts/sync-agent-agents.mjs --check
# e2e pela cópia avulsa (o rastreado morre no login — P-SAN3-01-E2E-LOGIN-DEFASADO, dono B-SAN3-10)
cp agent-orchestration/omega/juntas/votos/B-SAN3-01/apoio/e2e-copia-avulsa.spec.ts tests/e2e/_c2-copia.spec.ts
E2E_API_PORT=<API> E2E_FRONTEND_PORT=<WEB> npx playwright test -c playwright.config.ts tests/e2e/_c2-copia.spec.ts --reporter=list   # E1–E3 3/3
rm tests/e2e/_c2-copia.spec.ts
# tabela de mutação (§5.3): os 13 specs sobre o commit B
git diff --check
docker rm -f bsan301c2-pg bsan301c2-redis
```
Tudo com saída colada no `00-dev.md`; contêineres e worktree removidos pelo nome; nada tocado em `erp-*`, `pastrack-*`, `bsan301-*`, `j-*`, `dev-*`, `crit-*`.

## 7. KPI recontado (§C3.3) e registro

- **Precedente (M17):** `B-O6R-07a-ciclo2` — 2ª entrada do MESMO PR, `blocks_completed` inalterado, métricas remedidas. Aqui: nova entrada
  `B-SAN3-01-ciclo2` (pr 387; `merge_commit`/`approved_head` `null` na autoria) em `kpis-history.json` (append) e `kpis-history.md`; `kpis-latest.json`
  `version B-SAN3-01-ciclo2`, `frontend_smoke_tests` = execução real (≥ 1195), `backend_tests` = **reexecutado** (`npm test` com Postgres+Redis — o número
  publicado é o medido, não 2996/2998 copiado), `flutter_tests 864` carregado com nota, `blocks_completed 164` **inalterado** (mesmo bloco), `mvp_*` intocados,
  `release.summary`/`notes` reescritos com o que o ciclo 2 mede (fecha A-C1-01).
- **Gráfico "entregas por rodada":** a 2ª entrada conta como 2ª PUBLICAÇÃO da SAN3 (é como o `app.js` conta — M17 — e como ficou o precedente 07a);
  `tests/kpi-dashboard-charts.test.ts:46-49` afirma exatamente isso. Declarado no history: "2 publicações, 1 bloco".
- **Registro:** `R-B-SAN3-01-ciclo1.md` versionado em `omega/reprovacoes/`; votos do ciclo 1 em `votos/B-SAN3-01/`; este plano em
  `omega/planos/B-SAN3-01-ciclo2-plano.md`; ata `J-B-SAN3-01-ciclo2.md` com quem ocupou cada papel (achou / planejou / desenvolveu); `log-execucao.md` e
  `status-geral.md` apensados; `pendencias.md` (§2.6, §3) e índice pelo gerador; Emenda 3 no comando (orquestrador).

## 8. Riscos (em especial: consertar um reintroduz outro) e rollback

| # | Risco | Mitigação medida |
|---|---|---|
| R1 | **A recriação visual quebra E1–E3 / P1–P4 / sonda** (troca de `data-state`, do `role`, do texto do botão) | M13 enumera os seletores; `data-state` fica no elemento raiz do `StatePanel`, `role="alert"` só no erro, "Tentar novamente" segue `<button>`; V1–V6 + P1–P4 + E3 cobrem |
| R2 | **`forbidden` sempre vence em background** muda a regra R1 do ciclo 1 (dado ficava com `stale`) | só para `forbidden === true` (403); R1/R4 continuam para os demais; F1b/F2b afirmam; a C4 do ciclo 2 muta o contrário |
| R3 | **`Record` exaustivo + `?? "failure"`**: alguém "conserta" o `tsc` classificando o membro novo como `data` | decisão explícita e visível no diff do `Record`; a junta lê o `Record`; N1/N2 continuam vermelhos se a página não tratar |
| R4 | **Guard por AST lento ou frágil** no CI (79 arquivos) | `typescript` já carregado pelo `tsc`; o protótipo varreu os 79 em ~1 s (M4); fixtures G2/G3 protegem o próprio guard; forma positiva única (sem `!isMockMode()`), documentada no teste |
| R5 | **`repository.ts` reescrito** e as páginas mortas | M5: `tsc` EXIT 0; nenhuma rota (M11); nenhum teste importa o repositório (`grep` → 0 em `frontend/tests`) |
| R6 | **Inline sobrepondo `.pat-btn`** (10px 20px / raio 10 / 13px sobre 9px 16px / 9 / 12.5) diverge do padrão transversal | é a ficha do protótipo dos ESTADOS (`ERP Web.dc.html:362-382`), distinta do botão de cabeçalho padronizado (l.127) — código vence para tokens (§11); a C3 mede |
| R7 | **CTA "Nova OS" no vazio** cria elemento para quem não pode | nasce com gate `work_orders:create` (§2.5); a C2 exercita `viewer` como no ciclo 1 (M7 dela) |
| R8 | **KPI com 2ª publicação** lida como "2 blocos" | `blocks_completed` inalterado; nota explícita; precedente 07a |
| R9 | **Teto de dois ciclos**: qualquer achado `dentro-do-bloco` que bloqueie → parada + dossiê | por isso cada item tem mutação executada antes de ser afirmado (§5.3) e o escopo não cresce além do §4 |
| R10 | **Colisão em `Kpis/*` e `pendencias.md`** com PRs da rodada em curso (`B-O6R-04a`, `B-O6R-11`, `B-SAN3-04a`) | quem merge depois absorve a `main` e reexecuta (§5 do plano SAN3); índice pelo gerador |
| R11 | **A correção do `else`-default (P2) esconde um `empty` legítimo** | `empty` é ramo EXPLÍCITO (`status === "empty"`); P3 e V3 afirmam o vazio; E1 no ramo vazio com back real |

**Rollback:** revert do squash (1 commit); zero migration, zero contrato de backend; as pendências ficam (fatos medidos).

## 9. Composição do ciclo 2 (fixada pelo registro) · papéis · mandatos

**Papéis (§C7.4-bis):** acharam `cognicao-visual` e `guardiao-fail-closed` (ciclo 1) — **não votam nem consertam**; planejou `planejador-mestre`
(Fable — este parecer); desenvolve um `general-purpose` NOVO (nenhuma instância anterior do dev, nenhuma cadeira), que implementa SÓ este plano e não
julga os achados. Antes da junta: `inspetor-de-terreno-da-junta` (Fable, corpo da ref) — worktree por jurado, cluster Postgres+Redis por jurado que
muta, `sync-agent-agents --check`, baseline medido, insumos presentes (este plano, o `R-…-ciclo1`, o `00-dev.md` com a tabela de mutação).

**Junta — unanimidade de 4** (perda de dado + a 4ª cadeira da R1 do inspetor), identidade NOVA nas duas que reprovaram (`D-TETO-DOIS-CICLOS` item 2):
- **C1 `validador-mestre`** (revota): diff × §4 (nada além; `OperationsDispatchesPage` intocada); bateria §6 reexecutada com Postgres E Redis; commit A/B;
  KPI = medição (A-C1-01 fechado); registro (§2.6, §3, índice byte-idêntico); a tabela de mutação do dev conferida por amostra.
- **C2 `master-teste-telas-rotas`** (revota): E1–E3 pela cópia com back+front reais; 4 rotas × ramos (200 vazio / 500 / 403 / rede / 2xx malformado) sem
  token de mock; papel sem `create` não vê o CTA do vazio; K1–K9 (clicáveis) revalidados nos painéis novos.
- **C3 `frontend-pixel-master`** (identidade nova; como jurado NÃO escreve no objeto — M19): estilo COMPUTADO dos 6 painéis contra a ficha M8 (±2px; cor
  exata), hover/foco dos botões novos (`#1D4ED8`; `outline 2px solid #2563EB`), KPIs degradados sem cor semântica, erro ≠ sem permissão a olho;
  `screen-refs/web/` não cobre os estados — a referência é o `.dc.html` renderizado (o `c3-proto.cjs` do ciclo 1 mostra como).
- **C4 `coordenador-de-acessos`** (identidade nova) — mandato por extenso: (i) reproduzir as 13 mutações do ciclo 1 SOBRE o commit B e exigir o vermelho
  da coluna do §5; (ii) atacar a propriedade, não a instância: `!isMockMode()`/`else`, `isMockMode` local, barrel, arquivo novo em `operations/dispatches/`,
  `forbidden` em background, membro novo de `WorkOrderDetailStatus`, `source` novo (SRC2 contra o `assertNever`); (iii) cadeia 403 → estado com LOGIN REAL
  (papel sem `work_orders:read`): lista e detalhe mostram `forbidden` e o backend responde 403; (iv) escopo declarado com evidência de data em todo achado.
- `critico-adversarial` não é convocado (não é invariante financeiro — §C7.1-ter(b)).

**Se a junta reprovar de novo → parada + dossiê ao dono (`omega/reprovacoes/DOSSIE-B-SAN3-01-parada.md`), sem ciclo 3.**

## 10. Limpeza do terreno desta instância

`git -C bsan301 worktree remove --force .claude/worktrees/plan-bsan301-c2` (pelo nome) → `worktree list | grep -c plan-bsan301-c2` = 0; nenhum
contêiner foi criado (`docker ps -a | grep -c plan-bsan301` = 0 antes e depois); `bsan301` intacto (HEAD `74f3f7c9`, porcelain 0); árvore principal e base
viva não tocadas; o arquivo temporário de M6 removido (porcelain 0 conferido). Mantidos no scratchpad como evidência: `plan-mut/` (scripts, specs,
`i2-run-all.log`, `*.result.md`, `REPOFIX.json`), `plan-parts/` (as seções deste plano) e os dois parciais da 1ª instância. Resíduos alheios vistos e não
tocados: nenhum worktree `j-*`/`crit-*`/`dev-*`; `b04a`, `b11`, `bsan304a`, `gov-*`, `san2-r` são de outras frentes.
