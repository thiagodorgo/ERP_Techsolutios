# Flutter Stack and Community Components

Use quando o usuário pedir arquitetura flutter, escolha de componentes, revisão de pacotes ou implementação enterprise.

## Stack padrão

- UI: Flutter 3.x, Material 3, `ThemeData`, `ColorScheme`
- Estado: Riverpod com `Notifier`, `AsyncNotifier` e providers por feature
- Rotas: GoRouter
- HTTP: Dio
- API declarativa: Retrofit, quando o projeto aceitar codegen
- Modelos: Freezed + json_serializable
- Local DB/offline: Drift
- Animação: flutter_animate, animações nativas ou implicit animations
- Responsividade: LayoutBuilder, MediaQuery, adaptive layouts e responsive_framework quando justificar
- Testes: unit, widget, golden, integração crítica

## Rubrica de escolha de pacote

Antes de recomendar pacote, verificar quando possível:

1. pub.dev: likes, pub points, popularity e compatibilidade sdk.
2. manutenção: última versão, changelog e frequência de commits.
3. issues: bugs críticos abertos e tempo médio de resposta.
4. licença: se é compatível com uso comercial.
5. maturidade: usado em produção, docs, exemplos e breaking changes.
6. integração: se combina com Riverpod, Drift, Material 3 e build_runner.
7. custo: pacotes comerciais exigem atenção a licença.

## Componentes por necessidade

### Design system

- Material 3 nativo primeiro.
- FlexColorScheme quando for preciso criar temas consistentes rapidamente.
- Componentes próprios para ERP quando o nativo não cobrir densidade/tabela/filtros.

### Estado e arquitetura

- Riverpod para estado assíncrono, cache e escopo por tenant.
- Evitar lógica de negócio em widgets.
- Separar `data`, `domain`, `ui`.
- Usar repositories para mediar api/cache/sync.

### Networking e API

- Dio para interceptors, timeout, retry, auth e logs controlados.
- Retrofit quando endpoints forem estáveis.
- Freezed/json_serializable para DTOs e unions.
- Tratar 401/403/409/422/500 explicitamente.

### Offline/local-first

- Drift para dados estruturados, filas e queries.
- Connectivity Plus apenas como sinal, não como fonte de verdade.
- Sempre persistir ação local antes de tentar remoto.
- Usar `client_action_id` para idempotência.

### Tabelas e ERP

- DataTable nativo para casos simples.
- DataTable2 para tabelas densas leves.
- PlutoGrid ou Syncfusion DataGrid para grades complexas, após verificar licença e necessidade.
- Em mobile, converter tabela em lista/card.

### Gráficos

- fl_chart para gráficos simples e customizáveis.
- Syncfusion Charts quando o projeto aceitar licença e precisar de recursos enterprise.
- CustomPainter apenas quando nenhum pacote atender.

### Mapas

- flutter_map para tiles abertos e flexibilidade.
- Mapbox/Google Maps somente quando houver requisitos claros, custos e chave.

## Arquitetura de feature padrão

```txt
lib/features/<feature>/
  data/
    <feature>_remote_api.dart
    <feature>_local_store.dart
    <feature>_repository.dart
    dto/
  domain/
    models.dart
    use_cases.dart
  ui/
    screens/
    widgets/
  providers.dart
test/features/<feature>/
```

## Padrão Riverpod

- Expor estado da tela por `AsyncNotifier` ou `Notifier`.
- Repositório não deve depender de widget.
- Provider deve ser fácil de sobrescrever em testes.
- Usar estado imutável, classes pequenas e eventos explícitos.

## Performance

- Evitar rebuilds globais.
- Usar `const` quando possível.
- Paginar listas grandes.
- Usar cache local para telas de operação.
- Medir antes de otimizar.
