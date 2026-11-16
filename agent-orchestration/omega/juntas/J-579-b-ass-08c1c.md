# Ata da J-579: junta completa do PR #579 (B-ASS-08c1c, item 60: cobrança; DINHEIRO)

**Orquestrador:** Claude Opus 5.5, em 15/11 às 17:3x SP (hora no registro).
**Objeto:** `df0e2a55`.
**Quórum:** unanimidade de 3, NÃO alcançada (2 APROVA, 1 REPROVA por defeito grave).

## Terreno
O inspetor `insp-579-cl` deu **LIBERADO COM RESSALVA** (R1 a R4). As ressalvas entraram no ADENDO de 16:26, antes do disparo.

## Cadeiras e votos
| Cadeira | Identidade | Corpo · modelo | Voto | Graves | Não graves |
|---|---|---|---|---|---|
| C1 · a corrida, o registro e as travas | `j579-c1-corrida-cl` | `agente-dba-guardiao` · Claude Opus 5.5 | **APROVA** | 0 | A-C1-01, A-C1-02 |
| C2 · o fechamento, o reopen e o claim | `j579-c2-fechamento-cl` | `guardiao-fail-closed` · Claude Opus 5.5 | **REPROVA** | **C2-01** | C2-02 a C2-05 |
| C3 · a tabela, a visão e a regressão | `j579-c3-regressao-cl` | `validador-mestre` · Claude Opus 5.5 | **APROVA** | 0 | C3-A1 a C3-A4 |

- **Cruzamento:** nenhum, declarado no briefing; não havia crédito externo.
- **Quedas:** nenhuma.
- **Papéis (§C7.4-bis):** as cadeiras acharam. O orquestrador triou. A auditoria de topo (§C7 10(5)) planeja, porque há defeito grave. O dev conserta, sem ter achado. Um verificador que não consertou confere.

## O que as 3 mediram verde, por execução
- Todas as mutações da lei das frentes de cada cadeira morreram como escritas e foram restauradas. Na C2 foram 21/21.
- O fechamento e o refechamento sob concorrência (N = 9 a 10, com barreira) nunca geraram cobrança em dobro. Reopen contra o registro em voo deu 409 em 10/10.
- Os `-db` das frentes rodaram 3× cada, verdes, e o CI das 2 rodadas foi lido pelo resumo.

## Triagem (§C7 10(3)), pelo orquestrador

### Grave: conserta agora
| Id | O defeito | Por que é grave |
|---|---|---|
| **C2-01** | A marcação imediata (`eagerPlan`) só cancela a cobrança `pending`; qualquer outro estado não terminal passa calado. Com a linha enviada e a cobrança em `needs_review` (a adotada com status `unknown`), a baixa manual que quita dá 201 e a conta vira `paid`, e o `cancel()` dá 200 e a conta vira `cancelled`, com 0 cancelamento enfileirado, 0 DELETE e 0 conferência. O mesmo estado é tratado como cobrança VIVA pelo reopen (422 `statement_charge_pending`) e pelo refechamento (422 `charge_already_exists`). | Quebra "nunca cobrança viva sobre conta paga". Hoje só é alcançável com o canal ligado, e o canal está desligado. Mas o bloco existe para ligá-lo. |

**A causa provável, medida pela própria C2 (C2-03):** a regra "qual cobrança está viva" vive em 7 literais, sem nada que force a concordância entre eles. Um membro novo em `CHARGE_STATUSES` ou `OUTBOX_STATUSES` deixa o `tsc` com 0 erro e a suíte verde, e na divergência vence o caminho permissivo. A auditoria de topo decide se o conserto do C2-01 inclui a classificação única e exaustiva.

### Não graves e simples: conserto na mesma leva
| Id | O defeito | O aceite |
|---|---|---|
| **A-C1-01** | O filtro de status do `[CANCEL-CORE-ONE]` (`charge-request.service.ts:229`) guarda dinheiro, mas nenhum teste o prende. Sem ele, um `charge_cancel` FAILED antigo faz a baixa que quita deixar de enfileirar o cancelamento novo, e a cobrança fica viva sobre a conta paga (sonda PZ5 da C1). | Um teste-dono no PR, e a mutação `MP-C1-ONE-STATUS` morre. |
| **A-C1-02** | O dublê do registro (`InMemoryOutboxRepository.recordChargeOutcome`) não tem o `[REG-PAID]`: diverge do Prisma. | O dublê espelha o Prisma, e um teste em memória prende isso. |
| **C2-02** | A `[REFECHA-LIVE]` com o provedor desligado e o 2º termo do `reopenLiveCheck` não têm teste que os veja falhar. | Um teste para cada um, com as 2 mutações da C2 mortas. |
| **C2-04** | No `[CLAIM-PARTIAL]`, um `paidCents` ausente conta como "sem pagamento", o lado que cobra. O caminho Prisma está guardado (CL8); o de memória, não. | O ausente falha fechado, e a mutação da C2 morre. |
| **C3-A1** | O `API_CONTRACTS.md` promete `409 statement_busy` no fechamento, e a rota nunca o dá. | O contrato diz o que a rota faz, ou a rota passa a dar o que o contrato diz. A auditoria escolhe. |
| **C3-A2** | Só o estorno TOTAL tem teste no `[CHG-SYNC-REV]`; o parcial e o chargeback não. | Um teste para cada um, e a regressão "parcial gravado como total" morre. |
| **C3-A3** | A metade do dublê das M-VIEW e M-VIEW2 não tem teste (CV3 e CV4 só rodam no Prisma). | CV3 e CV4 também em memória, e as 2 metades morrem. |

### Viram pendência (próximo PR de registro)
- **C2-05 (pré-existente, #507/#571):** 10 fechamentos concorrentes expiram (P2028) e a rota responde `400 invalid_request`. É fail-closed para o dinheiro; o defeito é a falha de infraestrutura sair como pedido inválido. **`P-BILLING-P2028-COMO-400`**, dono: o 08c2.
- **C3-A4 (pré-existente):** o A17-bis não alcança `subscription-billing`; o "8/8" é verde por vácuo. **`P-A17BIS-NAO-ALCANCA-BILLING`**, dono: o PR de registro.
- **A informação nova do C2-01:** a pendência da cobrança desconhecida (`P-ASS08C-COBRANCA-DESCONHECIDA-SEM-SAIDA`, dona 08c3) não cita a baixa nem o cancel. A auditoria diz se o conserto a fecha em parte ou se o texto dela muda.

## O que vem depois
1. **A auditoria de topo** (§C7 10(5)), com identidade nova, em Claude Opus 5.5 topo declarado (o Fable está suspenso). Ela audita o C2-01 (defeito real ou artefato?), decide o desenho (a classificação única de "cobrança viva") e escreve o plano do conserto, cobrindo o grave e a leva simples.
2. **A crítica do plano**, por execução (bloco de invariante).
3. **O conserto (um só):** o `dev-08c1c-cl`, que não achou.
4. **A conferência:** um verificador que não consertou roda o comando de cada achado.
5. **Refazer cadeira (§C7 10(4)):** só a C2, e só se a conferência mostrar o grave ainda lá, ou se o conserto mudar uma regra de dinheiro fora do que o achado aponta. A auditoria declara se a classificação única muda regra de dinheiro fora do achado.

## Decisão do orquestrador sobre a auditoria de topo (15/11, 18:3x SP)
O plano é `planos/plano-B-ASS-08c1c-conserto-J579.md`, do `topo-579-op` (Claude Opus 5.5, topo declarado).

- **O C2-01 foi reclassificado, por decisão declarada (§A6):** "não grave no objeto; defeito latente de desenho; conserto OBRIGATÓRIO nesta leva".
  - A auditoria mediu que nenhum caminho alcançável grava `needs_review`, `failed` ou `none` na tabela: a adoção filtra o `unknown`, e o estado da sonda só existe por `UPDATE` direto.
  - A premissa "a cobrança adotada com `unknown`" veio do plano e foi herdada sem medir.
  - A causa, porém, é real (a C2-03). Ela vira alcançável no 08c1u e no 08c3, os próximos da fila.
- **O desenho aceito é o (b):** uma tabela-verdade ÚNICA e exaustiva (`Record<ChargeStatus, …>` com `satisfies`), mais a tabela das linhas `charge_create`. O SQL interpola a lista gerada dela. Ataca a causa (produto premium, sem remendo).
- **A C2 se refaz, só ela, com o mandato estreito do §3.5 do plano.** O conserto muda a regra de dinheiro em 3 caminhos fora do que o achado aponta (`[REG-REREAD]`, o alvo do `charge/cancel` e o `[CANCEL-TX]`), que é o 1º caso do §C7 10(4). A C1 e a C3 não se refazem: a conferência roda os comandos dos achados delas.
- **A sequência:** a crítica do plano por execução, o conserto pelo `dev-08c1c-cl`, a conferência, a C2 refeita, o merge e a porteira.

## Desfecho (16/11, pelo orquestrador; horas medidas por `date`)
- **O objeto final:** o head `98c034a92f7d332f8b1708364e32d9bc61b3bc68`, que traz o conserto da J-579 (a tabela-verdade única de "cobrança viva", pelo plano do conserto e a Emenda 1). O dev do conserto foi o `dev-08c1c-cl`, que NÃO achou o C2-01.
- **A crítica do conserto:** `crit-579-conserto-cl`, por execução, antes do dev.
- **A C2 refeita (§C7 10(4), 1º caso):** `j579-c2r-fechamento-cl`, identidade nova, **APROVA** sobre o `98c034a9`, com 1 não grave (C2R-01). O voto está em `votos/j579-c2r-fechamento-cl-voto.json`.
- **A C1 e a C3:** não se refizeram. Os votos APROVA do ciclo 1 carregam pelo §C7 item 9, e a conferência rodou os comandos dos achados delas.
- **A conferência** (`conf-579-cl`, quem não consertou): **CONFERIDO COM AJUSTES**, com 0 grave e 3 não graves:
  - CONF-01: o merge traz 9 linhas do ramo no `pendencias.md`;
  - CONF-02: o comando literal da PZ7 não discrimina o antes do depois;
  - CONF-03: 6 testes de usuários falham só no `npm test` inteiro local, e passam isolados e na CI.

  Os 3 viram pendência com dono, pelo PR de registro de 16/11.
- **Resultado: J-579 APROVADA por unanimidade (3/3)** — C1 e C3 carregados, C2 refeita — sobre o `98c034a9`.
- **O merge:** squash `60b4b122` às 11:37 de 16/11, com as travas: head conferido, `ready`, `isDraft=false`, `--match-head-commit`, `MERGED`. O CI de push do squash, run `43887734792`, deu verde: backend 6274/0, backend-postgres 659/659, frontend 1978/1978, flutter 1507, e2e 14.
- **A porteira** (`porteiro-579-cl`): **LIBERADO COM RESSALVA** para o `B-ASS-08c2`. O item 60 segue aberto; faltam o 08c2 (nota fiscal) e o 08c3 (ligar o canal). As ressalvas de registro vão no PR de registro de 16/11, e as de limpeza (o ramo remoto e o worktree do dev) ficam com o orquestrador.

## Adendo do registro (`reg-1611-cl`, 16/11)
Copiada por último, depois do "Desfecho" do orquestrador (pedido de 16/11 12:0x). Onde cada ressalva de registro do `porteiro-579-cl` ficou, neste mesmo PR de registro:
- CONF-01 → `P-579-MERGE-EDITOU-PENDENCIA`, e a `D-ORQ-579-PEND-BAIXA` em `controle/decisoes.md` (junto da `D-ORQ-579-C2-01-LATENTE` e da `D-ORQ-579-REFAZ-C2`); a edição do ramo dentro do merge `98c034a9` (9 linhas da `P-ASS08C-COBRANCA-DESCONHECIDA-SEM-SAIDA`) fica nomeada aqui;
- CONF-02 → `P-579-ACEITE-A-C1-02-E-A-RACE7`; CONF-03 → `P-USERS-ACESSO-SEG-DB-BASE-COMPARTILHADA`;
- C2-05 → `P-BILLING-P2028-COMO-400`; C3-A4 → `P-A17BIS-NAO-ALCANCA-BILLING`; C2R-01 → `P-579-LINERULE-NAO-EXAUSTIVA`;
- no `PLANO_SAN3.md`, a linha do item 60 ganha a nota do #579 (o item NÃO fecha).
