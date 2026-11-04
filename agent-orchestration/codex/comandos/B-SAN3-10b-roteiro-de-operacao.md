# B-SAN3-10b — Roteiro técnico de operação

- **Tipo:** documentação operacional
- **Fase:** Execution / Validation / Persistence
- **Trilha:** documentação e operação
- **Data:** 2026-11-04
- **Branch:** `docs/b-san3-10b-roteiro-operacao`
- **Executor:** `dev-44-sol`, Codex GPT-5.6 Sol, nível menor declarado
- **Verificador:** Claude independente, revisão reforçada

## Objetivo

Entregar e ensaiar um roteiro técnico de operação para imagem de produção, censo pré-deploy, rollback,
backup, restore, bootstrap, RBAC, rotação de segredos e drenagem da fila do app de campo. O conteúdo privado
da demonstração e toda credencial permanecem fora do repositório público.

## Fontes de verdade

- `CLAUDE.md`, `PROJECT_MEMORY.md` e `docs/revisoes/SAN3/PLANO_SAN3.md`.
- `docs/deployment.md`, `docs/go-live-readiness.md` e `docs/limpeza-de-disco.md`.
- Plano externo B-SAN3-10b, com precedência: Emenda 1 > seção D > seção C > texto original.
- Decisões e pendências em `agent-orchestration/controle/`.

## Escopo PERMITIDO

- `docs/ROTEIRO-DEMO-E-OPERACAO.md`.
- `docs/deployment.md`, somente acréscimos nos dois pontos definidos pelo plano.
- `agent-orchestration/controle/pendencias.md`, somente acréscimos.
- `agent-orchestration/controle/pendencias-indice.md`, somente pelo gerador.
- `agent-orchestration/controle/decisoes.md`, somente acréscimo do registro de desmembramento.
- `agent-orchestration/codex/comandos/B-SAN3-10b-roteiro-de-operacao.md`.
- `agent-orchestration/codex/log-execucao.md`, somente acréscimo.

## Escopo PROIBIDO

- Todo código, teste, migração, workflow, script, lockfile, `.env`, `mobile/**`, `src/**`, `prisma/**`,
  `.github/**`, `tests/**`, `scripts/**`, `Kpis/**`, `CLAUDE.md`, `AGENTS.md`, `.agents/**` e `.claude/**`.
- Credencial, senha, token, valor de segredo, dado comercial, dado pessoal ou caminho da máquina.
- A pilha ativa, portas 3000 e 5173, os contêineres ativos, o AVD ativo e o worktree ativo da apresentação.
- `docker system prune`, `docker builder prune`, `push --force`, `reset --hard`, `stash`, `rebase` e `git add -A`.
- Comando contra provedor ou ambiente real.

## Fatias

1. F0 — registrar o desmembramento, pendências, comando e índice.
2. F1 — redigir o roteiro e acrescentar os avisos em `docs/deployment.md`.
3. F2 — ensaiar Op-1, Op-1a e Op-3 a Op-8 em pilha Docker isolada.
4. F3 — ensaiar Op-10 em AVD exclusivo; se root, firewall, sonda ou gate não morderem, adiar.
5. F4 — executar o roteiro privado em pilha isolada e publicar apenas hashes e resultados neutros.
6. F5 — emendar por escrito e repetir somente passo cujo ensaio refutar o texto.
7. F6 — executar a bateria literal extraída do plano e abrir o PR.
8. F7 — revisão reforçada por Claude independente, sem merge.

Antes de F2, F3 e F4, executar o pré-voo literal. Cada fatia grava comando, saída resumida e veredito no
relatório externo incremental. Premissa falsa adia a fatia; não autoriza aceite substituto.

## Bateria de validação

```bash
bash bateria-10b.sh docs/b-san3-10b-roteiro-operacao
```

O script é extraído literalmente do plano e deve terminar em `BATERIA: 0 falha(s)`. A revisão reforçada
repete a bateria e os ensaios manuais B15 previstos no plano. Todo pipe usa `set -o pipefail`.

## Definition of Done

- [ ] Seis procedimentos obrigatórios registrados como `passou` por execução real.
- [ ] Registro neutro da execução privada com dois SHA-256, sem conteúdo privado no repositório.
- [ ] Bateria literal com zero falhas.
- [ ] CI do head concluída e verde, com logs lidos.
- [ ] Inventário final de alvos temporários vazio e alvos ativos preservados.
- [ ] PR aberto com aviso de revisão reforçada e sem merge.
- [ ] `Kpis/**` intocado: KPI congelado (§C7 item 8(5)).

## Rastreabilidade

- **ID:** B-SAN3-10b
- **PR:** a preencher após abertura
- **Merge commit:** não aplicável nesta entrega; merge proibido ao DEV
- **Approved head:** a preencher pela revisão
- **Nível:** revisão reforçada
- **Status:** em execução
