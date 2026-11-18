# J-588: ata da junta completa do PR #588 (B-APP-SESSAO-RENOVA, item 68: a sessão do app se renova sozinha, e o servidor revoga a família no reuso)

**Orquestrador:** Claude Opus 5.5, em 17/11. A ata foi escrita em 18/11 pelo PR de registro.
**Objeto:** `a50c19cc` (o merge de `02974241` com a `main` `00e46347`, pelo ADENDO 0).
**Fluxo:** completo (§C7 10, nível 1), com unanimidade de 3. Autenticação, segurança de sessão, perda de dado e permissão.

## Terreno

O inspetor `insp-588-cl` (Claude) deu **LIBERADO COM RESSALVA** (R1 a R7; nenhuma bloqueante; a R4 condiciona o voto da C2). A R7 diz que as duas pré-revisões (`dp-prerev-588` sobre `d2f4b2b0` e `dp-prerev-588-l2` sobre `02974241`) não valem como fato no objeto (P3): cada cadeira re-mediu.

## Cadeiras e votos (3 de 3 APROVA)

| Cadeira | Identidade | Modelo | Voto | Achados |
|---|---|---|---|---|
| C1 · servidor | `j588-c1-servidor-cl` | Claude Opus 5.5 | **APROVA** | J588-C1-01 |
| C2 · app e sessão | `j588-c2-app-dp` | DeepSeek Pro | **APROVA** | J588-C2-A1 |
| C3 · filas, clientes e emulador | `j588-c3-fila-cl` | Claude Opus 5.5 | **APROVA** | J588-C3-A1, J588-C3-A2, J588-C3-A3 |

- **Cruzamento:** a C2 é a outra casa (DeepSeek Pro, dev é Claude); a C1 e a C3 são Claude, com "sem cruzamento" declarado (as duas pré-revisões já foram do DeepSeek, e a C3 tem prova visual no emulador).
- **Quedas:** nenhuma.

## Achados não graves (na leva do conserto, sem reprovar)

| Id | O defeito |
|---|---|
| **J588-C1-01** | `[SV5]` e `[SV5b]` ("10 em voo") correm por `Promise.all`, sem barreira: passam com a MR4 (troca sem condição) porque o sucessor determinístico faz duas trocas no mesmo segundo gravarem o mesmo token. A propriedade está provada por barreira no SV5c/SV16/SV21 e na sonda própria (J1/J2). |
| **J588-C2-A1** | Flakiness sob contenda de máquina: `[T3j]` deu 1 vermelho na linha de base e as re-execuções verdes de M2/M5 caíram com restauro; nenhum dos três é reprodutível isolado e o CI do objeto está verde. Ambiente, sem defeito de produto. |
| **J588-C3-A1** | Lacuna de teste: nada prende que o "Sair" preserva a ação ainda não enviada; a mutação própria sobrevive à suíte Flutter inteira. O produto do objeto está certo (sonda própria verde). |
| **J588-C3-A2** | §5.8 passo 6: com o app aberto, a volta da rede não esvazia a fila do "Sair"; o token de renovação segue válido até o app ser reaberto. Divergência registrada pelo dev e não decidida. |
| **J588-C3-A3** | Depois da sincronização, a Início segue "2 pendentes a sincronizar" e Finanças mostra "Sync pendente", mesmo com 0 pendentes e 200 no servidor. Causa não medida; pré-existente. |

## Triagem (§C7 10(3))

- **Entram no conserto (simples):** o J588-C3-A1 (o `[T5d]` com a fila persistente) e o J588-C1-01 (a barreira pela rota no `[SV5]`/`[SV5b]`).
- **Viram pendência:** o J588-C3-A2 → `P-APP-SAIR-OFFLINE-REVOGA-SO-AO-REABRIR` (MÉDIA); o J588-C3-A3 → `P-APP-INICIO-PENDENTES-FANTASMA` (BAIXA, anterior ao bloco); o J588-C2-A1 → `P-APP-TESTE-OSCILA-MAQUINA-CARREGADA` (BAIXA, ambiente).

## O conserto e a conferência

- **Dev:** `dev-68-c-cl` (Claude), head `67792437`, só testes: o `[T5d]` e as 2 formas da mutação do "Sair"; a barreira no `[SV5]`/`[SV5b]` (a MR4 derruba 6).
- **Conferência:** `df-conf-588` (DeepSeek Flash, quem não consertou), **CONFERIDO** (3 de 3). O ramo foi atualizado com a `main` (o #594 também mexe no app), head `f4259229`, e o CI ficou 18/18.

## Desfecho

- **Merge:** squash `054d5939` (17/11 15:26).
- **Porteiro:** `porteiro-588-cl` (Claude) deu **LIBERADO COM RESSALVA · ITEM 68: FECHA**. Ressalvas para o PR de registro: dar dono, PR-alvo e `bloqueia` às 3 pendências da triagem; apagar o ramo e o worktree do bloco; o ensaio 44-B3 só se dá por cumprido com o par da Q-E11-1 medido (`P-AUTH-LOGIN-SEM-TENANT-SOB-PAPEL-RUNTIME`); o B-GUI-D1 (#597) absorve a `054d5939` e roda a suíte Flutter na árvore fundida antes da junta.