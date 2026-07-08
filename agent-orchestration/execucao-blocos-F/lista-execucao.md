# Lista de execução — Rodada BLOCO-AUTO-F (Módulo Controle)

> Checklist vivo (atualiza a cada PR; entra na PR seguinte). Formato após conclusão:
> `[x] <id> <nome> — PR #NN, merge <hash>, gates X/X, veredito APROVADO, testes N/M, skills, data`.
> Rodada parte de `main` pós-A–D. **F0 abre PR e PARA para aprovação humana.**

## F0 — P&D + Fundação (PR bloco-f0-pd; abre e PARA)
- [ ] docs/pd-controle.md · docs/actor-flows.md · docs/screen-element-map.md · docs/sidebar-ia.md ·
      docs/navigation-matrix.md · plano-mestre.md · lista-execucao.md · validador-mestre.md · Kpis/ preparado

## F0 — concluído
- [x] F0 P&D + Fundação — PR #141, merge bed17db, aprovado pelo humano (2026-07-07)

## F1–F12 (automático após merge da F0)
- [x] F1 Abastecimento (`FuelLog` `/api/v1/fuel-logs`) — branch `bloco-f1-abastecimento`; gate mecânico
      8/8 verde (back check/15+22/build; front check/109/build; migrate up+down `erp-postgres`; pixel-master
      2 correções); testes N=7 → **M=30** (backend 22 + front 8, ≥2N); skills saas-multi-tenant + ts-frontend
      + ui-ux-pro-max + frontend-pixel-master; **validador-mestre: VEREDITO APROVADO** (0 VETO/0 ALTA; 1 BAIXA
      → P-012 registrada); PR #NN, merge <hash> — preencher pós-merge
- [x] F2 Manutenção (`MaintenanceOrder` `/api/v1/maintenance-orders` + disponibilidade) — branch
      `bloco-f2-manutencao`; gate mecânico verde (back check/15+26/regressões WO+FD+fuel 28/build; front
      check/117/build; migrate up+down `erp-postgres`); máquina de estados 422 + concluir custo+data + R2.3
      disponibilidade (409, create-only; P-013 p/ assign) + aviso idempotente; testes N=8 → **M=34**
      (backend 26 + front 8, ≥2N); D-011 registrada; **validador-mestre: VEREDITO APROVADO** (0 VETO/0 ALTA;
      2 BAIXA informativos); PR #NN, merge <hash> — preencher pós-merge
- [~] F3 Multas (`Fine` `/api/v1/fines`) — branch `bloco-f3-multas`; gate mecânico verde (back check/15+24/
      regressões 34/build; front check/128/build; migrate up+down `erp-postgres`); máquina de estados 422 +
      cancelar admin-only (403) + `@@unique(numero_auto)` 409/201 + prazos/aviso idempotente + condutor no
      tenant (400); testes N=8 → **M=35** (backend 24 + front 11, ≥2N); D-012 registrada; **validador-mestre:
      VEREDITO APROVADO** (0 VETO/0 ALTA; P-014/P-015 informativos); PR #NN, merge <hash> — preencher pós-merge
- [~] F4 Seguros (`InsurancePolicy` `/api/v1/insurance-policies`) — branch `bloco-f4-seguros`; gate
      mecânico verde (back check/15+23/regressões 45/build; front check/139/build; migrate up+down
      `erp-postgres`); `vencida` derivada (422 se setada) + alertas 30/15/7 idempotentes + `@@unique(numero_
      apolice)` 409/201 + R4.3 adiado (P-016); testes N=7 → **M=34** (backend 23 + front 11, ≥2N); D-013
      registrada; **validador-mestre: VEREDITO APROVADO** (0 VETO/0 ALTA; P-016/P-017 informativos; Viaturas
      intocada confirmada); PR #NN, merge <hash> — preencher pós-merge
- [ ] F5 Danos (`Damage` `/api/v1/damages` + fotos reuso attachment)
- [ ] F6 Mapa Operacional real (matar operations-map.mock.ts) [até 2 sub-PRs]
- [ ] F7 Estoque (`InventoryItem`/`StockMovement`/`CycleCount`) [até 3 sub-PRs]
- [ ] F8 Remunerações (extrato por operador/período sobre commissions)
- [ ] F9 Usuários (enriquecer módulo existente)
- [ ] F10 Central de Notificações (produtores F2/F3/F4/F7 + badge real)
- [ ] F11 Sidebar + navegação por perfil (IA aprovada, matriz 9 papéis)
- [ ] F12 Cera (Mapa, Dashboard, OS lista, Multas, Manutenção)

## Relatório final (F12 concluída)
- [ ] 9/9 sub-módulos com tela+backend+navegação; 0 mocks (mapa incluso); matriz 9/9 testada; suíte
      antes→depois (+180–240); docs 5/5 por PR; KPIs com gráficos vivos; 0 cards mortos; vereditos APROVADO;
      pendências novas; rollback por PR; branch -a limpo (KPIs NÃO publicados)

---

### Baseline de testes (antes da rodada F, pós-A–D — 2026-07-07)
- Backend CI `npm test` (core-saas): 15/15 · Backend módulos novos A–D: 86 · Frontend `test:smoke`: 101/101 ·
  Flutter: 782/782 · Regressões WO/FD/contracts: 39/39.
- Meta de crescimento da rodada F: **+180–240 testes** (200% sobre ~11 sub-módulos).
