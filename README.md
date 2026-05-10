# ERP Techsolutions

ERP Techsolutions e um SaaS ERP operacional de campo, multi-tenant e orientado por modulos para empresas que executam servicos externos, controlam equipes, viaturas, estoque, financeiro operacional e indicadores em tempo real.

## Estado atual do repositorio

- Base documental oficial v1 incorporada em `docs/`
- Estrutura operacional do agente incorporada em `agent-orchestration/`
- Arquivos-base de governanca adicionados na raiz
- Fundacao tecnica minima do backend organizada em Node.js + TypeScript

## Nota importante de alinhamento

Ha um conflito arquitetural entre fontes:

- a base persistente do agente ainda registra backend em C
- o repositorio oficial no GitHub e a documentacao enviada nesta entrega usam Node.js + TypeScript como backend atual

Neste repositorio, a organizacao foi feita respeitando o estado atual do GitHub e dos documentos enviados. A validacao final dessa decisao de stack continua pendente.

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

