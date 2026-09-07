# Parecer do `inspetor-de-terreno-da-junta` — B-O6R-06 (`fix/billing-durability`) · passada 1 · 2026-09-07

**Modelo:** Fable (fixado, `D-INSPETOR-TERRENO-JUNTA`). **Não julgo mérito.** Tudo abaixo foi EXECUTADO no worktree
`.claude/worktrees/b06` (head `e35492ef`), `ec` por variável (nunca depois de pipe), logs no scratchpad da sessão,
fora da árvore. Escopo medido por `git diff --numstat -- <path>` — nunca `git rev-parse <rev>:<path>` (falha em silêncio).

## VEREDITO: **BLOQUEADO** — em UM item (1.2: briefing inexistente)

Os outros 12 itens estão medidos e verdes ou com ressalva nomeada. A passada 2 re-mede **1.2 · 2.1 · 5.1** + `git status`
+ `--check` no head novo (o commit do briefing e deste parecer move o head; são commits de registro).

---

## 1 · Isolamento

### 1.1 · Head, árvore, head de CÓDIGO — **VERDE**

```
git worktree list -> main d1fab3bc [demo/investidor] · b06 e35492ef [fix/billing-durability] · gov-descuido 497d360d
git rev-parse --short HEAD -> e35492ef ; git merge-base origin/main HEAD -> fe2748c8 (= origin/main)
git status --porcelain (b06) -> VAZIO ; git diff --stat -> VAZIO ; git diff --cached --stat -> VAZIO
git log --oneline fe2748c8..e35492ef -> 14 commits, na ordem declarada:
  dd16beb1 porteiro #380 · 9f582a34 plano · be608a52 PDs+crítico r1 · 26182d6b EMENDA E1 · dc47e668 crítico r2 ·
  e2d4e119 c2cdfa72 1f7e47e7 b5f2f0e9 706dbf77 a618bc83 c5535470 0f0a872a (dev, 8) · e35492ef cadeiras
git diff --stat 0f0a872a e35492ef -> 12 arquivos, +5066/-0, TODOS jurado-06-*.md (6 em .claude/agents/especialistas + 6 no espelho .agents/)
git diff --numstat 0f0a872a e35492ef -- . ':!agent-orchestration' ':!.claude' ':!.agents' ':!docs' -> VAZIO
git hash-object x HEAD (cloud-usage.capture.ts · cloud-cost-allocation-prisma.repository.ts · checklist-prisma.repository.ts) -> IGUAIS
git ls-remote --heads origin fix/billing-durability -> e35492ef (pushada — D-DURABILIDADE-BRANCHES-LOCAIS)
```

Head de CÓDIGO = **`0f0a872a`, provado por diff** (acima dele só os 12 corpos). **Nenhuma mutação viva:** árvore limpa antes
e depois da minha suíte, hashes dos arquivos centrais = blob do head. Mutação commitada é mérito (C1/C2 re-executam).

### 1.2 · Plano de isolamento POR JURADO declarado no briefing — **BLOQUEADO (briefing inexistente)**

```
find agent-orchestration -iname '*BRIEFING*O6R-06*'            -> (nada)
git ls-tree -r e35492ef --name-only | grep -i O6R-06           -> só planos/B-O6R-06-plano.md e votos/B-O6R-06/01-critico-adversarial.md
ls agent-orchestration/omega/juntas/votos/B-O6R-06/            -> 01-critico-adversarial.md (47 KB) — NENHUM briefing
```

O §6 do plano (l.436) prevê `agent-orchestration/omega/juntas/BRIEFING-B-O6R-06.md`; não existe no head nem no disco.
Precedente desta casa (07b, ontem): passada 1 **bloqueou exatamente nisto**; passada 2 liberou com o briefing escrito.

**O que JÁ está escrito — nos 6 corpos (`jurado-06-*`, e35492ef), seção "Terreno" (C1 l.145-169; equivalentes nos outros 5;
contagens por corpo: worktree 8-14 · erp-postgres 1-2 · npm ci/junction 1-4):** worktree PRÓPRIO detached
(`o6r06-jur-c1`), nunca na principal, nunca no `b06`, nunca no de outro jurado; `npm ci` próprio + `prisma generate`;
**junction PROIBIDA** (`dir /AL` = 0); cluster Postgres/Redis descartável PRÓPRIO com nomes próprios, portas escolhidas
depois de `netsh`+`docker ps`, nunca 5432/55432/56446/56393; **base viva não é alvo de ninguém, nem leitura**; derrubar
por `docker rm -fv` e confirmar; não tocar `gov-descuido`/`san2-r`/principal; remoção só por `git worktree remove --force`,
só pelo identificador do bloco.

**O que SÓ um briefing carrega e hoje não está por escrito em lugar nenhum:** o head a julgar (`e35492ef`) e o head de
código (`0f0a872a`) — o corpo usa o placeholder `<head>` (l.148) e cita "briefing" como origem (l.57); os números que
o dev declarou, marcados [A RE-VERIFICAR]; a composição e os inelegíveis DESTA junta; as ressalvas deste parecer em
destaque. Sem briefing, o jurado recebe o head por chat — o que este item existe para impedir.

### 1.3 · Resíduo — **VERDE no head · RESSALVA (resíduos alheios, inertes)**

```
docker ps -a -> só erp-postgres / erp-redis (Up 9 days, healthy); nenhum jur-*/crit-*/o6r06-*
docker network ls | grep o6r|jur|crit -> nada ; volumes NOMEADOS -> só erp_techsolutios_erp_{postgres,redis}_data
git worktree list -> 3 (main · b06 · gov-descuido) ; git worktree prune --dry-run -> nada ; o6r06-base do dev NÃO existe
ls .claude/worktrees/ -> b06 · gov-descuido · san2-r  (san2-r: 16 K, sem .git, sem node_modules, FORA do worktree list = órfão vazio)
git ls-files --others | grep -iE 'probe|jur-|crit-' -> nada ; find -iname 'jur-probe*' -o -iname '*-probe.ts' -> nada
git ls-files '*.gitkeep' | test -f -> nenhum faltando ; storage/checklist-attachments/.gitkeep presente (blob 8b13789)
git diff --stat fe2748c8 e35492ef -- '*.gitkeep' -> vazio (o .gitkeep que o dev apagou por engano está de volta; nada mudou no range)
cmd /c "dir /AL b06" -> nenhuma junction/symlink ; fsutil reparsepoint query node_modules -> "não é ponto de nova análise" ; 222 entradas
ls .env .env.test (b06) -> NÃO existem (a suíte não pode ser sequestrada para a base viva por .env; DATABASE_URL só chega exportada)
docker volume ls -f dangling=true -> 49 anônimos (64-hex), CreatedAt 2026-08-28→2026-09-07Z ; docker system df -> 51 vol, 2,63 GB, 2,35 GB recuperáveis
git -C <principal> diff --stat -- <5 arquivos " M"> -> 2 REAIS (critico-c5-adversarial.md +86 · jurado-c5-arnes-catalogo-postgres.md +100/-4) ;
  planejador-mestre.md · porteiro-pos-merge.md · sync-agent-agents.mjs -> hash-object == HEAD (FANTASMA autocrlf)
```

Resíduos **alheios** (reporto, não varro): (a) `san2-r` órfão vazio; (b) **49 volumes Docker anônimos** de rodadas passadas,
5 de ontem à noite (22:13-23:37 local — consistentes com `o6r06-pg`/`o6r06-redis` do dev derrubados sem `-v`); nenhum
tem container; disco em **92 %** (20 GB livres); (c) árvore principal `demo/investidor` com 2 modificações REAIS não
commitadas + 3 ` M` fantasma + untracked do ciclo 5 do B-O6R-02 — outra sessão. Nenhum deles toca o `b06`.

---

## 2 · Insumos

### 2.1 · Ata anterior e "nada herdado como fato" — **VERDE nos corpos · pendente no briefing (1.2)**

```
ls omega/juntas/ | grep 07b -> BRIEFING-B-O6R-07b.md · J-B-O6R-07b.md (183 l.) ; votos/B-O6R-07b/05-porteiro-pos-merge-fe2748c.md (140 l.)
grep -c 'A RE-VERIFICAR' jurado-06-*.md -> 2 em CADA um dos 6
```

Tabela "Nada entra como fato — tudo é [A RE-VERIFICAR]" (C1 l.53-62): head/base/baseline 2936/2938 → **RE-MEÇA**; "18 das
20 mutações" (origem `Kpis/kpis-history.md:2495`, escrito pelo dev) → re-execute por amostragem; drills N1-N5 do crítico →
"mediu um espelho SQL, não o código"; canário → só por execução sob os DOIS papéis; R2-A/B decisão da junta, R2-C medição;
Δ+54 é da C3. Plano §2.3: "baseline por LEITURA — o dev re-mede por execução". Nenhuma conclusão do 07b/porteiro repassada
como verdade.

### 2.2 · Crítico + PDs — **VERDE**

```
votos/B-O6R-06/01-critico-adversarial.md -> 629 l.: r1 PLANO FRÁGIL (E1-E3 bloqueiam, E4-E10 ressalvas) · r2 PLANO ROBUSTO COM RESSALVA (R2-1…R2-6)
docs/omega-pd.md:930  PD-O6R-B06-OUTBOX-IN-DB   -> "16 fontes"   (≥5)
docs/omega-pd.md:1141 PD-O6R-B06-SUM-NUMERIC-RLS -> "14 fontes"   (≥5)
git show --stat be608a52 / dc47e668 -> exatamente esses arquivos (crítico 348+281 l.; omega-pd +385)
```

### 2.3 · Plano — **VERDE** (head não nomeado — é do briefing)

`planos/B-O6R-06-plano.md` 1153 l. (corpo 773 + EMENDA E1 380): base `fe2748c` (§8 l.548), worktree `b06`, §6 permitido/proibido
por caminho, §8 bateria com **forma declarada** (canônica 3; focados N=3; suíte 1×; `ec` por variável; piso único ≥47; armadilhas),
§11 quórum unanimidade de 3 + papéis + inspetor. E1·7 emenda o escopo (`cloud-usage.capture.ts` no lugar de `outbox.ts`; M-1…M-20).

**Escopo medido (fe2748c8..e35492ef):** `prisma` · `mobile` · `frontend` · `src/infra` · `src/modules/{impound,owner-portal,auth}` ·
`package-lock.json` · `frontend/package-lock.json` · `pubspec.yaml/lock` · `CLAUDE.md` · `AGENTS.md` · `src/database/rls.ts` ·
`infra` · `migrations` · `.env` → **0 arquivos cada (17 caminhos)**. `.github/workflows/ci.yml` **+8/-0**.
`scripts/reconcile-checklist-usage.ts` → **0** no `ls-tree` do head e 0 em `scripts/` (bloqueio R2-A respeitado).
`src/`: 17 arquivos, todos nos itens 1-10 do §6 como emendado. `tests/`: 7 `o6r06-*` novos + `helpers/o6r06-cost-fixtures.ts` +
4 adaptados do §6 + **exatamente 2 fora do §6** (`checklist-run-create-concurrency-db`, `checklist-run-lifecycle-db`) = as duas
que o dev declarou; **não há terceira**.

---

## 3 · Papéis (§C7.4-bis)

### 3.1 · Inelegibilidade por nome — **VERDE**

```
grep -rln 'jurado-06-' agent-orchestration/ docs/ | grep -v votos/B-O6R-06/ -> NADA (nenhum jurado-06 em ata, parecer ou reprovação anterior)
votantes 07b (J-B-O6R-07b.md):        agente-secops · jurado-07b-contrato-mobile-b108 · jurado-07b-contrato-regressao-registro
votantes 02-c5 (J-B-O6R-02-ciclo5.md): jurado-c5-arnes-catalogo-postgres · jurado-c5-banco-fk-triggers · jurado-c5-validador-diff-plano
frontmatter `name:` dos 6 corpos -> jurado-06-{banco-atomicidade-rls, invariante-financeiro-rateio, contrato-regressao-kpi} + 3 suplentes
```

Nenhum nome coincide. Os corpos nomeiam os inelegíveis (C1 l.30-46): `planejador-mestre`, `critico-adversarial`, dev
`general-purpose`, `porteiro-pos-merge`, `inspetor-de-terreno-da-junta`, `jurado-07b-*` (2 + suplentes), `agente-secops`,
`jurado-c4/c5/arnes-*`, `validador-mestre`. Nota: `model:` **ausente** nos 6 frontmatters (rodam no modelo da sessão).

### 3.2 · Competência × achados — **VERDE**

C1 banco/atomicidade/RLS (DIN-005; drill sem BYPASSRLS; canário sob os dois papéis) · C2 invariante financeiro/rateio (DIN-007
truncamento + acumulação float; exactly-once) · C3 contrato/regressão/KPI (§6 por hash de árvore; Δ por reexecução; backfill
#380; pendências). Cada achado tem cadeira.

---

## 4 · Fatias

### 4.1 · S0 — espelho Codex — **VERDE**

```
node scripts/sync-agent-agents.mjs --check > sync.out 2>&1; ec=$?   -> ec=0 · "[agents-sync] OK — 44 agentes, espelho consistente."
find .claude/agents -name '*.md' | wc -l -> 44 (21 em especialistas/) ; .agents/agents -> 45 = 44 + README (KEEP)
diff .claude/…/jurado-06-banco-atomicidade-rls.md .agents/…  -> só a linha `tools:` removida + preâmbulo Codex (por desenho; script l.66 "Recursivo DE PROPÓSITO")
```

Os `git hash-object` dos pares `.claude` × `.agents` **diferem por desenho** (preâmbulo) — não é divergência.

### 4.2 · Baseline honesto no head, árvore limpa — **VERDE**

```
git status --porcelain -> vazio ; npm run check > check.out 2>&1; ec=$?   -> ec=0  (tsc --noEmit, 54 s)
```

**Extra — prova de que o terreno suporta a forma canônica 3** (cluster MEU: `o6r06-insp-pg`, postgres:16-alpine,
127.0.0.1:**56501** — fora dos ranges `netsh excludedportrange`, nada em LISTEN; `npx prisma migrate deploy` ec=0, **107**
migrations = §8 do plano; Node v20.19.5):

```
DATABASE_URL=…:56501/erp_insp ; CORE_SAAS_PERSISTENCE e RBAC_DB_PARITY AUSENTES ; npm test > suite.out 2> suite.err ; ec -> 0
# tests 2992 · pass 2990 · fail 0 · cancelled 0 · skipped 2 · duration 275,8 s · 282 arquivos
skips = permission-catalog-db-parity ×2 (`# SKIP RBAC_DB_PARITY não é "1"`) — os 2 do orçamento do runner
```

Bate com o que o dev declarou (2992/2990/2). **Isto NÃO é insumo dos jurados** — C3 re-mede no cluster dela. A base
`fe2748c8` (2936/2938) eu **não** reproduzi: está medida pelo porteiro (independente do dev; 249 s; parecer l.37) e pelo dev
na abertura; **[A RE-VERIFICAR] pela C3** em worktree próprio (`git cat-file -t fe2748c8` → commit, alcançável). O Δ é
conferível: os 7 arquivos `o6r06-*` estão no head.

---

## 5 · Quórum e perda de jurado — **VERDE nos corpos · pendente no briefing (1.2)**

Corpos: **unanimidade de 3** (§C7.1-ter(b), dinheiro), "NÃO é 5/5", suplente nomeado por cadeira (`jurado-06-suplente-*`: os 3
corpos existem, espelhados), "se cair sem votar assume o suplente **do zero**, identidade QUEIMADA, **voto perdido nunca conta
como aprovação**, a junta não fecha com menos de 3 votos de mérito" (C1 l.48-51; suplentes: 10-11 menções cada).

---

## As duas coisas que o terreno EXPÕE (medidas)

1. **Inversão sob `NOBYPASSRLS`** — C1 l.315-332 e suplente C1 (`NOBYPASSRLS` 4 · superusuário 4): sob o papel restrito o teste
   fica **verde COM o defeito presente**; ele só aparece sob `postgres`; a medição válida exige os **DOIS** papéis. **C2 e C3
   NÃO a carregam** (o "inverso" da C2 l.291 é outro assunto) → o briefing repete para as três cadeiras.
2. **Duas divergências declaradas** — `P-O6R-B06-DIVERGENCIA-ESCOPO-TESTES-DB` (MÉDIA) e `P-O6R-B06-PAPEL-DO-DRILL-VEM-DO-ARNES`
   (BAIXA) em `controle/pendencias.md` (`^## P-O6R-B06-`), citadas na `description` da C3 e da suplente C3.
   Total `## P-O6R-B06-*` = **11** (o dev declarou 10 no `log-execucao.md`).

**Outros fatos medidos para a C3 (não bloqueiam):** `evidencia_fechamento` do DIN-005 em `achados.jsonl` e `pendencias.md`
**não cita K4** (0 hits; K4 só existe na projeção E1·7 l.1141 do plano, superada pelo R2-A) · `ci.yml` comenta "as **três**
suítes -db" e acrescenta **4** linhas (a 4ª é `o6r06-usage-fault-injection`, §7.2) · `git diff --check fe2748c8 e35492ef`
→ ec=2 por **1** espaço final em `docs/omega-pd.md` (registro, be608a52); em `src tests .github scripts` → ec=0.

---

## VEREDITO: **BLOQUEADO**

**Sujo (1 item):** 1.2 — `agent-orchestration/omega/juntas/BRIEFING-B-O6R-06.md` **não existe**. Para limpar (nomeio, não
escrevo — §C7.4-bis), o orquestrador escreve o briefing com:

- (a) head a julgar **`e35492ef`** (ou o head novo após os commits de registro), head de CÓDIGO **`0f0a872a`** provado por diff,
  base **`fe2748c8`**; a prova que a junta repete: `git diff --numstat 0f0a872a <head> -- . ':!agent-orchestration' ':!.claude'
  ':!.agents' ':!docs'` → vazio;
- (b) composição C1/C2/C3 + suplentes, e os inelegíveis **por nome** (lista do §3.1 acima);
- (c) o plano de isolamento por jurado — a seção "Terreno" dos corpos, verbatim ou por referência, com "porta livre" e
  "base viva nem leitura" explícitos;
- (d) o que o dev declarou (2992/2990/2 · 2936/2938 · Δ+54 = 15·6·6·6·4·10·7 · 18/20 mutações · 4/4 vermelho-controle) e o que
  a ata do 07b e o porteiro afirmam — **TODOS marcados [A RE-VERIFICAR]**, nunca como fato;
- (e) plano de perda de jurado: suplente por cadeira, 3 votos de mérito, voto perdido ≠ aprovação, identidade queimada;
- (f) as duas exposições acima **para as três cadeiras** (a inversão sob superusuário hoje só está na C1);
- (g) as ressalvas abaixo, em destaque.

Depois me chama para a **passada 2**: re-medir 1.2 · 2.1 · 5.1 + `git status --porcelain --ignored` + `sync-agent-agents.mjs
--check` no head novo.

**Ressalvas para o briefing (em destaque):**

- **R1 — Pristino se confere com `--ignored` TAMBÉM.** A suíte grava `storage/checklist-attachments/<uuid>/…` (ignorado por
  `.gitignore:7`) **no worktree onde roda**: na minha execução `--porcelain` ficou vazio enquanto `--ignored` foi de 2 para
  **13** entradas e `storage/` de 1 para **24** arquivos. Jurado que mede pristino só por `--porcelain` **não vê**. Limpar no
  teardown (a remoção do worktree leva junto); nunca deixar isso no `b06`.
- **R2 — 49 volumes Docker anônimos dangling** (2,35 GB) de rodadas passadas. Cada jurado derruba o seu cluster com
  `docker rm -fv` e confirma por `docker volume inspect --format '{{.CreatedAt}}'` na sua janela. `docker volume prune` é
  decisão do orquestrador/dono (os nomeados `erp_techsolutios_*` são a base viva — intocáveis).
- **R3 — `san2-r` órfão vazio; árvore principal com 2 modificações reais + 3 fantasmas + untracked de outra sessão.** Nenhum
  jurado roda nada lá (um `--check` na principal daria outra resposta). Resíduo alheio se reporta, não se varre.
- **R4 — Base 2936/2938 não reproduzida por mim.** C3 re-mede em worktree próprio de `fe2748c8` (`npm ci` próprio) e cluster
  próprio. O meu 2992/2990/2 no head **não é insumo** de ninguém.
- **R5 — Para a C3 decidir se é registro ou nada:** `ci.yml` "três" × 4 linhas; 11 × 10 pendências; espaço final em
  `docs/omega-pd.md`.
- **R6 — `model:` ausente** nos 6 corpos `jurado-06-*` (rodam no modelo da sessão).

---

**Limpeza (o que criei e derrubei — confirmado por execução):** container `o6r06-insp-pg` (`docker rm -fv`, ec=0; `docker ps -a`
→ só `erp-postgres`/`erp-redis`; `docker volume ls` sem nenhum `CreatedAt` na minha janela 04:4xZ; bancos efêmeros `o6r-*` no
meu cluster → 0 antes do rm; porta 56501 sem LISTEN, só TIME_WAIT drenando) · **13 diretórios ignorados** que a suíte criou
em `storage/checklist-attachments/` removidos (11 com arquivos, 2 vazios) → `--ignored` = 2 (os de partida: `node_modules/`,
`frontend/node_modules/`), `storage/` só `.gitkeep` · nenhum worktree criado (`git worktree list` = 3 antes e depois) · logs
(`check.out`, `sync.out`, `migrate.out`, `suite.out/err/ec`) no scratchpad da sessão, fora da árvore · `git status --porcelain
--untracked-files=all` no `b06` → **vazio**, HEAD `e35492ef` · base viva `erp-postgres`/`erp-redis` **não recebeu um comando,
nem de leitura** · árvore principal e `gov-descuido` intactos. Este arquivo é o único untracked que deixo (o orquestrador commita).
