# Mapa de elementos por tela (screen-element-map) — LEI

> **É LEI (veto do validador-mestre):** todo elemento clicável tem **ação → destino navegável → papéis
> autorizados**; elemento sem navegação, ou fora deste mapa, é **card morto = veto**. Toda lista tem os 4
> estados (skeleton / vazio-com-ação / erro-com-retry / populado). Rotas `/fleet/*` e `/finance/commissions`
> são novas (F1–F8); as demais existem (`App.tsx`). Padrão comum das telas de Controle: **lista densa
> (filtros na URL + busca + chips de status) → modal de cadastro/edição → (quando há) detalhe com histórico
> e vínculos navegáveis.**

## Padrão de tela de Controle (F1–F5, F7) — elementos obrigatórios

| Elemento | Ação | Destino / efeito | Papéis |
|---|---|---|---|
| Busca (SearchBar) | filtra | estado na URL (`q=`) | leitura+ |
| Chips de status (Todos/…) | filtra | estado na URL (`status=`) | leitura+ |
| Cabeçalho de coluna ordenável | ordena | `sort=&dir=` (dense-list) | leitura+ |
| Paginação (Itens por página / Anterior-Próxima) | pagina | `page=&size=` | leitura+ |
| Botão primário "+ Novo …" | abre modal criar | modal (validação no blur, foco no 1º inválido) | criador (RBAC) |
| Linha da lista | abre | detalhe/modal do registro | leitura+ |
| Ação "Editar" (na linha) | abre modal editar | modal | editor (RBAC) |
| Ação "Desativar/Reativar" | PATCH `is_active` | refresh + AuditLog | editor (RBAC) |
| Vínculo (viatura/condutor/OS) | navega | rota do vínculo (abaixo) | leitura+ |
| Estado vazio → CTA | cria | abre modal criar | criador |
| Estado erro → "Tentar novamente" | refetch | — | leitura+ |

## Dashboard `/dashboard` (cards vivos — C3 + F novos)

| Elemento | Ação | Destino | Papéis |
|---|---|---|---|
| KPI "OS atrasadas" | navega | `/work-orders?status=overdue` | gestor+ |
| Card "Manutenções vencendo" (F2) | navega | `/fleet/maintenance?status=agendada&due=7d` | gestor, tenant_admin |
| Card "Multas a vencer" (F3) | navega | `/fleet/fines?prazo=7d` | gestor, finance |
| Card "Consumo médio da frota" (F1) | navega | `/fleet/fuel` (janela) | gestor, finance |
| Fila crítica → "Abrir OS" | navega | `/work-orders/:id` | gestor+ |
| Alerta "estoque em reposição" (F7) | navega | `/inventory?status=reposicao` | inventory, manager |

## Mapa Operacional `/operations/map` (F6 — matar mock)

| Elemento | Ação | Destino / painel | Papéis |
|---|---|---|---|
| Pin de operador | abre painel lateral | operador → **OS ativa dele** → `/work-orders/:id` | despachante, gestor |
| Pin de despacho | abre painel | detalhe do despacho | despachante, gestor |
| Pin "stale" (último visto > threshold) | alerta | painel com "último visto há X" | despachante, gestor |
| Badge no pin "sem seguro" (F4) | navega | `/fleet/insurance?vehicle=:id` | despachante, gestor |
| Badge no pin "em manutenção" (F2) | navega | `/fleet/maintenance?vehicle=:id` | despachante, gestor |
| Vazio | orienta | "Nenhum operador em campo" (sem ação destrutiva) | — |

## F1 Abastecimento `/fleet/fuel`
Lista por viatura/período + totais (litros, R$, **km/L médio**). Elementos-chave: "+ Novo lançamento";
linha → detalhe; **nome da viatura → `/cadastros/viaturas` (modal/detalhe da viatura)**; card "consumo
médio da frota" → lista filtrada. Modal: odômetro (valida ≥ último — erro sob o campo, 422 no back).

## F2 Manutenção `/fleet/maintenance`
Abas **Preventivas | Corretivas | Histórico** + "+ Nova"; detalhe com peças consumidas (vínculo F7).
Vínculos: viatura → cadastro; peça → item de estoque `/inventory?item=:id`. Concluir exige custo+data.

## F3 Multas `/fleet/fines`
Chips por status + **prazos coloridos** (≤7d aviso, vencido perigo). Vínculos: **condutor → `/users`
(perfil)**; **viatura → cadastro**. Modal: `numero_auto` (409 duplicado no mesmo tenant).

## F4 Seguros `/fleet/insurance`
Lista por viatura com **barra de vigência**; "vencida" derivada (read-only). Vínculo: viatura → cadastro.

## F5 Danos `/fleet/damages`
Lista + modal com **FOTOS** (reusa o **storage provider** do checklist via tabela `DamageAttachment` — sem
storage novo/presigned, ver D-014) + detalhe com **galeria** (upload/baixar/remover; blob autenticado).
Vínculos: **dano → OS de origem `/work-orders/:id`**; **viatura → `/cadastros/viaturas`** (cadastro).

## F7 Estoque `/inventory`
Abas Itens | Movimentações | Contagem. Item: saldo (derivado), classe ABC, mín/máx, status reposição,
**ponto de pedido** (F7b, `reorderPoint`). Elementos: "+ Movimento" (entrada/saída/consumo/ajuste);
**consumo → OS `/work-orders/:id`**; chip-alerta **"Repor"** quando `needsReorder` + filtro "Precisa repor"
→ sugestão **`/purchase-orders`** (link, sem comprar); "Recalcular ABC" (gated `inventory_items:update`,
confirmação → resumo A/B/C); "Nova contagem" (por classe, gated `cycle_counts:create`) → sessão (drawer,
contado editável PATCH on blur) → "Fechar contagem" → relatório de variância + N ajustes gerados / "Cancelar".

## F8 Remunerações `/finance/commissions`
Extrato por operador/período (filtros na URL). Vínculo: linha → **detalhamento por ORIGEM** (drawer com as
comissões da janela) — cada comissão liga a um basis event; quando `source_type="work_order"`, a origem
navega para **`/work-orders/:id`** (senão rótulo PT-BR da origem, sem link morto — ver D-018). `operator`
vê SÓ o próprio (`read_own`); `finance`/`tenant_admin`/`manager`/`auditor` veem todos (`commissions:read`).

## F9 Usuários `/users`
Lista (papel, status, último acesso) + modal criar/editar (papéis do `RBAC_MATRIX`); "Ativar/Desativar"
(lógico, com confirmação); trilha de auditoria visível para `auditor`. `support` não acessa; `tenant_admin`
gerencia; `manager` lê.

## F10 Notificações `/notifications`
Central com categorias/filtros ligados aos produtores (F2/F3/F4/F7). "Marcar lida"/"Marcar todas".
**Badge do sino = contagem real** (`getUnreadNotificationCount`). Item com `work_order_id?` → `/work-orders/:id`.

> **Cobertura:** telas herdadas sem elemento novo (Aprovações, Despachos, Checklists, Configurações,
> Auditoria, Relatórios, Financeiro, Pedidos) mantêm seus elementos atuais; F12 (cera) aplica cabeçalho
> fixo/tabulares/Ctrl+K sem alterar destinos. Qualquer elemento novo introduzido por F1–F12 deve **entrar
> neste arquivo na PR** (o validador-mestre confere o diff contra o mapa).
