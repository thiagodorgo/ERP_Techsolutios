# BRIEFING — junta do `B-GOV-ELENCO`, **ciclo 2, fatia A**

**Branch:** `chore/gov-auditoria-elenco` · **Base:** `origin/main` = `fe2748c8` · **Worktree:**
`.claude/worktrees/gov-elenco`
**Head de código:** `7facc396` · **Head atual:** meça você (`git -C <wt> rev-parse HEAD`) e **registre no
voto**; depois de `7facc396` só `agent-orchestration/` muda (registro). Qualquer caminho fora disso em
`git -C <wt> diff --name-only 7facc396..HEAD` é achado `dentro-do-bloco` que **bloqueia**.
**Quórum:** **unanimidade de 3** (`D-QUORUM-B-GOV-ELENCO` — o ciclo 2 mantém).

> **ISTO É O CICLO 2. NÃO HÁ CICLO 3** (`D-TETO-DOIS-CICLOS`). Reprovando, a fatia A para e vira dossiê ao
> dono — e a fatia B, que depende dela, não começa.

## Leia, nesta ordem

1. `agent-orchestration/omega/planos/B-GOV-ELENCO-ciclo2-plano.md` — **começando pelas EMENDAS 1 e 2 no
   topo**, que mudam critérios e escopo. Depois §5 (permitido), §5-bis (proibido), §7 (critérios), §10
   (reprovação por construção).
2. `agent-orchestration/omega/juntas/J-B-GOV-ELENCO.md` — a ata do ciclo 1 (o que foi reprovado, e por quê).
3. `agent-orchestration/omega/juntas/votos/B-GOV-ELENCO/DEV-A-evidencia.md` — a evidência executada do dev.
4. `agent-orchestration/omega/reprovacoes/R-B-GOV-ELENCO-ciclo1.md`.

## O que a fatia A entrega

O ciclo 1 foi **REPROVADO 3×0**. O planejador (Fable) recomendou **fatiar**: a faxina passou inteira no ciclo
1 (A1–A10 verdes, 32/32 renames por hash, 15/15 aposentadorias) e não pode ficar refém do desenho do assento
permanente, que foi o reprovado. **Esta fatia é a faxina + o auditor corrigido + o KPI.** O assento inteiro
foi para `chore/gov-elenco-fatia-b`, com PR e junta próprios.

Os consertos que esta fatia carrega, dos achados do ciclo 1:
- **`C3-A1`** — a pergunta do auditor **inverteu**: não pergunta mais "quem julga?" por prefixo de nome
  (regex cega a 13 de 24 papéis, inclusive `agente-secops` — **você**), e sim "quem está **autorizado** a
  escrever?", allowlist curta e visível no diff. **Default-deny:** ferramenta desconhecida em não-escritor é
  negada.
- **`C3-A2`** — a frase falsa *"§C7.4-bis respeitado por construção"* morreu. No lugar, um **AVISO agregado**
  que nomeia e conta os **17 papéis** que carregam `Bash`, com o dono da decisão pendente
  (`P-GOV-BASH-EM-QUEM-JULGA`). Exceção nomeada e contada, em vez de invisível.
- **`C3-A4`** — terceira classe de falso-positivo (fence indentado, `~~~`, code span inline, `description`
  YAML multi-linha).
- **`C3-A7`** — `--ref` sem valor caía **em silêncio** na árvore de trabalho com `ec=0`. Agora erro de uso é
  `ec=2`, com linha de uso e sem stack trace.
- **`C1-01`** — `blocks_completed` 162 no `value` **e** no `display`; `FROZEN` regenerado.
- **`C1-02`/`C1-03`** — os números publicados corrigidos para os que **reproduzem** (5 de **11** skills na
  base; ~5,1k tokens).

## Reprovação POR CONSTRUÇÃO (cobrar isto é reprovar sem defeito)

- **`src/`, `tests/`, `prisma/`, `frontend/`, `mobile/`, `.github/`, `.gitignore`, `scripts/sync-agent-*.mjs`,
  lockfiles** — §5-bis. Exigir teste novo em `tests/` ou o auditor na CI é reprovar sem defeito: já são
  `P-GOV-AUDITOR-FORA-DA-CI` e `P-GOV-WORKTREES-NAO-IGNORADAS`.
- **O assento permanente** — não está nesta fatia, por desenho. Cobrar `CLAUDE.md` §C7.1-quater, o agente
  `cadeira-permanente-backend-review`, a skill `backend-review-ts-prisma` ou o `TEMPLATE-J-ata.md` aqui é
  reprovar sem defeito: tudo isso vive em `chore/gov-elenco-fatia-b`.
- **`D-FALLBACK-MODELO-FABLE-OPUS`** (ordem do dono de 07/09) — foi **inteiro** para a fatia B por decisão do
  orquestrador, registrada na §2.0 da evidência do dev. Não sumiu: está no superset de
  `chore/gov-elenco-fatia-b`. Cobrá-lo aqui é reprovar sem defeito; **conferir que não sumiu, não**.
- **`npm run check/test/build` locais** — o worktree não tem `node_modules` e instalar custa disco que o dono
  não tem. Zero arquivo de `src/`/`tests/` no diff (prove, não aceite). O dev rodou as **4 suítes que leem
  artefatos tocados** com o `tsx` da árvore principal por caminho absoluto: 16/16, 6/6, 6/6, 12/12.
- **`blockchain-developer`** — voltou a carregar e não tem relação com o produto: `P-GOV-SKILLS-RELEVANCIA`,
  decisão do dono.

## ISOLAMENTO — obrigatório

O worktree é **SOMENTE-LEITURA** para você, **exceto** os seus dois arquivos em
`agent-orchestration/omega/juntas/votos/B-GOV-ELENCO/`. **Toda prova por mutação roda em cópia isolada e
própria** — `mktemp -d` + `cp` do `scripts/` e de `.claude`/`.agents`, medir, `rm -rf`. **Sem
`git worktree add`, sem junction, sem symlink, sem `npm ci`.** Receita provada em três passadas do ciclo 1
(`0 → 1 → 0` na cópia, `0 → 0 → 0` no worktree). Se encontrar o worktree sujo, **pare e reporte anomalia de
terreno** — pode ser mutação viva de outro jurado.

## O que a EMENDA 2 pede de você em especial

Ela **corrige três critérios depois de medidos** — `A-16` (71 → 34), `A-17` (vira `A-17a`/`A-17b`) e `A-25`
(o grep testava a palavra "assento", passa a testar a substância). Isso merece desconfiança, e a emenda diz
por quê acha que não é mover a trave. **Julgue isso.** Se a emenda afrouxou alguma propriedade, o achado é
`dentro-do-bloco` **contra o orquestrador**, não contra o dev. E **não aceite a tabela T1–T7′ do dev sem
reexecutar pelo menos uma das mutações**.

## Regras do voto

Todo achado declara `gravidade` **e** `escopo` (`dentro-do-bloco` | `pre-existente`) **com evidência de data
ou origem** (§C7.1-ter(a)); escopo sem evidência é tratado como `dentro-do-bloco`. Publique **N e forma** —
**inclusive a versão do Node e o `core.autocrlf`**, que nenhuma cadeira do ciclo 1 publicou.
**"Não consigo medir" = REPROVADO.** **Não proponha correção** (§C7.4-bis): reporte defeito, evidência
executada e motivo.

## Papéis (§C7.4-bis) — três agentes distintos, e desta vez de verdade

| Papel | Quem | Observação |
|---|---|---|
| Quem ACHOU | `validador-mestre` · `guardiao-fail-closed` · `agente-ci-doutor` (ciclo 1) + o assento (re-escopo) | **inelegíveis para votar aqui** |
| Quem PLANEJOU | `planejador-mestre` (Fable) | não implementou, não vota |
| Quem DESENVOLVEU | `dev-gov-elenco-c2` — identidade distinta, **não é o orquestrador** | não julga achado, não vota |
| Quem JULGA | `A-C1` **`agente-secops`** · `A-C2` **`inspetor-de-arnes-concorrente`** · `A-C3` **`coordenador-de-acessos`** | nenhum votou no ciclo 1 |
| Gate | `inspetor-de-terreno-da-junta` | libera ou bloqueia o start |
| Orquestrador | dispara, escreve briefing e ata, **e é quem assinou a EMENDA 2** | não implementa, não vota |

> **O assento permanente NÃO homologa esta fatia.** O contrato da `main` (a base desta junta) ainda não tem o
> §C7.1-quater — ele nasce na fatia B. Julgar a A sob uma regra que ainda está em julgamento seria
> circularidade sem ganho. Na fatia B ele homologa, com nota de conflito.

## Perda de jurado

Unanimidade de 3: voto perdido não é aprovação nem reprovação. Cadeira que cair por infra é **re-disparada uma
vez** com a mesma identidade (papel permanente, sem memória de bloco a perder); caindo de novo, o voto perdido
entra na ata com o erro nomeado. **A junta não fecha com menos de 3 votos de mérito.** Registro em
`votos/B-GOV-ELENCO/00-quedas.md`.

## Protocolo (§C7.7) — obrigatório no seu disparo

Após **cada** item: apense a `votos/B-GOV-ELENCO/A-<cadeira>-evidencia.md` → comando · saída resumida ·
veredito parcial. [P1] Antes da mensagem final: escreva `votos/B-GOV-ELENCO/A-<cadeira>-voto.json`; mensagem
final = **1 linha** apontando o arquivo. [P2] Máximo 3 itens por cadeira. [P4]
