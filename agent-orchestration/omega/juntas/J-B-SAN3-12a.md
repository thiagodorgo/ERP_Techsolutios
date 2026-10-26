# J-B-SAN3-12a — junta de DINHEIRO (unanimidade das 4 cadeiras, com veto), ciclos 1 e 2

- **Bloco:** B-SAN3-12a, regras do servidor do web financeiro. Baixa com cheque pendente, troca da vinculação, desfazer conciliação e agregado (item 28 do portão, parte backend; item 55 em parte).
- **PR:** #459, ramo `feat/web-financeiro-baixa-e-contas-12a`.
- **Objeto final julgado:** `8a9fc1d8426426403f8642e263b3e932d1738716`, CI 14/14 `success` nos dois gatilhos (medido pelo inspetor do ciclo 2 e pela C3).
- **approved_head:** 8a9fc1d8426426403f8642e263b3e932d1738716
- **VEREDITO FINAL: APROVADO (4 × 0, unanimidade, ciclo 2)**

## Antes da junta
- O dev parou por premissa falsificada (F1–F9). O planejador escreveu a Emenda E1; uma crítica dela voltou com 1 bloqueio (corrida no vínculo), e a Emenda E1-bis o tratou. O dev aplicou as duas.
- O PR conflitava com a `main` em 4 arquivos de registro. O orquestrador fez o merge `5efc99e2`, com append nos dois lados e índice regenerado; a trava de migração (#458) entrou no ramo e deu 0 violação.
- **1ª inspeção BLOQUEADA** por cobertura: 4 critérios sem cadeira (R-res-5/A14, R-res-4/A13, A21, A16). Foi criada a **C4** (`04b8a667`), e a 2ª inspeção deu LIBERADO COM RESSALVA.

## Ciclo 1 — objeto `04b8a667780930050c8af2c77c323b81fe8794bb`: REPROVADO
- **C2 `jurado-san312a-c2-opus`: REPROVADO.** C2-01 (não grave): justificativa com NUL desvinculava sem gravar a auditoria crítica.
- **C4 `jurado-san312a-c4-opus`: REPROVADO.**
  - **C4-03 (GRAVE, dinheiro):** PATCH do valor × vínculo de cheque deixava o título com valor 150 e um cheque pendente de 100 (36/37).
  - **C4-02:** a mutação M13a não deixava nenhum teste vermelho.
  - C4-04 (pré-existente, mesma classe do C4-03, depois incorporado), C4-01 e C4-05.
- **C1 e C3:** seguradas pelo orquestrador, porque o conserto tocava o escopo delas. Registrado em `omega/reprovacoes/R-B-SAN3-12a-ciclo1.md`.
- **Topo:** `planejador-san312a-c2-fable` (Fable). Auditoria: 3 defeitos reais, nenhum artefato. Plano "Ciclo 2 (12a)" com A29 a–h, A30 a–c, A13-bis e R-res-5-bis; 0 perguntas ao dono.
- **Conserto:** `dev-san312a-c2-opus` (Claude Opus, cobrindo o Codex), head `8bc8b01f`, depois `8a9fc1d8` com o merge da `main` (só `Kpis`). Mutações 9/9 vermelhas.

## Ciclo 2 — objeto `8a9fc1d8…`: APROVADO
- **Inspetor:** `inspetor-san312a-c2-opus`, LIBERADO COM RESSALVA (R1–R7).

| Cadeira | Voto | Como (§C7 item 9) | O que provou |
|---|---|---|---|
| C2b `jurado-san312a-c2b-opus` | APROVADO | refeita, identidade nova | A30 numa sonda de 291 entradas: 0 desvínculo sem rastro (o objeto do ciclo 1 mostra NUL e surrogates com 200 e 0 rastro); matriz de papéis 0 divergência; F5 |
| C4b `jurado-san312a-c4b-opus` | APROVADO | refeita, identidade nova | A29: 0 estado ruim em 240 rodadas de corrida com barreira, nos dois papéis (no serviço do ciclo 1, 80); A13-bis; R-res-5-bis; isolamento 52/52 |
| C1 `jurado-san312a-c1-opus` | APROVADO | 1º voto | A27, A28 e D1 com barreira; 0 deadlock; invariante de competência |
| C3 `jurado-san312a-c3-opus` | APROVADO | 1º voto | B1: só no objeto = 0 contra o head-base; B2; escopo; migração (BEGIN/COMMIT, idempotente, drill 3×4/4); contrato (14 motivos novos) |

## Achados que seguem para registro (nenhum bloqueia)
- **C1-A1** (ajuste, pré-existente do #456): o mesmo título aceita um 2º cheque do valor cheio enquanto o 1º está pendente. A compensação do 2º falha fechada, sem caixa em dobro. Precisa de pendência nova com dono (próximo bloco financeiro de backend).
- **C3-04:** o EBUSY dos drills no Windows precisa de pendência nova.
- **C3-02:** o runbook não diz como re-aplicar a migração depois de rollback manual.
- **Notas:** C2b-N1/N2, C4b-N1..N4, C1-N1..N3 e C3-01/03/05/06/07.
- **Pendências que o porteiro pode fechar no merge, com o critério cumprido por medição da junta:**
  - `P-SAN3-12A-PLANO-FALSIFICADO-ESCOPO` (C3, item 3);
  - `P-SAN3-20-DELETE-TITULO-COM-CHEQUE` (C4b, item 1: 422 e prova concorrente).

## Papéis (§C7.4-bis)
- **Planejou:** `planejador-mestre` (Fable). v3 com E1 e E1-bis por `planejador-san312-e1-fable`; ciclo 2 por `planejador-san312a-c2-fable`.
- **Criticou:** r1 (Gemini), r2 (Opus), `crit-san312a-e1-opus` (a crítica da E1).
- **Desenvolveu:** `dev-san312a-opus` (bloco, E1, E1-bis) e `dev-san312a-c2-opus` (ciclo 2).
- **Fábrica e redatores:** `fab-red-san312a-opus`, `fab-red-san312a-r3-opus`, `redator-san312a-r2-opus`, `redator-san312a-c2-opus`.
- **Inspetores:** `inspetor-san312a-opus` (2 passadas) e `inspetor-san312a-c2-opus`.
- **(a) Composição:** cobriu dinheiro e concorrência (C1), permissão e auditoria (C2), regressão, escopo e contrato (C3), isolamento e invariantes (C4).
- **(b) Separação de papéis:** quem achou não planejou nem consertou.
- **(c) Dado podre:** nenhum. A auditoria de topo re-executou as sondas com barreira.
- **Monocultura declarada:** todo o ciclo rodou em Claude Opus, pelo limite do Codex e pela ordem do dono de o Claude cobrir uma tarefa por vez. Nenhuma cadeira foi Gemini.

## Fecha
O item 28 do portão, na parte de regras do servidor. As telas vêm nos blocos 12b e 12c. O item 55 fica parcial (backend da conciliação).

## Nota de registro (orquestrador)
O `git diff --check` acusou espaço no fim de linha em saídas coladas de mandatos e evidências. Os originais estão arquivados com md5 em `C:/Users/AMP/erp-pausa-2026-10-03/arquivo-mandatos-san312a/`; só se tirou o espaço do fim das linhas (mesmo procedimento do #454 e do #460).
