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

## Política permanente de KPIs pós-avaliação humana

1. PRs de feature nao devem atualizar arquivos de KPI.
2. PRs de feature devem reportar KPIs propostos apenas no relatorio final.
3. KPIs so devem ser atualizados apos avaliacao humana aprovando a entrega.
4. KPIs so devem ser publicados apos merge e gate confirmando sucesso.
5. A publicacao de KPIs deve ocorrer em bloco separado documental/KPI, como B-xxxK ou B-xxxF.
6. Se a entrega mexeu em Flutter/mobile, atualizar `mobile/flutter_app/Kpis/*` e refletir em `Kpis/*`.
7. Se a entrega mexeu fora do mobile, atualizar `Kpis/*`.
8. Se a entrega mexeu nos dois, atualizar ambos.
9. Se existir `index.html`, atualizar tambem o HTML.
10. O bloco de KPI deve preencher PR, merge commit e approved head reais. Campos null bloqueiam o proximo bloco.

## Política de limpeza pós-validação

Todo bloco que executar testes, builds, Flutter, Node, Android, iOS ou geracao de artefatos deve limpar os artefatos temporarios ao final, sem apagar arquivos rastreados e preservando assets untracked explicitamente permitidos.

## Regra de atualizacao

### Politica de KPIs duplos

Existem dois conjuntos de KPIs:

- `mobile/flutter_app/Kpis/`: KPIs especificos do app Flutter.
- `Kpis/`: KPIs gerais/raiz do projeto.

Regras obrigatorias:

- Mexeu no Flutter/mobile: atualizar `mobile/flutter_app/Kpis/*` e refletir os
  percentuais mobile em `Kpis/*`.
- Mexeu fora do mobile: atualizar `Kpis/*`.
- Mexeu nos dois: atualizar os dois conjuntos.
- Se existir `index.html`: atualizar tambem o HTML.

No pos-B-106, os valores mobile refletidos na raiz sao: Flutter 633/633,
Backend 15/15, contratos focados 47/47, modulos Flutter 17/17, MVP demo 90%,
MVP vendavel 68% e 36 blocos entregues.

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
