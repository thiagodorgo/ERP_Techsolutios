# B-087 — Flutter: Checklist Persistencia Drift + Renderers Avancados

## Objetivo

Evoluir o checklist operacional (B-085) com:
1. Persistencia real via Drift/SQLite (tenant-scoped, runs retomáveis)
2. Renderer `multiChoice` — checkbox list, selecao multipla, bloqueio required
3. Renderer `vehicleSelector` — dropdown + 4 thumbnails de vista, assets reais
4. Renderer `photoUpload` — metadado de evidencia seguro (sem path/base64/token)
5. Renderer `beforeAfter` — duas areas (Antes/Depois) com metadados de foto
6. `ChecklistDamageMapScreen` melhorado — seletor 4-vistas + imagem por tipo de veiculo
7. `VehicleAssetHelper` — sedan com pasta propria, aliases documentados
8. 20+ novos testes cobrindo todos os itens acima

## Restricoes

- sem commit, sem push, sem PR
- Nao alterar: backend, migrations backend, frontend React, Figma, pagamentos, fiscal, contabil, comissoes, mapa real, secrets, experiments/
- Payload de sync contem somente metadata segura (sem path, sem base64, sem token)

## Arquivos produzidos

| Arquivo | Tipo |
|---------|------|
| `lib/core/local_db/app_database.dart` | modificado (schemaVersion 2→3, 6 novas tabelas) |
| `lib/core/local_db/drift_checklist_local_store.dart` | novo |
| `lib/features/checklists/data/checklist_local_store.dart` | modificado (+loadAttachments/saveAttachment) |
| `lib/features/checklists/data/checklist_repository.dart` | modificado (DriftStore provider, addAttachment, seed expandido) |
| `lib/features/checklists/ui/vehicle_asset_helper.dart` | novo |
| `lib/features/checklists/ui/checklist_run_screen.dart` | reescrito (4 novos renderers + onAddAttachment callback) |
| `lib/features/checklists/ui/checklist_damage_map_screen.dart` | reescrito (vehicleType param, view selector, vehicle image) |
| `lib/app/router.dart` | modificado (vehicleType em query params damage-map) |
| `pubspec.yaml` | modificado (assets: 6 pastas de veiculos) |
| `test/features/b087_checklist_persistence_test.dart` | novo (20 testes) |

## Decisoes tecnicas

### Drift — raw SQL pattern
Identico ao `DriftExpenseLocalStore`: `customSelect`/`customInsert`, sem geração de código, sem build_runner. `CREATE TABLE IF NOT EXISTS` em `onCreate` e `onUpgrade (from < 3)` — seguro porque apenas adiciona tabelas.

### Sedan com pasta propria
`sedan` tem `assets/images/sedan/` dedicada. `car` e `generic` sao aliases documentados que mapeiam para a mesma pasta. `isFallback('sedan')` retorna false — sedan e um tipo nativo, nao fallback.

### DropdownButton em testes
`DropdownButton` fechado nao renderiza itens no widget tree. Para verificar opcoes, e necessario `await tester.tap(find.byType(DropdownButton<String>))` antes de verificar labels.

### Payload seguro de anexos
`addAttachment` registra apenas: `local_att_id`, `local_run_id`, `field_id`, `file_name`, `mime_type`, `size_bytes` (0 como placeholder), `checksum` (nullable). Sem: path absoluto, base64, token de upload, ou conteudo de arquivo.

### beforeAfter storage
Usa `multiChoiceValues` com strings prefixadas: `['before:localAttId', 'after:localAttId']`. `hasValue` = true se lista nao e vazia.

## Validacao

```
flutter test: 179/179 passando
flutter test test/features/b087_checklist_persistence_test.dart: 20/20
git diff --check: sem whitespace errors
```
