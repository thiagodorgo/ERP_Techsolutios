# B-SAN3-21 — acentuação dos textos da web (item 49, `P-028` + `P-Ω3F2B-ACENTOS`)

- **Ramo:** `fix/web-acentuacao`
- **Papel desta execução:** DEV; não planeja, não critica e não vota.
- **Executor:** Claude Opus 5.5 `dev-san321-opus` (nível menor, declarado).
- **Verificador:** Codex GPT-5.6 Sol (§C7 item 11).
- **Nível:** revisão simples + CI (§C7 item 10(1)): só texto, sem regra, permissão ou dado.
- **Plano:** `C:/Users/thiag/erp-pausa-2026-10-03/planos/B-SAN3-21-plano.md` (autor: orquestrador, Claude Opus 5.5); fonte `PLANO_SAN3.md:277`.
- **Relatório do dev:** `docs/revisoes/SAN3/B-SAN3-21-dev.md`.

## Escopo

**PERMITIDO:** literais de texto exibidos ao usuário em `frontend/src/**/*.{ts,tsx}`; o guard
`tests/san3-21-acentuacao-guard.test.ts`; `frontend/tests/**` só para expectativa de texto que mudou; o relatório; este
comando.

**PROIBIDO:** identificadores, tipos, chaves, rotas, campos da API, valores de enum enviados ao backend, chaves de
permissão; `prisma/**`, `src/**`, `mobile/**`, `Kpis/**`, lockfiles, dependência nova.

## Critério

O guard acusa 0 ocorrência da lista fechada em texto de `frontend/src`. Vermelho-controle registrado na `origin/main`
`7c89c73b`. Mutações M1 (`"Nao"` num literal) e M2 (`Configuracoes` em texto de JSX) deixam o guard vermelho. Controle de
falso positivo por fixture. Texto que é também chave de comparação fica fora e é registrado (`"Operador Logistico"`).

## Validação

```
node --test --import tsx tests/san3-21-acentuacao-guard.test.ts
npm --prefix frontend run check
npm --prefix frontend run build
npm --prefix frontend run test:smoke
npm run check
npm run lint
npm test            # na forma do CI (job backend), ou as suítes da raiz que leem frontend/ + o CI
git diff --check
```

`Kpis/**` intocado (`D-GOV-PROPORCIONAL` item 8(5)).
