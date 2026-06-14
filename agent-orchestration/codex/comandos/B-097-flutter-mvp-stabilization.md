# B-097 — Flutter Mobile MVP Stabilization

**Branch:** `feature/flutter-mobile-mvp-stabilization`
**Status:** Concluído
**Data:** 2026-06-14

## Objetivo

Transformar o app Flutter de "protótipo avançado com riscos críticos" em uma base sólida para
operação de campo real. Nenhum backend real foi conectado. Todas as mudanças são locais, reversíveis
e documentadas.

## Escopo executado

### Correções críticas

| # | Problema | Arquivo | Solução |
|---|----------|---------|---------|
| 1 | `UnimplementedError` ao submeter despesa crasha o app | `expense_remote_api.dart` | Substituído por `ApiIntegrationUnavailableError` — erro controlado, não exceção não tratada |
| 2 | Work Orders perdidos ao reiniciar o app | `work_order_repository.dart` | Trocado `InMemoryWorkOrderLocalStore` por `DriftWorkOrderLocalStore` (schema v4) |
| 3 | Credenciais demo hardcoded na tela de login | `login_screen.dart` | Campos limpos; acesso dev isolado em `kIsDevMode` |
| 4 | DiagnosticsScreen acessível em produção | `router.dart` | Rota protegida por `kIsDevMode` — exibe `ModulePlaceholderScreen` em produção |

### Novas funcionalidades

| # | O que | Arquivo |
|---|-------|---------|
| 5 | Flag `kIsDevMode` (build-time) | `core/config/app_config.dart` |
| 6 | `DriftWorkOrderLocalStore` + tabela `work_order_evidence` (schema v4) | `core/local_db/` |
| 7 | SyncScreen reescrita com grupos por domínio, KPIs, banner backend-pending | `shared/ui/sync_screen.dart` |
| 8 | Modelos ricos de checklist dinâmico (versionados, secções, 19 tipos) | `features/checklists/domain/checklist_template_models.dart` |
| 9 | Registry de renderers de perguntas com fallback controlado | `features/checklists/ui/checklist_question_renderer.dart` |

## Flags de build

```bash
# Ativar modo dev (DiagnosticsScreen + botão dev login)
flutter run --dart-define=ERP_ENV=dev

# Ativar autenticação remota (quando backend estiver pronto)
flutter run --dart-define=ERP_AUTH_MODE=remote
```

## Arquitetura de checklist dinâmico

### Tipos suportados (renderizador nativo)
`text`, `longText`, `integer`, `decimal`, `yesNo`, `singleChoice`, `multiChoice`, `photo`, `damageMap`, `sectionNote`

### Tipos com stub (botão desabilitado)
`photo` → câmera não conectada ainda (`NÃO fazer upload real nesta PR`)
`damageMap` → abre placeholder (navegação pendente)

### Tipos unsupported (fallback controlado)
`currency`, `date`, `time`, `dateTime`, `gps`, `barcode`, `signature`, `computed`, `repeater`

Exibem: _"Este tipo de pergunta ainda não é suportado nesta versão do app."_

### Registry extensível
```dart
final registry = ChecklistQuestionRendererRegistry([
  const _TextBuilder(),
  MyCustomBuilder(),   // adicionar builders customizados aqui
]);
```

### Contrato de payload de sync
```dart
answer.toSyncPayload() // → Map<String, dynamic> pronto para enfileirar
```

## Testes adicionados (B-097)

`test/features/b097_mvp_stabilization_test.dart` — 35 testes:

- **1.x** DriftWorkOrderLocalStore: save/reload WO, timeline, evidence, clearAll, isolamento por tenant
- **2.x** PendingBackendExpenseRemoteApi: todos os métodos lançam `ApiIntegrationUnavailableError`, não `UnimplementedError`
- **3.x** ChecklistTemplate.fromJson: campos raiz, applies_to, syncPolicy, sections/questions ordenados, opções, allQuestions, requiredQuestions, fallback de tipo desconhecido, round-trip de apiValue
- **4.x** ChecklistQuestionRendererRegistry: text→TextField, yesNo→3 botões, tap emite answer, singleChoice→RadioGroup, multiChoice→Checkboxes, tipo desconhecido→fallback, asterisco em campo obrigatório, sectionNote→container info, photo→botão desabilitado, hasValue, copyWith

## Testes corrigidos (sem regressão)

| Arquivo | O que mudou |
|---------|-------------|
| `home_screen_test.dart` | Adicionado override de `workOrderLocalStoreProvider` (Drift agora exige `appDatabaseProvider`) |
| `expense_local_first_test.dart` | Labels do SyncScreen atualizados para formato legível (`Expense Report Create`); override de `workOrderLocalStoreProvider` |
| `b088_checklist_sync_replay_test.dart` | Label atualizado para `Checklist Run Create`; override de `workOrderLocalStoreProvider` |

## Gaps documentados (fora do escopo desta PR)

- Upload real de fotos: `photo` builder tem `onPressed: null` — integrar com `image_picker` em PR futura
- Câmera de dano: `damageMap` stub — navegar para `ChecklistDamageMapScreen` e serializar pontos
- Tipos de pergunta avançados: `gps`, `barcode`, `signature`, `repeater` — builders futuros
- Backend checklist sync: `PendingBackendChecklistSyncBatchApi` retorna lista vazia — B-098
- Auth remoto: `DioAuthRepository` não é default — ativar com `--dart-define=ERP_AUTH_MODE=remote`

## Validação final

```
flutter analyze   → No issues found
flutter test      → 315/315 passed
npm test          → 15/15 passed
npm run lint      → 0 errors
npm run build     → 0 errors
```
