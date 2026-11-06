# B-ASS-04 — demonstrativo mensal — relatório do dev

Plano: `B-ASSINATURA` §4.4 (fora do repositório, `erp-pausa-2026-10-03/planos/B-ASSINATURA-plano.md`).

**Papéis (declarados)**
- **Dev:** dividido pelo dono entre dois "devs de plantão" (06/11 ~08:00 SP: *"vc e o deepseek sao os desenvolvedores de plantão hoje"*).
  - `dev-ass04-opus` (Claude Opus 5.5, esforço médio) faz o motor e as regras de dinheiro, de F0 a F3.
  - O DeepSeek faz o banco, na F4, num ramo próprio.
- **Revisão:** do DeepSeek, que é de outro modelo. Um revisor sênior em esforço alto, mais um **segundo revisor só do cálculo** (dono: *"pode fazer o segundo revisor só para o cálculo"*). Depois vêm a conferência e o porteiro.

## F0 — comando e terreno

- **Worktree:** `C:/Users/thiag/w-ass04`, no ramo `feat/b-ass-04-demonstrativo`, a partir da `origin/main` `3470db1e` (com o B-ASS-03).
- **Migrações:** a M3 (5 tabelas) e a M3b (permissões) estão cobertas pela fala do dono de 31/10 ~22:15. A M3b é uma das 3 migrações de dados da P1.
- **Lições do B-ASS-02/03** (Emendas 2–4 ao §4.2 e Emenda 1 ao §4.3): os guards de superfície (censo o6r07c, ratchet san3-05 e as contagens fixas de tabelas e endpoints) são regenerados pelo gerador, com o diff só nas chaves novas.

## F1 — motor puro do demonstrativo (`statements/statement.engine.ts`) + `billing.constants.ts`

- **Dinheiro em centavos inteiros.** O espaço fica em milésimos de GB, também inteiros. O "half-up" é feito por divisão inteira (`halfUpDiv`). Bytes viram milésimos de GB com teto a 0,001 (`bytesToMilliGbCeil`, em BigInt).
- **Pro-rata** diário por segmento: `prorate`. **Total**: `computeStatement`. **Recálculo** pelo snapshot: `recompute`. Também estão no motor `activeDayRange` (janela `[validFrom, validTo)` em datas SP), `daysInPeriod` e `countDistinctVehiclesInMonth` (G15).
- **Teste** `tests/ass-04-statement-engine.test.ts`: T-ST-1..8 e T-ST-37..41 = **13/13**.
  - (b) 12 usuários contra 10 incluídos dá R$ 30,00.
  - (c) 10,2345 GB dá 0,235 GB e R$ 0,59. A borda 2,5 centavos → 3 separa half-up de half-even.
  - (d) dá R$ 59,70.
  - (g) 50 casos gerados com `recompute = total`.
  - (h) guard de texto: o motor não usa `toFixed`, `Math.round`, `parseFloat`, `floor` nem `ceil`.
  - Pro-rata: 17 dias dão R$ 170,00. Troca Starter → Professional no dia 11: R$ 100 + R$ 420. A franquia é a do último dia. Veículos X/Y dão 2.
- **Mutações** (restauradas pela cópia, com md5 igual):

  | Mutação | Resultado |
  |---|---|
  | half-even no `halfUpDiv` | 1 fail (T-ST-3) |
  | esquecer o add-on | 1 fail (T-ST-4) |
  | contar só o primeiro vínculo, no lugar dos distintos | 1 fail (T-ST-41) |
