# J-586: ata da junta completa do PR #586 (B-APROVACOES-DURAVEIS, item 67: as aprovações gravadas no banco, isoladas por organização)

**Orquestrador:** Claude Opus 5.5, em 17/11. A ata foi escrita em 18/11 pelo PR de registro.
**Objeto:** `27115704` (PR #586; head `7c9e8f88` depois do conserto).
**Fluxo:** completo (§C7 10, nível 1), com unanimidade de 3. Dinheiro, perda de dado, permissão e banco.

## Terreno

O inspetor `insp-586-cl` (Claude) deu **LIBERADO COM RESSALVA** (8 ressalvas, cada uma com a cadeira que a cumpre; nenhuma bloqueia). O guard da migração (`node scripts/migration-transaction-guard.mjs`) deu 0 violação.

## Cadeiras e votos (3 de 3 APROVA, 0 grave)

| Cadeira | Identidade | Modelo | Voto | Achados |
|---|---|---|---|---|
| C1 · guardião de banco | `j586-c1-banco-dp` | DeepSeek Pro | **APROVA** | 0 |
| C2 · transação e concorrência | `j586-c2-transacao-cl` | Claude Opus 5.5 | **APROVA** | L2-01, C2-01, C2-02 |
| C3 · permissão, segregação de função e contrato | `j586-c3-permissao-cl` | Claude Opus 5.5 | **APROVA** | C3-01, C3-02 |

- **Cruzamento:** a C1 é a outra casa (DeepSeek Pro, dev é Claude); a C2 e a C3 são Claude, com "sem cruzamento" declarado.
- **Quedas:** nenhuma.

## Achados não graves (na leva do conserto, sem reprovar)

| Id | O defeito |
|---|---|
| **L2-01** | O caminho de ERRO da fila de Aprovações dentro da unidade do pedido do técnico, em banco, não tem teste dono: a mutação "a fila cai para outra conexão só no erro" sobrevive. O head está correto (a sonda dá 0/0/0 e 503 `approval_unavailable`). |
| **C2-01** | `InMemoryApprovalRepository.decide` não é CAS sob concorrência: há um `await findById` entre a leitura e a escrita, e 2 decisões simultâneas passam as duas. Pré-existente na classe; a produção recusa o modo memória. |
| **C2-02** | Nota: 2 conclusões simultâneas da mesma OS gravam 2 eventos `work_order_completed`; a aprovação continua única. Pré-existente. |
| **C3-01** | O filtro de organização no repositório em banco (`findById` e o `where` do `decide`) não tem teste que morra sem ele: a mutação própria MC3b sobrevive porque o T5 roda sob RLS e o T7 não testa outra organização. |
| **C3-02** | A `E-67-CENSO` não é emenda em arquivo nem está em `decisoes.md`; não cumpre o §C2 (D-EMENDA-ANTES-DO-CODIGO) na letra. |

## Triagem (§C7 10(3))

- **Entram no conserto (só testes):** o L2-01 (o T3(j) do caminho de erro) e o C3-01 (o teste do filtro de organização sem o RLS).
- **Viram pendência:** o C2-01 → `P-APROV-MEMORIA-SEM-CAS` (BAIXA, anterior ao bloco) e o C2-02 → `P-OS-CONCLUSAO-EVENTO-DUPLO` (MÉDIA, anterior ao bloco).
- **Vai ao registro:** a `E-67-CENSO`.

## O conserto e a conferência

- **Dev:** `dev-67-c-cl` (Claude), head `0cf0b2ab`, só testes (o T3(j) e o teste do filtro sem o RLS); CI verde (backend-postgres 731/731).
- **Conferência:** `df-conf-586`, **CONFERIDO**; o ramo foi atualizado para `7c9e8f88`, com 18/18 checks.

## Desfecho

- **Merge:** squash `89cf79fe` (17/11 18:40).
- **Porteiro:** `porteiro-586-cl` (Claude) deu **LIBERADO COM RESSALVA · ITEM 67: FECHA**. Ressalvas para o PR de registro: a ata J-586 (R1); marcar a linha 67 do PLANO_SAN3 (R2); as pendências `P-APROV-MEMORIA-SEM-CAS` e `P-OS-CONCLUSAO-EVENTO-DUPLO` com dono e PR-alvo, e a `E-67-CENSO` em `decisoes.md` (R3); os 2 rastreados apagados na árvore principal (R4, confirmado que existem na `origin/main`).