# B-ASS-07 — porta fiscal, reforma tributária e Focus NFe — relatório do dev

Plano: `B-ASSINATURA` §3, §4.5, §4.6, §4.7 e §12. Dev declarado: `dev-ass07-codex` (Codex 3, `gpt-5.6-sol`, esforço medium). O dev não revisa nem julga a própria entrega; pré-revisão, conferência e junta completa cabem a Claude e/ou DeepSeek.

## Recorte do portão 1 + 1

Este bloco entrega a porta comum, as regras fiscais, o adaptador Focus NFe e o falso Focus. NFE.io e PlugNotas ficam no `B-ASS-15`.

- Fora por NFE.io: T-NF-7..12, T-NF-20, T-NF-29, T-NF-42, T-NF-45 e T-NF-48, além das parcelas NFE.io dos testes comuns de reemissão/campos.
- Fora por PlugNotas: T-NF-13..18, T-NF-21, T-NF-30, T-NF-32, T-NF-43, T-NF-46 e T-NF-47, além das parcelas PlugNotas dos testes comuns.
- Permanecem aqui os casos Focus e comuns: porta, datas, regime/rota, assíncrono, idempotência/reenissão Focus, canal desligado, allowlist, segredo, registro de emissor/webhook Focus, PDF público Focus, campos Focus e cancelamento Focus.
- T-NF-db-1 fica para o B-ASS-08: `billing_invoice_sequences` e `seq` nascem na M5. A F6 deste bloco usa dublê em memória e não usa Docker.

## F0 — terreno, dependência e baseline

- Worktree `C:/Users/thiag/w-ass07`, ramo `feat/b-ass-07-porta-fiscal`, fast-forward para `origin/main@4cd1889d`.
- O B-ASS-06 está na base e `providers/http/billing-http.client.ts` existe. Não foi criado segundo cliente.
- Cofre conferido: adaptadores recebem segredo por `VaultService.readSecretForProvider`.
- `npm ci` próprio concluído; junction proibida e não usada.
- **PREMISSA FALSA:** `npm ci` deixaria o cliente Prisma pronto — `npm run check` falhou com `@prisma/client` sem `Prisma`/`PrismaClient`. Comando: `npm run check`. Saída: erros TS2305 em massa. Correção ambiental: `DATABASE_URL=postgresql://placeholder:placeholder@127.0.0.1:1/placeholder npx prisma generate`; nenhuma conexão foi aberta.
- Após gerar o cliente: `npm run check` verde; regressão R-EXT-0 do B-ASS-06: 4/4.
- Vermelho-controle na `origin/main`: `git ls-tree -r --name-only origin/main -- src/modules/subscription-billing/providers/invoice tests/ass-07-*.test.ts` não encontra porta, adaptador nem suítes do bloco.
- Sem migração, sem Docker, canal desligado e KPI congelado.

## RETOMADA 0

- **head medido:** `e1af3189` (commit F0 antes do carimbo no próprio relatório; o amend que grava esta linha altera o SHA).
- **feito:** contrato, terreno, recorte Focus-only, dependência do cliente HTTP/cofre e baseline medidos.
- **falta:** F1 a F8, bateria, PR e CI.
- **próximo comando:** `mkdir -p src/modules/subscription-billing/providers/invoice src/modules/subscription-billing/providers/tax` (a criação de arquivos será feita por patch).

## F1 — porta e regras fiscais puras

- Criados `InvoiceProviderPort`, tipos de emissão/consulta/cancelamento/PDF/webhook e erros fiscais próprios.
- `tax/ibs-cbs.rules.ts`: não-Simples envia a partir de 2026-12-01; Simples, de 2027-01-01; antes, omite. Se enviar, exige os quatro códigos recebidos como campos.
- `tax/nfse-route.rules.ts`: regime ausente → `fiscal_data_incomplete`; Simples em rota municipal a partir de 2026-11-01 → `municipal_route_not_allowed_for_simples`.
- Testes T-NF-22..27 e T-NF-37: **7/7**. `npm run check` verde; R-EXT-0 **4/4**.
- Mutação literal da borda (`>=` → `>`): T-NF-23, T-NF-25 e T-NF-26 vermelhos, exit 1; restaurada.
- Mutação do bloqueio de regime ausente: T-NF-37 vermelho, exit 1; restaurada.
- Códigos fiscais nos testes usam marcadores de campo; nenhum valor tributário foi recomendado ou fixado pelo sistema.

## RETOMADA 1

- **head medido:** commit F1 será o próximo head do ramo.
- **feito:** F1 completa, 7 testes e duas mutações provadas.
- **falta:** falso/adaptador Focus, registro, sequência em memória, PDF/cancelamento, docs e bateria.
- **próximo comando:** `node --test --import tsx tests/ass-07-tax-rules.test.ts`.

## F2 — falso Focus e adaptador

- Falso Focus em `127.0.0.1:0`, com emissão, consulta assíncrona, duplicidade de referência, número DPS repetido, cancelamento com erro em 200, empresa e hook.
- Adaptador Focus usa exclusivamente `BillingHttpClient`; token em `Authorization: Basic`, nunca em query; fábrica lê `api_token`, `webhook_secret` e `certificate` apenas por `readSecretForProvider`.
- Emissão Nacional envia `ref=<statement_id>:<seq>`, `numero_dps` recebido, CNPJ/documentos como string e valores em reais derivados de centavos inteiros. 202 retorna somente `processing`.
- Consulta mapeia `processando_autorizacao`, `autorizado`, `erro_autorizacao`, `cancelado` e desconhecido; cancelamento inspeciona o conteúdo mesmo em HTTP 200.
- T-NF-1..6, 19, 28 e 31 na parte Focus: **5 casos/5 verdes**; conjunto do bloco até aqui **12/12**; R-EXT-0 **4/4**; `npm run check` verde.
- Mutações literais provadas e restauradas: 202→`authorized` (T-NF-1 vermelho); CNPJ convertido para número (T-NF-1 vermelho); duplicidade sem mapa `already_issued` (T-NF-5 vermelho); erro de cancelamento em 200 tratado como cancelado (T-NF-6 vermelho).

## RETOMADA 2

- **head medido:** commit F2 será o próximo head do ramo.
- **feito:** contrato Focus básico, assíncrono, duplicidade e cancelamento por conteúdo.
- **falta:** registro de emissor/webhook, gates/segredo, sequência/reemissão, PDF/campos, docs e bateria.
- **próximo comando:** `node --test --import tsx tests/ass-07-focusnfe-adapter.test.ts`.

## F5 — canal, cofre, emissor e webhook Focus

- T-NF-33..36 e T-NF-41/41b: canal desligado → 0 requisições; local só com flag em `test`; token não aparece em log nem em erro (inclusive Basic em base64); credencial ausente falha antes da rede; emissor/hook usam `certificate`, `api_token` e `webhook_secret` lidos por `readSecretForProvider`; webhook compara o segredo em tempo constante e retorna allowlist.
- O registro do emissor envia certificado A1 somente ao falso Focus. O registro do hook usa o segredo do cofre e `authorization_header: X-Webhook-Token`.
- Suítes do bloco: **18/18**; regressão R-EXT-0: **4/4**; `npm run check` verde.
- Mutação de sanitização removendo a redação do Basic: T-NF-35 vermelho; restaurada.
- Mutação usando segredo diferente no registro do hook: T-NF-41 vermelho; restaurada.
- A mutação “fetch direto no adaptador” permanece coberta literalmente pela regressão R-EXT-0 do B-ASS-06; este bloco não alterou o cliente compartilhado.

## RETOMADA 3

- **head medido:** commit F5 será o próximo head do ramo.
- **feito:** superfície externa Focus fechada por canal/allowlist/cofre e registros no falso.
- **falta:** sequência/reemissão em memória, PDF/campos/cancelamento, docs, bateria, PR e CI.
- **próximo comando:** `node --test --import tsx tests/ass-07-focusnfe-security.test.ts`.

## F6 — sequência e reemissão no dublê em memória

- `InMemoryInvoiceSequence` serializa transações, reserva `numero_dps` por provedor/ambiente/série, forma `externalRef = <statement_id>:<seq>`, bloqueia nota viva e só reemite com `seq + 1` após `rejected`/`cancelled`.
- Rollback restaura número e histórico; duas reservas concorrentes são distintas e consecutivas.
- T-NF-38..40 + controles de concorrência/rollback: **5/5**. Total do bloco: **23/23**.
- Falso Focus recusa `numero_dps` repetido na mesma `serie_dps`.
- Mutações provadas e restauradas: reemissão com mesma `seq` (T-NF-38/39 vermelhos); falso aceitando DPS repetida (T-NF-40 vermelho); rollback consumindo número (T-NF-40c vermelho).
- **Sem Docker e sem migração.** T-NF-db-1 e a persistência `FOR UPDATE` continuam no B-ASS-08/M5.

## RETOMADA 4

- **head medido:** commit F6 será o próximo head do ramo.
- **feito:** sequência/reemissão Focus comprovadas no dublê em memória.
- **falta:** PDF público, campos Focus/cancelamento final, docs, bateria, PR e CI.
- **próximo comando:** `node --test --import tsx tests/ass-07-sequence-memory.test.ts`.
