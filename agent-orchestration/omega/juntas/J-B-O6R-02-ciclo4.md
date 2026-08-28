# J-B-O6R-02 — ata da junta 5/5 · ciclo 4 · Atomicidade do financeiro

> **VEREDITO: REPROVADO.** Placar **4 APROVADO · 1 REPROVADO · 0 voto perdido** — invariante financeiro exige
> **unanimidade 5/5** (§C7.1); o voto REPROVADO da cadeira do **arnês concorrente** derruba a entrega. Head julgado
> **`12c3825`** (`feat/o6r-b02-financial-uow`, base `origin/main` = `6efe5ad`). Junta concluída em **2026-08-28**
> (~05:45Z). Pareceres integrais, verbatim, em `agent-orchestration/omega/juntas/votos/B-O6R-02-ciclo4/`
> (`01`–`05` = votos JSON; `00a`–`00c` = as três passadas do inspetor de terreno).
>
> **A frase deste ciclo:** *o dinheiro não fabrica mais em nenhuma camada, ordem ou intercalação; o NÚMERO que o
> PR publica sobre isso é que não sobrevive à forma em que foi medido.*

## 1. Como a junta chegou aqui (conferível)

| Quando | O quê |
|---|---|
| 25/08 15:25Z | Inspetor de terreno, 1ª passada — **BLOQUEADO** (B1 jurados sem prova de frescor, B2 faltava a cadeira de ataque ao dinheiro, B3 briefing não conferível) — `votos/…/00a-*.md` |
| 25/08 21:57Z | Inspetor, 2ª passada — **LIBERADO COM RESSALVA** (R1–R5) — `00b-*.md` |
| 26/08 00:14Z | Junta disparada (`wf_d57805c0-ff9`): **4 cadeiras caíram por limite de sessão**; só `jurado-c4-fail-closed-enumeracao` votou (APROVADO, 01:08Z) |
| 26/08 04:19Z | Re-disparo das MESMAS 4 identidades (`wf_33dc79d8-a4f`) — **`[Request interrupted by user]` aos 2 min**, Docker desligado; nenhum voto |
| 26/08 01:16 local | Limpeza dos worktrees órfãos apagou, por dentro de uma junction, o `node_modules` do worktree do dev e mutilou o da árvore principal (descoberto em 28/08; regra nova no briefing) |
| 28/08 ~01:20 | `agente-fabrica` cria **4 suplentes com identidade nova** (`jurado-c4-suplente-*`, commit `160a87f`); briefing emendado (plano de perda de jurado, R1–R8, proibição de junction, sobrevivência) |
| 28/08 04:26Z–04:50Z | Inspetor, 3ª passada — **LIBERADO COM RESSALVA** (R1–R8); **o voto fail-closed de 26/08 VALE** (item 6: mesmo head, restore byte a byte provado pelos md5 CRLF) — `00c-*.md` |
| 28/08 04:5xZ–05:45Z | Junta dos 4 suplentes (`wf_82599285-e14`), cada um em worktree curto próprio + `npm ci` próprio + cluster Postgres 16/Redis 7 descartável em porta própria; teardown confirmado (0 worktrees `jur-c4s-*`, 0 containers) |

## 2. Composição e papéis (§C7.4-bis, §13.2 do plano — ata sem isto = ciclo inválido)

| Papel | Quem | Elegibilidade |
|---|---|---|
| **Planejador do ciclo 4** | `planejador-mestre`, instância nova em **Fable** (`D-PLANEJADOR-MODELO-FABLE`), disparada 25/08 11:30Z; plano `B-O6R-02-ciclo4-plano.md` (`9f56a6c`) | não desenvolveu, não votou |
| **Desenvolvedor do ciclo 4** | agente `general-purpose` **`agent-a6e56e5988c0adbad`**, designado pelo orquestrador em **25/08 12:15Z** ("Implementar ciclo 4 do financeiro"); commits `db5b047`→`12c3825` (12:57Z–14:51Z) — nome que faltava (R5 do inspetor) | não planejou, não votou |
| **Inspetor de terreno** | `inspetor-de-terreno-da-junta` (Fable), 3 instâncias (25/08 ×2, 28/08 ×1) | não vota, não conserta |
| **Fábrica** | `agente-fabrica` — 5 jurados frescos (25/08, `1736727`) + 4 suplentes (28/08, `160a87f`) | — |
| **Jurado · fail-closed / enumeração** | `jurado-c4-fail-closed-enumeracao` (voto de 26/08, aceito pelo inspetor) | fresco: 0 colisões nas atas 1–3 |
| **Jurado · ataque ao dinheiro (veto)** | `jurado-c4-suplente-ataque-ao-dinheiro` | suplente, identidade nova |
| **Jurado · banco, locks, triggers (veto)** | `jurado-c4-suplente-banco-triggers` | suplente, identidade nova |
| **Jurado · arnês concorrente** | `jurado-c4-suplente-arnes-concorrente` | suplente, identidade nova |
| **Jurado · validador diff × plano (veto)** | `jurado-c4-suplente-validador-diff-plano` | suplente, identidade nova |
| **Orquestrador** | sessão `dc4293a7` (25–26/08) → sessão `503c6f08` / `erp-techsolutios-a6` (28/08) | — |

**Titulares queimados sem votar** (2 disparos cada; inelegíveis daqui em diante como identidade):
`jurado-c4-banco-triggers`, `jurado-c4-ataque-ao-dinheiro`, `jurado-c4-arnes-concorrente`, `jurado-c4-validador-diff-plano`.

**Inelegíveis para o ciclo 5** (planejar, desenvolver, revisar, votar): todos os 5 votantes acima, os 4 titulares
queimados, o planejador e o dev do ciclo 4, e o roster acumulado dos ciclos 1–3 (12 nomes, conferido pelo inspetor:
`agente-dba-guardiao`, `inspetor-de-arnes-concorrente`, `critico-adversarial`, `validador-mestre`,
`inspetor-fixtures-financeiras-legadas`, `coordenador-de-acessos`, `guardiao-fail-closed`,
`especialista-maquinas-de-desfazer`, `especialista-arnes-postgres-node`, `agente-secops`,
`agente-devops-provisionador`, `agente-ci-doutor`).

### As três perguntas do §C7.4-bis

**(a) A composição cobre a competência que o achado exige?** Sim — 5 cadeiras 1:1 com o §13.4 do plano (banco ·
ataque · arnês · fail-closed · validador), conferido pelo inspetor (3ª passada, item 3.2). O achado que reprovou
nasceu **exatamente na cadeira feita para ele** (arnês: "os números sobrevivem à forma?"). Para o ciclo 5 a
competência que o achado exige é **arnês/concorrência de catálogo Postgres em `node --test` paralelo** — a cadeira
existe (`inspetor-de-arnes-concorrente`, `especialista-arnes-postgres-node`) mas **está queimada** (ciclos 1 e 2):
o ciclo 5 precisa de identidade nova nessa competência, criada pela fábrica.

**(b) Quem achou o defeito é quem o consertou?** Não houve conserto ainda. Os achadores deste ciclo (5 jurados)
**não** planejam, desenvolvem nem votam o ciclo 5. O plano do ciclo 5 nasce de um `planejador-mestre` novo (Fable),
a partir do relatório do achador (`R-B-O6R-02-ciclo4.md`) — nunca de correção proposta por jurado (nenhum propôs;
conferido nos 5 JSON).

**(c) O planejador está usando dado podre?** O planejador do ciclo 4 auditou por execução antes de planejar (§0 do
plano) e a junta confirmou os números dele. **Uma premissa do plano caiu:** o §9.11 pressupunha que o vermelho da
classe `XX000` só apareceria *"fora das formas canônicas"*; o arnês o mediu **dentro da canônica 3** (3/10). O
ciclo 5 **não herda** "a canônica 3 é exit 0" como fato — herda a tabela de 10 rodadas do arnês.

## 3. O que a junta CONFIRMOU FECHADO (execução independente, por cadeira)

| Propriedade | Quem confirmou | Evidência executada |
|---|---|---|
| **B-1 / C1 — a corrida `delete×reverse` NÃO fabrica dinheiro** | **ataque** (veto), **banco** (veto), **arnês**, **validador** | ataque: 12 combinações camada×ordem×intercalação, **590 iterações próprias + 140 das suítes, SALDO = 0 em todas** (serviço×memória 90+90, HTTP×memória 90+90, HTTP×Postgres 50+50, serviço×Postgres 25+25, reverse×reverse 30+25, SQL cru 25); controle sequencial (201→422 / 200→404 / 409) e cross-tenant (404-antes-de-regra) preservados · banco: SQL cru 2 conexões + barrier, **30+30 com triggers ON = 0 fabricado, 60/60 bloqueios no row lock, P0001 Ω6R-DIN-002**; **vermelho-controle no MESMO cluster com o down = 60/60 fabricados** (o §0.1 reproduzido) · arnês: 2 ordens N=25 memória/HTTP (78/78) + N=20 -db ×11 execuções (66/66), 0 `40P01|XX000|23505` |
| Defesa em profundidade (serviço e banco seguram SOZINHOS) | banco | triggers DOWN: serviço 0/40; SQL cru com triggers ON: 0/60 — cada camada com o próprio vermelho-controle |
| Migration aditiva pura; par de triggers real; D28 (down → re-apply) | banco, validador | `pg_constraint` 4 / `pg_indexes` 8 / colunas 24 antes, no down e no re-apply; `pg_trigger` 2 (BEFORE UPDATE · BEFORE INSERT OR UPDATE OF reversal_of, deleted_at), SECURITY INVOKER; censo de legado emite WARNING com órfão semeado; trigger B também recusa estorno cross-tenant |
| **C2 / P5-v2 — o valor da classificação TEM consumidor** | fail-closed (26/08), validador | D22(a) `titleId→plain`: compila, **5 casos vermelhos** (inclui `DELETE` HTTP 200≠422); D22(b) `category→owner`: happy-path **negado em runtime**; membro omitido → **TS1360 no compilador** |
| **C3 / P7-v2 — prova de vida da fixture** | validador | D24: harness vermelho **nomeando** a fixture morta; D19a/D19b vermelhos; "30 fixtures com PROVA DE VIDA" contado |
| **C4 / P6-v2 — ponta ausente = ERRO nos 5 status** | validador | casos de ponta-ausente + acoplamento de carregador (memória e -db) vermelhos sob D25 |
| **C5 — contrato amarrado; guard de skip do runner** | validador, arnês | D26 literal: `npm test` **ec=1**, "GUARD DE SKIP (P8): … 3 pulados > orçamento 2", skips nomeados |
| Escopo §5 e PROIBIDO intocados; divergência `D-DIVERGENCIA-C4-PONTA-AUSENTE` legítima | validador (veto) | delta `eb98b0b..12c3825` = 23 arquivos, todos na §5; `ci.yml`/`schema.prisma`/migration existente/`CLAUDE.md`/`AGENTS.md`/lockfiles/infra/frontend/mobile: diff 0; `a109fd7` não é ancestral |

## 4. OS BLOQUEANTES (cadeira do arnês — cada um com evidência que ELA executou)

Forma: **canônica 3** (`npm test`, `DATABASE_URL` exportada para cluster próprio recém-migrado, `CORE_SAAS_PERSISTENCE`
não exportada, 260 arquivos, Node v20.19.5), **N = 10 rodadas sequenciais** do MESMO comando (04:54Z–05:45Z).
Arranjo declarado: outras duas baterias de jurados na mesma máquina, em clusters separados (contenção de CPU, nunca
o mesmo banco). O `XX000` é intra-cluster — só os processos do próprio jurado conectavam ao cluster dele.

### B-1c4 · O número publicado da canônica 3 (`2745/2743/0 fail/2 skip`) não sobrevive à repetição

| rodada | tests | pass | fail | skip | ec | onde |
|---|---|---|---|---|---|---|
| 01, 02, 04, 05, 07, 09, 10 | 2745 | 2743 | 0 | 2 | 0 | — |
| 03 | 2745 | 2742 | **1** | 2 | **1** | `tests/audit-security.test.ts:158` — `XX000 tuple concurrently updated` (CREATE ROLE) |
| 06 | **2740** | 2737 | **1** | 2 | **1** | `tests/auth-identity-backfill-db.test.ts:115` → `helpers/auth-identity-fixture.ts:150` (`createEphemeralRole`) — `XX000` |
| 08 | 2745 | 2742 | **1** | 2 | **1** | `tests/audit-security.test.ts:158` — `XX000` |

**7/10 verdes.** Motivo do veto: o plano §9.3 fixa a meta da canônica 3 como *exit 0*; o head publica o número
**sem N**. Propriedade ausente: **serialização/isolamento das escritas de catálogo (`CREATE ROLE`/`GRANT`) entre
arquivos que o `node --test` roda em paralelo**. A classe está em `P-O6R-ARNES-ISOLAMENTO` como pré-existente
("banco-por-worker não resolve o XX000") — **e reapareceu DENTRO da forma canônica**, não fora dela (§9.11).

### B-2c4 · O denominador varia entre execuções do mesmo comando (2740 × 2745)

Rodada 06: diff dos nomes de topo 05×06 **idêntico** (2686 = 2686); os **5 subtestes** indentados do teste 120
("backfill: por usuário…") existem na rodada 05 e **não correram** na 06 — o arquivo abortou no `XX000` antes de
registrá-los, e o total continuou plausível. **D26b** (variante executada): suíte -db que sai limpa **sem registrar
teste** → `npm test` **ec=0**, "2740 teste(s) · pass 2738 · skipped 2", guard mudo. Propriedade ausente:
**denominador fixado (ou publicado e comparado) por execução** — o guard do C5.3 cobre só o auto-pulo DECLARADO.

### B-3c4 · Vaza-metro não zerado: roles Postgres órfãs com LOGIN e DML total; vazamento linear de linhas

Antes: `roles = 1` (`postgres`). Depois da rodada 03: `audit_rls_1787893680154_766b2150d3311` (login=t) **persiste
até a 10**; depois da 08: `audit_rls_1787895229747_885595249e76f`. Grants: SELECT/INSERT/UPDATE/DELETE **230 cada**,
`has_table_privilege(…, financial_entries, INSERT) = t`, USAGE em `public`. Além disso, **mesmo nas 7 rodadas
verdes**: `auth_identities` e `auth_identity_link_events` **+5 por rodada** (5→50). Propriedades ausentes:
**teardown de role efêmera quando a criação falha no meio** e **varredura do resíduo próprio entre rodadas**.

## 5. Achados de AJUSTE (não bloqueiam; entram como pendências nomeadas — §7)

| # | Cadeira | Achado |
|---|---|---|
| A1 | ataque | **Overclaim textual:** `API_CONTRACTS.md` l.426–428 e o cabeçalho da migration dizem *"impossível por construção, mesmo para escritor que não passa pelo serviço"* — mas `DELETE` **físico** do original com estorno vivo é aceito (SALDO do produto = 100) e `UPDATE id` (rename da PK) deixa a contrapartida pendurada (DELETE HTTP legítimo do renomeado → 200, SALDO = 100). Não há FK em `reversal_of`; trigger A é só BEFORE UPDATE. Nenhuma rota do produto faz DELETE físico (grep em `src` = 0) |
| A2 | banco | O teste committed `[C1/P9][db][RLS] estorno LEGÍTIMO sob o contexto RLS do app` **não exercita RLS**: roda como `postgres` (`rolbypassrls=t`) no local, na CI e no compose — e **passou com os triggers derrubados**. A propriedade trigger×RLS foi provada pelo jurado com role `NOBYPASSRLS` sob RLS forçada |
| A3 | validador | Divergências dos drills **D27** (mutante equivalente; provado por M2/M3) e **D21** (uma ordem fica verde sob a mutação — não determinística) registradas **só no corpo dos commits** `b7de4c9`/`db5b047`, não em `pendencias.md` (§A2) |
| A4 | validador | **Bateria §9 publicada pela metade:** o KPI do ciclo 4 publica só a canônica 3 e os focados 300/300; **canônicas 1 e 2** (§9.2, §9.6 — N≥15, denominador constante) não foram executadas/publicadas pelo dev. Validador mediu N=1: canônica 1 = 2465/2400/1 fail ambiental/64 skip; canônica 2 = 194/194 |
| A5 | validador | **Registro §12 incompleto no head:** `status-geral.md` e `log-execucao.md` não reconciliados com o REPROVADO do ciclo 3 nem com a autoria do ciclo 4; a pendência `P-O6R-B02-SUITES-LIST-CI` (suíte -db nova na lista SUITES do job roteado) **não existe** |
| A6 | validador | Piso §6 da P9: o componente *"1 censo de legado"* **não tem caso permanente** (só o drill D28 exerce o WARNING) |
| A7 | validador | **S0 não fecha no HEAD:** `node scripts/sync-agent-agents.mjs --check` sobre o conteúdo exato de `12c3825` → **ec=1, 15 DIVERGE** (12 agentes-base + 3 especialistas); na árvore principal → OK 32. A R4 do inspetor mediu o espelho VIVO, não o head. Alçada do orquestrador |
| A8 | arnês | Runner **cego a suíte -db que some sem declarar skip** (D26b: ec=0, denominador cai) — o mesmo buraco do B-2c4 visto pelo lado do guard |

**Notas** (fato medido, sem peso no voto): D21 em memória é vermelho no arquivo mas não "nas DUAS ordens" por
camada — a detecção em memória depende da intercalação (ataque #2, validador); edições cruas fora da classe do par
(`UPDATE amount`, `UPDATE account_id`, DELETE físico da contrapartida) movem dinheiro sem guarda — pré-existente e
fora do B-1 (ataque #3); índice parcial só fecha a metade duplicata, o trigger é a peça (banco #2); trigger B fecha
estorno cross-tenant além do prometido (banco #4); EXPLAIN em tabela vazia escolhe Seq Scan, com `enable_seqscan=off`
usa o índice parcial (banco #5); aborto duro (SIGKILL) na corrida -db deixa 1 tenant/1 user/1 conta/1 lançamento sem
varredura (arnês #5); a suíte -db nova não está na lista SUITES do job `backend-postgres` (arnês #6).

## 6. Sobre o voto aceito de 26/08 (fail-closed) — registro (R8)

Emitido no mesmo head, em worktree próprio, com restore provado byte a byte; usou **junction de leitura** do
`node_modules` do dev (`rmdir` da junction com alvo intacto conferido antes de remover o worktree). A forma passou a
ser **proibida em 28/08** depois que a limpeza de outro worktree apagou o alvo por dentro de uma junction. Não
invalida o voto (inspetor, 3ª passada, item 6 e R8).

## 7. O que o ciclo 5 recebe (NÃO é plano — plano é de outra alçada; §C7.4: ciclos 4–5 = junta ampliada replaneja)

1. **A classe do bloqueante é de ARNÊS, não de dinheiro** — escrita de catálogo Postgres sem serialização entre
   arquivos paralelos (`CREATE ROLE`/`GRANT` em `audit-security.test.ts` e `auth-identity-fixture.ts`), denominador
   sem piso, role efêmera sem teardown no caminho de falha, resíduo próprio sem varredura. É a classe
   **pré-existente** `P-O6R-ARNES-ISOLAMENTO` (anterior ao B-O6R-01), agora medida **dentro** da canônica 3 com N=10.
2. **A deliberação que o replanejamento tem de fazer por escrito** (e que este ciclo não faz): fechar a classe do
   arnês **dentro** do B-O6R-02 (o §5 do ciclo 4 proibia "qualquer outro `tests/**`"; `ci.yml` é PROIBIDO) **ou**
   destacar um bloco próprio (arnês) e fazer o B-O6R-02 publicar o número **com N e forma honestos** (7/10, causa
   nomeada) — lembrando que a cadeira do arnês reprova *número publicado sem N*, não *número imperfeito declarado*.
   Qualquer das duas exige plano novo (Fable), crítico com identidade nova e junta ampliada.
3. Os 8 ajustes do §5 viram pendências nomeadas (`pendencias.md`, 2026-08-28); A7 (espelho no head) e A5 (registro)
   são **do orquestrador/dev antes do PR**, não da junta.
4. **Composição do ciclo 5:** o pool de domínio está esgotado (12 + 9 + planejador + dev inelegíveis) — a fábrica
   cria identidades novas para a competência que o achado exige (arnês/catálogo Postgres em `node --test` paralelo),
   para o crítico e para a junta ampliada.

## 8. Teardown e terreno ao fim da junta (medido pelo orquestrador)

`git worktree list` → principal (`55dcc4c` → agora esta ata), dev `12c3825`, `gov-descuido` (pré-existente, não
tocado); **0** `jur-c4s-*`. `docker ps -a` → só `erp-postgres`/`erp-redis` (nunca alvo). Pristino do head re-conferido
pelos 4 suplentes DEPOIS de medir (hash-object = blob nos 3 âncoras + arquivos exercitados; `status --porcelain` vazio
no worktree do dev e na árvore principal rastreada). Evidência bruta (logs, snapshots de catálogo, ~21 MB do arnês)
fica no scratchpad da sessão `503c6f08`, fora do repositório.

---

## ERRATA (2026-08-28, apensada — §A2: nunca reescrever) — o rótulo "em `CREATE ROLE`" do B-1c4 é IMPRECISO

Conferido no head `12c3825` pelo orquestrador (e antes pela `agente-fabrica`), nas linhas que o jurado do arnês apontou:

- `tests/audit-security.test.ts:158` → `await adminClient.$executeRawUnsafe(`DROP OWNED BY "${roleName}"`)` — teardown, **FORA** de
  `withRoleCatalogLock` (a suíte não importa o lock; 0 ocorrências).
- `tests/helpers/auth-identity-fixture.ts:150` → `await tx.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO "${roleName}"`)` — **DENTRO**
  de `withRoleCatalogLock` (l.145).

Os dois statements reescrevem `pg_namespace.nspacl` (a linha única do schema `public`) / `pg_class.relacl`, **não `pg_authid`**. O jurado
apontou a LINHA certa e rotulou o statement por inferência ("CREATE ROLE"). A classe continua a mesma — escrita de catálogo por
arquivos paralelos sem mecanismo único — mas o **objeto disputado tem de ser nomeado por execução** (candidato: a linha de `public`
em `pg_namespace`), porque um plano que serialize só o `CREATE ROLE` pode estar serializando o statement errado. Também a conferir:
o runner do head não fixa `--test-concurrency`; `ci.yml:199` canaliza o `node --test` para `tee` (exit do pipeline — `pipefail`?).
Nada disto altera o veredito; altera o alvo do ciclo 5. Registrado como `[A RE-VERIFICAR]` para o planejador, o crítico e o jurado de arnês.

---

## ERRATA S0 (2026-08-28, apensada — §A2) — os "15 DIVERGE" (ata, A7) e os "25 DIVERGE" (plano do c5, §0.c) são ARTEFATO DE MEDIÇÃO

O orquestrador executou o S0 e mediu o oposto. Quatro medições, nesta ordem:

| # | Arranjo | Resultado |
|---|---|---|
| 1 | `--check` no **worktree real** do head (`.claude/worktrees/agent-af6ea607f3ddf8efd`, `12c3825`, árvore limpa) | **ec=0** — "OK — 25 agentes, espelho consistente" · 0 DIVERGE |
| 2 | `git archive 12c3825 … \| tar -x` + `--check` (o arranjo do plano) | ec=1 · **25 DIVERGE** — reproduzido |
| 3 | Diff do arquivo do archive × gerado: **as 64 linhas** diferem; 3995 × 3931 bytes = **exatamente 1 byte/linha** | o delta é **CR** |
| 4 | **Checkout LF puro** (`git -c core.autocrlf=false checkout 12c3825 -- …`) — o que a CI Linux recebe | **ec=0** · 0 DIVERGE · "25 agentes, espelho consistente" |

Contagem de CR: **blob = 0** nos dois lados (26 arquivos do espelho e 25 fontes, todos LF; não há `.gitattributes`);
arquivo **extraído do archive = 64 CR**. Ou seja: `git archive`+`tar` nesta máquina Windows injeta CRLF no espelho,
o script compara com o conteúdo gerado (LF) e acusa divergência que **não existe no repositório**.

**Consequência:** o **S0(i) do plano do ciclo 5 é NO-OP** — o espelho já fecha no head `12c3825`, e nenhum commit
foi feito na branch por este motivo (head preservado). A pendência `P-O6R-B02-S0-ESPELHO-NO-HEAD` (registrada como
ALTA) **não reproduz**: fica registrada como fechada por não-reprodução, com as quatro medições acima.

**O que isto NÃO invalida:** `5e321ac` continua não sendo ancestral de `12c3825` nem de `origin/main` (medido) — a
**letra** do S0 do ciclo 4 ("rebase sobre a base com `5e321ac`") segue inexequível, como o planejador do ciclo 5
apurou. E a CI **não executa** `sync-agent-agents --check` (0 ocorrências em `ci.yml`), então nenhum gate depende disto.

**Lição de método, para o ciclo 5 e para o inspetor:** medir o conteúdo de um commit por `git archive`+`tar` numa
máquina com `core.autocrlf=true` **não** é medir o commit. As formas honestas são o **checkout LF puro**
(`git -c core.autocrlf=false checkout <head> -- <caminhos>`) ou `git cat-file`/`git show` do blob. É a mesma classe
da nota de md5 × autocrlf que já está no briefing — agora com um segundo caso, e este chegou a virar pendência ALTA.
