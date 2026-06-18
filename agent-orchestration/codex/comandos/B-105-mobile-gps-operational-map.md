# B-105 — Fundacao de GPS/mapa operacional da OS

## Objetivo

Implementar no Flutter a fundacao de GPS/mapa operacional conectada a Ordem de
Servico, reaproveitando o contrato backend existente de Field Location:
`POST /api/v1/mobile/field-locations`.

## Escopo aprovado

- Nao adicionar pacote GPS nativo.
- Nao alterar `mobile/flutter_app/pubspec.yaml`.
- Nao alterar `mobile/flutter_app/pubspec.lock`.
- Implementar `DeviceLocationProvider` abstrato/testavel.
- Runtime padrao deve mostrar indisponibilidade segura quando nao ha adapter GPS
  nativo real.
- Testes podem injetar provider fake com coordenadas.
- Criar store Drift `field_location_events`.
- Criar sync para `POST /api/v1/mobile/field-locations`.
- Transformar `/field-map` em mapa operacional simples da OS.
- Usar o botao `Mapa` ja existente na OS.
- Adicionar card de localizacao em detalhe/execucao da OS.
- Colocar Field Location sync antes de Work Orders, Checklist, Evidence e RDV
  no `AutoSyncCoordinator`.
- Atualizar KPIs e docs.

## Politica de KPIs duplos pos-B-152F

Existem dois conjuntos de KPIs:

- `mobile/flutter_app/Kpis/`: KPIs especificos do app Flutter.
- `Kpis/`: KPIs gerais/raiz do projeto.

Regra permanente:

- Mexeu Flutter/mobile: atualizar `mobile/flutter_app/Kpis/*` e refletir
  percentuais mobile em `Kpis/*`.
- Mexeu fora do mobile: atualizar `Kpis/*`.
- Mexeu nos dois: atualizar os dois conjuntos.
- Se existir `index.html`: atualizar tambem o HTML.

B-105 deve permanecer refletido nos dois conjuntos com Flutter 613/613,
Backend 15/15, contratos focados 47/47, modulos Flutter 17/17, MVP demo 87%,
MVP vendavel 64% e 35 blocos.

## Proibicoes

- Nao usar `geolocator`.
- Nao usar Google Maps.
- Nao usar Mapbox.
- Nao usar SDK externo de mapa.
- Nao implementar background tracking.
- Nao implementar stream continuo.
- Nao implementar timer de coleta.
- Nao fazer envio silencioso.
- Nao enviar `tenant_id` ou `tenantId`.
- Nao enviar token/Authorization no payload.
- Nao enviar `base64`, `file_data`, `local_path` ou `path`.
- Nao logar coordenadas.

## Contrato Flutter

- `DeviceLocationProvider`: boundary abstrato para adapter futuro.
- `PendingDeviceLocationProvider`: estado seguro de indisponibilidade em runtime.
- `FieldLocationStore`: fila local por tenant/OS em `field_location_events`.
- `DioFieldLocationApi`: envia `POST /api/v1/mobile/field-locations`.
- `FieldLocationSyncService`: sincroniza pending/failed com retry controlado.
- `/field-map`: mapa operacional simples conectado a OS, sem SDK externo.

## Lacunas fora do B-105

- Adapter GPS nativo real.
- Permissoes Android/iOS.
- Opt-in de privacidade.
- Provider externo de mapa, se aprovado.
- Background tracking, stream continuo, timer de coleta e envio silencioso.
- Roteirizacao e geofencing.

## Validacoes obrigatorias

- `dart format --output=none --set-exit-if-changed lib test`
- `flutter analyze`
- `flutter test --reporter compact`
- `npm run check`
- `npm test`
- `npm run lint`
- `npm run build`
- `node --test --import tsx tests/mobile-backend-contracts.test.ts`
- `node --test --import tsx tests/mobile-backend-contracts.test.ts tests/core-saas-contract.test.ts`
- `node --check mobile/flutter_app/Kpis/app.js`
- `git diff --check`
