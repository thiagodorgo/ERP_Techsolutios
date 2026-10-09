papel: C2 | identidade: jurado-san3-09c2-c2-dryrun-e-concorrencia | modelo: Claude Opus 5.5 (claude-opus-5-5) (substituição §C7.6-bis: frontmatter diz `fable`; Fable não rodou por D-FABLE-ASTRA-SO-DINHEIRO, decisão do dono 2026-10-08 — Fable só em bloco que toca dinheiro; este não toca) | mandato_md5: 5106f756f29e4d49ebf35851b065e8d3 (declarado no disparo: 5106f756f29e4d49ebf35851b065e8d3 — igual; medido no blob HEAD e no disco) | corpo_md5: cadc600ca06e7956a4b9c1b276b298da (recebido no prompt: lançada como general-purpose, corpo lido do blob `git show HEAD:.claude/agents/especialistas/jurado-san3-09c2-c2-dryrun-e-concorrencia.md` em w-nuv09 = e277bb6d; declarado no disparo cadc600c… — igual; tabela 4.d do inspetor cadc600c… — igual)

# Evidência — Cadeira C2 da junta 2 do B-SAN3-09 (PR 400)

## 0. Cabeçalho e terreno (gravado ~2026-10-08T17:43Z)

- Ferramentas usadas: só Read/Grep/Glob/Bash (autorrestrição do disparo; Write/Edit não usados; evidência e voto por Bash).
- Objeto (início, 17:41Z): `git ls-remote origin refs/heads/feat/bootstrap-platform-admin` = `e277bb6dd7da706cba8e023aaf785d077db721f6` = `gh pr view 400 headRefOid` (OPEN, draft, CONFLICTING).
- `origin/main` no início: `c8af64580cb85ddf4960fecb2f8604384f8f0328`. merge-base(origin/main, objeto) = `8ee10bd2e44d95206551b71351f23d901192cbb6`.
- Cerca do mandato: `6319f11aef2c05ca375bb7b6df2eb941ae14e4aa`. `git diff --name-status 6319f11a e277bb6d` = 5 × `A agent-orchestration/omega/juntas/votos/B-SAN3-09/{00-mandatos/C1c2.md,C2c2.md,C3c2.md, C1c2-evidencia.md, C1c2-voto.json}` → **só registro**.
- Objeto julgado pelo inspetor: `e120644708fc78694d1b69847e0bcd93666343f0`; `git diff --name-status e1206447 e277bb6d` = os 5 acima + `A 00-inspetor-terreno-c2.md` → **só registro**; e1206447 e 6319f11a são ancestrais de e277bb6d.
- Arquivos `C1c2-evidencia.md`/`C1c2-voto.json` existem no delta: **NÃO lidos** (cadeiras votam juntas).
- `$SCRATCH` = C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/j9c2c2
- host: node v20.19.5 · Python 3.13.14 · Git Bash (MINGW64, SHELL=/bin/bash.exe) · `MSYS_NO_PATHCONV` NÃO exportada · cwd por comando = C:/Users/AMP/w-nuv09 ou o worktree próprio · variáveis definidas: só caminhos (S, V, E, W) por comando.
- disco: `df -h /c` = 12G livres de 238G (95%) no início.
- docker no início: `erp-postgres`/`erp-redis` Exited (255) 3 h (base viva desligada, nunca alvo); `erp-postgres-alt`, `pastrack-teste-banco-teste-1` Exited (alheios). Imagens locais: erp-junta-node20-pg16:local, postgres:16, postgres:16-alpine, redis:7, node:20-bookworm-slim.
- Prefixo de containers desta cadeira: **`j9c2c2-`** (o mandato e o disparo o nomeiam; o corpo l.178 tinha como padrão `jurado-san3-09c2-c2-*` "ou o que o mandato nomear" — vale o mandato).
- Worktree próprio: `C:/Users/AMP/w-j9c2c2` (nomeado pelo mandato).

## 1. Legalidade (gravado ~2026-10-08T17:43Z)

- Parecer do inspetor da junta 2: `votos/B-SAN3-09/00-inspetor-terreno-c2.md` (blob em e277bb6d), instância inspetor-de-terreno-da-junta, Opus declarado, veredito **LIBERADO COM RESSALVA** gravado 2026-10-08T17:24Z sobre `e1206447`; confere C2 `jurado-san3-09c2-c2-dryrun-e-concorrencia` corpo `cadc600c…` (tabela 4.d), worktree próprio (lista de livres inclui `w-j9c2c2`) e container próprio para C2. Ressalvas lidas: R-1 (7 check-runs), R-2 (norma = origin/main c8af6458; ramo não integrou #407; diff three-dot), R-3 (general-purpose + md5), R-4 (mandatos só nomeiam dados), R-5 (14 volumes órfãos alheios, nunca prune), R-6 (12 GB livres), Nota (restauro do dev = md5 CRLF; blob do script 995022e1…).
- Check-runs (`gh api repos/thiagodorgo/ERP_Techsolutios/commits/<sha>/check-runs?per_page=100` → arquivo em $SCRATCH; filtro: não-verde = completed ∧ conclusion≠success; pendente = status≠completed):
  - objeto `e277bb6d` às 17:42Z: total=6 · não-verdes=0 · pendentes=4 (flutter, backend, backend-postgres, frontend in_progress; owner-portal, authority-portal success) — CI ainda rodando no head recém-empurrado (delta só de registro). Re-medir no fim.
  - objeto do inspetor `e1206447` (árvore de produto idêntica): total=7 · não-verdes=0 · pendentes=0; **job -db `backend-postgres` = completed/success 15:59:57Z**.
- Normas citadas no corpo, em `git show origin/main:CLAUDE.md | grep -c '<âncora>'`: D-MEDIR-NA-REF-ALVO 1 · "Segurança de payload/auditoria" (Parte B §2.8) 1 · "## C5. Limpeza" 1 · "INSPEÇÃO DE TERRENO ANTES DE TODA JUNTA" (1-bis) 1 · "ESCOPO DO VEREDITO E CALIBRAÇÃO" (1-ter) 1 · "4-bis. **SEPARAÇÃO DE PAPÉIS" 1 · "6-bis. **ESGOTADO O FABLE" 1 · "P7 — Pausa ordenada" 1 · D-GOV-PROPORCIONAL 3 · "8. **GOVERNANÇA PROPORCIONAL" 1 · "Teto de 2 ciclos" 2 · "KPI congelado" 2 · "## A2. Regra de conflito" 1. `D-FABLE-ASTRA-SO-DINHEIRO` em origin/main:agent-orchestration/controle/decisoes.md l.2982 (1). `git ls-tree -r --name-only origin/main -- scripts/ | grep -c mandato` = 0 → scripts/mandato-*.sh, errata 15.15, D-MANDATO-FORMA **não** são norma.
- Inelegibilidade: o meu nome não é nenhum dos 8 do §15.4 nem C1/C3 (a re-conferir no obituário, abaixo).
- Quórum aplicado: unanimidade de 3 com veto · ciclo 2 de 2 (§C7 item 8(2) de origin/main).
- **Veredito parcial da legalidade: LEGAL** (objeto = só registro sobre o liberado; CI do objeto ainda concluindo — anotado, re-medido no fim).

## 2. Terreno montado (gravado ~2026-10-08T17:45Z)

- Worktree: `git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios worktree add --detach C:/Users/AMP/w-j9c2c2 e277bb6d…` → `test -e …/.git` ok, `rev-parse HEAD` = e277bb6d, `status --porcelain` = 0 linhas. `npm ci --no-audit --no-fund` próprio → 326 pacotes, ec=0 (sem junction). Versões no worktree: @prisma/client 7.8.0, prisma 7.8.0, pg 8.21.0, tsx 4.22.3, typescript 5.9.3. Disco depois: 12G livres (96%).
- Docker (prefixo `j9c2c2-`, nomeado pelo mandato): rede `j9c2c2-net`; `j9c2c2-pg` (postgres:16, senha aleatória de 32 hex gerada por `secrets.token_hex(16)`, passada por `-e POSTGRES_PASSWORD` SEM valor; guardada só em $SCRATCH/pgpw.secret, apagada ao fim); `j9c2c2-redis` (redis:7); `j9c2c2-node` (node:20-bookworm-slim, `--init`, `sleep infinity`). `docker ps` → portas `5432/tcp` e `6379/tcp` só expostas, **nenhuma publicada**.
- Árvore: `git -c core.autocrlf=false archive e277bb6d | docker exec -i j9c2c2-node sh -c 'mkdir -p /work && cd /work && tar -x'`. md5 dentro do container × `git cat-file blob e277bb6d:<f> | md5sum` (cru e EOL-neutro, iguais — 0 CR): script 995022e1efb3a896e007ccf68ba38fd8 · -db.test 928d7d294ddfbd6c99d8c4feecb56e92 · T1 407100f6336fcfc07095285b30782ac1 · package-lock.json 69a6ea326087249d7aa03896859513f8 · helpers/auth-identity-fixture.ts 7e1ad910c87bb54476202530cae29931 → **5/5 = blob**.
- Variáveis do teste: escritas por stdin em `/root/.dbenv` (umask 077) dentro do container node: DATABASE_URL (postgresql://postgres:<senha>@j9c2c2-pg:5432/erp_j9c2c2_base), REDIS_URL (redis://j9c2c2-redis:6379), CORE_SAAS_PERSISTENCE=memory; carregadas por `. /root/.dbenv` dentro do `sh -c` (equivale ao `-e` da receita; a senha nunca vai a argv do host). Base viva (`erp-postgres`/`erp-redis`, 5432/6379 do host) nunca tocada.

## 3. Item 3 — arnês (partes c e d medidas primeiro, no worktree; a e b no container adiante)

### 3(d) Corpo byte-idêntico ao ciclo 1 (gravado ~2026-10-08T17:46Z)
- `git rev-parse 7812fe7c ba65c03a` → 7812fe7cd1783afc09e7d4afce5c7cb497011d45 / ba65c03a4c3edc0723633b0f1330f34852a60e6f.
- `git diff 7812fe7c e277bb6d -- scripts/bootstrap-platform-admin.ts` → `25 insertions(+), 6 deletions(-)`, **2 hunks**: (h1 @@ -72,6 +72,7) `+ | "UNKNOWN_ARGUMENT"` dentro da união `BootstrapRefusalCode`; (h2 @@ -107,20 +108,38) `BOOTSTRAP_FLAGS` (novo const), `MissingBootstrapFlag`/`BOOTSTRAP_FLAGS_ARE_EXHAUSTIVE` (tipo de exaustividade) e o corpo de `parseArgv`. Contexto do h2 = linhas `readonly resetPassword…};` (fim de `BootstrapFlags`) e `export type BootstrapInput` — nenhum `+`/`-` fora das 4 regiões do §15.3. Hunk fora das regiões: **0**.
- Extrator AST (`$SCRATCH/zz-j9c2c2-extrator.cjs`, md5 d58eb7c5efbe6eb4fbf3bc3ec3264710; typescript 5.9.3 do worktree; `ts.createSourceFile` + `isFunctionDeclaration` por nome, texto `getText` com `\r` removido → md5) sobre `git cat-file blob <ref>:scripts/bootstrap-platform-admin.ts`:

| função | 7812fe7c | e277bb6d | igual? |
|---|---|---|---|
| bootstrapPlatformAdmin (173 l.) | 8fe2810ba75128507f74a83c43bd2fbe | 8fe2810ba75128507f74a83c43bd2fbe | sim |
| isBootstrapAllowed | 56702de11075979afdd88e4b8e8ce597 | 56702de1… | sim |
| strictBool | b7853404151c173154a1a60b9f1658c9 | b7853404… | sim |
| readBootstrapInput | 34179a6e2175e1cd512afa6dbe7533b8 | 34179a6e… | sim |
| assertBootstrapPassword | 365a6577e606e8785f16dcfef85a2469 | 365a6577… | sim |
| main | 977e47d31f6b6688509b5350692773c2 | 977e47d3… | sim |
| (controle) parseArgv | 6107c455… (15 l.) | 45edbf04… (23 l.) | **difere — o extrator vê mudança** |
| (extra) readStdinFirstLine / log | 87d92eb0 / 3432edec | iguais | sim |

- Vermelho-controle 2: cópia do script com **um** caractere trocado dentro de `bootstrapPlatformAdmin` (âncora `timeout: 60_000, maxWait: 15_000`, 1 ocorrência → `60_001`; `diff` = 1 linha, l.369) → extrator: `bootstrapPlatformAdmin 46ef099f…` ≠ 8fe2810b (**acusou**); `main` inalterado.
- `git diff --name-only 7812fe7c e277bb6d -- scripts/` → só `scripts/bootstrap-platform-admin.ts` (o do bloco; commit `1c520f1e` "fix(admin): endurece bootstrap da plataforma", 2026-10-08). merge-base(7812fe7c, origin/main) = merge-base(objeto, origin/main) = 8ee10bd2 → `git diff --name-only 8ee10bd2 8ee10bd2 -- scripts/` vazio (nenhum merge da main entrou no ciclo); irmão não-vazio: `git diff --name-only 8ee10bd2 origin/main -- scripts/` = `scripts/san3-11-dossie-vistoria-censo.mjs`. Nenhum arquivo de `scripts/` mudado pelo ciclo além do do bloco.
- `git diff --name-only ba65c03a 7812fe7c -- scripts tests src docs/deployment.md` → **0** linhas; irmão `ba65c03a..e277bb6d` mesmos caminhos → 4 arquivos (docs/deployment.md, o script, os 2 testes) → a premissa ba65c03a ≡ 7812fe7c na árvore de produto **se confirma**.
- **Veredito parcial 3(d): VERDE** (hunks só nas 4 regiões; 6/6 funções congeladas com md5 igual; os 2 controles acusaram).

### 3(c) Ratchet lexical (gravado ~2026-10-08T17:46Z)
- `git grep -n -E 'CREATE ROLE|DROP ROLE|ALTER ROLE|GRANT|REVOKE|OWNER TO' e277bb6d -- 'tests/san3-09-*'` → vazio, ec=1. Irmão: mesmo padrão em `tests/helpers/auth-identity-fixture.ts` → 25 (o grep acusa onde há).
- Guard `tests/db-catalog-write-guard.test.ts` (565 l., blob do objeto): `CATALOG_WRITE_PATTERNS` (l.62-68) = `\bCREATE\s+ROLE\b`, `\bDROP\s+ROLE\b`, `\bALTER\s+ROLE\b`, `\bGRANT\b`, `\bREVOKE\b`, `\bOWNER\s+TO\b` — **`CREATE DATABASE` fora** (confirma o plano). Varredura: `walkTestFiles(TESTS_ROOT)` recursivo, todo `.ts`, só exclui o próprio arquivo (l.140-156) → varre o `-db.test.ts`.
- `env -u DATABASE_URL timeout 300 node --test --import tsx tests/db-catalog-write-guard.test.ts` (worktree, Windows, node 20.19.5) → ec=0, tests 2 · pass 1 · fail 0 · skipped 1 (o caso -db sem banco); `ok 1 - ratchet de catálogo…`.
- Vermelho-controle: `printf '// GRANT\n' >>` o -db.test.ts no worktree (hash-object dcf1756c ≠ blob 31377962) → guard ec=1, `not ok 1`, mensagem `san3-09-bootstrap-platform-admin-db.test.ts: 1 ocorrência(s) de escrita de catálogo FORA da allowlist` (**acusou**). Restauro por `cp` do pristino → `git hash-object` = 3137796232a385da64040648c145b5cbc1a155da = `git rev-parse e277bb6d:<f>`; `status --porcelain` = 0.
- **Veredito parcial 3(c): VERDE.**

> Correção de hora (2026-10-08T17:48Z, `date -u`): as horas "gravado" das seções 0–3(c) tinham sido escritas sem medir o relógio; corrigidas para a hora aproximada real (o relógio do host marcava 17:40:42Z no início e 17:47:48Z ao fim do T2 baseline).

## 4. Item 1 — A11 (dry-run em 5 estados)

### 1(a) Baseline T2 no objeto (gravado 2026-10-08T17:49Z)
- Comando (container `j9c2c2-node`, node v20.20.2, árvore = blob e277bb6d): `cd /work && . /root/.dbenv && export DATABASE_URL REDIS_URL CORE_SAAS_PERSISTENCE && timeout 900 node --test --import tsx tests/san3-09-bootstrap-platform-admin-db.test.ts > /tmp/t2-base.log 2>&1` → **ec=0**; `# tests 12 · pass 12 · fail 0 · cancelled 0 · skipped 0`, duration 68,1 s (forma: 1 teste de topo + 11 subtestes).
- Subtestes `ok` pelo nome: T2.1, T2.2, T2.3, **T2.4** ("--dry-run read-only em 5 estados + controle de escrita"), T2.4b, T2.5, T2.6, T2.7, T2.8, T2.9, **T2.10** ("3 rodadas: duas chamadas simultâneas resolvem → 1/1/1/1/1").
- Leitura do T2.4 no blob (tests/san3-09-bootstrap-platform-admin-db.test.ts):
  - l.236 estados `["limpo","tenant","usuario","convergido","reset"]`; l.237 laço `for … of states.entries()` — **para no 1º estado que falha** (assert dentro do laço).
  - l.241 clone `CREATE DATABASE "erp_san3_09_drill_t24_<i>_<suffix>" TEMPLATE "<modelo>"`; semeadura l.244-249: `tenant`/`usuario` por `seed.tenant.create` (+ `seed.user.create`), `convergido`/`reset` por `bootstrapPlatformAdmin(seed, baseInput)` (conexão sem read only); `limpo` = nada.
  - l.262-263 URL read only: `new URL(url)` + `readOnlyUrl.searchParams.set("options", "-c default_transaction_read_only=on")` (não concatenação).
  - l.250-260 impressão digital: tenants (slug platform), users/ura/credenciais/auditoria **filtrados pelo tenant de plataforma** (0 se não há), + `password_hash`; l.261 antes, l.283 `deepEqual` depois.
  - l.266 `reset` usa `{...baseInput, resetPassword: true}`; l.269-272 relatório esperado por estado `[tenantCreated,userCreated,assignmentCreated,credentialCreated,passwordReset]`: limpo [T,T,T,T,F] · tenant [F,T,T,T,F] · usuario [F,F,T,T,F] · convergido [F,F,F,F,F] · **reset [F,F,F,F,F]**.
  - l.277-279 controle interno: só no `limpo`, `assert.rejects(() => bootstrapPlatformAdmin(readOnly, baseInput), /read-only transaction/i)` (dryRun ausente = false).
  - l.289-303 processo filho: clone `erp_san3_09_drill_t24_process_<suffix>`, `node --import tsx/esm SCRIPT --password-stdin --dry-run` com a senha no stdin → `status === 0`, stdout casa `/nada foi escrito/i`, e `[tenants(slug), users, ura, creds, audits]` **globais** = `[0,0,0,0,0]`.
- **Veredito parcial 1(a): VERDE** (baseline 12/12; T2.4 cobre os 5 estados com sessão read only e controle interno).

### 3(a) parcial — amostragem de sessões no modelo durante o T2 baseline (gravado 2026-10-08T17:49Z)
- Laço no container `j9c2c2-pg` (`timeout 1200`, ~0,2 s por amostra, até arquivo de parada): `SELECT coalesce(max(c),0) FROM (SELECT datname, count(*) c FROM pg_stat_activity WHERE datname LIKE 'erp_san3_09_drill_model_%' GROUP BY 1) s` + contagem de bancos `erp_san3_09_drill_model_%`.
- Resultado: **365 amostras**, `model_sessions=0` em 365/365; o banco-modelo existiu em **161** delas (`model_dbs=1`) — a amostragem cobriu a vida do modelo. **Máximo de sessões no modelo visto = 0.**
- Resíduo depois do T2 **verde** (psql do container pg): `erp_san3_09_drill_%` = **0** · `o6r_b01_%` = **0** · todas as 6 famílias do arnês (`^(o6r_b01|o6r_clone_owner|audit_rls|vid_rls_test|vid_link_rls|rls_test)`) = **0**. Linha de base antes do T2 = 0/0/0.
- Anomalia de terreno minha: o 1º `docker exec j9c2c2-pg touch /tmp/stop` foi convertido pelo MSYS para `C:/Users/AMP/AppData/Local/Temp/stop` e falhou; parada refeita com `sh -c 'touch /tmp/stop'`. Sem efeito na medição.

### 1(c) Matriz 5 × 6 pela minha sonda (gravado 2026-10-08T17:52Z)
- Sonda `/work/zz-j9c2c2-matriz.mts` (verbatim em `$SCRATCH/zz-j9c2c2-matriz.mts`, md5 **a34c64592f05756479e5a34133ed1214** host = container). Mutantes como cópias `/work/scripts/zz-j9c2c2-ma{1..5}.ts` geradas por `/work/zz-j9c2c2-mutar.mjs` (md5 47ecb8cd27bba0604cdfff1c3a0c1144) a partir do script do objeto (md5 995022e1… conferido depois): MA1 âncora `if (dryRun) {` 2× → ocorrência #1, l.231; MA2 a mesma, ocorrência #2, l.276; MA3 `!assignment && !dryRun` 1×, l.301; MA4 `if (!dryRun) {` 1×, l.316; MA5 `if (!dryRun && (` 1×, l.336; cada `diff` = 2 linhas (1 `<` + 1 `>`).
- Forma: modelo `zz_j9c2c2_modelo` criado UMA vez (CREATE DATABASE + `npx prisma migrate deploy` + `npm run --silent db:provision-rbac` como processos filhos com DATABASE_URL só no filho); por célula: `CREATE DATABASE zz_j9c2c2_m_<k> TEMPLATE zz_j9c2c2_modelo` → semeadura por cliente SEM read only (`tenant`: tenant.create; `usuario`: + user.create; `convergido`/`reset`: `bootstrapPlatformAdmin` do **script original** com dryRun ausente — a semeadura nunca passa por código mutado, logo não preciso provar a identidade dos mutantes em `dryRun:false`) → impressão digital **global** das 5 tabelas + `max(password_hash)` + id da plataforma → `bootstrapPlatformAdmin` do mutante sob cliente com `options=-c default_transaction_read_only=on` (por `URL.searchParams.set`), `{dryRun:true}`, `resetPassword:true` só em `reset` → impressão de novo → `DROP DATABASE … WITH (FORCE)` no `finally`. N = 30 células, ec=0, `FIM celulas=30`.

| mutante | limpo | só organização | org + usuário (sem vínculo/credencial) | convergido | convergido + reset |
|---|---|---|---|---|---|
| nenhum (objeto) | OK | OK | OK | OK | OK |
| MA1 | **ERRO** | OK | OK | OK | OK |
| MA2 | OK | **ERRO** | OK | OK | OK |
| MA3 | OK | OK | **ERRO** | OK | OK |
| MA4 | OK | OK | **ERRO** | OK | **ERRO** |
| MA5 | OK | OK | **ERRO** | OK | OK |

- Toda célula ERRO = `cannot execute INSERT in a read-only transaction` (o banco recusou a escrita); em **30/30** células a impressão digital antes = depois (inclusive nas ERRO: a transação desfez).
- Relatórios da linha "nenhum": limpo `[T,T,T,T,F]` tenantId null; tenant `[F,T,T,T,F]`; usuario `[F,F,T,T,F]`; convergido `[F,F,F,F,F]`; reset `[F,F,F,F,F]` (`passwordReset=false`) — iguais aos esperados do T2.4 l.269-272.
- 5ª coluna (ninguém tinha medido): só **MA4** morre no "convergido + reset" (o `upsertCredentialForUser` tenta gravar); MA1/MA2/MA3/MA5 passam lá.
- Comparação com a 5 × 4 do plano (§15.1.4 l.1715-1722, hipótese) por `$SCRATCH/zz-j9c2c2-compara.cjs` (md5 e805bd792c40e3868613d6d648b2401c): 24 células, **0 divergências**, ec=0. **Vermelho-controle:** a mesma comparação numa cópia fabricada com MA3/usuario trocada → `DIVERGE MA3/usuario: plano=ERRO medido=OK`, 1 divergência, ec=1 (**acusou**).
- **Controle da sonda (a sessão morde):** linha nenhum/limpo, a escrita (`dryRun` ausente) sob a MESMA URL read only → `rejeitou: cannot execute INSERT in a read-only transaction`. A coluna "OK" significa "o banco não recebeu escrita".
- **Veredito parcial 1(c): VERDE** — cada MA1–MA5 morre em ≥1 estado na sonda; o objeto passa nos 5.

### 3(a) Clone por template sem conexão pendurada (gravado 2026-10-08T17:52Z)
- Leitura (blob do objeto, -db.test.ts): `CREATE DATABASE … TEMPLATE …` em **5** pontos — l.135 modelo ← drill; l.241 T2.4 (5 clones) ← modelo; l.291 processo T2.4 ← modelo; l.309 T2.4b ← modelo; l.678 T2.10 (3 clones) ← modelo. Sem TEMPLATE (template1 padrão): l.71 drill, l.423 T2.7, l.587 T2.9.
- Clientes abertos no banco de ORIGEM em cada ponto (leitura): l.135 — `drillAdminMigrado` (T2.1) já desconectado no `finally` l.105-107; `migrate deploy`/`provision-rbac` são `spawnSync` já encerrados; `drillClient` só nasce na l.137, DEPOIS do clone; `adminClient` está no banco administrativo → 0. Demais pontos — o modelo **nunca** recebe cliente (nenhum `PrismaClient` aponta para `modelDbName`; todos os clones são do modelo) → 0.
- Por fora (medido): no T2 baseline, máximo de sessões em `erp_san3_09_drill_model_%` = **0** em 365 amostras, 161 com o modelo vivo (seção 4/3(a) parcial).
- **Vermelho-controle:** no container pg, sessão aberta em `zz_j9c2c2_modelo` (`psql … -c "SELECT pg_sleep(15)" &`; `pg_stat_activity` = 1) → `CREATE DATABASE zz_j9c2c2_ctl_sessao TEMPLATE zz_j9c2c2_modelo` → `ERROR: source database "zz_j9c2c2_modelo" is being accessed by other users · DETAIL: There is 1 other session using the database.` ec=1; banco não criado (count 0). A recusa é o que protege: clone com sessão pendurada fica **vermelho**, nunca verde.
- **Veredito parcial 3(a): VERDE.**

## 5. Item 2 — A18 (concorrência)

### 2(a) O T2.10 no objeto — leitura com arquivo:linha (gravado ~2026-10-08T17:52Z)
- tests/san3-09-bootstrap-platform-admin-db.test.ts, blob e277bb6d: l.672 nome **"T2.10 3 rodadas: duas chamadas simultâneas resolvem → 1/1/1/1/1"** (N no nome); l.674 `for (let round = 0; round < 3; …)` → **N = 3**; l.675-678 um clone por rodada `erp_san3_09_drill_t210_<round>_<suffix>` ← modelo; l.680-681 dois `PrismaClient` distintos (A, B) sobre o clone; l.683-692 o **mesmo** e-mail (`concurrent-a-<Date.now()>@example.com`) nos dois inputs; l.694-697 `Promise.allSettled` das duas `bootstrapPlatformAdmin`; l.706-707 **`assert.equal(fulfilled.length, 2, …)`** (nenhuma rejeita — o `>= 1` do ciclo 1 saiu); l.712-719 contagens: `tenants` por slug, `users` pelo relacionamento `tenant.slug = platform`, e `user_role_assignments`, `local_auth_credentials`, `audit_logs` **globais** (sem filtro de organização) → `[1,1,1]`; l.723-727 `DROP DATABASE … WITH (FORCE)` no `finally` com `catch {}`.
- O filtro global importa no clone? Medido na matriz (linha nenhum/limpo, impressão **global** antes): o modelo tem tenants 0 · users 0 · ura 0 · creds 0 · audits 0, e o UNIQUE de `tenants.slug` impede 2ª organização de sistema → no clone, global ≡ por organização. **Não muda o veredito do caso** (a contagem por organização é medida à parte na sonda, 2(c)).
- No baseline 1(a): `ok 11 - T2.10 …`.

### 1(b) MA1–MA5 no T2 (gravado 2026-10-08T17:55:26Z)
- Runner `/work/zz-j9c2c2-runmut.sh` (md5 18745c257c7ee5ac4d0d294b06546807 host = container): `cp` → `/tmp/bootstrap-platform-admin.ts.pristino` (md5 995022e1… = blob) → `zz-j9c2c2-mutar.mjs` por âncora com contagem conferida → `diff` → **T1 sob o mutante** (`timeout 300 node --test --import tsx tests/san3-09-bootstrap-platform-admin.test.ts`) → T2 (`timeout 900`) → `cp` do pristino → `md5sum` = 995022e1… (LF, = `git cat-file blob e277bb6d:scripts/bootstrap-platform-admin.ts | md5sum`). Sequencial, sem limpar o cluster entre rodadas.

| id | âncora (contagem → ocorrência, linha) | diff | T1 sob o mutante | T2 tests/pass/fail | subteste vermelho | mensagem / duração do T2.4 | restauro |
|---|---|---|---|---|---|---|---|
| MA1 | `if (dryRun) {` 2× → #1, l.231 → `if (false && dryRun) {` | 2 l. | 26/26 ec=0 | 12/10/2 ec=1 | **T2.4** (+ topo) | `cannot execute INSERT in a read-only transaction` (DriverAdapterError) · 858 ms | 995022e1 |
| MA2 | `if (dryRun) {` 2× → #2, l.276 | 2 l. | 26/26 | 12/10/2 | **T2.4** | idem · 1151 ms | 995022e1 |
| MA3 | `!assignment && !dryRun` 1×, l.301 → `!assignment` | 2 l. | 26/26 | 12/10/2 | **T2.4** | idem · 1556 ms | 995022e1 |
| MA4 | `if (!dryRun) {` 1×, l.316 → `if (true) {` | 2 l. | 26/26 | 12/10/2 | **T2.4** | idem · 1716 ms | 995022e1 |
| MA5 | `if (!dryRun && (` 1×, l.336 → `if ((` | 2 l. | 26/26 | 12/10/2 | **T2.4** | idem · 1252 ms | 995022e1 |

- Os outros 10 subtestes (T2.1–T2.3, T2.4b–T2.10) ficaram `ok` sob os 5 mutantes: o vermelho é do **T2.4** e da asserção que ele faz (a escrita recusada pela sessão read only), não de quebra de carga (T1 26/26 verde sob cada mutante; o arquivo T2 carregou e executou 12 testes) nem de colapso do arnês.
- **Qual estado:** a falha do T2.4 vem lançada pelo banco (não pela asserção `${state}: …`), então a mensagem não nomeia o estado. Derivo-o, sem herdar: (i) o laço do T2.4 percorre `limpo → tenant → usuario → convergido → reset` e para na 1ª falha; (ii) a minha matriz (1(c)) mostra que MA1 só morre em `limpo`, MA2 só em `tenant`, MA3/MA5 só em `usuario` e MA4 primeiro em `usuario` → o T2.4 morre exatamente nesses estados; (iii) a duração do T2.4 cresce com o estado (MA1 858 ms < MA2 1151 ms < MA3/MA4/MA5 1252–1716 ms), coerente com 1, 2 e 3 iterações. **Não reproduzi** o "0/1 no nível do arquivo" que o dev relatou para MA1/MA2: medi 12/10/2 para os cinco.
- **Veredito parcial 1(b): VERDE** — nenhum MA1–MA5 sobrevive ao T2.4; cada um morre no T2.4, pela recusa de escrita da sessão read only, no estado que a matriz prevê.

### 3(b) parcial — resíduo depois de 5 T2 com caso forçado a falhar (gravado 2026-10-08T17:55Z)
- Sem limpar entre as rodadas (baseline verde + MA1..MA5, todos com T2.4 vermelho): `erp_san3_09_drill_%` = **0** · `o6r_b01_%` = **0** · 6 famílias do arnês = **0**. Bancos vivos no cluster: só `erp_j9c2c2_base` e `zz_j9c2c2_modelo` (meus).

### 1(d) MT-1 — mutação do TESTE (gravado 2026-10-08T17:56:20Z)
- Mesmo runner, alvo `tests/san3-09-bootstrap-platform-admin-db.test.ts` (pristino md5 928d7d294ddfbd6c99d8c4feecb56e92 = blob): âncora `searchParams.set("options"` **1×** → apaga a l.263 `readOnlyUrl.searchParams.set("options", "-c default_transaction_read_only=on");` · diff 1 linha · T1 26/26 (o T1 não importa o -db; a prova de carga do arquivo -db é ele próprio: 12 testes executados) · T2 ec=1, **12/10/2**, vermelho = **T2.4** (+ topo), `error: 'Missing expected rejection.'`, `operator: 'rejects'` — é exatamente o `assert.rejects(…, /read-only transaction/i)` do controle interno (l.278): sem o `options`, a escrita no estado limpo deixa de ser recusada. Restauro md5 = 928d7d29… = blob.
- Controle da minha sonda (1(c)): a escrita sob a URL read only foi rejeitada (`cannot execute INSERT in a read-only transaction`).
- Vermelho-controle do item 1, os três: (i) linha "nenhum" verde nos 5 estados + escrita rejeitada sob read only ✔; (ii) MT-1 vermelho pelo controle interno ✔; (iii) comparação da tabela com a do plano acusou a célula fabricada (MA3/usuario) ✔.
- **Veredito parcial 1(d): VERDE** — a sessão morde e o caso não é verde-cego.

### 2(b) MA6 no T2 (gravado 2026-10-08T17:58:44Z)
- Runner (protocolo restaurável): âncora `SELECT pg_advisory_xact_lock(` **1×** → apaga a l.209 `await tx.$executeRaw\`SELECT pg_advisory_xact_lock(${BOOTSTRAP_ADVISORY_LOCK}::bigint)\`;` · diff 1 linha · T1 26/26 ec=0 sob o mutante (carga ok) · T2 ec=1, **12/10/2**, vermelho = **T2.10** (+ topo), só ele; asserção que acusou: `rodada 1: ambas as execuções devem resolver` — `1 !== 2`, `operator: 'strictEqual'`, expected 2 / actual 1 (a de `fulfilled.length`, l.707), na **rodada 1**, 342 ms. Restauro md5 = 995022e1… = blob.

### 2(c) Frequência na minha sonda (gravado igual)
- Sonda `/work/zz-j9c2c2-corrida.mts` — v1 md5 c32909ff8c769693058b70272c6c9501 (conexões aquecidas com `SELECT 1` antes da disputa); v2 md5 **b4bf728b0b122fce8b2c9c139095a764** = v1 + opção `FRIO=1` (conexão preguiçosa, como o T2.10). Verbatim em `$SCRATCH/zz-j9c2c2-corrida.mts` (v2). Cópia sem trava `/work/scripts/zz-j9c2c2-sem-trava.ts`: `diff` contra o script = **1 linha** (`209d208 < … pg_advisory_xact_lock …`); script do objeto md5 995022e1… intacto.
- Forma: por rodada, clone `zz_j9c2c2_corrida_<lado>_<n>` ← `zz_j9c2c2_modelo`; dois `PrismaClient` distintos; `Promise.allSettled` de duas `bootstrapPlatformAdmin` reais com o **mesmo** e-mail; contagem por **organização de sistema** (tenants slug platform; users/ura/creds/audits `WHERE tenant_id = <id da plataforma>`) e global; `DROP DATABASE … WITH (FORCE)` no `finally`. Container node 20.20.2, sem outra carga minha concorrente (rodadas sequenciais; sessão do Codex só às 19:33Z).

| lado | aquecida N=10 | fria N=10 | total k/N com rejeição | contagens por organização |
|---|---|---|---|---|
| **com** trava (objeto) | 0/10 | 0/10 | **0/20** | 1/1/1/1/1 em 20/20 |
| **sem** trava (MA6) | 10/10 | 10/10 | **20/20** | 1/1/1/1/1 em 20/20 (**mesmo sob MA6**) |

- Mensagem da rejeição (20/20 iguais): ``Invalid `tx.tenant.create()` invocation in /work/scripts/zz-j9c2c2-sem-trava.ts:243:34 … → 243 tenant = await tx.tenant.create( Unique constraint failed on …`` — nasce em `tx.tenant.create()` (o UNIQUE de `tenants.slug`), como o plano dizia.
- Contagem sozinha não discrimina: sem a trava o resultado no banco é 1/1/1/1/1 do mesmo jeito (o perdedor desfaz); só o `fulfilled.length === 2` separa.
- **Probabilidade de o T2.10 (N=3) ficar verde sob MA6:** p medido = 20/20 = 1 → (1 − p)^3 = **0** (estimativa pontual). Limite superior de 95 % para a sobrevivência por rodada com 0/20: 1 − 0,05^(1/20) = 0,139 → (0,139)^3 ≈ **0,0027**; só com as 10 frias (as condições do T2.10): 0,259^3 ≈ 0,017. Mais o MA6 real no T2: morreu na **rodada 1** (1/1). O caso mata MA6 com confiança ≥ 98 % mesmo no pior limite medido.
- **Vermelho-controle:** a sonda sem trava rejeitou em ≥1/N (20/20) ✔; com a trava, 0/20 ✔; a contagem por organização num clone em que inseri à mão um 2º usuário na organização de sistema (rodada com/1) → `[1,2,1,1,1]` (**deu 2**) ✔.
- **Veredito parcial item 2: VERDE** — o objeto resolve AMBAS e converge 1/1/1/1/1 em 20/20 rodadas; o T2.10 declara N=3 no nome, exige `fulfilled.length === 2` e mata MA6.

### 3(b) — resíduo depois de um T2 com falha MAIS ADIANTE (MA6 no T2.10) (gravado igual)
- Acumulado sem limpar (baseline + MA1..MA5 + MT-1 + MA6 = 8 execuções do T2, 7 com caso forçado a falhar): `erp_san3_09_drill_%` = **0** · `o6r_b01_%` = **0** · 6 famílias do arnês = **0**. (`LIKE` trata `_` como curinga: o padrão é um superconjunto do prefixo literal — conta mais, nunca menos.)
- **Vermelho-controle do contador:** `CREATE DATABASE erp_san3_09_drill_zz_controle` → contagem `erp_san3_09_drill_zz_%` 0 → **1** → `DROP DATABASE` → 0 (padrão estreito para não colidir com o T2 que corria ao lado; o banco de controle também casa `erp_san3_09_drill_%`).
- Leitura do `finally` externo (l.730-748): `adminClient.$disconnect()` (l.741) **antes** dos dois `DROP DATABASE` (l.743, l.746) pelo mesmo cliente, ambos em `try { … } catch { /* ignore */ }`. **Medido:** em 8/8 execuções o drill e o modelo foram derrubados (0 resíduo) — o Prisma 7.8 + `@prisma/adapter-pg` reabre a conexão depois do `$disconnect`. A ordem não deixa resíduo hoje; o `catch {}` engoliria uma falha de `DROP` em silêncio (não ocorreu em nenhuma das 8).
- **Veredito parcial 3(b): VERDE** (0 banco e 0 papel, verde e com falha forçada em dois pontos diferentes).

### 1(e) Processo filho no limpo, e sob MA1 (gravado 2026-10-08T18:01:23Z)
- Script `/work/zz-j9c2c2-cli.sh` (md5 a4e04123c1eb4a4201fc84937e34baa2 host = container): clona o modelo, semeia (`convergido` = execução real do script ORIGINAL), roda o CLI `node --import tsx/esm <script> <flags>` com a senha **no stdin** e `DATABASE_URL`/`PLATFORM_ADMIN_EMAIL` só no ambiente do comando, conta `[tenants slug platform, users, ura, creds, audits]` globais + md5 (8 hex) do `max(password_hash)` antes/depois, e derruba o clone. Saída em `$SCRATCH/cli.log`.
- **E0 — objeto, limpo, `--password-stdin --dry-run`:** ec=0; stdout "modo: simulação (--dry-run) … a criar … simulação encerrada — nada foi escrito no banco."; contagens antes `[0,0,0,0,0]` → depois **`[0,0,0,0,0]`**. O processo filho do objeto no limpo **não escreve** ✔.
- **E1 — MA1 (cópia `/work/scripts/zz-j9c2c2-ma1.ts`, `main()` dispara porque `import.meta.url === file://argv[1]`), limpo, `--password-stdin --dry-run`:** ec=0; stdout diz "organização de sistema "platform": a criar (f3489920-…)" e "**nada foi escrito no banco**"; contagens depois **`[1,0,0,0,0]`** — o mutante GRAVA a organização (o 2º guarda devolve antes do usuário e a transação confirma) e o relatório mente. A asserção do processo filho no T2.4 (l.301, `[0,0,0,0,0]`) ficaria vermelha por ela.
- Mas **no T2 sob MA1 o processo filho nunca roda**: o laço dos 5 estados aborta no `limpo` (1(b)). Logo o processo filho não é a linha que mata MA1 no T2 — é o T2.4/limpo. Para provar que a linha do processo filho está VIVA no T2, rodei uma mutação nova que só ela vê: **MM1** — em `main()`, âncora `{ dryRun: flags.dryRun }` 1× (l.404) → `{ dryRun: false }` (o CLI ignora `--dry-run`); `zz-j9c2c2-mutar.mjs` agora md5 f65ee17da088162c8622822b0c62028f (+1 caso). T1 26/26 sob MM1; T2 ec=1 **12/10/2**, vermelho = **T2.4**, `The input did not match the regular expression /nada foi escrito/i`, input "modo: aplicar … criada … CONVERGIDO" (operator `match`, l.298) — os 5 estados passam (eles chamam a função, não o `main`) e o processo filho acusa. Restauro md5 995022e1… = blob.
- **Veredito parcial 1(e): VERDE** (objeto não escreve no limpo; a linha do processo filho está viva no T2 — matou MM1; sob MA1 isolado, o processo grava 1 organização e diria "nada foi escrito", o que a asserção l.301 pegaria).

### 1(f) Relatório do dry-run no "convergido com reset" × execução real (gravado igual)
- **F1 — objeto, convergido, `--password-stdin --reset-password --dry-run`:** ec=0; stdout `… usuário já existia · vínculo super_admin já existia · credencial já existia (senha mantida)` + `simulação encerrada — nada foi escrito no banco.`; contagens `[1,1,1,1,1]` → `[1,1,1,1,1]`, hash 1a363abc → 1a363abc. Relatório da função no mesmo estado (matriz 1(c), nenhum/reset): `passwordReset=false`, `credentialCreated=false`.
- **F2 — objeto, clone igual, `--password-stdin --reset-password` (real):** ec=0; stdout `… credencial senha redefinida` + `CONVERGIDO …`; contagens `[1,1,1,1,1]` → **`[1,1,1,1,2]`** (auditoria +1), hash 325f5004 → **cd6504da** (a senha muda).
- **F3 — controle, convergido, `--password-stdin --dry-run` SEM reset:** stdout **idêntico ao F1** (`credencial já existia (senha mantida)`), contagens e hash iguais.
- **Conclusão medida:** com `--reset-password`, a simulação diz ao operador "senha mantida" — **o contrário** do que a execução real faz ("senha redefinida", hash trocado, auditoria +1) — e a sua saída é indistinguível da simulação sem `--reset-password`. O A11 (não escrever) vale; o "relatório coerente com o estado" do §15.1.4 item 2 **não** vale nesse estado. A causa está no corpo congelado: `passwordReset` só vira `true` dentro de `if (!dryRun)` (script l.315-332), e `main()` l.413 imprime `report.passwordReset ? "senha redefinida" : "já existia (senha mantida)"`. O T2.4 (l.271) **fixa** `reset: [false,false,false,false,false]` como esperado.
- Origem e escopo: `git log --diff-filter=A --format='%h %ad' -- scripts/bootstrap-platform-admin.ts` → `399d1fef Thu Oct 1 21:43:14 2026` (E1 do ciclo 1, B-SAN3-09) — o script e a classe **nasceram neste bloco**; o §15.3 congelou o corpo no ciclo 2 (só `BOOTSTRAP_FLAGS`/`parseArgv`/união/tipo), por isso o dev não podia mudá-lo e declarou a divergência (`DEV-ciclo2-relatorio.md`, seção "Divergência registrada"). Leitura do §C7.1-ter(a) aplicada: **dentro-do-bloco** (a classe não antecede o bloco; o congelamento é do CICLO, não do bloco — não o leio como "fora do escopo permitido" do bloco).
- Gravidade que atribuo: **ajuste** (não `bloqueia`): nada é escrito na simulação (A11 íntegro nos 5 estados); a ação real é a que o operador pediu explicitamente pela flag e fica auditada; o Runbook B manda "simulação primeiro" para a criação, e para "Senha perdida: `--reset-password`" não prescreve simulação (docs/deployment.md l.181-194); não há perda nem vazamento de dado nem quebra de permissão. A propriedade ausente: *o relatório da simulação descreve, para a credencial, o contrário do que a execução faz quando `--reset-password` é passado.*
- E contra a régua: o §15.1.4 item 2 pediu "o relatório coerente com o estado" nos 5 estados, e o §15.3 congelou o corpo que produz o relatório — **critério que não podia passar dentro do escopo do ciclo** (o planejador não mediu o 5º estado, l.1758). Registro como achado contra a régua, não contra o dev.

## 6. Fecho (gravado 2026-10-08T18:04:09Z)

### Legalidade no fim
- 18:01:48Z: `git ls-remote` ramo = **e277bb6dd7da706cba8e023aaf785d077db721f6** = `gh pr view 400 headRefOid` (OPEN, draft, CONFLICTING) → **o objeto não andou**; `origin/main` = c8af64580cb85ddf4960fecb2f8604384f8f0328 (não andou).
- Check-runs no objeto e277bb6d (fim): **total=7 · não-verdes=0 · pendentes=0** — docker, flutter, owner-portal, backend, **backend-postgres (job -db, success 17:42:41Z)**, authority-portal, frontend, todos completed/success. A CI do head que julguei concluiu verde.

### Achados
- **C2c2-A1 — ajuste — dentro-do-bloco.** O relatório da simulação descreve, para a credencial, o contrário do que a execução faz quando `--reset-password` é passado: dry-run "credencial já existia (senha mantida)" / `passwordReset=false`; real "credencial senha redefinida", hash trocado, auditoria +1 (1(f), F1×F2×F3). Origem: script nascido no bloco (`399d1fef`, 2026-10-01, ciclo 1); corpo congelado pelo §15.3 no ciclo 2. Não grava nada (A11 íntegro). Vira pendência nomeada; dono a definir pelo orquestrador (candidato: o bloco que já recebe a saída de CLI ao operador, `B-SAN3-10`, onde vive `P-SAN3-09-FALHOU-SEM-CAUSA`).
- **C2c2-R1 — contra a régua (nota).** O §15.1.4 item 2 pede "o relatório coerente com o estado" nos 5 estados e o §15.3 congela o corpo que produz o relatório: no estado "convergido com reset" o critério **não podia passar** dentro do escopo do ciclo (o planejador não mediu esse estado, plano l.1758); o T2.4 l.271 fixa `reset: [F,F,F,F,F]` como esperado — um conserto futuro do relatório deixará o T2.4 vermelho.
- **C2c2-N1 — nota — dentro-do-bloco.** `finally` externo do -db.test.ts (l.741-747): `adminClient.$disconnect()` antes dos dois `DROP DATABASE` pelo mesmo cliente, erros engolidos por `catch {}`. Medido: 0 resíduo depois de 9 execuções do T2 acumuladas sem limpar (1 verde + 8 com falha forçada: MA1–MA5, MT-1, MM1 no T2.4; MA6 no T2.10) — o Prisma 7.8 reabre a conexão. Hoje não deixa rastro; uma falha de `DROP` passaria em silêncio.
- **C2c2-N2 — nota.** Sob MA1 o processo filho do T2.4 não chega a rodar (o laço aborta no `limpo`), embora o plano liste "o processo filho" entre os vermelhos de MA1. Isolado, o CLI sob MA1 grava 1 organização e imprime "nada foi escrito" (a asserção l.301 pegaria). A linha do processo filho está viva no T2: matou a mutação nova MM1.
- **Nota de reprodução:** o "0/1 no nível do arquivo" que o dev relatou para MA1/MA2 não se reproduziu: medi 12/10/2 (T2.4 + topo) para os cinco MA.

### O que ficou sem medir
- Nada dos 3 itens ficou sem medir. Fora do mandato (não medido por desenho): T2.4b, T2.9/M-1, M-2, MF*, conjunto de flags, Runbook (C1); guard AST, MF1/MF2, escopo do dev por laço (C3).

### Limpeza (gravado 2026-10-08T18:04:09Z)
- Bancos: `DROP DATABASE zz_j9c2c2_modelo` e `erp_j9c2c2_base` (os meus); contagens finais no meu cluster: `zz\_j9c2c2\_%` = **0** · `erp\_san3\_09\_drill\_%` = **0** · 6 famílias de papel = **0**.
- Sondas e mutantes removidos de `/work` (`ls` → nenhum `zz-*`); script e -db.test.ts dentro do container com md5 = blob (995022e1… / 928d7d29…) antes da remoção.
- Containers `j9c2c2-node`, `j9c2c2-pg`, `j9c2c2-redis` removidos por `docker rm -f -v` (contagem `name=j9c2c2` = 0); os 2 volumes anônimos (pg 4c2aa489…, redis ad9e5303…) **removidos** (`docker volume inspect` falha); `docker volume ls` 18 → 16 (os 16 alheios do inspetor intactos, nunca prune); rede `j9c2c2-net` removida (contagem 0).
- Worktree `C:/Users/AMP/w-j9c2c2`: `status --porcelain` = 0; processos com o caminho = **0** (PowerShell `Get-CimInstance`); `git worktree remove --force` ec=0; `test -e` → removido; `worktree list | grep -ic w-j9c2c2` = **0**. Disco: 12G livres.
- `$SCRATCH`: `pgpw.secret`, o pristino do teste e as cópias do script apagados; ficam só logs e as sondas (texto no Anexo A).
- Base viva `erp-postgres`/`erp-redis` nunca tocada (Exited). Em `w-nuv09` escrevi só `C2c2-evidencia.md` e `C2c2-voto.json` (`git status`: só esses dois `??` além dos ` M` fantasma de `.agents/`). Não li `C1c2-*` (o `git grep -l` do nome da minha identidade listou `C1c2-voto.json` como arquivo que contém o nome — conteúdo não aberto).

VOTO: APROVADO — dry-run sem escrita nos 5 estados pelo próprio banco (sessão read only que morde, MT-1 vermelho), MA1–MA5 mortos pelo T2.4 no estado certo e na matriz 5 × 5 (MA1 limpo · MA2 só organização · MA3/MA5 org+usuário · MA4 org+usuário e reset), relatório do reset graduado como ajuste dentro-do-bloco (simulação diz "senha mantida", execução redefine); T2.10 com N=3, MA6 vermelho na rodada 1, corrida sem lock 20/20 e (1 − p)^3 = 0 (≤ 0,0027 a 95 %); arnês: clones sem sessão pendurada (máx 0 em 365 amostras), 0 resíduo verde e com falha forçada (9 execuções acumuladas), ratchet vazio e guard acusando, corpo congelado com md5 igual ao ciclo 1 nas 6 funções e hunks só nas 4 regiões

> Adendo à seção 3(b) (gravado 2026-10-08T18:05Z): a contagem de 17:57Z cobria 8 execuções (baseline + MA1..MA5 + MT-1 + MA6). Depois dela rodei MM1 (9ª execução, T2.4 vermelho); a contagem final de 18:01:58Z, antes de derrubar os meus bancos, deu `erp_san3_09_drill_%` = 0 e papéis = 0 — 0 resíduo após 9 execuções, 8 com falha forçada.

## Anexo A — sondas e ferramentas, texto verbatim (gravado 2026-10-08T18:03:35Z)

### zz-j9c2c2-matriz.mts — md5 a34c64592f05756479e5a34133ed1214

````
// Sonda da cadeira C2 (junta 2, B-SAN3-09): matriz {nenhum, MA1..MA5} x 5 estados, dry-run sob sessão READ ONLY.
// Roda em /work (container). DATABASE_URL = banco administrativo do cluster descartável. Uma linha JSON por célula.
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const base = process.env.DATABASE_URL!;
const MODEL = "zz_j9c2c2_modelo";
const urlFor = (db: string, ro = false) => {
  const u = new URL(base); u.pathname = `/${db}`;
  if (ro) u.searchParams.set("options", "-c default_transaction_read_only=on");
  return u.toString();
};
const client = (url: string) => new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const out = (o: unknown) => console.log("CELULA " + JSON.stringify(o));

const admin = client(base);
const exists = await admin.$queryRawUnsafe<Array<{ n: bigint }>>(`SELECT count(*)::bigint n FROM pg_database WHERE datname='${MODEL}'`);
if (Number(exists[0].n) === 0) {
  await admin.$executeRawUnsafe(`CREATE DATABASE "${MODEL}"`);
  const env = { ...process.env, DATABASE_URL: urlFor(MODEL) };
  const m = spawnSync("npx", ["prisma", "migrate", "deploy"], { env, encoding: "utf8", timeout: 300_000 });
  const p = spawnSync("npm", ["run", "--silent", "db:provision-rbac"], { env, encoding: "utf8", timeout: 120_000 });
  out({ modelo: MODEL, migrate: m.status, provision: p.status });
  if (m.status !== 0 || p.status !== 0) { console.log(m.stdout, m.stderr, p.stdout, p.stderr); process.exit(4); }
}

const orig = await import(pathToFileURL("/work/scripts/bootstrap-platform-admin.ts").href);
const mutantIds = (process.env.MUTANTES ?? "nenhum,MA1,MA2,MA3,MA4,MA5").split(",");
const states = ["limpo", "tenant", "usuario", "convergido", "reset"] as const;
const EMAIL = "matriz-j9c2c2@example.com";
const PASS = "SondaJ9c2c2-Matriz!";
const baseInput = orig.readBootstrapInput({ PLATFORM_ADMIN_EMAIL: EMAIL, PLATFORM_ADMIN_PASSWORD: PASS, PLATFORM_ADMIN_NAME: "Sonda" },
  { dryRun: false, passwordStdin: false, resetPassword: false });

const fingerprint = async (c: PrismaClient) => {
  const t = await c.tenant.findUnique({ where: { slug: orig.PLATFORM_TENANT_SLUG }, select: { id: true } });
  const q = async (sql: string) => Number((await c.$queryRawUnsafe<Array<{ n: bigint }>>(sql))[0].n);
  return {
    tenants: await q("SELECT count(*)::bigint n FROM tenants"),
    users: await q("SELECT count(*)::bigint n FROM users"),
    ura: await q("SELECT count(*)::bigint n FROM user_role_assignments"),
    creds: await q("SELECT count(*)::bigint n FROM local_auth_credentials"),
    audits: await q("SELECT count(*)::bigint n FROM audit_logs"),
    hash: (await c.$queryRawUnsafe<Array<{ h: string | null }>>("SELECT max(password_hash) h FROM local_auth_credentials"))[0].h,
    platform: t?.id ?? null,
  };
};

let cell = 0;
for (const mid of mutantIds) {
  const mod = mid === "nenhum" ? orig : await import(pathToFileURL(`/work/scripts/zz-j9c2c2-${mid.toLowerCase()}.ts`).href);
  for (const state of states) {
    cell += 1;
    const db = `zz_j9c2c2_m_${cell}`;
    await admin.$executeRawUnsafe(`CREATE DATABASE "${db}" TEMPLATE "${MODEL}"`);
    const seed = client(urlFor(db));
    const ro = client(urlFor(db, true));
    try {
      if (state === "tenant" || state === "usuario") {
        const t = await seed.tenant.create({ data: { name: "Plataforma", slug: orig.PLATFORM_TENANT_SLUG, status: "active", modules: [] } });
        if (state === "usuario") await seed.user.create({ data: { tenant_id: t.id, name: "Sonda", email: EMAIL, status: "active" } });
      } else if (state === "convergido" || state === "reset") {
        await orig.bootstrapPlatformAdmin(seed, baseInput);
      }
      const before = await fingerprint(seed);
      const input = state === "reset" ? { ...baseInput, resetPassword: true } : baseInput;
      let result: string; let report: unknown = null;
      try {
        report = await mod.bootstrapPlatformAdmin(ro, input, { dryRun: true });
        result = "OK";
      } catch (e) {
        result = "ERRO: " + String(e instanceof Error ? e.message : e).replace(/\s+/g, " ").slice(-140);
      }
      const after = await fingerprint(seed);
      const same = JSON.stringify(before) === JSON.stringify(after);
      let controle: string | undefined;
      if (mid === "nenhum" && state === "limpo") {
        try { await orig.bootstrapPlatformAdmin(ro, baseInput); controle = "ESCREVEU (sessão NÃO morde)"; }
        catch (e) { controle = "rejeitou: " + String(e instanceof Error ? e.message : e).replace(/\s+/g, " ").slice(-120); }
      }
      out({ mutante: mid, estado: state, resultado: result, report, impressao_igual: same, antes: before, depois: after, controle_escrita_ro: controle });
    } finally {
      await seed.$disconnect(); await ro.$disconnect();
      await admin.$executeRawUnsafe(`DROP DATABASE "${db}" WITH (FORCE)`);
    }
  }
}
await admin.$disconnect();
console.log("FIM celulas=" + cell);
````

### zz-j9c2c2-corrida.mts — md5 b4bf728b0b122fce8b2c9c139095a764

````
// Sonda da cadeira C2 (junta 2, B-SAN3-09): corrida de duas execuções reais simultâneas, mesmo e-mail, banco limpo.
// LADO=com (script do objeto) | sem (cópia sem pg_advisory_xact_lock). N rodadas. Uma linha JSON por rodada.
import { pathToFileURL } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const base = process.env.DATABASE_URL!;
const MODEL = "zz_j9c2c2_modelo";
const LADO = process.env.LADO ?? "com";
const N = Number(process.env.N ?? "10");
const CONTROLE = process.env.CONTROLE === "1";
const urlFor = (db: string) => { const u = new URL(base); u.pathname = `/${db}`; return u.toString(); };
const client = (url: string) => new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const mod = await import(pathToFileURL(LADO === "sem" ? "/work/scripts/zz-j9c2c2-sem-trava.ts" : "/work/scripts/bootstrap-platform-admin.ts").href);
const admin = client(base);
const q = async (c: PrismaClient, sql: string, ...p: unknown[]) => Number((await c.$queryRawUnsafe<Array<{ n: bigint }>>(sql, ...p))[0].n);

const contar = async (c: PrismaClient) => {
  const t = await c.$queryRawUnsafe<Array<{ id: string }>>("SELECT id::text FROM tenants WHERE slug = 'platform'");
  const pid = t[0]?.id ?? null;
  const porOrg = pid === null ? [t.length, 0, 0, 0, 0] : [
    t.length,
    await q(c, "SELECT count(*)::bigint n FROM users WHERE tenant_id = $1::uuid", pid),
    await q(c, "SELECT count(*)::bigint n FROM user_role_assignments WHERE tenant_id = $1::uuid", pid),
    await q(c, "SELECT count(*)::bigint n FROM local_auth_credentials WHERE tenant_id = $1::uuid", pid),
    await q(c, "SELECT count(*)::bigint n FROM audit_logs WHERE tenant_id = $1::uuid", pid),
  ];
  const globais = [
    await q(c, "SELECT count(*)::bigint n FROM tenants"), await q(c, "SELECT count(*)::bigint n FROM users"),
    await q(c, "SELECT count(*)::bigint n FROM user_role_assignments"), await q(c, "SELECT count(*)::bigint n FROM local_auth_credentials"),
    await q(c, "SELECT count(*)::bigint n FROM audit_logs"),
  ];
  return { pid, porOrg, globais };
};

let rejeitadas = 0;
for (let n = 1; n <= N; n++) {
  const db = `zz_j9c2c2_corrida_${LADO}_${n}`;
  await admin.$executeRawUnsafe(`CREATE DATABASE "${db}" TEMPLATE "${MODEL}"`);
  const A = client(urlFor(db)); const B = client(urlFor(db)); const V = client(urlFor(db));
  try {
    const email = `corrida-j9c2c2-${n}@example.com`;
    const input = mod.readBootstrapInput({ PLATFORM_ADMIN_EMAIL: email, PLATFORM_ADMIN_PASSWORD: "SondaJ9c2c2-Corrida!" },
      { dryRun: false, passwordStdin: false, resetPassword: false });
    if (process.env.FRIO !== "1") await Promise.all([A.$queryRawUnsafe("SELECT 1"), B.$queryRawUnsafe("SELECT 1")]); // conexões quentes (FRIO=1: conexão preguiçosa, como o T2.10)
    const r = await Promise.allSettled([mod.bootstrapPlatformAdmin(A, input), mod.bootstrapPlatformAdmin(B, input)]);
    const resolvidas = r.filter((x) => x.status === "fulfilled").length;
    if (resolvidas < 2) rejeitadas++;
    const msgs = r.filter((x): x is PromiseRejectedResult => x.status === "rejected")
      .map((x) => String(x.reason instanceof Error ? x.reason.message : x.reason).replace(/\s+/g, " ").slice(0, 220));
    const cont = await contar(V);
    let controle: unknown;
    if (CONTROLE && n === 1 && cont.pid) {
      await V.$executeRawUnsafe("INSERT INTO users (id, tenant_id, name, email, status, created_at, updated_at) VALUES (gen_random_uuid(), $1::uuid, 'controle', 'controle-2o@example.com', 'active', now(), now())", cont.pid);
      controle = await contar(V);
    }
    console.log("RODADA " + JSON.stringify({ lado: LADO, n, resolvidas, msgs, ...cont, controle }));
  } finally {
    await A.$disconnect(); await B.$disconnect(); await V.$disconnect();
    await admin.$executeRawUnsafe(`DROP DATABASE "${db}" WITH (FORCE)`);
  }
}
await admin.$disconnect();
console.log(`FIM lado=${LADO} N=${N} rodadas_com_rejeicao=${rejeitadas}`);
````

### zz-j9c2c2-mutar.mjs — md5 f65ee17da088162c8622822b0c62028f

````
// Uso: node zz-j9c2c2-mutar.mjs <origem> <destino> <MA1|MA2|MA3|MA4|MA5|MA6|MT1>
// Aplica UMA mutação por âncora de texto; aborta (exit 3) se a contagem da âncora não for a esperada.
import { readFileSync, writeFileSync } from "node:fs";
const [src, dst, id] = process.argv.slice(2);
const text = readFileSync(src, "utf8");
const count = (s) => text.split(s).length - 1;
function replaceNth(anchor, repl, nth, expectedCount) {
  const c = count(anchor);
  if (c !== expectedCount) { console.error(`ANCORA "${anchor}" ocorre ${c}x (esperado ${expectedCount})`); process.exit(3); }
  let idx = -1;
  for (let i = 0; i <= nth; i++) idx = text.indexOf(anchor, idx + 1);
  const line = text.slice(0, idx).split("\n").length;
  console.log(`${id}: ancora "${anchor}" ocorre ${c}x; troca a ocorrencia #${nth + 1} na linha ${line}`);
  return text.slice(0, idx) + repl + text.slice(idx + anchor.length);
}
function deleteLineWith(anchor) {
  const c = count(anchor);
  if (c !== 1) { console.error(`ANCORA "${anchor}" ocorre ${c}x (esperado 1)`); process.exit(3); }
  const lines = text.split("\n");
  const i = lines.findIndex((l) => l.includes(anchor));
  console.log(`${id}: ancora "${anchor}" ocorre 1x; apaga a linha ${i + 1}: ${lines[i].trim()}`);
  lines.splice(i, 1);
  return lines.join("\n");
}
let out;
switch (id) {
  case "MA1": out = replaceNth("if (dryRun) {", "if (false && dryRun) {", 0, 2); break;
  case "MA2": out = replaceNth("if (dryRun) {", "if (false && dryRun) {", 1, 2); break;
  case "MA3": out = replaceNth("!assignment && !dryRun", "!assignment", 0, 1); break;
  case "MA4": out = replaceNth("if (!dryRun) {", "if (true) {", 0, 1); break;
  case "MA5": out = replaceNth("if (!dryRun && (", "if ((", 0, 1); break;
  case "MA6": out = deleteLineWith("SELECT pg_advisory_xact_lock("); break;
  case "MT1": out = deleteLineWith('searchParams.set("options"'); break;
  case "MM1": out = replaceNth("{ dryRun: flags.dryRun }", "{ dryRun: false }", 0, 1); break;
  default: console.error("id desconhecido"); process.exit(2);
}
writeFileSync(dst, out);
````

### zz-j9c2c2-runmut.sh — md5 18745c257c7ee5ac4d0d294b06546807

````
#!/bin/sh
# Uso (dentro do container j9c2c2-node): sh /work/zz-j9c2c2-runmut.sh <ID> <arquivo-relativo-a-/work>
# Protocolo restaurável: pristino -> mutação por âncora -> diff -> T1 (prova de carga) -> T2 -> restauro -> md5.
ID="$1"; F="$2"; B=$(basename "$F")
cd /work || exit 9
. /root/.dbenv; export DATABASE_URL REDIS_URL CORE_SAAS_PERSISTENCE
P="/tmp/$B.pristino"
[ -f "$P" ] || cp "/work/$F" "$P"
echo "== $ID inicio $(date -u +%FT%TZ) pristino_md5=$(md5sum < "$P" | cut -c1-32)"
node /work/zz-j9c2c2-mutar.mjs "$P" "/work/$F" "$ID" || { echo "MUTACAO FALHOU"; cp "$P" "/work/$F"; exit 3; }
echo "== diff (linhas -/+): $(diff "$P" "/work/$F" | grep -c '^[<>]')"; diff "$P" "/work/$F"
timeout 300 node --test --import tsx tests/san3-09-bootstrap-platform-admin.test.ts > "/tmp/t1-$ID.log" 2>&1; echo "== T1 ec=$? $(grep -E '^# (tests|pass|fail)' /tmp/t1-$ID.log | tr '\n' ' ')"
timeout 900 node --test --import tsx tests/san3-09-bootstrap-platform-admin-db.test.ts > "/tmp/t2-$ID.log" 2>&1; echo "== T2 ec=$? $(grep -E '^# (tests|pass|fail|cancelled)' /tmp/t2-$ID.log | tr '\n' ' ')"
grep -E '^ *(not ok|ok) [0-9]' "/tmp/t2-$ID.log"
cp "$P" "/work/$F"
echo "== restauro md5=$(md5sum < "/work/$F" | cut -c1-32) fim $(date -u +%FT%TZ)"
````

### zz-j9c2c2-cli.sh — md5 a4e04123c1eb4a4201fc84937e34baa2

````
#!/bin/sh
# Uso (no container node): sh /work/zz-j9c2c2-cli.sh <db> <script> <estado:limpo|convergido> <flags...>
# Clona o modelo, semeia (convergido = execução real do script ORIGINAL), roda o CLI com a senha no stdin, conta as 5 tabelas.
DB="$1"; SCRIPT="$2"; ESTADO="$3"; shift 3
cd /work || exit 9
. /root/.dbenv; export REDIS_URL CORE_SAAS_PERSISTENCE
PSQL="psql"; command -v psql >/dev/null 2>&1 || PSQL=""
U=$(node -e 'const u=new URL(process.argv[1]);u.pathname="/"+process.argv[2];console.log(u.toString())' "$DATABASE_URL" "$DB")
node -e 'const {PrismaClient}=require("@prisma/client");const {PrismaPg}=require("@prisma/adapter-pg");const c=new PrismaClient({adapter:new PrismaPg({connectionString:process.argv[1]})});c.$executeRawUnsafe(`CREATE DATABASE "${process.argv[2]}" TEMPLATE "zz_j9c2c2_modelo"`).then(()=>c.$disconnect()).then(()=>console.log("clone ok"))' "$DATABASE_URL" "$DB"
EMAIL="cli-j9c2c2@example.com"
if [ "$ESTADO" = "convergido" ]; then
  printf 'SondaJ9c2c2-CliOrig!\n' | DATABASE_URL="$U" PLATFORM_ADMIN_EMAIL="$EMAIL" timeout 120 node --import tsx/esm /work/scripts/bootstrap-platform-admin.ts --password-stdin > /tmp/cli-$DB-seed.out 2>&1; echo "semeadura ec=$?"
fi
cnt() { node -e 'const {PrismaClient}=require("@prisma/client");const {PrismaPg}=require("@prisma/adapter-pg");const c=new PrismaClient({adapter:new PrismaPg({connectionString:process.argv[1]})});(async()=>{const q=async s=>Number((await c.$queryRawUnsafe(s))[0].n);const h=(await c.$queryRawUnsafe("SELECT max(password_hash) h FROM local_auth_credentials"))[0].h;const crypto=require("crypto");console.log(process.argv[2],JSON.stringify([await q("SELECT count(*)::bigint n FROM tenants WHERE slug=$$platform$$"),await q("SELECT count(*)::bigint n FROM users"),await q("SELECT count(*)::bigint n FROM user_role_assignments"),await q("SELECT count(*)::bigint n FROM local_auth_credentials"),await q("SELECT count(*)::bigint n FROM audit_logs")]),"hash_md5="+(h?crypto.createHash("md5").update(h).digest("hex").slice(0,8):"null"));await c.$disconnect()})()' "$U" "$1"; }
cnt antes
printf 'SondaJ9c2c2-CliNova!\n' | DATABASE_URL="$U" PLATFORM_ADMIN_EMAIL="$EMAIL" timeout 120 node --import tsx/esm "$SCRIPT" "$@" > /tmp/cli-$DB.out 2>&1; echo "cli ec=$? flags=$*"
sed 's/^/  | /' /tmp/cli-$DB.out
cnt depois
node -e 'const {PrismaClient}=require("@prisma/client");const {PrismaPg}=require("@prisma/adapter-pg");const c=new PrismaClient({adapter:new PrismaPg({connectionString:process.argv[1]})});c.$executeRawUnsafe(`DROP DATABASE "${process.argv[2]}" WITH (FORCE)`).then(()=>c.$disconnect()).then(()=>console.log("drop ok"))' "$DATABASE_URL" "$DB"
````

### zz-j9c2c2-compara.cjs — md5 e805bd792c40e3868613d6d648b2401c

````
// Compara a tabela medida (matriz.log) com a 5x4 do plano §15.1.4 (l.1715-1722). argv[3] opcional = "fabricar" troca UMA célula da medida.
const fs = require("fs");
const plano = { nenhum: ["OK","OK","OK","OK"], MA1: ["ERRO","OK","OK","OK"], MA2: ["OK","ERRO","OK","OK"],
  MA3: ["OK","OK","ERRO","OK"], MA4: ["OK","OK","ERRO","OK"], MA5: ["OK","OK","ERRO","OK"] };
const st = ["limpo","tenant","usuario","convergido"];
const L = fs.readFileSync(process.argv[2], "utf8").split("\n").filter(l => l.startsWith("CELULA ")).map(l => JSON.parse(l.slice(7))).filter(c => c.mutante);
const med = {}; for (const c of L) (med[c.mutante] ||= {})[c.estado] = c.resultado === "OK" ? "OK" : "ERRO";
if (process.argv[3] === "fabricar") { med.MA3.usuario = med.MA3.usuario === "OK" ? "ERRO" : "OK"; console.log("FABRICADA: MA3/usuario trocada"); }
let div = 0, n = 0;
for (const m of Object.keys(plano)) st.forEach((s, i) => { n++; if (plano[m][i] !== med[m][s]) { div++; console.log(`DIVERGE ${m}/${s}: plano=${plano[m][i]} medido=${med[m][s]}`); } });
console.log(`celulas comparadas=${n} divergencias=${div}`);
process.exit(div ? 1 : 0);
````

### zz-j9c2c2-extrator.cjs — md5 d58eb7c5efbe6eb4fbf3bc3ec3264710

````
// Extrator AST: lê um arquivo TS (caminho em argv[2]) e imprime "<nome> <md5 EOL-neutro do texto> <linhas>"
// para as funções nomeadas em argv[3..]. Usa o typescript do worktree (require resolvido por NODE_PATH/cwd).
const ts = require(process.cwd() + "/node_modules/typescript");
const fs = require("fs");
const crypto = require("crypto");
const file = process.argv[2];
const names = process.argv.slice(3);
const text = fs.readFileSync(file, "utf8").replace(/\r/g, "");
const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
const found = {};
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name && names.includes(node.name.text)) {
    (found[node.name.text] ||= []).push(node.getText(sf));
  }
  ts.forEachChild(node, visit);
}
visit(sf);
for (const n of names) {
  const arr = found[n] || [];
  if (arr.length !== 1) { console.log(n, "OCORRENCIAS=" + arr.length); continue; }
  const t = arr[0];
  console.log(n, crypto.createHash("md5").update(t).digest("hex"), "linhas=" + t.split("\n").length);
}
````
