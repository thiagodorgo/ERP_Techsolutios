# B-DEMO-C: diário do dev (aceite e status do despacho no app, com envio imediato)

Plano: `C:/Users/AMP/erp-pausa-2026-10-03/planos/DEMO-C-plano.md`, com a **Emenda E1** (l.598 em diante; as fatias estão na §E1.3).
Crítica: `C:/Users/AMP/erp-pausa-2026-10-03/revisoes/DEMO-C-critica.md`.
Demo ao sócio: `C:/Users/AMP/erp-pausa-2026-10-03/planos/DEMO-SOCIO-plano.md`.

## RETOMADA S0 (orquestrador, 2026-10-26 ~22:25Z)
- **Head base:** `c9a2d036` (`origin/main`). Ramo `feat/mobile-democ-aceite-despacho`, worktree `C:/Users/AMP/w-democ`.
- **Feito:**
  - `git worktree add -b feat/mobile-democ-aceite-despacho C:/Users/AMP/w-democ origin/main` → ok;
  - `npm ci` → ec=0;
  - `cd mobile/flutter_app && flutter pub get` → ec=0;
  - disco: `df` antes 9,5 GB, depois 9,0 GB livres. Piso de trabalho R11: 7,5 GB.
- **Falta:** S1 a S12c, conforme a §E1.3.
- **Próximo comando:** começar a S1 (backend, passos 1 a 3: permissão, lista fechada, `getForMutation`; o resolvedor e o tipo do resultado), em `src/modules/mobile/` (`mobile-work-order-sync.ts`, `mobile.routes.ts`) e um teste novo.
