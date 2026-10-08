papel: C1 | identidade: jurado-san3-09c2-c1-entrada-e-registro | modelo: Claude Opus 5.5 (claude-opus-5-5) (substituição §C7.6-bis: o frontmatter diz fable; D-FABLE-ASTRA-SO-DINHEIRO, decisão do dono de 2026-10-08 — Fable só em bloco que toca dinheiro; este não toca) | mandato_md5: 5ffd55c53c19ed3f56ac663e10efd15e (declarado no disparo: 5ffd55c53c19ed3f56ac663e10efd15e) | corpo_md5: a5829fc8cbccfe480187d19a64006e50 (recebido no prompt: n/a — lançada como general-purpose SEM o corpo no prompt; li o corpo do blob por `git -C C:/Users/AMP/w-nuv09 show HEAD:.claude/agents/especialistas/jurado-san3-09c2-c1-entrada-e-registro.md`, HEAD=07209295, e o md5 EOL-neutro bateu com o declarado no disparo)

# Evidência — cadeira C1 da junta 2 do B-SAN3-09 (PR 400)

- objeto: 07209295af1c4cd36bd223366d025505a6ab91ef (git ls-remote origin refs/heads/feat/bootstrap-platform-admin = gh pr view 400 headRefOid; OPEN, draft, CONFLICTING) — 2026-10-08T16:55Z
- origin/main no início: c8af64580cb85ddf4960fecb2f8604384f8f0328 · merge-base(origin/main, objeto) = 8ee10bd2e44d95206551b71351f23d901192cbb6
- SCRATCH: C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/c1c2
- node v20.19.5 · Python 3.13.14 · `df -h /c` → 13G livres de 238G (95%)
- ambiente: Git Bash (MINGW64) via ferramenta Bash; ferramentas usadas: Read, Grep, Glob, Bash (autorrestrição do disparo); MSYS_NO_PATHCONV NÃO exportada; variáveis definidas só por comando.
- leitura: corpo (538 linhas) e mandato C1c2.md lidos inteiros do blob; parecer 00-inspetor-terreno-c2.md lido inteiro.

## 0. Legalidade (antes do mérito) — 2026-10-08T16:58Z

- `git diff --name-only 6319f11a 07209295` (cerca do mandato → objeto) → 3 arquivos: `00-mandatos/C1c2.md`, `C2c2.md`, `C3c2.md` — **só registro**. `git log 6319f11a..07209295` = 1 commit (07209295 chore(junta): mandatos…).
- objeto julgado pelo inspetor = e1206447; delta e1206447→07209295 = parecer do inspetor + 3 mandatos (`git log`: 6319f11a docs(registro) parecer; 07209295 mandatos) — só registro.
- parecer `00-inspetor-terreno-c2.md` (instância inspetor-de-terreno-da-junta, junta 2, gravado 17:24Z): **LIBERADO COM RESSALVA** (R-1..R-6 + nota de restauro do dev). Confere o meu nome (C1 `jurado-san3-09c2-c1-entrada-e-registro`), o meu corpo (a5829fc8… = o que medi), worktree e container próprios (nomeou w-j09c2a; o meu mandato fixa w-j9c2c1, que o inspetor mediu livre em 2.a; prefixo de container: o disparo fixa `j9c2c1-`).
- check-runs no objeto 07209295 (`gh api …/commits/07209295…/check-runs?per_page=100` → checkruns.json): total=6 | não-verdes=0 | pendentes=4 (flutter, backend, frontend, backend-postgres in_progress; authority-portal, owner-portal success). Filtro: não-verde = completed com conclusion ∉ {success, skipped, neutral}; pendente = status ≠ completed. **A re-medir no fim.** Na cerca 6319f11a: total=7, 7/7 completed/success. Árvore de produto 6319f11a = 07209295 (delta só registro).
- obituário (`OBITUARIO-IDENTIDADES.md`, 301 linhas, em 07209295 e origin/main): `grep -ic jurado-san3-09c2-c1` = 0 / 0. Não sou SEPULTADA nem RESERVADA. Meu nome não está na lista de inelegíveis do corpo.
- normas citadas, em `origin/main:CLAUDE.md` (grep -c): D-MEDIR-NA-REF-ALVO 1 · `## A2` 1 · allowlist 1 · `## C5` 1 · `1-bis.` 1 · `1-ter.` 1 · `4-bis.` 1 · `6-bis.` 1 · `P7 — Pausa` 1 · D-GOV-PROPORCIONAL 3 · "Teto de 2 ciclos" 2 · "KPI congelado" 2 · D-JUNTA-ESCOPO-E-CALIBRACAO 1 · D-PAUSA-GRAVA-E-PARA 2. Em `origin/main:agent-orchestration/controle/decisoes.md`: D-FABLE-ASTRA-SO-DINHEIRO 1 · D-393-ESTACIONADO 1 · D-GOV-PROPORCIONAL 3. `git ls-tree -r --name-only origin/main -- scripts/ | grep -c mandato` = 0 (os scripts de mandato não estão na ref; a saída colada no mandato é dado).
- R-2 confirmada: merge-base = 8ee10bd2; a norma que rege é a do CLAUDE.md da origin/main (§C7 item 8: teto 2 ciclos, KPI congelado). Diffs de bloco three-dot.
- Quórum que vale: unanimidade de 3 com veto (§C7 item 8(1): segurança/permissão); ciclo 2 de 2.
- Veredito parcial: **legalidade OK** — LIBERADO COM RESSALVA vale para o objeto 07209295 (delta só registro). Pendência de terreno: CI do objeto em andamento (re-medir no fim).

## Terreno — 2026-10-08T17:05Z

- worktree `C:/Users/AMP/w-j9c2c1`: `git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios worktree add --detach C:/Users/AMP/w-j9c2c1 07209295…` → `test -e …/.git` OK, HEAD 07209295, `status --porcelain` = 0, core.autocrlf=true.
- `timeout 900 npm ci --no-audit --no-fund` → ec=0 (326 pacotes); `fsutil reparsepoint query node_modules` → "não é um ponto de nova análise" (sem junction).
- `DATABASE_URL='postgresql://x:x@127.0.0.1:1/x' timeout 300 npx prisma generate` → ec=0 (URL fictícia só no comando).
- disco depois do npm ci: 12G livres (96%).
- blobs no objeto (`git cat-file blob 07209295:<f> | md5sum`, LF): script 995022e1efb3a896e007ccf68ba38fd8 · T1 407100f6336fcfc07095285b30782ac1 · T2 928d7d294ddfbd6c99d8c4feecb56e92 · package-lock 69a6ea326087249d7aa03896859513f8. `git hash-object scripts/bootstrap-platform-admin.ts` = `git rev-parse HEAD:scripts/…` = 4ebe9574cb3696802199498c6620f849b651158c.

## Item 1 — C3-F3

### 1(a) Baseline — 2026-10-08T17:08Z
- A19: `timeout 300 npx tsc --noEmit --strict --module NodeNext --moduleResolution NodeNext --target ES2022 --esModuleInterop --skipLibCheck --types node scripts/bootstrap-platform-admin.ts > a19-base.log 2>&1; ec=$?` → **ec=0**, log 0 bytes.
- T1: `timeout 300 node --test --import tsx tests/san3-09-bootstrap-platform-admin.test.ts > t1-base.log 2>&1; ec=$?` → **ec=0 · tests 26 | pass 26 | fail 0 | cancelled 0 | skipped 0**. Pelo nome no TAP: `ok 9 - T1.2b conjunto fechado: 98 variantes desconhecidas são recusadas sem eco` · `ok 20 - T1.5 processo filho: NODE_ENV=production sem opt-in …` · `ok 21 - T1.5 M-2: ALLOW_PROD_SEED=1 não abre bootstrap em produção` · `ok 22 - T1.5c argumento desconhecido …` · `ok 23 - T1.6 processo filho: --password=x …` · `ok 26 - T1.8 doc-guard Runbook B …`.
- Leitura no blob (worktree = blob, hash-object provado): `BOOTSTRAP_FLAGS` scripts/bootstrap-platform-admin.ts:111-115 (3 chaves: --dry-run, --password-stdin, --reset-password; `as const satisfies Record<string, keyof BootstrapFlags>`); exaustividade :117-119 (`MissingBootstrapFlag = Exclude<keyof BootstrapFlags, …>`; `const BOOTSTRAP_FLAGS_ARE_EXHAUSTIVE: MissingBootstrapFlag extends never ? true : never = true`); `parseArgv` :121-143 — por token: 1º `=== "--password" || startsWith("--password=")` → PASSWORD_IN_ARGV (:128-133); 2º `!Object.hasOwn(BOOTSTRAP_FLAGS, argument)` → UNKNOWN_ARGUMENT com mensagem `Argumento não reconhecido na posição ${index + 1}. Aceitos: --dry-run, --password-stdin, --reset-password. Nada foi feito.` (:134-139) — a mensagem interpola só a posição.
- `main()` :384; **:385 `const flags = parseArgv(process.argv.slice(2));` é a 1ª linha**; depois :387 `isBootstrapAllowed()`, :394 `process.env.DATABASE_URL`, :399 `readStdinFirstLine()`, :402 `new PrismaClient(...)`. Provado.
- Nota de leitura (gravidade minha no fim): a :41 `import "dotenv/config";` roda no carregamento do módulo, ANTES de `main()` — o `.env` do cwd (se existir) é lido para `process.env` antes da recusa. Nenhuma linha depois usa env antes do parseArgv; a classe "`.env` do operador" é reprovação por construção pelo §15.4 (pré-existente, `prisma/seed-guard.ts`). Registro como nota, não cobro.
- Veredito parcial 1(a): **VERDE** (A19 ec=0; T1 26/26; parseArgv é a 1ª linha de main()).

> errata de hora: as horas '17:05Z' e '17:08Z' dos dois cabeçalhos acima foram estimadas; o relógio (date -u) marcou 17:01:10Z no 1º mutante. Daqui em diante a hora vem de `date -u`.

### 1(b) Tabela gerada × fonte — 2026-10-08T17:01:48Z
- Sonda `$SCRATCH/sonda-tabela.mts` (md5 91227e05ac9f6097ac9de9b93df65b89; texto no scratch, apagado no fim — resumo: importa `BOOTSTRAP_FLAGS`, `parseArgv`, `BootstrapRefused` do MEU worktree por `pathToFileURL`; gera pela MINHA leitura do §15.1.1 l.1611-1613 — apagar cada caractere; trocar a caixa de cada letra; `-`↔`_` um de cada vez; um traço só (`-` + nome); sem traços; `=true`/`=1`/`=false`; + as 10 fixas; remove as conhecidas; extrai o texto de `unknownArgumentVariants` do arquivo de teste para uma CÓPIA em `$SCRATCH/copia-unknownArgumentVariants.mts` e a avalia; para cada token chama `parseArgv([token])` e compara a mensagem com o TEMPLATE fixo `Argumento não reconhecido na posição 1. Aceitos: --dry-run, --password-stdin, --reset-password. Nada foi feito.`).
- Comando: `WT_ROOT=C:/Users/AMP/w-j9c2c1 SCRATCH=$S timeout 120 node --import tsx $S/sonda-tabela.mts > sonda-tabela.out 2>&1; ec=$?` (cwd = worktree) → **ec=0**.
- **N_seu = 98 · N_teste = 98** (= `ok 9 - T1.2b … 98 variantes`) · **diferença simétrica = ∅** (onlyMine=[], onlyTest=[]).
- códigos: **UNKNOWN_ARGUMENT 98/98**; nenhum ACEITO, nenhum PASSWORD_IN_ARGV (nenhuma variante de distância 1 começa com `--password=` nem é `--password`).
- eco: mensagem **= TEMPLATE exato em 98/98** (nenhuma interpola o token). O `msg.includes(token)` literal dá 12 positivos — todos substrings do texto fixo da mensagem (`-dry-run`, `--dry-ru`, `dry-run`, `-password-stdin`, `--password-stdi`, `password-stdin`, `-reset-password`, `--reset-passwor`, `reset-password`, `-p`, `--`, ` --dry-run`) — logo não é eco, é a lista de aceitos.
- **N_eco (onde a checagem de eco do TESTE roda) = 84 de 98.** Excluídos 14: 4 por `len<3` (`-n`, `-p`, `--`, `""` — e `-p`/`--` também estão no texto fixo) e 10 por "substring de flag conhecida" (`-dry-run`, `--dry-ru`, `dry-run`, `-password-stdin`, `--password-stdi`, `password-stdin`, `-reset-password`, `--reset-passwor`, `reset-password`, ` --dry-run` [trim]). Razão: a mensagem de recusa lista as flags aceitas, então substring de flag aparece nela por construção. (conferido: 4 + 10 = 14; `-p` conta em len<3.)
- Leitura (gravidade no fim): o §15.1.1 diz "a mensagem não contém o token (tokens de 3+ caracteres)"; ao pé da letra esse critério **não pode passar** com a mensagem que o próprio §15.1.1 item 2 prescreve (ela contém `dry-run`, `password-stdin`, `reset-password`…). O teste reconciliou estreitando para "3+ e não substring de flag". A minha checagem por TEMPLATE exato cobre 98/98 e passa. → achado contra a RÉGUA (nota), não contra o produto.
- **"N cresce com a fonte"** (runmut.sh NCRESCE, md5 runmut 56bee438…, mut.mjs 1a0fdcdc…): âncora `  "--reset-password": "resetPassword",` (ocorrências=1, EOL CRLF) → acrescida `  "--simular": "dryRun",` (diff 1 linha, `114a115`); A19 ec=0 (carga provada); T1 ec=0, 26/26, **`ok 9 - T1.2b conjunto fechado: 119 variantes …`** → N 98 → **119** (+21 = variantes únicas de `--simular`); a asserção `>= 3 × |BOOTSTRAP_FLAGS|` passa a 3×4=12 (calculada da fonte). Restore por `cp` → `git hash-object` = blob 4ebe9574… **OK**.
- Vermelho-controle: (1) a minha comparação de listas aplicada a uma cópia da lista do teste SEM ` --dry-run` → acusou exatamente `[" --dry-run"]` ✔; (2) checagem de eco sobre mensagem fabricada que contém o token → acusou ✔ (o controle com mutante real é o MF3-c, abaixo); (3) N cresce ✔.
- Veredito parcial 1(b): **VERDE** (conjunto fechado gerado da fonte, 98=98, diferença ∅, 98/98 UNKNOWN_ARGUMENT com mensagem fixa, N acompanha a fonte). Nota contra a régua: literal "tokens de 3+" impossível com a mensagem prescrita.

### 1(c) MF3 — parcial a–c — 2026-10-08T17:05:04Z
Protocolo: `bash $S/runmut.sh <id> scripts/bootstrap-platform-admin.ts t1 <âncora> <substituição>` (runmut.sh md5 f2b7f290…; mut.mjs 1a0fdcdc… exige 1 ocorrência e converte `\n`→EOL do arquivo): `cp` → `.pristino`; muta por `node`; `diff` não-vazio publicado; A19 (prova de carga/compilação); T1 inteiro; restore por `cp`; `git hash-object` = `git rev-parse HEAD:<f>`.

| id | diff (linhas) | A19 | T1 | casos vermelhos (mensagem) | restore |
|---|---|---|---|---|---|
| MF3-a (`throw UNKNOWN_ARGUMENT` → `continue`) | 5 (`135,138c135`) | ec=0 | ec=1 · 26/24/2 | `not ok 9` T1.2b (`Missing expected exception.`) · `not ok 22` T1.5c (stderr `RECUSADO (DATABASE_URL_MISSING): DATABASE_URL é obrigatório.`) | hash-object = blob 4ebe9574 ✔ |
| MF3-b (`!Object.hasOwn(BOOTSTRAP_FLAGS, argument)` → `!(argument in BOOTSTRAP_FLAGS)`) | 2 (`134c134`) | ec=0 | ec=1 · 26/25/1 | só `not ok 9` T1.2b (`Missing expected exception.`). Sonda-tabela sob o mutante: ACEITOS = `constructor`, `toString`, `__proto__`, `hasOwnProperty` (4), UNKNOWN 94 | ✔ |
| MF3-b′ (sem parênteses: `!argument in BOOTSTRAP_FLAGS`) | 2 | **ec=2** `TS2322 Type 'boolean' is not assignable to type 'string \| number \| symbol'` (134,9) | ec=1 · 26/24/2 | `not ok 9` T1.2b · `not ok 22` T1.5c | ✔ |
| MF3-c (mensagem interpola `(${argument})`) | 2 (`137c137`) | ec=0 | ec=1 · 26/25/1 | só `not ok 9` T1.2b (`mensagem ecoou token: --dryrun`); **T1.5c verde** | ✔ |

- **Divergência MF3-b (medida):** com a mutação PRETENDIDA (parênteses) o T1.5c fica **verde** — só o T1.2b morre, pelas 4 propriedades herdadas, como o plano diz. O 24/26 com T1.5c que o dev relatou reproduz-se exatamente com `!argument in …` (sem parênteses): `!argument` vira booleano, `false in BOOTSTRAP_FLAGS` é falso, nada é recusado — e esse mutante nem compila (A19 ec=2). O relatório do dev não publica o diff do MF3-b, então a causa é inferida pela coincidência medida (hipótese forte, não prova).
- **Divergência MF3-c (medida):** o T1.5c **não pode** acusar eco do sentinela sob MF3-c. Leitura: tests/san3-09-bootstrap-platform-admin.test.ts:280 roda `["-p", secret]` — `-p` na posição 1 é recusado (índice 0) e o loop nunca alcança o sentinela (posição 2). Execução sob MF3-c (processo real, `env -i PATH SYSTEMROOT`, stdin /dev/null, `timeout 60`, padrão do grep por arquivo `-F -f`): `-p <sent>` → ec=2 UNKNOWN_ARGUMENT, sentinela **0**; `--dry-run <sent>` → ec=2 UNKNOWN_ARGUMENT, sentinela **1**; `--password-stdin <sent>` → ec=2 UNKNOWN_ARGUMENT, sentinela **1**. Restore ✔. ⇒ o sentinela do T1.5c está numa posição que a recusa nunca alcança: **critério que não pode falhar** para o MF3-c (o MF3-c morre, mas só pelo T1.2b). Controle do meu `grep` do sentinela: acusou 1 nas duas execuções com eco real ✔.
- **Mutação NOVA (minha) MF3-c2 — eco só na posição ≥ 2** (`${index > 0 ? \` (${argument})\` : ""}`): diff 2 linhas; A19 ec=0; **T1 ec=0, 26/26 — SOBREVIVE**; restore ✔. T1.2b chama `parseArgv([token])` (sempre índice 0) e o T1.5c recusa no índice 0; nenhum caso do T1 põe um token desconhecido depois de uma flag aceita — que é justamente o formato do vazamento realista (`--password-stdin <senha>`, medido acima ecoando sob MF3-c). T2.4b (`--password-stdin --dryrun`, db:311-315) só asserta `/UNKNOWN_ARGUMENT/`, sem checagem de eco (a medir no container).

### 1(c) MF3 — d–f — 2026-10-08T17:07:01Z
| id | diff | A19 | T1 | vermelho (mensagem) | restore |
|---|---|---|---|---|---|
| MF3-d (`for (const [index, rawArgument] …) { const argument = rawArgument.toLowerCase();`) | 2 (`127c127`) | ec=0 | ec=1 · 26/25/1 | só `not ok 9` T1.2b (`Missing expected exception.` — variante de caixa aceita) | ✔ 4ebe9574 |
| MF3-e (`parseArgv` movido para depois do `DATABASE_URL_MISSING`) | 3 (`385,386d384` / `397a396`) | ec=0 | ec=1 · 26/24/2 | `not ok 22` T1.5c (`RECUSADO (DATABASE_URL_MISSING)`) · `not ok 23` T1.6 (`stderr não contém PASSWORD_IN_ARGV: … DATABASE_URL_MISSING`) | ✔ |
| **MF3-e2 (minha, nova): `parseArgv` movido para logo DEPOIS da trava e ANTES do `DATABASE_URL`** | 3 (`385,386d384` / `392a391`) | ec=0 | **ec=0 · 26/26/0 — SOBREVIVE** | nenhum: os casos de processo com argumento (T1.5c, T1.6) rodam sem `NODE_ENV=production`, e os de produção (T1.5, T1.5 M-2) rodam sem argumento | ✔ |
| MF3-f (campo `readonly verbose: boolean;` em `BootstrapFlags`, sem flag) | 1 (`108a109`) | **ec=2**: `(119,7) TS2322 Type 'true' is not assignable to type 'never'` ← linha do `BOOTSTRAP_FLAGS_ARE_EXHAUSTIVE`; `(123,9) TS2741 Property 'verbose' is missing …` ← o inicializador `flags` de `parseArgv` | — | — | ✔ |
| MF3-f + tipo de exaustividade removido | 4 | **ec=2** só `(122,9) TS2741` | — | o vermelho persiste pelo inicializador de `parseArgv`, não pelo tipo | ✔ |
| MF3-f + `verbose: false` no inicializador | 2 | **ec=2** só `(119,7) TS2322` (o tipo de exaustividade) | — | — | ✔ |
| MF3-f + inicializador + tipo removido | 5 | **ec=0** (verde) | — | sem o tipo, campo sem flag compila | ✔ |

- **Divergência MF3-f (medida):** a A19 vermelha do MF3-f, como o plano a define, tem DOIS diagnósticos; tirando o tipo de exaustividade ela continua vermelha (TS2741 do inicializador). Logo o vermelho do MF3-f não prova sozinho o tipo; a cadeia completa prova: com o inicializador atualizado, só o TS2322 do tipo morde, e sem ele a A19 fica verde. A propriedade do §15.1.1 item 1 ("campo novo sem flag quebra o tsc") é sustentada pelo tipo de exaustividade — provado pelo par (inicializado ⇒ ec=2 só TS2322; inicializado sem tipo ⇒ ec=0).
- **Divergência MF3-e (medida):** o plano nomeia só o T1.5c; medi T1.5c **e** T1.6 vermelhos (24/26), igual ao dev. Morte a mais, não a menos.
- **MF3-e2 (nova):** o critério "parseArgv é a 1ª linha de main() — antes da trava" (§15.1.1 item 3) não tem caso que o acuse: movê-lo para depois da trava deixa T1 26/26. Efeito medido no produto real (não no mutante): hoje a ordem está certa (:385). Sob o mutante, com `NODE_ENV=production` sem opt-in, um argumento desconhecido sairia `PRODUCTION_OPT_IN_MISSING` (exit 2) — ainda recusa, sem conexão nem escrita; só a leitura de `NODE_ENV`/`ALLOW_PROD_BOOTSTRAP` precede a recusa.
- MF3-e2 medido por processo (2026-10-08T17:07:24Z): `env -i PATH SYSTEMROOT NODE_ENV=production timeout 60 node --import tsx scripts/bootstrap-platform-admin.ts --dryrun` — sob o mutante: ec=2 `RECUSADO (PRODUCTION_OPT_IN_MISSING)`; no objeto (restore OK, hash-object = blob): ec=2 `RECUSADO (UNKNOWN_ARGUMENT)`. Confirma: ordem certa no objeto; o mutante só troca o código da recusa.
- Veredito parcial 1(c): MF3-a…f **todos mortos** (a: T1.2b+T1.5c; b: T1.2b; c: T1.2b; d: T1.2b; e: T1.5c+T1.6; f: A19 TS2322+TS2741), por motivo certo (carga provada: A19 ec=0 nos mutantes a–e; MF3-f é mutante de tipo). Achados de cobertura (gravidade no fim): (i) T1.5c não pode acusar MF3-c (sentinela atrás de um token já recusado); (ii) mutação nova MF3-c2 (eco só na posição ≥2, o formato `--password-stdin <senha>`) SOBREVIVE ao T1 26/26; (iii) mutação nova MF3-e2 (parseArgv depois da trava) SOBREVIVE ao T1 26/26.

### 1(d) T1.5c e T2.4b — 2026-10-08T17:13:08Z
- Container próprio (prefixo do disparo `j9c2c1-`): `docker network create j9c2c1-net`; `j9c2c1-pg` (`postgres:16`, `-e POSTGRES_PASSWORD` SEM valor — senha aleatória de 16 bytes lida do ambiente do comando, guardada só em `$SCRATCH/pgpw.secret`, apagada no fim; `POSTGRES_DB=erp_j9c2c1`); `j9c2c1-redis` (`redis:7`); `j9c2c1-node` (`erp-junta-node20-pg16:local` — node v20.20.2, psql 16.14 — `--init`, `--entrypoint sleep … infinity`). **Nenhuma porta publicada** (`docker ps`: só `5432/tcp`, `6379/tcp` internos). Base viva `erp-postgres`/`erp-redis` Exited, não tocada.
- Árvore: `git -c core.autocrlf=false archive 07209295 | docker exec -i j9c2c1-node sh -c 'mkdir -p /work && cd /work && tar -x'` → ec=0. md5 dentro = blob (LF): script 995022e1… IGUAL · T1 407100f6… IGUAL · T2 928d7d29… IGUAL · package-lock 69a6ea32… IGUAL.
- `docker exec j9c2c1-node sh -c 'cd /work && npm ci --no-audit --no-fund'` → ec=0; `prisma generate` (URL fictícia em `-e`) → ec=0. (1ª tentativa com `-w /work` deu ec=128 "Cwd must be an absolute path" — conversão do MSYS; refeito com `sh -c 'cd /work …'`.)
- **T2 baseline** (`-e DATABASE_URL -e REDIS_URL -e CORE_SAAS_PERSISTENCE`, valores só no ambiente do comando): 17:09:22Z→17:10:24Z, **ec=0 · tests 12 | pass 12 | fail 0** (1 pai + 11 subtestes); `ok 5 - T2.4b --dryrun desconhecido: exit 2 UNKNOWN_ARGUMENT e 0/0/0/0/0`; `ok 10 - T2.9 …`. Senha do cluster na saída: 0.
- **T1.5c**: `ok 22` no T1 do 1(a) (Windows).
- **T2.4b sob MF3-a** (cmut.sh md5 919cb812…; mutação na CÓPIA de dentro do container, LF, âncora 1 ocorrência, diff 5 linhas): **ec=1 · 12/10/2** — `not ok 5 - T2.4b …` (`expected: 2`, `actual: 0` — o processo APLICOU) + o pai. Restore: md5 /work = blob 995022e1 ✔. Senha na saída: 0.
- **T2 sob MF3-c2 (minha, eco na posição ≥2)**: **ec=0 · 12/12 — SOBREVIVE também ao T2** (o T2.4b roda `--password-stdin --dryrun`, com o token desconhecido na posição 2, mas só asserta `/UNKNOWN_ARGUMENT/`). Restore ✔.
- Veredito parcial 1(d): **VERDE** (T1.5c ok; T2.4b ok e vermelho sob MF3-a pelo motivo certo). O achado de cobertura MF3-c2 fica confirmado em T1+T2.

### 1(e) Efeito no banco por processo real — 2026-10-08T17:14:47Z
- Sonda `/tmp/c1/efeito.sh` no container (md5 cffcb2379d82bc074e5c44aa2cb534e9, igual dentro e fora): `PGPASSWORD` e `SENHA` só por `-e NOME` (valor no ambiente do comando, nunca em argv do host); a senha do admin entra por `printf '%s\n' "$SENHA" |` (builtin do `sh`) no `--password-stdin`; contagem por **psql como superusuário** (ignora RLS) em `tenants WHERE slug='platform'` / `users` / `user_role_assignments` / `local_auth_credentials` / `audit_logs`, mais a lista de e-mails — nunca pela saída do script.
- Base `j9_base`: `CREATE DATABASE` → `prisma migrate deploy` ec=0 (**107 migrations found**) → `npm run db:provision-rbac` ec=0 → **0/0/0/0/0**. Cada passo num clone `CREATE DATABASE … TEMPLATE j9_base`.
- **Passo 1** (clone `j9_c1`, 0/0/0/0/0): e-mail ERRADO `errado-c1c2@example.com`, `--password-stdin --dryrun` → **ec=2**, `RECUSADO (UNKNOWN_ARGUMENT): Argumento não reconhecido na posição 2. …Nada foi feito.` → **0/0/0/0/0**, emails=[].
- **Passo 2** (mesmo clone): e-mail CERTO `--password-stdin --dry-run` → **ec=0**, "simulação encerrada — nada foi escrito no banco." → **0/0/0/0/0**; e-mail CERTO `--password-stdin` (aplicar) → **ec=0**, "CONVERGIDO — 1 organização de sistema, 1 administrador de plataforma." → **1/1/1/1/1**, emails=[certo-c1c2@example.com]. Clone não envenenado.
- **Passo 3 — vermelho-controle** (clone novo `j9_c2`): script do ciclo 1 (`git cat-file blob 7812fe7c:scripts/bootstrap-platform-admin.ts` → `/work/scripts/zz-c1c2-ciclo1.ts`, md5 a5f5383dfbbabde9a63205bd40f64782 = blob) com `--password-stdin --dryrun` e o e-mail errado → **ec=0, "modo: aplicar", CONVERGIDO → 1/1/1/1/1, emails=[errado-c1c2@example.com]** — a contagem VIU a escrita. Em seguida o e-mail certo é recusado `ADDITIONAL_ADMIN_REFUSED` (ec=2) tanto pelo script do ciclo 1 quanto pelo do objeto — o envenenamento do C3-F3 reproduzido; no objeto ele não acontece (passo 1). Sonda `zz-c1c2-ciclo1.ts` removida (`ls /work/scripts/zz-*` = 0).
- Segredo nas 6 saídas: senha do admin 0 · `postgres(ql)://` 0 · senha do cluster 0. Controles do grep (saídas fabricadas que contêm cada um): 1 / 1 / 1 ✔.
- Veredito parcial 1(e): **VERDE** — `--dryrun` não grava (0 nas 5 tabelas), o e-mail certo converge depois; controle do ciclo 1 gravou.

### Item 1 — veredito parcial (todas as 5 sub-medições)
VERDE no produto: conjunto fechado gerado da fonte (98, N acompanha a fonte), recusa sem eco (template fixo 98/98), parseArgv 1ª linha de main(), MF3-a…f mortos, T2.4b, efeito no banco nulo com controle. Achados de COBERTURA/RÉGUA para o voto: T1.5c não pode acusar MF3-c; MF3-c2 (eco na posição ≥2) sobrevive a T1 e T2; MF3-e2 (parseArgv depois da trava) sobrevive ao T1; literal "3+ caracteres" do §15.1.1 impossível com a mensagem prescrita.

## Item 2 — segredo e trava

### 2(a) M-1 — o hash lido do banco — 2026-10-08T17:17:48Z
- Leitura do T2.9 no blob (tests/san3-09-bootstrap-platform-admin-db.test.ts, worktree = blob 928d7d29…): :580 nome do caso; :612-620 1ª execução (PLATFORM_ADMIN_PASSWORD no env); :622-628 2ª execução; **:633 `storedHash = (await drillT29Client.localAuthCredential.findFirst({ select: { password_hash: true } }))?.password_hash`** — lido do banco DEPOIS da 2ª execução; :634 `assert.ok(storedHash, …)`; :635 `sensitiveSegments = storedHash.split("$").filter((segment) => segment.length >= 16)`; :655-660 para 1ª/2ª/prod: `!combined.includes(ADMIN_PASSWORD)`, `!combined.includes(storedHash)`, cada segmento ≥16, `assert.doesNotMatch(combined, /postgres(ql)?:\/\//)`. (O hash real tem prefixo `scrypt$v=1` — :201.)
- Literal `$scrypt-v1$`: `git grep -c 'scrypt-v1\$' 07209295 -- tests/san3-09-bootstrap-platform-admin-db.test.ts` → **0** (sem saída); irmão em `7812fe7c` → **1**. Saiu.
- Repositório: `src/modules/auth/repositories/local-auth-credential.repository.ts:76-86` `findByUserForTenant` devolve a linha inteira ("intentionally returns password_hash").
- Âncora M-1 `const existingCredential = await credentials.findByUserForTenant(` no /work do container: **1** ocorrência (script :313).
- **Controle da mutação ANTES do T2.9** (sonda `/tmp/c1/m1ctl.sh`, md5 1453aea7…; clone novo de `j9_base`, 2 execuções com `PLATFORM_ADMIN_PASSWORD` no env, hash lido por psql e comparado por `grep -c -F`, sem imprimir o hash): mutante (diff `313a314 > console.log(JSON.stringify(existingCredential));`) → exec 1 ec=0, exec 2 ec=0; hash gravado comprimento 150, prefixo `scrypt$v=1`; **hash inteiro na saída 1; segmento ≥16 #1 (len 29) 1; #2 (len 93) 1** — o mutante IMPRIME segredo. Objeto (restaurado, md5 995022e1 = blob) → hash 0, segmentos 0/0, senha 0, URL 0.
- **T2 sob M-1** (cmut.sh): ec=1 · 12/10/2 — `not ok 10 - T2.9 …` com `error: 'T2.9-2ª: hash inteiro não deve aparecer em stdout/stderr'` — vermelho na **2ª execução** (a 1ª imprime `null`), pela asserção do hash inteiro. Restore md5 = blob ✔.
- **Variante minha (só o último segmento do hash)**: `if (existingCredential) console.log(String(existingCredential.password_hash).split("$").pop());` → ec=1 · 12/10/2 — `not ok 10 T2.9` com `error: 'T2.9-2ª: segmento sensível do hash vazou'` — a guarda de segmento morde sozinha. Restore ✔.
- Veredito parcial 2(a): **VERDE** — M-1 corrigido; controle da mutação acusou.
- Errata de linhas do 2(a) (re-medidas por `grep -n` no blob): `res1` :613 · `res2` :623 · **`storedHash` :634** (não :633) · `assert.ok(storedHash)` :635 · **`sensitiveSegments` :636** · `resProd` :638 · laço das 3 saídas :656-661 (`doesNotMatch /postgres(ql)?:\/\//` :661). Conteúdo idêntico ao descrito.

### 2(b) M-2 — o opt-in independente — 2026-10-08T17:18:48Z
- Leitura: tests/san3-09-bootstrap-platform-admin.test.ts:264-270 — `spawnSync(node, ["--import","tsx/esm", SCRIPT], { env: { NODE_ENV: "production", ALLOW_PROD_SEED: "1", PATH } })` → `assert.equal(result.status, 2)` **e** `assert.match(result.stderr, /PRODUCTION_OPT_IN_MISSING/)`. O código discrimina (o mutante também sai 2).
- Âncora `  if (!isBootstrapAllowed()) {` → 1 ocorrência (script :387). Mutação M-2 (§15.2): `if (!isBootstrapAllowed({ ...process.env, ALLOW_PROD_BOOTSTRAP: process.env.ALLOW_PROD_SEED ?? process.env.ALLOW_PROD_BOOTSTRAP })) {` (diff 2 linhas, `387c387`); A19 ec=0 (carga).
- T1 sob M-2: **ec=1 · 26/25/1 — só `not ok 21 - T1.5 M-2: ALLOW_PROD_SEED=1 não abre bootstrap em produção`**, mensagem `The input did not match the regular expression /PRODUCTION_OPT_IN_MISSING/. Input: '[bootstrap-platform-admin] RECUSADO (DATABASE_URL_MISSING): …'`. **`ok 4 - T1.1/A2 … ALLOW_PROD_SEED=1 NÃO libera …` VERDE sob o mesmo mutante** (o unitário chama `isBootstrapAllowed(envLike)` direto, não passa pela chamada de `main()`) — vermelho-controle: o unitário não discrimina, o processo sim. `ok 20` T1.5 (sem opt-in) também verde. Restore: hash-object = blob 4ebe9574 ✔.
- Processo à mão (`env -i PATH SYSTEMROOT NODE_ENV=production ALLOW_PROD_SEED=1`, sem DATABASE_URL, `timeout 60`): sob o mutante → **ec=2 `RECUSADO (DATABASE_URL_MISSING)`** (a trava ABRIU com ALLOW_PROD_SEED); no objeto (restaurado) → **ec=2 `RECUSADO (PRODUCTION_OPT_IN_MISSING)`**; no objeto com `ALLOW_PROD_BOOTSTRAP=1` → ec=2 `DATABASE_URL_MISSING` (a trava abre só pela variável própria).
- Veredito parcial 2(b): **VERDE** — `ALLOW_PROD_SEED` não abre a trava; M-2 morto pelo caso de processo com o código certo.

### 2(c) Eco do token e o `ps` de uma execução real — 2026-10-08T17:21:11Z
- Sentinela gerada na hora: `sentinela-c1c2-<16 hex>` (31 caracteres), guardada só em `$SCRATCH/sent.pat`; o `grep` recebe o padrão por arquivo (`grep -c -F -f sent.pat`), nunca em argv. Cada execução: `env -i PATH SYSTEMROOT`, stdin `/dev/null`, `timeout 60`, saída para arquivo, `ec` por variável.

**Eco do token — Windows, worktree próprio, sem DATABASE_URL:**

| execução | exit | código | sentinela em stdout+stderr |
|---|---|---|---|
| `-p <sent>` | 2 | UNKNOWN_ARGUMENT | 0 |
| `--dry-run <sent>` | 2 | UNKNOWN_ARGUMENT | 0 |
| `<sent>` sozinho | 2 | UNKNOWN_ARGUMENT | 0 |
| `--password=<sent>` | 2 | PASSWORD_IN_ARGV | 0 |
| `--dryrun` com `PLATFORM_ADMIN_PASSWORD=<sent>` no env | 2 | UNKNOWN_ARGUMENT | 0 |
| (extra) `--password-stdin <sent>` | 2 | UNKNOWN_ARGUMENT | 0 |

Controle do grep: saída fabricada com a sentinela → **1** ✔.

**As mesmas 5 no container, com DATABASE_URL real** (sonda `/tmp/c1/eco-db.sh`, md5 023e2606…; clone `j9_eco` de `j9_base`; `PLATFORM_ADMIN_EMAIL`/`PLATFORM_ADMIN_PASSWORD` válidos no env para que só o argv decida): 5/5 ec=2 (UNKNOWN_ARGUMENT ×4, PASSWORD_IN_ARGV ×1), sentinela 0, URL 0; **5 tabelas depois 0/0/0/0/0**; clone derrubado.

**O `ps` (tabela de processos do host)** — sonda `$SCRATCH/amostra-ps.ps1` (md5 02d40f04…) via `C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe -NoProfile -File …`, alvo por `$env:ALVO` (nunca no argv do powershell), laço `Get-CimInstance Win32_Process -Filter "Name='node.exe'"` com `CommandLine.Contains(alvo)` durante `DUR` s; orquestrado por `$SCRATCH/ps-run.sh` (md5 af15afe4…), que espera a 1ª amostra antes de lançar o comando e mede a vida do processo (`date +%s.%N` antes/depois). Horas da sonda em hora local (UTC−3).
- **Controle positivo** (`node -e "setTimeout(()=>{},6000)" <token-proposital>`): vida ≈ 6,12 s · 62 amostras · **37 hits** · 1 PID · linha `C:\nvm4w\nodejs\node.exe -e setTimeout(()=>{},6000) <ALVO>` ✔.
- **Controle negativo** (token nunca posto em argv): vida ≈ 6,11 s · 65 amostras · **0 hits** ✔.
- **Execução real `bootstrap -p <sentinela>`, 3 vezes:** ec=2 UNKNOWN_ARGUMENT, sentinela 0 na saída, e na tabela de processos: #1 vida ≈ 0,45 s · 55 amostras · **3 hits**; #2 ≈ 0,46 s · 54 · **3 hits**; #3 ≈ 0,42 s · 51 · **2 hits** — sempre 1 PID, linha `C:\nvm4w\nodejs\node.exe --import tsx scripts/bootstrap-platform-admin.ts -p <ALVO>`.
- O que isso significa: o script recusa sem eco e sem efeito (nada lido do banco, nada conectado, nada escrito — medido acima), mas enquanto o processo vive (≈ 0,4–0,5 s no Windows, incluindo a carga do tsx) o argv — com a "senha" digitada depois de `-p` — é visível a quem lê a tabela de processos do host. É propriedade do sistema operacional, não do script; o próprio script (:30-31) e o T1.6 já declaram "argv é visível em `ps`". Cobrar invisibilidade é reprovação por construção (corpo); registro como **nota**: a janela de exposição de um erro de digitação `-p <senha>` é ≈ 0,45 s, não zero.
- Veredito parcial 2(c): **VERDE** — sentinela 0 em todas as saídas (11 execuções), recusa antes de conectar (0 linhas), `ps` medido com controles.

### Item 2 — veredito parcial
VERDE: M-1 (hash lido do banco; controle de mutação imprime hash; T2.9 vermelho na 2ª), M-2 (ALLOW_PROD_SEED não abre; caso de processo discrimina pelo código, unitário não), eco 0, `ps` medido (argv visível ≈ 0,45 s — nota).

## Item 3 — registro e runbook

### 3(a) As instâncias do 3b-1, regeneradas — 2026-10-08T17:24:44Z
- `git grep -n P-SAN-PROD-BOOTSTRAP 7812fe7c -- pendencias.md status-geral.md log-execucao.md` → **3 linhas** com o ID literal: `pendencias.md:574` (cabeçalho da entrada), `status-geral.md:4937`, `log-execucao.md:4802`. As outras 3 instâncias do §15.1.5 (pendencias :578, :580, :584) **não contêm o ID** — só aparecem lendo o BLOCO da entrada (`git show 7812fe7c:…pendencias.md | sed -n 570,592p`). Logo "5 instâncias" = 2 por `git grep` + 3 por parse do bloco; confere com o plano por leitura.
- No objeto: `git diff --name-only origin/main...07209295` = **39 arquivos**; `git grep -n P-SAN-PROD-BOOTSTRAP 07209295 -- <os 39>` = **53 linhas** em 15 arquivos (plano 20; corpos C1 8+8 e C3 2+2 nos 2 espelhos; votos/ata/relatórios do ciclo 1 e do ciclo 2: 8; `log-execucao.md` 2; `pendencias.md` 1; `status-geral.md` 1; script 1).

| instância | antes (7812fe7c) | classe antes | depois (07209295) | classe depois |
|---|---|---|---|---|
| pendencias :578 `acao` | "rodado one-shot com `ALLOW_PROD_SEED=1` inline" | manda o opt-in errado | "one-shot com `NODE_ENV=production ALLOW_PROD_BOOTSTRAP=1` inline" | neutra (opt-in certo) |
| pendencias :580 `status` | "Pós-merge: D2 (CI verde) e D3 (porteiro pós-merge) devem confirmar o fechamento" | agenda o fechamento | "fecha só com a execução em produção, ato do dono (§11 Ato 1); nem CI nem porteiro a fecham. D2: `ALLOW_PROD_BOOTSTRAP` ≠ `ALLOW_PROD_SEED` … D3: o papel `super_admin` e as concessões são do CD …" | **nega** |
| pendencias :584 `agendamento` | "fechamento confirmado pelo porteiro pós-merge" | fecha (afirma) | "o fechamento depende exclusivamente do ato do dono em produção (§11 Ato 1)" | neutra (regra certa) |
| status-geral :4937 | "confirmação pelo porteiro pós-merge após o merge" | agenda | "fecha somente com a execução em produção, ato do dono (§11 Ato 1); nem CI nem porteiro a fecham." | **nega** |
| log-execucao :4802 | "Próximos: junta do PR, porteiro pós-merge, confirmação de P-SAN-PROD-BOOTSTRAP" | agenda | **idêntica** (linha histórica do ciclo 1, não reescrita — §A2) | histórica, superada |
| log-execucao :4806 (nova) | — | — | apenso "## 2026-10-08 — B-SAN3-09 — ciclo 2": "permanece em andamento: fecha somente após a execução em produção, ato do dono (§11 Ato 1); nem CI nem porteiro a fecham." | **nega** |
| script :1 | (cabeçalho) | neutra | "// B-SAN3-09 (P-SAN-PROD-BOOTSTRAP, item 43 do PLANO_SAN3) …" | neutra |
| plano, corpos, ata, votos/relatórios (48 linhas = 20 + 20 + 8) | — | — | descrevem o defeito do ciclo 1 ou a régua | meta (não são registro de estado) |

- Busca complementar nas linhas `+` de `comandos/B-SAN3-09-…md`, `docs/deployment.md` e dos 3 registros por `porteiro|fechamento|fecha |CI verde|ALLOW_PROD_SEED` → 7 linhas, todas acima classificadas (4802 histórica; 4806, 4937, :580 negam; :584 neutra; 2 linhas que dizem `ALLOW_PROD_BOOTSTRAP` independente de `ALLOW_PROD_SEED`). O arquivo de comando não tem nenhuma.
- Veredito parcial 3(a): **VERDE pela propriedade** — nenhuma instância fecha ou agenda o fechamento antes do ato do dono; a única linha que agenda (4802) é histórica, preservada por §A2 e superada por apenso datado no mesmo arquivo; o opt-in errado saiu.

### 3(b) O critério (i)/(ii), por script, e a mutação — 2026-10-08T17:25:24Z
- Verificador `$SCRATCH/verif-registro.py` (md5 final 480826ba281a5028f8ee72acb9e8801a; a 1ª versão ccc55c0d… tinha um erro MEU — conferia o opt-in em TODAS as `acao` do bloco da regra A, inclusive as das 6 pendências `P-SAN3-09-*`, e deu VERMELHO falso; corrigido para a `acao` da própria entrada, a 1ª do bloco). Lê os arquivos do DISCO do worktree (= blob, hash-object provado) e `git diff -U0 <merge-base 8ee10bd2> --` (worktree × merge-base = three-dot com o objeto). Mostrador `show-verif.py`. Execução: `PYTHONIOENCODING=utf-8 timeout 120 python verif-registro.py C:/Users/AMP/w-j9c2c1 8ee10bd2… > verif-base.json; ec=$?` → ec=0.
- **Regra de delimitação, publicada:** **A** (a do plano §15.1.5: de `## P-SAN-PROD-BOOTSTRAP` ao próximo `^#{1,2} `) → linhas **574–632** (N=59) — inclui `---`, `### Pendências abertas por B-SAN3-09` e as 6 `#### P-SAN3-09-*`, porque `###`/`####` são, pela hierarquia do Markdown, subníveis do `##`; **B** (a entrada termina no primeiro cabeçalho de qualquer nível ou no `---`) → **574–586** (N=13). Publico as duas: a A é a régua literal; a B é o que, lido, é a entrada.
- **(i) literal** (contém "ato do dono" ∧ não casa `-iE 'porteiro|CI verde|ALLOW_PROD_SEED=1'`): "ato do dono" ×2 nas duas regras; **casa 1 linha nas duas — :580 `status: … nem CI nem porteiro a fecham.`** → **(i) literal FALHA**, e falha com o texto que o próprio remédio do §15.1.5 prescreve ("nem CI nem porteiro a fecham" no `status`), sem a exceção da negação que o (ii) tem. **Critério que não pode passar** com o texto prescrito.
- **(i) propriedade** (mesma regra, retirando só a frase que nega, lida): **passa** nas regras A e B; `acao` da entrada com `NODE_ENV=production ALLOW_PROD_BOOTSTRAP=1` ✔.
- **(ii) literal** (linhas `+` que citam o ID e casam `-iE 'porteiro|fechamento confirmado|confirmar o fechamento|CI verde'`): 52 linhas `+` citam o ID; **11 casam** → literal FALHA. Classificadas uma a uma por leitura: **2 negam** (log :4806, status-geral :4937 — sem a frase que nega, não casam); **1 histórica** (log :4802 "Próximos: junta do PR, porteiro pós-merge, confirmação de P-SAN-PROD-BOOTSTRAP" — o §15.1.5 manda NÃO reescrever e apensar; logo o (ii) literal também não pode passar com o remédio do plano); **8 meta** (plano ×3, corpo C1 ×2 espelhos, ata J-B-SAN3-09 ×1, C1-evidencia ×1, C1-voto ×1 — citam o defeito do ciclo 1 ou a régua); **0 não classificadas** → (ii) propriedade **passa**. Opt-in `ALLOW_PROD_SEED=1` em linha `+` de registro (fora de meta): 0.
- **VEREDITO do verificador no objeto: VERDE (propriedade)**; literal (i) e (ii): VERMELHOS por construção da régua.
- **Mutações** (`runmut-reg.sh` md5 67549261…; protocolo restaurável; âncora 1 ocorrência, EOL CRLF; restore `cp` + hash-object = blob):

| mutação | diff | verificador | o que acusou | restore |
|---|---|---|---|---|
| MR-1 `pendencias.md` :584 — "…ato do dono em produção (§11 Ato 1); **fechamento confirmado pelo porteiro pós-merge**.</sub>" | 2 (`584c584`) | **VERMELHO** | (i) propriedade: `prop: 584: <sub>balde C …` nas regras A e B | hash-object 31ce54ad = blob ✔ |
| MR-2 `status-geral.md` :4937 — acrescida "Fechamento confirmado pelo porteiro pós-merge." DEPOIS da frase que nega | 2 (`4937c4937`) | **VERMELHO** | (ii) `NAO_CLASSIFICADA 1` (a linha 4937 mutada) | d8563478 = blob ✔ |
| MR-3 `log-execucao.md` :4806 — idem no apenso | 2 (`4806c4806`) | **VERMELHO** | (ii) `NAO_CLASSIFICADA 1: … nem CI nem porteiro a fecham. Fechamento confirmado pelo porteiro pós-merge.` | d43b02b7 = blob ✔ |
| MR-4 `pendencias.md` :578 — `ALLOW_PROD_BOOTSTRAP=1` → `ALLOW_PROD_SEED=1` na `acao` | 2 (`578c578`) | **VERMELHO** | (i) `prop: 578: - acao: … ALLOW_PROD_SEED=1` e `acao [False]` | 31ce54ad = blob ✔ |

  As mutações MR-2/MR-3 mantêm a frase que nega na mesma linha (inserção, não troca) — o verificador ainda acusa, porque tira só a frase que nega e lê o resto.
- Resíduo do terreno (meu): as execuções `env -i` (sem TEMP/TMP) fizeram o tsx criar `C:/Users/AMP/w-j9c2c1/undefined/temp/tsx-AMP/…` (cache); `git status --porcelain` = `?? undefined/`. Nenhum arquivo rastreado tocado; sai com o worktree.
- Veredito parcial 3(b): **VERDE pela propriedade** (nenhum artefato fecha ou agenda antes do ato do dono; opt-in certo; 4/4 mutações acusadas). **Achado contra a RÉGUA** (§C7.4 pergunta (a)): o critério literal (i) e o literal (ii) do §15.1.5 **não podem passar** com o texto que o próprio §15.1.5 prescreve — (i) não tem a exceção da negação e o `status` prescrito contém "porteiro"; (ii) colide com a linha histórica 4802 que o plano manda preservar, e, lido "toda linha adicionada pelo PR", também com o próprio plano e os corpos que citam o defeito. Não é defeito do registro.

### 3(c) 3b-2 — as pendências e os donos — 2026-10-08T17:29:54Z
- Verificador `$SCRATCH/verif-pend.py` (md5 10c04765f14bee9c041fd238b84b7a70): bloco `### Pendências abertas por B-SAN3-09` (do cabeçalho até o próximo `^#{1,3} `) → linhas **589–632**, **6 entradas** `####`; campos por parse; donos esperados (§15.2 + §15.5); "a nomear" em qualquer linha da entrada; existência do dono no plano da rodada `PLANO_SAN3.md` (blob 07209295 = origin/main, md5 71d21684… nos dois) por parse — linhas de tabela do §5 cuja 1ª célula é `` `B-…` `` (**39 blocos**) e a fila pós-gate do §7.3 (9 blocos). Execução: ec=0.

| ID | dono | esperado | confere | "a nomear" | dono é linha do §5 | dono no §7.3 |
|---|---|---|---|---|---|---|
| P-SAN3-09-ORG-PLATAFORMA-NO-CONSOLE | B-SAN3-06b | B-SAN3-06b | ✔ | não | ✔ | — |
| P-SAN3-09-ENV-EXAMPLE-BOOTSTRAP | B-SAN3-10 | B-SAN3-10 | ✔ | não | ✔ | — |
| P-SAN3-09-SCRIPTS-FORA-DO-TSCONFIG | B-ARNES-2 | B-ARNES-2 | ✔ | não | **✘** | ✔ (fila pós-gate) |
| P-SAN3-09-ROTEIRO-DE-OPERACAO | B-SAN3-10 | B-SAN3-10 | ✔ | não | ✔ | — |
| P-SAN3-09-DB-TEST-SO-LINUX | B-ARNES-2 | B-ARNES-2 | ✔ | não | **✘** | ✔ |
| P-SAN3-09-FALHOU-SEM-CAUSA | B-SAN3-10 | B-SAN3-10 | ✔ | não | ✔ | — |

- Nota 2f-2 em `P-O6R-B01-TROCA-SENHA` (pendencias :2588-2592): "Nota B-SAN3-09: o piso de 12 caracteres vale somente para o bootstrap; a troca de senha pela aplicação mantém o piso de 8." ✔ (linhas `+` 75-76 do diff).
- `B-ARNES-2` não é linha do §5 (aparece no §5 só como destino dentro da linha do `B-SAN3-05`, PLANO_SAN3:253 "→ `B-ARNES-2`") e é bloco nomeado da **fila pós-gate §7.3** (PLANO_SAN3:405). O dono existe no plano da rodada, fora do gate. → nota.
- **ORG-PLATAFORMA lida inteira** (pendencias :591-596): `descricao` "aparece no console como se fosse cliente" ✔ (casa o §13); **`severidade` "MÉDIA — sem isso o `platform_admin` não vê o próprio tenant no console"** — diz o CONTRÁRIO da descrição (o sentido antigo, "não exibe"); **`acao` "cobrir na tela de Organizações/Detalhe do B-SAN3-06a ou bloco equivalente"** — nomeia outro bloco que o `dono: B-SAN3-06b`. Origem: `git show 7812fe7c:…pendencias.md` mostra as duas linhas idênticas no ciclo 1 (descricao era "ainda não exibe", dono "B-SAN3-06a (a nomear na junta)"); o ciclo 2 trocou só `descricao` e `dono`. Verificador: `coerencia_ORG = INCOERENTE` (`org_linhas_com_sentido_oposto` = a severidade; `org_acao_nomeia_outro_bloco` = [B-SAN3-06a]).
- **SCRIPTS-FORA-DO-TSCONFIG lida inteira** (:605-610): "usa `--skipLibCheck`…; o `tsconfig.json` raiz **pode** não incluir `scripts/`" · severidade "BAIXA — tsc direto no arquivo passa; **afeta só o build da IDE**". Medido: `tsconfig.json` `"include": ["src/**/*.ts"]` (desde 04ad42c0, 2026-05-10); a CI roda `npm run check` = `tsc -p tsconfig.json --noEmit` (`.github/workflows/ci.yml:106`) e nenhum teste ou job tipa o script (`grep createProgram|noEmit|tsc` nos 2 testes = 0; `git grep bootstrap-platform-admin -- .github` = 0). **Sob MF3-f** (campo novo sem flag): `npm run check` **ec=0**, T1 **26/26 ec=0**, só a A19 manual **ec=2**; restore hash-object = blob; `npm run check` no objeto ec=0. ⇒ o tipo de exaustividade do §15.1.1 item 1 só morde quando alguém roda a A19 à mão: na CI ele não existe. A entrada diz "só o build da IDE" — o §13 do plano dizia certo ("a CI não o roda"). O registro subestima a consequência medida.
- **Mutações do verificador** (`runmut-pend.sh` md5 89675007…; restore hash-object 31ce54ad = blob nas 3): MP-1 apagar a entrada `FALHOU-SEM-CAUSA` (diff 7) → **VERMELHO** (`presente: False`); MP-2 `ENV-EXAMPLE` dono → "B-SAN3-10 (a nomear)" (diff 2) → **VERMELHO** (`a_nomear: True`); MP-3 descrição da ORG → "o console web ainda não exibe o tenant…" (diff 2) → **VERMELHO** (`org_cliente False`).
- Veredito parcial 3(c): o critério do 15.2 **passa** (6/6 presentes, donos do 15.2/15.5, 0 "a nomear", descrição casa "como se fosse cliente", nota 2f-2), com controle 3/3. **Achados**: ORG-PLATAFORMA contradiz a si mesma (severidade e acao no sentido antigo) — ajuste, dentro-do-bloco; SCRIPTS-FORA-DO-TSCONFIG subestima a consequência medida (a guarda de tipo do MF3-f fica fora da CI) — ajuste, dentro-do-bloco quanto ao texto, classe pré-existente (04ad42c0) com dono B-ARNES-2; B-ARNES-2 é bloco pós-gate (§7.3), não linha do §5 — nota.

### 3(d) 3a-1 e C3-A1 — Runbook B e T1.8 — 2026-10-08T17:32:05Z
- Extrator MEU (`$SCRATCH/verif-runbook.mts`, md5 9caf129b…): de `#### Runbook B` ao próximo cabeçalho de nível ≤ 4 **fora de cerca de código** (as linhas `# simulação…`/`# aplicação:` dentro do ```bash não encerram) → **docs/deployment.md:168-204** (37 linhas). Extrator do T1.8 (tests/…test.ts:407-413: de `#### Runbook B` ao próximo `\n### `) → termina antes de :205 `### Provedor…` → mesma extensão, 37 linhas. As duas regras coincidem aqui.
- Linhas (objeto, `docs/deployment.md`): **:200 "Domínio + TLS pelo Fly (certs gerenciados) após o `fly apps create` e o apontamento de DNS."** (com acento) × `origin/main:docs/deployment.md:185` "3. Dominio + TLS pelo Fly (certs gerenciados) apos o `fly apps create` e o apontamento de DNS." (mesmo conteúdo; o objeto acentuou e tirou a numeração) · **:196-198 os três códigos** ("Códigos: exit 0 = criado ou já convergido; exit 2 = recusa nomeada (trava, entrada, argumento ou estado), nada gravado; exit 1 = `FALHOU` (por exemplo, banco inalcançável), nada confirmado e a transação não fecha.") · **:196 `UNKNOWN_ARGUMENT`** ("Argumento não reconhecido → `UNKNOWN_ARGUMENT` e exit 2, sem ecoar o argumento e sem gravar nada."). Contagem no Runbook extraído: `TLS` 1 (:200), `exit 1` 1 (:197), `FALHOU` 1 (:198), `UNKNOWN_ARGUMENT` 1 (:196) — cada token numa linha só, logo a deleção pode acusar.
- T1.8 no objeto: `ok 26` (T1 do 1(a)).
- **Deleções** (runmut.sh; restore hash-object 0f7437e0 = blob nas 3): D1 apagar :200 (TLS) → T1 26/25/1, `not ok 26 - T1.8`, mensagem `Runbook B não contém "TLS"` ✔ · D2 apagar a frase "Códigos: … não fecha." (:196-198) → `not ok 26`, `Runbook B não contém "exit 1"` (o T1.8 para no 1º ausente; `FALHOU` também saiu) ✔ · D3 apagar a frase do `UNKNOWN_ARGUMENT` (:196) → `not ok 26`, `Runbook B não contém "UNKNOWN_ARGUMENT"` ✔.
- **Flags do Runbook × `BOOTSTRAP_FLAGS`** (objeto importado): tokens `--…` nos blocos de código (:181-190) = `--password-stdin`, `--dry-run` → **fora do conjunto: ∅** ✔. Na prosa: `--password-stdin`, `--password=` (citado como o que é RECUSADO), `--reset-password` (∈ conjunto).
- **O "teste extra" do §15.6** ("extrai os tokens `--…` dos comandos do Runbook B e exige que todos estejam em `BOOTSTRAP_FLAGS`"): **não existe** no objeto (`grep BOOTSTRAP_FLAGS|extractRunbookB` nos 2 testes: o T1.8 só faz `includes` de uma lista fixa; `git grep -l 'Runbook B' 07209295 -- tests/` = só o T1). **Controle meu:** acrescentar `--verbose` ao comando de simulação do Runbook (:185, diff 2) → **T1 26/26, `ok 26 - T1.8` VERDE**; meu verificador acusa `fora: ['--verbose']`; restore ✔. Consequência medida do que falta: um Runbook que mande o operador passar uma flag que o script recusa passa na suíte; o efeito no operador é fail-closed (o script sai `UNKNOWN_ARGUMENT`, exit 2, nada gravado — medido no item 1), não escrita errada. O §15.3 (PERMITIDO) não lista esse teste; ele só aparece como mitigação no §15.6.
- Veredito parcial 3(d): **VERDE** (TLS, três códigos e `UNKNOWN_ARGUMENT` presentes; T1.8 vermelho nas 3 deleções, pelo token certo; flags do Runbook ⊆ conjunto). Nota: o teste extra prometido no §15.6 não existe (fail-closed limita o efeito).

### Item 3 — veredito parcial
Propriedade do 3b-1 VERDE (nenhum artefato fecha/agenda antes do ato do dono; opt-in certo; 4/4 mutações acusadas) — critérios literais (i)/(ii) do §15.1.5 não podem passar com o texto que o próprio plano prescreve (achado contra a régua). 3b-2 VERDE no critério do 15.2 (6/6, donos, 0 "a nomear", nota 2f-2; 3/3 mutações), com 2 ajustes de coerência do registro (ORG-PLATAFORMA contraditória; SCRIPTS-FORA-DO-TSCONFIG subestima a consequência medida). 3a-1/C3-A1 VERDES (3/3 deleções acusadas). Nota: teste extra do §15.6 ausente.

## Apêndice — sondas e verificadores (verbatim, copiados por `cat` do arquivo; md5 cru de cada um ao lado)

### `sonda-tabela.mts` — md5 91227e05ac9f6097ac9de9b93df65b89

```
// Sonda C1c2 item 1(b): gera, pela MINHA leitura do texto do plano §15.1.1, as variantes de distância 1
// e compara com a função do teste (avaliada numa CÓPIA extraída do arquivo de teste), sem copiar a lógica dela.
import { pathToFileURL } from "node:url";
import { readFileSync, writeFileSync } from "node:fs";
const WT = process.env.WT_ROOT!;
const mod = await import(pathToFileURL(`${WT}/scripts/bootstrap-platform-admin.ts`).href);
const { BOOTSTRAP_FLAGS, parseArgv, BootstrapRefused } = mod;
const known = Object.keys(BOOTSTRAP_FLAGS);
// --- minha geração (texto do §15.1.1) ---
const mine = new Set<string>();
const toggle = (c: string) => (c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase());
for (const f of known) {
  for (let i = 0; i < f.length; i++) mine.add(f.slice(0, i) + f.slice(i + 1));               // apagar cada caractere
  for (let i = 0; i < f.length; i++) if (/[A-Za-z]/.test(f[i])) mine.add(f.slice(0, i) + toggle(f[i]) + f.slice(i + 1)); // trocar a caixa de cada letra
  for (let i = 0; i < f.length; i++) { if (f[i] === "-") mine.add(f.slice(0, i) + "_" + f.slice(i + 1)); if (f[i] === "_") mine.add(f.slice(0, i) + "-" + f.slice(i + 1)); } // - <-> _
  mine.add("-" + f.replace(/^-+/, ""));   // um traço só
  mine.add(f.replace(/^-+/, ""));         // sem traços
  for (const s of ["=true", "=1", "=false"]) mine.add(f + s);
}
for (const t of ["--dryrun", "-n", "-p", "--", "", " --dry-run", "constructor", "toString", "__proto__", "hasOwnProperty"]) mine.add(t);
for (const k of known) mine.delete(k);
// --- a lista do teste: função extraída do arquivo de teste para uma cópia ---
const testText = readFileSync(`${WT}/tests/san3-09-bootstrap-platform-admin.test.ts`, "utf8").replace(/\r/g, "");
const start = testText.indexOf("function unknownArgumentVariants(");
const end = testText.indexOf("\nconst UNKNOWN_ARGUMENT_VARIANTS");
const fnText = testText.slice(start, end);
const copyPath = `${process.env.SCRATCH}/copia-unknownArgumentVariants.mts`;
writeFileSync(copyPath, `export function make(BOOTSTRAP_FLAGS: Record<string,string>) {\n${fnText}\nreturn unknownArgumentVariants();\n}\n`);
const copy = await import(pathToFileURL(copyPath).href);
const testList: string[] = copy.make(BOOTSTRAP_FLAGS);
const testSet = new Set(testList);
const onlyMine = [...mine].filter((t) => !testSet.has(t));
const onlyTest = [...testSet].filter((t) => !mine.has(t));
// --- recusa e eco, por token ---
const TEMPLATE = (pos: number) => `Argumento não reconhecido na posição ${pos}. Aceitos: --dry-run, --password-stdin, --reset-password. Nada foi feito.`;
const rows: Array<{ token: string; code: string; echo: boolean; exact: boolean; testEcoRuns: boolean; why: string }> = [];
for (const token of [...new Set([...mine, ...testSet])]) {
  let code = "ACEITO"; let msg = "";
  try { parseArgv([token]); } catch (e: any) { code = e instanceof BootstrapRefused ? e.code : `OUTRO:${e?.name}`; msg = String(e?.message ?? ""); }
  const testEcoRuns = token.length >= 3 && !known.some((f) => f.includes(token.trim()));
  const why = token.length < 3 ? "len<3" : !testEcoRuns ? "substring de flag conhecida (aparece na lista de aceitos da mensagem)" : "";
  rows.push({ token, code, echo: token.length > 0 && msg.includes(token), exact: msg === TEMPLATE(1), testEcoRuns, why });
}
const out = {
  N_mine: mine.size, N_test: testSet.size, N_test_array: testList.length, onlyMine, onlyTest,
  codes: rows.reduce((a: any, r) => ((a[r.code] = (a[r.code] ?? 0) + 1), a), {}),
  N_msg_exata_template: rows.filter((r) => r.exact).length,
  N_echo_literal: rows.filter((r) => r.echo).length,
  echo_literal_tokens: rows.filter((r) => r.echo).map((r) => r.token),
  N_eco_teste: rows.filter((r) => r.testEcoRuns && testSet.has(r.token)).length,
  excluidos_eco_teste: rows.filter((r) => !r.testEcoRuns && testSet.has(r.token)).map((r) => `${JSON.stringify(r.token)}:${r.why}`),
  rows,
};
// --- controles ---
const removed = testList[5];
const testMinusOne = new Set(testList.filter((t) => t !== removed));
const ctrlDiff = [...mine].filter((t) => !testMinusOne.has(t));
const fabricated = `Argumento não reconhecido: ${"sentinela-xyz"}`;
(out as any).controle_lista = { removido: removed, acusado: ctrlDiff.includes(removed), diff: ctrlDiff };
(out as any).controle_eco = { fabricada_contem: fabricated.includes("sentinela-xyz") };
console.log(JSON.stringify(out, null, 1));
```

### `verif-registro.py` — md5 480826ba281a5028f8ee72acb9e8801a

```
# Verificador C1c2 do 3b-1. Lê os arquivos do DISCO do worktree (= blob quando restaurado) e o diff worktree × merge-base.
# (i) bloco da entrada; (ii) linhas '+' que citam o ID; literal (régua do plano) e propriedade (após classificar por leitura).
import re, subprocess, sys, json
WT, MB = sys.argv[1], sys.argv[2]
ID = "P-SAN-PROD-BOOTSTRAP"
PAT_I = re.compile(r"porteiro|CI verde|ALLOW_PROD_SEED=1", re.I)
PAT_II = re.compile(r"porteiro|fechamento confirmado|confirmar o fechamento|CI verde", re.I)
NEGA = "nem CI nem porteiro a fecham"   # a frase que nega, lida e classificada (status/agendamento/status-geral/apenso)
# linhas '+' lidas e classificadas no objeto: (arquivo, texto exato) -> classe. Só as que casam PAT_II depois de tirar NEGA.
LIDAS = {
  ("agent-orchestration/codex/log-execucao.md", "- **Próximos:** junta do PR, porteiro pós-merge, confirmação de P-SAN-PROD-BOOTSTRAP"): "histórica do ciclo 1 (2026-10-01), não reescrita (§A2), superada pelo apenso de 2026-10-08 no mesmo arquivo",
}
META = ("docs/revisoes/", ".claude/agents/", ".agents/agents/", "agent-orchestration/omega/")
def block(lines, rule):
    s = next(i for i, l in enumerate(lines) if l.startswith("## " + ID))
    for j in range(s + 1, len(lines)):
        l = lines[j]
        if rule == "A" and re.match(r"^#{1,2} ", l): return s, j
        if rule == "B" and (re.match(r"^#{1,6} ", l) or l.strip() == "---"): return s, j
    return s, len(lines)
pend = open(f"{WT}/agent-orchestration/controle/pendencias.md", encoding="utf-8").read().replace("\r", "").split("\n")
out = {}
for rule in ("A", "B"):
    s, e = block(pend, rule)
    b = pend[s:e]
    lit = [f"{s+1+k}: {l[:160]}" for k, l in enumerate(b) if PAT_I.search(l)]
    prop = [f"{s+1+k}: {l[:160]}" for k, l in enumerate(b) if PAT_I.search(l.replace(NEGA, ""))]
    acao = [l for l in b if l.startswith("- acao:")]
    out[f"i_regra_{rule}"] = {"linhas": f"{s+1}-{e}", "N": e - s, "ato_do_dono": sum("ato do dono" in l for l in b),
        "literal_hits": lit, "literal_passa": (not lit) and any("ato do dono" in l for l in b),
        "propriedade_hits": prop, "propriedade_passa": (not prop) and any("ato do dono" in l for l in b),
        "acao_optin_certo": [("NODE_ENV=production ALLOW_PROD_BOOTSTRAP=1" in l) for l in acao[:1]]}  # só a acao da PRÓPRIA entrada (a 1ª do bloco)
diff = subprocess.run(["git", "-C", WT, "diff", "--no-color", "-U0", MB, "--"], capture_output=True, text=True, encoding="utf-8").stdout
cur = None; plus = []
for l in diff.split("\n"):
    if l.startswith("+++ b/"): cur = l[6:]; continue
    if l.startswith("+") and not l.startswith("+++") and ID in l: plus.append((cur, l[1:].rstrip("\r")))
lit2 = [(f, t) for f, t in plus if PAT_II.search(t)]
cls = {"nega": [], "meta": [], "lida": [], "NAO_CLASSIFICADA": []}
for f, t in lit2:
    if not PAT_II.search(t.replace(NEGA, "")): cls["nega"].append(f"{f}: {t[:140]}")
    elif (f, t) in LIDAS: cls["lida"].append(f"{f}: {t[:140]} => {LIDAS[(f,t)]}")
    elif f.startswith(META): cls["meta"].append(f"{f}: {t[:140]}")
    else: cls["NAO_CLASSIFICADA"].append(f"{f}: {t[:200]}")
out["ii"] = {"plus_lines_citando_ID": len(plus), "literal_hits": len(lit2), "literal_passa": len(lit2) == 0,
    "por_arquivo": {f: sum(1 for g, _ in lit2 if g == f) for f in sorted({g for g, _ in lit2})}, "classes": cls,
    "propriedade_passa": len(cls["NAO_CLASSIFICADA"]) == 0}
out["optin_seed_em_registro"] = [f"{f}: {t[:140]}" for f, t in plus if "ALLOW_PROD_SEED=1" in t and not f.startswith(META)]
out["VEREDITO_PROPRIEDADE"] = "VERDE" if (out["i_regra_A"]["propriedade_passa"] and out["ii"]["propriedade_passa"] and all(out["i_regra_A"]["acao_optin_certo"]) and not out["optin_seed_em_registro"]) else "VERMELHO"
print(json.dumps(out, ensure_ascii=False, indent=1))
```

### `verif-pend.py` — md5 10c04765f14bee9c041fd238b84b7a70

```
# Verificador C1c2 do 3b-2: pendências do B-SAN3-09, donos, "a nomear", coerência da ORG-PLATAFORMA e existência do dono no plano da rodada.
import re, sys, json, subprocess
WT, REF = sys.argv[1], sys.argv[2]
pend = open(f"{WT}/agent-orchestration/controle/pendencias.md", encoding="utf-8").read().replace("\r", "").split("\n")
s = next(i for i, l in enumerate(pend) if l.startswith("### Pendências abertas por B-SAN3-09"))
e = next(j for j in range(s + 1, len(pend)) if re.match(r"^#{1,3} ", pend[j]))
blk = pend[s:e]; ents = {}; cur = None
for l in blk:
    m = re.match(r"^#### (P-[A-Z0-9-]+)", l)
    if m: cur = m.group(1); ents[cur] = []; continue
    if cur: ents[cur].append(l)
def field(k, name):
    for l in ents.get(k, []):
        if l.startswith(f"- {name}:"): return l[len(name) + 3:].strip()
    return None
ESPERADO = {"P-SAN3-09-ORG-PLATAFORMA-NO-CONSOLE": "B-SAN3-06b", "P-SAN3-09-ENV-EXAMPLE-BOOTSTRAP": "B-SAN3-10",
  "P-SAN3-09-SCRIPTS-FORA-DO-TSCONFIG": "B-ARNES-2", "P-SAN3-09-ROTEIRO-DE-OPERACAO": "B-SAN3-10",
  "P-SAN3-09-DB-TEST-SO-LINUX": "B-ARNES-2", "P-SAN3-09-FALHOU-SEM-CAUSA": "B-SAN3-10"}
plano = subprocess.run(["git", "-C", WT, "show", f"{REF}:docs/revisoes/SAN3/PLANO_SAN3.md"], capture_output=True, text=True, encoding="utf-8").stdout.replace("\r", "").split("\n")
s5 = next(i for i, l in enumerate(plano) if l.startswith("## 5.")); e5 = next(i for i in range(s5 + 1, len(plano)) if plano[i].startswith("## 6."))
rows5 = {m.group(1) for l in plano[s5:e5] for m in [re.match(r"^\| *`(B-[A-Za-z0-9-]+)`", l)] if m}
s73 = next(i for i, l in enumerate(plano) if l.startswith("### 7.3")); e73 = next(i for i in range(s73 + 1, len(plano)) if re.match(r"^#{2,3} ", plano[i]))
fila73 = set(re.findall(r"`(B-[A-Za-z0-9-]+)`", "\n".join(plano[s73:e73])))
out = {"bloco_linhas": f"{s+1}-{e}", "entradas": sorted(ents), "tabela": []}
ok = True
for k, dono_esp in ESPERADO.items():
    d = field(k, "dono"); presente = k in ents
    anomear = any("a nomear" in l.lower() for l in ents.get(k, []))
    base = (d or "").split()[0] if d else None
    row = {"id": k, "presente": presente, "dono": d, "dono_esperado": dono_esp, "dono_confere": base == dono_esp,
           "a_nomear": anomear, "dono_em_§5": base in rows5, "dono_em_§7.3": base in fila73}
    row["ok"] = presente and base == dono_esp and not anomear and (base in rows5 or base in fila73)
    ok &= row["ok"]; out["tabela"].append(row)
org = "P-SAN3-09-ORG-PLATAFORMA-NO-CONSOLE"
desc = field(org, "descricao") or ""
out["org_descricao_casa_como_se_fosse_cliente"] = "como se fosse cliente" in desc
out["org_linhas"] = ents.get(org, [])
out["org_linhas_com_sentido_oposto"] = [l for l in ents.get(org, []) if re.search(r"não vê|nao ve|não exibe|nao exibe|ainda não", l, re.I)]
out["org_acao_nomeia_outro_bloco"] = [b for b in re.findall(r"B-[A-Za-z0-9-]+", field(org, "acao") or "") if b != ((field(org, "dono") or "").split() or [""])[0]]
troca = "\n".join(pend); out["nota_2f2_troca_senha"] = bool(re.search(r"P-O6R-B01-TROCA-SENHA[\s\S]{0,800}piso de 12 caracteres vale\s+somente para o bootstrap", troca))
ok &= out["org_descricao_casa_como_se_fosse_cliente"] and out["nota_2f2_troca_senha"]
out["VEREDITO_criterio_15_2"] = "VERDE" if ok else "VERMELHO"
out["coerencia_ORG"] = "COERENTE" if not out["org_linhas_com_sentido_oposto"] and not out["org_acao_nomeia_outro_bloco"] else "INCOERENTE"
out["rows5_N"] = len(rows5); out["fila73"] = sorted(fila73)
print(json.dumps(out, ensure_ascii=False, indent=1))
```

### `verif-runbook.mts` — md5 9caf129bfbd24cbf3185f4f4e24a466e

```
// Runbook B: extração com cercas de código respeitadas (fim = próximo cabeçalho de nível <= 4 FORA de cerca) × extrator do T1.8;
// tokens `--…` dos blocos de código ⊆ BOOTSTRAP_FLAGS (objeto importado).
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const WT = process.env.WT_ROOT!;
const { BOOTSTRAP_FLAGS } = await import(pathToFileURL(`${WT}/scripts/bootstrap-platform-admin.ts`).href);
const text = readFileSync(`${WT}/docs/deployment.md`, "utf8").replace(/\r/g, "");
const lines = text.split("\n");
const s = lines.findIndex((l) => l.startsWith("#### Runbook B"));
let fence = false, e = lines.length; const code: string[] = []; const codeLines: number[] = [];
for (let i = s + 1; i < lines.length; i++) {
  if (/^```/.test(lines[i])) { fence = !fence; continue; }
  if (!fence && /^#{1,4} /.test(lines[i])) { e = i; break; }
  if (fence) { code.push(lines[i]); codeLines.push(i + 1); }
}
// extrator do T1.8 (reimplementado aqui só para comparar a EXTENSÃO; a régua é a do teste)
const st = text.indexOf("#### Runbook B"); const after = text.indexOf("\n", st); const en = text.indexOf("\n### ", after);
const t18 = en === -1 ? text.slice(after) : text.slice(after, en);
const t18Lines = t18.split("\n").length;
const tokens = [...new Set(code.join("\n").match(/(?<![\w-])--[A-Za-z][\w-]*/g) ?? [])];
const prose = [...new Set(lines.slice(s, e).filter((_, k) => !codeLines.includes(s + 1 + k)).join("\n").match(/(?<![\w-])--[A-Za-z][\w-]*=?/g) ?? [])];
console.log(JSON.stringify({ meu_extrator: `${s + 1}-${e}`, N_linhas_meu: e - s, fim_teste_linha: text.slice(0, en).split("\n").length + 1, N_linhas_teste_aprox: t18Lines,
  linhas_de_codigo: codeLines, tokens_codigo: tokens, fora_de_BOOTSTRAP_FLAGS: tokens.filter((t) => !Object.hasOwn(BOOTSTRAP_FLAGS, t)),
  tokens_prosa: prose }, null, 1));
```

### `mut.mjs` — md5 1a0fdcdcac45e8435e0ce60b6074c63e

```
// uso: node mut.mjs <arquivo> <anchorFile> <replFile>  — âncora e substituição lidas de arquivos (sem escapes no argv);
// exige exatamente 1 ocorrência; '\n' na substituição vira o EOL do arquivo.
import { readFileSync, writeFileSync } from "node:fs";
const [file, aF, rF] = process.argv.slice(2);
const text = readFileSync(file, "utf8");
const eol = text.includes("\r\n") ? "\r\n" : "\n";
const anchor = readFileSync(aF, "utf8").replace(/\r?\n$/, "").replace(/\r?\n/g, eol);
const repl = readFileSync(rF, "utf8").replace(/\r?\n$/, "").replace(/\r?\n/g, eol);
const n = text.split(anchor).length - 1;
console.log(`ocorrencias=${n} eol=${eol === "\r\n" ? "CRLF" : "LF"}`);
if (n !== 1) { console.log("ABORTA: âncora não única"); process.exit(3); }
writeFileSync(file, text.replace(anchor, () => repl));
console.log("mutado");
```

## Fecho — legalidade no fim, achados e limpeza — 2026-10-08T17:35:20Z

- Objeto re-resolvido em 2026-10-08T17:32:57Z: `git ls-remote` = `gh pr view 400 headRefOid` = **07209295af1c4cd36bd223366d025505a6ab91ef** (não andou; foi o que medi). `origin/main` = c8af64580cb85ddf4960fecb2f8604384f8f0328 (não andou).
- Check-runs no objeto no fim (`checkruns-fim.json`): **total 7 | não-verdes 0 | pendentes 0** — docker, flutter, authority-portal, backend, owner-portal, frontend, backend-postgres, todos completed/success (concluídos 16:54–17:03Z). (No início eram 6 com 4 in_progress.) São 7, não 14 (R-1 do inspetor confirmada).
- Irmãos dos vazios: `git grep bootstrap-platform-admin 07209295 -- .github` = 0 arquivos × irmão `git grep -c 'npm run check' 07209295 -- .github` = 3 ✔; `grep createProgram|noEmit|tsc` nos 2 testes = 0/0 × irmão `createSourceFile` no T1 = 1 ✔; `git grep -c 'scrypt-v1\$' 07209295` = 0 × irmão em 7812fe7c = 1 ✔.
- Não abri, não li e não citei nenhum arquivo de outra cadeira desta junta (C2c2-*, C3c2-*). Li do ciclo 1 e da trilha: o parecer 00-inspetor-terreno-c2.md (inteiro), o plano (§13, §15.0–15.6), o `DEV-ciclo2-relatorio.md` (só as linhas do MF3-b…e, por grep), o meu mandato C1c2.md e o meu corpo. As linhas da ata e de C1-evidencia/C1-voto do ciclo 1 só apareceram como hits do `git grep` do 3(a), classificadas como meta.

**Achados** (gravidade · escopo):
- C1c2-01 · nota · dentro-do-bloco — o T1.5c não pode acusar o MF3-c (sentinela atrás de um token já recusado); o MF3-c morre só pelo T1.2b.
- C1c2-02 · ajuste · dentro-do-bloco — mutação nova MF3-c2 (eco do token só na posição ≥ 2, o formato `--password-stdin <senha>`) sobrevive a T1 26/26 e T2 12/12; o produto não ecoa (template 98/98; processos reais 0).
- C1c2-03 · nota · dentro-do-bloco — mutação nova MF3-e2 (parseArgv depois da trava) sobrevive ao T1 26/26; no objeto a ordem está certa.
- C1c2-04 · nota · contra a régua — o literal "tokens de 3+ caracteres" do §15.1.1 não pode passar com a mensagem que o mesmo § prescreve.
- C1c2-05 · nota · contra a régua — os critérios literais (i)/(ii) do §15.1.5 não podem passar com o texto que o próprio § prescreve (negação sem exceção em (i); linha histórica 4802 preservada em (ii)); a propriedade passa e o verificador acusa 4/4.
- C1c2-06 · ajuste · dentro-do-bloco — `P-SAN3-09-ORG-PLATAFORMA-NO-CONSOLE` contradiz a si mesma (severidade "não vê o próprio tenant"; ação "B-SAN3-06a" × dono 06b), linhas herdadas de 7812fe7c.
- C1c2-07 · ajuste · dentro-do-bloco (texto) / classe pré-existente (tsconfig `src/**` desde 04ad42c0, 2026-05-10; dono B-ARNES-2) — `P-SAN3-09-SCRIPTS-FORA-DO-TSCONFIG` diz "afeta só o build da IDE"; medido: CI e T1 verdes sob MF3-f, a guarda de exaustividade só roda na A19 manual.
- C1c2-08 · nota · dentro-do-bloco — o teste extra do §15.6 (flags do Runbook ⊆ BOOTSTRAP_FLAGS) não existe; `--verbose` no Runbook deixa T1 26/26 (efeito fail-closed).
- C1c2-09 · nota · propriedade do SO (não cobrável, corpo) — argv de `-p <senha>` visível na tabela de processos por ≈ 0,45 s (2–3 amostras; controles 37/0).
- C1c2-10 · nota · pré-existente (padrão `import "dotenv/config"` em prisma/seed.ts desde bd9a7bba, 2026-05-21; "o .env do operador" é reprovação por construção no §15.4) — o `.env` do cwd é lido no carregamento do módulo, antes de `main()`.
- C1c2-11 · nota · dentro-do-bloco — `B-ARNES-2` (dono de 2 pendências) é bloco da fila pós-gate §7.3 do PLANO_SAN3, não linha do §5.
- Nenhum `bloqueia`.

**Limpeza:** containers `j9c2c1-node`, `j9c2c1-pg`, `j9c2c1-redis` removidos por `docker rm -f -v` (contagem `--filter name=j9c2c1-` = 0) e rede `j9c2c1-net` removida (0); volumes órfãos (dangling) = 14 antes e depois (os alheios da R-5; nenhum meu) · processos vivos com `w-j9c2c1` na linha de comando = 0 · `git worktree remove --force C:/Users/AMP/w-j9c2c1` ec=0 (`test -e` → removido; `worktree list | grep -c` = 0), com o `node_modules` e o resíduo `undefined/` (cache do tsx sob `env -i`) dentro · antes da remoção: os 6 arquivos rastreados que mutei com hash-object = blob, `git status` só com `?? undefined/` · sonda `zz-c1c2-ciclo1.ts` removida do container antes · segredos descartáveis (`pgpw.secret`, `senha.secret`, `sent.pat`) e cópias do $SCRATCH apagados ao fim · base viva `erp-postgres`/`erp-redis` nunca tocada (Exited) · em w-nuv09 escrevi só C1c2-evidencia.md e C1c2-voto.json · disco: 12 G livres antes e depois.

- 2026-10-08T17:38:39Z — voto gravado em `C1c2-voto.json` (md5 cru f1a3b8043d1c452526807fac40dcc169): **APROVADO** — 11 achados (3 ajuste, 8 nota), nenhum bloqueia.
- Nota de terreno (minha): no 3(d) um comando gravou por engano `/tmp/rbB.txt` (= Temp do usuário, fora do scratchpad); apagado no comando seguinte (`ls` → inexistente). Diretório `$SCRATCH/c1c2` inteiro apagado ao fim (segredos inclusos). Em w-nuv09: `git status` mostra só os meus 2 arquivos `??` e os 30 ` M .agents/agents/**` fantasmas que o inspetor já mediu (1.c).
