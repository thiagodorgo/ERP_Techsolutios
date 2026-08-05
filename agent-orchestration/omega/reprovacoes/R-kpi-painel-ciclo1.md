# R-KPI-PAINEL — ciclo 1 · REPROVADO (2026-08-04)

**Entrega:** painel de KPI com visão gráfica (`D-KPI-INDEX-PAINEL`) — decisão do dono: *"o principal
arquivo é o index.html onde vc vai reorganizar colocar graficos para uma melhor visualização."*

**Junta:** `critico-adversarial` (REPROVADO, 4 ALTA) + `cognicao-visual` (REPROVADO, 3 bloqueadores).
Vereditos independentes, achados convergentes nos dois pontos mais graves.

> Protocolo §C7.4 — ciclo 1. Não houve parada: os dois agentes entregaram correção **concreta e
> mensurada** para cada achado, então o ciclo virou correção direta em vez de fabricação de novos
> especialistas. Re-verificação pela mesma junta ao fim do ciclo.

## Por que reprovou (o resumo honesto)

Os testes estavam verdes e o painel estava errado. Três dos quatro ALTA atacavam exatamente a
honestidade (D-007) que o próprio PR redigia como norma — o padrão que já se repetiu nesta base
(CSS morto por comentário no PR-D das Telas, `@media print` global no Ω-VID PR-10): **`tsc` não tipa
HTML/CSS, o jsdom dos smokes não faz layout, e nenhum teste olhava para o dado desenhado.**

## Achados e o que foi feito

| # | Achado | Correção aplicada |
|---|---|---|
| **A1 / B1** | O `hidden` do `#charts-section` era **decorativo**: `.section-grid--tight{display:block}` é origem AUTOR e vence `[hidden]{display:none}` do user agent por origem, não por especificidade. Em `file://` o dono via **4 caixas brancas vazias**. | `[hidden]{display:none !important}` em `styles.css` + `#charts-offline-note` explicando por que não há gráfico (degradação honesta em vez de buraco mudo). Guard passou a exigir a regra por texto — o stub de DOM jamais veria cascata. |
| **A2 / B2** | "Ritmo de entrega" desenhava uma barra **fantasma de +969**. Duas causas somadas: `\|\| 0` transformava métrica **ausente** em zero, e o cálculo ignorava a chave legada `frontend_smoke` (28 snapshots). Delta real do PR: **19**. A barra falsa era o máximo da série → **14 das 24 barras reais ficavam ≤2px**. | Delta **por métrica**, contado só quando **os dois lados foram medidos**; helper `smokeOf()` reconcilia a chave legada. Maior barra real caiu de 969 para 42. |
| **A3** | O PR decretava "o painel nunca defasa" e **não apendava o próprio snapshot** no history nem atualizava `backend_tests` (o teste novo entra na suíte). | Snapshot `KPI-INDEX-PAINEL` apendado com contagem de execução real; `kpis-latest.json` e a §1 do CRONOGRAMA reconciliados. |
| **A4** | **O guard era teatro.** O crítico substituiu as 3 séries por retas sintéticas e os 4 testes passaram verdes — só checavam "tem `<svg>`" e "a legenda contém os números". | `buildChartSeries()` exposta como função pura; o guard recalcula a série do JSON **independentemente** e compara ponto a ponto, conta os vértices desenhados e audita a janela do ritmo. Provado por **4 mutações**: série fabricada (2 falhas), `[hidden]` removido (1), history truncado (3), `\|\|0` restaurado (1). |
| **B3a** | Escala Y compartilhada achatava o **Flutter** — que cresceu **37%** — numa reta de 23px. | **Small multiples**: uma faixa por trilha, escala própria, nível na manchete. O gráfico mostra forma; o número mostra nível. |
| **B3b** | `W=960` fixo com largura CSS variável fazia `font-size="11"` renderizar a **15,3px** num painel e **7,3px** no outro. | `width` por painel (1 unidade de viewBox ≈ 1px CSS). |
| **F4** | Eixo X era **índice** rotulado com **data**: o primeiro quarto da largura cobria 34 dias e o último, 7. Além disso o último ponto ficava sem rótulo. | X proporcional à data real + tick final forçado. |
| **F6** | **11 hexes de outro design system** — três azuis diferentes na mesma dobra (eyebrow `#146c94`, backend `#2563EB`, blocos `#0EA5E9`). | Tokens `--chart-1..4/--chart-grid/--chart-axis/--chart-value/--chart-bar` derivados da paleta do painel, consumidos por `var()` dentro do SVG. |
| **F7** | *"REORGANIZAR"* não aconteceu: os números de manchete estavam a **8,3 telas** de rolagem (y≈7.502px), atrás do changelog — e o PR os empurrou **1.194px mais para baixo**. | `#kpi-cards` movido para a **primeira dobra**, logo após o hero. A seção do changelog passou a se chamar **"Entregas por PR"** (é o que ela é). |
| **F9** | Lacuna de medição era **interpolada em silêncio** (3 no backend, 7 no smoke): o leitor via medição contínua onde não houve. | Uma polyline por trecho contíguo; o salto vira **tracejado translúcido**. |
| **F10** | Eixo Y em `0 · 571 · 1.142 · 1.713`. | Passo redondo (1/2/5 × 10ⁿ). |
| **F11** | `role="img"` é papel **atômico**: o `<title>` das barras saía da árvore de acessibilidade e o gráfico de linhas não tinha valor algum legível. | `aria-label` com os números reais + **tabela `.sr-only`** ligada por `aria-describedby`. |
| **M5** | `Math.max(0, delta)` **apagava quedas reais** (−628 e −850 no dado). | Queda vira **barra âmbar com sinal**; zero não desenha barra. |
| **M6** | `roundOf` testava o substring `CHECKLIST` **antes** das rodadas: `OMEGA-VID-PR-08-CHECKLIST-GUINCHO-TAB` caía em "Checklist" e a barra Ω-VID mostrava 10 em vez de 11. | Rodada vence substring; o teste de checklist virou `startsWith`. |
| **M7** | O corte declarado (13/07) estava errado: mesmo depois dele, **Ω4 inteira tem 1 snapshot** e aparecia como a menor barra do projeto ao lado de Ω5P=28. | Corte em **19/07** (quando o registro por PR virou contínuo) + subtítulo dizendo por que as rodadas anteriores ficam de fora. |
| **M8** | Frescor misto: se `latest` falhasse e o `history` carregasse, cards congelados conviviam com gráficos correntes, sem aviso. | Os gráficos só aparecem no mesmo caminho em que o `latest` chegou. |
| **B9** | Código citava `D-KPI-INDEX-CHARTS`; a decisão registrada é `D-KPI-INDEX-PAINEL`. | 4 citações renomeadas. |
| **B10** | `metricNumber` lia `"1.003/1.003"` como **1** — e o guard usava a mesma regex, então a corrupção passaria verde. | `split("/")[0].replace(/[^\d]/g,"")`; o guard reimplementa a leitura **de forma independente**. |
| **B11** | Cor/valor entravam no SVG sem escape (não explorável hoje — só constantes). | `escapeHtml` em todo atributo derivado. |
| **B12** | O CRONOGRAMA listava a Ω5P sem mencionar os **2 PWAs** (owner-portal + authority-portal, `D-Ω5P-11`, PRs #16–#18) — a entrega mais demonstrável da rodada. | Linha acrescentada na §2. |

## Achado NÃO fechado neste ciclo (registrado, não escondido)

Nenhum. Os dois itens que a junta ofereceu como "pendência aceitável" (B11 hardening, B12 doc)
entraram no mesmo ciclo.

## Ataques que falharam (crédito ao PR original)

`escapeHtml` cobria todo caminho de dado→markup, inclusive em contexto de atributo; §2.8 allowlist
limpa (só `dd/mm` e rótulo de rodada); `Promise.all` já impedia render meio-feito quando o history
falha; `CLAUDE.md` × `AGENTS.md` idênticos byte a byte; a classificação de rodadas não deixava nada
cair em "Outras"; e todos os números da §1 do CRONOGRAMA batiam com os JSON e o `git log`.
