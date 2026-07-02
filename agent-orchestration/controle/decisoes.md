# Decisoes

## D-001 - Estrutura documental v1 incorporada

- status: aplicada
- origem: documentacao enviada pelo usuario em 2026-05-07
- impacto: produto, requisitos, backlog e organizacao do repositorio

## D-002 - Repositorio organizado pelo estado real do GitHub

- status: aplicada
- origem: leitura do README e do `package.json` do repositorio oficial
- impacto: documentacao, esqueleto tecnico e organizacao local
- observacao: conflito historico (backend em C) foi preservado em registro, mas baseline vigente foi consolidada como Node.js + TypeScript

## D-003 - Baseline oficial de backend consolidada no repositorio

- status: aplicada
- origem: alinhamento documental e operacional desta execucao
- impacto: README, PRODUCT_CONTEXT, docs de frontend e trilha operacional
- observacao: C permanece apenas como historico, sem efeito na stack atual


## D-004 - Rodada Fase 2 com auto-merge e merge unico (2026-07-02) [Claude Code]

- status: aplicada nesta rodada
- origem: instrucao do usuario
- impacto: nesta rodada o Claude Code executa o ciclo ate o merge (gate = testes verdes),
  com merge UNICO ao final do B-120 e KPIs publicados no mesmo PR. Fora desta rodada,
  vale o gate humano padrao do contrato de blocos.
