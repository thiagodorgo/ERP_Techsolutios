# B-SAN3-07 — o seed base cria os 12 papéis de sistema, e a organização demonstração tem nome de negócio, provado no banco (item 47)

- **Ramo:** `fix/seed-papeis-legados` (o plano chamava `fix/seed-demo-nome-de-negocio`; vale o ramo do mandato do orquestrador).
- **Papel desta execução:** DEV; não planeja, não critica e não vota.
- **Executor:** Claude Opus 5.5 `dev-san3-07-cl`, subagente da sessão (nível menor, declarado). Cobre o Codex, com exceção
  declarada: o Codex 1 está sem cota semanal até 16/11 e o Codex 2 está ocupado.
- **Verificador:** de outra casa (Codex 2, ou a API, que o dono manda tratar como modelo diferente). Sem crédito, vale o
  §C7 item 11(2), e o artefato do verificador declara que não houve cruzamento (emenda 1, item 8).
- **Nível:** junta completa (§C7 item 10(1)): o bloco muda permissão. Unanimidade de 3 + `coordenador-de-acessos`
  (`PLANO_SAN3.md`, linha do `B-SAN3-07`, achado C1-A5).
- **Plano:** `C:/Users/thiag/erp-pausa-2026-10-03/planos/plano-B-SAN3-07.md` (autor `plano-B-SAN3-07-api`, Claude Opus 5.5
  pela API), com a **Emenda 1** no fim, que prevalece. Crítica: `revisoes/crit-07-plano.json` (`crit-07-cl`, APROVADO COM
  AJUSTES).
- **Relatório do dev:** `docs/revisoes/SAN3/B-SAN3-07-dev.md`.

## Propriedades

- **P1:** depois de `migrate deploy` + `db:seed` numa base nova, os papéis globais (`roles.tenant_id IS NULL`) são
  exatamente `DEFAULT_ROLES` menos `platform_admin` (12), com as concessões de `ROLE_PERMISSIONS`, nas duas direções.
- **P2:** `platform_admin` não tem linha global.
- **P3:** a organização que o seed cria (`slug = 'demo'`) tem nome sem o termo técnico.
- **P4:** rodar o seed de novo não duplica papel nem perde concessão.

## Superfície real da mudança de permissão (emenda 1, item 3)

Ganham os 5 papéis (`operator`, `finance`, `inventory`, `field_technician`, `support`) só as bases preparadas apenas por
`db:seed`: o job `backend-postgres` da CI, o `test:e2e` e o dev que não roda `db:seed:users`. O staging roda
`db:seed:demo` (`seed` + `seed-users` + `seed-fleet`), e o `seed-users.ts` já cria esses 5 papéis globais com as
concessões do catálogo. Produção nunca roda seed e já recebe os 12 pelo `db:provision-rbac`.

## Escopo

**PERMITIDO:**
- `prisma/seed.ts`: só o import de `DEFAULT_ROLES`, a constante `SEEDED_SYSTEM_ROLES` e o comentário dela. O nome da
  organização não se toca.
- `tests/permission-catalog-db-parity.test.ts`: isenção só de `platform_admin`; P2 e P3 como asserções DENTRO dos 2
  `test()` que já existem, sem `test()` novo e sem renomear os 2 (orçamento de 2 pulos de
  `scripts/run-backend-tests.mjs`; emenda 1, item 1); comentários.
- `tests/san3-04a-seed-semeia-auditor.test.ts`: reescrita do textual; ele lê `seed.ts` e `scripts/provision-rbac.ts` e exige
  a mesma exclusão de `platform_admin` (emenda 1, item 7).
- Registro: `agent-orchestration/controle/pendencias.md`, `agent-orchestration/controle/pendencias-indice.md` (gerado por
  `gerar-indice-pendencias.py`), `docs/revisoes/SAN3/PLANO_SAN3.md` (só as notas do item 47 e da linha do bloco), este
  comando e o relatório do dev.

**PROIBIDO:** `prisma/schema.prisma`, `prisma/migrations/**`, `prisma/seed-users.ts`, `prisma/seed-fleet.ts`,
`prisma/seed-guard.ts`, `src/**` (inclusive `catalog.ts`), `scripts/**`, `.github/**`, `frontend/**`, `mobile/**`,
`Kpis/**` (congelado, §C7 item 8(5)), `RBAC_MATRIX.md`, lockfiles, `.env`, `DEMO_TENANT_MODULES`.

## Critério e mutações (literais; a M1 é a da crítica, emenda 1, item 2)

| Mutação | Texto | Esperado |
|---|---|---|
| M1 | `DEFAULT_ROLES.filter((role) => role !== "platform_admin")` → `DEFAULT_ROLES.filter((role) => role !== "platform_admin" && !["operator", "finance", "inventory", "field_technician", "support"].includes(role))` | seed sai 0; paridade vermelha com 5 linhas "não tem linha global" |
| M2 | `DEFAULT_ROLES.filter((role) => role !== "platform_admin")` → `[...DEFAULT_ROLES]` | paridade vermelha na asserção de P2 |
| M3 | as 2 linhas `name: "Organização Demonstração"` → `name: "Tenant Demo"` | paridade vermelha na asserção de P3 |
| M4 | `for (const permission of ROLE_PERMISSIONS[role])` → `for (const permission of role === "support" ? [] : ROLE_PERMISSIONS[role])` | paridade vermelha com `"support" deveria ter "…"` |

Vermelho-controle: o teste novo de paridade contra uma base semeada pelo seed da `main` (`07898adf`) fica vermelho com
exatamente os 5 papéis. Drills: D1 `SELECT name FROM tenants` em base só do seed; D2 seed 2× sem duplicata e com a mesma
contagem de concessões; D3 `db:provision-rbac -- --dry-run` com 0 a criar depois do seed.

O sinal sobre o `prisma/seed.ts` é executá-lo (F3 e CI): o `npm run check` compila só `src/**` (emenda 1, item 6).

## Validação

```
npx prisma generate
npm run check
npm run lint
node --test --import tsx tests/san3-04a-seed-semeia-auditor.test.ts tests/seed-guard.test.ts
# base descartável
npx prisma migrate deploy && npm run db:seed
RBAC_DB_PARITY=1 node --test --import tsx tests/permission-catalog-db-parity.test.ts \
  tests/permission-catalog-migration-parity.test.ts tests/persistent-rbac-middleware.test.ts \
  tests/core-saas-role-authority-db.test.ts
DATABASE_URL=<base migrada> CORE_SAAS_PERSISTENCE=memory node scripts/run-backend-tests.mjs \
  tests/permission-catalog-db-parity.test.ts          # "# skipped 2", exit 0
npm test                                              # TAP, na forma do job backend
npm run build
node scripts/migration-transaction-guard.mjs
git diff --check
git diff --name-only origin/main...HEAD               # só o PERMITIDO
```

`Kpis/**` intocado (`D-GOV-PROPORCIONAL` item 8(5)).
