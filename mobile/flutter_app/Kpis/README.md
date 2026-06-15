# KPIs Mobile — ERP Techsolutions

Esta pasta contem o dashboard local de KPIs do app Flutter.

## Como abrir

Abra diretamente:

`mobile/flutter_app/Kpis/index.html`

O dashboard possui fallback embutido e deve funcionar por **duplo clique**, sem
servidor. Ao abrir via `file://`, alguns navegadores bloqueiam `fetch()` de JSON
local — nesse caso o dashboard usa o snapshot embutido em `app.js` e mostra um
aviso discreto no topo.

## Dados

Arquivos oficiais versionados (fonte da verdade):

- `kpis-latest.json` — snapshot atual
- `kpis-history.json` — historico de snapshots
- `kpis-history.md` — historico legivel por humanos

O snapshot embutido em `app.js` espelha esses arquivos e deve ser atualizado junto.

## Servidor local opcional

Servidor local e **opcional**, nao obrigatorio. Use apenas se quiser carregar os
JSONs externos diretamente:

```bash
cd mobile/flutter_app/Kpis
python -m http.server 8080
```

Depois acesse `http://localhost:8080`.

## Estrutura

```
mobile/flutter_app/Kpis/
  index.html         — Dashboard (12 secoes)
  styles.css         — Visual claro, navy, sem dependencias
  app.js             — Render + fetch com fallback embutido
  kpis-latest.json   — Snapshot atual (oficial)
  kpis-history.json  — Historico (oficial)
  kpis-history.md    — Historico legivel
  README.md          — Este arquivo
```

## Regra de atualizacao

Toda entrega mobile relevante deve atualizar:

- `kpis-latest.json`
- `kpis-history.json`
- `kpis-history.md`
- o snapshot embutido em `app.js` (espelho de `kpis-latest.json`/`kpis-history.json`)

E, quando necessario: `index.html`, `styles.css`, `app.js`.

Commitar com `docs(kpis): update dashboard for B-XXX`.

## Seguranca

Nao incluir secrets, tokens, credenciais, dados reais de clientes ou informacoes
sensiveis nos arquivos do dashboard.
