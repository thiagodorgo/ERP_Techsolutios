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
