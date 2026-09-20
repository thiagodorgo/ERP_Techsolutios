# DEV — B-SAN3-04a (catálogo, banco e menu convergem à RBAC_MATRIX.md)

> Papel: desenvolvedor (§C7.4-bis — não achou, não planejou). Implementa só o plano aprovado
> `agent-orchestration/omega/planos/B-SAN3-04a-plano.md` + emenda do orquestrador (comando, seção final).
> Modelo: Fable 5.1 (claude-fable-5-1). Worktree (único onde escrevo): `.claude/worktrees/bsan304a` ·
> branch `fix/rbac-catalogo-banco-matriz` · HEAD inicial `13e3783c` (base `origin/main@02bd7dab`).
> Gravado incrementalmente (P2) — cada seção é apensada na ordem em que o passo termina.
>
> **Queda anterior declarada:** a 1ª instância deste papel caiu por HTTP 429 no início, sem commit e sem
> mudança no worktree (medido pelo orquestrador: `git status` limpo, HEAD `13e3783c`). O relatório dela era só
> esqueleto (`DEV-B-SAN3-04a.parcial-instancia1.md`); o container `dev-bsan304a-pg` dela foi removido. Nada
> herdado: este relatório sobrescreve o esqueleto e o trabalho é refeito do zero.

## 0. Terreno inicial (medido)
- `git status --short` vazio · HEAD `13e3783c` · branch `fix/rbac-catalogo-banco-matriz` · `origin/main` = `02bd7dab`.
- `core.autocrlf=true`; índice LF, working tree CRLF nos arquivos de registro, KPI, catálogo, seed, provision-rbac e
  appSidebarNav (`git ls-files --eol`). Regra aplicada: toda edição preserva o EOL do arquivo (scripts de edição em
  lote detectam `\r\n`); o git normaliza para LF no commit.
- Docker: `crit-b04a-pg` (56543, de OUTRA sessão — não tocado), `erp-postgres-alt` (55432), `erp-redis`, `pastrack-*`
  (5432/5433) — nenhum tocado. Meu container: `dev-bsan304a-pg` (`postgres:16`, porta **5499**), removido pelo nome ao fim.
- `frontend/node_modules` AUSENTE no worktree (como o plano M0 previu) → `npm --prefix frontend ci` na bateria.
- `node scripts/sync-agent-agents.mjs --check` no head inicial: `OK — 25 agentes, espelho consistente`.

## Divergências plano × código (lista viva — atualizada ao longo do trabalho)
(em construção — ver §D ao fim)

---

## Instância 3

> Papel: desenvolvedor (3ª instância; §C7.4-bis — não achou, não planejou). **Modelo real desta sessão: Opus 5
> (`claude-opus-5[1m]`)** — não Fable. A 2ª instância caiu (queda de sessão + reboot) depois de implementar parte do
> plano e antes de qualquer commit; o WIP dela é **insumo a medir**, não fato herdado. Cópia de segurança do WIP
> (orquestrador): `scratchpad/bsan304a-wip-instancia2/`. Gravado incrementalmente (P2).
>
> **Emenda do orquestrador recebida durante o trabalho (2026-09-17):** o item 3 da "Entrega em commits" (dívidas do
> #386 — backfill §C3.5, aposentadoria rodada 3 das `jurado-san3c2-*`, parecer do porteiro versionado, linha 54→56 do
> `status-geral.md`) **SAI do meu escopo**: o `B-SAN3-01` mergeia primeiro e as carrega. Não faço `git rm`, não toco em
> `aposentadoria-especialistas.md`, não versiono o parecer, não mexo na linha dos 54 bloqueantes, não gravo o backfill
> do #386 nos KPI. O commit 3 não existe nesta entrega.

### I3.0 Terreno medido (2026-09-17, depois do reboot)
- HEAD `13e3783c` · branch `fix/rbac-catalogo-banco-matriz` · `git status`: 16 modificados + 5 testes não rastreados
  (confere com o orquestrador) · sem `.env` no worktree · `node_modules` e `frontend/node_modules` presentes.
- `core.autocrlf=true`; índice LF / working tree CRLF nos arquivos de código, registro e KPI (`git ls-files --eol`); o
  snapshot `tests/fixtures/role-catalog-contract.snapshot.json` é LF/LF.
- Docker: `dev-bsan304a-pg` estava `Exited (255)` (reboot) → `docker start dev-bsan304a-pg` (porta 5499). Bases que a
  instância 2 deixou: `seed_only`, `prov_seed`, `d4_seed` — **estado não herdado**: recrio as minhas do zero para os drills.
  Não toquei em `bsan301-pg`, `erp-*`, `pastrack-*`.
- Disco: 17 GB livres em C:.

### I3.1 Medição do WIP (instância 2) contra o plano, passo a passo
Método: `git diff` e leitura dos 5 testes novos no worktree, confrontados com o plano §3–§12 e a emenda (a)–(f) do
comando. "Cumpre" = o trecho existe e bate com o texto do plano; divergência vai para §I3.D.

| passo do plano | WIP | arquivo · trecho |
|---|---|---|
| §4.1 finance +5 (`work_orders:read`, `customers:read`, `service_catalog:read`, `tenant_checklists:read`, `checklist_runs:read`) | **cumpre** | `catalog.ts` bloco `finance`, após `"os.read"`, comentário cita l.45/38/41/43/44 |
| §4.1 inventory +2 (`tenant_checklists:read`, `checklist_runs:read`) | **cumpre** | `catalog.ts` fim do bloco `inventory`, comentário cita A5/CE-6 e `P-SAN3-04A-CHECKLIST-ESCOPO-ESTOQUE` |
| §4.1 field_technician +1 (`tenant_checklists:read`) | **cumpre** | `catalog.ts`, antes de `checklist_runs:read` |
| §4.1 operator +1 (`work_orders:create`) | **cumpre** | `catalog.ts`, após `work_orders:read` do operator |
| §4.1 manager −2 (`checklist_runs:update`, `:acknowledge`) + comentário "convergido no B-SAN3-04a" | **cumpre** | `catalog.ts:569-574` |
| §4.1 `DELIBERATE_REVOCATIONS` `as const satisfies readonly {role; permission; decision}[]` | **cumpre** (texto da `decision` mais longo que o do plano, com o mesmo prefixo `B-SAN3-04a/item 15`) | `catalog.ts`, logo após `ROLE_PERMISSIONS` |
| §4.1 snapshot regenerado (só as 9 linhas: +5 finance, +2 inventory, +1 field_technician, +1 operator, −2 manager) | **cumpre** — diff do snapshot tem exatamente essas 11 linhas; conferência byte a byte contra o comando do §12 em I3.4 | `tests/fixtures/role-catalog-contract.snapshot.json` |
| §4.2 registro: `/finance` → `financial_entries:read` implemented; charges/payments → `financial_titles:read` implemented; invoices → `financial_titles:read`, status mantido; descrição sem "planejada"/"tenant" | **cumpre** | `navigation.registry.ts:344-400` |
| §4.3 seed: `SEEDED_SYSTEM_ROLES = [...STANDARD_ROLES, "auditor"] as const satisfies readonly Role[]` + laço | **cumpre** | `prisma/seed.ts:252-258` |
| §4.4 provision-rbac passo 3-bis (entre concessões e relatório; papel global; idempotente; linha de relatório; `--dry-run` só relata) | **cumpre** | `scripts/provision-rbac.ts` 3-bis + `Relatorio.revogacoesDeliberadas` + `log("revogações deliberadas: …")` |
| §4.5 front: `UserRole` + "Estoque"; `mapBackendRole` inventory; `RoleKind` + inventory; `roleKindFor` após Financeiro; `ROLE_SUBTITLE`; `NAV_BY_ROLE.inventory`; finance OPERAÇÃO/GESTÃO/ADMINISTRAÇÃO; `MVP_NAV_PATHS` intocado | **cumpre** (FROTA do finance inalterada — o plano não a menciona) | `types.ts`, `auth.adapter.ts:233`, `appSidebarNav.ts` |
| §4.6 matriz: só l.38 e l.41 coluna `finance` none→read | **cumpre** — diff da `RBAC_MATRIX.md` = 2 linhas | `RBAC_MATRIX.md:38,41` |
| §4.7 pendências (11 abrir, 2 emendar, 4 fechar) | **não toca** | `agent-orchestration/**` intocado |
| §9 decisão `D-SAN3-04A-FAIL-CLOSED-POR-ESCOPO` | **não toca** | — |
| §6 T1 guard matriz × catálogo | **cumpre em parte** — ver D-1, D-2 | `tests/san3-04a-matriz-x-catalogo-guard.test.ts` (14 casos) |
| §6 T2 menu/rotas com permissões do banco (2 braços) | **cumpre em parte** — ver D-5 (regra da casa NOBYPASSRLS) | `tests/san3-04a-menu-com-permissoes-do-banco-db.test.ts` (1 + 25 subtestes) |
| §6 T3 menu front × catálogo | **cumpre** | `tests/san3-04a-menu-front-x-catalogo.test.ts` (14 casos) |
| §6 T4 seed semeia auditor | **cumpre** | `tests/san3-04a-seed-semeia-auditor.test.ts` (2 casos) |
| §6 T5 sidebar Estoque/Financeiro + entrada na `test:smoke` | **cumpre** | `frontend/tests/san3-04a-sidebar-estoque-financeiro.test.tsx` (9 casos) + `frontend/package.json` (+1 arquivo, fim da lista) |
| §6 testes existentes tocados: snapshot + `work-order-cancel-duplicate-routes.test.ts:218` (1 linha) | **diverge** — ver D-3, D-4 | 5 testes existentes a mais |
| KPI (§C3), registro (§4.7), trilha (status-geral/log) | **não toca** | `Kpis/**`, `agent-orchestration/**` intocados |

Correção feita por mim no WIP (edição, não checkout): `tests/work-order-audit-logs.test.ts:244` — comentário órfão
"finance NÃO tem work_orders:read" acima da criação do `inventoryA` (a instância 2 trocou o sujeito e deixou o
comentário antigo); reescrito para "inventory NÃO tem … (era o finance, que passou a ter `work_orders:read`)". EOL CRLF
preservado (contagem por arquivo: 284 CRLF, 0 LF isolado).

### I3.2 Vermelho-controle no head-base, REEXECUTADO por mim (os TAPs da instância 2 foram só roteiro)
Head-base medido num worktree detached MEU: `.claude/worktrees/dev3-bsan304a-base` em `13e3783c` (`npm ci` próprio +
`prisma generate` + `npm --prefix frontend ci`, sem junction), com os 5 testes novos copiados para dentro dele.
Container `dev-bsan304a-pg` (5499), bases recriadas do zero por mim (`i3_*`); as da instância 2 foram dropadas.

| teste | head-base `13e3783c` | TAP |
|---|---|---|
| T1 guard | `# tests 14 · pass 7 · fail 7`, ec=1. **(A) falha com exatamente as 7 células A do plano**: l.43 × finance/inventory/field_technician `tenant_checklists:read`; l.44 × finance/inventory `checklist_runs:read`; l.45 × operator `work_orders:create`; l.45 × finance `work_orders:read`. **(l.44) manager = {acknowledge, complete, read, reopen, update}** (os 2 excedentes). Também: §A2 (conflito registrado l.41 inexistente com l.41 = none), l.43, `DELIBERATE_REVOCATIONS` ausente, M1 e M3 (âncoras da l.38 nova) | `scratchpad/i3-vc-matriz-x-catalogo-guard-headbase.tap` |
| T3 menu front | `14 · 8 · 6`, ec=1. **inventory: rótulos [] → kind gestor, 24 itens negados** (Abastecimento … Viaturas); **finance: Aprovações e Auditoria negados**, sem "Ordens de Serviço" | `i3-vc-menu-front-x-catalogo-headbase.tap` |
| T4 seed | `2 · 0 · 2`, ec=1 (constante inexistente; laço em `STANDARD_ROLES`) | `i3-vc-seed-semeia-auditor-headbase.tap` |
| T5 sidebar (front) | `9 · 1 · 8`, ec=1 (`resolveFrontendRoles(["inventory"])` = `[]` etc.) | `i3-vc-T5-headbase.tap` |
| T2 braço 1 (base `i3_prov_base2`: migrate + provision + seed do head-base), **T2 final (app sob NOBYPASSRLS)** | `26 · 10 · 16`, ec=1 — finance 403 em `/work-orders`, `/customers`, `/service-catalog`; menus do finance/manager sem `/finance*`; manager passa do gate em acknowledgement/divergence/markers; operator 403 no POST | `i3-vc-T2rls-braco1-headbase.tap` (a versão pré-RLS deu a mesma forma: `i3-vc-T2-braco1-headbase.tap`) |
| T2 braço 2 (base `i3_mig_base`: só migrate) | `26 · 10 · 16`, ec=1 | `i3-vc-T2rls-braco2-headbase.tap` (pré-RLS: `i3-vc-T2-braco2-headbase.tap`) |

### I3.3 Drills do banco (D1–D5), executados por mim
- **D1 head-base** (`i3_seed_base`: `migrate deploy` 107 migrations + `db:seed`, a forma da CI): papéis globais =
  field_dispatcher 42 · manager 141 · super_admin 198 · technician 44 · tenant_admin 185 · viewer 45; **auditor global =
  0**; sonda (`scratchpad/i3-probe-p033.mts`): auditor `GET /tags|/pois|/tenant-settings` → **403** `role_required`
  (vermelho-controle do P-033). Log: `i3-D1-D2-headbase.log`.
- **D2 head-base** (`i3_prov`: migrate + `db:provision-rbac` + `db:seed`): 196 permissões + 12 papéis + 901 concessões,
  CONVERGIDO; auditor 56 · finance 56 · inventory 15 · manager 141 · operator 67 · field_technician 42 · support 10;
  **manager tem `checklist_runs:update` e `:acknowledge`**; sonda: auditor → 200 nas 3 rotas.
- **D3 código do bloco × a MESMA base antiga** (`i3-D3-prov.log`): (a) T2 → `26 · 10 · 16`, braço 1 vermelho ("finance:
  concessão do catálogo ausente no banco: checklist_runs:read, customers:read, service_catalog:read,
  tenant_checklists:read, work_orders:read"); (b) `--dry-run` → "concessões: 9 a criar · revogações deliberadas: 2 a
  remover — manager → checklist_runs:update (…); manager → checklist_runs:acknowledge (…)", e o banco **continua** com as
  duas; (c) aplica → "9 criada(s) · revogações deliberadas: 2 removida(s)", CONVERGIDO, contagem das duas no manager =
  **0**; (d) 2ª execução → "0 criada(s) · 908 já existiam · revogações deliberadas: **0** removida(s)", CONVERGIDO;
  papéis após: finance 61 · inventory 17 · field_technician 43 · operator 68 · manager 139; (e) T2 braço 1 → **26/26**;
  (f) `RBAC_DB_PARITY=1 permission-catalog-db-parity` → **2/2**, 0 skip (auditor comparado).
  Repetido com o T2 final (app sob NOBYPASSRLS) numa 2ª base antiga `i3_prov_base2` (`i3-D3-prime.log`): 16 falhas →
  provision ("2 removida(s)", CONVERGIDO; 2ª: "0 removida(s)") → **26/26**.
- **D4 código do bloco, base NOVA só-seed** (`i3_d4`: migrate + `db:seed`, sem provision): **auditor global = 1, 56
  concessões, banco == catálogo** (diff vazio); sonda: auditor → **200** em `/tags|/pois|/tenant-settings`; manager 139
  (sem as 2). T2 nessa base (braço 2: finance global ausente) → 26/26. Log: `i3-D4.log`.
- **D5 mutações REAIS nos arquivos-fonte** (`scratchpad/i3-mutacoes-D5.mjs`; aplica UMA troca, roda, restaura os bytes e
  confere o hash — nunca `git checkout`): M1 tira `customers:read` do finance → T1 `[A]` vermelho · M2 devolve
  `checklist_runs:acknowledge` ao manager → `[item 15 · l.44]` + `[§4.4]` vermelhos · M3 célula l.38 × finance = `foo` →
  o arquivo lança (`valor de celula fora do dicionario`) · M4 linha nova na tabela → lança (`linha da matriz sem
  mapeamento`) · M5 `checklist_runs:update` ao inventory → `[B]` + `[l.44]` vermelhos · T3-a devolve AUDITORIA ao finance
  → 3 vermelhos (finance menu×guard, P1/P2, mutação) · T3-b tira o ramo "Estoque" de `roleKindFor` → 3 vermelhos
  (inventory cai em gestor). **7/7 vermelhos, 7/7 restaurados** (hash igual; `git diff --stat` idêntico antes/depois).
  Log: `i3-D5-mutacoes.log`. (Além disso, M1–M5 e as 2 do T3 existem como casos negativos em memória dentro de T1/T3.)

### I3.4 Verdes no código do bloco
- T1+T3+T4: `# tests 30 · pass 30 · fail 0` (`i3-verde-T1-T3-T4.tap`).
- T5 + regressões do front `sidebar-nav`, `access-gating`, `cadastros-nav`: `34 · 34 · 0` (`i3-verde-T5-front-regressoes.tap`).
- T2 **final** (app sob papel efêmero NOSUPERUSER NOBYPASSRLS, postura asserida, "política morde" asserida):
  `i3_prov` (braço 1) 26/26 · `i3_mig_wip` (braço 2, forma do job backend) 26/26 · `i3_d4` (braço 2) 26/26
  (`i3-verde-T2rls-*.tap`). Resíduo depois de cada execução: 0 organizações `san3-04a-t2-%`, 0 papéis `SAN3-04a %`, 0
  papéis `o6r_b01_%` em `pg_roles`.

### I3.5 Correção que fiz no T2 (regra da casa) e conferências de código
- **T2 passou a rodar o APP sob papel efêmero NOSUPERUSER NOBYPASSRLS** (regra "suítes `-db` sob papel NOSUPERUSER
  NOBYPASSRLS; falha ao criar o papel é vermelho, nunca skip" do briefing — o WIP rodava tudo como `postgres`,
  superusuário, que ignora RLS). Mecanismo: `createEphemeralRole` do arnês (`tests/helpers/auth-identity-fixture.ts`,
  lock de catálogo + teardown resiliente); o cliente do papel é injetado no singleton `src/database/prisma.ts`
  (`globalThis.prisma`) ANTES do `import` do app, e o `PrismaCoreSaasService` do teste usa o mesmo cliente. Asserções
  novas: o singleton do app É o cliente do papel; `rolsuper = false` e `rolbypassrls = false` lidos de `pg_roles` por
  `current_user`; e "a política morde" (sem contexto de organização o papel do app vê 0 atribuições do tenant; a conexão
  administrativa vê 6). Semeadura e limpeza continuam na conexão administrativa; `efemera.drop()` no `finally`. Contagem
  do arquivo inalterada (26). Verde nos 3 bancos (26/26), vermelho-controle no head-base inalterado em forma (16
  falhas), 0 papéis `o6r_b01_%` depois. Nenhuma linha de `src/` mudou para isso (o resolvedor de RBAC persistente já
  abre `withTenantRls` — `persistent-rbac-context.middleware.ts:90-107`). **Divergência D-5.**
- Snapshot `role-catalog-contract.snapshot.json` == saída do comando de regeneração do §12 do plano, byte a byte (`cmp`).
- Os 6 testes existentes que o WIP tocou (5 fora da lista do plano): rodei a versão do head-base de cada um contra o
  código do bloco — **cada um fica vermelho em exatamente 1 caso** (o que tinha `finance`/`operator` como exemplo
  negativo que deixou de ser negativo): `checklist-snapshot-dispatch` (13 · "sem checklist_runs:read → 403"),
  `navigation-menu` (7 · "Item planned/future…"), `work-order-audit-logs` (7 · "[RBAC] … exige work_orders:read"),
  `work-order-timeseries` (8 · "… 403 sem work_orders:read …"), `work-order-cancel-duplicate-routes` (8 · "[RBAC] POST
  /duplicate sem work_orders:create (operator)"), front `sidebar-nav` (13 · "finance NAO gerencia Clientes"). As
  edições trocam o sujeito do controle negativo (inventory/technician/field_dispatcher, que seguem sem a permissão) e
  preservam a propriedade; nenhuma asserção foi removida. Arquivos temporários removidos. **Divergência D-3.**

### I3.6 Registro do bloco (plano §4.7 + §9) — aplicado por script (`scratchpad/i3-registro-pendencias-decisoes.py`)
Edição por âncora única dentro da entrada certa, CRLF preservado (contagem depois: `pendencias.md` 9425 CRLF / 0 LF
isolado; `decisoes.md` 2412 / 0). Cópias de antes: `scratchpad/i3-pendencias.antes.md`, `i3-decisoes.antes.md`.
- **Decisão nova:** `D-SAN3-04A-FAIL-CLOSED-POR-ESCOPO` (`decisoes.md`, fim).
- **Fecham (4 cabeçalhos + 1 bullet):** `P-Ω4-FINANCE-READ-ORFA`, `P-RBAC-CHECKLIST-DRIFT`,
  `P-RBAC-MATRIZ-X-CATALOGO-QUATRO-CELULAS` (as 4 células com disposição), `P-RBAC-CATALOG-MATRIZ` (duplicata da DRIFT —
  **fora da lista do §4.7, D-6**) e o bullet `P-033` dentro da `P-032` (por emenda; a `P-032` segue ABERTA).
- **Emendas:** `P-O6R-B07-APPROVAL-BY-POLICY` (cita CE-6, cél. 3 do item 56); `P-026` (status reescrito: fechada a parte
  `inventory`, segue PARCIAL pela fusão `operator`/`field_technician` → `P-SAN3-04A-MENU-RESIDUAL`, `B-SAN3-06a`);
  `P-032` (+ nota do `REGISTRY_READ_ROLES` sem "Financeiro", pedida no §5 do plano).
- **Abertas (13 = as 11 do §4.7 + 2 da medição do dev):** `-CHECKLIST-ESCOPO-ESTOQUE`, `-MASTER-DATA-EDIT-SCOPED`,
  `-MATRIZ-L37-X-BULLETS` (ampliada com a medição de D-1b), `-SUPPORT-SEM-POLITICA`, `-DASHBOARD-SCOPED`,
  `-CHECKLIST-POR-ESCOPO-ESCRITORIO`, `-AUDIT-SCOPED`, `-SEED-PAPEIS-LEGADOS`, `-PERMISSOES-ORFAS`, `-MENU-RESIDUAL`,
  `-MATRIZ-BULLETS-101-103`, **`-TARIFAS-X-L41-FINANCE` (D-1)** e **`-FRONT-PERMISSOES-POR-PAPEL-DEFASADAS` (D-7)**. Todas
  com N · forma · causa · dono · escopo · teste de encerramento; gravidade proposta por mim (o plano não a fixa): 11
  MÉDIA, 2 BAIXA.
- **Índice** regenerado pelo gerador: antes 370 cabeçalhos / 359 IDs · 103 FECHADAS · 267 ABERTAS (regenerar na base dá
  diff vazio — gerador determinístico); depois **383 / 372 · 107 FECHADAS · 276 ABERTAS** (+13 abertas −4 fechadas).
  Observação (O-3, não mexi): o gerador põe a `P-Ω4-FINANCE-READ-ORFA` FECHADA também em "Diferidas com severidade
  MATERIAL" — o critério `suspeito` não olha o estado (defeito do gerador, dono `B-REG-GERADOR`).

### I3.D Divergências plano × código (para a junta — nenhuma decidida em silêncio)
Origem: **[i2]** = veio do WIP da instância 2 e eu mantive depois de medir; **[i3]** = minha.

- **D-1 [i2] — 3º conflito registrado no guard T1 (l.41 × `finance` × `tariffs:read`) e pendência nova
  `P-SAN3-04A-TARIFAS-X-L41-FINANCE`.** O plano manda porte literal do gerador e fixa `CONFLITOS_REGISTRADOS` em 2. O
  gerador (`B-SAN3-04a-apoio/mapa-rbac.mts`) dobra `tariffs:*` dentro da linha "Service catalog" (tópico l.105 "mirror
  of `service_catalog:*`"); com a P2 do próprio plano (l.41 × finance = `read`), o porte literal passa a exigir
  `tariffs:read` do `finance` — célula A que o plano não previu. A instância 2 marcou a linha com `conflict` e registrou
  o conflito (fail-closed: nada concedido). Mantive: conceder `tariffs:read` seria decidir o que o dono não decidiu.
  Medido: o formulário de orçamento do Financeiro lê só clientes, serviços e OS
  (`useServiceQuoteReferences.ts:6-8`). A instância irmã, l.104 (tabelas de valores, tópico espelho × tabela l.42
  `none`), o guard não vê (a tabela tem linha própria) — está na mesma pendência.
- **D-1b [i3, registro] — a premissa do K1 envelheceu com a edição da l.41.** O plano classifica l.37 × `finance` como
  conflito porque os tópicos "mirror of `service_catalog:*`" davam `none`; depois da P2 dão `read` — tabela e tópicos
  agora CONCORDAM em leitura de cadastros mestres pelo Financeiro, e o catálogo não a concede (falta de 5 leituras que a
  decisão do dono não nomeia). O guard mantém a célula como "conflito registrado" (flag da linha) e asserta que nada foi
  concedido. Não mexi no código do guard; ampliei a `P-SAN3-04A-MATRIZ-L37-X-BULLETS` com a medição (dona: decisão do dono).
- **D-2 [i2] — `EXCEDENTES_REGISTRADOS` no T1 com `manager` × `checklist_runs:reopen`** (evidência `D-CHK-P1-REOPEN-RBAC`).
  O plano pede a regra "ação concedida que a célula não nomeia" e, no (d), espera o manager com `{read, complete,
  reopen}`; sem o registro a regra reprovaria o `reopen`. Não estava escrito no plano.
- **D-3 [i2] — 5 testes existentes tocados fora da lista do §6** (`checklist-snapshot-dispatch`, `navigation-menu`,
  `work-order-audit-logs`, `work-order-timeseries`, front `sidebar-nav`) e o `work-order-cancel-duplicate-routes` com 14
  linhas, não 1 (precisou do usuário `technician` na semeadura). Cada um provado necessário (versão do head-base × código
  do bloco = 1 vermelho cada, §I3.5); sujeito do controle negativo trocado, nenhuma asserção removida. Corrigi um
  comentário órfão no `work-order-audit-logs.test.ts:244` (§I3.1).
- **D-4 [i2, menor] — texto de `decision` em `DELIBERATE_REVOCATIONS`** mais longo que o do plano
  (`"B-SAN3-04a/item 15 — RBAC_MATRIX.md:44 …"` × `"B-SAN3-04a/item 15"`); o prefixo exigido pelo T1 é o mesmo.
- **D-5 [i3] — T2 roda o app sob papel efêmero NOSUPERUSER NOBYPASSRLS** (regra da casa do briefing; o plano dizia só
  "padrão de `persistent-rbac-middleware.test.ts`", que roda como superusuário). Detalhe em §I3.5.
- **D-6 [i3, registro] — fechei a `P-RBAC-CATALOG-MATRIZ`**, fora da lista de fechamentos do §4.7: é duplicata declarada
  da `P-RBAC-CHECKLIST-DRIFT` ("tratar junto; bloco dono = o de P-RBAC-CHECKLIST-DRIFT") e o item que restava aberto nela
  (`finance`/`inventory` sem `tenant_checklists:read`) é exatamente o que o bloco concede.
- **D-7 [i3, registro] — pendência nova `P-SAN3-04A-FRONT-PERMISSOES-POR-PAPEL-DEFASADAS`** (pré-existente, medida por
  script): depois de trocar de organização o front usa o mapa estático `rolePermissions` de `auth.adapter.ts`, que não
  acompanha o catálogo (finance: 55 de 61 ausentes, entre elas as 4 novas do bloco). Arquivo em escopo só para o ramo
  `mapBackendRole`; não mexi no mapa. Dono proposto `B-SAN3-06a`.
- **D-8 [nota] —** o §11.3 do plano dava `votos/SAN3-plano/porteiro-pos-merge-386.md` e o briefing
  `votos/SAN3-plano-opcao-B/00c-porteiro-pos-merge-386.md`; ficou sem efeito — as dívidas do #386 saíram do escopo
  (emenda do orquestrador).

**Observações (não são divergência do plano):**
- O-1: o passo 3-bis revoga na linha global que o próprio script resolve por chave (`idPorPapel`, o mesmo mapa das
  concessões). Numa base com duas linhas globais da mesma chave (o UNIQUE não protege NULL; suítes de teste criam
  `manager`/`auditor` globais), só uma recebe a revogação — o mesmo limite que as concessões já tinham. Em produção há uma
  linha por chave.
- O-2: no T2, a asserção de igualdade banco × catálogo para no primeiro papel que diverge (finance), então no D3.a o
  excedente do manager não aparece no diagnóstico — a propriedade reprova igual; é só o texto.
- O-3: o gerador do índice lista uma entrada FECHADA em "Diferidas com severidade MATERIAL" (critério `suspeito` não olha
  o estado) — `P-Ω4-FINANCE-READ-ORFA` agora.

### I3.7 Bateria (saídas coladas; logs e TAPs no scratchpad)
| comando | forma | saída |
|---|---|---|
| `npm run db:generate` | `DATABASE_URL` fictício (`postgresql://ficticio:***@localhost:1/ficticio`) | `✔ Generated Prisma Client (v7.8.0)`, ec=0 |
| `npm run check` | idem | `tsc -p tsconfig.json --noEmit`, ec=0 |
| `npm run lint` | idem (= check) | ec=0 |
| `npm run build` | idem | `tsc -p tsconfig.json`, ec=0 (`dist/` apagado depois) |
| `npm test` × 3 | banco `i3_npmtest` RECRIADO antes de cada uma (DROP DATABASE WITH FORCE + CREATE + `migrate deploy`, 107 migrations, `nspacl` `{pg_database_owner=UC/…,=U/…}`), `DATABASE_URL` = `dev-bsan304a-pg` :5499, `REDIS_URL` = `dev-bsan304a-redis` :56499, `CORE_SAAS_PERSISTENCE=memory`, `RBAC_DB_PARITY` ausente, Node v20.19.5 | **r1/r2/r3 idênticas: `287 arquivo(s) · 3053 teste(s) · pass 3051 · fail 0 · skipped 2`, ec=0**; 0 papéis `o6r_b01_%` depois de cada (`i3-npmtest-r{1,2,3}.summary/.out`) |
| `npm test` no head-base `13e3783c` | mesma forma, banco `i3_npmtest_base` | `283 arquivo(s) · 2997 teste(s) · pass 2995 · fail 0 · skipped 2`, ec=0 → **Δ +56 = 14 + 26 + 14 + 2**, +4 arquivos |
| suítes do bloco sem banco (T1+T3+T4) | `node --test --import tsx …` | `# tests 30 · pass 30 · fail 0` |
| T2 com banco | `DATABASE_URL` do meu container; app sob papel NOSUPERUSER NOBYPASSRLS | `i3_prov` (braço 1) 26/26 · `i3_mig_wip` (braço 2) 26/26 · `i3_d4` (braço 2) 26/26 |
| regressões nomeadas do §6 + paridade | `DATABASE_URL`=`i3_prov` (provisionada e convergida), `RBAC_DB_PARITY=1`, 12 arquivos (`navigation-menu`, `-provisioning`, `-menu-routes`, `persistent-rbac-middleware`, `-authorization`, `permission-catalog-db-parity`, `core-saas-role-authority`, `core-saas`, `o6r07a-approval-permission`, `checklist-routes`, `checklist-run-role-db`, T2) | `# tests 201 · pass 201 · fail 0 · skipped 0` (a paridade rodou, 2/2) |
| `npm --prefix frontend run check` | — | `tsc -b --noEmit`, ec=0 |
| `npm --prefix frontend run build` | — | `✓ built in 26.17s`, ec=0 (`frontend/dist/` apagado depois) |
| `npm --prefix frontend run test:smoke` | — | **`# tests 1135 · pass 1135 · fail 0 · skipped 0`**, ec=0 (1126 + 9 do T5) |
| front nomeados (T5 + `sidebar-nav`, `access-gating`, `cadastros-nav`) | — | `34 · 34 · 0` |
| `node scripts/sync-agent-agents.mjs --check` | — | `[agents-sync] OK — 25 agentes, espelho consistente.` |
| `node --check Kpis/app.js` | — | ok |
| `node scripts/kpi-freeze.mjs --check` | — | `kpi-freeze: em dia (snapshot 2026-09-18).` |
| 3 guards de KPI (`kpi-achados-paridade`, `kpi-dashboard-charts`, `kpi-dashboard-contraste`) | — | `# tests 28 · pass 28 · fail 0` |
| `git diff --check` / `git diff --check origin/main` | — | vazio (ec=0); espaço no fim de linha nos 5 testes novos: 0 |
| escopo | `git diff --name-only origin/main --` schema, migrations, mobile, infra, .github, .env, lockfiles, `tenantNavigation.ts`, `permission-catalog-db-parity.test.ts`, `run-backend-tests.mjs`, `.claude`, `.agents`, `CLAUDE.md`, `AGENTS.md` | **0 arquivos**; `src/` tocado só em `catalog.ts` e `navigation.registry.ts`; `RBAC_MATRIX.md` só `@@ -38 +38` e `@@ -41 +41` |

### I3.8 KPI (§C3) — commit `038dae00`
`backend_tests` 2995/2997 → **3051/3053** (N=3, forma e Δ por arquivo na nota; baseline remedida); `frontend_smoke_tests`
1126 → **1135/1135**; `blocks_completed` 163 → **164** (a partir de `origin/main` = `02bd7dab`); `flutter_tests` e os 4
contratos mobile CARREGADOS com marcador (o PR não toca `mobile/`); `mvp_demo`/`mvp_vendavel` intocados; release
`status: published_per_pr`, `pr`/`merge_commit`/`approved_head` = `null`; item novo em `recent`; history com 159
entradas (+1); `node scripts/kpi-freeze.mjs` reinjetou a cópia congelada. **Sem** o backfill do #386 (emenda).

### I3.9 Commits (sem push; sem linha de atribuição) — branch `fix/rbac-catalogo-banco-matriz`, HEAD `c57e7ee8`
1. `3b24256b` fix(rbac): catalogo, banco e registro de navegacao convergem a RBAC_MATRIX.md (B-SAN3-04a)
2. `1865b218` fix(web): rotulo e menu proprios do Estoque; Financeiro ve OS, Clientes, Servicos e Checklists (B-SAN3-04a)
3. `038dae00` chore(kpi): B-SAN3-04a no proprio PR — backend 3051/3053, smoke 1135/1135, blocos 164
4. `96f101bd` docs(reg): registro do B-SAN3-04a — decisao fail-closed por escopo, 13 pendencias abertas, 4 fechadas
5. `c57e7ee8` docs(trilha): B-SAN3-04a na autoria — status-geral e log de execucao

(O "commit 3" do briefing — dívidas do #386 — não existe: emenda do orquestrador.)

`git diff --stat origin/main` (inclui os 2 commits de plano/comando que já estavam na branch):

```
 Kpis/app.js                                        |    2 +-
 Kpis/kpis-history.json                             |   13 +
 Kpis/kpis-latest.json                              |   59 +-
 RBAC_MATRIX.md                                     |    4 +-
 .../B-SAN3-04a-rbac-catalogo-banco-matriz.md       |  140 ++
 agent-orchestration/codex/log-execucao.md          |   30 +
 agent-orchestration/controle/decisoes.md           |   50 +-
 agent-orchestration/controle/pendencias-indice.md  |  741 ++++----
 agent-orchestration/controle/pendencias.md         |  129 +-
 agent-orchestration/docs/status-geral.md           |   28 +
 .../B-SAN3-04a-apoio/mapa-rbac.head-base.json      | 1964 ++++++++++++++++++++
 .../omega/planos/B-SAN3-04a-apoio/mapa-rbac.mts    |  285 +++
 .../omega/planos/B-SAN3-04a-plano.md               |  275 +++
 frontend/package.json                              |    2 +-
 frontend/src/layouts/appSidebarNav.ts              |   26 +-
 frontend/src/modules/auth/auth.adapter.ts          |    1 +
 frontend/src/modules/auth/types.ts                 |    3 +
 .../san3-04a-sidebar-estoque-financeiro.test.tsx   |   98 +
 frontend/tests/sidebar-nav.test.tsx                |    4 +-
 prisma/seed.ts                                     |    8 +-
 scripts/provision-rbac.ts                          |   33 +-
 src/modules/core-saas/permissions/catalog.ts       |   46 +-
 src/modules/navigation/navigation.registry.ts      |   27 +-
 tests/checklist-snapshot-dispatch.test.ts          |    5 +-
 tests/fixtures/role-catalog-contract.snapshot.json |   13 +-
 tests/navigation-menu.test.ts                      |   10 +-
 tests/san3-04a-matriz-x-catalogo-guard.test.ts     |  682 +++++++
 ...an3-04a-menu-com-permissoes-do-banco-db.test.ts |  335 ++++
 tests/san3-04a-menu-front-x-catalogo.test.ts       |  222 +++
 tests/san3-04a-seed-semeia-auditor.test.ts         |   34 +
 tests/work-order-audit-logs.test.ts                |   16 +-
 tests/work-order-cancel-duplicate-routes.test.ts   |   14 +-
 tests/work-order-timeseries.test.ts                |   11 +-
 33 files changed, 4861 insertions(+), 449 deletions(-)
```

O `pendencias-indice.md` tem 741 linhas no diff porque o índice lista o número da linha de cada entrada, e as linhas
novas no alto do `pendencias.md` deslocam todas as seguintes; o arquivo é a saída do gerador.

### I3.10 Limpeza e incidentes
- **Limpeza (1 linha):** removidos `dist/`, `frontend/dist/`, `frontend/tsconfig.tsbuildinfo`, os diretórios de anexo de
  teste em `storage/checklist-attachments/` (o `.gitkeep` rastreado ficou), o worktree `dev3-bsan304a-base` e os
  containers `dev-bsan304a-pg` e `dev-bsan304a-redis` (pelo nome); `git status` do `bsan304a` limpo; outros containers e
  worktrees não tocados. Não apaguei `mobile/flutter_app/android/.gradle/` (29 KB, ignorado; não o criei — não rodei Flutter).
- **Incidente 1 (resolvido):** lancei as rodadas 2 e 3 do `npm test` em sequência num só comando de fundo e percebi que
  estourariam o teto de 10 min; parei a tarefa. O `TaskStop` não matou os `node` filhos no Windows: localizei-os pela linha
  de comando (todos com caminho do `bsan304a`) e encerrei a árvore (`taskkill /T`). A execução abortada deixou 3 papéis
  `o6r_b01_*` no MEU cluster; removi-os pelo nome (`DROP OWNED` + `DROP ROLE`), contagem voltou a 0. As rodadas 2 e 3
  válidas foram relançadas separadas, do zero (banco recriado).
- **Incidente 2 (resolvido):** `git worktree remove --force` do `dev3-bsan304a-base` falhou com "Filename too long"
  depois de desregistrar o worktree. Conferi que o resto (303 arquivos) não tinha nenhum ponto de junção/reparse, apaguei
  pelo caminho longo e rodei `git worktree prune`; o `node_modules` do `bsan304a` continua intacto.

**Estado final:** TERMINOU. 8 divergências plano × código declaradas em §I3.D (D-1, D-1b, D-2, D-3, D-4, D-5, D-6,
D-7) + a nota D-8 (sem efeito) + 3 observações. Nada empurrado; o orquestrador confere e empurra.
