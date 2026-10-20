# J-B-SAN3-02 — junta de DINHEIRO do ciclo 1 (2026-10-20) · PR #448, faturamento atômico e título complementar

- **Objeto:** `8e6a6c29b8a0aced5bf3968383aa9ef247019f46` (CI 14/14 concluída e verde).
- **Régua:** bloco de DINHEIRO, unanimidade de 3 com veto. Ciclo 1: todo `bloqueia` dentro do bloco reprova.
- **Plano:** `docs/revisoes/SAN3/B-SAN3-02-plano.md`, que reúne a v2 e os Anexos A, B e C (emendas v2.1, v2.2 e respostas do dono).
- **Parecer do DBA:** `dba-san302-opus` (Claude Opus) — **FAVORÁVEL COM RESSALVA** (`votos/B-SAN3-02/dba-parecer.md`).
- **Mandatos:** forma A, pré-voo OK nos 4. Redator: `redator-san302-opus` (Claude Opus).
- **Inspetor de terreno:** `inspetor-san302-opus` (Claude Opus) — **LIBERADO COM RESSALVA** (R1–R6; `votos/B-SAN3-02/insp-san302-parecer.md`).

## VEREDITO: REPROVADO (1 × 1; a C3 não votou)

| cadeira | identidade | executor e modelo | voto | bloqueia |
|---|---|---|---|---|
| C1 atomicidade e corrida | `jurado-san302-c1-opus` | Claude Code, Claude Opus | **APROVADO** | — |
| C2 complementar e índice | `jurado-san302-c2-opus` | Claude Code, Claude Opus | **REPROVADO** | 1 |
| C3 regressão e contrato | `jurado-san302-c3-argon` | Gemini 4 Argon via API | **não votou** | — |

A C3 não votou porque a API do Gemini atingiu o **teto mensal de gasto** do projeto (429, às 02:39Z). A C2 já tinha reprovado, então a unanimidade estava impossível (P6, `votos/B-SAN3-02/00-quedas.md`).

**O bloqueio:**
- **C2-01:** o `prisma migrate deploy` 7.8.0 não aplica a `20260878000000_invoice_complementary_title` numa transação única.
  - **Falha:** uma falha injetada depois da sentença k deixa as sentenças 1..k gravadas, com P3018.
  - **Recuperação:** o redeploy dá P3009, e `resolve --rolled-back` seguido de deploy quebra com 42701.
  - **Premissa refutada:** a H10 do plano e o comentário da migração diziam o contrário, e a medição desmentiu.
  - **Gravidade:** não perde dado nem erra dinheiro, porque sempre sobra pelo menos um índice de backstop.
  - **Escopo:** dentro do bloco.

**O que as cadeiras confirmaram por execução:**
- **C1:**
  - atomicidade do faturamento;
  - corrida e zero sob barreira;
  - T-Z3 independente do planner.
- **C2:**
  - migração aditiva e legado preservado;
  - catálogo conforme a Q4;
  - drift de 1 sentença;
  - drill 5/5;
  - rollback nas pontas A e B;
  - faturamento 17/17;
  - corridas 10/10;
  - FK e CHECK recusando pais inválidos, como dono e como papel de runtime;
  - isolamento entre organizações.
- **Divergência registrada (§A2):** o DBA mediu o lock com `BEGIN`/`ROLLBACK` próprio, não com o deploy do Prisma. É por isso que o C2-01 não apareceu no parecer dele.

## Separação de papéis (§C7.4-bis) e as três perguntas da reprovação
- **Papéis:**
  - **achou:** `jurado-san302-c2-opus`;
  - **auditou e planejou o ciclo 2:** `planejador-san302-ciclo2-fable` (Fable), em `agent-orchestration/omega/reprovacoes/R-B-SAN3-02-1.md`;
  - **desenvolveu o ciclo 2:** `dev-san302-ciclo2-opus` (Claude Opus).
- **(a) Defeito real ou de processo?** Defeito real, não grave. Foi reproduzido em k=3 e k=4.
- **(b) Quem achou conserta?** Não.
- **(c) Houve dado podre?** Sim. A H10 foi herdada da v1, sem comando que a derrubasse.

**Próximo (`D-JUNTA-SO-CADEIRA-VERMELHA`, §C7 item 9):**
- O conserto só toca a migração e o drill.
- A C1 declarou suítes inteiras, então o escopo dela é total (regra (0)). Por isso ela **revalida**: uma identidade nova re-executa os comandos registrados dela sobre o objeto novo.
- A C2 é **refeita**.
- A C3 é **refeita**, porque não votou.
