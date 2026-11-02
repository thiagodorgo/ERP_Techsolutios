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

