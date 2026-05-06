# ERP Techsolutions

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
    │   └── env.ts
    └── routes/
        └── health.routes.ts
```

## Módulos oficiais do ERP Techsolutions

1. Core SaaS: tenants, usuários, RBAC, planos, auditoria e configurações.
2. CRM operacional: clientes, contatos, locais, contratos e ativos.
3. Operação de campo: ordens de serviço, agenda, despacho, execução, SLA e status.
4. Mobile técnico: tarefas, check-in/check-out, checklist, fotos, assinatura e offline-first.
5. Estoque: produtos, depósitos, estoque em veículo, movimentações, consumo por OS e reposição.
6. Logística: rotas, rastreamento, ETA, mapa, otimização e eventos de deslocamento.
7. Financeiro operacional: orçamento, faturamento, contas a receber, despesas, comissões e margem.
8. Documentos e evidências: anexos, fotos, comprovantes, PDFs, OCR e assinatura.
9. Analytics: KPIs operacionais, financeiros, produtividade, retrabalho, SLA e capacidade.
10. IA e automação: recomendações, alertas, previsão, resumo, classificação e suporte.
11. ESG/carbono: km evitado, CO2 estimado, eficiência de rota e impacto ambiental.

## Fluxo operacional central

```text
Cliente
→ Local de atendimento
→ Ordem de serviço
→ Despacho
→ Técnico/equipe
→ Rota
→ Execução mobile
→ Checklist/evidências
→ Consumo de estoque
→ Assinatura
→ Conclusão
→ Custo/margem/faturamento
→ Analytics/IA/ESG
```

A entidade central do produto é a **ordem de serviço**. Todos os módulos devem reforçar esse ciclo operacional.

## Documentação canônica

Leia nesta ordem:

1. `README.md`
2. `AGENTS.md`
3. `docs/00-visao-executiva.md`
4. `docs/01-arquitetura-nodejs.md`
5. `docs/02-mensageria-assincrona.md`
6. `docs/03-roadmap.md`

## Status atual

Fundação documental e técnica inicial criada para rodar em Node.js + TypeScript. A próxima etapa é implementar o core SaaS multi-tenant e o primeiro ciclo operacional de ordem de serviço.
