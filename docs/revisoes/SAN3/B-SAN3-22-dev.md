# B-SAN3-22 — Relatório do DEV backend

> **Identidade:** `dev-san322-sol` · papel DEV · Codex `gpt-5.6-sol`, esforço medium, nível menor declarado. Não planejou, não criticou e não vota.
> **Objeto:** backend, testes e registros da v2 final de `B-SAN3-22`; `frontend/**` está fora desta fatia.
> **Ref-base medida:** `origin/main` = `b08c755719a6cb0ed192fa04e549ac5fc67a3e67`, após `git fetch origin --prune` em 2026-10-25.
> **Worktree:** `C:/Users/AMP/w-san322`, branch `fix/checklist-trava-versao`, sem junction.

## P1 — Evidência incremental

### 1. Contrato, plano e terreno

- Comando: leitura integral de `CLAUDE.md`, `PROJECT_MEMORY.md`, `.agents/skills/saas-multi-tenant/SKILL.md`, plano v2 e crítica r1.
- Saída resumida: decisões Q1–Q4 preservadas; `prisma/**`, `migrations/**`, `frontend/**` e `Kpis/**` proibidos nesta fatia; tenant deve vir do ator e todo raw SQL deve ser tenant-first.
- Veredito parcial: conforme.
- Comando: `git fetch origin --prune; git rev-parse origin/main`.
- Saída resumida: `b08c755719a6cb0ed192fa04e549ac5fc67a3e67`, igual à ref julgada pelo plano v2.
- Veredito parcial: conforme.
- Comando: `Get-PSDrive C` antes do worktree e antes do `npm ci`.
- Saída resumida: 11,03 GB antes do worktree; 10,94 GB antes do `npm ci`.
- Veredito parcial: piso de 10 GB atendido; nova medição obrigatória após a instalação.
- Comando: `git worktree add -b fix/checklist-trava-versao C:/Users/AMP/w-san322 origin/main`.
- Saída resumida: worktree criado no head-base; branch acompanha `origin/main`.
- Veredito parcial: conforme.
- Comando: `npm ci` no worktree próprio.
- Saída resumida: primeira tentativa falhou por `EIDLETIMEOUT` em `registry.npmjs.org:443`; uma repetição ficou sem progresso de rede e foi interrompida; `npm ci --offline --no-audit --no-fund` concluiu com `added 326 packages in 27m`, ainda no worktree próprio e sem junction.
- Veredito parcial: conforme; instalação própria concluída sem junction.
- Comando: `DATABASE_URL=postgresql://postgres:***@127.0.0.1:55432/dev_san322?schema=public npx prisma generate`.
- Saída resumida: Prisma Client 7.8.0 gerado no `node_modules` do worktree; a primeira chamada sem a variável falhou de forma honesta antes de gerar, e a repetição com a URL descartável concluiu.
- Veredito parcial: conforme; nenhuma base viva foi acessada.
- Comando: containers descartáveis `dev-san322-pg` (`127.0.0.1:55432`) e `dev-san322-redis` (`127.0.0.1:56379`), ambos saudáveis; `npx prisma migrate deploy` somente no banco `dev_san322`.
- Saída resumida: 116 migrações aplicadas no Postgres descartável; nenhum arquivo em `prisma/**` ou `migrations/**` foi alterado.
- Veredito parcial: conforme até o gate de disco.

### 2. Re-medição das premissas do plano

- Comando: leitura por blob com `git show origin/main:<arquivo>` das referências explícitas do plano em `checklist.validator.ts:167-181`, `checklist.service.ts:148-213,238-261,913-923`, `checklist-prisma.repository.ts:178-321,760-811,1106-1113`, `src/database/rls.ts:26-39`, migração RLS `:43-46`, arquivos web/mobile/testes/contratos e registros citados.
- Saída resumida: PATCH aceita status/componentes sem token; serviço lê `previous` antes da gravação; Prisma lê antes e atualiza sem lock/token; `getTemplate` filtra arquivado; reabertura carimba `previous.run.templateVersion`; wrapper abre transação RLS; caminhos web/mobile, RBAC, RN-CAD-007 e pendência de inativação coincidem com a v2.
- Veredito parcial: nenhuma premissa falsa; implementação autorizada.
- Comando: conferência dos caminhos com `git ls-files` (fallback porque `rg` não está instalado nesta máquina).
- Saída resumida: todos os arquivos citados existem no blob `origin/main`; nenhum foi inferido da árvore de outra branch.
- Veredito parcial: conforme §A7.

### 3. Vermelho-controle no head-base

- Comando: `node --test --import tsx tests/checklist-template-change.test.ts tests/checklist-template-lock.test.ts` antes de qualquer mudança em `src/**`.
- Saída resumida: **2/2 arquivos vermelhos** — `ERR_MODULE_NOT_FOUND` para `checklist.template-change.js` e export ausente `parseExpectedUpdatedAtDto`; exit 1.
- Veredito parcial: vermelho-controle confirmado no head-base `b08c7557`.

### 4. Implementação

- Classificador `checklist.template-change.ts`: allowlist fechada de caminhos textuais; toda propriedade desconhecida, chave de `config`, obrigatoriedade, ordem, regra, opção ou adição/remoção é mudança de campo.
- Borda HTTP: `expectedUpdatedAt` obrigatório no PATCH e publish; query obrigatória no DELETE; `componentKey` obrigatório nos componentes do PATCH.
- Repositórios: `SELECT ... FOR UPDATE` tenant-first para PATCH/publish/archive; `date_trunc('milliseconds', updated_at)`; `FOR KEY SHARE` para criação/reabertura; `activeRuns` contado na mesma transação; `previous` devolvido sob lock.
- Serviço/DTO/controller: 409 estável para stale/in-use/porta única; `activeRuns` em GET detalhe/PATCH/publish; arquivado continua servindo vistoria viva; componentes de run resolvidos sem filtrar arquivado.
- Consumidores de teste: tokens acrescentados nos 13 arquivos permitidos; PATCH de arquivamento migrou para DELETE onde previsto.
- `API_CONTRACTS.md`: contrato `checklist_template_patch@2026-10-25.b-san3-22` documentado.

### 5. Validação e mutações

Apurada na retomada do Codex (abaixo) e fechada em "Retomada (dev-san322-opus)", no fim deste arquivo.

### 6. Limpeza, commits e push

Na 1ª execução: parada antes de commits/push (gate de disco). Fechamento, commits e push: ver "Retomada (dev-san322-opus)".

## PAUSA 14:50:32Z

- **Motivo:** o gate de disco obrigatório disparou. Comando: `$b=(Get-PSDrive C).Free; $b; $b/1GB`. Saída: `10735886336` bytes = `9,99857330322266` GiB livres, abaixo dos 10 GB mínimos. A implementação parou imediatamente; nenhum teste/banco adicional, mutação, commit ou push foi executado depois da medição.
- **Head:** `b08c755719a6cb0ed192fa04e549ac5fc67a3e67` no branch local `fix/checklist-trava-versao`; nenhuma entrega foi empurrada.
- **Feito:** leitura integral das fontes; re-medição em `origin/main`; vermelho-controle; implementação inicial do backend/classificador/contrato e atualização dos 13 consumidores permitidos; testes puros novos verdes antes da reinstalação; `npm ci` próprio; `prisma generate`; Postgres/Redis isolados e saudáveis; 116 migrações aplicadas no banco descartável; containers removidos ao pausar.
- **Falta:** completar `tests/checklist-template-lock-db.test.ts` com CE-4/5/6/7/8/10/12/22/23/24; revisar o diff dos 13 arquivos para manter somente token/porta; executar toda a bateria backend e regressões; executar e restaurar, com hash, as mutações backend do §8.5; fechar registros/relatório; confirmar escopos proibidos/Kpis intactos; commits Conventional Commits; push sem PR; limpeza final.
- **Próximo comando (somente após recuperar ≥ 10 GB livres):** `[math]::Round((Get-PSDrive C).Free/1GB,3)`; se verde, recriar `dev-san322-pg`/`dev-san322-redis` nas mesmas portas isoladas e retomar pelo teste DB.

## RETOMADA 2026-10-26

- Comando: `[math]::Round((Get-PSDrive C).Free/1GB,3)`.
- Saída resumida: `10,700 GiB`; o piso foi reduzido pelo dono de 10 para **7 GiB** em 25/10, portanto o gate de disco está verde.
- Veredito parcial: retomada autorizada pelo novo limite; medir novamente antes de cada suíte `-db`.
- Comando: `git status --short`, `git diff --stat`, branch/head e `git diff --check` em `C:/Users/AMP/w-san322`.
- Saída resumida: branch `fix/checklist-trava-versao`, head-base `b08c7557`; 23 arquivos rastreados modificados e 7 não rastreados; diff `426+ / 111-`; nenhum erro de whitespace. Os arquivos novos têm fechamento sintático; `tests/checklist-template-lock-db.test.ts` tem 231 linhas e oito testes/blocos declarados.
- Veredito parcial: parcial preservado e mensurável. `tests/checklist-editor-blockers-parity.test.ts`, não citado na contagem resumida de 13 consumidores da pausa, tem uma única linha necessária de `expectedUpdatedAt`; manter e declarar na conferência final de escopo.
- Comando: `git log b08c7557..origin/main` e `git diff --name-status b08c7557..origin/main`.
- Saída resumida: `origin/main` avançou por #460 e #461 até `b2f8e6cf`; nenhum arquivo backend/checklist deste bloco mudou. Há sobreposição somente nos registros `agent-orchestration/controle/pendencias.md` e `docs/revisoes/SAN3/PLANO_SAN3.md`, a reconciliar antes do push.
- Veredito parcial: backend pode continuar sobre o head-base; integração com a `main` atual será feita sem perder os registros de #460/#461.
- Comando: agrupamento de `docker ps --format '{{.Names}}'`, excluindo `erp-*` e tratando `-pg`/`-redis` do mesmo prefixo como um trabalho.
- Saída resumida: 2 trabalhos (`dev-san312a-c2`, `dev-san322`).
- Veredito parcial: pela decisão do dono de 25/10, nenhuma suíte `-db` roda enquanto houver mais de um trabalho; os containers `dev-san322-*` já estavam presentes na retomada e não foram iniciados nem usados por ela.
- Comando: `node --test --import tsx tests/checklist-template-change.test.ts tests/checklist-template-lock.test.ts` e `npm run check`.
- Saída resumida: **29/29 verdes**, 0 falhas/0 pulos; TypeScript `tsc --noEmit` verde.
- Veredito parcial: classificador, contrato de memória e tipagem conformes; próximo passo sem banco é a regressão dirigida.
- Comando: regressão dirigida sem `DATABASE_URL` em `checklist-routes`, `checklist-snapshot-dispatch`, `mobile-backend-contracts`, `field-dispatch-multi-checklist` e `field-dispatch-checklist-set-port`.
- Saída resumida: **79/79 verdes**, 0 falhas/0 pulos.
- Veredito parcial: nenhuma regressão nos consumidores e no despacho em memória.
- Comando: `npm test` sem `DATABASE_URL`, `npm run lint`, `npm run build`.
- Saída resumida: runner em modo `memory`, **344 arquivos** executados, exit 0; lint (`tsc --noEmit`) e build (`tsc`) verdes. Os pulos `-db` da suíte em memória não contam como prova de banco e serão substituídos pela execução dirigida no cluster descartável.
- Veredito parcial: bateria sem banco verde.
- Comando: `node scripts/migration-transaction-guard.mjs` e diff dos escopos proibidos.
- Saída resumida: `migrações: 116 · anteriores: 112 · novas: 4 · violações: 0`; diff vazio em `mobile/`, `prisma/`, `src/modules/core-saas/`, `frontend/` e `Kpis/`.
- Veredito parcial: nenhuma migração ou trilha proibida foi alterada. As 4 “novas” são posteriores ao snapshot interno do guard, não diff deste bloco.
- Comando: inspeção da lista `SUITES` de `.github/workflows/ci.yml`.
- Saída resumida: `tests/checklist-template-lock-db.test.ts` ausente; `.github/**` é proibido na v2 e no comando desta fatia.
- Veredito parcial: registrada `P-B-SAN3-22-CI-DB-SUITE`, dona orquestração por emenda antes do PR; o DEV não ampliou escopo silenciosamente.
- Comando: drills sem banco CE-3, CE-7a, CE-9b, CE-9d, CE-10c, CE-11b e CE-18a/18e; após cada mutação, teste alvo e restauração por `apply_patch`, seguida de SHA-256.
- Saída resumida: cada mutante deixou o teste nominal vermelho: CE-3/7a/9b/9d → bloco memória; CE-10c → teste novo de arquivado+vistoria viva; CE-11b → publish stale; CE-18a (`minPhotos` textual) → caso 5; CE-18e (retirar `label` da allowlist) → caso 25. Hashes restaurados: repository `A194B198…112`, service `C0204E42…C69`, classifier `ECF393BA…ACE`.
- Veredito parcial: mutações sem banco provam os guards declarados; os drills DB aguardam o teto Docker.
- Comando: revisão do contador Prisma de vistorias vivas.
- Saída resumida: `findMany(...).length` substituído por `count(...)`, preservando o filtro tenant-first e os dois status vivos; `npm run check` e testes puros **30/30** verdes depois do ajuste.
- Veredito parcial: mesmo contrato, sem carregar linhas inteiras desnecessariamente.

- Comando: inspeção do parcial, gate de disco/Docker e suíte DB dirigida com `DATABASE_URL=postgresql://postgres:***@127.0.0.1:55432/dev_san322?schema=public`, `REDIS_URL=redis://127.0.0.1:56379` e `CORE_SAAS_PERSISTENCE=prisma`.
- Saída resumida: 11,657 GiB livres antes da suíte; um único trabalho não-ERP (`dev-san322`, par Postgres/Redis); `git diff --check` limpo; arquivos novos completos. A suíte `checklist-template-lock-db` + `checklist-template-prisma-db` + `checklist-routes-db` + `checklist-run-lifecycle-db` executou **24/24 verdes**, 0 falhas/0 pulos, em 50,7 s.
- Veredito parcial: CE-4/5/6/7/8/10/12/22/23/24 e as regressões Prisma/lifecycle estão provadas no Postgres descartável; isolamento tenant-first também passou sob superusuário, sem depender de RLS.

- Comando: medição de disco e `npm test` com `DATABASE_URL`/`REDIS_URL` descartáveis e `CORE_SAAS_PERSISTENCE=prisma`.
- Saída resumida: 11,653 GiB livres antes da execução; **344 arquivos**, **3.971 testes registrados**, 3.732 pass, 237 fail, 2 skips, duração 582,9 s. Os casos deste bloco executados dentro da rodada (CE-18 e CE-4–25) ficaram verdes. As falhas globais são do arranjo que força para Prisma suítes desenhadas para memória: fixtures como `ten_000001`/`tenant-a` chegam a colunas UUID, repositórios em memória passam a consultar a base e dados compartilhados contaminam contagens. Houve ainda `EBUSY` no teardown de `traccar-event-migration-drill-db.test.ts`, que fez o guard de denominador acusar um arquivo sem teste.
- Veredito parcial: a bateria completa com banco foi executada e não é verde por incompatibilidades preexistentes fora do escopo; não há sinal de regressão do checklist. A prova DB canônica desta fatia é a suíte dirigida de 24/24 sem skip; o DEV não ampliará escopo para corrigir 237 falhas de outros módulos.

- Comando: drills DB CE-4, CE-5, CE-12-db, CE-22, CE-23 e CE-24; antes de cada execução foi medido disco (11,648–11,649 GiB), cada mutação foi aplicada com `apply_patch`, o teste nominal foi executado no Postgres descartável e o arquivo foi restaurado.
- Saída resumida: CE-4 sem `date_trunc` → stale indevido nos micros; CE-5 sem `FOR UPDATE` → sobrescrita aceita em vez de stale; CE-12 sem tenant no lock/leitura/update → o PATCH de A devolveu e gravou o modelo de B (`name=intruso`), deixando o teste vermelho; CE-22 carimbando o argumento antigo → `2 !== 3`; CE-23 com `FOR NO KEY UPDATE` → perdeu a serialização e o teste ficou vermelho; CE-24 mantendo a versão anterior → `2 !== 3`.
- Veredito parcial: os seis mutantes DB foram mortos pelos testes nominais. SHA-256 do repositório antes e depois: `F851BE6332D138505482C2E98BDF018EFE83D7FF01EAA002DBB55E28C10F002B`; `git diff --check` limpo após a restauração.

## Retomada (dev-san322-opus)

> **Identidade:** `dev-san322-opus` · papel DEV · Claude Opus 5.5, **nível menor declarado**, identidade nova. Sucede o `dev-san322-sol` (Codex), que caiu várias vezes por limite de uso; o dono mandou o Claude cobrir uma tarefa por vez. Não planejou e não vota. Fonte única: o plano v2 (`docs/revisoes/SAN3/B-SAN3-22-plano.md`, recopiado nesta retomada, porque a cópia anterior não tinha a seção "Aprovação do dono da maquete", acrescentada depois na fonte). Só backend; `frontend/**` intocado (Q4 (b): o backend corre em paralelo ao seletor).

### R1. Medição do parcial (P3/P7), antes de qualquer código

| Comando | Saída resumida | Veredito |
|---|---|---|
| `git -C C:/Users/AMP/w-san322 status --short` · `git diff --stat` · `git log -1` | head `b08c7557`, 0 commits; 23 rastreados modificados (+442/−111) e 7 não rastreados (`checklist.template-change.ts`, 3 testes novos, comando, plano, relatório) | parcial preservado |
| `df -h /c` · `docker ps` | 12 GB livres (piso 7 GB). Fora de `erp-*`, só `dev-san322-pg` (127.0.0.1:55432) e `dev-san322-redis` (127.0.0.1:56379), criados em 25/10 às 23:26Z; banco `dev_san322` com 116 migrações e `TimeZone=UTC` | terreno do ramo, reusado |
| leitura integral do diff de `src/` e dos 3 testes novos | código coerente com §2–§4 do plano. O `PrismaChecklistRepository` só é construído dentro da transação RLS (`withTenant`), então `FOR UPDATE` e `FOR KEY SHARE` valem até o commit. O teste de memória cobria o §8.1 **só no serviço**: faltavam pela rota CE-2a, CE-3 com GET, CE-7b/7c/7d, CE-8a/8b/8c, CE-9a/9e, CE-10c completo, CE-11b, CE-11c, CE-12, CE-13 e CE-14 (ausente na lista) | lacuna de teste, completada em R3 |
| `node --test --import tsx tests/checklist-template-change.test.ts tests/checklist-template-lock.test.ts` · `npm run check` | 29/29 verdes; `tsc` verde | o parcial compila e passa |

### R2. Vermelho-controle no head-base `b08c7557`

Os 6 arquivos de `src/modules/checklists/` do ramo foram copiados para o scratchpad e voltaram ao blob de `b08c7557` (`git show`); o `checklist.template-change.ts` saiu; os testes do ramo rodaram. Depois, restauro por cópia, com `sha256sum -c` OK nos 7 arquivos.

| Teste | Saída no head-base | Veredito |
|---|---|---|
| `checklist-template-change` | `ERR_MODULE_NOT_FOUND` (`checklist.template-change.js`) | vermelho ✓ |
| `checklist-template-lock-db` (com `DATABASE_URL` do banco descartável) | 9/9 `not ok`: CE-12-forma, CE-4/5, CE-6/7/8, CE-10-db, CE-12-db, CE-22/23, CE-22, CE-24, CE-25 | vermelho ✓ (o da `-db` não estava registrado; feito agora) |
| `checklist-template-lock` (arquivo inteiro) | `SyntaxError`: `parseExpectedUpdatedAtDto` não existe | vermelho por importação |
| só a parte REST (cópia temporária sem o import do validador, apagada depois) | CE-1/2a/2b/3/14 `expected 0` (sem `activeRuns`) · CE-7 `409 × 200` · CE-9 `409 × 200` · CE-10 `400 × 204` · CE-11 `409 × 200` · CE-8c `1 × 2` leituras; **passam** CE-12 (controle, como o plano prevê) e CE-11c (guard de futuro) | vermelho comportamental ✓ |
| guard CE-13 sobre os testes do head-base (16 arquivos extraídos por `git show`) | 30 sítios sem token: **10 PATCH + 16 publish + 4 `updateTemplate` diretos**, exatamente o M-27 | vermelho ✓ |

### R3. O que esta identidade acrescentou

- `tests/checklist-template-lock.test.ts`: o §8.1 pela porta HTTP (REST em memória, molde `checklist-routes.test.ts`). São CE-1/2a/2b/3/14, CE-7a–d/8a/8b, CE-9a–e, CE-10a–c (inclui resposta 200, `available` não lista, `createRun` 404 e reabrir 409), CE-11a/11b, CE-12, CE-8c (repositório instrumentado: 1 leitura e auditoria `versionFrom/versionTo/typeFrom/typeTo`), o guard CE-11c e o guard CE-13 (leitura de arquivo, inclusive URL concatenada).
- `tests/checklist-template-change.test.ts`: `required` `false→true` e reordenar `config.options` (CE-18b/18c pedem os dois sentidos).
- **`createRun` de modelo arquivado responde 404, não 409** como diz o CE-10c do plano. Medido e inalterado: o serviço resolve o modelo por `getTemplate`, que não enxerga arquivado. O teste fixa 404.
- **Premissa do plano incompleta (M-27), declarada.** O inventário de consumidores não contou `tests/helpers/o6r07c-census.ts:90`, que publica com a URL **concatenada** e sem token. No `npm test` isso derrubou 14 testes do `o6r07c-census-guard` ("semente incompleta"). O conserto tem 1 linha, da mesma natureza das 13 permitidas (só o token), mas fica **fora da lista nominal do PERMITIDO**, como o `checklist-editor-blockers-parity.test.ts` que o Codex já tinha declarado. O CE-13 passou a pegar a forma concatenada (mutação em R5). A junta (C2/C3) julga.
- `agent-orchestration/controle/pendencias.md`: `P-B-SAN3-22-CI-DB-SUITE` re-medida e corrigida, de "bloqueia o merge" para "não bloqueia". A suíte `-db` nova **roda na CI** no job `backend` (`npm test` com `DATABASE_URL`, superusuário `postgres`, orçamento de skip 2); só não está na lista curada do `backend-postgres`, onde o §12 a situa.
- Merge de `origin/main` (`9dad66c0`: #459, #460, #461, #462) **sem rebase**, no commit `7cbae4c1`. O único conflito foi em `pendencias.md` (os dois lados acrescentaram no fim), resolvido mantendo os dois blocos. A `main` não tocou `src/modules/checklists` nem os testes de checklist (`git diff b08c7557 origin/main -- src/modules/checklists tests/checklist*` = 0 linhas). O seletor `B-APARENCIA-USUARIO` entrou pelo #461, então a válvula H-08 não será necessária na fatia de tela.

### R4. Bateria depois do merge

Disco: 12 GB antes de cada suíte `-db`. Docker: 1 trabalho fora de `erp-*`. `npx prisma migrate deploy` aplicou no banco descartável a migração nova da `main` (`20260882000000_…`).

| Comando | Resultado |
|---|---|
| `npm run check` · `npm run lint` · `npm run build` | verdes |
| testes do bloco e regressões sem banco (14 arquivos: `checklist-template-change`, `checklist-template-lock`, `checklist-routes`, `checklist-snapshot-dispatch`, `mobile-backend-contracts`, `field-dispatch-multi-checklist`, `field-dispatch-checklist-set-port` e os demais consumidores) | **368/368**, 0 falha, 0 pulo |
| `-db` com `CORE_SAAS_PERSISTENCE=prisma`: `checklist-template-lock-db`, `checklist-template-prisma-db`, `checklist-routes-db`, `checklist-run-lifecycle-db`, `checklist-run-create-concurrency-db` | **26/26**, 0 falha, 0 pulo |
| `tests/o6r07c-census-guard.test.ts`, depois do token na semente | 32/32 |
| `npm test` na forma do job `backend` (`DATABASE_URL` e `REDIS_URL` exportados, `CORE_SAAS_PERSISTENCE=memory`), banco **limpo** `dev_san322_c` | 361 arquivos · **4120 testes · pass 4108 · fail 10 · skip 2** (orçamento 2); exit 1 pelas falhas e pelo piso de denominador. Os 52 `ok … CE-` do bloco estão no TAP, inclusive `CE-12-db` e `CE-22/23` |
| `node scripts/migration-transaction-guard.mjs` | `migrações: 117 · anteriores: 112 · novas: 5 · violações: 0` (as 5 "novas" são posteriores ao instantâneo interno do guard; o diff deste bloco em `prisma/` é 0) |
| `git diff --check origin/main...HEAD` | limpo |
| `git diff --name-only origin/main...HEAD -- mobile/ prisma/ src/modules/core-saas/ frontend/ Kpis/ .github/ src/database/` | **0** arquivos |

**As 10 falhas do `npm test` são do Windows; nenhuma é de checklist.** Rodadas isoladas, em banco limpo (`dev_san322_b`):

| Arquivo | Isolado (pass/fail) | Causa medida |
|---|---|---|
| `san3-05-runtime-role-guard-db` (4) | 8/4 | `setsid: ausente — necessário para impedir que psql leia a senha do terminal` (o job da CI é Linux) |
| `san3-09-bootstrap-platform-admin-db` (2) | 0/2 | o spawn de `node_modules/.bin/prisma` (script de shell) falha no Windows |
| `traccar-event-migration-drill-db` e `work-order-invoicing-migration-drill-db` (1 cada, mais o piso de denominador) | 6/1 cada | `EBUSY` no teardown (trava de arquivo do Windows), já registrado pelo Codex |
| `traccar-position-ingestion-db` (2: tempo esgotado → 503) | **22/0** | sensível a carga; passa sozinho |

Na 1ª rodada (banco `dev_san322` reaproveitado) houve ainda 1 falha em `o6r06-allocation-basis-rls-db` (`count 13 × 11`, linhas de outro teste no mesmo período). No banco limpo: 10/10. Poluição de banco compartilhado, não do bloco.

**Escopo por arquivo de teste (CE-33), declarado.** Passam de 4 linhas, só com o encanamento do token: `checklist-routes` (+14/−9: helpers devolvem `updatedAt`; o PATCH `archived` de 716-720 vira DELETE), `checklist-routes-db` (+6/−5: idem em 211), `checklist-snapshot-dispatch` (+8/−8), `checklist-template-prisma-db` (+8/−4: o fixture publica antes de `createRun`, porque a R6 exige publicado sob lock), `mobile-backend-contracts` (+16/−5: o stub Prisma da reabertura responde à 2ª `$queryRaw`, a do `FOR KEY SHARE` da R6), `mobile-checklists-available` (+5/−5) e `work-order-checklists-sticky` (+5/−5). Fora da lista nominal: `checklist-editor-blockers-parity` (1 linha, do Codex) e `helpers/o6r07c-census.ts` (1 linha, desta identidade).

### R5. Mutações

Cada uma: backup no scratchpad, mutante, teste nominal, restauro por cópia com SHA-256 conferido.

| CE | Mutante | Teste que ficou vermelho | Restauro |
|---|---|---|---|
| CE-3 | memória sem comparar o token | CE-1/2a/2b/3/14 (REST) | `a194b198…` OK |
| CE-7a | classificador sempre `text` | CE-7a…8b (REST) | `ecf393ba…` OK |
| CE-9b | `draft` com viva tratado como texto | CE-9a…9e (REST) | `a194b198…` OK |
| CE-10c | `render` não serve `archived` | CE-10a…10c (REST) | `79692556…` OK |
| CE-11b | publicar sem o predicado do token (memória) | CE-11a/11b (REST) | `a194b198…` OK |
| CE-8c | serviço lê o modelo antes de gravar | CE-8c (1 × 2 leituras) | `79692556…` OK |
| CE-14 | GET de detalhe com `activeRuns` fixo em 0 | CE-1/2a/2b/3/14 | `c24d5c62…` OK |
| CE-13 | tirar o token de `work-order-checklists-sticky.test.ts:832` | CE-13 | `69f1bb62…` OK |
| CE-13 (URL concatenada) | tirar o token de `helpers/o6r07c-census.ts:90` | CE-13 | `af315b02…` OK |
| **CE-12-db** | sem `tenant_id` no `FOR UPDATE`, no `getTemplate` e no `update` | CE-12-db (superusuário) | `72870797…` OK |
| CE-4 | `updated_at = $x`, sem `date_trunc` | CE-4/5 | `72870797…` OK |
| CE-5 | lock sem `FOR UPDATE` | CE-4/5 | `72870797…` OK |
| CE-23 | `FOR NO KEY UPDATE` no lugar de `FOR UPDATE` | CE-22/23 | `72870797…` OK |
| CE-22 | `createRun` carimba a versão do argumento | CE-22/23 | `72870797…` OK |
| CE-24 | a reabertura mantém `previous.run.templateVersion` | CE-24 | `72870797…` OK |

**15 mutações, 15 vermelhas, 15 restauradas.** As de banco rodaram no Postgres limpo `dev_san322_b` (base antes delas: `checklist-template-lock-db` 9/9). As do Codex (CE-9d, CE-18a/18e e as 6 de banco dele, antes do merge) seguem registradas acima. CE-27 e CE-30 são da fatia web.

### R6. Commits, push e limpeza

- Commits em Conventional Commits, sem atribuição: `c67a31bf` fix(checklists), `adb115cf` test(checklists), o do registro, o merge `7cbae4c1` e o commit final desta retomada (testes acrescentados, semente do censo, pendência corrigida e este relatório).
- `git push -u origin fix/checklist-trava-versao`. PR **não** aberto.
- Limpeza §C5: `dev-san322-pg` e `dev-san322-redis` removidos (com os bancos `dev_san322`, `_b` e `_c`). Worktree mantido. No scratchpad, só os arquivos desta identidade.
- **Para o orquestrador:** (1) a fatia web (`P-B-SAN3-22-FRONT-TOKEN-E-3-APARENCIAS`) é pré-requisito de merge: sem ela, o editor web atual leva 400 ao salvar, publicar e arquivar (R9 do plano); (2) a emenda de escopo para `helpers/o6r07c-census.ts` e `checklist-editor-blockers-parity.test.ts`; (3) `P-B-SAN3-22-CI-DB-SUITE`, agora não bloqueante.

---

## Fatia web e E3-bis (`dev-san322-web-opus`)

- **Papel:** DEV. **Identidade:** `dev-san322-web-opus`. **Modelo:** Claude Opus 5.5, nível menor **declarado** (§C7.6). Cobre o Codex, sem limite até 14:18Z, por ordem do dono (uma tarefa por vez). Não planejou, não criticou, não vota.
- **Fonte única:** plano `B-SAN3-22-plano.md` (v2 + E3 + resposta à Q5 + E3-bis). Mandato: `C:/Users/AMP/erp-pausa-2026-10-03/prompts/dev-san3-22-web.md`.
- **Objeto de partida:** ramo `fix/checklist-trava-versao`, head `d7483c28` (conferido com `git -C C:/Users/AMP/w-san322 log -1` às 11:23Z de 26/10). Disco livre na partida: 11 GB.
- **Gravação:** P1, uma subseção por etapa, apensada ao ser concluída.

### W1. Re-medição das citações (head `d7483c28`)

Lidas no ramo antes de qualquer código: `checklist-editor.model.ts:109-142` (builder sem token; tira `schema.components`, grava `source`/`sections`, renumera `orderIndex`, grava `sectionIndex` em todo campo, `help` só não vazio) · `ChecklistEditorPage.tsx:379-421` (`persistDraft` → `boolean`, releitura best-effort em 397-403), `:467-492` (`handlePublish` com o `checklist` do fechamento), `:499-519` (Inativar/Reativar direto, `draft`), `:716-734` (Publicar travado com `aria-disabled` + `title` + clique), `:757-762` (link "Ver execuções"), `:1210-1256` (`ExitConfirmDialog`), `:1268-1300` (`ConcurrentEditDialog`) · `checklist.template-change.ts` (classificador do dev do backend, comparação crua de `schema` e de `orderIndex`) · `checklist-prisma.repository.ts:418-438` e `checklist.repository.ts:868-876` (gravam `schema.components`) · `frontend/package.json:11` (lista explícita; `aparencia-menu.smoke.test.tsx` **já** está nela) · referência `screen-refs/checklist-editor-estados-3opcoes.reference.html` (2976 linhas; bloco "B-SAN3-22 — acréscimos desta maquete" no CSS). Nenhuma premissa do plano caiu nesta leitura; as divergências achadas no caminho estão em D-W1…D-W4 abaixo.

### W2. Backend — E3b-01…E3b-03 (teste antes do código)

**Testes escritos primeiro:** novo `tests/checklist-editor-classifier-parity.test.ts` (CE-37: modelo do servidor → `toChecklistTemplateDetailDto` → `createEditorDraftFromChecklist` → `buildUpdateInputFromEditorDraft` → `parseUpdateChecklistTemplateDto` → `classifyTemplateChange`, para um modelo publicado com `schema.components`, um legado sem `sectionIndex` e com `orderIndex` 10/20/30, e um do editor em rascunho) e, em `tests/checklist-template-change.test.ts`, a CE-18c reescrita (renumerar → `none`; reordenar → `field`) mais os casos E3b-01 (a) `schema.components` → `none`, (c) `sectionIndex` ausente × 0 → `none` e 0 × 1 → `field`, (d) `help` ausente × `""` → `none`.

**Vermelho-controle no head `d7483c28`** (`node --test --import tsx tests/checklist-editor-classifier-parity.test.ts tests/checklist-template-change.test.ts`): **49 testes, 38 pass, 11 fail.** Publicado, sem mudança: `caminhos acusados: ["schema.components"]` (a saída M-40 da crítica); só rótulo: `["components.fotos.label","schema.components"]`; legado sem mudança: `sectionIndex` ×3, `orderIndex` ×3, `schema.sections`, `schema.source`; CE-18c renumerar e os 3 casos E3b-01 vermelhos.

**Conserto** só em `src/modules/checklists/checklist.template-change.ts`: (a) `schema.components` retirado dos dois lados antes do `diffValue`; (b) `orderIndex` comparado pela **ordem relativa** das chaves sobreviventes (empate pela posição no array), emitindo `components.order`; (c) `config.sectionIndex` ausente, não inteiro ou negativo ≡ 0; (d) `config.help` ausente ≡ `""`. `TEXT_PATHS` intocada. Depois: **49/49**. Regressão sem banco (`checklist-template-lock`, `checklist-routes`, `checklist-editor-blockers-parity`, `checklist-snapshot-dispatch`): **44/44**.

**Mutações (backup em scratchpad, mutante, os 2 arquivos, restauro por cópia; SHA-256 do arquivo `11b2c2b1…` antes e depois):**

| Mutante | Resultado |
|---|---|
| sem a exclusão de `schema.components` | 45 pass / **4 fail** |
| `orderIndex` comparado por valor | 44 / **5 fail** |
| `sectionIndex` sem normalizar | 44 / **5 fail** |
| `help` sem normalizar | 47 / **2 fail** |
| restaurado (`11b2c2b1`) | 49 / 0 |

**D-W1 (divergência declarada, E3b-02 × E3b.4).** A E3b-02 pede `none` para "salvar sem alteração" também no modelo **legado**. Com só as 4 normalizações (E3b.4: "e só elas; `TEXT_PATHS` não muda"), o legado sai `text` com exatamente `["schema.sections","schema.source"]`, porque o editor grava a sua convenção de seções no primeiro salvar. Isso já aparecia na própria M-40 (`schema.source` no caso 3). Efeito: nenhum (`text` passa com vistoria viva e não sobe versão; só `field` faz as duas coisas). Não acrescentei 5ª normalização (seria contrato novo). O CE-37 afirma, para o legado, `text` com esses dois caminhos e nada mais; para publicado e editor, `none`. Fica para o planejador/C2 decidir se a letra da E3b-02 muda.
- Ajuste no laço CE-18 de `config.<chave>`: para `sectionIndex` o valor de teste passou de `"novo"` (inválido ≡ 0 pela E3b-01(c)) para `1` (mover de seção), que é a mudança real.

### W3. Fatia web (E3.2 + E3b-04…E3b-21) — o que foi feito

Tela-modelo: a própria `ChecklistEditorPage.tsx` e `TenantChecklistsPage.tsx` (§4 item 1); componentes do repositório (`KpiStatCard` para os blocos da B, `.pat-filtro-chip`, `.pat-ab-table`, `.pat-ab-detail-*`, `.ckb-ed-*`, `ExitConfirmDialog` como molde). Skills: `ts-frontend-full` (implementar) e `ui-ux-pro-max` (revisar, lida a régua de estados, foco e alvo). `frontend/node_modules` não existia: `npm --prefix frontend ci` (103 pacotes, 46 s; disco 11 GB antes e depois). Sem junction.

| Requisito | Onde | O que ficou |
|---|---|---|
| E3-04 token no salvar | `checklist-editor.model.ts` (`buildUpdateInputFromEditorDraft(draft, baseSchema, expectedUpdatedAt)`), `ChecklistEditorPage.tsx` (`persistDraft`) | o PATCH leva `target.updatedAt`; a releitura best-effort pré-PATCH **saiu**; `UpdateTenantChecklistInput.expectedUpdatedAt` virou obrigatório no tipo (o `tsc` apontou o único chamador sem token, a lista) |
| E3-05/E3b-07 token no publicar | `checklist.adapter.ts`, `checklist.service.ts`, `handlePublish` | `persistDraft` devolve `TenantChecklist \| null`; o publicar usa `publishTokenAfterSave(saved, checklist)` (CE-26c) |
| E3-06/E3b-13 arquivar | `checklist.adapter.ts` | só a URL com `?expectedUpdatedAt=` na função sem chamador; sem mock, sem gesto |
| E3-07 Inativar/Reativar | editor (`changeStatus`) e lista (`toggleChecklistStatusFromList`) | os dois levam o `updatedAt` lido |
| E3-08/E3b-14 409 stale por aparência | editor + `ChecklistEditorLockViews.tsx` | A: `ConcurrentEditDialog` com o texto de sempre + `.ckb-ed-modal-when` ("Salvo por outra pessoa às HH:MM · você abriu às HH:MM"); B: faixa `.ckb-ed-blockbar` (role alert) com "N diferenças" e as duas ações; C: coluna "Salvo × Seu" (`.c22-cmp`). Recarregar = GET e substitui o rascunho; Sobrescrever = GET + PATCH com o token recém-lido; nunca `force`. Comparador puro `diffEditorDraft` |
| E3b-08 409 no publicar | `handleWriteError(error, "publish", …)` | a mesma apresentação, sem "Sobrescrever" |
| E3-09 409 em uso | `resolveWriteError` (puro) | relê o detalhe e diz N ("Há N vistorias em andamento com este modelo. Agora só os textos podem mudar; …") |
| E3-10 `activeRuns` | `nextEditorLock` (puro) | toda resposta de modelo único alimenta a trava (GET, salvar, publicar, inativar, releituras); ausente/ inválido = **não confirmado = travado** com "Não foi possível confirmar se há vistorias em andamento — recarregue o modelo para mudar os campos." e o link "Recarregar o modelo" na faixa |
| E3-11 trava de campos | editor, `ChecklistFieldInspector.tsx` | paleta, mover/duplicar/remover, tipo do modelo, obrigatório, opções e toda chave de configuração ficam `aria-disabled` + `title` + `data-explica` + clique que explica (toast âmbar); nunca `disabled`. Pergunta, ajuda, nome, descrição e nomes de seção livres |
| E3b-09 CE-29 | editor + lista | editor: Reativar travado (`editorStatusAction`); lista: PATCH direto e, no 409 em uso, GET do detalhe e aviso com N; no 409 stale, a linha é atualizada |
| E3b-10 seção | editor | remover seção travado ("Remover a seção move os campos seguintes: fica travado…"); acrescentar e renomear livres |
| E3-12/E3b-04 aparências | `useScreenAppearance("checklist-editor")`; `appearance.registry.ts` (só a entrada) | A "Padrão fiel", B "Analítica", C "Painel de impacto"; padrão A pelo contrato do hook; `aparencia-menu.smoke.test.tsx` deriva as contagens do registro e ganhou "A marcada para o editor" |
| E3-13 C | `EditorImpactPanel` | "Em uso agora" (pode/não pode, como destravar, textos do campo selecionado); paleta recolhe para ícones; Inativar no painel abre a confirmação |
| E3-19/E3b-15/E3b-16 B | `EditorLockKpis` | 3 blocos clicáveis com números reais: N, `vN` + "publicada em dd/mm" (selo pela situação: publicada · inativo · rascunho), "N de N" campos; abrem logo abaixo o resumo da versão e a tabela fixa de 5 linhas "O que muda agora"; o bloco de vistorias destaca a faixa; sem lista de vistorias, sem histórico, sem "Ver execuções" |
| E3b-18 link | editor | A e C mantêm "Ver execuções deste modelo"; B não |
| E3b-17 inativar | `InactivateConfirmDialog` (molde `ExitConfirmDialog`) | Inativar sempre confirma; Esc e foco na saída conservadora |
| E3b-19 releitura falha | `resolveWriteError` | vira "não confirmado" (travado), sem comparador |
| E3b-06 mock | `checklist.mock.ts`, `checklist-runtime.mock.ts` | `activeRuns` contado (semente + vistorias vivas do runtime simulado) em get/salvar/publicar; modelo de demonstração `chk_vistoria_em_uso` com 2 vivas; token defasado → 409; `published`/`archived` pelo salvar → portas próprias; `draft` ou mudança de campo com viva → 409 em uso |
| E3b-05 CSS | `app.css` | um bloco contíguo `/* B-SAN3-22 — estados do editor (A/B/C) */` depois das regras `.ckb-ed-modal-*`, só `var(--…)` e `color-mix` de tokens, **0 hex** |
| E3b-21 smoke | `frontend/package.json` | `tests/checklists-editor-lock.smoke.test.tsx` entrou na lista; `aparencia-menu` já estava |
| E3-16 testes | `checklists-editor-lock.smoke.test.tsx` (novo, 22 testes), `checklists-editor.smoke.test.tsx` (fixture com `activeRuns: 0`; o teste do diálogo cobre o 409 e a linha de horário) | — |

### W4. Bateria (execução real, worktree `C:/Users/AMP/w-san322`)

Disco: 11 GB livres antes do `npm ci`, das suítes `-db` e do `npm test` (piso de 7 GB respeitado). Memória: 6,7 GB físicos e 10 GB de commit livres antes de subir o `vite` e o Edge. Docker: nenhum trabalho fora de `erp-*` antes de subir os meus. Postgres 16 `dev-san322w-pg` (127.0.0.1:55432) e Redis 7 `dev-san322w-redis` (127.0.0.1:56379), descartáveis; base viva (5432/6379) e portas 3000/5173/5050/8899 não tocadas.

| Comando | Resultado |
|---|---|
| `npm --prefix frontend run check` | verde |
| `npm --prefix frontend run build` | verde (só o aviso de chunk > 500 kB, que já existia) |
| `npm --prefix frontend run test:smoke` (lista do `package.json` com `checklists-editor-lock`) | **1390/1390**, 0 falha, 0 pulo; 21 `ok` de CE-26…32/E3b no TAP + o menu de aparência |
| `npm run check` · `npm run lint` · `npm run build` | verdes |
| `node --test --import tsx` checklist sem banco: `checklist-template-change`, `checklist-editor-classifier-parity`, `checklist-editor-blockers-parity` | **50/50** |
| idem: `checklist-template-lock`, `checklist-routes`, `checklist-editor-blockers-parity`, `checklist-snapshot-dispatch` | **44/44** |
| `-db` com `CORE_SAAS_PERSISTENCE=prisma` em `dev_san322w` (`prisma migrate deploy` antes): `checklist-template-lock-db`, `checklist-template-prisma-db`, `checklist-routes-db`, `checklist-run-lifecycle-db`, `checklist-run-create-concurrency-db` | **26/26**, 0 falha, **0 pulo** |
| `npm test` na forma do job `backend` (`DATABASE_URL`/`REDIS_URL` dos descartáveis, banco limpo `dev_san322w_t`, `CORE_SAAS_PERSISTENCE=memory`) | **4142 testes · pass 4131 · fail 9 · skip 2**; exit 1 pelas falhas e pelo piso de denominador. **0 falha de checklist**; 18 `ok … CE-37` no TAP. As 9 são as mesmas classes do Windows já medidas na retomada do backend (R4): `san3-05-runtime-role-guard-db` T14a–d (`setsid: ausente`), `san3-09` T2.1 (spawn do `prisma` em shell), `traccar-event-migration-drill-db` e `work-order-invoicing-migration-drill-db` (`EBUSY` no teardown), `traccar-position-ingestion-db` (tempo esgotado sob carga). A CI é Linux |
| `git diff --check d7483c28` | limpo (depois de tirar a linha em branco que o meu apêndice deixou no fim deste relatório) |
| escopo: `git diff --name-only origin/main...HEAD -- mobile/ prisma/ src/modules/core-saas/ frontend/src/services/api/ Kpis/ .github/ src/database/` | **0** |
| backend tocado pela fatia (`git diff --name-only d7483c28 -- src/ tests/`) | exatamente os 3 da E3b.4 |
| `frontend/src/modules/appearance/` (`git diff --name-only d7483c28`) | só `appearance.registry.ts` (a entrada) |

### W5. Mutações da E3-bis (fatia web)

Roteiro `mutate.py` (no scratchpad, copiado abaixo em forma de tabela): backup, mutante com âncora única, os testes nominais, restauro por cópia e SHA-256 conferido. **25 mutações, 25 vermelhas, 25 restauradas.** Mais a de forma da E3b-05 e as 4 do classificador (W2).

| Mutante | Arquivo | Testes | Resultado | SHA (antes = depois) |
|---|---|---|---|---|
| builder sem token (CE-26a/E3-04) | `checklist-editor.model.ts` | lock smoke | 19/**3 fail** | `72a0bf54` |
| idem, no backend (CE-37) | idem | `checklist-editor-classifier-parity` | 0/**18 fail** | `72a0bf54` |
| publicar com o token do fechamento (CE-26c/E3b-07) | model | lock | 21/**1** | `72a0bf54` |
| 409 do publicar no toast genérico (E3b-08, forma) | `ChecklistEditorPage.tsx` | lock | 21/**1** | `960c5825` |
| `reason` mapeado errado (CE-26b) | model | lock | 19/**3** | `72a0bf54` |
| ausente = livre (CE-27) | model | lock | 20/**2** | `72a0bf54` |
| releitura que falha mantém editável (E3b-19) | model | lock | 21/**1** | `72a0bf54` |
| 409 em uso sem reler, N fixo (CE-28) | model | lock | 20/**2** | `72a0bf54` |
| Reativar livre (CE-29 editor, ação) | model | lock | 21/**1** | `72a0bf54` |
| Reativar sem `aria-disabled` (CE-29 editor, tela) | página | lock | 21/**1** | `960c5825` |
| lista sem reler no 409 em uso (E3b-09) | `TenantChecklistsPage.tsx` | lock | 21/**1** | `a956de3c` |
| lista sem token (E3-07) | lista | lock | 21/**1** | `a956de3c` |
| remover seção livre com a trava (E3b-10) | página | lock | 21/**1** | `960c5825` |
| ações de campo livres com a trava (E3-11) | página | lock | 20/**2** | `960c5825` |
| linha de horário sem a hora de abertura (E3b-14) | model | lock | 20/**2** | `72a0bf54` |
| frase das vistorias com "versão" (E3b-16) | model | lock | 20/**2** | `72a0bf54` |
| inativar sem diálogo (E3b-17) | model | lock | 21/**1** | `72a0bf54` |
| comparador com 0 diferenças quando há 2 (E3-08) | model | lock | 19/**3** | `72a0bf54` |
| ignorar o hook, sempre A (CE-30) | página | lock | 19/**3** | `960c5825` |
| tirar a entrada do registro (E3b-04) | `appearance.registry.ts` | `aparencia-menu` | 1/**1** | `a5255d18` |
| padrão do editor = B (E3b-04/CE-30) | `appearance.storage.ts` (só o mutante; o arquivo não é do bloco) | menu + lock | 22/**2** | `d83e4b80` |
| mock sem `activeRuns` (E3b-06) | `checklist.mock.ts` | lock | 21/**1** | `aa9edc9f` |
| mock aceita token defasado (CE-31) | mock | lock | 20/**2** | `aa9edc9f` |
| termo técnico na cópia (CE-32) | model | lock | 20/**2** | `72a0bf54` |
| link "Ver execuções" de volta na B (E3b-18) | página | lock | 21/**1** | `960c5825` |
| **E3b-05 (forma):** hex no bloco do `app.css` | `app.css` | contagem no bloco | 0 → **2** → 0 | `4e471d98` |

### W6. Capturas (Edge headless) — `docs/revisoes/SAN3/B-SAN3-22-capturas/`

`vite` próprio em `127.0.0.1:47322` com `VITE_USE_MOCKS=true` (a 51735 caiu numa faixa de portas reservada do Windows: `listen EACCES`); Edge (`channel: "msedge"`, headless) dirigido pelo Playwright do `node_modules` da raiz. Sessão simulada, organização ativa e aparência gravadas no `localStorage` como o app grava. "Outra pessoa salvou" = gravação pelo mesmo módulo simulado que o app usa. Roteiros: `capture.mjs` e `capture-ref.mjs`, na mesma pasta. Registro das execuções: `capturas-924x540.log`, `capturas-1440x900.log`.

- **924×540** (o pedido): `a-travado`, `a-conflito`, `b-travado`, `b-travado-campos`, `b-conflito`, `c-travado`, `c-travado-painel`, `c-conflito`, mais `a-publicar-conflito` e `a-inativar-confirmacao`; a referência nos mesmos estados: `ref-<estado>-924x540.png`.
- **1440×900** (as 3 colunas, como a referência é desenhada): os mesmos 10 estados do app.
- **Comportamento medido ao vivo**, nas duas larguras e nas 3 aparências: faixa da trava presente em A e B e ausente na C; pílula "Em uso por 2 vistorias" (A/B) e "Somente textos" (C); clique num controle travado explica ("Há 2 vistorias em andamento com este modelo…"); conflito ao salvar → A diálogo com a linha de horário, B faixa com "N diferenças", C comparador; **publicar com token defasado → "Recarregar o modelo" sem "Sobrescrever"** (E3b-08); **Inativar abre "Inativar este modelo?"** (E3b-17).
- **Achado pré-existente (não deste bloco):** abaixo de 1180 px a grade do editor sobrepõe as colunas (paleta, formulário e inspector umas sobre as outras). Medido no estado **livre**, sem nada deste bloco na tela: `probe.mjs` em `chk_towing_delivery` a 924 px → colunas em `y=175 h=452`, `y=279 h=415`, `y=382 h=262`. A causa está nas regras `.ckb-ed-grid { flex: 1; min-height: 0 }` + o `@media (max-width: 1180px)` de uma coluna, que são de antes (`app.css:4919-4935`, não tocadas). A referência, que não tem a altura presa, empilha sem sobrepor. Proposta de pendência: `P-CHK-EDITOR-GRADE-ESTREITA` (dono: orquestrador). As capturas de 924 px mostram o defeito; as de 1440 px mostram a tela como desenhada.

### W7. Divergências declaradas (para o planejador e a junta)

- **D-W1** (W2): legado sai `text`, não `none`, com só as 4 normalizações.
- **D-W2** `checklist-runtime.mock.ts` (+14): um contador exportado das vistorias vivas do runtime simulado. A E3b-06 manda contar "das runs do runtime mock" e o `Map` é privado do módulo; não está na lista nominal da v2 §5.
- **D-W3** `frontend/tests/checklists-preview.smoke.test.tsx` (+1): `activeRuns: 0` no fixture. Sem ele o editor abre travado ("ausente = travado", E3-10) e o teste do dock falha no `title` da paleta. Mesma natureza das ratificações E3-01/02 (pré-condição do contrato); fora da lista nominal.
- **D-W4** `app.css`: o bloco único tem, além das 6 classes que a E3b-05 nomeia, as outras regras do mesmo bloco "acréscimos desta maquete" da referência (`.ckb-pill--inuse`, `.ckb-ed-name`, `.ckb-ed-blockbar .ckb-ed-link`, estados `[aria-disabled="true"]` — sem o Publicar, para não mudar o "Publicar travado" de hoje —, `.ckb-ed-field-lock`) e três regras que traduzem o que a referência escreve em estilo inline (`.ckb-ed-grid--compacta` só ≥ 1181 px, `.ckb-ed-blockbar--destaque`, `.b22-col-agora`), mais `.ckb-ed-blockbar .ckb-ed-modal-btn:first-of-type` no lugar do espaçador inline. Cores: tokens e `color-mix` de tokens (âmbar = `--color-status-warning`); a premissa da E3b-05 de que `.ckb-ed-blockbar`/`.ckb-ed-modal` "já usam variáveis" não vale (usam hex), então o mapeamento foi para os tokens de `tokens.css`. 14 px/18 px/raio 12 px da referência viraram a escala (`--space-12`, `--space-16 + --space-2`, `--radius-6 × 2`).
- **D-W5** "Nova seção" fica **livre** com a trava (E3b-10: `schema.sections` é texto); a referência a desenha travada. O plano vence.
- **D-W6 — E3b-12 não executada.** Ela pede `assert.equal(status, 200)` em `tests/checklist-snapshot-dispatch.test.ts:78`, mas a E3b.4 e o mandato limitam o backend desta fatia a 3 arquivos ("No backend, fora desses 3 arquivos, nada"). Conflito entre requisito e permissão, registrado aqui para o orquestrador decidir (emenda de escopo de 1 linha ou outro dev).
- **D-W7** O comparador lista só o que difere (a referência mostra também linhas iguais, como contexto). O "N diferenças" é o número de linhas.
- **D-W8** Capturas pelo Playwright dirigindo o Edge, não pelo `--screenshot --virtual-time-budget=3000` cru: o modo de linha de comando não grava sessão nem aparência no `localStorage` nem clica para provocar o conflito. `vite` de desenvolvimento, não `preview`, porque a gravação da "outra pessoa" precisa da mesma instância do módulo simulado (no `preview` ela vem empacotada). Depois do drill de mutação o `vite` teve de ser reiniciado: o recarregamento a quente troca a instância do módulo e a "outra pessoa" passava a gravar noutra cópia.
- **D-W9** Mutação "tirar `userId` da chave" (CE-30) não executada: a chave é do hook do `B-APARENCIA-USUARIO` (`appearance.storage.ts`, fora do escopo) e tem testes próprios (`aparencia-storage`, `aparencia-hook`); o lock smoke cobre "a escolha de outro usuário não vaza".
- **D-W10** Os blocos da B usam o `KpiStatCard` da biblioteca, que não tem `aria-pressed` (a referência tem). Não mexi no componente compartilhado.
- **D-W11** O teste da E3b-08 é de forma (declarado); a prova de comportamento é a captura ao vivo `a-publicar-conflito`.
- **D-W12** Na C, o conflito do publicar/inativar também usa o comparador (E3b-08: "mesma apresentação por aparência"), sem "Sobrescrever".

**Pendências propostas (não gravadas em `pendencias.md`, fora do escopo desta fatia):** `P-CHK-EDITOR-GRADE-ESTREITA` (W6) e a decisão de D-W6.

### W8. Registro, commits, push e limpeza

- **Registro:** `pendencias.md` — `P-B-SAN3-22-FRONT-TOKEN-E-3-APARENCIAS` marcada RESOLVIDA no mesmo PR (E3-18) e `P-APARENCIA-POR-USUARIO` com a linha "editor de checklist registrado". Plano atualizado (v2 + E3 + Q5 + E3-bis) copiado para `docs/revisoes/SAN3/B-SAN3-22-plano.md`. `Kpis/**` intocado.
- **Commits** (Conventional Commits, sem atribuição): `506300f5` fix(checklists) classificador (E3b-01..03); `338f81dc` feat(checklists) fatia web; o commit final com o ajuste de tons da B, o guard da E3b-08, o registro, este relatório e as capturas. `git push origin fix/checklist-trava-versao`. PR **não** aberto.
- **Limpeza §C5:** `dev-san322w-pg` e `dev-san322w-redis` removidos, com os 2 volumes anônimos deles (criados 11:58:27/28Z; os outros 18 volumes soltos no Docker são de antes desta identidade e ficam reportados, não varridos); `frontend/dist/` e `dist/` removidos; `vite` da porta 47322 encerrado; scratchpad `web22/` desta identidade apagado ao fim (roteiros de captura preservados na pasta das capturas). Worktree e `frontend/node_modules` mantidos.
