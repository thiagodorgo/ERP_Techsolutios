# J-B-SAN3-11 (PR #401) — ciclo 1

- **Objeto julgado:** `defa502ee0a03dabbc8786d568d00f7eb7ca726d`, resolvido **independentemente pelas três cadeiras**
  (`git` cruzado com `gh pr view 401 --json headRefOid`).
- **Base:** `origin/main` em `f03b883f` (#403), integrada no ramo; a `main` andou para `b404815c` (#404, registro puro)
  durante a junta, e o PR ficou `CONFLICTING` (registrado pela C3).
- **Quórum:** unanimidade de 3 (§C7.1-ter(b): o dossiê é prova do estado do veículo). Sem crítico.
- **Inspetor de terreno (§C7.1-bis):**
  - **1ª instância: `BLOQUEADO`** (`votos/B-SAN3-11/00-inspetor-terreno.md`): T13 e T14 vermelhos nesta máquina
    (teto de 30 s e regex cega a CRLF). Via V2: errata 1 e 1-bis do plano (§15, §15-bis), dev da errata, integração da
    `main` com o #402 e com o #403.
  - **2ª instância: `LIBERADO COM RESSALVA`** (`votos/B-SAN3-11/00-inspetor-terreno-b.md`): baseline 1230/1230 e 16/16
    nos dois terrenos (CRLF e LF). Fable 5.1, corpo de `origin/main` (`de80b2a9…`).
- **Descompasso declarado:** o porteiro do #403 pediu o registro dele antes do inspetor novo deste PR; o inspetor rodou
  antes de o parecer chegar. O registro foi pago depois, no #404.

## VEREDITO: **REPROVADO — 0 × 3**

| cadeira | identidade | md5 EOL-neutro do corpo | mandato_md5 | modelo | voto | achados |
|---|---|---|---|---|---|---|
| C1 — tela e prova impressa | `cognicao-visual` | `59632cb92550e620320a2ec896188e3d` | `cc2c6a79…` | Opus 5.5 | **REPROVADO** | 1 bloqueia · 3 ajuste · 2 nota |
| C2 — enumeração e mutação | `guardiao-fail-closed` | `5b0f7f5d31df366b69ac2cc8c113e963` | `36d40f03…` | Opus 5.5 | **REPROVADO** (`CONTRA`) | 2 bloqueia · 0 ajuste · 1 nota |
| C3 — acesso, allowlist e escopo | `coordenador-de-acessos` | `a4141c3170516194254e578d0e7acc8d` | `589f7348…` | Opus 5.5 | **REPROVADO** | 1 bloqueia · 2 ajuste · 1 nota |

Disparo pelo P5: C1 sozinha às 02:35 UTC; C2 e C3 juntas depois do voto da C1. A junta foi completada mesmo com a C1 já
reprovando, para o ciclo 2 nascer com todos os bloqueantes. Cada cadeira em worktree próprio (`w-j11c1/2/3`, removidos),
sem ler os votos umas das outras. **Quedas:** nenhuma cadeira caiu. Nenhuma substituição de modelo nos gates.

Evidência completa em `agent-orchestration/omega/juntas/votos/B-SAN3-11/`: `C{1,2,3}-evidencia.md`,
`C{1,2,3}-voto.json`, os dois pareceres do inspetor, `00-quedas.md` e os mandatos em `00-mandatos/`.

## Os bloqueantes (todos `dentro-do-bloco`)

- **C1-01:** os links novos "Ver versão vigente" e "Ver versão anterior" (`ChecklistRunsPanel.tsx` l.95 e l.105) não têm
  afordância de link nem estado de hover. Em repouso e sob `:hover`, o estilo computado é idêntico ao do texto em volta,
  porque `global.css` l.26-29 zera a cor e o sublinhado de todo `a`.
- **C2-01:** a remoção de uma chave no emissor (o DTO) não fica vermelha por construção. O gerador só testa
  "emitido contido no espelho e no adapter" e aceita a lista vazia; ausente ou inválido colapsa com `null` e vira vigente
  ou "não vinculada". Mutações M5b, M5c e M2 compilam, a suíte passa (1230/1230 em M2) e o gerador sai 0; em execução, a
  vistoria substituída aparece como "Concluído" (M2) ou o dossiê diz "não está vinculada" com a vigente na lista (M5b).
- **C2-02:** o próximo ponto de apresentação não classificado nasce do lado permitido: um receptor fora de
  `/run|checklist/i` (ou não identificador) é descartado em silêncio, e a "consulta" é aceita por qualquer leitura do
  campo.
- **C3-B1 (A15):** as pendências novas do §13 foram abertas sem dono válido — uma aponta para o `B-SAN3-12`, do
  financeiro, e a outra diz "a definir" —, e o índice as publica com dono "sim".

## Ajustes e notas (entram no plano do ciclo 2; não reprovam sozinhos)

- **C1-02:** com o corpo do modal rolável, o salto da âncora alinha a linha-alvo atrás do cabeçalho fixo.
- **C1-03:** cada clique numa âncora acrescenta `#vistoria-<id>` à URL e empilha uma entrada no histórico.
- **C1-04:** no cenário B do §0.5, o clique de mouse em "Ver versão vigente" não dá retorno visível; só por teclado.
- **C3-A1:** o T11 não asserta a exclusividade de atributo que o nome dele e o §8 prometem.
- **C3-A2:** a nota de backfill do próprio bloco diz que a entrada do #402 está sem os campos de backfill; no objeto, ela
  está preenchida.
- **Notas:** C1-05 e C3-N1, cada `id` `vistoria-<id>` existe duas vezes no DOM com o modal aberto; C1-06, o
  vermelho-controle do T4 no head-base falha por outro motivo que o plano promete; C2-03, o T14 é o único canário da
  emissão de `supersededByRunId` pelo DTO, e o acoplamento não está declarado.

## A classe se repetiu?

**Não, é o ciclo 1.** O padrão a vigiar no ciclo 2 é o do C2-01 e do C2-02: uma guarda que reconhece forma (nome de
receptor, presença de chave) em vez de enunciar a propriedade (toda apresentação da situação consulta o estado de
substituição; toda ausência da chave fica do lado fechado).

## §C7.4-bis — respondido antes de recompor a junta

- **(a) A composição cobre a competência que os achados exigem?** Sim: visual (C1-01), enumeração fail-closed (C2-01,
  C2-02), acesso e registro (C3-B1). O ciclo 2 mantém as três competências com **identidades novas** nas três cadeiras.
- **(b) Quem achou é quem conserta?** Não. Acharam a C1, a C2 e a C3 deste ciclo. Planeja o ciclo 2 um
  `planejador-mestre` em Fable, que não achou. Desenvolve um dev que não achou nem planejou. Nenhuma cadeira deste ciclo
  vota no ciclo 2.
- **(c) O planejador está usando dado podre?** Há um sinal: a nota de backfill do próprio bloco (C3-A2) envelheceu
  dentro do ramo quando a `main` andou. O planejador do ciclo 2 re-mede as premissas contra a `main` de agora e trata a
  decisão do §4 ("nulo é vigente") como premissa a reabrir, porque o C2-01 a ataca diretamente.

## Quem ocupou cada papel no ciclo 1

| papel | quem |
|---|---|
| planejador | `planejador-mestre` (Fable, sessão de nuvem): §0 a §14 · `planejador-errata1-b-san3-11` (Fable): §15 e §15-bis |
| dev | `dev-san3-11-dossie` (nuvem, `claude-sonnet-4-6`): o bloco · `dev-errata1-b-san3-11` (Opus): errata e integração da `main` com o #402 |
| inspetor | duas instâncias de `inspetor-de-terreno-da-junta` (Fable 5.1) |
| cadeiras | C1, C2 e C3 da tabela acima |
| orquestrador | registro, mandatos, briefing, integração da `main` com o #403; **não escreveu código do bloco** |
