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

## B-106 refletido na raiz

- B-106 — Adapter GPS nativo real + permissões Android/iOS.
- Field Location e DeviceLocationProvider com adapter geolocator real.
- Flutter tests: 633/633.
- Backend tests: 15/15.
- Backend contract tests focados: 47/47.
- Flutter modules: 17/17.
- MVP demo: 90%.
- MVP vendavel: 68%.
- Blocos entregues: 36.

Limitacoes mantidas: Sem background tracking, Sem stream continuo, Sem timer, Sem envio silencioso, Geofencing pendente, Roteirizacao pendente, Provider externo de mapa pendente, se aprovado, Approval real pendente, Conflitos manuais avancados pendentes, Hardening final de evidencias/storage pendente, Piloto Android real ainda precisa validacao em dispositivo fisico.
