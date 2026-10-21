# B-TRC-02 — crítica adversarial, rodada 1 (critico-trc02-opus)

> **Papel:** crítico adversarial (§C7.1-ter(b): bloco de invariante — segurança/isolamento). **Modelo:** Claude Opus (`claude-opus-5-5`),
> nível menor, DECLARADO. Identidade nova; não escreveu o plano, não vai implementá-lo, não vota.
> **Objeto:** `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-TRC-02-plano.md` (890 l., de `planejador-trc02-fable`).
> **Ref medida (§A7):** `origin/main` = `3fbcaea2ba3cd1d39a42ff8943a2cc0086ef010d` (após `git fetch`). Nada editado no repo; sem Docker; sem base viva.
> **Regra:** quem acha não conserta (§C7.4-bis) — cada achado traz defeito + evidência + motivo; NENHUMA correção proposta.
> **Estado:** COMPLETO — 17 evidências (E1-E17), 16 achados (4 bloqueia, 12 ajuste); veredito VOLTA AO PLANO.

## Evidência incremental (P1)

- **E1** `git fetch origin; git rev-parse origin/main` → `3fbcaea2ba3c…` (= ref do plano). Veredito parcial: medição na mesma ref do planejador.
- **E2** `git show origin/main:docs/revisoes/TRACCAR/PLANO_TRACCAR.md | sed -n '1018,1045p'` → PERMITIDO do 02 = `prisma/schema.prisma`, **uma** migration `*_vehicle_telemetry_events`, `src/integrations/traccar/**`, `src/modules/telemetry/**`, `src/modules/vehicles/**` (porta de leitura), `src/config/env.ts`, `.env.example`, `tests/traccar-event-*.test.ts`, `tests/telemetry.test.ts`, contratos/docs/orquestração. Rollback "remove só a tabela/índices novos". `infra/traccar/dev/**` e o overlay aparecem nominalmente só no PERMITIDO do **B-TRC-03**. Veredito parcial: insumo do item 3.
- **E3** `git show origin/main:src/integrations/traccar/traccar-rate-limit.ts | head -60` → comentário l.4: "Quem passar… recebe 429 (**o Traccar repete com atraso crescente**)"; um bucket + um teto de concorrência por app. Veredito parcial: a premissa "429 é recuperável" do 01 vale para posição, não para evento (S-E3 do próprio plano).
- **E4** `git show origin/main:prisma/migrations/20260874000000_traccar_ingestion_foundation/migration.sql | sed -n '83,162p'` → recibo tem `binding_id`, `vehicle_id`, `traccar_device_id`, `fix_time`; quarentena é GLOBAL, sem coluna de tipo de mensagem, com `last_event_key`, `delivery_count`, `first_fix_at/last_fix_at`, episódio único por `(instância, dispositivo, motivo)`. Veredito parcial: insumo dos achados de quarentena e de FK.
- **E5** `git show origin/main:src/integrations/traccar/traccar-ingestion.service.ts | grep -n …` → passo 3 = `fixQuarantineReason` + `fixedAt < binding.validFrom`; passo 6 invisível → quarentena `idempotency_key_owned_elsewhere` + 409; `recordQuarantine` usa LEAST/GREATEST (repo l.151-152). Veredito parcial: janela da quarentena robusta a ordem; mistura de tipos não.
- **E6** `git show origin/main:infra/traccar/fixtures/6.16.0/position-osmand.json | grep -A4 attributes` → `position.attributes = {distance:0, totalDistance:0, motion:true}` — `motion` e `totalDistance` estão na allowlist do §3.3 do plano. Veredito parcial: toda posição aceita construída da fixture gera 1 linha `sample` depois do bloco.
- **E7** `git show origin/main:tests/traccar-{idempotency,position-ingestion,resolution-race,quarantine,binding-uniqueness}-db.test.ts | grep -n 'function command\|DELETE FROM\|for (const table'` → os 5 arnês do 01 constroem o comando **pelo parser a partir da fixture** (`structuredClone(FIXTURE)` → `parseTraccarPositionEnvelope` → `buildTraccarPositionCommand`, sem remover `attributes`) e limpam com `DELETE FROM traccar_ingress_receipts … ; … DELETE FROM vehicles …; DELETE FROM tenants …` — **nenhum** apaga `vehicle_telemetry_events`. Veredito parcial: com a FK `ON DELETE RESTRICT` nova (recibo/viatura/vínculo/tenant), o teardown do 01 dá 23503 → achado A-01.
- **E8** Plano l.395-398 (`ranges_check`: `power_mv >= 0`, coluna `INTEGER`; `engine_hours_s BIGINT`) × l.469-473 (`power` → `Math.round(V×1000)` e `hours` → `Math.round(ms/1000)` **sem faixa**; só odômetro/distância têm teto 2^53 e bateria 0..100) × l.652 (B4 cobre só `ignition:"yes"`, `batteryLevel:150`, `odometer:-1`). Veredito parcial: valor que o parser aceita e o banco recusa → achado A-02.
- **E9** `git show origin/main:tests/traccar-dev-topology.test.ts | sed -n '207,215p'` → a guarda do 01 é `assert.doesNotMatch(xml, /key=['"]forward\.header['"]/i)`: casa `key='forward.header'` e **não** casa `key='event.forward.header'` (o `key='` tem de vir colado em `forward`). Plano l.655 (H4) assere só presença de `event.forward.type`/`event.status.enable`. Veredito parcial: achado A-03.
- **E10** `git show origin/main:src/integrations/traccar/traccar-ingestion.service.ts | sed -n '195,270p'` → passo 4 (recibo `message_kind='position'`) roda **antes** do passo 5 (operador); quarentena por operador (`no_operator_at_fix_time`/`ambiguous_operator_at_fix_time`/`operator_history_ambiguous`) acontece **com organização e vínculo já confirmados** (`FOR SHARE`) e **sem recibo**; `bindings.length > 1` → `throw traccar_binding_not_unique`. Veredito parcial: insumo da avaliação da Q1=SIM (A-04).
- **E11** `git show origin/main:src/integrations/traccar/traccar-position.adapter.ts | sed -n '47,58p'` → chave da posição = `v1|inst|uniqueId|fixTime ms|lat|lon` (inclui coordenada). Plano l.500: chave do evento = `v1|inst|uniqueId|type|eventTime ms|alarm` e l.505 digest = `{type, eventTime, uniqueId, traccarDeviceId, alarm}`. Veredito parcial: achado A-07.
- **E12** `git show 'origin/main:docs/revisoes/TRACCAR/B-TRC-01-evidencias/mutations.mjs' | grep -n MUT-1[789]` → MUT-17/18/19 editam `traccar-forward-auth.ts` e rodam só `T.auth`; plano l.635 (C-07) diz "coberto pelas MUT-17/18/19 do 01, re-executadas", mas a lista de re-execução de l.689-690 **não** as contém. Veredito parcial: achado A-09.
- **E13** `git show origin/main:docs/revisoes/TRACCAR/PLANO_TRACCAR.md | sed -n '86,106p;130,140p;1996,2004p'` → decisão 4 do dono: "viatura **sem** técnico (… uso fora do expediente) não aparece em lugar nenhum"; opção **c** "posição da viatura sem técnico" = "modelo novo, bloco próprio e junta"; "privacidade vem antes de cobertura"; `P-TRC-LGPD` ALTA ABERTA. Plano l.847-856 (Q1) e l.638 (C-10/E8, evento sem despacho gravado) não citam nada disso. Veredito parcial: achado A-14.
- **E14** `git grep -n auth_login_candidates origin/main -- prisma/migrations` → `20260868000000_add_auth_identities/migration.sql:52` "SECURITY DEFINER lê users/tenants/credenciais"; l.257 `REVOKE ALL … FROM PUBLIC`. Plano l.853-856 (Q2) não diz isso. Veredito parcial: achado A-15.
- **E15** `git grep -n telemetry_events origin/main -- tests/rls-tenant-isolation.test.ts` → l.1906/2974: "TEARDOWN FK-SAFE: telemetry_events ANTES de operator_profiles (lição do CI-catch PR-06)". Veredito parcial: a classe do A-01 já mordeu este repositório uma vez.
- **E16** `MSYS_NO_PATHCONV=1 git show origin/main:.github/workflows/ci.yml | grep -n -i 'migrate diff|drift'` → nenhum check de drift do Prisma. Veredito parcial: sem achado (o modelo do §3.1 bate com os nomes da migração por leitura).
- **E17** `cat …/planos/B-TRC-02-respostas-do-dono.md` (recebido do orquestrador no meio da crítica) → Q1 = SIM (contra a recomendação), Q2 = SIM, Q3 = SIM. Veredito parcial: o plano medido (F3, C-13, §2.3 fluxo S, §8 risco "Q1 = não") agora **contradiz** a decisão do dono → A-04.

---

## Achados

### A-01 — A FK `RESTRICT` nova quebra o teardown de 5 suítes do 01, que o próprio plano proíbe editar · **bloqueia** · `dentro-do-bloco`

- **Evidência:** E6 + E7 + E15. A fixture `position-osmand.json` traz `attributes {motion:true, totalDistance:0}`. As duas chaves estão na allowlist do §3.3 (l.466-473). Os arnês `-db` do 01 (`traccar-idempotency-db`, `traccar-position-ingestion-db`, `traccar-resolution-race-db`, `traccar-quarantine-db` e `traccar-binding-uniqueness-db`) montam o comando **pelo parser, a partir da fixture**. Logo, depois do bloco, **toda posição aceita nesses testes grava uma linha `sample`**, que aponta por FK `ON DELETE RESTRICT` para o recibo, a viatura, o vínculo e o tenant (l.405-412). O teardown deles começa por `DELETE FROM traccar_ingress_receipts WHERE tenant_id = ANY(...)` (idempotency l.81, position-ingestion l.101-110, race l.89, binding-uniqueness l.48) e **não** apaga `vehicle_telemetry_events` → `23503`.
- **O plano prende os dois lados:**
  - §4.2 proíbe "os 14 arquivos de teste do 01 que §4.1 não nomeia";
  - §6.7 passo 4 exige `git diff --stat` vazio neles;
  - a cadeira (a), item 3 (l.765), exige "byte a byte iguais a `c1485c94`";
  - e a régua da CI (l.672) espera 391 + 32 com `fail 0`.
- **Motivo:** as duas exigências não cabem juntas. Ou o hook `after` do 01 falha (o `node:test` conta como falha e a régua 423/`fail 0` cai), ou o dev edita arquivo proibido, ou alguém "resolve" afrouxando a FK. O plano não previu, não testou e não declarou isso; o H-9 só mede o baseline **antes** do código. A classe já mordeu este repositório (E15, "TEARDOWN FK-SAFE … CI-catch PR-06").
- **Medição:** por leitura (proibido rodar Docker/banco neste mandato). A prova executável é rodar as 5 suítes no container com o schema novo.

### A-02 — O parser aceita valor que o banco recusa → a POSIÇÃO inteira vira 503 (perda do ponto do mapa, retry eterno) · **bloqueia** · `dentro-do-bloco`

- **Evidência:** E8.
  - **`power`:** vira `Math.round(V×1000)` **sem faixa**, mas o banco tem `power_mv INTEGER` e `CHECK power_mv >= 0`.
  - **`hours`:** vira `Math.round(ms/1000)` **sem teto**, numa coluna `BIGINT`.
  - **Teto e faixa no plano:** só odômetro e distância têm teto 2^53, e só a bateria tem 0..100.
  - **De onde vem o valor:** pelo S-E13 do próprio plano, no OsmAnd o valor sai de query string controlada pelo dispositivo (`power=-1` → `-1.0`; `power=3000000` → 3e9 > int4; `hours=1e25` → 1e22 > int8).
  - **Onde o INSERT acontece:** o INSERT da amostra fica **na mesma transação** da localização (§2.3, fluxo S; §3.6).
  - **Cobertura:** o B4 testa só `ignition:"yes"`, `batteryLevel:150` e `odometer:-1`. Nenhuma mutação mede "o que o parser aceita ⊆ o que o CHECK e o tipo da coluna aceitam".
- **Motivo:** a regra do próprio plano (l.475, "rejeitar a posição inteira por um atributo ruim perderia o ponto do mapa") **não tem teste capaz de falhar** nos casos que a violam. Um atributo de dispositivo fora da faixa leva a `22003`/`23514`, que leva ao rollback da localização e do recibo e a um 503. O forward de posição repete (`forward.retry.enable=true`, `traccar.xml` do 01), então o mapa daquela viatura morre e a fila de retry cresce. Isso regride a propriedade central do B-TRC-01 (perda de dado). Com a Q1 = SIM (A-04), o mesmo defeito alcança a quarentena: o registro da quarentena também volta no rollback.

### A-03 — Regra do dono "token nunca em código/config" sem teste no canal NOVO (`event.forward.header` no `traccar.xml`) · **bloqueia** · `dentro-do-bloco`

- **Evidência:** E9.
  - **A guarda do 01** (`traccar-dev-topology.test.ts:214`) é a regex `/key=['"]forward\.header['"]/`. Ela **não** pega `<entry key='event.forward.header'>X-Traccar-Forward-Token: …</entry>`.
  - **As suítes do plano:** H2 cobre só o compose (`EVENT_FORWARD_HEADER` por `${…:?}`), e H4 só a **presença** de `event.forward.type` e `event.status.enable`.
  - **A mutação M-E28** mexe no compose, não no XML.
  - **A rota de fuga escrita no próprio plano:** o §8 (risco H-2) e o §0.4 H-2 apontam o `traccar.xml` como saída se a variável de ambiente não funcionar ("segredo no XML é PROIBIDO → bloco parado"). Mas nenhum teste trava essa saída.
- **Motivo:** é exatamente o lugar onde o segredo do canal novo pode ir parar, e a mutação "pôr o segredo do evento no `traccar.xml`" passa verde em todas as suítes do 01 e do 02. É regra do dono (§C7 item 8(4)) que fica sem teste no canal que este bloco abre.
### A-04 — Q1 = SIM: o plano medido contradiz a decisão do dono e não tem o que a emenda precisa · **bloqueia** · `dentro-do-bloco`

- **Evidência:** E10, E17 e o plano: l.229-230 ("posição em quarentena → **sem amostra**"), l.641 (C-13), l.660 (F3: "posição em quarentena por operador → 0 amostra, 0 recibo"), l.808 (risco "Q1 = não"), l.851-852 (Q1: "recibo próprio para a amostra, 2º índice global").
- **O que o plano TEM e serve à emenda:**
  - a organização **sem pessoa** já está resolvida no passo onde nasce a quarentena por operador (E10: passos 1-2 confirmam tenant ativo e vínculo `FOR SHARE` **antes** do passo 5);
  - a escrita no passo 5 acontece dentro da transação sob GUC (`withTenantRlsBudget`), logo RLS e FK composta se aplicam à amostra igual ao fluxo aceito;
  - o vínculo ambíguo **já** falha fechado no 01 (`bindings.length > 1 → throw`, 503), e o vínculo é único globalmente por índice.
- **O que FALTA. Cada item é defeito do plano para a emenda, e nenhum tem teste nem mutação:**
  1. **Idempotência entre caminhos.** Hoje a identidade da amostra é `UNIQUE (tenant_id, receipt_id)` com o recibo **da posição**. Uma amostra gravada na quarentena tem de pendurar em **outro** recibo, porque a posição em quarentena não tem recibo. Daí a mesma leitura (o mesmo fix) poder virar **duas** amostras: uma na quarentena e outra quando a posição for aceita depois, pela reconciliação do B-TRC-03 ou por uma reentrega após o histórico de despacho mudar. Nada no plano torna "um fix → uma amostra" uma propriedade do banco. E se o recibo da amostra reusar `message_kind='position'`, o passo 4 do 01 (E10) passa a responder `duplicate` à reentrega dessa posição, e ela **nunca** vira localização. Isso muda a semântica de quarentena do 01, que o plano promete intocada (l.849).
  2. **Contrato de resposta.** Hoje a posição em quarentena nunca chega ao passo 6, logo nunca dá 409. Com um recibo na quarentena, a reentrega da mesma chave com digest diferente (outra coordenada) fica sem desfecho definido: `202` ou `409`? Ninguém fixou, e a mudança tocaria o `API_CONTRACTS.md` §2.1-bis.
  3. **Lista de motivos que guardam a amostra.** O dono disse "ninguém tinha a viatura em despacho (ou o histórico é ambíguo)", o que mapeia para `no_operator_at_fix_time`, `ambiguous_operator_at_fix_time` e `operator_history_ambiguous`. O plano não fixa que **todos os outros** motivos continuam **sem** amostra, e não tem teste nem mutação que diga isso:
     - `unmapped_device`, `tenant_inactive`, `resolution_budget_exceeded` e `idempotency_key_owned_elsewhere`, que não têm organização confiável;
     - `fix_before_active_binding` e `fix_in_future`, em que o vínculo não valia no instante;
     - `invalid_fix`, que o dono não decidiu.
  4. **"Vínculo ambíguo" × "operador ambíguo".** A resposta do dono autoriza a amostra com **operador** ambíguo. Nenhum caso prova que vínculo ausente ou duplicado (`not_bound`/`throw`) continua sem amostra **depois** da emenda. Uma mutação que grave a amostra antes do passo 2 não tem teste que a derrube.
  5. **O "2º índice global" é premissa não medida.** O índice global do 01 já é `(instance_key, message_kind, external_event_key)` (E4), então um novo `message_kind` não exige índice novo. O plano dá a consequência como certa sem medir, e a emenda pode nascer com um índice desnecessário ou deixar de ver o problema real do item 1.
  6. **Atomicidade.** A amostra e o registro de quarentena ficam na mesma transação. Uma falha da amostra (A-02) passa a derrubar o **registro da quarentena**, e nenhum teste mede o desfecho disso.
- **Motivo:** o dono decidiu contra a recomendação, e o plano ainda especifica e testa o contrário (F3). Codar a partir dele produz a feature errada. Cada lacuna acima toca isolamento ou perda de dado.
### A-05 — Escopo: o PERMITIDO do plano alarga o do §7 em 7 caminhos sem declarar divergência · **ajuste** · `dentro-do-bloco`

- **Evidência:** E2 × plano §4.1 (l.550-558). Fora do PERMITIDO do §7 do B-TRC-02 estão:
  - `docker-compose.traccar.yml`, `infra/traccar/dev/traccar.xml` e `infra/traccar/fixtures/6.16.0/event-*.json`;
  - `scripts/traccar-capture-fixture.mjs` e `scripts/traccar-dev-demo.mjs`;
  - `tests/traccar-position-contract.test.ts`, que não casa `tests/traccar-event-*.test.ts`;
  - `.github/workflows/ci.yml`;
  - e, depois da Q2 = SIM, o passo de `GRANT` no script do demo.

  O §7 só cita `infra/traccar/dev/**` e o overlay **no B-TRC-03**. O plano declara divergência **apenas** das duas migrações (l.431).
- **Motivo:** a cadeira (b) mede o diff contra o §4.1 **do próprio plano** (l.771), o que torna a medição circular: o alargamento nunca aparece como divergência. O §A2 exige registro antes de consolidar. A causa é técnica e legítima (fixture e topologia), mas o alargamento é silencioso.

### A-06 — Limitador compartilhado + evento sem retry: o C8 consagra perda de evento como comportamento esperado · **ajuste** · `dentro-do-bloco` (o desenho do limitador é `pre-existente`, de 01/10, mas a exposição do evento nasce aqui)

- **Evidência:**
  - **O limitador do 01 (E3)** assume "o Traccar repete com atraso crescente", o que o S-E3 do plano desmente para evento.
  - **O C8 (l.653)** assere "burst 1: a posição consome a ficha, o evento leva 429". Com S-E3, isso quer dizer evento **perdido**.
  - **O risco do §8 (l.807)** só olha um sentido ("rajada de eventos tira fichas da posição"). Não olha o inverso: depois de uma indisponibilidade do ERP, a fila de retry de posições drena em rajada, ocupa bucket e concorrência, e os eventos de ignição e alarme gerados nessa janela levam 429 ou 503 sem volta até o B-TRC-03.
  - **Os tipos `ignored`** também consomem ficha.
- **Motivo:** a perda acontece justamente no pós-incidente, quando alarme importa mais, e fica sem número e sem pendência que a nomeie. O `P-TRC02-LIMITADOR-POR-ROTA` descreve só a disputa genérica.

### A-07 — A premissa da chave de evento ("dois eventos distintos nunca compartilham dispositivo, tipo, ms e código") não foi medida, e o digest ≈ chave torna a colisão silenciosa · **ajuste** · `dentro-do-bloco`

- **Evidência:** E11 e plano l.502-507.
  - **De onde vem o `eventTime`:** nos eventos derivados de posição, o S-E6 diz que `eventTime = position.getDeviceTime()`.
  - **A chave da posição** tem `fixTime` **e coordenada**. A do evento não tem nada da posição. Duas posições com o **mesmo `deviceTime`** (relógio do aparelho travado, ou sem GPS, com o `fixTime` ou a coordenada diferentes) e uma transição off→on→off→on de ignição entre elas produzem dois `ignitionOn` com a mesma chave.
  - **O digest** (`{type, eventTime, uniqueId, traccarDeviceId, alarm}`) só difere da chave por `traccarDeviceId`. Então o segundo evento sai como `duplicate` (204), não como 409.
- **Motivo:** o segundo evento some sem rastro (nem 409, nem `conflict_count`), e o critério C-11 "digest ≠ → 409" só é exercitável forjando `traccarDeviceId`. O plano afirma a unicidade por raciocínio sobre um handler e não mede o caso de relógio repetido.

### A-08 — C-02 "delivery-independente": o E12 é tautológico · **ajuste** · `dentro-do-bloco`

- **Evidência:** l.508-510 e l.659 (E12). A "reconciliação fake" monta o comando com **a mesma função pura e as mesmas entradas** do forward. A propriedade real é que o `/api/reports/events` devolva o mesmo `eventTime` em ms, o mesmo `uniqueId` (a REST traz `deviceId`, não `uniqueId`) e o mesmo `attributes.alarm`, e ela não é observável neste bloco. O §8 (l.805) diz que "E12 prova que a chave é delivery-independente **hoje**".
- **Motivo:** o critério não consegue falhar pela causa que nomeia. A M-E03 só pega `receivedAt` na chave. É afirmação de fato sobre o B-TRC-03 sem medição: tem de ficar como hipótese, não como prova.

### A-09 — C-07 (tempo constante e mesmo segredo na rota nova) cita mutações que o plano não re-executa · **ajuste** · `dentro-do-bloco`

- **Evidência:** E12. As MUT-17/18/19 não estão na lista de 12 re-execuções (l.689-690) e rodam só `T.auth` do 01, nunca a rota `/events`. Do que é específico deste bloco, só a M-E12 (rota sem o middleware) toca o C-07.
- **Motivo:** o critério "comparado em tempo constante" é regra do dono e fica, na rota nova, sem vermelho-controle próprio. O registro do critério declara uma cobertura que não acontece.

### A-10 — "Mutação de tenant" pedida pelo §7: a M-E08 não é aplicável como âncora, e falta o caso do tenant forjado onde ninguém varre · **ajuste** · `dentro-do-bloco`

- **Evidência:**
  - **O pedido:** o §7 (E2) pede "mutation de tenant".
  - **A M-E08 (l.637)** é descrita como intenção ("usa `traccarDeviceId` para achar a organização (pula a confirmação)"), sem `find/replace`. O formato herdado exige âncora única que compile (l.686).
  - **O lugar sem varredura:** `event.attributes` **não** é varrido por chave reservada (l.253, A8), e o adaptador lê `attributes.alarm` dali. Nenhum caso manda `event.attributes.tenantId = <B>` com o canário B `0/0/0` para provar que um tenant forjado ali não influencia.
- **Motivo:** a regra do dono "tenant do payload nunca é confiável" tem, no canal novo, um lugar de leitura sem varredura e uma mutação que talvez "não meça" (lição MUT-10/23/13 do 01).

### A-11 — Quarentena mistura posição e evento no mesmo episódio sem discriminador · **ajuste** · `dentro-do-bloco`

- **Evidência:** E4. O episódio é único por `(instance_key, external_device_key, reason)`, com `last_event_key`, `last_payload_digest` e `delivery_count`, e **sem** coluna de tipo de mensagem. O plano manda evento de dispositivo não mapeado para os **mesmos** motivos (l.239) e proíbe tocar `traccar_quarantine_items` (l.570).
- **Motivo:** depois do bloco, `last_event_key` pode ser chave de posição **ou** de evento, sem como distinguir. E `delivery_count` passa a somar status, ignição e alarme, não posições. O B-TRC-03/05 (replay ou reconciliação a partir da quarentena) herda um dado ambíguo. Não há pendência nomeada nem declaração disso.
### A-12 — A FK composta aponta para a viatura, mas não amarra a viatura ao vínculo nem ao recibo · **ajuste** · `dentro-do-bloco`

- **Evidência:** l.318-320 e 405-412. Há três FKs **independentes**: `(tenant_id, vehicle_id) → vehicles`, `(tenant_id, binding_id) → bindings` e `(tenant_id, receipt_id) → receipts`. O recibo do 01 tem `vehicle_id` e `binding_id` **próprios** (E4).
- **Motivo:** o cross-tenant está fechado por construção. Mas, dentro da organização, uma linha pode apontar para a viatura V2 com o vínculo de V1 e o recibo de V1, e nada no banco recusa. É a classe "viatura no tempo" do 01 (jurado `c2-c`): a garantia fica só no código, e o §1.1 diz que "nenhum código de aplicação é a autoridade". Não há teste nem mutação.

### A-13 — Rollback: o cabeçalho se contradiz, e o "rollback real" do §7 diverge sem declaração · **ajuste** · `dentro-do-bloco` (o `_prisma_migrations` é `pre-existente`: a `20260874…` do 01 também não trata dele, E4/ref)

- **Evidência:** l.361, "nenhuma tabela alheia é tocada", vem logo depois de um `ALTER TABLE traccar_ingress_receipts` (l.358-360). O §7 diz que o rollback "remove só a tabela/índices novos" (E2). O drill G9 roda numa base **vazia**, então não exercita o pré-requisito "zero recibos `event`", que exige apagar `vehicle_telemetry_events` antes (FK `RESTRICT`), e o cabeçalho não diz isso. Com a Q1 = SIM, entra um terceiro `message_kind` que o rollback também não cobre.
- **Motivo:** o rollback escrito não é executável na ordem dada em base com dado de dev, e o texto afirma o oposto do que faz. É o que o DBA vai conferir sem que o plano tenha dito.

### A-14 — Q1 (e o C-10) foram perguntados sem o contexto de privacidade que o próprio dono fixou · **ajuste** · `dentro-do-bloco`

- **Evidência:** E13.
  - **Decisão 4 do dono:** "uso fora do expediente não aparece em lugar nenhum… privacidade vem antes de cobertura"; a "viatura sem técnico" é a opção c, "modelo novo, bloco próprio e junta".
  - **`P-TRC-LGPD`:** ALTA, aberta.
  - **C-10/E8:** o plano grava **evento** (ignição, movimento, online) de viatura **sem despacho**, e isso nunca foi perguntado.
  - **Q1:** pergunta só a amostra, sem citar a decisão 4 nem a `P-TRC-LGPD`.
- **Motivo:** ignição e movimento fora do expediente são inferência de uso pessoal da viatura pelo técnico, a mesma razão da regra estrita da decisão 4. O "SIM" do dono foi dado a uma pergunta sem esse contexto, e o registro em `decisoes.md` precisa ligar a resposta à decisão 4 e à `P-TRC-LGPD`, senão o B-TRC-04 herda a contradição. Não bloqueia: produção já está travada pela `P-TRC-LGPD`, e o dado de dev é sintético.

### A-15 — Q2 = SIM põe uma concessão de permissão de banco num PR de ingestão sem guarda de confinamento · **ajuste** · `dentro-do-bloco`

- **Evidência:** E14. `auth_login_candidates` é `SECURITY DEFINER`, lê `users`, `tenants` e credenciais entre organizações, e tem `REVOKE … FROM PUBLIC` por desenho. A Q2 (l.853-856) não informou isso. O plano põe o `GRANT` no `traccar-dev-demo.mjs` como emenda (l.615). Mas nenhuma cadeira do §7 tem a superfície de auth no mandato, e nenhum teste prova que o `GRANT` fica **só** no script do demo (e nunca em `scripts/db-runtime-role.sh`, migrações ou `docker-compose.prod.yml`). O §4.2 proíbe "RBAC", sem dizer se o `GRANT` cai nisso.
- **Motivo:** uma mudança de privilégio de uma função cross-tenant entra pela porta de um bloco de Traccar, e a junta de segurança não tem quem a meça.

### A-16 — Propriedades declaradas sem teste · **ajuste** · `dentro-do-bloco`

- **Evidência:**
  - **(i)** O desempate de `latestDeviceStatus` por `received_at DESC` (l.488) contradiz "nada do que o ERP deriva depende de `received_at`" (l.491). O "mesmo ms" fica só como sugestão à cadeira (c) (l.787), sem caso no §6.2.
  - **(ii)** "Última ignição por `occurred_at`" (l.493) não tem porta nem teste; o E10 cobre só status.
  - **(iii)** O `ignored` é "contado" (l.458, 476, 217), mas nenhum caso diz onde nem como.
  - **(iv)** O B4 não cobre `batteryLevel` fracionário (99,6 ou 100,4): a regra "inteiro 0..100" (l.473) é ambígua entre arredondar e descartar.
- **Motivo:** cada uma é afirmação que nenhum teste consegue desmentir.

---

## Itens do mandato sem achado (medidos)

- **Porta pública / servidor demo:** o §4.1 (l.550) não traz `ports` novo, e o H3/H5 reusam a forma do 01 (E9: as guardas `116-160` e `217` continuam valendo). Sem achado.
- **`src/app.ts`, frontend, `notifications`, RBAC e `WorkOrder.mileage_*`:** estão no PROIBIDO (l.565-572), com a M-E11 (rota no app público → C2) e a M-E22 (`mileage_*` → F6). Sem achado, salvo o `GRANT` (A-15).
- **Raw payload:** a tabela é sem JSON, sem coordenada e sem texto livre, com o G6 e a M-E27. O `position` anexado não é lido (l.249). Sem achado.
- **Tipo e código desconhecidos:** `ignored` 204, sem escrita e sem log do `type` cru (A5, E14, D4, M-E04, M-E05). Sem achado, salvo a contagem (A-16(iii)).
- **Evento atrasado:** a janela `valid_from`/`+5 min` reusa o passo 3 do 01 (E10), e o estado é por `occurred_at` (E10/M-E15). Sem achado, salvo o desempate (A-16(i)).
- **Cross-tenant e RLS sob papel sem bypass:** G1-G7 sob papel efêmero `NOSUPERUSER NOBYPASSRLS`, canário E13/F8, FK composta e índice global do recibo (E4). Sem achado, salvo A-10 e A-12.
- **Migração aditiva / FK para a viatura:** é aditiva (o DROP do CHECK é substituído por um mais largo, `'position'` ⊂ lista), e a FK composta `(tenant_id, vehicle_id) → vehicles(tenant_id, id)` existe e casa com `Vehicle @@unique([tenant_id, id])` (`schema.prisma:1182`). Sem achado, salvo A-12 e A-13.
- **Q3:** está correta e completa; conservar tudo é reversível e notificar fica no B-TRC-05. Sem achado.
- **Q2 "não é deste bloco":** correto quanto à causa (F-R9). O defeito está na forma da pergunta e no confinamento (A-15).

---

## Veredito: **VOLTA AO PLANO**

| Gravidade | N | Achados |
|---|---|---|
| **bloqueia** (todos `dentro-do-bloco`) | **4** | A-01 (FK `RESTRICT` × teardown do 01 "byte a byte"), A-02 (parser ⊄ CHECK/tipo → 503 da posição), A-03 (segredo do evento no `traccar.xml` sem guarda), A-04 (Q1 = SIM: o plano testa o contrário e falta idempotência entre caminhos, contrato de resposta, lista de motivos, prova de vínculo ambíguo fechado, medição do "2º índice", atomicidade) |
| **ajuste** | **12** | A-05 … A-16 (A-06 e A-13 têm parcela `pre-existente` declarada com origem) |

**Q1 = SIM, resposta ao orquestrador:**
- **O que o plano já tem:** tenant sem pessoa (os passos 1-2 do 01 rodam antes do 5), RLS e FK composta na mesma transação, e vínculo ambíguo fechado no 01.
- **O que falta para a emenda:** está enumerado em A-04 (itens 1-6), mais A-02 (atomicidade com a quarentena) e A-13 (rollback do novo `message_kind`).

**Perguntas ao dono:** Q3 correta. Q1 e Q2 foram respondidas, mas sem o contexto material (A-14, A-15): o registro da decisão precisa carregá-lo. Nenhuma das três deveria ter bloqueado o início. Com a Q1 = SIM, a **emenda** (`D-EMENDA-ANTES-DO-CODIGO`) passa a bloquear o código.

**Robustez:** o núcleo de isolamento está bem colocado no banco: índice global do recibo, FORCE RLS, FK composta tenant-first e a organização vinda do vínculo. Não achei vazamento cross-tenant. O plano cai nas **bordas com o 01**: teardown, faixa dos atributos dentro da transação da posição, a guarda do segredo herdada por regex e a semântica de quarentena. É ali que ele ainda não sobrevive.

> Crítico: `critico-trc02-opus` (Claude Opus `claude-opus-5-5`, nível menor, declarado). Sem correção proposta (§C7.4-bis). Nada editado no repositório, sem Docker, sem base viva. Fim: 2026-10-19.
