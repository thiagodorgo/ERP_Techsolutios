> **Molde para comandos de bloco (Parte C do `CLAUDE.md`).** Copie este arquivo para
> `agent-orchestration/codex/comandos/B-NNN-<slug>.md` e preencha os `<...>`.
> **Em divergência, vale o `CLAUDE.md`** (Parte C — C1..C7, §9 baterias, §10 DoD) e as fontes de
> verdade (A1) — nunca este molde nem a memória do agente.
>
> Como usar: apague os comentários `<!-- ... -->` de instrução ao preencher; mantenha só as
> seções que se aplicam ao bloco (as marcadas *(opcional)* podem cair; **Objetivo**, **Escopo
> permitido/proibido**, **Bateria de validação**, **DoD** e **Rastreabilidade** são obrigatórias).
> A estrutura abaixo foi extraída dos comandos reais em `agent-orchestration/codex/comandos/`
> (`Objetivo` aparece em 52/52; `Escopo permitido/proibido`, `Contratos/Endpoints`, `Regras`,
> `Validações`, `Limites`, `KPI` são as demais recorrentes) e atualizada para a política vigente
> (KPI-por-PR §C3, autonomia por juntas §C7) — os comandos antigos (`B-107`, `B-108`, `B-110`…)
> **predatam** essa política e por isso ainda dizem "não atualizar KPI"; **este molde reflete o
> `CLAUDE.md` atual**.

---

# B-NNN — <título curto do bloco>

<!-- Sufixo do ID define o tipo (C1): B-NNN = Feature (atualiza KPI no próprio PR) ·
     B-NNNG = Gate · B-NNNF = Correção de KPI · B-NNNK = Resumo de marco (opcional). -->

- **Tipo:** <feature | gate (B-NNNG) | correção-KPI (B-NNNF) | resumo-de-marco (B-NNNK)>
- **Fase:** <Discovery | Definition | Architecture | Execution | Validation | Persistence>  (A5)
- **Trilha:** <backend/raiz · frontend (React) · mobile (Flutter) · doc/KPI>  <!-- decide a bateria (§9) -->
- **Data:** <AAAA-MM-DD>
- **Branch:** `<feat|fix|chore|docs|test>/<area>-b<nnn>-<slug>`  <!-- 1 bloco = 1 branch = 1 PR (§8) -->
- **Autor:** <agente/rodada>

## Objetivo

<!-- 2-3 linhas: o que o bloco ENTREGA de valor, vertical e cirúrgico. O que NÃO faz (deixa
     explícito o que é adiado para blocos futuros). -->
<Descreva a entrega do bloco em 2-3 linhas. Diga o que fica de fora.>

## Contexto / fontes de verdade

<!-- O que LER antes de codar (ciclo de vida C2, passo 1). Cite arquivos, não memória. -->

- Ler antes: `agent-orchestration/docs/status-geral.md`, `agent-orchestration/controle/`,
  `agent-orchestration/codex/log-execucao.md`, `PROJECT_MEMORY.md`.
- Fontes de verdade aplicáveis (A1): <`RBAC_MATRIX.md` · `APPROVAL_LIMITS.md` ·
  `docs/03-atores-papeis.md` · `docs/04-regras-negocio.md` · `API_CONTRACTS.md` · `BUILD_ORDER.md`>.
- Protótipo/UX: <tela no `*.dc.html` (chave `screen`) + referência renderizada em
  `screen-refs/<web|mobile>/<arquivo>.png` (§11), quando existir>.
- Blocos relacionados / que este continua: <B-NNN, B-NNN>.

## Contratos / Endpoints  *(opcional — quando toca API/sync)*

<!-- Envelope { data }, versão do contrato datada (C6): nome@AAAA-MM-DD.bNNN. Tenant SEMPRE
     resolvido pelo ator autenticado; X-Tenant-Id só resolve org ativa em multi-org (§2.4). -->

- `<MÉTODO> /api/v1/<caminho>` — <descrição curta>.
- Envelope `{ data }`. **Versão do contrato:** `<nome_contrato>@<AAAA-MM-DD>.b<nnn>`.
- Idempotência (se sync mobile): tenant + usuário + `client_action_id` (§6).
- Tenant resolvido pelo **ator autenticado** (ignora `tenant_id` do cliente).

## Regras (negócio · permissão · segurança)

<!-- Regra de domínio + RBAC canônico (§2.6) + allowlist de segurança (§2.8). -->

- Permissão exigida (canônica, `RBAC_MATRIX.md`): `<recurso>:<ação>` — **validada no backend**
  (autoridade final; UI só molda/esconde).
- Regras de domínio: <ex.: reprovação exige motivo; segunda decisão → `already_decided`>.
- Segurança/allowlist: resposta e auditoria **nunca** expõem `token`, `path`, `bucket`,
  `storage key`, `base64`, binário nem `tenant_id` externo (§2.8).
- UI sem termo técnico (§3): usar "Organização", "perfil", "Operação de Campo"… (nunca
  `tenant`, `role`, `field_dispatcher`).

## Escopo PERMITIDO

<!-- Caminhos EXATOS que o bloco pode tocar. Inclua sempre agent-orchestration/** (registro) e,
     na política KPI-por-PR §C3/C4, os arquivos de KPI (ver seção "KPIs no próprio PR"). -->

- `<caminho/exato/**>`
- `<outro/caminho/arquivo.ts>`
- `agent-orchestration/**`  <!-- registro do bloco -->
- `Kpis/**` <!-- painel ÚNICO: a política dupla foi revogada em 2026-08-12 (§C3.2) -->

## Escopo PROIBIDO

<!-- Fora de autorização explícita, NÃO tocar (C4). KPI SAIU do proibido de feature
     (D-KPI-PER-PR): todo PR de código/teste/escopo ATUALIZA o KPI no próprio PR. -->

- `prisma/**` · `migrations/**` · `infra/**` · `.env` · lockfiles JS
  (`package-lock.json`/`pnpm-lock.yaml`) · `pubspec.yaml`/`pubspec.lock` · Figma.
- <módulos/telas fora do bloco: ex. `frontend/**`, `mobile/**`, outros `src/modules/**`>.

## Passos de implementação

<!-- Numerados, cirúrgicos, na ordem. Só dentro do escopo permitido (C2, passo 2). -->

1. <passo 1>
2. <passo 2>
3. <passo 3 — testes do bloco cobrindo regra + isolamento de tenant + allowlist de segurança>
4. <atualizar KPIs no próprio PR — ver seção abaixo>

## Bateria de validação

<!-- Reproduza a bateria EXATA da trilha (§9). MANTENHA só o bloco da sua trilha; para bloco
     full-stack, encadeie Flutter → Backend → Frontend. Formato executável (copiar-colar). -->

<!-- ▸ Trilha MOBILE (Flutter) — de mobile/flutter_app -->
```bash
cd mobile/flutter_app
flutter pub get
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test test/features/b<nnn>_<slug>_test.dart --reporter compact
# regressões dos blocos anteriores (liste os testes tocados):
flutter test test/features/b<nnn-1>_<slug>_test.dart --reporter compact
flutter test --reporter compact
cd ../..
```

<!-- ▸ Trilha BACKEND / raiz (Node + TS) -->
```bash
npm run check
npm run lint
npm test
npm run build
node --test --import tsx tests/<contrato>.test.ts
node --check Kpis/app.js
git diff --check
```

<!-- ▸ Trilha FRONTEND (React/Vite) -->
```bash
npm --prefix frontend run check
npm --prefix frontend run build
npm --prefix frontend run test:smoke   # quando existir
git diff --check
```

<!-- Limpeza pós-validação (C5): remover temporários/build artifacts sem apagar rastreados nem
     os untracked permitidos (3 PNGs de marca, .env, .claude/skills/*). -->

## Estados obrigatórios (§7)

<!-- Marque os que a(s) tela(s) do bloco deve(m) cobrir; recriados dos protótipos (§7/§11). -->

- [ ] loading/skeleton
- [ ] empty
- [ ] error
- [ ] **acesso não permitido** (permissão negada)
- [ ] offline/sync (mobile)
- [ ] dados desatualizados
- Fidelidade visual à referência em `screen-refs/` quando existir (§11).

## KPIs no próprio PR (§C3)

<!-- Política KPI-POR-PR permanente (D-KPI-PER-PR): todo PR que altere código/teste/escopo
     ATUALIZA os KPIs NO MESMO PR, com contagem de EXECUÇÃO REAL (nunca copiada do bloco
     anterior). Toca mobile → a métrica flutter_tests vive no MESMO painel. -->

- Atualizar: `Kpis/kpis-latest.json` · `Kpis/kpis-history.*` (append) · `Kpis/index.html`.
- Se o PR toca Flutter/mobile: a métrica `flutter_tests` entra em `Kpis/*` — painel único (§C3.2).
- Contagens reais deste PR: backend `<n>` · smoke `<n>` · flutter `<n>` · blocks `<n>`.
- `mvp_demo`/`mvp_vendavel` só mudam se o PR **mover escopo** (+1 linha de justificativa no history).
- `status: "published_per_pr"`; `pr` preenchido após `gh pr create`;
  `merge_commit`/`approved_head` = **`null` na autoria** → backfill pós-merge (não bloqueia).

## Junta (§C7)

<!-- Verde da junta + CI verde habilitam o porteiro pré-merge; não autorizam sozinhos o merge. Composição por bloco, ≥3 agentes; registro
     obrigatório em agent-orchestration/omega/juntas/J-<n>-<tema>.md — junta sem registro = merge
     inválido. Dúvida → agente-pesquisador-web (≥3 fontes) + PD em docs/omega-pd.md ANTES de decidir. -->

- **Regra de maioria:** <maioria simples (bloco normal) | **unânime com 5 agentes** (decisão
  crítica: deploy de PRODUÇÃO · dependência nova · serviço externo tarifado/pago · config de
  serviço externo)>.
- **Composição (≥3):** <listar agentes>.
- **Obrigatórios por gatilho (com VETO):**
  - toca **auth/RBAC/rota/navegação/provisioning/nova tela** → `coordenador-de-acessos` +
    `inspetor-de-rotas`.
  - toca **invariante financeiro/dinheiro** → `critico-adversarial` (adversarial obrigatório).
  - toca **secret/env/CORS/TLS/pipeline/prod** → `agente-secops`.
  - toca **migration/backup** → `agente-dba-guardiao`.
  - toca **mapa/geo** → `avaliador-mapas`.
  - toca **tela** → `cognicao-visual` (veta tela morta) + `master-teste-telas-rotas`.
- **Registro da junta:** `agent-orchestration/omega/juntas/J-<n>-<tema>.md` (votos + justificativa).

## Porteiro pré-merge e fechamento pós-merge

- Depois de junta registrada + CI verde, criar **novo agente independente** em `gpt-5.6-sol` com raciocínio
  `ultra`; ele não pode ter sido achador, planejador, desenvolvedor, revisor ou votante desta entrega.
- Parecer amarrado ao PR/head: somente `LIBERADO: merge do PR #<n> no head <sha>` autoriza merge.
  `LIBERADO COM RESSALVA` e `BLOQUEADO` não autorizam; qualquer novo head expira o parecer.
- Após o merge, **outro agente distinto** executa somente backfill factual, reconciliação, limpeza e
  compactação aplicável. Sem esse fechamento, o próximo bloco não começa.
- Registrar nominalmente: origem `<agente>` · planejamento `<agente>` · desenvolvimento `<agente>` ·
  revisores/votantes `<agentes distintos>` · porteiro `<agente>` · executor pós-merge `<agente>`.

## Definition of Done (§10)

- [ ] Escopo respeitado (nada fora do permitido; nada do proibido tocado).
- [ ] Bateria de validação do comando **verde**.
- [ ] Estados obrigatórios presentes (§7); offline/sync onde couber.
- [ ] Permissão validada no **backend** conforme `RBAC_MATRIX.md`.
- [ ] Sem termo técnico na UI (§3); sem segredo/PII em payload/auditoria (§2.8).
- [ ] Artefatos temporários limpos (C5) **e, após o merge, limpeza pós-merge executada**
      (`bash scripts/post-merge-cleanup.sh`).
- [ ] PR aberto no GitHub; **KPIs atualizados no próprio PR** com contagens reais (C3).
- [ ] Junta registrada + CI verde + porteiro pré-merge independente autorizaram literalmente o PR/head exatos.
- [ ] Fechamento pós-merge factual concluído por outro agente (backfill, reconciliação, limpeza/compactação).
- [ ] A11y: alvo de toque ≥44px (mobile), foco visível, aria em ícones-ação.
- [ ] Fidelidade visual (§11): bate com a referência em `screen-refs/` (quando existir).

## Rastreabilidade (§C6)

<!-- Preencher progressivamente. merge_commit/approved_head só existem pós-merge (backfill). -->

- **ID:** B-NNN
- **PR #:** <preenchido após `gh pr create`>
- **Merge commit:** <`null` na autoria → backfill pós-merge>
- **Approved head:** <`null` na autoria → backfill pós-merge>
- **Gate:** <B-NNNG / n/a>
- **Junta:** `agent-orchestration/omega/juntas/J-<n>-<tema>.md`
- **Status:** `published_per_pr`
- **Contrato(s) versionado(s):** `<nome>@<AAAA-MM-DD>.b<nnn>`

---

## Exemplo mínimo preenchido (fictício)

> Ilustra o molde em uso — bloco backend curto. **Não é um bloco real.**

# B-201 — Backend: cancelar OS com motivo

- **Tipo:** feature
- **Fase:** Execution
- **Trilha:** backend/raiz
- **Data:** 2026-07-28
- **Branch:** `feat/work-orders-b201-cancel-reason`
- **Autor:** Claude Code (rodada Ω-EX)

## Objetivo

Permitir cancelar uma OS aberta registrando motivo obrigatório e evento de auditoria seguro.
Não altera o fluxo de conclusão nem toca no app Flutter (só backend + contrato).

## Contexto / fontes de verdade

- Ler antes: `status-geral.md`, `controle/`, `PROJECT_MEMORY.md`.
- Fontes: `RBAC_MATRIX.md` (permissão `work_orders:update`), `docs/04-regras-negocio.md` (RN-OS-cancel).
- Continua: B-109 (approval).

## Contratos / Endpoints

- `POST /api/v1/work-orders/:id/cancel` — cancela OS aberta.
- Envelope `{ data }`. **Versão do contrato:** `work_order_cancel@2026-07-28.b201`.
- Tenant resolvido pelo ator autenticado.

## Regras (negócio · permissão · segurança)

- Permissão: `work_orders:update` — validada no backend.
- Motivo (`reason`) obrigatório; OS não-aberta → `work_order_not_cancelable`.
- Auditoria `work_order.cancelled` sem token/path/base64/tenant externo.

## Escopo PERMITIDO

- `src/modules/work-orders/**` · `src/app.ts` · `tests/work-orders.test.ts`
- `agent-orchestration/**` · `Kpis/**`

## Escopo PROIBIDO

- `prisma/**` · `migrations/**` · `infra/**` · `.env` · lockfiles · `mobile/**` · `frontend/**`.

## Passos de implementação

1. Adicionar `cancelWorkOrder(reason)` no service com guarda de status + isolamento de tenant.
2. Rota `POST …/cancel` + evento de auditoria sanitizado.
3. Testes: sucesso · sem motivo → 400 · OS já concluída → erro · outro tenant → isolado · allowlist.
4. Atualizar `Kpis/kpis-latest.json` + `Kpis/kpis-history.*` + `Kpis/index.html` (contagem real).

## Bateria de validação

```bash
npm run check
npm run lint
npm test
npm run build
node --test --import tsx tests/work-orders.test.ts
node --check Kpis/app.js
git diff --check
```

## Estados obrigatórios (§7)

- [x] error · [x] acesso não permitido (backend 403)  <!-- bloco sem UI: só os aplicáveis -->

## KPIs no próprio PR (§C3)

- Atualizar `Kpis/kpis-latest.json` · `Kpis/kpis-history.*` · `Kpis/index.html`.
- Contagens reais: backend `<n+3>` · smoke `<inalterado, com nota>` · blocks `<n+1>`.
- `mvp_*` inalterado (não move escopo). `status: "published_per_pr"`.

## Junta (§C7)

- Regra: maioria simples. Composição: `planejador-mestre` · `saas-multi-tenant (isolamento)` ·
  `coordenador-de-acessos` (VETO, toca RBAC/rota) · `validador-mestre`.
- Registro: `agent-orchestration/omega/juntas/J-201-cancel-os.md`.

## Definition of Done (§10)

- [ ] Escopo respeitado · [ ] bateria verde · [ ] permissão no backend · [ ] sem PII em auditoria ·
      [ ] KPIs no PR · [ ] PR aberto · [ ] limpeza pós-merge.

## Rastreabilidade (§C6)

- **ID:** B-201 · **PR #:** <pós-create> · **Merge commit:** null → backfill ·
  **Approved head:** null → backfill · **Gate:** n/a · **Status:** `published_per_pr` ·
  **Contrato:** `work_order_cancel@2026-07-28.b201`.
