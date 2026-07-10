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
- [ ] Fornecedores · Profissionais (OperatorProfile) · Filiais · Tabela de Valores · Tarifas · Tags · POI ·
      Parâmetros (matar settings.mock)

## Ω3 — Painel Logístico avançado
- [ ] ServiceQuote (congela preço) · comentários/timeline · anexos (reuso evidence) · duplicar/cancelar/
      imprimir/logs · km estimado×real

## Ω4 — Financeiro do tenant
- [ ] Contas · Títulos · Faturamento (anti-refaturamento) · Extrato · Caixa · Conciliação · Cheques ·
      Fechamento (trava retroativa)

## Relatório final
- [ ] matriz vídeo→tela→PR→junta→veredito (40); evidência visual do mapa (screenshots + ata 5/5); suíte
      antes→depois; task-history íntegro; relatório do inspetor; reprovações + agentes criados; burnup;
      rollback por PR. KPIs marco `…K` NÃO publicado.
