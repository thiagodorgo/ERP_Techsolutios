# Revisão Crítica B-SAN3-12 (Rodada 1)

## Achados

### Achado 1
- **ID:** CRIT-12-01
- **Gravidade:** Nota (Positivo)
- **Escopo:** Backend do 12a - Portas de liquidação e corrida entre troca de vinculação e compensação.
- **Evidência executada:** Inspecionei o código no ramo `origin/fix/cheque-x-baixa` (`cheque.service.ts` métodos `clear` e `moveMoneyInUnit`). A troca de vinculação (`unlink-title`) usa CAS `WHERE status IN ('registered','deposited') AND title_id = <lido>`. A compensação (`clear`) invoca a transição de estado e aplica pagamento usando `reserved.titleId`, retornado pelo banco após o UPDATE do cheque. Analisei também outras rotas (avulso descarta `title_id`; `changeStatus` impede transição para pago manual).
- **Motivo:** O plano cobre as portas corretamente. Não há condição de corrida entre a compensação e a desvinculação. Ambas operam sob predicados seguros (CAS) na mesma tabela (`cheques`). Se a desvinculação ocorre primeiro, a compensação recebe `reserved.titleId = null` e não liquida o título; se a compensação ocorre primeiro, o status muda para `cleared` e a desvinculação falha no banco por 0 linhas atualizadas. O backend de dinheiro de 12a é seguro.

### Achado 2
- **ID:** CRIT-12-02
- **Gravidade:** Ajuste
- **Escopo:** Permissão e trava de concorrência ao desfazer conciliação (§4.4 e §4.6).
- **Evidência executada:** Leitura das regras do plano. §4.4 introduz a política fail-closed e atualiza `RBAC_MATRIX.md`. §4.6 introduz o CAS opcional: `expected_updated_at` sendo opcional e mantendo o comportamento de hoje (ausente -> 200).
- **Motivo:** A delegação da permissão ("concedível ao financeiro") é fail-closed (ausente=false) e está bem modelada e reconciliada. Contudo, o plano deixa a trava de concorrência (CAS) **opcional** no backend. Se dois clientes ou processos (ex: uma aba desfazendo e outra conciliando, inclusive via chamadas de API externas legadas) concorrerem omitindo o campo `expected_updated_at`, a sobrescrita ocorrerá cegamente, perpetuando o erro de concorrência. Para resolver no nível de servidor, o CAS precisaria ser obrigatório ou aplicar-se CAS de estado lógico (`WHERE reconciled = X`).

### Achado 3
- **ID:** CRIT-12-03
- **Gravidade:** Bloqueia
- **Escopo:** Critério de Aceite A1 e sua Mutação de falha (§8.1).
- **Evidência executada:** O critério A1 estipula que a mutação "remover a chamada a findPendingByTitle no fast-fail" deixaria o teste planejado vermelho, validando a ausência do 422. A seção §4.2 do plano decreta o duplo check: no fast-fail (fora da tx) e re-check (dentro da tx).
- **Motivo:** A mutação falha em provar a quebra do teste. Se apenas o fast-fail for removido, o fluxo seguirá até o `uow.run`, executará o re-check e lançará exatamente a mesma resposta HTTP (422 `title_has_pending_cheque`). Logo, um teste de integração que apenas verifica HTTP/Response continuará VERDE, invalidando a mutação. Para o critério estar correto, a mutação sugerida deve ser a remoção também do re-check, ou o teste deve prever verificações internas (espiando se a UoW abriu transação).

### Achado 4
- **ID:** CRIT-12-04
- **Gravidade:** Nota (Positivo)
- **Escopo:** Divisão em 3 PRs e segurança de estado na `main` (§3).
- **Evidência executada:** Revisão da divisão (12a, 12b, 12c) e medição M no plano (§0.3): "Nenhuma chamada a /pay, /financial-accounts, /financial-entries, /reconcile em frontend/src".
- **Motivo:** Não há estado intermediário inseguro ou quebra ao enviar o backend (12a) antes da tela (12b/12c). A interface (frontend) que reside na `main` hoje nem sequer consome as referidas rotas. Dessa forma, o backend é atualizado e endurece a API, aguardando com segurança o consumo gradual pelos PRs visuais.

VOLTA AO PLANO