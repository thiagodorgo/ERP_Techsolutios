# B-TRC-02 — EMENDA v2.1 ao plano v2 (os 4 `ajuste` da crítica r2 viram requisitos ANTES do código)

> **Papel:** `planejador-mestre` (identidade NOVA: `planejador-trc02-emenda-fable`; não escreveu a v2 nem a crítica r2 — §C7.4-bis).
> **Modelo:** **Fable 5.1 (`claude-fable-5-1`)**, o do frontmatter (`D-PLANEJADOR-MODELO-FABLE`). **Sem fallback acionado.**
> Devolução de crítico não aciona o topo (§C7.4); o papel roda em Fable por padrão.
> **Data:** 2026-10-19. **Ref medida (§A7):** `origin/main` = **`bf83cda8a9acdc92f05f29397d1860bed9be5388`** (`git fetch -q origin`
> feito antes; head = #447, "docs(registro): decisões de 18–19/10 …"). A crítica r2 mediu a mesma ref (R2-E1) e provou que o diff
> `3fbcaea2..bf83cda8` nos caminhos do bloco é **vazio** — logo toda medição da v2 em `3fbcaea2` continua valendo aqui.
> **Natureza:** documento SEPARADO. **v2 + esta emenda = plano vigente.** Onde a emenda e a v2 divergirem, **vale a emenda**; onde a
> emenda não fala, **vale a v2** (e, abaixo dela, a v1 como registro). Não reescreve a v2: cada seção diz **o que da v2 muda** (por
> `§`/linha), **o requisito novo** (texto normativo), **o teste que o prende** (nome, arranjo, asserção) e **a mutação que deixa esse
> teste vermelho**. Sem mutação, não é requisito.
> **Entradas:** a v2 (`planos/B-TRC-02-plano.md`, 1174 l.); a crítica r2 (`revisoes/B-TRC-02-critica-r2-opus.md`, **APROVA COM
> AJUSTES**, 0 `bloqueia` + 4 `ajuste`: R2-A1..A4); as respostas do dono (`planos/B-TRC-02-respostas-do-dono.md`: Q1, Q2 e Q3 = SIM,
> 2026-10-19), já na ref como `D-TRC02-RESPOSTAS` (`decisoes.md:3783-3786`) e **sem reversão posterior** (medido em §0).
> **Regras do Traccar, intocadas:** nunca `tenant_id` do payload como contexto; dispositivo não mapeado em quarentena; vínculo ambíguo
> falha fechado; token nunca em código/log/query/frontend, comparado em tempo constante; nenhuma porta pública.
> **Onde medi:** só por `git show origin/main:<caminho>` / `git ls-tree` / `git grep … origin/main` (nada do disco da sessão). **Nada
> executado contra banco, Docker ou portas; nada editado no repositório; nenhum commit; sem `tail -f`.**
> **Gravado seção a seção (P1/P2):** esqueleto primeiro, cada seção gravada ao terminar; estado no fecho.

---
## 0. Premissas medidas na ref (`origin/main` = `bf83cda8`)

Toda premissa abaixo foi medida nesta rodada em `origin/main` = `bf83cda8` (nunca no disco da sessão). Nas células, `¦` é o pipe do shell.

| # | Fato | Comando (ref `bf83cda8`) → saída resumida |
|---|---|---|
| **P-1** | A ref de hoje é `bf83cda8` (#447); a v2 mediu `3fbcaea2`; a crítica r2 provou diff vazio nos caminhos do bloco entre as duas | `git fetch -q origin && git rev-parse origin/main` → `bf83cda8a9acdc92f05f29397d1860bed9be5388`; `git log -1 --format='%h %s' origin/main` → `bf83cda8 docs(registro): decisões de 18–19/10 … respostas do B-TRC-02 (#447)` |
| **P-2** | **Q1/Q2/Q3 = SIM estão na ref, e NÃO há reversão posterior.** As únicas entradas `D-TRC02-*` são `D-TRC02-RESPOSTAS` (l.3783-3786); nenhuma `D-TRC02-Q1-*` | `git show origin/main:agent-orchestration/controle/decisoes.md ¦ grep -n -E 'D-TRC02-'` → só `3783`, `3784` |
| **P-3** | `D-EMENDA-ANTES-DO-CODIGO` existe na ref (l.3738): "decisão nova no meio do bloco vira emenda do plano antes do código" | `… ¦ grep -n 'D-EMENDA-ANTES-DO-CODIGO'` → `3738` |
| **P-4** | **Passo 4 do 01 procura só recibo `'position'`** (`findReceipt` fixa `message_kind = 'position'`, repository l.81-88); o "invisível = outra organização" só nasce no **passo 6** (`insertReceipt` → sem id → `findReceipt` → ausente → `recordQuarantine(…,'idempotency_key_owned_elsewhere')` + `conflict owned_elsewhere`), service l.243-258 | `git show origin/main:src/integrations/traccar/traccar-ingestion.service.ts ¦ sed -n '231,262p'`; `…traccar-ingestion.repository.ts ¦ sed -n '81,88p;105,122p'` |
| **P-5** | O índice global do recibo é **por kind**: `(instance_key, message_kind, external_event_key)` → um `position` K em B e um `position_sample` K em A **não colidem** | `git show origin/main:prisma/migrations/20260874000000_traccar_ingestion_foundation/migration.sql ¦ sed -n '103,104p'` |
| **P-6** | `insertReceipt` usa `ON CONFLICT … DO NOTHING RETURNING id` e devolve `undefined` sem lançar — o **mesmo** idioma que a v2 dá a `insertSample`; logo "0 linhas" nunca é exceção, e um `catch` não o vê | repository l.112-122 |
| **P-7** | `quarantined(reason)` do 01 é **uma closure única** no `phaseTwoSteps` (l.205-208) chamada nos passos 1, 3 e 5; `binding` só existe depois do passo 2 (l.216-224) | service l.205-241 |
| **P-8** | `traccar_quarantine_items` é **global**: sem `tenant_id`, sem RLS; episódio único por `(instance_key, external_device_key, reason) WHERE resolved_at IS NULL`; o CHECK de `reason` tem os 10 motivos | migração 01 l.127-160 |
| **P-9** | **Precedente de SAVEPOINT** (`identity-resolver.ts:49-77`): o `catch` faz `ROLLBACK TO SAVEPOINT` e **relê**; "se o par não existe, devolve null e o chamador segue **fail-closed**" — não registra-e-segue. `checklist-prisma.repository.ts:458-463`: "Prisma não cria savepoint por query em tx interativa"; `ON CONFLICT DO NOTHING` "NÃO erra, então a transação continua VÁLIDA" | `git show origin/main:src/modules/auth/services/identity-resolver.ts ¦ sed -n '48,80p'`; `git grep -n -i savepoint origin/main -- src` |
| **P-10** | `TraccarIngestionServiceOptions` já tem costuras de teste: `hooks?`, `now?`, `budgets?` (l.84-94); `errorCode(error)` devolve `code` **ou** `name` **ou** `"unknown_error"` (l.102-109); o `catch` externo do `ingest` loga só o `code` e responde `unavailable/database` (l.165-171) | service l.72-110, 130-172 |
| **P-11** | **Listas de limpeza:** `idempotency` l.81, `resolution-race` l.89, `quarantine` l.73 = **uma linha** (`for (const table of ["traccar_ingress_receipts", …]) {`); `position-ingestion` l.101-109 = multilinha (uma tabela por linha); `binding-uniqueness` l.48 = `DELETE FROM traccar_ingress_receipts …` em instrução própria | `git show origin/main:tests/traccar-<x>-db.test.ts ¦ grep -n -E 'for \(const table of¦DELETE FROM'` |
| **P-12** | Os 5 arnês são **byte a byte idênticos** entre `c1485c94` (merge do 01) e `bf83cda8` → a régua de §3 pode usar `c1485c94` como base | `git diff --stat c1485c94 bf83cda8 -- <os 5>` → vazio |
| **P-13** | **A agulha do H7 hoje só existe em `docs/deployment.md:649-650`** (fora da varredura); `auth_login_candidates` aparece em `src/**` só como `FROM public.auth_login_candidates(` (uso) e em testes como nome | `git grep -n 'GRANT EXECUTE ON FUNCTION public.auth_login_candidates' origin/main -- . ':!agent-orchestration'` → 2 linhas, ambas `docs/deployment.md` |
| **P-14** | **`tests/db-catalog-write-guard.test.ts` varre `tests/**` inteiro** (`walkTestFiles(TESTS_ROOT)`, recursivo, todo `.ts`), conta `\bGRANT\b` (e `REVOKE`, `CREATE/DROP/ALTER ROLE`, `OWNER TO`) **por arquivo**, e **arquivo fora da `FROZEN_ALLOWLIST` com contagem > 0 é vermelho** (l.34, l.150-230). `auth-invariant-guards.test.ts` está lá com `count: 3` ("fala SOBRE GRANT … não escreve catálogo"). Hoje **nenhum** `tests/traccar-*` tem o token | `git show origin/main:tests/db-catalog-write-guard.test.ts ¦ sed -n '150,230p'`; laço `grep -c -E '\bGRANT\b'` sobre `tests/traccar-*` → 0 em todos |
| **P-15** | Guard 8 (`auth-invariant-guards.test.ts:186-190`) varre **só** `prisma/migrations/**` (`migrationFiles`) — não conta a si mesmo porque não lê `tests/`; é o modelo da auto-exclusão | `… ¦ sed -n '184,190p'` |
| **P-16** | `traccar-dev-topology.test.ts` lê arquivos por caminho absoluto a partir de `ROOT = path.resolve(dirname(import.meta.url), "..")` (l.16-21) e já tem `readdirSync`/`statSync` importados — o H7 nasce nesse molde | `… ¦ sed -n '1,21p'` |
| **P-17** | `withTenantRlsBudget` põe `lock_timeout` (1 000 ms) e `statement_timeout` (1 500 ms) **locais** na transação (`rls.ts:107-108,126-129`) → `55P03`/`57014` são erros **possíveis** dentro do savepoint da amostra | `git show origin/main:src/database/rls.ts ¦ sed -n '100,135p'` |
| **P-18** | O cliente da ingestão é `PrismaClient` + `@prisma/adapter-pg` próprio (`traccar-db.ts:22-33`) — o "caminho de produção" do F9′ é `$queryRaw` com template **por esse adaptador**, sob o papel efêmero | `git show origin/main:src/integrations/traccar/traccar-db.ts` |

---
## 1. R2-A1 — `fix_key`/§Q1: o I5 impossível e as duas propriedades falsas (l.1042-1047)

### 1.1 O achado, re-medido (confirmo os três pontos)

- **(a) I5 impossível.** A v2 (l.1097-1098) semeia um recibo **`'position'`** K em B e espera 0 amostra em A. Pela v2 §Q1.3 (l.1056-1060), o caminho
  da amostra só conflita com recibo **`'position_sample'`**; e o passo 4 do 01 só procura `'position'` **sob o GUC de A** (P-4), onde o recibo
  de B é invisível. Logo A passa pelos passos 1-4, cai no 5 (sem despacho), grava `position_sample` K (kind diferente → sem conflito no
  índice global, P-5) e grava a amostra. **I5 ficaria vermelho contra o próprio plano.** E, se o teste desse operador a A, cairia no
  passo 6, onde amostra nenhuma nasce — passaria por vacuidade. Pior: a `SAMPLE_ON_QUARANTINE_REASONS` da v2 é consultada **só no passo 5**
  (l.1054, `NO_OPERATOR_REASON[operator.kind] ∈ …`), então a mutação **M-Q1-01** ("a constante ganha `fix_before_active_binding`") **não
  mudaria nada** — `operator.kind` só produz os 3 motivos de operador. A mutação da v2 não morde o teste que ela nomeia.
- **(b) "Recibo `position_sample` sem amostra é impossível" (l.1046) é falso.** `insertSample … ON CONFLICT (fix_key) … DO NOTHING` devolve 0
  linhas **sem lançar** (o mesmo idioma de `insertReceipt`, P-6); o `RELEASE` acontece e o recibo fica órfão. Na reentrega, o §Q1.3 lê
  "existing ∧ digest igual → nada (amostra já existe)" — e a amostra não existe.
- **(c) "A mesma classe de desfecho cross-tenant do 01 (`owned_elsewhere`)" (l.1042-1043) é falso.** No 01 a chave alheia é **visível**:
  409 + linha de quarentena. No `fix_key` global da v2 o conflito é **silencioso**: no caminho aceito a posição de A vira `stored` (204)
  e a amostra de A some.

**Raiz comum:** a v2 deu à amostra uma identidade **global** (`fix_key` sem `tenant_id`) "como o índice do recibo", mas o índice do recibo é
global **por kind** — e o recibo da amostra é de **outro kind**. A premissa "mesma classe" não se sustenta: o índice do recibo nunca
detecta `position` K em B × `position_sample` K em A, e o `fix_key` global detecta isso só quando os dois lados têm atributos, e em
silêncio. Ou se fecha o caso por inteiro (índice único do recibo **entre** os dois kinds de posição — exige ensinar os passos 4 e 6 do 01 a
"promover" um `position_sample` a `position`, uma mudança do 01 que esta emenda **não** faz), ou se declara o caso e se tira o silêncio.
Esta emenda faz o segundo, e **nomeia o primeiro como pendência com dono** (§1.8).

### 1.2 O que muda na v2 (por §/linha)

| Onde na v2 | Sai | Entra |
|---|---|---|
| §Q1.2 l.1038-1043 (identidade da amostra) | índice único parcial **`(fix_key) WHERE kind='sample'`**, "Global (sem `tenant_id`), como o índice do recibo — a mesma classe de desfecho cross-tenant do 01" | índice único parcial **`(tenant_id, fix_key) WHERE kind='sample'`** (R1-1); a frase "mesma classe de desfecho" **sai**; o caso cross-tenant entre kinds é **declarado** (I8) e vira pendência (§1.8) |
| §Q1.2 l.1044-1047 (atomicidade) | "Um recibo `position_sample` sem amostra é impossível (os dois caem juntos)" | "…é impossível **por código**: 0 linhas no INSERT da amostra desfaz o recibo pelo savepoint (R1-3); I9 prova" |
| §Q1.3 l.1051-1065 (passo 5) | "uma chamada condicional no passo 5"; `NO_OPERATOR_REASON[operator.kind] ∈ SAMPLE_ON_QUARANTINE_REASONS` | o gate vive **na closure `quarantined(reason)`** (único ponto; R1-4); pseudo-código em §1.4 |
| §Q1.5 I5 (l.1096-1098) | `idempotency_key_owned_elsewhere` com "recibo `position` da mesma chave semeado em B" | o 7º caso semeia recibo **`position_sample`** K em B → **409** + 1 linha `idempotency_key_owned_elsewhere`; o antigo arranjo vira **I8** |
| §6.1 migração A l.429; `schema.prisma` l.340; §Q1.7 (lista do NÃO pré-merge) | `("fix_key") WHERE "kind" = 'sample'` | `("tenant_id", "fix_key") WHERE "kind" = 'sample'`; o `ON CONFLICT` de `insertSample` passa a `(tenant_id, fix_key) WHERE kind = 'sample'`; §Q1.7 continua removendo a coluna/índice/CHECK se o NÃO vier **antes** do merge |
| §6.6 (`vehicle-telemetry.repository.ts`) | `insertSample(tx, …)` sem valor de retorno declarado | `insertSample(tx, …): Promise<string ¦ undefined>` (`RETURNING id`; `undefined` = 0 linhas) |
| §Q1.5 M-Q1-04 | mutação própria (`ROLLBACK TO SAVEPOINT sample_without_operator` → `throw`) | **subsumida por M-E32**: há **um** savepoint (`vehicle_sample`) e **um** helper para os dois caminhos (§4, R4-1); a v2 já previa "M-E32 → F10 [+ I7 sob Q1]" |
| §9.3 / §Q1.7 contagens | 7 testes e 6 mutações sob Q1 | **13** testes (I1-I7 + I6″, I8, I9, I10, I11, I12) e **8** mutações (M-Q1-01, 02′, 03, 05, 06, 07, 08, 09; a 04 subsumida) |

### 1.3 Requisitos (texto normativo)

- **R1-1 — Identidade da amostra é por organização.** O índice único parcial é `vehicle_telemetry_events_sample_fix_key ON
  ("tenant_id", "fix_key") WHERE "kind" = 'sample'`, e `insertSample` usa `ON CONFLICT ("tenant_id", "fix_key") WHERE "kind" = 'sample' DO
  NOTHING RETURNING id`. "Um fix → uma amostra" é propriedade do banco **dentro da organização** — por qualquer caminho (posição aceita,
  quarentena por operador, reconciliação do B-TRC-03) e sob corrida (I6, I6′, I6″). **Nenhuma** unicidade de amostra entre organizações é
  prometida: a linha fica atrás de `FORCE RLS` como as demais, e o conflito só pode ser com linha **visível** (mesma organização), o que
  elimina por construção o "0 linhas invisível".
- **R1-2 — O `owned_elsewhere` da amostra é o do recibo, e é visível.** No caminho de §Q1.3, `insertReceipt('position_sample')` sem id →
  `findReceipt(command, 'position_sample')` → ausente → `recordQuarantine(command, 'idempotency_key_owned_elsewhere')` → `conflict
  owned_elsewhere` (**409**, como o passo 6 do 01), **0** recibo e **0** amostra em A. É o **único** caso `owned_elsewhere` do caminho da
  amostra, e é ele que I5 exercita (R1-5).
- **R1-3 — Recibo `position_sample` órfão é impossível por código.** Se `insertSample` devolver `undefined` dentro do savepoint do caminho de
  quarentena, o serviço **desfaz o savepoint** (`ROLLBACK TO SAVEPOINT vehicle_sample`, que remove o recibo recém-inserido), grava **uma**
  linha de log `{outcome:"sample_skipped", reason:"fix_already_sampled"}` (sem `fix_key`, sem valor de atributo) e **segue** para
  `recordQuarantine(reason)` → 202. Esse estado é impossível por construção hoje (dentro da organização, uma amostra K só existe com um
  recibo K visível de um dos dois kinds, e ambos curto-circuitam antes — passo 4 e o conflito do recibo); o ramo existe para a reconciliação
  do B-TRC-03 e para que a propriedade não dependa de "hoje". No caminho **aceito** (passo 7), `undefined` significa "a amostra é a da 1ª
  gravação" (mesma organização, por R1-1): log `sample_skipped` em `info`, a posição segue `stored` (I6″).
- **R1-4 — Um único gate para "amostra em quarentena".** A closure `quarantined(reason)` do `phaseTwoSteps` (P-7) é o **único** lugar que
  decide gravar amostra sem operador: `if (binding && command.telemetry && this.sampleOnQuarantineReasons.has(reason))` →
  `sampleWithoutOperator(ports, tenantId, binding, command)`; `binding` é a variável atribuída após o passo 2 (antes dele é `undefined` →
  nenhuma amostra, por tipo). `sampleOnQuarantineReasons` é `this.options.sampleOnQuarantineReasons ?? SAMPLE_ON_QUARANTINE_REASONS`
  (costura de serviço, ao lado de `hooks`/`now`/`budgets` — P-10; `createTraccarIngestAppFromEnv` **não** a passa: sem variável nova).
  Consequência: a constante é consultada em **todo** motivo de quarentena pós-vínculo (passos 3 e 5), e M-Q1-01 passa a morder.
- **R1-5 — I5 só contém casos alcançáveis**, cada um com `attributes` cheios e **sem** operador em A, e cada um com o código HTTP e a linha de
  quarentena esperados (tabela em §1.6). O caso cross-tenant **entre kinds** (`position` K em B) sai de I5 e vira **I8**, que **pina** o
  desfecho atual como declarado.

### 1.4 Desenho corrigido — o passo 5 e a closure (substitui a v2 §Q1.3 l.1051-1065)

```
phaseTwoSteps(ports, tenantId, command):
  let binding: BindingRow | undefined                      // atribuída após o passo 2
  quarantined = async (reason) => {
    [Q1=SIM] if (binding && command.telemetry && this.sampleOnQuarantineReasons.has(reason)) {     // R1-4 — único gate
       diverted = await this.sampleWithoutOperator(ports, tenantId, binding, command)
       if (diverted) return diverted                        // só owned_elsewhere (409), R1-2
    }
    await repository.recordQuarantine(command, reason)
    return confirmed(quarantined(reason))                   // 202, inalterado
  }
  1. tenant ativo        → senão quarantined('tenant_inactive')          // binding undefined → nunca amostra
  2. lockActiveBinding   → binding = …                                   // hook afterBindingLocked (E4/I6′ reusam)
  3. janela do fix       → senão quarantined(fixReason | 'fix_before_active_binding')   // gate consulta a constante: não está → 0 amostra
  4. findReceipt 'position' → duplicate 204 | digest ≠ 409
  5. operatorAt          → se ≠ single: quarantined(NO_OPERATOR_REASON[kind])         // está na constante → amostra
  6-7. como no 01 (+ amostra em savepoint no 7, §4)

sampleWithoutOperator(ports, tenantId, binding, command):            // UM helper de savepoint (§4 R4-1), nome `vehicle_sample`
  return withSampleSavepoint(tx, logger, async () => {
    receiptId = await repository.insertReceipt({ …, messageKind: 'position_sample', locationId: null })
    if (!receiptId) {
      existing = await repository.findReceipt(command, 'position_sample')
      if (!existing)  { await repository.recordQuarantine(command, 'idempotency_key_owned_elsewhere');
                        return { kind: 'divert', outcome: conflict('owned_elsewhere') } }        // R1-2 → 409
      if (existing.payloadDigest !== command.payloadDigest) await repository.markConflict(existing.id)
      return { kind: 'noop' }                                       // amostra já existe (I2/I3); recibo não é órfão por R1-3/I9
    }
    sampleId = await repository.insertSample(tx, { receiptId, fixKey: command.externalEventKey, …telemetry })
    if (!sampleId) return { kind: 'skip', reason: 'fix_already_sampled' }                       // R1-3: o helper desfaz o recibo
    return { kind: 'inserted' }
  })
```
O helper `withSampleSavepoint` (§4 R4-1): `SAVEPOINT vehicle_sample` → `work()` → `inserted`/`noop`/`divert` ⇒ `RELEASE`; `skip` ⇒
`ROLLBACK TO SAVEPOINT vehicle_sample` + log `sample_skipped`; exceção ⇒ `ROLLBACK TO` + classificação por SQLSTATE (§4 R4-2).

### 1.5 Alternativa considerada e por que não

| Alternativa | Por que não |
|---|---|
| **G — manter o `fix_key` global e tornar a colisão visível:** 0 linhas + linha invisível sob o GUC → 409 `owned_elsewhere` + quarentena, nos dois caminhos | no caminho **aceito**, o recibo e a localização já estão na transação; "nada gravado" exigiria lançar um erro tipado através do `withTenantRlsBudget` e gravar a quarentena em transação própria — um mecanismo novo no 01 — e recusaria a posição de A, que tem vínculo **e** operador confirmados, por causa de uma amostra. E continuaria **parcial**: só detecta quando os dois lados têm atributos. Custo alto, propriedade fraca |
| **Índice único do recibo entre os dois kinds de posição** (`(instance_key, external_event_key) WHERE message_kind IN ('position','position_sample')`) | é o fechamento **correto** do caso, mas exige que os passos 4 e 6 do 01 leiam os dois kinds e **promovam** um `position_sample` próprio a `position` (UPDATE de `message_kind` + `location_id`) — mudança do 01 fora do que a v2 §6.6 lista como "não muda". Vai para o B-TRC-03 como pendência com teste de encerramento (§1.8) |
| **T — índice por organização (esta emenda)** | uma linha na migração; nenhum mecanismo novo; "um fix → uma amostra" fica onde tem sentido (dentro da organização, por qualquer caminho); o 0-linhas-invisível desaparece por construção; o caso entre kinds é **declarado** (I8) em vez de silencioso |

### 1.6 Testes (suíte I, `tests/traccar-event-sample-quarantine-db.test.ts`, mesmo arnês de F; [Q1=SIM])

| Teste | Arranjo | Asserção |
|---|---|---|
| **I5** (reescrito) — "nos 7 motivos sem amostra, nada é gravado em organização nenhuma" | cada caso com `attributes` cheios e A **sem** despacho: (1) `unmapped_device`; (2) `tenant_inactive`; (3) `fix_before_active_binding` (fix 1 min antes de `valid_from`); (4) `fix_in_future` (agora + 6 min); (5) `invalid_fix` (`valid:false`); (6) `resolution_budget_exceeded` (`maxTenants: 1`, 2 organizações); (7) **`idempotency_key_owned_elsewhere`: recibo `position_sample` K semeado em B** (mesma `instance_key`/`external_event_key`) | (1)-(6): **202**, 1 linha de quarentena com o motivo, 0 recibo de qualquer kind, 0 amostra, A e B `0/0/0`; (7): **409** `traccar_idempotency_conflict`, 1 linha `idempotency_key_owned_elsewhere`, A `0/0/0`, B inalterado (1 recibo `position_sample`, 0 amostra) |
| **I6″** (novo) — "quarentena primeiro, aceita depois: a amostra é a da 1ª gravação" | I1 (sem despacho → `position_sample` K + amostra K); depois `assignVehicle`/despacho cobrindo o instante do fix (arnês do 01); reentrega **idêntica** | **204** `stored`; 1 localização; 1 recibo `position` K **e** 1 recibo `position_sample` K; **1** amostra (`fix_key` K, `receipt_id` = o `position_sample`); 1 linha de log `sample_skipped`/`fix_already_sampled` |
| **I8** (novo) — "fix contestado entre kinds: declarado, não silencioso" | B: recibo `position` K + localização + amostra K semeados (sob GUC de B); A: vínculo do mesmo dispositivo, **sem** despacho; entrega K a A com `attributes` | **202** `no_operator_at_fix_time`; A: 1 `position_sample` K, **1** amostra K; B: inalterado (1/1/1); 0 linhas de log `sample_skipped`; comentário no teste aponta `P-TRC02-FIX-CONTESTADO-ENTRE-KINDS` |
| **I9** (novo) — "0 linhas na amostra desfaz o recibo: órfão impossível" | estado forçado (impossível hoje): amostra com `fix_key` K semeada em A pendurada num recibo `position` K′ (outra chave); entrega K a A sem despacho e com `attributes` | **202**; 1 linha de quarentena; **0** recibo `position_sample`; total de amostras em A = **1** (a semeada); 1 linha `sample_skipped`/`fix_already_sampled` |
| **I12** (novo) — "o índice da amostra é por organização" | catálogo | `pg_indexes.indexdef` de `vehicle_telemetry_events_sample_fix_key` contém `(tenant_id, fix_key)` e `WHERE (kind = 'sample'::text)`; `indisunique = true` |

I10 e I11 estão em §2 e §4. I1-I4, I6, I6′, I7 da v2 continuam como estão (I7 ganha a asserção de §4).

### 1.7 Mutações

| ID | Edição (`file` → `find` ⇒ `replace`) | Teste vermelho | Nota |
|---|---|---|---|
| **M-Q1-01** (mantida; agora morde) | `traccar-ingestion.service.ts`: `new Set(["no_operator_at_fix_time", "ambiguous_operator_at_fix_time", "operator_history_ambiguous"])` ⇒ idem + `, "fix_before_active_binding"` | I5 caso (3): 1 amostra onde se espera 0 | só morde porque o gate está na closure (R1-4) |
| **M-Q1-02′** (re-especificada) | `this.sampleOnQuarantineReasons.has(reason)` ⇒ `true` | I5 casos (3) e (4) (binding existe → amostra) | substitui "a chamada sobe para antes do passo 3" |
| **M-Q1-07** (nova) | helper de savepoint, ramo `skip`: `await tx.$executeRaw\`ROLLBACK TO SAVEPOINT vehicle_sample\`; // skip: desfaz o recibo` ⇒ `await tx.$executeRaw\`RELEASE SAVEPOINT vehicle_sample\`; // skip: desfaz o recibo` | I9 (1 recibo `position_sample` órfão) | âncora única pelo comentário (o ramo de erro tem outro comentário — §4) |
| **M-Q1-09** (nova; `migration: true`) | migração A: `ON "vehicle_telemetry_events"("tenant_id", "fix_key") WHERE "kind" = 'sample'` ⇒ `ON "vehicle_telemetry_events"("fix_key") WHERE "kind" = 'sample'` — **e** `insertSample`: `ON CONFLICT ("tenant_id", "fix_key")` ⇒ `ON CONFLICT ("fix_key")` (as duas, para o `ON CONFLICT` inferir o índice) | I12 (catálogo) **e** I8 (A fica com 0 amostra: o índice global colide com a de B e o `skip` desfaz o recibo) | prova que o desfecho de I8 depende do escopo do índice |
| M-Q1-04 | — | — | **subsumida por M-E32** (um savepoint, um helper): M-E32 deixa F10 **e** I7 vermelhos, como a v2 já previa |

### 1.8 Pendência nova e registro

- **`P-TRC02-FIX-CONTESTADO-ENTRE-KINDS`** (dono: **B-TRC-03**, que mexe em vínculos e reconciliação). O que é: o índice global do recibo é
  por kind; um fix K pode ter recibo `position` em B e recibo `position_sample` (+ amostra) em A quando o vínculo troca de organização
  dentro da janela de +5 min (classe `pre-existente` do 01, declarada pela crítica r2). O B-TRC-02 **declara** (I8) e não detecta. Teste de
  encerramento: índice único do recibo sobre `(instance_key, external_event_key)` para os dois kinds de posição, com os passos 4 e 6
  lendo os dois kinds e promovendo `position_sample` → `position` na mesma organização — ou decisão registrada de que a reconciliação
  resolve o caso, com teste.
- **Texto a acrescentar em `D-TRC02-Q1-AMOSTRA-SEM-OPERADOR`** (v2 §Q1.6), uma frase: "A identidade da amostra (`fix_key`) é **por
  organização**; o fix contestado entre organizações por kinds diferentes fica declarado em `P-TRC02-FIX-CONTESTADO-ENTRE-KINDS`."
- **`API_CONTRACTS.md` §2.1-bis (nota de §Q1.4):** inalterada — "chave de outra organização → 409" continua verdadeira para o recibo da
  amostra (R1-2), que é o único caso que o contrato promete.

---
## 2. R2-A2 — Q1 respondida SIM; o que acontece se o dono REVERTER depois do merge

### 2.1 O achado mudou de natureza — e o que sobra dele

A crítica atacou duas coisas: **(i)** o gate 7 da v2 (l.672) manda implementar §Q1 com "SIM **(ou silêncio)**" enquanto a Q1 estava
**devolvida** ao dono com o contexto da decisão 4 e da `P-TRC-LGPD` (l.1011-1015) — o silêncio implementaria o caminho que reduz
privacidade; **(ii)** o "removível" de §Q1.7 só vale **antes** da migração, e a v2 não diz o que custa um NÃO **depois** do merge
(`DROP COLUMN`, `DROP INDEX`, re-estreitar CHECK, apagar recibos `position_sample` e amostras = migração destrutiva + apagamento de dado,
família do §C7.5).

**Medido (P-2):** a resposta do dono está na ref (`D-TRC02-RESPOSTAS`, `decisoes.md:3783-3784`, 2026-10-19) e **não há** entrada
`D-TRC02-Q1-*` posterior. Logo **não há silêncio a interpretar**: a Q1 vale SIM por registro, e (i) se resolve apagando a brecha do gate.
O que sobra é (ii): o custo de uma **reversão depois do merge** — e esse custo esta emenda fixa **antes do código**, para que o desenho
já nasça com a reversão **aditiva**.

### 2.2 O que muda na v2

| Onde na v2 | Sai | Entra |
|---|---|---|
| §8 gate 7 (l.672) | "SIM (ou silêncio) → implementa §Q1" | "`D-TRC02-RESPOSTAS` Q1 = SIM na ref **e nenhuma** `D-TRC02-Q1-NAO*` posterior → implementa §Q1 + esta emenda; **`D-TRC02-Q1-NAO` presente → §Q1.7 antes da migração**; **qualquer outro estado (entrada ambígua, pergunta reaberta sem resposta) → PARA e pergunta** — silêncio nunca decide" |
| §Q1 cabeçalho (l.1011-1015) | "O dono pode mudar a Q1 para NÃO … escrita para as duas respostas" | mantém-se, com o adendo: "**§Q1.7 é o caminho do NÃO só até o merge.** Depois do merge, o NÃO segue §2 desta emenda (aditivo); §Q1.7 fica proibido" |
| §11 risco "O dono muda a Q1 para NÃO depois do código" (l.968) | mitigação "§Q1.7 é a lista de remoção" | "antes do merge: §Q1.7; **depois do merge: R2-2..R2-4** (uma linha de código, schema e dados intocados); expurgo só por parada §C7.5" |
| §Q1.7 (l.1120) título | "o dev aplica antes de escrever a migração" | "…**e só vale enquanto a migração A não foi aplicada em base alguma com dado real**; depois do merge, ver emenda §2" |

### 2.3 Requisitos (texto normativo)

- **R2-1 — Silêncio nunca decide a Q1.** O gate 7 reescrito acima. O inspetor (item vi da v2 §10) confere a variante contra o `decisoes.md`
  do head **e** a ausência de `D-TRC02-Q1-NAO*`; estado ambíguo = junta não começa.
- **R2-2 — Reversão pós-merge é ADITIVA: uma linha de código, zero DDL, zero DELETE.** Se o dono reverter a Q1 depois do merge, o caminho é
  `D-TRC02-Q1-NAO-POS-MERGE` (texto em §2.5): em bloco próprio (junta de segurança, §C7 item 8(1)), o valor padrão de
  `SAMPLE_ON_QUARANTINE_REASONS` passa a `new Set([])` — e **nada mais**: nenhuma amostra nova sem operador nasce (R1-4 garante que esse é o
  único gate). A coluna `fix_key`, o índice `(tenant_id, fix_key)`, o CHECK `fix_key_check` e o literal `'position_sample'` no CHECK do
  recibo **ficam**: continuam em uso pelo caminho aceito (um fix → uma amostra entre forward e reconciliação) e pelos recibos já gravados.
  Os recibos `position_sample` e as amostras já existentes **ficam** (fato imutável; "guardar ≠ exibir" continua regido por
  `P-TRC02-LGPD-TELEMETRIA-SEM-DESPACHO`).
- **R2-3 — Expurgo de dado já gravado é parada §C7.5, nunca efeito colateral da reversão.** `DELETE` de recibos `position_sample`/amostras,
  `DROP COLUMN fix_key`, `DROP INDEX … sample_fix_key` ou re-estreitar o CHECK do recibo com dado presente são **migração destrutiva /
  apagamento de dado**: só por decisão explícita e nomeada do dono, em bloco próprio, junta **unânime de 5** (§C7.1), nunca dentro do
  bloco da reversão. O rollback SQL da migração A (v2 §6.1, "só em ambiente SEM dado real") **não** é instrumento de reversão da Q1.
- **R2-4 — O desenho sob SIM e sob NÃO-pós-merge difere em UMA constante.** Por isso R1-4 exige o gate único e a costura
  `sampleOnQuarantineReasons` no serviço: a reversão é **testável hoje** (I10), não uma promessa.
- **R2-5 — O NÃO antes do merge continua sendo §Q1.7** (lista exata da v2, com a correção de R1-1 no nome do índice). Os dois caminhos
  ficam escritos; qual vale é função de **quando** a reversão chega, e o gate 7 reescrito diz como se lê.

### 2.4 Teste e mutação

| Teste | Arranjo | Asserção |
|---|---|---|
| **I10** (novo, suíte I) — "a reversão da Q1 é uma constante: com o conjunto vazio, o sistema é Q1 = NÃO e o schema continua em uso" | serviço construído com `sampleOnQuarantineReasons: new Set()` (tudo o mais igual a I1); (a) o cenário de I1 (sem despacho, `attributes` cheios); (b) o cenário de F1 (com despacho, `attributes` cheios); (c) o cenário de I6 (amostra com o mesmo `fix_key` pelo repositório) | (a) **202** `no_operator_at_fix_time`, **0** recibo `position_sample`, **0** amostra, 1 linha de quarentena; (b) **204**, 1 amostra com `fix_key` = chave da posição (o índice continua servindo o caminho aceito); (c) 0 linhas inseridas, total 1 (um fix → uma amostra **ainda** vale) |

| Mutação | Edição | Vermelho |
|---|---|---|
| **M-Q1-08** (nova) | `traccar-ingestion.service.ts`: `this.options.sampleOnQuarantineReasons ?? SAMPLE_ON_QUARANTINE_REASONS` ⇒ `SAMPLE_ON_QUARANTINE_REASONS` | I10(a): 1 amostra e 1 `position_sample` onde se espera 0 — prova que a costura é **o** gate, e que a reversão não depende de mais nada |

### 2.5 Registro (o orquestrador grava; só o primeiro agora)

- **Agora, em `D-TRC02-Q1-AMOSTRA-SEM-OPERADOR`** (v2 §Q1.6), acrescentar: "**Reversão depois do merge** = `D-TRC02-Q1-NAO-POS-MERGE`: o
  conjunto `SAMPLE_ON_QUARANTINE_REASONS` vira vazio em bloco próprio com junta de segurança; schema e dados ficam; expurgo de amostras já
  gravadas só por decisão explícita do dono sob §C7.5 (junta unânime de 5). O NÃO **antes** do merge segue §Q1.7."
- **Só se acontecer:** `D-TRC02-Q1-NAO-POS-MERGE` com a data, o bloco que executa e a referência a R2-2/R2-3. **Nenhuma pergunta nova ao
  dono** nasce desta seção.

---
## 3. R2-A3 — as três réguas de forma (teardown é UMA linha; C-20 × H9; a agulha do H7)

### 3.1 (i) + (ii) — o teardown dos 5 arnês: régua medida, enunciado único

**O achado confere (P-11):** em `idempotency` (l.81), `resolution-race` (l.89) e `quarantine` (l.73) a lista de limpeza é **uma linha**;
inserir `"vehicle_telemetry_events", ` nela produz `+1 −1`, nunca `+1 −0`. Logo a v2 l.611 ("`+1` linha, `−0`"), l.881 ("5 linhas `+`, 0
`−`") e a cadeira (a) item 3 ("diff de exatamente 1 linha `+` cada") **não podem passar**. E C-20 ("numa linha anterior", l.706) × H9
("antes no mesmo bloco", l.752-753) são dois enunciados para uma propriedade.

**R3-1 — A régua de forma do teardown é esta tabela, por arquivo, com o comando e a saída esperada** (base `c1485c94`, idêntico a
`bf83cda8` nos 5 arquivos — P-12; `git diff` entre refs é blob a blob, EOL-neutro):

| Arquivo | `git diff --numstat c1485c94..<head> -- <arquivo>` | Régua de conteúdo (saída **vazia**) |
|---|---|---|
| `tests/traccar-idempotency-db.test.ts` | `1	1` | `diff <(git show c1485c94:<f>) <(git show <head>:<f> ¦ sed 's/"vehicle_telemetry_events", //')` |
| `tests/traccar-resolution-race-db.test.ts` | `1	1` | idem |
| `tests/traccar-quarantine-db.test.ts` | `1	1` | idem |
| `tests/traccar-position-ingestion-db.test.ts` | `1	0` | `diff <(git show c1485c94:<f>) <(git show <head>:<f> ¦ grep -v -E '^\s*"vehicle_telemetry_events",\s*$')` |
| `tests/traccar-binding-uniqueness-db.test.ts` | `1	0` | `diff <(git show c1485c94:<f>) <(git show <head>:<f> ¦ grep -v 'DELETE FROM vehicle_telemetry_events')` |
| **Total** | **5 `+`, 3 `−`** | as 5 saídas vazias = a única diferença é a entrada nova; os casos e asserções do 01 **não mudaram** |

**R3-2 — Enunciado único para C-20 e H9:** *"Em todo `tests/traccar-*-db.test.ts` cujo bloco de limpeza apague `traccar_ingress_receipts`,
a deleção de `vehicle_telemetry_events` ocorre **antes** na ordem de execução desse bloco — na mesma lista, em posição anterior, ou em
instrução anterior."* Medido por **posição no texto do bloco**, nunca por linha. A v2 l.706 e l.752-753 passam a dizer isto.

**H9 (reescrito, estático, `tests/traccar-event-topology.test.ts`):** para cada `tests/traccar-*-db.test.ts`: localizar o bloco de limpeza
(o texto entre a 1ª ocorrência de `after(` e o `});` que a fecha — o arnês do 01 tem um `after` por arquivo, P-11); **se** o bloco contém
`traccar_ingress_receipts`, asserir `bloco.indexOf("vehicle_telemetry_events") >= 0` **e** `< bloco.indexOf("traccar_ingress_receipts")`.
Controle negativo embutido: `traccar-ingest-pool-db.test.ts` não contém `traccar_ingress_receipts` no bloco → isento, e o teste assere
que **exatamente 5** arquivos entraram no predicado (lista nominal; um 6º arnês que passe a apagar recibos sem a tabela nova é vermelho,
um 6º que apague os dois na ordem certa é vermelho **por contagem** e pede atualização consciente da lista).

| Mutação | Edição | Vermelho |
|---|---|---|
| **M-E43** (mantida) | `tests/traccar-idempotency-db.test.ts`: `["vehicle_telemetry_events", "traccar_ingress_receipts",` ⇒ `["traccar_ingress_receipts",` | o `after` da suíte falha com `23503` (a fixture gera amostra) **e** H9 (índice −1) |
| **M-E49** (nova; mutação de arnês) | `tests/traccar-position-ingestion-db.test.ts`: `"vehicle_telemetry_events",\n          "traccar_ingress_receipts",` ⇒ `"traccar_ingress_receipts",\n          "vehicle_telemetry_events",` | H9 (ordem invertida: índice maior) **e** o `after` dessa suíte falha com `23503` — prova que a régua mede **ordem**, não presença |

### 3.2 (iii) — o H7 conta a si mesmo; e um guard do repositório que a v2 não viu

**O achado confere (P-13):** hoje a agulha `GRANT EXECUTE ON FUNCTION public.auth_login_candidates` só existe em `docs/deployment.md`.
Depois do bloco, existe no demo **e no arquivo do próprio H7** — lido ao pé da letra, "exatamente um arquivo" dá 2 e vermelho.

**Achado adicional, medido (P-14):** `tests/db-catalog-write-guard.test.ts` varre **`tests/**` inteiro**, conta `\bGRANT\b` por arquivo
e **reprova qualquer arquivo fora da `FROZEN_ALLOWLIST` com contagem > 0**. O arquivo do H7 carrega o token (regex, título, mensagem) →
esse guard fica **vermelho** com o código da v2 como está, e `tests/db-catalog-write-guard.test.ts` **não** está no PERMITIDO da v2 §7.1.
Dois caminhos: esconder o token (montar a agulha por partes, `"GR"+"ANT"`) — **proibido**: é fugir de um ratchet que existe para ser
visto; ou **registrar o arquivo na allowlist com a contagem medida e o motivo**, como `auth-invariant-guards.test.ts` (count 3, "fala
SOBRE GRANT … não escreve catálogo") já faz. Esta emenda manda o segundo.

**R3-3 — H7 exclui o próprio arquivo e declara o conjunto varrido.** Varre `prisma/migrations/**`, `scripts/**`, `docker-compose*.yml`,
`src/**`, `infra/**`, `.github/**` **e `tests/**`**, excluindo **só** `fileURLToPath(import.meta.url)` (o modelo é o guard 8, que não se
conta porque não lê `tests/` — P-15; aqui `tests/` é varrido de propósito, para que um `GRANT` num arnês não passe). Agulha:
`/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.auth_login_candidates/i`. Asserções: (1) o conjunto de arquivos com a agulha é **exatamente**
`["scripts/traccar-dev-demo.mjs"]`; (2) nesse arquivo a agulha ocorre **uma** vez e `indexOf("if (WITH_WEB)") < indexOf(agulha)`;
(3) a agulha ocorre dentro de um `step(` cujo nome contém `SÓ nesta demonstração`. `docs/**` e `agent-orchestration/**` ficam fora
(instrução humana e registro).

**R3-4 — `tests/db-catalog-write-guard.test.ts` entra no PERMITIDO com UMA edição:** a entrada
`["traccar-event-topology.test.ts", { count: <medido>, reason: "fala SOBRE o GRANT do demo (H7: regex + título + mensagem) — não escreve catálogo" }]`
na `FROZEN_ALLOWLIST`, com `count` = o que o próprio guard mede (`countCatalogWrites`); esperado **3**; o número vai no diff e a cadeira
(b) confere que o arquivo do H7 não tem `REVOKE`, `CREATE/DROP/ALTER ROLE` nem `OWNER TO`. Mudança de alvo **#14** (§5); a tabela §7.3 da
v2 ganha a linha; a cadeira (b) item 2 ganha o caminho no pathspec.

| Mutação | Edição | Vermelho |
|---|---|---|
| **M-E34** (mantida) | `scripts/db-runtime-role.sh` ganha o `GRANT EXECUTE … auth_login_candidates` | H7 (conjunto = 2 arquivos) |
| **M-E35** (mantida) | migração A ganha o `GRANT` | guard 8 **e** H7 |
| **M-E50** (nova; produto) | `scripts/traccar-dev-demo.mjs`: a linha `step("demo: GRANT EXECUTE em auth_login_candidates ao erp_runtime (SÓ nesta demonstração; produção = passo 5 do runbook, ato do dono)", ` ⇒ `step("demo: (passo removido pela mutação M-E50)", ` **e** o corpo do passo vira `async () => {}` | H7 (conjunto vazio: asserção (1)) — e o teste de encerramento de `P-TRC-DEMO-LOGIN-SEM-ORG-INERTE` (`login_without_org` volta a `inert_no_execute`) — prova que H7 não é vácuo |

### 3.3 O que muda na v2 (por linha)

| Onde | Sai | Entra |
|---|---|---|
| §7.2 l.611 | "`+1` linha, `−0`" | a tabela R3-1 |
| §9.1 C-20 l.706 | "numa linha anterior" | o enunciado R3-2 |
| §9.2 H9 l.752-753 | "antes no mesmo bloco de limpeza" | R3-2 + a forma de H9 (posição no bloco; lista nominal de 5) |
| §9.7 passo 4 l.881 | "= 5 linhas `+`, 0 `−`" | "numstat conforme R3-1 (5 `+`, 3 `−`) e as 5 réguas de conteúdo vazias" |
| §10 cadeira (a) item 3 | "os 5 arnês com diff de exatamente 1 linha `+` cada" | "os 5 arnês conforme R3-1 (numstat + régua de conteúdo); M-E43 **e M-E49** vermelhas" |
| §9.2 H7 l.749-751; §5.5 "Guarda H7" | "em exatamente um arquivo … zero em …" | R3-3 (auto-exclusão, `tests/**` varrido, 3 asserções) |
| §7.1 / §7.3 / §10 cadeira (b) item 2 | — | `tests/db-catalog-write-guard.test.ts` (uma entrada na allowlist, R3-4); mudança de alvo #14 |
| §9.5 catálogo | 16 novas | +M-E49, +M-E50 (ver §5) |

---
## 4. R2-A4 — o `catch` do SAVEPOINT engole qualquer erro; por qual caminho a borda aceita do F9 entra

### 4.1 O achado, re-medido (confirmo os dois pontos)

- **(i) O `catch` da v2 é mais largo que o precedente.** A v2 l.272 ("em erro (22003/23514/23503/**qualquer**)") e a forma em l.575-578
  (`catch (error)` sem filtro → `ROLLBACK TO` → `warn` → segue) transformam em `warn` + 204/202: a FK de 4 colunas que a própria v2 pôs no
  banco (`23503`, A-12), o `WITH CHECK` do RLS (`42501`), `UNIQUE (tenant_id, receipt_id)` (`23505` = duas amostras num recibo, bug), a
  contenção que `withTenantRlsBudget` torna possível (`55P03`/`57014`, P-17), `25P02` (= a H-10 caiu) e qualquer `Error` de programação.
  O único precedente do repositório (`identity-resolver.ts:49-77`, P-9) **relê e falha fechado**. Nenhum teste da v2 distingue "recusada
  por domínio" de "recusada por isolamento".
- **(ii) O F9 não diz por onde a borda aceita entra.** l.777-779: o aceito "insere sob o papel efêmero"; só o recusado é dito "direto (sem
  parser)". Se `2^53−1` em `BIGINT` ou `1 000 000` em `INTEGER` falhar **só pela tipagem do parâmetro** no caminho real (`$queryRaw` com
  template pelo `@prisma/adapter-pg`, P-18), o savepoint engole, B9/F9 seguem verdes e a amostra some na borda que o A-02 mandou provar.

### 4.2 Requisitos (texto normativo)

- **R4-1 — Um helper de savepoint para os dois caminhos, com um nome.** `withSampleSavepoint(tx, logger, work)` vive em
  `vehicle-telemetry-prisma.repository.ts` (ou no serviço — onde a v2 §6.6 já admite; o dev registra) e é o **único** emissor de
  `SAVEPOINT`/`RELEASE`/`ROLLBACK TO` fora de `identity-resolver.ts`; o nome é **`vehicle_sample`** nos dois caminhos (eles nunca se
  aninham: o de quarentena termina no passo 5 com `return`; o aceito é o passo 7). `work()` devolve `{kind:"inserted"} | {kind:"noop"} |
  {kind:"divert", outcome} | {kind:"skip", reason}` (§1.4). Consequência: **M-Q1-04 é subsumida por M-E32**.
- **R4-2 — Só o domínio é descartável; o resto falha fechado.** `SAMPLE_DISCARD_SQLSTATES: ReadonlySet<string> = new Set(["23514",
  "22003"])` (CHECK violado; valor numérico fora da faixa) é a lista **fechada** do que vira `sample_discarded` (warn com `outcome`, `code`,
  **sem** valor de atributo, sem `fix_key`). **Qualquer outro erro** — `23503`, `42501`, `23505`, `23502`, `22P02`, `55P03`, `57014`, `25P02`,
  `Error` sem SQLSTATE — recebe `ROLLBACK TO SAVEPOINT` **e é relançado**: cai no `catch` externo de `ingest` (P-10), que loga só o `code`
  (`Traccar ingestion failed before commit`) e responde **503** `unavailable/database`; a transação da fase 2 volta inteira — **nada
  gravado**, nem localização, nem recibo, nem (no caminho de §Q1) a linha de quarentena, que vem depois do savepoint. O Traccar reenvia
  a posição (S-E3 vale só para evento). A classificação usa o `errorCode()` que o serviço já tem (P-10). **Declarado:** isso é o
  "fail-closed" do precedente aplicado a uma inserção que não tem releitura útil — a amostra inválida por domínio é o **único** caso em
  que seguir é correto, porque a 1ª defesa (§6.3) já diz que ela não deveria existir.
- **R4-3 — A borda aceita entra pelo caminho de produção, e o teste olha o que saiu.** Em **F9**, cada valor aceito na borda de B9 é inserido
  por **`repo.insertSample(tx, sample)`** (o SQL de produção, `$queryRaw` com template, adaptador `pg`, papel efêmero sob o GUC) e o
  teste assere `id` devolvido **e** a releitura exata (`odometer_m::text = '9007199254740991'`, `power_mv = 1000000`, `battery_level_pct =
  100`, …); cada valor recusado é inserido por `$executeRawUnsafe` com SQL **literal** (sem parser, sem repositório) → `23514` (ou `22003`
  para `power_mv` acima de int4). **F9′** (novo) faz o mesmo pelo caminho **inteiro** (`ingest` → parser → savepoint): 204, 1 amostra com os
  valores exatos, **0** linhas `sample_discarded` no logger-espião.
- **R4-4 — Os testes de descarte provam que foi descarte, não 503.** F10 e I7 asseram, além do que a v2 já pede: a linha `sample_discarded`
  tem `code: "23514"`; **0** linhas `failed before commit`; a resposta é 204 (F10) / 202 (I7).
- **R4-5 — A costura de injeção de falha é tipada e só de teste.** `TraccarIngestionHooks.beforeSampleInsert?: (sample:
  VehicleTelemetrySampleInsert) => VehicleTelemetrySampleInsert | void | Promise<VehicleTelemetrySampleInsert | void>`, chamada pelo
  serviço dentro de `work()` imediatamente antes de `insertSample` (`const row = (await hooks.beforeSampleInsert?.(sample)) ?? sample`).
  Lançar = erro sem SQLSTATE; devolver uma amostra alterada = forçar uma violação **real** do banco pelo caminho real (F12 b).

**A forma exata (âncoras das mutações):**
```ts
const SAMPLE_DISCARD_SQLSTATES: ReadonlySet<string> = new Set(["23514", "22003"]);          // M-E46: + "23503"

async function withSampleSavepoint<T extends SampleWork>(tx, logger, work: () => Promise<T>): Promise<T | undefined> {
  await tx.$executeRaw`SAVEPOINT vehicle_sample`;
  let result: T;
  try {
    result = await work();
  } catch (error) {
    await tx.$executeRaw`ROLLBACK TO SAVEPOINT vehicle_sample`; // erro: desfaz e classifica     ← M-E32 troca a linha por `throw error;`
    if (!SAMPLE_DISCARD_SQLSTATES.has(errorCode(error))) throw error;                          // ← M-E47 remove esta linha
    logger?.warn({ outcome: "sample_discarded", code: errorCode(error) }, "Traccar ingestion discarded a vehicle sample");
    return undefined;
  }
  if (result.kind === "skip") {
    await tx.$executeRaw`ROLLBACK TO SAVEPOINT vehicle_sample`; // skip: desfaz o recibo         ← M-Q1-07 troca por RELEASE
    logger?.info({ outcome: "sample_skipped", reason: result.reason }, "Traccar ingestion skipped a vehicle sample");
    return result;
  }
  await tx.$executeRaw`RELEASE SAVEPOINT vehicle_sample`;
  return result;
}
```
As duas linhas `ROLLBACK TO` são distinguidas pelo **comentário na mesma linha**, que faz parte do `find` de cada mutação (`grep -c` = 1).
O `find` de **M-E32** passa a ser a linha inteira com `// erro: desfaz e classifica`.

### 4.3 Testes

| Teste | Arranjo | Asserção |
|---|---|---|
| **F9** (reescrito, suíte F) — "parser ⊆ banco nas bordas, pelo SQL de produção" | por coluna: aceito (`min`, `max` de B9) via `repo.insertSample(tx, …)` sob o papel efêmero; recusado (`min−1`, `max+1`) via `$executeRawUnsafe` literal | aceito: `id` devolvido + releitura exata por `::text`; recusado: `23514` (ou `22003` em `power_mv` > int4); nenhuma linha extra |
| **F9′** (novo) — "a borda aceita sobrevive ao caminho inteiro" | (a) JSON pelo parser: `odometer: 9007199254740991`, `totalDistance: 9007199254740991`, `power: 1000`, `batteryLevel: 100`, `ignition: true`, `motion: false` → `ingest`; (b) comando montado à mão com `engineHoursS: 9007199254740991n` → `ingest` | 204 `stored`; 1 amostra; `odometer_m::text`, `total_distance_m::text`, `engine_hours_s::text` = `'9007199254740991'`, `power_mv = 1000000`, `battery_level_pct = 100`; logger-espião: **0** `sample_discarded`, **0** `failed before commit` |
| **F10** (ampliado) | como na v2 (`powerMv: -1` à mão) | + `code: "23514"` na linha `sample_discarded`; 0 `failed before commit`; 204 |
| **F12** (novo) — "amostra recusada por integridade/isolamento falha FECHADO, não em silêncio" | (a) `hooks.beforeSampleInsert` lança `new Error("injected")`; (b) 2º vínculo semeado na **mesma** organização (viatura V2, outro dispositivo); `hooks.beforeSampleInsert` devolve a amostra com `bindingId` do 2º vínculo → FK de 4 colunas | (a) e (b): **503** `unavailable`; **0** localização, **0** recibo, **0** amostra; 1 linha `failed before commit` com `code` = `"Error"` (a) / `"23503"` (b); **0** `sample_discarded`; canário B `0/0/0` |
| **I7** (ampliado, [Q1=SIM]) | como na v2 (`batteryLevelPct: 101` à mão, sem despacho) | + `code: "23514"`; 0 `failed before commit`; 202; 1 linha de quarentena; 0 `position_sample` |
| **I11** (novo, [Q1=SIM]) — "no caminho da quarentena, erro não-domínio não grava nem a quarentena" | sem despacho; `hooks.beforeSampleInsert` lança `new Error("injected")` | **503**; **0** linha de quarentena; **0** `position_sample`; **0** amostra; 1 `failed before commit`; 0 `sample_discarded` |

### 4.4 Mutações

| ID | Edição (`file` → `find` ⇒ `replace`) | Vermelho |
|---|---|---|
| **M-E32** (mantida; `find` atualizado) | `await tx.$executeRaw\`ROLLBACK TO SAVEPOINT vehicle_sample\`; // erro: desfaz e classifica` ⇒ `throw error; // erro: desfaz e classifica` | F10 (503, 0 localização) **e** I7 (503, 0 quarentena) |
| **M-E46** (nova) | `new Set(["23514", "22003"])` ⇒ `new Set(["23514", "22003", "23503"])` | F12(b): 204, 1 localização, 1 recibo, 0 amostra, 1 `sample_discarded` com `23503` — a FK de isolamento virou `warn` |
| **M-E47** (nova) | `if (!SAMPLE_DISCARD_SQLSTATES.has(errorCode(error))) throw error;` ⇒ linha removida | F12(a), F12(b) **e** I11: tudo 204/202 com `warn` — o `catch` largo da v2 |
| **M-E48** (nova) | `vehicle-telemetry-prisma.repository.ts`, `insertSample`: `${sample.powerMv}` ⇒ `${sample.powerMv}::smallint` | F9′ (0 amostra; `sample_discarded` com `22003` — a borda aceita sumiu em silêncio pelo caminho real) **e** F9 (aceito: `22003` lançado pelo repositório); B9 **fica verde** (registrado: é a lacuna que (ii) descreve) |

### 4.5 O que muda na v2 (por linha)

| Onde | Sai | Entra |
|---|---|---|
| §5.3 fluxo S l.268-273 | `SAVEPOINT vehicle_sample … em erro (22003/23514/23503/qualquer): ROLLBACK TO SAVEPOINT → log warn → segue` | `withSampleSavepoint` (R4-1); "em erro **23514/22003**: ROLLBACK TO → `sample_discarded` → segue; **qualquer outro**: ROLLBACK TO → relança → 503, nada gravado" (R4-2); 0 linhas → `skip` (R1-3) |
| §5.3 "Por que savepoint e não só validação" (l.278-281) | "o savepoint é a 2ª defesa, para o que o parser não produz hoje" | + "a 2ª defesa é **só de domínio** (CHECK e faixa); o que não é domínio não é defendido — é **falha fechada**, porque amostra recusada por FK ou RLS é sinal de defeito de isolamento, e sinal de isolamento não vira `warn`" |
| §6.6 "Savepoint — a forma exata" (l.569-579) | o bloco de 9 linhas | o bloco de §4.2 desta emenda |
| §6.6 `traccar-ingestion.repository.ts` ("`hooks.beforeSampleInsert?` (só para F10/I7)") | sem assinatura | a assinatura de R4-5; usada por F12, I11 (F10/I7 não precisam dela: montam o comando à mão) |
| §Q1.2 l.1044-1045 | "Falha de qualquer um (CHECK, FK, corrida) → ROLLBACK TO SAVEPOINT → log `sample_discarded` → a quarentena é registrada normalmente → 202" | "Falha de **domínio** (23514/22003) → ROLLBACK TO → `sample_discarded` → quarentena → 202; **qualquer outra** → 503, nada gravado (R4-2; I11)" |
| §9.2 F9 l.777-779; F10 l.779-780; I7 l.1102-1103 | — | R4-3 / R4-4 |
| §9.5 M-E32 | `find` = só a instrução | `find` = instrução + comentário |
| §3.3 H-10 | "se cair, fallback = validar no serviço com o predicado do CHECK" | mantém-se; **como se vê a queda**: `25P02` é relançado por R4-2 → F10 responde 503 em vez de 204 — a hipótese cai **visivelmente** no passo 7 de §9.6 |

---
## 5. Tabela consolidada: requisitos · testes · mutações novos

### 5.1 Mudanças de alvo declaradas (v2 → v2.1; continuam a numeração da v2 §2)

| # | Alvo da v2 | Alvo da v2.1 | Achado |
|---|---|---|---|
| 13 | `fix_key` com índice único parcial **global** `(fix_key) WHERE kind='sample'`; "mesma classe de desfecho cross-tenant do 01" | índice **por organização** `(tenant_id, fix_key) WHERE kind='sample'`; o fix contestado entre kinds é declarado (I8) e vira `P-TRC02-FIX-CONTESTADO-ENTRE-KINDS` | R2-A1 |
| 14 | `tests/db-catalog-write-guard.test.ts` fora do PERMITIDO | PERMITIDO com **uma** entrada na `FROZEN_ALLOWLIST` (o arquivo do H7, contagem medida) | R2-A3(iii) + P-14 |
| 15 | gate da amostra em quarentena no passo 5, por `operator.kind` | gate **único** na closure `quarantined(reason)`, com a costura `sampleOnQuarantineReasons` no serviço (sem variável de ambiente) | R2-A1(a), R2-A2 |
| 16 | `catch` do savepoint engole "qualquer" erro | lista fechada `SAMPLE_DISCARD_SQLSTATES = {23514, 22003}`; o resto relança → 503, nada gravado | R2-A4(i) |
| 17 | dois savepoints (`vehicle_sample`, `sample_without_operator`) e duas mutações (M-E32, M-Q1-04) | **um** helper `withSampleSavepoint`, **um** nome; M-Q1-04 subsumida por M-E32 | R2-A4, R2-A1(b) |

### 5.2 Critérios novos e re-enunciados (continuam a numeração da v2 §9.1)

| # | Critério (propriedade) | Teste(s) | Mutação → vermelho |
|---|---|---|---|
| **C-26** | Só o domínio (CHECK/faixa) é descartável no savepoint; integridade, isolamento, contenção e erro de programação **falham fechado** (503, nada gravado, nem a quarentena) | F12 (a,b), I11 | M-E46 → F12(b); M-E47 → F12(a,b), I11 |
| **C-27** | A borda aceita do domínio entra pelo caminho de produção e sai igual | F9 (reescrito), F9′ | M-E48 → F9′, F9 |
| C-20 (re-enunciado) | o enunciado R3-2 (ordem no bloco de limpeza) | as 5 suítes + H9 | M-E43; **M-E49** |
| C-23 (re-enunciado) | H7 com auto-exclusão e `tests/**` varrido; allowlist do guard de catálogo com a contagem medida | H7, guard 8, `db-catalog-write-guard` | M-E34, M-E35, **M-E50** |
| C-Q1-3 (ampliado) | falha da amostra não derruba a quarentena **só** quando é de domínio; recibo `position_sample` órfão impossível por código | I7, I9, I11 | M-E32 → I7; M-Q1-07 → I9; M-E47 → I11 |
| **C-Q1-4** | identidade da amostra por organização; `owned_elsewhere` da amostra = o do recibo (409 visível); fix contestado entre kinds declarado | I5 (7 casos), I6″, I8, I12 | M-Q1-01 → I5(3); M-Q1-02′ → I5(3,4); M-Q1-09 → I12, I8 |
| **C-Q1-5** | a reversão da Q1 pós-merge é uma constante: com o conjunto vazio, Q1 = NÃO e o schema segue em uso | I10 | M-Q1-08 → I10(a) |

### 5.3 Requisito → teste → mutação (tudo o que esta emenda acrescenta)

| Req. | Teste que prende | Mutação que deixa vermelho |
|---|---|---|
| R1-1 | I12, I8, I6, I6′, I6″ | M-Q1-09 (I12, I8); M-Q1-03 (I6, I6″) |
| R1-2 | I5 caso (7) | M-Q1-05 (recibo da amostra com `'position'` → I5(7) deixa de dar 409) |
| R1-3 | I9, I6″ | M-Q1-07 |
| R1-4 | I5 (3)(4), I10 | M-Q1-01, M-Q1-02′, M-Q1-08 |
| R1-5 | I5 (7 casos alcançáveis) | M-Q1-01 |
| R2-1 | gate 7 (inspetor item vi) | — (régua de processo; sem mutação, declarado) |
| R2-2..R2-4 | I10 | M-Q1-08 |
| R2-5 | §Q1.7 (v2) | — |
| R3-1 | régua da cadeira (a) item 3 (numstat + diff de conteúdo) | M-E43 (numstat `0 0` na idempotency → régua falha) |
| R3-2 | H9 + as 5 suítes | M-E43, M-E49 |
| R3-3 | H7 | M-E34, M-E35, M-E50 |
| R3-4 | `db-catalog-write-guard` (ratchet) | M-E50 variante não se aplica; o ratchet é a guarda (contagem ≠ congelada = vermelho) |
| R4-1 | F10, I7 (um anchor para os dois) | M-E32 |
| R4-2 | F12, I11 | M-E46, M-E47 |
| R4-3 | F9, F9′ | M-E48 |
| R4-4 | F10, I7 (asserções de `code` e de ausência de 503) | M-E32 (503 aparece) |
| R4-5 | F12, I11 | M-E47 |

### 5.4 Contagens (v2 → v2.1, declaradas sem maquiagem)

| O quê | v2 | v2.1 | Diferença |
|---|---|---|---|
| Critérios | 25 (+3 Q1) | **27** (+**5** Q1) | +C-26, +C-27; +C-Q1-4, +C-Q1-5; C-Q1-3, C-20, C-23 re-enunciados |
| Testes novos previstos | 94 em 8 arquivos (+7 na suíte I = 101) | **96** (+**13** na suíte I = **109**) | F: +F9′, +F12 (11 → 13); I: +I6″, +I8, +I9, +I10, +I11, +I12 (7 → 13); I5, I7, F9, F10, H7, H9 reescritos/ampliados (não contam) |
| Mutações novas/mantidas | 43 (+6 Q1) + 17 do 01 re-executadas | **48** (+**8** Q1) + 17 | +M-E46, 47, 48, 49, 50; +M-Q1-07, 08, 09; M-Q1-02′ re-especificada; M-Q1-04 subsumida (6 − 1 + 3 = 8) |
| `backend-postgres` esperado (`fail 0`, `skipped 0`) | 431 [Q1=SIM: 438] | **433** [Q1=SIM: **446**] | o dev mede 3× e publica o número real (v2 §9.6 passo 12) |
| Linux, `tests/traccar-*.test.ts` | ≥ 226 [233] | ≥ **228** [**241**] | — |
| Baseline N / meta 2N | 149 / 298; previsto 94-101 | 149 / 298; previsto 96-109 | o déficit continua **declarado** (`P-TRC02-DEFICIT-2N`); os 52 subcasos gerados seguem autorizados |
| Migrações | 2 (A + B) | 2 | a migração A muda **uma linha** (o índice da amostra, R1-1); nenhuma migração nova |
| Variáveis de ambiente novas | 0 | 0 | a costura `sampleOnQuarantineReasons` é opção de construtor, não env |
| Caminhos PERMITIDOS | §7.1 ∪ §7.3 | + `tests/db-catalog-write-guard.test.ts` (uma entrada) | mudança de alvo #14 |
| Perguntas novas ao dono | 0 | **0** | Q1/Q2/Q3 = SIM na ref; a reversão pós-merge está desenhada (aditiva) e só se registra se acontecer |

### 5.5 O que muda para quem executa (ordem de §9.6 da v2 inalterada; só o conteúdo dos passos)

- **Passo 0 (gate):** gate 7 na forma de R2-1; o dev anota "Q1 = SIM por `decisoes.md:3783-3784`, sem `D-TRC02-Q1-NAO*`".
- **Passo 2 (topologia):** H7 na forma R3-3; H9 na forma R3-2; **a entrada da allowlist** em `db-catalog-write-guard` com a contagem medida
  pelo próprio guard (R3-4) — o guard é parte da bateria desde esse passo.
- **Passo 5 (migração):** índice `(tenant_id, fix_key)` (R1-1); **5b:** as 5 linhas conforme R3-1 (a cadeira (a) usa a tabela, não "+1/−0").
- **Passo 7 (amostra):** `withSampleSavepoint` (R4-1) com a lista fechada (R4-2); **F10 e F12 são os dois primeiros casos a passar** (H-10
  fecha por F10; R4-2 prova-se por F12); F9 pelo repositório + F9′ pelo caminho inteiro (R4-3). **7b [Q1=SIM]:** gate na closure (R1-4),
  `insertSample` devolvendo id (R1-3); I5 (7 casos), I9, I10, I11, I12, I6″, I8.
- **Passo 11 (mutações):** 48 (+8) + 17; M-E32 com o `find` novo; M-E48 registra "B9 fica verde" como M-E33 registra a guarda do 01.
- **Junta (v2 §10), itens que ganham conteúdo:** cadeira (a) item 2 + F12/F9′ e M-E46/47/48; item 3 = régua R3-1 + M-E49; cadeira (b)
  item 1 + H7 (R3-3) e a allowlist (R3-4) e M-E50; item 2 + o caminho #14 no pathspec; cadeira (c) item 2 + I5 (7 casos), I6″, I8, I9,
  I10, I11, I12 e M-Q1-07/08/09; inspetor item vi = R2-1. **Nenhum mandato passa de 3 itens.**
- **Pendências/registros (orquestrador):** + `P-TRC02-FIX-CONTESTADO-ENTRE-KINDS` (dono B-TRC-03, §1.8); frases a acrescentar em
  `D-TRC02-Q1-AMOSTRA-SEM-OPERADOR` (§1.8 e §2.5); `D-TRC02-ESCOPO` ganha o caminho #14 com a razão (P-14).

### 5.6 Registro de execução deste planejador (P1) e limpeza

| # | Comando (resumo) | Saída resumida | Para quê |
|---|---|---|---|
| 1 | esqueleto gravado **antes** de qualquer medição (`cat > …emenda-v2.1.md`, 7 seções `EM APURAÇÃO`) | 31 linhas | P1/P2 |
| 2 | `git fetch -q origin && git rev-parse origin/main`; `git log -1 --format='%h %s' origin/main` | `bf83cda8…` (#447) | §A7 |
| 3 | leitura integral: v2 (1174 l., em 4 páginas), crítica r2 (110 l.), respostas do dono (7 l.) | 4 `ajuste` R2-A1..A4; Q1/Q2/Q3 = SIM | insumos |
| 4 | `git show origin/main:src/integrations/traccar/traccar-ingestion.service.ts ¦ sed -n '1,130p;130,195p;195,300p'` | passos 1-7, `quarantined()` closure única, `NO_OPERATOR_REASON`, `errorCode`, `catch` externo, opções com `hooks/now/budgets` | P-4, P-7, P-10 |
| 5 | `…traccar-ingestion.repository.ts ¦ sed -n '75,135p'` + grep de `findReceipt¦insertReceipt¦ON CONFLICT¦hooks` | `findReceipt` fixa `'position'`; `insertReceipt` `ON CONFLICT DO NOTHING RETURNING` sem lançar | P-4, P-6 |
| 6 | `…20260874000000_traccar_ingestion_foundation/migration.sql ¦ sed -n '83,160p'` | índice global por kind; quarentena global sem `tenant_id`, 10 motivos | P-5, P-8 |
| 7 | `…identity-resolver.ts ¦ sed -n '40,90p'`; `…checklist-prisma.repository.ts ¦ sed -n '450,465p'`; `git grep -n -i savepoint origin/main -- src` | precedente relê e falha fechado; "Prisma não cria savepoint por query"; `DO NOTHING` não erra | P-9 |
| 8 | `git show origin/main:tests/traccar-{idempotency,resolution-race,quarantine,position-ingestion,binding-uniqueness}-db.test.ts ¦ grep -n -E 'for \(const table of¦DELETE FROM'` | 3 listas de uma linha; 1 multilinha; 1 instrução própria | P-11 |
| 9 | `git diff --stat c1485c94 bf83cda8 -- <os 5 arnês>` | vazio | P-12 |
| 10 | `git grep -n 'GRANT EXECUTE ON FUNCTION public.auth_login_candidates' origin/main -- . ':!agent-orchestration'`; `git grep -n auth_login_candidates origin/main -- prisma scripts docker-compose*.yml src tests .github infra` | só `docs/deployment.md:649-650`; nenhum `GRANT` fora de docs | P-13 |
| 11 | `git show origin/main:tests/db-catalog-write-guard.test.ts ¦ sed -n '1,55p;75,118p;150,230p'` + laço `grep -c -E '\bGRANT\b'` sobre `tests/traccar-*` | varre `tests/**` recursivo; allowlist congelada por contagem; `auth-invariant-guards` count 3; 0 nos traccar-* | P-14 |
| 12 | `…tests/auth-invariant-guards.test.ts ¦ sed -n '170,200p'`; `…tests/traccar-dev-topology.test.ts ¦ sed -n '1,21p;205,222p'` | guard 8 só `migrationFiles`; molde de leitura por `ROOT` | P-15, P-16 |
| 13 | `…src/database/rls.ts ¦ sed -n '100,150p'`; `…traccar-db.ts` | `lock_timeout`/`statement_timeout` locais; cliente com `@prisma/adapter-pg` próprio | P-17, P-18 |
| 14 | `…decisoes.md ¦ grep -n -E 'D-TRC02-¦D-EMENDA-ANTES-DO-CODIGO'` + `sed` dos corpos | `D-TRC02-RESPOSTAS` l.3783-3786 (Q1/Q2/Q3 = SIM); `D-EMENDA-ANTES-DO-CODIGO` l.3738; nenhuma `D-TRC02-Q1-*` | P-2, P-3 |
| 15 | gravação em **13 fatias** (2,1 a 7,4 KB cada; uma tentativa de 2 fatias num comando só de ~15 KB falhou no parse do shell e foi refeita em 4 chamadas menores, sem perda) + assemblador Python no scratchpad (`assemble.py`, regravado uma vez: a primeira troca por `glob` não pegou e a montagem saiu com §1 vazia — detectado por `grep -c 'EM APURAÇÃO'` e corrigido) | arquivo final montado; `EM APURAÇÃO` = 0 | P1/P2 |

**Não executado (de propósito, pelo mandato):** nenhuma suíte, nenhum worktree, nenhum container, nenhuma porta, nenhuma edição no
repositório, nenhum commit, sem `tail -f`, nada no disco da sessão como fonte. **Limpeza:** nada a remover no repositório; no scratchpad
da sessão ficam `emenda/assemble.py` e as 13 fatias `s*.md` (insumos desta montagem, apagáveis). A entrega é
`C:/Users/AMP/erp-pausa-2026-10-03/planos/B-TRC-02-emenda-v2.1.md`; o dev copia v2 + emenda para `docs/revisoes/TRACCAR/` no PR (v2 §9.6 passo 1).

**Estado: COMPLETO** (§0-§5 e Resumo gravados; nenhuma seção `EM APURAÇÃO`).

---
## Resumo para o orquestrador

1. **Os 4 `ajuste` da r2 viraram 19 requisitos (R1-1..R1-5, R2-1..R2-5, R3-1..R3-4, R4-1..R4-5), cada um preso por teste e mutação** — exceto as réguas de processo R2-1/R2-5, declaradas sem mutação.
2. **Escopo:** +1 caminho PERMITIDO (`tests/db-catalog-write-guard.test.ts`, uma entrada na allowlist — o guard varre `tests/**` e reprovaria o arquivo do H7, o que a v2 não viu); nenhuma variável de ambiente nova; nenhuma migração nova (a migração A muda uma linha: índice da amostra por organização).
3. **Desenho que muda:** `fix_key` único **por organização** (não global); gate único da amostra em quarentena na closure `quarantined()`, com costura `sampleOnQuarantineReasons`; um helper de savepoint (`vehicle_sample`) com lista fechada de SQLSTATE descartáveis `{23514, 22003}` — o resto falha fechado (503, nada gravado); recibo `position_sample` órfão impossível por código; I5 só com casos alcançáveis.
4. **Testes novos: 8** (F9′, F12; I6″, I8, I9, I10, I11, I12) → previstos 96 sem Q1 / **109** com Q1; **mutações novas: 8** (M-E46..50; M-Q1-07..09), 1 re-especificada (M-Q1-02′), 1 subsumida (M-Q1-04 → M-E32) → 48 (+8 Q1) + 17 do 01; `backend-postgres` esperado 433 / **446**.
5. **Q1:** SIM na ref (`decisoes.md:3783-3784`), sem reversão; "ou silêncio" do gate 7 **apagado** — silêncio nunca decide. Reversão **antes** do merge = §Q1.7 da v2; **depois** do merge = aditiva (uma constante vira vazia; schema e dados ficam); expurgo de dado só por parada §C7.5 com junta unânime de 5.
6. **Nova decisão do dono: NENHUMA.** Registros para o orquestrador: `P-TRC02-FIX-CONTESTADO-ENTRE-KINDS` (dono B-TRC-03); duas frases em `D-TRC02-Q1-AMOSTRA-SEM-OPERADOR` (§1.8, §2.5); `D-TRC02-ESCOPO` ganha o caminho #14.
7. **Ref medida:** `origin/main` = `bf83cda8` (18 premissas com comando e saída em §0); a emenda não toca o repositório.
8. **Papéis:** quem planejou a emenda = `planejador-trc02-emenda-fable` (Fable, sem fallback); inelegível para dev, cadeira e crítica deste bloco, como os planejadores da v1/v2 e os críticos r1/r2.
