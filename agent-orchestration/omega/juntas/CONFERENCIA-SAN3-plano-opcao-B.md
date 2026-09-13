# CONFERÊNCIA — aplicação da opção B no PR #386 (plano SAN3)

**Veredito: CONFERE em `bb3f5925`** — a primeira passada, sobre `042e689e`, deu **NÃO CONFERE**. Conferência de aplicação
da decisão do dono `D-SAN3-PLANO-OPCAO-B` (2026-09-13) — **não é junta de mérito**: o dono fechou o mérito; a cadeira
conferiu, por execução, se o que a decisão e o plano de aplicação mandaram está no objeto, e se nada além disso entrou.
**Cadeira:** `agente-ci-doutor` (Opus 5; corpo carregado = ref). Parecer e evidência, com as duas passadas (a primeira
intacta): `votos/SAN3-plano-opcao-B/conferencia-voto.json` e `conferencia-evidencia.md`.

## Papéis (§C7.4-bis)

Achadores: as cadeiras da junta do ciclo 2 (e, na aplicação, a própria conferência). Planejador da aplicação: o
orquestrador (`agent-orchestration/omega/planos/SAN3-plano-opcao-B-aplicacao.md`), que também decidiu as divergências
D1–D14 e N1–N2 reportadas pelo aplicador e a correção do CONF-01. Aplicador: um agente `general-purpose` distinto, em
quatro passadas e um adendo (`votos/SAN3-plano-opcao-B/00-aplicador.md`). Conferência: `agente-ci-doutor`, que votou como
C3 no ciclo 2 e achou o C3c2-01 — declarou isso, e conferiu inclusive a correção do próprio achado. Ninguém conferiu o que
escreveu.

## Primeira passada — `042e689e`: NÃO CONFERE

- **Item 1, fidelidade da aplicação — CONFERE.** O §5.6 é o §B do plano de aplicação (os fatos *(medir)* viraram fato
  medido, os nomes soltos viraram caminho completo); as marcas de CE nas células conferidas por script próprio; itens 55 e
  56 com IDs e blocos certos; item 16 = 27 + 13 = 40, medido; travas, `prisma/seed.ts` na fronteira do `B-SAN3-18` e o
  teste (g) com as duas metades; `RBAC_MATRIX.md` e código intocados.
- **Item 2, registro — NÃO CONFERE.** **CONF-01** (`bloqueia`, dentro da aplicação): nos itens 2, 19, 24, 30 e 31 do gate,
  nenhuma entrada do registro nomeava o bloco do §4.1 — os achados Ω6R desses itens vivem nas hospedeiras `P-O6R-B03`,
  `P-O6R-B04` e `P-O6R-B12`, e a `P-O6R-B12` ainda afirmava outro dono. **Causa: a instrução do planejador** (decisão D14)
  mandou enumerar os donos pela coluna de IDs do §4.1 — lista curada — e não pelas entradas que carregam os itens.
  **CONF-02** (nota): o gerador do índice não lia o formato das emendas de dono.
- **Item 3, números e KPI — CONFERE.**

## A correção

O planejador refez a propriedade **pela fonte e na forma estrita**: toda entrada que tem o item como sujeito (ID no
cabeçalho; na falta, bullet ou emenda "sobre" o ID numa hospedeira) nomeia o bloco do §4.1; catálogos que só citam o ID
(como a `P-O6R-BACKLOG`) não contam; linha de status superada não é o dono atual. Calibrou uma ferramenta própria no estado
reprovado antes de usá-la — a primeira versão dela deixava passar o item 24 pelo catálogo, e foi corrigida. O aplicador
acrescentou as emendas de dono nas hospedeiras dos itens 1, 2, 11, 19, 24, 27, 30 e 31 e passou as emendas de dono ao
formato `**dono:**` que o gerador lê. Duas ferramentas independentes (a do aplicador e a do orquestrador) deram 56 de 56
itens, 0 não-OK e 0 avisos.

## Reconferência — `bb3f5925`: CONFERE

- **Item 2, inteiro, com as ferramentas da cadeira — CONFERE.** 56 de 56 itens (68 de 68 pares item × ID × sujeito,
  inclusive as hospedeiras e os bullets `P-033` e `P-Ω3F6-CANCEL-RACE`); ponteiros com 0 divergente — 81 na forma estrita da
  cadeira (79 "§4.1 item N" e 2 "plano SAN3 v5, item 54"), 80 pela ferramenta do aplicador, as duas certas pela própria
  definição; linhas reescritas contra `ec4f34a8` = 18 (14 ponteiros e 4 `dono:` com "(antes: …)"), o resto acréscimo;
  índice byte-idêntico ao gerador; entradas do gate "a atribuir" no índice: 20 → 0.
- **Regressão dos itens 1 e 3 — nenhuma.** No plano, só uma linha a mais no §15; 56/37 coerente no plano, na trilha, no
  painel e na descrição do PR; 3 guards de KPI 28/28; `kpi-freeze --check`; `node --check Kpis/app.js`;
  `sync-agent-agents --check`.
- **R-01** (nota, da própria cadeira): a primeira conferência contou 8 entradas "a atribuir"; eram 20 — erro do parser dela,
  corrigido e declarado.

## O que acontece agora

- O merge do #386 fica autorizado pela decisão do dono, com esta conferência e o CI verde; depois, o
  `porteiro-pos-merge`, com o corpo da ref no prompt (R1 do inspetor do ciclo 2).
- Dívidas nomeadas para o primeiro PR depois do merge: o backfill §C3.5 do #386 e a aposentadoria rodada 3 das duas
  `jurado-san3c2-*`.
- A execução segue pelas quatro frentes do §6, bloco a bloco, cada um com o seu plano, o crítico nos blocos de
  invariante, o inspetor e a junta; as condições do §5.6 são conferidas pela junta de cada bloco.
