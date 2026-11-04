# Conferência do conserto único do #488 (B-PATIO-REC-01) — §C7 item 10(3) passo 5

- **Identidade:** `conf-488-opus` — Claude Opus, nível menor declarado, identidade nova (não achou, não planejou, não consertou).
- **Cruzamento de modelo (item 11):** **NÃO cruza modelo.** O conserto é Claude (`dev-rec01-opus`) e o Codex está sem limite; escolha do dono: *"Claude revisa agora"* (item 11(2)). Verificador = identidade nova, sem preferência de modelo.
- **Objeto:** head do PR `cda1f7661f34faa1e61a49d846831b5305562164` (conserto em `12daf50e`/`6542ef18`, diário em `805fb3da`/`cda1f766`). Antes do conserto: `ea6d4aef54181a0dc4030ec56e174e378aec5e12`.
- **Terreno:** worktree `C:/Users/thiag/w-conf488` (detach), `npm ci` próprio, Postgres `conf488-pg` 127.0.0.1:55495.

## Item 1 — o grave sumiu (C2-2)

**1a. Comando da C2 no objeto (a forma executável, com serviço).** O comando literal da C2 chama só `assertIntentAccount`, que o conserto não mudou (continua imprimindo `accepted` — o validador de forma não é a porta de propriedade). A prova da C2 que importa é a execução com serviço; reproduzi-a com sonda PRÓPRIA (`C:/Users/thiag/conf488-probe/probe-k1.mts`: `InMemoryImpoundPaymentRepository` com processo `RELEASE_IN_PROGRESS`/`STANDARD`, portão aberto, ator A, porta devolvendo 9 formas), rodada no objeto e no `ea6d4aef` (`git -c core.autocrlf=false checkout ea6d4aef -- src/modules/impound-payments/`, restaurado depois; `git status` limpo).
- Comando: `WT=C:/Users/thiag/w-conf488 node --import tsx C:/Users/thiag/conf488-probe/probe-k1.mts`
- Saída no `ea6d4aef`: 8 de 9 formas CRIAM intenção `pending` com 1 linha de fila — inclusive a forma da C2 (UUID arbitrário sem dono), dono = B, dono = null, dono = [A], grupo com e sem membros; só `platform` dá 422 `account_not_allowed`. **O grave reproduz no `ea6d4aef`.**
- Saída no objeto: UUID arbitrário sem dono → 422 `payment_connection_not_owned`; dono = B → idem; dono = null → idem; dono = [A] (array) → idem; dono = A em maiúsculas → idem (comparação estrita, fail-closed; nota: uma porta real que devolva UUID em maiúsculas será recusada, nunca aceita errado); `group` com A membro e sem membros → 422 `group_scope_unavailable`; `platform` → 422 `account_not_allowed`; **todas com `intents=0 outbox=0`**. Controle positivo (dono = A) → CRIADA, conta gravada só `{scope, connectionId}` (o `ownerTenantId` não vaza para a intenção), `intents=1 outbox=1`.
- Única porta: `grep -rn "\.resolve(\|PaymentConnectionPort" src/` → o único consumidor de `PaymentConnectionPort.resolve` é `impound-payment.service.ts:70` (`create`). Não há outro caminho que grave conta.
- Veredito parcial: **o grave sumiu** — nenhuma intenção nasce com conta de outra organização nem de grupo.

**1b. T-DOM-28/29/30, vermelho no `ea6d4aef` e verde no objeto.**
- Comando (objeto): `env -u DATABASE_URL -u RBAC_DB_PARITY node --test --import tsx tests/rec-01-intent-service.test.ts tests/rec-01-repository-canary.test.ts tests/rec-01-routes-permissions.test.ts tests/rec-01-validators.test.ts` → `tests 31 pass 31 fail 0 skipped 0`; `DATABASE_URL=…55495/erp_conf488 node --test --import tsx tests/rec-01-domain-db.test.ts` (banco migrado + seed próprios) → `tests 8 pass 8 fail 0 skipped 0`, `ok 6 - T-DOM-28-db`.
- Comando (vermelho-controle: `src/modules/impound-payments/` do `ea6d4aef` + testes do objeto): memória `tests 24 pass 18 fail 6` — `not ok 11 T-DOM-28 (got resolved)`, `not ok 12 T-DOM-29 (got resolved)`, e os 4 K2; Postgres `tests 8 pass 7 fail 1` — `not ok 6 T-DOM-28-db`.
- **Ressalva R1 (não grave, forma de teste):** o vermelho do T-DOM-28-db no `ea6d4aef` é `got release_not_started`, NÃO a intenção nascendo: o processo do arnês está `RELEASE_IN_PROGRESS` sem dossiê STANDARD ativo, e no Postgres o `enqueue` do REC-01 falha fechado (`impound-payment-prisma.repository.ts:169-171`), então nenhuma intenção pode persistir no Postgres pelo serviço no REC-01, com ou sem o conserto. O T-DOM-28-db prova que a recusa no objeto vem antes de qualquer escrita, mas seu vermelho-controle é por outro motivo; a prova do perigo está na memória (T-DOM-28, sonda 1a). T-DOM-29 e T-DOM-30 só existem em memória — o §12 pede "memória e Postgres" só para o T-DOM-28. T-DOM-30 é verde no `ea6d4aef` por desenho (controle positivo, "como hoje").

**1c. Mutações M-K1-a e M-K1-b** (`node C:/Users/thiag/conf488-probe/mut.mjs <service.ts> <id>`, âncora única, `numstat 0 3`, restauradas por `git checkout HEAD`).
- M-K1-a (apagar o `if (account.ownerTenantId !== tenantId)`): memória `pass 13 fail 1` — `not ok 11 T-DOM-28 (got resolved)`, **morde**; Postgres `not ok 6 T-DOM-28-db (got release_not_started)` — morde, pelo motivo da R1.
- M-K1-b (apagar a recusa de `group`): memória `pass 13 fail 1` — `not ok 12 T-DOM-29 (got payment_connection_not_owned)`, **morde**. Nota: sem a recusa, o grupo ainda cai na checagem de dono (grupo não tem `ownerTenantId`) — dupla barreira; Postgres 8/8 (não há T-DOM-29-db).
- Veredito parcial item 1: **GRAVE SUMIU**, com a ressalva R1 (não grave).

## Item 2 — os não graves

**2a. C2-1 (K2) — canário nos 4 métodos, cada um com teste e mutação que morde.**
- Comando de leitura: `grep -n assertRowsBelongToTenant src/modules/impound-payments/impound-payment-prisma.repository.ts` → canário em `processExists`, `lockProcess`, `findById`, `findLiveByProcess` (além do filtro `tenant_id`, que ficou); `listByProcess` segue com o canário no serviço (`service.ts`), fora dos 4 que o §12 nomeia.
- Testes: `tests/rec-01-repository-canary.test.ts` 4/4 verde no objeto; no `src` do `ea6d4aef` os 4 ficam vermelhos (`Missing expected rejection (TenantRowsLeakError): findById devolveu a intenção de B` / `findLiveByProcess…` / `processExists confirmou o processo de B` / `lockProcess travou o processo de B`).
- Mutações próprias, uma por método (`mut.mjs`, âncora única, `numstat 0 1`, restauradas): M-K2-findById → `pass 3 fail 1`, `not ok 1`; M-K2-findLive → `not ok 2`; M-K2-processExists → `not ok 3`; M-K2-lockProcess → `not ok 4`. **As 4 mordem, cada uma só no teste do seu método.**
- Os caminhos reais não quebram: `rec-01-domain-db` 8/8 no Postgres próprio (o `lockProcess`/`processExists` passam pelo canário com linha legítima).
- **Ressalva R2 (não grave, forma):** o §12 diz "uma linha de outra organização injetada como superusuário"; o teste injeta por um **executor falso** (`leakingExecutor`), não por linha gravada como superusuário. A justificativa no cabeçalho do teste confere por execução: com o filtro `tenant_id` presente, uma linha alheia gravada como superusuário nunca volta da consulta (T-ISO-db-1 já mede o filtro), então só um executor que simule o filtro faltante alcança a segunda camada. A forma muda; a propriedade medida (o canário de cada método dispara) é a do plano.
- Veredito parcial: **C2-1 resolvido.**

**2b. C2-3 (K3) — corpo malformado documentado, `app.ts` intocado.**
- `git diff ea6d4aef..HEAD -- src/app.ts | wc -l` → `0`. **`app.ts` não mudou.**
- T-DOM-17 no objeto: `ok 23` (caso válido → 422 `channel_disabled`; caso `body: "{"` → `assert.equal(status, 400)` e `doesNotMatch /channel_disabled|impound|online/i`), com o comentário K3 e a pendência nomeada.
- Comando literal da C2-3 re-executado no objeto: `400`, corpo HTML do leitor; JSON válido → `422 channel_disabled`. Sonda própria comparando rotas: `/online-payment` e `/api/v1/work-orders` devolvem **o mesmo 400 de 1044 bytes**, sem nada do pátio — a resposta não depende da rota nem revela o portão.
- Nota (pré-existente, fora do bloco): fora de `NODE_ENV=production`, o 400 do leitor traz a pilha do `body-parser` no HTML (`hasStack true` em qualquer rota); é comportamento global do Express desde antes do bloco.
- **Ressalva R3 (registro):** a pendência `P-PATIO-BODY-PARSER-ANTES-DO-PORTAO` existe só no diário do dev (`docs/revisoes/PATIO/B-PATIO-REC-01-dev.md:320`, "a registrar pelo orquestrador") e no comentário do teste; `git grep` no objeto e na `origin/main` não a acha em `agent-orchestration/controle/`. Falta o registro com dono.
- Veredito parcial: **C2-3 aceito e documentado como o §12 manda.**

## Item 3 — CI inteiro e escopo

**3a. Check-runs do head.** `gh api repos/:owner/:repo/commits/cda1f7661f34faa1e61a49d846831b5305562164/check-runs` → `total_count 16`, **16/16 `completed success`** (2 rodadas: push `41694429930` e pull_request `41694449557`; jobs backend, backend-postgres, frontend, flutter, antivirus, authority-portal, owner-portal, docker ×2). O commit de produto `12daf50e` não tem check-run próprio (`total_count 0`, não foi empurrado sozinho); o head `cda1f766` o contém e só acrescenta o diário (`git diff --stat 805fb3da..cda1f766` = 1 arquivo `.md`; `12daf50e..cda1f766` só `docs/`).

**3b. TAP** (`gh run view <run> --job <id> --log | grep -E "^# (tests|pass|fail|skipped)|not ok"`, prefixo de data removido):
- backend, push (job `126121121066`): `tests 4309 pass 4307 fail 0 skipped 2`; 0 `not ok`.
- backend-postgres, push (`126121121397`): `tests 503 pass 503 fail 0 skipped 0`; 0 `not ok`.
- backend, PR (`126121189852`, ref de merge com a `main`): `tests 4416 pass 4414 fail 0 skipped 2`; 0 `not ok`.
- backend-postgres, PR (`126121189470`): `tests 503 pass 503 fail 0 skipped 0`; 0 `not ok`.
- Os 2 `skipped` do backend são os dois casos `RBAC_DB_PARITY` (`# SKIP RBAC_DB_PARITY não é "1"`), pré-existentes. Os testes do conserto rodaram: T-DOM-28/29/30 + 4 K2 + T-DOM-17 `ok` no backend; `T-DOM-28-db` `ok` (sem SKIP) no backend-postgres (linha 280). Passos com pipe no `ci.yml` têm `set -o pipefail` (l.198, l.381).

**3c. Escopo.** `git diff --name-only ea6d4aef..HEAD` → 8 arquivos: `src/modules/impound-payments/{impound-payment.types.ts, impound-payment.service.ts}` (K1), `impound-payment-prisma.repository.ts` (K2), `tests/rec-01-{intent-service, domain-db, repository-canary, routes-permissions}.test.ts` (T-DOM-28/29/30, 28-db, K2, T-DOM-17), `docs/revisoes/PATIO/B-PATIO-REC-01-dev.md` (diário). Tudo dentro de K1/K2/K3 do §12. `git diff --name-only ea6d4aef..HEAD -- prisma/ Kpis/ src/app.ts .github/` → 0. Mudança em teste existente (T-DOM-16): a porta de grupo virou porta da própria organização, e a cobertura do DTO de grupo foi preservada semeando uma intenção de grupo (`accountScope` `["group","organization"]`) — não afrouxa asserção.

**3d.** `git diff --check ea6d4aef..HEAD` → vazio, exit 0.
- Veredito parcial item 3: **CI 16/16 verde pelo TAP, escopo dentro do §12, diff limpo.**

## Fechamento

- Achados graves remanescentes: **nenhum.** C2-2 não reproduz no objeto (sonda própria, 8 formas adversariais recusadas, 0 intenção, 0 fila) e reproduz no `ea6d4aef`; M-K1-a e M-K1-b mordem.
- Ressalvas (não graves, triagem do item 10(3)):
  - **R1** — o vermelho-controle do T-DOM-28-db no `ea6d4aef` (e sob M-K1-a) é `release_not_started`, não a intenção nascendo; no Postgres do REC-01 o `enqueue` falha fechado e nenhuma intenção persiste pelo serviço. A prova do perigo é a de memória.
  - **R2** — o teste do canário injeta a linha alheia por executor falso, não "como superusuário" (forma diferente da letra do §12, propriedade igual).
  - **R3** — `P-PATIO-BODY-PARSER-ANTES-DO-PORTAO` não está registrada em `agent-orchestration/controle/` (só no diário e no comentário do teste).
- Terreno: worktree `C:/Users/thiag/w-conf488` e container `conf488-pg` removidos ao fim; sondas em `C:/Users/thiag/conf488-probe/` (removidas junto). Nada tocado em erp-postgres, erp-redis, 3000/5173, no worktree externo da apresentação, em w-rec01 nem na árvore principal.

VEREDITO: CONFERIDO COM RESSALVA
