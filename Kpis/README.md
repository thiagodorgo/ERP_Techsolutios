# KPIs raiz — ERP Techsolutions

Esta pasta contem os KPIs gerais do projeto. Desde B-152F, ela tambem reflete
os percentuais mobile quando uma entrega mexe em Flutter/mobile.

## Politica de KPIs duplos

Existem dois conjuntos de KPIs:

- `Kpis/`: KPIs gerais/raiz do projeto.
- `mobile/flutter_app/Kpis/`: KPIs especificos do app Flutter.

Regras obrigatorias:

- Mexeu no Flutter/mobile: atualizar `mobile/flutter_app/Kpis/*` e refletir os
  percentuais mobile em `Kpis/*`.
- Mexeu fora do mobile: atualizar `Kpis/*`.
- Mexeu nos dois: atualizar os dois conjuntos.
- Se existir `index.html`: atualizar tambem o HTML.

## B-105 refletido na raiz

- B-105 — GPS/mapa operacional da OS.
- Field Location e DeviceLocationProvider.
- Flutter tests: 613/613.
- Backend tests: 15/15.
- Backend contract tests focados: 47/47.
- Flutter modules: 17/17.
- MVP demo: 87%.
- MVP vendavel: 64%.
- Blocos entregues: 35.

Limitacoes mantidas: adapter GPS nativo real pendente, permissoes Android/iOS
pendentes, opt-in de privacidade pendente, sem pacote GPS nativo, sem
geolocator, sem Google Maps, sem Mapbox, sem SDK externo, sem background
tracking, sem timer, sem stream continuo e sem envio silencioso.
