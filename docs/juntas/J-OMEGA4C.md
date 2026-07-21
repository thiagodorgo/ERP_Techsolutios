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

## 8. Encerramento (a fazer no fim)
Ata final (entregas, KPIs consolidados, pendências→backlog Ω5); deletar **SOMENTE** os 5 agentes efêmeros (registrar cada
deleção); confirmar que nenhum agente pré-existente foi tocado; marcar os D-records como vigentes.
