# B-SAN3-05 — PLANO v3 — o papel de runtime não escapa de RLS (itens 9 e 10 do §4.1) — ciclo 1, replanejado após a crítica r2 (última rodada do crítico)
> **Papel:** `planejador-mestre` · **identidade:** `planejador-b-san3-05-v3` (nova; não planejou v1/v2, não criticou, não desenvolve — §C7.4-bis) · **modelo:** **Fable 5.1** (`claude-fable-5-1`, o fixado no frontmatter; **sem substituição**) · **mandato_md5:** `068dbc0ee9bc5f1b0d3a80fd41ab3e69` (`tr -d '\r' < agent-orchestration/omega/juntas/votos/B-SAN3-05/00-mandatos/planejador-v3.md | md5sum`)
> **Mandato:** `agent-orchestration/omega/juntas/votos/B-SAN3-05/00-mandatos/planejador-v3.md` (63 linhas; mandato_md5 `068dbc0ee9bc5f1b0d3a80fd41ab3e69`) · **corpo do papel:** `git show HEAD:.claude/agents/planejador-mestre.md | tr -d '\r' | md5sum` → `4c912f69a93f07b14d8fd1c49539c778` · **relatório de evidência (P1):** `agent-orchestration/omega/juntas/votos/B-SAN3-05/PLANEJADOR-v3-relatorio.md` · **responde a** `docs/revisoes/SAN3/B-SAN3-05-critica-r2.md` (crítico `critico-b-san3-05`, Opus 5.5 declarado, head `c727156`) · **v2 recuperável em** `c727156`, **v1 em** `c3f57e9`.

> **MEDIDO (onde este plano foi medido).** Sessão de **nuvem**: `uname -a` = `Linux vm 6.18.44-fc-v51 #1 SMP PREEMPT_DYNAMIC @0 x86_64 GNU/Linux`; `PATH=/opt/node20/bin:$PATH node -v` = `v20.20.0` (o Node do CI, `ci.yml` `node-version: 20` em 5 jobs; o v22 da imagem não foi usado para número nenhum); `git --version` = 2.43.0. Ramo `docs/plano-b-san3-05` (base `5b6e1036` = merge-base com `origin/main`; `origin/main` = `5bcdcc58`, 2 commits de registro/governança depois). **As árvores `src`, `tests`, `scripts`, `prisma` são IDÊNTICAS** entre `5b6e1036`, `3b1fe0f9` (base da v2) e `origin/main` (`git rev-parse <ref>:<dir>` → `21e1c4f2…`, `2854a3ec…`, `6445f8bc…`, `e906ac2e…` nas três) — logo toda medição de código deste plano vale para `origin/main`; o ramo só toca `docs/` e `agent-orchestration/` (`git diff --name-only origin/main HEAD -- src tests scripts prisma | wc -l` → 0). Postgres **16.14** descartável próprio em `127.0.0.1:54371` (porta provada pela conexão; `ss` não existe na imagem), banco `erp_v3` com as migrações do head (115 tabelas, 106 FORCE, 0 views), defaults de log do PG16 (`log_min_error_statement=error`, `log_statement=none`). Sem Docker. Nenhum SHA digitado; nenhum número herdado da v2 nem das críticas — cada um foi re-executado (relatório §0–§6).
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

EM APURAÇÃO

## §1 — Objetivo · ator · fluxo · contrato

EM APURAÇÃO

## §2 — Onde mora a propriedade — respondido pela terceira vez, de outro jeito

EM APURAÇÃO

## §3 — Entregas

EM APURAÇÃO

## §4 — Modelagem: o papel (script v3), a trava (v3) e o compose

EM APURAÇÃO

## §5 — Arquivos tocados e regra do espelho

EM APURAÇÃO

## §6 — Escopo (§C4): PERMITIDO e PROIBIDO

EM APURAÇÃO

## §7 — Critérios de aceite A1–A24, cada um com a mutação que o deixa vermelho

EM APURAÇÃO

## §8 — Testes: baseline N, meta M ≥ 2N, T1–T16 e a bateria

EM APURAÇÃO

## §9 — KPI (§C3)

EM APURAÇÃO

## §10 — Junta (§C7): quórum, cadeiras, o C3(1) reescrito, papéis

EM APURAÇÃO

## §11 — Atos do dono (seis modos de falha nomeados)

EM APURAÇÃO

## §12 — Riscos e rollback

EM APURAÇÃO

## §13 — O que este plano NÃO pega (pendências nomeadas, com dono)

EM APURAÇÃO

## §14 — Comando do bloco

EM APURAÇÃO

## §15 — Próximo papel depois desta v3

EM APURAÇÃO

## Apêndices

EM APURAÇÃO — A (gerador v3 verbatim + inventário congelado do head, 53 chaves) · B (medição sob papel real: referência ao blob da v2 + re-execução) · C (`scripts/db-runtime-role.sh` v3 verbatim) · D (fixtures: as 17 da r1 por referência ao blob da v2 + as 9 da r2 verbatim) · E (trava v3, idêntica ao §2.2).
