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
| **C2‴** | `jurado-mandato-c2c-cobertura-por-mutacao` | E4 no escopo do §13.3 com a forma do §14.7; identidade da matriz = tripla (+ ambiente) — ERRATAs E-1, E-3, E-5, E-6, E-8, E-9, E-10, E-11, E-12 |
| **C3‴** | `jurado-mandato-c3c-fronteira-numero-registro` | escopo por geração, KPI 2×, registro, ordem por par, merge de integração contra os dois pais — ERRATAs E-1, E-2, E-4, E-6, E-7, E-8, E-9, E-10, E-11, E-12 |

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

- As fronteiras **9–11, 13–22 e 24–28** estão declaradas em `P-GOV-MANDATO-3-FRONTEIRAS`, com dono
  `B-GOV-MANDATO-2`. Entre elas:
  - 25: sem timeout por mutante na ferramenta nem por caso no guard;
  - 26: o `next$` da ferramenta;
  - 27: o pré-voo sob `MSYS_NO_PATHCONV=1`;
  - 28: o equivalente contado sem conferir id — por isso o [M-1] se confere **por conjuntos**, nunca pelo `ec` (ERRATA E-12).
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

---

# Ciclo 4 — junta 4 (PR #393)

> Escrito pelo orquestrador em 2026-10-02. O desenho do ciclo está na §15 do plano
> (`docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-plano.md`, §15.0 a §15.16) e nas §8 e §9 do parecer da auditoria.
> Nada deste briefing é fato herdado: cada número tem a fonte nomeada, e a cadeira mede de novo.

- **Objeto:** o head do ramo `chore/mandato-refs-e-preflight`, resolvido pela própria cadeira (`git rev-parse`
  cruzado com `gh pr view 393 --json headRefOid`), nunca digitado. Depois do K4b-2 (`663eeb00`) entraram: a
  conferência dos dois lados (DIVERGE 263), a errata 4 (§15.17), o caso `[V263]` (T4c-5), o registro do K4b-3, a
  reconferência (CONFERIDO), duas integrações da `main` por merge, a recontagem do K4b-4, este briefing, o
  esqueleto da ata, os mandatos da junta e a §9 do parecer.
- **Base:** `origin/main` em `b404815c` (#404), integrada **por merge** duas vezes: `325030c8` (a `main` do #399) e
  `4535ebb3` (a do #402, #403 e #404). Conflitos só em registro e KPI. A resolução foi provada por multiconjunto em cada
  arquivo. A única sobreposição real foi a linha do backfill do #397 no `kpis-history.md`, preenchida pelos dois lados
  com o mesmo fato e resolvida a favor da `main`. O histórico JSON foi resolvido pela estrutura: a base é
  subsequência do ramo, e a entrada do B-SAN3-01b entra logo depois da última entrada da base. `merge-base` =
  `origin/main`.
- **Legalidade do ciclo 4:** o §C7.4 item 4 da `main` manda auditar a máquina antes do ciclo 4. O parecer
  `omega/reprovacoes/R-B-GOV-MANDATO-ciclo3-auditoria.md` traz a §8 (o conserto) e recebe a §9 (a atestação do
  auditor, §8.7) **antes** do inspetor. Sem `CONSERTO VERIFICADO` na §9, o inspetor não libera.
- **Quórum:** maioria de 3, sem veto, sem suplente (§15.9). Queda relança a **mesma** identidade, que não herda nada
  como conclusão; voto perdido nunca conta como aprovação; evidência incremental a cada item; PAUSA pela P7.

## As três cadeiras (§15.9)

| cadeira | identidade | md5 EOL-neutro do corpo no head (`.claude` · `.agents`) | competência |
|---|---|---|---|
| **C1⁗** | `jurado-mandato-c1d-invariancia-e-morte-interna` | `fa8877262ff4370293b21c18a1b09f60` · `ad7ff64d66d532b10f4cb18628093887` | propriedade × forma, partir e juntar; morte interna (A15) |
| **C2⁗** | `jurado-mandato-c2d-cobertura-e-dois-lados` | `0bb59aa2fcc14b67755fc6566e821106` · `ff00d3d26042f1536aa05471ad728986` | cobertura por mutação; honestidade da matriz; os dois lados |
| **C3⁗** | `jurado-mandato-c3d-escopo-kpi-registro-mandato` | `34aac6893fc0c488914f56d5fdc7fc0a` · `07b7d75ac003d6e508d0292399f4f742` | escopo por geração; número; registro; mandatos como artefato |

Os corpos nasceram em `8859c142` e receberam as emendas 1-bis (`e3133ab4`, errata 15.15), 1-ter (`441b0b31`,
errata 15.16) e 1-quater (`95a8d071`, errata 15.17), sempre nos dois espelhos, com `sync-agent-agents.mjs --check`
verde. A emenda 1-quater da C1⁗ foi aplicada por adição, como a 1-ter, e a fábrica declarou essa leitura. Os md5 da
tabela acima são os de antes da 1-quater; cada cadeira declara o md5 do corpo que aplicou, medido no objeto. O diretório de agentes da sessão
do orquestrador não contém esses corpos: cada cadeira roda lendo o corpo do head e declara o md5 que aplicou.

## Inelegibilidade, conferida por nome (§15.9)

- **Cadeiras dos ciclos 1 a 3:** `jurado-mandato-c1-prevoo-fail-closed`, `jurado-mandato-c2-pergunta-feita`,
  `jurado-mandato-c3-escopo-kpi-registro`, `guardiao-fail-closed`, `medidor-de-cobertura-do-artefato`,
  `jurado-mandato-c3b-fronteira-numero-registro`, `jurado-mandato-c1c-invariancia-de-forma`,
  `jurado-mandato-c2c-cobertura-por-mutacao`, `jurado-mandato-c3c-fronteira-numero-registro`; e a instância do
  inspetor da junta 3.
- **Devs dos ciclos 1 a 3:** `aa051e8cc3eb1c1a0`, `a4ed42a5e3a81bdd3`, Dev-T e Dev-S do ciclo 3,
  `dev-t3-mandato-b8-refs`, `dev-t4-mandato-refs-win32`, `dev-t5-mandato-v18-win32`, `dev-t6-mandato-preflight-16`,
  `dev-s2-mandato-registro`.
- **Planejador das §1 a §14.20** e as duas identidades da tabela §8.10 do parecer: `auditor-maquina-b-gov-mandato-c3`
  (atesta a §9 e só) e `planejador-conserto-maquina-b-gov-mandato`.
- **Ciclo 4, com os commits de cada um:**
  - `planejador-ciclo4-b-gov-mandato` (Fable): a §15 e as erratas §15.14 (`0f044fa3`), §15.15 (`82bab561`), §15.16
    (`891dc04f`) e §15.17 (`49fe307f`).
  - `dev-tests-ciclo4-b-gov-mandato` (Opus 5.5, mandato `1af9e7fc…`): T4c `5b6f4f4a`, T4c-2 `738f0736`, T4c-3
    `dd0d409d`, T4c-4 `3778faaf`, T4c-5 `faf87d8c` (mandato `4d44336f…`).
  - `dev-scripts-ciclo4-b-gov-mandato` (Opus 5.5, mandato `198b08ed…`): S4a `2ca15eb0`, S4b `7a156a62`, D4 `aa546ef9`,
    K4 `bb641b77`, K4b `408149a7`, K4b-2 `663eeb00`, K4b-3 `e92f04e7` e `fb64da75` (mandato `70f57c52…`), K4b-4
    `95bd6f96` (mandato `eb89683d…`).
  - `conferente-dois-lados-b-gov-mandato-c4` (Fable): a conferência dos dois lados (mandato `ddbf4be9…`) e a
    reconferência do 263 (instância nova, mandato `c893a0dd…`).
  - As instâncias da `agente-fabrica` que escreveram os quatro corpos e as emendas 1-bis, 1-ter e 1-quater.
  - O orquestrador: registro, integrações por merge, versionamento de corpos e mandatos, e as rodadas da E4.

## As matrizes — insumo obrigatório (§15.4)

Publicadas verbatim em `docs/revisoes/SAN3/B-GOV-MANDATO-ciclo4-mutantes.md` (K4b `408149a7`, delta no K4b-2
`663eeb00`). A identidade de cada matriz é a tripla artefato + guard + ferramenta, mais o ambiente do §0 daquele
arquivo.

| matriz | tripla | resultado bruto | `[M-1]` por conjuntos |
|---|---|---|---|
| refs, rodada completa | `e1ed8f0d` · `a8bd601b` · `373e5728` | `N=44 K=44 NAO-COBERTOS=0 EXCLUIDOS=52 ANOMALIAS=1 INVALIDOS=2 TIMEOUT=0` | ∅ |
| pré-voo, rodada completa | `093499a8` · `2275bea0` · `373e5728`, equivalentes `123e6afd` | `N=84 K=80 NAO-COBERTOS=4 EXCLUIDOS=60 ANOMALIAS=0 INVALIDOS=37 TIMEOUT=1`, equivalente 441 conferido | {359, 372, 612} |
| pré-voo, delta da R1 (guard do T4c-4) | §4.2 do arquivo das matrizes | `N=3 K=3 NAO-COBERTOS=0` sob o lema do §14.18(3) | ∅ |

A lista histórica do vermelho-controle é uma propriedade do artefato antigo e tem **26** itens depois do T4c-4
(§15.16), não 24. O `[V263]` do T4c-5 é `[M-EXT]` e a lista continua 26 (§15.17).

**A §4.3 do arquivo das matrizes (K4b-3)** registra as 39 versões viáveis dos `MUTANTE-INVALIDO`, pela conferência:
28 cobertas, 8 sem mudança de comportamento (equivalentes por fixture, sem linha `id:` no arquivo de equivalentes),
2 que não terminam (cobertas por tempo) e 1 não coberta, o 263, coberta pelo `[V263]` e reconferida. A ferramenta
não muda neste ciclo: a troca do M7 que não compila é a **fronteira 34** (`P-GOV-MANDATO-3-FRONTEIRAS`, dono
`B-GOV-MANDATO-2`). `[M-1]` por conjuntos: **∅**.

## A conferência dos dois lados (§15.5)

Versionada em `votos/B-GOV-MANDATO-ciclo4/00-conferencia-dois-lados.md`. A **1ª passada** deu **DIVERGE 263**
(semente `2026100211`): 16 + 9 + 3 vermelhos, 4 verdes, 39 inválidos e o TIMEOUT conferiram, mas a versão viável do
M7(salto) no ponto 263 mudava o comportamento com o guard verde (CONF-01, bloqueia). A errata 4 decidiu o remédio. A
**reconferência** do 263 (§15 do arquivo, passo 6-bis) deu **CONFERIDO**: identidade das matrizes igual à da
conferência, base própria `fail=0/356`, e o mutante viável deixa o guard vermelho com o único `not ok` = `[V263]`. A
última linha do arquivo é `CONFERIDO`. O conferente caiu duas vezes por limite de sessão da conta e foi retomado
(`votos/B-GOV-MANDATO-ciclo4/00-quedas.md`). Uma linha da conferência foi versionada com 1 espaço final a menos,
declarado no commit.

## Dívida do orquestrador, declarada antes de a junta achar

- **O mandato `planejador-errata` (`60f4f79f`) tem a cerca com `head=987cde17`**, o head local do orquestrador no
  lançamento, que nunca foi empurrado. A colagem do mesmo mandato diz `335cf09d`. O replay da §15.15 achou. O commit
  está preservado no remoto em `wip/c4-cerca-mandato-errata-987cde17`. Desde então, todo gerador de mandato exige
  head local = head do PR no remoto antes de gerar (regra HC = H0), e só gera com o CI quieto.
- **Duas tentativas de mandato foram rejeitadas pelo pré-voo e nunca versionadas:** a do conferente, por um SHA fora
  da colagem na hipótese, e a da fábrica 1-ter, gerada com o CI em voo.
- **O merge `26730e2b` foi commitado sem a checagem de espaço em branco como trava.** Medido depois com
  `git diff --check 26730e2b^1 26730e2b`: as únicas ocorrências são linhas de
  `votos/B-GOV-PAUSA/C2-evidencia.md`, arquivo que veio da `main` (#397) e que o #393 não escreveu. Os commits
  seguintes travam a checagem antes do commit.
- **Desvio declarado pelo Dev-T4 no T4c-5:** ele leu trechos de `scripts/mandato-preflight.sh`, o que a regra 2 do §8
  do plano não permite ao dev de testes. Nenhum script foi editado (o diff do T4c-5 é só `tests/mandato-preflight.test.ts`,
  +30/−0). A junta julga.

## Nota de terreno, pré-existente: o CI intermitente

No head do T4c-4 (`3778faaf`) o job `backend-postgres` ficou vermelho no teardown de
`tests/o6r06-usage-atomic-db.test.ts` (l.740, bloco `B-O6R-06`). O job foi reexecutado sozinho e passou, com os sete
check-runs verdes. É intermitente e anterior a este bloco. A pendência com dono nasce no registro pós-merge, fora deste
PR, porque `pendencias.md` não está entre os caminhos que a §15.6 autoriza ao orquestrador. Um vermelho igual no
objeto é insumo do voto, e a cadeira classifica o escopo com a evidência de origem.

## Reprovação por construção — cobrar isto não é achado

- As fronteiras **9–11, 13–22 e 24–33** estão declaradas em `P-GOV-MANDATO-3-FRONTEIRAS`. As 32 (corte de bytes) e 33
  (`ANOMALIA-EQUIV` some quando os não-cobertos são vazios) foram registradas no ciclo 4.
- **A re-execução viva do pré-voo de mandato antigo reprova por construção** (§15.15, classe A8): a colagem envelhece
  quando o head anda. O critério é o **replay** no commit que versionou o mandato; a re-execução viva fica como
  registro.
- **Os números da §15.3 e da §15.7 estão superados.** A divisão de casos da E1 é 36 no pré-voo + 5 no refs = 41
  entradas de TAP, contada contra o head do lançamento do Dev-T4 (§15.15 (c3)); com o T4c-5 são **49** (§15.17). O
  KPI vale pelo K4b-3 e pelo K4b-4: backend **3452/3454** por N=2, pré-voo 356, refs 44, `blocks_completed`
  **171** contra a `main` integrada. A cadeira mede de novo e compara com esses números, não com os da §15.3.
- **Flutter e smoke web** não são tocados pelo bloco: o KPI os carrega com nota.
- Os blobs dos artefatos são os da tripla publicada. Cobrar mudança de artefato depois da matriz é cobrar uma matriz
  nova.

## Ambiente de quem mede

O mesmo do ciclo 3 (ERRATA E-11): nunca `export MSYS_NO_PATHCONV=1`; publique `env | grep -c '^MSYS_NO_PATHCONV='` = 0,
`git --version`, `node -v` e `uname -srm` antes de medir; base viva nunca é alvo; worktree próprio em caminho curto,
removido pelo nome depois de conferir que nenhum processo seu está vivo nele; nunca `tail -f`; timeout em tudo o que
executa artefato mutado. Sob ordem de PAUSA, a cadeira termina o comando em curso, grava a seção `## PAUSA <hora UTC>`
na evidência e para sozinha (P7).

## Regra de voto

Todo voto declara **`gravidade`** (`bloqueia` | `ajuste` | `nota`) **e `escopo`** (`dentro-do-bloco` |
`pre-existente`, este com evidência de data ou origem — sem ela conta como `dentro-do-bloco`). Achado
`pre-existente` não reprova: vira pendência nomeada com bloco dono. **"Não consigo medir" = REPROVADO.** Nenhuma
cadeira propõe correção (§C7.4-bis). As três votam juntas, sem ler o voto umas das outras, e o voto vai no fim do
próprio arquivo de evidência, em JSON.
