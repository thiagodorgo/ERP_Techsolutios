# B-SAN3-23 — diário do DEV

- **Quem:** `dev-san3-23-cl`, Claude **Opus** (subagente da sessão; nível menor, declarado, §C7.6). Identidade nova: não planejei nem critiquei.
- **Por que Claude no papel do dev (exceção declarada):** o Codex 1 está sem cota semanal até 16/11 15:41 SP e o Codex 2 está ocupado. Regra do dono `D-IAS-EXTERNAS-PRIMEIRO` ("se todas ias estao ocupada e falta uma tarefa fazer num bloco, vc faz").
- **Plano:** `plano-B-SAN3-23-v2.md` (Claude Opus 5.5 pela API, topo substituto declarado). **Crítica r2:** `crit-23-r2-plano.json` (Claude Opus 5.5, subagente; APROVADO COM AJUSTES, 8 achados que viram requisito). **Decisão do dono:** `D-PORTAO-5-RECOMENDACOES-1111`, Q1 = A (a F2b entra no bloco).
- **Prevalência:** decisão do dono > ajustes C23R2-01..08 > plano v2.
- **Worktree:** `C:/Users/thiag/w-san323`, ramo `fix/os-cancelada-sem-item-financeiro`, base `origin/main@07898adf` (medida: `git diff --stat d5ec1696 07898adf -- src/modules/work-orders src/modules/work-order-financials` vazio; os 3 arquivos de `tests/helpers` que mudaram não são o `pg-barrier.ts` nem o `auth-identity-fixture.ts`).
- **Banco:** `san323-pg` (postgres:16, `127.0.0.1:55496`), `prisma migrate deploy` limpo. `npm ci` próprio, sem junction.
- **Toda hora vem de `date`** (relógio local SP, Git Bash).

## Como cada ajuste da crítica r2 é atendido (requisito, antes do código)

Os ajustes vieram como requisito do orquestrador. A crítica não propõe conserto (§C7.4-bis), então a forma do conserto é minha e vai declarada aqui, com o motivo. Onde mudar texto de mutação, é **emenda** de uma linha ao §3.3 do plano, registrada aqui (D-EMENDA-ANTES-DO-CODIGO: a decisão nasce da crítica, que já é a revisão do plano).

| Ajuste | O que faço | Mutação que prova |
|---|---|---|
| C23R2-01 (MÉDIA) — CAS do despacho compara com a situação relida sem trava | O `where` do `assignFromDispatch` Prisma leva `status: input.event.fromStatus` (a situação que o serviço validou), não `current.status`. Teste novo **A15b**: o resolvedor de perfil, entre a leitura do serviço e o repositório, roda um `cancel(keep)` real; a OS cancelada não pode ganhar técnico. | **M15b** (nova): trocar `status: input.event.fromStatus, // B-SAN3-23:cas-dispatch` por `status: current.status, // B-SAN3-23:cas-dispatch` (a forma literal do v2) → A15b vermelha |
| C23R2-02 (MÉDIA) — a M5 literal morre de `ReferenceError` e sobrevive à A4 | **Emenda E-M5:** a âncora fica (`new PrismaWorkOrderFinancialItemRepository(tx)`); a troca passa a ser `(await (await import("../work-order-financials/work-order-financial-prisma.repository.js")).createPrismaWorkOrderFinancialItemRepository())`. Mesmo efeito pretendido (zerar numa transação própria, fora da unidade), e compila (`tsc` = 0 erro, medido na F4). | M5 emendada → A4 vermelha pelo estado (`open`, 0 ativos) |
| C23R2-03 (BAIXA) — a M4 apaga a variável que a linha seguinte usa | **Forma do código:** a trava da OS é uma instrução de uma linha só, que não devolve nada usado depois (`SELECT id … FOR UPDATE; // B-SAN3-23:trava-os-cancel`); a situação é lida na instrução seguinte, já sob a trava. A M4 fica literal ("apagar a instrução `$queryRaw` inteira que termina nessa linha") e o código continua válido: a A3 fica vermelha pela falta da trava. | M4 literal → A3 vermelha pelo estado |
| C23R2-04 (BAIXA) — a MB não mata se a A1 não passar `blockedBy`, e a BAR-1 conta um literal que o auxiliar novo podia não escrever | Toda barreira com um vencedor só passa `blockedBy: <pid do vencedor>` (A1, A2, A4-A6, A8-A15); só o 2º passo da A3 conta sem `blockedBy` (o perdedor 2 espera o perdedor 1). A mensagem de timeout do auxiliar novo começa por `timeout esperando`. | MB literal → A1 vira timeout (BAR-1 vermelha) |
| C23R2-05 (BAIXA) — as previsões de hoje da A10 e da A12 estavam erradas | A tabela da F0, abaixo, registra o vermelho **medido** (A10: impasse traduzido em 503 com 0 título; A12: P2028 cru). Os critérios não mudam. | — |
| C23R2-06 (BAIXA) — `expectedStatus` opcional descarta o predicado | `expectedStatus` é **obrigatório** no tipo `ChangeWorkOrderStatusInput`; o `tsc` recusa chamador sem ele. | (a prova é o `npm run check`) |
| C23R2-07 (BAIXA) — 503 de editar/apagar sem teste-dono; relógio da A11/A12 | Testes novos **A11b** (editar) e **A11c** (apagar). O vencedor segura a trava **6,5 s contados depois da barreira** (o perdedor já está na transação: margem garantida de 1,5 s sobre os 5 s do `$transaction`). | M11 → A11, A11b e A11c vermelhas |
| C23R2-08 (BAIXA) — a P-23 dizia mais do que o desenho cobre | Texto da P-23 no comando do bloco e nos comentários: a linha da OS serializa o cancelamento com toda escrita que **cria, altera ou apaga item** da OS e com todo **faturamento** (o único que cria título com `work_order_id`). Baixa, estorno, PATCH/situação/apagar de título e cheques não passam pela trava da OS e ficam fora, declarado. | — |

## Fatias

(preenchido a cada fatia: comando → saída resumida → veredito)

### F0 — vermelho no código de hoje (02:57–03:02 SP)

- **Comando:** `DATABASE_URL=postgresql://postgres:***@127.0.0.1:55496/erp_san323 node --test --test-reporter=tap --import tsx tests/b-san3-23-cancel-race-db.test.ts` sobre `origin/main@07898adf` com só a suíte nova e o auxiliar novo.
- **Saída:** `# tests 19 · # pass 0 · # fail 19 · # skipped 0` (02:59:15–02:59:39). **BAR-1:** `grep -c "timeout esperando" f0-tap.txt` = **0**; `grep -c "^not ok" f0-tap.txt` = **19** (≥ 7). Todo vermelho é da **asserção final**:

| Caso | Barreira (texto só como evidência) | Desfecho de hoje |
|---|---|---|
| A1 lançar | `bloqueado: INSERT INTO work_order_financial_items` (a FK espera a trava do vencedor) | perdedor `fulfilled`; OS `cancelled/keep` com **1 item ativo** |
| A5 faturar | `bloqueado: INSERT INTO financial_titles` | `fulfilled`; OS cancelada com **1 título** e 2 itens faturados |
| A6a editar / A6b apagar | `resolvido` (não espera a OS) | `fulfilled`; quantidade 3 (total 300) / item apagado |
| A8 (papel efêmero) | `bloqueado: INSERT …` | `fulfilled`; 1 item ativo em OS cancelada |
| A2 cancelar(zero) × INSERT cru | `resolvido` (o `UPDATE` da OS não conflita com a `KEY SHARE`) | `cancelled/zero` com **1 item ativo** |
| A3 item travado × zero × lançar | 1ª `bloqueado: SELECT … FOR UPDATE` dos itens; 2ª `resolvido` | lançar `fulfilled`; `cancelled/zero` com 1 ativo |
| A4 evento falha | — | recusa da falha injetada (`SAN323_INJ_EVENTO`), mas a OS ficou **`cancelled/zero` com 0 ativos** |
| A9 zero × faturamento | `bloqueado: SELECT … FOR UPDATE` dos itens | `fulfilled`; **`cancelled/zero` com 1 título e 2 faturados** (I-Z violada) |
| A10 ordem | `bloqueado: INSERT INTO financial_titles` | perdedor `503/invoice_transient_conflict` (o impasse, traduzido), 0 título — **C23R2-05 confirmado** |
| A7 N=20 | — | vermelho já na rodada 0 do par faturar: `cancelled/zero` com 2 faturados e 1 título (I-Z) |
| A11/A11b/A11c | `resolvido` (hoje a escrita não espera a OS) | `fulfilled` (item novo / quantidade 3 / item apagado) |
| A12 cancelar × trava compartilhada | `bloqueado: UPDATE work_orders SET status …` | `P2028` cru, 6602 ms — **C23R2-05 confirmado** (500, não 503) |
| A13 concluir | `bloqueado: UPDATE work_orders …` | `fulfilled`; OS **`completed/zero`** |
| A14 atribuir | `bloqueado: UPDATE work_orders …` | `fulfilled`; OS **`assigned/zero`**, 1 atribuição (hipótese do v2 confirmada) |
| A15 despachar | `bloqueado: UPDATE work_orders …` | `fulfilled`; OS `assigned/zero` com técnico, 1 atribuição (hipótese confirmada) |
| A15b despacho com cancelamento no meio | — (gancho) | cancelamento no meio `fulfilled`, despacho `fulfilled`: OS **`cancelled/keep` com técnico** e 1 atribuição (C23R2-01) |

- **Veredito:** a premissa do §1.2 vale; A1, A2, A3 e A9 vermelhos pela asserção. Sigo (o plano mandaria PARAR se não).

### MB — barreira com filtro de texto, no objeto da F0 (02:59:51–03:02:37 SP)

- **Comando:** `sed -i "s/= ANY(pg_blocking_pids(a.pid))/IS NOT NULL AND a.query ILIKE '%FOR SHARE%'/" tests/helpers/pg-barrier.ts` (âncora: `grep -c` = 1 antes) e a mesma suíte.
- **Saída:** `# fail 19`; `grep -c "timeout esperando" mb-tap.txt` = **10**; a A1 caiu em `timeout esperando bloqueio da própria suíte … lançar atrás do cancelamento (bloqueados vistos: 0 de 1; bloqueador exigido: 132)`.
- **Veredito:** MB **morta** (a BAR-1 fica vermelha). Restaurado.
- **Incidente meu, registrado:** restaurei com `git checkout -- tests/helpers/pg-barrier.ts` antes de commitar o auxiliar novo, e o restauro levou o acréscimo junto. Recoloquei o mesmo texto (`git diff --stat`: 64 inserções, igual a antes; `grep -c "= ANY(pg_blocking_pids(a.pid))"` = 1). Daqui em diante, toda mutação é aplicada **depois** do commit da fatia, e o restauro é sempre contra o commit.
