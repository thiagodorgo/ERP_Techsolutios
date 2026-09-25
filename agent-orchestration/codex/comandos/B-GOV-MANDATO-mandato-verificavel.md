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
