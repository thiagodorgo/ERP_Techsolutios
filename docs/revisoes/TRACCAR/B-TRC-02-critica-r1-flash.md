# Crítica de Segurança e Arquitetura — Bloco B-TRC-02 (Ciclo 1)

> **Crítico:** `critico-trc02-flash` (2º Crítico em paralelo com Claude Opus; nível menor declarado).
> **Modelo:** Gemini 3.8 Flash High via Antigravity.
> **Papel:** Revisor adversarial independente de Segurança e Arquitetura. Só lê; não desenvolve; sem voto final de junta.
> **Objeto julgado:** `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-TRC-02-plano.md` (Plano inicial do bloco B-TRC-02, pelo `planejador-trc02-fable`).
> **Ref medida no repositório (§A7):** `origin/main` = `3fbcaea2ba3cd1d39a42ff8943a2cc0086ef010d` (após `git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios fetch -q origin`).
> **Referência canônica do bloco:** `origin/main:docs/revisoes/TRACCAR/PLANO_TRACCAR.md` §7 (B-TRC-02, ~l.1018).
> **Data:** 2026-10-19.
> **Regime:** Bloco de Ingestão do Traccar (Segurança máxima; junta 3/3 com poder de veto; §C7 item 8(4)).

---

## Veredito

### **APROVA COM AJUSTES**

O plano do B-TRC-02 é denso, exaustivo e respeita com rigor as fronteiras arquiteturais estabelecidas no `PLANO_TRACCAR.md` e em `D-TRACCAR-HTTP-PRIVADO-AWS`: nenhuma rota sob `/api/v1` é aberta, o listener privado permanece isolado na porta 3200, a chave de evento é delivery-independente e determinística (não dependendo do `id` do banco do Traccar), as unidades seguem a convenção estrita de inteiros sem ponto flutuante, a telemetria veicular é completamente segregada de `telemetry_events` (app) e de `WorkOrder.mileage_*`, e as duas migrações são aditivas sob `ENABLE + FORCE ROW LEVEL SECURITY`.

Não foram identificadas falhas estruturais bloqueantes que justifiquem `VOLTA AO PLANO`. Contudo, identificam-se **7 achados de gravidade `ajuste`** — cobrindo lacunas de asserção em banco de dados na quarentena de eventos, ausência de testes específicos para payloads com atributos maliciosos contra o banco, falta de verificação do estouro de orçamento de descoberta para eventos, fragilidade na ordem dos comandos de rollback manual e mutações com assertividade defasada ou risco de corrida não determinística.

---

## Tabela Consolidada de Achados

| ID | Eixo do Mandato | Gravidade | Escopo | Descrição Resumida |
|---|---|---|---|---|
| **ACH-01** | 1. Regras do Dono | `ajuste` | `tests/traccar-event-ingestion-db.test.ts` (E5) | Quarentena de evento sem asserção de escrita real em `traccar_quarantine_items` |
| **ACH-02** | 1 e 2. Regras e Tenant | `ajuste` | `tests/traccar-event-ingestion-db.test.ts` / `sample-db` | Falta teste de `tenantId` malicioso injetado em `attributes` com persistência no banco |
| **ACH-03** | 1. Regras do Dono | `ajuste` | `tests/traccar-event-ingestion-db.test.ts` (Suite E) | Ausência de teste para `resolution_budget_exceeded` no fluxo de eventos |
| **ACH-04** | 3. Migração e Rollback | `ajuste` | `prisma/migrations/20260878000000_.../migration.sql` | Ordem dos comandos de reversão no cabeçalho da Migração A e ausência de limpeza no `_prisma_migrations` |
| **ACH-05** | 4. Régua e Mutações | `ajuste` | `docs/revisoes/TRACCAR/B-TRC-02-evidencias/mutations.mjs` (M-E08) | Mutação M-E08 formulada sobre campo inexistente em `vehicle_tracking_bindings` |
| **ACH-06** | 4. Régua e Mutações | `ajuste` | `docs/revisoes/TRACCAR/B-TRC-02-evidencias/mutations.mjs` (M-E16) | Mutação M-E16 testa violação estrutural de NOT NULL em vez da regra de negócio |
| **ACH-07** | 2 e 4. Idempotência e Testes | `ajuste` | `tests/traccar-event-ingestion-db.test.ts` (E4) / M-E10 | Teste E4 de concorrência sem barreira síncrona determinística |

---

## Achados Detalhados

### ACH-01 — Quarentena de evento sem asserção de escrita física em `traccar_quarantine_items`
- **Eixo do mandato:** 1. Regras do dono para o Traccar (não mapeado → quarentena).
- **Gravidade:** `ajuste`.
- **Escopo:** `tests/traccar-event-ingestion-db.test.ts` (caso E5) e `src/integrations/traccar/traccar-ingestion.service.ts`.
- **Comando que sustenta:**
  ```powershell
  git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios show origin/main:tests/traccar-quarantine-db.test.ts
  ```
  e a linha 659 de `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-TRC-02-plano.md`.
- **Fato medido:**
  No B-TRC-01, a quarentena possui uma suíte inteira de banco (`tests/traccar-quarantine-db.test.ts`, 13 testes) verificando a inserção real na tabela `traccar_quarantine_items` (`count === 1`, campos `first_fix_at`, `last_event_key`, `last_payload_digest`, e agregação de episódios via `delivery_count`).
  No B-TRC-02, o plano adapta `quarantineWithoutTenant` para receber `TraccarEventCommand` (via `toQuarantineSubject`), porém o único teste que valida o descarte de evento de dispositivo não mapeado é o caso E5 em `traccar-event-ingestion-db.test.ts`, cujo enunciado é:
  `"E5 dispositivo sem vínculo → 202 unmapped_device, 0 recibo, 0 linha;"`.
  O teste assere o status HTTP 202 e a ausência de recibos/linhas de telemetria, mas não assere a existência e os dados do registro criado na tabela `traccar_quarantine_items`. Caso a chamada de gravação de quarentena seja omitida ou lance exceção capturada silenciosamente, o caso E5 ainda passará. Além disso, nenhuma mutação do catálogo M-E01..M-E29 exercita a gravação de quarentena de eventos.

---

### ACH-02 — Falta de teste de integração no banco com `tenantId` injetado em `attributes`
- **Eixo do mandato:** 1. Regras do dono (nunca `tenant_id` do payload) e 2. Cross-tenant e RLS.
- **Gravidade:** `ajuste`.
- **Escopo:** `tests/traccar-event-contract.test.ts` (caso A8) e `tests/traccar-event-ingestion-db.test.ts` (caso E14).
- **Comando que sustenta:**
  ```powershell
  git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios show origin/main:tests/traccar-position-contract.test.ts | Select-Object -Skip 85 -First 15
  ```
  e as linhas 253-255, 651 e 659 de `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-TRC-02-plano.md`.
- **Fato medido:**
  No B-TRC-01, `position.attributes` era totalmente descartado pelo parser. No B-TRC-02, `position.attributes` passa a ser consumido pelo fluxo S para 7 grandezas veiculares, e `event.attributes.alarm` é consumido pelo fluxo E.
  O plano estabelece que chaves reservadas (`tenantId`, etc.) dentro de `attributes` não geram 422 (casos A8 e B3). O caso E14 testa apenas que `tenantId` no corpo de `event` (raiz) gera 422 e 0 escrita.
  Não há, contudo, nenhum teste de ponta a ponta contra o banco de dados (na Suite E ou Suite F) em que uma requisição traga `attributes: { tenantId: "uuid-da-org-b", ignition: true, odometer: 100 }` provando que o registro inserido em `vehicle_telemetry_events` vincula-se obrigatoriamente ao `tenant_id` da viatura associada ao vínculo ativo no ERP, e que a organização B permanece `0/0/0`.

---

### ACH-03 — Falta de teste para `resolution_budget_exceeded` na rota de eventos
- **Eixo do mandato:** 1. Regras do dono (ambíguo falha fechado; quarentena de proteção).
- **Gravidade:** `ajuste`.
- **Escopo:** `tests/traccar-event-ingestion-db.test.ts` (Suite E).
- **Comando que sustenta:**
  ```powershell
  git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios show origin/main:tests/traccar-resolution-cost.test.ts | Select-Object -Skip 135 -First 10
  ```
  e a linha 239 de `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-TRC-02-plano.md`.
- **Fato medido:**
  O plano lista em §2.4 `resolution_budget_exceeded` como um dos motivos duráveis de quarentena (HTTP 202) da nova rota `/ingest/traccar/v1/events`.
  Entretanto, na Suite E (`tests/traccar-event-ingestion-db.test.ts`, casos E1..E15), são testados `unmapped_device` (E5), `fix_before_active_binding` e `fix_in_future` (E6), e `tenant_inactive` (E7). O caso de estouro do limite de busca de organizações ativas (> 500 tenants, regra fail-closed mandatória de multi-tenant do Traccar) não foi incluído entre os cenários de teste da nova rota de eventos.

---

### ACH-04 — Inversão lógica na ordem do script de Rollback e ausência de limpeza no `_prisma_migrations`
- **Eixo do mandato:** 3. Migração aditiva com rollback real.
- **Gravidade:** `ajuste`.
- **Escopo:** `prisma/migrations/20260878000000_vehicle_telemetry_events/migration.sql` (comentário de rollback).
- **Comando que sustenta:**
  Linhas 356-361 de `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-TRC-02-plano.md`.
- **Fato medido:**
  O cabeçalho da Migração A prescreve o seguinte roteiro de rollback manual:
  ```sql
  -- ROLLBACK (manual, só em ambiente SEM dado real; nunca como rollback produtivo), em ordem reversa:
  --   -- só depois de provar zero recibos de evento: SELECT count(*) FROM traccar_ingress_receipts WHERE message_kind <> 'position' = 0
  --   ALTER TABLE "traccar_ingress_receipts" DROP CONSTRAINT "traccar_ingress_receipts_message_kind_check";
  --   ALTER TABLE "traccar_ingress_receipts" ADD CONSTRAINT "traccar_ingress_receipts_message_kind_check"
  --     CHECK ("message_kind" IN ('position'));
  --   DROP TABLE IF EXISTS "vehicle_telemetry_events";
  ```
  Na ordem reversa estrita de dependências DDL, a tabela dependente `vehicle_telemetry_events` (que possui FK referenciando `traccar_ingress_receipts`) deve ser eliminada antes da alteração de restrições na tabela referenciada.
  Além disso, o script de rollback não instrui a remoção dos registros correspondentes em `_prisma_migrations` para as migrações `20260878000000` e `20260879000000`, o que deixaria o catálogo de migrações do Prisma corrompido em caso de execução do drill de reversão manual.

---

### ACH-05 — Mutação M-E08 formulada sobre campo inexistente em `vehicle_tracking_bindings`
- **Eixo do mandato:** 4. Critério incapaz de falhar ou mutação que não derruba o teste.
- **Gravidade:** `ajuste`.
- **Escopo:** `docs/revisoes/TRACCAR/B-TRC-02-evidencias/mutations.mjs` (M-E08) e plano §6.1 l.637.
- **Comando que sustenta:**
  ```powershell
  git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios show origin/main:prisma/schema.prisma | Select-String -Pattern "model VehicleTrackingBinding" -Context 0,15
  ```
- **Fato medido:**
  A mutação M-E08 é descrita como: `"ingestEvent usa traccarDeviceId para achar a organização (pula a confirmação) → E5/E13"`.
  Na modelagem do banco de dados, `vehicle_tracking_bindings` armazena `external_device_key` (`device.uniqueId`), e **não** possui a coluna `traccar_device_id`.
  Se a mutação substituir a resolução do vínculo tentando mapear diretamente `traccarDeviceId` (que é numérico) como `tenantId`, a falha observada em tempo de execução será de formatação de UUID (HTTP 503) e não a falha semântica de autorização/isolamento prevista no teste E5 (que espera HTTP 202). No caso E13 (canário), para um dispositivo não mapeado para B, a consulta retornará vazio do mesmo modo, não provocando a quebra esperada.

---

### ACH-06 — Mutação M-E16 testa violação estrutural de NOT NULL em vez da regra de negócio
- **Eixo do mandato:** 4. Critério incapaz de falhar ou mutação que não derruba o teste.
- **Gravidade:** `ajuste`.
- **Escopo:** `docs/revisoes/TRACCAR/B-TRC-02-evidencias/mutations.mjs` (M-E16) e plano §6.1 l.641.
- **Comando que sustenta:**
  Linha 641 de `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-TRC-02-plano.md`.
- **Fato medido:**
  A mutação M-E16 propõe inserir a chamada `insertSample` dentro do helper `quarantined()` no fluxo de posição, esperando que o teste F3 falhe com 503 decorrente de violação da constraint `NOT NULL` de `receipt_id`.
  O teste F3 mede a propriedade: *"posição em quarentena por operador → 0 amostra, 0 recibo"*.
  Na quarentena, o recibo não existe por definição. Chamar `insertSample` forçando a passagem de `receipt_id` indefinido/nulo causa erro de banco no driver, em vez de avaliar a sensibilidade do código da regra de negócio (isto é: se a gravação de amostra ocorresse incondicionalmente no fluxo da posição antes do desfecho do operador).

---

### ACH-07 — Teste E4 de concorrência sem barreira síncrona determinística
- **Eixo do mandato:** 2. Idempotência sob corrida e 4. Sensibilidade de testes.
- **Gravidade:** `ajuste`.
- **Escopo:** `tests/traccar-event-ingestion-db.test.ts` (caso E4) e mutação M-E10.
- **Comando que sustenta:**
  ```powershell
  git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios show origin/main:src/integrations/traccar/traccar-ingestion.repository.ts | Select-String -Pattern "afterBindingLocked" -Context 0,10
  ```
  e as linhas 639 e 659 de `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-TRC-02-plano.md`.
- **Fato medido:**
  O caso E4 assere que duas entregas concorrentes do mesmo evento resultam em 1 recibo, 1 linha e ambas HTTP 204. A mutação M-E10 remove `ON CONFLICT DO NOTHING` para provocar erro 503 na entrega que perde a corrida.
  Contudo, se as duas requisições concorrentes forem disparadas via `Promise.all` simples sem travas de sincronização, em ambientes com event loop de thread única ou I/O serializado, a segunda requisição pode executar o passo 4 (`findReceipt`) somente após o commit da primeira, retornando 204 como `duplicate` sem jamais tentar o `insertReceipt` em conflito.
  O repositório já possui hooks de sincronização (`afterBindingLocked`, etc.) utilizados no B-TRC-01 para garantir corrida real no banco. O teste E4 não especifica o uso de hooks de barreira para garantir o determinismo da colisão.

---

## Avaliação dos 4 Eixos do Mandato

### 1. Regras do Dono para o Traccar
- **Nunca `tenant_id` do payload:** O parser rejeita chaves reservadas (`tenantId`, etc.) no envelope, em `event`, em `device` e em `position` (caso A7). A leitura de `attributes` restringe-se estritamente às 7 chaves veiculares permitidas e a `alarm`. *(Ressalva: ACH-02 aponta ausência de teste de banco com payload sujo).*
- **Não mapeado → quarentena:** Dispositivo sem vínculo ativo é roteado para quarentena `unmapped_device` com HTTP 202 (caso E5). *(Ressalva: ACH-01 aponta que a escrita física em `traccar_quarantine_items` não é asserida).*
- **Ambíguo falha fechado:** Vínculos ambíguos são prevenidos pela unicidade ativa global no PostgreSQL (`vehicle_tracking_bindings_active_device_key`). Discrepância entre `event.deviceId` e `device.id` falha fechado com 422 (caso A10). *(Ressalva: ACH-03 aponta ausência de teste para estouro de orçamento de descoberta).*
- **Token fora de log e em tempo constante:** Reuso estrito do autenticador de alta entropia do B-TRC-01 (`traccar-forward-auth.ts`) com `crypto.timingSafeEqual` e digest SHA-256. Sanitização total de logs provada nos casos D1..D4 com sentinelas.
- **Nenhuma porta pública:** O overlay `docker-compose.traccar.yml` mantém as portas 3200, 5055 e 8082 confinadas às redes internas `traccar_private` e `traccar_devices`. A rota `/ingest/traccar/v1/events` não existe em `src/app.ts` (testado no caso C2 com 404).

### 2. Idempotência, Ordem Temporal, Unidades, Tipos Desconhecidos, Cross-Tenant e RLS
- **Chave determinística se vier sem `id`:** A chave `external_event_key` é gerada por SHA-256 sobre `"v1|<instance_key>|<device.uniqueId>|<event.type>|<eventTime em ms UTC>|<alarm code ou vazio>"`. Não depende de `event.id`, nem de `positionId`, nem do relógio local do ERP. É 100% determinística e delivery-independente (provada no caso E12 contra reconciliação REST).
- **Evento atrasado e duplicado:** Reenvio idêntico retorna 204 sem reinserção (E2); reenvio com digest divergente retorna 409 (E3). O estado do dispositivo (`latestDeviceStatus`) é derivado estritamente por `occurred_at DESC` (E10), garantindo que eventos com entrega tardia não revertam o estado operacional mais recente.
- **Unidades:** Inteiros estritos e convenções normalizadas: `odometer_m` e `total_distance_m` em metros (`BigInt`), `engine_hours_s` em segundos (`BigInt`), `power_mv` em milivolts (`Int`), `battery_level_pct` em percentual 0..100 (`Int`). Nenhum tipo float ou Decimal utilizado.
- **Tipo desconhecido:** Tipos de eventos ou códigos de alarme fora do catálogo são descartados silenciosamente com HTTP 204 (`ignored`), sem escrita no banco, sem log do payload e sem disparar loops de retentativa no Traccar (casos A5, C10, E14).
- **Cross-tenant e RLS:** Tabela `vehicle_telemetry_events` criada sob `ENABLE ROW LEVEL SECURITY` e `FORCE ROW LEVEL SECURITY`, com política restrita a `current_setting('app.current_tenant_id')`. Três chaves estrangeiras compostas tenant-first com `ON DELETE RESTRICT` impedem qualquer referência cruzada entre organizações.

### 3. Migração Aditiva, Rollback e Disciplina de Escopo
- **Migração aditiva:** Duas migrações aditivas (`20260878000000` criando a tabela e alargando o CHECK do recibo como `NOT VALID`; `20260879000000` executando o `VALIDATE CONSTRAINT` em transação isolada, respeitando a regra de concorrência N2-06). Divergência com o §7 do `PLANO_TRACCAR.md` devidamente declarada e justificada.
- **Rollback real:** Drill de migração e rollback previsto no caso G9 em base de dados isolada. *(Ressalva: ACH-04 aponta necessidade de ordenação estrita e limpeza em `_prisma_migrations`).*
- **Escopo respeitado:** Zero modificações em `src/app.ts`, `frontend/**`, `mobile/**`, `notifications/**`, RBAC, `package.json` ou `Kpis/**`.
- **Integridade de OS:** Proibição explícita de escrita em `WorkOrder.mileage_*`, validada no teste F6 e na mutação M-E22 através de hash md5 da linha da ordem de serviço antes e depois da ingestão.

### 4. Régua de Testes, Critérios e Mutações
- **Cobertura:** 18 critérios (C-01 a C-18) mapeados individualmente para 73 novos testes em 8 arquivos (5 unitários/contrato, 3 de banco sob Postgres descartável e papel efêmero sem bypass).
- **Sensibilidade a mutações:** Catálogo com 29 mutações novas (M-E01 a M-E29) e re-execução de 12 mutações do B-TRC-01. Todas as mutações possuem âncora única e verificação de quebra de teste com TAP. *(Ressalvas: ACH-05, ACH-06 e ACH-07 apontam refinos necessários em M-E08, M-E16 e E4/M-E10).*
- **Transparência de métricas:** O planejador declarou abertamente o déficit de M (222 previstos vs 298 da meta teórica 2N) em vez de inflar testes tautológicos, autorizando 52 subcasos gerados do catálogo para fechamento formal caso exigido pela junta.

---

## Conclusão do 2º Crítico

O plano está **aprovado para implementação com a incorporação dos ajustes apontados**. Os achados ACH-01 a ACH-07 reforçam as garantias mecânicas de segurança, a estabilidade das mutações e a cobertura de banco de dados, sem alterar a arquitetura, o modelo de dados ou os contratos já desenhados pelo planejador-mestre.

ENTREGA-CONCLUIDA
