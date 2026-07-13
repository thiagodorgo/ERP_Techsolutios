# Lista de execução — RODADA Ω v3

Formato após conclusão: `[x] <fase> — PR #NN, merge <hash>, junta X/X, veredito, testes N/M, data`.

## Ω0 — Fábrica de agentes
- [x] Agentes (`cognicao-visual`, `inspetor-de-rotas`, `agente-pesquisador-web`, `master-teste-telas-rotas`,
      `planejador-mestre`, `critico-adversarial`, `estrategista`, `agente-fabrica`) + `omega/` + junta J-001
      (plano da rodada) + J-002 (MapLibre) + `docs/omega-pd.md` — **PR #158, merge 21fdf51, junta 3/3, CI 3/3, 2026-07-10**

## Ω1 — Mapa Operacional (PRIORIDADE ZERO; junta de 5 unânime)
- **Ω1a (esta fatia) — mapa real dos operadores:** MapLibre GL + OpenFreeMap (estilo nos tokens) matando o
      placeholder; pins técnico + cluster; seleção↔painel; KPIs clicáveis; filtros na URL (`?status=&team=&stale=&q=`);
      stale 3/10 min; animação ease-out; estados completos + fallback esquemático. SSE/polling já existentes
      (reaproveitados). **task-history T-001.**
- **Ω1b-1 (esta fatia — J-005) — chamados como pins:** teardrops por prioridade (urgente pulsa), painel do
      chamado, painel "Sem localização", `?limit=100` anti-truncamento, predicado único de coord. Sem migration,
      sem Nominatim (colunas de coord já existiam). **task-history T-002.**
- **Ω1b-2 (próxima fatia, declarada — J-005):** geocodificação sob demanda — migration aditiva
      `work_orders.service_geocoded_at/source` + Nominatim dev gated OFF + `POST /work-orders/:id/geocode` +
      botão "Localizar no mapa". Isolada por tocar `prisma/**` + cliente HTTP.

## Ω2 — Configurações restantes
- [x] **Ω1b-2 Geocodificação** — PR #161, merge 2d494f4, junta 5/5 (após 1 reprovação: B1 booleanFlag,
      B8 razão honesta), 2026-07-11
- [x] **Ω-ACESSO (corretivo)** — PR #162, merge 1953234, junta 4/4 com login real (após veto RBAC→D-ACESSO),
      2026-07-11 · + decisão checklist unificado PR #163
- [x] **Ω2-a.1 Tabela de Valores** — PR #164, merge 4812c45, junta 5/5, backend 11/11 + front 284/284, 2026-07-11
- [x] **Ω2-a.2 Tarifas** — PR #165, merge c26467e, junta 5/5 no ciclo 2 (veto do inspetor: B1 vigência no
      list DTO, B2 falso sucesso na edição — R-omega2a2-1), backend 19/19 + front 293/293, natural key A1
      com customer_id, 2026-07-12
- [x] **Ω2-b Filiais + Fornecedores** — PR #166, merge 2758181, junta 5/5 (4 vetos re-rodados com login real
      após limite de sessão; J-OMEGA2B), backend 27/27 + front 311/311, 2026-07-12
- [x] **Ω2-c Profissionais** (OperatorProfile 1-1 User = operador de CAMPO/guincheiro) — PR #167, merge 788290f,
      junta 5/5 no ciclo 2 (veto LGPD: list DTO expunha o selo via cnhNumber; corrigido p/ hasCnh sem o número —
      R-omega2c-1/J-OMEGA2C), backend 17/17 + front 323/323, auditoria sem CNH, 2026-07-12
- [x] **Ω2-d Tags + POI** — PR #168, merge 19d6027, junta aprovada no ciclo 2 (veto: POI list DTO omitia
      `address` → coluna/busca mortas; corrigido — R-omega2d-1/J-OMEGA2D). Tags 13/13 + pois 18/18 + front 339;
      TagAssignment declarado pendência. 2026-07-12
- [x] **Ω2-e Parâmetros** (matar settings.mock, TenantSetting key-value) — PR #169, merge 55f6ac6, junta 5/5
      no ciclo 2 (veto cognicao-visual: "Tenant Demo" na UI + value vazio; corrigido — R implícita/J-OMEGA2E),
      tenant-settings 17/17 + front 348/348, RBAC read=manager/auditor update=só admin, mock removido. 2026-07-13
- **Ω2 COMPLETO** — 8 cadastros (Fornecedores·Profissionais·Filiais·Tabela de Valores·Tarifas·Tags·POI·
      Parâmetros) em 5 PRs (#164–#169), todas as juntas 5/5. Pendências: TagAssignment (P-Ω2d), P-032/P-033.

## Ω3 — Painel Logístico avançado
- [x] **Ω3-a ServiceQuote (congela preço)** — junta 5/5 no ciclo 2 (vetos: cognicao coluna Serviço=UUID →
      referências resolvem nome; coordenador V1/V2/V3 governança de menu; achado validador quantity overflow →
      guard 422 — R-omega3a-1/J-OMEGA3A). Módulo espelho de tariffs + `findApplicable` determinístico +
      índice parcial (C1) + migration up/down/re-up. back 43 (29+14) + front 14; conjunto 99/99 + smoke 362.
      Invariante anti-refaturamento provada ao vivo. **PR #NN, merge <hash> — pendente push/merge.**
- [ ] Ω3-b Despacho web→campo endurecido + Comentários/Timeline da OS
- [ ] Ω3-c Checklist snapshot na OS (congela no despacho; decisão checklist-unificado)
- [ ] Ω3-d Anexos de OS (reuso evidence/checklist storage)
- [ ] Ω3-e Ações de OS (duplicar — NÃO copia quotes congelados/F1 · cancelar · imprimir · logs) + quotes[] no detalhe
- [ ] Ω3-f km estimado×real (ingestão via sync mobile GPS)

## Ω4 — Financeiro do tenant
- [ ] Contas · Títulos · Faturamento (anti-refaturamento) · Extrato · Caixa · Conciliação · Cheques ·
      Fechamento (trava retroativa)

## Relatório final
- [ ] matriz vídeo→tela→PR→junta→veredito (40); evidência visual do mapa (screenshots + ata 5/5); suíte
      antes→depois; task-history íntegro; relatório do inspetor; reprovações + agentes criados; burnup;
      rollback por PR. KPIs marco `…K` NÃO publicado.
