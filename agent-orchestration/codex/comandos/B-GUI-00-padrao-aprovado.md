# B-GUI-00 — O padrão de cada tela do app é o desenho aprovado

- **Tipo:** feature
- **Fase:** Execution (A5)
- **Trilha:** mobile (Flutter); sem servidor, sem web
- **Data:** 2026-11-17
- **Branch:** `feat/mobile-gui-00-padrao-aprovado`
- **Autor:** `dev-gui-00-01a-cl` (Claude Opus 5.5, dev, nível menor declarado)
- **Plano (norma única):** `~/erp-pausa-2026-10-03/planos/plano-APP-GUINCHO-emenda1.md` §3 e §5.1.
- **Decisão do dono:** a decisão H ("o desenho aprovado vira a opção padrão de cada tela"; "siga", 16/11). Atualiza a
  `D-APARENCIA-RESPOSTAS` (b), "A em todas"; conflito `C-GUI-PADRAO-DO-SELETOR`.

## Objetivo

Para quem nunca escolheu, a tela de Localização e consentimento abre na B, "Como o protótipo". Quem já escolheu continua
com a sua escolha. A Execução do guincho continua na A.

## Escopo PERMITIDO / PROIBIDO

PERMITIDO (em `mobile/flutter_app/`): `lib/core/appearance/app_appearance.dart` (só `defaultAppAppearanceFor` e o
comentário); `test/core/appearance/**` e `test/features/appearance/**`.

PROIBIDO, além do comum (§C4): `lib/core/appearance/app_appearance_store.dart`; as telas; `Kpis/**` (congelado).

## Bateria de validação

```
cd mobile/flutter_app
flutter pub get
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test test/core/appearance --reporter compact
flutter test test/features/appearance --reporter compact
flutter test --reporter compact
cd ../..
git diff --check
```

Aceite: H1 (sem escolha, a Localização abre na B), H2 (com a A guardada, continua na A), H3 (a Execução do guincho
continua na A). MH1 (devolver A para a Localização) deixa H1 vermelho; MH2 (ignorar a escolha guardada) deixa H2 vermelho.

## Rastreabilidade

Diário do dev: `~/erp-pausa-2026-10-03/revisoes/app-guincho/dev-gui-00-01a-cl.md`. Nível: revisão simples + conferência
visual (emenda 1 §5.1).
