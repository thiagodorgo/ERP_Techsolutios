# B-ASS-06 — porta comum de pagamento, cliente HTTP e adaptador Asaas — relatório do dev

Plano: `B-ASSINATURA` §4.6 (+ §3, §4.5, §12) — fora do repositório, em `erp-pausa-2026-10-03/planos/B-ASSINATURA-plano.md`.

**Papéis (declarados)**
- **Dev:** `dev-ass06` (DeepSeek, nível menor declarado, esforço médio).
- **Revisão:** pré-revisão do Claude + **junta completa** (superfície externa + dinheiro, unanimidade de 3), com cadeiras Claude (cruzamento de modelo).

**Recorte do portão (1 + 1; Iugu fora em 02/11):** este bloco entrega a **porta + cliente HTTP + adaptador Asaas + falso Asaas**. Iugu e Mercado Pago ficam FORA. O MP é do `B-ASS-15`; a Iugu saiu do pacote (sem débito pelas docs oficiais).

## F0 — comando e terreno

- **Worktree:** `C:/Users/thiag/w-ass06`, ramo `feat/b-ass-06-porta-pagamento`, a partir da `origin/main` `b153f219` (com o B-ASS-05 e o cofre).
- **Sem migração** neste bloco. **Docker:** nenhum.
- **Baseline medido (origin/main, `npm test` local sem `DATABASE_URL`):** 429 arquivos, **3760 testes** (2654 pass, 982 fail, 124 skipped; exit 1). Os 982 vermelhos são pré-existentes e serão re-medidos na `origin/main` na mesma forma ao final (um vermelho fora do bloco é comparado com a origin/main).
- **Premissa verificada no código:** `BILLING_PROVIDER_ALLOW_LOCAL_HOSTS` e `BILLING_WEBHOOK_PUBLIC_BASE_URL` **não existem** em `src/config/env.ts` na `origin/main` (grep `ALLOW_LOCAL|WEBHOOK_PUBLIC` → vazio). O §3.9 manda as duas viverem no `env.ts` com gates; o PERMITIDO do §4.6 omitiu `src/config/env.ts`. **Leitura registrada:** incluo `src/config/env.ts` (só essas 2 variáveis + gates) no escopo, conforme §3.9.
