# Jornadas por papel — Módulo Controle (actor-flows)

> Jornada dos **9 papéis canônicos** (`RBAC_MATRIX.md`) ancorada ao Módulo Controle (F1–F12) e aos fluxos
> existentes. É a base de decisão humana da F0: **fluxo é decisão humana** — mudar um passo exige aprovação
> (condição de parada). Rótulos de UI em PT-BR (§3 do CLAUDE.md); nomes técnicos só entre parênteses.
> Rotas citadas são reais (`App.tsx`, recon 2026-07-07).

## Papéis (interno → rótulo UI)

`platform_admin`→Admin Plataforma · `tenant_admin`→Administrador · `manager`→Gestor Operacional ·
`operator`→Operador · `finance`→Financeiro · `inventory`→Estoque · `field_technician`→Técnico de Campo ·
`auditor`→Auditor · `support`→Suporte. (Papéis "standard" do código: `super_admin`, `field_dispatcher`
≈ Operador Logístico/Despachante, `technician`, `viewer`.)

---

## 1. Despachante (field_dispatcher / Operador Logístico) — o coração operacional

1. **Entrada da demanda** → Ordens de Serviço (`/work-orders`) ou cria OS (`/work-orders/new`), já
   vinculando **cliente/viatura/equipe/serviço** (B1) — cadastro rápido "+ Novo" na hora (B2).
2. **Decisão de atribuição** por **prioridade × habilidade × deslocamento**: abre o **Mapa Operacional**
   real (`/operations/map`, F6) — posições dos técnicos (stale = último visto), despachos ativos, OS em
   execução; pin da viatura mostra **sem seguro** (F4) e **em manutenção** (F2) → não despacha viatura
   indisponível.
3. **Atribui** operador + (F1-D) viatura/equipe à OS (fluxo `work_order.assign`; mobile offline-safe).
4. **Acompanha** via Despachos (`/operations/dispatches`) e mapa; recebe alertas (multas/manutenção
   vencendo) na central (`/notifications`).
5. **Fecha** a OS (status → concluída), que dispara aprovação operacional quando exigido.

## 2. Técnico de Campo (field_technician / technician) — mobile offline-first

App de campo: recebe a OS → **atendimento** (check-in, execução via checklist, evidências) → registra
**abastecimento** (F1) e **danos com foto** (F5, reusa attachment) → seleciona **viatura/equipe** (D1,
quando permitido) → conclui. Tudo **offline-first**: escrita local + fila idempotente
(`client_action_id`), indicador de sync visível, replay ao voltar online. Vê **dados de cliente**
(documento/telefone, D2) e seu **extrato de comissão** (F8, `read_own`).

## 3. Gestor Operacional (manager) — visão + aprovações + frota

Dashboard operacional (`/dashboard`) com KPIs reais por tenant (C3) + cards vivos "manutenções vencendo"
(F2) e "multas a vencer" (F3) → clique leva à lista filtrada. **Aprovações** (`/approvals`). Gerencia
**Cadastros** (clientes/viaturas/equipes/serviços) e a **Frota** (abastecimento, manutenção, multas,
seguros, danos): edita, agenda manutenção, registra multa/apólice. Lê comissões de todos.

## 4. Financeiro (finance) — custos, multas, remunerações

Hoje o grupo Financeiro está **oculto** (recon §3 — só vê Aprovações); a IA nova (F11) restaura Financeiro
+ Frota-financeira. Fluxo: **custos de frota** (abastecimento R$, manutenção R$, danos custo real) →
**multas** (valores, prazos de pagamento, F3) → **remunerações** (extratos por operador/período, F8) →
cobranças/faturas/pagamentos (`/finance/*`, hoje mock → wiring futuro). Lê tudo; não executa campo.

## 5. Estoque (inventory) — itens, movimentações, contagens

**Itens** (`/inventory`, F7) com classe ABC, saldo (derivado), mín/máx, status de reposição →
**movimentações** (entrada/saída/consumo/ajuste; saída com saldo insuficiente = bloqueio 409) →
**consumo por OS/viatura** → **contagem cíclica** por classe (contado vs sistema → ajuste + variância).
Recebe alerta de **ponto de pedido** e sugere reposição (link para Pedidos, sem comprar automático).

## 6. Administrador (tenant_admin) — governança do tenant

**Usuários** (`/users`, F9: criar/editar papéis, ativar/desativar lógico) · **Configurações da
Organização** (`/administrator/settings`) · **Checklists** (builder) · **Auditoria** (`/audit`). Enxerga
tudo do tenant; cancela multa (único que pode, R3.1); dispara recálculo ABC (F7).

## 7. Operador (operator) — execução operacional

Executa e **solicita** aprovação onde exigido. Lança abastecimento (F1) e movimenta estoque (F7);
lê cadastros e OS. Não aprova política nem atribui (RBAC).

## 8. Auditor (auditor) — visibilidade e rastreabilidade

Leitura forte + **trilha de auditoria** visível (`/audit`) sobre toda mutação de Controle. Não executa.

## 9. Suporte (support) — bounded/auditável

Acesso restrito e logado; **não acessa Cadastros nem a Frota-controle** (consistente com A-D: `support`
sem `*:read` de cadastro). Visão de suporte limitada, sem quebrar segregação.

---

## Ganchos vivos (cards → destino) que a rodada F cria/religa

| Card / elemento | Origem | Destino (rota) | Papéis |
|---|---|---|---|
| "Manutenções vencendo" | Dashboard | `/fleet/maintenance?status=agendada&due=7d` | gestor, tenant_admin |
| "Multas a vencer" | Dashboard | `/fleet/fines?prazo=7d` | gestor, finance |
| "Consumo médio da frota" | Dashboard/F1 | `/fleet/fuel` (filtrado) | gestor, finance |
| Pin "sem seguro" | Mapa (F6) | `/fleet/insurance?vehicle=:id` | despachante, gestor |
| Pin "em manutenção" | Mapa (F6) | `/fleet/maintenance?vehicle=:id` | despachante, gestor |
| Alerta "ponto de pedido" | Notificações (F7) | `/inventory?status=reposicao` → sugestão `/purchase-orders` | inventory, manager |
| Badge do sino | Topbar | `/notifications` (contagem real, F10) | todos |

> **Regra de ouro (screen-element-map):** todo elemento clicável tem destino navegável e papel(is)
> autorizados; elemento sem navegação, ou fora do mapa, é **veto** (card morto).
