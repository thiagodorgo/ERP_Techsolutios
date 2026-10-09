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

### C3.1 — vermelhos-controle A2/A3 — CONCLUÍDO

- **Comando:** aplicação separada, em cópia do contêiner, das cinco mutações na trava e das cinco mutações equivalentes nas duas cópias do script; execução do arquivo de guarda após cada mutação; restauração por MD5.
- **Saída resumida:** as cinco mutações da trava derrubaram T8e pelos casos S/B/S/K/I; as cinco do script derrubaram T14d pelos casos S/B/S/K/I. Em particular, M-D2c no script voltou a deixar a cadeia pré-criada passar (`status !== 3`), reproduzindo o A3 sem depender de privilégio direto no nó interno.
- **Resultado:** vermelhos-controle comportamentais confirmados; A2 e A3 têm prova não vazia.

### C3.2 — propriedade fail-closed ampliada — CONCLUÍDO

- **Comando:** inspeção do diff; extração EOL-neutra por regex dos blocos `WITH RECURSIVE view_walk … view_escape` em `RUNTIME_ROLE_GUARD_SQL` e `scripts/db-runtime-role.sh`; comparação após `replace(/\s+/g, "")`; `git diff --check`.
- **Saída resumida:** trava = 1 bloco; script = 2 blocos; `equal_do=True`; `equal_final=True`; diff-check ec=0. A propriedade agora considera `SELECT,INSERT,UPDATE,DELETE`, dono `rolsuper`/`rolbypassrls` em qualquer nó e toda matview como escape.
- **Resultado:** implementação estática e comportamental concluída; D3 e D5 verdes.

### C3.2 — T8e/T8f/T14d — VERDE

- **Comando:** medição lexical do `FROZEN_ALLOWLIST` com as seis regexes do ratchet; inspeção do diff; `git diff --check`.
- **Saída resumida:** contagem do arquivo de guarda = 82 (antes 64); somente a entrada `san3-05-runtime-role-guard-db.test.ts` foi atualizada. T8e monta S/B/K/I/C, prova efeito entre organizações e postura; T8f compara 1+2 CTEs; T14d cria a cadeia antes do script e ancora ausência de `SELECT` interno.
- **Resultado:** testes escritos e executados no PostgreSQL 16; verde em N=3 rodadas idênticas (ver D3).

### C3.2 — mutações M-D2a…e × trava/script — CONCLUÍDO

- **Comando:** para cada mutação, substituição por âncora exata com cardinalidade conferida; `(t)` executou `npm run check` + arquivo de guarda; `(s)` executou `bash -n` + arquivo de guarda; restauro e comparação de MD5 antes da próxima.
- **Saída resumida:**

| mutação | trava `(t)` | script `(s)` |
|---|---|---|
| M-D2a | T8e vermelho · S · `escape view/postgres não encontrado` | T14d vermelho · S · `status deveria ser 3` |
| M-D2b | T8e vermelho · B · dono `s305_a2_bypass…` não encontrado | T14d vermelho · B · `status deveria ser 3` |
| M-D2c | T8e vermelho · S · `escape view/postgres não encontrado` | T14d vermelho · S · `status deveria ser 3` |
| M-D2d | T8e vermelho · K · dono `s305_a2_common…` não encontrado | T14d vermelho · K · `status deveria ser 3` |
| M-D2e | T8e vermelho · I · `escape view/postgres não encontrado` | T14d vermelho · I · `status deveria ser 3` |

- **Resultado:** 10/10 mutações vermelhas pelo comportamento exigido, não apenas por T8f. MD5 final da trava = original `692d953d26aafa8d40d6902fca2bccfc`; MD5 final do script = original `911fddc132af8fa3c3d7fc976b7b6efe`.

### C3.6 — pendências e índice — CONCLUÍDO

- **Comando:** registro nominal das pendências de C3.6 em `pendencias.md`; inclusão dos sub-itens nas duas pendências existentes; `python agent-orchestration/controle/gerar-indice-pendencias.py`; `git diff --check`.
- **Saída resumida:** 9 pendências novas (`RATCHET-INST-SOME`, `IGUALDADE-CATALOGO-L0-SEM-TESTE`, `GUARDA-FILHOS-LISTA-FECHADA`, `CENARIO-JOB-CLOUD-CHARGES`, `TIMEOUT-MATA-SO-O-BASH`, `LIMPEZA-SEM-FINALLY-MIGRATOR`, `GUARDA-LOG-FORMA-TEXTUAL`, `T15-FALSO-VERMELHO-PORTA`, `REGRA-EM-TABELA`) e 2 sub-itens (`LOG-DO-SERVIDOR-FORA-DA-CI`, `SECURITY-DEFINER-INVENTARIO`). Índice gerado: 458 cabeçalhos / 447 IDs; ABERTA 338, FECHADA 117, SEM-STATUS 3.
- **Resultado:** concluído. `P-SAN3-05-REGRA-EM-TABELA` está registrada como ALTA, dona `B-SAN3-10`, e explicitamente fora da implementação do ciclo 3.

### C3.3 — escopo permitido/proibido — CONCLUÍDO

- **Comando:** `git diff --name-only 91d794956309f6e63511bdfd76cbfddd8bf45c40..HEAD`; `git diff --quiet 91d79495 HEAD -- Kpis/`; inspeção nominal do staging antes de cada commit.
- **Saída resumida:** somente `src/database/runtime-role.ts`, `scripts/db-runtime-role.sh`, `tests/san3-05-runtime-role-guard-db.test.ts`, a entrada autorizada de `tests/db-catalog-write-guard.test.ts`, os dois trechos de `docs/deployment.md`, pendências/índice e o relatório pedido pelo dono. `Kpis/`, `prisma/`, `.github/`, demais `src/scripts/tests`, espelhos de agentes e `scratchpad/` ficaram fora.
- **Resultado:** escopo respeitado. As 33 marcações EOL-fantasma de `.agents/agents/*.md` e `scratchpad/` não foram staged nem alteradas.

### D1 — check — VERDE

- **Comando:** `docker exec -w /work dev05c3-node bash -c 'timeout 600 npm run check'`.
- **Saída resumida:** TypeScript `tsc -p tsconfig.json --noEmit`, ec=0, sem diagnóstico.
- **Resultado:** verde.

### D2 — lint — VERDE

- **Comando:** `docker exec -w /work dev05c3-node bash -c 'timeout 600 npm run lint'`; `bash -n scripts/db-runtime-role.sh`.
- **Saída resumida:** `npm run lint` delegou a `npm run check`, ec=0; sintaxe do script ec=0.
- **Resultado:** verde.

### D3 — guarda DB N=3 + controle sem psql — VERDE

- **Comando:** no `dev05c3-node`, `timeout 900 node --test --import tsx tests/san3-05-runtime-role-guard-db.test.ts`, três vezes; entre rodadas, consultas de resíduos `s305%`; quarta execução com `PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`.
- **Saída resumida:** 3 × `# tests 12 # pass 12 # fail 0 # skipped 0`, denominador idêntico; resíduos após cada rodada: `roles=0`, `relations=0`. Controle sem psql: ec=1, `# tests 12 # pass 8 # fail 4 # skipped 0`; T14a/b nomeou `psql: ausente`, T14d ficou vermelho e T14c também ficou vermelho por depender do mesmo script; resíduo 0.
- **Resultado:** verde; prova não vazia e fail-closed sem psql.

### D4 — regressões dirigidas — VERDE

- **Comando:** quatro execuções separadas de `node --test --import tsx`: `san3-05-runtime-role-bootstrap.test.ts`, `san3-05-acessos-de-plataforma-guard.test.ts`, `san3-05-leituras-de-plataforma-db.test.ts`, `db-catalog-write-guard.test.ts`.
- **Saída resumida:** respectivamente 12/12, 35/35, 13/13 e 5/5; fail 0, skipped 0; resíduos finais `roles=0`, `relations=0`.
- **Resultado:** verde.

### D5 — dez mutações — VERDE

- **Comando:** matriz descrita na seção “C3.2 — mutações” acima, em cópias do contêiner `dev05c3-node`.
- **Saída resumida:** 5/5 mutações `(t)` deixaram T8e vermelho com `tsc` ec=0; 5/5 mutações `(s)` deixaram T14d vermelho com `bash -n` ec=0; caso e mensagem publicados na tabela.
- **Resultado:** verde, 10/10 vermelhas e restauração por hash confirmada.

### D6 — B7 mínima — VERDE

- **Comando:** no cluster `dev05c3-*`, `ALTER SYSTEM SET log_statement='all'`; script do head com senha-sentinela só por ambiente para papel novo; fixture S pré-criada seguida do script; leitor `SELECT 'dev05c3-b7-control'`; busca da sentinela nos logs/terminal; limpeza e `ALTER SYSTEM RESET log_statement`.
- **Saída resumida:** sucesso ec=0; `rolpassword LIKE 'SCRAM-SHA-256$%' = t`; caso S ec=3 e uma ocorrência de `MODO 6`; sentinela no log do servidor = 0, no stdout/stderr = 0; controle no log = 1; resíduos de papéis/relações = 0.
- **Resultado:** verde.

### D7 — suíte integral e build — VERDE COM TERRENO CORRIGIDO

- **Comando:** tentativa 1: `DATABASE_URL=<dev05c3-pg> npm test`; correção de terreno: Redis descartável `dev05c3-redis` na rede própria, sem porta publicada; tentativa 2: `REDIS_URL=redis://dev05c3-redis:6379 DATABASE_URL=<dev05c3-pg> npm test`; depois `npm run build`.
- **Saída resumida:** tentativa 1 executou 3135 testes, 3127 passes, 6 falhas e 2 skips — todas as seis falhas foram `ECONNREFUSED 127.0.0.1:6379`, por Redis ausente. Tentativa válida: `# tests 3135 # pass 3133 # fail 0 # skipped 2`; build `tsc -p tsconfig.json` ec=0; resíduos `s305%` = 0. Redis próprio publicou `{"6379/tcp":null}`; `erp-redis` nunca foi alvo.
- **Resultado:** verde na forma válida; N executado = 3135, com 2 skips dentro do teto.

### D8 — modo e EOL do script — VERDE

- **Comando:** `git ls-files -s scripts/db-runtime-role.sh`; `git ls-files --eol scripts/db-runtime-role.sh`.
- **Saída resumida:** modo `100755`; `i/lf w/lf attr/text eol=lf`.
- **Resultado:** verde.

### D9 — diff e allowlist — VERDE

- **Comando:** `git diff --check 91d79495..HEAD`; `git diff --quiet 91d79495 HEAD -- Kpis/`; `git diff 91d79495..HEAD -- tests/db-catalog-write-guard.test.ts`; lista nominal de caminhos do diff.
- **Saída resumida:** diff-check ec=0; `Kpis/` ec=0; o ratchet mudou somente na entrada `san3-05-runtime-role-guard-db.test.ts` (64→82 + motivo). Caminhos alterados estão todos no permitido pelo plano ou no relatório explicitamente solicitado pelo dono.
- **Resultado:** verde.

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
