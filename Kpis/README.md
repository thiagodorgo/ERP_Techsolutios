# KPI Dashboard — ERP Techsolutions

Dashboard local de metricas de qualidade e progresso do projeto.
Nenhuma dependencia externa. Sem CDN. Dados em JSON local.

## Visualizar

```bash
# Opcao 1 — npx serve (Node.js)
npx serve Kpis/
# Abre em http://localhost:3000

# Opcao 2 — Python
python -m http.server 8080 --directory Kpis/
# Abre em http://localhost:8080

# Opcao 3 — VS Code
# Instale "Live Server" e abra Kpis/index.html com "Open with Live Server"
```

> **Nao abrir o index.html direto no browser** — o fetch() de JSON e bloqueado
> por politica de CORS em file://. Use sempre um servidor local.

## Estrutura

```
Kpis/
  index.html          — Dashboard principal (11 secoes)
  styles.css          — Visual premium sem dependencias externas
  app.js              — Logica de carregamento e renderizacao
  kpis-latest.json    — Snapshot atual (atualizar a cada entrega)
  kpis-history.json   — Array de snapshots historicos
  kpis-history.md     — Historico legivel por humanos
  README.md           — Este arquivo
```

## Atualizar apos cada entrega

A partir de **B-099K**, toda entrega deve atualizar Kpis/:

### 1. Atualizar `kpis-latest.json`

Editar os campos `value`, `snapshot_date`, `version`, `branch` e `description`
com os dados reais da nova entrega.

Campos com `"type": "real"` devem ter valores vindo de ferramentas:
- `flutter_tests`: output de `flutter test`
- `npm_tests`: output de `npm test`
- `flutter_analyze`: output de `flutter analyze`
- `npm_lint`: output de `npm run lint`
- `npm_build`: output de `npm run build`

Campos com `"type": "estimated"` sao avaliacao qualitativa — documentar
o criterio no campo `"detail"`.

### 2. Adicionar snapshot a `kpis-history.json`

Adicionar ao final do array:

```json
{
  "snapshot_date": "2026-06-XX",
  "version": "B-100",
  "flutter_tests": 448,
  "npm_tests": 15,
  "flutter_modules_ready": 13,
  "flutter_modules_total": 15,
  "flutter_mvp_demo": 80,
  "flutter_mvp_vendavel": 55,
  "blocks_completed": 29,
  "description": "B-100 OS Sync Bidirecional"
}
```

### 3. Adicionar entrada a `kpis-history.md`

Adicionar ao topo do arquivo com data, versao, tabela de KPIs e resumo.

### 4. Commitar

```bash
git add Kpis/
git commit -m "docs(kpis): update dashboard for B-XXX"
```

## Secoes do dashboard

| # | Secao |
|---|-------|
| 1 | Resumo Geral — 8 cards de destaque |
| 2 | Qualidade de Codigo — flutter/npm testes + linting |
| 3 | Mobile Flutter MVP — modulos, demo %, vendavel % |
| 4 | Inventario de Modulos Flutter — tabela com status por modulo |
| 5 | Backend Node.js / API — modulos e integracao |
| 6 | Velocidade de Entrega — blocos entregues, PRs |
| 7 | Historico de Evolucao — grafico de barras + tabela |
| 8 | Lacunas para Producao — itens vermelhos pendentes |
| 9 | Proximos Passos — B-100, B-101, B-102 |
| 10 | Constraints de Entrega — checklist de seguranca |
| 11 | Como Atualizar — instrucoes inline |
