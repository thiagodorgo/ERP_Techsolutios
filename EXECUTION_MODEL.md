# EXECUTION_MODEL.md — Modelo de execução por blocos (detalhado, com exemplos)

> **O que é este arquivo.** É o **detalhamento** da **PARTE C do `CLAUDE.md`** ("Modelo de
> execução por blocos"). O `CLAUDE.md` traz o **resumo operacional**; aqui está a **versão longa,
> com exemplos concretos** extraídos de comandos, juntas e KPIs **reais** do repositório.
>
> **Regra de precedência (não negociável):** em qualquer divergência entre este arquivo e o
> `CLAUDE.md` (ou as fontes de verdade da §A1), **vale o `CLAUDE.md`**. Este documento **não
> substitui** a Parte C — apenas a ilustra. Se algo aqui parecer contradizer o contrato, o
> contrato ganha e este arquivo deve ser corrigido, nunca o contrário.
>
> **Companheiros:** `CLAUDE.md` (contrato), `comando-template.md` (molde de comando),
> `API_CONTRACTS.md` (contratos REST), `BUILD_ORDER.md` (mapa de fases/PRs), `PROJECT_MEMORY.md`
> (estado real). Ata viva das juntas em `docs/juntas/` e `agent-orchestration/omega/juntas/`;
> reprovações em `agent-orchestration/omega/reprovacoes/`.
>
> **Este é o mesmo modelo que o Codex seguia.** Mantê-lo é obrigatório (Parte A4/A5 do `CLAUDE.md`).

---

## 1. O que é um bloco

Um **bloco** é a **unidade de trabalho** deste repositório: **pequena, vertical e rastreável**.
Pequena = cabe numa revisão; vertical = entrega uma fatia de valor de ponta a ponta (schema →
backend → contrato → UI → teste, quando aplicável), não uma camada solta. A regra de ouro é
**1 bloco = 1 branch = 1 PR no GitHub** (`CLAUDE.md` §B2.2 e §8).

Todo bloco tem **cinco elementos obrigatórios**:

| Elemento | O que é | Onde vive |
|---|---|---|
| **ID** | identificador único do bloco (ex.: `B-107`, `Ω4-3`, `Ω5P PR-17`) | prefixa branch, PR e commits |
| **Comando** | o "briefing" do bloco: objetivo, contratos, escopo permitido/proibido, bateria de validação, rastreabilidade | `agent-orchestration/codex/comandos/B-NNN-<slug>.md` (ou o equivalente da rodada) |
| **Escopo cirúrgico** | caminhos que **pode** tocar × caminhos **proibidos** | declarado no comando (§4) |
| **Bateria de validação** | a sequência **exata** de comandos que precisa passar | declarada no comando (§6/§9 do `CLAUDE.md`) |
| **Rastreabilidade** | ID · PR # · merge commit · approved head · gate · status | registrada em `agent-orchestration/` + no KPI (§8) |

### Tabela de tipos de bloco (C1)

| Sufixo | Tipo | Quando usar | Toca código? | Atualiza KPI? |
|---|---|---|---|---|
| `B-NNN` | **Feature** | implementar uma fatia funcional (o caso comum) | **sim** | **sim, no próprio PR** (D-KPI-PER-PR, §3) |
| `B-NNNK` | **Resumo de marco** (opcional) | consolidar KPIs de um marco fechado; **deixou de ser etapa obrigatória** | não (documental) | consolida/reconcilia |
| `B-NNNF` | **Correção de KPI** | consertar/limpar KPIs e documentação que ficaram divergentes | não (documental) | conserta |
| `B-NNNG` | **Gate** | avaliação/aprovação formal de um bloco de feature (junta registrada) | não | não |

> **Nota histórica importante.** Nos comandos antigos (ex.: `B-107`, `B-109`) você verá "KPI só no
> bloco documental `…K`, status `published_after_human_approval`". Essa política está **REVOGADA**
> pela **D-KPI-PER-PR (2026-07-13)**: hoje **todo PR de feature atualiza o KPI no próprio PR**
> (§3). Os blocos `…K`/`…F` viraram **opcionais** (resumo de marco / correção). Não replique o
> texto antigo de "não atualizar KPIs nesta PR" — ele reflete a era pré-Ω-GOV.

**Nomenclatura de ID por época.** O repositório evoluiu de IDs `B-NNN` (era Codex/Flutter) para
IDs de rodada `Ω<n>-<slice>` e `Ω<n>P PR-<xx>` (rodadas Omega). São **o mesmo modelo de bloco** —
muda só o esquema de numeração. Use o esquema da rodada corrente (ver `PROJECT_MEMORY.md` e o
`J-<rodada>.md` da rodada ativa).

---

## 2. Ciclo de vida de um bloco (as 10 etapas do C2)

Não pule etapas. Cada uma abaixo vem com um exemplo real/ilustrativo.

### Etapa 1 — Ler (status, controle, log e o comando do bloco)

Antes de tocar em qualquer coisa: leia `agent-orchestration/docs/status-geral.md`,
`agent-orchestration/controle/` (decisões e pendências), o log em
`agent-orchestration/codex/log-execucao.md` e o **comando do bloco**. Em rodada Omega, leia também
a ata da rodada (`docs/juntas/J-<rodada>.md`) e o `PROJECT_MEMORY.md`.

> **Exemplo.** Antes do `Ω5P PR-17`, o agente lê `docs/juntas/J-OMEGA5P.md` §7 (plano do PR-16
> aprovado, sessão JWE emitida), confirma que "a sessão é a autorização" e que fotos foram cortadas
> para PR-17b — e só então começa. Ler primeiro evitou reabrir o vetor que o `coordenador-de-acessos`
> já tinha previsto.

### Etapa 2 — Implementar **só dentro do escopo permitido**

Toque apenas os caminhos autorizados; respeite o **escopo proibido** (§4). Reconcilie
papéis/permissões/alçadas com `RBAC_MATRIX.md`, `APPROVAL_LIMITS.md`, `docs/03-atores-papeis.md` e
`docs/04-regras-negocio.md` **antes** de codar permissão. Backend é a autoridade final de
autorização; a UI só molda/esconde.

> **Exemplo.** No `B-109` (aprovação operacional real) o comando autoriza os endpoints
> `GET/POST /api/v1/approvals/*`, a UI no detalhe de Work Order e o repositório **em memória** —
> mas **veda Prisma/migrations** ("Prisma/migrations ficam fora do B-109"). O agente entrega a
> feature com repositório em memória de interface substituível, sem tocar `prisma/**`.

### Etapa 3 — Validar com a **bateria exata** do comando

Rode a **sequência literal** do comando (não "uma equivalente"). A ordem canônica é:
formato → analyze/lint → **teste do bloco** → **regressões dos blocos anteriores** → **suíte
inteira** → `check/lint/test/build` → **contratos** → `git diff --check`. Detalhes por trilha na §6.

> **Exemplo (do `B-107`).** A bateria roda, na ordem: `dart format --set-exit-if-changed` →
> `flutter analyze` → o teste do bloco (`b107_..._test.dart`) → **as regressões** dos blocos
> anteriores (`b106`, `b105`, `b103`) → `flutter test` (suíte) → `npm run check/lint/test/build` →
> os contratos mobile (`mobile-backend-contracts`, `core-saas-contract`). Rodar as regressões dos
> blocos anteriores é o que impede que a fatia nova quebre a anterior em silêncio.

### Etapa 4 — Limpar artefatos (pós-validação)

Remova temporários de teste/build **sem apagar rastreados** nem os untracked permitidos (§7).
Muitos comandos trazem a linha explícita "Limpar artefatos Flutter/Node após as validações".

> **Exemplo (do `B-107`, seção "Limites").** "Limpar artefatos Flutter/Node após as validações."
> Na prática: apagar `frontend/dist/`, `coverage/`, `*.tsbuildinfo`, saídas de `flutter build` —
> nunca `node_modules` nem `.env`.

### Etapa 5 — Atualizar os KPIs **no próprio PR** e abrir o PR

Atualize `Kpis/kpis-latest.json`, `Kpis/kpis-history.*` (append) e `Kpis/index.html` **com
contagem de execução real** deste PR (§3). Se o PR tocar mobile/Flutter, atualize **também**
`Kpis/*` (painel ÚNICO — D-KPI-DUPLA-REVOGADA). Depois: `git push -u origin feat/<area>-<bloco>` → `gh pr create`.

> **Exemplo (do `Ω5P PR-17`, `kpis-latest.json`).** `backend_tests` foi de **1862 → 1871** (+9,
> execução real dos 8+1 testes do owner-portal), `frontend_smoke` **937 inalterado** (com nota
> explicando: "o owner-PWA é app separado com job CI próprio; não entra no smoke do frontend do
> ERP"), `blocks_completed` **109 → 110**. Os campos `pr`/`merge_commit`/`approved_head` ficaram
> **`null` na autoria** (só existem pós-merge).

### Etapa 6 — A **junta** valida e o CI fixa o head candidato

A decisão que antes era humana passa por **junta de agentes** (§5). A junta valida inclusive os
números de KPI. **Verde da junta + CI verde = candidatura ao porteiro pré-merge**, não autorização de merge.
O humano é **informado**, não consultado por PR. **Junta sem registro = merge inválido.**

> **Exemplo (do `Ω4-3`, `J-OMEGA4-3-invoicing.md`).** Junta de 3 com poder de veto
> (`validador-mestre` + `agente-dba-guardiao` + `coordenador-de-acessos`). Resultado: **APROVADO por
> unanimidade (3/3)** com uma condição MÉDIA (registrar a rota no `RBAC_MATRIX.md`) que foi
> **cumprida** antes do merge. Votos + justificativa ficaram na ata.

### Etapa 7 — Registrar (decisão/estado) antes do gate final

Grave o resultado em `agent-orchestration/` (ata da junta, decisão, pendências) e no KPI. Isso é o
que torna o bloco **auditável a posteriori** pelo dono, sem depender do chat nem do corpo do PR
(Parte A5 — persistência).

> **Exemplo.** O `Ω4-3` registrou, além da ata, três pendências para blocos futuros
> (`P-Ω4-3-TEST-HERMETIC`, `P-Ω4-3-INVOICE-ATOMIC`, `P-Ω4-3-REFATURAR-DELTA`) e o lembrete
> "resolver `P-Ω4-COMPETENCIA-TZ` antes do Ω4-6" — rastreabilidade entre blocos.

### Etapa 8 — Porteiro **pré-merge** no head exato

Depois de junta registrada e CI verde, nasce um agente independente que não participou de origem,
planejamento, desenvolvimento, análise ou voto. Ele reexecuta promessa × diff × bateria × KPI × ata ×
pendências no `headRefOid` candidato. O identificador técnico legado `porteiro-pos-merge` permanece apenas
para não quebrar referências.

<!-- interop:modelo:v1 -->
**Staffing e modelo (mecanismo por ferramenta).** O papel é **staffado no Codex**: a invocação passa
explicitamente `model: gpt-5.6-sol` e `reasoning_effort: ultra`. No **Claude Code** o mesmo papel existe em
`.claude/agents/porteiro-pos-merge.md` com `model: fable` **apenas como origem do espelho** `.agents/agents/`
— o Claude Code não emite atestado válido para este papel, por desenho. **Sem exceção de indisponibilidade:**
sem Codex/Sol o fluxo bloqueia (a exceção "vira nota na ata" pertence só ao `planejador-mestre`).
Os campos `runtime`/`model`/`reasoningEffort` do atestado são **declaração de invocação, não recibo nem
prova** — auto-escritos, obrigatórios por decisão do dono, detectáveis só a posteriori se falseados. O que o
gate confere é `commands` (`{cmd, exitCode}`) e `evidence.kpiLatestBlobSha` contra o blob do head.
<!-- /interop:modelo:v1 -->

A única autorização válida é `LIBERADO: merge do PR #<n> no head <sha>`. `LIBERADO COM RESSALVA` e
`BLOQUEADO` não autorizam merge. Qualquer commit/push altera o head, expira o parecer e exige novo porteiro.

O gate é técnico: snapshot `erp-porteiro-snapshot:v1`, comentário externo
`erp-porteiro-attestation:v1`, check requerido `erp/porteiro-pre-merge`, ruleset ativo/strict sem bypass e
merge CAS por `scripts/merge-authorized-pr.mjs`. O workflow de invalidação jamais executa código do head sob
`pull_request_target`.

<!-- gov:appid:v1 -->
**O que a identidade do check prova — e o que não prova.** O `erp/porteiro-pre-merge` só vale quando (1)
criado pelo app **GitHub Actions**, identidade conferida contra o registro global (`id 15368`, `slug
github-actions`, `owner 9919` — `PD-GOV-PORTEIRO-APPID`) e fixada no ruleset de `main` via `integration_id`,
de modo que o próprio GitHub recuse fonte diversa; e (2) apontando ao permalink do atestado, cujo conteúdo
amarra snapshot e evidência de reexecução. **Resíduo aberto, declarado:** o app id **não distingue workflows
do próprio repositório** — qualquer workflow deste repo com `checks: write` carrega a mesma identidade, e a
vinculação ao workflow do porteiro **não é provada mecanicamente** (a cadeia por check-suite devolve dado
falso e está **VETADA** — `PD-GOV-PORTEIRO-PROVENIENCIA`). Mitigam o resíduo a escalada crítica por
superfície de governança e a reexecução do porteiro sobre o diff. Identidade de app invisível ou divergente
do pin = **VETO antes do bootstrap**, nunca degradação para status forjável.
<!-- /gov:appid:v1 -->

### Etapa 9 — Merge do head autorizado

Faça squash merge + delete branch somente se PR, SHA, junta, CI e parecer forem os mesmos registrados pelo
porteiro. Um verde genérico ou um parecer sobre SHA anterior não serve.

### Etapa 10 — Fechamento pós-merge factual por outro agente

Outro agente, distinto também do porteiro, executa apenas o fechamento verificável: backfill de
`pr`/`merge_commit`/`approved_head`, reconciliação factual, limpeza e compactação conforme §7. Ele não reabre
mérito nem autoriza o merge já ocorrido. Sem esse fechamento, o próximo bloco não começa.

---

## 3. Política de KPI-por-PR (D-KPI-PER-PR, 2026-07-13)

> **Revoga** a política antiga ("KPI só após avaliação humana em bloco `…K`",
> `published_after_human_approval`). Decisão do dono (Thiago), rodada Ω-GOV. **A junta do PR valida
> os números; o humano audita a posteriori pelo history.**

### As regras (C3)

1. **Todo PR** que altere **código, teste ou escopo** atualiza, **no mesmo PR**:
   `Kpis/kpis-latest.json` + `Kpis/kpis-history.*` (append) + `Kpis/index.html`.
2. **Política dupla REVOGADA** (2026-08-12, `D-KPI-DUPLA-REVOGADA`): o painel do Flutter foi apagado. PR que toque mobile atualiza `Kpis/*` como qualquer outro, com `flutter_tests` de execução real.
3. Contagens de teste **do que o PR exerceu** vêm de **execução real no PR** — nunca copiadas do
   bloco anterior. Métricas de trilhas que o PR **não tocou** carregam o último valor oficial **com
   nota explícita** no history.
4. `mvp_demo`/`mvp_vendavel` só mudam quando o PR **mover escopo**, com 1 linha de justificativa.
5. `pr`, `merge_commit`, `approved_head` referem-se ao **PR corrente**; `status: "published_per_pr"`.
   **`merge_commit` e `approved_head` nascem `null` na autoria**. O parecer externo congela o head sem
   circularidade; só o executor pós-merge distinto projeta os dois campos factuais.
6. A **validação dos números é da junta do PR**.

### Como os três arquivos mudam num PR (exemplo real: `Ω5P PR-17`)

**(a) `Kpis/kpis-latest.json`** — a métrica exercida sobe com nota de execução real; a não-tocada
carrega valor oficial com nota; os campos de merge ficam `null`:

```jsonc
{
  "version": "OMEGA5P-PR-17",
  "release": {
    "pr": null,              // preenchido após `gh pr create`
    "merge_commit": null,    // null na autoria → backfill pós-merge
    "approved_head": null,   // null na autoria → backfill pós-merge
    "status": "published_per_pr"
  },
  "metrics": {
    "backend_tests":       { "value": 1871, "total": 1877, "note": "+9 (owner-PWA dossie)... Sobre 1862." },
    "frontend_smoke_tests":{ "value": 937,  "note": "937 inalterado: owner-PWA e app separado com job CI proprio." },
    "blocks_completed":    { "value": 110,  "note": "PR-17 -> +1 sobre 109." },
    "flutter_tests":       { "value": 807,  "note": "inalterado (PR web/backend-only)." }
  }
}
```

**(b) `Kpis/kpis-history.md`** — **append** de uma seção datada com Resultado + KPIs (antes→depois)
e a nota de backfill. Formato observado no repo:

```markdown
## 2026-07-21 - ONDA 1: Ligar Aprovacoes a dados reais
### KPIs
- `frontend_smoke_tests` **660 -> 673** (+13: approvals.smoke). `blocks_completed` **70 -> 71**.
- `backend_tests` 1296/1302, `flutter_tests` 764 — **INALTERADOS**. Backfill #259: pr/merge_commit/approved_head = ad4a9b5.
```

**(c) `Kpis/index.html`** — o painel **hidrata em runtime** de `kpis-latest.json`/`kpis-history.json`
(fonte de verdade por PR), então não defasa; o valor hardcoded no `app.js` é só **fallback
`file://`**. Ainda assim, `node --check Kpis/app.js` faz parte da bateria (§6). Se o PR tocar
mobile, o trio é o mesmo — o painel é um só.

### Backfill pós-merge de `merge_commit` / `approved_head`

Na **autoria** esses campos são `null` (o merge ainda não existe) — e isso **não bloqueia** (o
rail antigo de bloqueio por `null` foi revogado). Depois do merge, o **executor pós-merge distinto** faz o
**backfill**: preenche `pr` (número real), `merge_commit` e `approved_head`, junto da reconciliação de
PR#/hash, antes de liberar o próximo bloco.

> **Exemplo.** O `kpis-latest.json` do `Ω5P PR-17` traz, no fim do `summary`: "Inclui backfill do
> PR-16 (#301 cb3db08)" — ou seja, o PR-17 preencheu os campos de merge que o PR-16 deixara `null`.

---

## 4. Disciplina de escopo (C4)

Todo comando declara **escopo permitido** e **escopo proibido** com **caminhos exatos**. Fora de
autorização explícita, **não** tocar: `prisma/**`, `migrations/**`, `infra/**`, `.env`, lockfiles
JS, `pubspec.yaml`/`pubspec.lock`, Figma.

> **Exceção permanente (D-KPI-PER-PR):** KPIs **deixaram de ser escopo proibido** de feature. Todo
> PR que altere código/teste/escopo **DEVE** atualizar `Kpis/*` (painel único; a política dupla foi revogada — antes se pedia também o painel mobile, se
> tocar mobile) **no próprio PR** (§3).

### Exemplo de bloco com escopo declarado (`B-107`)

**Permitido (implícito no comando):** o app Flutter e o handler de sync
(`POST /api/v1/mobile/sync/work-order-actions`, tipos `work_order.create` e
`work_order.status_change`), com idempotência `tenant + usuario + client_action_id`.

**Proibido (seção "Limites" do comando, literal):**

- "Sem approval real ou `evidence_attach` no replay de OS."
- "Sem **Prisma, migrations, frontend web, infra, Figma** ou alteração de **lockfiles**."
- "Limpar artefatos Flutter/Node após as validações."

Outro recorte típico é o `Ω5P` (`J-OMEGA5P.md` §5): **Proibido** — "refactor oportunista fora dos
pontos de integração; alteração destrutiva em models/endpoints existentes; secrets/.env/infra/CI;
contratar serviço externo (PSP/SNE/OCR/leilão) **sem junta-de-5**; reusar sessão/auth do ERP no
portal; **`git add .`** (stage por caminho); push/PR **antes da aprovação registrada da junta**;
push na main; merge sem checks verdes; **exclusão física de dados de processo (I9)**."

> **Por que o escopo é cirúrgico.** Uma migração destrutiva ou um `git add .` que arrasta um `.env`
> são **paradas irredutíveis** (§5). O escopo estreito é a primeira barreira contra elas.

---

## 5. Autonomia por juntas (D-SAN-AUTONOMIA, §C7)

Norma **permanente**. Substitui, onde aplicável, a aprovação humana por PR pela aprovação de uma
**junta de agentes**.

### Composição da junta e gate posterior

- **Mínimo 3 agentes** por bloco (composição escolhida pelo risco do bloco).
- **Maioria simples** nos blocos normais.
- **Unânime, com 5 agentes**, nas **decisões críticas**: **deploy de PRODUÇÃO**; **dependência
  nova**; **contratação/config de serviço externo**; **chamada a serviço externo tarifado/pago**.
- Votos + justificativa em `agent-orchestration/omega/juntas/J-<n>-<tema>.md` (ou `docs/juntas/`).
  **Junta sem registro = merge inválido.** Verde da junta não elimina o porteiro pré-merge.
- Depois da junta + CI verde, um agente novo e independente (staffing/modelo na Etapa 8) revalida o head
  exato. Somente a linha literal `LIBERADO: merge do PR #<n> no head <sha>` permite merge; novo head expira
  o parecer.
- **Decisão crítica também por superfície:** diff que toque `.github/workflows/**`, `.github/rulesets/**`,
  `.gitattributes`, os scripts do gate/sync, os testes de governança, `CLAUDE.md`/`AGENTS.md` ou
  `.claude/agents/**`/`.agents/agents/**` exige `junta.critical === true` — ou seja, **5 votantes distintos
  e unânimes**, verificado pelo snapshot.
- Planejador, desenvolvedor, cada revisor/votante, porteiro e executor pós-merge são agentes/pessoas distintos.
- Revisores **por risco**: `agente-secops` obrigatório em PR que toque secret/env/CORS/TLS/pipeline
  ou **superfície pública**; `agente-dba-guardiao` em todo PR com **migração**;
  `coordenador-de-acessos` em PR de **RBAC/navegação**. Mapa/geo → **Junta de Mapas**.

### A regra da dúvida

Qualquer dúvida → `agente-pesquisador-web` (**≥3 fontes**) → registro **PD** em `docs/omega-pd.md`
**antes** da decisão. **Dúvida sem pesquisa = veto.** Decisão crítica sempre exige PD.

### Protocolo de reprovação por ciclos (§C7.4) — **criar agentes antes de parar**

Reprovação/bloqueio técnico **não gera parada direta**. Registre cada ciclo em
`agent-orchestration/omega/reprovacoes/R-<entrega>-<ciclo>.md` e siga:

| Ciclo | Ação |
|---|---|
| **1–2** | a `agente-fabrica` **CRIA 1–2 especialistas sob medida** para o problema (entram na junta seguinte e votam) |
| **3** | o `critico-adversarial` **reabre a premissa** desde o objetivo + pesquisa **≥5 fontes** (teto 6 agentes) |
| **4–5** | **junta ampliada replaneja** a fatia |
| **após 5 falho** | **parada + dossiê ao humano** |

**Paradas imediatas irredutíveis** (não passam por ciclo): **migration destrutiva**; **exposição de
segredo**; **ação irreversível em produção sem junta unânime prévia**.

### Exemplo de junta **APROVANDO** (`J-OMEGA4-3-invoicing.md`)

Junta de 3 com veto: `validador-mestre` + `agente-dba-guardiao` + `coordenador-de-acessos`.

```
| Agente                        | Veredito                                                            |
|-------------------------------|---------------------------------------------------------------------|
| validador-mestre (veto)       | APROVADO — 10 invariantes de DINHEIRO verificadas (anti-refaturamento
|                               | estrutural: o service sequer recebe resolver de tarifa)             |
| agente-dba-guardiao (veto)    | APROVADO — drill das 3 migrations + 8 testes DO-block sob PG16;
|                               | DOWN limpo, reversibilidade comprovada                              |
| coordenador-de-acessos (veto) | APROVADO_CONDICIONADO — invoice gated por `financial_titles:create`;
|                               | Cond. MÉDIA (registrar a rota no RBAC_MATRIX) → CUMPRIDA            |
```

**Resultado histórico: APROVADO por unanimidade (3/3)**, condição cumprida antes do merge, pendências
registradas. Na regra atual, verde da junta + CI verde → porteiro pré-merge; só o `LIBERADO` literal permite merge.

### Exemplo de **REPROVAÇÃO com ciclo** (`R-omega4c-pr06-ciclo1.md`)

PR Ω4C PR-06 (manutenção). Junta: `omega4c-avaliador` (veto) + `agente-dba-guardiao` +
`coordenador-de-acessos`.

- **dba-guardião → APROVADO** (migração provada up/down/re-up; FK composta RESTRICT).
- **avaliador → REPROVADO (BLOQUEIA)** e **coordenador-de-acessos → REPROVADO (BLOQUEIA + ALTA)** —
  **mesma causa raiz, confirmada por dois independentemente**: **escalada de privilégio**. O efeito
  de domínio `emitNextDueNotification` repassava `visibility=public` direto ao motor de notificação
  (chamada service→service que **não** checa permissão), permitindo a um portador de
  `maintenance_orders:create` **sem** `notifications:create` disparar um broadcast tenant-wide que a
  rota gated negaria (403).
- **Ação do ciclo 1** (correção pequena e bem-especificada — **não exigiu especialista**, §C7.4): o
  efeito de domínio passa a **FIXAR `visibility='private'`** (o lembrete de próxima manutenção é
  intrinsecamente privado); broadcast deliberado continua exigindo `notifications:create` via a rota
  do motor. Frontend removeu o seletor "Pública (toda a organização)". **Re-verificação pelos dois
  que reprovaram.**

> **Lição registrada na memória do projeto.** Efeito de domínio **não-amplificador**: um efeito
> disparado por permissão X nunca pode conceder o alcance de uma permissão Y que o ator não tem.
> Esse padrão (pego no Ω4C PR-06) foi reusado em multa/dano/remuneração/baixa-de-estoque.

> **Sub-nota (CI como gate empírico).** No **ciclo 2** do mesmo PR-06, o **CI** (Postgres real)
> pegou uma FK no teardown de teste que a junta **em memória** não via (o teste era DB-gated e
> pulava). Fix = **só teardown de teste, zero código de produto**; a aprovação de produto
> permaneceu. Moral vigente: a junta aprova o produto e o **CI verde** é pré-condição do porteiro (§8).

---

## 6. Bateria de validação (§9 do `CLAUDE.md`)

Reproduza a bateria **exata** de cada comando. Estes são os padrões por trilha, formatados como
checklist executável. Rode **na ordem** (formato → analyze/lint → teste do bloco → regressões →
suíte → build → contratos → `git diff --check`).

### Flutter (`mobile/flutter_app/`)

```bash
cd mobile/flutter_app
flutter pub get
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test test/features/<bloco>_test.dart --reporter compact      # teste DO bloco
flutter test test/features/<bloco_anterior>_test.dart --reporter compact   # regressões (repita p/ cada anterior relevante)
flutter test --reporter compact                                       # suíte inteira
cd ../..
```

### Backend / raiz

```bash
npm run check
npm run lint
npm test
npm run build
node --test --import tsx tests/<contrato>.test.ts                     # contrato(s) do bloco
node --test --import tsx tests/mobile-backend-contracts.test.ts tests/core-saas-contract.test.ts
node --check Kpis/app.js
git diff --check
```

### Frontend (`frontend/`)

```bash
npm --prefix frontend run check
npm --prefix frontend run build
npm --prefix frontend run test:smoke        # quando existir
```

> **Cuidado (memória do projeto):** alguns `tests/*.test.ts` da **suíte backend** leem `.tsx` do
> front **por texto** (ex.: `approval-frontend-contract.test.ts` lê `WorkOrderDetailPage`). Mexer no
> front pode quebrar o **job backend** do CI → **rode a suíte backend também**.

### KPI / documental

```bash
node --check Kpis/app.js
rg "<marcador-do-bloco>" Kpis/ docs/                # confirma os marcadores do bloco
git diff --check
```

> **Sobre `merge_commit`/`approved_head` `null` na autoria (§3/§9):** na política KPI-por-PR, esses
> campos do **PR corrente** são `null` até o merge. O antigo check que **falhava** em `null` de
> PR/merge/approved head **não se aplica** ao PR corrente — recebem **backfill pós-merge**.

### Rodada Ω5P — "Seção 10" (variante do mesmo espírito)

```bash
npx prisma validate
npx prisma migrate diff ...        # sem drift
npm run lint && npm run build && npm test
npm --prefix frontend run lint && npm --prefix frontend run build && npm --prefix frontend run test
git status --short                 # nada fora do escopo
```

---

## 7. Limpeza pós-validação e **pós-merge** (C5)

### Pós-validação (fim de cada bloco)

Remova temporários de teste/build gerados na bateria, **sem** apagar rastreados nem os untracked
permitidos. Vários comandos trazem a linha "Limpar artefatos Flutter/Node após as validações".

### Pós-merge **OBRIGATória** (disco escasso — decisão do dono, 2026-07-20)

Toda vez que um PR **merga**: além de `--delete-branch` (remoto), **limpe o lixo local**. Rotina
mínima, com script pronto em `scripts/post-merge-cleanup.sh`:

```bash
bash scripts/post-merge-cleanup.sh          # limpeza padrão (segura)
bash scripts/post-merge-cleanup.sh --deep   # + .vite / node_modules/.cache / tsbuildinfo maiores
```

O que ele faz (equivalente manual):

1. **Build artifacts** (regeneráveis, quase todos gitignored):
   `rm -rf frontend/dist dist coverage frontend/coverage mobile/flutter_app/build` +
   `find . -name '*.tsbuildinfo' -not -path '*/node_modules/*' -delete`.
2. **Branches locais já mergeadas**:
   `git branch --merged main | grep -vE '^\*|(^|\s)main$' | xargs -r git branch -d`.
3. **Referências remotas mortas**: `git remote prune origin`.
4. **Scratchpad da sessão** e temporários de teste soltos.

**NUNCA apagar:** arquivos **rastreados**; `node_modules`/`.pnpm-store` (reinstalar custa caro);
`.env` real; os untracked **explicitamente permitidos** (os **3 PNGs de marca**, `.claude/skills/*`).
Em dúvida: `git status` / `git clean -nxd` (**dry-run**) antes. A limpeza é **reportada em 1 linha**
no fechamento do bloco (o que foi removido) — nunca silenciosa.

> **Precaução do script (Windows/disco lento):** ele mede só o tamanho de `.git` (`du -sh .git`),
> **nunca `du -sh .`** — varrer `node_modules` trava em disco lento.

---

## 8. Definition of Done + rastreabilidade

### DoD por bloco (§10 do `CLAUDE.md`)

- [ ] **Escopo respeitado** (nada fora do permitido; nada do proibido tocado).
- [ ] **Bateria de validação** do comando **verde** (§6).
- [ ] **Estados obrigatórios** presentes (loading/empty/error/**acesso não permitido**/offline-sync/
      dados desatualizados); offline/sync onde couber.
- [ ] **Permissão validada no backend** conforme `RBAC_MATRIX.md` (a UI só molda/esconde).
- [ ] **Sem termo técnico na UI** (§B3 — "Organização", nunca "Tenant"); **sem segredo/PII** em
      payload/auditoria (allowlist §B2.8 — nunca `token`/`path`/`bucket`/`storage key`/`base64`/
      binário/`tenant_id` externo).
- [ ] **Artefatos temporários limpos** e, **após o merge, limpeza pós-merge executada** por agente distinto (§7).
- [ ] **PR aberto no GitHub**; **KPIs atualizados no próprio PR** com contagens reais (§3).
- [ ] **Junta registrada + CI verde + porteiro pré-merge independente** autorizaram literalmente o PR/head
      exatos (staffing e modelo do porteiro na Etapa 8).
- [ ] **Fechamento pós-merge factual** concluído por outro agente (backfill, reconciliação, limpeza/compactação).
- [ ] **A11y:** alvo de toque ≥44px (mobile), foco visível, aria em ícones-ação.
- [ ] **Fidelidade visual (§11):** a tela bate com a referência de `screen-refs/` quando existir —
      recriar, não reinterpretar; sem andaime de dev na UI.

### Rastreabilidade (C6)

Todo bloco registra a linha canônica:

```
ID · PR # · merge commit · approved head · gate · status
```

- **status** = `published_per_pr` (política vigente) — o histórico anterior usa
  `published_after_human_approval` (não replicar em bloco novo).
- **merge commit / approved head** = `null` na autoria; **backfill pelo executor pós-merge**. A projeção
  versionada entra como primeira operação do próximo PR autorizado e não conta bloco novo.
- **Contratos** versionados por data/bloco: ex.
  `mobile_evidence_file_upload@2026-06-18.b108`.

---

## 9. Exemplo COMPLETO de um bloco, de ponta a ponta (ILUSTRATIVO)

> **Aviso.** O bloco abaixo — **`B-EXEMPLO`** — é **fictício e didático**. Serve de **molde**, não é
> uma entrega real. Nenhum caminho/PR/hash aqui é verdadeiro. O objetivo é mostrar o encadeamento
> das 7 etapas com os artefatos reais que cada uma produz.

### 9.1 O comando — `agent-orchestration/codex/comandos/B-EXEMPLO-vehicle-color.md`

```markdown
# B-EXEMPLO — Campo "cor do veículo" no cadastro de veículos

## Objetivo
Permitir registrar e exibir a cor do veículo no cadastro (backend + web), como
campo opcional, sem tocar no fluxo de OS.

## Contratos
- `PATCH /api/v1/vehicles/:id`  → aceita `color?: string` (allowlist; nunca binário)
- `GET   /api/v1/vehicles/:id`  → passa a devolver `color`
- Tenant resolvido pelo ator autenticado. Permissão: `vehicles:update`.

## Escopo permitido
- src/modules/vehicles/**  (service, routes, DTO)
- frontend/src/pages/VehiclesPage.tsx, frontend/src/features/vehicles/**
- tests/vehicles.test.ts, tests/vehicles-frontend-contract.test.ts
- Kpis/*   ← D-KPI-PER-PR (painel único desde D-KPI-DUPLA-REVOGADA)

## Escopo proibido
- prisma/** e migrations/**  → SEM migração (coluna já existe; se não existir, PARAR e pedir junta+dba-guardiao)
- infra/**, .env, lockfiles JS, pubspec.*, Figma
- fluxo de OS, financeiro, telemetria

## Validações
```bash
npm run check
npm run lint
npm test
npm run build
node --test --import tsx tests/vehicles.test.ts tests/vehicles-frontend-contract.test.ts
npm --prefix frontend run check
npm --prefix frontend run build
node --check Kpis/app.js
git diff --check
```

## Rastreabilidade
- ID: B-EXEMPLO · gate: junta de 3 · status: published_per_pr
- KPI no próprio PR (contagem real); merge_commit/approved_head = null na autoria (executor pós-merge externo;
  projeção versionada como primeira operação do próximo PR autorizado).
```

### 9.2 Implementação (resumo)

- **Backend:** `vehicles.service.ts` passa a aceitar/retornar `color` (string opcional, saneada);
  a rota `PATCH /vehicles/:id` valida `vehicles:update` (backend é a autoridade); DTO de resposta
  por **allowlist** (nunca expõe `tenant_id` externo). **Sem migração** — a coluna `color` já
  existe no schema (confirmado por leitura; se **não** existisse, seria **parada** para junta com
  `agente-dba-guardiao`, pois `prisma/**` é proibido).
- **Frontend:** `VehiclesPage.tsx` mostra a cor na tabela e no modal de edição; rótulos em PT-BR
  ("Cor"), estados obrigatórios preservados; sem termo técnico.

### 9.3 Bateria rodada (real, verde)

```
npm run check         → OK
npm run lint          → OK
npm test              → 1877 passing (+3 net-new de vehicles)
npm run build         → OK
node --test ... tests/vehicles.test.ts tests/vehicles-frontend-contract.test.ts  → 3/3 + contrato OK
npm --prefix frontend run check / build  → OK
node --check Kpis/app.js  → OK
git diff --check      → sem whitespace
```

### 9.4 KPI atualizado no próprio PR

**`kpis-latest.json`** (trecho): `backend_tests.value` **1874 → 1877** (+3, execução real; nota:
"vehicles color: +3 em tests/vehicles.test.ts"); `frontend_smoke_tests` **+1** se houve smoke novo,
senão **inalterado com nota**; `blocks_completed` **110 → 111**; `mvp_demo`/`mvp_vendavel`
**inalterados** (não moveu escopo — campo cosmético). `pr`/`merge_commit`/`approved_head` = **`null`
na autoria**; `status: "published_per_pr"`.

**`kpis-history.md`** (append):

```markdown
## 2026-07-28 - B-EXEMPLO: campo cor do veículo (backend + web)
### KPIs
- `backend_tests` **1874 -> 1877** (+3 vehicles.test). `blocks_completed` **110 -> 111**.
- `frontend_smoke_tests` 937, `flutter_tests` 807 — INALTERADOS (PR web/backend-only).
- pr/merge_commit/approved_head = null na autoria → backfill pelo executor pós-merge distinto.
```

`Kpis/index.html` hidrata desses arquivos em runtime — nada hardcoded a editar (só o `node --check`
do `app.js` na bateria).

### 9.5 A junta

`agent-orchestration/omega/juntas/J-EXEMPLO-vehicle-color.md`:

```
Junta (3): validador-mestre (veto) + coordenador-de-acessos (veto) + cognicao-visual
- validador-mestre         → APROVADO — allowlist verificada; sem PII; sem migração; 3 testes cobrem cor opcional.
- coordenador-de-acessos   → APROVADO — PATCH gated por vehicles:update (viewer/auditor → 403 real); cross-tenant 404.
- cognicao-visual          → APROVADO — "Cor" em PT-BR, estados preservados, bate com screen-refs/web (VehiclesPage).
Resultado: APROVADO por unanimidade (3/3). Verde + CI verde → porteiro pré-merge no head exato; somente o
`LIBERADO` literal dele → merge (squash, --delete-branch).
```

Não houve dúvida técnica → sem PD; não é decisão crítica (sem dependência nova, sem serviço pago) →
**junta de 3, maioria/unânime simples**, não junta-5.

### 9.6 Porteiro, merge e fechamento pós-merge

- Agente porteiro novo e independente (staffing/modelo na Etapa 8) reexecuta o head candidato e emite a
  autorização literal.
- Merge por squash com `--delete-branch`.
- `bash scripts/post-merge-cleanup.sh` → removeu `frontend/dist/`, `coverage/`, 1 branch local
  mergeada; `git remote prune origin`. **1 linha no fechamento:** "pós-merge: removidos
  frontend/dist, coverage, branch feat/vehicles-b-exemplo; .git 40M→40M".
- **Executor pós-merge distinto** faz o **backfill**: preenche `pr: <n>`, `merge_commit`, `approved_head` do
  B-EXEMPLO no `kpis-latest.json`/history, reconcilia e fecha a limpeza antes do próximo bloco.

---

### Fechamento

Este é o **detalhamento** da Parte C. Se você precisou vir aqui para decidir algo, releia também o
`CLAUDE.md` — **em qualquer divergência, o contrato vence** e este arquivo é que deve ser corrigido.
Mantê-lo fiel à Parte C é parte da rastreabilidade (Parte A).
