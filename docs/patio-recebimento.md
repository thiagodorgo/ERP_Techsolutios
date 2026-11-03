# Recebimento on-line da taxa de pátio

Documento vivo do pacote `B-PATIO-RECEBIMENTO` (plano v3 e emenda 1, fora do repositório, em `erp-pausa-2026-10-03/planos/`). Cada bloco
acrescenta a sua seção.

## B-PATIO-REC-01 — domínio da intenção de pagamento, sem rede

**O que existe:** a intenção de pagamento on-line (`impound_payment_intents`), a referência global que a liga ao aviso do provedor e à
vigilância (`impound_payment_refs`), a máquina de estados como tabela de dados, as regras de criação e as rotas de leitura e de criação.
**O que não existe ainda:** nenhuma chamada ao provedor, nenhuma conta de pagamento, nenhum job. Por padrão a rota de criação recusa:
o portão do canal está desligado (`422 channel_disabled`) e a porta de conexão não tem modo (`422 payment_mode_unset`). O REC-04 traz as
contas (do grupo e próprias) e o REC-02a, o canal.

### Dinheiro

- No banco, colunas `amount`, `paid_amount`, `applied_amount`, `held_amount`, `refunded_amount` em `DECIMAL(12,2)`, **em reais** (como
  `process_charges.total_amount`). No TypeScript, **centavos inteiros** (`amountCents`, `paidCents`…). A conversão é só no repositório
  Prisma, por `moneyToCents`/`centsToMoney` (`src/modules/charging/charge.validators.ts`).
- Identidade conferida pelo banco: `paid_amount = applied_amount + held_amount + refunded_amount`, todos ≥ 0; `held_amount > 0 ⇔
  held_reason`; dinheiro por estado (`pending`, `cancel_requested`, `cancelled`, `expired` sem aplicado nem retido; `funds_held` e
  `disputed` só com retido; `reversed` só com devolvido; `settled` com aplicado).
- O valor cobrado é o devido **capado ao teto** (`ChargeService.getSettleableDueCents`): diária acima do teto não reconciliada fica fora,
  e a criação recusa com `422 reconciliation_pending` até a baixa manual reconciliar (um único valor público por débito).

### Conta da cobrança

Cada intenção grava **exatamente uma** conta: a conexão própria da organização (`payment_connection_id`) **ou** a conexão do grupo de
que ela é membro (`payment_group_id` + `payment_group_connection_id`). A conta da plataforma não é representável, nem no tipo
(`IntentAccount`) nem no banco (CHECKs `…_one_connection_chk` e `…_group_pair_chk`). `account_scope` é coluna gerada. As FKs para as
tabelas de conexão nascem no REC-04 (M-REC-14).

### Link aberto e irmãs

- No máximo um **link aberto** por processo: UNIQUE parcial `impound_payment_intents_live_link_key` só em `pending` e `cancel_requested`.
  Nenhuma transição de dinheiro entra nesses estados, e por isso a UNIQUE nunca derruba o destino do dinheiro de uma intenção anterior.
- A criação recusa, sob a trava do processo, se houver irmã viva: link aberto → `409 payment_already_pending`; dinheiro retido ou em
  disputa → `409 held_funds_pending`.

### Rotas (`/api/v1`)

| rota | permissão | resposta |
|---|---|---|
| `POST /impound-processes/:processId/online-payment` | `charging:online_payment` | `202 { intent }`; `422` canal, conta, liberação não iniciada, reconciliação pendente, nada devido, meios; `409` irmã viva; `404` processo de outra organização |
| `GET /impound-processes/:processId/online-payment` | `impound:read` | `{ data: { intent } }` (a viva, ou `null`) |
| `GET /impound-processes/:processId/online-payments` | `impound:read` | `{ data: [intent…] }` |

O DTO é allowlist: documento do pagador mascarado, `accountScope ∈ {group, organization}`, sem `tenantId`, id externo, ids de conexão ou
de grupo. A organização vem só do ator autenticado; toda consulta filtra `tenant_id` explicitamente além da RLS, e toda leitura passa por
`assertRowsBelongToTenant`.

### Migrações (autorizadas pelo dono, "Q12 autorizo", 02/11)

- `20260890000000_impound_payment_intents` (M-REC-1), `20260891000000_impound_payment_refs` (M-REC-2),
  `20260892000000_grant_charging_online_payment` (M-REC-7a). Todas aditivas, com `BEGIN;`/`COMMIT;`. O `down` existe só no drill
  (`tests/rec-01-migration-drill-db.test.ts`).
