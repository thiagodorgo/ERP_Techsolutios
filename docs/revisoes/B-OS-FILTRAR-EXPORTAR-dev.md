# B-OS-FILTRAR-EXPORTAR — relatório de desenvolvimento

> **Desenvolvedor:** `dev-b-os-filtrar-exportar` (não planejou; não revisa).
> **Papel:** `frontend-pixel-master`, subordinado ao plano e ao `CLAUDE.md` §11.
> **Modelo:** Codex GPT-5.6 Sol — substituição declarada por `D-FABLE-ASTRA-SO-DINHEIRO`; o bloco não toca dinheiro.
> **Worktree exclusivo:** `C:/Users/AMP/w-osfe` · ramo `feat/web-os-filtrar-exportar`.
> **Base de comparação do plano:** `c8af6458` · head inicial medido: `5d8d8f4d88127c16503f30ceca1eaf76458c8c13`.

## Evidência incremental (P1)

### Pré-voo de ref — CONCLUÍDO

- Comando: `git -C C:/Users/AMP/w-osfe rev-parse HEAD` e `git -C C:/Users/AMP/w-osfe ls-remote origin feat/web-os-filtrar-exportar`.
- Saída resumida: local = remoto = `5d8d8f4d88127c16503f30ceca1eaf76458c8c13` (N=2 refs, forma=SHA completo).
- Resultado: worktree e ramo remoto conferem com o prefixo esperado `5d8d8f4d`; desenvolvimento liberado.

### Preparação §8.0 — CONCLUÍDO

- Comando: `timeout 900 npm ci`; `timeout 900 npm --prefix frontend ci`; `DATABASE_URL=postgresql://gen:gen@127.0.0.1:5432/gen timeout 300 npm run db:generate` (variável restrita ao processo de geração).
- Saída resumida: raiz adicionou 326 pacotes (ec 0); frontend adicionou 103 pacotes (ec 0); Prisma Client 7.8.0 gerado em 3,00 s (ec 0). N=2 instalações próprias + 1 geração; nenhum banco/servidor iniciado.
- Resultado: dependências próprias do worktree prontas, sem junction, sem copiar `.env` e sem variável de banco persistida na sessão.

### Passo 1 — A4 + página consumidora — CONCLUÍDO

- Comando: `timeout 1200 npm --prefix frontend run test:smoke`.
- Saída resumida: TAP `# tests 1242`, `# pass 1242`, `# fail 0`, `# skipped 0`, ec 0; duração 154636 ms.
- Resultado: `WORK_ORDER_PRIORITY_LABEL` e `workOrderServiceLine` movidos para `work-orders-row.logic.ts`; a página consome as duas fontes únicas sem alteração visual/comportamental.

### Passo 2 — A5 + LT* + RL1 — CONCLUÍDO

- Comando: `cd frontend && timeout 600 node --test --import tsx tests/work-orders-list-tools.test.ts`; `timeout 600 npm --prefix frontend run check`.
- Saída resumida: arquivo puro `7/7`, 0 falha, 0 pulado (LT1–LT6 + RL1); TypeScript `tsc -b --noEmit` ec 0.
- Resultado: estado, atalhos, datas locais, limites ISO, contagem e intervalo invertido implementados; N=7 testes novos verdes.

### Passo 3 — A6 + EX* — EM APURAÇÃO

- Comando: EM APURAÇÃO.
- Saída resumida: EM APURAÇÃO.
- Resultado: EM APURAÇÃO.

### Passo 4 — A3 + AD1 — EM APURAÇÃO

- Comando: EM APURAÇÃO.
- Saída resumida: EM APURAÇÃO.
- Resultado: EM APURAÇÃO.

### Passo 5 — A2, guarda de ordem — EM APURAÇÃO

- Comando: EM APURAÇÃO.
- Saída resumida: EM APURAÇÃO.
- Resultado: EM APURAÇÃO.

### Passo 6 — A7 + A8 — EM APURAÇÃO

- Comando: EM APURAÇÃO.
- Saída resumida: EM APURAÇÃO.
- Resultado: EM APURAÇÃO.

### Passo 7 — A1, integração da página — EM APURAÇÃO

- Comando: EM APURAÇÃO.
- Saída resumida: EM APURAÇÃO.
- Resultado: EM APURAÇÃO.

### Passo 8 — A10 + A12 — EM APURAÇÃO

- Comando: EM APURAÇÃO.
- Saída resumida: EM APURAÇÃO.
- Resultado: EM APURAÇÃO.

### Passo 9 — bateria, mutações, QA e limpeza — EM APURAÇÃO

- Comando: EM APURAÇÃO.
- Saída resumida: EM APURAÇÃO.
- Resultado: EM APURAÇÃO.

## Mutações §7.3

| Mutação | Testes esperados vermelhos | Hash inicial | Resultado | Hash restaurado |
|---|---|---|---|---|
| N-ISO-CRU | LT2, LT3, FE5 | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |
| N-FIM-DO-DIA | LT2, LT3, FE5 | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |
| N-DATA-AGENDA | AD1 | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |
| N-SEQ | FE7 | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |
| N-TICK | FE8 | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |
| N-STABLE | FE4, FE5, FE6, FE8 | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |
| N-SELO | FE4 | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |
| N-EXP-SEMPRE | FE2 | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |
| N-403-MOSTRA | FE2, FE10 | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |
| N-EXP-PAGINA | FE3 | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |
| N-EXP-HOOK | FE9 | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |
| N-VAZIO | FE6 | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |
| N-FORMULA | EX4 | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |
| N-ID | EX1, EX3 | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |
| N-TEC | EX2, EX3 | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |
| N-HINT | EX6 | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |

## Checklist — B-OS-FILTRAR-EXPORTAR · desenvolvimento

**Solicitado:**

- [ ] A1 — `WorkOrdersPage.tsx`: cabeçalho, filtros, vazio, exportação e comentários. EM APURAÇÃO.
- [ ] A2 — `useWorkOrders.ts`: guarda de ordem das respostas. EM APURAÇÃO.
- [ ] A3 — `work-orders.adapter.ts`: período por `createdAt`. EM APURAÇÃO.
- [ ] A4 — `work-orders-row.logic.ts`: rótulos de prioridade e linha do serviço. EM APURAÇÃO.
- [ ] A5 — `work-orders-list-filters.ts`: estado e funções puras de filtro. EM APURAÇÃO.
- [ ] A6 — `work-orders-export.ts`: CSV em allowlist e disponibilidade. EM APURAÇÃO.
- [ ] A7 — `WorkOrdersListFilterCard.tsx`: cartão de filtros acessível. EM APURAÇÃO.
- [ ] A8 — `app.css`: somente `.pat-btn--engaged` e `.pat-btn__count`. EM APURAÇÃO.
- [ ] A9 — `work-orders-list-tools.test.ts`: LT*, RL1 e EX*. EM APURAÇÃO.
- [ ] A10 — `work-orders-page-live.test.tsx`: FE1–FE10 e arnês mínimo. EM APURAÇÃO.
- [ ] A11 — `work-orders.adapter.test.ts`: AD1. EM APURAÇÃO.
- [ ] A12 — `frontend/package.json`: teste puro ao fim de `test:smoke`. EM APURAÇÃO.
- [ ] A13 — este relatório incremental e checklist final. EM APURAÇÃO.

**Feito:** EM APURAÇÃO.

**Não feito / divergências:** EM APURAÇÃO.

**Validação:** EM APURAÇÃO.

**Head empurrado:** EM APURAÇÃO.

**Próximos passos (análise):** EM APURAÇÃO.
