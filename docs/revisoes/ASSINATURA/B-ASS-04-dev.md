# B-ASS-04 — demonstrativo mensal — relatório do dev

Plano: `B-ASSINATURA` §4.4 (fora do repositório, `erp-pausa-2026-10-03/planos/B-ASSINATURA-plano.md`).

**Papéis (declarados)**
- **Dev:** dividido pelo dono entre dois "devs de plantão" (06/11 ~08:00 SP: *"vc e o deepseek sao os desenvolvedores de plantão hoje"*).
  - `dev-ass04-opus` (Claude Opus 5.5, esforço médio) faz o motor e as regras de dinheiro, de F0 a F3.
  - O DeepSeek faz o banco, na F4, num ramo próprio.
- **Revisão:** do DeepSeek, que é de outro modelo. Um revisor sênior em esforço alto, mais um **segundo revisor só do cálculo** (dono: *"pode fazer o segundo revisor só para o cálculo"*). Depois vêm a conferência e o porteiro.

## F0 — comando e terreno

- **Worktree:** `C:/Users/thiag/w-ass04`, no ramo `feat/b-ass-04-demonstrativo`, a partir da `origin/main` `3470db1e` (com o B-ASS-03).
- **Migrações:** a M3 (5 tabelas) e a M3b (permissões) estão cobertas pela fala do dono de 31/10 ~22:15. A M3b é uma das 3 migrações de dados da P1.
- **Lições do B-ASS-02/03** (Emendas 2–4 ao §4.2 e Emenda 1 ao §4.3): os guards de superfície (censo o6r07c, ratchet san3-05 e as contagens fixas de tabelas e endpoints) são regenerados pelo gerador, com o diff só nas chaves novas.

## F1 — motor puro do demonstrativo (`statements/statement.engine.ts`) + `billing.constants.ts`

- **Dinheiro em centavos inteiros.** O espaço fica em milésimos de GB, também inteiros. O "half-up" é feito por divisão inteira (`halfUpDiv`). Bytes viram milésimos de GB com teto a 0,001 (`bytesToMilliGbCeil`, em BigInt).
- **Pro-rata** diário por segmento: `prorate`. **Total**: `computeStatement`. **Recálculo** pelo snapshot: `recompute`. Também estão no motor `activeDayRange` (janela `[validFrom, validTo)` em datas SP), `daysInPeriod` e `countDistinctVehiclesInMonth` (G15).
- **Teste** `tests/ass-04-statement-engine.test.ts`: T-ST-1..8 e T-ST-37..41 = **13/13**.
  - (b) 12 usuários contra 10 incluídos dá R$ 30,00.
  - (c) 10,2345 GB dá 0,235 GB e R$ 0,59. A borda 2,5 centavos → 3 separa half-up de half-even.
  - (d) dá R$ 59,70.
  - (g) 50 casos gerados com `recompute = total`.
  - (h) guard de texto: o motor não usa `toFixed`, `Math.round`, `parseFloat`, `floor` nem `ceil`.
  - Pro-rata: 17 dias dão R$ 170,00. Troca Starter → Professional no dia 11: R$ 100 + R$ 420. A franquia é a do último dia. Veículos X/Y dão 2.
- **Mutações** (restauradas pela cópia, com md5 igual):

  | Mutação | Resultado |
  |---|---|
  | half-even no `halfUpDiv` | 1 fail (T-ST-3) |
  | esquecer o add-on | 1 fail (T-ST-4) |
  | contar só o primeiro vínculo, no lugar dos distintos | 1 fail (T-ST-41) |

## F2/F3 — regras de estado, "em dia" e créditos (serviço + dublê) — `dev-ass04-opus`

- **Arquivos**:
  - `statement.types.ts`: estados, cobrança, nota, pagamentos, créditos e auditoria;
  - `statement.repository.ts`: a porta `transaction`/`lockById`/`insertIfAbsentAndLock` e um dublê que serializa por organização, como o `FOR UPDATE`;
  - `statement.service.ts`.
- **O serviço** cobre:
  - `close`, com relógio injetado e datas SP pelo `business-time`;
  - `reopen`, `recordManualPayment`, `reverseManualPayment`, `cancel` e `adjust`;
  - `recordProviderPayment` (G7: `applied = min(valor, saldo)`, o excedente vira crédito);
  - `applyCredit`, `writeOffCredit` e `upToDateStatus`.
- **Teste** `tests/ass-04-statement-service.test.ts` = **20/20**, cobrindo T-ST-9..19, 21..28, 42..58 em blocos. Junto com o motor, **33/33**.
- **Mutações do plano**, todas vermelhas e restauradas pela cópia com md5 igual:

  | Mutação | Teste que pegou |
  |---|---|
  | UTC em vez de SP | T-ST-10 |
  | baixar em `open` | T-ST-14 |
  | `/reverse` em provedor | T-ST-42 |
  | grace `<`→`<=` | matriz "em dia" |
  | job fecha `reopened` | T-ST-45 |
  | ajuste sem piso | T-ST-51 |
  | descartar o excedente | T-ST-53/54/55, 3 fail |

- **Declarado:** o `refund` do crédito enfileira na outbox do B-ASS-08 e fica fora deste bloco. Aqui só existem `apply` e `write-off`. Os estados da cobrança e da nota (`charge_status`, `invoice_status`) só mudam pelo canal (B-ASS-06..08). Nos testes, eles são forçados por `setChannelState` do dublê.

## Permissões (parte de F7/F11) + M3b — `dev-ass04-opus`

- **Catálogo** (`catalog.ts`, `platform-permissions.ts`):
  - `+platform:billing:settle`;
  - `billing:read` para manager, finance, auditor e support, conforme `RBAC_MATRIX.md:50`. O `tenant_admin` já tinha, porque recebe todo o catálogo que não é de plataforma.
- **M3b** `20260897000000_ass04_billing_permissions`:
  - aditiva, idempotente, com BEGIN/COMMIT e rollback no rodapé;
  - concede `settle` só ao super_admin e `billing:read` só aos 5 papéis.
- **Drill** `tests/ass-04-billing-permissions-migration-drill-db.test.ts`, do molde B-SAN3-12a. Faz deploy real em base própria e confere:
  - a concessão exata por papel;
  - que operator, inventory e field_technician ficam sem;
  - a idempotência;
  - o rollback do rodapé e o re-apply;
  - a paridade depois do `provision-rbac`.
- **Guards:**
  - `core-saas` (+1 chave literal);
  - snapshot `role-catalog-contract`, regenerado do catálogo com o diff cirúrgico de +6 linhas: 4× `billing:read` e 2× `platform:billing:settle`, nenhuma removida;
  - `permission-catalog-migration-parity`: `billing:read` saiu da linha de base `PERMISSOES_HERDADAS_DO_SEED`, porque a dívida foi paga.
- **Pendente na F9:** a linha Billing do `san3-04a` deixa de ser `skip`, e `billing:read` sai das órfãs, quando a rota do cliente (`GET /billing/subscription`) existir. Até lá o guard a vê, corretamente, como órfã.
- **Bateria:** guards, drill, motor e serviço = **102/102**. `migration-transaction-guard`: 0 violações. `check`: 0 erros.

## Montador das entradas do fechamento (`statements/statement.inputs.ts`) — `dev-ass04-opus`

- **`buildStatementInputs(period, dados, {pinnedPlanVersionId})`** é PURO. O repositório da F5 só carrega os dados. A função:
  - avalia cada dia no início do dia em SP, com janelas `[validFrom, validTo)` (`resolveVersionAt`);
  - monta segmentos por assinatura, versão e preço efetivo;
  - pega franquia e unitários do **último dia**;
  - pega o add-on de rastreamento vigente no último dia;
  - calcula o maior de cada medição do mês e os gaps declarados;
  - conta veículos distintos no mês;
  - devolve `skip` com o motivo (`no_subscription`, `plan_without_price` ou `platform_organization`).
- **Teste** `tests/ass-04-statement-inputs.test.ts` (T-IN-1..7) = **7/7**.
- **Mutações:**

  | Mutação | Teste que pegou |
  |---|---|
  | termos do 1º dia | T-IN-2 |
  | ignorar a sobrescrita de preço | T-IN-3 |
  | refechar sem a versão gravada | T-IN-4 |

  Cada uma deu 1 fail. Todas foram restauradas, com md5 igual.

## F4 — esquema e M3 (banco) — dev DeepSeek (ramo `feat/b-ass-04-db`, head `bdce9866`)

- `prisma/schema.prisma`: 4 modelos (`SubscriptionStatement`, `SubscriptionStatementPayment`, `SubscriptionCredit`, `TenantBillingProfile`).
- `prisma/migrations/20260898000000_ass04_subscription_statements/migration.sql`: 4 tabelas, CHECKs de listas fechadas e de valor (`total_amount >= 0`, `amount > 0`), RLS ENABLE + FORCE com política por GUC, `BEGIN`/`COMMIT` e rollback no rodapé.
- `tests/ass-04-statements-migration-drill-db.test.ts`: up, down, atomicidade e RLS sob papel NOBYPASSRLS.
- Guards de contagem: tabelas FORCE 116 → 120 e DML de runtime 126 → 130.
- Juntado em `feat/b-ass-04-demonstrativo` por merge, sem conflito.

## F5 — repositório Prisma (`statements/statement.prisma-runtime.ts`) — `dev-ass04-opus`

- `PrismaStatementRepository`: toda operação sob `withTenantRls`. `insertIfAbsentAndLock` = `createMany … skipDuplicates` (ON CONFLICT DO NOTHING) + `SELECT … FOR UPDATE`; `lockById`, `lockPayment` e `lockCredit` = `SELECT … FOR UPDATE` filtrado também por `tenant_id`. Id que não é UUID responde "não existe" sem ir ao banco (o cast daria 22P02 e viraria 500).
- Dinheiro: `centsToDecimal` e `decimalToCents` convertem por texto, sem float; espaço em milésimos ↔ `Decimal(12,3)` pelo mesmo caminho. O cálculo é reconstruído do `snapshot.latest` (invariante §3.3), e as colunas guardam os mesmos números.
- `PrismaBillingProfileRepository` (upsert por `tenant_id`, `complete` derivado), `PrismaUsageSource` (`tenant_usage_daily`), `PrismaBindingsSource` (`vehicle_tracking_bindings` em data local SP, mesma janela do medidor) e `PrismaStatementAuditSink` (`audit_logs` da organização pelo `EnterpriseAuditLogService`).
- Coluna UUID de autoria: ator sem id UUID (cabeçalho legado de dev) fica `null`; o `by` segue no `history` do snapshot.
- **Testes** `tests/ass-04-statement-db.test.ts` (T-ST-db-1, 2, 3, 5, 6, 7, 8, 9), sob papel NOSUPERUSER NOBYPASSRLS: **8/8**.
  - db-1: fechamento com medição real, colunas exatas (`112.00`, `100.00`, `10.00`, `2.00`, `11.000`, vencimento `2026-11-12`), duas baixas de centavos quebrados somando o total, recálculo do snapshot = coluna;
  - db-2: dois fechamentos concorrentes → 1 linha, `closed` + `already_closed`;
  - db-3: dois pagamentos concorrentes que juntos passam do saldo → 1 entra, o outro `amount_exceeds_balance`, `paid_amount = 60.00`;
  - db-5: no contexto de A, demonstrativo, pagamentos e crédito de B não existem (leitura, baixa e aplicação); sem GUC, 0 linhas nas 4 tabelas;
  - db-6: ajuste de −0,01 no reaberto → `99.99` e `-0.01` exatos; id `st_nope` → não existe;
  - db-7: perfil sob RLS, upsert sem duplicar, invisível a outra organização;
  - db-8: a trilha cai em `audit_logs` sem a nota do pagamento;
  - db-9: o job não refecha o reaberto no banco.
- **Mutação:** tirar o `FOR UPDATE` do `lockById` → T-ST-db-3 vermelho em 3 de 3 rodadas. Restaurada, md5 igual.

## F7 — rotas de plataforma (`statements/statements.platform.routes.ts`) — `dev-ass04-opus`

- 11 rotas sob `/api/v1/platform/billing`, montadas dentro de `createSubscriptionBillingPlatformRouter`: leitura com `platform:billing:read`, fechamento, reabertura e ajuste com `manage`, pagamento, estorno, cancelamento e créditos com `settle`. Dinheiro entra e sai como texto decimal; o ajuste aceita sinal.
- **Emenda ao contrato §3.5, declarada:** toda rota recebe o `tenantId` explícito (query nas leituras, corpo nas escritas). A linha do demonstrativo tem FORCE RLS e só se lê sob o GUC da organização; sem a tabela global de referências (`billing_statement_refs`, do B-ASS-08), o id sozinho não resolve a organização.
- **Testes** `tests/ass-04-statement-routes.test.ts` (T-RT-1..11), pelo app real em memória.

## F8 — perfil de cobrança (`billing-profile/billing-profile.ts`) — `dev-ass04-opus`

- `GET`/`PUT /platform/billing/tenants/:tenantId/billing-profile`: `PUT` incompleto é rascunho aceito, com `complete` e `missing[]`. Documento por dígito verificador: CPF, CNPJ numérico e CNPJ alfanumérico (valor do caractere = código ASCII − 48). Organização inexistente → 404; organização de sistema → 422 `platform_organization`.
- A trilha do perfil leva só `complete`, `missingCount` e `paymentMethod`: documento, e-mail e endereço não entram.
- **Achado meu, consertado no bloco:** `writeOffCredit` baixava crédito sem trilha. Passou a gravar `subscription_statement.credit_written_off` (id do crédito e centavos, sem a nota). Teste no T-ST-56/57/58.
- **Testes** T-ST-59, 60, 61. **Mutação:** peso do DV do CNPJ trocado → T-ST-59 e T-ST-60 vermelhos. Restaurada, md5 igual.

## F9 — o cliente vê a própria assinatura — `dev-ass04-opus`

- `src/modules/subscription-billing/subscription-billing.tenant.routes.ts` (novo), montado em `src/app.ts`: `GET /billing/subscription` e `GET /billing/subscription/usage-history?months=1..12`, com `billing:read`. Organização da sessão; `?tenantId` → 400 `tenant_id_not_allowed`; papel de plataforma ou organização de sistema → 403 `platform_actor_not_a_customer`.
- `statements/subscription-view.ts`: o uso sai da MESMA conta do fechamento (`buildStatementInputs` e `monthMeasurements`, extraída de `statement.inputs.ts` para servir aos dois). Allowlist fechada no tipo: nenhuma chave de dinheiro.
- Menu `tenant.billing` "Minha assinatura" (`/administrator/subscription`, `billing:read`, sem módulo, `backend-ready`). Classificação para o CE-1 do `B-SAN3-18`: núcleo, sem módulo. A lista de núcleo do `B-SAN3-18` ainda não existe na `main`; fica a anotação.
- **Fora deste bloco, declarado:** `GET /billing/subscription/statements/:id/invoice/pdf` e os campos `payUrl`, `pixCopyPaste`, `boletoLine` e `boletoUrl`. Sem a tabela de notas e de cobranças (B-ASS-08 e B-ASS-09), a rota só responderia 404 e os campos vão como `null`, com `invoicePdfAvailable: false`.
- **Testes** T-ST-29/30/62, 31, 32, 33, 63, 64 e T-ST-36 (em `tests/navigation-menu.test.ts`). **Mutações:** `totalAmount` no bloco de pagamento → T-ST-29 vermelho (e o tipo já recusa); tirar a trava do ator de plataforma → T-ST-33 vermelho. Restauradas, md5 igual.

## F10 — job `subscription.close-statements` — `dev-ass04-opus`

- Fecha o mês anterior (data local SP) às 02:00 e de novo às 08:00, 14:00 e 20:00. Laço puro `closeTenantsSequentially` pula a organização de sistema e isola a falha de cada uma. Não relança (mesma regra do M-1 do #505) e se re-enfileira uma vez.
- Registrado em `job.types.ts`, `job.registry.ts` e `job-worker.bootstrap.ts`.
- **Leitura do dev, declarada (§A6):** o plano (tabela de jobs) diz que o job "nunca toca linha existente (`open`, …)". O serviço fecha uma linha `open` do mês anterior. Ela só nasce quando um crédito é aplicado no mês, e deixá-la de fora deixaria o mês sem cobrança até alguém fechar à mão. O `reopened` segue intocado pelo job (G4, T-ST-45). Fica para o revisor julgar.
- **Fora do PERMITIDO, declarado:** `tests/job-worker-bootstrap.test.ts` (+1 job na lista exata que o teste confere). É guard que cresce com job novo, como o censo.
- **Testes** `tests/ass-04-close-statements-job.test.ts` (T-ST-45, 66, 67, 68): **4/4**.

## F11 — guards e docs — `dev-ass04-opus`

- Censo `o6r07c` regenerado pelo gerador, com 0 violação: 497 chaves no head (as rotas de plataforma, o perfil, o roteador do cliente e as camadas dele).
- `san3-04a`: a linha Billing sai do `skip` (`billing:read` ganhou rota); `billing:read` sai das órfãs (29 → 28); o `billing:read` do support (célula "support-view") entra na allowlist B com a pendência existente `P-SAN3-04A-SUPPORT-SEM-POLITICA` (13 → 14 células).
- `san3-05` ratchet: 16 chaves L1 da porta `StatementTx`, coladas da saída do gerador com o motivo.
- `docs/subscription-billing.md` (§Demonstrativo mensal) e uma linha em `API_CONTRACTS.md`, abaixo da tabela "finance / billing".

## F12 — bateria e o que ela pegou — `dev-ass04-opus`

A suíte inteira, com o banco e o Redis descartáveis, pegou 3 defeitos do bloco. Os 3 foram consertados aqui:

| Guard | Defeito | Conserto |
|---|---|---|
| `ass-03-metering-census-db` (T-MED-db-8) | as 4 tabelas novas ficavam fora da lista que o medidor soma, e o espaço delas não entraria no `db_bytes_estimated` | `censored-tables.ts` regenerado por `scripts/gen-tenant-tables.mjs` (+4, nada mais) |
| `ass-02-plans-migration-drill-db` (M1 drill) | as FKs da M3 apontam para as tabelas da M1, então o down da M1 sozinho falha com 2BP01 | o drill roda primeiro o down de quem depende da M1, lido do rodapé da M3 (rollback em ordem inversa). Isso também prova o down da M3. **Rollback da M1 em produção exige o da M3 antes** |
| `san3-05-leituras-de-plataforma-db` | o job novo e as 13 rotas de plataforma estavam fora da lista fechada | cada uma com etiqueta `FORCE-POR-TENANT` e cenário próprio, não vazio, igual sob superusuário e sob o papel sem bypass; o job com etiqueta `FORCE-PLATAFORMA` (3 → 4) |

**Trilha na mesma transação (o risco que eu tinha declarado virou conserto).** Medido: `audit_logs.actor_user_id` tem FK para `users`. Com a trilha gravada depois do commit, um ator que não fosse usuário deixaria o dinheiro andar e a rota responder 500. Agora `StatementService.trail` grava dentro do callback da transação, e no Prisma pelo mesmo `tx` (`StatementTx.recordAudit`): se a trilha falha, o movimento é desfeito. Teste `T-ST-db-10`: o ator não existe em `users`, o pagamento é recusado, e ficam `paid_amount = 0.00`, 0 pagamento e 0 linha de trilha. **Mutação:** `trail` engolindo o erro → T-ST-db-10 vermelho. Restaurada, md5 igual. O perfil de cobrança (sem dinheiro) segue com a trilha em transação própria.

**Fora do PERMITIDO, declarado (todos da classe de guard que cresce com tabela, rota ou job):** `src/modules/subscription-billing/metering/censored-tables.ts` (gerado), `tests/ass-02-plans-migration-drill-db.test.ts`, `tests/job-worker-bootstrap.test.ts`.

**Vermelhos que sobram na máquina local, sem relação com o bloco:**
- `san3-05-runtime-role-guard-db` T14a/b/c/d: exige `setsid`, que só existe em Linux (a CI tem);
- os drills `traccar-event-migration-drill-db` e `work-order-invoicing-migration-drill-db`: `EBUSY` ao apagar a pasta temporária do Windows no fim;
- `san3-09-bootstrap-platform-admin-db`: `SyntaxError` no script disparado pelo shell, e falha igual na árvore antiga da `main` (`7c89c73b`), contra o mesmo banco;
- a ingestão com tempo esgotado e os testes de DNS e reset: dependem do tempo e da rede da máquina.
