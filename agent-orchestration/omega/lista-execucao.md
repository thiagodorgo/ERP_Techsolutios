# Lista de execução — RODADA Ω v3

Formato após conclusão: `[x] <fase> — PR #NN, merge <hash>, junta X/X, veredito, testes N/M, data`.

## Ω0 — Fábrica de agentes
- [~] Agentes (`cognicao-visual`, `inspetor-de-rotas`, `agente-pesquisador-web`, `master-teste-telas-rotas`,
      `planejador-mestre`, `critico-adversarial`, `estrategista`, `agente-fabrica`) + `omega/` + junta J-001
      (plano da rodada) + J-002 (MapLibre) + `docs/omega-pd.md` — branch `omega-0-agentes`

## Ω1 — Mapa Operacional (PRIORIDADE ZERO; junta de 5 unânime)
- [ ] MapLibre GL + OpenFreeMap (estilo nos tokens) matando o placeholder do GoogleMapsCanvas;
      pins técnico/chamado + cluster; painel lateral vivo; KPIs clicáveis; filtros na URL; stale 3/10min;
      SSE com fallback polling; animação de pins; geocodificação (migration aditiva work_orders lat/lng +
      Nominatim dev + "sem localização"); estados completos

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
