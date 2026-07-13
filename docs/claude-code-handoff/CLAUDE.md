# CLAUDE.md — Contrato de execução do Claude Code (ERP Techsolutions)

> Este arquivo é o **contrato de execução do Claude Code** neste repositório. Ele **substitui o
> papel que o `AGENTS.md` tinha para o Codex** e preserva **a mesma lógica de execução por
> blocos**. Onde este arquivo divergir do `AGENTS.md` ou das fontes de verdade, **valem o
> `AGENTS.md` e as fontes de verdade** — nunca a memória do agente.
>
> Leia o arquivo **inteiro** antes de qualquer coisa. Companheiros neste pacote:
> `EXECUTION_MODEL.md` (modelo de blocos — detalhado), `comando-template.md` (molde de comando),
> `API_CONTRACTS.md` (contratos REST), `BUILD_ORDER.md` (mapa de fases/PRs).
>
> **Antes de qualquer bloco, leia `PROJECT_MEMORY.md`** — estado real do repositório (blocos
> B-076→B-109, stack confirmada, contratos já conectados, invariantes, KPIs). Ele resume a
> trilha viva de `agent-orchestration/`; onde divergir, vale a trilha no repo.

---

# PARTE A — Governança (espelha AGENTS.md)

## A1. Fontes de verdade (ordem de prioridade)

1. decisões aprovadas **explicitamente** pelo usuário
2. arquivos-base na raiz: `PRODUCT_CONTEXT.md`, `RBAC_MATRIX.md`, `APPROVAL_LIMITS.md`,
   `DESIGN_SYSTEM.md`, `COMPONENT_LIBRARY.md`, `AGENTS.md`, este `CLAUDE.md`
3. documentação em `docs/`
4. estrutura operacional em `agent-orchestration/`
5. implementação em `src/` (+ `frontend/` e o app Flutter em `mobile/flutter_app/`)

Os protótipos `*.dc.html` deste pacote são **fonte de verdade de UX/visual e de lógica de
interação** (steppers, validações, fluxos, estados), **subordinados** às fontes 1–2 para
**domínio, permissão e regra de negócio**. Divergência de **regra** (não de pixel) → vale o
arquivo-base.

## A2. Regra de conflito (sem consolidação silenciosa)

Conflito entre a base histórica do agente e o repositório atual — ou entre protótipo e
arquivo-base — deve ser **registrado explicitamente antes de qualquer consolidação**, em
`agent-orchestration/controle/`. Não escolha um lado em silêncio. Se bloquear, **pare e peça
validação**. Conflitos já resolvidos (não reabrir):

- **Backend C (memória antiga) × Node.js + TypeScript (repo):** vale **Node.js + TypeScript**.
- **Rótulo de UI × nome técnico:** são **camadas**, não conflito (Parte B §3).

## A3. Estrutura obrigatória (não remover, não esconder)

Preserve na raiz: os cinco arquivos-base, `AGENTS.md`, `docs/`, `agent-orchestration/`, `Kpis/`.
Este pacote de handoff **não substitui** nenhum deles e deve viver **fora de `src/`**.

## A4. Codex → Claude Code (paridade de orquestração)

O Codex operava a partir de `AGENTS.md` + `agent-orchestration/codex/`. O Claude Code opera a
partir **deste** `CLAUDE.md` + a **mesma** estrutura de orquestração e **o mesmo modelo de
blocos** (Parte C):

1. **Antes de cada bloco**, leia `agent-orchestration/docs/status-geral.md` e
   `agent-orchestration/controle/` (estado, decisões, pendências) e o log em
   `agent-orchestration/codex/log-execucao.md`.
2. Continue os comandos em `agent-orchestration/codex/comandos/` **no mesmo formato**
   (`comando-template.md`). Se preferir isolar o histórico por agente, crie
   `agent-orchestration/claude/` espelhando a convenção — **nunca apague** o que o Codex deixou;
   rastreabilidade **entre agentes** é regra.
3. **Valide bloco a bloco** e **só avance após aprovação**, exatamente como o Codex fazia.

## A5. Fases e persistência

Fases: **Discovery → Definition → Architecture → Execution → Validation → Persistence.** Este
handoff entra em **Execution/Validation**. Tudo materialmente relevante (produto, arquitetura,
permissão, alçada, UX, execução, rastreabilidade) vai para **arquivo/estrutura operacional** —
não fica só no chat nem só no corpo do PR.

## A6. Regra de trabalho

Manter rastreabilidade · preservar organização por **módulos e domínios** · registrar decisões
e pendências em `controle/` · **não esconder conflitos** · separar **fato de hipótese** ·
escalar para documentação/skill especializada em vez de improvisar.

---

# PARTE B — Guia de implementação do MVP

## 1. O que são os arquivos deste pacote

Os `*.dc.html` são **protótipos de design em HTML** — fonte da verdade de layout, hierarquia,
estados, cópia e **lógica de interação**. **Não são código de produção para copiar.** Recrie
essas telas no ambiente já existente:

- **Portal web** → **React** (`frontend/`)
- **App de campo** → **Flutter** (`mobile/flutter_app/`)
- **Backend** → **Node.js + TypeScript**, REST `/api/v1`, Prisma + PostgreSQL, Redis, monólito
  modular multi-tenant (Outbox para eventos)

Fidelidade **alta**: use os componentes do repo (`DESIGN_SYSTEM.md`, `COMPONENT_LIBRARY.md`);
onde houver equivalente, **use o do repo**.

| Arquivo | Conteúdo |
|---|---|
| `ERP Mobile.dc.html` | App de campo (Flutter) — 37 telas, guincho + prestador |
| `ERP Web.dc.html` | Console ERP (React) — 37 telas, 5 papéis |
| `Login.dc.html` | Login standalone (web + seleção de organização) |
| `Handoff MVP Mobile.dc.html` | Doc: 11 telas MVP mobile, reconciliação spec × protótipo |
| `Catálogo de Telas e Endpoints.dc.html` | Doc: inventário (74 telas) + endpoints |
| `support.js` | Runtime só para abrir os `.dc.html` (não portar) |

Para **ler a lógica**: abra o `.dc.html` como texto. Cada tela é um bloco
`<sc-if value="{{ sc_<screen> }}">…</sc-if>`; estado e handlers estão na `class Component`
(`renderVals()`, `setState`, métodos de ação).

## 2. Regras de ouro (não violar)

1. **Siga a arquitetura existente do repo.** Não reestruture pastas, não troque libs, não
   introduza novo state manager sem aprovação.
2. **Trabalho em blocos pequenos e verticais** (Parte C) → **1 bloco = 1 branch = 1 PR no
   GitHub**.
3. **Nada de segredos versionados.** `.env` real nunca entra no git.
4. **API `/api/v1`.** Auth: **Cognito** em prod, **local contract-compatible** em dev. Contexto
   vem dos **claims do JWT** — `sub · tenant_id · tenant_role · tenant_roles · permissions ·
   email · scope`; `tenant_id`+`tenant_role` obrigatórios. **Backend é a autoridade final** de
   autorização; a UI só molda/esconde. `X-Tenant-Id` só resolve a organização ativa em
   multi-org.
5. **Backend é Node.js + TypeScript** (registro histórico em C não vale — A2).
6. **Reconcilie papéis/permissões/alçadas** com `RBAC_MATRIX.md`, `APPROVAL_LIMITS.md`,
   `docs/03-atores-papeis.md`, `docs/04-regras-negocio.md` **antes** de codar permissão.
7. **Offline-first no mobile:** escrita vai para fila local e sincroniza depois (§6).
8. **Segurança de payload/auditoria (allowlist):** nunca exponha `token`, `path`, `bucket`,
   `storage key`, `base64`, conteúdo binário nem `tenant_id` externo em resposta pública ou em
   metadados de auditoria. Tenant sempre resolvido pelo **ator autenticado**.

## 3. Modelo de papéis (linguagem)

Frontend **nunca** exibe termo técnico — camada técnica só no código/claims:

| Interno (código/claims) | Rótulo na UI |
|---|---|
| `platform_admin` | Admin Plataforma |
| `tenant`/`org` | organização |
| `field_dispatcher` | Operação de Campo |
| `field_technician` | Técnico de Campo |
| `role` | perfil · `scope` → contexto · `rbac`/`permission` → permissões |

Papéis canônicos (`RBAC_MATRIX.md`): `platform_admin · tenant_admin · manager · operator ·
finance · inventory · field_technician · auditor · support`. O papel decide navegação, tela
inicial e blocos exclusivos, e vem da **sessão/claims** — nunca de seletor de UI.

## 4. Web (React em `frontend/`)

Siga o roteamento, a camada de dados e o design system atuais do `frontend/`. Shell: sidebar
236px (navy) + topbar 60px; colapsa para 74px (labels somem, ícones centralizados, badges
permanecem). Ícones: **lucide-react**. **37 telas web** em 5 papéis — índice completo em
`Catálogo de Telas e Endpoints.dc.html` (Parte 1); ordem em `BUILD_ORDER.md`.

**Telas bespoke (referência de qualidade):** Cloud Billing · Visão Geral da Plataforma ·
Dashboard Operacional · OS Lista · OS Detalhe · Despachos · Estoque · Organizações · Detalhe da
Organização · Console Dispatcher · Cobranças.

## 5. Mobile (Flutter em `mobile/flutter_app/`)

Siga a estrutura do app existente (test/features já usa a convenção `bNNN_<slug>_test.dart`).
Persistência local para fila de sync/flags offline. **11 telas do MVP** detalhadas em
`Handoff MVP Mobile.dc.html`; catálogo completo (37) no catálogo geral.

## 6. Offline / sync (mobile)

Escrita local → fila → replay em `POST /api/v1/mobile/sync/*`. **Idempotência = tenant +
usuário + `client_action_id`.** Conflitos com resolução manual inicial (ver B-107). Evidências:
multipart, blob local opaco apagado só em `status=stored`; `rejected/scan_failed/pending_review`
/erro/timeout **preservam** o blob (ver B-108).

## 7. Estados obrigatórios por tela

loading/skeleton · empty · error · **acesso não permitido** · offline/sync (mobile) ·
dados desatualizados. Já desenhados nos protótipos — recriar.

---

# PARTE C — Modelo de execução por blocos (a "lógica" a preservar)

> Resumo operacional. Detalhe completo, com exemplos, em `EXECUTION_MODEL.md`; molde em
> `comando-template.md`. **Este é o mesmo modelo que o Codex seguia — mantê-lo é obrigatório.**

## C1. O que é um bloco

Unidade de trabalho pequena e vertical, com **ID**, **comando** em
`agent-orchestration/codex/comandos/B-NNN-<slug>.md`, **escopo cirúrgico**, **bateria de
validação** e **rastreabilidade**. Tipos:

| Sufixo | Tipo | Papel |
|---|---|---|
| `B-NNN` | **Feature** | implementa código funcional (não toca KPI) |
| `B-NNNK` | **KPI pós-avaliação** | publica KPIs após merge+gate aprovados |
| `B-NNNF` | **Correção de KPI** | conserta/limpa KPIs e documentação |
| `B-NNNG` | **Gate** | avaliação/aprovação de um bloco de feature |

## C2. Ciclo de vida (não pular etapas)

1. **Ler** status/controle/log e o comando do bloco.
2. **Implementar** só dentro do **escopo permitido**; respeitar o **escopo proibido**.
3. **Validar** com a **bateria exata** do comando (formato → analyze → testes do bloco →
   regressões dos blocos anteriores → suíte → `npm run check/lint/test/build` →
   contratos → `git diff --check`).
4. **Limpar artefatos** (política de limpeza pós-validação).
5. **Abrir PR no GitHub** (branch por bloco). **KPIs propostos vão só no relatório final** — não
   no diff.
6. **Avaliação humana + gate.** Só então um bloco `…K`/`…F` publica KPIs com **PR #, merge
   commit e approved head reais**.
7. **Registrar** decisão/estado em `agent-orchestration/`.

## C3. Política de KPI pós-avaliação humana (permanente)

> ⚠️ **REVOGADA em 2026-07-13 (D-KPI-PER-PR).** Política vigente = **KPI por PR** (atualiza no próprio PR, com
> contagem real; junta do PR valida). Fonte de verdade: `/CLAUDE.md` §C3. O texto abaixo é o snapshot original.

1. PR de **feature não altera** arquivos KPI.
2. Feature reporta **KPIs propostos apenas no relatório final**.
3. KPI só atualiza **após avaliação humana** aprovar.
4. KPI só publica **após merge e gate** confirmarem sucesso.
5. Publicação em **bloco separado** (`B-xxxK`/`B-xxxF`).
6. Mexeu em **Flutter/mobile** → atualizar `mobile/flutter_app/Kpis/*` **e** refletir em
   `Kpis/*`.
7. Mexeu **fora do mobile** → atualizar `Kpis/*`.
8. Mexeu nos **dois** → atualizar **ambos**.
9. Se existir `index.html` de KPI → atualizar o HTML também.
10. Bloco KPI preenche **PR, merge commit e approved head reais**. **Campo `null` bloqueia o
    próximo bloco.**

## C4. Disciplina de escopo (por bloco)

Todo comando declara **escopo permitido** e **escopo proibido** com caminhos exatos. Fora de
autorização explícita, **não** tocar: `prisma/**`, `migrations/**`, `infra/**`, `.env`,
lockfiles JS, `pubspec.yaml/lock`, Figma, e — em bloco de feature — **nenhum** arquivo KPI.

## C5. Limpeza pós-validação (permanente)

Todo bloco que rodar testes/builds/Flutter/Node/Android/iOS/artefatos **limpa os temporários ao
final**, sem apagar arquivos rastreados e preservando untracked explicitamente permitidos (ex.:
os 3 PNGs de marca).

## C6. Rastreabilidade

Todo bloco registra: **ID · PR # · merge commit · approved head · gate · status**
(`published_after_human_approval` quando aplicável). Contratos versionados por data/bloco (ex.:
`mobile_evidence_file_upload@2026-06-18.b108`).

---

## 8. GitHub Flow & governança de commits

O repositório oficial vive no **GitHub**. **GitHub Flow**, um **bloco por PR**:

1. **Remoto único = GitHub** (`origin`). Antes de abrir branch: `git pull --rebase origin main`.
   Não crie repositório paralelo; se o repo não estiver acessível, **pare e peça URL/acesso**.
2. **Branch por bloco** a partir da `main` — `feat/<area>-<bloco>` (ex.:
   `feat/mobile-b107-remote-create`), ou `fix/…`, `chore/…`.
3. **Conventional Commits** (`feat(...)`, `fix(...)`, `chore(...)`, `docs(...)`, `test(...)`).
4. **Abra PR no GitHub ao concluir o bloco** — nunca commit direto na `main`. Só quando a
   bateria de validação passar e a DoD (§10) estiver cumprida:
   `git push -u origin feat/<area>-<bloco>` → `gh pr create --base main --title
   "feat(mobile): criação remota de OS (B-107)" --body "…"`. No corpo: objetivo, telas, DoD,
   como testar, **KPIs propostos** (não publicados) e o ID do bloco.
5. **Merge só com CI verde** + revisão quando exigida. Prefira **squash merge** e **delete a
   branch**.
6. **Marco de fase → tag + GitHub Release** (`git tag -a mvp-mobile … && git push origin
   mvp-mobile`). Ex.: `mvp-mobile`, `mvp-web-gestor`.
7. **Rails:** nunca segredo no git (chaves de CI via **GitHub Secrets**); nunca
   `git push --force` na `main`; nunca merge com CI vermelho, DoD incompleta ou KPI publicado em
   PR de feature; respeite **proteção de branch**; não versione artefatos de processo em `src/`.

## 9. Bateria de validação (padrão dos comandos)

Reproduza a bateria **exata** de cada comando. Padrões observados:

**Flutter** — `cd mobile/flutter_app` → `flutter pub get` →
`dart format --output=none --set-exit-if-changed lib test` → `flutter analyze` →
`flutter test test/features/<bloco>_test.dart --reporter compact` → **regressões** dos blocos
anteriores → `flutter test --reporter compact` → `cd ../..`.

**Backend/raiz** — `npm run check` · `npm run lint` · `npm test` · `npm run build` ·
`node --test --import tsx tests/<contrato>.test.ts` · `node --check Kpis/app.js` ·
`node --check mobile/flutter_app/Kpis/app.js` · `git diff --check`.

**Frontend** — `npm --prefix frontend run check` · `npm --prefix frontend run build`
(+ `test:smoke` quando existir).

**KPI/documental** — `node --check` dos `app.js` de KPI · `rg` que **falha se houver campo
`null`** de PR/merge/approved head · `rg` confirmando marcadores do bloco · `git diff --check`.

## 10. Definition of Done (por bloco)

- [ ] Escopo respeitado (nada fora do permitido; nada do proibido tocado).
- [ ] Bateria de validação do comando **verde**.
- [ ] Estados obrigatórios presentes (§7); offline/sync onde couber.
- [ ] Permissão validada no **backend** conforme `RBAC_MATRIX.md`.
- [ ] Sem termo técnico na UI (§3); sem segredo/PII em payload/auditoria (§2.8).
- [ ] Artefatos temporários limpos (C5).
- [ ] PR aberto no GitHub; **KPIs só no relatório final** (C3).
- [ ] A11y: alvo de toque ≥44px (mobile), foco visível, aria em ícones-ação.
- [ ] **Fidelidade visual (§11):** a tela bate com a referência renderizada em `screen-refs/` (quando existir) — sem simplificar, sem inventar abas, sem andaime de dev na UI.

## 11. Fidelidade visual — referências renderizadas (`screen-refs/`)

A pasta **`screen-refs/`** contém telas do protótipo exportadas como **HTML estático, renderizado
e autocontido** (o protótipo `.dc.html` tem `{{ holes }}` + classe de lógica; a referência é o
**pixel/estrutura já resolvidos**). Quando existir uma referência para a tela do bloco, ela é o
**alvo exato**: abra no navegador e **reproduza fielmente** em React — mesma grade, mesmos tokens,
mesma densidade, mesma cópia. **Recriar, não reinterpretar.**

Regras de fidelidade (aprendidas de uma entrega que divergiu do modelo):

1. **Linguagem PT-BR de negócio, sempre** — "Organização/Organizações", **nunca** "Tenant/Tenants"
   (nem em coluna de tabela, chip, placeholder ou título). Ver §3.
2. **Nada de andaime de dev na UI** — sem badges tipo `PLANNED`/`TODO`/`WIP`, sem código de
   tela (`P04…`) visível, sem path de rota/endpoint como texto de subtítulo.
3. **Acentuação correta** — Visão, Órgão, Configurações, Auditoria, média… (jamais "Configuracoes",
   "Saude", "Operacoes").
4. **Page header = título + subtítulo + ações à direita** (seletores + botão primário). Nunca um
   único botão esticado ocupando a largura toda.
5. **KPIs com semântica** — reproduza **todos** os cards (valor + variação + selo de risco com a
   cor certa: azul plataforma · verde sucesso · âmbar atenção · vermelho crítico · roxo receita).
6. **Composição completa** — se a referência tem gráficos, painel "O que mudou?" (IA) e tabela de
   recursos, **todos** entram. Não reduza a tela a "KPIs + tabela".
7. **Sidebar** — grupos e ordem exatos (PRINCIPAL / PLATAFORMA…), item ativo azul sólido, ícone e
   texto brancos; colapso 236→74px preserva ícones e badges.

Referências disponíveis (índice completo em **`screen-refs/README.md`**):
- **`screen-refs/web/`** — **35 PNGs** (todas as telas do ERP Web, agrupadas por papel: Plataforma,
  Operação, Despacho, Administração, Financeiro). Alvo renderizado a 1440px, sem andaime de dev.
- **`screen-refs/mobile/`** — **39 PNGs** (todas as telas do ERP Mobile: sessão/nav, fluxo Guincho,
  fluxo Prestador, Despesas/RDV/Comissões). Aparelho 390×812 inteiro.
- **`screen-refs/Cloud Billing.reference.html`** — padrão-ouro em **HTML estático isolado**
  (use como exemplo do nível de fidelidade exigido nas demais).

**Fluxo de trabalho por tela:** abra o PNG (alvo visual) **+** leia o mesmo `screen` no
`.dc.html` (grade/tokens/cópia exatos). Onde divergirem: código vence para tokens/medidas,
PNG vence para layout/intenção. Cada PNG mapeia para uma chave `screen` — ver a tabela no
`screen-refs/README.md` (Web: estado `screen`+`role`; Mobile: `screen`+`serviceType`+`entregaMode`).
