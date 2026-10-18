# J-B-TRC-01 — junta do ciclo 3 (2026-10-18) · PR #426, Traccar em dev com ingestão privada e quarentena

- **Objeto:** `7c220467f754341a699c18c241fa9965c1a35638`. É o conserto do ciclo 3 (`ebdf6374`) com os corpos das 3 cadeiras nos dois espelhos (64 agentes). O head do PR, `ce20aa3f`, é o objeto mais 1 commit só de registro (mandatos, parecer do inspetor e `R-B-TRC-01-ciclo2.md`), sem diff em `src/`, `tests/` ou `prisma/`. CI 14/14 verde.
- **Régua:** bloco de SEGURANÇA, junta completa, unanimidade de 3 com veto. **Ciclo 3: só defeito de produto GRAVE reprova** (perde dado, vaza entre organizações, quebra permissão, erra dinheiro, §C7 item 8(2)). O resto vira pendência com dono.
- **Ordem do dono:** *"ataque so a c"*. O ciclo 3 conserta só o (c′)-P1 do ciclo 2.
- **Plano do ciclo 3:** `docs/revisoes/TRACCAR/B-TRC-01-ciclo3-plano.md`, de `planejador-trc01-ciclo3` (Fable, auditoria de topo, `R-B-TRC-01-ciclo2.md`). O conserto não tem migração.
- **Dev:** `dev-trc01-c3-opus`, relatório em `docs/revisoes/TRACCAR/B-TRC-01-ciclo3-dev.md`.
- **Inspetor de terreno:** `inspetor-trc01c3-opus` (Claude Opus 5.5, troca declarada do Codex), **LIBERADO COM RESSALVA**, R-1 a R-10 (`votos/B-TRC-01-ciclo3/insp-trc01c3-parecer.md`).

## VEREDITO: APROVADO (3 × 0)

| cadeira | identidade que votou | executor e modelo | voto | reprova no ciclo 3 |
|---|---|---|---|---|
| (a″) RLS e regressão | `jurado-trc01c3-a-opus` | Claude Code, Claude Opus 5.5 (o Codex previsto bateu o limite; reserva declarada) | **APROVADO** | — |
| (b″) escopo, superfície e registro | `jurado-trc01c3-b-opus` | Claude Code, Claude Opus 5.5 | **APROVADO** | — |
| (c″) tabela de motivos | `jurado-trc01c3-c-opus` | Claude Code, Claude Opus 5.5 | **APROVADO** | — |

**O que as cadeiras mediram por execução:**
- **(a″):**
  - CI do objeto: `backend-postgres` 391/391, skipped 0, com o guard de pulos ativo; `backend` 3496 testes, 3494 pass, 0 fail e os 2 skips nomeados (`permission-catalog-db-parity`).
  - `ci.yml` intocado no ciclo 3.
  - T13 35/35, com `L0` 111 = 111 (objeto = ciclo 2). O vermelho-controle (tirar o FORCE de `traccar_ingress_receipts`) deixa o T13 vermelho; o restauro foi conferido por hash.
  - A consulta nova (`vehicle_id = V OR vehicle_assigned_at > at`) só lê OS da mesma organização sob RLS. A parte com banco foi medida em container próprio.
- **(b″):** o escopo do ciclo 3 está dentro do PERMITIDO do plano; superfície, segredo e a trava `Ω6R-SEC-002` estão intocados.
- **(c″):**
  - **O (c′)-P1 está fechado:** a tabela §3.4 foi reproduzida por execução. A OS que perde a viatura depois do fix volta à janela, e o caso ambíguo vai para a quarentena (`operator_history_ambiguous`).
  - T-P1, T-P2 e T-C1/T-C4(e) verdes; as mutações M-C1′, M-P1a e M-P1b ficam vermelhas.

**Achado que NÃO reprova (classe não grave, ciclo 3) e vira pendência com dono:**
- **(c″)-F1, dono proposto `B-TRC-03`, junto de `P-TRC-VIATURA-PERIODOS`:**
  - Montagem: as duas OS têm V1 e despacho aceito, e o fix de um instante é ambíguo.
  - Defeito: se esse fix for entregue depois de o despacho de A ser **re-aceito** (`accepted→accepted`), ou reatribuído a C e aceito, ele grava 204 no trajeto de B.
  - Causa: a janela `d.accepted_at <= at` (`field-dispatch-prisma.repository.ts:48-49`) usa o `accepted_at` regravado a cada aceite (`:123`).
  - Origem: nasceu no B-TRC-01 (`d5a4f25b`); o ciclo 3 não a tocou.
  - Por que não é grave: mesma organização, nada perdido (recibo e posição gravados, recuperáveis), sem permissão e sem dinheiro.

**Notas (não reprovam; pendência do orquestrador ou de governança/CI):**
- **(a″) N-A1:** a cadeira não conseguiu reexecutar verde `tests/o6r07c-census-guard.test.ts` (13 casos) no próprio terreno. No Windows o processo filho morre por falta de memória; no Linux faltava `.git`; e o motor do Docker caiu. É pré-existente (a suíte vem do #414 e o ciclo 3 não toca nada dela). O insumo é o check-run `backend` do objeto, com fail 0.
- **(a″) N-A2:** o "21 transições" das atas é o número de transições executadas pelo roteiro da (c′); a máquina de estados tem 28 arestas.
- **(a″) N-A3:** o motor do Docker caiu por volta das 21:05Z, durante uma reexecução, com no máximo 2 trabalhos na máquina. A base `erp-*` reiniciou sozinha. A máquina estava com a memória de commit quase esgotada (784 MB livres, medido pelo orquestrador às ~21:00Z).
- **(a″) N-A4:** sob o papel de runtime, o EXPLAIN funde as duas políticas com o filtro de organização numa classe de equivalência; é forma, não defeito.
- **(b″):**
  - as pendências do §4 do plano não estão em `controle/pendencias.md` (vão no PR de registro);
  - `R-B-TRC-01-ciclo2.md` não está no objeto e não responde por escrito a pergunta (a) da §C7.4-bis;
  - o corpo do PR não descrevia o ciclo 3 (**tratado antes do merge**);
  - o PERMITIDO do §3.2 não nomeia o próprio plano, e o §3.10 conta 5 suítes sem banco (são 7) e 2 arquivos de `src/` (são 3).
- **(c″):** as pendências do §4 que a cadeira aceita como resíduo declarado são `P-TRC-VIATURA-NULL-SEM-SINAL`, `P-TRC-VIATURA-PERIODOS`, `P-TRC-QUARENTENA-CONSERVADORA`, `P-TRC-AMBIGUIDADE-MESMO-OPERADOR` e `P-TRC-RELOGIOS-NODE-POSTGRES`.
- **Inspetor (R-2, R-3, R-5, R-6):**
  - há soltos de outras sessões em `w-trc01` (`check_md5.cjs`, `check_md5.js`, `.npmtest-503.log`), que foram reportados e não tocados;
  - os worktrees `w-jc2-b*` já não existiam às 19:36Z;
  - "ataque só a c" ainda não está em `decisoes.md` (vai no PR de registro);
  - o obituário não tem o B-TRC-01.

## Terreno, quedas e substituições (P6, `votos/B-TRC-01-ciclo3/00-quedas.md`)
- **Quedas de agente:** nenhuma neste ciclo.
- **(a″):** esperou uma vaga de Docker (no máximo 2 trabalhos). A queda do motor às ~21:05Z interrompeu só uma reexecução opcional da N-A1.
- **Containers:** os de jurado (`jtrc01c3-*`) foram removidos pelo nome. A base viva não foi tocada.

## Separação de papéis (§C7.4-bis)
- **Quem achou o P1:** a (c′) do ciclo 2.
- **Quem planejou o ciclo 3:** `planejador-trc01-ciclo3` (Fable).
- **Quem desenvolveu:** `dev-trc01-c3-opus`.
- Nenhum deles votou neste ciclo.

**Próximo:** merge do #426 com a CI verde e porteiro pós-merge. As 12 pendências do §4 mais a F1 vão para o PR de registro. **Nada disto autoriza staging nem produção.** O pré-requisito `B-SAN3-05` (#405) já está mergeado, mas a produção ainda depende de decisão, threat model e junta próprios (§C7 item 8(4)).
