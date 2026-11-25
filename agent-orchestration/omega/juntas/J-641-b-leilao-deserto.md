# J-641 — junta completa do PR #641 (leilão sem venda depois do lote, `B-LEILAO-DESERTO`)

- **Objeto das 3 cadeiras:** `e6bccd284`; **objeto do conserto único:** `9ca832a4b`; **objeto do merge:** `16db307df`; squash na `main`: `44a64521e` (25/11, 19:00 SP).
- **Composição:** inspetor + três cadeiras; quórum de unanimidade de três, com veto, porque o bloco muda a escrita que faz a diária voltar a ser cobrada (dinheiro), quem tira o veículo do lote e a concorrência entre os atos do leilão (§C7 item 10(1); o plano, no §12).
- **Casa das cadeiras:** o inspetor e as 3 cadeiras começaram na DeepSeek Pro (nível menor declarado), como a J-637 e a J-639. **Cruzamento declarado:** o plano é do Claude e o código é do Codex (conta 6); a DeepSeek não escreveu nada. A pré-revisão também foi da DeepSeek (`prerev-641-dp`), em outra identidade.
- **Fluxo rápido (§C7 item 10(3)):** uma votação só, cada cadeira entrega a lista completa de achados com o comando que a reproduz; depois vêm a triagem e um conserto só.

## O inspetor

- **`insp-641-dp`: LIBERADO** (25/11, ~11:15 SP). Objeto conferido; 18 check-runs concluídos e verdes (`backend` 7928/7926, fail 0, skipped 2; `backend-postgres` 1451/1451, fail 0; `frontend` 2129/2129, fail 0); base viva parada e portas 5432/6379 sem escuta; portas 59721–59726 sem sobreposição entre cadeiras; memória livre acima do mínimo; espelho de agentes consistente; nenhum voto adiantado. Nota sem efeito no veredito: o ramo estava atrás da `main` (só o #640, registro), porém mergeável.

## O revisor de telas (insumo da C3) — SEM PARECER

- **`revtela-641-op` (Claude Opus, subagente)** foi arranjado **ANTES** do voto da C3, como o plano manda e como a lição do #637 pediu. Foi **parado às 11:23 por ordem do dono** (*"pare. vc so pode orquestrar"*, `D-DONO-2511-CLAUDE-SO-ORQUESTRA-REFORCO`), com os itens 1 a 3 ainda em apuração. O parecer parcial foi marcado **SEM PARECER** e não é insumo de veredito; a C3 mediu o painel (o LD11 e a sugestão de rodada) pelo próprio item 3, por execução.

## As quedas e as sucessões pelo P3

- **~11:53 — a DeepSeek ficou indisponível** e as 3 cadeiras caíram (o vigia viu às 12:18, pela idade do log). O inspetor já tinha liberado e o parcial estava gravado: a evidência da C1 sem item em apuração, a da C2 com 2 e a da C3 com 5; o voto da C2 era esqueleto (`INCOMPLETO`). Os bancos e os caches das cadeiras foram parados e removidos; os worktrees ficaram para os sucessores.
- **~14:20 — decisão do dono (`D-DONO-2511-JUNTA-641-CODEX6`):** *"Códex 6 com identidade nova"*. As cadeiras foram para os Codex, com identidade nova e como sucessoras pelo P3 (cada sucessor re-executa a evidência do caído). **Exceção declarada:** a conta 6 foi a do dev do bloco, e o dono a autorizou a votar.
- **C1:** `jc1-641-dp` → **`jc1-641-sucx6`** (Codex 6), APROVA às 15:28.
- **C2:** `jc2-641-dp` → **`jc2-641-sucx7`** (Codex 7; caiu às 15:10 — o conteúdo foi recusado pelo filtro da casa, por tratar de corrida entre transações) → **`jc2-641-sucx7b`**, o mesmo mandato com uma abertura de contexto (teste de concorrência de banco, local e descartável, no repositório do dono, sem alvo externo), APROVA às 15:29. A abertura resolveu a recusa.
- **C3:** `jc3-641-dp` → **`jc3-641-sucx6`** (Codex 6; caiu ~15:5x no limite, com os itens 1 e 2 conformes e o item 3, as mutações e o teardown em apuração) → **`jc3-641-sucx7`** (Codex 7), APROVA às 16:43.
- **Leitura do orquestrador, declarada como tal:** a C2 foi para a conta 7, sem relação com o bloco, para não enfileirar as 3 cadeiras numa conta só.

## Os votos (unanimidade de 3)

- **C1 (dinheiro e diária) APROVA**, 1 achado não grave. 6 corridas com 7 itens cada e cadeia de custódia válida ao fim de cada item: o deserto devolve o veículo ao pátio com 110 diárias e BRL 4400.00; o teto de 180 é respeitado e depois dele nada mais é cobrado; o período fecha no instante do ato, nenhuma diária cai dentro dele e a varredura nesse instante lança 0; as paralelas somam e o total fecha. Testes: `tests/leilao-deserto.test.ts` 8/8 em memória; `tests/leilao-deserto-db.test.ts` 2/2 em 3 rodadas, no banco próprio. Mutações MD4, MD5, MD8a e MD8b mortas; 2 mutações próprias sobreviveram às suítes commitadas e viraram o C1-01.
- **C2 (quem fica com o lote: a corrida) APROVA**, 1 achado não grave. Nunca venda e deserto na mesma rodada, uma tentativa por rodada, nunca dois 2xx nem 2xx sem gravação, rodada com resultado ou inferior bloqueada e nenhum edital em lote com o veículo já devolvido; sonda de concorrência 4/4 e sonda de resultados 3/3; 17/17 mutações do tema mortas, com âncora única, teste nomeado vermelho e restauro provado; vermelho-controle medido na base (memória: 8 testes, 1 verde e 7 vermelhos; banco: 2 e 0 verdes, 2 vermelhos).
- **C3 (regras do dono, permissão e contrato) APROVA**, sem achado. A permissão do ato novo conferida em 6 rodadas (403/200/200/404), com vermelho na base; a recusa de registrar resultado em rodada que não é nova conferida; o caminho da sucata intacto; o painel e o contrato conferidos (LD11 6/6, com vermelho-controle); 10 mutações do plano e 1 própria mortas e restauradas; catálogos, rota, fixtures, CI, escopo e denominadores conferidos.

## A triagem e o conserto único

- **Triagem (§C7 item 10(3)):** os dois achados são não graves, dentro do bloco e simples → **conserto único na mesma leva**.
  - **C1-01** (`src/modules/auction/auction-prisma.repository.ts` e o espelho em memória): os testes commitados não afirmam que o fim do período é exatamente o instante do ato nem que a varredura nesse instante lança 0; o código cumpre a propriedade, mas uma regressão de um dia mais cedo sobrevive nas duas suítes.
  - **C2-01** (`src/modules/auction/auction.service.ts`): a repetição com leitura velha, depois do primeiro 200, responde `invalid_transition` em vez de `auction_reading_stale`, como o LD6 pede; a propriedade de segurança permanece preservada (uma tentativa, dois eventos e nenhum segundo 2xx).
- **`fix-641-ar` (Argon):** o conserto único empurrado em `9ca832a4b` (+2 linhas no serviço e os 2 testes do deserto); nenhum achado novo. CI de push verde.
- **`conf-641-dp` (DeepSeek): CONFERIDO** (18:34): C1-01 e C2-01 fechados em `9ca832a4b`, nada mais mudou, CI com fail 0. O ramo estava atrás da `main` só pelo #640 (registro, sem código): atualização do ramo → head `16db307df`.

## Resultado

- **Unanimidade de 3 no objeto `e6bccd284`, com os 2 achados não graves fechados no conserto único `9ca832a4b` e conferidos.** Merge do #641 na `main` em `44a64521e` (25/11, 19:00 SP), com 0 falhas no CI.
- **Limpeza:** o worktree do dev removido, os ramos local e remoto apagados, os worktrees e os clusters das cadeiras removidos e 1 contêiner da junta apagado.
- **Lições registradas:** (1) a casa das cadeiras pode cair por indisponibilidade no meio da junta — o parcial gravado cedo e os worktrees preservados são o que permite a sucessão pelo P3 sem refazer o terreno; (2) o revisor de telas não sobe como subagente sem o "pode" do dono (`D-DONO-2511-CLAUDE-SO-ORQUESTRA-REFORCO`); (3) diferença entre um diário anterior e a medição de agora não é parada: o que se mede vale — uma mutação que a leva anterior disse sobreviver morreu no teste existente, e o dev tinha parado sem precisar.
