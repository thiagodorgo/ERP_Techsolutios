# B-SAN3-00 — o registro para de perder o que a junta precisa ler

- **Tipo:** feature (registro/governança — atualiza KPI no próprio PR, §C3)
- **Fase:** Execution / Validation (A5)
- **Trilha:** doc/KPI — **não toca código nem teste** (nenhum arquivo de `src/`, `tests/`, `frontend/`, `mobile/`, `prisma/`, `scripts/`, `.github/`)
- **Data:** 2026-09-21
- **Branch:** `chore/corpos-de-jurado-rastreados` · base `origin/main@aadaa6d5` (squash do #390)
- **Autor:** Claude Code (rodada SAN3) — dev em Opus 5 (1M), `claude-opus-5[1m]`

## Objetivo

Fechar o buraco de **durabilidade do registro** que o porteiro pós-merge do #387 nomeou (achado **A1**: um corpo
de jurado reprovou o ciclo 2 do `B-SAN3-01` **sem estar em commit nenhum**) e pagar as **5 dívidas** que o
porteiro pós-merge do #390 deixou para o primeiro PR a mergear depois dele.

**O que o bloco NÃO faz:** não versiona corpo de agente nenhum (ver a **Emenda 1**, abaixo — a premissa original
caiu na medição), não apaga nada do diretório vivo da árvore de `demo/investidor` (resíduo alheio se **reporta**),
e não toca uma linha de produto.

## Contexto / fontes de verdade

- Ler antes: `agent-orchestration/docs/status-geral.md`, `agent-orchestration/controle/`,
  `agent-orchestration/codex/log-execucao.md`.
- Insumo direto: `agent-orchestration/omega/juntas/votos/B-SAN3-04a/00c-porteiro-pos-merge-390.md` (o parecer
  que lista as 5 dívidas) e o achado **A1** do parecer do porteiro do #387.
- Governança aplicável: `CLAUDE.md` §A2 (conflito não se resolve em silêncio), §C3 (KPI por PR), §C4 (escopo),
  §C5 (limpeza), §C6 (rastreabilidade), §C7.4-bis (o dev implementa e **reporta** divergência, não decide).
- Decisões que o bloco executa ou respeita: `D-APOSENTADORIA-ELENCO-EFEMERO`,
  `D-SAN3-01-MERGE-COM-BLOCO-DE-GUARDA` (que cria o `B-SAN3-01b`), `D-KPI-PER-PR`, `D-KPI-INDEX-PAINEL`.
- Sem UX: o bloco não tem tela, logo `screen-refs/` e §11 não se aplicam.

---

## EMENDA 1 — **a premissa do item 1 foi FALSIFICADA pela medição, e o item está REVOGADO**

> Transcrita aqui porque um comando que escondesse isto seria exatamente a consolidação silenciosa que o §A2
> proíbe. O registro completo, com o método e os números, está em
> `agent-orchestration/controle/decisoes.md` → **`REGISTRO-SAN3-00-CORPOS-DE-JURADO`**.

**O que o mandato original mandava:** versionar **41 corpos de jurado "fora do tree"**.

**Por que caiu.** Três medições, todas re-executadas pela 2ª instância do dev antes de qualquer escrita
(`git rev-list --objects --all` sobre **toda** ref, não só sobre os 138 *ref tips* — **314 blobs** distintos sob
`.claude/agents/**` e `.agents/agents/**`; `git hash-object` de cada corpo do disco contra esse conjunto):

1. **Zero perdido.** Dos **129** corpos no disco da árvore principal, **80** estão em caminhos que a
   `origin/main` não rastreia (**41** cadeiras no espelho `.claude/`, **39** no `.agents/`) — e **80 de 80** têm
   blob alcançável em alguma ref. O "fora do **tree**" do mandato só é verdade com a palavra **`main`** no lugar
   de `tree`.
2. **33 dos 41 já foram sepultados e/ou aposentados** por três rodadas escritas (10 sepultados **e** aposentados,
   13 só sepultados, 10 só aposentados). Versioná-los **desfaria** essas decisões e devolveria ao `description`
   de **toda sessão** o peso que a `D-APOSENTADORIA-ELENCO-EFEMERO` mediu e removeu de propósito.
3. **Os 8 restantes são as cadeiras dos blocos EM VOO** (`jurado-o6r04a-c2-*` no #389/`738ff531`;
   `jurado-o6r11-*` no #388/`43557a17`) e são **byte-idênticos** ao blob da branch que a junta julga (14
   comparações por hash, 14 iguais). Versioná-los na `main` **duplicaria** o que esses PRs já trazem, com
   conflito no merge deles. Outras **duas** dos 41 são justamente as que a **dívida 2 manda REMOVER**.

**O que o bloco faz no lugar: conserta o MECANISMO.** O `~/.config/git/ignore` do usuário ignora `.claude/`
(l.2) e `.agents/` (l.27) **inteiros** — por isso corpo **novo** nunca aparece como `??`, e é essa a causa
reincidente do achado A1. O `.gitignore` **do repositório** (que tem precedência sobre o global) passa a
reincluir os dois diretórios de agentes e os dois de skill, excluindo o resto do conteúdo. Por isso
**`.gitignore` está autorizado NOMINALMENTE neste bloco**, embora não seja caminho de registro.

**O que fica em aberto, e para quem:** o destino dos **33** corpos aposentados/sepultados que seguem no
diretório vivo da árvore de `demo/investidor` vira a pendência nomeada
**`P-SAN3-00-RESIDUO-ELENCO-DEMO-INVESTIDOR`** (MÉDIA, não bloqueia). O dev **propõe e justifica**, e **não**
nomeia bloco dono — nenhum bloco do §5 do `PLANO_SAN3.md` tem aquela árvore na fronteira, e inventar um dono
repetiria o achado **A2** do porteiro do #387. **A junta nomeia.**

---

## Escopo PERMITIDO

- `.gitignore` — **autorizado nominalmente** (Emenda 1; é o conserto do mecanismo, não registro).
- `.claude/agents/especialistas/**` e `.agents/agents/especialistas/**` — **só para a REMOÇÃO** da rodada 4 de
  aposentadoria (dívida 2), por identificador de **BLOCO** (`jurado-san3-01c2-`), nos dois espelhos.
- `agent-orchestration/**` — este comando, `controle/` (decisões, pendências, índice, aposentadoria),
  `docs/status-geral.md`, `codex/log-execucao.md`, e o parecer do porteiro em `omega/juntas/votos/B-SAN3-04a/`.
- `docs/revisoes/SAN3/PLANO_SAN3.md` — **só o §5** (dívidas 3 e 4).
- `Kpis/**` — `kpis-latest.json`, `kpis-history.json`, `kpis-history.md`, `app.js` (pela `kpi-freeze`, nunca
  digitado).

## Escopo PROIBIDO

- `src/**` · `tests/**` · `frontend/**` · `mobile/**` · `prisma/**` · `migrations/**` · `scripts/**` ·
  `.github/**` · `infra/**` · `.env` · lockfiles JS · `pubspec.yaml`/`pubspec.lock` · Figma.
- `CLAUDE.md` · `AGENTS.md` · demais arquivos-base da raiz.
- **Corpo de agente em qualquer outra forma que não a remoção da dívida 2** — nada de `git add -f` de corpo
  (Emenda 1), e nada de apagar corpo do diretório vivo de **outra** árvore de trabalho.
- As árvores `b04a`, `b11`, `sanb1` e a **árvore principal**: leitura sim, escrita **nunca**.

## Passos de implementação

1. **Mecanismo (Emenda 1):** o `.gitignore` reinclui `.claude/agents/`, `.claude/skills/`, `.agents/agents/`,
   `.agents/skills/` e os `SKILL.md` dos dois diretórios de skill, reafirmando `.claude/worktrees/` **depois**
   das reinclusões (dentro do mesmo arquivo, o último padrão que casa vence). Provar por *exit code* de
   `git check-ignore -q`, nos dois sentidos, e provar que **0 arquivo rastreado hoje** passa a ser ignorado.
2. **Dois registros em BINÁRIO** (`J-CHK-P1-PR04-aplicabilidade.md`, 1 byte NUL; `B-GOV-ELENCO-ciclo2-plano.md`,
   1 CR solto): byte cru vira escape em texto. Prova: `git ls-files --eol` dos `.md` sem nenhuma linha `-text`.
3. **Dívida 2:** `git rm` das 2 cadeiras `jurado-san3-01c2-*` **nos dois espelhos**, conferindo **antes** que o
   diretório não ganhou arquivo de outra sessão; `sync-agent-agents --check` verde depois; rodada 4 marcada
   **EXECUTADA** em `controle/aposentadoria-especialistas.md`, com a medição do peso removido.
4. **Dívida 5:** versionar o parecer do porteiro do #390 em
   `agent-orchestration/omega/juntas/votos/B-SAN3-04a/00c-porteiro-pos-merge-390.md`.
5. **Dívida 3:** as duas pendências ganham **ampliação nominal DECLARADA no §5** do `PLANO_SAN3.md` (não mais
   promessa de "quem executar declara") — `auth.adapter.ts` (só o mapa `rolePermissions`) e
   `docs/navigation-matrix.md` no `B-SAN3-06a`; `prisma/seed.ts` **também** para os 5 papéis legados, aditivo,
   no `B-SAN3-07`. Dono real confirmado em cada uma.
6. **Dívida 4:** linha do **`B-SAN3-01b`** no §5, derivada de `D-SAN3-01-MERGE-COM-BLOCO-DE-GUARDA` e das 4
   pendências que lhe pertencem — fronteira, teste de encerramento (as 4 mutações da cadeira C4), quórum e
   dependência.
7. **Emenda 1 registrada** em `controle/decisoes.md` (§A2) e a pendência
   `P-SAN3-00-RESIDUO-ELENCO-DEMO-INVESTIDOR` aberta.
8. **Dívida 1 + KPI (§C3):** backfill do #390 e o snapshot deste PR (ver a seção abaixo).
9. **Trilha:** `status-geral.md` e `codex/log-execucao.md`; **índice de pendências pelo gerador**, nunca
   digitado.

## Bateria de validação (§9 — trilha doc/KPI, com as regressões de raiz e front)

```bash
npm run check
npm run lint
npm test
npm run build
npm --prefix frontend run check
node scripts/kpi-freeze.mjs --check
node --test --import tsx tests/kpi-dashboard-charts.test.ts
node --test --import tsx tests/kpi-dashboard-contraste.test.ts
node --test --import tsx tests/kpi-achados-paridade.test.ts
node scripts/sync-agent-agents.mjs --check
node --check Kpis/app.js
git diff --cached --check || exit 1
```

> A última linha fica **em linha própria** e com `|| exit 1`: encadeá-la com `&&` numa linha e deixar o commit
> na seguinte já deixou *whitespace* entrar duas vezes (`feedback-checagem-como-trava`).

## Estados obrigatórios (§7)

Não se aplicam — o bloco **não tem tela**: nenhum arquivo de `frontend/` ou `mobile/` no diff. Declarado, não
omitido.

## KPIs no próprio PR (§C3)

- **O PR não toca código nem teste** → as métricas de trilha **CARREGAM** o último valor oficial **com nota
  explícita** (§C3.3): `backend_tests`, `frontend_smoke_tests`, `flutter_tests`. Nada de contagem copiada
  passando por execução.
- `blocks_completed`: **165 → 166** (+1).
- `mvp_demo`/`mvp_vendavel`: **INTOCADOS** (§C3.4) — o bloco não move escopo de produto.
- `merge_commit`/`approved_head` deste PR: **`null` na autoria** (§C3.5); `pr` após o `gh pr create`.
- **Dívida 1 — backfill §C3.5 do #390:** a entrada **#160** do `kpis-history.json` (e o eco no
  `kpis-history.md`) recebe `merge_commit aadaa6d51be950e152ca6a6f15327bc9989039de` e
  `approved_head a62d04e2bbe42533e58639643a19104bdccc0ab6`.
- `Kpis/app.js` é regenerado por `node scripts/kpi-freeze.mjs` — **a cópia congelada nunca é digitada**
  (`D-KPI-INDEX-PAINEL`). O painel não ganha dimensão nova, logo não há visualização nova a entregar.

## Junta (§C7)

- **Quórum: maioria de 3** (§C7.1-ter(b)) — o bloco **não** toca dinheiro, segurança, permissão nem perda de
  dado: não há um byte de `src/`, `prisma/`, `frontend/` ou `mobile/` no diff, e a única remoção é de corpo de
  agente já sepultado. **Se a junta medir que a ampliação nominal do §5 (dívida 3) conta como "permissão"**, o
  quórum sobe para **unanimidade de 3** — é decisão da junta, e o dev a registra em vez de decidir.
- **Itens que a junta tem de julgar por medição própria, nunca por leitura deste comando:**
  - (a) a **Emenda 1** — os números da falsificação (80/80, 33, 8) e se a revogação do item 1 estava certa;
  - (b) o `.gitignore` nos **dois sentidos** (aparece o que deve; segue ignorado o que deve; 0 rastreado novo);
  - (c) as **5 dívidas** do porteiro do #390, uma a uma;
  - (d) o KPI: `blocks_completed` 165→166, as 3 trilhas **carregadas com nota**, o backfill do #390 e a cópia
    `var FROZEN` em dia;
  - (e) o §5 do `PLANO_SAN3.md`: a linha do `B-SAN3-01b` e as duas ampliações nominais **não excedem** o que as
    decisões e as pendências já escreviam.
- **Registro da junta:** `agent-orchestration/omega/juntas/J-B-SAN3-00.md` — junta sem registro = merge inválido.
- **Inspeção de terreno (§C7.1-bis):** `inspetor-de-terreno-da-junta` **antes** do voto; sem o `LIBERADO` dele a
  junta não começa.

## Definition of Done (§10)

- [ ] Escopo respeitado: nada de `src/`, `tests/`, `frontend/`, `mobile/`, `prisma/`, `scripts/`, `.github/`.
- [ ] Bateria acima **verde**, com `git diff --cached --check` em linha própria antes de cada commit.
- [ ] `node scripts/sync-agent-agents.mjs --check` verde **depois** da remoção da dívida 2.
- [ ] As 5 dívidas do porteiro do #390 pagas e **nomeadas** no corpo do PR.
- [ ] Emenda 1 registrada em `controle/decisoes.md`; pendência do resíduo aberta, com dono **a nomear pela junta**.
- [ ] KPI no próprio PR, com as trilhas carregadas **com nota** e o backfill do #390.
- [ ] Índice de pendências **regenerado pelo gerador**, nunca digitado.
- [ ] Artefatos temporários limpos (§C5) e, **após o merge**, `bash scripts/post-merge-cleanup.sh`.
- [ ] Estados §7 e fidelidade §11: **não se aplicam** (bloco sem tela) — declarado, não omitido.

## Rastreabilidade (§C6)

- **ID:** B-SAN3-00
- **PR #:** preenchido após `gh pr create`
- **Merge commit:** `null` na autoria → backfill pós-merge
- **Approved head:** `null` na autoria → backfill pós-merge
- **Base:** `origin/main@aadaa6d5` (#390, B-SAN3-04a)
- **Gate:** n/a (bloco de registro; não fecha item do §4.1 do `PLANO_SAN3.md`)
- **Junta:** `agent-orchestration/omega/juntas/J-B-SAN3-00.md`
- **Status:** `published_per_pr`
- **Contrato(s) versionado(s):** nenhum — o bloco não toca API.
