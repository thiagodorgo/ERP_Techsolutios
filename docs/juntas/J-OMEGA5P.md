# J-Ω5P — Junta da Rodada "Pátios de Recolhimento (SIGPRV)"

> **Aberta em:** 2026-07-25 · **Branch:** `rodada/omega5p` · **Fontes de verdade:** `docs/rodadas/omega5p/ESTUDO_SIGPRV_PATIOS.md` (marco regulatório, ontologia, máquina de estados §4.2, invariantes I1-I10 §4.3, motor de diárias §5, leilão §6, portal §7) + `docs/rodadas/omega5p/PLANO_OMEGA5P.md` (gap, D-records, PR-00..20).
> **Mandato do dono:** implementar PR-00→PR-20 com os 10 invariantes cobertos por teste, RNs do prompt, KPI por PR, ata final. Aderente à **Res. CONTRAN 1025/2026** e "Sivec-ready" por adapter, sem integração externa especulativa.
> **Princípio:** o registro é PROVA — integridade, atribuição e retenção vêm antes de conveniência.

## 1. Composição (agentes efêmeros — expiram no encerramento)
| Agente | Papel | Poder |
|---|---|---|
| `omega5p-planejador` | plano curto por PR; recon; pesquisa (≥3 fontes); ratifica/abre D-records | propõe |
| `omega5p-dev-backend` | Prisma/migrations aditivas, módulos backend, testes de invariantes | implementa |
| `omega5p-dev-frontend` | console do operador do pátio (React, autenticado) sob `/patios` | implementa |
| `omega5p-dev-portal` | **dois PWAs isolados** (authority-portal + owner-portal) + BFFs, segurança da superfície pública | implementa |
| `omega5p-avaliador` | Seção 10 + RNs + invariantes + aderência normativa | **VETO bloqueante** |

**PROIBIDO** criar/tocar/renomear/deletar qualquer agente pré-existente (inclusive Junta de Mapas, `agente-secops`, `agente-dba-guardiao`, `coordenador-de-acessos`). No encerramento, deletar **apenas** esses 5 e registrar cada deleção nesta ata (§8). Subagentes transientes de recon/pesquisa (general-purpose/Explore/pesquisador-web) são task-runners, não "agentes criados".

**Juntas de PR (≥3, autonomia por juntas — D-SAN-AUTONOMIA):** `omega5p-avaliador` (veto) + revisores pré-existentes conforme o risco — **`agente-secops` OBRIGATÓRIO em todo PR que toque os PWAs/superfície pública**; `agente-dba-guardiao` em todo PR com migração; `coordenador-de-acessos` em PR de RBAC/nav. Mapa geográfico → contrato à Junta de Mapas (não reimplementar).

## 2. Critérios de aprovação por PR
1. **Seção 10 verde:** `npx prisma validate` + `migrate diff` sem drift · `npm run lint/build/test` · `frontend lint/build/test` · `git status --short` sem nada fora do escopo.
2. **Invariantes do PR** (I1-I10) presentes e provados por teste (property-based no motor de diárias; cadeia de hash + detecção de adulteração; máquina de estados → 409; ocupação concorrente; cascata §6º; enumeração/rate-limit no portal).
3. **RNs cobertas** + **aderência normativa com artigo citado** (CTB 269-271/328; Res. 1025 arts. 9/14/15/21/23-42).
4. **Multi-tenant:** 3 tenants + 2 perfis (público-credenciado + privado-contratual) via tenants efêmeros em `tests/rls-tenant-isolation.test.ts`; `tenantId` 1º em todo índice composto.
5. **KPI por PR** (D-KPI-PER-PR): `docs/kpis/omega5p/KPI_PR-XX.json` + histórico + snapshot.
6. **Zero regressão** nas suítes Ω3F/Ω4C. Voto registrado aqui (§7). Junta sem registro = merge inválido.

## 3. Não-negociáveis
- **Neutralidade white-label:** domínio/UI falam "autoridade solicitante / órgão / pátio" — NUNCA "polícia" nem o público-alvo explícito; tudo parametrizado por `JurisdictionProfile`.
- **I2 hash chain:** `CustodyEvent` append-only; `hash = sha256(prevHash + canonicalJson(payload) + occurredAt + actorId)`; correção retroativa = ADJUSTMENT (nunca update/delete); endpoint de verificação.
- **I4 diárias:** rolling-24h federal (§21 §1º) | calendário por perfil; teto pela DATA DE ENTRADA (6 meses | 30 diárias legado | ilimitado); job idempotente/DST-safe; congelamento.
- **I5 liberação:** autorização registrada + (quitação OU dispensa) + quem retira + comprovante entrada/saída.
- **I7 cascata §6º:** Σ alocações = arrematado, ordem legal, classe inferior só após exaurir a superior.
- **I9 retenção:** imutável ≥5 anos, exclusão física VEDADA (só anonimização pós-prazo).
- **I10:** todo acesso ao portal logado (PortalAccessLog).
- Dinheiro Decimal(12,2); km Decimal(10,1); enums inglês + labels PT-BR; toda escrita auditada; migrações SÓ aditivas.

## 4. Decisões da visão do dono (2026-07-25) → D-records
- **D-Ω5P-07** pagamento = **registro manual** no MVP (sem PSP; portal "PIX-ready" por adapter). PSP futuro só por junta-de-5.
- **D-Ω5P-10** `tariffs` **já existe** no repo → **ESTENDER** (vigência×categoria×serviço, escopo público/privado), não recriar.
- **D-Ω5P-11** superfícies externas = **DOIS PWAs isolados mobile-first**, builds separados (authority-portal credenciado + owner-portal público), sem sessão/cookie do ERP.
- **D-Ω5P-12** autoridade solicitante = **persona ativa**: origina a solicitação de remoção e **aprova a liberação in-system** (a "autorização do órgão" do I5 é ação registrada no PWA).
- **D-Ω5P-13** **dois reparos distintos:** o do **guincheiro habilita a remoção** (veículo não transportável como está; remove de qualquer forma) × o do **dono libera** (LIBERADO_PARA_REPARO, art. 271 §2). Nenhum reparo evita a remoção.
- D-Ω5P-01..09 ratificados na Fase 0 (ver `FASE0_RECON.md` e §12 do ESTUDO).

## 5. Escopo
**Permitido:** `prisma/schema.prisma` + migrations aditivas; módulos backend novos (`yard`, `jurisdiction`, `impound`, `charging`, `release`, `auction`, `authority-portal`, `owner-portal`, `interop`) + extensão de `tariffs`; páginas/rotas frontend do módulo Pátios sob `/patios` + os dois PWAs (builds próprias); `docs/rodadas/omega5p/**`, `docs/decisoes/D-Ω5P-*.md`, `docs/juntas/J-OMEGA5P.md`, `docs/kpis/omega5p/**`.
**Proibido:** refactor oportunista fora dos pontos de integração; alteração destrutiva em models/endpoints existentes; secrets/.env/infra/CI; contratar serviço externo (PSP/SNE/OCR/plataforma de leilão) sem junta-de-5; reusar sessão/auth do ERP no portal; `git add .` (stage por caminho); push/PR antes da aprovação registrada da junta; push na main; merge sem checks verdes; exclusão física de dados de processo (I9).

## 6. Cronograma (PLANO §3 + deltas da visão do dono)
- **Fase 0 — PR-00:** junta + 5 agentes + recon (`FASE0_RECON.md`, tabela existe/estende/cria) + ratificação D-records + validação dos pontos abertos do ESTUDO §11.
- **Fase 1 — PR-01..04:** `yard` (pátio/áreas hierárquicas/vagas/ocupação I1) · `jurisdiction` (perfis) · `tariffs` (ESTENDER) · UI administração.
- **Fase 2 — PR-05..09:** `impound` (processo+CustodyEvent hash+máquina de estados I1-I3) · recepção/vistoria (art.9º/14) **+ origem "solicitação de remoção" da autoridade** · `charging` (motor de diárias I4) · UI operação · notificações legais (I6).
- **Fase 3 — PR-10..11:** `release` (I5 + aprovação in-system da autoridade + reparo-do-dono art.271§2) · UI liberação/fila/agendamento.
- **Fase 4 — PR-12..15:** leilão — elegibilidade/preparação/2-strikes (I8) · eventos/edital (≥15 d.u.) · liquidação cascata §6º (I7) · UI funil.
- **Fase 5 — PR-16..~18:** **dois PWAs** — authority-portal (BFF credenciado) + owner-portal (BFF público, anti-enumeração/rate-limit/PortalAccessLog I10) + hardening LGPD (I9). **secops obrigatório.** (Pode subdividir; a numeração comprime/expande conforme a fatia.)
- **Fase 6 — PR-19..20:** painel gerencial + interop Sivec-ready (outbox versionado) + varredura de invariantes + ata final + deleção dos 5 agentes efêmeros.

## 7. Registro de votos (append por PR)

### PR-00 — Fase 0 (governança + recon) — **APROVADO** (2026-07-25)
- **Recon** (`docs/rodadas/omega5p/FASE0_RECON.md`): tabela existe/estende/cria ancorada em arquivo:linha reais. Confirmado: `yard`=CRIA (Branch `:95` é organizacional, não físico), `tariffs`=ESTENDE (`Tariff:1385` já tem vigência/price-table/cliente — D-Ω5P-10), impound/CustodyEvent(hash)/charging/release/auction/2-PWAs/interop=CRIA. Reuso: WorkOrder/FieldDispatch/Attachment/ScheduledNotification/FinancialTitle(+`createPayableSourceRoutes`)/ProfessionalStatementEntry/AuditLog/`withTenantRls`/scheduler in-process (sem node-cron). D-Ω5P-01..13 **ratificados**; 2 precisões de fundação (RECON-A identidade no ImpoundProcess sem FK ao Vehicle — fecha D-Ω5P-09; RECON-B gatilho por evento dedicado idempotente). §11: Sivec/guarda-monitorada/SNE **deferidos Ω6**; conservado-sucata/categorias/veículo-sem-ID **parametrizados**.
- **Gate adversarial** (`critico-adversarial`, no lugar do `omega5p-avaliador` que ativa na próxima sessão — PR-00 é docs-only): **APROVADO_CONDICIONADO** → 5 condições aplicadas (§8 do recon): (1) âncora `FinancialEntry` `:1774`→`:1727`; (2) durabilidade do gatilho OS→custódia (transacional/sweep, não só anti-duplicação) = requisito de PR-06; (3) R1 reescopado — assinatura eletrônica da nota de leilão (ICP-Brasil) = **PD-Ω5P-SIGN + possível junta-5**, bloqueante de PR-13/14; (4) extensão de `tariffs` pela rota ServiceCatalog-por-categoria (evita troca destrutiva de unique); (5) precisões de dependência (gatilho origem-agnóstico; interop replaya de CustodyEvent). Nada CRÍTICO; nada bloqueia a Fase 1.
- **Decisão:** verde (recon íntegro + condições sanadas) → PR-00 mergeia; segue para **PR-01 `yard`**. **Ratificação oficial do `omega5p-avaliador` fica registrada para a próxima sessão** (quando o agente ativa). Novos artefatos: **PD-Ω5P-SIGN** (assinatura da nota de leilão), **D-Ω5P-RECON-A/B** (precisões de fundação).

## 8. Encerramento (a fazer no fim)
Ata final (entregas, KPIs consolidados, matriz RN×norma, pendências → backlog Ω6: PSP/PIX, SNE, Sivec real, GOV.BR, guarda monitorada, IA); deletar **SOMENTE** os 5 agentes efêmeros (registrar cada deleção); confirmar que nenhum agente pré-existente foi tocado; marcar os D-records como vigentes.
