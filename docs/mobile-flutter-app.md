# App Flutter Tudo-em-Um

## Politica de KPIs duplos

Existem dois conjuntos de KPIs: `mobile/flutter_app/Kpis/` para o app Flutter e
`Kpis/` para os KPIs gerais/raiz do projeto. Mexeu Flutter/mobile: atualizar
`mobile/flutter_app/Kpis/*` e refletir os percentuais mobile em `Kpis/*`.
Mexeu fora do mobile: atualizar `Kpis/*`. Mexeu nos dois: atualizar os dois.
Se existir `index.html`, atualizar tambem o HTML.

No pos-B-106, os dois conjuntos devem refletir B-106 Adapter GPS nativo real + permissoes Android/iOS, Field Location, Flutter 633/633, MVP demo 90%, MVP vendavel 68% e 36 blocos.

## Decisao

O Flutter sera um app unico modular do ERP Techsolutions. O app pode carregar os modulos no binario, mas deve habilitar telas e acoes apenas a partir do bootstrap autenticado do backend.

O primeiro caminho versionado nesta fase e `mobile/flutter_app`, porque nao havia `pubspec.yaml` existente no repositorio fora de `experiments/`.

## Camadas

- App Shell: inicializacao, tema, roteamento, home modular e diagnostico.
- Auth: sessao, tokens, refresh e secure storage.
- Tenant Context: tenant ativo, troca de tenant e isolamento local.
- Module Resolver: transforma `enabled_modules` em rotas/cards.
- Permission Resolver: avalia permissoes para acoes e telas.
- Local DB: base SQLite/Drift planejada para dados, catalogos e fila.
- Sync Engine: fila idempotente, retry, conflito e atualizacao incremental.
- Evidence Engine: recibos, fotos, hashes, retencao e upload futuro.
- OCR Engine: extracao local planejada de dados de recibos.
- PDF Engine: previa local com marca d'agua quando nao sincronizado.
- Expense Module: Prestação de Contas, itens, totais, politica, submissao e status.
- Field Ops Module: OS, checklists, fundacao de GPS/mapa operacional e evidencias.
- Diagnostics: fila, ultimo sync, versao, tenant e logs sanitizados.

## Bootstrap esperado

`GET /api/v1/mobile/bootstrap` deve retornar:

- `active_tenant`;
- tenants disponiveis;
- `enabled_modules`, incluindo `expense_management` quando permitido;
- `permissions`;
- `feature_flags`;
- `mobile_policy`;
- categorias e politicas de despesas;
- versoes de catalogos para cache e sync.

### Status backend B-098A/B-098E

`GET /api/v1/mobile/bootstrap` ja existe no backend como contrato expandido e cacheavel. Ele preserva tenant ativo, usuario, roles, permissoes, modulos habilitados, categorias de despesas quando o ator tem permissao relacionada a despesas, `serverTime` e cursores nulos de sync.

Blocos adicionais disponiveis para o Flutter:

- `contract`: nome, versao `2026-06-14.b098a`, `schemaVersion` e horario de geracao.
- `mobile_app`: plataforma Flutter, versao minima suportada, versao recomendada e versao do contrato.
- `cache`: TTL de 300 segundos, `stale_while_revalidate_seconds` de 900 segundos, `expires_at`, `cache_key` e `vary_by`.
- `feature_flags`: chaves por capacidade, com `enabled`, `status` e `reason` quando aplicavel.
- `mobile_policy`: regras de auth, cache, sync, evidencias e diagnostico seguro.
- `catalogs`: modulos, permissoes, categorias de despesas e endpoints com versoes e status.

No B-098B, `POST /api/v1/mobile/sync/work-order-actions` passou a existir para replay controlado de acoes de OS:

- `feature_flags.work_order_sync.status=implemented` quando o modulo `work_orders` esta disponivel;
- `mobile_policy.sync.implemented_domains` inclui `work_orders`;
- `catalogs.endpoints.work_order_sync` aponta para `POST /api/v1/mobile/sync/work-order-actions` como `implemented`;
- o app deve enviar lotes com `client_action_id` por acao e tratar `accepted`, `rejected`, `conflicts` e `already_applied` separadamente;
- o Flutter nao deve enviar `tenant_id` como fonte de decisao; o backend usa o tenant do ator autenticado;
- conflitos exigem resolucao explicita na fila local antes de descartar dados.

No B-098C, `POST /api/v1/mobile/sync/checklist-actions` passou a existir como contrato parcial para replay minimo de `checklist.item_answer`, `checklist.item_note` e `checklist.complete`.

No B-098D, `GET /api/v1/mobile/inventory/availability` e `POST /api/v1/mobile/sync/inventory-actions` passaram a existir como contrato parcial:

- `feature_flags.inventory_mobile.status=partial` quando o modulo `inventory` esta disponivel;
- `feature_flags.inventory_sync.status=partial` quando o ator possui `inventory.manage`;
- `mobile_policy.sync.partial_domains` inclui `inventory`;
- `catalogs.endpoints.inventory_availability` e `catalogs.endpoints.inventory_sync` apontam para os endpoints B-098D;
- o sync de inventario aceita `inventory.reserve`, `inventory.consume` e `inventory.shortage_report`;
- o backend ignora `tenant_id` no query/body/payload e resolve o tenant pelo ator autenticado.

No B-098E, `POST /api/v1/mobile/sync/evidence-actions` passou a existir como contrato parcial para fotos, assinaturas e observacoes de OS/campo:

- `feature_flags.generic_evidence_upload.status=partial` quando modulo e permissao permitem o uso;
- `mobile_policy.sync.partial_domains` inclui `evidence`;
- `mobile_policy.evidence.work_order_evidence` e `generic_upload` ficam `partial`;
- o app deve enviar `client_evidence_id` e metadados seguros, nunca base64, path local ou token;
- o backend separa `accepted`, `rejected`, `conflicts` e `already_applied` e ignora tenant externo.

No B-108, `POST /api/v1/mobile/evidence-uploads` foi endurecido para upload multipart de evidencias de OS/campo:

- o Flutter continua enviando multipart com `evidence_id`, `client_evidence_id`, `sha256`, `size_bytes`, `content_type` e arquivo `file`, sem `tenant_id`, token, base64, `file_data`, `local_path` ou `path`;
- resposta `status=stored` marca a evidencia como sincronizada e permite apagar o blob local opaco;
- respostas/erros `rejected`, `scan_failed`, `pending_review`, rede ou timeout preservam a evidencia local para retry/revisao;
- a UI exibe apenas nome, origem e estado seguro; nunca exibe path local, bucket, storage key, URL interna ou token.

No B-105, o Flutter passou a consumir a fundacao backend de Field Location.

No B-106, o Flutter conectou o adapter GPS nativo real ao `DeviceLocationProvider`:

- `GeolocatorDeviceLocationProvider` usa `geolocator` com `GeolocatorLocationPort` testavel;
- permissoes Android/iOS sao foreground/when-in-use;
- `LocationConsentStore` exige aceite explicito antes do primeiro pedido de permissao nativa;
- a captura continua somente por acao manual em `Enviar localizacao agora`;
- o provider chama apenas `getCurrentPosition` com timeout seguro;
- nao ha background tracking, stream continuo, timer, envio silencioso, captura ao abrir tela nem captura pelo `AutoSyncCoordinator`;
- `DioFieldLocationApi` preserva `POST /api/v1/mobile/field-locations` com payload controlado;
- `/field-map` renderiza um mapa operacional simples conectado a OS, sem Google Maps, Mapbox ou SDK externo de mapa.

Ainda nao ha tenants disponiveis, persistencia duravel de idempotencia mobile, reserva transacional multi-instancia, associacao real de inventario com OS/armazem, approval real, conflitos manuais avancados, geofencing/roteirizacao, provider externo de mapa nem storage externo/presigned URL/download protegido final para evidencia. Esses itens ficam para fases seguintes.

## Estrutura inicial

```txt
mobile/flutter_app/lib/
  main.dart
  app/
    app.dart
    router.dart
  core/
    auth/
    bootstrap/
    diagnostics/
    location/
    modules/
    network/
    permissions/
    storage/
    sync/
  features/
    expenses/
    field_ops/
  shared/
    ui/
```

## Dependencias planejadas

- `flutter_riverpod`: estado de app, bootstrap e modulos.
- `go_router`: rotas declarativas.
- `dio`: HTTP.
- `flutter_secure_storage`: tokens e segredos.
- `drift`: banco local.
- `sqlite3_flutter_libs`: runtime SQLite.
- `path_provider`: paths locais.
- `uuid`: `client_action_id`.
- `crypto`: hashes de recibos/acoes.
- `equatable`: igualdade de modelos.

OCR, PDF, camera e upload real ficam documentados, mas fora da primeira fundacao para reduzir risco de build.

## Regras locais obrigatorias

- Tokens nunca devem ir para SQLite comum.
- Toda entidade local tenant-scoped carrega `tenant_id`.
- `client_action_id` e obrigatorio em toda acao de sync.
- A fila de OS usa `POST /api/v1/mobile/sync/work-order-actions` para `work_order.create`, `work_order.status_change` e `work_order.assign`; approval/evidence continuam fora do replay B-107.
- Recibos nao devem aparecer em logs.
- Conflito nao pode ser resolvido silenciosamente.
- UI pode esconder acoes, mas backend continua sendo a autoridade.

## Telas funcionais minimas

1. Login/Dev Session simples.
2. Home modular por tenant/modulos/permissoes.
3. Gestao de Despesas - lista.
4. Nova Prestação de Contas.
5. Detalhe Prestação de Contas.
6. Adicionar item.
7. Resumo para envio.
8. Diagnostico de sync.

## Testes esperados

- Home mostra `expense_management` quando modulo e permissao existem.
- Home nao mostra modulo sem permissao.
- Prestação de Contas calcula total e diferenca de adiantamento.
- Violacao de politica aparece para recibo obrigatorio ou limite excedido.
- Sync status aparece no diagnostico.
- `tenant_id` e obrigatorio nas acoes locais.

## B-107 - Criacao remota de OS e conflitos manuais

- OS criada no aparelho nasce com `localId`, sem `serverId`, e gera `work_order.create`.
- `WorkOrderSyncReplayService` processa criacoes antes de `statusUpdate`.
- `accepted` e `already_applied` exigem um ID remoto e gravam `localId -> serverId`.
- Acoes dependentes recebem `server_id` e ficam elegiveis somente depois do mapeamento.
- Rejeicao ou erro de rede preserva a OS local e registra erro seguro.
- Conflitos nao sao reenviados silenciosamente. O detalhe da OS permite manter local e tentar novamente, aceitar o estado do servidor quando existe referencia remota ou marcar para revisao manual.
- O payload remoto nao envia tenant, token, Authorization, path, base64, `file_data` ou `local_path`.
- Approval real e `evidence_attach` dentro do sync de OS continuam fora do escopo.
- KPIs nao foram alterados nesta PR; valores propostos ficam apenas no relatorio final.

## B-109 - Estados de aprovacao

O mobile nao decide aprovacoes no B-109. O parser passa a tolerar
`pending_approval`, `approved` e `rejected`, incluindo o mapeamento
`pending_approval -> WorkOrderStatus.pendingApproval`.

`MobileApprovalState` le somente ID opaco, entidade, status, `safe_message` e
motivo seguro. `ApprovalDecisionPayload` documenta a allowlist futura de
decisao (`note` ou `reason`) sem tenant, token, Authorization, path, base64,
`file_data` ou `local_path`.

Evidencias e checklists locais continuam preservados em rejeicao ou falha. O
fluxo de decisao permanece exclusivo da UI web neste bloco.

## B-121 - Hardening mobile MVP (timeline, auto-sync, adapter, base URL)

- Detalhe/check-in busca a timeline real (GET /work-orders/:id/timeline) quando ha
  id de servidor; em falha (rede/timeout/404/403) cai para o cache local, sem
  stack trace e sem quebrar a tela (timeline vazia tambem e tratada).
- Auto-sync montado no root do app: o listener offline->online passa a existir
  globalmente (antes so era armado ao abrir Sync/Perfil), preservando a ordem
  segura de replay. Sem sessao valida, o coordinator ignora o sync.
- O adapter de render de checklist aceita tanto `fields` quanto `components`
  (orderIndex->order, type/componentKey->type). Tipo desconhecido vira
  `unsupported` e a tela mostra "Componente nao suportado nesta versao do app.".
- A base URL da API e configuravel em build/CI:
  `--dart-define=API_BASE_URL=https://.../api/v1` (default: localhost do emulador,
  para dev/test sem rede real).
