# PROMPT DE EXECUÇÃO — RODADA Ω4C (Controle & Frota, referência AutEM)

Você está no repositório `thiagodorgo/ERP_Techsolutios` (monólito Node.js/TypeScript + Express + Prisma; frontend React/Vite/Tailwind/shadcn-ui; mobile Flutter; multi-tenant). Toda documentação, comentários e arquivos de governança em **PT-BR**.

---

## 0. Contexto
- Rodadas anteriores: Ω3F Fase 1 concluída (hub de OS, itens financeiros, orçamentos, comentários/anexos de OS, cancelamento, duplicar, impressão configurável, km por OS, timeline mobile, aba mapa, aba auditoria, ações de despacho). Ω3F Fase 2 planejada (venda estoque→OS, tags, ocorrências, colunas configuráveis + export Excel, compartilhamento de checklist, bases/pátios, recorrência).
- Esta rodada implementa a paridade com o menu **Controle** do sistema de referência AutEM, conforme `ANALISE_VIDEOS_AUTOEM.md` e `PLANO_OMEGA4C.md` (anexos desta rodada — copie-os para `docs/rodadas/omega4c/`).
- Governança vigente: juntas aprovam e seguem autonomamente entre PRs; toda decisão relevante vira arquivo `D-xxx`; KPI versionado por PR (D-KPI-PER-PR); contratação de serviço externo exige aprovação unânime de junta de 5 (D-SAN-AUTONOMIA).

## 1. Objetivo (verificável)
Entregar os PRs PR-00 a PR-20 do PLANO_OMEGA4C, com todas as RNs deste prompt implementadas, testes passando, KPIs atualizados por PR e ata final da junta. Fidelidade **comportamental** ao AutEM; visual segue o design system do ERP e o Figma `jcAfyvMExRmHenoe3TO08q`.

## 2. Governança e agentes (executar ANTES de qualquer código)
1. Criar o arquivo de junta `docs/juntas/J-OMEGA4C.md` com composição, mandato, critérios de aprovação e cronograma.
2. **Fábrica de agentes — criar SOMENTE estes agentes efêmeros**, cada um com bloco de autodocumentação de expiração no próprio arquivo do agente (`expira ao encerramento da rodada Ω4C; deve ser deletado na Fase de Encerramento`):
   - `omega4c-planejador` — decompõe PRs, mantém plano e dependências.
   - `omega4c-dev-backend` — Prisma/Express/serviços.
   - `omega4c-dev-frontend` — React/shadcn/telas e modais.
   - `omega4c-dev-mobile` — Flutter/telemetria.
   - `omega4c-avaliador` — revisão de código, testes, RNs e KPIs; veto bloqueante.
3. **PROIBIDO**: criar agentes além destes; modificar, renomear ou deletar QUALQUER agente pré-existente (incluindo os da Junta de Mapas). No encerramento, deletar **apenas** os cinco acima e registrar a deleção na ata.
4. Mapa (Rastreamento, PR-18): a implementação do mapa é **delegada à Junta de Mapas** existente — este time entrega o contrato de dados e a integração, não reimplementa componente de mapa.

## 3. Escopo permitido
- `prisma/schema.prisma` + novas migrations (aditivas).
- Novos módulos backend em `src/modules/{fueling,maintenance,fines,insurance,damages,stock,remuneration,notifications,attachments,statement,telemetry,audit-sessions}` (adaptar aos caminhos reais encontrados na Fase 0).
- Novas páginas/rotas frontend sob `Controle` e componentes compartilhados novos.
- App Flutter: novo serviço de telemetria + hooks nos fluxos de login/logout/recusa.
- `docs/rodadas/omega4c/**`, `docs/decisoes/D-*.md`, `docs/juntas/J-OMEGA4C.md`, KPIs.

## 4. Escopo proibido
- Tocar em módulos de OS, financeiro e estoque além dos pontos de integração explicitados; qualquer refactor oportunista.
- Remover/alterar endpoints existentes (191) ou models existentes de forma destrutiva (sem `DROP`, sem rename de coluna em uso).
- Secrets, `.env`, infra AWS, CI. Contratar serviço externo sem junta (D-SAN-AUTONOMIA).
- `git add .` — stage sempre por caminho. **Não fazer push nem abrir PR antes da aprovação registrada da junta para aquele PR**; nunca push direto na `main`; merge só com checks verdes.
- Copiar assets, textos longos, logotipos ou CSS do AutEM (referência comportamental, não clone).

## 5. Fase 0 — Investigação obrigatória (PR-00, antes de codar)
Executar e registrar em `docs/rodadas/omega4c/FASE0_RECON.md`:
1. `git status --short`; se houver WIP, commit local de segurança antes de qualquer coisa.
2. Mapear: middleware de tenant e convenção `tenantId` nos models; enum/UF de moeda e datas; padrão de service/controller/rota; validação (zod?); como o financeiro modela **contas a pagar** (nome do model, campos, status); anexos de OS (model e storage S3); auditoria existente (aba da OS); autenticação/sessões (JWT? refresh? Cognito?); cadastro de profissional (regras de comissão/tabela de valores); estoque existente ou previsto no Ω3F P2; padrão de impressão configurável do Ω3F P1; export Excel/colunas configuráveis (existe ou entra aqui?).
3. Buscar termos: `payable|contasAPagar`, `attachment|anexo`, `audit`, `commission|comissao`, `stock|estoque`, `session|refresh`.
4. Produzir tabela "existe / estende / cria" ratificando o gap do PLANO. Divergências viram `D-Ω4C-RECON-xx`.
5. Verificar os 7 pontos abertos da seção 11 da ANALISE; quando não confirmável, decidir e registrar D-record.

## 6. Requisitos técnicos — Backend (Prisma campo a campo)
Regras gerais: todo model novo tem `id (uuid) · tenantId (obrigatório, primeiro em todo índice composto) · createdAt · updatedAt · createdById`; enums em inglês, labels PT-BR no front; dinheiro `Decimal(12,2)`; km `Decimal(10,1)`; soft-delete apenas onde indicado; toda escrita registra no log de auditoria global (seção 6.10).

### 6.1 Anexos genéricos (PR-01)
```prisma
model Attachment {
  id String @id @default(uuid())
  tenantId String
  entityType AttachmentEntity // DAMAGE | MAINTENANCE | FINE | INSURANCE | FUELING | STOCK_ITEM | ...extensível
  entityId  String
  fileKey   String   // S3
  fileName  String
  extension String
  sizeBytes Int
  uploadedById String
  createdAt DateTime @default(now())
  @@index([tenantId, entityType, entityId])
}
```
Endpoints: `POST /attachments (multipart) · GET /attachments?entityType&entityId · GET /attachments/:id/download · DELETE /attachments/:id`. Reaproveitar o client S3 dos anexos de OS.
**RN-ANX-01**: aba Arquivos só disponível após o registro pai existir. **RN-ANX-02**: listagem exibe `Data e Hora | Extensão | Tipo` + download.

### 6.2 Integração Contas a Pagar (PR-02)
Adicionar ao model de título existente: `sourceType PayableSource? (FUELING|MAINTENANCE|FINE|INSURANCE|MANUAL...) · sourceId String?` + `@@index([tenantId, sourceType, sourceId])`.
Service `payableIntegration.createFromSource(...)` / `removeBySource(...)`. Endpoints por módulo: `POST /:module/:id/payable` e `DELETE /:module/:id/payable`.
**RN-FIN-01**: cada origem gera no máx. 1 título ativo. **RN-FIN-02**: badge "lançado no contas a pagar" = existência de título ativo. **RN-FIN-03**: excluir a origem com título ativo exige remoção prévia do título (409 com mensagem clara).

### 6.3 Extrato do Profissional (PR-03)
```prisma
model ProfessionalStatementEntry {
  id String @id @default(uuid())
  tenantId String
  professionalId String
  sourceType StatementSource // DAMAGE | FINE | REMUNERATION | ADJUSTMENT
  sourceId String?
  description String
  amount Decimal // negativo = desconto; positivo = crédito
  installmentNumber Int @default(1)
  installmentTotal  Int @default(1)
  dueDate DateTime
  settledAt DateTime?
  @@index([tenantId, professionalId, dueDate])
  @@index([tenantId, sourceType, sourceId])
}
```
**RN-EXT-01 (trava AutEM ✓)**: enquanto existir parcela de uma origem no extrato, a origem não pode ser excluída nem ter valores/parcelas alterados; API responde 409 com a mensagem: "O valor já se encontra no extrato do profissional. Remova todas as parcelas antes de excluir ou alterar." **RN-EXT-02**: "retirar do extrato" remove todas as parcelas **não liquidadas** da origem; se houver parcela liquidada, bloquear. **RN-EXT-03**: lançamento cria N parcelas mensais a partir da data informada.

### 6.4 Motor de Notificações (PR-04, tela no PR-20)
```prisma
model SystemNotification {
  id String @id @default(uuid())
  tenantId String
  title String
  message String
  notifyAt DateTime          // data/hora alvo
  remindBefore Int           // minutos de antecedência
  visibility NotificationVisibility // PRIVATE | PUBLIC | CUSTOM
  recipients NotificationRecipient[] // quando CUSTOM
  sourceType NotificationSource // MANUAL | MAINTENANCE | FINE | INSURANCE | PAYABLE
  sourceId String?
  firedAt DateTime?
  createdById String
  @@index([tenantId, notifyAt])
}
```
Scheduler node-cron (1 min) idempotente: dispara quando `now >= notifyAt - remindBefore` e `firedAt IS NULL`; entrega no sino (in-app) para: PRIVATE→criador; PUBLIC→todos os usuários do tenant; CUSTOM→recipients. Endpoints CRUD + `GET /notifications/feed`.
**RN-NOT-01**: popup reutilizável de criação recebe `sourceType/sourceId` e pré-preenche título/mensagem. **RN-NOT-02**: manutenção pode criar notificação por **tempo** (notifyAt) ou por **quilometragem** (ver RN-MAN-06).

### 6.5 Abastecimento (PR-05/06)
```prisma
model Fueling {
  id String @id @default(uuid())
  tenantId String
  vehicleId String
  professionalId String
  fueledAt DateTime
  stationType FuelStation // INTERNAL | EXTERNAL
  supplierId String?      // EXTERNAL: fornecedor
  stockItemId String?     // INTERNAL: item combustível
  fuelType String         // ex. ETANOL/GASOLINA/DIESEL (select de domínio)
  liters Decimal
  unitPrice Decimal
  totalPrice Decimal
  odometerKm Decimal
  ignoreLastKm Boolean @default(false) // "Desconsiderar último KM"
  notes String?
  @@index([tenantId, vehicleId, fueledAt])
}
```
**RN-ABA-01**: INTERNAL exige `stockItemId` (item com flag combustível) e gera `StockMovement EXIT` da BASE na quantidade de litros; EXTERNAL exige `supplierId`. **RN-ABA-02**: `totalPrice = liters × unitPrice` (recalcular no back). **RN-ABA-03**: validar `odometerKm >` último hodômetro conhecido da viatura, exceto se `ignoreLastKm`. **RN-ABA-04**: coluna **KM/L** da listagem = (odômetro atual − odômetro do abastecimento anterior da viatura) ÷ litros; primeiro abastecimento exibe "—". **RN-ABA-05**: checkbox contas a pagar usa 6.2. Endpoints: CRUD + `GET /fuelings` com filtros (período, viatura, profissional, posto).

### 6.6 Manutenção (PR-07/08)
```prisma
model MaintenanceOrder {
  id String; tenantId String
  vehicleId String; date DateTime; odometerKm Decimal?
  documentNumber String?; supplierId String; notes String?
  items MaintenanceItem[]
  @@index([tenantId, vehicleId, date])
}
model MaintenanceItem {
  id String; tenantId String; maintenanceOrderId String
  kind MaintenanceItemKind // SERVICE | PRODUCT | STOCK
  stockItemId String?      // quando STOCK
  description String
  unitPrice Decimal; quantity Decimal; totalPrice Decimal
  notes String?
}
```
**RN-MAN-01**: fluxo em duas etapas — criar cabeçalho, depois grid de itens no mesmo modal (modo edição). **RN-MAN-02**: totalizadores `Total Produtos | Total Serviços | Total` (STOCK conta como produto). **RN-MAN-03 (✓)**: ao selecionar viatura, se existir abastecimento anterior, oferecer toast "Encontramos abastecimento em {data} com hodômetro {km}. Deseja preencher?" → botão preenche `odometerKm`. **RN-MAN-04**: item STOCK gera `StockMovement EXIT` da BASE. **RN-MAN-05**: ao adicionar item, perguntar "Deseja ser notificado da próxima manutenção deste item?"; **RN-MAN-06**: se por tempo → cria SystemNotification; se por quilometragem → grava `nextKmReminder` no item e um job diário compara com o último hodômetro (abastecimentos/manutenções) da viatura, disparando notificação ao atingir. **RN-MAN-07**: impressão da ordem de manutenção usa o motor de impressão configurável do Ω3F. Contas a pagar via 6.2 pelo total.

### 6.7 Multas (PR-09)
```prisma
model TrafficFine {
  id String; tenantId String
  vehicleId String
  infractionNumber String        // auto de infração
  infractionAt DateTime
  driverIndicationDeadline DateTime
  city String; state String; address String?
  description String?
  severity FineSeverity // LIGHT(3) | MEDIUM(4) | SERIOUS(5) | VERY_SERIOUS(7)
  points Int            // derivado da severidade (3/4/5/7)
  driverId String?      // condutor (profissional)
  driverLiable Boolean  // condutor responsável?
  installments Int @default(1)
  dueDate DateTime?
  amount Decimal
  amountPaid Decimal?
  notes String?
  @@unique([tenantId, infractionNumber])
  @@index([tenantId, vehicleId, infractionAt])
}
```
**RN-MUL-01 (fluxo central)**: `driverLiable=true` → habilita "lançar no extrato do profissional" (6.3, parcelas + vencimento); `false` → habilita contas a pagar (6.2). Ambas reversíveis na edição ("retirar"). **RN-MUL-02**: natureza exibida com pontos ("MÉDIA (4 PONTOS)"). **RN-MUL-03**: município autocomplete cidade-UF. **RN-MUL-04**: notificação de vencimento via 6.4 (`sourceType FINE`). **RN-MUL-05**: pesquisa por data da infração, vencimento, viatura, profissional e nº do auto. **RN-MUL-06**: impressão da multa.

### 6.8 Seguros (PR-09)
```prisma
model VehicleInsurance {
  id String; tenantId String
  vehicleId String; insurerId String // Clientes e Fornecedores
  policyNumber String?; bonusClass String?
  validUntil DateTime; amount Decimal; notes String?
  @@index([tenantId, vehicleId, validUntil])
}
```
**RN-SEG-01**: contas a pagar opcional (6.2). **RN-SEG-02**: notificação de vencimento (6.4). **RN-SEG-03**: aba Arquivos p/ apólice (6.1).

### 6.9 Danos (PR-12/13)
```prisma
model DamageRecord {
  id String; tenantId String
  occurredAt DateTime
  damageType DamageType // INTERNAL | EXTERNAL | BOTH
  origin DamageOrigin   // COLLISION | FINE | OTHER
  professionalId String
  status DamageStatus   // UNDER_REVIEW | CLOSED_WITH_COMPENSATION | CLOSED_WITHOUT_COMPENSATION
  linkedToService Boolean @default(false)
  serviceProtocol String?      // protocolo da OS quando vinculado
  linkedToVehicle Boolean @default(false)
  vehicleId String?
  objectName String            // ex. RETROVISOR
  objectCondition String       // ex. QUEBRADO
  totalAmount Decimal
  professionalAmount Decimal?  // valor a descontar
  installments Int @default(1)
  firstDiscountDate DateTime?
  description String?
  internalAnalysis String?     // não sai na impressão
  @@index([tenantId, professionalId, occurredAt])
}
```
**RN-DAN-01**: "lançar no extrato" cria parcelas via 6.3; alerta amarelo e trava conforme RN-EXT-01 (mensagem idêntica à do AutEM ✓). **RN-DAN-02**: impressão em duas variantes — **com** e **sem parágrafo de ciência** (bloco de assinatura do profissional); `internalAnalysis` nunca sai. **RN-DAN-03**: `linkedToService` exige protocolo válido de OS; `linkedToVehicle` exige `vehicleId`. **RN-DAN-04**: aba Arquivos (6.1).

### 6.10 Estoque — custódia e movimentos (PR-10/11)
Estender o item de estoque (criar se Fase 0 não encontrar): `code Int · kind StockKind(PRODUCT|EQUIPMENT) · name · unit(UNIT|LITERS|METERS|KG) · minQty · maxQty · purchasePrice? · salePrice? · description? · isFuel Boolean · active Boolean`.
```prisma
model StockMovement {
  id String; tenantId String; stockItemId String
  type StockMovementType // ENTRY | EXIT | LINK | UNLINK
  custody CustodyType    // BASE | PROFESSIONAL | VEHICLE
  custodyId String?      // professionalId ou vehicleId
  quantity Decimal
  unitPrice Decimal?
  invoiceNumber String?
  supplierId String?     // ENTRY
  exitKind String?       // EXIT: venda direta etc. (domínio a confirmar na Fase 0)
  movedAt DateTime
  sourceType String?; sourceId String? // FUELING, MAINTENANCE, SERVICE_ORDER
  @@index([tenantId, stockItemId, movedAt])
}
```
Saldos derivados: `qtyBase = ENTRY − EXIT(BASE) − LINK + UNLINK`; `qtyByProfessional/Vehicle = LINK − UNLINK − EXIT(custódia)`; nunca negativos (validar). **RN-EST-01**: EQUIPMENT não tem preços nem venda. **RN-EST-02**: cadastro não cria saldo; só ENTRY. **RN-EST-03**: venda de item em OS vinculada a profissional gera EXIT da custódia dele (integração com Ω3F P2). **RN-EST-04**: inativar bloqueia novos usos e preserva histórico; excluir só sem movimentos. **RN-EST-05**: aba Resumo expõe `qtyBase/qtyProfessional/qtyVehicle` + tabelas por nome. **RN-EST-06**: excluir movimento (✕) recalcula saldos com validação de não-negatividade.

### 6.11 Remunerações (PR-14/15)
No registro de serviço/OS (estender, não recriar): `remunerationRule RemunRule(DEFAULT|FIXED|COMMISSION|NONE) @default(DEFAULT) · remunerationValue Decimal? · remunerationSettledAt DateTime? · remunerationSettlementId String?`.
```prisma
model RemunerationSettlement {
  id String; tenantId String
  professionalId String
  periodStart DateTime; periodEnd DateTime
  totalAmount Decimal; serviceCount Int; totalKm Decimal
  settledById String; settledAt DateTime @default(now())
}
```
**RN-REM-01**: valor calculado — DEFAULT usa a regra do cadastro do profissional (tabela de valores ou comissão fixa, conforme Fase 0); FIXED usa `remunerationValue`; COMMISSION aplica % sobre o valor do serviço; NONE = 0 com indicador. **RN-REM-02**: bolinha vermelha = `settledAt NULL`; verde = liquidado. **RN-REM-03**: engrenagem aplica regra em massa nas linhas selecionadas. **RN-REM-04**: liquidar cria Settlement, carimba os serviços e **lança crédito no extrato (6.3, sourceType REMUNERATION)**. **RN-REM-05**: liquidado é imutável (regra/valor) — estorno só via ação explícita que remove o settlement e o crédito não pago. **RN-REM-06**: totalizadores (valor, qtd serviços, km) e painel de conferência por serviço (valor da saída, valor do km, etapas/adicionais, repasse). **RN-REM-07**: grid com seletor de colunas + export Excel reaproveitando o padrão Ω3F P2; impressão.

### 6.12 Telemetria mobile (PR-16/17/18)
```prisma
model MobileAccessLog { id; tenantId; professionalId; event MobileEvent(CONNECT|DISCONNECT); occurredAt DateTime; deviceModel String?; appVersion String?; @@index([tenantId, professionalId, occurredAt]) }
model TelemetryPoint { id; tenantId; professionalId; capturedAt DateTime; lat Float; lng Float; accuracyM Float; speedKmh Float?; batteryPct Int?; signalType String?; @@index([tenantId, professionalId, capturedAt]) }
model DailyMileage { id; tenantId; professionalId; date DateTime; distanceKm Decimal; points Int; avgAccuracyM Float; avgSpeedKmh Float; @@unique([tenantId, professionalId, date]) }
model ServiceRefusal { id; tenantId; serviceOrderId; professionalId; serviceDate DateTime; refusedAt DateTime; status RefusalStatus(REFUSED|SENT_TO_OTHER); forwardedToId String?; @@index([tenantId, refusedAt]) }
model MobileDevice { id; tenantId; professionalId; plate String?; appVersion String; deviceModel String; sdkInt Int; username String; connected Boolean; lastSignalAt DateTime; @@unique([tenantId, professionalId]) }
```
Ingestão: `POST /mobile/telemetry/batch` (array de pontos, auth do app) · `POST /mobile/access-events` · upsert de MobileDevice a cada batch/login. Job diário consolida `DailyMileage` (haversine entre pontos consecutivos, descartar `accuracyM > 50` e saltos > 150 km/h). Recusa: o fluxo de recusa existente no app passa a criar `ServiceRefusal`; reenvio a outro profissional atualiza `status/forwardedToId`.
**RN-TEL-01**: telas web exibem o disclaimer azul de confiabilidade (texto próprio, mesmo teor). **RN-TEL-02**: Quilometragem com linha de agregados (Total distância; médias de precisão, velocidade e pontos). **RN-TEL-03**: Rastreamento — painel lateral (profissional, período ≤ 24 h, "Exibir pontos", Procurar) + mapa (contrato entregue à Junta de Mapas: lista ordenada de pontos → markers + polyline). **RN-TEL-04**: Usuários/dispositivos com badge de versão (verde=atual, laranja=desatualizada, vermelho=inválida; "atual" = maior versão vista no tenant).

### 6.13 Acessos, Logs e Sessões (PR-19)
- **Acessos web**: reutilizar/registrar `lastLoginAt` por usuário + histórico (`UserAccessLog{userId, loginAt, ip?}`), busca por período/usuário.
- **Logs globais**: estender o mecanismo de auditoria do Ω3F para middleware global de escrita → `AuditLog{tenantId, userId, operation(CREATE|UPDATE|DELETE), entityType, entityId, summary, occurredAt}` + tela com filtros (operação, usuário, período, entidade). Não logar payloads sensíveis (senhas, tokens).
- **Sessões**: `UserSession{userId, createdAt, lastActivityAt, revokedAt?, device?}`; tela lista tempo logado; ✕ chama `POST /sessions/:id/revoke` → invalida refresh token (blocklist/rotação conforme auth encontrado na Fase 0); próximo request do usuário força novo login.

## 7. Frontend (React/shadcn) — padrões obrigatórios
- Rotas: `/controle/frota/{abastecimentos,manutencoes,multas,seguros}` · `/controle/{danos,estoque,remuneracoes,notificacoes}` · `/controle/mobile/{acessos,quilometragem,rastreamento,recusas,dispositivos}` · `/controle/usuarios/{acessos,logs,sessoes}`. Sidebar/menu conforme IA do ERP (não copiar navbar do AutEM).
- Componentes compartilhados novos: `EntityAttachmentsTab` (Detalhes do Registro + tabela + upload), `NotificationDialog` (data/hora, antecedência, visibilidade PRIVADA/PÚBLICA/PERSONALIZADA c/ multiselect, título, mensagem), `PayableToggle` (checkbox no create + botão lançar/retirar no edit c/ badge), `StatementLaunchButton` (com estado bloqueado + alerta amarelo), `MoneyInput`, `OdometerInput`.
- Modais de cadastro/edição com seções tituladas; criação com `Continuar cadastrando`; edição com `Excluir` (confirm) à esquerda e `Salvar` à direita; sub-modais de movimento/item com acento visual distinto (equivalente ao laranja do AutEM dentro do DS).
- Listagens: ordenação, paginação servidor, filtros; Remunerações abre com o dialog de filtro; demais telas com filtro recolhido (D-Ω4C-MODAL-PESQUISA).
- Estados: loading skeleton, vazio "Nenhum registro encontrado…", erro com retry; toasts de sucesso.
- Máscaras/validação espelhando as RNs (ex.: total = qtde × unitário recalculado ao digitar; check verde em datas válidas).

## 8. Testes obrigatórios (mínimo por PR)
- Unit (services): KM/L e validação de hodômetro (RN-ABA-03/04); saldos de estoque com não-negatividade e exclusão de movimento (RN-EST-06); cálculo de remuneração pelas 4 regras; parcelas do extrato e trava (RN-EXT-01/02); severidade→pontos; haversine + filtros de precisão do DailyMileage; idempotência do scheduler de notificações.
- Integração (supertest): fluxo condutor responsável SIM/NÃO da multa; abastecimento interno gerando EXIT de estoque; manutenção → contas a pagar; revogação de sessão bloqueando request seguinte; **isolamento multi-tenant com 3 tenants seed** em todos os novos endpoints.
- Frontend: testes dos componentes compartilhados (NotificationDialog, EntityAttachmentsTab) e do fluxo criar→itens da Manutenção.
- Flutter: unit do buffer/flush de telemetria e `flutter analyze` + `flutter test` limpos.

## 9. KPIs e documentação (por PR — D-KPI-PER-PR)
Atualizar `docs/kpis/omega4c/KPI_PR-XX.json` + histórico + snapshot: RNs cobertas/total do PR, endpoints novos, models novos, cobertura de testes do módulo, tempo de execução da suite. Cada decisão não prevista → `docs/decisoes/D-Ω4C-*.md`. Atualizar o handoff de backend da rodada.

## 10. Validações (executar antes de cada aprovação da junta)
```
npx prisma validate && npx prisma migrate diff --from-migrations --to-schema-datamodel prisma/schema.prisma
npm run lint && npm run build && npm test
cd frontend && npm run lint && npm run build && npm test
cd mobile && flutter analyze && flutter test
git status --short   # sem arquivos fora do escopo
```

## 11. Fluxo por PR e relatório final
Para cada PR: (a) planejador publica plano curto no J-OMEGA4C; (b) dev implementa; (c) avaliador roda a seção 10 e confere RNs; (d) junta registra aprovação; (e) commit(s) atômicos com mensagem `feat(omega4c): PR-XX — <entrega>` (sem WIP), push da branch `rodada/omega4c`, PR aberto com o template abaixo; (f) seguir ao próximo PR sem aguardar humano, salvo veto do avaliador.
**Template de relatório do PR**: Objetivo · Arquivos alterados · Models/endpoints criados · RNs implementadas (checklist RN-xxx) · Decisões (D-refs) · Testes e resultados das validações · Divergências em relação ao AutEM e justificativa · KPI anexado.

## 12. Encerramento da rodada
Ata final em `docs/juntas/J-OMEGA4C.md` (entregas, KPIs consolidados, pendências → backlog Ω5); deletar **somente** os cinco agentes efêmeros da seção 2, registrando cada deleção; conferir que nenhum agente pré-existente foi tocado; marcar D-records como vigentes.

Não faça merge sem checks verdes e aprovação registrada da junta. Não altere nada fora do escopo permitido.
