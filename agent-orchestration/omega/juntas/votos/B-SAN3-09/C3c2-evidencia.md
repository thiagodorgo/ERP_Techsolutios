papel: C3 | identidade: jurado-san3-09c2-c3-guard-ast-e-escopo | modelo: Claude Opus 5.5 (claude-opus-5-5) (substituição §C7.6-bis: frontmatter diz fable; Fable não rodou pela D-FABLE-ASTRA-SO-DINHEIRO, decisão do dono de 2026-10-08 — Fable só em bloco que toca dinheiro, e este não toca) | mandato_md5: 63443fcb86cf6621df736e094b5a41c7 (declarado no disparo: 63443fcb86cf6621df736e094b5a41c7 — igual) | corpo_md5: f259ce4769fbeaf71d1b07e49574d1cc (recebido no prompt: lido do blob HEAD de w-nuv09 = d3eace58, md5 EOL-neutro f259ce4769fbeaf71d1b07e49574d1cc, igual ao declarado no disparo e ao da tabela 4.d do inspetor)

# Evidência — cadeira C3 da junta 2 do B-SAN3-09 (PR 400)

Lançada como general-purpose, autorrestrita a Read, Grep, Glob e Bash (evidência e voto gravados só por Bash).
Nome de sessão: jurado-san3-09c2-c3-guard-ast-e-escopo — não coincide com nenhum inelegível (§15.4 / corpo l.57-68).

## 0. Terreno (2026-10-08T18:10Z)
- objeto: d3eace58240cac15062ee8f46c6e7f418711671a — `git ls-remote origin refs/heads/feat/bootstrap-platform-admin refs/pull/400/head` = d3eace58 (ambos) e `gh pr view 400 --json headRefOid,...` = d3eace58 · OPEN · draft · CONFLICTING.
- origin/main no início (após `git fetch origin main`): c8af64580cb85ddf4960fecb2f8604384f8f0328 · merge-base(origin/main, objeto) = 8ee10bd2e44d95206551b71351f23d901192cbb6.
- cerca do mandato: 6319f11a (ancestral do objeto). `git diff --name-only 6319f11a d3eace58` = 7 arquivos, todos em agent-orchestration/omega/juntas/votos/B-SAN3-09/ (mandatos C1c2/C2c2/C3c2 e evidência/voto de C1c2/C2c2) → SÓ REGISTRO. Do objeto do inspetor e1206447 até d3eace58: 4 commits do orquestrador (parecer, mandatos, voto C1, voto C2), 8 arquivos, todos em agent-orchestration/omega/juntas/votos/B-SAN3-09/ → SÓ REGISTRO; árvore de produto idêntica à julgada pelo inspetor. (Não li o conteúdo dos arquivos C1c2-*/C2c2-*.)
- $SCRATCH = C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad
- node v20.19.5 · Python 3.13.14 · disco C: 12G livres (96%) antes do npm ci · shell Git Bash (MINGW64) · MSYS_NO_PATHCONV NÃO exportada · nenhuma variável exportada.
- worktree próprio: `git worktree add --detach C:/Users/AMP/w-j9c2c3 d3eace58` → `test -e .git` ok, HEAD d3eace58, status --porcelain = 0, core.autocrlf=true (cópia de trabalho CRLF).
- check-runs no objeto d3eace58 às 18:09Z (`gh api .../commits/d3eace58.../check-runs?per_page=100` → $SCRATCH/checkruns.json): total=6 · não-verdes=4 · pendentes=4 (flutter/backend/backend-postgres/frontend in_progress; owner-portal e authority-portal success) — push recém-feito; re-medir no fim.
- `npm ci --no-audit --no-fund` próprio em w-j9c2c3 (timeout 900) → ec=0, 326 pacotes; `fsutil reparsepoint query node_modules` → "não é um ponto de nova análise" (sem junction). `DATABASE_URL='postgresql://x:x@127.0.0.1:1/x' timeout 300 npx prisma generate` → ec=0 (URL fictícia só no comando). typescript do node_modules = 5.9.3. Disco após npm ci: 11G livres. git status --porcelain = 0.
- Sem banco nesta cadeira (T1 roda no Windows); nenhum container criado até aqui. Base viva (erp-postgres/erp-redis) não tocada.

## 0.1 Legalidade (2026-10-08T18:13Z)
- Parecer que vale: `00-inspetor-terreno-c2.md` (blob d3eace58), inspetor-de-terreno-da-junta (junta 2), §8 gravado 17:24Z → **LIBERADO COM RESSALVA**, sobre o objeto e1206447, nomeando esta identidade (`jurado-san3-09c2-c3-guard-ast-e-escopo`, corpo f259ce47… — confere) e worktree próprio (nome "w-j09c2c ou o que o mandato fixar"; o mandato fixou w-j9c2c3, livre em 2.a do parecer). Delta e1206447→d3eace58 = só registro (item 0) → a liberação vale para d3eace58 (o parecer diz: "Objeto que andar além de registro anula" — não andou além).
- Ressalvas lidas e aplicadas: R-1 (7 check-runs, não 14); R-2 (norma = origin/main c8af6458, diff de bloco three-dot, KPI não se cobra; ramo não integrou 357a98e9); R-3 (general-purpose com corpo do blob, md5 publicado — feito na l.1); R-4 (mandatos nomeiam dados — C3c2.md nomeia w-j9c2c3 e prefixo j9c2c3-); R-5 (volumes órfãos: não tocar, `docker rm -f -v` só nos meus); R-6 (disco 11-12G).
- Normas na ref julgada (`MSYS_NO_PATHCONV=1 git show origin/main:CLAUDE.md | grep -c '<âncora>'`): D-GOV-PROPORCIONAL 3 · "Teto de 2 ciclos" 2 · "KPI congelado" 2 · "Junta proporcional ao risco" 1 · "INSPEÇÃO DE TERRENO ANTES DE TODA JUNTA" 1 · 1-ter 4 · 4-bis 6 · 6-bis 2 · "P7 — Pausa" 1 · D-MEDIR-NA-REF-ALVO 1 · "C4. Disciplina" 1 · "C5. Limpeza" 1. decisoes.md origin/main: D-FABLE-ASTRA-SO-DINHEIRO = 1 (l.2982). `git ls-tree -r --name-only origin/main -- scripts/ | grep -c mandato` = 0 → scripts/mandato-*.sh, errata 15.15 e D-MANDATO-FORMA NÃO são norma aqui (não cobro).
- Quórum aplicado: unanimidade de 3 com veto (§C7 item 8(1): segurança/permissão) · ciclo 2 de 2 (§C7 item 8(2)) · KPI congelado (§C7 item 8(5)).
- Veredito parcial da legalidade: LEGAL — liberação válida para o objeto d3eace58; check-runs do objeto ainda em curso às 18:09Z (re-medir no fim; a árvore de produto é idêntica à de e1206447, que o inspetor mediu 7/7 success).

## Item 1 — C3-F1 (MF1-a…g, diferencial, fecho)

### 1(a) baseline e estrutura — 2026-10-08T18:16Z
- `timeout 300 node --test --test-reporter=tap --import tsx tests/san3-09-bootstrap-platform-admin.test.ts > $SCRATCH/c3/T1-baseline.tap 2>&1; ec=$?` (cwd w-j9c2c3, objeto d3eace58, cópia CRLF) → ec=0 · tests 26 · pass 26 · fail 0 · cancelled 0 · skipped 0 · 4,5 s. Pelo nome: ok 20 T1.5 (produção sem opt-in), ok 21 T1.5 M-2, ok 22 T1.5c, ok 24 T1.7-guard, ok 25 T1.7-MUTAÇÃO.
- Sonda `$SCRATCH/c3/p1-structure.mjs` (md5 1c7f838cfa36509d18e3f12d23738765; AST do arquivo de teste, typescript 5.9.3) → saída em `$SCRATCH/c3/p1-structure.out`:
  - FunctionDeclaration: unknownArgumentVariants@93, **collectModuleSpecifiers@326 (UMA)**, runtimeClosure@353, extractRunbookB@407.
  - `new Set([...])` com `@prisma`/`dotenv`: **UM** literal (IMPORT_ALLOWLIST l.317, 6 elementos).
  - Pontos de chamada de collectModuleSpecifiers: l.359 (runtimeClosure, `text,path,true`), l.372 (T1.7-guard, `text,scriptPath`), l.396 (T1.7-mutação, controle sem injeção, `script,SCRIPT`), l.398 (T1.7-mutação, `${script}\n${form}`, SCRIPT). `text` do guard = readFileSync(scriptPath) l.371; `script` da mutação = readFileSync(SCRIPT) l.388; scriptPath (l.370) e SCRIPT (l.233) = `join(ROOT,"scripts","bootstrap-platform-admin.ts")` — mesmo caminho, mesmo texto real. Guard e teste de mutação chamam A MESMA função sobre o MESMO script.
  - Regra de regex: nós RegularExpressionLiteral + chamadas `RegExp(`/`new RegExp(` + identificador `extractScriptImports`. N=8 literais regex, nenhum aplicado a texto de import: 3 em unknownArgumentVariants (flags), 4 em asserts de stderr (T1.5/T1.5c), 1 `/\.js$/` em runtimeClosure (troca de extensão do especificador já coletado, não extração). `new RegExp`/`RegExp(` = 0. `extractScriptImports` = 0. → zero extração de import por regex.
  - parseDiagnostics: l.328 `assert.equal(source.parseDiagnostics.length, 0, ...)` dentro de collectModuleSpecifiers — reprova por assert (o ramo é medido no item 2: se algum caso morre sem ele).
- Veredito parcial 1(a): VERDE (uma função, um literal, zero regex de import, mesmo caminho).

### 1(b) especificadores do script real — 2026-10-08T18:18Z
- Sonda `$SCRATCH/c3/p2-specs.mjs` (md5 a894f4c26a895364d4a10fc1d1c32fd9) — varredura PRÓPRIA por `switch(kind)` escrita do texto da propriedade §15.1.2 (ImportDeclaration, ExportDeclaration c/ moduleSpecifier, ImportEquals c/ ExternalModuleReference, CallExpression ImportKeyword, CallExpression `require`; não-literal → marcador), não copiada do teste; allowlist extraída do teste por AST.
- `node p2-specs.mjs <wt> file scripts/bootstrap-platform-admin.ts tests/...test.ts` → ec=0: texto lido com 436 CR (cópia CRLF); preProcessFile N=6; varredura própria N=6 (todos ImportDeclaration); diags 0; pp == própria: true; própria == allowlist: true; pp∖própria = ∅; própria∖allowlist = ∅. Os 6: dotenv/config, @prisma/adapter-pg, @prisma/client, ../src/database/rls.js, ../src/modules/auth/repositories/local-auth-credential.repository.js, ../src/modules/auth/services/local-auth-credential.service.js. O `6` fixo do T1.7-guard (l.382) = 6 medido.
- Vermelho-controle da varredura própria: `node p2-specs.mjs <wt> control` (5 formas MF1-a…e em texto fabricado, multilinha com LF) → **found 5 de 5** (ImportDeclaration×3, ExportDeclaration, DynamicImport), diags 0. ACUSOU.
- Veredito parcial 1(b): VERDE.
- (correção de hora: as marcas "18:16Z"/"18:18Z" de 1(a)/1(b) foram estimadas; o relógio medido por `date -u` deu 18:12-18:14Z para esses passos. Daqui em diante, hora = `date -u`.)

### 1(c) MF1-a…g no script REAL — 2026-10-08T18:14:39Z–18:15:40Z
Protocolo: `$SCRATCH/c3/mut.mjs` (md5 3af5c1972842e8d86be3bcad13b40a10; âncora contada = 1, placeholders <CRLF> → CR LF, grava) + `$SCRATCH/c3/runmut.sh` (md5 8f674a608466d56d7f7f8ace3153598d; `cp` para `.pristino`, muta, `diff` contra o pristino, T1 inteiro `timeout 300 node --test --test-reporter=tap --import tsx tests/san3-09-bootstrap-platform-admin.test.ts`, restaura por `cp`, prova `git hash-object` = `git rev-parse d3eace58:<alvo>`). Âncora única: `} from "../src/modules/auth/services/local-auth-credential.service.js";` (contagem 1); injeção logo após, com EOL CRLF (o do arquivo). Specs em `$SCRATCH/c3/specs/MF1-*.json`; TAP em `$SCRATCH/c3/tap/MF1-*.tap`.

| id | forma injetada (EOL CRLF) | linhas mudadas | carga (casos listados) | T1 | casos vermelhos | mensagem do T1.7-guard | restauro |
|---|---|---|---|---|---|---|---|
| MF1-a | `import { randomUUID } from 'node:crypto';` (E) | 1 | 26/26 | 24/26 ec=1 | 24 T1.7-guard, 25 T1.7-mutação | `import fora da allowlist (CE-G1): "node:crypto"` | hash-object 4ebe9574… = blob |
| MF1-b | `import {` / `  randomUUID,` / `} from "node:crypto";` (C, 3 linhas) | 3 | 26/26 | 24/26 | 24, 25 | idem `"node:crypto"` | ok |
| MF1-c | `export { randomUUID } from "node:crypto";` (F) | 1 | 26/26 | 24/26 | 24, 25 | idem | ok |
| MF1-d | `await import("node:crypto");` (DYN) | 1 | 26/26 | 24/26 | 24, 25 | idem | ok |
| MF1-e | `import "node:crypto";` (efeito colateral) | 1 | 26/26 | 24/26 | 24, 25 | idem | ok |
| MF1-f | `const nome = "node:crypto";` / `await import(nome);` | 2 | 26/26 | 24/26 | 24, 25 | `import fora da allowlist (CE-G1): "<não-literal>"` | ok |
| MF1-g | `import "../src/modules/auth/index.js";` | 1 | 26/26 (o arquivo de teste CARREGOU: o env.ts não derruba a carga fora de produção) | 22/26 | 20 T1.5, 21 T1.5 M-2, 24 T1.7-guard, 25 T1.7-mutação | `import fora da allowlist (CE-G1): "../src/modules/auth/index.js"` | ok |

- T1.7-mutação (25) morre em todos pelo CONTROLE `deepEqual(collectModuleSpecifiers(script)…filter(!allow), [])` (l.396): o texto real injetado deixa de ter 0 violações — esperado (o teste de mutação lê o mesmo script).
- T1.5/T1.5 M-2 sob MF1-g: `1 !== 2` (exit 1 em vez de 2: o env.ts carregou e falhou em produção antes da trava) — o efeito de runtime é pego.
- **Observação MF1-g (fecho):** no T1.7-guard, a asserção do fecho (l.383-384) vem DEPOIS do laço da allowlist (l.373-378) e do `imports.length === 6` (l.382); sob MF1-g o caso morre pela allowlist e a asserção do fecho NÃO é alcançada. O "T1.7-fecho" da tabela do plano não é um caso separado: é a cauda do mesmo caso. A mordida própria do fecho é medida em 1(e) (fecho executado pelas funções do teste) e no item 3 (mutação transitiva, script e allowlist intocados).
- `git status --porcelain` = 0 depois de cada mutante.
- Veredito parcial 1(c): VERDE — as 7 formas deixam vermelho o caso que o plano nomeia, com a mensagem nomeando o intruso (ou `<não-literal>` em MF1-f), carga ok em todas.

### 1(d) diferencial preProcessFile × guard — 2026-10-08T18:20Z
- Para não reimplementar o verificador: `$SCRATCH/c3/p3-extract.mjs` (md5 a6283bf4a60ffdba4db0e40f7f8edbf2) extrai VERBATIM, por faixa de nó da AST, as declarações `IMPORT_ALLOWLIST` (l.317, 277 chars), `collectModuleSpecifiers` (l.326, 1788 chars) e `runtimeClosure` (l.353, 571 chars) do arquivo de teste do objeto e transpila (`ts.transpileModule`) para `$SCRATCH/c3/harness.mjs` (md5 4465a0e61a34f2dd7672524c3a681a65). O código executado é o do teste.
- `node p4-diff.mjs <wt> harness.mjs diff` (md5 be818c29d9e984e15e32456e8e92e6ee; injeção em memória, EOL CRLF) → ec=0:
  | id | guard N | preProcessFile N | pp∖guard | guard∖pp | violações |
  |---|---|---|---|---|---|
  | real | 6 | 6 | ∅ | ∅ | ∅ |
  | MF1-a…e (cada) | 7 | 7 | ∅ | ∅ | [node:crypto] |
  | MF1-f | 7 | 6 | ∅ | [<não-literal>] | [<não-literal>] |
- Sob MF1-f o `preProcessFile` NÃO vê o `import(nome)` (6 especificadores); o guard vê e rotula `<não-literal>`. O oráculo é `preProcessFile ⊆ guard` (l.380-381): o guard vê tudo o que o scanner vê, e mais.
- Veredito parcial 1(d): VERDE.

### 1(e) fecho de runtime: teste × executado — 2026-10-08T18:22Z
- Fecho do TESTE (função `runtimeClosure` extraída, `node p4-diff.mjs … closure`) no objeto: **7 arquivos** (o script + 6 de src: src/database/rls.ts, src/modules/auth/anonymous-login.constants.ts, …/repositories/local-auth-credential.repository.ts, …/services/local-auth-credential.service.ts, …/services/password.service.ts, …/types/auth.types.ts); env.ts ∉.
- Fecho EXECUTADO: gancho `module.register` (Node 20.19.5, sem dependência nova): `$SCRATCH/c3/hook.mjs` (md5 81120cb9ad9278084a4488a76b124259; resolve → nextResolve → appendFileSync(url)), `register.mjs` (md5 8b0bbc14e1707c6d2144511094cf115c), `probe-import.mjs` (md5 fb81156e75e4e48bb47f46859ecd17c0; importa o script por URL, argv[1] = probe → `main()` NÃO roda). Comando: `DATABASE_URL='postgresql://x:x@127.0.0.1:1/x' C3_HOOK_LOG=… C3_TARGET=<wt>/scripts/bootstrap-platform-admin.ts timeout 120 node --import tsx --import file:///$SCRATCH/c3/register.mjs $SCRATCH/c3/probe-import.mjs` → ec=0; arquivos de `<wt>/src/` resolvidos: **6**, env.ts: **0**.
  - Controle do gancho: probe que importa `known-a.mjs` → `known-b.mjs` → log com known-b = 1. ACUSOU.
- Comparação (real): teste-src 6 × executado 6 → exec∖teste = ∅, teste∖exec = ∅ (IGUAIS).
- Sob MF1-g (script mutado por mut.mjs, restaurado, hash-object = blob 4ebe9574…, status 0): fecho do teste = 54 (53 de src) com env.ts ∈; executado = 44 de src com env.ts ∈ (1). exec∖teste = ∅; teste∖exec = 9 (o teste sobre-aproxima: imports só de tipo que o esbuild/tsx apaga). Lado fechado.
- Vermelho-controle MF1-g: env.ts passa a ∈ NOS DOIS instrumentos. ACUSOU.
- Nome do caso: §15.1.2 item 3 diz "publica o tamanho do fecho no nome do caso"; o nome do T1.7-guard no objeto (l.369) é "T1.7 guard de imports (CE-G1): todos os imports de bootstrap-platform-admin.ts pertencem à allowlist" — SEM o tamanho (7). Achado C3c2-N1 (nota): a publicação prometida não existe; não enfraquece a asserção.
- Veredito parcial 1(e): VERDE, com a nota C3c2-N1.

### Item 1 — veredito: VERDE (nota C3c2-N1). Controles: MF1-g (env.ts nos dois fechos) ACUSOU; varredura própria 5/5 ACUSOU; gancho ACUSOU.

## Item 2 — C3-F2: matriz ramo × caso vermelho

### 2(a) ramos GERADOS da fonte — 2026-10-08T18:21Z
- Sonda `$SCRATCH/c3/p5-branches.mjs` (md5 ddf0b807530045cd2fdea4ce4dd5dccf): AST do arquivo de teste do objeto; dentro de `collectModuleSpecifiers` (inclui as arrows `literal`/`visit`) e `runtimeClosure`, enumera IfStatement, ConditionalExpression, BinaryExpression `&&`/`||`/`??`, encadeamento opcional `?.` e chamadas `assert.*`. Saída `$SCRATCH/c3/p5.out`.
- **N = 31** pontos de decisão: P1 l.328 assert parseDiagnostics · P2 l.331 ternário literal · P3 l.331 `||` (isStringLiteralLike ‖ isNoSubstitutionTemplateLiteral) · P4 l.333 if ImportDeclaration · P5 l.333 `&&` moduleSpecifier · P6–P8 l.335 `&&` de onlyNamedTypes (every isTypeOnly / length>0 / isNamedImports) · P9 l.335 `?.` clause?.namedBindings · P10 l.337 if runtime-import · P11 l.337 `||` !runtimeOnly · P12 l.337 `&&` !isTypeOnly && !onlyNamedTypes · P13 l.337 `?.` clause?.isTypeOnly · P14 l.339 if ExportDeclaration · P15 l.339 `&&` · P16 l.340 if runtime-export · P17 l.340 `||` · P18 l.342 if ImportEquals · P19–P20 l.342 `&&` · P21 l.343 if runtime-importEquals · P22 l.343 `||` · P23 l.345 if ImportKeyword · P24–P25 l.345 `&&` · P26 l.346 if require · P27–P29 l.346 `&&` · P30 l.356 if closure.has (memo) · P31 l.360 if !startsWith(".") continue.
- Pontos estruturais (não são decisão, mas o corpo nomeia: "recursar", "resolver .js→.ts"): S1 l.348 `ts.forEachChild(node, visit)` (recursão da AST) · S2 l.362 `visit(resolved)` (recursão do fecho) · S3 l.361 `specifier.replace(/\.js$/, ".ts")`.
- Vermelho-controle: a mesma sonda sobre uma cópia em memória com UM `else if (ts.isMetaProperty(node))` a mais → **N = 32** (N+1). ACUSOU.

### 2(b) MF2-a…f — 2026-10-08T18:22:10Z–18:22:37Z
Specs geradas por `$SCRATCH/c3/gen-specs2.mjs` (md5 c8c4fc8f36a850cd8840ca1da0c22f33); mesmo protocolo `runmut.sh` (âncora única, CRLF, T1 inteiro, restauro por cp + hash-object d57fb182… = blob do teste). Mensagem = 1ª linha do erro no TAP (`$SCRATCH/c3/msgs.sh`).

| id | transformação | carga | T1 | caso vermelho e mensagem | o plano esperava |
|---|---|---|---|---|---|
| MF2-a | if ExportDeclaration → `false && …` | 26/26 | 25/26 | 25 T1.7-mutação: `forma não detectada: export * from "node:crypto";` | T1.7-mutação (export…from) **e** o diferencial — o diferencial NÃO morre sozinho (só roda no script real, que não tem export-from); medido em combinação abaixo |
| MF2-b | if ImportKeyword → `false && …` | 26/26 | 25/26 | 25: `forma não detectada: await import("node:crypto");` | idem (diferencial idem) |
| MF2-c | `ts.forEachChild` só quando `node === source` | 26/26 | 25/26 | 25: `forma não detectada: await import("node:crypto");` (1ª forma que cai; a injeção dentro de função vem depois na lista) | T1.7-mutação |
| MF2-d | `: "<não-literal>"` → `: "@prisma/client"` (não-literal some das violações) | 26/26 | 25/26 | 25: `forma não detectada: const nome = "node:crypto"; await import(nome);` | T1.7-mutação (import(variavel)) |
| MF2-e | `return found.filter(s => s.startsWith("@prisma"))` (mutante V) | 26/26 | 24/26 | 24 T1.7-guard: `AST perdeu import visto pelo compilador: dotenv/config`; 25: `forma não detectada: import "node:crypto";` | T1.7-guard no script real |
| MF2-f | `visit(resolved)` → `closure.add(resolved)` (fecho de 1 nível, sem recursão) | 26/26 | **26/26 (sobrevive)** | — | (sozinho, nada esperado) |
| MF2-f + MF1-g | os dois | 26/26 | 22/26 | 20, 21 (T1.5: `1 !== 2`), 24 T1.7-guard: `import fora da allowlist (CE-G1): "../src/modules/auth/index.js"`, 25 | T1.7-**fecho** sob MF1-g |
| controle MF1-g sozinha | (de 1(c)) | 26/26 | 22/26 | 20, 21, 24 com a MESMA mensagem da allowlist, 25 | — |

- **MF2-f: o caso vermelho sob MF1-g é o mesmo, com a mesma mensagem, com e sem MF2-f.** A morte vem do laço da allowlist (l.373-378), que precede a asserção do fecho (l.383-384); o fecho nunca é avaliado sob MF1-g. Logo, nenhum caso morre POR CAUSA do enfraquecimento do fecho. A mordida própria do fecho (e a sobrevivência de MF2-f) é medida no item 2(c) com um cenário transitivo (script e allowlist intocados).
- Restauro: hash-object = blob em todos (teste d57fb182…, script 4ebe9574…); `git status --porcelain` = 0.

### 2(c) matriz completa ramo × caso vermelho — 2026-10-08T18:23:33Z–18:26:07Z
Mesmo protocolo (specs em `$SCRATCH/c3/specs/`, TAP em `$SCRATCH/c3/tap/`); restauro hash-object = blob em todos (teste d57fb182…, script 4ebe9574…, rls.ts f8bd0fae…); status 0 após cada um. Convenção: "enfraquecer" = o verificador passa a ver MENOS (condição → `false`, resultado → ignorar); para os `&&` de um mesmo `if`, tornar qualquer conjunto `false` é o mesmo mutante do `if` (P5, P15, P19-20, P24-25, P27-29 colapsam em B04, MF2-a, B18, MF2-b, B26). Trocar conjunto por `true` amplia (não enfraquece) e foi omitido.

| ponto | mutante | T1 | caso que morreu (1ª linha da mensagem) |
|---|---|---|---|
| P1 assert parseDiagnostics | B01: assert → `void 0` | **26/26 sobrevive** | — (nenhum caso alimenta texto não-parseável) |
| P2 ternário literal | B02: condição → `false` | 24/26 | 24 guard `import fora da allowlist (CE-G1): "<não-literal>"`; 25 |
| P2 (ramo não-literal) | MF2-d | 25/26 | 25 `forma não detectada: …await import(nome);` |
| P3 `||` operando direito | B03a: `… || false` | 26/26 sobrevive | — **mutante EQUIVALENTE**: `ts.isStringLiteralLike(<NoSubstitutionTemplateLiteral>)` = true (medido) — o operando é redundante |
| P3 operando esquerdo | B03b: `false || …` | 24/26 | 24 `"<não-literal>"`; 25 |
| P3 (variação) | B03c: `ts.isStringLiteral(node) || false` (template sem substituição vira `<não-literal>`) | **26/26 sobrevive** | — sobrevive PELA alternativa `|| violations.includes("<não-literal>")` (l.399). Meta-controle ASTRICT (asserção estrita: nomeia o intruso, `<não-literal>` só para a forma `(nome)`): no objeto 26/26 (o verificador intacto nomeia o intruso em toda forma literal) e com B03c 25/26, `forma não detectada: await import(\`node:crypto\`);`. Direção do mutante: lado FECHADO (literal rotulado não-literal reprova) |
| P4/P5 if ImportDeclaration | B04: `false && …` | 24/26 | 24 `nenhum import encontrado no script`; 25 `forma não detectada: import "node:crypto";` |
| P6 every isTypeOnly | B06: `every` → `some` | **26/26 sobrevive** | — (só afeta o fecho) |
| P7 length > 0 | B07: → `true` | **26/26 sobrevive** | — (só afeta o fecho) |
| P8/P9 `?.` clause | B09: `clause?.` → `clause.` | 24/26 | 24, 25 `Cannot read properties of undefined (reading 'namedBindings')` (quebra → lado fechado) |
| P10/P11 `!runtimeOnly ||` | B11: `false || …` (modo guard também ignora `import type`) | 26/26 sobrevive | — NÃO enfraquece a propriedade (import só de tipo não carrega módulo em runtime) |
| P12 filtro runtime import | B12: `!isTypeOnly && !onlyNamedTypes` → `false` (fecho ignora todo import estático) | **26/26 sobrevive** | — |
| P13 `?.` clause?.isTypeOnly | B13 | 25/26 | 24 `Cannot read properties of undefined (reading 'isTypeOnly')` (quebra → lado fechado) |
| P14/P15 ExportDeclaration | MF2-a | 25/26 | 25 `forma não detectada: export * from "node:crypto";` |
| P16/P17 filtro runtime export | B16: `!node.isTypeOnly` → `false` | **26/26 sobrevive** | — |
| P18-P20 ImportEquals | B18 | 25/26 | 25 `forma não detectada: import crypto = require("node:crypto");` |
| P21/P22 filtro runtime ImportEquals | B21 | **26/26 sobrevive** | — |
| P23-P25 ImportKeyword | MF2-b | 25/26 | 25 `forma não detectada: await import("node:crypto");` |
| P26-P29 require | B26 | 25/26 | 25 `forma não detectada: require("node:crypto");` |
| P30 memo closure.has | B30: `if (false) return;` | 26/26 sobrevive | — NÃO enfraquece (sem ciclo no fecho; com ciclo, recursão infinita → quebra → lado fechado) |
| P31 ignorar não-relativo | B31: `if (true) continue;` (fecho ignora todo especificador) | **26/26 sobrevive** | — |
| S1 recursão da AST | MF2-c | 25/26 | 25 `forma não detectada: await import("node:crypto");` |
| S2 recursão do fecho | MF2-f | **26/26 sobrevive**; com MF1-g, red idêntico ao controle MF1-g sozinha (allowlist) | — |
| S3 .js→.ts | S3: sem o `replace` | 25/26 | 24 `ENOENT … src\database\rls.js` (quebra → lado fechado) |
| (sem ramo) verificador inteiro | MF2-e (V) | 24/26 | 24 `AST perdeu import visto pelo compilador: dotenv/config`; 25 |

**O diferencial em combinação (o plano o nomeia para MF2-a/b):** MF2-a + MF1-c → 24 `AST perdeu import visto pelo compilador: node:crypto` e 25; MF2-b + MF1-d → 24 `AST perdeu import visto pelo compilador: node:crypto` e 25. O oráculo `preProcessFile` morde quando o script real carrega a forma que o ramo apagado deixou de ver. Sozinhos (script intacto), MF2-a/b só matam o 25 — o diferencial não tem o que comparar.

**A mordida do fecho e a sua cegueira (cenário transitivo TENV — script e allowlist intocados; `src/database/rls.ts` ganha `import { env } from "../config/env.js";` + `export const RLS_DEBUG = env.NODE_ENV === "development";`, CRLF, âncora única = import type de auth.types):**
| combinação | T1 | casos vermelhos |
|---|---|---|
| TENV sozinho | 23/26 | 20, 21 (T1.5 `1 !== 2`), **24 T1.7-guard `fecho carregou env.ts: …scripts\bootstrap-platform-admin.ts, …src\database\rls.ts, …`** |
| TENV + MF2-f | 24/26 | só 20, 21 (T1.5) — **T1.7-guard VERDE** |
| TENV + B12 | 24/26 | só 20, 21 — T1.7-guard verde |
| TENV + B31 | 24/26 | só 20, 21 — T1.7-guard verde |
- A asserção do fecho MORDE (TENV sozinho). Enfraquecida (MF2-f, B12, B31 — e, pela mesma forma, B06, B07, B16, B21), ela fica cega, e NENHUM caso da suíte acusa o enfraquecimento: o T1.7-mutação não exercita `runtimeClosure`, e o T1.7-guard só asserta `env.ts ∉ fecho` no script real, que já é verdade. O que resta é o T1.5 (processo filho com NODE_ENV=production, que carrega o env.ts e sai 1 ≠ 2) — que roda na CI: `npm test` = `node scripts/run-backend-tests.mjs`, sufixo `.test.ts` em `tests/` (l.63), job `backend` l.109 do ci.yml.
- **Critério que não pode falhar (contra a régua do plano):** a expectativa do §15.1.3 para MF2-f ("T1.7-fecho sob MF1-g") e a linha MF1-g ("T1.7-fecho (env.ts no fecho)") não discriminam: sob MF1-g o laço da allowlist (l.373-378) mata o caso antes da asserção do fecho (l.383-384); o controle MF1-g sozinha dá o mesmo caso, a mesma mensagem. Declarado antes do veredito.

**Achados do item 2:**
- **C3c2-A1 (ajuste, dentro-do-bloco):** o fecho de runtime pode ser enfraquecido (sem recursão, sem imports estáticos, ignorando todo especificador, filtro de tipos ampliado — 7 mutantes) e nenhum caso fica vermelho; a propriedade do §15.1.3 ("enfraquecer qualquer ramo do verificador deixa vermelho pelo menos um caso") não vale para `runtimeClosure` nem para os ramos `runtimeOnly`. Não é `bloqueia` porque a propriedade de PRODUTO (o script não carrega env.ts) segue guardada por execução: o T1.5 morre em TENV+MF2-f/B12/B31 e roda na CI.
- **C3c2-N2 (nota, dentro-do-bloco):** o ramo `parseDiagnostics` (P1) pode ser apagado e nenhum caso fica vermelho (nenhum caso alimenta texto não-parseável). Efeito limitado: script não-parseável derruba a carga do arquivo de teste (import l.15-23).
- **C3c2-N3 (nota, dentro-do-bloco):** a alternativa `|| violations.includes("<não-literal>")` (l.399) aceita, para forma literal, uma violação que não nomeia o especificador injetado (o §15.1.3 pede que nomeie): B03c sobrevive com ela e morre com a asserção estrita (ASTRICT). Medido: nenhum enfraquecimento do lado ABERTO sobrevive por causa dela (a troca só rotula literal como não-literal, que reprova). O operando `ts.isNoSubstitutionTemplateLiteral` (P3) é redundante (B03a equivalente).
- Veredito parcial item 2: AMARELO-VERDE — os ramos de detecção de forma (P2-P5, P14-P15, P18-P20, P23-P29, S1, S3, MF2-a…e) têm caso que morre; o fecho não (C3c2-A1, ajuste). Vermelho-controle: enumeração N+1 = 32 ACUSOU; MF2-e deixou o T1.7-guard vermelho no script real ACUSOU; TENV (mordida do fecho) ACUSOU.

## Item 3 — mutações NOVAS e escopo do dev

### 3(a) mutações novas — 2026-10-08T18:30:33Z–18:31:45Z
Novidade conferida contra: §15.1.1 (MF3-a…f), §15.1.2/§15.1.3 (MF1-a…g, MF2-a…f), §15.1.4 (MA1–MA6, MT-1), §15.1.5, §15.2 (M-1, M-2, 3a-1, 3b-2, C3-A1), ciclo 1 (`C3-evidencia.md`/`C3-voto.json`: mutantes A, B, C, D, E, F, DYN, V — todos formas de import) e `DEV-ciclo2-relatorio.md` (MA1–MA6, MF3-a…f, MF1-a). Nenhuma das abaixo está nessas listas; nenhuma é carga fora da AST (eval/vm/new Function/createRequire). Runner `$SCRATCH/c3/runmut2.sh` (md5 3a2c865ed48cbbb9faeee35c6f06684f = runmut.sh + A19 `timeout 300 npx tsc --noEmit --strict --module NodeNext --moduleResolution NodeNext --target ES2022 --esModuleInterop --skipLibCheck --types node scripts/bootstrap-platform-admin.ts` antes do restauro). Specs `$SCRATCH/c3/specs/{TENV,N2,N2c,N3,N4a,N4b,N5}.json`.

| id | alvo | transformação | por que é plausível | carga | A19 | T1 | caso que morreu |
|---|---|---|---|---|---|---|---|
| N1 (TENV) — verificador/fecho | `src/database/rls.ts` (folha da allowlist) | + `import { env } from "../config/env.js";` + `export const RLS_DEBUG = env.NODE_ENV === "development";` — script e allowlist INTOCADOS | o próximo mantenedor de rls.ts lê uma flag de config; é a forma transitiva que o allowlist do script não vê | 26/26 | ec=0 | 23/26 | **24 T1.7-guard `fecho carregou env.ts: …bootstrap-platform-admin.ts, …src\database\rls.ts, …`**; 20, 21 (T1.5 `1 !== 2`) — MORTO |
| N2 — verificador/allowlist | teste l.375 | predicado do guard `IMPORT_ALLOWLIST.has(imp)` → `… \|\| imp.startsWith("node:")` | "built-in do Node não alcança env.ts" — relaxar o guard em vez da allowlist para usar `node:crypto` | 26/26 | — | 26/26 (sozinho: relaxamento sem efeito, o script não muda) | — |
| N2 + MF1-a | teste + script | + `import { randomUUID } from 'node:crypto'` | o uso que motivaria N2 | 26/26 | ec=0 | 24/26 | 24 `esperava 6 especificadores no script real, recebeu 7`; 25 |
| N2 + N2c + MF1-a (a edição COMPLETA do mantenedor: relaxa, importa, `6` → `7`) | teste + script | idem + `assert.equal(imports.length, 7,` | idem | 26/26 | ec=0 | 25/26 | **25 T1.7-mutação** (controle `deepEqual(... .filter(!IMPORT_ALLOWLIST.has), [])` no script real, l.396) — o guard ficou verde, o teste de mutação o pegou — MORTO |
| N3 — flags | script `parseArgv` | + `if (argument === "--") break;` no início do laço (fim-de-opções POSIX) | convenção de CLI; torna todo token depois de `--` um no-op calado (a classe do C3-F3) | 26/26 | ec=0 | 25/26 | **9 T1.2b (98 variantes) `Missing expected exception.`** — MORTO |
| N4 — flags | script `parseArgv` | `const name = argument.split("=")[0];` e lookup por `name` (aceitar `--flag=valor`) | "aceitar a sintaxe `--dry-run=…`"; `--dry-run=false` passaria a LIGAR o dry-run | 26/26 | ec=0 | 25/26 | **9 T1.2b `Missing expected exception.`** — MORTO |
| N5 — verificador, forma NÃO enumerada | script | + `export type CryptoModule = typeof import("node:crypto");` (ImportTypeNode: não carrega módulo) | tipar algo pelo módulo | 26/26 | ec=0 | 25/26 | **24 T1.7-guard `AST perdeu import visto pelo compilador: node:crypto`** — o membro não previsto nasce NEGADO (pelo diferencial; falso positivo do lado fechado) |

- Restauro: hash-object = blob em todos (script 4ebe9574…, teste d57fb182…, rls.ts f8bd0fae…); `git status --porcelain` = 0 após cada um.
- Leitura: das 5 mutações novas (≥1 contra o verificador: N1, N2, N5; ≥1 contra as flags: N3, N4), TODAS morrem no cenário em que produzem efeito. N2 sozinho sobrevive como relaxamento sem efeito; a edição completa morre no T1.7-mutação — o predicado duplicado do teste de mutação (l.396/398) funciona como segunda checagem independente do script real.
- Veredito parcial 3(a): VERDE — nenhum mutante novo com efeito sobreviveu.

### 3(b) escopo do dev, por laço — 2026-10-08T18:32Z–18:35Z
- Sonda `$SCRATCH/c3/p6-scope.mjs` (md5 final ccde9015004a948c069e86208dd96eb3). **1ª execução saiu errada e foi descartada:** o findIndex de "**PERMITIDO" achou uma ocorrência anterior ao §15.3 (PERMITIDO = [], PROIBIDO = lixo de outra seção); corrigida para buscar depois de "### 15.3"; o erro foi visível na própria saída.
- **Listas extraídas por parse** do §15.3 do blob d3eace58 (bullets com caminho entre crases entre "**PERMITIDO" e "**PROIBIDO"; crases entre "**PROIBIDO" e "**Bateria"). PERMITIDO (7): scripts/bootstrap-platform-admin.ts (só BOOTSTRAP_FLAGS/parseArgv/BootstrapRefusalCode/exaustividade) · tests/san3-09-bootstrap-platform-admin.test.ts · tests/san3-09-bootstrap-platform-admin-db.test.ts · docs/deployment.md (só Runbook B) · agent-orchestration/controle/pendencias.md (entrada P-SAN-PROD-BOOTSTRAP + bloco "Pendências abertas por B-SAN3-09", 3b-1/3b-2/15.5) · agent-orchestration/docs/status-geral.md (linha P-SAN-PROD-BOOTSTRAP) · agent-orchestration/codex/log-execucao.md (apenso). PROIBIDO (21 regras): Kpis/** · src/** · prisma/** · migrations/** · infra/** · .github/** · fly.*.toml · .env* · package.json · package-lock.json · frontend/** · mobile/** · CLAUDE.md · AGENTS.md · .claude/** · .agents/** · scripts/** exceto o script do bloco · tests/ (qualquer outro) · docs/revisoes/** · agent-orchestration/omega/** · agent-orchestration/codex/comandos/**. Expansão: "x/**" = prefixo; ".env*" = (^|/).env; "fly.*.toml" = regex; "qualquer outro de tests/" = prefixo tests/ menos os 2 permitidos; "scripts/** exceto" = prefixo menos o script.
- **Integração da main:** `git log --merges 7812fe7c..d3eace58` = 0 merges; merge-base(origin/main, objeto) = 8ee10bd2; 357a98e9 não é ancestral (R-2 confirmada). A hipótese do corpo ("o ramo integrou a main por merge") está FALSIFICADA para o ciclo 2: nada do delta do ciclo veio da main.
- **Delta do bloco** `git diff --name-only origin/main...d3eace58` = 43 arquivos; fora de PERMITIDO ∪ ciclo 1 (`git diff --name-only 8ee10bd2...7812fe7c`, 30 arquivos; merge-base do 7812fe7c = 8ee10bd2) = 17: os 6 corpos jurado-san3-09c2-* (.claude/.agents), 00-inspetor-terreno-c2.md, 00-mandatos/{C1c2,C2c2,C3c2,inspetor-c2}.md, C1c2-{evidencia,voto}, C2c2-{evidencia,voto}, FABRICA-ciclo2-relatorio.md — todos do ORQUESTRADOR (commits a634b807, e1206447, 6319f11a, 07209295, e277bb6d, d3eace58) — e DEV-ciclo2-relatorio.md (dev).
- **Delta do ciclo 2 por commit** (`git log --format='%h %p | %an | %ad | %s' 7812fe7c..d3eace58` + `git diff-tree --name-status`): 53b2d817 plano §15 (planejador; docs/revisoes/**) · **1c520f1e "fix(admin): endurece bootstrap da plataforma" = o ÚNICO commit do dev** (12 arquivos) · fcfd1027, 054f7a7e (orquestrador: registro da queda, só DEV-ciclo2-relatorio.md) · a634b807, e1206447, 6319f11a, 07209295, e277bb6d, d3eace58 (orquestrador: corpos, mandatos, parecer, votos C1/C2). Autor git de todos: thiagodorgo (atribuição por commit e assunto, e pelo relatório do dev, que nomeia 1c520f1e como seu).
- **Laço (arquivos do dev, commit 1c520f1e):**
  | arquivo | entrada do PERMITIDO | PROIBIDO casado |
  |---|---|---|
  | scripts/bootstrap-platform-admin.ts | scripts/bootstrap-platform-admin.ts (hunks: da C2) | 0 |
  | tests/san3-09-bootstrap-platform-admin.test.ts | idem | 0 |
  | tests/san3-09-bootstrap-platform-admin-db.test.ts | idem | 0 |
  | docs/deployment.md | só Runbook B | 0 |
  | agent-orchestration/controle/pendencias.md | entrada + bloco | 0 |
  | agent-orchestration/docs/status-geral.md | linha P-SAN-PROD-BOOTSTRAP | 0 |
  | agent-orchestration/codex/log-execucao.md | apenso | 0 |
  | Kpis/app.js, kpis-history.json, kpis-history.md, kpis-latest.json | (tocados no ciclo 1) | Kpis/** ×4 — ver D-C2-1 |
  | agent-orchestration/omega/juntas/votos/B-SAN3-09/DEV-ciclo2-relatorio.md | — | agent-orchestration/omega/** ×1 — ver abaixo |
- **Hunks por região** (`git diff -U0 53b2d817 1c520f1e` + numstat): docs/deployment.md +5/−0, hunk l.196-200; Runbook B no arquivo do commit = l.168 ("#### Runbook B") até l.204 (próximo "### " em l.205) → DENTRO. pendencias.md +30/−8: hunks l.578, 580, 584 → dentro da entrada "## P-SAN-PROD-BOOTSTRAP" (l.574-588); l.592, 596, 603, 610 + novas l.612-632 → dentro do bloco "### Pendências abertas por B-SAN3-09" (l.589-632); l.2591-2592 → nota "piso de 12 só no bootstrap" dentro de P-O6R-B01-TROCA-SENHA (l.2588), FORA do bloco mas exatamente a nota que o §15.5 manda o dev abrir ("nota em P-O6R-B01-TROCA-SENHA (2f-2)") e que o PERMITIDO cita como "(… 15.5)" → DENTRO pela referência. As 8 linhas removidas são substituições de campos (acao/status/descricao/dono) que o 3b-1/3b-2 manda corrigir — nenhuma linha histórica apagada sem substituta. status-geral.md +1/−1: l.4937, a linha "- **P-SAN-PROD-BOOTSTRAP:**" → DENTRO (nada do #407: o ramo não integrou a main). log-execucao.md +5/−0 (4802 → 4807 linhas, apenso no fim) → DENTRO.
- **Kpis/** (D-C2-1):** `git diff --name-only origin/main...d3eace58 -- Kpis/` = vazio; `git diff --name-only d3eace58 origin/main -- Kpis/` = vazio. Árvores `git rev-parse <r>:Kpis`: 4ec5b46c39fedb458b2a6c67f432a1a4331fe3c0 em 1c520f1e, d3eace58, 8ee10bd2, 357a98e9 e origin/main c8af6458; b8f620d222a6999bf4dc60e8df601dcc2a9422bc em 7812fe7c/53b2d817 (a recontagem do ciclo 1). O commit que tocou Kpis no ciclo 2 é 1c520f1e (dev) e o conteúdo é EXATAMENTE o da main (árvore idêntica). Leitura aplicada: a **decisão do orquestrador sobre a D-C2-1** (fim do §15, registrada no plano como divergência §A2) MANDA o dev devolver Kpis/* à origin/main; ela prevalece sobre o literal "Kpis/** PROIBIDO", que impedia o dev de DECIDIR a D-C2-1, não de executar a decisão. Desvio de forma: a decisão diz "num commit próprio" e a restauração veio no MESMO commit do código (1c520f1e) → **C3c2-N5 (nota)**.
- **DEV-ciclo2-relatorio.md:** criado pelo dev em 1c520f1e (A), depois apensado pelo orquestrador em fcfd1027/054f7a7e. Literal: agent-orchestration/omega/** é PROIBIDO ao dev "(do orquestrador)". Mas a bateria do §15.3 item 8 exige as mutações "publicadas no relatório do dev", sem nomear caminho, e o precedente do ciclo 1 é votos/B-SAN3-09/DEV-relatorio.md. O mandato do dev do ciclo 2 não está versionado (00-mandatos/dev.md é do ciclo 1, commit 32025930 de 2026-10-01; sob o §C7 item 8(3) o dev nasce de prompt simples) → não consigo provar se o prompt nomeava a saída. → **C3c2-N4 (nota)**: divergência entre o PROIBIDO literal e a exigência de relatório da própria bateria; registro, sem efeito em produto.
- `git diff --check origin/main...d3eace58` → ec=2, 6 ocorrências de "trailing whitespace" (quebra de linha Markdown de dois espaços): 4 em agent-orchestration/codex/comandos/B-SAN3-09-bootstrap-platform-admin.md (criado no ciclo 1, d7e857d1, 2026-10-01) e 2 em DEV-ciclo2-relatorio.md (dev, l.3-4). Zero em produto/teste → **C3c2-N6 (nota)** (a bateria 9 do §15.3 pede `git diff --check`).
- `git grep -n -E 'CREATE ROLE|DROP ROLE|ALTER ROLE|GRANT|REVOKE|OWNER TO' d3eace58 -- 'tests/san3-09-*'` = 0.
- **Vermelho-controle (os três):** (1) laço com src/app.ts injetado como "tocado pelo dev" → {"permitido":"—","proibido":["src/**"],"violaDev":true} ACUSOU; (2) `-- Kpis/` vazio × irmão `-- scripts/` = scripts/bootstrap-platform-admin.ts (não-vazio) ACUSOU; (3) árvores de Kpis num par que difere: 7812fe7c (b8f620d2) × main (4ec5b46c), `git diff --name-only 8ee10bd2 7812fe7c -- Kpis/` = 4 arquivos ACUSOU.
- Veredito parcial 3(b): VERDE — o dev ficou em PERMITIDO ∪ ciclo 1 em todo arquivo de produto/teste/registro, hunks nas regiões; os dois casamentos no PROIBIDO são Kpis/* (execução da D-C2-1, conteúdo = main) e o relatório do dev (exigido pela bateria) — notas N4/N5.

### Item 3 — veredito: VERDE (notas N4, N5, N6). 5 mutações novas (≥3), todas mortas onde têm efeito.

## Fim — re-resolução, CI e limpeza (2026-10-08T18:36:58Z–18:38Z)
- Objeto no fim: `git ls-remote` (ramo e refs/pull/400/head) = `gh pr view 400 headRefOid` = d3eace58240cac15062ee8f46c6e7f418711671a — NÃO andou. origin/main no fim (após fetch) = c8af64580cb85ddf4960fecb2f8604384f8f0328 — não andou.
- Check-runs no objeto d3eace58 (gh api …/check-runs?per_page=100, filtro: conclusion != success = não-verde; status != completed = pendente): **total 7 · não-verdes 0 · pendentes 0** (backend, backend-postgres, frontend, owner-portal, authority-portal, flutter, docker — todos completed/success). Às 18:09Z estavam 4 in_progress; concluíram durante a medição.
- Antes da remoção: w-j9c2c3 com `git status --porcelain` = 0 e hash-object = blob em scripts/bootstrap-platform-admin.ts, tests/san3-09-bootstrap-platform-admin.test.ts e src/database/rls.ts (todos os alvos que mutei). Processos com "w-j9c2c3" na linha de comando (Get-CimInstance) = 0. `git worktree remove --force C:/Users/AMP/w-j9c2c3` → ec=0; `test -e` → removido; `git worktree list | grep -c w-j9c2c3` = 0; disco C: 11G → 12G livres.
- Containers: NENHUM criado (`docker ps -a --filter name=j9c2c3` = 0); base viva erp-postgres/erp-redis nunca tocada; volumes órfãos alheios (R-5) não tocados; nenhum container dev05c2-* tocado.
- $SCRATCH/c3 (sondas, specs, pristinos, TAP; 1,9 MB) e meus 3 arquivos soltos (checkruns.json, npmci.log, prisma.log) apagados; o resto do scratchpad é de outros e não foi tocado.
- w-nuv09: `git status --porcelain` = só os meus dois arquivos `??` (C3c2-evidencia.md, C3c2-voto.json) + os 30 ` M .agents/**` fantasmas de stat-cache já reportados pelo inspetor (`git diff --ignore-cr-at-eol --name-only` = 0). Não commitei.
- Leitura de outras cadeiras: NÃO abri C1c2-* nem C2c2-* (só vi os nomes no `git diff --name-only` do delta). Li do ciclo 1/trilha: corpo, mandato C3c2, parecer 00-inspetor-terreno-c2.md, plano §15, DEV-ciclo2-relatorio.md (cabeçalho e linhas de mutação, por grep), C3-voto.json/C3-evidencia.md do ciclo 1 (só por grep de nomes de mutantes, para a novidade).

## Veredito: APROVADO
Nenhum achado `bloqueia`. Achados: C3c2-A1 (ajuste — o fecho de runtime não tem caso que morra quando enfraquecido; a propriedade de produto segue guardada pelo T1.5, que roda na CI) e notas C3c2-N1 (tamanho do fecho fora do nome do caso), N2 (parseDiagnostics sem caso), N3 (alternativa `<não-literal>` no teste de mutação), N4 (relatório do dev em omega/**), N5 (Kpis restaurado no mesmo commit do código), N6 (`git diff --check` com 6 quebras Markdown em registro). Critérios do plano que não podiam falhar: "T1.7-fecho sob MF1-g" (MF2-f e linha MF1-g) e "diferencial" para MF2-a/b sozinhos — declarados, e medidos por cenário que discrimina (TENV; MF2-a+MF1-c; MF2-b+MF1-d).
