# B-ASS-08 parte 1 (PR #522) — diário do CONSERTO ÚNICO da junta J-522 (ciclo 1), incremental (P1)

- **Dev:** identidade NOVA `ass08c1-dev`, **Claude Fable 5.1 — DECLARADO** (nível de dev; §C7.6/§C7.6-bis). Não achou
  (C1 = `j522-c1`, Codex 1 · C2 = `j522-c2`, Codex 3) e não planejou (auditor de topo `j522-topo-fable`, Claude Fable 5.1) — §C7.4-bis.
  A conferência é cross-model (Codex), nunca o dev.
- **Plano (autoridade):** `erp-pausa-2026-10-03/planos/B-ASS-08-conserto-c1.md` — E1/E2/E3 **ratificadas** pelo orquestrador (~22:40 SP).
- **Ordem do dono (22:25 SP):** o desenvolvimento não para — começa pelos dois achados cravados (C2-01 R-OBX-5 GRAVE; C1-01 R-WH-6);
  os itens da C3 chegam por mensagem do orquestrador e são dobrados ANTES da bateria final.
- **Terreno:** worktree próprio `C:/Users/thiag/w-ass08c1`, ramo `feat/b-ass-08-outbox-webhooks`; `npm ci` próprio (sem junction);
  `prisma generate` com `DATABASE_URL` fictícia. Sem Docker até o T-OBX-db-3 (teto de 2 trabalhos na máquina: `ass08pg`/`ass08redis`
  da 08b = 1; C3 pode ocupar o 2º). `w-ass08` (08b), `w-rdvcomp`, `w-demoint`, `erp-*`, portas 3000/5173/5432/6379: intocados.
- **Objeto julgado:** `92d644db` (head do PR #522). Os arquivos do conserto (`outbox/**`, `webhook.rate-limit.ts`, `statement.service.ts`,
  os 5 testes `ass-08-*` e o T13) são **byte-idênticos** entre `92d644db` e o head mesclado (`git diff --stat 92d644db HEAD -- …` vazio),
  logo o vermelho-controle medido no head antes do conserto é o vermelho-controle no objeto.

| fatia | comando | saída resumida | veredito parcial |
|---|---|---|---|
| T0 | `git worktree add -B feat/b-ass-08-outbox-webhooks C:/Users/thiag/w-ass08c1 origin/feat/b-ass-08-outbox-webhooks` → `git merge --no-edit origin/main` | head `92d644db` → merge limpo `b301c817` (main: #521 `89f1d38e`, #520 `e7e8d678`, #524 `9ff111e6`); `git diff --name-only origin/main...HEAD` = 45 arquivos (o PR) | ramo atualizado com a `main`, sem conflito (interseção vazia, como o plano mediu) |
| T0 | `npm ci --no-audit --no-fund`; `DATABASE_URL=postgresql://x:x@127.0.0.1:1/x npx prisma generate` | `added 326 packages`, exit 0; client gerado | terreno pronto |
| T0 | baseline ANTES do conserto: `npm test -- tests/ass-08-outbox tests/ass-08-webhook-router tests/ass-08-charges-profile tests/ass-08-flow-e2e tests/ass-08-reconcile-settlement tests/ass-08-chargeback-reversal` | 6 arquivos · `# tests 39 · pass 39 · fail 0` | o verde que o conserto não pode enfraquecer |
| F-c1 | `outbox.types.ts` (+`StatementClaimSnapshot`, `ClaimVerdict`, `ClaimNeedsReviewCode`; `OutboxSkipReason` INALTERADO) · `outbox.dispatcher.ts` (`export function chargeCreateClaimVerdict`, pura; `runDispatchOutbox` passa `verdict` e trata `claimed`/`skipped`/`needs_review`) · `outbox.repository.ts` (`ClaimParams.verdict` OBRIGATÓRIO; `ClaimResult` discriminado; dublê exige `readStatement` no construtor e OR-a `hasLiveCharge` com a própria fila; órfã não passa pela política) · `outbox.prisma.ts` (`claimNext` em 3 passos no MESMO `withTenantRlsBudget`: SELECT … FOR UPDATE SKIP LOCKED → SELECT do demonstrativo + cobrança viva INLINE no callback → UPDATE PROCESSING/SKIPPED/NEEDS_REVIEW) | `npm run check` com `src` novo e call-sites antigos → **2 erros**, ambos em `outbox.prisma.ts:129/131` (forma antiga de `ClaimResult`) — o `tsc` cobre `src/**`, não `tests/**` | fail-closed por construção provado onde o compilador alcança |
| F-c1 | call-sites de teste ANTIGOS sobre o `src` novo (tsx não tipa): `npm test -- tests/ass-08-outbox tests/ass-08-charges-profile tests/ass-08-flow-e2e` | `# tests 15 · pass 6 · fail 9` — `TypeError: this.readStatement is not a function` ×8 e `Cannot read properties of undefined (reading 'readStatement')` ×1 (construtor sem argumento) | fail-closed em RUNTIME nos 9 call-sites que o compilador não vê: sem leitor, o dublê não reclama linha nenhuma |
| F-c1 | ligação dos call-sites: `ass-08-outbox` (stub explícito `alwaysClosed` ×9 + `verdict: chargeCreateClaimVerdict` nos 2 `claimNext` diretos + `assert.equal(claimed.kind, "claimed")`), `ass-08-charges-profile` (stub), `ass-08-flow-e2e` (leitor REAL: `statements.findStatement` + `charges.findLive`), `ass-08-channel-db` (`verdict` no T-OBX-db-1 + `kind === "claimed"`; `seedStatement` passa a semear `closed`, R$ 100, `closed_at = now()` — o estado em que a linha É elegível) → `npm run check`; as 6 suítes | `tsc` exit 0; `# tests 39 · pass 39 · fail 0 · skipped 0` | T-OBX-1..12, T-CHG, T-FLX, T-SET, T-CB verdes sem enfraquecer asserção nenhuma |
