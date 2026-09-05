# PARECER DO CRITICO ADVERSARIAL — B-O6R-02 ciclo 5 (TETO) · ataque ao PLANO COMO EMENDADO, pos-execucao

- **Papel:** `critico-c5-adversarial` (corpo `dc17357`, conferido contra E1.8). Instancia NOVA do ciclo 5.
  Nao voto merito, nao planejo, nao conserto (§C7.4-bis). Max. 2 rodadas; esta e a RODADA 1.
- **Data:** 2026-09-03
- **Contexto anomalo, declarado:** o §8 do plano poe este ataque em S1, ANTES do codigo. Isso nao ocorreu
  (achado B1 do inspetor). Ataco o plano JA EXECUTADO, no head `bcf6460`. O valor do ataque muda; o metodo nao:
  cada afirmacao minha abaixo tem comando executado, ou esta nomeada como nao-medida.
- **Nada herdado como fato:** nenhuma afirmacao de ata, diario, terreno ou briefing entrou como fato sem
  re-medicao propria, exceto onde declarado [NAO RE-MEDIDO] com motivo.
- **Registro incremental (P1):** este arquivo cresce a cada medicao, na ordem em que medi.

## ESQUELETO (preenchido a medida que medido)

- [x] A0 — terreno proprio (worktree do bloco, head, arvore, Node; autorizado pelo briefing da convocacao)
- [x] A1 — decisao CP-1 (E3.3 1 linha -> 7 linhas no ci.yml): substancia re-medida por execucao
- [x] A2 — decisao CP-3(1) (fechar P-O6R-B02-RUNNER-SUMICO-SEM-SKIP como ato de registro): fundamento re-medido
- [x] A3 — decisao CP-3(2) (P10/P11/P12 nao-vinculantes): consequencia sobre os pisos; o que sobra
- [x] A4 — decisao CP-3(3) (F1-F3 NO-OP): containment re-medido
- [x] A5 — premissa central da EMENDA ("a classe do arnes esta fora"): D29 lista-6 re-executado N>=13 em cluster proprio
- [x] A6 — criterio re-baseado §9.9/E4.4 (src/** contra head pos-absorcao): honesto ou afrouxado, por execucao
- [x] A7 — o que o plano NAO previu e a execucao inventou (inventario, cada um com gravidade)
- [x] A8 — pisos remanescentes (P13/P14/A3-A6): presenca dos casos por execucao/leitura no head
- [x] A9/A10 — baseline proprio adicional (canonica 1 N=1; canonica 3 N=1; sonda de atribuicao)
- [x] ACHADOS — defeito · evidencia · gravidade · propriedade ausente
- [x] VEREDITO

---

## A0 — TERRENO PROPRIO · medido

Worktree do bloco `.claude/worktrees/agent-af6ea607f3ddf8efd` (uso autorizado pela convocacao; so leitura
git + execucao de teste com cluster proprio; `git status --porcelain` = 0 linhas ANTES — re-conferido ao fim).
Head `bcf6460` confirmado. Node `v20.19.5`. `core.autocrlf=true` (toda conferencia de conteudo por
`git show`/`git hash-object`/`git cat-file`, nunca md5 de arvore, nunca `git archive`+`tar`). Meu corpo na
arvore principal: `git hash-object` = `dc173575ec77e4c991186635af8418bdea103735` — bate com E1.8. Clusters:
descartaveis proprios `crit-c5-*` (portas efemeras via `-P`); `erp-postgres`/`erp-redis` = zero comandos.
Logs no scratchpad da sessao; exit sempre por variavel.

## A1 — DECISAO CP-1 (E3.3 "UMA linha" -> 7 linhas no ci.yml, no commit de merge) · ATACADA POR EXECUCAO · **a substancia SOBREVIVE**

O que eu media, comando a comando (worktree do bloco):

1. `git diff f895dd2 bcf6460 -- .github/workflows/ci.yml` -> **1 hunk unico**, 25+/4-, TODO confinado ao
   passo "Route suites against PostgreSQL": -4 = o comentario LUGAR RESERVADO; +25 = 7 linhas `SUITES=` +
   comentarios verbatim + 1 comentario de fechamento. Nenhum outro job/passo/env/action tocado.
2. Contagem `SUITES=`: main `f895dd2` = **27** · head `bcf6460` = **34** (delta +7). Confere com o ruling.
3. `git diff 84bb90b bcf6460 -- .github/workflows/ci.yml` = **0 linhas** — a autorizacao foi consumida no
   merge; F4-F6 nao tocaram o arquivo (criterio §10.3(iv) na forma ruled: VAZIO — satisfeito).
4. Existencia das 7 suites (`git cat-file -e`): main=**128** (ausente), branch `12c3825`=**0**, head=**0**
   nas 7. A premissa do ruling e VERDADEIRA: main-integral teria posto na main 6 suites dos ciclos 1-4
   roteadas em lugar NENHUM (+ mantido a divida da 7a).
5. DB-gate das 7 (grep no blob do head): TODAS leem `DATABASE_URL` (4-6 ocorrencias) e tem exatamente
   **1** marcador de skip cada -> sem roteamento, auto-pulariam VERDES no job `backend`. E o verde-cego
   do proprio fundamento E3.2 — o ruling aplicou ao caso das 6 o mesmo argumento que o E3 usou para a 7a.
6. `set -o pipefail` presente no MESMO bloco `run` do `tee` (l.~173 do head) e o guard de zero pulos
   (`test "$skipped" -eq 0 || exit 1`) imediatamente apos a regiao — a linha que morde existe e esta viva.

**Julgamento do achado:** a EMENDA da letra E3.3(a)/(b)/(c) pelo ruling CP-1 foi feita por quem depois
executou (acumulacao ja nomeada em R1 do inspetor), MAS a substancia e a UNICA resolucao que nao cria
verde-cego nem quebra o job — e esta sustentada por execucao (P4 do diario: 3x 52/52/0 pulos; minha
re-medicao da forma estatica acima). Sobre E3.3(b) ("ATUALIZADO, nunca apagado"): o comentario de 1 linha
em `84bb90b` REGISTRA que a suite entrou, que a pendencia fechou e que o dono e este PR — o proposito
declarado da clausula esta cumprido; o que se perdeu (a explicacao historica de 4 linhas) vive no
historico git. **Nao e defeito que a junta precise ver como bloqueio; e materia da C3 julgar contra o
terreno §7 + ruling, como o CP-3(4a) ja determinou.**

## A2 — DECISAO CP-3(1) (fechar `P-O6R-B02-RUNNER-SUMICO-SEM-SKIP` como ATO DE REGISTRO citando o #359) · **fundamento CONFIRMADO por execucao**

1. O piso de denominador EXISTE na main: `git show f895dd2:scripts/run-backend-tests.mjs` l.97 —
   "B-O6R-ARNES · C-E (fecha `P-O6R-B02-RUNNER-SUMICO-SEM-SKIP` e o B-2c4) — PISO DE DENOMINADOR".
2. O runner do head E o da main sao o MESMO blob (`335f6a1` nos dois, por `git ls-tree`) — o bloco nao
   tocou o runner; fechou registro, nao implementou. Exatamente o que o ruling determinou.
3. O texto do fechamento no head (pendencias.md l.3983): "FECHADA (2026-09-02 — corrigida pelo #359;
   registro reconciliado pelo PR do B-O6R-02 c5) · dono da correcao: B-O6R-ARNES (#359)" — autor da
   correcao e reconciliador distintos e nomeados. O residuo vivo virou pendencia propria
   `P-O6R-B02-CRASH-NO-LOAD-SEM-SKIP` (4 ocorrencias no head, escopo pre-existente, produtor
   `src/database/prisma.ts:12` nomeado). Nada fabricado, nada fechado em silencio.

## A4 — DECISAO CP-3(3) (F1–F3 NO-OP) · **containment RE-MEDIDO: procede**

`git diff 12c3825 f895dd2 -- scripts/run-backend-tests.mjs` -> **0 linhas de conteudo do lado-branch
ausentes na main** (unico `^-` e o header do diff). Idem `tests/npm-test-runner-guard.test.ts` (**0**).
A materia de F1–F3 (C6/C7/C8) vive na main via #359, byte a byte igual ou superconjunto do lado-branch.
NO-OP nao foi atalho: foi medido duas vezes (CP-1 item E pelo orquestrador; agora por mim).

## A6 — CRITERIO RE-BASEADO §9.9/E4.4 (`src/**` contra head POS-ABSORCAO) · **HONESTO, nao afrouxamento — provado**

1. `git diff --name-only 84bb90b bcf6460 -- 'src/**'` = **VAZIO** — as fatias nao tocaram produto.
2. `git diff --name-only 12c3825 bcf6460 -- 'src/**'` = exatamente `src/modules/authority/authority-password.ts`.
3. **A prova de que nao ha contrabando:** o blob desse arquivo no head = `3648006` = o MESMO blob da main
   `f895dd2`. Ou seja, o unico delta contra `12c3825` e byte a byte o que a main ja publicou (#366, C1 do
   SAN2-4b, correcao de seguranca julgada por outra junta). O criterio antigo reprovaria o bloco por
   aritmetica do merge, nao por merito; o novo mantem a regra ("o bloco nao escreve em src/") mudando so o
   referencial. Ancoras do financeiro intactas: `e352c6c` / `9be7caf` conferidas por `ls-tree` no head.

## A8 — PISOS REMANESCENTES POS-CP-3 (P13/P14/A6 + metas de bateria) · presenca conferida no head

- Suite `tests/financial-entry-delete-reverse-race-db.test.ts` no head: **9 casos**; entre eles
  `[C9/P13]` sondas (v) e (vii) (23503, constraint `financial_entries_reversal_pair_fk` nomeada),
  `[C10/P14]` RLS real sob papel `NOBYPASSRLS` criado por `createEphemeralRole` do arnes (mecanismo
  unico — 0 token de escrita de catalogo no arquivo), `[A6]` censo com orfao semeado em tenant proprio.
  Piso P13 (>=2 casos) OK; P14 (1 caso) OK; A6 (1 caso) OK.
- Migration `20260871000000_add_reversal_pair_fk` presente (106 migrations no head): censo `DO`
  fail-closed nomeando `P-O6R-B02-ORFAOS-LEGADOS` com CONTAGEM apenas (nunca tenant_id — allowlist §6),
  `NOT VALID` + `VALIDATE`, down documentado no rodape, `prisma/schema.prisma` intocado. E letra por
  letra o §4 do plano.
- **Sobre "sobrou piso suficiente?":** o CP-3(2) removeu P10/P11/P12 (casos de arnes) mas MANTEVE as
  metas de bateria do §6 — canonica 3 10/10 denominador identico + Δroles=0, canonica 2 15/15, corrida
  x10 — que sao precisamente a resposta ao veto do arnes do ciclo 4 ("o numero sobrevive a forma").
  O bloco nao ficou sem regua: ficou com a regua DELE (numero-sob-forma + FK + RLS real + registros),
  e a regua do arnes vive no #359 ja mergeado. Minha re-medicao da premissa esta no A5 abaixo.

## A3 — DECISAO CP-3(2) (P10/P11/P12 nao vinculam) · **consequencia direta da decisao do dono, nao afrouxamento do orquestrador**

A EMENDA item 1 (decisao do dono, `D-JUNTA-ESCOPO-E-CALIBRACAO`) diz textualmente: "Saem daqui: os 3
escritores de ACL fora do mecanismo unico, o teardown resiliente, o sweep por familia, o piso de
denominador do runner e os guards correspondentes (o §2-C6, §2-C7 e §2-C8 deste plano)". P10, P11 e P12
sao os criterios de aceite de C6, C7 e C8 — materia que saiu COM eles. O CP-3(2) apenas escreveu a
aritmetica que o planejador deixou por fazer (o §6 e o §12 do corpo nunca foram emendados — DEFEITO DO
PLANO, ver ACHADO-3). E o CP-3(2) preservou a valvula certa: "se a classe do arnes reaparecer em
qualquer medicao do F4-F6: CP-4, escopo pre-existente, devolve — nao conserta" + o passo §10.1(11)
(vermelho fora das canonicas -> arranjo completo em P-O6R-ARNES-ISOLAMENTO, sem conclusao causal).
**A pergunta "e se a classe reaparecer?" TINHA resposta escrita antes do codigo.** Verifiquei tambem a
contrapartida em registro: a emenda mandada pelo §12 a `P-O6R-ARNES-ISOLAMENTO` EXISTE no head
(pendencias.md l.5615+: objeto disputado nomeado — tupla de ACL `pg_namespace.nspacl`/`pg_class.relacl`;
`pg_authid` 0/150).

## A7 — O QUE O PLANO NAO PREVIU E A EXECUCAO INVENTOU · inventario, item a item, com o que re-medi

| # | invencao | fundamento re-medido por mim | sobrevive? |
|---|---|---|---|
| 1 | CP-0: passo 3 do preflight checava HEAD, ruling o moveu p/ origin/main | `D-TETO-DOIS-CICLOS` em `12c3825` = **0**, em `f895dd2` = **2**; obituario ausente em `12c3825` (ec=128), presente na main (ec=0) — a branch de 19/08 ANTECEDE os marcadores por construcao | SIM — o check como escrito reprovaria a linhagem CERTA |
| 2 | CP-1: `ci.yml` main-integral -> uniao dirigida (7 linhas no commit de merge) | ver A1 (6 suites branch=0/main=128; DB-gate 1 skip-marker cada; hunk unico confinado; guard de zero pulos vivo) | SIM — substancia |
| 3 | CP-1 adendo: `pendencias.md` main-integral -> uniao dirigida (4 blocos reanexados) | os 4 blocos EXISTEM no head (`P-O6R-B01-PORTEIRO-357-A109FD7`, `P-O6R-B02-INDISPUTE-RESTORE`, `P-O6R-B02-CHEQUE-UNCLEAR`, `D-DIVERGENCIA-C4-PONTA-AUSENTE` — 1 ocorrencia cada, grep no blob) | SIM |
| 4 | CP-3(1): fechar RUNNER-SUMICO como ato de registro | ver A2 (piso na main l.97 nomeando a pendencia; runner head==main blob `335f6a1`; residuo carvado) | SIM |
| 5 | CP-3(5): autorizacao preventiva de `Kpis/app.js` via kpi-freeze | `git diff 84bb90b bcf6460 -- Kpis/app.js` = **1 linha** (`var FROZEN`); guard 22/22 na bateria | SIM — e a §5 do plano tinha o buraco que o ARNES ja havia registrado |
| 6 | F6.3: NOTA §A2 contra o proprio CP-3(F) ("nunca aguardando_merge" x guard exige espelho do registro) | estados dos 8 achados do bloco = `aguardando_merge` no head; e o estado VERDADEIRO na autoria (a junta nao ocorreu) | SIM — a medicao venceu a frase, declarado |
| 7 | Troca de executor (Codex -> Claude Code) em F4-F6 | ordem verbal do dono transcrita no diario (quarto registro); divergencia §A2 registrada | fato do dono, nao invencao do plano |

**As DUAS promessas de ruling que a execucao NAO cumpriu** (viraram ACHADO-1) e **o item do §12 que
ficou orfao** (ACHADO-2) estao na secao ACHADOS.

**Sobre o pulo do S1 (B1 do inspetor), com a evidencia pinada:** o gate EXISTIA por escrito em tres
lugares — plano §8 ("S1 ... antes de codigo"), apenso E1.2 ("Permanece porque este E bloco de
invariante") e o PROPRIO comando §7.3 (nota: "Entre o 7.2 e o 7.3 corre o S1 ... retome o 7.3 com o
parecer do critico EM MAOS"). O S2 rodou sem o parecer em maos, e o pronunciamento do CP-3 ("F4 —
LIBERADO", item 6) nao conferiu a existencia do insumo que o proprio comando declarava pre-requisito.
**Nao e defeito do plano — e violacao do plano pela execucao**, ja bloqueada pelo inspetor e curada por
esta passada. O que esta passada tinha de responder — "o plano tinha defeito que o S1 adiantado teria
pego e que a execucao herdou?" — esta respondido nos ACHADOS: os defeitos de plano que encontrei (§6/§12
nao emendados pela EMENDA; §12 com item orfao; devolucao "ao planejador" com planejador morto por
autodeclaracao) foram, em 3 de 4 casos, PEGOS pelos proprios rails da execucao (S2 do dev + CP-3);
o quarto (BATERIA-CANONICAS-1-2) passou por todos e esta nomeado aqui.

## A5 — A PREMISSA CENTRAL DA EMENDA ("a classe do arnes esta fora; o #359 a matou") · **RE-MEDIDA POR MIM: SUSTENTA**

Forma declarada: worktree do bloco, head `bcf6460`, Node v20.19.5, cluster descartavel PROPRIO
`crit-c5-pg` (postgres:16, porta efemera 32777) + `crit-c5-red` (redis:7, 32778), `npx prisma migrate
deploy` ec=0 com **106** migrations conferidas por SELECT em `_prisma_migrations` (inclui a FK deste PR —
o censo `DO` nao abortou em base limpa, de carona provando o caminho feliz do up), `DATABASE_URL`/
`REDIS_URL` exclusivos meus, `CORE_SAAS_PERSISTENCE` nao exportada. Comando por rodada:
`node scripts/run-backend-tests.mjs <lista-6 NOMEADA do apenso V.3> > log 2>&1; ec=$?`. **N=13
sequenciais**, logs `crit-d29-r01..13.log` no scratchpad.

| resultado | valor |
|---|---|
| rodadas verdes | **13/13 ec=0** |
| forma/denominador | `6 arquivo(s) · 37 teste(s) · pass 37 · fail 0 · skipped 0` — IDENTICO nas 13 |
| hits `XX000` nos logs | **0 em 13/13** |
| vaza-metro pos-13 rodadas | roles nao-sistema = **1** (so `postgres`); `auth_identities` = **0**; `auth_identity_link_events` = **0** |

O vermelho-controle historico (5/13 do planejador em `12c3825`; 8/13 verdes) vale como ESPECIE, nao como
forma (heads/migrations distintos — regra E4.5, que mantenho). Na MINHA forma, no head a julgar, a classe
nao reaparece e o teardown de roles nao vaza. **A EMENDA item 1 nao deixou o bloco descoberto: deixou-o
sobre um chao que EXISTE.** (O que a lista-6 nao exercita — a canonica 3 completa — e mandato N>=10 da
cadeira C1; nao o repito aqui, e digo isso com todas as letras.)

## A9 — SONDA DE ATRIBUICAO DO VAZAMENTO +5/+5 (B.8 do diario) · **a precisao do nome NAO sobrevive a execucao**

O diario B.8 mediu por execucao o Δ por tabela (+5 `auth_identities`, +5 `auth_identity_link_events`
por rodada verde da canonica 3) — isso EU NAO CONTESTO (e coerente com meu D33 local). O que ataco e a
frase de publicacao: o KPI diz "produtor NOMEADO por execucao", mas os NOMES de arquivo vieram de grep
("Produtores candidatos por grep: auth-identity-backfill-db, auth-identity-links-db,
auth-identity-link-events-db, auth-identity-role-real-db"). Sondei os 4, um a um, isolados, no meu
cluster (mesma env do A5, `node --test --import tsx tests/<s>.test.ts`; snapshot de linhas antes/depois):

| suite | rodou? | Δ auth_identities / Δ link_events |
|---|---|---|
| auth-identity-backfill-db | 6/6 pass, 0 skip | **0 / 0** |
| auth-identity-links-db | 15/15 pass, 0 skip | **0 / 0** |
| auth-identity-link-events-db | 5/5 pass, 0 skip | **0 / 0** |
| auth-identity-role-real-db | 10/10 pass, 0 skip | **0 / 0** |
| **core-saas-role-authority-db** (a atribuicao de 2026-08-19, citada pelo PROPRIO plano §0.a — e AUSENTE da lista do B.8) | 5/5 pass, 0 skip | **+1 / +1** |

**O grep falhou porque o escritor entra pela camada de servico** (`src/modules/core-saas/services/
core-saas.service.ts` e os repositorios de identity-link), nao pelo nome literal da tabela — os 4
arquivos que CONTEM a string limpam atras de si; um que NAO a contem vaza. Os +4/+4 restantes por rodada
completa tem produtores ainda nao nomeados (ha ~12 suites `-db` exercitando core-saas; nao as varri —
declaro o limite). **Materia continua `pre-existente`** (EMENDA item 1, trilha de identidades) — o achado
e de PRECISAO DO REGISTRO, nao de reabertura de classe: a mesma familia de defeito ("a frase afirma mais
do que a execucao exercitou") pela qual este bloco ja foi reprovado no ciclo 4. Vira ACHADO-4.

## A10 — BASELINE PROPRIO ADICIONAL · canonica 1 (N=1) e canonica 3 (N=1, spot-check; o N>=10 e mandato da C1)

**Canonica 1** (`env -u DATABASE_URL -u REDIS_URL -u CORE_SAAS_PERSISTENCE npm test`, worktree do bloco,
head `bcf6460`, Node v20.19.5, N=1, log `canonica1-r1.log`):
`ec=1 · 261 arquivo(s) · 2485 teste(s) · pass 2419 · fail 1 · skipped 65` — o UNICO vermelho e o
ambiental DECLARADO (`not ok 86 - tests/core-saas-role-authority.test.ts`, com o PISO DE DENOMINADOR do
#359 nomeando o arquivo — o detector que o CP-3(1) citou, MORDENDO ao vivo na minha rodada).
**Isto responde uma duvida que o diario deixava aberta:** o B.2 publicou canonica 1 com `fail 4` (3 do
guard de paridade de KPI, corrigidos no proprio F6) medida ANTES da correcao; no head FINAL a composicao
e `fail 1` = so o pre-existente declarado. Medido por mim, nao inferido. (Nota para a junta: a publicacao
do diario e honesta — composicao nomeada — mas o numero da canonica 1 no head final e ESTE.)

---

# ACHADOS — defeito · evidencia executada · gravidade · propriedade ausente

> Nenhum achado abaixo propoe conserto. Gravidades na escala do meu contrato: **bloqueia** / **ajuste** / **nota**.

## ACHADO-1 — Promessas de ruling nao cumpridas e nao declaradas: o conserto do arquivo do comando
- **Defeito:** o ruling do CP-0 (item 2) e o do CP-1 (item C) prometeram, por escrito, que o conserto do
  passo 3 do preflight §3.3 (checava HEAD; devia checar origin/main) e o do `head -120` da sonda §7.1.b
  "entra no PR deste bloco, no fim". Nao entrou, e o nao-cumprimento nao foi registrado como descarte
  consciente em lugar nenhum (diario, pendencias, KPI).
- **Evidencia:** `git log 84bb90b..bcf6460 -- agent-orchestration/codex/comandos/B-O6R-02-ciclo5.md` =
  **vazio**; no blob do head, o passo 3 segue `git show HEAD:AGENTS.md | grep -c ...` (l.176-178) e o
  `head -120` segue na l.579. Agravante estrutural: o §5.1 do proprio comando nao lista o arquivo-mae
  (o glob `B-O6R-02-ciclo5-*.md` nao casa `B-O6R-02-ciclo5.md`) — o ruling criou uma obrigacao que o
  escopo escrito nao permitia cumprir, e ninguem nomeou a contradicao.
- **Gravidade:** **ajuste** (registro/processo; nada de produto). Mas note-se: e a MESMA classe medida
  pela auditoria de 28/08 como bloqueante final em 11/16 ciclos — promessa de processo que evapora.
- **Propriedade ausente:** *toda obrigacao criada por ruling de checkpoint tem destino verificavel no
  proprio PR (cumprida, ou descartada POR ESCRITO com motivo) — e ruling nao cria obrigacao fora do
  escopo §5 sem emenda-lo na mesma linha.*

## ACHADO-2 — O item orfao do §12: `P-O6R-B02-BATERIA-CANONICAS-1-2` segue ABERTA com "dono: a atribuir"
- **Defeito:** o §12 do plano lista a pendencia em "Fechar com o PR (status na propria pendencia)" e o
  A4 FOI entregue (canonicas 1/2/3 publicadas com N e forma — diario B.2/B.4/B.5, KPI; minha re-medicao
  A10 confirma a substancia). O registro nao acompanhou: e o UNICO dos 7 itens da lista do §12 sem
  fechamento no head.
- **Evidencia:** `git show bcf6460:agent-orchestration/controle/pendencias.md` l.3806-3813 — entrada sem
  apenso de fechamento, `status: ABERTA · dono: a atribuir`; as outras 6 tem "FECHADA (2026-09-02 ...)".
  O proprio CP-3 nao a re-enumerou (decidiu RUNNER-SUMICO e calou sobre esta).
- **Gravidade:** **ajuste** (registro; a substancia esta entregue e re-medida).
- **Propriedade ausente:** *a lista "fechar com o PR" do plano e conferida item a item contra o head
  antes da bateria terminar — um item entregue-mas-nao-registrado e a imagem invertida do over-claim.*

## ACHADO-3 — Defeito do PLANO que a execucao teve de remendar: a EMENDA nunca desceu aos §§ vinculantes
- **Defeito:** a EMENDA do orquestrador (28/08) removeu C6/C7/C8 do bloco, mas o corpo do plano seguiu
  intocado nos tres §§ que VINCULAM: §5 l.131 (lista 5 arquivos de C6/C7/C8 no escopo do dev), §6
  l.137-149 (declara P10/P11/P12 "pisos vinculantes") e §12 l.254 (manda fechar RUNNER-SUMICO "C7").
  Quatro apensos posteriores (E1/E1.10/E3/E4) emendaram DUZIAS de outros pontos e nenhum tocou §5/§6/§12
  — as contradicoes so foram neutralizadas em runtime, pelo S2 do dev (que parou certo) + CP-3. No teto,
  cada contradicao interna e um dado que so nao custou o bloco porque o executor parou em vez de escolher.
- **Evidencia:** §4.3 do comando ("DUAS CONTRADICOES INTERNAS NAO EMENDADAS — levante, nao obedeca") +
  auditoria S2 §3 (DIVERGE documental) + pronunciamento CP-3 itens 1-2 (as decisoes). Minha leitura do
  plano de 847 linhas confirma: nenhum apenso emenda §6 l.137-149 nem §12 l.254.
- **Gravidade:** **nota** (ja neutralizado por rails que FUNCIONARAM; sem efeito residual no head — A2/A3
  re-medidos). Registrada porque e defeito DO PLANO, e o meu mandato e o plano.
- **Propriedade ausente:** *emenda que muda escopo desce, na mesma passada, a TODOS os §§ vinculantes
  (aceite §6, escopo §5, registro §12) — apenso que so reescreve a narrativa deixa minas armadas.*

## ACHADO-4 — Publicacao "produtor NOMEADO por execucao" com nomes que a execucao REFUTA
- **Defeito:** o KPI/history e o diario B.8 publicam o vazamento +5/+5 da canonica 3 "com produtor
  NOMEADO por execucao"; o que foi nomeado por execucao foram as TABELAS; os arquivos foram "candidatos
  por grep" — e os 4 candidatos, executados isolados, vazam **0/0**, enquanto o vazador ja atribuido em
  2026-08-19 e citado pelo PROPRIO plano §0.a (`core-saas-role-authority-db`) vaza **+1/+1** e esta FORA
  da lista do B.8. O grep falhou por construcao: os escritores entram pela camada de servico
  (`core-saas.service.ts`), nao pelo nome literal da tabela.
- **Evidencia:** minha sonda A9 (tabela acima; logs `atrib-*.log`): 4 candidatas 36 testes rodados, 0
  skip, Δ=0/0 nas quatro; `core-saas-role-authority-db` 5/5 pass, Δ=+1/+1. Materia `pre-existente`
  (EMENDA item 1) — nao reabre classe; fere a PRECISAO da publicacao.
- **Gravidade:** **ajuste** (correcao de registro na publicacao/emenda de `P-O6R-ARNES-ISOLAMENTO`; e a
  familia "a frase afirma mais do que a execucao exercitou", que ja reprovou este bloco no c4 — nao pode
  ir para a main como esta escrita).
- **Propriedade ausente:** *"nomeado por execucao" so se diz de nome que uma execucao isolou; candidato
  de grep se publica como candidato de grep.*

## ACHADO-5 — O plano nao nomeia quem responde checkpoints depois que o planejador se autodeclara morto
- **Defeito:** o plano l.3: "Encerro a participacao ao entregar este plano". O §8-S2 e o §13.1:
  "Divergencia -> devolve ao planejador". Devolve a QUEM? A execucao inventou (orquestrador assume sob
  Fable, `D-PLANEJADOR-MODELO-FABLE` "satisfeito por sessao") — e deu certo AQUI porque os fundamentos
  eram medidos (A1-A4), mas a mesma pessoa acumulou decisor-de-checkpoint e executor de F4-F6, que e o
  risco R1 que o inspetor pesou. A lacuna e do plano.
- **Evidencia:** plano l.3 x §8-S2/§13.1(f); pronunciamento CP-3 emitido pelo orquestrador; quarto
  registro do diario (troca de executor).
- **Gravidade:** **nota** (para a ata do ciclo e para blocos futuros).
- **Propriedade ausente:** *todo plano com checkpoints de devolucao nomeia o SUCESSOR do papel de
  planejador (identidade ou regra de sucessao) antes de o titular sair de cena.*

**Canonica 3, spot-check N=1** (mesma env do A5, `npm test` com `DATABASE_URL`/`REDIS_URL` meus,
`CORE_SAAS_PERSISTENCE` e `RBAC_DB_PARITY` ausentes, snapshot antes/depois, log `canonica3-r1.log`):
`ec=0 · 261 arquivo(s) · 2771 teste(s) · pass 2769 · fail 0 · skipped 2` — **denominador IDENTICO ao
publicado (2771)**, 0 `not ok`; vaza-metro: **roles 15->15 (Δ=0)**; linhas `auth_identities` +5,
`auth_identity_link_events` +5, `permissions` ->15 (idempotente) — **o Δ publicado no B.4/B.8 reproduz
no MEU cluster**. Os 2 hits de `XX000` no log sao o NOME do caso `(PA) sonda de barreira ... nao produz
XX000`, que passou (`ok 701`) — como o B.9 descreveu. N=1 e spot-check de forma, nao substitui o N>=10
da cadeira C1; declaro o limite.

---

# O QUE FICOU SEM EXECUTAR (nomeado, com motivo)

- **Canonica 3 N>=10, canonica 2 N>=15, corrida x10, D34/D35 nas duas pontas:** mandato de MERITO das
  cadeiras C1/C2/C3 (cada uma re-executa no seu cluster); repetir aqui gastaria o relogio do teto sem
  somar independencia — e eu nao voto merito. Fiz N=1/N=13 onde a PREMISSA do plano era o alvo.
- **Varredura dos +4/+4 restantes do vazamento** (alem do `core-saas-role-authority-db` +1/+1): ha ~12
  suites `-db` exercitando core-saas; materia `pre-existente` com dono (`P-O6R-ARNES-ISOLAMENTO`) — o
  ACHADO-4 ja esta provado com o que medi.
- **O job `backend-postgres` no CI real** (prova final do fechamento condicionado de
  `P-O6R-B02-SUITES-LIST-CI`): so existe quando o PR abrir; juiz nomeado = CI + porteiro.
- **PD:** NAO reabri premissa nenhuma — nenhum dos meus achados derruba premissa do plano como emendado
  (todos sao registro/publicacao/processo); logo nao ha PD a registrar (§C7.3 nao acionado).

# LIMPEZA

Clusters proprios `crit-c5-pg`/`crit-c5-red` (portas efemeras 32777/32778, criados com `--rm`)
derrubados — `docker ps -a` restam `erp-postgres`/`erp-redis` (ZERO comandos meus, nem leitura) e os
containers do bloco vizinho `B-O6R-07` (`dev-c2-pg`/`dev-c2c-redis`, NAO tocados). Worktree do bloco:
`git status --porcelain` = **0 linhas** apos todas as medicoes. Arvore principal: unico artefato novo meu
e ESTE parecer (entregavel). Logs (`crit-d29-r01..13`, `atrib-*`, `canonica1-r1`, `canonica3-r1`,
`migrate`) no scratchpad da sessao, fora do repo. Nenhuma mutacao de arquivo rastreado; nenhum
`sed -i`/`git archive`/heredoc-para-rastreado; nenhuma junction.

---

# CONCLUSAO — o plano como emendado SUSTENTA o que a execucao entregou?

**SUSTENTA.** Cada premissa que ataquei por execucao aguentou: a decisao CP-1 e a unica que nao fabrica
verde-cego nem quebra o job (A1, re-medida estatica e por existencia/DB-gate das 7); o CP-3(1) fecha uma
pendencia cuja correcao EXISTE na main e cujo detector eu vi morder ao vivo (A2, A10); o CP-3(2) e
aritmetica da decisao do dono, com valvula escrita para reaparicao da classe (A3); F1-F3 NO-OP tem
containment zero-linha re-medido (A4); a premissa central da EMENDA — "a classe do arnes esta fora" —
saiu **13/13, 0 XX000, 0 role vazada** na minha forma barata e **2771 identico, Δroles=0** no meu spot da
canonica 3 (A5, A10); o criterio re-baseado do §9.9 e honesto ate o blob (A6); os pisos remanescentes
existem no head e bastam para o que o bloco AGORA significa (A8). O pulo do S1 foi violacao da execucao
contra um gate que o plano TINHA por escrito — bloqueada pelo inspetor e curada por esta passada; nenhum
dos meus achados e algo que o S1 adiantado teria pego e o codigo herdou.

**O que a junta PRECISA ver antes de votar** (achados entregues, sem conserto proposto): ACHADO-1
(promessas de ruling nao cumpridas nem descartadas por escrito), ACHADO-2 (item orfao do §12 —
BATERIA-CANONICAS-1-2 aberta com a substancia entregue), ACHADO-4 (publicacao "produtor nomeado por
execucao" com nomes de grep que a execucao refuta — mesma familia do over-claim que reprovou o c4; nao
deve ir a main como esta), e as notas ACHADO-3/5 (defeitos do plano ja neutralizados, para a ata e para
os proximos planos).

VEREDITO: PLANO ROBUSTO — como emendado (corpo + ERRATA S0 + EMENDA + E1/E1.10 + E3 + E4 + rulings CP-0/CP-1/CP-3), sustenta o que a execucao entregou; os criterios de aceite remanescentes sao falsificaveis pelas cadeiras (N, forma, env, head e migrations declarados em cada numero; re-medidos por mim em D29 N=13 e canonicas 1 e 3 N=1). Viram requisito explicito diante da junta: (i) destino por escrito das duas promessas de ruling sobre o arquivo do comando (ACHADO-1); (ii) fechamento ou re-atribuicao registrada de P-O6R-B02-BATERIA-CANONICAS-1-2 (ACHADO-2); (iii) correcao da frase de atribuicao do vazamento na publicacao e na emenda de P-O6R-ARNES-ISOLAMENTO — candidatos de grep nao sao "produtor nomeado por execucao", e o vazador executado (`core-saas-role-authority-db`, +1/+1) esta fora da lista publicada (ACHADO-4). Rodada 2 so se o orquestrador contestar com execucao.
