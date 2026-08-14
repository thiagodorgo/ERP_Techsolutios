# KPI Ω6R

Números reais da rodada; limitações são explícitas.

## Cobertura

- Unidades revisadas: 69/69 = **100%** por cinco lentes (censo estrutural integral + leitura profunda estratificada).
- Módulos backend: 65/65; clientes/infra: 4/4.
- Auditorias transversais: 8/8 = **100%**.
- Matriz: 345/345 células módulo×lente ✅.
- Arquivos diretamente nomeados nos inventários de leitura das lentes: mínimo verificável 143 únicos; 143/2.741 arquivos rastreados = **5,2%**. Código também foi censado por `rg` integralmente; não se converteu censo em “arquivo lido”.

## Achados

| Severidade | Total |
|---|---:|
| P0 | 15 |
| P1 | 14 |
| P2 | 0 |
| P3 | 0 (0%; teto 10% respeitado) |

| Categoria | Total |
|---|---:|
| DIN | 9 |
| QUA | 5 |
| ARQ | 4 |
| SEC | 4 |
| DAT | 3 |
| PERF | 3 |
| TEN | 1 |

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

- Registro Markdown: 29; JSONL: 29; IDs citados: 29.
- Consistência: **100%**; órfãos 0; achados sem relatório 0; superseded 0.
