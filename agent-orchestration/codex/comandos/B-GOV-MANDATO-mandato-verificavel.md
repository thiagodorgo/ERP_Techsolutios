# B-GOV-MANDATO — o mandato do orquestrador passa a ser verificável por máquina

- **Tipo:** feature (orquestração/governança — atualiza KPI no próprio PR, §C3)
- **Fase:** Execution / Validation (A5)
- **Trilha:** backend/orquestração — `scripts/**` e `tests/**`; **não toca** `src/`, `prisma/`, `frontend/`, `mobile/`, `.github/`
- **Data:** 2026-09-25
- **Branch:** `chore/mandato-refs-e-preflight` · base `origin/main@fc3363e3` (B-SAN3-00, #392)
- **Autor:** Claude Code (rodada SAN3) — dev em Opus 5 (1M), `claude-opus-5[1m]`

## Objetivo

Fechar a **peça 1** do circuito que o `docs/revisoes/SAN3/PLANO_SAN3.md` descreve — *"a premissa entra pelo mandato do
orquestrador, escrita como fato"* — e fechá-la do único jeito que não depende de ninguém lembrar: por
**máquina**. O bloco entrega duas ferramentas e um guard, e o **próprio mandato deste bloco foi o primeiro
escrito no formato que ele cria**, validado pelo pré-voo antes de sair.

**A prova de que regra em memória não basta.** A regra *"a prova tem de poder falhar"* **já estava escrita** e
foi violada dez vezes numa rodada. A pior está no mandato do ciclo 3 do `B-O6R-11`, **linha 8**: *"A raiz,
**medida**: … a perda **medida** é `0/N`"* — número **herdado da ata do ciclo anterior**. O ciclo inteiro
apontou para a classe que **não perde dado hoje**, e treze linhas abaixo o mesmo arquivo exigia do planejador
*"para CADA critério, a mutação que o deixaria vermelho"*.

**O que o bloco NÃO faz:** não toca produto (zero byte de `src/`, `prisma/`, `frontend/`, `mobile/`), não muda
CI, não cria dependência e não altera contrato de API.

## Contexto / fontes de verdade

- Ler antes: `agent-orchestration/docs/status-geral.md`, `agent-orchestration/controle/`,
  `agent-orchestration/codex/log-execucao.md`.
- Registros que o bloco materializa em código: `REGISTRO-SAN3-00-APPROVED-HEAD` (a régua — `approved_head` é o
  objeto que a **ata** nomeia) e `REGISTRO-SAN3-00-APPROVED-HEAD-DUAS-VEZES` (o orquestrador errou a mesma
  régua **duas vezes**, e a segunda foi no mandato do PR que a consertava).
- Governança aplicável: `CLAUDE.md` §A2 (conflito não se resolve em silêncio), §C3 (KPI por PR), §C4 (escopo),
  §C5 (limpeza), §C6 (rastreabilidade), §C7.4-bis (o dev implementa e **reporta** divergência, não decide).
- Sem UX: o bloco não tem tela, logo `screen-refs/` e §11 não se aplicam.

---

## O que entra

### 1. `scripts/mandato-refs.sh` — o orquestrador nunca digita SHA

Imprime head, base, merge-base, merge commit, check-runs e o `approved_head` **lido da ata**. Nunca de
`gh pr view` nem do head do ramo: onde houve pré-merge os dois **divergem por construção**, e publicar o head
do merge apaga a informação de *o que foi julgado*.

**O matcher da ata errou três vezes a mesma classe** — "a ferramenta que responde a pergunta VIZINHA" —, e as
três estão no cabeçalho do script para ninguém repetir:

| tentativa | por que falhou |
|---|---|
| casar pelo **ramo** | falso-negativo no #390: a ata cita "PR #390" e **não** cita o ramo |
| casar por "o **documento** menciona #PR" | devolvia a ata do #392 para os três PRs — ela menciona #390 e #391 ao pagar dívidas deles. **Mencionar ≠ ser sobre** |
| casar pelas **primeiras 8 linhas** | **janela, não propriedade**: basta a menção cair dentro dela. Quem pegou foi o guard |

Discriminador final: **título (`# J-…`) + linha do objeto**, e nenhuma outra linha vota. Quando não há ata, o
script **não inventa** — diz que não há `approved_head`.

### 2. `scripts/mandato-preflight.sh` — o mandato só sai se passar

Seis checagens: (1) as duas seções existem; (2) **nenhuma linha de conteúdo fora** de `MEDIDO`/`HIPOTESE`;
(3) todo item de `MEDIDO` tem `medido por:` e todo item de `HIPOTESE` tem `derruba com:`; (4) todo SHA citado
está na saída do `mandato-refs.sh` — **resolver não basta**, porque o `a62d04e2` resolvia e estava errado, e
SHA **velho** também passa por `cat-file`; (5) asserção de ausência com `grep -i` (foi um grep sensível a caixa
que deixou um ajuste de quórum pela metade); (6) todo caminho citado existe.

> **Se não dá para escrever o comando que derruba, não é hipótese: é opinião, e não entra.**

### 3. `tests/mandato-refs.test.ts` — 6 casos

As **três regressões do matcher como fixture**, o modo `--sha-only` que o pré-voo consome, o cabeçalho que
nomeia o defeito, e um **vermelho-controle** que prova que o matcher errado (documento inteiro) devolve
`7822deaf` para o #390 — ou seja, que as fixtures **discriminam**.

## Escopo PERMITIDO

- `scripts/mandato-refs.sh` · `scripts/mandato-preflight.sh` — arquivos **novos**.
- `tests/mandato-refs.test.ts` — arquivo **novo**.
- `agent-orchestration/**` — este comando, `controle/` (pendências e índice) e a trilha
  (`docs/status-geral.md`, `codex/log-execucao.md`).
- `Kpis/**` — `kpis-latest.json`, `kpis-history.json`, `kpis-history.md`, `app.js` (pela `kpi-freeze`, **nunca
  digitado**).

## Escopo PROIBIDO

- `src/**` · `prisma/**` · `migrations/**` · `frontend/**` · `mobile/**` · `.github/**` · `infra/**` · `.env` ·
  lockfiles JS · `pubspec.yaml`/`pubspec.lock` · Figma.
- `CLAUDE.md` · `AGENTS.md` · demais arquivos-base da raiz.
- Qualquer outro arquivo de `scripts/` ou `tests/` além dos três nomeados acima.
- As árvores de trabalho alheias e a árvore principal: leitura sim, escrita **nunca**.

## Bateria de validação (§9 — trilha backend, com a regressão de front)

```bash
npx prisma generate                 # com DATABASE_URL no ambiente (worktree novo)
npm run check
npm run lint
npm test
npm run build
npm --prefix frontend run check
npm --prefix frontend run build
node --test --import tsx tests/mandato-refs.test.ts
node scripts/kpi-freeze.mjs --check
node --test --import tsx tests/kpi-dashboard-charts.test.ts
node scripts/sync-agent-agents.mjs --check
node --check Kpis/app.js
git diff --cached --check || exit 1
```

> A última linha fica **em linha própria** e com `|| exit 1`: encadeá-la com `&&` numa linha e deixar o commit
> na seguinte já deixou *whitespace* entrar duas vezes (`feedback-checagem-como-trava`).

> **Worktree novo precisa de `npx prisma generate` com `DATABASE_URL` no ambiente** — sem isso o `check` acusa
> erro de Prisma que **não é do bloco**.

## Estados obrigatórios (§7)

Não se aplicam — o bloco **não tem tela**: nenhum arquivo de `frontend/` ou `mobile/` no diff. Declarado, não
omitido.

## KPIs no próprio PR (§C3)

- `backend_tests`: **REEXECUTADO** neste PR — o bloco acrescenta casos à suíte, logo a trilha é **medição**, não
  carga. O número publicado é o **medido**, nunca o suposto.
- `frontend_smoke_tests` e `flutter_tests`: **CARREGADOS com nota** (§C3.3) —
  `git diff --name-only fc3363e3 <head> -- frontend mobile` sai **vazio** (N=0), e
  `git status --porcelain -- frontend mobile` também.
- `blocks_completed`: **167 → 168** (+1). O 167 é o publicado na `main`, medido por
  `git show origin/main:Kpis/kpis-latest.json`.
- `mvp_demo`/`mvp_vendavel`: **INTOCADOS** (§C3.4) — o bloco não move escopo de produto: entrega ferramenta de
  orquestração, não funcionalidade ao usuário.
- `merge_commit`/`approved_head` deste PR: **`null` na autoria** (§C3.5); `pr` = **393**.
- `Kpis/app.js` regenerado por `node scripts/kpi-freeze.mjs` — a cópia congelada **nunca é digitada**
  (`D-KPI-INDEX-PAINEL`). O painel não ganha dimensão nova, logo não há visualização nova a entregar.

## Junta (§C7)

- **Quórum: maioria de 3** (§C7.1-ter(b)) — o bloco **não** toca dinheiro, segurança, permissão nem perda de
  dado: zero byte de `src/`, `prisma/`, `frontend/` ou `mobile/`, e as duas ferramentas são **read-only** sobre
  o repositório (nenhuma escreve arquivo; o pré-voo só lê e sai 0/1).
- **Itens que a junta tem de julgar por medição própria, nunca por leitura deste comando:**
  - (a) o **matcher da ata** — que ele case o #390 (cuja ata não cita o ramo) e **não** devolva a ata do #392
    para o #390; e que sem ata devolva **nulo** em vez de chutar;
  - (b) o pré-voo nos **dois sentidos**: **rejeita** o mandato que iniciou o loop e **aceita** um escrito no
    formato novo — verde sem vermelho-controle não é prova;
  - (c) o **KPI por reexecução**, com N e forma, e o Δ da suíte decomposto por arquivo;
  - (d) a fronteira: `git diff --name-only fc3363e3 <head> -- src prisma frontend mobile .github` **vazio**;
  - (e) a pendência nova do §6 — se a descrição bate com a medição.
- **Registro da junta:** `agent-orchestration/omega/juntas/J-B-GOV-MANDATO.md` — junta sem registro = merge
  inválido.
- **Inspeção de terreno (§C7.1-bis):** `inspetor-de-terreno-da-junta` **antes** do voto; sem o `LIBERADO` dele a
  junta não começa. **Atenção ao head:** o ramo andou durante a autoria (`f8d5a2c8` → `1ae82626`); a âncora se
  **mede**, não se copia do papel.

## §6 — pendência que o bloco ABRE

- `P-GOV-MANDATO-PREFLIGHT-CAMINHO-POR-BASENAME` (**BAIXA**, não bloqueia) — a checagem 6 do pré-voo aceita um
  caminho **errado** cujo *basename* exista em qualquer lugar do repositório. Medida por execução, com
  vermelho-controle. Descrição completa em `agent-orchestration/controle/pendencias.md`.

## Definition of Done (§10)

- [ ] Escopo respeitado: nada de `src/`, `prisma/`, `frontend/`, `mobile/`, `.github/`.
- [ ] Bateria acima **verde**, com `git diff --cached --check` em linha própria antes de cada commit.
- [ ] Pré-voo provado nos **dois sentidos** (rejeita o mandato velho, aceita o novo).
- [ ] KPI no próprio PR, com `backend_tests` **reexecutado** (N e forma) e as outras duas trilhas
      **carregadas com nota**.
- [ ] Índice de pendências **regenerado pelo gerador**, nunca digitado.
- [ ] Artefatos temporários limpos (§C5) e, **após o merge**, `bash scripts/post-merge-cleanup.sh`.
- [ ] Estados §7 e fidelidade §11: **não se aplicam** (bloco sem tela) — declarado, não omitido.

## Rastreabilidade (§C6)

- **ID:** B-GOV-MANDATO
- **PR #:** 393
- **Head medido na autoria:** `1ae82626f16f510774a0304bebe7612c46914da8` (por `bash scripts/mandato-refs.sh 393`)
- **Merge-base:** `fc3363e38aabd77f54e6b53034128182f8000571`
- **Merge commit:** `null` na autoria → backfill pós-merge
- **Approved head:** `null` na autoria → backfill pós-merge (a junta ainda não votou; o `mandato-refs.sh`
  devolve `<NAO ENCONTRADO NA ATA>`, que é o comportamento correto)
- **Gate:** item 1 do circuito do `docs/revisoes/SAN3/PLANO_SAN3.md` (a peça mecânica)
- **Junta:** `agent-orchestration/omega/juntas/J-B-GOV-MANDATO.md`
- **Status:** `published_per_pr`
- **Contrato(s) versionado(s):** nenhum — o bloco não toca API.

---

# EMENDA — CICLO 2 (2026-09-26), depois da reprovação 2 × 1

> Escrita pelo **desenvolvedor do ciclo 2** (identidade nova), a partir de
> `docs/revisoes/SAN3/B-GOV-MANDATO-ciclo2-plano.md` — o plano é o contrato; esta emenda só registra no
> comando o que ele mudou. Quem achou (cadeiras C1 e C2) não planejou nem consertou; o planejador não
> desenvolveu; o orquestrador está **inelegível como dev** (escreveu o código original).

## O que o ciclo 1 entregou, e por que foi reprovado

Ata `agent-orchestration/omega/juntas/J-B-GOV-MANDATO.md` — **REPROVADO 2 × 1**, quatro bloqueantes de uma
**classe única**: *guarda que reconhece uma FORMA CONHECIDA em vez de enunciar a PROPRIEDADE* (C1-01, C2-01,
o basename) e *insumo não validado tratado com a confiança do caminho feliz* (C2-02, C2-03).

## Emenda 1 — Escopo PERMITIDO ganha **um** arquivo, nominalmente

`tests/mandato-preflight.test.ts` — **NOVO**. Isto **diverge** da linha do Escopo PROIBIDO acima
("qualquer outro arquivo de `scripts/` ou `tests/` além dos três nomeados"), e a divergência está
**declarada de propósito**: é a lição do achado C3-01 do ciclo 1, em que seis corpos de jurado ficaram fora
do permitido sem ninguém declarar. O §4 do plano do ciclo 2 autoriza **exatamente este arquivo** e nada mais.
Tudo o mais do Escopo PROIBIDO segue de pé, e o plano acrescenta: `.gitattributes`, **as 106 outras atas** de
`agent-orchestration/omega/juntas/`, o `TEMPLATE-J-ata.md` (alheio e não rastreado — reportar, não tocar) e
os três corpos `jurado-mandato-c{1,2,3}-*` do ciclo 1 (identidades julgadas).

## Emenda 2 — Bateria: três linhas novas

```bash
node --test --import tsx tests/mandato-preflight.test.ts    # NOVO
bash scripts/mandato-refs.sh 392 ; echo ec=$?               # VIVO: esperado ec=3 (NAO DETERMINAVEL)
bash scripts/mandato-refs.sh 393 ; echo ec=$?               # VIVO: esperado ec=3 — o caso C8 sobre ata REAL
bash scripts/mandato-refs.sh 387 ; echo ec=$?               # VIVO: esperado ec=3 (ata múltipla)
bash scripts/mandato-preflight.sh <relatorio-do-dev.md> 393 # DOGFOODING do próprio relatório
python agent-orchestration/controle/gerar-indice-pendencias.py   # o gerador NÃO está em scripts/
```

## Emenda 3 — o que os artefatos passam a prometer

| artefato | promessa nova | onde ela mora agora |
|---|---|---|
| `tests/mandato-refs.test.ts` | vermelho se — e só se — o **comportamento** do artefato muda | `spawnSync("bash", [<o .sh>, …])` em 100 % dos casos; zero réplica, zero leitura de comentário |
| `scripts/mandato-preflight.sh` | cada checagem enuncia **propriedade sobre o documento** | unidade (3) · token (4) · comando (5) · existência exata (6) · rótulo confrontado (7, nova) |
| `scripts/mandato-refs.sh` | `approved_head` em **três estados**: LIDO · AUSENTE · NÃO DETERMINÁVEL | ec 0/0/3; insumo validado antes do laço; fonte = `origin/$BASE` ∪ head do PR |
| `tests/mandato-preflight.test.ts` | o pré-voo entra no CI | o runner lista `tests/*.test.ts` por `expandTestFiles` — **sem tocar `.github/`** |

## Emenda 4 — códigos de saída do `mandato-refs.sh` (contrato novo, documentado no cabeçalho)

`0` LIDO ou AUSENTE · `1` PARADO (insumo do ambiente) · `2` USO (chamada errada) · `3` NÃO DETERMINÁVEL.
Consumidor: a checagem 4 do pré-voo lê o `ec` — `1`/`2` viram `REJEITADO: referências indisponíveis` (e
**nunca** "SHA velho", que era culpar o mandato pela morte da ferramenta), e `3` vira `AVISO`.

## Emenda 5 — custo declarado que a junta 2 precisa ver antes de votar

`linha_estrutural_approved_head = 0` em **107** atas de `origin/main@fc3363e3` (e 0 em 108 no head do ramo).
Logo **LIDO é inalcançável no corpus de hoje**, e #390/#391/#392 deixam de sair como "lidos": passam a
`NÃO DETERMINÁVEL` com o objeto listado. Eles estavam certos **por sorte do veredito** — os três foram
aprovados, e a ferramenta não sabia. O ritual que faz nascer a linha tem dono:
`P-GOV-ATA-APPROVED-HEAD-LINHA` → bloco `B-GOV-ATA-CABECALHO`.

## Emenda 6 — rastreabilidade do ciclo 2

- **Head do ciclo 1 (objeto reprovado):** `7462b75bfb7768556a2da2ee13f9ac92e9198872`
- **Head em que o ciclo 2 começou:** `9aa8fc7ebec95914722a9bbe15b907b8c788f7f2` (`git rev-parse`, conferido
  contra `git rev-parse origin/chore/mandato-refs-e-preflight`)
- **Merge commit / approved head:** `null` na autoria → backfill pós-merge (§C3.5)
- **Pendência fechada:** `P-GOV-MANDATO-PREFLIGHT-CAMINHO-POR-BASENAME` (teste de encerramento colado nela)
- **Pendências abertas:** `P-GOV-ATA-CABECALHO-TEMPLATE`, `P-GOV-ATA-APPROVED-HEAD-LINHA`,
  `P-GOV-MANDATO-2-FRONTEIRAS`
- **Fica devendo, e é do orquestrador (não do dev, §4 do plano):** nomear `B-GOV-ATA-CABECALHO` e
  `B-GOV-MANDATO-2` na fila do `docs/revisoes/SAN3/PLANO_SAN3.md` §5.3, e escrever a seção do ciclo 2 na ata. *(ciclo 4, C3c-03: era `§7.3`; os dois blocos estão no §5.3, l.268-269.)*

---

# EMENDA — CICLO 3 (2026-09-28), depois da 2ª reprovação

## O que o ciclo 2 entregou, e por que foi reprovado de novo

O ciclo 2 moveu cada checagem de FORMA para PROPRIEDADE e os guards passaram a exercitar o `.sh` de
verdade. A junta 2 reprovou por uma classe ainda mais estreita: **cada checagem tinha o seu próprio
reconhecedor de seção e de cerca**, e a agregação de unidades era decidida por *aparência da linha*
em vez de pela **estrutura** do documento. Daí saíam os dois lados: uma evidência absolvia cinco
afirmações (sobre-isenção) e um cabeçalho de seção virava unidade (sobre-rejeição).

## Emenda 1 — o que o ciclo 3 mudou nos artefatos

1. **Oráculo único** de seção e de cerca: um só reconhecedor, consultado por todas as checagens.
2. **Agregação limitada pela ESTRUTURA**, não pela forma da linha: linha de tabela nunca agrega, e
   linha indentada **depois** do token de evidência abre unidade nova.
3. **O campo `approved_head` passa a ser TOKEN RESERVADO de documento inteiro.** Detectar
   "afirmação" em prosa é reconhecer forma; a v3 inverte o ônus — o token é proibido, e a **única**
   forma de ele aparecer num mandato é a **colagem verbatim** da saída da ferramenta (isenção I1).
4. **Inventário COMPLETO de isenções I1–I20**, cada uma com escopo exato e recíproco nos dois lados
   (entre unidades e dentro da unidade). "Isenção fora do inventário não existe" passa a ser
   verdadeiro, e verificável.
5. **`scripts/mandato-mutantes.sh` (E4, novo):** a cobertura por mutação deixa de ser adjetivo. O
   ciclo 2 publicou "30 mutações executadas" e ninguém reproduzia o número. Agora é um comando, com
   os pontos de decisão **enumerados da fonte**, um mutante por ponto com operador declarado, e a
   **lista dos sobreviventes** publicada em `docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-mutantes.md`.

## Emenda 2 — ERRATA do §E4.6 do plano do ciclo 3 (medida, não opinada)

A receita literal da sonda de controle — `[ -n "$SONDA_INEXISTENTE" ] || parado "sonda"` — **não
serve**. Com a variável ausente o teste `-n` é FALSO, o `||` dispara e o artefato **pristino** passa a
abortar sempre, destruindo a linha de base contra a qual todo mutante é comparado. A sonda entregue
usa a polaridade que preserva o pristino (`-z` com `${…:-}`): pristino no-op, mutante M1 no-op, guard
verde, sonda **NÃO-COBERTA** — que é exatamente o que o controle existe para provar.

## Emenda 3 — ERRATA da regra 8 do §8 (medida)

A regra manda escrever o nome do campo reservado com **uma letra entre colchetes** para não disparar a
checagem 7. A E2.b normaliza o documento a alfanuméricos **antes** de procurar o token, e os colchetes
caem: a grafia de contorno é rejeitada com a **mesma mensagem, na mesma linha**, do nome escrito por
inteiro. Não existe hoje escape documentado; o contorno real é **não escrever o nome** (dizer "o campo
reservado" e elidir a linha de TAP que o contém). Registrado como a **nona** fronteira em
`P-GOV-MANDATO-2-FRONTEIRAS`.

## Emenda 4 — o que o ciclo 3 NÃO fecha, e por quê

`[B8b]` e `[F-EOL/s7-neg]` exigem vereditos **opostos** do **mesmo** insumo — as fixtures são byte a
byte iguais. Nenhum artefato satisfaz os dois. Pelo contrato (plano v3 l.21/24/310/340/525/1007 e
§12.3 l.1158) quem está certo é o `s7-neg`: o `[B8b]` pede aceitação da forma em item de lista, que é
o critério da **v2**, revogado pela v3. Fechá-lo exigiria uma isenção **fora do inventário** e
estreitaria o gatilho da checagem 7. O desenvolvedor do artefato **não toca `tests/**`** (§4), então
**reporta**: `P-GOV-MANDATO-3-B8B-CONTRADICAO`, ALTA, **bloqueia o merge** (CI vermelho em 1 de 3385).

## Emenda 5 — rastreabilidade do ciclo 3

- **Bloco:** `B-GOV-MANDATO` ciclo 3 · **PR:** #393 · **status:** `published_per_pr`
- **`merge_commit` / `approved_head`:** `null` na autoria (§C3.5), com backfill pós-merge.
- **KPI:** `backend_tests` 3103/3105 → **3382/3385**, execução real no job `backend` do CI, delta
  decomposto por arquivo (guards 51 → 331 casos) e o único vermelho nomeado.

## Emenda 6 — escopo nominal pós-§14 (a "Emenda 4 — escopo nominal pós-§14" do plano §14.14)

> Escrita pelo **Dev-S-2** (`dev-s2-mandato-registro`) no K1 do ciclo 3 (2026-09-29), a partir do plano
> `docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-plano.md` §4, §13.2, §14.4, §14.8, §14.12 e §14.14 — o plano é o
> contrato; esta emenda registra no comando o que ele mudou. **Divergência de numeração, declarada:** o §14.14
> manda acrescentar uma "Emenda 4" e diz que esta seção tinha "Emendas 1–3"; medido na fonte, ela já tinha
> **1–5** quando o §14.14 foi escrito (`c7eef1fd`; as 4 e 5 entraram em `1466c7d9`, 2026-09-28 03:25). Uma
> segunda "Emenda 4" duplicaria o número; esta é a **6**, com o título do plano preservado acima.

**Escopo PERMITIDO — acréscimos nominais do ciclo 3 além do escopo do comando original** (cada linha com a
fonte no plano; a C3‴ confere que estão também aqui, ERRATA E-7(b)):

| arquivo | ação | quem / commit | fonte no plano |
|---|---|---|---|
| `scripts/mandato-mutantes.sh` | NOVO (E4). **Diverge** da linha do Escopo PROIBIDO ("qualquer outro arquivo de `scripts/` ou `tests/`"), declarado como na Emenda 1 do ciclo 2 | Dev-S do ciclo 3 (`616fd4fa`, `1466c7d9`); Dev-S-2 fase 1 (`c32f77b5`: aborta com linha de base suja) | §4, §13.5 |
| `docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-mutantes.md` | NOVO — matriz, equivalentes, controles, [M-2] | Dev-S; K1 e K2 do Dev-S-2 | §4, §14.12 |
| `tests/mandato-preflight.test.ts` | **só** os hunks de `[B8a]`/`[B8b]`/`[B8c]` + o `[B8d]` novo (semântica v3) | Dev-T-3 (`dev-t3-mandato-b8-refs`, `9d3de5dd`) | §13.1, §13.2 |
| `tests/mandato-refs.test.ts` | **só adições** contra `34969a81` ([P-0]): `[V16]`–`[V19]`; depois `[V18b]`/`[V18c]` e a frase do comentário do skip do `[V18]` | Dev-T-3 (`9d3de5dd`); **Dev-T-4** (`dev-t4-mandato-refs-win32`, `395d07c9`) | §13.2, §13.4, §14.4 |
| `agent-orchestration/omega/juntas/votos/B-GOV-SEM-TETO/PORTEIRO-395.md` | NOVO, byte a byte, md5 EOL-neutro `9cd7cb00020f0577044eb2ed3de4e3b8` (na mensagem do commit e no corpo do PR) | orquestrador / commit de registro da junta (passo 6 do §14.12) | §14.14 R-D, R-E |
| `Kpis/kpis-history.md` — a linha `pr / merge_commit / approved_head` da entrada do #394 | 1 linha reescrita: `394` / `b3f0af5f…` / `7ad08690…` (os valores do JSON), com a marca do backfill | Dev-S-2 / K1 | §14.14 R-A |
| `agent-orchestration/controle/pendencias.md` — as 2 ocorrências de `dd79c96f` (item 2.2 do inspetor) | âncora → `b3f0af5f` (o squash do #394 na `main`), data mantida, marca escrita | Dev-S-2 / K1 | §14.14 R-B |

`pendencias-indice.md` continua **só pelo gerador**; `Kpis/app.js` **só por `kpi-freeze`**; nada do Dev-S-2 toca
`tests/**` (o fase 1 tocou só `scripts/**`; o K1, só registro). `J-B-GOV-SEM-TETO.md` e `votos/B-GOV-SEM-TETO/*`,
vindos da `main`, também citam `dd79c96f` e ficam **intocados** — registro de outro bloco.

**Identidade da matriz E4 (plano §14.8; emenda o "4 artefatos" do §13.5).** A identidade de **cada** matriz são os
**3 blobs que a ferramenta lê para aquele alvo** — refs: `scripts/mandato-refs.sh` + `tests/mandato-refs.test.ts` +
`scripts/mandato-mutantes.sh`; pré-voo: `scripts/mandato-preflight.sh` + `tests/mandato-preflight.test.ts` +
`scripts/mandato-mutantes.sh`. O cabeçalho de `…-mutantes.md` grava os 5 blobs; só a **tripla** de cada matriz é
critério. Blobs no head deste K1 (`git rev-parse <head>:<caminho>`): refs `474c7521` · pré-voo `faa408c8` ·
ferramenta `37549262` · guard do refs `9e680314` (Dev-T-4) · guard do pré-voo `3d875a54`. Os blobs ficam
**congelados** da rodada E4 ao voto da junta 3 — a matriz é indexada por número de linha —, exceto o guard do
refs, cuja matriz é reexecutada no blob novo (E4-refs-2) (§14.2.1, §14.4).

**ERRATA à Emenda 1 do ciclo 2 (entrega E5 do plano do ciclo 3).** Onde a Emenda 1 do ciclo 2 diz *"as 106 outras
atas"*, leia-se **107**: medido por `git ls-tree -r --name-only <ref> agent-orchestration/omega/juntas/ | grep -cE
'/J-[^/]*\.md$'` — `fc3363e3` = **107** (nenhuma delas é a deste bloco). Depois da integração: `3b1fe0f9` (o `$MB`) =
**108** (a 108ª é `J-B-GOV-SEM-TETO.md`, do #394) e o head = **109** (com a deste bloco) — logo, hoje, **108 outras
atas**, todas no Escopo PROIBIDO. O texto da Emenda 1 fica intocado.

**Rastreabilidade pós-integração (K1).** Integração da `main` por merge: `7d02d8da` (pais `e27fbe14` e `3b1fe0f9`);
`$MB` = `git merge-base origin/main HEAD` = `3b1fe0f9` = `origin/main` (§14.6.1 satisfeito). A Emenda 4 acima ("o que
o ciclo 3 NÃO fecha") está **superada**: `P-GOV-MANDATO-3-B8B-CONTRADICAO` fecha pelo plano §13.1 (Dev-T-3 `9d3de5dd`
+ Dev-S-2 `c32f77b5`). KPI recontado: `backend_tests` **3389/3392** por N=2 execuções reais locais (RUN1 `3392/3389/0/3` (tests/pass/fail/skipped), 1750 s, `ec=1` · RUN2 `3392/3389/0/3` (tests/pass/fail/skipped), 1527 s, `ec=1`)
— CI no mesmo head `3392/3390/0/2` —; o `ec=1` local é o guard de skip (P8) do runner, pelo `[V18]` que pula em win32;
`blocks_completed` **168 → 169** (MB + 1); `merge_commit`/`approved_head` `null` na autoria. Pendências: abre
`P-GOV-MANDATO-3-FRONTEIRAS`; fecha `P-GOV-MANDATO-3-B8B-CONTRADICAO` e `P-KPI-NOTAS-CARREGADAS-REGRESSAO-392`;
atualiza `P-GOV-MANDATO-3-MUTANTES-PREFLIGHT` (rodada do zero em curso, TIMEOUT na l.161); anota
`P-GOV-MANDATO-2-FRONTEIRAS` item 2 (`--ignore-case`). **Fica para o K2:** as matrizes (E4-refs-2 e pré-voo completa)
e o fechamento de `…-MUTANTES-REFS` e `…-MUTANTES-PREFLIGHT`.

## Emenda 7 — K2b: o arquivo de equivalentes, o ambiente na identidade da matriz e os fechamentos (plano §14.18, §14.19)

> Escrita pelo **Dev-S-2** (`dev-s2-mandato-registro`) no K2b (2026-09-30), a partir do plano do ciclo 3 §14.18 e
> §14.19 — o plano é o contrato; esta emenda o registra no comando.

**Escopo PERMITIDO — acréscimo nominal (ERRATA E-10 v2 (b)):**

| arquivo | ação | quem / commit | fonte no plano |
|---|---|---|---|
| `docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-equivalentes.txt` | NOVO — os 3 mutantes equivalentes do pré-voo (245, 318, 336), no formato que a ferramenta lê (`id: justificativa (fixture que tentou discriminar)`) | Dev-S-2 / K2a `371961ac` (blob `9c691363`) | §14.18(1); desvio de ordem do orquestrador: entrou antes da delta B, que o lê com `--equivalentes` |

**Identidade da matriz — 4º elemento (plano §14.19(1); emenda a "identidade por tripla" da Emenda 6):** para toda
rodada cujo guard alcança a l.522 do pré-voo, o **ambiente** entra na identidade — Git Bash, `MSYS_NO_PATHCONV` **não**
exportado, versões de git e node, `uname -srm` —, gravado no cabeçalho do log da rodada. ERRATA E-11: nunca exportar
a variável no shell que roda artefato, guard ou ferramenta; `ref:caminho` que precise dela leva prefixo por comando.

**Rastreabilidade do K2b.** Matriz do refs publicada = E4-refs-3 (`N=46 K=46 NAO-COBERTOS=0`) → `P-GOV-MANDATO-3-MUTANTES-REFS`
**fecha**. Matriz do pré-voo publicada = composta A + delta B, unida pelo lema do §14.18(3) com a premissa (g) do
§14.19; resumo recomposto derivado por script: `N=103 K=100 NAO-COBERTOS=3 (equivalentes declarados e conferidos por id: 3) EXCLUIDOS=57 ANOMALIAS=2` → **[M-1] = 0** → `P-GOV-MANDATO-3-MUTANTES-PREFLIGHT` **fecha**.
`P-GOV-MANDATO-3-FRONTEIRAS` ganha a **26** (M7 e `next` em fim de linha) e a **27** (o ambiente na medição).
**A fronteira 28 (plano §14.20(1); registrada no K2b como fato sem número, numerada no K2c):** o arquivo `--equivalentes` é contado por linhas com fixture (l.311) e subtraído dos NÃO-COBERTOS (l.324) sem conferência de id: uma linha com id inexistente, ou de ponto já coberto, abate um não-coberto real e o `ec=0` sai falso. `ajuste`, `dentro-do-bloco`, dono `B-GOV-MANDATO-2`; conserto: `EQN = |ids do arquivo ∩ NÃO-COBERTOS da rodada|`; id declarado que **não** está entre os não-cobertos → linha `ANOMALIA-EQUIV <id>` (declaração morta ou ponto já coberto) e **não abate**; o resumo imprime os dois conjuntos e `EQUIVALENTES-CONFERIDOS`; teste de encerramento: o `t-inventado` do K2b: `--only 245` com `999: … (f)` → `NAO-COBERTOS=1 EQUIVALENTES-CONFERIDOS=0`, **`ec=1`** (hoje `ec=0`), e o controle sem parênteses inalterado. Na matriz publicada o efeito é nulo: os ids do arquivo (245, 318, 336) são exatamente os NÃO-COBERTOS da rodada B, provado por script (§4.5) — e o [M-1] = 0 publicado é DERIVADO da matriz e dessa prova de conjuntos, nunca do `ec` da ferramenta (ERRATA E-12).

---

# EMENDA — CICLO 4 (2026-10-01), depois da 3ª reprovação (junta 3, 2 × 1) e da auditoria da máquina

> Escrita pelo **Dev-S4** (`dev-scripts-ciclo4-b-gov-mandato`) no D4 do ciclo 4, a partir do plano
> `docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-plano.md` §15 (§15.2, §15.3, §15.6, §15.7, §15.8) e das erratas §15.14 e
> §15.15 — o plano é o contrato; esta emenda o registra no comando. Ela traz, de propósito, os três elementos que a
> C3‴ cobrou da emenda do ciclo 3 e não estavam lá (**C3c-01**): a **bateria**, os **códigos de saída** e a
> **autorização nominal de `decisoes.md`**; e a rastreabilidade de KPI com o último K, marcando a superada (**C3c-N5**).

## O que o ciclo 3 entregou, e por que foi reprovado de novo

O ciclo 3 deu ao pré-voo um oráculo único, agregação por estrutura e o token reservado, e criou a ferramenta de
mutação. A junta 3 reprovou (2 × 1) com **seis bloqueantes** — quatro do pré-voo (C1c-01 isenção da colagem maior
que a igualdade verificada; C1c-02 `:` escondendo SHA e revisão "resolvida" sem existir; C1c-03 `medido por:` dentro
de cerca satisfazendo a unidade; C1c-04 cabeçalho de seção reconhecido por prefixo) e dois da ferramenta (C2c-01
mutante que **não compila** contado como coberto — 33 no pré-voo, 2 no refs; C2c-02 equivalente `336`
discriminável). A auditoria do ciclo 3 (`omega/reprovacoes/R-B-GOV-MANDATO-ciclo3-auditoria.md`) achou a classe que
três juntas não viram — **A15, falha interna lida como veredito**: com o awk da passada 2 morto, o pré-voo dizia
`PRE-VOO OK` para qualquer documento.

## Emenda 1 — o que o ciclo 4 mudou nos artefatos

| commit | quem | o que |
|---|---|---|
| T4c `5b6f4f4a` · T4c-2 `738f0736` · T4c-3 `dd0d409d` | Dev-T4 (`dev-tests-ciclo4-b-gov-mandato`), só `tests/**` | 45 entradas novas de TAP nos dois guards (pré-voo 312 → 352; refs 39 → 44), as 9 linhas existentes trocadas declaradas (§15.3, §15.14) |
| S4a `2ca15eb0` | Dev-S4, só `scripts/mandato-preflight.sh` | A15 (`corre`/`veredito`/`morreu`: todo subprocesso com o status lido, morte = 1 REJ que nomeia o componente, `exit 1`; refs fora do contrato 0..3 = morte nomeada, §15.15(b)); C1c-01 (só o carimbo de `# gerado em:` é normalizado; isenção = corpo do bloco); C1c-02 (split no 1º `:`; revisão conferida por `rev-parse --verify --quiet "<rev>^{commit}"` numa função só, nos dois ramos — errata §15.14); C1c-03 (cerca é saída); C1c-04 (cabeçalho exato); C1c-05; C1c-06; fronteira 27 fechada |
| S4b `7a156a62` | Dev-S4, `scripts/mandato-mutantes.sh` + cabeçalho de `scripts/mandato-refs.sh` | ferramenta: portões 1-4 com `MUTANTE-INVALIDO`/`TIMEOUT`, causa por ponto, histograma `ATENCAO modal`, controles fail-closed (`ec=2`), diferencial antes da base com insumo que percorre RAIZ, `--timeout` por mutante com morte da vaga pela marca, M7(next) em qualquer posição, equivalentes por id (`ANOMALIA-EQUIV`); refs: **só comentários** (o diff fora de comentário é vazio) |
| D4 · K4 (os dois commits seguintes ao S4b, nesta ordem) | Dev-S4, só docs/registro/KPI | esta emenda, `…-ciclo4-mutantes.md` (esqueleto: identidade, procedimento, drills, custo), `…-ciclo4-equivalentes.txt`, pendências e índice, trilha; KPI |

## Emenda 2 — escopo nominal do ciclo 4 (plano §15.6)

| papel | PERMITIDO (nominal) |
|---|---|
| Dev-T4 | `tests/mandato-preflight.test.ts`, `tests/mandato-refs.test.ts` — adições e as modificações declaradas; só `tests/**` |
| Dev-S4 | `scripts/mandato-preflight.sh`, `scripts/mandato-mutantes.sh`, `scripts/mandato-refs.sh` (só cabeçalho); `docs/revisoes/SAN3/B-GOV-MANDATO-ciclo4-mutantes.md` (NOVO), `docs/revisoes/SAN3/B-GOV-MANDATO-ciclo4-equivalentes.txt` (NOVO); este comando (esta emenda e a correção `§7.3`→`§5.3` da l.255, C3c-03); `agent-orchestration/controle/pendencias.md` (§15.7, inclusive as 3 linhas `§7.3` do próprio bloco) + `pendencias-indice.md` **só pelo gerador**; `agent-orchestration/docs/status-geral.md`, `agent-orchestration/codex/log-execucao.md`; `Kpis/kpis-latest.json`, `Kpis/kpis-history.json`, `Kpis/kpis-history.md` (por script do Dev-S4, round-trip conferido) e `Kpis/app.js` **só por `node scripts/kpi-freeze.mjs`** |
| orquestrador / fábrica / junta | os mandatos `votos/B-GOV-MANDATO-ciclo4/00-mandatos/*.md`, a conferência, o inspetor, as evidências das cadeiras; briefing e ata (seção do ciclo 4); os 4 corpos novos nos dois espelhos; a §9 do parecer da auditoria; o plano (só a §15); o corpo do PR |

**PROIBIDO (a todos):** `src/**` · `prisma/**` · `migrations/**` · `frontend/**` · `mobile/**` · `.github/**` · `infra/**`
· `.env` · lockfiles · `pubspec.*` · `CLAUDE.md` · `AGENTS.md` · arquivos-base da raiz · `.gitattributes` · qualquer
outro `scripts/*` ou `tests/*` · as outras atas `J-*.md` · os corpos das 9 cadeiras dos ciclos 1–3 · `PLANO_SAN3.md` ·
**`tests/**` para o Dev-S4 e `scripts/**` para o Dev-T4**.

## Emenda 3 — bateria do ciclo 4 (plano §15.8, por papel)

```bash
# worktree PROPRIO em caminho curto, npm ci proprio, SEM junction; MSYS_NO_PATHCONV NUNCA exportada;
# base viva (5432/6379) NUNCA alvo; TAP em arquivo; ec por variavel; `timeout` em tudo que executa artefato mutado
# --- Dev-T4, antes de commitar: vermelho-controle historico (guard novo x artefatos do head, arnes pristino)
timeout 2700 node --test --import tsx --test-reporter=tap "$TW/tests/mandato-preflight.test.ts" > vc-pre.tap 2>&1   # not ok == os 24 que atacam o head (§15.15(c2))
timeout 900  node --test --import tsx --test-reporter=tap "$TW/tests/mandato-refs.test.ts"      > vc-refs.tap 2>&1  # 0 not ok: o refs nao muda no ciclo 4 (§15.15(c1))
# --- bateria completa (Dev-S4 no fim)
DATABASE_URL=<descartavel> npx prisma generate ; npm run check ; npm run lint ; npm test (2x, TAP em arquivo) ; npm run build ; npm --prefix frontend run check ; npm --prefix frontend run build
timeout 900  node --test --import tsx --test-reporter=tap tests/mandato-refs.test.ts      > refs.tap   # 44, 0 fail, 0 skip
timeout 2700 node --test --import tsx --test-reporter=tap tests/mandato-preflight.test.ts > pre.tap    # 352, 0 fail
bash -n scripts/mandato-preflight.sh && bash -n scripts/mandato-mutantes.sh
# drills da FERRAMENTA, cada um com o vermelho-controle historico (a mesma invocacao sobre 37549262) ao lado:
timeout 1800 bash scripts/mandato-mutantes.sh preflight --only 298,305 --jobs 2                          # t-invalido: 2x MUTANTE-INVALIDO, K=0
timeout 1800 bash scripts/mandato-mutantes.sh preflight --only 245 --equivalentes <arq-com-999> --jobs 1 # t-inventado: ANOMALIA-EQUIV 999, ec=1
timeout 1800 bash scripts/<copia-rc-texto>.sh refs --controle --only 1                                  # t-controle: FALHA DO CONTROLE -> ec=2
timeout 1800 bash scripts/mandato-mutantes.sh preflight --only 161 --timeout 120 --jobs 1               # t-timeout: 161 | TIMEOUT, rodada segue
timeout 1800 bash scripts/mandato-mutantes.sh preflight --only 340 --jobs 1                             # t-next: mutante gerado, VERMELHO
timeout 1800 bash scripts/mandato-mutantes.sh preflight --controle --only 1                             # t-diferencial: IDENTICO; copia sem docs/revisoes/SAN3 -> DIVERGE
# A15 por componente, com shims PROPRIOS no PATH (forma POSIX) sobre o pre-voo novo e sobre faa408c8 (vermelho-controle)
node scripts/kpi-freeze.mjs --check ; node --test --import tsx tests/kpi-dashboard-charts.test.ts ; node scripts/sync-agent-agents.mjs --check ; node --check Kpis/app.js
python agent-orchestration/controle/gerar-indice-pendencias.py && git diff --stat -- agent-orchestration/controle/pendencias-indice.md
bash scripts/mandato-refs.sh 393 ; echo ec=$?                                 # VIVO, colado em CERCA no relatorio
bash scripts/mandato-preflight.sh <relatorio-do-dev>.md 393 ; echo ec=$?     # DOGFOODING: Dev-S4 com o pre-voo NOVO
git diff --cached --check || exit 1
```

Os números de linha dos drills (`298`, `305`, `245`, `161`, `340`) são do pré-voo do ciclo 3 (`faa408c8`): os drills
rodam num arnês com os artefatos do ciclo 3 e a ferramenta nova, para que a mesma invocação sobre a ferramenta do
head seja o vermelho-controle. Regras 1–9 do §8 do plano valem integralmente.

## Emenda 4 — códigos de saída (contrato novo do ciclo 4)

- **`scripts/mandato-preflight.sh`:** `0` = `PRE-VOO OK`; `1` = rejeitou — **inclusive** quando um componente interno
  morreu (`REJEITADO  componente interno morreu: <componente> (ec=<n>) — <1ª linha do stderr dele>`, seguido de
  `PRE-VOO REJEITOU — um componente interno morreu e NADA foi julgado`; nada é julgado depois da morte) e quando o
  `mandato-refs.sh` sai com código fora do contrato `0..3` (126/127/128+n ⇒ morte nomeada `refs`, nunca `NAO bate`);
  uso errado continua `1` com a linha `uso:` no stderr.
- **`scripts/mandato-mutantes.sh`:** `0` = nenhum NÃO-COBERTO além dos equivalentes **conferidos por id**; `1` = há
  NÃO-COBERTO; `2` = PARADO (arnês inválido, linha de base suja, **FALHA DO CONTROLE**, insumo fixo que o pristino não
  executa limpo, cópia pristina alterada, opção errada). `MUTANTE-INVALIDO`, `TIMEOUT` e `ANOMALIA-EQUIV` são
  publicados e **não** mudam o `ec`. A última linha impressa é `== ec=<n>`.
- **`scripts/mandato-refs.sh`:** inalterado (`0` LIDO/AUSENTE · `1` PARADO · `2` USO · `3` NÃO DETERMINÁVEL) — e agora
  contrato também do lado do pré-voo (Emenda 4 acima e o cabeçalho do refs).

## Emenda 5 — `agent-orchestration/controle/decisoes.md`

O Dev-S4 **não** escreve em `decisoes.md`. A autorização nominal do plano (§4, C3b-01: *"`decisoes.md` — autorizado
nominalmente: já contém `D-NOITE-SEM-TETO` neste ramo; se houver linha nova neste ciclo, a emenda do comando a
declara"*) é repetida aqui, como a C3c-01 cobrou. **Linha nova no ramo desde a integração do #396:** uma —
`a3e52e37` (orquestrador, 2026-09-30, ressalva R2 do porteiro do #396): os totais do manifesto da demo passam a ser os
do gerador (`275 → 281` arquivos; `119 → 125` em espera), com a nota da troca — medido por `git log --oneline
5b6e1036..HEAD -- agent-orchestration/controle/decisoes.md`. Contra o `$MB` do ciclo 4 (`5bcdcc58`), `git diff --stat 5bcdcc58 HEAD --
agent-orchestration/controle/decisoes.md` = **53 inserções, 2 remoções** = o `D-NOITE-SEM-TETO` do ciclo 3 (49 inserções,
já declarado no §4 do plano) + o `a3e52e37` (4 inserções, 2 remoções); as linhas que a integração do #397/#398 trouxe
(`D-PAUSA-GRAVA-E-PARA`) são da `main` e não entram nesse diff.

## Emenda 6 — rastreabilidade do ciclo 4 (KPI e pendências)

- **Bloco:** `B-GOV-MANDATO` ciclo 4 · **PR:** #393 · **status:** `published_per_pr` · **`merge_commit` /
  `approved_head`:** `null` na autoria (§C3.5), backfill pós-merge.
- **KPI, todos os K do bloco (C3c-N5):** ciclo 2 `3103/3105` → **Emenda 5 do ciclo 3 (`3382/3385`, CI): SUPERADA** →
  K1 `3389/3392` (N=2, `ec=1` pelo guard de skip P8) → K1b `3403/3405` (N=2, `ec=0`) → **ciclo 4: o K4** (N=2,
  números no commit K4 e em `Kpis/kpis-latest.json`). `blocks_completed` **169 → 170**: a `origin/main` integrada no ramo
  (`5bcdcc58`, #398, depois do #397 que publicou 169) + 1.
- **Pendências (§15.7):** abre `P-GOV-MANDATO-4-GUARD-DA-FERRAMENTA` e as fronteiras **29/30/31** em
  `P-GOV-MANDATO-3-FRONTEIRAS`; fecha nela as **25, 26, 27, 28** (com o teste de encerramento executado) e paga o
  item "cabeçalho congelado"; **reabre** `P-GOV-MANDATO-3-MUTANTES-PREFLIGHT` e `P-GOV-MANDATO-3-MUTANTES-REFS` (o
  `[M-1] = 0` do ciclo 3 contava mutante que não compila) — fecham de novo no **K4b**, com a matriz do ciclo 4.
- **Integração da `main` no ramo (orquestrador, por merge, antes do E3):** `26730e2b` (#397) e `b7f27fe1` (#398); o
  `$MB` do ciclo 4 é `5bcdcc58` = `git merge-base origin/main HEAD`.
- **Achados da C3‴ fechados por este registro:** **C3c-01** (esta emenda traz bateria, códigos e `decisoes.md`);
  **C3c-N5** (a linha de KPI acima); **C3c-03** (`§7.3` → `§5.3` na l.255 deste comando e nas 3 pendências do bloco —
  os dois blocos estão no `PLANO_SAN3.md` §5.3, l.268-269); **C3c-02** já estava pago (`log-execucao.md`,
  "Limpeza §C5 do ciclo 3") — anotado.
- **Fica para o K4b (mesma identidade, depois da E4 do orquestrador):** as duas matrizes verbatim no
  `…-ciclo4-mutantes.md`, o `[M-1]` derivado por conjuntos e por fixture, o fechamento das duas pendências de
  mutação e a citação N/K/INVALIDOS/TIMEOUT no history.

## Emenda 7 — K4b (2026-10-02): as matrizes do ciclo 4 publicadas

> Escrita pelo **Dev-S4** (`dev-scripts-ciclo4-b-gov-mandato`) no K4b, depois da E4 do orquestrador (plano §15.4, §15.7,
> §15.10 passo 5).

- **E4 do ciclo 4** (orquestrador, worktree `w-e4f` no K4 `bb641b77`, variável não exportada, 6 h 30 min de relógio):
  refs `N=44 K=44 NAO-COBERTOS=0 EXCLUIDOS=52 ANOMALIAS=1 INVALIDOS=2 TIMEOUT=0` → `[M-1] = 0`; pré-voo `N=84 K=80 NAO-COBERTOS=4 EXCLUIDOS=60 ANOMALIAS=0 INVALIDOS=37 TIMEOUT=1 EQUIVALENTES-DECLARADOS=1 EQUIVALENTES-CONFERIDOS=1` → `[M-1]` por conjuntos = **{359, 372, 612}**. Saídas verbatim, cabeçalho do log (identidade + ambiente), resumo derivado e custo re-multiplicado em
  `docs/revisoes/SAN3/B-GOV-MANDATO-ciclo4-mutantes.md` §0, §3, §4, §4.1 e §6.1.
- **O 441** é equivalente conferido por id (fronteira 28) e por fixture (três fixtures, uma nova que alcança `idx > n`).
  **359, 372 e 612** são NÃO-COBERTOS reais, cada um discriminado por fixture — `[M-1]` **EM ABERTO até a delta** da R1
  (§15.10): casos novos do Dev-T4 (`T4c-4`, só adições) e a rodada `--only 359,372,612` do orquestrador.
- **Pendências:** `P-GOV-MANDATO-3-MUTANTES-REFS` **fecha de novo** com a matriz do ciclo 4; `P-GOV-MANDATO-3-MUTANTES-PREFLIGHT`
  **continua ABERTA** até a delta, com o teste de encerramento nela; `P-GOV-MANDATO-3-FRONTEIRAS` ganha a **32** (a coluna de
  causa da ferramenta é cortada por bytes — UTF-8 inválido em 2 linhas da matriz, publicadas verbatim; cosmético).
- **KPI:** nenhum número muda; a entrada do ciclo 4 no history ganha a citação N/K/INVALIDOS/TIMEOUT e o `[M-1]` (§15.7).
