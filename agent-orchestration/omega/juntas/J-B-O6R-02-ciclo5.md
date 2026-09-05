# J-B-O6R-02-ciclo5 — ata da junta do bloco `B-O6R-02` ciclo 5 (TETO)

> **Quórum: UNANIMIDADE DE 3** (§C7.1-ter(b) — o bloco toca **dinheiro**; EMENDA item 4 do plano).
> **Head julgado:** `2709f4b` · **Ajuste A1 aplicado após os votos:** `7fb5c08` (ver §6).
> **Base do bloco:** `84bb90b` (merge de absorção, dois pais: `12c3825` do ciclo 4 + `f895dd2` = #368).
> **Branch:** `feat/o6r-b02-financial-uow` · **Worktree:** `.claude/worktrees/agent-af6ea607f3ddf8efd`.
> **Terreno:** `LIBERADO COM RESSALVA` na 2ª passada (R1–R5). A 1ª passada **BLOQUEOU**.

---

## §1 · VEREDITO

**APROVADO — 3×0, unânime.**

| Cadeira | Corpo (E1.8) | Voto | Achados |
|---|---|---|---|
| **C1** `jurado-c5-arnes-catalogo-postgres` | `254cc4f` | **APROVADO** | A1 (ajuste, `dentro-do-bloco`) · A2, A3 (nota, `pre-existente`) |
| **C2** `jurado-c5-banco-fk-triggers` | `ab726a8` | **APROVADO** | N1 (nota, `dentro-do-bloco`) |
| **C3** `jurado-c5-validador-diff-plano` | `0a1f64c` | **APROVADO** | 4 notas (1 `pre-existente`) |

**Nenhum achado bloqueia.** O único de gravidade `ajuste` (A1) foi consertado antes do merge — §6.

Votos integrais em `agent-orchestration/omega/juntas/votos/B-O6R-02-ciclo5/`:
`00-inspetor-terreno.md` · `00b-inspetor-terreno-passada2.md` · `01-critico-adversarial.md` ·
`02-C1-arnes-catalogo-postgres.md` · `03-C2-banco-fk-triggers.md` · `04-C3-validador-diff-plano.md`.

---

## §2 · §C7.4-bis — QUEM OCUPOU CADA PAPEL (sem isto, ciclo inválido)

| Papel | Quem | Observação |
|---|---|---|
| **Quem ACHOU** | jurados do ciclo 4 (achados originais) · `critico-c5-adversarial` (5 achados nesta rodada) · `inspetor-de-terreno-da-junta` (R1–R5) · as 3 cadeiras | nenhum deles propôs correção |
| **Quem PLANEJOU** | `planejador-mestre` do ciclo 5 + dev do `SAN2-5` (apensos E1/E3/E4) | ambos inelegíveis para votar aqui |
| **Quem DESENVOLVEU** | **Codex** (S0-zero, terreno §7.2, auditoria S2, até o CP-3) · **Claude Code orquestrador** (F4, F5, F6, bateria e correções pós-crítico) | ver §3 |
| **Quem JULGOU** | C1, C2, C3 — identidades novas, corpos conferidos hash a hash contra a tabela E1.8 | nenhuma escrita ou instruída pelo executor |

### As três perguntas obrigatórias do §C7.4-bis, respondidas por escrito

**(a) A composição cobre a competência que os achados exigem?** Sim, e foi testada: C2 mediu a FK **no
catálogo** (`pg_constraint`: `conkey`/`confkey`/`confdeltype`/`confupdtype`/`convalidated`/`conindid`) e
re-atacou o saldo pelo **endpoint real**; C1 mediu a canônica 3 em N=10 com vaza-metro e o caminho de
falha por **SIGKILL**; C3 conferiu escopo arquivo a arquivo e re-executou as canônicas 1 e 2. Nenhuma
cadeira precisou de competência que não tinha.

**(b) Quem achou é quem consertou?** **Não, em nenhum caso** — e isto foi o que salvou o ciclo. As três
correções desta rodada nasceram de achado de papel independente e foram implementadas pelo executor:
ACHADO-4 (crítico) → correção nas 5 publicações; ACHADO-1 e ACHADO-2 (crítico) → destino escrito e
fechamento; A1 (cadeira C1) → manchete corrigida em `7fb5c08`. **Nenhuma foi encontrada por releitura do
próprio autor.**

**(c) O planejador está usando dado podre?** Não se aplica na forma clássica (não houve replanejamento),
mas há um dado podre **medido e nomeado**: a cópia do plano na **árvore principal** tem 307 linhas contra
847 na linhagem — quem julgasse por ela aplicaria régua sem os apensos E1/E3/E4 (achado da C3, escopo
`pre-existente`). As cadeiras julgaram pela linhagem do bloco.

---

## §3 · A ANOMALIA DESTE CICLO, REGISTRADA SEM MAQUIAGEM

**O executor e o orquestrador foram a mesma instância na segunda metade do bloco.** O Codex, designado
pelo §2 do comando, encerrou no CP-3; **o dono determinou por ordem verbal** (2026-09-02) que o Claude
Code terminasse. Consequências, todas declaradas antes da junta abrir (§0 do briefing) e pesadas pelo
inspetor como **R1**:

- quem executou **não votou, não julgou mérito e não redigiu voto**;
- os corpos das 3 cadeiras **antecedem** as fatias F4–F6 (medido por `git log`: entraram por `e6a6461`/#367);
- a marca de risco que a acumulação produziu **apareceu de fato** — o over-claim do ACHADO-4 — e foi
  apanhada por execução de papel independente, não por releitura do autor.

**Registro da C1 (R1 do voto dela):** a informação de que C2 e C3 já haviam votado chegou **depois** de o
plano de medição dela estar fixado e gravado; nada foi abrandado.

---

## §4 · O TERRENO: O BLOQUEIO QUE VALEU A PENA

A **1ª passada do inspetor BLOQUEOU** a junta, com um único bloqueante: o `critico-c5-adversarial` — que
o §8 do plano põe em **S1, antes do código** — nunca havia atacado o plano, porque a execução partida
entre duas ferramentas pulou essa passada. Fail-closed no teto: ressalvar tornaria consultivo um insumo
mandatório.

O bloqueio **produziu resultado**: o crítico rodou, entregou **PLANO ROBUSTO** e, no caminho, achou por
execução o over-claim que teria ido à `main`. **O gate fail-closed pagou o próprio custo nesta rodada.**

Antes disso, o inspetor mediu e aceitou uma mutação declarada: `.claude/agents/especialistas/` da árvore
principal tinha **15 identidades sepultadas e só 2 das 8 cadeiras do ciclo 5**, com essas 2 na versão
pré-apenso. O orquestrador repôs as 8 verbatim da linhagem; os hashes batem um a um com a tabela **E1.8**.
Sem isso, duas cadeiras votantes não existiriam e o crítico rodaria com corpo velho — **falhando em
silêncio**, o modo que o §4.5(3) nomeia.

**Ressalvas vivas (R1–R5):** acumulação de papéis · mutação declarada na árvore principal (intocada até
esta ata) · espelho Codex de `especialistas/` ausente na `main` publicada (`pre-existente`, exige
pendência com dono) · vizinhança do `B-O6R-07` (atenuada) · duas imprecisões de declaração do orquestrador
(“dois commits” × **um** medido; `Kpis/app.js` fora da tabela literal do §5.1, só a linha `FROZEN`).

---

## §5 · O QUE CADA CADEIRA PROVOU, POR EXECUÇÃO

### C1 — o número sobrevive à forma

Canônica 3 **N=10** em cluster próprio: denominador `261 · 2771 · skip 2` **IDÊNTICO nas dez** — inclusive
na única vermelha. **9/10 verdes**; a r02 (`ec=1`, 6 falhas) foi nomeada *not-ok a not-ok*, com assinatura
única `Redis command timed out` (5 hits; 0 nas demais), **zero erro de catálogo** (`XX000` real 0/10),
janela coincidente com as baterias simultâneas de C2 e C3 na mesma máquina (364 s contra 209–270 s), e
**não reproduz** (trio isolado 3/3 verde; 8/8 sem contenção). Vaza-metro: roles 15→15 nas dez, grants 2459
constante, **+5/+5 por rodada** — reproduz o publicado. **Caminho de falha por SIGKILL real** aos ~64%:
deixa 1 role órfã (`pre-existente`, dono no #359/SAN2-4b), e **a rodada limpa seguinte devolve
2771/2769/0/2 — o número sobrevive ao aborto**. D29 na lista-6 **nomeada** (seis nomes conferidos na fonte
antes do par): **13/13**, `(6, 37)` idêntico, 0 `XX000`. Os 2 skips lidos do TAP: os `RBAC_DB_PARITY`
declarados.

### C2 — o banco, e o único vetor novo de fabricar dinheiro

FK provada **no catálogo, não no texto**. Sondas **(v)** e **(vii)** recusadas com `23503` nomeando a
constraint, e **ACEITAS no down** (vermelho-controle próprio: `SALDO +100` fabricado, 2 referências
penduradas). O **par cross-tenant que só a FK COMPOSTA recusa**, isolado com os triggers desabilitados.
**D35** `5→4→5`; no re-up **com órfão semeado a migration ABORTA** (`ec=3`) nomeando
`P-O6R-B02-ORFAOS-LEGADOS`, publicando só a contagem, **zero mutação de dado** — o censo fail-closed
provado por execução. **D34**: com os triggers no down, o caso `[RLS]` fica **vermelho na asserção certa**;
re-up 9/9. E o re-ataque ao saldo: **97 operações adversariais em 11 caminhos**, incluindo a corrida
delete×reverse pelo **endpoint real** nas 2 ordens × 20 — **0 fabricado** em todo vetor guardado,
`maxAbs=0`, 0 `40P01`. Os dois limites que o contrato **nomeia** foram reproduzidos exatamente como
declarados. **O B-1 não foi herdado: foi re-atacado neste head.**

### C3 — o diff cabe no plano

Escopo **13/13** na §5 emendada; **PROIBIDO 8/8 vazio**; `src/**` vazio contra `84bb90b` (e a contraprova
do critério re-baseado: contra `12c3825` sairia exatamente 1 arquivo, vindo da `main`); `ci.yml`
**vazio pós-merge**, com o ato do CP-1 medido em `f895dd2..2709f4b` (1 hunk, 7 suítes existentes no head e
ausentes na main, 1 skip-marker cada — **o fundamento anti-verde-cego é verdadeiro**). Pisos **6 → 9 casos
por execução**. Canônicas 1 e 2 **re-executadas** e batendo o publicado (225 constante; fail 1 = só o
ambiental declarado). **D36 pelo `git log`**: o contrato só existe em `bcf6460`, posterior às fatias.
§12 apensada sem nada apagado; KPI com N e forma, `mvp_*` idênticos por parse, backfill do #368 com
`approved_head` = **head julgado da ata**, não o headRefOid.

---

## §6 · O AJUSTE A1 — CONSERTADO ANTES DO MERGE

A C1 achou, **no voto que aprovou**, que a correção do ACHADO-4 (`2709f4b`) trocou a **afirmação
operativa** nas cinco publicações mas deixou de pé a **manchete** *"O QUE NAO FECHOU — e o produtor
NOMEADO POR EXECUCAO"* em `release.summary` (sem nota no próprio texto), no `FROZEN` do `app.js` que o
espelha, na `description` do history e no heading do `history.md`. Manchete e nota do mesmo artefato se
contradiziam.

**Causa, nomeada pelo executor:** o `grep` de verificação buscou caixa mista e a manchete está em caixa
alta; e o `release.summary` fora copiado da `description` **antes** de ela ser corrigida.

**Conserto (`7fb5c08`):** manchete reescrita para *"o que a execucao NOMEIA e o que ela NAO nomeia"*;
`release.summary` **re-sincronizado a partir da description já corrigida**; heading do `history.md`
reescrito; `FROZEN` reinjetado pelo gerador. `grep -c` da manchete = **0** nos quatro artefatos; guards
**22/22 ec=0**.

**Propriedade adotada (C1):** *toda instância da afirmação num artefato publicado diz exatamente o que a
execução exercitou — manchete e corpo não podem se contradizer dentro do mesmo artefato.*

---

## §7 · A LIÇÃO DESTA RODADA, MEDIDA

A classe *"a frase afirma mais do que a execução exercitou"* — a mesma que **reprovou o ciclo 4** —
materializou-se **três vezes neste ciclo**, e **nenhuma foi encontrada por releitura do autor**:

1. **over-claim do produtor** (quatro nomes vindos de `grep`) → achado pelo **crítico**, executando os
   quatro isolados: 0/0 nos quatro, e o vazador real (`core-saas-role-authority-db`, +1/+1) fora da lista;
2. **"dois commits" × um medido** → achado pelo **inspetor**, no `git log`;
3. **manchete residual** contradizendo a própria nota → achado pela **cadeira C1**, no artefato publicado.

É a evidência mais forte a favor do desenho do `D-JUNTA-SEPARACAO-DE-PAPEIS`: releitura não pega; execução
por quem não escreveu, pega. E do `D-INSPETOR-TERRENO-JUNTA`: o bloqueio fail-closed da 1ª passada foi o
que trouxe o crítico — e portanto o achado nº 1 — para dentro da rodada.

**Resiliência (`D-JUNTA-RESILIENTE`, P1):** as três cadeiras caíram por limite de sessão **antes de medir**
e foram retomadas sem perda; a C1 caiu **uma segunda vez no meio da bateria** e retomou de r06 com r01–r05
já gravadas. **Nenhuma medição foi refeita por perda, e nenhum suplente precisou ser acionado.**

---

## §8 · PENDÊNCIAS E O QUE SEGUE ABERTO

**Fechadas por este PR:** `P-O6R-B02-OVERCLAIM-ORFA-SQL-CRU` · `P-O6R-B02-TESTE-RLS-SUPERUSER` ·
`P-O6R-B02-CENSO-CASO-PERMANENTE` · `P-O6R-B02-REGISTRO-STATUS-LOG` · `P-O6R-B02-BATERIA-CANONICAS-1-2` ·
`P-O6R-B02-RUNNER-SUMICO-SEM-SKIP` (ato de registro citando o #359) ·
`P-ARNES-DIVERGENCIA-RUNNER-SUMICO-NAO-EXISTE-NA-MAIN`. `P-O6R-B02-SUITES-LIST-CI` fecha **condicionada ao
job `backend-postgres` verde no CI do PR**.

**Nascem:** `P-O6R-B02-CRASH-NO-LOAD-SEM-SKIP` · `P-O6R-B02-RULINGS-SEM-DESTINO` · emenda de precisão em
`P-O6R-ARNES-ISOLAMENTO`.

**Não abriu:** `P-O6R-B02-ORFAOS-LEGADOS` — o censo não acusou em nenhum cluster (0 penduradas).

**Seguem abertas, com dono fora deste bloco:** os **+4/+4 do vazamento sem produtor nomeado** ·
`P-ARNES-RLS-TEST-FORA-DO-SWEEP` · `P-SYNC-AGENTS-NAO-RECURSIVO` · a sensibilidade a timeout de Redis sob
contenção (A2 da C1) · a órfã na janela <60 min do varredor (A3 da C1) · a nota do contrato sobre a
variante soft-delete da contrapartida (N1 da C2) · o plano defasado na árvore principal (C3) · e os
**ACHADO-3 e ACHADO-5 do crítico** (defeitos do plano: a EMENDA nunca desceu aos §§ vinculantes; a
sucessão do planejador não é nomeada) — matéria de planos futuros, não corrigível por PR de execução.

---

## §9 · CONSEQUÊNCIA

Verde da junta = **merge autorizado** (§C7.1). Após o merge: `porteiro-pos-merge` (§C2.8), backfill de
`pr`/`merge_commit`/`approved_head`, `blocks_completed` 157 → 158, limpeza pós-merge (§C5) e destino das
ressalvas R2 (mutação declarada na árvore principal) e R3 (espelho Codex).

**O `B-O6R-02` sai do teto aprovado, na última tentativa que tinha.**
