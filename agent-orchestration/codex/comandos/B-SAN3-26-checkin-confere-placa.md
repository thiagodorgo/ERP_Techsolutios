# B-SAN3-26 — o "No local" confere a placa do veículo atendido, nas duas portas (item 53 do portão)

## Papel desta execução

DEV `dev-san326-cl`, Claude Opus 5.5 (subagente da sessão), nível menor declarado, identidade nova. Cobre o Codex por
exceção declarada (Codex 1 sem cota semanal até 16/11; Codex 2 ocupado). Não planeja, não critica e não vota.

## Fontes, nesta ordem

1. Decisões do dono `D-PORTAO-9-RECOMENDACOES-1011` (P1 só `residencial` isento sem placa; P2 a base marca "No local"
   pelo console sem os dígitos, "registrada pela base") e `D-PORTAO-5-RECOMENDACOES-1111` (P3 reaberta, alternativa B).
2. Os ajustes da crítica da rodada 2 (`crit-26-r2-cl`, C26R2-01 a 08), como requisito.
3. O plano `plano-B-SAN3-26-v2.md`, inteiro.

Como cada ajuste entra está na emenda E-01 a E-08 do diário (`docs/revisoes/SAN3/B-SAN3-26-dev.md`), escrita antes do
código.

## Propriedade

Uma OS só é gravada em `on_site` com um veredito de check-in emitido pelo servidor (`verifyCheckin`), num ponto só.
O veredito sai em três casos: os 2 caracteres digitados batem com o fim da placa do servidor; a OS não tem placa e o tipo
do catálogo é `residencial`; ou a entrada é a rota HTTP de status e o ator é só base. Fora disso, recusa. Os dois
repositórios recusam `on_site` sem veredito emitido, e o tipo não deixa escrever `on_site` sem ele.

## Escopo

O PERMITIDO do §4 do plano, com a F5 na alternativa B, mais o que a emenda acrescenta: `lib/shared/ui/sync_screen.dart`
(E-02) e o campo de placa da criação também para "Sem tipo definido" e OS sem catálogo (E-04). Nada em `prisma/**`,
`.github/**`, `Kpis/**`, `catalog.ts`, `RBAC_MATRIX.md`, `field-dispatch/**`, `work-order.routes.ts`, lockfiles,
`pubspec.*`, `.env`, `infra/**` e `migrations/**`.

## Bateria

A do §6 do plano: Flutter (`dart format`, `flutter analyze`, os testes do bloco, as regressões e a suíte inteira);
backend (`npm run check`, `lint`, os testes do bloco e as regressões, `npm test` em TAP, `build`); web (`check`, `build`,
`test:smoke`); `node scripts/migration-transaction-guard.mjs`; `git diff --check`. Cada mutação literal é aplicada uma
por vez, fica vermelha e é revertida.

## Nível de revisão

Junta completa (§5 do plano): autorização, migração do banco local e fila offline.
