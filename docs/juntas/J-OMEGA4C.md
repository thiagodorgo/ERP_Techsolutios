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

### PR-04 — Motor de Notificações (model agendável + scheduler idempotente + endpoints + sino + popup de criar) — plano do omega4c-planejador (2026-07-21)
**Veredicto Fase 0 (recon REAL, FATO vs HIPÓTESE):** **ESTENDER via camada aditiva**, NÃO criar do zero. O repo já tem um motor de
notificações **maduro e vivo** — o "motor único agendável" do AutEM é a **camada que falta por cima** dele.
- **FATO (li no código):** (a) Model `Notification` (`prisma/schema.prisma:280`, tabela `notifications`) é um **inbox POR DESTINATÁRIO**
  (`recipient_user_id` NOT NULL, `status` unread|read|archived, `idempotency_key`, unique `(tenant_id,recipient_user_id,idempotency_key)`)
  — **dispara na criação, sem `notify_at`/`remind_before`/`visibility`.** (b) Módulo backend completo em `src/modules/notifications/`
  (service/controller/routes/dto/prisma-repo/recipient-resolver/**fleet-alerts.runner**/jobs) já montado em `src/app.ts:96`
  (`createNotificationRouter()`); endpoints vivos: GET `/notifications`, GET `/notifications/unread-count`, POST
  `/notifications/fleet-alerts/run`, POST `/notifications/:id/read`, `/notifications/read-all`, `/notifications/:id/archive`. (c)
  **Scheduler in-process = `src/infra/jobs/job.worker.ts:86`** — `setInterval(pollIntervalMs)` que chama `processNextJob()` -> dequeue da
  fila Redis (`job.queue.ts`, com ZSET de atrasados via `delayMs`/`promoteDueJobs`) -> `registry.get(name)` (`job.registry.ts`). Registrar
  um job = `registry.register(name, handler)` + nome em `JOB_NAMES` (`job.types.ts`); há **precedente** `notification-dispatch`
  (event-driven, enfileirado por `domain-event.publisher.ts`). **`startWorker()` NÃO é chamado em lugar nenhum** (`grep` no repo inteiro:
  só a definição; `server.ts` não inicia worker) -> o loop existe mas está **dormente** em produção. (d) Sino JÁ existe: `AppShell.tsx`
  (`Bell` + badge de não-lidas via `getUnreadNotificationCount` -> GET unread-count; escuta evento `notifications:changed`) + página
  `/notifications` (`NotificationsPage.tsx`). (e) Fuso de negócio pronto: `src/config/business-time.ts` (`parseBusinessDate` ancora
  naïve->BR-local UTC-3, `America/Sao_Paulo` via Intl). (f) `GET /users` (`listUsersForTenant`, perm `users:read`) + adapter front
  `modules/users` existem -> picker do CUSTOM reusa isso. (g) Permissões atuais: só `notifications:read`/`notifications:update` (catalog.ts
  :170-171; **não há `notifications:create`**); RBAC_MATRIX l.86 exige limitar read/update ao inbox do próprio usuário "unless a future
  admin endpoint is explicitly designed" -> é EXATAMENTE o endpoint que este PR desenha.
- **HIPÓTESE:** contagem exata do fan-out PUBLIC em tenants grandes; formato exato do picker CUSTOM do AutEM (não visto em frame limpo).
- **AutEM (comportamento a reproduzir, ANALISE:191/226/258/260-263/288):** modal "Cadastrar notificação (avulsa)" = **Data e Hora* |
  Antecedência (quanto tempo antes)* | Título* | Mensagem* | Tipo*: PRIVADA (só meu usuário) / PÚBLICA (todos) / PERSONALIZADA (selecionar
  usuários)**; Central lista TODAS as notificações cadastradas (Manutenção/Contas a Pagar/Multas/Seguros/avulsas) com editar+excluir.

- **Model — D-Ω4C-NOTIF-MODEL: DUAS CAMADAS (a mais aditiva; NÃO reescrever a tabela `notifications` madura).** NOVO model
  **`ScheduledNotification`** (tabela `scheduled_notifications`) = a **DEFINIÇÃO agendada** (o "cadastro" do AutEM); a tabela
  `notifications` existente permanece a **ENTREGA/inbox** (o disparo fan-out cai nela -> sino/central já leem). Justificativa: `notifications`
  é per-destinatário e dispara na criação; PUBLIC/CUSTOM precisam de fan-out no momento do disparo + estado de leitura por-usuário -> a
  camada de definição por cima é **aditiva e sem risco** (rewrite da tabela viva seria destrutivo/§C7.5). Campos de `ScheduledNotification`:
  id · **tenant_id (1º)** · title · message · **notify_at** Timestamptz (data-alvo) · **remind_before_minutes** Int? (antecedência) ·
  **reminder_at** Timestamptz? (DERIVADA server-side = notify_at − remind_before; persistida p/ scan indexável) · **visibility** enum-app
  `private|public|custom` (labels PRIVADA/PÚBLICA/PERSONALIZADA, **SEM CHECK** — validado na app, padrão extrato) · **custom_recipient_ids**
  Json (array de user_ids p/ CUSTOM; validado app-level contra usuários ATIVOS do tenant no disparo — descarta stale/cross-tenant; espelha
  `visibility_rules`/`metadata` Json, **sem join table**) · **source_type** enum-app? `maintenance_item|fine|insurance_policy|financial_title|manual`
  (nullable; `manual`=avulsa) · **source_id** uuid? (mesmo tenant, **sem FK nativa** — app-level, como party_id) · **status** enum-app
  `pending|fired|cancelled` (default pending) · **reminder_fired_at** Timestamptz? + **fired_at** Timestamptz? (guardas de idempotência) ·
  created_by uuid (**FK composta (tenant_id,created_by)->users**, como `Notification.recipient_user`) · client_action_id? · created_at/updated_at ·
  deleted_at? (soft = "excluir da central"). Índices: `@@unique([tenant_id,id])` · unique PARCIAL `(tenant_id,client_action_id) WHERE
  client_action_id IS NOT NULL` (create idempotente) · `@@index([tenant_id,status,notify_at])` (scan principal) · `@@index([tenant_id,status,
  reminder_at])` (scan do lembrete) · `@@index([tenant_id,created_by,created_at])` ("minhas agendadas") · `@@index([tenant_id,source_type,
  source_id])` (lookup dos consumidores). **RLS ENABLE+FORCE+POLICY USING+WITH CHECK** (clona `20260726000000_add_operator_profiles` /
  `20260823000000`). Migração ADITIVA up-only `20260824000000_add_scheduled_notifications` (rollback = DROP TABLE, tabela nova sem dependente) —
  provada up/down/re-up pelo **agente-dba-guardião**. Toca `prisma/**` (schema + migration + 1 descrição no seed) -> **requer autorização
  explícita de `prisma/**` no comando do PR-04** (como PR-01/03). **Camada de ENTREGA = tabela `notifications` INTOCADA** (zero ALTER).
- **Disparo/scheduler — D-Ω4C-NOTIF-SCHEDULER: REUSA `job.worker.ts:86` (setInterval), SEM node-cron.** NOVO job recorrente
  **`notifications.scan-due`** (add em `JOB_NAMES` + `registry.register`): o handler (a) para cada tenant ativo, chama
  `fireDueScheduledNotifications({tenantId, now})` dentro de `withTenantRls`; (b) **re-enfileira a si mesmo** com `delayMs` fixo (**60s**) via
  o ZSET de atrasados já existente -> recorrência **sem lib nova**. `fireDueScheduledNotifications` varre **duas ocorrências**: LEMBRETE
  (`status=pending ∧ reminder_at<=now ∧ reminder_fired_at IS NULL` -> dispara + seta reminder_fired_at) e PRINCIPAL (`status=pending ∧
  notify_at<=now ∧ fired_at IS NULL` -> dispara + seta fired_at + status=fired). O disparo resolve destinatários por **visibilidade** e cria as
  entregas na tabela `notifications` via `createManyNotifications` (reusa `sanitizeNotificationMetadata`). **`notify_at` no fuso de negócio:**
  o POST parseia a entrada naïve `YYYY-MM-DDTHH:mm` via **`parseBusinessDate` (business-time.ts, America/Sao_Paulo)** -> instante absoluto
  Timestamptz; o scan compara **instantes** (correto em qualquer fuso). **Worker start:** NOVO flag env `JOBS_WORKER_ENABLED` (default **false**);
  em `src/server.ts main()`, se flag=true ∧ persistence=prisma -> `startWorker()` + enfileira o 1º `notifications.scan-due`. Guardado p/ testes/CI
  (que importam `app.ts`, não `server.main()`) **nunca** subirem loop vivo. **Imediato sem depender do worker:** o POST, se `notify_at<=now`,
  chama `fireDueScheduledNotifications` inline (MESMO caminho idempotente) -> notificação imediata funciona com o flag OFF.
- **Idempotência — D-Ω4C-NOTIF-IDEMPOTENCY (invariante testável, mapeia a mandato "notification_id+fired_at"):** cada definição tem **no
  máx. 2 instantes de disparo** (reminder_at, notify_at). Cada ocorrência dispara **exatamente uma vez**: guardas `reminder_fired_at`/`fired_at`
  na definição barram o re-scan, e o **backstop DURO** é a `idempotencyKey = "sched:<scheduledNotificationId>:<occurrence>"` (occurrence ∈
  {reminder, main}) na unique EXISTENTE `(tenant_id,recipient_user_id,idempotency_key)` das entregas -> re-disparo por destinatário é
  de-duplicado no banco. **Prova (avaliador): chamar `fireDueScheduledNotifications` DUAS vezes com o mesmo `now` -> contagem de entregas
  idêntica** (independe do loop vivo; espelha o teste dos produtores de fleet-alerts).
- **Visibilidade — D-Ω4C-NOTIF-VISIBILITY:** `private`->`[created_by]` (só o criador); `public`->**todos os usuários ATIVOS do tenant**
  (reusa `listRecipientCandidates`); `custom`->`custom_recipient_ids ∩ ativos do tenant` (descarta stale/cross-tenant no disparo). Usuário fora
  do alvo **NUNCA** recebe (RN-NOTIF-02, provado com 3 usuários).
- **Endpoints** (no MESMO `createNotificationRouter`, sub-path `/notifications/scheduled` — módulo coeso, evita import reverso): **POST**
  `/notifications/scheduled` (o popup — cria definição; body {title, message, notify_at, remind_before_minutes?, visibility, custom_recipient_ids?,
  source_type?, source_id?, client_action_id?}; source_type default `manual`; **dispara inline se notify_at<=now**) · **GET** `/notifications/scheduled`
  (lista as definições **do próprio criador** — foundation; a lista tenant-wide de gestão é PR-20) · **GET** `/notifications/scheduled/:id`
  (404 cross-tenant via get tenant-scoped) · **DELETE** `/notifications/scheduled/:id` (soft-cancel: status=cancelled + deleted_at -> para
  ocorrências FUTURAS; entregas já disparadas permanecem no inbox — fato entregue não se "des-entrega"). Endpoints do inbox
  (GET/unread-count/read/read-all/archive) e do sino **INTOCADOS**. Sem endpoint REST de "disparar" (disparo é interno: scan + inline). O `firing`
  usa `type` `scheduled.reminder`/`scheduled.notification`, carrega source_type/source_id/actionUrl da definição.
- **Permissão — D-Ω4C-NOTIF-RBAC: permissão NOVA `notifications:create`** (separa "ler as minhas" de "criar/gerir/broadcast"). **Ler o próprio
  inbox** continua em `notifications:read` (amplo) e **agir no próprio inbox** em `notifications:update` (amplo) — **INTOCADOS**. **Criar/cancelar
  uma notificação AGENDADA** (que pode fazer broadcast PUBLIC/CUSTOM) exige `notifications:create`, concedida só a papéis de **gestão/operação**:
  super_admin, platform_admin, tenant_admin, manager, operator, field_dispatcher. `field_technician`/inventory/finance/auditor/viewer/support **NÃO**
  criam (um técnico não deve disparar broadcast pra org inteira; self-reminder privado p/ papéis de campo -> **Ω5**, D-007). Backend é a autoridade ->
  papel sem `create` no POST -> **403 real testado**. **Exige explicitamente (4 pontos, espelha D-Ω4C-EXTRATO-RBAC):** (1)
  `src/modules/core-saas/permissions/catalog.ts` — `notifications:create` no PERMISSION_CATALOG (junto de read/update, l.170) + nas listas dos 6
  papéis; (2) `tests/core-saas.test.ts` — a nova na MESMA posição de `expectedPermissionCatalog` (o `deepEqual` é o gate); (3) `prisma/seed.ts` —
  descrição PT-BR (opcional; fallback l.205); (4) `RBAC_MATRIX.md` — 1 linha (o "future admin endpoint explicitly designed" da l.86, agora desenhado).
- **Frontend — D-Ω4C-NOTIF-CENTRAL-SPLIT (parada honesta):** PR-04 entrega a **fundação** — (i) **popup reutilizável**
  `frontend/src/modules/notifications/components/CreateNotificationDialog.tsx` (campos AutEM: Data e Hora, Antecedência, Título, Mensagem, Tipo
  PRIVADA/PÚBLICA/PERSONALIZADA + picker de usuários no CUSTOM reusando `GET /users`), o component que Manutenção (PR-06) e Multa/Seguro (PR-09)
  vão invocar depois; (ii) montado como consumidor vivo na `NotificationsPage` existente (botão "Cadastrar notificação", **gate
  `can("notifications:create")`**) + adapter `createScheduledNotification`/`cancelScheduledNotification` em `notification.service.ts`; (iii) **sino
  confirmado** (já existe; o motor alimenta o inbox -> unread-count reflete automaticamente, zero mudança no contrato do sino). A **Central de
  gestão tenant-wide** (listar TODAS as agendadas + editar/excluir de qualquer criador) = **PR-20** (mandato §6). §3 PT-BR ("Notificações",
  nunca termo técnico), §7 estados (loading/empty/error/**acesso não permitido**/desatualizado), §2.8 (nunca vazar `custom_recipient_ids`/
  tenant_id/client_action_id a não-criador; metadata sanitizada).
- **RNs:** NOTIF-01 (idempotência de disparo — 2 ocorrências, cada uma 1x/destinatário; re-scan não duplica; guardas + unique de entrega) ·
  NOTIF-02 (visibilidade — private/public/custom; fora-do-alvo nunca recebe; 3 usuários) · NOTIF-03 (agendamento no fuso de negócio — parseBusinessDate
  BR-local; instante com Z respeitado; dispara só quando notify_at<=now) · NOTIF-04 (remind_before -> ocorrência de LEMBRETE em reminder_at, independente
  e idempotente da PRINCIPAL) · NOTIF-05 (contrato source_type/source_id pronto p/ consumidores, nullable, `manual`=avulsa, sem FK nativa; PR-04 **NÃO
  acopla** aos módulos — evita ciclo) · NOTIF-06 (multi-tenant 3 tenants efêmeros — scheduled_notifications e entregas tenant-scoped; cross 404; scan de
  A nunca entrega em B; updateMany cross=0; tenant_id 1º índice) · NOTIF-07 (§2.8/LGPD — DTO allowlist; sem tenant_id/client_action_id/custom_recipient_ids
  a não-criador; metadata sanitizada) · NOTIF-08 (RBAC — read-mine amplo vs create novo gestão/operação; POST sem create -> 403 real) · NOTIF-09
  (ciclo de vida — DELETE=soft-cancel para futuras; entregues permanecem; fired não re-dispara; cancelar antes do disparo cancela ambas as ocorrências) ·
  NOTIF-10 (sino alimentado pelo motor — entregas caem no inbox existente; contrato do sino inalterado).
- **Divergências AutEM honestas (D-007):** (i) recorrência da "próxima manutenção **por Tempo OU Quilometragem**" (ANALISE:191) — a recorrência por
  KM depende de hodômetro/telemetria (PR-06/16); PR-04 entrega `notify_at` **por tempo** + o popup reutilizável; a recorrência por KM é registrada pelo
  **consumidor de Manutenção** depois. (ii) **schedule recorrente** (repetir a cada N dias) — o motor do PR-04 dispara uma definição **one-shot**
  (lembrete + principal); a repetição é responsabilidade do consumidor (re-registra a próxima ocorrência) -> parada honesta. (iii) **Central de gestão
  tenant-wide + editar** -> PR-20. (iv) **self-service** de lembrete privado p/ papéis de campo -> **Ω5** (create é gestão/operação; app de campo não faz
  broadcast). (v) **worker dormente:** ligar `JOBS_WORKER_ENABLED` também drena a fila de jobs de evento pré-existente (`notification-dispatch` de
  checklist) — comportamento LATENTE do worker compartilhado, ativado deliberadamente por flag, **não é regressão do PR-04**; nenhum produtor alterado.
- **Bateria de validação (seção 10 — o avaliador roda):** `npx prisma validate` + `prisma migrate diff` (sem drift) + **dba-guardião prova up/down/re-up**
  de `20260824000000_add_scheduled_notifications` (ADITIVA: CREATE TABLE + RLS ENABLE/FORCE/POLICY + índices + FK composta; rollback=DROP TABLE);
  backend `npm run check` · `lint` · `test` · `build`; `node --test --import tsx tests/scheduled-notifications.test.ts` (NOVO — CRUD agendada + **fireDue
  idempotência [2x mesmo now -> mesmas entregas]** + visibilidade private/public/custom com 3 usuários + remind_before (lembrete) + notify_at TZ
  (parseBusinessDate) + cancel para-futuras/mantém-entregues + RBAC 403); `tests/rls-tenant-isolation.test.ts` estendido (3 tenants efêmeros; cross 404;
  scan de A não entrega em B; updateMany cross=0); `tests/core-saas.test.ts` (expectedPermissionCatalog com `notifications:create`); **ZERO regressão** em
  `notifications.test.ts` (4) · `notification-routes.test.ts` (2) · `fleet-alerts-notifications.test.ts` (10) · `job-queue.test.ts`; frontend `npm --prefix
  frontend run check` · `build` · smoke (CreateNotificationDialog + montagem na NotificationsPage + guard `notifications:create` + estados §7); `git diff
  --check` + `git status --short` limpo (schema/migration/seed/catalog/RBAC_MATRIX/server.ts/env.ts/testes incluídos por caminho; `app.ts` já monta o
  router -> sem mudança). KPI `docs/kpis/omega4c/KPI_PR-04.json` + histórico + snapshot; Kpis/* backend +N (scheduled-notifications+core-saas), frontend_smoke
  +M, blocks 74->**75**.
- **Riscos + rollback:** (R1) **loop runaway / tempestade de notificações** -> mitigado: re-enqueue com delayMs fixo (60s), guardas fired_at/reminder_fired_at,
  unique de entrega como backstop, flag default OFF; PUBLIC reusa `listRecipientCandidates` (cap de 20 já existente no resolver — reavaliar p/ broadcast).
  (R2) **visibilidade vazando entre usuários** -> mitigado: resolução por visibility no disparo + RLS FORCE + teste 3-usuários + DTO não expõe
  custom_recipient_ids a não-criador. (R3) **worker dormente ativado dispara jobs de evento pré-existentes** -> mitigado: flag deliberada, é o desenho do
  worker compartilhado, nenhum produtor tocado, documentado (D-007 v). (R4) **scan O(tenants)** -> mitigado v1 (poucos tenants); índice
  `(tenant_id,status,notify_at)`; futuro: cursor/fila por tenant. (R5) **prisma/**** -> só ADITIVO (CREATE TABLE + RLS + índices; +1 permissão catalog/seed;
  +flag env); **rollback = DROP TABLE `scheduled_notifications`** (tabela nova, sem dependente) + revert do PR (catalog/seed/test/server/env/front). Sem
  destrutivo (respeita parada §C7.5). **Sem dependência nova nem serviço externo pago -> junta normal, NÃO junta-5.**

**APROVADO para implementar.** (D-records desta fatia: **D-Ω4C-NOTIF-MODEL · -SCHEDULER · -IDEMPOTENCY · -VISIBILITY · -RBAC · -CENTRAL-SPLIT** — a junta
ratifica no veredito; persistir em controle/decisoes.md no PR. D-Ω4C-NOTIF do PLANO §2 permanece a decisão-mãe, aqui detalhada. Confirma FASE0_RECON §5:
reuso do `job.worker.ts:86`, **node-cron proibido**.)

#### PR-04 — Veredito da junta (2026-07-21) — **APROVADO (4 vetos, condição-BLOQUEIA descarregada em paralelo)**
- **agente-dba-guardião** → `APROVADO` (0 condições): migração `20260824000000_add_scheduled_notifications` provada **UP/DROP/RE-UP** em DB
  scratch isolada (cadeia completa das 60 migrações). Puramente aditiva (CREATE TABLE `scheduled_notifications` + 6 índices + FK composta
  `(tenant_id, created_by)`→users CASCADE + FK tenant RESTRICT + RLS ENABLE/FORCE/POLICY USING+WITH CHECK + unique parcial de idempotência
  `(tenant_id, client_action_id) WHERE client_action_id IS NOT NULL`); **ZERO ALTER/DROP na tabela `notifications` existente** (grep
  confirmou; toda ocorrência é `scheduled_notifications`). `notify_at`/`fired_at`/`reminder_fired_at` timestamptz, `custom_recipient_ids`
  jsonb, todo índice não-PK com `tenant_id` 1º. DROP preserva notifications/users (linhas/índices/RLS t/t); RE-UP idempotente. Integridade:
  FK cross-tenant → **23503**; colisão de idempotência → **23505**. Base de dev nunca tocada.
- **omega4c-avaliador** → `APROVADO_CONDICIONADO`→**descarregada**: seção 10 verde em modo CI/memória — frontend smoke **719/719**,
  `scheduled-notifications` **14/14**, `core-saas` **26/26**, **zero regressão** (inbox/notification-routes/fleet-alerts-notifications
  56/56), build/lint/check/prisma-validate/git-diff limpos, **worker NÃO sobe nos testes** (flag default false; `startWorker()` só em
  server.main(); processo saiu limpo, sem timeout). RN-NOTIF-01..07 cobertas: **idempotência de disparo** provada por 2 testes (guarda
  `fired_at`/`reminder_fired_at` + backstop duro `sched:<id>:<occurrence>` na unique de entrega), **visibilidade** PRIVATE/PUBLIC/CUSTOM
  sem vazamento (3 usuários), posse 404 cross-tenant E cross-criador, §2.8 auditoria allowlist, remind_before, RBAC 403 real p/ 7 papéis,
  disparo inline com flag OFF. Sua **única BLOQUEIA** ("dba-guardião aplicar a migração em Postgres vivo + provar up/down/re-up e RLS
  3-tenant verde") foi **exatamente entregue pelo dba-guardião em paralelo** (o avaliador diagnosticou o único vermelho local como migração
  pendente no dev DB e deferiu ao dba-guardião) → **condição descarregada**; o CI (roda `migrate deploy` + suíte completa incl.
  rls-tenant-isolation) é o gate empírico final do teste RLS. 2 BAIXA (DTO expõe customRecipientIds/sourceId — seguro pois creator-scoped
  100%, mas a Central tenant-wide do PR-20 NÃO pode reusar o DTO p/ não-criadores sem remover esses campos §2.8; git add por caminho).
- **coordenador-de-acessos** → `APROVADO`: permissão nova `notifications:create` = gestão/operação (super/platform/tenant_admin/manager/
  operator/field_dispatcher; admins herdam); **field_technician SEM broadcast** (correto). Catálogo↔`expectedPermissionCatalog`↔seed
  coerentes (core-saas 26/26, deepEqual de ordem passa, `notifications:create` no índice 161 após read/update). 4 rotas `/notifications/
  scheduled` sob `notifications:create` (403 real, scheduled 14/14); **inbox read/update INTOCADO** e sino gated por `notifications:read`
  (não pela permissão nova) → sino visível a todo logado. Front↔back gateiam a MESMA permissão. UI PT-BR, §2.8. 1 MEDIA (operator/
  field_dispatcher têm create mas não users.read → picker CUSTOM degrada p/ "Destinatários indisponíveis" com aviso honesto; broadcast
  CUSTOM fica na prática manager/admin — alinhar com produto se despacho precisar) + 1 BAIXA (DTO customRecipientIds/sourceId, creator-scoped).
- **agente-secops** → `APROVADO`: flag `JOBS_WORKER_ENABLED` **default false** com `booleanFlag` parse **estrito** (só true/1/yes/on; ""/"false"/
  lixo→false — evita footgun do z.coerce); worker só sobe com `flag=true ∧ persistence=prisma`, chamado APENAS em `server.main()` (nunca
  import/rota/teste); job `scan-due` RLS-scoped por tenant via `withTenantRls`; **zero segredo versionado**, nenhum gate de produção do
  env.ts afrouxado (JWT/CORS-wildcard-ban/Nominatim-ban intactos), sem exec/eval/SSRF, auditoria/DTO na allowlist §2.8, nada de CORS/TLS/CI
  tocado. 2 BAIXA (.docx untracked não incluir; opcional documentar a flag no .env.example).
- **Decisão:** verde efetivo → merge (CI é o gate empírico do teste RLS DB-gated) + KPI no próprio PR (§C3). **RN-NOTIF-01..10 cobertas.**
  D-records (D-Ω4C-NOTIF-MODEL/-SCHEDULER/-IDEMPOTENCY/-VISIBILITY/-RBAC/-CENTRAL-SPLIT) **ratificados**. **Nota p/ PR-20:** a Central
  tenant-wide precisa de um DTO §2.8 sem `custom_recipient_ids`/`source_id` p/ não-criadores (D-Ω4C-NOTIF-DTO-CENTRAL).
- KPI: `docs/kpis/omega4c/KPI_PR-04.json`. `Kpis/*`: backend 1336→**1350** (+14 scheduled-notifications); frontend_smoke 703→**719** (+16
  scheduled-notification dialog); blocks 74→**75**.

### PR-05 — Abastecimento (KM/L, interno/externo, fornecedor, baixa de combustível) — plano do omega4c-planejador (2026-07-21)
**Veredicto Fase 0 (recon REAL, FATO vs HIPÓTESE):** **ESTENDER** (rebaixado CRIAR→ESTENDER na Fase 0 — FASE0_RECON §40). O módulo
`src/modules/fuel-logs/` já é **maduro e vivo**; grande parte do comportamento AutEM **já existe**. PR-05 fecha o **gap real** (posto
interno/externo + fornecedor + honestidade do KM/L), e **DEFERE** a baixa de estoque interno a PR-10/11 (parada honesta) — abaixo.
- **FATO (li no código):** (a) Model `FuelLog` (`prisma/schema.prisma:862`, tabela `fuel_logs`): tem `vehicle_id` (FK composta
  `(tenant_id,vehicle_id)→vehicles` RESTRICT `:881`), `operator_id?`, `work_order_id?`, `fueled_at`, `fuel_type` (default gasolina),
  `liters` **Decimal(20,6)**, `total_value` **Decimal(20,6)**, `odometer` **Int**, `station?` (posto texto-livre), `notes?`, `is_active`,
  auditoria. **NÃO tem** `supplier_id` nem marcação interno/externo. (b) **KM/L JÁ é calculado** — `fuel-log.efficiency.ts:computeEfficiency`
  deriva `kmPerLiter`/`distanceKm` (`= Δodômetro / litros`) do **histórico ordenado da MESMA viatura**, **NUNCA persistido** (DTO `:21`
  "derived, never persisted"), **null (honesto) no 1º abastecimento** (baseline sem predecessor). (c) **Odômetro monotônico JÁ é travado** —
  `service.assertOdometerMonotonic` (`fuel-log.service.ts:173`) → **422 `odometer_regressive`** se leitura < máx. da viatura. (d) **Contas a
  pagar por origem JÁ ligado** — `createPayableSourceRoutes({sourceType:"fuel_log"})` em `fuel-log.routes.ts:64` (PR-02); `PayableToggle` já no
  `FuelLogFormModal.tsx:294` (create + edit). (e) **Front vivo:** `AbastecimentoPage.tsx` (listagem com coluna **km/L** honesta
  `formatKmPerLiter(null)→"—"` `:203`, KPI de frota) + `FuelLogFormModal.tsx`. (f) **Fornecedor existe** — `src/modules/suppliers/`
  (`SupplierService.get(actor,id)` tenant-scoped, **sem gate de permissão próprio** — igual ao `VehicleService.get`) + front
  `frontend/src/modules/registry/suppliers/`. (g) **Estoque existe MAS sem custódia nem flag combustível** — `inventory.types.ts` já tem
  `STOCK_MOVEMENT_TYPES=[entrada,saida,consumo,ajuste]`, ledger imutável assinado, `insufficientBalanceError` (409, saldo nunca negativo) e
  `vehicleId` no movimento; **porém NÃO tem** custódia BASE/PROFESSIONAL/VEHICLE nem flag "combustível" no item — ambas são **PR-10/11**
  (cronograma §6, Fase 2). (h) Permissão: `fuel_logs:read/create/update` já existem (`fuel-log.routes.ts:17`).
- **HIPÓTESE:** pixel exato do modal AutEM (fração/ordem) — reproduzimos o **comportamento** (§11), não o visual; formato do select "Estoque"
  (itens flag-combustível) — **deferido** com a baixa (PR-10/11). Motorista/Profissional (`operator_id`) é backend-suportado mas não exposto no
  modal — extensão frontend **opcional-barata** (não bloqueia o core).

- **Model — D-Ω4C-FUEL-STATION-TYPE + D-Ω4C-FUEL-SUPPLIER (extensão ADITIVA de `FuelLog`, nunca destrutiva):** **+2 colunas** em `fuel_logs`:
  (1) **`station_type`** TEXT **NOT NULL DEFAULT `'external'`** — enum-app `internal|external` (labels **INTERNO/EXTERNO**, **SEM CHECK**,
  validado na app; padrão de enum-app da rodada, §3 invariante). Default `'external'` faz **backfill semanticamente correto** das linhas legadas
  (que têm `station` texto = posto externo; "interno" era inexpressável antes). (2) **`supplier_id`** UUID **NULL** + **FK composta
  `(tenant_id,supplier_id)→suppliers(tenant_id,id)` ON DELETE RESTRICT** (espelha a FK de `vehicle` `:881`) + relação inversa aditiva
  `fuelLogs FuelLog[]` no model `Supplier` (virtual; a coluna FK vive só em `fuel_logs`) + **`@@index([tenant_id,supplier_id])`**. `station`
  (texto-livre) **permanece** (coexistência: snapshot/nome do posto). **`total_value`/`liters` permanecem Decimal(20,6)** (pré-existente; ALTER de
  tipo seria destrutivo → **proibido §C7.5** — divergência aceita da invariante Decimal(12,2), ver D-Ω4C-FUEL-MONEY-PRECISION/D-007). **Valor
  Unitário (R$)** do AutEM = **DERIVADO** (`total/liters`) exibido no front, **não persistido** (mesma disciplina do KM/L — não fabricar derivado).
  Migração ADITIVA up-only **`20260825000000_add_fuel_log_supplier_station_type`** (2× ADD COLUMN + FK composta + índice + relação inversa;
  rollback = DROP COLUMN — colunas novas sem dependente) — provada up/down/re-up pelo **agente-dba-guardião**. Toca `prisma/**` (schema +
  migration; **seed INTOCADO** — sem permissão nova) → **requer autorização explícita de `prisma/**` no comando do PR-05** (como PR-01/03/04).
- **Interno vs externo — D-Ω4C-FUEL-STATION-TYPE (regras testáveis, ANALISE:50-52/66):** **EXTERNO** = posto/fornecedor → **`supplier_id`
  OBRIGATÓRIO** validado no tenant via resolver `resolveSupplier` (`SupplierService.get(actor,id)`; espelha `resolveVehicle`
  `fuel-log.service.ts:254`) → cross-tenant/inexistente = **400 `invalid_supplier_reference`**; gera título em contas a pagar pelo rail já
  existente (PR-02). **INTERNO** = tanque próprio da base → **`supplier_id` PROIBIDO** (supplier em interno = **422
  `supplier_not_allowed_for_internal`**) e **marca** o log para a baixa futura; a **baixa é deferida (abaixo)**. Sem `station_type` no body →
  default `external` (compat). `parseStationType` novo em `.validators.ts` (SEM CHECK, app-level) + `resolveSupplier` novo em
  `FuelLogReferenceResolvers`.
- **Baixa de combustível (estoque) — D-Ω4C-FUEL-STOCK-DEFER (parada honesta D-007; recomendação que NÃO fabrica e NÃO acopla):** a **baixa de
  estoque do abastecimento interno é DEFERIDA integralmente a PR-10/11**. PR-05 entrega **só a MARCAÇÃO** (`station_type=internal`), **NENHUM**
  movimento de estoque, **NENHUM** import de `inventory` no `fuel-logs` (zero acoplamento). **Justificativa (3 razões):** (i) a baixa AutEM é
  *"consome do estoque **da base** (item marcado como combustível)"* (ANALISE:66) — depende de **custódia BASE/PROFESSIONAL/VEHICLE** + **flag
  combustível no item**, e **nenhuma das duas existe** hoje (são PR-10/11, Fase 2; o cronograma §6 sequencia custódia **depois** de abastecimento
  → a baixa **não pode** existir no PR-05 sem forward-reference a PR-10/11). (ii) Baixar contra o ledger **flat** atual (sem custódia)
  **fabricaria** semântica que PR-10/11 teria de **reworkar/reconciliar** (o EXIT sai da custódia BASE, não do saldo global). (iii) Exigir a baixa
  agora criaria **acoplamento transacional cross-módulo prematuro** (`fuel_log` create + `stock_movement` EXIT na mesma tx → `fuel-logs`
  importando `inventory`). **Contrato foundation-ready:** PR-10/11, ao introduzir custódia + flag combustível + o select "Estoque", lê os fuel
  logs `station_type=internal` e **posta o EXIT idempotente** da custódia BASE — consumidor puramente aditivo. O charter §3 ("Abastecimento
  interno gera EXIT de estoque") é satisfeito **pela rodada** em Fase 2, não pelo PR-05. **NÃO** adicionamos `stock_item_id` agora (seria coluna
  morta sem a flag/custódia/select — capturá-la junto do mecanismo em PR-10/11 é coeso e não-especulativo).
- **KM/L — D-Ω4C-FUEL-KML-HONESTY (RN-ABA-04; invariante testável, endurecimento in-scope de `fuel-logs`):** `consumo = (odômetro_atual −
  odômetro_anterior)/litros`, **derivado server-side, NUNCA persistido** (já é). **Endurecer** `computeEfficiency`: KM/L/distância são honestos
  **"—"/null** quando (a) **1º abastecimento** (sem predecessor real — já coberto) **OU** (b) **Δodômetro ≤ 0** (hoje `computeEfficiency:50-51`
  devolve KM/L **negativo** quando o odômetro regride via "desconsiderar último KM" — isso **fabrica** consumo sem sentido). Regra nova: se
  `distanceKm ≤ 0` → `NO_EFFICIENCY` (null/null). Predecessor = último log **estritamente anterior** na ordem cronológica da MESMA viatura (já é).
  É endurecimento **dentro do módulo em escopo** (fuel-logs), não refactor oportunista de terceiros.
- **"Desconsiderar último KM" — D-Ω4C-FUEL-IGNORE-ODOMETER (ANALISE:61):** flag de request **transiente** `ignore_previous_odometer` (bool,
  parse via `readOptionalBoolean`, **NÃO persistida** — é override de validação, não fato do log) que **bypassa** o guard
  `assertOdometerMonotonic` (usado no 1º abastecimento da viatura / correção). Coerência com KM/L: se o odômetro entrar menor, a nova guarda Δ≤0
  devolve **"—"** (não fabrica). Sem a flag, odômetro regressivo continua **422 `odometer_regressive`** (comportamento atual preservado).
- **Permissão — reusa `fuel_logs:read/create/update` (SEM permissão nova):** confirmado — as rotas já gateiam por `FUEL_LOG_PERMISSIONS`
  (`fuel-log.routes.ts:17`). `supplier_id` é validado por **resolver server-side** (`SupplierService.get`, sem gate próprio, igual ao vehicle
  resolver) → **NÃO exige `suppliers:read` do ator**. Nada em `catalog.ts`/`core-saas.test.ts`/`RBAC_MATRIX.md` muda. Backend é a autoridade
  (papel sem `fuel_logs:create` → **403 real**, já testado). D-Ω4C-FUEL-RBAC-REUSE.
- **Frontend — ESTENDER a tela viva (`frontend/src/modules/fleet/fuel/`):** (i) **`FuelLogFormModal`** — add **select "Posto"** INTERNO/EXTERNO
  (`station_type`; controla condicionais, ANALISE:50); **quando EXTERNO** → mostra **select "Fornecedor"** (`supplier_id`, reusa
  `registry/suppliers` service listando fornecedores **ativos** do tenant); **quando INTERNO** → **não fabrica** o select "Estoque" (deferido —
  sem andaime de dev §11.2; opcional: nota sutil "baixa de estoque na custódia — em breve"); add checkbox **"Desconsiderar último KM"**
  (`ignore_previous_odometer`) + **Valor Unitário (R$)** derivado exibido (total/litros, read-only). `station` texto-livre coexiste (posto quando
  sem fornecedor). PayableToggle **intocado** (já ligado); `partyName` do título pode default ao nome do fornecedor. (ii) **`AbastecimentoPage`** —
  add coluna **"Posto"** (badge INTERNO/EXTERNO) + **"Fornecedor"** (nome do fornecedor/posto); coluna **km/L já existe** (confirmar "—" honesto
  para baseline/Δ≤0). §3 PT-BR (INTERNO/EXTERNO, Posto/Fornecedor — nunca termo técnico), §7 estados (loading/empty/error/**acesso não
  permitido**/desatualizado), §2.8 DTO allowlist (nunca tenant_id/storage). Guard RBAC `fuel_logs:*` (existente).
- **DTO/auditoria — D-Ω4C-FUEL-DTO (§2.8):** DTO de fuel-log ganha `stationType` + `supplierId` (+ `supplierName` como **label** derivado, jamais
  dado sensível do fornecedor); **nunca** tenant_id/storage/client_action_id. Auditoria já existe (`fuel_log.created/updated`) — estender metadata
  com `stationType`/`supplierId` (não-PII).
- **RNs:** **ABA-01** (interno/externo — enum-app `station_type`; EXTERNO exige `supplier_id` válido no tenant, cross-tenant→400
  `invalid_supplier_reference`; INTERNO proíbe supplier→422 `supplier_not_allowed_for_internal`; `station` texto-livre coexiste) · **ABA-02**
  (fornecedor reusa `suppliers`; FK composta `(tenant_id,supplier_id)` RESTRICT; resolver server-side; **sem permissão nova**) · **ABA-03**
  (externo → contas a pagar pelo rail PR-02 já vivo; coexistência intocada) · **ABA-04** (KM/L derivado server-side, nunca persistido; honesto
  "—"/null no 1º abastecimento **e** quando Δodômetro≤0 — guarda Δ>0) · **ABA-05** ("desconsiderar último KM" = flag transiente
  `ignore_previous_odometer` não-persistida que bypassa o guard 422; sem a flag, regressivo→422) · **ABA-06** (baixa de estoque interno
  **DEFERIDA a PR-10/11** — PR-05 só marca `station_type=internal`, zero movimento/zero import de inventory; parada honesta D-007) · **ABA-07**
  (§2.8/§3 — DTO allowlist com `stationType`/`supplierId`/`supplierName` label; UI PT-BR; auditoria não-PII) · **ABA-08** (multi-tenant 3 tenants
  efêmeros — `fuel_logs` + `supplier_id` tenant-scoped; supplier cross-tenant rejeitado; `tenant_id` 1º índice; cross 404; updateMany cross=0).
- **Divergências AutEM honestas (D-007):** (i) **baixa de combustível do estoque interno** (select "Estoque" + EXIT da custódia BASE) →
  **PR-10/11** (custódia + flag combustível não existem; ver D-Ω4C-FUEL-STOCK-DEFER). (ii) **`total_value`/`liters` Decimal(20,6)** pré-existente
  (não Decimal(12,2) da invariante) — ALTER de tipo é destrutivo/proibido §C7.5; divergência aceita (D-Ω4C-FUEL-MONEY-PRECISION). (iii) **Valor
  Unitário** exibido derivado (total/litros), não persistido — AutEM edita o total; total é a fonte de verdade. (iv) **Motorista/Profissional**
  (`operator_id`) backend-suportado mas exposição no modal é **opcional-barata** (não core do PR-05). (v) pixel do modal/ordem exata AutEM não
  vistos em frame limpo → reproduzimos o **comportamento** (§11), não o visual.
- **Bateria de validação (seção 10 — o avaliador roda):** `npx prisma validate` + `prisma migrate diff` (sem drift) + **dba-guardião prova
  up/down/re-up** de `20260825000000_add_fuel_log_supplier_station_type` (ADITIVA: 2× ADD COLUMN + FK composta + índice + relação inversa;
  rollback=DROP COLUMN); backend `npm run check` · `lint` · `test` · `build`; `node --test --import tsx tests/fuel-logs.test.ts` +
  `tests/fuel-logs-routes.test.ts` (estendidos — **novos casos:** station_type interno/externo; EXTERNO sem supplier→422 e com supplier
  cross-tenant→400; INTERNO com supplier→422; **KM/L Δ≤0→"—"**; `ignore_previous_odometer` bypassa 422; **nenhum stock_movement escrito**); ZERO
  regressão nos casos **existentes** de KM/L/monotônico/payable (`financial-title-source`) e `work-order-*`; `tests/rls-tenant-isolation.test.ts`
  estendido (3 tenants efêmeros; supplier cross-tenant rejeitado; cross 404; updateMany cross=0); frontend `npm --prefix frontend run check` ·
  `build` · smoke (modal INTERNO/EXTERNO + fornecedor select + "desconsiderar" + colunas Posto/Fornecedor + km/L honesto + estados §7 + guard);
  `git diff --check` + `git status --short` limpo (schema/migration/fuel-logs/**/front por caminho; seed/catalog/RBAC_MATRIX **intocados**). KPI
  `docs/kpis/omega4c/KPI_PR-05.json` + histórico + snapshot; Kpis/* backend +N (fuel-logs), frontend_smoke +M, blocks 75→**76**.
- **Riscos + rollback:** (R1) **FK de fornecedor cross-tenant** → mitigado FK composta `(tenant_id,supplier_id)` RESTRICT + resolver 400 + RLS
  FORCE + teste 3-tenant. (R2) **KM/L fabricado (negativo) com "desconsiderar"** → mitigado guarda Δ>0 (honesto "—"), teste. (R3) **acoplamento
  prematuro com estoque** → mitigado deferindo a baixa a PR-10/11 (zero import de `inventory` no `fuel-logs`; contrato foundation-ready). (R4)
  **default `'external'` reclassifica logs internos legados** → aceito (legado tinha `station`=posto externo; interno era inexpressável;
  reclassificável por update). (R5) **`prisma/**`** → só ADITIVO (2 ADD COLUMN + FK + índice + relação inversa; **sem** permissão/seed);
  **rollback = DROP COLUMN `station_type`/`supplier_id`** (colunas novas, sem dependente) + revert do PR (fuel-logs/**/front). Sem destrutivo
  (respeita parada §C7.5). **Sem dependência nova nem serviço externo pago → junta normal, NÃO junta-5.**

**APROVADO para implementar.** (D-records desta fatia: **D-Ω4C-FUEL-STATION-TYPE · -SUPPLIER · -STOCK-DEFER · -KML-HONESTY · -IGNORE-ODOMETER ·
-RBAC-REUSE · -MONEY-PRECISION(D-007)** — a junta ratifica no veredito; persistir em controle/decisoes.md no PR. Confirma FASE0_RECON §40:
gap = `supplier_id` + baixa de combustível [deferida] + KM/L [endurecido] + marcação interno/externo.)

#### PR-05 — Veredito da junta (2026-07-22) — **APROVADO (3 vetos; 1 ciclo de reprovação resolvido)**
- **agente-dba-guardião** → `APROVADO` (0 condições): migração `20260825000000_add_fuel_log_supplier_station_type` provada **UP/DOWN/RE-UP** em
  DB scratch isolada. Puramente aditiva: `ADD COLUMN station_type TEXT NOT NULL DEFAULT 'external'` + `ADD COLUMN supplier_id UUID`
  nullable + FK composta `(tenant_id, supplier_id)`→suppliers RESTRICT + índice `(tenant_id, supplier_id)`. `total_value`/`liters`
  seguem `numeric(20,6)` INTOCADOS (ALTER de tipo seria destrutivo); nenhuma outra tabela tocada. RLS de fuel_logs e suppliers t/t
  antes/depois. **Backfill legado provado** (linha antiga → station_type='external', supplier_id=NULL). Integridade: FK cross-tenant →
  **23503**; RESTRICT bloqueia DELETE de supplier referenciado → **23503**.
- **coordenador-de-acessos** → `APROVADO`: **permissão REUSADA** — `catalog.ts`/`tests/core-saas.test.ts`/`RBAC_MATRIX.md` com diff
  VAZIO (reusa `fuel_logs:read/create/update`; nenhuma permissão nova). Posse do fornecedor resolvida server-side via suppliers service
  tenant-scoped (cross-tenant → **400 invalid_supplier_reference**); rotas seguem gated por `fuel_logs:create/update` (nada afrouxado);
  UI PT-BR ("Interno (posto próprio)"/"Externo"/"Fornecedor") sem PII/tenant_id; DTO só `supplierId`+`supplierName` label. 1 BAIXA
  (picker de fornecedor não surfa fallbackReason — inofensivo: todo papel com `fuel_logs:create` tem `suppliers:read`).
- **omega4c-avaliador** → `APROVADO_CONDICIONADO`→**re-verificado APROVADO**: 1ª passada seção 10 verde (fuel-logs 31/31, regressão
  167/167 zero, smoke 726/726, build/prisma/git limpos) mas emitiu **1 BLOQUEIA** — RN-ABA-08: o omega4c-dev-backend foi **cortado por
  erro de API** e deixou andaime morto (`createSupplier/tenantC/managerC` sem `test()` consumindo); a rejeição cross-tenant do fornecedor
  só estava provada por resolver MOCKADO no service. **Reprovação-ciclo-1** (R-Ω4C-PR05-ciclo1): dev retomado fechou os testes de rota na
  **stack HTTP REAL** — supplier do tenant A e C referenciados por ator do tenant B em `POST /fuel-logs` → **ambos 400
  invalid_supplier_reference** (SupplierService.get real, 3 tenants); EXTERNO+supplier same-tenant→201 com supplierId/supplierName +
  §2.8 (sem tenant_id); EXTERNO sem supplier→422; INTERNO+supplier→422; RN-ABA-05 ignore_previous_odometer na rota. Andaime consumido
  11× por 5 testes novos; fuel-logs **36/36**, tsc/git limpos. **Avaliador re-rodou os testes por conta própria e descarregou a
  BLOQUEIA.** Residuais não-bloqueantes: 1 MEDIA (rls-tenant-isolation "users and checklists" DB-gated/ambiental, arquivo intocado, sobre
  users/checklists não fuel_logs — CI + dba-guardião são o gate empírico) + 1 BAIXA (untracked omega5p/.docx/.claude/skills — não commitar).
- **Decisão:** verde (3 vetos APROVADO após 1 ciclo de reprovação resolvido) → merge (CI = gate empírico do rls DB-gated) + KPI no PR
  (§C3). **RN-ABA-01/02/04/05/06/07/08 cobertas.** **Baixa de estoque deferida a PR-10/11** (D-Ω4C-FUEL-STOCK-DEFER). D-records
  (D-Ω4C-FUEL-STATION-TYPE/-SUPPLIER/-STOCK-DEFER/-KML-HONESTY/-IGNORE-ODOMETER/-RBAC-REUSE/-MONEY-PRECISION) **ratificados**.
- KPI: `docs/kpis/omega4c/KPI_PR-05.json`. `Kpis/*`: backend 1350→**1364** (+14 fuel-logs: 9 unit + 5 rota); frontend_smoke 719→**726**
  (+7 abastecimento-station-type); blocks 75→**76**.

### PR-06 — Manutenção de Frota (cabeçalho+itens, totais derivados, sugestão de hodômetro, notificação de próxima manutenção) — plano do omega4c-planejador (2026-07-22)
**Mapeia PR-07+PR-08 do PLANO_OMEGA4C** numa fatia vertical (back+front, padrão da rodada). **Veredicto Fase 0 (recon REAL, FATO vs
HIPÓTESE):** **ESTENDER** — `src/modules/maintenance-orders/` e `frontend/src/modules/fleet/maintenance/` são **maduros e vivos**; o gap
é a **grade de itens + totais derivados + sugestão de hodômetro + a próxima-manutenção como 1º CONSUMIDOR do motor PR-04**.
- **FATO (li no código):** (a) Model `MaintenanceOrder` (`schema.prisma:898`, `maintenance_orders`) é **CABEÇALHO-SÓ**: `vehicle_id`
  (FK composta `(tenant_id,vehicle_id)→vehicles` RESTRICT), `type` (preventiva|corretiva), `status` (agendada|em_execucao|concluida|
  cancelada — máquina de estados viva), `scheduled_for`, `completed_at`, **`cost` Decimal(20,6) ÚNICO manual**, `supplier` texto-livre,
  `odometer` Int?, `description`, auditoria. **NÃO tem itens/linhas, NÃO tem total derivado, NÃO tem next_due_at.** (b) **Odômetro
  monotônico JÁ travado** — `assertOdometerMonotonic` (`service.ts:196`) → **422 `odometer_regressive`** se leitura < máx. da viatura
  (max **cross-fonte** de manutenção **+** fuel_logs via resolver `maxFuelLogOdometer`). (c) **Conclusão** exige custo>=0 + data
  (`assertCompletionRequirements`). (d) **PayableToggle (PR-02) JÁ ligado** — `createPayableSourceRoutes({sourceType:maintenance_order})`
  em `routes.ts:69`; `PayableToggle mode=edit` em `MaintenanceFormModal.tsx:301` (amount default = `order.cost`) — **INTOCÁVEL**. (e)
  **Anexos (PR-01) JÁ montados** — abas `Editar|Arquivos` + `EntityAttachmentsTab entityType=maintenance_order`. (f) **JÁ existe um
  produtor de notificação de manutenção** — `runMaintenanceDueNotifications` (R2.2, `maintenance-order.notifications.ts`): produtor
  fleet-alerts que varre preventiva+agendada com `scheduled_for` na janela de 7 dias → cria **inbox `Notification`** (idempotencyKey
  `maintenance_due:<id>`), disparado por `POST /notifications/fleet-alerts/run`. **É o lembrete da manutenção JÁ AGENDADA, mecanismo
  DISTINTO** do motor `ScheduledNotification` do PR-04 (a "próxima manutenção" do AutEM = a **recorrência futura**). Coexistem — **não
  tocar o produtor R2.2** (zero regressão). (g) **Motor PR-04 pronto p/ consumo:** `SCHEDULED_NOTIFICATION_SOURCE_TYPES` **já inclui
  `maintenance_item`** (`scheduled-notification.types.ts:10` — provisionado pelo PR-04); `ScheduledNotificationService.create(actor,body)`
  aceita source_type/source_id/notify_at/visibility/**client_action_id** e **dispara INLINE** se vencida; `notify_at` naïve é ancorada ao
  **fuso de negócio** (`parseNotifyAt`→`parseBusinessDate`, America/Sao_Paulo). **DEDUPE CONFIRMADO no código:** `create` com
  `client_action_id` faz `findFirst`-por-client_action_id e **RETORNA A DEFINIÇÃO EXISTENTE** (InMemory :42-47 **e** Prisma :20-25);
  colisão de corrida → P2002 vira **409 `duplicate_client_action_id`**. (h) **Sugestão de hodômetro** — as leituras existem
  (`maxFuelLogOdometer` + `maxOdometerForVehicle`) mas **NÃO há endpoint de leitura**. (i) **Precedente de impressão 100% client-side**
  existe (`work-orders/components/PrintWorkOrderModal.tsx` — `window.print()`, sem PDF no backend, seções honestas). (j) Perm
  `maintenance_orders:read/create/update` já existem (`routes.ts:20`). (k) **Front:** `MaintenanceFormModal`+`MaintenanceCompletionModal`+
  `ManutencaoPage` (lista densa: Situação|Tipo|Viatura|Descrição|Agendada|Concluída|Custo|Ações) vivos — **sem grade de itens, sem totais,
  sem próxima, sem impressão**. Baseline testes: `maintenance-orders.test.ts` (10) + `maintenance-orders-routes.test.ts` (16) = **26**.
- **HIPÓTESE:** o `Tipo` do item AutEM (SERVIÇO / PRODUTO / ESTOQUE ~ — ESTOQUE atado à custódia PR-10/11, marcado ~); se o popup de
  próxima manutenção dispara **por item ou por manutenção** (ANALISE:302, "áudio sugere por item") → **resolvido por D-Ω4C-RECON-05:
  disparo por item COM dedupe idempotente pelo sourceId DA MANUTENÇÃO** (adicionar N itens = **1** notificação); pixel exato do modal/grade
  não visto em frame limpo → reproduzimos o **comportamento** (§11), não o visual do AutEM.

- **Itens (linhas) — D-Ω4C-MANUT-ITEMS: tabela filha nova `MaintenanceOrderItem` (`maintenance_order_items`), NÃO embutidos** (query por
  linha, RLS própria, total honesto e saldo verificável exigem tabela filha; JSON embutido quebraria isso). Campos: id · **tenant_id (1º)**
  · **maintenance_order_id** · `item_type` enum-app service|product|stock (labels **SERVIÇO/PRODUTO/ESTOQUE**, **SEM CHECK** — validado na
  app, padrão da rodada) · description (req) · **unit_value Decimal(12,2) > 0** (coluna NOVA → segue a invariante Decimal(12,2), diferente do
  `cost` legado 20,6) · **quantity Decimal(10,3) > 0** · notes? · is_active + deleted_at (soft-delete = "excluir item") · created_by/
  updated_by · created_at/updated_at. **FK COMPOSTA (tenant_id, maintenance_order_id) → maintenance_orders(tenant_id,id) ON DELETE
  RESTRICT** + relação inversa aditiva `items MaintenanceOrderItem[]` no model `MaintenanceOrder`. Índices: @@unique([tenant_id,id]) ·
  @@index([tenant_id,maintenance_order_id]) (grade da ordem) · @@index([tenant_id,maintenance_order_id,item_type]) (buckets de total).
  RLS ENABLE+FORCE+POLICY USING+WITH CHECK (clona 20260823000000). **`total_value` da linha NÃO é coluna — é DERIVADO** (unit_value ×
  quantity, arredondado 2 casas) server-side, **nunca persistido** (mesma disciplina KM/L do PR-05 e saldo do PR-03). Endpoints (literal
  ANTES do `:maintenanceOrderId` param p/ não colidir): GET `/maintenance-orders/:id/items` · POST `/maintenance-orders/:id/items` · PATCH
  `/maintenance-orders/:id/items/:itemId` · DELETE `/maintenance-orders/:id/items/:itemId` (soft) — cada um resolve a **posse do pai** via
  `maintenanceOrderService.get(actor,id)` (**404 cross-tenant nativo**) antes de tocar a linha.
- **Totais — D-Ω4C-MANUT-TOTALS-DERIVED (total do cabeçalho = Σ itens, DERIVADO server-side; NÃO fabricar):** o DTO do cabeçalho ganha
  `totals { totalServices (Σ service), totalProducts (Σ product+stock), total = totalServices+totalProducts, itemCount }` **computados no
  service a cada leitura, nunca persistidos**. O AutEM mostra Total Produtos | Total Serviços | Total (ANALISE:187) → ESTOQUE cai no bucket
  **Produtos** (é peça física). **Coexistência com o `cost` legado:** o `cost` manual do cabeçalho **permanece** (backward-compat: os 26
  testes + a regra de conclusão custo>=0 + o default do PayableToggle) — **a lógica de conclusão fica INTOCADA** (zero regressão). Quando há
  itens, o front exibe o total derivado; o **amount default do PayableToggle passa a ser o total derivado** (fallback ao `cost` quando não há
  item) → "lançar o valor total no contas a pagar" (ANALISE:193) fica honesto. `cost` (20,6) **não** é alterado de tipo (ALTER destrutivo,
  §C7.5) — divergência aceita registrada (D-Ω4C-MANUT-MONEY, gêmea do PR-05 -MONEY-PRECISION).
- **Sugestão de hodômetro — D-Ω4C-MANUT-ODOMETER-SUGGEST (derivado honesto):** endpoint novo **GET `/maintenance-orders/odometer-suggestion?vehicleId=`**
  (perm `maintenance_orders:read`; literal declarado ANTES de `:maintenanceOrderId`) que devolve { suggestedOdometer, source:
  fuel_log|maintenance_order, recordedAt } | null = o **maior odômetro conhecido** da viatura (reusa `maxFuelLogOdometer` +
  `maxOdometerForVehicle` já existentes). **Sem histórico → null (sem sugestão, não inventa)** — invariante testável, espelha o toast AutEM
  ("Encontramos um abastecimento onde o hodômetro era 15.500 Km. Deseja preencher?", ANALISE:183). O guard monotônico (422) **permanece**;
  a sugestão só **pré-preenche** o campo, o usuário confirma.
- **Próxima manutenção (1º CONSUMIDOR do motor PR-04) — D-Ω4C-MANUT-NEXTDUE-NOTIF:** **+1 coluna aditiva `next_due_at` Timestamptz? em
  `maintenance_orders`** (a data prevista da PRÓXIMA manutenção, **por TEMPO**). Quando `next_due_at` é informado no create/update, o service
  cria **UMA** `ScheduledNotification` via o motor: source_type=maintenance_item (já no allowlist do PR-04), source_id = maintenanceOrderId
  (a chave de dedupe = a manutenção), notify_at = next_due_at, visibility (default **private**; aceita `next_due_visibility` private|public|
  custom — o motor já suporta), **client_action_id = "maintenance-next-due:<maintenanceOrderId>" (DETERMINÍSTICO)**. **Dedupe idempotente
  SEM tocar o motor e SEM migração em scheduled_notifications:** reprocessar a mesma manutenção (adicionar itens, editar) reusa o MESMO
  client_action_id → o motor faz findFirst-por-client_action_id e **devolve a definição existente** (a unique parcial (tenant_id,
  client_action_id) WHERE client_action_id IS NOT NULL do PR-04 é o backstop de corrida → 409) → **nunca N notificações redundantes**
  (D-Ω4C-RECON-05). A criação é um **EFEITO DE DOMÍNIO** (chamada service→service interna, NÃO a rota POST `/notifications/scheduled`) →
  **não exige `notifications:create` do usuário** — o ator (tenantId/userId/roles/permissions de `requireTenantContext`) casa com
  `ScheduledNotificationActorContext` e é repassado direto. O disparo INLINE do motor faz a notificação imediata funcionar mesmo com o worker
  desligado. **Por KM/hodômetro** (target-odometer + disparo por telemetria) = **PARADA HONESTA D-007 → PR-16** (telemetria não existe; coluna
  next_due_odometer sem mecanismo de disparo seria coluna morta — mesmo raciocínio do stock-defer PR-05). **Coexiste** com o produtor R2.2
  maintenance_due (lembrete da agendada) — semânticas distintas, ambos vivos, produtor R2.2 intocado.
- **Permissão — D-Ω4C-MANUT-RBAC-REUSE (reusa `maintenance_orders:read/create/update`, SEM permissão nova):** itens e sugestão de hodômetro
  são parte do **agregado manutenção** → mesmas permissões (GET→read, POST/PATCH/DELETE→create/update). catalog.ts/core-saas.test.ts/
  RBAC_MATRIX.md com diff VAZIO. A ScheduledNotification é efeito de domínio (não a rota gated por `notifications:create`) → nenhuma
  permissão de notificação exigida do usuário. Backend é a autoridade (papel sem `maintenance_orders:create` → **403 real**, já testado).
- **Migração — ADITIVA up-only `20260826000000_add_maintenance_order_items_next_due`** (autorizada, nunca destrutiva; declarada): (1) CREATE
  TABLE maintenance_order_items (+ RLS ENABLE/FORCE/POLICY + 3 índices + FK composta); (2) ALTER TABLE maintenance_orders ADD COLUMN
  next_due_at TIMESTAMPTZ (nullable, sem default). **Rollback = DROP TABLE maintenance_order_items + DROP COLUMN next_due_at** (tabela nova
  sem dependente + coluna nova) — provada up/down/re-up pelo **agente-dba-guardião**. **ZERO** ALTER/DROP destrutivo; **ZERO** mudança em
  scheduled_notifications (dedupe via client_action_id existente), em catalog.ts/seed (sem permissão nova) e no allowlist do motor
  (maintenance_item já presente). Toca `prisma/**` → **requer autorização explícita de `prisma/**` no comando do PR-06** (como PR-01/03/04/05).
- **Frontend — ESTENDER a tela viva (`frontend/src/modules/fleet/maintenance/`), PayableToggle INTOCADO:** (i) **`MaintenanceFormModal`** (modo
  edição, após criar o cabeçalho — fiel ao AutEM que só libera a grade após +CADASTRAR): **grade de itens** Descrição | Valor Unit. | Qtd |
  Valor Total + toolbar [impressora] [+ azul] + linha vazia honesta "Nenhum item…" + **totalizadores** Total Produtos (R$) | Total Serviços
  (R$) | Total (R$); **sub-modal "Cadastrar Item"** (header laranja, diferenciação registro-principal-azul × filho-laranja, ANALISE:31/189):
  Tipo* (SERVIÇO/PRODUTO/ESTOQUE) | Item* | Valor Unitário | Quantidade | Valor Total (calc no cliente, confirmado no server) | OBS | checkbox
  Continuar cadastrando → + ADICIONAR; editar item = clicar na linha → salvar; **campo "Próxima manutenção (data)"** + select de visibilidade
  (PRIVADA/PÚBLICA — CUSTOM/picker de usuários = honest-partial, o motor suporta mas o picker fica p/ reuso do CreateNotificationDialog/PR-20);
  **sugestão de hodômetro** — ao selecionar a viatura, busca odometer-suggestion e mostra toast/hint "Deseja preencher?" (null → sem toast);
  **impressão** = client-side reusando o padrão `PrintWorkOrderModal` (window.print() de cabeçalho+itens+totais, seções honestas, sem PDF no
  backend). (ii) **`ManutencaoPage`** — add colunas **"Itens" (qtd)**, **"Valor Total"** (derivado) e **"Próxima"** (next_due_at, "—" honesto
  quando ausente). §3 PT-BR (SERVIÇO/PRODUTO/ESTOQUE, Total Produtos/Serviços, Próxima manutenção — nunca termo técnico), §7 estados (loading/
  empty/error/**acesso não permitido**/desatualizado), §2.8 DTO allowlist (nunca tenant_id/storage/client_action_id). Guard RBAC
  `maintenance_orders:*` (existente).
- **DTO/auditoria — D-Ω4C-MANUT-DTO (§2.8):** DTO do cabeçalho ganha totals{...} + nextDueAt; DTO do item = {id, itemType, description,
  unitValue, quantity, lineTotal(derivado), notes} — **nunca** tenant_id/maintenance_order_id-cross/client_action_id. Auditoria estende
  metadata (itemCount, total agregado não-PII); as ações de item registram maintenance_order_item.created/updated/deleted.
- **RNs:** **MANUT-01** (tabela filha maintenance_order_items, FK composta (tenant_id,maintenance_order_id) RESTRICT, posse do pai via
  service.get → **404 cross-tenant**, tenant_id 1º índice) · **MANUT-02** (linha: unit_value>0 e quantity>0 senão 422; **lineTotal e
  totais do cabeçalho DERIVADOS server-side (unit×qty), NUNCA persistidos**; cliente nunca envia total) · **MANUT-03** (buckets: SERVIÇO→
  totalServices, PRODUTO+ESTOQUE→totalProducts, total=soma; itemCount) · **MANUT-04** (sugestão de hodômetro = max(fuel,maintenance) derivado;
  **null honesto** sem histórico; guard monotônico 422 preservado) · **MANUT-05** (próxima manutenção → **1** ScheduledNotification
  source_type=maintenance_item/source_id=orderId/notify_at=next_due_at; **dedupe idempotente por client_action_id determinístico** —
  reprocessar a MESMA manutenção NÃO duplica: motor devolve a existente; prova = 2 chamadas → 1 definição, 1 entrega) · **MANUT-06** (a
  notificação é **efeito de domínio** — chamada interna, **sem `notifications:create` do usuário**; permissão reusada `maintenance_orders:*`;
  papel sem create → 403 real) · **MANUT-07** (paradas honestas D-007: **por-KM → PR-16**; **baixa de estoque do item ESTOQUE → PR-10/11** —
  PR-06 aceita o item_type=stock mas **zero movimento/zero import de inventory**, como o stock-defer do PR-05) · **MANUT-08** (§2.8/§3 —
  DTO allowlist, labels PT-BR, sem tenant_id/storage; auditoria não-PII) · **MANUT-09** (multi-tenant 3 tenants efêmeros em rls-tenant-isolation:
  itens + next_due tenant-scoped; item de ordem do tenant A invisível a B; cross 404; updateMany cross=0; tenant_id 1º índice) · **MANUT-10**
  (ZERO regressão: PayableToggle amount=total derivado com fallback a cost; conclusão custo>=0, máquina de estados, anexos PR-01, produtor R2.2
  maintenance_due — todos intocados/verdes).
- **Divergências AutEM honestas (D-007):** (i) **recorrência por Quilometragem** (ANALISE:191) → **PR-16** (telemetria/target-odometer não
  existem; sem coluna morta agora). (ii) **item Tipo=ESTOQUE** dá baixa na custódia BASE → **PR-10/11** (custódia BASE/PROFISSIONAL/VIATURA +
  flag combustível/estoque não existem; PR-06 só aceita o tipo, sem baixa). (iii) **picker CUSTOM de destinatários** da próxima-manutenção →
  honest-partial (motor suporta; UI reusa CreateNotificationDialog/PR-20). (iv) o cost legado Decimal(20,6) (não 12,2 da invariante) —
  ALTER de tipo destrutivo/proibido §C7.5 (D-Ω4C-MANUT-MONEY). (v) pixel exato do modal/grade/toast AutEM não visto em frame limpo →
  reproduzimos o **comportamento** (§11), não o visual.
- **Bateria de validação (seção 10 — o avaliador roda):** `npx prisma validate` + prisma migrate diff (sem drift) + **dba-guardião prova
  up/down/re-up** de 20260826000000_add_maintenance_order_items_next_due (ADITIVA: CREATE TABLE + RLS + índices + FK composta + ADD COLUMN;
  rollback=DROP TABLE+DROP COLUMN); backend `npm run check` · lint · test · build; `node --test --import tsx tests/maintenance-order-items.test.ts`
  (NOVO — CRUD de item + unit_value/quantity>0→422 + **totais derivados** (buckets service/product/stock; total=Σ; nunca persistido) +
  **odometer-suggestion** (max fuel/maintenance; null honesto) + **próxima-manutenção dedupe** [2× reprocesso → 1 ScheduledNotification, 1
  entrega] + posse 404 cross-tenant) + tests/maintenance-orders.test.ts/-routes.test.ts **estendidos** (next_due_at + PayableToggle
  amount=total); tests/rls-tenant-isolation.test.ts estendido (3 tenants efêmeros; item cross 404; updateMany cross=0); **ZERO regressão** em
  maintenance-orders (26) · scheduled-notifications (14) · financial-title-source (17) · fleet-alerts-notifications (10) · work-order-*;
  frontend `npm --prefix frontend run check` · build · smoke (grade de itens + sub-modal laranja + totais + campo próxima + toast de sugestão
  + impressão + colunas Itens/Total/Próxima + **PayableToggle intacto** + estados §7 + guard); `git diff --check` + `git status --short` limpo
  (schema/migration/maintenance-orders/**/front por caminho; seed/catalog/RBAC_MATRIX/scheduled_notifications **intocados**). KPI
  `docs/kpis/omega4c/KPI_PR-06.json` + histórico + snapshot; Kpis/* backend +N (maintenance-order-items), frontend_smoke +M, blocks 76→**77**.
- **Riscos + rollback:** (R1) **notificação duplicada** → mitigado pelo client_action_id determinístico + o motor devolver a existente (prova
  2×) + unique parcial de corrida. (R2) **total fabricado** → mitigado derivando server-side (unit×qty), nunca persistindo, cliente nunca envia
  total. (R3) **acoplamento ao motor** → mitigado por chamada interna com source_type já no allowlist, **zero mudança no motor** e zero migração
  em scheduled_notifications. (R4) **quebrar conclusão/PayableToggle/estado/anexos/produtor R2.2** → mitigado mantendo cost/conclusão
  intocados, PayableToggle com fallback a cost, R2.2 não tocado, cobertos por regressão. (R5) **colisão de rota** (odometer-suggestion ×
  :maintenanceOrderId) → mitigado declarando o literal ANTES do param. (R6) **`prisma/**`** → só ADITIVO (CREATE TABLE + ADD COLUMN);
  **rollback = DROP TABLE maintenance_order_items + DROP COLUMN next_due_at** + revert do PR. Sem destrutivo (respeita parada §C7.5). **Sem
  dependência nova nem serviço externo pago → junta normal, NÃO junta-5.**

**APROVADO para implementar.** (D-records desta fatia: **D-Ω4C-MANUT-ITEMS · -TOTALS-DERIVED · -ODOMETER-SUGGEST · -NEXTDUE-NOTIF ·
-RBAC-REUSE · -DTO · -MONEY(D-007) · -KM-DEFER(D-007) · -STOCK-ITEM-DEFER(D-007)** — a junta ratifica no veredito; persistir em
controle/decisoes.md no PR. Confirma D-Ω4C-RECON-05: disparo por item com dedupe pelo sourceId da manutenção; reusa maintenance_item do
allowlist PR-04 e o job.worker.ts:86 — **sem node-cron**.)

#### PR-06 — Veredito da junta (2026-07-22) — **APROVADO (3 vetos; 1 ciclo de reprovação — ESCALADA DE PRIVILÉGIO — resolvido)**
- **agente-dba-guardião** → `APROVADO` (0 condições): migração `20260826000000_add_maintenance_order_items_next_due` provada **UP/DOWN/
  RE-UP** em DB scratch isolada. Puramente aditiva: `CREATE TABLE maintenance_order_items` (FK composta `(tenant_id, maintenance_order_id)`
  →maintenance_orders RESTRICT + RLS ENABLE/FORCE/POLICY USING+WITH CHECK, `unit_value NUMERIC(12,2)`, `quantity NUMERIC(10,3)`) +
  `ALTER maintenance_orders ADD COLUMN next_due_at TIMESTAMPTZ` nullable. `cost` NUMERIC(20,6) INTOCADO; scheduled_notifications/fuel_logs
  não referenciados. RLS t/t em todas as irmãs antes/depois. Integridade: FK cross-tenant → **23503**; RESTRICT bloqueia DELETE do pai
  com itens → **23503**.
- **omega4c-avaliador** → 1ª passada **REPROVADO (BLOQUEIA)** → após fix **APROVADO**; **coordenador-de-acessos** → 1ª passada
  **REPROVADO (BLOQUEIA+ALTA)** → após fix **APROVADO**. **A junta adversarial caçou uma ESCALADA DE PRIVILÉGIO real** (2 vetos
  independentes): o efeito de domínio da próxima manutenção repassava `next_due_visibility` (incl. `public`) direto ao motor de
  notificações sob autoridade só de `maintenance_orders:create`, permitindo que um portador SEM `notifications:create` disparasse
  broadcast tenant-wide — contornando o gate que o PR-04 criou para broadcast (RBAC_MATRIX l.124 nega notifications:create a técnico/
  auditor justamente para isso). Só não escalava nos papéis-semente por sobreposição coincidental; papéis customizados quebrariam.
  **Reprovação-ciclo-1** (R-Ω4C-PR06-ciclo1): correção pequena e bem-especificada (não exigiu especialista §C7.4) — o lembrete de
  próxima manutenção é intrinsecamente PRIVADO. Backend: `next_due_visibility` **removido do contrato** (validators+type, compile-enforced
  — o corpo não expressa public/custom) e o seam `scheduleNextDueNotification` **fixa `visibility:'private'` HARDCODED** ao chamar o motor
  → `resolveRecipients` retorna só `[createdBy]`, sem fan-out. Frontend: seletor "Pública (toda a organização)" removido; `nextDueVisibility`
  fora do payload/types. Teste **[MANUT-11]** prova o ataque falhando: ator `maintenance_orders:create` SEM `notifications:create` + 3
  usuários ativos + `next_due_visibility:"public"` no corpo → definição **private**, só o criador recebe (outros 2 = **0**). **Ambos os
  reprovadores re-verificaram por conta própria e descarregaram a BLOQUEIA.**
- **Seção 10 (re-verificada, memória=CI):** backend 1382 pass (1 fail ambiental rls-tenant-isolation DB-gated) / 6 skip; targeted
  maintenance+notifications **58/58** (maintenance-order-items 13 + maintenance-orders 10 + maintenance-orders-routes 21 +
  scheduled-notifications 14); frontend check/build + smoke **737/737**; build/prisma/git limpos. **ZERO regressão** (motor intocado,
  sem acoplamento a inventory, total DERIVADO server-side, PayableToggle/Anexos intactos, migração aditiva). RN-MANUT-01..10 cobertas.
- **Decisão:** verde (3 vetos APROVADO após 1 ciclo de reprovação de segurança resolvido) → merge (CI = gate empírico do rls DB-gated) +
  KPI no PR (§C3). **Dedupe idempotente** (client_action_id determinístico `maintenance-next-due:<orderId>` → reprocessar = 1 definição)
  e **total derivado** (nunca persistido) confirmados. **Próxima manutenção por KM → PR-16** (só por tempo agora); **item stock →
  PR-10/11**. D-records (D-Ω4C-MANUT-ITEMS/-TOTALS-DERIVED/-ODOMETER-SUGGEST/-NEXTDUE-NOTIF/-RBAC-REUSE/-DTO/-MONEY/-KM-DEFER/
  -STOCK-ITEM-DEFER) **ratificados**; adiciona **D-Ω4C-MANUT-NEXTDUE-PRIVATE** (efeito de domínio sempre private; broadcast só via rota gated).
- KPI: `docs/kpis/omega4c/KPI_PR-06.json`. `Kpis/*`: backend 1364→**1382** (+18 maintenance: 13 itens + 5 rota); frontend_smoke 726→**737**
  (+11 manutencao-itens); blocks 76→**77**.

## 8. Encerramento (a fazer no fim)
Ata final (entregas, KPIs consolidados, pendências→backlog Ω5); deletar **SOMENTE** os 5 agentes efêmeros (registrar cada
deleção); confirmar que nenhum agente pré-existente foi tocado; marcar os D-records como vigentes.
