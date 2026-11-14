# Parecer do porteiro pós-merge — PR #554 (B-DB-FUSO-UTC)

> **Cópia no repositório** pelo PR de registro de 14/11 tarde (`reg-1411b-cl`), ao lado da ata `J-554-b-db-fuso-utc.md`. O conteúdo é o do parecer de fora do repositório (`revisoes/j554/porteiro-554-parecer.md`); só os caminhos de máquina foram trocados por descrição. As evidências citadas ficam fora do repositório.
> **Desfecho do BLOQUEADO (registro das 09:50 SP):** o orquestrador re-rodou o job falho às 09:23 SP; a tentativa 2 da rodada `43587307951` deu `success` às 09:39 (backend com 5720 testes, 5718 passam, 0 falham e 2 pulam; `docker` ok). Pela regra escrita no próprio veredito, o start ficou LIBERADO COM RESSALVA, com N1 a N5 viajando, e o T15 instável virou a `P-T15-5432-SUBSTRING-NA-HORA`. Onde as ressalvas entraram: N3 (a `P-DB-FUSO-DA-CONEXAO` FECHADA), N5 (`P-FUSO-BOOT-EXIGE-BANCO-EM-MEMORIA`), N2 (`P-REG-ATA-J554-SEM-POS-JUNTA`), o dado do `server.ts:56` (na `P-LOGIN-READINESS-VAZA-HOST-NO-ERRO`), e N1 (o corpo do PR #554 ficou velho; a mensagem do squash é o registro). O N4 (um ramo local já mergeado) é limpeza fora do repositório.


- **Papel:** `porteiro-pos-merge` · **identidade:** `porteiro-554-cl` · **modelo que rodou:** Claude Opus 5.5 (nível menor, declarado). Sem cruzamento, por ordem do dono de 13/11 (§C7 11(2)), declarado.
- **Corpo:** o de `origin/main:.claude/agents/porteiro-pos-merge.md`, igual ao carregado (md5 EOL-neutro `6bce03cc…`).
- **Objeto:** `origin/main` = `14b693e45f17fd422ccc12f26bf0f036f1a185a2` (squash do #554, 07:52 SP); head conferido `4ecb318d`.
- **Terreno:** worktree próprio (`w-port554`) destacado no MERGE_SHA, `npm ci` próprio; cluster `initdb` próprio (`pg-port554`), porta 55663, UTC antes do start. Nenhum container. Base viva, `.env`, 3000/5173/5432/6379 e outros worktrees intocados.
- **Evidência (P1):** `revisoes/j554/porteiro-554-evidencia.md` (E0–E13). Temporários e logs em `revisoes/j554/porteiro-554-tmp/`.
- **Início:** 07:54 SP · **fim:** 09:21 SP

## 1. O merge existe e está íntegro — OK
`gh pr view 554`: MERGED às 07:52 SP, `mergeCommit` = 14b693e4, `headRefOid` = 4ecb318d. O squash tem um pai, `521f0bcb` (a `main` anterior), e ele é ancestral do head (E1).

## 2. Promessa × diff — OK no código; corpo do PR incompleto (não grave)
- **Árvore:** `14b693e4^{tree}` = `4ecb318d^{tree}` = `61812853…`. O squash é exatamente o head conferido sobre a `main` anterior (E2).
- **Escopo:** 39 arquivos (+2230/−158), todos no PERMITIDO do plano e das Emendas 2.1, 3.1, 3.2, 3.3, 3.4 e 4. Em `prisma/` só os 3 seeds, que o §2 autoriza pelo nome. **0 arquivos em `.github/`, `Kpis/`, `schema.prisma`, `migrations/` e `package*.json`.** `git diff --check` limpo (E2).
- **Os 9 testes migrados para a fábrica** mudam só a construção do adaptador: 1 ou 2 linhas cada, nenhuma asserção removida (E12).
- **Achado N1 (não grave): o corpo do PR não descreve o que foi entregue no fim.** Ele não cita os 9 testes migrados (Emendas 3.1–3.4), o head final `4ecb318d` nem as 3 conferências (`ver-554-cl`, `ver-554b-cl`, `ver-554c-cl`). Diz "verifica: `ver-drill-cl` (a seguir)" e "OF = `dff1d667` (head final)" (corpo, l.16 e l.45). O conteúdo está certo e autorizado; o que falha é o registro no GitHub (E12).

## 3. Os números são reais — reexecutados no MERGE_SHA
| O quê | Declarado | Reexecutado por mim | |
|---|---|---|---|
| G3 (`db-fuso-utc-pontos-de-conexao`) | ≤ 217 | **6/6/0; `git grep` = 217**, sem folga | OK |
| G-ORD (`test-registration-order-guard`) | 18/18 | **18/18/0** | OK |
| `db-fuso-utc-boot` | 17/17 | **17/17/0** | OK |
| `db-fuso-utc-conexao` | 15/15 | **15/15/0** com banco (sem banco, o C5 pula) | OK |
| `db-fuso-utc-sp-db` | 6/6 | **6/6/0** com banco; 0 resíduo | OK |
| `npm run check` / `npm run build` | verde | **rc=0 / rc=0** | OK |
| **CI da `main` no MERGE_SHA** (run 43587307951) | o head tinha `backend` 5720/5718/0 nas 2 rodadas | **`backend` FAILURE: 5720/5716/fail 2/skip 2, `not ok` = 2; `docker` PULADO** | **VERMELHO** |

**Achado G1: a `main` está vermelha no MERGE_SHA.** Lido no TAP do log do job `backend` (`gh api …/actions/jobs/132424457616/logs`):
- `not ok 11 - T15 · boot real recusa super antes do Redis e aceita papel limpo`, em `tests/san3-05-runtime-role-guard-db.test.ts:1503`. O erro é "port da conexão apareceu no log" (true !== false). O pai, `not ok 4192 - B-SAN3-05`, falha junto.
- **Consequências:** o `docker` (`needs: backend`) foi pulado, logo o smoke do compose de produção e o push da imagem `erp-backend:14b693e4` para o GHCR não rodaram neste commit. A `main` anterior (`521f0bcb`, run 43579311298) estava verde.
- **O drill está sem trava:** 35 `ok … B-O6R-12`, 0 `not ok`, 0 ENOENT, o job fechou em 17 min 48 s. G3, G-ORD, VC-1 e S1–S5 também estão `ok` no mesmo log (E6).
- **A falha não é determinística.** A mesma árvore deu `ok 11 - T15` e `# fail 0` nas rodadas 43581524914 (push) e 43581528153 (pull_request).
- **Origem da asserção:** `#405`, de 2026-10-09 (`git blame`). O arquivo não está no diff do #554, mas o boot limpo do T15 passa agora pela trava nova (E8).
- **Mecanismo provável (hipótese declarada, não provada):** a asserção procura a porta "5432" como substring do log pino, e toda linha do pino traz `"time"` em epoch ms e `"pid"`. Entre 11:05:20Z e 11:05:30Z, todo `time` começa com 179465432 (`date -u -d @1794654320`), e o T15 rodou até 11:05:48Z, com duração de 21 s. Os 2 boots de recusa, que vêm antes do boot limpo e usam a mesma porta, passaram; isso descarta o hostname e aponta um campo numérico de linha.
- **O que não executei:** o T15 local no Windows não é instrumento válido (o boot real leva de 13 a 60 s aqui, contra o teto de 15 s do teste, e o T14 exige o psql do bash). O re-run do job, que decide a questão, é ação de quem entrega, não minha.

## 4. KPI — congelado (`D-GOV-PROPORCIONAL` 8(5)); não se cobra
`Kpis/` fora do diff (E2).

## 5. Registro da junta (§C7.1) — existe e bate; o pós-junta não está no repositório
- `agent-orchestration/omega/juntas/J-554-b-db-fuso-utc.md` está no MERGE_SHA, com APROVADO por unanimidade de 3 e a triagem. Bate com `revisoes/j554/J-554-ata.md`. O merge é válido (E10).
- **Achado N2 (não grave): a ata do repositório para às 21:50 de 13/11** ("Ainda não houve conferência de outra casa, merge nem porteiro").
  - Faltam: a Emenda 4, as Emendas 3.3 e 3.4, as 3 conferências (NÃO CONFERIDO → COM RESSALVA → CONFERIDO), o head `4ecb318d` e o merge.
  - Falta também o desvio declarado do papel "Confere: identidade de OUTRA casa". O que houve foi Claude, pela ordem do dono de 13/11 (§C7 11(2)), registrado em cada `ver-554*.json`.

## 6. Pendências
- **Fechada, conferida no código por amostragem:** `P-CI-O6R12-DRILL-TMP-SOME-E-TRAVA` (`pendencias.md:14562`). A G-ORD dá 18/18 no MERGE_SHA, e o drill rodou na `main` sem ENOENT e sem trava. **"FECHADA" é verdade** (E11).
- **Abertas com dono:**
  - `P-LOGIN-READINESS-VAZA-HOST-NO-ERRO` (ALTA, `:14535`, dono `B-SEC-LOG-SANITIZA`, ramo `origin/fix/sec-log-sanitiza` existe, sem PR);
  - `P-CI-BACKEND-SEM-TETO` (MÉDIA, `:14572`);
  - `P-DRILL-F2-SEM-TESTE-PERMANENTE` (BAIXA, `:14579`).
- **Achado N3 (não grave):**
  - **`P-DB-FUSO-DA-CONEXAO` (`:14500`), a pendência DONA do bloco, segue "ABERTA (em execução; PR draft deste bloco)" na `main` depois do merge**, com o critério de encerramento entregue;
  - `P-CI-BACKEND-SEM-TETO` e `P-DRILL-F2-SEM-TESTE-PERMANENTE` têm dono genérico ("um bloco de CI", "o próximo bloco que mexer no drill") e nenhum PR-alvo.
- **Dado novo para a `P-LOGIN-READINESS-VAZA-HOST-NO-ERRO`:** ela lista `src/server.ts:56` (`logger.error({ error }, …)`) como "mesma forma, sem medição (hipótese)". Medido aqui (E9): o pino não serializa a chave `error`. Um `Error` comum sai como `"error":{}`, e a mensagem "DATABASE_URL is required" some; um erro nomeado sai só com as propriedades próprias (`code`, `name`). Nos 2 casos medidos não houve vazamento, mas o operador fica sem o motivo da recusa.

## 7. Limpeza (§C5)
- `git ls-remote origin 'refs/heads/fix/db-fuso-utc*'` volta vazio: o ramo remoto foi apagado e não sobrou ramo `prova`.
- Nenhum container com 554/fuso/drill no nome; nenhum worktree do bloco além do meu.
- **Achado N4 (não grave):** o ramo local `api-tmp-fuso` (`ef4e98e7`, a base do plano), já mergeado, segue na árvore principal.
- Na árvore principal há 2 rastreados apagados (`J-515-b-ass-06.md`, `reg-noite-0911-dev.md`), da sessão em `fix/seed-org-demo-pt-br`, não do bloco. Só reporto.
- Disco: 141 GB livres; não precisa de `DEEP_CLEAN`.
- A base viva não foi medida, porque o mandato a proíbe; os testes do fuso no meu cluster deixaram 0 resíduo.

## 8. O próximo start
**(a) A trava fail-closed × os ambientes que hoje sobem (E9, boot real de `src/server.ts`, com controle):**
- **sobem:**
  - o CI (as 2 rodadas do head);
  - o dev com Postgres em UTC;
  - o dev com o banco em `America/Sao_Paulo` (a forma de um `initdb` no Windows, E7), porque a fábrica força a sessão em UTC.
- **recusa, por desenho:** a URL com `options=-c TimeZone=America/Sao_Paulo` (`DATABASE_URL_TIMEZONE_CONFLICT`, sem URL no log).
- **Achado N5 (não grave, dentro do bloco): o modo `CORE_SAAS_PERSISTENCE=memory`, que é o padrão do `env.ts:214` e do `.env.example`, deixou de subir sem Postgres acessível.**

  | Cenário | Antes (`521f0bcb`) | Agora (MERGE_SHA) |
  |---|---|---|
  | banco fora do ar | sobe | recusa depois de 5 sondas (~30 s), `SESSION_TIMEZONE_PROBE_FAILED` |
  | sem `DATABASE_URL` | sobe | recusa em 0,1 s, com `"error":{}` |

  - O controle é o mesmo worktree, só com o `server.ts` do `521f0bcb`.
  - O `tests/job-worker-bootstrap.test.ts` ("o boot REAL") passa a falhar sem `DATABASE_URL`, e o controle passa.
  - O comentário em `tests/job-worker-bootstrap.test.ts:290-292` ("persistência em MEMÓRIA … não precisa de Redis nem de Postgres") ficou falso.
  - O §1.3 do plano declarou o custo como "uma consulta no boot"; não declarou que Postgres vira obrigatório em memória. Nem o PR, nem o `.env.example`, nem o `docs/deployment.md` dizem isso.
  - Não perde dado, não vaza, não quebra permissão nem dinheiro: não é grave pelo §C7 10(3)3. Se memória sem banco ainda é ambiente suportado é pergunta de desenho; não opino, só meço.

**(b) Pendência que BLOQUEIA o próximo alvo:** nenhuma do fuso. A `P-DB-FUSO-POOLER-MEDIR` (MÉDIA) segura o **deploy de produção** desta mudança, não o start. A Q1 do dono segue aberta e segura a publicação em banco com dado real.

**(c) A regra que agora vale para todo PR: teste de banco novo com `new PrismaPg(` sobe o G3.** O teto é 217 e a `main` está em 217, **sem folga**: um `new PrismaPg(` a mais em `tests/`, fora de `tests/helpers/` e de `tests/db-fuso-utc-*`, já dá `not ok … G3`. O conserto é construir pela fábrica `createPgAdapter` de `src/database/pg-connection.ts`. A medição é a contagem `new PrismaPg(` em `tests/` (os mesmos filtros) no merge-base, no ramo e na árvore de `git merge-tree --write-tree <ramo> origin/main` (E13):

| PR / ramo (head) | Base | merge-base → ramo | Árvore mesclada | Tropeça? |
|---|---|---|---|---|
| #566 `feat/ass-09-visao-custo` (fa5e5372) e `feat/ass-09-banco` | no fuso | 217 → 217 | 217 | não |
| #565 `feat/demo-seed-isolado` (ba3e641f) | no fuso | 217 → 217 | 217 | não |
| #561 `fix/mobile-gate-chave` (8fd50887) | no fuso | 217 → 217 | 217 | não |
| `feat/billing-outbox-operable` (6fd45f9a) | no fuso | 217 → 217 | 217 | não |
| `feat/web-custos-t5` e `-t5-b` (d7331999) | no fuso | 217 → 217 | 217 | não |
| #564 `feat/mobile-prestador-15b` (598f972b) | antes (729718fe) | 224 → 224 | 217 (conflito só em `pendencias-indice.md`) | não |
| `fix/sec-log-sanitiza` (6b9fade1) | antes (d2737339) | 222 → 222 | 217 | não |
| `fix/mobile-consentimento-gps-app` (f018d136) | antes (d2737339) | 222 → 222 | 217 | não |
| `feat/mobile-consentimento-gps-17` (cddef89b) | antes (d2737339) | 222 → 222 | 217 (conflito em `decisoes.md`) | não |
| #419 `chore/agente-api-2` (f2ece5da) | antes (684e9afd) | 100 → 100 | 217 (conflito em `decisoes.md`) | não |
| #393 `chore/mandato-refs-e-preflight` (4af61a41, congelado) | antes (b404815c) | 80 → 80 | 217 (9 conflitos, inclusive `Kpis/*`) | não |

- **Nenhum PR aberto nem ramo empurrado acrescenta `new PrismaPg(` em teste: 0 ocorrências novas em cada um.** Os 6 de base antiga ainda não rodaram o G3 no CI próprio; rodam na próxima absorção da `main`, e a contagem mesclada dá 217.
- Nos 4 ramos de base antiga com código, também não há acréscimo para o G1 (`@prisma/adapter-pg`, `pg` cru ou setter de fuso em `src/`, `scripts/` e `prisma/`): 0 em cada.
- **Não medido:** trabalho local não empurrado, e a G-ORD (também nova para todo `tests/**`) nas árvores mescladas.

## Limpeza do próprio porteiro
- O cluster `pg-port554` foi parado (`pg_ctl stop -m fast`, 0 conexões) e o diretório apagado pelo caminho exato.
- O worktree `w-port554` foi removido com `git worktree remove --force` (status vazio antes, head 14b693e4).
- Nenhum container criado; nada no scratchpad. Ficam só a evidência, este parecer e `porteiro-554-tmp/` (17 MB: TAPs, logs e harness).

## O que fica para quem entrega (não conserto nada)
1. **Antes de qualquer start (G1):** re-rodar o job falho da rodada 43587307951 (mesmo SHA 14b693e4) e ler o TAP do `backend` pelo log do JOB: `not ok` 0, mais `docker` success (o smoke do compose de produção, que sobe com a trava, e a imagem no GHCR).
   - **Se o T15 repetir,** a hipótese de colisão numérica cai, e ele passa a ser tratado como `dentro-do-bloco` (a trava está no caminho do boot limpo do T15), com investigação antes de qualquer start.
   - **Se passar,** abrir a pendência do T15 com dono: a asserção casa substring da porta contra campos numéricos do pino (`time`, `pid`), e vale medir a ocorrência (escopo `pre-existente`, #405).
2. **Viajam com a próxima demanda (não graves):**
   - **N5:** o modo memória sem Postgres deixou de subir. Corrigir o comentário falso em `tests/job-worker-bootstrap.test.ts:290-292` e declarar no `.env.example` e no `docs/deployment.md` que a API exige Postgres acessível em qualquer modo, ou decidir o contrário. Pendência com dono.
   - **N3:** fechar a `P-DB-FUSO-DA-CONEXAO` e dar PR-alvo à `P-CI-BACKEND-SEM-TETO` e à `P-DRILL-F2-SEM-TESTE-PERMANENTE`.
   - **N2:** complementar a ata J-554 no repositório com o pós-junta (Emendas 3.3, 3.4 e 4, conferências, cruzamento suspenso declarado, head final, merge, este porteiro).
   - **N1:** uma nota no PR #554 ou no registro com os 9 testes migrados e o head final.
   - **N4:** apagar o ramo local `api-tmp-fuso`.
   - Levar à `P-LOGIN-READINESS-VAZA-HOST-NO-ERRO` o dado medido do `server.ts:56` (`"error":{}`).

**Fim:** 09:21 SP.

## Veredito
O bloco entregou o que prometeu: árvore igual à conferida, escopo dentro do autorizado, os números do fuso, do G3 e da G-ORD reproduzidos, e o drill sem trava na `main`. Mas o CI da `main` no MERGE_SHA, que o mandato exige verde, está vermelho (`backend` com `not ok` 2, `docker` pulado). Para a mesma árvore isso é não determinístico, e a causa, apontada mas não provada, é anterior ao bloco. Enquanto ninguém re-rodar e ler o TAP, não há prova de que a `main` está sã, nem a imagem deste commit.

BLOQUEADO: re-rodar o job `backend` falho da rodada 43587307951 (SHA 14b693e4) e ler no TAP do log do job `not ok` 0, com o `docker` success. Se o T15 do `san3-05-runtime-role-guard-db` falhar de novo, investigá-lo como dentro-do-bloco antes de qualquer start. Se passar, o start fica liberado com as ressalvas N1 a N5 viajando na próxima demanda.
