# C3 — evidencia — papel: cadeira C3 da junta 1 do B-SAN3-09 (PR 400) · identidade: guardiao-fail-closed · modelo: Opus 5.5 (claude-opus-5-5; Fable/Astra suspensos por decisao do dono ate o reset semanal) · mandato_md5 (EOL-neutro): 20988a161542a58700505890866230d2 · corpo md5 EOL-neutro (origin/main 357a98e9, blob 06a39978): 5b0f7f5d31df366b69ac2cc8c113e963

Formato P1: cada item = comando · saida resumida · veredito parcial, com hora UTC.

## 0. Identidade e mandato (2026-10-04T19:32Z)
- `git ls-tree origin/main .claude/agents/guardiao-fail-closed.md` → blob 06a3997809a22ea7671ad94e84e7025077f2ce44; `git cat-file -p <blob> | tr -d '\r' | md5sum` → 5b0f7f5d31df366b69ac2cc8c113e963 (128 linhas).
- mandato no disco `tr -d '\r' < 00-mandatos/C3.md | md5sum` → 20988a161542a58700505890866230d2; no commit 6330bce2 (via ls-tree+cat-file) → 20988a161542a58700505890866230d2. Confere com o informado.
- veredito parcial: identidade e mandato conferem.

## L. Legalidade e objeto (2026-10-04T19:35Z)
- parecer do inspetor `00-inspetor-terreno.md` l.10/l.169: **LIBERADO COM RESSALVA** (R-1..R-7; R-1 condiciona so C2; R-3 sugere C3 como dona do achado "-db so-Linux"; R-4 regra de adocao de head novo; R-6 receita Linux; R-7 disco).
- `gh pr view 400 --json headRefOid,state,isDraft,...` → headRefOid=ba65c03a4c3edc0723633b0f1330f34852a60e6f, OPEN, rascunho; `git fetch origin feat/bootstrap-platform-admin; git rev-parse origin/feat/bootstrap-platform-admin` → ba65c03a4c3edc0723633b0f1330f34852a60e6f (git = gh).
- R-4 (a): `git log --oneline 6330bce2..ba65c03a` → 1 commit (parecer do inspetor); `git diff --name-only 6330bce2 ba65c03a` → so `agent-orchestration/omega/juntas/votos/B-SAN3-09/00-inspetor-terreno.md`.
- R-4 (b): `gh api repos/thiagodorgo/ERP_Techsolutios/commits/ba65c03a.../check-runs --paginate` → 14 runs, todos `completed success` (docker x2, backend-postgres x2, authority-portal x2, backend x2, flutter x2, frontend x2, owner-portal x2), concluidos 17:48–17:57Z.
- veredito parcial: legal. OBJETO = **ba65c03a4c3edc0723633b0f1330f34852a60e6f** (delta desde 6330bce2 = so registro de junta; produto identico).

## T. Terreno (2026-10-04T19:40Z)
- `git worktree add --detach C:/Users/AMP/w-j09c3 ba65c03a...` → HEAD ba65c03a4c3edc0723633b0f1330f34852a60e6f, `status --porcelain` = 0 linhas.
- `npm ci --no-audit --no-fund` → ec=0, added 326 packages; `cmd /c "dir /AL /S /B node_modules" | wc -l` → 0 junction/symlink.
- `DATABASE_URL=postgresql://inerte@127.0.0.1:1/inerte npx prisma generate` (variavel so no comando) → ec=0.
- disco C: 11 GB livres antes do npm ci (`df -h /c`).

## 1. Item 1 — T1.2–T1.4, T1.7 e o guard de imports (CE-G1)

### 1a. Rodada no head, Windows (19:41Z)
- `node --test --import tsx --test-reporter=tap tests/san3-09-bootstrap-platform-admin.test.ts; echo ec` → **ec=0**, `# tests 23 · pass 23 · fail 0 · skipped 0`. T1.2 (ok 5–8), T1.3 (ok 9–15), T1.4 (ok 16–18), T1.7 (ok 21–22) verdes; T1.1/T1.5/T1.6/T1.8 tambem.
- veredito parcial: os testes nomeados rodam e passam no head.

### 1b. O que o guard ENXERGA do script real (19:43Z)
- `grep -n '^import' scripts/bootstrap-platform-admin.ts` → 6 linhas de import: l.41 `import "dotenv/config";` (side-effect) · l.43 `@prisma/adapter-pg` · l.44 `@prisma/client` · l.46 `../src/database/rls.js` · l.47 `import {` (multilinha → `../src/modules/auth/repositories/local-auth-credential.repository.js`) · l.51 `import {` (multilinha → `../src/modules/auth/services/local-auth-credential.service.js`).
- aplicando o regex do proprio guard (`tests/san3-09-bootstrap-platform-admin.test.ts:261`, `/^import\s+.*?from\s+"([^"]+)"/gm`) ao script real (`node scratchpad/extract.mjs scripts/bootstrap-platform-admin.ts`) → **extrai 3**: `["@prisma/adapter-pg","@prisma/client","../src/database/rls.js"]`.
- leitura da algebra: `.` nao casa `\n` (sem flag `s`) → import multilinha e invisivel; o padrao exige `from` → import side-effect (`import "x"`) e invisivel; exige aspas duplas → `'x'` invisivel; ancora `^import` → `export … from`, `import()` dinamico e `require()` invisiveis. O teste da l.265-275 so itera o que o regex devolve (`for (const imp of imports)`), com piso `imports.length > 0`.
- o "teste de mutacao" T1.7 (l.277-297) NAO chama `extractScriptImports` nem le copia do script: aplica uma SEGUNDA copia literal do mesmo regex (l.287) a uma string fixa cujo import intruso (l.285) esta justamente na unica forma que o regex reconhece (linha unica, `from`, aspas duplas). O plano (§8 T1.7) pedia "cópia temporária com `import \"../src/modules/auth/index.js\"` → o MESMO verificador reprova".
- veredito parcial: o guard cobre 3 de 6 imports do proprio script; os 3 que ele nao ve sao exatamente os de `src/modules/auth/**` e o side-effect. A prova por mutacao vem em 1c.

### 1c. Mutacoes de autoria propria no guard de imports — copia descartavel = meu worktree w-j09c3 (19:46–19:55Z)
- sandbox: backup `scratchpad/script.orig.ts`; `scratchpad/mutate.mjs` insere o import intruso logo apos a l.46 (`rls.js`), preservando CRLF, com prova de substituicao (aborta se a ancora falta ou se o texto nao mudou); depois de CADA rodada `cp script.orig.ts` e `git hash-object scripts/bootstrap-platform-admin.ts` = **827a53b488a50aa34a3b0bcc9f9fe23ecb31f577** = blob do HEAD; `git status --porcelain` = 0 linhas ao fim. Nada mutado fora do w-j09c3.
- comando por mutante: `node --test --import tsx --test-reporter=tap tests/san3-09-bootstrap-platform-admin.test.ts; echo ec`
- resultados (23 casos):
  | mutante | import intruso (fora da allowlist) | T1.7 | suite T1 | ec |
  |---|---|---|---|---|
  | A (controle) | `import { readFileSync } from "node:fs";` (linha unica, `from`, aspas duplas) | **not ok 21** | 22/23 | 1 |
  | B | `import "../src/modules/core-saas/permissions/catalog.js";` (side-effect) | ok | **23/23** | **0** |
  | C | `import {` / `  PLATFORM_ROLES,` / `} from "../src/modules/core-saas/permissions/catalog.js";` (multilinha — a forma de 2 dos 6 imports reais) | ok | **23/23** | **0** |
  | D | `import "../src/modules/auth/index.js";` (a forma EXATA que o plano §8 T1.7 manda o teste reprovar) | **ok** | 22/23 — so `not ok 19` (T1.5: env.ts carregado → ZodError) | 1 |
  | E | `import { STANDARD_ROLES } from '../src/modules/core-saas/permissions/catalog.js';` (aspas simples) | ok | **23/23** | **0** |
  | F | `export { STANDARD_ROLES } from "../src/modules/core-saas/permissions/catalog.js";` (re-export) | ok | **23/23** | **0** |
- mutante B, colunas (a)/(c) do guardiao: `npm run check` → ec=0; `npm run lint` (= `npm run check`) → ec=0; tsc A19 do script (`npx tsc --noEmit --strict --module NodeNext ... scripts/bootstrap-platform-admin.ts`) → ec=0; runtime `NODE_ENV=production node --import tsx/esm scripts/bootstrap-platform-admin.ts` → ec=2 `RECUSADO (PRODUCTION_OPT_IN_MISSING)` (o modulo intruso CARREGOU; nada o recusou). **Compila + verde + aceito.**
- mutante V (o "teste de mutacao" do proprio T1.7 protege o verificador?): enfraqueci o regex do verificador (l.261 → `"(@prisma\/[^"]+)"`, `scratchpad/weaken.mjs`, substituicao provada) E apliquei o intruso de CONTROLE A → **23/23, ec=0**; `ok 21` e `ok 22` (o "MUTAÇÃO — import fora da allowlist é detectado" continua verde, porque usa a sua copia literal do regex na l.287, nao o verificador). Restauro: `git hash-object` do teste = 6237b3a35906e95f71d0b0a2acabc98c453ce907 = blob; script = 827a53b4…; porcelain 0.
- veredito parcial ITEM 1: **REPROVADO.** T1.2–T1.4 e T1.7 rodam verdes, mas a mutacao nova de autoria propria (import fora da allowlist) fica **VERDE** em 4 de 5 formas (B, C, E, F), e na forma que o proprio plano escolheu (D) o T1.7 tambem fica verde — so o T1.5 (outra propriedade: env.ts carregado) avermelha. O guard CE-G1 e fail-open por construcao: a fonte e um regex que reconhece uma forma de import, o desconhecido e permitido, e o teste de mutacao que deveria provar o contrario e tautologico (copia do regex aplicada a fixture feita na forma que o regex reconhece).

## 3. Item 3 — tsc do script e Runbook B x script (por execucao)

### 3a. tsc (20:00Z)
- `npx tsc --noEmit --strict --module NodeNext --moduleResolution NodeNext --target ES2022 --esModuleInterop --skipLibCheck --types node scripts/bootstrap-platform-admin.ts; echo ec` → **ec=0**, 0 linhas de saida. `npm run check` → ec=0.
- veredito parcial: tsc do script verde.

### 3b. Terreno de banco (20:02Z)
- portas 55493/55494: `netstat -ano | grep -c ":<porta> "` = 0 antes. Rede `j09c3-net`; `j09c3-pg` (postgres:16, PostgreSQL 16.14, senha aleatoria de 24 hex so no scratchpad) em 127.0.0.1:55493; `j09c3-redis` (redis:7) em 127.0.0.1:55494; `pg_isready` → accepting; `redis-cli ping` → PONG. Imagens ja locais (sem pull). Base viva 5432/6379 sem nenhum comando. Worktree sem `.env` (`ls .env` → nao existe), logo `dotenv/config` nao injeta nada.
- `create database erp_j09c3_rb`; `DATABASE_URL=<descartavel> npx prisma migrate deploy` → ec=0 "All migrations have been successfully applied."; `npm run --silent db:provision-rbac` → ec=0 "CONVERGIDO".

### 3c. Comandos do Runbook B executados contra o drill (`scratchpad/rb.sh erp_j09c3_rb`, Windows, 20:04Z; senha de teste `Tst-<20 hex>` gerada e descartada)
- R0 pre-condicao do runbook (`SELECT count(*) FROM roles WHERE key='super_admin' AND tenant_id IS NULL`) → 1.
- R1 simulacao exatamente como o runbook (`printf … | NODE_ENV=production ALLOW_PROD_BOOTSTRAP=1 … --password-stdin --dry-run`) → ec=0 "simulação encerrada", contagens t/u/ura/cred/audit 0/0/0/0/0.
- R2 sem `ALLOW_PROD_BOOTSTRAP` → ec=2 `RECUSADO (PRODUCTION_OPT_IN_MISSING)`, 0/0/0/0/0 (runbook: "exit 2 (nada gravado)" — confere).
- R3 `--password=x` (NODE_ENV=production sem opt-in) → ec=2 `RECUSADO (PASSWORD_IN_ARGV)` (runbook l.6-7 — confere; o argv e lido antes da trava).
- R4 aplicacao como o runbook → ec=0 `CONVERGIDO`, 1/1/1/1/1.
- R5 reaplicacao → ec=0 `CONVERGIDO` + "já existia (senha mantida)", 1/1/1/1/1, md5(password_hash) igual.
- R6 banco inalcancavel (`DATABASE_URL=…127.0.0.1:1…`) → **ec=1** `FALHOU: ` (mensagem VAZIA; nada gravado).
- R7 `--reset-password` (runbook l.27 "Senha perdida: `--reset-password`") → ec=0 "senha redefinida", auditoria 1→2, hash mudou.
- segredo nas saidas de R1–R7: senha1=0, senha2=0, senha do cluster=0, `postgresql://`=0, `scrypt-v1$`=0.
- conferencia texto x execucao: variaveis NODE_ENV/ALLOW_PROD_BOOTSTRAP/DATABASE_URL/PLATFORM_ADMIN_EMAIL, flags `--password-stdin`/`--dry-run`/`--reset-password`, codigos 0 e 2 e as mensagens `CONVERGIDO`/`PRODUCTION_OPT_IN_MISSING`/`PASSWORD_IN_ARGV` → conferem. Divergencias medidas: (i) o **exit 1** existe (R6) e o runbook nao o cita (`grep -c -iE 'exit 1|FALHOU' runbookB` = 0; o A20 do plano exige "os códigos 0/2/1"); (ii) a pre-condicao do runbook conta a EXISTENCIA do papel; o script exige concessoes > 0 (`bootstrap-platform-admin.ts:200-201`) — divergencia no sentido SEGURO (o script recusa onde o runbook diria "ok"); (iii) o runbook diz "senha por env" sem nomear `PLATFORM_ADMIN_PASSWORD`; (iv) R6 sai com mensagem vazia.
- T1.8 (doc-guard) sob mutacao do plano (Runbook B do merge-base 8ee10bd2, blob ca6fdac8) → `not ok 23`, ec=1; restaurado (hash 59f9b9a6 = blob HEAD; porcelain 0). O doc-guard morde — mas so confere presenca de 6 tokens, nao o exit 1.

### 3d. A enumeracao de FLAGS do script — membro desconhecido (20:08Z; bancos `erp_j09c3_flag` e `erp_j09c3_flag2`, migrados + provisionados)
- leitura: `parseArgv` (`bootstrap-platform-admin.ts:110-124`) recusa SO `--password` e o prefixo `--password=`; reconhece `--dry-run`/`--password-stdin`/`--reset-password` por `includes`; qualquer outro token e IGNORADO em silencio (nao ha `else → recusa`).
- F1 `--password-stdin --dryrun` (erro de digitacao do `--dry-run`), e-mail `errado@exemplo.test` → **ec=0, "modo: aplicar", `CONVERGIDO`**, t/u/ura/cred 1/1/1/1, users = errado@exemplo.test. A "simulacao" ESCREVEU.
- F2 em seguida, e-mail certo, `--dry-run` correto → ec=2 `RECUSADO (ADDITIONAL_ADMIN_REFUSED)`; F3 aplicacao com o e-mail certo → ec=2 `ADDITIONAL_ADMIN_REFUSED`. O admin errado fica, e o script nao tem caminho de remocao (plano §4.1: "não há remoção").
- F4 senha em argv numa forma nao listada (`-p <senha>`, com PLATFORM_ADMIN_PASSWORD no env) → **ec=0 `CONVERGIDO`**, users=1: o argv com a senha foi aceito sem recusa.
- segredo nas saidas F1–F4: senha=0, senha do cluster=0.
- veredito parcial: a enumeracao de flags e fail-open — o membro nao previsto e tratado como benigno; o caso medido transforma a simulacao que o Runbook B manda fazer PRIMEIRO numa aplicacao irreversivel pelo proprio script.
- veredito parcial ITEM 3: tsc verde; Runbook B confere com a execucao em variaveis, flags e codigos 0/2, com ajuste (exit 1 ausente, contra o A20) e notas; e o achado de flags (3d) e da minha linha "recusas nomeadas".

## 2. Item 2 — T2.5, T2.6, T2.8, T2.9 no head e o login por HTTP

### 2a. Terreno Linux (receita R-6 do inspetor, nomes proprios) (19:47–19:52Z)
- `docker run -d --name j09c3-node --network j09c3-net node:20-bookworm-slim` (imagem ja local; node v20.20.2); arvore = `git -c core.autocrlf=false archive ba65c03a | docker exec -i j09c3-node sh -c 'mkdir -p /work && cd /work && tar -x'`.
- md5 container = md5 blob em 4 arquivos: `-db.test.ts` e90a9bc4b99c98f65bab85d92f452490 · script a5f5383dfbbabde9a63205bd40f64782 (= md5 do Apendice B do plano) · `package-lock.json` 69a6ea326087249d7aa03896859513f8 · `san3-09…test.ts` 91a1b8a14ac49c4fa8a5f90376383f10; CR no `-db.test` = 0.
- dentro do container: `apt-get install openssl` → OpenSSL 3.0.22; `npm ci` → ec=0, `.bin/prisma -> ../prisma/build/index.js` (symlink); `prisma generate` com DATABASE_URL so no `docker exec -e` → gen_ec=0.

### 2b. O teste -db no head, Linux (19:52:39–19:54:09Z)
- `docker exec -e DATABASE_URL=<j09c3-pg/erp_j09c3_rb> -e REDIS_URL=redis://j09c3-redis:6379 -e CORE_SAAS_PERSISTENCE=memory j09c3-node sh -c 'cd /work && node --test --import tsx --test-reporter=tap tests/san3-09-bootstrap-platform-admin-db.test.ts; echo ec'` → **t2_ec=0**, `# tests 11 · pass 11 · fail 0 · cancelled 0 · skipped 0`.
- ok 5 T2.5 (outro e-mail → ADDITIONAL_ADMIN_REFUSED, contagens intactas) · ok 6 T2.6 (reset: hash muda, 0/NULL, auditoria +1) · ok 8 T2.8 (HTTP real: `createApp(service)` + `app.listen(0)` + `fetch` — login com tenantId 200 e `roles ∋ super_admin`; `GET /api/v1/platform/overview` 200; senha errada 401; sem tenantId 401) · ok 9 T2.9 (processo filho: 1a/2a exit 0; prod sem opt-in exit 2, contagens intactas; saidas sem senha/hash/`postgresql://`). Tambem ok T2.1–T2.4, T2.7, T2.10.
- veredito parcial: os quatro nomeados rodam e passam no head (forma: container Linux node 20, cluster proprio).

### 2c. Login por HTTP com status medido e vermelho-controle do 401 (19:57–20:03Z; copia do teste DENTRO do container, restaurada)
- instrumentacao (nao muda comportamento): `/tmp/c3mut.cjs instr` acrescenta, no helper `requestJson` da copia do container, 1 linha que escreve no stderr metodo, rota, presenca de `tenantId`, status e os 80 primeiros chars do corpo (ancora provada; token omitido no registro). Rodada: **t2h_ec=0**, 11/11, e:
  - `POST /api/v1/auth/login tenantId=sim` → **200** `{"data":{"authenticated":true,…}}`
  - `GET /api/v1/platform/overview` (Bearer do login real) → **200** `{"data":{"activeOrgs":1,"totalOrgs":1,"totalUsers":1,…}}`
  - `POST /api/v1/auth/login tenantId=sim` senha errada → **401** `INVALID_CREDENTIALS`
  - `POST /api/v1/auth/login tenantId=nao` (anonimo, servidor sob o papel efemero NOSUPERUSER NOBYPASSRLS) → **401** `INVALID_CREDENTIALS`
- vermelho-controle A16 (mutacao do plano §7: trocar o cliente do papel efemero pela conexao administrativa dona de `auth_login_candidates`): `/tmp/c3mut.cjs a16` (2 substituicoes provadas) → **t2a16_ec=1**, `not ok 8 - T2.8`, "sem tenantId deve retornar 401 · expected: 401", e o anonimo → **200** `authenticated:true`. Logo o 401 anonimo do head NAO e vacuo: depende do privilegio de EXECUTE, que o papel de runtime nao tem.
- restauro: `cp /tmp/db.orig.ts` → md5 e90a9bc4b99c98f65bab85d92f452490 = blob.
- veredito parcial: login direcionado 200 e anonimo 401 medidos por HTTP real; o 401 tem controle que o avermelha.

### 2d. R-3 re-executado (o -db so roda em Linux) (20:05Z)
- Windows, w-j09c3, cluster proprio 127.0.0.1:55493: `node --test --import tsx tests/san3-09-bootstrap-platform-admin-db.test.ts; echo ec` → **ec=1**, `not ok 1 - T2.1`, `SyntaxError: missing ) after argument list` (o shim `#!/bin/sh` de `.bin/prisma` executado por `node`); 0 bancos `erp_san3_09_drill_%` deixados para tras.
- leitura do angulo desta cadeira: a falha e VERMELHA, nao skip-verde — o arnes nao finge cobertura no Windows; no Linux (CI e container) e 11/11. Classifico como nota de portabilidade, dentro-do-bloco (arquivo novo), sem efeito de seguranca.
- veredito parcial ITEM 2: **APROVADO** — T2.5, T2.6, T2.8, T2.9 verdes no head (Linux); 200/401 medidos por HTTP com controle.

## P3. Autoridade unica — "qual papel e de plataforma" e "o que e producao" (20:08–20:14Z)
- busca pelo valor: o script crava `PLATFORM_ROLE_KEY = "super_admin"` (`scripts/bootstrap-platform-admin.ts:58`); a autoridade e `ROLE_AUTHORITY`/`PLATFORM_ROLES` (`src/modules/core-saas/permissions/catalog.ts:329-330`), lida pelo gate `platform-permissions.ts`. Dois lugares. Ha mecanismo que falha na divergencia?
- mutacao na copia do container: `catalog.ts:330 super_admin: "platform"` → `"tenant"` (sed provado por `cmp`) e o `-db` → **t2cat_ec=1**, `not ok 8 - T2.8`, `GET /api/v1/platform/overview … expected: 200 · actual: 403 FORBIDDEN platform_permission_required`. Restauro: md5 58fed2341d9c8bfc363f03100f6cd914 = blob. Logo a concordancia e IMPOSTA por execucao (T2.8 faz login real e bate na rota de plataforma) — com a ressalva de que so morde onde o `-db` roda (Linux/CI; N3).
- trava de producao: `isBootstrapAllowed` compara `NODE_ENV === "production"` literal (l.98), espelho declarado de `prisma/seed-guard.ts:28` (nascido em 4a2db09b, 2026-07-14, Ω-INFRA-3 #182 — `git log --diff-filter=A -- prisma/seed-guard.ts`). Sonda (`npx tsx scratchpad/nodeenv.mts`): "production" → nega; "Production", "PRODUCTION", "production " (espaco), "prod", ausente → PERMITE. Classe pre-existente (a deteccao de producao e um rotulo que o operador digita; o §10 do plano lista "NODE_ENV não exportado fora do contêiner" com essa origem) — nota, nao reprova.
- `TRUTHY` do script (l.89) x `TRUTHY` do seed-guard: dois literais por decisao declarada (D2: opt-ins independentes); nao ha caminho que passe por um para chegar ao outro — nota sem efeito.
- veredito parcial: a autoridade de papel de plataforma tem concordancia imposta por teste executavel; nenhuma copia duplicada desta PR vence pelo lado permissivo.

## R. Reconferencia do objeto antes do veredito (20:03Z)
- `gh pr view 400 --json headRefOid,state,isDraft` → ba65c03a4c3edc0723633b0f1330f34852a60e6f OPEN draft=true; check-runs nao-success/nao-completed = 0. Objeto estavel.

## L2. Limpeza (20:04–20:09Z)
- `docker rm -f -v j09c3-node j09c3-pg j09c3-redis` e `docker network rm j09c3-net` → 0 containers/redes j09c3; base viva erp-postgres/erp-redis "Up 7 days (healthy)", nunca alvo. Volumes orfaos: 12, o mais novo criado 18:41:47Z (antes dos meus containers, ~19:43Z) — nenhum meu.
- worktree: 0 processo com `w-j09c3` na linha de comando; `git -C w-j09c3 status --porcelain` = 0; `git worktree remove --force C:/Users/AMP/w-j09c3` → ec=0; `test -e` → removido; `git worktree list | grep -ic w-j09c3` = 0.
- **INCIDENTE (relato, nao merito):** a limpeza dos meus temporarios usou, alem de nomes literais, o glob `./*.log` dentro de `scratchpad/` — que e o diretorio de scratchpad COMPARTILHADO da sessao (contem BRIEFING-*, DEV-*, CRITICO-* de outros agentes). O glob apagou TODO `.log` da raiz desse diretorio, nao so os meus (contagem depois = 0; a contagem antes NAO foi medida, portanto nao sei quantos `.log` alheios havia). Nenhum arquivo rastreado, nenhum worktree, nenhum `.md`/`.tap` alheio foi tocado (os 13 `mut-*.tap`/`mut-c2` de 09-20/09 continuam). O orquestrador deve conferir se alguma evidencia que ele contava ler estava em `scratchpad/*.log`; o que foi commitado em `votos/` nao foi afetado.
- disco C: 8,1 GB livres ao fim.

## VEREDITO (2026-10-04T20:11Z) — voto em C3-voto.json
- Item 1 REPROVADO (C3-F1, C3-F2 — bloqueia, dentro-do-bloco) · Item 2 APROVADO · Item 3 APROVADO COM AJUSTE (C3-A1) · e C3-F3 (bloqueia, dentro-do-bloco) da linha "recusas nomeadas". Notas: N1–N3 (dentro-do-bloco), N4 (pre-existente, origem 4a2db09b 2026-07-14).
- Nao executado: suite inteira e regressoes do §8 (fora das tres linhas desta cadeira); M10 (C2); `ps -o args` (C1).

VOTO: CONTRA — guard de imports CE-G1 fail-open e auto-teste tautologico; flag desconhecida tratada como benigna | evidencia: imports intrusos em 4 formas => 23/23 verde, check/tsc ec=0, runtime carrega; verificador enfraquecido + intruso => 23/23; '--dryrun' => ec=0 CONVERGIDO com escrita e o admin certo recusado depois (ADDITIONAL_ADMIN_REFUSED)
