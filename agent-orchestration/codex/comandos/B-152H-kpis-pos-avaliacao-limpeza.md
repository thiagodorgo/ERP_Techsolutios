# B-152H — KPIs pos-avaliacao humana e limpeza local

## Objetivo

Resolver o bloqueio documental pos-B-106 sem implementar feature:

- limpar artefatos locais de testes/builds;
- publicar metadados finais dos KPIs B-106 apos avaliacao humana e merge;
- registrar a politica permanente de KPIs pos-avaliacao humana;
- registrar a politica de limpeza pos-validacao.

## Contexto B-106

- PR: #99
- Merge commit: `aac998eedcd95fba1c1a6a8fa5c09ec6fcaa6f26`
- Approved head: `2ac4215fa6a69a93b546f53816a7bf5fc2766133`
- Branch de origem: `feature/mobile-native-gps-permissions`
- Flutter tests: 633/633
- Backend tests: 15/15
- Backend contract tests focados: 47/47
- MVP demo: 90%
- MVP vendavel: 68%
- Blocos entregues: 36

## Escopo permitido

- `Kpis/*`
- `mobile/flutter_app/Kpis/*`
- `agent-orchestration/docs/status-geral.md`
- `agent-orchestration/codex/log-execucao.md`
- `agent-orchestration/codex/comandos/B-106-mobile-native-gps-permissions.md`
- `agent-orchestration/codex/comandos/B-152H-kpis-pos-avaliacao-limpeza.md`

## Escopo proibido

- `mobile/flutter_app/lib/**`
- `mobile/flutter_app/test/**`
- `mobile/flutter_app/pubspec.yaml`
- `mobile/flutter_app/pubspec.lock`
- `src/**`
- `frontend/**`
- `prisma/**`
- `migrations/**`
- `infra/**`
- `.env`
- lockfiles JS
- Figma

## Política permanente de KPIs pós-avaliação humana

1. PRs de feature não devem atualizar arquivos de KPI.
2. PRs de feature devem reportar KPIs propostos apenas no relatório final.
3. KPIs só devem ser atualizados após avaliação humana aprovando a entrega.
4. KPIs só devem ser publicados após merge e gate confirmando sucesso.
5. A publicação de KPIs deve ocorrer em bloco separado documental/KPI, como B-xxxK ou B-xxxF.
6. Se a entrega mexeu em Flutter/mobile, atualizar `mobile/flutter_app/Kpis/*` e refletir em `Kpis/*`.
7. Se a entrega mexeu fora do mobile, atualizar `Kpis/*`.
8. Se a entrega mexeu nos dois, atualizar ambos.
9. Se existir `index.html`, atualizar também o HTML.
10. O bloco de KPI deve preencher PR, merge commit e approved head reais. Campos null bloqueiam o próximo bloco.

## Política de limpeza pós-validação

Todo bloco que executar testes, builds, Flutter, Node, Android, iOS ou geração de artefatos deve limpar os artefatos temporários ao final, sem apagar arquivos rastreados e preservando assets untracked explicitamente permitidos.

## Validações leves

```bash
node --check mobile/flutter_app/Kpis/app.js
node --check Kpis/app.js
rg -n '"pr": null|"merge_commit": null|"mergeCommit": null|"approved_head": null|"approvedHead": null' Kpis mobile/flutter_app/Kpis && exit 1 || true
rg -n "Política permanente de KPIs pós-avaliação humana|PRs de feature não devem atualizar arquivos de KPI|KPIs só devem ser atualizados após avaliação humana|Política de limpeza pós-validação" agent-orchestration Kpis mobile/flutter_app/Kpis
npm run check
npm run lint
npm test
git diff --check
git status --short
```

## Observacoes

- Nao rodar full Flutter neste bloco.
- Nao rodar Android build neste bloco.
- Preservar os tres PNGs untracked de marca.
