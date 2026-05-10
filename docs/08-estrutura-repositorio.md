# 08 - Estrutura do Repositorio

## Objetivo

Padronizar a organizacao do repositorio para que estrategia, documentacao, execucao e codigo evoluam sem perder rastreabilidade.

## Estrutura adotada

```text
.
├── assets/
│   └── prints-benchmark/
├── docs/
├── agent-orchestration/
│   ├── docs/
│   ├── codex/
│   │   ├── comandos/
│   │   ├── retornos/
│   │   └── log-execucao.md
│   └── controle/
├── src/
│   ├── config/
│   └── routes/
├── PRODUCT_CONTEXT.md
├── RBAC_MATRIX.md
├── APPROVAL_LIMITS.md
├── DESIGN_SYSTEM.md
├── COMPONENT_LIBRARY.md
├── AGENTS.md
├── README.md
├── package.json
└── tsconfig.json
```

## Regras

- `docs/` guarda a documentacao funcional e arquitetural do produto
- `agent-orchestration/` guarda rastreabilidade operacional
- `src/` guarda a implementacao tecnica
- arquivos-base na raiz concentram governanca e referencia rapida

## Proximos passos recomendados

- adicionar `09-modelo-dominio.md`
- adicionar `10-arquitetura-produto.md`
- iniciar implementacao dos modulos de core SaaS e ordem de servico

