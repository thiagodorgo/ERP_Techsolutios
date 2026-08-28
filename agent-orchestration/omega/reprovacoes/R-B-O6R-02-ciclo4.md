# R-B-O6R-02 — ciclo 4 — relatório do ACHADOR (§C7.4-bis: quem acha não conserta)

> Insumo obrigatório do planejador do ciclo 5. Contém **defeito + evidência executada + motivo** — e **nenhuma
> correção proposta** (os 5 votos foram conferidos: nenhum propõe conserto). Ata: `../juntas/J-B-O6R-02-ciclo4.md`.
> Pareceres verbatim: `../juntas/votos/B-O6R-02-ciclo4/01..05-*.json`.
>
> **Papéis deste ciclo:** achadores = os 5 jurados (`jurado-c4-fail-closed-enumeracao`, `jurado-c4-suplente-ataque-ao-dinheiro`,
> `jurado-c4-suplente-banco-triggers`, `jurado-c4-suplente-arnes-concorrente`, `jurado-c4-suplente-validador-diff-plano`) —
> **inelegíveis** para planejar, desenvolver, revisar ou votar o ciclo 5. Planejador do ciclo 4 = `planejador-mestre`
> (Fable, 25/08 11:30Z). Desenvolvedor do ciclo 4 = `general-purpose agent-a6e56e5988c0adbad` (25/08 12:15Z).

**Head julgado:** `12c3825` · `feat/o6r-b02-financial-uow` · base `6efe5ad`. **Veredito:** REPROVADO 4×1 (unanimidade exigida).

## Bloqueantes (cadeira do arnês concorrente — `04-jurado-c4-suplente-arnes.json`)

Forma comum: canônica 3 (`npm test`, `DATABASE_URL` → cluster próprio recém-migrado com as 105 migrations, Node v20.19.5,
260 arquivos), **N=10** rodadas sequenciais do mesmo comando; logs `canon3-01..10.log`, snapshots de catálogo e de linhas
por tabela antes/depois de cada rodada (scratchpad `jur-c4s-arnes/`, 55 arquivos, 21 MB).

| ID | Defeito | Evidência executada | Motivo (propriedade ausente) |
|---|---|---|---|
| **B-1c4** | `2745/2743/0/2` publicado como número da canônica 3 é o desfecho de **7 em 10** rodadas; os 3 vermelhos são a mesma classe: `XX000 tuple concurrently updated` em `CREATE ROLE` | rodadas 03 e 08: `tests/audit-security.test.ts:158`; rodada 06: `tests/auth-identity-backfill-db.test.ts:115` → `tests/helpers/auth-identity-fixture.ts:150` (`createEphemeralRole`); `XX000` intra-cluster (só o jurado conectava) | escrita de catálogo (`CREATE ROLE`/`GRANT`) por arquivos que `node --test` roda em paralelo, sem serialização; o head publica o número **sem N**; §9.3 fixa a meta como exit 0; a classe (`P-O6R-ARNES-ISOLAMENTO`) reapareceu **dentro** da forma canônica |
| **B-2c4** | Denominador varia: **2740** na rodada 06 contra 2745 nas outras nove — 5 subtestes não correram e o total continuou plausível | nomes de topo 05×06 idênticos (2686=2686); 5 subtestes indentados do teste 120 presentes na 05, ausentes na 06; **D26b**: suíte -db que sai limpa sem registrar teste → `npm test` ec=0, "2740 · pass 2738 · skipped 2", guard mudo | denominador não fixado/comparado por execução; o guard de skip do C5.3 cobre só o auto-pulo DECLARADO |
| **B-3c4** | Vaza-metro não zerado: **2 roles órfãs com LOGIN** e SELECT/INSERT/UPDATE/DELETE nas 115 tabelas (inclusive `financial_entries`) persistem entre rodadas; +5 `auth_identities` e +5 `auth_identity_link_events` **por rodada, inclusive nas verdes** | antes roles=1; `audit_rls_1787893680154_766b2150d3311` (rodada 03 → persiste até a 10), `audit_rls_1787895229747_885595249e76f` (rodada 08); 230 grants por privilégio; `has_table_privilege(financial_entries, INSERT)=t`; linhas 5→50 em 10 rodadas | role efêmera sem teardown quando a criação falha no meio; sem varredura do resíduo próprio entre rodadas |

**O que a mesma cadeira PROVOU verde** (não reabrir): as duas ordens N≥20 com efeito 0 em memória/HTTP/-db (11 execuções
da suíte -db, 0 `40P01|XX000|23505`); asserção sobre EFEITO (`bothAccepted===false` E `balance===0`), sem retry/tolerância;
teardown no caminho de `assert.fail` (resíduo 0); **D26 literal** vermelho nomeando a contagem.

## Ajustes (as demais cadeiras — ver ata §5, A1–A8) e notas — sem correção proposta

A1 overclaim de `API_CONTRACTS.md` l.426–428 + cabeçalho da migration frente a DELETE físico/rename de PK (sem FK em
`reversal_of`) · A2 teste `[RLS]` roda como superuser e passa sem trigger · A3 divergências D27/D21 só no corpo dos
commits · A4 canônicas 1 e 2 não publicadas · A5 `status-geral`/`log-execucao` não reconciliados; `P-O6R-B02-SUITES-LIST-CI`
inexistente · A6 censo de legado sem caso permanente · A7 espelho Codex **diverge no head** (15 DIVERGE; S0 não fecha em
`12c3825`) · A8 runner cego a suíte -db que some sem skip.

## As três perguntas (§C7.4-bis) — respondidas na ata §2; resumo

(a) composição adequada, e a competência que o ciclo 5 exige (arnês/catálogo Postgres sob paralelismo) está com o pool
queimado → identidade nova pela fábrica; (b) ninguém consertou nada ainda; achadores fora do ciclo 5; (c) premissa do
§9.11 do plano ("vermelho fora das canônicas") **caiu por execução** — o ciclo 5 herda a tabela de 10 rodadas, não "exit 0".
