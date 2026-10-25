# J-B-SAN3-13 — junta de DADO (unanimidade de 3 com veto), ciclos 1 a 3

- **Bloco:** B-SAN3-13, "Minhas OS" do app de campo: só as OS do técnico, abertas e por cursor (itens #32 e #33 do portão).
- **PR:** #460, ramo `fix/mobile-minhas-os`.
- **Objeto final julgado:** `f382422514fb2bd0f8363a191a46035c4cf7e865`, CI 14/14 `success` nos dois gatilhos (medido pelo inspetor do ciclo 3 e pela C3c).
- **approved_head:** f382422514fb2bd0f8363a191a46035c4cf7e865
- **VEREDITO FINAL: APROVADO (3 × 0, unanimidade, ciclo 3)**

## Ciclo 1 — objeto `ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d`: REPROVADO
- **Inspetor:** `inspetor-san313-opus` (Claude Opus), LIBERADO COM RESSALVA (R1–R6).
- **Quedas (P6, `votos/B-SAN3-13/00-quedas.md`):** as cadeiras C2 e C3 em Codex (`jurado-san313-c2-sol`, `jurado-san313-c3-sol`) caíram por limite de uso às 18:29Z, no terreno, sem nenhum item medido.
- **Sucessão:** por ordem do dono, *"isso fica na sua responsa ate o codex voltar, faça um a um"*, as cadeiras voltaram ao Claude Opus, uma por vez.
- **C2 `jurado-san313-c2-opus`: REPROVADO.**
  - **C2-01 (grave, perda de dado):** um material pendente gravado na janela da limpeza era apagado com a OS.
  - **C2-02 (não grave):** uma resposta de vistoria pendente com o run `synced` não retinha a OS.
  - **C2-03 (ajuste)** e **C2-04 (nota).**
- C1 e C3 não votaram: o ciclo reprovou antes.
- **Reprovação:** `omega/reprovacoes/R-B-SAN3-13-ciclo1.md`.
- **Topo:** `planejador-san313-c2-fable` (Fable) auditou e concluiu: 2 defeitos REAIS e 1 artefato de processo. Escreveu o plano "Ciclo 2".
- **Conserto:** `dev-san313-c2-opus` (Claude Opus), head `cbf2db29`. Mutações 12/12 vermelhas; Flutter 905/905.

## Ciclo 2 — objeto `cbf2db292f0643b9647017005c361a2e11da61c7`: REPROVADO
- **Inspetor:** `inspetor-san313c2-opus`, LIBERADO COM RESSALVA (R1–R3).
- **C2b `jurado-san313-c2b-opus` (REFEITA): APROVADO.**
  - C2-01 e C2-02 fechados por execução: a sonda R8'' deu 0 de 30 materiais apagados, e o vermelho-controle no ciclo 1 confirmou o defeito anterior.
  - Matriz de 1095 combinações com 0 divergências.
  - C2b-01 (ajuste) e as notas C2b-02 e C2b-03.
- **C1 `jurado-san313-c1-opus` (1º voto): APROVADO.**
  - Escopo por papel: 24/24.
  - Caminhada por cursor: 56 OS sem perda.
  - A web não muda.
  - Mutações: as 17 do dev e 3 dela, todas vermelhas.
  - Notas N-1 a N-4.
- **C3 `jurado-san313-c3-opus` (1º voto): REPROVADO.**
  - **C3-01** (não grave, dentro do bloco): `API_CONTRACTS.md` omitia 4 motivos de erro que o código emite. O texto da E2 os perdeu.
  - Notas C3-02 a C3-04.
- **Reprovação:** `omega/reprovacoes/R-B-SAN3-13-ciclo2.md`.
- **Topo:** `planejador-san313-c3-fable` (Fable). C3-01 é defeito real, NÃO grave, com causa no texto do planejador. Plano "Ciclo 3": 1 linha de contrato.
- **Conserto:** `dev-san313-c3-opus` (Claude Opus, cobrindo o Codex), head `f3824225`. CA-c3-1 a CA-c3-4 verdes.

## Ciclo 3 — objeto `f3824225…`: APROVADO
- **Inspetor:** `inspetor-san313c3-opus`, LIBERADO COM RESSALVA (R1–R4).
- **Regra:** só defeito GRAVE reprova (§C7 item 8(2)).

| Cadeira | Voto | Como (§C7 item 9) | Comando que provou |
|---|---|---|---|
| C1 `jurado-san313-c1-opus` | APROVADO | **carregado** do ciclo 2, regra (1) | `git diff --name-only cbf2db29..f3824225` × os 23 globs de `arquivos_medidos` = interseção vazia (inspetor do ciclo 3, item 2) |
| C2b `jurado-san313-c2b-opus` | APROVADO | **carregado** do ciclo 2, regra (1) | o mesmo diff × os 10 globs = interseção vazia (inspetor do ciclo 3, item 2) |
| C3c `jurado-san313-c3c-opus` | APROVADO | **refeita**, regra (3), identidade nova | CA-c3-1 a CA-c3-3 por comando; escopo; regressão por `CODIGO-IDENTICO` e CI 14/14 (`backend` 3979/3981 com 0 falha, `backend-postgres` 493/493, `flutter` +905) |

**Notas que seguem para registro:** C3c-N1 (redação de "`paginate` ≠ `cursor`" no contrato), C2b-01, C2b-02, C2b-03, C1 N-1 a N-4, e C3-02 a C3-04. Nenhuma bloqueia, e nenhuma é grave.

## Papéis (§C7.4-bis)
- **Planejou:** `planejador-mestre` (Fable). v1 a v3 mais E1/E2 por `planejador-san313-fable`; ciclo 2 por `planejador-san313-c2-fable`; ciclo 3 por `planejador-san313-c3-fable`.
- **Criticou:** `crit-san313-opus` (r1) e `crit-san313-opus-r2` (r2). **Mediu:** `med-san313-argon`.
- **Desenvolveu:** `dev-san313-opus` (ciclo 1), `dev-san313-c2-opus` (ciclo 2), `dev-san313-c3-opus` (ciclo 3).
- **Fábrica e redatores:** `fab-san313-opus`, `redator-san313-opus`, `redator-san313c2-opus`, `redator-san313c3-opus`.
- **Respostas por ciclo:**
  - (a) A composição cobriu backend e permissão (C1), o app offline-first (C2) e regressão, escopo e registro (C3).
  - (b) Quem achou não consertou e não planejou, em nenhum dos ciclos: as identidades são distintas a cada passo.
  - (c) O planejador não usou dado podre: as duas auditorias de topo re-executaram as sondas.
- **Monocultura declarada:** inspetores, cadeiras e devs dos ciclos 2 e 3 rodaram em Claude Opus. A causa é o limite do Codex (18:29Z) e a ordem do dono de o Claude cobrir uma tarefa por vez. O Gemini da API estava fora por teto mensal, e o Argon do Antigravity sem créditos na CLI.

## Fecha
- Itens #32 (`P-MOBILE-MINHAS-OS-SEM-FILTRO`) e #33 (`P-MOBILE-OS-SEEDS`) do portão, com o merge.
- Decisão do dono registrada no bloco: `D-SAN3-13-SCOPE-ASSIGNED` (Q1–Q5, E1 "Só as abertas", E2).

## Nota de registro (orquestrador)
O `git diff --check` acusou espaço no fim de linha em saídas coladas dentro de mandatos e evidências. Os originais foram arquivados, com md5, em `C:/Users/AMP/erp-pausa-2026-10-03/arquivo-mandatos-san313/` (`md5-originais.txt`). Nas cópias versionadas só se tirou o espaço do fim das linhas, com o mesmo procedimento do #454. O conteúdo medido não mudou.
