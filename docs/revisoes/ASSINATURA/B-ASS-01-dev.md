# B-ASS-01 — relatório do desenvolvimento

- **executor:** `dev-ass01-sol` · Codex GPT-5.6 Sol · nível menor declarado · esforço medium · identidade nova
- **plano:** `planejador-assinatura` · Claude Fable 5.1 · correções de 31/10 e 02/11
- **ref inicial medida:** `origin/main = 18e54804882204e70e5b9a1a3905f9a76236027b`
- **ramo:** `feat/b-ass-01-cloud-billing-sem-markup`
- **skills aplicadas:** `ts-frontend-full` (preservar as camadas adapter → service → hook → tela) e `saas-multi-tenant` (guarda de RBAC/tenant; nenhuma rota, tabela ou permissão nova)
- **KPI:** congelado (§C7 item 8(5)); `Kpis/*` não será alterado.

## F0 — pré-voo, terreno e hipótese H-ROTAS-CC

**Comando.** `git rev-parse HEAD origin/main; git status --porcelain=v1; git show origin/main:tests/cloud-charge-routes.test.ts | grep -nE "createApp|createCloudChargesPlatformRouter"; df -h /c; powershell.exe ...FreeVirtualMemory; grep -Ec "^[[:space:]]*(test|it)\\(" <suítes-alvo>`

**Saída resumida.** HEAD e `origin/main` iguais em `18e54804`; árvore limpa; H-ROTAS-CC encontrou `createApp` nas linhas 119/153 e nenhum `createCloudChargesPlatformRouter`; 277 GB livres em disco; 14,7 GB de memória de commit livre; contagens iniciais: markup 12, rotas 2, core-saas 26, san3-04a 14, parity 3, san3-05 2, census 16, smoke Cloud Billing 16 e smoke-flow 22 (113 casos).

**Veredito.** Terreno liberado. A hipótese H-ROTAS-CC caiu pelo caminho previsto no plano: os 2 testes existentes passam a asserir 404. Não contradiz o plano e não exige pausa.

## F0 — dependências isoladas

**Comandos.** `npm ci` na raiz; `npm ci` em `frontend/`.

**Saída resumida.** Raiz: 326 pacotes instalados; frontend: 103 pacotes instalados. Sem junction/symlink. O npm informou vulnerabilidades preexistentes (raiz 42; frontend 9); nenhuma dependência ou lockfile foi alterado.

**Veredito.** Dependências próprias do worktree prontas.

## F0 — atualização da ref alvo

**Comando.** `git fetch origin main && git merge --ff-only origin/main`.

**Saída resumida.** `origin/main` avançou para `4f260796` apenas com `tests/kpi-painel-frescor.test.ts`; o ramo foi atualizado por fast-forward antes da autoria. A sonda H-ROTAS-CC foi repetida nessa ref e manteve o resultado previsto.

**Veredito.** Ref alvo fixada em `4f260796`; nenhuma contaminação da árvore da sessão.

## F1 — testes, vermelho-controle e backend

**Comando do vermelho.** `npm test -- tests/ass-01-markup-retirado.test.ts tests/ass-01-frontend-sem-markup.test.ts tests/navigation-menu.test.ts` sobre o código ainda equivalente à `origin/main` para os requisitos.

**Saída resumida.** 23 casos: 7 pass, 16 fail. Falharam as nove ausências de rota, os dois critérios do job, os dois critérios do menu e os dois critérios de frontend; a carga do app também expôs a necessidade de gerar o Prisma Client local após `npm ci`.

**Veredito.** Vermelho-controle confirmado antes do conserto; nenhuma mutação ficou verde.

**Implementação.** Retirados o mount de `createCloudChargesPlatformRouter`, o nome/handler `cloud-charges.calculate` e a dependência de menu em `platform:cloud-charges:read`. As nove rotas agora chegam ao 404 padrão. `tests/cloud-charge-routes.test.ts` passou a medir os dois 404 previstos por H-ROTAS-CC. A superfície SAN3 e o censo O6R07c foram reduzidos somente pelas vias removidas.

**Validação parcial.** `npm run check` e `npm --prefix frontend run check`: verdes. Critérios ASS-01 + navegação + rotas: 25/25 verdes. `o6r07c-census-guard`: 16/16 verdes. `san3-04a-matriz-x-catalogo-guard`: 14/14 verdes.

## F2/F3 — frontend sem markup e permissões do front

**Implementação.** Adapter, service, types e página deixaram de conhecer `cloud-charge`, regras, cobrança ou margem. `getCloudBilling` agrega quatro leituras; a tela conserva o padrão existente, os estados §7 e cinco indicadores honestos. App, aliases de autenticação, mock e navegação deixaram de pedir as quatro permissões órfãs.

**Comando.** `cd frontend && node --test --import tsx tests/san3-06b-cloud-billing.smoke.test.tsx tests/smoke-flow.test.tsx`.

**Saída resumida.** 38/38 pass, fail 0; a suíte dedicada manteve 16 casos e `smoke-flow` 22.

**Veredito.** R-RM-3/R-RM-4 verdes; nenhuma chamada ou rótulo de markup permanece no módulo.

## F4 — documentação e permissões órfãs

**Implementação.** Os 13 documentos receberam a marca explícita `SUPERADO por D-COBRANCA-ASSINATURA-FRANQUIA (2026-10-30)` sem apagar o texto histórico. As quatro chaves permanecem nos catálogos, comentadas como órfãs, e entram nominalmente em `ORFAS_ESPERADAS`.

**Comandos.** `npm test -- tests/san3-04a-matriz-x-catalogo-guard.test.ts`; contagem `SUPERADO por` nos 13 arquivos.

**Saída resumida.** 14/14 pass; cada um dos 13 arquivos contém ao menos uma marca de superação.

**Veredito.** R-RM-6/R-RM-8 verdes; nenhuma chave de permissão foi apagada.

## Provas de mutação literal

- **R-RM-1:** recolocado uma única vez (`âncora = 1`) o mount `router.use("/", createCloudChargesPlatformRouter())`; T-RM-1..9 ficaram vermelhos (9/9). Patch inverso aplicado; árvore limpa.
- **R-RM-2:** recolocado uma única vez (`âncora = 1`) o registro `cloud-charges.calculate`; T-RM-11 ficou vermelho. Patch inverso aplicado; árvore limpa.
- **R-RM-3:** a permissão do item voltou uma única vez para `platform:cloud-charges:read`; `navigation-menu` ficou com 3 vermelhos, incluindo os dois critérios direcionais. Patch inverso aplicado; árvore limpa.
- **R-RM-4:** recolocada uma única chamada a `/platform/cloud-charges/summary`; o guard textual ficou vermelho. Patch inverso aplicado; árvore limpa.

**Comandos.** Em cada mutação: contagem literal da âncora, suíte mínima correspondente, `apply_patch` inverso, `git status --porcelain` e `git diff --exit-code`.

**Veredito.** Todas as mutações ficaram vermelhas; todas foram restauradas sem `checkout`, `reset` ou `stash`; ao fim, `git status` vazio.

## F5 — PostgreSQL descartável

**Pré-condições.** Memória de commit livre: 42,45 GB (≥ 4 GB); porta `127.0.0.1:55432` livre; nenhum outro trabalho Docker deste bloco.

**Comandos.** `docker run --name devass01-pg ... -p 127.0.0.1:55432:5432 postgres:16`; `prisma migrate deploy`; `npm run db:seed`; `RBAC_DB_PARITY=1 npm test -- tests/san3-05-leituras-de-plataforma-db.test.ts tests/permission-catalog-db-parity.test.ts`.

**Saída resumida.** 120 migrações aplicadas no banco descartável. Após ajustar a expectativa nominal remanescente de 3 para 2 jobs FORCE, 14/14 testes passaram, fail 0, skipped 0.

**Veredito.** F5 verde em isolamento. `devass01-pg` removido com `docker rm -f`; nenhum container do bloco permaneceu. A demo, seus containers e suas portas não foram tocados.

## F6 — bateria integral e bloqueio de escopo

**Comandos.** `npm run check`; `npm run lint`; `npm test`; `npm run build`; `npm --prefix frontend run check`; `npm --prefix frontend run test:smoke`; `npm --prefix frontend run build`; regressões R-RM-7; `node scripts/migration-transaction-guard.mjs`; `git diff --check`.

**Saída resumida.** Check, lint e build backend verdes; guard de migrações: 120 migrações, 0 violações; regressões diretamente ligadas ao bloco: 102/102 pass, fail 0, skipped 0; smoke focado Cloud Billing + fluxo: 38/38 pass. O primeiro `npm test`, sem `REDIS_URL` explícita, resolveu indevidamente o default `127.0.0.1:6379` e terminou com 7 falhas; a execução foi substituída por serviço isolado em `127.0.0.1:56379`. Nenhum comando destrutivo foi dirigido à demo. Com PostgreSQL/Redis isolados, os casos Redis ficaram verdes; guards históricos de drill continuaram incompatíveis com Windows/Git Bash (`setsid` ausente, shim `node_modules/.bin/prisma` interpretado por Node e `rmdir` EBUSY). A comprovação Linux integral ficou pendente do CI.

O smoke frontend integral mediu 1636 testes: 1634 pass, 2 fail. Um vermelho é código morto ainda permitido (`calculateCloudChargesFromApi`); o outro é o guard `frontend/tests/san3-06b-navegacao-plataforma.test.ts`, T40, que exige literalmente 32 endpoints e mediu corretamente 23 após a retirada das 9 rotas.

**Veredito.** A correção de T40 exige alterar `frontend/tests/san3-06b-navegacao-plataforma.test.ts` (32 → 23), arquivo ausente do PERMITIDO exato do §4.1 e também da correção do §12. Não há ajuste honesto dentro do escopo que preserve ao mesmo tempo R-RM-1 e a contagem antiga.

## PAUSA 2026-11-04 06:33:04 UTC

Motivo obrigatório: para obter a bateria frontend com `fail 0`, é necessário tocar `frontend/tests/san3-06b-navegacao-plataforma.test.ts`, fora do PERMITIDO. O trabalho para aqui antes de push/PR. É necessária emenda escrita do plano autorizando a atualização nominal do T40 de 32 para 23 endpoints (e sua prova de mutação), seguida da revisão independente prevista em `D-EMENDA-ANTES-DO-CODIGO`.

Limpeza: o único container descartável `devass01-pg` foi removido; as portas altas 55432/56379 foram liberadas; nenhum `prune`, `down -v` ou container da demo foi acionado.

## RETOMADA P7 — emenda do T40/T44

**Insumos.** Relida a seção `## PAUSA`, a emenda do orquestrador de 04/11 e a crítica independente `crit-ass01e-parecer.md` (`APROVADO COM AJUSTES`). A crítica confirmou 9 rotas retiradas + 23 remanescentes = 32 e restringiu o ajuste do T44 às listas/sondas nominais, sem alterar o detector AST das linhas 56–167.

**Implementação autorizada.** O T40 passou a exigir nominalmente 23 endpoints. No T44, o piso foi atualizado de 5 escritas + 5 aliases para as 2 escritas + 2 aliases que continuam existindo; as três sondas que ainda citavam `calculate/create/update` foram remapeadas para `importCloudCostsFromApi`, `runCloudAllocation`, `importCloudCosts` e `runCloudAllocation`. A lista esperada de oito arquivos violadores e o algoritmo do guard ficaram intactos. Os seis símbolos mortos são `calculateCloudChargesFromApi`, `createCloudChargeRuleFromApi`, `updateCloudChargeRuleFromApi`, `calculateCloudCharges`, `createCloudChargeRule` e `updateCloudChargeRule`.

**Prova de 23 rotas.** `node scripts/san3-06b-endpoints-de-plataforma.mjs .` mediu as 23 rotas remanescentes: 5 de `cloud-cost-allocations`, 5 de `cloud-costs`, 3 de `cloud-usage`, 2 de overview/detalhe e 8 de tenants; com as 9 rotas retiradas, `23 + 9 = 32`.

**Mutação T40.** Recolocados uma única vez (`âncora = 1`) o import e `router.use("/", createCloudChargesPlatformRouter())`. O inventário voltou a `# endpoints sob /api/v1/platform = 32` e T40 ficou vermelho por esperar 23. O patch inverso foi aplicado; `git status --porcelain=v1` e `git diff --exit-code` ficaram vazios.

**Mutação T44.** A sonda de `PlatformOverviewPage.tsx` foi trocada uma única vez (`âncora = 1`) de `importCloudCostsFromApi` para a leitura `getCloudBillingFromApi`. T44 ficou vermelho: a lista real caiu de oito para sete arquivos, faltando exatamente `modules/platform/pages/PlatformOverviewPage.tsx`. Restaurada a sonda de escrita, T44 voltou a verde (1 pass, 0 fail, 8 skips pelo filtro de nome); árvore limpa.

**Validação oficial após a emenda.** `npm --prefix frontend run test:smoke`: 1636 tests, 1636 pass, 0 fail, 0 skipped. O carregamento isolado direto dos dois arquivos não é a forma oficial e expôs `React is not defined` nos vizinhos T41/T42; o comando oficial, que executa o produto na forma real, ficou integralmente verde.

## RETOMADA P7 — bateria final

**Ambiente isolado.** `devass01-redis` em `127.0.0.1:56379` e `devass01-pg` em `127.0.0.1:55432`; 120 migrações aplicadas. Todo `npm test` desta retomada recebeu `REDIS_URL=redis://127.0.0.1:56379`. A demo, `erp-postgres`, `erp-redis` e as portas 3000/5173/5432/6379 não foram tocados.

**Raiz.** `npm run check`, `npm run lint` e `npm run build`: verdes. A primeira suíte sem `DATABASE_URL` mediu 3772 testes e falhou fechado porque `core-saas-role-authority.test.ts` exige Prisma; o alvo isolado confirmou `DATABASE_URL is required`. Repetida contra o PostgreSQL descartável, a suíte mediu 4446 testes: 4436 pass, 8 fail, 2 skipped. Os vermelhos são os guards/drills Windows já registrados: `B-SAN3-05`, bootstrap SAN3-09, `traccar-event-migration-drill-db` e `work-order-invoicing-migration-drill-db`; nenhum pertence ao B-ASS-01. O aceite integral fica para o CI Linux, como determina a emenda.

**Frontend.** `npm --prefix frontend run check`, `npm --prefix frontend run test:smoke` e `npm --prefix frontend run build`: verdes; smoke 1636/1636, fail 0, skipped 0. A forma focada correta (`cd frontend && node --test --import tsx ...`) ficou 38/38; a tentativa fora do cwd do frontend foi descartada por carregar JSX sem a configuração real e produzir `React is not defined`.

**Regressões e guards.** R-RM-7 + F5 + censo: 103/103, fail 0, skipped 0, com `DATABASE_URL`, `REDIS_URL` e `RBAC_DB_PARITY=1`; guard de migração: 120 migrações, 0 violações; `git diff --check` verde; 13/13 documentos com a marca de superação; diff proibido (`prisma`, `cloud-charges`, `cloud-cost-allocation`, `cloud-usage`, `cloud-costs`, teste de markup) vazio.

## RETOMADA P7 — push, PR e CI

**Entrega remota.** Ramo `feat/b-ass-01-cloud-billing-sem-markup` publicado sem força; PR #498 aberto contra `main` com o título prescrito, as provas R-RM-1..8, a bateria, `KPI congelado (§C7 item 8(5))` e `Não fazer merge: junta completa`. Head julgado: `cf968510b084aa2eafe58ae776fcede0a7050027`.

**Check-runs.** Os dois disparos do mesmo head, runs `41817920953` e `41817961949`, concluíram verdes em `antivirus`, `authority-portal`, `backend`, `backend-postgres`, `docker`, `flutter`, `frontend` e `owner-portal`.

**Resumos TAP lidos dos logs.** Em ambos os runs: `backend` = 4454 testes, 4452 pass, 0 fail, 2 skipped; `backend-postgres` = 503 testes, 503 pass, 0 fail, 0 skipped; `frontend` = 1636 testes, 1636 pass, 0 fail, 0 skipped.

**Veredito.** A bateria integral Linux e todos os check-runs do head terminaram verdes. O PR permanece sem merge, entregue à pré-revisão independente.

PRONTO PARA PRÉ-REVISÃO cf968510b084aa2eafe58ae776fcede0a7050027 PR #498
