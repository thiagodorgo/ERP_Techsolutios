# Requisitos

## Fonte consolidada nesta fase

Os requisitos iniciais foram consolidados a partir de:

- `docs/01-visao-produto.md`
- `docs/04-regras-negocio.md`
- `docs/05-requisitos-funcionais.md`
- `docs/06-requisitos-nao-funcionais.md`
- `docs/07-backlog-priorizado.md`

## Estado atual

- blocos de produto, modulos, atores, regras, requisitos e backlog importados
- base pronta para quebrar execucao em blocos menores
- conflito de stack registrado e pendente de validacao final
- `RF-CAD-006` atualizado para Checklists Configuraveis por Tenant, com componentes permitidos pela plataforma, versionamento, auditoria, RBAC, multi-tenancy e preparo mobile/offline

## Slice recomendado para primeira implementacao

1. core SaaS
2. tenancy e isolamento
3. usuarios e papeis
4. auditoria basica
5. ordem de servico MVP
6. checklists configuraveis por tenant, em fases: documentacao, migration/backend base, templates/campos, execucoes/respostas, frontend e mobile/evidencias

## Modulo Controle de Frota (Rodada F)

Detalhe funcional por sub-modulo em `docs/pd-controle.md` e `docs/screen-element-map.md`; plano em
`agent-orchestration/execucao-blocos-F/plano-mestre.md`.

- **RF-FROTA-001 (F1 Abastecimento)** — registrar abastecimentos por viatura (data, combustivel,
  litros, valor, odometro, posto), listar por viatura/periodo com totais (litros, R$, km/L medio),
  km/L derivado no servidor (nunca armazenado), odometro monotonico (422), tela `/fleet/fuel`.
- **RF-FROTA-002 (F2 Manutencao)** — ordens de manutencao (preventiva/corretiva) por viatura com
  maquina de estados (agendada→em_execucao→concluida|cancelada, 422 em transicao invalida), conclusao
  exige custo+data, aviso idempotente de preventiva vencendo (<=7d), viatura em execucao indisponivel
  para OS nova (409), abas Preventivas/Corretivas/Historico em `/fleet/maintenance`.
- **RF-FROTA-003 (F3 Multas)** — multas por viatura/condutor com numero do auto unico por tenant (409),
  maquina de estados (422; cancelar so admin, 403), prazos coloridos + aviso idempotente (<=7d), pontuacao
  informativa, tela `/fleet/fines`.
- **RF-FROTA-004 (F4 Seguros)** — apolices por viatura com numero unico por tenant (409), `vencida`
  derivada da vigencia (read-only), alertas de renovacao 30/15/7d idempotentes, barra de vigencia,
  tela `/fleet/insurance`.
- **RF-FROTA-005 (F5 Danos)** — danos por viatura (opcionalmente vinculados a OS de origem) com maquina
  de estados (registrado→em_tratativa→resolvido, 422), fotos (reuso do storage do checklist; galeria com
  upload/download autenticado; sem storage novo — D-014), custos estimado/real, tela `/fleet/damages`.
- **RF-FROTA-006 (F6 Mapa real)** — mapa operacional 100% real (mock morto, D-007/D-015): posicoes de
  campo + despachos + OS das APIs existentes, painel lateral por pin (OS ativa -> detalhe), stale por
  threshold, badges "Em manutencao"/"Sem seguro" gated por permissao com deep-link para a frota.
- **RF-FROTA-007a (F7a Estoque core)** — itens de estoque (SKU unico por tenant) + movimentacoes
  imutaveis (entrada/saida/consumo/ajuste) com saldo derivado em transacao (409 saldo insuficiente),
  consumo vinculado a OS, custo medio movel na entrada, filtro "abaixo do minimo" real, telas
  `/inventory` (abas Itens|Movimentacoes) + `/inventory/:id` reais (shells fabricadas mortas).
- **RF-FROTA-007b (F7b Estoque avancado)** — classe ABC recalculada por consumo 12m (Pareto); ponto de
  pedido derivado + chip "Repor" + aviso idempotente com sugestao /purchase-orders (sem comprar); contagem
  ciclica (sessao por classe -> contado vs sistema -> ajuste + relatorio de variancia). Aba Contagem em
  `/inventory`.
- **RF-FROTA-008 (F8 Remuneracoes)** — extrato de comissao por operador/periodo (rota agregada in-module
  sobre `commissions`), `read_own` (operator so o proprio), detalhamento por origem (OS quando a comissao
  vem de OS — D-018), tela `/finance/commissions`.
- **RF-ADM-009 (F9 Usuarios)** — tela `/users` real (mata shell fabricada): lista de usuarios do tenant
  (papel/situacao/criado em), modal criar/editar papeis, ativar/desativar (logico, PATCH), link de
  auditoria p/ auditor; guard corrigido p/ `users.read`.
- **RF-ADM-010 (F10 Notificacoes)** — central `/notifications` real com filtros por categoria
  (Manutencao/Multas/Seguros/Estoque), marcar lida/todas; **liga os 4 produtores** F2/F3/F4/F7 via
  `POST /notifications/fleet-alerts/run` (idempotente) + acao "Gerar alertas"; badge do sino = contagem
  real (mata a parte do sino do P-011).
- F11..F12 aplicam a IA de sidebar e a cera.

