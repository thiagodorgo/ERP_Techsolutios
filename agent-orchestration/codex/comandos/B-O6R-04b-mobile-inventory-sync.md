# B-O6R-04b — o estoque do app que não sincroniza (item 31 do portão, `Ω6R-QUA-002`)

## Papel desta execução

DEV `dev-04b-cl`, Claude Opus 5.5 (subagente da sessão), nível menor declarado, identidade nova. Cobre o Codex por
exceção declarada (ordem do dono, 15/11). Não houve cruzamento entre modelos, e isso fica declarado. Não planeja, não
critica e não vota.

## Fontes, nesta ordem

1. A decisão do dono `D-O6R-04B-RETIRADA` (`agent-orchestration/controle/decisoes.md`).
2. O plano do bloco e as Emendas 1, 1.1 e 1.2 (fora do repositório; vale a mais nova).

## Propriedade

Todo movimento de estoque que o app registra chega ao servidor e persiste no razão. Hoje isso é só o material da OS, que
já grava por origem e sobrevive a restart. O que é falso sai:
- no servidor, o estoque em memória (os dois `Map`, a semente, `reserve`/`consume`/`shortage_report`) e a rota de
  disponibilidade fabricada;
- no app, o módulo `lib/features/inventory/**`, com as 8 peças inventadas e as telas "Nova Entrada" e "Nova Saída",
  que enfileiravam o que o servidor nunca recebia.

A porta do lote do app passa a ter uma chave só, `work_orders:update`.

## F0 — re-medição na `origin/main` `80f5b4d9` (15/11)

| id | arquivo | âncora | contagem |
|---|---|---|---|
| MS1 | `src/modules/mobile/mobile-inventory-sync.ts` | `throw routeError(400, "BAD_REQUEST", "unsupported_action_type", "type is not supported.");` | 1 |
| MS2 | `src/modules/mobile/mobile-inventory-sync.ts` | `const logger = createLogger();` | 1 |
| MS3 | `src/modules/mobile/mobile-inventory-sync.ts` | `export const MOBILE_INVENTORY_SYNC_PERMISSION = "work_orders:update" as const;` | 0 (nasce no D4) |
| MS4 | `src/modules/mobile/mobile.routes.ts` | `  return router;` | 1 |
| MS5 | `src/modules/mobile/mobile.routes.ts` | `implemented_domains: ["expenses", "work_orders", "inventory"],` | 0 (nasce no D5) |
| MS6 | `src/modules/mobile/mobile-inventory-sync.ts` | `if (action.type === "work_order_material.remove") {` | 1 |
| MA2 | `mobile/flutter_app/lib/app/router.dart` | `    routes: [` | 1 |
| MA3 | `mobile/flutter_app/lib/core/network/api_contracts.dart` | `static const materialRemove = 'work_order_material.remove';` | 1 |

- **Ordem do §8:** o 17 (#568) está na `main`. O 16 não está (está no PR #580, em rascunho). Por isso a F4 fica fora
  até o 16 entrar.
- **Interseção com o 67** (`B-APROVACOES-DURAVEIS`; tem plano, mas nem ramo nem PR): os dois instantâneos regerados
  (`tests/fixtures/o6r07c-classificacao-vias.json` e `tests/fixtures/san3-18-route-modules.json`),
  `tests/o6r07c-subresource-scope.test.ts` e os documentos `API_CONTRACTS.md`, `RBAC_MATRIX.md` e `PLANO_SAN3.md`.
  Quem entrar depois regera os instantâneos pelo gerador. A ordem entre os dois é decisão do orquestrador.
- **Testes fora do §4.4 que o desenho deixa vermelhos:** foram medidos por simulação e estão decididos na Emenda 1.2.
  São o RC2(8), o RC2(9) e o RC2(20) de `tests/b-material-sync.test.ts`, reescritos, e o H4d e o H4g de
  `tests/sec-log-http.test.ts`.

## Escopo

O PERMITIDO do §5 do plano, com os acréscimos das Emendas 1.1 (o caso nº 4 de `mobile-backend-contracts`; as 5 chamadas de
`resetSync`) e 1.2 (`b-material-sync` RC2(8), RC2(9) e RC2(20); `sec-log-http` H4d, H4g e `syncEstoque`). Nada em:
`prisma/**`, `src/modules/inventory/**`, `catalog.ts`, `src/app.ts`, `.github/**`, `Kpis/**`, lockfiles, `pubspec.*`,
`.env`, `infra/**`, `migrations/**`, os outros arquivos de `lib/core/sync/`, `lib/features/prestador/**`,
`lib/features/work_orders/**`, `lib/shared/ui/**`, `lib/core/bootstrap/**`, `frontend/**`. O corpo do material em
`mobile-inventory-sync.ts` também fica intocado.

## Bateria

A do §11 do plano e a da Emenda 1.1: o `npm test` inteiro, com a régua base × objeto da Emenda 1.2 §3; os `-db` do bloco
3×, num cluster descartável em UTC; `check`, `lint` e `build`; o Flutter inteiro, com o Format check pela imagem
`ci-local-flutter:3.47.5`; `git diff --check`. As mutações são MS1 a MS6, MS2b, MA1 a MA3 e (na F4) MQ1, uma por vez,
cada uma vermelha e restaurada.

## Nível de revisão

Junta completa: perda de dado (a fila offline e um contrato de escrita), permissão (a porta do lote e os gates G2 e G3)
e superfície externa (uma rota sai).
