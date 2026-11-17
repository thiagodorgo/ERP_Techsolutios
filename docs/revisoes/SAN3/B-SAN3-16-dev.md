# B-SAN3-16 — diário do dev (resumo)

- **Bloco:** item 5 do portão — a fila do app de campo drena "pedir aprovação" e "não consegui iniciar".
- **Dev:** `dev-16-cl`, Claude Opus 5.5, identidade nova e declarada (§C7 11(6)). Sem cruzamento entre casas nesta
  rodada; a pré-revisão e a junta são de identidades novas.
- **Lei:** `plano-B-SAN3-16.md` (com a Emenda 1 da crítica r1) e as Emendas 1, 1.1 e 1.1.1 da abertura, fora do
  repositório (`erp-pausa-2026-10-03/planos/`). O diário completo, com cada comando e cada saída, fica em
  `erp-pausa-2026-10-03/revisoes/b-san3-16/dev-16-cl.md`.
- **Ramo:** `feat/mobile-fila-os-16`, a partir da `main` `eeac48a3`; a `main` foi absorvida por merge (sem reescrever
  história) em `8fc4b60e` e em `80f5b4d9` (o #568, B-SAN3-17).

## O que o bloco entrega

| Prop. | O que muda | Testes-donos |
|---|---|---|
| P1 | os 2 tipos entram no replay de OS, com a lista fechada de campos e o corte nos limites do contrato | A1–A8 |
| P2/P3 | o servidor aceita os 2 só do técnico da OS (permissão por ação, escopo por objeto antes do corpo), grava o evento na linha do tempo e não duplica no reenvio, também depois de reinício | B1–B13b, D1–D4, laço G |
| identidade | o pedido do técnico é uma aprovação própria na fila (`pedido-app:<hash>`), chamada antes do evento; falha → 503 reenviável | B1, B5e, B5f, B13, B13b |
| P8 | o "não iniciou" avisa no sino quem atribuiu a OS por último, com chave durável e falha reenviável | B2b, B10–B10f, D4 |
| P5 | toda constante da fila tem rota; o que não tem como sair vira erro visível com Descartar, e o passe do coordenador roda a varredura | R1–R8, R1b |
| P7 | na tela de atendimento, "Solicitar aprovação" abre o pedido (só com `work_orders:update`); "Ag. aprovação" e "Exceção" saem | E1, E1b, E2, E3 |

## Fatias

| Fatia | Commit | Resultado |
|---|---|---|
| F0 | `8eca9049` | fronteira, respostas do dono, ordem de merge |
| F1a | `fb40189e` | 26 + 4 vermelhos (servidor) |
| F1b | `a791adc6` | 7 vermelhos e 1 verde por desenho (A4); R e E sem compilar |
| F2a | `86fb50f9` | registro: escopo, repetição, validação, OS terminal, evento |
| F2b | `395fc98d` | aprovação própria, antes do evento |
| F2e | `fcb4bef1` | aviso a quem atribuiu; `API_CONTRACTS.md` |
| F2c | `e392a3d1` | `-db` 4/4; censo +2 entradas `OS·07c-a` |
| F2d | `7f8cf1c4` | lista do `backend-postgres` 3× (625/625, 0 pulo) e 1 linha no `SUITES=` |
| F3 | `76111857` | envio no app |
| F4a | `2f3a19ed` | tabela de rotas e varredura |
| F4b | `8283f9f7` | coordenador e cartão (depois do #568) |
| F5 | `3626ce05` | tela de atendimento |
| F6a/F6b | — | 22/22 mutações do servidor e 21/21 do app, vermelhas por asserção e revertidas |
| F6c/F6d | `597a21f0`, `e8b1fdc0` | integração com a `main`, trava T1–T4 vazia, bateria, CI |
| F7 | `6503f4c1` | registro e limpeza |
| E1.2 | este commit | `loserPid` na barreira e no "R depois de A" do 17; `[T-17-FILA-db] (b)` 20/20 |

## Correções no caminho

- G3 (catraca do construtor do adaptador, contada também em comentário) e A17-bis (censo de `reason` por substring no
  `API_CONTRACTS.md` inteiro): `8148822c`.
- O "Format check" do job `flutter` da CI (Flutter 3.47.5) — medido e corrigido com a imagem `ci-local-flutter:3.47.5`:
  `6d45674d`.

## Pendências

O registro da F7 está em `agent-orchestration/controle/pendencias.md`: fecha `P-MOBILE-FILA-OS-NAO-DRENADA`,
`P-O6R-07C-APP-RECUSA-PERMANENTE-SEM-SAIDA`, `P-MOBILE-SYNC-FAILED-SEM-DESCARTE` e `P-MOBILE-CODEC-FILA-STATUS-CRU`;
apensa as vizinhas; passa ao `B-SAN3-16b` a `P-SYNC-OS-RECIBO-EM-MEMORIA` e a `P-OS-MESMA-SITUACAO-GRAVA-EVENTO`; abre as 8
novas. Uma delas, a `P-T17-FILA-B-CHECAGEM-SEM-PID`, herdada do #568, fecha neste PR pela Emenda 1.2: a
chamada "R depois de A" passa a filtrar o pid de R, sem mudar nenhuma asserção.
