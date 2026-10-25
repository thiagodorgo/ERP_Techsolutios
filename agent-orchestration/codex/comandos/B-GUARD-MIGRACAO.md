# B-GUARD-MIGRACAO — trava de CI: migração nova com várias sentenças leva `BEGIN;`/`COMMIT;` no próprio arquivo

- **Tipo:** bloco de FERRAMENTA (regra (1) de `D-GOV-PROPORCIONAL`: um revisor independente + CI verde; sem junta, sem
  crítico, sem porteiro, sem KPI — congelado).
- **Fase:** Execution / Validation (A5) · **Trilha:** backend/raiz (teste estático, sem banco).
- **Data:** 2026-10-25 · **Ramo:** `chore/guard-migracao-transacao` · **Base medida:** `origin/main` `8a7885f4`.
- **Plano:** `docs/revisoes/B-GUARD-MIGRACAO-plano.md` (planejador-mestre, Fable). **Relatório do dev:**
  `docs/revisoes/B-GUARD-MIGRACAO-dev.md`.
- **Executores:** dev `dev-guard-migracao-opus` (Claude Opus, nível menor, declarado). O dono, em 24/10: *"Aceito as
  recomendações, mas vc cobre o codex nessa rodada"* — os papéis do Codex (dev, revisor) passam ao Claude.
- **Decisão que rege:** `D-MIGRACAO-COM-TRANSACAO-EXPLICITA` (dono, 2026-10-21, *"3=aprovo"*). Respostas às Q1–Q5 do plano:
  sem exceção genérica (só a estrutural `-- NAO-ATOMICA:`); o guard exige drill nomeado; drill genérico em bloco seguinte;
  uma frase no `CLAUDE.md` §C4 + `AGENTS.md`; o bloco abre depois do merge do #454.

## Objetivo

Nenhuma migração NOVA com mais de uma sentença chega à `main` sem `BEGIN;`/`COMMIT;` nas pontas do próprio
`migration.sql` e sem drill que a cite; DDL não transacional fica sozinha, sem transação, e declara `-- NAO-ATOMICA:`.
A regra de planejador/DBA vira mecanismo: `scripts/migration-transaction-guard.mjs`, lido pelo `npm test` via
`tests/migration-transaction-guard.test.ts`. **Fora:** o saneamento das 112 anteriores
(`P-MIGRACOES-ANTERIORES-SEM-TRANSACAO-EXPLICITA`) e o drill genérico por prefixo (`P-DRILL-GENERICO-POR-PREFIXO`).

## Regras do guard (G0–G7)

G0 diretório sem `migration.sql` · G1 carimbo < `20260878000000` fora da lista `ANTERIORES` (112, só encolhe), ou nome da
lista ausente do disco · G2 nova, multi-sentença, transacional ⇒ `BEGIN` na 1ª, `COMMIT` na última, nenhum controle no
meio · G3 não transacional acompanhada · G4 não transacional com `BEGIN`/`COMMIT` · G5 não transacional sem
`-- NAO-ATOMICA: <≥ 20 caracteres>` · G6 nova sob G2 sem `tests/*-migration-drill-db.test.ts` que cite o nome · G7
declaração `NAO-ATOMICA` sem DDL não transacional.

## Escopo PERMITIDO

- `scripts/migration-transaction-guard.mjs` (novo) · `tests/migration-transaction-guard.test.ts` (novo) ·
  `tests/fixtures/migration-guard/**` (novos, só `.sql`)
- `docs/deployment.md` (uma seção) · `CLAUDE.md` §C4 **e** `AGENTS.md` §C4 (a mesma frase, mesmo commit)
- `docs/revisoes/B-GUARD-MIGRACAO-plano.md`, `docs/revisoes/B-GUARD-MIGRACAO-dev.md`
- `agent-orchestration/codex/comandos/B-GUARD-MIGRACAO.md`, `agent-orchestration/controle/decisoes.md`,
  `agent-orchestration/controle/pendencias.md`, `agent-orchestration/controle/pendencias-indice.md` (regenerado),
  `agent-orchestration/codex/log-execucao.md`, `agent-orchestration/docs/status-geral.md`
- Leitura (nunca escrita): `prisma/migrations/**`, `tests/*-migration-drill-db.test.ts`

## Escopo PROIBIDO

`prisma/**` · `.github/workflows/**` · `package.json` e lockfiles · `Kpis/**` · `src/**`, `frontend/**`, `mobile/**` ·
`.claude/agents/**`, `.agents/**` · os drills existentes · `tests/fixtures/prisma-migrate-diff-baseline.sql`.

## Bateria de validação (§5.1 do plano)

1. `npm run check` → 0 erros.
2. `node scripts/migration-transaction-guard.mjs` → `migrações: 116 · anteriores: 112 · novas: 4 · violações: 0`, exit 0.
3. `node scripts/migration-transaction-guard.mjs tests/fixtures/migration-guard/M01_sem_begin/` → 1 linha `G2 …`, exit 1.
4. `npm test -- tests/migration-transaction-guard.test.ts` → todos verdes, 0 pulados.
5. `npm test` (suíte inteira) → verde; contagem no PR.
6. `npm run build` → verde.
7. `git diff --check` limpo; `git status --short` só os caminhos acima.
8. CI do SHA do PR: todos os check-runs `success`.
9. Limpeza §C5 em 1 linha.

## Checklist do revisor independente (quem não escreveu nem planejou; o Gemini só como 2º revisor)

- (a) rodou os itens 2–4 da bateria e colou a saída;
- (b) `ANTERIORES` tem 112 nomes e é IGUAL a `ls prisma/migrations | awk '$0 < "20260878000000"'` na `main`;
- (c) cada mutação do §4 do plano existe como fixture/asserção e fica vermelha pelo ID CERTO (ex.: M14 cai em G4, não em G3);
- (d) nenhum caminho do escopo proibido no diff;
- (e) `docs/deployment.md` descreve a mesma regra que o código (`BEGIN;`/`COMMIT;`, `-- NAO-ATOMICA:`);
- (f) `CLAUDE.md` e `AGENTS.md` com a mesma frase no §C4;
- (g) para cada migração nova multi-sentença, o drill que a cita tem laço k = 1..n com `migrate deploy` real e
  `resolve --rolled-back` (o G6 só prova a citação — limite declarado, D-007).

## DoD

- [ ] Só os caminhos do escopo permitido; nada do proibido.
- [ ] Bateria verde e colada no PR (itens 2–4 com saída literal).
- [ ] ≥ 16 casos, cada mutação vermelha pelo ID certo; `prisma/migrations` real → 0 violações.
- [ ] `ANTERIORES` = 112 nomes, iguais ao `ls … | awk` na `main`.
- [ ] Revisor independente aprovou com a checklist; CI verde no SHA.
- [ ] Registro feito; limpeza §C5 reportada em 1 linha.

## Rastreabilidade

ID `B-GUARD-MIGRACAO` · PR # (preenchido após `gh pr create`) · merge commit / approved head: pós-merge · gate: revisor
independente + CI · status: `published_per_pr` (KPI congelado, `D-GOV-PROPORCIONAL` (5)).
