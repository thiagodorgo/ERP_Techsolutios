# PLANO B-O6R-ARNES — o arnês de teste vira bloco próprio e fecha PRIMEIRO: mecanismo único de catálogo, teardown que não deixa papel vivo, denominador com piso

**Papel:** `planejador-mestre`, instância NOVA, Fable por contrato (`D-PLANEJADOR-MODELO-FABLE`). Não achei defeito, não desenvolvo, não voto, não sou porteiro. Encerro a participação ao entregar este plano.
**Por que este bloco existe:** `D-JUNTA-ESCOPO-E-CALIBRACAO` (decisão do dono, 2026-08-28, §5): o `B-O6R-02` foi reprovado no ciclo 4 por um defeito que **não criou e estava proibido de consertar** — a classe do arnês (`P-O6R-ARNES-ISOLAMENTO`, 2026-08-18, anterior a todos os blocos O6R de código). Ela sai do financeiro, vira este bloco, e roda **primeiro**: é pré-requisito de confiança em qualquer número dos 10 blocos restantes. A emenda `d711f50` ao plano do ciclo 5 já registra que a opção híbrida daquele plano está **superada** por esta decisão.
**Insumos lidos:** `auditoria-juntas-2026-08-28.md` · `D-JUNTA-ESCOPO-E-CALIBRACAO` (decisoes.md l.1610–1700) · ata `J-B-O6R-02-ciclo4.md` (referenciada; erratas lidas via relatório e pendências) · `R-B-O6R-02-ciclo4.md` com ERRATA · voto `04-jurado-c4-suplente-arnes.json` verbatim (tabela N=10 + vaza-metro) · `pendencias.md` (P-O6R-ARNES-ISOLAMENTO + emendas c3/c4 + as P-O6R-B02-* de 28/08) · plano `B-O6R-02-ciclo5-plano.md` §0 inteiro com ERRATA S0 · o código da base nos 8 arquivos-alvo (leitura integral do runner, do ratchet e do arnês; amostras dos 3 escritores).
**Achador ≠ planejador ≠ dev (§C7.4-bis):** achadores = a cadeira do arnês do c4 + as medições do orquestrador no briefing deste bloco; planejador = eu; desenvolvedor = instância nova designada no S0. Nenhum acúmulo.

**Objetivo:** nenhum arquivo de teste escreve ACL/catálogo de cluster fora do mecanismo único; papel efêmero não sobrevive à execução nem quando a limpeza falha no meio; o runner tem **piso de denominador** (arquivo que some sem declarar skip = erro nomeando o arquivo) e publica o denominador por execução; e o número da canônica 3 **sobrevive à forma**: 10/10 verdes com denominador idêntico e vaza-metro zerado.
**Ator:** desenvolvedor único, instância NOVA nominalmente designada no S0, com auditoria própria antes de codar (F0).
**Fluxo origem→destino:** este plano → S0 (orquestrador: worktree, designação, fábrica, briefing do inspetor) → F0 (auditoria do dev) → F1–F4 → bateria §9 + drills D37–D43 → `inspetor-de-terreno-da-junta` → junta de **3, maioria simples** (regra nova — o bloco só toca `tests/` e `scripts/`) → PR → porteiro. **Sem ataque do `critico-adversarial` ao plano**: a `D-JUNTA-ESCOPO-E-CALIBRACAO` §2 o reserva para blocos de invariante (dinheiro/segurança/permissão/perda de dado), e este bloco não é um — registrado aqui para a ata.

---

## §0 · AUDITORIA POR EXECUÇÃO — confirmação por amostra do que já está medido, com a forma declarada

**Forma:** árvore principal `demo/investidor` (leitura apenas; head moveu de `1231e71` para `d711f50` durante a sessão — o commit novo é a emenda ao plano c5, conferido por `git show --stat`). Zero mutação; zero comando na base viva; sem cluster próprio nesta sessão de planejamento — onde a confirmação exigiria banco, ela vai para o F0 do dev com juiz nomeado (§14). Comandos: `git rev-parse <ref>:<caminho>` (blob-identidade — a forma honesta pós-errata autocrlf), `git diff --stat`, `git ls-tree`, `grep`/leitura dos arquivos.

**0.a · Blob-identidade dos alvos nas três bases (medido agora — o fato que decide a base do bloco):**

| Arquivo | `origin/main` `6efe5ad` | `demo/investidor` | head fin. `12c3825` |
|---|---|---|---|
| `tests/helpers/auth-identity-fixture.ts` | `131eb0e` | idem | **idem** |
| `tests/audit-security.test.ts` | `ba85452` | idem | **idem** |
| `tests/vehicle-identity-schema.test.ts` | `5363acf` | idem | **idem** |
| `tests/impound-process-checklist-link-schema.test.ts` | `9c54dd6` | idem | **idem** |
| `tests/rls-tenant-isolation.test.ts` | `80dcf31` | idem | **idem** |
| `tests/db-catalog-write-guard.test.ts` | `a491a75` | idem | **idem** |
| `scripts/run-backend-tests.mjs` | `2052a24` | idem | **`28a589b` — DIFERE** |
| `tests/npm-test-runner-guard.test.ts` | `ab55dd9` | idem | **`593c3b8` — DIFERE** |

`git diff --stat 6efe5ad 12c3825` sobre os 8: **exatamente 2 arquivos, +42 e +56 linhas, 0 deleções** — é o guard de skip C5.3 (P8) e seus casos, nascidos no ciclo 3 do financeiro e provados pelo D26a do c4 (`ec=1`, "GUARD DE SKIP (P8)… 3 pulados > orçamento 2"). Confirmei por grep no blob do head: `SKIP_BUDGET_DB = 2` (l.82), `evaluateDbSkipBudget` (l.90), aplicação monotônica (l.339–341). **O runner da base NÃO tem o guard** (li o arquivo inteiro, 321 linhas: nenhuma ocorrência).

**Consequências:** (i) os **produtores do `XX000` são byte-idênticos na base** — o vermelho-controle medido no head (5/13 na bateria barata, 7/10 na canônica 3) transfere por identidade de conteúdo, e o dev só o re-estabelece por amostra (F0); (ii) o aceite 5 (D26 vermelho) **exige portar o delta +42/+56 para a base** — sem isso, o drill do auto-pulo fica verde na base porque o guard não existe lá.

**0.b · Quem escreve catálogo em `tests/` (re-medido por grep, confirma o briefing):** exatamente 6 arquivos casam `CREATE ROLE|DROP ROLE|DROP OWNED|GRANT USAGE ON SCHEMA|GRANT … ON ALL TABLES`. Importam `withRoleCatalogLock`: 4 arquivos (`db-catalog-write-guard` [menção], `auth-identity-fixture` [o dono], `rls-tenant-isolation`, `auth-identity-link-events-db`). **Fora do mecanismo: `audit-security`, `vehicle-identity-schema`, `impound-process-checklist-link-schema`** — os mesmos 3 do briefing, com as razões do ratchet dizendo por escrito *"fora do lock — destino: P-O6R-ARNES-ISOLAMENTO"* (allowlist l.85–107, contagens congeladas 5/5/5).

**0.c · A forma exata dos teardowns (lido, arquivo:linha) — e uma armadilha que o plano precisa nomear:**
- `audit-security.test.ts:158–159`: `DROP OWNED BY` → `DROP ROLE IF EXISTS`, **sem catch** — a falha do primeiro (o `XX000` do c4) engole o segundo; a role sobrevive com LOGIN. É o B-3c4.
- `vehicle-identity-schema.test.ts:260–261` e `impound…:122–123`: os DOIS statements com **`.catch(() => undefined)`** — o anti-padrão oposto: a falha é **engolida em silêncio**. Se o `DROP OWNED` falha, o `DROP ROLE` seguinte falha por dependência (`2BP01` — role com grants não dropa) e **ninguém fica sabendo**. "Resiliente" não é "silencioso": é *tentar todos, reportar todas as falhas ao fim, e o papel não sobreviver*.
- **Armadilha para o dev (semântica Postgres, a executar no D39):** try/catch por statement, sozinho, **não** satisfaz o aceite 4 — se o `DROP OWNED` real não rodou, o `DROP ROLE` isolado falha com `2BP01` e a role continua viva. O teardown resiliente precisa de segunda tentativa da sequência inteira (ou equivalente) dentro do próprio teardown.

**0.d · As 4 famílias de role embutem `Date.now()` no nome (medido por grep):** `audit_rls_<ts>_<hex>` (l.31), `vid_rls_test_<ts>_<hex>` (l.192), `vid_link_rls_<ts>_<hex>` (l.84), `rls_test_<ts>_<hex>` (l.25) — o corte de idade de 60 min do sweep (`ORPHAN_ROLE_MAX_AGE_MS`, arnês l.73) funciona para todas por construção de nome.

**0.e · O que herdo como MEDIDO por outrem e confirmo por identidade de blob (não re-medi):** a tabela de sondas de par do §0.a do plano c5 (`GRANT×GRANT` 200/200 `XX000` · `GRANT ALL×DROP OWNED` 40/40 · `DROP OWNED×GRANT` 200/200 · controle `CREATE ROLE×CREATE ROLE` **0/150** — o objeto disputado é a **tupla de ACL**: `pg_namespace.nspacl`/`pg_class.relacl`, **não** `pg_authid`); a bateria barata N=13 = 5 vermelhas + queda 37→32; o `XX000` atingindo **quem toma o lock** (r09/r13 — a propriedade é "TODOS os escritores num mecanismo único", não "os 3 de fora entram"); a assinatura TAP do arquivo-que-some no Node 20.19.5 (1 ponto top-level `ok` **nomeado pelo caminho do arquivo**, `# suites 0`; arquivo com testes não ganha ponto de arquivo); a órfã pós-r08 com LOGIN. Tudo medido no head `12c3825` — e os produtores são blob-idênticos na base (§0.a), então a expectativa transfere. O F0 do dev re-estabelece por amostra na base (§14).

**0.f · Contexto de governança confirmado:** `jurado-c5-arnes-catalogo-postgres` existe em `.claude/agents/especialistas/` + espelho Codex (commit `77ead96`, 314+308 linhas); `origin/main` = `6efe5ad` (não moveu); main tem **103 migrations** e contém os 6 arquivos da bateria barata + `core-saas-role-authority-db.test.ts`; runner-guard da base tem **21 casos** e o ratchet **1**; a errata CR/autocrlf está fechada (medição de commit = checkout LF puro ou `git show` do blob, nunca `git archive`+`tar`).

---

## A BASE DO BLOCO — decidida e justificada

**Base: `origin/main` = `6efe5ad`.** Branch nova `fix/o6r-arnes-catalogo-unico` a partir dela. Quatro razões, todas medidas:

1. **O arnês é infraestrutura de teste comum e não depende do financeiro:** os 6 escritores de catálogo, o arnês e o ratchet são **byte-idênticos** entre `origin/main` e o head do financeiro (§0.a) — a classe inteira vive na main e se corrige na main.
2. **Este bloco precisa mergear PRIMEIRO** (decisão do dono §5): basear na branch do financeiro inverteria a dependência e o prenderia atrás de um PR reprovado.
3. **O único delta relevante main→head (+42/+56, aditivo puro) é portável** — e o aceite 5 o exige de qualquer forma (§0.a-ii). Portando-o verbatim (F1), o rebase futuro do financeiro encontra o conteúdo que ele próprio escreveu: conflito mínimo, por desenho.
4. `demo/investidor` tem 33 commits sem PR e é trilha de orquestração, não base de PR de código para a main.

---

## §1 · PROPRIEDADES — cada uma com o drill que a julga

> Regra herdada: **o drill só conta se ficar vermelho na mutação e verde no restore**, com baseline medido na hora. Verde durante a quebra invalida o drill.

- **PA — mecanismo único de escrita de catálogo (fecha B-1c4 na origem):** *nenhum arquivo de `tests/` executa escrita de ACL/catálogo de cluster fora de `withRoleCatalogLock`; a serialização cobre TODOS os escritores, não uma maioria.* Juízes: **D37** (bateria barata N≥13, 0 `XX000`, denominador constante) e **D38** (sonda de barreira sob mutação: sem o lock de um lado, o `XX000` volta).
- **PB — janela curta:** *o lock é tomado só nas sequências de catálogo (setup e teardown), nunca segurado durante o corpo do teste; os 30 s de `maxWait/timeout` são orçamento, não convite.* Juízes: leitura do diff pela junta + duração por rodada publicada no D42.
- **PC — teardown resiliente E ruidoso (fecha B-3c4):** *falha de um statement de limpeza não engole os seguintes; todas as falhas são reportadas ao fim; e o papel NÃO sobrevive — inclusive quando o primeiro statement falha (armadilha `2BP01`, §0.c).* Juiz: **D39**.
- **PD — sweep por família com corte de idade (amplia P5 da pendência-mãe):** *as 3 famílias novas (`audit_rls_`, `vid_rls_test_`, `vid_link_rls_`) entram no varredor do arnês com o mesmo corte de 60 min; prefixo NÃO registrado é intocável (anti-mass-delete).* Juiz: **D43** (recolhe a órfã velha; não toca prefixo alheio nem timestamp novo).
- **PE — piso de denominador no runner (fecha B-2c4/A8 e `P-O6R-B02-RUNNER-SUMICO-SEM-SKIP`):** *arquivo expandido que termina sem registrar teste e sem declarar skip é ERRO que NOMEIA o arquivo — nunca ec=0 com total menor; o denominador é publicado por execução.* Juiz: **D40**. A assinatura medida (§0.e) está à disposição do dev; o caso permanente protege contra deriva de versão do Node.
- **PF — o guard de auto-pulo declarado vale na base (aceite 5):** *o D26 do ciclo 4 fica vermelho nomeando a contagem também nesta base — o delta +42/+56 do head é portado byte-igual.* Juiz: **D41** (nas duas pontas: verde-defeito antes do porte, vermelho correto depois).
- **PG — o número sobrevive à forma (a frase do veto):** *canônica 3 em 10/10 ec=0, denominador IDÊNTICO nas 10, Δroles=0 e Δlinhas explicado, publicando por rodada tests/pass/fail/skip/ec + Δroles/Δlinhas.* Juiz: **D42**.

## §2 · CORREÇÕES (propriedade + critério; o COMO é do dev)

- **C-A (PA/PB):** os 3 escritores fora do mecanismo (`audit-security`, `vehicle-identity-schema`, `impound-process-checklist-link-schema`) passam a executar **toda** a sua sequência de catálogo (CREATE ROLE/GRANTs no setup; DROP OWNED/DROP ROLE no teardown) dentro de `withRoleCatalogLock` importado do arnês, em janelas curtas — criação de tenant/usuário e o corpo dos testes ficam **fora** do lock. Critério: D37 + D38 + grep de importação + leitura do diff.
- **C-B (PC):** o arnês exporta um teardown de role **resiliente por statement e ruidoso** (sugestão de nome: `dropEphemeralRoleResilient`; o nome é do dev), usado pelos 3 escritores **e** pelo caminho de drop do próprio arnês. Remove os `.catch(() => undefined)` de vehicle/impound (§0.c). Precisa sobreviver à armadilha `2BP01` (segunda tentativa da sequência dentro do próprio teardown, ou equivalente). Critério: D39.
- **C-C (PD):** `ORPHAN_ROLE_NAME_PATTERN`/`sweepOrphanEphemeralRoles` ganham as 3 famílias novas com o mesmo corte de 60 min e o mesmo relatório em stderr. **`rls_test_` NÃO entra** — decisão consciente: há 68 órfãs legadas dessa família na base do dono, e um sweep que a alcançasse seria a classe do incidente de mass-delete se alguém apontar `DATABASE_URL` para a base errada; vira pendência nomeada (§12). Critério: D43.
- **C-D (PF):** porte **verbatim** do delta `6efe5ad→12c3825` em `scripts/run-backend-tests.mjs` (+42) e `tests/npm-test-runner-guard.test.ts` (+56), com atribuição no commit ("porta o guard de skip C5.3 do ciclo 3 do B-O6R-02, head `12c3825`"); alvo conferível: blobs finais **intermediários** = `28a589b`/`593c3b8` antes de o C-E mexer por cima. Critério: D41.
- **C-E (PE):** o runner ganha o **piso de denominador** (monotônico, como os guards existentes): ponto top-level cujo nome é um dos caminhos expandidos = arquivo que não registrou nada → `ec≠0` nomeando o arquivo; e a linha de sumário continua publicando `arquivos·testes·pass·fail·skipped` por execução. `npm-test-runner-guard` ganha ≥2 casos por fixture-dir (arquivo-que-some → vermelho nomeando; controle verde; a fixture protege contra deriva da assinatura TAP entre versões do Node). Critério: D40.
- **C-F:** allowlist do ratchet atualizada **conscientemente**: as 3 razões *"fora do lock — destino P-O6R-ARNES-ISOLAMENTO"* morrem (viram "DENTRO do lock"), contagens recongeladas pelo diff real. **Nota consciente:** casos -db permanentes novos (sonda de barreira, teardown, sweep — pisos §6) vivem em `db-catalog-write-guard.test.ts`, que é o único arquivo **excluído da varredura do ratchet por ser o detector** — o SQL deles não é visto pela trava lexical; a razão no cabeçalho do arquivo declara isso por escrito. Gate por `DATABASE_URL` com skip **declarado** (entra na contabilidade do orçamento do guard portado: o dev confere que o orçamento `SKIP_BUDGET_DB=2` continua correto na forma canônica — os casos novos **rodam** com banco presente, não pulam).

## §3 · Contrato REST — **NULO**

Nenhuma rota, payload, código HTTP ou reason é criado ou alterado — `src/**` é PROIBIDO e o diff contra a base tem de ser vazio (§9.9). Os 404 cross-tenant / 422 transição / 409 duplicidade permanecem byte a byte como estão, re-conferidos pela canônica 3.

## §4 · Modelagem — **NULA**

Nenhum model, nenhuma migration, nenhuma mudança de schema. `prisma/**` PROIBIDO (a FK de `reversal_of` é do B-O6R-02 ciclo 5, não deste bloco). Dinheiro/timestamptz/delete lógico: intocados por definição de escopo.

## §5 · Arquivos exatos

**Desenvolvedor — código:** `tests/audit-security.test.ts` · `tests/vehicle-identity-schema.test.ts` · `tests/impound-process-checklist-link-schema.test.ts` (C-A/C-B) · `tests/helpers/auth-identity-fixture.ts` (C-B/C-C) · `tests/db-catalog-write-guard.test.ts` (C-F + casos -db permanentes) · `scripts/run-backend-tests.mjs` (C-D/C-E) · `tests/npm-test-runner-guard.test.ts` (C-D/C-E).
**Desenvolvedor — registro/KPI (mesmo PR):** `Kpis/kpis-latest.json` · `Kpis/kpis-history.json` · `Kpis/kpis-history.md` · `Kpis/index.html` (§C3; `pr`/`merge_commit`/`approved_head` null na autoria) · `agent-orchestration/controle/pendencias.md` (§12) · `agent-orchestration/docs/status-geral.md` · `agent-orchestration/codex/log-execucao.md`.
**Orquestrador (fora do dev):** designação nominal; fábrica cria 2 cadeiras + 3 suplentes (identidade nova em `.claude/agents/especialistas/` + espelho `.agents/` via `sync-agent-agents.mjs`, fatia S0 do inspetor); plano/ata/votos persistidos na trilha `demo/investidor`.
**PROIBIDO:** `src/**` INTEIRO (diff vazio contra `6efe5ad` é critério de bateria) · `prisma/**` · `.github/workflows/ci.yml` · `CLAUDE.md`/`AGENTS.md` · `.env` · lockfiles · `infra/**` · `frontend/**` · `mobile/**` · **qualquer `tests/**` fora da lista** — nominalmente inclusive `tests/rls-tenant-isolation.test.ts` (já usa o lock; muda por herança do arnês, não por edição), `tests/auth-identity-backfill-db.test.ts`/`links-db` (idem, via fixture) e `tests/core-saas-role-authority-db.test.ts` (o vazamento +5/rodada é atribuição do B-O6R-02 c5, não daqui) · migrations existentes · junction/symlink de `node_modules` · `git checkout/stash/clean/reset --hard` na árvore principal · heredoc de shell para conteúdo de arquivo. **Arquivo fora das listas → o dev PARA e devolve.**

## §6 · Baseline N e meta M — pisos vinculantes

**Baseline medido (base `6efe5ad`):** runner-guard = **21 casos** · ratchet = **1 caso** → **N = 22** casos permanentes guardando estas classes. Bateria: canônica 3 na base tem denominador **não medido** (o 2745 é do head; o dev publica o da base com N=3 pré-correção) e vermelho-controle esperado herdado por blob-identidade (§0.e).
**Meta M:** nenhum caso morre (os 22 seguem) **+ ≥9 casos permanentes novos ⇒ M ≥ 31** nos arquivos-guarda. **Divergência declarada conscientemente:** a régua genérica M≥2N do contrato é de bloco de feature sobre baseline de módulo; dobrar 22 casos de guarda fabricaria teste-teatro — a régua deste bloco é **piso por propriedade**, vinculante:

| Propriedade | Piso |
|---|---|
| PA | ≥1 caso -db de sonda de barreira (par `DROP OWNED × GRANT` sob o mecanismo → 0 `XX000` em N≥50 iterações alinhadas) |
| PC | ≥1 caso -db de teardown resiliente (falha injetada no 1º statement → nenhuma role viva + falha reportada) |
| PD | ≥2 casos -db de sweep (órfã velha da família nova recolhida e reportada; prefixo não registrado + timestamp novo intocados) |
| PE | ≥2 casos runner-guard por fixture-dir (arquivo-que-some → vermelho NOMEANDO o arquivo; controle verde) |
| PF | os casos do porte (+56 do head) presentes e verdes; D26a vermelho na forma canônica |
| PG | publicação por rodada (tests/pass/fail/skip/ec + Δroles/Δlinhas) na bateria — artefato do PR, não caso |

Metas de bateria: canônica 3 **10/10 ec=0, denominador IDÊNTICO, Δroles=0**; bateria barata **13/13, 0 `XX000`, denominador constante**; canônicas 1 e 2 publicadas com N (vermelho ambiental pré-existente **declarado por nome**, não maquiado — é do bloco irmão). Número abaixo do piso **bloqueia**.

## §7 · Drills (continuam de D37) — todos com baseline na hora, mutação, ec registrado, restore por `hash-object` = blob, verde re-medido

| ID | Arranjo/mutação | Vermelho obrigatório | Vermelho-controle (prova de que não estava vermelho antes) |
|---|---|---|---|
| **D37** | bateria barata dos 6 arquivos (`node scripts/run-backend-tests.mjs` sobre a lista do briefing), N≥13, código corrigido, cluster descartável | 13/13 ec=0, **0 `XX000`**, denominador idêntico nas 13 | **5/13 vermelhas + queda 37→32 medidas no head** (blobs idênticos na base); re-estabelecido pelo dev na base em F0(a) — 0/13 vermelho no pré-correção = divergência, devolve |
| **D38** | no caso permanente da sonda de barreira, remover o lock de UM lado | `XX000` em N≥50; **0/50 = drill inconclusivo → reabre** | sonda P4 do c5: sem mecanismo, 200/200 |
| **D39** | falha injetada no 1º statement do teardown (ex.: `DROP OWNED` de role errada) | **nenhum papel vivo ao fim** (`pg_roles` limpo) E falha reportada; remover a resiliência → caso permanente vermelho | hoje: audit l.158/159 deixa role órfã com LOGIN (medido c4: 2 órfãs; c5 §0.a: 1); vehicle/impound engolem em silêncio (§0.c) |
| **D40** | fixture-dir com arquivo que sai limpo sem registrar teste, `DATABASE_URL` presente | runner **ec≠0 NOMEANDO o arquivo** | hoje ec=0, guard mudo (D26b do c4; §0.b do plano c5); re-medido pelo dev em F0(b) |
| **D41** | mutação de auto-pulo declarado com `DATABASE_URL` presente (o D26 do c4), nas DUAS pontas | **antes do porte (F1): ec=0 na base** — o buraco documentado; **depois do porte: ec=1** com "GUARD DE SKIP (P8)" nomeando a contagem | o guard não existe no runner da base (lido: 0 ocorrências); no head, D26a provou ec=1 |
| **D42** | canônica 3 N=10 com snapshot de catálogo + linhas por tabela antes/depois de cada rodada | **10/10 ec=0 · denominador IDÊNTICO · Δroles=0 · Δlinhas=0 ou produtor NOMEADO por execução na publicação** | tabela do c4 no head: 7/10, 2740×2745, 2 órfãs, +5/rodada; baseline da base = N=3 pré-correção publicado pelo dev |
| **D43** | semear 1 role órfã com timestamp velho (> 60 min) de cada família nova + 1 role `zzz_probe_<ts>` (prefixo não registrado) + 1 role de família nova com timestamp NOVO | sweep recolhe **só** as órfãs velhas das famílias registradas e reporta no stderr; `zzz_probe_` e a de timestamp novo **intocadas** | hoje o sweep não conhece as 3 famílias (arnês l.81/102: só `o6r_b01_`/`o6r_clone_owner_`) |

**Re-execuções obrigatórias:** ratchet do catálogo (com a allowlist nova) · os 21 casos do runner-guard + os portados · guards de KPI (`tests/kpi-dashboard-charts.test.ts` roda na suíte) · canônicas §9. Drills nunca commitados.

## §8 · Ordem e dependências

- **S0 (orquestrador):** branch `fix/o6r-arnes-catalogo-unico` a partir de `6efe5ad`; worktree próprio para o dev (`git worktree add --detach`, `npm ci` próprio — **junction PROIBIDA**, `DATABASE_URL=<descartável> npx prisma generate`); designação NOMINAL do dev por escrito; fábrica cria as 2 cadeiras novas + 3 suplentes; espelho Codex `--check` no head da branch (forma honesta: worktree real ou checkout LF puro — **nunca** `git archive`+`tar`, errata S0); briefing do inspetor com este plano + relatório do achador + voto do arnês + erratas.
- **F0 (dev, auditoria própria antes de codar):** (a) bateria barata N=13 no cluster próprio sobre a base — espera ≥1 `XX000` (vermelho-controle próprio; 0/13 → devolve ao planejador); (b) fixture do arquivo-que-some → ec=0 + assinatura do ponto nomeado pelo caminho; (c) `git rev-parse` blob-identidade dos 8 alvos contra a tabela §0.a — divergência → devolve; (d) leitura dos 3 teardowns (§0.c) confirmando as formas.
- **F1 (C-D):** porte verbatim do delta +42/+56 → **D41 nas duas pontas** → commit próprio com atribuição.
- **F2 (C-A/C-B/C-C — o coração):** mecanismo único nos 3 escritores + teardown resiliente + famílias no sweep + allowlist consciente (C-F) → **D37 · D38 · D39 · D43**. Se D37 não zerar o `XX000`, **PARA e devolve** com o produtor nomeado por execução.
- **F3 (C-E):** piso de denominador + casos runner-guard → **D40** (e re-D41: o piso não pode ter quebrado o guard de skip).
- **F4:** bateria integral §9 (**D42** dentro dela) + KPI + registro §12 + PR.
F1→F2→F3 em série (F2 muda o que F3 mede; commit por fatia); F4 fecha.

## §9 · Bateria (forma DECLARADA — número só vale com N e forma)

Regra: `cmd > "$LOG" 2>&1; ec=$?` — **exit por variável, nunca por pipe**; contagens lidas do TAP no arquivo; cada número publica comando, env, Node **v20.19.5**, N e forma; cluster descartável próprio recém-migrado (103 migrations da base) por bateria; base viva `erp-postgres`/`erp-redis` **jamais alvo**.

1. `npm run check` · `npm run lint`
2. **Bateria barata** (D37): N≥13, 13/13 ec=0, 0 `XX000`, denominador constante, publicada por rodada
3. **Canônica 3** (D42): banco descartável → `migrate deploy` → `DATABASE_URL` exportada → `npm test`, **N=10 sequenciais**, publicando POR RODADA tests/pass/fail/skip/ec/duração + Δroles/Δlinhas. Meta: 10/10, denominador idêntico, skips nomeados, Δroles=0
4. **Canônica 1**: `npm test` SEM `DATABASE_URL`, N≥3, publicada — vermelho ambiental pré-existente (se reproduzir na base) **declarado por nome**; consertá-lo é PROIBIDO aqui (bloco irmão)
5. **Canônica 2** (sanidade de regressão): `npm run db:seed` + `node --test --import tsx` com a lista SUITES do `ci.yml` **da base**, N≥3, denominador constante, grep `unhandledRejection|XX000|23505|40P01` = 0
6. **Drills D37–D43** com hash conferido em cada restore
7. `npm run build` · `npm --prefix frontend run check`
8. `node --check Kpis/app.js` + guards do painel
9. `git diff --check` · **diff de `src/**`, `prisma/**`, `CLAUDE.md`, `AGENTS.md`, `.github/**` contra `6efe5ad` VAZIO**
10. Teardown dos clusters/worktree executado e conferido; linha de limpeza no PR

## §10 · O que NÃO reabrir

1. **A deliberação de escopo** — feita e decidida pelo dono (`D-JUNTA-ESCOPO-E-CALIBRACAO` §5); este plano não a rediscute.
2. **O mérito financeiro** — B-1 fechado por 3 cadeiras; FK/RLS/contrato/censo são do **B-O6R-02 ciclo 5** (plano próprio, emendado em `d711f50`), não daqui.
3. **Fora deste bloco, nomeado e mantido em `P-O6R-ARNES-ISOLAMENTO`:** paralelismo declarado (`--test-concurrency`, P1) · DDL de esquema compartilhado (P4, `checklist-applicability`) · as 68 `rls_test_` legadas na base do dono · teto da fila do lock (35–41 s a 2× contenção, emenda c3) · vermelho ambiental da canônica 1 · divergência das 3 formas (P7) · `P-O6R-B02-SUITES-LIST-CI` (`ci.yml` PROIBIDO).
4. **Erratas fechadas:** CR/autocrlf (`P-O6R-B02-S0-ESPELHO-NO-HEAD`, não-reprodução) · rótulo "CREATE ROLE" do B-1c4 (o objeto é a ACL — sonda 0/150 em `pg_authid`) · D27/D21 (`P-O6R-B02-DIVERGENCIA-D27-D21`).

## §11 · Riscos e rollback

| Risco | Contenção |
|---|---|
| Correção que nasce defeito (a classe da `D-JUNTA-SEPARACAO-DE-PAPEIS`) | achador≠planejador≠dev; drills com vermelho-controle **já medido antes** da correção; junta re-executa D37/D40/D42 |
| Teardown "resiliente" que vira silêncio (o anti-padrão dos `.catch` de vehicle/impound) | propriedade PC exige **ruído**: falhas colecionadas e re-lançadas; D39 confere as duas coisas (role morta E falha reportada) |
| `2BP01` no drill de teardown (DROP ROLE sem DROP OWNED prévio) | armadilha nomeada no §0.c/C-B; o aceite é "nenhum papel vivo", não "cada statement tentado" |
| Sweep de família alcançar prefixo alheio ou a base viva | famílias explícitas com timestamp no nome; `rls_test_` FORA por decisão consciente; D43 tem o controle anti-mass-delete; incidente de 26/07 registrado como lei |
| Serializar 3 escritores alongar o lote / estourar a fila do lock | janelas curtas (PB); duração por rodada publicada (D42); teto da fila permanece nomeado no bloco irmão |
| Piso de denominador com falso-positivo (arquivo legitimamente sem testes) | não existe hoje (260 arquivos registram ≥1 ponto ou skip declarado); se surgir, o vermelho **nomeia** e a decisão é consciente |
| Porte divergir do head e reintroduzir defeito | F1 é verbatim, conferível por `git diff 6efe5ad 12c3825` e blob intermediário = `28a589b`/`593c3b8`; D41 nas duas pontas |
| Deriva da assinatura TAP entre versões do Node | caso permanente por fixture-dir (não por hardcode da assinatura): se o Node mudar, o caso fica vermelho e nomeia |
| `XX000` residual de produtor fora de `tests/` | meta 10/10; residual → produtor nomeado por execução, publicado com N; o voto agora carrega `escopo` — `pre-existente` com evidência vira pendência nomeada, não reprovação |
| Conflito no rebase futuro do financeiro | desenho anti-conflito do F1 (conteúdo = o que o head já tem); a emenda `d711f50` já manda o c5 re-medir sobre a main pós-arnês |

**Rollback:** revert do PR único; zero migration, zero dado, zero `src/`; drills nunca commitados; clusters descartáveis derrubados com `docker rm -fv` conferido.

## §12 · Registro, pendências, KPI

- **Fechar com o PR (status na própria pendência, nunca apagar):** `P-O6R-B02-RUNNER-SUMICO-SEM-SKIP` (C-E/D40).
- **Emendar `P-O6R-ARNES-ISOLAMENTO`** (apensar, nunca reescrever): **P3 fecha** (mecanismo único entre TODAS as criadoras de `tests/` + ratchet com razões atualizadas); **P5 amplia** (3 famílias novas no sweep; `rls_test_` fora por decisão consciente — nova sub-pendência `P-ARNES-RLS-TEST-FORA-DO-SWEEP` com o motivo anti-mass-delete e destino junto das 68 órfãs); **P8 atendida nesta trilha** (todo número deste PR publica N e forma). Permanecem lá: P1, P2, P4, P6, P7, fila do lock, prefixos legados, vermelho ambiental, SUITES-list.
- **Registro:** `status-geral.md` + `log-execucao.md` ganham a autoria do B-O6R-ARNES; a ata responde por escrito (a)/(b)/(c) do §C7.4-bis e registra quem ocupou cada papel.
- **KPI (§C3):** latest + history (append) + painel no mesmo PR; `backend_tests` com contagem de **execução real** (N e forma — as três canônicas §9); métricas de trilhas não tocadas (flutter, frontend) carregam o último valor oficial **com nota**; `pr` após `gh pr create`; `merge_commit`/`approved_head` null na autoria; **`mvp_demo`/`mvp_vendavel` INTOCADOS** (nenhum escopo de produto move — 1 linha no history dizendo isso).

## §13 · Junta — 3 cadeiras, maioria simples (`D-JUNTA-ESCOPO-E-CALIBRACAO` §2), voto com `gravidade` + `escopo`

O bloco não toca dinheiro, segurança, permissão nem dado de produto (só `tests/` e `scripts/`; `src/` com diff vazio provado na bateria) → **maioria de 3**. Todo voto declara `escopo` (`dentro-do-bloco` | `pre-existente`) **com evidência de data/origem**; escopo sem evidência = tratado como `dentro-do-bloco`.

1. **Cadeira obrigatória:** `jurado-c5-arnes-catalogo-postgres` (existe — `.claude/agents/especialistas/`, commit `77ead96`; **veto**; a competência do achado). Re-executa: canônica 3 N=10 com vaza-metro próprio (D42), bateria barata N≥13, D39/D43. **Nota para a ata:** julgar ESTE bloco não o queima para o B-O6R-02 (objetos distintos); se a junta do financeiro entender diferente, lá se usa o suplente.
2. **`jurado-arnes-runner-denominador`** (fábrica cria, identidade nova): D40/D41, o porte F1 contra os blobs do head, a assinatura TAP por fixture própria, as formas do runner e as canônicas 1/2 publicadas.
3. **`jurado-arnes-diff-escopo-registro`** (fábrica cria, identidade nova): §5/PROIBIDO (diff de `src`/`prisma`/`ci.yml`/contratos contra `6efe5ad` **vazio**), allowlist do ratchet consciente, pisos §6, KPI com contagem real, pendências §12.
4. **Suplentes:** 1 por cadeira, **nomeados ANTES do início** (fábrica cria os 3 junto; identidade nova; jurado caído → suplente re-executa o briefing INTEIRO; voto perdido nunca conta; a junta não fecha com menos de 3 votos).
5. **`inspetor-de-terreno-da-junta`** (instância nova, Fable) ANTES da junta, fail-closed: worktree próprio por jurado que muta (**sem junction** — 26/08), cluster descartável por jurado em porta própria, pristino por `hash-object` (nunca `git archive`+`tar` — errata S0), insumos completos no briefing, afirmações do c4 marcadas "a re-verificar", S0 conferido, baseline honesto, plano de perda de jurado. Sem `LIBERADO`, a junta não abre.
6. **Sem `critico-adversarial`** (regra nova — bloco sem invariante; registrado). **Porteiro** conforme o texto vigente; sem registro de junta = merge inválido.

## §14 · O que eu medi e o que não medi

**Medi por EXECUÇÃO nesta sessão (git/grep, sem banco):** blob-identidade dos 8 alvos nas três bases (tabela §0.a — o fato que decide a base); delta main→head = +42/+56 aditivo em exatamente 2 arquivos (`git diff --stat`); presença do guard de skip no runner do head (l.82/90/339–341) e **ausência** no da base (arquivo lido inteiro); os 6 escritores de catálogo e os 4 importadores do lock (grep); as formas dos 3 teardowns com arquivo:linha (`.catch(()=>undefined)` em vehicle l.260–261 e impound l.122–123; sequência sem catch em audit l.158–159); `Date.now()` no nome das 4 famílias; 21 casos no runner-guard + 1 no ratchet; 103 migrations na main; os 7 arquivos da bateria presentes na main; allowlist do ratchet com as 3 razões "destino: bloco irmão" (l.85–107); identidade do jurado do arnês no repo; worktrees vivos; `origin/main` imóvel em `6efe5ad`; emenda `d711f50` apensada ao plano c5.
**Herdei como medido por outrem, confirmado por blob-identidade (não re-executei):** sondas de par (ACL 200/200 e 40/40; `pg_authid` 0/150); bateria barata 5/13 + queda 37→32; `XX000` em quem toma o lock; assinatura TAP do arquivo-que-some (Node 20.19.5); tabela N=10 do c4 (7/10, 2740×2745, 2 órfãs, +5/rodada); D26a/D26b.
**NÃO medi (viram critérios com juiz nomeado):** a bateria barata **na base** (juiz: F0(a) do dev — 0/13 vermelho devolve o plano); o denominador da canônica 3 na base (juiz: baseline N=3 do dev + D42); o vermelho ambiental da canônica 1 na base (juiz: §9.4, declarado); a semântica `2BP01` da armadilha do teardown (inferida do manual do Postgres, não executada — juiz: D39); se a serialização elimina 100% do `XX000` na canônica 3 (juiz: D42 N=10); a duração extra do lote com os 3 escritores no lock (juiz: duração por rodada publicada); o comportamento do orçamento de skip com os casos -db novos (juiz: C-F + D41 pós-F3).
**Nenhuma afirmação sobre comportamento futuro é fato — são critérios de aceitação.** A frase que governa este bloco é a do veto que o criou: *"número publicado sem N"* reprova; *"número imperfeito declarado"* não. A meta é 10/10 com denominador idêntico e vaza-metro zerado — ou o produtor nomeado por execução, diante de uma junta cujo voto agora diz **de quem** é o defeito.

---

**Limpeza:** sessão de planejamento somente-leitura — nenhum arquivo criado/mutado no repo, nenhum container/worktree criado, nenhum comando na base viva (`erp-postgres`/`erp-redis` intocados, nem leitura); scratchpad vazio; nada a remover.
