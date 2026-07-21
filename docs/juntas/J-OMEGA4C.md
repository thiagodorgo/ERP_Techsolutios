# J-Ω4C — Junta da Rodada "Controle & Frota" (referência AutEM)

> **Aberta em:** 2026-07-21 · **Branch:** `rodada/omega4c` · **Mandato do dono:** implementar PR-00→PR-20 do
> `docs/rodadas/omega4c/PLANO_OMEGA4C.md` com todas as RNs de `ANALISE_VIDEOS_AUTOEM.md`, testes verdes, KPI por PR,
> ata final. Fidelidade **COMPORTAMENTAL** ao AutEM (funções/popups/fluxos/regras); visual = design system do ERP +
> Figma `jcAfyvMExRmHenoe3TO08q` — **nunca clone visual do AutEM**.

## 1. Composição (agentes efêmeros — expiram no encerramento da rodada)
| Agente | Papel | Poder |
|---|---|---|
| `omega4c-planejador` | plano curto por PR; recon; resolve dúvidas com pesquisa (net/docs/fóruns) | propõe |
| `omega4c-dev-backend` | Prisma/migrations aditivas, módulos backend, testes | implementa |
| `omega4c-dev-frontend` | páginas/rotas sob `/controle`, componentes compartilhados, testes | implementa |
| `omega4c-dev-mobile` | Flutter: telemetria + hooks login/logout/recusa, testes | implementa |
| `omega4c-avaliador` | roda a seção 10 (validações) + confere RNs | **VETO bloqueante** |

**PROIBIDO** criar/tocar/renomear/deletar qualquer agente pré-existente (inclusive Junta de Mapas). No encerramento,
deletar **apenas** esses 5 e registrar cada deleção nesta ata. Subagentes transientes de recon/pesquisa (general-purpose,
agente-pesquisador-web) são task-runners, não "agentes criados" — permitidos.

**PR-18 (mapa de Rastreamento):** delegado à **Junta de Mapas existente** — este time entrega o contrato de dados +
integração, **não** reimplementa o componente de mapa.

## 2. Mandato e critérios de aprovação por PR
Um PR só é aprovado quando o **omega4c-avaliador** confirma:
1. **Validações (seção 10) verdes:** `npx prisma validate` + `migrate diff` sem drift · `npm run lint/build/test` ·
   `frontend lint/build/test` · `mobile flutter analyze/test` (quando tocar mobile) · `git status --short` sem nada fora do escopo.
2. **RNs cobertas:** todas as RN-XXX do PR presentes e testadas (checklist no relatório do PR).
3. **Multi-tenant:** todo endpoint novo testado com **3 tenants** — via **tenants efêmeros em `tests/rls-tenant-isolation.test.ts`**
   (criados/deletados no teste), **NÃO via seed** (o seed tem só 1 tenant `demo`; `prisma/**` é escopo proibido — D-Ω4C-RECON-07);
   `tenantId` como 1º campo de todo índice composto.
4. **KPI por PR** (D-KPI-PER-PR): `docs/kpis/omega4c/KPI_PR-XX.json` + histórico + snapshot.
5. **Zero regressão** nos testes de OS/financeiro/estoque existentes.
Voto + justificativa registrados nesta ata. **Junta sem registro = merge inválido** (D-SAN-AUTONOMIA).

## 3. Não-negociáveis (da seção 6 do mandato)
- **Extrato do profissional:** trava RN-EXT-01 (registro com parcelas no extrato não pode ser excluído/alterado → 409 com a mensagem do AutEM).
- **Multa:** RN-MUL-01 (condutor responsável SIM→extrato / NÃO→contas a pagar), ambos reversíveis.
- **Estoque:** saldos por custódia BASE/PROFESSIONAL/VEHICLE nunca negativos; cadastro não cria saldo (só ENTRY).
- **Abastecimento interno** gera EXIT de estoque; **KM/L** calculado (RN-ABA-04).
- **Notificações:** motor único visibilidade PRIVATE/PUBLIC/CUSTOM + scheduler idempotente **reusando o `job.worker.ts:86`
  (scheduler in-process já existente) — NÃO introduzir `node-cron`** (dep nova → junta-5 + PD; D-Ω4C-NOTIF / FASE0_RECON §5).
- **Telemetria:** ingestão em lote autenticada + agregação diária de km (haversine, descartar accuracy>50m e saltos>150km/h). **LGPD: zero coordenada em log** (disciplina já vigente no Mapa).
- **Dinheiro** Decimal(12,2); **km** Decimal(10,1); enums em inglês com labels PT-BR; auditoria em toda escrita.

## 4. Escopo (do mandato)
- **Permitido:** `prisma/schema.prisma` + migrations **aditivas**; novos módulos backend (fueling/maintenance/fines/insurance/
  damages/stock/remuneration/notifications/attachments/statement/telemetry/audit-sessions — nomes reais definidos na Fase 0);
  novas páginas/rotas frontend sob **`/controle`** + componentes compartilhados novos; app Flutter (telemetria + hooks);
  `docs/rodadas/omega4c/**`, `docs/decisoes/D-*.md`, `docs/juntas/J-OMEGA4C.md`, KPIs.
- **Proibido:** refactor oportunista em OS/financeiro/estoque fora dos pontos de integração; DROP/rename destrutivo;
  secrets/.env/infra AWS/CI; serviço externo sem aprovação unânime; `git add .` (stage por caminho); push/PR/merge antes da
  aprovação registrada da junta + checks verdes; push direto na main; copiar assets/textos/CSS/logo do AutEM.

## 5. Fluxo por PR
(a) `omega4c-planejador` publica plano curto aqui → (b) dev implementa → (c) `omega4c-avaliador` roda seção 10 + confere RNs →
(d) junta registra aprovação aqui → (e) commits atômicos `feat(omega4c): PR-XX — <entrega>` (sem WIP) na branch `rodada/omega4c`
→ (f) abre PR com relatório (Objetivo · Arquivos · Models/endpoints · checklist RN · D-refs · Testes/validações · Divergências
vs AutEM + justificativa · KPI) → (g) segue ao próximo PR sem aguardar humano, **salvo veto do avaliador**.

## 6. Cronograma (PLANO_OMEGA4C)
- **Fase 0 — PR-00** (governança + recon; `FASE0_RECON.md`; D-records iniciais) — *em curso*.
- **Fase 1 — PR-01..09:** anexos genéricos · contas-a-pagar por origem · extrato do profissional · motor de notificações ·
  abastecimento (back/front) · manutenção (back/front) · multas+seguros.
- **Fase 2 — PR-10..15:** estoque custódia (back/front) · danos (back/front) · remunerações (back/front).
- **Fase 3 — PR-16..20:** telemetria backend · Flutter telemetria · telas AutEM Mobile (mapa via Junta de Mapas) · usuários
  (acessos/logs/sessões+revogação) · central de notificações + varredura cruzada.

## 7. Registro de votos (append por PR)
### PR-00 — Fase 0 (governança + recon) — **APROVADO** (2026-07-21)
- **omega4c-planejador** (recon via 11 agentes paralelos + síntese): entregou `FASE0_RECON.md` + `D-OMEGA4C-RECON.md` (8 D-records).
  Achado central: repo **muito mais adiantado** que o gap estimado — **5 módulos "Criar" JÁ EXISTEM** (fuel-logs/maintenance-orders/
  fines/insurance-policies/damages) → CRIAR só em 2 (Extrato #3, Telemetria #12); 6 rebaixados p/ ESTENDER.
- **omega4c-avaliador (VETO):** **APROVADO_CONDICIONADO → APROVADO** após sanar. Spot-check CONFIRMOU: os 5 módulos + models Prisma
  (FuelLog:820/MaintenanceOrder:848/Fine:875/InsurancePolicy:905/Damage:932) existem; seed 1-tenant (D-RECON-07); âncoras batem;
  D-records não fabricam estrutura; escopo LIMPO (só docs + 5 agentes efêmeros, zero código/prisma). Condições **sanadas**: MEDIA
  (charter J-OMEGA4C reconciliado: 3-tenant por teste efêmero não seed; sem node-cron→job.worker.ts) + 2 BAIXA (âncora Damage :932;
  git add por caminho).
- **Resultado:** Fase 0 aprovada. **Gate liberado para PR-01** (Anexos genéricos), com autorização explícita de `prisma/**` a pedir
  ao dono no comando do PR-01.

### PR-01 — Anexos genéricos (aba "Arquivos" polimórfica) — plano do omega4c-planejador (2026-07-21)
**Veredicto Fase 0:** ESTENDER via **coexistência aditiva** (não destrutiva).
- **Model** `Attachment{ tenant_id(1º), entity_type(enum-app), entity_id, file_name, extension, content_type, size_bytes,
  checksum(INTERNO), storage_*(INTERNO), status, client_action_id, uploaded_by/at, deleted_at }` — `@@unique([tenant_id,id])`,
  `@@index([tenant_id,entity_type,entity_id])`, RLS ENABLE/FORCE/POLICY (clona `20260708000000_add_vehicles`). Migração ADITIVA
  up-only (rollback=DROP TABLE, tabela nova), provada up/down pelo **agente-dba-guardião**.
- **Backend** módulo `src/modules/attachments/` (clona `operator-profiles` + `work-order-attachment.*` + storage de checklist +
  AV-scan). Endpoints: `GET /attachments?entityType&entityId` · `POST /attachments`(multipart) · `GET /attachments/:id/download`
  (só status=stored) · `DELETE /attachments/:id`(soft). **DTO allowlist §2.8** — NUNCA storage_key/checksum/file_url/tenant_id.
- **Frontend** `frontend/src/modules/attachments/EntityAttachmentsTab` — "Detalhes do Registro" + tabela `Data e Hora|Extensão|Tipo`
  + toolbar + estados §7; montado em ≥1 consumidor vivo (Manutenção/Seguros).
- **Decisões novas (junta ratifica):** **D-Ω4C-ANEXOS-RBAC** (permissão HERDADA da entidade-alvo — sem `attachments:*` nova; rota
  sem requirePermission estático, service resolve entityType→perm; read=`<ent>:read`, write=`<ent>:create`, delete=`<ent>:update`)
  · **D-Ω4C-ANEXOS-ENTITYTYPES** (allow-list v1 = damage/fine/insurance_policy/maintenance_order) · **D-Ω4C-ANEXOS-FRONT-LOC**
  (componente em modules/attachments). Posse validada via resolver (get() de cada módulo já dá 404 cross-tenant) — RN-ANEXO-01.
- **RNs:** ANEXO-01(posse)/02(§2.8)/03(RBAC herdada)/04(download gate stored)/05(soft-delete)/06(idempotência client_action_id)/
  07(scan antes do store)/08(multi-tenant 3 tenants)/09(S3 inerte)/10(coexistência). Testes: attachments-crud + estender
  rls-tenant-isolation (3 tenants efêmeros) + EntityAttachmentsTab. **APROVADO pela junta para implementar.**

**PR-01 — RESULTADO (2026-07-21): APROVADO.** Backend: 11 arquivos `src/modules/attachments/` + migração ADITIVA
`20260821000000_add_attachments` (RLS ENABLE/FORCE/POLICY USING+WITH CHECK; índice UNIQUE parcial de idempotência). Model
polimórfico `Attachment{entity_type,entity_id}`; RBAC herdada via `attachment-entity-resolver`; DTO §2.8 allowlist. Frontend:
`EntityAttachmentsTab` montado no modal de Manutenção (abas "Editar|Arquivos").
- **agente-dba-guardião (VETO): APROVADO (0 cond.)** — migração aditiva não-destrutiva provada up/down/re-up no Postgres vivo
  (siblings WOAttachment/DamageAttachment/ChecklistAttachment intactos), RLS t/t, isolamento 3-tenant (updateMany cross=0).
- **omega4c-avaliador (VETO): APROVADO** — seção 10 verde (backend lint/build 0, npm test 0 falha nova, attachments-crud 11/11;
  frontend check/build 0, smoke 673→682); RN-ANEXO 01-10 verificadas; escopo respeitado; divergência do botão download da toolbar
  aceita (equivalência comportamental — §11.2).
- KPI: `docs/kpis/omega4c/KPI_PR-01.json`. `Kpis/*`: frontend_smoke 673→682 (+9); backend +11 (attachments-crud); blocks 71→72.

### PR-02 — Contas a Pagar por origem — plano do omega4c-planejador (2026-07-21)
ESTENDER `financial-titles`. **Decisão: par GENÉRICO `source_type/source_id`** (coexiste com `work_order_id`/`service_quote_id`
intocados). Migração ADITIVA: 2 colunas nullable + índice UNIQUE parcial `(tenant_id, source_type, source_id, direction) WHERE
deleted_at IS NULL AND source_id IS NOT NULL` (idempotência por fonte; espelha o de OS). Enum-app `fuel_log|maintenance_order|
fine|insurance_policy` (D-Ω4C-FIN-SOURCE-ENUM).
- Backend: `createForSource`/`findActiveBySource`/`removeForSource` (reusa soft-delete `delete()` + chokepoint `assertPeriodOpen`)
  em financial-titles; **route-factory** `createPayableSourceRoutes({sourceType, resolveOwnership via service.get() do módulo})`
  montado em fuel-logs/maintenance-orders/insurance-policies → `POST/DELETE/GET /:module/:id/payable`; perm `financial_titles:create/update`
  (existentes); **Multa fica p/ PR-09** (condutor-responsável). D-Ω4C-FIN-SOURCE-REST (per-módulo, evita import reverso/ciclo).
- Frontend: `PayableToggle` (checkbox "Gerar lançamento em contas a pagar" no create + badge "lançado" + Lançar/Retirar no edit,
  derivado de findActiveBySource) montado em Abastecimento/Manutenção/Seguro.
- RNs FIN-ORIGEM-01(posse 404)/02(idempotência 409)/03(chokepoint 422)/04(retirar=soft-delete reversível)/05(badge derivado)/
  06(§2.8)/07(coexistência OS intocada). Testes: financial-title-source + rls 3-tenant + PayableToggle smoke.
- D-refs: D-Ω4C-FIN-ORIGEM (ratificado) + FIN-SOURCE-ENUM + FIN-SOURCE-REST + FIN-MULTA-FRONTEIRA. **APROVADO para implementar.**

#### PR-02 — Veredito da junta (2026-07-21) — **UNÂNIME 3/3 APROVADO**
- **omega4c-avaliador** → `APROVADO_CONDICIONADO`: seção 10 verde em memória (backend **1324/1330** pass, 0 falha nova, 6 skip
  DB-gated; `financial-title-source` **17/17**; faturamento OS `work-order-invoicing` 16/16 + `work-order-mileage` 24/24 = **ZERO
  regressão**), frontend check/build 0 + smoke **694/694** (`payable-toggle` 12/12); 7 RNs cobertas por teste; migração aditiva
  não-destrutiva; posse/idempotência/chokepoint/coexistência OK. **Divergência da Manutenção (só toggle de edição, sem checkbox de
  create) ACEITA por D-007** — payload de create de manutenção não tem custo; `parseAmount` exige `amount>0`; checkbox de create
  fabricaria valor. Condições: MEDIA (KPI §C3 — **sanada neste PR**, `Kpis/*` atualizados na autoria) + 3 BAIXA (RLS 3-tenant
  DB-gated provada pelo dba-guardião; higiene de `git add` cirúrgico; wiring RBAC nas 3 pages via `can(...)` — registrado).
- **agente-dba-guardião** → `APROVADO`: migração `20260822000000_add_financial_title_source` provada **UP/DOWN/RE-UP** em
  `erp-postgres` (DB scratch isolada). Só `ADD COLUMN source_type TEXT`/`source_id UUID` (nullable, sem default) + `CREATE UNIQUE
  INDEX` parcial; **zero DROP/ALTER destrutivo**. Índice de OS `financial_titles_wo_direction_active_key` (da 20260811000000)
  **intacto** (coexistência); RLS `relrowsecurity=t`/`relforcerowsecurity=t` + policy preservadas; idempotência comprovada (2º ativo
  → `ERROR 23505`; avulso `source_id NULL` e retirado `deleted_at NOT NULL` liberados). Condição BAIXA: DOWN é runbook manual no
  cabeçalho da migration (forward-only P-007) — mantido no runbook de operação.
- **coordenador-de-acessos** → `APROVADO`: cadeia papel→permissão→rota→backend→posse→UI íntegra. Rotas de payable exigem
  `financial_titles:create` (lançar) / `:update` (retirar) / `read∪update` (GET), batendo com `RBAC_MATRIX` (l.122) e o precedente
  `POST /work-orders/:id/invoice`; **sem permissão nova** (catálogo/seed/teste intocados). Posse via `service.get()` do módulo-fonte
  → 404 cross-tenant (testado); backend autoridade final (manager sem `create` → **403** real, testado); UI PT-BR sem termo técnico,
  `aria-label` nos ícones-ação. Observação informativa (não-bloqueante): payload gateia só em `financial_titles:*` sem exigir a read
  do módulo-fonte — idêntico ao precedente de faturamento; sem vazamento (resolveOwnership faz o escopo de tenant).
- **Decisão:** verde unânime → merge + KPI no próprio PR (§C3). **RN-FIN-ORIGEM-01..07 cobertas.** Divergência da Manutenção
  registrada como **D-Ω4C-FIN-MANUT-SEM-CREATE** (edit-only por D-007).
- KPI: `docs/kpis/omega4c/KPI_PR-02.json`. `Kpis/*`: backend 1307→**1324** (+17 financial-title-source); frontend_smoke 682→**694**
  (+12 payable-toggle); blocks 72→**73**.

### PR-03 — Extrato do Profissional (razão financeira do profissional) — plano do omega4c-planejador (2026-07-21)
**Veredicto Fase 0:** **CRIAR real** (1 dos 2 da rodada — D-Ω4C-RECON / FASE0_RECON §3 #3). Sem `ProfessionalStatement` no repo.
Fundação do razão parcelado + **AJUSTE manual** + **trava RN-EXT-01** + **tela básica de extrato**. As integrações que POSTam no razão
(Multa PR-09 · Dano PR-12/13 · Remuneração PR-14/15) vêm depois — **NÃO acoplar agora** (evita ciclo). Âncoras confirmadas no recon:
esqueleto de 9 arquivos `operator-profiles/` (template), `Decimal(12,2)` de `financial-titles`, FK composta `(tenant_id,operator_profile_id)`,
padrão RLS de `20260726000000_add_operator_profiles`, idempotência de origem por índice parcial de `20260822000000_add_financial_title_source`.

- **Model `ProfessionalStatementEntry`** (tabela `professional_statement_entries`) — **D-Ω4C-EXTRATO-MODEL: tabela ÚNICA, 1 linha por
  PARCELA, agrupada por `group_id`** (a mais simples que satisfaz a trava; o "cabeçalho" é lógico — os campos entry_type/direction/description/
  source/installment_total viram snapshot repetido e imutável em cada linha-irmã). Justificativa: o extrato do AutEM É uma lista de parcelas
  datadas com saldo corrente (ANALISE:237/287) → cada parcela = 1 movimento; 1 módulo + 1 migration; a trava/retirada opera no grupo.
  Campos: id · tenant_id (1º) · operator_profile_id **FK composta (tenant_id,operator_profile_id) → operator_profiles RESTRICT** (extrato é POR
  profissional) · group_id (uuid — o lançamento; parcelas 1..N o compartilham) · entry_type enum-app damage|fine|remuneration|adjustment
  (labels DANO/MULTA/REMUNERAÇÃO/AJUSTE, **SEM CHECK** — validado na app) · direction enum-app debit|credit · description · amount
  Decimal(12,2) > 0 (valor DA PARCELA) · currency {BRL} · installment_number/installment_total int ≥ 1 · due_date timestamptz · competencia
  YYYY-MM (derivada de due_date server-side) · status enum-app pending|settled|cancelled (default pending) · settled_at/settlement_ref
  (timestamptz?/uuid?, setados pela liquidação PR-14/15) · source_type enum-app damage|fine|remuneration|manual (nullable) · source_id uuid
  nullable (mesmo tenant, **SEM FK nativa** — app-level, como party_id de financial-titles) · client_action_id · created_by/updated_by ·
  created_at/updated_at timestamptz · deleted_at timestamptz nullable (soft-delete = "retirar do extrato"). Índices: @@unique([tenant_id,id]) ·
  @@unique([tenant_id,group_id,installment_number]) (sem parcela duplicada) · @@index([tenant_id,operator_profile_id,due_date]) (ordenação do
  razão) · @@index([tenant_id,status]) · **índice PARCIAL de idempotência de origem** (tenant_id,source_type,source_id,installment_number) WHERE
  deleted_at IS NULL AND source_id IS NOT NULL (foundation-ready p/ as integrações; espelha financial_titles_source_direction_active_key). RLS
  ENABLE+FORCE+POLICY USING+WITH CHECK (clona 20260726000000). Migração ADITIVA up-only 20260823000000_add_professional_statement_entries
  (rollback = DROP TABLE, tabela nova sem dependente) — provada up/down/re-up pelo **agente-dba-guardião**. Toca `prisma/**` (schema + migration;
  +3 descrições no seed.ts, com fallback já existente l.205) → **requer autorização explícita de prisma/** no comando do PR-03**, como o PR-01 pediu.
- **Convenção de sinal — D-Ω4C-EXTRATO-DIRECTION:** direction=debit = **desconto** (DANO/MULTA/AJUSTE-débito; reduz o saldo do profissional);
  direction=credit = **provento** (REMUNERAÇÃO/AJUSTE-crédito). **Saldo do profissional = Σcredit − Σdebit** (positivo = a empresa deve ao
  profissional; negativo = o profissional deve à empresa) — DERIVADO server-side (como o /financial-accounts/:id/balance do Ω4-4), nunca no
  cliente. O entry_type fixa a direção para damage/fine (debit) e remuneration (credit); **AJUSTE exige direction explícito** (débito OU crédito).
- **Trava de integridade RN-EXT-01 — D-Ω4C-EXTRATO-TRAVA** (invariante testável; espelha o alerta amarelo AutEM ANALISE:129 — *"O valor do dano
  já se encontra no extrato do profissional. A exclusão e algumas alterações não podem ser feitas até que todas as parcelas sejam removidas do
  mesmo."*): um lançamento (grupo) é um FATO financeiro travado. (a) **PATCH de campo financeiro** (amount/entry_type/direction/plano de parcelas/
  competência/source) → **409 statement_entry_locked** com a mensagem AutEM (só description é editável). (b) **DELETE (soft, "retirar do extrato")**
  → permitido SOMENTE se NENHUMA parcela do grupo estiver settled; com ≥ 1 settled → **409 statement_entry_locked**. Quando permitido, soft-deleta
  o grupo inteiro (todas as parcelas) atomicamente numa withTenantRls tx. A transição pending→settled (liquidação em folha) é da Remuneração/folha
  (**PR-14/15**) — PR-03 entrega o campo + o guard e **testa o 409 via fixture de parcela liquidada no repositório** (caminho feliz: todas pending →
  DELETE OK). Reversão de lançamento travado = só por **AJUSTE compensatório** (crédito/débito inverso), nunca destrutivo (mesma disciplina do Ω4:
  item faturado → 422, cheque não-editável → 422, bounce por contra-lançamento).
- **Backend** módulo `src/modules/professional-statements/` (9 arquivos clonando operator-profiles/: professional-statement.types.ts [enums-app
  SEM CHECK + Error] · .validators.ts · .dto.ts [allowlist §2.8] · .repository.ts [interface + InMemory] · -prisma.repository.ts [2 classes Prisma +
  Rls + withTenantRls + createPrisma…Repository; Number(record.amount) p/ Decimal→number como financial-titles l.273] · .service.ts [factory
  CORE_SAAS_PERSISTENCE] · .controller.ts [thin + recordRequestAuditBestEffort] · .routes.ts [requirePermission] · index.ts barrel) + **1 linha em
  `src/app.ts`** (createProfessionalStatementRouter() sob attachAuthenticatedActor()) — **git add src/app.ts senão CI route_not_found** (memória
  feedback-git-add-app-ts). **Endpoints** (/api/v1/professional-statements): **GET** ?operatorProfileId=&from=&to=&entryType=&limit=&offset= →
  extrato de UM profissional (operatorProfileId **OBRIGATÓRIO** → 400 operator_profile_required; profissional validado no tenant via
  OperatorProfileService.get → **404 cross-tenant**; nunca lista global) devolvendo items (parcelas) + summary {currentBalance, totalDebits,
  totalCredits, count} + runningBalance por linha (ordem asc por due_date,created_at) + pagination · **GET /:groupId** (um lançamento + suas
  parcelas) · **POST** → cria **SOMENTE AJUSTE** (entry_type forçado a adjustment; body {operator_profile_id, direction, description(req), amount,
  installment_total, first_due_date, currency?}; gera group_id + N parcelas — split igual, resto de centavos na 1ª, vencimentos mensais a partir de
  first_due_date) · **PATCH /:groupId** (só description; campo financeiro → 409) · **DELETE /:groupId** (soft, trava RN-EXT-01). **DTO allowlist
  §2.8/LGPD** — NUNCA tenant_id/source_id/client_action_id/CNH/dado sensível; nome do profissional só como **label** (professionalName), jamais CNH.
- **Permissão — D-Ω4C-EXTRATO-RBAC: permissão NOVA professional_statements:read/create/update** (NÃO reusa financial_titles:* — o extrato é a
  **folha do profissional**, razão distinta da **tesouraria do tenant**; todo agregado financeiro do Ω4 ganhou namespace próprio — precedente
  financial_accounts/titles/entries/cheques/period). Distribuição espelha financial_titles: **read** → super_admin, platform_admin, tenant_admin,
  finance, manager, auditor, viewer; **create+update** (DELETE sob :update, padrão do repo) → super_admin, platform_admin, tenant_admin, finance.
  **NÃO** (nem read): operator, inventory, field_technician, field_dispatcher, technician, support (folha é sensível; field_technician veria extratos
  de terceiros — self-service fica p/ Ω5). **Exige explicitamente:** (1) `src/modules/core-saas/permissions/catalog.ts` — 3 entradas em
  PERMISSION_CATALOG (blocos read/create/update) + nas listas de finance / manager(read) / auditor(read) / viewer(read) / TENANT_ADMIN; (2)
  `tests/core-saas.test.ts` — as 3 nas MESMAS posições do array expectedPermissionCatalog (o assert.deepEqual é o gate); (3) `prisma/seed.ts` — 3
  descrições PT-BR em permissionDescriptions (opcional-preferido; há fallback l.205); (4) `RBAC_MATRIX.md` — 1 linha documentando o módulo. Backend é
  a autoridade → finance escreve; manager POST → **403 real testado**.
- **Frontend — D-Ω4C-EXTRATO-ROUTE (divergência /controle × /fleet, registrada por A2 sem consolidação silenciosa):** a tela monta em
  **/fleet/statement** (menu "Extrato do Profissional", grupo FROTA) + deep-link **/fleet/statement/:operatorProfileId** (drill-in da página
  Profissionais), **coerente com os 5 irmãos de frota** (Abastecimento/Manutenção/Multas/Seguros/Danos já sob /fleet/*) — o charter §4 diz
  /controle (rótulo AutEM), mapeado a /fleet no ERP como os demais. Página `frontend/src/modules/fleet/professional-statement/` — **dense-list**
  (colunas Data | Tipo | Descrição | Parcela n/N | Valor ± | Saldo), seletor de profissional + filtro de período, card de currentBalance, **badge
  liquidado/pendente** (verde/vermelho = a bolinha de liquidação da Remuneração ANALISE:237), estados §7 (loading/empty/error/**acesso não
  permitido**/desatualizado) + guard RBAC (professional_statements:read) + item em tenantNavigation.ts/appSidebarNav.ts. §2.8: nunca CNH/dado
  sensível — só nome/id do profissional. AJUSTE via modal (direção, descrição, valor, parcelas, 1ª data); ação "Retirar do extrato" respeita a trava
  (409 → toast com a mensagem AutEM).
- **D-Ω4C-EXTRATO-CREATE-SCOPE:** o POST público cria **só adjustment** (AJUSTE manual); damage/fine/remuneration ficam reservados e entram **apenas
  por caminhos internos** das integrações (padrão createForSource, PR-09/12/13/14/15) — espelha financial-titles.createForSource (interno, nunca
  aceito no corpo REST). Evita import reverso/ciclo e acoplamento prematuro.
- **RNs:** EXT-01 (trava 409 statement_entry_locked com msg AutEM: DELETE bloqueado se ≥ 1 parcela settled; PATCH financeiro sempre 409; grupo
  todo-pending → soft-delete atômico) · EXT-02 (§2.8/LGPD — DTO sem tenant_id/source_id/client_action_id/CNH; nome só label) · EXT-03 (extrato POR
  profissional — operatorProfileId obrigatório; 404 cross-tenant; nunca lista global) · EXT-04 (parcelamento fiel — N ≥ 1, Σparcelas = total com resto
  na 1ª, vencimentos mensais; parcela Decimal(12,2) > 0) · EXT-05 (saldo DERIVADO server-side, Σcredit − Σdebit, convenção documentada) · EXT-06
  (idempotência de origem — índice parcial; AJUSTE tem source_id NULL, sempre livre) · EXT-07 (auditoria allowlist {operatorProfileId, entryType,
  direction, installmentTotal, amount}) · EXT-08 (multi-tenant 3 tenants efêmeros em rls-tenant-isolation; tenant_id 1º índice; cross 404; updateMany
  cross = 0) · EXT-09 (RBAC — read amplo / write finance+admins; sem-permissão → 403 real) · EXT-10 (imutabilidade financeira pós-create; reversão só
  por AJUSTE compensatório).
- **Divergências AutEM honestas (D-007):** (i) **impressão do extrato com/sem parágrafo de ciência** (termo p/ assinar) e **export Excel** = features
  de origem (Dano)/folha → **FORA do PR-03, parada honesta** (sem rota/dado agora). (ii) **liquidação em folha** (settle das parcelas / net-pay) =
  **PR-14/15**; PR-03 entrega só o razão + o campo settled + o guard — parada honesta. (iii) **self-service** (profissional vê o próprio extrato no
  mobile) = **deferido Ω5** (sem trilha de dado; não expor a field_technician — vazaria terceiros). (iv) colunas/estados exatos da tela do extrato
  AutEM **não vistos em frame limpo** (recon comportamental) → reproduzimos o COMPORTAMENTO (linha = parcela, saldo corrente, badge liquidado/pendente)
  no design system do ERP, não o pixel (§11).
- **Bateria de validação (seção 10 — o avaliador roda):** `npx prisma validate` + prisma migrate diff (sem drift) + **dba-guardião prova up/down/re-up**
  da 20260823000000; backend `npm run check` · `npm run lint` · `npm test` · `npm run build`; `node --test --import tsx
  tests/professional-statement-crud.test.ts` (novo — CRUD + AJUSTE + parcelamento + saldo derivado + **RN-EXT-01 trava** [PATCH financeiro 409, DELETE
  com parcela settled 409, DELETE todo-pending OK] + imutabilidade); `tests/rls-tenant-isolation.test.ts` estendido (3 tenants efêmeros, cross 404,
  updateMany cross = 0); `tests/core-saas.test.ts` (expectedPermissionCatalog com as 3 novas); **zero regressão** em financial-title-* / work-order-* /
  operator-profile; frontend `npm --prefix frontend run check` · `build` · smoke (página do extrato + estados §7 + guard RBAC); `git diff --check` +
  `git status --short` limpo (app.ts incluído no add). KPI: `docs/kpis/omega4c/KPI_PR-03.json` + histórico + snapshot; Kpis/* backend +N
  (professional-statement-crud), frontend_smoke +M, blocks 73→**74**.
- **Riscos + rollback:** (R1) running balance O(N) por profissional → mitigado (ledger por profissional é pequeno; índice
  (tenant_id,operator_profile_id,due_date); materializar saldo se crescer). (R2) acoplamento futuro → mitigado: POST só AJUSTE + source path reservado,
  sem import dos módulos Dano/Multa/Remuneração agora (evita ciclo). (R3) nova permissão quebrar core-saas.test → mitigado atualizando
  expectedPermissionCatalog no mesmo PR. (R4) prisma/** → só ADITIVO (CREATE TABLE + 3 descrições no seed); **rollback = DROP TABLE
  professional_statement_entries** (tabela nova, sem dependente) + revert do PR (catalog/seed/test/app.ts/front). Sem destrutivo (respeita parada §C7.5).

**APROVADO para implementar.** (D-records desta fatia: **D-Ω4C-EXTRATO-MODEL · -DIRECTION · -TRAVA · -RBAC · -ROUTE · -CREATE-SCOPE** — a junta ratifica
no veredito; persistir em controle/decisoes.md no PR. D-Ω4C-EXTRATO do PLANO §2 permanece a decisão-mãe, aqui detalhada.)

#### PR-03 — Veredito da junta (2026-07-21) — **UNÂNIME 3/3 APROVADO**
- **omega4c-avaliador** → `APROVADO`: seção 10 verde ponta a ponta — `prisma validate` ok; migração aditiva aplicada limpa em Postgres
  vivo; backend **1336/1342** pass (0 fail, 6 skip DB-gated), `professional-statements` **12/12**, `core-saas` **26/26** (catálogo
  novo), **ZERO regressão** (financial-titles 11/11 + financial-title-source 17/17 + work-order-invoicing 16/16 + work-order-mileage
  24/24 + operator-profiles 17/17); frontend check/build 0 + smoke **703/703** (+9 extrato-profissional). **RN-EXT-01..10 todas
  cobertas por teste** — trava RN-EXT-01 FORTE (PATCH financeiro→409 `statement_entry_locked`; DELETE com parcela `settled`→409;
  grupo all-pending→soft-delete atômico em tx), saldo **derivado server-side** (Σcredit−Σdebit, runningBalance, NÃO persistido),
  DTO sem tenant_id/source_id/**CNH**, AJUSTE exige direction + parcela>0 (422), permissão nova nos 4 pontos, auditoria allowlist.
  Divergências D-007 aceitas: auditoria com `amount` agregado (não-PII), filtro de período client-side (foundation from/to no back),
  impressão/Excel/liquidação deferidos (PR-14/15), índice parcial só na migração (precedente PR-01/02). 4 condições BAIXA (nenhuma
  bloqueia).
- **agente-dba-guardião** → `APROVADO` (0 condições): migração `20260823000000_add_professional_statements` provada **UP/DROP/RE-UP**
  em DB scratch isolada. Puramente aditiva (CREATE TABLE + 5 índices + FK composta `(tenant_id, operator_profile_id)`→operator_profiles
  RESTRICT + RLS ENABLE/FORCE/POLICY USING+WITH CHECK); zero DROP/ALTER em tabela existente. `amount NUMERIC(12,2)`, timestamptz,
  índice parcial de idempotência de origem presente, todo índice com `tenant_id` 1º. DROP (runbook up-only) preserva
  operator_profiles/users/financial_titles intactos (RLS t/t). Integridade real: FK cross-tenant → **23503**; colisão do índice
  parcial → **23505**; `source_id NULL` (AJUSTE/avulso) isento. Base de dev nunca tocada.
- **coordenador-de-acessos** → `APROVADO`: permissão nova `professional_statements:read/create/update` espelha exatamente
  `financial_titles:*` (read amplo super/platform/tenant_admin/finance/manager/auditor/viewer; write só super/platform/tenant_admin/
  finance); **operator/inventory/field_technician/field_dispatcher/support/technician SEM acesso** à folha sensível. Catálogo↔
  `expectedPermissionCatalog`↔seed **byte-idênticos** (170≡170, ordem incluída; core-saas 26/26); RBAC_MATRIX l.123 verbatim. Rotas
  todas com requirePermission (GET→read, POST→create, PATCH/DELETE→update); backend autoridade (403 real provado 12/12: manager/
  auditor/viewer read-only, operator/inventory/field_technician/support 403 total, anon 403). Front↔back gateiam a MESMA permissão;
  `tenantNavigation` usa `requiredPermissions` (sem allowedRoles hard-coded). UI PT-BR "Extrato do Profissional", nunca CNH. 1 BAIXA
  informativa (appSidebarNav role-coarse fallback 'gestor' — pré-existente, idêntico a financial_titles, backstopped por
  tenantNavigation+governedPaths+PermissionGuard+403; sem vazamento).
- **Decisão:** verde unânime → merge + KPI no próprio PR (§C3). **RN-EXT-01..10 cobertas.** D-records desta fatia (D-Ω4C-EXTRATO-MODEL/
  -DIRECTION/-TRAVA/-RBAC/-ROUTE/-CREATE-SCOPE) **ratificados**.
- KPI: `docs/kpis/omega4c/KPI_PR-03.json`. `Kpis/*`: backend 1324→**1336** (+12 professional-statements); frontend_smoke 694→**703**
  (+9 extrato-profissional); blocks 73→**74**.

## 8. Encerramento (a fazer no fim)
Ata final (entregas, KPIs consolidados, pendências→backlog Ω5); deletar **SOMENTE** os 5 agentes efêmeros (registrar cada
deleção); confirmar que nenhum agente pré-existente foi tocado; marcar os D-records como vigentes.
