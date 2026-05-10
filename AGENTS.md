# ERP Techsolutions - Repo Guide

## Objetivo deste repositorio

Concentrar a base tecnica e documental do ERP Techsolutions com rastreabilidade entre estrategia, requisitos, arquitetura, execucao e validacao.

## Fontes de verdade neste repositorio

1. decisoes aprovadas explicitamente pelo usuario
2. arquivos-base na raiz
3. documentacao em `docs/`
4. estrutura operacional em `agent-orchestration/`
5. implementacao em `src/`

## Regra de conflito

Se houver conflito entre a base historica do agente e o repositorio atual, o conflito deve ser registrado explicitamente antes de qualquer consolidacao silenciosa.

## Stack atual do repositorio

- frontend web: React
- mobile: Flutter
- backend atual: Node.js + TypeScript
- banco planejado: PostgreSQL
- cache/coordenacao planejada: Redis
- integracao entre modulos: assincrona por padrao

## Nota de divergencia aberta

A memoria operacional anterior registra backend em C como baseline. O repositorio oficial e a documentacao entregue nesta fase apontam Node.js + TypeScript como backend atual. Ate validacao final, trate isso como decisao arquitetural em aberto, mas use o estado real do repositorio como referencia tecnica de execucao.

## Estruturas obrigatorias

- `PRODUCT_CONTEXT.md`
- `RBAC_MATRIX.md`
- `APPROVAL_LIMITS.md`
- `DESIGN_SYSTEM.md`
- `COMPONENT_LIBRARY.md`
- `docs/`
- `agent-orchestration/`

## Regra de trabalho

- manter rastreabilidade
- preservar organizacao por modulos e dominios
- registrar pendencias e decisoes
- nao esconder conflitos de stack, dominio ou arquitetura

