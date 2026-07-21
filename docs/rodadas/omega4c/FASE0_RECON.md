# FASE 0 — Reconhecimento do Repositório (PR-00) · Rodada Ω4C "Controle & Frota"

> **Entrega:** ata de reconhecimento da Fase 0 do PLANO_OMEGA4C (§3, PR-00).
> **Fontes:** `docs/rodadas/omega4c/PLANO_OMEGA4C.md`, `docs/rodadas/omega4c/ANALISE_VIDEOS_AUTOEM.md`, varredura por subsistema do repo (10 áreas de recon).
> **Princípio (herdado do Ω3F):** fidelidade **comportamental** ao AutEM v2.2.1, adaptando o visual ao design system do ERP Techsolutions. Backend é a autoridade de autorização; UI só molda.
> **Regra de citação:** todo veredicto é ancorado em `arquivo:linha` dos achados de recon. Onde o recon não cobriu ou ficou incerto, está marcado **"validar no PR correspondente"** — não é afirmação de fato.

---

## 1. Resumo executivo

A varredura do repositório **contradiz materialmente o gap estimado do PLANO §1**. O plano foi escrito com a ressalva explícita "estimado — Fase 0 confirma", e a Fase 0 confirma que **o repo está muito mais adiantado do que o plano assumiu**. Os achados mudam a natureza de **8 das 13 linhas** do gap:

1. **A fundação transversal está pronta e madura.** Middleware de tenant, `withTenantRls`, cadeia `attachAuthenticatedActor + tenantContextMiddleware`, RLS `ENABLE/FORCE/POLICY` por model, esqueleto canônico de 9 arquivos por módulo, `Decimal` para dinheiro, e teste de isolamento cross-tenant já existem. **Ω4C não cria infra transversal** — replica padrões conhecidos.

2. **Cinco módulos que o plano marcou "Inexistente/Criar" JÁ EXISTEM** como módulo + model + rotas: **Abastecimento** (`fuel-logs`), **Manutenção** (`maintenance-orders`), **Multas** (`fines`), **Seguros** (`insurance-policies`) e **Danos** (`damages`). O veredicto real destes cinco é **ESTENDER**, não CRIAR. Idem **Frota/Viaturas** (`vehicles`), **Clientes** (`customers`) e **Fornecedores** (`suppliers`), e o **Motor de Notificações** (`notifications` + `fleet-alerts.runner.ts`).

3. **Duas premissas do plano são FALSAS e precisam de correção:**
   - **"reaproveitar colunas configuráveis + export Excel do Ω3F P2"** (PLANO §1 linha Remunerações, §3): o Ω3F P2 **NÃO** entregou seletor de colunas nem `.xlsx` — só **CSV hand-rolled com BOM** e colunas estáticas. PR-15 é **maior** que o estimado.
   - **"motor de notificações inexistente"**: existe motor parcial e idempotente; falta só `notify_at/remind_before/visibility` + scheduler automático.

4. **O que é genuinamente novo (CRIAR):** Extrato do Profissional (`ProfessionalStatement` como razão financeira parcelada com trava de integridade), ingestão de **Telemetria mobile** (heartbeat/km/recusas/dispositivos), o **seletor de colunas** e o compute de **liquidação em lote** de Remunerações (a rota `settle` e o cálculo, não os models).

5. **Fronteiras irredutíveis mapeadas:** qualquer toque em `prisma/**` exige autorização explícita do bloco (C4); S3 real e qualquer lib nova (`node-cron`, `exceljs`) disparam junta-5 + PD (C7); nenhuma migration destrutiva (parada irredutível C7.5). O scheduler in-process (`job.worker.ts:86`) já existe e evita `node-cron`.

**Consequência para o plano:** rebaixar PR-04..PR-09 de CRIAR para ESTENDER, e re-dimensionar PR-15 para cima (ver §6). Nenhuma linha vira "nada a fazer" — todas têm trabalho aditivo real.

---

## 2. Tabela de gap ratificada (13 linhas do PLANO §1)

Legenda de Ação: **EXISTE-reusar** (só reaproveitar) · **ESTENDER** (aditivo sobre o que há) · **CRIAR** (novo). "Ação plano" = o que o PLANO §1 estimou; "Ação real" = veredicto da Fase 0.

| # | Capacidade AutEM | Situação real no ERP | Ação plano → **real** | Reuso / ancoragem (`arquivo:linha`) |
|---|---|---|---|---|
| 1 | Anexos por entidade (aba Arquivos) | **Parcial** — existe acoplado por FK a OS/Dano/Checklist | Estender → **ESTENDER** | Clonar triplo `work-order-attachment.{types,storage,service,dto,repository}` + `damage-attachment.storage.ts`; REUSAR storage de checklist (`checklists/storage/*`, local+S3 prontos) e `evidence-storage.ts` (AV-scan). Models `schema.prisma:964` (WOAttachment), `:991` (DamageAttachment), `:678` (ChecklistAttachment). DTO allowlist `work-order-attachment.dto.ts:11`. Novo model `Attachment{entityType,entityId}` com `@@index([tenant_id, entity_type, entity_id])`. |
| 2 | Contas a pagar (origem→título) | **Parcial** — título a pagar maduro; falta `sourceType/sourceId` genérico | Estender → **ESTENDER** | Clonar par `createForWorkOrder` (`financial-title.service.ts:118`) + `findActiveByWorkOrder` (`:142`); índice UNIQUE parcial de idempotência da migration `20260811000000` (`schema.prisma:1472-1474`). `direction='payable'` já em `financial-title.types.ts:9`; colunas dedicadas `work_order_id/service_quote_id` (`schema.prisma:1456-1457`). Soft-delete = "retirar do contas a pagar". CHOKEPOINT `assertPeriodOpen` (`financial-title.service.ts:281`). |
| 3 | Extrato do profissional (descontos/créditos em folha) | **Não** (como razão financeira dedicada) | Criar → **CRIAR** | Sem `ProfessionalStatement` no repo — genuinamente novo. Ancorar em: esqueleto `operator-profiles` (template), `Decimal` p/ valores, chokepoint `assertPeriodOpen`, e o padrão de parcelas. Trava de integridade Dano/Multa→Extrato (ANALISE:129,287). **Testes de integridade antes da UI** (PLANO §5). |
| 4 | Motor de notificações agendadas c/ visibilidade | **Parcial** — motor idempotente existe; falta agendamento/visibilidade | Criar → **ESTENDER** | Model `Notification` (`schema.prisma:278`), idempotência `@@unique([tenant_id, recipient_user_id, idempotency_key])` (`:299`); `fleet-alerts.runner.ts` + 4 produtores `.notifications.ts` (DEFAULT_WINDOW_DAYS=7); scheduler in-process `job.worker.ts:86` (setInterval poll). Faltam: `notify_at`, `remind_before`, visibilidade PRIVATE/PUBLIC/CUSTOM, CRUD de agendamento. **NÃO introduzir `node-cron`.** |
| 5 | Abastecimento | **Sim** (módulo completo) | Criar → **ESTENDER** | Módulo `fuel-logs/` + model `FuelLog` (`schema.prisma:820`), FK composta `[tenant_id, vehicle_id]` (`:839`). Faltam: `supplier_id` (posto externo), baixa de combustível do estoque (flag), anexos, lançamento em contas a pagar posterior. |
| 6 | Manutenção de frota | **Sim** (módulo completo) | Criar → **ESTENDER** | Módulo `maintenance-orders/` + `maintenance-order.notifications.ts`. Faltam: grid de itens+totais, sugestão de hodômetro a partir do último abastecimento (ANALISE:183), popup próxima manutenção, impressão. |
| 7 | Multas (CTB, condutor responsável) | **Sim** (módulo completo) | Criar → **ESTENDER** | Módulo `fines/` (`fine.types.ts`, `fine-prisma.repository.ts`, `fine.notifications.ts`). Faltam: regra `condutor responsável=SIM→extrato / NÃO→contas a pagar` (ANALISE:224), notificação de vencimento, impressão. Enums em app sem CHECK (`fine.types.ts`). |
| 8 | Seguros de viatura | **Sim** (módulo completo) | Criar → **ESTENDER** | Módulo `insurance-policies/` + `insurance-policy.notifications.ts`. Faltam: seguradora via `supplier_id`, badge "lançado em contas a pagar", notificação de vencimento, upload da apólice. |
| 9 | Danos c/ desconto parcelado + termo de ciência | **Sim** (módulo) / **parcial** (parcelas→extrato) | Criar → **ESTENDER** | Módulo `damages/` (`damage-prisma.repository.ts`, `damage-attachment.storage.ts`), model Damage `schema.prisma:932` (DamageAttachment `:991`). Faltam: parcelas→Extrato, alerta amarelo/trava de exclusão (ANALISE:129), impressão com/sem parágrafo de ciência, vínculo assistência/viatura. |
| 10 | Estoque custódia BASE/PROF/VIATURA + movimentos | **Parcial** — ledger existe; falta custódia | Estender → **ESTENDER** | Módulo `inventory/` — ledger IMUTÁVEL (`inventory.routes.ts:84-88`), saldo DERIVADO (`inventory.calculations.ts:48-51`), custo médio móvel (`:17-30`), overdraw→409 (`inventory.types.ts:187`), models `schema.prisma:1018/1051`. Faltam: custódia, tipos LINK/UNLINK, `professional_id` em `stock_movements` (hoje só `vehicle_id`, `schema.prisma:1059`), flag combustível→`fuel-logs`, PRODUTO/EQUIPAMENTO + Compra/Venda, baixa automática em OS. |
| 11 | Remunerações (liquidação, regras, Excel) | **Parcial** — motor commissions existe; falta settle+UI | Criar → **ESTENDER + CRIAR** | REUSAR motor `commissions` (`CommissionPolicyRule` `schema.prisma:1974`, `CommissionCalculation` `:2024`, `CommissionStatement` `:2054`, status `settled` `commission.types.ts:19`, permission `commissions:settle`, `work-order-cancellation.gate.ts`). CRIAR: rota `settle`/lote, compute `basisEvent→calculation` (não exposto hoje), link `OperatorProfile→regra` (inexistente, `operator-profile.types.ts`), seletor de colunas e export. **"Export Excel" do plano = CSV na verdade** (ver linha transversal em §6). |
| 12 | Telemetria mobile (acessos/km/rastreio/recusas/dispositivos) | **Não coberto pelo recon** | Criar → **CRIAR** | **Validar no PR-16/PR-17/PR-18** — nenhuma das 10 áreas de recon cobriu ingestão de telemetria. App Flutter existe; km por OS é do Ω3F. Índice-alvo `(tenantId, professionalId, capturedAt)` (PLANO §72), haversine, agregado diário. LGPD sensível (§5). |
| 13 | Auditoria global + Sessões c/ revogação | **Parcial** — motor + store existem; falta camada global/admin | Estender → **ESTENDER** | Motor único `EnterpriseAuditLogService.record` (`audit-log.service.ts:36`, sanitiza token/secret); `AuditLog` (`schema.prisma:258`), `AuthSession` (`:177` — já tem `revoked_at` + índice `tenant_id,revoked_at`). Molde read-only = `work-order-audit-logs/`. Faltam: filtro/paginação global, "Acessos" derivado de sessões, listar sessões + `revokeBySessionId` admin (sem exigir refresh hash) + `revoke-all-for-user`. |

**Placar do rebaixamento:** o PLANO §1 marcou **7 linhas como "Criar"** (extrato, notificações, abastecimento, manutenção, multas, seguros, danos, telemetria) — a Fase 0 confirma **CRIAR só em 2** (Extrato #3, Telemetria #12) e converte **6 para ESTENDER** (#4, #5, #6, #7, #8, #9). Remunerações (#11) é misto.

---

## 3. Convenções confirmadas (fundação a reusar sem reescrever)

Estas convenções estão **provadas e uniformes** no repo. Todo módulo/PR do Ω4C deve segui-las; nenhuma é objeto de decisão.

**3.1 Tenant / RLS**
- `tenant_id UUID NOT NULL` + FK `tenants ON DELETE RESTRICT` + bloco RLS `ENABLE/FORCE/POLICY` por model tenant-scoped. Molde de migration = bloco de `20260708000000_add_vehicles`. `FORCE` é **obrigatório** — sem ele o owner do banco ignora a policy (achado de risco).
- Toda query passa por `withTenantRls(prisma, tenantId, tx => …)` de `src/database/rls.ts` — **nunca** reescrever `set_config` nem abrir transação manual.
- Cadeia `attachAuthenticatedActor() + tenantContextMiddleware` já registrada em `src/app.ts` (~145); módulos novos só declaram rotas — o tenant já vem em `request.actor`/`request.tenantContext`. `tenant_id` do body é **sempre ignorado** (`operator-profile.service.ts`, `financial-title.service.ts:79`).
- Todo `@@index` começa por `tenant_id`; toda tabela tem `@@unique([tenant_id, id])` (habilita FK composta multi-tenant).

**3.2 Seed / teste multi-tenant (3-tenants)** — ⚠️ gap operacional
- `prisma/seed.ts:182` cria **apenas 1 tenant** (`slug='demo'`); `seed-fleet.ts:35` e `seed-users.ts:46` fazem `findFirst({slug:'demo'})`. **Não há seed 3-tenant.**
- O isolamento multi-tenant hoje só é exercido em **runtime** por `tests/rls-tenant-isolation.test.ts` (tenants A/B efêmeros criados e deletados no `finally`, validam visibilidade + `updateMany` cross-tenant `count=0`).
- **Decisão de padrão:** o mandato "testar com 3 tenants" deve ser cumprido **estendendo `tests/rls-tenant-isolation.test.ts`** com os novos models (tenants efêmeros no próprio teste) — **não** alterando o seed (`prisma/**` é escopo proibido sem autorização). Ver D-Ω4C-RECON-07.

**3.3 Esqueleto canônico de módulo (9 arquivos)** — template = `operator-profiles/`
`types.ts` (enums `const X_STATUSES = [...] as const` + `type = (typeof)[number]` + `DEFAULT_X`; `XError(statusCode, code, reason, message)`) · `validators.ts` (funções puras `parse*`, `parseLimit` 1-100 default 20, `uuidPattern`) · `dto.ts` (`toXDto`/`toXListDto`, `Date→ISO`, `?? null`, allowlist, `pagination{limit,offset,total}`) · `repository.ts` (interface + InMemory) · `X-prisma.repository.ts` (**duas classes**: `PrismaXRepository(tx)` snake_case + `RlsPrismaXRepository(prisma)` que envolve cada método em `withTenantRls`; `translatePersistenceError` P2002→409/P2003→400) · `service.ts` (tenantId do actor; factory `createMemory…`/`reset…ForTests`/`createDefault…` alternando por `env.CORE_SAAS_PERSISTENCE==='prisma'`) · `controller.ts` (thin, `recordRequestAuditBestEffort` com allowlist estrita) · `routes.ts` (`requirePermission` + `handleAsyncRoute`; `router.use(tenantContextMiddleware)` + `createPersistentRbacContextMiddleware()`) · `index.ts` (barrel). **Registro:** 1 linha em `src/app.ts` — **incluir `src/app.ts` no `git add`** senão CI dá `route_not_found` (MEMORY).

**3.4 Decimal (dinheiro)**
- `Decimal(12,2)` em financial-titles (`schema.prisma:1448,1452`); `Decimal(20,6)` em commissions/inventory (`CommissionCalculation.amount` `:2033`, inventory qtd/custo). Conversão via `decimalToNumber`/`optionalDecimal` = `Number(value)` guardado por `Number.isFinite` (`damage-prisma.repository.ts:319-324`). **Atenção a precisão** em extrato/remuneração (§5).

**3.5 Migrations aditivas**
- Sempre aditivas, timestamp crescente em `prisma/migrations/**`. **Enums vivem no app (sem CHECK no banco)** — padrão uniforme (`fine.types.ts`, `inventory.types.ts:4`, `financial-title.types.ts:12-19`). Índices UNIQUE parciais (ex.: idempotência de origem) vivem **na migration SQL**, não no Prisma (`schema.prisma:1472-1474` documenta o caso). **`prisma/**` é escopo proibido sem autorização explícita do bloco (C4).**

**3.6 Auditoria / §2.8 allowlist**
- Writer único = `EnterpriseAuditLogService.record`; sanitização de `token/password/secret/api_key`→`[REDACTED]` já embutida. DTOs **nunca** emitem `tenant_id`, `storage_key`, `path`, `bucket`, `checksum`; nomes via `UserNameResolver` (nome, nunca UUID). CNH/`trackingConsent` nunca na auditoria (`operator-profile.types.ts:10-13`).

---

## 4. Resolução dos 7 pontos abertos (ANALISE §11)

Para cada ponto: decisão + se vira D-record. Os D-Ω4C-RECON-xx abaixo devem entrar em `agent-orchestration/controle/decisoes.md` na abertura do PR-00.

| # | Ponto aberto (ANALISE §11) | Decisão da Fase 0 | D-record |
|---|---|---|---|
| 1 | Rótulo/opções do filtro de Remunerações ("KM, empresa, nº doc, filial" — áudio com ruído) | **Validar no PR-15.** Recon confirma **confusão conceitual real**: `tariffs` é preço de **VENDA** (`serviceCatalogId/customerId`), não pagamento ao profissional — não acoplar direto. Rótulos do filtro decididos na junta do PR-15 espelhando o padrão de filtros do ERP (não copiar fricção — D-Ω4C-MODAL-PESQUISA). | **D-Ω4C-RECON-01** |
| 2 | Nome do campo "empilhadas" no painel de conferência (provável etapas/estadias/horas paradas) | **Validar no PR-14.** Mapear ao conceito de adicionais/etapas do serviço já existente no domínio de OS; nome final na junta do PR-14. Baixa confiança — não inventar campo novo antes de confirmar. | **D-Ω4C-RECON-02** |
| 3 | Opções exatas do `Tipo de Saída` no sub-modal Saída do Estoque | **Validar no PR-10.** Domínio de tipos de movimento hoje = `['entrada','saida','consumo','ajuste']` (`inventory.types.ts:4`); estender com LINK/UNLINK e os tipos de saída (ex.: venda direta) como enum-em-app, sem CHECK. Lista final ratificada na junta do PR-10. | **D-Ω4C-RECON-03** |
| 4 | Origem `MULTA` em Danos: cria vínculo automático com Multas ou é só classificação? | **Decisão de desenho — resolver na junta do PR-12/PR-13.** Recomendação da Fase 0: tratar como **classificação** (string de origem), **sem** FK automática Dano→Multa na v1 (evita acoplamento e migration extra); vínculo explícito fica como evolução. | **D-Ω4C-RECON-04** |
| 5 | Colunas exatas das listagens de Multas/Seguros/Danos/Remunerações | **Validar nos PRs de frontend** (PR-09, PR-13, PR-15). Confirmadas parcialmente na ANALISE; colunas definitivas saem do cruzamento PNG/`.dc.html` no PR de cada tela (fidelidade §11 do CLAUDE.md). | — (sem D-record; validação por PR) |
| 6 | Popup "próxima manutenção" disparado por item ou por manutenção? | **Decisão — resolver na junta do PR-07/PR-08.** Áudio sugere **por item** (ANALISE:302); recomendação da Fase 0: disparo **por item** com dedupe idempotente por `sourceId` da manutenção para não gerar N notificações redundantes. | **D-Ω4C-RECON-05** |
| 7 | Janela do Rastreamento: 24h fixa ou período livre limitado a 24h? | **Validar no PR-18.** Recomendação da Fase 0: período livre com **default de 24h** (00:00–23:59 do dia) e teto configurável — mais flexível que a janela fixa e sem custo de implementação. Confirmar contra volume de telemetria (índice `(tenant, prof, capturedAt)`). | **D-Ω4C-RECON-06** |

**D-records adicionais de padrão (derivados da §3):**
- **D-Ω4C-RECON-07** — Teste 3-tenant via tenants efêmeros em `tests/rls-tenant-isolation.test.ts` (estender), **nunca** via seed (`prisma/**` proibido). Ratifica a convenção §3.2.
- **D-Ω4C-RECON-08** — Ledger de estoque é **imutável**: o "✕ excluir movimento" do AutEM (ANALISE:163) é implementado como **movimento compensatório**, nunca DELETE físico (`inventory.routes.ts:84-88`). Levar à junta do PR-10.

> Ratificação obrigatória na junta: os D-records "de padrão" do PLANO §2 (**D-Ω4C-ANEXOS, -FIN-ORIGEM, -EXTRATO, -NOTIF, -MODAL-PESQUISA, -TELEMETRIA**) permanecem válidos e são **confirmados** pelos achados — em particular D-Ω4C-NOTIF (scheduler in-process, sem `node-cron`) e D-Ω4C-FIN-ORIGEM (par `createForWorkOrder`/índice parcial como molde).

---

## 5. Riscos e mitigações

| Risco | Evidência | Mitigação |
|---|---|---|
| **Sobreposição com Ω3F P2 — retrabalho / duplicação** | Estoque é o **mesmo módulo** (`inventory/`); `WorkOrderAttachment`/`DamageAttachment`, `fuel-logs`, `fines`, `maintenance-orders`, `insurance-policies`, `damages` já existem com RLS e testes de contrato. | **Proibido duplicar.** Todo o gap é **aditivo** (migration aditiva + campos/rotas novos). Rebaixar PR-04..PR-09 de CRIAR→ESTENDER (§6). Anexos: decidir **coexistência vs migração aditiva** (nunca destrutiva) na junta do PR-01. Front consome esses módulos: **rodar a suíte backend** (MEMORY — `tests/*.test.ts` lêem `.tsx`). |
| **Sensibilidade financeira (extrato/folha/parcelas)** | Extrato #3 e Danos/Multas escrevem em razão financeira; toda escrita cruza `assertPeriodOpen` (`financial-title.service.ts:281`, 422 `period_closed`); `partially_paid`/`paid` não são destinos manuais (`:197`). | **Testes de integridade da trava de parcelas ANTES da UI** (PLANO §5,73). Endpoints `:module/:id/payable` respeitam o chokepoint e a máquina de status. Precisão `Decimal` — cuidado com `Number()` em extrato/remuneração. Idempotência via índice UNIQUE parcial + rede P2002→409. |
| **LGPD — telemetria e documentos sensíveis** | Telemetria (#12) carrega GPS/bateria/IP/dispositivo; anexos de Multa/Dano/Seguro podem ter PII; "Acessos"/"Sessões" mostram IP/UA (`AuthSession.ip_address/user_agent`). | Retenção configurável + agregado diário (PLANO §72). **Nunca** vazar `tenant_id` externo, coordenadas cruas, `storage_key`, `refresh_token_hash` em resposta ou auditoria (§2.8). Blob privado server-side, download só `status='stored'` (`service.ts:112`). `entityId` do cliente **não é confiável** — validar posse do tenant antes de anexar (padrão `assertWorkOrder`). |
| **Scheduler no monólito** | `job.worker.ts:86` já é scheduler in-process (setInterval poll); `fleet-alerts/run` hoje é disparado via HTTP, não cron. | **Reusar `job.worker.ts`** para os disparos de notificação `notify_at`. Idempotência por `notificationId+firedAt` (PLANO §74). **`node-cron` é dependência nova → junta-5 unânime + PD (D-SAN-AUTONOMIA)** — evitar. |
| **Dependências novas (S3 real, exceljs)** | S3 provider existe mas **INERTE** atrás de env (dev = `local`); não há `xlsx`/`exceljs` no repo — só CSV-BOM. | S3 real = serviço tarifado → **junta-5 + PD + fronteira de ativação cloud** (como no saneamento). Export: **manter CSV-BOM** reusando `AuditTenantPage.exportAuditCsv` (promover a util); `.xlsx` real só sob junta-5 unânime. Ver §6 linha transversal. |
| **Cobertura de auditoria "tudo fica registrado" é aspiracional** | `recordRequestAuditBestEffort` é opt-in por controller (~47 chamam, não uniforme); não há coluna de "operação" — CRIAÇÃO/ALTERAÇÃO/EXCLUSÃO derivam do string `action`. | PR-19 normaliza `action`→operação por convenção; aceitar cobertura incremental por módulo. Adicionar índices aditivos (`tenant_id,action,created_at` e `tenant_id,actor_user_id,created_at`) + paginação **antes** de virar tela global (hoje `GET /audit-events` devolve o tenant inteiro sem filtro). |
| **Revogação de sessão "força" limitada** | Access token é STATELESS — middleware não consulta a store por request; `revokeById` exige `refresh_token_hash` (só self-logout). | Revogação admin = novo `revokeBySessionId(session_id, tenant_id)` sem hash, RBAC-gated, `withTenantRls` no tenant do alvo. "Força real" (invalidar access token vivo) = decisão de junta no PR-19: access TTL curto (aceitável) vs checagem de `session_id` no middleware (perf). Spec exige relogin (ANALISE:278). |
| **`prisma/**` = escopo proibido** | Múltiplas extensões exigem colunas novas (`supplier_id`, `professional_id` em stock_movements, `source_type/source_id`, `notify_at/remind_before/visibility`). | Cada migration aditiva exige **autorização explícita do bloco** (C4) e passa pela junta. **Nenhuma migration destrutiva** (parada irredutível C7.5). |

---

## 6. Ajuste fino do PLANO (mudanças de escopo por PR)

O PLANO §3 permanece na ordem, mas os escopos abaixo mudam por causa do que já existe:

- **PR-01 (Anexos):** de "criar do zero" para **estender**. Storage/S3/scan/DTO-allowlist já existem — o trabalho é o model polimórfico `Attachment{entityType,entityId}` + reuso do storage de checklist. **Decisão de arquitetura na junta:** consolidar num único polimórfico (migrar/coexistir com WOAttachment/DamageAttachment/ChecklistAttachment) **vs** adicionar o genérico só para as entidades novas de frota. Recomendação do plano: polimórfico único; recomendação da Fase 0: **coexistência aditiva** (migração destrutiva é parada irredutível).

- **PR-02 (Contas a pagar):** confirmado **ESTENDER**. **Decisão para a junta:** colunas dedicadas (padrão atual `work_order_id`) **vs** par genérico `source_type/source_id` (pedido pelo D-Ω4C-FIN-ORIGEM). Alinhar antes de codar.

- **PR-04 (Notificações):** **rebaixar CRIAR→ESTENDER.** Motor + idempotência + produtores já existem. Escopo real: `notify_at/remind_before/visibility` + CRUD de agendamento + sino/central sobre o `Notification` existente, usando `job.worker.ts` (não `node-cron`).

- **PR-05..PR-09 (Abastecimento/Manutenção/Multas/Seguros):** **rebaixar CRIAR→ESTENDER.** Focar em `supplier_id` (FK composta padrão `FuelLog.vehicle`), anexos, impressão, notificação de vencimento, extrato/contas-a-pagar — **não** recriar os cadastros/models.

- **PR-10 (Estoque):** confirmado ESTENDER. Reconciliar o "✕ excluir movimento" como movimento compensatório (D-Ω4C-RECON-08). `professional_id` em `stock_movements` é novo (hoje só `vehicle_id`).

- **PR-12/13 (Danos):** ESTENDER o módulo `damages` existente; o novo é parcelas→Extrato + trava + impressão com/sem ciência.

- **PR-14/15 (Remunerações): re-dimensionar PARA CIMA.** A premissa "reaproveitar colunas configuráveis + export Excel do Ω3F P2" é **FALSA** — não existem. PR-15 precisa **construir** o seletor de colunas (flag `hideable` sobre `DenseColumn` + estado de visibilidade) e o export. **Recomendação:** manter **CSV-BOM** (reusar `AuditTenantPage.exportAuditCsv` L44-55, promover a util compartilhado) para "exportar para Excel" — abre no Excel, zero dependência. `.xlsx` real só via junta-5 unânime. O motor `commissions` (settle/statement) é reusado; o novo é a **rota settle + compute + link OperatorProfile→regra**.

- **PR-08/09/13/15 (Impressão):** clonar o padrão `window.print` + `@media print` + checkboxes de `PrintWorkOrderModal.tsx` (único motor de impressão do repo, 100% client-side, L47-59/L153-155). **Promover a util compartilhado** `PrintDocumentModal` — isso toca `PrintWorkOrderModal.tsx` (coberto por teste de contrato) → **rodar suíte backend**.

- **PR-16..PR-18 (Telemetria):** **sem rebaixamento** — CRIAR confirmado, mas **não coberto pelo recon**; validar toda a superfície nos próprios PRs. É a maior fatia genuinamente nova junto com o Extrato.

---

## 7. Checklist de prontidão para PR-01

- [ ] **Junta J-Ω4C constituída** (≥3 agentes; unânime-5 nas decisões críticas) e ata inicial em `agent-orchestration/omega/juntas/`.
- [ ] **D-records registrados** em `controle/decisoes.md`: D-Ω4C-ANEXOS, -FIN-ORIGEM, -EXTRATO, -NOTIF, -MODAL-PESQUISA, -TELEMETRIA (do PLANO §2) **+** D-Ω4C-RECON-01..08 (§4 desta ata).
- [ ] **Rebaixamento CRIAR→ESTENDER** de PR-04..PR-09 e re-dimensionamento de PR-15 aprovados pela junta e refletidos no PLANO (§6).
- [ ] **Autorização explícita de `prisma/**`** obtida para o PR-01 (model `Attachment` + índice `@@index([tenant_id, entity_type, entity_id])`) — migration **aditiva**, sem toque destrutivo.
- [ ] **Decisão anexos consolidado vs coexistência** batida na junta (recomendação Fase 0: coexistência aditiva).
- [ ] **S3 permanece INERTE** atrás de env (dev=`local`); nenhuma provisão de bucket/credencial neste PR (fronteira de ativação cloud).
- [ ] **Template confirmado:** clonar `operator-profiles` (9 arquivos) + `work-order-attachment.*` + storage de checklist; DTO allowlist `work-order-attachment.dto.ts:11`; nome via `UserNameResolver`.
- [ ] **Teste de isolamento 3-tenant** planejado como extensão de `tests/rls-tenant-isolation.test.ts` (tenants efêmeros), não via seed.
- [ ] **`src/app.ts` no `git add`** ao registrar o router novo (evita `route_not_found` no CI).
- [ ] **Bateria de validação** definida no comando do PR-01 (Backend: `npm run check/lint/test/build` + `node --test` de contrato + `git diff --check`; Frontend: `npm --prefix frontend run check/build`; **suíte backend também**, pois anexo tem teste de contrato front).
- [ ] **KPIs por PR** (`Kpis/kpis-latest.json`, `kpis-history`, `index.html`) atualizados no próprio PR-01 com contagem real (D-KPI-PER-PR); `merge_commit`/`approved_head` = `null` na autoria (backfill pós-merge).
- [ ] **§2.8 / LGPD** revisados para o DTO polimórfico: nunca `storage_key`/`bucket`/`checksum`/`tenant_id`; validar posse do `entityId` pelo tenant antes de anexar.
- [ ] **Estados obrigatórios** (§7) e a11y (alvo ≥44px, foco visível, aria) previstos no componente aba Arquivos.

---

> **Nota de fidelidade aos achados:** todos os `arquivo:linha` desta ata vêm da varredura de recon das 10 áreas. Onde marcado **"validar no PR correspondente"** (Telemetria #12, ANALISE §11 pontos 1/2/3/5/7), o recon não cobriu ou ficou de baixa confiança — não são fatos confirmados e devem ser fechados no PR indicado. A contradição PLANO §1 × repo real (5 módulos "Criar" que já existem) é o achado central e está ratificada pelos módulos `fuel-logs/`, `maintenance-orders/`, `fines/`, `insurance-policies/`, `damages/` e pelos models correspondentes em `prisma/schema.prisma`.