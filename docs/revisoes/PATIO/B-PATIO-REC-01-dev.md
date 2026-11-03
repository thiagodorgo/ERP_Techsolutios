# B-PATIO-REC-01 — diário do dev

- **Autor:** `dev-rec01-opus`, Claude Opus 5.5, nível menor **DECLARADO**. Cobre a conta 1 do Codex (limite), por ordem do dono.
  Não escreveu o plano. **Verificador:** Codex (outro modelo, `D-UM-FAZ-OUTRO-VERIFICA`); depois, junta completa.
- **Plano:** v3 §9.1 + emenda 1 §3.1, §6.2.2, §8.2.5, §10.1 (fora do repositório, `erp-pausa-2026-10-03/planos/`).
- **Terreno:** worktree `C:/Users/thiag/w-rec01`, `npm ci` próprio (sem junction), Postgres descartável `rec01-pg` (`postgres:16`,
  `127.0.0.1:55467`, usuário `postgres` como no CI). Nunca `erp-*`, nunca 5432/3000/5173/6379.
- **Ambientes (v3 §9.0):** `[SB]` = `env -u DATABASE_URL -u RBAC_DB_PARITY node --test --import tsx …`; `[UF]` =
  `DATABASE_URL=postgresql://x:x@127.0.0.1:1/x`; `[DB]` = `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55467/postgres`;
  `[DBP]` = `[DB]` + `npm run db:seed` + `RBAC_DB_PARITY=1`.
- **Saídas TAP completas:** `C:/Users/thiag/erp-pausa-2026-10-03/rec01/` (fora do repositório).

## RETOMADA 0 — F0 (baselines), ref `origin/main` = `ceb62a07`

| comando | saída |
|---|---|
| `[SB] tests/release.test.ts tests/release-for-repair.test.ts tests/core-saas.test.ts tests/charging-daily-engine.test.ts` | `# tests 63 # pass 63 # fail 0 # skipped 0` (bate com a v3: 63) |
| `[UF] tests/core-saas-role-authority.test.ts` | `# pass 12 # fail 0 # skipped 0` (bate: 12) |
| `[DB] tests/release-gate-concurrency.test.ts tests/san3-05-leituras-de-plataforma-db.test.ts` | `# tests 16 # pass 16 # fail 0 # skipped 0` = 3 + **`N_san3` = 13** (12 subtestes T10–T12 + o teste-pai) |
| `npm run db:seed` + `[DBP] tests/permission-catalog-db-parity.test.ts` | `# pass 2 # fail 0 # skipped 0` (bate: 2) |

Leitura: as quatro baselines batem com a v3 §9.1 F0. `N_san3` fica fixado em **13**. N do bloco = 63 + 12 + 3 + 2 + 13 = **93**.

## RETOMADA 1 — F1 (tipos, máquina de estados como dados, validadores, repositório em memória; emenda §3.1)

- **Entrega:** `src/modules/impound-payments/impound-payment.{types,state-machine,validators,repository,service}.ts`. A máquina é
  a tabela `INTENT_TRANSITIONS` (estados da v3 §4.2, linhas das §4.4/§4.5, com gatilho, motivo e pergunta do dono). `IntentAccount`
  tem só `organization` e `group` (com `groupId`, emenda §6.2.3); `assertIntentAccount` recusa o resto com `account_not_allowed`.
- **Leitura minha, declarada (§A6):** a emenda põe o T-DOM-27 na F1 contra o `create` do serviço. Por isso o `create` (regras
  (a)-(h) da v3 §5.2) nasce já na F1, sobre portas injetadas; a F2 acrescenta o `getSettleableDueCents` do charging, a fiação de
  produção e os testes das regras (T-DOM-7..12, 24, 25, T-ISO-1).
- **V (V2, o módulo nasce na fatia)** — commit `test(…)` com o módulo ausente:
  `[SB] tests/rec-01-state-machine.test.ts tests/rec-01-validators.test.ts` → `ERR_MODULE_NOT_FOUND` nos 2 arquivos, `# tests 2 # pass 0`.
  Como é V2, as mutações abaixo são o vermelho de controle.
- **M** (âncora = 1, restauro por edição inversa com hash igual, `git status --porcelain` vazio depois de cada uma):

| # | arquivo · troca | resultado |
|---|---|---|
| F1-M1 | `impound-payment.state-machine.ts` · apagar a linha `funds_held → reversed` (E5) | `not ok 2 - T-MAQ-saidas-2` com `'funds_held sem saída incondicional'`; `# pass 9 # fail 1` |
| F1-M2 | `impound-payment.types.ts` · `PAYABLE_CHARGE_KINDS` + `"AGENCY_FEE"` | `not ok 9 - T-DOM-6` (deep-equal); `# pass 9 # fail 1` |
| F1-M3 (emenda) | `impound-payment.service.ts` · apagar `    assertIntentAccount(account);` | `not ok 10 - T-DOM-27`: `expected account_not_allowed, got created pending`; `# pass 9 # fail 1` |
| F1-M4 (emenda) | `impound-payment.validators.ts` · aceitar `record.scope === "platform"` | `not ok 10 - T-DOM-27`: `expected account_not_allowed, got created pending`; `# pass 9 # fail 1` |

- **C:** `[SB] tests/rec-01-state-machine.test.ts tests/rec-01-validators.test.ts` → `# tests 10 # pass 10 # fail 0 # skipped 0`
  (emenda §3.1: 10). `npx tsc --noEmit` → limpo.

## RETOMADA 2 — F2 (`getSettleableDueCents`, regras de criação, R-ISO T-ISO-1)

- **Entrega:** `ChargeService.getSettleableDueCents` (método novo, só leitura; `git diff origin/main -- src/modules/charging | grep -c "^-[^-]"` → 0);
  fiação de memória do serviço (`createMemoryImpoundPaymentService`, portas fail-closed por padrão); testes T-DOM-7..12, 12b (nada
  devido), 12c (caminho feliz em memória: `pending`, valor devido, referência `open`, fila `patio:<id>` sem `split`), T-DOM-24, T-DOM-25
  e o canário T-ISO-1 (emenda §10).
- **V (V1)** — commit `test(…)` com `getSettleableDueCents` devolvendo `getPublicSummary().totalDueCents`:
  `[SB] tests/rec-01-intent-service.test.ts tests/charging-daily-engine.test.ts` → `not ok 28 - T-DOM-24` com `expected 35000, got 38000`
  (o texto da v3) e `not ok 29 - T-DOM-25`; `# tests 30 # pass 28 # fail 2 # skipped 0`.
- **M** (âncora = 1, restauro com hash igual, `git status --porcelain` vazio):

| # | arquivo · troca | resultado |
|---|---|---|
| F2-M1 | `charge.service.ts` · apagar `if (overAccrued.has(line.id)) continue;` | `not ok 28 - T-DOM-24`: `expected 35000, got 38000`; `# pass 29 # fail 1` |
| F2-M2 | `impound-payment.service.ts` · apagar a checagem `reconciliation_pending` | `not ok 29 - T-DOM-25`; `# pass 29 # fail 1` |
| F2-M3 | `impound-payment.types.ts` · `LIVE_INTENT_STATUSES` sem `"funds_held"` | `not ok 24 - T-DOM-11` (`expected 'held_funds_pending'`); `# pass 29 # fail 1` |
| F2-M4 (emenda §10) | `impound-payment.service.ts` · apagar `assertRowsBelongToTenant(siblings, …)` | `not ok 30 - T-ISO-1`: `create leu a irmã de B`; `# pass 29 # fail 1` |
| F2-M5 (emenda §10) | `impound-payment.service.ts` · apagar `assertRowsBelongToTenant(intents, …)` | `not ok 30 - T-ISO-1`: `list devolveu a linha de B`; `# pass 29 # fail 1` |

  O serviço tem 2 chamadas do canário (irmãs na criação; leitura); a mutação da emenda ("apagar o `assertRowsBelongToTenant`") foi
  aplicada a cada uma, com âncora única, e as duas mordem.
- **C:** `[SB] tests/rec-01-intent-service.test.ts tests/charging-daily-engine.test.ts` → `# tests 30 # pass 30 # fail 0 # skipped 0`
  = 11 + 19 (emenda §10: 11). `npx tsc --noEmit` → limpo.

## RETOMADA 3 — F3 (rotas, `charging:online_payment`, allowlist do DTO, snapshot do catálogo; emenda §3.1 F3)

- **Entrega:** `impound-payment.{dto,controller,routes}.ts` + `index.ts`; montagem em `src/app.ts` depois do release; permissão
  `charging:online_payment` no `PERMISSION_CATALOG` e no `manager` (o `tenant_admin` herda, `super_admin`/`platform_admin` têm o
  catálogo inteiro) — a mesma distribuição de `charging:settle`; `tests/core-saas.test.ts` (catálogo esperado + distribuição) e o
  snapshot `tests/fixtures/role-catalog-contract.snapshot.json` (+1 nos 4 papéis que têm `charging:settle`). O DTO é allowlist campo a
  campo: `accountScope ∈ {group, organization}`, documento mascarado, nenhum id de organização, conexão, grupo ou externo.
  O canário de organização vira 500 genérico no controller (nunca a linha alheia).
- **V (V1)** — commit `test(…)` com as rotas ainda sem montagem e sem a permissão no catálogo:
  `[SB] tests/rec-01-routes-permissions.test.ts tests/core-saas.test.ts` → `not ok 31 - T-DOM-17` com
  `expected 422 channel_disabled, got 404` (o texto da v3) e os outros 5 do arquivo vermelhos (403/404); `# tests 32 # pass 26 # fail 6`.
- **M** (âncora = 1, restauro com hash igual, `git status --porcelain` vazio):

| # | arquivo · troca | resultado |
|---|---|---|
| F3-M1 | `catalog.ts` · dar `charging:online_payment` ao `operator` | `[SB]`: `not ok 28 - T-DOM-14` (`operator: online_payment ≠ settle`), `not ok 27 - T-DOM-13`, `not ok 4` do core-saas; `[UF]`: `not ok 3 - contrato do consumidor de deploy: snapshot` |
| F3-M2 | `impound-payment.dto.ts` · `payerDocument: intent.payerDocument` (cru) | `not ok 30 - T-DOM-16` (o CPF aparece na resposta); `# pass 31 # fail 1` |
| F3-M3 (emenda) | `impound-payment.dto.ts` · devolver `groupConnectionId` | `not ok 30 - T-DOM-16`; `# pass 31 # fail 1` |

  Nota de terreno: a primeira execução da F3-M1 usou o `cmd.exe` (o `;` do comando composto não separa comandos ali) e não produziu
  TAP; o executor de mutação passou a usar `bash -c` e a F3-M1 foi re-executada, com o resultado acima. As mutações da F1 e da F2
  eram de comando único e não foram afetadas (as saídas registradas são TAP reais).
- **C:** `[SB] tests/rec-01-routes-permissions.test.ts tests/core-saas.test.ts` → `# tests 32 # pass 32 # fail 0 # skipped 0` (6 + 26) ·
  `[UF] tests/core-saas-role-authority.test.ts` → `# pass 12 # fail 0 # skipped 0`. `npx tsc --noEmit` → limpo.
- **Pendente de propósito até a F5:** `tests/permission-catalog-migration-parity.test.ts` (roda no `npm test`) exige migração de dados
  para toda chave nova do catálogo; a M-REC-7a é da F5 pelo plano. Entre a F3 e a F5, o `npm test` desse arquivo fica vermelho por
  desenho do plano.

## RETOMADA 4 — F4 (`schema.prisma`, M-REC-1, M-REC-2, repositório Prisma; emenda §3.1 F4, §6.2.2, §8.2.5, §10.1)

- **Entrega:** modelos `ImpoundPaymentIntent` e `ImpoundPaymentRef`; `prisma/migrations/20260890000000_impound_payment_intents`
  (M-REC-1) e `20260891000000_impound_payment_refs` (M-REC-2), ambas com `BEGIN;`/`COMMIT;`, só `CREATE`, nada destrutivo no `up`;
  `impound-payment-prisma.repository.ts` (`tenant_id` explícito em toda consulta, trava `FOR UPDATE` do processo, criação inteira
  num `tx` de `withTenantRls`, fila do pátio falha FECHADA até o REC-02a); fiação Prisma do serviço.
  - M-REC-1: CHECKs de status, motivo de cancelamento, dinheiro ≥ 0, **identidade** `paid_cents = applied_cents + held_cents +
    refunded_cents`, `held > 0 ⇔ held_reason`, domínio do motivo, dinheiro por estado (abertos, retidos, revertido, quitado), meios,
    **`impound_payment_intents_one_connection_chk`** (`num_nonnulls(...) = 1`), **`impound_payment_intents_group_pair_chk`** (emenda
    §6.2.2), coluna **gerada** `account_scope` (emenda §8.2.5), UNIQUE parcial do link aberto `impound_payment_intents_live_link_key`
    só em `pending`/`cancel_requested`, FKs para `tenants` e `impound_processes`, RLS ENABLE + FORCE + política do GUC.
  - M-REC-2: tabela global (exceção declarada, sem RLS), as duas colunas de conexão + o grupo, os mesmos CHECKs de conta e
    `refund_requested_at`.
  - **Leitura minha, declarada (§A6):** as colunas de dinheiro têm os nomes do plano (`*_cents`, v3 §4.1, e as âncoras literais das
    mutações) e o tipo do plano (`DECIMAL(12,2)` = reais, v3 §7); a app converte para centavos inteiros de forma exata
    (`moneyStringToCents`/`centsToMoneyString`, T-DOM-5). O nome e o tipo vêm os dois do plano; não troquei nenhum.
  - **Drift do Prisma medido (o K12 do `cheque-title-link-migration-drill-db`):** `prisma migrate diff --from-config-datasource
    --to-schema` na base migrada dá **72 sentenças, as mesmas 72 da fixture** (0 a mais, 0 a menos). A coluna gerada entra no
    schema como `@default(dbgenerated("…"))` com a expressão exata que o Postgres devolve; CHECKs e UNIQUE parcial são raw-only.
- **V (V1)** — commit `test(…)` com a M-REC-1 sem a identidade, sem `one_connection` e sem `group_pair`, a M-REC-2 sem os dois CHECKs
  de conta, e `listByProcess` sem `tenant_id` (base nova `rec01v`): `[DB] tests/rec-01-domain-db.test.ts` →
  `not ok 4 - T-DOM-db-5`: `expected 23514 impound_payment_intents_money_identity_chk, got insert ok` (o texto da v3);
  `not ok 5 - T-DOM-db-7`: `as duas conexões nulas: expected 23514 …one_connection_chk, got insert ok` (o da emenda);
  `not ok 6 - T-ISO-db-1`: `listByProcess trouxe a cobrança de B para A`; `# tests 6 # pass 3 # fail 3 # skipped 0`.
  Nota: no T-ISO-db-1 o 404 vem da checagem de existência do processo (filtrada por organização) e se manteve; o vermelho apareceu
  na asserção "a lista só traz A", que é a mesma propriedade.
- **Ajuste antes das mutações (commit `refactor`):** a restrição que era a última da lista foi movida, para que "apagar a linha" de
  qualquer restrição mutada deixe SQL válido (senão a mutação daria erro de sintaxe, não vermelho de negócio).
- **M** — cada mutação de migração roda numa base NOVA (`rec01m`, recriada por `f4run.sh`), migra e executa
  `[DB] rec-01-domain-db` + `[SB] rec-01-live-link-guard`; restauro com hash igual, `git status --porcelain` vazio:

| # | troca | resultado |
|---|---|---|
| F4-M1 | M-REC-1 · apagar a linha da identidade | `not ok 4 - T-DOM-db-5`: `expected 23514 …money_identity_chk, got insert ok` |
| F4-M2 | M-REC-1 · UNIQUE parcial só `('pending')` | `not ok 1 - T-DOM-db-1` (`pending com irmã em cancel_requested: … got insert ok`) e `not ok 1 - T-DOM-26` |
| F4-M3 | M-REC-1 · UNIQUE com `'funds_held', 'disputed'` | `not ok 2 - T-DOM-db-6` (a transição bate na UNIQUE) e `not ok 1 - T-DOM-26` |
| F4-M4 | M-REC-1 · apagar `FORCE ROW LEVEL SECURITY` | `not ok 3 - T-DOM-db-2` (catálogo `relforcerowsecurity`) |
| F4-M5 (emenda) | M-REC-1 · apagar a linha `one_connection_chk` | `not ok 5 - T-DOM-db-7`: `as duas conexões nulas: … got insert ok` |
| F4-M6 (emenda) | M-REC-1 · `= 1` → `>= 1` | `not ok 5 - T-DOM-db-7`: `as duas conexões preenchidas: … got insert ok` |
| F4-M7 (emenda §6.4) | M-REC-1 · apagar a linha `group_pair_chk` | `not ok 5 - T-DOM-db-7`: `grupo sem conexão de grupo: … got insert ok` |
| F4-M8 (emenda §10) | repositório · `listByProcess` sem `tenant_id` | `not ok 6 - T-ISO-db-1` (`listByProcess trouxe a cobrança de B para A`) |

  Sobre a F4-M4: o papel efêmero não é dono da tabela, e a política vale para ele com ou sem FORCE; o FORCE só muda o dono. Por isso
  o T-DOM-db-2 afirma também o catálogo (`relrowsecurity`, `relforcerowsecurity`, a política) além do comportamento (B vê 0, recebe
  404, e a escrita com o `tenant_id` de A dá 42501).
- **C:** `[DB] tests/rec-01-domain-db.test.ts` → `# tests 6 # pass 6 # fail 0 # skipped 0` (emenda §10: 6) ·
  `[SB] tests/rec-01-live-link-guard.test.ts` → `# pass 1 # fail 0 # skipped 0`. `npx tsc --noEmit` → limpo.

## RETOMADA 4b — o corpo só é lido depois do canal e da conta (commit `fix`, F4)

Medido com o gerador do censo (`node --import tsx tests/helpers/o6r07c-census.ts gravar <saída>`): com o corpo lido ANTES do portão,
o censo classificava `POST …/online-payment` como `LOTE` (a resposta mudava com o corpo mesmo com o canal desligado). O `create` passou
a ler o corpo só depois de (a) canal e (b) conta: com o canal desligado, a resposta é a mesma para qualquer corpo, e o censo passa a
classificar a rota como `SEM-ALCANCE-CAMPO`, igual a `release/approve`. Os 28 testes `[SB]` do bloco seguem verdes.

## PAUSA 2026-11-03T15:05Z — a F4 exige tocar fora do PERMITIDO (o plano não nomeia estes guardas)

- **Head:** `2c268dc5` (empurrado). Ramo `feat/patio-rec-01-dominio`. Sem PR aberto.
- **Feito:** F0, F1, F2, F3 e F4 com V, M e C registrados acima; todas as mutações mordem; árvore limpa.
- **CI do head `2c268dc5`** (run `41642206617`):
  - `backend-postgres` (job `125938740831`): `# tests 493 # pass 492 # fail 1 # skipped 0` — só `not ok 269 - permissão acrescentada
    ao catálogo chega ao banco por migração (fronteira)`, que a F5 fecha (M-REC-7a). **No escopo.**
  - `backend` (job `125938740723`): `# tests 4298 # pass 4286 # fail 10 # skipped 2`. Os 10:
    - **no escopo, fecham na F5:** `not ok 2047 - A1` e `not ok 2071 - A16` do `migration-transaction-guard` (G6: falta o drill que cita
      as migrações novas; é a `tests/rec-01-migration-drill-db.test.ts` da F5) e `not ok 2800` (paridade de migração, M-REC-7a);
    - **FORA do PERMITIDO do §9.1 e da emenda:**
      1. `tests/fixtures/o6r07c-classificacao-vias.json` — `not ok 2682 - T1`, `2685 - T4`, `2695 - T14` do `o6r07c-census-guard`: as 3 rotas
         novas não estão no instantâneo. O instantâneo é GERADO (`node --import tsx tests/helpers/o6r07c-census.ts gravar
         tests/fixtures/o6r07c-classificacao-vias.json`); o diff medido é: `GET …/online-payment` e `GET …/online-payments` → `LEITURA`,
         `POST …/online-payment` → `SEM-ALCANCE-CAMPO`, e as contagens `MIDDLEWARE /api/v1 · (anônima)` 114→116,
         `MIDDLEWARE /api/v1 · tenantContextMiddleware` 56→57, `ROTEADOR /api/v1` 59→60; 474 chaves, 0 violações.
      2. `tests/san3-05-acessos-de-plataforma-guard.test.ts` (linha 287) — `not ok 33 - L0 exato` (e o pai `not ok 3041 - T13`): o literal
         `tabelas ENABLE=112 FORCE=112 · acessores Prisma em FORCE=112` passa a 113 com `impound_payment_intents` (FORCE). O inventário
         de acessos NÃO mudou: o repositório só é construído no callback de `withTenantRls`, e nenhuma chave nova nasceu (as outras 32
         subtestes do T13 passam).
      3. `tests/san3-05-runtime-role-guard-db.test.ts:1016` — `not ok 8 - T14a/b` (e o pai `not ok 3055`): o inventário de DML do papel de
         runtime passa de `119` a `121` (as duas tabelas novas). Saída medida no CI: `…|f|f|f|f|0|0|121`.
  - Os três são guardas de inventário cuja atualização é "o ato consciente" que eles exigem (precedente: emenda v2.2 de escopo do
    B-TRC-02, que fez as mesmas três edições para `vehicle_telemetry_events`). Nenhum é defeito do bloco; o plano só não os pôs no
    PERMITIDO.
- **Falta:** F5 (M-REC-7a, drill M-REC-1/2/7a, paridade, as 2 suítes `-db` em `SUITES` do CI medidas 3×) e F6 (docs, `RBAC_MATRIX.md`,
  bateria final, PR), depois da emenda de escopo.
- **Pedido ao orquestrador (emenda antes do código):** autorizar no PERMITIDO do REC-01 as três edições acima, nesta forma exata:
  (1) o instantâneo regenerado pelo gerador, com o diff acima e nada mais; (2) `112` → `113` nas três posições do literal da linha 287;
  (3) `119` → `121` na linha 1016. Se a emenda vier, a F5 segue sem mudança.
- **Próximo comando ao retomar:** `cd C:/Users/thiag/w-rec01 && git fetch -q origin && git status --porcelain` (vazio) e, com a emenda,
  aplicar as três edições num commit `test(…)` próprio; depois a F5.
- **Arquivos meio-escritos:** nenhum. **Vivos:** o container `rec01-pg` (`127.0.0.1:55467`, bases `postgres`, `rec01c`, `rec01v`,
  `rec01m`, `rec01g`), mantido para a retomada; o worktree `C:/Users/thiag/w-rec01`.

## RETOMADA 5 — emenda 1 §11 (orquestrador): unidade do dinheiro (11.1) e as três guardas (11.2)

**11.1 — colunas `*_amount` em reais.** A emenda §11.1 substitui a minha leitura da RETOMADA 4: as colunas de dinheiro da M-REC-1 passam a
`amount`, `paid_amount`, `applied_amount`, `held_amount`, `refunded_amount` (`DECIMAL(12,2)`, reais, como `process_charges.total_amount`); o
TypeScript segue em centavos (`*Cents`) e a conversão é só no repositório Prisma, por `moneyToCents`/`centsToMoney` de
`src/modules/charging/charge.validators.ts`. Os conversores duplicados que eu tinha em `impound-payment.validators.ts` saíram, e o T-DOM-5
passou a provar a ida e volta exata desses dois (a contagem do arquivo não muda: 7). A M-REC-1 foi corrigida em commit novo (nada
mergeado; sem migração nova, sem rebase).
- **Drift do Prisma remedido** numa base nova (`rec01d`): 72 sentenças, as mesmas 72 da fixture K12 (0 a mais, 0 a menos).
- **T-DOM-db-8 (novo):** `paid_amount = 123.45` → `findById` devolve `paidCents = 12345`; o repositório grava `amountCents = 12345` como
  `123.45`. **V1** (commit `test(…)` com `paidCents: Number(row.paid_amount.toFixed(2))`): `not ok 6 - T-DOM-db-8`, `expected 12345, got 123.45`;
  `# tests 7 # pass 6 # fail 1`.
- **M da F4 refeitas com as âncoras novas** (base nova por mutação; âncora = 1; hash igual no restauro; `git status --porcelain` vazio):

| # | troca | resultado |
|---|---|---|
| F4-M1 | apagar `CHECK (paid_amount = applied_amount + held_amount + refunded_amount)` | `not ok 4 - T-DOM-db-5`: `expected 23514 …money_identity_chk, got insert ok` |
| F4-M2 | UNIQUE só `('pending')` | `not ok 1 - T-DOM-db-1` e `not ok 1 - T-DOM-26` |
| F4-M3 | UNIQUE com `'funds_held', 'disputed'` | `not ok 2 - T-DOM-db-6` e `not ok 1 - T-DOM-26` |
| F4-M4 | apagar `FORCE ROW LEVEL SECURITY` | `not ok 3 - T-DOM-db-2` |
| F4-M5 | apagar `one_connection_chk` | `not ok 5 - T-DOM-db-7`: `as duas conexões nulas: … got insert ok` |
| F4-M6 | `= 1` → `>= 1` | `not ok 5 - T-DOM-db-7`: `as duas conexões preenchidas: … got insert ok` |
| F4-M7 | apagar `group_pair_chk` | `not ok 5 - T-DOM-db-7`: `grupo sem conexão de grupo: … got insert ok` |
| F4-M8 | `listByProcess` sem `tenant_id` | `not ok 7 - T-ISO-db-1` |
| F4-M9 (§11.1) | `paidCents: Number(row.paid_amount.toFixed(2))` (sem `moneyToCents`) | `not ok 6 - T-DOM-db-8`: `expected 12345, got 123.45` |

- **C:** `[DB] tests/rec-01-domain-db.test.ts` → `# tests 7 # pass 7 # fail 0 # skipped 0` · `[SB] tests/rec-01-live-link-guard.test.ts` →
  `# pass 1` · `[SB] tests/rec-01-validators.test.ts` → `# pass 7`.

**11.2 — as três guardas, só as edições autorizadas** (commit `1630c27f`):
1. `tests/fixtures/o6r07c-classificacao-vias.json`, **regenerado** por `node --import tsx tests/helpers/o6r07c-census.ts gravar
   tests/fixtures/o6r07c-classificacao-vias.json` (474 chaves, 0 violações). Diff = o esperado e nada mais: `+ ROTA GET …/online-payment`
   e `+ ROTA GET …/online-payments` (`LEITURA`), `+ ROTA POST …/online-payment` (`SEM-ALCANCE-CAMPO`), `MIDDLEWARE /api/v1 · (anônima)`
   114→116, `MIDDLEWARE /api/v1 · tenantContextMiddleware` 56→57, `ROTEADOR /api/v1` 59→60 (15 inserções, 3 remoções).
2. `tests/san3-05-acessos-de-plataforma-guard.test.ts:287`: `ENABLE=112 FORCE=112 · acessores Prisma em FORCE=112` → `113` (só a
   constante). Prova de que nenhuma chave entrou no inventário: as outras subtestes do T13 (congelado com motivo por chave, formas,
   'sumida') passaram com o head do bloco antes da edição; depois dela, o arquivo inteiro passa.
3. `tests/san3-05-runtime-role-guard-db.test.ts:1016`: `…|0|0|119` → `…|0|0|121` (medido no CI do head `2c268dc5`: `…|f|f|f|f|0|0|121`).
- **C:** `[SB] tests/san3-05-acessos-de-plataforma-guard.test.ts tests/o6r07c-census-guard.test.ts` → `# tests 67 # pass 67 # fail 0 # skipped 0`.
  O `san3-05-runtime-role-guard-db` exige Linux (`setsid`); a prova dele é o job `backend` do CI.

## RETOMADA 6 — F5 (M-REC-7a, drill das M-REC-1/2/7a, paridade, CI)

- **Entrega:** `prisma/migrations/20260892000000_grant_charging_online_payment` (M-REC-7a: `INSERT … ON CONFLICT DO NOTHING` da chave e
  da concessão a `super_admin`, `tenant_admin` e `manager`, a mesma distribuição de `charging:settle` no banco; `BEGIN;`/`COMMIT;`;
  runbook `-- ROLLBACK` no rodapé); `tests/rec-01-migration-drill-db.test.ts` (base própria, deploy real em processo filho; (a) as 3
  aplicadas, concessão só a quem dá baixa, 7a idempotente; (b) down em transação única, re-up, e a M-REC-1 com sentença final quebrada
  falha inteira); as 2 suítes `-db` do bloco na lista `SUITES` do job `backend-postgres` (`.github/workflows/ci.yml`).
- **V (V1)** — commit `test(…)` com o drill e sem a M-REC-7a (base nova `rec01f`): `not ok 4 - (a)` (`…grant_charging_online_payment
  existe`), `not ok 5 - (b)` e `not ok 2 - permissão acrescentada ao catálogo chega ao banco por migração` (`Permissão nova no catálogo e
  SEM migração de dados: charging:online_payment`); `# tests 5 # pass 2 # fail 3`.
  **Declarado:** o `[DBP]` da paridade **não** fica vermelho sem a migração: o `npm run db:seed` provisiona o catálogo inteiro, e a
  paridade catálogo × banco é verde por construção (é a tautologia que o cabeçalho de `permission-catalog-migration-parity.test.ts`
  descreve). O vermelho de controle que mede a falta da migração é o guard estático de paridade de migração e o drill.
- **M:** F5-M1 · M-REC-7a · tirar `ON CONFLICT (key) DO NOTHING` → `not ok 1 - (a)` com `Code: 23505 … "permissions_key_key"` (o 2º up);
  restauro com hash igual, `git status --porcelain` vazio.
- **C:** `[DB] tests/rec-01-migration-drill-db.test.ts tests/rec-01-domain-db.test.ts` → `# tests 9 # pass 9 # fail 0 # skipped 0` nas
  **3 execuções** (denominador constante, condição para entrar na lista curada) · `[SB] tests/permission-catalog-migration-parity.test.ts`
  → `# pass 3 # fail 0` · `npm run db:seed` + `[DBP]` → `# tests 2 # pass 2 # fail 0 # skipped 0` ·
  `node scripts/migration-transaction-guard.mjs` → `migrações: 120 · anteriores: 112 · novas: 8 · violações: 0`.
