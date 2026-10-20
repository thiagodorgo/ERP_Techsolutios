# J-B-SAN3-02 — junta de DINHEIRO do ciclo 2 (2026-10-20) · PR #448, faturamento atômico e título complementar

- **Objeto:** `09b380dab54946e16303c8bae0e95bbaa0d667a5` (CI 14/14 concluída e verde).
- **Régua:** bloco de DINHEIRO, unanimidade de 3 com veto. No ciclo 2, achado não grave dentro do bloco ainda reprova (§C7 item 8(2)).
- **Primeira junta pela regra `D-JUNTA-SO-CADEIRA-VERMELHA`** (§C7 item 9, PR #451): a C1 do ciclo 1 foi **revalidada**; a C2 e a C3 foram **refeitas**.
- **Plano do ciclo 2:** `agent-orchestration/omega/reprovacoes/R-B-SAN3-02-1.md`, de `planejador-san302-ciclo2-fable` (Fable).
- **Dev do ciclo 2:** `dev-san302-ciclo2-opus` (Claude Opus), commit `dbbd6464`.
  - **Conserto:** `BEGIN;`/`COMMIT;` na migração e drill T-D(f).
  - **Mutações:** 33/33 vermelhas.
- **Mandatos:** forma A, pré-voo OK nos 4, escritos por `redator-san302c2-opus`.
- **Inspetor de terreno:** `inspetor-san302c2-opus` — **LIBERADO COM RESSALVA** (R-A…R-E).

## VEREDITO: APROVADO (3 × 0, unanimidade)

| cadeira | identidade | modo (item 9) | executor e modelo | voto | achados |
|---|---|---|---|---|---|
| C1 atomicidade e corrida | `jurado-san302c2-c1r-opus` | **revalidada** (regra 2) | Claude Code, Claude Opus | **APROVADO** | 0 |
| C2 complementar e índice | `jurado-san302c2-c2-opus` | **refeita** (regra 3) | Claude Code, Claude Opus | **APROVADO** | 0 (3 notas) |
| C3 regressão e contrato | `jurado-san302c2-c3-opus` | **refeita** (regra 3; no ciclo 1 não votou) | Claude Code, Claude Opus | **APROVADO** | 0 (notas N1–N4, PE1) |

**Como a C1 foi revalidada.**
- O voto do ciclo 1 não declarava `arquivos_medidos` e mediu suítes inteiras. Pela regra (0), o escopo é total e não carrega por interseção.
- **Item 1:** revalidado pelo mesmo comando, com saída igual (35/35, 17/17, 17/17; os 12 arquivos de `src/` idênticos entre os objetos).
- **Itens 2 e 3:** as sondas do ciclo 1 sumiram com o worktree (ressalva R-A). Foram reconstruídas pelo caso registrado e contaram como **voto novo**, com a régua do ciclo 2. Desfechos, frequências e vermelhos batem com o ciclo 1.
- O orquestrador ratifica essa leitura da regra (2): re-execução impossível vira voto novo.

**C2-01 fechado.** A C2′ fechou por execução própria: a migração é atômica no `prisma migrate deploy` 7.8, falha injetada depois de cada sentença k = 1..6 não deixa resíduo, e o redeploy converge.

**C3′ — regressão e contrato:**
- `npm test` no contêiner: 3751/3762. As 9 falhas são de `traccar-dev-topology`, porque o contêiner da ferramenta não tem o binário `docker` (pré-existente, do B-TRC-01). Elas passam na CI.
- `backend-postgres` 414/414, sem skip.
- Escopo dentro do PERMITIDO; o PROIBIDO ficou vazio.
- Contrato: só a mudança da Q1, de 409 para 201 complementar. A precedência fica idêntica.

**Monocultura declarada (R-C).** As 3 cadeiras, o inspetor e o dev rodaram em Claude Opus. Os outros executores estavam indisponíveis:
- o Codex está fora até 24/10, 20:38;
- o Antigravity e a API do Gemini estão sem crédito.

**Notas e ressalvas que não reprovam (viram registro):**
- N1: o renome do teste contador do harness (30/3 → 40/4) não tem o par antigo → novo no relatório do dev.
- N2 / R-B: não há `# ANEXO D` no plano. O conteúdo está em `R-B-SAN3-02-1.md`.
- N3 / R-B: não houve revisor independente no ciclo 2. A junta re-mediu o que era dele.
- N4: o registro tem três contagens de mutações diferentes (30, "24→27" e 33). A contagem medida é 33.
- PE1: as 9 falhas de `traccar-dev-topology` são do ambiente da ferramenta de teste.
- Lição para o item 9: o jurado guarda sondas e scripts FORA do worktree descartável. Neste ciclo, os três guardaram em `erp-pausa-2026-10-03/jsan302c2-*`.

## Separação de papéis (§C7.4-bis)
- **Achou no ciclo 1:** `jurado-san302-c2-opus`.
- **Planejou o ciclo 2:** `planejador-san302-ciclo2-fable`.
- **Desenvolveu:** `dev-san302-ciclo2-opus`.

Nenhum deles votou no ciclo 2.

**Fecha (a confirmar pela medição do portão):** os itens #20 (`P-Ω4-3-INVOICE-ATOMIC` + `P-Ω4-3-INVOICE-TOCTOU-DELETE`) e #21 (`P-Ω4-3-REFATURAR-DELTA`) do portão da versão vendável.

**Próximo:** merge com CI verde, porteiro pós-merge e limpeza.
