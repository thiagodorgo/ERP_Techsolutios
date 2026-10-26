# R-B-SAN3-12a-ciclo1 — reprovação do ciclo 1 da junta de DINHEIRO do B-SAN3-12a (PR #459)

- **Objeto:** `04b8a667780930050c8af2c77c323b81fe8794bb`. Ciclo 1. Unanimidade das 4 cadeiras, com veto.
- **Votos:** C2 REPROVADO · C4 REPROVADO · C1 e C3 não votaram. O orquestrador as segurou: o conserto toca o escopo da C1, e a C3 mede `**`. Votar agora seria refeito.
- **C2 `jurado-san312a-c2-opus`:**
  - **C2-01** (bloqueia, dentro, não grave): justificativa com NUL (`\u0000`) passa no 10–500. O desvínculo grava 200 e `title_id=null`, e a auditoria `cheque.title_unlinked` não é gravada, porque o jsonb recusa NUL e `recordRequestAuditBestEffort` engole o erro.
  - Notas: C2-02 e C2-03 (pré-existente).
- **C4 `jurado-san312a-c4-opus`:**
  - **C4-03** (bloqueia, dentro, **GRAVE: dinheiro**): PATCH do valor do título × vínculo de cheque em corrida. Os dois passam, e o título fica com valor 150 e cheque pendente de 100 vinculado (36/37 rodadas, nos dois papéis). Causa provável: a guarda lê os cheques fora da transação que grava.
  - **C4-02** (bloqueia, dentro, não grave): tirar `reconciled` do WHERE do CAS da conciliação (M13a) não deixa nenhum teste do bloco vermelho; o comportamento muda.
  - **C4-04** (ajuste, pré-existente): DELETE do título × vínculo deixa título apagado com cheque pendente (100/100). `P-SAN3-20-DELETE-TITULO-COM-CHEQUE` NÃO fecha no merge.
  - **C4-01** (ajuste): o teste R-res-5 não fica vermelho sem `withTenantRls` como superusuário, o papel da CI.
  - **C4-05** (nota, pré-existente).
  - Isolamento do agregado: OK, 52/52 nos dois papéis.
- **Papéis do ciclo 2:**
  - achadores: as identidades C2 e C4 acima;
  - auditoria e plano: o topo (`planejador-mestre` Fable, identidade nova);
  - dev: identidade nova, ≠ `dev-san312a-opus`.
- **Auditoria e plano do topo (2026-10-26, ~00:20 BRT):** `planejador-san312a-c2-fable` · `planejador-mestre` · **Fable 5.1 (`claude-fable-5-1`), sem fallback** · identidade nova (≠ planejador da E1/E1-bis, ≠ C2/C4, ≠ dev). Re-executou com terreno próprio descartável (worktree `w-j12a-plan` + Postgres `j12a-plan-pg`, removidos; base viva intocada): C4-03 e C4-04 reproduzidos **com barreira de lock** (3/3 PATCH → 150 com cheque pendente; 3/3 DELETE apagado com pendente; causa: `assertNoPendingCheque` fora da transação, escrita standalone sem re-check sob o lock; lado do vínculo já certo 2/2) — **mesma causa, um conserto**; C2-01 confirmado e **ampliado** (o jsonb recusa U+0000 **e** surrogates isolados, que o validador aceita); C4-02 e C4-01 confirmados como buracos de teste (M13a: 3/3 + 11/11 verdes; M5a sob superusuário: 3/3 verdes). **Veredito: defeitos reais (3) + buracos de teste (2); nenhum artefato de processo.** Plano: `docs/revisoes/SAN3/B-SAN3-12-plano.md` → "## Ciclo 2 (12a) — plano de resolução" (A29 a–h, A30 a–c, A13-bis, R-res-5-bis; 4 pendências novas; 0 perguntas ao dono). Cadeiras do ciclo 2: C2 e C4 refeitas (identidade nova); C1 e C3 votam pela 1ª vez.
