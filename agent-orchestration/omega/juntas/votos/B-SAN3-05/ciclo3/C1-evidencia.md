papel: C1 | identidade: jurado-san305-c3-trava-de-views | modelo: Claude Opus 5.5 (claude-opus-5-5) (substituição: §C7.6-bis — D-FABLE-ASTRA-SO-DINHEIRO, Fable só em bloco de dinheiro; o B-SAN3-05 não toca dinheiro) | mandato_md5: 57954e0863bc89afafd2d05ea27c29e8 (declarado no disparo: 57954e0863bc89afafd2d05ea27c29e8) | corpo_md5: 002b50832790a0f59e789d74dcb75c93 (recebido no prompt: lido do blob f7fabd4a, md5 declarado no disparo 002b50832790a0f59e789d74dcb75c93 — igual)

# Evidência — C1 · junta 3 (ciclo 3) · B-SAN3-05 · PR #405

## Cabeçalho do terreno (gravado 2026-10-09T16:52Z)
- Objeto: **f7fabd4a7db230f93ceb2130f86a7e662882d3f5** — `git ls-remote origin refs/heads/fix/runtime-role-sem-bypass` = `gh pr view 405 --json headRefOid` (OPEN, rascunho, CONFLICTING, base main). Medido 16:51:20Z.
- origin/main no início: a9bbde382213627545e9d229c9ab616d83a0a840 (`git fetch origin main` ec=0).
- Cerca do mandato: o mandato cola 7c134e2c (head do pré-voo). `git diff --name-status 7c134e2c f7fabd4a` = `M controle/decisoes.md`, `A 00-mandatos/C1c3.md C2c3.md C3c3.md`, `A ciclo3/00-inspetor-terreno.md` → **delta só registro**. Árvores de produto 9a66b4e4 (head do dev) = f7fabd4a: src 804725bf, scripts f69aca41, tests 113c6e9f, prisma e906ac2e, docs/deployment.md 95a7eda3, Kpis 4ec5b46c, .github d7d81023, package.json e572e072, package-lock.json 9039d1e8 (iguais).
- Check-runs em f7fabd4a (`gh api …/commits/f7fabd4a…/check-runs?per_page=100` → arquivo; filtro: nonGreen = completed ∧ conclusion≠success; pending = status≠completed): **total 7 | não-verdes 0 | pendentes 0**; backend-postgres completed/success 16:42:35Z.
- Host: `uname -a` = MINGW64_NT-10.0-22631 … x86_64 Msys (Git Bash, Windows 11). Docker servidor 29.6.1 linux/amd64. `df -h /c` = 11G livres (96%).
- `docker ps -a` no início: erp-postgres (Exited 255), erp-redis (Exited 255), erp-postgres-alt (Exited), pastrack-teste-banco-teste-1 (Exited) — base viva desligada; 0 `j05c3-*`. `w-j05c3c1*` inexistente.
- Ambiente: Bash do Claude Code (Git Bash), cwd variável; nenhuma variável exportada; `MSYS_NO_PATHCONV=1` só como prefixo.
- Leitura de outras cadeiras: nenhuma `ciclo3/C2-*` / `ciclo3/C3-*` aberta.

## Legalidade (gravado 16:52Z)
- Parecer do inspetor da junta 3: `votos/B-SAN3-05/ciclo3/00-inspetor-terreno.md` (instância inspetor-de-terreno-da-junta, Opus 5.5, veredito 16:35Z) = **LIBERADO COM RESSALVA** (R1–R11), objeto julgado 7c134e2c; confere C1 = `jurado-san305-c3-trava-de-views`, corpo md5 002b5083… (= o meu), corpo rastreado nos dois espelhos (3.3/4.1), vaga `w-j05c3c1` e prefixo `j05c3-c1-` livres (1.2).
- Leitura de régua aplicada (decisoes.md @f7fabd4a, "Conflito registrado (§A2) e a leitura adotada na junta 3", R3/R4): escape medido que a trava REAL ou o MODO 6 deixam passar = A2 aberto = grave; produto recusa mas teste não acusa mutação = forma de teste = não grave = pendência; item não medido que possa esconder grave = reprova.
- Quórum: unanimidade de 3 com veto; ciclo 3 — só defeito grave de produto reprova (§C7 item 8(2)).

## Itens (P1 — gravados ao medir)

### Terreno (gravado 17:01Z)
- Worktree próprio: `git -C <árvore principal> worktree add --detach C:/Users/AMP/w-j05c3c1 f7fabd4a` ec=0; `test -e .git` ok; HEAD = f7fabd4a; `status --porcelain` = 0. Só leitura de git.
- Receita copiada: `receita-pg16.sh` md5 9861a2aaa55fc49fcf1c4263261a3668 → condutor próprio `setup.sh` md5 4fcc221336e57ecfbb41fbb5037b99ed (diff = 240 linhas: reescrito a partir dos passos 1–4 + sonda de argv). Diferenças declaradas: prefixo fixo `j05c3-c1-`; SEM `trap` de remoção (containers de pé para base/montagem/mutação/medição/restauro; teardown por nome no fim); SEM árvore temporária no host (archive direto ao container; lista md5 de `blobmd5.mjs` md5 bbcfb7db71350528f0184dfa7e274b82, que recalcula o sha1 de blob de cada arquivo lido por `git cat-file --batch` = `hash-object --no-filters` × ls-tree); senha do pg e das fixtures geradas no processo do condutor e passadas por `-e NOME` sem valor (ficam só no ambiente dos containers); sem Redis (não usado pelos meus itens).
- Saída do condutor (17:00:17–17:01:01Z, ec=0):
```
17:00:17Z subiram: rede=j05c3-c1-net pg=j05c3-c1-pg (volume anonimo 39f542afc74bcc51686e1c58b4519726770ad567e18bafe4021d969ac776950d) node=j05c3-c1-node · portas publicadas pg={"5432/tcp":null} node={} · HostConfig.PortBindings pg={}
17:00:17Z postgres: postgres (PostgreSQL) 16.14 (Debian 16.14-1.pgdg13+1)
blobs_regulares=3758 lidos=3758 sha1_de_blob_divergentes=0
17:00:21Z container: md5sum -c de 3758 arquivos -> ec=0 divergencias=0 · arquivos regulares em /work=3758
17:00:21Z md5 scripts/db-runtime-role.sh blob=911fddc132af8fa3c3d7fc976b7b6efe container=911fddc132af8fa3c3d7fc976b7b6efe
17:00:21Z md5 src/database/runtime-role.ts blob=692d953d26aafa8d40d6902fca2bccfc container=692d953d26aafa8d40d6902fca2bccfc
17:00:22Z md5 tests/san3-05-runtime-role-guard-db.test.ts blob=a7b0961586938aa9f9a024c81667f869 container=a7b0961586938aa9f9a024c81667f869
17:00:23Z versoes: node v20.20.2 · npm 10.8.2 · psql (PostgreSQL) 16.14 (Debian 16.14-1.pgdg13+1) · uname Linux 6.18.33.2-microsoft-standard-WSL2
17:00:34Z sonda argv (durante npm ci): senha_pg=0 senha_fixtures=0 · controle positivo (token no argv de docker exec)=4 (>=1) · controle negativo=0 (0) · processos com j05c3-c1-node=8
17:00:39Z npm ci ec=0 (added 326 packages in 15s)
17:00:42Z prisma generate ec=0
17:01:01Z prisma migrate deploy ec=0 (107 migrations found)
17:01:01Z catalogo public (tabelas|FORCE|views|matviews): 115|106|0|0
17:01:01Z senha do pg/fixtures nos logs do setup: 0
17:01:01Z SETUP OK
```
- Rede `j05c3-c1-net`; pg `j05c3-c1-pg` (postgres:16 = 16.14, volume anônimo 39f542af…); node `j05c3-c1-node` (erp-junta-node20-pg16:local, node v20.20.2, psql 16.14, setsid presente). PortBindings = {} (nenhuma porta no host). Base viva (erp-postgres/erp-redis/erp-postgres-alt) não tocada.
- Disco antes/depois do npm ci: 11G/11G livres.

### Item 1 — A2 por execução (em apuração; gravado 17:07Z)
**(a) A propriedade escrita no objeto** (blob f7fabd4a; md5 LF no container = blob: runtime-role.ts 692d953d…, db-runtime-role.sh 911fddc1…):
- Trava `src/database/runtime-role.ts` l.12-33 (CTE `view_walk` l.12-19: raízes = todo `pg_class` v/m; recursão por `pg_rewrite`→`pg_depend`→`pg_class` v/m; `view_force` l.20-25: raiz cuja árvore toca tabela r/p com `relforcerowsecurity`; `view_escape` l.26-33: `lv.oid = w.leaf_oid` = **cada nó** da árvore, raiz inclusive, com dono `rolsuper OR rolbypassrls` **ou** `lv.relkind = 'm'`) e ramo `view` l.50-56: privilégio = `has_table_privilege(session_user|current_user, <raiz>, 'SELECT,INSERT,UPDATE,DELETE')` (privilégio de **tabela**, na raiz); `rolname` = dono do nó que escapa; `objetos` = nº de raízes distintas.
- Script `scripts/db-runtime-role.sh`, `DO` l.81-102 (mesmos CTE) + ramo `view` l.110-112 (`has_table_privilege(alvo.oid, v.oid, 'SELECT,INSERT,UPDATE,DELETE')`, nomeia `v.relname` = a **raiz**) + `RAISE` l.115 (MODO 6); linha final l.133-154 (mesmos CTE) + coluna `views` l.158 (`count(DISTINCT ve.root_oid)` com o mesmo `has_table_privilege`).
- Matview: entra como nó (`relkind IN ('v','m')`) e como raiz; escapa por `relkind = 'm'`, de qualquer dono. As três cópias têm a mesma propriedade; divergência de texto com o C3.2(2) não medida aqui (é critério do T8f, item 3).

**(b)+(c) Montagem** (banco `j05c3c1_fx` = clone de `erp_techsolutions` migrado, 107 migrations; fixture `zz-j05c3c1-fixture.sql` md5 114e45bfb00711d6e321b3811f386cab, driver `zz-j05c3c1-montar.sh` md5 33749d28dff4773abcb923d9328fddbf): tabela `zc1_t` ENABLE+FORCE, política `USING` + `WITH CHECK` por `current_setting('app.current_tenant_id', true)` (forma das migrações: 208 ocorrências em 64 arquivos de `prisma/migrations` no objeto; política lida: `branches_tenant_isolation` USING+WITH CHECK), linhas A, B, B; donos `zc1_common` (NOLOGIN NOSUPERUSER NOBYPASSRLS) e `zc1_bypass` (NOLOGIN NOSUPERUSER BYPASSRLS); leitores por `CREATE ROLE … LOGIN … NOINHERIT`; papéis do script `zc1_s_*` NOLOGIN NOINHERIT com o privilégio só na raiz. **Tudo criado antes de qualquer execução do script**: `pg_default_acl` = 0 e `zc1_s_*` com LOGIN = 0 medidos depois da montagem (17:06:18Z). Donos medidos no catálogo: ws/wi/wcol/w1col/wu/wci/d3w/wi2/w1/ms = postgres; wb = zc1_bypass; vs/vb/vk/vc/wc/vcol/d3m/d3v/vm/vi2/vx/mk/mr = zc1_common.
- Anomalia minha, declarada: na 1ª tentativa (17:04Z) a barra do `\gset` caiu no texto do comando e o erro do psql ecoou o valor do `FIXPW` do ambiente do container (valor descartável, **nunca usado** como credencial: a falha foi antes de qualquer `CREATE ROLE`). Troquei: a senha das fixtures é **nova**, gerada dentro do container em `/tmp/zz-j05c3c1-fixpw` (0600) e só no ambiente dos filhos; o log da tentativa foi apagado. O valor ecoado não protege nada.

**Vermelho-controle do item 1:**
- (1) o RLS morde: superusuário em T = 3; `zc1_rd` (SELECT direto em T) sem GUC = 0, GUC=A = 1/A, GUC=B = 2/B,B; escrita-controle (dono comum, INSERT direto em T de linha B sob A) → `ERROR: new row violates row-level security policy for table "zc1_t"`; e o leitor de S lê B pela cadeia (abaixo). **Acusou.**
- (3) a âncora acusa: `zc1_rall` com `GRANT SELECT ON ALL TABLES IN SCHEMA public` → `has_table_privilege(zc1_rall, zc1_ws, 'SELECT')` = **t** (e zc1_ms = t, zc1_mk = t). **Acusou.**
- (2) a montagem é vista pela trava: CTL2 (W1(postgres) → T, SELECT em W1) → trava `view/postgres/objetos=1` (o MODO 6 abaixo).

**Âncoras e efeito real** (`zz-j05c3c1-efeito.sh` md5 389542be245b9f2d8312a94169412ba1, 17:06:33Z, ec=0, senha das fixtures na saída = 0):
```
== CTL1 (o RLS morde) ==
CTL1 superusuario em T: 3
EFEITO CTL1 papel=zc1_rd raiz=zc1_t · sem GUC=0/-  · GUC=A=1/A  · GUC=B=2/B,B
== ancoras (has_table_privilege SELECT no no interno = false) ==
ANCORA S papel=zc1_rs zc1_ws:SELECT=f zc1_t:SELECT=f
ANCORA B papel=zc1_rb zc1_wb:SELECT=f zc1_t:SELECT=f
ANCORA K papel=zc1_rk zc1_mk:SELECT=f zc1_t:SELECT=f
ANCORA I papel=zc1_ri zc1_wi:SELECT=f zc1_t:SELECT=f
ANCORA C papel=zc1_rc zc1_wc:SELECT=f zc1_t:SELECT=f
ANCORA P1A papel=zc1_rcol zc1_wcol:SELECT=f zc1_vcol:SELECT=f zc1_t:SELECT=f
ANCORA P1B papel=zc1_r1col zc1_w1col:SELECT=f zc1_t:SELECT=f
ANCORA P2 papel=zc1_ru zc1_wu:SELECT=f zc1_t:SELECT=f
ANCORA P3 papel=zc1_rci zc1_wci:SELECT=f zc1_t:SELECT=f
ANCORA P4 papel=zc1_rd3 zc1_d3m:SELECT=f zc1_d3w:SELECT=f zc1_t:SELECT=f
ANCORA P5 papel=zc1_rm2 zc1_ms:SELECT=f zc1_t:SELECT=f
ANCORA P6 papel=zc1_ri2 zc1_wi2:SELECT=f zc1_t:SELECT=f
ANCORA P7 papel=zc1_rx zc1_vx:SELECT=f zc1_ws:SELECT=f zc1_t:SELECT=f
ANCORA P8 papel=zc1_rmr zc1_t:SELECT=f
P1A/P1B privilegio de coluna: has_table_privilege(raiz,'SELECT')=f/f · lista S,I,U,D=f/f · has_any_column_privilege SELECT=t/t
P2 UPDATE de coluna: has_table_privilege(wu,'SELECT,INSERT,UPDATE,DELETE')=f · has_any_column_privilege UPDATE=t
P3 INSERT de coluna: has_table_privilege(wci,lista)=f · has_any_column_privilege INSERT=t
P7 pertenca: has_table_privilege(rx,vx,lista)=f · pg_has_role(rx,x,MEMBER)=t · pg_has_role(rx,x,USAGE)=f
== efeito real: leituras ==
EFEITO S papel=zc1_rs raiz=zc1_vs · sem GUC=3/A,B,B  · GUC=A=3/A,B,B  · GUC=B=3/A,B,B
EFEITO B papel=zc1_rb raiz=zc1_vb · sem GUC=3/A,B,B  · GUC=A=3/A,B,B  · GUC=B=3/A,B,B
EFEITO K papel=zc1_rk raiz=zc1_vk · sem GUC=1/A  · GUC=A=1/A  · GUC=B=1/A
EFEITO C papel=zc1_rc raiz=zc1_vc · sem GUC=0/-  · GUC=A=1/A  · GUC=B=2/B,B
EFEITO P1A papel=zc1_rcol raiz=zc1_vcol · sem GUC=3/A,B,B  · GUC=A=3/A,B,B  · GUC=B=3/A,B,B
EFEITO P1B papel=zc1_r1col raiz=zc1_w1col · sem GUC=3/A,B,B  · GUC=A=3/A,B,B  · GUC=B=3/A,B,B
EFEITO P4 papel=zc1_rd3 raiz=zc1_d3v · sem GUC=3/A,B,B  · GUC=A=3/A,B,B  · GUC=B=3/A,B,B
EFEITO P5 papel=zc1_rm2 raiz=zc1_vm · sem GUC=3/A,B,B  · GUC=A=3/A,B,B  · GUC=B=3/A,B,B
EFEITO P8 papel=zc1_rmr raiz=zc1_mr · sem GUC=1/A  · GUC=A=1/A  · GUC=B=1/A
P7 sem SET ROLE: ERROR:  permission denied for view zc1_vx
EFEITO P7 papel=zc1_rx raiz=zc1_vx (SET ROLE zc1_x) · sem GUC=3/A,B,B  · GUC=A=3/A,B,B  · GUC=B=3/A,B,B
EFEITO CTL2 papel=zc1_r1 raiz=zc1_w1 · sem GUC=3/A,B,B  · GUC=A=3/A,B,B  · GUC=B=3/A,B,B
== efeito real: escritas sob GUC=A, gravando linha da organizacao B ==
I  (INSERT em zc1_wi):  resposta=[] linhas B gravadas (admin)=1
P3 (INSERT de coluna em zc1_wci): resposta=[] linhas B gravadas (admin)=1
P6 (INSERT em V de 2 niveis zc1_vi2): resposta=[] linhas B gravadas (admin)=1
P2 (UPDATE de coluna em zc1_wu, sem WHERE): resposta=[] linhas tocadas por organizacao (admin)=A=1 B=5
CTL-escrita (dono comum, INSERT direto em T de linha B sob A): ERROR:  new row violates row-level security policy for table "zc1_t"
estado final de T (admin): A:tocado-p2 B:tocado-p2 B:tocado-p2 B:tocado-p2 B:tocado-p2 B:tocado-p2
```

**Trava REAL do objeto, como cada leitor** (`zz-j05c3c1-probe.mjs` md5 22d0022e870c0f065bfe898494f94cb1: `probeRuntimeRolePosture` importado de `/work/src/database/runtime-role.ts` md5 692d953d… = blob, PrismaClient + PrismaPg como o boot; 17:06:46Z, ec=0, senha na saída = 0):
```
TRAVA zc1_rs session_user=zc1_rs current_user=zc1_rs escapes=1 [view/postgres/objetos=1/is_self=false]
TRAVA zc1_rb session_user=zc1_rb current_user=zc1_rb escapes=1 [view/zc1_bypass/objetos=1/is_self=false]
TRAVA zc1_rk session_user=zc1_rk current_user=zc1_rk escapes=1 [view/zc1_common/objetos=1/is_self=false]
TRAVA zc1_ri session_user=zc1_ri current_user=zc1_ri escapes=1 [view/postgres/objetos=1/is_self=false]
TRAVA zc1_rc session_user=zc1_rc current_user=zc1_rc escapes=0 []
TRAVA zc1_rcol session_user=zc1_rcol current_user=zc1_rcol escapes=0 []
TRAVA zc1_r1col session_user=zc1_r1col current_user=zc1_r1col escapes=0 []
TRAVA zc1_ru session_user=zc1_ru current_user=zc1_ru escapes=0 []
TRAVA zc1_rci session_user=zc1_rci current_user=zc1_rci escapes=0 []
TRAVA zc1_rd3 session_user=zc1_rd3 current_user=zc1_rd3 escapes=1 [view/postgres/objetos=1/is_self=false]
TRAVA zc1_rm2 session_user=zc1_rm2 current_user=zc1_rm2 escapes=1 [view/postgres/objetos=1/is_self=false]
TRAVA zc1_ri2 session_user=zc1_ri2 current_user=zc1_ri2 escapes=1 [view/postgres/objetos=1/is_self=false]
TRAVA zc1_rx session_user=zc1_rx current_user=zc1_rx escapes=0 []
TRAVA zc1_rmr session_user=zc1_rmr current_user=zc1_rmr escapes=1 [view/zc1_common/objetos=1/is_self=false]
TRAVA zc1_r1 session_user=zc1_r1 current_user=zc1_r1 escapes=1 [view/postgres/objetos=1/is_self=false]
TRAVA zc1_rd session_user=zc1_rd current_user=zc1_rd escapes=0 []
```

**MODO 6 do script do objeto por caso** (`zz-j05c3c1-modo6.sh` md5 21afd4276e9858fd78dcf09b71cff137 + `zz-j05c3c1-script.sh` md5 1f52ffd56d1dff91b3cef8939a487b4b; script `/work/scripts/db-runtime-role.sh` md5 911fddc1… = blob; papel `zc1_s_*` pré-criado NOLOGIN NOINHERIT, privilégio só na raiz, nunca passou pelo script; senha do script aleatória, só no ambiente; âncora medida imediatamente antes de cada execução; 17:07:59Z, ec=0). Nota de leitura: `modos=[MODO 3 MODO 6]` é o `grep -o 'MODO [0-9]'` sobre o texto do `RAISE` da l.115, que cita os dois como instrução; a via é a de `vias=[…]`:
```
UTC 17:07:59Z md5 script=911fddc132af8fa3c3d7fc976b7b6efe
  ancora zc1_s_ctl2: zc1_t:SELECT=false · raiz zc1_w1 lista=t · coluna(SELECT/INSERT/UPDATE)=true/false/false · LOGIN antes=f
SCRIPT CTL2 papel=zc1_s_ctl2 ec=3 modos=[MODO 3 MODO 6 ] vias=[escapa de RLS por 1 via(s): view:zc1_w1] linha_final=[] senha_no_stdout_stderr=0
  ancora zc1_s_s: zc1_ws:SELECT=false zc1_t:SELECT=false · raiz zc1_vs lista=t · coluna(SELECT/INSERT/UPDATE)=true/false/false · LOGIN antes=f
SCRIPT S papel=zc1_s_s ec=3 modos=[MODO 3 MODO 6 ] vias=[escapa de RLS por 1 via(s): view:zc1_vs] linha_final=[] senha_no_stdout_stderr=0
  ancora zc1_s_b: zc1_wb:SELECT=false zc1_t:SELECT=false · raiz zc1_vb lista=t · coluna(SELECT/INSERT/UPDATE)=true/false/false · LOGIN antes=f
SCRIPT B papel=zc1_s_b ec=3 modos=[MODO 3 MODO 6 ] vias=[escapa de RLS por 1 via(s): view:zc1_vb] linha_final=[] senha_no_stdout_stderr=0
  ancora zc1_s_k: zc1_mk:SELECT=false zc1_t:SELECT=false · raiz zc1_vk lista=t · coluna(SELECT/INSERT/UPDATE)=true/false/false · LOGIN antes=f
SCRIPT K papel=zc1_s_k ec=3 modos=[MODO 3 MODO 6 ] vias=[escapa de RLS por 1 via(s): view:zc1_vk] linha_final=[] senha_no_stdout_stderr=0
  ancora zc1_s_i: zc1_t:SELECT=false · raiz zc1_wi lista=t · coluna(SELECT/INSERT/UPDATE)=false/true/false · LOGIN antes=f
SCRIPT I papel=zc1_s_i ec=3 modos=[MODO 3 MODO 6 ] vias=[escapa de RLS por 1 via(s): view:zc1_wi] linha_final=[] senha_no_stdout_stderr=0
  ancora zc1_s_c: zc1_wc:SELECT=false zc1_t:SELECT=false · raiz zc1_vc lista=t · coluna(SELECT/INSERT/UPDATE)=true/false/false · LOGIN antes=f
SCRIPT C papel=zc1_s_c ec=0 modos=[] vias=[] linha_final=[zc1_s_c|f|f|f|f|0|0|116] senha_no_stdout_stderr=0
  POS-SCRIPT C: login como zc1_s_c (senha definida pelo script), contexto A, ultima linha=[1/A]
  ancora zc1_s_p4: zc1_d3m:SELECT=false zc1_d3w:SELECT=false zc1_t:SELECT=false · raiz zc1_d3v lista=t · coluna(SELECT/INSERT/UPDATE)=true/false/false · LOGIN antes=f
SCRIPT P4 papel=zc1_s_p4 ec=3 modos=[MODO 3 MODO 6 ] vias=[escapa de RLS por 1 via(s): view:zc1_d3v] linha_final=[] senha_no_stdout_stderr=0
  ancora zc1_s_p5: zc1_ms:SELECT=false zc1_t:SELECT=false · raiz zc1_vm lista=t · coluna(SELECT/INSERT/UPDATE)=true/false/false · LOGIN antes=f
SCRIPT P5 papel=zc1_s_p5 ec=3 modos=[MODO 3 MODO 6 ] vias=[escapa de RLS por 1 via(s): view:zc1_vm] linha_final=[] senha_no_stdout_stderr=0
  ancora zc1_s_p6: zc1_wi2:SELECT=false zc1_t:SELECT=false · raiz zc1_vi2 lista=t · coluna(SELECT/INSERT/UPDATE)=false/true/false · LOGIN antes=f
SCRIPT P6 papel=zc1_s_p6 ec=3 modos=[MODO 3 MODO 6 ] vias=[escapa de RLS por 1 via(s): view:zc1_vi2] linha_final=[] senha_no_stdout_stderr=0
  ancora zc1_s_p8: zc1_t:SELECT=false · raiz zc1_mr lista=t · coluna(SELECT/INSERT/UPDATE)=true/false/false · LOGIN antes=f
SCRIPT P8 papel=zc1_s_p8 ec=3 modos=[MODO 3 MODO 6 ] vias=[escapa de RLS por 1 via(s): view:zc1_mr] linha_final=[] senha_no_stdout_stderr=0
  ancora zc1_s_p1a: zc1_wcol:SELECT=false zc1_vcol:SELECT=false zc1_t:SELECT=false · raiz zc1_vcol lista=f · coluna(SELECT/INSERT/UPDATE)=true/false/false · LOGIN antes=f
SCRIPT P1A papel=zc1_s_p1a ec=0 modos=[] vias=[] linha_final=[zc1_s_p1a|f|f|f|f|0|0|116] senha_no_stdout_stderr=0
  POS-SCRIPT P1A: login como zc1_s_p1a (senha definida pelo script), contexto A, ultima linha=[6/A,B,B,B,B,B]
  ancora zc1_s_p1b: zc1_w1col:SELECT=false zc1_t:SELECT=false · raiz zc1_w1col lista=f · coluna(SELECT/INSERT/UPDATE)=true/false/false · LOGIN antes=f
SCRIPT P1B papel=zc1_s_p1b ec=0 modos=[] vias=[] linha_final=[zc1_s_p1b|f|f|f|f|0|0|116] senha_no_stdout_stderr=0
  POS-SCRIPT P1B: login como zc1_s_p1b (senha definida pelo script), contexto A, ultima linha=[6/A,B,B,B,B,B]
  ancora zc1_s_p2: zc1_wu:SELECT=false zc1_t:SELECT=false · raiz zc1_wu lista=f · coluna(SELECT/INSERT/UPDATE)=false/false/true · LOGIN antes=f
SCRIPT P2 papel=zc1_s_p2 ec=0 modos=[] vias=[] linha_final=[zc1_s_p2|f|f|f|f|0|0|116] senha_no_stdout_stderr=0
  POS-SCRIPT P2: login como zc1_s_p2 (senha definida pelo script), contexto A, ultima linha=[UPDATE 6]
  P2 pos-script (admin): linhas com value=pos-script-p2 por organizacao = A=1 B=5
  ancora zc1_s_p3: zc1_wci:SELECT=false zc1_t:SELECT=false · raiz zc1_wci lista=f · coluna(SELECT/INSERT/UPDATE)=false/true/false · LOGIN antes=f
SCRIPT P3 papel=zc1_s_p3 ec=0 modos=[] vias=[] linha_final=[zc1_s_p3|f|f|f|f|0|0|116] senha_no_stdout_stderr=0
  POS-SCRIPT P3: login como zc1_s_p3 (senha definida pelo script), contexto A, ultima linha=[INSERT 0 1]
  P3 pos-script (admin): linhas B com value=pos-script-p3 = 1
  ancora zc1_s_p7: zc1_vx:SELECT=false zc1_ws:SELECT=false zc1_t:SELECT=false · raiz zc1_vx lista=f · coluna(SELECT/INSERT/UPDATE)=false/false/false · LOGIN antes=f
SCRIPT P7 papel=zc1_s_p7 ec=0 modos=[] vias=[] linha_final=[zc1_s_p7|f|f|f|f|0|0|116] senha_no_stdout_stderr=0
  POS-SCRIPT P7: login como zc1_s_p7 (senha definida pelo script), contexto A, ultima linha=[7/A,B,B,B,B,B,B]
  P7 pertenca depois do script: pg_has_role(zc1_s_p7, zc1_x, MEMBER)=t
papeis zc1_s_* com LOGIN depois (convergiram): zc1_s_c zc1_s_p1a zc1_s_p1b zc1_s_p2 zc1_s_p3 zc1_s_p7
```

**Tabela do item 1** (âncora = has_table_privilege(<papel>, <nó interno>, 'SELECT') imediatamente antes; efeito = leitura sob GUC=A / escrita sob GUC=A de linha B):

| caso | cadeia | privilégio | âncora nós internos | efeito real | trava REAL | MODO 6 |
|---|---|---|---|---|---|---|
| S | vs(comum)→ws(postgres)→T | SELECT em vs | ws=f, T=f | lê 3/A,B,B sob A e sob B | view/postgres, objetos=1 | ec=3, view:zc1_vs |
| B | vb(comum)→wb(BYPASSRLS)→T | SELECT em vb | wb=f | lê 3/A,B,B | view/zc1_bypass, objetos=1 | ec=3, view:zc1_vb |
| K | vk(comum)→mk(matview comum, REFRESH sob A)→T | SELECT em vk | mk=f | sob B lê 1/A | view/zc1_common, objetos=1 | ec=3, view:zc1_vk |
| I | wi(postgres)→T | só INSERT em wi | wi SELECT=f | INSERT de B sob A aceito, 1 linha (admin) | view/postgres, objetos=1 | ec=3, view:zc1_wi |
| C (controle) | vc(comum)→wc(comum)→T | SELECT em vc | wc=f | 0/- · 1/A · 2/B,B (RLS morde) | 0 escape | ec=0, final `zc1_s_c\|f\|f\|f\|f\|0\|0\|116` (posse=0, views=0); pós-script lê 1/A |
| CTL2 (controle 2) | w1(postgres)→T, 1 nível | SELECT em w1 | — | lê 3/A,B,B | view/postgres, objetos=1 | ec=3, view:zc1_w1 |
| **P1A** (forma própria) | vcol(comum)→wcol(postgres)→T | **SELECT (tenant_id, value) — de COLUNA — em vcol** | wcol=f, vcol(tabela)=f; has_any_column_privilege=t | **lê 3/A,B,B sob A e sob B** | **0 escape** | **ec=0, views=0**; pós-script: o papel convergido, com a senha que o script definiu, lê **6/A,B,B,B,B,B** sob A |
| **P1B** (forma própria) | w1col(postgres)→T, 1 nível | **SELECT de coluna em w1col** | has_table_privilege=f; any_column=t | **lê 3/A,B,B** | **0 escape** | **ec=0, views=0**; pós-script lê **6/A,B,B,B,B,B** sob A |
| **P2** (forma própria) | wu(postgres)→T | **UPDATE (value) — de coluna — em wu** | has_table_privilege(lista)=f; any_column UPDATE=t | `UPDATE wu SET value=…` sem WHERE sob A toca **A=1, B=5** | **0 escape** | **ec=0, views=0**; pós-script `UPDATE 6` sob A → A=1, B=5 sobrescritas |
| **P3** (forma própria) | wci(postgres)→T | **INSERT (tenant_id, value) — de coluna — em wci** | lista=f; any_column INSERT=t | INSERT de B sob A aceito, 1 linha | **0 escape** | **ec=0, views=0**; pós-script `INSERT 0 1` de B sob A, 1 linha (admin) |
| P4 | d3v(comum)→d3m(comum)→d3w(postgres)→T (3 níveis) | SELECT em d3v | d3m=f, d3w=f | lê 3/A,B,B | view/postgres, objetos=1 | ec=3, view:zc1_d3v |
| P5 (caso M) | vm(comum)→ms(matview postgres)→T | SELECT em vm | ms=f | lê 3/A,B,B | view/postgres, objetos=1 | ec=3, view:zc1_vm |
| P6 | vi2(comum)→wi2(postgres)→T | só INSERT em vi2 | wi2=f | INSERT de B sob A por 2 níveis, 1 linha | view/postgres, objetos=1 | ec=3, view:zc1_vi2 |
| P8 | mr (matview comum como RAIZ, REFRESH sob A) | SELECT em mr | T=f | sob B lê 1/A | view/zc1_common, objetos=1 | ec=3, view:zc1_mr |
| P7 | vx(comum)→ws(postgres)→T | papel NOINHERIT **membro** de zc1_x, que tem SELECT em vx | vx=f, ws=f; MEMBER=t, USAGE=f | sem SET ROLE: permission denied; com SET ROLE zc1_x lê 3/A,B,B | 0 escape | ec=0, views=0; pertença mantida; pós-script com SET ROLE lê 7/A,B… |

**Leitura do item 1 (gravado 17:09Z):** S, B, K, I recusados pela trava REAL (rolname = dono do nó que escapa: postgres, zc1_bypass, zc1_common, postgres; objetos = 1) e pelo MODO 6 (ec=3, `view:<raiz>`), com efeito real medido e âncora false; C passa nos dois (ec=0, views=0) e o RLS morde nele; CTL2 recusado. Formas próprias recusadas: P4 (3 níveis), P5 (caso M), P6 (escrita por 2 níveis), P8 (matview raiz). **Formas próprias que ESCAPAM:** P1A, P1B, P2, P3 — privilégio de **COLUNA** na raiz (SELECT, UPDATE ou INSERT de coluna): `has_table_privilege(…, 'SELECT,INSERT,UPDATE,DELETE')` = f (responde por privilégio de tabela), `has_any_column_privilege` = t; o leitor lê e grava linha da organização B sob o contexto A; a trava REAL devolve 0 escape e o MODO 6 converge (ec=0, `views=0`), e o papel que o próprio script entrega lê 6 linhas de B e sobrescreve 5 linhas de B. P7 (pertença NOINHERIT + SET ROLE) também passa pelos dois, mas exige `SET ROLE` em tempo de execução (graduado à parte).
- Origem (`git log --diff-filter=A` no objeto, linha do ramo não squashado; ausentes na `origin/main`): `src/database/runtime-role.ts` d76b255f 2026-10-02; `scripts/db-runtime-role.sh` 041e414b 2026-10-02; `tests/san3-05-runtime-role-guard-db.test.ts` e0143db1 2026-10-03. `git log -S"has_table_privilege(session_user, v.oid"` → só d76b255f (o privilégio da via view é de tabela desde o ciclo 1). Logo **dentro-do-bloco**.
- Alcance: C3.4 item 1 (l.2010-2013) — "view/matview, qualquer profundidade, donos mistos, **privilégio de leitura ou escrita na raiz**, tabela FORCE no fim"; C3.2(1) — "tem **SELECT, INSERT, UPDATE ou DELETE** numa relação raiz R". GRANT de coluna é privilégio SELECT/INSERT/UPDATE na raiz R; não é regra em tabela nem SECURITY DEFINER (itens 4 da reprovação por construção) nem sobre-aproximação declarada (item 5). Busca no objeto (`git grep -i 'has_any_column|privilégio de coluna|column-level|GRANT SELECT ('` em plano, controle, ata, reprovações, votos, src, scripts, tests, deployment) → só a hipótese da fábrica (FABRICA-relatorio l.60); nenhuma pendência nem residual declarado.

**Caminho de boot do objeto** (`zz-j05c3c1-boot.mjs` md5 d98c8dd0dbff3120188163d801cb77d1: `assertRuntimeDatabaseRoleIfEnforced({enforce:true})` de `/work/src/database/runtime-role.bootstrap.ts`, que é o que `src/server.ts:17` chama; l.136 → `probeRuntimeRolePosture`; recusa só se `escapes.length > 0`; 17:10Z, ec=0, senha 0):
```
BOOT zc1_rs RECUSADO RuntimeRoleGuardError RUNTIME_ROLE_CAN_BYPASS_RLS
BOOT zc1_rc ACEITO {"enforced":true,"posture":{"sessionUser":"zc1_rc","currentUser":"zc1_rc","escapes":[]}}
BOOT zc1_rcol ACEITO {"enforced":true,"posture":{"sessionUser":"zc1_rcol","currentUser":"zc1_rcol","escapes":[]}}
BOOT zc1_r1col ACEITO {"enforced":true,"posture":{"sessionUser":"zc1_r1col","currentUser":"zc1_r1col","escapes":[]}}
BOOT zc1_ru ACEITO {"enforced":true,"posture":{"sessionUser":"zc1_ru","currentUser":"zc1_ru","escapes":[]}}
BOOT zc1_rci ACEITO {"enforced":true,"posture":{"sessionUser":"zc1_rci","currentUser":"zc1_rci","escapes":[]}}
```
Controles acusam (S recusado, C aceito); as quatro formas de privilégio de coluna são **aceitas** pelo boot real.

**Item 1 — veredito parcial: VERMELHO (A2 aberto).** Propriedade ausente: *o papel lê e grava linha de outra organização por uma raiz em que tem privilégio de leitura ou escrita **de coluna** (GRANT SELECT/INSERT/UPDATE (<colunas>) ON <raiz>), numa árvore com dono que escapa sobre tabela FORCE, e a trava REAL (0 escape; o boot aceita) e o MODO 6 (ec=0, views=0; o papel que o script entrega lê 6 linhas de B e sobrescreve 5) não acusam*. Classe: **grave: vazamento entre organizações** (P1A, P1B) e **grave: perda de dado** (P2 sobrescreve linhas de B; P3 grava em B). Escopo: dentro-do-bloco. Sinal R1: **informação nova** — nenhuma das três formas já descritas (dono da raiz, DML pela view, matview); é a granularidade do privilégio (coluna), na mesma dimensão do privilégio que o J-A abriu. P7 (pertença NOINHERIT + SET ROLE): passa pelos dois, mas o privilégio é do papel do qual o leitor é membro e o uso exige `SET ROLE` em tempo de execução → graduado **nota, não grave**.

### Item 2 — as dez mutações (em apuração)
**(a) Linha de base** (`zz-j05c3c1-rodar.sh` md5 2251d001aa483b1eb9d7db5c17c86fd5 = `timeout 900 node --test --import tsx --test-reporter=tap tests/san3-05-runtime-role-guard-db.test.ts` com `DATABASE_URL` do pg descartável, TAP para arquivo, ec por variável; leitor `zz-j05c3c1-tap.mjs` md5 486f16069068788d25552cdafbe15099). 1ª tentativa 17:11:42Z sem `--import tsx` (defeito do meu executor: `ERR_UNKNOWN_FILE_EXTENSION`, nenhum teste rodou) — corrigido e re-executado:
```
RUN base inicio 17:11:54Z md5 runtime-role.ts=692d953d26aafa8d40d6902fca2bccfc script=911fddc132af8fa3c3d7fc976b7b6efe teste=a7b0961586938aa9f9a024c81667f869
RUN base ec=0 duracao=30s · senha do admin no TAP=0
CONTAGENS tests=12 suites=0 pass=12 fail=0 cancelled=0 skipped=0 todo=0
  sub OK [T5/T6/T9 · papel limpo passa; postgres recusa; log não expõe conexão] dur=318.945466ms
  sub OK [T7/T8 · super renomeado e pertença direta, NOINHERIT, cadeia e SET FALSE recusam] dur=344.522795ms
  sub OK [T8b/T8c · posse e session_user continuam visíveis depois de SET ROLE] dur=274.47686ms
  sub OK [T8c · três semi-mutantes session_user→current_user perdem exatamente a via do login] dur=324.66118ms
  sub OK [T8d · REPLICATION exercível, papel de servidor e view transitiva são recusados] dur=618.779723ms
  sub OK [T8e · trava: cadeia de views com donos mistos, matview e escrita pela view (A2)] dur=667.656261ms
  sub OK [T8f · a trava e o MODO 6 avaliam o mesmo CTE] dur=0.448832ms
  sub OK [T14a/b · o procedimento converge, é idempotente e falha fechado nos modos nomeados] dur=1441.631945ms
  sub OK [T14c · filhos escritores respeitam a trava única e a guarda estrutural é fechada] dur=592.900731ms
  sub OK [T14d · MODO 6: a mesma cadeia criada ANTES do script, sem SELECT direto em W (A2/A3)] dur=298.344478ms
  sub OK [T15 · boot real recusa super antes do Redis e aceita papel limpo] dur=24799.739821ms
TOP OK [B-SAN3-05 · o papel de runtime não contorna FORCE RLS] dur=29731.938354ms
residuo: papeis s305%=0 bancos s305%=0 relacoes s305%=0 slots=0
```
Base verde nos três (T8e, T8f, T14d) e nos demais; denominador 12 (11 subtestes + o externo), skipped 0.

**(b) Ciclos de mutação** (`zz-j05c3c1-mut.mjs` md5 1fc7ee43ba7f06b58fc80b052a83c85a — âncora contada, falha fechado; `zz-j05c3c1-ciclo.sh` md5 0b33805307c5dbfbaa4548bc56d2e97e — pristino, diff, carga (import do módulo com md5 da SQL carregada em (t); `bash -n` em (s)), arquivo inteiro, sondas do item 1 sob o mutante (trava como zc1_rs/rb/rk/ri/rc em (t); script para 5 papéis NOVOS com o privilégio só na raiz em (s), removidos depois), restauro com md5 = blob). Âncoras de (s) só no `DO` (6/5 espaços de indentação; a da linha final tem 4/3 — conta 1, medido). Saída integral:
```
=== CICLO a-t 17:13:54Z ===
MUT a-t arquivo=/work/src/database/runtime-role.ts ancora_ocorrencias=1 pristino=/tmp/runtime-role.ts.pristino md5_antes=692d953d26aafa8d40d6902fca2bccfc md5_depois=dde45473befb90421e85cccada84f731
diff: linhas mudadas=2 · >   JOIN pg_class lv ON lv.oid = w.root_oid AND lv.relkind IN ('v', 'm')
carga: modulo importado, RUNTIME_ROLE_GUARD_SQL md5=359dec7e30b20073ab00cdec7f07ad47
RUN a-t inicio 17:13:55Z md5 runtime-role.ts=dde45473befb90421e85cccada84f731 script=911fddc132af8fa3c3d7fc976b7b6efe teste=a7b0961586938aa9f9a024c81667f869
RUN a-t ec=1 duracao=8s · senha do admin no TAP=0
CONTAGENS tests=12 suites=0 pass=9 fail=3 cancelled=0 skipped=0 todo=0
  sub OK [T5/T6/T9 · papel limpo passa; postgres recusa; log não expõe conexão] dur=285.117697ms
  sub OK [T7/T8 · super renomeado e pertença direta, NOINHERIT, cadeia e SET FALSE recusam] dur=337.16784ms
  sub OK [T8b/T8c · posse e session_user continuam visíveis depois de SET ROLE] dur=251.651043ms
  sub OK [T8c · três semi-mutantes session_user→current_user perdem exatamente a via do login] dur=304.089501ms
  sub OK [T8d · REPLICATION exercível, papel de servidor e view transitiva são recusados] dur=568.465937ms
  sub NOT OK [T8e · trava: cadeia de views com donos mistos, matview e escrita pela view (A2)] dur=450.283015ms erro="'escape view/postgres não encontrado: []'" linhas=111,934,910
  sub NOT OK [T8f · a trava e o MODO 6 avaliam o mesmo CTE] dur=1.124444ms erro="o CTE do DO divergiu da trava + actual - expected  + \"WITHRECURSIVEview_walk(root_oid,leaf_oid)AS(SELECTv.oid,v.oidFROMpg_classvWHEREv.relkindIN('v','m')UNIONSELECTw.root_oid,dep.oidFROMview_walkwJOINpg_rewriterwONrw.ev_class=w.leaf_oidJOINpg_dependdONd.classid='pg_rewrite'::regclassANDd.objid=rw.oi" linhas=963,956
  sub OK [T14a/b · o procedimento converge, é idempotente e falha fechado nos modos nomeados] dur=1052.976178ms
  sub OK [T14c · filhos escritores respeitam a trava única e a guarda estrutural é fechada] dur=577.362266ms
  sub OK [T14d · MODO 6: a mesma cadeia criada ANTES do script, sem SELECT direto em W (A2/A3)] dur=267.349825ms
  sub OK [T15 · boot real recusa super antes do Redis e aceita papel limpo] dur=3789.376287ms
TOP NOT OK [B-SAN3-05 · o papel de runtime não contorna FORCE RLS] dur=7933.950678ms erro="'2 subtests failed'"
residuo: papeis s305%=0 bancos s305%=0 relacoes s305%=0 slots=0
  SONDA-MUT TRAVA zc1_rs session_user=zc1_rs current_user=zc1_rs escapes=0 []
  SONDA-MUT TRAVA zc1_rb session_user=zc1_rb current_user=zc1_rb escapes=0 []
  SONDA-MUT TRAVA zc1_rk session_user=zc1_rk current_user=zc1_rk escapes=0 []
  SONDA-MUT TRAVA zc1_ri session_user=zc1_ri current_user=zc1_ri escapes=1 [view/postgres/objetos=1/is_self=false]
  SONDA-MUT TRAVA zc1_rc session_user=zc1_rc current_user=zc1_rc escapes=0 []
restauro: md5 692d953d26aafa8d40d6902fca2bccfc blob 692d953d26aafa8d40d6902fca2bccfc -> IGUAL · pristino removido=sim
=== CICLO a-s 17:14:04Z ===
MUT a-s arquivo=/work/scripts/db-runtime-role.sh ancora_ocorrencias=1 pristino=/tmp/db-runtime-role.sh.pristino md5_antes=911fddc132af8fa3c3d7fc976b7b6efe md5_depois=f7680e243364db3062ee722f940c2b1a
diff: linhas mudadas=2 · >       JOIN pg_class lv ON lv.oid = w.root_oid AND lv.relkind IN ('v','m')
carga: bash -n ec=0
RUN a-s inicio 17:14:04Z md5 runtime-role.ts=692d953d26aafa8d40d6902fca2bccfc script=f7680e243364db3062ee722f940c2b1a teste=a7b0961586938aa9f9a024c81667f869
RUN a-s ec=1 duracao=8s · senha do admin no TAP=0
CONTAGENS tests=12 suites=0 pass=9 fail=3 cancelled=0 skipped=0 todo=0
  sub OK [T5/T6/T9 · papel limpo passa; postgres recusa; log não expõe conexão] dur=291.479742ms
  sub OK [T7/T8 · super renomeado e pertença direta, NOINHERIT, cadeia e SET FALSE recusam] dur=357.84211ms
  sub OK [T8b/T8c · posse e session_user continuam visíveis depois de SET ROLE] dur=259.632465ms
  sub OK [T8c · três semi-mutantes session_user→current_user perdem exatamente a via do login] dur=255.662084ms
  sub OK [T8d · REPLICATION exercível, papel de servidor e view transitiva são recusados] dur=568.570233ms
  sub OK [T8e · trava: cadeia de views com donos mistos, matview e escrita pela view (A2)] dur=715.540612ms
  sub NOT OK [T8f · a trava e o MODO 6 avaliam o mesmo CTE] dur=1.0506ms erro="o CTE do DO divergiu da trava + actual - expected  + \"WITHRECURSIVEview_walk(root_oid,leaf_oid)AS(SELECTv.oid,v.oidFROMpg_classvWHEREv.relkindIN('v','m')UNIONSELECTw.root_oid,dep.oidFROMview_walkwJOINpg_rewriterwONrw.ev_class=w.leaf_oidJOINpg_dependdONd.classid='pg_rewrite'::regclassANDd.objid=rw.oi" linhas=963,956
  sub OK [T14a/b · o procedimento converge, é idempotente e falha fechado nos modos nomeados] dur=1137.429355ms
  sub OK [T14c · filhos escritores respeitam a trava única e a guarda estrutural é fechada] dur=591.267873ms
  sub NOT OK [T14d · MODO 6: a mesma cadeia criada ANTES do script, sem SELECT direto em W (A2/A3)] dur=190.164397ms erro="caso S: status deveria ser 3 DO s305_a2_s_1791566048812_a4d1cd04|f|f|f|f|0|1|116 Enter new password for user \"s305_a2_s_1791566048812_a4d1cd04\": Enter it again:   0 !== 3 " linhas=1361,1351
  sub OK [T15 · boot real recusa super antes do Redis e aceita papel limpo] dur=3791.072195ms
TOP NOT OK [B-SAN3-05 · o papel de runtime não contorna FORCE RLS] dur=8209.56654ms erro="'2 subtests failed'"
residuo: papeis s305%=0 bancos s305%=0 relacoes s305%=0 slots=0
  SONDA-MUT SCRIPT ma_s__s papel=zc1_ma_s__s ec=0 modos=[] vias=[] linha_final=[zc1_ma_s__s|f|f|f|f|0|1|116] senha_no_stdout_stderr=0
  SONDA-MUT SCRIPT ma_s__b papel=zc1_ma_s__b ec=0 modos=[] vias=[] linha_final=[zc1_ma_s__b|f|f|f|f|0|1|116] senha_no_stdout_stderr=0
  SONDA-MUT SCRIPT ma_s__k papel=zc1_ma_s__k ec=0 modos=[] vias=[] linha_final=[zc1_ma_s__k|f|f|f|f|0|1|116] senha_no_stdout_stderr=0
  SONDA-MUT SCRIPT ma_s__i papel=zc1_ma_s__i ec=3 modos=[MODO 3 MODO 6 ] vias=[escapa de RLS por 1 via(s): view:zc1_wi] linha_final=[] senha_no_stdout_stderr=0
  SONDA-MUT SCRIPT ma_s__c papel=zc1_ma_s__c ec=0 modos=[] vias=[] linha_final=[zc1_ma_s__c|f|f|f|f|0|0|116] senha_no_stdout_stderr=0
  papeis zc1_ma_s__* restantes=0
restauro: md5 911fddc132af8fa3c3d7fc976b7b6efe blob 911fddc132af8fa3c3d7fc976b7b6efe -> IGUAL · pristino removido=sim
```
```
=== CICLO b-t 17:14:28Z ===
MUT b-t arquivo=/work/src/database/runtime-role.ts ancora_ocorrencias=1 pristino=/tmp/runtime-role.ts.pristino md5_antes=692d953d26aafa8d40d6902fca2bccfc md5_depois=2a56bb970750d2cb69917ffe56b17919
diff: linhas mudadas=2 · >   WHERE o.rolsuper OR lv.relkind = 'm'
carga: modulo importado, RUNTIME_ROLE_GUARD_SQL md5=04e93edef9889957d0c9667f4a56d09c
RUN b-t inicio 17:14:28Z md5 runtime-role.ts=2a56bb970750d2cb69917ffe56b17919 script=911fddc132af8fa3c3d7fc976b7b6efe teste=a7b0961586938aa9f9a024c81667f869
RUN b-t ec=1 duracao=9s · senha do admin no TAP=0
CONTAGENS tests=12 suites=0 pass=9 fail=3 cancelled=0 skipped=0 todo=0
  sub OK [T5/T6/T9 · papel limpo passa; postgres recusa; log não expõe conexão] dur=288.931215ms
  sub OK [T7/T8 · super renomeado e pertença direta, NOINHERIT, cadeia e SET FALSE recusam] dur=365.837366ms
  sub OK [T8b/T8c · posse e session_user continuam visíveis depois de SET ROLE] dur=275.0275ms
  sub OK [T8c · três semi-mutantes session_user→current_user perdem exatamente a via do login] dur=248.316598ms
  sub OK [T8d · REPLICATION exercível, papel de servidor e view transitiva são recusados] dur=559.423625ms
  sub NOT OK [T8e · trava: cadeia de views com donos mistos, matview e escrita pela view (A2)] dur=482.938891ms erro="'escape view/s305_a2_bypass_1791566070912_434fab49 não encontrado: []'" linhas=111,937,910
  sub NOT OK [T8f · a trava e o MODO 6 avaliam o mesmo CTE] dur=1.916584ms erro="o CTE do DO divergiu da trava + actual - expected  + \"WITHRECURSIVEview_walk(root_oid,leaf_oid)AS(SELECTv.oid,v.oidFROMpg_classvWHEREv.relkindIN('v','m')UNIONSELECTw.root_oid,dep.oidFROMview_walkwJOINpg_rewriterwONrw.ev_class=w.leaf_oidJOINpg_dependdONd.classid='pg_rewrite'::regclassANDd.objid=rw.oi" linhas=963,956
  sub OK [T14a/b · o procedimento converge, é idempotente e falha fechado nos modos nomeados] dur=1031.581858ms
  sub OK [T14c · filhos escritores respeitam a trava única e a guarda estrutural é fechada] dur=578.671049ms
  sub OK [T14d · MODO 6: a mesma cadeia criada ANTES do script, sem SELECT direto em W (A2/A3)] dur=275.459035ms
  sub OK [T15 · boot real recusa super antes do Redis e aceita papel limpo] dur=3871.905799ms
TOP NOT OK [B-SAN3-05 · o papel de runtime não contorna FORCE RLS] dur=8027.819089ms erro="'2 subtests failed'"
residuo: papeis s305%=0 bancos s305%=0 relacoes s305%=0 slots=0
  SONDA-MUT TRAVA zc1_rs session_user=zc1_rs current_user=zc1_rs escapes=1 [view/postgres/objetos=1/is_self=false]
  SONDA-MUT TRAVA zc1_rb session_user=zc1_rb current_user=zc1_rb escapes=0 []
  SONDA-MUT TRAVA zc1_rk session_user=zc1_rk current_user=zc1_rk escapes=1 [view/zc1_common/objetos=1/is_self=false]
  SONDA-MUT TRAVA zc1_ri session_user=zc1_ri current_user=zc1_ri escapes=1 [view/postgres/objetos=1/is_self=false]
  SONDA-MUT TRAVA zc1_rc session_user=zc1_rc current_user=zc1_rc escapes=0 []
restauro: md5 692d953d26aafa8d40d6902fca2bccfc blob 692d953d26aafa8d40d6902fca2bccfc -> IGUAL · pristino removido=sim
=== CICLO b-s 17:14:38Z ===
MUT b-s arquivo=/work/scripts/db-runtime-role.sh ancora_ocorrencias=1 pristino=/tmp/db-runtime-role.sh.pristino md5_antes=911fddc132af8fa3c3d7fc976b7b6efe md5_depois=6d333c5442c55099a013171dd761c493
diff: linhas mudadas=2 · >      WHERE o.rolsuper OR lv.relkind = 'm'
carga: bash -n ec=0
RUN b-s inicio 17:14:38Z md5 runtime-role.ts=692d953d26aafa8d40d6902fca2bccfc script=6d333c5442c55099a013171dd761c493 teste=a7b0961586938aa9f9a024c81667f869
RUN b-s ec=1 duracao=8s · senha do admin no TAP=0
CONTAGENS tests=12 suites=0 pass=9 fail=3 cancelled=0 skipped=0 todo=0
  sub OK [T5/T6/T9 · papel limpo passa; postgres recusa; log não expõe conexão] dur=303.514446ms
  sub OK [T7/T8 · super renomeado e pertença direta, NOINHERIT, cadeia e SET FALSE recusam] dur=383.365139ms
  sub OK [T8b/T8c · posse e session_user continuam visíveis depois de SET ROLE] dur=258.784381ms
  sub OK [T8c · três semi-mutantes session_user→current_user perdem exatamente a via do login] dur=249.68999ms
  sub OK [T8d · REPLICATION exercível, papel de servidor e view transitiva são recusados] dur=577.980255ms
  sub OK [T8e · trava: cadeia de views com donos mistos, matview e escrita pela view (A2)] dur=627.214371ms
  sub NOT OK [T8f · a trava e o MODO 6 avaliam o mesmo CTE] dur=1.137252ms erro="o CTE do DO divergiu da trava + actual - expected  + \"WITHRECURSIVEview_walk(root_oid,leaf_oid)AS(SELECTv.oid,v.oidFROMpg_classvWHEREv.relkindIN('v','m')UNIONSELECTw.root_oid,dep.oidFROMview_walkwJOINpg_rewriterwONrw.ev_class=w.leaf_oidJOINpg_dependdONd.classid='pg_rewrite'::regclassANDd.objid=rw.oi" linhas=963,956
  sub OK [T14a/b · o procedimento converge, é idempotente e falha fechado nos modos nomeados] dur=1049.946879ms
  sub OK [T14c · filhos escritores respeitam a trava única e a guarda estrutural é fechada] dur=577.361836ms
  sub NOT OK [T14d · MODO 6: a mesma cadeia criada ANTES do script, sem SELECT direto em W (A2/A3)] dur=207.760571ms erro="caso B: status deveria ser 3 DO s305_a2_b_1791566082515_71c806f1|f|f|f|f|0|1|116 Enter new password for user \"s305_a2_b_1791566082515_71c806f1\": Enter it again:   0 !== 3 " linhas=1361,1351
  sub OK [T15 · boot real recusa super antes do Redis e aceita papel limpo] dur=3897.908182ms
TOP NOT OK [B-SAN3-05 · o papel de runtime não contorna FORCE RLS] dur=8183.680768ms erro="'2 subtests failed'"
residuo: papeis s305%=0 bancos s305%=0 relacoes s305%=0 slots=0
  SONDA-MUT SCRIPT mb_s__s papel=zc1_mb_s__s ec=3 modos=[MODO 3 MODO 6 ] vias=[escapa de RLS por 1 via(s): view:zc1_vs] linha_final=[] senha_no_stdout_stderr=0
  SONDA-MUT SCRIPT mb_s__b papel=zc1_mb_s__b ec=0 modos=[] vias=[] linha_final=[zc1_mb_s__b|f|f|f|f|0|1|116] senha_no_stdout_stderr=0
  SONDA-MUT SCRIPT mb_s__k papel=zc1_mb_s__k ec=3 modos=[MODO 3 MODO 6 ] vias=[escapa de RLS por 1 via(s): view:zc1_vk] linha_final=[] senha_no_stdout_stderr=0
  SONDA-MUT SCRIPT mb_s__i papel=zc1_mb_s__i ec=3 modos=[MODO 3 MODO 6 ] vias=[escapa de RLS por 1 via(s): view:zc1_wi] linha_final=[] senha_no_stdout_stderr=0
  SONDA-MUT SCRIPT mb_s__c papel=zc1_mb_s__c ec=0 modos=[] vias=[] linha_final=[zc1_mb_s__c|f|f|f|f|0|0|116] senha_no_stdout_stderr=0
  papeis zc1_mb_s__* restantes=0
restauro: md5 911fddc132af8fa3c3d7fc976b7b6efe blob 911fddc132af8fa3c3d7fc976b7b6efe -> IGUAL · pristino removido=sim
```
```
=== CICLO c-t 17:14:56Z ===
MUT c-t arquivo=/work/src/database/runtime-role.ts ancora_ocorrencias=1 pristino=/tmp/runtime-role.ts.pristino md5_antes=692d953d26aafa8d40d6902fca2bccfc md5_depois=1713c3fd0c6c54c2201f40a047a8364d
diff: linhas mudadas=2 · >   JOIN pg_class dep ON dep.oid = d.refobjid AND false
carga: modulo importado, RUNTIME_ROLE_GUARD_SQL md5=3477f55dd6984caba1f1e5ae44868cc0
RUN c-t inicio 17:14:56Z md5 runtime-role.ts=1713c3fd0c6c54c2201f40a047a8364d script=911fddc132af8fa3c3d7fc976b7b6efe teste=a7b0961586938aa9f9a024c81667f869
RUN c-t ec=1 duracao=8s · senha do admin no TAP=0
CONTAGENS tests=12 suites=0 pass=8 fail=4 cancelled=0 skipped=0 todo=0
  sub OK [T5/T6/T9 · papel limpo passa; postgres recusa; log não expõe conexão] dur=288.066638ms
  sub OK [T7/T8 · super renomeado e pertença direta, NOINHERIT, cadeia e SET FALSE recusam] dur=351.888329ms
  sub OK [T8b/T8c · posse e session_user continuam visíveis depois de SET ROLE] dur=281.905548ms
  sub OK [T8c · três semi-mutantes session_user→current_user perdem exatamente a via do login] dur=237.641037ms
  sub NOT OK [T8d · REPLICATION exercível, papel de servidor e view transitiva são recusados] dur=385.772782ms erro="'escape view/postgres não encontrado: []'" linhas=111,874,817
  sub NOT OK [T8e · trava: cadeia de views com donos mistos, matview e escrita pela view (A2)] dur=482.051441ms erro="'escape view/postgres não encontrado: []'" linhas=111,934,910
  sub NOT OK [T8f · a trava e o MODO 6 avaliam o mesmo CTE] dur=0.918176ms erro="o CTE do DO divergiu da trava + actual - expected  + \"WITHRECURSIVEview_walk(root_oid,leaf_oid)AS(SELECTv.oid,v.oidFROMpg_classvWHEREv.relkindIN('v','m')UNIONSELECTw.root_oid,dep.oidFROMview_walkwJOINpg_rewriterwONrw.ev_class=w.leaf_oidJOINpg_dependdONd.classid='pg_rewrite'::regclassANDd.objid=rw.oi" linhas=963,956
  sub OK [T14a/b · o procedimento converge, é idempotente e falha fechado nos modos nomeados] dur=1032.000373ms
  sub OK [T14c · filhos escritores respeitam a trava única e a guarda estrutural é fechada] dur=577.561685ms
  sub OK [T14d · MODO 6: a mesma cadeia criada ANTES do script, sem SELECT direto em W (A2/A3)] dur=297.168461ms
  sub OK [T15 · boot real recusa super antes do Redis e aceita papel limpo] dur=3899.891633ms
TOP NOT OK [B-SAN3-05 · o papel de runtime não contorna FORCE RLS] dur=7887.481956ms erro="'3 subtests failed'"
residuo: papeis s305%=0 bancos s305%=0 relacoes s305%=0 slots=0
  SONDA-MUT TRAVA zc1_rs session_user=zc1_rs current_user=zc1_rs escapes=0 []
  SONDA-MUT TRAVA zc1_rb session_user=zc1_rb current_user=zc1_rb escapes=0 []
  SONDA-MUT TRAVA zc1_rk session_user=zc1_rk current_user=zc1_rk escapes=0 []
  SONDA-MUT TRAVA zc1_ri session_user=zc1_ri current_user=zc1_ri escapes=1 [view/postgres/objetos=1/is_self=false]
  SONDA-MUT TRAVA zc1_rc session_user=zc1_rc current_user=zc1_rc escapes=0 []
restauro: md5 692d953d26aafa8d40d6902fca2bccfc blob 692d953d26aafa8d40d6902fca2bccfc -> IGUAL · pristino removido=sim
=== CICLO c-s 17:15:05Z ===
MUT c-s arquivo=/work/scripts/db-runtime-role.sh ancora_ocorrencias=1 pristino=/tmp/db-runtime-role.sh.pristino md5_antes=911fddc132af8fa3c3d7fc976b7b6efe md5_depois=85d0d1e8e52739aca9e2f3869443d4ba
diff: linhas mudadas=2 · >       JOIN pg_class dep ON dep.oid = d.refobjid AND false
carga: bash -n ec=0
RUN c-s inicio 17:15:05Z md5 runtime-role.ts=692d953d26aafa8d40d6902fca2bccfc script=85d0d1e8e52739aca9e2f3869443d4ba teste=a7b0961586938aa9f9a024c81667f869
RUN c-s ec=1 duracao=9s · senha do admin no TAP=0
CONTAGENS tests=12 suites=0 pass=9 fail=3 cancelled=0 skipped=0 todo=0
  sub OK [T5/T6/T9 · papel limpo passa; postgres recusa; log não expõe conexão] dur=296.431544ms
  sub OK [T7/T8 · super renomeado e pertença direta, NOINHERIT, cadeia e SET FALSE recusam] dur=429.005329ms
  sub OK [T8b/T8c · posse e session_user continuam visíveis depois de SET ROLE] dur=264.757092ms
  sub OK [T8c · três semi-mutantes session_user→current_user perdem exatamente a via do login] dur=254.97536ms
  sub OK [T8d · REPLICATION exercível, papel de servidor e view transitiva são recusados] dur=582.611834ms
  sub OK [T8e · trava: cadeia de views com donos mistos, matview e escrita pela view (A2)] dur=677.073948ms
  sub NOT OK [T8f · a trava e o MODO 6 avaliam o mesmo CTE] dur=0.96836ms erro="o CTE do DO divergiu da trava + actual - expected  + \"WITHRECURSIVEview_walk(root_oid,leaf_oid)AS(SELECTv.oid,v.oidFROMpg_classvWHEREv.relkindIN('v','m')UNIONSELECTw.root_oid,dep.oidFROMview_walkwJOINpg_rewriterwONrw.ev_class=w.leaf_oidJOINpg_dependdONd.classid='pg_rewrite'::regclassANDd.objid=rw.oi" linhas=963,956
  sub OK [T14a/b · o procedimento converge, é idempotente e falha fechado nos modos nomeados] dur=1084.302584ms
  sub OK [T14c · filhos escritores respeitam a trava única e a guarda estrutural é fechada] dur=580.097948ms
  sub NOT OK [T14d · MODO 6: a mesma cadeia criada ANTES do script, sem SELECT direto em W (A2/A3)] dur=177.805631ms erro="caso S: status deveria ser 3 DO s305_a2_s_1791566110268_eaca1a86|f|f|f|f|0|1|116 Enter new password for user \"s305_a2_s_1791566110268_eaca1a86\": Enter it again:   0 !== 3 " linhas=1361,1351
  sub OK [T15 · boot real recusa super antes do Redis e aceita papel limpo] dur=3805.792102ms
TOP NOT OK [B-SAN3-05 · o papel de runtime não contorna FORCE RLS] dur=8204.201666ms erro="'2 subtests failed'"
residuo: papeis s305%=0 bancos s305%=0 relacoes s305%=0 slots=0
  SONDA-MUT SCRIPT mc_s__s papel=zc1_mc_s__s ec=0 modos=[] vias=[] linha_final=[zc1_mc_s__s|f|f|f|f|0|1|116] senha_no_stdout_stderr=0
  SONDA-MUT SCRIPT mc_s__b papel=zc1_mc_s__b ec=0 modos=[] vias=[] linha_final=[zc1_mc_s__b|f|f|f|f|0|1|116] senha_no_stdout_stderr=0
  SONDA-MUT SCRIPT mc_s__k papel=zc1_mc_s__k ec=0 modos=[] vias=[] linha_final=[zc1_mc_s__k|f|f|f|f|0|1|116] senha_no_stdout_stderr=0
  SONDA-MUT SCRIPT mc_s__i papel=zc1_mc_s__i ec=3 modos=[MODO 3 MODO 6 ] vias=[escapa de RLS por 1 via(s): view:zc1_wi] linha_final=[] senha_no_stdout_stderr=0
  SONDA-MUT SCRIPT mc_s__c papel=zc1_mc_s__c ec=0 modos=[] vias=[] linha_final=[zc1_mc_s__c|f|f|f|f|0|0|116] senha_no_stdout_stderr=0
  papeis zc1_mc_s__* restantes=0
restauro: md5 911fddc132af8fa3c3d7fc976b7b6efe blob 911fddc132af8fa3c3d7fc976b7b6efe -> IGUAL · pristino removido=sim
```
```
=== CICLO d-t 17:15:23Z ===
MUT d-t arquivo=/work/src/database/runtime-role.ts ancora_ocorrencias=1 pristino=/tmp/runtime-role.ts.pristino md5_antes=692d953d26aafa8d40d6902fca2bccfc md5_depois=a736e770eb607dc25f2523c6760b88a9
diff: linhas mudadas=2 · >   WHERE o.rolsuper OR o.rolbypassrls
carga: modulo importado, RUNTIME_ROLE_GUARD_SQL md5=7b09ae5249707e7bffc4121856f720cc
RUN d-t inicio 17:15:23Z md5 runtime-role.ts=a736e770eb607dc25f2523c6760b88a9 script=911fddc132af8fa3c3d7fc976b7b6efe teste=a7b0961586938aa9f9a024c81667f869
RUN d-t ec=1 duracao=9s · senha do admin no TAP=0
CONTAGENS tests=12 suites=0 pass=9 fail=3 cancelled=0 skipped=0 todo=0
  sub OK [T5/T6/T9 · papel limpo passa; postgres recusa; log não expõe conexão] dur=298.555813ms
  sub OK [T7/T8 · super renomeado e pertença direta, NOINHERIT, cadeia e SET FALSE recusam] dur=351.018244ms
  sub OK [T8b/T8c · posse e session_user continuam visíveis depois de SET ROLE] dur=271.47421ms
  sub OK [T8c · três semi-mutantes session_user→current_user perdem exatamente a via do login] dur=240.12906ms
  sub OK [T8d · REPLICATION exercível, papel de servidor e view transitiva são recusados] dur=557.521029ms
  sub NOT OK [T8e · trava: cadeia de views com donos mistos, matview e escrita pela view (A2)] dur=567.622971ms erro="'escape view/s305_a2_common_1791566125685_6143afe0 não encontrado: []'" linhas=111,943,910
  sub NOT OK [T8f · a trava e o MODO 6 avaliam o mesmo CTE] dur=1.162558ms erro="o CTE do DO divergiu da trava + actual - expected  + \"WITHRECURSIVEview_walk(root_oid,leaf_oid)AS(SELECTv.oid,v.oidFROMpg_classvWHEREv.relkindIN('v','m')UNIONSELECTw.root_oid,dep.oidFROMview_walkwJOINpg_rewriterwONrw.ev_class=w.leaf_oidJOINpg_dependdONd.classid='pg_rewrite'::regclassANDd.objid=rw.oi" linhas=963,956
  sub OK [T14a/b · o procedimento converge, é idempotente e falha fechado nos modos nomeados] dur=1235.059622ms
  sub OK [T14c · filhos escritores respeitam a trava única e a guarda estrutural é fechada] dur=580.141244ms
  sub OK [T14d · MODO 6: a mesma cadeia criada ANTES do script, sem SELECT direto em W (A2/A3)] dur=278.465179ms
  sub OK [T15 · boot real recusa super antes do Redis e aceita papel limpo] dur=3953.042121ms
TOP NOT OK [B-SAN3-05 · o papel de runtime não contorna FORCE RLS] dur=8384.645484ms erro="'2 subtests failed'"
residuo: papeis s305%=0 bancos s305%=0 relacoes s305%=0 slots=0
  SONDA-MUT TRAVA zc1_rs session_user=zc1_rs current_user=zc1_rs escapes=1 [view/postgres/objetos=1/is_self=false]
  SONDA-MUT TRAVA zc1_rb session_user=zc1_rb current_user=zc1_rb escapes=1 [view/zc1_bypass/objetos=1/is_self=false]
  SONDA-MUT TRAVA zc1_rk session_user=zc1_rk current_user=zc1_rk escapes=0 []
  SONDA-MUT TRAVA zc1_ri session_user=zc1_ri current_user=zc1_ri escapes=1 [view/postgres/objetos=1/is_self=false]
  SONDA-MUT TRAVA zc1_rc session_user=zc1_rc current_user=zc1_rc escapes=0 []
restauro: md5 692d953d26aafa8d40d6902fca2bccfc blob 692d953d26aafa8d40d6902fca2bccfc -> IGUAL · pristino removido=sim
=== CICLO d-s 17:15:33Z ===
MUT d-s arquivo=/work/scripts/db-runtime-role.sh ancora_ocorrencias=1 pristino=/tmp/db-runtime-role.sh.pristino md5_antes=911fddc132af8fa3c3d7fc976b7b6efe md5_depois=3e7bf11322882014b189f9d64189a4ef
diff: linhas mudadas=2 · >      WHERE o.rolsuper OR o.rolbypassrls
carga: bash -n ec=0
RUN d-s inicio 17:15:33Z md5 runtime-role.ts=692d953d26aafa8d40d6902fca2bccfc script=3e7bf11322882014b189f9d64189a4ef teste=a7b0961586938aa9f9a024c81667f869
RUN d-s ec=1 duracao=9s · senha do admin no TAP=0
CONTAGENS tests=12 suites=0 pass=9 fail=3 cancelled=0 skipped=0 todo=0
  sub OK [T5/T6/T9 · papel limpo passa; postgres recusa; log não expõe conexão] dur=374.905887ms
  sub OK [T7/T8 · super renomeado e pertença direta, NOINHERIT, cadeia e SET FALSE recusam] dur=406.599797ms
  sub OK [T8b/T8c · posse e session_user continuam visíveis depois de SET ROLE] dur=276.12126ms
  sub OK [T8c · três semi-mutantes session_user→current_user perdem exatamente a via do login] dur=260.796038ms
  sub OK [T8d · REPLICATION exercível, papel de servidor e view transitiva são recusados] dur=611.324387ms
  sub OK [T8e · trava: cadeia de views com donos mistos, matview e escrita pela view (A2)] dur=714.088947ms
  sub NOT OK [T8f · a trava e o MODO 6 avaliam o mesmo CTE] dur=1.006982ms erro="o CTE do DO divergiu da trava + actual - expected  + \"WITHRECURSIVEview_walk(root_oid,leaf_oid)AS(SELECTv.oid,v.oidFROMpg_classvWHEREv.relkindIN('v','m')UNIONSELECTw.root_oid,dep.oidFROMview_walkwJOINpg_rewriterwONrw.ev_class=w.leaf_oidJOINpg_dependdONd.classid='pg_rewrite'::regclassANDd.objid=rw.oi" linhas=963,956
  sub OK [T14a/b · o procedimento converge, é idempotente e falha fechado nos modos nomeados] dur=1196.680884ms
  sub OK [T14c · filhos escritores respeitam a trava única e a guarda estrutural é fechada] dur=590.420798ms
  sub NOT OK [T14d · MODO 6: a mesma cadeia criada ANTES do script, sem SELECT direto em W (A2/A3)] dur=250.599168ms erro="caso K: status deveria ser 3 DO s305_a2_k_1791566138178_d292f48b|f|f|f|f|0|1|116 Enter new password for user \"s305_a2_k_1791566138178_d292f48b\": Enter it again:   0 !== 3 " linhas=1361,1351
  sub OK [T15 · boot real recusa super antes do Redis e aceita papel limpo] dur=4494.202007ms
TOP NOT OK [B-SAN3-05 · o papel de runtime não contorna FORCE RLS] dur=9241.621623ms erro="'2 subtests failed'"
residuo: papeis s305%=0 bancos s305%=0 relacoes s305%=0 slots=0
  SONDA-MUT SCRIPT md_s__s papel=zc1_md_s__s ec=3 modos=[MODO 3 MODO 6 ] vias=[escapa de RLS por 1 via(s): view:zc1_vs] linha_final=[] senha_no_stdout_stderr=0
  SONDA-MUT SCRIPT md_s__b papel=zc1_md_s__b ec=3 modos=[MODO 3 MODO 6 ] vias=[escapa de RLS por 1 via(s): view:zc1_vb] linha_final=[] senha_no_stdout_stderr=0
  SONDA-MUT SCRIPT md_s__k papel=zc1_md_s__k ec=0 modos=[] vias=[] linha_final=[zc1_md_s__k|f|f|f|f|0|1|116] senha_no_stdout_stderr=0
  SONDA-MUT SCRIPT md_s__i papel=zc1_md_s__i ec=3 modos=[MODO 3 MODO 6 ] vias=[escapa de RLS por 1 via(s): view:zc1_wi] linha_final=[] senha_no_stdout_stderr=0
  SONDA-MUT SCRIPT md_s__c papel=zc1_md_s__c ec=0 modos=[] vias=[] linha_final=[zc1_md_s__c|f|f|f|f|0|0|116] senha_no_stdout_stderr=0
  papeis zc1_md_s__* restantes=0
restauro: md5 911fddc132af8fa3c3d7fc976b7b6efe blob 911fddc132af8fa3c3d7fc976b7b6efe -> IGUAL · pristino removido=sim
=== CICLO e-t 17:15:43Z ===
MUT e-t arquivo=/work/src/database/runtime-role.ts ancora_ocorrencias=1 pristino=/tmp/runtime-role.ts.pristino md5_antes=692d953d26aafa8d40d6902fca2bccfc md5_depois=dac4dec60bdfc7be1afcb1bce5f13fce
diff: linhas mudadas=2 · >   WHERE (has_table_privilege(session_user, v.oid, 'SELECT') OR has_table_privilege(current_user, v.oid, 'SELECT'))
carga: modulo importado, RUNTIME_ROLE_GUARD_SQL md5=04fa97c0724743aa45556d8a3d2c3221
RUN e-t inicio 17:15:44Z md5 runtime-role.ts=dac4dec60bdfc7be1afcb1bce5f13fce script=911fddc132af8fa3c3d7fc976b7b6efe teste=a7b0961586938aa9f9a024c81667f869
RUN e-t ec=1 duracao=9s · senha do admin no TAP=0
CONTAGENS tests=12 suites=0 pass=9 fail=3 cancelled=0 skipped=0 todo=0
  sub OK [T5/T6/T9 · papel limpo passa; postgres recusa; log não expõe conexão] dur=319.363375ms
  sub OK [T7/T8 · super renomeado e pertença direta, NOINHERIT, cadeia e SET FALSE recusam] dur=360.730547ms
  sub OK [T8b/T8c · posse e session_user continuam visíveis depois de SET ROLE] dur=262.692648ms
  sub NOT OK [T8c · três semi-mutantes session_user→current_user perdem exatamente a via do login] dur=317.326764ms erro="'false == true'" linhas=794,736
  sub OK [T8d · REPLICATION exercível, papel de servidor e view transitiva são recusados] dur=621.604663ms
  sub NOT OK [T8e · trava: cadeia de views com donos mistos, matview e escrita pela view (A2)] dur=798.057012ms erro="'escape view/postgres não encontrado: []'" linhas=111,948,910
  sub OK [T8f · a trava e o MODO 6 avaliam o mesmo CTE] dur=0.596719ms
  sub OK [T14a/b · o procedimento converge, é idempotente e falha fechado nos modos nomeados] dur=1272.00227ms
  sub OK [T14c · filhos escritores respeitam a trava única e a guarda estrutural é fechada] dur=602.140392ms
  sub OK [T14d · MODO 6: a mesma cadeia criada ANTES do script, sem SELECT direto em W (A2/A3)] dur=348.042653ms
  sub OK [T15 · boot real recusa super antes do Redis e aceita papel limpo] dur=4183.258209ms
TOP NOT OK [B-SAN3-05 · o papel de runtime não contorna FORCE RLS] dur=9144.45311ms erro="'2 subtests failed'"
residuo: papeis s305%=0 bancos s305%=0 relacoes s305%=0 slots=0
  SONDA-MUT TRAVA zc1_rs session_user=zc1_rs current_user=zc1_rs escapes=1 [view/postgres/objetos=1/is_self=false]
  SONDA-MUT TRAVA zc1_rb session_user=zc1_rb current_user=zc1_rb escapes=1 [view/zc1_bypass/objetos=1/is_self=false]
  SONDA-MUT TRAVA zc1_rk session_user=zc1_rk current_user=zc1_rk escapes=1 [view/zc1_common/objetos=1/is_self=false]
  SONDA-MUT TRAVA zc1_ri session_user=zc1_ri current_user=zc1_ri escapes=0 []
  SONDA-MUT TRAVA zc1_rc session_user=zc1_rc current_user=zc1_rc escapes=0 []
restauro: md5 692d953d26aafa8d40d6902fca2bccfc blob 692d953d26aafa8d40d6902fca2bccfc -> IGUAL · pristino removido=sim
=== CICLO e-s 17:15:54Z ===
MUT e-s arquivo=/work/scripts/db-runtime-role.sh ancora_ocorrencias=1 pristino=/tmp/db-runtime-role.sh.pristino md5_antes=911fddc132af8fa3c3d7fc976b7b6efe md5_depois=eeb0e57f8df30c82215ee19675b1ca82
diff: linhas mudadas=2 · >      WHERE has_table_privilege(alvo.oid, v.oid, 'SELECT')
carga: bash -n ec=0
RUN e-s inicio 17:15:54Z md5 runtime-role.ts=692d953d26aafa8d40d6902fca2bccfc script=eeb0e57f8df30c82215ee19675b1ca82 teste=a7b0961586938aa9f9a024c81667f869
RUN e-s ec=1 duracao=9s · senha do admin no TAP=0
CONTAGENS tests=12 suites=0 pass=10 fail=2 cancelled=0 skipped=0 todo=0
  sub OK [T5/T6/T9 · papel limpo passa; postgres recusa; log não expõe conexão] dur=309.55081ms
  sub OK [T7/T8 · super renomeado e pertença direta, NOINHERIT, cadeia e SET FALSE recusam] dur=389.87368ms
  sub OK [T8b/T8c · posse e session_user continuam visíveis depois de SET ROLE] dur=275.856188ms
  sub OK [T8c · três semi-mutantes session_user→current_user perdem exatamente a via do login] dur=259.041696ms
  sub OK [T8d · REPLICATION exercível, papel de servidor e view transitiva são recusados] dur=703.495868ms
  sub OK [T8e · trava: cadeia de views com donos mistos, matview e escrita pela view (A2)] dur=745.201489ms
  sub OK [T8f · a trava e o MODO 6 avaliam o mesmo CTE] dur=0.475927ms
  sub OK [T14a/b · o procedimento converge, é idempotente e falha fechado nos modos nomeados] dur=1223.870313ms
  sub OK [T14c · filhos escritores respeitam a trava única e a guarda estrutural é fechada] dur=609.138332ms
  sub NOT OK [T14d · MODO 6: a mesma cadeia criada ANTES do script, sem SELECT direto em W (A2/A3)] dur=329.850609ms erro="caso I: status deveria ser 3 DO s305_a2_i_1791566159576_6f62e533|f|f|f|f|0|1|116 Enter new password for user \"s305_a2_i_1791566159576_6f62e533\": Enter it again:   0 !== 3 " linhas=1361,1351
  sub OK [T15 · boot real recusa super antes do Redis e aceita papel limpo] dur=3849.274043ms
TOP NOT OK [B-SAN3-05 · o papel de runtime não contorna FORCE RLS] dur=8752.149814ms erro="'1 subtest failed'"
residuo: papeis s305%=0 bancos s305%=0 relacoes s305%=0 slots=0
  SONDA-MUT SCRIPT me_s__s papel=zc1_me_s__s ec=3 modos=[MODO 3 MODO 6 ] vias=[escapa de RLS por 1 via(s): view:zc1_vs] linha_final=[] senha_no_stdout_stderr=0
  SONDA-MUT SCRIPT me_s__b papel=zc1_me_s__b ec=3 modos=[MODO 3 MODO 6 ] vias=[escapa de RLS por 1 via(s): view:zc1_vb] linha_final=[] senha_no_stdout_stderr=0
  SONDA-MUT SCRIPT me_s__k papel=zc1_me_s__k ec=3 modos=[MODO 3 MODO 6 ] vias=[escapa de RLS por 1 via(s): view:zc1_vk] linha_final=[] senha_no_stdout_stderr=0
  SONDA-MUT SCRIPT me_s__i papel=zc1_me_s__i ec=0 modos=[] vias=[] linha_final=[zc1_me_s__i|f|f|f|f|0|1|116] senha_no_stdout_stderr=0
  SONDA-MUT SCRIPT me_s__c papel=zc1_me_s__c ec=0 modos=[] vias=[] linha_final=[zc1_me_s__c|f|f|f|f|0|0|116] senha_no_stdout_stderr=0
  papeis zc1_me_s__* restantes=0
restauro: md5 911fddc132af8fa3c3d7fc976b7b6efe blob 911fddc132af8fa3c3d7fc976b7b6efe -> IGUAL · pristino removido=sim
```

**Tabela 10 × (gravado 17:17Z)** — linhas do stack no arquivo de guarda do objeto: 934 = asserção do caso S no T8e; 937 = B; 943 = K; 948 = I; 874 = T8d; 1361 = `caso <X>: status deveria ser 3` no T14d; 794 = `RUNTIME_ROLE_GUARD_SQL.includes(item.from)` do T8c; 963 = T8f. Irmão verde em todas: (t) T5/T6/T9 (executa a SQL da trava mutada como papel limpo e como postgres); (s) T14c (executa o script mutado até o fim com sucesso).

| id | subteste vermelho | caso que a mensagem nomeia | mensagem | T8f | T8d | duração do arquivo | casos reabertos pelas sondas do item 1 sob o mutante |
|---|---|---|---|---|---|---|---|
| M-D2a(t) | T8e (l.934) | S | `escape view/postgres não encontrado: []` | vermelho | verde | 8 s | trava: S, B, K → 0 escape; I segue pego; C 0 |
| M-D2a(s) | T14d (l.1361) | S | `caso S: status deveria ser 3 … 0 !== 3` | vermelho | verde | 8 s | script: S, B, K → ec=0 (linha final diagnóstica views=1); I ec=3; C ec=0 |
| M-D2b(t) | T8e (l.937) | B | `escape view/s305_a2_bypass_… não encontrado: []` | vermelho | verde | 9 s | trava: só B → 0 |
| M-D2b(s) | T14d (l.1361) | B | `caso B: status deveria ser 3` | vermelho | verde | 8 s | script: só B → ec=0 |
| M-D2c(t) | T8e (l.934) **e** T8d (l.874) | S (T8e) | `escape view/postgres não encontrado: []` | vermelho | **vermelho** | 8 s | trava: S, B, K → 0; I pego |
| M-D2c(s) | T14d (l.1361) | S | `caso S: status deveria ser 3` | vermelho | verde | 9 s | script: S, B, K → ec=0; I ec=3 · **T14a/b verde** |
| M-D2d(t) | T8e (l.943) | K | `escape view/s305_a2_common_… não encontrado: []` | vermelho | verde | 9 s | trava: só K → 0 |
| M-D2d(s) | T14d (l.1361) | K | `caso K: status deveria ser 3` | vermelho | verde | 9 s | script: só K → ec=0 |
| M-D2e(t) | T8e (l.948) (+ T8c por texto, l.794) | I | `escape view/postgres não encontrado: []` | **verde** (o privilégio fica fora do CTE) | verde | 9 s | trava: só I → 0 |
| M-D2e(s) | T14d (l.1361) | I | `caso I: status deveria ser 3` | **verde** | verde | 9 s | script: só I → ec=0 |

**10/10** vermelhas no T8e (t) ou no T14d (s) **pela asserção do caso indicado**; nos conjuntos com mais de um caso (M-D2a, M-D2c) as sondas mostram que S, B e K reabrem juntos e I não (a raiz de I é a própria W). Nenhuma ficou vermelha só no T8f (M-D2e nem toca o T8f). Restauro md5 = blob nas 10. Resíduo `s305%` = 0 depois de cada rodada; papéis `zc1_m*` das sondas removidos (contagem 0). Senha do admin no TAP = 0 em todas.

**Vermelho-controle do item 2** (`zz-j05c3c1-ctl2.sh` md5 e1aec6c29d8e225bbe185f8027a7e4a5, 17:16:46Z):
```
=== CTL2-1: view_escape que nao devolve nada nas TRES copias (trava + DO + linha final) 17:16:46Z ===
MUT grossa-t arquivo=/work/src/database/runtime-role.ts ancora_ocorrencias=1 pristino=/tmp/runtime-role.ts.pristino md5_antes=692d953d26aafa8d40d6902fca2bccfc md5_depois=5d990b41958e3f3fd0bd4c17857ea304
MUT grossa-s arquivo=/work/scripts/db-runtime-role.sh ancora_ocorrencias=2 pristino=/tmp/db-runtime-role.sh.pristino md5_antes=911fddc132af8fa3c3d7fc976b7b6efe md5_depois=09abec54b554285366a7514ca2d807b3
diff trava=2 script=4 · bash -n=0
RUN grossa inicio 17:16:46Z md5 runtime-role.ts=5d990b41958e3f3fd0bd4c17857ea304 script=09abec54b554285366a7514ca2d807b3 teste=a7b0961586938aa9f9a024c81667f869
RUN grossa ec=1 duracao=8s · senha do admin no TAP=0
CONTAGENS tests=12 suites=0 pass=6 fail=6 cancelled=0 skipped=0 todo=0
  sub OK [T5/T6/T9 · papel limpo passa; postgres recusa; log não expõe conexão] dur=282.65824ms
  sub OK [T7/T8 · super renomeado e pertença direta, NOINHERIT, cadeia e SET FALSE recusam] dur=359.832296ms
  sub OK [T8b/T8c · posse e session_user continuam visíveis depois de SET ROLE] dur=245.81752ms
  sub NOT OK [T8c · três semi-mutantes session_user→current_user perdem exatamente a via do login] dur=225.354531ms erro="'escape view/postgres não encontrado: []'" linhas=111,793,736
  sub NOT OK [T8d · REPLICATION exercível, papel de servidor e view transitiva são recusados] dur=405.611644ms erro="'escape view/postgres não encontrado: []'" linhas=111,874,817
  sub NOT OK [T8e · trava: cadeia de views com donos mistos, matview e escrita pela view (A2)] dur=469.719969ms erro="'escape view/postgres não encontrado: []'" linhas=111,934,910
  sub OK [T8f · a trava e o MODO 6 avaliam o mesmo CTE] dur=0.548275ms
  sub NOT OK [T14a/b · o procedimento converge, é idempotente e falha fechado nos modos nomeados] dur=270.448254ms erro="DO s305_runtime_1791566209191_6bcc0bab|f|f|f|f|0|0|116 Enter new password for user \"s305_runtime_1791566209191_6bcc0bab\": Enter it again:   0 !== 3 " linhas=1019,967
  sub OK [T14c · filhos escritores respeitam a trava única e a guarda estrutural é fechada] dur=581.550426ms
  sub NOT OK [T14d · MODO 6: a mesma cadeia criada ANTES do script, sem SELECT direto em W (A2/A3)] dur=169.790948ms erro="caso S: status deveria ser 3 DO s305_a2_s_1791566210036_ee8efe02|f|f|f|f|0|0|116 Enter new password for user \"s305_a2_s_1791566210036_ee8efe02\": Enter it again:   0 !== 3 " linhas=1361,1351
  sub OK [T15 · boot real recusa super antes do Redis e aceita papel limpo] dur=3769.969133ms
TOP NOT OK [B-SAN3-05 · o papel de runtime não contorna FORCE RLS] dur=6830.350703ms erro="'5 subtests failed'"
residuo: papeis s305%=0 bancos s305%=0 relacoes s305%=0 slots=0
restauro: trava IGUAL script IGUAL
=== CTL2-2: um token trocado SO na copia da linha final do script ('m' -> 'x' na juncao recursiva) ===
=== CICLO final-s 17:16:54Z ===
MUT final-s arquivo=/work/scripts/db-runtime-role.sh ancora_ocorrencias=1 pristino=/tmp/db-runtime-role.sh.pristino md5_antes=911fddc132af8fa3c3d7fc976b7b6efe md5_depois=d9adebbb49cde555fcdb0ae8be55912d
diff: linhas mudadas=2 · >     JOIN pg_class dep ON dep.oid = d.refobjid AND dep.relkind IN ('v','x')
carga: bash -n ec=0
RUN final-s inicio 17:16:54Z md5 runtime-role.ts=692d953d26aafa8d40d6902fca2bccfc script=d9adebbb49cde555fcdb0ae8be55912d teste=a7b0961586938aa9f9a024c81667f869
RUN final-s ec=1 duracao=8s · senha do admin no TAP=0
CONTAGENS tests=12 suites=0 pass=10 fail=2 cancelled=0 skipped=0 todo=0
  sub OK [T5/T6/T9 · papel limpo passa; postgres recusa; log não expõe conexão] dur=299.919915ms
  sub OK [T7/T8 · super renomeado e pertença direta, NOINHERIT, cadeia e SET FALSE recusam] dur=360.110056ms
  sub OK [T8b/T8c · posse e session_user continuam visíveis depois de SET ROLE] dur=268.770383ms
  sub OK [T8c · três semi-mutantes session_user→current_user perdem exatamente a via do login] dur=244.898384ms
  sub OK [T8d · REPLICATION exercível, papel de servidor e view transitiva são recusados] dur=570.188837ms
  sub OK [T8e · trava: cadeia de views com donos mistos, matview e escrita pela view (A2)] dur=703.732238ms
  sub NOT OK [T8f · a trava e o MODO 6 avaliam o mesmo CTE] dur=1.154201ms erro="o CTE da linha final divergiu da trava + actual - expected  + \"WITHRECURSIVEview_walk(root_oid,leaf_oid)AS(SELECTv.oid,v.oidFROMpg_classvWHEREv.relkindIN('v','m')UNIONSELECTw.root_oid,dep.oidFROMview_walkwJOINpg_rewriterwONrw.ev_class=w.leaf_oidJOINpg_dependdONd.classid='pg_rewrite'::regclassANDd.ob" linhas=964,956
  sub OK [T14a/b · o procedimento converge, é idempotente e falha fechado nos modos nomeados] dur=1031.336463ms
  sub OK [T14c · filhos escritores respeitam a trava única e a guarda estrutural é fechada] dur=586.690769ms
  sub OK [T14d · MODO 6: a mesma cadeia criada ANTES do script, sem SELECT direto em W (A2/A3)] dur=297.823823ms
  sub OK [T15 · boot real recusa super antes do Redis e aceita papel limpo] dur=3977.796215ms
TOP NOT OK [B-SAN3-05 · o papel de runtime não contorna FORCE RLS] dur=8391.900165ms erro="'1 subtest failed'"
residuo: papeis s305%=0 bancos s305%=0 relacoes s305%=0 slots=0
restauro: md5 911fddc132af8fa3c3d7fc976b7b6efe blob 911fddc132af8fa3c3d7fc976b7b6efe -> IGUAL · pristino removido=sim
=== CTL2-3: o leitor de TAP acusa um ok trocado por not ok ===
linhas trocadas=1
leitor sobre a copia trocada:   sub NOT OK [T8e · trava: cadeia de views com donos mistos, matview e escrita pela view (A2)] dur=667.656261ms
leitor sobre o original:        sub OK [T8e · trava: cadeia de views com donos mistos, matview e escrita pela view (A2)] dur=667.656261ms
```
- (1) grossa nas TRÊS cópias (âncora: 1 na trava, 2 no script, declarado): T8e vermelho (S, l.934) e T14d vermelho (caso S) com o **T8f verde** — T8e/T14d vigiam comportamento independentemente da deriva. **Acusou.** (2) token trocado só na cópia da linha final: T8f vermelho (`o CTE da linha final divergiu da trava`), T14d **verde**. **Acusou.** (3) leitor de TAP sobre cópia com o `ok` do T8e trocado por `not ok` → `NOT OK [T8e…]`; sobre o original → `OK`. **Acusou.**

**Item 2 — veredito parcial: VERDE.** Régua declarada: não houve mutação cega, então a divergência C3.4 × C3.5 × §C7 item 8(2) (R3) não precisou ser aplicada; se tivesse havido, valeria a leitura de `decisoes.md` (produto recusa + teste cego = forma de teste, não grave).

### Item 3 — A3 (gravado 17:19Z)
**(a) A ordem, lida no blob do objeto** (`tests/san3-05-runtime-role-guard-db.test.ts`, md5 LF a7b09615… = blob):
- T14d (l.1351-1382): fixture criada na l.1355 `createViewEscapeFixture(admin, false)` → papéis por `CREATE ROLE … NOLOGIN NOSUPERUSER NOBYPASSRLS NOREPLICATION NOCREATEDB NOCREATEROLE NOINHERIT` (l.150-153, `login=false`), **não** `createLogin` (l.82-94, que concede `… ON ALL TABLES`); privilégio só na raiz (l.183-187: SELECT em vs/vb/vk/vc, INSERT em wi). Âncora **afirmada** na l.1357 (`assertNoInnerSelect` → `assert.equal(rows[0]?.allowed, false, 'caso X: SELECT direto no nó interno tornaria a prova vazia')`, l.244-251) para os cinco casos, **antes** do laço; o script roda **uma vez por caso** na l.1360 (`runRoleScript`). Entre a âncora e cada execução só há execuções do script para OUTROS papéis (cada uma recusada faz ROLLBACK do `DO`; a que converge só concede em tabelas r/p/S e privilégio padrão para objetos futuros) — nenhuma concede em W. Papéis nunca passaram pelo script (tokens novos; T14a/b e T14c usam outros papéis). Espera: S, B, K, I → `status === 3` (l.1361), `/MODO 6/` (l.1362), `view:<raiz>` (l.1363-1367); C → `status === 0` (l.1372) e linha final `^<papel>|f|f|f|f|0|0|` (l.1373-1377: posse = 0, views = 0).
- T8e (l.910-954): `createViewEscapeFixture(admin, true)` (l.911) → leitores por `CREATE ROLE … LOGIN PASSWORD …` (l.152), não `createLogin`; âncora na l.913 antes do efeito real (l.923-931) e da trava (l.933-950).

**(b) M-D2c no `DO`** (registro do ciclo `c-s` no item 2, 17:15:05Z): T14d **vermelho** por `caso S: status deveria ser 3 … 0 !== 3` (l.1361) — S, B, K reabertos pelas sondas — **e T14a/b VERDE** sob a mesma mutação. Variante "duas cópias" do planejador (`c-s-duas`, âncora com 2 ocorrências, declarada), abaixo: T14d vermelho (caso S), T14a/b verde, T8f vermelho. **A prova nova vê o que a antiga não via.**

**(c) T8f** — extrator próprio `zz-j05c3c1-t8f.mjs` md5 2e42246075d0407244fcd2ceff32039b com a regex **lida do objeto** (l.957) e verificação de contagem `zz-j05c3c1-t8f3.mjs` md5 3ad469510e72667dc9639ba07aa9b8be:
```
=== T8f (extrator proprio) 17:18:34Z ===
regex lida em /work/tests/san3-05-runtime-role-guard-db.test.ts:957 source=WITH RECURSIVE view_walk[\s\S]*?view_escape AS \([\s\S]*?\n\s*\)(?=\s*\n\s*SELECT) flags=g
  l.960: assert.equal(guardCtes.length, 1, "a trava precisa ter exatamente um CTE da propriedade de view");
  l.961: assert.equal(scriptCtes.length, 2, "o script precisa ter o mesmo CTE no DO e na linha final");
  l.963: assert.equal(normalized[1], normalized[0], "o CTE do DO divergiu da trava");
  l.964: assert.equal(normalized[2], normalized[0], "o CTE da linha final divergiu da trava");
blocos: trava=1 script=2 · md5 sem espaco: trava=8b4a83ab2f95b49d9e892a0c2ea1dad6 DO=8b4a83ab2f95b49d9e892a0c2ea1dad6 final=8b4a83ab2f95b49d9e892a0c2ea1dad6 · DO==trava true · final==trava true
vacuo: texto sem bloco -> 0 bloco(s) -> a asserção de contagem REPROVA (a trava precisa ter exatamente um CTE

0 !== 1
)
exatamente 2 no script: um texto com 2 blocos reprovaria assert.equal(scriptCtes.length, 2)? false
=== CTL3-1: a ancora acusa (GRANT SELECT em W ao papel S do T14d antes do script) ===
MUT ancora-test ocorrencias=1
texto com 3 blocos casaveis -> 3 blocos; assert.equal(n, 2) REPROVA (exige exatamente 2)
```
- Blocos: trava = **1**, script = **2**; os três iguais sem espaço (md5 8b4a83ab… nos três). As asserções (l.960-961) são `assert.equal` de `node:assert/strict` → **exatamente** 1 e 2 (texto com 3 blocos casáveis reprova). T8f `ok` na base (item 2).

**Vermelho-controle do item 3:**
- (1) a âncora acusa — `zz-j05c3c1-mut3.mjs` md5 ec3039966e9284d0f99c36cc87283f87 (âncora `createViewEscapeFixture(admin, false);` = 1 ocorrência, +1 linha `GRANT SELECT ON <W de S> TO <papel S>` antes do script, só na cópia do container): T14d **vermelho** pela âncora — `caso S: SELECT direto no nó interno tornaria a prova vazia · true !== false` (stack l.249 ← l.1358); T8e e os demais verdes; restauro md5 = blob a7b09615…. **Acusou.**
- (2) o T8f não é vácuo — texto sem bloco → 0 blocos → `assert.equal(…, 1)` reprova (`0 !== 1`); e o token trocado só na cópia da linha final (CTL2-2) deixou o T8f vermelho (`o CTE da linha final divergiu da trava`). **Acusou.**
- (3) a prova antiga era cega — sob a M-D2c(s), T14a/b verde e T14d vermelho: a mutação de fato corta a transitividade e discrimina. **Acusou.**

Saída integral do controle da âncora e da variante duas cópias:
```
diff: linhas mudadas=1 · >         await catalog(admin, [`GRANT SELECT ON public.${ident(fixture.inner.S)} TO ${ident(fixture.principals.S.role)}`]);
RUN ancora inicio 17:18:34Z md5 runtime-role.ts=692d953d26aafa8d40d6902fca2bccfc script=911fddc132af8fa3c3d7fc976b7b6efe teste=dc666b52d70bde7c56e98184b58d131c
RUN ancora ec=1 duracao=9s · senha do admin no TAP=0
CONTAGENS tests=12 suites=0 pass=10 fail=2 cancelled=0 skipped=0 todo=0
  sub OK [T5/T6/T9 · papel limpo passa; postgres recusa; log não expõe conexão] dur=284.353589ms
  sub OK [T7/T8 · super renomeado e pertença direta, NOINHERIT, cadeia e SET FALSE recusam] dur=356.473976ms
  sub OK [T8b/T8c · posse e session_user continuam visíveis depois de SET ROLE] dur=242.342298ms
  sub OK [T8c · três semi-mutantes session_user→current_user perdem exatamente a via do login] dur=243.924045ms
  sub OK [T8d · REPLICATION exercível, papel de servidor e view transitiva são recusados] dur=652.390389ms
  sub OK [T8e · trava: cadeia de views com donos mistos, matview e escrita pela view (A2)] dur=660.134755ms
  sub OK [T8f · a trava e o MODO 6 avaliam o mesmo CTE] dur=0.441666ms
  sub OK [T14a/b · o procedimento converge, é idempotente e falha fechado nos modos nomeados] dur=1165.756659ms
  sub OK [T14c · filhos escritores respeitam a trava única e a guarda estrutural é fechada] dur=599.204062ms
  sub NOT OK [T14d · MODO 6: a mesma cadeia criada ANTES do script, sem SELECT direto em W (A2/A3)] dur=119.69625ms erro="caso S: SELECT direto no nó interno tornaria a prova vazia  true !== false " linhas=249,1358,1351
  sub OK [T15 · boot real recusa super antes do Redis e aceita papel limpo] dur=4219.307045ms
TOP NOT OK [B-SAN3-05 · o papel de runtime não contorna FORCE RLS] dur=8594.110083ms erro="'1 subtest failed'"
residuo: papeis s305%=0 bancos s305%=0 relacoes s305%=0 slots=0
54-      error: |-
55-        caso S: SELECT direto no nó interno tornaria a prova vazia
restauro teste: md5 a7b0961586938aa9f9a024c81667f869 blob a7b0961586938aa9f9a024c81667f869 -> IGUAL
=== M-D2c nas DUAS copias do script (variante do planejador) ===
=== CICLO c-s-duas 17:18:43Z ===
MUT c-s-duas arquivo=/work/scripts/db-runtime-role.sh ancora_ocorrencias=2 pristino=/tmp/db-runtime-role.sh.pristino md5_antes=911fddc132af8fa3c3d7fc976b7b6efe md5_depois=0d43e3f9d53e0b35af7319dec30d123e
diff: linhas mudadas=4 · >       JOIN pg_class dep ON dep.oid = d.refobjid AND false >     JOIN pg_class dep ON dep.oid = d.refobjid AND false
carga: bash -n ec=0
RUN c-s-duas inicio 17:18:43Z md5 runtime-role.ts=692d953d26aafa8d40d6902fca2bccfc script=0d43e3f9d53e0b35af7319dec30d123e teste=a7b0961586938aa9f9a024c81667f869
RUN c-s-duas ec=1 duracao=9s · senha do admin no TAP=0
CONTAGENS tests=12 suites=0 pass=9 fail=3 cancelled=0 skipped=0 todo=0
  sub OK [T5/T6/T9 · papel limpo passa; postgres recusa; log não expõe conexão] dur=334.462574ms
  sub OK [T7/T8 · super renomeado e pertença direta, NOINHERIT, cadeia e SET FALSE recusam] dur=405.289337ms
  sub OK [T8b/T8c · posse e session_user continuam visíveis depois de SET ROLE] dur=276.411909ms
  sub OK [T8c · três semi-mutantes session_user→current_user perdem exatamente a via do login] dur=256.391627ms
  sub OK [T8d · REPLICATION exercível, papel de servidor e view transitiva são recusados] dur=593.864662ms
  sub OK [T8e · trava: cadeia de views com donos mistos, matview e escrita pela view (A2)] dur=750.132293ms
  sub NOT OK [T8f · a trava e o MODO 6 avaliam o mesmo CTE] dur=1.08117ms erro="o CTE do DO divergiu da trava + actual - expected  + \"WITHRECURSIVEview_walk(root_oid,leaf_oid)AS(SELECTv.oid,v.oidFROMpg_classvWHEREv.relkindIN('v','m')UNIONSELECTw.root_oid,dep.oidFROMview_walkwJOINpg_rewriterwONrw.ev_class=w.leaf_oidJOINpg_dependdONd.classid='pg_rewrite'::regclassANDd.objid=rw.oi" linhas=963,956
  sub OK [T14a/b · o procedimento converge, é idempotente e falha fechado nos modos nomeados] dur=1223.618222ms
  sub OK [T14c · filhos escritores respeitam a trava única e a guarda estrutural é fechada] dur=589.786537ms
  sub NOT OK [T14d · MODO 6: a mesma cadeia criada ANTES do script, sem SELECT direto em W (A2/A3)] dur=194.124007ms erro="caso S: status deveria ser 3 DO s305_a2_s_1791566328699_782ede86|f|f|f|f|0|0|116 Enter new password for user \"s305_a2_s_1791566328699_782ede86\": Enter it again:   0 !== 3 " linhas=1361,1351
  sub OK [T15 · boot real recusa super antes do Redis e aceita papel limpo] dur=3726.526415ms
TOP NOT OK [B-SAN3-05 · o papel de runtime não contorna FORCE RLS] dur=8406.946542ms erro="'2 subtests failed'"
residuo: papeis s305%=0 bancos s305%=0 relacoes s305%=0 slots=0
restauro: md5 911fddc132af8fa3c3d7fc976b7b6efe blob 911fddc132af8fa3c3d7fc976b7b6efe -> IGUAL · pristino removido=sim
```
**Item 3 — veredito parcial: VERDE.**

### Item 1 — complemento: par discriminante na cadeia S canônica (gravado 17:20Z)
`zz-j05c3c1-par.sh` md5 584397f63eabb8e801aa997a5ec4716f — a MESMA raiz `zc1_vs` (→ `zc1_ws` postgres → T), papéis NOVOS: `zc1_rpt`/`zc1_s_pt` com `GRANT SELECT ON zc1_vs` (tabela) × `zc1_rpc`/`zc1_s_pc` com `GRANT SELECT (tenant_id, value) ON zc1_vs` (coluna, TODAS as colunas). Declaração: a senha das fixtures entrou como `-v p=` no argv do `psql` **dentro** do meu container (nunca no host; 0 na saída).
```
UTC 17:20:05Z
papeis LOGIN ec=0 (senha na saida=0)
ancora zc1_rpt: ws SELECT=f · vs tabela(lista)=t · vs coluna SELECT=t · acl vs=zc1_rpt=r · acl coluna=
ancora zc1_rpc: ws SELECT=f · vs tabela(lista)=f · vs coluna SELECT=t · acl vs= · acl coluna=tenant_id:{zc1_rpc=r value:{zc1_rpc=r
ancora zc1_s_pt: ws SELECT=f · vs tabela(lista)=t · vs coluna SELECT=t · acl vs=zc1_s_pt=r · acl coluna=
ancora zc1_s_pc: ws SELECT=f · vs tabela(lista)=f · vs coluna SELECT=t · acl vs= · acl coluna=tenant_id:{zc1_rpc=r/zc1_common,zc1_s_pc=r value:{zc1_rpc=r/zc1_common,zc1_s_pc=r
efeito zc1_rpt SELECT * sob A: 7/A,B,B,B,B,B,B
efeito zc1_rpc SELECT * sob A: 7/A,B,B,B,B,B,B
TRAVA zc1_rpt session_user=zc1_rpt current_user=zc1_rpt escapes=1 [view/postgres/objetos=1/is_self=false]
TRAVA zc1_rpc session_user=zc1_rpc current_user=zc1_rpc escapes=0 []
SCRIPT PT papel=zc1_s_pt ec=3 modos=[MODO 3 MODO 6 ] vias=[escapa de RLS por 1 via(s): view:zc1_vs] linha_final=[] senha_no_stdout_stderr=0
SCRIPT PC papel=zc1_s_pc ec=0 modos=[] vias=[] linha_final=[zc1_s_pc|f|f|f|f|0|0|116] senha_no_stdout_stderr=0
  POS-SCRIPT PC: login como zc1_s_pc (senha definida pelo script), contexto A, ultima linha=[7/A,B,B,B,B,B,B]
```
Leitura: a única diferença entre os dois papéis é a granularidade do GRANT (ACL na relação × ACL nas colunas, lido em `pg_class.relacl`/`pg_attribute.attacl`). Os dois fazem `SELECT *` na raiz e leem as mesmas 7 linhas (6 da organização B sob o contexto A). Tabela → trava `view/postgres` e MODO 6 ec=3 `view:zc1_vs`. Coluna → trava **0 escape**, MODO 6 **ec=0, views=0**, e o papel que o script entrega lê 7/A,B,B,B,B,B,B sob A. N = 2 da forma de coluna nesta cadeia (P1A em zc1_vcol e este par em zc1_vs) + P1B (1 nível) + P2/P3 (escrita).

### Normas aplicadas, medidas nas duas refs (§A7; gravado 17:20Z)
`git show <ref>:CLAUDE.md | grep -cF '<âncora>'` em f7fabd4a e origin/main a9bbde38 (CLAUDE.md EOL-neutro idêntico: a9419a55a77ea2adfd61a6ce80e77a27): '## A7.' 1/1 · 'GOVERNANÇA PROPORCIONAL' 1/1 · '(1) Junta proporcional' 1/1 · '(2) Teto de 2 ciclos' 1/1 (l.624-625: "A partir do ciclo 3, só bloqueia defeito de produto grave: perde dado, vaza dado entre organizações, quebra permissão ou erra dinheiro") · '(5) KPI congelado' 1/1 · '(a) Todo voto declara' 1/1 · '(b) Quórum por risco' 1/1 · '1-bis. INSPEÇÃO' 1/1 · 'SEPARAÇÃO DE PAPÉIS NA CORREÇÃO' 1/1 · 'ESGOTADO O FABLE, CAI PARA O OPUS' 1/1 · 'Paradas imediatas irredutíveis' 1/1 · 'P7 — Pausa ordenada' 1/1. `decisoes.md`: D-FABLE-ASTRA-SO-DINHEIRO 2 no objeto / 1 na main; a leitura R3/R4 ("leitura adotada na junta 3") 1 no objeto / 0 na main → aplico a do objeto (ref julgada, §A7). (Âncoras com negrito no meio dão 0 por formatação — re-medidas sem o marcador.)

## Fim (gravado 17:23Z)
- Objeto no fim: `git ls-remote` = `gh pr view 405` = **f7fabd4a7db230f93ceb2130f86a7e662882d3f5** (17:22:29Z) — não andou. `origin/main` no fim = a9bbde382213627545e9d229c9ab616d83a0a840 (não andou).
- Arquivos de outras cadeiras desta junta: nenhum aberto, lido ou citado (no fim, `ciclo3/` tinha só 00-inspetor-terreno, DEV-relatorio, FABRICA-relatorio e os meus dois).
- Limpeza: fixtures do cluster removidas (papéis `zc1%` 39 → 0; banco `j05c3c1_fx` → 0; `s305%` 0; relações zc1/s305 em erp_techsolutions 0; `/tmp/zz-j05c3c1-fixpw` apagado; pristinos 0; md5 dos 3 arquivos no container = blob) · containers `j05c3-c1-node` e `j05c3-c1-pg` por `docker rm -f -v` e rede `j05c3-c1-net` por `docker network rm` → contagem `j05c3-c1-` = 0/0, volume anônimo 39f542af… **removido**; `j05c3-c1-probeimg` era `--rm` · processos vivos com `w-j05c3c1` = 0 → `git worktree remove --force C:/Users/AMP/w-j05c3c1` ec=0, diretório ausente, `worktree list` sem ele · volumes órfãos alheios 18 antes e 18 depois (não criei nenhum; reportados pelo inspetor, não tocados) · base viva (erp-postgres/erp-redis/erp-postgres-alt) nunca tocada (seguem Exited) · w-o05: escrevi só os meus 2 arquivos · disco 11G livres no início e no fim · cópias do scratchpad apagadas depois do voto.

## Veredito
- Item 1: **VERMELHO** — A2 aberto por privilégio de COLUNA na raiz (grave, dentro-do-bloco, informação nova). Item 2: VERDE. Item 3: VERDE.
- Régua (R3/R4, `decisoes.md` @f7fabd4a; §C7 item 8(2)): escape medido que a trava REAL e o MODO 6 deixam passar = A2 aberto = grave = bloqueia. Não houve mutação cega nem item não medido.

VOTO: REPROVADO — o papel lê e grava linha de outra organização por uma raiz view em que tem privilégio de COLUNA (GRANT SELECT/UPDATE/INSERT (<colunas>) ON <raiz>) numa árvore com dono que escapa sobre tabela FORCE, e a trava REAL (0 escape; boot aceita) e o MODO 6 (ec=0, views=0) não acusam | escopo: dentro-do-bloco | classe: grave: vazamento entre organizações (e grave: perda de dado na escrita) | sinal R1: informação nova (granularidade de coluna do privilégio; não é dono da raiz, DML pela view nem matview) | evidência: par na mesma raiz zc1_vs — GRANT de tabela → trava 1 escape e MODO 6 ec=3; GRANT de coluna em todas as colunas → SELECT * lê as mesmas 7 linhas (6 de B sob A), trava 0, MODO 6 ec=0, papel convergido lê 7; N = 5 montagens de coluna (P1A, P1B, P2, P3, par), 1 execução cada

## Resumo por via (via:view) — gravado 17:26Z
- via:view medida por execução em todos os casos do item 1: trava REAL (`escapes` com `via=view`, rolname = dono do nó que escapa) e MODO 6 (`view:<raiz>`). Recusam: S, B, K, I, CTL2, P4, P5 (caso M), P6, P8. Passam (0 escape na via:view e ec=0 no MODO 6): C (controle — correto), P1A, P1B, P2, P3 (privilégio de coluna — achado grave C1-c3-01/02) e P7 (pertença + SET ROLE — nota C1-c3-03). As vias atributo e posse não foram objeto desta cadeira (lidas só no texto da SQL).
- Régua aplicada às mutações (R3): nenhuma mutação cega; as 10 ficaram vermelhas pelo comportamento. O privilégio de coluna e o caso M chegaram como candidatos da fábrica: o caso M (P5) foi medido e é recusado; o privilégio de coluna foi medido e escapa — por isso virou achado.
