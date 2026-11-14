# Cloud Cost Allocation

## Escopo

`cloud_cost_allocation` e o motor de rateio de custo cloud por tenant. Ele cruza o uso interno medido em `cloud_usage_*` com o custo AWS bruto importado em `cloud_cost_*` para responder quanto cada tenant custou em AWS em um periodo.

Entrega desta branch:

- migration `20260613000000_add_cloud_cost_allocation`;
- tabela platform-scoped `cloud_cost_allocation_runs`;
- tabela tenant-scoped `tenant_cloud_cost_allocations`;
- RLS por `tenant_id` em `tenant_cloud_cost_allocations`;
- engine explicavel de alocacao por regras MVP;
- custo direto por `tenant_tag` quando houver match com tenant conhecido;
- rateio por uso para storage/download, API requests, jobs e checklists quando houver metrica base;
- bucket de custo nao alocado quando nao houver base confiavel;
- job `cloud-cost-allocation.run`;
- API Platform protegida por RBAC;
- documentacao da ponte para markup/cobranca futura.

Fora do escopo desta branch:

- markup ou margem;
- minimo mensal, franquia ou excecoes comerciais;
- cobranca final;
- fatura;
- gateway de pagamento;
- UI completa;
- provider externo novo;
- integracao AWS real alem da foundation AWS CUR existente;
- endpoint tenant para expor custo.

## Para que serve o rateio (B-SAN3-03, `D-COBRANCA-ASSINATURA-FRANQUIA`)

Fluxo:

1. `cloud_usage_*` mede uso interno por organizacao.
2. `cloud_cost_*` importa custo AWS bruto.
3. `cloud_cost_allocation_*` calcula custo AWS por organizacao.

~~4. `cloud-charge-markup-rules` aplica markup, minimo mensal, franquia e excecoes por plano.~~
~~5. `platform-cloud-billing-ui` e `billing-payment-provider` futuros exibem, fecham e cobram.~~

**Passos 4 e 5 SUPERADOS por `D-COBRANCA-ASSINATURA-FRANQUIA` (decisao do dono, 2026-10-30).** A plataforma paga a
nuvem; o preco do cliente e a assinatura com franquia. O custo rateado por organizacao alimenta a visao da plataforma
(cliente, grupo e global) e a margem = assinatura paga − custo rateado, com alerta quando o custo passar da assinatura
(`B-ASSINATURA`). **Nao existe preco por custo.** O texto antigo dos passos 4 e 5 fica acima, riscado (§A2).

## Rateio exato (B-SAN3-03)

- **Uma run, um import.** A run resolve o import na criacao (`importId` explicito, que precisa estar `completed`, ou o
  `completed` mais recente com linha na janela) e grava `metadata.importId` e `metadata.importResolution`
  (`explicit` | `latest_completed` | `none`). Reexecutar nao troca o import. `listCostLineItems` filtra
  `import_id` no `count` e no `findMany` (`D-SAN3-03-IMPORT-POR-RUN`; coluna propria: `P-SAN3-03-IMPORT-ID-EM-COLUNA`,
  dono `B-ASS-09a`).
- **Base de fatos.** Upload e download de anexo de checklist e execucao de job gravam a unidade de uso na MESMA
  transacao do fato (falha na unidade falha o fato). Storage pelo estoque das 4 tabelas de arquivo
  (`checklist_attachments`, `work_order_attachments`, `attachments`, `damage_attachments`; RECOMENDACAO ADOTADA 5);
  API por acoes auditadas de usuario da organizacao, sem `auth.*` e sem ator nulo, com o ato de usuario da plataforma
  pesando na plataforma (`D-SAN3-03-BASE-DERIVADA`; filtro: RECOMENDACAO ADOTADA 6).
- **Maquina, banco e cache** (`compute`, `database`, `cache`) rateados pelas acoes, rotulados como estimativa
  (`estimatedCategories`; RECOMENDACAO ADOTADA 1). O banco passa ao espaco medido no `B-ASS-03`.
- **Plataforma.** A organizacao `slug = "platform"` pesa no rateio e nao recebe alocacao: custo com a tag dela (id,
  nome ou slug, qualquer caixa, nas 2 estrategias) e a fatia dela no rateio sem tag vao para `totalPlatformCost`,
  linha propria, fora de `totalUnallocatedCost` (`D-SAN3-03-ORG-SISTEMA-NAO-COBRAVEL`; RECOMENDACAO ADOTADA 2).
- **A soma fecha.** `importado = alocado + plataforma + nao rateado + roundingResidualCost`, em micro-unidades; o
  residuo so explica arredondamento (`|residuo| <= roundingCount x 0,000001`), senao a run falha com
  `residual_exceeded`. Moeda misturada falha a run com `mixed_currency` (cambio: `B-ASS-09`).
- **Resumo** (`GET /platform/cloud-cost-allocations/summary`): com periodo, so vale run com o mesmo dia UTC de inicio
  e de fim; traz `runId`, `importId`, `importResolution`, `coverage` (`imported` | `no_import` | `no_run` |
  `legacy_unscoped`), `unallocatedByReason`, `totalPlatformCost`, `platformCostByService`,
  `estimatedCategories` e `roundingResidualCost`.
- **Laco unico.** As leituras e escritas por organizacao passam por `forEachTenantRls` (`src/database/rls.ts`), com o
  canario `tenant_context_leak` do modulo.

## Rateio automático (B-ASS-09a)

Em linguagem de dono:

- **Importar o arquivo de custo da AWS já reparte o custo entre as organizações.** Cada importação concluída cria
  sozinha **um rateio por mês de cobrança** do arquivo. Isso é uma **ação do sistema**: quem tem permissão de importar
  dispara o rateio sem precisar da permissão de rodá-lo à mão (R2-12(b)).
- **Repetir não duplica.** Reenviar a tarefa, repetir o gatilho ou rodar em paralelo deixa a mesma importação com 1
  rateio por mês.
- **Um mês nunca é contado duas vezes**, nem no formato real da AWS, que marca o fim do mês como meia-noite do dia 1
  seguinte. O rateio manual tinha o mesmo erro latente na fronteira e foi corrigido.
- **Importar de novo um mês já publicado TROCA o número publicado daquele mês** (R2-05(a)). Enviar o mesmo arquivo de
  novo cria uma importação nova, e ela ganha o seu rateio do mês; o resumo passa a mostrar o mais recente, **sem somar os
  dois**. O resumo mostra o rateio da **importação mais nova do mês**, mesmo quando a recuperação cria depois o rateio
  de um arquivo mais velho: o número publicado só muda por uma importação mais nova ou pela ação manual do operador. O
  rateio novo usa a base de HOJE (arquivos apagados saem, e as organizações são as de agora). A cobrança já
  calculada não muda, porque ela aponta para o rateio que usou (`sourceAllocationRunId`). Se o dono preferir que o
  reenvio não troque o número publicado, isso é pergunta aberta (P4 do §9 do plano), não ajuste.
- **Os meses já rateados antes deste bloco não mudam sozinhos**: só as importações feitas depois dele entram no rateio
  automático (pergunta 1 do §9, recomendação (a), adotada por padrão, não decisão do dono). Os meses antigos seguem no
  rateio manual.
- **O rateio manual continua recalculando** a cada clique (pergunta 2, recomendação (a)). O resumo mostra o mais
  recente.
- **Se o rateio automático falhar, a importação continua válida.** Uma varredura de 6 em 6 horas completa **mês a mês**
  o que faltou. Um arquivo com os dois formatos de fim no mesmo mês (o fim exclusivo da AWS e o fim escrito só com data)
  vira **um** rateio do mês, somado, nunca dois. Um rateio automático que terminou com erro **não é tentado de novo
  sozinho** (pergunta 3, recomendação (a)): fica marcado como falho e o operador decide pelo manual.
- **Monitoramento, chaves, DNS e rede entram no rateio pelas ações**, como estimativa (decisão do dono de 31/10, P8; anexo
  CE-P8 de `D-COBRANCA-RESPOSTAS-3110`): CloudWatch, KMS, Secrets Manager, Route 53 e VPC. O **NAT Gateway** vem da AWS
  com o código de máquina (`AmazonEC2`) e entra como **máquina**, pelas ações (R2-09); o `AmazonVPC` fica para endpoint e
  IPv4 público.
- **O banco grava o método da base que de fato usou** (R8): com o espaço medido, `storage_usage_weight`; sem medição,
  cai para as ações e grava `api_request_weight`.
- **Um mês dividido em vários arquivos** vira várias importações parciais, e o resumo mostra só a última parte (risco
  H13). Este bloco não piora o risco (o resumo já escolhia uma run); o conserto é `P-ASS09A-MES-EM-VARIOS-ARQUIVOS`, do
  `B-ASS-09`.
- **Na visão de custo da plataforma (B-ASS-09)** o mês com mais de uma importação mostra o aviso `multiple_imports_in_month` e quantas são, converte pela taxa do mês e nunca soma as partes; separar parte de correção (pelo manifesto da AWS) fica com o `B-ASS-13`.
- **Um arquivo com linha de período invertido é recusado inteiro.** Quando o início de um período vem depois do fim, a
  importação falha na origem, sem gravar linhas nem criar rateio, e o erro diz a linha. O número da linha é o da linha de
  **dados** da importação (linhas em branco não contam).
- **Um fim escrito só com data cobre o dia inteiro.** O fim à meia-noite do dia 1, depois do início, segue o fim
  exclusivo da AWS; qualquer outro fim escrito só com data vale até o fim daquele dia.
- **No empate, o número publicado não muda.** Quando duas importações têm a mesma data de publicação, vale a run que já
  estava publicada, e uma run que chega depois não troca o número.
- **O teto é de 24 meses por arquivo.** Uma importação com mais de 24 meses não ganha rateio automático e avisa no log.

Como funciona (`src/modules/cloud-cost-allocation/cloud-cost-allocation.import-trigger.ts`):

- **Gatilho.** `CloudCostService.importAwsCurCsv` grava `completed` com `metadata.autoAllocation = "v1"` (DEPOIS do
  metadata de quem chama) e, FORA do `try`, chama o gancho `onImportCompleted`; falha do gancho é registrada
  (`cloud_cost_import_completed_hook_failed`) e nunca vira importação `failed`. Só a fábrica Prisma liga o gancho
  (`createPrismaCloudCostService`); a de memória segue sem gancho.
- **Uma run por importação × janela de publicação.** `ensureImportRuns` agrupa os pares (`billing_period_start`,
  `billing_period_end`) das linhas pela janela de publicação (o dia UTC do início e o dia UTC do fim normalizado) e cria
  UMA run por janela, com id UUIDv5 de `cloud-cost-allocation:import:<importId>:window:<janela>` (a PK é a exclusão;
  `P2002` relê a existente). A run guarda `trigger: "import"`, `importResolution: "explicit"`, os pares em
  `metadata.sourceBillingPeriods` e a importação na coluna `import_id` (M-09a). A janela é `[início, fim − 1 ms]` quando
  o fim é 00:00 UTC do dia 1 (fim exclusivo); um fim escrito só com data cobre o dia inteiro. As linhas entram pela
  IGUALDADE dos pares que caem na janela: cada linha em exatamente uma run. Pula a janela que já tem run manual da mesma
  importação no mesmo dia UTC. Acima de 24 janelas, nenhuma run e o aviso
  `cloud_cost_auto_allocation_skipped_too_many_periods`. Um enfileiramento por importação.
- **Execução.** O job que já existe, `cloud-cost-allocation.run`, com `mode: "import_auto"`, reivindica cada run
  (`pending → processing`, condicional) e só a reivindicação vencedora roda o motor.
- **Varredura** (`mode: "import_catch_up"`, 1º tique no boot do worker, depois a cada 6 h): seleciona pelo que FALTA —
  importação marcada ainda na fila, e runs automáticas `pending` de qualquer importação —, com limite de 50. Ela completa
  **mês a mês** o que faltou: cria só as janelas da importação que ainda não têm run. A falha geral é registrada
  (`cloud_cost_auto_allocation_catch_up_failed`), não relança e reenfileira uma vez.
- **A fila da varredura não emperra** (PR542-01): a importação avaliada sem nada a criar (todos os meses já com
  rateio, manual ou automático, ou mais de 24 janelas) recebe o marcador do sistema `metadata.autoAllocationSweep =
  { status: "done" }` quando a passada termina sem erro e sai da seleção; a que falha recebe `{ status: "failed",
  attempts }` e sai depois de 3 falhas seguidas. O marcador é só do sistema: a importação nasce com ele vazio (`null`),
  gravado depois do metadata de quem chama, e quem importa não consegue escondê-la da varredura.
- **Coluna `import_id`** (migração `20260902000000_ass09a_allocation_run_import_id`, autorizada pelo dono em 31/10):
  FK para `cloud_cost_imports` com `ON DELETE SET NULL` (apagar a importação não apaga a run), índice e backfill a
  partir de `metadata.importId`.
- **Limite conhecido:** uma run automática presa em `processing` (o worker morreu depois de reivindicar) fica visível e o
  operador roda o manual (`P-ASS09A-RUN-PRESA-EM-PROCESSING`, do `B-ASS-10b`). Não erra valor.

## Modelo de dados

### `cloud_cost_allocation_runs`

Tabela global da plataforma. Representa uma execucao de alocacao para provedor, periodo e estrategia.

Campos principais:

- `provider`: `aws`;
- `status`: `pending`, `processing`, `completed` ou `failed`;
- `period_start` e `period_end`;
- `strategy`: `usage_weighted_v1` ou `direct_tag_then_usage_weighted_v1`;
- `total_imported_cost`;
- `total_allocated_cost`;
- `total_unallocated_cost`;
- `currency`;
- `started_at` e `completed_at`;
- `created_by`;
- `error_message`;
- `metadata`;
- `import_id` (B-ASS-09a, M-09a): a importação da run, FK `ON DELETE SET NULL`;
- timestamps.

### `tenant_cloud_cost_allocations`

Tabela tenant-scoped. Representa o custo alocado para um tenant por run, servico, tipo de uso, categoria e metodo.

Campos principais:

- `allocation_run_id`;
- `tenant_id`;
- `provider`;
- `period_start` e `period_end`;
- `service_code`;
- `usage_type`;
- `cost_category`;
- `allocation_method`;
- `allocation_basis_metric_key`;
- `allocation_basis_quantity`;
- `allocation_ratio`;
- `allocated_cost`;
- `currency`;
- `source_cost_line_item_ids`;
- `metadata`;
- timestamps.

Regras:

- RLS por `tenant_id` com `app.current_tenant_id`;
- indices por run, tenant, periodo, servico e categoria;
- unicidade por `allocation_run_id`, `tenant_id`, `service_code`, `usage_type`, `cost_category` e `allocation_method`;
- custo nao alocado fica nos totais e metadata do run, sem criar tenant ficticio.

## Regras MVP

Catalogo de regras nesta fase fica em codigo em `src/modules/cloud-cost-allocation/cloud-cost-allocation.rules.ts`. A tabela `cloud_cost_allocation_rules` fica planejada para quando houver governanca dinamica de regras por provedor/servico.

Metodos suportados:

- `direct_tenant_tag`;
- `storage_usage_weight`;
- `download_usage_weight`;
- `api_request_weight`;
- `job_execution_weight`;
- `checklist_run_weight`;
- `equal_split` reservado;
- `unallocated` para classificacao de custo sem base, registrado nos totais do run.

Fluxo:

1. Buscar `cloud_cost_line_items` no periodo.
2. Buscar `cloud_usage_daily_aggregates` no periodo.
3. Carregar tenants conhecidos.
4. Se `tenant_tag` do CUR corresponder a id, nome ou slug de tenant e a estrategia permitir, alocar diretamente.
5. Para custos S3/storage, usar metricas de storage/anexos/download.
6. Para requests/download, usar metricas de download/S3 requests.
7. Para backend/API, usar `api_request.count` ou `api_requests_count`.
8. Para jobs/queue, usar `job.executed` ou `job_executions_count`.
9. Para checklists, usar `checklist_run.completed` ou `checklist_runs_count`.
10. Se nao houver metrica base, somar em `total_unallocated_cost` e registrar motivo.

O engine nao inventa precisao falsa. Quando a base nao existe ou e zero, o custo permanece nao alocado.

## API Platform

Prefixo: `/api/v1/platform/cloud-cost-allocations`.

Rotas:

- `GET /runs`: lista runs.
- `GET /runs/:runId`: detalha run.
- `POST /runs`: cria e executa uma alocacao.
- `GET /runs/:runId/tenant-allocations`: lista alocacoes tenant-scoped do run.
- `GET /summary`: resume custo alocado e nao alocado.

Permissoes:

- leitura: `platform:cloud-cost-allocation:read`;
- execucao: `platform:cloud-cost-allocation:run`.

Exemplo de criacao:

```json
{
  "periodStart": "2026-06-01",
  "periodEnd": "2026-06-30",
  "strategy": "direct_tag_then_usage_weighted_v1"
}
```

## Job

`cloud-cost-allocation.run`:

- recebe `runId` existente ou `periodStart`, `periodEnd` e `strategy`;
- B-ASS-09a: com `mode: "import_auto"` e `importId`, executa as runs automáticas `pending` da importação (reivindicadas);
  com `mode: "import_catch_up"`, roda a varredura e se reenfileira em 6 h (ver "Rateio automático");
- cria run quando necessario;
- atualiza status para `processing`;
- executa o engine;
- substitui alocacoes do run sem duplicar estado final;
- atualiza totais e status `completed`;
- em erro, marca `failed` e salva erro sanitizado;
- nao depende de AWS real.

## Seguranca

- endpoints ficam somente em `/api/v1/platform/*`;
- usuario tenant comum nao acessa custo bruto nem alocado por API tenant nesta branch;
- `tenant_cloud_cost_allocations` tem RLS por `tenant_id`;
- erro e metadata sao sanitizados;
- secrets, credenciais AWS, Authorization, tokens, storage keys, bucket, path privado, body e payload sensivel nao devem ser persistidos.

## Relacao com cloud charge markup rules

**SUPERADO por `D-COBRANCA-ASSINATURA-FRANQUIA` (2026-10-30):** o calculo abaixo nao e mais o preco do cliente; o
codigo fica congelado, sem uso novo, ate o `B-ASS-01` retira-lo das rotas e da tela; as tabelas ficam, sem
migracao destrutiva. Texto antigo, preservado:

> `cloud_charge_markup_rules` consome `tenant_cloud_cost_allocations` e `cloud_cost_allocation_runs`, seleciona regras comerciais em `cloud_charge_rules`, cria runs em `cloud_charge_calculation_runs` e grava `tenant_cloud_charges`. Essa etapa calcula preco cobrável com margem, mas ainda nao gera fatura nem pagamento.

## Proximas branches

**SUPERADO por `D-COBRANCA-ASSINATURA-FRANQUIA`:** os donos agora sao os blocos do pacote `B-ASSINATURA` — margem e
cambio (`B-ASS-09`), rateio automatico depois do import (`B-ASS-09a`), botoes de importar e rodar na tela
(`B-ASS-10b`), leitura automatica da AWS (`B-ASS-13`), banco pelo espaco medido (`B-ASS-03`), requisicoes S3 das
outras 3 tabelas de arquivo (`B-ASS-14`). Texto antigo, preservado:

> - `feature/platform-cloud-billing-ui`: UI completa de billing/cloud para plataforma;
> - `feature/billing-payment-provider`: fechamento/cobranca com provedor de pagamento.
