# KPI Ω6R

Números reais da rodada; limitações são explícitas.

> **Reconciliação pós-merge (2026-08-14).** Os números de cobertura abaixo estavam errados por uma unidade e
> a diferença não era de arredondamento: a matriz tem **70** unidades, não 69, e a que faltava — `jurisdiction`
> — aparecia ✅ nas cinco lentes **sem relatório e sem um único achado citando o módulo**. Em vez de apagar a
> linha, o módulo foi revisado de fato (`02_MODULOS/jurisdiction.md`), o que produziu `Ω6R-DAT-004`. Os
> contadores refletem o estado depois disso.

## Cobertura

- Unidades revisadas: 70/70 = **100%** por cinco lentes (censo estrutural integral + leitura profunda estratificada). Até 2026-08-14 este KPI dizia 69/69: contava as unidades com relatório, não as da matriz.
- Módulos backend: 65/65 (exatamente os diretórios de `src/modules`); clientes/infra: 5/5 — `frontend-web`, `mobile-flutter`, `portal-owner-pwa`, `portal-authority-pwa`, `infra-jobs-scripts`. O "4/4" anterior omitia uma das cinco.
- Auditorias transversais: 8/8 = **100%**.
- Matriz: 350/350 células módulo×lente ✅ (70 × 5). O "345/345" anterior era 69 × 5.
- Arquivos diretamente nomeados nos inventários de leitura das lentes: mínimo verificável 143 únicos na Fase 2, mais os 10 arquivos de `src/modules/jurisdiction` nomeados na reconciliação → piso de 153; 153/2.741 arquivos rastreados = **5,6%**. O conjunto exato dos 143 não é reproduzível a partir dos documentos publicados (os relatórios de módulo citam `src/modules/<mod>/**`, não arquivo a arquivo), então o número é um piso declarado, não uma lista auditável. Código também foi censado por `rg` integralmente; não se converteu censo em “arquivo lido”.

## Achados

| Severidade | Total |
|---|---:|
| P0 | 15 |
| P1 | 15 |
| P2 | 0 |
| P3 | 0 (0%; teto 10% respeitado) |

| Categoria | Total |
|---|---:|
| DIN | 9 |
| QUA | 5 |
| ARQ | 4 |
| SEC | 4 |
| DAT | 4 |
| PERF | 3 |
| TEN | 1 |

Total: **30**. A J-6R votou sobre **29**; `Ω6R-DAT-004` (P1, `jurisdiction`/`charging`) entrou na reconciliação
pós-merge e **não passou pela votação de severidade da junta**.

## Densidade — cinco módulos críticos

| Módulo | LOC | Achados relacionados | /1k LOC |
|---|---:|---:|---:|
| financial-titles | 1.921 | 4 | 2,08 |
| financial-entries | 1.587 | 3 | 1,89 |
| expense-management | 1.698 | 3 | 1,77 |
| core-saas/auth (somados) | 7.088 | 4 | 0,56 |
| inventory | 5.116 | 3 | 0,59 |

## Endpoints, tenancy e qualidade

- Endpoints Express: 403 em 70 arquivos.
- Endpoints autenticados: 387/403 = **96,0%**; 16/403 públicos intencionais. Mecanismo authn/publicidade classificado: 403/403 = 100%.
- Validação de entrada certificada endpoint a endpoint: **não calculável honestamente** a partir do censo lexical; a rodada verificou os caminhos críticos, mas não criou uma linha de evidência por endpoint. Esse KPI fica `N/D`, não estimado.
- Prisma tenant: 103 modelos com `tenant_id`; 102/103 com ENABLE+FORCE RLS. Exceção híbrida global/tenant documentada.
- Amostra manual tenant/raw SQL de alto risco: 72 ocorrências raw entraram no censo; paths críticos reabertos estavam parametrizados. Nenhuma porcentagem total é atribuída sem ler semanticamente as 72.
- `any` TypeScript explícito confirmado: 1; supressões TS: 0; tokens TODO/FIXME/HACK literais confirmados: 13, majoritariamente palavra portuguesa em comentário.
- Testes: backend 218 arquivos/2.207 casos textuais; frontend 139/1.105; Flutter 60/854.
- Módulos financeiros sem teste Prisma concorrente comprovado: 4 — financial-entries, cheques, financial-period-closes, expense-management.

## Supply chain

- Avisos: raiz 8, frontend 5, owner portal 1, authority portal 1.
- Critical: 0; high: 8; moderate: 5; low: 2.
- Com caminho de exploração produtivo confirmado: **0**.

## Consistência documental

- Registro Markdown: 30; JSONL: 30; IDs citados: 30.
- Consistência: **100%**; órfãos 0; achados sem relatório 0.
- Superseded: **1 parcial** — `Ω6R-QUA-004` teve o componente *timeline* corrigido pelo PR #351 (`7e60b90`),
  verificado em `origin/main` `e80430a`; detalhe, status e assign seguem abertos, então o achado permanece
  ativo. O "superseded: 0" anterior era verdadeiro na Fase 4 e ficou defasado quando o #351 mergeou.
- Relatórios de módulo: 70/70 (`02_MODULOS/jurisdiction.md` criado na reconciliação de 2026-08-14).
