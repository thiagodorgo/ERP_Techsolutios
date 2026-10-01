# PARECER DO INSPETOR DE TERRENO — B-GOV-MANDATO, PR #393, JUNTA 3 (ciclo 3)

- **Papel:** `inspetor-de-terreno-da-junta` (rodando como `general-purpose`, corpo aplicado verbatim)
- **Modelo:** Fable 5.1 (`claude-fable-5-1`) — o que o frontmatter `model: fable` do corpo fixa; sem fallback
- **Corpo aplicado:** `28b4defd:.claude/agents/inspetor-de-terreno-da-junta.md`, md5 EOL-neutro `de80b2a9d4fc7edd7b9a26e2d601f97d` (== `origin/main`)
- **Data:** 2026-09-30
- **Escrita no repositório:** NENHUMA. Este arquivo vive no scratchpad.

Parecer incremental: cada item abaixo é gravado à medida que é medido.

## 0. Objeto

```
git ls-remote origin refs/heads/chore/mandato-refs-e-preflight refs/heads/main
  28b4defdc067387f384e06614e033e0976e9912b  refs/heads/chore/mandato-refs-e-preflight
  3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c  refs/heads/main
gh pr view 393 --json headRefOid,isDraft,state,mergeable
  headRefOid=28b4defdc067387f384e06614e033e0976e9912b  isDraft=true  state=OPEN  mergeable=MERGEABLE
git fetch origin → origin/main=3b1fe0f9, origin/chore/mandato-refs-e-preflight=28b4defd
```
Objeto **28b4defd** — não andou desde o que o orquestrador empurrou.

## 1. Ancestralidade (R5 do #394 / R-C do #395; ERRATA E-4(a))

```
git merge-base --is-ancestor 3b1fe0f9 28b4defd → ec=0
git merge-base origin/main 28b4defd = 3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c
git rev-parse origin/main            = 3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c   → IGUAIS
git log --oneline origin/main..28b4defd | wc -l → 74 commits (merge de integração 7d02d8da incluído)
```
VERDE.

## 2. Blobs congelados (§14.2.1) no objeto — `git rev-parse --short=8 28b4defd:<f>`

| arquivo | blob | esperado |
|---|---|---|
| scripts/mandato-refs.sh | 474c7521 | 474c7521 ✓ |
| scripts/mandato-preflight.sh | faa408c8 | faa408c8 ✓ |
| scripts/mandato-mutantes.sh | 37549262 | 37549262 ✓ |
| tests/mandato-refs.test.ts | d455ae1a | d455ae1a ✓ |
| tests/mandato-preflight.test.ts | 7a52d37c | 7a52d37c ✓ |

VERDE (5/5). Conferência contra as triplas das matrizes publicadas: item 6 abaixo.

## 3. Check-runs no objeto (corpo 4.3)

```
gh api repos/thiagodorgo/ERP_Techsolutios/commits/28b4defd…/check-runs --jq .total_count → 14
14 × completed/success: 2 runs (36689719406, 36689724786) × 7 jobs
  (authority-portal, backend, backend-postgres, docker, flutter, frontend, owner-portal)
```
VERDE. 0 queued/in_progress/cancelled. Bate com o "14/14 success" do orquestrador.

## 4. S0 — espelho Codex (corpo 4.1), no objeto, worktree próprio

```
cd /c/Users/AMP/w-insp393c && node scripts/sync-agent-agents.mjs --check → ec=0
[agents-sync] OK — 34 agentes, espelho consistente.
```
VERDE.

## 5. Ambiente de quem mede (ERRATA E-11)

```
env | grep -c '^MSYS_NO_PATHCONV=' → 0
git version 2.53.0.windows.2 · node v20.19.5 · npm 11.7.0 · MINGW64_NT-10.0-22631 3.6.6-1cdd4371.x86_64 x86_64
```
Worktree próprio: `C:/Users/AMP/w-insp393c`, `git worktree add --detach … 28b4defd` ec=0, `status --porcelain` = 0 linhas. `npm ci` próprio (sem junction) em curso.

## 5-bis. Censo de processos vivos (antes do meu `npm ci`)

`Get-CimInstance Win32_Process | Where Name -match '^(node|tsx|bash|sh|pg_ctl|postgres|redis-server|npm|docker|initdb)'`
→ nenhum `node`/`tsx`/`bash`/`postgres`/`redis-server`/`npm`; só `Docker Desktop.exe` (GUI) e um `docker.exe stats` (do próprio Desktop).
**Nenhum processo da E4 nem dos devs vivo.** VERDE.

## 5-ter. Containers

```
erp-postgres      Up 2 days (healthy)  0.0.0.0:5432   ← base viva, NÃO é alvo
erp-redis         Up 2 days (healthy)  0.0.0.0:6379   ← base viva, NÃO é alvo
erp-postgres-alt  Exited (255) 12 days ago  127.0.0.1:55432   ← inerte, alheio
pastrack-teste-banco-teste-1  Exited (0) 5 days ago             ← inerte, alheio
```
Nenhum `jur-*`/`crit-*`. Inertes se reportam, não se varrem.

## 6. Matrizes — insumo obrigatório (§14.3), tripla por linha + ambiente (§14.8/§14.19), [M-1] por CONJUNTOS (ERRATA E-12)

`docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-mutantes.md` (887 l.) presente no objeto; §0 grava as triplas e o ambiente. **Triplas medidas nos heads das rodadas** (`git rev-parse --short=8 <head>:<f>`), não lidas do cabeçalho:

| rodada | head | refs.sh | preflight.sh | mutantes.sh | refs.test | preflight.test | = objeto? |
|---|---|---|---|---|---|---|---|
| refs — E4-refs-3 | 396643aa | 474c7521 | faa408c8 | 37549262 | **d455ae1a** | 3d875a54 | tripla do refs = objeto |
| pré-voo A | c32f77b5 | 474c7521 | **faa408c8** | **37549262** | 4a653b77 | **3d875a54** | guard difere por desenho (lema §4.4) |
| pré-voo B | 4794169a | 474c7521 | **faa408c8** | **37549262** | d455ae1a | **7a52d37c** | tripla da B = objeto; equivalentes `9c691363` = objeto |

Evidência bruta (só leitura, `scratchpad/`):
- `E4C/refs.txt`: `head 396643aa` · `LINHA DE BASE fail=0 de tests=39` · `N=46 K=46 NAO-COBERTOS=0 EXCLUIDOS=52 ANOMALIAS=1` — §3.2 do .md idêntico.
- `E4/preflight.txt` (A): `head c32f77b5` · base `fail=0 de tests=299` · `N=103 K=87 NAO-COBERTOS=16 EXCLUIDOS=57 ANOMALIAS=2`.
- `E4E/preflight-B.txt` (B): `head 4794169a` · base `fail=0 de tests=312` · `--only 16` · `N=16 K=13 NAO-COBERTOS=3 EQUIVALENTES-DECLARADOS=3`; `E4E/log.txt` l.2: `AMBIENTE ... MSYS_NO_PATHCONV exportadas=0 | git 2.53.0.windows.2 | node v20.19.5 | MINGW64_NT-10.0-22631 ...` — igual ao §0 do .md. §4.3 verbatim = E4E.
- §4.5 composta: **162** linhas com rodada (146 `A` + 16 `B`), contadas por grep.

**[M-1] por conjuntos, recomputado por mim dos brutos (nunca pelo `ec`):**

```
NC(B)     = { 245 318 336 }   (grep NAO-COBERTO: em E4E/preflight-B.txt | sort -un)
EQ(arq)   = { 245 318 336 }   (linhas ^[0-9]+:.*\(.+\) do ...-equivalentes.txt | sort -un)   -> IGUAIS
NC(A)     = { 165 182 187 188 189 190 245 249 255 318 336 393 514 515 520 523 }
pontos(B) = idem (16)                                                               -> IGUAIS (o L do lema §4.4)
```

[M-1] = 3 − 3 = **0**, derivado. VERDE.

## 7. `P-GOV-MANDATO-3-FRONTEIRAS` (pendencias.md l.9891+)

Presente, ABERTA, dono `B-GOV-MANDATO-2`; itens **9, 10, 11, 13–22, 24, 25, 26, 27, 28** cada um com texto e fonte; **23 retirada** ([V18b]/[V18c]); item "cabeçalho congelado" (§14.2.2); tabela de presença por linha de cabeçalho. VERDE.

## 8. Parecer do porteiro do #395 (R-D/R-E)

`tr -d '\r' < .../votos/B-GOV-SEM-TETO/PORTEIRO-395.md | md5sum` = **9cd7cb00020f0577044eb2ed3de4e3b8** (worktree e blob `28b4defd:`). VERDE.

## 9. Corpo do PR reescrito para o ciclo 3

`gh pr view 393 --json body`: cabeçalho *"reescrito em 2026-09-30 para o ciclo 3"*; cita 12 ERRATAs, `7d02d8da`, `D-SEM-TETO-AUDITORIA-NO-3`, md5 do PORTEIRO-395, fronteiras 9–11/13–22/24–28, [M-1] por conjuntos, 39/312 casos, 3403/3405, `blocks_completed` 169, e o "como conferir" sem `MSYS_NO_PATHCONV` exportado. VERDE.

## 10. Ciclo derivado do repositório e legalidade

`R-B-GOV-MANDATO-1.md` (43 l.) e `R-B-GOV-MANDATO-2.md` (67 l.) existem no objeto → **ciclo 3**; item 2.2 do corpo ("ciclo ≥ 4") **não se aplica**. `D-SEM-TETO-AUDITORIA-NO-3`: `origin/main:CLAUDE.md` l.414 e `28b4defd:CLAUDE.md` l.414 (§C7.4 item 4, texto do gatilho l.419-429). VERDE.
*Nota:* o plano §10 l.1078 escreve "§C7.4.4" — a grafia literal não existe no `CLAUDE.md`; é o **item 4 do §C7.4**, que existe. Nenhum corpo cita "§C7.4.4"; sem efeito.

## 11. Insumos (corpo 2.1 / 2.3)

- Ata `J-B-GOV-MANDATO.md`: ciclo 1 (`Objeto julgado 7462b75b...`, REPROVADO 2×1, papéis) e ciclo 2 (`4c8819ef...`, REPROVADO 2×1, papéis para o ciclo 3, l.201-207). R-2 responde (a)(b)(c) do §C7.4-bis por escrito, com a tabela de papéis. OK.
- Briefing Ciclo 3 l.155-157: *"Tudo que está aqui é insumo a re-verificar, não fato herdado"*; §0 do plano marcado "a re-verificar" (§10 l.1074). Nenhuma conclusão de ata repassada como fato. OK.
- Plano: head resolvido por cada cadeira (não digitado); §4 PERMITIDO/PROIBIDO; §8 bateria com forma (worktree próprio, `npm ci` próprio, saída em arquivo, `ec` por variável, N); §10 junta. OK.

## 12. Papéis (corpo 3.1, 3.1-bis, 3.2, 3.3)

- **3.1-bis Obituário** (`OBITUARIO-IDENTIDADES.md`, 301 l.): grep por `c1c|c2c|c3c|invariancia-de-forma|cobertura-por-mutacao|c3c-fronteira` → **0 linhas**. Ausência não absolve →
- **3.1 grep nas atas:** `git grep -l` no objeto em `J-*.md`, `reprovacoes/`, `votos/` → **0 arquivos**. As três identidades aparecem só em `BRIEFING-B-GOV-MANDATO.md`, `...ciclo3-plano.md` e, como *"cadeiras designadas para a junta 3 do #393"*, em `BRIEFING-B-GOV-SEM-TETO.md` l.56-57 / `B-GOV-SEM-TETO-plano.md` l.468-469 — **nunca votaram, nunca planejaram, nunca desenvolveram**. Nenhum commit do ramo as cita. OK.
- **Censo de autoria de código** (`git log origin/main..28b4defd -- scripts/mandato-* tests/mandato-*`): 17 commits. **12** estão na lista de devs do briefing (Dev-T `6c8fb3e8 4ad4ba9f` · Dev-S `33356358 616fd4fa 72214ff7 1466c7d9 714d4815 d222ce7c` · Dev-T-3 `9d3de5dd` · Dev-S-2 `c32f77b5` · Dev-T-4 `395d07c9 396643aa` · Dev-T-5 `190e2300` · Dev-T-6 `9e8cf1cd`); os **5** restantes (`f8d5a2c8 1ae82626 307b6bf9 7b2e9c51 cea715da`, 25–26/09) são **ancestrais de `34969a81`** (ata do ciclo 2) — código dos ciclos 1–2 (orquestrador / `aa051e8cc3eb1c1a0` / `a4ed42a5e3a81bdd3`), todos inelegíveis pelo briefing. Logo *"o orquestrador não escreveu código do bloco no ciclo 3"* **confere por medição**. Os 18 SHAs do briefing são ancestrais do objeto. OK.
- **3.2 competência:** C1‴ forma/fail-closed · C2‴ cobertura por mutação · C3‴ fronteira/número/registro/ordem — cobre as três classes vivas do R-2. OK.
- **3.3 corpo carregado × corpo julgado:** o diretório de agentes da sessão (`.../ERP_Techsolutios/.claude/agents/especialistas/`) **não contém** `c1c/c2c/c3c` (0 arquivos; só c1/c2/c3/c3b dos ciclos 1-2). As cadeiras rodam lendo o corpo do head (briefing l.183-185). **md5 EOL-neutro que cada cadeira tem de declarar** (`git show 28b4defd:.claude/agents/especialistas/<x>.md | tr -d '\r' | md5sum`):
  - `jurado-mandato-c1c-invariancia-de-forma` → **35765f76d40f9c775c571d67799544b8** (450 l.; ERRATAs E-1, E-2, E-6, E-9, E-10, E-11 = tabela do briefing)
  - `jurado-mandato-c2c-cobertura-por-mutacao` → **71415699ad7bffc2adde55f29c402e51** (443 l.; E-1, E-3, E-5, E-6, E-8, E-9, E-10, E-11, E-12)
  - `jurado-mandato-c3c-fronteira-numero-registro` → **f12be57049331266226d2d89d01935e0** (576 l.; E-1, E-2, E-4, E-6, E-7, E-8, E-9, E-10, E-11, E-12)
  Frontmatter dos três: `model: opus` · `tools: Read, Grep, Glob, Bash`. Normas citadas existem no `CLAUDE.md` do objeto (§C7.1-ter 2×, §C7.4-bis 3×, §C3.3-5, §C4, §C5; `D-SEM-TETO-AUDITORIA-NO-3` 4× por corpo).
- **Espelho Codex (S0, conferido além do `ec` do script):** `.agents/agents/especialistas/<x>.md` difere do `.claude/...` **só** pelo frontmatter portátil (sem `tools:`) e pelo preâmbulo de 6 linhas "Papel para o Codex"; removido o preâmbulo, o corpo é **byte-idêntico** nas 3 cadeiras (md5 EOL-neutro `4f37ee09...`/`b750bade...`/`6c7a9b12...` iguais dos dois lados). O `sync-agent-agents.mjs` é recursivo por desenho (l.66-71) e conta 34 (11 em `especialistas/` nos dois lados). OK.

## 13. Baseline honesto (corpo 4.2) — worktree próprio `C:/Users/AMP/w-insp393c` @ 28b4defd, árvore limpa, `npm ci` próprio, sem junction, `MSYS_NO_PATHCONV` não exportado

```
timeout 900  node --test --import tsx tests/mandato-refs.test.ts      -> ec=0  # tests 39  pass 39  fail 0  skipped 0  (78.8 s)
timeout 1500 node --test --import tsx tests/mandato-preflight.test.ts -> ec=0  # tests 312 pass 312 fail 0 skipped 0  (374.4 s)
npm run check (tsc --noEmit)  1a: ec=2 — 5 erros TS2305/TS7006 em work-order/yard-prisma.repository ("@prisma/client has no exported member Prisma")
                              -> causa: cliente Prisma nao gerado no MEU arnes (npx prisma generate sem DATABASE_URL: PrismaConfigEnvError)
DATABASE_URL=postgresql://insp:insp@127.0.0.1:1/insp npx prisma generate -> ec=0 (Prisma Client v7.8.0; sem banco)
npm run check  3a: ec=0
git status --porcelain -> 0 (a arvore continua limpa depois de tudo)
```

Esperados 39/0-skip e 312: **batem**. O CI (`ci.yml` l.106, job backend) já tinha `npm run check` verde no objeto. VERDE.

## 14. Terreno, mutação viva e resíduos

- `w-mandato` @28b4defd, `status --porcelain` 0; os 5 centrais `tr -d '\r' | md5sum` = blob (5/5 IGUAL). `w-devs393` @d222ce7c e `w-devt393` @4ad4ba9f limpos (ficam, ERRATA E-6). `.claude/worktrees/{b04a,b11,gov-descuido,gov-elenco}` limpos, de outros blocos. **`w-j3c1/2/3` ainda não existem** — cabe ao orquestrador criá-los detached em 28b4defd, caminho curto, `npm ci` + `prisma generate` próprios.
- Containers: `erp-postgres` (5432) e `erp-redis` (6379) vivos = base viva, **nunca alvo**; `erp-postgres-alt` (Exited 12 d) e `pastrack-teste-banco-teste-1` (Exited 5 d) inertes, alheios. Nenhum `jur-*`/`crit-*`.
- Processos (antes das minhas execuções): nenhum `node`/`tsx`/`postgres`/`redis-server`/`bash` vivo — nenhum resíduo da E4 nem dos devs.
- `/tmp/mandato-preflight-DAu0al` (28/09 00:56; 28 arquivos: fixtures `f-*.md` + `bin/`): criado por `tests/mandato-preflight.test.ts` l.31 (`mkdtempSync(tmpdir(), "mandato-preflight-")`) — execução do guard que não chegou ao teardown. **Inerte; alheio; não varrido.**
- **Árvore principal (`demo/investidor`, d1fab3bc) — os 4 ` M` NÃO são fantasmas de stat-cache:** `tr -d '\r' | md5sum` de `HEAD:<f>` × disco **diferem** nos 4; `git diff --ignore-cr-at-eol --stat` = **+364/−8 linhas** (`critico-c5-adversarial.md`: +86, um *"APENSO — 2026-08-31 (bloco SAN2-5)"*; `jurado-c5-arnes-catalogo-postgres.md`: +100/−8; nos dois espelhos). É **mutação viva não commitada de corpos de OUTRO bloco** (B-O6R-02 ciclo 5), no diretório de agentes da sessão. Não são cadeiras desta junta e não tocam o objeto. **Resíduo alheio: reportado, não varrido.** A premissa do orquestrador ("fantasmas, conferir por hash-object") **está falsificada** para estes 4 arquivos (`git hash-object` do disco ≠ blob de HEAD também).
- Untracked na árvore principal (9: `BRIEFING-/J-B-O6R-02-ciclo5.md`, `TEMPLATE-J-ata.md`, `votos/{B-O6R-02-ciclo5,O6R-07a,O6R-07a-ressalvas,SAN2-6}/`, `results.txt`, `scripts/audit-agents-skills.mjs`): alheios, inertes, só reportados.

## 15. Plano de isolamento (corpo 1.2) e de quórum (corpo 5.1)

- Briefing Ciclo 3 l.263-267: base viva nunca alvo · worktree próprio em caminho curto, removido pelo nome depois de conferir processos · sem `tail -f`/`watch` · timeout em tudo que executa artefato mutado. OK.
- Quórum l.172-173: maioria de 3, sem veto, sem suplente; **queda relança a mesma identidade, que não herda nada; voto perdido nunca conta como aprovação; evidência incremental**; as três votam juntas sem ler o voto umas das outras (l.275). OK.
- **Cluster descartável + porta provada (C3‴, KPI 2×):** a seção Ciclo 3 do briefing **não** o restata. Está escrito, verificável: corpo da C3‴ l.196-202 (*"`erp-postgres` (5432) e `erp-redis` (6379) são a BASE VIVA e nunca são alvo — nem de leitura. Suba Postgres e Redis descartáveis seus ... PROVE que ligaram — `pg_isready` + `netstat`"*), l.196 (`npx prisma generate` com `DATABASE_URL` só no env), l.567 (teardown pelo nome com as portas); plano §10 l.1062; e o próprio arquivo do briefing l.100 e l.115-116. → **ressalva R4**, não bloqueio: o contrato que a cadeira aplica carrega o plano; falta a linha na seção do ciclo.

## 16. Check-runs: item 3 (14/14 `success`). OK.

---

## VEREDITO: **LIBERADO COM RESSALVA**

Nenhum item bloqueante: objeto 28b4defd existe, é o do PR e está limpo; ancestralidade ec=0 e MB = origin/main; S0 ec=0 com corpo verbatim provado entre espelhos; blobs congelados 5/5; matrizes presentes com tripla+ambiente e [M-1]=0 por conjuntos; fronteiras 9–11/13–22/24–28 na pendência; PORTEIRO-395 md5 confere; PR reescrito; R-1/R-2 e ata; obituário/atas sem as 3 identidades; devs conferidos por censo de commits; baseline 39/0-skip + 312 + `npm run check` 0; 14/14 check-runs; quórum e perda declarados; nenhum processo vivo, nenhum `jur-*`.

**Ressalvas (para o briefing das cadeiras, em destaque):**

- **R1 — cadeiras como `general-purpose`:** o dir de agentes da sessão não tem os corpos; ao lançar, o orquestrador **passa `model: opus`** (o do frontmatter) explicitamente, **proíbe escrita fora do scratchpad** (o `general-purpose` ganha Write/Edit que o corpo nega), exige que cada cadeira **declare o md5 do corpo aplicado** (35765f76... / 71415699... / f12be570...) e confere `git -C w-j3cN status --porcelain` = 0 **depois** do voto.
- **R2 — Prisma no arnês:** em cada `w-j3cN`, `npm ci` + **`DATABASE_URL=<sua> npx prisma generate`** antes de `npm run check`/`npm test`; sem o cliente gerado o `check` sai ec=2 por arnês (medido aqui) e viraria falso "não consigo medir" na C3‴.
- **R3 — os 4 ` M` da árvore principal são edições reais (+364/−8), não fantasmas:** resíduo alheio (apenso SAN2-5, 2026-08-31, corpos do B-O6R-02 c5); não toca o objeto nem estas cadeiras; reportado, não varrido; o dono daquele bloco decide.
- **R4 — briefing Ciclo 3, "Ambiente de quem mede":** acrescentar uma linha: *"C3‴: Postgres/Redis descartáveis próprios, `DATABASE_URL`/`REDIS_URL` explícitas, porta provada (`pg_isready` + `netstat`), derrubados pelo nome no fim."* (já obriga pelo corpo l.196-202/567).
- **R5 — `/tmp/mandato-preflight-DAu0al`:** resíduo inerte do guard (mkdtemp l.31), 28/09 00:56; alheio; não varrido.
- *Nota:* "§C7.4.4" no plano §10 l.1078 = §C7.4 item 4 (existe); grafia literal não existe; nenhum corpo a cita.

## Limpeza (1 linha)

Criado e removido pelo nome: worktree `C:/Users/AMP/w-insp393c` (`git worktree remove --force`, depois de 0 processos vivos nele; `npm ci` próprio, sem junction); nenhum container criado; nenhum arquivo rastreado tocado; ficam no scratchpad este parecer, `corpo-inspetor.md`, `s0-check.txt`, os TAPs (`insp-refs.tap`, `insp-preflight.tap`) e os logs (`insp-npm-check*.log`, `insp-prisma-generate*.log`, `npm-ci-insp393c.log`); `/tmp/insp-*.txt` temporários já removidos; resíduos alheios não tocados.
