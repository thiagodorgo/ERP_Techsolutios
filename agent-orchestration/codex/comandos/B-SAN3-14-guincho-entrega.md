# B-SAN3-14 — a entrega do guincho alcançável no app, com trava no servidor (item 34 do portão)

- **Ramo:** `fix/mobile-guincho-entrega`
- **Papel desta execução:** DEV; não planeja, não critica e não vota.
- **Executor:** `dev-14-cl`, Claude **Opus 5.5** (subagente da sessão; nível menor, declarado, §C7.6), cobrindo o Codex (as duas contas Codex sem cota semanal até 16/11, a API reservada para verificação e o Antigravity no limite de 5 h; `D-IAS-EXTERNAS-PRIMEIRO`, exceção declarada). A pré-revisão e a conferência são de outro modelo, pela API (§C7 item 11).
- **Plano canônico:** `plano-B-SAN3-14-v2.md` (Claude Opus 5.5 pela API, topo substituto declarado) e a `plano-B-SAN3-14-emenda1.md` (prevalece sobre o v2).
- **Decisão do dono:** `D-DONO-TODAS-RECOMENDACOES-1111` (11/11 10:31 SP, "Sim, todas (Recomendado)"): Pergunta 1 = **(a)**, a trava da conclusão no servidor; Pergunta 2 = **(a)**, as OS em campo ficam como hoje; Pergunta 3 = **(a)**, maquete com 3 opções aprovada e o app sai só com a A; Pergunta 4 = **(a)** (leitura do dev, declarada: o mandato manda valer a recomendação de cada pergunta do §9, e a emenda 1 traz a 4 com recomendação (a)), a entrega concluída com divergência não segura a OS.
- **Diário do dev:** `revisoes/dev-14-cl-progresso.md` e `revisoes/dev-14-cl-mutacoes.md` (fora do repositório, na pasta do orquestrador).
- **Nível:** junta completa (a vistoria é unidade cobrada; o dossiê de custódia é prova; §C7 item 10(1)). KPI congelado (§C7 item 8(5)).

## As propriedades

1. **P1′ — o app antigo não vê o que não entende.** `GET /mobile/checklist-runs` sem `roleAware=1` não devolve a vistoria de entrega e não tem a chave `role` (contrato `checklist_run_role@2026-11.b-san3-14`, no lugar do guard `[BLOQ 4]`).
2. **P1 — a fase vem do servidor e casa pela fase local.** O app pede `roleAware=1`, lê `role` por `MobileChecklistRunKind.fromServerRole` (`collection`/`generic`/`null` → coleta; `delivery` → entrega; o resto → `unknown`) e casa por (modelo, fase), sem atalho: sem par, não há `serverId`.
3. **P1″ — a reabertura herda a fase** (memória e Prisma).
4. **P2 — a entrega congelada no despacho vira execução** (`dispatch:<os>:<modelo>:delivery`, idempotente) e deixa de ser diferida; a reatribuição recria a entrega congelada e respeita a trava de congelamento (`checklist_not_frozen`). As outras secundárias seguem diferidas.
5. **P3 — os passos "Rota entrega" (3) e "Entrega" (4) acendem** pela perna do guincho (`TowLeg`/`deriveTowLeg`), função das vistorias confirmadas.
6. **P4 — toda navegação para a vistoria passa pelo helper** `checklistRunLocation`, com a fase obrigatória; a varredura de `lib/` prende isso.
7. **P5 — a OS de guincho com entrega confirmada só conclui com a entrega concluída**: no app (tela e repositório, `deliveryComplete` obrigatório) e no servidor (`changeStatus` → `422 WORK_ORDER_UNPROCESSABLE / delivery_checklist_pending`, fail-closed na leitura). A OS sem vistoria de entrega conclui como antes.
8. **P6 — a entrega está no aparelho antes da estrada**: pré-carga no passe de sync e ao abrir a execução, sem duplicar nem apagar; sem sinal, só a entrega confirmada abre (`deliveryUnverified`).

## Contrato público

- `GET /api/v1/mobile/checklist-runs?workOrderId=…[&checklistId=…][&roleAware=1]`: com `roleAware=1`, a entrega e `role`; sem ele, a lista de antes.
- `PATCH /api/v1/work-orders/:id/status` e o sync de OS: concluir com vistoria de entrega em andamento → `422 WORK_ORDER_UNPROCESSABLE / delivery_checklist_pending`, "Conclua a vistoria de entrega antes de concluir a OS." (no sync, `rejected`, sem recibo; a mesma ação é aceita depois).
- Documentado em `API_CONTRACTS.md` e `docs/claude-code-handoff/API_CONTRACTS.md`.

## Validação

Backend: `npm run check`, `npm run lint`, `npm test` (forma do job `backend`), `npm run build`,
`node --test --import tsx tests/mobile-backend-contracts.test.ts tests/field-dispatch-multi-checklist.test.ts tests/bsan314-reabertura-fase.test.ts tests/bsan314-trava-conclusao.test.ts`,
`tests/bsan314-provisao-entrega-db.test.ts` em Postgres descartável (papel efêmero `NOSUPERUSER NOBYPASSRLS`, `# skipped 0`),
`node scripts/migration-transaction-guard.mjs` (0 migração nova). App: `dart format --set-exit-if-changed lib test`,
`flutter analyze`, os 4 arquivos `bsan314_*_test.dart` e `flutter test`. Sempre `git diff --check`. As 42 mutações do
plano (v2 §3 + emenda 1), uma por vez, vermelhas por asserção e revertidas. Sem `prisma/**`, `.github/**`, `Kpis/**`,
`router.dart`, `sync_replay_service.dart` nem `mobile-work-order-sync.ts`.
