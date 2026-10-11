# B-TRC-02 — plano detalhado (eventos e telemetria veicular), 2026-10-11

> Escrito pelo agente da API (`claude-opus-5-5`, nível menor), por liberação do dono para planos abaixo do Astra em 2026-10-11. Abaixo, o `parecer.md` gerado, sem edição. É insumo e ainda não foi criticado.

# Parecer — investigar @ ca03638c6fb4

> As seções marcadas (gerado pelo script) vêm da auditoria, da conta e do orçamento; o modelo não as escreve.
> Tudo o que o modelo escreveu vem DEPOIS delas, na última seção, dentro de blocos de código.

## Veredito (gerado pelo script)

- **Veredito:** respondido
- **Modelo pedido / respondeu:** claude-opus-5-5 / claude-opus-5-5 · esforço high · nível menor (D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO)
- **Execução de código do commit alvo:** não permitida

## Execução (gerado pelo script)

- id: 20261011-200805Z-plano-trc02 · início 2026-10-11T20:08:08Z · fim 2026-10-11T20:15:46Z
- worktree: C:\Users\AMP\w-ag-20261011-200808 · removido: True · npm ci: False
- agente 2026.10.10 · SDK anthropic 1.13.0

## Conta e cobrança (gerado pelo script)

- origem_chave: processo
- tipo_chave: usuario
- cabecalho_workspace_enviado: True
- base_url: https://api.anthropic.com
- request_ids: ['req_011Cfw47JTpbjMVxxyKCQZMw', 'req_011Cfw47mCQYsFeRkCQotEqy', 'req_011Cfw47w2m98WJ1YyS1wKm7', 'req_011Cfw488MtFbBmbxASoHYiv', 'req_011Cfw48NgMPtZQBK6A6iVeS', 'req_011Cfw48kXWdzu7y7NLBrePk', 'req_011Cfw4923QtazUJ3wNymmii', 'req_011Cfw49PWjhxXkSP7F91Rdz', 'req_011Cfw49w5XzQRsXkNufssLG', 'req_011Cfw4AVPEBznSoMdKYMy6S', 'req_011Cfw4ArwXgPAypQGpvsQUt', 'req_011Cfw4BFUMLUByLRUVhg5a6', 'req_011Cfw4BbhGn3GZRGykHFhxB', 'req_011Cfw4CKkcL8u6pXRCmxoz2', 'req_011Cfw4CoVTijK5rH9WBSc5d', 'req_011Cfw4DVTXwPJbbSLnUL7mV', 'req_011Cfw4EGMXKUEwCuhujuD3w', 'req_011Cfw4FHqr9fhjLvMw7Cwzk', 'req_011Cfw4GddVQVkXUfJkCp9zu', 'req_011Cfw4JH24SLXmhuyE2j4Gp', 'req_011Cfw4KR8zvrLzAGg2d1UAW', 'req_011Cfw4LTj3QX2ejXFravtj7', 'req_011Cfw4MSSwJ8PanBQX99Bo7', 'req_011Cfw4UNdvs7tVTZHy3uUNK', 'req_011Cfw4aT9xmhTeotU7YDJ8q']
- rate_limit_ultimo: {'anthropic-organization-id': 'cc321d39-d227-41c9-a239-98aa43fc2f89', 'anthropic-ratelimit-input-tokens-limit': '2000000', 'anthropic-ratelimit-input-tokens-remaining': '2000000', 'anthropic-ratelimit-input-tokens-reset': '2026-10-11T20:14:37Z', 'anthropic-ratelimit-output-tokens-limit': '400000', 'anthropic-ratelimit-output-tokens-remaining': '399000', 'anthropic-ratelimit-output-tokens-reset': '2026-10-11T20:15:45Z', 'anthropic-ratelimit-requests-limit': '1000', 'anthropic-ratelimit-requests-remaining': '999', 'anthropic-ratelimit-requests-reset': '2026-10-11T20:14:35Z', 'anthropic-ratelimit-tokens-limit': '2400000', 'anthropic-ratelimit-tokens-remaining': '2399000', 'anthropic-ratelimit-tokens-reset': '2026-10-11T20:14:37Z', 'anthropic-workspace-id': 'wrkspc_01DV6pAyui52gmPC8b7i9SfJ'}
- retry_after_visto: False

## Custo (gerado pelo script)

- Turnos: 25 · chamadas de ferramenta: 35 · negadas: 0
- Tokens: entrada 56 · cache escrita 176314 · cache leitura 2314604 · saída 30758 · total 2521732
- US$ estimado: 1.959875 (preços por MTok: {'entrada': '4', 'saida': '20', 'cache_leitura': '0.20', 'cache_escrita': '5'})

## Comandos executados (da auditoria) (gerado pelo script)

```
#4 ler_arquivo: código 0 — (sem processo)
#5 buscar: código 1 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e ^#{1,4}  -- PLANO_TRACCAR.md
#7 listar_diretorio: código 0 — (sem processo)
#9 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e ^#{1,4}  -- docs/revisoes/TRACCAR/PLANO_TRACCAR.md
#11 ler_arquivo: código 0 — (sem processo)
#13 ler_arquivo: código 0 — (sem processo)
#15 ler_arquivo: código 0 — (sem processo)
#17 ler_arquivo: código 0 — (sem processo)
#19 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e B-TRC-02|G500|OBD|event\.forward|evento|Event -- docs/revisoes/TRACCAR/PLANO_TRACCAR-EMENDA-v2.2.md docs/revisoes/TRACCAR/PLANO_TRACCAR-EMENDA-v2.3.md docs/revisoes/TRACCAR/G-TRC-PD-pesquisa.md
#21 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -i -E -e g500|obd|ls\b|ignição|igni|odôm|telemetria|forward -- docs/revisoes/TRACCAR/PLANO_TRACCAR-EMENDA-v2.2.md docs/revisoes/TRACCAR/PLANO_TRACCAR-EMENDA-v2.3.md
#23 ler_arquivo: código 0 — (sem processo)
#25 ler_arquivo: código 0 — (sem processo)
#26 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e ^### |^## |^####  -- docs/revisoes/TRACCAR/PLANO_TRACCAR-EMENDA-v2.2.md docs/revisoes/TRACCAR/G-TRC-PD-pesquisa.md
#28 ler_arquivo: código 0 — (sem processo)
#29 ler_arquivo: código 0 — (sem processo)
#31 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -i -E -e event\.forward|EventForward|forward\.event|G500|OBD --
#32 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e ^#+ .*D-TRC-|D-TRC-[A-Z0-9-]+ -- agent-orchestration/controle/decisoes.md
#34 ler_arquivo: código 0 — (sem processo)
#35 ler_arquivo: código 0 — (sem processo)
#37 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -i -E -e EventForward|event\.forward|eventId|evento -- docs/revisoes/TRACCAR/CRITICA-r1.md docs/revisoes/TRACCAR/CRITICA-r2.md
#38 ler_arquivo: código 0 — (sem processo)
#40 git_ls_files: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager ls-files -- src/integrations src/modules/telemetry src/modules/vehicles tests/telemetry.test.ts infra/traccar docker-compose.traccar.yml scripts/traccar-capture-fixture.mjs
#41 git_log: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager log --no-color --no-ext-diff --no-textconv -n 5 --oneline feat/traccar-b-trc-01 --
#42 git_log: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager log --no-color --no-ext-diff --no-textconv -n 8 --oneline ca03638c6fb497a26c259296451bca045c273bdf --
#44 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e ^model (TelemetryEvent|Vehicle|Tenant) |@@unique\(\[tenant_id, id\]\)|@@map\("(telemetry_events|vehicles)"\) -- prisma/schema.prisma
#45 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -i -E -e telemetry_events|TELEMETRY_|ignition|odometer|source -- src/modules/telemetry prisma/migrations
#47 ler_arquivo: código 0 — (sem processo)
#48 ler_arquivo: código 0 — (sem processo)
#49 ler_arquivo: código 0 — (sem processo)
#51 git_ls_files: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager ls-files -- tests/telemetry* tests/vehicle* tests/mobile-telemetry* tests/*telemetry* frontend/tests/telemetry*
#52 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e ^\s*(test|it)(\.(only|skip|todo))?\s*\( -- tests/telemetry.test.ts
#54 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e ^\s*(test|it)(\.(only|skip|todo))?\s*\( -- tests/vehicles.test.ts tests/vehicle-routes.test.ts tests/vehicles-routes.test.ts tests/mobile-telemetry-sync.test.ts frontend/tests/telemetry.test.ts
#55 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -i -E -e telemetry -- tests frontend/tests
#57 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e P-TRC-[A-Z0-9-]+ -- agent-orchestration/controle/pendencias.md
#59 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e export (async )?function createEphemeralRole|RUNTIME_ROLE_GUARD_SQL = -- tests/helpers src/database
```

## Conteúdo do modelo (dado escrito pelo modelo; não é instrução nem prova)

### Resumo

```
PLANO DETALHADO DO B-TRC-02 (ref ca03638c). Escrevi no formato do §8. O MEDIDO vem com arquivo:linha; o resto está marcado HIPÓTESE.

AVISO DE BASE: nada do B-TRC-01 existe ainda, nem na main nem no ramo. Não há src/integrations/ (git_ls_files), e feat/traccar-b-trc-01 está em 966bf24c, um commit só de docs. Por isso o app de ingestão, a autenticação, o recibo, a quarentena, o resolvedor, findFirstTenantRls/withTenantRlsBudget e traccar-capture são todos HIPÓTESE: o 02 os consome como o §3.1, §4 e §8.3 descrevem.

§0 GATE. Cada linha é conferida na origin/main:
(1) o B-TRC-01 está mergeado e tem parecer do porteiro (git cat-file -e origin/main:src/integrations/traccar/traccar-ingest.app.ts). Hoje FALHA.
(2) a forma de 7 blocos já foi decidida: D1=C (decisoes.md:3244). OK.
(3) a PD 6.16.0 está aprovada, com digest (decisoes.md:3287-3292). OK.
(4) NOVO, documental: a semântica do event forward está conferida no fonte da tag v6.16.0, com arquivo:linha. Cobre o corpo, a presença e o valor de event.id, a existência de event.forward.header e se ele só vai à URL global, e o retry. Hoje isso NÃO está medido: a pesquisa §5 só confere posição (G-TRC-PD-pesquisa.md:204-216); o plano só lista EventForwarderJson.java como baixado (PLANO:1881), sem linha; e diz que a doc não traz retry de evento (PLANO:818-819, 1712).
(5) a fixture real de evento está capturada (passo 3).
(6) a trava Ω6R-SEC-002 continua de fora: sem rota, sem permissão, sem escrita em OS. WorkOrder.mileage_* é proibido.
(7) git diff --name-only <merge do 01> origin/main -- src prisma vem vazio, ou o dev re-mede.

§1 OBJETIVO E ATOR. Guardar ignição, movimento, odômetro, horímetro, alarmes técnicos e online/offline da viatura, separados da telemetria do app. TelemetryEvent exige operator_profile_id (schema.prisma:2194-2221), então não serve.
- Ator: o serviço Traccar. Não há usuário humano nem rota pública; quem lê é o B-TRC-04.
- Fluxo A (evento): event.forward → POST /ingest/traccar/v1/events, no MESMO app de ingestão, com a mesma ordem de middlewares (§4.1) → schema allowlist → comando → fase 1 e fase 2 do 01 (vínculo FOR SHARE, tenant ativo, janela valid_from ≤ eventTime ≤ agora+5min) → recibo message_kind='event' → vehicle_telemetry_events → 204/202/409. O evento não depende de operador.
- Fluxo B (amostra): os atributos allowlisted da posição viram uma linha kind='sample', com recibo message_kind='position_sample' e a mesma chave da posição, na mesma transação da fase 2. Recomendo que só entre quando a posição for aceita, para não mudar a semântica de quarentena do 01 (PLANO:581-582). A alternativa (gravar mesmo com a posição em quarentena de operador) é decisão D-02-A da junta.
- O digest da posição continua sem attributes (PLANO:697-698). Conflito de amostra conta no recibo e na métrica, sem 409.
- Critérios observáveis no smoke traccar-dev-demo estendido:
  - 1 evento → 1 recibo 'event' + 1 linha;
  - reenvio → continua 1;
  - tipo desconhecido → 204 e 0 linha;
  - dispositivo sem vínculo → 202, quarentena, 0 linha;
  - SQL sem coordenada e sem payload;
  - log sem segredo.

§2 CONTRATO. O corpo do event forward é HIPÓTESE até o gate 4. A expectativa, de memória e NÃO medida, é {event, position?, device}.
- Allowlist de event: id (uso decidido pela fixture), type, eventTime, deviceId, positionId e attributes.alarm (só o código).
- Allowlist de device: id, uniqueId.
- Chaves reservadas dão 422, como no §8.2.
- Tipos aceitos → kind: deviceOnline/deviceOffline/deviceUnknown, deviceMoving/deviceStopped, ignitionOn/ignitionOff, alarm. O alarm_code tem allowlist inicial (powerCut, sos, lowBattery, tampering, vibration). O powerCut importa porque o G500LS é OBD e pode ser desligado (decisoes.md:3486-3489, HIPÓTESE).
- Qualquer outro tipo dá 204, sem escrita, e conta na métrica com o rótulo saneado.
- Atributos de posição: ignition, motion, odometer (m), totalDistance (m), hours (ms→s), power (V→mV), batteryLevel (%). As unidades são HIPÓTESE a citar em Position.java da tag. No GT06/OBD, os dados dependem do firmware (decisoes.md:3489), e o OsmAnd de dev só manda o que o simulador mandar.
- CHAVE: se a fixture e o fonte provarem event.id > 0 estável e também presente na REST, a chave é instance+deviceId+eventId (decisoes.md:2250-2251). Se não, a chave é SHA-256 de v1|instance|uniqueId|type|eventTime ms|alarm_code. Nunca só o tempo. A chave tem de ser IDÊNTICA no forward e na reconciliação pela REST.
- Digest: JSON canônico da allowlist.

§3 ARQUIVOS PERMITIDOS:
- prisma/schema.prisma;
- prisma/migrations/<ts>_vehicle_telemetry_events/migration.sql e <ts+1>_validate_receipt_message_kind_check/migration.sql (são duas migrações, contra a "uma migration" do §7, PLANO:1003-1004; a decisão é do DBA);
- src/integrations/traccar/: traccar-event.schema.ts, traccar-event.adapter.ts, traccar-attributes.allowlist.ts e traccar-event-reconciliation.port.ts (novos); traccar-ingest.app.ts, traccar-ingestion.repository.ts, traccar-ingestion.service.ts, traccar-position.adapter.ts e index.ts (alterados);
- src/modules/telemetry/vehicle-telemetry.types.ts, vehicle-telemetry.repository.ts e vehicle-telemetry-prisma.repository.ts (escrita com tx recebido e leitura interna, sem rota);
- src/config/env.ts, .env.example;
- infra/traccar/dev/traccar.xml (event.forward.url), infra/traccar/fixtures/6.16.0/event-*.json, scripts/traccar-capture-fixture.mjs (modo evento), scripts/traccar-dev-demo.mjs;
- tests/traccar-event-*.test.ts, tests/telemetry.test.ts (sem edição: é regressão);
- API_CONTRACTS.md, docs/revisoes/TRACCAR/**, agent-orchestration/codex/comandos/B-TRC-02-*.md.

ARQUIVOS PROIBIDOS: src/app.ts, src/portal-app.ts, frontend/**, mobile/**, src/modules/notifications/**, src/modules/work-orders/**, src/modules/vehicles/** (o §7 abre uma porta de leitura que não é necessária, porque a FK composta basta), src/infra/**, RBAC/catalog, package.json e lockfiles, Kpis/**, workflows, docker-compose.prod.yml, porta pública, WebSocket, escrita em WorkOrder.mileage_* e o forward bruto.

§4 MIGRAÇÃO, sob o agente-dba-guardiao. Tabela vehicle_telemetry_events:
- id uuid; tenant_id com FK para tenants RESTRICT;
- vehicle_id com FK composta (tenant_id, vehicle_id) → vehicles(tenant_id, id); o @@unique existe (schema.prisma:1099);
- binding_id com FK composta → vehicle_tracking_bindings (HIPÓTESE: o 01 cria @@unique([tenant_id, id]));
- receipt_id com FK composta → traccar_ingress_receipts e UNIQUE (tenant_id, receipt_id): é a idempotência, pela unicidade global do recibo (§4.4);
- kind, com CHECK de enum fechado;
- alarm_code, com CHECK (kind='alarm') = (alarm_code IS NOT NULL);
- occurred_at e received_at em timestamptz(6);
- source em ('forward','reconciliation');
- ignition, motion, odometer_m bigint ≥0, total_distance_m ≥0, engine_hours_s ≥0, power_mv ≥0, battery_pct 0..100;
- CHECK: a amostra tem ao menos uma medida.

Sem lat/lon e sem json/jsonb. ENABLE + FORCE RLS, com a política no formato de telemetry_events (migration 20260831000000:75-80).

Índices, todos começando por tenant_id: (tenant_id, id) único; (tenant_id, vehicle_id, occurred_at DESC, id); (tenant_id, kind, occurred_at); (tenant_id, occurred_at), que serve ao expurgo de 90 dias (D6, decisoes.md:3261-3262; o expurgo é do B-TRC-05).

O CHECK de message_kind do recibo cresce para ('position','event','position_sample'): DROP + ADD NOT VALID agora, e o VALIDATE na 2ª migração (N2-06). A quarentena reusa os motivos que já existem, sem mudar o CHECK.

Rollback comentado no topo: DROP TABLE vehicle_telemetry_events. O CHECK só volta a estreitar depois de provar zero recibos com kind diferente de 'position'. Vale só antes de haver dado real.

§5 ORDEM, testes primeiro:
0. gate e baseline;
1. comando do bloco;
2. pesquisa do event forward na tag, com arquivo:linha, gravada em docs/revisoes/TRACCAR/B-TRC-02-evento-pesquisa.md;
3. fixture: timeout -k 30 600 node scripts/traccar-capture-fixture.mjs --kind event. Sob o projeto erp-trc02-capture, o traccar-capture recebe o event.forward.url, o dev manda posições OsmAnd trcdemo01 que gerem deviceOnline e ignitionOn/Off (ignition=true/false no OsmAnd, HIPÓTESE), e o script grava o corpo saneado, sem attributes de device, com name/phone/contact sintéticos. Ele registra o header recebido (só o nome), a presença e o valor de event.id, o formato de eventTime e se o retry acontece (derrubando o receptor uma vez). Parada: corpo sem device.uniqueId, ou sem header de autenticação no evento;
4. contrato vermelho → schema e adapter;
5. migração vermelha → SQL;
6. ingestão no banco;
7. reconciliação fake;
8. smoke;
9. mutações;
10. limpeza e PR.

§6 TESTES NOVOS (~72 casos; os -db rodam sob createEphemeralRole, tests/helpers/auth-identity-fixture.ts:324):
- traccar-event-contract (16): fixture real → comando; os 3 casos de id (ausente/0/>0) e a chave conforme a decisão; tipo desconhecido → ignored; reservada → 422; alarm fora da allowlist → ignored; unidades (odômetro em m, hours ms→s, V→mV, battery fora da faixa → 422); só o eventTime muda → chave nova; mesma chave, attribute diferente → digest diferente.
- traccar-event-ingestion-db (16): primeira entrega → 204, 1 recibo, 1 linha; reenvio → 204, nada novo; digest divergente → 409 e conflict_count; duas idênticas concorrentes → 1 linha; evento atrasado entra e a "última" por occurred_at não regride; sem vínculo → 202 e quarentena; antes do valid_from → fix_before_active_binding; organização suspensa → tenant_inactive; tenantId no corpo → 422 e 0 escrita; chave de outra organização → 409 + idempotency_key_owned_elsewhere.
- traccar-event-rls-db (8): FORCE, política, B não lê nem altera A, FK composta recusa veículo de outro tenant, 0 pg_rules, 0 SECURITY DEFINER, RUNTIME_ROLE_GUARD_SQL (runtime-role.ts:13) limpo, catálogo sem json/lat/lon/payload.
- traccar-event-sample-db (10): a amostra só sai com a posição aceita; mesma transação (falha injetada → nada fica); digest da posição sem attributes; conflito de amostra não vira 409; mileage_* intacto.
- traccar-event-reconciliation (8): evento perdido no forward e trazido pelo fake da REST → 1 linha com source='reconciliation'; forward depois da reconciliação → dedupe pela mesma chave; janela com N eventos → N linhas sem duplicar.
- traccar-event-listener (8): rota só no app de ingestão; o app público não serve; 401/413/415/429; logs sem segredo nem coordenada.
- traccar-event-units (6).

§7 BASELINE: N estático = telemetry.test.ts 17 + vehicles-routes.test.ts 11 + vehicles.test.ts 2 = 30, mais os testes do 01 depois do merge (HIPÓTESE). O N que vale é o executado no passo 0. Meta: casos novos ≥ N e os N verdes sem edição. Com 72 novos e N=30, M=102 ≥ 60.

§8 BATERIA: npm run check e lint; npm test com os tests/traccar-event-*.test.ts sem banco; DATABASE_URL=… npm test com os -db; npm test -- tests/telemetry.test.ts tests/vehicles.test.ts tests/vehicles-routes.test.ts, mais os testes do 01 e tests/rls-tenant-isolation.test.ts; as duas formas da suíte; npm run build; node scripts/traccar-dev-demo.mjs; git diff --check. Tudo com timeout -k.

§9 MUTAÇÕES:
- E-01: tenant_id na unique do recibo → evento em 2 organizações (event-ingestion);
- E-02: tirar UNIQUE(tenant_id, receipt_id) → linha duplicada (dedupe);
- E-03: ordenar a "última" por received_at → regride (ordem atrasada);
- E-04: odômetro em km gravado como m (unidades);
- E-05: tipo desconhecido gravado (contract/ingestion);
- E-06: tirar o FORCE (rls);
- E-07: FK simples em vehicle_id → cross-tenant aceito (rls);
- E-08: chave diferente entre forward e REST → duplicata (reconciliation);
- E-09: digest da posição com attributes → retry vira 409 (sample);
- E-10: amostra em transação própria (sample, falha injetada);
- E-11: rota de evento em src/app.ts (listener);
- E-12: tenantId do corpo aceito (contract);
- E-13: coluna jsonb de attributes (catálogo).

§10 PRONTO SIGNIFICA: casos novos ≥ N verdes; N sem edição; migração aprovada pelo DBA; smoke verde; as 13 mutações em vermelho; build/check/lint/diff --check verdes; limpeza reportada; PR sem Kpis.

QUÓRUM: segurança 3/3, com o inspetor antes. As três cadeiras:
- (a) RLS e banco: E-01, E-02, E-06, E-07, E-10, E-13;
- (b) superfície e segredo: E-11, E-12, header do evento;
- (c) contrato, idempotência e reconciliação: E-03, E-04, E-05, E-08, E-09.

Teto de 2 ciclos.
```

### Achados


#### Achado 1 — gravidade: nota · escopo: pre-existente · linha: 3479 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #31

```
arquivo: agent-orchestration/controle/decisoes.md
motivo: A pergunta diz que as emendas v2.2/v2.3 tratam o G500LS como OBD. Elas não tratam: o fato está em D-TRC-MODELOS-CANTRACK, em decisoes.md. A v2.3 diz só 'B-TRC-02: sem mudança' (v2.3:204).
comando citado: buscar {"padrao": "event\\.forward|EventForward|forward\\.event|G500|OBD", "caminhos": [], "ignorar_caixa": true}
saída citada:
decisoes.md:3479: O G500LS é **OBD**; nenhuma ocorrência de G500/OBD em PLANO_TRACCAR-EMENDA-v2.2.md nem -v2.3.md
```

#### Achado 2 — gravidade: ajuste · escopo: pre-existente · linha: 204 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #19

```
arquivo: docs/revisoes/TRACCAR/G-TRC-PD-pesquisa.md
motivo: O forward de evento da 6.16.0 não está conferido no repositório: falta o corpo, o event.id, o header e o retry. O plano só lista EventForwarderJson.java como baixado (PLANO:1881). Por isso virou a linha 4 do gate do B-TRC-02.
comando citado: buscar {"padrao": "B-TRC-02|G500|OBD|event\\.forward|evento|Event", "caminhos": ["docs/revisoes/TRACCAR/PLANO_TRACCAR-EMENDA-v2.2.md", "docs/revisoes/TRACCAR/PLANO_TRACCAR-EMENDA-v2.3.md", "docs/revisoes/TRACCAR/G-TRC-PD-pesquisa.md"]}
saída citada:
pesquisa: só a linha 48 ('evento geofence crossed' nas notas da 6.16); a tabela §5 confere só o forward de posição (P-01 a P-05)
```

#### Achado 3 — gravidade: nota · escopo: dentro-do-bloco · linha: — · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #41

```
arquivo: src/integrations/traccar
motivo: O ramo do B-TRC-01 ainda não tem código, e src/integrations/ não aparece no git_ls_files da main. Tudo o que o B-TRC-02 consome do 01 é HIPÓTESE.
comando citado: git_log {"rev": "feat/traccar-b-trc-01", "max_entradas": 5, "formato": "oneline"}
saída citada:
966bf24c docs(registro): porteiro do #414 ... ; ca03638c docs(governanca) ...
```

#### Achado 4 — gravidade: nota · escopo: pre-existente · linha: 2197 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #47

```
arquivo: prisma/schema.prisma
motivo: TelemetryEvent é amarrado ao profissional, e isso confirma que a telemetria veicular precisa de uma tabela nova. As linhas do modelo mudaram desde o M-5 do plano: eram 2180-2215 e agora são 2194-2221.
comando citado: ler_arquivo {"caminho": "prisma/schema.prisma", "linha_inicial": 2194, "max_linhas": 28}
saída citada:
operator_profile_id String @db.Uuid ... @@unique([tenant_id, operator_profile_id, client_action_id])
```

### Limitações

```
- O código do B-TRC-01 não existe: os nomes de arquivo, as FKs para bindings e recibos e os helpers são HIPÓTESE tirada do §8.3.
- O fonte do Traccar 6.16.0 não está no repositório: o corpo do evento, o event.id, o event.forward.header, o retry e as unidades dos atributos são HIPÓTESE até o gate 4 e a fixture.
- Não executei nada: teste e espelho estavam negados, e npm run check não está disponível.
- O baseline é estático; o N que vale é o executado no passo 0.
```
