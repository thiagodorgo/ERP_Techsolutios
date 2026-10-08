# B-SAN3-05 — PLANO v3 — o papel de runtime não escapa de RLS (itens 9 e 10 do §4.1) — ciclo 1, replanejado após a crítica r2 (última rodada do crítico)
> **Papel:** `planejador-mestre` · **identidade:** `planejador-b-san3-05-v3` (nova; não planejou v1/v2, não criticou, não desenvolve — §C7.4-bis) · **modelo:** **Fable 5.1** (`claude-fable-5-1`, o fixado no frontmatter; **sem substituição**) · **mandato_md5:** `068dbc0ee9bc5f1b0d3a80fd41ab3e69` (`tr -d '\r' < agent-orchestration/omega/juntas/votos/B-SAN3-05/00-mandatos/planejador-v3.md | md5sum`)
> **Mandato:** `agent-orchestration/omega/juntas/votos/B-SAN3-05/00-mandatos/planejador-v3.md` (63 linhas; mandato_md5 `068dbc0ee9bc5f1b0d3a80fd41ab3e69`) · **corpo do papel:** `git show HEAD:.claude/agents/planejador-mestre.md | tr -d '\r' | md5sum` → `4c912f69a93f07b14d8fd1c49539c778` · **relatório de evidência (P1):** `agent-orchestration/omega/juntas/votos/B-SAN3-05/PLANEJADOR-v3-relatorio.md` · **responde a** `docs/revisoes/SAN3/B-SAN3-05-critica-r2.md` (crítico `critico-b-san3-05`, Opus 5.5 declarado, head `c727156`) · **v2 recuperável em** `c727156`, **v1 em** `c3f57e9`.

> **MEDIDO (onde este plano foi medido).** Sessão de **nuvem**: `uname -a` = `Linux vm 6.18.44-fc-v51 #1 SMP PREEMPT_DYNAMIC @0 x86_64 GNU/Linux`; `PATH=/opt/node20/bin:$PATH node -v` = `v20.20.0` (o Node do CI, `ci.yml` `node-version: 20` em 5 jobs; o v22 da imagem não foi usado para número nenhum); `git --version` = 2.43.0. Ramo `docs/plano-b-san3-05` (base `5b6e1036` = merge-base com `origin/main`; `origin/main` = `5bcdcc58`, 2 commits de registro/governança depois). **As árvores `src`, `tests`, `scripts`, `prisma` são IDÊNTICAS** entre `5b6e1036`, `3b1fe0f9` (base da v2) e `origin/main` (`git rev-parse <ref>:<dir>` → `21e1c4f2…`, `2854a3ec…`, `6445f8bc…`, `e906ac2e…` nas três) — logo toda medição de código deste plano vale para `origin/main`; o ramo só toca `docs/` e `agent-orchestration/` (`git diff --name-only origin/main HEAD -- src tests scripts prisma | wc -l` → 0). Postgres **16.14** descartável próprio em `127.0.0.1:54371` (porta provada pela conexão; `ss` não existe na imagem), banco `erp_v3` com as migrações do head (115 tabelas, 106 FORCE, 0 views), defaults de log do PG16 (`log_min_error_statement=error`, `log_statement=none`). Sem Docker. Nenhum SHA digitado. **Números re-executados por mim** (relatório §0–§10): gerador/inventário, 27 fixtures, script v3 em 18 cenários, trava v3 em 13 papéis + semi-mutantes, Apêndice B (22/22), diferencial HTTP do resumo (T11a), boot real, `le-export`, CRLF, guard de catálogo, `deploy-manifest-parity` (28/28) e `production-runtime-gates` (63/63). **Herdado, dito exatamente:** P-j, P-m, P-p (§0.3) — medidos pela v2/r1/r2 em `3b1fe0f9` (mesma árvore) e não re-medidos; N4 (~11 s sem `$disconnect`) — medição da r1. **Ausente (ninguém mediu ainda):** o vermelho-controle de T11b (job diário) e T11c (cadeia de cobrança) na superfície HTTP/job sob papel efêmero — só a base deles (Apêndice B P2/P3/P4/P6) foi re-executada por mim; o dev cola o vermelho-controle na ata e a junta C3 confere (H7-a/H7-b).
>
> **HIPÓTESE (o que não foi medido aqui), com o comando que derruba:** só o que depende de Docker (compose local-prod, H1), do ambiente do Fly (H2/H3/H5) e do runner (H7 — agora com a imagem medida) — §0.6.
>
> **Onde mora a propriedade — a pergunta respondida duas vezes e derrubada duas vezes (F2 na r1 e na r2) — mora no §2 desta v3.** A v1 respondeu "o guard enuncia a propriedade" (16/17 formas verdes); a v2 respondeu "default negar por forma + T11 de uma rota" (9 formas verdes; T11 cobre o sítio 1). A v3 responde de outro jeito: **a propriedade do item 10 não é enunciável por análise estática** — toda análise estática enumera formas e uma forma nova escapa; o que se pode fazer estaticamente é um ratchet **semântico** (tipo e símbolo, não nome e texto), com residual **declarado por construção** e provado contra as 26 formas que já derrubaram v1 e v2 — **e a propriedade se enuncia dinamicamente, sobre uma superfície FECHADA e enumerada da fonte** (as rotas de plataforma e os dois jobs que tocam tabela FORCE), com o diferencial superusuário × papel sem bypass em cada uma (§2.3, T11a–T11d). O que fica fora dessa superfície (um sítio cru num módulo de organização) não é vazamento de plataforma: é regressão funcional daquele módulo sob papel sem bypass, e só a suíte `-db` inteira sob papel real a vê (`B-ARNES-2`, §13).

---

## Resposta à crítica r2 — achado por achado (medido de novo no head por este planejador; nunca herdado)

> Regra desta seção: **uma linha por achado**; "o que mudou" aponta a seção da v3; "critério" é o A# do §7; "mutação" é a que o deixa vermelho; "evidência" é comando + saída **executados por mim** nesta sessão (relatório `PLANEJADOR-v3-relatorio.md`, seção citada). Estado: **incorporado** · **incorporado com mudança de desenho** · **pendência nomeada**. Nenhum achado foi recusado por argumento; **nenhum ficou sem resposta** — a lista do que a v3 **não** faz está no §13 com o motivo.

| id | grav. | achado (resumo da r2) | o que mudou na v3 (seção) | critério · mutação que o deixa VERMELHO | evidência executada (relatório) | estado |
|---|---|---|---|---|---|---|
| **F2** (r1→r2) | bloqueia | gerador v2 cego a 9 formas (N01–N09) por reconhecimento de NOME e REGEX de texto; T11 = uma rota; C3(1) dependia do T11 pegar a forma do jurado | **Troca de mecanismo**: gerador v3 **semântico** (delegate pelo TIPO, classe pelo SÍMBOLO, setter por AST + identidade de símbolo, envoltório só pelo símbolo de `rls.ts`, `any` → suspeito; fixtures como arquivos virtuais) — §2.2(c), Apêndice A; **propriedade dinâmica sobre superfície FECHADA** (4 rotas + 2 jobs enumerados da fonte) — §2.3, T11a–T11d; **C3(1) reescrito**: forma dentro do alcance declarado do analisador que o ratchet não pegue **reprova**; forma fora dele vira pendência `B-ARNES-2`, **independentemente do T11** — §10 | A15/T13: **26 fixtures** (17 + 9) + "sumida" → cada uma +1 chave (VERMELHO); A12/T11a–d: rota ou job da superfície devolve corpo diferente sob super × efêmero → VERMELHO | §2 (9/9 verdes no v2 reproduzidos), §3: 26/26 VERMELHO num só programa, `sumida` novas=1 sumidas=1, inventário do head 53 chaves sha1 `5c566532…`, chaves fora de zz-mut == head | **incorporado com mudança de desenho** |
| **F2-01** | bloqueia | T7/T8/T8b/T14 escrevem catálogo e reprovam `db-catalog-write-guard`; allowlist e arnês fora do §6 | `tests/db-catalog-write-guard.test.ts` entra no PERMITIDO **nominalmente — só a(s) entrada(s) do `FROZEN_ALLOWLIST`** (arquivo novo + contagem + motivo), que é o caminho que o próprio guard documenta; o arnês **não** muda (as suítes escrevem catálogo **dentro de `withRoleCatalogLock`** importado dele) — §6, §8 | A21: a entrada existe com a contagem **medida** no head da entrega; mutação: contagem ±1 ou entrada ausente → o guard reprova (`contagem N difere da congelada` / `FORA da allowlist`) | §5: sonda → `FORA da allowlist` fail 1; entrada {count:2} → pass 1; count 3 → `contagem 2 difere da congelada 3` fail 1 | **incorporado** |
| **F2-02** | bloqueia | senha nova no CONTEXT (terminal + server.log) em todo modo de falha e no argv do psql | Script **v3** (Apêndice C): senha entra por `\\set` com backtick (builtin, sem argv); vai ao servidor UMA vez num `set_config`; **MODO 0** recusa antes de enviá-la se `log_statement=all`/`log_min_duration_statement=0` (override consciente `DB_RUNTIME_ALLOW_LOG_ALL=1`); todo EXECUTE que a carrega fica em bloco `BEGIN/EXCEPTION` próprio (o CONTEXT re-emitido é "at RAISE"); senha definida **por último** — §4.1 | A17/T14: cenários MODO 1 e MODO 4 → `grep -c <senha>` em stdout+stderr **= 0**; shim de `psql` → argv sem a senha; mutação: tirar o bloco EXCEPTION do CREATE → CONTEXT traz `PASSWORD '…'` → VERMELHO; voltar ao `-v password=` → argv traz → VERMELHO | §2-bis (v2: 1/1/1 nas três vias), §4 (vii) 0/0 + CONTEXT só "at RAISE", (viii) argv 0, (ix) MODO 0: 0 no log; com ALLOW: 1 (declarado), §6 re-confirmado | **incorporado** |
| F2-03 | ajuste | T11 "corpos iguais" num banco compartilhado, janela com "hoje" (`captureCloudUsage` grava `now()`), lote paralelo | Semente em **janela fixa 2001-01-01..02** (ninguém grava em 2001: `grep -rln '2001-0' tests src prisma` → 0) **e** valor **exato** esperado (`quantity` = 50; corpos iguais é condição adicional, não a única) — §8 T10/T11 | A10–A12: soma ≠ 50 ou corpos ≠ → VERMELHO; mutação: janela com `now()` + outra suíte gravando → o teste **não** fica vermelho por concorrência (prova de isolamento: `occurred_at` 2001 não colide) | §5 F2-03 (l.176 do capture; 0 arquivos com 2001; rotas aceitam `periodStart/periodEnd`), §7 diff-http: super → 50, efêmero → `[]` com a janela 2001 | **incorporado** |
| F2-04 | ajuste | pertença INDIRETA a papel que escapa: falha fechada com a mensagem de POSSE | O laço de REVOKE revoga o **primeiro salto** de toda cadeia que leve a papel que escapa (atributo, servidor, dono de FORCE); a verificação final lista as **vias** (`atributo:X, posse:Y, view:Z`) e cada uma manda consertar a coisa certa; **MODO 5** nomeado quando o executor não pode revogar — §4.1 | A17/T14 (iii-c): cadeia de 2 níveis → `ec=0`, membros diretos = ∅; mutação: voltar ao predicado direto → a cadeia sobrevive (`escapa=t`) → VERMELHO | §4 (iii-c) e (iv-e) | **incorporado** |
| F2-05 | ajuste | trava e script aprovam `pg_execute_server_program`, `REPLICATION` e view de dono que escapa | Trava v3 ganha `rolreplication` e os 3 papéis de servidor na metade `atributo`, e a **terceira via `view`** (view/matview de dono `rolsuper ∨ rolbypassrls` sobre tabela FORCE, com SELECT para o papel — por `pg_rewrite`/`pg_depend`); o script corrige REPLICATION (super), revoga os papéis de servidor e **MODO 6** nomeia a view — §2.2(a), §4.1 | A1–A4 + **A4b** (T8d: REPLICATION, servidor, view → recusa com a via; portas provadas); mutação: apagar `r.rolreplication` / os 3 nomes / a metade `view` → cada cenário PASSA → VERMELHO | §4: v3_repl → `atributo|v3_repl` + `pg_basebackup` 82 MB com o marcador do tenant B; v3_prog → `atributo|pg_execute_server_program` + `COPY FROM PROGRAM` → `a,b,segredo…`; view → `view|postgres|…|1`, porta `v_rel` → 3; script (iii-e) MODO 6 | **incorporado** |
| F2-06 | ajuste | T14b "pula declarando" sem `psql` estoura `SKIP_BUDGET_DB=2` e reprova o `npm test` | **Nenhum pulo**: sem `psql` sob `DATABASE_URL`, T14b **FALHA** nomeando o pré-requisito; `psql` 16 vira **pré-requisito declarado** da suíte `-db` (doc + comando do bloco + item do inspetor de terreno); a imagem `ubuntu-24.04` do runner traz PostgreSQL 16.15 (medido no README) — §8 T14b, §10, §13 | A17 (b): TAP imprime `psql: <caminho>`; mutação: remover `psql` do PATH → T14b vermelho (não skip) → `npm test` vermelho **pelo teste**, não pelo orçamento | §1 (README da imagem l.172-177; `ci.yml` sem psql), §5 F2-06 (l.82, l.90-94 do runner) | **incorporado** |
| F2-07 | ajuste | semi-mutante `session_user→current_user` numa metade sobrevive ao T8c (login superusuário) | T8c ganha **três cenários de login não-super** com `options=-c role=<efêmero limpo>`: membro de BYPASSRLS (mata a metade atributo), membro do DONO (mata a metade posse), SELECT em view de dono que escapa (mata a metade view) — §7 A5, §8 T8c; o SQL v3 tem **8** ocorrências de `session_user` (contadas) | A5: cada cenário → recusa com a via certa; mutação: `current_user` só numa metade → o cenário daquela metade PASSA → VERMELHO | §4 (xii) refeito com papel limpo sem a view: orig 1/1/1; mutA 0 (v3_mbyp); mutP 0 (v3_mown); mutV 0 (v3_viewer); portas 3/3; §6 re-confirmado | **incorporado** |
| **F8** (r1→r2 parcial) | ajuste | papel pré-existente que o migrador não-super não criou → `permission denied to alter role` cru (e com a senha no CONTEXT) | **MODO 4**: antes de alterar, o script exige `me.rolsuper ∨ pg_has_role(current_user, <papel>, 'MEMBER WITH ADMIN OPTION')`; falha nomeada com o remédio (`GRANT <papel> TO <migrador> WITH ADMIN OPTION` pela credencial que o criou, ou outro nome) — §4.1, §11 | A17 (iv-d): `ec=3` + mensagem MODO 4 + senha 0/0; após o GRANT → `ec=0`; mutação: tirar a pré-checagem → volta o erro cru → VERMELHO | §4 (iv-d), §6 re-confirmado | **incorporado** |
| N2-01 | nota | o `sed` colado no §R.5 da v2 casa 0 vezes | Texto trocado pela medição com a âncora que casa (`"production" ? "unavailable" : "noop"`): head → `production unavailable`; mutante → `production noop`; precedente 13/13 sob o mutante — §7 A8 (evidência) | A8/T2 inalterados em mecanismo | §5 N2-01 | **incorporado** |
| N2-02 | nota | "morre no Redis aos ~18 s" é falso: falha aos ~7 s e **não** morre; T15 fica vermelho por timeout | §1 fluxo 1, H5, A20, §12 R12 reescritos com o medido (`Failed to start` com `RedisCommandError` aos **7,5 s**; processo **não sai** — `ec=124` aos 40 s); T15 passa a assertar **duas** coisas: `exit 1 ≤ 15 s` **e** a primeira `Failed to start` com `RUNTIME_ROLE_CAN_BYPASS_RLS`; o vermelho-controle do head-base é "não sai em 30 s" — §7 A20, §8 T15 | A20: mutação "apagar a chamada em `main()`" → o filho **não sai** (timeout) e a 1.ª linha traz `RedisCommandError` → VERMELHO por **dois** motivos declarados | §5 N2-02 (boot real: 7,5 s; ec=124; órfãos mortos pelo caminho ancorado) | **incorporado** |
| N2-03 | nota | sem `.gitattributes`, `core.autocrlf=true` produz `.sh` CRLF que quebra o bash do contêiner | `.gitattributes` (novo, **1 linha**: `scripts/db-runtime-role.sh text eol=lf`) entra no PERMITIDO nominalmente — §5, §6; junta C1 confere `git ls-files --eol` | A22: `git -c core.autocrlf=true` checkout do head → `w/lf`; mutação: sem a linha → `w/crlf` e `bash` quebra (l.81, ec=2) | §5 N2-03 (73 CR → 0; ec=2) | **incorporado** |
| N2-04 | nota | A19 conta linhas (≥6) e o §13 nomeia 5 IDs | A19 passa a contar **IDs distintos** (`rg -o 'P-SAN3-05-[A-Z0-9-]+' | sort -u`) = exatamente os do §13 (**6** nesta v3) e um `rg` por ID | A19; mutação: omitir um ID → contagem ≠ 6 → VERMELHO | — (documental; §13 desta v3) | **incorporado** |
| N2-05 | nota | o CD de staging (hoje `skipped`) sobe com a trava ativa no dia em que for ligado | §11 ganha o passo 0: `STAGING_DEPLOY_ENABLED` **continua desligado** até os Atos 1–2 de staging; registrado em `docs/deployment.md` e em `pendencias.md` (o workflow é PROIBIDO: a amarração é procedimental, declarada) | A18: `rg -n 'STAGING_DEPLOY_ENABLED' docs/deployment.md` ≥ 1 na seção do papel | — (documental) | **incorporado** |
| N2-06 | nota | "as **três** suítes `-db` novas"; eram duas | Contagem corrigida: **duas** suítes `-db` novas (`san3-05-runtime-role-guard-db`, `san3-05-leituras-de-plataforma-db`) + duas sem banco — §8 | — | — | **incorporado** |

**O que a v3 NÃO responde com mecanismo, dito por escrito (motivo em §13):** o residual **semântico** do ratchet (envoltório confiado que não sete GUC; `tenantId` errado) — só a suíte `-db` inteira sob papel real o fecha (`B-ARNES-2`); a leitura por `/proc/<pid>/environ` da senha enquanto o `psql` roda (mesma classe de `PGPASSWORD`; declarada no cabeçalho do script); e o CD de staging, cuja amarração é procedimental porque `.github/workflows/**` é PROIBIDO.

## §0 — Terreno e linha de base (v3)

### 0.1 Referências — resolvidas, não digitadas (relatório §0)
`git rev-parse HEAD` do ramo no início = `9a808491` (depois os commits desta v3); `origin/main` = `5bcdcc58fda793dd6e5ffc12f2d0709bef3f222d`; merge-base = `5b6e103638f398d6074eecc5daebdf2d3bcd2252`. Árvores `src/tests/scripts/prisma` idênticas entre `5b6e1036`, `3b1fe0f9` e `origin/main` (quatro `git rev-parse <ref>:<dir>` iguais). Portanto **toda linha de código citada aqui com número de linha é a de `origin/main`**, e o inventário do Apêndice A é o do `origin/main`.

### 0.2 A máquina de medição (relatório §0, §1)
Nuvem Linux (`6.18.44-fc-v51`), Node **20.20.0** (`/opt/node20`), Postgres **16.14** descartável próprio (`pg_ctl`, porta **54371** provada pela conexão), `npm ci` (222 pacotes) + `prisma generate` no checkout e num worktree descartável (`/home/user/wt-plan-v3`, próprio `npm ci`, sem symlink — §C7.1-ter(c)). Sem Docker. **Toda premissa de banco foi medida sob papel `NOSUPERUSER NOBYPASSRLS` real** (Apêndice B re-executado: 22/22; trava v3 sob 13 papéis; script v3 em 18 cenários; diferencial HTTP sob papel efêmero do arnês).

### 0.3 Premissas, uma a uma — com a proveniência de cada medição
| # | Premissa | Estado | Onde foi medida |
|---|---|---|---|
| P-a | nada no repo impõe `NOSUPERUSER NOBYPASSRLS` ao runtime | **MEDIDO** — 8 linhas, 1 executável (`login-readiness.ts:202`, sonda do dono da função, não do papel) | relatório §7 (v3) |
| P-b | compose conecta como `postgres` (l.35, 57) | **MEDIDO** — 2 | §7 (v3) |
| P-c | dev/CI rodam como `postgres` | **MEDIDO** — `postgres\|t\|t` no cluster; `ci.yml` `postgresql://postgres:postgres@localhost` | §1 (v3) |
| P-d | papel real da produção é segredo do Fly | **HIPÓTESE** por construção (H2) | — |
| P-f | 106 FORCE = ENABLE; 115 tabelas; 9 sem FORCE (`_prisma_migrations, cloud_charge_calculation_runs, cloud_charge_rules, cloud_cost_allocation_runs, cloud_cost_imports, cloud_cost_line_items, permissions, role_permissions, tenants`); **0 views** | **MEDIDO** — 115/106/0 no cluster; gerador L0 106/106 | §1, §3 (v3) |
| P-g | política `tenant_id = current_setting('app.current_tenant_id', true)` | **MEDIDO** — Apêndice B P6 `42501` e P1–P4 `0` | §4 (v3, Apêndice B 22/22) |
| P-h | item 10: leituras de plataforma = 0 sob papel limpo; remédio por tenant funciona no mesmo papel | **MEDIDO** — 22/22 (repositório) **e** 50 × vazio (HTTP, janela 2001) | §4, §7 (v3) |
| P-i | a consulta do §5.2 (`rolname = current_user`) basta | **FALSA** — cega a pertença (G4c), posse (F5), `session_user` (F13), REPLICATION/servidor/view (F2-05) | §4 (v3): trava v3 sob 13 papéis |
| P-j | migrador e app podem ser papéis distintos sem tocar a pipeline | **MEDIDO pela r2** (`deploy-production.yml:136-138,162-164` × `fly.production.toml:9`); não re-medido nesta v3 (texto do workflow não mudou: árvore idêntica) | r2 §4 |
| P-k | o app só precisa de DML + USAGE | **MEDIDO** — script v3 (i'): 115/115 com só DML; Apêndice B R1 = 5 | §4 (v3) |
| P-l | `ALTER DEFAULT PRIVILEGES` cobre tabelas futuras do migrador nomeado, no mesmo banco | **MEDIDO** — (v): `t\|t` | §4 (v3) |
| P-m | nenhum ramo em voo toca a fronteira | **MEDIDO pela v2/r2** (laço sobre refs remotas); não re-medido | v2 §0.3 |
| P-n | suítes que exigem catálogo/DDL | **MEDIDO** — **13 + 8** (10 com os 2 `tests/helpers/*`; erratas no relatório §7) | §7, §8 (v3) |
| P-p | origem antecede o bloco (`f4ef511` é a raiz; migrações 202606xx) | **MEDIDO pela v2/r1**; não re-medido | v2 §0.3 |
| P-q/P-r/P-s | posse só reportada / `current_user` basta / SQL roda | **FALSAS** (r1), substituídas e re-medidas | §4 (v3) |
| **P-t** (nova) | a análise estática por NOME/TEXTO enuncia "default negar" | **FALSA** — 9/9 formas verdes no gerador v2 reproduzidas | §2 (v3) |
| **P-u** (nova) | a senha "nunca ecoada" do script v2 | **FALSA** — 1/1/1 (terminal, server.log, argv) | §2-bis (v3) |
| **P-v** (nova) | o boot "morre no Redis aos ~18 s" | **FALSA** — `Failed to start` aos 7,5 s e o processo **não sai** (ec=124 aos 40 s) | §5 (v3) |

### 0.4 O inventário — gerado da fonte pelo gerador **v3 (semântico)** — 53 chaves (Apêndice A)
Cabeçalho no `origin/main`: `L1 = 720` (578 pelo tipo, 28 pela sintaxe, 104 RAW literais, 10 RAW opacos) · `L2 = 452` instanciações em 72 classes injetadas (2 rodadas) · **inventário suspeito 53 chaves, sha1 `5c566532986c533416e880e70350fb5ea692f9e2`**. Classificação v3 (default NEGAR, agora por **declaração do símbolo**): só `SOB-CONTEXTO` (parâmetro de callback de envoltório **confiado pelo símbolo** — `withTenantRls`/`forEachTenantRls` de `rls.ts`, `forEachTenantInOneTx` privado da alocação — ou `$transaction` com o setter como **primeira instrução, no mesmo `tx`**) e `INJETADO` resolvido em L2 ficam fora. Tudo o mais entra: `CRU`, `PARAMETRO(x)`, `$TRANSACTION-SEM-SETTER-PROVADO`, `CAMPO-INICIALIZADO:*`, `CAMPO-ATRIBUIDO:*`, `CAMPO-NAO-RASTREADO`, `INJETADO-TRANSITIVO:*`, `TIPO-DESCONHECIDO`, `OUTRO(...)`.

**A lista fechada do REMÉDIO (item 10) — os mesmos 7 sítios da v1/v2** (linha, método, tabela conferidos pela r1 e reproduzidos pelo gerador v3): `cloud-usage-prisma.repository.ts:61,120` via `:173,197` (ramos sem `tenantId` — no inventário v3: `new PrismaCloudUsageRepository(this.prismaClient) INJETADO-TRANSITIVO:SUSPEITO-ACIMA` ×2 e `new RlsPrismaCloudUsageRepository(prisma) CRU`); `cloud-charge-prisma.repository.ts:167,171,202,220` via a fábrica `:240` (`new PrismaCloudChargeRepository(prisma) CRU`); `cloud-cost-allocation-prisma.repository.ts:238` via `:413` (**FORA**, sem chamador em `src`, congelado nominalmente — §13).

**O que está no congelado e NÃO é vazamento — por leitura, para a junta C3 conferir o critério:** os **6** `$TRANSACTION-SEM-SETTER-PROVADO` (`identity-link.service.ts:323,362,412` — setter de identidade chamado **depois** de outra instrução; `prisma-core-saas.service.ts:368`; `work-order-prisma.repository.ts:525,541` — `assign` chamado **dentro** de `withTenantRls` em `:669`) — a v2 absolvia quatro deles por **regex de texto**; a v3 os congela com nota. Os **22+20** `PARAMETRO` (helpers que recebem `tx`/`client`; o runner injetado `runWithTenantContext`, cujo default em `local-auth-login.service.ts:106` é `work()` sem GUC — só em `auth-runtime.ts:82` vira `withTenantRls`). `CRU` L1 = 1 (`health.routes.ts:115`, `SELECT 1`-like opaco). `CRU` L2 = 7 (4 fábricas sem argumento de `prisma-core-saas.store.ts` — campos sem chamada; as 2 fábricas cruas de nuvem — **sítios 3–7**; `new RlsPrismaCloudUsageRepository(prisma)` — o **envoltório** recebe o client raiz por desenho, correto).

**Residual DECLARADO POR CONSTRUÇÃO do gerador v3 (não é "forma que escapa", é o que a análise estática não pode decidir):** (i) a **semântica** do contexto — um envoltório confiado que não sete o GUC, um `tenantId` errado, um `tx` reutilizado após o fim da transação; (ii) código fora de `src/**` e acesso ao banco fora do Prisma; (iii) SQL cru que não cite a tabela é **OPACO → suspeito** (está no inventário, não no residual). As formas que a r1 e a r2 chamaram de residual (acessor dinâmico, `Object.values`, alias, namespace, subclasse, setter condicional/comentado/no client errado) **são vistas** — ou pelo tipo (`strict` torna `prisma[nome]` erro de compilação; `any` vira `TIPO-DESCONHECIDO`), ou pelo símbolo, ou pela AST do setter.

### 0.5 A medição sob papel real — 22 itens, 0 fora do esperado (Apêndice B re-executado; relatório §4) + o diferencial HTTP (§7: 50 × vazio)

### 0.6 HIPÓTESES — o que NÃO foi medido aqui, com o comando que derruba
| id | Hipótese | Por quê | Comando |
|---|---|---|---|
| H1 | o `.sh` em `/docker-entrypoint-initdb.d/` roda na 1.ª subida do volume, **no banco da app**, antes do `migrate` | sem Docker | `docker compose -f docker-compose.prod.yml down -v && … up -d postgres && … exec postgres psql -U postgres -d erp_techsolutions -Atc "SELECT rolname, rolsuper, rolbypassrls, rolreplication FROM pg_roles WHERE rolname='erp_runtime'; SELECT defaclrole::regrole, defaclobjtype FROM pg_default_acl"` → `erp_runtime\|f\|f\|f` + `postgres\|r`, `postgres\|S`; job `docker` da CI verde no head |
| H2 | o papel de produção hoje escapa (ou não) | segredo do Fly | pelo dono: `psql "$DATABASE_URL" -Atf <trava v3>` (0 linhas = passa) |
| H3 | em produção o migrador é dono das 106 FORCE e o app não é dono/membro do dono | idem | **a trava mede** no boot (`posse/<dono>`); antes, a linha final do script (`posse = 0`) |
| H4 | o smoke de contêiner só exige DML + USAGE | sem Docker | job `docker` no head: `42501` no passo "grava organização" se faltar |
| H5 | boot recusado no Fly vira restart em laço | sem ambiente | `fly logs` com `RUNTIME_ROLE_CAN_BYPASS_RLS`; localmente o T15 mede: `exit 1` ≤ 15 s (hoje: `Failed to start` aos 7,5 s **sem sair** — §5 do relatório) |
| H6 | `deploy-manifest-parity` segue 28/28 com a chave opcional | consequência de E2 | `node --test --import tsx tests/deploy-manifest-parity.test.ts` → **28/28 medido por mim no head** (Node 20.20.0, relatório §10); no head da entrega tem de continuar 28/28 |
| H7 | `psql` 16 no PATH do job `backend` | o README da imagem 24.04 lista PostgreSQL 16.15 (**medido**: relatório §1); o PATH não | `which psql` no job — o T14b imprime e **falha** nomeando se faltar |
| H8 | `pg_has_role(current_user, <papel>, 'MEMBER WITH ADMIN OPTION')` é verdadeiro para o criador no gerenciado (PG16) | medido só no 16.14 local (`t`) | o próprio script: MODO 4 na 2.ª execução pelo mesmo executor derruba |
| H7-a | o job `cloud-usage.aggregate-daily` sob papel efêmero agrega **0** linhas hoje (T11b, vermelho-controle) | **ninguém mediu** na superfície do job; a base (Apêndice B P2 = 0) foi re-executada por mim | o T11b no head-base, colado na ata pelo dev e conferido pela junta C3 |
| H7-b | `POST /platform/cloud-charges/calculation-runs` sob papel efêmero grava **0** cobranças / `42501` e `GET …/tenant-charges` devolve **0** hoje (T11c, vermelho-controle) | **ninguém mediu** na superfície HTTP; a base (Apêndice B P3/P4/P6) foi re-executada por mim | o T11c no head-base, colado na ata pelo dev e conferido pela junta C3 |

## §1 — Objetivo · ator · fluxo · contrato

**Objetivo.** Fechar os itens 9 e 10 do gate vendável (`PLANO_SAN3.md` §4.1) com **mecanismo**: (9) o processo da API **só sobe em produção** se a identidade com que fala ao banco **não puder escapar de RLS** por **nenhuma das três vias medidas** — *atributo* (`rolsuper`, `rolbypassrls`, `rolreplication`, pertença a `pg_execute_server_program`/`pg_read_server_files`/`pg_write_server_files`, direta ou por cadeia), *posse* (dono, ou membro do dono, de tabela `FORCE RLS`) e *view* (SELECT em view/matview de dono que escapa sobre tabela `FORCE`) — avaliadas para `session_user` **e** `current_user`; e existe um **procedimento versionado, executado em 18 cenários**, que cria esse papel sem **nunca** expor a senha (compose local-prod e banco gerenciado, inclusive com migrador não-superusuário, com **seis modos de falha nomeados**); (10) as leituras e escritas de plataforma sobre tabelas `FORCE` rodam **por organização, sob o contexto dela**, e somam — guardadas **dinamicamente** por um diferencial superusuário × papel sem bypass em **toda** a superfície fechada de plataforma (§2.3) e **estaticamente** por um ratchet semântico de forma (§2.2(c)).

**Ator.** Infraestrutura de segurança; os papéis de plataforma (`platform_admin`, `platform:cloud-usage:read`, `platform:cloud-charges:*`) **veem** o efeito do item 10; o **dono** pratica o ato do §11.

**Fluxo origem → destino.**
1. `node dist/server.js` → `main()` → **[NOVO] trava do papel** (E1; `session_user ∧ current_user`; atributo ∨ posse ∨ view) → `createCoreSaasService()` → … → `listen`. Recusa ⇒ exceção nomeada **antes** de qualquer handle, `$disconnect`, `exitCode = 1` e **saída do processo em segundos**. **Medido hoje** (relatório §5): sob superusuário e `REDIS_URL` inalcançável, a 1.ª linha `Failed to start` (`RedisCommandError`) sai aos **7,5 s** e o processo **não termina** (`ec=124` aos 40 s). A fiação é medida pelo T15 com **dois** sinais (§7 A20).
2. `GET /platform/cloud-usage/summary` → `summarizeEvents` → `listEvents({sem tenant})` → **[NOVO] laço por organização sob contexto** → soma reordenada; idem o job `cloud-usage.aggregate-daily` (`aggregateDailyUsage`) e `listDailyAggregates`.
3. `POST /platform/cloud-charges/calculation-runs` → `executeCalculationRun` → `listAllocationTenantAllocations` **[por tenant]** → cálculo → `replaceTenantCharges` **[por tenant, uma transação]**; `GET …/summary` e `GET …/:runId/tenant-charges` → `listTenantCharges` **[por tenant]**.
4. Compose local-prod: `postgres` (init executa `scripts/db-runtime-role.sh` → `erp_runtime` **no banco da app**) → `migrate` (`postgres`) → `api` (`erp_runtime`, `NODE_ENV=production` ⇒ trava ativa) → smoke da CI (H1/H4).
5. Produção: o dono roda o script no gerenciado com a credencial do migrador (**falha nomeando o MODO**, nunca com a senha), troca o secret `DATABASE_URL`, faz deploy; a trava é a prova (§11).

**Contrato.** Nenhuma rota, payload ou código HTTP muda. Semântica sob papel sem bypass: `GET /platform/cloud-usage/summary` e `…/tenants/:id/daily`, `GET /platform/cloud-charges/summary`, `GET …/calculation-runs/:id/tenant-charges`, `POST …/calculation-runs` e o job diário passam a devolver/gravar os números reais (hoje: `50` × `[]` no mesmo seed — relatório §7). Boot: nova recusa em produção `RUNTIME_ROLE_CAN_BYPASS_RLS` com **razões** no log (`via`: `atributo` | `posse` | `view`; `rolname`; `is_self`; `objetos`). Env: chave nova **opcional** `DATABASE_RUNTIME_ROLE_GUARD` = `enforce` | `skip` (E2). `/health/*` **não muda**.

## §2 — Onde mora a propriedade — respondido pela terceira vez, de outro jeito

### 2.1 Pelo ENUNCIADO

- **(a) Identidade.** *A identidade com que a API fala ao banco em produção não consegue ler ou gravar linha de tabela `FORCE RLS` sem o GUC do tenant — nem com um comando a mais.* Em PostgreSQL 16, as vias **medidas** (relatório §4, portas provadas reais) são três, para os **dois** nomes da sessão:
  `¬∃ r ∈ pg_roles : (r.rolsuper ∨ r.rolbypassrls ∨ r.rolreplication ∨ r.rolname ∈ {pg_execute_server_program, pg_read_server_files, pg_write_server_files}) ∧ (pg_has_role(session_user, r, 'MEMBER') ∨ pg_has_role(current_user, r, 'MEMBER'))`
  **∧** `¬∃ c ∈ pg_class : c.relforcerowsecurity ∧ (pg_has_role(session_user, c.relowner, 'MEMBER') ∨ pg_has_role(current_user, c.relowner, 'MEMBER'))`
  **∧** `¬∃ v ∈ pg_class (relkind ∈ {v,m}) : dono(v) é (rolsuper ∨ rolbypassrls) ∧ v depende (pg_rewrite/pg_depend) de tabela FORCE ∧ (has_table_privilege(session_user, v, 'SELECT') ∨ has_table_privilege(current_user, v, 'SELECT'))`.
  Por que cada termo está lá (uma porta medida por termo): `SET ROLE <bypass>` → 3 linhas (G4b); `ALTER TABLE … NO FORCE` pelo membro do dono → 2 linhas; `options=-c role=` com login super → `SET ROLE NONE` → linhas (F13); `COPY … FROM PROGRAM` pelo membro de `pg_execute_server_program` → `a,b,segredo-tenant-b-v3`; `pg_basebackup` pelo `REPLICATION` → `base.tar` com o marcador do tenant B; `SELECT count(*) FROM v_rel` (view do super) → 3 enquanto a tabela dá 0. **Fora, declarado:** funções `SECURITY DEFINER` de dono que escapa (pendência `P-SAN3-05-SECURITY-DEFINER-INVENTARIO`); `pg_read_all_data` **não** escapa pela tabela (count → 0) — mas **lê a view do super**, e por isso a via `view` o pega; `GRANT … WITH SET FALSE` é falso positivo **seguro** (N1).
- **(b) Contexto.** *Todo acesso a tabela `FORCE RLS` que precise de linhas de N organizações roda N vezes, cada uma sob o GUC da organização.* Hoje sete sítios violam isso em silêncio (`0` linhas, `ec=0`; só a escrita grita — P6), e na superfície: **50 × vazio** (§7 do relatório).
- **(c) A lição das duas rodadas — onde a propriedade do item 10 PODE e onde NÃO PODE ser enunciada.** v1 e v2 tentaram enunciar (b) **estaticamente** e a crítica derrubou as duas pela mesma razão: análise estática reconhece **formas**; uma forma nova sempre escapa. A v3 **não repete a promessa**. Estaticamente entrega um **ratchet semântico** (2.2(c)) com alcance declarado **por construção** (tipo e símbolo, não nome e texto), provado contra as 26 formas que derrubaram v1 e v2. **A propriedade se enuncia dinamicamente**, sobre uma superfície **fechada e enumerada da fonte** (2.3): para cada rota de plataforma e job que toque tabela `FORCE`, *o corpo devolvido (ou o efeito gravado) sob papel `NOSUPERUSER NOBYPASSRLS` é igual ao devolvido sob superusuário, com o mesmo seed*. Isso **é** o item 10 — "o resumo de uso e o Cloud Billing não zeram" — e é falsificável sem enumerar formas: qualquer sítio cru **alcançável por essa superfície**, escrito de qualquer jeito, zera algo e fica vermelho. O que fica fora dessa superfície (sítio cru num módulo de organização) não é vazamento de plataforma: é regressão funcional daquele módulo sob papel sem bypass, invisível a toda suíte que rode como `postgres` — a classe que **só** `B-ARNES-2` fecha (§13).

### 2.2 Pelo REMÉDIO — cada metade mora num arquivo, e só num

**(a) → `src/database/runtime-role.ts` + `src/database/runtime-role.bootstrap.ts` + 1 linha em `src/server.ts` + gate em `src/config/env.ts`.** `RUNTIME_ROLE_GUARD_SQL` é a constante **única**, byte a byte o Apêndice E (md5 `36650de53be8504c76deef74ecc78811`; **8** ocorrências de `session_user` — a junta confere o md5). `probeRuntimeRolePosture(client)` → `{ sessionUser, currentUser, escapes }`; `assertRuntimeRolePosture` lança `RuntimeRoleGuardError` (`code = "RUNTIME_ROLE_CAN_BYPASS_RLS"`, `escapes` com `{via, rolname, rolsuper, rolbypassrls, is_self, objetos}`) se `escapes.length > 0` — **qualquer via recusa**. `assertRuntimeDatabaseRoleIfEnforced({ enforce, logger, loadClient, attempts = 5, backoffMs = 2000 })` (padrão `job-worker.bootstrap.ts`): com `enforce`, abre o client, sonda (retry só para erro de **conexão**), loga `info {session_user, current_user, escapes: 0}` **sem URL/senha/host**; recusa → `error` com as `escapes`, `await client.$disconnect()`, lança. Sem `enforce` → `{enforced:false}` + 1 linha `info` (nunca mudo). `src/server.ts main()`: **primeira** instrução `await assertRuntimeDatabaseRoleIfEnforced({ logger })` — antes de `createCoreSaasService()`. Gate `G-DB-ROLE` em `env.ts`: `DATABASE_RUNTIME_ROLE_GUARD: z.enum(["enforce","skip"]).optional()`; default no **export**, espelhando a **forma** de `EVIDENCE_SCANNER` (l.637-638: `parsedEnv.X ?? (parsedEnv.NODE_ENV === "production" ? … : …)`): `production` → `"enforce"`, demais → `"skip"`; `superRefine`: `production ∧ skip` → issue nomeando `P-INFRA-RLS`. O default do export é medido por **processo filho** (T2 — mecanismo re-medido no relatório §5: head → `production unavailable`; mutante → `production noop`; o precedente **não** vê, 13/13).

**(b) → `src/database/rls.ts` (o laço) + os dois repositórios de nuvem.** `forEachTenantRls(client, tenantIds, work)`: **uma** transação, `setTenantRlsContext(tx, id)` **como primeira instrução de cada volta** (a forma que o gerador v3 reconhece — e por isso `forEachTenantRls` está nos WRAPPERS confiados **pelo símbolo** declarado em `rls.ts`), `work(tx, id)`, concatenação na ordem de `tenantIds`; `assertRowsBelongToTenant(rows, tenantId, table)` — o canário. `RlsPrismaCloudUsageRepository`: os ramos sem `tenantId` (l.166-174, 190-198) passam a `ids = tenant.findMany({select:{id}})` → `forEachTenantRls(ids, (tx, id) => new PrismaCloudUsageRepository(tx).listEvents({...f, tenantId: id}))` + canário + **reordenação** por `occurredAt asc` (semente intercalada, F12); `listDailyAggregates` idem por `date asc`. `cloud-charge-prisma.repository.ts`: nasce `RlsPrismaCloudChargeRepository implements CloudChargeRepository` (delegando ao cru só o que toca tabela **sem** RLS), reescrevendo `replaceTenantCharges` (todos os tenants; `deleteMany` + `create` por volta; **uma** transação — B7/B8), `listTenantCharges` (por tenant + canário, `createdAt asc`), `listAllocationTenantAllocations` (por tenant + canário, sem `take` global — decisão declarada, R10); `createPrismaCloudChargeRepository()` devolve o envoltório (tipo de retorno = a interface). **Consequência no ratchet:** as chaves `new PrismaCloudUsageRepository(this.prismaClient) INJETADO-TRANSITIVO…` ×2 e `new PrismaCloudChargeRepository(prisma) CRU` **somem** do inventário no head da entrega, e nascem `new PrismaCloudUsageRepository(tx) SOB-CONTEXTO`/`new PrismaCloudChargeRepository(tx) SOB-CONTEXTO` (não suspeitas) — o congelado do T13 é atualizado **com uma linha de motivo por chave sumida**, que é o ato consciente que o ratchet existe para exigir.

**(c) → `scripts/san3-05-acessos-de-plataforma.mjs` (gerador v3, Apêndice A, md5 `81d9259571391eded68255391a99fb61`) + `tests/san3-05-acessos-de-plataforma-guard.test.ts` (T13).** O que o gerador **vê por construção**: todo `CallExpression` cuja assinatura resolvida (ou o tipo da expressão receptora) é método de uma interface `<Model>Delegate` do client gerado cujo `@@map` é tabela FORCE; todo `$queryRaw*/$executeRaw*`; toda `new` cuja classe (pelo **tipo**, seguindo aliases, namespaces, `await import` desestruturado e herança pelo símbolo da base) tem campo injetado — inclusive classes que só **repassam** o campo (lista de trabalho). O que o gerador **confia**: só o parâmetro de callback de `withTenantRls`/`forEachTenantRls` (símbolo de `rls.ts`) e `forEachTenantInOneTx` (símbolo de `cloud-cost-allocation-prisma.repository.ts`), e o `tx` de `$transaction` cuja **primeira** instrução é `await setTenantRlsContext(tx, …)` (símbolos conferidos). Tudo o mais é suspeito. **Alcance declarado para a junta C3 (§10):** forma que o jurado escreva em `src/**`, tipada (o `npm run check` é `strict`), que leia/grave tabela FORCE por Prisma e que o ratchet **não** ponha no inventário → **defeito do gerador, reprova** (`dentro-do-bloco`); forma fora disso (acesso fora do Prisma, código fora de `src`, semântica de contexto) → pendência `B-ARNES-2`, **não reprova** — e o T11a–d decide o que esse residual significa na superfície de plataforma.

### 2.3 A superfície FECHADA de plataforma (enumerada da fonte — relatório §7) e o diferencial que enuncia a propriedade

| # | Superfície (montada sob `/api/v1/platform`, `app.ts:126`) | Tabela FORCE que toca | Hoje sob papel limpo | Teste |
|--:|---|---|---|---|
| S1 | `GET /cloud-usage/summary` (`listEvents` sem tenant) | `cloud_usage_events` | `metrics: []` (medido: 50 × vazio) | **T11a** |
| S2 | job `cloud-usage.aggregate-daily` (`aggregateDailyUsage` → `listEvents` sem tenant → grava `cloud_usage_daily_aggregates`) | ambas | agrega 0 (H7-a; mesma classe de P1/P2) | **T11b** |
| S3 | `POST /cloud-charges/calculation-runs` (`executeCalculationRun`: `listAllocationTenantAllocations` + `replaceTenantCharges`) · `GET …/:runId/tenant-charges` · `GET /cloud-charges/summary` (`listTenantCharges`) | `tenant_cloud_cost_allocations`, `tenant_cloud_charges` | 0 cobranças / `42501` (P3, P4, P6) | **T11c** |
| S4 | **controles** (já por tenant no head-base): `GET /cloud-cost-allocations/runs/:runId/tenant-allocations` (B-O6R-06), `GET /overview` (`platform-overview-prisma.repository.ts` l.14-41), `GET /cloud-usage/tenants/:id/{summary,daily}` | várias | **iguais** sob os dois papéis **hoje** — provam que o diferencial não é cego nem sempre-vermelho | **T11d** |
| — | fora da superfície: `/cloud-charge-rules*`, `/cloud-charges/calculation-runs` (GET), `/cloud-costs/*`, `/tenants*`, `/cloud-cost-allocations/runs` (GET/POST), `/summary` do rateio | tabelas **sem** FORCE (P-f) ou leitura por tenant | — | não entram (enumeração da fonte: colar na ata o `grep` das rotas) |

**T11a–d é o guard da propriedade do item 10** — não "de uma rota": é a superfície inteira que toca FORCE, enumerada da fonte; a enumeração vai para a ata (C3) e **muda só por PR que mude as rotas** (o próprio T11d falha se uma rota nova sob `/platform` tocar FORCE e não estiver na lista — ver A12).

## §3 — Entregas

| E | Entrega | Arquivos | Fecha |
|---|---|---|---|
| E1 | Trava de boot **v3**: sonda (`RUNTIME_ROLE_GUARD_SQL` = Apêndice E — atributo ∨ posse ∨ view, `session_user ∧ current_user`) + asserção com **razões** + bootstrap + chamada em `main()` medida pelo T15 | `src/database/runtime-role.ts` (novo), `src/database/runtime-role.bootstrap.ts` (novo), `src/server.ts` (1 linha + import) | item 9 (mecanismo) |
| E2 | Gate `G-DB-ROLE`: chave `DATABASE_RUNTIME_ROLE_GUARD`, default por ambiente no export (medido por processo filho, T2), recusa de `skip` em produção | `src/config/env.ts` | item 9 (não afrouxável) |
| E3 | Laço por organização sob contexto + canário no lar único; os cinco métodos passam a usá-lo; concatenação reordenada | `src/database/rls.ts`, `src/modules/cloud-usage/cloud-usage-prisma.repository.ts`, `src/modules/cloud-charges/cloud-charge-prisma.repository.ts` | item 10 |
| E4 | Procedimento do papel **v3** (Apêndice C, verbatim, md5 `810c1c4a2552665d4947bf0ef4e93670`, modo `100755`, **eol=lf** via `.gitattributes`): seis modos nomeados, senha nunca exposta, idempotente | `scripts/db-runtime-role.sh` (novo), `.gitattributes` (novo, 1 linha), `docker-compose.prod.yml` | item 9 (procedimento) + §4.2 do PLANO_SAN3 |
| E5 | Documentação: seção "Papel de banco de runtime" (três vias, seis modos, pré-requisito `psql` da suíte `-db`, `STAGING_DEPLOY_ENABLED` amarrado aos Atos 1–2), linha `G-DB-ROLE` nos gates, l.458 trocada, runbook B-O6R-01 passos 0/5 | `docs/deployment.md` | §4.2 (o que o dono lê) |
| E6 | Ratchet **semântico** (CE-G1): gerador v3 versionado + T13 que o executa com as **26 fixtures** (virtuais) + "sumida" e compara o inventário com o congelado (chave a chave, motivo por chave) | `scripts/san3-05-acessos-de-plataforma.mjs` (novo, = Apêndice A), `tests/san3-05-acessos-de-plataforma-guard.test.ts` (novo), `tests/fixtures/san3-05-mutacoes/*.ts` (26 novos, = Apêndice D) | item 10 (não regride por forma dentro do alcance declarado) |
| E7 | Testes T1–T16 (§8): diferencial da **superfície fechada** (T11a–d), boot real (T15), script em 18 cenários sem vazamento (T14), trava sob 13 papéis + semi-mutantes (T6–T8d) | `tests/production-runtime-gates.test.ts` (+ casos), `tests/san3-05-runtime-role-guard-db.test.ts` (novo), `tests/san3-05-leituras-de-plataforma-db.test.ts` (novo), `tests/san3-05-runtime-role-bootstrap.test.ts` (novo), **`tests/db-catalog-write-guard.test.ts` (só a entrada da `FROZEN_ALLOWLIST`)** | DoD |
| E8 | KPI e registro no próprio PR (§9, §C3) + comando do bloco + pendências novas do §13 (seis) | `Kpis/*`, `agent-orchestration/codex/comandos/B-SAN3-05-runtime-role-sem-bypass.md` (novo), `agent-orchestration/controle/pendencias.md`, `agent-orchestration/docs/status-geral.md`, `agent-orchestration/codex/log-execucao.md` | §C3, §C6 |

O que **não** muda de propósito: `docker-compose.yml` (dev, `postgres`: as 13 suítes de catálogo precisam de `CREATEROLE` — P-n), `.github/workflows/ci.yml` (o job `docker` já roda o compose local-prod — é ele que prova E4/H1), `fly.*.toml` (chave nova não exigida; o segredo muda de **valor** — ato do dono), `prisma/**` (sem migração: o papel é objeto de **cluster** — `git grep -i -E 'CREATE ROLE|CREATE USER' origin/main -- prisma/migrations` → **0**, re-medido), `scripts/run-backend-tests.mjs` (o orçamento de pulos é um teto duro **por desenho**; esta v3 não pede pulo nenhum), `tests/helpers/auth-identity-fixture.ts` (o arnês não ganha função nova: as suítes escrevem catálogo **dentro** de `withRoleCatalogLock` importado dele, e registram-se na allowlist).

## §4 — Modelagem: o papel (script v3), a trava (v3) e o compose

### 4.1 Sem migração. O objeto novo é um PAPEL de cluster, criado por procedimento — v3, executado em 18 cenários (relatório §4, §6)

`scripts/db-runtime-role.sh` é o Apêndice C, **verbatim** (115 linhas, md5 `810c1c4a2552665d4947bf0ef4e93670`). O que mudou da v2 e por quê (cada peça com o cenário que a mede):
- **A senha nunca sai (F2-02).** (1) Entra no `psql` por `\set password \`printf '%s' "$DB_RUNTIME_PASSWORD"\`` — `printf` é builtin do `sh`: nenhum `exec`, nenhum argv (cenário viii: shim de `psql` → 0 ocorrências; nenhum `-v password=`). (2) Vai ao servidor **uma** vez, num `SELECT set_config('san3.password', …)` — statement que o PG16 só registra sob `log_statement=all` ou `log_min_duration_statement=0`; por isso o **MODO 0** lê os dois GUCs e **recusa antes de enviar** (ix: `ec=3`, 0 no log), salvo `DB_RUNTIME_ALLOW_LOG_ALL=1` — decisão consciente do dono, e aí a senha **vai** ao log (ix: 1 — exposição **declarada**, não escondida). (3) Dentro do `DO`, cada `EXECUTE` que carrega a senha fica em bloco `BEGIN … EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION '<mensagem sem senha> (% %)', SQLSTATE, SQLERRM; END` — o CONTEXT do erro re-emitido é "PL/pgSQL function inline_code_block line N at RAISE", **sem o SQL dinâmico** (vii: MODO 1 → 0 no terminal, 0 no `server.log`). (4) A senha é definida **por último**, depois de tudo o que podia falhar; o `CREATE ROLE` nasce **sem** senha. (5) Residual declarado: `/proc/<pid>/environ` do `psql` (mesma classe de `PGPASSWORD`; só o mesmo usuário/root lê).
- **Seis modos de falha, todos nomeados na mensagem (F8, F2-04, F2-05):** MODO 1 (sem `CREATEROLE` — decisão de provedor) · MODO 2 (atributo `SUPERUSER|BYPASSRLS|REPLICATION|CREATEDB|CREATEROLE` que o executor não pode tirar; nomeia o atributo e o privilégio que faltou) · MODO 3 (tabela/sequência alheia em `public`, ou POSSE de tabela FORCE → `ALTER … OWNER TO <migrador>`) · **MODO 4** (papel já existe e o executor não tem `ADMIN OPTION` — pré-checagem `me.rolsuper ∨ pg_has_role(current_user, v_role, 'MEMBER WITH ADMIN OPTION')`; remédio: `GRANT <papel> TO <migrador> WITH ADMIN OPTION` pela credencial que o criou, ou outro nome; iv-d) · **MODO 5** (pertença que o executor não pode revogar; iv-e) · **MODO 6** (view de dono que escapa com SELECT para o papel; iii-e).
- **Pertença: o primeiro salto de toda cadeia (F2-04).** O laço itera `pg_auth_members WHERE member = alvo` e revoga o papel **direto** `m` sempre que `m` leva (por `pg_has_role(m, b, 'MEMBER')`) a papel que escapa (atributo, servidor) **ou** a dono de tabela FORCE — iii-c: cadeia `v3_bypass → v3_mid → erp_runtime` → `v3_mid` revogado, `v3_mid` segue membro de `v3_bypass` (não é nosso), escapa=f.
- **Atributos (F2-05):** `REPLICATION` corrigido (só superusuário pode) ou MODO 2; os três papéis de servidor entram no predicado de "escapa" do REVOKE e da verificação.
- **Verificação = a propriedade da trava v3 avaliada para o papel, com a VIA de cada linha** (`atributo:X, posse:Y, view:Z`) → `RAISE EXCEPTION` ⇒ `ec=3` ⇒ **ROLLBACK de tudo** (iii: `true|true|true|true`, membros=1 depois — nada persistiu).
- **Idempotência** (ii): 2.ª execução com **outra** senha → catálogo idêntico (`pg_roles`, `pg_default_acl`, `pg_auth_members`, `relacl` por `diff`); só o verificador SCRAM muda (prova de que a senha fluiu pelo backtick).
- **Linha final** (`-At`): `rolname|rolsuper|rolbypassrls|rolreplication|escapa|posse|views|dml` — ex.: `erp_rt5|f|f|f|f|0|0|115` (i': 115/115 DML no banco com as tabelas da app).
- **Sourcing seguro + CRLF (N3, N2-03):** corpo em função-subshell; **a falha propaga** (x: direto `ec=1`; via entrypoint exec `ec=1`; via `source` `ec=1` — o contêiner **morre**, fail-closed); modo `100755` + `.gitattributes` `scripts/db-runtime-role.sh text eol=lf` (sem ela, `core.autocrlf=true` → `w/crlf`, 73 CR, `bash` quebra na l.81).

**O que o procedimento NÃO faz, de propósito:** não concede `EXECUTE` em `auth_login_candidates(text)` (runbook B-O6R-01); não dá `CREATEROLE`/DDL/posse; não toca `pg_hba`; não reatribui posse; não revoga SELECT em view (diz o comando — MODO 6).

### 4.2 A trava (E1) — o SQL é o Apêndice E, e só ele; os 13 papéis + 4 cenários de `options=` medidos
Superusuário → recusa (`atributo … is_self`, 12 linhas: é membro de tudo); super com outro nome → recusa; papel limpo **sem** SELECT em view de dono que escapa → **passa** (0 linhas); membro de `BYPASSRLS` (direta, `NOINHERIT`, cadeia, `SET FALSE`) → `atributo/<bypass>`; membro do dono → `posse/<dono>/…/1`; dono direto → `posse/<self>/is_self=t`; `REPLICATION` → `atributo/<self>`; membro de `pg_execute_server_program` → `atributo/pg_execute_server_program`; SELECT em view do super → `view/postgres/t/t/f/1`; `pg_read_all_data` → passa pela tabela (count 0) mas **`view`** se houver view de dono que escapa; login não-super com `options=-c role=<limpo>` → recusa pela metade que o **login** aciona (`session_user`). Erro de conexão → 5 tentativas (2–32 s) e recusa. Log do veredito: `session_user`, `current_user`, `escapes` (`via, rolname, rolsuper, rolbypassrls, is_self, objetos`) — **nunca** URL/host/senha.

### 4.3 O compose (E4)
`postgres`: `environment` ganha `DB_RUNTIME_ROLE: erp_runtime`, `DB_RUNTIME_PASSWORD: local-prod-validation-db-runtime-not-a-secret`, `DB_MIGRATOR_ROLE: postgres`; `volumes` ganha `./scripts/db-runtime-role.sh:/docker-entrypoint-initdb.d/10-runtime-role.sh:ro` (H1). `migrate`: inalterado. `api`: `DATABASE_URL: postgresql://erp_runtime:local-prod-validation-db-runtime-not-a-secret@postgres:5432/erp_techsolutions?schema=public` (placeholder **rotulado**, mesma classe dos cinco secrets da l.62-68). Comentário: "volume já iniciado sem o papel ⇒ `down -v`". **Nota medida:** o migrador do compose é `postgres` (superusuário) — qualquer **view** futura criada por migração sobre tabela FORCE abriria a via `view` (0 views hoje; a trava recusaria o boot da `api`, e o job `docker` ficaria vermelho **de propósito**: é o MODO 6 aparecendo no smoke, não um defeito do smoke).

## §5 — Arquivos tocados e regra do espelho

| Arquivo | Ação | Módulo de referência (espelho) |
|---|---|---|
| `src/database/runtime-role.ts` | novo | `src/modules/auth/services/login-readiness.ts:196-206` (consulta a `pg_roles` com timeout; aqui sem "best-effort") |
| `src/database/runtime-role.bootstrap.ts` | novo | `src/infra/jobs/job-worker.bootstrap.ts` (injeção, log nunca mudo) |
| `src/server.ts` | +1 linha em `main()` + import | `src/server.ts:19` (`startJobWorkerIfEnabled`) |
| `src/config/env.ts` | +campo no schema, +gate no `superRefine`, +default no export | `EVIDENCE_SCANNER` (l.266, 546-551, 637-638) — a **forma**; o teste do default é o T2 (processo filho) |
| `src/database/rls.ts` | +`forEachTenantRls` (setter como **primeira** instrução de cada volta), +`assertRowsBelongToTenant` | `cloud-cost-allocation-prisma.repository.ts:340-368` (B-O6R-06) |
| `src/modules/cloud-usage/cloud-usage-prisma.repository.ts` | ramos sem tenant de `listEvents`/`listDailyAggregates` (l.166-174, 190-198) | `platform-overview-prisma.repository.ts` (l.14-41: `tenant.findMany` + N+1 sob contexto) |
| `src/modules/cloud-charges/cloud-charge-prisma.repository.ts` | +`RlsPrismaCloudChargeRepository`; fábrica l.238-241 devolve o envoltório | `RlsPrismaCloudUsageRepository` (l.142-204) |
| `scripts/db-runtime-role.sh` | novo, **= Apêndice C**, `100755` | `scripts/rbac-provision-drill.sh` (estilo); **não** no modo nem no `exit` (N3) |
| `.gitattributes` | novo, **1 linha**: `scripts/db-runtime-role.sh text eol=lf` | — (N2-03; medido: `w/crlf` → `w/lf`) |
| `scripts/san3-05-acessos-de-plataforma.mjs` | novo, **= Apêndice A** (gerador v3) | `scripts/audit-agents-skills.mjs` (varredura gerada) |
| `tests/fixtures/san3-05-mutacoes/*.ts` | **26** novos, **= Apêndice D** (17 da r1 + 9 da r2, verbatim) | `tests/db-catalog-write-guard.test.ts` (mutação executada pelo teste) |
| `docker-compose.prod.yml` | `postgres` (env + volume), `api` (URL) | — |
| `docs/deployment.md` | seção nova; tabela dos gates; l.458; runbook B-O6R-01 passos 0 e 5; seis modos; pré-requisito `psql`; `STAGING_DEPLOY_ENABLED` | — |
| `tests/production-runtime-gates.test.ts` | + casos do `G-DB-ROLE` (T1, T3) | o próprio arquivo (PROD_OK) |
| `tests/san3-05-runtime-role-bootstrap.test.ts` | novo (T2 por processo filho, T4) | `tests/o6r05-…` do bootstrap do worker |
| `tests/san3-05-runtime-role-guard-db.test.ts` | novo (T5–T9, T14, T15) — **escreve catálogo dentro de `withRoleCatalogLock`** | `tests/rls-tenant-isolation.test.ts` (escritor registrado na allowlist, l.44) e `san3-04a-…-db.test.ts:64-70` (`globalThis.prisma`) |
| `tests/san3-05-leituras-de-plataforma-db.test.ts` | novo (T10–T12, incl. T11a–d) | `tests/o6r06-allocation-basis-rls-db.test.ts` (B2′, B7, B8, B11) + `san3-04a` (app + JWT) |
| `tests/san3-05-acessos-de-plataforma-guard.test.ts` | novo (T13) | `tests/db-catalog-write-guard.test.ts` (ratchet congelado com motivo por chave) |
| `tests/db-catalog-write-guard.test.ts` | **só** +1 entrada no `FROZEN_ALLOWLIST` (`san3-05-runtime-role-guard-db.test.ts`, contagem **medida** no head da entrega, motivo) | o próprio arquivo (as 8 entradas existentes) |
| `Kpis/kpis-latest.json`, `Kpis/kpis-history.json`, `Kpis/kpis-history.md` | §C3 | — |
| `agent-orchestration/codex/comandos/B-SAN3-05-runtime-role-sem-bypass.md` | novo (molde `comando-template.md`) | `B-SAN3-04a-rbac-catalogo-banco-matriz.md` |
| `agent-orchestration/controle/pendencias.md`, `…/docs/status-geral.md`, `…/codex/log-execucao.md` | emendas | — |

## §6 — Escopo (§C4): PERMITIDO e PROIBIDO

**O que mudou em relação à v2, e por quê (medido):** entram **três** caminhos no PERMITIDO — `tests/db-catalog-write-guard.test.ts` (**nominalmente: só a entrada nova do `FROZEN_ALLOWLIST`**; sem ela T7/T8/T8b/T8d/T14 não existem — F2-01, medido: sonda reprova, registrada passa, contagem errada reprova), `.gitattributes` (**nominalmente: 1 linha** — N2-03, medido), e `tests/fixtures/san3-05-mutacoes/**` passa de 17 para **26** arquivos. **Nada saiu.** `src/modules/cloud-cost-allocation/**` **continua PROIBIDO** (sítio 7 sem chamador; dono `B-O6R-08`; congelado nominalmente — e o gerador v3 continua vendo-o: chave `new PrismaCloudCostAllocationRepository(prisma) CRU`; "sumida" é vermelho). `scripts/run-backend-tests.mjs` e `tests/helpers/auth-identity-fixture.ts` **não** entram (§3, última linha).

**PERMITIDO** (e nada mais):
`src/database/**` · `src/config/env.ts` · `src/server.ts` (nominalmente: a linha + import) · `src/modules/cloud-usage/cloud-usage-prisma.repository.ts` · `src/modules/cloud-charges/cloud-charge-prisma.repository.ts` · `docker-compose.prod.yml` · `docs/deployment.md` · `scripts/db-runtime-role.sh` (novo, `100755`) · `.gitattributes` (novo, 1 linha) · `scripts/san3-05-acessos-de-plataforma.mjs` (novo) · `tests/production-runtime-gates.test.ts` · `tests/san3-05-*.test.ts` (novos) · `tests/fixtures/san3-05-mutacoes/**` (26 novos) · `tests/db-catalog-write-guard.test.ts` (nominalmente: a entrada do Map) · `Kpis/kpis-latest.json` · `Kpis/kpis-history.json` · `Kpis/kpis-history.md` · `agent-orchestration/codex/comandos/B-SAN3-05-runtime-role-sem-bypass.md` (novo) · `agent-orchestration/controle/pendencias.md` · `agent-orchestration/controle/pendencias-indice.md` (só pelo gerador de índice) · `agent-orchestration/docs/status-geral.md` · `agent-orchestration/codex/log-execucao.md` · `agent-orchestration/omega/juntas/**` (ata, votos — do orquestrador).

**PROIBIDO** (§C4 + fronteira):
`prisma/**` · `.env`, `.env.*`, `.env.example` · `package.json`, lockfiles, `pubspec.*` · `.github/workflows/**` · `fly.*.toml` · `Dockerfile`, `docker-compose.yml` · `src/routes/health.routes.ts` · `src/modules/cloud-cost-allocation/**` · `src/modules/auth/**` · qualquer outro `src/modules/**` · `frontend/**`, `mobile/**` · `CLAUDE.md`, `AGENTS.md`, `.claude/**`, `.agents/**` · `Kpis/index.html`, `Kpis/app.js` · `docs/revisoes/SAN3/PLANO_SAN3.md` · `tests/o6r07b-scanner-failclosed.test.ts` (P1 tem dono) · `scripts/run-backend-tests.mjs` (o teto de pulos é desenho) · `tests/helpers/auth-identity-fixture.ts` (o arnês não muda) · em `tests/db-catalog-write-guard.test.ts`, **qualquer linha fora da entrada nova do Map** (a junta C2 confere o diff do arquivo: só o bloco `["san3-05-runtime-role-guard-db.test.ts", {count, reason}]`).

**Trava de mesmo arquivo (§6 do PLANO_SAN3):** este bloco **precede** `B-SAN3-03` nos dois repositórios de nuvem e `B-AV-REAL` em `src/config/env.ts`.

## §7 — Critérios de aceite A1–A24, cada um com a mutação que o deixa vermelho

| # | Critério (verde) | Mutação que o deixa VERMELHO | Teste | Evidência (relatório) |
|---|---|---|---|---|
| A1 | Sob `postgres`: `RuntimeRoleGuardError` `RUNTIME_ROLE_CAN_BYPASS_RLS`, `escapes` com `via=atributo, is_self=true, rolsuper=true` | apagar a metade `atributo` do `UNION` | T6 | §4 (xi): `postgres` → 12 linhas incl. `atributo\|postgres\|t\|t\|t` |
| A2 | Super com **outro nome** (`SUPERUSER NOBYPASSRLS`): recusa **com** a linha `is_self ∧ rolsuper` | apagar `r.rolsuper` do predicado — a linha `is_self` some | T7 | §4 (xi): `v3_super2` → 12 linhas |
| A3 | Membro de `BYPASSRLS` (direta, `NOINHERIT`, cadeia, `SET FALSE`): `atributo/<bypass>/is_self=false`; após `REVOKE`, passa; ingênua `false:false` | `pg_has_role(…,'MEMBER')` → `r.rolname = current_user` | T8 | §4 (xi): 4 formas → `atributo\|v3_bypass` |
| A4 | Posse: dono direto → `posse/<self>/is_self=true, objetos=n`; membro do dono → `posse/<dono>/is_self=false`; `OWNER TO <migrador>`/`REVOKE` → passa; **porta provada** (`NO FORCE` → linhas) | apagar a metade `posse` | T8b | §4 (xi): `posse\|v3_own\|…\|1`, `posse\|v3_app_owner\|f\|f\|t\|1`; porta 0 → 2 |
| **A4b** | **REPLICATION** → `atributo/<self>`; membro de `pg_execute_server_program` (e dos outros 2) → `atributo/pg_*`; **view** de dono `rolsuper∨rolbypassrls` sobre FORCE com SELECT → `view/<dono>/…/n`; `pg_read_all_data` passa pela tabela (count 0) e é pego pela via `view` se houver view; **portas provadas** (`COPY FROM PROGRAM`, `pg_basebackup`, `SELECT FROM v_rel`) | apagar `r.rolreplication` / os 3 nomes / a metade `view` — cada cenário PASSA | **T8d** | §4 (xi): `v3_repl`, `v3_prog`, `v3_viewer`, `v3_read_all`; portas `a,b,segredo…`, base.tar com marcador, 3 |
| A5 | `session_user` (F13, F2-07): login super + `options=-c role=<limpo>` → recusa; **login não-super** membro de BYPASSRLS / membro do DONO / com SELECT na view, cada um com `options=-c role=<limpo>` → recusa pela via do **login**; login limpo → passa | `session_user` → `current_user` **numa** metade (atributo \| posse \| view) → o cenário daquela metade PASSA | T8c (PrismaPg, a URL do app) | §4 (xii) refeito: orig 1/1/1 · mutA 0 · mutP 0 · mutV 0; §6 re-confirmado |
| A6 | Sob efêmero limpo passa; log traz `session_user`, `current_user`, `escapes: 0` e **nenhum** `postgresql://`/`password`/host; na recusa, `$disconnect` chamado | logar a URL → T9; remover `$disconnect` → espião do T4 | T9, T4 | r1 item 4.3 (mecanismo), re-lido |
| A7 | `envSchema`: `production`+`skip` → issue; valor fora do enum rejeitado; `test`+`enforce` aceito | apagar o gate; aceitar 3.º valor | T1, T3 | mecanismo `safeParse` |
| A8 | Default do export por **processo filho**: `production` → `enforce`; `test`/`development` → `skip` | default de produção → `skip` no export | T2 (`env -i` + PROD_OK + `import('./src/config/env.ts')`) | §5 N2-01: `production unavailable` → mutante `production noop`; precedente cego 13/13 |
| A9 | `deploy-manifest-parity` **28/28** sem manifesto nem `.env.example` | chave obrigatória → `ZodError` no import | bateria (H6) | relatório §10: **28/28 executado por mim** (`grep test(` dá 22 — por isso o número publicado é o executado) |
| A10 | Sob efêmero, `listEvents({janela 2001})` soma **5** eventos de 2 orgs (A: 01h,03h,05h; B: 02h,04h), ordenado por `occurredAt asc` — vermelho-controle no head-base: **0** | remover `setTenantRlsContext` do laço (0); remover a reordenação (A,A,A,B,B ≠ ordenado) | T10 | Apêndice B P1/R1 (0 × 5); janela 2001 isolada (§5 F2-03) |
| A11 | `listDailyAggregates({})` → 2 agregados por `date asc` (A = 2001-01-15, B = 2001-01-14) | idem | T10 | r2 (ordem), re-lido |
| **A12** | **T11a–d, a superfície fechada (§2.3):** (a) `GET /platform/cloud-usage/summary?periodStart=2001-01-01&periodEnd=2001-01-02` sob super × sob efêmero: corpos iguais (`generatedAt` normalizado) **e** `quantity = 50`; (b) `aggregateDailyUsage(2001-01-01)` sob efêmero grava 2 agregados (= sob super; hoje 0); (c) `POST /platform/cloud-charges/calculation-runs` + `GET …/:runId/tenant-charges` + `GET /platform/cloud-charges/summary` sob efêmero = sob super (2 cobranças; hoje 0/`42501`); (d) **controles** iguais nos dois papéis **hoje** (`…/cloud-cost-allocations/runs/:id/tenant-allocations`, `/platform/overview`, `/cloud-usage/tenants/:id/daily`) **e a enumeração congelada**: o teste lê o router de `/api/v1/platform` em runtime e cada caminho registrado está na lista fechada com uma etiqueta (`FORCE-SEM-TENANT` → tem diferencial; `FORCE-POR-TENANT` → controle; `SEM-FORCE` → excluído com a tabela nomeada) — caminho novo sem etiqueta = **vermelho** | (a) sem laço → `[]` ≠ 50; (b) sem laço → 0 ≠ 2; (c) sem laço → 0/`42501`; (d) rota nova sob `/platform` que toque FORCE sem etiqueta → vermelho; mutação da enumeração: apagar uma etiqueta → vermelho | T11a–d (vermelho-controle no head-base = §7 do relatório: 50 × `[]`) | §7 (diff-http próprio) |
| A13 | Via `createPrismaCloudChargeRepository()`: `listAllocationTenantAllocations(run)` → 2; `listTenantCharges(run)` → 2 (`{tenantId: A}` → 1); `replace(run,[A,B])` grava 2 e `replace(run,[A])` **apaga a de B** (B7); falha injetada na 2.ª volta não deixa linha da 1.ª (B8) | apagar `deleteMany`; tirar a transação única | T12 | Apêndice B P3/P4/P6 (0 / `42501`) |
| A14 | Canário: volta sem trocar o GUC lança `rows_from_another_tenant` | remover `assertRowsBelongToTenant` | T12 | precedente B-O6R-06 (lido) |
| **A15** | **Ratchet semântico:** `node scripts/san3-05-acessos-de-plataforma.mjs .` no head da entrega == congelado do T13 (chave a chave, motivo por chave sumida/nova em relação às **53 do `origin/main`**); o teste executa o gerador em **2 programas** (head + 26 fixtures virtuais; head + override "sumida") e exige **+≥1 chave atribuída a cada fixture** e `novas=1 sumidas=1` no override | (a) qualquer das 26 fixtures com +0 → vermelho; (b) override sem diferença → vermelho; (c) chave nova/sumida no head sem motivo → vermelho | T13 (28 subtestes) | §3: 26/26 VERMELHO, sumida 1/1, chaves fora de zz-mut == head |
| A16 | Compose: `api` conecta como `erp_runtime` ≠ `migrate`; job `docker` verde no SHA com a trava ativa; papel **no banco da app** | `api.DATABASE_URL` → `postgres` → a trava recusa e o smoke cai na readiness | job `docker` (H1/H4) | HIPÓTESE H1 |
| **A17** | **Script v3 em 18 cenários** (§4.1; T14a pelo Prisma administrativo: i, i', ii, iii, iii-b, iii-c, iii-d, iii-e, iv, iv-b, iv-c, iv-d, iv-e, v, vi; T14b por `bash`+`psql` real: vii, viii, ix, x) — inclusive **senha 0/0 em stdout+stderr** nos modos 1 e 4, **argv sem senha**, **MODO 0** fail-closed, cadeia revogada no 1.º salto, REPLICATION/servidor/view tratados, entrypoint morre com `ec=1` | tirar o bloco `EXCEPTION` do CREATE → `CONTEXT … PASSWORD '…'` (vii vermelho); voltar ao `-v password=` (viii vermelho); tirar a pré-checagem de ADMIN OPTION (iv-d vermelho: erro cru); predicado direto no REVOKE (iii-c vermelho: `escapa=t`); tirar `rolreplication` (iv-b/REPLICATION vermelho); `RAISE` → `SELECT` (iii sai `ec=0`) | T14 | §4 (i)–(x), (iv)–(vi); §6 re-confirmação |
| A18 | `docs/deployment.md`: `rg -c 'G-DB-ROLE'` ≥ 2; `rg -n 'Confirmar na ativacao'` vazio; `rg -c 'TO erp_runtime'` ≥ 1; `rg -c 'MODO [0-6]'` ≥ 7; `rg -c 'psql'` ≥ 1 na seção da suíte `-db`; `rg -c 'STAGING_DEPLOY_ENABLED'` ≥ 1 | não editar a doc | C2 (comando na ata) | documental |
| A19 | Registro: `rg -o 'P-SAN3-05-[A-Z0-9-]+' agent-orchestration/controle/pendencias.md \| sort -u \| wc -l` = **6** e cada ID do §13 ≥ 1; `P-INFRA-RLS` e `P-O6R-B06-LEITURA-PLATAFORMA-SOB-FORCE-RLS` em `EM ANDAMENTO (código mergeado; fecha com a trava verde no ambiente — ato do dono §11)`, nunca `FECHADA`; `P-O6R-07B-TESTE-DO-DEFAULT-CEGO-AO-EXPORT` ≥ 1 | marcar `FECHADA`; omitir um ID (≠ 6) | C2 | N2-04 |
| **A20** | **Boot real:** (a) super → `exit 1` ≤ 15 s **e** a 1.ª `Failed to start ERP Techsolutions API` traz `code: RUNTIME_ROLE_CAN_BYPASS_RLS`, nenhuma linha do worker/Redis antes; (b) efêmero → `runtime database role verified` com `escapes: 0`, então `SIGTERM`; **vermelho-controle no head-base:** o processo **não sai** em 30 s e a 1.ª `Failed to start` traz `RedisCommandError` (medido: aos 7,5 s) | apagar a chamada em `main()` → reproduz o head-base (timeout **e** código errado — dois sinais); default do export → `skip` → idem | T15 (`--kill-after`; mata órfãos pelo padrão ancorado) | §5 N2-02 |
| **A21** | `FROZEN_ALLOWLIST` tem `san3-05-runtime-role-guard-db.test.ts` com a contagem **medida** no head da entrega e motivo; o guard passa | contagem ±1 ou entrada ausente → o guard reprova | `db-catalog-write-guard.test.ts` (bateria) | §5 F2-01 (fail → pass → fail) |
| **A22** | `git ls-files -s scripts/db-runtime-role.sh` → `100755`; `git -c core.autocrlf=true` checkout do head → `git ls-files --eol` → `w/lf` | remover a linha do `.gitattributes` → `w/crlf` (e o bash quebra na l.81) | C1 (comando na ata) | §5 N2-03 |
| **A23** | Sem `psql` no PATH e com `DATABASE_URL`, o T14b **falha** (TAP `psql: ausente — pré-requisito da suíte -db`) e `skipped` **não** cresce; com `psql`, imprime o caminho e roda | trocar a falha por `skip` → com os 2 pulos conhecidos o runner reprova pelo orçamento (P8) — o vermelho muda de "teste" para "orçamento": sinal de que o desenho regrediu | T14b + runner | §5 F2-06 (teto duro l.82/90-94) |
| **A24** | Receptor com cast `any` **entra** no inventário: fixture `N10_any` (`(prisma as any).cloudUsageEvent.findMany({})`) → **+1**, classe `CRU` — o `as any` é descascado (`unwrap`) e o acessor **nomeado** é reconhecido pela sintaxe; `TIPO-DESCONHECIDO` cobre o caso sem nome de acessor (`(x as any)[nome].findMany`), **declarado sem fixture** (medido: 0 no head) | tirar o `unwrap` de `AsExpression` → +0; tirar a regra do `any` → o caso sem nome passa a +0 | T13 (27.ª fixture) | relatório §8: `zz-mut/N10_any.ts … cloudUsageEvent.findMany … CRU ×1` |

**CE-G2 (papel × passo):** os passos HTTP de T11a–d rodam como `platform_admin` por JWT (`signAccessToken({…, roles: ["platform_admin"]})`, `platform-permissions.ts:33-54`), como no diferencial do relatório §7.

## §8 — Testes: baseline N, meta M ≥ 2N, T1–T16 e a bateria

**Baseline N = 5** (re-lido no head — relatório §8): `o6r06-usage-atomic-db.test.ts` A7/A17, `o6r06-allocation-basis-rls-db.test.ts` B2′/B11, `rls-tenant-isolation.test.ts:19` (papel `NOSUPERUSER` da l.44). Nenhum cobre a **trava**, o **remédio** dos cinco métodos, a **fiação** nem o **script**. Suíte em `origin/main`: **287** `tests/*.test.ts`, **33** `-db`. Executadas no head **por mim** (relatório §10, Node 20.20.0): `production-runtime-gates` **63/63**, `deploy-manifest-parity` **28/28** (`grep test(`: 30 e 22 — o publicado é o executado).

**Meta M ≥ 10 (2N).** O bloco entrega **15 testes nomeados (T1–T15), ≥ 60 casos** (`test()`/subtestes):

| T | Teste | Arquivo | Banco |
|---|---|---|---|
| T1 | `G-DB-ROLE`: `production`+`skip` rejeitado (path exato) | `production-runtime-gates.test.ts` | não |
| T2 | default do export por **processo filho** (A8) — `spawnSync(node, ["--import","tsx","-e","import('./src/config/env.ts').then(m => console.log(m.env.DATABASE_RUNTIME_ROLE_GUARD))"])`, `env -i`-equivalente + PROD_OK, `DOTENV_CONFIG_PATH=/dev/null` | `san3-05-runtime-role-bootstrap.test.ts` | não |
| T3 | valor fora do enum rejeitado; `test`+`enforce` aceito | `production-runtime-gates.test.ts` | não |
| T4 | bootstrap com client injetado (fake): `enforce=false` → `{enforced:false}` + log; postura limpa → passa sem URL/senha; `escapes` → lança **e** `$disconnect` (espião); erro de conexão → 5 tentativas | `san3-05-runtime-role-bootstrap.test.ts` | não |
| T5 | `assertRuntimeDatabaseRoleIfEnforced({enforce:true})` com `globalThis.prisma = efêmera.client` → passa; com `postgres` → recusa | `san3-05-runtime-role-guard-db.test.ts` | sim |
| T6–T7 | A1, A2 (super renomeado criado **dentro de `withRoleCatalogLock`**, derrubado no `finally`) | idem | sim |
| T8 | A3 · **T8b** A4 (tabela FORCE temporária, `OWNER TO`, `GRANT dono TO efêmero`) · **T8c** A5 (PrismaPg com `options=-c%20role%3D<efêmero limpo>`: login administrativo, login membro-de-BYPASSRLS, login membro-do-dono, login com SELECT na view) · **T8d** A4b (REPLICATION, `pg_execute_server_program`, view de dono que escapa; portas provadas por execução) | idem | sim |
| T9 | A6 (campos exatos; varredura do JSON do log por `postgresql://`/`password`/host — padrão `auth-identity-exposure-scan.test.ts`) | idem | sim |
| T10 | A10 + A11 (semente intercalada em **2001**, vermelho-controle no head-base colado na ata — worktree do jurado) | `san3-05-leituras-de-plataforma-db.test.ts` | sim |
| T11 | **A12 — T11a–d**, dois `createApp` com `globalThis.prisma` trocado antes do import (ou dois processos, a forma do relatório §7), JWT `platform_admin`; **enumeração congelada** das rotas de `/api/v1/platform` lida do router em runtime | idem | sim |
| T12 | A13 + A14 (cobrança via fábrica; B7/B8; canário por mutação executada) | idem | sim |
| T13 | A15 + A24 — gerador em processo filho (`cwd` = raiz, alvo `.`), **2 programas**: head + 26 (27) fixtures por `--mutant` (≥1 chave por fixture) e head + `--override` da fábrica do sítio 7 (`novas=1 sumidas=1`); inventário do head == congelado (chave a chave, motivo por diferença em relação às 53 do `origin/main`) | `san3-05-acessos-de-plataforma-guard.test.ts` | não |
| T14 | A17 — **(a)** o bloco `DO $…$` extraído do `.sh` + os `set_config` feitos pelo teste, executado pelo Prisma administrativo num **banco descartável próprio** (`CREATE DATABASE` sob `withRoleCatalogLock`), 15 cenários; **(b)** o `.sh` inteiro por `bash`+`psql` **real** (vii, viii, ix, x) — **sem `psql` no PATH: FALHA nomeando o pré-requisito, nunca skip** (A23); imprime `psql: <caminho>` no TAP | `san3-05-runtime-role-guard-db.test.ts` | sim |
| T15 | A20 — boot real: `spawn(node, ["--import","tsx","src/server.ts"])`, portas por `listen(0)`, `REDIS_URL` do PROD_OK (inalcançável), timeout 30 s por caso com **kill garantido** (`SIGKILL` após o timeout; nenhum órfão: o teste confere `pgrep` pelo padrão ancorado antes de terminar) | idem | sim |

**Regras dos testes `-db`:** papel efêmero **só** pelo arnês; quem precisa de `SUPERUSER`/`GRANT`/`OWNER TO`/`CREATE DATABASE` faz isso **dentro de `withRoleCatalogLock`** (importado do arnês) e **registra-se na `FROZEN_ALLOWLIST`** com a contagem medida (A21) — nenhuma função nova no arnês; **falha é vermelho, nunca skip** (o teto `SKIP_BUDGET_DB = 2` é desenho — `run-backend-tests.mjs:82,90-94`); `psql` 16 é **pré-requisito declarado** da suíte `-db` (CI: PostgreSQL 16.15 na imagem 24.04 — relatório §1; máquina do dono: o inspetor de terreno confere `psql --version` por jurado antes da junta — §10). As duas suítes `-db` novas (N2-06) rodam no job `backend` (`DATABASE_URL`, `ci.yml:34`); a lista `SUITES` do job `backend-postgres` fica para `B-ARNES-2` (workflow PROIBIDO).

**Bateria (§9 do contrato), na ordem, com `timeout` e `ec` por variável, tudo em Node 20 (`node -v` colado):**
```
npm run check
npm run lint
which psql && psql --version                                  # pré-requisito da suíte -db (A23)
node --test --import tsx tests/production-runtime-gates.test.ts tests/deploy-manifest-parity.test.ts tests/o6r07b-scanner-failclosed.test.ts tests/cors-env.test.ts tests/portal-env.test.ts
node --test --import tsx tests/san3-05-runtime-role-bootstrap.test.ts tests/san3-05-acessos-de-plataforma-guard.test.ts
DATABASE_URL=<descartável> node --test --import tsx tests/san3-05-runtime-role-guard-db.test.ts tests/san3-05-leituras-de-plataforma-db.test.ts
DATABASE_URL=<descartável> node --test --import tsx tests/o6r06-usage-atomic-db.test.ts tests/o6r06-allocation-basis-rls-db.test.ts tests/o6r06-cost-summary-sum-db.test.ts tests/rls-tenant-isolation.test.ts tests/san3-04a-menu-com-permissoes-do-banco-db.test.ts tests/cloud-usage.test.ts tests/cloud-usage-routes.test.ts tests/cloud-charge-routes.test.ts tests/cloud-charge-markup-rules.test.ts tests/db-catalog-write-guard.test.ts
node scripts/san3-05-acessos-de-plataforma.mjs .              # inventário == congelado do T13; cabeçalho + inventário colados na ata; diff contra as 53 do origin/main explicado chave a chave
git ls-files -s scripts/db-runtime-role.sh                    # 100755
git ls-files --eol scripts/db-runtime-role.sh .gitattributes  # i/lf w/lf attr/text eol=lf
DATABASE_URL=<descartável> npm test                           # suíte inteira (contagem real → KPI); skipped ≤ 2
npm run build
node --check Kpis/app.js && node --test --import tsx tests/kpi-dashboard-charts.test.ts
git diff --check
```
Mais: `grep -n 'DATABASE_RUNTIME_ROLE_GUARD' fly.production.toml fly.staging.toml .env.example` → vazio (A9); `git diff --name-only origin/main...HEAD` ⊆ PERMITIDO (§6), e o diff de `tests/db-catalog-write-guard.test.ts` contém **só** a entrada nova do Map; `git grep -n 'PrismaCloudChargeRepository(prisma)' -- src` → vazio.

## §9 — KPI (§C3)

- `Kpis/kpis-latest.json`, `Kpis/kpis-history.json` (append) e `Kpis/kpis-history.md` (append) no mesmo PR; o painel hidrata dos JSON — **nenhuma** dimensão nova.
- Vigente em `origin/main` (lido por mim de `Kpis/kpis-latest.json`, relatório §8): `metrics.blocks_completed.value` **169** · `metrics.backend_tests` **3052/3054** · `frontend_smoke_tests` 1202 · `flutter_tests` 864 · `mvp_demo` 99 · `mvp_vendavel` 88 · `release.pr` 397.
- `backend_tests`: **reexecução real** (`DATABASE_URL=<descartável> npm test`, TAP, Node 20, `skipped ≤ 2`), nunca copiado. `frontend_smoke_tests` (1202) e `flutter_tests` (864): **carregados com nota** (§C3.3; `git diff --name-only origin/main...HEAD -- frontend mobile` vazio, colado).
- `mvp_demo` (99) / `mvp_vendavel` (88): **intocados** (os itens 9 e 10 só contam fechados após o ato do dono — §4.2 do PLANO_SAN3).
- `blocks_completed`: 169 → **170**. `release.block`: "B-SAN3-05 (itens 9 e 10 do §4.1 — código; fecho depende do ato do dono)"; `pr` após `gh pr create`; `merge_commit`/`approved_head` **`null` na autoria** (§C3.5); `status: "published_per_pr"`.
- History: 1 linha por métrica carregada; menção de que a lista do §5.2 ("quatro") foi medida como **sete sítios / cinco métodos dentro + um fora**; e de que este plano é a **v3** após as críticas r1 e r2 (todos os achados respondidos com medição; nenhum recusado).

## §10 — Junta (§C7): quórum, cadeiras, o C3(1) reescrito, papéis

- **Quórum: unanimidade de 3** (§C7.1-ter(b) — segurança e permissão; o dinheiro é só lido). Cadeiras: `agente-dba-guardiao` (C1), `agente-secops` (C2), `guardiao-fail-closed` (C3). O `critico-adversarial` **esgotou as duas rodadas** que o corpo dele permite (`git show HEAD:.claude/agents/critico-adversarial.md`, l.3 e l.6: "máx 2 rodadas"; "o que sobreviver vira requisito explícito no plano") — não tem cadeira na junta do PR.
- **Objeto:** o SHA do head da entrega com check-runs **concluídos**, inclusive o job `docker` (E4/H1). **Inspetor de terreno** (Fable): worktree + cluster descartável por jurado (sem Docker: §0.2 mostra como), `sync-agent-agents.mjs --check`, inelegibilidade por nome (as identidades de v1, v2, v3, r1, r2 e o dev são inelegíveis para votar), **`psql --version` no PATH de cada jurado que roda a suíte `-db`** (A23), plano de perda.

| Cadeira | Itens (≤ 3, P4) | Veto |
|---|---|---|
| C1 papel, grants, compose | (1) `scripts/db-runtime-role.sh` do **head** (md5 = Apêndice C) num cluster descartável próprio: os **18 cenários** do §4.1 re-executados (`ec` por cenário; `grep -c <senha>` = 0 em stdout+stderr e no `server.log` do seu cluster nos modos 1 e 4; shim de `psql` → argv sem senha; MODO 0 com `log_statement=all`); `git ls-files -s` = `100755`; `git ls-files --eol` = `w/lf` sob `core.autocrlf=true` (A22); (2) `RUNTIME_ROLE_GUARD_SQL` do head (md5 = Apêndice E) sob os **13 papéis + 4 cenários de `options=`** do §4.2, com as **portas** executadas (`NO FORCE`, `SET ROLE`, `COPY FROM PROGRAM`, `pg_basebackup`, `SELECT` na view) e os **3 semi-mutantes** de A5; (3) compose: `api` ≠ `migrate`, run do job `docker` verde no SHA, papel no banco da app, `down -v` documentado | sim |
| C2 fiação, segredo, escopo | (1) T2 e T15 rodados no head **e** duas mutações próprias (default → `skip`; chamada em `main()` apagada), cada uma reprovando T2/T15 pelos **dois** sinais de A20; paridade 28/28; (2) **zero segredo**: placeholders rotulados, log da trava sem URL/senha/host (T9 + leitura), `/health/*` inalterado, e **o script nunca ecoa a senha** (re-executa vii e viii); (3) diff × escopo §6 por comando — inclusive que o diff de `tests/db-catalog-write-guard.test.ts` é **só** a entrada do Map, e A18/A19 | **sim** |
| C3 inventário, remédio, superfície | (1) **ratchet**: gerador do head rodado (md5 = Apêndice A); inventário == congelado; diff contra as **53 chaves do `origin/main`** explicado chave a chave; T13 verde-por-vermelho (27 subtestes) **e uma forma de autoria própria** — **regra reescrita (F2):** se a forma está no **alcance declarado** do gerador (§2.2(c): `src/**`, tipada, Prisma, tabela FORCE) e o ratchet **não** a põe no inventário → **defeito do gerador, `dentro-do-bloco`, reprova**, independentemente do T11; se está fora do alcance declarado → pendência `B-ARNES-2`, não reprova; (2) **T11a–d** sob papel efêmero com vermelho-controle no head-base (saída colada) e a **enumeração** das rotas de `/api/v1/platform` colada e conferida contra a fonte (`grep` dos `router.(get\|post\|patch)` de `platform.routes.ts`, `cloud-usage.routes.ts`, `cloud-charge.routes.ts`, `cloud-cost-allocation.routes.ts`); (3) os **6** `$TRANSACTION-SEM-SETTER-PROVADO` e o runner `runWithTenantContext` lidos um a um (contexto herdado? sim/não, com a linha) — e `aggregateDailyUsage`/`executeCalculationRun` sob o papel (2 organizações) | sim |

- **Papéis (§C7.4-bis):** **quem achou** = `critico-b-san3-05` (r1 e r2) e, no PR, as três cadeiras (identidades novas); **quem planeja** = este `planejador-b-san3-05-v3` (Fable, obrigatório — §C7.6); **quem desenvolve** = desenvolvedor de identidade nova nomeado pelo orquestrador no comando (§14), que não vota e **não julga a validade dos achados**. Ciclo de reprovação → `omega/reprovacoes/R-B-SAN3-05-<ciclo>.md`; no ciclo 3 com `bloqueia`, auditoria da máquina (`D-SEM-TETO-AUDITORIA-NO-3`).
- **Escopo do voto (§C7.1-ter(a)):** `dentro-do-bloco` para os sítios 1–6, trava, procedimento, fiação, ratchet **e seu alcance declarado**, superfície T11a–d; `pre-existente` (pendência com dono) para o sítio 7, a suíte `-db` sob papel real (`B-ARNES-2`), `SECURITY DEFINER`, o teste cego do `EVIDENCE_SCANNER` (P1, `fe2748c` 2026-09-06), e formas **fora do alcance declarado** do gerador — sempre com evidência de data/origem.
- **P1–P6** (evidência incremental, voto-arquivo-primeiro, ≤ 2 em paralelo, `00-quedas.md`) **e P7** — pausa ordenada grava o estado e para (`D-PAUSA-GRAVA-E-PARA`): **medido por ref**: está em `origin/main` (`513937b`, #397) e **não** no `CLAUDE.md` deste ramo (base `5b6e1036`, anterior ao #397) — a integração da `main` ao ramo é do orquestrador; a junta segue o contrato da `main`.
- **Porteiro pós-merge** (Fable): reexecuta o gerador (inventário == congelado), a contagem de KPI, A19, a limpeza §C5, e libera (ou não) `B-O6R-07c`.

## §11 — Atos do dono (seis modos de falha nomeados)

> O bloco entrega **pronto**: trava, procedimento (18 cenários), compose e documentação. Os itens 9 e 10 **só fecham** com a trava **verde no ambiente** — dois atos que o repositório não pratica por você (`PLANO_SAN3.md` §4.2, l.192). **Nada disto é feito pelo PR, nem antes do merge.**

**Ato 0 — não ligue o CD de staging antes dos Atos 1–2 de staging (N2-05).** `deploy-staging.yml` roda a cada push na `main` quando `STAGING_DEPLOY_ENABLED == 'true'` (hoje `skipped` — medido pela r2); `fly.staging.toml` sobe com `NODE_ENV=production` ⇒ trava ativa. **Mantenha a variável desligada** até o papel de staging existir e o secret estar trocado; a amarração é procedimental (o workflow é PROIBIDO neste bloco) e fica registrada em `docs/deployment.md` e em `P-SAN3-05-STAGING-CD-AMARRACAO` (§13).

**Ato 1 — criar o papel de runtime no banco gerenciado (produção e staging).**
1. Conecte-se ao banco **da aplicação** com a credencial **do migrador** (`PROD_DATABASE_URL` / `STAGING_DATABASE_URL` do GitHub Environment — é ela que roda `prisma migrate deploy` e `db:provision-rbac`, e **fica** como migrador). `PGDATABASE` = o banco da app (grants e default privileges são **por banco**).
2. Escolha o nome (default `erp_runtime`) e uma senha nova, forte, **sem quebra de linha**, que **não** vai ao repositório nem ao chat. Rode, na raiz do repo no SHA mergeado:
   ```bash
   PGHOST=<host> PGPORT=5432 PGUSER=<migrador> PGPASSWORD=<senha do migrador> PGDATABASE=<banco da app> \
   DB_RUNTIME_ROLE=erp_runtime DB_RUNTIME_PASSWORD='<senha nova>' \
   bash scripts/db-runtime-role.sh
   ```
   A senha nova **não aparece** no terminal, no `argv` nem no log do servidor em nenhum modo de falha (medido nos modos 1 e 4; a única exposição residual é `/proc/<pid>/environ` enquanto o `psql` roda — a mesma classe de `PGPASSWORD`). O script termina com **uma** linha: `erp_runtime|f|f|f|f|0|0|<n>` — `rolsuper`, `rolbypassrls`, `rolreplication`, escapa por pertença, posse de tabela FORCE, views de dono que escapa, tabelas com DML (`<n>` = total de tabelas da app). Qualquer via de escape ⇒ **`ec=3`, nada persiste** — não siga ao Ato 2.
3. **Os seis modos de falha**, cada um com o que pede de você (todos executados, relatório §4):
   - **MODO 0** — `log_statement=all`/`log_min_duration_statement=0` no servidor: a senha iria ao log. Desligue (superusuário/console do provedor) **ou** aceite conscientemente com `DB_RUNTIME_ALLOW_LOG_ALL=1` (aí a senha **vai** ao log do provedor — rotacione depois).
   - **MODO 1** — `permission denied to create role`: o migrador não tem `CREATEROLE` → **decisão de provedor** (§10.2 do PLANO_SAN3); pare e registre.
   - **MODO 2** — `papel X tem <SUPERUSER|BYPASSRLS|REPLICATION|CREATEDB|CREATEROLE> e <migrador> nao pode remover`: use **outro nome** (`DB_RUNTIME_ROLE`) ou corrija com a credencial administrativa e rode de novo.
   - **MODO 3** — `tabela/sequencia public.<t> pertence a <outro>…` ou `…escapa … posse:<dono>`: `ALTER TABLE public.<t> OWNER TO <migrador>;` com a credencial que puder; rode de novo (idempotente — ii).
   - **MODO 4** — `o papel X ja existe e <migrador> nao tem ADMIN OPTION sobre ele`: outro nome, **ou** `GRANT X TO <migrador> WITH ADMIN OPTION` pela credencial que criou X; rode de novo.
   - **MODO 5** — `a pertenca de X a Y … nao pode ser revogada por <migrador>`: `REVOKE Y FROM X` com credencial que tenha `ADMIN OPTION` sobre Y; rode de novo.
   - **MODO 6** — `…escapa … view:<v>`: há view/matview de dono superusuário/`BYPASSRLS` sobre tabela FORCE com SELECT para o papel: `REVOKE SELECT ON <v> FROM erp_runtime` ou troque o dono da view; rode de novo.

**Ato 2 — trocar o secret do app (e só ele).**
4. `fly secrets set DATABASE_URL='postgresql://erp_runtime:<senha nova>@<host>:5432/<banco>?schema=public' -c fly.production.toml` (staging: `-c fly.staging.toml`). **Não** troque `PROD_DATABASE_URL`/`STAGING_DATABASE_URL`. **Não** use `options=-c role=…` (a trava julga o login — F13).
5. Deploy pela pipeline. **A trava é a prova — inteira:** o app sobe ⇒ login **e** papel corrente não escapam por atributo, pertença, posse **nem view**. Confira `runtime database role verified` com `escapes: 0`. Se não subir e o log disser `RUNTIME_ROLE_CAN_BYPASS_RLS`, as `escapes` dizem a porta (`via: atributo|posse|view`, `rolname`, `is_self`, `objetos`): volte ao passo 2 ou 4; a máquina anterior continua servindo (H5).
6. Depois: `GET /api/v1/platform/cloud-usage/summary` continua somando as organizações (item 10 — antes deste bloco zeraria: 50 × vazio, relatório §7); `login_without_org` no `/health/ready` fica `inactive`/`inert_no_execute` **até** o passo 5 do runbook B-O6R-01 (`GRANT EXECUTE … TO erp_runtime`), decisão sua em ata.

**Registro quando os dois atos estiverem feitos:** `P-INFRA-RLS` e `P-O6R-B06-LEITURA-PLATAFORMA-SOB-FORCE-RLS` passam de `EM ANDAMENTO` para `FECHADA` com a linha do log como evidência; itens 9 e 10 fecham. Até lá: **código pronto, ato pendente**.

## §12 — Riscos e rollback

| R | Risco | Mitigação | Rollback |
|---|---|---|---|
| R1 | trava recusa o boot porque o secret ainda é o papel antigo (H2) | comportamento desejado; §11 antes do deploy; o log diz a porta | `fly secrets set DATABASE_URL=<anterior>` ou `flyctl deploy --image <sha-anterior>` |
| R2 | tabela nova de **outro papel** ou **outro banco** sem grant (`42501`) | todo DDL roda como o migrador; o script falha nomeando tabela alheia (MODO 3) | rodar o script de novo após `OWNER TO` |
| R3 | N+1 por organização | precedente aceito (platform-overview, B-O6R-06); uma transação por chamada | — |
| R4 | blip do banco no boot vira crash-loop (5 tentativas/62 s) | fail-closed > subir sem saber com quem fala | — |
| R5 | posse RECUSA; **view de dono que escapa RECUSA** (nova): um migrador superusuário que crie view sobre tabela FORCE derruba o boot da `api` | é a intenção (porta real: `v_rel` → 3 sem GUC); MODO 6 diz o comando; no compose (migrador `postgres`) hoje há **0 views** | REVOKE SELECT na view / secret anterior |
| R6 | compose com volume antigo sem o papel | comentário no compose; CI faz `down -v` | `down -v` |
| R7 | `.sh` sourced pelo entrypoint / CRLF | corpo em função-subshell; **falha propaga** (ec=1 nos dois modos); `100755` + `.gitattributes eol=lf` | H1 na CI |
| R8 | `login_without_org` `inactive` até o GRANT humano | desenho do B-O6R-01 | passo 6 |
| R9 | ratchet não vê **semântica** de contexto (envoltório confiado que não sete GUC; `tenantId` errado) | residual **declarado por construção** (§2.2(c)); a superfície de plataforma é guardada dinamicamente (T11a–d); o resto é `B-ARNES-2` | — |
| R10 | `take: 100_000` retirado | espelha o B-O6R-06; junta ratifica ou pede teto por tenant | reintroduzir por tenant |
| R11 | ratchet reprova PR alheio com helper `tx` legítimo | atualizar o congelado **com motivo** é o ato consciente; 53 chaves, sem linha | — |
| R12 | T15 depende de `tsx`, portas livres e de **matar o filho** | portas por `listen(0)`; `SIGKILL` após o timeout; `pgrep` pelo padrão ancorado (`^node --import tsx src/server.ts`) antes de terminar — medido: o `timeout` sem `--kill-after` deixou 2 órfãos | — |
| R13 | runner/máquina sem `psql` | T14b **falha** nomeando (nunca skip); pré-requisito declarado; inspetor confere por jurado | instalar o cliente 16 |
| R14 | MODO 0 bloqueia o dono num gerenciado com `log_statement=all` que ele não pode mudar | override `DB_RUNTIME_ALLOW_LOG_ALL=1` **declarado** no §11 (a senha vai ao log do provedor; rotacionar depois) | — |
| R15 | T13 lento (2 programas TypeScript, ~21 s + ~25 s aqui) | medido; abaixo de 60 s; roda no job `backend` sem banco | — |

**Rollback do PR inteiro:** `git revert` do squash — nenhuma migração; o papel criado pelo dono é inerte enquanto o secret não o usar.

## §13 — O que este plano NÃO pega (pendências nomeadas, com dono)

| Pendência (a abrir no PR; **6** IDs `P-SAN3-05-*` — A19) | O quê | Dono |
|---|---|---|
| `P-SAN3-05-LEITURA-MORTA-PROJECAO-DIARIA` | sítio 7 (`cloud-cost-allocation-prisma.repository.ts:238`, sem chamador em `src`); ao resolver, **atualizar o congelado** (a chave `new PrismaCloudCostAllocationRepository(prisma) CRU` some) | `B-O6R-08` |
| `P-SAN3-05-LACO-POR-TENANT-DUPLICADO` | `forEachTenantInOneTx`/canário privados da alocação × os públicos de `rls.ts` (o gerador v3 confia nos dois pelo símbolo) | `B-SAN3-03` |
| `P-SAN3-05-SUITE-DB-SOB-PAPEL-REAL` | a suíte `-db` inteira sob papel real (13 escrevem catálogo; 8 fazem DDL — 10 com helpers); `SUITES` do `backend-postgres`; **é o que fecha o residual semântico do ratchet (R9) e a propriedade fora da superfície de plataforma (§2.1(c))** | `B-ARNES-2` |
| `P-SAN3-05-POSTURA-NO-HEALTH` | postura do papel no `/health/ready` fora de `checks` (corpo público, arquivo fora da fronteira) | observabilidade (orquestrador nomeia) |
| `P-SAN3-05-SECURITY-DEFINER-INVENTARIO` | funções `SECURITY DEFINER` de dono que escapa, executáveis pelo papel (hoje só `auth_login_candidates`, por ato humano) | `B-SAN3-10` |
| `P-SAN3-05-STAGING-CD-AMARRACAO` (**nova**, N2-05) | amarrar mecanicamente `STAGING_DEPLOY_ENABLED` aos Atos 1–2 de staging (hoje procedimental: `.github/workflows/**` é PROIBIDO aqui) | bloco que toque workflows (`B-SAN3-10` ou `B-ARNES-2`) |
| `P-O6R-07B-TESTE-DO-DEFAULT-CEGO-AO-EXPORT` (**P1 da r1, pré-existente** — `fe2748c`, 2026-09-06, #380) | o teste reescreve a regra em vez de ler o export (mutante 13/13 verde — re-medido no relatório §5); conserto = o mecanismo do T2 | `B-O6R-07b`/segurança |
| (registro) | §5.2 diz "quatro leituras"; medido: sete sítios/cinco métodos + um fora; a consulta do §5.2 é cega a pertença, posse, `session_user`, REPLICATION/servidor/view | ata + emenda em `pendencias.md` (`P-INFRA-RLS`) |

**Dito por escrito, o que a v3 não responde com mecanismo e por quê:** (1) a **semântica** do contexto no ratchet — só a suíte `-db` sob papel real a vê (`B-ARNES-2`); (2) a senha em `/proc/<pid>/environ` do `psql` — mesma classe de `PGPASSWORD`, declarada no cabeçalho do script; (3) o CD de staging — procedimental porque o workflow é PROIBIDO; (4) o conserto de P1 — tem dono.

## §14 — Comando do bloco

`# B-SAN3-05 — o papel de runtime não escapa de RLS (itens 9 e 10)` · **Plano:** esta **v3** (`docs/plano-b-san3-05`), que responde às críticas r1 e r2 — v1 (`c3f57e9`) e v2 (`c727156`) **não** valem mais · **Objetivo** §1 · **Fontes** §0 e "Resposta à crítica r2" · **Regras** §2 e §4 (trava = Apêndice E byte a byte, md5 `36650de53be8504c76deef74ecc78811`; `.sh` = Apêndice C byte a byte, md5 `810c1c4a2552665d4947bf0ef4e93670`, `100755`, `eol=lf`; gerador = Apêndice A byte a byte, md5 `81d9259571391eded68255391a99fb61`; fixtures = Apêndice D; nenhum privilégio além de DML+USAGE; nada em `/health`; nenhum pulo de teste) · **Escopo** §6 · **Rito** §10 (inspetor → dev de identidade nova → junta unânime de 3 → porteiro) · **Teste de encerramento** §7 A1–A24 com T1–T15 · **Bateria** §8 (Node 20, `psql` presente) · **KPI** §9 · **DoD** §10 do contrato + A19 · **Atos do dono** §11 · **Rastreabilidade**: `pr`, `merge_commit`, `approved_head`, `J-B-SAN3-05.md`, `published_per_pr`.

## §15 — Próximo papel depois desta v3

**Medido nas refs (§A7):** o corpo do crítico em `HEAD` do ramo (`git show HEAD:.claude/agents/critico-adversarial.md`, l.3 e l.6) fixa "**máx 2 rodadas** de ataque/defesa; o que sobreviver vira **requisito explícito no plano**" — r1 e r2 estão feitas; não há r3. O `PLANO_SAN3.md` (l.9-10, mesma ref) segue o mesmo rito: "Revisão adversarial: `critico-adversarial`, 2 rodadas … Junta do PR". O contrato (`CLAUDE.md` §C2 e §C7.4-bis, medido em `HEAD` e em `origin/main`) manda: comando do bloco → **desenvolvedor de identidade nova** (que não votou, não planejou, não achou) → `inspetor-de-terreno-da-junta` (Fable) → junta unânime de 3 → `porteiro-pos-merge`.

**Logo, o próximo papel é o orquestrador escrever o comando (§14) e nomear o desenvolvedor de identidade nova**, que implementa esta v3 **sem julgar a validade dos achados** (§C7.4-bis). Esta v3 **não passa por crítica r3**; o que nela é novo e **não foi re-medido por terceiros** está nomeado para a junta medir, cadeira a cadeira (§10): o gerador v3 e as 27 fixtures (C3), o script v3 nos 18 cenários e a trava v3 nos 13 papéis + semi-mutantes (C1), a fiação e o não-vazamento (C2). Se a junta reprovar, abre-se o ciclo 2 com `R-B-SAN3-05-2.md` e papéis recompostos — e, se o planejamento voltar, volta para o `planejador-mestre` em **Fable** (obrigatório na revalidação, §C7.6), identidade nova.

## Apêndices

- **A** — gerador v3 (semântico), verbatim, md5 `81d9259571391eded68255391a99fb61`, e o inventário congelado do `origin/main` (53 chaves).
- **B** — medição sob papel real (22 itens): por referência ao blob da v2 + re-execução nesta v3.
- **C** — `scripts/db-runtime-role.sh` v3, verbatim, md5 `810c1c4a2552665d4947bf0ef4e93670`.
- **D** — fixtures de mutação: 17 da r1 (por referência ao blob da v2, com md5 por arquivo) + as 10 novas (N01–N10), verbatim.
- **E** — `RUNTIME_ROLE_GUARD_SQL` v3, verbatim, md5 `36650de53be8504c76deef74ecc78811`.

---

## Apêndice A — gerador v3 do inventário (verbatim) e o inventário congelado no `origin/main`

Arquivo que o desenvolvedor commita como `scripts/san3-05-acessos-de-plataforma.mjs` (uso: `node scripts/san3-05-acessos-de-plataforma.mjs <raiz> [--all] [--mutant <arquivo.ts>]… [--override <rel>=<arquivo>]…`, com `cwd` = raiz do repo, que tem `node_modules`). md5 do fonte: `81d9259571391eded68255391a99fb61` (353 linhas). Extração para conferência (ancorada no cabeçalho do apêndice): `awk '/^## Apêndice A/{d=1} d&&/^```js$/{f=1;next} d&&f&&/^```$/{exit} d&&f' docs/revisoes/SAN3/B-SAN3-05-plano.md | md5sum`.

```js
#!/usr/bin/env node
// B-SAN3-05 (v3) — INVENTÁRIO SEMÂNTICO, gerado da fonte, dos acessos a tabelas sob FORCE ROW LEVEL SECURITY que NÃO
// estão provadamente sob contexto de tenant. Serve a um RATCHET (teste T13): o inventário suspeito é congelado por
// chave (sem número de linha); chave NOVA ou SUMIDA é vermelho — default NEGAR.
//
// O QUE MUDOU DA v2 (crítica r2, F2 — 9 formas verdes por reconhecimento de NOME e REGEX DE TEXTO):
//   • o delegate é reconhecido pelo TIPO (type checker: a assinatura resolvida da chamada mora numa interface
//     `<Model>Delegate` do client gerado), não pelo nome do acessor — alias, desestruturação renomeada, delegate
//     passado como argumento e acesso por índice resolvem para o mesmo tipo;
//   • a classe instanciada é reconhecida pelo SÍMBOLO (import renomeado, namespace, subclasse via namespace, herança
//     pelo símbolo da base), não pelo texto do identificador;
//   • o `$transaction` só é absolvido se a PRIMEIRA instrução do callback é `await setTenantRlsContext(<o mesmo tx>, …)`
//     (AST + identidade de símbolo) — nunca por regex, nunca por comentário, nunca condicional, nunca com outro client;
//   • o envoltório de contexto só é confiado pelo SÍMBOLO declarado nos arquivos listados em WRAPPERS; um runner injetado
//     com o mesmo nome (ex.: `runWithTenantContext`, cujo default em local-auth-login.service.ts é `work()`) NÃO absolve;
//   • o receptor é classificado pela DECLARAÇÃO do seu símbolo raiz (parâmetro de callback de envoltório → SOB-CONTEXTO;
//     campo injetado → INJETADO, decidido em L2; parâmetro de função comum → PARAMETRO; variável de módulo → CRU;
//     alias/desestruturação seguem o inicializador); o que não resolve é OUTRO (suspeito);
//   • tipo `any`/`unknown` com método de delegate (`.findMany(` …) → TIPO-DESCONHECIDO (suspeito): o que não se prova
//     que não é tabela FORCE entra no inventário;
//   • fixtures de mutação entram como ARQUIVOS VIRTUAIS (`--mutant <arquivo>` → src/modules/zz-mut/<nome>.ts) e sobrescritas
//     (`--override <rel>=<arquivo>`) num CompilerHost próprio: sem cópia de `src`, sem symlink de `node_modules`.
//
// O QUE ISTO É: aproximação ESTÁTICA com resolução de tipos. Residual DECLARADO (o que fica fora por construção):
//   (i) a SEMÂNTICA do contexto — um envoltório confiado que não sete o GUC, um `tenantId` errado, um `tx` usado após
//       o fim da transação — só a medição dinâmica (T10–T12 na superfície de plataforma; B-ARNES-2 no resto) vê;
//   (ii) código fora de `src/**` (helpers de teste, scripts) e acesso ao banco fora do Prisma (pg direto) — não varridos;
//   (iii) `$queryRaw*` com SQL que não cite literalmente a tabela é OPACO → SUSPEITO (não é residual: está no inventário).
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";

const args = process.argv.slice(2);
const positional = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--mutant" && args[i - 1] !== "--override");
const repo = path.resolve(positional[0] ?? ".");
const showAll = args.includes("--all");
const mutants = []; const overrides = new Map();
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--mutant") mutants.push(path.resolve(args[++i]));
  if (args[i] === "--override") { const s = args[++i]; const k = s.indexOf("="); overrides.set(s.slice(0, k).replace(/\\/g, "/"), path.resolve(s.slice(k + 1))); }
}
let req = null;
for (const base of [import.meta.url, path.join(process.cwd(), "package.json"), path.join(repo, "package.json")]) {
  try { const r = createRequire(base); r.resolve("typescript"); req = r; break; } catch { /* próximo */ }
}
if (!req) throw new Error("typescript não resolvido a partir do script, do cwd nem do alvo");
const ts = req("typescript");

// ---------- L0: tabelas FORCE ← migrações; tabela→model→acessor ← schema; OPS ← client gerado ----------
function walk(dir, out = []) { for (const e of readdirSync(dir)) { const f = path.join(dir, e); if (statSync(f).isDirectory()) walk(f, out); else out.push(f); } return out; }
const FORCE = new Set(); const ENABLE = new Set();
for (const f of walk(path.join(repo, "prisma/migrations")).filter((f) => f.endsWith("migration.sql"))) {
  const sql = readFileSync(f, "utf8");
  for (const m of sql.matchAll(/ALTER TABLE\s+"?([a-z_]+)"?\s+FORCE ROW LEVEL SECURITY/gi)) FORCE.add(m[1].toLowerCase());
  for (const m of sql.matchAll(/ALTER TABLE\s+"?([a-z_]+)"?\s+ENABLE ROW LEVEL SECURITY/gi)) ENABLE.add(m[1].toLowerCase());
  for (const m of sql.matchAll(/ALTER TABLE\s+"?([a-z_]+)"?\s+NO FORCE ROW LEVEL SECURITY/gi)) FORCE.delete(m[1].toLowerCase());
  for (const m of sql.matchAll(/ALTER TABLE\s+"?([a-z_]+)"?\s+DISABLE ROW LEVEL SECURITY/gi)) ENABLE.delete(m[1].toLowerCase());
}
const schema = readFileSync(path.join(repo, "prisma/schema.prisma"), "utf8");
const modelToTable = new Map(); let current = null;
for (const line of schema.split(/\r?\n/)) {
  const m = line.match(/^model\s+(\w+)\s*\{/); if (m) current = m[1];
  const map = line.match(/@@map\("([^"]+)"\)/); if (map && current) modelToTable.set(current, map[1]);
}
const accessorToTable = new Map();
for (const [model, table] of modelToTable) if (FORCE.has(table)) accessorToTable.set(model[0].toLowerCase() + model.slice(1), table);
let OPS = null; // derivado do PROGRAMA (abaixo), não de regex sobre o d.ts
const RAW = new Set(["$queryRaw", "$queryRawUnsafe", "$executeRaw", "$executeRawUnsafe"]);
// Envoltórios CONFIADOS — pelo SÍMBOLO declarado nestes arquivos (a junta lê os corpos: ambos setam o GUC a cada volta).
const WRAPPERS = [
  { name: "withTenantRls", file: /src[\\/]database[\\/]rls\.ts$/ },
  { name: "forEachTenantRls", file: /src[\\/]database[\\/]rls\.ts$/ },
  { name: "forEachTenantInOneTx", file: /cloud-cost-allocation-prisma\.repository\.ts$/ },
];
const SETTERS = [{ name: "setTenantRlsContext", file: /src[\\/]database[\\/]rls\.ts$/ }, { name: "setIdentityRlsContext", file: /src[\\/]database[\\/]rls\.ts$/ }];

// ---------- Programa TypeScript (arquivos virtuais para mutantes e sobrescritas) ----------
const cfg = ts.readConfigFile(path.join(repo, "tsconfig.json"), ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(cfg.config, ts.sys, repo);
const options = { ...parsed.options, noEmit: true, skipLibCheck: true };
const virtual = new Map();
for (const m of mutants) virtual.set(path.normalize(path.join(repo, "src/modules/zz-mut", path.basename(m))), readFileSync(m, "utf8"));
for (const [rel, file] of overrides) virtual.set(path.normalize(path.join(repo, rel)), readFileSync(file, "utf8"));
const realSrc = walk(path.join(repo, "src")).filter((f) => f.endsWith(".ts") && !f.endsWith(".d.ts")).map((f) => path.normalize(f));
const rootNames = [...new Set([...realSrc, ...virtual.keys()])];
const host = ts.createCompilerHost(options, true);
const _gsf = host.getSourceFile.bind(host), _fe = host.fileExists.bind(host), _rf = host.readFile.bind(host);
host.fileExists = (f) => virtual.has(path.normalize(f)) || _fe(f);
host.readFile = (f) => (virtual.has(path.normalize(f)) ? virtual.get(path.normalize(f)) : _rf(f));
host.getSourceFile = (f, lang, onError, create) => (virtual.has(path.normalize(f)) ? ts.createSourceFile(f, virtual.get(path.normalize(f)), lang, true, ts.ScriptKind.TS) : _gsf(f, lang, onError, create));
const program = ts.createProgram({ rootNames, options, host });
const checker = program.getTypeChecker();
// OPS ← métodos das interfaces *Delegate do client GERADO, pelo próprio programa (F4 da r1, agora sem regex de texto)
OPS = new Set();
for (const sf of program.getSourceFiles()) if (sf.fileName.replace(/\\/g, "/").endsWith("/.prisma/client/index.d.ts")) sf.forEachChild(function look(n) {
  if (ts.isInterfaceDeclaration(n) && /Delegate$/.test(n.name.text)) for (const m of n.members) if (ts.isMethodSignature(m) && m.name) OPS.add(m.name.getText());
  else ts.forEachChild(n, look);
});
if (OPS.size < 10) {
  OPS = new Set(["findMany","findFirst","findFirstOrThrow","findUnique","findUniqueOrThrow","count","aggregate","groupBy","create","createMany","createManyAndReturn","update","updateMany","updateManyAndReturn","upsert","delete","deleteMany"]);
  console.error("# aviso: OPS não derivado do client gerado; usando lista embutida");
}
const rel = (f) => path.relative(repo, f).replace(/\\/g, "/");
const GENERATED = /[\\/](\.prisma|@prisma)[\\/]client[\\/]/;

// ---------- utilitários semânticos ----------
function unwrap(e) { while (e && (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isNonNullExpression(e) || ts.isSatisfiesExpression?.(e) || ts.isTypeAssertionExpression(e))) e = e.expression; return e; }
function realSymbol(sym) { return sym && (sym.flags & ts.SymbolFlags.Alias) ? checker.getAliasedSymbol(sym) : sym; }
function symbolOf(node) { return realSymbol(checker.getSymbolAtLocation(node)); }
function moduleExportOfBinding(d) { // d: BindingElement de `const { x } = await import("m")` ou `const [{ x }, …] = await Promise.all([import("m"), …])`
  let p = d.parent; while (p && !ts.isVariableDeclaration(p)) p = p.parent; if (!p?.initializer) return null;
  let init = unwrap(p.initializer); if (ts.isAwaitExpression(init)) init = unwrap(init.expression);
  let importCall = null;
  if (ts.isCallExpression(init) && init.expression.kind === ts.SyntaxKind.ImportKeyword) importCall = init;
  else if (ts.isCallExpression(init) && /Promise\.all$/.test(init.expression.getText()) && init.arguments[0] && ts.isArrayLiteralExpression(init.arguments[0]) && ts.isArrayBindingPattern(p.name)) {
    const elem = d.parent?.parent; const i = elem ? p.name.elements.indexOf(elem) : -1;
    const cand = i >= 0 ? unwrap(init.arguments[0].elements[i]) : null;
    if (cand && ts.isCallExpression(cand) && cand.expression.kind === ts.SyntaxKind.ImportKeyword) importCall = cand;
  }
  if (!importCall || !importCall.arguments[0]) return null;
  const modSym = checker.getSymbolAtLocation(importCall.arguments[0]); if (!modSym) return null;
  const name = (d.propertyName ?? d.name).getText();
  const exp = checker.getExportsOfModule(modSym).find((s) => s.name === name);
  return exp ? realSymbol(exp) : null;
}
function deepSymbol(node) { const s = symbolOf(node); const d = s?.declarations?.[0]; if (d && ts.isBindingElement(d)) { const m = moduleExportOfBinding(d); if (m) return m; } return s; }
function declOf(node) { const s = deepSymbol(node); return s?.declarations?.[0] ?? null; }
function isFunctionLike(n) { return ts.isArrowFunction(n) || ts.isFunctionExpression(n) || ts.isMethodDeclaration(n) || ts.isFunctionDeclaration(n) || ts.isConstructorDeclaration(n) || ts.isGetAccessorDeclaration(n); }
function enclosing(node) {
  let klass = null, method = null;
  for (let n = node.parent; n; n = n.parent) {
    if (!method && (ts.isMethodDeclaration(n) || ts.isFunctionDeclaration(n) || ts.isGetAccessorDeclaration(n)) && n.name) method = n.name.getText();
    if (!method && ts.isPropertyDeclaration(n) && n.initializer && (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer))) method = n.name.getText();
    if (!method && ts.isVariableDeclaration(n) && n.initializer && (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer))) method = n.name.getText();
    if (ts.isClassDeclaration(n) || ts.isClassExpression(n)) { klass = n.name?.text ?? "(anonima)"; break; }
  }
  return { klass, method };
}
function nameOfCallee(call) { const c = unwrap(call.expression); return ts.isPropertyAccessExpression(c) ? c.name.text : ts.isIdentifier(c) ? c.text : c.getText().slice(0, 30); }
function isTrustedSymbol(node, list) {
  const c = unwrap(node); const target = ts.isPropertyAccessExpression(c) ? c.name : c;
  const s = deepSymbol(target); const d = s?.declarations?.[0]; if (!s || !d) return false;
  return list.some((w) => w.name === s.name && w.file.test(d.getSourceFile().fileName));
}
function wrapperKind(call) {
  if (nameOfCallee(call) === "$transaction") return "$transaction";
  if (isTrustedSymbol(call.expression, WRAPPERS)) return "wrapper";
  return null;
}
// $transaction: absolvido só se a PRIMEIRA instrução do callback é `await <setter confiado>(<o mesmo tx>, …)`
function setterFirst(fn, param) {
  if (!fn.body || !ts.isBlock(fn.body)) return false;
  const st = fn.body.statements[0]; if (!st || !ts.isExpressionStatement(st)) return false;
  let e = unwrap(st.expression); if (ts.isAwaitExpression(e)) e = unwrap(e.expression);
  if (!ts.isCallExpression(e) || !isTrustedSymbol(e.expression, SETTERS)) return false;
  const a0 = e.arguments[0] ? unwrap(e.arguments[0]) : null;
  if (!a0 || !ts.isIdentifier(a0)) return false;
  return checker.getSymbolAtLocation(a0) === checker.getSymbolAtLocation(param.name);
}
const injected = new Map(); // ClassDeclaration node -> Set<índice do parâmetro do construtor>
function classDeclOf(expr) {
  const c = unwrap(expr); const target = ts.isPropertyAccessExpression(c) ? c.name : c;
  const t = checker.getTypeAtLocation(c); const ts_ = t?.getSymbol?.() ?? t?.symbol; const td = ts_?.declarations?.[0];
  if (td && (ts.isClassDeclaration(td) || ts.isClassExpression(td))) return td;
  const d = declOf(target); return d && (ts.isClassDeclaration(d) || ts.isClassExpression(d)) ? d : null;
}
function classChain(decl) {
  const out = []; let d = decl; const seen = new Set();
  while (d && !seen.has(d)) { seen.add(d); out.push(d); let base = null;
    for (const h of d.heritageClauses ?? []) if (h.token === ts.SyntaxKind.ExtendsKeyword) base = classDeclOf(h.types[0].expression);
    d = base; }
  return out;
}
function ctorOf(decl) { return decl.members.find((m) => ts.isConstructorDeclaration(m)) ?? null; }
function classifyParam(param, name, depth) {
  const fn = param.parent; const idx = fn.parameters.indexOf(param); const call = fn.parent;
  if (call && ts.isCallExpression(call) && call.arguments.includes(fn)) {
    const w = wrapperKind(call);
    if (w === "wrapper") return idx === 0 ? { cls: "SOB-CONTEXTO", note: nameOfCallee(call) } : { cls: `PARAMETRO(${name} #${idx} de callback de ${nameOfCallee(call)})` };
    if (w === "$transaction") return idx === 0 && setterFirst(fn, param) ? { cls: "SOB-CONTEXTO", note: "$transaction+setter-primeiro" } : { cls: "$TRANSACTION-SEM-SETTER-PROVADO" };
    return { cls: `PARAMETRO(${name} de callback de ${nameOfCallee(call)})` };
  }
  if (ts.isConstructorDeclaration(fn)) return { cls: "INJETADO", index: idx, klass: fn.parent };
  return { cls: `PARAMETRO(${name})`, note: fn.name?.getText() ?? "(anonima)" };
}
function classifyField(expr, depth) { // expr = this.<campo>
  const field = expr.name.text; let k = expr; while (k && !ts.isClassDeclaration(k) && !ts.isClassExpression(k)) k = k.parent;
  if (!k) return { cls: `OUTRO(this.${field} fora de classe)` };
  for (const c of classChain(k)) {
    const ctor = ctorOf(c);
    const pp = ctor?.parameters.find((p) => ts.isIdentifier(p.name) && p.name.text === field && (p.modifiers?.length ?? 0) > 0);
    if (pp) return { cls: "INJETADO", index: ctor.parameters.indexOf(pp), klass: c };
    const prop = c.members.find((m) => ts.isPropertyDeclaration(m) && m.name.getText() === field);
    if (prop) {
      if (prop.initializer) { const r = classify(prop.initializer, depth + 1); return { ...r, cls: r.cls === "INJETADO" ? "INJETADO" : `CAMPO-INICIALIZADO:${r.cls}`, note: `this.${field} =` }; }
      let assigned = null;
      ctor?.body?.forEachChild(function look(n) { if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isPropertyAccessExpression(n.left) && n.left.expression.kind === ts.SyntaxKind.ThisKeyword && n.left.name.text === field) assigned = n.right; else ts.forEachChild(n, look); });
      if (assigned) { const r = classify(assigned, depth + 1); if (r.cls === "INJETADO") return r; return { ...r, cls: `CAMPO-ATRIBUIDO:${r.cls}`, note: `this.${field} = (construtor)` }; }
      return { cls: `CAMPO-NAO-RASTREADO(this.${field})` };
    }
  }
  return { cls: `CAMPO-NAO-RASTREADO(this.${field})` };
}
function classify(expr, depth = 0) {
  if (!expr || depth > 8) return { cls: "OUTRO(profundidade)" };
  const e = unwrap(expr);
  if (ts.isPropertyAccessExpression(e) && accessorToTable.has(e.name.text)) return classify(e.expression, depth + 1);
  if (ts.isElementAccessExpression(e) && ts.isStringLiteralLike(e.argumentExpression) && accessorToTable.has(e.argumentExpression.text)) return classify(e.expression, depth + 1);
  if (ts.isPropertyAccessExpression(e) && e.expression.kind === ts.SyntaxKind.ThisKeyword) return classifyField(e, depth);
  if (ts.isIdentifier(e)) {
    const d = declOf(e); if (!d) return { cls: `OUTRO(${e.text} sem declaracao)` };
    if (ts.isParameter(d)) return classifyParam(d, e.text, depth);
    if (ts.isVariableDeclaration(d)) {
      const st = d.parent?.parent;
      if (st && ts.isVariableStatement(st) && ts.isSourceFile(st.parent)) return { cls: "CRU", note: `modulo ${rel(d.getSourceFile().fileName)}:${e.text}` };
      if (d.initializer) { const r = classify(d.initializer, depth + 1); return { ...r, note: `via alias ${e.text}${r.note ? " ← " + r.note : ""}` }; }
      return { cls: `OUTRO(${e.text} sem inicializador)` };
    }
    if (ts.isBindingElement(d)) {
      let p = d.parent; while (p && !ts.isVariableDeclaration(p) && !ts.isParameter(p)) p = p.parent;
      if (p && ts.isVariableDeclaration(p) && p.initializer) { const r = classify(p.initializer, depth + 1); return { ...r, note: `via desestruturacao ${e.text}` }; }
      if (p && ts.isParameter(p)) return classifyParam(p, e.text, depth);
      return { cls: "OUTRO(desestruturacao)" };
    }
    return { cls: `OUTRO(${e.text}:${ts.SyntaxKind[d.kind]})` };
  }
  if (ts.isAwaitExpression(e)) return classify(e.expression, depth + 1);
  if (ts.isCallExpression(e)) return { cls: `OUTRO(chamada ${nameOfCallee(e)}())` };
  if (ts.isNewExpression(e)) return { cls: "CRU", note: `new ${e.expression.getText()}` };
  if (ts.isPropertyAccessExpression(e)) return { cls: `OUTRO(${e.getText().replace(/\s+/g, "").slice(0, 40)})` };
  return { cls: `OUTRO(${ts.SyntaxKind[e.kind]})` };
}
function literalTablesIn(text) { const hit = []; for (const t of FORCE) if (new RegExp(`\\b${t}\\b`).test(text)) hit.push(t); return hit; }
function rawTables(node) { // tabelas citadas no SQL literal, ou numa constante string referenciada
  let text = node.getText(); const args = ts.isCallExpression(node) ? node.arguments : [];
  for (const a of args) { const u = unwrap(a); if (ts.isIdentifier(u)) { const d = declOf(u); if (d && ts.isVariableDeclaration(d) && d.initializer && ts.isStringLiteralLike(d.initializer)) text += " " + d.initializer.text; } }
  return literalTablesIn(text);
}

// ---------- L1: toda chamada a método de delegate de tabela FORCE, ou RAW ----------
const rows = []; const pushRow = (r) => rows.push(r);
for (const sf of program.getSourceFiles()) {
  if (sf.isDeclarationFile || !rootNames.includes(path.normalize(sf.fileName))) continue;
  const file = rel(sf.fileName);
  function emit(node, clientExpr, what, table, how) {
    const c = classify(clientExpr); const { klass, method } = enclosing(node);
    const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
    const recv = unwrap(clientExpr).getText(sf).replace(/\s+/g, "").slice(0, 40);
    const row = { loc: `${file}:${line}`, file, klass, method, recv, what, table, cls: c.cls, note: c.note ?? "", how };
    if (c.cls === "INJETADO") { row.klassNode = c.klass; row.index = c.index; if (!injected.has(c.klass)) injected.set(c.klass, new Set()); injected.get(c.klass).add(c.index); }
    pushRow(row);
  }
  function visit(node) {
    if (ts.isCallExpression(node) && (ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression))) {
      const callee = node.expression;
      const op = ts.isPropertyAccessExpression(callee) ? callee.name.text : ts.isStringLiteralLike(callee.argumentExpression) ? callee.argumentExpression.text : null;
      const target = unwrap(callee.expression);
      if (op && RAW.has(op)) { const tabs = rawTables(node); if (tabs.length) for (const t of tabs) emit(node, target, `RAW-SQL(${op})`, t, "literal"); else emit(node, target, `RAW-SQL(${op}) OPACO`, "?", "opaco"); }
      else if (op) {
        let model = null; const sig = checker.getResolvedSignature(node); const d = sig?.declaration;
        if (d) { let p = d.parent; while (p && !ts.isInterfaceDeclaration(p)) p = p.parent; if (p && /Delegate$/.test(p.name.text) && GENERATED.test(p.getSourceFile().fileName)) model = p.name.text.replace(/Delegate$/, ""); }
        if (!model) { const ty = checker.getTypeAtLocation(callee.expression); const sy = ty?.getSymbol?.() ?? ty?.symbol; const sd = sy?.declarations?.[0]; if (sy && /Delegate$/.test(sy.name) && sd && GENERATED.test(sd.getSourceFile().fileName) && OPS.has(op)) model = sy.name.replace(/Delegate$/, ""); }
        let acc = null; if (ts.isPropertyAccessExpression(target)) acc = target.name.text; else if (ts.isElementAccessExpression(target) && ts.isStringLiteralLike(target.argumentExpression)) acc = target.argumentExpression.text; else if (ts.isIdentifier(target)) acc = target.text;
        if (model) { const t = modelToTable.get(model); if (t && FORCE.has(t)) emit(node, target, `${model[0].toLowerCase() + model.slice(1)}.${op}`, t, "semantico"); }
        else if (acc && accessorToTable.has(acc) && OPS.has(op)) emit(node, target, `${acc}.${op}`, accessorToTable.get(acc), "sintatico");
        else if (OPS.has(op)) { const ty = checker.getTypeAtLocation(callee.expression); if (ty.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) emit(node, target, `?.${op}`, "?", "TIPO-DESCONHECIDO"); }
      }
    }
    if (ts.isTaggedTemplateExpression(node) && ts.isPropertyAccessExpression(node.tag) && RAW.has(node.tag.name.text)) {
      const tabs = literalTablesIn(node.getText()); const target = unwrap(node.tag.expression);
      if (tabs.length) for (const t of tabs) emit(node, target, `RAW-SQL(${node.tag.name.text})`, t, "literal"); else emit(node, target, `RAW-SQL(${node.tag.name.text}) OPACO`, "?", "opaco");
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
}
for (const r of rows) if (r.how === "TIPO-DESCONHECIDO" && !/^(SOB-CONTEXTO)$/.test(r.cls)) r.cls = `TIPO-DESCONHECIDO/${r.cls}`;

// ---------- L2: instanciações de classes (ou subclasses) com executor injetado, pelo SÍMBOLO ----------
const inst = []; let rodada = 0; let antes = -1;
while (injected.size !== antes && rodada < 4) { // lista de trabalho: classe que so REPASSA o campo injetado vira injetada e precisa de nova passada
rodada++; inst.length = 0; antes = injected.size;
for (const sf of program.getSourceFiles()) {
  if (sf.isDeclarationFile || !rootNames.includes(path.normalize(sf.fileName))) continue;
  const file = rel(sf.fileName);
  function visit(node) {
    if (ts.isNewExpression(node)) {
      const decl = classDeclOf(node.expression);
      if (decl) {
        const chain = classChain(decl);
        for (const c of chain) {
          if (!injected.has(c)) continue;
          for (const idx of injected.get(c)) {
            let arg = node.arguments?.[idx] ?? null; let note = "";
            // subclasse com construtor próprio: segue o super(...) até o argumento de `new`
            const own = ctorOf(decl);
            if (c !== decl && own) { let sup = null; own.body?.forEachChild(function look(n) { if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.SuperKeyword) sup = n; else ts.forEachChild(n, look); });
              const sa = sup?.arguments?.[idx] ? unwrap(sup.arguments[idx]) : null;
              if (sa && ts.isIdentifier(sa)) { const d = declOf(sa); if (d && ts.isParameter(d) && d.parent === own) { arg = node.arguments?.[own.parameters.indexOf(d)] ?? null; note = "via super()"; } else { arg = sa; note = "super() literal"; } }
              else if (sa) { arg = sa; note = "super() literal"; } }
            let r;
            if (arg) r = classify(arg); else { const p = ctorOf(c)?.parameters[idx]; r = p?.initializer ? { ...classify(p.initializer), note: "default do construtor" } : { cls: "OUTRO(sem argumento)" }; }
            const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
            if (r.cls === "INJETADO" && r.klass) { if (!injected.has(r.klass)) injected.set(r.klass, new Set()); injected.get(r.klass).add(r.index); }
            inst.push({ loc: `${file}:${line}`, file, klass: decl.name?.text ?? "(anonima)", base: c === decl ? "" : ` extends ${c.name?.text}`, arg: arg ? arg.getText(sf).replace(/\s+/g, "").slice(0, 40) : "", cls: r.cls, note: [r.note, note].filter(Boolean).join(" · "), injClass: c, injIdx: idx, upKlass: r.klass ?? null, upIdx: r.index ?? null });
          }
          break; // a primeira classe injetada na cadeia decide
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
}

}
// transitividade: `new K(this.<campo injetado de J>)` é SOB-CONTEXTO só se TODA instanciação de J em src o for (recursivo, com guarda)
function cleanUpstream(K, j, seen) {
  const ups = inst.filter((e) => e.injClass === K && e.injIdx === j); if (!ups.length) return "SEM-INSTANCIACAO-EM-SRC";
  for (const e of ups) {
    if (e.cls === "SOB-CONTEXTO" || e.cls.startsWith("SOB-CONTEXTO")) continue;
    if (e.cls === "INJETADO" && e.upKlass && !seen.has(e.upKlass)) { const r = cleanUpstream(e.upKlass, e.upIdx, new Set([...seen, K])); if (r === "ok") continue; return r; }
    return `SUSPEITO-ACIMA(${e.file}:new ${e.klass}(${e.arg}) ${e.cls})`;
  }
  return "ok";
}
for (const i of inst) if (i.cls === "INJETADO" && i.upKlass) { const r = cleanUpstream(i.upKlass, i.upIdx, new Set([i.injClass])); i.cls = r === "ok" ? `SOB-CONTEXTO(transitivo via ${i.upKlass.name?.text})` : `INJETADO-TRANSITIVO:${r}`; }

// ---------- saída ----------
const SUSPEITO_L1 = (cls) => cls !== "SOB-CONTEXTO" && cls !== "INJETADO";
const SUSPEITO_L2 = (cls) => !cls.startsWith("SOB-CONTEXTO");
const byCls = {}; for (const r of rows) byCls[r.cls.replace(/\(.*$/, "")] = (byCls[r.cls.replace(/\(.*$/, "")] ?? 0) + 1;
const instByCls = {}; for (const i of inst) instByCls[i.cls.replace(/\(.*$/, "")] = (instByCls[i.cls.replace(/\(.*$/, "")] ?? 0) + 1;
const diag = program.getSyntacticDiagnostics().length;
console.log(`# L0: tabelas ENABLE=${ENABLE.size} FORCE=${FORCE.size} · acessores Prisma em FORCE=${accessorToTable.size} · OPS(derivados)=${OPS.size} · arquivos no programa=${rootNames.length} (virtuais=${virtual.size}) · erros sintaticos=${diag}`);
console.log(`# L1: call-sites sobre tabelas FORCE (+ RAW) = ${rows.length} · por como: ${JSON.stringify(rows.reduce((a, r) => ((a[r.how] = (a[r.how] ?? 0) + 1), a), {}))}`);
console.log(`# L1 por classificação: ${JSON.stringify(byCls)}`);
console.log(`# L2: classes com executor injetado = ${injected.size}; instanciações achadas = ${inst.length}; rodadas L2 = ${rodada}`);
console.log(`# L2 por classificação do argumento: ${JSON.stringify(instByCls)}`);
const keys = new Map(); const add = (k) => keys.set(k, (keys.get(k) ?? 0) + 1);
for (const r of rows.filter((r) => SUSPEITO_L1(r.cls))) add(`L1\t${r.file}\t${r.klass ?? "-"}.${r.method ?? "-"}\t${r.recv}\t${r.what}\t${r.table}\t${r.cls}`);
for (const i of inst.filter((i) => SUSPEITO_L2(i.cls))) add(`L2\t${i.file}\tnew ${i.klass}${i.base}(${i.arg})\t${i.cls}`);
const inv = [...keys].map(([k, n]) => `${k}\t×${n}`).sort();
console.log(`# INVENTÁRIO SUSPEITO (L1+L2): ${inv.length} chaves · sha1=${createHash("sha1").update(inv.join("\n")).digest("hex")}`);
console.log(""); console.log("## INVENTÁRIO SUSPEITO (ratchet: chave sem número de linha; chave nova OU sumida = vermelho)");
for (const k of inv) console.log(k);
if (showAll) {
  console.log(""); console.log("## TODOS os call-sites (--all)");
  for (const r of rows) console.log(`${r.loc}\t${r.recv}\t${r.what}\t${r.table}\t${r.cls}\t${r.klass ?? ""}.${r.method ?? ""}\t${r.how}\t${r.note}`);
  console.log(""); console.log("## TODAS as instanciações (--all)");
  for (const i of inst) console.log(`${i.loc}\tnew ${i.klass}${i.base}(${i.arg})\t${i.cls}\t${i.note}`);
}
```

**Saída no `origin/main` (`5bcdcc58`; árvore `src/prisma` = `5b6e1036` = `3b1fe0f9`) — cabeçalho e as 53 chaves que o T13 congela (TAB-separado; ×n = multiplicidade):**

```text
# L0: tabelas ENABLE=106 FORCE=106 · acessores Prisma em FORCE=106 · OPS(derivados)=17 · arquivos no programa=777 (virtuais=0) · erros sintaticos=0
# L1: call-sites sobre tabelas FORCE (+ RAW) = 720 · por como: {"opaco":10,"literal":104,"semantico":578,"sintatico":28}
# L1 por classificação: {"PARAMETRO":22,"INJETADO":646,"$TRANSACTION-SEM-SETTER-PROVADO":6,"SOB-CONTEXTO":45,"CRU":1}
# L2: classes com executor injetado = 72; instanciações achadas = 452; rodadas L2 = 2
# L2 por classificação do argumento: {"SOB-CONTEXTO":416,"INJETADO-TRANSITIVO:SUSPEITO-ACIMA":2,"CRU":7,"PARAMETRO":20,"$TRANSACTION-SEM-SETTER-PROVADO":7}
# INVENTÁRIO SUSPEITO (L1+L2): 53 chaves · sha1=5c566532986c533416e880e70350fb5ea692f9e2

L1	src/database/financial-period-lock.ts	-.acquirePeriodLockExclusive	tx	RAW-SQL($executeRaw) OPACO	?	PARAMETRO(tx)	×1
L1	src/database/financial-period-lock.ts	-.acquirePeriodLockShared	tx	RAW-SQL($executeRaw) OPACO	?	PARAMETRO(tx)	×1
L1	src/database/rls.ts	-.setIdentityRlsContext	tx	RAW-SQL($executeRaw) OPACO	?	PARAMETRO(tx)	×1
L1	src/database/rls.ts	-.setIdentityRlsContext	tx	RAW-SQL($queryRaw)	auth_identity_links	PARAMETRO(tx)	×1
L1	src/database/rls.ts	-.setTenantRlsContext	client	RAW-SQL($executeRaw) OPACO	?	PARAMETRO(client)	×1
L1	src/modules/auth/repositories/identity-link.repository.ts	-.insertAuthIdentity	client.authIdentity	authIdentity.createMany	auth_identities	PARAMETRO(client)	×1
L1	src/modules/auth/repositories/login-candidates.repository.ts	-.listLoginCandidatesViaFunction	client	RAW-SQL($queryRaw) OPACO	?	PARAMETRO(client)	×1
L1	src/modules/auth/services/auth-session.service.ts	AuthSessionService.refreshSession	tx.user	user.findFirst	users	PARAMETRO(tx de callback de runWithTenantContext)	×1
L1	src/modules/auth/services/auth-session.service.ts	AuthSessionService.refreshSession	tx.userRoleAssignment	userRoleAssignment.findMany	user_role_assignments	PARAMETRO(tx de callback de runWithTenantContext)	×1
L1	src/modules/auth/services/identity-link.service.ts	IdentityLinkService.handlePasswordChange	tx	RAW-SQL($queryRaw)	auth_identity_links	$TRANSACTION-SEM-SETTER-PROVADO	×1
L1	src/modules/auth/services/identity-link.service.ts	IdentityLinkService.selectLinkOfPairForUpdate	tx	RAW-SQL($queryRaw)	auth_identity_links	PARAMETRO(tx)	×1
L1	src/modules/auth/services/identity-link.service.ts	IdentityLinkService.unlink	tx	RAW-SQL($queryRaw)	auth_identity_links	$TRANSACTION-SEM-SETTER-PROVADO	×2
L1	src/modules/auth/services/identity-resolver.ts	-.normalizePairIdentity	tx	RAW-SQL($executeRaw) OPACO	?	PARAMETRO(tx)	×3
L1	src/modules/auth/services/identity-resolver.ts	-.resolveIdentityIdForPair	tx	RAW-SQL($queryRaw)	auth_identity_links	PARAMETRO(tx)	×1
L1	src/modules/auth/services/login-readiness.ts	-.classifyLoginReadiness	client	RAW-SQL($queryRaw) OPACO	?	PARAMETRO(client)	×1
L1	src/modules/auth/services/session-admin.service.ts	SessionAdminService.resolveUserLabels	tx.user	user.findMany	users	PARAMETRO(tx)	×1
L1	src/modules/cloud-usage/cloud-usage.capture.ts	-.appendChecklistRunUsageInTx	client	RAW-SQL($executeRaw)	cloud_usage_events	PARAMETRO(client)	×1
L1	src/modules/commissions/work-order-cancellation.gate.ts	-.readWorkOrderCancellationPrisma	executor.workOrder	workOrder.findFirst	work_orders	PARAMETRO(executor)	×1
L1	src/modules/core-saas/services/prisma-core-saas.service.ts	PrismaCoreSaasService.listTenantsForIdentity	tx.user	user.findFirst	users	$TRANSACTION-SEM-SETTER-PROVADO	×1
L1	src/modules/financial-period-closes/financial-period-close-prisma.repository.ts	PrismaFinancialPeriodCloseStore.readCompetencia	tx.financialEntry	financialEntry.findMany	financial_entries	PARAMETRO(tx)	×1
L1	src/modules/financial-period-closes/financial-period-close-prisma.repository.ts	PrismaFinancialPeriodCloseStore.readCompetencia	tx.financialTitle	financialTitle.findMany	financial_titles	PARAMETRO(tx)	×1
L1	src/modules/impound/impound.outbox.repository.ts	-.appendOutboxEventTx	client.impoundOutboxEvent	impoundOutboxEvent.create	impound_outbox_events	PARAMETRO(client)	×1
L1	src/modules/impound/impound.outbox.repository.ts	-.listOutboxEventsTx	client.impoundOutboxEvent	impoundOutboxEvent.findMany	impound_outbox_events	PARAMETRO(client)	×1
L1	src/modules/work-orders/work-order-prisma.repository.ts	PrismaWorkOrderRepository.assign	tx.workOrder	workOrder.updateManyAndReturn	work_orders	$TRANSACTION-SEM-SETTER-PROVADO	×1
L1	src/modules/work-orders/work-order-prisma.repository.ts	PrismaWorkOrderRepository.assign	tx.workOrderAssignment	workOrderAssignment.create	work_order_assignments	$TRANSACTION-SEM-SETTER-PROVADO	×1
L1	src/routes/health.routes.ts	-.checkPostgres	prisma	RAW-SQL($queryRawUnsafe) OPACO	?	CRU	×1
L2	src/modules/auth/auth-runtime.ts	new AuditLogRepository(tx)	PARAMETRO(tx)	×2
L2	src/modules/auth/auth-runtime.ts	new LocalAuthCredentialRepository(tx)	PARAMETRO(tx)	×1
L2	src/modules/auth/auth-runtime.ts	new UserRepository(tx)	PARAMETRO(tx)	×1
L2	src/modules/auth/auth-runtime.ts	new UserRoleRepository(tx)	PARAMETRO(tx)	×1
L2	src/modules/auth/services/auth-session.service.ts	new AuthSessionRepository(tx)	PARAMETRO(tx de callback de runWithTenantContext)	×3
L2	src/modules/auth/services/identity-link.service.ts	new AuditLogRepository(tx)	PARAMETRO(tx)	×1
L2	src/modules/auth/services/identity-link.service.ts	new AuthSessionRepository(tx)	$TRANSACTION-SEM-SETTER-PROVADO	×1
L2	src/modules/auth/services/identity-link.service.ts	new AuthSessionRepository(tx)	PARAMETRO(tx)	×1
L2	src/modules/auth/services/identity-link.service.ts	new IdentityLinkEventRepository(tx)	PARAMETRO(tx)	×1
L2	src/modules/auth/services/identity-link.service.ts	new IdentityLinkRepository(tx)	$TRANSACTION-SEM-SETTER-PROVADO	×4
L2	src/modules/auth/services/identity-link.service.ts	new IdentityLinkRepository(tx)	PARAMETRO(tx)	×1
L2	src/modules/auth/services/identity-resolver.ts	new IdentityLinkEventRepository(tx)	PARAMETRO(tx)	×1
L2	src/modules/auth/services/identity-resolver.ts	new IdentityLinkRepository(tx)	PARAMETRO(tx)	×1
L2	src/modules/auth/services/local-auth-credential.service.ts	new LocalAuthCredentialRepository(tx)	PARAMETRO(tx de callback de handlePasswordChange)	×1
L2	src/modules/auth/services/session-admin.service.ts	new AuditLogRepository(tx)	PARAMETRO(tx)	×1
L2	src/modules/auth/services/session-admin.service.ts	new AuthSessionRepository(tx)	PARAMETRO(tx de callback de runWithTenantContext)	×3
L2	src/modules/cloud-charges/cloud-charge-prisma.repository.ts	new PrismaCloudChargeRepository(prisma)	CRU	×1
L2	src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.ts	new PrismaCloudCostAllocationRepository(prisma)	CRU	×1
L2	src/modules/cloud-usage/cloud-usage-prisma.repository.ts	new PrismaCloudUsageRepository(this.prismaClient)	INJETADO-TRANSITIVO:SUSPEITO-ACIMA(src/modules/cloud-usage/cloud-usage-prisma.repository.ts:new RlsPrismaCloudUsageRepository(prisma) CRU)	×2
L2	src/modules/cloud-usage/cloud-usage-prisma.repository.ts	new RlsPrismaCloudUsageRepository(prisma)	CRU	×1
L2	src/modules/core-saas/services/prisma-core-saas.service.ts	new IdentityLinkRepository(tx)	$TRANSACTION-SEM-SETTER-PROVADO	×1
L2	src/modules/core-saas/store/prisma-core-saas.store.ts	new AuditLogRepository()	CRU	×1
L2	src/modules/core-saas/store/prisma-core-saas.store.ts	new AuditLogRepository(tx)	$TRANSACTION-SEM-SETTER-PROVADO	×1
L2	src/modules/core-saas/store/prisma-core-saas.store.ts	new RoleRepository()	CRU	×1
L2	src/modules/core-saas/store/prisma-core-saas.store.ts	new UserRepository()	CRU	×1
L2	src/modules/core-saas/store/prisma-core-saas.store.ts	new UserRoleRepository()	CRU	×1
L2	src/modules/financial-titles/financial-title-prisma.repository.ts	new PrismaFinancialPeriodCloseRepository(tx)	PARAMETRO(tx)	×1
```

---

## Apêndice B — medição sob papel real (22 itens) — referência e re-execução

O script é o **Apêndice B da v2**, inalterado: `git show c727156:docs/revisoes/SAN3/B-SAN3-05-plano.md | awk '/^## Apêndice B/{d=1} d&&/^```ts$/{f=1;next} d&&f&&/^```$/{exit} d&&f' | md5sum` → `6204643a81fb5d2305f09ff38b89f9de` (extraído e conferido por mim). Re-executado nesta v3 (relatório §4): `cd /home/user/wt-plan-v3 && ADMIN_URL=postgresql://postgres@127.0.0.1:54371/erp_v3?schema=public npx tsx <arquivo>` → `# 22 itens, 0 fora do esperado` (ec=0); limpeza `0 0 0 0`. Mede a trava **v1** (G1–G4) e os sítios P1–P7/R1; a trava **v3** está medida no relatório §4 (xi)/(xii) e no §4.2 deste plano. O roteiro HTTP (T11a) está no relatório §7 (`$SCR/diff-http.mts`: 50 × vazio).

---

## Apêndice C — `scripts/db-runtime-role.sh` v3 (verbatim)

md5: `810c1c4a2552665d4947bf0ef4e93670` · 115 linhas · modo `100755` · `.gitattributes`: `scripts/db-runtime-role.sh text eol=lf`. Extração (ancorada: o primeiro bloco ```bash do plano é o snippet do §11, **não** este apêndice): `awk '/^## Apêndice C/{d=1} d&&/^```bash$/{f=1;next} d&&f&&/^```$/{exit} d&&f' docs/revisoes/SAN3/B-SAN3-05-plano.md | md5sum`. Executado em 18 cenários (relatório §4, §6).

```bash
#!/usr/bin/env bash
# B-SAN3-05 (v3) — cria/converge o PAPEL DE RUNTIME da API: LOGIN, NOSUPERUSER, NOBYPASSRLS, NOREPLICATION, sem posse de
# tabela FORCE RLS, sem pertenca (direta ou por cadeia) a papel que escape de RLS, sem SELECT em view de dono que escapa;
# so DML + USAGE em sequencias. Idempotente. FALHA (psql ec=3, ROLLBACK de tudo) nomeando o MODO se nao puder corrigir.
#
# A SENHA NOVA NUNCA aparece em argv, no terminal nem no log do servidor (critica r2, F2-02):
#   - entra no psql por `\set` com backtick (`printf` builtin do sh — nao ha exec, nao ha argv);
#   - vai ao servidor UMA vez, num `set_config` (statement que so e logado sob log_statement=all / log_min_duration_statement=0,
#     que este script RECUSA antes de enviar a senha, salvo DB_RUNTIME_ALLOW_LOG_ALL=1 — decisao consciente do dono);
#   - os EXECUTE que a carregam ficam em bloco proprio BEGIN/EXCEPTION: o CONTEXT do erro re-emitido nao traz o SQL dinamico;
#   - e definida POR ULTIMO, depois de tudo o que podia falhar;
#   - exposicao residual DECLARADA: /proc/<pid>/environ do psql (mesma classe de PGPASSWORD; legivel so pelo mesmo usuario/root).
# Entradas (ambiente): DB_RUNTIME_ROLE (default erp_runtime) · DB_RUNTIME_PASSWORD (obrigatoria; sem quebra de linha)
#   · DB_MIGRATOR_ROLE (default: o usuario desta conexao) · DB_RUNTIME_ALLOW_LOG_ALL (default 0)
# Conexao: no initdb.d do postgres:16 usa POSTGRES_USER/POSTGRES_DB (socket local); fora dele, PGHOST/PGPORT/PGUSER/
#   PGPASSWORD/PGDATABASE (PGDATABASE obrigatoria: GRANTs e DEFAULT PRIVILEGES sao POR BANCO — o banco da app).
# Modos de falha (todos nomeados na mensagem, nenhum com a senha): MODO 1 sem CREATEROLE · MODO 2 atributo que o executor nao
#   pode tirar · MODO 3 tabela/sequencia alheia ou POSSE de tabela FORCE · MODO 4 papel ja existe e o executor nao tem ADMIN
#   OPTION · MODO 5 pertenca que o executor nao pode revogar · MODO 6 view de dono que escapa com SELECT para o papel.
# Todo o corpo roda numa FUNCAO em SUBSHELL (source pelo entrypoint nao vaza set -u/exit); versionar com modo 100755 e
#   `.gitattributes` eol=lf (CRLF quebra o bash do conteiner — critica r2, N2-03).
db_runtime_role_main() (
  set -euo pipefail
  : "${DB_RUNTIME_PASSWORD:?DB_RUNTIME_PASSWORD obrigatória}"
  local role="${DB_RUNTIME_ROLE:-erp_runtime}" migrator="${DB_MIGRATOR_ROLE:-}" allow_log_all="${DB_RUNTIME_ALLOW_LOG_ALL:-0}"
  local -a conn=()
  if [ -n "${POSTGRES_DB:-}" ]; then conn=(--username "${POSTGRES_USER:-postgres}" --dbname "$POSTGRES_DB")
  else : "${PGDATABASE:?PGDATABASE obrigatória (o banco da aplicação)}"; fi
  export DB_RUNTIME_PASSWORD
  psql -X -v ON_ERROR_STOP=1 -At "${conn[@]}" -v role="$role" -v migrator="$migrator" -v allow_log_all="$allow_log_all" <<'SQL'
SELECT set_config('san3.role', :'role', false), set_config('san3.allow_log_all', :'allow_log_all', false),
       set_config('san3.migrator', coalesce(nullif(:'migrator', ''), current_user::text), false) \gset _
-- (0) ANTES de a senha ir ao servidor: ele registraria o texto de todo statement?
DO $$ BEGIN
  IF current_setting('san3.allow_log_all') IS DISTINCT FROM '1'
     AND (current_setting('log_statement') = 'all' OR current_setting('log_min_duration_statement') = '0') THEN
    RAISE EXCEPTION 'MODO 0 — o servidor registra o texto de todo statement (log_statement=%, log_min_duration_statement=%): a senha nova iria ao log. Desligue isso (superusuario: ALTER SYSTEM SET ... / ALTER DATABASE ... SET ...) ou aceite conscientemente com DB_RUNTIME_ALLOW_LOG_ALL=1', current_setting('log_statement'), current_setting('log_min_duration_statement');
  END IF; END $$;
-- (1) a senha entra pelo psql, nao pelo argv
\set password `printf '%s' "$DB_RUNTIME_PASSWORD"`
SELECT set_config('san3.password', :'password', false) \gset _
\unset password
DO $$
DECLARE
  v_role text := current_setting('san3.role'); v_password text := current_setting('san3.password'); v_migrator text := current_setting('san3.migrator');
  me pg_roles%ROWTYPE; alvo pg_roles%ROWTYPE; r record; n int; vias text;
BEGIN
  SELECT * INTO me FROM pg_roles WHERE rolname = current_user;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = v_role) THEN
    BEGIN EXECUTE format('CREATE ROLE %I LOGIN NOINHERIT', v_role);
    EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'MODO 1 — nao foi possivel criar o papel % (% %): o executor % precisa de CREATEROLE — decisao de provedor', v_role, SQLSTATE, SQLERRM, current_user; END;
  ELSIF NOT (me.rolsuper OR pg_has_role(current_user, v_role, 'MEMBER WITH ADMIN OPTION')) THEN
    RAISE EXCEPTION 'MODO 4 — o papel % ja existe e % nao tem ADMIN OPTION sobre ele (foi criado por outro executor): use outro nome (DB_RUNTIME_ROLE) ou, com a credencial que o criou, GRANT % TO % WITH ADMIN OPTION e rode de novo', v_role, current_user, v_role, current_user;
  END IF;
  SELECT * INTO alvo FROM pg_roles WHERE rolname = v_role;
  -- atributos que escapam ou excedem: corrige se este executor puder; senao FALHA nomeando (MODO 2)
  IF alvo.rolsuper       THEN IF me.rolsuper       THEN EXECUTE format('ALTER ROLE %I NOSUPERUSER', v_role);   ELSE RAISE EXCEPTION 'MODO 2 — papel % tem SUPERUSER e % nao pode remover (precisa de SUPERUSER): corrija com outro executor ou use outro nome', v_role, current_user; END IF; END IF;
  IF alvo.rolbypassrls   THEN IF me.rolbypassrls   THEN EXECUTE format('ALTER ROLE %I NOBYPASSRLS', v_role);   ELSE RAISE EXCEPTION 'MODO 2 — papel % tem BYPASSRLS e % nao pode remover (precisa de BYPASSRLS)', v_role, current_user; END IF; END IF;
  IF alvo.rolreplication THEN IF me.rolsuper       THEN EXECUTE format('ALTER ROLE %I NOREPLICATION', v_role); ELSE RAISE EXCEPTION 'MODO 2 — papel % tem REPLICATION e % nao pode remover (precisa de SUPERUSER)', v_role, current_user; END IF; END IF;
  IF alvo.rolcreatedb    THEN IF me.rolcreatedb    THEN EXECUTE format('ALTER ROLE %I NOCREATEDB', v_role);    ELSE RAISE EXCEPTION 'MODO 2 — papel % tem CREATEDB e % nao pode remover', v_role, current_user; END IF; END IF;
  IF alvo.rolcreaterole  THEN IF me.rolcreaterole  THEN EXECUTE format('ALTER ROLE %I NOCREATEROLE', v_role);  ELSE RAISE EXCEPTION 'MODO 2 — papel % tem CREATEROLE e % nao pode remover', v_role, current_user; END IF; END IF;
  EXECUTE format('ALTER ROLE %I WITH LOGIN NOINHERIT', v_role);
  -- pertenca: revoga o PRIMEIRO SALTO de toda cadeia que leve a papel que escapa (atributo, papel de servidor, dono de tabela FORCE)
  FOR r IN SELECT m.roleid::regrole::text AS direto FROM pg_auth_members m WHERE m.member = alvo.oid
             AND (EXISTS (SELECT 1 FROM pg_roles b WHERE (b.rolsuper OR b.rolbypassrls OR b.rolreplication OR b.rolname IN ('pg_execute_server_program','pg_read_server_files','pg_write_server_files')) AND pg_has_role(m.roleid, b.oid, 'MEMBER'))
                  OR EXISTS (SELECT 1 FROM pg_class c WHERE c.relkind IN ('r','p') AND c.relforcerowsecurity AND pg_has_role(m.roleid, c.relowner, 'MEMBER')))
  LOOP
    BEGIN EXECUTE format('REVOKE %s FROM %I', r.direto, v_role);
    EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'MODO 5 — a pertenca de % a % (que leva a papel que escapa de RLS) nao pode ser revogada por % (% %): com credencial que tenha ADMIN OPTION sobre %, REVOKE % FROM % e rode de novo', v_role, r.direto, current_user, SQLSTATE, SQLERRM, r.direto, r.direto, v_role; END;
  END LOOP;
  -- privilegios: so DML + USAGE/SELECT em sequencias (existentes) e DEFAULT PRIVILEGES do migrador (futuras)
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), v_role);
  EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', v_role);
  FOR r IN SELECT c.relname, c.relkind, pg_get_userbyid(c.relowner) AS dono, pg_has_role(current_user, c.relowner, 'USAGE') AS posso
           FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
           WHERE ns.nspname = 'public' AND c.relkind IN ('r','p','S') ORDER BY c.relname
  LOOP
    IF NOT r.posso THEN RAISE EXCEPTION 'MODO 3 — tabela/sequencia public.% pertence a % e % nao pode conceder DML nela: ALTER ... OWNER TO % e rode de novo', r.relname, r.dono, current_user, v_migrator; END IF;
    IF r.relkind = 'S' THEN EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO %I', r.relname, v_role);
    ELSE EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO %I', r.relname, v_role); END IF;
  END LOOP;
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I', v_migrator, v_role);
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO %I', v_migrator, v_role);
  -- AUTO-VERIFICACAO = a propriedade da trava de boot (v3), avaliada para o papel, com a VIA de cada linha
  SELECT string_agg(via || ':' || nome, ', ' ORDER BY via, nome), count(*) INTO vias, n FROM (
    SELECT 'atributo' AS via, b.rolname::text AS nome FROM pg_roles b
     WHERE (b.rolsuper OR b.rolbypassrls OR b.rolreplication OR b.rolname IN ('pg_execute_server_program','pg_read_server_files','pg_write_server_files')) AND pg_has_role(alvo.oid, b.oid, 'MEMBER')
    UNION ALL
    SELECT DISTINCT 'posse', o.rolname::text FROM pg_class c JOIN pg_roles o ON o.oid = c.relowner
     WHERE c.relkind IN ('r','p') AND c.relforcerowsecurity AND pg_has_role(alvo.oid, c.relowner, 'MEMBER')
    UNION ALL
    SELECT DISTINCT 'view', v.relname::text FROM pg_class v JOIN pg_roles o ON o.oid = v.relowner
      JOIN pg_rewrite rw ON rw.ev_class = v.oid
      JOIN pg_depend d ON d.classid = 'pg_rewrite'::regclass AND d.objid = rw.oid AND d.refclassid = 'pg_class'::regclass
      JOIN pg_class t ON t.oid = d.refobjid AND t.relkind IN ('r','p') AND t.relforcerowsecurity
     WHERE v.relkind IN ('v','m') AND (o.rolsuper OR o.rolbypassrls) AND has_table_privilege(alvo.oid, v.oid, 'SELECT')
  ) q;
  IF n > 0 THEN
    RAISE EXCEPTION 'papel % ainda escapa de RLS por % via(s): %. posse → ALTER TABLE ... OWNER TO % e rode de novo (MODO 3); view de dono que escapa → REVOKE SELECT ON <view> FROM % ou troque o dono da view (MODO 6)', v_role, n, vias, v_migrator, v_role;
  END IF;
  -- SENHA POR ULTIMO: tudo o que podia falhar ja passou; um erro aqui e re-emitido SEM o SQL dinamico
  BEGIN EXECUTE format('ALTER ROLE %I WITH PASSWORD %L', v_role, v_password);
  EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'nao foi possivel definir a senha do papel % (% %)', v_role, SQLSTATE, SQLERRM; END;
END $$;
SELECT set_config('san3.password', '', false) \gset _
-- linha final (uma so, -At): rolname|rolsuper|rolbypassrls|rolreplication|escapa_por_pertenca|posse_force|views_de_dono_que_escapa|tabelas_com_dml
SELECT r.rolname, r.rolsuper, r.rolbypassrls, r.rolreplication,
       EXISTS (SELECT 1 FROM pg_roles b WHERE (b.rolsuper OR b.rolbypassrls OR b.rolreplication OR b.rolname IN ('pg_execute_server_program','pg_read_server_files','pg_write_server_files')) AND pg_has_role(r.oid, b.oid, 'MEMBER')) AS escapa,
       (SELECT count(*) FROM pg_class c WHERE c.relkind IN ('r','p') AND c.relforcerowsecurity AND pg_has_role(r.oid, c.relowner, 'MEMBER')) AS posse,
       (SELECT count(DISTINCT v.oid) FROM pg_class v JOIN pg_roles o ON o.oid = v.relowner JOIN pg_rewrite rw ON rw.ev_class = v.oid JOIN pg_depend d ON d.classid = 'pg_rewrite'::regclass AND d.objid = rw.oid AND d.refclassid = 'pg_class'::regclass JOIN pg_class t ON t.oid = d.refobjid AND t.relkind IN ('r','p') AND t.relforcerowsecurity WHERE v.relkind IN ('v','m') AND (o.rolsuper OR o.rolbypassrls) AND has_table_privilege(r.oid, v.oid, 'SELECT')) AS views,
       (SELECT count(*) FROM pg_tables t WHERE t.schemaname = 'public' AND has_table_privilege(r.oid, format('%I.%I', t.schemaname, t.tablename), 'SELECT,INSERT,UPDATE,DELETE')) AS dml
FROM pg_roles r WHERE r.rolname = :'role';
SQL
)
db_runtime_role_main "$@"
```

---

## Apêndice D — fixtures de mutação do T13 (`tests/fixtures/san3-05-mutacoes/`)

**As 17 da r1** são as do Apêndice D da v2, verbatim — extraíveis de `git show c727156:docs/revisoes/SAN3/B-SAN3-05-plano.md` (blocos ```ts após "## Apêndice D"); md5 de cada arquivo extraído por mim:

```text
Ma_alias.ts 6cf8d7e8374ef2ea23f1523aa7c3d615
Mb_destructure.ts 2e2c30e81d9cb94001a85875879bce15
Mc_element.ts a19c1b30b8bde23c3c29654fd95361e3
Md_tx_sem_setter.ts 039c509874d6db6b4ff169a24140a029
Me_root_dentro_wrapper.ts f98a4d11a94949d748755a625f51fb4c
Mf_new_como_argumento.ts 0c9c319f68147f0399ba0f332ac4ab4e
Mg_subclasse.ts 633f2fcbe3bc9936a1868c25ba7ed46e
Mh_funcao_livre_client.ts d0d6aaa82e8e8a7aad2d6927ee3bde78
Mi_sql_em_constante.ts 8773c3307ff13f566f82b895c91278bc
Mj_campo_arrow.ts e96c1c91779c9145216f96a14e40fe5a
Mk_fabrica_param_tx.ts db99d6d69a88dada89fb693119ac6c7b
Ml_mutacao_do_plano.ts 999b52b114ae0cc36c628b4722bd61f4
Mm_getter_prisma.ts 8095b4256cfbddd4c3ba09e20185fd98
Mn_membro_nao_previsto.ts 6e17d142ac5ad8b1140663fedfc83430
Mo_tx_param_helper.ts 4b6e8320893f28667af0fee2252b758c
Mp_this_client_fora_de_classe_injetada.ts b1c9374be29e766d33ba3d302ec5b662
Mq_updateManyAndReturn.ts e66e0c0a17b6eb55eb096162cef83ec6
```

**As 10 novas** (N01–N09 escritas a partir das descrições da r2, §2.1; N10 do A24), verbatim; md5:

```text
N01_destructure_renomeado.ts 009892f92d808c44f2b15e73ecaa3b5d
N02_alias_do_delegate.ts ef740e96f7ce43e000bae847d163c85c
N03_new_via_namespace.ts b3b77ae89236786a409bfed34753b82f
N04_import_renomeado.ts f731eefd9e26c17f3ccd216fd6997fc5
N05_setter_condicional.ts e8f756a3b5ea2e3f9556c8f000ce5968
N06_setter_no_cliente_errado.ts ba050b712e25543ffc8d0c4027d5ba99
N07_delegate_como_argumento.ts 6360b8bd8ee5c61c60d7ee16c0213c56
N08_subclasse_via_namespace.ts 9df45de0d1dfcb8439e2b46f81f56b5d
N09_setter_em_comentario.ts 65c3053864e1bd0de2a05c955888598d
N10_any.ts 578a3a6d3d26aea7343f0c3fa6f49275
```

**`N01_destructure_renomeado.ts`**

```ts
import { prisma } from "../../database/prisma.js";
export async function platformList() { const { cloudUsageEvent: ev } = prisma; return ev.findMany({}); }
```

**`N02_alias_do_delegate.ts`**

```ts
import { prisma } from "../../database/prisma.js";
export async function platformList() { const ev = prisma.cloudUsageEvent; return ev.findMany({}); }
```

**`N03_new_via_namespace.ts`**

```ts
import { prisma } from "../../database/prisma.js";
import * as cu from "../cloud-usage/cloud-usage-prisma.repository.js";
export function run() { return new cu.PrismaCloudUsageRepository(prisma).listEvents({}); }
```

**`N04_import_renomeado.ts`**

```ts
import { prisma } from "../../database/prisma.js";
import { PrismaCloudUsageRepository as UsageRepo } from "../cloud-usage/cloud-usage-prisma.repository.js";
export function run() { return new UsageRepo(prisma).listEvents({}); }
```

**`N05_setter_condicional.ts`**

```ts
import { prisma } from "../../database/prisma.js";
import { setTenantRlsContext } from "../../database/rls.js";
export async function platformList(tenantId?: string) {
  return prisma.$transaction(async (tx) => { if (tenantId) await setTenantRlsContext(tx, tenantId); return tx.cloudUsageEvent.findMany({}); });
}
```

**`N06_setter_no_cliente_errado.ts`**

```ts
import { prisma } from "../../database/prisma.js";
import { setTenantRlsContext } from "../../database/rls.js";
export async function platformList(id: string) {
  return prisma.$transaction(async (tx) => { await setTenantRlsContext(prisma, id); return tx.cloudUsageEvent.findMany({}); });
}
```

**`N07_delegate_como_argumento.ts`**

```ts
import { prisma } from "../../database/prisma.js";
function paginate(d: typeof prisma.cloudUsageEvent) { return d.findMany({ take: 50 }); }
export function run() { return paginate(prisma.cloudUsageEvent); }
```

**`N08_subclasse_via_namespace.ts`**

```ts
import { prisma } from "../../database/prisma.js";
import * as cc from "../cloud-charges/cloud-charge-prisma.repository.js";
class Sub extends cc.PrismaCloudChargeRepository {}
export function run() { return new Sub(prisma).listTenantCharges("x"); }
```

**`N09_setter_em_comentario.ts`**

```ts
import { prisma } from "../../database/prisma.js";
export async function platformList() {
  return prisma.$transaction(async (tx) => {
    // sem setTenantRlsContext( aqui
    return tx.cloudUsageEvent.findMany({});
  });
}
```

**`N10_any.ts`**

```ts
import { prisma } from "../../database/prisma.js";
export async function platformList() { return (prisma as any).cloudUsageEvent.findMany({}); }
```

Cada arquivo é servido ao gerador como arquivo **virtual** em `src/modules/zz-mut/<nome>.ts` (`--mutant`), num só programa; o gerador tem de atribuir **≥ 1** chave a cada um (medido: 27/27). O 28.º subteste ("sumida") usa `--override src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.ts=<cópia com 'prisma as never'>` e espera `novas=1 sumidas=1`.

---

## Apêndice E — `RUNTIME_ROLE_GUARD_SQL` v3 (verbatim; = §2.2(a))

md5: `36650de53be8504c76deef74ecc78811` · `grep -c session_user` → 8. Extração (ancorada): `awk '/^## Apêndice E/{d=1} d&&/^```sql$/{f=1;next} d&&f&&/^```$/{exit} d&&f' docs/revisoes/SAN3/B-SAN3-05-plano.md | md5sum`.

```sql
SELECT via, rolname, rolsuper, rolbypassrls, is_self, objetos
FROM (
  SELECT 'atributo'::text AS via, r.rolname::text, r.rolsuper, r.rolbypassrls,
         (r.rolname = session_user OR r.rolname = current_user) AS is_self, NULL::int AS objetos
  FROM pg_roles r
  WHERE (r.rolsuper OR r.rolbypassrls OR r.rolreplication
         OR r.rolname IN ('pg_execute_server_program', 'pg_read_server_files', 'pg_write_server_files'))
    AND (pg_has_role(session_user, r.oid, 'MEMBER') OR pg_has_role(current_user, r.oid, 'MEMBER'))
  UNION ALL
  SELECT 'posse', o.rolname::text, o.rolsuper, o.rolbypassrls,
         (o.rolname = session_user OR o.rolname = current_user), count(*)::int
  FROM pg_class c JOIN pg_roles o ON o.oid = c.relowner
  WHERE c.relkind IN ('r', 'p') AND c.relforcerowsecurity
    AND (pg_has_role(session_user, c.relowner, 'MEMBER') OR pg_has_role(current_user, c.relowner, 'MEMBER'))
  GROUP BY o.rolname, o.rolsuper, o.rolbypassrls, (o.rolname = session_user OR o.rolname = current_user)
  UNION ALL
  SELECT 'view', o.rolname::text, o.rolsuper, o.rolbypassrls,
         (o.rolname = session_user OR o.rolname = current_user), count(DISTINCT v.oid)::int
  FROM pg_class v JOIN pg_roles o ON o.oid = v.relowner
  JOIN pg_rewrite rw ON rw.ev_class = v.oid
  JOIN pg_depend d ON d.classid = 'pg_rewrite'::regclass AND d.objid = rw.oid AND d.refclassid = 'pg_class'::regclass
  JOIN pg_class t ON t.oid = d.refobjid AND t.relkind IN ('r', 'p') AND t.relforcerowsecurity
  WHERE v.relkind IN ('v', 'm') AND (o.rolsuper OR o.rolbypassrls)
    AND (has_table_privilege(session_user, v.oid, 'SELECT') OR has_table_privilege(current_user, v.oid, 'SELECT'))
  GROUP BY o.rolname, o.rolsuper, o.rolbypassrls, (o.rolname = session_user OR o.rolname = current_user)
) x ORDER BY via, rolname
```

---

## Ciclo 2 — planejador-ciclo2-b-san3-05 · GPT-5.6 Sol

> **Papel e separação:** `planejador-mestre`; identidade nova `planejador-ciclo2-b-san3-05` — não achou, não
> desenvolveu e não votou no ciclo 1; não escreve código de produto nem teste e não desenvolverá este plano
> (§C7.4-bis). **Modelo:** GPT-5.6 Sol, substituição expressamente determinada pelo dono em 2026-10-08: o
> bloco não toca dinheiro; Fable/GPT-6 Astra ficam reservados aos blocos de dinheiro.

> **Sucessor (P3) — `planejador-ciclo2-b-san3-05-sucessor` · Claude Opus · 2026-10-08.** O antecessor caiu por
> limite de uso às 14:57Z, com o C2.1 escrito e C2.2–C2.6 em apuração (versionado em `cd267978`). Identidade
> nova: não achou, não desenvolveu, não votou e não desenvolverá (§C7.4-bis). **Modelo:** Claude Opus,
> substituição declarada (§C7 item 6-bis): o bloco não toca dinheiro e, por decisão do dono de 2026-10-08,
> Fable só em bloco de dinheiro. **Objeto re-medido por mim:** `git -C C:/Users/AMP/w-o05 rev-parse HEAD` =
> `git ls-remote origin fix/runtime-role-sem-bypass` = `cd267978eb44a195497b2dfec6f663e96df06f79`;
> `git diff --stat c251c9b7 cd267978` = só este plano (+133), logo o código julgado é o mesmo que o antecessor
> mediu. `origin/main` andou para `c8af6458` (merge-base continua `b404815c`). **Protocolo:** o C2.1 abaixo é
> roteiro, não fato — cada vermelho-controle foi re-executado por mim em recursos `pl05c2s-*` (PostgreSQL 16.14
> descartável, imagem `erp-junta-node20-pg16:local` `sha256:4203157f95ea`, sem porta no host; `erp-postgres`,
> `erp-redis`, 5432 e 6379 nunca tocados), e o resultado vai como **"Re-execução do sucessor"** em cada B, com
> a divergência apontada quando houver. Sondas e saídas: `C:/Users/AMP/w-o05/scratchpad/pl05c2s/` (não
> rastreado; `evidencia.md` com comando → saída → veredito parcial por item).

**Objeto medido.** `git -C C:/Users/AMP/w-o05 rev-parse HEAD` e
`git -C C:/Users/AMP/w-o05 ls-remote origin fix/runtime-role-sem-bypass` devolveram, ambos,
`c251c9b7aaa8610799796713d6135c711dabb9fe`; merge-base com a `main` =
`b404815ce3d1f1b8e5121bd1526978f7222e7479`. A árvore só tinha este plano modificado. O `CLAUDE.md` do
objeto ainda não contém `D-GOV-PROPORCIONAL` (`grep -c` = 0), enquanto a fonte governante atual
`origin/main@749a5cf825be76415953d26e8b849a4fb5213c41` contém o §C7 item 8. A divergência é declarada, não
consolidada em silêncio (§A2/A7); a ordem atual do dono manda aplicar a regra da `main` ao PR em voo #405.

**Regra do ciclo.** Este é bloco de **segurança/permissão**: junta completa, inspetor + três cadeiras novas,
**unanimidade de 3**. Pelo §C7 item 8(2), o ciclo 2 é o **último** no qual achado não grave pode bloquear;
do ciclo 3 em diante só defeito grave de produto — perda/vazamento de dados, quebra de permissão ou dinheiro —
bloqueia. Pelo item 8(5), KPI está **congelado**: o desenvolvimento restaura os quatro arquivos hoje no diff
(`Kpis/app.js`, `Kpis/kpis-latest.json`, `Kpis/kpis-history.json`, `Kpis/kpis-history.md`) byte a byte para
`origin/main@749a5cf…`; não publica número, bloco nem histórico novo, e a junta não cobra KPI.

### C2.1 Bloqueantes re-medidos e propriedades de correção

#### B1 — A4 = F-C2-01 · a senha em claro cruza o canal que o servidor amostra

- **Vermelho-controle re-medido no objeto:** em PostgreSQL 16 descartável `pl05c2-log-pg`, com
  `log_transaction_sample_rate=1`, executar o `scripts/db-runtime-role.sh` do `c251…` produziu
  `script_ec=0` e `secret_occurrences_server_log=1`; a linha final do papel foi verde. Comando: sonda Docker
  sob `timeout 180s`, imagem `postgres:16`, script montado read-only; saída:
  `probe=log_transaction_sample_rate script_ec=0 secret_occurrences_server_log=1`.
- **Defeito confirmado:** sim. O MODO 0 enumera dois GUCs, mas a propriedade é ausência de segredo no log;
  duas cadeiras independentes acharam a mesma quebra. É defeito grave de segurança e continuaria bloqueando
  num eventual ciclo 3.
- **Remédio como propriedade:** a senha em claro **não pode integrar texto SQL, parâmetro registrável,
  argv, terminal nem log do servidor**. O procedimento deve transformar a senha no cliente por mecanismo já
  disponível (sem dependência nova) e entregar ao PostgreSQL somente material que não permita autenticar como
  o papel; a segurança não pode depender de uma lista de GUCs de logging. Atualizar a afirmação absoluta do
  cabeçalho e `docs/deployment.md` para descrever o mecanismo real e seu residual honesto.
- **Aceite:** senha-sentinela = 0 em stdout/stderr, argv e `server.log`, tanto no sucesso quanto em cada modo de
  falha, sob uma matriz que inclui logging integral, amostragem de transação, amostragem por duração e defaults;
  a sonda positiva demonstra que o leitor de log encontra o sentinela quando ele é propositalmente emitido.
  O papel converge/idempotente e conserva `NOSUPERUSER NOBYPASSRLS NOREPLICATION`.
- **Mutação que deixa vermelho:** substituir o material derivado no cliente pela senha em claro no canal SQL;
  a rodada com `log_transaction_sample_rate=1` precisa falhar por `secret_occurrences_server_log > 0`.
- **Re-execução do sucessor (2026-10-08) — REPRODUZ, e com mais cobertura.** `timeout 600 bash
  scratchpad/pl05c2s/probe-b1.sh`: `postgres:16` descartável `pl05c2s-b1-*`, script = blob do objeto
  (`git show cd267978:scripts/db-runtime-role.sh`, md5 `810c1c4a`, montado read-only), senha-sentinela só por
  ambiente (`docker exec -e NOME`, nunca no argv). Cinco variantes:

  | variante (`postgres -c …`) | `DB_RUNTIME_ALLOW_LOG_ALL` | ec | senha no `server.log` | senha no terminal |
  |---|---|--:|--:|--:|
  | `log_transaction_sample_rate=1` | 0 | 0 | **1** | 0 |
  | `log_min_duration_sample=0` + `log_statement_sample_rate=1` | 0 | 0 | **1** | 0 |
  | `log_statement=all` (o MODO 0 recusa) | 0 | 3 (`MODO 0`) | 0 | 0 |
  | `log_statement=all` — controle positivo do leitor | 1 | 0 | 1 | 0 |
  | defaults | 0 | 0 | 0 | 0 |

  Divergência com o registro do antecessor: ele registrou só a primeira variante; a segunda (achada por C1 e C2
  no ciclo 1) também reproduz e entra na matriz do aceite. O papel ficou `NOSUPERUSER NOBYPASSRLS NOREPLICATION`
  em todas as variantes que concluíram.
- **Viabilidade do remédio, medida por mim (não é produto; `scratchpad/pl05c2s/probe-b1-viab.sh`).** Num
  `postgres:16` com `log_statement=all`, `printf … | setsid -w psql -X -c '\password <papel>'` sem tty: o psql 16
  lê a senha do stdin, calcula o verificador no cliente (`PQencryptPasswordConn`) e o servidor registra só
  `ALTER USER … PASSWORD 'SCRAM-SHA-256$4096:<verificador>'`; senha em claro no `server.log` = 0, no terminal =
  0, e o login com a senha funciona. Não é dependência nova: o script já exige `psql` 16. **Dois residuais que o
  plano obriga a tratar:** (1) com `password_encryption=md5` o `\password` gera verificador md5, que autentica
  por *pass-the-hash* sob `auth md5` — por isso a sessão do script faz `SET password_encryption =
  'scram-sha-256'` (GUC de usuário, não exige superusuário) e a matriz confere o prefixo `SCRAM-SHA-256$`; (2) o
  verificador SCRAM no log permite ataque de dicionário offline (PBKDF2, 4096 iterações) — a documentação do
  operador exige senha aleatória de alta entropia, e o residual fica declarado no cabeçalho do script e em
  `docs/deployment.md`. O mecanismo é recomendação medida, não mandato: vale qualquer um que passe no aceite.
- **Onde cada parte do aceite do B1 se mede (o teste não lê o log do servidor).** O T14 roda contra o
  `DATABASE_URL` da CI ou da receita, cujo log vai para o `stderr` de outro container: ler `server.log` de dentro
  do teste não é possível sem `logging_collector` e reinício. Por isso: **(i) no T14 (CI e receita):** depois do
  script, `pg_authid.rolpassword` do papel começa com `SCRAM-SHA-256$`, inclusive com
  `PGOPTIONS='-c password_encryption=md5'`; o login com a senha funciona; senha 0 em stdout/stderr/argv no sucesso
  e em cada MODO; e uma guarda estática fail-closed: o SQL que o script envia não tem caminho para a senha em
  claro (nenhuma interpolação `:'…'`/`:"…"` da variável da senha, nenhum `set_config` com ela); **(ii) na bateria da
  junta (item B7 do C2.4):** a matriz do `server.log` por execução, em PostgreSQL 16 descartável com `docker logs`,
  com controle positivo do leitor. A mutação "senha em claro de volta ao canal SQL" fica vermelha na matriz (ii) e
  na guarda estática (i); a mutação "sem `SET password_encryption`" fica vermelha no (i).

#### B2 — A2 / ressalva R7 · o filho `psql` escreve catálogo fora da trava única

- **Vermelho-controle re-medido no objeto:** três rodadas completas e independentes da receita fornecida,
  imagem `erp-junta-node20-pg16:local`, PostgreSQL 16.14, 3.652/3.652 blobs byte-idênticos, containers/rede
  `pl05c2-*`, sem porta no host: **19/19**, **16/19**, **19/19**. A rodada 2 teve
  `ERROR: tuple concurrently updated` no `GRANT USAGE ON SCHEMA public` do T14; o caso T14, o T15 contaminado
  e o pai contabilizaram as três falhas. Comando-base:
  `OUT_BASE=<rN> timeout 2400s bash receita-pl05c2.sh c251c9b7… normal`; nunca houve rerun silencioso.
- **Defeito confirmado:** sim. O denominador varia e a escrita de catálogo alcançável pelo teste está fora de
  `withRoleCatalogLock`; é `dentro-do-bloco` porque o arquivo de teste e `runRoleScript` nasceram no PR.
- **Remédio como propriedade:** **toda** mutação do catálogo disparada por esta suíte — inclusive processo
  descendente `psql`, criação/alteração/grant/revoke/drop e teardown — ocorre dentro da mesma exclusão mútua do
  arnês; falha em qualquer ponto executa limpeza no `finally` antes de liberar a trava. Não basta ensinar o
  guard léxico a reconhecer mais uma forma.
- **Aceite:** (a) canário determinístico adquire a trava, dispara a ação e prova que nenhum efeito de catálogo
  ocorre antes da liberação; (b) depois da liberação a ação conclui e deixa zero papel/view/banco/slot residual;
  (c) N=10 execuções do lote paralelo têm denominador idêntico, zero `XX000|23505|40P01` e zero falha.
- **Mutação que deixa vermelho:** chamar `runRoleScript` diretamente, contornando o helper travado; o canário de
  barreira observa efeito/erro antes da liberação e reprova de modo determinístico.
- **Re-execução do sucessor (2026-10-08) — a CAUSA reproduz (determinística); o SINTOMA não reproduziu em N=13.**
  (1) Os mesmos três comandos do antecessor, com prefixo `pl05c2s` (`receita-pg16.sh` copiada, só prefixo e
  `REPO=C:/Users/AMP/w-o05` trocados; `timeout 1500` por rodada): **19/19, 19/19, 19/19** (3.652/3.652 blobs,
  PG 16.14, resíduo 0). (2) Dez execuções do lote no mesmo container (`receita-pl05c2s-loop.sh`, `LOOP=10`):
  **10/10 verdes**, resíduo `s305%` 0 entre execuções — mas a execução 1 teve **um** `XX000 tuple concurrently
  updated` no TAP: o teardown do arnês (`DROP OWNED BY "o6r_b01_…"`, do arquivo `leituras-de-plataforma-db`,
  **dentro** da trava) colidiu com um escritor de fora e foi absorvido pela re-tentativa. É o mecanismo do R7
  visto do lado da vítima que sobrevive. (3) **Vermelho-controle determinístico** (`probe-b2-canario.sh`): com a
  trava do arnês segura por um canário (`pg_advisory_lock(20268801)`), um escritor que a respeita fica bloqueado
  (`lock timeout` em 4 s), enquanto o script do objeto conclui `ec=0` em < 1 s, cria o papel e concede `USAGE ON
  SCHEMA public` **com a trava ainda segura**. (4) Estático, no blob do objeto: as **15** chamadas a
  `runRoleScript` (l.538-722 e 748) estão fora de `withRoleCatalogLock`; a limpeza do cenário MODO 6 (`REVOKE`/
  `DROP VIEW`, l.556-560) não está em `finally`.
  **Divergência com o antecessor:** ele viu 1 vermelho em 3 (16/19); eu, 0 em 13 — coerente com a taxa histórica
  de ~28% por rodada (inspetor 2/6, C1 2/9; P(0/3) ≈ 0,37), mas mostra que **N=3 não tem poder** para provar a
  correção. Por isso o aceite do B2 fica assim (substitui o "Aceite" acima, mantendo a propriedade):
  **(a) canário determinístico** — o teste segura a trava numa conexão própria, dispara o helper travado e
  prova que, enquanto a trava está segura, o papel do cenário **não existe** em `pg_roles`; depois da liberação a
  ação conclui (vale para o helper, não para cada chamada); **(b) estrutural, fail-closed** — no arquivo
  `tests/san3-05-runtime-role-guard-db.test.ts`, todo processo filho que pode escrever catálogo (o
  `scripts/db-runtime-role.sh` e o `psql` com DDL/DCL) só nasce pelo helper travado; os filhos que não escrevem
  catálogo (o boot `node --import tsx src/server.ts` do T15, o `psql --version` e o script sem senha do T14b)
  ficam numa allowlist **fechada e nominal** no próprio teste; qualquer outra referência a `spawn`/`spawnSync`/
  `exec*`/`execFile*` de `node:child_process` reprova (a mutação "chamar o script por fora do helper" fica
  vermelha **sem depender de corrida**); **(c) N=10
  execuções do lote** (os dois arquivos `-db`, mesmo container) com denominador idêntico, zero falha **e zero
  `XX000|23505|40P01` no TAP inteiro** — inclusive o absorvido por re-tentativa do arnês, que é o que apareceu
  aqui; **(d)** a limpeza de cada cenário (inclusive MODO 6) em `finally`, dentro da trava.
  **Cuidado de desenho que a junta deve conferir:** a janela da trava é uma transação com `timeout: 30_000`
  (`ROLE_CATALOG_TX_OPTIONS`, arnês l.76) e o filho hoje roda por `spawnSync` com `timeout: 60_000`. Dentro da
  trava, o filho tem de rodar **assíncrono** e com timeout **menor** que o da janela (o script leva < 1 s), e a
  janela não pode ter escrita própria **antes** do filho sobre o mesmo objeto (a transação não comitada
  bloquearia o filho e o `spawnSync` travaria o laço de eventos: impasse até o timeout). O arnês
  (`tests/helpers/auth-identity-fixture.ts`) continua PROIBIDO; o helper novo mora no próprio arquivo de teste
  e usa o `withRoleCatalogLock` exportado.

#### B3 — C3-F1 + C3-F1b + C3-F2 · o ratchet trata “não reconheci” como “não existe”

- **Vermelhos-controle re-medidos no objeto, sem tocar `src/**`:** o gerador recebeu arquivos virtuais por
  `--mutant`. Fábrica genérica tipada `C3A` adicionou um call-site Prisma em `cloud_usage_events` (`L1=726`),
  mas o inventário permaneceu **53 chaves / sha1 `79e1d86e…`**; o controle `new ZzRepoD(prisma)` produziu
  **54 chaves** e a chave L2 `CRU`. `include: { tenant_cloud_charges: true }` por delegate sem FORCE (`C3E`)
  permaneceu em **53 chaves** e nem apareceu como call-site. Comando:
  `timeout 300s node scripts/san3-05-acessos-de-plataforma.mjs . --all --mutant <arquivo>`.
- **C3-F2 re-medido:** o L0 do objeto extrai FORCE por regex textual
  `ALTER TABLE ... ([a-z_]+) ... FORCE` e o mapa Prisma por `@@map` linha a linha; o catálogo real da rodada
  descartável foi `115 tabelas / 106 FORCE`, mas não existe igualdade executável catálogo↔L0. A mutação da
  junta (tabela qualificada por schema e model sem `@@map`) ficou fora do inventário; este ciclo transforma essa
  constatação em critério executável, não em nova lista de grafias.
- **Defeito confirmado:** sim para as três instâncias. O gerador novo suprime L1 `INJETADO` esperando que L2
  reconheça a construção; quando L2 não reconhece, o caso nasce permitido. Relações aninhadas e membros FORCE
  não reconhecidos sofrem a mesma inversão.
- **Remédio como propriedade:** o ratchet é **fail-closed**: todo acesso tipado por Prisma a tabela FORCE,
  direto ou por relação, só sai do inventário quando existe prova positiva de contexto tenant correto; construção,
  relação, tabela ou origem que o analisador não resolve permanece suspeita. Separadamente, num PostgreSQL 16
  descartável migrado, o conjunto FORCE de `pg_class.relforcerowsecurity` deve ser exatamente o conjunto que o
  gerador conhece; diferença em qualquer direção reprova. Nada em `prisma/**` é alterado no produto.
- **Aceite:** C3A, construtor em união, `Reflect.construct`, C3E e fixtures de tabela qualificada/model sem
  `@@map` entram como suspeitos; o `new` direto continua suspeito; os 53 casos atuais só mudam com motivo por
  chave; catálogo↔gerador = 106↔106 no objeto. `npm run check` estrito fica verde.
- **Mutação que deixa vermelho:** reintroduzir `SUSPEITO_L1(INJETADO)=false`, ignorar relation `include/select`,
  ou retirar um membro do conjunto FORCE conhecido; cada mutação deve deixar o respectivo fixture vermelho.
- **Re-execução do sucessor (2026-10-08) — REPRODUZ, e aparece uma quarta instância.** Container
  `pl05c2s-b3-*` com a árvore do objeto por `git archive` sem filtro de EOL (gerador md5 `81d92595` = blob),
  `npm ci` + `prisma generate` próprios. (1) `probe-b3.sh`: base **53 chaves / `79e1d86e`**; **C3A** (fábrica
  genérica), **C3B** (construtor em união) e **C3C** (`Reflect.construct`) somam call-sites `INJETADO` em L1 e
  ficam em **53 / `79e1d86e`**; **C3E** (`include` aninhado) fica em 53 e **nem vira call-site**; o controle
  **C3D** (`new` direto) vai a **54** chaves (L2 `new ZzRepoD(prisma) CRU`). O antecessor registrou A, D e E; B e
  C também reproduzem. (2) `probe-b3-f2.sh` (esquema e migração descartáveis só na cópia do container): três
  tabelas `ENABLE`+`FORCE` — `public.zz_force_a` (qualificada), `"ZzForceB"` (model sem `@@map`) e `zz_force_c`
  (controle) — e um leitor pelo client raiz: **zzForceA 0 linhas, zzForceB 0 linhas, zzForceC 2 linhas `CRU`**.
  O L0 foi a `FORCE=108`, mas um dos dois novos é `zzforceb` em minúsculas (a regex tem flag `i` e o código
  rebaixa a caixa), nome que nenhum model mapeia. **C3-F2 reproduz.** (3) **Quarta instância, nova:**
  `probe-b3-ops.sh` mostra que a "derivação de OPS do client gerado" (l.94-103) **nunca roda**: as 114 interfaces
  `*Delegate` do `index.d.ts` gerado estão **dentro de namespace**, e no laço da l.96-99 o `else
  ts.forEachChild(n, look)` se liga ao `if` interno (o do `isMethodSignature`), não ao externo — a recursão não
  desce. Medido: o laço verbatim coleta **0**, o gerador cai na lista embutida e só avisa no `stderr`, que o T13
  põe em `t.diagnostic` (l.159) e não reprova. Com chaves no `if` externo o mesmo laço coleta **17**, igual à
  lista embutida — por isso o inventário de hoje não muda, mas a afirmação do plano v3 ("OPS derivado do client,
  sem regex") é falsa e o próximo método de delegate do Prisma nasceria fora do L1.
  **O aceite do B3 ganha, além do que está acima:** (e) sem OPS derivado do client o gerador **sai ≠ 0** (nada
  de lista embutida), e o T13 reprova qualquer `stderr` não vazio do gerador; (f) a igualdade catálogo↔gerador é
  **de conjunto de nomes, com a caixa exata** (não de contagem), nos dois sentidos, e também
  `tabela FORCE do catálogo → model Prisma` (com `@@map` ou pelo nome do model) — tabela FORCE sem model conhecido
  é suspeita, não ausente; (g) as fixtures novas entram em `tests/fixtures/san3-05-mutacoes/` (C3A, C3B, C3C e
  C3E) e cada uma exige ≥ 1 chave no inventário; as duas grafias do C3-F2 (tabela qualificada por schema e model
  sem `@@map`) precisam de outro mecanismo, porque o L0 lê `prisma/schema.prisma` e as migrações por
  `readFileSync`, fora do host virtual que o `--mutant`/`--override` alcança — o dev escolhe (entrada virtual de
  migração/esquema no gerador, ou cópia efêmera fora do repositório), desde que o teste exija ≥ 1 chave para cada
  grafia e que `prisma/**` do produto não mude.
  **Medido no objeto, para calibrar o (f)** (`receita-pl05c2s-l0.sh`, banco migrado, linhas 52-67 do gerador
  verbatim × `pg_class.relforcerowsecurity`): **L0 = 106, catálogo = 106, 0 nome só de um lado**, 0 tabela FORCE
  sem model com `@@map`, 0 model sem `@@map`. O (f) passa no objeto depois do conserto; o C3-F2 é sobre o próximo
  membro, como a C3 calibrou ("o inventário atual não está errado — o membro novo é que nasce permitido").

#### B4 — C3-F3 · a superfície fecha etiquetas, não fecha medições

- **Vermelho-controle re-medido no objeto:** numa cópia efêmera byte-idêntica dentro de container, foi adicionada
  uma rota `/api/v1/platform/cloud-usage/zz-pl05c2-export` que lê `cloud_usage_events` cru e uma etiqueta
  `FORCE-SEM-TENANT` cuja nota cita `T11a`; a mutação foi aplicada (`route=true label=true`), porém a suíte saiu
  **11/11, ec=0**. Comando: receita PostgreSQL 16.14 sob `timeout 2400s`; recursos `pl05c2-*`; teardown 0/0.
- **Defeito confirmado:** sim. Uma string na nota satisfaz o teste sem executar diferencial para aquela rota;
  quatro de sete rotas `FORCE-POR-TENANT`, inclusive `/cloud-usage/tenants/:tenantId/summary`, não têm prova
  dinâmica própria.
- **Remédio como propriedade:** cada membro FORCE da superfície — rota ou job — possui **um cenário executável
  próprio**, identificado pela mesma chave da enumeração, que roda o mesmo seed sob superusuário e sob
  `NOSUPERUSER NOBYPASSRLS` e compara corpo/efeito não vazio. A igualdade de conjuntos
  `FORCE enumerado == diferenciais executados` é obrigatória; nota textual não conta como prova.
- **Aceite:** todas as rotas FORCE e os dois jobs têm cenário próprio; omissão, etiqueta sem cenário e ramo cru
  produzem vermelho. Rotas `SEM-FORCE` continuam apenas justificadas e verificadas contra o catálogo.
- **Mutação que deixa vermelho:** adicionar a rota etiquetada usada nesta sonda sem registrar/executar cenário;
  a igualdade de conjuntos falha. Se registrar o cenário mantendo a leitura crua, o diferencial 5×0 falha.
- **Re-execução do sucessor (2026-10-08) — REPRODUZ nas duas formas da C3.** `run-b4.sh`: a receita roda só o
  arquivo `leituras-de-plataforma-db` e aplica a mutação na cópia efêmera dentro do container, por âncora exata
  (falha fechado se a âncora não casar). **E1, controle** (rota `GET /cloud-usage/zz-pl05c2s-export` lendo
  `cloud_usage_events` cru, **sem** etiqueta): **9/11**, `not ok` no T11d — a enumeração em runtime está viva.
  **E2** (a mesma rota etiquetada `FORCE-SEM-TENANT` com nota "S1 — T11a", sem cenário): **11/11, ec=0**.
  **E3** (o ramo com `tenantId` de `RlsPrismaCloudUsageRepository.listEvents` lendo pelo client cru, sem
  `withTenantRls`): **11/11, ec=0** — o `/cloud-usage/tenants/:tenantId/summary`, que o §2.3 lista como controle
  S4, não tem medida. O antecessor re-mediu só o E2; o E3 também reproduz.
  **Superfície de jobs, medida:** `src/infra/jobs/job.registry.ts` registra **12** jobs; três são do domínio de
  nuvem e tocam FORCE sem tenant de entrada — `cloud-usage.aggregate-daily` (T11b), `cloud-charges.calculate`
  e `cloud-cost-allocation.run` (sem medida própria hoje). O aceite do B4 fica assim: a lista fechada cobre
  **rotas de `/api/v1/platform` (do router) e jobs do registro (do `job.registry` em runtime)**; cada membro
  FORCE — as rotas e os três jobs de nuvem — tem cenário próprio com o mesmo seed sob superusuário e sob
  `NOSUPERUSER NOBYPASSRLS`, corpo/efeito **não vazio** e igual; os outros 9 jobs ficam etiquetados "fora da
  superfície de plataforma — `B-ARNES-2`" e a enumeração os confere (job novo sem etiqueta = vermelho).
- **Viabilidade do remédio, medida por mim (não é produto; `b4/mut-p4.mjs`).** Acrescentei ao laço de medição, na
  cópia do container, as três rotas GET `FORCE-POR-TENANT` sem medida e comparei superusuário × papel efêmero no
  mesmo seed: `GET /cloud-usage/tenants/:A/summary`, `GET /tenants/:A/detail` e `GET /cloud-cost-allocations/summary`
  deram **200/200 com corpos iguais e não vazios** (242, 1.249 e 564 caracteres; `totalAllocatedCost` 40). O dev
  não deve esbarrar em defeito pré-existente nelas. **Não medidos** (têm efeito colateral): `POST
  /cloud-cost-allocations/runs` e os jobs `cloud-charges.calculate` e `cloud-cost-allocation.run` — se um deles
  divergir sob o papel sem bypass por causa de arquivo PROIBIDO, vale a parada do dev (C2.3).

### C2.2 Ajustes classificados

Fonte: `R-B-SAN3-05-1.md`, `J-B-SAN3-05.md`, `votos/B-SAN3-05/C{1,2,3}-voto.json` e `00-inspetor-terreno.md`
(R1–R8), todos lidos no objeto `cd267978`. Cada linha diz o que foi **re-medido por mim** (e como) ou o que é
**só registro**; nada é herdado como fato. Regra: o ciclo 2 é o último em que achado não grave bloqueia
(§C7 item 8(2)); por isso **todo ajuste de produto ou de teste que tem conserto barato dentro do escopo é
resolvido neste ciclo**, e só vira pendência o que está fora do escopo permitido ou é pré-existente.

| # | origem | o que é | re-medido por mim | decisão | justificativa |
|--:|---|---|---|---|---|
| J1 | C1 **A1** · R2(1) | O T8d trocou `pg_basebackup` por `pg_create_physical_replication_slot`: prova que `REPLICATION` é exercível, não que vaza linha; o `INSERT … ('marcador')` nunca é lido por via de replicação. | sim — blob l.437-526: slot criado e derrubado; `'marcador'` só no INSERT | **RESOLVER** (D1, abaixo) | Teste que promete mais do que mede é a classe que reprova. O CI não aceita `pg_basebackup` (`pg_hba` do serviço; CI vermelho em `e3cb269d`, inspetor item 4.3), então a prova da porta vai para a bateria da junta, em container com `pg_hba` de replicação. |
| J2 | C1 **A3** | A via `view` da trava e o MODO 6 do script olham **um** nível de `pg_rewrite`/`pg_depend`: view sobre view sobre tabela FORCE, com SELECT só na externa, passa (trava 0 linhas, script `ec=0`). | sim — `runtime-role.ts` l.26-32 e `db-runtime-role.sh` l.93-94 e 110: junção direta à tabela FORCE, sem recursão | **RESOLVER** (D2) | É abertura da própria trava de permissão; hoje há 0 views, mas no ciclo 3 isso seria discutível como "quebra de permissão" (grave). Custo: um CTE recursivo em dois lugares + um teste. |
| J3 | C1 N1 | O texto do plano v3 §4.1 diz 73 CR e quebra na l.81; medido 115 CR e quebra na l.114. | não (nota de número; a propriedade reproduziu) | **RESOLVIDO por esta nota** | O número de texto é corrigido aqui; a propriedade (CRLF quebra o bash) segue no aceite A22. |
| J4 | C2 **F-C2-02** | O T15 fixa `DATABASE_RUNTIME_ROLE_GUARD=enforce` no `PROD_BASE`; o boot de produção **sem** a variável (default) não tem teste — a mutação M1 (default→`skip`) só é pega pelo T2. | sim — blob l.217-232: `PROD_BASE` com `enforce` | **RESOLVER** (D3) | O A20 pede os dois sinais por mutação; um caso a mais no T15. |
| J5 | C2 **F-C2-03** | O T15 não afirma `exitCode`; `adminBoot.kill` fora de `finally`; sob a M2 o runner trava (`ec=124`). | sim — blob l.799-831: `if (adminBoot.exitCode === null) adminBoot.kill(…)` fora de `try/finally`, nenhum `assert` de código de saída | **RESOLVER** a parte do teste (D3); **PENDÊNCIA** a parte do runner (`P-SAN3-05-RUNNER-SEM-TIMEOUT`, C2.6) | O teste é do bloco; `scripts/run-backend-tests.mjs` e `.github/workflows/**` são PROIBIDOS aqui (§6) e a ausência de timeout por arquivo é anterior ao bloco. |
| J6 | C2 **F-C2-04** | A guarda de host do T9 é literal (`127\.0\.0\.1` ou `55405`): não vê o host da CI (`localhost:5432`) nem o da receita, e não procura a senha. | sim — blob l.254 e l.273 | **RESOLVER** (D4) | Barato; o A6 pede log sem conexão em qualquer ambiente. |
| J7 | C2 N1 | Artefatos de plano/crítica (`docs/revisoes/SAN3/B-SAN3-05-{plano,critica-r1,critica-r2}.md`) fora da lista literal do §6. | sim — `git diff --name-status b404815c cd267978` | **RESOLVIDO no C2.3** | Entram nominalmente no PERMITIDO do ciclo 2. |
| J8 | C2 N2 | 27 fixtures no diretório; o §5/§6 diziam 26. | sim — `git ls-tree cd267978 tests/fixtures/san3-05-mutacoes/` = **27** linhas | **RESOLVIDO no C2.3** | A contagem passa a ser a medida (27) mais as fixtures novas do B3, publicada com N pelo dev. |
| J9 | C2 N3 · R2(4) | A premissa do §8 `git grep 'PrismaCloudChargeRepository(prisma)' -- src` → vazio é falsa como grep literal. | sim — literal = **1** (`new RlsPrismaCloudChargeRepository(prisma)`, l.324); ancorado (`git grep -E` com `(^` ou `[^A-Za-z])` antes do nome) = **0** | **RESOLVIDO no C2.4** | A bateria usa a forma ancorada (item B12), que mede o que a premissa queria dizer. |
| J10 | C2 N4 · R2(5) · R4 | `Kpis/app.js` (PROIBIDO no §6) e os três JSON/MD de KPI no diff. | sim — `git diff --stat b404815c cd267978 -- Kpis/` = 4 arquivos; a `main` também mudou `Kpis/kpis-history.md` desde a base | **RESOLVER** (C2.3) | KPI congelado (§C7 item 8(5)): os quatro arquivos voltam byte a byte à versão da `origin/main` integrada; a junta não cobra KPI. |
| J11 | C3 nota (§0.4) | O motivo dado no plano para os 3 sítios de `identity-link` ("setter depois de outra instrução") está errado: o setter é a 1ª instrução, em declaração `const`, que o `setterFirst` não reconhece — erro do gerador **para o lado suspeito**. | não (registro da C3) | **RESOLVIDO por esta nota** | Erro fail-closed (chave a mais, nunca a menos); o texto fica corrigido aqui; o remédio do B3 não pode tornar esse caso permitido sem prova positiva. |
| J12 | C3 nota (pré-existente) | O default `work()` sem GUC de `LocalAuthLoginService` (`local-auth-login.service.ts:106`) é fail-open em princípio; origem `35c218a8` (2026-06-07). | não (registro da C3, com origem datada) | **PENDÊNCIA** `P-SAN3-05-LOCAL-AUTH-WORK-SEM-GUC` (C2.6) | `src/modules/auth/**` é PROIBIDO aqui; a classe antecede o bloco (§C7.1-ter(a)). |
| J13 | C3 nota | O §10 do plano lista 4 arquivos de rota; são 5 (`src/modules/cloud-costs/aws-cur.routes.ts`). | não (registro) | **RESOLVIDO pelo remédio do B4** | A enumeração do T11d vem do router em runtime (cobre os 5); o B4 amarra cada rota FORCE a cenário próprio. |
| J14 | C3 "não executado" | As rotas `FORCE-POR-TENANT` sem medição dinâmica (4 de 7). | sim (re-medido como B4) | **RESOLVER** (= B4) | É o próprio B4. |
| J15 | R1 | Objeto × colagem dos mandatos (HC = H0 da geração ≠ head do PR no voto). | — (processo) | **RESOLVER no C2.5** | Mandatos da junta 2 nascem sobre o head **empurrado e integrado** (HC = H0); o delta até o voto é re-medido por cada cadeira. |
| J16 | R2(2) | `FROZEN_ALLOWLIST` 60 → 62 → 63. | sim — o diff de `tests/db-catalog-write-guard.test.ts` é **só** a entrada `san3-05-runtime-role-guard-db.test.ts` com `count: 63` | **RESOLVER no C2.4** | O remédio do B2 muda o arquivo de teste; a contagem é **re-medida** pelo dev e o diff do guard continua sendo só essa entrada (count e motivo novos). |
| J17 | R2(3) | O gerador cai na lista embutida de OPS se não derivar do client (`OPS.size < 10` → aviso e segue). | sim — gerador l.100-103 | **RESOLVER** (instância do B3) | É a mesma inversão "não reconheci → sigo": sem OPS derivado do client, o gerador **sai ≠ 0**. |
| J18 | R2(6) | Contagens publicadas no PR (3122/3124, 19/19, 88/88, 42/42, 30/30, 53 chaves). | — | **RESOLVER no C2.4** | Toda contagem do ciclo 2 vem da bateria executada no head do ciclo 2, com N e forma; nenhuma é copiada. Não há KPI. |
| J19 | R3 · R8 | Portas e disco. | sim — `df -h /c` = 13 GB livres às 15:40Z; cada receita ≈ 0,4 GB de vhdx | **RESOLVER no C2.4/C2.5** | Recursos sem porta no host (rede Docker própria); o orquestrador acompanha o `df` entre cadeiras e roda `DEEP_CLEAN=1` se cair de 10 GB. |
| J20 | R4 | O PR está em conflito com a `main`. | sim — `git merge-tree --write-tree cd267978 origin/main` (`c8af6458`): conflito em **4** arquivos de registro (`agent-orchestration/codex/log-execucao.md`, `agent-orchestration/controle/pendencias-indice.md`, `agent-orchestration/controle/pendencias.md`, `agent-orchestration/docs/status-geral.md`); `gh pr view 405` = `mergeable: UNKNOWN` | **RESOLVER** (C2.3) | O dev integra a `origin/main` por **merge** (sem reescrever o ramo, sem force-push), resolvendo os quatro por união das entradas; a junta 2 julga o head integrado, com check-runs concluídos. |
| J21 | R5 | O `CLAUDE.md` do objeto não tem o §C7 item 8. | o antecessor mediu `grep -c` = 0 no objeto | **RESOLVIDO pela integração (J20)** | Depois do merge da `main`, o `CLAUDE.md` do ramo é o da `main`; até lá, os mandatos citam `origin/main`. |
| J22 | R6 | P5/P6 com o orquestrador. | — (processo) | **RESOLVER no C2.5** | Máx. 2 cadeiras em paralelo; `00-quedas.md` criado na primeira queda. |
| J23 | R7 | = **B2**. | sim (C2.1, B2) | **RESOLVER** (= B2) | — |

**D1 (A1).** O T8d passa a afirmar só o que mede: título e mensagem dizem "`REPLICATION` é exercível (o slot
físico nasce) e a trava o recusa"; o `INSERT … ('marcador')` sai do T8d ou passa a ser lido por algo — dado de
fixture sem leitura não fica. A **prova da porta** (o papel com `REPLICATION` extrai, por `pg_basebackup`, um
`base.tar` que contém o marcador de outra organização) vira o **item B10 da bateria** (C2.4), executado pela C1
da junta 2 num PostgreSQL 16 descartável com `pg_hba` de replicação — não no CI. Mutação: tirar o termo
`rolreplication` da trava → o T8d fica vermelho (o `findEscape` do `atributo` falha).

**D2 (A3).** A via `view` fica **transitiva** nos dois lugares que a implementam (`RUNTIME_ROLE_GUARD_SQL` em
`src/database/runtime-role.ts` e o MODO 6 de `scripts/db-runtime-role.sh`). Uma relação `V` (`relkind` `v`/`m`)
sobre a qual a sessão (`session_user` ou `current_user`) tem `SELECT` escapa se, seguindo `pg_rewrite`/
`pg_depend` por **qualquer número** de views, chega a uma view `W` cujo dono é `rolsuper` ou `rolbypassrls` e
que depende **diretamente** de tabela FORCE (`V = W` é o caso de hoje). Sobre-aproximação aceita e declarada:
view `security_invoker` também conta (fail-closed). **Aceite:** view sobre view sobre tabela FORCE, as duas do
superusuário, `SELECT` só na externa → a trava devolve 1 escape `view` e o script sai `ec=3` com `MODO 6`; o caso
de um nível continua pego; a postura limpa continua com 0 escapes. **Mutação:** voltar a junção para um nível →
o caso de dois níveis passa na trava e no script (o teste fica vermelho). O md5 `36650de5` do Apêndice E **deixa
de ser critério**: o dev regrava o md5 no comentário de `runtime-role.ts`, e a junta julga a propriedade por
execução. `docs/deployment.md` e o comentário de `runtime-role.ts` deixam de declarar o limite de um nível.

**D3 (F-C2-02 + F-C2-03).** O T15 ganha o caso **produção sem `DATABASE_RUNTIME_ROLE_GUARD`** (o `PROD_BASE`
sem a variável → default `enforce` → recusa o superusuário). Cada boot recusado afirma **os dois sinais do
A20**: código de saída `1` em ≤ 15 s, lido do evento `close` (não só do texto), e a primeira linha de falha com
`RUNTIME_ROLE_CAN_BYPASS_RLS` antes de qualquer menção a Redis ou job worker. **Todo** processo filho é morto no
`finally` (SIGTERM, e SIGKILL depois da carência), e cada subteste tem `timeout` explícito menor que o do
arquivo: uma regressão falha rápido em vez de travar o runner. **Mutações:** M1 (default → `skip`) deixa o
**T15** vermelho, não só o T2; M2 (a chamada da trava apagada de `src/server.ts`) deixa o T15 vermelho em
< 60 s sob `timeout 300` (ec ≠ 124).

**D4 (F-C2-04).** A guarda de log do T9 (e a do T15) deriva do `DATABASE_URL` **efetivo** e da URL do papel
limpo: `hostname`, `port`, `username`, `password` (decodificados) e o nome do banco não aparecem no JSON
serializado das entradas de log, além de `postgresql://` e `password`. **Mutação:** o logger da trava passa a
incluir o host → vermelho sob qualquer `DATABASE_URL` (CI `localhost:5432`, receita `<rede>-pg:5432`).

### C2.3 Escopo do desenvolvimento

**Ponto de partida obrigatório (antes de qualquer edição de produto).** O dev — identidade nova, que não achou,
não planejou e não votou — trabalha num worktree próprio do ramo `fix/runtime-role-sem-bypass` em caminho curto
(`C:/Users/AMP/w-<id>`), com `npm ci` próprio e `prisma generate` com `DATABASE_URL` só no ambiente (nunca
junction de `node_modules`). (1) Mede `HEAD` = `git ls-remote origin fix/runtime-role-sem-bypass`; se divergir
do head que o orquestrador passar, para. (2) **Integra a `origin/main` por merge** (`git merge origin/main`,
sem rebase e sem force-push): resolve os 4 conflitos de registro medidos (J20) por **união** das entradas, sem
apagar nenhuma; o `CLAUDE.md` do ramo passa a ser o da `main` (§C7 item 8 presente — J21). (3) **KPI congelado:**
`git -c core.autocrlf=false checkout origin/main -- Kpis/app.js Kpis/kpis-latest.json Kpis/kpis-history.json
Kpis/kpis-history.md` e confere `git diff --quiet origin/main -- Kpis/` (ec=0) — os quatro saem do diff do PR.
(4) Só então as correções, em commits pequenos (Conventional Commits), cada um com a sua bateria parcial.

**PERMITIDO no ciclo 2 (e nada mais):**

| caminho | para quê |
|---|---|
| `scripts/db-runtime-role.sh` | B1 (a senha nunca vai em claro ao servidor: verificador SCRAM no cliente, `password_encryption` forçado na sessão, cabeçalho com o residual honesto); D2 (MODO 6 transitivo). Continua `100755` e `eol=lf`. |
| `src/database/runtime-role.ts` | D2 (`RUNTIME_ROLE_GUARD_SQL` com a via `view` transitiva; md5 novo no comentário). Nada mais muda no arquivo. |
| `docs/deployment.md` | B1 (mecanismo real e residual: verificador SCRAM no log, senha aleatória de alta entropia); D2 (sem o limite de um nível). |
| `scripts/san3-05-acessos-de-plataforma.mjs` | B3 (L1/L2 fail-closed para o que não resolve; relação aninhada `include`/`select`/escrita aninhada como call-site; L0 com nomes exatos, grafia qualificada e model sem `@@map`; OPS derivado com recursão correta e saída ≠ 0 sem ele). |
| `tests/san3-05-acessos-de-plataforma-guard.test.ts` | B3 (T13: fixtures novas; `stderr` do gerador vazio; inventário congelado atualizado só com motivo por chave). |
| `tests/fixtures/san3-05-mutacoes/**` | B3 (C3A, C3B, C3C, C3E e o que o dev escolher para as grafias do C3-F2). A contagem final vai publicada com N (hoje 27). |
| `tests/san3-05-runtime-role-guard-db.test.ts` | B1 (o item (i): `rolpassword` com `SCRAM-SHA-256$`, inclusive sob `password_encryption=md5`; guarda estática; senha 0 nos modos — a matriz do `server.log` é a B7 da bateria), B2 (helper travado, canário, estrutura), D1 (T8d), D2 (view sobre view), D3 (T15), D4 (T9). |
| `tests/san3-05-leituras-de-plataforma-db.test.ts` | B4 (cenário por membro FORCE da superfície e igualdade de conjuntos); B3(f) (igualdade catálogo↔L0), se o dev não preferir arquivo próprio. |
| `tests/san3-05-*-db.test.ts` **novos** | Só se o dev separar B3(f) ou B4 em arquivo próprio; cada um entra na `FROZEN_ALLOWLIST` se escrever catálogo. |
| `tests/db-catalog-write-guard.test.ts` | **Só** as entradas do Map dos arquivos `san3-05-*` (count e motivo re-medidos). Nenhuma outra linha (J16). |
| `docs/revisoes/SAN3/B-SAN3-05-plano.md`, `B-SAN3-05-critica-r1.md`, `B-SAN3-05-critica-r2.md` | Artefatos do próprio bloco (J7). O dev **não** reescreve o plano; só o planejador/orquestrador. |
| `agent-orchestration/codex/log-execucao.md`, `agent-orchestration/controle/pendencias.md`, `agent-orchestration/controle/pendencias-indice.md` (só pelo gerador do índice), `agent-orchestration/docs/status-geral.md` | Integração da `main` (J20) e as pendências novas do C2.6. |
| `agent-orchestration/omega/juntas/**`, `agent-orchestration/omega/reprovacoes/**` | Só o orquestrador (atas, votos, mandatos); o dev não escreve aqui. |
| `Kpis/*` | Só para **restaurar** à `origin/main` (passo 3); o diff final do PR em `Kpis/` é vazio. |

**PROIBIDO no ciclo 2** (além do §6 da v3, que continua valendo onde não for ampliado acima):
`prisma/**` (inclusive para o C3-F2: a prova usa entrada virtual ou cópia efêmera, nunca migração nova) ·
`src/config/env.ts`, `src/server.ts`, `src/database/runtime-role.bootstrap.ts`, `src/database/rls.ts` e os dois
repositórios de nuvem (`src/modules/cloud-usage/cloud-usage-prisma.repository.ts`,
`src/modules/cloud-charges/cloud-charge-prisma.repository.ts`) — nenhum achado do ciclo 1 pede mudança neles; ·
qualquer outro `src/**` (inclusive `src/modules/cloud-cost-allocation/**`, dono `B-O6R-08`, e
`src/modules/auth/**`, J12) · `tests/helpers/auth-identity-fixture.ts` (o arnês não muda; o helper travado mora no
arquivo de teste e usa o `withRoleCatalogLock` exportado) · `scripts/run-backend-tests.mjs` · `.github/workflows/**`
· `package.json`, lockfiles · `docker-compose*.yml`, `Dockerfile`, `fly.*.toml` · `.env*` · `CLAUDE.md`,
`AGENTS.md`, `.claude/**`, `.agents/**` (só chegam pela integração da `main`, sem edição) · `Kpis/*` (fora da
restauração) · `frontend/**`, `mobile/**`.

**Parada do dev (fail-closed).** Se um cenário do B4 ficar vermelho por defeito de produto num arquivo PROIBIDO
(ex.: uma rota `FORCE-POR-TENANT` que devolve corpo diferente sob o papel sem bypass por causa de
`cloud-cost-allocation`), o dev **para e relata** ao orquestrador (defeito + evidência executada), sem afrouxar o
cenário e sem tocar o arquivo: é achado novo, e quem decide escopo é o orquestrador (§C7.4-bis). O mesmo vale se
o B1 exigir algo que o `psql` 16 da imagem não ofereça.

### C2.4 Bateria do ciclo 2

**Onde roda.** No Windows do dono, **só** `git`/`gh` (leitura do objeto, check-runs, diff de escopo). Todo o resto
roda em **Linux, dentro de container**, a partir da receita do terreno (`C:/Users/AMP/erp-terreno/receita-pg16.sh`,
com prefixo próprio por cadeira): `git archive` do head com `core.autocrlf=false`, conferência de **todos** os
blobs (`git hash-object --no-filters` × `ls-tree`), imagem `erp-junta-node20-pg16:local` (Node 20.20.2, `psql`
16.14), PostgreSQL 16 descartável numa rede Docker própria **sem porta no host**, `npm ci` + `prisma generate` +
`prisma migrate deploy` dentro, teardown verificado (0 container, 0 rede, 0 volume, árvore temporária removida).
`erp-postgres`, `erp-redis`, 5432, 6379 e 55432 nunca são alvo. Cada comando tem `timeout` e o `ec` é lido em
variável — nunca `a && b` numa linha seguida de outra que dependa dele. Nenhum `tail -f`.

**Objeto.** O head **integrado** (C2.3, passo 2), empurrado, com **todos** os check-runs concluídos
(`gh api repos/thiagodorgo/ERP_Techsolutios/commits/<sha>/check-runs`); `cancelled`/`queued` contam como ausentes.

| # | comando (forma) | onde · timeout | esperado (N e forma) |
|--:|---|---|---|
| B0 | `git rev-parse HEAD` = `git ls-remote origin fix/runtime-role-sem-bypass`; check-runs do head; `git diff --name-only origin/main...HEAD` ⊆ PERMITIDO do C2.3; `git diff --quiet origin/main -- Kpis/` | Windows · 120 s cada | heads iguais; check-runs concluídos e verdes; 0 arquivo fora do PERMITIDO; `Kpis/` ec=0 |
| B1 | `npm run check` | container · 600 s | ec=0 (tsc estrito) |
| B2 | `npm run lint` | container · 600 s | ec=0 |
| B3 | `node --test --import tsx tests/production-runtime-gates.test.ts tests/deploy-manifest-parity.test.ts tests/o6r07b-scanner-failclosed.test.ts tests/cors-env.test.ts tests/portal-env.test.ts tests/san3-05-runtime-role-bootstrap.test.ts tests/san3-05-acessos-de-plataforma-guard.test.ts` | container · 900 s | fail 0, skipped 0; N publicado = executado (referência v3: gates 63, paridade 28) |
| B4 | `node scripts/san3-05-acessos-de-plataforma.mjs .` e `… --all` | container · 300 s | ec=0; **`stderr` vazio**; cabeçalho com `OPS(derivados)=17` sem aviso; inventário == congelado do T13; cada chave nova ou sumida em relação às 53 do `cd267978` (`79e1d86e`) com motivo escrito |
| B5 | `git ls-files -s scripts/db-runtime-role.sh`; `git ls-files --eol scripts/db-runtime-role.sh .gitattributes` | Windows · 60 s | `100755`; `i/lf w/lf attr/text eol=lf` |
| B6 | receita `normal` dos arquivos `-db` do bloco (`tests/san3-05-runtime-role-guard-db.test.ts`, `tests/san3-05-leituras-de-plataforma-db.test.ts` e os `san3-05-*-db` novos), **N = 3 receitas independentes**; e **1** receita `controle` (PATH sem `psql`) | container · 1.500 s por receita | 3 × verde com **denominador idêntico** (> 19, o N do objeto, pelos cenários novos); `controle`: o T14 vermelho nomeando `psql: ausente`, nunca skip |
| B7 | **matriz do `server.log` do B1**: o `scripts/db-runtime-role.sh` do head num `postgres:16` descartável, senha-sentinela só por ambiente, sob (a) `log_statement=all`, (b) `log_transaction_sample_rate=1`, (c) `log_min_duration_sample=0`+`log_statement_sample_rate=1`, (d) `log_min_duration_statement=0`, (e) defaults, (f) servidor com `password_encryption=md5`; sucesso e os MODOS 1–6; mais o controle positivo do leitor (um `SELECT '<sentinela>'` proposital sob (a)) | container · 600 s | senha = **0** no `server.log`, no terminal e no argv em todas as linhas; controle positivo = ≥ 1; `ALTER … PASSWORD 'SCRAM-SHA-256$…'` presente sob (a); papel `NOSUPERUSER NOBYPASSRLS NOREPLICATION`; idempotente (2ª execução sem diff de privilégios) |
| B8 | **critério (c) do B2**: o lote dos arquivos `-db` do bloco **10 vezes** no mesmo container (`npm ci` uma vez), com resíduo `s305%` conferido entre execuções | container · 2.400 s | 10 × verde, denominador idêntico, **0** ocorrência de `XX000`, `23505` ou `40P01` no TAP inteiro (inclusive o absorvido por re-tentativa do arnês); resíduo 0 |
| B9 | **canário do B2** (o teste do critério (a)) isolado, e a guarda estrutural (b) | container (dentro do B6) | verdes; e vermelhos sob as mutações M-B2a/M-B2b abaixo |
| B10 | **porta `REPLICATION` do D1** (só a junta, não o CI): papel com `REPLICATION` num PostgreSQL 16 descartável com `pg_hba` de replicação; `pg_basebackup` extrai `base.tar`; o marcador da linha FORCE de outra organização aparece nele | container · 300 s | marcador ≥ 1 no `base.tar`; a trava recusa o papel (`atributo`) |
| B11 | `DATABASE_URL=<descartável> npm test` (suíte inteira) e `npm run build` | container · 2.400 s e 600 s | fail 0; `skipped ≤ 2` (teto `SKIP_BUDGET_DB`); N publicado = executado; build ec=0 |
| B12 | `git grep -n -E '(^\|[^A-Za-z])PrismaCloudChargeRepository\(prisma\)' -- src`; `grep -n 'DATABASE_RUNTIME_ROLE_GUARD' fly.production.toml fly.staging.toml .env.example`; diff de `tests/db-catalog-write-guard.test.ts` contra `origin/main` | Windows · 60 s | vazio; vazio; só as entradas `san3-05-*` do Map |
| B13 | `git diff --check origin/main...HEAD` | Windows · 60 s | ec=0 |
| B14 | **caminho do compose**: `postgres:16` descartável com o `scripts/db-runtime-role.sh` do head montado em `/docker-entrypoint-initdb.d/10-runtime-role.sh` (como no `docker-compose.prod.yml`, que o entrypoint executa por `source`, sem tty), com `DB_RUNTIME_PASSWORD` por ambiente e `log_statement=all` | container · 300 s | o papel nasce com `SCRAM-SHA-256$`, o login com a senha funciona, senha 0 no `docker logs`; script sem senha derruba o container (exit 1), como medido no ciclo 1 |

Não há `node --check Kpis/app.js` nem `kpi-dashboard-charts`: `Kpis/*` não muda (KPI congelado).

**Mutações que a junta 2 roda (cada uma aplicada na cópia efêmera do container, por âncora exata que falha
fechado; restauro conferido por md5; nenhuma toca a árvore do ramo):**

| id | mutação | tem de ficar vermelho |
|---|---|---|
| M-B1a | a senha em claro volta ao canal SQL (ex.: `set_config` com a variável da senha + `ALTER ROLE … PASSWORD` com ela) | B7 (b) e (c) com senha ≥ 1 no `server.log`; a guarda estática do T14 |
| M-B1b | sai o `SET password_encryption` da sessão | o T14 sob `PGOPTIONS='-c password_encryption=md5'` (`rolpassword` sem `SCRAM-SHA-256$`) |
| M-B2a | o helper travado deixa de tomar a trava | o canário (a), deterministicamente |
| M-B2b | uma chamada do script por fora do helper | a guarda estrutural (b), sem depender de corrida |
| M-B3a | `SUSPEITO_L1` volta a excluir `INJETADO` | as fixtures C3A, C3B e C3C (≥ 1 chave cada) |
| M-B3b | o L1 volta a ignorar relação aninhada | a fixture C3E |
| M-B3c | a regex do L0 volta à de hoje (ou um membro FORCE some do L0) | a igualdade catálogo↔L0 (f) e as grafias do C3-F2 |
| M-B3d | o `else` pendurado volta ao laço de OPS | o gerador sai ≠ 0 ou o T13 reprova o `stderr` |
| M-B4a | E2: rota crua etiquetada `FORCE-SEM-TENANT` sem cenário | a igualdade "membros FORCE enumerados == cenários executados" |
| M-B4b | E3: o ramo com `tenantId` lendo cru | o cenário de `/cloud-usage/tenants/:tenantId/summary` |
| M-B4c | um dos três jobs de nuvem lendo cru | o cenário do job |
| M-D1 | o termo `rolreplication` sai da trava | o T8d |
| M-D2 | a via `view` volta a um nível (na trava e no script) | o teste de view sobre view (trava e MODO 6) |
| M-D3a | M1: default do export → `skip` | o **T15** (não só o T2) |
| M-D3b | M2: a chamada da trava apagada de `src/server.ts` | o T15, em < 60 s sob `timeout 300` (ec ≠ 124) |
| M-D4 | o logger da trava inclui o host | o T9, sob o `DATABASE_URL` da receita |

**Disco e paralelismo.** Cada receita custa ≈ 0,4 GB de `vhdx` que o Docker não devolve; 13 GB livres às 15:40Z
de hoje. O orquestrador confere `df -h /c` entre cadeiras e roda `DEEP_CLEAN=1 bash scripts/post-merge-cleanup.sh`
abaixo de 10 GB (§C5). No máximo 2 cadeiras com container vivo ao mesmo tempo (P5).

### C2.5 Junta 2 — três cadeiras novas

**Regra.** Bloco de **segurança e permissão** → junta completa (§C7 item 8(1)): `inspetor-de-terreno-da-junta`
antes, com `LIBERADO` obrigatório; três cadeiras de **identidade nova**; quórum **unanimidade de 3, com veto**.
**Este é o último ciclo em que achado não grave bloqueia** (§C7 item 8(2)): no ciclo 3, só bloqueia defeito de
produto grave — perda de dado, vazamento entre organizações, quebra de permissão ou erro de dinheiro — e todo o
resto vira pendência com dono e o bloco mergeia. Por isso cada cadeira classifica todo achado como `grave`
(uma das quatro classes, dita qual) ou `não grave`, além de `gravidade` e `escopo` (§C7.1-ter(a), escopo com
evidência de data ou origem). Contrato da junta = `CLAUDE.md` do head integrado (= `origin/main`, §C7 item 8).

**Objeto e mandato.** Head integrado e empurrado (C2.3), com check-runs concluídos; mandato forma A com pré-voo
(só inspetor e cadeiras, §C7 item 8(3)), **HC = H0** = esse head. Cada cadeira re-mede `git rev-parse HEAD` =
`git ls-remote` e o delta desde a colagem (R1/J15). P1–P7 inline; máx. 3 itens por cadeira (P4); máx. 2 cadeiras
com container vivo ao mesmo tempo (P5); quedas em `votos/B-SAN3-05/ciclo2/00-quedas.md` (P6). Cadeiras rodam em
Opus com substituição declarada (decisão do dono de 2026-10-08: Fable só em bloco de dinheiro) ou no Codex em
GPT-6 Astra; nunca abaixo (§C7 item 6-bis). Cada cadeira mede **por execução** no próprio terreno (receita com
prefixo próprio: `j05c2-c1-`, `j05c2-c2-`, `j05c2-c3-`; sem porta no host) — afirmação de ata, de plano ou de
relatório do dev é roteiro, nunca fato.

**Cadeiras (para a `agente-fabrica`; o corpo diz a competência, os três itens e que a cadeira acha e não
conserta — defeito + evidência executada + motivo, sem propor correção, §C7.4-bis):**

| cadeira | identidade nova (proposta) | competência | itens (máx. 3) |
|---|---|---|---|
| **C1** | `jurado-san305-c2-credencial-e-papel` | PostgreSQL 16: autenticação SCRAM, `password_encryption`, logging do servidor (`log_statement`, amostragens), atributos e pertença de papéis, views e `pg_rewrite`/`pg_depend`, replicação | **(1) B1** — B7 (matriz do `server.log`, 6 configurações × sucesso e MODOS 1–6, controle positivo do leitor) e o (i) do T14 (`SCRAM-SHA-256$` inclusive sob `password_encryption=md5`; guarda estática); mutações M-B1a e M-B1b; o cabeçalho do script e `docs/deployment.md` dizem o mecanismo e o residual real; B14 (o caminho do compose). **(2) D2 + D1** — view sobre view (trava e MODO 6), M-D2; T8d diz o que mede, M-D1; B10 (`pg_basebackup` com marcador). **(3) D3 + D4** — T15 com os dois sinais do A20 e `finally`, M-D3a e M-D3b (ec ≠ 124); T9 derivado do `DATABASE_URL`, M-D4. |
| **C2** | `jurado-san305-c2-arnes-e-escopo` | Concorrência de catálogo no PostgreSQL (tuplas de ACL, `XX000`), arnês `node:test` multiprocesso, travas consultivas, escopo de PR e integração de ramo | **(1) B2 (a)(b)(d)** — o canário prova a exclusão mútua deterministicamente; a guarda estrutural reprova qualquer filho fora do helper; limpezas em `finally`; o filho assíncrono com timeout menor que o da janela (sem impasse); M-B2a e M-B2b. **(2) B2 (c) + B6** — B8 (N=10, 0 `XX000/23505/40P01` no TAP inteiro, resíduo 0) e B6 (N=3 receitas com denominador idêntico + 1 `controle`). **(3) Escopo e integração** — B0, B11, B12, B13: diff ⊆ PERMITIDO do C2.3; `Kpis/` = `origin/main`; `main` integrada por merge sem reescrever o ramo; diff do `db-catalog-write-guard` só nas entradas `san3-05-*`; suíte inteira com `skipped ≤ 2`. |
| **C3** | `jurado-san305-c2-ratchet-e-superficie` | Análise estática com o compilador TypeScript (tipos, símbolos, AST), princípio fail-closed, diferencial dinâmico sob papel sem bypass | **(1) B3 — gerador** — B4 (`stderr` vazio, OPS derivado = 17, inventário == congelado com motivo por chave); fixtures C3A, C3B, C3C, C3E com ≥ 1 chave; M-B3a, M-B3b, M-B3d; **e uma forma própria** dentro do alcance declarado (`src/**`, acesso tipado por Prisma, tabela FORCE). **(2) B3 (f) + C3-F2** — igualdade catálogo↔L0 por nome nos dois sentidos e tabela FORCE → model; as duas grafias do C3-F2 com ≥ 1 chave; M-B3c. **(3) B4 — superfície** — lista fechada de rotas (router) e jobs (registro) em runtime; um cenário executado por membro FORCE (rotas e os três jobs de nuvem) com corpo/efeito não vazio e igual nos dois papéis; igualdade "membros FORCE == cenários executados"; M-B4a, M-B4b, M-B4c. |

**Inelegíveis por nome (não podem ocupar cadeira da junta 2):** os que **acharam** no ciclo 1 —
`agente-dba-guardiao` (C1), `agente-secops` (C2), `guardiao-fail-closed` (C3) e o `inspetor-de-terreno-da-junta`
da junta 1 (achou o R7; segue podendo ser **inspetor**, que não vota); os que **planejaram** —
`planejador-b-san3-05-v3`, os planejadores das versões v1 e v2 (papel `planejador-mestre`; os nomes não estão
registrados no objeto — o inspetor confere em `controle/` e no log), `planejador-ciclo2-b-san3-05` (GPT-5.6 Sol)
e `planejador-ciclo2-b-san3-05-sucessor` (eu); os que **criticaram** — `critico-b-san3-05` (r1 e r2); os que
**desenvolveram** — `dev-b-san3-05`, `dev-b-san3-05-sucessor-1`, `dev-b-san3-05-sucessor-2` e o dev do ciclo 2
(nome dado pelo orquestrador no disparo). O inspetor confere por nome (§C7.1-bis), inclusive contra os
especialistas não rastreados que existem na árvore principal com nome parecido.

**Reprovação por construção — o que a junta 2 NÃO pode cobrar** (cobrar é voto sem base; o inspetor e a ata
registram e descartam):
1. **KPI** — congelado (§C7 item 8(5)); a única exigência é `Kpis/` igual à `origin/main`.
2. **Classes pré-existentes fora do escopo**, que já têm dono: as 53 chaves do inventário (exceto as que o B3
   muda), a suíte `-db` inteira sob papel real e os 9 jobs fora da superfície (`B-ARNES-2`), funções `SECURITY
   DEFINER` (`B-SAN3-10`), o `work()` default de `LocalAuthLoginService` (J12), o timeout do runner/CI (J5), a
   leitura morta do rateio (`B-O6R-08`) e a postura no `/health` — viram pendência, nunca voto contra.
3. **Residuais declarados por construção**: `/proc/<pid>/environ` do `psql` enquanto roda; o verificador SCRAM no
   log permitir ataque de dicionário offline (mitigado pela exigência de senha aleatória longa); a CI não ler o log
   do servidor (a matriz é a B7); a semântica do contexto (envoltório confiado que não sete GUC, `tenantId`
   errado) fora da superfície dinâmica; acesso por `pg` direto ou fora de `src/**`; a sobre-aproximação
   fail-closed de view `security_invoker` (D2).
4. **Forma que escapa fora do alcance declarado** do gerador. Dentro do alcance (`src/**`, acesso tipado por
   Prisma, tabela FORCE), forma que nasce **permitida** é defeito do bloco e bloqueia; forma que o gerador não
   resolve e marca **suspeita** é o comportamento pedido, não defeito.
5. **Números de texto herdados** — md5 do Apêndice E (deixou de ser critério, D2), "26 fixtures", "73 CR", as
   contagens do PR do ciclo 1, o N=19 do objeto: vale o N medido no head do ciclo 2.
6. **Mecanismo em vez de propriedade** — no B1 vale a propriedade (senha em claro nunca chega ao servidor), não
   o uso de `\password`; no B2, a exclusão mútua provada, não a forma do helper.
7. **Norma citada que não existe na ref julgada** (§A7) e redação de plano/documentação sem efeito no produto.
8. **Falha de infraestrutura não atribuível ao objeto** (queda do Docker, rede, cota) — re-execução declarada na
   evidência, nunca silenciosa; mas `XX000` no TAP **conta** (é o B2) e não é "infraestrutura".

### C2.6 Pendências com dono

Registradas pelo dev em `agent-orchestration/controle/pendencias.md` (e no índice, só pelo gerador) no próprio PR
do ciclo 2. Nenhuma bloqueia este PR.

| id | severidade | escopo (com evidência) | o que é | dono | bloqueia | teste de encerramento |
|---|---|---|---|---|---|---|
| `P-SAN3-05-RUNNER-SEM-TIMEOUT` (nova) | MÉDIA | `pre-existente` — `scripts/run-backend-tests.mjs` e `.github/workflows/ci.yml` anteriores ao bloco e PROIBIDOS nele (§6 v3); medido pela C2 do ciclo 1 (F-C2-03: sob a M2 o runner ficou preso até `timeout 150`, ec=124) | Não há timeout por arquivo no runner nem `timeout-minutes` no job `backend`: um teste que trave prende o job inteiro em vez de falhar. O D3 fecha o caso do T15; a classe continua para qualquer outro teste. | `B-ARNES-2` (dono do `SUITES` e do job `backend-postgres`) | não | um teste que dorme além do teto falha o job em ≤ o teto, com o nome do arquivo |
| `P-SAN3-05-LOCAL-AUTH-WORK-SEM-GUC` (nova) | MÉDIA | `pre-existente` — `src/modules/auth/services/local-auth-login.service.ts:106`, origem `35c218a8` (2026-06-07), achado da C3 do ciclo 1 (nota); `src/modules/auth/**` PROIBIDO aqui | O `runWithTenantContext` default de `LocalAuthLoginService` é `work()` sem GUC: fail-open em princípio. Hoje toda construção de produção injeta `withTenantRls` (medido pela C3: `auth-runtime.ts:81-84`, `session-admin.service.ts:287-290`). | a nomear pelo orquestrador; candidato `B-ARNES-2` (a suíte sob papel real exporia uma construção nova sem o envoltório) | não | o default deixa de existir (parâmetro obrigatório) ou falha fechado, provado por teste |
| `P-SAN3-05-LOG-DO-SERVIDOR-FORA-DA-CI` (nova) | BAIXA | `dentro-do-bloco` (residual declarado do B1) | A CI não lê o log do servidor PostgreSQL; a regressão "senha em claro de volta ao canal SQL" só é pega na CI pela guarda estática do T14, e por execução só na bateria da junta (B7). | `B-ARNES-2` (workflows) | não | um job de CI com PostgreSQL descartável e leitura do `server.log` roda a matriz do B7 e fica vermelho sob a M-B1a |
| `P-SAN3-05-SUITE-DB-SOB-PAPEL-REAL` (existente — **sub-item**) | ALTA | `pre-existente` (já registrada, dono `B-ARNES-2`) | **Acrescentar a lista nominal medida** em `src/infra/jobs/job.registry.ts`: os 9 jobs fora da superfície de plataforma (`aws-cur.import-cost-file`, `checklist-attachment-postprocess`, `notification-dispatch`, `notifications.scan-due`, `audit-log-fanout`, `field-ops-event-fanout`, `impound.reconcile-removals`, `charging.accrue-daily`, `impound.notify-due`) não têm medida sob o papel sem bypass; o inventário estático não tem chave suspeita em `notifications` nem em `charging`, mas o residual semântico (envoltório que não sete o GUC) só a medida dinâmica fecha — e `charging.accrue-daily` é dinheiro. **Recomendação ao dono:** o Ato 2 em **produção** (trocar o `DATABASE_URL` do app para `erp_runtime`) espera a medida desses 9 jobs, ou é decidido em ata com o risco dito. | `B-ARNES-2` | não este PR; **proposta**: o Ato 2 em produção | cada job executado sob papel `NOSUPERUSER NOBYPASSRLS` produz o mesmo efeito que sob superusuário, no mesmo seed |

**Pendências do ciclo 1 que este ciclo fecha (o dev as marca FECHADA no PR, com a evidência do C2.4):** nenhuma
pendência registrada nasceu dos achados A1–A4, F-C2-01..04 e C3-F1..F3 (foram para o R-1, não para
`pendencias.md`); fechá-los é o próprio ciclo. `P-O6R-07B-TESTE-DO-DEFAULT-CEGO-AO-EXPORT` continua EM ANDAMENTO
até o merge (o T2 e, agora, o T15 sem a variável exercem o export).

### Fecho do ciclo 2

**O que este ciclo 2 substitui na v3** (onde divergirem, vale o C2): o §6 (escopo) pelo C2.3; o §8 (bateria) pelo
C2.4; o §10 (junta) pelo C2.5; o md5 do Apêndice E deixa de ser critério (D2); o §11, Ato 1, passo 3 (MODO 0) e o
R14 do §12 perdem a premissa — **decisão deste plano:** com a senha chegando ao servidor só como verificador SCRAM,
o MODO 0 e o `DB_RUNTIME_ALLOW_LOG_ALL` **saem** (recusar `log_statement=all` e aceitar amostragem, que registra o
mesmo verificador, seria incoerente), e o caso "MODO 0 recusa" do T14 (blob l.577) vira "`log_statement=all` →
sucesso com `SCRAM-SHA-256$`". Se o dev escolher um mecanismo em que ainda passe algo sensível pelo canal, o MODO 0
fica e a junta julga pelo B7. `docs/deployment.md` sai com o Ato 1 reescrito por isso. **Acréscimo ao B7:** uma
linha com tty alocado (`docker exec -t`): o script não pede a senha no terminal nem trava (≤ 60 s), e a senha
continua 0 — no Ato 1 o operador roda o script do próprio terminal, e o `psql` abre `/dev/tty` quando pode (por
isso o `setsid` medido; numa máquina sem `setsid`, o script falha nomeando o motivo, nunca pede a senha).

**Riscos** (o que pode dar errado no desenvolvimento ou na junta 2):

| R | risco | mitigação no plano |
|---|---|---|
| RC1 | O remédio do B1 muda a ordem: papel e grants numa transação, senha numa segunda sessão. Se a segunda falhar, o papel fica sem a senha nova. | Falha fechada (sem senha nova não há login), saída ≠ 0 nomeando o passo, reexecução idempotente; a B7 cobre sucesso e modos. |
| RC2 | Helper travado do B2 com impasse: escrita da transação antes do filho sobre o mesmo objeto, ou filho mais lento que a janela de 30 s. | Filho assíncrono, timeout menor que a janela, nenhuma escrita própria antes do filho (C2.1 B2); a C2 da junta mede. |
| RC3 | A relação aninhada (C3E) faz o inventário crescer. | Medido: o fail-closed do C3-F1 acrescenta **0** chave hoje (72 classes injetadas, todas com `new` em `src`); o L0 por nome não muda nada (106 = 106). Só a relação aninhada pode crescer: cada chave nova com motivo; **acima de 20 chaves novas, o dev para e relata**. |
| RC4 | Cenário do B4 vermelho em membro que depende de arquivo PROIBIDO (`POST /cloud-cost-allocations/runs` e os jobs `cloud-charges.calculate` e `cloud-cost-allocation.run` não foram medidos — têm efeito colateral). | Parada do dev (C2.3). As 3 rotas GET sem medida foram medidas por mim: iguais e não vazias. |
| RC5 | A integração da `main` traz mudança que quebra a suíte (#401, #407, #408 e o que entrar até o dev). | B11 (suíte inteira) e check-runs do head integrado. |
| RC6 | O próprio conserto reabre a classe (o que a junta 1 já pegou duas vezes no histórico deste bloco). | Cada propriedade tem mutação que a deixa vermelha (C2.4) e a C3 escreve uma forma própria; quem conserta não julga. |
| RC7 | Disco: N=3 receitas + N=10 + B7 + B10 + B11 por cadeira (≈ 0,4 GB por receita; 13 GB livres hoje). | `df` entre cadeiras, `DEEP_CLEAN=1` abaixo de 10 GB, máx. 2 cadeiras vivas. |
| RC8 | Ativação em produção com os 9 jobs fora da superfície sem medida (`charging.accrue-daily` é dinheiro). | Sub-item em `P-SAN3-05-SUITE-DB-SOB-PAPEL-REAL` com recomendação ao dono (C2.6); não é deste PR. |

**Rollback.** Antes do merge: `git revert` dos commits do ciclo 2 no ramo (sem reescrever, sem force-push).
Depois do merge: `git revert` do squash, sem migração a desfazer; o papel criado pelo Ato 1 fica inerte enquanto
o secret do app não o usar, e o §12 R1 da v3 (secret anterior ou imagem anterior) continua valendo.

**Tamanho estimado do dev:** médio-grande. ≈ 9–12 arquivos e ≈ 600–1.000 linhas: script e documentação (B1 + D2
+ retirada do MODO 0), a trava (D2), o teste de guarda `-db` (B1-i, B2, D1, D3, D4 — o maior: 15 chamadas a
reencaminhar pelo helper travado), o gerador e o T13 (B3: quatro instâncias, fixtures, mecanismo do C3-F2), o
teste de superfície (B4: 4 rotas, 3 jobs, enumeração do registro, igualdade de conjuntos), o teste catálogo↔L0,
a integração da `main`, a restauração do `Kpis/` e o registro. Uma sessão longa de dev, mais ≈ 1 h de bateria; a
junta 2 leva de 3 a 5 h de execução somando as três cadeiras.

**O que a junta 2 deve medir com mais cuidado:** (1) o B1 sob **todas** as configurações da B7, inclusive tty e
`password_encryption=md5`, porque é o único defeito grave do ciclo 1 e a CI não o vê; (2) o B2 pelo **canário**
e pela **guarda estrutural**, não pela contagem de rodadas verdes — eu vi 0 vermelho em 13 rodadas no objeto
defeituoso; (3) o gerador com **forma própria** dentro do alcance, porque cada correção anterior dele reabriu a
classe noutra forma; (4) a igualdade "membros FORCE == cenários executados", inclusive os três jobs.

STATUS: COMPLETO — planejador-ciclo2-b-san3-05-sucessor (Claude Opus, substituição declarada), 2026-10-08.

**Errata do orquestrador ao D4 (2026-10-08, resposta à PARADA-D4 do dev do ciclo 2 — opção (b)).** O aceite acima
pede que o `username` decodificado não apareça no JSON de log, mas o contrato do próprio bootstrap
(`src/database/runtime-role.bootstrap.ts`, l.13: *"O log diz session_user, current_user e as vias de escape — nunca
URL, host ou credencial"*) registra de propósito o papel que conectou, e esse é o valor que a trava existe para provar.
O nome do papel não é credencial. **D4 passa a ser:** `hostname`, `port`, `password` (decodificados), o nome do banco,
`postgresql://` e `password` não aparecem no JSON serializado das entradas de log; o `username` só pode aparecer como
**valor** das chaves `session_user`/`current_user` (identidade medida no banco), nunca dentro de URL, DSN ou outro campo.
`src/database/runtime-role.bootstrap.ts` continua PROIBIDO. **Mutações:** o logger da trava passa a incluir o host →
vermelho; o logger passa a incluir a senha → vermelho; o logger passa a incluir o `username` num campo que não seja
`session_user`/`current_user` → vermelho. O texto original do D4 fica acima como histórico; este parágrafo o substitui.

**Errata 2 ao D4 — DECISÃO DO DONO (2026-10-08, resposta à PARADA-D4-2; fonte §A1.1).** Perguntado entre (a) nome de
papel pode aparecer no log como identidade, (b) esconder o nome de papel ampliando o escopo para o bootstrap, ou (c)
mandar ao planejador, o dono escolheu literalmente *"Nome de papel pode aparecer (Recomendado)"* — o que **ratifica a
errata 1** acima e vale como regra do D4: nome de papel do banco (`rolname`) é identidade, não credencial, e pode
aparecer como valor de `session_user`, `current_user`, `escapes[].rolname` e na mensagem de recusa no formato
`via:rolname` (o diagnóstico que diz ao operador qual papel abre o bypass). Continua proibido: `hostname`, `port`,
`password` (decodificados), nome do banco, `postgresql://`, `password`, e qualquer nome de papel dentro de URL/DSN ou de
outro campo. As três mutações da errata 1 (host, senha, nome de papel fora dos campos de identidade) seguem
obrigatórias. `src/database/runtime-role.bootstrap.ts` continua PROIBIDO.
