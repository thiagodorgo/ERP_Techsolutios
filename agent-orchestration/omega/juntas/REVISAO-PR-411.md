revisor-b-san3-06b (revisor independente, D-GOV-PROPORCIONAL §C7 item 8(1)) · Claude Opus 5.5 (claude-opus-5-5) · head julgado af6f345ab6e9410e51b0037077f05e32728f8b66

# Revisão independente — PR #411 (B-SAN3-06b, "o console da plataforma sem ficção")

Data: 2026-10-09. Terreno: worktree próprio detached C:/Users/AMP/w-rev411 (npm ci próprio raiz + frontend, sem junction; sem banco, sem backend).

## 0. Terreno e objeto
- `git ls-remote origin refs/heads/feat/b-san3-06b-plataforma` → af6f345ab6e9410e51b0037077f05e32728f8b66
- `gh pr view 411 --json headRefOid,state` → af6f345a…, OPEN, base main
- `df -h /c` → 12G livres (limite de parada: 8 GB)
- worktree `git worktree add --detach C:/Users/AMP/w-rev411 af6f345a` → HEAD af6f345a; `git merge-base origin/main af6f345a` = a9bbde38 = origin/main (ramo em dia com a main).
- `npm ci` próprio na raiz (326 pacotes, exit 0) e em frontend/ (103 pacotes, exit 0) — diretórios reais, sem junction.
- 15 commits (9301a86a..af6f345a); 53 arquivos no diff (`git diff --name-status origin/main...af6f345a`).

### 0.1 CI no head (§C7.1-bis / rota R.6 exige "CI verde")
- `gh api repos/thiagodorgo/ERP_Techsolutios/commits/af6f345a/check-runs` (medido ~21:43Z):
  - run push 37994739221: frontend success · flutter success · owner-portal success · authority-portal success · docker skipped · **backend failure · backend-postgres failure**
  - run pull_request 37994874171: backend failure · backend-postgres failure · owner/authority success · frontend e flutter **in_progress** na medição.
- `gh run view 37994739221 --log-failed` → as duas falhas são no passo **"Initialize containers"**: `toomanyrequests: You have reached your unauthenticated pull rate limit` / `context deadline exceeded` puxando `postgres:16` do Docker Hub. **Nenhum teste de backend chegou a rodar.** Mesmo padrão no run 37993534591 (head anterior d73d421c; diff d73d421c..af6f345a = só 3 arquivos de registro/doc).
- `main` a9bbde38: backend e backend-postgres **success**.
- **Conclusão 0.1:** falha de infraestrutura do runner (rate limit do Docker Hub), não do código. Mas o objeto **não tem CI verde**: o job backend (que roda os testes da raiz que leem `frontend/src`) nunca executou neste head. Condição de merge: re-executar os jobs falhos até concluírem (não feito por mim — revisor só mede). Ver achado A-CI.

## 1. Bateria e números (R.5), escopo por laço
### 1.1 Typecheck
- `timeout 600 npm --prefix frontend run check` → `tsc -b --noEmit`, exit 0 (28 s). **verde**
### 1.2 Os 45 testes do bloco
- `node --test --import tsx tests/san3-06b-{organizacoes,cloud-billing,paradas-honestas,health}.smoke.test.tsx tests/san3-06b-navegacao-plataforma.test.ts tests/san3-06b-console-sem-ficcao.guard.test.ts` → `# tests 45 · pass 45 · fail 0 · skipped 0`; nomes T1..T45, cada um exatamente 1 vez. **verde, N=45 confere com o PR**
### 1.3 Escopo por laço (`git diff --name-only origin/main...af6f345a` = 53 arquivos × R.4)
- laço `case` sobre os 53: 37 PERM · 4 PERM nominal (PlatformLayout, platform-health-honest-stop, smoke-flow, frontend/package.json) · 5 docs nominais · 1 plano · 5 registro · **1 FORA: `docs/revisoes/SAN3/B-SAN3-06b-DEV-relatorio.md`** (o relatório do dev; artefato de registro/P7 que a R.4 não nomeia) → nota.
- proibidos (`git diff --name-only … -- Kpis src prisma mobile tests/e2e .github tests package.json package-lock.json frontend/package-lock.json App.tsx components hooks services mocks config modules/auth modules/navigation tenantNavigation.ts types.ts CLAUDE.md AGENTS.md .claude .agents scripts/bootstrap-platform-admin.ts scripts/kpi-freeze.mjs platform-overview.smoke platform-tenant-detail.smoke`) → **0 linhas**. **verde**
- numstat: PlatformLayout.tsx `1 5` (só PLATFORM_NAV: −Planos, −Auditoria Global, −Health, −APIs, −Configurações, +"Saúde do Sistema") ✔ · platform-health-honest-stop `1 1` (só l.29) ✔ · package.json `1 1` (só `test:smoke`, +6 arquivos `san3-06b-*` no fim) ✔ · docs nominais `1 1` nas linhas 13/32/369 ✔ · smoke-flow `21 19` só em l.750-878 (teste do adapter) e l.1464 ✔.
### 1.4 Suíte e regressões
- `timeout 1500 npm run test:smoke` (frontend) → `# tests 1313 · pass 1313 · fail 0 · skipped 0 · duration 145 s`, exit 0. **N=1313 confere com o PR.**
- Baseline 1268: contagem de `test(` em `smoke-flow.test.tsx` main=22/head=22 e `platform-health-honest-stop` main=2/head=2; os demais arquivos da lista são blob-idênticos à main; a lista do head = a da main + os 6 `san3-06b-*` (diff do package.json). Logo 1313 − 45 = 1268 = main. **Δ +45 confere.**
- regressões da R.5 (`platform-overview`, `platform-tenant-detail`, `platform-health-honest-stop`, `smoke-flow`, `sidebar-nav`, `access-gating`, `invoices-nfe-honest-stop`, `work-orders-honest-errors`) → `# tests 125 · pass 125 · fail 0`. Os 2 testes proibidos (`platform-overview`, `platform-tenant-detail`) passam **sem edição** (C-1). **verde**
- `timeout 900 npm run build` (frontend) → `2178 modules transformed · built in 20.77s`, exit 0 (só o aviso de chunk > 500 kB pré-existente). **verde**
- testes da raiz que leem `frontend/` (laço `git grep -l frontend -- tests/*.test.ts` sem `-db`: 5 arquivos, dos quais 3 leem `frontend/src`): `approval-frontend-contract`, `checklist-editor-blockers-parity`, `san3-04a-menu-front-x-catalogo` → `# tests 16 · pass 16 · fail 0`. (`kpi-dashboard-charts` e `operator-profiles` só citam a palavra.) Arquivos não-frontend do diff lidos por teste da raiz: só `pendencias.md`, e só em comentário (3 arquivos). **verde**
- `prisma generate` com `DATABASE_URL` fictícia só no ambiente do comando → exit 0; `npm run check` (raiz) exit 0; `npm run lint` (raiz = `npm run check`, tsconfig `include: src/**/*.ts` — **não cobre** `scripts/*.mjs`) exit 0. Os 5 `.mjs` passam `node --check`. **verde** (nota: "lint inclui os scripts novos" da R.5 não é verdade para este lint — só `node --check` cobre).
- `git diff --check origin/main...af6f345a` → sem saída, exit 0. **verde**
### 1.5 Geradores (re-executados por mim)
- literais → `arquivos varridos = 25 · sítios = 0` · telas → `rotas = 10 · PLATFORM_NAV = 4 · LIGADA = 6 · PARADA-HONESTA = 4 · SEM-FONTE = 0` · endpoints → `32` · testes com literal → `com asserção de literal = 0` · pendências (v2) → `seções 563 · citam B-SAN3-06b = 6 · abertas = 0` (as 6: P-019, P-SAN3-09-ORG-PLATAFORMA-NO-CONSOLE, P-WEB-CLOUD-BILLING-CARTAZ, P-WEB-PLATAFORMA-TELAS-FICCAO, P-WEB-PLATAFORMA-SEGURANCA-FABRICADA, P-SAN3-01-MOCKMODE-TRES-AUTORIDADES, todas FECHADA). **confere com o PR.**
### 1.6 Mutações MINHAS no código real (distintas de M1–M9 do dev)
Executor: `scratchpad/mut-rev411.mjs` — âncora única conferida (CRLF), mutação no arquivo real do worktree, `node --test --import tsx` nos 6 arquivos do bloco (R5 também em `platform-tenant-detail`), restauro por bytes + `git diff --quiet` limpo em todas.

| # | mutação | resultado | leitura |
|---|---|---|---|
| R3 | % de margem por organização **calculado no front** (`marginAmount/allocatedCost*100`) na tabela de cobrança | **vermelho** — T45 (44/45) | C-2 aritmética: pega |
| R4 | `nextRefreshState` sem `!next.forbidden` (403 em 2º plano vira "desatualizado" e mantém o dado) | **vermelho** — T6 (44/45) | estado §7: pega |
| R7 | usuários da organização de sistema voltam a contar em "Usuários totais" | **vermelho** — T41 e T42 (43/45) | C-1: pega |
| R1 | a página importa e expõe o **alias de escrita** `runCloudAllocation` do `cloud-billing.service` | **verde 45/45 — escapa** | T44 só procura o texto dos 5 nomes `*FromApi`; o serviço reexporta as 5 escritas com outros nomes (`importCloudCosts`, `runCloudAllocation`, `calculateCloudCharges`, `createCloudChargeRule`, `updateCloudChargeRule`) → achado A3 |
| R2 | `formatMoney` ignora a moeda do DTO e formata tudo como BRL | **verde 45/45 — escapa** | todos os fixtures são BRL; nenhum teste prova moeda ≠ BRL → nota N1 |
| R5 | tira o selo "Organização de sistema" do Detalhe | **verde 52/52 — escapa** | a C-1 manda o selo no Detalhe; T41–T43 não cobrem o Detalhe → nota N2 |
| R6 | Worker sempre "Operacional" na Saúde | **verde 45/45 — escapa** | T29/T30 usam `worker.status: "healthy"`, valor que o backend NUNCA emite (`job.heartbeat.ts`: `up|starting|stale|not_expected`) → nota N3 |

**Conclusão do item 1:** bateria da R.5 reproduzida e números do PR conferem (45/45 · 1313/1313 · Δ+45 · 125/125 · 16/16 · check/build/lint/diff --check verdes · geradores conforme). Escopo dentro da R.4 (1 arquivo de registro fora da lista nominal: o relatório do dev — nota N4). 3 das minhas 7 mutações ficaram vermelhas (R3, R4, R7); 4 escaparam (R1 → A3; R2, R5, R6 → notas). **CI do head não está verde (A-CI).**

## 2. Honestidade e leitura de dinheiro (C-2, a fronteira da rota)
### 2.1 Escrita
- `git grep -nE 'method:\s*"(POST|PUT|PATCH|DELETE)"'` no módulo de plataforma + navegação + PlatformLayout: **10 no head = 10 na main**, mesmos arquivos (5 em `cloud-billing.adapter.ts`, 5 em `platform.adapter.ts`, este último fora do diff). Linhas adicionadas pelo diff em `frontend/src` com `apiRequest/fetch`: só os 5 GETs com período e o `fetch("/api/v1/health/ready")` (GET público). **Nenhuma escrita nova.**
- AST (`scratchpad/ast-c2.mjs`, typescript 5.9 do worktree): as 5 funções de escrita têm texto de nó **igual** main × head (whitespace normalizado). `toRuleApiInput` e `defaultPeriodBody` mudam só por formatação: tokens iguais (o primeiro) e caracteres iguais sem espaço/quebra/vírgula (o segundo).
- Consumidores fora de `cloud-billing.{adapter,service}.ts` das 5 `*FromApi` **e** dos 5 aliases do serviço: `git grep` → **0**. Importadores do serviço: só `PlatformCloudBillingPage.tsx` (`currentBillingMonth`) e `useCloudBilling.ts` (`getCloudBilling`, `periodForMonth`). **C-2 vale hoje.** A trava que deveria segurá-la no futuro (T44) escapa pelo alias (R1) → A3.
- Permissão/autorização: `App.tsx`, `PermissionGuard`, catálogo, `src/**` intocados (laço do 1.3). Saúde usa rota pública sem `Authorization` (T31). Nada reclassifica o bloco para junta completa.
### 2.2 Aritmética monetária no front
- Varredura AST de expressões binárias `+ - * / %` em `cloud-billing/*` (`scratchpad/arith.mjs`): só datas (`month - 1 - index`, `getUTCMonth() + 1`) e as duas **larguras de barra** (`service.unblendedCost / maxServiceCost * 100`, `tenant.allocationRatio * 100`), ambas dentro de `width:` — o que a C-2 permite. O `%` de margem vem só de `totalMarginPercentage`/`marginPercentage` (render com o percentual ausente → "percentual não informado", sem `%`; T45 e minha R3 confirmam). **Sem aritmética monetária no front.**
- DTOs do backend conferidos campo a campo (`cloud-charge.types.ts:191-210`, `cloud-cost-allocation.types.ts:158-176`, `aws-cur.types.ts:136-155`, `cloud-usage.types.ts:78-91`): adapter/tipos espelham; backend converte `numeric` para `number` (`Number(...)`) — `readNumber`→0 em campo ausente não tem efeito vivo hoje.
### 2.3 Organização de sistema (T41–T43)
- render (`frontend/rev411-render.tmp.tsx`, temporário, já apagado) com `platform` + 2 clientes: Organizações → "1 Organizações ativas sem a organização de sistema · 15 Usuários totais · Todas (2)" e a linha "Plataforma · Organização de sistema · Sistema" sem ação "Ver"; Visão Geral → "1 … de 2 organizações, sem a organização de sistema · 15"; Detalhe → selo "Organização de sistema". Mutação R7 → T41/T42 vermelhos. T43 lê `scripts/bootstrap-platform-admin.ts` (`PLATFORM_TENANT_SLUG = "platform"`) = constante do front. **Conforme.**
- Fora da C-1: Cloud Billing não trata a organização de sistema — o rateio carrega todas as organizações e casa por `slug` (`cloud-cost-allocation.engine.ts:22`), então "Plataforma" pode aparecer em "Por organização"/"Cobrança por organização" e contar em "Organizações com cobrança" → nota N6 (pendência de produto, não defeito deste bloco).
### 2.4 Nenhum número/linha sem fonte
- Gerador de literais → 0 sítios; telas → SEM-FONTE 0. Render de 26 estados (Organizações, Visão Geral, Detalhe, Cloud Billing, Saúde e as 4 paradas): nas paradas, carregando, falha e acesso negado, **0 dígitos** no texto visível; vazio de Cloud Billing só os 4 dígitos do ano no cabeçalho.
- **DEFEITO (A1) — dinheiro de um mês exibido sob o rótulo de outro.** `useCloudBilling` não descarta resposta de período antigo: o `setData` aceita qualquer `next` (`nextRefreshState` não olha `period`) e a View escreve o cabeçalho a partir do `month` selecionado, não de `data.period`. Execução (`frontend/rev411-race.tmp.tsx`, serviço e reducer REAIS, só o `fetch` é dublê; resposta de agosto chega depois da de setembro): `período do dado na tela: 2026-08-01 → 2026-08-31 | mês selecionado: 2026-09` · `cabeçalho: setembro de 2026 | Valor cobrável exibido: R$ 999,99 (valor de AGOSTO)`. Basta trocar de mês com um GET (inclusive o auto-refresh de 2º plano) em voo. É exatamente o risco que a R.7 nomeia ("mostrar dinheiro errado mesmo sem escrevê-lo"). Não é escrita nem regra financeira nova → **não reclassifica** o bloco; é defeito de exibição dentro do bloco.
### 2.5 Refatoração do sucessor (ca29352f) — comportamento igual?
- Os ramos de estado: md5 das linhas `if (loading|data.|!hasRows|empty …) return …` **iguais** em c29a1f8b e no head — Organizações 4 ramos, Cloud Billing 4, Saúde 2; predicados `hasRows`/`empty` iguais por md5.
- `nextRefreshState` × predicado inline de c29a1f8b: tabela-verdade completa, **72 combinações, 0 divergências**.
- `git diff ca29352f af6f345a -- frontend/src` → vazio (os commits seguintes só mexem em teste/doc/registro).
- Contra a `main`: os testes da main intocados (`platform-overview` 6, `platform-tenant-detail`, `platform-health-honest-stop`) verdes no head (dentro dos 125/125). A única mudança de comportamento intencional é o E1b (falha em 2º plano preserva o último dado com aviso, em vez de esvaziar), que é o que o plano pede. **Refatoração sem mudança de comportamento: confirmada por execução.**

## 3. UI, estados obrigatórios e as 4 divergências declaradas
### 3.1 Texto na UI (§3/§11)
- Render de 26 estados, texto visível varrido por: `Tenants?`, `tenant`, sem-acento (`Configuracoes|Saude|Operacoes|Modulos|Organizacao|nao`), andaime (`PLANNED|TODO|WIP|mock|fallback|P0\d`), rota/endpoint (`/api/`, `/platform/`), inglês de rótulo (`Health|dashboard`), `undefined|NaN|null` → **0 ocorrências em todos os 26**. "Saúde do Sistema", "Configurações da Plataforma", "Auditoria da Plataforma", "Organizações", "Módulos" com acento. "Cloud Billing" mantido como nome de tela (é o nome da referência-ouro `screen-refs/Cloud Billing.reference.html`).
- `git grep` de `Tenant` nos arquivos da fronteira → só 2 comentários de código. `PLATFORM_NAV` = Visão Geral · Organizações · Cloud Billing · Saúde do Sistema. `PlatformTenantModulesPage`: andaime "P03 Console da Plataforma" removido, "Salvar alterações"/"Módulos não encontrados" acentuados, plano em PT-BR.
- Nota N7: o registro `platformNavigation.ts` (só alimenta o menu mock) ainda chama a tela de "Auditoria Global" enquanto a página se chama "Auditoria da Plataforma" — coberto por `P-SAN3-06B-MENU-PLATAFORMA-TRES-FONTES`.
### 3.2 Estados §7
| tela | carregando | vazio | erro | acesso não permitido | desatualizado |
|---|---|---|---|---|---|
| Organizações | ✔ (skeleton) | ✔ "Nenhuma organização" | ✔ "Não foi possível carregar as organizações" (0 dígitos) | ✔ | ✔ aviso + tabela preservada |
| Visão Geral | (pré-existente) | (pré-existente) | (pré-existente) | (pré-existente) | ✔ aviso |
| Cloud Billing | ✔ | ✔ "Nenhum custo importado no período" — **sem seletor de mês (A2)** | ✔ (0 dígitos) | ✔ | ✔ aviso + dados preservados |
| Saúde | ✔ | n/a | ✔ "Não foi possível consultar a prontidão" | n/a (rota pública; porta do App) | ✔ aviso |
| 4 paradas honestas | n/a | parada honesta, 0 dígitos | n/a | porta do App | n/a |
- **DEFEITO (A2) — vazio de Cloud Billing sem saída.** O estado vazio renderiza o cabeçalho **sem** o `<select>` de mês (render `cb.empty`: `select=false`) e diz "Selecione outro mês ou aguarde uma importação confirmada". Como o mês inicial é o corrente e a R.7 prevê vazio honesto até o `B-SAN3-05`, o caminho mais comum de entrada deixa o usuário preso no mês vazio; e quem escolhe um mês vazio perde o seletor e não consegue voltar sem recarregar.
- Nota N3: Saúde — `worker.status` do backend é `up|starting|stale|not_expected`; `starting` (carência de boot) aparece como **"Indisponível"** com "Sistema pronto" (render `health.starting`); os testes usam `"healthy"`, que o backend não emite (mutação R6 escapa).
### 3.3 As 4 divergências do relatório
1. **Geradores reformatados** — extraí os 5 dos Apêndices A–E (md5 `99e599a2 · ec0101e1 · c3c987eb · e07b5880 · 70e47c96`, = R.0) e montei a (e) v2 trocando as duas âncoras (`/^## /` e `/^## (` → `#{2,4}`): md5 **`b97cd902482b2e0ed56acf2a8d153b9a`** = C-6. Rodados na mesma árvore do head contra os commitados: (b), (c), (d) **saída idêntica**; (e) v2 **idêntica**; (a) idêntica salvo a coluna "classificação" e os 3 totais novos que A11/T36 exigem. → **aceitável como está.**
2. **A18 com 2 menções a `navigation/menu?scope=platform`** — `docs/platform-console.md:83` (lista de endpoints) e `docs/backend-navigation-menu.md:47` (exemplo de query, linha fora do PERMITIDO); nenhuma afirma que o `PlatformLayout` consome o endpoint; a frase falsa da main (`platform-console.md:13`) saiu e as linhas 13/32/369 dos outros docs agora dizem a verdade (`PLATFORM_NAV`). O critério literal "→ 0" falha, a propriedade (nenhum doc mente sobre o consumo) vale. → **aceitável como está.**
3. **"Custo importado" de `totalUnblendedCost` (number)** — o próprio DTO documenta o `number` como lossy só acima de ~1e10 e "mantido por compatibilidade do painel"; para exibição com 2 casas a diferença é nula na faixa real. → **aceitável como está** (nota; se o dono quiser conferência de fatura na tela, pendência para o bloco de produto Cloud Billing).
4. **T2/T8 por ligação no código** — sem biblioteca de DOM no repo (`jsdom`/`happy-dom`/`react-test-renderer`/`@testing-library` ausentes em `node_modules` e `frontend/node_modules`); acrescentar uma seria dependência nova (§C4/§C7.1). Declarado no próprio teste. → **aceitável como está** (nota: são guardas de forma, não de comportamento).

## 4. Limpeza
- `frontend/rev411-render.tmp.tsx` e `frontend/rev411-race.tmp.tsx` apagados; `git status --short` limpo; `frontend/dist` e o worktree removidos no fim (linha abaixo).

## VEREDITO: APROVADO COM AJUSTES

O bloco cumpre a tese "console sem ficção" e a fronteira da rota: **nenhuma escrita nova, nenhuma permissão/autorização nova, nenhuma aritmética monetária no front** (2.1–2.2), organização de sistema fora das métricas de clientes (2.3), bateria e números do PR reproduzidos (1.x), refatoração do sucessor sem mudança de comportamento (2.5). **Não há motivo para reclassificar para junta completa.** O merge, porém, depende de: CI verde no head (A-CI) e dos ajustes A1, A2 e A3 de volta ao dev (achado dentro do bloco, R.6 passo 3). Depois deles, basta este revisor (ou outro independente) re-executar 2.4/3.2 e as mutações R1/A1 no head novo.

### Achados
| id | gravidade | escopo | achado | evidência executada |
|---|---|---|---|---|
| A-CI | **bloqueia (o MERGE, não o código)** | pre-existente (infra do runner) | o head af6f345a **não tem CI verde**: `backend` e `backend-postgres` falharam nos dois runs (push 37994739221, pull_request 37994874171) e no head anterior (37993534591), todos no passo "Initialize containers" — `toomanyrequests: You have reached your unauthenticated pull rate limit` puxando `postgres:16`. **Nenhum teste de backend executou** neste head; a rota (D-GOV-PROPORCIONAL (1), R.6 passo 2) exige CI verde. A `main` a9bbde38 tem os dois verdes. | `gh api …/commits/af6f345a/check-runs` (medido 21:43Z e 21:57Z, todos concluídos) · `gh run view 37994739221 --log-failed` · `gh run view 37993534591 --log-failed` |
| A1 | ajuste (antes do merge) | dentro-do-bloco (`useCloudBilling.ts` é novo) | Cloud Billing pode exibir o dinheiro de um período sob o rótulo de outro: resposta de período antigo não é descartada (`nextRefreshState` não olha `period`; o cabeçalho usa o `month` selecionado) | `frontend/rev411-race.tmp.tsx` (serviço+reducer reais, `fetch` dublê com agosto lento): dado `2026-08-01→2026-08-31`, cabeçalho "setembro de 2026", "Valor cobrável R$ 999,99" (valor de agosto) |
| A2 | ajuste (antes do merge) | dentro-do-bloco | estado vazio de Cloud Billing sem seletor de mês, com texto "Selecione outro mês…": quem cai num mês vazio (o corrente, por padrão) fica preso | render `cb.empty` → `select=false`; `cb.data` → `select=true` |
| A3 | ajuste (antes do merge, ou pendência com dono se o orquestrador preferir) | dentro-do-bloco (T44 e os aliases do serviço são do bloco) | a trava de C-2 (T44) não enuncia a propriedade: procura só o texto dos 5 nomes `*FromApi`, e o `cloud-billing.service.ts` reexporta as 5 escritas como `importCloudCosts/runCloudAllocation/calculateCloudCharges/createCloudChargeRule/updateCloudChargeRule`. O plano pedia "varredura AST" | mutação R1 (página importa e expõe `runCloudAllocation` do serviço) → **45/45 verdes**; consumidores reais hoje = 0 (`git grep`), então C-2 vale hoje |
| N1 | nota | dentro-do-bloco | nenhum teste prova moeda ≠ BRL (todos os fixtures BRL); o código hoje respeita a moeda do DTO (render com USD → "US$ 12,75") | mutação R2 (sempre BRL) → 45/45 verdes |
| N2 | nota | dentro-do-bloco | selo "Organização de sistema" no Detalhe (C-1) não tem teste | mutação R5 → 52/52 verdes |
| N3 | nota | dentro-do-bloco | Saúde: `worker.status` `starting` → "Indisponível" com "Sistema pronto"; fixtures usam `"healthy"`, que o backend não emite | render `health.starting`; mutação R6 → 45/45 verdes; `src/infra/jobs/job.heartbeat.ts` `WorkerHealthStatus` |
| N4 | nota | dentro-do-bloco | `docs/revisoes/SAN3/B-SAN3-06b-DEV-relatorio.md` fora da lista nominal da R.4 (é o arquivo de saída/P7 do dev) — aceitável | laço do 1.3 |
| N5 | nota | pre-existente | `npm run lint` da raiz = `tsc` com `include: src/**/*.ts`: **não** cobre `scripts/*.mjs` (a R.5 diz que cobre); só `node --check` os valida | `tsconfig.json:15`, `package.json:33` |
| N6 | nota | pre-existente (regra de rateio do backend) | Cloud Billing não trata a organização de sistema; o rateio casa organização por `slug` e carrega todas, então "Plataforma" pode aparecer como organização cobrada e contar em "Organizações com cobrança" — pergunta de produto para `P-DONO-CLOUD-BILLING-ESCOPO` | `cloud-cost-allocation.engine.ts:22`, `cloud-cost-allocation-prisma.repository.ts:324` |
| N7 | nota | pre-existente | registro `platformNavigation.ts` diz "Auditoria Global", a página diz "Auditoria da Plataforma" (registro só do menu mock) | `grep label: platformNavigation.ts` |
| D1–D4 | — | — | as 4 divergências declaradas: **aceitáveis como estão** (3.3) | 3.3 |

## Encerramento do terreno
- 0 processos `node` com `w-rev411` na linha de comando antes da remoção; `git worktree remove --force C:/Users/AMP/w-rev411` → exit 0; diretório ausente; `git worktree list` sem `w-rev411`. Worktrees `w-06b` e `w-o05` não tocados (presentes). Disco: 12 GB livres. Nada commitado no ramo; nenhum banco/backend subido.

## Re-revisão (head 5cf7e2d5)
revisor-b-san3-06b (mesma identidade da revisão; não escreveu os ajustes) · Claude Opus 5.5 · head julgado 5cf7e2d5df9daf254e12b6069de9c1af948c6f3f

### R0. Terreno
- `git ls-remote origin refs/heads/feat/b-san3-06b-plataforma` → 5cf7e2d5df9daf254e12b6069de9c1af948c6f3f · `gh pr view 411 --json headRefOid` → 5cf7e2d5…, OPEN, mergeStateStatus CLEAN · origin/main = a9fbe283 · `df -h /c` → 14 GB livres (2026-10-10 03:16Z).
- worktree próprio `git worktree add --detach C:/Users/AMP/w-rev411b 5cf7e2d5` → HEAD 5cf7e2d5; `npm ci` próprio na raiz e em frontend/ (exit 0, sem junction).
- commits novos `af6f345a..5cf7e2d5`: 7e0341aa fix A1 · 4dba043a test A1 · 95dd3f11 fix A2 · 2219c92d test A3 · 18d967b3 merge da main (pais 2219c92d + a9fbe283 = #405) · 5cf7e2d5 relatório. Arquivos dos ajustes (`git diff --name-only af6f345a 2219c92d`): `cloud-billing.state.ts` (novo), `PlatformCloudBillingPage.tsx`, `useCloudBilling.ts`, `san3-06b-cloud-billing.smoke.test.tsx`, `san3-06b-console-sem-ficcao.guard.test.ts` — todos em `frontend/src/modules/platform/**` ou `frontend/tests/san3-06b-*` (PERMITIDO). 5cf7e2d5 só toca o relatório do dev.

### R4. O merge da main (18d967b3)
- `git diff --name-only af6f345a 5cf7e2d5` traz também `src/database`, `src/server.ts`, `src/config`, `tests/san3-05-*`, `scripts/db-runtime-role.sh`, `.claude/agents`, `.agents/agents`, `agent-orchestration/omega`, `docker-compose.prod.yml`, `.gitattributes` etc. — **tudo isso é o #405 vindo da main**, não do bloco:
  - delta da main `a9bbde38..a9fbe283` = **135 arquivos**; delta trazido pelo merge `2219c92d..18d967b3` = **135 arquivos**; conjuntos **iguais** (`diff` vazio).
  - blob a blob, os 135 no merge × `a9fbe283`: **131 idênticos**, 4 diferentes — exatamente os 4 que o bloco também toca (`log-execucao.md`, `pendencias.md`, `pendencias-indice.md`, `status-geral.md`). `git diff-tree --cc 18d967b3` (o que o merge resolveu à mão) → **só esses 4**, todos registro.
  - as 4 resoluções preservam os dois lados: linhas acrescentadas pela main e pelo bloco ausentes no merge = 0 em `log-execucao` (22/12), `pendencias.md` (115/69), `status-geral` (26/8); `pendencias-indice.md` é gerado — `python agent-orchestration/controle/gerar-indice-pendencias.py` no head reproduz o arquivo commitado **byte a byte** (hash-object igual antes/depois).
  - `Kpis/` não aparece nem no delta da main nem no do merge.
- **Conclusão R4:** o merge não mudou nada fora do registro (e nem tocou `Kpis/`); o resto é a main byte a byte. **conforme.**

### R1. A1 — dinheiro de um mês sob o rótulo de outro
- Correção lida: `cloud-billing.state.ts` (novo) — `nextCloudBillingState` descarta resposta de período ≠ selecionado e não deixa o mês novo herdar o anterior como "desatualizado"; `useCloudBilling.ts` — `selected` (ref do período atual) e descarte antes do `setData`; `PlatformCloudBillingScreen` — dado cujo `period` não é o do `month` rotulado vira esqueleto (carregando). Três camadas.
- **Minha corrida, de novo** (`frontend/rev411b-race.tmp.tsx`, temporário e já apagado; serviço `getCloudBilling`, regra `nextCloudBillingState` e `Screen` REAIS; só o `fetch` é dublê com agosto lento — 60 ms × 5 ms; hook emulado linha a linha porque o repo não tem lib de DOM; rótulo medido no cabeçalho "‹mês› · atualizado", não nas opções do seletor):
  - S1 hook completo, agosto 1ª carga → dado 2026-09 · rótulo "setembro de 2026" · Valor cobrável **R$ 18,00** · "999" na tela = **false**
  - S2 hook completo, agosto em auto-refresh de 2º plano → idem, **R$ 18,00**, 999 = false
  - S3 sem o descarte do hook (só a regra) → idem, **R$ 18,00**, 999 = false
  - S4 dado de agosto entregue direto à Screen com setembro selecionado → **sem rótulo de mês (esqueleto), nenhum valor**, 999 = false
  - S5 controle: o mesmo dado com agosto selecionado → "agosto de 2026" e R$ 999,99 (a guarda não esconde o mês certo)
  - (na revisão, no head af6f345a, a mesma corrida exibia R$ 999,99 sob "setembro de 2026").
- T46–T48 no head: **verdes** (dentro dos 49/49 abaixo). Mutações da correção (`scratchpad/mut-fix.mjs`, restauro + `git diff --quiet` limpo): Ma (tira o descarte da regra) → **T47 vermelho**; Mb (tira a guarda da Screen) → **T46 vermelho**; Md (tira o descarte do hook) → **T48 vermelho** (guarda de forma, declarada como tal no teste).
- **Conclusão R1: A1 FECHADO.** Nenhum valor de um mês aparece sob o rótulo de outro, por três camadas independentes, cada uma com teste que a defende.

### R2. A2 — vazio sem seletor
- O estado vazio passou a renderizar o mesmo `<MonthSelect>` do cabeçalho com dados. T49 (renderiza o vazio com o mês corrente, 12 `<option>`, o corrente `selected`, e aciona o `onChange` do `<select>` achado na árvore → `["2026-08"]`) **verde**.
- Mutações: Mc (tira o `<MonthSelect>` do vazio) → **T49 vermelho**; Me (seletor presente, mas `onChange` não troca o mês) → **T49 vermelho**.
- **Conclusão R2: A2 FECHADO.**

### R3. A3 — a trava da C-2 (T44)
- T44 agora deriva "escrita" do código pelo verificador de tipos do TypeScript: em `cloud-billing.{adapter,service}.ts`, toda `function`/`const` de topo que monta requisição com `method` ≠ "GET" e, por fecho, toda `function`/`const` que referencia uma delas; fora desses arquivos acusa referência resolvida pelo checker, `import * as`, `export *` e `import()`. A mutação interna do teste cobre 8 formas (nome do adapter, a minha R1, import renomeado, namespace, reexport renomeado + consumidor, `import()` por propriedade e por chave literal, `export *`) + controle de leitura.
- `scratchpad/mut-rev411b.mjs` no arquivo REAL, só o arquivo de guarda, `tsc -b --noEmit` antes (toda mutação compila), restauro + `git diff --quiet` limpo:
  - **R1** (a página importa e expõe `runCloudAllocation` do serviço) → **T44 VERMELHO** (8/9; acusa `referencia escrita: runCloudAllocation`). ✔
  - N3 (controle meu: `export const acoes = { rodar: runCloudAllocation }` no serviço, página usa `acoes.rodar()`) → **T44 vermelho** (`referencia escrita: acoes`). ✔
  - **N1, forma nova minha — alias por objeto no `export default` do serviço** (`export default { rodar: runCloudAllocationFromApi }`; a página faz `import acoes from "../cloud-billing.service"` e `acoes.rodar()`) → **T44 VERDE 9/9 — escapa**.
  - **N2, forma nova minha — alias por classe no serviço** (`export class AcoesCloud { static rodar = runCloudAllocationFromApi }`; a página chama `AcoesCloud.rodar()`) → **T44 VERDE 9/9 — escapa**.
  - Causa (lida no teste): a derivação só recolhe `FunctionDeclaration` e `VariableStatement` de topo; `export default <expressão>` (ExportAssignment) e `class` não entram na fecho, embora o comentário do T44 diga "toda declaração desses dois arquivos que referencia uma delas — os aliases e wrappers do serviço entram qualquer que seja o nome".
- Hoje não há consumidor de escrita fora do adapter/serviço (C-2 vale; `git grep` da revisão segue válido — os dois arquivos não mudaram no ajuste).
- **Conclusão R3: A3 FECHADO para a forma achada (R1) e para as 7 vizinhas que o dev cobriu.** Restam 2 formas que exigem acrescentar um "porta-alias" de outro tipo DENTRO do serviço e consumi-lo → nota N8 (pendência com dono), não reprova: a trava ficou muito mais forte, e não há escrita nem consumidor hoje.

### R5. Bateria e escopo (head 5cf7e2d5)
- CI: `gh api …/commits/5cf7e2d5/check-runs` → **14/14 completed success** (authority-portal, backend, backend-postgres, docker, flutter, frontend, owner-portal × 2 runs). **A-CI da revisão: FECHADO.**
- Testes do bloco (6 arquivos) → `# tests 49 · pass 49 · fail 0 · skipped 0`; T1..T49, cada um exatamente 1 vez.
- `npm --prefix frontend run check` → exit 0. Raiz: `prisma generate` (URL fictícia só no ambiente) exit 0; `npm run check` exit 0.
- Testes da raiz que leem `frontend/src` (o mesmo laço da revisão → os mesmos 5 arquivos, 3 leem `frontend/src`): `approval-frontend-contract`, `checklist-editor-blockers-parity`, `san3-04a-menu-front-x-catalogo` → `# tests 16 · pass 16 · fail 0`.
- Escopo por laço contra a main NOVA (`git diff --name-only origin/main...5cf7e2d5`, origin/main = a9fbe283): **54 arquivos, 0 fora do PERMITIDO** (o relatório do dev incluído, como na revisão); proibidos (`Kpis src prisma mobile tests/e2e .github tests` raiz, lockfiles, `App.tsx`, `components/hooks/services/mocks/config`, `modules/auth|navigation`, `CLAUDE.md`, `AGENTS.md`, `.claude`, `.agents`, `bootstrap-platform-admin.ts`, os 2 testes proibidos) → **0**. numstat: `PlatformLayout.tsx 1 5` · `platform-health-honest-stop 1 1` · `package.json 1 1` (inalterados). `git diff --check origin/main...5cf7e2d5` → limpo. O delta da main (#405) não toca `frontend/` (0 arquivos), e `cloud-billing.{adapter,service}.ts` não mudaram desde af6f345a (0) — as conclusões de C-2 da revisão continuam valendo.
- `timeout 1500 npm run test:smoke` → `# tests 1317 · pass 1317 · fail 0 · skipped 0 · cancelled 0` (189 s). **N = 1317 confere com o dev** = 1313 da revisão + 4 (T46–T49).
- `npm --prefix frontend run build` → `2179 modules transformed · built in 19.80s`, exit 0.
- Geradores no head: literais `sítios = 0` · telas `10 rotas · PLATFORM_NAV 4 · LIGADA 6 · PARADA-HONESTA 4 · SEM-FONTE 0` · testes com literal `= 0` · pendências `citam B-SAN3-06b = 6 · abertas = 0` (após o merge do registro da main).

### VEREDITO FINAL: APROVADO

A-CI, A1, A2 e A3 da revisão estão fechados por execução: CI 14/14 verde; a corrida de agosto/setembro não mostra mais nenhum valor sob o rótulo errado (três camadas, cada uma derrubada por mutação → T46/T47/T48 vermelhos); o vazio tem o seletor e ele troca o mês (T49, duas mutações vermelhas); a minha R1 deixa o T44 vermelho. O merge da main só trouxe a main byte a byte, com 4 resoluções de registro que preservam os dois lados, e não tocou `Kpis/`. Bateria e escopo conformes (1317/1317 · 49/49 · 16/16 · check/build verdes · 0 arquivo fora do PERMITIDO). A rota continua a proporcional: nenhuma escrita, permissão ou regra financeira nova.

| id | gravidade | escopo | achado | evidência executada |
|---|---|---|---|---|
| A-CI | fechado | — | CI do head verde | check-runs 14/14 success |
| A1 | fechado | — | dinheiro sempre do período rotulado | corrida S1–S5; mutações Ma/Mb/Md → T47/T46/T48 vermelhos |
| A2 | fechado | — | vazio com seletor que troca o mês | T49; mutações Mc/Me → T49 vermelho |
| A3 | fechado (forma achada) | — | T44 pega a R1 e 7 formas vizinhas | R1 → T44 vermelho; N3 → vermelho |
| N8 | nota → pendência com dono (sugestão: o bloco de produto Cloud Billing que abrir a escrita, `P-SAN3-06B-CLOUD-BILLING-ESCRITA`) | dentro-do-bloco | o T44 não alcança porta-alias de outro tipo DENTRO do serviço: `export default { rodar: runCloudAllocationFromApi }` e `export class AcoesCloud { static rodar = … }`, consumidos pela página, compilam e deixam o T44 verde (a derivação só recolhe `function` e `const` de topo, embora o comentário prometa "qualquer declaração") | `scratchpad/mut-rev411b.mjs`: N1 e N2 → `tsc` ok, guard 9/9 verde; hoje não há consumidor de escrita |
| N1–N7 | notas da revisão | — | seguem como registradas (moeda ≠ BRL sem teste; selo do Detalhe sem teste; worker `starting`; relatório fora da lista; lint da raiz sem `.mjs`; organização de sistema no Cloud Billing; rótulo do registro) | revisão acima |

#### Encerramento do terreno da re-revisão
- arquivos temporários (`rev411b-race.tmp.tsx`) apagados; `git status --short` do worktree limpo; 0 processos `node` com `w-rev411b`; `git worktree remove --force C:/Users/AMP/w-rev411b` → exit 0, diretório ausente, fora do `git worktree list`. `w-06b`/`w-o05` não tocados. Nada commitado no ramo; nenhum banco/backend subido.
- Anomalia de terreno (só registro, sem efeito no mérito): ao fim, `C:/Users/AMP/w-o05` **não existe mais** (presente na revisão de 09/10; esta sessão nunca o usou nem removeu — só removi `w-rev411` e `w-rev411b`, por caminho exato). `w-06b` presente. Disco: 14 GB livres.
