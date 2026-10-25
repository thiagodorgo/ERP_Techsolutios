# B-GUARD-MIGRACAO — relatório do dev, por etapa

> **Papel:** dev (`dev-guard-migracao-opus`), Claude **Opus**, nível menor declarado (§C7.6). Não planejou. O dono decidiu em
> 24/10: *"Aceito as recomendações, mas vc cobre o codex nessa rodada"* — os papéis do Codex (dev, revisor) passam ao Claude.
> **Plano (fonte única):** `docs/revisoes/B-GUARD-MIGRACAO-plano.md` (planejador-mestre, Fable), cópia literal de
> `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-GUARD-MIGRACAO-plano.md`.
> **Governança:** bloco de FERRAMENTA → regra (1) de `D-GOV-PROPORCIONAL`: um revisor independente + CI verde. Sem junta, sem
> crítico, sem porteiro, sem KPI (congelado).

## Etapa 0 — terreno e base medida (04:18 UTC, 2026-10-25)

- Worktree novo `C:/Users/AMP/w-guard`, ramo `chore/guard-migracao-transacao`, a partir de `origin/main` **`8a7885f4`**
  (#454 B-TRC-02; o #456 B-SAN3-20 `37a3f360` já está abaixo dele). `npm ci` próprio (326 pacotes, exit 0), sem junction.
- Re-medição das migrações (o plano mediu em `c76ec481`, com 113):
  - `find prisma/migrations -mindepth 1 -maxdepth 1 -type d | wc -l` → **116**; `find … -name migration.sql | wc -l` → **116**.
  - `ls prisma/migrations | awk '$0 < "20260878000000"' | wc -l` → **112** (a lista das anteriores NÃO mudou: as 3 novas
    têm carimbo maior que a fronteira).
  - `ls prisma/migrations | awk '$0 >= "20260878000000"'` → `20260878000000_invoice_complementary_title`,
    `20260879000000_vehicle_telemetry_events`, `20260880000000_validate_receipt_message_kind_check`,
    `20260881000000_cheque_title_link` (**4 novas**, como o §5.1 item 2 previa para "após #454/#456": `116 · 112 · 4 · 0`).
  - Drills que citam o nome literal: `work-order-invoicing-migration-drill-db.test.ts` → `20260878…` (2 ocorrências);
    `traccar-event-migration-drill-db.test.ts` → `20260879…` (2); `cheque-title-link-migration-drill-db.test.ts` →
    `20260881…` (2). Existe um 4º drill (`inventory-migration-drill-db.test.ts`) que não cita nenhuma das novas.
  - `D-MIGRACAO-COM-TRANSACAO-EXPLICITA` em `decisoes.md:3877` e `P-MIGRACOES-ANTERIORES-SEM-TRANSACAO-EXPLICITA` em
    `pendencias.md:11603` — as duas já estão na `main` (a Q5 está cumprida).
- **Fronteira congelada:** `20260878000000`. **Lista das anteriores congelada:** 112 nomes, gerados por
  `ls prisma/migrations | awk '$0 < "20260878000000"'` na base `8a7885f4`.
- O disco do worktree tem CRLF (`core.autocrlf=true`); o guard normaliza `\r\n` → `\n` antes de dividir (R2 do plano).

## Etapa 1 — o guard (`scripts/migration-transaction-guard.mjs`)

- Zero dependência. Exporta `FRONTEIRA`, `ANTERIORES` (112, congelada, `Object.freeze`), `DDL_NAO_TRANSACIONAL` (10 itens,
  cada um com o motivo em comentário), `MOTIVO_MINIMO` (20), `splitStatements`, `auditMigration`, `readDrillSources`,
  `auditMigrationsDir`, `main`. `main()` só roda quando o arquivo é executado direto.
- Splitter: tira `--` e `/* */` (aninhado, como o Postgres), pula `'…'` (com `''`), `E'…'` (com `\'`), `"…"` e
  `$tag$ … $tag$`; divide por `;` de topo; normaliza CRLF. Devolve por sentença o texto e um `code` mascarado (literais
  trocados por `'?'`, `"?"`, `$?$`), em maiúsculas — as regras casam contra o `code`, logo uma string com
  `CREATE INDEX CONCURRENTLY` dentro não vira DDL não transacional.
- **Regra do envoltório (G2):** a contagem `n` exclui os controles de transação; com `n > 1`, a 1ª sentença é exatamente
  `BEGIN`, a última exatamente `COMMIT`, e há exatamente 2 controles. Com `n ≤ 1`, `BEGIN`/`COMMIT` em volta é tolerado,
  mas controle fora da forma de envoltório (ex.: `X; COMMIT;`) é G2. Arquivo sem sentença nenhuma é isento.
- **Leituras declaradas do dev (o plano não decidia; §A6):**
  1. *Formato das fixtures.* O §3 do plano diz `tests/fixtures/migration-guard/<Mxx_slug>/migration.sql`, e o §4 diz que o
     "diretório interno" tem carimbo (`20260999000000_caso`) e que a bateria roda o CLI sobre `M1_sem_begin/`. As duas só
     se conciliam com cada `Mxx_slug/` sendo um **mini-diretório de migrações**: `Mxx_slug/<carimbo>_<slug>/migration.sql`.
     Foi o formato adotado.
  2. *A lista fora do repositório.* A higiene "todo nome da lista existe no disco" (G1) faria qualquer fixture acusar 112
     ausências. O CLI aplica `ANTERIORES` só quando o diretório é o `prisma/migrations/` do repositório; fora dele usa lista
     vazia, salvo `--anteriores n1,n2|-`. A API (`auditMigrationsDir`) aplica `ANTERIORES` por padrão (falha fechada); o
     teste passa `anteriores: []` explicitamente às fixtures. O histórico real é coberto duas vezes: pelo A1 (guard sobre o
     disco real) e pelo A15 (lista == `ls … | awk`).
  3. *Carimbo antigo fora da lista* continua sendo julgado pelas demais regras (G1 + o que mais couber), em vez de parar no
     G1: a mensagem diz tudo de uma vez. O teste isola o G1 com um conteúdo conforme (só G1).
  4. *Tentativa de declaração* para o G7: o marcador no início do comentário, com variação de acento/caixa/separador
     (`^\s*--\s*N[AÃ]O[-_ ]AT[OÔ]MICA`, sem distinção de caixa). Prosa comum ("não-atomicidade") não casa. O G5 só aceita a
     forma exata `-- NAO-ATOMICA: <motivo>`.
  5. *`BEGIN ATOMIC … END`* (corpo SQL-padrão, PG 14+) não é reconhecido: o `END` solto cai em G2 — vermelho, nunca verde.
     Nenhuma migração do repositório usa essa forma (`grep -l "BEGIN ATOMIC"` → 0). Declarado no cabeçalho do script.
- Medição contra o repositório real (base `8a7885f4`): `migrações: 116 · anteriores: 112 · novas: 4 · violações: 0`. Com a
  lista vazia (todas tratadas como novas): G1 112, G2 104, G6 103, e nenhuma G0/G3/G4/G5/G7 — o splitter reproduz o
  inventário do plano (multi 107 = 105 + 879 + 881; uma sentença 9 = 8 + 880; 0 com DDL não transacional; a `20260874`
  com 29 sentenças).

## Etapa 2 — o teste e as fixtures

- `tests/migration-transaction-guard.test.ts`: **25 casos** (meta do plano ≥ 16). Cada mutação do §4 (M1–M18) é uma
  fixture ou asserção que fica vermelha pelo **conjunto exato** de regras (não "alguma violação"); M14 cai em G4 e não em
  G3; M16 em G2 **e** G7. Acrescentados: M19 (`START TRANSACTION`/`END`, `BEGIN WORK`, `COMMIT WORK` → G2), CRLF (R2), o
  splitter, a constante `DDL_NAO_TRANSACIONAL` (cada item com caso; DDL comum não casa), o drill real (sem os drills, as 3
  novas multi caem em G6) e o CLI em processo filho (A16).
- Fixtures em `tests/fixtures/migration-guard/` (19 mini-diretórios, só `.sql`; nenhum `*.test.ts`). M1 é a `20260878`
  real sem a linha `BEGIN;`; M9 é a `20260880` real com carimbo novo; M8 copia a `20260874` real em tempo de execução (não
  se duplicou um arquivo de 29 sentenças no repositório). M18 tem o arquivo com o nome errado (`migracao.sql`), porque o
  git não versiona diretório vazio.
- **Vermelho-controle do próprio guard (mutação de 1 linha no script, suíte do guard re-executada, script restaurado):**

| Mutação | Efeito | Suíte do guard |
|---|---|---|
| MG1 | G2 desligado | 9 falhas |
| MG2 | splitter sem dollar-quote | 3 falhas |
| MG3 | G6 desligado | 2 falhas |
| MG4 | CLI sempre exit 0 | 1 falha |
| MG5 | G4 desligado | 1 falha |
| MG6 | G7 desligado | 2 falhas |
| MG7 | G3 desligado | 1 falha |
| MG8 | motivo mínimo 0 | 1 falha |
| MG9 | "histórico reescrito" desligado | 1 falha |
| MG10 | G1 "carimbo antigo" desligado | 1 falha |
| MG11 | splitter sem comentário de bloco | 2 falhas |
| MG12 | splitter sem string | 2 falhas |
| MG13 | G0 desligado | 1 falha |
| MG14 | lista cresce (+1 nome) | 4 falhas |
| MG15 | `END` aceito como fecho | 1 falha (sobreviveu na 1ª rodada; o caso `BEGIN … END;` foi acrescentado ao M19) |

  15/15 vermelhas. Script restaurado e conferido por `git diff --no-index` contra a cópia (sem diferença).

## Etapa 3 — documentação e registro

- `docs/deployment.md`: seção "Migrações: transação explícita (D-MIGRACAO-COM-TRANSACAO-EXPLICITA)", antes do Runbook A —
  regra, exceção estrutural com a lista de DDL, histórico congelado, recuperação (`resolve --rolled-back` + `deploy`) e o
  comando do guard. Mesmas formas do código: `BEGIN;`/`COMMIT;`, `-- NAO-ATOMICA:`.
- `CLAUDE.md` §C4 **e** `AGENTS.md` §C4: a mesma frase (3 linhas), no mesmo commit (regra de espelhamento).
- `decisoes.md`: sub-item "Guard entregue" sob `D-MIGRACAO-COM-TRANSACAO-EXPLICITA`.
- `pendencias.md`: `P-MIGRACOES-ANTERIORES-SEM-TRANSACAO-EXPLICITA` ganha **fechamento PARCIAL** (a metade "guard de CI";
  segue ABERTA a metade das 104 anteriores multi-sentença); **nova** `P-DRILL-GENERICO-POR-PREFIXO` (BAIXA, dono
  `B-DRILL-GENERICO-POR-PREFIXO`). A `P-SAN3-20-DRIFT-MIGRACOES-X-SCHEMA` (dono "bloco de ferramenta/DBA do guard de
  migração") **não** é tocada: o drift schema × migrações não é deste guard.
- `pendencias-indice.md` regenerado pelo `gerar-indice-pendencias.py` (antes da edição, a regeneração reproduzia o
  versionado sem diferença de conteúdo): 621 cabeçalhos / 610 IDs, 465 abertas.
- `comandos/B-GUARD-MIGRACAO.md` (com a checklist do revisor), `log-execucao.md`, `status-geral.md`: uma entrada cada.
- `Kpis/**` intocado. Terreno: `npm run check` exigiu `prisma generate` no worktree novo (cliente em `node_modules`,
  nenhum arquivo de `prisma/**` alterado; `DATABASE_URL` fictícia só no comando).

## Etapa 4 — bateria (§5.1 do plano), contagens de execução real

| # | Comando | Resultado |
|---|---|---|
| 1 | `npm run check` | exit 0 (depois de `prisma generate`; antes, o cliente não existia no worktree novo) |
| 2 | `node scripts/migration-transaction-guard.mjs` | `migrações: 116 · anteriores: 112 · novas: 4 · violações: 0`, exit 0 |
| 3 | `node scripts/migration-transaction-guard.mjs tests/fixtures/migration-guard/M01_sem_begin/` | 1 linha `G2 20260878000000_invoice_complementary_title: n = 6 …`, rodapé `violações: 1`, exit 1 |
| 4 | `npm test -- tests/migration-transaction-guard.test.ts` | 25 testes · 25 pass · 0 fail · 0 skipped |
| 5 | `npm test` (suíte inteira, sem `DATABASE_URL`, modo `memory` pelo runner) | 3347 testes · **3250 pass · 1 fail · 96 skipped** (os `-db` sem banco) · 428 s |
| 6 | `npm run build` | exit 0 |
| 7 | `git diff --check` | limpo; `git status --short` só os caminhos do escopo permitido |
| — | `node scripts/sync-agent-agents.mjs --check` | OK — 82 agentes, espelho consistente (nenhum agente tocado) |

**A 1 falha do item 5 é de AMBIENTE, não do bloco.** `tests/core-saas-role-authority.test.ts` importa `src/database/prisma.ts`,
que lança `DATABASE_URL is required to initialize Prisma Client.` no import quando a variável não existe (o worktree novo
não tem `.env`). O arquivo e todo o `src/` estão intocados pelo bloco (`git diff --quiet HEAD -- tests/core-saas-role-authority.test.ts src/`).
Isolado, com `DATABASE_URL` fictícia: 12 testes · 12 pass · 0 fail. Rodar a suíte inteira com a URL fictícia não serve:
o guard de skip do runner (P8) reprovaria os 96 `-db` que se pulam sem banco. A CI exporta `DATABASE_URL` (Postgres de
serviço), onde o arquivo roda. O denominador 3347 é o desta máquina sem banco; o da CI (com os `-db`) vem do check-run.
