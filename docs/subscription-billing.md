# Assinaturas e catálogo de planos

O B-ASS-02 entrega o catálogo persistido de quatro planos-base e dois add-ons, versões imutáveis
com vigência e uma assinatura vigente por organização. O catálogo nasce sem versão e sem preço:
valores comerciais são cadastrados fora do repositório público por um administrador de plataforma.

## Contratos e autoridade

- As rotas ficam em `/api/v1/platform/billing` e exigem `platform:billing:read` ou
  `platform:billing:manage` de um ator de plataforma.
- `subscription_plans` e `subscription_plan_versions` são catálogo global.
- `tenant_subscriptions` e `tenant_subscription_addons` são escopadas por organização, com RLS
  `ENABLE` + `FORCE`; toda leitura ou escrita usa o contexto da organização.
- Uma versão existente nunca é editada. Alterações comerciais criam uma versão posterior e fecham
  a vigência da anterior.
- O `PUT` de assinatura e a entrada em vigor de uma versão gravam em `tenants.modules` a união dos
  módulos do plano-base com os módulos dos add-ons. Encerrar a assinatura não apaga os módulos.

Os seis códigos iniciais são `starter`, `professional`, `business`, `enterprise`,
`tracking_basic` e `tracking_plus`. Em produção eles são criados pela migração M1-d; o seed de
desenvolvimento consome `SUBSCRIPTION_PLAN_SEEDS`, em
`src/modules/subscription-billing/plans/plan-catalog.ts`.

## Reconciliação do mapa de módulos

“Sem chave” é uma lacuna declarada: o item não recebe chave inventada e aguarda o gate
`B-SAN3-18`.

| Plano | Item do mapa | Chave do catálogo ou estado |
|---|---|---|
| Starter | Core | `dashboard`, `users`, `tenant-admin` |
| Starter | Cadastros | `customers`, `vehicles`, `suppliers`, `technicians` |
| Starter | Ordens de serviço | sem chave — núcleo; gate pendente (`B-SAN3-18`) |
| Starter | Painel básico | `dashboard` |
| Starter | Financeiro básico | `finance` |
| Starter | Relatórios básicos | `reports` |
| Professional | Mobile | `mobile` |
| Professional | Estoque | `inventory` |
| Professional | Frota | `vehicles` |
| Professional | Checklists | `tenant_checklist` |
| Professional | Orçamento | `approvals` |
| Professional | Faturamento | `finance` |
| Professional | Alertas | `notifications` |
| Business | Estoque por viatura | `inventory` — sem chave própria |
| Business | Manutenção | sem chave — gate pendente (`B-SAN3-18`) |
| Business | Multas | sem chave — gate pendente (`B-SAN3-18`) |
| Business | Remunerações | sem chave — gate pendente (`B-SAN3-18`) |
| Business | Pré-faturamento | sem chave — gate pendente (`B-SAN3-18`) |
| Business | Integrações | `integrations` |
| Enterprise | Auditoria avançada | `audit` |
| Enterprise | BI | `analytics` |
| Enterprise | IA | sem chave — gate pendente (`B-SAN3-18`) |
| Enterprise | SSO | sem chave — gate pendente (`B-SAN3-18`) |
| Enterprise | Isolamento premium | sem chave — gate pendente (`B-SAN3-18`) |
| Enterprise | Regras complexas | sem chave — gate pendente (`B-SAN3-18`) |
| Enterprise | ESG | sem chave — gate pendente (`B-SAN3-18`) |

Os add-ons de rastreamento usam `tracking`; apenas um add-on de rastreamento pode estar vigente por
assinatura.

## Migrações e rollback

M1 cria as quatro tabelas; M1b provisiona as duas permissões; M1-d cria somente os códigos iniciais.
Todas têm transação explícita. O rollback é manual e escopado nos próprios arquivos. M1-d nunca
remove um plano que já tenha versão.

## Medição diária da franquia (B-ASS-03)

O job `subscription.measure-daily` mede cada organização duas vezes ao dia, às 12:00 e às 23:30, no horário de São Paulo. O resultado vai para `tenant_usage_daily`, que tem uma linha por organização e por dia e é guardada com ENABLE+FORCE RLS. O demonstrativo (B-ASS-04) lê o maior valor do mês.

| Medida | Como se mede | O que não mede (declarado) |
|---|---|---|
| `active_users` | `count(*)` de `users` ativos sob o GUC da organização, sem filtro de papel: o técnico de campo conta. Das duas amostras do dia, fica a maior (`GREATEST`) | dia sem amostra fica sem linha (gap), nunca preenchido depois |
| `files_bytes` / `files_without_size` | soma de `size_bytes` dos anexos guardados (`attachments` e `work_order_attachments` sem `deleted_at` e com `status = stored`; `checklist_attachments` e `damage_attachments` sem esses filtros, porque não têm as colunas) | anexo rejeitado ou em quarentena não conta |
| `db_bytes_estimated` (método 2) | soma de `pg_column_size` das linhas vivas da organização em cada tabela da lista censurada (`relforcerowsecurity` ∩ `tenant_id NOT NULL`, menos `cloud_charge_rules`, `roles` e `platform_audit_logs`), sob RLS. Outra organização apagar ou crescer não muda a medida desta | índices e espaço morto; o TOAST externo conta. Por isso o nome é "estimativa", com `method_version` gravado |
| `tracked_vehicles` | veículos distintos com vínculo de rastreamento ativo no dia | a cobrança usa a contagem do mês, feita no fechamento |

**Segurança.** Cada organização é medida numa transação própria (`withTenantRlsBudget`), sob o papel de runtime sem bypass. Antes de gravar, o medidor confere que o GUC é o da organização e passa uma leitura-canário. Se o contexto estiver ausente ou trocado, ele lança `tenant_context_missing`: o dia fica sem linha, nunca com zero. Cada tabela tem orçamento de 30 s (`statement_timeout`, sob `SAVEPOINT`). Tabela que estoura vai para `metadata.tables_timed_out[]`, e o banco do dia fica sem medida.

**Leitura.** A rota é `GET /api/v1/platform/billing/tenants/:tenantId/usage?from&to`, com permissão `platform:billing:read`. Ela lê sob o GUC da organização e devolve `dbBytesEstimated` como texto, porque é BigInt.

**Rateio do custo de nuvem (R-MED-8).** A linha `AmazonRDS` da conta da AWS é rateada pelo `db_bytes_estimated` do último dia medido até o fim do período (método `storage_usage_weight`), com o rótulo de estimativa. Sem medição, o rateio continua pelas ações auditadas. A chave nasce só dessa derivação e fica fora da lista de métricas que os eventos de uso aceitam.

**Rollback.** Retire o job do bootstrap e reverta o PR. A tabela fica.

## Demonstrativo mensal (B-ASS-04)

O demonstrativo é a conta do mês de cada organização. Ele vive em `subscription_statements` (uma linha por organização e por mês), com os pagamentos em `subscription_statement_payments`, os créditos em `subscription_credits` e o perfil de cobrança em `tenant_billing_profiles`. As quatro tabelas têm ENABLE+FORCE RLS. O dinheiro anda em centavos inteiros no código e em `Decimal(12,2)` no banco, convertido por texto, sem float.

**O cálculo.** `total = base + usuários extras × preço + espaço extra × preço por GB + veículos × preço por veículo + ajustes − créditos aplicados`, nunca abaixo de zero.

| Parcela | Regra |
|---|---|
| Base (pro-rata) | cada trecho do mês `[validFrom, validTo)` cobra `preço mensal × dias do trecho ÷ dias do mês`, arredondado para o centavo (meio para cima) |
| Termos | franquia e preços de excedente vêm do ÚLTIMO dia do mês (a sobrescrita da organização vence a versão do plano) |
| Usuários | `max(0, pico do mês − franquia)` |
| Espaço | pico diário de `(banco + arquivos) ÷ 1024³`, com teto a 0,001 GB; o excedente é cobrado por GB, arredondado no fim |
| Veículos | distintos com vínculo de rastreamento em qualquer dia do mês, só com o add-on de rastreamento |

O `snapshot` guarda as entradas do cálculo. Recalcular a partir dele reproduz o total, centavo a centavo. Dia sem medição entra em `gaps[]`; mês sem medição nenhuma fecha com `warning: no_usage_measured`.

**Estados.** `open` → `closed` → `paid`; `closed` → `reopened` → `closed`; `closed` sem pagamento → `cancelled`. Total zero fecha direto em `paid`, com `zeroTotal`. O reaberto refecha com a MESMA versão de plano. O ajuste só vale em `open` ou `reopened`, exige nota e não pode levar o total abaixo de zero.

**Fechamento.** O job `subscription.close-statements` fecha o mês anterior (data de São Paulo) às 02:00 e de novo a cada 6 h, para pegar a organização que falhou na janela anterior. A falha de uma organização não para as outras. O job nunca refecha um `reopened`: só o fechamento manual (`POST /platform/billing/statements/close`) faz isso. A organização de sistema não tem demonstrativo.

**Em dia.** A organização está em atraso quando tem demonstrativo `closed` com saldo e `vencimento + 5 dias < hoje`, ou cobrança estornada por chargeback. O vencimento é a data do fechamento mais `dueDays` da assinatura (padrão 10).

**Créditos.** Pagamento do provedor acima do saldo abate só o saldo; o resto vira crédito (`overpayment`, `duplicate_payment`, `paid_after_cancel`, `paid_after_manual_settlement`). O crédito se aplica a um demonstrativo `open` ou `reopened` e abate o total do fechamento seguinte. Baixar um crédito exige motivo e entra na trilha.

**Quem faz o quê.**

| Rota | Permissão |
|---|---|
| `GET /platform/billing/statements?tenantId` · `GET …/statements/:id?tenantId` · `GET …/credits?tenantId` · `GET …/tenants/:tenantId/billing-profile` | `platform:billing:read` |
| `POST …/statements/close` · `POST …/:id/reopen` · `PATCH …/:id/adjustment` · `PUT …/tenants/:tenantId/billing-profile` | `platform:billing:manage` |
| `POST …/:id/payments` · `POST …/payments/:paymentId/reverse` · `POST …/:id/cancel` · `POST …/credits/:id/apply` · `POST …/credits/:id/write-off` | `platform:billing:settle` |
| `GET /billing/subscription` · `GET /billing/subscription/usage-history?months=1..12` (a própria organização) | `billing:read` |

As rotas de plataforma recebem o `tenantId` explícito, porque a linha do demonstrativo só se lê sob o GUC da organização. A rota do cliente tira a organização da sessão e recusa `?tenantId` com 400. Ator de plataforma, ou a organização de sistema, recebe 403 `platform_actor_not_a_customer`. A resposta do cliente NÃO tem nenhum valor em dinheiro: só o plano, o uso contra a franquia, a situação e, com demonstrativo em aberto, o bloco "como pagar" (os meios de pagamento chegam com o canal do provedor, no B-ASS-08).

**Perfil de cobrança.** `PUT` incompleto é aceito como rascunho e devolve `complete` e `missing[]`. O documento é validado pelos dígitos verificadores: CPF, CNPJ numérico e CNPJ alfanumérico. Documento, e-mail e endereço nunca entram na trilha.

**Trilha.** Fechar, reabrir, ajustar, cancelar, registrar e estornar pagamento, criar, aplicar e baixar crédito e gravar o perfil viram linha em `audit_logs` da organização, só com ids, período, estados e centavos.

**Rollback.** Retire o job do bootstrap, reverta o PR e rode o rollback do rodapé da M3 e da M3b.

## Cofre de credenciais e configuração dos provedores (B-ASS-05)

- **Para quê:** guardar as credenciais dos provedores de pagamento (Asaas, Iugu, Mercado Pago) e de nota (Focus NFe,
  NFE.io, PlugNotas) cifradas, e dar à plataforma o lugar onde escolhe provedor, ambiente e dados fiscais. **Nenhuma
  chamada externa ainda:** testar conexão, ligar, registrar webhook e emissor são do B-ASS-08.
- **Cifra:** AES-256-GCM, IV de 12 bytes por cifragem, authTag de 16 bytes, AAD `provedor:ambiente:id` (uma credencial
  não decifra em outra linha). A chave vem do ambiente (`docs/deployment.md`, "Chave do cofre").
- **O segredo nunca sai:** a resposta é o resumo `{ kind, fingerprint (16 hex do SHA-256), last4, createdAt,
  keyVersion }`. O claro só existe dentro de `VaultSecret`, que lança ao virar JSON e vira `[redacted]` em texto, e só
  os adaptadores (B-ASS-06..08) o leem. Nenhuma rota loga o corpo; JSON malformado responde 400 `invalid_json` sem
  ecoar o corpo (`src/app.ts`). A trilha (`platform_audit_logs`) passa pela allowlist própria
  (`platform-audit/audit-metadata.ts`). Segredo em `settings` é recusado (`secret_in_settings`).
- **Um segredo vivo por kind:** `api_token`, `webhook_secret` e `certificate` (só provedor de nota). Gravar outro do
  mesmo kind revoga o anterior; nunca há DELETE.
- **Dados fiscais por provedor:** a base (`cnpj`, `regimeTributario`, `municipioIbge`, `cTribNac`) mais os campos de
  cada provedor de nota. Incompleto é aceito como rascunho (`fiscalDataComplete: false`, `missing[]`).
- **Rotas** (`platform:billing-providers:manage`): `GET /platform/billing/providers`, `GET|PUT
  /platform/billing/providers/:provider`, `PUT /platform/billing/providers/:provider/credentials` e `POST
  /platform/billing/vault/rotate`.
- **Tabelas (M4):** `billing_provider_configs`, `billing_provider_credentials` e `platform_audit_logs`, globais da
  plataforma (sem RLS, exceção declarada no plano). Permissão provisionada pela M4b.
- **Rollback:** reverta o PR e rode o `-- down` da M4 e o rollback da M4b. As linhas cifradas ficam ilegíveis sem o
  código, o que é aceitável: são recadastráveis.

## Pagamento (B-ASS-06)

- **Para quê:** deixar "pagamento pronto" sem ligar nada. Uma porta comum (`PaymentProviderPort`), um cliente HTTP único
  (`BillingHttpClient`, o único ponto de `fetch` do módulo) e o adaptador **Asaas**, provados contra servidor falso em
  `127.0.0.1:0`. O Mercado Pago fica para o `B-ASS-15`; a Iugu saiu do pacote (02/11).
- **Porta (`providers/payment/payment-provider.port.ts`):** `ensureCustomer`, `createCharge`, `getCharge`,
  `findChargeByExternalReference`, `cancelCharge`, `refund`, `registerWebhook`, `verifyWebhook`, `describe`,
  `supportedMethods`. `createCharge` sempre recebe `externalReference = statement_id`. Estados do provedor mapeados para
  o enum nosso (`pending | paid | partially_paid | overdue | cancelled | refunded | partially_refunded |
  chargeback_disputed | charged_back | unknown`).
- **Cliente HTTP (`providers/http/billing-http.client.ts`):** allowlist por provedor/ambiente (https obrigatório e
  porta padrão; fora dela → `host_not_allowed`; `127.0.0.1` só com `BILLING_PROVIDER_ALLOW_LOCAL_HOSTS` em `test`);
  canal desligado → `channel_disabled` antes de tocar a rede; redirect nunca é seguido (`redirect: "manual"`, 3xx vira
  erro sanitizado); `AbortSignal.timeout` (60 s cartão / 15 s resto); 429 → `retryAfterMs` (`RateLimit-Reset` do Asaas
  em segundos restantes); log só `{ provider, op, status, latencyMs }` — nunca header sensível nem corpo. O segredo só
  entra por `readSecret` e nunca sai em log, erro, query string ou resposta.
- **Asaas (`providers/payment/asaas/`):** headers `access_token` + `User-Agent: erp-techsolutions/1.0`;
  `notificationDisabled: false` no cliente; `value` em reais; `invoiceUrl` → `payUrl`, `bankSlipUrl` → `boletoUrl`;
  PIX/BOLETO buscam `pixQrCode`/`identificationField`; débito só pela fatura (`billingType: UNDEFINED`);
  `getCharge` devolve `paidCents` só em estado pago; todo id de caminho é codificado (id com `/`, `..` ou `?` é
  recusado antes da rede); webhook via `POST /v3/webhooks` (`authToken` = `webhook_secret` do cofre,
  `sendType: SEQUENTIALLY`); `verifyWebhook` compara em tempo constante (SHA-256 + `timingSafeEqual`).
- **Dinheiro:** centavos inteiros por `toCents(x) = Math.round(x * 100)` (nunca `Math.trunc`).
- **Ambiente:** `BILLING_PROVIDERS_ENABLED` (mestre, desligado por padrão) e `BILLING_PROVIDER_ALLOW_LOCAL_HOSTS` (só
  `test`). A URL pública do webhook nasce no B-ASS-08 (aqui o `registerWebhook` recebe a URL por parâmetro).
- **Falso Asaas (`tests/helpers/fake-providers/asaas.ts`):** cenários `ok`, `validation_400` (ecoa o token),
  `rate_limited_429` (`Retry-After: 2`), `rate_limited_429_reset` (`RateLimit-Reset: 30`), `timeout`,
  `customer_duplicate`; grava `recorded[]`. O `emitWebhook(targetUrl, event)` nasce no B-ASS-08 (usado lá), não aqui.
- **Rollback:** reverter o PR; nada é persistido (sem migração).

## Nota fiscal e reforma tributária (B-ASS-07)

- **Para quê:** deixar a emissão de NFS-e pronta, mas desligada. A porta `InvoiceProviderPort`, as regras fiscais e o
  adaptador **Focus NFe** usam o mesmo `BillingHttpClient` do pagamento e são provados apenas contra o falso local em
  `127.0.0.1:0`. NFE.io e PlugNotas ficam no B-ASS-15 pelo recorte 1 + 1.
- **Canal fechado:** `BILLING_PROVIDERS_ENABLED=false` recusa antes da rede. Localhost só é permitido quando
  `BILLING_PROVIDER_ALLOW_LOCAL_HOSTS=true` em `NODE_ENV=test`. O token, o segredo do webhook e o certificado A1 são
  lidos apenas por `readSecretForProvider`; não entram em log, erro, query string nem resposta.
- **Assíncrono:** `issue` sempre devolve `processing`, inclusive após HTTP 202. A consulta posterior mapeia a situação
  para `processing`, `authorized`, `rejected`, `cancelled` ou `unknown`; situação desconhecida nunca é final.
- **Referência e DPS:** `externalRef = <statement_id>:<seq>`. Rejeição ou cancelamento permite nova tentativa com
  `seq + 1` e outro `numero_dps`. O dublê deste bloco serializa reservas e devolve o número em rollback. A sequência
  PostgreSQL, `SELECT FOR UPDATE` e o teste DB nascem no B-ASS-08/M5; este bloco não tem migração.
- **Reforma:** IBS/CBS é omitido antes de 2026-12-01 para não-Simples e antes de 2027-01-01 para Simples. A partir da
  data aplicável, os quatro campos configurados (`cst`, `cClassTrib`, `indicadorDestinatario`, `finalidadeEmissao`) são
  obrigatórios. O sistema não escolhe códigos tributários: todos são campos informados. Emissor Simples usa somente a
  rota Nacional a partir de 2026-11-01.
- **Focus NFe:** Basic Auth somente em header; emissão Nacional em `/nfsen?ref=...`; cancelamento considera o conteúdo
  mesmo em HTTP 200; duplicidade vira `already_issued`; PDF autorizado é uma URL pública, sem credencial. Emissor e
  webhook são registrados explicitamente com os segredos do cofre.
- **Falso Focus:** cobre processamento→autorização, rejeição, referência duplicada, DPS repetida, cancelamento com erro
  em 200, rate limit, emissor e hook. Nenhum teste chama host real.
- **Rollback:** reverter o PR. Nada foi persistido e não há migração.

## Canal de cobrança: webhook, outbox e jobs (B-ASS-08 / B-ASS-08b)

- **Para quê:** fechar o ciclo pagamento → nota sem gente no meio, **desligado** até o dono ligar (`BILLING_PROVIDERS_ENABLED`
  + provedor `enabled` na tela). Tudo o que vai à rede sai de uma fila durável (`billing_outbox`) e tudo o que chega de fora
  (webhook) só vira dinheiro depois de uma reconsulta no provedor.
- **Webhook:** `POST /api/v1/webhooks/billing/<provedor>` (a URL registrada no provedor é `BILLING_WEBHOOK_PUBLIC_BASE_URL` +
  esse caminho). O router é montado antes do parser JSON, do log HTTP e de qualquer middleware de ator (o provedor não tem
  token nosso). Canal desligado, provedor desconhecido, `enabled = false` ou cofre indisponível → o router passa o pedido
  adiante sem ler o corpo e sem os cabeçalhos de segredo, e o app responde o mesmo 404 de rota inexistente — idêntico por
  construção para qualquer corpo. Ligado: corpo cru até 256 KB (413 acima), autenticidade do adaptador (`timingSafeEqual`;
  401 sem motivo), 20 falhas por IP em 10 min → 429 só para aquele IP, 600/min por provedor → 429, `INSERT … ON CONFLICT`
  do evento (replay → 200), job `billing.reconcile-webhook` enfileirado, `200 {}`. Banco ou fila indisponíveis → 503 sem
  detalhe (o provedor reenvia; o evento gravado sem job é retomado pelo poll-pending). Só o digest SHA-256 do corpo é
  guardado; nunca o corpo nem o segredo.
- **Reconcile (o corpo nunca decide):** a organização sai do NOSSO `statement_id` em `billing_statement_refs` (índice global
  de ids), nunca do payload; o estado e o valor vêm de `getCharge`/`getInvoice`; o cliente do provedor tem de bater com o
  perfil da organização. Pago → baixa monotônica (excedente vira crédito); estorno/chargeback → reversão (primeiro do
  crédito que o pagamento gerou); disputa → `chargeback_disputed` sem derrubar "em dia"; estorno total ou chargeback com
  nota autorizada → `invoice_cancel` automático (salvo "manter nota").
- **Outbox (claim–chamada–registro):** claim por organização com `FOR UPDATE SKIP LOCKED` em transação curta; a chamada ao
  provedor fora de transação; o registro em outra transação curta. Linha `PROCESSING` órfã há > 10 min é reconsultada por
  referência antes de repetir (nunca cobra nem emite 2×). Backoff 1/5/15/60 min; 8 falhas → `FAILED`; linha de provedor
  desligado fica `PENDING` com `skip_reason = provider_disabled` visível, sem rede.
- **Jobs (só com o canal ligado; desligado nada roda nem se re-enfileira):** `billing.dispatch-outbox` a cada 60 s;
  `billing.reconcile-webhook` por evento; `billing.poll-pending` a cada 15 min (evento `received` sem job há > 30 min;
  cobrança `pending` sem evento há > 30 min; nota `pending` sem retorno há > 30 min); `billing.poll-settled` às 03:00 de
  São Paulo (cobranças confirmadas dos últimos 120 dias — janela de chargeback — e notas `cancel_pending`).
- **Nota (R-SET-2):** `invoice_issue` só com demonstrativo `paid`; `numero_dps` sai da sequência nossa
  (`billing_invoice_sequences`) na mesma transação da linha da nota; competência fiscal = o período do demonstrativo (último
  dia do mês — é ela que decide o grupo IBS/CBS); valor = total do demonstrativo; descrição = plano + competência, sem dado
  pessoal; 2xx do provedor é `processing`, nunca autorizada. Uma nota viva por demonstrativo (UNIQUE parcial no banco);
  rejeitada ou cancelada → reemissão com `seq + 1`. Cancelamento: código **conforme provedor** — o Focus Nacional só leva a
  justificativa; a nossa linha registra `cancel_code = 9` ("outros") + o motivo em texto. **Nota ao dono/contador:** se a
  homologação exigir o código no provedor, é emenda do adaptador; e o adaptador iguala `data_emissao` a `data_competencia`
  (DPS emitida em dezembro com data do mês anterior) — a conferir na homologação.
- **Um provedor ligado por kind (G14):** além do gate em código (`another_provider_enabled_for_kind`), o índice único parcial
  `billing_provider_configs_one_enabled_per_kind` (migração `20260901000000`) recusa o segundo com 23505 — para trocar,
  desliga-se o ligado antes.
- **Ainda não (pendências com dono):** ligar/desligar/testar/registrar webhook persistidos pela tela (F9 do B-ASS-08; hoje
  nenhum caminho grava `enabled = true`); `GET /billing/subscription` do cliente ainda não lê `payUrl`/`invoicePdfAvailable`
  das cobranças e notas (view do B-ASS-04); baixa manual → nota (T-FLX-13); `charge_cancel`/`refund` na outbox.
- **Rollback:** `BILLING_PROVIDERS_ENABLED=false` para o canal (a outbox fica visível); reverter o PR não apaga linhas. As
  migrações M5 e `20260901000000` são aditivas, com drill de rollback nos testes `-db`.
