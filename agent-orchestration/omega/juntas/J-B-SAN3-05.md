# J-B-SAN3-05 — junta do B-SAN3-05 (PR #405), o papel de runtime não contorna o RLS

## Ciclo 1 — junta 1 (2026-10-04)

- **Objeto julgado:** o head do PR 405 resolvido por cada cadeira (`5ab037a3` no fim; o delta desde `6f53d11b` é só registro);
  7/7 check-runs verdes, inclusive `docker`.
- **Inspetor:** primeiro **BLOQUEADO** (B1: sem `psql` 16 no PATH dos jurados; T14a/b falhavam com "psql: ausente"); o
  orquestrador proveu o terreno (imagem local `erp-junta-node20-pg16:local` com o `psql` 16.14 real e a receita
  `receita-pg16.sh`, em `C:/Users/AMP/erp-terreno/`, provada 19/19 com controle 17/19 sem `psql`); na reavaliação,
  **LIBERADO COM RESSALVA** (R1–R8; R7: o teste da trava intermitente, 2/6). Parecer: `votos/B-SAN3-05/00-inspetor-terreno.md`.
- **Quórum:** unanimidade de 3 com veto (segurança e permissão); §C7 item 8 (`D-GOV-PROPORCIONAL`): teto de 2 ciclos; KPI
  congelado e não cobrado.

## VEREDITO: REPROVADO (3 × 0)

| cadeira | identidade | modelo | voto | bloqueia | ajustes |
|---|---|---|---|---|---|
| C1 | `agente-dba-guardiao` | Opus 5.5 | **REPROVADO** | **A2** — o teste T14 dá vermelho em 2 de 9 rodadas porque o script grava no catálogo fora do `withRoleCatalogLock` (mecanismo reproduzido em 14/30 contra 0/30 sem escritor concorrente); **A4** — o MODO 0 não cobre `log_transaction_sample_rate` nem `log_min_duration_sample`, e a senha nova vai para o `server.log` | A1 (a troca do T8d por `pg_create_physical_replication_slot`), A3 (view aninhada) |
| C2 | `agente-secops` | Opus 5.5 | **REPROVADO** | **F-C2-01** — a mesma falha do MODO 0, medida 3 vezes: com amostragem de log ligada, a senha nova vai em claro ao log do servidor | F-C2-02 a F-C2-04 (T15 sem o caso de produção sem a variável; T15 sem `exitCode` e com `kill` fora de `finally`; guarda de host literal no T9) |
| C3 | `guardiao-fail-closed` | Opus 5.5 | **REPROVADO** | **C3-F1, C3-F1b, C3-F2** — o ratchet do gerador novo trata o acesso que não reconhece como ausente (inclusive relação aninhada, que o plano não declara residual) — pela regra F2 do plano, defeito do gerador; **C3-F3** — a superfície T11 do bloco | — (o 3º item da linha C3 aprovado) |

Evidências e votos em `votos/B-SAN3-05/C{1,2,3}-evidencia.md` e `C{1,2,3}-voto.json`. Cadeiras uma por vez no Claude em Opus.

**Defeito de segurança real, achado por duas cadeiras independentes:** a senha do papel de runtime pode ir em claro para o log do
servidor quando a amostragem de log está ligada (A4 = F-C2-01).

## Ciclo 2 — junta 2 (2026-10-09)

- **Objeto julgado:** inspetor em `0925482b`; cadeiras em `d00ca8ee` (C1), `a158f4af` (C2) e `9add8f3b` (C3) — entre eles só
  entrou registro (parecer, mandatos, evidências e votos). CI 7/7 verde em cada objeto. A integração da `main` fica para depois
  (ressalva R4 do inspetor).
- **Inspetor:** **LIBERADO COM RESSALVA** (R1–R7) — `votos/B-SAN3-05/ciclo2/00-inspetor-terreno.md`.
- **Quórum:** unanimidade de 3 com veto (segurança e permissão); ciclo 2, o último em que achado não grave bloqueia
  (`D-GOV-PROPORCIONAL`, CLAUDE.md §C7 item 8).
- **Modelo:** todas as identidades em Claude Opus 5.5, substituição declarada (`D-FABLE-ASTRA-SO-DINHEIRO`). Dev do ciclo 2 no
  Codex `gpt-5.6-sol` (identidade `dev-ciclo2-b-san3-05`); um sucessor nos "créditos de API" (`dev-ciclo2-b-san3-05-api`) caiu por
  limite sem gravar nada (rodou, na verdade, no plano Max — a chave de API foi ignorada pelo login).

## VEREDITO: REPROVADO (3 × 0)

| cadeira | identidade | voto | bloqueia | grave? | ajustes e notas |
|---|---|---|---|---|---|
| C1 | `jurado-san305-c2-credencial-e-papel` | **REPROVADO** | **A2** — cadeia de views com donos mistos: o papel limpo leu linhas de outra organização e a trava e o MODO 6 deram 0 escape (conferem o dono da view do topo, não o da que lê a tabela); hoje não há view no esquema. **A3** — quebrar a transitividade do MODO 6 deixa o arquivo de teste 9/9 | **A2: sim** (vaza dado entre organizações) · A3: não | A1 (guarda do T14 reconhece grafia), A4 (guarda de log aceita `session_user=<papel>` em outro campo), A5 (T15 falso vermelho com "5432" no pid/hora) |
| C2 | `jurado-san305-c2-arnes-e-escopo` | **REPROVADO** | **C2-A1** — a guarda de processos filhos conta 5 grafias em vez da lista fechada do aceite (b); `execFileSync` e `runPsqlReadOnly` passam | não | C2-A2 (timeout mata só o bash; filho >30 s escreve sem trava), C2-A3 (falha depois do CREATE ROLE deixa papel com LOGIN/CREATEROLE) |
| C3 | `jurado-san305-c2-ratchet-e-superficie` | **REPROVADO** | **C3-c2-01** — um uso reconhecido libera todos (`inst.some`): construção por fábrica genérica/`Reflect.construct` sem contexto fica fora (0 chaves). **C3-c2-05** — o cenário do job `cloud-charges.calculate` mede o efeito da rota, não do job | não | C3-c2-02 (igualdade banco↔gerador não é teste), C3-c2-03/04 (notas) |

Produto confirmado pelas cadeiras: a senha nunca chega em claro ao servidor em 66 situações de log (B1 fechado); a porta de
replicação é provada e recusada; o boot de produção recusa o papel que escapa; estabilidade do lote `-db` 10/10 + 3/3; escopo do
ciclo 2 dentro do C2.3; suíte 3130/3132 (0 falha).

## §C7.4-bis — papéis do ciclo 2 e as perguntas da reprovação

| papel | quem |
|---|---|
| planejador | `planejador-ciclo2-b-san3-05` (Codex, caiu por limite) e `planejador-ciclo2-b-san3-05-sucessor` (Claude Opus) |
| dev | `dev-ciclo2-b-san3-05` (Codex `gpt-5.6-sol`); `dev-ciclo2-b-san3-05-api` (caiu sem gravar) |
| fábrica | `agente-fabrica` (Claude Opus) |
| inspetor | instância nova de `inspetor-de-terreno-da-junta` (Claude Opus) |
| achadores / votantes | C1, C2, C3 acima — identidades novas |
| orquestrador | erratas 1 ao D4 e decisão na PARADA-RC3; mandatos; registro; **não escreveu código do bloco** |

(a) A composição cobriu as competências: os bloqueantes caem exatamente nas três cadeiras desenhadas no C2.5. (b) Quem achou no
ciclo 1 não consertou nem votou no ciclo 2. (c) O planejador usou dado medido; o A2 nasce de uma divergência que a fábrica já
tinha anotado (dono da view do topo) — sinal de que o plano não fechou o critério da D2 para cadeias de donos mistos.

**Ciclo 3 (D-GOV-PROPORCIONAL regra 2):** só defeito de produto grave bloqueia. O **A2** é grave (vazamento entre organizações) e
tem de ser fechado; os demais bloqueantes (A3, C2-A1, C3-c2-01, C3-c2-05) e os ajustes viram pendência com dono se não forem
consertados no ciclo 3. Decisão do dono pendente: abrir o ciclo 3 agora.

## Ciclo 3 — junta 3 (2026-10-09)

- **Objeto:** inspetor em `7c134e2c` (LIBERADO COM RESSALVA, R1–R11 — `votos/B-SAN3-05/ciclo3/00-inspetor-terreno.md`); C1 em
  `f7fabd4a` (só registro desde o objeto do inspetor). CI 7/7 verde. Leitura R3/R4 registrada em `controle/decisoes.md`
  antes do voto (só defeito GRAVE de produto reprova no ciclo 3).
- **Dev do ciclo 3:** `dev-ciclo3-b-san3-05` (Codex `gpt-5.6-sol`), head `9a66b4e4`; planejador `planejador-ciclo3-b-san3-05`
  (Claude Opus); fábrica `agente-fabrica` (Claude Opus).

## VEREDITO: REPROVADO (pela C1; C2 e C3 não votaram por decisão do dono)

| cadeira | identidade | voto | bloqueia | grave? |
|---|---|---|---|---|
| C1 | `jurado-san305-c3-trava-de-views` | **REPROVADO** | **C1-c3-01** — `GRANT SELECT (colunas)` numa view cuja cadeia tem dono que escapa: o papel lê linhas da organização B sob o contexto A; trava 0 escape, boot aceita, MODO 6 ec=0. **C1-c3-02** — `UPDATE`/`INSERT` de coluna sobrescreve/grava linhas de B, sem a trava acusar | **sim** (vazamento e perda de dado entre organizações) |
| C2 | `jurado-san305-c3-regressao-e-escopo` | não votou | — | — |
| C3 | `jurado-san305-c3-superficie-e-suite` | não votou | — | — |

Notas da C1: C1-c3-03 (pertença sem herança — exige SET ROLE) e C1-c3-04 (T8f não cobre a expressão de privilégio). A
C1 confirmou que as formas S/B/K/I e as próprias (3 níveis, matview, escrita em 2 níveis) eram recusadas; as 10 mutações
do ciclo 3 ficaram vermelhas. **Não-convergência:** terceira forma da via `view`. O plano do dia mandava levar ao dono:
**D-405-PROIBIR-VIEWS** — *"Proibir qualquer view (Recomendado)"* — e a junta 3 fechou sem C2/C3 (o resultado já estava
dado pela C1 e o ciclo 4 muda o objeto).

§C7.4-bis: (a) a composição cobria a competência (a C1 era a cadeira da via view); (b) quem achou não conserta — ciclo 4
com planejador `planejador-ciclo4-b-san3-05` e dev `dev-ciclo4-b-san3-05`, identidades novas; (c) o planejador do ciclo 3
fixou a propriedade por sobre-aproximação de dono/privilégio de TABELA; o furo veio do privilégio de COLUNA, que nenhuma
medição anterior tinha exercido.

## Ciclo 4 — junta 4 (2026-10-09)

- **Objeto:** inspetor em `2400049b` (LIBERADO COM RESSALVA, R1–R4 — `votos/B-SAN3-05/ciclo4/00-inspetor-terreno.md`);
  C1 em `79b0d594`; C2 e C3 em `84831ad9`. De `737e8cf3` (head do dev) até `3a7fde77` só entrou registro — parecer,
  mandatos, evidências e votos; `git diff 737e8cf3 10fbbd98` fora de `agent-orchestration/`, `.claude/` e `.agents/` vazio.
  CI 7/7 verde em cada objeto.
- **Regra do ciclo:** `D-405-PROIBIR-VIEWS` (decisão do dono, 2026-10-09) — a trava recusa toda view/matview cuja árvore
  de regras alcance tabela com FORCE RLS, sem filtro de dono, privilégio ou esquema. Leitura R3/R4 do ciclo ≥3: só defeito
  GRAVE de produto reprova.
- **Papéis (§C7.4-bis):** planejador `planejador-ciclo4-b-san3-05` · dev `dev-ciclo4-b-san3-05` · fábrica `agente-fabrica`
  — todos Claude Opus 5.5 por substituição declarada (§C7.6-bis: o bloco não toca dinheiro; Fable/Astra só em bloco de
  dinheiro, decisão do dono de 2026-10-08). Nenhum deles achou, votou ou conserta o que achou.

## VEREDITO: APROVADO (3 × 0, unanimidade)

| cadeira | identidade | modelo | voto | bloqueia |
|---|---|---|---|---|
| C1 | `jurado-san305-c4-catalogo-de-views` | Opus 5.5 (substituição declarada) | **APROVADO** | — |
| C2 | `jurado-san305-c4-credencial-arnes-escopo` | Opus 5.5 (substituição declarada) | **APROVADO** | — |
| C3 | `jurado-san305-c4-boot-e-suite` | Opus 5.5 (substituição declarada) | **APROVADO** | — |

- **approved_head:** `84831ad9796d8db29766b0ff6e0a1a894a9d45e7`

**O que as cadeiras mediram:**
- **C1:** COL, COM, MAT e cadeia recusados pela trava, pelo boot e pelo MODO 6, e também as formas próprias F1 (outro
  esquema, EXISTS, CTE, LATERAL, agregado), F2 (regra não-`_RETURN`), F3 (particionada, view→matview→view,
  `security_barrier`/`security_invoker`) e F4 (TEMP de outra sessão). O código do disparo do dev deixava COL/COM/MAT
  passar: a medição discrimina. Banco migrado com 0 view.
- **C2:** a senha nunca aparece em claro (log do servidor, terminal e argv, no Windows e no container), e o verificador é
  sempre `SCRAM-SHA-256$`. Lote de catálogo 3 vezes, 12/12 + 13/13, sem XX000, 23505 nem 40P01, resíduo 0, inclusive
  nos caminhos de falha. Escopo do dev dentro do PERMITIDO; `Kpis/` sem diff; guarda de catálogo 72 = congelado.
- **C3:** o boot de produção recusa a via view (`RuntimeRoleGuardError`) e o papel limpo do script sobe e serve. API e
  owner-portal ouvindo, com Redis próprio. Suíte inteira: 3135 executados × 2 rodadas, 2 skips nomeados, 2 falhas — só o
  T15 por tempo sob carga (A2-1). Build verde. Os textos da regra dizem (i)–(v).

**Achados não graves (nenhum reprova; viram pendência ou ficam registrados aqui):**
- C1 — **F5**: view sobre função SQL `SECURITY INVOKER` que lê tabela FORCE não é recusada, e nenhum escape foi medido
  (o RLS morde o invocador) → `P-SAN3-05-VIEW-SOBRE-FUNCAO-INVOKER`. Variante `SECURITY DEFINER` = `B-SAN3-10`.
- C1 — a suíte não fixa as formas F1–F3 que o produto recusa → `P-SAN3-05-SUITE-SEM-FORMAS-F1-F3` (PR só de testes).
- C3 — **A2-1** (ajuste): o T15 estoura o teto de 15 s sob a carga da suíte inteira; o processo recusado fica vivo ~10 s
  com conexão ociosa. Reprova por tempo de máquina, não por comportamento → `P-SAN3-05-T15-TETO-DE-RELOGIO`.
- C3 — **N3-a**: o RAISE do MODO 6 e o message do `RuntimeRoleGuardError` atribuem a via view ao papel. **N3-b**
  (pré-existente, `src/server.ts:48`): o message da recusa não chega ao log de produção →
  `P-SAN3-05-MENSAGEM-DA-RECUSA`.
- C2 — N1 (comentário-cabeçalho da linha final do script, fora da letra do PERMITIDO, declarado pelo dev; efeito na senha
  0) · N2 (título do T8c "três"→"dois", declarado) · N3 (pré-existente `bbbb3b29`: o T8d tem 4 chamadas de slot de
  replicação fora da trava, sem escrever tabela de catálogo) · N4 (sem mandato do dev em `00-mandatos/` — pela
  `D-GOV-PROPORCIONAL` (3), dev nasce de prompt simples) · N5, abaixo. Só registro.

**Terreno e desvio declarado:** o parecer do inspetor (R2) e o C4.6 do plano pediam **uma cadeira por vez**, por disco.
Às 20:41Z a C3 foi disparada com a C2 viva, porque o dono autorizou nessa hora até 2 processos Claude simultâneos. O
disco foi medido antes (14 GB livres, depois da limpeza dos caches de gradle e npm, sem volume do Docker). Cada cadeira
usou cluster, rede e worktree próprios. A C2 registrou o paralelismo como N5 e declarou efeito nulo nas suas medições. Ao
fim: 12 GB livres, 0 container, 0 worktree `j05c4*`. Quedas: 0.

**Não-convergência:** não — a classe da via view, que se repetiu nos ciclos 2 e 3, fechou pela regra do dono (sem filtro
de dono/privilégio); nenhuma forma dentro da decisão passou.
