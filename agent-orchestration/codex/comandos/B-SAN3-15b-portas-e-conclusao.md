# B-SAN3-15b — a porta do Prestador e a Conclusão no app (itens 35 e 36 do portão, segunda parte)

- **Tipo:** feature (KPI congelado, §C7 item 8(5): este PR não toca `Kpis/**`)
- **Fase:** Execution/Validation (A5)
- **Trilha:** servidor de OS (o tipo do atendimento) e app de campo (prestador)
- **Data:** 2026-11-14
- **Branch:** `feat/mobile-prestador-15b` (a partir da `origin/main` `d2737339`)
- **Autor:** `dev-15b-cl`, Claude Opus 5.5, dev declarado. Sem cruzamento entre casas (§C7 11(2)): as outras IAs dormem
  por ordem do dono de 13/11; o verificador é identidade nova Claude; as regras (3) a (7) do item 11 valem iguais.
- **Plano:** `plano-B-SAN3-15-v2.md` (com as Emendas 1 a 4) e as Emendas 5 (abertura), 5.1, 5.2 e 5.3 do 15b, com as
  conferências delas, fora do repositório (`erp-pausa-2026-10-03/planos/` e `revisoes/b-san3-15b/`). Onde este comando e o
  plano divergirem, vale o plano (a emenda mais nova).
- **Diário:** `docs/revisoes/SAN3/B-SAN3-15b-dev.md` (resumo; o diário completo, com cada comando, fica em
  `erp-pausa-2026-10-03/revisoes/b-san3-15b/dev-15b-cl.md`).

## Objetivo

1. **P7:** o servidor diz ao app se a OS é de guincho ou de prestador (`serviceKind` na lista e no detalhe, pela regra da
   Pergunta 1 (a), fail-closed), e o app grava o tipo.
2. **P8:** do detalhe da OS se chega ao atendimento do prestador ("Diagnóstico e peças", decisão 1.A) e à conclusão; um
   caminho só de conclusão para o prestador.
3. **P9:** o diagnóstico e o serviço executado ficam no aparelho, por usuário (banco v18), e viajam na conclusão.
4. **P10:** a conclusão não inventa comissão, mede a vistoria antes do toque (1.C) e não mostra "Equipamento" (1.D).
5. **P11:** peça e ação da fila numa transação só, na fila partilhada.
6. **Opção A** da maquete aprovada (decisão 1.0) no estoque, no detalhe e na conclusão, com a `MobileExpandableRow` nova na
   biblioteca (contrato único com o `B-SAN3-17`) e os `FilterChip` do Material; "Última unidade" = saldo de 1 ou menos (1.B).

## Escopo permitido / proibido

O §4.2 do plano v2 com a Emenda 4, mais o §4 da Emenda 5, o §2.7 da 5.1 e o §2.6 da 5.2. Proibido: `src/modules/inventory/**`,
`src/modules/mobile/**`, `router.dart`, `sync_replay_service.dart`, `sync_providers.dart`, a interface `SyncQueueRepository`,
`home_screen.dart`, `erp_components.dart` (só uso), `catalog.ts`, `prisma/**`, `migrations/**`, `RBAC_MATRIX.md`, `pubspec.*`,
lockfiles, `.env`, `infra/**`, `.github/**` e `Kpis/**`.

## Bateria

Plano v2 §6.3 + §9 do `CLAUDE.md`: `npm run check` · `npm run lint` · `npm test` (forma do job `backend`) · `npm run build` ·
`node --test --import tsx tests/bsan315-service-kind.test.ts tests/san3-26-checkin-conferencia.test.ts
tests/mobile-backend-contracts.test.ts tests/b-o6r-11d-work-order-contract.test.ts` · (app) `dart format` dos arquivos
tocados, `flutter analyze`, `flutter test` inteiro · as mutações das emendas, uma a uma · `git diff --check`. Aceite pela
forma real (§C7 11(3)): o resumo de cada job da CI, nunca a cor.

## Revisão

Junta completa (Emenda 5 §8: o bloco grava no aparelho dado que não pode se perder). Pré-revisão com roteiro fixo, inspetor,
junta uma vez, triagem, um conserto, conferência, merge e porteiro. A conferência visual das 3 telas contra a opção A é do
orquestrador.
