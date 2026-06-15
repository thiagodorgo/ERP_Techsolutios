# B-099K — Project KPIs Dashboard

## Objetivo

Criar e manter um dashboard de KPIs do projeto ERP Techsolutions em `mobile/flutter_app/Kpis/`. O dashboard e um arquivo HTML estatico sem dependencias
externas (sem CDN, sem npm packages adicionais, sem Flutter packages adicionais).
Os dados vem de arquivos JSON locais carregados via `fetch()`.

## Branch

`feature/flutter-real-work-orders-pull`

## Regra estabelecida

**A partir da B-099K, toda entrega deve atualizar `mobile/flutter_app/Kpis/`:**

1. Editar `mobile/flutter_app/Kpis/kpis-latest.json` com novos valores (reais via ferramentas, estimados via avaliacao).
2. Adicionar snapshot ao final de `mobile/flutter_app/Kpis/kpis-history.json`.
3. Adicionar entrada ao topo de `mobile/flutter_app/Kpis/kpis-history.md`.
4. Commitar: `docs(kpis): update dashboard for B-XXX`

## Estrutura entregue

```
mobile/flutter_app/Kpis/
  index.html          — 11 secoes: resumo, qualidade, mobile, modulos,
                        backend, velocidade, historico, lacunas,
                        proximos passos, constraints, como atualizar
  styles.css          — dark-mode premium, sem @import, sem fontes externas
  app.js              — fetch() + renderizacao pura (sem jQuery, sem React)
  kpis-latest.json    — snapshot atual com type:"real"|"estimated" por metrica
  kpis-history.json   — array cronologico de snapshots
  kpis-history.md     — historico legivel por humanos
  README.md           — instrucoes de visualizacao e protocolo de atualizacao
```

## Visualizar

```bash
npx serve mobile/flutter_app/Kpis/
# Abre em http://localhost:3000
```

Nao abrir `index.html` diretamente no browser — o `fetch()` e bloqueado
por CORS em `file://`. Usar sempre um servidor local.

## Metricas monitoradas

### Reais (extraidas de ferramentas)

| Metrica | Ferramenta |
|---------|-----------|
| `flutter_tests` | `flutter test` |
| `npm_tests` | `npm test` |
| `flutter_analyze` | `flutter analyze` |
| `npm_lint` | `npm run lint` |
| `npm_build` | `npm run build` |
| `flutter_modules_ready` | inventario manual no status-geral.md |
| `blocks_completed` | contagem de arquivos em agent-orchestration/codex/comandos/ |

### Estimadas (avaliacao qualitativa)

| Metrica | Criterio |
|---------|---------|
| `flutter_mvp_demo` | Percentual de modulos prontos para demo local |
| `flutter_mvp_vendavel` | Percentual de funcionalidades necessarias para venda |
| `backend_modules` | Contagem de modulos backend com endpoints funcionais |
| `prs_merged` | Estimativa baseada no historico de branches |

## Constraints desta entrega

- NÃO usar CDN (Chart.js, Bootstrap, etc.)
- NÃO adicionar dependencias npm ou Flutter
- NÃO esconder falhas ou lacunas (secao "Lacunas para Producao" e obrigatoria)
- NÃO commitar secrets
- NÃO fazer push sem autorizacao explicita

## Snapshot inicial (B-099, 2026-06-14)

| KPI | Valor | Tipo |
|-----|-------|------|
| Flutter Tests | 443/443 | real |
| Backend Tests | 15/15 | real |
| flutter analyze | 0 issues | real |
| npm lint | 0 erros | real |
| npm build | 0 erros | real |
| Modulos Flutter Prontos | 12/15 | real |
| MVP Demo Readiness | 75% | estimado |
| MVP Vendavel | 50% | estimado |
| Blocos Entregues | 28 | real |
