# B-GUI-01a — A limpeza simples do app de campo (placeholders e portas mortas)

- **Tipo:** feature
- **Fase:** Execution (A5)
- **Trilha:** mobile (Flutter); sem servidor, sem web
- **Data:** 2026-11-17
- **Branch:** `feat/mobile-gui-01a-limpeza`
- **Autor:** `dev-gui-00-01a-cl` (Claude Opus 5.5, dev, nível menor declarado)
- **Plano (norma única):** `~/erp-pausa-2026-10-03/planos/plano-APP-GUINCHO.md` §2 e §4.1 (testes L3 a L6, mutações M1.4 a
  M1.7) com a emenda 1, `~/erp-pausa-2026-10-03/planos/plano-APP-GUINCHO-emenda1.md` §5.2 (onde a emenda muda o plano,
  vale a emenda). O B-GUI-01 foi dividido: este bloco fica com PH-07 a PH-12; PH-01 e PH-04 são do B-GUI-01b.
- **Decisão do dono:** `D-DONO-1611-APP-SO-GUINCHO` ("pode tirar os placeholders").

## Objetivo

Tirar do app o que é promessa ou andaime de desenvolvimento, sem tela nova:

| Item | Antes | Depois |
|---|---|---|
| PH-07 | chave "Recibo anexado estruturalmente" no novo gasto | sai (a foto real está na tela de recibos) |
| PH-08 | campos preenchidos com "120.00", "Sao Paulo", "Fornecedor local" e adiantamento "80.00" | os campos abrem vazios |
| PH-09 | "Salvar item e enfileirar sync", "Submeter localmente" | "Salvar gasto", "Enviar para aprovação" |
| PH-10 | cartão "Anexos · Upload de evidencias disponivel em bloco futuro", selo "Futuro" | sai |
| PH-11 | a aba Mapa abre "OS nao selecionada" | abre o mapa da OS em andamento; sem nenhuma, "Nenhuma OS em andamento" com "Ver minhas OS" |
| PH-12 | "Localizacao do dispositivo indisponivel nesta versao… adapter GPS nativo pendente." | "Não foi possível obter a localização deste aparelho." |

OS em andamento = em atendimento, no local, a caminho ou pausada, nesta ordem de preferência.

Sem o valor de exemplo, "Salvar gasto" com o valor vazio gravaria um gasto de R$ 0,00: o botão recusa valor vazio ou
menor ou igual a zero ("Informe o valor do gasto.") e aceita vírgula decimal. É leitura do dev, declarada (§A6).

## Escopo PERMITIDO / PROIBIDO

PERMITIDO (em `mobile/flutter_app/`, emenda 1 §5.2): `lib/features/expenses/ui/new_expense_item_screen.dart`,
`new_expense_report_screen.dart`, `expense_submit_screen.dart`; `lib/features/work_orders/ui/work_order_approval_request_screen.dart`
(o cartão Anexos); `lib/shared/ui/erp_scaffold.dart`; `work_order_operational_map_screen.dart` (o estado sem OS e a frase);
`lib/core/location/device_location_provider.dart` e `field_location_service.dart` (só a frase);
`test/features/bgui01a_limpeza_test.dart` e os testes existentes que citam os literais
(`test/features/expenses/expense_screens_test.dart`, `test/features/b083_polish_test.dart`).

PROIBIDO, além do comum (§C4): `features/auth/**`, `core/permissions/**`, `app/router.dart`, `shared/ui/home_screen.dart`,
`features/expenses/data/**`, o servidor, `Kpis/**` (congelado, `D-GOV-PROPORCIONAL`).

## Bateria de validação

```
cd mobile/flutter_app
flutter pub get
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test test/features/bgui01a_limpeza_test.dart --reporter compact
flutter test test/features/expenses/expense_screens_test.dart test/features/b083_polish_test.dart --reporter compact
flutter test --reporter compact
cd ../..
git diff --check
```

Aceite: L3 (a–d), L4 (as 6 frases ausentes de `lib/`, a guarda não vazia, os botões novos, o pedido de aprovação sem
"Futuro"), L5 (a–c) e L6 (a–c) verdes; M1.4 a M1.7 deixam o teste nomeado vermelho e são desfeitas. Vermelho-controle no
código de base: 18 dos testes de comportamento vermelhos.

## Rastreabilidade

Diário do dev: `~/erp-pausa-2026-10-03/revisoes/app-guincho/dev-gui-00-01a-cl.md`. Capturas antes e depois de cada
placeholder (para a conferência visual do orquestrador): `~/erp-pausa-2026-10-03/revisoes/app-guincho/gui01a-capturas/`,
geradas pelo grupo "capturas" do teste do bloco com `ERP_CAPTURAS_DIR` (fora do repositório; sem a variável, os casos são
pulados). Nível: revisão simples + conferência visual (emenda 1 §5.2).
