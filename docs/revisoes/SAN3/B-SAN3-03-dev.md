# B-SAN3-03 — Relatório do DEV

- **Identidade:** `dev-san303-sol`
- **Modelo:** Codex GPT-5.6 Sol, nível menor declarado
- **Papel:** desenvolvimento; não planejou e não revisou
- **Branch/worktree:** `fix/cloud-billing-exato` · `C:/Users/thiag/w-san303`
- **Base medida:** `origin/main@0fda595a9cb37d2d75abd45ef23eacc5dc56fea8`
- **Plano:** `B-SAN3-03-plano.md` + Emenda 1 (prevalece), conferida por `conf-emenda-san303.md` e
  `rev-san303b.md`
- **Fronteira:** nenhuma migração; recomendações adotadas são padrão, não decisão do dono

## RETOMADA 0

- **Head inicial:** `0fda595a9cb37d2d75abd45ef23eacc5dc56fea8`
- **Medição de retomada:** worktree e ramo não existiam; remoto não tinha `fix/cloud-billing-exato`.
- **Compatibilidade da emenda:** `origin/main` coincide com a ref `0fda595a` da conferência final; diff dos
  caminhos relevantes desde essa ref é vazio.
- **Disco:** 24 GB livres, acima da parada de 7,5 GB.
- **Dependências:** `npm ci` próprio, exit 0; 326 pacotes instalados; nenhuma junction; lockfile sem diff.
- **Feito:** contratos, skills, plano, emenda e revisões lidos; comando do bloco criado com a Emenda 1.
- **Falta nesta fatia:** baseline `npm test`, `npm run check`, `git diff --check`, commit e push.
- **Próximo comando exato:** `npm test`
- **Arquivos meio-escritos:** nenhum; os dois arquivos novos desta F0 estão completos.

### Baseline executado

1. `npm test` após o primeiro `npm ci` — **exit 1**: `tsx` ainda não estava disponível; nenhum teste
   funcional carregou. Não contado como baseline de produto.
2. `npm ci --include=dev` — **exit 0**: 326 pacotes; `npm ls tsx` confirmou `tsx@4.22.3`.
3. `npm test` — **exit 1**: 3.326 testes, 2.294 passes, 928 falhas e 104 skips; causa comum medida:
   Prisma Client ainda não gerado (`@prisma/client` sem export `Prisma`).
4. `npm run db:generate` sem URL — **exit 1**: o `prisma.config.ts` exige `DATABASE_URL` até para gerar.
5. `DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:55432/san303?schema=public" npm run db:generate`
   — **exit 0**; a URL é apenas a do cluster descartável reservado e não houve conexão nem Docker na F0.
6. `npm test` sem `DATABASE_URL` — **exit 1**: 3.504 testes, 3.396 passes, 1 falha, 107 skips.
   O único arquivo sem registrar teste foi `tests/core-saas-role-authority.test.ts`.
7. `npm test -- tests/core-saas-role-authority.test.ts` — **exit 1**, reprodução mínima:
   `src/database/prisma.ts:12 Error: DATABASE_URL is required to initialize Prisma Client`; 1 teste de
   arquivo, 0 passes, 1 falha, e o piso de denominador acusa o arquivo silencioso.

## PAUSA 01:25:33Z

- **Head medido:** `0fda595a9cb37d2d75abd45ef23eacc5dc56fea8` (mudanças da F0 ainda não commitadas ao
  iniciar esta seção).
- **Motivo de parada:** a Emenda 1/F0 manda `npm test` em memória e marca F0 como sem Docker. Na ref revisada,
  a suíte integral não pode ficar verde sem `DATABASE_URL`, porque `core-saas-role-authority.test.ts` importa
  `src/database/prisma.ts` antes de registrar teste. Definir a variável para a suíte integral também arma as
  suítes `-db`, que então exigem o Postgres; subir o Postgres na F0 contrariaria a tabela obrigatória de Docker.
- **Emenda × medido:** incompatibilidade reproduzida; pela ordem do orquestrador, o dev não escolhe uma saída
  silenciosa e não inicia F1.
- **Feito:** worktree/branch, dependências próprias, Prisma Client local, comando do bloco, relatório e
  reprodução mínima do bloqueio.
- **Falta:** decisão/emenda que escolha uma destas formas: autorizar Postgres descartável também na F0;
  corrigir o arnês/suíte em bloco dono para o modo memória; ou substituir o baseline integral da F0 por uma
  bateria explicitamente autorizada que não fabrique verde.
- **Próximo comando exato após a emenda:** `npm test -- tests/core-saas-role-authority.test.ts`.
- **Arquivos meio-escritos:** nenhum código de produto/teste; somente os dois documentos completos da F0.
- **Escopo:** zero diff em `prisma/**`, `migrations/**`, `Kpis/**`, lockfiles e código de produto.

### Retomada e fechamento da F0

- **Emenda aplicada:** a autorização expressa do orquestrador para PostgreSQL descartável na F0 foi
  incorporada ao comando do bloco; a ref lida foi
  `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-SAN3-03-emenda-1.md`.
- **Pré-condições:** 24 GB livres em disco e 10,93 GB de memória de commit livre; porta `55432` livre.
  Os containers vivos `erp-postgres`/`erp-redis` e as portas proibidas não foram tocados.
- `docker run -d --name pg-san303 -p 127.0.0.1:55432:5432 ... postgres:16` — **exit 0**; container
  efêmero sem volume, restrito a `127.0.0.1:55432`.
- `npx prisma migrate deploy && npm run db:seed` com a URL exclusiva do descartável — **exit 0**;
  117 migrações preexistentes aplicadas e seed concluído; zero diff em `prisma/**`/`migrations/**`.
- `npm test` com o descartável — **exit 1**: 363 arquivos, 4.148 testes registrados, 4.136 passes,
  10 fails e 2 skips. A causa raiz nomeada é preexistente e fora do escopo:
  `tests/traccar-event-migration-drill-db.test.ts` falhou no hook final com `EBUSY` ao remover o
  diretório temporário do Windows; isso também acionou corretamente o piso de denominador do runner.
- Reprodução mínima `npm test -- tests/traccar-event-migration-drill-db.test.ts` — **exit 1**:
  7 testes, 6 passes, 1 fail, 0 skips; os seis drills funcionais passaram e o hook final reproduziu
  `EBUSY` em outro diretório temporário. A falha não foi ocultada nem corrigida fora do escopo.
- `npm run check && git diff --check` — **exit 0**.
- `docker rm -f pg-san303` e verificação de ausência — **exit 0**; nenhum container do bloco permaneceu.
- **Escopo:** zero diff em `prisma/**`, `migrations/**`, `Kpis/**`, lockfiles, `frontend/**` e produto.
- **Próximo comando exato:** `npm test -- tests/san3-03-import-memory.test.ts` após criar o
  vermelho-controle comportamental da F1.
- **Arquivos meio-escritos:** nenhum.

## RETOMADA 1

- **Head inicial:** `6d60d864eab5c7c5eda3bb1b0818e68f898211df` (F0 commitada).
- **Medição da máquina nova:** exatamente os 7 arquivos modificados e o teste novo informados pelo
  orquestrador; todos dentro do PERMITIDO. Disco 302 GB livres; memória virtual disponível 14.607 MB.
  `erp-postgres`/`erp-redis` estavam vivos nas portas proibidas e não foram tocados.
- **Prisma Client local:** após o `npm ci` da máquina nova, `npm test` ficou 6/7 e `npm run check` falhou
  porque o client não estava gerado. `DATABASE_URL` apontando somente para `127.0.0.1:55432` +
  `npm run db:generate` — **exit 0**, sem conexão e sem Docker; repetição ficou verde.
- **Vermelho-controle/M1:** filtro de `importId` neutralizado temporariamente no dublê; `npm test --
  tests/san3-03-import-scope.test.ts` — **exit 1**, 4/7, T26-1 retornou 12 em vez de 7. Restaurado.
- **M2:** ordenação invertida para o import mais antigo — **exit 1**, 4/7; T26-1/T26-5/T26-6
  selecionaram o UUID antigo. Restaurado.
- **M3:** import explícito não concluído aceito — **exit 1**, 6/7; T26-3 morreu. Restaurado.
- **M4:** import re-resolvido na execução — **exit 1**, 5/7; T26-5 obteve 11 em vez de 7. Restaurado.
- **M5:** `metadata.importId` do cliente prevaleceu — **exit 1**, 6/7; T26-6 morreu. Restaurado.
- **M19:** terceiro parâmetro opcional e chamador com `undefined` — **exit 1**, 4/7; T26-1/T26-2/T26-5
  ficaram sem linhas. Restaurado.
- **Validação final F1:** `npm test -- tests/san3-03-import-scope.test.ts
  tests/cloud-cost-allocation.test.ts tests/cloud-cost-allocation-routes.test.ts` — **exit 0**, 16/16,
  0 falhas, 0 skips; `npm run check` — **exit 0**; `git diff --check` — **exit 0**.
- **Escopo:** zero toque em `prisma/**`, `migrations/**`, `Kpis/**`, lockfiles, `frontend/**` e Docker.
- **Feito:** R1 em memória, UUID opcional na rota, import fixado na criação e metadados protegidos; todas
  as mutações F1 ficaram vermelhas e foram restauradas.
- **Falta:** F2–F9 (incluindo F8a/F8b/F8c), registros finais e PR.
- **Próximo comando exato:** `docker run -d --name pg-san303 -p 127.0.0.1:55432:5432 -e
  POSTGRES_PASSWORD=postgres -e POSTGRES_DB=san303 postgres:16`.
- **Arquivos meio-escritos:** nenhum; F1 pronta para commit.

## RETOMADA 2

- **Head inicial:** `1f9f7bf5` (F1 commitada e enviada).
- **Pré-condições:** 302 GB livres; memória virtual disponível 14.298 MB. Subido somente `pg-san303`,
  sem volume, em `127.0.0.1:55432`; serviços `erp-*` não foram tocados.
- `npx prisma migrate deploy && npm run db:seed` — **exit 0**; 117 migrações preexistentes aplicadas e
  seed concluído; nenhum arquivo de `prisma/**` foi alterado.
- **Vermelho-controle:** novo `tests/san3-03-import-scope-db.test.ts` contra o código F1 — **exit 1**,
  1/3; T26-db-1 devolveu os dois imports e T26-db-2 contou 2 linhas contra teto 1.
- **Implementação:** `import_id` passou a integrar o mesmo `where` usado por `count` e `findMany`; o
  `take: 100_000` da projeção diária foi removido conforme F2.
- **M1-db:** filtro `import_id` neutralizado temporariamente — **exit 1**, 1/3, reproduzindo T26-db-1 e
  T26-db-2; mutação restaurada.
- **Validação F2:** suíte nova — **3/3**, 0 falhas, 0 skips; regressões
  `o6r06-allocation-basis-rls-db`, `o6r06-cost-summary-sum-db` e
  `o6r06-janela-reservada-guard` — **21/21**, 0 falhas, 0 skips; `npm run check` e
  `git diff --check` — **exit 0**.
- **Escopo:** zero alteração em `prisma/**`, `migrations/**`, `Kpis/**`, lockfiles e `frontend/**`.
- **Feito:** R1 no Prisma, incluindo teto por import e seleção latest completed.
- **Falta:** F3–F9 (incluindo F8a/F8b/F8c), registros finais e PR.
- **Próximo comando exato:** `npm test -- tests/san3-03-attachment-capture.test.ts` após criar o
  vermelho-controle F3.
- **Arquivos meio-escritos:** nenhum; F2 pronta para commit.

## RETOMADA 3

- **Head inicial:** `1f834dfc` (F2 commitada e enviada).
- **Docker:** somente `pg-san303` em `127.0.0.1:55432`, sem volume; migrações existentes aplicadas.
- **Vermelho-controle/M6:** reintrodução temporária do produtor pós-commit — **exit 1**, T-UP-4
  encontrou unidade duplicável; restaurado.
- **Implementação:** captura generalizada `appendCloudUsageInTx/InMemory`; builder de upload com chaves
  por anexo; `createAttachment` Prisma e memória capturam count/bytes/PUT; ramo de evento removido;
  controles legados autorizados mudaram de alvo.
- **M7:** absorver falha da captura — **exit 1**, T-UP-db-2 não recebeu a rejeição; restaurado.
- **M8:** chave por emissão — **exit 1**, T-UP-3 somou count 2; restaurado.
- **Validação F3:** 9 arquivos dirigidos, **57/57**, 0 falhas, 0 skips; inclui atomicidade DB,
  isolamento, fault injection, censo e regressões de uso. `npm run check` e `git diff --check` — exit 0.
- **Escopo:** zero alteração em `prisma/**`, `migrations/**`, `Kpis/**`, lockfiles ou frontend.
- **Feito:** upload de anexo e três unidades persistem juntos ou nenhum persiste.
- **Falta:** F4–F9 (incluindo F8a/F8b/F8c), registros finais e PR.
- **Próximo comando exato:** `npm test -- tests/san3-03-attachment-capture.test.ts` após acrescentar
  T-DOWN-1..4 para o vermelho-controle F4.
- **Arquivos meio-escritos:** nenhum; F3 pronta para commit.

## RETOMADA 4

- **Head inicial:** `76afbc99` (F3 commitada e enviada).
- **Implementação:** builder de concessão de download; repositórios Prisma/memória gravam count/bytes/GET;
  o serviço aguarda a captura antes de devolver a URL; ramo pós-commit removido.
- **Vermelho-controle/M9:** troca temporária de `await` por `void` — **exit 1**, T-DOWN-4 falhou na
  guarda de captura aguardada; restaurado.
- **Validação F4:** T-UP/T-DOWN memória e DB mais regressões de anexos, storage e rotas — **34/34**,
  0 falhas, 0 skips; `npm run check` e `git diff --check` — exit 0 após ajuste de EOF.
- **Docker:** somente `pg-san303` em `127.0.0.1:55432`; nenhum serviço do dono tocado.
- **Escopo:** zero alteração em `prisma/**`, `migrations/**`, `Kpis/**`, lockfiles ou frontend.
- **Feito:** a concessão só retorna depois que suas unidades persistem; falha é fail-closed.
- **Falta:** F5–F9 (incluindo F8a/F8b/F8c), registros finais e PR.
- **Próximo comando exato:** `npm test -- tests/san3-03-job-capture.test.ts` após criar o
  vermelho-controle F5.
- **Arquivos meio-escritos:** nenhum; F4 pronta para commit.

## RETOMADA 5

- **Head inicial:** `3a19365b` (F4 commitada e enviada); worktree limpo antes da F5.
- **Pré-condições:** 302 GB livres e 13,08 GB de memória virtual disponível. Subido somente
  `pg-san303`, sem volume, em `127.0.0.1:55432`; `erp-postgres` e `erp-redis` não foram tocados.
- **Vermelho-controle:** `node --test --import tsx tests/san3-03-job-capture.test.ts` — **exit 1**;
  o módulo ainda não exportava `buildJobExecutionUsageEvents`.
- **Implementação:** builder das duas unidades do job; captura em memória ou em transação
  `withTenantRls` no Prisma; worker reordenado para `handler → await captura → complete`; produtor
  best-effort removido do worker; chaves estáveis derivadas do `job.id`.
- **M10:** `complete` movido temporariamente antes da captura — **exit 1**, 3/4; T-JOB-3 observou
  `complete` seguido de `fail`. Restaurado.
- **M11:** captura temporariamente absorvida com `.catch` — **exit 1**, 3/4; T-JOB-3 observou
  `complete` em vez de `fail`. Restaurado.
- **Validação F5:** T-JOB memória/DB e regressões `job-queue`, `job-worker-bootstrap` e
  `charging-job-idempotency` — **17/17**, 0 falhas, 0 skips; `npm run check` e `git diff --check`
  — **exit 0**.
- **Docker:** 117 migrações preexistentes aplicadas e seed executado no descartável; ao final,
  `docker rm -f pg-san303` — **exit 0**. Nenhum arquivo em `prisma/**`/`migrations/**` foi tocado.
- **Escopo:** zero alteração em `Kpis/**`, lockfiles, dependências ou `frontend/**`.
- **Feito:** falha da medição mantém o job fora de `completed` e aciona o retry; replay não duplica.
- **Falta:** F6–F9 (incluindo F8a/F8b/F8c), registros finais e PR.
- **Próximo comando exato:** `node --test --import tsx tests/san3-03-derived-basis.test.ts` após criar
  o vermelho-controle T-STO/T-API da F6.
- **Arquivos meio-escritos:** nenhum; F5 pronta para commit.

## RETOMADA 6

- **Head inicial medido:** `e5472319` (F0–F5 commitadas e enviadas). O handoff da máquina nova dizia
  `6d60d864`/F1 parcial, mas o worktree real já estava cinco fatias adiante; pela regra retomável, o
  estado real prevaleceu e F1–F5 não foram refeitas.
- **Parcial encontrado:** 6 arquivos modificados e `tests/san3-03-derived-basis.test.ts` novo, todos
  dentro do PERMITIDO da F6; `prisma/**`, `migrations/**`, `Kpis/**`, lockfiles e `frontend/**` intactos.
- **Primeira execução do parcial:** `npm test -- tests/san3-03-derived-basis.test.ts` — **exit 0**,
  11/11, 0 falhas, 0 skips. `npm run check` — **exit 2**, incompatibilidade real entre `_count._all`
  e `_count` numérico no caminho Prisma; corrigida pela forma numérica uniforme.
- **Vermelhos-controle e mutações F6, sempre restaurados:** M12 sem derivação de storage — **exit 1**,
  8/11 (T-STO-1/2/4 vermelhos); M14 sem derivação de API — **exit 1**, 6/11; M15 sem janela —
  **exit 1**, 10/11; M38 sem `awselb` — **exit 1**, 10/11; M40 só checklist — **exit 1**, 9/11;
  M42 contando `auth.*` — **exit 1**, 10/11; M43 ato da plataforma contado no cliente — **exit 1**,
  10/11; M44 ato da plataforma descartado — **exit 1**, 10/11; M45 ator nulo contado — **exit 1**,
  10/11. Cada saída TAP nomeou o teste de comportamento esperado.
- **Implementação F6:** estoque deriva das quatro tabelas de arquivo; ações auditadas respeitam janela,
  ignoram `auth.*` e ator nulo e atribuem atos de usuário da plataforma à própria plataforma; `AWSELB`
  usa a base auditada; regras legadas sem produtor saíram do rateio. Recomendações 5 e 6 registradas como
  **RECOMENDAÇÕES ADOTADAS**, não como decisão do dono.
- **Validação final F6:** `npm test -- tests/san3-03-derived-basis.test.ts
  tests/cloud-cost-allocation.test.ts tests/cloud-cost-allocation-routes.test.ts` — **exit 0**, 20/20,
  0 falhas, 0 skips; `npm run check` — **exit 0**; `git diff --check` — **exit 0**.
- **Docker:** nenhum container próprio necessário nesta fatia; `erp-postgres`/`erp-redis` apenas medidos
  e não tocados.
- **Feito:** F6 completa, incluindo M12, M14, M15, M38, M40 e M42–M45 vermelhas.
- **Falta:** F7, F8, F8a, F8b, F8c, F9, registros finais e PR.
- **Próximo comando exato:** `docker run -d --name pg-san303 -p 127.0.0.1:55432:5432 -e
  POSTGRES_PASSWORD=postgres -e POSTGRES_DB=san303 postgres:16`.
- **Arquivos meio-escritos:** nenhum; F6 pronta para commit.

## RETOMADA 7

- **Troca de executor (declarada):** a partir da F7 o dev é `dev-san303-opus`, **Claude Opus 5.5
  (`claude-opus-5-5`), nível menor**, cobrindo o Codex (as duas contas no limite até 09:21 e 09:26 SP) pela
  decisão do dono `D-CLAUDE-COBRE-ATE-0411` ("2 - cubra"). Não planejou nem revisou o bloco. O Codex fez F0–F6.
- **Head inicial medido:** `1d4eea86` (F6 commitada e enviada). Parcial da F7 deixado pelo Codex, sem commit:
  2 arquivos de `src/` modificados e 2 testes novos (`san3-03-basis-census`, `san3-03-derived-basis-db`);
  container `pg-san303` vivo em `127.0.0.1:55432`, 117 migrações aplicadas (medido no `_prisma_migrations`).
- **Parcial medido contra a emenda, não herdado:**
  - **Defeito no parcial:** `sumUsageBasis` tinha `storageWhere = { created_at: … }`, SEM `tenant_id` — é a
    M13 aplicada e não restaurada (sob superusuário soma o estoque de todas as organizações). Restaurado o
    `tenant_id`.
  - **Defeito novo achado:** na volta da própria plataforma, `auditedActionsByTenant.set(tenantId, quantity)`
    SOBRESCREVIA os atos da plataforma já somados nas voltas dos clientes (depende da ordem da varredura).
    Agora acumula. Teste novo T-API-db-3b (as duas ordens).
  - **Lacuna de teste:** não havia teste do canário do estoque com `withLeakingGroupBy` (M18 do §2.2). Teste
    novo T-STO-db-5 no modelo `attachment`.
  - **Regressão da F3 achada:** `tests/san3-05-acessos-de-plataforma-guard.test.ts` T13 vermelho (2 falhas):
    a F3 renomeou a implementação RAW-SQL para `appendCloudUsageInTx`, e o inventário congelado identifica o
    acesso por `appendChecklistRunUsageInTx`. Conserto DENTRO do PERMITIDO (`capture.ts`): a implementação
    volta ao nome original e `appendCloudUsageInTx` vira o alias (o plano pede os dois nomes). Guard 35/35, sem
    tocar o guard (fora do PERMITIDO).
  - Os `?? 0` removidos pelo Codex no dublê e no Prisma ficam (PROIBIDO `?? 0` em soma de base).
- **§2.9:** `san3-05-leituras-de-plataforma-db.test.ts:66` passa a listar as 8 tabelas e a nota
  `forEachTenantRls`. Só essa linha.
- **Comandos (todos com `DATABASE_URL` do descartável `127.0.0.1:55432`):**
  - `node --test --import tsx tests/san3-03-derived-basis-db.test.ts tests/san3-03-basis-census.test.ts` —
    exit 0, 15/15 (9 db + 6 censo), 0 skip.
  - Mutações (runner de âncora única, restauro conferido byte a byte): **M13** → T-STO-db-1 vermelho;
    **M16** → T-API-db-1 e T-API-db-3b; **M18 audit** (canário removido + vazamento) → T-API-db-2; **M18
    storage** → T-STO-db-5; **M41** sem `deleted_at` → T-STO-db-3; **M40-db** só checklist → T-STO-db-1 e
    T-STO-db-4; **M-ACUM** (sobrescreve) → T-API-db-3b; **C-1** `api_requests_count` de volta na regra → C-1;
    **C-6** inventário sem `damage_attachments` → C-6; **M20** `take: 100_000` de volta → C-5. Todas
    vermelhas e restauradas.
  - Regressão: `san3-05-leituras-de-plataforma-db`, `o6r06-allocation-basis-rls-db`, `san3-03-*`,
    `cloud-cost-allocation*`, `o6r06-usage-atomic(-db)`, `o6r06-billing-census` — exit 0, **117/117**, 0
    skip. `san3-05-acessos-de-plataforma-guard` — 35/35. `npm run check` exit 0; `git diff --check` exit 0.
- **H16 (soma > 2^31):** T-STO-db-4 verde com `groupBy` do Prisma; não precisou de `$queryRaw`.
- **Escopo:** zero toque em `prisma/**`, `Kpis/**`, lockfiles, `frontend/**`, `cloud-charges/**`.
- **Falta:** F8, F8a, F8b, F8c, F9, PR.
- **Próximo comando exato:** `node --test --import tsx tests/san3-03-system-org.test.ts` (vermelho-controle
  T-SYS-2/3 da F8).
- **Arquivos meio-escritos:** nenhum.

## RETOMADA 8

- **Executor:** `dev-san303-opus`, Claude Opus 5.5, nível menor declarado (cobre o Codex, `D-CLAUDE-COBRE-ATE-0411`).
- **Head inicial:** `91fff6a6` (F7 commitada e enviada). Sem Docker nesta fatia.
- **Vermelho-controle (antes do código):** `node --test --import tsx tests/san3-03-system-org.test.ts` —
  exit 1, 1/4: T-SYS-2 (`metadata.totalPlatformCost` ausente; a tag da plataforma virou alocação), T-SYS-3
  (a plataforma recebeu 50 como alocação), T-SYS-8 (campo ausente). T-SYS-1 verde por desenho (controle
  positivo; quem o prova é a M17-b).
- **Implementação (R8, emenda §2.4):** `PLATFORM_SYSTEM_ORG_SLUG = "platform"` e `PlatformCostEntry` em
  `types.ts`; o motor acha a plataforma por `slug` em minúsculas; tag que casa id, nome ou slug da plataforma,
  em qualquer caixa, vira `platformCost` (`origin: "direct_tag"`) ANTES do teste de estratégia; sem tag, a
  plataforma fica no denominador e a fatia dela vira `platformCost` (`origin: "usage_share"`); saída
  `platformCost[]` e `totalPlatformCost`; o serviço grava os dois em `metadata`, fora de
  `total_unallocated_cost`. `listTenants` não muda (Prisma e dublê).
- **Mutações (todas vermelhas e restauradas):** **M17** motor trata a plataforma como cliente → T-SYS-2, T-SYS-3;
  **M17-b** `listTenants` do dublê filtra o slug → T-SYS-1, 2, 3; **M22** casa só por slug → T-SYS-2; **M23**
  tag da plataforma só na estratégia padrão → T-SYS-2; **M24** plataforma fora do denominador → T-SYS-3.
- **Validação:** `san3-03-system-org`, `san3-03-derived-basis`, `san3-03-import-scope`, `cloud-cost-allocation*`,
  `cloud-charge-markup-rules` (12) + `cloud-charge-routes` (2), `cloud-usage-checklist-reopen` — exit 0,
  **49/49**, 0 skip. `npm run check` exit 0; `git diff --check` exit 0. `cloud-charge-*` 14 verdes sem mudança
  de teste (H5-bis confirmada).
- **Escopo:** `engine.ts`, `types.ts`, `service.ts` (só o metadata), teste novo. Zero `prisma/**`, `Kpis/**`,
  `frontend/**`, `cloud-charges/**`.
- **Falta:** F8a, F8b, F8c, F9, PR.
- **Próximo comando exato:** `node --test --import tsx tests/san3-03-compute-rules.test.ts` (vermelho-controle
  T-RULE-1/2 da F8a).
- **Arquivos meio-escritos:** nenhum.

## RETOMADA 8a

- **Executor:** `dev-san303-opus`, Claude Opus 5.5, nível menor declarado.
- **Head inicial:** `387069a0` (F8 commitada e enviada).
- **Vermelho-controle:** `node --test --import tsx tests/san3-03-compute-rules.test.ts` — exit 1, 1/6: T-RULE-1
  (EC2/ECS sem regra, 300 em não rateado), T-RULE-2 (`GP2-Storage` caiu em `storage`, alocado 0), T-RULE-3,
  T-RULE-4 (`no_allocation_rule` em vez de `missing_usage_basis`), T-RULE-5. T-RULE-6 (KMS) verde por desenho.
- **Implementação (R11, RECOMENDACAO ADOTADA 1, não é fala do dono):** regras `compute` (`amazonec2`,
  `amazonecs`, `amazoneks`, `awsfargate`), `database` (`amazonrds`) e `cache` (`amazonelasticache`,
  `amazonmemorydb`), casamento exato em minúsculas, DEPOIS de `s3_requests` e ANTES de `storage`; base
  `audited_actions_count`, método `api_request_weight` (sem método novo: CHECK no banco); `estimate: true` na
  regra → `metadata.estimate = true` na alocação → `estimatedCategories` no resultado do motor e no metadata da
  run (o resumo expõe na F8c). Banco pelas ações até o `B-ASS-03` (Q5, padrão).
- **Mutações (vermelhas e restauradas):** **M35** (R11) `compute` removida → T-RULE-1, 4, 5; **M36** `database`
  depois de `storage` → T-RULE-2; **M37** `cache` removida → T-RULE-3, 5; **M39** `estimate` removido → T-RULE-5.
- **H14 medida:** `DATABASE_URL` do descartável; `node --test --import tsx tests/o6r06-allocation-basis-rls-db.test.ts
  tests/cloud-usage-routes.test.ts` — exit 0, 13/13 (11 + 2). A regra `compute` não mudou a suíte.
- **Validação:** `san3-03-*`, `cloud-cost-allocation*`, `cloud-charge-*`, `cloud-usage*` em memória — exit 0, 83
  pass, 0 fail, 4 skip (as 4 suítes `-db` sem `DATABASE_URL`, rodadas com banco nas fatias delas). `npm run
  check` exit 0; `git diff --check` exit 0.
- **Falta:** F8b, F8c, F9, PR.
- **Próximo comando exato:** `node --test --import tsx tests/san3-03-conservation.test.ts` (vermelho-controle
  T-CONS-1 e T-CUR-1 da F8b).
- **Arquivos meio-escritos:** nenhum.

## RETOMADA 8b

- **Executor:** `dev-san303-opus`, Claude Opus 5.5, nível menor declarado.
- **Head inicial:** `948489b3` (F8a commitada e enviada).
- **Vermelho-controle por comportamento:** `engine.ts`, `service.ts` e `types.ts` do head trocados
  temporariamente pelos de `948489b3` (`git show HEAD:…`), suíte nova copiada com `assertConservation`
  substituída por um stub (o símbolo não existe na base); `node --test --import tsx` — exit 1, 1/8: T-CONS-1..6
  vermelhos (sem `roundingResidualCost`; o motor omisso conclui a run), T-CUR-1 vermelho (USD + BRL concluiu).
  T-CUR-2 verde (controle positivo). Arquivos restaurados da cópia; cópia temporária apagada.
- **Implementação:** R13 — o motor conta `roundingCount` (uma por fatia linha × organização, uma por linha em
  tag, plataforma ou não rateado), soma os totais em micro-unidades `BigInt`, devolve `roundingResidualCost`
  (com sinal) e chama `assertConservation`, função pura exportada: `|resíduo| ≤ roundingCount` micro, senão
  `CloudCostAllocationError(422, CLOUD_COST_ALLOCATION_RESIDUAL_EXCEEDED, residual_exceeded)`. O serviço confere
  de novo pelos ITENS que vai gravar (não pelos totais declarados pelo motor) antes de `replaceTenantAllocations`
  e grava `metadata.roundingResidualCost`, fora de `total_unallocated_cost`. O motor é injetável no construtor
  do serviço só para o T-CONS-6. R14 — mais de uma moeda nas linhas → `CloudCostAllocationError(422,
  CLOUD_COST_ALLOCATION_MIXED_CURRENCY, mixed_currency)`; o `catch` existente deixa a run `failed`, sem alocação.
  Câmbio não entra (é do `B-ASS-09`).
- **Mutações (vermelhas e restauradas):** **M32** resíduo 0 no motor → T-CONS-4; no serviço → T-CONS-1, 2, 3;
  **M33** resíduo somado em não rateado → T-CONS-1, 3; **M34** sem teto → T-CONS-5, 6; **M35** (R13)
  `roundingCount` fixo em 1 (no resultado e na conferência do motor) → T-CONS-1..4; **M34** (R14) trava de moeda
  removida → T-CUR-1.
- **Validação (com `DATABASE_URL` do descartável):** `san3-03-*`, `cloud-cost-allocation*`, `cloud-charge-*`,
  `cloud-usage*`, `o6r06-allocation-basis-rls-db`, `o6r06-cost-summary-sum-db`, `san3-05-leituras-de-plataforma-db`
  — exit 0, **140/140**, 0 skip. `npm run check` exit 0; `git diff --check` exit 0.
- **Falta:** F8c, F9, PR.
- **Próximo comando exato:** `node --test --import tsx tests/san3-03-summary.test.ts` (vermelho-controle
  T-SUM-1/2 da F8c).
- **Arquivos meio-escritos:** nenhum.

## RETOMADA 8c

- **Executor:** `dev-san303-opus`, Claude Opus 5.5, nível menor declarado.
- **Head inicial:** `e2b3d159` (F8b commitada e enviada). Docker: o mesmo `pg-san303` em `127.0.0.1:55432`.
- **Vermelho-controle (testes escritos antes do código, rodados no código de `e2b3d159`):** `node --test
  --import tsx tests/san3-03-summary.test.ts tests/san3-03-system-org.test.ts tests/san3-03-system-org-db.test.ts`
  com `DATABASE_URL` — exit 1, 4/16. T-SUM-1 actual **7** (devolveu a run de 31/10 a 30/11, B4); T-SUM-2 actual
  **0** (a run vazia nova apagou a boa, B2); T-SUM-3..6, T-SYS-4..7 e T-SYS-db-1/2 sem `coverage`, `runId`,
  `unallocatedByReason`, `totalPlatformCost`. T-SYS-1/2/3/8 verdes (F8).
- **Implementação (R12 e R8-b, emenda §2.4 e §2.6):** `getAllocationSummary` com período só aceita run com o
  mesmo dia UTC de início e de fim; sem período, todas as concluídas; preferência: mais nova com import
  (`explicit`/`latest_completed`) → mais nova sem `importResolution` (run antiga) → mais nova com `none`. Campos
  sempre presentes, inclusive no ramo sem run: `runId`, `importId`, `importResolution`, `coverage`
  (`imported` | `no_import` | `no_run` | `legacy_unscoped`), `totalPlatformCost`, `platformCostByService`,
  `unallocatedByReason` (lido de `reason`; item sem motivo em `"unspecified"`, nunca descartado; soma em
  micro-unidades e ordem por motivo), `estimatedCategories`, `roundingResidualCost`. Run antiga com alocação da
  plataforma aparece em `tenants[]` com nome (a plataforma continua em `listTenants()`).
- **Mutações (vermelhas e restauradas):** **M21** funde motivos → T-SYS-4, 5, 6; **M25** plataforma somada em
  `totalUnallocatedCost` → T-SYS-2, 3, 4; **M26** descarta item sem motivo → T-SYS-6; **M27** ramo sem run sem os
  campos → T-SYS-7, T-SUM-1; **M28** soma por motivo em ponto flutuante sem arredondar → T-SYS-5; **M29** aceita
  sobreposição → T-SUM-1; **M30** `runs[0]` → T-SUM-2, 6; **M31** `coverage` fixo → T-SUM-3, 4; **M31-b** compara
  por instante → T-SUM-5. T-RULE-5 ganhou a conferência de `estimatedCategories` no resumo.
- **Validação (com `DATABASE_URL`):** `san3-03-*`, `cloud-cost-allocation*`, `cloud-charge-*`, `cloud-usage*`,
  `o6r06-*`, `san3-05-leituras-de-plataforma-db`, `san3-05-acessos-de-plataforma-guard` — exit 0, **231/231**,
  0 skip. `npm run check` exit 0; `git diff --check` exit 0.
- **Comportamento que muda (declarado na emenda):** pedido de período sem run exata recebe `coverage: "no_run"`
  em vez da run vizinha. Rollback: revert, sem migração.
- **Falta:** F9 (laço único, `take` de `cloud-charges`, docs, registro, bateria) e PR.
- **Próximo comando exato:** `git grep -n "forEachTenantInOneTx" -- src scripts tests`.
- **Arquivos meio-escritos:** nenhum.

## RETOMADA 9

- **Executor:** `dev-san303-opus`, Claude Opus 5.5, nível menor declarado (cobre o Codex, `D-CLAUDE-COBRE-ATE-0411`).
- **Head inicial:** `2949c83b` (F8c commitada e enviada).
- **Vermelho-controle:** C-5 estendido (0 `forEachTenantInOneTx` no repositório de rateio; 0 `take: 100_000` em
  `cloud-charge-prisma.repository.ts`) rodado antes do código — exit 1, `not ok 5 - C-5`.
- **Implementação (R9, emenda §2.8):** o laço privado `forEachTenantInOneTx` saiu; as três varreduras
  (`replaceTenantAllocations`, `listTenantAllocations`, `sumUsageBasis`) usam `forEachTenantRls` de `rls.ts`, com a
  guarda de runtime (`requireSweepClient`, erro `tenant_sweep_requires_prisma_client`) e o canário local
  `tenant_context_leak` mantidos; os usuários da plataforma são lidos numa volta própria sob o GUC da plataforma. A
  linha do wrapper privado saiu de `scripts/san3-05-acessos-de-plataforma.mjs`. De `src/modules/cloud-charges/**`
  saiu **exatamente 1 linha** (`take: 100_000`, `listAllocationTenantAllocations`). `git grep -c
  forEachTenantInOneTx -- src scripts` → 0.
- **Mutações:** **M46** `take` de volta em `cloud-charges` → C-5 vermelho; laço privado de volta (símbolo) → C-5
  vermelho; laço próprio não confiado (`localSweep` em `listTenantAllocations`) → `san3-05-acessos-de-plataforma-guard`
  T13 vermelho (2 falhas). Todas restauradas.
- **Merge:** `origin/main` (`600c5040`) entrou no ramo por merge (sem rebase, proibido), sem conflito e sem arquivo em
  comum com o bloco; nenhuma migração nova nem mudança de dependência.
- **Registro:** `docs/cloud-cost-allocation.md` (passos 4-5 da ponte comercial riscados e superados por
  `D-COBRANCA-ASSINATURA-FRANQUIA`; seção "Rateio exato"); `PLANO_SAN3.md` l.143, 246 e 506-507 (aditivo, texto antigo
  riscado); `decisoes.md` (`D-SAN3-03-IMPORT-POR-RUN` proposta, `D-SAN3-03-ORG-SISTEMA-NAO-COBRAVEL` respondida, e o
  complemento de `D-SAN3-03-BASE-DERIVADA` com as RECOMENDACOES ADOTADAS marcadas como não-decisão do dono;
  `D-COBRANCA-ASSINATURA-FRANQUIA` e `D-SAN3-03-BASE-DERIVADA` já estavam na `main`); `pendencias.md` (5 pendências
  do plano FECHADAS no PR com o teste de encerramento; emenda de `P-O6R-B06-RATEIO-CURSOR-100K` fechada, a principal
  segue aberta; notas de dono em `P-DONO-CLOUD-BILLING-ESCOPO` e `P-SAN3-06B-CLOUD-BILLING-ESCRITA`; nova
  `P-SAN3-03-IMPORT-ID-EM-COLUNA`, dono `B-ASS-09a`); `log-execucao.md`. `pendencias-indice.md` (gerado) não foi
  regenerado: fora do PERMITIDO, fica com o orquestrador.
- **Bateria final (Windows, `DATABASE_URL` do descartável, `CORE_SAAS_PERSISTENCE=memory`, forma do job `backend`):**
  - `npm run check` — exit 0. `npm run build` — exit 0. `node scripts/sync-agent-agents.mjs --check` — exit 0, 95
    agentes. `git diff --check` — exit 0.
  - `npm test` — exit 1: 385 arquivos, **4.338 testes, 4.328 pass, 8 fail, 2 skip**. As 8 são exatamente as 8 falhas
    conhecidas de ambiente do Windows (`erp-pausa-2026-10-03/ferramentas/baseline-maquina-nova.md:25-44`,
    `D-MAQUINA-RYZENCASA-REGUA-LINUX`): `san3-05-runtime-role-guard-db` T14a/b, T14c, T14d + agregado (aqui com
    `setsid: ausente`), `san3-09-bootstrap-platform-admin-db` T2.1 + agregado, e os `hookFailed` com `EBUSY` de
    `traccar-event-migration-drill-db` e `work-order-invoicing-migration-drill-db` (o piso de denominador acusa os
    dois). Nenhuma falha nova. A régua da máquina é Linux/CI: o CI do PR é a prova final.
  - Suítes do bloco e regressão dirigida, com banco: `san3-03-*`, `cloud-cost-allocation*`, `cloud-charge-*` (14),
    `cloud-usage*`, `o6r06-*`, `san3-05-leituras-de-plataforma-db`, `san3-05-acessos-de-plataforma-guard` — verdes
    (as 4 falhas de `san3-05-runtime-role-guard-db` acima são as conhecidas).
- **Contagem N→M (`grep -cE "^\s*(test|it)\("`):** N = 23 (`cloud-cost-allocation` 7, `-routes` 2,
  `o6r06-billing-census` 7, `cloud-usage` 7). Arquivos `san3-03-*`: 90 por grep, dos quais 5 são o `test(…, {skip})`
  de "sem `DATABASE_URL`" das suítes `-db` → **85 testes novos funcionais** (emenda: 81). **M = 23 + 85 = 108**
  (113 por grep) ≥ 104 ≥ 46.
- **Escopo:** `git diff --name-only origin/main...HEAD` ⊆ PERMITIDO do plano emendado (§4.1); `frontend/**` vazio;
  `src/modules/cloud-charges/**` = 1 linha removida; `prisma/**`, `Kpis/**`, lockfiles: 0 linhas.
- **Docker:** `pg-san303` (127.0.0.1:55432) removido ao fim (`docker rm -f pg-san303`).
- **Falta:** pré-revisão (um revisor, todas as mutações M1–M46, M17-b, M31-b), junta completa (dinheiro).
- **Próximo comando exato (do orquestrador):** `gh pr view <PR> --json headRefOid,statusCheckRollup`.
- **Arquivos meio-escritos:** nenhum.

PRONTO PARA PRÉ-REVISÃO
- **PR:** #484 (https://github.com/thiagodorgo/ERP_Techsolutios/pull/484).

## RETOMADA 10

- **Executor desta emenda:** `dev-san303-e2-sol`, Codex GPT-5.6 Sol, nível menor declarado; identidade nova,
  não achou nem planejou os defeitos. **Verificador previsto:** Claude, conforme a emenda 2 e o item 11(1).
- **Head inicial medido:** `49ddd0f8`; branch `fix/cloud-billing-exato` limpa e igual ao remoto. Disco 304 GB
  livres; memória de commit livre ~17,2 GB. Nenhum Docker foi necessário na C1.
- **C1 — vermelho-controle:** após acrescentar T-SUM-7/T-SUM-8/T-RUN-1, `node --test --import tsx
  tests/san3-03-summary.test.ts tests/cloud-cost-allocation-routes.test.ts` — **exit 1**, 8/10 pass,
  T-SUM-7 e T-SUM-8 vermelhos (`200 !== 400` e `Missing expected rejection`).
- **Implementação:** o serviço recusa exatamente uma ponta com 400/
  `CLOUD_COST_ALLOCATION_INVALID_PERIOD`/`summary_period_incomplete`; `/summary` ganhou parser próprio,
  fail-closed para chave vazia, inválida, repetida e data de calendário impossível. A listagem `/runs`
  preserva uma ponta só; `2028-02-29` permanece válido.
- **Validação C1:** o mesmo comando — **exit 0**, **10/10**, 0 falhas, 0 skips. `npm run check` —
  **exit 0**; `git diff --check` — **exit 0**.
- **Mutações literais:** driver externo `dev-san303-e2-c1-mutations.mjs`; M47, M47-b, M47-c, M54,
  M54-b, M54-c e M56 publicaram **âncora = 1**, **exit 1 por AssertionError** e `restored=true`.
- **Falta:** C2–C4, bateria final e CI do head novo.
- **Próximo comando exato:** `node --test --import tsx tests/san3-03-tenant-tag.test.ts` após criar os
  vermelhos-controle T-TAG-1/2/5/7/10 e o caso DB.
- **Arquivos meio-escritos:** nenhum; C1 pronta para commit.

## RETOMADA 11

- **Executor:** `dev-san303-e2-astra`, Codex GPT-6 Astra, por ordem explícita do dono de 02/11;
  sucessor de `dev-san303-e2-sol`. Não achou nem planejou o conserto. Verificador previsto: Claude.
- **Terreno medido:** `git status --short`, `git log -6 --oneline`, `git rev-parse HEAD` e
  `git ls-remote origin refs/heads/fix/cloud-billing-exato` — exit 0; HEAD e remoto em
  `189064e8c571d5cde2cdd467e06f518a50db971f`. C1 já enviada. Disco: 304 GB livres; memória de commit livre: 16,92 GiB.
- **C1 reexecutada:** `CORE_SAAS_PERSISTENCE=memory node --test --import tsx tests/san3-03-summary.test.ts tests/cloud-cost-allocation-routes.test.ts`
  — **exit 0**, TAP **10 testes, 10 pass, 0 fail, 0 skip**. Saída integral:
  `C:/Users/thiag/erp-pausa-2026-10-03/revisoes/dev-san303-e2-astra-c1-recheck.log`.
  A prova anterior de vermelho-controle e mutações permanece na RETOMADA 10; não foi reexecutada nesta retomada.
- **C2 parcial medida:** leitura integral de `cloud-cost-allocation.engine.ts`,
  `san3-03-system-org-db.test.ts` e `san3-03-tenant-tag.test.ts`; nenhuma edição nesses arquivos
  nesta retomada. Continuam sem commit, como recebidos. Não afirmo C2 validada.
- **CI:** não conferido nesta retomada; não há novo head nem declaração de entrega concluída.

## PAUSA 2026-11-03 01:47:34 UTC

- **Motivo:** parada expressa do mandato: “se for tocar fora do PERMITIDO do §4”.
  A C2 (§5) exige repetir a **M17-b**, mas o driver literal
  `revisoes/prerev-san303-mutations.mjs` define
  `memoryRepo = "src/modules/cloud-cost-allocation/cloud-cost-allocation.repository.ts"`
  e troca `return this.tenants;` pelo filtro que exclui o slug `platform`.
  Esse arquivo NÃO está no PERMITIDO do §4 (que admite, nesse módulo, apenas engine, service, routes e types).
  Não executei a mutação fora de escopo.
- **Outra ocorrência na bateria §6:** M46 altera
  `src/modules/cloud-charges/cloud-charge-prisma.repository.ts`, explicitamente PROIBIDO no §4.
  M1/M6/M7/M8/M9/M10/M11 e outras também usam caminhos fora do PERMITIDO. A obrigação de executar
  essas mutações e a ordem de parar antes de tocar fora do escopo precisam ser conciliadas pelo autor
  da emenda; não presumi exceção para alteração temporária.
- **Evidência:** leitura do driver externo por
  `sed -n '1,170p' C:/Users/thiag/erp-pausa-2026-10-03/revisoes/prerev-san303-mutations.mjs`
  (exit 0); declarações de `memoryRepo`/`cloudChargeRepo` e corpo de M17-b;
  §4/§5/§6 da emenda 2 lidos no arquivo externo fornecido.
- **Head:** `189064e8c571d5cde2cdd467e06f518a50db971f`; C1 pushada e testes próprios reexecutados verdes.
- **Falta:** concluir e validar C2, C3, C4, bateria §6, check-runs e resumos TAP de backend/backend-postgres.
- **Próximo passo:** o orquestrador/autor concilia o escopo das mutações obrigatórias na emenda.
  Depois, o próximo comando de retomada é
  `git -C C:/Users/thiag/w-san303 status --short`, seguido da releitura da emenda ajustada.
- **Arquivos parciais preservados:** `src/modules/cloud-cost-allocation/cloud-cost-allocation.engine.ts`,
  `tests/san3-03-system-org-db.test.ts` e `tests/san3-03-tenant-tag.test.ts` (novo).
  Este relatório recebeu apenas o registro acima; não houve commit/push nesta retomada.
- **Limpeza:** nenhum container criado, nenhum build gerado, nenhum serviço/porta da demo tocado.
  Log externo de evidência preservado. Sem merge.

## RETOMADA 12

- **Executor:** `dev-san303-e2-astra`, Codex GPT-6 Astra, por ordem do dono; verificador previsto: Claude.
- **Retomada 2:** §9 da emenda 2 lido integralmente; resolve a PAUSA de 01:47:34 UTC. O escopo
  de commit continua no §4; mutações temporárias seguem arquivo nomeado, âncora única e restauração
  por hash, com status vazio. Nenhum merge autorizado ou realizado.
- **Terreno:** `git status --short`, `git log -5 --oneline`, `git rev-parse HEAD` e
  `git ls-remote origin refs/heads/fix/cloud-billing-exato` — exit 0; local/remoto
  `189064e8c571d5cde2cdd467e06f518a50db971f`. Disco 304 GB; commit livre 18.252.353.536 bytes.
- **C1 e parcial C2 reexecutados:** `CORE_SAAS_PERSISTENCE=memory node --test --import tsx
  tests/san3-03-summary.test.ts tests/cloud-cost-allocation-routes.test.ts
  tests/san3-03-tenant-tag.test.ts tests/san3-03-system-org.test.ts` — exit 0,
  **29/29**, 0 fail/skip; log externo `dev-san303-e2-astra-ret2-green.log`.
- **C2:** três arquivos parciais lidos inteiros. Motor recebido já segue §7/§8. Complementados
  os controles de colisão nome×id e id×slug, slug/id único com nomes iguais, normalização também
  das chaves e espaço repetido/NBSP, e plataforma zero em toda recusa ambígua.
- **Docker:** encontrado o descartável nominal da execução anterior (`devsan303e2-pg`, criado
  01:43:38Z, postgres:16, exclusivamente 127.0.0.1:55464). Removido e recriado pelo executor
  sem volume; `npx prisma migrate deploy` — exit 0, **117 migrações existentes** aplicadas.
  Log `dev-san303-e2-astra-db-setup.log`. Nenhum serviço/porta da demo tocado.
- **C2 verde:** `node --test --import tsx tests/san3-03-tenant-tag.test.ts
  tests/san3-03-system-org-db.test.ts`, DATABASE_URL exclusiva do descartável, via
  `dev-san303-e2-run.mjs c2-green` — exit 0, **14/14**, 0 fail/skip. Log externo
  `dev-san303-e2-c2-green.log`.
- **Checkpoint C2:** código e testes completos; commit local antes dos ataques para permitir
  restauração por SHA e publicação de status vazio. Vermelho-controle, mutações C2, check e push
  ainda pendentes; não se declara a fatia concluída neste checkpoint.

## PAUSA 2026-11-03 01:57:14 UTC

- **Executor:** `dev-san303-e2-sol2`, Codex GPT-5.6 Sol, nível menor declarado; sucessor do
  `dev-san303-e2-astra`. Não achou nem planejou o conserto. Verificador previsto: Claude.
- **Head medido:** `cbbae32ac1a4bedfe02c714a3932060c18908383`; árvore limpa antes das mutações. C1 e C2 estão
  commitadas localmente, mas o remoto ainda está em `189064e8c571d5cde2cdd467e06f518a50db971f`.
- **Vermelho-controle C2 medido:** `node C:/Users/thiag/erp-pausa-2026-10-03/revisoes/dev-san303-e2-mutations.mjs RED49`
  — driver exit 0, mutante exit 1 por `AssertionError`; T-TAG-1/2/5/7/8/9/10/13 e T-TAG-db ficaram
  vermelhos; `restored=true`; `git status --porcelain=VAZIO`.
- **Mutações C2 executadas nesta retomada:** comando `node
  C:/Users/thiag/erp-pausa-2026-10-03/revisoes/dev-san303-e2-mutations.mjs M48 M49 M50 M51 M52 M53
  M53-b M53-c M55 M55-b M55-c M22 M17-b` — **exit 1**. Pela ordem literal do driver, M17-b, M22′,
  M48, M49′, M50, M51 e M52 tiveram todas as âncoras `=1`, mutante exit 1 por asserção e
  `restored=true`, com `git status --porcelain=VAZIO` após cada caso.
- **Motivo da pausa:** a mutação obrigatória M53 encontrou a âncora literal com contagem **0** em
  `cloud-cost-allocation.engine.ts`. O driver restaurou o arquivo (`restored=true`) e publicou árvore vazia,
  mas a emenda §7 determina explicitamente: âncora 0 = `## PAUSA`, nunca equivalência presumida. Nenhuma
  mutação posterior, C3 ou C4 foi iniciada.
- **Diagnóstico factual, sem corrigir:** a constante `normalizer` do driver externo contém `\s` dentro de
  uma string JavaScript simples; a âncora construída não coincide com a linha literal do motor. O autor deve
  ajustar/emendar o driver literal antes da retomada.
- **Falta:** M53/M53-b/M53-c, M55/M55-b/M55-c; fechar C2 com relatório/commit/push; C3, C4, bateria §6 e CI.
- **Próximo comando exato após correção autorizada do driver:** `node
  C:/Users/thiag/erp-pausa-2026-10-03/revisoes/dev-san303-e2-mutations.mjs M53 M53-b M53-c M55 M55-b M55-c`.
- **Arquivos meio-escritos:** somente este relatório recebeu o registro da pausa; código e testes estão
  restaurados no head. O Postgres descartável `devsan303e2-pg` foi removido; nenhum serviço/porta da demo foi tocado.

## RETOMADA 13

- **Executor:** `dev-san303-e2-sol2`, Codex GPT-5.6 Sol, nível menor declarado; não achou nem planejou
  o conserto. Verificador previsto: Claude.
- **Terreno:** retomado em `cbbae32a`; C1 estava em `origin/fix/cloud-billing-exato@189064e8`, e C2 nos
  commits locais `fe2cacf4` e `cbbae32a`. Disco 304 GB; memória de commit livre 16,13 GiB antes do Docker.
- **C1 reexecutada:** `CORE_SAAS_PERSISTENCE=memory node --test --import tsx
  tests/san3-03-summary.test.ts tests/cloud-cost-allocation-routes.test.ts` — **exit 0**, TAP **10/10**,
  0 falhas, 0 skips.
- **Driver externo corrigido conforme Retomada 4:** em
  `revisoes/dev-san303-e2-mutations.mjs`, sem tocar o repositório:
  ```diff
  -const normalizer = '  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();';
  +const normalizer = String.raw`  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();`;
  -'  return value.trim().replace(/\s+/g, " ").toLowerCase();'
  +String.raw`  return value.trim().replace(/\s+/g, " ").toLowerCase();`
  ```
  `grep -Fn "return value.normalize" engine.ts` mostrou a linha literal 156 e a contagem publicada foi
  **1**.
- **Mutações pendentes da C2:** `node .../dev-san303-e2-mutations.mjs M53 M53-b M53-c M55 M55-b
  M55-c` — driver **exit 0**; cada mutante publicou âncora **=1**, **exit 1 por AssertionError**, sem
  `SyntaxError`/`TransformError`, `restored=true` e `git status --porcelain=VAZIO`. M53 derrubou
  T-TAG-8/9/12; M53-b, T-TAG-8; M53-c, T-TAG-8/9/12; M55, T-TAG-10/13; M55-b, T-TAG-11;
  M55-c, T-TAG-12.
- **C2 no Postgres real descartável:** somente `devsan303e2-pg` (`postgres:16`) em
  `127.0.0.1:55464`, sem volume; `npx prisma migrate deploy` — **exit 0**, 117 migrações existentes.
  `CORE_SAAS_PERSISTENCE=memory node --test --import tsx tests/san3-03-tenant-tag.test.ts
  tests/san3-03-system-org-db.test.ts` — **exit 0**, TAP **14/14**, 0 falhas, 0 skips.
  `npm run check` — **exit 0**; `git diff --check` — **exit 0**.
- **Vermelho-controle e demais mutações C2:** permanecem registrados na PAUSA acima, todos executados
  neste mesmo head de produto, com âncora única, falha por asserção e restauração limpa.
- **Feito:** C2 completa contra §§7–8, incluindo tag ambígua, desconhecida, normalização e caminho DB.
- **Falta:** C3, C4, bateria §6, CI e leitura TAP dos jobs `backend`/`backend-postgres`.
- **Próximo comando exato:** `node
  C:/Users/thiag/erp-pausa-2026-10-03/revisoes/san303-m28-equivalencia.mjs`.
- **Arquivos meio-escritos:** nenhum; o container próprio permanece vivo apenas para a bateria final.

## RETOMADA 14

- **Executor:** `dev-san303-e2-sol2`, Codex GPT-5.6 Sol, nível menor declarado.
- **Head inicial:** `9e443ac0224c278000789fe9c58ce01eca97ad3b`, igual ao remoto; C2 enviada.
- **C3 — M28, prova exigida:** `node
  C:/Users/thiag/erp-pausa-2026-10-03/revisoes/san303-m28-equivalencia.mjs` — **exit 0**,
  `checked=3000003`, `divergences=0`, `first=null`.
- **Regime superior da prova corrigida (§8):** `node
  C:/Users/thiag/erp-pausa-2026-10-03/revisoes/crit-san303-e2-m28-upper.mjs` — **exit 0**,
  `checked=5000000`, `divergences=0`, `first=null`.
- **Resultado C3:** **8.000.003 entradas, 0 divergência**. A igualdade verificada é
  `Number(x.toFixed(6)) === x`, conforme a prova corrigida em dois regimes; a M28 permanece excluída por
  equivalência e nenhum código foi alterado.
- **Falta:** C4, bateria §6, CI e leitura TAP dos jobs `backend`/`backend-postgres`.
- **Próximo comando exato:** remover a linha em branco final do comando do bloco e editar os registros/docs
  permitidos da C4.
- **Arquivos meio-escritos:** nenhum.

## RETOMADA 15

- **Executor:** `dev-san303-e2-sol2`, Codex GPT-5.6 Sol, nível menor declarado.
- **Head inicial:** `02b09335`, igual ao remoto; C3 enviada.
- **C4 — registro:** removida a linha em branco final de
  `agent-orchestration/codex/comandos/B-SAN3-03-cloud-billing-exato.md`; `API_CONTRACTS.md` agora registra
  os 400 `summary_period_incomplete`/`summary_period_invalid` e os motivos
  `ambiguous_tenant_tag`/`unknown_tenant_tag`.
- **Pendências:** aberta `P-TK11H-BARREIRA-FASE` com origem #456, frequência conhecida **1/30**, dona
  `B-SAN3-12x` e sem bloqueio; `P-SAN303-TAG-DESCONHECIDA` ficou como registro FECHADO da leitura do
  autor; nota `B-SAN3-03` registra A1 e A5 fechados pela Emenda 2.
- **Índice:** `python agent-orchestration/controle/gerar-indice-pendencias.py` — **exit 0**:
  **712 cabeçalhos / 701 IDs; 531 abertas, 177 fechadas, 4 sem status**. As duas entradas novas aparecem
  no índice gerado.
- **Validação C4:** `git diff --check origin/main...HEAD` — **exit 0, saída vazia** após o commit
  `96cfbf6d`; filtro de proibidos em `git diff --name-only origin/main...HEAD` — **exit 0, saída vazia**.
- **Feito:** C4 completa, commitada; nenhum código, Prisma, migração, frontend, KPI, lockfile ou CI tocado.
- **Falta:** bateria §6, commit deste relatório, push, CI e leitura TAP de `backend`/`backend-postgres`.
- **Próximo comando exato:** executar a bateria dirigida da Emenda 1 + Emenda 2 com o Postgres próprio já
  saudável em `127.0.0.1:55464`.
- **Arquivos meio-escritos:** nenhum.

## RETOMADA 16

- **Executor:** `dev-san303-e2-sol2`, Codex GPT-5.6 Sol, nível menor declarado.
- **Head inicial da bateria:** `52f75601dcb3a49ddec29cab48d285e0139155f4`, igual ao remoto; C1–C4
  commitadas e enviadas.
- **Bateria dirigida (§6 + §4.3 da Emenda 1):** com `DATABASE_URL` exclusiva do descartável e
  `CORE_SAAS_PERSISTENCE=memory`, `node --test --import tsx tests/san3-03-*.test.ts
  tests/cloud-cost-allocation*.test.ts tests/cloud-charge-*.test.ts tests/cloud-usage*.test.ts` mais as
  regressões `o6r06-*`, `san3-05-*`, jobs e charging nomeadas no comando — **exit 0**, TAP
  **256/256**, 0 falhas, 0 skips.
- **Bateria estática:** `npm run check` — **exit 0**; `npm run lint` — **exit 0**; `npm run build` —
  **exit 0**; `node scripts/sync-agent-agents.mjs --check` — **exit 0**, 95 agentes; `git diff --check
  origin/main...HEAD` — **exit 0, saída vazia**; árvore limpa.
- **Mutações finais:** `node .../dev-san303-e2-mutations.mjs` e continuações explícitas executaram
  **72/72 mutações obrigatórias** da Emenda 1 + M47–M56, sem M28. Todas publicaram âncora literal **=1**,
  mutante **exit 1** com o teste nomeado `not ok`, `restored=true` e
  `git status --porcelain=VAZIO`; não houve `SyntaxError` nem `TransformError`.
- **Transparência do invólucro:** a chamada sem seleção terminou **exit 1** depois de M13, e a primeira
  continuação terminou **exit 1** depois de M16, porque o driver exige também a substring textual
  `AssertionError`. M13 ficou vermelho em T-STO-db-1 e M16 em T-API-db-1/T-API-db-3b, ambos com mutante
  exit 1, âncora 1 e restauração limpa; a cauda foi então executada por seleções literais. Nenhuma mutação
  obrigatória ficou verde.
- **Escopo final local:** filtro sobre `git diff --name-only origin/main...HEAD` encontrou zero em
  `prisma/**`, `migrations/**`, `frontend/**`, `Kpis/**`, `.github/**` e lockfiles.
- **Docker/limpeza:** `devsan303e2-pg` (`postgres:16`, `127.0.0.1:55464`, sem volume) foi removido por
  `docker rm -f`; verificação de ausência vazia. `erp-postgres` e `erp-redis` permaneceram vivos e intocados.
  Disco ao fim: 304 GB livres.
- **Feito:** bateria local do §6 completa.
- **Falta:** commit/push deste registro, check-runs do head novo e leitura do resumo TAP de
  `backend`/`backend-postgres`.
- **Próximo comando exato:** `git add docs/revisoes/SAN3/B-SAN3-03-dev.md && git commit`, seguido de push
  e `gh api repos/thiagodorgo/ERP_Techsolutios/commits/<head>/check-runs`.
- **Arquivos meio-escritos:** nenhum.

## RETOMADA 17

- **Executor:** `dev-san303-e2-sol2`, Codex GPT-5.6 Sol, nível menor declarado.
- **Head de produto conferido:** `d4e0e819a038c292357a6a6ac978bf1e7b65bc70`, igual ao remoto e com
  árvore limpa antes deste registro.
- **Check-runs:** consulta à API de checks — **exit 0**, **16/16 concluídos**, zero conclusão diferente
  de `success`/`skipped`; runs `41564109472` (`push`) e `41564116291` (`pull_request`) terminaram com
  sucesso, inclusive os dois jobs `docker` dependentes.
- **TAP do push, lido com `gh run view 41564109472 --job <job> --log`:** `backend` — **4.360 testes,
  4.358 pass, 0 fail, 2 skipped**; `backend-postgres` — **493 testes, 493 pass, 0 fail, 0 skipped**.
- **TAP do PR, lido com `gh run view 41564116291 --job <job> --log`:** `backend` — **4.360 testes,
  4.358 pass, 0 fail, 2 skipped**; `backend-postgres` — **493 testes, 493 pass, 0 fail, 0 skipped**.
- **Feito:** C1, C2, C3 e C4, bateria local do §6, mutações e CI do head de produto concluídos. Este
  registro é a única alteração posterior; após o push, o CI do head documental final também será
  aguardado e seus TAPs serão lidos antes da devolução ao orquestrador.
- **Arquivos meio-escritos:** nenhum.

PRONTO PARA CONFERÊNCIA
