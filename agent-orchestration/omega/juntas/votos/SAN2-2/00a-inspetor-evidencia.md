# Evidência incremental — inspetor-de-terreno-da-junta (instância NOVA, SAN2-2)

> P1 do mandato resiliente: um append por item concluído. Cada item: COMANDO → SAÍDA → CONCLUSÃO.
> Worktree: `.claude/worktrees/san2-r` · branch `fix/san2-2-guard-espelho-ci` · head esperado `c8dc716`.

## Item 1 — Árvore sem mutação viva, head correto, worktrees

- `git rev-parse --short HEAD` → `c8dc716` ✔ (bate com o briefing/plano)
- `git branch --show-current` → `fix/san2-2-guard-espelho-ci` ✔
- `git status --porcelain` (worktree san2-r) → **vazio** ✔
- `git worktree list` → 5 árvores: main d1fab3b [demo/investidor] · agent-af6ea… 12c3825
  [feat/o6r-b02-financial-uow] · gov-descuido 497d360 · san2-1 55aa8a3 · **san2-r c8dc716** ✔
- Árvore principal: `git status --porcelain` acusa `M` em `planejador-mestre.md`,
  `porteiro-pos-merge.md`, `scripts/sync-agent-agents.mjs` — **mas `git diff` e `git diff --stat`
  saem VAZIOS** e `git ls-files --eol` mostra `i/lf w/crlf` nos 3. É o artefato §6.3 do briefing
  (git status fabricando divergência sob autocrlf), medido aqui ao vivo. Diff eol-neutro do
  conteúdo × blob commitado da demo/investidor: **vazio**. **Sem mutação viva de conteúdo.**
- Nota de terreno (não é mérito): o script no head c8dc716 tem a normalização eol (F1) e
  **listing raso**; o da demo/investidor tem listing recursivo e sem normalização — gerações
  distintas. Registro para a C1; para o terreno vale o S0 do item 3 + varredura recursiva própria.

**Veredito parcial: VERDE.**

## Item 2 — §8.4.1: validade do instrumento (inspetor verbatim head × demo)

- `git rev-parse c8dc716:.claude/agents/inspetor-de-terreno-da-junta.md` →
  **`8262abfb5ae85049033d5824ce191432f36d8b55`**
- `git rev-parse demo/investidor:.claude/agents/inspetor-de-terreno-da-junta.md` →
  **`8262abfb5ae85049033d5824ce191432f36d8b55`** — **MESMO blob** (byte-idêntico por definição).
- `diff` blob-a-blob via dump em scratchpad (a primeira tentativa em process substitution foi
  mutilada pelo MSYS — registrado para ninguém repetir a forma): **`ec_diff=0`**, 115 × 115 linhas.
- Working file no worktree × blob do head, eol-neutro: `ec=0`.
- `git rev-parse origin/main:<caminho>` → **fatal: não existe na main** — confirma o §2.3 do plano
  (o instrumento nasce neste PR).

**Hash consignado para a ata: `8262abfb5ae85049033d5824ce191432f36d8b55`.**
**Veredito parcial: VERDE — a pré-condição de validade desta inspeção está satisfeita.**

## Item 3 — §8.4.2: fatia S0 executada com o script do head, checkout fresco, autocrlf=true

- 1ª tentativa de `git worktree add` no scratchpad **falhou com "Filename too long"** (2 arquivos de
  `votos/B-O6R-02-ciclo4/` estouram o MAX_PATH no caminho longo do scratchpad); registro limpo com
  `git worktree prune` + `rm -rf`. Refeito com `git -c core.longpaths=true worktree add --detach` —
  muda capacidade de checkout, não semântica de eol.
- Arranjo comprovado o MESMO que mentia: `core.autocrlf=true`, `git ls-files --eol` → `i/lf w/crlf`
  (CRLF materializado no checkout fresco), `git status --porcelain` vazio.
- **`node scripts/sync-agent-agents.mjs --check` → `S0_check_ec=0`** (exit por variável), saída:
  `[agents-sync] OK — 23 agentes, espelho consistente.`
- Contraprova recursiva INDEPENDENTE do script (mando do meu papel §4.1): `git ls-tree -r c8dc716`
  → 23 `.md` em `.claude/agents/` × 24 em `.agents/agents/` (23 + `README.md`, KEEP). **Sem
  `especialistas/` neste head** — o listing raso do script do head cobre tudo que existe (a versão
  recursiva vive na demo/investidor; nota para a C1, não é item de terreno). Comparação blob-a-blob
  dos 23 pares: todos diferem **exatamente** pelo transform declarado (linha `tools:` removida +
  preâmbulo Codex; corpo verbatim; `model:` preservado) — verificado por diff do par do inspetor e
  leitura do `transform()` no blob do head. Diferença = a declarada, drift = nenhum.
- Worktree de medição derrubado por `git worktree remove --force` (lista voltou a 5).

**Veredito parcial: VERDE. (Anti-circularidade: este verde NÃO é prova de mérito do item 1 — vide parecer.)**

## Item 4 — §8.3: inelegibilidade conferida por nome (7 regras × 4 cadeiras)

- `grep -rl` de cada nome de cadeira em `agent-orchestration/`, `docs/`, `.claude/agents/`,
  `.agents/agents/`:
  - `provador-de-mutacao-do-espelho` → só BRIEFING-SAN2-2.md + SAN2-2-plano.md
  - `curador-da-lista-suites-ci` → idem + 1 menção em `dev-fase2-log.md` l.356, conferida com
    contexto: é REFERÊNCIA ("a cadeira C2 re-executa por conta própria"), não atuação
  - `zelador-do-contrato-canonico` → só briefing + plano
  - `auditor-do-kpi-honesto` → só briefing + plano
- Nenhum dos 4 nomes aparece em `J-*`, `R-*`, votos de B-O6R-02/REG/ARNES/SAN2-R/SAN2-1R → **pool
  queimado não colide**; identidades nascem novas, como o §8.2 promete.
- Nenhum arquivo novo em `.claude/agents/` para cadeiras nem para `dev-san2-2` (`ls | grep san2` →
  vazio) — o §5 do plano só permite o inspetor, cumprido.
- As 7 inelegibilidades nominais do §8.3 (inspetor-REG, orquestrador, planejador-mestre, assinantes
  A5/arnês#6, condutor+porteiro do #362, dev-san2-2, pool queimado): nenhuma pode colidir porque as
  4 cadeiras **ainda não foram instanciadas** e os nomes propostos não existem em ata anterior.
  Condição verificada no que é verificável ANTES da instanciação; a ata da junta deve registrar as
  identidades efetivamente instanciadas.

**Veredito parcial: VERDE.**

## Item 5 — Containers e resíduos (§C7.1-bis 1.3)

- `docker ps -a` → **exatamente 4** containers: `san2-2-pg` Up 4h `0.0.0.0:56432->5432` ·
  `san2-2-redis` Up 4h `56379->6379` · `erp-postgres` Up 41h **(healthy)** `5432` · `erp-redis`
  Up 41h **(healthy)** `6379`.
- O par `san2-2-*` é a infra DECLARADA do bloco (F2; portas fora da faixa reservada, pendência
  §7.3) — não é resíduo de jurado anterior. Nota: o briefing §3-C2 já proíbe as cadeiras de
  usá-lo ("descartáveis próprios, não os do dev, não erp-*"); manter essa linha em destaque.
- Base viva `erp-postgres`/`erp-redis`: de pé, healthy, nas portas padrão — **nenhum jurado a
  toca** (declarado no briefing §5.4) e eu também não a toquei.
- Sem containers `jur-*`/`crit-*` órfãos. Árvore sem `jur-probe*`/`*-probe.ts` untracked
  (status --porcelain vazio fora do meu arquivo de evidência).

**Veredito parcial: VERDE.**

## Item 6 — Baseline honesto: 2607/2609 · fail 0 · skipped 2

- Os **3 TAPs existem em disco** no scratchpad da sessão (~1,25 MB cada, timestamps 14:03/14:31/14:44):
  `san2-2-f5/npm-test.r1.tap` (dev) · `verif-npm-test.tap` (verificador KPI) · `adv-npm-test.tap`
  (adversarial). Cada um com o cabeçalho de env GRAVADO DENTRO
  (`DATABASE_URL=…localhost:56432/erp_techsolutions`, `CORE_SAAS_PERSISTENCE=[<ausente>]`) e sumário
  idêntico: `# tests 2609 · # pass 2607 · # fail 0 · # skipped 2 · EXIT=0`.
- Os 2 pulos conferidos **pelo nome**: `ok 1646`/`ok 1647` de `permission-catalog-db-parity`, gated
  por `RBAC_DB_PARITY != "1"` — o `SKIP_BUDGET_DB=2` do runner. Nenhum pulo inesperado.
- `Kpis/kpis-latest.json` publica `backend_tests` **value 2607 / total 2609 / display "2607/2609"**,
  com N=3, forma canônica 3 e a ressalva pré-existente do modo sem DATABASE_URL na nota.
- Alvo dos runs: porta **56432** (par descartável) — a base viva não aparece em nenhum cabeçalho.
- Nota de forma: TAPs vivem no scratchpad da sessão (efêmero por natureza); para a ata, os sumários
  e cabeçalhos estão transcritos aqui e no diário da Fase 5.

**Veredito parcial: VERDE.**

## Item 7 — Plano de isolamento + plano de perda de jurado declarados no briefing (por linha)

- Worktree próprio para quem muta (C1) + **junction/symlink de node_modules PROIBIDA** + `npm ci`
  próprio + remoção só por `git worktree remove --force`: BRIEFING l.298–300. ✔
- Banco descartável para C2, "não os do dev, não erp-postgres/erp-redis": l.179 e l.301. ✔
- **Plano de perda de jurado** (P5/P6, `agente-fabrica` cria substituto NOVO, herda roteiro e nunca
  conclusão, voto não se herda): l.255–258 + mandato P1–P6 colado no §8. ✔
- Afirmações da entrega tratadas como "a re-verificar" (4 ocorrências; §1 e §3 do briefing);
  nenhuma conclusão de ata anterior herdada como fato. ✔
- Mandato resiliente P1–P6 verbatim no §8 do briefing para colar em cada cadeira. ✔

**Veredito parcial: VERDE.**

## Item 8 — CI do PR #363 e amarração do head + `npm run check`

- `gh pr checks 363` → **7/7 pass**: authority-portal · backend (5m32s) · backend-postgres (2m10s) ·
  docker · flutter · frontend · owner-portal. `gh_ec=0`.
- `gh pr view 363 --json headRefOid` → **`c8dc716e9b4ffa014783289fdab484da07858d67`** ==
  `git rev-parse c8dc716` local, byte a byte. O CI verde é DO head que a junta julga. Base `main`,
  estado OPEN.
- `npm run check` no head, árvore limpa, exit por variável → **`npm_run_check_ec=0`**
  (`tsc --noEmit`, saída em scratchpad/insp-npm-check.log).

**Veredito parcial: VERDE.**

---
**Todos os 8 itens VERDES. Parecer em `00a-inspetor-parecer.md`.**
