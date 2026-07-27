# R-omega5p-pr10a — ciclo 1 (2026-07-27)

**Entrega:** Ω5P PR-10a — liberação do veículo (núcleo I5, caminho padrão) — INVARIANTE FINANCEIRO.
**Junta:** omega5p-avaliador (VETO) · agente-dba-guardiao (obrigatório) · critico-adversarial (obrigatório) · coordenador-de-acessos.

## Verdicts do ciclo 1
- **agente-dba-guardiao → APROVADO.** Migração `20260840000000` aditiva up/down/re-up drift-zero na base viva; partial-unique anti-dupla-liberação `WHERE status IN ('IN_PROGRESS','AUTHORIZED')` → 23505; 3 CHECKs IS-NOT-NULL → 23514; RLS forced+policy; FK RESTRICT I9; `process_charges` sem trigger (UPDATE settled_* legítimo, não toca amount/total). Base 0-debris.
- **omega5p-avaliador (VETO) → APROVADO.** `impound.hashchain.ts` + `IMPOUND_TRANSITIONS` intactos; I5 (5 guardas + recheck sob FOR UPDATE); freeze no Salto A; F1 via ADJUSTMENT append-only; §2.8; +9 backend. Liberação não exige trilha de notificação (gate de leilão).
- **coordenador-de-acessos → APROVADO.** `charging:settle`/`release:approve`/`release:process` nas 4 pontas; zero permissão morta; consumação exige aprovação registrada (403 approve + 409 consume sem release:approve). **Recomendação delegada:** NÃO incluir finance em `charging:settle` (finance não tem nem charging:read — settle órfão; mantém o espelho charging:*). SoD (manager concentra os atos) diferido ao authority-portal Fase 5 (D-Ω5P-12).
- **critico-adversarial → APROVADO_CONDICIONADO** (0 CRÍTICO; dupla-liberação/TOCTOU e cadeia hash RESISTIRAM, provado em Postgres real: N=6 → exatamente 1 RELEASED, 5×409). **1 MÉDIO (condição) + 3 BAIXO:**

### M1 (MÉDIO — CONDIÇÃO BLOQUEANTE, invariante financeiro)
O gate de reconciliação do freeze confere por **EXISTÊNCIA**, não por **VALOR**:
- `charge.service.ts:195-200` — `reconciliationConsistent = overAccruedDailyIds.every(id => estornoTargets.has(id))`, onde `estornoTargets` = qualquer ADJUSTMENT `total_amount<0` apontando a DAILY.
- `release-prisma.repository.ts:239-249` — re-check sob lock: `... adjustment_of_charge_id=<daily> AND total_amount<0 LIMIT 1`.
- `charge-prisma.repository.ts:111-118` / `charge.repository.ts:174-183` — o `settle` PULA a DAILY se já existe QUALQUER ADJUSTMENT negativo (`existing.length>0 → continue`).

**Cenário reachable:** insider com `charging:create` (mesma classe de `charging:settle`) posta `POST /charges {kind:ADJUSTMENT, adjustmentOfChargeId:<DAILY sobre-acumulada>, total_amount:"-0.01"}` (DAILY é alvo legal, RN-DIA-05). Efeito: `reconciliationConsistent=true` → `settle` NÃO cria o estorno correto de −total → carimba `settled_at` → gate I5 passa → RELEASED. Resultado: **Σ ledger = teto + (total_DAILY − 0,01)** por DAILY manipulada — cidadão cobrado ACIMA do teto CTB §10, imutável na cadeia. Simétrico: adjustment mais-negativo → perda de receita do pátio. A garantia "Σ ledger = teto" declarada no plano §10 **NÃO é imposta pelo gate**.

**Conserto (obrigatório):** o gate (e o re-check sob lock) deve verificar **líquido por DAILY sobre-acumulada = 0** (`total_da_DAILY + Σ(ADJUSTMENTs que a apontam) == 0`, comparação Decimal exata), NÃO a mera existência de um negativo; e o `settle`/reconciliação deve postar o **resíduo** (`−(total_DAILY) − Σ(existentes)`), não pular-se-existe-qualquer-negativo. Teste que prove: ADJUSTMENT parcial pré-existente (−0,01) → reconciliação NÃO consistente → consumação 409 até o resíduo ser postado → Σ=teto.

### BAIXO-1 (§2.8/LGPD — sanar junto)
`charge.repository.ts:82-90` (`buildSettlementEventPayload`) embute `note` (texto livre) no payload IMUTÁVEL do CustodyEvent SETTLEMENT (lido por /events e /verify; não-apagável). Se o operador digitar PII, fica na cadeia sem retificação (tensão §2.8 + direito ao apagamento). Contraste: o payload RELEASE não carrega texto livre. **Conserto:** manter `note` só na coluna de domínio RLS'd; no payload, omitir (ou hash da nota).

### BAIXO-3 (cobertura da defesa anti-TOCTOU — sanar junto)
Os re-checks sob FOR UPDATE de `release_debts_unsettled`/`release_reconciliation_pending`/`release_requirement_unmet` (a defesa do invariante financeiro) NÃO são exercidos por teste: o InMemory `consumeReleaseAtomic` confia nas flags do serviço, e o seed DB `seedReadyRelease` semeia sem débitos/requisitos/over-accrual. **Conserto:** teste DB-gated que insere um encargo não-quitado (ou over-accrual sem estorno) ENTRE `start` e um `consume` concorrente, provando que o ramo sob lock bloqueia.

### BAIXO-2 (backlog, não neste PR)
`charge.service.createManual` não checa `process.status` terminal → encargo pode ser criado sobre processo RELEASED (sink). Não des-libera (frozen), mas muta ledger/cadeia de custódia encerrada. → **backlog** (recusar encargo manual em status terminal; pequeno hardening transversal).

## Ação (ciclo 1 → dev)
Achado financeiro CRÍTICO na prática, porém cirúrgico e acionável → devolvido ao **omega5p-dev-backend** para sanar M1 (obrigatório) + BAIXO-1 + BAIXO-3. Re-verificação por **critico-adversarial** (M1 fechado por VALOR + BAIXO-3 provado) e reconfirmação leve do **avaliador** (sem regressão no charge.service/reconciliação). BAIXO-2 → backlog. Recomendação do coordenador (finance fora de charging:settle) = estado atual, sem ação.
