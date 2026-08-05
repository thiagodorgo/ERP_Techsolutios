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

### PR-B — Ordens de Serviço — VOTOS DA JUNTA (2026-08-04) — **APROVADO (condição de 1 linha fechada)**

`cognicao-visual` (forense contra o `sc_os`, hex a hex): **APROVADO_CONDICIONADO → condição fechada antes do merge.**
- **MÉDIA-1 (fechada):** a variante `--sm` do StatusPill fora aplicada na SITUAÇÃO da tabela — mas no protótipo a
  tabela de OS usa a pill **base** (10.5px/3px 9px, `.dc.html:309`); a pill 10px pertence às **listas do Dashboard**
  (`:191`/`:217`). **RETIFICAÇÃO da ata do PR-A:** a BAIXA 1 ("tabela de OS usa pills 10px em massa") estava
  **factualmente incorreta** contra o protótipo. Fix: `sm` removido da SITUAÇÃO (variante mantida para as listas
  compactas, seu lugar correto). Bateria re-executada verde (997/997).
- **PIXEL/TOKEN PASS** (zero divergência de cor: grade 130px/2.2fr/1.1fr/1fr/.9fr; chip sem-cliente FEF3C7/B45309 +
  Vincular; Atribuir FFFBEB/FDE68A/B45309 gated por field_dispatch:create com destino real; prioridade com dot;
  agenda com hierarquia; pager exato). **LINGUAGEM/HONESTIDADE/CAPACIDADE/ESTADOS/A11Y/NÃO-REGRESSÃO PASS**
  ("Atribuído" sem nome julgado honesto e claro; contagens 100% reais; Dar andamento/Revogar/checklist-chip/
  clique-na-linha/auto-refresh preservados; gates cobertos por teste intocado).

**Degradações honestas (D-007) declaradas:** nome do técnico ausente no DTO de lista → "Atribuído" (pendência
P-WO-LIST-TECH-NAME abaixo); "SLA em risco"→Atrasadas (precedente PR-A); "Concluídas hoje"→total; "atualizado há X
min" omitido; Exportar/Filtrar omitidos (filtros reais são inline).

**BAIXAs registradas (não bloqueiam):** hover ausente nos botões de WorkOrderRowActions (pré-existente); cabeçalho de
colunas com aria-hidden (candidata a passada role="table" nas 5 telas ao fim da rodada); hint do KPI aberto ("sem
desfecho final"); foco teal herdado do kpi-card-clickable (pré-existente); dd/mm sem ano em agendas distantes.

**Pendência de backend registrada:** P-WO-LIST-TECH-NAME — incluir o NOME do técnico atribuído no DTO da lista de OS
(hoje só o id), para a coluna TÉCNICO exibir avatar+nome como no design.

### PR-C — Usuários + Auditoria — VOTOS DA JUNTA (2026-08-04) — **APROVADO (2 MÉDIAs fechadas no próprio PR)**

`cognicao-visual` (forense código×protótipo + render SSR; **degradações confirmadas VERDADEIRAS no backend**):
**PIXEL/TOKEN PASS** (grade users exata; grade audit adaptada COM HARMONIA — a coluna ORIGEM removida redistribui
proporções; chips RC/badge acesso-total/pills US/daybar/hora mono hex a hex), **LINGUAGEM PASS** (dicionário de
auditoria bate semanticamente com o EV do protótipo: `auth.refresh.success`→"Sessão renovada" etc.; `inventory`→
"Estoque"; desconhecida→"Atividade registrada no sistema"), **HONESTIDADE PASS** (verificado no código: `User` só tem
`createdAt` — sem last_access; DTO de auditoria com allowlist estrita §2.8 — device/IP NUNCA saem; nada fabricado),
**CAPACIDADE/ESTADOS/A11Y/NÃO-REGRESSÃO PASS** (999/999; asserts de RBAC/§2.8 preservados; app.css aditivo).

**2 MÉDIAs — FECHADAS no próprio PR:**
1. O filtro-por-ator ecoava o **UUID cru** no input "Usuário" → agora vira **chip "Filtrando por 1 usuário · limpar"**
   (o id fica só no estado; `UUID_RE`).
2. "Ver auditoria deste usuário" navegava sem filtrar → agora **deeplink real** `/audit?actorId=` que semeia o filtro
   no mount e some da URL (replace).

**Degradações honestas (D-007) confirmadas + pendências:** "ÚLTIMO ACESSO"→**CRIADO EM** (P-USERS-LAST-ACCESS);
"Convites pendentes"→**Inativos** (enum real é active|inactive); QUEM sem nome→"Usuário"+cor determinística
(P-AUD-ACTOR-NAME); coluna ORIGEM omitida (imposta pela allowlist §2.8 do backend — não é gap, é segurança);
"Últimas 24 horas"→"Hoje". **BAIXA-4 (declarada agora):** vs a página antiga perderam-se ordenação por coluna e
persistência de busca na URL — o protótipo não os tem (fidelidade vence); recuperáveis depois se o dono pedir.
BAIXAs menores: pill 10.5 vs 11px (inconsistência interna do próprio design entre sc_os e sc_users — seguimos o
precedente BASE), plurais fixos, role="table" (passada ao fim da rodada).

### PR-D — Pátios — VOTOS DA JUNTA (2026-08-04) — **APROVADO (ciclo 1 REPROVADO → rework → ciclo 2, 4 MÉDIAs fechadas)**

**Ciclo 1 — REPROVADO (`cognicao-visual`, com dev server + medição de estilo computado + screenshots):**
- **CRÍTICA:** o comentário `/* … Reusa .pat-table*/.pat-kpi* … */` **fechava cedo** no `.pat-table*/` e o parser
  **descartava a regra `.pat-patios-grid` inteira** → a tabela de Pátios ficava **sem grade** acima de 1100px
  (medido: `grid-template-columns` = "1118px", coluna única). `tsc` e os smokes não pegam (CSS não é tipado; o
  ambiente de teste não faz layout). **Fechada** + **guard novo** `frontend/tests/pattern-css-guard.test.ts` (3
  testes) que remove comentários como o parser faz e exige que as 4 grades + 8 regras estruturais do padrão
  sobrevivam (a revisora quebrou o comentário de propósito e confirmou que o guard falha).
- **3 ALTAs de token** (botão primário navy em vez do azul do padrão; células ENDEREÇO/FUSO lavadas; KPIs afirmando
  zeros com selo verde sob erro) — **todas fechadas**.

**Ciclo 1 — `critico-adversarial` APROVADO_CONDICIONADO, com um achado que MELHOROU o PR:**
- **ALTA:** a degradação declarada ("não há ocupação na listagem") era **FALSA** — `/patios/dashboard/summary`
  entrega ocupação por pátio em **uma** requisição e o app já a consome no Painel. **Implementado de verdade:**
  barra de ocupação real por pátio + KPIs do design (custódia/ocupação média/liberações), com fallback honesto.

**Ciclo 2 — re-verificação:** `cognicao-visual` **APROVADO_CONDICIONADO** (grade medida a 1440px = exatamente a do
protótipo; ocupação hex a hex; 3 ALTAs confirmadas fechadas) e `critico-adversarial` idem. **4 MÉDIAs fechadas:**
`role="table"` movido para o wrapper de head+linhas (topbar/vazio/pager fora); contagem não afirma "0 pátios" sob
erro; `aria-label` do botão de ordenação usa o **rótulo visível** (WCAG 2.5.3); hover/foco do nome-link.

**Correções transversais às 5 telas** (nascidas aqui): `TablePager` virou `<nav aria-label>` com `aria-live` no
range; `.pat-skel` ganhou pulso com `prefers-reduced-motion`; `.pat-cell-body` padroniza a célula de corpo.

**Degradações honestas (D-007) desta tela:** sem código do pátio no modelo (`YardItem` não tem) → sub-linha do
protótipo omitida; "Exportar" omitido (sem ação real, como em Dashboard/OS); sem `impound:read` a coluna vira
**CAPACIDADE PREVISTA** e os KPIs recaem no cadastro (selo "sem acesso à custódia").
