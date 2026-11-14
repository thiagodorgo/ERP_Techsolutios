# Ata da J-551 (PR #551, B-MATERIAL-REENVIO, bloco C, item 63: o reenvio de material da OS; DINHEIRO e PERDA DE DADO, junta completa, unanimidade de 3)

**Fluxo rápido (§C7 10(3)).** Ata do orquestrador (Claude Opus 5.5), escrita em 13/11 15:40 SP; transcrita para o repositório pelo PR de registro de 13/11 noite (`reg-1311n-cl`), com o conserto, a conferência, o merge e o porteiro. As fontes ficam no diretório de revisões do orquestrador, fora do repositório (`revisoes/j551/`). O diário do bloco está em `agent-orchestration/omega/juntas/votos/B-MATERIAL-REENVIO/00-dev.md`.

## Objeto, pré-revisão e inspetor
- **Objeto:** `4749727c`, com 16 check-runs verdes.
- **Pré-revisão:** `prerev-551-dp` (DeepSeek Pro, roteiro M3): **APROVADO, sem achados.** Leu o TAP de todos os jobs da rodada `43456974286` (backend 5510 com fail 0, backend-postgres 618, flutter 1240, frontend 1735); as 29 mutações deram vermelho, e a M-C42 sobreviveu como o plano previa; o bloco passou 125/125 em memória e 38/38 no banco; o escopo tem 43 arquivos, todos no PERMITIDO.
- **Inspetor:** `insp-551-cl` (Claude, gate Opus), **LIBERADO COM RESSALVA** (R1 a R6, incorporadas ao briefing às 14:30 SP):
  - R1: os inelegíveis por extenso;
  - R2: a fonte é o plano de fora do repositório, porque a cópia no objeto parava na C2.7 (sem a C2.8 nem a E-C28.5);
  - R3: o `dart format` fica "a re-verificar";
  - R4: Postgres e Redis próprios para a C2;
  - R5: a M-C22 na C1; a M-C21 e o RC4b na C3a;
  - R6: a C3 se divide em C3a e C3b, cujos votos contam como uma cadeira.

## Os votos (unanimidade de 3; a C3 dividida em C3a e C3b)
| Cadeira | Identidade | Modelo | Cruzamento | Voto | Achados |
|---|---|---|---|---|---|
| C1 (escopo, dono e idempotência, backend) | `j551-c1-cl` | Claude Opus 5.5 | sim: o backend é da Codex 1 | **APROVA** | 0 grave · 5 não graves (C1-04 `pre-existente`) |
| C2 (banco e censo) | `j551-c2-dp` | DeepSeek Pro | sim | **APROVA** | nenhum |
| C3a (app) | `j551-c3a-dp` | DeepSeek Pro | sim, nas duas casas | **APROVA** | 0 grave · 2 não graves |
| C3b (suíte, escopo e registro) | `j551-c3b-cl` | Claude Opus 5.5 | não, declarado (cobertura na hora: nenhuma Codex com limite antes das 17:40) | **APROVA** | 0 grave · 5 não graves |

**Resultado: APROVADO por unanimidade, sem achado grave.**

- **A diversidade, declarada:** o DeepSeek ocupou duas cadeiras (C2 e C3a) e fez a pré-revisão, com três identidades distintas. A C3a saiu da Codex 2 para o DeepSeek, porque o cruzamento ficava melhor (o núcleo é da Codex, e os consertos, do Claude).
- **O que a C2 mediu:** Postgres próprio em UTC; o RC3 (1)-(8) verde, com as M-C6, M-C8, M-C30 e M-C38 vermelhas e restauradas; 5 rodadas sob corrida; a trava do `SUITES=` e o K=8; as M-C20, M-C39 e M-C40 vermelhas; a mutação nova dela (`work_order_material.transfer` sem a porta da OS) foi pega.
- **Quedas:** nenhuma jurada caiu. A Codex 1 e a Codex 2 bateram o limite durante a junta, sem estar em cadeira.

## Triagem (§C7 10(3)3): todos não graves e simples, no conserto único
| Achado | Classe | Decisão |
|---|---|---|
| C1-01 | falta o teste do RC2(17)-N4, e o conflito devolve o `server_id`/`work_order_id` da OS do payload, não os da baixa | **conserta:** o teste-dono N4 e o retorno com os dados da baixa |
| C1-02 | uma falha que não é de rota vira `rejected invalid_action` com a mensagem crua; num commit ambíguo, a recusa sai com a baixa ativa | **conserta:** o erro que não é de domínio vira 500 com mensagem fixa, com teste; o caminho do commit ambíguo na conferência |
| C1-03 | a M-C1-NOVA e a M-C1-NOVA-b sobrevivem: a idempotência só testa a quantidade | **conserta:** testes da OS e do item no `samePayload`, em memória e `-db` |
| C1-04 | o TOCTOU do `InMemoryInventoryRepository.createExitForSource`, só em memória | **pendência** `P-551-INMEMORY-TOCTOU-EXIT-SOURCE` (BAIXA, `pre-existente`; dono `B-SAN3-15b`) |
| C1-05 | o `razaoIntacto` só fotografa a organização A | **conserta:** fotografar A e B |
| A1 (C3a) | "Versao" sem acento em 2 textos que o técnico vê | **conserta:** "Versão" |
| A2 (C3a) | o caminho Descartar do material não tem teste | **conserta:** o teste, vermelho sem a linha |
| C3b-F1 | a cópia do plano no repositório para na C2.7 | **conserta:** copiar a C2.8 e a E-C28.5 |
| C3b-F2 | duas pendências do bloco seguem ABERTAS com o critério já cumprido | **conserta:** fechar com evidência |
| C3b-F3 | a renumeração 63→66 da GATE-CHAVE ficou pela metade no `PLANO_SAN3.md` | **conserta:** as 2 linhas, e anotar a `P-SAN3-ITEM-63-DUPLICADO` |
| C3b-F4 | ID duplicado `P-AMBIENTE-SUITE-INTEIRA-NO-WINDOWS` | **conserta:** renomear a do ramo, com registro da colisão |
| C3b-F5 | o corpo do PR não corresponde ao objeto | **conserta:** reescrever o corpo |

## Papéis do ciclo (§C7.4-bis)
| Papel | Quem |
|---|---|
| Quem achou | `j551-c1-cl`, `j551-c3a-dp` e `j551-c3b-cl` |
| Quem triou | o orquestrador (esta ata) |
| Quem conserta | `fix-551-cl`, Claude Opus, identidade nova; ninguém que achou. As Codex estavam sem limite; o Claude é declarado |
| Quem confere | uma identidade de outra casa: o comando de cada achado, o teste vermelho sem o conserto e o CI inteiro |

## Depois da junta (13/11)
- **Conserto único:** `fix-551-cl` (Claude Opus, declarado), head `3456a309`, com 4 commits (o merge da `main` #556, o conserto, o registro e o merge da `main` #547).
  - Os 11 achados consertados. Na C1-02, o erro que não é de domínio vira 500 `unexpected_error` com mensagem fixa, e o RC2(22-24)/RC3(11) cobrem o commit ambíguo. A M-C1-NOVA e a M-C1-NOVA-b ficaram vermelhas. A C1-04 virou a `P-551-INMEMORY-TOCTOU-EXIT-SOURCE`, já na `main` com o PR.
  - CI 16/16 verde: backend 5547/0/2, backend-postgres 621/621 com RC3 = 11, flutter +1241.
  - Desvios declarados: o 2º merge da `main` entrou no meio; a âncora da M-C22 mudou por indentação; o comentário do `ci.yml` ainda diz K=8 (o `.github/**` era proibido além da linha autorizada).
- **Conferência:** `conf-551-dp` (DeepSeek, outra casa), **CONFERIDO COM RESSALVA**, com 2 não graves.
  - Mediu: o RC2(17) e a M-C22 na forma nova vermelhos; no commit ambíguo, 500 fixo e o reenvio `already_applied`, com 1 movimento, em memória e `-db`; as M-C1-NOVA e M-C1-NOVA-b vermelhas; os testes novos vermelhos com a produção revertida; o CI verde.
  - R1: o diário do conserto deixou o C3b-F5 como EM APURAÇÃO, mas o PR está certo.
  - R2: o comentário do `ci.yml` diz K=8 e 610/610, e hoje são K=11 e 621 → `P-551-CI-COMENTARIO-K8`, registrada neste PR.
- **Merge:** **#551 MERGED em `24f7e792`** às 17:03 SP (squash; árvore igual à de `3456a309`).
- **Porteiro:** `porteiro-551-dp` (DeepSeek Pro, identidade nova), 17:04 SP. **LIBERADO COM RESSALVA.**
  - Conferido: 43 arquivos no PERMITIDO, PROIBIDO = 0; memória 105/105, `-db` 82/82 com RC3 = 11, Flutter local +1241; CI da main (run `43498036392`): backend 5547/0/2, backend-postgres 621/621, flutter +1241.
  - **Item 63 CUMPRIDO** pelo código da `main` (`addWorkOrderMaterial`/`removeWorkOrderMaterial` no sync de estoque; o replay `materialAdd`/`materialRemove` no app) e pelos testes verdes.
  - Ressalva: atualizar o comentário "K=8/610/610" do `ci.yml` para "K=11/621/621" na próxima edição autorizada do `.github` (a `P-551-CI-COMENTARIO-K8`).
  - O portão vai a **48/66**, com o bloco C fechado um dia antes do previsto.
