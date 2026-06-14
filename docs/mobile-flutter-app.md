# App Flutter Tudo-em-Um

## Decisao

O Flutter sera um app unico modular do ERP Techsolutions. O app pode carregar os modulos no binario, mas deve habilitar telas e acoes apenas a partir do bootstrap autenticado do backend.

O primeiro caminho versionado nesta fase e `mobile/flutter_app`, porque nao havia `pubspec.yaml` existente no repositorio fora de `experiments/`.

## Camadas

- App Shell: inicializacao, tema, roteamento, home modular e diagnostico.
- Auth: sessao, tokens, refresh e secure storage.
- Tenant Context: tenant ativo, troca de tenant e isolamento local.
- Module Resolver: transforma `enabled_modules` em rotas/cards.
- Permission Resolver: avalia permissoes para acoes e telas.
- Local DB: base SQLite/Drift planejada para dados, catalogos e fila.
- Sync Engine: fila idempotente, retry, conflito e atualizacao incremental.
- Evidence Engine: recibos, fotos, hashes, retencao e upload futuro.
- OCR Engine: extracao local planejada de dados de recibos.
- PDF Engine: previa local com marca d'agua quando nao sincronizado.
- Expense Module: Prestação de Contas, itens, totais, politica, submissao e status.
- Field Ops Module: OS, checklists, GPS e evidencias em fases futuras.
- Diagnostics: fila, ultimo sync, versao, tenant e logs sanitizados.

## Bootstrap esperado

`GET /api/v1/mobile/bootstrap` deve retornar:

- `active_tenant`;
- tenants disponiveis;
- `enabled_modules`, incluindo `expense_management` quando permitido;
- `permissions`;
- `feature_flags`;
- `mobile_policy`;
- categorias e politicas de despesas;
- versoes de catalogos para cache e sync.

### Status backend B-098

`GET /api/v1/mobile/bootstrap` ja existe no backend como contrato minimo. Ele retorna tenant ativo, usuario, roles, permissoes, modulos habilitados, categorias de despesas quando o ator tem permissao relacionada a despesas, `serverTime` e cursores nulos de sync.

Ainda nao ha bootstrap expandido com todos os catalogos versionados, `feature_flags`, `mobile_policy` completo ou tenants disponiveis. Esses itens ficam para B-098A.

## Estrutura inicial

```txt
mobile/flutter_app/lib/
  main.dart
  app/
    app.dart
    router.dart
  core/
    auth/
    bootstrap/
    diagnostics/
    modules/
    network/
    permissions/
    storage/
    sync/
  features/
    expenses/
    field_ops/
  shared/
    ui/
```

## Dependencias planejadas

- `flutter_riverpod`: estado de app, bootstrap e modulos.
- `go_router`: rotas declarativas.
- `dio`: HTTP.
- `flutter_secure_storage`: tokens e segredos.
- `drift`: banco local.
- `sqlite3_flutter_libs`: runtime SQLite.
- `path_provider`: paths locais.
- `uuid`: `client_action_id`.
- `crypto`: hashes de recibos/acoes.
- `equatable`: igualdade de modelos.

OCR, PDF, camera e upload real ficam documentados, mas fora da primeira fundacao para reduzir risco de build.

## Regras locais obrigatorias

- Tokens nunca devem ir para SQLite comum.
- Toda entidade local tenant-scoped carrega `tenant_id`.
- `client_action_id` e obrigatorio em toda acao de sync.
- Recibos nao devem aparecer em logs.
- Conflito nao pode ser resolvido silenciosamente.
- UI pode esconder acoes, mas backend continua sendo a autoridade.

## Telas funcionais minimas

1. Login/Dev Session simples.
2. Home modular por tenant/modulos/permissoes.
3. Gestao de Despesas - lista.
4. Nova Prestação de Contas.
5. Detalhe Prestação de Contas.
6. Adicionar item.
7. Resumo para envio.
8. Diagnostico de sync.

## Testes esperados

- Home mostra `expense_management` quando modulo e permissao existem.
- Home nao mostra modulo sem permissao.
- Prestação de Contas calcula total e diferenca de adiantamento.
- Violacao de politica aparece para recibo obrigatorio ou limite excedido.
- Sync status aparece no diagnostico.
- `tenant_id` e obrigatorio nas acoes locais.
