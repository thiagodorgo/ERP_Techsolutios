# Codex PR Workflow para ERP Techsolutions

Use este arquivo ao criar prompts para codex, revisar relatórios de codex ou definir gates.

## 1. Tipos de prompt

### Implementação
Use quando a branch ainda vai criar funcionalidade.

Inclua:
- objetivo do bloco;
- contexto da main;
- branch esperada;
- arquivos permitidos;
- arquivos proibidos;
- contrato técnico;
- testes obrigatórios;
- validações;
- formato de relatório.

### Correção incremental
Use quando uma PR já existe e precisa ajuste.

Inclua:
- número da PR;
- branch exata;
- head atual;
- bloqueador encontrado;
- arquivos permitidos;
- "não abrir nova PR";
- "não fazer merge";
- testes de regressão;
- commit sugerido.

### Gate somente leitura
Use após merge.

Inclua:
- confirmar PR mergeada;
- atualizar main com `--ff-only`;
- não editar nada;
- rodar format check, analyze, tests, lint, build e scans;
- retornar veredito exato.

## 2. Regras de segurança operacional

Sempre incluir:

```bash
git fetch origin --prune
git switch main
git pull --ff-only origin main
git status --short
git worktree list
```

Proibir:

```txt
git add .
git add -A
git reset --hard
git clean
git rebase
git push --force
merge sem autorização
worktree extra
clone temporário
pasta lateral
```

Stage sempre por path explícito.

## 3. Validações típicas Flutter/mobile

```bash
cd mobile/flutter_app
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test <teste_do_bloco> --reporter compact
flutter test --reporter compact
cd ../..
```

Complementar com regressões dos blocos afetados.

## 4. Validações típicas backend/node

```bash
npm run check
npm test
npm run lint
npm run build
node --check mobile/flutter_app/Kpis/app.js
git diff --check
```

Scans úteis:

```bash
rg -n ':\s*\?[A-Za-z_][A-Za-z0-9_]*' mobile/flutter_app/lib mobile/flutter_app/test
rg -n '\?tenantId|\?note|\?checksum|\?captureSource' mobile/flutter_app/lib mobile/flutter_app/test
rg -n 'tenant_id|tenantId|authorization|token|base64|file_data|local_path|path' <arquivos_de_payload>
```

## 5. Formato de relatório final para codex

```md
# <bloco>

## 1. Resumo
## 2. Branch
## 3. Commits/head
## 4. PR
## 5. Arquivos alterados
## 6. Contrato implementado
## 7. Segurança
## 8. Escopo real
## 9. Testes adicionados
## 10. Regressões rodadas
## 11. KPIs/docs
## 12. Validações
## 13. Escopo proibido
## 14. CI remoto
## 15. Pendências
## 16. Pronto para revisão?
```

Resposta final deve ser exatamente uma destas:

```txt
Sim, pronto para revisão.
```

ou

```txt
Não, ainda precisa correção.
```

## 6. Critérios para aprovar PR

Aprovar apenas se:

- PR está open ou mergeada conforme o objetivo;
- não é draft, quando pronta;
- CI remoto está success;
- escopo está limpo;
- testes focados e regressões passaram;
- full suite passou quando exigida;
- docs/KPIs não mentem sobre limitações;
- segurança, tenant isolation e idempotência estão cobertos;
- não há arquivo proibido;
- não há bloqueador funcional ou operacional.
