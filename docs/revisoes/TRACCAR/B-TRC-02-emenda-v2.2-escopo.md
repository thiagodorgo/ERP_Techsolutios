# B-TRC-02 — EMENDA v2.2 (ESCOPO) ao plano v2 + emenda v2.1: os dois pedidos do dev (T9 do censo · T14a/b do papel de runtime)

> **Papel:** `planejador-mestre` (identidade NOVA: `planejador-trc02-escopo-fable`; não escreveu a v2, a v2.1, a crítica nem o código — §C7.4-bis).
> **Modelo:** **Fable 5.1 (`claude-fable-5-1`)**, o do frontmatter (`D-PLANEJADOR-MODELO-FABLE`). **Sem fallback acionado.**
> **Natureza:** emenda de **ESCOPO** (`D-EMENDA-ANTES-DO-CODIGO`): decide, com medição, se duas linhas pedidas pelo dev entram no PERMITIDO.
> Não muda requisito, contrato, teste do bloco nem regra do Traccar. **v2 + v2.1 + esta v2.2 = plano vigente**; onde esta emenda fala, vale ela;
> onde não fala, vale a v2.1 e, abaixo, a v2. **Variante vigente: Q1 = NÃO** (decisão do dono de 19/10, repassada pelo orquestrador — ver §2 fato 14).
> **Data:** 2026-10-19. **Refs medidas (§A7):** head do dev = **`6a87c3dab4a3155de75415438e6740384e4725ae`** (`feat/traccar-b-trc-02`, worktree
> `C:/Users/AMP/w-trc02`, SÓ LEITURA); `origin/main` = **`2ecfb333aed0a0efcc1f171148473aad2921be66`** (#449). Os pedidos estão em
> `docs/revisoes/TRACCAR/B-TRC-02-dev.md` (commit `65861398`, l.285-293; no head, l.293-304 e 343).
> **Onde medi:** `git show <ref>:<caminho>`, `git grep … <ref>`, `git diff origin/main..HEAD`, `git show c1485c94` no worktree do dev — leitura só.
> **Nada executado contra banco, Docker ou portas; nada editado em repositório algum; nenhum commit; sem `tail -f`.** As mutações de §6 são
> para a cadeira (b) executar em worktree e cluster próprios (§C7.1-ter(c), §C7.1-bis) — aqui estão **previstas pelo mecanismo lido**, não executadas.
> **Regras do Traccar, intocadas:** nunca `tenant_id` do payload como contexto; dispositivo não mapeado em quarentena; vínculo ambíguo falha
> fechado; token nunca em código/log/query/frontend, comparado em tempo constante; nenhuma porta pública.
> **Gravado seção a seção (P1/P2):** esqueleto primeiro; cada seção gravada ao terminar; estado no fecho (§9).

---
## 1. Resumo para o orquestrador (≤6 linhas)

1. **Os dois pedidos são consequência necessária do bloco e não mascaram defeito — APROVADOS como emenda v2.2 de escopo.** T9 acusa a l.100 do `traccar-event.schema.ts` (`EVENT_TYPE_PATTERN.test(type)`) porque o detector do censo reage ao **nome** `type` em todo `src/**`; é validação de **formato** (A10 → 422), o despacho real é o mapa literal enumerável (T8 verde). O `118` é o nº de tabelas de `public` com DML do runtime (117 models + `_prisma_migrations`); a 119ª é `vehicle_telemetry_events`, **única** `CREATE TABLE` do diff — o mesmo movimento do B-TRC-01 (115 → 118, `c1485c94`, aceito pela junta do 01).
2. **Nenhuma das duas enfraquece a guarda:** a entrada da allowlist é arquivo + texto exato (curinga novo, outro arquivo ou entrada removida ⇒ T9 vermelho: M-S1/M-S2/M-S3); o conteúdo do regex é preso pelo contrato do bloco (M-S4), limite **declarado** e pré-existente; `dml` 120 ou 118 ⇒ T14a/b vermelho (M-S6/M-S7).
3. **Texto:** §7.1 e §7.3 ganham `tests/helpers/o6r07c-census.ts` (1 linha em `CURINGAS_ACEITOS`, numstat `1 0`) e `tests/san3-05-runtime-role-guard-db.test.ts:1016` (`118` → `119`, numstat `1 1`); `tests/o6r07c-census-guard.test.ts` e `scripts/db-runtime-role.sh` seguem PROIBIDOS; a forma `.exec(type)` fica proibida (b-S5). Linhas exatas em §5.1; réguas da cadeira (b) em §5.3; mutações em §6.
4. **Fatos a não herdar:** a CI **não rodou** no head `6a87c3da` (não empurrado, sem PR) — o vermelho é medição local do dev (`31/32`, `10/12`); `D-TRC02-Q1-NAO` ainda **não** está em `decisoes.md` da `origin/main` (ela diz "Q1 sim"): quem registra é o orquestrador.
5. **Registro:** 2 linhas em `D-TRC02-ESCOPO`, l.9/l.30 do comando do bloco, cópia desta emenda em `docs/revisoes/TRACCAR/`; abrir `P-07C-CENSO-TITULO-T9`, `P-07C-CENSO-EXEC` (dono: censo do 07c) e `P-SAN3-05-LITERAL-DML` (processo) — todas `pre-existente`, com evidência (§8).
6. **Modelo:** Fable (frontmatter), sem fallback; nada tocado no repositório; medições só por `git show`/`git grep`/`git diff` nas refs nomeadas.

---
## 2. Premissas medidas (comando → saída), head `6a87c3da` × `origin/main` `2ecfb333`

Tudo abaixo foi medido nesta rodada, no worktree do dev (`C:/Users/AMP/w-trc02`), por `git show`/`git grep`/`git diff` contra as duas refs.
Nas células, `¦` é o pipe do shell. **Nada veio do disco da sessão.**

| # | Fato | Comando → saída resumida |
|---|---|---|
| 1 | Head e refs | `git rev-parse HEAD` → `6a87c3da…`; `git branch --show-current` → `feat/traccar-b-trc-02`; `git rev-parse origin/main` → `2ecfb333…` (#449, "ci: o job backend volta a ter psql 16…") |
| 2 | **O dev NÃO tocou os arquivos do pedido** | `git diff origin/main..HEAD --stat -- tests/helpers/o6r07c-census.ts tests/o6r07c-census-guard.test.ts tests/san3-05-runtime-role-guard-db.test.ts` → **vazio** (os 3 são byte a byte os da `origin/main`; o pedido é pedido, não contorno) |
| 3 | Os pedidos, no relatório | `git show 65861398:docs/revisoes/TRACCAR/B-TRC-02-dev.md ¦ sed -n '285,293p'` → "PEDIDOS DE EMENDA DE ESCOPO … NÃO aplicados"; no head: l.293-294 (classificação por arquivo), l.302 (`:1016`: `118` → `119`), l.343 ("inalterados pela reversão" Q1 = NÃO) |
| 4 | Tabelas em `public`: models | `git show origin/main:prisma/schema.prisma ¦ grep -c '^model '` → **117**; `git show HEAD:prisma/schema.prisma ¦ grep -c '^model '` → **118** |
| 5 | Tabelas em `public`: migrations | `git grep -h -i -E '^\s*CREATE TABLE' <ref> -- 'prisma/migrations/*.sql' ¦ wc -l` → `origin/main` **117**, `HEAD` **118**; `DROP TABLE` → **0** nas duas; `CREATE … VIEW` → **0**. Com `_prisma_migrations` (criada pelo Prisma, fora das migrations): **118 → 119** |
| 6 | O que as migrations novas criam | `git diff origin/main..HEAD --name-only -- prisma/migrations` → `20260879000000_vehicle_telemetry_events/migration.sql` (A) e `20260880000000_validate_receipt_message_kind_check/migration.sql` (B); `git show HEAD:<A> ¦ grep -n -i -E '^\s*(CREATE¦ALTER¦DROP)\s'` → **UMA** `CREATE TABLE "vehicle_telemetry_events"` (l.9), 5 `CREATE (UNIQUE) INDEX` na tabela nova + 1 no recibo (l.56), 4 FKs, `ENABLE`+`FORCE ROW LEVEL SECURITY` (l.70-71), `CREATE POLICY … tenant_isolation` (l.73), troca do CHECK do recibo (l.78-79); `<B>` → só `VALIDATE CONSTRAINT` (l.3). **Nenhuma sequência, função ou view** |
| 7 | O que o 118 conta | `git show origin/main:scripts/db-runtime-role.sh ¦ sed -n '139,143p'` → a linha final do script é um `SELECT r.rolname, r.rolsuper, r.rolbypassrls, r.rolreplication, <escapa>, <posse>, <views>, (SELECT count(*) FROM pg_tables t WHERE t.schemaname = 'public' AND has_table_privilege(r.oid, …, 'SELECT,INSERT,UPDATE,DELETE')) AS dml` — a 8ª coluna (`dml`) é **o nº de tabelas de `public` em que o papel tem SELECT+INSERT+UPDATE+DELETE**; l.70-76: o script concede DML a **toda** relação `r`/`p` de `public` (e USAGE/SELECT a toda sequência `S`); l.78-79: `DEFAULT PRIVILEGES` do migrador para as futuras. Logo `dml` = nº de tabelas de `public` = fato 5 |
| 8 | A asserção | `git show origin/main:tests/san3-05-runtime-role-guard-db.test.ts ¦ sed -n '1016p'` → `assert.match(first.stdout, new RegExp(...\|f\|f\|f\|f\|0\|0\|118$..., "m"));` (dentro de `T14a/b · o procedimento converge, é idempotente e falha fechado…`, l.998); l.33 `connectionString = process.env.DATABASE_URL`; l.314-333 `runRoleScript` roda `bash scripts/db-runtime-role.sh` contra esse banco — **o banco da CI, com `prisma migrate deploy` aplicado** |
| 9 | **Precedente: o B-TRC-01 moveu o mesmo literal** | `git show c1485c94 -- tests/san3-05-runtime-role-guard-db.test.ts` → hunk de **+1/−1**: `-…0\|0\|115$` / `+…0\|0\|118$`; `git show c1485c94 --format='' -- 'prisma/migrations/*.sql' ¦ grep -i -E '^\+\s*CREATE TABLE'` → **3** (`vehicle_tracking_bindings`, `traccar_ingress_receipts`, `traccar_quarantine_items`) = 115 + 3 = 118. A junta do 01 **mediu e aceitou**: `votos/B-TRC-01-ciclo2/cadeira-a-voto.json:19,31` ("tabelas_com_dml=118; escapes=0") e `ciclo3/cadeira-a-evidencia.md:159,163-164` ("**118** e 0 escape"). O comando do 01 (`…/B-TRC-01-traccar-posicao-no-mapa.md`, grep por `san3-05-runtime`, `115`, `118`) → **nada**: o 01 fez a mesma edição **sem linha de PERMITIDO** — esta v2.2 corrige isso para o 02, por escrito |
| 10 | O detector do T9 | `git show origin/main:tests/helpers/o6r07c-census.ts ¦ sed -n '224p;275p;380,381p;409,414p;491p'` → l.224: varre `git ls-files src` (todo `.ts` não-teste de `src/**`); l.275 (comentário): "`t.startsWith/endsWith/includes(...)`/`re.test(t)` (despacho por prefixo: CURINGA estático)"; l.380: `startsWith/endsWith/includes/match/search` com **receptor** contaminado por `.type`; l.381: `m === "test" && ehTipo(n.arguments[0])` → `curingas.push(onde(n) + ": " + n.getText().slice(0, 90))`; l.409-413: `CURINGAS_ACEITOS` = **3** entradas, todas de `src/modules/mobile/mobile-evidence-sync.ts` (`type.includes("work_order_")`, `type.endsWith("_photo")`, `type.endsWith("_signature")`), escritas com `QQ` no lugar de `"`; l.414: `semLinha = x.replace(/:[0-9]+: /, ": ")` (**a entrada é arquivo + texto da chamada, sem linha**); l.491: só o que **não** está na allowlist vira `CURINGA-ESTATICO` |
| 11 | O guard T9 | `git show origin/main:tests/o6r07c-census-guard.test.ts ¦ sed -n '165,168p'` → `test("T9 — nenhum despacho novo por prefixo/sufixo/regex no type (curingas estáticos ⊆ os 3 de hoje)", …)` com `assert.deepEqual(daCategoria(cl, "CURINGA-ESTATICO"), [])`; grep por `CURINGAS_ACEITOS` e `.size` no guard → **nada**: não há asserção sobre o TAMANHO da allowlist (o "3" vive só no título) |
| 12 | O ponto acusado | `git show HEAD:src/integrations/traccar/traccar-event.schema.ts ¦ sed -n '24p;99,100p'` → l.24 `const EVENT_TYPE_PATTERN = /^[A-Za-z]{1,32}$/;` · l.99 `const type = event.type;` · l.100 `if (typeof type !== "string" ¦¦ !EVENT_TYPE_PATTERN.test(type)) throw new TraccarPayloadError("type_invalid");` — a saída medida pelo dev (relatório l.293): `CURINGA-ESTATICO: src/integrations/traccar/traccar-event.schema.ts:100: EVENT_TYPE_PATTERN.test(type)`; `git ls-tree HEAD src/integrations/traccar/traccar-event.schema.ts` → rastreado (o censo o vê por `git ls-files`) |
| 13 | Só UM curinga novo em todo o diff | `git grep -n -E '\.(test¦startsWith¦endsWith¦includes¦match¦search)\(' HEAD -- src/integrations/traccar src/modules/telemetry ¦ grep -i -E 'type¦kind'` → o único `.test(<tipo>)` é a l.100; os demais testam `uniqueId` (schema l.87; position l.167), `value` (service l.142; position l.127), `position.protocol` (l.181) e `eventTypes.includes(event.eventType)`/`TELEMETRY_*_TYPES.includes(normalized)` (telemetry, pré-existentes e não-`type`). **Uma entrada basta** — coincide com o `# fail 1` medido |
| 14 | O despacho real do evento | `git show HEAD:src/integrations/traccar/traccar-telemetry-catalog.ts ¦ sed -n '11,23p;93,108p'` → `TRACCAR_EVENT_TYPE_TO_KIND = { deviceOnline: "device_online", …, alarm: "alarm" } as const satisfies …` (comentário l.11-12: "Literal `as const` … ESTATICAMENTE enumerável pelo censo … T8"); `classifyTraccarEvent(type, alarm)`: `hasOwnProperty.call(MAP, type) ? MAP[type] : undefined` → `undefined` ⇒ `{ kind: "ignored", reason: "unknown_type" }`. **A decisão "que tipo vira linha" está no mapa, não no regex** (T8 verde no relatório l.293) |
| 15 | Quem prende o CONTEÚDO do regex | `git show HEAD:tests/traccar-event-contract.test.ts ¦ sed -n '94,95p;167,171p'` → l.95: `for (const type of ["geofenceEnter", "commandResult", "tipoInventado", ...TRACCAR_IGNORED_EVENT_TYPES])` → `ignored`; l.167-171: `for (const type of ["ignition-on", "x".repeat(33), "", 42]) { … rejects(body, "type_invalid"); }` — hífen, 33 chars, vazio e número **são 422 por teste** |
| 16 | Onde o vermelho vive na CI | `git show HEAD:.github/workflows/ci.yml ¦ grep -n -E 'DATABASE_URL:¦migrate deploy¦npm test¦san3-05-runtime¦o6r07c'` → job `backend` (l.31): `DATABASE_URL` l.34, `npx prisma migrate deploy` l.103, `npm test` l.109 (suíte inteira: **os dois guards rodam aqui**); `san3-05-runtime-role-guard-db` e `o6r07c-census-guard` **não** estão na lista curada do `backend-postgres` (l.190-245). Logo T9 e T14a/b reprovam o job **`backend`**, como o dev disse |
| 17 | **A CI ainda NÃO rodou no head** | `gh api repos/thiagodorgo/ERP_Techsolutios/commits/6a87c3da…/check-runs` → `HTTP 422 No commit found for SHA`; `gh pr list --head feat/traccar-b-trc-02 --state all` → **vazio**. O head não foi empurrado e não há PR: "o job `backend` fica vermelho" é **previsão do dev a partir de medição local** no contêiner (relatório l.293-294: `31/32` só T9; `10/12` só T14a/b, `veio …¦0¦0¦119`), não um check-run. A junta julga um SHA com check-runs concluídos (§C7.1-bis) — isto é insumo para o inspetor, não achado desta emenda |
| 18 | Q1 = NÃO | `git show origin/main:agent-orchestration/controle/decisoes.md ¦ grep -n -E 'D-TRC02-Q1¦Q1 = N[ÃA]O'` → **nada** (a `origin/main` ainda diz `D-TRC02-RESPOSTAS`: "Q1 sim"); no head, `B-TRC-02-dev.md:375` registra a decisão do dono "TRC-02 Q1 = Não (19/10)" como **a registrar** (`D-TRC02-Q1-NAO`). A variante vigente desta emenda é a que o orquestrador declarou no mandato: **Q1 = NÃO**. Os dois pedidos **independem** de Q1 (relatório l.343: "inalterados pela reversão") |
| 19 | Escopo vigente | `planos/B-TRC-02-plano.md:582-666` (§7.1 PERMITIDO, §7.2 réguas, §7.3 alargamento declarado com 7 linhas, §7.4 PROIBIDO — inclui **`scripts/db-runtime-role.sh`**); `planos/B-TRC-02-emenda-v2.1.md:318-322` (R3-4: o molde "entra no PERMITIDO com UMA edição … contagem medida … a cadeira (b) confere"); comando do bloco no head (`agent-orchestration/codex/comandos/B-TRC-02-traccar-eventos-e-telemetria.md:30`): "v2 §7.1 ∪ §7.3, mais `tests/db-catalog-write-guard.test.ts` (R3-4)". **Nenhum dos dois caminhos do pedido está lá** — o dev leu certo |

---
## 3. Pedido 1 — T9 do censo do 07c-a (`tests/helpers/o6r07c-census.ts`)

### 3.1 (a) O que o T9 enumera e por que o 02 entra nele

**O que o censo é.** O censo do `B-O6R-07c-a` (`tests/helpers/o6r07c-census.ts`, guard `tests/o6r07c-census-guard.test.ts`) monta o
**inventário das vias que o técnico de campo alcança**: rota × tipo de ação (`type`) dos lotes do sync mobile, e classifica cada par
(OS·07c-a, VISTORIA·ESCOPO, DESPACHO·ALVO, …). Para isso procura, em **todo `src/**/*.ts` não-teste** (`git ls-files src`, fato 10), os pontos
em que o código **decide pelo campo `type`** e resolve o literal comparado (T8). Um **curinga** — `t.startsWith(...)`, `t.endsWith(...)`,
`t.includes(...)`, `t.match(...)`, `t.search(...)` ou `re.test(t)` sobre um `t` derivado de `.type` — é uma decisão que o censo **não consegue
enumerar**: um despacho por prefixo esconderia pares do inventário. É isso que o T9 guarda (`CURINGA-ESTATICO` ⇒ vermelho), e
`CURINGAS_ACEITOS` é a válvula que o próprio censo oferece para a classe "testa `.type` mas **não** é despacho por prefixo que o inventário
desconheça" — as 3 entradas de hoje (fato 10) são de `mobile-evidence-sync.ts`, aceitas quando o inventário já conhecia os sufixos.

**Por que o 02 cai nele.** O detector reage ao **nome da propriedade** (`ehTipo`: qualquer `X.type`, `X["type"]`, `{ type }` e o que deles
deriva), não ao domínio. No `traccar-event.schema.ts` o dev escreveu `const type = event.type;` (l.99) — contaminado por definição — e, na
l.100, `EVENT_TYPE_PATTERN.test(type)`. O detector l.381 (`m === "test" && ehTipo(arg0)`) acusa. Mas:

1. **É validação de FORMATO, não despacho.** `EVENT_TYPE_PATTERN = /^[A-Za-z]{1,32}$/` (l.24) só responde "é um identificador de tipo bem
   formado?"; fora disso → `TraccarPayloadError("type_invalid")` → 422 (A10 do plano). Nenhum valor de `type` é **escolhido** aqui.
2. **O despacho real é enumerável (T8 verde).** Quem decide "que tipo vira linha" é `TRACCAR_EVENT_TYPE_TO_KIND` (`as const`, 9 chaves) em
   `classifyTraccarEvent` (fato 14); desconhecido → `ignored`. O dev já tinha convertido `Object.freeze` em literal e o `switch` em comparações
   justamente para o censo enumerar (T8 saiu de vermelho para verde no commit `22cd524b`).
3. **Está fora do domínio do censo, mas dentro da varredura dele.** O evento do Traccar entra por `traccar-ingest.app.ts` (app privado,
   M-E11; `src/app.ts` é PROIBIDO e sem diff), sem rota mobile, sem lote de sync, sem `field_technician`. Nenhum par novo nasce para o
   inventário (T1–T7, T11–T13 verdes no relatório l.293). O achado é **artefato do nome `type`**, não via nova.

**Logo:** a linha é **consequência necessária do bloco** — todo arquivo novo em `src/**` que valide o formato de um campo chamado `type` com
regex cai no T9 — e **não mascara defeito**: o inventário não ganha via escondida, e a regra "o despacho é o mapa" continua presa pelo T8
(enumerável) e pelo contrato (fato 15). A alternativa sem emenda seria **esconder-se do detector** — p.ex. `EVENT_TYPE_PATTERN.exec(type) === null`
(o detector só vê `test`, l.381) ou `new RegExp(...)` montado por partes — e isso é fugir de um ratchet, a classe que a R3-3 proibiu para o
`GRANT`. O dev recusou o contorno e pediu a emenda: **certo**. Esta v2.2 **proíbe** a forma de evasão (§5.4) e registra o buraco do detector
como pendência do dono do censo (§8).

### 3.2 (b) A entrada enfraquece a guarda do 07c-a? Não — prova pelo mecanismo

A entrada é **arquivo + texto exato da chamada**, sem número de linha (`semLinha`, fato 10):
`"src/integrations/traccar/traccar-event.schema.ts: EVENT_TYPE_PATTERN.test(type)"`.

| O que muda no código | O que o T9 faz **com** a entrada | Por quê |
|---|---|---|
| Nada (head + entrada) | **verde** (32/32) | o único curinga do diff (fato 13) casa com a entrada |
| Curinga **novo** no mesmo arquivo — p.ex. `type.startsWith("device")` | **vermelho** (`CURINGA-ESTATICO: …schema.ts:<l>: type.startsWith("device")`) | texto diferente ⇒ não está no `Set` |
| O **mesmo** texto em **outro** arquivo — p.ex. `EVENT_TYPE_PATTERN.test(type)` no adapter | **vermelho** | arquivo diferente ⇒ chave diferente |
| A entrada é removida, ou grafada com 1 caractere de diferença | **vermelho** com o achado da l.100 | prova que o verde vem **desta** entrada, não de um vácuo |
| A l.100 muda de linha (edição acima dela) | **verde** | por desenho (`semLinha`): a allowlist não congela linha, congela chamada |
| O **conteúdo** de `EVENT_TYPE_PATTERN` muda (p.ex. aceita hífen ou 33 chars; ou vira `/^(ignitionOn¦alarm)$/`) | **verde** — **limite declarado** | o detector não lê o regex; a allowlist também não. Quem pega é `tests/traccar-event-contract.test.ts` l.167-171 (`ignition-on`, 33×`x`, `""`, `42` ⇒ `type_invalid`) e l.95 (`geofenceEnter` ⇒ `ignored`, não 422) |

Conclusão: a guarda continua pegando **exatamente o caso para o qual existe** (um despacho por prefixo/regex novo em qualquer arquivo de
`src/`), e o único caso que ela tolera — o conteúdo do regex já aceito — é propriedade de **outro** teste, do próprio bloco. As mutações
que a cadeira (b) executa para provar cada linha desta tabela estão em §6 (M-E51…M-E54, com comando e vermelho esperado).

---
## 4. Pedido 2 — T14a/b do papel de runtime (`tests/san3-05-runtime-role-guard-db.test.ts:1016`, 118 → 119)

### 4.1 (a) O que o 118 conta e por que vira 119

**O que conta.** O `118` é a 8ª coluna (`dml`) da linha final que `scripts/db-runtime-role.sh` imprime (fato 7): **o nº de tabelas de
`public` em que o papel de runtime tem SELECT+INSERT+UPDATE+DELETE** depois de o script rodar. Como o script concede DML a **toda**
relação `r`/`p` de `public` (l.70-76) e `DEFAULT PRIVILEGES` para as futuras (l.78-79), `dml` é, por construção, **o nº de tabelas de
`public` do banco migrado** = 117 models do Prisma + `_prisma_migrations` = **118** na `origin/main` (fatos 4-5). As outras colunas
(`f|f|f|f|0|0`) são os escapes (superuser, bypassrls, replication, membro de papel perigoso), a **posse** de tabela FORCE RLS e as **views**
sobre tabela FORCE — todas devem continuar em `f`/`0`.

**Qual objeto novo.** A migração A do bloco cria **uma** tabela, `public.vehicle_telemetry_events` (fato 6) — e nada mais que entre em
`pg_tables`: sem sequência (PK uuid), sem função, sem view. O head tem 118 models (fato 4) ⇒ 118 + 1 = **119**. A tabela nasce com
`ENABLE`+`FORCE ROW LEVEL SECURITY` e política `tenant_isolation`, pertencendo ao migrador; o runtime **não** é dono nem membro do dono ⇒
`posse` continua `0`; não há view ⇒ `views` continua `0`. A linha esperada passa a ser `^<papel>|f|f|f|f|0|0|119$` — exatamente o que o dev
mediu no contêiner (`veio …|0|0|119`, fato 17).

**Consequência necessária, não defeito mascarado.**
- O literal é um **ratchet de inventário**: congela "o runtime toca N tabelas, nem mais nem menos". Toda tabela nova **tem** de movê-lo em
  +1, senão (i) a tabela não foi criada, ou (ii) o script deixou de conceder DML a ela — e as duas seriam defeitos. Manter `118` com a
  tabela criada é **impossível** sem quebrar o script, que é PROIBIDO (§7.4). O B-TRC-01 fez o mesmo movimento, 115 → 118, para as
  3 tabelas dele (`c1485c94`, hunk +1/−1; fato 9), e a junta do 01 **mediu 118 e aceitou** em dois ciclos.
- O que o número **não** expressa — e por isso não mascara: (1) "o runtime não deveria ter DML nesta tabela específica" — o desenho do
  `B-SAN3-05` é DML em tudo + RLS/FORCE como isolamento, por tabela (a guarda por tabela é `tests/traccar-event-rls-db.test.ts` do bloco e a
  trava estrutural do próprio script, T14c/T14d); (2) "a aplicação não faz UPDATE/DELETE em `vehicle_telemetry_events`" (PROIBIDO §7.4) — isso é
  propriedade do **código**, não do privilégio: o script não diferencia tabelas, logo o número nunca o expressaria, com 118 ou com 119.
- A tabela é **do §6.1 do plano**: nenhuma concessão nova, nenhuma função, nenhum papel — só o inventário seguindo o schema.

### 4.2 (b) A mudança enfraquece a guarda? Não — prova pelo mecanismo

Com `119`, a guarda continua pegando os dois sentidos para os quais existe:

| Mutação | `dml` que o script imprime | T14a/b com `119` |
|---|---|---|
| Nada (head + `119`) | 119 | **verde** (12/12) |
| **Uma tabela a mais** (p.ex. `CREATE TABLE "zz_mutacao_trc02"` acrescentada à migração A, só no worktree da cadeira) | 120 | **vermelho** (`expected …\|0\|0\|119$`, veio `…\|120`) — objeto não declarado no inventário |
| **Uma tabela a menos no GRANT** (o loop l.70-76 do script pula `vehicle_telemetry_events`, só no worktree da cadeira) | 118 | **vermelho** — a tabela nova ficou **sem** DML (o runtime não conseguiria ingerir evento) |
| `vehicle_telemetry_events` com dono = runtime (posse) | `posse` 1 | **vermelho** na 6ª coluna — fora do alcance desta emenda; continua como no 01 |

O caso "manter 118" seria o único que **enfraqueceria** algo: exigiria que o script não concedesse DML à tabela nova, i.e. mexer em
`scripts/db-runtime-role.sh` (PROIBIDO) para o teste passar — a classe de contorno que a R3-3 proíbe. O que esta emenda autoriza é o
oposto: o número **segue o fato**, e a cadeira (b) confere que o fato é **uma** tabela (fato 6) e que o script está byte a byte igual à
`origin/main` (§5.3).

**Determinismo, para o terreno.** O `119` só vale num banco com **exatamente** as migrations do repo aplicadas (`prisma migrate deploy` em
cluster limpo). Resíduo de outra suíte ou de uma execução morta muda o número — isso é **terreno** (inspetor, §C7.1-bis), não produto. O
precedente de `118` passou no `backend` da CI sob o mesmo `npm test` paralelo (fato 16); se o check-run do head pushado mostrar ≠ 119 **e**
o diff continuar com uma só `CREATE TABLE`, a leitura é "banco sujo", não "defeito do 02".

---
## 5. Texto exato da emenda v2.2 (normativo)

Dois requisitos de escopo, **R-S1** e **R-S2**, no molde da R3-4 ("entra no PERMITIDO com UMA edição; o número vai no diff; a cadeira (b)
confere"). Linhas citadas pela numeração da `origin/main` `2ecfb333` (os dois arquivos são idênticos no head, fato 2).

### 5.1 §7.1 do plano v2 ganha DUAS linhas (tabela PERMITIDO)

| Caminho | Trabalho |
|---|---|
| `tests/helpers/o6r07c-census.ts` | **R-S1 — só UMA linha nova** dentro de `CURINGAS_ACEITOS` (l.409-413), inserida **depois** da l.412 (`…type.endsWith(QQ_signatureQQ)",`) e **antes** do `].map(` (l.413), com a indentação de 4 espaços das vizinhas. Nada mais no arquivo |
| `tests/san3-05-runtime-role-guard-db.test.ts` | **R-S2 — só a l.1016**: dentro da `RegExp` de T14a/b, `118$` passa a `119$`. Nada mais no arquivo (nem título, nem comentário) |

**R-S1 — a linha exata** (uma linha; o comentário de motivo fica NA MESMA linha para a régua `1 0` valer; a entrada não contém `QQ`, logo o
`.map(split("QQ"))` da l.413 não a altera):

```ts
    "src/integrations/traccar/traccar-event.schema.ts: EVENT_TYPE_PATTERN.test(type)", // B-TRC-02: validação de FORMATO do event.type (A10 → 422), não despacho; o despacho é o mapa literal enumerável (T8)
```

**R-S2 — a linha exata** (antes → depois; só o literal muda):

```ts
        assert.match(first.stdout, new RegExp(`^${runtime}\\|f\\|f\\|f\\|f\\|0\\|0\\|118$`, "m"));
        assert.match(first.stdout, new RegExp(`^${runtime}\\|f\\|f\\|f\\|f\\|0\\|0\\|119$`, "m"));
```

### 5.2 §7.3 (alargamento declarado) ganha DUAS linhas

| Caminho fora do §7 | Razão medida | Registro |
|---|---|---|
| `tests/helpers/o6r07c-census.ts` (1 entrada em `CURINGAS_ACEITOS`) | o detector do censo reage ao NOME `type` em todo `src/**` (fato 10); a l.100 do schema é validação de formato (A10), não despacho — o despacho é o mapa enumerável (T8). A allowlist é a válvula que o próprio censo oferece; contornar o detector é fugir de ratchet (R3-3) | `D-TRC02-ESCOPO` (§12), linha nova |
| `tests/san3-05-runtime-role-guard-db.test.ts:1016` (`118` → `119`) | o literal é o nº de tabelas de `public` com DML do runtime (fato 7); a única `CREATE TABLE` do diff é `vehicle_telemetry_events` (fato 6); precedente `c1485c94` (115 → 118, +1/−1; fato 9) | `D-TRC02-ESCOPO` (§12), linha nova |

### 5.3 Réguas que a cadeira (b) mede (item 2 do mandato dela ganha os dois caminhos no pathspec)

| # | Régua | Comando (no head julgado `<h>`) → esperado |
|---|---|---|
| b-S1 | R-S1 é UMA linha e é A linha | `git diff origin/main..<h> --numstat -- tests/helpers/o6r07c-census.ts` → `1	0	tests/helpers/o6r07c-census.ts`; `git diff origin/main..<h> -- tests/helpers/o6r07c-census.ts ¦ grep '^+[^+]'` → **exatamente** a linha de §5.1 (R-S1); `git show <h>:tests/helpers/o6r07c-census.ts ¦ sed -n '409,414p'` → a entrada está **dentro** do `new Set([ … ])` de `CURINGAS_ACEITOS` |
| b-S2 | R-S2 é UMA linha e só o literal muda | `git diff origin/main..<h> --numstat -- tests/san3-05-runtime-role-guard-db.test.ts` → `1	1	…`; `git diff origin/main..<h> -- tests/san3-05-runtime-role-guard-db.test.ts ¦ grep -E '^[-+][^-+]' ¦ sed 's/11[89]\$/NNN$/' ¦ sort -u ¦ wc -l` → **1** |
| b-S3 | O objeto novo é UM e é tabela | `git diff origin/main..<h> -- 'prisma/migrations/*.sql' ¦ grep -i -E '^\+\s*CREATE (TABLE¦SEQUENCE¦FUNCTION¦VIEW¦MATERIALIZED)'` → **só** `+CREATE TABLE "vehicle_telemetry_events" (`; `git show <h>:prisma/schema.prisma ¦ grep -c '^model '` → **118** |
| b-S4 | Nada do PROIBIDO mexeu | `git diff origin/main..<h> --stat -- tests/o6r07c-census-guard.test.ts scripts/db-runtime-role.sh src/app.ts src/portal-app.ts` → **vazio** |
| b-S5 | Sem evasão do detector (§5.4) | `git grep -n -E '\.exec\((event\.)?type\)' <h> -- src/integrations/traccar` → **vazio**; `git grep -n -F 'EVENT_TYPE_PATTERN.test(type)' <h> -- src/integrations/traccar/traccar-event.schema.ts` → **exatamente 1** linha |
| b-S6 | Os dois guards verdes no head, em terreno próprio | `node --test --import tsx tests/o6r07c-census-guard.test.ts` → `# tests 32 # pass 32 # fail 0`; com `DATABASE_URL` de cluster descartável recém-migrado (`npx prisma migrate deploy`): `node --test --import tsx tests/san3-05-runtime-role-guard-db.test.ts` → `# tests 12 # pass 12 # fail 0` (psql 16 no terreno, T14b) |
| b-S7 | O check-run `backend` do head pushado | `gh api repos/thiagodorgo/ERP_Techsolutios/commits/<h>/check-runs --jq '.check_runs[]¦"\(.name) \(.status) \(.conclusion)"'` → `backend completed success` (insumo do inspetor; §C7.1-bis) |

### 5.4 O que esta emenda PROÍBE (soma ao §7.4)

- Editar `tests/o6r07c-census-guard.test.ts` (inclusive o título do T9, "⊆ os 3 de hoje" — vira pendência do dono do censo, §8) e
  `scripts/db-runtime-role.sh` (já PROIBIDO): a emenda é de **duas** linhas em **dois** arquivos, nem uma a mais.
- Qualquer forma que **esconda** a validação do detector: `EVENT_TYPE_PATTERN.exec(type)`, `RegExp` montada por partes, `String.prototype.test`
  via alias, ou mover a checagem para um helper que receba o `type` por outro nome só para o censo não ver. A checagem fica **literalmente**
  `EVENT_TYPE_PATTERN.test(type)` no `traccar-event.schema.ts`, a chamada que a allowlist nomeia.
- Alterar o conteúdo de `EVENT_TYPE_PATTERN` (`/^[A-Za-z]{1,32}$/`) a pretexto desta emenda: o contrato (fato 15) é quem o prende.
- "Ajustar" o literal 119 para qualquer outro valor, ou acrescentar tabela/sequência/view fora da migração A já medida.

### 5.5 Como o dev aplica

1. Um commit só com os dois arquivos: `test(traccar): emenda v2.2 de escopo — o censo do 07c-a aceita a validação de formato do event.type
   e o inventário de DML do papel de runtime vai a 119 (vehicle_telemetry_events)`.
2. Reexecutar, no contêiner, **só** os dois arquivos (`o6r07c-census-guard` → 32/32; `san3-05-runtime-role-guard-db` → 12/12) e gravar no
   `B-TRC-02-dev.md`, na seção dos pedidos, o hash, os dois `--numstat` e as duas saídas. Não repetir o `npm test` inteiro no contêiner
   (derrubou a VM duas vezes — relatório, "Segunda tentativa"); a forma `backend` completa é do check-run do head pushado (b-S7).
3. Commit de registro separado (`docs(traccar)`): cópia desta emenda em `docs/revisoes/TRACCAR/B-TRC-02-emenda-v2.2-escopo.md` (mesma
   classe "registro" da cópia da v2.1, §7.1 última linha) e a l.30 do comando do bloco (§8).

---
## 6. Mutações e controles da cadeira (b)

Todas em **worktree próprio da cadeira** (`npm ci` próprio; junction PROIBIDA — §C7.1-ter(c)) e, para a suíte `-db`, em **cluster
descartável** recém-migrado (§C7.1-bis). Cada mutação: aplicar → rodar o teste nomeado → anotar `# pass/# fail` e a linha do achado →
**reverter** (`git checkout -- <arquivo>`; a migração mutada se desfaz com o cluster). Nenhuma mutação é commitada. Os vermelhos abaixo
estão **previstos pelo mecanismo lido** (§3.2, §4.2); a cadeira os **mede**. Prefixo `M-S` (escopo) para não colidir com os `M-E*` do dev.

| Id | Prova | Edição (no head + emenda) | Teste | Esperado |
|---|---|---|---|---|
| **C-S0** (controle) | o verde vem da emenda | nenhuma | `node --test --import tsx tests/o6r07c-census-guard.test.ts`; `node --test --import tsx tests/san3-05-runtime-role-guard-db.test.ts` | `32/32` · `12/12` |
| **M-S1** | T9 continua pegando curinga **novo** | em `src/integrations/traccar/traccar-event.schema.ts`, logo após a l.100: `  if (type.startsWith("device")) throw new TraccarPayloadError("type_invalid");` | census-guard | `# fail 1` (T9): `CURINGA-ESTATICO: src/integrations/traccar/traccar-event.schema.ts:101: type.startsWith("device")` |
| **M-S2** | T9 continua pegando o **mesmo texto em outro arquivo** | em `traccar-event.adapter.ts`, numa função que receba o evento validado, acrescentar `if (!/^[A-Za-z]{1,32}$/.test(event.type)) throw new Error("m");` (o `.type` contamina o argumento) | census-guard | `# fail 1` (T9): `CURINGA-ESTATICO: src/integrations/traccar/traccar-event.adapter.ts:<l>: /^[A-Za-z]{1,32}$/.test(event.type)` |
| **M-S3** | o verde depende **desta** entrada, não de vácuo | em `tests/helpers/o6r07c-census.ts`, remover a linha R-S1 (ou trocar `test(type)` por `test(type )` nela) | census-guard | `# fail 1` (T9) com o achado da l.100 — igual ao do relatório |
| **M-S4** | **limite declarado**: o regex não é guardado pelo T9, e sim pelo contrato | l.24 do schema: `/^[A-Za-z]{1,32}$/` → `/^[A-Za-z-]{1,33}$/` | census-guard **e** `node --test --import tsx tests/traccar-event-contract.test.ts` | census `32/32` (verde, por desenho); contrato **vermelho** em "type fora do padrão → 422" (`ignition-on` e 33×`x` passam a ser aceitos) |
| **M-S4′** | o regex não pode virar despacho sem ser visto | l.24: `/^(ignitionOn¦alarm)$/` | contrato | **vermelho** na l.95 (`geofenceEnter`/`commandResult`/`tipoInventado` dão 422 em vez de `ignored`) — e o T9 fica verde: por isso a forma está em §5.4 e a régua b-S5 existe |
| **M-S5** | **evasão** que o detector não vê (buraco a registrar, §8) | l.100: `!EVENT_TYPE_PATTERN.test(type)` → `EVENT_TYPE_PATTERN.exec(type) === null` **e** remover a linha R-S1 | census-guard | `32/32` **verde sem entrada na allowlist** — prova que a forma `.exec` escapa ao detector; é a razão de b-S5 (grep → vazio no head real) e da pendência `P-07C-CENSO-EXEC` |
| **M-S6** | o 119 pega **uma tabela a mais** | na migração A (worktree da cadeira), antes do rodapé: `CREATE TABLE "zz_mutacao_trc02" ("id" INTEGER PRIMARY KEY);`; `npx prisma migrate deploy` no cluster descartável | san3-05 guard | `# fail 2` (T14a/b): esperado `…\|0\|0\|119$`, veio `…\|0\|0\|120` |
| **M-S7** | o 119 pega **uma tabela sem DML** | `scripts/db-runtime-role.sh` l.72 (só no worktree da cadeira; o arquivo é PROIBIDO para o dev): `WHERE ns.nspname = 'public' AND c.relname <> 'vehicle_telemetry_events' AND c.relkind IN ('r','p','S')` | san3-05 guard | `# fail ≥2` (T14a/b): veio `…\|0\|0\|118` — a tabela nova ficou fora do GRANT (o runtime não ingeriria evento) |

**Leitura dos resultados.** C-S0 verde + M-S1/M-S2/M-S3 vermelhos ⇒ a entrada é exata e não abre vácuo (§3.2). M-S4/M-S4′ ⇒ o conteúdo do
regex tem dono (o contrato), e o T9 não o guarda nem antes nem depois da emenda — limite **declarado**, não introduzido por ela. M-S5 ⇒ o
detector tem um buraco pré-existente (`exec`), fechado aqui por proibição + grep, e registrado para o dono do censo. M-S6/M-S7 ⇒ o 119
reprova nos dois sentidos (objeto a mais; privilégio a menos), como o 118 reprovava. Se **qualquer** linha der o oposto do esperado, a
emenda **não** se aplica como está: a cadeira reporta a linha, e o planejamento volta (§C7.4-bis).

---
## 7. Riscos, limites declarados e rollback

| Risco | Prob./impacto | Mitigação |
|---|---|---|
| O título do T9 passa a mentir ("⊆ os 3 de hoje" com 4 entradas) | certo / baixo | é prosa, não asserção (fato 11); corrigir é editar `tests/o6r07c-census-guard.test.ts`, **fora** do bloco — pendência nomeada `P-07C-CENSO-TITULO-T9`, dono = bloco do censo (07c), classe `pre-existente` (o título já congela um número que todo bloco com `.type` novo move) |
| A allowlist tolera mudança de conteúdo do regex (M-S4) | médio / baixo | limite do **mecanismo** do censo (chave = arquivo + texto da chamada), não desta emenda; coberto pelo contrato do próprio bloco (fato 15); §5.4 proíbe alterar o regex a pretexto da emenda |
| O detector não vê `.exec(type)` (M-S5) | baixo / médio | buraco **pré-existente** do censo; §5.4 proíbe a forma e b-S5 a mede por grep; pendência `P-07C-CENSO-EXEC` (dono 07c) para acrescentar `exec` à lista da l.381 |
| `dml` ≠ 119 no `backend` da CI por banco sujo (paralelismo do `npm test`) | baixo / médio | o 118 passou sob o mesmo paralelismo (fato 16); se ≠ 119 **e** b-S3 continua "uma `CREATE TABLE`", é terreno → inspetor, não achado de produto |
| A CI ainda não rodou no head (fato 17) | certo / processo | o dev empurra o head com a emenda aplicada; a junta só começa com check-run concluído (§C7.1-bis; b-S7) |
| O dev "aproveita" o commit para outra coisa nos dois arquivos | baixo / alto | réguas b-S1/b-S2 (`1 0` e `1 1`) e b-S4 (PROIBIDO sem diff) — qualquer linha a mais reprova o escopo |
| Q1 = NÃO ainda não está em `decisoes.md` da `origin/main` (fato 18) | certo / processo | não é objeto desta emenda; registrado em §8 para o inspetor **não herdar** "Q1 = SIM" de `decisoes.md:3783` como fato |

**Rollback.** Reverter os dois hunks (`git revert` do commit de R-S1/R-S2, ou `git checkout origin/main -- <os 2 arquivos>`): nada no
código do bloco depende deles — só os dois guards voltam a vermelho (31/32 e 10/12), exatamente o estado medido pelo dev. Nenhuma migração,
nenhum dado, nenhum privilégio muda com a emenda; o banco não participa do rollback.

---
## 8. Registro (orquestrador) e pendências nomeadas

1. **`D-TRC02-ESCOPO`** (`agent-orchestration/controle/decisoes.md`, pelo orquestrador — §12 do plano): ganha as duas linhas de §5.2, com a razão
   medida de cada uma e a referência a esta emenda (`planos/B-TRC-02-emenda-v2.2-escopo.md`, cópia em `docs/revisoes/TRACCAR/`).
2. **Comando do bloco** (`agent-orchestration/codex/comandos/B-TRC-02-traccar-eventos-e-telemetria.md`, l.30): "O do plano: v2 §7.1 ∪ §7.3,
   mais `tests/db-catalog-write-guard.test.ts` (uma entrada na allowlist, emenda R3-4) **e os dois caminhos da emenda v2.2 de escopo
   (`tests/helpers/o6r07c-census.ts`: 1 entrada em `CURINGAS_ACEITOS`; `tests/san3-05-runtime-role-guard-db.test.ts:1016`: `118` → `119`)**";
   l.9: a lista de normas ganha `B-TRC-02-emenda-v2.2-escopo.md`.
3. **Mandato da cadeira (b)**: item 2 ganha os dois caminhos no pathspec e as réguas b-S1…b-S7 (§5.3); a tabela de mutações da cadeira ganha
   C-S0 e M-S1…M-S7 (§6).
4. **Pendências a abrir** (`agent-orchestration/controle/pendencias.md`), todas `pre-existente` com evidência de origem:
   - `P-07C-CENSO-TITULO-T9` — o título do T9 congela "os 3 de hoje" em prosa; com a 4ª entrada passa a mentir. Dono: bloco do censo
     (`B-O6R-07c-*`). Gravidade baixa. Evidência: `tests/o6r07c-census-guard.test.ts:165` na `origin/main` `2ecfb333` (antes do B-TRC-02).
   - `P-07C-CENSO-EXEC` — o detector de curinga (`o6r07c-census.ts:380-381`) não vê `re.exec(t)`; M-S5 prova. Dono: bloco do censo.
     Gravidade média (uma via futura poderia despachar por `exec` sem acender o T9). Evidência: l.381 só trata `m === "test"`, na mesma ref.
   - `P-SAN3-05-LITERAL-DML` — o literal `118`/`119` de T14a/b é um inventário congelado em número, movido à mão por cada bloco que cria tabela
     (115 → 118 no 01, 118 → 119 no 02); uma forma que derive o esperado das migrations (nº de `CREATE TABLE` + 1) tiraria a emenda de escopo
     do caminho de todo bloco com tabela nova, sem afrouxar a guarda. Dono: `B-SAN3-05`/follow-up. Gravidade baixa (processo). Evidência:
     `c1485c94` e este pedido.
5. **Fato a não herdar** (para o inspetor, §C7.1-bis): `D-TRC02-Q1-NAO` **não** está na `origin/main` (fato 18); a variante vigente é Q1 = NÃO
   por decisão do dono de 19/10, registrada no relatório do dev (l.375) e no mandato do orquestrador. Quem registra é o orquestrador (§12).
6. **Fato a não herdar** (idem): o head `6a87c3da` não tem check-run (fato 17). O vermelho de T9/T14a/b é medição local do dev; a prova de
   que a emenda fecha o `backend` é o check-run do head pushado **com** a emenda (b-S7).

---
## 9. Estado (P2)

- **Concluído:** §1–§8 gravadas; 19 fatos medidos (§2) no head `6a87c3da` e na `origin/main` `2ecfb333`; decisão (a) e prova (b) para os
  dois pedidos (§3, §4); texto normativo com as duas linhas exatas, as 7 réguas da cadeira (b) e as proibições (§5); 1 controle + 7 mutações
  previstas pelo mecanismo (§6); riscos, limites declarados e rollback (§7); registro e 3 pendências nomeadas (§8).
- **Não feito, de propósito:** nenhuma mutação **executada** (cadeira (b) executa em terreno próprio — §C7.4-bis: quem planeja não mede o
  próprio plano); nenhum arquivo do repositório tocado; nenhum commit; o worktree do dev ficou SÓ LEITURA.
- **Próximo passo (orquestrador):** repassar ao dev a §5 (R-S1, R-S2, §5.5), registrar §8 e, com o head empurrado **com** a emenda e check-run
  concluído, convocar o inspetor e a junta com as réguas b-S1…b-S7 e as mutações C-S0/M-S1…M-S7 no mandato da cadeira (b).
- **Modelo:** Fable 5.1, o do frontmatter. Sem fallback acionado. Identidade `planejador-trc02-escopo-fable`, nova.
