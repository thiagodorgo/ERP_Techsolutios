# Plano-mestre — RODADA Ω v3 (cobertura dos 40 vídeos + Mapa Operacional em nível de venda)

> Herda TODAS as regras A–F: serviço completo (zero mock), regra do espelho, migrations aditivas
> up/down testadas, delete lógico, cota 200%, docs vivas por PR, KPIs+burnup por merge, ciclo Git
> completo, padrões P1–P6, Decimal p/ dinheiro, timestamptz, PT-BR. **KPIs atualizados no próprio PR**
> (D-KPI-PER-PR, 2026-07-13; a política de marco `…K` pós-avaliação humana foi **revogada**).

## Governo por juntas (no lugar da aprovação humana)
Toda decisão que seria humana passa por **junta de ≥3 agentes**, maioria vence, votos+justificativa em
`omega/juntas/J-<n>-<tema>.md`. Empate → +1 agente pertinente; empate persistente = reprovação (entra no
protocolo). **Regra da dúvida:** qualquer dúvida instancia `agente-pesquisador-web` (≥3 fontes) →
`docs/omega-pd.md`. Dúvida sem pesquisa = veto.

## Protocolo de reprovação escalonada (regra suprema) — CRIAR AGENTES ANTES DE PARAR
Por entrega reprovada, ciclos 1–5 (registro em `omega/reprovacoes/R-<entrega>-<ciclo>.md`): **ciclos 1–2 = a
`agente-fabrica` CRIA 1–2 especialistas sob medida** para o problema (entram na junta seguinte e votam) ANTES
de qualquer parada; ciclo 3 = crítico-adversarial reabre a premissa + pesquisa web ≥5 fontes (teto 6 agentes);
ciclos 4–5 = junta ampliada replaneja a fatia. Ciclo 5 ainda reprovado = PARADA + dossiê ao humano.
**Paradas imediatas (estruturais — lista encolhida, D-SAN-AUTONOMIA 2026-07-13):** migration destrutiva;
exposição de segredo; ação irreversível em produção sem junta unânime prévia. (A antiga parada por "integração
externa" **saiu** — vira decisão de junta de 5 unânime + PD. Conflito com main / falha de push = rebase/retry,
não parada. Rodadas de infra somam temporariamente: falta de credencial/pagamento/domínio externo.)

## Fases
- **Ω0 — Fábrica de agentes** (PR `omega-0-agentes`): agentes + `omega/` + junta J-001. ✅ este PR.
- **Ω1 — Mapa Operacional** (PRIORIDADE ZERO; junta de 5, unânime): MapLibre GL + OpenFreeMap (J-002),
  pins/cluster/painel/KPIs/filtros/estados/geocodificação. **Sai antes de tudo.**
- **Ω2 — Configurações restantes**: Fornecedores, Profissionais (OperatorProfile), Filiais, Tabela de
  Valores (PriceTable), Tarifas, Tags, POI, Parâmetros (matar settings.mock).
- **Ω3 — Painel Logístico avançado**: ServiceQuote (congela preço no aprovar), comentários/timeline,
  anexos (reuso evidence), duplicar/cancelar/imprimir/logs OS, km estimado×real (haversine + trilha).
- **Ω4 — Financeiro do tenant**: Contas, Títulos, Faturamento (anti-refaturamento), Extrato, Caixa,
  Conciliação, Cheques, Fechamento (trava retroativa). NF-e = pendência (fora do v1).

## Pipeline por tela (Ω2→Ω4)
pesquisa (web) → planejador-mestre → crítico-adversarial (máx 2) → código → task-history + screen-element-map
→ cognicao-visual (ficha+veto) → inspetor + master-teste → validador de fluxo → JUNTA da tela (≥3) →
gates mecânicos + cota 200% + docs vivas + KPIs/burnup + Git.

## Único dep pré-aprovado
`maplibre-gl` (Ω1). Qualquer outra dependência exige junta unânime (senão = parada estrutural).
