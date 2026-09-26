# Briefing da junta — `B-GOV-MANDATO` (PR #393)

- **Objeto julgado:** `1c5437daa` — head medido por `scripts/mandato-refs.sh 393`, nunca digitado.
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
