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
   de banco sobe cluster **descartável próprio**, com `DATABASE_URL`/`REDIS_URL` explícitas e porta declarada
   (a 5432 é de outro projeto; a faixa **58284–58483** é excluída pelo Windows).
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
