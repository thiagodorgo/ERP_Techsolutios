# Parecer do porteiro pós-merge — PR #369 (B-O6R-07a)

- **Papel:** `porteiro-pos-merge` (Fable por contrato, `D-PORTEIRO-POS-MERGE`) — instância nova, não participou da junta.
- **Data:** 2026-09-04
- **Protocolo:** §C7.7 P1/P2/P4 — esqueleto ANTES de medir; cada item apensado ANTES do seguinte.
- **Posição declarada:** neutro quanto à premissa, mas **não externo ao processo** (nasço do mesmo contrato que criou as juntas). Sou o menos interessado disponível, não um terceiro independente.

## Fatos de partida (medidos no início, árvore principal em `demo/investidor`)

- `git log origin/main -3`: `dc8168b` (#369) → `f895dd2` (#368) → `e6a6461` (#367).
- `gh pr view 369`: `MERGED` em `2026-09-04T21:19:23Z`, `mergeCommit.oid = dc8168b973a5…`, `headRefOid = 0a7f5fdc39a4…`, `headRefName = fix/o6r07a-authorization`.
- Árvores: `dc8168b^{tree}` = `a666c66f…` · `0a7f5fd^{tree}` = `a666c66f…` (**idênticas**) · `9989c62^{tree}` = `196494b5…` (head julgado, difere pelo delta pós-voto).
- Worktrees presentes: árvore principal (`demo/investidor`), `agent-af6ea607f3ddf8efd` (`feat/o6r-b02-financial-uow`, **B-O6R-02, outra sessão — INTOCÁVEL**), `gov-descuido` (`docs/governanca-porteiro-pre-merge-sol`, outra sessão — não é meu).

## G1 — Promessa × diff × registro

EM APURAÇÃO

## G2 — Números reexecutados, KPI e registros

EM APURAÇÃO

## G3 — Limpeza §C5 e o próximo start

EM APURAÇÃO

## Item adicional (subordinado) — série metodológica de re-execuções

EM APURAÇÃO

## Veredito

EM APURAÇÃO

---

## G1 — REGISTRO DAS MEDIÇÕES (apensado ao medir; head medido = `dc8168b`)

**G1.1 — merge íntegro.** `git fetch origin` + `git log origin/main -3` → topo `dc8168b973a5b63a378c24b3fa58137285d6ddbb` (2026-09-04 18:19:22 -0300) sobre `f895dd2` (#368). `gh pr view 369` → `MERGED` · `mergedAt 2026-09-04T21:19:23Z` · `mergeCommit dc8168b` · `headRefOid 0a7f5fd` · base `main`. **OK.**

**G1.2 — árvore do squash = árvore do head final.** `git rev-parse dc8168b^{tree}` = `git rev-parse 0a7f5fd^{tree}` = `a666c66fb74e63ea07a5584369d771aa69315ffd`. **Idênticas** (confirmo a medição do orquestrador). `9989c62^{tree}` = `196494b5…` — o head julgado pela junta difere pelo delta pós-voto declarado na ata (release.summary + título/corpo + ata).

**G1.3 — o título permanente do squash.** `git log origin/main -1 --format=%s` → `fix(auth): SEC-002 parcialmente superado — permissao dedicada, SoD e escopo por objeto; SEC-003 residuais fechados (B-O6R-07a, ciclo 2) (#369)`. Diz **"parcialmente superado"**, não "P0 fechado". **Confere** — o K2-A1 chegou à história.

**G1.4 — diff-tree × corpo do PR.** `git diff-tree -r --name-status dc8168b^ dc8168b` → **65 caminhos** (+12.373/−297): `src/` 12 (auth ×6, catalog, work-orders ×5) · `prisma/migrations/20260871000000_grant_work_orders_approve_permission/` (A) · `tests/` 8 novos `o6r07a-*` + 5 modificados · `Kpis/` 4 · `API_CONTRACTS.md` · `agent-orchestration/` (atas ×2, briefing, 24 votos/diários, pendências, índice, status-geral, log, plano) · `docs/revisoes/O6R/` 2. Tudo que o corpo promete tem arquivo no diff: permissão dedicada (`catalog.ts`, `work-order.routes.ts`, snapshot do catálogo), SoD (`approval.service.ts`), escopo por objeto + dual-match (`work-order.service.ts`, `work-order.types.ts`), migração, lockout/rate-limit/pino (`auth/*`), testes `o6r07a-*` (8 arquivos). **Arquivos tocados que o corpo NÃO nomeia** (classificados, nenhum é escopo que cresceu em silêncio): `API_CONTRACTS.md` (+15/−4 — documenta o rate-limit/lockout e a permissão nova; é consequência do entregue), `tests/work-order-checklists-sticky.test.ts` (+43 — rearranjo EMENDA E2, diário `dev-s1-s4-arranjo-sticky.md` presente), `Kpis/app.js` (1 linha `var FROZEN`, §C3.0), `votos/SAN2-6/00c-porteiro-pos-merge-368.md` (parecer do porteiro do #368, carregado por este PR — registro, não código). **Nota N1:** o corpo poderia nomear os quatro; não há promessa sem código nem código sem promessa.

**G1.5 — Migração: ordem lexicográfica.** `ls prisma/migrations | sort | tail -2` → `20260868000000_add_auth_identities`, `20260871000000_grant_work_orders_approve_permission`. A nova é a **última**; não se intercala antes de migração já aplicada. **OK.**

**G1.6 — SEC-002 no registro: `parcialmente_superado`, 9 rotas nomeadas.** `docs/revisoes/O6R/achados.jsonl` l.9: `status = "parcialmente_superado"`, sem `fechado_em`/`fechado_por`, `supersedido.componentes_abertos.length = 9` (attach-POST · attach-DELETE · comment-POST · comment-PATCH · comment-DELETE · tag-POST · tag-DELETE · geocode · geocode-destination), cada um com FORMA e CAUSA; `contagem_aberta` = "3 execução · 4 leitura · 2 env". `pendencias.md` l.5717 `P-O6R-SUBRECURSO-OBJECT-SCOPE` — ALTA · ABERTA · `pre-existente` · dono `B-O6R-07c` · as 9 rotas com N/forma/causa (l.5727-5752). **Confere.**

**G1.7 — A DÉCIMA VIA (S-A1): ONDE está e onde NÃO está.** `grep -niE 'work-order-actions|work_order\.mileage|d[ée]cima via|S-A1|superf[ií]cie de sync'`:
- `pendencias.md` → **0 ocorrências** (a entrada dona l.5717-5762 lista as 9 rotas e **não menciona a via de sync**).
- `docs/revisoes/O6R/achados.jsonl` (SEC-002) → **0** (`contagem_aberta` abre com "9 rotas mutantes alcancaveis pelo tecnico sobre OS alheia" sem o qualificador que a C1-v2 pediu).
- `REGISTRO_ACHADOS_O6R.md`, `B-O6R-07-plano.md`, `status-geral.md` → **0** (só menções históricas do endpoint).
- **Está em:** `J-O6R-07a-ciclo2.md` l.60 (achado S-A1, `alta`, `pre-existente` `eed6240` #197) e l.159-161; `Kpis/kpis-latest.json` `release.summary` (apenso pós-voto); corpo do PR #369; `votos/O6R-07a/11-c2-autorizacao-evidencia.md` §S4 (medição).
**Veredito parcial:** a via está **registrada** (ata + KPI + PR) e **vinculada em prosa** ao `B-O6R-07c`, mas **não** está na pendência dona nem no `componentes_abertos` do achado — que são os artefatos estruturados que o planejador do 07c vai ler. O §C7.1-ter(a) pede "pendência nomeada com bloco dono, e o número afetado publicado com N, forma e causa": a dona existe, o N/forma/causa da décima via **não** está nela. **Ressalva R1** (viaja para o próximo PR: apensar a via de sync a `P-O6R-SUBRECURSO-OBJECT-SCOPE` e ao `contagem_aberta` do SEC-002, com a evidência `eed6240`/#197).

**G1.8 — drill das rotas (nos dois sentidos):** EM APURAÇÃO — escrito e executado por mim abaixo, no worktree descartável `wt-porteiro-369` @ `dc8168b`.

---

## G2 — REGISTRO DAS MEDIÇÕES (apensado ao medir; head medido = `dc8168b`)

**Terreno meu:** worktree descartável `scratchpad/wt-porteiro-369` detached em `dc8168b` (`git -c core.longpaths=true worktree add --detach` — a 1ª tentativa sem a flag falhou em `Filename too long` num voto do B-O6R-02 e o git desfez sozinho; nada ficou registrado), `npm ci` próprio (326 pacotes, ec=0; `cmd /c dir /AL` → zero junction), `npx prisma generate` (v7.8.0), **sem `.env` no worktree** (medido: `ls .env` → NAO). Cluster descartável **`porteiro-369-pg`** (`postgres:16-alpine`, `127.0.0.1:57432` — porta medida livre por `netstat` e fora de todas as 22 faixas excluídas do Hyper-V; nunca 55432), `prisma migrate deploy` → **104 migrações**, a última `20260871000000_grant_work_orders_approve_permission`. `erp-postgres:5432`/`erp-redis:6379` **não tocados nem lidos**.

**G2.1 — Bateria reexecutada (canônica 3: `DATABASE_URL` exportada para o meu cluster, `CORE_SAAS_PERSISTENCE` NÃO exportada → runner assume `memory`, `RBAC_DB_PARITY` ausente):**

| passo | resultado | ec |
|---|---|---|
| `npm run check` | limpo | **0** |
| `npm test` | `[run-backend-tests] 256 arquivo(s) · 2656 teste(s) · pass 2652 · fail 2 · skipped 2` | **1** |
| `npm run build` | limpo | **0** |
| `node --check Kpis/app.js` | ok | **0** |
| `node scripts/kpi-freeze.mjs --check` | "em dia (snapshot 2026-09-03)" | **0** |
| `node --test --import tsx tests/kpi-dashboard-charts.test.ts` | 16 pass / 0 fail | **0** |
| `node --test --import tsx tests/kpi-achados-paridade.test.ts` | 6 pass / 0 fail | **0** |
| `node scripts/sync-agent-agents.mjs --check` | "23 agentes, espelho consistente" | **0** |
| `git diff --check` (worktree limpo) | limpo | **0** |
| `git diff --check dc8168b^ dc8168b` (conteúdo do squash) | `votos/O6R-07a/03-migracao-escopo-registro-evidencia.md:687: new blank line at EOF` | **2** |

**DIVERGÊNCIA da ata (`256 · 2656 · pass 2654 · fail 0 · skipped 2`):** denominador **256/2656** e `skipped 2` **confirmados**; `pass 2652 · fail 2` **diverge** por **2 testes**, ambos Postgres-backed e em arquivos que **este PR não toca**: `tests/checklist-routes-db.test.ts:91` ("gate de REABRIR" — **503 `CHECKLIST_RUN_REOPEN_UNAVAILABLE` "o sistema estava ocupado"**, `duration_ms 12023`) e `tests/checklist-run-lifecycle-db.test.ts` ("(4) isolamento cross-tenant … 404, nunca 403"). CI do head final: 7/7 verde (mesma árvore). **Diagnóstico (isolamento N=2 no meu cluster): EM APURAÇÃO** — gravado abaixo antes de qualquer veredito.

**Nota N2 (do `git diff --check` do squash):** o PR declara `git diff --check = 0`; medido sobre o **conteúdo** do squash há 1 aviso de whitespace num markdown de evidência (não é código). Não muda nada; fica registrado para não virar "0" herdado.

**G2.2 — Diagnóstico dos 2 `not ok` do full-run (isolamento, N=2, mesmo cluster `porteiro-369-pg`, head `dc8168b`):**

```
$ git diff --name-only dc8168b^ dc8168b -- src/modules/checklists src/modules/mobile tests/checklist-routes-db.test.ts tests/checklist-run-lifecycle-db.test.ts
(vazio — o PR não toca nem o código nem os testes que falharam)
$ node scripts/run-backend-tests.mjs tests/checklist-routes-db.test.ts        rodada 1: 4 · pass 4 · fail 0 · ec=0 | rodada 2: 4 · pass 4 · fail 0 · ec=0
$ node scripts/run-backend-tests.mjs tests/checklist-run-lifecycle-db.test.ts rodada 1: 6 · pass 6 · fail 0 · ec=0 | rodada 2: 6 · pass 6 · fail 0 · ec=0
```

**Veredito parcial G2.2:** os 2 `fail` do full-run **não reproduzem isolados** (4/4 e 6/6, duas vezes), o erro do #370 é um **503 `CHECKLIST_RUN_REOPEN_UNAVAILABLE` "o sistema estava ocupado"** com 12 s de duração — assinatura de **contenção** da suíte paralela contra um único Postgres nesta máquina (que hoje também hospeda a junta do B-O6R-02), não de regressão; e o CI do head final passou 7/7 na mesma árvore. Logo `2652 + 2 = 2654` — o número da ata **é reproduzível** por soma (full-run + isolamento), mas **não reproduziu num único full-run meu**. Um 2º full-run está em andamento e será gravado abaixo (confirme ou divirja de novo). **Não é achado contra o PR**; é registro de que "2654/0" nesta máquina depende de carga.

**G1.8 — DRILL re-executado por mim** (`drill/zz-porteiro-369-drill.test.ts`, escrito por mim a partir do roteiro de `11-c2-autorizacao-evidencia.md` §S2/§S4, arnês HTTP em memória, worktree `wt-porteiro-369` @ `dc8168b`, **não commitado**; ator = `field_technician` A NÃO atribuído, alvo = OS atribuída ao perfil de B, mesma organização):

```
FECHADAS (10/10 = 403):  approve 403 permission_required · reject 403 permission_required · create 403 permission_required
  mileage(:B) 403 permission_required · checklists(:B) 403 · cancel(:B) 403 · duplicate(:B) 403 · assign(:B) 403
  update(:B) 403 not_assigned_to_actor · status(:B) 403 not_assigned_to_actor        <- as 2 GUARDADAS pelo bloco
ABERTAS por EXECUÇÃO (3/3):  attach-POST(:B) 201 · attach-DELETE(:B, anexo do manager) 204 + lista 2->1 + download 404 · comment-POST(:B) 201
ABERTAS declaradas por LEITURA (4/4, ATACADAS por HTTP por mim):  comment-PATCH(alheio) 200 · tag-POST(alheio) 201 · tag-DELETE(alheio) 204 · comment-DELETE(alheio) 204
ENV (2/2, alcance provado):  geocode(:B) 422 no_address · geocode-destination(:B) 422 no_destination_address   (um 403 viria ANTES do 422)
CONTROLE POSITIVO:  attach-POST(própria) 201
DÉCIMA VIA:  POST /mobile/sync/work-order-actions {work_order.mileage, OS de B} como técnico A -> HTTP 200 · summary {received 1, accepted 1, rejected 0}
             km ANTES null/null/null -> DEPOIS 111111/222222/app     <- MUTAÇÃO REAL DA OS ALHEIA, reproduzida
  controles: work_order.status_change pela mesma via -> rejected 1 · work_order.mileage CROSS-TENANT -> rejected 1 (motivos re-extraídos abaixo)
```

**Veredito parcial G1.8:** paridade DECLARAÇÃO × MEDIÇÃO **exata nos dois sentidos** dentro do universo declarado (19 rotas dos 2 routers): nenhuma nomeada aberta respondeu 403; nenhuma fechada respondeu 2xx. **Confirmo** a C1-v2 em 21/21 medições (mesmos códigos, mesmos motivos) e **confirmo a décima via S-A1 por execução própria**. O registro `parcialmente_superado` **não mente para nenhum dos lados** — mas, como já medido em G1.7, a décima via só existe na ata/KPI/PR, não na pendência dona.

**G1.8-bis — motivos dos controles de sync, re-extraídos (`drill run3`, `# tests 1 · pass 1 · fail 0 · ec=0`):** `work_order.status_change` pela via de sync como técnico A → `rejected 1 · {"code":"WORK_ORDER_NOT_ASSIGNED","reason":"not_assigned_to_actor"}` (**o guard do bloco alcança a via de sync** — a superfície não é inalcançável por desenho; `setMileage` é que não chama o guard); `work_order.mileage` **cross-tenant** → `rejected 1 · {"code":"WORK_ORDER_NOT_FOUND","reason":"not_found"}` (404 intacto). **Confirmo integralmente o S4 da C1-v2.** Todas as 24 medições do meu drill batem com as dela, código a código.

**G2.3 — Backfill §C3.5 devido a ESTE PR (dívida nomeada, com a escolha correta):**
- `Kpis/kpis-latest.json` (blob de `dc8168b`): `release.pr = 369` · `release.merge_commit = null` · `release.approved_head = null` · `status = published_per_pr` · `metrics.blocks_completed = 158` (a nota diz, com estas letras, "sobe para 159 SÓ QUANDO O B-O6R-07a MERGEAR" — mergeou).
- `Kpis/kpis-history.json`: **153 entradas**; as duas últimas são do #369 — **152** (`version B-O6R-07a`, 2026-09-02, `backend_tests 2645/2647`, ciclo 1) e **153** (`version B-O6R-07a-ciclo2`, 2026-09-03, `2654/2656`), ambas `merge_commit null · approved_head null`. Entrada 151 (#368) já backfilled `f895dd2 / d90fbbb` — confere com a ata J-SAN2-6 (head da ata); a R1 do porteiro do #368 está paga.
- **Qual head:** `grep -c` na ata `J-O6R-07a-ciclo2.md` → `9989c62` **1** · `0a7f5fd` **0** · `dc8168b` **0**; `0a7f5fd` tem **0** ocorrências em `kpis-latest.json` e `kpis-history.json`. O delta pós-voto (`6540a9e` → `d10c248` → `0a7f5fd`) está declarado na ata **em prosa, sem hash** — a classe da R1 do #368 repetida. Precedente (3 de 3 + o #368 gravou o head da ata): **`approved_head = 9989c62`**, com **`0a7f5fd` declarado ao lado** (head final, árvore `a666c66f…` = squash) e `merge_commit = dc8168b`.
- **Escolha que nomeio (quem backfilla decide, com a razão escrita):** entrada **153** ← `merge_commit dc8168b` · `approved_head 9989c62` · nota "head final `0a7f5fd` (árvore = squash) carrega o delta pós-voto K2-A1" · `blocks_completed 158 → 159`. Entrada **152** (ciclo 1, **REPROVADO 2×1**, head `fb6618b`) **não pode ganhar `approved_head` como se aprovada**: `merge_commit dc8168b` (o mesmo squash a carrega) e `approved_head null` com a nota "ciclo 1 REPROVADO — superado pela entrada 153". Duas entradas com o mesmo `approved_head` fabricariam uma aprovação que não existiu. **Ressalva R2.**

**G2.2-bis — 2º full-run (`npm test`, mesma forma canônica 3, mesmo cluster, head `dc8168b`, 18:42:10 → 18:46:02):** `[run-backend-tests] 256 arquivo(s) · 2656 teste(s) · pass 2654 · fail 0 · skipped 2` · **ec=0** · zero `not ok`. **O número da ata (`2654/2656/0/2`) REPRODUZ** na 2ª rodada; a 1ª rodada (`2652/2`) foi contenção (503 "ocupado" em teste Postgres fora do diff), como o isolamento N=2 já indicava. Registro as duas rodadas — não só a bonita — porque é a mesma classe que o diário do dev declarou ("rodadas sob contenda de máquina, vítimas fora do bloco"). **Nota N4.**

**G2.4 — Ata e votos × o que aconteceu.** `J-O6R-07a-ciclo1.md`: REPROVADO 2×1 (C1 `bloqueia` + C2 `bloqueia`, C3 APROVADO), head `fb6618b`/`abb0cbd`, quórum unanimidade-de-3 (segurança/permissão), §C7.4-bis respondido, quedas 0. `J-O6R-07a-ciclo2.md`: APROVADO 3×0, head `9989c62`, zero `bloqueia`, achados S-A1 (alta, pre-existente) · K2-A1 (alta, dentro-do-bloco) · J2-A1 (nota) · K1-N1 (nota); delta pós-voto declarado com o que NÃO foi tocado; §C7.4-bis (a)(b)(c) respondidos; quedas 3 (6 no bloco); incidente entre sessões + regra `P-JUNTA-RECURSO-EFEMERO-POR-BLOCO`. Votos JSON × ata, cadeira a cadeira: 01 REPROVADO 4 achados (1 bloqueia · 3 alta) ✓ · 02 REPROVADO 4 (1 bloqueia · 1 baixa · 2 nota) ✓ · 03 APROVADO 6 (2 baixa · 4 nota) ✓ · 11 APROVADO 2 (alta · nota) ✓ · 12 APROVADO 1 (nota) ✓ · 13 APROVADO 2 (alta · nota) ✓ — **batem**. `00-quedas.md` presente (6 quedas, 3 classes, P5 não disparado com razão escrita). Teto `D-TETO-DOIS-CICLOS` respeitado.

**G2.5 — Pendências (existência, dono, N/forma/causa) e uma FECHADA por amostragem no código.**
- `P-O6R-SUBRECURSO-OBJECT-SCOPE` l.5717 — ALTA · ABERTA · `pre-existente` · dono `B-O6R-07c` · 9 rotas com N/forma/causa · **sem a via de sync** (R1).
- `P-AUTH-KDF-ROTACAO-V2` l.5764 — MÉDIA · ABERTA · `pre-existente` · dono `B-AUTH-KDF-V2` ✓.
- `P-KPI-HISTORY-MD-BACKLOG` l.5782 — BAIXA · ABERTA · dono "próximo `…F` de KPI" · forma do número (8 entradas por diff de IDs) ✓.
- Tensão A4 — APPEND l.5792 sem editar a entrada original (l.2896-2924); `Ω6R-QUA-004` "SEGUE ABERTO com o dono dele" ✓.
- **FECHADA por amostragem:** `P-O6R-B07A-RASTRO-ANONIMO-SEM-IP` (fechamento l.5813). No código do merge: `src/modules/auth/services/local-auth-login.service.ts:333-342` (`registerAnonymousFailure` → `recordLoginFailure` "agora COM ipAddress/userAgent") e `src/modules/auth/auth-runtime.ts:65-67` (espelho `withTenantRls`); `tests/o6r07a-anon-lockout-db.test.ts:203,262-269` asserta `metadata.ipAddress` com a mensagem "fecha P-O6R-B07A-RASTRO-ANONIMO-SEM-IP" — e esse arquivo **passou nos meus dois full-runs**. **"FECHADA" é verdade.**
- **Índice × gerador:** `python gerar-indice-pendencias.py` no meu worktree → `252 cabecalhos / 243 IDs | FECHADA 55 · ABERTA 197 | baldes {-:55, C:76, B:83, A:38}`; sha256 eol-neutro do regenerado **= do blob** (`58d0a1445c4ec105…`; a diferença bruta era só CRLF do checkout — 0 CR no blob, `git diff --numstat` vazio). **Índice não foi digitado.**

---

## G3 — REGISTRO DAS MEDIÇÕES (apensado ao medir)

**G3.1 — CI no head final.** O "7/7 no head `0a7f5fd`" é afirmação do orquestrador que **não re-medi** por `gh pr checks` (PR já mergeado); o que vale para mim é a bateria que eu mesmo rodei na mesma árvore (G2.1–G2.2). Registrado como não-medido-por-mim.

**G3.2 — Worktree e branches do bloco.** `git worktree list` → árvore principal (`demo/investidor`), `agent-af6ea607f3ddf8efd` [`feat/o6r-b02-financial-uow`, **B-O6R-02, outra sessão — INTOCÁVEL, não contado como resíduo**], `gov-descuido` [outra sessão], e o meu `wt-porteiro-369` (descartável, removido ao final). **`b07` não está registrado nem existe em disco** (`ls .claude/worktrees/` → só `agent-af6ea…`, `gov-descuido`, `san2-r`). `git branch --list '*o6r07a*' '*b07*'` → **vazio**; `git branch -r --list` idem → **vazio**; `gh api …/branches/fix/o6r07a-authorization` → **404 Branch not found**; `git ls-remote --heads origin | grep -ic o6r07` → **0**. Local e remota apagadas — confere com o relato (remota em comando separado). `git branch --merged origin/main` (exceto main/atual) → vazio.
**Nota N3 (herdada do #368, ainda de pé):** `.claude/worktrees/san2-r/` continua em disco como **diretório vazio** — a N1 do porteiro do #368 não foi varrida. Custo zero; varrer é de quem entrega.

**G3.3 — Sem sobra rastreada / resíduo.** `git status --porcelain | grep -c '^ D'` (árvore principal) → **0**. `docker ps` durante o parecer: `porteiro-369-pg` (meu) + `erp-postgres`/`erp-redis` (base viva, intocada). Nenhum `claude-o6r-c5-*`/`jur-c5-*` presente no momento; se aparecerem, são do B-O6R-02 e **não se tocam**.

**G3.4 — Disco.** `df -h /c` → **27 GB livres** (238G, 89%); `powershell (Get-PSDrive C).Free/1GB` → **26,27 GB**. Acima do limiar de ~10 GB — `DEEP_CLEAN=1` **não obrigatório**.

**G3.5 — A pergunta que decide o start, pelo CAMPO ESTRUTURADO.** `grep -nE '^\*\*Bloqueia' pendencias.md` @ `dc8168b` → **13 campos**, + **1** `**BLOQUEIA**` em prosa (l.4512, `P-GOV-MAIN-SEM-PROTECAO`: "Não bloqueia trabalho de produto"). Mapa campo → entrada → seção do índice gerado:
- **FECHADAS (3 campos):** B01 l.2399 + l.2417 (índice l.311, seção FECHADAS) · B05 l.2722 (índice l.312, FECHADAS).
- **ABERTAS (10 campos / 9 entradas):** B02 l.2563 (feature nova em financeiro) · B03 l.2597 · B04 l.2643 (estoque) · B06 l.2772 (cloud billing) · **B07 l.2794 + l.2820** (OS/aprovações/RBAC; auth + evidências/anexos/upload mobile — a entrada diz em l.48-56 que o campo de auth/OS/RBAC "cai com o merge do 07a" e o de anexos/upload "permanece até o 07b") · B08 l.2969 · B09 l.2988 · B10 l.3023 · B11 l.3067.
- `grep -niE 'bloqueia[^\n]{0,120}(O6R-07b|O6R-07c|O6R-04|O6R-06|SEC-004|sub-?recurso|uploads)'` → **zero**.
- **Alcance sobre os 4 alvos:** `B-O6R-07b` **fecha** o campo l.2820 (SEC-004) — correção, não feature; `B-O6R-07c` fecha `P-O6R-SUBRECURSO-OBJECT-SCOPE` (**sem campo `Bloqueia`**; "a planejar após o merge do 07b" é sequência, não trava); `B-O6R-04` fecha `P-O6R-B04` (campo = "feature em estoque"); `B-O6R-06` fecha `P-O6R-B06` (campo = "feature em cloud billing"). **NENHUMA pendência BLOQUEIA aberta alcança os quatro alvos.** Contagem: **9 entradas / 10 campos abertos** — bate com o porteiro do #368.

---

## Item adicional (subordinado ao mandato) — série metodológica de re-execuções

**Limite declarado:** o gate acima não foi diluído por este item; e eu sou **neutro quanto à premissa, não externo ao processo** — nasço do mesmo contrato (`D-PORTEIRO-POS-MERGE`) que criou as juntas. Sou o menos interessado disponível, não um terceiro independente. Contagem **aproximada**, feita sobre os 6 votos JSON (`itens`, `provas_centrais`, `p3_reexecucao…`, `medicoes_chave`, `provas_positivas…`, `achados`) — uma "re-execução adversarial" = a cadeira rodou comando próprio contra algo já publicado (suíte, drill, número, afirmação de plano/briefing/registro) e disse se confirma ou refuta. Achado que nasce de execução e contradiz o publicado = REFUTOU; medição que bate = CONFIRMOU.

| cadeira | re-execuções (≈) | confirmaram | refutaram | o que refutou |
|---|---|---|---|---|
| C1 (c1) | 9 | 6 | 3 | "P0 fechado" (drill 14 rotas) · "perde TODA mutação" · tensão A4 real (403 ao atribuído) |
| C2 (c1) | 14 | 10 | 4 | lockout por candidato (sondas multi-org) · "rotação via v=2" · "DUAS rotas" do §3.5 · premissa "espião exige alargar password.service" |
| C3 (c1) | 17 | 14 | 3 | "42 arquivos" (=41) · runbook de `down` incompleto · migração em banco sem `roles` = 0 grants |
| C1-v2 (c2) | 16 | 15 | 1 | a DÉCIMA via (sync `work_order.mileage`) fora do censo |
| C2-v2 (c2) | 11 | 9 | 2 | o tipo não protege `registerFailure` opcional (tsc verde) · "diff -q acusou divergência" era EOL |
| C3 (c2) | 25 | 24 | 1 | título/corpo/`release.summary` ainda diziam "P0 fechado" (K2-A1) |
| **total cadeiras** | **≈92** | **≈78 (85%)** | **≈14 (15%)** | |

Inspetores de terreno (2 passadas, ambas `LIBERADO COM RESSALVA`): ≈9 marcadores de re-execução, ≥1 refutação — **não contabilizados em detalhe** (li os pareceres, não as evidências linha a linha). **Porteiro (eu):** ≈30 re-execuções · ≈27 confirmaram · **3 refutaram** — (i) o corpo do PR diz que a pendência dona cobre "as 9 rotas **+ a superfície de sync**" e a pendência **não** a cobre (R1); (ii) "`git diff --check` = 0" × **ec=2** no conteúdo do squash (N2); (iii) "2654/0" **não** reproduziu no 1º full-run (2652/2, contenção) e reproduziu no 2º (N4).

## Veredito

**Executado por mim (resumo):** fetch/log/`gh pr view` · árvores squash×head (idênticas) · título do squash · diff-tree 65 caminhos classificados × corpo · ordem da migração · SEC-002 no jsonl/pendência · grep da décima via em 6 artefatos · **drill próprio de 24 medições** em memória @ `dc8168b` (10/10 fechadas 403 · 9/9 abertas abertas · décima via reproduzida · 2 controles de sync) · bateria em worktree e cluster descartáveis próprios (`check` 0 · `npm test` **2 full-runs**: 2652/2 por contenção → **2654/0** · `build` 0 · 4 guards de KPI 0 · `sync-agent-agents --check` 0 · `git diff --check` 0/2) · isolamento N=2 dos 2 flakes (4/4, 6/6) · campos §C3.5 (152/153 null; 151 backfilled = ata) · hashes na ata (9989c62 ×1, 0a7f5fd ×0) · votos×ata cadeira a cadeira · índice regenerado byte-idêntico (eol-neutro) · pendência FECHADA conferida no código e no teste · branches local/remota/API · `^ D` = 0 · disco 26,27 GB · 13+1 campos BLOQUEIA mapeados. **Não medido:** `gh pr checks` do head final (afirmação do orquestrador); suítes frontend/Flutter (o PR não as toca; métricas marcadas §C3.3 como carregadas); evidências dos inspetores linha a linha.

**Ressalvas (viajam para o próximo PR que mergear — regra do primeiro-que-merge):**
- **R1 — a décima via não está na pendência dona nem no achado.** `P-O6R-SUBRECURSO-OBJECT-SCOPE` (l.5717) e `achados.jsonl` SEC-002 (`componentes_abertos`/`contagem_aberta`) não mencionam `POST /mobile/sync/work-order-actions` + `work_order.mileage` (`eed6240`, 2026-07-17, #197); ela vive só na ata (S-A1), no `release.summary` e no corpo do PR — que afirma "as 9 rotas + a superfície de sync". Apensar à pendência (N=1 provada por execução + superfície de sync a censar, forma "leitura" para o resto) e ao SEC-002, para o planejador do `B-O6R-07c` não ler "9" como exaustivo.
- **R2 — backfill §C3.5 das entradas 152/153:** `merge_commit dc8168b` · `approved_head 9989c62` (head da ata; precedente 3/3 + #368) com `0a7f5fd` declarado ao lado (head final, árvore = squash, carrega o delta K2-A1) · `blocks_completed 158 → 159`; a entrada 152 (ciclo 1 REPROVADO) fica com `approved_head null` e nota — não fabricar segunda aprovação.

**Notas (não bloqueiam):** N1 quatro arquivos do diff não nomeados no corpo (`API_CONTRACTS.md`, sticky test, `Kpis/app.js`, parecer do porteiro #368) · N2 `git diff --check` do conteúdo do squash = 1 aviso em markdown de evidência · N3 casca vazia `.claude/worktrees/san2-r/` ainda em disco (herdada do #368) · N4 "2654/0" é sensível a carga nesta máquina (1º run 2652/2, 2º run 2654/0) · N5 `gh pr checks` não re-medido por mim · N6 worktree `o6r-b01-ressalvas` [`chore/ressalvas-porteiro-357`] apareceu durante o parecer — de outra sessão, **não tocado**.

**Limpeza dos MEUS recursos:** container `porteiro-369-pg` removido; worktree `wt-porteiro-369` desregistrado por `git worktree remove --force` (o diretório sob o scratchpad exigiu apagamento por caminho longo — ver linha final). `agent-af6ea607f3ddf8efd` (B-O6R-02) e `gov-descuido`/`o6r-b01-ressalvas` **intocados**. Base viva `erp-postgres`/`erp-redis` **sem um comando meu**. Não commitei nada.

**Linha final da limpeza:** `git worktree list`/`.git/worktrees` sem `wt-porteiro-369` (desregistrado); diretório do scratchpad: diretório apagado (0 bytes restantes no scratchpad). `docker ps` → só `erp-postgres`/`erp-redis`.

**LIBERADO COM RESSALVA: B-O6R-07b (uploads / SEC-004) — e, em paralelo, B-O6R-04 e B-O6R-06; B-O6R-07c depois do 07b | R1 (apensar a décima via de sync à `P-O6R-SUBRECURSO-OBJECT-SCOPE` e ao SEC-002 do `achados.jsonl`, com N/forma/causa `eed6240` #197) + R2 (backfill §C3.5 das entradas 152/153: `merge_commit dc8168b` · `approved_head 9989c62` com `0a7f5fd` declarado · `blocks_completed 159`; a 152 sem `approved_head`) no primeiro PR que mergear.**
