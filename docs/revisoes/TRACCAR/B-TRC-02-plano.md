# B-TRC-02 — eventos e telemetria veicular do Traccar: PLANO v2 (depois da crítica r1)

> **Papel:** `planejador-mestre` (identidade nova: `planejador-trc02-v2-fable`). **Modelo:** **Fable 5.1 (`claude-fable-5-1`)**, o do
> frontmatter (`D-PLANEJADOR-MODELO-FABLE`). **Sem fallback acionado.** Devolução de **crítico** não aciona o topo (§C7.4); o papel
> roda em Fable por padrão, e foi assim que o orquestrador o invocou.
> **Data:** 2026-10-19. **Ref medida (§A7):** `origin/main` = `3fbcaea2ba3cd1d39a42ff8943a2cc0086ef010d` (`git fetch -q origin` feito
> antes; a **mesma** ref da v1 e das duas críticas; head = #445; o B-TRC-01 = #426, `c1485c94`).
> **A v1 foi preservada ANTES de qualquer escrita:** `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-TRC-02-plano-v1.md`
> (`cp -n`; md5 dos dois arquivos no momento da cópia = `25af2552592735c59ce54396f215db0f`, 104 678 bytes, 890 linhas por `wc -l`).
> **Entradas:** a v1; a crítica Opus (`revisoes/B-TRC-02-critica-r1-opus.md`, **VOLTA AO PLANO**, 4 `bloqueia` + 12 `ajuste`); a
> crítica Gemini Flash (`revisoes/B-TRC-02-critica-r1-flash.md`, **APROVA COM AJUSTES**, 7 `ajuste` — tratada como 2ª opinião: não
> viu os 4 `bloqueia`); as respostas do dono (`planos/B-TRC-02-respostas-do-dono.md`: **Q1, Q2 e Q3 = SIM**), já registradas na ref
> como `D-TRC02-RESPOSTAS` (`decisoes.md:3783-3786`). **Atenção:** o orquestrador devolveu a Q1 e a Q2 ao dono com o contexto que a
> crítica pediu (A-14: decisão 4 "privacidade vem antes de cobertura" + `P-TRC-LGPD` ABERTA; A-15: `auth_login_candidates` é
> `SECURITY DEFINER` e lê todas as organizações). **O dono pode mudar a Q1 para NÃO.** Por isso o caminho da Q1 = SIM vive numa
> **seção isolada e removível (§Q1)**, com a lista exata do que sai se a resposta virar NÃO.
> **Regime:** bloco de **ingestão do Traccar** = junta completa de SEGURANÇA (inspetor + 3 cadeiras, unanimidade com veto, §C7 item
> 8(4)), teto de 2 ciclos (8(2)); `agente-dba-guardiao` na migração; KPI congelado (8(5)).
> **Separação de papéis (§C7.4-bis):** este planejador não desenvolve, não vota e não ocupa cadeira. Quem desenvolve é identidade nova,
> nível menor declarado (`D-IAS-EXTERNAS-PRIMEIRO`). Os dois críticos da r1 (`critico-trc02-opus`, `critico-trc02-flash`) acharam, logo
> **não planejam, não desenvolvem e não ocupam cadeira** neste bloco.
> **Onde medi:** só por `git show origin/main:<caminho>` / `git ls-tree` / `git grep … origin/main` (nada do disco da sessão, que
> está em `684e9afd`, 2 commits atrás) e pelo `Config.java` da tag `v6.16.0`, baixado por `curl` para o scratchpad da sessão. **Nada
> executado contra banco, Docker ou portas; nada editado no repositório; nenhum commit; sem `tail -f`.**
> **Como ler esta v2:** ela é **autossuficiente como norma** — tudo o que o dev e a junta precisam está aqui. A v1 fica como **registro
> de medição** (os fatos S-E1..S-E14 e F-R1..F-R9 com `arquivo:linha`, que esta v2 não repete por extenso) e, onde a v1 e a v2 divergirem,
> **vale a v2**. Toda mudança de alvo em relação à v1 está declarada em **§2**.
> **Gravado seção a seção (P1).** Estado ao fim de cada fatia no fecho do arquivo (§13).

---

## Resumo para quem decide (1 minuto)

- **Os 4 `bloqueia` da crítica Opus foram aceitos e resolvidos no desenho**, cada um com teste novo e mutação nova que o deixa vermelho:
  - **A-01 (teardown dos arnês do 01 × FK `RESTRICT`):** a v1 prendia os dois lados ("14 arquivos byte a byte" **e** FK `RESTRICT`).
    A v2 **declara a mudança de alvo**: os **5 arnês `-db` do 01** ganham **uma linha** cada (`"vehicle_telemetry_events"` no início da
    lista de limpeza — a lição "TEARDOWN FK-SAFE" que o repositório já tinha em `rls-tenant-isolation.test.ts:1906`); a FK continua
    `RESTRICT`; os outros **9** arquivos de teste do 01 seguem byte a byte; e um teste estático (H9) e uma mutação de arnês (M-E43)
    impedem que o próximo bloco repita o defeito.
  - **A-02 (parser aceita o que o banco recusa → 503 da posição):** domínio **fechado por coluna**, numa única fonte
    (`vehicle-telemetry.bounds.ts`), citado literalmente no CHECK da migração — `power` em 0..1000 V, horímetro e distâncias ≤ 2^53−1,
    bateria arredondada e só então 0..100 —, tabela de borda B9 (parser) + F9 (banco) e, **por construção**, a amostra passa a ser uma
    **sub-transação por `SAVEPOINT`** (precedente no próprio repositório: `src/modules/auth/services/identity-resolver.ts:49-77`): uma
    amostra recusada pelo banco **nunca** derruba a localização nem o recibo (F10, M-E32).
  - **A-03 (segredo em `event.forward.header` sem guarda):** teste H6 com regex que casa **qualquer** `key` terminada em
    `forward.header` no `traccar.xml` e qualquer literal do nome do header fora de interpolação `${…:?}` no compose; mutação M-E33.
    De quebra, a **H-2 deixou de ser hipótese**: `Config.java:140-141` da tag mapeia `event.forward.header` → `EVENT_FORWARD_HEADER`.
  - **A-04 (Q1 = SIM sem caminho):** **§Q1**, seção isolada e removível, com o desenho (recibo `position_sample`; `fix_key` + índice
    único parcial = **"um fix → uma amostra" é propriedade do banco**, não do código; **nenhum** 2º índice global, a premissa da v1
    caiu na medição), a lista fechada dos **3** motivos que guardam amostra e dos **7** que não guardam, o contrato de resposta
    (202 inalterado; digest ≠ conta em `conflict_count`; chave de outra organização = 409 como no 01), a atomicidade (savepoint), 7
    testes e 6 mutações — e **a lista exata do que sai se o dono disser NÃO**.
- **Dos 12 `ajuste` do Opus:** 11 aceitos, 1 contestado em parte (A-08: aceito que E12 era tautológico; contestada a leitura de que o
  plano "afirmava" a independência — reclassificado como hipótese H-11 do B-TRC-03). **Dos 7 do Flash:** 4 aceitos, 3 duplicados do
  Opus (ACH-02 = A-10; ACH-04 = A-13; ACH-05 = A-10).
- **Mudanças de alvo declaradas (§2): 12.** As principais: limitador **por rota** (dois buckets, mesmos valores de ambiente, sem
  variável nova); chave do evento ganha a **coordenada da posição anexada** (quando há posição) — dois eventos no mesmo ms com
  coordenadas distintas deixam de colidir; FK **de 4 colunas** para o recibo (`tenant_id, receipt_id, vehicle_id, binding_id`) com um
  índice único novo em `traccar_ingress_receipts` — a linha de telemetria não pode apontar para a viatura V2 com o recibo de V1;
  desempate do estado por **precedência fechada** (offline > sem sinal > online), nunca por `received_at`; `GRANT` da Q2 **só** no
  roteiro do demo, com teste H7 e o guard 8 re-executado.
- **Perguntas ao dono: nenhuma nova.** As três estão respondidas (`D-TRC02-RESPOSTAS`); a Q1 pode mudar e o plano já carrega as duas
  formas.
- **Critérios: 25 (+3 só se Q1 = SIM). Testes novos previstos: 94 `test()` em 8 arquivos (+7 numa 9ª suíte só se Q1 = SIM = 101).
  Mutações: 43 (26 mantidas da v1 + 1 ampliada + 16 novas; +6 só se Q1 = SIM) + 17 do 01 re-executadas. Migrações: 2 (A + B/VALIDATE), rollback reescrito na ordem certa e
  com `_prisma_migrations`.**

---
## 1. Respostas achado por achado — os 16 do Opus e os 7 do Flash

Forma de cada resposta: **aceito** (o que mudou + a **mutação NOVA** que deixa o teste vermelho), **contestado** (evidência por
comando) ou **duplicado** (dois críticos apontaram o mesmo). Toda evidência foi **re-medida** nesta rodada na `origin/main`
(`3fbcaea2`), nunca herdada da crítica. Nas células de comando, `¦` representa o pipe do shell.

| ID | Grav. | Forma | O que mudou na v2 (onde) | Mutação NOVA → teste vermelho | Evidência re-medida (comando) |
|---|---|---|---|---|---|
| **A-01** | bloqueia | **aceito** | Mudança de alvo declarada (§2 #1): os 5 arnês `-db` do 01 ganham `"vehicle_telemetry_events"` como **1ª** entrada da lista de limpeza (§7.2); FK segue `RESTRICT`; 9 arquivos do 01 seguem byte a byte; teste estático H9 (§9.2); régua da cadeira (a) item 3 reescrita (§10) | **M-E43** (arnês): retira a linha de `traccar-idempotency-db.test.ts` → o `after` dessa suíte falha com `23503` **e** H9 fica vermelho | `git show origin/main:tests/traccar-idempotency-db.test.ts ¦ sed -n '81,82p'` → lista começa em `traccar_ingress_receipts`; idem `position-ingestion-db:101-110`, `resolution-race-db:89`, `quarantine-db:73`, `binding-uniqueness-db:48`; os 5 montam o comando por `structuredClone(FIXTURE)` → parser → adaptador; a fixture tem `attributes {motion:true, totalDistance:0}` |
| **A-02** | bloqueia | **aceito** | Domínio fechado por coluna em `vehicle-telemetry.bounds.ts`, **uma** fonte para parser e CHECK (§6.3); amostra em **sub-transação por `SAVEPOINT`** nos dois caminhos (§5.3, §6.6); testes B9 (tabela de borda no parser), F9 (as mesmas bordas no banco) e F10 (falha forçada da amostra → 204, localização e recibo ficam) | **M-E30**: parser perde o limite inferior de `power` → B9; **M-E31**: migração perde `power_mv >= 0` → F9; **M-E32**: `ROLLBACK TO SAVEPOINT` retirado (o erro sobe) → F10 (503, 0 localização) | precedente de savepoint em transação interativa do Prisma 7.8: `git grep -n -i savepoint origin/main -- src` → `identity-resolver.ts:52,70,77`; `package.json:38-57` → `@prisma/client ^7.8.0` |
| **A-03** | bloqueia | **aceito** | H6 (§9.2): regex que casa **qualquer** `key` terminada em `forward.header` no `traccar.xml` + nenhum literal `X-Traccar-Forward-Token` fora de `${TRC_FORWARD_HEADER:?}` no overlay; a regex do 01 fica intocada (H6 cobre as duas chaves); H-2 vira **fato S-E15** (§3.2) | **M-E33**: `<entry key='event.forward.header'>X-Traccar-Forward-Token: x</entry>` no `traccar.xml` → H6 (a guarda do 01, l.214, continua verde — é o que prova a lacuna) | `git show origin/main:tests/traccar-dev-topology.test.ts ¦ sed -n '214p'` → a regex exige `key=` colado em `forward.header`; `curl …/v6.16.0/…/config/Config.java` → l.140-141 `key.replaceAll("\.", "_")…toUpperCase` |
| **A-04** | bloqueia | **aceito** | **§Q1** (isolada e removível): recibo `position_sample`; coluna `fix_key` + índice único parcial `(fix_key) WHERE kind='sample'` (um fix → uma amostra, **no banco**); os 3 motivos que guardam e os 7 que não guardam, fechados; contrato (202 inalterado; digest ≠ → `conflict_count`; chave alheia → 409); atomicidade por savepoint; "2º índice global" **retirado** (premissa falsa: o índice do 01 já cobre `message_kind`); suíte I (7) + M-Q1-01..06; o que sai se NÃO | **M-Q1-01**: `SAMPLE_ON_QUARANTINE_REASONS` ganha `fix_before_active_binding` → I5; **M-Q1-03**: índice parcial removido → I6; **M-Q1-05**: recibo da amostra com kind `'position'` → I1/I2 (reentrega vira `duplicate` 204) | `git show origin/main:src/integrations/traccar/traccar-ingestion.service.ts ¦ sed -n '205,262p'` → passos 1-4 antes do `operatorAt` (l.243); `migration.sql:103-104` → índice global já é `(instance_key, message_kind, external_event_key)` |
| **A-05** | ajuste | **aceito** | §7.3: tabela de **alargamento declarado** do PERMITIDO do §7 (7 caminhos, razão de cada um); a cadeira (b) mede o diff contra **§7 ∪ §7.3**, não contra o próprio plano (§10); o orquestrador registra `D-TRC02-ESCOPO` (§12) | — (registro; sem mutação) | `git show origin/main:docs/revisoes/TRACCAR/PLANO_TRACCAR.md ¦ sed -n '1022,1028p'` → PERMITIDO do 02; l.1054-1057 → `infra/traccar/dev/**` e o overlay só no 03 |
| **A-06** | ajuste | **aceito** (parcela `pre-existente` do desenho do limitador reconhecida) | Mudança de alvo (§2 #3): **limitador por rota** — `TraccarIngestAppDeps.eventLimiter?` (aditivo; o 01 não muda), `createTraccarIngestAppFromEnv` cria **duas** instâncias com os mesmos valores de ambiente; C8/C11 reescritos; `P-TRC02-LIMITADOR-POR-ROTA` **fecha** aqui; fica `P-TRC02-LIMITES-POR-ROTA-PROD` (B-TRC-06 mede) | **M-E36**: a rota de eventos usa `deps.limiter` ignorando `eventLimiter` → C11 (posição esgota o bucket dela e o evento leva 429) | `git show origin/main:src/integrations/traccar/traccar-ingest.app.ts ¦ sed -n '107,110p;213,219p'` → `limiter` injetado por deps e usado em `app.post`; `traccar-rate-limit.ts:4` → "o Traccar repete com atraso crescente" (só vale para posição, S-E3) |
| **A-07** | ajuste | **aceito** | Mudança de alvo (§2 #4): chave do evento = `v1 ¦ inst ¦ uniqueId ¦ type ¦ ms ¦ alarm ¦ lat7 ¦ lon7` (coordenada da posição anexada quando há posição; vazia nos eventos de status); digest ganha `latitude`, `longitude`, `positionFixTime`; testes A15/A16/A17; a colisão restante (mesmo dispositivo, tipo, ms, alarme **e** coordenada) é **conteúdo idêntico** e vira `duplicate` por desenho, declarado | **M-E39**: coordenada fora da chave → A15 (dois `ignitionOn` no mesmo ms com coordenadas ≠ → mesma chave) | `git show origin/main:src/integrations/traccar/traccar-position.adapter.ts ¦ sed -n '47,58p'` → a chave da posição inclui `fixTime`, `lat`, `lon` |
| **A-08** | ajuste | **contestado em parte** | Aceito: E12 era tautológico (mesma função pura, mesmas entradas) → E12 passa a provar **só** o determinismo e a ausência de `receivedAt`/ids; C-02 reescrito sem "delivery-independente"; a propriedade REST vira **H-11** do B-TRC-03 com comando de medição (§3.4). Contestado: a v1 **não** afirmava a prova — l.805 dizia "**hoje**", e §3.5 chamava o teste de "fake" — mas a leitura da crítica é a que um dev faria, logo o texto muda | M-E03 (mantida) → E12/A11 | `sed -n '805p;508,510p' B-TRC-02-plano-v1.md` → "prova que a chave é delivery-independente **hoje**"; "o teste fake daqui" |
| **A-09** | ajuste | **aceito** | MUT-17/18/19/38 entram na lista de re-execução com `tests: [...T.auth, suíte C]`; C12 novo: a rota `/events` chama **`deps.authenticator`** (contagem de chamadas no objeto injetado — um auth "paralelo" não o chamaria) (§9.2); C-07 reescrito com o que prova de fato | **M-E12** (reaproveitada) → C4 **e** C12; MUT-18 re-executada → `T.auth` (declarado: o vermelho de "tempo constante" é do módulo; a rota prova que usa o módulo por C12) | `git show origin/main:docs/revisoes/TRACCAR/B-TRC-01-evidencias/mutations.mjs ¦ sed -n '58,60p'` → MUT-17/18/19 editam `AUTH` e rodam só `T.auth`; v1 l.689-690 não as lista |
| **A-10** | ajuste | **aceito** | M-E08 **retirada** (não tinha âncora que compilasse — a crítica e o Flash ACH-05 têm razão); substituída por **M-E37** (o adaptador copia `attributes.tenantId` para o comando como dica e o serviço confirma só nessa organização); E19 e F11 novos: `event.attributes.tenantId = B` / `position.attributes.tenantId = B` com dispositivo de A → linha em A, B `0/0/0` (§9.2); MUT-20 re-executada com a suíte A e E14 | **M-E37** → E19/F11 | `git show origin/main:src/integrations/traccar/traccar-position.schema.ts ¦ sed -n '7,10p;132,139p'` → `attributes` não é varrido; `assertNoReservedKeys` só em body/position/device |
| **A-11** | ajuste | **aceito** | Declarado em §5.4 e em `API_CONTRACTS.md`: o episódio de quarentena é por `(instância, dispositivo, motivo)` **sem tipo de mensagem**; `last_event_key` pode ser chave de posição **ou** de evento; `first/last_fix_at` guardam o instante do evento; pendência `P-TRC02-QUARENTENA-SEM-TIPO-DE-MENSAGEM` (dono B-TRC-03, que faz replay/reconciliação) (§12); `traccar_quarantine_items` continua intocada | — (declaração + pendência; E5 passa a asserir a linha da quarentena, ver ACH-01) | `migration.sql:124-156` → sem coluna de tipo; índice `open_episode_key` por `(instance_key, external_device_key, reason)` |
| **A-12** | ajuste | **aceito** | Mudança de alvo (§2 #5): FK **de 4 colunas** `(tenant_id, receipt_id, vehicle_id, binding_id) → traccar_ingress_receipts(tenant_id, id, vehicle_id, binding_id)`, com índice único novo no recibo (aditivo, no rollback); as FKs para `vehicles` e `bindings` ficam (o recibo não tem FK para `vehicles`); a consistência recibo↔vínculo↔viatura **do 01** fica declarada `pre-existente` (`P-TRC02-RECIBO-VINCULO-VIATURA-FK`, dono B-TRC-03) (§6.1); teste G10 | **M-E40**: migração troca a FK de 4 colunas pela de 2 → G10 (linha com recibo de V1 e `vehicle_id` de V2 entra) | `migration.sql:83-120` → o recibo tem `binding_id` e `vehicle_id` próprios; FKs só para `tenants`, `bindings`, `locations` |
| **A-13** | ajuste | **aceito** (parcela `_prisma_migrations` é `pre-existente` no 01, mas entra aqui) | Rollback reescrito na **ordem executável**: (1) `DROP TABLE vehicle_telemetry_events` (as FKs caem com ela), (2) `DROP INDEX` do recibo, (3) provar zero recibos ≠ `'position'` — **parar** se houver, (4) re-estreitar o CHECK, (5) `DELETE FROM _prisma_migrations` das duas migrações; cabeçalho diz o que toca (`traccar_ingress_receipts`: CHECK e um índice); divergência com o §7 ("remove só a tabela/índices novos") declarada (§6.1); G9 assere o catálogo limpo | — (o drill G9 é a prova; mutação de rollback não se aplica) | v1 l.356-361 (ordem invertida e "nenhuma tabela alheia é tocada" logo após um `ALTER TABLE traccar_ingress_receipts`) |
| **A-14** | ajuste | **aceito** | §Q1.6: texto do registro `D-TRC02-Q1-AMOSTRA-SEM-OPERADOR` ligando a resposta à decisão 4 e à `P-TRC-LGPD` ("**guardar ≠ exibir**: este bloco guarda; o B-TRC-04 só exibe sob decisão"); pendência `P-TRC02-LGPD-TELEMETRIA-SEM-DESPACHO` (dono: dono do produto, antes do B-TRC-04) cobrindo **também** C-10 (evento de viatura sem despacho), que a v1 nunca perguntou; nota de consistência: se a Q1 virar NÃO por privacidade, o orquestrador pergunta se C-10 segue a mesma regra | — (registro) | `PLANO_TRACCAR.md:95,105` → "viatura **sem** técnico … não aparece em lugar nenhum", "privacidade vem antes de cobertura"; `pendencias.md:10749` → `P-TRC-LGPD` ALTA ABERTA |
| **A-15** | ajuste | **aceito** | §5.5 (Q2): o `GRANT` entra como **passo nomeado** do `traccar-dev-demo.mjs` só dentro de `WITH_WEB`, via o `psql()` que o script já tem (como `postgres`); teste **H7**: o `GRANT EXECUTE … auth_login_candidates` existe **só** nesse arquivo (zero em `prisma/migrations/**`, `scripts/db-runtime-role.sh`, `docker-compose*.yml`, `src/**`, `infra/**`); guard 8 (`tests/auth-invariant-guards.test.ts:186`) re-executado; parecer do DBA ganha o item "privilégio de função"; cadeira (b) item 1 ganha a superfície de auth (§10) | **M-E34**: a linha do `GRANT` migra para `scripts/db-runtime-role.sh` → H7; **M-E35**: `GRANT` na migração A → guard 8 **e** H7 | `git grep -n auth_login_candidates origin/main -- prisma/migrations scripts docker-compose.prod.yml` → só `20260868…:10,52,236,257` (REVOKE); `db-runtime-role.sh:67-79` → DML e sequências, **nenhuma** função; `traccar-dev-demo.mjs:108-110,463` → `psql()` e o passo `--with-web` |
| **A-16** | ajuste | **aceito** (4 itens) | (i) desempate **por precedência fechada** `device_offline > device_unknown > device_online` (o menos disponível vence), nunca `received_at` (§6.4), teste E16; (ii) porta `latestIgnition(tenantId, vehicleId)` por `occurred_at` (empate → `ignition_off`), teste E17; (iii) `ignored` **contado** = linha estruturada do log da ingestão com `outcome: "ignored"` e `reason`, sem `type` (§5.2), teste D5; (iv) `batteryLevel` = `Math.round` e **depois** 0..100 (99,6 → 100; 100,4 → 100; 100,6 → descartado) (§6.3), teste B10 | **M-E41**: precedência invertida → E16; **M-E42**: `latestIgnition` ordena por `received_at` → E17; **M-E44**: a linha do `ignored` sai como `stored` → D5; **M-E45**: trunca em vez de arredondar (100,6 → 100 aceito) → B10 | v1 l.488 × l.491 (contradição medida pela crítica); l.473 ("inteiro 0..100", ambíguo) |
| **ACH-01** | ajuste | **aceito** | E5 passa a asserir a **linha** em `traccar_quarantine_items` (`reason='unmapped_device'`, `delivery_count=1`, `first_fix_at = eventTime`) e E5′ (2ª entrega → `delivery_count=2`), no molde de `traccar-quarantine-db.test.ts:130-145` (§9.2) | **M-E38**: `quarantineWithoutTenant` devolve antes de `recordQuarantine` quando o comando é de evento → E5 | `git show origin/main:tests/traccar-quarantine-db.test.ts ¦ sed -n '130,145p'` → o 01 assere `[reason, delivery_count, resolved_at]` |
| **ACH-02** | ajuste | **duplicado** de A-10 | E19 (evento) e F11 (amostra) são exatamente o caso pedido: `attributes.tenantId = B` com persistência, A `1`, B `0/0/0` | M-E37 (a mesma) | — |
| **ACH-03** | ajuste | **aceito** | E18: serviço construído com `resolver.maxTenants: 1` e **2** organizações ativas → `budget_exceeded` → 202 + linha `resolution_budget_exceeded` na quarentena, 0 recibo, 0 linha (§9.2); MUT-09 re-executada com E18 | MUT-09 (re-executada; `tests` ganha a suíte E) → E18 | `traccar-resolution.ts:129-136` → `budget_exceeded` quando `active > maxTenants`; `service.ts:157-158` → quarentena `resolution_budget_exceeded` |
| **ACH-04** | ajuste | **duplicado** de A-13 | Ordem do rollback + `_prisma_migrations` | — | — |
| **ACH-05** | ajuste | **duplicado** de A-10 | M-E08 retirada; M-E37 no lugar | M-E37 | `schema.prisma:1057-1074` → `VehicleTrackingBinding` não tem `traccar_device_id` (confirmado) |
| **ACH-06** | ajuste | **aceito** | M-E16 (NOT NULL de `receipt_id`) **retirada**: media forma. Sob Q1 = SIM, a regra "amostra só nos 3 motivos de operador" é medida por M-Q1-01/02 (linha real gravada → vermelho por contagem); sob Q1 = NÃO entra **M-E16′**: o helper `quarantined()` grava recibo `'position'` + amostra → F3 vermelho **por contagem** (1 recibo, 1 amostra), não por erro de driver | M-Q1-01 / M-E16′ | v1 l.641 |
| **ACH-07** | ajuste | **aceito** | E4 usa a **mesma barreira** do 01 (`twoPartyBarrier` sobre o hook `afterBindingLocked`, `traccar-idempotency-db.test.ts:167-178`): as duas entregas passam juntas pelo passo 4 e correm para o `INSERT` do recibo de evento; o `ingestEvent` chama o **mesmo** `lockActiveBinding` do repositório (que dispara o hook) (§9.2) | M-E10 (mantida: `ON CONFLICT DO NOTHING` do recibo de evento removido → E4 com barreira dá 503) | `git show origin/main:tests/traccar-idempotency-db.test.ts ¦ sed -n '167,178p;216,218p'` |

**Saldo:** Opus — 15 aceitos (A-01..A-07, A-09..A-16), 1 contestado em parte (A-08). Flash — 4 aceitos (ACH-01, ACH-03, ACH-06,
ACH-07), 3 duplicados (ACH-02, ACH-04, ACH-05). Nenhum achado foi rejeitado por inteiro.

---

## 2. Mudanças de alvo declaradas (v1 → v2)

| # | Alvo da v1 | Alvo da v2 | Por quê (achado) |
|---|---|---|---|
| 1 | "os 14 arquivos de teste do 01 que §4.1 não nomeia" byte a byte iguais a `c1485c94` | **9** arquivos byte a byte; **5 arnês `-db`** com exatamente **uma linha** nova de limpeza (§7.2); `traccar-position-contract` com o caso de §9.4 | A-01 |
| 2 | atributo "fora da forma/faixa → descartado" com faixa só para odômetro/distância/bateria | **domínio fechado para as 7 colunas**, uma fonte, CHECK literal igual; amostra em **savepoint** | A-02 |
| 3 | limitador **compartilhado** (C8 asseria "o evento leva 429") | **um bucket por rota**, mesmos valores de ambiente; concorrência por rota; o pool do banco (`TRACCAR_DB_POOL_MAX`) segue o teto real | A-06 |
| 4 | chave do evento sem nada da posição | chave e digest com a **coordenada** (7 casas) e o `fixTime` da posição anexada, quando há | A-07 |
| 5 | 3 FKs independentes (viatura, vínculo, recibo) | + FK de **4 colunas** para o recibo e índice único novo em `traccar_ingress_receipts` | A-12 |
| 6 | rollback "re-estreita o CHECK, depois DROP TABLE"; "nenhuma tabela alheia é tocada" | ordem executável; cabeçalho honesto; `_prisma_migrations` limpo no drill | A-13, ACH-04 |
| 7 | desempate de status por `received_at DESC, id DESC` | precedência fechada por `kind`; `latestIgnition` nova; `ignored` contado no log | A-16 |
| 8 | `batteryLevel` "inteiro 0..100" | `Math.round` → 0..100 | A-16(iv) |
| 9 | E12 "prova delivery-independência" | E12 prova determinismo; H-11 para o B-TRC-03 | A-08 |
| 10 | M-E08 (intenção sem âncora) e M-E16 (NOT NULL) | M-E37 e M-Q1-01/M-E16′ (medem a propriedade) | A-10, ACH-05, ACH-06 |
| 11 | Q1 recomendada NÃO; F3 "0 amostra, 0 recibo" | **§Q1** removível: F3 = "0 recibo `position`, 0 localização"; a amostra é da suíte I; se NÃO, F3 recupera "0 amostra" | A-04 |
| 12 | Q2 "fora do bloco, só pendência" | o `GRANT` é passo nomeado do demo **neste** bloco, com guarda H7 e parecer do DBA | A-15, `D-TRC02-RESPOSTAS` |

Tudo o mais da v1 (objetivo, ator, fluxo E, catálogo de tipos e de alarmes, allowlist das 7 chaves, `ENABLE+FORCE RLS`, FK composta
tenant-first, recibo `'event'` no índice global do 01, "nada publicado", "nada em `mileage_*`", 2 migrações A/B, gate de início,
inelegíveis) **continua valendo** e está reproduzido abaixo onde o dev precisa dele.

---
## 3. Insumos, fatos e hipóteses

### 3.1 O que a v1 mediu e continua valendo (não repetido; ver `B-TRC-02-plano-v1.md` §0.1-0.3)

- **S-E1..S-E14** (fonte da tag `v6.16.0`): corpo `{event, position?, device, geofence?, maintenance?}`; evento gravado antes de encaminhar
  (`id > 0`); **sem retry** de evento; header de `event.forward.header`; campos e tipos do `Event`; eventos derivados de posição
  calculados depois do `id` da posição; status só com `event.status.enable=true` (default `false`); `online → unknown` após
  `status.timeout` (600 s); OsmAnd **nunca** gera `deviceOffline`; `ignitionOn/Off` só na transição; um evento `alarm` por código, 38
  códigos; unidades (`odometer` m, `hours` ms, `power` V, `batteryLevel` %); parâmetro desconhecido do OsmAnd vira atributo; `device`
  igual ao do forward de posição.
- **F-R1..F-R9** (repositório, ref `3fbcaea2`): CHECK `message_kind IN ('position')`; `recordQuarantine` lê 5 campos do comando;
  `traccarIngestResponse` (204/202/409/503); limitador por app; `TelemetryEvent` do app exige `operator_profile_id`; o caso l.88-95 do
  contrato da posição; overlay sem `ports` novo; carimbo seguinte livre `20260878000000` (risco de colisão com o B-SAN3-02); o papel de
  runtime recebe DML por `DEFAULT PRIVILEGES`, **nunca** `EXECUTE` em função.

### 3.2 Fatos NOVOS medidos nesta rodada (ref `3fbcaea2` e tag `v6.16.0`)

| # | Fato | Onde (comando) |
|---|---|---|
| **S-E15** | `Config.getEnvironmentVariableName(key)` troca `.` por `_`, prefixa cada maiúscula com `_` e põe tudo em maiúsculas: `event.forward.header` → **`EVENT_FORWARD_HEADER`**, `event.forward.url` → `EVENT_FORWARD_URL`, `event.status.enable` → `EVENT_STATUS_ENABLE`, `status.timeout` → `STATUS_TIMEOUT`; lido quando `CONFIG_USE_ENVIRONMENT_VARIABLES=true` (l.48-49, 66, 81-82). **A H-2 da v1 deixa de ser hipótese.** Consequência: `event.status.enable` e `status.timeout` **também podem ir por ambiente** no overlay (ver §7.3) | `curl -sS https://raw.githubusercontent.com/traccar/traccar/v6.16.0/src/main/java/org/traccar/config/Config.java` → l.140-141 |
| **F-R10** | `SAVEPOINT`/`ROLLBACK TO SAVEPOINT`/`RELEASE` **dentro de transação interativa do Prisma 7.8** já é idioma do repositório, com o motivo escrito: "um INSERT que falhe ABORTA a transação Postgres inteira — sem o savepoint, a releitura do catch morreria" | `git grep -n -i savepoint origin/main -- src` → `src/modules/auth/services/identity-resolver.ts:49-77`; `package.json:38-57` → Prisma `^7.8.0` |
| **F-R11** | O limitador é **injetado** (`TraccarIngestAppDeps.limiter`) e usado em `app.post(...)` pelo `traccarRateLimitMiddleware(deps.limiter)`; a instância nasce em `createTraccarIngestAppFromEnv` (`traccar-ingestion.service.ts:323-363`) a partir de `TRACCAR_INGEST_RATE_PER_SECOND/BURST/MAX_CONCURRENCY` | `git show origin/main:src/integrations/traccar/traccar-ingest.app.ts ¦ sed -n '107,110p;213,219p'` |
| **F-R12** | O arnês do 01 tem a barreira de duas partes `twoPartyBarrier()` sobre o hook `afterBindingLocked` (disparado por `lockActiveBinding`, `repository.ts:62-70`); E4 reusa | `git show origin/main:tests/traccar-idempotency-db.test.ts ¦ sed -n '167,178p'` |
| **F-R13** | O "guard 8" (`GRANT` no início de linha em `prisma/migrations/**` = 0) existe em `tests/auth-invariant-guards.test.ts:186-187`; `db-catalog-write-guard.test.ts:66,127` sabe que falar SOBRE `GRANT` em teste não é escrever catálogo | `git grep -n 'guard 8' origin/main -- tests` |
| **F-R14** | `D-TRC02-RESPOSTAS` está **na ref** (`decisoes.md:3783-3786`): Q1/Q2/Q3 = SIM, com o texto "o desenho muda (recibo próprio para a amostra e 2º índice global): o plano ganha emenda antes do código". **O "2º índice global" é premissa falsa** (A-04 item 5): o índice `traccar_ingress_receipts_event_key` já é `(instance_key, message_kind, external_event_key)`; um `message_kind` novo não pede índice | `git show origin/main:agent-orchestration/controle/decisoes.md ¦ sed -n '3783,3786p'`; `migration.sql:103-104` |
| **F-R15** | As 5 suítes `-db` do 01 (`idempotency`, `position-ingestion`, `resolution-race`, `quarantine`, `binding-uniqueness`) limpam por `DELETE FROM <tabela> WHERE tenant_id = ANY($1)` numa lista que **começa em `traccar_ingress_receipts`** e constroem o comando pelo parser a partir da fixture (com `attributes`). A 6ª (`ingest-pool-db`) não ingere posição (segura `FOR SHARE` e mede o pool) → não produz amostra | §1, A-01 |
| **F-R16** | A regex do 01 (`traccar-dev-topology.test.ts:214`) exige `key=` colado em `forward.header`; **não** casa `event.forward.header` | `sed -n '214p'` |
| **F-R17** | `traccar-dev-demo.mjs` já tem `psql(sql)` (`compose exec -T postgres psql -U postgres … -v ON_ERROR_STOP=1`, l.108-110), `step(name, fn)` (l.117) e o bloco `if (WITH_WEB)` (l.463): o passo do `GRANT` da Q2 entra aí, sem helper novo | `git show origin/main:scripts/traccar-dev-demo.mjs ¦ sed -n '108,120p;460,466p'` |
| **F-R18** | A suíte de listener do 01 chama-se `tests/traccar-ingest-listener.test.ts` (não `traccar-listener`); os 15 nomes e o mapa `T` do catálogo de mutações estão em `mutations.mjs:6-20` | `git ls-tree -r --name-only origin/main tests ¦ grep traccar-` |

### 3.3 Hipóteses (cada uma com o comando que a derruba; H-1, H-3..H-9 da v1 continuam; H-2 virou S-E15)

| # | Hipótese | Comando que a fecha | Se cair |
|---|---|---|---|
| **H-10** | `ROLLBACK TO SAVEPOINT` emitido por `tx.$executeRaw` dentro do `$transaction` interativo **recupera** a transação depois de um `23514`/`22003` no INSERT da amostra, e as instruções seguintes (quarentena, commit) seguem (F-R10 é precedente com `23505`/FK) | F10 e I7 no passo 7 de §9.6 (o 1º teste `-db` do fluxo S): comando com `powerMv: -1` montado à mão → 204, 1 localização, 1 recibo, 0 amostra | o fallback é **validar no serviço com o mesmo predicado do CHECK** (`VEHICLE_TELEMETRY_BOUNDS.accepts(sample)`) antes do INSERT, e F10 passa a provar que a amostra inválida é **descartada antes** de ir ao banco (mesma propriedade, outro mecanismo); registrar em `B-TRC-02-dev.md` |
| **H-11** | A REST do Traccar (`GET /api/reports/events?deviceId&from&to`) devolve `eventTime` em ms, `type`, `attributes.alarm` e `positionId` tais que o B-TRC-03, com o `uniqueId` do dispositivo e a posição por `positionId`, reconstrói **a mesma chave** de §6.5 | **do B-TRC-03** (não deste bloco): `curl` à REST do stack de dev e `computeTraccarEventKey(...)` = chave do recibo gravado pelo forward | o B-TRC-03 muda a chave com versão `v2` **só para a reconciliação**, e o recibo do forward ganha uma coluna de chave alternativa — decisão de lá, não daqui |
| **H-12** | `event.status.enable=true` e `status.timeout=60` por **variável de ambiente** (`EVENT_STATUS_ENABLE`, `STATUS_TIMEOUT`, S-E15) produzem `deviceOnline`/`deviceUnknown` em dev | captura (passo 3 de §9.6): `deviceOnline` ≤ 5 s após o 1º fix; `deviceUnknown` ≤ 70 s de silêncio | as duas chaves vão para o `traccar.xml` de dev (não são segredo; H6 não as proíbe) |

### 3.4 O que a captura de fixture grava (inalterado da v1 §0.5, com um acréscimo)

4 fixtures capturadas (`event-device-online`, `event-ignition-on`, `event-alarm-sos`, `event-device-unknown`) + 1 sintética rotulada
(`event-device-offline`), sanitizadas como no 01. **Acréscimo:** o relatório `B-TRC-02-evento-captura.md` registra, além de header
names / `event.id` / datas / "2ª entrega: não", **se `position.latitude/longitude` vêm nos eventos derivados de posição** (a chave de
§6.5 depende disso) e **o `deviceTime` × `fixTime`** da posição anexada (A-07: é o `deviceTime` que vira `eventTime`).

---
## 4. "Onde mora a propriedade?" — respondida duas vezes (v2)

### 4.1 Isolamento

- **Antes do desenho:** a organização nunca vem do payload (nem de `attributes`, que não é varrido mas também **não é lido** para nada
  além das 7 chaves veiculares e de `alarm`); nasce do vínculo ativo confirmado sob RLS com `FOR SHARE`; toda linha nova carrega
  `tenant_id` por construção e fica atrás de `ENABLE + FORCE RLS`; nenhum código é a autoridade.
- **Depois do desenho:** (i) recibo de evento no **mesmo índice global** do 01 (`message_kind='event'`); (ii) FK de **4 colunas** para o
  recibo + FK composta para a viatura e para o vínculo — uma linha de A apontando para recibo/viatura/vínculo de B é impossível, **e**
  uma linha que aponte para o recibo de V1 com a viatura V2 também (A-12); (iii) `FORCE RLS` + política idêntica à do 01; (iv) papel de
  runtime `NOSUPERUSER NOBYPASSRLS`, sem `RULE`/view/`SECURITY DEFINER` novos; (v) `attributes.tenantId` forjado em `event` ou em
  `position` não muda o destino (E19, F11, M-E37). Prova por execução sob papel efêmero (suítes E/F/G/I) e por mutação (M-E14, M-E23,
  M-E24, M-E37, M-E40).

### 4.2 Idempotência, ordem e "um fix → uma amostra"

- **Antes do desenho:** chave determinística do conteúdo (nunca `id` do banco do Traccar, nunca só o relógio); conteúdo divergente sob a
  mesma chave é conflito; estado derivado só do instante do evento; **uma leitura do rastreador vale uma amostra**, por qualquer caminho.
- **Depois do desenho:** (i) chave do evento com coordenada quando há posição (§6.5; A15/A16/A17; M-E39); (ii) `UNIQUE (tenant_id,
  receipt_id)` — o recibo é a idempotência da linha; (iii) estado por `max(occurred_at)` com precedência fechada no empate (E10, E16;
  M-E15, M-E41); (iv) amostra em **savepoint**: nunca derruba a posição (F10; M-E32); (v) **só se Q1 = SIM:** `fix_key` + índice único
  parcial — um fix → uma amostra **no banco**, pelos dois caminhos (I6; M-Q1-03).

---

## 5. Objetivo · ator · fluxo origem→destino · contrato

### 5.1 Objetivo (observável) — o da v1, com dois critérios de smoke a mais

Receber o `event.forward` do Traccar 6.16.0 **no mesmo listener privado do 01** e conservar, por viatura e por organização, os eventos
técnicos (ignição ligada/desligada, em movimento/parado, alarme, dispositivo online/sem sinal/offline) **e** os atributos veiculares
allowlisted das posições (ignição, movimento, odômetro, distância acumulada, horímetro, tensão, nível de bateria) numa tabela nova
`vehicle_telemetry_events` — sem misturar com `telemetry_events` (app), **sem rota de leitura, sem tela, sem notificação, sem WebSocket,
sem escrita em `WorkOrder.mileage_*`**.

**Smoke `scripts/traccar-dev-demo.mjs` (passos 13-19):** (a)-(i) como na v1 (ignição off→on = 1 `ignition_on` + 2 `sample`; `alarm=sos` =
1 `alarm/sos`; 1º fix = 1 `device_online`; replay = ainda 1; `geofenceEnter` forjado = 204 e 0 linha; dispositivo sem vínculo = 202 +
quarentena + 0 linha; `SELECT` sem coordenada/JSON/nome; log sem segredo/coordenada/`type`; md5 da OS igual) **+ (j)** fix com
`power=-1` → 204, a localização entra, **0** amostra, log `sample_discarded` **+ (k)** 120 posições em rajada seguidas de 1 `ignition=true`
→ o evento `ignitionOn` entra (204) enquanto posições levam 429 — o bucket é por rota.

### 5.2 Ator e contrato

**Ator:** o serviço Traccar (forward JSON privado), autenticado pelo header `X-Traccar-Forward-Token` — **o mesmo segredo** do forward
de posição (um segredo, uma rotação). Sem usuário humano, sem permissão nova, sem rota sob `/api/v1`.

**Rota de serviço nova, só no listener de ingestão:** `POST /ingest/traccar/v1/events` (`TRACCAR_EVENT_INGEST_PATH`). Headers, ordem
fixa dos middlewares e códigos **idênticos** aos de `/positions` (`API_CONTRACTS.md` §2.1-bis), com estas diferenças **declaradas**:

| Ponto | `/positions` (01) | `/events` (02) |
|---|---|---|
| Limitador | bucket + concorrência do app (`deps.limiter`) | **bucket e concorrência próprios** (`deps.eventLimiter`, mesmos valores de `TRACCAR_INGEST_RATE_PER_SECOND/BURST/MAX_CONCURRENCY`); o pool do banco (`TRACCAR_DB_POOL_MAX`) é o teto real comum; um `ignored` consome ficha do bucket **de eventos** |
| `204` | gravado ou reenvio idêntico | gravado, reenvio idêntico **ou `ignored`** (tipo/código fora do catálogo: nada gravado; **contado** na linha de log estruturada `{outcome:"ignored", reason:"unknown_type"¦"unknown_alarm"}`, sem o `type` cru) |
| `202` | quarentena durável | os **mesmos** motivos, lidos como "instante do evento" (`unmapped_device`, `tenant_inactive`, `fix_before_active_binding`, `fix_in_future`, `resolution_budget_exceeded`); o CHECK da quarentena não muda; o episódio é por `(instância, dispositivo, motivo)` **sem tipo de mensagem** (§5.4) |
| `409` | digest ≠ ou chave de outra organização | idem (`traccar_idempotency_conflict`) |
| `503` | falha antes do commit | idem; a porta de commit é a mesma (`createTraccarCommitGate`) |
| Corpo | `{position, device}` | `{event, position?, device, geofence?, maintenance?}` (S-E1) |

**Allowlist do corpo (inalterada da v1 §2.4, com um acréscimo):** `event.id` (aceito ausente/0/>0; fora da chave e do digest; guardado
como `traccar_event_id`), `type` (`^[A-Za-z]{1,32}$`), `eventTime` (ISO com fuso), `deviceId` (= `device.id` quando os dois existem,
senão 422), `positionId` (≥ 0, opcional), `attributes.alarm` (string, só com `type="alarm"`); `device.id`, `device.uniqueId`
(`^[A-Za-z0-9_.:-]{1,64}$`); **`position.latitude`, `position.longitude`, `position.fixTime`** (lidos **só** para a chave e o digest,
§6.5 — nunca chegam ao comando como campos nem ao banco; A9 e G6 provam); `geofence`/`maintenance` ignorados. Chave reservada no
envelope, em `event`, `device` ou `position` → 422; dentro de `attributes` não se procura (regra do 01).

**Comando interno canônico:** o `TraccarEventCommand` da v1 (§2.4) com `externalEventKey`/`payloadDigest` calculados por §6.5. O
`TraccarPositionCommand` ganha `telemetry?: VehicleTelemetrySample` — chave e digest da posição **inalterados** (C-15).

**Contrato de leitura:** nenhum. Portas internas sem rota: `latestDeviceStatus`, `latestIgnition` (nova, A-16 ii), `listByVehicle`.

**`API_CONTRACTS.md` §2.1-bis ganha:** a linha da rota `/events`; a nota do limitador por rota; a nota de que `ignored` é 204; a nota
da quarentena sem tipo de mensagem; e, **só se Q1 = SIM**, a nota de §Q1.4.

### 5.3 Fluxos origem→destino

**Fluxo E — evento (novo; o da v1, inalterado na ordem):**
```
rastreador → Traccar (handlers de evento) → NotificationManager grava e encaminha (sem retry)
  → POST /ingest/traccar/v1/events  (listener 3200; cadeia: query → auth → content-type → json 64 KiB → LIMITADOR DE EVENTOS → parser)
  → parser allowlist {event, position?, device} → comando canônico (chave + digest, §6.5)
  → tipo/código fora do catálogo → `ignored` (204, nada gravado, linha de log contada)
  → resolução do dispositivo (dica → descoberta, a MESMA do 01; teto de organizações → 202 resolution_budget_exceeded)
  → FASE 2 sob withTenantRlsBudget(tenantId):
       1. organização ativa;  2. vínculo ativo FOR SHARE (lockActiveBinding → hook afterBindingLocked);
       3. eventTime ≥ valid_from e ≤ agora+5 min;  4. recibo pela chave (kind 'event'): igual → 204 | digest ≠ → 409;
       5. (sem passo de operador: evento é dado da VIATURA — C-10; ver P-TRC02-LGPD-TELEMETRIA-SEM-DESPACHO)
       6. INSERT recibo 'event' ON CONFLICT DO NOTHING → corrida/outra organização como no 01;
       7. INSERT vehicle_telemetry_events (kind, alarm_code, occurred_at, receipt_id, vehicle_id, binding_id, traccar_*_id)
  → COMMIT → 204. Nada publicado.
```

**Fluxo S — amostra (extensão do passo 7 do fluxo de posição do 01), agora como SUB-TRANSAÇÃO:**
```
passo 7 do 01: locations.record → attachLocation → [se command.telemetry existe]
   SAVEPOINT vehicle_sample
     INSERT vehicle_telemetry_events (kind='sample', receipt_id = recibo da POSIÇÃO, occurred_at = fixTime, medidas normalizadas
                                      [Q1=SIM: fix_key = chave da posição; ON CONFLICT (fix_key) WHERE kind='sample' DO NOTHING])
   RELEASE SAVEPOINT vehicle_sample
   em erro (22003/23514/23503/qualquer): ROLLBACK TO SAVEPOINT vehicle_sample → log warn {outcome:"sample_discarded", code} → segue
→ COMMIT → stored (204). A posição NUNCA depende da amostra.
```
Posição duplicada → 204 no passo 4, antes de qualquer escrita (a amostra é a da 1ª gravação). Posição em quarentena → **sem amostra**,
**exceto** no caminho de §Q1 (só se Q1 = SIM; os 3 motivos de operador). O digest da posição continua sem `attributes`.

**Por que savepoint e não só validação no serviço:** a validação no serviço (domínio fechado, §6.3) é a **1ª** defesa e torna a recusa
do banco impossível **para o que o parser produz**; o savepoint é a **2ª**, para o que o parser não produz hoje (coluna que um bloco
futuro aperte, comando montado por reconciliação, bug de conversão): a propriedade "a amostra nunca derruba a posição" fica
**independente** de o domínio estar certo. As duas têm teste próprio (B9/F9 e F10). Se H-10 cair, fica só a 1ª, declarada (§3.3).

### 5.4 Quarentena de evento — declarada (A-11)

Evento de dispositivo não mapeado, de organização inativa, fora da janela do vínculo, no futuro, ou acima do teto de organizações vai
para `traccar_quarantine_items` pelo **mesmo** `recordQuarantine` do 01, no **mesmo** episódio `(instance_key, external_device_key,
reason)` que uma posição com o mesmo motivo usaria: `delivery_count` soma posições **e** eventos; `last_event_key`/`last_payload_digest`
são os da **última** entrega, de qualquer tipo; `first_fix_at`/`last_fix_at` recebem o **instante do evento**. A tabela **não muda**
(PROIBIDO). Consequência declarada para quem consome a quarentena (B-TRC-03 reconciliação; B-TRC-05 operação): **não** se faz replay
por `last_event_key` sem saber o tipo — tenta-se nos dois `message_kind`. Pendência `P-TRC02-QUARENTENA-SEM-TIPO-DE-MENSAGEM` (§12),
dono B-TRC-03. Teste E5 assere a linha (ACH-01), E5′ a soma.

### 5.5 Q2 = SIM — o `GRANT` do login sem organização, só na demonstração (A-15)

- **O que é:** `GRANT EXECUTE ON FUNCTION public.auth_login_candidates(text) TO erp_runtime`, executado **como `postgres`** pelo
  `psql()` que `scripts/traccar-dev-demo.mjs` já tem (F-R17), como **passo nomeado** dentro do bloco `if (WITH_WEB)`:
  `step("demo: GRANT EXECUTE em auth_login_candidates ao erp_runtime (SÓ nesta demonstração; produção = passo 5 do runbook, ato do dono)", …)`.
  A saída do passo é só o nome e o estado (o nome do papel `erp_runtime` não é segredo; nada mais é impresso).
- **O que a função é (contexto que o dono recebeu depois):** `SECURITY DEFINER`, lê `users`/`tenants`/credenciais de **todas** as
  organizações sob `FORCE RLS` com o privilégio do dono da função; `REVOKE ALL FROM PUBLIC` por desenho; "NENHUM GRANT vive em
  migração (guard 8)" (`20260868…/migration.sql:52-60,255-257`). Por isso o confinamento é propriedade testada, não promessa:
- **Guarda H7 (§9.2):** o literal `GRANT EXECUTE ON FUNCTION public.auth_login_candidates` existe em **exatamente um** arquivo do
  repositório (`scripts/traccar-dev-demo.mjs`), dentro do bloco `WITH_WEB`; zero ocorrências em `prisma/migrations/**`,
  `scripts/db-runtime-role.sh`, `docker-compose*.yml`, `src/**`, `infra/**`, `.github/**` (docs do runbook ficam fora da varredura: lá
  ele é instrução humana). Guard 8 re-executado. Mutações M-E34/M-E35.
- **Parecer do DBA** (§10) ganha o item: "privilégio de função: o `GRANT` não entra por migração nem pelo script do papel de runtime".
- **Pendência `P-TRC-DEMO-LOGIN-SEM-ORG-INERTE`:** **FECHA** neste bloco (a decisão diz "Resolve"); teste de encerramento: `GET
  /api/v1/health/ready` na demo `--with-web` → `login_without_org` ≠ `inert_no_execute`. Produção **não muda** (`docs/deployment.md:649-650`
  continua sendo o passo humano).
- **O que NÃO entra:** nenhum `GRANT` fora do demo; nenhuma mudança em `db-runtime-role.sh`; nenhum `ALTER FUNCTION … OWNER`.

---
## 6. Desenho mínimo

### 6.1 Modelagem: `VehicleTelemetryEvent` e as mudanças no recibo

**Princípios (os da v1):** aditivo e forward-only; `timestamptz(6)`; `ENABLE + FORCE RLS` com a política do GUC; `@@unique([tenant_id,
id])`; FK compostas tenant-first com `RESTRICT`; sem JSON/JSONB, sem coordenada, sem texto livre, sem nome de pessoa; linha é fato
imutável (sem `UPDATE`/`DELETE` pela aplicação; expurgo de 90 dias é do B-TRC-05); medidas em **inteiros** (m, s, mV, %).

**Modelo Prisma (em `telemetry`):**
```prisma
// B-TRC-02 (plano v2 §6.1) — telemetria VEICULAR do Traccar, por organização (ENABLE + FORCE RLS).
// Uma linha por recibo (UNIQUE tenant_id+receipt_id); FK de 4 colunas para o recibo (a linha e o recibo concordam em viatura e
// vínculo); kind 'sample' = atributos da posição; os demais kinds = event.forward. Sem JSON, sem coordenada, sem texto livre.
// CHECKs, índices parciais e a FK de 4 colunas só na migração 20260878000000. [Q1=SIM] fix_key = chave da posição (só 'sample').
model VehicleTelemetryEvent {
  id                  String                 @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenant_id           String                 @db.Uuid
  vehicle_id          String                 @db.Uuid
  binding_id          String                 @db.Uuid
  receipt_id          String                 @db.Uuid
  kind                String                 // sample | device_online | device_unknown | device_offline | device_moving | device_stopped | device_overspeed | ignition_on | ignition_off | alarm
  alarm_code          String?                // só kind='alarm'; forma no banco, catálogo no código
  source              String                 @default("forward") // forward | reconciliation
  occurred_at         DateTime               @db.Timestamptz(6)  // event.eventTime ou position.fixTime
  received_at         DateTime               @default(now()) @db.Timestamptz(6)
  traccar_event_id    BigInt?
  traccar_position_id BigInt?
  fix_key             String?                // [Q1=SIM] só kind='sample': external_event_key da posição; único parcial
  ignition            Boolean?
  motion              Boolean?
  odometer_m          BigInt?
  total_distance_m    BigInt?
  engine_hours_s      BigInt?
  power_mv            Int?
  battery_level_pct   Int?
  tenant              Tenant                 @relation(fields: [tenant_id], references: [id], onDelete: Restrict)
  vehicle             Vehicle                @relation(fields: [tenant_id, vehicle_id], references: [tenant_id, id], onDelete: Restrict)
  binding             VehicleTrackingBinding @relation(fields: [tenant_id, binding_id], references: [tenant_id, id], onDelete: Restrict)
  receipt             TraccarIngressReceipt  @relation(fields: [tenant_id, receipt_id, vehicle_id, binding_id], references: [tenant_id, id, vehicle_id, binding_id], onDelete: Restrict)

  @@unique([tenant_id, id])
  @@unique([tenant_id, receipt_id], map: "vehicle_telemetry_events_receipt_key")
  @@index([tenant_id, vehicle_id, occurred_at(sort: Desc)], map: "vehicle_telemetry_events_vehicle_time_idx")
  @@index([tenant_id, vehicle_id, kind, occurred_at(sort: Desc)], map: "vehicle_telemetry_events_vehicle_kind_time_idx")
  @@index([tenant_id, occurred_at], map: "vehicle_telemetry_events_time_idx")
  @@map("vehicle_telemetry_events")
}
```
`TraccarIngressReceipt` ganha `@@unique([tenant_id, id, vehicle_id, binding_id], map: "traccar_ingress_receipts_tenant_id_id_vehicle_binding_key")`
(o alvo da FK de 4 colunas) e a relação reversa `telemetry_event VehicleTelemetryEvent?`; o comentário do recibo passa a dizer
"`message_kind IN ('position','event'[,'position_sample'])`; para `'event'`, `fix_time` é o instante do evento e `location_id` fica
nulo". Relações reversas em `Vehicle`, `VehicleTrackingBinding`, `Tenant` (só para compilar). **Se o Prisma não aceitar a FK de 4
colunas na relação** (ele aceita `fields`/`references` de qualquer aridade desde que o alvo seja `@@unique`), a relação `receipt` fica
de 2 colunas no schema e a FK de 4 vive **só na migração** — não há drift check na CI (crítica E16), então a cadeira (a) confere
`prisma migrate diff` localmente; o dev registra o que ocorreu em `B-TRC-02-dev.md`.

**Migração A — `prisma/migrations/20260878000000_vehicle_telemetry_events/migration.sql`** (sob o `agente-dba-guardiao`; carimbo
reservado na abertura do ramo, H-8). **Parte 1 — a tabela:**
```sql
-- B-TRC-02 (plano v2 §6.1) — telemetria VEICULAR do Traccar. ADITIVA e forward-only.
-- O QUE TOCA: (1) cria vehicle_telemetry_events; (2) em traccar_ingress_receipts: UM índice único novo (alvo da FK de 4 colunas) e o
--   CHECK de message_kind alargado (DROP + ADD … NOT VALID; o VALIDATE vai na 20260879000000, N2-06). Nada mais é tocado.
-- RLS e acesso: DML pelo papel de runtime via DEFAULT PRIVILEGES do migrador (scripts/db-runtime-role.sh:78-79); NENHUM GRANT aqui.
-- Os domínios numéricos dos CHECKs abaixo são os MESMOS de src/modules/telemetry/vehicle-telemetry.bounds.ts (uma fonte; B9/F9 provam).
-- ROLLBACK: ver o bloco no fim deste arquivo (ordem executável; só em ambiente SEM dado real).
CREATE TABLE "vehicle_telemetry_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "vehicle_id" UUID NOT NULL,
  "binding_id" UUID NOT NULL,
  "receipt_id" UUID NOT NULL,
  "kind" TEXT NOT NULL,
  "alarm_code" TEXT,
  "source" TEXT NOT NULL DEFAULT 'forward',
  "occurred_at" TIMESTAMPTZ(6) NOT NULL,
  "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "traccar_event_id" BIGINT,
  "traccar_position_id" BIGINT,
  "fix_key" TEXT,                                   -- [Q1=SIM] remover esta linha se Q1 = NÃO
  "ignition" BOOLEAN,
  "motion" BOOLEAN,
  "odometer_m" BIGINT,
  "total_distance_m" BIGINT,
  "engine_hours_s" BIGINT,
  "power_mv" INTEGER,
  "battery_level_pct" INTEGER,
  CONSTRAINT "vehicle_telemetry_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "vehicle_telemetry_events_kind_check" CHECK ("kind" IN (
    'sample','device_online','device_unknown','device_offline','device_moving','device_stopped','device_overspeed',
    'ignition_on','ignition_off','alarm')),
  CONSTRAINT "vehicle_telemetry_events_source_check" CHECK ("source" IN ('forward','reconciliation')),
  CONSTRAINT "vehicle_telemetry_events_alarm_code_check"
    CHECK (("kind" = 'alarm') = ("alarm_code" IS NOT NULL) AND ("alarm_code" IS NULL OR "alarm_code" ~ '^[a-zA-Z]{1,32}$')),
  CONSTRAINT "vehicle_telemetry_events_measures_check" CHECK (
    ("kind" = 'sample' AND ("ignition" IS NOT NULL OR "motion" IS NOT NULL OR "odometer_m" IS NOT NULL
       OR "total_distance_m" IS NOT NULL OR "engine_hours_s" IS NOT NULL OR "power_mv" IS NOT NULL OR "battery_level_pct" IS NOT NULL))
    OR ("kind" <> 'sample' AND "ignition" IS NULL AND "motion" IS NULL AND "odometer_m" IS NULL AND "total_distance_m" IS NULL
       AND "engine_hours_s" IS NULL AND "power_mv" IS NULL AND "battery_level_pct" IS NULL)),
  CONSTRAINT "vehicle_telemetry_events_ranges_check" CHECK (
    ("odometer_m" IS NULL OR ("odometer_m" BETWEEN 0 AND 9007199254740991))
    AND ("total_distance_m" IS NULL OR ("total_distance_m" BETWEEN 0 AND 9007199254740991))
    AND ("engine_hours_s" IS NULL OR ("engine_hours_s" BETWEEN 0 AND 9007199254740991))
    AND ("power_mv" IS NULL OR ("power_mv" BETWEEN 0 AND 1000000))
    AND ("battery_level_pct" IS NULL OR ("battery_level_pct" BETWEEN 0 AND 100))),
  CONSTRAINT "vehicle_telemetry_events_fix_key_check"                       -- [Q1=SIM] remover se Q1 = NÃO
    CHECK (("kind" = 'sample') = ("fix_key" IS NOT NULL) AND ("fix_key" IS NULL OR "fix_key" ~ '^[0-9a-f]{64}$'))
);
```
**Parte 2 — índices, FKs, RLS, o recibo e o rollback:**
```sql
CREATE UNIQUE INDEX "vehicle_telemetry_events_tenant_id_id_key" ON "vehicle_telemetry_events"("tenant_id", "id");
CREATE UNIQUE INDEX "vehicle_telemetry_events_receipt_key" ON "vehicle_telemetry_events"("tenant_id", "receipt_id");
CREATE INDEX "vehicle_telemetry_events_vehicle_time_idx" ON "vehicle_telemetry_events"("tenant_id", "vehicle_id", "occurred_at" DESC);
CREATE INDEX "vehicle_telemetry_events_vehicle_kind_time_idx" ON "vehicle_telemetry_events"("tenant_id", "vehicle_id", "kind", "occurred_at" DESC);
CREATE INDEX "vehicle_telemetry_events_time_idx" ON "vehicle_telemetry_events"("tenant_id", "occurred_at");
-- [Q1=SIM] um fix → uma amostra, por QUALQUER caminho (posição aceita ou quarentena por operador). Remover se Q1 = NÃO.
CREATE UNIQUE INDEX "vehicle_telemetry_events_sample_fix_key" ON "vehicle_telemetry_events"("fix_key") WHERE "kind" = 'sample';

-- (2) traccar_ingress_receipts: alvo da FK de 4 colunas (índice único NOVO; redundante com a PK, necessário para a FK)
CREATE UNIQUE INDEX "traccar_ingress_receipts_tenant_id_id_vehicle_binding_key"
  ON "traccar_ingress_receipts"("tenant_id", "id", "vehicle_id", "binding_id");

ALTER TABLE "vehicle_telemetry_events" ADD CONSTRAINT "vehicle_telemetry_events_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vehicle_telemetry_events" ADD CONSTRAINT "vehicle_telemetry_events_tenant_id_vehicle_id_fkey"
  FOREIGN KEY ("tenant_id", "vehicle_id") REFERENCES "vehicles"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vehicle_telemetry_events" ADD CONSTRAINT "vehicle_telemetry_events_tenant_id_binding_id_fkey"
  FOREIGN KEY ("tenant_id", "binding_id") REFERENCES "vehicle_tracking_bindings"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- A-12: a linha e o recibo concordam em viatura E vínculo — no banco, não no código.
ALTER TABLE "vehicle_telemetry_events" ADD CONSTRAINT "vehicle_telemetry_events_receipt_fkey"
  FOREIGN KEY ("tenant_id", "receipt_id", "vehicle_id", "binding_id")
  REFERENCES "traccar_ingress_receipts"("tenant_id", "id", "vehicle_id", "binding_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "vehicle_telemetry_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vehicle_telemetry_events" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vehicle_telemetry_events_tenant_isolation" ON "vehicle_telemetry_events";
CREATE POLICY "vehicle_telemetry_events_tenant_isolation" ON "vehicle_telemetry_events"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- (3) CHECK de message_kind do recibo: DROP + ADD NOT VALID (o VALIDATE vai na migração seguinte). 'position' ⊂ lista nova.
ALTER TABLE "traccar_ingress_receipts" DROP CONSTRAINT "traccar_ingress_receipts_message_kind_check";
ALTER TABLE "traccar_ingress_receipts" ADD CONSTRAINT "traccar_ingress_receipts_message_kind_check"
  CHECK ("message_kind" IN ('position', 'event', 'position_sample')) NOT VALID;   -- [Q1=SIM] 'position_sample'; sem ele se Q1 = NÃO

-- ROLLBACK (manual; só em ambiente SEM dado real; NUNCA como rollback produtivo). ORDEM EXECUTÁVEL — a dependente cai primeiro:
--   1. DROP TABLE IF EXISTS "vehicle_telemetry_events";              -- política, índices e as 4 FKs caem com ela
--   2. DROP INDEX IF EXISTS "traccar_ingress_receipts_tenant_id_id_vehicle_binding_key";
--   3. SELECT count(*) FROM "traccar_ingress_receipts" WHERE "message_kind" <> 'position';   -- tem de ser 0. Se não for, PARE:
--      recibo de evento/amostra é dado; não se apaga para "voltar".
--   4. ALTER TABLE "traccar_ingress_receipts" DROP CONSTRAINT "traccar_ingress_receipts_message_kind_check";
--      ALTER TABLE "traccar_ingress_receipts" ADD CONSTRAINT "traccar_ingress_receipts_message_kind_check"
--        CHECK ("message_kind" IN ('position'));
--   5. DELETE FROM "_prisma_migrations" WHERE "migration_name" IN
--        ('20260878000000_vehicle_telemetry_events', '20260879000000_validate_receipt_message_kind_check');
--   Toca traccar_ingress_receipts (CHECK e um índice) e _prisma_migrations; nenhuma outra tabela.
```
**Migração B — `prisma/migrations/20260879000000_validate_receipt_message_kind_check/migration.sql`:**
```sql
-- B-TRC-02 — valida o CHECK alargado em transação própria (N2-06). Rollback: nenhum aqui (o VALIDATE não muda dado);
-- o re-estreitamento e a limpeza de _prisma_migrations estão no rollback da 20260878000000.
ALTER TABLE "traccar_ingress_receipts" VALIDATE CONSTRAINT "traccar_ingress_receipts_message_kind_check";
```

**Divergências com o §7 do plano do Traccar, declaradas (A-05, A-13):** (1) **duas** migrações, não uma (N2-06: o `VALIDATE` no mesmo
arquivo segura o `ACCESS EXCLUSIVE`); (2) o rollback **não** "remove só a tabela/índices novos": também re-estreita um CHECK e remove
um índice novo de uma tabela do 01, e limpa `_prisma_migrations`; (3) a migração cria **um índice** numa tabela do 01
(`traccar_ingress_receipts`) — aditivo, alvo de FK. O `agente-dba-guardiao` confere: zero DROP/ALTER destrutivo; toda linha existente
satisfaz o CHECK novo; rollback executado no drill G9 numa base própria; DML do runtime pelos default privileges; nenhuma função,
view, regra, `SECURITY DEFINER` ou `GRANT`.

**Por que assim (tabela de alternativas da v1 §3.1, inalterada), mais duas linhas:**

| Alternativa | Por que não |
|---|---|
| `ON DELETE CASCADE` no recibo para "resolver" o teardown do 01 (A-01) | afrouxa a FK que protege o fato imutável; o teardown é problema do arnês, e o arnês ganha uma linha (§7.2) — é a saída que o repositório já tinha escolhido (`rls-tenant-isolation.test.ts:1906`) |
| `vehicle_id`/`binding_id` só no recibo (a linha de telemetria sem eles, via JOIN) | a leitura do B-TRC-04 ("último estado por viatura") precisa do índice `(tenant_id, vehicle_id, kind, occurred_at)` na própria tabela; a FK de 4 colunas dá a mesma consistência sem o JOIN |

### 6.2 Allowlist de EVENTOS: tipos e catálogo de alarmes (inalterados da v1 §3.2; Q3 = SIM confirma os 38)

`src/integrations/traccar/traccar-telemetry-catalog.ts` é a única fonte: `deviceOnline/Unknown/Offline` → `device_online/unknown/offline`;
`deviceMoving/Stopped` → `device_moving/stopped`; `deviceOverspeed` → `device_overspeed`; `ignitionOn/Off` → `ignition_on/off`; `alarm` +
`attributes.alarm` → `alarm` + `alarm_code` (os **38** `ALARM_*` de `Position.java:116-153`, todos conservados — Q3); `commandResult`,
`queuedCommandSent`, `deviceInactive`, `deviceFuel*`, `geofence*`, `proximity*`, `unaccompaniedMotion`, `maintenance`, `driverChanged`,
`media` e **qualquer outro** → `ignored` (204; contado; nunca o `type` cru no log).

### 6.3 Allowlist de ATRIBUTOS da posição e o domínio FECHADO por coluna (A-02, A-16 iv)

`src/modules/telemetry/vehicle-telemetry.bounds.ts` (novo) é a **única** fonte dos limites; o parser (`traccar-position.schema.ts`) os
usa, e a migração os repete **literalmente** (B9 e F9 provam a igualdade nas bordas):

| Chave Traccar | Forma aceita (senão **descartado**, contado) | Normalização | Coluna | Domínio (parser **=** CHECK) |
|---|---|---|---|---|
| `ignition` | booleano exato | — | `ignition` | `true/false` |
| `motion` | booleano exato | — | `motion` | `true/false` |
| `odometer` | número finito | `Math.round(m)` | `odometer_m BIGINT` | `0 ≤ v ≤ 9007199254740991` (2^53−1) |
| `totalDistance` | número finito | `Math.round(m)` | `total_distance_m BIGINT` | idem |
| `hours` | número finito (ms) | `Math.round(ms / 1000)` | `engine_hours_s BIGINT` | `0 ≤ v ≤ 9007199254740991` (após a divisão) |
| `power` | número finito (V) | `Math.round(V × 1000)` | `power_mv INTEGER` | **`0 ≤ V ≤ 1000`** → `0 ≤ mV ≤ 1000000` (cabe em int4; 1000 V é teto declarado — nenhuma viatura passa de 60 V; `power=3000000` do A-02 é descartado) |
| `batteryLevel` | número finito (%) | **`Math.round` e DEPOIS** `0..100` | `battery_level_pct INTEGER` | `0 ≤ v ≤ 100` (99,6 → 100 ✓; 100,4 → 100 ✓; 100,6 → 101 ✗; −0,4 → 0 ✓) |

Regras: `NaN`, `±Infinity`, string (`"12"`), `null`, booleano em campo numérico, número em campo booleano → **descartado** (o resto da
amostra segue); `-0` → `0`; `attributes` sem chave allowlisted → `telemetry` ausente → nenhuma linha `sample`; chave reservada dentro de
`attributes` continua **não** sendo procurada (regra do 01; mas `attributes.tenantId` **não influencia nada**: E19/F11); chave e digest da
posição **não mudam** (C-15). `distance`, `battery` (V), `fuel*`, `rpm` e o resto **não entram**.

### 6.4 Online / sem sinal / offline, última ignição e a ordem atrasada (A-16 i/ii)

- **Persistido:** cada transição de status = **uma linha** (`device_online`/`device_unknown`/`device_offline`, `occurred_at = eventTime`).
- **Derivado, nunca materializado:** `latestDeviceStatus(tenantId, vehicleId)` = a linha de maior `occurred_at` entre os 3 kinds; **empate
  no mesmo ms** → precedência fechada **`device_offline` > `device_unknown` > `device_online`** (o menos disponível vence — falha fechada
  para "o dispositivo está alcançável?"), implementada no `ORDER BY occurred_at DESC, CASE kind … END ASC LIMIT 1`. **`received_at` não
  entra em nenhum `ORDER BY`** (M-E15, M-E41). `latestIgnition(tenantId, vehicleId)` = idem entre `ignition_on/off`; empate → `ignition_off`.
- **Ordem atrasada:** `device_unknown(t1)` entregue depois de `device_online(t2 > t1)` grava a linha e o estado continua `online` (E10);
  `ignition_off(t1)` depois de `ignition_on(t2 > t1)` → última ignição `on` (E17).
- **Em dev:** `EVENT_STATUS_ENABLE=true` e `STATUS_TIMEOUT=60` por **ambiente no overlay** (S-E15; H-12) — ou no `traccar.xml` de dev se
  H-12 cair; produção = decisão do B-TRC-06 (`P-TRC02-STATUS-TIMEOUT-PROD`).

### 6.5 Chave de identidade e digest do evento (A-07; fecha "a fixture decide")

- **`external_event_key`** = SHA-256 hex de
  `"v1|<instance_key>|<device.uniqueId>|<event.type>|<eventTime ms UTC>|<alarm ou vazio>|<lat7 ou vazio>|<lon7 ou vazio>"`, com
  `lat7/lon7 = position.latitude/longitude.toFixed(7)` (a **mesma** `coordinate()` do adaptador da posição) **quando `position` existe e
  as coordenadas são números finitos em faixa**; vazios nos eventos de status (sem `position`) ou com coordenada ausente/inválida.
  `message_kind = 'event'`. **Não usa** `event.id`, `positionId`, `position.id` nem `receivedAt`.
- **Por quê a coordenada:** o `eventTime` dos eventos derivados de posição é o `deviceTime` (S-E6); relógio travado no aparelho + duas
  transições de ignição = dois `ignitionOn` com o mesmo ms (A-07). Com a coordenada, só colidem dois eventos **de conteúdo idêntico**
  (mesmo dispositivo, tipo, ms, alarme e ponto) — e esses **são** a mesma entrega: tratá-los como `duplicate` é o único desfecho
  defensável sem o `id` do banco do Traccar. Declarado; A16 prova o caso.
- **`payload_digest`** = SHA-256 hex do JSON canônico (chaves ordenadas) de `{type, eventTime ISO, uniqueId, traccarDeviceId, alarm,
  latitude (lat7), longitude (lon7), positionFixTime ISO}` — `null` onde ausente; sem ids. Mesma chave com digest diferente → `409` +
  `conflict_count`.
- **Função pura exportada:** `computeTraccarEventKey(instanceKey, {uniqueId, type, eventTimeMs, alarm?, latitude?, longitude?})`. O B-TRC-03
  a reusa (H-11; precisa da posição por `positionId` para os eventos derivados de posição — declarado para lá).
- **Amostra:** herda a chave do **recibo da posição**; [Q1=SIM] e grava `fix_key` = essa chave.

### 6.6 O que muda no código do 01 — e o que NÃO muda (regra do espelho: o módulo de referência é `src/integrations/traccar/`)

| Arquivo do 01 | Muda | Não muda |
|---|---|---|
| `traccar-ingest.app.ts` | `TraccarIngestAppDeps` ganha **`eventLimiter?: TraccarIngestLimiter`** (aditivo; ausente → a rota de eventos usa `limiter`, e C11 prova que o app de produção passa os dois) e `ingestEvent`; fábrica `mountIngestRoute(path, limiter, parse, build, ingest)` usada pelas **duas** rotas na mesma ordem (query → auth → content-type → json 64 KiB → limitador → parser → serviço com porta de commit); `TraccarIngestOutcome` ganha `{kind:"ignored"; reason:"unknown_type"¦"unknown_alarm"}` → 204; a linha de log da requisição ganha `outcome`/`reason` (sem `type`) | ordem dos middlewares; porta de commit; 404 do resto; corpo vazio em 2xx; o uso de `deps.limiter` pela rota de posição |
| `traccar-position.schema.ts` | lê as 7 chaves de §6.3 de `position.attributes` com `VEHICLE_TELEMETRY_BOUNDS` → `telemetry?` | chaves reservadas; `id` ignorado; limites; não varre `attributes` |
| `traccar-position.adapter.ts` | `TraccarPositionCommand.telemetry?` | `computeExternalEventKey`, `computePayloadDigest` (byte a byte); `coordinate()` passa a ser **exportada** (reuso pela chave do evento) |
| `traccar-ingestion.service.ts` | `ingestEvent(command, deadline)` (fase 2 do evento, §5.3); no passo 7 da posição, `insertSampleInSavepoint(tx, …)` quando `command.telemetry` existe; `quarantineWithoutTenant` aceita os dois comandos (`toQuarantineSubject`); `createTraccarIngestAppFromEnv` cria **dois** limitadores; [Q1=SIM] `sampleWithoutOperator` no passo 5 | os 7 passos da posição e seus motivos; `publishAfterCommit` (só posição); orçamentos; `NO_OPERATOR_REASON` |
| `traccar-ingestion.repository.ts` | `findReceipt(subject, kind)` e `insertReceipt({…, messageKind})` parametrizados (default `'position'`; chamadores do 01 inalterados em efeito); `recordQuarantine(subject, reason)` tipado por `TraccarQuarantineSubject`; **`hooks.beforeSampleInsert?`** (só para F10/I7) | SQL de vínculo/quarentena; `ON CONFLICT`; `attachLocation`; `lockActiveBinding` (e o hook `afterBindingLocked`, que E4 reusa) |
| `index.ts` | exporta parser/adaptador/catálogo/bounds de evento e `TRACCAR_EVENT_INGEST_PATH` | — |
| `traccar-forward-auth.ts`, `traccar-rate-limit.ts`, `traccar-ingest.logger.ts`, `traccar-resolution.ts`, `traccar-db.ts`, `traccar-ingest.bootstrap.ts` | **nada** | tudo (a cadeira (b) mede por pathspec) |

**Novos em `src/integrations/traccar/`:** `traccar-event.schema.ts` (parser; reusa `TraccarPayloadError`), `traccar-event.adapter.ts`
(comando, chave com coordenada, digest, `eventQuarantineReason`), `traccar-telemetry-catalog.ts`. **Novos em `src/modules/telemetry/`:**
`vehicle-telemetry.types.ts`, `vehicle-telemetry.bounds.ts` (**os limites de §6.3, uma fonte**), `vehicle-telemetry.repository.ts`
(porta: `insertEvent(tx, …)`, `insertSample(tx, …)` [Q1=SIM: com `fixKey` e `ON CONFLICT (fix_key) WHERE kind='sample' DO NOTHING`],
`latestDeviceStatus`, `latestIgnition`, `listByVehicle`), `vehicle-telemetry-prisma.repository.ts` (`$queryRaw` com template;
`SAVEPOINT`/`RELEASE`/`ROLLBACK TO` por `$executeRaw` no `tx` recebido, o idioma de `identity-resolver.ts:49-77`). `telemetry/index.ts`
só re-exporta; `telemetry.routes.ts`, `telemetry.service.ts`, `telemetry.types.ts` **não mudam**.

**Savepoint — a forma exata (para que a mutação M-E32 tenha âncora):**
```ts
await tx.$executeRaw`SAVEPOINT vehicle_sample`;
try {
  await repo.insertSample(tx, sample);
  await tx.$executeRaw`RELEASE SAVEPOINT vehicle_sample`;
} catch (error) {
  await tx.$executeRaw`ROLLBACK TO SAVEPOINT vehicle_sample`;   // M-E32 troca esta linha por `throw error;`
  logger?.warn({ outcome: "sample_discarded", code: errorCode(error) }, "Traccar ingestion discarded a vehicle sample");
}
```

---
## 7. Escopo — PERMITIDO e PROIBIDO (caminhos exatos)

### 7.1 PERMITIDO

| Caminho | Trabalho |
|---|---|
| `prisma/schema.prisma` | `model VehicleTelemetryEvent` + relações reversas + `@@unique` de 4 colunas no recibo + comentário do recibo (§6.1). Nada mais |
| `prisma/migrations/20260878000000_vehicle_telemetry_events/migration.sql` | migração A (§6.1), literal, rollback no fim |
| `prisma/migrations/20260879000000_validate_receipt_message_kind_check/migration.sql` | migração B (só `VALIDATE`) |
| `src/integrations/traccar/traccar-event.schema.ts`, `traccar-event.adapter.ts`, `traccar-telemetry-catalog.ts` | novos |
| `src/integrations/traccar/traccar-ingest.app.ts`, `traccar-ingestion.service.ts`, `traccar-ingestion.repository.ts`, `traccar-position.schema.ts`, `traccar-position.adapter.ts`, `index.ts` | só o que §6.6 lista |
| `src/modules/telemetry/vehicle-telemetry.types.ts`, `vehicle-telemetry.bounds.ts`, `vehicle-telemetry.repository.ts`, `vehicle-telemetry-prisma.repository.ts` | novos; `src/modules/telemetry/index.ts` só `export *` |
| `src/modules/vehicles/**`, `src/config/env.ts`, `.env.example` | **permitidos pelo §7, não previstos**: nenhuma porta nova, nenhuma variável nova (o limitador de eventos reusa os valores). O dev não toca sem emenda escrita |
| `docker-compose.traccar.yml` | serviço `traccar`: `EVENT_FORWARD_URL: ${TRC_EVENT_FORWARD_URL:-http://api:3200/ingest/traccar/v1/events}`, `EVENT_FORWARD_HEADER: ${TRC_FORWARD_HEADER:?…}`, `EVENT_STATUS_ENABLE: "true"`, `STATUS_TIMEOUT: "60"` (S-E15/H-12); `traccar-sim`: `TRC_SIM_EXTRA`; `traccar-capture`: `TRC_CAPTURE_PATH`. **Nenhum `ports` novo** |
| `infra/traccar/dev/traccar.xml` | **só se H-12 cair** (então `event.status.enable`/`status.timeout` lá, com comentário "só dev"); `event.forward.type=json` (não é segredo) |
| `infra/traccar/fixtures/6.16.0/event-{device-online,ignition-on,alarm-sos,device-unknown}.json` (capturadas) + `event-device-offline.json` (sintética, rotulada) | §3.4 |
| `scripts/traccar-capture-fixture.mjs` | modo `--kind event`; mesmo teto, mesma sanitização, `down -v` sempre |
| `scripts/traccar-dev-demo.mjs` | passos 13-19 (§5.1) **e** o passo do `GRANT` dentro de `WITH_WEB` (§5.5) |
| `tests/traccar-event-contract.test.ts`, `traccar-event-sample.test.ts`, `traccar-event-listener.test.ts`, `traccar-event-logs.test.ts`, `traccar-event-topology.test.ts` (sem banco); `traccar-event-ingestion-db.test.ts`, `traccar-event-sample-db.test.ts`, `traccar-event-rls-db.test.ts` (`-db`); **[Q1=SIM]** `traccar-event-sample-quarantine-db.test.ts` | §9 |
| `tests/traccar-position-contract.test.ts` | **só** o título e 1 asserção nova do caso l.88-95 (§9.4) |
| **`tests/traccar-idempotency-db.test.ts`, `traccar-position-ingestion-db.test.ts`, `traccar-resolution-race-db.test.ts`, `traccar-quarantine-db.test.ts`, `traccar-binding-uniqueness-db.test.ts`** | **só a linha de §7.2** (A-01) |
| `tests/telemetry.test.ts` | **sem edição** — regressão (17 casos) |
| `.github/workflows/ci.yml` | **só** o bloco `SUITES=`: as 3 (ou 4) suítes `-db` novas, medidas 3×, **e** o comentário da l.282 com o denominador medido (fecha `P-TRC-CI-COMENTARIO-DENOMINADOR`) |
| `API_CONTRACTS.md` (§2.1-bis), `docs/deployment.md` (chaves `event.*`/`status.timeout`) | contrato e config |
| `docs/revisoes/TRACCAR/B-TRC-02-plano.md` (cópia desta v2), `B-TRC-02-plano-v1.md` (cópia da v1, como registro), `B-TRC-02-critica-r1-{opus,flash}.md`, `B-TRC-02-dev.md`, `B-TRC-02-evento-captura.md`, `B-TRC-02-evidencias/mutations.mjs`; `agent-orchestration/codex/comandos/B-TRC-02-traccar-eventos-e-telemetria.md`; `agent-orchestration/omega/juntas/**`; `.claude/agents/especialistas/jurado-trc02-*.md` + espelho | registro |
| `agent-orchestration/controle/pendencias.md`, `decisoes.md` | **pelo orquestrador** (§12) |

### 7.2 As 5 edições nos arnês `-db` do 01 — exatas (A-01)

Em cada arquivo, **uma linha**, e só ela (a cadeira (a) mede o diff por `git diff c1485c94..<head> -- <arquivo>`: `+1` linha, `−0`):

| Arquivo | Linha (ref `3fbcaea2`) | Edição |
|---|---|---|
| `tests/traccar-idempotency-db.test.ts` | 81: `for (const table of ["traccar_ingress_receipts", …` | a lista passa a `["vehicle_telemetry_events", "traccar_ingress_receipts", …` (a tabela nova **primeiro**: a FK `RESTRICT` exige) |
| `tests/traccar-position-ingestion-db.test.ts` | 101-102: `for (const table of [` / `"traccar_ingress_receipts",` | nova linha `"vehicle_telemetry_events",` antes de `"traccar_ingress_receipts",` |
| `tests/traccar-resolution-race-db.test.ts` | 89 | como a idempotency |
| `tests/traccar-quarantine-db.test.ts` | 73 | como a idempotency |
| `tests/traccar-binding-uniqueness-db.test.ts` | 48: `DELETE FROM traccar_ingress_receipts …` | nova linha **antes**: `await h.admin.$executeRawUnsafe("DELETE FROM vehicle_telemetry_events WHERE tenant_id = ANY($1::uuid[])", ids);` (no mesmo estilo de template string do arquivo) |

Por quê **só** isso: a FK continua `RESTRICT` (não se afrouxa o banco para o arnês passar); os casos e as asserções do 01 **não mudam**
(a amostra é uma linha a mais numa tabela que eles não leem). `traccar-ingest-pool-db` não ingere posição (F-R15) → sem edição. H9
(estático) e M-E43 (arnês) travam a regressão. Os **9** arquivos de teste do 01 restantes (`dev-topology`, `forward-auth`,
`ingest-listener`, `ingest-logs`, `ingest-pool-db`, `operator-at-fix-time`, `rate-limit`, `resolution-cost`, `rls-budget-order`) ficam
**byte a byte** iguais a `c1485c94`.

### 7.3 Alargamento do PERMITIDO do §7 do plano do Traccar — DECLARADO (A-05)

O §7 (`PLANO_TRACCAR.md:1022-1028`) permite ao 02: `prisma/schema.prisma`, uma migração, `src/integrations/traccar/**`,
`src/modules/telemetry/**`, `src/modules/vehicles/**` (porta de leitura), `src/config/env.ts`, `.env.example`, `tests/traccar-event-*.test.ts`,
`tests/telemetry.test.ts`, contratos/docs/orquestração. Esta v2 **alarga** em:

| Caminho fora do §7 | Razão medida | Registro |
|---|---|---|
| `docker-compose.traccar.yml` | `event.forward.url/header` só existem por ambiente (S-E4/S-E15); sem isso o Traccar não encaminha evento — o §7 os cita só no B-TRC-03 porque lá nasce o GT06; aqui é o **mínimo** para o evento existir | `D-TRC02-ESCOPO` (§12) |
| `infra/traccar/dev/traccar.xml` | só se H-12 cair | idem |
| `infra/traccar/fixtures/6.16.0/event-*.json` | o §7 **exige** "fixtures reais de evento 6.16.0"; o caminho é o do 01 | idem |
| `scripts/traccar-capture-fixture.mjs`, `scripts/traccar-dev-demo.mjs` | a captura é como a fixture nasce; o demo é o smoke; o `GRANT` da Q2 é decisão do dono | idem |
| `tests/traccar-position-contract.test.ts` + os 5 arnês de §7.2 | o fluxo S muda um enunciado do 01 (§9.4) e o teardown (A-01) | idem |
| `.github/workflows/ci.yml` (bloco `SUITES=`) | convenção da lista curada (toda `-db` nova entra) | idem |
| 2ª migração (`VALIDATE`) e o índice novo em `traccar_ingress_receipts` | N2-06; A-12 | §6.1 |

A cadeira (b) mede `git diff --name-only c1485c94..<head>` ⊆ **(§7 ∪ esta tabela)** — e não contra o §7.1, que seria circular.

### 7.4 PROIBIDO

`src/app.ts` e `src/portal-app.ts` (rota de evento no app público = M-E11); `frontend/**`; `mobile/**`; `src/modules/notifications/**`;
`src/modules/work-orders/**` (escrita em `mileage_*` é defeito); `src/modules/field-dispatch/**`, `src/modules/field-location/**`;
`src/database/rls.ts`; `src/infra/**`; RBAC; `package.json`/lockfiles; `Kpis/**`; `docker-compose.prod.yml`; `scripts/db-runtime-role.sh`
(o `GRANT` **não** entra aqui: H7); `infra/**` fora de `infra/traccar/`; porta pública ou `ports` novo; WebSocket; outbox/SSE para
evento veicular; raw forward; servidor público de demonstração; `UPDATE`/`DELETE` em `vehicle_telemetry_events` pela aplicação;
`traccar_quarantine_items` (DDL intocado); os 9 arquivos de teste do 01 de §7.2; `tests/field-dispatch*`, `tests/work-order*`;
worktrees alheios.

---
## 8. Dependências e gate de início do código

**Dependências (inalteradas da v1 §5.1, re-medidas):** B-TRC-01 mergeado (#426, `c1485c94`); porteiro do #426 na ref
(`omega/juntas/votos/B-TRC-01-ciclo3/porteiro-426-parecer.md`); Traccar 6.16.0 por digest; D1 = C (sete blocos) **decidida**; B-SAN3-05
mergeado (pré-requisito de produção, não de dev).

**Gate (cada linha conferida pelo dev no passo 0, com comando e saída em `B-TRC-02-dev.md`):**

| # | Condição | Como se mede |
|---|---|---|
| 1 | `origin/main` contém o 01 e o porteiro do #426 | `git cat-file -e origin/main:src/integrations/traccar/traccar-ingest.app.ts && git cat-file -e origin/main:agent-orchestration/omega/juntas/votos/B-TRC-01-ciclo3/porteiro-426-parecer.md` |
| 2 | Nenhum arquivo do PERMITIDO mudou entre `3fbcaea2` e o head do dia | `git diff --name-only 3fbcaea2 origin/main -- src/integrations/traccar src/modules/telemetry prisma docker-compose.traccar.yml infra/traccar scripts/traccar-*.mjs tests/traccar-*.test.ts .github/workflows/ci.yml` → vazio, ou re-medir o que mudou |
| 3 | Carimbo `20260878000000` livre (H-8) | `git ls-tree -r --name-only origin/main prisma/migrations ¦ grep -c 20260878` → 0 (senão renumerar e anotar) |
| 4 | Fixture real de evento capturada **antes** do contrato (H-1, H-3..H-7, H-12) | `node scripts/traccar-capture-fixture.mjs --kind event` → 4 arquivos; `B-TRC-02-evento-captura.md` com header names, `event.id`, datas, coordenadas presentes/ausentes, "2ª entrega: não" |
| 5 | Baseline N executado (H-9) | 15 suítes do 01 + `tests/telemetry.test.ts` no container, `fail 0`, `skipped 0`, `# tests` publicado |
| 6 | Disco ≥ 10 GB; ≤ 2 trabalhos com Docker; worktree próprio em caminho curto, `npm ci` próprio, sem junction | `df -h /c`; `docker ps`; `git worktree add C:/Users/AMP/w-trc02 -b feat/traccar-b-trc-02 origin/main` |
| 7 | **Estado da Q1 no dia:** `decisoes.md` tem `D-TRC02-RESPOSTAS` (Q1 = SIM, l.3783) **e** o dev procura uma entrada posterior `D-TRC02-Q1-*` (a devolução ao dono com o contexto de A-14). SIM (ou silêncio) → implementa §Q1; **NÃO → aplica a lista de remoção de §Q1.7 antes de escrever a migração** | `git show origin/main:agent-orchestration/controle/decisoes.md ¦ grep -n 'D-TRC02-'` |
| 8 | **Q2:** `D-TRC02-RESPOSTAS` Q2 = SIM (l.3785) sem reversão posterior → o passo do `GRANT` entra no demo (§5.5); NÃO → sai o passo, sai H7 (fica só o guard 8), e `P-TRC-DEMO-LOGIN-SEM-ORG-INERTE` continua aberta | idem |

---

## 9. Testes por critério, mutações, baseline e bateria

### 9.1 Critérios → teste → mutação (cada mutação aplicada sozinha deixa o caso nomeado vermelho)

Convenção: `A`..`I` são as suítes de §9.2; `M-Exx` = entrada de `docs/revisoes/TRACCAR/B-TRC-02-evidencias/mutations.mjs` (formato do 01:
âncora única, `tsc`, TAP, restauro por hash). Os C-01..C-18 da v1 são mantidos com o texto **atualizado** onde a v2 mudou; C-19..C-25
são novos; C-Q1-1..3 estão em §Q1.

| # | Critério (propriedade) | Teste(s) | Mutação → vermelho |
|---|---|---|---|
| C-01 | A fixture REAL de evento vira o comando canônico; `position` é opcional; `geofence`/`maintenance` ignorados | A1, A2, A9 | M-E01: parser exige `position` → A2 |
| C-02 | Chave e digest **não** usam `event.id`/`positionId`/`position.id`/`receivedAt`; chave = `v1¦inst¦uniqueId¦type¦ms¦alarm¦lat7¦lon7`; a função pura é **determinística** (mesmas entradas → mesma chave, por qualquer chamador) | A3, A4, A11, A12, A15, A16, A17, E12 | M-E02: `traccarEventId` no digest → A3; M-E03: `receivedAt` na chave → A11/E12; **M-E39**: coordenada fora da chave → A15 |
| C-03 | `type`/código fora do catálogo → `ignored` (204, nada gravado, `type` nunca logado, **contado** na linha de log) | A5, A6, C10, D4, **D5**, E14 | M-E04: `default:` devolve `alarm` → A5/E14; M-E05: log inclui `type` → D4; **M-E44**: linha do `ignored` sai como `stored` → D5 |
| C-04 | Chave reservada em envelope/`event`/`device`/`position` → 422; dentro de `attributes` não se procura **e não influencia** | A7, A8, C9, E14, **E19**, **F11** | M-E06: `assertNoReservedKeys(event)` removido → A7; **M-E37**: `attributes.tenantId` vira dica de organização → E19/F11 |
| C-05 | `device.name/phone/contact/model`, coordenada e `geofence/maintenance` não chegam ao comando como campos nem ao banco (a coordenada só entra **hasheada** na chave/digest) | A9, E13, G6 | M-E07: adaptador copia `device.name` → A9 |
| C-06 | Rota de evento **só** no app de ingestão, mesma cadeia e ordem | C1-C7, C9, C2 (app público 404) | M-E11: rota em `src/app.ts` → C2; M-E12: rota sem `traccarForwardAuthMiddleware` → C4 e C12 |
| C-07 | A rota `/events` usa **o mesmo autenticador** do 01 (`deps.authenticator`: tempo constante, `Authorization` recusado, header repetido recusado) | C4, **C12** (contagem de chamadas no objeto injetado) | M-E12 → C12; MUT-17/18/19/38 do 01 **re-executadas** com `tests: [...T.auth, suíte C]` (o vermelho de tempo constante é do módulo; C12 prova que a rota usa o módulo) |
| C-08 | Log sem segredo, sem coordenada (da posição anexada) e sem `type` cru, em 204/202/422/503 | D1-D4 | M-E05; M-E13: serializador `req` volta ao default → D1 |
| C-09 | Organização **nunca** do payload: vínculo `FOR SHARE`; sem vínculo → 202 `unmapped_device` **com linha na quarentena**; teto de organizações → 202 `resolution_budget_exceeded`; B semeada e nunca ingerida `0/0/0` | E5, E5′, **E18**, E13, E9 | **M-E38**: `quarantineWithoutTenant` de evento devolve antes de gravar → E5; MUT-09 re-executada → E18; M-E37 → E19 |
| C-10 | Evento não exige operador: viatura vinculada sem despacho → 204 e linha (guardar ≠ exibir; `P-TRC02-LGPD-TELEMETRIA-SEM-DESPACHO`) | E8 | M-E09: fase 2 do evento chama `operatorAt` → E8 |
| C-11 | Idempotência: reenvio idêntico → 204; digest ≠ → 409 + `conflict_count`; **2 entregas concorrentes com barreira** → 1 recibo, 1 linha; chave de outra organização → 409 | E1, E2, E3, E4 (barreira `afterBindingLocked`), E9 | M-E10: `ON CONFLICT DO NOTHING` do recibo de evento removido → E4 (503); M-E14 (migração): `tenant_id` no índice global → E9 |
| C-12 | Ordem atrasada: estado por `occurred_at`, nunca `received_at`; **empate → precedência fechada**; última ignição por `occurred_at` | E10, E11, **E16**, **E17** | M-E15: `latestDeviceStatus` por `received_at` → E10; **M-E41**: precedência invertida → E16; **M-E42**: `latestIgnition` por `received_at` → E17 |
| C-13 | Amostra **com posição gravada**: mesma transação, recibo **da posição**, 1ª gravação vence; sem atributo allowlisted → sem linha; posição em quarentena → **0 recibo `position`, 0 localização** (a amostra em quarentena é regra de §Q1: SIM → suíte I; NÃO → F3 recupera "0 amostra") | F1, F2, F3, F4, F5 | M-E17: `insertSample` usa `this.options.client` em vez do `tx` → F5 (linha sobrevive ao rollback); M-E18: `insertSample` sempre → F4 (CHECK `measures`); **[Q1=NÃO] M-E16′**: `quarantined()` grava recibo `'position'` + amostra → F3 vermelho **por contagem** |
| C-14 | Unidades: `hours` ms→s, `power` V→mV, m inteiros (`Math.round`), `batteryLevel` arredondado e 0..100; forma errada → atributo descartado, posição aceita | B1, B4, B6, B8, **B10**, F7 | M-E19: `engineHoursS = hours` → B8/F7; M-E20: `powerMv = power` → B8; **M-E45**: trunca em vez de arredondar → B10 |
| C-15 | Chave e digest da **posição** não mudam com `attributes` | B5, caso de §9.4 | M-E21: `telemetry` no `computePayloadDigest` → B5 e o caso do 01 |
| C-16 | Nunca escreve em `work_orders.mileage_*` | F6 (md5 da OS antes/depois) | M-E22: `UPDATE work_orders SET mileage_end …` → F6 |
| C-17 | Banco por construção: `ENABLE+FORCE RLS` + política; FKs compostas; `UNIQUE (tenant_id, receipt_id)`; CHECKs; sem `json/jsonb/float`, sem lat/lon; 0 `pg_rules`, 0 `SECURITY DEFINER` novo, `RUNTIME_ROLE_GUARD_SQL` limpo; CHECK do recibo alargado **e validado**; **drill**: sobe, rollback na ordem de §6.1, `_prisma_migrations` limpo | G1-G9 | M-E23: `FORCE` removido → G1; M-E24: FK simples em `vehicle_id` → G3; M-E25: `UNIQUE receipt` removido → G4; M-E26: migração B removida → G8 (`convalidated=false`); M-E27: coluna `attributes JSONB` → G6 |
| C-18 | Topologia de dev: `EVENT_FORWARD_URL` → `api:3200/…/events`; `EVENT_FORWARD_HEADER` só por `${TRC_FORWARD_HEADER:?}`; `EVENT_STATUS_ENABLE`/`STATUS_TIMEOUT` só no overlay de dev (ou `traccar.xml` de dev); nenhum `ports` novo; nenhum servidor demo | H1-H5 | M-E28: `EVENT_FORWARD_HEADER: "X-Traccar-Forward-Token: fixo"` literal → H2; M-E29: `STATUS_TIMEOUT` fora do overlay de dev (no `docker-compose.prod.yml`) → H4 |
| **C-19** | **O que o parser aceita ⊆ o que a coluna e o CHECK aceitam** (domínio fechado, uma fonte); **a amostra nunca derruba a posição** (savepoint): valor que o banco recuse → 204, localização e recibo gravados, 0 amostra, log `sample_discarded` | **B9** (tabela de borda: para cada coluna, `min−1`, `min`, `max`, `max+1`, `NaN`, `Infinity`, string, booleano/numero trocados), **F9** (todo valor aceito em B9 insere; todo valor recusado em B9, inserido **direto** sem parser → `23514`/`22003`), **F10** (comando com `powerMv: -1` montado à mão → 204, 1/1/0, log) | **M-E30**: `power` sem limite inferior no parser → B9; **M-E31**: CHECK sem `power_mv >= 0` → F9; **M-E32**: `ROLLBACK TO SAVEPOINT` vira `throw error` → F10 (503, 0 localização) |
| **C-20** | **O arnês do 01 sobrevive à FK `RESTRICT`**: as 5 suítes `-db` do 01 passam (`after` verde) com a tabela nova populada; o teardown apaga `vehicle_telemetry_events` **antes** de `traccar_ingress_receipts` | as 5 suítes de §7.2 (regressão verde) + **H9** (estático: toda `tests/traccar-*-db.test.ts` que apague `traccar_ingress_receipts` apaga `vehicle_telemetry_events` numa linha anterior) | **M-E43** (arnês): a linha nova de `traccar-idempotency-db.test.ts` removida → o `after` dela falha (`23503`) **e** H9 vermelho |
| **C-21** | **O segredo do evento nunca vai para o `traccar.xml` nem para literal no compose**: nenhuma `<entry key>` terminada em `forward.header`; `X-Traccar-Forward-Token` no overlay só dentro de `${TRC_FORWARD_HEADER:?}` | **H6** | **M-E33**: `<entry key='event.forward.header'>X-Traccar-Forward-Token: x</entry>` no `traccar.xml` → H6 (a guarda l.214 do 01 continua verde: é a lacuna medida) |
| **C-22** | **Limitador por rota**: a posição esgota o bucket **dela** e o evento ainda entra; o evento esgota o **dele** e a posição entra; `ignored` consome ficha do bucket de eventos; o app de produção (`createTraccarIngestAppFromEnv`) passa **dois** limitadores | **C8** (burst 1 em posições → 2ª posição 429, evento 204), **C11** (burst 1 em eventos → 2º evento 429, posição 204; `ignored` conta) | **M-E36**: a rota de eventos usa `deps.limiter` ignorando `eventLimiter` → C8/C11 |
| **C-23** | **Q2 confinada**: `GRANT EXECUTE … auth_login_candidates` existe em **um** arquivo (`scripts/traccar-dev-demo.mjs`, bloco `WITH_WEB`); zero em migrações, `db-runtime-role.sh`, composes, `src/**`, `infra/**`, `.github/**` | **H7**; guard 8 (`auth-invariant-guards.test.ts:186`) re-executado | **M-E34**: o `GRANT` migra para `db-runtime-role.sh` → H7; **M-E35**: `GRANT` na migração A → guard 8 **e** H7 |
| **C-24** | **Linha e recibo concordam em viatura e vínculo** (FK de 4 colunas): dentro da mesma organização, linha com o recibo de V1 e `vehicle_id` de V2 → `23503` | **G10** | **M-E40**: FK de 4 colunas trocada pela de 2 na migração → G10 |
| **C-25** | **Fixtures sanitizadas** (o item (iii) do inspetor vira teste): `device.name/phone/contact` sintéticos (`Sintetic`/`+5500…`), `device.attributes = {}`, nenhuma coordenada fora da caixa sintética de São Paulo usada pelo 01, nenhuma chave reservada | **H8** (estático, sobre os 5 `event-*.json`) | — (mutação de fixture não se aplica; H8 é guarda, declarado) |

### 9.2 As suítes e os `test()` (nomes = propriedade, nunca forma)

**Sem banco (5 arquivos, 54 casos):**
- **A `tests/traccar-event-contract.test.ts` (17):** A1 fixture `event-ignition-on` → comando (`kind`, `occurredAt`, chave 64 hex); A2
  `event-device-online` sem `position` → aceito; A3 `event.id` ausente/0/>0 → mesma chave e digest; A4 `positionId`/`position.id` fora da
  chave; A5 `geofenceEnter`/`commandResult`/tipo inventado → `ignored`; A6 `alarm` do catálogo → `alarmCode`, fora → `ignored`, sem
  `attributes.alarm` → 422; A7 reservadas nos 4 níveis → 422 (laço de 8 chaves); A8 reservada dentro de `event.attributes`/`position.attributes`
  **não** dá 422; A9 sentinelas em `device.*`, `position.latitude` (como **campo**), `geofence`, `maintenance` não chegam ao comando (o
  comando só carrega hashes); A10 `deviceId ≠ device.id` / `uniqueId` inválido / `eventTime` sem fuso / `type` fora do padrão → 422; A11
  `eventTime` ≠ → chave ≠; mesmo instante com `alarm` ≠ → chave ≠; A12 digest canônico com chaves ordenadas e sem ids; A13
  `deviceOnline/Unknown/Offline` → `device_online/unknown/offline` (a `offline` sintética, rotulada); A14 `eventTime` > agora+5 min →
  `fix_in_future`; **A15** dois `ignitionOn` com o **mesmo** `eventTime` e coordenadas diferentes → chaves **diferentes**; **A16** dois
  `ignitionOn` idênticos (mesmo ms, mesma coordenada) → mesma chave e mesmo digest (duplicata por conteúdo, declarada); **A17** evento de
  status (sem `position`) → componentes de coordenada vazios; `position` com coordenada inválida (`NaN`, 200) → tratada como ausente,
  evento aceito.
- **B `tests/traccar-event-sample.test.ts` (11):** B1 7 atributos → `telemetry` normalizado; B2 sem allowlisted → ausente; B3 desconhecidos
  ignorados e `attributes.tenantId` sem 422; B4 forma/faixa errada → atributo descartado, posição aceita (`ignition:"yes"`,
  `batteryLevel:150`, `odometer:-1`); B5 chave/digest da posição iguais com e sem atributos; B6 `odometer: 12345.6` → 12346; `1e16` →
  descartado; B7 a fixture real `position-osmand.json` → `{motion:true, totalDistanceM:0}`; B8 `hours: 3600000` → 3600; `power: 12.6` →
  12600; **B9** tabela de borda, **gerada de `VEHICLE_TELEMETRY_BOUNDS`** (para cada coluna: `min−1` ✗, `min` ✓, `max` ✓, `max+1` ✗, `NaN`
  ✗, `Infinity` ✗, `"12"` ✗, `true` em numérico ✗, `1` em booleano ✗) — inclui `power: -1` ✗, `power: 1000` ✓ (1 000 000 mV),
  `power: 1000.001` ✗, `hours: 1e25` ✗; **B10** `batteryLevel` 99,6 → 100; 100,4 → 100; 100,6 → descartado; −0,4 → 0; **B11** `-0` → 0;
  `null` → descartado; o resto da amostra sobrevive ao descarte de um atributo.
- **C `tests/traccar-event-listener.test.ts` (12):** C1 rota chama `ingestEvent` com o comando; C2 `src/app.ts` 404 na rota; C3 400
  query; C4 401 (ausente, errado, repetido, `Authorization`); C5 415; C6 413; C7 400 `invalid_json`; **C8** limitador de **posições** com
  burst 1: 2ª posição 429, evento **204** (o bucket é outro); C9 422 reservada; C10 `ignored` → 204 **sem** chamar `ingestEvent`, e 503
  por tempo com a porta de commit fechada; **C11** limitador de **eventos** com burst 1: 2º evento 429, posição 204; um `ignored` consome
  a ficha de eventos; `createTraccarIngestAppFromEnv` passa `eventLimiter` ≠ `limiter` (instâncias distintas); **C12** a rota `/events`
  chama `deps.authenticator.verify` exatamente 1× por requisição (o **mesmo** objeto da rota de posição; contagem no spy injetado).
- **D `tests/traccar-event-logs.test.ts` (5):** D1 204, D2 202, D3 422, D4 503 — segredo-sentinela, coordenada-sentinela na `position`
  anexada e `type`-sentinela: nenhum no log; **D5** `ignored` → uma linha com `outcome: "ignored"` e `reason: "unknown_type"`, sem o
  `type`-sentinela; o `sample_discarded` (F10) com `code` e sem valor do atributo.
- **H `tests/traccar-event-topology.test.ts` (9):** H1 `EVENT_FORWARD_URL` → `api:3200` + caminho de eventos; H2 `EVENT_FORWARD_HEADER` só
  por interpolação obrigatória (compose recusa sem `TRC_FORWARD_HEADER`); H3 nenhum `ports` novo; 3200/5055/8082 nunca publicadas; H4
  `EVENT_STATUS_ENABLE`/`STATUS_TIMEOUT` só no overlay de dev (zero em `docker-compose.prod.yml`); H5 nenhum servidor público de
  demonstração; **H6** `traccar.xml`: nenhuma `<entry key>` cujo nome termine em `forward.header` (regex sobre o nome inteiro da chave) e
  nenhum literal `X-Traccar-Forward-Token`; overlay: o literal só dentro de `${TRC_FORWARD_HEADER:?`; **H7** `GRANT EXECUTE ON FUNCTION
  public.auth_login_candidates` em exatamente um arquivo (`scripts/traccar-dev-demo.mjs`), dentro do bloco `WITH_WEB`, e zero em
  `prisma/migrations/**`, `scripts/db-runtime-role.sh`, `docker-compose*.yml`, `src/**`, `infra/**`, `.github/**`; **H8** as 5 fixtures
  `event-*.json` sanitizadas (C-25); **H9** toda `tests/traccar-*-db.test.ts` que contenha `DELETE FROM traccar_ingress_receipts` (ou a
  tabela na lista de limpeza) contém `vehicle_telemetry_events` **antes** no mesmo bloco de limpeza.

**Com banco (3 arquivos, 40 casos; Postgres descartável, papel efêmero `NOSUPERUSER NOBYPASSRLS` — `createEphemeralRole` de
`tests/helpers/auth-identity-fixture.ts:324-355` —, limpeza escopada por organização e instância, **com `vehicle_telemetry_events`
primeiro na lista**; arnês = o de `traccar-position-ingestion-db.test.ts:1-250`):**
- **E `tests/traccar-event-ingestion-db.test.ts` (19):** E1 1ª entrega → 204, 1 recibo `event` (`location_id` nulo, `fix_time = eventTime`,
  `vehicle_id`/`binding_id` do vínculo), 1 linha; E2 reenvio idêntico → 204, 1/1; E3 digest ≠ → 409, `conflict_count = 1`, 0 linha nova;
  E4 2 entregas idênticas **com a barreira `twoPartyBarrier` (`afterBindingLocked`)** → 1 recibo, 1 linha, ambas 204; E5 dispositivo sem
  vínculo → 202, 0 recibo, 0 linha, **1 linha em `traccar_quarantine_items`** (`unmapped_device`, `delivery_count 1`, `first_fix_at =
  eventTime`); **E5′** 2ª entrega do mesmo → `delivery_count 2`; E6 `eventTime` < `valid_from` → `fix_before_active_binding`; no futuro →
  `fix_in_future`; E7 organização inativa → `tenant_inactive`; E8 viatura sem despacho → 204 e linha; E9 chave de outra organização → 409 +
  `idempotency_key_owned_elsewhere`; E10 `online(t2)` depois `unknown(t1<t2)` → `latestDeviceStatus = online`; E11 `device_offline`
  (sintética) aceito e derivado; E12 comando `source='reconciliation'` pela função pura → linha; forward do mesmo depois → `duplicate`; 1
  total (determinismo, não "delivery-independência"); E13 canário B `0/0/0`; nenhuma linha com coordenada/JSON; E14 `tenantId` no `event`
  → 422 e 0 escrita; tipo forjado → 204 e 0 escrita; E15 falha injetada antes do commit → 503, 0/0; **E16** `device_online` e
  `device_unknown` no **mesmo ms** → `latestDeviceStatus = device_unknown` (precedência), independentemente da ordem de chegada;
  **E17** `ignition_on(t2)` depois `ignition_off(t1<t2)` → `latestIgnition = on`; empate → `off`; **E18** serviço com `resolver.maxTenants: 1`
  e 2 organizações ativas → 202, 0 recibo, 0 linha, 1 linha `resolution_budget_exceeded` na quarentena; **E19** `event.attributes.tenantId =
  B` e `position.attributes.tenantId = B` com dispositivo vinculado a A → 204, linha em A, B `0/0/0`.
- **F `tests/traccar-event-sample-db.test.ts` (11):** F1 posição com atributos → 1 recibo, 1 localização, 1 `sample` (`receipt_id` = o da
  posição, `occurred_at = fixTime`, `vehicle_id`/`binding_id` iguais aos do recibo); F2 reenvio idêntico → 204 e 1 amostra; reenvio com
  atributo diferente → 204, amostra **inalterada**; **F3** posição em quarentena por operador → **0 recibo `position`, 0 localização**
  ([Q1=NÃO] + 0 amostra); F4 sem atributo allowlisted → 0 amostra; F5 falha injetada **após** a amostra (`beforeCommit` lança) → 0
  localização, 0 recibo, 0 amostra (a amostra está dentro da transação); F6 md5 da linha de `work_orders` igual antes/depois; F7 unidades
  gravadas (`odometer_m 12345`, `power_mv 12600`, `engine_hours_s 3600`); F8 canário B `0/0`; **F9** para cada coluna, o valor aceito na
  borda de B9 **insere** sob o papel efêmero, e o valor recusado na borda, inserido **direto** (sem parser) → `23514` (ou `22003` em
  `power_mv` acima de int4); **F10** comando com `telemetry.powerMv = -1` montado **à mão** → 204, 1 localização, 1 recibo, **0** amostra,
  log `sample_discarded` com `code: "23514"`; **F11** `position.attributes.tenantId = B` com dispositivo de A → amostra em A, B `0/0`.
- **G `tests/traccar-event-rls-db.test.ts` (10):** G1 `relrowsecurity` e `relforcerowsecurity` + política com o GUC; G2 sem GUC → 0; sob GUC de
  B → 0 de A; `updateMany` cross-tenant `count = 0`; G3 FK composta: `vehicle_id` de B sob GUC A → `23503`; G4 2ª linha para o mesmo
  `receipt_id` → `23505`; G5 CHECKs: `alarm` sem código, `sample` sem medida, `ignition_on` com medida, `battery_level_pct 101`,
  `power_mv 1000001` → `23514`; G6 catálogo: nenhuma coluna `json/jsonb/double precision`, nenhuma `lat/lon`; G7 `pg_rules = 0`;
  `prosecdef` = 0 funções novas; `RUNTIME_ROLE_GUARD_SQL` sob o papel efêmero → 0 escapes; G8 CHECK do recibo aceita `'event'`
  ([Q1=SIM] e `'position_sample'`), recusa `'foo'`, `convalidated = true`; **G9 drill**: base própria → `migrate deploy` → rollback na
  **ordem de §6.1** (1→5) → tabela ausente, índice do recibo ausente, CHECK restrito a `'position'`, `_prisma_migrations` sem as duas
  → `DROP DATABASE`; **G10** linha com o recibo de V1 e `vehicle_id` de V2 (mesma organização) → `23503` (FK de 4 colunas).

**[Q1=SIM] Com banco, 4º arquivo — I `tests/traccar-event-sample-quarantine-db.test.ts` (7):** ver §Q1.5.

### 9.3 Baseline N e meta M ≥ 2N (declarada sem maquiagem)

- **N (área tocada, EXECUTADO):** 15 suítes do 01 = **132** (ata do ciclo 3; estático 138, H-9) + `tests/telemetry.test.ts` = **17** →
  **N = 149** (o dev publica o número do passo 0).
- **Meta do papel: M ≥ 2N = 298. Previsto: 94 `test()` novos** (54 sem banco + 40 com banco) **[Q1=SIM: 101]** → **fica abaixo**, e
  declaro em vez de inflar: a régua que a junta aplica é **critério → teste → mutação** (25/25, +3 sob Q1, cada um com vermelho-controle).
  Os dois conjuntos **gerados do catálogo** continuam autorizados se a junta pedir o 2N literal: 1 subcaso por código de alarme (38) e
  1 por tipo ignorado (14) → +52 → 146/153. O relatório declara o déficit (`P-TRC02-DEFICIT-2N`), e a cadeira (b) classifica.
- **Régua da suíte (CI do objeto):** `backend-postgres` **391 + 40 = 431** esperado **[Q1=SIM: 438]** (`fail 0`, `skipped 0`); `backend`
  `fail 0`, `skipped 2` nomeados. **Nenhum nome de teste do 01 some**; só o título do caso de §9.4 muda.

### 9.4 O único caso do 01 que muda de enunciado (inalterado da v1 §6.4)

`tests/traccar-position-contract.test.ts:88-95` — título passa a `"contrato: \`attributes\` só alimenta a allowlist veicular (B-TRC-02);
chave e digest não mudam; chave reservada lá dentro não conta"`; as 3 asserções **ficam** e ganha **uma**: `cmd.telemetry` =
`{ignition: true, odometerM: 99}`. Os outros 12 casos **byte a byte** (md5 dos blocos). Vermelho-controle: com o `src/` de `c1485c94`,
a asserção nova falha.

### 9.5 Mutações — o catálogo (`docs/revisoes/TRACCAR/B-TRC-02-evidencias/mutations.mjs`, formato do 01)

Regras herdadas: âncora **única** (`grep -c` = 1, EOL-consciente), `tsc` ec 0 na forma mutada ("não compila" = "não mede"), TAP do caso
vermelho publicado, restauro por `git hash-object` = blob do HEAD; migração mutada numa base própria descartável.

**Mantidas da v1 (26):** M-E01, 02, 03, 04, 05, 06, 07, 09, 11, 12, 13, 14, 15, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29 — com
o texto de §9.1. **Mantida com alvo ampliado (1):** M-E10 (E4 agora com barreira). **Retiradas (2):** M-E08 (sem âncora que compilasse —
A-10/ACH-05) e M-E16 (media NOT NULL, não a regra — ACH-06). **Variante só se Q1 = NÃO (1):** M-E16′ (§9.1 C-13).

**Novas (16), com a forma da edição (âncora a existir no código do dev — o dev escreve o código de modo que exista):**

| ID | Propriedade | `file` → `find` ⇒ `replace` | `tests` |
|---|---|---|---|
| M-E30 | parser ⊆ CHECK (`power`) | `vehicle-telemetry.bounds.ts`: `power: { minV: 0, maxV: 1000 }` ⇒ `power: { minV: -Infinity, maxV: 1000 }` | B |
| M-E31 | CHECK ⊇ parser (`power_mv`) | migração A: `("power_mv" BETWEEN 0 AND 1000000)` ⇒ `("power_mv" <= 1000000)` (`migration: true`) | F (F9) |
| M-E32 | amostra nunca derruba a posição | `vehicle-telemetry-prisma.repository.ts` (ou o serviço, onde o savepoint viver): `await tx.$executeRaw\`ROLLBACK TO SAVEPOINT vehicle_sample\`;` ⇒ `throw error;` | F (F10) [+ I7 sob Q1] |
| M-E33 | segredo do evento fora do `traccar.xml` | `infra/traccar/dev/traccar.xml`: `<entry key='forward.type'>json</entry>` ⇒ idem + `\n    <entry key='event.forward.header'>X-Traccar-Forward-Token: mutacao</entry>` | H (H6) — e `T.topo` do 01 fica **verde** (registrado como prova da lacuna) |
| M-E34 | `GRANT` só no demo | `scripts/db-runtime-role.sh`: `EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', v_role);` ⇒ idem + `\n  EXECUTE format('GRANT EXECUTE ON FUNCTION public.auth_login_candidates(text) TO %I', v_role);` | H (H7) |
| M-E35 | nenhum `GRANT` em migração | migração A: última linha ⇒ idem + `\nGRANT EXECUTE ON FUNCTION public.auth_login_candidates(text) TO erp_runtime;` (`migration: true`) | `tests/auth-invariant-guards.test.ts` (guard 8) + H (H7) |
| M-E36 | limitador por rota | `traccar-ingest.app.ts`: `deps.eventLimiter ?? deps.limiter` ⇒ `deps.limiter` | C (C8, C11) |
| M-E37 | tenant do payload nunca é dica | `traccar-event.adapter.ts`: `hintTenantId: undefined,` ⇒ `hintTenantId: readTenantHint(parsed.eventAttributes),` **e** `traccar-ingestion.service.ts`: `const resolved = await this.resolver.resolve(key, confirm);` (no `ingestEvent`) ⇒ `const resolved = command.hintTenantId ? await confirmOnly(command.hintTenantId) : await this.resolver.resolve(key, confirm);` — as duas âncoras **existem** porque o dev escreve `hintTenantId: undefined` no adaptador (campo reservado ao B-TRC-03) e `confirmOnly` como função privada já usada pelo caminho da dica | E (E19), F (F11) |
| M-E38 | quarentena de evento grava | `traccar-ingestion.service.ts`, `quarantineWithoutTenant`: `claimTraccarCommitOrThrow(deadline);` ⇒ `claimTraccarCommitOrThrow(deadline);\n    if (isEventCommand(command)) return;` | E (E5, E5′, E18) |
| M-E39 | coordenada na chave | `traccar-event.adapter.ts`: `lat7, lon7].join("¦")` ⇒ `"", ""].join("¦")` (o pipe real no código) | A (A15) |
| M-E40 | FK de 4 colunas | migração A: `FOREIGN KEY ("tenant_id", "receipt_id", "vehicle_id", "binding_id")\n  REFERENCES "traccar_ingress_receipts"("tenant_id", "id", "vehicle_id", "binding_id")` ⇒ `FOREIGN KEY ("tenant_id", "receipt_id")\n  REFERENCES "traccar_ingress_receipts"("tenant_id", "id")` (`migration: true`) | G (G10) |
| M-E41 | precedência no empate | `vehicle-telemetry-prisma.repository.ts`: `WHEN 'device_offline' THEN 0 WHEN 'device_unknown' THEN 1 ELSE 2` ⇒ `WHEN 'device_online' THEN 0 WHEN 'device_unknown' THEN 1 ELSE 2` | E (E16) |
| M-E42 | última ignição por `occurred_at` | idem, `latestIgnition`: `ORDER BY occurred_at DESC` ⇒ `ORDER BY received_at DESC` | E (E17) |
| M-E43 | arnês FK-safe (**mutação de arnês**) | `tests/traccar-idempotency-db.test.ts`: `["vehicle_telemetry_events", "traccar_ingress_receipts",` ⇒ `["traccar_ingress_receipts",` | `tests/traccar-idempotency-db.test.ts` (o `after` falha) + H (H9) |
| M-E44 | `ignored` contado | `traccar-ingest.app.ts`: `outcome: "ignored", reason: outcome.reason` ⇒ `outcome: "stored"` | D (D5) |
| M-E45 | bateria arredonda e depois limita | `vehicle-telemetry.bounds.ts`: `Math.round(value)` (na bateria) ⇒ `Math.trunc(value)` | B (B10) |

**Re-executadas do 01 (17):** MUT-10, 11, 12, 13, 14, 16, 20, 25, 32, 33, 42, M-C1′ (as 12 da v1, por tocarem arquivos alterados) **+
MUT-17, 18, 19, 38** (`tests` ganha a suíte C — A-09) **+ MUT-09** (`tests` ganha E18 — ACH-03). MUT-20 ganha A7/E14. `find` que não casa é
"não mede" (lição MUT-10/23/13 do 01).

### 9.6 Ordem de execução — testes primeiro (o dev registra comando → saída → veredito por passo em `B-TRC-02-dev.md`)

0. **Gate e baseline** (§8): 8 linhas; N executado; worktree `C:/Users/AMP/w-trc02`; `npm ci` próprio; `npm run db:generate` com URL fictícia.
   **Decidir Q1 e Q2 pelo `decisoes.md` do dia** (gate 7 e 8) e anotar no relatório qual variante do plano vale.
1. **Comando do bloco** (`agent-orchestration/codex/comandos/B-TRC-02-traccar-eventos-e-telemetria.md`) e as cópias (v2, v1, críticas) em
   `docs/revisoes/TRACCAR/`.
2. **Topologia** (H vermelha → overlay (+ `traccar.xml` só se H-12 cair) → verde): `EVENT_FORWARD_*`, `EVENT_STATUS_ENABLE`, `STATUS_TIMEOUT`,
   `TRC_SIM_EXTRA`, `TRC_CAPTURE_PATH`; **H6/H7/H8/H9** desde já (H9 fica vermelho até o passo 5b).
3. **Captura das fixtures reais** (`timeout -k 30 900 node scripts/traccar-capture-fixture.mjs --kind event`): fecha H-1, H-3..H-7, H-12; 4
   fixtures + 1 sintética; `B-TRC-02-evento-captura.md` (headers, `event.id`, datas, coordenadas nos eventos derivados, "2ª entrega: não").
   **Parada** se faltar o header (improvável: S-E15) — pendência + decisão.
4. **Contrato** (A, B vermelhas → `vehicle-telemetry.bounds.ts`, `traccar-telemetry-catalog.ts`, `traccar-event.schema.ts`,
   `traccar-event.adapter.ts`, allowlist em `traccar-position.schema.ts`/`.adapter.ts` → verde; o caso de §9.4 ajustado).
5. **Migração** (G vermelha → migração A + B + `schema.prisma` → verde; drill G9; **parecer do `agente-dba-guardiao`** em
   `votos/B-TRC-02/dba-parecer.md` antes da junta). **5b. As 5 linhas de §7.2** nos arnês do 01 → as 5 suítes verdes com a tabela nova; H9 verde.
6. **Ingestão de evento** (E vermelha → `vehicle-telemetry.*`, `ingestEvent`, repositório por kind, quarentena de evento → verde; E4 com a
   barreira; E18 com `maxTenants: 1`).
7. **Amostra** (F vermelha → passo 7 da posição com savepoint → verde; **F10 é o 1º caso a passar**: fecha H-10; se cair, o fallback de §3.3
   entra e fica registrado). **7b [Q1=SIM]:** suíte I vermelha → `sampleWithoutOperator` + `fix_key` → verde.
8. **Listener e logs** (C, D vermelhas → rota + `ignored` + `mountIngestRoute` + `eventLimiter` → verde).
9. **Demo** (`scripts/traccar-dev-demo.mjs`): passos 13-19 (§5.1) e, sob Q2 = SIM, o passo do `GRANT` em `--with-web` (§5.5);
   contagens por SQL; md5 da OS; `down -v` sempre.
10. **Vermelho-controle** por critério: `src/` de `c1485c94` copiado por cima → as suítes A-I vermelhas nas asserções nomeadas; restaurar → verde.
11. **Mutações** (§9.5): 43 novas/mantidas (+6 sob Q1) + 17 do 01 re-executadas; M-E33 com a nota "a guarda do 01 fica verde".
12. **Lista curada da CI**: forma do job `backend-postgres` com as 3 (ou 4) `-db` novas, **3×** no container (`skipped 0`, denominador
    constante; esperado 431 ou 438); o comentário da l.282 passa a dizer o número medido.
13. **Limpeza e PR** (§9.7 passos 9-11).

### 9.7 Bateria de validação exata (§9 do CLAUDE.md, padrão backend/raiz; o que é `-db` roda em container Linux próprio —
`bash C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh C:/Users/AMP/w-trc02 "<comando>"`; **nunca** a base viva nem as portas
5432/6379/3000/5173/5050/8899)

1. `timeout -k 15 600 npm run check` · `timeout -k 15 600 npm run lint`.
2. Sem banco: `node --test --import tsx --test-reporter=tap tests/traccar-event-contract.test.ts tests/traccar-event-sample.test.ts tests/traccar-event-listener.test.ts tests/traccar-event-logs.test.ts tests/traccar-event-topology.test.ts` → **54**, `fail 0`, `skipped 0`.
3. Linux: `node --test --import tsx --test-reporter=tap $(ls tests/traccar-*.test.ts)` → **≥ 132 + 94 = 226** (**233** sob Q1), `fail 0`,
   `skipped 0` (os casos que exigem Docker reexecutam isolados onde há Docker, como no 01).
4. Regressão: `node --test --import tsx tests/telemetry.test.ts tests/vehicles.test.ts tests/vehicles-routes.test.ts tests/field-dispatch*.test.ts tests/work-order*.test.ts tests/rls-tenant-isolation.test.ts tests/auth-invariant-guards.test.ts` → `fail 0`;
   `git diff --stat c1485c94..HEAD -- <os 9 arquivos de §7.2>` **vazio**; `git diff c1485c94..HEAD -- <os 5 arnês>` = **5 linhas `+`, 0 `−`**.
5. Vermelho-controle (passo 10) e mutações (passo 11), com TAP publicado.
6. Forma do job `backend-postgres` **3×**: `skipped 0`, denominador constante; `npm test` (forma `backend`): `fail 0`, `skipped 2` nomeados.
7. `timeout -k 15 600 npm run build` · `node scripts/sync-agent-agents.mjs --check` · `git diff --check` · `node --check Kpis/app.js` (sem editar `Kpis/`).
8. Demo (passo 9) com `down -v --remove-orphans`; `docker ps -a` sem `erp-trc01-*`; a base viva intocada.
9. Limpeza (§C5) em 1 linha: containers do dev = 0, worktree removido por `git worktree remove --force`, scratch da subpasta.
10. `git pull --rebase origin main` → `git push -u origin feat/traccar-b-trc-02` → `gh pr create --base main --title "feat(traccar): eventos e
    telemetria veicular do Traccar — ignição, alarmes e online/offline por viatura, sem tela e sem rota pública (B-TRC-02)"`; corpo:
    objetivo, gate (com a variante Q1/Q2 que valeu), contagens **de execução**, vermelho-controle, mutações, parecer do DBA, "nada em
    `mileage_*`", ponteiro para esta v2 e para a v1. **Sem `Kpis/*`.**
11. Inspetor de terreno → junta (§10) → CI verde → squash → limpeza pós-merge → porteiro.

---
## 10. Junta de segurança — composição, régua, inelegibilidade e mandatos (≤ 3 itens; P1–P7 verbatim no disparo)

**Régua (inalterada):** bloco de ingestão do Traccar (§C7 item 8(4)): `inspetor-de-terreno-da-junta` antes (forma A com pré-voo; objeto =
SHA com check-runs **concluídos**; cluster descartável por jurado; fatia S0 `sync-agent-agents.mjs --check`); **3 cadeiras com identidade
NOVA**, nível menor **declarado** (Codex Sol / Gemini como 2º revisor nunca único / Claude Opus só cobrindo limite); **unanimidade de 3
com veto**; **mais o `agente-dba-guardiao`** (parecer obrigatório, não é 4ª cadeira). Ciclo 1 e 2 como hoje; a partir do 3, só defeito
grave reprova. Quem votou/achou não planeja nem desenvolve o ciclo seguinte; em reprovação, **topo (Fable) audita e replaneja**.

**Inelegíveis por nome:** os do B-TRC-01 (`jurado-trc01-*`, `jurado-trc01c2-*`, `jurado-trc01c3-*`, `dev-trc01-*`, `planejador-trc01-ciclo{2,3}`,
`inspetor-trc01c3-opus`) **+ `planejador-trc02-fable`, `planejador-trc02-v2-fable`, `critico-trc02-opus`, `critico-trc02-flash`** (acharam
→ não planejam, não desenvolvem, não votam). A fábrica cria `jurado-trc02-{a,b,c}-*.md` (corpos no padrão `jurado-trc01c3-*`), espelhados.

**Cadeira (a) — banco, RLS, migração e arnês** (PostgreSQL 16, `FORCE RLS`/GUC, FK compostas, `EXPLAIN (VERBOSE)` sob papel sem bypass,
arnês `-db`, lista curada):
1. **Isolamento por construção (C-09, C-17, C-24):** sob o papel efêmero, G 10/10 e E13/E19/F8/F11 (canário B `0/0/0`); `EXPLAIN (VERBOSE)`
   de `latestDeviceStatus` e do `INSERT` do evento mostram o filtro de RLS; FK de 4 colunas recusa recibo de V1 com viatura V2 (G10);
   `pg_rules` 0, `prosecdef` 0, `RUNTIME_ROLE_GUARD_SQL` limpo; **parecer do DBA** conferido (A/B aditivas; rollback na ordem de §6.1
   executado no drill G9 com `_prisma_migrations` limpo; **nenhum `GRANT`** em migração nem em `db-runtime-role.sh`).
2. **Idempotência sob corrida e a amostra que não derruba (C-11, C-19):** E4 20× em paralelo **com barreira** → 1 recibo, 1 linha; M-E10 e
   M-E14 vermelhas; F10 (savepoint) e F9 (bordas no banco) verdes com M-E31/M-E32 vermelhas; `message_kind` validado (M-E26 vermelha);
   **[Q1=SIM]** I6 (um fix → uma amostra) com M-Q1-03 vermelha.
3. **CI, regressão e arnês do 01 (C-20):** forma do job `backend-postgres` 3× (`fail 0`, `skipped 0`, denominador 431/438 ou o medido);
   `npm test` forma `backend`; `telemetry.test.ts` 17/17; os **9** arquivos de teste do 01 de §7.2 byte a byte iguais a `c1485c94`
   (md5); os **5 arnês** com diff de **exatamente 1 linha `+`** cada; M-E43 vermelha (o `after` do 01 falha sem a linha).

**Cadeira (b) — superfície, segredo, escopo, auth e registro** (pathspec, listener/auth/log, catálogo fechado, contrato, registro):
1. **Superfície e segredo (C-04..C-08, C-18, C-21, C-22, C-23):** rota só no app de ingestão (C2; M-E11); mesma cadeia (C3-C9); a rota
   chama `deps.authenticator` (C12; M-E12); log sem segredo/coordenada/`type` e com `ignored` contado (D1-D5; M-E05/M-E13/M-E44);
   `EVENT_FORWARD_HEADER` só por interpolação (H2; M-E28); **`traccar.xml` sem `*forward.header`** (H6; M-E33 — e a nota de que a guarda
   do 01 fica verde); **`GRANT` só no demo** (H7; M-E34/M-E35; guard 8); limitador por rota (C8/C11; M-E36); nenhum `ports` novo.
2. **Escopo e contrato:** `git diff --name-only c1485c94..<head>` ⊆ **§7 do plano do Traccar ∪ tabela §7.3**; PROIBIDO (§7.4) sem diff
   (`src/app.ts`, `work-orders/**`, `field-dispatch/**`, `field-location/**`, `rls.ts`, RBAC, `Kpis/`, `db-runtime-role.sh`); nos 6
   arquivos alterados do 01 o diff fica dentro de §6.6; `API_CONTRACTS.md` e `docs/deployment.md` dizem o que o código faz (inclusive a
   quarentena sem tipo, §5.4, e a nota Q1 se SIM); `sync-agent-agents.mjs --check` verde; nenhuma permissão/rota pública/tela/SSE.
3. **Registro e régua:** relatório do dev com contagens de **execução**, a variante Q1/Q2 que valeu (gate 7/8), vermelho-controle
   25/25 (+3), mutações com TAP (43+17; +6 sob Q1), o déficit de M **declarado**; `B-TRC-02-evento-captura.md` com os fatos da fixture
   (inclusive coordenadas nos eventos derivados); pendências de §12 gravadas ou apontadas; comentário da lista curada com o número medido.
   **Só nota** (8(2)) salvo registro que declare fechado o que não fecha.

**Cadeira (c) — contrato de evento, allowlist, unidades e ordem no tempo** (fonte da tag 6.16.0 com `arquivo:linha`, chave, unidades,
estado derivado, mutação própria):
1. **Chave e catálogo (C-01..C-03, C-05):** as 4 fixtures batem com S-E1..S-E15 (re-conferir no fonte da tag **por execução**: `curl` +
   `grep -n`); `event.id > 0` e fora da chave/digest (A3; M-E02/M-E03); **coordenada na chave** (A15/A16/A17; M-E39) e o caso de
   relógio travado (A-07) reproduzido; tipo/código fora do catálogo → `ignored` sem escrita, sem log e **contado** (A5, E14, D4, D5;
   M-E04/M-E44); dado pessoal/coordenada da posição anexada não chega ao banco (A9, E13, G6).
2. **Viatura, operador e ordem (C-10, C-12, C-13; [Q1=SIM] C-Q1-1..3):** E8 (M-E09); E10/E11/E16/E17 (M-E15/M-E41/M-E42); F1-F5
   (M-E17/M-E18; [Q1=NÃO] M-E16′); **[Q1=SIM]** I1-I7 com M-Q1-01..06 — em especial I5 (os 7 motivos **sem** amostra) e I7 (falha da
   amostra não derruba o registro da quarentena); **uma forma própria** que ninguém listou (ex.: alarme duplo `sos,powerCut` numa posição
   → 2 eventos → 2 linhas; `deviceUnknown` e `deviceOnline` no mesmo ms **com** a ordem de chegada invertida).
3. **Unidades, bordas e km de OS (C-14..C-16, C-19):** B1/B4/B6/B8/**B9/B10/B11**/F7/**F9** (M-E19/M-E20/M-E30/M-E45); B5 + o caso §9.4
   (M-E21); F6 (M-E22). Vermelho-controle no `src/` de `c1485c94`.

**Inspetor:** além do protocolo e do `LIBERADO` sobre SHA com check-runs concluídos: (i) parecer do DBA existe e é anterior ao voto da (a);
(ii) `20260878000000` único na árvore; (iii) H8 verde (fixtures sanitizadas) — o inspetor confere o teste, não refaz a leitura; (iv) o
porteiro do #426 no briefing; (v) ≤ 2 trabalhos com Docker; worktrees alheios intocados; (vi) **a variante Q1/Q2 declarada no relatório
do dev bate com o `decisoes.md` do head** (gate 7/8) — se o dono mudou a Q1 depois do código, a junta não começa: volta ao dev com a
lista de §Q1.7.

**Papéis para a ata (§C7.4-bis):** quem planejou = `planejador-trc02-fable` (v1, Fable) e `planejador-trc02-v2-fable` (v2, Fable); quem
criticou = `critico-trc02-opus` (Opus, declarado) e `critico-trc02-flash` (Gemini Flash, declarado, 2ª opinião); quem desenvolve =
identidade nova a nomear; quem acha = as três cadeiras + inspetor + DBA; nenhum ocupa outro papel.

---
## 11. Riscos e rollback

| Risco | Prob./impacto | Mitigação |
|---|---|---|
| **H-10 cai** (savepoint não recupera a transação no Prisma interativo) | baixa/médio | precedente no repositório (F-R10); fallback de §3.3 (validação no serviço com o predicado do CHECK) mantém a propriedade; F10 é o 1º caso do passo 7 |
| **H-12 cai** (status não sai por ambiente) | baixa/baixo | as duas chaves vão ao `traccar.xml` de dev; H6 não as proíbe |
| Evento perdido (sem retry, S-E3) | certa/médio | declarado; o bucket **próprio** de eventos (C-22) tira a perda do pós-incidente de posições; o "puxar" é o B-TRC-03 (H-11) |
| `EVENT_STATUS_ENABLE` em produção sem medir carga | média/médio | só no overlay de dev; `docs/deployment.md` lista como decisão do B-TRC-06 (`P-TRC02-STATUS-TIMEOUT-PROD`) |
| Concorrência somada dos dois limitadores (10+10) acima do pool (5) | média/baixo | o pool é o teto real (teste de pool do 01); B-TRC-06 ajusta (`P-TRC02-LIMITES-POR-ROTA-PROD`) |
| Colisão de carimbo com o B-SAN3-02 (F-R8) | média/baixo | gate 3; renumerar; anotar |
| Prisma não aceitar a relação de 4 colunas | baixa/baixo | a FK vive na migração; `prisma migrate diff` conferido pela (a); registrado |
| O dono muda a Q1 para NÃO **depois** do código | média/médio | §Q1.7 é a lista de remoção; o inspetor confere a variante contra o `decisoes.md` do head (item vi) |
| Lista no DDL "com um lado de fora" (kinds, 3 kinds de recibo) | baixa/baixo | desconhecido é `ignored` antes do banco; versão nova = PD nova |
| O dev "melhorar" (SSE/outbox de evento, notificar, `mileage_end`, rota de leitura, ler a `position` anexada para além da chave) | média/alto | PROIBIDO explícito; M-E22; (b) mede por pathspec; "nada publicado" é propriedade |
| Chave com coordenada diverge do que a REST reconstrói (H-11) | média/médio **para o B-TRC-03** | declarado; `computeTraccarEventKey` exportada; a decisão de `v2` é de lá |
| Cota dos modelos e ≤ 2 trabalhos com Docker | alta/médio | um dev por vez; ≤ 2 jurados em paralelo (P5); P1/P2 desde o esqueleto |

**Rollback do bloco (detalhado):** (1) tirar `EVENT_FORWARD_URL`/`EVENT_FORWARD_HEADER` do Traccar — a rota fica inerte; (2) `git revert`
do squash restaura o código do 01 — a tabela, o índice novo e o CHECK alargado ficam **inertes** (nada do 01 depende deles; o 01 grava
`'position'`, que o CHECK aceita; o índice novo no recibo é redundante com a PK); (3) rollback SQL do fim da migração A **só em ambiente
sem dado real**, na ordem 1→5, parando se houver recibo ≠ `'position'`; **nunca** apagar `vehicle_telemetry_events` para "voltar" em
ambiente com dado; nenhuma OS/km foi tocada (F6). Nada em produção (não existe).

---

## 12. Fora do bloco, pendências com dono e registros (o orquestrador grava em `controle/`)

**Fora deste bloco (inalterado da v1 §9.1):** leitura/telas (B-TRC-04); notificação e operação da quarentena, expurgo de 90 dias
(B-TRC-05); reconciliação pela REST, `commandResult`/`queuedCommandSent`, GT06, comandos (B-TRC-03a/b); geofence/manutenção/motorista/
mídia/combustível; staging/produção (B-TRC-06/07); WebSocket; porta pública; servidor demo; `WorkOrder.mileage_*`.

| ID | O que é | Dono | Teste de encerramento |
|---|---|---|---|
| `P-TRC-DEMO-LOGIN-SEM-ORG-INERTE` | **FECHA** neste bloco (Q2 = SIM; §5.5) | B-TRC-02 | `GET /api/v1/health/ready` no demo `--with-web` → `login_without_org` ≠ `inert_no_execute`; H7 verde |
| `P-TRC-CI-COMENTARIO-DENOMINADOR` | **FECHA** neste bloco | B-TRC-02 | comentário da l.282 = `# tests` medido 3× |
| `P-TRC02-LIMITADOR-POR-ROTA` | **FECHA** neste bloco (C-22) | B-TRC-02 | C8/C11 verdes; M-E36 vermelha |
| `P-TRC02-LIMITES-POR-ROTA-PROD` | valores de produção dos dois buckets e da concorrência (hoje = os de dev, 20/s, 100, 10 cada) | B-TRC-06 | limites medidos sob carga ou declarados |
| `P-TRC02-QUARENTENA-SEM-TIPO-DE-MENSAGEM` | episódio de quarentena mistura posição e evento (§5.4); replay por `last_event_key` tem de tentar os dois kinds | B-TRC-03 | o reconciliador trata os dois kinds, ou a tabela ganha discriminador (migração própria) |
| `P-TRC02-RECIBO-VINCULO-VIATURA-FK` | no 01, `traccar_ingress_receipts(vehicle_id)` não tem FK para `vehicles` nem amarra ao vínculo (`pre-existente`, A-12) | B-TRC-03 (toca vínculos) | FK composta no recibo ou declaração de que o código basta, com teste |
| `P-TRC02-LGPD-TELEMETRIA-SEM-DESPACHO` | o bloco **guarda** evento (C-10) e, se Q1 = SIM, amostra de viatura **sem despacho**; exibir isso é inferência de uso fora do expediente (decisão 4; `P-TRC-LGPD`) | dono do produto, **antes do B-TRC-04** | `decisoes.md` diz o que o B-TRC-04 exibe fora de despacho e sob que base; o B-TRC-04 implementa com teste |
| `P-TRC02-COMMANDRESULT-IGNORADO` | `commandResult`/`queuedCommandSent` ignorados até o fluxo de comandos | B-TRC-03b | os dois tipos viram linha com `source` próprio |
| `P-TRC02-STATUS-TIMEOUT-PROD` | `status.timeout`/`event.status.enable` de produção não medidos | B-TRC-06 | valores fixados após medição |
| `P-TRC02-DEFICIT-2N` | M previsto (94/101) < 2N (298); 52 subcasos gerados autorizados | dev publica; (b) classifica | número publicado; nota ou pendência fechada |
| **[Q1=NÃO]** `P-TRC02-AMOSTRA-SO-COM-POSICAO-ACEITA` | volta a existir só se o dono disser NÃO (§Q1.7) | B-TRC-03 | — |

**Decisões a registrar (texto em §Q1.6 e aqui):**
- `D-TRC02-ESCOPO` — o alargamento declarado de §7.3 (A-05), com a razão de cada caminho.
- `D-TRC02-CHAVE-DE-EVENTO` — a chave de §6.5 (com coordenada), por quê, e a consequência para o B-TRC-03 (H-11).
- `D-TRC02-Q1-AMOSTRA-SEM-OPERADOR` (ou `D-TRC02-Q1-NAO`) — §Q1.6.
- `D-TRC02-Q2-GRANT-SO-NO-DEMO` — §5.5, com o contexto do `SECURITY DEFINER` que o dono recebeu depois da resposta.

---
## §Q1 — Q1 = SIM: amostra sem operador (SEÇÃO ISOLADA E REMOVÍVEL)

> **Vale só se a resposta do dono continuar SIM** (`D-TRC02-RESPOSTAS`, `decisoes.md:3784`, sem reversão posterior — gate 7). Tudo
> o que esta seção acrescenta está marcado `[Q1=SIM]` no resto do plano; **§Q1.7 é a lista exata do que sai se o dono disser NÃO**.
> O dono respondeu SIM a uma pergunta **sem** o contexto da decisão 4 ("viatura sem técnico não aparece em lugar nenhum… privacidade
> vem antes de cobertura") e da `P-TRC-LGPD` (A-14); o orquestrador devolveu a pergunta com esse contexto. Esta seção está escrita
> para as duas respostas.

### Q1.1 O que o dono decidiu, em termos do fluxo

Quando a posição chega a **ser da viatura** (passos 1-4 do 01: organização ativa, vínculo `FOR SHARE`, janela do fix, sem recibo
`position`) e **só então** falha no operador (passo 5: `no_operator_at_fix_time`, `ambiguous_operator_at_fix_time`,
`operator_history_ambiguous`), o ERP **conserva os atributos veiculares para a viatura**, sem pessoa, e a posição **continua** em
quarentena (nada no mapa, nenhuma localização, 202). **Guardar ≠ exibir:** nenhuma rota lê isto; o B-TRC-04 decide o que mostra sob
`P-TRC02-LGPD-TELEMETRIA-SEM-DESPACHO`.

**Os 3 motivos que guardam amostra** (constante fechada `SAMPLE_ON_QUARANTINE_REASONS` em `traccar-ingestion.service.ts`):
`no_operator_at_fix_time`, `ambiguous_operator_at_fix_time`, `operator_history_ambiguous`. **Os 7 que NÃO guardam:** `unmapped_device`,
`tenant_inactive`, `resolution_budget_exceeded`, `idempotency_key_owned_elsewhere` (organização não confiável), `fix_before_active_binding`,
`fix_in_future` (o vínculo não valia no instante), `invalid_fix` (o dono não decidiu; fica fechado — se quiser, é uma entrada na constante,
sem mudança de desenho). **Vínculo ausente** (`not_bound`) e **duplicado** (`throw traccar_binding_not_unique`, impossível pelo índice
único do 01 — MUT-04 prova) continuam **sem** amostra: a amostra nasce **depois** do passo 2.

### Q1.2 Desenho — "um fix → uma amostra" é propriedade do BANCO

- **Recibo próprio:** `message_kind = 'position_sample'`, com a **mesma** `external_event_key` e `payload_digest` da posição, `location_id
  NULL`, `vehicle_id`/`binding_id` do vínculo, `fix_time = fixTime`. Entra no índice global do 01 (`instance_key, message_kind,
  external_event_key`) — **nenhum índice novo** (F-R14 derruba a premissa da v1). Por que **não** `'position'`: o passo 4 do 01 responderia
  `duplicate` à reentrega dessa posição, e ela **nunca** viraria localização — a semântica do 01 mudaria (A-04 item 1).
- **Identidade da amostra = o fix:** coluna `fix_key` (= `external_event_key` da posição; `^[0-9a-f]{64}$`; obrigatória em `kind='sample'`,
  proibida nos outros) + **índice único parcial** `vehicle_telemetry_events_sample_fix_key ON (fix_key) WHERE kind = 'sample'`. Os dois
  caminhos (posição aceita → recibo `position`; quarentena por operador → recibo `position_sample`) inserem a amostra com
  `ON CONFLICT (fix_key) WHERE kind = 'sample' DO NOTHING`: o segundo a chegar **não** cria 2ª amostra, seja por reentrega, por reconciliação
  (B-TRC-03) ou por corrida entre os dois caminhos. Global (sem `tenant_id`), como o índice do recibo — a mesma classe de desfecho
  cross-tenant do 01 (`owned_elsewhere`).
- **Atomicidade:** recibo `position_sample` + amostra vivem **dentro de um `SAVEPOINT sample_without_operator`**, na mesma transação do
  passo 5, **antes** do `recordQuarantine`. Falha de qualquer um (CHECK, FK, corrida) → `ROLLBACK TO SAVEPOINT` → log `sample_discarded` →
  a quarentena é registrada normalmente → 202. Um recibo `position_sample` **sem** amostra é impossível (os dois caem juntos) — importa,
  porque um recibo órfão faria o `ON CONFLICT` do recibo devolver 0 linhas e o código "achar" que a amostra existe.

### Q1.3 Serviço — o passo 5 da posição (o único ponto de inserção; removível em bloco)

```
5. operator = operatorAt(fixedAt, binding.vehicleId)
   se operator.kind ≠ "single":
      [Q1=SIM] se command.telemetry existe E NO_OPERATOR_REASON[operator.kind] ∈ SAMPLE_ON_QUARANTINE_REASONS:
         SAVEPOINT sample_without_operator
           receiptId = insertReceipt({messageKind:'position_sample', …, locationId:null})   -- ON CONFLICT DO NOTHING
           se receiptId ausente:  existing = findReceipt(command, 'position_sample')
               existing ∧ digest igual   → nada (amostra já existe)
               existing ∧ digest ≠       → markConflict(existing)  (conflict_count+1; amostra inalterada)
               ausente (outra organização; RLS esconde) → recordQuarantine(command,'idempotency_key_owned_elsewhere') e devolve conflict owned_elsewhere (409, como o passo 6 do 01)
           senão: insertSample(tx, {receiptId, fixKey: command.externalEventKey, …telemetry})  -- ON CONFLICT (fix_key) … DO NOTHING
         RELEASE SAVEPOINT   (erro → ROLLBACK TO SAVEPOINT + log sample_discarded)
      return quarantined(NO_OPERATOR_REASON[operator.kind])      -- 202, inalterado
```
Tudo vive em **um** método privado `sampleWithoutOperator(ports, tenantId, binding, command)` e **uma** chamada condicional no passo 5.
O caminho aceito (passo 7) usa o **mesmo** `insertSample` (com `fixKey`); se a amostra já existe pelo caminho da quarentena, 0 linhas e a
posição segue para `stored`.

### Q1.4 Contrato (nota em `API_CONTRACTS.md` §2.1-bis, só se SIM)

"Posição em quarentena por operador (`no_operator_at_fix_time`, `ambiguous_operator_at_fix_time`, `operator_history_ambiguous`): os
atributos veiculares allowlisted são conservados para a **viatura** (recibo `position_sample`); a resposta continua **202**; reenvio
idêntico → 202, nada novo; reenvio com conteúdo diferente → 202 e `conflict_count` do recibo da amostra incrementado, amostra inalterada;
chave de outra organização → **409** `traccar_idempotency_conflict` (como no passo 6). A amostra não vai ao mapa e não tem leitura neste
bloco." Os demais motivos de quarentena **não** conservam nada.

### Q1.5 Critérios, testes e mutações (só se SIM)

| # | Critério | Teste(s) | Mutação → vermelho |
|---|---|---|---|
| C-Q1-1 | Amostra **só** nos 3 motivos de operador, **depois** dos passos 1-4; nos 7 outros motivos e sem vínculo, **nada** (0 amostra, 0 `position_sample`) | I1, I4, I5 | **M-Q1-01**: `SAMPLE_ON_QUARANTINE_REASONS` ganha `fix_before_active_binding` → I5; **M-Q1-02**: a chamada de `sampleWithoutOperator` sobe para antes do passo 3 (janela do fix) → I5 (`fix_in_future` grava amostra) |
| C-Q1-2 | **Um fix → uma amostra**, por qualquer caminho e sob corrida; reentrega idêntica não cria nada; conteúdo diferente conta conflito e não altera; a resposta da posição segue 202; chave alheia → 409 | I2, I3, I6, I6′ | **M-Q1-03** (migração): índice parcial `sample_fix_key` removido → I6 (2 amostras); **M-Q1-05**: recibo da amostra com `'position'` → I1 (1 recibo `position` onde se espera 0) e I2 (reentrega vira `duplicate` 204); **M-Q1-06**: digest ignorado no reenvio (sem `markConflict`) → I3 |
| C-Q1-3 | Falha da amostra **não** derruba o registro da quarentena nem muda o 202; recibo `position_sample` órfão é impossível | I7 | **M-Q1-04**: `ROLLBACK TO SAVEPOINT sample_without_operator` vira `throw error` → I7 (503, 0 linha de quarentena) |

**Suíte I — `tests/traccar-event-sample-quarantine-db.test.ts` (7; mesmo arnês de F):**
- **I1** viatura vinculada, **sem despacho**, posição com `ignition:true, odometer:12345` → 202; 1 linha `no_operator_at_fix_time` na
  quarentena; **1** recibo `position_sample` (`location_id` nulo, `fix_time = fixTime`, `vehicle_id`/`binding_id` do vínculo); **1** amostra
  (`fix_key` = chave da posição, `receipt_id` = esse recibo, `odometer_m 12345`, `ignition true`); **0** recibo `position`; **0** localização;
  canário B `0/0/0`.
- **I2** reentrega idêntica → 202; `delivery_count 2`; 1/1 (recibo/amostra), `conflict_count 0`.
- **I3** reentrega com outra coordenada (mesma chave? **não** — coordenada muda a chave da posição; usar `speed` diferente, que muda só o
  digest) → 202; `conflict_count 1` no recibo `position_sample`; amostra **inalterada** (md5 da linha).
- **I4** os 3 motivos: (a) sem despacho; (b) **dois** despachos aceitos para a mesma viatura no instante → `ambiguous_operator_at_fix_time`;
  (c) viatura (re)atribuída à OS **depois** do fix (arnês do 01: `assignVehicle` após `fixNow`) → `operator_history_ambiguous` — cada um
  grava 1 amostra.
- **I5** os 7 motivos **sem** amostra, cada um com `attributes` cheios: `unmapped_device`; `tenant_inactive`; `fix_before_active_binding`;
  `fix_in_future`; `invalid_fix` (`valid:false`); `resolution_budget_exceeded` (`maxTenants: 1` com 2 organizações); `idempotency_key_owned_elsewhere`
  (recibo `position` da mesma chave semeado em B) → 0 amostra, 0 `position_sample`, em **todas** as organizações.
- **I6** um fix → uma amostra entre caminhos: depois de I1, inserir pelo repositório uma amostra com o **mesmo** `fix_key` pendurada num
  recibo `position` (semeado) → 0 linhas inseridas; total **1**. **I6′** corrida: a barreira `afterBindingLocked` com a mesma posição
  entregue 2× sem despacho → 1 `position_sample`, 1 amostra, `delivery_count 2`.
- **I7** falha forçada dentro do savepoint (comando com `telemetry.batteryLevelPct = 101` montado à mão) → 202; **1** linha de quarentena;
  0 amostra; **0** recibo `position_sample`; log `sample_discarded`.

### Q1.6 Registro da decisão — texto para o orquestrador gravar em `decisoes.md` (A-14)

> **`D-TRC02-Q1-AMOSTRA-SEM-OPERADOR` (decisão do dono, 2026-10-19; contexto completado em 2026-10-19).** Quando a posição vai à quarentena
> por falta ou ambiguidade de operador, o ERP **guarda** os atributos veiculares para a viatura (recibo `position_sample`; um fix → uma
> amostra no banco). **Esta decisão NÃO revoga a decisão 4** (`PLANO_TRACCAR.md` §4: "viatura sem técnico não aparece em lugar nenhum;
> privacidade vem antes de cobertura") **nem fecha a `P-TRC-LGPD`**: ela trata de **guardar**, não de **exibir**. O B-TRC-02 não abre rota
> de leitura; o que o B-TRC-04 mostra de viatura fora de despacho (amostra **e** evento — C-10, ignição/movimento fora do expediente) é
> decisão separada, sob `P-TRC02-LGPD-TELEMETRIA-SEM-DESPACHO`, antes do B-TRC-04. O dono foi informado de que o "2º índice global"
> citado na pergunta era premissa falsa (o índice do 01 já cobre) e de que a função `auth_login_candidates` da Q2 é `SECURITY DEFINER`.

**Se o dono disser NÃO** (por privacidade ou por outro motivo): gravar `D-TRC02-Q1-NAO`; **o orquestrador pergunta no mesmo ato se C-10
(evento de viatura sem despacho) segue a mesma regra** — o plano atual conserva eventos porque o §7 do plano do Traccar os define como
objetivo do bloco, sem condição de despacho; se a resposta for "também não", C-10/E8 invertem (evento sem despacho → 202
`no_operator_at_fix_time`) e isso é **outra emenda**, não esta.

### Q1.7 O que SAI se Q1 = NÃO (lista exata; o dev aplica antes de escrever a migração)

| Onde | Sai | Entra no lugar |
|---|---|---|
| Migração A (§6.1) | a coluna `"fix_key" TEXT`; a `CONSTRAINT vehicle_telemetry_events_fix_key_check`; o `CREATE UNIQUE INDEX vehicle_telemetry_events_sample_fix_key`; o literal `'position_sample'` do CHECK do recibo | nada (o CHECK fica `('position','event')`) |
| `prisma/schema.prisma` | `fix_key String?` e o comentário `[Q1=SIM]` | — |
| `traccar-ingestion.service.ts` | `SAMPLE_ON_QUARANTINE_REASONS`; `sampleWithoutOperator`; a chamada condicional no passo 5 | — |
| `traccar-ingestion.repository.ts` / `vehicle-telemetry*.ts` | `'position_sample'` do tipo `messageKind`; `fixKey` em `insertSample` e o `ON CONFLICT (fix_key) …` | `insertSample` como INSERT simples (o `UNIQUE (tenant_id, receipt_id)` já basta) |
| Testes | o arquivo `tests/traccar-event-sample-quarantine-db.test.ts` inteiro (I1-I7); a asserção `'position_sample'` de G8 | F3 recupera a asserção **"0 amostra"**; entra M-E16′ |
| `.github/workflows/ci.yml` | a linha `SUITES="$SUITES tests/traccar-event-sample-quarantine-db.test.ts"` | denominador 431 em vez de 438 |
| Mutações | M-Q1-01..06 | M-E16′ |
| `API_CONTRACTS.md` | a nota de §Q1.4 | — |
| Critérios/contagens | C-Q1-1..3; 7 testes; 6 mutações | 25 critérios, 94 testes, 43 mutações |
| Registro | `D-TRC02-Q1-AMOSTRA-SEM-OPERADOR` | `D-TRC02-Q1-NAO` + a pendência `P-TRC02-AMOSTRA-SO-COM-POSICAO-ACEITA` (dono B-TRC-03) |

**O que fica igual nas duas respostas:** savepoint no caminho aceito (C-19), domínio fechado (§6.3), teardown dos arnês (§7.2), FK de 4
colunas (C-24), limitador por rota (C-22), chave com coordenada (§6.5), H6/H7 (C-21/C-23), quarentena de evento (§5.4).

---
## 13. Registro de execução deste planejador e limpeza

| # | Comando (resumo) | Saída resumida | Para quê |
|---|---|---|---|
| 1 | `git fetch -q origin && git rev-parse origin/main` | `3fbcaea2ba3cd1d39a42ff8943a2cc0086ef010d` (a mesma ref da v1 e das críticas) | §A7 |
| 2 | `cp -n B-TRC-02-plano.md B-TRC-02-plano-v1.md`; `md5sum` dos dois | `25af2552592735c59ce54396f215db0f` nos dois; 104 678 bytes; 890 linhas (`wc -l`) | preservar a v1 antes de escrever |
| 3 | leitura integral da v1 (890 l.), da crítica Opus (198 l.), da crítica Flash (187 l.) e das respostas do dono | 16 + 7 achados; Q1/Q2/Q3 = SIM | §1 |
| 4 | `git show origin/main:tests/traccar-{idempotency,position-ingestion,resolution-race,quarantine,binding-uniqueness,ingest-pool}-db.test.ts ¦ grep -n 'function command¦DELETE FROM¦for (const table¦structuredClone'`; `git show …:infra/traccar/fixtures/6.16.0/position-osmand.json` | listas de limpeza começando em `traccar_ingress_receipts`; comando pelo parser; fixture com `motion/totalDistance` | A-01 |
| 5 | `git show origin/main:tests/traccar-dev-topology.test.ts ¦ sed -n '195,225p'` + grep `forward.header`; `infra/traccar/dev/traccar.xml`; `docker-compose.traccar.yml` (grep FORWARD/ports) | regex l.214 só `forward.header`; xml sem `event.*`; compose com `FORWARD_HEADER: ${TRC_FORWARD_HEADER:?}` | A-03, C-18 |
| 6 | `git show origin/main:src/integrations/traccar/traccar-ingestion.service.ts` (grep dos passos; l.56-130; l.300-363) | passos 1-7; `NO_OPERATOR_REASON`; `quarantineWithoutTenant`; `createTraccarIngestAppFromEnv` com 1 limitador | A-04, A-06, §Q1 |
| 7 | `…traccar-position.adapter.ts ¦ sed -n '35,75p'`; `…B-TRC-01-evidencias/mutations.mjs` (ids, `T`, MUT-17/18/19) | chave com `fixTime¦lat¦lon`; mapa `T`; MUT-17/18/19 só `T.auth` | A-07, A-09 |
| 8 | `…20260874000000…/migration.sql ¦ sed -n '80,170p'` | recibo com `vehicle_id`/`binding_id`, índice global `(instance_key, message_kind, external_event_key)`; quarentena sem tipo | A-04(5), A-11, A-12 |
| 9 | `…PLANO_TRACCAR.md ¦ sed -n '84,108p;128,142p;1016,1046p;1994,2006p'`; `pendencias.md ¦ grep P-TRC-LGPD` | decisão 4; PERMITIDO do 02 e do 03; `P-TRC-LGPD` ALTA ABERTA (l.10749) | A-05, A-14 |
| 10 | `git grep -n auth_login_candidates origin/main -- prisma/migrations scripts docker-compose.prod.yml docs/deployment.md`; `20260868…/migration.sql ¦ sed -n '45,60p;250,262p'`; `scripts/db-runtime-role.sh ¦ sed -n '55,90p'`; `git grep -n 'guard 8' origin/main -- tests` | `SECURITY DEFINER`, `REVOKE … FROM PUBLIC`, nenhum `GRANT`; o script concede só DML/sequências; guard 8 em `auth-invariant-guards.test.ts:186` | A-15, Q2 |
| 11 | `tests/traccar-quarantine-db.test.ts` (asserções), `traccar-resolution-cost.test.ts:125-150`, `traccar-resolution.ts` (budget), `schema.prisma` (`VehicleTrackingBinding`), `traccar-ingestion.repository.ts` (hooks), `tests/traccar-idempotency-db.test.ts:150-215` | molde da asserção de quarentena; `budget_exceeded`; sem `traccar_device_id`; `afterBindingLocked`/`twoPartyBarrier` | ACH-01/03/05/07 |
| 12 | `src/database/rls.ts` (grep `$transaction`), `package.json` (prisma), `git grep -i savepoint origin/main -- src tests` | `$transaction` interativo; Prisma `^7.8.0`; savepoint em `identity-resolver.ts:49-77` | A-02 (H-10) |
| 13 | `traccar-ingest.app.ts` (deps/limiter/app.post), `traccar-ingest.bootstrap.ts`, `env.ts` (TRACCAR_*), `scripts/traccar-dev-demo.mjs` (psql/step/with-web), `API_CONTRACTS.md:70-102`, `.github/workflows/ci.yml:270-292`, `tests/helpers/auth-identity-fixture.ts:320-360`, `tests/rls-tenant-isolation.test.ts:1900-1910` | limitador injetado; sem variável nova necessária; helpers do demo; contrato do 01; lista curada; papel efêmero; lição "TEARDOWN FK-SAFE" | A-06, A-15, C-20 |
| 14 | `curl -sS --max-time 25 …/v6.16.0/…/config/Config.java` → scratchpad; `grep -n getEnvironmentVariableName` | l.140-141: `event.forward.header` → `EVENT_FORWARD_HEADER` | S-E15 (H-2 fechada) |
| 15 | `git show origin/main:agent-orchestration/controle/decisoes.md ¦ sed -n '3778,3800p'` | `D-TRC02-RESPOSTAS` l.3783-3786 | F-R14, gate 7/8 |
| 16 | gravação deste arquivo em 18 fatias (`cat >> … <<'ZZ'`), cada uma conferida por `wc -l`; 1 correção de frase por `sed`; fatias acima de ~8,5 KB falharam no parse do shell da ferramenta (3 vezes) e foram **re-gravadas em partes menores** sem perda (o arquivo foi conferido por `wc -l` antes de cada regravação) | 1173 linhas (≈ 143 KB) | P1 |

**Não executado (de propósito, pelas regras do mandato):** nenhuma suíte, nenhum `npm ci`, nenhum worktree, nenhum container, nenhuma
porta, nenhuma edição no repositório, nenhum commit, nenhum `tail -f`. Onde a v2 afirma número de testes do 01, é a contagem da ata
(executada) ou do `grep` (estática), com a procedência dita; onde afirma comportamento do Traccar, é `arquivo:linha` da tag.

**Limpeza:** nada a remover no repositório (nada foi criado lá). No scratchpad da sessão fica `traccar-src/Config.java` (4,8 KB, insumo
de medição, apagável) e os dois arquivos de teste de heredoc `t1.md`/`t2.md` (0,1 KB). Esta v2 é a entrega, em
`C:/Users/AMP/erp-pausa-2026-10-03/planos/B-TRC-02-plano.md`; a v1 está em `B-TRC-02-plano-v1.md`; o dev copia as duas para
`docs/revisoes/TRACCAR/` no PR (§9.6 passo 1).

**Estado: COMPLETO** (§0-§13 e §Q1 gravados; nenhuma seção `EM APURAÇÃO`). **Achados: 23 respondidos** (15 aceitos + 1 contestado em parte
do Opus; 4 aceitos + 3 duplicados do Flash). **Mudanças de alvo declaradas: 12.** **Critérios: 25 (+3 só se Q1 = SIM).** **Testes novos
previstos: 94 `test()` em 8 arquivos (+7 numa 9ª suíte só se Q1 = SIM = 101).** **Mutações: 43 (26 mantidas + 1 ampliada + 16 novas) +
6 só se Q1 = SIM, + 17 do 01 re-executadas; 2 retiradas (M-E08, M-E16); 1 variante só se NÃO (M-E16′).** **Migrações: 2 (A + B/VALIDATE),
rollback na ordem executável com `_prisma_migrations`.** **Perguntas novas ao dono: 0** (a Q1 pode mudar; as duas formas estão escritas).
