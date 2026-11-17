# B-GUI-FID1 — O detalhe da OS e o check-in fiéis ao desenho aprovado, nas 3 aparências (app)

- **Tipo:** feature
- **Fase:** Execution (A5)
- **Trilha:** mobile (Flutter); sem servidor, sem web
- **Data:** 2026-11-17
- **Branch:** `feat/mobile-gui-fid1-detalhe-checkin`
- **Autor:** `dev-gui-fid1-cl` (Claude Opus 5.5, dev de tela, nível menor declarado; tela só do Claude, `D-DESIGN-SO-CLAUDE`)
- **Plano (norma única):** `~/erp-pausa-2026-10-03/planos/plano-APP-GUINCHO-emenda1.md` §5.5 (F1 a F7, mutações MF1 a MF6),
  com o §4.0 do plano base `plano-APP-GUINCHO.md`.
- **Maquetes aprovadas pelo dono em 17/11** (as 3 opções viram aparências, `D-APARENCIA-POR-USUARIO`):
  `docs/claude-code-handoff/screen-refs/os-detalhe-app-3opcoes.reference.html` e
  `docs/claude-code-handoff/screen-refs/checkin-app-3opcoes.reference.html`.
- **Tela-modelo e skills:** `work_order_execute_screen.dart` com as vistas B e C de `ui/aparencias/` e as peças de
  `shared/ui/mobile_kit.dart`; `ts-frontend-full` (implementar) e `ui-ux-pro-max` (revisar).
- **Dependência (leitura do orquestrador, declarada):** o #580 está na `main`; o B-GUI-D1 corre em paralelo. Este bloco
  desenha só o dado de hoje: o veículo atendido e o prazo (`slaDueAt`) chegam com o D1, e até lá os cartões somem (F2).

## Objetivo

| Tela | Antes | Depois |
|---|---|---|
| Detalhe da OS | cartão da organização, "Tecnico atribuido" com o id do usuário, "Checklist vinculado" com o id do modelo, stepper de 5 sem acento, 7 botões soltos no corpo | o desenho aprovado `os-detalhe.png` na A (bloco branco com código, prioridade, serviço e cliente; Veículo; Local e agendamento; prazo; Contato; "Mais desta OS"; barra fixa "Mapa" + "Iniciar atendimento"), B (prazo preso no topo, 5 etapas, próximo passo) e C (blocos clicáveis e linhas que abrem o detalhe) |
| Check-in | botões do detalhe e o diálogo da placa | a 1ª etapa da execução (`checkin-chegada.png`): "Início", "Rota de coleta", "Coleta", com "Iniciar rota", "Cheguei ao local" (o mesmo diálogo da placa) e "Iniciar atendimento", nas 3 aparências da execução do guincho |

"Iniciar atendimento" no detalhe abre o check-in na execução, sem mudar a situação. As ações (o que vai para a fila do
aparelho) são as de hoje: a F0 as gravou antes de mexer (commit `test(mobile): F0 do B-GUI-FID1…`), e o F4/F5 as repetem
pelo caminho novo.

Fora da tela, por não existir no servidor (F2): o tipo do veículo, a distância, o tempo e o fim da janela; "Abrir rota" e
"Ir para a coleta" chegam com o B-GUI-15; "Ligar" fica fora (o app não abre o discador).

## Escopo PERMITIDO / PROIBIDO

PERMITIDO (em `mobile/flutter_app/`, emenda 1 §5.5): `lib/features/work_orders/ui/work_order_detail_screen.dart` e
`ui/aparencias/` (vistas novas: `detalhe_os_*.dart` e `checkin_chegada_*.dart`); `work_order_execute_screen.dart` (o
check-in nos passos "Início" e "Rota de coleta"; as vistas B e C da execução não foram tocadas);
`ui/checkin_confirm_dialog.dart` (novo, os diálogos extraídos sem mudar a regra); `shared/ui/mobile_kit.dart`
(`MobileShortSteps`, com 1 linha em `COMPONENT_LIBRARY.md`); `core/appearance/app_appearance.dart` (a chave
`detalhe-os`); os testes. Mais as 2 referências em `docs/claude-code-handoff/screen-refs/` e 2 linhas no `README.md` dela.

PROIBIDO, além do comum (§C4 e §4.0 do plano): `features/work_orders/data/**`, `core/sync/**`, `features/prestador/**`, o
servidor, o banco do aparelho, `pubspec.*`, `Kpis/**` (congelado, `D-GOV-PROPORCIONAL`), os arquivos do B-GUI-D1.

## Bateria de validação

```
cd mobile/flutter_app
flutter pub get
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test test/features/work_orders/bguifid1_detalhe_e_checkin_test.dart --reporter compact
flutter test --reporter compact
cd ../..
git diff --check
```

Aceite: F1 a F7 verdes; MF1 a MF6 deixam o teste nomeado vermelho e são desfeitas (saídas no diário). As capturas das
3 aparências saem do grupo "capturas" do teste do bloco com `ERP_CAPTURAS_DIR` (fora do repositório; sem a variável, os
casos são pulados).

## Rastreabilidade

Diário do dev: `~/erp-pausa-2026-10-03/revisoes/app-guincho/dev-gui-fid1-cl.md`. Capturas para a conferência visual do
orquestrador: `~/erp-pausa-2026-10-03/revisoes/app-guincho/fid1-capturas/`. Nível (previsão): revisão reforçada (muda de
lugar a conferência da placa, item 53 do portão); a trava automática decide.
