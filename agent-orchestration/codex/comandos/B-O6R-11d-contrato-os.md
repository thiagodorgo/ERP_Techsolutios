# B-O6R-11d — o contrato da OS entre o app e o backend: viatura e equipe com o técnico declarado (item 3 do portão, resto do `Ω6R-QUA-004`)

- **Ramo:** `fix/mobile-os-contrato-b-o6r-11d`
- **Papel desta execução:** DEV; não planeja, não critica e não vota.
- **Executor:** `dev-11d-cl`, Claude **Opus** 5.5 (subagente da sessão; nível menor, declarado, §C7.6). **Exceção declarada** (§C7 itens 6 e 11(6)): as duas contas Codex sem cota semanal até 16/11, a API reservada para verificação e o Antigravity no limite de 5 h. A pré-revisão e a conferência ficam com outro modelo, pela API.
- **Plano canônico:** `docs/revisoes/SAN3/B-O6R-11d-plano.md` (v2 de `replano-B-O6R-11d-api`, Claude Opus 5.5 pela API, topo por fallback declarado), com a **Emenda 1** (os 8 requisitos da crítica r2 `crit-11d-r2-cl`, APROVADO COM AJUSTES). A emenda prevalece.
- **Decisão do dono:** `D-DONO-TODAS-RECOMENDACOES-1111` (11/11), **Q1 = A**: o app declara que o envio vale se o técnico ainda for o que ele conhecia; se não for, o servidor responde conflito, e o item fica em conflito na fila para decisão manual.
- **Diário do dev:** `docs/revisoes/SAN3/B-O6R-11d-dev.md` (comando → saída → veredito de cada fatia e de cada mutação).
- **Nível:** junta completa (permissão, perda de dado e isolamento; §C7 item 10(1)). KPI congelado (§C7 item 8(5)).

## As propriedades

1. **P1, leitura.** Toda resposta de OS que o app lê (lista, detalhe, status, atribuição e linha do tempo) é lida na forma
   que o backend emite: envelope `{data}` desembrulhado, camelCase do DTO, status e prioridade por UM codec
   (`mobile/flutter_app/lib/core/network/work_order_api_codec.dart`). OS única sem id é resposta inesperada.
2. **P2, escrita.** O PATCH de status só manda status que existe no backend (os 4 sem equivalente — `pendingApproval`,
   `approved`, `exception`, `rejected` — são `ArgumentError` sem requisição); o POST assign manda `userId`/`message`. A
   fila de status manda exatamente o que mandava (`d5ec1696`).
3. **P2-bis, atribuição sem regressão de permissão.** A ação `work_order.assign` da fila (viatura/equipe) manda `user_id`
   e declara `expected_technician_id`. O servidor (`src/modules/mobile/mobile-work-order-sync.ts`,
   `assertExpectedTechnician`) responde `409 technician_changed_since_action` — em `conflicts[]` — se o técnico da OS
   mudou depois de a ação nascer. Sem a chave, nada muda. Só restringe.
4. **P3, organização.** A organização da OS nunca vem do corpo: na lista, a da sessão; nos 3 métodos de OS única, vazia
   por contrato, com a guarda G1(e) impedindo ligá-los sem decisão (`P-MOBILE-OS-UNICA-SEM-ORGANIZACAO`).

## Contrato público

O REST de OS não muda. O lote `POST /api/v1/mobile/sync/work-order-actions` aceita, no `work_order.assign`, a chave
opcional `expected_technician_id` (id de usuário; não é organização, token nem caminho, §2.8). Presente e diferente do
técnico da OS (`assignedUserId ?? assignedOperatorId`), ou `null`, vazia, de outro tipo, ou OS sem técnico → a ação vai a
`conflicts[]` com `conflict_type: technician_changed_since_action` e `next_action: refresh_work_order_and_retry`, nada
gravado. Contrato versionado: `mobile_work_order_assign_expected_technician@2026-11-11.b-o6r-11d`.

## Validação

A bateria final do §6 do plano (com `python`, CR2-11D-06), mais o §9 do contrato: Flutter (`dart format`, `flutter
analyze`, os 5 testes do bloco, as regressões, a suíte inteira); Node (`tests/b-o6r-11d-*`, `o6r07c-b-scope`,
`mobile-work-order-assign-registry`); `npm run check`, `lint`, `test` (forma do job `backend`), `build`; e, pela trava do
#536, `tests/b-san3-23-cancel-race-db.test.ts` com `# skipped 0`. A rodada R-M de todas as mutações (§3), uma por vez,
vermelhas e restauradas. Sem `prisma/**`, `.github/**`, `frontend/**`, `Kpis/**`, lockfiles nem `.env`.
