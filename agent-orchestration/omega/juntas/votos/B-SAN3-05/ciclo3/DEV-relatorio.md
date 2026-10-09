# DEV — B-SAN3-05 · ciclo 3

- **Identidade:** `dev-ciclo3-b-san3-05` (não achou, não planejou, não votou).
- **Modelo:** Codex GPT-5.6 Sol — substituição declarada (§C7.6-bis); o bloco não toca dinheiro.
- **Worktree exclusivo:** `C:/Users/AMP/w-o05`.
- **Ramo:** `fix/runtime-role-sem-bypass`.
- **Objeto inicial:** `91d794956309f6e63511bdfd76cbfddd8bf45c40`.
- **Escopo:** somente A2 e A3 da seção “Ciclo 3 — planejador-ciclo3-b-san3-05”.
- **Fora deste ciclo:** C2-A1, C3-c2-05, C3-c2-01 e a correção de regra `INSTEAD`/`ALSO` em tabela.

## P1 — evidência incremental

### Pré-voo e D0 — PARCIAL

- **Comando:** `git -C C:/Users/AMP/w-o05 rev-parse HEAD`; `git -C C:/Users/AMP/w-o05 ls-remote origin fix/runtime-role-sem-bypass`; `git diff --ignore-cr-at-eol --stat`; `git diff --ignore-cr-at-eol --name-only`.
- **Saída resumida:** HEAD local e remoto = `91d794956309f6e63511bdfd76cbfddd8bf45c40`; diff EOL-neutro vazio. O `git status` mostra 33 marcações `M` fantasmas em `.agents/agents/*.md` e `scratchpad/` não rastreado, já previstos no plano; nenhum tem diff de conteúdo e nenhum será staged.
- **Resultado:** pré-voo liberado. D0 permanece parcial até o diff final contra o objeto inicial e a confirmação remota de cada commit.

### C3.1 — vermelhos-controle A2/A3 — EM APURAÇÃO

- **Comando:** EM APURAÇÃO.
- **Saída resumida:** EM APURAÇÃO.
- **Resultado:** EM APURAÇÃO.

### C3.2 — propriedade fail-closed ampliada — PARCIAL

- **Comando:** inspeção do diff; extração EOL-neutra por regex dos blocos `WITH RECURSIVE view_walk … view_escape` em `RUNTIME_ROLE_GUARD_SQL` e `scripts/db-runtime-role.sh`; comparação após `replace(/\s+/g, "")`; `git diff --check`.
- **Saída resumida:** trava = 1 bloco; script = 2 blocos; `equal_do=True`; `equal_final=True`; diff-check ec=0. A propriedade agora considera `SELECT,INSERT,UPDATE,DELETE`, dono `rolsuper`/`rolbypassrls` em qualquer nó e toda matview como escape.
- **Resultado:** implementação estática concluída; falta prova comportamental em PostgreSQL 16 (D3/D5).

### C3.2 — T8e/T8f/T14d — PARCIAL

- **Comando:** medição lexical do `FROZEN_ALLOWLIST` com as seis regexes do ratchet; inspeção do diff; `git diff --check`.
- **Saída resumida:** contagem do arquivo de guarda = 82 (antes 64); somente a entrada `san3-05-runtime-role-guard-db.test.ts` foi atualizada. T8e monta S/B/K/I/C, prova efeito entre organizações e postura; T8f compara 1+2 CTEs; T14d cria a cadeia antes do script e ancora ausência de `SELECT` interno.
- **Resultado:** testes escritos; execução comportamental pendente no contêiner Linux próprio.

### C3.2 — mutações M-D2a…e × trava/script — EM APURAÇÃO

- **Comando:** EM APURAÇÃO.
- **Saída resumida:** EM APURAÇÃO.
- **Resultado:** EM APURAÇÃO.

### C3.6 — pendências e índice — EM APURAÇÃO

- **Comando:** EM APURAÇÃO.
- **Saída resumida:** EM APURAÇÃO.
- **Resultado:** EM APURAÇÃO.

### D1 — check — EM APURAÇÃO

- **Comando:** EM APURAÇÃO.
- **Saída resumida:** EM APURAÇÃO.
- **Resultado:** EM APURAÇÃO.

### D2 — lint — EM APURAÇÃO

- **Comando:** EM APURAÇÃO.
- **Saída resumida:** EM APURAÇÃO.
- **Resultado:** EM APURAÇÃO.

### D3 — guarda DB N=3 + controle sem psql — EM APURAÇÃO

- **Comando:** EM APURAÇÃO.
- **Saída resumida:** EM APURAÇÃO.
- **Resultado:** EM APURAÇÃO.

### D4 — regressões dirigidas — EM APURAÇÃO

- **Comando:** EM APURAÇÃO.
- **Saída resumida:** EM APURAÇÃO.
- **Resultado:** EM APURAÇÃO.

### D5 — dez mutações — EM APURAÇÃO

- **Comando:** EM APURAÇÃO.
- **Saída resumida:** EM APURAÇÃO.
- **Resultado:** EM APURAÇÃO.

### D6 — B7 mínima — EM APURAÇÃO

- **Comando:** EM APURAÇÃO.
- **Saída resumida:** EM APURAÇÃO.
- **Resultado:** EM APURAÇÃO.

### D7 — suíte integral e build — EM APURAÇÃO

- **Comando:** EM APURAÇÃO.
- **Saída resumida:** EM APURAÇÃO.
- **Resultado:** EM APURAÇÃO.

### D8 — modo e EOL do script — EM APURAÇÃO

- **Comando:** EM APURAÇÃO.
- **Saída resumida:** EM APURAÇÃO.
- **Resultado:** EM APURAÇÃO.

### D9 — diff e allowlist — EM APURAÇÃO

- **Comando:** EM APURAÇÃO.
- **Saída resumida:** EM APURAÇÃO.
- **Resultado:** EM APURAÇÃO.

### D10 — push e check-runs — EM APURAÇÃO

- **Comando:** EM APURAÇÃO.
- **Saída resumida:** EM APURAÇÃO.
- **Resultado:** EM APURAÇÃO.

## Checklist — B-SAN3-05 · ciclo 3 · desenvolvimento

### Solicitado

- [ ] C3.1 — registrar os vermelhos-controle de A2/A3.
- [ ] C3.2 — ampliar a propriedade fail-closed nas três ocorrências do CTE.
- [ ] C3.2 — adicionar T8e, T8f e T14d.
- [ ] C3.2 — provar M-D2a…e separadamente na trava e no script (10 mutações vermelhas).
- [ ] C3.3 — respeitar integralmente o escopo permitido/proibido.
- [ ] C3.4 — executar D0–D10 com N publicado.
- [ ] C3.6 — registrar pendências com dono; manter `P-SAN3-05-REGRA-EM-TABELA` fora do ciclo 3.

### Feito

- [ ] EM APURAÇÃO.

### Não feito / divergências

- EM APURAÇÃO.

### Validação

- D0–D10: EM APURAÇÃO.

### Head empurrado

- EM APURAÇÃO.

### Próximos passos

- EM APURAÇÃO.
