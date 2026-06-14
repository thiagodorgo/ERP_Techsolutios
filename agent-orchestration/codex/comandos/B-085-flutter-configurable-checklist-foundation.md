# B-085 — Flutter: Checklist Operacional — Fundacao Schema-Driven

## Objetivo

Implementar a fundacao de Checklist Operacional no Flutter como renderer dinamico de schema publicado pelo backend/admin web. O checklist NAO deve ser hardcoded; Flutter apenas renderiza o schema recebido.

## Criterio de pronto

- [x] Checklist nao e hardcoded — Flutter renderiza schema configuravel
- [x] Operador apenas executa, nunca configura
- [x] OS consegue abrir checklist
- [x] Respostas parciais funcionam (salvas incrementalmente)
- [x] Obrigatorios bloqueiam conclusao (botao disabled enquanto campo vazio)
- [x] Sync actions seguras geradas (sem token, path, base64 no payload)
- [x] 144/144 testes passando (129 + 15 novos)
- [x] `dart analyze`: No issues found
- [x] sem commit, push ou PR

## Arquivos criados

- `mobile/flutter_app/lib/features/checklists/domain/checklist_models.dart`
- `mobile/flutter_app/lib/features/checklists/data/checklist_local_store.dart`
- `mobile/flutter_app/lib/features/checklists/data/checklist_remote_api.dart`
- `mobile/flutter_app/lib/features/checklists/data/checklist_repository.dart`
- `mobile/flutter_app/lib/features/checklists/ui/checklist_available_screen.dart`
- `mobile/flutter_app/lib/features/checklists/ui/checklist_run_screen.dart`
- `mobile/flutter_app/lib/features/checklists/ui/checklist_damage_map_screen.dart`
- `mobile/flutter_app/lib/features/checklists/ui/checklist_acknowledgement_screen.dart`
- `mobile/flutter_app/test/features/b085_checklist_foundation_test.dart`

## Arquivos alterados

- `mobile/flutter_app/lib/core/network/api_contracts.dart` (ChecklistApiEndpoints + ChecklistSyncActionTypes)
- `mobile/flutter_app/lib/app/router.dart` (4 rotas adicionadas)
- `mobile/flutter_app/lib/features/work_orders/ui/work_order_detail_screen.dart` (botao Checklist)

## Decisoes tecnicas

### FutureBuilder no build (nao initState)
`ChecklistRunScreen` usa `_ensureFuture(repo)` no `build()` em vez de `initState`. Isso evita race condition onde o `initState` roda antes da sessao Riverpod resolver, causando o repo com `devBootstrapSession` (tenant 'demo') em vez do tenant correto.

### Labels como Row+Text
Os labels dos campos usam `Row([Text(label), if (required) Text(' *', ...)])` em vez de `RichText(TextSpan(...))`. `find.text()` no Flutter Test nao enxerga conteudo dentro de `RichText` — usar `Row` garante compatibilidade com os testes.

### Seeding de demo com template arquivado no test 3
O teste de "tela vazia" usa um store com template arquivado (status: 'archived') para o mesmo tenant. Isso impede o re-seeding automatico (store nao esta vazio) mas garante que `activeTemplates` retorne vazio.

### scrollUntilVisible substituido por drag
O `scrollUntilVisible` do Flutter Test pode falhar com "Too many elements" em combinacoes especificas de FutureBuilder + ListView lazy. Substituido por `drag(find.byType(ListView), Offset(0, -800))` + tap direto (mesma abordagem dos testes 9 e 10).

### Payload seguro
Os sync actions de checklist nunca incluem token, path privado, base64 ou secrets. O payload de `runComplete` contem apenas `local_run_id`, `completed_at`, `answer_count`.

## Scope fora do bloco

- Backend: sem alteracoes em migrations, rotas API ou schemas Prisma
- Frontend React: nao alterado
- Figma, pagamentos, fiscal, contabil, comissoes, mapa real: nao alterados
