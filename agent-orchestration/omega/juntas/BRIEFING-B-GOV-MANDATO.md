# Briefing da junta — `B-GOV-MANDATO` (PR #393)

- **Objeto julgado:** o head de `chore/mandato-refs-e-preflight`, que **cada cadeira resolve por si**
  (`git rev-parse HEAD` no seu worktree, conferido contra `scripts/mandato-refs.sh 393`). **O briefing não
  crava SHA de propósito:** a primeira versão dele trazia `1c5437daa` — nove caracteres, completados de
  cabeça pelo orquestrador, que **não resolve** (`fatal: Needed a single revision`). Era a sexta instância
  da classe que este bloco existe para fechar, cometida no briefing do próprio bloco. Identificador se LÊ.
- **Base:** `origin/main` em `fc3363e3`. **CI:** 14/14 verdes no objeto, 0 pendente, 0 ruim.
- **Quórum: MAIORIA DE 3, SEM crítico.** Justificativa §C7.1-ter(b): o bloco **não toca** dinheiro,
  segurança, permissão nem perda de dado — é ferramenta de processo. `src/`, `prisma/`, `migrations/`,
  `frontend/` e `mobile/` estão **fora do diff** (a cadeira C3 confere por execução, não por esta frase).

## O que o bloco entrega

`scripts/mandato-refs.sh` (imprime head, base, merge-base, check-runs e o `approved_head` **lido da ata**),
`scripts/mandato-preflight.sh` (rejeita mandato que não separe `MEDIDO` de `HIPÓTESE`, que traga número sem
`medido por:`, hipótese sem comando que a derrube, ou SHA que não apareça nas refs) e
`tests/mandato-refs.test.ts` (6 casos, com vermelho-controle).

**Por que existe:** a peça 1 do diagnóstico do loop — a premissa entrava pelo mandato do orquestrador
**escrita como fato**, e o ciclo 3 inteiro do `B-O6R-11` apontou para a classe que não perde dado hoje.

## As três cadeiras

| cadeira | pergunta única |
|---|---|
| **C1 — fail-closed do pré-voo** | ele **rejeita mesmo**? Prove por mutação: mandato correto passa; cada classe de rejeição rejeita; e **ache classe que ele NÃO pega** e ninguém declarou |
| **C2 — a ferramenta responde à pergunta FEITA** | o `mandato-refs.sh` devolve o `approved_head` **da ata** para #390/#391/#392 (`fbda96b0`/`3a0ea095`/`7822deaf`)? O vermelho-controle quebra mesmo com o matcher errado? |
| **C3 — escopo, KPI e registro** | diff dentro do permitido; **3058/3060 por reexecução** com N e forma; o backfill do #392 (`approved_head 7822deaf` da ata, **não** `5cfcd7d3` do merge); índice de pendências pelo **gerador** |

## Inelegibilidade, conferida por nome

- **O orquestrador desta sessão é INELEGÍVEL como jurado:** escreveu `mandato-refs.sh`,
  `mandato-preflight.sh` e `tests/mandato-refs.test.ts`. **A junta julga código do orquestrador.**
- **O desenvolvedor `aa051e8cc3eb1c1a0` é INELEGÍVEL:** escreveu o KPI, o registro e a pendência do bloco.
- As três cadeiras nascem com **identidade nova** e não herdam nada de ata anterior como fato.

## Já declarado — cobrar isto como novidade é reprovar por construção

- `P-GOV-MANDATO-PREFLIGHT-CAMINHO-POR-BASENAME` (**BAIXA**, `dentro-do-bloco`): a checagem de caminho usa
  `find -name <basename>`, logo confere **nome**, não **caminho** — 20/20 caminhos errados com basename real
  passam; 5/5 com basename falso são rejeitados. **Achada pela sonda do próprio bloco e NÃO consertada**
  (§C7.4-bis: quem acha não conserta). Há razão técnica declarada: a cláusula existe para o `lib/…` do
  Flutter, e apertar errado faria o pré-voo rejeitar mandato correto.
- **O pré-voo rejeita o próprio mandato deste bloco** quando revalidado hoje, por SHA velho. É o mecanismo
  funcionando, não defeito.
- Flutter **não** foi reexecutado; o KPI diz isso em voz alta. Cobrar reexecução de Flutter num bloco que não
  toca Flutter é reprovar por construção.

## Regra de voto

Todo voto declara **`gravidade`** (`bloqueia` | `ajuste` | `nota`) **e `escopo`** (`dentro-do-bloco` |
`pre-existente`, este **com evidência de data ou origem** — sem ela, conta como `dentro-do-bloco`).
Achado `pre-existente` **não reprova**: vira pendência nomeada com bloco dono. **"Não consigo medir" =
REPROVADO.** Nenhuma cadeira propõe correção (§C7.4-bis).

---

# Ciclo 2 — briefing da junta 2 (PR #393)

> Esta seção existe porque o `inspetor-de-terreno-da-junta` **BLOQUEOU** o start da junta 2 (achado **B2**):
> três enunciados que o orquestrador tinha dito **só em mensagem** não eram confirmáveis por execução por
> nenhuma cadeira. Instrução que vive só no chat não é regra. Estão abaixo, em arquivo rastreado.

- **Objeto julgado:** o head de `chore/mandato-refs-e-preflight`, que **cada cadeira resolve por si**
  (`git rev-parse`, cruzado com `gh pr view 393 --json headRefOid`). O ramo andou **13 vezes** nesta
  madrugada — nenhum SHA escrito por terceiro vale.
- **Base:** `origin/main` em `fc3363e3`. **Quórum: MAIORIA DE 3, sem veto** — reprovar exige **duas** cadeiras.
  Justificativa (§C7.1-ter(b)), a conferir no diff: o bloco **não toca** dinheiro, segurança, permissão nem
  perda de dado; zero byte de `src/`, `prisma/`, `migrations/`, `frontend/`, `mobile/`, `.github/`.

## As três cadeiras

| cadeira | identidade | competência |
|---|---|---|
| **C1′** | `guardiao-fail-closed` | fail-closed do pré-voo; **propriedade × forma**, provado por mutação |
| **C2′** | `medidor-de-cobertura-do-artefato` | **o teste mede o artefato**, não uma réplica (§C7.4, criado para esta lacuna) |
| **C3″** | `jurado-mandato-c3b-fronteira-numero-registro` | escopo, KPI e registro, **por geração** em vez de amostra herdada |

**Por que C3″ e não a C3 do ciclo 1.** O §10 do plano designava `jurado-mandato-c3-escopo-kpi-registro`, e o
inspetor **bloqueou** (achado **B1**): ela **votou** no ciclo 1 (esta ata, ciclo 1, APROVADO) **e é autora dos
achados C3-01 e C3-02**, que o plano do ciclo 2 põe no mapa achado→entrega — julgaria o atendimento do próprio
achado, e re-mediria os `3058/3060` que ela mesma publicou. A exceção alegada no plano ("aprovou, não achou
bloqueante, mediu por execução") **não existe em norma escrita** (`grep` em `decisoes.md` e `CLAUDE.md` = 0), e
há precedente executado: `J-B-O6R-02-ciclo4.md` declarou inelegíveis **todos os cinco votantes** do ciclo
anterior. **A cadeira nova não herda medição, conclusão nem amostra da bloqueada.**

## Inelegibilidade, conferida por nome

- **O orquestrador é INELEGÍVEL como dev** — escreveu `mandato-refs.sh`, `mandato-preflight.sh` e o teste do
  ciclo 1. Continua fazendo **só** o que é de orquestrador: briefing, ata, registro e versionamento de corpos.
- **C1, C2 e C3 do ciclo 1 estão fora** como dev e como planejador; a C3 também como jurado (B1).
- **O dev do ciclo 2** é o agente `a4ed42a5e3a81bdd3`, identidade nova, Opus 5 — nomeado aqui porque o
  inspetor apontou (ressalva **R2**) que ele não tinha nome em arquivo rastreado. Ele **não** é cadeira.
- O `planejador-mestre` escreveu o plano e **não desenvolveu**.

## Os três enunciados que faltavam (bloqueio B2), agora em arquivo

1. **A base viva (`erp-postgres`, `erp-redis`) NUNCA é alvo de NENHUM jurado** — não só do dev. Quem precisar
   de banco sobe cluster **descartável próprio**, com `DATABASE_URL`/`REDIS_URL` explícitas e porta declarada.

   > **CORREÇÃO DE FATO (orquestrador, 2026-09-26) — eu vinha afirmando duas coisas FALSAS, e o
   > `inspetor-de-terreno-da-junta` da junta 2 as derrubou por execução (ressalva R2 FORTE).**
   >
   > **(a) "a 5432 é de outro projeto" é FALSO — e era falso na direção perigosa.** Medido agora:
   > `docker ps` mostra **`erp-postgres` em `0.0.0.0:5432`** e **`erp-redis` em `0.0.0.0:6379`**. São a
   > **BASE VIVA DESTE PROJETO**. A conduta que eu pedia (não usar a 5432) estava certa, mas **pela razão
   > errada** — e a razão errada podia inverter a conduta: uma cadeira que lesse "é de outro projeto"
   > poderia concluir que a 5432 não é a base viva e usá-la. **Nenhuma cadeira usa 5432 nem 6379.**
   >
   > **(b) "a faixa 58284–58483 é excluída pelo Windows" é FALSO.** `netsh int ipv4 show
   > excludedportrange protocol=tcp` **não a lista**. As exclusões reais medidas incluem `5357`,
   > `49152-49251`, `49680-49979` e `50000-50259`.
   >
   > **Regra que substitui a faixa inventada:** escolha a porta que quiser e **PROVE que ela ligou** —
   > publique o comando e a saída. Não confie em faixa declarada por mim nem por ninguém; uma porta que
   > não liga aparece como falha do drill, e aí o número vira ruído em vez de medição.
2. **A junta não fecha com menos de 3 votos de mérito.** Não há suplente nomeado: queda por infra ou cota
   **relança a mesma identidade**, e nada que a cadeira tenha começado conta como voto. **Voto perdido nunca
   conta como aprovação.** Por isso cada cadeira grava **evidência incremental a cada item**.
3. **Toda afirmação da ata do ciclo 1 e do §0 do plano está marcada "A RE-VERIFICAR"** — nenhuma se herda como
   fato. Foi premissa herdada que abriu o loop deste bloco.

## Reprovação por construção — cobrar isto não é achado

- **`LIDO` é inalcançável no corpus de hoje.** Medido: `linha_estrutural_approved_head` = **0/107** atas. É
  assim **de propósito**, está declarado na E3.h, e o remédio (template + retrofit) saiu com dono
  (`B-GOV-ATA-CABECALHO`, na fila do §5 do `PLANO_SAN3.md`). Consequência aceita: **#390, #391 e #392 deixam de
  sair como "lidos"** — estavam certos **por sorte do veredito**, não por leitura.
- O que o §3 do plano manda **sair com dono** (`B-GOV-ATA-CABECALHO`, `B-GOV-MANDATO-2`).
- **Flutter** não é tocado pelo bloco; o KPI declara a não-reexecução em voz alta.
- O **PR em rascunho** é matéria de merge, não de voto.

## Ressalvas do inspetor que a junta herda como contexto (não como fato)

**R1** os corpos das cadeiras não existem no diretório da sessão e carregam por emulação do blob do head —
**cada cadeira declara o md5 EOL-neutro do corpo que aplicou**. **R4** resíduo alheio inerte (contêineres
`erp-postgres-alt` e `pastrack-teste`, worktrees `b04a`/`b11`/`gov-descuido`/`gov-elenco`, `TEMPLATE-J-ata.md`
não rastreado) — **se reporta, não se varre**. **R5** o "23 ` M` fantasma" no `w-mandato` **não é observável**
(`status --porcelain` = 0) — não herdar.
**R3 foi fechada pelo orquestrador** em `29a4f76b`: `P-GOV-MANDATO-2-FRONTEIRAS` dizia "cinco" e listava oito,
numerando 1-6, **8, 7**; contagem e ordem corrigidas, **sem acrescentar, remover ou reescrever fronteira**.

## Regra de voto

Todo voto declara **`gravidade`** (`bloqueia` | `ajuste` | `nota`) **e `escopo`** (`dentro-do-bloco` |
`pre-existente`, este **com evidência de data ou origem** — sem ela conta como `dentro-do-bloco`). Achado
`pre-existente` **não reprova**: vira pendência nomeada com bloco dono. **"Não consigo medir" = REPROVADO.**
Nenhuma cadeira propõe correção (§C7.4-bis).

---

# Ciclo 3 — briefing da junta 3 (PR #393)

> Escrito pelo orquestrador (passo 6 da §14.12 do plano). Tudo que está aqui é **insumo a re-verificar**, não
> fato herdado: cada número traz o arquivo ou o comando de onde saiu, e cada cadeira mede de novo o que o seu
> corpo manda medir.

- **Objeto julgado:** o head de `chore/mandato-refs-e-preflight`, que **cada cadeira resolve por si**
  (`git rev-parse`, cruzado com `gh pr view 393 --json headRefOid`). O ramo andou mais de vinte vezes no
  ciclo 3 — nenhum SHA escrito por terceiro vale.
- **Base:** `origin/main` em `3b1fe0f9` (#395, registro do #394). A integração da `main` veio **por merge**
  em `7d02d8da` (pais `e27fbe14` e `3b1fe0f9`), com 9 conflitos resolvidos, todos de registro ou KPI. Pela
  ERRATA E-4(a), `MB=$(git merge-base origin/main HEAD)` tem de ser **igual** a `git rev-parse origin/main`
  depois de `git fetch`.
- **Ancestralidade (ressalvas R5 do #394 e R-C do #395):** `git merge-base --is-ancestor 3b1fe0f9 <objeto>` →
  `ec=0`. O orquestrador mediu `ec=0` contra o head do ramo em 30/09; o inspetor e as cadeiras medem contra o
  objeto que resolverem.
- **Legalidade do ciclo 3:** `D-SEM-TETO-AUDITORIA-NO-3` está em `origin/main` desde `b3f0af5f` (#394). O
  gatilho do ciclo 4 é o texto da `main` (T-24; ERRATA E-1): **qualquer** reprovação do ciclo 3 abre o ciclo 4
  com auditoria da máquina; achado `pre-existente` não reprova nem abre ciclo 4.
- **Quórum:** maioria de 3, sem veto, sem suplente. Queda relança a **mesma** identidade, que não herda nada;
  voto perdido nunca conta como aprovação; evidência incremental a cada item.

## As três cadeiras

| cadeira | identidade | competência (corpo + ERRATAs do topo) |
|---|---|---|
| **C1‴** | `jurado-mandato-c1c-invariancia-de-forma` | propriedade × forma; partir **e** juntar; `[B8b]` por propriedade — ERRATAs E-1, E-2, E-6, E-9(e), E-10(c), E-11 |
| **C2‴** | `jurado-mandato-c2c-cobertura-por-mutacao` | E4 no escopo do §13.3 com a forma do §14.7; identidade da matriz = tripla (+ ambiente) — ERRATAs E-1, E-3, E-5, E-6, E-8, E-9, E-10, E-11 |
| **C3‴** | `jurado-mandato-c3c-fronteira-numero-registro` | escopo por geração, KPI 2×, registro, ordem por par, merge de integração contra os dois pais — ERRATAs E-1, E-2, E-4, E-6, E-7, E-8, E-9, E-10, E-11 |

Os corpos estão versionados nos dois espelhos (`sync-agent-agents.mjs --check` ec=0). **Cada cadeira declara
o md5 EOL-neutro do corpo que aplicou**: o diretório de agentes da sessão do orquestrador está velho e não
contém esses corpos, então elas rodam lendo o corpo do head.

## Inelegibilidade, conferida por nome (§10 l.1043-1046 + §14.9 + §14.16-§14.18)

- **Cadeiras dos ciclos 1 e 2:** `jurado-mandato-c1-prevoo-fail-closed`, `jurado-mandato-c2-pergunta-feita`,
  `jurado-mandato-c3-escopo-kpi-registro`, `guardiao-fail-closed`, `medidor-de-cobertura-do-artefato`,
  `jurado-mandato-c3b-fronteira-numero-registro`.
- **Devs dos ciclos 1 e 2:** `aa051e8cc3eb1c1a0`, `a4ed42a5e3a81bdd3`.
- **Devs do ciclo 3, com os commits de cada um:**
  - Dev-T: `6c8fb3e8`, `4ad4ba9f` — trilha `DEV-T-CICLO3.md`, worktree `w-devt393`.
  - Dev-S: `33356358`, `616fd4fa`, `72214ff7`, `1466c7d9`, `714d4815`, `d222ce7c` — trilha `DEV-S-CICLO3.md`, worktree `w-devs393`.
  - Dev-T-3 (`dev-t3-mandato-b8-refs`): `9d3de5dd`.
  - Dev-S-2 (`dev-s2-mandato-registro`): `c32f77b5`, K1 `a737250a`, K2a `371961ac`, K1b `4794169a`, K2b `7e4ac5d1`.
  - Dev-T-4 (`dev-t4-mandato-refs-win32`): T4 `395d07c9`, T6 `396643aa`.
  - Dev-T-5 (`dev-t5-mandato-v18-win32`): T5 `190e2300`.
  - Dev-T-6 (`dev-t6-mandato-preflight-16`): T7 `9e8cf1cd`.
- **Planejador** (`planejador-mestre`, Fable 5.1): as versões v1–v3, a §12, a §13 e as §14 a §14.19. Commits da
  §14 em diante: `4e70d343`, `c7eef1fd`, `cffc4401`, `ea716ad4`, `66fa980e`, `dcbe56a8`, `83ca98b3`.
- **Orquestrador:** registro, integração (o `M`), versionamento de corpos e erratas, e medições da E4. Não
  escreveu código do bloco no ciclo 3.

## As matrizes — insumo obrigatório (§14.3)

Publicadas pelo Dev-S-2 em `docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-mutantes.md` (K2b). A identidade de cada
matriz é a **tripla** artefato + guard + ferramenta (ERRATA E-5), mais o **ambiente** quando o guard alcança a
l.522 do pré-voo (§14.19):
- **refs — E4-refs-3:** tripla `474c7521`/`d455ae1a`/`37549262`, base `fail=0 de tests=39`, `skipped 0`,
  `N=46 K=46 NAO-COBERTOS=0 EXCLUIDOS=52 ANOMALIAS=1` (l.164, fronteira 24).
- **pré-voo — composta A+B, unida pelo lema do §14.18(3) com a premissa (g) do §14.19:**
  - **A:** tripla `faa408c8`/`3d875a54`/`37549262`, rodada completa, base `0/299`. Deu 16 não-cobertos. Tem o
    TIMEOUT da l.161 (§14.15; vaga morta pelo orquestrador em 29/09 20:36, registrado no log da rodada) e a
    anomalia da l.340 (fronteira 26).
  - **B:** tripla `faa408c8`/`7a52d37c`/`37549262` + equivalentes `9c691363`, `--only` nos 16. Ambiente:
    `MSYS_NO_PATHCONV exportadas=0 | git 2.53.0.windows.2 | node v20.19.5`. Base `0/312`, `N=16 K=13 NC=3
    EQUIV=3`, `ec=0`.
  - Resumo recomposto, derivado por script no K2b: `N=103 K=100 NAO-COBERTOS=3 (equivalentes declarados e conferidos por id: 3) EXCLUIDOS=57 ANOMALIAS=2` → **[M-1] = 0**.

## Dívida do orquestrador, declarada antes de a junta achar

**Os runners da E4 exportavam `MSYS_NO_PATHCONV=1`** (a rodada A do pré-voo e as três do refs). A §14.19 mediu
que a variável só desliga a l.522 do pré-voo e que nenhum caso da rodada A a alcança, e declarou A e refs
válidos **por construção**. A 1ª delta B abortou pela trava do §13.5 por causa dela; foi refeita sem a
variável. O falsificador dessa neutralidade é a amostra da C2‴ rodada **sem** a variável (ERRATA E-10(a)).

## Reprovação por construção — cobrar isto não é achado

- As fronteiras **9–11, 13–22 e 24–27** estão declaradas em `P-GOV-MANDATO-3-FRONTEIRAS`, com dono
  `B-GOV-MANDATO-2`. Entre elas:
  - 25: sem timeout por mutante na ferramenta nem por caso no guard;
  - 26: o `next$` da ferramenta;
  - 27: o pré-voo sob `MSYS_NO_PATHCONV=1`.
- Os blobs dos artefatos estão **congelados** pela identidade da matriz (§14.2.1). Cobrar o conserto da l.121
  neste bloco é reprovação por construção (E-10(b)).
- **Flutter e smoke web** não são tocados pelo bloco: o KPI os carrega com nota.

## Mudou desde o ciclo 2 — não herdar o briefing anterior

**`LIDO` deixou de ser inalcançável.** Medido em `origin/main` `3b1fe0f9`: 108 atas `J-*.md`, **1** com a linha
estrutural `- **approved_head:**` (`J-B-GOV-SEM-TETO.md`, do #394). A frase do ciclo 2, "0/107, inalcançável
de propósito", era verdadeira em `fc3363e3` e não é mais. O remédio geral (`B-GOV-ATA-CABECALHO`) continua
com dono.

## Ressalvas dos porteiros atendidas neste PR

- **#394**, ressalva R5: a ancestralidade medida.
- **#395:**
  - R-A e R-B: no K1 `a737250a`.
  - R-C: a ancestralidade contra `3b1fe0f9`.
  - R-D e R-E: o parecer do porteiro do #395 está versionado neste PR em
    `agent-orchestration/omega/juntas/votos/B-GOV-SEM-TETO/PORTEIRO-395.md`, com md5 EOL-neutro
    `9cd7cb00020f0577044eb2ed3de4e3b8`.

## Ambiente de quem mede (ERRATA E-11)

**Nunca `export MSYS_NO_PATHCONV=1`** no shell que executa o artefato, o guard ou a ferramenta. Use o prefixo
por comando onde precisar dele. Publique `env | grep -c '^MSYS_NO_PATHCONV='` = 0, `git --version`, `node -v` e
`uname -srm` antes de medir.
- **A base viva** (`erp-postgres` 5432 / `erp-redis` 6379) **nunca** é alvo.
- **Worktree** em caminho curto, próprio, removido pelo nome depois de conferir que nenhum processo seu está
  vivo nele.
- **Nunca** `tail -f`, `watch` ou leitura sem fim.
- **Timeout** em tudo o que executa o artefato mutado.

## Regra de voto

Todo voto declara **`gravidade`** (`bloqueia` | `ajuste` | `nota`) **e `escopo`** (`dentro-do-bloco` |
`pre-existente`, este **com evidência de data ou origem** — sem ela conta como `dentro-do-bloco`). Em cada
`bloqueia`, escreva qual controle da §1.1 do plano foi aplicado. Achado `pre-existente` **não reprova**: vira
pendência nomeada com bloco dono. **"Não consigo medir" = REPROVADO.** Nenhuma cadeira propõe correção
(§C7.4-bis). As três votam **juntas**, sem ler o voto umas das outras.
