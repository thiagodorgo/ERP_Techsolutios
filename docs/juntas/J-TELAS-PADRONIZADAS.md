# J-TELAS-PADRONIZADAS — Rodada de padronização de 5 telas (design do dono via Claude Design)

> **Fonte de verdade visual:** `ERP Web - Telas Padronizadas.dc.html` (raiz do repo — importado do projeto Claude
> Design do dono em 2026-08-04; telas `sc_dash`, `sc_os`, `sc_users`, `sc_audit`, `sc_patios`). Autorização do dono:
> "vamos organizar algumas telas … pode seguir". §11: recriar, não reinterpretar.

## 1. O padrão transversal (extraído do design — vale para as 5 telas)

- **Page header**: kicker (11px/800/`#2563EB`/letter-spacing .09em, o GRUPO do menu: "VISÃO GERAL", "OPERAÇÃO"…) +
  título 22px/800/-.4px + subtítulo 13px/`#64748B`/500 + **ações à direita** (botões 12.5px/700: secundários com
  borda `#E2E8F0` + hover azul; primário `#2563EB`); divisor inferior `#E2E8F0`.
- **KPI card**: fundo branco, borda 12px radius (borda `#FCA5A5` quando crítico); tile de ícone 30px com fundo
  suave; **selo (tag pill)** à direita (10.5px/700, bg/fg semânticos); número 27px/800 tabular; label 12.5px/600
  `#334155`; hint 11px `#94A3B8`. KPIs são **de decisão** (contagens acionáveis com selo), não vaidade.
- **Tabela**: card 14px radius; toolbar (busca + tabs-pill + contagem à direita); header de colunas 10px/800
  letter-spacing .07em `#64748B` sobre `#F8FAFC`; linhas com hover `#F8FAFC`; **paginação padronizada** ("Itens por
  página [select]" à esquerda; "1–8 de 18" + Anterior/Próxima à direita).
- **Chips de status com dot** (6px), pills 99px; **avatares de iniciais** coloridos (paleta rotativa EFF6FF/F0FDF4/
  FAF5FF/FFFBEB/F0F9FF); **fonte mono** (JetBrains Mono ou fallback) para códigos de OS, IP e horários; tabular-nums.
- Fundo do app `#F1F5F9`; cartões brancos; Inter.

## 2. Telas e mapeamento (design → app real)

| Tela | Design | Página real | Dados reais |
|---|---|---|---|
| Dashboard | `sc_dash` | `frontend/src/pages/DashboardPage.tsx` (+ `modules/dashboard/*`) | `useDashboardData` + timeseries real |
| Ordens de Serviço | `sc_os` | `frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx` | adapters/hooks reais |
| Usuários | `sc_users` | `frontend/src/modules/users/pages/UsersPage.tsx` | users adapter real |
| Auditoria | `sc_audit` | página da rota `/audit` | audit-events adapter real |
| Pátios | `sc_patios` | `frontend/src/modules/patios/yards/pages/PatiosPage.tsx` | yards + processos (ocupação) |

**Regra de honestidade (D-007, inegociável):** manter os services/adapters REAIS. Onde o design exibe um dado que a
API não fornece hoje (ex.: dispositivo+IP na auditoria, convites pendentes, canceladas na série), **degradar
honestamente** (omitir a coluna/derivar client-side do que existe) e **registrar pendência** — nunca fabricar.
`sc_soon` ("fora deste lote") é artefato do protótipo: **NÃO** regride telas existentes do app.

## 3. Sequência de PRs

| PR | Escopo |
|---|---|
| **PR-A** | Componentes padronizados compartilhados (`PageHeader`, `KpiStatCard`, `TablePager`, chips/avatares/tokens) + **Dashboard** |
| **PR-B** | **Ordens de Serviço** (lista) |
| **PR-C** | **Usuários** + **Auditoria** |
| **PR-D** | **Pátios** (lista) |

Cada PR: bateria completa (check/test:smoke/build) + junta de fidelidade (`cognicao-visual`/`frontend-pixel`) +
CI verde + KPIs no próprio PR (§C3). Estados obrigatórios (§7) preservados em toda tela.

## 4. Registro de execução
_(por PR, abaixo.)_

### PR-A — fundação de componentes + Dashboard — VOTOS DA JUNTA (2026-08-04) — **APROVADO**

`cognicao-visual` (forense, contra o `sc_dash` do protótipo linha a linha): **PIXEL/TOKEN PASS** (zero divergência de
cor; grids/raios/tipografia exatos; gráfico empilhado na mesma ordem DOM e cores; normalização por maxTotal preserva
proporções reais), **LINGUAGEM PASS** (PT-BR acentuado; zero andaime), **HONESTIDADE PASS** (todos os números do
agregado real; mock só em modo demo com chip declarado; agrupamento de eventos agrupa APENAS idênticos consecutivos;
degradações D-007 conferem), **ESTADOS §7 PASS**, **TELA MORTA PASS** (todos os destinos existem no router — inclusive
links que no protótipo eram noop agora navegam), **NÃO-REGRESSÃO PASS** (tsc limpo; 997/997; asserts de segurança
mantidos; app.css 100% aditivo).

**4 BAIXAs registradas (não bloqueiam; endereçar nos PRs seguintes):**
1. `StatusPill` unifica 2 tamanhos do design → variante `--sm` no **PR-B** (tabela de OS usa pills 10px em massa).
2. "Ver tudo" de Últimos eventos → `/work-orders` (protótipo vai à Auditoria) → decidir no **PR-C**.
3. Selo de "Em andamento" deriva da contagem global de atrasadas (associação semântica frouxa).
4. 5º KPI = "Concluídas" total (hint "no total") vs "Concluídas hoje" do design — degradação honesta, agora declarada.
