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
```

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

Depois de configurar `.env`, gere o Prisma Client:

```bash
npm run db:generate
```

### Infraestrutura local

Para desenvolvimento local, PostgreSQL 16 e Redis 7 podem ser iniciados com Docker Compose:

```bash
docker compose up -d
```

Para parar os containers mantendo os dados locais:

```bash
docker compose down
```

Para resetar os volumes locais:

```bash
docker compose down -v
```

Use `docker compose down -v` com cuidado, pois o comando apaga os dados locais do PostgreSQL e Redis.

### Desenvolvimento

```bash
npm run dev
```

### Frontend React

O repositório possui a pasta `frontend/`. Quando precisar executar o frontend web existente:

```bash
npm --prefix frontend install
npm run web:dev
npm run web:build
```

### Acesso de demonstração (mock)

O portal web sobe em **modo de demonstração** (`VITE_USE_MOCKS=true`) com dados fictícios. O
**perfil é resolvido pelo e-mail** informado no login e a **senha pode ser qualquer** valor
(ex.: `demo123`). Cada perfil abre uma navegação diferente.

| Perfil | E-mail | Onde entra |
|---|---|---|
| Admin da Plataforma | `platform@demo.com` | Console da Plataforma (`/platform`) |
| Gestor / Operação | `gestor@demo.com` | Seleção de organização → Operação |
| Despacho | `despacho@demo.com` | Operação de Campo (Console Dispatcher) |
| Financeiro | `financeiro@demo.com` | Financeiro (cobranças, faturas, pagamentos) |
| Administração | `admin@demo.com` | Administração da organização (usuários, auditoria) |
| Auditoria | `auditor@demo.com` | Operação (somente leitura) |

Regra do mock: qualquer e-mail contendo `platform` / `plataforma` / `super` cai na Plataforma;
os demais perfis operacionais escolhem a organização e entram no console correspondente. A senha
não é validada em modo de demonstração.

### Acesso de demonstração (modo REAL — backend + banco)

Para ver as telas **com dados reais** (login validado, RBAC do backend, Mapa Operacional com pins,
Frota/Estoque/Remunerações populados), rode o backend em modo `prisma` e semeie o banco.

**1. Backend em modo real** — em `.env` (raiz):

```
CORE_SAAS_PERSISTENCE="prisma"
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/erp_techsolutions?schema=public"
```

**2. Frontend em modo real** — em `frontend/.env`:

```
VITE_USE_MOCKS=false
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

**3. Banco + seed de demonstração** (Postgres via Docker já ativo):

```bash
docker compose up -d
npm run db:generate && npm run db:migrate
npm run db:seed:demo     # base (papéis) + usuários por papel + dados de frota
```

`db:seed:demo` = `db:seed` (tenant/papéis/admin) + `db:seed:users` (um usuário por papel) +
`db:seed:fleet` (viaturas, abastecimentos, manutenção, multa, seguro, OS + despacho, localizações
de campo = os pins do mapa, e itens de estoque). Todos os scripts são idempotentes.

**4. Subir e logar** — dois terminais:

```bash
npm run dev        # backend :3000 (prisma)
npm run web:dev    # frontend :5173
```

Abra o frontend, faça login e navegue. **A visão muda conforme a permissão do papel** (a mesma
matriz de `docs/navigation-matrix.md`). Senha de todos: **`ChangeMe123!`** (configurável via
`DEMO_ADMIN_PASSWORD`).

| Papel (RBAC) | E-mail | Senha | O que enxerga |
|---|---|---|---|
| Admin da Plataforma (`super_admin`) | `plataforma.demo@example.com` | `ChangeMe123!` | Tudo (todas as permissões) |
| Administrador (`tenant_admin`) | `admin.demo@example.com` | `ChangeMe123!` | Toda a organização: Operação, **Frota**, Gestão, Administração |
| Gestor Operacional (`manager`) | `gestor.demo@example.com` | `ChangeMe123!` | Operação + **Frota** + Gestão + Mapa + Aprovações (sem admin) |
| Operador (`operator`) | `operador.demo@example.com` | `ChangeMe123!` | OS, Frota (lança), Cadastros (leitura), só o **próprio** extrato de comissão |
| Financeiro (`finance`) | `financeiro.demo@example.com` | `ChangeMe123!` | Multas, Seguros, **Remunerações**, Financeiro, Relatórios (Frota leitura) |
| Estoque (`inventory`) | `estoque.demo@example.com` | `ChangeMe123!` | **Estoque** (dono: itens, movimentações, contagem) + leitura operacional |
| Técnico de Campo (`field_technician`) | `tecnico.demo@example.com` | `ChangeMe123!` | Fluxo de campo (OS, checklists — mobile-first) |
| Auditor (`auditor`) | `auditor.demo@example.com` | `ChangeMe123!` | Leitura forte em tudo + **Auditoria** (não executa) |
| Suporte (`support`) | `suporte.demo@example.com` | `ChangeMe123!` | Acesso limitado (Notificações/Auditoria) |

> Onde ver a Rodada F: **OPERAÇÃO → Mapa Operacional** (2 pins com OS ativa + badges "Em manutenção"/
> "Sem seguro"); grupo **FROTA** (Abastecimento, Manutenção, Multas, Seguros, Danos); **GESTÃO →
> Estoque / Remunerações**. Atalho: **Ctrl+K** abre a paleta de comandos filtrada pelo papel.
>
> As senhas acima são **apenas para desenvolvimento local**. Nunca use estes valores fora do seu ambiente.

### Build

```bash
npm run build
npm start
```

### Verificação TypeScript

```bash
npm run check
```

### Testes

```bash
npm test
```

### Banco local

Com o PostgreSQL local ativo e `.env` configurado:

```bash
npm run db:migrate
npm run db:seed
```

As credenciais em `.env.example` sao apenas exemplos locais. Nunca versione `.env` real, senhas, tokens ou secrets de producao.

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

## Documentação de Assets

A documentação dos assets de imagens do app Flutter está em `docs/assets-images.md`.

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
npm run db:generate
npm run dev
npm run check
npm test
npm run build
npm run db:migrate
npm run db:seed
```

## Proximo marco recomendado

Implementar o core SaaS multi-tenant do MVP competitivo, iniciando por tenant, filial, usuarios, RBAC, auditoria e ordem de servico.
