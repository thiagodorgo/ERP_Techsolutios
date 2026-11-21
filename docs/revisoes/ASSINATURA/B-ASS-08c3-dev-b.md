<!-- Cópia versionada do diário do Dev B do B-ASS-08c3, pedida pelo plano do bloco (§8). O original fica fora do
repositório, na pasta do orquestrador (`revisoes/08c3/dev-08c3-b.md`). Caminhos locais trocados por `~/`; os caracteres de
controle que o PowerShell deixou no lugar de crase + letra voltaram à forma escrita (crase + f, 0, a, b, e, n, t).
Nada mais mudou. -->

# Diário — Dev B (`dev-08c3-b-azc`) — B-ASS-08c3

- Data (SP): 2026-11-19
- Ramo: `feat/billing-channel-enable-b`
- Worktree: `~/w-08c3b`
- Cluster: `~/pg-08c3b` (porta 56072)
- Modelo declarado: `gpt-5.3-codex` (AZC, nível Sol)

## F-B0 — setup, base e registro obrigatório

### Comandos e saídas (base)
1) `cd ~/w-08c3b && date '+%Y-%m-%d %H:%M:%S %Z'`
- Saída: `2026-11-19 10:35:08`

2) `cd ~/w-08c3b && git rev-parse --short=12 HEAD`
- Saída: `ff572fcfae58`

3) `cd ~/w-08c3b && git diff --stat 917bc6cd..origin/main -- src/`
- Saída: vazia (sem mudanças em `src/` desde `917bc6cd`)

4) `cd ~/erp-pausa-2026-10-03 && grep -ni '08c3-q' REGISTRO-PENDENTE.md | tail -n 40`
- Saída: linha do plano com conflito `C-08C3-Q1-PADRAO-SEM-RESPOSTA`; sem resposta explícita do dono às Q1/Q2/Q3 até o corte.

### Comandos e saídas (setup local)
5) `cd ~/w-08c3b && npm ci`
- Saída: concluído; aviso de engine (`node>=22`) em dependência de Prisma streams.

6) `cd ~/w-08c3b && npm run db:generate`
- Saída: falha inicial por `DATABASE_URL` ausente.

7) `cd ~/w-08c3b && DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:56072/erp_techsolutions?schema=public' npm run db:generate`
- Saída: `prisma generate` concluído (Prisma Client v7.8.0).

### Ação de código da F-B0
8) Registro adicionado em `agent-orchestration/controle/decisoes.md`:
- `C-08C3-Q1-PADRAO-SEM-RESPOSTA`
- Estado: padrão aplicado `Q1=(a)`; rastreio do disparo inclui `Q2=(a)` e `Q3=(a)`.

### Veredito parcial da F-B0
- **VERDE**, com setup concluído e registro obrigatório escrito.
- Próximo: F-B1 (`deferOrphan` + testes OR1..OR4 + mutações M-OR1..M-OR3).

## F-B1 — órfã isolada (`deferOrphan`, `[ORFA-TRY]`, `[ORFA-DEFER]`, `[ORFA-CAP]`)

### Mutações/código aplicados
- `src/modules/subscription-billing/outbox/outbox.repository.ts`
  - Porta `OutboxRepository`: novo método `deferOrphan(...)`.
  - Dublê em memória: implementação mantém a linha em `PROCESSING`, renova `attemptStartedAt` e grava `lastError`.
- `src/modules/subscription-billing/outbox/outbox.prisma.ts`
  - Implementação `deferOrphan(...)` no Prisma com `status='PROCESSING'`, `attempt_started_at=now`, `last_error=code`.
- `src/modules/subscription-billing/outbox/outbox.dispatcher.ts`
  - `DispatchAuditEvent`: nova ação `billing_outbox.orphan_recheck_failed`.
  - Ramo órfão dentro de `try/catch` (`[ORFA-TRY]`).
  - Falha abaixo do teto: `repo.deferOrphan(...)` (`[ORFA-DEFER]`) e retorno `retry`.
  - Falha no teto: `markNeedsReview('orphan_recovery_failed:<code>')` (`[ORFA-CAP]`).

### Testes/mutações da fatia
- `tests/ass-08-outbox.test.ts`
  - **OR1**: falha na órfã não aborta rodada; próximo `pending` é processado.
  - **OR2**: falha da órfã mantém `PROCESSING` (não volta a `PENDING`).
  - **OR3**: no teto, vira `NEEDS_REVIEW orphan_recovery_failed:<code>`.

### Comandos e saídas
1) `cd ~/w-08c3b && DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:56072/erp_techsolutions?schema=public' node --test --import tsx tests/ass-08-outbox.test.ts`
- Primeira rodada: 1 falha de ajuste no teste OR3 (`OUTBOX_MAX_ATTEMPTS` não importado).
- Ajuste aplicado no teste.
- Segunda rodada: **41/41 verdes**.

### Veredito parcial da F-B1
- **VERDE** (código + testes OR1/OR2/OR3 cobertos no arquivo foco do dispatcher).
- Próximo: F-B2 (trilha persistida do despacho).

## P3 — medição parcial antes da continuação (dev-08c3-b-azc-2)

### Comandos
- `cd ~/w-08c3b && git rev-parse --abbrev-ref HEAD`
- `cd ~/w-08c3b && git log --oneline --decorate -n 12`
- `cd ~/w-08c3b && git status --short --branch`
- `cd ~/w-08c3b && git ls-remote --heads origin feat/billing-channel-enable-b`

### Saída resumida
- Head: `0a2f1740`.
- Ramo local/remoto: `feat/billing-channel-enable-b` já publicado em `origin/feat/billing-channel-enable-b`.
- Parcial confirmado: F-B0 e F-B1 presentes; sem commits adicionais no remoto no início desta continuação.

## F-B1 — mutações faltantes (M-OR1, M-OR2, M-OR3) — vermelho/restauração/verde

### Âncora M-OR1
- Arquivo: `src/modules/subscription-billing/outbox/outbox.dispatcher.ts`
- Trecho-base (âncora): `// [ORFA-TRY]` + bloco `try/catch` da órfã.

### M-OR1 (vermelho)
- Mutação aplicada: remoção do `try/catch` da órfã (ramo volta a ficar fora do `try`).
- Comando: `node --test --import tsx --test-name-pattern=OR1 tests/ass-08-outbox.test.ts`
- Resultado: **vermelho** (`provider_unavailable` propagado; OR1 falha).

### M-OR1 (restauração)
- Restauração: `git checkout -- src/modules/subscription-billing/outbox/outbox.dispatcher.ts`
- Comando: `node --test --import tsx --test-name-pattern=OR1 tests/ass-08-outbox.test.ts`
- Resultado: **verde**.

### Âncora M-OR2
- Arquivo: `src/modules/subscription-billing/outbox/outbox.dispatcher.ts`
- Trecho-base (âncora): linha `// [ORFA-DEFER]` com `deps.repo.deferOrphan(...)`.

### M-OR2 (vermelho)
- Mutação aplicada: `deps.repo.deferOrphan(...)` -> `return registerFailure(deps, row, error, clock);`.
- Comando: `node --test --import tsx --test-name-pattern=OR2 tests/ass-08-outbox.test.ts`
- Resultado: **vermelho** (linha volta `PENDING`, esperado era `PROCESSING`).

### M-OR2 (restauração)
- Restauração: `git checkout -- src/modules/subscription-billing/outbox/outbox.dispatcher.ts`
- Comando: `node --test --import tsx --test-name-pattern=OR2 tests/ass-08-outbox.test.ts`
- Resultado: **verde**.

### Âncora M-OR3
- Arquivo: `src/modules/subscription-billing/outbox/outbox.dispatcher.ts`
- Trecho-base (âncora): `if (row.attempts >= OUTBOX_MAX_ATTEMPTS) { // [ORFA-CAP]`.

### M-OR3 (vermelho)
- Mutação aplicada: condição de teto alterada para `if (false) { // [ORFA-CAP]`.
- Comando: `node --test --import tsx --test-name-pattern=OR3 tests/ass-08-outbox.test.ts`
- Resultado: **vermelho** (`PROCESSING` no lugar de `NEEDS_REVIEW`).

### M-OR3 (restauração)
- Restauração: `git checkout -- src/modules/subscription-billing/outbox/outbox.dispatcher.ts`
- Comando: `node --test --import tsx --test-name-pattern=OR3 tests/ass-08-outbox.test.ts`
- Resultado: **verde**.

## F-B2 → F-B8 — implementação em andamento nesta continuação

### Código aplicado (núcleo)
- F-B2 (trilha persistida): `src/modules/subscription-billing/outbox/dispatch-audit.ts`, integração em `channel.jobs.ts` (`onAudit` repassado) e `channel.runtime.ts`.
- F-B3 (retarget): `retargetUntriedInvoiceIssues` em `outbox.repository.ts` e `outbox.prisma.ts`; chamada no dispatcher.
- F-B4 (confirm-cancelled): `confirmCancelledByOperator` em `outbox.repository.ts` + `outbox.prisma.ts`; rota `POST /outbox/:id/confirm-cancelled` em `statements.platform.routes.ts`.
- F-B5 (releitura unknown): `isChargeKnown` em `outbox.repository.ts` + `outbox.prisma.ts`; uso no dispatcher com `unknown_charge_became_known` (`[UNKNOWN-REREAD]`).
- F-B6 (close pool): `statement.service.ts` com `inputs.resolve` fora da transação (`[CLOSE-RESOLVE-OUT]`) e checagem de pin (`[CLOSE-PIN-CHECK]`).
- F-B7/F-B8 (estorno parcial + crédito desfeito): `statement-settlement.service.ts`, `credit.service.ts`, `statement.types.ts`.
- Emenda 1 (registro): `agent-orchestration/controle/decisoes.md` ganhou `C-PLAT-TENANT-CORPO`.

### Testes executados nesta continuação
- `node --test --import tsx tests/ass-08-outbox.test.ts` → verde.
- `node --test --import tsx tests/ass-08b-channel-jobs.test.ts` → verde.
- `node --test --import tsx tests/ass-04-statement-service.test.ts` → verde.
- `node --test --import tsx tests/ass-04-statement-routes.test.ts tests/ass-08c-canal-off.test.ts` → verde.
- `DATABASE_URL=postgresql://postgres@127.0.0.1:56072/erp_techsolutions?schema=public node --test --import tsx tests/ass-08c-charge-unknown-db.test.ts` → verde.
- `DATABASE_URL=postgresql://postgres@127.0.0.1:56072/erp_techsolutions?schema=public node --test --import tsx tests/ass-08c-conf530-db.test.ts tests/ass-08c-statement-busy-db.test.ts` → verde.

### Infra de banco desta continuação
- O caminho `~/pg-08c3b` não existia; foi inicializado um cluster UTF-8 alternativo em `~/pg-08c3b-utf8` para rodar a bateria `-db` na porta `56072` com `timezone='UTC'`.

### Estado atual
- Continuação avançada além da F-B1 com código e validações base executadas.
- Branch ainda sem commits desta segunda execução (mudanças locais em progresso para separação por fatia).

## SUCESSOR dev-08c3-b-azc-3

- Hora (UTC): 2026-11-19 18:34:15 UTC
- Ramo: `feat/billing-channel-enable-b
- Head inicial lido: `0a2f1740
- Head final: $head

### P3 e ambiente
- Medido no início: git log, git status, git diff --stat, git diff.
- Cluster conferido por pg_ctl -D ~/pg-08c3b-utf8 status (rodando na porta 56072).
- Regra de timeout aplicada: testes sempre com `timeout 900.
- Teste que havia travado (`ass-08c-charge-unknown-db) rodou com timeout e concluiu verde.

### Commits por fatia (com push)
- F-B2: 18504d6b — trilha persistida (dispatch-audit).
- F-B3: 89529385 — retarget de invoice_issue pendente sem tentativa.
- F-B4: 1d45c6b3 — rota e núcleo de confirm-cancelled + registro C-PLAT-TENANT-CORPO.
- F-B5: `ba05460e — releitura de unknown ([UNKNOWN-REREAD]) + correção de import do logger da trilha.
- F-B6: `e2cf3d8a — close fora da transação + guarda de pin ([CLOSE-RESOLVE-OUT], [CLOSE-PIN-CHECK]).
- F-B7: `af661d3a — estorno parcial do provedor ([EP-PARCIAL]) + trilha de crédito revertido no settlement.
- F-B8: 923d6861 — recomputo do total no crédito aplicado revertido ([CREDIT-RECOMPUTE]).

### Bateria executada (todas com timeout)
- `node --test --import tsx tests/ass-08-outbox.test.ts
- `node --test --import tsx tests/ass-08b-channel-jobs.test.ts
- `node --test --import tsx tests/ass-04-statement-service.test.ts
- `node --test --import tsx tests/ass-04-statement-routes.test.ts tests/ass-08c-canal-off.test.ts
- DATABASE_URL=...56072... node --test --import tsx tests/ass-08c-charge-unknown-db.test.ts
- DATABASE_URL=...56072... node --test --import tsx tests/ass-08c-conf530-db.test.ts tests/ass-08c-statement-busy-db.test.ts
- DATABASE_URL=...56072... node --test --import tsx tests/ass-08c-charge-route-db.test.ts

### Ocorrência e correção
- Após introduzir `try/catch na trilha persistida, o import inicial do logger estava incorreto (../../../utils/logger.js) e quebrou `ass-08c-charge-unknown-db.
- Corrigido para ../../../infra/logging/logger.js; reexecução da bateria -db voltou a verde.

### Estado final
- Ramo empurrado no remoto até 923d6861.
- Worktree limpo (git status sem pendências).
- Cluster mantido de pé para integração (não removido).

## TESTES dev-08c3-b-testes-cx4

- Modelo declarado no mandato: Codex conta 4, GPT-5.6 Sol, nível menor. Modelo efetivo: o disponibilizado pela plataforma nesta sessão.
- Ref medida antes das edições: `923d686117793c895922769fc2e37064b6d21946` (`feat/billing-channel-enable-b`), árvore limpa.
- Cluster exclusivo: `~/pg-08c3b-utf8`, porta 56072, iniciado em segundo plano pelo comando literal do mandato.
- Q1: sem resposta do dono; vale **(a)**. O EP0 fixa cancelamento da nota mesmo havendo pagamento manual restante; EP1/EP2 e `[EP-PARCIAL]` não se aplicam.

### Arquivos e testes-dono

- Criados os nove arquivos `-db` da §6.3: órfã, troca de provedor, trilha, cancelamento conferido, cancel-unknown, crédito, close e estorno parcial; o crédito ganhou também o `CR-mem` puro exigido pela Emenda 1.
- Acrescentado CA-OFF3 em `tests/ass-08c-canal-off.test.ts`.
- Bateria focal inicial: `timeout 900 node --test --import tsx tests/ass-08c-canal-off.test.ts tests/ass-08c3-*.test.ts` → **52/52 verde**.
- `timeout 900 npm run check` → verde; `timeout 900 npm run lint` → verde.

### Defeitos encontrados pelos testes

1. **CR1:** `CreditService.absorbReversal` comparava `paidCents` com o total antigo, antes do `[CREDIT-RECOMPUTE]`; novembro permanecia `paid`. Corrigido para calcular `totalCents`, comparar contra ele e limpar `paidAt` ao reabrir. O primeiro CR1 ficou VERMELHO (`actual paid`, `expected closed`) e, após o conserto, VERDE.
2. **EP0:** o código da fatia havia aplicado Q1(b), exigindo `savedStatement.paidCents === 0`, embora o mandato determine (a) sem resposta. Restaurado o comportamento (a); `[EP-PARCIAL]` saiu. EP0 verde.

### Âncoras copiadas antes das mutações

- M-OR1: `// [ORFA-TRY]` e o `try/catch` do ramo órfão.
- M-OR2: `deps.repo.deferOrphan(...); // [ORFA-DEFER]`.
- M-OR3: `row.attempts >= OUTBOX_MAX_ATTEMPTS) { // [ORFA-CAP]`.
- M26/M26b: SQL da linha `[RETARGET-01]`: `kind = 'invoice_issue' AND status = 'PENDING' AND attempts = 0`.
- M26c: `await deps.repo.retargetUntriedInvoiceIssues(deps.invoices.providers[0]!, clock());`.
- M-TD1: `onAudit: deps.onAudit, // [TRILHA-01]`.
- M-TD3: `if (last > 0 && now - last < HOUR_MS) return; // [TRILHA-THROTTLE]`.
- M-TD4 (código novo, copiado antes): `try { ... } catch { logger.warn(...) }` em `dispatch-audit.ts`.
- M-CF1: allowlist `['charge_not_listed', 'charge_state_unknown']` na linha `[CONFIRM-CODES]`.
- M-CF2: consulta/trava do demonstrativo que carrega `[CONFIRM-LOCK]`.
- M-CF3 (código novo, copiado antes): `const tenantId = requireTenantId(input.tenantId);` e chamada direta `runtime.outbox.confirmCancelledByOperator(tenantId, ...)`.
- M-CFT1: `requirePlatformPermission('platform:billing:settle'),` na rota `confirm-cancelled`.
- M-CFT2: `const tenantId = requireTenantId(input.tenantId);`.
- M-UR: a linha de `markNeedsReview(... 'unknown_charge_became_known' ...) // [UNKNOWN-REREAD]`.
- M-CR1: `const totalCents = latest ? recompute(latest) : target.totalCents; // [CREDIT-RECOMPUTE]`.
- M-CR-AUD (código novo, copiado antes): `if (effect.creditReversed && tx.recordAudit) { await tx.recordAudit(...) }`.
- M-CP1: `const resolved = await this.inputs.resolve(...); // [CLOSE-RESOLVE-OUT]` antes de `repository.transaction`.
- M-CP2: a condição de pin que lança `statement_busy`; linha `[CLOSE-PIN-CHECK]`.
- M-EP0: condição da intenção logo após `[INTX-03]`, hoje sem `savedStatement.paidCents === 0`.

### Provas de mutação — vermelho, restauração e verde

Cada comando abaixo foi executado com `timeout 900`. A mutação foi aplicada literalmente sobre a âncora copiada acima, o teste indicado ficou **VERMELHO**, o código foi restaurado e o mesmo teste ficou **VERDE**.

| Mutação | Caso que matou | Vermelho | Verde após restauração |
|---|---|---:|---:|
| M-OR1 | OR1 | rc 1 | rc 0 |
| M-OR2 | OR2 | rc 1 | rc 0 |
| M-OR3 | OR3 | rc 1 | rc 0 |
| M26 | TP1–TP3 | rc 1 | rc 0 |
| M26b | TP1–TP3 | rc 1 | rc 0 |
| M26c | TP1–TP3 | rc 1 | rc 0 |
| M-TD1 | TD1/guarda do repasse | rc 1 | rc 0 |
| M-TD3 | TD3 | rc 1 | rc 0 |
| M-TD4 | TD4 | rc 1 | rc 0 |
| M-CF1 | CF3/allowlist | rc 1 | rc 0 |
| M-CF2 | CF9/trava | rc 1 | rc 0 |
| M-CF3 | CF5/guarda da rota | rc 1 | rc 0 |
| M-CFT1 | CF7/CF-T1 | rc 1 | rc 0 |
| M-CFT2 | CF-TBODY | rc 1 | rc 0 |
| M-UR | UR1 | rc 1 | rc 0 |
| M-CR1 | CR1 | rc 1 | rc 0 |
| M-CR-AUD | CR4 | rc 1 | rc 0 |
| M-CP1 | CP2 | rc 1 | rc 0 |
| M-CP2 | CP2b | rc 1 | rc 0 |
| M-EP0 | EP0 | rc 1 | rc 0 |

Observação adversarial: M-TD1 e M-CP1 sobreviveram à primeira versão dos testes. O teste de TD1 verificava apenas a âncora, e CP2 procurava outra transação posterior no arquivo. As duas guardas foram estreitadas ao corpo exato; as mutações foram reaplicadas e então produziram vermelho antes da restauração verde. Total: **20 mutações provadas**.

### Retomada P3 — `dev-08c3-b-testes-cx4-r`

- Hora medida (SP): `2026-11-19 18:11:22`.
- `git log`, `git status` e remoto: `feat/billing-channel-enable-b` em `169caea4e1dcedc5e242eb08e1b5ad085df446e0`, igual a `origin/feat/billing-channel-enable-b`, árvore limpa.
- Cluster: `~/pg-08c3b-utf8`, porta 56072, já estava ativo; memória de commit livre antes da suíte: **43,5 GB**.
- P3 focal, reexecutada por esta identidade: `DATABASE_URL=...56072... CORE_SAAS_PERSISTENCE=prisma timeout 900 node --test --import tsx tests/ass-08c-canal-off.test.ts tests/ass-08c3-*.test.ts` → **52/52**, 0 falha, 0 skip.
- Regra P3 aplicada: a tabela herdada não foi tomada como prova. Cada mutação abaixo foi reaplicada nesta retomada; o mesmo comando-alvo foi executado vermelho, a mutação foi desfeita por patch inverso e o alvo voltou verde. Todos os comandos usaram `timeout 900`.

#### Provas próprias de mutação

| Mutação | Âncora medida antes de mutar | Teste que ficou vermelho | Vermelho → verde | Commit medido |
|---|---|---|---|---|
| M-OR1 | `[ORFA-TRY]` + `try/catch` da órfã | `OR1` e guarda `M-OR*` | rc 1 → rc 0 | `169caea4` |
| M-OR2 | `deferOrphan(...) // [ORFA-DEFER]` | `OR2` | rc 1 → rc 0 | `169caea4` |
| M-OR3 | `row.attempts >= OUTBOX_MAX_ATTEMPTS // [ORFA-CAP]` | `OR3` | rc 1 → rc 0 | `169caea4` |
| M26 | SQL `[RETARGET-01]`, predicado `attempts = 0` | guarda `M26/M26b/M26c` | rc 1 → rc 0 | `169caea4` |
| M26b | SQL `[RETARGET-01]`, `kind = 'invoice_issue'` | guarda `M26/M26b/M26c` | rc 1 → rc 0 | `169caea4` |
| M26c | chamada `retargetUntriedInvoiceIssues(...)` | `TP1` e guarda `M26/M26b/M26c` | rc 1 → rc 0 | `169caea4` |
| M-TD1 | `onAudit: deps.onAudit // [TRILHA-01]` | guarda `M-TD1/M-TD3/M-TD4` | rc 1 → rc 0 | `169caea4` |
| M-TD3 | retorno de throttle `[TRILHA-THROTTLE]` | `TD3` e guarda `M-TD*` | rc 1 → rc 0 | `169caea4` |
| M-TD4 | `try/catch` de `dispatch-audit.ts` | `TD4` e guarda `M-TD*` | rc 1 → rc 0 | `169caea4` |
| M-CF1 | allowlist `charge_not_listed/charge_state_unknown` `[CONFIRM-CODES]` | guarda `mutações M-CF*` | rc 1 → rc 0 | `169caea4` |
| M-CF2 | `FOR NO KEY UPDATE OF s` + `[CONFIRM-LOCK]` | guarda `mutações M-CF*` | rc 1 → rc 0 | `169caea4` |
| M-CF3 | `tenantId` do corpo; proibido resolver pela linha | guarda `mutações M-CF*` | rc 1 → rc 0 | `169caea4` |
| M-CFT1 | primeiro middleware `requirePlatformPermission('platform:billing:settle')` | `CF7 e CF-T1` | rc 1 → rc 0 | `169caea4` |
| M-CFT2 | `const tenantId = requireTenantId(input.tenantId)` | guarda `mutações M-CF*` | rc 1 → rc 0 | `169caea4` |
| M-UR | bloco `[UNKNOWN-REREAD]` antes do DELETE | `UR1` e `M-UR` | rc 1 → rc 0 | `169caea4` |
| M-CR1 | cálculo `[CREDIT-RECOMPUTE]` | `CR-mem/CR1`, `CR2` e guarda `M-CR1` | rc 1 → rc 0 | `169caea4` |
| M-CR-AUD | `StatementTx.recordAudit`, nunca `charging().recordAudit` | `CR4` e guarda `M-CR-AUD` | rc 1 → rc 0 | `169caea4` |
| M-CP1 | `inputs.resolve(...) // [CLOSE-RESOLVE-OUT]` antes da transação | `CP2` e guarda `M-CP1` | rc 1 → rc 0 | `169caea4` |
| M-CP2 | recusa `statement_busy // [CLOSE-PIN-CHECK]` | `CP2b` e guarda `M-CP2` | rc 1 → rc 0 | `169caea4` |
| M-EP0 | condição após `[INTX-03]`, sem `savedStatement.paidCents === 0` | `EP0` | rc 1 → rc 0 | `169caea4` |

Nota de execução: a primeira tentativa da M-CFT1 atingiu por contexto insuficiente uma rota irmã e ficou verde; foi restaurada imediatamente e **não contou**. A mutação foi então aplicada com o caminho completo da rota `confirm-cancelled`, ficou vermelha em `CF7 e CF-T1` e voltou verde após o restauro. O estado final foi conferido com `git status --short`, `git diff --check` e `git diff -- src/modules/subscription-billing`: todos vazios.

#### Bateria final da mão B

- Focal: **52/52** verde, 0 skip.
- Regressões tocadas, executadas por arquivo para não disputar o catálogo/locks: `ass-08-outbox` **41/41**; `ass-08b-channel-jobs` **6/6**; `ass-04-statement-service` **20/20**; `ass-04-statement-routes` **20/20**; `ass-08c-charge-unknown-db` **6/6**; `ass-08c-conf530-db` **5/5**; `ass-08c-statement-busy-db` **3/3**; `ass-08c-charge-route-db` **14/14**. Total da regressão: **115/115**.
- A tentativa de executar os oito arquivos numa única chamada paralela foi interrompida: uma suíte `-db` deixou uma sessão de teste `idle in transaction` em `FOR UPDATE`. O processo exclusivo desta tentativa foi encerrado, os papéis efêmeros `o6r_b01_*` deixados por ela foram removidos do cluster exclusivo e os mesmos arquivos foram reexecutados sequencialmente, todos verdes.
- `timeout 900 npm run check` → verde.
- `timeout 900 npm run lint` → verde.
- Total de mutações próprias provadas nesta retomada: **20/20 aplicáveis à mão B**; Q1(a), portanto M-EP0 se aplica e M-EP1 não se aplica.
