# BRIEFING — junta do bloco `B-GOV-ELENCO-ENXUTO`

**Branch:** `chore/gov-elenco-enxuto` · **Base:** `origin/main` = `fe2748c8` · **Worktree:**
`.claude/worktrees/gov-elenco`
**Head de código:** `adc41a54` · **Head atual:** meça você (`git -C <wt> rev-parse HEAD`) e registre no voto;
depois de `adc41a54` só `agent-orchestration/` muda. Qualquer caminho fora disso em
`git -C <wt> diff --name-only adc41a54..HEAD` é achado `dentro-do-bloco` que bloqueia.
**Quórum:** **MAIORIA DE 3** (§C7.1-ter(b) literal: governança, sem dinheiro/segurança/permissão/perda de
dado no produto). **Não** se herda a unanimidade do `B-GOV-ELENCO`: aquela subida foi declarada para um bloco
que reescrevia a regra da junta; **este mexe MENOS nela — mas mexe** (ver abaixo). Escalar quórum sem risco que o justifique é o que
queima ciclos (auditoria de 28/08).

> **Correção da passada de terreno (R3), porque a frase original era inexata por medição.** Este bloco
> **toca sim** a regra da junta: `git diff --stat fe2748c8..adc41a54 -- CLAUDE.md AGENTS.md` dá **+48 linhas
> em cada um**, e essas 48 linhas são o **§C7.6-bis** — norma que governa **em que modelo os gates de TODA
> junta rodam** e que institui uma **PARADA**. Somem-se as **30 deleções de arquivo de agente**. O que o
> bloco anterior fazia e este não faz é **criar uma cadeira nova e um veredito novo**. A descida de quórum
> **não depende dessa frase** — sustenta-se no `D-QUORUM-B-GOV-ELENCO` e no §C7.1-ter(b) literal. **Olhem o
> §C7.6-bis e as 30 deleções com atenção: é o que mais importa neste diff.**

## Bloco novo, não ciclo 3

O `B-GOV-ELENCO` **parou no teto de dois ciclos** (reprovado 3×0 e 2×1) e virou dossiê ao dono:
`agent-orchestration/omega/DOSSIE-B-GOV-ELENCO.md`. O dono leu o dossiê e **escolheu a opção 3+1 do §5**:

> *"encolher o auditor ao que regex faz com segurança e trocar adivinhação por recusa nomeada na fronteira.
> A faxina entra junto, pronta e verificada. Como bloco novo e pequeno — não como ciclo 3."*

Este bloco executa isso. **Ele não é uma terceira tentativa do anterior** — é uma entrega menor, com
superfície cortada, decidida pelo dono a partir do padrão medido em duas juntas.

## A causa raiz que motivou o corte (§4 do dossiê)

O auditor errava **na fronteira da gramática que ele próprio define**, e cada conserto fechava a classe
apontada e abria a vizinha: prefixo de nome → lista de ferramentas (ciclo 1) → subconjunto YAML → gramática
de link (ciclo 2). Quatro classes, todas da mesma família, todas por parsear YAML e Markdown com regex.

## O que este bloco faz

1. **Corta `C8` inteiro** — a checagem de link relativo. Com ela saem o regex `LINK`, `semCercas`,
   `semCodeSpans`, `semComentariosHtml`. Ela sozinha produziu **quatro** classes de erro, incluindo o **único
   fail-OPEN medido** (`A-C2-05`: destino com espaço nunca conferido). **Corte, não conserto.**
2. **Recusa nomeada na fronteira** — entrada fora do subconjunto declarado não é adivinhada: o auditor emite
   `C1 recusa de medição` com arquivo e linha, **suprime as demais checagens daquele arquivo** (para não
   derivar diagnóstico de leitura que ele mesmo declarou não confiável) e **reprova** (`ec=1`). Não medir é
   **vermelho**, nunca verde.
3. **Mantém o que é determinístico e já provou valor:** `C0` (piso), `C1`–`C3`, `C4`/`C5` **default-deny**
   (provado em 16 mutações pela cadeira `A-C2`), `C6`/`C7` (puro sistema de arquivos — foi o que achou as 5
   skills mortas), `C9` (paridade de espelho), `C10` (peso do elenco).
4. **Carrega a faxina — A RE-VERIFICAR, e ela é a MAIOR parte do diff.** 5 skills achatadas (32 renames),
   15 especialistas aposentados com registro nominal, índice do Codex reconciliado, backfill do #380.
   **`62 dos 113 arquivos` do diff são a faxina** (30 deleções = 15 especialistas × 2 espelhos; 32 renames
   `R100`) — não é anexo, é o corpo do bloco. No ciclo 2 do bloco anterior ela foi coberta por `A-C1`
   (escopo/registro/KPI) e `A-C3` (separação de poderes); a `A-C2` julgava o auditor. **Isso é insumo, não
   fato estabelecido:** o §2.1 do inspetor proíbe herdar conclusão de ata como verdade, e foi assim que uma
   premissa falsa contaminou um ciclo do financeiro. **Meça você.** E note o agravante que o inspetor
   nomeou: **as mesmas 15 remoções foram metade da justificativa que SUBIU o quórum no ciclo 1**, e agora
   chegam sob maioria — ou seja, com o menor escrutínio que já tiveram.
5. **Fecha a diretiva de modelo do dono:** mapeamento OpenAI nomeado (Astra ≡ Fable, **declarado**; Sol como
   degrau, **derivado** — a distinção está escrita) e **a escada ganha fim: Fable → Opus → PARADA**.

## O que já foi provado, e que você deve reexecutar em vez de aceitar

Os dois bloqueantes do ciclo 2 **desapareceram por construção**. Medido pelo orquestrador em cópia isolada:
- `A-C2-03` (link CommonMark) — link quebrado injetado → **0 achados, `ec=0`**: a checagem não existe mais.
- `A-C2-02` (comentário no fim de `tools:`) — fixture aplicada → **`ec=1`, `[BLOQUEIA] C1 recusa de medição`**,
  com **zero** fabricação de nome de ferramenta. Baseline da cópia: `ec=0`.

**Reexecute pelo menos uma das duas.** E note a armadilha que pegou o orquestrador na primeira tentativa: um
`mktemp -d` do Git Bash devolve `/tmp/...`, que o Python/Node do Windows **não resolve** — a fixture não foi
aplicada e o teste passou sem testar nada. Use caminho que os dois lados enxergam.

## Reprovação POR CONSTRUÇÃO (cobrar isto é reprovar sem defeito)

- **`src/`, `tests/`, `prisma/`, `frontend/`, `mobile/`, `.github/`, `.gitignore`, `scripts/sync-agent-*.mjs`,
  lockfiles** — proibidos. Exigir o auditor na CI é `P-GOV-AUDITOR-FORA-DA-CI`.
- **Exigir de volta a checagem de link** — o corte é a **decisão do dono**, tomada a partir do dossiê, e a
  pendência `P-GOV-AUDITOR-SEM-CHECAGEM-DE-LINK` registra o que a reabriria (parser de verdade → dependência
  → junta-5). Cobrá-la aqui é cobrar o que o dono decidiu não fazer.
- **O assento permanente** — não existe neste bloco. Vive em `chore/gov-elenco-fatia-b`, reprovado como
  desenho e à espera de decisão. Cobrar `§C7.1-quater` aqui é reprovar sem defeito.
- **`blockchain-developer`** — `P-GOV-SKILLS-RELEVANCIA`, decisão do dono.

## ISOLAMENTO

O worktree é **SOMENTE-LEITURA**, exceto os seus dois arquivos em
`agent-orchestration/omega/juntas/votos/B-GOV-ELENCO-ENXUTO/`. Mutação só em **cópia isolada e própria**
(`cp` para diretório fora do repo que Windows e Git Bash enxerguem; medir; apagar). **Sem `git worktree add`,
sem junction, sem `npm ci`.** Worktree sujo = **pare e reporte anomalia de terreno**.

## Regras do voto

`gravidade` **e** `escopo` (`dentro-do-bloco` | `pre-existente`) com **evidência de data ou origem**; sem
evidência = `dentro-do-bloco`. Publique **N e forma, inclusive versão do Node e `core.autocrlf`**.
**"Não consigo medir" = REPROVADO.** **Não proponha correção** (§C7.4-bis).

## Papéis (§C7.4-bis)

| Papel | Quem |
|---|---|
| Quem ACHOU | `inspetor-de-arnes-concorrente` (A-C2, ciclo 2) — **inelegível aqui** |
| Quem DECIDIU o corte | **o dono**, a partir do dossiê (§A1.1) |
| Quem DESENVOLVEU | `dev-gov-enxuto` — identidade distinta, não é o orquestrador |
| Quem JULGA | **C1** `validador-mestre` · **C2** `guardiao-fail-closed` · **C3** `agente-ci-doutor` |
| Gate | `inspetor-de-terreno-da-junta` |
| Orquestrador | briefing e ata; não implementa, não vota |

> **Elegibilidade das três, declarada:** elas votaram no **ciclo 1 do bloco anterior** e acharam os defeitos
> daquele ciclo — que **não são** os defeitos que este bloco conserta. Os achados que este bloco fecha são de
> `A-C2` (`inspetor-de-arnes-concorrente`), que **por isso está inelegível**. Se você discordar dessa leitura,
> **é achado de terreno**: reporte ao inspetor, não vote em silêncio.

## Modelo (`D-FALLBACK-MODELO-FABLE-OPUS`)

O `inspetor-de-terreno-da-junta` roda em **Opus**, não em Fable: **o limite de Fable da conta está esgotado**
(medido em 08/09, `rate_limit` HTTP 429 em `claude-fable-5-1`). A substituição é declarada no parecer dele.
**Se o Opus também esgotar, a rodada PARA** — é a regra que o dono acrescentou hoje, e não há terceiro degrau.

## Divulgação obrigatória (R2 do terreno) — declare no seu voto

O diff que você julga **contém** `25c0112a` (o head reprovado 3×0 **por vocês três**, no ciclo 1 do bloco
anterior) e `7facc396` (o conserto dos achados de vocês). Provado por `git merge-base --is-ancestor`.
O inspetor mediu e concluiu: **não há colisão que exija troca de cadeira** — os defeitos que ESTE bloco
conserta são da `A-C2`, que está inelegível. Mas **divulgação não é substituição**: cada uma **declara no
voto o que já julgou nesta linhagem**, como a ata do ciclo 2 fez com as dela.

**Corpo carregado × corpo julgado — medido pelo orquestrador:** os corpos de `validador-mestre`,
`guardiao-fail-closed` e `agente-ci-doutor` são **idênticos** (comparação EOL-neutra) entre esta branch e o
`.claude/agents/` da sessão de onde vocês são carregados. **Só o `inspetor-de-terreno-da-junta` diverge** —
e é ele mesmo quem reportou (ressalva R5): o corpo que rodou carrega um item 3.3 que manda bloquear por uma
norma (`§C7.1-quater`) que **não existe na `main` nem nesta branch**. Virou `P-GOV-INSPETOR-33-SEM-NORMA`,
decisão do dono. **Não cobrem o §C7.1-quater aqui** — seria reprovar sem defeito.

## Perda de jurado (R4 do terreno — o P3, que faltava)

Sob **maioria de 3**, uma queda somada a um 1×1 **não produz maioria**, e a piscina de elegíveis desta
linhagem já está estreita (6 identidades gastas em dois ciclos). Vale o **P3** do §C7.7, que o modelo de
mandato havia omitido: *voto perdido não conta; o sucessor tem identidade nova*; e a evidência que o caído
**gravou em arquivo** (P1) é **roteiro de re-execução barata** — o sucessor re-roda cada comando registrado
e compara, depois mede a cauda. **Conclusão sem comando registrado não é insumo.**
**Suplentes nomeados de antemão:** C1 → `inspetor-de-rotas` · C2 → `agente-secops` ·
C3 → `agente-dba-guardiao`. A junta **não fecha com menos de 3 votos de mérito**.

## Protocolo (§C7.7)

Após cada item: apense a `votos/B-GOV-ELENCO-ENXUTO/<cadeira>-evidencia.md` → comando · saída · veredito
parcial. [P1] Antes da mensagem final: escreva `votos/B-GOV-ELENCO-ENXUTO/<cadeira>-voto.json`; mensagem final
= **1 linha** apontando o arquivo. [P2] Máximo 3 itens. [P4]
