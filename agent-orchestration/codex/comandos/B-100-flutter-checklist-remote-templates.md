# B-100 — Flutter Checklist Remote Templates

## Objetivo

Conectar o `ChecklistRepository` ao endpoint `GET /api/v1/mobile/checklists/available`
do backend, em modo remoto. Os modelos (templates) recebidos sao salvos no Drift
(cache local). Em caso de erro de rede ou rota ausente, o app exibe os modelos do
cache local ou seeds. A arquitetura local-first e mantida e a tela de checklists
ganha banners de pull state (loading, erro, cache, ultima atualizacao, vazio, retry).

## Branch

`feature/flutter-checklist-remote-templates`

## Escopo

### O que este comando faz

- Torna `DioChecklistRemoteApi.fetchAvailableChecklists()` tolerante a multiplos
  envelopes: `{checklists:[...]}`, `{items:[...]}`, `{data:[...]}`.
- Adiciona `_templateFromRemoteJson()` tolerante a camelCase (backend) e
  snake_case (cache local), com defaults seguros (`v1`, `active`, fallback tenant).
- Adiciona `ChecklistPullOutcome` enum: `success`, `cached`, `error`, `pulling`.
- Adiciona estado de pull ao `ChecklistRepository`: `isPulling`, `lastPulledAt`,
  `lastPullError`, `hasCache`.
- `load()`: tenta o pull remoto; em sucesso salva templates no Drift e atualiza
  `lastPulledAt`; em falha registra `lastPullError` e faz fallback para cache/seeds.
- `refresh()`: pull manual (pull-to-refresh); retorna o `ChecklistPullOutcome`
  apropriado (`success`, `cached`, `error`, `pulling`).
- UI `ChecklistAvailableScreen` convertida para `ConsumerStatefulWidget` com
  `RefreshIndicator` e `CustomScrollView` de slivers: `LinearProgressIndicator`,
  `_ChecklistErrorBanner` (com retry), `_LastUpdatedBanner`, `_CacheBanner`,
  `_EmptyState` (com retry).
- 44 testes unitarios cobrindo parser, repositorio, refresh, stub seguro e regressao.

### O que este comando NAO faz

- NÃO altera backend `src/**` nem cria migrations.
- NÃO altera contratos de API.
- NÃO altera frontend web React (`frontend/**`).
- NÃO implementa sync write de respostas do checklist nem upload de evidencias.
- NÃO implementa OS sync bidirecional, GPS/mapa, aprovacao real ou inventario remoto.
- NÃO adiciona dependencias Flutter (formatacao de data feita sem `intl`).
- NÃO faz push nem cria PR sem autorizacao explicita.

## Arquivos modificados

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `lib/features/checklists/data/checklist_remote_api.dart` | feat | Envelopes tolerantes; `_templateFromRemoteJson` camelCase/snake_case |
| `lib/features/checklists/data/checklist_repository.dart` | feat | Pull state, `refresh()`, fallback cache/seeds |
| `lib/features/checklists/ui/checklist_available_screen.dart` | feat | Stateful + RefreshIndicator + banners de pull state |
| `test/features/b100_checklist_remote_templates_test.dart` | test | 44 novos testes (novo arquivo) |

## Decisoes tecnicas

- **Envelopes multiplos**: `body['checklists'] ?? body['items'] ?? body['data']`
  cobre as formas mais comuns de resposta do backend sem acoplar a uma so.
- **`_isPulling` sincrono sem `notifyListeners()` em `load()`**: o flag e definido
  antes do primeiro `await` para que o primeiro build leia `isPulling=true`, mas
  `notifyListeners()` so e chamado apos o `await` — evita `setState()` durante o
  build. Em `refresh()` (acionado por acao do usuario) o `notifyListeners()` e
  seguro imediatamente.
- **Fallback em cascata**: remoto → cache Drift → seeds locais. `seedIfEmpty`
  garante seeds apenas quando o store esta vazio, preservando isolamento de tenant.
- **`ChecklistPullOutcome.pulling` como guarda de reentrancia**: `refresh()` retorna
  `pulling` se ja houver um pull em andamento, sem disparar segunda chamada remota.
- **Sem dependencia `intl`**: `_LastUpdatedBanner` formata `dd/MM HH:mm` manualmente.
- **Listener reativo no widget**: `addListener`/`removeListener` em
  `didChangeDependencies`/`dispose` para reagir a `notifyListeners()` do repo.

## Limitacao conhecida (backend)

O endpoint `GET /api/v1/mobile/checklists/available` aparece como "implementado" no
catalogo de capabilities do bootstrap, mas o **handler de rota esta ausente** em
`src/modules/mobile/mobile.routes.ts` (rotas presentes: bootstrap, expense-sync,
work-order-sync, checklist-actions-sync, inventory-availability, inventory-sync).

O Flutter trata isso de forma resiliente: o `try/catch` em `load()` captura o erro
(404/rede), registra `lastPullError` e faz fallback para cache/seeds — o app nunca
quebra. A implementacao da rota no backend fica para um bloco futuro (B-101), fora
do escopo desta entrega (que e mobile-only).

## Validacao

| Verificacao | Resultado |
|-------------|-----------|
| `flutter analyze --no-fatal-infos` | **No issues found** |
| `flutter test` (B-100) | **44/44 passando** |
| `flutter test` (suite completa) | **486/487** (1 pre-existente instavel passa isolado; nao tocado por B-100) |
| `npm test` | **15/15 passando** |
| `npm run lint` | **0 erros** |
| `npm run build` | **0 erros** |
| `git diff --check` | **limpo** |

## Commits gerados

1. `feat(mobile): pull remote checklist templates into local cache`
2. `test(mobile): add remote checklist template coverage`
3. `docs: add B-100 checklist templates command and KPI update` *(este)*
