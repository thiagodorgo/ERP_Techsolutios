papel: C2 | identidade: jurado-san305-c4-credencial-arnes-escopo | modelo: Claude Opus 5.5 (claude-opus-5-5) (substituição §C7.6-bis: Fable não rodou por D-FABLE-ASTRA-SO-DINHEIRO — Fable só em bloco que toca dinheiro; este bloco é segurança/permissão) | mandato_md5: bfeb025fa6154f817436a42c03104712 (declarado no disparo: bfeb025fa6154f817436a42c03104712) | corpo_md5: 3363eb094cdf49a3534a73321b7d1d2f (.claude, blob do objeto 84831ad9 e do 2400049b) / 4b34813dd4b5b98c4e72d423c5c45801 (.agents, cabeçalho Codex) (recebido no prompt: lido do blob HEAD de w-o05 = 3363eb094cdf49a3534a73321b7d1d2f, esperado no disparo 3363eb094cdf49a3534a73321b7d1d2f)

# Evidência — cadeira C2 — junta 4 (ciclo 4) — B-SAN3-05 (PR 405)

Lançada como general-purpose (corpo não está no diretório de agentes da sessão), ferramentas limitadas por escrito a Read, Grep, Glob e Bash. Escrevo só este arquivo e C2-voto.json. Não li nem lerei ciclo4/C1-* nem ciclo4/C3-* antes de gravar o voto.

## 0. Cabeçalho do terreno
- Início: 2026-10-09T20:18Z (`date -u`).
- Objeto (head do PR 405): `84831ad9796d8db29766b0ff6e0a1a894a9d45e7` — `git ls-remote origin refs/heads/fix/runtime-role-sem-bypass` = `gh pr view 405 --json headRefOid` (OPEN, rascunho, CONFLICTING, base main).
- `origin/main` no início (fetch 20:18Z): `a9bbde382213627545e9d229c9ab616d83a0a840`.
- Cerca do mandato (HC): `2400049bf8ec421c3f65a07884c6394d4ab208bc` (objeto do inspetor). `git diff --name-only 2400049b 84831ad9` = 6 arquivos: `00-mandatos/C1c4.md`, `00-mandatos/C2c4.md`, `00-mandatos/C3c4.md`, `ciclo4/00-inspetor-terreno.md`, `ciclo4/C1-evidencia.md`, `ciclo4/C1-voto.json` — só registro (os dois últimos só pelo nome; NÃO abertos). Restrito a `src scripts tests prisma docs Kpis .gitattributes docker-compose.prod.yml` = 0 linhas.
- Mandato: `tr -d '\r' < .../00-mandatos/C2c4.md | md5sum` = `bfeb025fa6154f817436a42c03104712`; `git hash-object` disco = `git rev-parse 84831ad9:<mandato>` = `6ce2ee58…` (versionado no objeto, igual ao disco).
- $SCRATCH = `C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/c2c4`.
- Host: `MINGW64_NT-10.0-22631 N3SOH82 3.6.6 x86_64 Msys`; shell `/bin/bash.exe` (Git Bash); cwd por comando com caminho absoluto; nenhum `export`; `MSYS_NO_PATHCONV=1` só como prefixo por comando.
- Docker servidor 29.6.1 linux/amd64. `docker ps` (rodando) = 0 containers — base viva desligada.
- Disco `C:` no início: 11 GB livres (96%).
- Ambiente que eu defino por comando: `S` (scratch), `O` (objeto), `EV` (este arquivo) — nenhum segredo.

## L. Legalidade antes do mérito (20:20Z)
### L1. Parecer do inspetor da junta 4
- Comando: `git show 84831ad9:agent-orchestration/omega/juntas/votos/B-SAN3-05/ciclo4/00-inspetor-terreno.md | tr -d '\r'` (129 linhas, lido inteiro).
- Saída: instância `inspetor-de-terreno-da-junta` (Claude Opus 5.5, substituição declarada), aberto 19:14Z, fechado 19:28Z; veredito **LIBERADO COM RESSALVA** (R1 resíduo alheio inerte · R2 disco 11 GB · R3 disparo general-purpose com corpo do blob · R4 objeto que andar: publicar diff só-registro e só começar com check-runs do head novo CONCLUÍDOS). Tabela libera C2 = `jurado-san305-c4-credencial-arnes-escopo`, corpo `3363eb094cdf49a3534a73321b7d1d2f` (.claude) e espelho `.agents` `4b34813d…`, worktree `C:/Users/AMP/w-j05c4c2` (livre), containers `j05c4-c2-*` (inclusive `j05c4-c2-b7-pg`), sem porta. Objeto do inspetor: `2400049b`.
- Veredito parcial: confere o meu nome, o meu corpo commitado nos dois espelhos (md5 .claude e .agents medidos por mim = os do parecer), worktree e containers próprios. LIBERADO COM RESSALVA vale. R4 aplicável: o head andou para `84831ad9`.

### L2. Objeto e delta da cerca
- `git ls-remote origin refs/heads/fix/runtime-role-sem-bypass` = `84831ad9796d8db29766b0ff6e0a1a894a9d45e7`; `gh pr view 405 --json headRefOid,…` = o mesmo (OPEN, isDraft=true, CONFLICTING). Coincidem.
- `git diff --name-only 2400049b 84831ad9` = 6 arquivos de registro (mandatos C1c4/C2c4/C3c4, parecer do inspetor, C1-evidencia/C1-voto — estes dois NÃO abertos). Commits: `79b0d594` (parecer + mandatos) e `84831ad9` (evidência e voto da C1). Restrito a código/teste/script/docs/Kpis = 0.
- Veredito parcial: delta só registro; o código julgado é o mesmo do objeto do inspetor.

### L3. Check-runs do objeto 84831ad9 (1ª leitura)
- `gh api 'repos/thiagodorgo/ERP_Techsolutios/commits/84831ad9…/check-runs?per_page=100' > $S/checkruns-84831ad9.json` ec=0; filtro node publicado: total = `total_count`; não-verdes = `status=completed && conclusion!=success`; pendentes = `status!=completed`.
- 20:18:55Z: total=6 não-verdes=0 pendentes=4 (owner-portal e authority-portal success; frontend, flutter, backend, backend-postgres in_progress; docker ainda ausente).
- Veredito parcial: NÃO CONCLUÍDOS — pela R4 do inspetor e pelo §C7.1-bis, não começo o mérito antes de concluírem. Preparo o terreno (sem medir mérito) e re-leio.

### L4. Normas na ref julgada (§A7)
- `git show <ref>:CLAUDE.md | tr -d '\r' | md5sum`: objeto `a9419a55a77ea2adfd61a6ce80e77a27` = origin/main `a9419a55…` (idênticos).
- Âncoras (grep -c, obj/main): `## A1. Fontes` 1/1 · `## A2. Regra de conflito` 1/1 · `## A7. Onde se MEDE` 1/1 · `## C4. Disciplina` 1/1 · `## C5. Limpeza` 1/1 · `1-bis. INSPEÇÃO` (l.393) 1/1 · `1-ter. ESCOPO` (l.361) 1/1 · `4-bis. **SEPARAÇÃO` 1/1 · `5. **Paradas imediatas` 1/1 · `6-bis. **ESGOTADO` 1/1 · `P7 — Pausa ordenada` 1/1 · `P1 — Evidência incremental` 1/1 · `P4 — Mandato` 1/1 · `## 8. GitHub Flow` 1/1 · `GOVERNANÇA PROPORCIONAL` 1/1 · `**(1) Junta proporcional` 1/1 · `**(2) Teto de 2 ciclos` 1/1 · `**(5) KPI congelado` 1/1. (Meu 1º grep de `1-bis`/`1-ter` deu 0 por posição do `**` — controle: `grep -n '1-bis\.'` acha l.393; não é norma ausente.)
- `decisoes.md` do objeto (3020 linhas): `D-FABLE-ASTRA-SO-DINHEIRO` l.2982 · R3 l.3004 · R4 l.3009 · `D-405-PROIBIR-VIEWS` l.3013 (na origin/main: 0 — o ramo não mergeou; aplico a ref julgada). Texto R3/R4 lido: no ciclo 4 só grave reprova; mutação que teste não pega com produto recusando = forma de teste (não grave); item não medido que possa esconder grave (B1, B2 na lista) = reprovação.
- Veredito parcial: todas as normas que aplico existem na ref julgada.
### L3-bis. Check-runs do objeto 84831ad9 (concluídos, 20:27:35Z)
- Laço de espera: `timeout 540 bash -c 'while :; do gh api …/check-runs --jq pendentes/total; sleep 25; done'` até pendentes=0 e total≥7 (20:27:26Z).
- `gh api 'repos/thiagodorgo/ERP_Techsolutios/commits/84831ad9…/check-runs?per_page=100' > $S/checkruns-84831ad9-final.json` ec=0; mesmo filtro publicado em L3:
  total=7 nao-verdes=0 pendentes=0
   docker completed success 2026-10-09T20:27:00Z
   owner-portal completed success 2026-10-09T20:17:39Z
   frontend completed success 2026-10-09T20:19:36Z
   flutter completed success 2026-10-09T20:19:49Z
   backend completed success 2026-10-09T20:24:13Z
   backend-postgres completed success 2026-10-09T20:20:26Z
   authority-portal completed success 2026-10-09T20:17:40Z
- Veredito parcial: VERDE — 7/7 completed/success no objeto (inclusive docker e backend-postgres). Só agora começo o mérito (R4 do inspetor). Antes disso fiz apenas: leitura (plano C4, DEV-relatorio, corpo, mandato, parecer), worktree git e scripts do condutor (sem container, sem medição).

### L5. Worktree próprio
- `ls -d /c/Users/AMP/w-j05c4c2` → inexistente (livre); `ls -d /c/Users/AMP/t-*` → nenhum.
- `git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios worktree add --detach C:/Users/AMP/w-j05c4c2 84831ad9…` ec=0; `test -e C:/Users/AMP/w-j05c4c2/.git` ok; `rev-parse HEAD` = 84831ad9…; `status --porcelain | wc -l` = 0.
- Sem node_modules no worktree (só git); npm ci só dentro do container. Junction: nenhuma.

## T. Terreno (20:27–20:31Z)
- Receita `C:/Users/AMP/erp-terreno/receita-pg16.sh` md5 EOL-neutro `9861a2aaa55fc49fcf1c4263261a3668` (= o do inspetor). Copiada (sem CR) para `$S/receita-orig.sh` e adaptada em `$S/setup.sh` (md5 final `a8aacd7050349bfd79d86c8dbd698f7e`): passos 1–4 + servidor B7; seções 5–6 (suíte, sonda) saíram — a suíte roda no meu `lote.sh`, o container fica de pé (trap só derruba em falha). Diff publicado (resumo; arquivo `$S/setup.diff` regenerável):
```
27c27
> REPO="${REPO:-C:/Users/AMP/w-j05c4c2}"
43c43
> dk image inspect sha256:4203157f95ea5e494d975e496f22905ffe184d059ae6aaa62aae840c761c19b5 >/dev/null && dk run --rm "$IMAGE" true || { echo "imagem $IMAGE ausente — construa com Dockerfile.erp-junta-node20-pg16" >&2; exit 2; }
45c45
> RUN_ID="j05c4-c2"
47c47
> TMP_TREE="/c/Users/AMP/t-j05c4c2"
61a62
>   dk rm -f -v "$RUN_ID-b7-pg" >/dev/null 2>&1
63c64
>   case "$TMP_TREE" in /c/Users/AMP/t-j05c4c2) rm -rf -- "$TMP_TREE";; esac
72c73
> trap 'ec0=$?; if [ "$ec0" -ne 0 ]; then cleanup; else case "$TMP_TREE" in /c/Users/AMP/t-j05c4c2) rm -rf -- "$TMP_TREE";; esac; fi' EXIT
75c76
> say "RUN_ID=$RUN_ID objeto=$SHA modo=$MODE imagem=$(dk image inspect -f '{{.Id}}' sha256:4203157f95ea5e494d975e496f22905ffe184d059ae6aaa62aae840c761c19b5 | cut -c1-19) pg=$PG_IMAGE"
81a83,84
> B7PW="$(od -An -N24 -tx1 /dev/urandom | tr -d ' \n')"   # senha do servidor B7 (log_statement=all), so ambiente + arquivo 600
> ( umask 077; printf 'PGPW=%s\nB7PW=%s\n' "$PGPW" "$B7PW" > "$OUT_BASE/.secrets" )
88a92,93
> ( export POSTGRES_PASSWORD="$B7PW"; dk run -d --name "$RUN_ID-b7-pg" --network "$NET" -e POSTGRES_PASSWORD -e POSTGRES_USER=postgres -e POSTGRES_DB=erp_b7 "$PG_IMAGE" -c log_statement=all >/dev/null )
> say "subiu: b7=$RUN_ID-b7-pg (postgres:16 com -c log_statement=all, sem porta no host)"
135,188d139
(e 135,188d139: saem as seções 5 e 6 da receita)
```
- Pontos da fábrica conferidos: `RUN_ID` (l.45) e o case do `rm -rf` da árvore (l.63) trocados JUNTOS para `j05c4-c2`/`/c/Users/AMP/t-j05c4c2`; `REPO` (l.27) → meu worktree; `TESTS` (l.32) = os 2 arquivos; `git ls-tree -r --name-only HEAD tests | grep -E '^tests/san3-05-.*-db\.test\.ts$'` no objeto = 2 (guard-db, leituras) — não há outro.
- **Anomalia de infraestrutura (declarada):** `docker image inspect erp-junta-node20-pg16:local` (pela tag) → "No such image" ec=1, embora `docker images` liste a tag e `docker run --rm erp-junta-node20-pg16:local node -v` → v20.20.2 ec=0; pelo ID `sha256:4203157f95ea…` o inspect funciona. Troquei a checagem da l.43 (inspect pelo ID + `run --rm` pela tag). Não é defeito do bloco.
- Saída do setup (`timeout 1500 bash $S/setup.sh 84831ad9… normal`, ec=0):
```
20:28:50Z RUN_ID=j05c4-c2 objeto=84831ad9796d8db29766b0ff6e0a1a894a9d45e7 modo=normal imagem=sha256:4203157f95ea pg=postgres:16
20:28:53Z subiu: b7=j05c4-c2-b7-pg (postgres:16 com -c log_statement=all, sem porta no host)
20:28:53Z subiram: rede=j05c4-c2-net pg=j05c4-c2-pg (volume anonimo b3ca1ef5ef231a57283d8dfefb8c0de3494489c8681b7168de2a4b8aca4408b3, sem porta no host) teste=j05c4-c2-node
20:28:53Z postgres: postgres (PostgreSQL) 16.14 (Debian 16.14-1.pgdg13+1)
20:28:57Z arvore: blobs_no_objeto=3776 extraidos_byte_identicos=3776 (git hash-object --no-filters x ls-tree)
20:28:58Z md5 amostra scripts/db-runtime-role.sh blob=5cab4f63b1259450acf68675205d5908 extraido=5cab4f63b1259450acf68675205d5908
20:28:58Z md5 amostra tests/san3-05-runtime-role-guard-db.test.ts blob=57ab4744f6b06e0614b4830237a75467 extraido=57ab4744f6b06e0614b4830237a75467
20:28:58Z md5 amostra tests/san3-05-leituras-de-plataforma-db.test.ts blob=c3e802162abd60f39b119c2ba76ec960 extraido=c3e802162abd60f39b119c2ba76ec960
20:28:58Z md5 amostra src/database/runtime-role.ts blob=9efee03db097f54e73178e1ec4c740d9 extraido=9efee03db097f54e73178e1ec4c740d9
20:28:58Z md5 amostra src/database/runtime-role.bootstrap.ts blob=373cb2e22b979f0c7f4b8b2328716d57 extraido=373cb2e22b979f0c7f4b8b2328716d57
20:28:59Z md5 amostra package-lock.json blob=69a6ea326087249d7aa03896859513f8 extraido=69a6ea326087249d7aa03896859513f8
20:28:59Z md5 amostra prisma/schema.prisma blob=af4ce3f66d0e17c0a38316cfebd8286f extraido=af4ce3f66d0e17c0a38316cfebd8286f
20:29:57Z container: md5sum -c de 3776 arquivos -> 0 divergencia
20:29:57Z md5 no container scripts/db-runtime-role.sh = 5cab4f63b1259450acf68675205d5908
20:29:57Z md5 no container tests/san3-05-runtime-role-guard-db.test.ts = 57ab4744f6b06e0614b4830237a75467
20:29:58Z md5 no container tests/san3-05-leituras-de-plataforma-db.test.ts = c3e802162abd60f39b119c2ba76ec960
20:29:58Z arvore temporaria /c/Users/AMP/t-j05c4c2 removida (a copia vive so no container)
20:29:59Z versoes no container: node v20.20.2 · npm 10.8.2 · psql (PostgreSQL) 16.14 (Debian 16.14-1.pgdg13+1)
20:30:15Z npm ci ec=0 (added 326 packages in 15s)
20:30:19Z prisma generate ec=0
20:30:38Z prisma migrate deploy ec=0 (107 migrations found; 1 linha 'successfully applied')
20:30:38Z catalogo public (tabelas|FORCE|views): 115|106|0
```
- Containers (`docker ps --filter name=j05c4-c2`): `j05c4-c2-b7-pg` (postgres:16, `-c log_statement=all`; `SHOW log_statement` = all), `j05c4-c2-pg` (postgres:16), `j05c4-c2-node` (erp-junta-node20-pg16:local) — Ports só `5432/tcp` exposta, NENHUMA publicada no host; rede `j05c4-c2-net`.
- No container: `uname -a` = Linux 6.18.33.2-microsoft-standard-WSL2 x86_64; node v20.20.2; npm 10.8.2; `psql` = /usr/lib/postgresql/16/bin/psql 16.14; `setsid` = /usr/bin/setsid.
- Árvore: `git -c core.autocrlf=false archive 84831ad9` → 3776 blobs, 3776 byte-idênticos (`hash-object --no-filters` × `ls-tree`); `md5sum -c` de 3776 arquivos no container → 0 divergência; md5 no container = blob: script `5cab4f63…`, guard-db `57ab4744…`, leituras `c3e80216…`, trava `9efee03d…` (= os do inspetor no 2400049b). npm ci ec=0 (326), prisma generate ec=0, migrate deploy ec=0 (107). Catálogo migrado: 115 tabelas · 106 FORCE · 0 views em public.
- Segredos: senha do pg e do B7 aleatórias (48 hex), só no ambiente dos meus processos e em `$S/terreno-pg16/.secrets` (apagado no fim); entram nos containers por `-e NOME` sem valor. Base viva (`erp-postgres`/`erp-redis`, 5432/6379/55432) não tocada: `docker ps` sem eles rodando.
- Disco: 11 GB livres antes e depois do setup.

## Item 1 — B1: senha-sentinela em claro no server.log / terminal / argv

### 1(a) O que o ciclo mudou no script (≈20:31Z)
- Head do disparo do dev = `7c63f920c996cf105535f345eec2ee10461c77a3` (ver item 3(a)); `git merge-base --is-ancestor 7c63f920 84831ad9` ec=0.
- `git -c core.autocrlf=false diff -U0 7c63f920 84831ad9 -- scripts/db-runtime-role.sh` → 8 hunks, +8/−23. Classificação bloco a bloco:
  - `@@ -3,2 +3,2` — cabeçalho do arquivo (l.3-4: a propriedade nova) → cabeçalho.
  - `@@ -20,2 +20,2` — cabeçalho do arquivo (l.20-21: texto do MODO 6) → cabeçalho.
  - `@@ -95,7 +94,0` — sai o CTE `view_escape` do `DO` → "os dois CTE".
  - `@@ -110,3 +103` — ramo `view` do `DO` = `SELECT DISTINCT 'view', v.oid::regclass::text FROM view_force vf JOIN pg_class v ON v.oid = vf.root_oid` → ramo `view` do `DO`.
  - `@@ -115 +106` — `RAISE` do MODO 6 com o remédio novo; contagem por script (regex sobre a linha do blob): **% no formato = 4, argumentos = 4** (`v_role n vias v_migrator`) → `RAISE`.
  - `@@ -132 +123` — comentário-cabeçalho da linha final (`views_de_dono_que_escapa` → `views_sobre_force`) — divergência declarada pelo dev; classificado no item 3(b).
  - `@@ -147,7 +137,0` — sai o CTE `view_escape` da linha final → "os dois CTE".
  - `@@ -158 +142` — coluna `views` = `(SELECT count(*) FROM view_force)` → coluna `views`.
- Linhas +/− do diff que tocam a sessão da senha (`DB_RUNTIME_PASSWORD|printf|setsid|\password|PGOPTIONS|password_encryption|ON_ERROR_STOP|set -euo|pipefail|psql `): **0**.
- Linhas de sessão no blob (grep -n de `set -euo pipefail`, `ON_ERROR_STOP=1`, `^  psql -X`, `if ! printf`, `setsid -w psql`, `\password`, `password_encryption=scram`): 7c63f920 → l.8,10,25,36,120,123,124,125,126,131 · objeto → l.8,10,25,36,111,114,115,116,117,122 (mesma sequência, deslocada −9 pelas 7+2 linhas a menos do `DO`). md5 das linhas que contêm `DB_RUNTIME_PASSWORD|setsid|\password|PGOPTIONS|password_encryption`: `5c63cae2…` nos dois heads (idênticas). Ordem das três sessões (postura → senha → conferência) preservada.
- Veredito parcial 1(a): nenhum bloco do segundo tipo (sessão da senha); a medição 1(b) decide.

### 1(b) B7 no servidor `j05c4-c2-b7-pg` (postgres:16.14, `-c log_statement=all`, banco `erp_b7`) — 20:31–20:36Z
- Executor: `$S/b7case.sh` (md5 inicial `a50ff1c5…`; corrigido para `2b940190fad64afdd6ac529c9a38be59` — ver controle (1)), cliente = `j05c4-c2-node` (psql 16.14, setsid /usr/bin/setsid), script = `/work/scripts/db-runtime-role.sh` do container, md5 `5cab4f63b1259450acf68675205d5908` = blob do objeto. Sentinela NOVA por caso (`j05c4c2sent` + 32 hex), só por ambiente (`dk exec -e DB_RUNTIME_PASSWORD` sem valor); senha do B7 idem. Forma: `dk exec … bash -c 'bash scripts/db-runtime-role.sh; rc=$?; sleep 6; exit $rc'` (o `sleep 6` só mantém o docker.exe vivo para a sonda do host). Leitores: `docker logs j05c4-c2-b7-pg > server.log 2>&1`; stdout/stderr do cliente em arquivo; argv do HOST por `Win32_Process.CommandLine` (padrão pela env `PW_PROBE`, nunca em argv) 2 s após o início; argv DENTRO do container por um amostrador de `/proc/*/cmdline` a cada 20 ms durante toda a execução. Contagem sempre por `grep -c -F -f <(printf '%s\n' "$SENT")` (padrão por descritor).

**Vermelho-controle dos leitores (`$S/ctl-leitores.sh`, antes dos casos):**
- (2) `SELECT '<marcador>'` no B7 → marcador no server.log pelo MESMO leitor = **1** (≥1 ✓); token nunca posto = 0.
- (3) host argv: token posto no argv de `docker exec … sh -c 'sleep 5' <token>` = **4** processos (≥1 ✓); nunca posto = **0** ✓. Container argv (amostrador): token posto = **199** amostras (≥1 ✓); nunca posto = **0** ✓ (1190 linhas amostradas).
- (1) o servidor de fato loga a definição da senha: no caso sucesso o server.log tem `ALTER USER c2b7_ok PASSWORD 'SCRAM-SHA-256$<verificador>'` (l.135). **Achado contra MINHA medição, corrigido antes de concluir:** a primeira versão do meu leitor usava `grep -c "PASSWORD 'SCRAM-SHA-256\$"` (o `$` virou âncora de fim de linha) e deu **0** — o controle (1) acusou o meu leitor cego; troquei por `grep -c -F` e ele dá **1** no caso sucesso e **2** acumulado (sucesso + md5). As contagens da SENTINELA sempre usaram `-F -f` (não afetadas).

**Tabela B7 (caso × leitor):**

| caso | papel | ec | sentinela server.log | stdout | stderr | argv host | argv container (amostras) | resultado |
|---|---|---|---|---|---|---|---|---|
| sucesso (papel novo) | `c2b7_ok` | **0** | **0** (156 linhas) | **0** | **0** | **0** | **0** (1403; 244 com `db-runtime-role.sh`) | linha final `c2b7_ok\|f\|f\|f\|f\|0\|0\|0` (views=0); `rolpassword` prefixo `SCRAM-SHA-256$`; super=f bypassrls=f replication=f login=t inherit=f; login com a sentinela → `login-ok:c2b7_ok`; senha errada → `FATAL: password authentication failed` |
| cliente pede md5 (`PGOPTIONS='-c password_encryption=md5'`), mesmo papel, sentinela nova | `c2b7_ok` | **0** | **0** (256) | **0** | **0** | **0** | **0** (1399; 243) | `rolpassword` prefixo `SCRAM-SHA-256$`, md5 do verificador MUDOU (=senha nova aplicada); login com a sentinela 2 ok. Controle: o mesmo `PGOPTIONS` sem o forçamento do script → `SHOW password_encryption` = **md5** (o pedido md5 é real e o script o sobrepõe) |
| MODO 6 do caso COL | `c2b7_col` | **3** | **0** (413) | **0** | **0** | **0** | **0** (1365; 232) | stderr: `MODO 6` ×1, `por 1 via(s): view:c2b7_w.`; depois: `rolpassword` NULO, login=f, inherit=f, super=f, bypassrls=f (nada persistiu); `ALTER USER … PASSWORD` no log não cresceu (2 → 2: a sessão da senha não foi alcançada) |

- Montagem do COL (`$S/col.sql`, no B7): tabela `c2b7_t` ENABLE+FORCE com a política de tenant, linhas A, B, B; view `c2b7_w` de dono `postgres`; papel `c2b7_col` pré-criado `NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS` com `GRANT SELECT (tenant_id, value)` só na view. Âncora medida antes: `has_table_privilege = false`, `has_any_column_privilege = true`, dono da view `postgres`, `relforcerowsecurity = true`.
- Agregado final (`docker logs` inteiro, 415 linhas): as 3 sentinelas × server.log = **0/0/0**; × todos os stdout/stderr/argv-container = **0/0/0**; `ALTER USER … PASSWORD 'SCRAM-SHA-256$` = 2; `PASSWORD '` que não seja `SCRAM-SHA-256` = **0**.
- O verificador `SCRAM-SHA-256$…` aparece no log (2×): residual declarado nos ciclos anteriores — não é achado (reprovação por construção).
- Veredito parcial item 1 (B7): VERDE — sentinela em claro **0** em server.log, stdout, stderr, argv do host e argv do container, nos 3 casos (sucesso, cliente md5, MODO 6 do COL), com os três leitores vistos achando; `SCRAM-SHA-256$` em todos os `rolpassword` definidos; papel converge `NOSUPERUSER NOBYPASSRLS NOREPLICATION`; MODO 6 ec=3 nomeando a view, sem persistir senha. Falta só citar o T14a/b do lote (item 2, execução r1).

## Item 2 — B2: catálogo só sob a trava, T14c intacto, lote -db N=3, resíduo

### 2(a) Escritores de catálogo dos subtestes reescritos — gerados por AST (≈20:35Z)
- Extrator `$S/escritores.cjs` (md5 `0033f17cb79b2fb1e741a60cd6306982`, AST do `typescript` do `/work/node_modules`): acha os `suite.test` cujo título começa por `T8c ·`, `T8d ·`, `T8e ·`, `T8f ·`, `T14d ·`; varre TODA `CallExpression` do corpo e, por fecho transitivo, das funções de topo locais chamadas; classifica `catalog`/`withRoleCatalogLock`/`runRoleScript`/`runCatalogPsql`/`runCatalogCommand` = SOB-TRAVA; `dropRole`/`dropEphemeralRoleResilient` = SOB-TRAVA (arnês); `$executeRaw*`/`$queryRaw*` pelo texto do 1º argumento (DDL/DCL/REFRESH/slot = escrita; dentro de callback de `catalog`/`withRoleCatalogLock` = sob a trava); `spawn*`/`exec*`/`fork` = filho; e se a chamada está num `finally`.
- Saída (`node /tmp/escritores.cjs tests/san3-05-runtime-role-guard-db.test.ts` no container, 193 linhas): subtestes `T8c@l.725, T8d@l.790, T8e@l.883, T8f@l.981, T14d@l.1379`; auxiliares alcançados: `token, secret, ident, literal, prismaFor, urlForRole, findEscape, posture, createViewRuleTables, escapeLines, createViewRuleObject, viewRuleAnchor, rowsThroughView, updateThroughView, insertThroughView, dropViewRuleObject, dropViewRuleTables` (a lista da fábrica + `posture`/`prismaFor`/utilitários puros). Classes: SOB-TRAVA 17 · LEITURA 9 · DADO/OUTRO 4 · ESCRITA-CATALOGO-FORA-DA-TRAVA 4 · FILHO 0.
- Escritas de catálogo dos reescritos (T8c-caso-view saiu, T8d só `objetos`, T8e, T8f, T14d e auxiliares):
  - `createViewRuleTables` l.139 → `catalog` (CREATE ROLE dono comum, CREATE TABLE ×2, ENABLE/FORCE, CREATE POLICY ×2, INSERT) — uma transação sob a trava.
  - `createViewRuleObject` l.173 → `catalog` (CREATE VIEW/MATERIALIZED VIEW, ALTER … OWNER, GRANTs de coluna).
  - `dropViewRuleObject` l.182 → `catalog` (DROP VIEW/MATERIALIZED VIEW IF EXISTS).
  - `dropViewRuleTables` l.155 `catalog` (DROP TABLE ×2) + l.159 `dropRole` (arnês: cada statement em `withRoleCatalogLock`, lido em `tests/helpers/auth-identity-fixture.ts` l.256-270).
  - T8e l.898 `catalog` (CREATE ROLE dos 4 leitores); T8e l.971 `dropViewRuleObject` **finally=sim** (por caso); l.975 `dropRole` **finally=sim**; l.976 `dropViewRuleTables` **finally=sim**.
  - T14d l.1387 `catalog` (CREATE ROLE runtime por caso); l.1403 `runRoleScript` (→ `runCatalogCommand` → `withRoleCatalogLock`); l.1421 `dropViewRuleObject` **finally=sim**; l.1422 `dropRole` **finally=sim**; l.1426 `dropViewRuleTables` **finally=sim**.
  - `createViewRuleTables` em T8e l.886 e T14d l.1383 fica FORA do `try` — é atômica (uma transação de `catalog`): se falhar, nada fica; se passar, o `try` seguinte é quem derruba.
- Leituras/dado (não escrita de catálogo): `viewRuleAnchor` l.192 (`has_table_privilege`/`has_any_column_privilege`), `rowsThroughView` l.207-208, `updateThroughView` l.235 (UPDATE de dado pela view), `insertThroughView` l.223 (INSERT de dado), T8e l.931/939 (contagem pelo admin), T8c l.771 (`mutant` = SELECT da trava), T8d l.855 (COPY TO PROGRAM — porta do papel de servidor), l.859/863.
- As 4 FORA-DA-TRAVA são todas de **slot de replicação** no T8d (l.821/835 `pg_create_physical_replication_slot`, l.825/871 `pg_drop_replication_slot`) — estado de slot, não tabela de catálogo (`pg_authid`/`pg_auth_members`/`pg_class`); **não são do ciclo**: `git diff -U0 7c63f920 84831ad9 -- <guard>` | grep `replication_slot` = vazio; `git log -S'pg_create_physical_replication_slot'` → `bbbb3b29 2026-10-04 test(database): prova replication sem depender do hba` (ciclo anterior deste bloco). Classificação: nota, pre-existente, fora da matéria do ciclo.
- **Vermelho-controle do extrator:** cópia `/tmp/guard-mut.ts` no container com UMA linha injetada (âncora `await dropViewRuleObject(admin, object);` com ocorrência = 1; diff = 1 linha) `await admin.$executeRawUnsafe(\`DROP VIEW IF EXISTS public.zz_controle_fora\`)` dentro do `finally` do T8e → o extrator acusa `T8e l.972 ESCRITA-CATALOGO-FORA-DA-TRAVA finally=sim` (5ª linha nova); cópia apagada.
- Veredito parcial 2(a): VERDE — todo escritor de catálogo dos subtestes reescritos (criação e teardown) passa por `catalog`/`withRoleCatalogLock`/`runRoleScript`/`dropRole`(arnês); todo teardown de view/matview/tabela/papel deles está em `finally`.

### 2(b) T14c igual e contagens intactas (≈20:35Z)
- `$S/t14c.cjs` (as 5 regex lidas no blob, l.1332-1336: `/\bspawnCommand\(/g`, `/\brunCatalogCommand\(/g`, `/\bROLE_SCRIPT\b/g`, `/\bspawn\(/g`, `/\bspawnSync\(/g`) sobre o blob (sem CR) de cada head:
  - `7c63f920`: **2·4·5·2·3**; bloco do T14c (do `await suite.test(` do título até o próximo) 64 linhas, md5 `0c47e6fbb5b81be4b0653a3b0061fe6f`.
  - `84831ad9`: **2·4·5·2·3**; bloco 64 linhas, md5 `0c47e6fbb5b81be4b0653a3b0061fe6f` — **idêntico**.
- O `ok` do T14c nas 3 execuções vai em 2(c).

### 2(c) Lote -db N=3 no MESMO container e banco (`j05c4-c2-node` → `j05c4-c2-pg`, migrado uma vez)
- Condutor `$S/lote.sh` (md5 `3cdc1d18ae02d6f6fffb54e66a7d3ee8`): `dk exec -e DATABASE_URL -w /work j05c4-c2-node timeout 900 node --test --test-reporter=tap --import tsx tests/san3-05-runtime-role-guard-db.test.ts tests/san3-05-leituras-de-plataforma-db.test.ts > tap-<r>.log 2>&1` (os dois arquivos JUNTOS, como a receita — o node roda os arquivos em paralelo: em r1 leituras 7,4 s e guard 18,5 s num total de 19 s), ec por variável; depois resíduo por `$S/residuo.sql` (md5 `267de59aa8647aa87a14fd1363b7ae78`, gerado por `$S/gen-residuo.cjs` md5 `ee4a2f6e054d666cb0f6852c4d468a30`: os 2 CTE `view_walk`+`view_force` extraídos do blob da trava pela regex do T8f, exatamente 1 bloco; famílias do arnês = as 6 de `SWEPT_ROLE_FAMILIES` lidas em `tests/helpers/auth-identity-fixture.ts` l.117-124: o6r_b01, o6r_clone_owner, audit_rls, vid_rls_test, vid_link_rls, rls_test). Por arquivo: `$S/tapparse.cjs` (md5 `7063beca3fb9face3add38c05cf04e16`). Timeouts lidos no blob: guard externo `180_000` (l.575), T14c `45_000` (l.1318), T14d `90_000` (l.1381), T15 `90_000` (l.1433); leituras `600_000` (l.123).
- **Vermelho-controle (2) — contador de resíduo** (antes de r1): base `papeis_s305=0 papeis_arnes=0 tabelas_s305=0 views_s305=0 matviews_s305=0 outras_rel_s305=0 views_fora_do_sistema=0 view_force=0 bancos_s305=0 slots=0`; com `s305_zz_controle` (papel) + `s305_zz_controle_t` (tabela ENABLE+FORCE) + `s305_zz_controle_v` (view sobre ela) → `papeis_s305=1 tabelas_s305=1 views_s305=1 views_fora_do_sistema=1 view_force=1` (+1 em papéis, views e view_force ✓); removidos → tudo 0 ✓. Extra: papel `o6r_b01_1_controle` → `papeis_arnes=1`, removido → 0 ✓; matview `s305_zz_mv` → `matviews_s305=1 views_fora_do_sistema=1`, removida → 0 ✓.
- **Vermelho-controle (1) — leitor de erro:** (1a) cópia de `tap-r1.log` com UMA linha `… XX000 tuple concurrently updated` inserida → `grep -c XX000` = **1** (original 0) ✓; (1b) arquivo de teste efêmero no container que escreve `[o6r-arnes] XX000 23505 40P01 …` no **stderr** do filho, rodado pelo MESMO `dk exec … node --test --test-reporter=tap … > log 2>&1` → XX000=1, 23505=1, 40P01=1 no arquivo ✓ (o arquivo recebe o stderr do filho — é onde o arnês escreve o erro absorvido). Arquivo efêmero removido.
- **r1** (`20:36:34Z`): resíduo antes = 0 em todas as colunas (linha acima).
  [r1] 20:36:34Z psql no PATH do lote: /usr/lib/postgresql/16/bin/psql
  [r1] 20:36:54Z node --test ec=0 duracao_s=20 linhas_tap=137
  [r1] sumario: # tests 25 # suites 0 # pass 25 # fail 0 # cancelled 0 # skipped 0 # todo 0 # duration_ms 19067.376102
  [r1] XX000=0 23505=0 40P01=0 'tuple concurrently'=0 o6r-arnes=0
  [r1] residuo depois: papeis_s305=0 papeis_arnes=0 tabelas_s305=0 views_s305=0 matviews_s305=0 outras_rel_s305=0 views_fora_do_sistema=0 view_force=0 bancos_s305=0 slots=0
  - por arquivo: B-SAN3-05 · T10–T12 — plataforma sob pap | tests=13 pass=13 fail=0 cancelled=0 skipped=0 | pai=7429ms |
  - por arquivo: B-SAN3-05 · o papel de runtime não conto | tests=12 pass=12 fail=0 cancelled=0 skipped=0 | pai=18487ms | T14c=774/45000 T14d=558/90000 T15=7190/90000
  - T14a/b (B1 no lote, asserção `rolpassword` ~ `^SCRAM-SHA-256$` inclusive sob `PGOPTIONS='-c password_encryption=md5'`, l.1013-1026): `# Subtest: T14a/b · o procedimento converge, é idempotente`; T14c: `ok 9 - T14c · filhos escritores respeit`.
  - (correção da linha acima: o grep pegou o `# Subtest:`) linha de resultado: `ok 8 - T14a/b · o procedimento converge, é idempotente e falha fecha`
- **r2:**
  [r2] 20:38:07Z psql no PATH do lote: /usr/lib/postgresql/16/bin/psql
  [r2] 20:38:22Z node --test ec=0 duracao_s=15 linhas_tap=137
  [r2] sumario: # tests 25 # suites 0 # pass 25 # fail 0 # cancelled 0 # skipped 0 # todo 0 # duration_ms 14160.15912
  [r2] XX000=0 23505=0 40P01=0 'tuple concurrently'=0 o6r-arnes=0
  [r2] residuo depois: papeis_s305=0 papeis_arnes=0 tabelas_s305=0 views_s305=0 matviews_s305=0 outras_rel_s305=0 views_fora_do_sistema=0 view_force=0 bancos_s305=0 slots=0
  - por arquivo: B-SAN3-05 · T10–T12 — plataforma sob pap | tests=13 pass=13 fail=0 cancelled=0 skipped=0 | pai=4575ms |
  - por arquivo: B-SAN3-05 · o papel de runtime não conto | tests=12 pass=12 fail=0 cancelled=0 skipped=0 | pai=13598ms | T14c=636/45000 T14d=402/90000 T15=6134/90000
  - T14a/b e T14c: `ok 8 - T14a/b · o proced ok 9 - T14c · filhos esc `
- **r3:**
  [r3] 20:38:30Z psql no PATH do lote: /usr/lib/postgresql/16/bin/psql
  [r3] 20:38:46Z node --test ec=0 duracao_s=16 linhas_tap=137
  [r3] sumario: # tests 25 # suites 0 # pass 25 # fail 0 # cancelled 0 # skipped 0 # todo 0 # duration_ms 14282.282078
  [r3] XX000=0 23505=0 40P01=0 'tuple concurrently'=0 o6r-arnes=0
  [r3] residuo depois: papeis_s305=0 papeis_arnes=0 tabelas_s305=0 views_s305=0 matviews_s305=0 outras_rel_s305=0 views_fora_do_sistema=0 view_force=0 bancos_s305=0 slots=0
  - por arquivo: B-SAN3-05 · T10–T12 — plataforma sob pap | tests=13 pass=13 fail=0 cancelled=0 skipped=0 | pai=4407ms |
  - por arquivo: B-SAN3-05 · o papel de runtime não conto | tests=12 pass=12 fail=0 cancelled=0 skipped=0 | pai=13638ms | T14c=592/45000 T14d=380/90000 T15=6322/90000
  - T14a/b e T14c: `ok 8 - T14a/b · o proced ok 9 - T14c · filhos esc `
- **Vermelho-controle (3) — o lote depende do `psql`** (`lote.sh ctl-sempsql sempsql`: `-e PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`):
  [ctl-sempsql] 20:38:55Z psql no PATH do lote: AUSENTE
  [ctl-sempsql] 20:39:06Z node --test ec=1 duracao_s=11 linhas_tap=206
  [ctl-sempsql] sumario: # tests 25 # suites 0 # pass 21 # fail 4 # cancelled 0 # skipped 0 # todo 0 # duration_ms 10399.715396
  [ctl-sempsql] XX000=0 23505=0 40P01=0 'tuple concurrently'=0 o6r-arnes=0
  [ctl-sempsql] residuo depois: papeis_s305=0 papeis_arnes=0 tabelas_s305=0 views_s305=0 matviews_s305=0 outras_rel_s305=0 views_fora_do_sistema=0 view_force=0 bancos_s305=0 slots=0
  - B-SAN3-05 · T10–T12 — plataforma sob pap | tests=13 pass=13 fail=0 cancelled=0 skipped=0 | pai=3221ms |
  - B-SAN3-05 · o papel de runtime não conto | tests=12 pass=8 fail=4 cancelled=0 skipped=0 | pai=10074ms | T14c=658/45000 T14d=94/90000 T15=5213/90000
  -    VERMELHO/SKIP: T14a/b · o procedimento converge, é idempotente e falha fechado nos modos nomeados
  -    VERMELHO/SKIP: T14c · filhos escritores respeitam a trava única e a guarda estrutural é fechada
  -    VERMELHO/SKIP: T14d · MODO 6: qualquer view/matview sobre tabela FORCE recusa o papel novo, sem olhar don
  - mensagens no TAP (contagem): `psql: ausente — pré-requisito da suíte -db` ×1 (T14a/b) · `psql: command not found` ×3 · `caso COL: status deveria ser 3` ×1 (T14d) · skipped = **0**. O teardown do caminho de FALHA também deixou resíduo **0** (inclusive `view_force=0`).

**Tabela N=3:**

| execução | ec | duração | guard-db (tests/pass/fail/cancelled/skip) | leituras | total | XX000 / 23505 / 40P01 | T14c / T14d / T15 (ms) × timeout | resíduo depois (papéis s305·arnês · tab·view·matview s305 · views fora do sistema · view_force · bancos · slots) |
|---|---|---|---|---|---|---|---|---|
| r1 | 0 | 20 s | 12/12/0/0/0 | 13/13/0/0/0 | # tests 25 # pass 25 # fail 0 | 0 / 0 / 0 | T14c=774/45000 T14d=558/90000 T15=7190/90000 | 0 em todas as 10 colunas |
| r2 | 0 | 15 s | 12/12/0/0/0 | 13/13/0/0/0 | # tests 25 # pass 25 # fail 0 | 0 / 0 / 0 | T14c=636/45000 T14d=402/90000 T15=6134/90000 | 0 em todas as 10 colunas |
| r3 | 0 | 16 s | 12/12/0/0/0 | 13/13/0/0/0 | # tests 25 # pass 25 # fail 0 | 0 / 0 / 0 | T14c=592/45000 T14d=380/90000 T15=6322/90000 | 0 em todas as 10 colunas |

- Denominador idêntico nas 3: guard-db **12**, leituras **13**, total **25** (= o plano: 12 e 13). Nenhum `cancelled`, nenhum `skip`. `XX000`/`23505`/`40P01`/`tuple concurrently`/`[o6r-arnes]` = **0** em todo TAP (stdout+stderr), inclusive absorvido. Durações muito abaixo dos timeouts lidos no blob (externo 180 s: guard 18,5/13,6/13,6 s; leituras 600 s: 7,4/4,6/4,4 s). Resíduo **0** antes, entre e depois (todas as colunas, inclusive `view_force` e views fora do sistema).
- Veredito parcial item 2: VERDE — escritores reescritos só sob a trava (gerado por AST, extrator visto acusando), teardown em `finally`, T14c idêntico (2·4·5·2·3) e verde 3/3, lote 3 × 12/13 sem XX000/23505/40P01, resíduo 0; os três controles acusaram. Nota: as 4 chamadas de slot de replicação do T8d fora da trava são pre-existentes (`bbbb3b29`, 2026-10-04) e não são escrita de tabela de catálogo.

## Item 3 — Escopo do ciclo contra o C4.4 (≈20:39–20:44Z)

### 3(a) Head do disparo e diff do ciclo
- Head do disparo = `7c63f920c996cf105535f345eec2ee10461c77a3` ("docs(plano): ciclo 4 do B-SAN3-05 — proibir qualquer view sobre tabela FORCE"), por três fontes: `ciclo4/DEV-relatorio.md` l.7 ("Head do disparo: 7c63f920… = ls-remote … medido 17:52Z"); plano C4.5 D0 ("head do disparo (o commit deste plano)"); `git log` (pai `37c83064` = registro da D-405-PROIBIR-VIEWS). Não há mandato do dev do ciclo 4 em `00-mandatos/` (só `dev.md`/`dev-sucessor-2.md` de ciclos anteriores) — nota de registro.
- `git merge-base --is-ancestor 7c63f920 84831ad9` → **0** (ancestral); controle: `a9bbde38` (origin/main) → **1**. `git rev-list --merges 7c63f920..84831ad9 | wc -l` → **0** (sem merge da main no ciclo). 9 commits:
  - registro do orquestrador: `a10fc267` (esqueleto `ciclo4/DEV-relatorio.md`, +32), `2400049b` (ata da junta 3 `J-B-SAN3-05.md` +27 append-only, `R-B-SAN3-05-3.md` +8, os 6 corpos `jurado-san305-c4-*` nos dois espelhos, `ciclo4/FABRICA-relatorio.md`, `00-mandatos/inspetor-c4.md`), `79b0d594` (mandatos C1c4/C2c4/C3c4 + parecer do inspetor da junta 4), `84831ad9` (evidência e voto da C1 — só o nome; não abertos);
  - dev: `afb575b4` (fix: trava, script, guard-db, catalog-guard, deployment, relatório), `d66eb178`, `941c9ea7`, `737e8cf3` (só o relatório), `2fee8d28` (log-execucao, status-geral, relatório).
- `git diff --name-only 7c63f920 84831ad9` = **24** arquivos = união (dev 8 ∪ orquestrador 17, `DEV-relatorio.md` nos dois) — diff da união × lista do ciclo vazio.
- Os registros do orquestrador são os da transição junta 3 → junta 4 e desta junta (corpos, mandatos e parecer da junta 4; ata/R-3 da junta 3, append-only; voto da C1). Nenhum commit do orquestrador toca `src/`, `scripts/`, `tests/`, `prisma/`, `docs/` ou `Kpis/` (name-status por commit).

### 3(b) Cada arquivo e cada bloco, classificado por script
- Extrator `$S/escopo.cjs` (md5 `d1e85464961d1460bfb2eb2ae3e9286c`): do blob do plano no objeto, os caminhos entre crases do trecho "PERMITIDO (e nada mais):" até "PROIBIDO:" (8) e de "PROIBIDO:" até "Nunca git add" (20), mais o §C4 do `CLAUDE.md` do objeto (6: `prisma/**`, `migrations/**`, `infra/**`, `.env`, `pubspec.yaml/lock`, `Kpis/*`). PERMITIDO extraído: `src/database/runtime-role.ts` · `scripts/db-runtime-role.sh` · `tests/san3-05-runtime-role-guard-db.test.ts` · `tests/db-catalog-write-guard.test.ts` · `docs/deployment.md` · `agent-orchestration/codex/log-execucao.md` · `agent-orchestration/docs/status-geral.md` · `agent-orchestration/omega/juntas/votos/B-SAN3-05/ciclo4/DEV-relatorio.md`.
- Arquivos do DEV (8) → **8/8 PERMITIDO** (cada um casa exatamente uma entrada; o casamento com `src/**`/`scripts/**`/`tests/**` do PROIBIDO é o "todo OUTRO" da linha, que o PERMITIDO específico precede). **0 fora.** Arquivos do orquestrador (17) → registro.
- Blocos com restrição ("só X"), por `git diff -U0 7c63f920 84831ad9`:
  - `src/database/runtime-role.ts` (+9 −16, 5 hunks): comentário do topo (l.4-7 novo; hash diagnóstico l.12 novo / l.11 velho), CTE `view_escape` removido, ramo `view` = `FROM view_force vf JOIN pg_class v … JOIN pg_roles o ON o.oid = v.relowner` sem WHERE, e a string da mensagem (l.108 velho → l.101) com "e nenhuma view/matview sobre tabela FORCE" → **só SQL, comentário e mensagem** ✓.
  - `scripts/db-runtime-role.sh` (8 hunks, ver 1(a)): cabeçalho ×2, CTE ×2, ramo `view` do `DO`, `RAISE` (4 % × 4 args), coluna `views` ✓; + o comentário-cabeçalho da linha final (`views_de_dono_que_escapa` → `views_sobre_force`) — **divergência declarada pelo dev**: rótulo da coluna `views` cujo significado mudou; classifico como parte de "a coluna views"/"cabeçalho" → **nota, não grave** (comentário SQL; efeito na senha 0, medido no item 1).
  - `tests/san3-05-runtime-role-guard-db.test.ts`: `$S/blocos.cjs` (md5 `d6be394033a69170fda273309f2eb1bb`) mapeia cada hunk às regiões nomeadas (subtestes por título; declarações de topo por nome) nos dois heads; `$S/avalia.awk` (md5 `fc42a228…`) contra as regiões permitidas `$S/regioes-ok.txt` (md5 `20d6aa55…`: T8c, T8d, T8e, T8f, T14d + auxiliares deles — os novos ViewRule*/VIEW_RULE_CASES/createViewRule*/dropViewRule*/viewRuleAnchor/escapeLines/rows|insert|updateThroughView e o comentário l.115 que os abre, e os removidos ViewEscape*/create|dropViewEscapeFixture/assertNoInnerSelect) → **32 hunks, 0 fora**. md5 por subteste (old × new): **T5/T6/T9 IGUAL · T7/T8 IGUAL · T8b/T8c IGUAL · T14a/b IGUAL · T14c IGUAL · T15 IGUAL**; MUDOU só T8c, T8d, T8e, T8f, T14d. T8c: só sai o caso `view` (`loginView`, `tableView`, `view`, a entrada `via: "view"`, criação e teardown deles) e o título "três" → "dois semi-mutantes" — **divergência declarada**, consequência da retirada do caso → **nota, não grave**. T8d: 1 linha, `objetos` 1 → 2 ✓.
  - `tests/db-catalog-write-guard.test.ts` (+2 −2): só a entrada `san3-05-runtime-role-guard-db.test.ts` (`count: 82` → `72` e o `reason`) ✓ (3(d)).
  - `docs/deployment.md` (+11 −9, 3 hunks): l.95 (via `view`), l.127 (MODO 6), l.134 (frase do compose) — exatamente os 3 trechos do C4.2(3) ✓.
  - `agent-orchestration/codex/log-execucao.md` +6 (1 hunk, "## B-SAN3-05 — ciclo 4 do dev"), `agent-orchestration/docs/status-geral.md` +8 (1 hunk, "## B-SAN3-05 — ciclo 4 de desenvolvimento") → 1 entrada cada ✓. `DEV-relatorio.md` +215 ✓.
- **Vermelho-controle (2) do classificador:** lista fabricada `prisma/schema.prisma` + `tests/san3-05-runtime-role-guard-db.test.ts` → `prisma/schema.prisma  -  PROIBIDO(prisma/**)` (acusado) e o teste PERMITIDO; diff fabricado com 1 hunk na l.1440 do head (dentro do T15, título na l.1432) → `FORA: @@ -1405 +1440 -> sub:T15` (acusado). A 1ª passada do avaliador deu "32 fora" por eu ter passado caminho Windows ao `awk -v` (lista de regiões não lida) — falha MINHA de medição, refeita com caminho POSIX; o controle positivo segue acusando.
- **Vermelho-controle (1) dos meus vazios:** `git diff --quiet 7c63f920 84831ad9 -- Kpis/` ec=0 tem o irmão `-- docs/` ec=**1** (1 arquivo); `git rev-list --merges` vazio tem o irmão de ancestralidade `a9bbde38` ec=**1**; `diff --check` ec=0 tem o irmão `git diff --no-index --check a b` com espaço no fim → ec=**3**.

### 3(c) Kpis/
- `git diff --quiet 7c63f920 84831ad9 -- Kpis/` → **ec=0** (sem diff no ciclo). Informação: `git diff --quiet origin/main 84831ad9 -- Kpis/` → ec=0.

### 3(d) Guarda de catálogo
- Diff do ciclo em `tests/db-catalog-write-guard.test.ts`: só l.140 (`count: 82` → `72`) e l.142 (`reason`), dentro da entrada `"san3-05-runtime-role-guard-db.test.ts"` (l.138).
- Recontagem minha (`$S/recontagem.cjs`, os 6 padrões do blob l.62-69: CREATE ROLE, DROP ROLE, ALTER ROLE, GRANT, REVOKE, OWNER TO): guard-db no objeto = **72** (31·0·2·30·1·8) = `count` da entrada ✓; no head do disparo = **82** (31·0·2·34·1·14) = `count` anterior ✓. Os outros `tests/san3-05-*` (acessos, leituras, bootstrap) = **0** cada → fora do mapa com razão.
- `timeout 300 node --test --test-reporter=tap --import tsx tests/db-catalog-write-guard.test.ts` no container (DATABASE_URL do meu pg) → **ec=0, 5/5, fail 0** (as 2 ocorrências de `XX000` no TAP são só o título "(PA) … não produz XX000", l.7-8).
- **Vermelho-controle (3):** cópia no container com UMA linha "// controle C2: GRANT a mais num comentario" (âncora de ocorrência 1; diff = 1 linha) → **ec=1, 4/5, "contagem 73 difere da congelada 72"**; restaurado por `cp` do `.pristino`: md5 container `57ab4744f6b06e0614b4830237a75467` = `git cat-file blob 84831ad9:<f> | md5sum` `57ab4744…`; re-execução → 5/5 ec=0.

### 3(e) Modo, EOL, diff limpo
- `git ls-files -s scripts/db-runtime-role.sh` → **100755** `c0d51635…`; `git ls-files --eol` → **i/lf w/lf attr/text eol=lf**; `git check-attr -a` → `text: set`, `eol: lf`. Bytes CR no blob do script = **0** (LF 147; contagem em bytes por node; controle: arquivo com 1 CR → 1); no disco do meu worktree = 0.
- `git diff --check 7c63f920 84831ad9` → **ec=0**, saída vazia.
- Veredito parcial item 3: VERDE — diff do dev ⊆ PERMITIDO (8/8), blocos dentro das restrições (32/32 hunks do guard-db nas regiões permitidas; T5, T7/T8, T8b/T8c, T14a/b, T14c, T15 byte a byte), registro do orquestrador separado e sem código, Kpis/ sem diff, guarda só na entrada com recontagem 72 = count e 5/5, 100755/eol=lf, diff --check 0. Duas divergências declaradas pelo dev: **nota, não grave**.

### 2(d) Complemento — resíduo no CAMINHO DE FALHA do T8e (≈20:45Z)
- Por que: o AST provou teardown em `finally`; meço o efeito. Mutação SÓ na cópia do container (`src/database/runtime-role.ts`, `.pristino` antes): âncora `  JOIN pg_roles o ON o.oid = v.relowner` com ocorrência **1**, acrescenta `  WHERE o.rolsuper OR o.rolbypassrls` (a forma da M4b; diff = 1 linha, l.49). Não julgo a mutação (é da C1): uso-a só para forçar o T8e a falhar DEPOIS de criar tabelas, papéis e a view.
- `timeout 900 node --test --test-reporter=tap --import tsx tests/san3-05-runtime-role-guard-db.test.ts` → ec=1, `# tests 12 # pass 10 # fail 2` (T8e + pai), mensagem "caso COM: a trava precisa recusar a view de dono comum sem grant"; XX000/23505/40P01/[o6r-arnes] = 0.
- Resíduo depois do caminho de falha: **0 em todas as colunas** (papéis s305/arnês, tabelas/views/matviews s305, views fora do sistema, `view_force`, bancos, slots). O mesmo valeu para o T14d no caminho de falha do controle sem psql (2(c)).
- Restauro: `cp` do `.pristino`; md5 container `9efee03db097f54e73178e1ec4c740d9` = `git cat-file blob 84831ad9:src/database/runtime-role.ts | md5sum` `9efee03d…`. Re-execução do guard-db após o restauro: ver linha seguinte.
- Pós-restauro: `node --test … guard-db` → ec=0, `# tests 12 # pass 12 # fail 0 `; resíduo `papeis_s305=0 view_force=0 `.
- Nota de registro: horários marcados com ≈ nos títulos foram corrigidos depois (eu os escrevera adiantados); os exatos são os das saídas `date -u`/`now` coladas (setup 20:28:50–20:30:38Z, B7 20:32:38–≈20:34Z, r1 20:36:34Z, r2 20:38:07Z, r3 20:38:30Z, sem-psql 20:38:55Z, re-resolução final 20:46:14Z).

## F. Fecho (20:46–20:48Z)
### F1. Objeto e main no fim
- `git ls-remote origin refs/heads/fix/runtime-role-sem-bypass` = `gh pr view 405 --json headRefOid` = `84831ad9796d8db29766b0ff6e0a1a894a9d45e7` (20:46:14Z) — **igual** ao do início; `origin/main` no fim = `a9bbde382213627545e9d229c9ab616d83a0a840` (igual ao início).

### F2. Anomalias de terreno (sem efeito no mérito)
- A cadeira C3 subiu `j05c4-c3-node`, `j05c4-c3-pg` e `j05c4-c3-redis` às 20:41:33Z (`docker ps -a`, só nomes e hora), em paralelo comigo — o C4.6 diz "uma cadeira por vez no Claude". Meu lote N=3 e o controle sem psql terminaram às 20:39:06Z, antes; o complemento 2(d) e a re-execução pós-restauro (≈20:44–20:46Z) correram no MEU cluster isolado. Os arquivos `ciclo4/C3-evidencia.md` e `ciclo4/C3-voto.json` foram vistos SÓ pelo nome no `git status`; não abri. Não toquei nos containers da C3.
- `docker image inspect` pela tag `erp-junta-node20-pg16:local` falha ("No such image") com a tag listada e `docker run` funcionando — infraestrutura (Docker 29.6.1), contornado pelo ID.

### F3. Teardown
- Containers `j05c4-c2-node`, `j05c4-c2-pg`, `j05c4-c2-b7-pg` → `docker rm -f -v` ec=0 (o servidor com `log_statement=all` foi removido junto); volumes anônimos `b3ca1ef5…` (pg) e `391cf0ca…` (b7) → removidos (`docker volume inspect` falha); rede `j05c4-c2-net` → `docker network rm` ec=0; contagem `j05c4-c2` containers = 0, redes = 0; volumes órfãos alheios: 18 antes e 18 depois (reportados, não tocados).
- Árvore temporária `/c/Users/AMP/t-j05c4c2` → ausente (removida pelo setup após a cópia).
- Worktree: processos vivos com `w-j05c4c2` na linha de comando = **0**; `git worktree remove --force C:/Users/AMP/w-j05c4c2` ec=0; `git worktree list | grep -ic w-j05c4c2` = 0; diretório ausente.
- Mutações de controle (guarda com GRANT a mais; trava com o WHERE da forma M4b) restauradas no container com md5 = blob antes da remoção; o worktree do ramo nunca foi mutado.
- Scratch: `.secrets` (senhas descartáveis), `.sentinelas`, logs, TAPs e cópias apagados; o resto do `$SCRATCH` (scripts do condutor) é apagado logo após gravar o voto. `/tmp` do host: só os meus arquivos de leitura, apagados.
- Base viva: `erp-postgres`, `erp-redis`, `erp-postgres-alt` seguem `Exited` (nunca tocados; 5432/6379/55432 nunca alvo). No `w-o05`, `git status` mostra novos só os meus dois arquivos (+ os `C3-*` da outra cadeira, + `scratchpad/` alheio); 33 ` M` fantasmas com `git diff --name-only` = 0 (conteúdo idêntico).
- Disco `C:`: 11 GB no início, 12 GB no fim.

### F4. Achados (todos não graves; nenhum reprova no ciclo 4)
- **C2c4-N1** — nota · dentro-do-bloco · não grave: o comentário-cabeçalho da linha final do script (`views_de_dono_que_escapa` → `views_sobre_force`) está fora da letra estrita do PERMITIDO do script; declarado pelo dev; efeito em B1 medido = 0.
- **C2c4-N2** — nota · dentro-do-bloco · não grave: o título do T8c mudou ("três" → "dois semi-mutantes"), declarado; consequência da retirada do caso `view` que o plano manda.
- **C2c4-N3** — nota · pre-existente (`git log -S'pg_create_physical_replication_slot'` → `bbbb3b29` 2026-10-04, fora do diff do ciclo): 4 chamadas de slot de replicação do T8d fora de `withRoleCatalogLock`; não escrevem tabela de catálogo; 0 `XX000` em 5 execuções.
- **C2c4-N4** — nota · registro · não grave: não há mandato do dev do ciclo 4 em `00-mandatos/`; o head do disparo foi provado por relatório + plano + git.
- **C2c4-N5** — nota · terreno: C3 em paralelo (F2).
- Critérios que não puderam falhar: nenhum restou. Dois leitores MEUS nasceram cegos e foram pegos pelos próprios controles antes de concluir (regex do SCRAM com `$` como âncora; `awk -v` com caminho Windows) — corrigidos e re-medidos.

### F5. Lido como insumo (roteiro, não fato)
- Corpo e mandato (blob do objeto), parecer do inspetor da junta 4, `decisoes.md` (R3/R4, D-405-PROIBIR-VIEWS, D-FABLE-ASTRA-SO-DINHEIRO), plano §Ciclo 4 (C4.1–C4.6), `ciclo4/DEV-relatorio.md`, `tests/helpers/auth-identity-fixture.ts`, a receita do terreno. NÃO li `ciclo4/C1-*` nem `ciclo4/C3-*`.

VOTO: APROVADO — senha em claro 0 no server.log/terminal/argv (host e container) sob log_statement=all no sucesso e no MODO 6 do caso COL (+ cliente md5), com os leitores vistos achando, SCRAM em todas; escritores reescritos só sob a trava (AST), T14c igual e verde (2·4·5·2·3), lote -db 3 × 12/13 sem XX000/23505/40P01 e resíduo 0 (view_force 0, inclusive no caminho de falha); diff do ciclo ⊆ PERMITIDO (registro do orquestrador separado), Kpis/ sem diff, guarda de catálogo só na entrada e 5/5 (recontagem 72), 100755/eol=lf, diff --check 0; pendências: C2c4-N1..N5 (notas)
