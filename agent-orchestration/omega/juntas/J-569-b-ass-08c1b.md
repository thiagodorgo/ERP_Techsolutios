# Ata da J-569: junta completa do PR #569 (B-ASS-08c1b, a fila operável da cobrança: cobrar, cancelar e revisar; item 60)

**Orquestrador:** Claude Opus 5.5. A ata foi escrita em 15/11, por volta das 00:50 SP, com a hora medida.
**Fluxo:** o rápido (§C7 10(3)), uma votação só. **Objeto:** `94786e55`. O `ls-remote` foi conferido por cada cadeira, e o remoto não andou.
**Quórum:** unanimidade de 3 (dinheiro, banco e isolamento). O voto contra sem grave vira insumo da triagem, e não um novo ciclo (§C7 10(3) e 10(4)).

## Terreno
O inspetor `insp-569-cl` (Claude Opus) deu **LIBERADO COM RESSALVA** (R1 a R9), em `insp-569-parecer.md`. As ressalvas entraram como ADENDO no `BRIEFING.md` antes do disparo. Houve uma pausa P7 às 23:19, pelo reinício da máquina, e a retomada foi às 23:37, pelo id.

## Cadeiras e votos
| Cadeira | Identidade | Modelo | Voto | Graves | Não graves |
|---|---|---|---|---|---|
| C1 · dinheiro e travas | `j569-c1-cl` (`agente-dba-guardiao` + `inspetor-de-arnes-concorrente`) | Claude Opus 5.5, declarado | **APROVA** | 0 | C1-01 |
| C2 · isolamento e payload | `j569-c2-cl` (`guardiao-fail-closed`) | Claude Opus 5.5, declarado | **REPROVA** (sem grave, pela régua fail-closed) | 0 | C2-01 … C2-06 |
| C3 · regressão, censo, contrato e registro | `j569-c3-cl` (`validador-mestre`) | Claude Opus 5.5, declarado | **APROVA** | 0 | C3-01 … C3-04 |

**Cruzamento:** as cadeiras são Claude, por regra do plano (§6), declarada. O cruzamento real do bloco foi a pré-revisão do Argon. Não houve queda (`votos/00-quedas.md` vazio).

**Os papéis (§C7.4-bis):**
- **acharam:** as 3 cadeiras;
- **triou:** o orquestrador;
- **conserta:** o dev do bloco, `dev-08c1b-cl`, que não achou;
- **confere:** um verificador de outra casa, que não consertou.

## O que as cadeiras mediram (resumo; o detalhe está nas evidências)
- **C1:**
  - as frentes C1.F1 a C1.F3 inteiras;
  - as `-db` 3×, com `# skipped 0`;
  - N=10 no CC4 e no T-LOCK-2;
  - as mutações do MAPA vermelhas.
- **C2:**
  - o 403 nas 7 rotas novas, com 189 chamadas negadas fora da plataforma;
  - 7 × 404 entre organizações no Postgres, sob `NOBYPASSRLS`;
  - as mutações do MAPA vermelhas.
- **C3:**
  - o CR1 com 10/10;
  - a REG-5.2 exata, com 25 linhas `-`;
  - as mutações das emendas 2.1 a 2.4 como a lei pede;
  - T13 35/35 e T40 = 60;
  - o PROIBIDO vazio;
  - o TAP dos 16 jobs nas 2 rodadas, sem nenhuma falha.

## Triagem (§C7 10(3)), feita pelo orquestrador
**Nenhum grave.** Nada perde dado, nada vaza entre organizações no código de hoje, nada quebra permissão e nada erra dinheiro.

### A. Conserta agora, na mesma leva (não grave e simples)
Cada item leva um teste que fica **vermelho sob a mutação que a cadeira provou sobreviver**. O comando de reprodução está no voto da cadeira.

| Id | O que falta | O aceite |
|---|---|---|
| **C1-01 + C2-01 + C3-01** (uma classe só) | A cópia em memória da fila (`InMemoryOutboxRepository`, `outbox.repository.ts`) tem regras sem teste: o filtro de organização em `resolve`, `listForTenant` e `#reopen` (l.452, 487 e 497); o `lastError` mantido no `resolve`; a recusa `due_date_not_applicable` do `/retry` (l.456); e o `[RETRY-CANCEL-ONE]` da cópia em memória (l.459, a M-CC8). | Um teste em memória (`CORE_SAAS_PERSISTENCE=memory`) para cada regra. A M-CC8-memoria (C1), a S-RS9-memoria (C3) e as 4 mutações da C2-01 (tirar o filtro de organização de cada um dos 3 métodos e apagar o `lastError` no `resolve`) ficam VERMELHAS. A cópia Prisma não muda. |
| **C2-05** | Nenhum teste afirma o 403 das 7 rotas novas da plataforma. Tirar `requirePlatformPermission` do `GET /outbox` ou do `GET …/charges` deixa tudo verde. | Um teste que chama cada uma das 7 rotas com um ator de organização sem a permissão de plataforma, e uma vez sem ator, e espera 403 (ou 401 sem ator) sem dado. Tirar a guarda de cada rota, uma por vez, fica VERMELHO. |
| **C3-02** | O `/charge` não tem teste de `400 invalid_method` nem de `422 due_date_not_past`. | 2 testes. As 2 mutações da C3 ficam VERMELHAS. |
| **C3-03** | O `API_CONTRACTS.md` omite `400 tenant_id_required` (l.398, 399, 402 e 403) e `409 charge_intent_conflict` (`charge-request.service.ts:195` e `:257`). | O contrato passa a listar os códigos que as rotas lançam. Rode o censo de motivos (`b-san3-12a-reasons-census`) depois. |
| **C3-04 + C2-02** | O corpo do PR para na Emenda 2.3. A E1 §3.1 diz "RS1 e F2R ficam vermelhos" no ramo "troca", mas o F2R fica verde (só o RS1 e o RS4 pegam). | O corpo do PR traz a E2.4 (o T40, o arquivo de `frontend/**` e a M-T40-53). O diário registra a errata da E1 §3.1, sem mudar teste. |

**Junto do conserto:** absorver a `main` atual (`cd480ab6` ou mais nova) por UNIÃO, com o SHA explícito e o índice saído do gerador oficial. Isso estava previsto no briefing ("a absorção vem DEPOIS da junta"). Atenção ao conflito semântico que o #573 achou entre o #566 e a cobrança (`SubscriptionSkipReason`): meça o `npm run check` depois do merge e, se quebrar, PARE e devolva.

### B. Vira pendência com dono (não segura o bloco)
| Id | Pendência | Dono | Critério |
|---|---|---|---|
| **C2-03** (pré-existente) | `P-569-TEXTO-DRIVER-NA-RESPOSTA`: com `tenantId` malformado (`abc`), as 7 rotas respondem 400 com o texto cru do Prisma, e o `GET …/charges` traz até o caminho do servidor e linhas do código (§2.8). A causa é o ramo genérico do `sendRouteError`. | **#571 (B-SEC-LOG-SANITIZA)**, que fecha esse ramo com mensagem fixa | depois do #571 na `main`, um teste com `tenantId=abc` nas 7 rotas responde a mensagem fixa, sem caminho nem texto de driver |
| **C2-04** | `P-569-MOTIVO-NO-METADADO`: o texto livre do operador (`reason`, até 500 caracteres) vai inteiro para `audit_logs.metadata` nas 3 trilhas novas. **Conflito §A2 dentro da lei do bloco:** a abertura §4 diz "trilha só com ids, kind e código", e a §4.5 diz "o motivo vai para a trilha". O dev seguiu a §4.5. O precedente da casa (B-ASS-04, T-RT-11) põe o motivo na entidade, e não no metadado. **Leitura do orquestrador, declarada:** pela ordem das fontes (§A1), o §2.8 do `CLAUDE.md` vale acima do plano, e o motivo sai do metadado. Mas a fila não tem hoje coluna para guardá-lo, e criar uma exige `prisma/**`. Sem decisão de desenho, tirar o motivo apaga o porquê da ação. | o próximo bloco da cobrança que tocar a trilha (B-ASS-08c2), com a decisão de onde o motivo mora | o motivo fora de `audit_logs.metadata`, guardado onde a decisão disser, com teste do T-RT-11 |
| **C2-06** (pré-existente) | `P-PLATAFORMA-GUARDA-POR-ROTA`: não há guarda em bloco no roteador `/api/v1/platform`, e o T40 só conta rotas. Uma rota de leitura nova sem `requirePlatformPermission` compila e responde a qualquer um. | a varredura de segurança do fim (§C7 10(6)), ou o próximo bloco que tocar o inventário de rotas da plataforma | um teste exige que toda rota de `/api/v1/platform` carregue a guarda, e uma mutação que tira a guarda fica vermelha |

## O que vem depois
1. O conserto da leva A, mais a absorção da `main`, pelo `dev-08c1b-cl`.
2. A conferência, por outra casa: o verificador roda o comando de cada achado da leva A e confere o vermelho sob a mutação, além do CI inteiro nas 2 rodadas.
3. O merge, com as travas: head conferido, `gh pr ready`, `isDraft == false` e `--match-head-commit`.
4. A porteira.

Pela §C7 10(4), nenhuma cadeira se refaz, salvo se o conserto mudar regra de dinheiro, permissão ou isolamento fora do que o achado apontava.

## Adendo do registro (`reg-1611-cl`, 16/11)
As horas são de São Paulo; o merge e o head vêm de `gh pr view`, e a CI do merge, de `gh run list --commit`. O resto vem do diário do orquestrador, fora do repositório.
- **Conserto da leva A:** `dev-08c1b-cl`. A conferência do Argon deu CONFERIDO em `5bc3d22c`, e o orquestrador conferiu: a leva tocou só o `API_CONTRACTS.md` e 2 testes, nada em `src/`.
- **Merge:** squash `4acd14ad` (15/11 02:31), do head `9aa3388f`, depois da absorção do #574 (medida por `comm`); CI do merge `43681432471`.
- **Porteira:** `porteiro-569`, LIBERADO COM RESSALVA (15/11 02:57): árvores iguais (`c753646c`); 220 testes em memória, 328 `-db` e T40 = 70. **O item 60 NÃO fecha** (a "4.item60" da `D-DONO-1311-RECOMENDACOES`). A-1: a `FROZEN` é 79 na `main`, e não 76, como o corpo do PR diz.
