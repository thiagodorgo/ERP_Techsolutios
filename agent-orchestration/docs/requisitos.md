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
- RF-FROTA-004..008 (F4..F8) — Seguros, Danos, Estoque, Remuneracoes (ver plano-mestre);
  F9..F12 enriquecem Usuarios/Notificacoes/Sidebar e aplicam cera.

