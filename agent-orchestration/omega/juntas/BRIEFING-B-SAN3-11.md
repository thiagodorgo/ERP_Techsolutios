# BRIEFING — junta 1 do B-SAN3-11 (PR #401): o dossiê rotula a vistoria substituída

> Escrito pelo orquestrador em 2026-10-02, depois da correção pré-junta (via V2 do parecer `BLOQUEADO` do primeiro
> inspetor) e antes do inspetor novo. Nada aqui é fato herdado: cada cadeira mede de novo.
> O plano do bloco é `docs/revisoes/SAN3/B-SAN3-11-plano.md`, com a §15 (errata 1) e a §15-bis (errata 1-bis) no fim.
> A junta é a da seção 10 do plano.

## Objeto

- **O head do PR #401**, resolvido pela própria cadeira por `git` e por `gh pr view 401 --json headRefOid`, com os
  check-runs concluídos. Nunca um SHA digitado.
- **O que o bloco muda é o diff do PR contra a `main`:** `git diff --name-only origin/main...<objeto>`. O código do bloco
  terminou no head do dev da errata (`6cb53df0`, seção ERRATA 1 do `DEV-relatorio.md`). Depois dele entraram três coisas,
  e nenhuma é código novo do bloco:
  - **A integração da `main` com o #402** (`B-SAN3-01b`, `3e40a256`), por merge do dev da errata. O único conflito fora
    de registro foi a linha do `test:smoke` em `frontend/package.json`, resolvida pela união dos dois acréscimos (o teste
    do #402 e o deste bloco), provada por conjunto. O KPI foi recontado contra essa `main`.
  - **A integração do registro do #402** (#403, `f03b883f`), por merge do orquestrador: só registro e KPI, sem mudar
    número, provada por multiconjunto.
  - **Registro da junta:** este briefing, os mandatos, os pareceres.
- **A cerca de cada mandato diz o head em que ele foi gerado**, que fica atrás do objeto porque o registro continua
  entrando no ramo. A norma da cerca vive no PR #393, ainda aberto, e não é norma da `main`: a cadeira resolve o objeto
  por conta própria, confere que o delta é só integração e registro e não bloqueia por cerca diferente do objeto.
- **A `main` de agora (`f03b883f`) está integrada no ramo.** O merge-base do objeto com a `main` é a própria `main`.

## O que mudou desde o primeiro inspetor

O primeiro inspetor bloqueou porque o baseline da bateria do bloco era vermelho nesta máquina: T13 e T14 de
`frontend/tests/patios-dossie-versao.smoke.test.tsx` dependiam do relógio (teto de 30 s com morte lida como "saída 1")
e do fim de linha do checkout (regex de mutação que não casava com CRLF). O CI Linux era verde no mesmo SHA.

- **§15 (errata 1, `planejador-errata1-b-san3-11`, Fable):** o arnês roda o gerador sem teto, com erro de execução e
  morte por sinal lançando exceção nomeada; toda mutação de fonte passa por um helper que normaliza o fim de linha e
  prova que aplicou; a `main` é integrada por merge e o KPI recontado contra ela. A emenda ao §6 permite `Kpis/app.js`
  **só** como saída de `node scripts/kpi-freeze.mjs`.
- **§15-bis (errata 1-bis, mesma identidade, Fable):** o dev provou que A17 e A18 eram inalcançáveis pela forma que a
  própria §15 prescrevia. A forma ficou e os critérios mudaram para A17′ e A18′ (varredura v2, que vê `status`
  coalescido como propriedade). Entrou o E9/A26: a linha de status da `P-CHK-DOSSIE-VERSAO-NA-UI` na forma que o
  gerador do índice lê, e o índice regenerado. O planejador nomeou o erro como dele, não do dev.
- **O dev da errata (`dev-errata1-b-san3-11`, Opus) mediu, no head do código `1c9466e2`:**

| terreno | CR no adapter | arquivo do bloco | `test:smoke` |
|---|---|---|---|
| CRLF (`core.autocrlf=true`, o desta máquina) | 583 | 16/16 | 1218/1218 |
| LF (`core.autocrlf=false`) | 0 | 16/16 | 1218/1218 |

  A varredura v2 no head final deu `TETO=0 · NULL=0 · CP=1 · EOL=3`. Depois da integração com o #402, o dev recontou
  por execução real: `blocks_completed` **171** (a `main` com o #402 tem 170) e `frontend_smoke_tests` **1230/1230** (os
  testes do #402 e os deste bloco somados). Esses números são do dev: a cadeira mede de novo o que usar.
- **Nota de terreno, pré-existente:** num head intermediário deste ramo, o job `backend` do gatilho de push falhou no teste
  do portal de autoridade "§2.8: resposta OK = allowlist {session, authorityName}"; o mesmo job passou no gatilho de pull
  request e na reexecução. É intermitente e alheio ao bloco. Um vermelho igual no objeto é insumo do voto, e a cadeira
  classifica o escopo com a evidência de origem.

## Quórum e cadeiras

**Unanimidade de 3** (§C7.1-ter(b): o dossiê é prova do estado do veículo, e a classe é dado apresentado como prova).
Sem crítico. Sem suplente nomeado; queda relança a mesma identidade, que não herda conclusão; voto perdido nunca aprova.

| cadeira | identidade | itens (seção 10 do plano) |
|---|---|---|
| C1 | `cognicao-visual` | render real das três superfícies com as fixtures A1, B1 e B3, e a âncora no modal medida no navegador; literais e estados; o T4 com vermelho-controle no head-base |
| C2 | `guardiao-fail-closed` | o gerador no head e uma mutação nova própria; T12 a T14 rodados; a decisão do §4 (`null` ⇒ vigente) |
| C3 | `coordenador-de-acessos` | P-o no catálogo e a aba de acesso negado; T11 e ids só em atributos; o diff contra o §6 com a emenda da §15.5 e da §15-bis.8, as pendências e o KPI |

**Modelo:** o contrato fixa Fable só para gates e planejador. As cadeiras rodam em **Opus 5.5**, declarado no disparo
e na 1ª linha da evidência de cada uma.

**Inelegíveis, por nome:** o `planejador-mestre` que escreveu o plano (§0 a §14); o dev de nuvem `dev-san3-11-dossie`
(rodou em `claude-sonnet-4-6`, o modelo da sessão de nuvem); o `planejador-errata1-b-san3-11`; o
`dev-errata1-b-san3-11`; a instância do inspetor que emitiu o primeiro parecer; o orquestrador.

## Ressalvas do primeiro inspetor que a junta herda como contexto, não como fato

- **R1:** a evidência e o voto das cadeiras nascem como arquivos novos em `votos/B-SAN3-11/` no worktree do
  orquestrador. Isso não é mutação viva do código: nenhum arquivo rastreado é tocado.
- **R2:** há resíduo inerte de outras rodadas na árvore principal e worktrees antigos. Resíduo alheio se reporta, não
  se varre.
- **N1:** `Kpis/app.js` no diff é a saída do `kpi-freeze` (emenda da §15.5), conferida pela C3 como 2 linhas
  `var FROZEN`.
- **N2:** o pacote `playwright` está no `package.json` da raiz, e o Chromium já está instalado na máquina. A C1 precisa
  de `npm ci` da raiz no worktree dela se usar esse arnês.
- **N3:** os corpos das três cadeiras não fixam `model:`; cada cadeira declara o modelo em que rodou.
- **N5:** a errata 15.15 e os `scripts/mandato-*.sh` vivem só no PR #393, aberto: forma do mandato, não norma da ref.
- **N6:** não há suplente nomeado por cadeira.

## O inspetor novo (2ª instância): `LIBERADO COM RESSALVA`

Parecer em `votos/B-SAN3-11/00-inspetor-terreno-b.md`. O baseline que bloqueou o primeiro inspetor não se reproduz no
objeto, nos dois terrenos desta máquina (CRLF e LF). As ressalvas R1 a R3 repetem as do primeiro parecer. A nova é a
**R4**: a rodada 1 do inspetor correu com os dois terrenos em paralelo, então a **C2 cola o `duration_ms` de T12, T13 e
T14 e a contagem de `morto por sinal`** (esperado 0) da execução dela. As notas N4 e N7 do primeiro parecer estão
superadas: a P7 está no `CLAUDE.md` do objeto e a `main` está integrada.

## Pré-existentes nomeados pelo plano (seção 10) — não reprovam

A vigente não vinculada ao processo (P-e/A1), a ausência de tela de execução na web
(`P-WEB-CHK-EXECUCOES-INEXISTENTES`), a ordem indefinida do repositório (B1b), o caminho errado do `CLAUDE.md` §11
(P-i) e o ramo `demo/investidor`, com a evidência de data do plano. A penalidade de primeira leitura do `fs.cpSync`
nesta máquina é condição de terreno (§15.11), não achado de produto. Achado novo da mesma família é achado: a cadeira
declara o escopo com evidência de data ou origem.

## Ambiente de quem mede

Nunca `export MSYS_NO_PATHCONV=1`; publique `env | grep -c '^MSYS_NO_PATHCONV='` = 0, `git --version`, `node -v` e
`uname -srm` antes de medir. A base viva (`erp-postgres` 5432, `erp-redis` 6379) nunca é alvo; o plano diz que nenhum
jurado precisa de banco. Worktree próprio em caminho curto, removido pelo nome depois de conferir que nenhum processo
seu está vivo nele. Nunca `tail -f`. Timeout em tudo o que executa artefato mutado. O checkout desta máquina é CRLF:
uma mutação por regex tem de provar que aplicou antes de a cor do teste valer.

## Regra de voto

Todo achado declara **`gravidade`** (`bloqueia` | `ajuste` | `nota`) e **`escopo`** (`dentro-do-bloco` |
`pre-existente`, este com evidência de data ou origem, sem a qual conta como `dentro-do-bloco`). **"Não consigo
medir" = REPROVADO.** Nenhuma cadeira propõe correção (§C7.4-bis). As três votam juntas, sem ler o voto umas das
outras. Evidência incremental em `votos/B-SAN3-11/C<n>-evidencia.md` e voto em `votos/B-SAN3-11/C<n>-voto.json`,
nascido como esqueleto `EM APURAÇÃO` e gravado item a item (P1, P2). Sob PAUSA, grava `## PAUSA <hora UTC>` e para
(P7).
