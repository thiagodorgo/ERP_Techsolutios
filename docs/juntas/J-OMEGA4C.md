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

### PR-07 — Multas + Seguros (condutor responsável, vencimento, impressão) — plano do omega4c-planejador (2026-07-22)
**Mapeia PR-09 do PLANO_OMEGA4C** (é o momento da fronteira D-Ω4C-FIN-MULTA-FRONTEIRA "Multa fica p/ PR-09"). **Última fatia da Fase 1
— INTEGRA os trilhos PR-02/03/04/06.** **Veredicto Fase 0 (recon REAL, FATO vs HIPÓTESE):** **ESTENDER** — `src/modules/fines/` e
`src/modules/insurance-policies/` são maduros e vivos; o gap é (a) o **condutor responsável** que roteia a multa ao **extrato** (RN-MUL-01),
(b) a multa como **fonte de contas a pagar** (rail PR-02), (c) o **vencimento do seguro** como **consumidor privado do motor PR-04**, (d) a
**impressão** da multa. Nenhum motor/foundation é reescrito; tudo é chamada de consumidor + 1 coluna aditiva.
- **FATO (li no código):** (a) Model `Fine` (`schema.prisma:956`, `fines`): `vehicle_id` (FK composta RESTRICT), **`driver_id?` UUID que
  referencia um USER** (validado via `coreService.getUserForTenant`, `fine.service.ts:284` — **NÃO** um operator_profile), `numero_auto`,
  `data_infracao`, `orgao`, `valor` **Decimal(20,6)**, `pontos`, `prazo_recurso?`, `prazo_pagamento?`, `status` (máquina recebida→…→paga/
  cancelada), auditoria. **NÃO tem** `responsible_operator_profile_id`, **NÃO tem** rail de payable montado (`fine.routes.ts` só GET/POST/GET/
  PATCH), **NÃO tem** vínculo com extrato. (b) Model `InsurancePolicy` (`schema.prisma:986`, `insurance_policies`): `vigencia_inicio`/
  **`vigencia_fim` (o vencimento, `Timestamptz`)**, `seguradora`, `numero_apolice`, `valor` Decimal(20,6), `cobertura?`, `status vigente|
  cancelada` (`vencida` é DERIVADO, nunca persistido). **PayableToggle (PR-02) JÁ montado** — `createPayableSourceRoutes({sourceType:
  "insurance_policy"})` em `insurance-policy.routes.ts:69` + `PayableToggle` em `InsurancePolicyFormModal.tsx:286` (create+edit). **NÃO tem**
  integração com o motor `ScheduledNotification`. (c) **Rail PR-02 pronto p/ multa:** `FINANCIAL_TITLE_SOURCE_TYPES` **já inclui `fine`**
  (`financial-title.types.ts:25` — `fuel_log|maintenance_order|fine|insurance_policy`) → **payable de multa NÃO exige migração** (só montar o
  factory em `fine.routes.ts`, como fuel/manut/seguro). (d) **Extrato PR-03 pronto p/ multa (reserva):** `PROFESSIONAL_STATEMENT_ENTRY_TYPES`
  inclui `fine`, `PROFESSIONAL_STATEMENT_SOURCE_TYPES` inclui `fine` (`professional-statement.types.ts:7,10`); a **idempotência de origem** é o
  índice parcial `(tenant_id,source_type,source_id,installment_number) WHERE deleted_at IS NULL AND source_id IS NOT NULL` da migração PR-03
  `20260823000000` (Prisma mapeia **P2002→409 `source_already_launched`**, `-prisma.repository.ts:203`). **MAS** o serviço só expõe
  `createAdjustment` (público, só AJUSTE); o **caminho interno createForSource p/ fine NÃO existe ainda** — foi RESERVADO por
  **D-Ω4C-EXTRATO-CREATE-SCOPE** ("damage/fine/remuneration entram só por caminhos internos das integrações, PR-09/12/13/14/15") — **PR-07 é
  quem constrói esse caminho interno da multa.** (e) **Motor PR-04 pronto p/ seguro:** `SCHEDULED_NOTIFICATION_SOURCE_TYPES` **já inclui
  `insurance_policy` e `fine`** (`scheduled-notification.types.ts:9-15`); `ScheduledNotificationService.create` dedupa por `client_action_id`
  (findFirst-e-devolve-existente, InMemory+Prisma; unique parcial de corrida→409) e dispara INLINE se vencida; `notify_at` naïve→fuso de negócio
  (`parseBusinessDate`). (f) **Padrão-ouro PR-06 do efeito de domínio PRIVADO** (a lição da escalada): `maintenance-order.service.ts:600` fixa
  **`visibility: "private"` HARDCODED** ao chamar o motor; o contrato de manutenção **não tem** campo de visibilidade (validators l.260-263) →
  portador de `maintenance_orders:create` SEM `notifications:create` **jamais** faz broadcast. **PR-07 aplica o MESMO padrão ao seguro.** (g)
  **Produtores fleet-alerts (inbox) já existem e coexistem:** `runFineDueNotifications` (`fine.notifications.ts`, `fine_due:<id>`) e
  `runInsuranceRenewalNotifications` (`insurance-policy.notifications.ts`, janelas 30/15/7, `insurance:<id>:30d…`) — mecanismo DISTINTO do motor
  agendável (exatamente como o produtor R2.2 `maintenance_due` coexiste com o next-due do PR-06). **INTOCADOS** (zero regressão). (h) **Impressão
  100% client-side** existe em 2 precedentes: `frontend/src/modules/work-orders/components/PrintWorkOrderModal.tsx` **e**
  `frontend/src/modules/fleet/maintenance/components/PrintMaintenanceOrderModal.tsx` (`window.print()`, seções honestas, sem PDF no backend). (i)
  `OperatorProfile` (`schema.prisma:1795`) tem `@@unique([tenant_id,id])` + já é alvo de FK composta RESTRICT (relação inversa
  `professional_statement_entries`). Perm `fines:read/create/update` e `insurance_policies:read/create/update` já existem.
- **HIPÓTESE:** pixel exato do modal AutEM (ordem de campos/impressão) → reproduzimos o **comportamento** (§11), não o visual; se a multa parcela
  o desconto no extrato → resolvido: **parcelamento controlado (default 1), valor SEMPRE = `fine.valor` real, nunca fabricado**; se o vencimento
  do seguro re-agenda ao editar a `vigencia_fim` → **parada honesta D-007** (dedupe por client_action_id devolve a definição existente, como no
  PR-06; re-agendar ao mudar a data exige tocar o motor → deferido).

- **Condutor responsável (modelo) — D-Ω4C-MULSEG-RESPONSIBLE-MODEL: +1 coluna aditiva `responsible_operator_profile_id` UUID NULL em `fines` +
  FK COMPOSTA `(tenant_id, responsible_operator_profile_id) → operator_profiles(tenant_id, id) ON DELETE RESTRICT`** + relação inversa aditiva
  `fines Fine[]` no model `OperatorProfile` + **`@@index([tenant_id, responsible_operator_profile_id])`**. **Por que NOVA coluna e não reusar
  `driver_id`:** `driver_id` referencia um **User** genérico (qualquer usuário do tenant) — o extrato (PR-03) é keyed por **operator_profile_id**
  (o profissional de campo que tem folha), e nem todo User é operator_profile. Conflatá-los seria semanticamente errado. O `driver_id` (User)
  **permanece INTOCADO** (coexistência informativa, como `station` texto-livre do PR-05 ao lado de `supplier_id`). O **condutor responsável do
  CTB/extrato** = o novo `responsible_operator_profile_id`. Migração ADITIVA up-only **`20260827000000_add_fine_responsible_operator_profile`**
  (1× ADD COLUMN + FK composta + índice + relação inversa; rollback = **DROP COLUMN**, coluna nova sem dependente) — provada up/down/re-up pelo
  **agente-dba-guardião**. Toca `prisma/**` (schema + migration; **seed/catalog INTOCADOS** — sem permissão nova) → **requer autorização
  explícita de `prisma/**` no comando do PR-07** (como PR-01/03/04/05/06). **INSURANCE = ZERO migração** (vigencia_fim já existe; a notificação é
  efeito de domínio com client_action_id determinístico).
- **RN-MUL-01 (não-negociável §3) — a disposição SIM→extrato / NÃO→contas a pagar, ambas reversíveis:**
  - **(a) SIM → extrato — D-Ω4C-MULSEG-STATEMENT-EFFECT (efeito de domínio service→service, padrão PR-06):** ao **SETAR**
    `responsible_operator_profile_id` (no create ou no PATCH), o `FineService` valida o profissional no tenant (via `OperatorProfileService.get`
    → **404/400 invalid_operator_profile_reference** cross-tenant) e emite **UM** lançamento no extrato desse profissional pelo **caminho interno
    reservado** da PR-03: `entry_type='fine'`, `direction='debit'` (desconto — D-Ω4C-EXTRATO-DIRECTION), **`amount = fine.valor` REAL** (nunca
    fabricado; roundMoney 2 casas), `source_type='fine'`, `source_id = fine.id`, `first_due_date = fine.prazo_pagamento ?? now`,
    `installment_total` = campo **transiente controlado** `responsible_installment_total` (int ≥ 1, **default 1**, NÃO persistido na Fine —
    override de plano, como `ignore_previous_odometer` do PR-05; split via `buildInstallmentPlan` da PR-03, resto de centavos na 1ª). **Idempotente
    por (source_type='fine', source_id):** reprocessar a MESMA multa devolve o grupo existente (pré-check `findActiveBySource` + backstop DB do
    índice parcial PR-03 → 409). É **efeito de domínio** (chamada interna, **NÃO** a rota `POST /professional-statements`) → **não exige
    `professional_statements:create` do usuário** (mandato §6; espelha o next-due do PR-06 que não exige `notifications:create`).
  - **(b) NÃO → contas a pagar — D-Ω4C-MULSEG-PAYABLE (rail PR-02, SEM migração):** monta `createPayableSourceRoutes({sourceType:'fine',
    resolveOwnership})` em `fine.routes.ts` → `POST/DELETE/GET /fines/:id/payable` (perm `financial_titles:create/update`, existentes; chokepoint
    `assertPeriodOpen` e idempotência `source_already_launched` herdados do factory). `fine` **já está** no `FINANCIAL_TITLE_SOURCE_TYPES` → **zero
    migração/enum**. A empresa paga a multa ao órgão (`party` = órgão) — reversível via DELETE (soft-delete do título).
  - **(c) Reversibilidade + exclusividade — D-Ω4C-MULSEG-DISPOSITION:** SIM reversível → **limpar** `responsible_operator_profile_id` (PATCH→null,
    quando estava setado) dispara o efeito inverso `removeForSource(fine)` = **soft-delete do grupo** do extrato, **respeitando RN-EXT-01**: se ≥ 1
    parcela `settled` → **409 `statement_entry_locked`** (não se desfaz atribuição já liquidada — reversão só por AJUSTE compensatório). NÃO
    reversível → DELETE `/fines/:id/payable`. **Either/or genuíno (a disposição do AutEM):** a POSSE-hook `resolveOwnership` que a multa injeta no
    factory de payable também **assere ausência de débito ativo no extrato** (→ **409 `fine_disposition_conflict`**: retire do extrato antes de
    lançar em contas a pagar); e SETAR responsável numa multa com payable ATIVO → **409 `fine_disposition_conflict`** (retire o payable antes). O
    factory genérico PR-02 **permanece intocado** — a multa só injeta um `resolveOwnership` mais rico (posse + guarda de disposição). Direção de
    dependência: `fines → professional-statements` e `fines → financial-titles` (consumidor→foundation; **sem ciclo** — nenhum importa `fines`).
- **API interna do extrato (aditiva, realiza a reserva PR-03) — D-Ω4C-MULSEG-STATEMENT-API:** +3 métodos no `professional-statements` **sem REST,
  sem migração, sem permissão nova**: (1) `ProfessionalStatementService.createForSource(actor, {operatorProfileId, entryType, direction,
  sourceType, sourceId, amount, installmentTotal, firstDueDate, description})` — **typed/constrained** (a multa só passa fine/debit/fine); pré-check
  idempotente + `createGroup`; (2) `removeForSource(actor, sourceType, sourceId)` — acha o grupo ativo pela origem, aplica a **trava RN-EXT-01**
  (settled→409), soft-delete atômico (espelha `financial-titles.removeForSource`); (3) **repo**: `findActiveBySource(tenantId, sourceType,
  sourceId)` na interface + InMemory + Prisma + Rls (o InMemory `createGroup` **não** dedupa por origem → o pré-check garante idempotência nos DOIS
  modos; o índice parcial PR-03 é o backstop no Prisma). **DTO §2.8 inalterado** (sem tenant_id/source_id/CNH). Isto **destrava** também Dano
  (PR-12/13) e Remuneração (PR-14/15) — mas PR-07 só **usa** para fine (sem acoplar aos outros).
- **Seguro → vencimento (consumidor privado do motor PR-04) — D-Ω4C-SEG-EXPIRY-NOTIF (aplica a LIÇÃO PR-06):** ao criar/editar a apólice
  (a `vigencia_fim` é sempre presente/obrigatória), o `InsurancePolicyService` emite **UMA** `ScheduledNotification` via o motor: **efeito de
  domínio service→service**, `source_type='insurance_policy'` (já no allowlist), `source_id = policy.id`, `notify_at = vigencia_fim`,
  **`client_action_id = "insurance-expiry:<policyId>"` (DETERMINÍSTICO)** → dedupe (reprocessar/editar devolve a definição existente). **CONTRA a
  escalada (padrão PR-06 HARDCODED):** o contrato de seguro **NÃO ganha campo de visibilidade** (nenhum `parseExpiryVisibility`); o seam **fixa
  `visibility: 'private'` HARDCODED** na fronteira do motor → um portador de `insurance_policies:create` **SEM** `notifications:create` **jamais**
  dispara broadcast tenant-wide (`resolveRecipients` → só `[createdBy]`). Título/mensagem honestos (nº da apólice + data). Motor **INTOCADO** (zero
  migração em `scheduled_notifications`); disparo INLINE se `vigencia_fim<=now`. **Coexiste** com o produtor fleet-alerts `runInsuranceRenewal…`
  (janelas 30/15/7, inbox) — semânticas distintas, ambos vivos, produtor **INTOCADO** (idêntico à coexistência next-due × R2.2 do PR-06). **Multa
  → NÃO cria ScheduledNotification** (o produtor `runFineDueNotifications` já cobre o prazo; adicionar um 2º disparador duplicaria) — parada honesta.
- **Impressão da multa — D-Ω4C-MULSEG-PRINT (client-side, reaproveitável):** novo `frontend/src/modules/fleet/fines/components/PrintFineModal.tsx`
  clonando o padrão `PrintMaintenanceOrderModal`/`PrintWorkOrderModal` (`window.print()`, cabeçalho + dados do auto/órgão/valor/pontos/prazos +
  condutor responsável, seções honestas, **sem PDF no backend**). Reaproveitável → sem parada honesta.
- **Permissão — D-Ω4C-MULSEG-RBAC-REUSE (SEM permissão nova; diff VAZIO em catalog/core-saas/RBAC_MATRIX):** reusa `fines:read/create/update` e
  `insurance_policies:read/create/update` (multa/seguro), `financial_titles:create/update` (payable, via factory). Os efeitos de domínio
  (extrato, ScheduledNotification, título) **não exigem** `professional_statements:create`/`notifications:create` do usuário (mandato §6) — são
  chamadas internas typed/controladas. Backend é a autoridade (papel sem `fines:create` → **403 real**, já testado). **NÃO** é escalada — ver
  RN-MUL-esc/SEG-esc abaixo.
- **RNs — MUL (multa):** **MUL-01** (disposição: SIM `responsible_operator_profile_id` → débito no extrato do profissional [fine/debit,
  amount=valor real, idempotente por origem]; NÃO → contas a pagar [rail PR-02]; **either/or 409 `fine_disposition_conflict`**; ambas reversíveis) ·
  **MUL-02** (reversão respeita RN-EXT-01: limpar responsável com parcela `settled` → 409 `statement_entry_locked`; todo-pending → soft-delete
  atômico do grupo) · **MUL-03** (condutor responsável validado no tenant — FK composta `(tenant_id,responsible_operator_profile_id)` RESTRICT +
  resolver → **404/400** cross-tenant; `driver_id`/User coexiste INTOCADO) · **MUL-04** (**não-fabricação**: amount = `fine.valor` real,
  installment_total transiente default 1, `first_due_date = prazo_pagamento ?? now`; nunca valor/parcela inventados) · **MUL-05** (payable de multa
  = `source_type='fine'` já no allowlist → sem migração; chokepoint/idempotência herdados) · **MUL-esc** (efeito de extrato é **efeito de domínio
  NÃO-amplificador**: typed [só fine/debit], single-profissional [zero fan-out], amount travado ao fine.valor, idempotente → portador de `fines:*`
  SEM `professional_statements:create` PODE atribuir [desenho], mas **não** consegue escrever débito arbitrário/tipo arbitrário/valor arbitrário —
  contraste explícito com o broadcast bloqueado no PR-06; teste prova o efeito constrangido) · **MUL-06** (impressão client-side; sem PDF backend) ·
  **MUL-07** (§2.8/§3 — DTO ganha `responsibleOperatorProfileId` + badge derivado "lançado no extrato"/"em contas a pagar"; nunca tenant_id/CNH;
  labels PT-BR). **RNs — SEG (seguro):** **SEG-01** (vencimento → **1** `ScheduledNotification` `source_type='insurance_policy'`/`source_id`/
  `notify_at=vigencia_fim`; **dedupe idempotente** por client_action_id determinístico — reprocessar/editar não duplica: motor devolve a existente;
  prova 2× → 1 definição) · **SEG-esc** (**a lição PR-06 aplicada**: efeito de domínio **PRIVADO HARDCODED**; contrato sem campo de visibilidade;
  `insurance_policies:create` SEM `notifications:create` + 3 usuários ativos → definição `private`, só o criador recebe [outros 2 = **0**]; broadcast
  segue exigindo `notifications:create` via `POST /notifications/scheduled`) · **SEG-02** (motor + produtor R4.2 `runInsuranceRenewal…`
  INTOCADOS; zero migração em `scheduled_notifications`; coexistência) · **MUL-SEG-08** (multi-tenant 3 tenants efêmeros em `rls-tenant-isolation`:
  responsible FK cross-tenant rejeitado; débito de multa + notificação de seguro tenant-scoped; scan de A não entrega em B; cross 404; updateMany
  cross=0; `tenant_id` 1º índice) · **MUL-SEG-09** (ZERO regressão: produtores fleet-alerts fine/insurance, PayableToggle do seguro, máquina de
  estados da multa, cancel admin-only, motor PR-04, extrato PR-03, factory payable PR-02 — todos intocados/verdes).
- **Divergências AutEM honestas (D-007):** (i) **re-agendar a notificação ao mudar `vigencia_fim`** → parada honesta (dedupe por client_action_id
  devolve a definição existente, como no PR-06; re-agendar exigiria tocar o motor — deferido; a apólice renovada com nova data mantém a definição
  original, documentado). (ii) **`fine.valor` Decimal(20,6)** legado (não 12,2 da invariante) — ALTER de tipo destrutivo/proibido §C7.5; o débito no
  extrato é parseado a Decimal(12,2) via `parseAmount` (roundMoney) — divergência gêmea do PR-05/-06 -MONEY (D-Ω4C-MULSEG-MONEY). (iii)
  **parcelamento do desconto** = campo transiente controlado default 1 (não persistido); planos avançados/edição de parcela = folha PR-14/15. (iv)
  **`driver_id` (User)** coexiste como referência informativa — não é o condutor responsável do extrato (que é operator_profile). (v) **picker
  CUSTOM** de destinatários do vencimento de seguro = honest-partial (motor suporta; UI reusa `CreateNotificationDialog`/PR-20). (vi) pixel exato do
  modal/impressão AutEM não visto em frame limpo → reproduzimos o **comportamento** (§11), não o visual.
- **Frontend — ESTENDER as telas vivas, PayableToggle do seguro INTOCADO:** (i) **`FineFormModal`** (`frontend/src/modules/fleet/fines/`): add
  **select "Condutor responsável"** (lista operator_profiles ativos do tenant, reusa o service de Profissionais; "— Sem responsável —" = disposição
  company-pays) + **campo "Parcelas do desconto"** (default 1, só quando há responsável) + **badge derivado** ("Lançado no extrato" verde /
  "Em contas a pagar" âmbar / "—") + **`PayableToggle` (montar, mode create/edit)** para a disposição company-pays (respeitando o either/or 409) +
  botão **Imprimir** abrindo `PrintFineModal`. (ii) **`MultasPage`**: add colunas **"Responsável"** (nome do profissional / "—"), **"Disposição"**
  (badge extrato/payable). (iii) **Insurance** (`InsurancePolicyFormModal`/`SegurosPage`): o campo **Vencimento (`vigencia_fim`) já existe** — NÃO
  adicionar seletor de visibilidade pública (**lição PR-06**: o vencimento é lembrete PRIVADO); nota sutil honesta "lembrete de vencimento
  registrado" (sem andaime de dev §11.2). §3 PT-BR (Condutor responsável, Disposição, Vencimento — nunca termo técnico), §7 estados (loading/empty/
  error/**acesso não permitido**/desatualizado), §2.8 DTO allowlist (nunca tenant_id/storage/CNH). Guard RBAC `fines:*`/`insurance_policies:*`.
- **DTO/auditoria — §2.8:** DTO da multa ganha `responsibleOperatorProfileId` (+ `responsibleName` label derivado, jamais CNH) + `disposition`
  derivado (`statement`|`payable`|`none`); **nunca** tenant_id/source_id/client_action_id. Auditoria: `fine.responsible_assigned`/
  `fine.responsible_cleared` + `insurance_policy.expiry_scheduled` com metadata não-PII (operatorProfileId/installmentTotal/notify_at).
- **Bateria de validação (seção 10 — o avaliador roda):** `npx prisma validate` + `prisma migrate diff` (sem drift) + **dba-guardião prova
  up/down/re-up** de `20260827000000_add_fine_responsible_operator_profile` (ADITIVA: 1 ADD COLUMN + FK composta + índice + relação inversa;
  rollback=DROP COLUMN); backend `npm run check` · lint · test · build; `node --test --import tsx tests/fines.test.ts` + `tests/fines-routes.test.ts`
  (estendidos — responsável→débito no extrato [idempotente 2×→1]; limpar responsável→soft-delete [RN-EXT-01: settled→409]; payable de multa
  201/409/404; either/or 409 `fine_disposition_conflict`; **[MUL-esc]** `fines:create` sem `professional_statements:create` atribui mas efeito
  constrangido) + `tests/insurance-policies.test.ts`/`-routes.test.ts` (estendidos — vencimento→ScheduledNotification private [dedupe 2×→1];
  **[SEG-esc]** 3 usuários → só criador recebe; motor/produtor R4.2 intocados) + `tests/professional-statement-crud.test.ts` (estendido —
  createForSource/removeForSource/findActiveBySource internos: fine/debit typed, idempotente, reversível sob trava); `tests/rls-tenant-isolation.test.ts`
  estendido (3 tenants efêmeros; responsible FK cross-tenant rejeitado; débito+notificação tenant-scoped; cross 404; updateMany cross=0);
  **ZERO regressão** em `financial-title-source` (17) · `scheduled-notifications` (14) · `professional-statements` · `fleet-alerts-notifications`
  (10) · `maintenance-*` · `work-order-*`; **`core-saas.test.ts` INALTERADO** (sem permissão nova); frontend `npm --prefix frontend run check` ·
  build · smoke (FineFormModal responsável+badge+parcelas+PayableToggle+imprimir; MultasPage colunas Responsável/Disposição; Insurance sem seletor
  público; estados §7 + guard); `git diff --check` + `git status --short` limpo (schema/migration/fines/**/insurance-policies/**/professional-statements/**/
  financial-titles-mount/front por caminho; seed/catalog/RBAC_MATRIX/scheduled_notifications **intocados**). KPI `docs/kpis/omega4c/KPI_PR-07.json`
  + histórico + snapshot; Kpis/* backend +N (fines+insurance+professional-statement), frontend_smoke +M, blocks 77→**78**.
- **Riscos + rollback:** (R1) **escalada de visibilidade no seguro** (a lição PR-06) → mitigado: contrato sem campo de visibilidade + seam
  `visibility:'private'` HARDCODED + teste [SEG-esc] 3 usuários. (R2) **escrita em ledger privilegiado via efeito de multa** → mitigado: efeito
  typed/single-profissional/amount-travado/idempotente (não-amplificador) + teste [MUL-esc]; contraste documentado com o broadcast bloqueado. (R3)
  **notificação/débito duplicado** → mitigado: client_action_id determinístico (seguro) + pré-check `findActiveBySource` + índice parcial PR-03
  (extrato); provas 2×. (R4) **fabricação de valor/parcela** → mitigado: amount = fine.valor real, installment default 1, first_due honesto. (R5)
  **acoplamento/ciclo** → mitigado: direção consumidor→foundation (fines→statement/financial-titles, insurance→scheduled-notifications; nenhum
  importa de volta); factory PR-02 e motor PR-04 intocados. (R6) **`prisma/**`** → só ADITIVO (1 ADD COLUMN + FK + índice); **rollback = DROP COLUMN
  `responsible_operator_profile_id`** (coluna nova sem dependente) + revert do PR (fines/insurance/professional-statements/front). Sem destrutivo
  (respeita parada §C7.5). **Sem dependência nova nem serviço externo pago → junta normal, NÃO junta-5.**

**APROVADO para implementar.** (D-records desta fatia: **D-Ω4C-MULSEG-RESPONSIBLE-MODEL · -STATEMENT-EFFECT · -PAYABLE · -DISPOSITION ·
-STATEMENT-API · D-Ω4C-SEG-EXPIRY-NOTIF · D-Ω4C-MULSEG-PRINT · -RBAC-REUSE · -MONEY(D-007)** — a junta ratifica no veredito; persistir em
controle/decisoes.md no PR. Fecha **D-Ω4C-FIN-MULTA-FRONTEIRA** [Multa era p/ PR-09] e realiza a reserva **D-Ω4C-EXTRATO-CREATE-SCOPE** [caminho
interno da multa]. Confirma a lição **D-Ω4C-MANUT-NEXTDUE-PRIVATE**: efeito de domínio sempre PRIVATE/typed; broadcast só via rota gated. Reusa
`fine`/`insurance_policy` dos allowlists PR-02/03/04 e o `job.worker.ts:86` — **sem node-cron, sem permissão nova, sem tocar os motores**.)

#### PR-07 — Veredito da junta (2026-07-22) — **UNÂNIME 3/3 APROVADO (1ª passada; lições PR-06 aplicadas proativamente) — FECHA FASE 1**
- **agente-dba-guardião** → `APROVADO` (0 condições): migração `20260827000000_add_fine_responsible_operator_profile` provada **UP/DOWN/
  RE-UP** em DB scratch isolada. Puramente aditiva: `ADD COLUMN responsible_operator_profile_id UUID` nullable + FK composta
  `(tenant_id, responsible_operator_profile_id)`→operator_profiles RESTRICT + índice tenant-first. `valor` NUMERIC(20,6) INTOCADO;
  nenhuma outra tabela tocada. RLS de fines e operator_profiles t/t. Retrocompat NULL (MATCH SIMPLE). Integridade: FK cross-tenant →
  **23503**; RESTRICT bloqueia DELETE de operator_profile referenciado → **23503**.
- **omega4c-avaliador** → `APROVADO`: seção 10 verde (backend 1404 pass / 6 skip — a única falha é a rls-tenant-isolation DB-gated
  ambiental, tabela scheduled_notifications ausente no DB local; skip no CI, não é regressão; frontend smoke **745/745**). **amount =
  fine.valor REAL** via parseAmount/roundMoney (nunca fabricado); **dedupe idempotente** testado 2×→1 (professional-statements + fines);
  either/or **409 fine_disposition_conflict** nos dois sentidos; reversão respeita **RN-EXT-01** (settled→409). Ambos os efeitos de domínio
  não-escaláveis (ver coordenador). Motor/factory/produtores/catalog/seed/RBAC diff VAZIO; migração aditiva; **teardown FK-safe**
  (fine.deleteMany antes de operatorProfile/vehicle — lição do CI-catch PR-06 aplicada). 2 BAIXA (rls ambiental; package.json registra
  o novo smoke — convenção).
- **coordenador-de-acessos** → `APROVADO`: **os DOIS efeitos de domínio cross-módulo são NÃO-ESCALADORES** (ao contrário da superfície do
  PR-06). (a) **seguro→notificação:** `visibility:'private'` HARDCODED no seam; contrato de seguro sem campo de visibilidade; portador de
  `insurance_policies:create` sem `notifications:create` NÃO faz broadcast (SEG-esc: 3 usuários → só o criador). (b) **multa→extrato:**
  `createForSource` TIPADO (entry_type/direction/source_type por allowlist: fine/debit/fine), **amount travado ao fine.valor**,
  single-profissional (responsável validado no tenant), zero fan-out, idempotente por origem — portador de `fines:create` sem
  `professional_statements:create` grava só esse débito constrangido, não lançamento arbitrário (MUL-esc: 403 na rota pública do razão).
  `createForSource/removeForSource/findActiveBySource` são INTERNOS (zero rota; `POST /professional-statements` segue gated por
  `professional_statements:create` p/ AJUSTE manual). catalog/matriz/core-saas diff VAZIO; rails gated; posse cross-tenant dupla-camada +
  FK composta RESTRICT; either/or 409; sem CNH em DTO/render (nome do responsável resolvido no front). 1 BAIXA informativa (professionalName
  label pré-existente em endpoint gated, fora deste PR).
- **Decisão:** verde unânime 3/3 → merge (CI = gate empírico do rls DB-gated) + KPI no PR (§C3). **RN-MUL-01..07 + MUL-esc + SEG-01/02 +
  SEG-esc + MUL-SEG-08/09 cobertas.** Integra os 3 trilhos: **multa→extrato (PR-03)** + **multa→payable either/or (PR-02)** +
  **seguro→vencimento PRIVATE (PR-04)**. D-records ratificados + **fecha D-Ω4C-FIN-MULTA-FRONTEIRA** e realiza **D-Ω4C-EXTRATO-CREATE-SCOPE**.
- KPI: `docs/kpis/omega4c/KPI_PR-07.json`. `Kpis/*`: backend 1382→**1404** (+22 fines/insurance/professional-statements); frontend_smoke
  737→**745** (+8 multas-condutor); blocks 77→**78**.
- **★ FASE 1 (Fundações transversais + Frota financeira) FECHADA:** PR-01 Anexos · PR-02 Contas a Pagar por origem · PR-03 Extrato do
  Profissional · PR-04 Motor de Notificações · PR-05 Abastecimento · PR-06 Manutenção · PR-07 Multas + Seguros. Próximo: **Fase 2** (Estoque
  custódia, Danos, Remunerações).

### PR-08 — Estoque com custódia e movimentos (ledger imutável) — plano do omega4c-planejador (2026-07-22)
**Mapeia PR-10+PR-11 do PLANO_OMEGA4C** (estoque custódia back+front) numa fatia vertical, padrão da rodada. **ABRE A FASE 2.** **Veredicto
Fase 0 (recon REAL, FATO vs HIPÓTESE):** **ESTENDER** — `src/modules/inventory/` (F7a/F7b) e `frontend/src/modules/inventory/` são
**maduros e vivos**, com o **ledger imutável e o saldo derivado JÁ implementados**; o gap é a **custódia BASE/PROFISSIONAL/VIATURA**
(LINK/UNLINK/EXIT + saldos por custódia + Resumo segmentado) e os **campos AutEM do item** (combustível, tipo, compra/venda, descrição,
inativar). Nenhum recálculo de saldo/avg é reescrito; tudo é **coluna aditiva + agregado por custódia + novos fluxos de movimento**.
- **FATO (li no código):** (a) Model `InventoryItem` (`schema.prisma:1142`, `inventory_items`): `sku` (**@@unique([tenant_id,sku])**), `name`,
  `unit`, `min_quantity`/`max_quantity`/`avg_cost`/`safety_stock` **Decimal(20,6)**, `abc_class?`, `lead_time_days?`, `is_active`, auditoria;
  **@@unique([tenant_id,id])**. **NÃO tem** custódia, **NÃO tem** flag combustível, **NÃO tem** tipo PRODUTO/EQUIPAMENTO / compra / venda /
  descrição. (b) Model `StockMovement` (`schema.prisma:1175`, `stock_movements`): `type` **String SEM CHECK** (validado na app — enum-app
  `entrada|saida|consumo|ajuste`, `inventory.types.ts:4`), `quantidade_sinalizada` **Decimal(20,6) SINALIZADA** (+entrada/+ajuste>=0,
  -saida/-consumo/-ajuste<0), `unit_cost?`, `work_order_id?`, `vehicle_id?` (**plain columns, sem FK nativa** — resolver-validated in-tenant,
  400 invalid ref; comentário do schema :1173 confirma "no hard FK"), `reason?`, `cycle_count_id?` (FK composta), `created_by`, `created_at`; FK
  composta `(tenant_id,item_id)->inventory_items` RESTRICT; **@@unique([tenant_id,id])** + índices `[tenant_id,item_id,created_at]` /
  `[tenant_id,work_order_id]` / `[tenant_id,created_at]`. (c) **LEDGER JÁ É IMUTÁVEL** — `inventory.routes.ts:84-88` documenta e materializa:
  o `createStockMovementRouter` expõe **só GET/POST/GET:id, ZERO PATCH e ZERO DELETE** ("corrections happen through a compensating `ajuste`
  movement, never by rewriting history") -> **D-Ω4C-RECON-08 já satisfeito na estrutura**; PR-08 **confirma e testa** a invariante e adiciona o
  estorno explícito. (d) **SALDO JÁ É DERIVADO** — `saldo = Σ quantidade_sinalizada` (`inventory.calculations.ts:48-51`; nunca coluna;
  `saldoOf`/`sumByItem` via `groupBy`), **nunca negativo** (`wouldOverdraw`->**409 `insufficient_balance`**, `inventory.types.ts:187`), tudo
  **dentro de UM `$transaction`** aberto por `withTenantRls` (`-prisma.repository.ts:180/420`). (e) **Regras de movimento vivas:** `entrada`
  exige `unitCost` (custo médio móvel R7.3), `consumo` exige `workOrderId` (R7.2), `ajuste` exige `reason`; `signQuantity` aplica o sinal
  (`calculations.ts:36`). (f) **Referências resolver-validated** (`service.ts:374`): `resolveWorkOrder`/`resolveVehicle` via os services default
  tenant-scoped (cross-tenant->false->400) — **o padrão do módulo é resolver + coluna sem FK nativa** (custódia herda essa disciplina, ver
  D-record abaixo). (g) **Permissões existentes:** `inventory_items:read/create/update` + `stock_movements:read/create` (`routes.ts:18-27`;
  `catalog.ts:115-119`), distribuídas a gestão/inventory/operator (create) e viewer/finance/support (read); RBAC_MATRIX l.47 "Inventory
  movements" já cobre. **Sem `:delete`** (coerente com ledger imutável). (h) **Front vivo:** `EstoquePage.tsx` (abas Itens|Movimentações|
  Contagem) + `InventoryItemFormModal` + `StockMovementFormModal` + `EstoqueDetailPage` — **sem custódia, sem Resumo segmentado, sem
  sub-modais Vincular/Saída-por-origem, sem flag combustível**. (i) Baseline testes backend: `inventory.test.ts` (7) + `inventory-abc` (10) +
  `inventory-items-routes` (8) + `stock-movements-routes` (10) + `inventory-cycle-counts-routes` (6) = **41**; frontend `inventory.adapter` +
  `inventory.smoke`. (j) `OperatorProfile` (`schema.prisma:1802`) e `Vehicle` (`:834`) têm **@@unique([tenant_id,id])** -> **alvos válidos de FK
  composta**.
- **HIPÓTESE:** taxonomia exata de "Tipo de Saída" do AutEM (só "venda direta" visto em frame limpo) -> **v1 = enum-app allowlist `{direct_sale}`
  extensível SEM CHECK** (não fabricar taxonomia). Pixel do modal/sub-modais/ícones não visto em frame limpo -> reproduzimos o **comportamento**
  (§11), não o visual. "Qtd. Base/Profissional/Viatura" da aba Resumo = agregados por custódia (derivados).

- **Custódia (modelo) — D-Ω4C-INV-CUSTODY-MODEL: `StockMovement` carrega a custódia; saldo por (item,custódia) = Σ quantidade_sinalizada
  filtrada por custódia (a mais simples e derivável; NÃO tabela de posição).** **+4 colunas aditivas** em `stock_movements`: (1) **`custody_type`**
  TEXT **NOT NULL DEFAULT `'base'`** — enum-app `base|professional|vehicle` (labels **BASE/PROFISSIONAL/VIATURA**, **SEM CHECK**, validado na app,
  padrão da rodada). Default `'base'` **backfilla semanticamente correto** todo movimento legado (era estoque da base — igual ao default
  `'external'` do PR-05). (2) **`custody_operator_profile_id`** UUID NULL + **FK COMPOSTA `(tenant_id,custody_operator_profile_id)->
  operator_profiles(tenant_id,id) ON DELETE RESTRICT`**. (3) **`custody_vehicle_id`** UUID NULL + **FK COMPOSTA `(tenant_id,custody_vehicle_id)->
  vehicles(tenant_id,id) ON DELETE RESTRICT`**. (4) **`transfer_group_id`** UUID NULL (par de LINK/UNLINK; ver -MOVEMENT-TYPES). **Por que DUAS
  colunas de ref tipadas (não um `custody_ref_id` polimórfico) — D-Ω4C-INV-CUSTODY-REF-TYPED (divergência registrada da sugestão "FK composta se
  referenciar", resolvida a favor de FK real):** um único `custody_ref_id` polimórfico (profissional OU viatura) **não pode** ter FK nativa — cairia
  no padrão resolver-sem-FK do `vehicle_id` existente; optamos por **duas FK compostas RESTRICT tipadas** porque (i) dá **integridade referencial
  real** (cross-tenant->**23503** no DB, não só na app), disciplina não-negociável da rodada (PR-03/05/06/07 provaram 23503 via dba-guardião);
  (ii) **RESTRICT protege o saldo em custódia** — não se apaga um profissional/viatura que **ainda detém itens** (fiel ao AutEM "desvincular
  devolve à base" **antes** de remover). App-rule (SEM CHECK): `base`->ambos NULL; `professional`->operator_profile set, vehicle NULL;
  `vehicle`->vehicle set, operator NULL (senão **422 `invalid_custody`**). **Dupla-camada de posse** (padrão PR-07): resolver `OperatorProfileService.get`/
  `VehicleService.get` tenant-scoped **antes** (-> **400 `invalid_custody_reference`** cross-tenant, erro amigável) + a FK RESTRICT como backstop DB.
  **Coexistência explícita (evitar confusão):** o `vehicle_id` LEGADO (movimento *atribuído a* uma viatura, ex. consumo de OS) **permanece
  INTOCADO**; o **novo `custody_vehicle_id`** = *custódia detida por* aquela viatura — semânticas distintas, colunas distintas (nota D-007).
- **Saldo por custódia (derivado) — D-Ω4C-INV-BALANCE-NONNEG (invariante testável FORTE, §3 não-negociável):** `saldo(item,custódia) = Σ
  quantidade_sinalizada WHERE (custody_type,custody_operator_profile_id,custody_vehicle_id) = alvo` (groupBy — MESMO padrão do `sumByItem`
  existente, só acrescenta a custódia ao `by`). O **saldo GLOBAL existente permanece `Σ tudo`** e **inalterado em significado** (LINK/UNLINK
  **netam a zero** globalmente -> total on-hand não muda ao mover de local; EXIT/ENTRY mudam) -> **`saldoOf`/`sumByItem`/avg-cost/reorder legados
  ficam INTOCADOS** (zero regressão em ABC/reorder/reposição). **Nunca negativo POR CUSTÓDIA:** antes de gravar um delta negativo, valida o
  saldo da custódia-**origem** (BASE no LINK; custódia-fonte no UNLINK; origem escolhida no EXIT/consumo) >= qtd -> senão **409
  `insufficient_balance`** (reusa `wouldOverdraw` por custódia). Não-negativo por custódia => global não-negativo (mais estrito). O guard global
  legado é mantido (redundante e inofensivo).
- **Movimentos LINK/UNLINK/EXIT — D-Ω4C-INV-MOVEMENT-TYPES: estende `STOCK_MOVEMENT_TYPES` com `link|unlink` (enum-app SEM CHECK); `saida` ganha
  origem-por-custódia + Tipo de Saída.** (a) **`entrada`** (ENTRY, laranja) — SEMPRE para a BASE (`custody_type` forçado a `base`; supplier/nota =
  `reason`/campos existentes); soma ao saldo BASE. Já existe — só fixa custódia. (b) **`link`** (VINCULAR, azul) — **transferência BASE->custódia**
  (profissional/viatura): guarda BASE>=qtd; grava **DUAS linhas irmãs numa MESMA tx** (`withTenantRls` já abre o `$transaction`) — `-qtd` em
  `custody=base` e `+qtd` na custódia-destino — compartilhando `transfer_group_id`. Global neta a zero (correto). (c) **`unlink`** (DESVINCULAR,
  verde) — **custódia->BASE**: guarda custódia-fonte>=qtd; par inverso `-qtd` na fonte + `+qtd` base, mesmo `transfer_group_id`. "Desvincular
  devolve à base" (ANALISE:174). (d) **`saida`** (EXIT, vermelho, ESTENDIDO) — origem = **custódia escolhida** (BASE/PROFISSIONAL/VIATURA;
  `custody_type` default `base` p/ compat) + **`exit_reason`** enum-app allowlist v1 `{direct_sale}` (label "Venda direta", SEM CHECK, extensível);
  guarda origem>=qtd; linha única `-qtd` na origem. (e) **`consumo`** (existente, OS) — origem-custódia default BASE, aceita custódia; `workOrderId`
  segue obrigatório. (f) **`ajuste`** (existente) — custódia única, sinalizado, `reason` obrigatório. **A LISTA final de `type` ratificada aqui:**
  `entrada · saida · consumo · ajuste · link · unlink` (enum-app, SEM CHECK — validado por `parseMovementType`). `signQuantity` estendido / o
  **construtor de transferência** monta o par (link/unlink não passam por `signQuantity` de linha única).
- **Ledger imutável + estorno — D-Ω4C-INV-LEDGER-IMMUTABLE (invariante testável FORTE, realiza D-Ω4C-RECON-08):** **NENHUM** endpoint deleta ou
  edita movimento (confirmado: `createStockMovementRouter` sem PATCH/DELETE — PR-08 **mantém e TESTA** [assert de rota 404/405]). O "x excluir
  movimento" do AutEM = **estorno por movimento compensatório** via **`POST /stock-movements/:id/reverse`** (perm `stock_movements:create`): posta
  a(s) linha(s) inversa(s) — para movimento simples (entrada/saida/consumo/ajuste), 1 linha oposta na MESMA custódia; para transferência
  (link/unlink, por `transfer_group_id`), o **par inverso** — com **`reverses_movement_id`** (UUID NULL, app-level, mesmo tenant, sem FK nativa —
  como `source_id`) apontando ao original, e `reason` de estorno. **Guardas:** (i) estornar 2x o mesmo movimento -> **409 `movement_already_reversed`**
  (existe linha com `reverses_movement_id = alvo`); (ii) o estorno **respeita o não-negativo por custódia** (estornar uma ENTRADA cujo saldo já saiu/
  vinculou -> 409 `insufficient_balance` — íntegro, não fabrica). Saldo sempre **derivado** dos movimentos (o estorno é +1 movimento, o original
  fica **intacto** — imutabilidade). Correção = novo movimento inverso, **nunca** DELETE/PATCH.
- **Baixa automática (fuel/manutenção) — D-Ω4C-INV-STOCK-DEFER-CONSUMER: DEFERIR a baixa a uma sub-fatia CONSUMIDORA `PR-08b` (recomendação que
  NÃO fabrica e é testável).** PR-08 entrega a **FUNDAÇÃO** (custódia + LINK/UNLINK/EXIT + flag combustível no item + o EXIT idempotente disponível);
  a **baixa automática** — (a) abastecimento **interno** -> EXIT da BASE (PR-05 `station_type=internal`, D-Ω4C-FUEL-STOCK-DEFER); (b) item de
  manutenção **Tipo=ESTOQUE** -> EXIT da BASE (PR-06 D-Ω4C-MANUT-STOCK-ITEM-DEFER); (c) **venda em serviço vinculada ao profissional -> baixa
  automática na custódia dele** (ANALISE:173) — vai para **PR-08b**. **Justificativa (não-fabricação):** a baixa exige *saber QUAL item de estoque*
  dar baixa, e **esse dado não existe**: `fuel_logs` **não tem `stock_item_id`** (PR-05 deliberadamente não o adicionou — "capturar junto do
  mecanismo em PR-10/11"); `maintenance_order_items` tem `description` **texto-livre**, sem vínculo a `inventory_item`. Ligar agora **fabricaria**
  qual item baixar. PR-08b é uma sub-fatia coesa: **+`stock_item_id` (FK composta) em `fuel_logs` e em `maintenance_order_items`** (migrações
  próprias, aditivas) + o efeito de domínio **idempotente** (fuel/manut -> EXIT/consumo na BASE; chave de idempotência determinística por
  origem, ex. `fuel-exit:<fuelLogId>`) **sem duplicar** ao reprocessar. **O charter §3 ("Abastecimento interno gera EXIT de estoque") é
  satisfeito PELA RODADA em Fase 2 (PR-08b), não pelo PR-08** — mesma disciplina fundação->consumidor dos PR-05/06. **PR-08 NÃO importa
  fuel-logs/maintenance** (zero acoplamento reverso; direção consumidor->fundação preservada).
- **Campos AutEM do item — D-Ω4C-INV-ITEM-FIELDS (aditivo, completa a aba Editar):** **+5 colunas aditivas** em `inventory_items`: (1)
  **`is_fuel`** BOOLEAN NOT NULL DEFAULT `false` (o checkbox "Combustível" — habilita o item no Abastecimento interno; é o **contrato que PR-08b
  lê**). (2) **`item_type`** TEXT NOT NULL DEFAULT `'product'` — enum-app `product|equipment` (labels **PRODUTO/EQUIPAMENTO**, SEM CHECK;
  **EQUIPAMENTO oculta Compra/Venda no front** §11). (3) **`purchase_price`** Decimal(12,2) NULL + (4) **`sale_price`** Decimal(12,2) NULL (colunas
  NOVAS -> seguem a invariante **Decimal(12,2)**, diferentes do `avg_cost` legado 20,6; derivado nenhum — são atributos do item, só PRODUTO). (5)
  **`description`** TEXT NULL. **"Código"** do AutEM = o `sku` existente (sem coluna nova). **Inativar** (ANALISE:175 "some das seleções, preserva
  histórico") = reusa `is_active`/`updateItem` (soft, ledger preservado — nunca apaga movimento). "Cadastrar não cria saldo" (ANALISE:172) já é
  invariante (saldo só via ENTRY) — **RN-EST reforçada**.
- **Resumo por custódia (endpoint novo) — D-Ω4C-INV-CUSTODY-SUMMARY:** **`GET /inventory-items/:id/custody-summary`** (perm `inventory_items:read`;
  literal declarado ANTES/coerente com `:itemId`) -> `{ baseQty, professionalTotalQty, vehicleTotalQty, total, professionals:[{operatorProfileId,
  name, qty}], vehicles:[{vehicleId, plate, qty}] }` — os "Qtd. Base/Profissional/Viatura" + as tabelas Profissionais|Viaturas (Nome|Qtd) da aba
  Resumo. Agregado por custódia (derivado, nunca coluna); nomes resolvidos via operator_profiles/vehicles (label, **nunca CNH**). Item validado no
  tenant via `getItem` (**404 cross-tenant**).
- **Permissão — D-Ω4C-INV-RBAC-REUSE (SEM permissão nova; diff VAZIO em catalog/core-saas/RBAC_MATRIX):** LINK/UNLINK/EXIT/consumo/estorno ->
  `stock_movements:create`; custody-summary/leitura -> `stock_movements:read`/`inventory_items:read`; flag/tipo/preços/descrição/inativar ->
  `inventory_items:update`. Todas **já existem** e já distribuídas (gestão/inventory/operator create; viewer/finance/support read; RBAC_MATRIX l.47
  cobre movimentos). `catalog.ts`/`tests/core-saas.test.ts`/`RBAC_MATRIX.md` **intocados**. Backend é a autoridade (papel sem `stock_movements:create`
  -> **403 real**, já testado).
- **Migração — ADITIVA up-only `20260828000000_add_stock_custody_ledger`** (autorizada, nunca destrutiva; declarada): (1) `ALTER stock_movements`
  ADD `custody_type TEXT NOT NULL DEFAULT 'base'` + `custody_operator_profile_id UUID` + `custody_vehicle_id UUID` + `transfer_group_id UUID` +
  `reverses_movement_id UUID` + 2 FK compostas RESTRICT (operator_profiles, vehicles) + relações inversas aditivas (`stockCustody StockMovement[]`
  em OperatorProfile e Vehicle, nomeadas p/ evitar ambiguidade Prisma) + índices `[tenant_id,item_id,custody_type,custody_operator_profile_id,
  custody_vehicle_id]` (groupBy por custódia) / `[tenant_id,transfer_group_id]` / `[tenant_id,reverses_movement_id]`; (2) `ALTER inventory_items`
  ADD `is_fuel BOOLEAN NOT NULL DEFAULT false` + `item_type TEXT NOT NULL DEFAULT 'product'` + `purchase_price NUMERIC(12,2)` +
  `sale_price NUMERIC(12,2)` + `description TEXT`. **ZERO** DROP/ALTER de tipo; `quantidade_sinalizada`/`avg_cost` (20,6) **INTOCADOS** (ALTER de
  tipo é destrutivo §C7.5). **Rollback = DROP COLUMN** (todas novas, sem dependente) — provado up/down/re-up pelo **agente-dba-guardião**. Toca
  `prisma/**` (schema + migration; **seed/catalog INTOCADOS** — sem permissão nova) -> **requer autorização explícita de `prisma/**` no comando do
  PR-08** (como PR-01/03/04/05/06/07).
- **Frontend — ESTENDER a tela viva (`frontend/src/modules/inventory/`), abas do modal Item = AutEM:** (i) **Modal "Item"** com sidebar
  **Editar | Resumo | Movimentação** + badge status ATIVO. **Editar** (estende `InventoryItemFormModal`): Código(sku) | Tipo (PRODUTO/EQUIPAMENTO —
  EQUIPAMENTO oculta Compra/Venda) | Nome | Unidade | Mínimo | Máximo | Compra(R$)/Venda(R$) só PRODUTO | Descrição | **checkbox Combustível**;
  rodapé EXCLUIR(honesto: soft/inativar — sem hard delete) · **ATIVO/INATIVAR** · SALVAR. **Resumo**: cards Qtd. Base | Qtd. Profissional | Qtd.
  Viatura (do custody-summary) + tabelas Profissionais / Viaturas (Nome|Qtd) com toolbar §7. **Movimentação**: histórico (Data | ícone do tipo |
  **Origem/Destino** BASE/PROFISSIONAL/VIATURA — o front **pareia `transfer_group_id`** p/ renderizar uma linha BASE->PROF | Qtd | **x estornar** ->
  chama `/reverse`) + toolbar 4 botões coloridos: **laranja Entrada · azul Vincular · vermelho Saída · verde Desvincular** abrindo **sub-modais
  laranja** (diferenciação registro-principal-azul x filho-laranja, ANALISE:31): **Entrada** (Data|Nota|Fornecedor|Qtd|Valor Unit.|Total) ·
  **Vincular** (Data|Nota|Vincular por PROFISSIONAL/VIATURA|destino|Qtd) · **Saída** (Data|Nota|Origem custódia|Tipo de Saída|Qtd|Valor Unit.|
  Total). §3 PT-BR (BASE/PROFISSIONAL/VIATURA, Combustível, Vincular/Desvincular — nunca termo técnico), §7 estados (loading/empty/error/**acesso
  não permitido**/desatualizado; offline N/A web), §2.8 DTO allowlist (nunca tenant_id/storage/CNH). Guard RBAC `inventory_items:*`/
  `stock_movements:*` (existentes).
- **DTO/auditoria — D-Ω4C-INV-DTO (§2.8):** DTO do movimento ganha `custodyType` + `custodyOperatorProfileId`/`custodyVehicleId` (+ `custodyName`
  label) + `transferGroupId` + `reversesMovementId`; DTO do item ganha `isFuel`/`itemType`/`purchasePrice`/`salePrice`/`description`. **Nunca**
  tenant_id/storage/CNH. Auditoria estende metadata (`custody_type`, `transfer`/`reverse`, item flags) não-PII; ações registram
  `stock_movement.linked/unlinked/exited/reversed` e `inventory_item.updated`.
- **RNs — EST/INV:** **EST-01** (custódia no movimento; saldo(item,custódia)=Σ sinalizada por custódia; global=Σ tudo INTOCADO; LINK/UNLINK netam
  a zero globalmente) · **EST-02** (**saldo nunca negativo POR CUSTÓDIA** — guard da origem [BASE no link, fonte no unlink, origem no exit/consumo]
  -> 409 `insufficient_balance`; não-negativo por custódia => global) · **EST-03** (LINK BASE->custódia = par irmão `transfer_group_id` na MESMA tx;
  UNLINK custódia->BASE = par inverso; "desvincular devolve à base") · **EST-04** (EXIT origem-por-custódia + `exit_reason` allowlist v1
  `{direct_sale}`; consumo mantém workOrderId obrigatório) · **EST-05** (**ledger imutável** — zero PATCH/DELETE de movimento [assert de rota];
  estorno = compensatório via `/reverse` com `reverses_movement_id`; original intacto) · **EST-06** (estorno idempotente-guardado: 2x -> **409
  `movement_already_reversed`**; estorno respeita não-negativo por custódia) · **EST-07** (custódia ref válida no tenant — dupla-camada: resolver
  400 `invalid_custody_reference` + FK composta RESTRICT 23503; `base`<->ambos-null / `professional`<->operator / `vehicle`<->vehicle senão 422
  `invalid_custody`; RESTRICT protege profissional/viatura com saldo) · **EST-08** (Resumo por custódia derivado — Qtd Base/Profissional/Viatura +
  tabelas; nomes label, nunca CNH; 404 cross-tenant) · **EST-09** (item AutEM: `is_fuel`/`item_type`/compra/venda/descrição aditivos; EQUIPAMENTO
  oculta compra/venda; **cadastrar NÃO cria saldo** [só ENTRY]; inativar preserva histórico) · **EST-10** (**baixa automática DEFERIDA a PR-08b** —
  PR-08 só entrega a fundação + flag combustível; **zero movimento fabricado, zero import de fuel-logs/maintenance**; parada honesta D-007) ·
  **EST-11** (§2.8/§3 — DTO allowlist, labels PT-BR, sem tenant_id/storage/CNH; auditoria não-PII) · **EST-12** (multi-tenant 3 tenants efêmeros em
  `rls-tenant-isolation`: custódia + custody ref tenant-scoped; custody de A invisível a B; custody ref cross-tenant rejeitado [400/23503]; cross
  404; updateMany cross=0; **`tenant_id` 1º índice** em todos os novos; **TEARDOWN FK-SAFE** — `stockMovement.deleteMany` **antes** de
  operator_profiles/vehicles [as novas FK RESTRICT], lição do CI-catch PR-06).
- **Divergências AutEM honestas (D-007):** (i) **baixa automática** (fuel interno / item ESTOQUE / venda-em-serviço no profissional) -> **PR-08b**
  (falta `stock_item_id` em fuel_logs/maintenance_order_items; ligar agora fabricaria qual item baixar; ver D-Ω4C-INV-STOCK-DEFER-CONSUMER). (ii)
  **`avg_cost`/`quantidade_sinalizada` Decimal(20,6)** legados (não 12,2 da invariante) — ALTER de tipo destrutivo/proibido §C7.5; colunas NOVAS de
  preço seguem 12,2 (divergência gêmea PR-05/06/07 -MONEY). (iii) **`vehicle_id` legado x `custody_vehicle_id` novo** = colunas/semânticas distintas
  (atribuição x custódia) — coexistência documentada. (iv) **Tipo de Saída** = enum-app v1 `{direct_sale}` extensível (só "venda direta" visto). (v)
  **par de transferência = 2 linhas** no ledger (preserva o modelo sinalizado existente e o global-Σ); o front pareia por `transfer_group_id` p/
  exibir 1 linha Origem->Destino (concern de exibição). (vi) pixel do modal/sub-modais/ícones AutEM não visto em frame limpo -> reproduzimos o
  **comportamento** (§11), não o visual.
- **Bateria de validação (seção 10 — o avaliador roda):** `npx prisma validate` + `prisma migrate diff` (sem drift) + **dba-guardião prova
  up/down/re-up** de `20260828000000_add_stock_custody_ledger` (ADITIVA: 5+5 ADD COLUMN + 2 FK compostas RESTRICT + índices + relações inversas;
  rollback=DROP COLUMN; backfill legado provado custody_type='base'/item_type='product'/is_fuel=false); backend `npm run check` · lint · test ·
  build; `node --test --import tsx tests/stock-custody.test.ts` (NOVO — LINK/UNLINK/EXIT + **saldo por custódia derivado** + **não-negativo por
  custódia** [409 insufficient_balance na origem] + **imutabilidade** [sem PATCH/DELETE; estorno compensatório; original intacto] + **estorno
  idempotente** [2x->409 movement_already_reversed] + custody ref cross-tenant [400/RESTRICT] + custody-summary + item is_fuel/item_type/preços/
  inativar + **cadastrar não cria saldo**) + `tests/stock-movements-routes.test.ts`/`inventory-items-routes.test.ts` **estendidos**;
  `tests/rls-tenant-isolation.test.ts` estendido (3 tenants efêmeros; custody tenant-scoped; teardown FK-safe); **ZERO regressão** em `inventory`
  (7) · `inventory-abc` (10) · `inventory-cycle-counts-routes` (6) · `stock-movements-routes` (10) · `inventory-items-routes` (8) · fuel-logs/
  maintenance/work-order-* (nada importado); frontend `npm --prefix frontend run check` · build · smoke (modal Item 3 abas + sub-modais laranja
  Entrada/Vincular/Saída + Resumo por custódia + x estornar + flag combustível + tipo EQUIPAMENTO oculta compra/venda + estados §7 + guard); `git
  diff --check` + `git status --short` limpo (schema/migration/inventory/**/front por caminho; seed/catalog/RBAC_MATRIX **intocados**). KPI
  `docs/kpis/omega4c/KPI_PR-08.json` + histórico + snapshot; Kpis/* backend +N (stock-custody + rotas), frontend_smoke +M, blocks 78->**79**.
- **Riscos + rollback:** (R1) **saldo negativo por custódia / concorrência de saldo** -> mitigado: guard por custódia dentro do `$transaction` de
  `withTenantRls` (mesmo isolamento do fluxo existente); risco teórico de corrida herdado do módulo (dois writes concorrentes lendo o mesmo
  saldoBefore) — documentado; endurecimento opcional (advisory-lock por (tenant,item) / SELECT FOR UPDATE) fica p/ Ω5 se surgir contenção real,
  **não** regride o comportamento atual. (R2) **quebrar imutabilidade** -> mitigado: zero rota PATCH/DELETE (assert de rota); estorno é +movimento,
  original intacto; teste de imutabilidade. (R3) **fabricar baixa automática sem dado real** -> mitigado deferindo a PR-08b (zero import de fuel/
  maintenance; contrato foundation-ready via is_fuel). (R4) **regressão em avg-cost/ABC/reorder** -> mitigado: saldo GLOBAL e agregados legados
  INTOCADOS (LINK/UNLINK netam a zero; custódia só ADICIONA agregado); cobertos por regressão. (R5) **FK de custódia cross-tenant / apagar
  profissional-viatura com saldo** -> mitigado: FK composta RESTRICT (23503) + resolver 400 + RLS FORCE + teste 3-tenant. (R6) **teardown do rls
  quebra por RESTRICT** (CI-catch PR-06) -> mitigado: `stockMovement.deleteMany` **antes** de operator_profiles/vehicles no teardown efêmero. (R7)
  **`prisma/**`** -> só ADITIVO (10 ADD COLUMN + 2 FK + índices + relações inversas; **sem** permissão/seed); **rollback = DROP COLUMN** (todas
  novas, sem dependente) + revert do PR (inventory/**/front). Sem destrutivo (respeita parada §C7.5). **Sem dependência nova nem serviço externo
  pago -> junta normal, NÃO junta-5.**

**APROVADO para implementar.** (D-records desta fatia: **D-Ω4C-INV-CUSTODY-MODEL · -CUSTODY-REF-TYPED · -BALANCE-NONNEG · -MOVEMENT-TYPES ·
-LEDGER-IMMUTABLE · -STOCK-DEFER-CONSUMER(PR-08b) · -ITEM-FIELDS · -CUSTODY-SUMMARY · -RBAC-REUSE · -DTO · -MONEY(D-007)** — a junta ratifica no
veredito; persistir em controle/decisoes.md no PR. Realiza **D-Ω4C-RECON-08** [ledger imutável] e **D-Ω4C-RECON-03** [tipos LINK/UNLINK+saída
enum-app SEM CHECK]. **Abre PR-08b** [baixa automática consumidora] que realiza **D-Ω4C-FUEL-STOCK-DEFER** [PR-05] e **D-Ω4C-MANUT-STOCK-ITEM-DEFER**
[PR-06]. Reusa o ledger imutável e o saldo derivado existentes; **sem permissão nova, sem tocar avg-cost/ABC/reorder**.)

#### PR-08 — Veredito da junta (2026-07-22) — **UNÂNIME 3/3 APROVADO — ABRE FASE 2**
- **agente-dba-guardião** → `APROVADO` (2 BAIXA op): migração `20260828000000_add_stock_custody_ledger` provada **UP/DOWN/RE-UP** em DB scratch
  isolada. Puramente aditiva (5 ADD COLUMN em stock_movements: custody_type default 'base' + custody_operator_profile_id/custody_vehicle_id/
  transfer_group_id/reverses_movement_id; 5 em inventory_items: is_fuel/item_type/purchase_price/sale_price NUMERIC(12,2)/description) + 2 FK
  compostas RESTRICT →operator_profiles e →vehicles + 3 índices tenant-first. **Backfill provado** (linha legada → custody_type='base'/
  is_fuel=false/item_type='product'). Tipos legados (avg_cost/quantidade_sinalizada 20,6) INTACTOS. RLS t/t nas 4 tabelas. Integridade:
  FK cross-tenant → **23503** (ambas); RESTRICT bloqueia DELETE de operator_profile/vehicle referenciado → **23503**.
- **omega4c-avaliador** → `APROVADO`: seção 10 verde (backend 1420 pass / 6 skip — única falha ambiental rls-tenant-isolation DB-gated;
  stock-custody **14/14**; frontend smoke **760/760**). **RN-EST-01..12 todas testadas:** saldo por custódia **DERIVADO** (Σ groupBy, nenhuma
  coluna de saldo); LINK/UNLINK = par irmão transfer_group_id na mesma tx (global neta a zero); EXIT reduz custódia; **saldo nunca negativo
  por custódia → 409 insufficient_balance** (guard dentro do $transaction); **ledger IMUTÁVEL** (router sem PATCH/DELETE → 404; estorno
  compensatório via POST /:id/reverse; 2º estorno → 409 movement_already_reversed; original intacto); posse dupla-camada (422 invalid_custody
  + 400 invalid_custody_reference cross-tenant + FK RESTRICT 23503); §2.8 (custodiante só nome, nunca CNH); **baixa automática DEFERIDA**
  (is_fuel só flag, marcar combustível NÃO gera movimento, zero import de fuel/maintenance). **Confirmou o achado PRÉ-EXISTENTE
  P-INV-LEGACY-QTY-CONTRACT** (buildStockMovementPayload byte-idêntico à main → descasamento de quantidade legado NÃO é regressão do PR-08).
  Condições: MEDIA (git add por caminho — processo) + 3 BAIXA (dba-proof/KPI/backlog P-INV-LEGACY-QTY-FIX). Zero condição BLOQUEIA.
- **coordenador-de-acessos** → `APROVADO`: permissão REUSADA (catalog/RBAC_MATRIX/core-saas diff VAZIO); rotas gated (LINK/UNLINK/EXIT/estorno
  = stock_movements:create; custody-summary/leitura = read; flag/inativar = inventory_items:update); posse cross-módulo validada in-tenant
  (resolveCustody via services tenant-scoped → 400; FK composta RESTRICT backstop 23503); **NENHUM efeito de domínio novo** (sem notificação/
  extrato — baixa deferida → sem superfície de escalada PR-06/07); front↔back gating coerente; UI PT-BR sem CNH. 1 BAIXA (catch amplo do
  resolver mascara erro transitório como 400 — observabilidade, não segurança).
- **Decisão:** verde unânime 3/3 → merge (CI = gate empírico do rls DB-gated) + KPI no PR (§C3). **Ledger imutável + saldo nunca negativo por
  custódia** confirmados. Realiza D-Ω4C-RECON-08 (imutável) e -03 (LINK/UNLINK). **Baixa automática → PR-08b** (realiza os deferrals de
  PR-05/06). Achado pré-existente P-INV-LEGACY-QTY-CONTRACT registrado (fix em fatia própria). D-records ratificados.
- KPI: `docs/kpis/omega4c/KPI_PR-08.json`. `Kpis/*`: backend 1404→**1420** (+16 stock-custody 14 + 2 rota); frontend_smoke 745→**760**
  (+15 estoque-custodia); blocks 78→**79**. **★ Abre a FASE 2** (Estoque custódia · Danos · Remunerações).

### PR-09 — Danos (parcelas→extrato, trava de exclusão, termo de ciência, vínculo assistência/viatura) — plano do omega4c-planejador (2026-07-22)
**Mapa:** realiza **PR-12 (back) + PR-13 (front)** do PLANO_OMEGA4C Fase-2 (l.55-56). **Veredicto Fase 0:** **ESTENDER** via coexistência aditiva — `src/modules/damages/` JÁ EXISTE (10 arquivos back; model `Damage` schema:1023, `DamageAttachment` irmão) e a tela `frontend/src/modules/fleet/damages/` também. **Reusa integralmente o rail do extrato do PR-07** (`professional-statement.service.ts`: `createForSource`/`removeForSource`/`findActiveBySource` — interno service→service, tipado, amount-travado, idempotente por origem, reversão RN-EXT-01). O Dano é análogo à Multa: **desconto parcelado no extrato do profissional responsável** com entry_type=damage / direction=debit / source_type=damage. **FATO (recon):** damage já está no `PROFESSIONAL_STATEMENT_ENTRY_TYPES` **e** no `PROFESSIONAL_STATEMENT_SOURCE_TYPES` (types.ts:7,10) → **SEM migração de enum na tabela do extrato**; o índice parcial de idempotência de origem da `20260823000000` é o backstop DURO. **FATO:** Danos **não** tem rail de contas a pagar (PR-02 montou em fuel-logs/manutenção/seguros; PR-07 em multas — Danos ficou de fora) → **NÃO há either/or** (o desconto é da FOLHA do profissional) — mais simples que a Multa. **FATO:** `Damage` **não** tem DELETE físico (rotas só GET/POST/PATCH + anexos) → exclusão do AutEM = **desativação** (is_active=false).

- **AutEM (ANALISE:104-133 — comportamento a reproduzir):** modal 4 seções → **Informações Gerais** (Viatura*, Data/Hora*, Tipo de Dano* INTERNO/EXTERNO/AMBOS, Profissional* = quem sofreu/causou, OS de origem, Gravidade) · **Identificação do Dano** (Objeto, Identificação do Objeto) · **Valores e Descontos** (Valor Total do Dano R$ · **Profissional R$** = valor a descontar, *pode ser PARCIAL* ex. 250 de 500 · Parcelas · Data do 1º desconto) · **Descrição do Dano** + **Análise Interna do Dano** (*não sai na impressão*). Ao lançar o desconto → **alerta amarelo** AutEM: *O valor do dano já se encontra no extrato do profissional. A exclusão e algumas alterações não podem ser feitas até que todas as parcelas sejam removidas do mesmo.*; imprimir **com ou sem parágrafo de ciência** (termo p/ o profissional assinar).
- **Model — D-Ω4C-DANO-MODEL (migração ADITIVA up-only `20260829000000_add_damage_responsible_and_autem_fields`, latest+1 confirmado):** em `damages` adiciona (todas nullable, aditivo puro — nenhum ALTER/DROP): (1) **responsible_operator_profile_id** UUID? + **FK COMPOSTA (tenant_id, responsible_operator_profile_id)→operator_profiles(tenant_id,id) RESTRICT** + índice (tenant_id, responsible_operator_profile_id) (tenant_id 1º) — **clona byte-a-byte a `20260827000000` da Multa**; (2) tipo TEXT? (enum-app internal|external|both, labels INTERNO/EXTERNO/AMBOS, SEM CHECK — validado na app); (3) origem TEXT? (**classificação string**, MULTA entre os valores, **SEM FK** — D-Ω4C-RECON-04); (4) objeto TEXT?; (5) identificacao_objeto TEXT?; (6) analise_interna TEXT? (não impressa). RLS herdada (`damages` já tem ENABLE/FORCE + policy). Toca `prisma/**` (schema + migration) → **requer autorização explícita de prisma no comando do PR-09** (como PR-01/03/04/05/06/07/08). custo_estimado/custo_real (Decimal 20,6 legado) **intocados** (coexistência D-007; o dinheiro do desconto vive no extrato em Decimal 12,2). **Sem novo model.**
- **Dano → extrato (D-Ω4C-DANO-STATEMENT-EFFECT — reusa o rail PR-07):** ao setar responsible_operator_profile_id **+** responsible_amount>0, o efeito de domínio chama createForSource(operatorProfileId, entryType=damage, direction=debit, sourceType=damage, sourceId=damageId, amount=responsible_amount, installmentTotal, firstDueDate). responsible_amount/responsible_installment_total/responsible_first_due_date são **transientes** (body no create/patch, como responsible_installment_total da Multa) — o dinheiro cobrado vive **só no extrato** (parcelas somam ao total; single source of truth). É **service→service** (NÃO exige `professional_statements:create` — mandato §6, idêntico à Multa) e **NÃO-amplificador** (typed/amount-travado/single-profissional/zero fan-out). **Idempotente por origem** (source_type=damage, source_id=damageId). Reversão/troca via removeForSource(damage, damageId) → settled → **409 statement_entry_locked** (RN-EXT-01). **Sem débito ativo → no-op.**
- **D-Ω4C-DANO-MONEY (honestidade AutEM):** Valor Total do Dano = custo_real (existente); Profissional R$ = responsible_amount (o desconto, **pode ser PARCIAL**, ANALISE:124) = amount do débito, **valor REAL do usuário, nunca fabricado**. Guards: responsible_amount>0 (422); custo_real obrigatório ao cobrar (422 damage_total_required); responsible_amount ≤ custo_real (422 responsible_amount_exceeds_total). Profissional pode ser setado **sem** desconto (identificação-só, amount ausente → sem efeito no extrato — fiel ao AutEM). O detalhe **DERIVA** o desconto via findActiveBySource (não persistido) — evita invariante de dinheiro duplicado (alternativa coluna responsible_amount **rejeitada**: duplicaria money).
- **Trava — D-Ω4C-DANO-TRAVA (invariante testável; espelha o alerta amarelo AutEM):** enquanto há débito ATIVO da fonte (findActiveBySource(damage,id) > 0): (a) **is_active=false** (exclusão) → **409 damage_statement_locked** com a msg AutEM; (b) **editar custo_real** (a base do desconto) → **409 damage_statement_locked**; (c) trocar/limpar o desconto passa por removeForSource → parcela settled → **409 statement_entry_locked** (RN-EXT-01). Campos **não-financeiros** (descricao/gravidade/status/objeto/tipo/identificacao_objeto/analise_interna/work_order) permanecem editáveis (algumas alterações). PATCH de troca de responsável = remove-anterior(settled→409)+recria (espelha o isSetOrChange/isClear da Multa, fine.service:204-215).
- **Termo de ciência — D-Ω4C-DANO-TERMO:** **SEM campo persistido, SEM assinatura digital fabricada.** O termo de ciência é um **parágrafo-padrão** incluído/omitido no **PrintDamageModal 100% client-side** (window.print(), clona PrintFineModal/PrintMaintenanceOrderModal) via toggle Incluir termo de ciência. Imprime só dados JÁ carregados (nada fabricado); **Análise Interna do Dano NUNCA sai na impressão** (ANALISE:126). Duas variantes = com/sem o parágrafo (ANALISE:131).
- **Vínculo assistência/viatura — JÁ EXISTE (sem migração de vínculo):** vehicle_id obrigatório (FK composta→vehicles, resolveVehicle→400 cross-tenant) + work_order_id opcional in-tenant (assistência/OS, resolveWorkOrder→400). Adiciona só resolveResponsible (operator_profile do tenant→400 cross-tenant; FK composta RESTRICT = backstop 23503). Origem MULTA = **classificação string** origem (SEM FK Dano→Multa na v1 — D-Ω4C-RECON-04; vínculo explícito é evolução Ω5).
- **Permissão — D-Ω4C-DANO-RBAC (SEM permissão nova):** **REUSA damages:read/create/update** (catalog.ts:112-114, já distribuídas). Confere RBAC_MATRIX (Danos herda a linha de Frota). O efeito no extrato é **interno** → **não exige professional_statements:create** (idêntico ao PR-07). Backend é a autoridade (sem damages:update → 403 real). Catálogo/seed/`core-saas.test` **intocados** (sem entrada nova) — zero risco de quebrar expectedPermissionCatalog. Frontend usa listOperatorProfilesFromApi (o mesmo adapter da Multas, MultasPage:14) p/ o select de Profissional.
- **Backend (ESTENDER):** damage.types.ts (+responsibleOperatorProfileId, campos AutEM, tipo DamageStatementResolvers, disposition statement|none) · .validators.ts (+parseResponsibleAmount/InstallmentTotal/FirstDueDate/Tipo/Origem) · .service.ts (+resolvers resolveResponsible/createResponsibleStatementDebit/removeResponsibleStatementDebit/getActiveStatementDebit em createDefaultReferenceResolvers; lógica set/change/clear + trava no create/update — clona fine.service) · .dto.ts (DETAIL: +responsibleOperatorProfileId+disposition+bloco statementDebit(totalAmount, installmentTotal, firstDueDate, hasSettled) DERIVADO §2.8; LIST: só +responsibleOperatorProfileId+disposition) · .controller.ts (+auditoria damage.responsible_assigned/_cleared, metadata allowlist operatorProfileId+installmentTotal — nunca valor/CNH) · damage-prisma.repository.ts (+colunas). **Sem rota REST nova** (o desconto entra via POST/PATCH /damages, como a Multa). **Zero notificação criada** → a lição PR-06/07 (visibility private HARDCODED) **não se aplica** (sem efeito de notificação = sem superfície de escalada) — registrado.
- **Frontend (ESTENDER):** DamageFormModal → **4 seções AutEM** (+Tipo, +Profissional select, +Objeto/Identificação, Valores e Descontos com Valor Total/Profissional R$/Parcelas/Data, +Análise Interna) · **alerta amarelo** (Alert tone=warning com a msg AutEM) + campos financeiros/desativar **desabilitados** quando statementDebit ativo (derivado do detail) · **badge lançado no extrato** na lista/detalhe (disposition) · deep-link Ver no extrato → /fleet/statement/:operatorProfileId (rota PR-03) · **PrintDamageModal** (com/sem termo). §3 PT-BR (Profissional/Viatura, nunca termo técnico/CNH), §7 estados, §2.8.
- **RNs:** DANO-01 (rail extrato — responsible+amount>0 → débito damage/debit/damage, amount≤custo_real REAL, parcelas, idempotente por origem, interno não-amplificador) · DANO-02 (reversão — clear/troca → removeForSource; settled→409; sem débito→no-op) · DANO-03 (**trava** — débito ativo: is_active=false→409, custo_real→409, msg AutEM) · DANO-04 (money honesty — amount>0 / ≤total / custo_real obrigatório ao cobrar, 422) · DANO-05 (vínculo — vehicle/wo/responsible 400 cross-tenant; FK composta 23503; origem=string sem FK) · DANO-06 (§2.8/LGPD DTO — responsibleOperatorProfileId+disposition+statementDebit agregado; nunca tenant_id/CNH/source internos) · DANO-07 (auditoria allowlist operatorProfileId+installmentTotal) · DANO-08 (multi-tenant 3 tenants efêmeros no rls; tenant_id 1º; cross 400/404; **teardown FK-safe** damages ANTES de operator_profiles/vehicles) · DANO-09 (RBAC damages:* reusada; efeito interno não exige professional_statements:create; sem-perm→403) · DANO-10 (termo de ciência — print client-side com/sem; Análise Interna nunca impressa) · DANO-11 (coexistência — DamageAttachment/status machine/rotas de anexo intactos; sem either/or com contas a pagar).
- **Divergências AutEM honestas (D-007):** (i) Valor Total do Dano mapeado a custo_real (o ERP mantém estimado+real; single-value AutEM=custo_real) — parada honesta, sem alterar a coluna legado 20,6. (ii) responsible_amount transiente/derivado (não coluna) — o detalhe deriva do extrato; sem invariante de money duplicado. (iii) Tipo/Objeto/Identificação/Origem/Análise são descritivos (display/print), sem regra além do parseamento. (iv) vínculo explícito Dano→Multa (FK) = evolução Ω5 (v1 = classificação string). (v) impressão = client-side (sem rota/PDF no back), como Multa/Manutenção.
- **Bateria (seção 10 — o avaliador roda):** `npx prisma validate` + migrate diff (sem drift) + **dba-guardião prova up/down/re-up** da `20260829000000`; backend `npm run check`·`lint`·`test`·`build`; `node --test --import tsx tests/damages-statement.test.ts` (NOVO — responsible→débito, amount parcial, idempotência por origem, **trava** [is_active=false 409, custo_real 409, removeForSource settled 409 via fixture], reversão, cross-tenant 400/404, guards 422); `tests/rls-tenant-isolation.test.ts` estendido (3 tenants efêmeros p/ damages.responsible_operator_profile_id: FK composta cross→23503, cross 404, updateMany cross=0, **teardown FK-safe** damages antes de operator_profiles/vehicles — lição CI-catch PR-06); **zero regressão** em fines / professional-statement-crud / financial-title-source / work-order-* / operator-profiles; frontend `check`·`build`·smoke (4 seções + alerta amarelo + PrintDamageModal com/sem termo + badge lançado + deep-link extrato); `git diff --check` + `git status --short` limpo. KPI: `docs/kpis/omega4c/KPI_PR-09.json` + histórico + snapshot; `Kpis/*` backend +N (damages-statement), frontend_smoke +M, blocks 79→**80**.
- **Riscos + rollback:** (R1) dinheiro duplicado → **evitado** (amount transiente+derivado; extrato é a fonte única). (R2) dedupe do extrato → índice parcial de origem (`20260823000000`) + pré-check findActiveBySource (garante InMemory E Prisma). (R3) trava frágil → testada com **fixture de parcela settled** (caminho feliz: all-pending → remove OK; settled → 409). (R4) escalada de visibilidade → **N/A** (Danos cria ZERO notificação; sem superfície — registrado). (R5) prisma só ADITIVO → **rollback = DROP CONSTRAINT/INDEX/COLUMN** (colunas novas, sem dependente) + revert do PR; sem destrutivo (respeita parada §C7.5). (R6) FK cross-tenant → RESTRICT backstop (23503) + resolver pré-check (400).

**APROVADO para implementar.** (D-records desta fatia: **D-Ω4C-DANO-MODEL · -STATEMENT-EFFECT · -MONEY · -TRAVA · -TERMO · -RBAC** — a junta ratifica no veredito; persistir em controle/decisoes.md no PR. Realiza D-Ω4C-RECON-04 [origem MULTA = classificação string, sem FK]. Reusa D-Ω4C-EXTRATO-CREATE-SCOPE / -TRAVA e o rail D-Ω4C-MULSEG-STATEMENT-EFFECT do PR-07.)

#### PR-09 — Veredito da junta (2026-07-22) — **UNÂNIME 3/3 APROVADO (1ª passada)**
- **agente-dba-guardião** → `APROVADO` (0 condições): migração `20260829000000_add_damage_responsible_and_fields` provada **UP/DOWN/RE-UP**
  em DB scratch isolada. Puramente aditiva (6 ADD COLUMN nullable: responsible_operator_profile_id UUID + tipo/origem/objeto/
  identificacao_objeto/analise_interna TEXT + FK composta `(tenant_id, responsible_operator_profile_id)`→operator_profiles RESTRICT +
  índice tenant-first — clone byte-a-byte da FK de fines/20260827000000). `custo_estimado`/`custo_real` NUMERIC(20,6) INTOCADOS. RLS de
  damages e operator_profiles t/t. Retrocompat MATCH-SIMPLE. Integridade: FK cross-tenant → **23503**; RESTRICT bloqueia DELETE de
  operator_profile referenciado → **23503**.
- **omega4c-avaliador** → `APROVADO`: seção 10 verde (backend 1440 pass / 6 skip — única falha ambiental rls-tenant-isolation DB-gated;
  damages-statement **20/20**; frontend smoke **769/769**). **RN-DANO-01..11 cobertas:** dano→extrato via `createForSource`
  entry_type='damage', **amount = valor real** (responsible_amount ≤ custo_real, nunca fabricado); **dedupe idempotente** testado 2×→1;
  **desconto PARCIAL** permitido; guards 422; **trava FORTE** (is_active=false com débito ativo → 409 damage_statement_locked; editar
  custo_real → 409; parcela settled → 409 statement_entry_locked; descritivos editáveis); reversão via removeForSource (RN-EXT-01);
  §2.8 (nome do responsável NÃO no DTO; **analise_interna NUNCA impressa** — 2 testes; statementDebit derivado, money não duplicado);
  **ZERO notificação** (grep vazio → sem superfície de escalada). Rail professional-statement.service NÃO reescrito (só chamado);
  catalog/core-saas/RBAC_MATRIX/seed diff VAZIO; teardown FK-safe. 2 BAIXA (deep-link p/ extrato não cabeado; nome de pasta cosmético).
- **coordenador-de-acessos** → `APROVADO`: efeito dano→extrato **NÃO-AMPLIFICADOR** (entry_type/direction/source_type travados no seam;
  amount capado a custo_real 422; single-profissional; zero fan-out; createForSource re-valida por allowlist) — ator `damages:create` sem
  `professional_statements:create` grava só o débito constrangido, NÃO lançamento arbitrário. **Zero notificação** (sem escalada PR-06).
  `createForSource`/`removeForSource` INTERNOS (sem rota; POST /professional-statements segue AJUSTE gated). catalog/matriz diff VAZIO.
  Posse cross-tenant **defesa tripla** (400 invalid_operator_profile_reference + 404 lookup + FK RESTRICT 23503). §2.8 (nome resolvido no
  front, CNH nunca exposta, analise_interna nunca impressa; auditoria allowlist {operatorProfileId, installmentTotal}). 1 BAIXA informativa.
- **Decisão:** verde unânime 3/3 → merge (CI = gate empírico do rls DB-gated) + KPI no PR (§C3). **Reusa o rail do extrato do PR-07**
  (createForSource entry_type='damage') — 4º agregado a lançar no extrato do profissional (após multa). Termo de ciência = impressão
  client-side com/sem parágrafo (sem assinatura fabricada). D-records ratificados; realiza D-Ω4C-RECON-04.
- KPI: `docs/kpis/omega4c/KPI_PR-09.json`. `Kpis/*`: backend 1420→**1440** (+20 damages-statement); frontend_smoke 760→**769**
  (+9 danos-responsavel); blocks 79→**80**.

### PR-10 — Remunerações (conferência + liquidação em lote, CSV, filtro-modal-ao-entrar) — plano do omega4c-planejador (2026-07-22)
**Mapa:** realiza **PR-14 (back) + PR-15 (front)** do PLANO_OMEGA4C Fase-2 (l.57-58) numa fatia vertical. **ÚLTIMA fatia da Fase 2.**
**Veredicto Fase 0 (recon REAL, FATO vs HIPÓTESE):** **MISTO — ESTENDER o motor + CRIAR o fluxo de conferência/liquidação.** O módulo
`src/modules/commissions/` (motor: policies/basis-events/calculations/statements) **existe e está montado** (router vivo, gate de cancelamento
WS-SCALE-COMISSAO), e a tela `frontend/src/modules/finance/commissions/pages/RemuneracoesPage.tsx` (F8) **já existe como extrato-resumo por
operador** — falta **a rota `settle`, o link ao extrato do profissional, o marcador de liquidação e a tela de conferência (grid c/ bolinhas +
seletor de colunas + liquidar em lote + totalizadores + CSV + impressão + filtro-modal-ao-entrar).**

- **FATO (li no código):** (a) **NÃO existe COMPUTE em produção** — nem `commission.repository.ts` (InMemory) nem `commission-prisma.repository.ts`
  têm `commissionCalculation.create`/writer (grep de `commissionCalculation.create|calculateCommission|computeCommission` no `src/` inteiro = **VAZIO**);
  calculations só nascem via `seedCalculationForTests` (test-only). O motor **lê/agrega/gateia**, mas **não materializa linha de remuneração por regra**.
  (b) **NÃO existe "regra do profissional" (percentual/valor por serviço)** — `CommissionPolicyRule` (rate_type/rate_value) é **tenant/vertical-scoped**, não
  per-profissional, e não está ligada a compute; `OperatorProfile` (schema:1852) **não tem** campo de comissão/taxa. (c) **`commissions:settle` JÁ EXISTE**
  (`catalog.ts:146`) e **já distribuída a finance** (`catalog.ts:593`) + admins — mas **sem endpoint** (`commission.routes.ts` só GET + POST policies/basis-events).
  (d) **`CommissionCalculation`** (schema:2270): `payee_id`/`eligible_user_id` **→ FK `User`** (não operator_profile!), `amount` Decimal(20,6), `status` default
  `pending` (**sem `settled`**), **sem** settled_at/settlement_ref/link ao extrato. (e) **`OperatorProfile.user_id`** com **`@@unique([tenant_id, user_id])`**
  (schema:1855/1887) → **ponte 1:1 user→operator_profile** (resolve o gap payee(User)→folha(operator_profile)).
  (f) **Rail do extrato PRONTO (PR-07):** `professional-statement.service.ts` `createForSource(actor,{operatorProfileId, entryType, direction, sourceType,
  sourceId, amount, installmentTotal, firstDueDate, description})` — INTERNO (não aceito no corpo REST), TIPADO por allowlist, **idempotente por
  (source_type, source_id)** (pré-check `findActiveBySource` + índice parcial DURO da `20260823000000`), split em parcelas no serviço; `removeForSource`
  respeita RN-EXT-01 (settled→409). **`remuneration` já está nas 3 allowlists** (`professional-statement.types.ts:7,10`: ENTRY_TYPES + SOURCE_TYPES;
  DIRECTIONS tem `credit`) → **ZERO migração de enum no extrato**. (g) **CSV util existe:** `AuditTenantPage.tsx` tem `csvCell` + `exportAuditCsv` (Blob
  **BOM UTF-8**, delimitador `;`, `\r\n`) — **sem exceljs no repo**. (h) **Front vivo:** `RemuneracoesPage` (resumo por operador, escopos `commissions:read`/
  `read_own`), `commissions.adapter.ts`/`.service.ts` (calculations endpoint, `describeCommissionOrigin`, `formatBRL`), `CommissionDetailDrawer` (drill por OS).
  (i) Baseline: backend **1440** (pós-PR-09), frontend_smoke **769**, blocks **80**.
- **HIPÓTESE:** rótulos exatos do modal de filtro AutEM (áudio ruidoso: "KM, empresa, nº documento, filial" — ANALISE:234/297); o "painel de conferência"
  (valor da saída/KM/etapas/repassado — ANALISE:246) e o totalizador de **KM rodados** (ANALISE:241) — dado por-serviço/telemetria não modelado por linha.
  Pixel do grid/engrenagem/modal AutEM não visto em frame limpo → reproduzimos o **comportamento** (§11), não o visual.

- **Fonte real do valor — D-Ω4C-REM-VALUE-SOURCE (CRÍTICO; realiza D-Ω4C-RECON-01):** o valor de uma linha = **`CommissionCalculation.amount`** (a linha de
  comissão já existente), **NUNCA a tarifa de venda** (`tariffs`/price-tables é preço de VENDA por serviceCatalogId/customerId — NÃO acoplar, D-Ω4C-RECON-01).
  **O COMPUTE por regra do profissional + os overrides da engrenagem (`Comissão % | Valor fixo | Não remunerar | Remuneração padrão`, ANALISE:244) NÃO EXISTEM**
  (sem writer de calculation, sem rate per-profissional, sem compute path) → **PARADA HONESTA: PR-10 NÃO computa e NÃO fabrica percentual** (§11 / mandato). PR-10
  entrega a **conferência + a liquidação em lote sobre as linhas existentes**; o motor de compute é **deferido a fatia consumidora** (Ω5/PR-10b, disciplina
  fundação→consumidor de PR-08b) — **D-Ω4C-REM-COMPUTE-DEFER**. Consequência honesta: tenant sem linhas → grid **vazio real** (estado §7), nunca linha fabricada (D-007).
- **Liquidação → extrato — D-Ω4C-REM-SETTLE-RAIL (reusa o rail PR-07, NÃO recria):** **`POST /commissions/settlements`** (perm `commissions:settle`), body
  `{ calculationIds: string[], settlementDate?: ISO-date (default hoje), description? }`. Para cada calculation (dentro de UMA `withTenantRls` tx atômica):
  (1) carrega tenant-scoped (**404 cross-tenant**); já liquidada (`settled_at != null`) → **skip idempotente** (`already_settled`); amount ≤ 0 → skip
  (`skipped_zero`, não cria crédito vazio); (2) **mapeia payee (User) → operator_profile** (ver -PAYEE-MAP); (3) chama `createForSource(actor,{ operatorProfileId,
  entryType:remuneration, direction:credit, sourceType:remuneration, sourceId: calculationId, amount: Number(calc.amount) [20,6→12,2 no seam], installmentTotal:1,
  firstDueDate: settlementDate, description })` — **service→service** (NÃO exige `professional_statements:create` do ator — mandato §6, idêntico a Multa PR-07/Dano
  PR-09), **idempotente por (remuneration, calculationId)**; (4) marca `settled_at = now`, `settlement_ref = group_id`. **Invariante REM-03 (liquidar 2× não
  duplica o crédito):** garantida pela **source-idempotency do extrato** (índice parcial `20260823000000` → P2002→no-op) **+** o guard `settled_at`. Retorna sumário
  por linha `{ calculationId, statementGroupId, outcome: settled|already_settled|skipped_zero }`.
- **Mapeamento payee→profissional — D-Ω4C-REM-PAYEE-MAP:** `payee_id` é **User**; o extrato é por **operator_profile**. Resolve via **`OperatorProfileService.findByUserId(tenantId, payee_id)`**
  (aditivo, tenant-scoped, 1:1 pelo `@@unique([tenant_id,user_id])` — método de leitura novo, clona `get()`). Payee **sem** operator_profile (usuário que não é
  profissional de campo) → **422 `payee_not_a_professional`** (não credita folha inexistente — honesto, sem fabricar perfil). Dupla-camada: resolver tenant-scoped **+**
  FK composta RESTRICT do extrato (23503) como backstop.
- **Marcador de liquidação — D-Ω4C-REM-MODEL (migração ADITIVA up-only `20260830000000_add_commission_settlement`, latest+1):** em `commission_calculations`, **2
  colunas nullable, aditivo puro (nenhum ALTER/DROP):** (1) **`settled_at`** Timestamptz? (o marcador — **bolinha VERDE = settled_at IS NOT NULL** / VERMELHA = null,
  ANALISE:237/248); (2) **`settlement_ref`** Uuid? (= o `group_id` do lançamento no extrato; NULL no tenant, **sem FK nativa** — app-level, como `source_id`; habilita
  deep-link "Ver no extrato"). **+ índice `[tenant_id, settled_at]`** (grid filtra liquidado/não-liquidado). O `status` legado **intocado** (settled_at ortogonal — NÃO
  se adiciona `settled` ao enum). **NÃO há dinheiro nas colunas novas** (o valor do crédito vive **só no extrato** — lição PR-09 "não duplicar money"; são estado+link).
  `amount` 20,6 legado **intocado** (coexistência D-007; crédito no extrato é 12,2). RLS herdada. **Rollback = DROP COLUMN** (novas, sem dependente) — provado
  up/down/re-up pelo **agente-dba-guardião**. Toca `prisma/**` (schema + migration; **seed/catalog INTOCADOS**) → **requer autorização explícita de `prisma/**` no
  comando do PR-10** (como PR-01/03/04/05/06/07/08/09). **Sem dep nova, sem serviço externo pago → junta normal, NÃO junta-5.**
- **Não-amplificador — D-Ω4C-REM-SETTLE-RAIL (seam constrangido, padrão PR-07/09):** `entry_type/direction/source_type` **TIPADOS e FIXADOS pelo serviço de settle**
  (remuneration/credit/remuneration — `createForSource` **re-valida por allowlist**); `amount` **travado a `calculation.amount`** (valor REAL, nunca do corpo);
  **single-profissional**; `installmentTotal=1`; **zero fan-out**. Ator com `commissions:settle` **sem** `professional_statements:create` grava **só** o crédito
  constrangido. **Zero notificação criada** → a lição PR-06/07 (visibility private hardcoded) **não se aplica** (sem superfície de escalada).
- **CSV (não xlsx) — D-Ω4C-REM-CSV:** o "export Excel" do AutEM é **CSV** (recon). **PROMOVER** `csvCell`+`exportAuditCsv` a util compartilhado **`frontend/src/lib/csv.ts`**
  (`csvCell` + `exportCsv(filename, header, rows)`, Blob **BOM UTF-8**, `;`, `\r\n`) e **refatorar `AuditTenantPage.tsx` para importá-lo** (zero mudança de comportamento).
  Remunerações exporta **só o grid REAL carregado** (D-007). **PROIBIDO `exceljs`/dependência nova** (§C7.1 + mandato).
- **Filtro-modal-ao-entrar — D-Ω4C-REM-MODAL (realiza D-Ω4C-MODAL-PESQUISA; SÓ em Remunerações):** ao entrar, abre **modal de filtro** `Período (De/Até)* | Profissional*`
  (mínimo período + profissional → carrega os serviços do profissional no período; ANALISE:234). **APENAS nesta tela** (as demais mantêm o filtro padrão do ERP —
  fidelidade de comportamento ≠ copiar fricção). O select "Profissional" lista **operator_profiles** (adapter de operator-profiles, como Multas/Danos) e a query usa o
  **`user_id`** do profissional como `payee_id` (alinha filtro↔alvo do settle). §3 PT-BR "Profissional" (nunca "Operador/Usuário/Tenant").
- **Permissão — D-Ω4C-REM-RBAC-REUSE (SEM permissão nova; diff VAZIO em catalog/core-saas/RBAC_MATRIX):** settle → **`commissions:settle`** (finance + admins,
  `catalog.ts:593`); grid → **`commissions:read`**; escopo próprio → **`commissions:read_own`** (preserva o adaptativo do RemuneracoesPage). `catalog.ts`/
  `tests/core-saas.test.ts`/`RBAC_MATRIX.md` **INTOCADOS**. Backend é a autoridade (ator sem `commissions:settle` → **403 real**).
- **Backend (ESTENDER `src/modules/commissions/`):** `.types.ts` (+`settledAt`/`settlementRef`; `SettleCalculationsInput`; `SettlementLineResult`) · `.validators.ts`
  (+`parseCalculationIds` [array uuid não-vazio], `parseSettlementDate`) · `.service.ts` (+`settleCalculations(actor, body)`; **seam de colaboradores** via factory —
  `ProfessionalStatementCreditPoster` [= `createForSource`] + `OperatorProfileByUserResolver` [= `findByUserId`], wired em `createDefaultCommissionService`, **direção
  commissions→professional-statements/operator-profiles = forward, sem ciclo**) · `.repository.ts` + `-prisma.repository.ts` (+`findCalculationsByIds`, `markSettled`;
  mapeia settled_at/settlement_ref; InMemory espelha) · `.controller.ts` (+handler settle + auditoria `commission.settled`) · `.routes.ts` (+`POST /commissions/settlements`
  `requirePermission(settle)`) · `.dto.ts` (+`settledAt`/`settlementRef` §2.8). **Sem nova rota em `src/app.ts`** (router já montado — evita gotcha route_not_found).
  **+ `operator-profiles`: método aditivo `findByUserId`.**
- **Frontend (ESTENDER):** `frontend/src/lib/csv.ts` (NOVO — util CSV-BOM promovido) · `AuditTenantPage.tsx` (importa o util) · `commissions.types.ts` (+settledAt/
  settlementRef, tipos de settle) · `commissions.adapter.ts` (+adapt settledAt, build do body/URL de settle) · `commissions.service.ts` (+`settleCommissions(context,
  {calculationIds, settlementDate})` + fetch das linhas de conferência) · `RemuneracoesPage.tsx` + subcomponentes novos (`RemuneracoesFilterModal` [modal-ao-entrar],
  `ConferenciaRemuneracoesView` [grid: **bolinha** vermelha/verde por `settledAt` | Data | Origem/Serviço (`describeCommissionOrigin`) | Valor do serviço | Valor de
  remuneração aplicado; **checkbox por linha + selecionar todos**; **seletor de colunas visíveis**; **engrenagem "LIQUIDAR" em lote** [seleção → POST settle → bolinhas
  verdes + toast]; **totalizadores** total a pagar + qtd serviços; **badge "lançado no extrato"** + deep-link `/fleet/statement/:operatorProfileId`; **Exportar CSV**],
  `PrintRemuneracoesModal` [`window.print()` client-side, clona PrintFineModal/PrintDamageModal]). Preserva o escopo `read_own`. §3 PT-BR, §7 estados (loading/empty/
  error/**acesso não permitido**/desatualizado), §2.8 DTO allowlist (nunca CNH/tenant_id/payee cru), a11y (checkbox ≥44px, aria nas ações). **KM/painel de conferência/
  "não remunerar"** = deferidos (parada honesta, ver Divergências).
- **DTO/auditoria — §2.8:** DTO da calculation ganha `settledAt`/`settlementRef` (+ nome do profissional só como **label**); **NUNCA** tenant_id/CNH/payee interno cru.
  Auditoria `commission.settled` com metadata allowlist **{ count, operatorProfileId, amount (agregado) }** — não-PII.
- **RNs — REM:** **REM-01** (conferência: linha=calculation; **bolinha** derivada de `settledAt`; filtro período+profissional; totalizadores total a pagar + qtd serviços;
  §7) · **REM-02** (liquidação em lote → N créditos no extrato via `createForSource` remuneration/credit/remuneration; amount=`calc.amount` REAL; installmentTotal=1;
  firstDueDate=settlementDate; tx `withTenantRls` atômica) · **REM-03** (**idempotência — liquidar 2× NÃO duplica o crédito**: source-idempotency + índice parcial
  `20260823000000` + guard `settled_at` → `already_settled`) · **REM-04** (mapeamento payee(User)→operator_profile; sem profile → **422 `payee_not_a_professional`**) ·
  **REM-05** (**não-amplificador** — tipos fixados no seam; amount travado; single-profissional; zero fan-out; ator `commissions:settle` sem `professional_statements:create`
  grava só o crédito) · **REM-06** (**fonte do valor honesta** — amount=commission calculation; **NÃO** tarifa de venda; **compute por regra = PARADA HONESTA**, zero
  percentual fabricado) · **REM-07** (**CSV não xlsx** — util CSV-BOM promovido; sem exceljs; só dado real) · **REM-08** (**filtro-modal-ao-entrar SÓ em Remunerações**) ·
  **REM-09** (§2.8/LGPD — settledAt/settlementRef/amount/status/source; nome só label; nunca CNH/tenant_id; auditoria allowlist) · **REM-10** (multi-tenant 3 tenants
  efêmeros — settle/calculation/extrato tenant-scoped; cross 404; updateMany cross=0; **tenant_id 1º índice**; **TEARDOWN FK-SAFE** — `professionalStatementEntry.deleteMany`
  + `commissionCalculation.deleteMany` **ANTES** de users/operator_profiles [FK RESTRICT], lição CI-catch PR-06) · **REM-11** (RBAC reusada — settle=commissions:settle,
  grid=read, own=read_own; sem-perm→403; diff VAZIO) · **REM-12** (crédito respeita **RN-EXT-01**; reversão da liquidação deferida Ω5 [AutEM só red→green]; correção via
  AJUSTE compensatório; impressão client-side) · **REM-13** (**coexistência** — RemuneracoesPage resumo/read_own + GET de commissions + gate WS-SCALE-COMISSAO **intactos**).
- **Divergências AutEM honestas (D-007):** (i) **COMPUTE por regra do profissional + overrides da engrenagem** (Comissão %/Valor fixo/Não remunerar/Remuneração padrão)
  = **PARADA HONESTA** (sem rule model per-profissional, sem writer de calculation; ligar fabricaria percentual — D-Ω4C-RECON-01) → **deferido a fatia consumidora**
  (D-Ω4C-REM-COMPUTE-DEFER). (ii) **"painel de conferência"** (valor da saída/KM/etapas/repassado, ANALISE:246) e **totalizador de KM rodados** (ANALISE:241) = dado
  por-serviço/telemetria não modelado por linha → parada honesta (grid mostra amount + origem via `CommissionDetailDrawer` existente). (iii) **indicador "não remunerar"**
  por linha (ANALISE:238) = requer override inexistente → parada honesta. (iv) **export "Excel"** = na verdade **CSV** → CSV-BOM, sem exceljs. (v) **impressão** = client-side
  `window.print()` (como Multa/Dano/Manutenção), sem rota/PDF. (vi) **amount Decimal(20,6) legado** vs 12,2 do extrato → arredondado no seam (gêmea das divergências -MONEY
  de PR-05/06/07/08). (vii) pixel do grid/engrenagem/modal AutEM não visto em frame limpo → **comportamento** (§11), não o visual.
- **Bateria de validação (seção 10 — o avaliador roda):** `npx prisma validate` + `prisma migrate diff` (sem drift) + **dba-guardião prova up/down/re-up** de
  `20260830000000_add_commission_settlement` (ADITIVA: 2 ADD COLUMN nullable + 1 índice tenant-first; rollback=DROP COLUMN; backfill provado settled_at=NULL em linha
  legada); backend `npm run check`·`lint`·`test`·`build`; `node --test --import tsx tests/commission-settlement.test.ts` (NOVO — settle→crédito no extrato; **idempotência
  2×→1** [source-idempotency + settled_at]; **payee→operator_profile** [422 sem profile]; **não-amplificador** [ator sem professional_statements:create grava só o crédito];
  amount travado a calc.amount; skip already_settled/zero; **403 sem commissions:settle**; auditoria allowlist) + `tests/rls-tenant-isolation.test.ts` estendido (3 tenants
  efêmeros; settle/calculation/extrato tenant-scoped; cross 404; updateMany cross=0; **teardown FK-safe** professional_statement_entries + commission_calculations antes de
  users/operator_profiles); **ZERO regressão** em `professional-statement-crud`/`fines`/`damages-statement`/commission existentes/`core-saas` (catálogo intocado); frontend
  `npm --prefix frontend run check`·`build`·smoke (filtro-modal-ao-entrar + grid bolinhas + seletor de colunas + selecionar-todos + LIQUIDAR em lote + totalizadores + CSV +
  PrintRemuneracoesModal + deep-link extrato + estados §7 + guard); `git diff --check` + `git status --short` limpo (schema/migration/commissions/operator-profiles/front por
  caminho; seed/catalog/RBAC_MATRIX/core-saas **intocados**). KPI `docs/kpis/omega4c/KPI_PR-10.json` + histórico + snapshot; `Kpis/*` backend +N (commission-settlement),
  frontend_smoke +M, blocks 80→**81**.
- **Riscos + rollback:** (R1) **crédito duplicado** → dupla-guarda (source-idempotency do extrato + `settled_at`), tx atômica. (R2) **fabricar percentual/compute** →
  **evitado** (parada honesta; PR-10 só liquida linhas existentes; zero writer de calculation adicionado). (R3) **payee sem operator_profile** → 422 explícito. (R4) **money
  duplicado** → evitado (settled_at/settlement_ref = estado+link, sem dinheiro; crédito só no extrato). (R5) **teardown do rls por RESTRICT** → mitigado (delete de
  statement_entries + calculations ANTES de users/operator_profiles). (R6) **`prisma/**`** → só ADITIVO (2 ADD COLUMN + 1 índice; **sem** permissão/seed); **rollback = DROP
  COLUMN** + revert do PR. Sem destrutivo (respeita parada §C7.5). **Sem dep nova nem serviço externo pago → junta normal, NÃO junta-5.**

**APROVADO para implementar.** (D-records desta fatia: **D-Ω4C-REM-VALUE-SOURCE · -SETTLE-RAIL · -PAYEE-MAP · -MODEL · -RBAC-REUSE · -CSV · -MODAL · -COMPUTE-DEFER** — a
junta ratifica no veredito; persistir em controle/decisoes.md no PR. Realiza **D-Ω4C-RECON-01** [remuneração ≠ tarifa de venda] e **D-Ω4C-MODAL-PESQUISA** [modal-ao-entrar
só em Remunerações]. **Reusa o rail do extrato do PR-07** (`createForSource` entry_type='remuneration') — **5º agregado a lançar no extrato** (após multa e dano); **reusa o
CSV-BOM** promovido de `AuditTenantPage`; **sem permissão nova** [`commissions:settle` existente]. **Compute por regra do profissional = parada honesta deferida**
[D-Ω4C-REM-COMPUTE-DEFER, Ω5/PR-10b].)

#### PR-10 — Veredito da junta (2026-07-23) — **UNÂNIME 3/3 APROVADO — FECHA FASE 2**
- **agente-dba-guardião** → `APROVADO` (1 BAIXA): migração `20260830000000_add_commission_settlement` provada **UP/DOWN/RE-UP** em DB scratch
  isolada (cadeia de 66 migrações). Puramente aditiva: `ADD COLUMN settled_at TIMESTAMPTZ` + `settlement_ref UUID` (nullables) + índice
  `(tenant_id, settled_at)` tenant-first. **ZERO dinheiro nas colunas novas** (só timestamp + uuid do group do extrato). `amount`
  NUMERIC(20,6)/`status` INTOCADOS. RLS de commission_calculations t/t. Retrocompat (linhas legadas → NULL). BAIXA: EXPLAIN preferiu índice
  pré-existente por a tabela de teste ter 1 linha (o novo índice é válido, usado sob volume).
- **omega4c-avaliador** → `APROVADO`: seção 10 verde (backend 1454 pass / 6 skip — única falha ambiental rls-tenant-isolation DB-gated;
  commission-settlement **14/14**; frontend check/build + smoke **783/783** incl. **audit-events verde após a extração do CSV util**).
  **RN-REM cobertas:** valor = **CommissionCalculation.amount** (NUNCA tarifa de venda; body do settle sem preço); liquidação → crédito no
  extrato via createForSource entry_type='remuneration' credit; **dedupe DUPLA-GUARDA** (settled_at + source-idempotency); payee→
  operator_profile via findByUserId (sem perfil → 422 payee_not_a_professional); **parada honesta do COMPUTE** (nenhum percentual/writer
  fabricado — linhas só via seedCalculationForTests); §2.8 (nunca CNH); grid vazio honesto. **RECONCILIAÇÃO NÃO-ATÔMICA VERIFICADA SEGURA:**
  em retry (createForSource sucede, markSettled falha) o findActiveBySource/source-idempotency IMPEDE duplicar o crédito e o markSettled
  (guard `settled_at IS NULL`) converge para settled — provado por [REM-03] (crédito pré-existente com settled_at nulo → não duplica).
  Rail professional-statement NÃO reescrito; catalog/core-saas/RBAC_MATRIX/seed diff VAZIO; migração aditiva; teardown FK-safe. 2 BAIXA.
- **coordenador-de-acessos** → `APROVADO` (0 condições): efeito commission→extrato **NÃO-AMPLIFICADOR** — `creditAmount = roundToCents(calc.amount)`
  (**de calc.amount, NUNCA da tarifa de venda** — D-Ω4C-RECON-01); entry_type/direction/source_type travados no seam; single-profissional;
  zero fan-out; createForSource re-valida por allowlist (rejeita manual). Ator `commissions:settle` sem `professional_statements:create`
  grava só o crédito constrangido. Payee→operator_profile tenant-scoped (422/404). `createForSource` INTERNO intocado (POST /professional-
  statements segue AJUSTE gated). catalog/matriz diff VAZIO (`commissions:settle` já existia). Zero notificação (grep vazio). Front gated
  (`can("commissions:settle")`); §2.8 nunca CNH (DTO/types/print/auditoria allowlist).
- **Decisão:** verde unânime 3/3 → merge (CI = gate empírico do rls DB-gated) + KPI no PR (§C3). **5º agregado a lançar no extrato** (após
  multa e dano) via o rail PR-07. **Compute por regra do profissional = parada honesta** (D-Ω4C-REM-COMPUTE-DEFER → Ω5/PR-10b). CSV-BOM
  promovido a util compartilhado (AuditTenantPage refatorado behavior-preserving). D-records ratificados; realiza D-Ω4C-RECON-01 + -MODAL-PESQUISA.
- KPI: `docs/kpis/omega4c/KPI_PR-10.json`. `Kpis/*`: backend 1440→**1454** (+14 commission-settlement); frontend_smoke 769→**783**
  (+14 remuneracoes-liquidar); blocks 80→**81**. **★ FECHA a FASE 2** (Estoque custódia · Danos · Remunerações). Próximo: Fase 3 (Telemetria + Auditoria/Sessões) + PR-08b.

### PR-11 — Auditoria global + Sessões com revogação (Acessos · Logs · Sessões) — plano do omega4c-planejador (2026-07-23)

**Mapeia a parte WEB-ONLY de PR-19 do PLANO_OMEGA4C** (Controle > Usuários: Acessos/Logs/Sessões). **ABRE A FASE 3.**
A Telemetria mobile + Rastreamento/mapa (PR-16..PR-18 do PLANO) vêm depois — **fora desta fatia**. **Veredito antecipado: ESTENDER, não criar.**

**Objetivo.** Entregar as 3 telas de Controle > Usuários do AutEM (ANALISE §9.1/9.2/9.3) sobre a infra REAL já existente:
(a) **Acessos** — último login por usuário; (b) **Logs globais** — trilha de auditoria tenant-wide com filtros; (c) **Sessões ativas + revogação REAL**
(encerrar sessão de um usuário = invalidar o refresh token → força novo login). Ator/papel: `auditor`/`tenant_admin` leem; **só `tenant_admin`/`super_admin` revogam**.

#### RECON — FATO vs HIPÓTESE (a espinha da fatia; muda o veredito do PROMPT §6.13)
- **FATO — infra de sessão/refresh token EXISTE e a revogação FUNCIONA DE VERDADE.** Tabela `auth_sessions` (migração `20260609000000_add_auth_sessions`): `refresh_token_hash` (unique, HMAC-SHA256), `revoked_at`, `expires_at`, `user_agent`, `ip_address`, `created_at`, RLS `ENABLE/FORCE` + policy tenant-isolation, índices tenant-first `(tenant_id)`, `(tenant_id,user_id)`, `(tenant_id,revoked_at)`. **`AuthSessionService.refreshSession()` CHECA `session.revoked_at` e retorna `{ok:false, reason:"revoked"}`** (`src/modules/auth/services/auth-session.service.ts:137`) → **marcar `revoked_at` REALMENTE mata a sessão no próximo refresh.** `logout()` já revoga por `id+refresh_token_hash`. ∴ **NÃO é parada honesta: a revogação é real** — o único gap é um método de revogação **administrativa** (sem o token da vítima).
- **FATO — auditoria global EXISTE.** Tabela `audit_logs` (model `AuditLog`), escrita real por ~45 controllers via `recordRequestAuditBestEffort` + fluxos de auth (`auth.login.success/failed`, `auth.session.created/revoked`, `auth.refresh.*`). `EnterpriseAuditLogService` **já redige** chave sensível (`sensitiveKeyPattern`: authorization/access_token/refresh_token/password/secret/api_key/token_hash → `[REDACTED]`). **`GET /api/v1/audit-events`** (`audit.routes.ts`, `requirePermission("audit.read")`) **já devolve a lista tenant-wide** via `getAuditEventsForTenant`→`listByTenant` (order `created_at DESC`). Frontend **`AuditTenantPage`** já consome (estados §7 honestos, CSV via `frontend/src/lib/csv.ts` do PR-10, view sem `tenant_id`).
- **FATO — login = criação de sessão.** Cada login web cria uma `auth_sessions` (com `created_at`, `ip_address`, `user_agent`) e um evento `auth.login.success`. ⇒ **"Acessos"/"último acesso" é derivável de `auth_sessions.created_at` — sem tabela nova.**
- **GAP real (o que esta fatia entrega):** (a) **Logs globais** — endpoint sem **filtros server-side** (ator/ação/período) nem **paginação**; (b) **Acessos** — sem view de último login por usuário; (c) **Sessões** — sem endpoint admin de **listar ativas** nem **revogar por id sem o token da vítima** (`revokeById` atual exige `refresh_token_hash`, que só o dono tem).

#### D-records novos (registrar em controle/decisoes.md no PR)
- **D-Ω4C-SESS-REVOKE-REAL** — revogação é REAL (não fabricada): `refreshSession()` já barra `revoked_at`. Admin revoke via **novo método aditivo** `revokeByIdForTenant(sessionId, tenantId)` (set `revoked_at=now` WHERE `id=? AND tenant_id=? AND revoked_at IS NULL`, **sem** exigir o token da vítima). **Caveat honesto (declarado, NÃO parada):** o access token é JWT stateless com TTL `JWT_EXPIRES_IN=15m` (default `env.ts`) — permanece válido até expirar; o **refresh** é bloqueado imediatamente → re-login forçado em ≤15 min. A UI comunica isso ("a sessão será encerrada no próximo ciclo, em até 15 min") — **não** prometemos "logout instantâneo" que o desenho stateless não entrega. Fidelidade comportamental honesta ao "derruba a sessão" do AutEM sob JWT.
- **D-Ω4C-SESS-NOMIG** — **ZERO migração.** `auth_sessions` e `audit_logs` já existem com RLS. A fatia é **puramente aditiva em código** (métodos de repo + serviço + rotas + projeção + telas). **Sem tocar `prisma/**`.** ↳ *Nota condicional:* se o `agente-dba-guardião`/EXPLAIN mostrar varredura do `audit_logs` **sob volume** na listagem global ordenada por `created_at` (índice atual `(tenant_id,entity,entity_id,created_at)`), um índice aditivo `(tenant_id, created_at)` up-only fica **deferido a sub-fatia** (PR-11b) — **não** entra aqui para manter a fatia migration-free. Sob dado de teste (poucas linhas) o prefixo `tenant_id` + sort basta.
- **D-Ω4C-SESS-PERM** — **permissões NOVAS** `sessions:read` + `sessions:revoke` (o catálogo não tinha nada de sessão). **`sessions:revoke` = administrativa forte: `tenant_admin` + `super_admin` SOMENTE** (NÃO `auditor`, NÃO `manager`). `sessions:read` = `tenant_admin` + `auditor`. **Logs globais + Acessos REUSAM `audit.read`** (já existe; auditor/tenant_admin/manager/support). **4 pontos:** (1) `catalog.ts` `PERMISSION_CATALOG` (`tenant_admin` herda automático via filtro não-`platform:`; adicionar `sessions:read` a `auditor`; `sessions:revoke` só em `super_admin`/`tenant_admin`); (2) **seed** consome `ROLE_PERMISSIONS` automático (sem edição extra); (3) `tests/core-saas.test.ts` (asserção de catálogo + atribuição por papel); (4) `RBAC_MATRIX.md` (linhas "Sessões de usuário" + "Revogação de sessão"). **Toca `catalog.ts` → requer autorização explícita no comando do PR-11.**
- **D-Ω4C-AUD-FILTERS** — `GET /api/v1/audit-events` ganha **filtros server-side** (`action`, `actorId`, `from`, `to`) + **paginação** (`limit`≤200 default 50, `offset` ou cursor `created_at`). Reusa `audit_logs`/`listByTenant` estendido — **sem novo store, sem novo model.** 422 para filtro malformado; RLS + tenant do ator (404 cross-tenant).
- **D-Ω4C-AUD-ALLOWLIST-2.8** — projeção externa de Logs/Sessões/Acessos por **allowlist estrita** (abaixo). **Nunca** `ip_address` cru, `refresh_token_hash`, `tenant_id`, token, CNH ou corpo de payload.
- **D-Ω4C-ACESSO-SOURCE** — **Acessos derivado de `auth_sessions.created_at`** (último login por usuário = `MAX(created_at)` group by `user_id`; opcional lista de logins recentes). **A tabela `UserAccessLog` sugerida no PROMPT §6.13 NÃO é criada** — `auth_sessions` já é o histórico de login. Reusa `audit.read`.

#### Divergência com o PROMPT_EXECUCAO §6.13 (correção recon-driven — registrar)
O PROMPT §6.13 previa **criar** 3 tabelas (`UserAccessLog`, `UserSession`, `AuditLog`) e "estender o mecanismo p/ middleware global". **A RECON prova que as três já existem** (`audit_logs` + `auth_sessions`, com RLS e escrita viva) e que o middleware global de auditoria **já roda** (`recordRequestAuditBestEffort` em ~45 controllers). ∴ **premissa do PROMPT (criar) → realidade (reusar); zero migração; a fatia é telas + filtros + admin-revoke.** Realiza **D-Ω4C-SESS-NOMIG/-ACESSO-SOURCE** e NÃO reabre o desenho de auditoria do Ω3F. Também é onde D-007 (nada fabricado) manda: sem eventos/sessões reais → estado honesto §7, nunca linha inventada.

#### Contrato (backend)
- **Logs globais:** `GET /api/v1/audit-events?action=&actorId=&from=&to=&limit=&offset=` — `audit.read`. 200 `{data:[AuditEventView], nextOffset?}`. 422 filtro inválido. RLS + tenant do ator (nunca `X-Tenant-Id` de fora). Cross-tenant → lista vazia/404 honesto.
- **Acessos:** `GET /api/v1/sessions/access-history?userId=&from=&to=` — `audit.read` (ou `sessions:read`). 200 `{data:[{userLabel, lastAccessAt}]}` derivado de `auth_sessions`.
- **Sessões ativas:** `GET /api/v1/sessions?userId=` — `sessions:read`. 200 `{data:[SessionView]}` (WHERE `revoked_at IS NULL AND expires_at>now`, tenant-scoped).
- **Revogar:** `POST /api/v1/sessions/:id/revoke` — `sessions:revoke`. 200 idempotente (`{revoked:true}`); id inexistente/já-revogado/**de outro tenant** → **404** (RLS + `updateMany` count=0 nunca vaza existência cross-tenant). Escreve auditoria `auth.session.revoked` (ator=admin, alvo=user/session). **Sem 409** (revogar 2× é estado terminal idempotente, não conflito).

#### §2.8 — allowlists de projeção (LGPD, crítico desta fatia)
- **AuditEventView (Logs):** `{ id, when(dd/mm HH:mm America/Sao_Paulo), whenIso, actorLabel(email ou "sistema"), action(rótulo PT-BR), entity, entityId, outcome, severity }`. **Proibido:** `tenant_id`, `ip_address` cru, `refresh_token_hash`, token, `user_agent` cru, CNH, corpo. (O `AuditEventView` do front já não carrega `tenant_id` — manter.)
- **SessionView (Sessões):** `{ id, userLabel(email/nome), loginAt(created_at), lastActivityAt(updated_at), deviceLabel(rótulo grosseiro do user_agent — ex. "Chrome · Windows", nunca UA cru), status }`. **Proibido:** `refresh_token_hash`, `ip_address` cru, `tenant_id`, `user_id` externo.
- **AccessView (Acessos):** `{ userLabel, lastAccessAt, when }`. **Proibido:** ip cru, tenant_id.

#### Modelagem
**Nenhuma** (D-Ω4C-SESS-NOMIG). Só métodos de repositório aditivos: `AuthSessionRepository.listActiveByTenant(tenantId,{userId?})` + `revokeByIdForTenant(sessionId,tenantId)`; `AuditLogRepository.listByTenant` estendido com filtros/paginação. Money/km: N/A. Enums: reuso `outcome/severity` existentes (inglês interno + rótulo PT-BR na UI).

#### Arquivos exatos
- **Backend (ESTENDER):** `src/modules/auth/repositories/auth-session.repository.ts` (+`listActiveByTenant`,+`revokeByIdForTenant`) · **NOVO** `src/modules/auth/services/session-admin.service.ts` (listActive/adminRevoke/accessHistory + projeção §2.8 + auditoria da revogação) · **NOVO** `src/modules/auth/routes/session-admin.routes.ts` (GET /sessions · POST /sessions/:id/revoke · GET /sessions/access-history) · `src/app.ts` (**montar o router — incluir `src/app.ts` no `git add`**, senão CI 404 route_not_found [lição de memória]) · `src/modules/core-saas/routes/audit.routes.ts` + `services/*core-saas*.ts`/interface + `repositories/audit-log.repository.ts` (filtros+paginação) · `src/modules/core-saas/permissions/catalog.ts` (+`sessions:read`/`sessions:revoke` + ROLE_PERMISSIONS) · projeção/DTO §2.8.
- **Frontend (NOVO/ESTENDER):** `frontend/src/modules/audit/pages/AuditTenantPage.tsx` (+ barra de filtros ator/ação/período; reusa CSV) · **NOVO** telas Acessos + Sessões sob **Usuários** (`frontend/src/modules/users/…` ou `administration`) com `TablePage`+filtros+CSV (reusa `frontend/src/lib/csv.ts`) + **botão "Revogar" gated por `can("sessions:revoke")`** (backend é a autoridade) · rotas `/controle/usuarios/{acessos,logs,sessoes}` + `navigation.registry` (gating por `audit:read`/`sessions:read`). §3 PT-BR ("Sessões","Acessos","Auditoria","Revogar","Encerrar sessão" — nunca "session/token/tenant"), §7 estados, §2.8.
- **Docs:** `RBAC_MATRIX.md` (linhas Sessões/Revogação) · `controle/decisoes.md` (D-records).

#### RNs e critérios de aceite
- **RN-AUD-01** — Logs = leitura tenant-scoped de `audit_logs`; filtros ator/ação/período; paginação; RLS + tenant do ator (404 cross-tenant).
- **RN-AUD-02 (§2.8)** — projeção só pela allowlist; **teste prova** ausência de `ip_address`/`refresh_token_hash`/`tenant_id`/token no corpo.
- **RN-AUD-03 (D-007)** — CSV exporta **só** linhas reais carregadas (util compartilhado); vazio → estado honesto §7, export desabilitado.
- **RN-ACC-01** — Acessos = último login por usuário derivado de `auth_sessions.created_at`; busca período/usuário; **sem tabela nova**.
- **RN-SESS-01** — Sessões ativas = `revoked_at IS NULL AND expires_at>now`, tenant-scoped.
- **RN-SESS-02** — revogação admin marca `revoked_at` (sem token da vítima); **idempotente** (2× → sem erro); **revogada → `refreshSession` retorna `revoked`** (teste prova o efeito real).
- **RN-SESS-03 (isolamento)** — revogar/listar cross-tenant impossível: RLS + `tenant_id` no `where`; sessão de outro tenant → **404**, `updateMany` count=0 (3 tenants efêmeros no teste RLS).
- **RN-SESS-04 (honestidade)** — access token (15m) segue válido até expirar; refresh bloqueado imediato → re-login. UI comunica a janela; **não fabrica logout instantâneo**.
- **RN-SESS-05 (segregação)** — `auditor` tem `sessions:read` mas **NÃO** `sessions:revoke` (403); só `tenant_admin`/`super_admin` revogam. A própria revogação é auditada (`auth.session.revoked`, ator=admin).

#### Fronteira de escopo
- **Permitido:** os arquivos acima; permissões novas no `catalog.ts` (requer autorização de `catalog.ts` no comando); RBAC_MATRIX.
- **Proibido:** `prisma/**` (ZERO migração — D-Ω4C-SESS-NOMIG; o índice `(tenant_id,created_at)` é PR-11b **se** o dba exigir); telemetria mobile/heartbeat/GPS/rastreamento/mapa (PR-16..18); reescrever o desenho de auditoria do Ω3F; `logout`/`refreshSession`/`createSession` (só **adicionar** métodos, não reescrever o fluxo do dono da sessão).
- **Sem dependência nova, sem serviço externo pago, sem migração destrutiva, sem deploy de prod → junta NORMAL (≥3), NÃO junta-5.** Como toca sessão/token, **`agente-secops` é OBRIGATÓRIO na junta** (revisa allowlist §2.8, isolamento cross-tenant da revogação, segregação auditor×admin, janela do access token).

#### Riscos + rollback
- **Revogação cross-tenant** → RLS + `tenant_id` no where + 404; teste 3 tenants. **Vazamento token/IP** → allowlist projection + `sensitiveKeyPattern` já redige; IP **omitido** da view (não mascarado). **"Revogação que não invalida"** → mitigado por desenho: `refreshSession` já checa `revoked_at` (teste prova); janela de 15 min do access token declarada, não escondida. **Auditor escalando p/ revogar** → `sessions:revoke` fora do papel auditor (403 no backend). **Admin se auto-derruba** → permitido, UI avisa; não bloqueante. **Scan do audit_logs sob volume** → índice aditivo deferido a PR-11b (condicional dba/EXPLAIN). **Rollback:** rotas/serviço/telas são aditivos → reverter o PR remove tudo sem tocar dado; nenhuma migração para desfazer.

#### Bateria (seção 10 — o avaliador roda)
`npx prisma validate` (prova **zero drift** — nenhuma migração nova) · backend `npm run check`·`lint`·`test`·`build` · **NOVO** `node --test --import tsx tests/sessions-admin.test.ts` (listar ativas; admin revoke → **refresh subsequente bloqueado** [efeito real]; idempotência; cross-tenant 404; `auditor` sem revoke=403; auditoria da revogação; §2.8 sem token/ip/tenant no corpo) · **NOVO** `tests/audit-events-filters.test.ts` (filtros action/actor/período + paginação + §2.8) · `tests/rls-tenant-isolation.test.ts` estendido (3 tenants efêmeros: revoke cross count=0, list cross vazio; **teardown FK-safe** `auth_sessions` antes de `users`/`tenants`) · `tests/core-saas.test.ts` (novas permissões no catálogo + atribuição por papel) · **zero regressão** em auth refresh/logout/login + audit-events + navigation-provisioning · frontend `check`·`build`·smoke (3 telas + filtros + Revogar gated + CSV real + estados §7) · `git diff --check` + `git status --short` limpo. **KPI:** `docs/kpis/omega4c/KPI_PR-11.json` + histórico + snapshot; `Kpis/*` backend **1454→+N** (sessions-admin + audit-filters), frontend_smoke **783→+M** (acessos/logs-filtros/sessoes), blocks **81→82**. **Backfill** `merge_commit`/`approved_head` pós-merge.

**APROVADO para implementar** — íntegro: infra de sessão/refresh e auditoria **existem e a revogação funciona de verdade** (não é parada honesta); **zero migração**; permissões novas com os 4 pontos declarados; §2.8 com allowlist; divergência do PROMPT §6.13 corrigida por recon. Próximo = **dev correspondente** (backend → frontend) sob junta normal **com `agente-secops` obrigatório**.

#### PR-11 — Veredito da junta (2026-07-23) — **UNÂNIME 3/3 APROVADO — ABRE FASE 3 (web)**
- **omega4c-avaliador** → `APROVADO`: seção 10 verde (backend 1462 pass / 6 skip — única falha ambiental rls-tenant-isolation DB-gated;
  **sessions-admin 5/5** [teste 5 rodou AO VIVO contra Postgres: revogação carimba revoked_at → refreshSession bloqueia, cross-tenant
  404, 3 tenants A/B/C, idempotência], **audit-events-filters 3/3**, core-saas 26/26; frontend check/build + smoke **801/801**). RN-SESS
  cobertas: **revogação invalida DE VERDADE** (não cosmética), isolamento por tenant, §2.8 (SessionView só allowlist — nunca
  refresh_token_hash/ip/tenant_id/user_id), auditoria filtros server-side + paginação, **caveat honesto do JWT 15m** (não promete
  instantâneo). **ZERO migração.** Fix do orquestrador `clearAuditEvents` (o dev-backend foi cortado por limite de sessão no ajuste do
  ruído de auditoria) confirmado SÃO — só no InMemory store, sem caminho de produção. 2 BAIXA (AuditEventView mantém tenant_id do PRÓPRIO
  ator — contrato estável PR-SCALE-3, dentro da §2.8; higiene de staging).
- **coordenador-de-acessos** → `APROVADO` (0 condições): **SEGREGAÇÃO DE FUNÇÕES ÍNTEGRA** — `sessions:read` → super/platform/tenant_admin +
  **auditor**; `sessions:revoke` → **SÓ super/platform/tenant_admin** (auditor LÊ mas NÃO revoga; nenhum papel operacional/campo tem
  qualquer das duas). Catálogo↔`expectedPermissionCatalog`↔seed↔RBAC_MATRIX coerentes (core-saas 26/26; sessions:read/revoke após
  notifications:create). Rotas gated (GET /sessions→read; POST /sessions/:id/revoke→revoke; audit-events→audit.read); backend autoridade
  (403 real). Front `can("sessions:revoke")` (auditor vê a lista, não o botão). §2.8 sem token/CNH.
- **agente-secops** → `APROVADO` (1 BAIXA): **revogação REAL** (revokeByIdForTenant marca revoked_at → refreshSession retorna revoked →
  próximo refresh da vítima FALHA); **tenant-scoped** (findByIdForTenant/revokeByIdForTenant filtram tenant_id dentro de withTenantRls →
  cross-tenant 404, sem vazar existência); **gate backend forte** (sessions:revoke só admin); **ZERO vazamento** (SessionView/AccessView/
  AuditEventView projeções estritas de allowlist — refresh_token_hash/ip cru/user_agent cru/token nunca saem; auditoria da revogação só
  {targetUserId interno, administrative:true}); **nenhum gate de produção afrouxado** (env/CORS/TLS/JWT-config intocados); **nenhum segredo
  versionado**; `clearAuditEvents` test-only inócuo. Caveat JWT 15m comunicado honestamente (SESSION_REVOKE_CAVEAT). Nota: audit-events
  agora STRIPA metadata (aperto, não afrouxamento).
- **Decisão:** verde unânime 3/3 → merge (CI = gate empírico) + KPI no PR (§C3). **Sem migração** (auth_sessions/audit_logs existentes).
  Revogação administrativa de sessão funciona de verdade (2 revisores de segurança independentes confirmaram). D-records ratificados +
  **D-Ω4C-AUD-TENANT-ID** (AuditEventView expõe tenant_id do próprio ator — contrato estável, dentro da §2.8). **ABRE a FASE 3** (parte
  web-only de Auditoria/Sessões; Telemetria mobile/mapa vem depois).
- KPI: `docs/kpis/omega4c/KPI_PR-11.json`. `Kpis/*`: backend 1454→**1462** (+8: sessions-admin 5 + audit-events-filters 3); frontend_smoke
  783→**801** (+18 auditoria-sessoes); blocks 81→**82**.

### PR-12 — Telemetria (BACKEND: ingestão heartbeat/eventos + agregado diário de km + recusas + registro de dispositivo) — plano do omega4c-planejador (2026-07-24)

**Mapeia a parte BACKEND de PR-16 do PLANO_OMEGA4C** (Telemetria — acessos, heartbeat, agregado diário de km, recusas, registro de dispositivo/sessão do app). **Só backend** — Flutter (PR-17) e telas web/mapa (PR-18) vêm em fatias seguintes. **Veredito: CRIAR** (a única linha, junto do Extrato, que a Fase 0 confirmou genuinamente nova — FASE0_RECON §2 linha 12, "não coberto pelo recon"). Realiza **D-Ω4C-TELEMETRIA** (PLANO §2.6 / §34) e **D-Ω4C-RECON-06** (janela de rastreamento).

**Objetivo.** Backend de telemetria fiel ao AutEM Controle>Mobile: (a) **ingestão em lote autenticada** do app (`POST /mobile/telemetry`) de heartbeats GPS + eventos `APP_CONNECT/APP_DISCONNECT/SERVICE_REFUSAL`, **gated por consentimento LGPD**; (b) **agregado diário de km** por profissional via **haversine** com filtro de precisão, **derivado on-read** (nunca fabricado); (c) endpoints de leitura para **Acessos · Quilometragem · Rastreamento · Recusas · Dispositivos** (o console web os consome em PR-18). Ator: o **próprio profissional consentido** ingere; **admin/dispatcher/auditor** leem.

#### RECON — FATO vs HIPÓTESE (a espinha da fatia)
- **FATO — o consentimento LGPD JÁ EXISTE → NÃO é parada crítica.** `OperatorProfile.tracking_consent` (Boolean default false) + `tracking_consent_at` (`schema.prisma:1860-1861`), documentado como "dado sensível LGPD" (`:1849`). **Há base legal para gatilho de consentimento** — o design é honesto sem parada. `OperatorProfileService.findByUserId(tenantId, userId)` (`operator-profile.service.ts:76`) dá o caminho **trivial** de resolver o ator autenticado → perfil → `trackingConsent`. `tracking_consent` **nunca** vai à auditoria (`operator-profile.types.ts:10-13`, FASE0 §3.6).
- **FATO — `field_operator_locations` EXISTE mas é do Ω3F/mapa, não da telemetria.** Model + RLS ENABLE/FORCE + policy, FK composta `(tenant_id, operator_user_id)→users` CASCADE, índices `(tenant_id, operator_user_id, recorded_at)` e `(tenant_id, recorded_at)` (`migrations/20260615000000`). **lat/lng são NOT NULL** (DOUBLE PRECISION, CHECK ±90/±180). Serviço grava **1 ponto por vez** (`field-location.service.ts:21` recordMobileLocation), **sem** event_type, **sem** consent-gate, **sem** idempotência de lote. É lido pelo **mapa (Ω1)** via listLatest/listHistory (última posição).
- **FATO — infra de lote/idempotência do mobile-sync EXISTE.** `POST /api/v1/mobile/sync/*` com client_action_id_required:true, max_batch_size:50, resposta-sumário `{received, accepted, rejected, conflicts, already_applied}` (`mobile.routes.ts`, `mobile-work-order-sync.ts`). Padrão a **espelhar** (não reescrever).
- **FATO — scheduler in-process existe** (`job.worker.ts:86`, fila+registry+setInterval, sem node-cron). **HIPÓTESE descartada:** telemetria **não** precisa de scheduler (ver decisão km on-read).
- **GAP — não há util haversine no backend** (grep só acha frontend/mapa). É **novo** (matemática hand-rolled, zero dependência).
- **GAP — não existe módulo `telemetry`** (grep confirma: só docs/plano). Skeleton canônico novo (9 arquivos, template `operator-profiles/`, FASE0 §3.3).

#### Decisão-âncora — **NOVO model `TelemetryEvent`, NÃO estender `field_operator_locations`** (D-Ω4C-TELE-MODEL)
Escolhida a opção de **menor acoplamento e zero fabricação**, declarada: **estender** `field_operator_locations` obrigaria (i) tornar lat/lng **nullable** (eventos APP_CONNECT/DISCONNECT/SERVICE_REFUSAL **não têm GPS**) — mudando o contrato de uma coluna NOT NULL que o **mapa Ω1 lê como última posição**; (ii) o listLatest do mapa passaria a precisar **filtrar event_type=heartbeat** para não devolver uma recusa/desconexão sem GPS como posição atual (poluição do consumidor Ω1); (iii) retrofitar consent-gate no caminho de gravação **compartilhado** com o tracking-por-OS do Ω3F (raio de impacto alto). **Um model novo isola o blast-radius**: consent-gate, event_type, client_action_id/idempotência e a chave por **operator_profile_id** (onde vive o consentimento) ficam limpos, sem tocar Ω1/Ω3F. **Coexistência D-007** (mesmo padrão do dinheiro em PR-09): `field_operator_locations` = posição viva do **mapa**; `telemetry_events` = fonte de verdade da **telemetria** (km/acessos/recusas/dispositivos/rastreamento). A eventual unificação do rastreamento do console com o mapa é **concern de PR-18** — **não fabricada agora**.

#### D-records novos (registrar em controle/decisoes.md no PR)
- **D-Ω4C-TELE-MODEL** — 1 model novo `TelemetryEvent` (acima). **Agregados (km diário, dispositivos, acessos) são DERIVADOS on-read** — **nenhuma** tabela TelemetryKmDailyAggregate nem DeviceRegistration em v1 (espelha o **saldo DERIVADO** do inventory `inventory.calculations.ts:48` e o defer de índice do PR-11: materializar é perf, não correção).
- **D-Ω4C-TELE-CONSENT** — GPS só persiste com tracking_consent=true (resolvido por findByUserId), checado **ANTES** de gravar coordenada. Evento GPS sem consentimento → **rejeitado honesto** (reason:tracking_consent_required), **nada de lat/lng gravado**. Eventos **sem GPS** (APP_CONNECT/DISCONNECT/SERVICE_REFUSAL) **prosseguem** (não são rastreamento de localização — acessos/recusas têm base legítima). **NÃO é parada crítica** (base legal existe). Vai à junta com **`agente-secops` OBRIGATÓRIO**.
- **D-Ω4C-TELE-KM-ONREAD** — km diário = Σ haversine dos pontos consecutivos do profissional no dia, **computado on-read**; job/materialização diária **DEFERIDO a PR-16b** (só se `agente-dba-guardião`/EXPLAIN provar custo sob volume). **Sem scheduler** nesta fatia → sem risco de idempotência de disparo, sem node-cron.
- **D-Ω4C-TELE-IDEMP** — idempotência persistente por **UNIQUE (tenant_id, operator_profile_id, client_action_id)** (índice na migration SQL, padrão FASE0 §3.5). Reprocessar lote → already_applied (P2002 capturado, **não** duplica, **não** 409) — semântica de lote do mobile-sync.
- **D-Ω4C-TELE-PERM** — **ingestão REUSA `field_location:send`** (já é envio de localização própria do mobile, já em field_technician, `catalog.ts:125/390`) — o **consent-gate** é o controle real, não uma permissão nova. **Leitura = NOVA `telemetry:read`** (console de 5 telas do AutEM Mobile é superfície distinta de field_location:read). **4 pontos:** (1) `catalog.ts` PERMISSION_CATALOG + ROLE_PERMISSIONS (telemetry:read em tenant_admin [auto, filtro não-platform:], manager, auditor, field_dispatcher; **NÃO** field_technician — envia, não lê o console); (2) **seed** consome ROLE_PERMISSIONS automático; (3) `tests/core-saas.test.ts` (catálogo + atribuição por papel); (4) `RBAC_MATRIX.md` (linha Telemetria — leitura). **Toca `catalog.ts` → requer autorização explícita no comando do PR-12.**
- **D-Ω4C-TELE-2.8** — allowlists de projeção (abaixo); **coordenada crua só no endpoint de Rastreamento**, gated forte; nunca IP, tenant_id, sdk_int cru, client_action_id externo, UA cru.
- **D-Ω4C-TELE-REFUSAL-RECEIVER** — SERVICE_REFUSAL é **só recebido e listado** aqui; o **emissor** é o app/fluxo de OS (PR-17) — backend **não fabrica** recusa (D-007).
- **D-Ω4C-TELE-PRECISION** — filtro de precisão: heartbeat com accuracy_m acima do teto (TELEMETRY_ACCURACY_MAX_M, default 100) é **persistido cru** mas **excluído do km**; segmentos que impliquem velocidade irreal (> TELEMETRY_SPEED_MAX_KMH, default 200 = salto GPS) são descartados do somatório. Threshold **declarado**, não escondido.

#### Modelagem — **1 tabela nova** (migração ADITIVA up-only)
`telemetry_events` (migração `20260830000000_add_telemetry_events`, **latest+1 confirmar no PR**; toca `prisma/**` → **autorização explícita de prisma no comando do PR-12**, como PR-01/03..10):
- id UUID PK gen_random_uuid() · tenant_id UUID NOT NULL · operator_profile_id UUID NOT NULL · event_type TEXT NOT NULL (enum-**app** heartbeat|app_connect|app_disconnect|service_refusal, labels PT-BR na UI; **sem CHECK** de enum — padrão FASE0 §3.5) · captured_at TIMESTAMPTZ(6) NOT NULL · received_at TIMESTAMPTZ(6) NOT NULL DEFAULT now() · lat/lng DOUBLE PRECISION **NULL** (só heartbeat consentido; CHECK ±90/±180 quando não-nulo, espelhando field_operator_locations) · accuracy_m DOUBLE PRECISION NULL (CHECK ≥0) · speed_kmh DOUBLE PRECISION NULL (CHECK ≥0) · battery_pct INT NULL (CHECK 0-100) · signal_type TEXT NULL (enum-app wifi|mobile|none) · app_version TEXT NULL · device_model TEXT NULL · sdk_int INT NULL · client_action_id TEXT NOT NULL · refusal_reason TEXT NULL (só service_refusal) · work_order_id UUID NULL (contexto da recusa, sem FK dura em v1 — classificação, evita acoplamento, como D-Ω4C-RECON-04).
- **Índices/constraints:** @@unique([tenant_id, id]) (habilita FK composta) · **UNIQUE (tenant_id, operator_profile_id, client_action_id)** (idempotência, D-Ω4C-TELE-IDEMP) · índice **(tenant_id, operator_profile_id, captured_at)** (D-Ω4C-RECON-06, volume) · índice (tenant_id, event_type, captured_at) (recusas/acessos). **RLS ENABLE+FORCE+POLICY** tenant-isolation (current_setting app.current_tenant_id). FK (tenant_id)→tenants RESTRICT; FK composta **(tenant_id, operator_profile_id)→operator_profiles(tenant_id, id) ON DELETE CASCADE** (apagar o profissional apaga sua telemetria — direito ao esquecimento LGPD). Toda query via `withTenantRls`. km = **Decimal(10,1)** derivado (formatação on-read, sem coluna).

#### Contrato (backend)
- **Ingestão (lote):** `POST /api/v1/mobile/telemetry` — `field_location:send`, montado em `mobile.routes.ts` (tenantContextMiddleware já ativo). Corpo `{client_batch_id?, events:[{client_action_id, eventType, capturedAt, lat?, lng?, accuracyM?, speedKmh?, batteryPct?, signalType?, appVersion?, deviceModel?, sdkInt?, refusalReason?, workOrderId?}]}` (≤50). 200 sumário `{received, accepted, rejected, already_applied}` + resultado por-evento. **Consent-gate:** evento com GPS e trackingConsent!==true → por-evento rejected `tracking_consent_required` (**GPS não gravado**). Idempotência: client_action_id repetido → already_applied. operator_profile_id **derivado do ator** (findByUserId); ator sem perfil → 422 operator_profile_required. tenant_id do corpo **ignorado**. Cross-tenant impossível (RLS).
- **Quilometragem:** `GET /api/v1/telemetry/km?professionalId=&from=&to=` — `telemetry:read`. 200 `{data:[{professionalLabel, day, kmTotal(1 casa), pointsUsed}]}` — **on-read haversine**; sem pontos → kmTotal:0 honesto.
- **Rastreamento:** `GET /api/v1/telemetry/track?professionalId=&from=&to=` — `telemetry:read`. Janela **período livre default 24h + teto configurável** (D-Ω4C-RECON-06). 200 `{data:[{capturedAt, lat, lng, accuracyM}]}` — **único** endpoint com coordenada crua, gated forte.
- **Recusas:** `GET /api/v1/telemetry/refusals?professionalId=&from=&to=` — `telemetry:read`. 200 `{data:[RefusalView]}` (só service_refusal).
- **Acessos:** `GET /api/v1/telemetry/access?professionalId=&from=&to=` — `telemetry:read`. 200 `{data:[AccessView]}` (app_connect/disconnect).
- **Dispositivos:** `GET /api/v1/telemetry/devices` — `telemetry:read`. 200 `{data:[DeviceView]}` — derivado do último app_connect por profissional.
- Todos: RLS + tenant do ator; profissional de outro tenant → **404**; filtro malformado → **422**.

#### §2.8 — allowlists de projeção (LGPD, crítico desta fatia)
- **TelemetryKmView:** `{professionalLabel, day, kmTotal, pointsUsed}` — **sem** coord crua.
- **TrackView (Rastreamento):** `{capturedAt, lat, lng, accuracyM}` — coord crua **só aqui**, só a quem tem `telemetry:read`, consentida na origem. **Proibido:** tenant_id, operator_profile_id externo, client_action_id, IP, device.
- **RefusalView:** `{id, when(dd/mm HH:mm America/Sao_Paulo), professionalLabel, workOrderRef?, reason}` — **sem** coord/IP/tenant_id.
- **AccessView:** `{professionalLabel, event(conectou/desconectou), when}` — **sem** coord/IP.
- **DeviceView:** `{professionalLabel, deviceLabel(modelo grosseiro), appVersion, lastSeenAt}` — **sem** sdk_int cru, IP, tenant_id (anti-fingerprint).
- **Auditoria:** recordRequestAuditBestEffort da ingestão **nunca** carrega lat/lng, battery, device, tracking_consent, client_action_id, tenant_id (FASE0 §3.6). Nomes via UserNameResolver.

#### Arquivos exatos
- **Backend (NOVO módulo `telemetry`):** `src/modules/telemetry/telemetry.types.ts` (enums TELEMETRY_EVENT_TYPES/SIGNAL_TYPES const-as-const, TelemetryError) · `telemetry.validators.ts` (parse de payload, parseLimit, teto de janela) · `telemetry.dto.ts` (as 5 views §2.8, Date→ISO, ?? null) · `telemetry.repository.ts` (interface + InMemory) · `telemetry-prisma.repository.ts` (PrismaTelemetryRepository(tx) + RlsPrismaTelemetryRepository(prisma) com withTenantRls; P2002→already_applied) · `telemetry.service.ts` (ingestão lote + consent-gate via findByUserId + agregação km on-read; factory memory/prisma por CORE_SAAS_PERSISTENCE) · `telemetry.controller.ts` (thin + audit allowlist) · `telemetry.routes.ts` (requirePermission telemetry:read + handleAsyncRoute) · `index.ts` (barrel).
- **Util NOVO:** `src/modules/telemetry/haversine.ts` (haversineMeters(a,b) puro, zero-dep) + `telemetry.km.ts` (Σ com filtros precisão/velocidade).
- **ESTENDER:** `src/modules/mobile/mobile.routes.ts` (+POST /mobile/telemetry → syncMobileTelemetry) · `src/modules/mobile/mobile-telemetry-sync.ts` (**NOVO**, espelha mobile-work-order-sync.ts) · `src/app.ts` (**montar telemetry.routes — incluir `src/app.ts` no git add**, senão CI 404 route_not_found [memória]) · `src/modules/core-saas/permissions/catalog.ts` (+telemetry:read + ROLE_PERMISSIONS).
- **Docs:** `RBAC_MATRIX.md` (Telemetria) · `controle/decisoes.md` (D-records) · KPI `docs/kpis/omega4c/KPI_PR-12.json`.

#### RNs e critérios de aceite
- **RN-TELE-01 (consentimento — invariante testável)** — heartbeat/GPS com trackingConsent!==true → **NÃO persiste lat/lng**; por-evento rejected `tracking_consent_required`. Eventos sem GPS prosseguem. **Teste prova:** sem consentimento → zero lat/lng no banco para o profissional.
- **RN-TELE-02 (idempotência)** — reprocessar lote (mesmo client_action_id) **não duplica**; 2ª vez → already_applied (UNIQUE (tenant, professional, client_action_id)).
- **RN-TELE-03 (km honesto)** — km_dia = Σ haversine dos pontos consecutivos consentidos, on-read, com filtro precisão/velocidade; **sem pontos → 0** (nunca fabricado — D-007).
- **RN-TELE-04 (isolamento)** — ingestão/leitura cross-tenant impossível: RLS + tenant do ator; profissional de outro tenant → **404**; updateMany/insert cross bloqueado. **3 tenants efêmeros** em `tests/rls-tenant-isolation.test.ts` (teardown FK-safe: telemetry_events **antes** de operator_profiles/users/tenants — lição PR-06/09).
- **RN-TELE-05 (§2.8/LGPD)** — projeções só por allowlist; coord crua **só** em /track; **teste prova** ausência de IP/tenant_id/sdk_int/client_action_id nas outras views e na auditoria.
- **RN-TELE-06 (recusas)** — SERVICE_REFUSAL só recebido/listado; backend não fabrica; emissor = PR-17.
- **RN-TELE-07 (janela rastreamento)** — /track default 24h, período livre com teto configurável (D-Ω4C-RECON-06); janela > teto → 422.
- **RN-TELE-08 (precisão)** — accuracy acima do teto persistida crua mas **excluída do km**; salto de velocidade descartado do somatório; thresholds declarados.
- **RN-TELE-09 (permissão)** — ingestão reusa `field_location:send` (só o próprio profissional consentido); leitura `telemetry:read` (admin/dispatcher/auditor); field_technician **não** lê o console (403 real, backend autoridade).

#### Fronteira de escopo
- **Permitido:** os arquivos acima; `prisma/**` **só** a migração aditiva telemetry_events (autorização explícita no comando); `catalog.ts` **só** telemetry:read (autorização explícita); `RBAC_MATRIX.md`.
- **Proibido:** tocar field_operator_locations/field-location.*/o mapa Ω1 (coexistência D-Ω4C-TELE-MODEL) · Flutter/`mobile/flutter_app/**` (PR-17) · telas web/mapa de telemetria (PR-18) · qualquer scheduler/node-cron/materialização (km on-read; job = PR-16b) · migração destrutiva (parada irredutível C7.5) · S3/serviço externo.
- **Sem dependência nova** (haversine é matemática hand-rolled), **sem serviço externo pago, sem migração destrutiva, sem deploy de prod → junta NORMAL (≥3)**. Como manipula **GPS + consentimento LGPD**, **`agente-secops` é OBRIGATÓRIO** na junta (revisa consent-gate, allowlist §2.8, isolamento cross-tenant, anti-fingerprint). **NÃO é junta-5** (nada tarifado/dependência).

#### Riscos + rollback
- **LGPD/consentimento** → consent-gate por findByUserId antes de gravar GPS; sem consentimento não persiste localização; secops obrigatório; teste RN-TELE-01. **Volume de telemetria** → índice (tenant_id, operator_profile_id, captured_at) tenant-first + km on-read; retenção/materialização deferidas a PR-16b (condicional dba). **Km fabricado** → on-read honesto, sem pontos = 0 (RN-TELE-03). **Vazamento de coordenada** → allowlist; coord crua só /track gated; auditoria sem coord. **Fingerprint de device** → DeviceView só label grosseiro, sem sdk_int cru/IP. **Poluição do mapa Ω1** → evitada por model separado (não estende field_operator_locations). **Rollback:** módulo + rotas + serviço são aditivos; a migração é 1 tabela nova up-only → reverter o PR remove tudo sem afetar dado existente; sem ALTER de tabela alheia para desfazer.

#### Bateria (seção 10 — o avaliador roda)
`npx prisma validate` + migrate diff (sem drift) + **`agente-dba-guardião` prova up/down/re-up** da 20260830000000 (FK composta + UNIQUE idempotência + RLS FORCE) · backend `npm run check`·`lint`·`test`·`build` · **NOVO** `node --test --import tsx tests/telemetry-ingest.test.ts` (consent-gate rejeita GPS sem consentimento [zero lat/lng gravado]; evento sem GPS passa; idempotência already_applied; filtro de precisão; batch ≤50; ator sem perfil 422; cross-tenant 404; §2.8 sem IP/tenant/coord na auditoria) · **NOVO** `node --test --import tsx tests/telemetry-km.test.ts` (haversine correto vs distância conhecida; Σ pontos consecutivos; **sem pontos → 0**; descarta accuracy ruim e salto de velocidade; janela 24h/teto) · `tests/rls-tenant-isolation.test.ts` estendido (3 tenants efêmeros p/ telemetry_events: insert cross bloqueado, list cross vazio; **teardown FK-safe** telemetry_events antes de operator_profiles) · `tests/core-saas.test.ts` (telemetry:read no catálogo + atribuição por papel) · **zero regressão** em field-location / operator-profiles / mobile-sync / work-order-* · `git diff --check` + `git status --short` limpo. **É backend-only → sem frontend nesta fatia.** **KPI:** `docs/kpis/omega4c/KPI_PR-12.json` + histórico + snapshot; `Kpis/*` backend **1462→+N** (telemetry-ingest + telemetry-km), frontend_smoke **801** (inalterado, backend-only), blocks **82→83**. **Backfill** merge_commit/approved_head pós-merge.

**APROVADO para implementar** — íntegro: o consentimento LGPD **JÁ EXISTE** (tracking_consent/findByUserId) → **não é parada crítica**, e o consent-gate é invariante testável; **1 model novo** (menor acoplamento que estender field_operator_locations, sem poluir o mapa Ω1); **km on-read por haversine** (sem scheduler, sem km fabricado); **ingestão reusa `field_location:send`** + **leitura nova `telemetry:read`** (4 pontos declarados); **migração aditiva 1 tabela** up-only com teardown FK-safe; §2.8 com allowlists e coord crua só no Rastreamento gated. Próximo = **omega4c-dev-backend** sob **junta normal com `agente-secops` obrigatório**.

#### PR-12 — Veredito da junta (2026-07-24) — **UNÂNIME 4/4 APROVADO** (migração `20260831000000`, não `20260830000000` [essa é do PR-10])
- **agente-dba-guardião** → `APROVADO` (2 BAIXA): migração `20260831000000_add_telemetry_events` provada **UP/DOWN/RE-UP** em DB scratch
  isolada (cadeia completa). `CREATE TABLE telemetry_events` puramente aditiva (4 índices + 5 CHECKs + 2 FKs + RLS ENABLE/FORCE/POLICY;
  operator_profiles/field_operator_locations INTACTAS). **FK composta `(tenant_id, operator_profile_id)`→operator_profiles ON DELETE
  CASCADE PROVADA** (esquecimento LGPD: DELETE do operator_profile → telemetria dele em cascata, antes=1/depois=0); FK tenant RESTRICT.
  CHECKs lat/lng ±90/±180, battery 0-100 rejeitam (lat=200/battery=150 barrados); FK cross-tenant → **23503**; idempotência UNIQUE
  `(tenant_id, operator_profile_id, client_action_id)` → **23505**. RLS t/t. BAIXA: lat/lng DOUBLE PRECISION (espelha
  field_operator_locations; range por CHECK); UNIQUE via index (equivalente).
- **agente-secops** → `APROVADO` (2 BAIXA): **CONSENT-GATE fail-closed** — ingestOne rejeita com `tracking_consent_required` quando
  `hasGps && trackingConsent !== true` **ANTES de qualquer insert** (`!== true` também barra undefined/null/false); GPS NUNCA gravado sem
  consentimento; eventos sem-GPS (connect/disconnect/refusal) prosseguem; parseCoordinatePair força lat+lng juntos (sem meia-coordenada).
  **Zero vazamento:** lat/lng cru SÓ em TrackView (gated por telemetry:read); Km/Refusal/Access/Device views sem lat/lng/IP/tenant_id/
  operator_profile_id/client_action_id/sdk_int. **FK CASCADE = esquecimento.** Isolamento por tenant (RLS FORCE + tenant do ator; provado
  no rls-test). Auditoria só contagens agregadas. Nenhum segredo/gate de produção tocado. BAIXA: DeviceView.deviceLabel emite device_model
  cru (sdk_int já removido — sem fingerprint; bucketizar reduz granularidade); RefusalView.workOrderRef expõe work_order_id UUID do mesmo
  tenant (referência interna, fora do conjunto proibido §2.8).
- **coordenador-de-acessos** → `APROVADO` (2 BAIXA): `telemetry:read` → super/platform/tenant_admin + manager + field_dispatcher +
  auditor; **field_technician EXCLUÍDO** (o técnico é o RASTREADO, não vê o rastreamento de todos), + technician/operator/finance/inventory/
  viewer/support sem acesso (assert negativo explícito). Ingestão `POST /mobile/telemetry` reusa `field_location:send` (gate real em
  assertTelemetryActor → 403; consent-gate é o controle LGPD no service). Catálogo↔`expectedPermissionCatalog`↔seed coerentes (core-saas
  26/26, deepEqual por ordem). 5 rotas de leitura gated por telemetry:read; coord crua só no /track. BAIXA: gate de ingestão handler-level
  (consistente com mobile-sync, 403 real); os 7 fails locais de telemetry.test são artefato do `.env` local (prisma + ESM hoisting) — em
  memória/CI **17/17**.
- **omega4c-avaliador** → `APROVADO` (1 ALTA higiene + 3 BAIXA): seção 10 verde (backend suíte completa 1485: 1479 pass efetivo / 6 skip;
  única falha = rls-tenant-isolation DB-gated ambiental por scheduled_notifications ausente no DB dev, ANTES do trecho de telemetria;
  **telemetry 17/17**, core-saas 26/26; **zero regressão** em field-location/operator-profiles/statements/sessions/audit/commissions/estoque/
  OS/notifications 116/116). RN-TELE-01 consent-gate (getTrack vazio sem consentimento, populado com), km on-read honesto (sem pontos → 0),
  idempotência UNIQUE→already_applied, §2.8 (coord crua só /track). **field_operator_locations/mapa Ω1 INTOCADOS** (só relações inversas +
  comentário). ALTA = git add cirúrgico (strays pré-existentes fora do escopo). BAIXA: KPI (orquestrador); **RN-TELE-07 (janela > teto →
  422 window_too_large) tem a lógica correta mas SEM assert HTTP explícito** — lacuna de RN não-crítica, fast-follow.
- **Decisão:** verde unânime 4/4 → merge (CI = gate empírico do rls DB-gated) + KPI no PR (§C3). **Consent-gate LGPD confirmado por 2
  revisores (secops+avaliador); FK CASCADE = direito ao esquecimento provado pelo dba-guardião.** Backend-only (Flutter=PR-13, web/mapa=
  PR-14 via Junta de Mapas). D-records (D-Ω4C-TELE-MODEL/-CONSENT/-KM-ONREAD/-IDEMP/-PERM/-2.8/-REFUSAL-RECEIVER/-PRECISION) ratificados.
  **Fast-follow backlog:** teste HTTP de RN-TELE-07 (window_too_large 422); bucketizar device_label; OS-ref amigável no RefusalView.
- KPI: `docs/kpis/omega4c/KPI_PR-12.json`. `Kpis/*`: backend 1462→**1479** (+17 telemetry); frontend_smoke **801** (inalterado — backend-only);
  blocks 82→**83**.

### PR-13 — Telemetria Flutter (app de campo: captura GPS foreground + heartbeat + buffer Drift + flush em lote) — plano do omega4c-planejador (2026-07-24)

**Mapeia PR-17 do PLANO_OMEGA4C** (Flutter — serviço de telemetria: login/logout events, GPS foreground, bateria, tipo de rede, versão/modelo/SDK, envio em lote c/ fila offline via Drift, disclaimers de permissão). **É o PRODUTOR** do que o backend **PR-12 (mergeado #273)** ingere: `POST /api/v1/mobile/telemetry`. **Só Flutter** — telas web/mapa (PR-14/PR-18) e backend (PR-12) são outras fatias. **Veredito: CRIAR** o serviço de telemetria do app, **reusando** a infra de GPS/consentimento/fila-Drift já viva (B-105/B-106/B-121), **sem dependência nova**.

**Objetivo.** Produzir telemetria fiel ao AutEM Controle>Mobile, do lado do dispositivo: (a) **captura GPS em primeiro plano** (heartbeat periódico + `distanceFilter`) com {lat, lng, accuracy, speed}; (b) **buffer local Drift dedicado** + **flush em lote** (≤50) para `POST /mobile/telemetry` com `client_action_id` determinístico (idempotência) e retry/backoff; (c) eventos **APP_CONNECT** (login/foreground) / **APP_DISCONNECT** (logout/background) e **SERVICE_REFUSAL** no ponto de recusa já existente do fluxo de OS; (d) **consent-aware no cliente** (LGPD) — sem consentimento, o app **não captura GPS**; (e) **sem rastreamento em background** (paridade AutEM). Ator: o **próprio field_technician consentido** (permissão `field_location:send`, já no seu conjunto).

#### RECON — FATO vs HIPÓTESE (a espinha da fatia; li o código do `mobile/flutter_app`)
- **FATO — GPS foreground JÁ EXISTE (B-105/B-106).** `geolocator: ^14.0.3` no pubspec; `GeolocatorDeviceLocationProvider` (`geolocator_device_location_provider.dart`) obtém `getCurrentPosition(accuracy:high, timeLimit)` e monta `FieldLocationFix{latitude, longitude, accuracyMeters, headingDegrees, speedMetersPerSecond, recordedAt}` (speed em **m/s** → backend quer **km/h** = ×3,6). `gps_service.dart:gpsAvailableProvider` checa `isLocationServiceEnabled` + `checkPermission ∈ {always, whileInUse}`. Trata `denied/deniedForever/serviceDisabled/timeout` com mensagens seguras. **`FieldLocationFix.batteryLevel` (int 0-100) EXISTE no modelo mas NUNCA é populado** (geolocator não dá bateria) → confirma que **`battery_plus` não está no app**.
- **FATO — a fila local É Drift (não JSON in-memory).** `drift: ^2.34.0` + `sqlite3_flutter_libs` no pubspec; `AppDatabase` (`app_database.dart`, `schemaVersion 11`) com tabelas raw-SQL via `customStatement`/`customInsert`/`customSelect` e `MigrationStrategy` incremental (`onUpgrade from<N`). Já há **tabela dedicada `field_location_events`** (`_kFieldLocationEvents`) + `FieldLocationSyncService` **próprios**, servidos **fora** da fila genérica `sync_actions`. A memória "gaps para Drift/SQLite" está **desatualizada** — a migração para Drift já ocorreu (B-087+). **HIPÓTESE descartada.**
- **FATO — orquestração de flush em lote JÁ EXISTE.** `AutoSyncCoordinator` (`auto_sync_coordinator.dart`) dispara em `offline→online` e manual (`triggerManual`), chamando cada domínio em sequência com **try/catch isolado** (field-location isolado dos demais). Codecs de lote (`WorkOrderSyncCodec`/`ChecklistSyncCodec` em `sync_replay_service.dart`) já falam o envelope `{client_batch_id, actions:[...]}` e decodificam `data.accepted/already_applied/rejected/conflicts` — **padrão a espelhar** (mas telemetria tem envelope PRÓPRIO: `{client_batch_id, events:[...]}`, evento **flat**, não `type`+`payload`).
- **FATO — hooks de login/logout e de recusa EXISTEM.** `AuthNotifier.login()`/`logout()` (`auth_notifier.dart`) = ponto de **APP_CONNECT/APP_DISCONNECT**. **Recusa de serviço já existe:** `WorkOrderRepository.reportUnableToStart({localId, reason, note})` (`work_order_repository.dart:598`) enfileira `work_order.unable_to_start` + timeline `exceptionRaised` → **ponto exato de emissão do `SERVICE_REFUSAL`** (com `workOrderId` = `serverId` real + `refusalReason`).
- **FATO — `signalType` é derivável SEM dep nova.** `connectivity_plus: ^6.0.0` já é usado (`ConnectivityPlusSource`) e enxerga `ConnectivityResult.wifi|mobile|ethernet|none` — mapeável ao enum backend `wifi|mobile|none`. `uuid: ^4.5.3` (client_action_id) e `dio: ^5.9.2` (POST) já presentes.
- **GAP CRÍTICO — o app NÃO conhece o `tracking_consent` do PERFIL (LGPD).** `grep` por `tracking_consent`/`operatorProfile` em `lib/**` = **zero**. `BootstrapSession` (`bootstrap_session.dart`) carrega `activeTenant`, `user{userId,email,tenantRole,tenantRoles,scope}`, `permissions(PermissionSet)`, `mobilePolicy`, `featureFlags` — **sem** o flag do perfil. O único consentimento que o app conhece é o **de dispositivo**: `LocationConsentStore.hasAcceptedManualCapture()` (`location_consent_store.dart`, flag em `flutter_secure_storage`), cujo texto **já diz** *"Não há rastreamento em segundo plano. Sem background tracking."* → é a **base honesta do gate cliente**. O `tracking_consent` do perfil permanece a **autoridade servidor** (PR-12 já é fail-closed).
- **GAP — não há módulo/serviço de telemetria no app** (grep confirma). Skeleton novo em `lib/core/telemetry/**` + tabela Drift dedicada.
- **HIPÓTESE:** cadência ideal de heartbeat/distanceFilter do AutEM (não vista em frame limpo) → parametrizada por constantes declaradas (default heartbeat 60 s, distanceFilter 25 m), ajustável.

#### Decisão-âncora — **buffer Drift DEDICADO `telemetry_events` (mobile), NÃO a fila `sync_actions` compartilhada; ZERO dep nova** (D-Ω4C-TELE-FLUTTER-BUFFER)
Telemetria é **alto volume** (heartbeat a cada N s) e tem **envelope próprio**. Reusar a `sync_actions` compartilhada seria ruim: (i) volume — `DriftSyncActionStore.save()` faz **DELETE-all + INSERT-all** (reescrita total da tabela) → inviável com milhares de heartbeats; (ii) shape — o codec genérico embrulha `type`+`payload`, o backend quer `events:[{eventType, capturedAt, lat?, ...}]` flat; (iii) isolamento — falha de flush de telemetria **não pode** entangar OS/checklist/RDV. **Precedente forte e provado:** o **field-location já usa tabela + serviço dedicados** (`field_location_events` + `FieldLocationSyncService`, isolado no `AutoSyncCoordinator`). Telemetria segue **o mesmo padrão**: tabela Drift nova `telemetry_events` (mobile-local), `TelemetryLocalStore`, `TelemetrySyncService.flushTenant()`, plugado no `AutoSyncCoordinator` com try/catch isolado. **Coexistência D-007:** `field_location_events` = ponto vivo do **mapa Ω1** (1 ponto/OS); `telemetry_events` (mobile) = fila de telemetria (heartbeat/acessos/recusas). Não se fundem.

#### D-records novos (registrar em `controle/decisoes.md` no PR)
- **D-Ω4C-TELE-FLUTTER-BUFFER** — tabela Drift dedicada + store + service próprios (acima); `schemaVersion 11→12`, `onUpgrade from<12` cria `telemetry_events` (`CREATE TABLE IF NOT EXISTS`, aditivo, espelha `_kFieldLocationEvents`). **NÃO** reusa `sync_actions`.
- **D-Ω4C-TELE-FLUTTER-NODEPS** — **zero dependência nova** no `pubspec.yaml`. Reusa: `geolocator` (lat/lng/accuracy/speed), `connectivity_plus` (signalType), `uuid` (clientActionId), `drift` (buffer), `dio` (flush). **`batteryPct`/`deviceModel`/`sdkInt` (campos OPCIONAIS no backend) NÃO são enviados nesta fatia** — os pacotes canônicos (`battery_plus`/`device_info_plus`) **não estão** no pubspec, e **adicionar dependência é decisão de junta-5 + PD** (D-SAN-AUTONOMIA §C7.1). `appVersion` via **const `kAppVersion` em `app_config.dart`** (zero-dep; sincronizada com o `version:` do pubspec). Divergência AutEM registrada como **parada honesta** (ver D-007).
- **D-Ω4C-TELE-FLUTTER-CONSENT** — **gate de consentimento no cliente = consentimento de dispositivo** (`LocationConsentStore.hasAcceptedManualCapture()`) **+** permissão `field_location:send`. Sem consentimento de dispositivo → o app **NÃO captura/enfileira heartbeat GPS** (nenhuma coordenada tocada); eventos **sem GPS** (connect/disconnect/refusal) **prosseguem** (não são rastreamento de posição). O `tracking_consent` do **perfil** continua a **autoridade servidor** (PR-12 rejeita GPS sem consentimento, fail-closed) — se divergir (perfil=false), o backend responde `rejected:tracking_consent_required` e o cliente **descarta o evento (terminal, sem retry)**. **Surfacing do `tracking_consent` do perfil via bootstrap = DEFERIDO Ω5** (o app hoje não o conhece; adicioná-lo tocaria o backend, fora do escopo Flutter-only).
- **D-Ω4C-TELE-FLUTTER-FOREGROUND** — **captura só em primeiro plano.** `WidgetsBindingObserver` no root: `resumed` → inicia o timer de captura (+ APP_CONNECT se autenticado); `paused/inactive/detached` → **para o timer** (+ APP_DISCONNECT). **SEM** `WorkManager`, background service, isolate ou `getPositionStream` persistente em background. Paridade AutEM (exige app aberto). Disclaimer de permissão reaproveita o texto de `location_consent_store.dart`.
- **D-Ω4C-TELE-FLUTTER-EVENTS** — **APP_CONNECT** em `AuthNotifier.login()` OK **e** em `resumed` (autenticado); **APP_DISCONNECT** em `logout()` **e** em `paused`. **De-dup** por estado (não emitir connect repetido). **SERVICE_REFUSAL** emitido em `reportUnableToStart` (`work_order_repository.dart:598`), carregando `workOrderId` = `serverId` **UUID real** (nunca id local) + `refusalReason` = `reason`. O app é o **emissor** (backend é receptor — D-Ω4C-TELE-REFUSAL-RECEIVER do PR-12).
- **D-Ω4C-TELE-FLUTTER-IDEMP** — cada evento buffered tem `clientActionId` **determinístico** (`uuid.v4()` na captura, persistido na linha). Retry reusa o mesmo `clientActionId` → backend `already_applied` → marca `synced` (não duplica). **Estados terminais do buffer:** `accepted`/`already_applied` → purga; `rejected` → **descarta sem retry** (validação/consent — retry não ajuda); ausente no `results`/erro de rede → `failed` + retry com backoff (cap `maxRetry=5`, depois descarta p/ não bloatar).
- **D-Ω4C-TELE-FLUTTER-2.8** — payload **só** os campos do contrato; **NUNCA** `tenant_id`/`token`/`path`/base64 no corpo (tenant/perfil resolvidos pelo **ator** no backend); **coordenada só no evento `heartbeat` consentido**; **zero coordenada/PII em log** (disciplina LGPD já vigente no mapa) — mensagens de erro seguras (padrão `_mapError`).

#### Modelagem local (Drift — aditiva, `schemaVersion 11→12`)
Tabela `telemetry_events` (mobile-local; espelha `_kFieldLocationEvents`): `local_id TEXT PK` · `tenant_id TEXT NOT NULL` · `client_action_id TEXT NOT NULL` (idempotência) · `event_type TEXT NOT NULL` (heartbeat|app_connect|app_disconnect|service_refusal) · `captured_at INTEGER NOT NULL` (ms epoch UTC) · `latitude REAL` · `longitude REAL` · `accuracy_meters REAL` · `speed_kmh REAL` · `signal_type TEXT` · `app_version TEXT` · `work_order_id TEXT` · `refusal_reason TEXT` · `sync_status TEXT NOT NULL` · `retry_count INTEGER NOT NULL DEFAULT 0` · `last_error_code TEXT` · `last_safe_error TEXT` · `created_at INTEGER NOT NULL` · `synced_at INTEGER`. (Campos `battery_pct`/`device_model`/`sdk_int` **omitidos** nesta fatia — D-NODEPS.) `TelemetryLocalStore` (Drift): `enqueue`, `pendingForTenant(tenantId, {limit})`, `markSynced`, `markFailed(incRetry, code, safe)`, `purgeSynced`.

#### Contrato cliente→backend (wire, batendo com `telemetry.validators.ts`)
- **Endpoint:** `POST /api/v1/mobile/telemetry` — novo const em `api_contracts.dart` (`TelemetryApiEndpoints.mobileTelemetry`). Auth via `authInterceptor` (Bearer). Gate cliente: `permissions.contains('field_location:send')`.
- **Envelope:** `{ client_batch_id, events: [ ... ] }`, **≤50** eventos (backend 422 `batch_too_large`/`empty_batch`). `client_batch_id` determinístico (`telemetry-batch-<ms>-<firstClientActionId>`, padrão dos codecs).
- **Evento (flat):** `{ client_action_id, eventType, capturedAt(ISO8601), lat?, lng?, accuracyM?, speedKmh?, signalType?, appVersion?, refusalReason?, workOrderId? }`. Regras do backend a respeitar: `lat`+`lng` **juntos** (meia-coordenada → 422 `invalid_coordinate`); `signalType ∈ {wifi,mobile,none}`; `workOrderId` **UUID válido** (só recusas com serverId real; nunca id local `wo-local-*`); `capturedAt` ISO. `speedKmh` = `speedMetersPerSecond`×3,6. (O backend aceita camelCase **ou** snake por campo — padronizo camelCase nos campos + `client_action_id`/`client_batch_id` snake no envelope, como os codecs existentes.)
- **Resposta:** `{ data: { summary:{received,accepted,rejected,already_applied}, results:[{client_action_id, status:'accepted'|'rejected'|'already_applied', reason?}] } }` — codec decodifica `body['data']['results']` (tolera `body['results']`), mapeia `client_action_id`→status: accepted/already_applied → `synced`; rejected → terminal (descarta, guarda `reason` sem PII); ausente → retry.

#### Arquivos exatos
- **NOVO módulo `lib/core/telemetry/`:** `telemetry_event.dart` (modelo + enum `TelemetryEventType` + validação lat/lng espelhando `FieldLocationFix`) · `telemetry_local_store.dart` (interface + Drift impl) · `telemetry_api.dart` (`TelemetryApi` + `DioTelemetryApi` usando `TelemetryApiEndpoints.mobileTelemetry`) · `telemetry_codec.dart` (envelope `{client_batch_id, events}` + decode `results`) · `telemetry_capture_service.dart` (timer heartbeat + `distanceFilter` via geolocator; consent-gate; enfileira; signalType via connectivity_plus) · `telemetry_sync_service.dart` (`flushTenant`: pull ≤50 → POST → mapear → purge/retry) · `telemetry_providers.dart` (Riverpod).
- **ESTENDER (cirúrgico):** `lib/core/local_db/app_database.dart` (`schemaVersion 11→12` + `_kTelemetryEvents` no `onCreate` e `onUpgrade from<12`) · `lib/core/network/api_contracts.dart` (+`TelemetryApiEndpoints`) · `lib/core/config/app_config.dart` (+`const kAppVersion`) · `lib/core/auth/auth_notifier.dart` (login→APP_CONNECT, logout→APP_DISCONNECT via provider) · `lib/features/work_orders/data/work_order_repository.dart` (`reportUnableToStart` também emite SERVICE_REFUSAL) · `lib/app/app.dart` (WidgetsBindingObserver: resumed/paused → start/stop + connect/disconnect) · `lib/core/sync/auto_sync_coordinator.dart` (+`telemetrySyncService.flushTenant(tenantId)` em try/catch isolado).
- **Testes:** `test/features/telemetry/telemetry_test.dart` (ou `telemetry_capture_test.dart` + `telemetry_flush_test.dart`) — bateria do bloco.
- **KPI dupla:** `mobile/flutter_app/Kpis/*` (contagem flutter) **e** `Kpis/*` (raiz) + `docs/kpis/omega4c/KPI_PR-13.json`.

#### RNs e critérios de aceite (espelho cliente das RN-TELE do PR-12)
- **RN-TELE-MOBILE-01 (consent cliente — invariante testável)** — sem consentimento de dispositivo → **nenhum heartbeat GPS enfileirado** (zero coordenada no buffer); eventos sem-GPS (connect/disconnect/refusal) prosseguem. **Teste prova** buffer sem lat/lng quando `consent=false`.
- **RN-TELE-MOBILE-02 (buffer + flush em lote)** — captura enfileira na tabela dedicada; `flushTenant` puxa ≤50 → POST → summary decodificado → `synced` purgado. Envelope e limite 50 respeitados.
- **RN-TELE-MOBILE-03 (idempotência)** — retry reusa `clientActionId`; `already_applied` → `synced` sem duplicar; sem loop infinito (cap `maxRetry=5`).
- **RN-TELE-MOBILE-04 (offline→fila→replay isolado)** — offline: eventos ficam `pending`; online (`AutoSyncCoordinator`) → flush; falha de rede → `failed`+retry, **isolada** dos demais domínios (try/catch próprio).
- **RN-TELE-MOBILE-05 (foreground-only)** — timer para em `paused`; **nenhum ponto capturado em background**; disclaimer de permissão presente; sem WorkManager. **Teste prova** que `paused` interrompe a captura.
- **RN-TELE-MOBILE-06 (eventos)** — login→APP_CONNECT, logout→APP_DISCONNECT, `reportUnableToStart`→SERVICE_REFUSAL (com `workOrderId` server-only + `reason`); de-dup de connect/disconnect.
- **RN-TELE-MOBILE-07 (§2.8/LGPD cliente)** — payload só campos permitidos; **nunca** tenant_id/token/path; coordenada só em `heartbeat`; **zero coordenada/PII em log** (mensagens seguras).
- **RN-TELE-MOBILE-08 (contrato)** — wire keys batem com `telemetry.validators.ts`: `eventType`, `capturedAt` ISO, `client_action_id`, `lat`+`lng` juntos, `signalType ∈ {wifi,mobile,none}`, `speedKmh`=m/s×3,6, `workOrderId` só UUID server, batch≤50.

#### Fronteira de escopo
- **Permitido:** `mobile/flutter_app/lib/**` (novo `core/telemetry/*` + os 7 pontos de extensão acima, incl. `app_database.dart` `schemaVersion`/migração **aditiva** e `app_config.dart` const) · `mobile/flutter_app/test/features/telemetry/**` · `mobile/flutter_app/Kpis/*` (KPI dupla) · `Kpis/*` (raiz) · `docs/kpis/omega4c/KPI_PR-13.json` · `docs/juntas/J-OMEGA4C.md` · `controle/decisoes.md`.
- **Proibido:** **`src/**` do backend** (PR-12 já mergeado — NÃO tocar) · `prisma/**` · **web `frontend/**`** · **`pubspec.yaml`/`pubspec.lock`** (SEM dependência nova — se a junta decidir por `battery_plus`/`device_info_plus`, é **junta-5 + PD ≥3 fontes**, fora deste PR: **parada honesta**) · `field_location_events`/`FieldLocationSyncService`/mapa Ω1 (coexistência D-BUFFER) · WorkManager/background/isolate · serviço externo · copiar assets/textos/CSS do AutEM.

#### Divergências AutEM honestas (D-007)
- **`batteryPct`/`deviceModel`/`sdkInt` não enviados** (backend-opcionais; omitidos) — pacotes ausentes; adicioná-los = **junta-5 + PD**. AutEM Mobile mostra bateria/dispositivo/SDK → **FORA do PR-13, parada honesta**. Se o dono/junta quiser fidelidade de device/bateria, abrir **junta-5 + PD ≥3 fontes** para `battery_plus`/`device_info_plus`(+`package_info_plus`) num PR próprio.
- **`appVersion` via const** (não `package_info_plus`) — exige bump manual junto do `version:` do pubspec; limitação declarada.
- **`tracking_consent` do perfil não conhecido pelo app** → gate cliente usa consentimento de **dispositivo** (mais conservador = LGPD-safe); surfacing do flag do perfil via bootstrap **deferido Ω5** (tocaria backend).

#### Riscos + rollback
- **Bateria (drenagem)** → cadência configurável (heartbeat 60 s, distanceFilter 25 m), **foreground-only**, flush em lote (não por evento). **Permissão negada** → captura vira no-op honesto (geolocator já trata `denied/deniedForever/serviceDisabled/timeout`), eventos non-GPS seguem; disclaimer. **Background acidental** → `WidgetsBindingObserver` para o timer em `paused` (RN-05 testa). **Coordenada sem consentimento** → gate cliente + backend fail-closed (RN-01 prova buffer sem GPS). **Volume no buffer** → tabela dedicada + `purgeSynced` + cap de retry (não bloateia a `sync_actions` compartilhada). **Rollback:** tudo **aditivo** (módulo novo + tabela nova via `CREATE TABLE IF NOT EXISTS` no `onUpgrade` + hooks). Reverter o PR remove o módulo; a tabela Drift extra é inerte (nenhum `ALTER`/`DROP` destrutivo de tabela existente). Sem migração de servidor (backend intocado).

#### Bateria (seção 10 — o avaliador roda; padrão Flutter §9)
`cd mobile/flutter_app` → `flutter pub get` → `dart format --output=none --set-exit-if-changed lib test` → `flutter analyze` → `flutter test test/features/telemetry/telemetry_test.dart --reporter compact` (consent-gate cliente [sem consentimento → zero GPS no buffer]; buffer/flush em lote ≤50; idempotência `clientActionId`→already_applied→synced; offline→fila→replay isolado; foreground-only [paused para captura]; eventos connect/disconnect/refusal; §2.8 sem tenant/token/coord em log; contrato wire) → **regressões**: `b103_work_order_sync_test.dart` · `b105_gps_operational_map_test.dart` · `b106_native_gps_permissions_test.dart` · `b090b_offline_auto_sync_test.dart` · `location/b121_location_consent_test.dart` · `b122_sync_conflict_test.dart` → `flutter test --reporter compact` (suíte completa, **zero regressão**) → `cd ../..`. **KPI dupla (D-KPI-PER-PR §C3):** `mobile/flutter_app/Kpis/*` flutter tests **+N** (telemetry); `Kpis/*` raiz: backend **1479** (inalterado — Flutter-only, com nota), frontend_smoke **801** (inalterado); blocks **83→84**. **Backfill** merge_commit/approved_head pós-merge.

**APROVADO para implementar** — íntegro: a infra crítica **já existe** (geolocator foreground B-105/106; fila **Drift** madura; `AutoSyncCoordinator` de flush isolado; hooks de login/logout e de recusa `reportUnableToStart`), então a fatia é **aditiva e sem dependência nova** (reusa geolocator/connectivity_plus/uuid/drift/dio); **buffer Drift dedicado** (não a `sync_actions` compartilhada — volume/shape/isolamento, precedente field-location); **consent-gate no cliente** via consentimento de dispositivo (LGPD-safe; perfil = autoridade servidor já em PR-12); **foreground-only** por `WidgetsBindingObserver` (sem WorkManager, paridade AutEM); **idempotência** por `clientActionId` determinístico → `already_applied`. `batteryPct`/`deviceModel`/`sdkInt` (backend-opcionais) **deferidos** como parada honesta (adicionar pacote = junta-5 + PD). Próximo = **omega4c-dev-mobile** sob **junta normal (≥3)**; **`agente-secops` recomendado** (revisa consent-gate cliente, §2.8/LGPD, foreground-only). **NÃO é junta-5** (sem dependência nova, sem serviço tarifado, sem backend/prisma).

#### PR-13 — Veredito da junta (2026-07-24) — **APROVADO (3 vetos; 1 MEDIA de consentimento LGPD resolvida)**
- **omega4c-avaliador** → `APROVADO_CONDICIONADO`→(ALTA de KPI sanada pelo orquestrador): bateria Flutter completa VERDE (Flutter 3.41.6) —
  `pubspec.yaml/lock` INTOCADOS (D-NODEPS confirmado), `dart format --set-exit-if-changed` 0-changed, `flutter analyze` No issues,
  **telemetry_test 25/25**, regressões +112 (b103/b105/b106/b090b/b121/b122), **suíte completa 807 tests / 0 falhas / 0 skip**,
  `git diff --check` limpo. Consent-gate cliente / foreground-only / idempotência / §2.8 / migração Drift aditiva (11→12) todos comprovados
  por teste. **Move de app.dart SÃO** (lib/app/app.dart é o caminho vivo; sem órfão; analyze limpo; 807 verdes). ALTA = KPI dupla (§C3 —
  sanada agora pelo orquestrador). BAIXA: D-007 batteryPct/deviceModel/sdkInt deferidos (backend-opcionais; pacotes ausentes; adicionar =
  junta-5+PD) APROVADO.
- **agente-secops** → `APROVADO` (2 BAIXA): **consent-gate cliente curto-circuita ANTES de ler o GPS** — `captureHeartbeat` exige
  `field_location:send` (l.126) E consentimento de dispositivo LocationConsentStore (l.131) antes de `currentLocation()` (l.137); sem os
  dois → `skippedNoConsent`, coordenada NUNCA sequer solicitada (não só "não envia" — NÃO CAPTURA; testes 12/13). Servidor autoritativo
  (rejected `tracking_consent_required` → descarte terminal sem loop, teste 22). **SEM background** (Timer.periodic parado em paused/detached/
  dispose; sem WorkManager/isolate/getPositionStream persistente; teste 16). Zero log de coordenada (grep); buffer Drift local; payload
  §2.8-clean (sem tenant/token/path; lat/lng só no heartbeat consentido). pubspec intocado; flush só ao /mobile/telemetry autenticado.
  BAIXA: start() não pré-checa field_location:send (tick ocioso 60s); kAppVersion sync manual.
- **coordenador-de-acessos** → `APROVADO_CONDICIONADO`→**re-verificado APROVADO** (MEDIA descarregada): cadeia reusa `field_location:send`
  (sem RBAC novo no app; cliente lê dos claims, backend fail-closed 403); duplo gate cliente + servidor autoritativo no `tracking_consent`
  do perfil; APP_CONNECT/DISCONNECT sem credencial/token no payload; §2.8 (sem CNH/token; coord só no heartbeat consentido). **MEDIA
  (fidelidade de consentimento LGPD):** o heartbeat automático ~60s reusava a copy B-121 "somente quando você tocar em Enviar / sem
  rastreamento em background" (descrevia só captura manual on-tap) — descompasso de escopo. **CORRIGIDO:** `manualLocationConsentText` +
  doc do consent-screen atualizados para divulgar HONESTAMENTE as duas formas (on-tap **E** heartbeat periódico em primeiro plano quando o
  rastreamento de frota está ativo no perfil), mantendo a afirmação verdadeira de **sem background** ("nada capturado com o app fechado/
  minimizado"); lógica de gate INTOCADA; 807/807 verdes (frase "Sem background tracking" preservada nos testes). Coordenador re-verificou →
  **MEDIA descarregada, 0 resíduo.** BAIXA: eventos sem-GPS enfileirados sem checar field_location:send (403 no lote → churn; fast-follow).
- **Decisão:** verde (3 vetos APROVADO após 1 MEDIA de consentimento LGPD resolvida) → merge + KPI DUPLA no PR (§C3 — Flutter-only:
  atualiza `mobile/flutter_app/Kpis/*` E `Kpis/*`). **consent-gate cliente + foreground-only + zero-dep + copy de consentimento honesta**
  confirmados. D-records (D-Ω4C-TELE-FLUTTER-BUFFER/-NODEPS/-CONSENT/-FOREGROUND/-EVENTS/-IDEMP/-2.8) ratificados. **Fast-follow backlog:**
  gate client-side dos eventos sem-GPS; start() pré-checar permissão; pacotes battery/device (junta-5+PD, Ω5) p/ batteryPct/deviceModel/sdkInt.
- KPI: `docs/kpis/omega4c/KPI_PR-13.json`. `Kpis/*` + `mobile/flutter_app/Kpis/*`: **flutter_tests 764→807** (+25 telemetry-test deste PR +
  reconciliação da suíte Flutter real, antes carregada em 764); backend **1479** e frontend_smoke **801** INALTERADOS (Flutter-only);
  blocks 83→**84**.

## 8. Encerramento (a fazer no fim)
Ata final (entregas, KPIs consolidados, pendências→backlog Ω5); deletar **SOMENTE** os 5 agentes efêmeros (registrar cada
deleção); confirmar que nenhum agente pré-existente foi tocado; marcar os D-records como vigentes.
