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

### W9. D-W6 fechada (ratificação do orquestrador, 2026-10-26 12:30Z)

O PERMITIDO passou a incluir `tests/checklist-snapshot-dispatch.test.ts`, só para a asserção da E3b-12 (plano, seção "Ratificação do orquestrador (2026-10-26 12:30Z)", copiado de novo para `docs/revisoes/SAN3/B-SAN3-22-plano.md`).

- **Mudança:** o PATCH "OUTRO" do teste `[reassign mantém o original]` (l.78) passou a ser lido em `edit` e ganhou `assert.equal(edit.status, 200)`. `git diff --numstat`: `2 1`.
- **Arquivo:** `node --test --import tsx tests/checklist-snapshot-dispatch.test.ts` → **15/15**, 0 falha, 0 pulo.
- **Mutação** (token defasado no mesmo sítio: `expectedUpdatedAt: "2020-01-01T00:00:00.000Z"`): `not ok 5 - [reassign mantém o original] reassign do despacho NÃO re-congela o snapshot` · `expected: 200` · `actual: 409` · 14 pass / **1 fail**. Restauro por cópia: SHA-256 `b3915f08` antes e depois; o arquivo volta a 15/15.
- **Vermelho-controle** (a classe que a E3b-12 fecha): a mesma mutação na versão de `d7483c28`, sem a asserção, passa **15/15** — a requisição virava 409 em silêncio. Restaurado (`b3915f08`).
- **Pendência nova `P-CHK-EDITOR-GRADE-ESTREITA`** (W6) gravada em `pendencias.md` (pré-existente; dono: orquestrador, para planejar; fecha quando a 924 px as colunas empilham sem sobrepor). `python agent-orchestration/controle/gerar-indice-pendencias.py` → `indice: 657 cabecalhos / 646 IDs | {'FECHADA': 156, 'ABERTA': 497, 'SEM-STATUS': 4}`; o índice estava defasado (651 cabeçalhos) e foi regenerado inteiro.

## Ciclo 2 (E4) — `dev-san322-c2-opus`

> **Papel:** DEV do ciclo 2, identidade NOVA `dev-san322-c2-opus`, Claude Opus (nível menor declarado; cobre o Codex sem limite até 19:20Z). Não achou, não planejou, não critica, não vota (§C7.4-bis). **Fonte única:** Emenda E4 (`B-SAN3-22-plano.md`, l.655+) e `R-B-SAN3-22-ciclo1.md`. **Terreno:** worktree `C:/Users/AMP/w-san322`, ramo `fix/checklist-trava-versao`, head de partida `4978f7d9`; `node_modules` (222) e `frontend/node_modules` (61) presentes; disco 11 GB livres; Docker: só `erp-postgres`/`erp-redis` (base viva, não tocada). Registro etapa a etapa (P1).

### C2-0. Partida
- `git log -1` → `4978f7d9`; `git status --short` vazio.
- Terreno: `dev-san322c2-pg` (postgres:16-alpine, `127.0.0.1:55532`, banco `dev_san322c2`, `TZ=UTC`) e `dev-san322c2-redis` (redis:7-alpine, `127.0.0.1:56479`); antes deles, `docker ps` fora de `erp-*` = 0. `npx prisma migrate deploy` → "All migrations have been successfully applied". Mutações por `scratchpad/c2mut/mut.mjs` (âncora única obrigatória; backup; restauro com SHA-256 conferido).

### C2-1. E4-01 — render do arquivado sem vistoria viva → 404
- **Vermelho-controle (serviço do objeto `44d9cbb3`; `git diff --name-only 44d9cbb3 4978f7d9` só toca registro):** caso novo `E3-20 (REST): arquivado → 404 nas 5 portas` → `not ok 9` · `render sem vistoria viva: 409 {"error":{"code":"CHECKLIST_NOT_PUBLISHED","reason":"checklist_not_published",…}}` · `expected: 404` · `actual: 409` (GET, PATCH, DELETE, publish e `createRun` já davam 404). Asserção nova do `CE-10-db` → `not ok 4 - CE-10-db` · `The validation function is expected to return "true". Received false`.
- **Conserto:** `checklist.service.ts`, corpo de `renderChecklist`: `if (template.status === "archived" && !servesActiveRun) → 404 CHECKLIST_NOT_FOUND/checklist_not_found` antes do ramo do 409 (+5/−0). Repositórios intocados.
- **Verde:** `checklist-template-lock.test.ts` 14/14; `CE-10-db` 1/1 (Postgres próprio).
- **M01a** (ramo do 404 neutralizado, `if (false && …)`): `not ok 9 - E3-20 (REST)` · `expected: 404` · `actual: 409`. Restauro `025f6db23a35` = `025f6db23a35`.
- **M01b** (`getTemplateForRun` filtrando `archived`, memória e Prisma): `not ok 4 - CE-10c` · `not ok 8 - CE-10a/10b/10c (REST)` (`expected: 200` · `actual: 404`); `not ok 4 - CE-10-db` (`ChecklistError`). Restauros `a194b198fe01` e `72870797c846` iguais.

### C2-2. E4-02 — CE-13 com a regra "URL em variável" (e E4-03 (ii), regra (iv) "resultado descartado")
- **Vermelho-controle (objeto):** `git show 44d9cbb3:tests/checklist-template-lock.test.ts` no lugar do arquivo, marcador da l.316 retirado (âncora única) → guard do **objeto** `# pass 1 · # fail 0` (verde); o guard **novo** (extraído do arquivo e rodado sobre os mesmos `tests/` por `scratchpad/c2mut/guardrun.mjs`) → `declarações=6 sítios-por-variável=26` e `V tests/checklist-template-lock.test.ts:316 DELETE sem expectedUpdatedAt (URL em variável url)`. Arquivo de volta (`29b6dba861f3`).
- **Guard novo sobre os `tests/` de `b08c7557`** (344 arquivos `.ts` extraídos por `git show b08c7557:<arquivo>`): **35 violações** (≥ 30): 10 PATCH + 15 publish + 1 publish concatenado + 4 `updateTemplate` direto sem token (= os 30 do dev) e 5 "resultado descartado"; `declarações=0` lá (as URLs em variável nasceram no bloco).
- **Conserto (só `checklistTokenCallSiteViolations` e o comentário dele; o CE-13 passa a imprimir a contagem):** (iii) para cada `const|let <nome> = \`/api/v1/tenant/checklists/${…}\`;`, do ponto da declaração ao próximo `\ntest(`, as chamadas `<helper>(<arg>, <nome>, {`, `` `${<nome>}/publish` `` e `` `${<nome>}?…` `` são recortadas a partir da chamada e julgadas pela régua de sempre; a declaração deixa de ser julgada como chamada pela regra literal. (iv) chamada mutante (literal, concatenada ou por variável) cuja linha começa em `await <helper>(` → `"<arquivo>:<linha> <método> com resultado descartado (status não afirmado)"`, salvo `resultado-descartado-proposital`. Residual declarado no comentário (URL como parâmetro de helper ou fora do bloco `test(`; linha quebrada antes da URL; `.tsx` fora).
- **Contagem no objeto consertado:** `CE-13: URL em variável: 8 declarações / 31 sítios mutantes`. **Explicação da diferença com o 6/26 da E4 (M-49):** os 26 sítios do planejador são exatamente os mesmos (l.122…323 iguais; 359/362/368/373/376/388/389/390 → +47 linhas = 406/409/415/420/423/435/436/437, listados pelo `guardrun.mjs --sites`); o caso novo da E4-01 acrescenta 2 declarações (`url`, `servedUrl`) e 5 sítios (l.370 DELETE, 373 PATCH, 374 DELETE, 375 publish, 384 DELETE).
- **Primeira execução do guard novo no ramo, antes do conserto da E4-03:** exatamente 3 violações (iv) — `checklist-routes.test.ts:925 PATCH`, `checklist-snapshot-dispatch.test.ts:43 POST /publish`, `o6r07c-census.ts:90 POST /publish (URL concatenada)`; nenhum sítio além dos 5 da E4 (R-E4-1 não se materializou).

### C2-3. E4-03 — os 5 sítios afirmam o status
- **Vermelho-controle (objeto, arquivo idêntico a `44d9cbb3`):** token defasado `"2000-01-01T00:00:00.000Z"` na l.43 de `checklist-snapshot-dispatch.test.ts` → `# pass 15 · # fail 0` (silencioso). Restauro `b3915f08ed68` igual.
- **Conserto:** `checklist-routes.test.ts:925` (`const inativado = …; assert.equal(inativado.status, 200)`), `:1015` no helper `createAndPublishChecklist` (`assert.equal(publish.status, 200)` antes de ler `body.data.id`; a E4 dizia `:1013`, a chamada começa na l.1015), `checklist-snapshot-dispatch.test.ts:42` (`assert.equal(edited.status, 200)`) e `:43` (`const republished = …; assert.equal(republished.status, 200)`), `tests/helpers/o6r07c-census.ts:90` (`const publicado = …; if (publicado.s !== 200) throw new Error("semente: publish falhou (…)")` — o helper não importa `assert`). numstat: routes 3/1, snapshot 3/1, census 2/1.
- **Verde:** `checklist-template-lock` + `checklist-routes` + `checklist-snapshot-dispatch` + `o6r07c-census-guard` → **76/76**, 0 falha, 0 pulo; `# CE-13: URL em variável: 8 declarações / 31 sítios mutantes`.

### C2-4. Drill E4-02/E4-03 (`scratchpad/c2mut/drill-0203.sh`)
| # | Mutação | Saída |
|---|---|---|
| M02a | marcador tirado da l.122 (PATCH, `url`) | `not ok 14 - CE-13` · `tests/checklist-template-lock.test.ts:122 PATCH sem expectedUpdatedAt (URL em variável url)` · restauro `29b6dba861f3` igual |
| M02b | marcador tirado da l.316 (DELETE, `url`) | `not ok 14 - CE-13` · `…:316 DELETE sem expectedUpdatedAt (URL em variável url)` · restauro igual |
| M02c | marcador tirado da l.423 (publish, `url`; a l.376 do objeto) | `not ok 14 - CE-13` · `…:423 POST /publish sem expectedUpdatedAt (URL em variável url)` · restauro igual |
| M02d | token tirado da forma concatenada `o6r07c-census.ts:90` | `not ok 14 - CE-13` · `tests/helpers/o6r07c-census.ts:90 POST /publish sem expectedUpdatedAt (URL concatenada)` · restauro `98d7b646b627` igual |
| M02e | token tirado da forma literal `work-order-checklists-sticky.test.ts:832` | `not ok 14 - CE-13` · `tests/work-order-checklists-sticky.test.ts:832 POST /publish sem expectedUpdatedAt` · restauro `69f1bb624178` igual |
| M03a | token defasado na l.43 (publish) | `not ok 2 - [imutável pós-edição] …` · `expected: 200` · `actual: 409` · 14/1 · restauro `f97105489ece` igual |
| M03b | l.43 volta a `await req(...)` | `not ok 14 - CE-13` · `tests/checklist-snapshot-dispatch.test.ts:44 POST /publish com resultado descartado (status não afirmado)` (l.44 no arquivo consertado: a asserção da l.42 entrou antes) · restauro igual |
| M03c | `o6r07c-census.ts:90` volta a `await chamar(...)` | `not ok 14 - CE-13` · `tests/helpers/o6r07c-census.ts:90 POST /publish com resultado descartado (status não afirmado) (URL concatenada)` · restauro igual |
- **`silent` nos 5 sítios** (token defasado `"2000-01-01T00:00:00.000Z"` em cada um, `scratchpad/c2mut/silent.sh`; complemento, fora da conta das 18): U1 `routes:925` → `not ok 15 - checklist P1 PR-03 …` (`expected: 200` · `actual: 409`); U2 helper `routes:1015` → `not ok 2`/`not ok 3` (`expected: 200` · `actual: 409`); U3 `snapshot:42` → `not ok 2 - [imutável pós-edição]` (`expected: 200` · `actual: 409`); U4 `snapshot:43` = M03a; U5 `census:90` → `not ok 1 - T0`/`not ok 2 - T1` (`Error: semente: publish falhou (409:CHECKLIST_TEMPLATE_STALE:template_changed_since_read)`). **5/5 visíveis.** Restauros iguais (`06ad12bb74e0`, `f97105489ece`, `98d7b646b627`).

### C2-5. E4-04 — CE-12-forma por sentença
- **Vermelho-controle (objeto):** mutante só-lock (tirar `tenant_id` só do `SELECT … FOR UPDATE` de `lockTemplateForMutation`, âncora única) com o `CE-12-forma` do objeto (`git show 44d9cbb3:tests/checklist-template-lock-db.test.ts`) → `# pass 1 · # fail 0` (verde); com o guard novo → `not ok 1 - CE-12-forma` · `sentença sem tenant_id — 5 sentenças cruas de checklist (l.534, 634, 828, 930, 943); reprovadas: l.930`. Restauro `72870797c846` igual.
- **Conserto (só o caso `CE-12-forma`, sem banco):** extrai cada `$queryRaw`/`$executeRaw` em template literal (genérico na mesma linha) que cita `checklist_templates`/`checklist_runs`; `INSERT` → `tenant_id` na lista de colunas; demais → `/WHERE[\s\S]*?\btenant_id\s*=/i` na própria sentença; exige ≥ 1 `FOR UPDATE` e ≥ 1 `FOR KEY SHARE` de `checklist_templates`, e o `FOR UPDATE` com `date_trunc('milliseconds', updated_at)`; a mensagem traz a contagem e as linhas. A regex antiga saiu.
- **Verde:** `# CE-12-forma: 5 sentenças cruas de checklist (l.534, 634, 828, 930, 944); reprovadas: nenhuma`.

### C2-6. E4-05 — token errado no CE-12-db e no CE-12 (REST)
- **Controle = o mutante** (o objeto já isola; declarado na E4). `CE-12-db`: contexto de A, id de B, token de B − 1 ms nas 3 portas → `null` e nunca `ChecklistTemplateStaleError`; snapshot de B igual ao de antes. `CE-12 (REST)`: B com o token errado → 404 `checklist_not_found` nas 3 portas, `updatedAt` de A intacto; controle positivo: A com o token certo → 200.
- **Contagem do CE-13 depois disto:** `8 declarações / 35 sítios mutantes` (+4: os 3 sítios do token errado e o PATCH do controle positivo, todos sobre `url`).

### C2-7. E4-06 — CE-5 publish e archive
- **Controle = o mutante** (o objeto serializa; declarado). Dois casos novos com o arnês `holdForUpdate` (segura `SELECT … FOR UPDATE`; `commit()` grava `name` e `updated_at = clock_timestamp()`): `publishTemplate`/`archiveTemplate` com o token lido ficam pendentes ≥ 300 ms, recebem `ChecklistTemplateStaleError` e o estado final é o do arnês (`{ name: "arnes-publish", status: "draft", published_at: null, deleted_at: null }`; no archive, `status: "published"`, `deleted_at: null`, `published_at` igual ao de antes).
- **CE-6:** a mutação "lançar o 409 depois do `deleteMany`" fica **declarada equivalente** pela própria E4-06/E4-11 (f), apensadas ao plano; não reescrevi o corpo do §8.2 do plano (texto do planejador; a cópia em `docs/` é literal).
- **Bateria `-db` deste arquivo:** 11/11 (9 + 2), 0 pulo.

### C2-8. Drill E4-04/E4-05/E4-06 (`scratchpad/c2mut/drill-040506.sh`, Postgres próprio)
| # | Mutação | Saída |
|---|---|---|
| M04a | `tenant_id` tirado só do `FOR UPDATE` (l.930) | `not ok 1 - CE-12-forma` · `… (l.534, 634, 828, 930, 943); reprovadas: l.930` · restauro `72870797c846` igual |
| M04b | `tenant_id` tirado só do `FOR KEY SHARE` (l.944) | `not ok 1 - CE-12-forma` · `… reprovadas: l.944` · restauro igual |
| M04c | `tenant_id` tirado só do `FOR UPDATE` do reopen (l.828) | `not ok 1 - CE-12-forma` · `… (l.534, 634, 828, 929, 943); reprovadas: l.828` · restauro igual |
| (extra) | `$queryRaw` novo de `checklist_runs` sem `tenant_id` | `not ok 1 - CE-12-forma` · `6 sentenças … (l.534, 634, 828, 930, 944, 945); reprovadas: l.944` (a sentença nova; o `FOR KEY SHARE` desceu para a l.945) · restauro igual — fora da conta das 18 |
| M05 | mutante só-lock (l.930), `CE-12-db` | `not ok 5 - CE-12-db` · `error: 'update: token errado em id de outra organização virou 409 stale'` · restauro igual |
| M06a | `publishTemplate` com `SELECT` sem `FOR UPDATE` (forma da C1) | `not ok 6 - CE-5-publish` · `error: 'Missing expected rejection (ChecklistTemplateStaleError).'` (publicou por cima do arnês) · restauro igual |
| M06b | `archiveTemplate` com `SELECT` sem `FOR UPDATE` | `not ok 7 - CE-5-archive` · `error: 'Missing expected rejection (ChecklistTemplateStaleError).'` · restauro igual |

### C2-9. E4-07 — chave irmã de `schema.sections`
- **Controle = o mutante** (o objeto já dá `field`; declarado). Dois casos novos na tabela CE-18: `schema.sectionsX` e `schema.sections2` → `field` (cada caso também afirma `schema.sections` com texto novo → `text`). `checklist-template-change.test.ts`: 31 → **33/33**.
- **M07** (`/^schema\.sections(?:\..*)?$/` → `/^schema\.sections/`, M5 da C2): `not ok 25 - CE-18: schema.sectionsX …` e `not ok 26 - CE-18: schema.sections2 …` · `expected: 'field'` · `actual: 'text'` · 31/2. Restauro `11b2c2b137f4` igual. (Primeira tentativa abortada sem efeito: o Git Bash converteu o argumento `/^schema…` em caminho; refeita com `MSYS_NO_PATHCONV=1`, restauro conferido.)

### C2-10. E4-10 — `API_CONTRACTS.md` 3.6.2
- **Ferramenta:** `contrato-c2.mjs` (anexo A deste relatório; o `contrato.mjs` da C2 não está no repositório, só o md5 dele na evidência): cruza, fato a fato, a seção `#### 3.6.2` até `### 3.7` com o código das portas (serviço, validador, controller, repositórios, `core-saas/routes/http.ts`) — "feito e não dito" e "dito e não feito" (todo `code`/`reason` citado na seção tem de existir no código).
- **Vermelho-controle (contrato do objeto):** `FEITO E NÃO DITO` em F1 (400 `BAD_REQUEST`/`invalid_request` do token), F2 (400 sem `componentKey`), F3 (`status: "draft"` com viva → 409 in-use), F4 (arquivado → 404 em todas as portas, render sem viva incluído), F5 (render com viva 200), F6 (`code` do 404), F7 (ordem do PATCH); F8 (stale) ok; `RESULTADO: 7 fato(s) fora de acordo`.
- **Conserto:** 5 linhas novas na 3.6.2 (+5/−0), uma por item (1)–(5) da E4-10; o versionamento `checklist_template_patch@2026-10-25.b-san3-22` mantido (o corpo da C2 o cita). Código intocado.
- **Verde:** `RESULTADO: 0 fato(s) fora de acordo; 0 token(s) dito(s) e não feito(s)` (12 tokens citados, todos com lastro).
- **M10** (linha (3), "Modelo arquivado responde 404…", removida): `FEITO E NÃO DITO F4 arquivado → 404 em todas as portas, render sem vistoria viva incluído` (e F5, que vive na mesma linha) · `RESULTADO: 2 fato(s) fora de acordo`. Restauro `998802631858` igual.

### C2-11. E4-08 — guard de forma da fiação do editor (C3-01)
- **Vermelho-controle (smoke do objeto, arquivo igual a `44d9cbb3`; `scratchpad/c2mut/drill-front.sh`):** m24b → `# tests 22 · # pass 22 · # fail 0`; m25c → 22/22; m27b → 22/22 (as três verdes no objeto). Restauros `960c5825033c` iguais.
- **Conserto (só `frontend/tests/checklists-editor-lock.smoke.test.tsx`, caso novo `C3-01 (forma)`; nada em `frontend/src`):** recorta o corpo de cada função por chaves balanceadas e afirma (a) `handleToggleStatus` tem `setConfirmInactivate(true)` e não tem `changeStatus("inactive")`, e a única chamada `changeStatus("inactive")` do arquivo está dentro do `onConfirm` do `<InactivateConfirmDialog`; (b) `handleOverwriteConflict` tem `await readLatestChecklist(checklist.id)` antes de `persistDraft({ base: fresh })` e não tem `fresh = checklist`; (c) o ramo `if (outcome.kind === "unknown")` de `handleWriteError` tem `setLock({ kind: "unknown" })`. Residual declarado no comentário do caso (SSR não clica; prova de comportamento = interceptação da C3; `P-FRONT-TESTE-DE-INTERACAO`).
- **Verde:** `checklists-editor-lock.smoke.test.tsx` **23/23**.

### C2-12. E4-09 — `assertMarker` por classe exata (C3-02)
- **Vermelho-controle (objeto):** m1g (`b22-faixa` → `b22-faixa-x` em `ChecklistEditorLockViews.tsx:81`) → 22/22 verde (substring). Restauro `f3ffe342b476` igual.
- **Premissa da E4-09 falseada por execução (registrada, D-C2-1):** a letra "marcador sem espaço = classe; com espaço = texto", implementada como está, deixa 3 dos marcadores vermelhos no objeto sem mutação nenhuma — `not ok 14` `"ckb-pill ckb-pill--inuse"` (A · travado), `not ok 15` `"pat-kpi pat-kpi--clickable"` (B · travado), `not ok 16` `"Salvo"` (C · conflito); `# pass 19 · # fail 3`. Duas são listas de classes com espaço e uma é texto sem espaço. O critério da própria E4-09 ("os marcadores continuam verdes") e a intenção ("classe exata") ficam de pé com a forma do marcador decidindo, não o espaço: **marcador cujas palavras são todas nomes de classe** (`/^[a-z][a-z0-9]*(?:--?[a-z0-9]+)+$/`) é procurado como token(s) inteiro(s) de **um mesmo** atributo `class`; o resto é texto no `visible(html)`, como está. Não é decisão de produto nem muda o que a tela faz; é a régua de um helper de teste. Fica declarada para a C3 julgar e para o orquestrador desfazer se quiser a letra (o que exigiria trocar os 3 marcadores na lista). Não parei o ciclo por isto: o arquivo está no PERMITIDO e o critério de aceite da E4-09 só se cumpre assim.
- **Contagem:** 49 chamadas de marcador no arquivo (A travado 7 · A conflito 5 · B travado 9 · B campos 7 · B versão 3 · B conflito 2 · C travado 11 · C conflito 5), todas verdes; a contagem "45 (3+12+12+6+5+7)" da E4 é a agrupada da C3 e não bate com a contagem de chamadas — anoto, sem mudar marcador nenhum.

### C2-13. Drill do front depois do conserto (`drill-front.sh`)
| # | Mutação | Saída |
|---|---|---|
| M08a (m24b) | `setConfirmInactivate(true)` → `void changeStatus("inactive")` em `handleToggleStatus` | `not ok 23 - C3-01 (forma) …` · `error: '(a) handleToggleStatus não abre o diálogo de inativar'` · 22/1 · restauro `960c5825033c` igual |
| M08b (m25c) | `const fresh = await readLatestChecklist(checklist.id)` → `const fresh = checklist` em `handleOverwriteConflict` | `not ok 23` · `error: '(b) handleOverwriteConflict não relê o modelo'` · restauro igual |
| M08c (m27b) | `setLock({ kind: "unknown" })` tirado do ramo unknown de `handleWriteError` | `not ok 23` · `error: '(c) o ramo unknown de handleWriteError não trava a tela'` · restauro igual |
| M09 (m1g) | `b22-faixa` → `b22-faixa-x` | `not ok 15 - CE-30 B · Analítica …` · `error: 'marcador da referência ausente na tela: "b22-faixa" (B · travado)'` · restauro `f3ffe342b476` igual |

### C2-14. E4-11 — registro
- **Vermelho-controle (M-53):** `grep -c "^## P-CHK-EDITOR-LEITURAS-B\|^## P-CHK-COMPONENTES-EMPATE-ORDER-INDEX\|^## P-FRONT-TESTE-DE-INTERACAO" pendencias.md` = 0 antes.
- **(a)(b)(c)** as três pendências gravadas no fim de `agent-orchestration/controle/pendencias.md` (+20/−0) → o mesmo `grep -c` = **3**. `P-FRONT-TESTE-DE-INTERACAO` cita os dois residuais (guard de forma do editor e alcance do CE-13), como a E4-11 (g) pede. Na primeira geração do índice ela saiu `CRÍTICA` (o gerador lê a primeira severidade que aparece no corpo, e o texto dizia "decisão crítica"); troquei a expressão por "pede junta de 5 + PD" e regenerei: `MÉDIA`, como o cabeçalho.
- **Índice:** `python agent-orchestration/controle/gerar-indice-pendencias.py` → `indice: 664 cabecalhos / 653 IDs | {'FECHADA': 158, 'ABERTA': 502, 'SEM-STATUS': 4}`; `pendencias-indice.md` +10/−7 (o índice versionado contava 661: além das 3 novas, nada mais mudou de linha — o +10/−7 são os totais e as 3 linhas).
- **(d)(e)(f)** D-W1, D-W2/D-W3 e o mutante equivalente do CE-6 estão ratificados no texto da E4 (E4-06 e E4-11), apensado ao plano; **(h)** plano recopiado: `cp …/planos/B-SAN3-22-plano.md docs/revisoes/SAN3/B-SAN3-22-plano.md` → `git diff --numstat` **+93/−0** (só a Emenda E4, apensada).

### C2-15. Escopo
- `git diff --name-only 4978f7d9..HEAD` (só os commits deste dev): `API_CONTRACTS.md`, `agent-orchestration/controle/pendencias{,-indice}.md`, `docs/revisoes/SAN3/B-SAN3-22-{dev,plano}.md`, `frontend/tests/checklists-editor-lock.smoke.test.tsx`, `src/modules/checklists/checklist.service.ts` (só `renderChecklist`, +5/−0), `tests/checklist-{routes,snapshot-dispatch,template-change,template-lock-db,template-lock}.test.ts`, `tests/helpers/o6r07c-census.ts` — tudo no PERMITIDO da E4.2. (`44d9cbb3..4978f7d9` é o commit do orquestrador com votos, evidências e o `R-`.)
- PROIBIDO no ciclo 2 (`git diff --name-only 44d9cbb3..HEAD -- mobile/ prisma/ src/modules/core-saas/ frontend/src/ src/database/ .github/ Kpis/ …checklist-prisma.repository.ts …checklist.repository.ts package-lock.json frontend/package-lock.json`): **vazio**. Em `frontend/src` o PR segue só com os 12 arquivos que já estavam no objeto. `git diff --check 44d9cbb3..HEAD`: limpo. Nenhuma dependência nova.

### C2-16. As mutações da E4 (consolidado; cada uma vermelha pelo caso indicado e restaurada com o SHA conferido)

| # | Req. | Mutação | Caso vermelho (linha do `not ok`) | Restauro (SHA-256, 12 hex) |
|---|---|---|---|---|
| 1 | E4-01 | ramo do 404 neutralizado em `renderChecklist` (`if (false && …)`) | `not ok 9 - E3-20 (REST): arquivado → 404 nas 5 portas` · `render sem vistoria viva: 409` · `expected: 404` · `actual: 409` | `025f6db23a35` = `025f6db23a35` |
| 2 | E4-01 | `getTemplateForRun` filtrando `archived` (memória e Prisma) | `not ok 4 - CE-10c` · `not ok 8 - CE-10a/10b/10c (REST)` (`expected: 200` · `actual: 404`) · `not ok 4 - CE-10-db` (`ChecklistError`) | `a194b198fe01`, `72870797c846` iguais |
| 3 | E4-02 | marcador tirado da l.122 (PATCH, URL em variável) | `not ok 14 - CE-13` · `tests/checklist-template-lock.test.ts:122 PATCH sem expectedUpdatedAt (URL em variável url)` | `29b6dba861f3` igual |
| 4 | E4-02 | marcador tirado da l.316 (DELETE, URL em variável) | `not ok 14 - CE-13` · `…:316 DELETE sem expectedUpdatedAt (URL em variável url)` | `29b6dba861f3` igual |
| 5 | E4-02 | marcador tirado da l.423 (publish, URL em variável; l.376 do objeto) | `not ok 14 - CE-13` · `…:423 POST /publish sem expectedUpdatedAt (URL em variável url)` | `29b6dba861f3` igual |
| 6 | E4-02 | token tirado da forma concatenada `o6r07c-census.ts:90` | `not ok 14 - CE-13` · `tests/helpers/o6r07c-census.ts:90 POST /publish sem expectedUpdatedAt (URL concatenada)` | `98d7b646b627` igual |
| 7 | E4-02 | token tirado da forma literal `work-order-checklists-sticky.test.ts:832` | `not ok 14 - CE-13` · `tests/work-order-checklists-sticky.test.ts:832 POST /publish sem expectedUpdatedAt` | `69f1bb624178` igual |
| 8 | E4-03 | token defasado na l.43 de `checklist-snapshot-dispatch` | `not ok 2 - [imutável pós-edição] …` · `expected: 200` · `actual: 409` | `f97105489ece` igual |
| 9 | E4-03 | l.43 volta a `await req(...)` (resultado descartado) | `not ok 14 - CE-13` · `tests/checklist-snapshot-dispatch.test.ts:44 POST /publish com resultado descartado (status não afirmado)` | `f97105489ece` igual |
| 10 | E4-03 | `o6r07c-census.ts:90` volta a `await chamar(...)` | `not ok 14 - CE-13` · `tests/helpers/o6r07c-census.ts:90 POST /publish com resultado descartado (status não afirmado) (URL concatenada)` | `98d7b646b627` igual |
| 11 | E4-04 | `tenant_id` só do `FOR UPDATE` (l.930) | `not ok 1 - CE-12-forma` · `reprovadas: l.930` | `72870797c846` igual |
| 12 | E4-04 | `tenant_id` só do `FOR KEY SHARE` (l.944) | `not ok 1 - CE-12-forma` · `reprovadas: l.944` | `72870797c846` igual |
| 13 | E4-04 | `tenant_id` só do `FOR UPDATE` do reopen (l.828) | `not ok 1 - CE-12-forma` · `reprovadas: l.828` | `72870797c846` igual |
| 14 | E4-05 | mutante só-lock (l.930), `CE-12-db` | `not ok 5 - CE-12-db` · `update: token errado em id de outra organização virou 409 stale` | `72870797c846` igual |
| 15 | E4-06 | `publishTemplate` com `SELECT` sem `FOR UPDATE` | `not ok 6 - CE-5-publish` · `Missing expected rejection (ChecklistTemplateStaleError).` | `72870797c846` igual |
| 16 | E4-06 | `archiveTemplate` com `SELECT` sem `FOR UPDATE` | `not ok 7 - CE-5-archive` · `Missing expected rejection (ChecklistTemplateStaleError).` | `72870797c846` igual |
| 17 | E4-07 | `/^schema\.sections(?:\..*)?$/` → `/^schema\.sections/` | `not ok 25 - CE-18: schema.sectionsX …` e `not ok 26 - … sections2 …` · `expected: 'field'` · `actual: 'text'` | `11b2c2b137f4` igual |
| 18 | E4-08 | m24b (`void changeStatus("inactive")` em `handleToggleStatus`) | `not ok 23 - C3-01 (forma)` · `(a) handleToggleStatus não abre o diálogo de inativar` | `960c5825033c` igual |
| 19 | E4-08 | m25c (`fresh = checklist`) | `not ok 23 - C3-01 (forma)` · `(b) handleOverwriteConflict não relê o modelo` | `960c5825033c` igual |
| 20 | E4-08 | m27b (sem `setLock({ kind: "unknown" })`) | `not ok 23 - C3-01 (forma)` · `(c) o ramo unknown de handleWriteError não trava a tela` | `960c5825033c` igual |
| 21 | E4-09 | m1g (`b22-faixa` → `b22-faixa-x`) | `not ok 15 - CE-30 B · Analítica …` · `marcador da referência ausente na tela: "b22-faixa" (B · travado)` | `f3ffe342b476` igual |
| 22 | E4-10 | linha (3) "Modelo arquivado responde 404…" tirada da 3.6.2 | `contrato-c2.mjs`: `FEITO E NÃO DITO F4 arquivado → 404 em todas as portas, render sem vistoria viva incluído` · `RESULTADO: 2 fato(s) fora de acordo` | `998802631858` igual |

**Conta:** a E4.3 escreve "18 mutações", mas as parcelas que ela mesma lista somam 20 (E4-02 tem 5 e E4-08 tem 3), e a coluna de mutação da E4.1 pede ainda a 3ª da E4-03 (`o6r07c-census.ts:90` descartado) e a da E4-10. Executei as **22**, todas vermelhas pelo caso indicado, todas restauradas com o SHA conferido. Fora da conta: o `$queryRaw` novo sem `tenant_id` (E4-04, vermelho, C2-8) e o `silent` dos 5 sítios (E4-03, 5/5 visíveis, C2-4).

**Vermelhos-controle no objeto (`44d9cbb3`), um por requisito:** E4-01 `not ok 9` (409 no render sem viva) e `not ok 4 - CE-10-db`; E4-02 guard do objeto verde sob a mutação da l.316 e guard novo sobre `b08c7557` = **35** (≥ 30); E4-03 l.43 defasada = 15/15 verde; E4-04 regex do objeto verde sob o mutante só-lock; E4-05, E4-06, E4-07 controle = o mutante (declarado na E4); E4-08 m24b/m25c/m27b = 22/22 verde; E4-09 m1g = 22/22 verde; E4-10 `RESULTADO: 7 fato(s) fora de acordo`; E4-11 `grep -c` = 0.

### C2-17. Bateria do ciclo 2 (execução real neste worktree; Postgres/Redis descartáveis `dev-san322c2-*`)
| Comando | Resultado |
|---|---|
| `npm run check` · `npm run lint` · `npm run build` | exit 0 · 0 · 0 |
| `node --test --import tsx` nos 6 arquivos sem banco (`checklist-template-change`, `checklist-editor-classifier-parity`, `checklist-template-lock`, `checklist-routes`, `checklist-snapshot-dispatch`, `o6r07c-census-guard`) | **127/127**, 0 falha, 0 pulo; `# CE-13: URL em variável: 8 declarações / 35 sítios mutantes` |
| `-db` (`checklist-template-lock-db`, `-template-prisma-db`, `-routes-db`, `-run-lifecycle-db`, `-run-create-concurrency-db`), `CORE_SAAS_PERSISTENCE=prisma`, ×3 | **28/28 ×3** (26 do ciclo 1 + `CE-5-publish` + `CE-5-archive`), 0 falha, **0 pulo**, 0 cancelado |
| `npm test` na forma do job `backend` (`DATABASE_URL`/`REDIS_URL` descartáveis, `CORE_SAAS_PERSISTENCE=memory`) | 362 arquivos · **4146 testes · pass 4134 · fail 10 · skip 2**; exit 1 pelas falhas e pelo piso de denominador (`traccar-event-migration-drill-db`). **0 falha de checklist**; 75 linhas `ok … CE-` no TAP. As falhas: `san3-05-runtime-role-guard-db` (`setsid: ausente`), `san3-09` T2 (spawn), `traccar-event-migration-drill-db` (`EBUSY … rmdir`), `traccar-position-ingestion-db` ×2 (tempo esgotado → 503) e `o6r07c-b-scope-db` `[atômica · web]` (`Transaction API error … timeout … 5000 ms … 5043 ms passed`) — a última é nova na lista; rodou junto com o `build`/`test:smoke` do front. **Rodados sozinhos:** `o6r07c-b-scope-db` **13/13**, `traccar-position-ingestion-db` **22/22**. As outras são as classes do Windows já medidas no ciclo 1 (R4/W7). A CI é Linux. |
| `npm --prefix frontend run check` · `test:smoke` · `build` | exit 0 · **1391/1391** (0 falha, 0 pulo, 0 cancelado) · exit 0 (`✓ built`) |
| `node scripts/migration-transaction-guard.mjs` | `migrações: 117 · anteriores: 112 · novas: 5 · violações: 0` |
| `git diff --name-only 44d9cbb3..HEAD -- mobile/ prisma/ src/modules/core-saas/ frontend/src/ src/database/ .github/ Kpis/ …` | vazio (C2-15) |
| `git diff --check 44d9cbb3..HEAD` | limpo |
### C2-18. Divergências declaradas (para a junta do ciclo 2)
- **D-C2-1 — E4-09, régua do `assertMarker`:** a letra ("sem espaço = classe; com espaço = texto") falseada por execução (3 marcadores vermelhos sem mutação); implementei pela forma do marcador (C2-12). Mesma intenção, mesmo critério; a C3 julga.
- **D-C2-2 — contagem das mutações:** "18" no mandato/E4.3; as parcelas da própria E4 somam 20, e a E4.1 pede mais 2 (3ª da E4-03 e a da E4-10). Executadas as 22 (C2-16).
- **D-C2-3 — números do CE-13:** 6/26 da E4 → 8/35 no ramo; os 26 do planejador conferem linha a linha, e os 9 sítios a mais (2 declarações) são dos casos que este ciclo acrescentou (E4-01: 5; E4-05: 4) (C2-2, C2-6).
- **D-C2-4 — linhas:** o publish do helper de `checklist-routes.test.ts` está na l.1015, não na l.1013 da E4; a l.376 do objeto (publish por variável) é a l.423 no ramo (+47 do caso novo da E4-01).
- **D-C2-5 — `o6r07c-census.ts:90`:** o helper não importa `assert`; usei a alternativa que a E4-03 dá ("lançar com a mensagem 'semente: publish falhou'").
- **D-C2-6 — E4-10:** o `contrato.mjs` da C2 não está no repositório; o cruzamento foi feito com ferramenta própria (`contrato-c2.mjs`, anexo A), fato a fato, nos dois sentidos.
- **D-C2-7 — CE-6 no §8.2:** a declaração do mutante equivalente está no texto da E4 apensado ao plano; não editei o corpo do §8.2 (texto do planejador, copiado literal).
- **D-C2-8 — regra (iv):** a E4-03 escreve `^\s*await\s+\w+\(`; usei `^\s*await\s+[\w.]+\(` (aceita também `obj.metodo(`), superconjunto da letra.

### C2-19. Commits, push e limpeza
- **Commits** (Conventional Commits, sem atribuição; `Kpis/**` intocado): `896eee7c` fix(checklists) E4-01..03 · `280ed01d` test(checklists) E4-04..06 · `4437b18b` test(checklists) E4-07 · `01d9f3cd` docs(contrato) E4-10 · `b305443a` test(checklists) E4-08/E4-09 · `c0e477b7` docs(registro) E4-11 · o commit deste relatório. `git push origin fix/checklist-trava-versao` (sem force); PR não tocado além do push.
- **Limpeza §C5:** `dev-san322c2-pg` e `dev-san322c2-redis` removidos com os volumes (`docker rm -f -v`; `docker ps -a | grep dev-san322c2` = 0); `frontend/dist/` e `dist/` removidos; backups `*.c2mut.bak` = 0 (todo restauro conferido por SHA); `git status` limpo antes do commit final; scratchpad `c2mut/` desta identidade apagado ao fim (as ferramentas estão no anexo A). Worktree, `node_modules` e `frontend/node_modules` mantidos. Base viva (5432/6379), `erp-*` e as portas 3000/5173/5050/8899 não tocadas. Disco: 10 GB livres ao fim (piso 7 GB).
### Anexo A — ferramentas do dev do ciclo 2 (para a junta re-executar; o scratchpad é apagado na limpeza)

**`mut.mjs`** — aplica/restaura mutação por âncora única, com SHA-256 antes/depois

```js
// uso: node mut.mjs apply <arquivo> <ancora-json> <subst-json>   |  node mut.mjs restore <arquivo>
import fs from "node:fs"; import crypto from "node:crypto";
const [, , op, file, a, b] = process.argv;
const bak = file + ".c2mut.bak";
const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex").slice(0, 12);
if (op === "apply") {
  if (fs.existsSync(bak)) { console.error("backup já existe"); process.exit(2); }
  const src = fs.readFileSync(file, "utf8");
  const anchor = JSON.parse(a), repl = JSON.parse(b);
  const n = src.split(anchor).length - 1;
  if (n !== 1) { console.error(`âncora ocorre ${n}x`); process.exit(3); }
  fs.copyFileSync(file, bak);
  fs.writeFileSync(file, src.replace(anchor, () => repl));
  console.log(`MUT aplicada ${file} sha antes=${sha(bak)} depois=${sha(file)}`);
} else if (op === "restore") {
  const before = sha(bak); fs.copyFileSync(bak, file); fs.unlinkSync(bak);
  const after = sha(file);
  console.log(`RESTAURO ${file} sha=${after} ${before === after ? "IGUAL" : "DIFERENTE!"}`);
  if (before !== after) process.exit(4);
}
```

**`guardrun.mjs`** — roda o guard CE-13 EXATO do arquivo de teste sobre outra raiz (ex.: tests/ de b08c7557 extraídos por git show)

```js
// guardrun.mjs <arquivo-do-guard> <raiz-dos-testes> [--sites]
// Extrai listFiles + checklistTokenCallSiteViolations do arquivo de teste (o guard EXATO do arquivo) e o roda
// sobre outra raiz. Remove só as anotações de tipo para rodar em JS puro.
import fs from "node:fs";
import path from "node:path";
const [, , guardFile, root, flag] = process.argv;
const src = fs.readFileSync(guardFile, "utf8").replace(/\r\n/g, "\n");
const grab = (start, endMark) => {
  const i = src.indexOf(start);
  if (i < 0) throw new Error("ausente: " + start);
  const j = src.indexOf(endMark, i);
  return src.slice(i, j + endMark.length);
};
let code = grab("function listFiles(", "\n  return out;\n}") + "\n" + grab("function checklistTokenCallSiteViolations(", "\n  return { violations, declarations, variableSites };\n}");
code = code
  .replace(/\(root: string\): TokenGuardReport/, "(root)")
  .replace(/\(dir: string, accept: \(name: string\) => boolean\): string\[\]/, "(dir, accept)")
  .replace(/const out: string\[\] = \[\];/, "const out = [];")
  .replace(/const violations: string\[\] = \[\];/, "const violations = [];")
  .replace(/new Set<number>\(\)/, "new Set()")
  .replace(/\(index: number\)/g, "(index)")
  .replace(/\(start: number, end: number, method: string, window: string, form: string\)/, "(start, end, method, window, form)")
  .replace(/\(name\) =>/g, "(name) =>")
  .replace("variableSites += 1;", "variableSites += 1; SITES.push(file + \":\" + lineOf(index) + \" \" + method);");
const SITES = [];
const fn = new Function("fs", "path", "SITES", code + "\nreturn checklistTokenCallSiteViolations;")(fs, path, SITES);
const cwd = process.cwd();
process.chdir(root);
const report = fn("tests");
process.chdir(cwd);
console.log(`declarações=${report.declarations} sítios-por-variável=${report.variableSites} violações=${report.violations.length}`);
for (const v of report.violations) console.log("  V " + v);
if (flag === "--sites") for (const s of SITES) console.log("  S " + s);
```

**`contrato-c2.mjs`** — cruzamento API_CONTRACTS.md 3.6.2 × código

```js
// contrato-c2.mjs <raiz-do-repo> — cruzamento API_CONTRACTS.md 3.6.2 × código (ferramenta do dev do ciclo 2;
// não é o contrato.mjs da C2, que não está no repositório). Fato a fato: "feito e não dito" = o código tem a
// evidência e a seção não diz; "dito e não feito" = todo code/reason citado na seção existe no código.
import fs from "node:fs";
import path from "node:path";
const root = process.argv[2] ?? ".";
const read = (p) => fs.readFileSync(path.join(root, p), "utf8").replace(/\r\n/g, "\n");
const contracts = read("API_CONTRACTS.md");
const start = contracts.indexOf("#### 3.6.2");
const end = contracts.indexOf("\n### 3.7", start);
const section = contracts.slice(start, end);
const code = [
  "src/modules/checklists/checklist.service.ts",
  "src/modules/checklists/checklist.validator.ts",
  "src/modules/checklists/checklist.controller.ts",
  "src/modules/checklists/checklist.repository.ts",
  "src/modules/checklists/checklist-prisma.repository.ts",
  "src/modules/core-saas/routes/http.ts",
].map(read).join("\n");
const service = read("src/modules/checklists/checklist.service.ts");
const facts = [
  ["F1 400 BAD_REQUEST/invalid_request p/ token ausente ou não-ISO",
    /expectedUpdatedAtSchema = z\.string\(\)\.datetime/.test(code) && /code: "BAD_REQUEST",\s*reason: "invalid_request"/.test(code),
    /400[^\n]*`BAD_REQUEST`[^\n]*`invalid_request`[^\n]*expectedUpdatedAt/.test(section) || /expectedUpdatedAt[^\n]*400[^\n]*`BAD_REQUEST`[^\n]*`invalid_request`/.test(section)],
  ["F2 400 p/ components[] sem componentKey",
    /componentKey/.test(code),
    /componentKey[^\n]*400|400[^\n]*componentKey/.test(section)],
  ["F3 status draft com vistoria viva → 409 template_has_active_runs",
    /"CHECKLIST_TEMPLATE_IN_USE", "template_has_active_runs"/.test(service),
    /`status: "draft"`[^\n]*409[^\n]*`template_has_active_runs`/.test(section)],
  ["F4 arquivado → 404 em todas as portas, render sem vistoria viva incluído",
    /template\.status === "archived" && !servesActiveRun\) \{\s*throw new ChecklistError\(404, "CHECKLIST_NOT_FOUND"/.test(service),
    /[Aa]rquivado[^\n]*404[^\n]*render[^\n]*sem vistoria viva/.test(section)],
  ["F5 render do arquivado com vistoria viva segue 200",
    /servesActiveRun/.test(service),
    /render[^\n]*com vistoria viva[^\n]*200/.test(section)],
  ["F6 code do 404 = CHECKLIST_NOT_FOUND/checklist_not_found",
    /404, "CHECKLIST_NOT_FOUND", "checklist_not_found"/.test(service),
    /404[^\n]*`CHECKLIST_NOT_FOUND`[^\n]*`checklist_not_found`/.test(section)],
  ["F7 ordem do PATCH: 400 → 409 porta única → trava → 404/409 stale → classificação → in-use",
    /assertTemplateStatusUsesDedicatedEndpoint\(input\.status\);[\s\S]*?this\.repository\.updateTemplate\(/.test(service),
    /[Oo]rdem[^\n]*400[^\n]*409[^\n]*porta única[^\n]*trava[^\n]*404[^\n]*stale[^\n]*classifica[^\n]*in-use|[Oo]rdem[^\n]*400[^\n]*porta única[^\n]*trava[^\n]*404[^\n]*classifica/.test(section)],
  ["F8 stale 409 CHECKLIST_TEMPLATE_STALE/template_changed_since_read",
    /"CHECKLIST_TEMPLATE_STALE", "template_changed_since_read"/.test(service),
    /`CHECKLIST_TEMPLATE_STALE` \/ `template_changed_since_read`/.test(section)],
];
let missing = 0;
for (const [name, inCode, inContract] of facts) {
  const verdict = inCode && inContract ? "ok" : inCode && !inContract ? "FEITO E NÃO DITO" : !inCode && inContract ? "DITO E NÃO FEITO" : "ausente nos dois";
  if (verdict !== "ok") missing += 1;
  console.log(`${verdict.padEnd(18)} ${name}`);
}
const tokens = [...new Set(section.match(/`([A-Z][A-Z_]{3,}|[a-z]+(?:_[a-z]+)+)`/g) ?? [])].map((t) => t.slice(1, -1));
const unbacked = tokens.filter((t) => !code.includes(t));
console.log(`tokens citados na 3.6.2: ${tokens.length}; sem lastro no código: ${unbacked.length ? unbacked.join(", ") : "nenhum"}`);
console.log(`RESULTADO: ${missing} fato(s) fora de acordo; ${unbacked.length} token(s) dito(s) e não feito(s)`);
process.exit(missing + unbacked.length ? 1 : 0);
```

Os roteiros `drill-0203.sh`, `drill-040506.sh`, `drill-front.sh` e `silent.sh` são a sequência `mut.mjs apply` → comando → `mut.mjs restore` com as âncoras e substituições que as tabelas C2-4, C2-8 e C2-13 descrevem.
