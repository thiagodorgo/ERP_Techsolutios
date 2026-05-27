# ERP Techsolutions

ERP Techsolutions e um SaaS ERP operacional de campo, multi-tenant e orientado por modulos para empresas que executam servicos externos, controlam equipes, viaturas, estoque, financeiro operacional e indicadores em tempo real.

## Estado atual do repositorio

- Base documental oficial v1 incorporada em `docs/`
- Estrutura operacional do agente incorporada em `agent-orchestration/`
- Arquivos-base de governanca adicionados na raiz
- Fundacao tecnica minima do backend organizada em Node.js + TypeScript

## Nota importante de alinhamento

Historico registrado:

- a base persistente do agente registrava backend em C
- o repositorio oficial e a documentacao desta fase registram backend em Node.js + TypeScript

Leitura vigente deste repositorio:

- para execucao tecnica e documental, a baseline oficial passa a ser **Node.js + TypeScript** no backend
- o contexto historico em C permanece apenas como registro de origem de divergencia, sem efeito na baseline operacional atual

## Estrutura principal

```text
.
├── PRODUCT_CONTEXT.md
├── RBAC_MATRIX.md
├── APPROVAL_LIMITS.md
├── DESIGN_SYSTEM.md
├── COMPONENT_LIBRARY.md
├── AGENTS.md
├── docs/
│   ├── 00-visao-executiva.md
│   ├── 00-analise-comparativa-benchmark.md
│   ├── 01-visao-produto.md
│   ├── 02-mapa-modulos.md
│   ├── 03-atores-papeis.md
│   ├── 04-regras-negocio.md
│   ├── 05-requisitos-funcionais.md
│   ├── 06-requisitos-nao-funcionais.md
│   ├── 07-backlog-priorizado.md
│   └── 08-estrutura-repositorio.md
├── agent-orchestration/
│   ├── docs/
│   ├── codex/
│   └── controle/
├── assets/
│   └── prints-benchmark/
ERP Techsolutions é uma plataforma SaaS ERP operacional de campo, multi-tenant, orientada a operação externa, ordens de serviço, estoque, financeiro operacional, logística, mobile, analytics, IA e ESG.

Este repositório nasce com **Node.js + TypeScript** como backend principal, mantendo arquitetura modular e mensageria assíncrona como fundação arquitetural planejada desde o início.

## Decisão técnica principal

| Camada | Decisão |
|---|---|
| Portal web | React |
| Aplicativo de campo | Flutter |
| Backend | Node.js + TypeScript |
| API | REST versionada inicialmente em `/api/v1` |
| Banco transacional | PostgreSQL |
| Cache/coordenação | Redis |
| Mensageria inicial | Outbox Pattern + workers Node.js |
| Broker recomendado para escala | RabbitMQ ou NATS |
| Observabilidade | logs estruturados, métricas e tracing |
| Arquitetura inicial | monólito modular multi-tenant |

## Por que Node.js no backend

Node.js foi escolhido para o backend principal porque o ERP Techsolutions precisa evoluir rápido, com forte integração web/mobile, regras de negócio mutáveis, APIs, workers, filas, integrações externas e boa produtividade para uma equipe enxuta.

A decisão não elimina componentes especializados em Go, Rust ou C no futuro. C deve ser reservado para agentes locais, integração com hardware, bibliotecas nativas ou telemetria de baixo nível, não para o core SaaS inicial.

## Como rodar localmente

### Pré-requisitos

- Node.js 20+
- npm 10+
- PostgreSQL 16+ quando o caminho transacional real for usado
- Redis 7+ quando filas leves/cache forem usados
- RabbitMQ ou NATS apenas quando a fase de broker dedicado iniciar

### Instalação

```bash
npm install
```

### Configuração

```bash
cp .env.example .env
```

Ajuste as variáveis conforme o ambiente.

### Desenvolvimento

```bash
npm run dev
```

### Frontend React

```bash
npm --prefix frontend install
npm run web:dev
npm run web:build
```

### Build

```bash
npm run build
npm start
```

### Verificação TypeScript

```bash
npm run check
```

## Estrutura inicial

```text
.
├── README.md
├── AGENTS.md
├── package.json
├── tsconfig.json
├── .env.example
├── docs/
│   ├── 00-visao-executiva.md
│   ├── 01-arquitetura-nodejs.md
│   ├── 02-mensageria-assincrona.md
│   └── 03-roadmap.md
└── src/
    ├── app.ts
    ├── server.ts
    ├── config/
    └── routes/
```

## Ordem de leitura recomendada

1. `docs/00-visao-executiva.md`
2. `docs/01-visao-produto.md`
3. `docs/02-mapa-modulos.md`
4. `docs/04-regras-negocio.md`
5. `docs/05-requisitos-funcionais.md`
6. `docs/06-requisitos-nao-funcionais.md`
7. `docs/07-backlog-priorizado.md`
8. `PRODUCT_CONTEXT.md`
9. `agent-orchestration/docs/status-geral.md`

## Fundacao tecnica atual

| Camada | Estado atual |
|---|---|
| Frontend web | React |
| Mobile | Flutter |
| Backend atual do repositorio | Node.js + TypeScript |
| Banco transacional planejado | PostgreSQL |
| Cache/coordenacao planejada | Redis |
| Integracao entre modulos | Assincrona por padrao |

## Comandos previstos

```bash
npm install
npm run dev
npm run build
npm run check
```

## Proximo marco recomendado

Implementar o core SaaS multi-tenant do MVP competitivo, iniciando por tenant, filial, usuarios, RBAC, auditoria e ordem de servico.
