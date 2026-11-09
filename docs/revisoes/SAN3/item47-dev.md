# ITEM 47 (P-CHK-SEED-DEMO-SUJO) — relatório do dev

- **Dev:** `item47-dp` (DeepSeek oficial, identidade de dev, nível menor). Item 47 do gate.
- **Escopo autorizado:** só `prisma/seed.ts` + registro (`pendencias.md` + índice). Proibido `schema.prisma`, migrações, `src/**`, `frontend/**`, `Kpis/**`, `.github/**`.
- **Base:** `origin/main` `970cbbba` (feat(billing) #515); ramo `fix/seed-org-demo-pt-br`.
- **Achado:** a organização demo chamava-se `"Tenant Demo"` (termo técnico; §3/§11) em `prisma/seed.ts:217` (update) e `:222` (create).

## Correção

- `prisma/seed.ts:217` e `:222`: `name: "Tenant Demo"` → `name: "Organização Demonstração"`.
- Nome consistente com o seed: `organization.business_name` já valia `"Organização Demonstração"` (`prisma/seed.ts:346`).
- Nenhuma outra mudança no seed. Nenhum teste em `tests/**` fixava o nome antigo (`grep -rn "Tenant Demo" tests/` = vazio).

## Bateria

| Comando | Exit | Saída resumida |
|---|---|---|
| `grep -c "Tenant Demo" prisma/seed.ts` | 0 | `0` (prova) |
| `grep -rn "Tenant Demo" tests/` | 1 | vazio — nenhum teste fixa o nome |
| `npx prisma generate` | 0 | Prisma Client v7.8.0 gerado |
| `npm run check` | 0 | `tsc -p tsconfig.json --noEmit` sem erros |
| `node --test --import tsx tests/seed-guard.test.ts tests/san3-04a-seed-semeia-auditor.test.ts` | 0 | 6/6 pass |
| `git diff --check` | 0 | limpo |
| `git diff --name-only` | 0 | só `prisma/seed.ts`, `pendencias.md`, `pendencias-indice.md` |
| LF | — | `grep -c $'\r$' prisma/seed.ts` = 0 |

Nota: `npm run check` exigiu `npx prisma generate` — o cliente local estava desatualizado após o merge #515 (billing). Os erros antes do generate eram todos em `src/modules/...` (PrismaExecutor/TransactionClient), nenhum no seed.

## Registro

- `pendencias.md`: `P-CHK-SEED-DEMO-SUJO` → FECHADA (prova do grep = 0), com ressalva declarada da instância mobile fora de escopo.
- Índice regenerado: `python agent-orchestration/controle/gerar-indice-pendencias.py` (0).

## Ressalvas (não feitas — fora do escopo)

- `mobile/flutter_app/lib/core/bootstrap/bootstrap_session.dart:183,186` ainda exibe `displayName: 'Tenant Demo'` no modo offline; coberto pelo apenso 2026-11-03 da pendência (dono próprio). Este item fecha só a fatia do seed.
- `ferramentas/checkup-conclusao.sh` não existe no repo (o path da tarefa não resolve); a bateria foi executada manualmente.

PRONTO PARA REVISÃO — PR #518