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
      → P-012 registrada); PR #142, merge 1950ade
- [x] F2 Manutenção (`MaintenanceOrder` `/api/v1/maintenance-orders` + disponibilidade) — branch
      `bloco-f2-manutencao`; gate mecânico verde (back check/15+26/regressões WO+FD+fuel 28/build; front
      check/117/build; migrate up+down `erp-postgres`); máquina de estados 422 + concluir custo+data + R2.3
      disponibilidade (409, create-only; P-013 p/ assign) + aviso idempotente; testes N=8 → **M=34**
      (backend 26 + front 8, ≥2N); D-011 registrada; **validador-mestre: VEREDITO APROVADO** (0 VETO/0 ALTA;
      2 BAIXA informativos); PR #143, merge 59decac
- [x] F3 Multas (`Fine` `/api/v1/fines`) — branch `bloco-f3-multas`; gate mecânico verde (back check/15+24/
      regressões 34/build; front check/128/build; migrate up+down `erp-postgres`); máquina de estados 422 +
      cancelar admin-only (403) + `@@unique(numero_auto)` 409/201 + prazos/aviso idempotente + condutor no
      tenant (400); testes N=8 → **M=35** (backend 24 + front 11, ≥2N); D-012 registrada; **validador-mestre:
      VEREDITO APROVADO** (0 VETO/0 ALTA; P-014/P-015 informativos); PR #144, merge 48788d1
- [x] F4 Seguros (`InsurancePolicy` `/api/v1/insurance-policies`) — branch `bloco-f4-seguros`; gate
      mecânico verde (back check/15+23/regressões 45/build; front check/139/build; migrate up+down
      `erp-postgres`); `vencida` derivada (422 se setada) + alertas 30/15/7 idempotentes + `@@unique(numero_
      apolice)` 409/201 + R4.3 adiado (P-016); testes N=7 → **M=34** (backend 23 + front 11, ≥2N); D-013
      registrada; **validador-mestre: VEREDITO APROVADO** (0 VETO/0 ALTA; P-016/P-017 informativos; Viaturas
      intocada confirmada); PR #145, merge 639ebb1
- [x] F5 Danos (`Damage` `/api/v1/damages` + fotos reuso attachment) — branch `bloco-f5-danos`; gate
      mecânico verde (back check/15+19/regressões 34 incl. checklist intocado/build; front check/150/build;
      migrate up+down 2 tabelas `erp-postgres`); máquina de estados 422 + fotos via reuso do storage (D-014;
      DTO sem internals; 415/413) + OS de origem; testes N=7 → **M=30** (backend 19 + front 11, ≥2N); D-014
      registrada; pixel-master + **workflow adversarial de segurança (4 probes SAFE)** + **validador-mestre:
      VEREDITO APROVADO** (0 VETO/0 ALTA; P-018 LOW; doc-drift §F5/D-014 corrigido); PR #146, merge 72729b4
- [x] F6 Mapa Operacional real (matar operations-map.mock.ts) — branch `bloco-f6-mapa-real`; 1 PR (as 3
      fontes reais já estavam ligadas); mock morto + painel lateral + stale 15min + badges F2/F4 com
      deep-link real (`?vehicle=` adicionado à ManutencaoPage p/ honrar a LEI) + preservação de dados em
      falha de poll (§7) + UUID mascarado; D-015 (grant seguro ao despachante + `vehicleId` no DTO de lista
      de OS); gate verde (front check/**163**/build; back check/15/regressões WO+frota verdes/build);
      testes N=6 → **M=18** (13 novos + lockstep); pixel-master 4 correções; **validador-mestre: VEREDITO
      APROVADO** (0 achados; 0 cards mortos); PR #147, merge 25bed8e
- [~] F7 Estoque (`InventoryItem`/`StockMovement`/`CycleCount`) [2 sub-PRs previstos no plano]
  - [~] **F7a core** (itens + movimentações) — branch `bloco-f7a-estoque-core`; saldo derivado em `$transaction`
        (409 `insufficient_balance`) + movimentos imutáveis + consumo por OS + custo médio móvel; D-016
        registrada; gate mecânico verde (back check/15+25/regressões 29/build; front check/**178**/build;
        migrate up+down 2 tabelas `erp-postgres`); testes N=8 → **M=40** (backend 25 + front 15); fidelidade
        revisada inline (pixel-master indisponível por limite de sessão); **validador-mestre: VEREDITO
        APROVADO** (0 VETO/0 ALTA; P-020 corrida de saldo BAIXA); PR #NN, merge <hash> — pós-merge
  - [~] **F7b avançado** (ABC + ponto de pedido + contagem cíclica) — branch `bloco-f7b-estoque-abc`;
        estende o módulo F7a; ABC recalc (Pareto 12m) + ponto de pedido derivado + aviso idempotente +
        `CycleCount`/`CycleCountEntry` (fechar gera ajuste real via fluxo transacional F7a) + aba Contagem
        (legítima); FK diferida `stock_movements.cycle_count_id`; D-017; gate verde (back check/15+16/
        **F7a regressão 25**/build; front check/**187**/build; migrate up+down F7a→F7b `erp-postgres`);
        testes N=5 → **M=25** (backend 16 + front 9); fidelidade inline; **validador-mestre: VEREDITO
        APROVADO** — 1 MÉDIA (close idempotente) + 1 BAIXA (audit) **corrigidas no bloco** (P-021/P-022);
        PR #NN, merge <hash> — pós-merge
- [~] F8 Remunerações (extrato por operador/período sobre commissions) — branch `bloco-f8-remuneracoes`;
      in-module (sem remodelar): rota agregada `statements/summary` + `my-summary` (read_own fixa operador;
      403 cruzado testado) + drill-down por origem (`sourceType`/`sourceId`; OS-link só p/ work_order — D-018);
      bug latente do uuidPattern corrigido; sem migration; testes N=6 → **M=26** (backend 13 + front 13);
      gate verde (back check/15+20/build; front check/**201**/build); fidelidade inline; **validador-mestre:
      REPROVOU 1x (ALTA: drill do operador chamava rota `commissions:read` → 403 p/ o read_own; BAIXA: id
      cru) → corrigido (rota `GET /commissions/calculations/mine` read_own + drawer own-scope; origem sem id)
      → 2ª passada VEREDITO APROVADO**; testes N=6 → M=28 (backend 17 + front 11); PR #NN, merge <hash> — pós-merge
- [~] F9 Usuários (enriquecer módulo existente) — branch `bloco-f9-usuarios`; matou a shell fabricada de
      `/users` (tela real + modal + ativar/desativar); backend `updateUser` + `PATCH /users/:id`
      (`users.manage`, cross-tenant 404, audit `user.updated`, paridade prisma); guard `users:read`→
      `users.read` (D-019; sidebar/vocab restante = F11/P-024); "Convidados"→"Total" (enum sem invited);
      "último acesso" sem fonte → "Criado em" (P-023); sem migration; testes N=5 → M≥10 (back +11, front +10);
      gate verde (back check/**26**/regressões 14/build; front check/**211**/build); fidelidade inline;
      **validador-mestre: em avaliação**
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
