# DEMO-UX — o produto de demo e de UX do ramo `demo/investidor`, a caminho da `main` pela nuvem

**Decisão:** `D-DEMO-UX-NUVEM` (dono, 2026-09-30), em `agent-orchestration/controle/decisoes.md`. Por padrão,
**tudo vai para a nuvem** (sessões em claude.ai/code). O que toca trabalho em curso ou planejado **também vai,
mas em pasta separada** ([`trilha-em-espera/`](trilha-em-espera/README.md)), com comportamento e previsão
escritos. O resto está em [`trilha-livre/`](trilha-livre/README.md).

**Fonte do código:** o ramo `origin/demo/investidor` (49 commits de 23–29/08, base comum `6efe5adf`). Nada se traz
por merge direto. Cada **tema** vira bloco com plano, crítico, junta e porteiro. O arquivo do demo é **referência
de comportamento**, reportado sobre a `main` de hoje, nunca copiado às cegas.

**Manifesto:** [`manifesto.tsv`](manifesto.tsv), arquivo a arquivo, **gerado** por
[`gerar-manifesto.py`](gerar-manifesto.py) (nunca à mão). Para regenerar:

```bash
git fetch origin
python docs/revisoes/DEMO-UX/gerar-manifesto.py --pr 388 --pr 389 --pr 393 \
  --concluido B-SAN3-00 --concluido B-SAN3-01 --concluido B-SAN3-04a --concluido B-SAN3-B1 \
  --concluido B-O6R-07a --concluido B-O6R-07b --concluido B-O6R-06 > docs/revisoes/DEMO-UX/manifesto.tsv
```

Medido em 30/09 contra a `main` `3b1fe0f9`: **281 arquivos de produto que a `main` não tem; 156 na trilha livre
e 125 em espera.** Sufixo `*` num bloco quer dizer **sobreposição nominal**: o bloco declara um diretório amplo
(ex.: `scripts/`, `frontend/src/`), não o arquivo.

## Os temas

| tema | o que faz (lido nos commits do demo) | livre | espera | o que segura a espera | previsão |
|---|---|---|---|---|---|
| **T1 seeds da demo** | 6 scripts idempotentes de seed do tenant de demo (pátios, financeiro, dossiê, preços, OS, frota e multas), com `--limpar`/`--reverter` escopados; "polimento" de nome de negócio. Commits `69d98bc2`, `2d8d38d9`, `43886901`, `9d406ca4`, `02ee543f`. | 0 | 12 | só **nominal** (`B-SAN3-05*`, `B-SAN3-18*` declaram `scripts/`); relação real com o `B-SAN3-07` (seed demo com nome de negócio) | pode ser planejado já; entra depois de o plano mostrar que não colide com o `B-SAN3-07` |
| **T2 vídeos e assets** | vídeos de fluxo em React (o console web real num iframe, alimentado por snapshot gravado), hub e README, mapa de cadeias de dados de 60 telas, fotos de vistoria. Commits `90d82890`, `8af07948`, `50b828e7`. | 81 | 0 | — | **já** (é documentação e asset) |
| **T3 pátios e dossiê** | painel gerencial de pátios (6 KPIs com selo, barra de ocupação, rosca das 5 fases, prazos, arrecadação); dossiê do veículo com altura estável entre abas, galeria completa e cadeia de custódia real. Commits `70e87920`, `c189518b`. | 0 | 19 | 4 arquivos com o **`B-SAN3-11`** (dossiê, versão da vistoria — plano em curso na nuvem); 15 só com `B-SAN3-06a`/`21*` | os 15: plano já; os 4: depois do `B-SAN3-11` mergear |
| **T4 preços** | Tabela de Valores mostra itens e faixa de valor (agregado por página no backend, `price-table-prisma.repository.ts`/`price-table-resolution.ts`). Commit `9b922f5d`. | 6 | 3 | 3 só com `06a`/`21*` | **já** |
| **T5 visual web e listas** | consistência visual (4 tokens usados e nunca definidos, paridade de cor da OS, KPI com caixa) e "clique na linha abre o objeto" em 37 listas (componente único `clickable-row`). Commits `2720816c`, `d4d0f691`. | 1 | 44 | `B-SAN3-25`, `B-SAN3-12`/`24` (financeiro), `B-SAN3-06b` (console da plataforma — plano em curso na nuvem); o resto só `06a`/`21*` | o que só colide com `06a`/`21*`: plano já, antes do `B-SAN3-21` (que é o último a tocar texto); o resto, depois do bloco nomeado |
| **T6 clique-na-linha (colisões)** | `WorkOrdersPage.tsx`/`GeneralInfoTab.tsx` e o teste de ações da linha — a `main` mudou esses arquivos depois (o `B-SAN3-01`). | 0 | 2 | `main_mudou_depois` + o `B-SAN3-01b` (plano em curso na nuvem) | depois do `B-SAN3-01b`, reportado sobre a versão da `main` |
| **T8 app de campo** | fidelidade ao protótipo (stepper verde, tela de conclusão com comissão verde, cabeçalho da home com Conversas e Notificações, detalhe da OS sem barra de contexto técnico), login pré-preenchido só em `kDebugMode`, e ajustes em checklists, despesas, estoque, sincronização e localização. Commits `36ff8f54`, `21cdddfa`, `fbabe184`, `90d82890`. | 68 | 45 | **4 no #388 em voo** (app de campo); os outros com os blocos da série do app: `B-SAN3-13`…`17`, `B-SAN3-19`, `B-O6R-04b`, `B-O6R-03b` | os 68 livres: depois de a nuvem provar o **Flutter 3.47.5** do CI; os 4 do #388: depois do #388; o resto: um a um, depois do bloco da série que o toca |

**Previsões são ordem de grandeza** e dependem da fila da `main`. O que decide é o bloco que destrava, não a data.
