# C1-v2 — `jurado-b07a-c2-autorizacao` · evidência (CICLO 2 — TETO)

> Cadeira **C1-v2** da junta do **CICLO 2** do `B-O6R-07a` (PR #369). **VETO.** Quórum: unanimidade
> de 3. **Ciclo-teto** (`D-TETO-DOIS-CICLOS`): reprovação aqui = dossiê ao dono.
> Identidade NOVA: não sou o C1 do ciclo 1, não planejei, não desenvolvi, não votei em nada.
> **Julgo o mérito; não proponho correção** (§C7.4-bis).
> Mandato: EXATAMENTE 3 itens (C2·8, P4) — J1 · J2 · J3.

## HEAD medido por mim

```
$ git rev-parse HEAD   (worktree .claude/worktrees/b07)
(a preencher na J0)
```

**`head_julgado` = (a preencher)** — o briefing diz `9989c62`; confiro abaixo.

---

## J1 — Paridade DECLARAÇÃO × MEDIÇÃO do SEC-002 `parcialmente_superado` (aceite C2·6 item 2)

**Status: EM APURAÇÃO**

- [ ] **J1.a** — `achados.jsonl` linha SEC-002: `parcialmente_superado` no formato da casa
      (QUA-004), `componente_superado` preservando as provas do ciclo 1, `componentes_abertos` = 9
      rotas, SEM `fechado_em`/`fechado_por`; forma de cada número declarada (execução × leitura × env).
- [ ] **J1.b** — **RE-EXECUÇÃO do drill da C1** (roteiro da evidência dela, §3a/3b/3c), em worktree
      descartável próprio @ head: toda rota nomeada aberta responde aberta (201/204/201 nas 3 de
      execução); NENHUMA rota nomeada aberta responde 403; NENHUMA rota fora da lista está aberta.
      As 4 de leitura e as 2 de env também atacadas por execução (conferência mais forte que a
      declarada).
- [ ] **J1.c** — a nuance do 422 do geocode-destination (diário D2.d): conferir o que é e se a
      declaração a esconde.
- [ ] **J1.d** — `REGISTRO_ACHADOS_O6R.md`: **4 fechados · 1 parcialmente superado · 10 abertos**
      nas DUAS seções (l.219 e "Atualização 2026-09-02").
- [ ] **J1.e** — `Kpis/kpis-latest.json`: SEC-002 FORA de `aguardando_merge` (fica só SEC-003);
      guard `kpi-achados-paridade` rodando verde por execução minha.

## J2 — O dual-match sob ataque adversarial (aceite C2·6 item 3)

**Status: EM APURAÇÃO**

- [ ] **J2.a** — leitura do diff de `assertMutationObjectScope` (dual-match, 2 ramos) e do write do
      assign; quem grava `assigned_operator_id`.
- [ ] **J2.b** — **PROVA POR EXECUÇÃO de quem escreve o campo**: `field_technician` tenta o assign
      → 403; portador de `work_orders:assign` → 200. Não aceito o gate por leitura.
- [ ] **J2.c** — ataque de permissão-a-mais ao segundo ramo: técnico NÃO nomeado com
      `userId` ≠ `assignedOperatorId` → 403; OS órfã (`assignedOperatorId` null) → 403
      (fail-closed nos dois ramos).
- [ ] **J2.d** — colisão de UUID: vetor real ou teórico? (origem dos ids, quem os escolhe).
- [ ] **J2.e** — fronteira **403 mesma-org × 404 cross-tenant** intacta, por execução.
- [ ] **J2.f** — re-execução dos 3 casos novos de `o6r07a-wo-object-scope.test.ts` (N=3,
      denominador idêntico 8/8) + re-execução do VERMELHO deles no código pré-correção
      (worktree descartável @ commit pré-correção): o técnico legitimamente atribuído recebia 403.

## J3 — A errata E-a e o material da junta

**Status: EM APURAÇÃO**

- [ ] **J3.a** — errata E-a do C2·7 presente e fiel: o texto medido do C2·4 substitui a
      caracterização falsa (*"perde TODA mutação"*) ONDE ela nasceu; o texto medido bate com o que
      o drill J1.b mediu.
- [ ] **J3.b** — o material do ciclo 2 (briefing desta junta + registros) NÃO repete o texto falso
      como fato (grep do texto no repo; classificação de cada ocorrência).
- [ ] **J3.c** — pendências novas bem-formadas em `pendencias.md`: `P-O6R-SUBRECURSO-OBJECT-SCOPE`
      (ALTA, dono `B-O6R-07c`, 9 rotas com N/forma/causa); resolução da tensão A4 com
      `Ω6R-QUA-004` seguindo ABERTO.

---

# REGISTRO DAS MEDIÇÕES

(apenso abaixo, item a item, conforme medido — gravar o item N ANTES do N+1)

## J0 — HEAD e terreno, medidos por mim

```
$ git rev-parse HEAD                       -> 9989c62a3b81468dee6dd39fae3da6246e0e6fb1
$ git rev-parse HEAD~1                     -> 9d4498998dc3d3c678af440bf90f68971eb6b1ac   (pré-correção)
$ git diff --numstat 9989c62 9d44989 -- package.json package-lock.json   -> VAZIO (1 npm ci serve os 2)
$ docker ps  -> erp-postgres:5432 · erp-redis:6379 (base viva, NÃO tocada nem lida) ·
               jur-c5-arnes-pg-bat:32783 · jur-c5-arnes-red-bat:32784 (bateria do c5 RODANDO — intocada)
```

**`head_julgado` = `9989c62`** (bate com o briefing). Meu mandato roda TODO em arnês em memória —
**nenhum cluster subido por mim, nenhuma porta aberta** (R2/R3 respeitadas por construção; a contenda
de CPU do c5 só afetaria suíte plena, que meu mandato não exige — os focados bastam).
Worktree descartável próprio: `../jur-c1v2-drill` @ `9989c62`, `npm ci` PRÓPRIO (zero junction).

## J1.a — MEDIDO · `achados.jsonl` linha SEC-002 — **CONFERE**

```
$ python (utf-8): 30/30 linhas parseiam; SEC-002 = linha 9
ANTES (blob 9d44989):  status="fechado" · fechado_em="2026-09-02" · fechado_por="B-O6R-07a…" · SEM supersedido
AGORA (árvore @ head): status="parcialmente_superado" · fechado_em AUSENTE · fechado_por AUSENTE
supersedido keys = [por, componente_superado, componentes_abertos, contagem_aberta, pendencia_dona, verificado_em]
  = as 4 do modelo QUA-004 + 2 extras que carregam o que o C2·2 exige (forma dos números + dona)
por = "B-O6R-07a (PR #369, ciclo 2)"
componentes_abertos = 9 (attach-POST · attach-DELETE · comment-POST · comment-PATCH · comment-DELETE ·
  tag-POST · tag-DELETE · geocode · geocode-destination), CADA UM com FORMA (execução × leitura × env)
  e CAUSA/ORIGEM (bf456b0 #173 · D-Ω3F-5-COMMENT · rota anterior ao bloco)
contagem_aberta = "3 execução · 4 leitura · 2 env" + a conta 14 = 2 guardadas + 4 abertas + 8 barradas no gate
componente_superado = 2451 chars, preservando os TRÊS cortes provados no ciclo 1
```

O flip `fechado → parcialmente_superado` é ato DESTE commit; o critério de aceite original do achado
("Técnico A não altera OS de B") permanece no campo `teste`, intacto. **J1.a CONFERE com o C2·2 item 1.**

## J1.d — MEDIDO · `REGISTRO_ACHADOS_O6R.md` — **CONFERE**

```
$ grep -n "parcialmente superado" REGISTRO_ACHADOS_O6R.md
l.221  seção do SEC-002: "parcialmente superado pelo B-O6R-07a (PR #369, ciclo 2). NÃO está fechado"
l.608  QUA-004 (pré-existente, intocado)
l.815-818  "Atualização 2026-09-02, corrigida no ciclo 2": distribuição
           P0 15 (4 fechados · 1 parcialmente superado · 10 abertos) · P1 15 (1 fechado, 14 abertos)
```

A l.800 tem "4 fechados, 11 abertos" — é o parágrafo HISTÓRICO datado 2026-08-18 (B-O6R-01),
anterior ao ciclo 2, e registro histórico não se edita: não é divergência. A seção do SEC-002 lista
as MESMAS 9 rotas numeradas 1-9, cada uma com forma (EXECUÇÃO ×3 · LEITURA ×4 · env ×2) e origem;
dona `P-O6R-SUBRECURSO-OBJECT-SCOPE` (ALTA, `B-O6R-07c`); e o "por que NÃO se estendeu o guard".
As duas seções contam a mesma história. **J1.d CONFERE.**

## J1.e — MEDIDO · KPI + guard de paridade — **CONFERE**

```
kpis-latest.json: production_readiness.aguardando_merge = [Ω6R-SEC-003] (SÓ ele — SEC-002 FORA)
p0_fechados=4 · p1_fechados=0 · deploy_bloqueado=true (intocados)
findings/itens[8] SEC-002 -> status "parcialmente_superado"
$ node --test --import tsx tests/kpi-achados-paridade.test.ts -> # tests 6 · pass 6 · fail 0 · ec=0
```

Guard rodado POR MIM, verde. **J1.e CONFERE com o C2·2 item 3.**

---
---

# PARTE II — `jurado-b07a-c2-autorizacao-s` (CADEIRA C1-v2, IDENTIDADE NOVA)

> **Tudo acima é da titular caída** (`jurado-b07a-c2-autorizacao`, queda #5) e está preservado
> VERBATIM: nada dela foi reescrito, encurtado ou movido. **Tudo abaixo é meu.**
> Sou o substituto. Não herdo conclusão dela como fato: o P3 manda **re-executar cada comando
> registrado e comparar a saída**. As três provas que ela gravou (`J1.a`/`J1.d`/`J1.e`) eu
> **re-executo** abaixo e digo se confirmo ou divirjo. A conclusão dela sobre `randomUUID()` no
> `operator-profile.repository.ts` ficou **fora do arquivo** (só na mensagem final) — **não é
> insumo**; trato como pista e **re-meço**.
> **Julgo o mérito; não proponho correção** (§C7.4-bis).

## S0 — HEAD e terreno, medidos por MIM

```
$ git rev-parse HEAD                (worktree .claude/worktrees/b07)
9989c62a3b81468dee6dd39fae3da6246e0e6fb1
$ git worktree list
b07              9989c62 [fix/o6r07a-authorization]
jur-c1v2-drill   9989c62 (detached HEAD)      <- worktree da titular
jur-c5-arnes     2709f4b (detached HEAD)      <- INTOCÁVEL (junta do c5)
$ docker ps --format "{{.Names}}\t{{.Ports}}"
jur-c5-arnes-red-bat  0.0.0.0:32784->6379/tcp   <- c5, INTOCADO
jur-c5-arnes-pg-bat   0.0.0.0:32783->5432/tcp   <- c5, INTOCADO
erp-postgres          0.0.0.0:5432->5432/tcp    <- base viva, NÃO tocada nem lida
erp-redis             0.0.0.0:6379->6379/tcp    <- base viva, NÃO tocada nem lida
```

**`head_julgado` = `9989c62`** (bate com o briefing).

**Worktree: REUSO declarado** do `jur-c1v2-drill` @ `9989c62` (da titular), conforme o terreno
autoriza. Conferi que **não há junction/symlink**: `cmd /c dir /AL` na raiz do worktree devolve
`Arquivo não encontrado` (zero reparse points) e `node_modules` é diretório real com 222 entradas —
o mesmo número do `b07`, ou seja `npm ci` próprio e completo. **Nenhum cluster subido por mim,
nenhuma porta aberta:** meu mandato roda inteiro em arnês HTTP em memória
(`CORE_SAAS_PERSISTENCE=memory`), como o do ciclo 1.

**O que herdei da titular no disco:** `tests/zz-c1v2-drill.test.ts` (308 l., **não commitado e
NUNCA executado** — ela caiu indo escrevê-lo/rodá-lo). Pelo P3 **não é insumo**: li as 308 linhas
inteiras, conferi caso a caso contra as rotas e o serviço reais, e só então o executei. A saída
abaixo é **minha execução**, não uma conclusão dela.

## S1 — RE-EXECUÇÃO das três provas herdadas (P3) — **CONFIRMO as três**

### S1.a — `achados.jsonl` SEC-002 (re-execução do J1.a dela)

```
$ node -e "<parse do achados.jsonl e dump da linha SEC-002>"
linhas nao-vazias = 30 · parseiam = 30/30 · SEC-002 na linha = 9
status = "parcialmente_superado"
fechado_em presente? = false        fechado_por presente? = false
supersedido keys = por,componente_superado,componentes_abertos,contagem_aberta,pendencia_dona,verificado_em
componentes_abertos.length = 9      componente_superado chars = 2451
teste = "Técnico A não altera OS de B nem decide aprovação; gestor dentro da alçada consegue,
         solicitante não se autoaprova."

$ git show 9d44989:docs/revisoes/O6R/achados.jsonl | node -e "<mesma leitura>"
ANTES: status="fechado" · fechado_em="2026-09-02" · fechado_por="B-O6R-07a (PR na autoria; …)"
       · supersedido? false
teste ANTES = (byte-idêntico ao de agora)
```

**CONFIRMO integralmente o J1.a dela**, número a número (30/30, linha 9, 6 chaves, 9 componentes,
2451 chars). E confirmo o ponto que mais importa: **o critério de aceite original permanece
INTACTO no campo `teste`** — o bloco não afrouxou a régua que o reprovou; reverteu a declaração e
manteve a régua.

### S1.b — `REGISTRO_ACHADOS_O6R.md` (re-execução do J1.d dela)

```
$ grep -n "parcialmente superado" docs/revisoes/O6R/REGISTRO_ACHADOS_O6R.md
221 · 608 (QUA-004, pré-existente) · 798 · 815 · 818
$ sed -n '793,822p' …
l.797  "P0 15 (2 fechados, 13 abertos)"          <- histórico da Fase 5
l.800  "Atualização 2026-08-18 (B-O6R-01) … P0 15 (4 fechados, 11 abertos)"   <- histórico DATADO
l.818  "Atualização 2026-09-02, corrigida no ciclo 2 … P0 15 (4 fechados · 1 parcialmente superado
        · 10 abertos) · P1 15 (1 fechado, 14 abertos)"
```

**CONFIRMO o J1.d dela, e confirmo a defesa dela da l.800:** li o contexto e a linha abre com
*"Atualização 2026-08-18 (B-O6R-01)"* — é parágrafo histórico datado, anterior ao ciclo 2, e
registro histórico não se edita. **Não é divergência.**

### S1.c — KPI + guard de paridade (re-execução do J1.e dela)

```
$ node --test --import tsx tests/kpi-achados-paridade.test.ts
1..6 · # tests 6 · # pass 6 · # fail 0 · ec=0
$ node -e "<dump do kpis-latest.json>"
aguardando_merge = [ { id: "Ω6R-SEC-003", … } ]      <- SÓ o SEC-003; SEC-002 FORA
p0_fechados = 4 · deploy_bloqueado = true
```

**CONFIRMO o J1.e dela.** Guard rodado por MIM, 6/6, ec=0. Zero divergência nas três.

## S2 — A CAUDA que ninguém mediu: o drill das 9 rotas, RE-EXECUTADO por mim

Terreno da 1ª execução: worktree `jur-c1v2-drill` @ `9989c62` (conferido detached em `9989c62`
por `git worktree list` ANTES de rodar), arnês HTTP em memória, zero porta aberta.

```
$ node --test --import tsx tests/zz-c1v2-drill.test.ts
1..2 · # tests 2 · # pass 2 · # fail 0 · ec=0 · duration 15.4 s

### VARREDURA (21 medições sobre as 19 rotas mutantes + 2 controles):
FECHADAS (10/10 — nenhuma 2xx):
  approve 403 permission_required     reject 403 permission_required
  create  403 permission_required     mileage(:B)   403 permission_required
  checklists(:B) 403 permission_required   cancel(:B) 403 permission_required
  duplicate(:B)  403 permission_required   assign(:B) 403 permission_required
  update(:B)     403 not_assigned_to_actor   <- GUARDADA pelo bloco
  status(:B)     403 not_assigned_to_actor   <- GUARDADA pelo bloco
ABERTAS por EXECUÇÃO (3/3, as declaradas):
  attach-POST(:B)   201        comment-POST(:B) 201
  attach-DELETE(:B) 204  + EFEITO: lista 2->1 e download do anexo apagado = 404
ABERTAS declaradas por LEITURA (4/4) — eu as EXECUTEI por HTTP:
  comment-PATCH(alheio) 200 · tag-POST(alheio) 201 · tag-DELETE(alheio) 204
  comment-DELETE(alheio) 204
ALCANÇÁVEIS/env (2/2): geocode(:B) 422 · geocode-destination(:B) 422 no_destination_address
CONTROLE POSITIVO: attach-POST na PRÓPRIA OS 201 (o app de campo não travou)
```

### (a) Toda rota nomeada ABERTA responde como aberta — **SIM, 9/9**

As 3 de execução batem exatamente com o declarado (201 / 204+blob / 201). **Nenhuma das 9 respondeu
403** — que é o teste que o aceite C2·6 item 2 nomeia como reprovador. As 4 que o registro declara
por LEITURA eu ataquei por EXECUÇÃO (conferência **mais forte** que a declarada): as 4 estão
mesmo abertas. O registro é **conservador**, não otimista — declara menos certeza do que a
realidade, que é o sentido seguro do erro.

### (b) A nuance do 422 — o que é, e não muda a contagem

Meu drill mediu **422 nas DUAS** rotas de geocode; o drill do ciclo 1 mediu **200 `geocoded=false`**
no `/geocode` e **422** no `/geocode-destination`. A diferença é de FIXTURE (minha OS nasce sem
endereço de serviço; a validação de domínio mata antes), não de código. O que ambas as execuções
provam é a mesma coisa e é a única coisa que o registro afirma: **a requisição passou o gate de
permissão e não encontrou guard de objeto** — um 403 viria ANTES do 422. O diário `[C]` declara
essa nuance às claras (l.370-374) e a declaração do `achados.jsonl` afirma só *"alcance por
execução; efeito condicionado a env"* — nunca 200, nunca efeito. **A nuance não muda a contagem e
não esconde nada.**

### (c) Fronteira do 404 e dual-match, na mesma execução

```
### J2: tecnico-assign=403 · dispatcher-assign=200 (grava USER ID) · nomeado-por-userid=200/200
     · colega-não-nomeado=403 WORK_ORDER_NOT_ASSIGNED · OS-órfã=403 (fail-closed)
     · atribuído-por-PERFIL=200 (forma canônica intacta) · cross-tenant=404 WORK_ORDER_NOT_FOUND
```

## S2-bis — INCIDENTE DE TERRENO e re-execução em worktree MEU

**Entre a 1ª e a 2ª sonda o worktree `jur-c1v2-drill` foi DESTRUÍDO por outra sessão** (o
`jur-c5-arnes` saiu junto e nasceu um `jur-c2v2-red` @ `9d44989` — a cadeira C2-v2 desta mesma
junta): `git worktree list` deixou de listá-lo e `git rev-parse HEAD` de dentro dele passou a
devolver `d1fab3b` (o head da ÁRVORE PRINCIPAL — sinal de que o arquivo `.git` do worktree sumiu e
o git subiu na hierarquia). **Conferi imediatamente o dano colateral** (é a classe da lição
`feedback-no-junction-node-modules-worktrees`):

```
b07:          git rev-parse HEAD = 9989c62 · src/app.ts presente · node_modules 222
              rastreados deletados = 0
árvore princ: git rev-parse HEAD = d1fab3b · src/app.ts presente · node_modules 222
              status = só as mutações do c5 já DECLARADAS pelo inspetor (2 M + 6 ??), 0 deleções
```

**Zero dano ao b07 e à árvore principal.** Não fui eu quem removeu (não rodei `worktree remove`,
`prune`, `rm` de worktree, `reset`, `stash` nem `gc`) — registro o fato e sigo.

**Refiz o terreno como MEU:** `git worktree add --detach .claude/worktrees/jur-c1v2s 9989c62`
(3150 arquivos), **`npm ci` PRÓPRIO** (222 pacotes, ec=0), **zero junction** (`cmd /c dir /AL` →
`Arquivo não encontrado`), arnês em memória, **nenhuma porta aberta, nenhum container subido**.
Reescrevi o drill como código MEU (`tests/zz-c1v2s-drill.test.ts`) e re-executei tudo:

```
$ node --test --import tsx tests/zz-c1v2s-drill.test.ts
1..3 · # tests 3 · # pass 3 · # fail 0 · ec=0

### S2 VARREDURA: (denominador IDÊNTICO à 1ª execução, mesmos 21 resultados)
  10 fechadas 403 (8 permission_required + update/status = not_assigned_to_actor)
  attach-POST 201 · attach-DELETE 204 (lista 2->1, download 404) · comment-POST 201
  comment-PATCH 200 · tag-POST 201 · tag-DELETE 204 · comment-DELETE 204
  geocode 422 no_address · geocode-destination 422 no_destination_address
  attach-POST(própria) 201
### S3 DUAL-MATCH: tecnico-tenta-assign=403 permission_required ·
  portador-de-assign=200 (gravou USER ID) · nomeado-por-userid update=200 status=200 ·
  colega-não-nomeado=403 WORK_ORDER_NOT_ASSIGNED · OS-órfã=403 (fail-closed) ·
  forma-canônica-perfil=200 · assignedUserId-não-alarga: assign=200 patchDoA=403 ·
  cross-tenant=404 WORK_ORDER_NOT_FOUND
```

Duas execuções independentes, dois terrenos, **mesmo resultado**.

## S3 — J2: o dual-match sob ataque adversarial — **CONFORME, sem permissão-a-mais**

### S3.a — QUEM escreve `assigned_operator_id`, por EXECUÇÃO (não por leitura do gate)

```
técnico (field_technician) POST /work-orders/:id/assign        -> 403 permission_required
portador de work_orders:assign (field_dispatcher)              -> 200, gravou o USER ID
```
E o censo estático das ESCRITAS do campo em todo o `src/` (fora de teste):

```
$ grep -rn "assignedOperatorId\s*[:=]|assigned_operator_id" src/ --include=*.ts | (sem teste/dto/where)
work-order-prisma.repository.ts:531   assigned_operator_id: input.operatorId    <- método assign()
work-order.repository.ts:421          assignedOperatorId: input.operatorId      <- método assign()
```
**Dois escritores, e os dois são o mesmo método `repository.assign()`**, alcançado só por
`service.assign()` — cujos únicos chamadores são `POST /work-orders/:id/assign` (gate
`work_orders:assign`) e a ação de sync `work_order.assign` (mesma chave, conferida em
`requireActionPermission`). **O segundo ramo só concede a quem um ATRIBUIDOR nomeou.** Confirmo a
afirmação do plano — por execução E por censo, não por leitura do gate.

### S3.b — permissão-a-mais? **NÃO.** Três ataques, três recusas

- colega NÃO nomeado (`userId` ≠ `assignedOperatorId`) → **403 `WORK_ORDER_NOT_ASSIGNED`**
- OS órfã (`assignedOperatorId` nulo) → **403** — fail-closed nos DOIS ramos. E o código o
  garante estruturalmente: `atribuidoPorPerfil` exige `Boolean(operatorProfileId)` antes de
  comparar, então `undefined === undefined` não vira match.
- **ataque meu, além do roteiro:** `assign{operatorId: perfilB, userId: tecnicoA}` grava
  `assignedOperatorId=perfilB` e `assignedUserId=tecnicoA`; o técnico A **continua 403**. O
  dual-match compara com `assignedOperatorId` e **não** ganhou um terceiro ramo por
  `assignedUserId`. A superfície nova é exatamente 1 igualdade, não 2.

### S3.c — a colisão de UUID: vetor **TEÓRICO** — re-medido por mim, não herdado

A pista da titular ficou fora do arquivo dela e o P3 a desqualifica como insumo; **re-medi**:

```
$ grep -n "randomUUID|id:" src/modules/operator-profiles/operator-profile.repository.ts
1: import { randomUUID } from "node:crypto";      35:  id: randomUUID(),
$ prisma/schema.prisma:2137 (model OperatorProfile)
id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
$ operator-profile.service.ts:45-63 (create)
  monta o input campo a campo (tenantId do ATOR, userId, fullName, …) — `body.id` NUNCA é lido
```
**Confirmo a pista e vou além dela:** o id do perfil é gerado **no servidor** nos DOIS backends
(memória: `randomUUID()`; Postgres: default `gen_random_uuid()`), e o `create()` **ignora** um id
vindo do cliente. Não há caminho para o cliente ESCOLHER o id do perfil, então não há caminho para
fabricar a colisão. **Vetor teórico — a afirmação do C2·4 procede.**

### S3.d — fronteira 403 mesma-org × 404 cross-tenant — **INTACTA**

`PATCH` de técnico de OUTRA organização → **404 `WORK_ORDER_NOT_FOUND`** (não 403). O guard só
roda depois do `findById` tenant-scoped; o 403 novo não comeu o 404.

### S3.e — os 3 casos novos de `o6r07a-wo-object-scope.test.ts`, N=3 + PROVA POR MUTAÇÃO

```
$ node --test --import tsx tests/o6r07a-wo-object-scope.test.ts    (3 rodadas)
rodada 1: # tests 8 · # pass 8 · # fail 0        <- DM1, DM2, DM3 = os 3 casos novos
rodada 2: # tests 8 · # pass 8 · # fail 0
rodada 3: # tests 8 · # pass 8 · # fail 0        denominador IDÊNTICO nas 3
```

Não me contentei com o vermelho REGISTRADO no diário (que vive noutro head): **provei por mutação
no meu worktree**. Desliguei o segundo ramo (`atribuidoPorUsuario = false`, o estado pré-correção):

```
# tests 8 · # pass 5 · # fail 3 · ec=1
not ok 6 - D3/DM1 …   not ok 7 - D3/DM2 …   not ok 8 - D3/DM3 …
```

**Exatamente os 3 casos novos caem, e os 5 antigos seguem verdes** — o ramo novo é o que os
sustenta e não afrouxou nenhuma asserção anterior. Restaurei por **edição inversa exata**
(`git status --porcelain src/` = **VAZIO**) e re-medi **8/8 verde**. Isto bate com o vermelho que o
diário registrou (`pass 5 · fail 3`).

**J2 = CONFORME.** Sem permissão-a-mais; colisão de UUID teórica; fronteira 403/404 intacta;
fail-closed preservado.

---

## S4 — A DÉCIMA VIA: **ACHADO S-A1**, medido por execução

O mandato J1(b) manda procurar rota aberta FORA da lista. O censo do registro é **explicitamente
declarado** sobre 19 rotas (*"das 14 rotas mutantes do router principal … e as 5 do router de
comentários"*). **Ataquei a superfície que esse censo não cobriu: as rotas de SYNC do app**, que
mutam a MESMA linha de `work_orders`.

```
$ node --test --import tsx tests/zz-c1v2s-drill.test.ts   (S4, worktree jur-c1v2s @ 9989c62)

POST /api/v1/mobile/sync/work-order-actions
  { type: "work_order.mileage", payload: { work_order_id: <OS do colega B>, ... } }
  ator: field_technician A (NÃO atribuído à OS), mesma organização

  km-ANTES  : { start: null,   end: null,   source: null  }
  RESPOSTA  : HTTP 200 · summary { received:1, ACCEPTED:1, rejected:0 }
  km-DEPOIS : { start: 111111, end: 222222, source: "app" }   <- MUTAÇÃO REAL DA OS ALHEIA

CONTROLES na mesma execução (é isto que o torna achado, e não falso-positivo):
  a MESMA mutação pela rota DO CENSO, PATCH /work-orders/:B/mileage  -> 403 permission_required
  work_order.status_change pela MESMA via de sync -> rejected 1, WORK_ORDER_NOT_ASSIGNED
      (o guard DESTE bloco ALCANÇA a via de sync — logo a superfície não é inalcançável por desenho)
  work_order.mileage CROSS-TENANT pela mesma via  -> rejected 1, WORK_ORDER_NOT_FOUND (404 intacto)
```

**Por que existe (medido, não inferido):** `assertMutationObjectScope` tem **2 call sites**
(`update` l.852 e `changeStatus` l.1319 — `grep` meu). **`setMileage` não é um deles**, e a via de
sync a gateia com `work_orders:status`, que o técnico PORTA — enquanto a rota HTTP homônima exige
a chave dedicada `work_orders:mileage_correct`, que ele não tem. O gate forte está na rota do
censo; a via de sync entra pela porta lateral.

**ESCOPO = `pre-existente`, com evidência de DATA e ORIGEM:**

```
$ git log --date=short -S 'work_order.mileage' -- src/modules/mobile/mobile-work-order-sync.ts
eed6240  2026-07-17  feat(work-orders): Ω3F-7a — quilometragem (app preenche, base corrige) (#197)
$ git log --date=short -S 'async setMileage' -- src/modules/work-orders/work-order.service.ts
eed6240  2026-07-17  (o MESMO commit)
$ git log --date=short -S 'assertMutationObjectScope' -- …/work-order.service.ts
2d54ea2  2026-09-02  (o guard NASCE neste bloco)
$ git diff --name-only f895dd2 HEAD -- src/     -> 12 arquivos, NENHUM em src/modules/mobile/
```

A via é de **2026-07-17 (#197)** — **~7 semanas ANTES** do bloco. E `src/modules/mobile/**` **não
está** no §5 PERMITIDO do C2·5 (*"arquivo fora da lista → o dev PARA e devolve"*): o dev estava
**proibido** de consertá-la. Pelo `D-JUNTA-ESCOPO-E-CALIBRACAO` §C7.1-ter(a), classe pré-existente
**não reprova** — vira pendência nomeada com bloco dono e número publicado com N, forma e causa.

**O que É defeito de registro, e por isso o classifico `alta` e não `nota`:** o `contagem_aberta`
abre com o número **sem qualificador** — *"9 rotas mutantes alcançáveis pelo técnico sobre OS
alheia"* — e só depois nomeia o universo (os 2 routers). O dono `B-O6R-07c` foi chartered para
fechar essa lista; se a tomar por exaustiva, entrega o 07c acreditando ter fechado o SEC-002 com a
via de sync ainda aberta. **O número precisa ser lido como ESCOPADO aos 2 routers, e a superfície
de sync do app precisa entrar no censo do dono.** (Não proponho a correção — §C7.4-bis.)

**O que eu NÃO medi, dito às claras:** censei a superfície de sync só na ação `work_order.mileage`.
As demais (`/mobile/sync/checklist-actions`, `/mobile/sync/evidence-actions`,
`/mobile/checklist-runs/:runId/*` com `checklist_runs:update|complete`) eu **só li**: não há
`assertMutationObjectScope` nem verificação de atribuição em `src/modules/checklists/*.service.ts`
(grep vazio). **Declaro isso como LEITURA e não afirmo número que não medi** — o gap real é
"a superfície de sync não foi censada", e ≥1 via nela está provada aberta.

---

## S5 — J3: a errata E-a e o material da junta — **CONFORME**

**E-a presente e fiel** (`B-O6R-07-plano.md` C2·7, l.999-1000 + o texto medido no C2·4 l.873-880).
Substitui *"perde TODA mutação, inclusive a inócua"* pelo texto medido. **Confronto do texto da
errata com a MINHA execução, item a item:** *"MANTÉM anexar (201), apagar anexo alheio (204, blob
removido), comentar (201)"* — medi 201 / 204 + download 404 / 201; *"por leitura, editar/apagar/
taggear comentário alheio"* — medi 200/204/201/204 (a errata é conservadora); *"geocode e
geocode-destination alcançáveis sem guard, efeito condicionado a `GEOCODING_ENABLED`"* — medi 422
nas duas, que PROVA o alcance sem guard. **A errata bate com a medição em 9/9.**

**O texto falso não é repetido como fato em lugar nenhum:**

```
$ grep -rn "TODA mutação|toda mutação|inclusive a inócua" --include=*.md .
BRIEFING-O6R-07a.md:135          <- briefing do CICLO 1 (histórico, superado pela errata E-a)
J-O6R-07a-ciclo1.md:95,140       <- a ata, citando-o AO DECLARÁ-LO FALSO
01-…-evidencia.md:288            <- a C1, citando-o AO DECLARÁ-LO FALSO
plano l.634, l.691               <- corpo/E2 originais (append-only, superados pela E-a)
plano l.873, l.999-1000          <- a PRÓPRIA errata
```

Nenhuma ocorrência o afirma como fato vigente. O briefing do ciclo 1 e o corpo do plano são
registro histórico, e a casa não os edita — é a mesma convenção que aceitei na l.800 do
`REGISTRO_ACHADOS_O6R.md`. **E o briefing DESTA junta (ciclo 2) cita a forma corrigida** e nomeia a
caracterização antiga explicitamente como falsa.

**Pendências bem-formadas** (`agent-orchestration/controle/pendencias.md`):
- **`P-O6R-SUBRECURSO-OBJECT-SCOPE`** (l.5717) — **ALTA**, dono **`B-O6R-07c`
  (`fix/o6r07c-subresource-scope`)**, as 9 rotas **uma a uma com N/forma/causa** (3 execução ·
  4 leitura · 2 env; causas `bf456b0` #173 13/07 e `D-Ω3F-5-COMMENT`), a decisão de produto do
  `D-Ω3F-5-COMMENT` como item explícito do plano do dono, escopo `pre-existente` com evidência de
  data, e as consequências para a CHECKLIST P1 declaradas. **Bem-formada.**
- **Tensão A4** (l.5792, APPEND — a entrada original de l.2896-2924 **não foi editada**): resolução
  por dual-match, fail-closed e 404 declarados, provas referenciadas, e — o ponto que o mandato
  cobra — **`Ω6R-QUA-004` SEGUE ABERTO com o dono dele**, dito nessas palavras. **Bem-formada.**

**J3 = CONFORME.**

---

# VEREDITO DA CADEIRA C1-v2 (`jurado-b07a-c2-autorizacao-s`): **APROVADO**

| item do mandato | veredito | como provei |
|---|---|---|
| **J1** paridade DECLARAÇÃO × MEDIÇÃO do SEC-002 | **CONFORME, com o achado S-A1 (`alta`, `pre-existente`)** | J1.a/d/e re-executados (confirmo os 3); drill das 19 rotas em 2 terrenos, 9/9 abertas abertas e 10/10 fechadas fechadas |
| **J2** dual-match sob ataque adversarial | **CONFORME** | quem escreve o campo por execução + censo de escritores; 3 ataques de permissão-a-mais recusados; colisão de UUID re-medida = teórica; 403/404 intacta; prova por MUTAÇÃO dos 3 casos |
| **J3** errata E-a e material da junta | **CONFORME** | errata bate com a minha medição 9/9; texto falso não afirmado como fato em lugar nenhum; 2 pendências bem-formadas com N/forma/causa/dono |

## Por que APROVADO, e não REPROVADO pelo S-A1

Digo primeiro o que me fez hesitar, porque é o teto e não se aprova defeito real: **eu achei uma
décima via, e ela muta OS alheia de verdade.** Pesei as duas leituras:

**O que o aceite C2·6 item 2 nomeia como vermelho é textual:** *"se alguma nomeada como aberta
responder 403, o registro está errado e o item FALHA"* — o modo de falha que o plano escolheu é o
registro **inflando** a abertura para parecer minucioso, ou mentindo. Medi as 9 e **nenhuma
respondeu 403**; e medi as 10 fechadas, e nenhuma respondeu 2xx. Nos dois sentidos, dentro do
universo declarado, **a paridade é exata**.

**E o S-A1 não é a classe que reprovou o ciclo 1.** Lá, o bloco declarou **`fechado`** um P0 aberto
— tirou o achado do razão. Aqui o bloco faz o oposto: reverte para `parcialmente_superado`,
**preserva intacto o critério de aceite original** no campo `teste` (medi: byte-idêntico ao de
antes — não afrouxou a régua que o reprovou), tira o SEC-002 de `aguardando_merge`, publica 9
componentes com forma e causa, e abre pendência ALTA com bloco dono. Nenhum estado foi virado de
aberto para fechado. O S-A1 é **subcontagem dentro de um achado já declarado aberto e já com
dono** — não é declaração falsa de estado.

**E a regra do dono decide o resto.** O `D-JUNTA-ESCOPO-E-CALIBRACAO` (§C7.1-ter(a)) é fonte §A1.1
e foi escrito para exatamente isto: classe cuja origem antecede o bloco **e** está fora do escopo
permitido dele **não reprova** — vira pendência nomeada com dono e número publicado com N, forma e
causa. Tenho a evidência de data que a regra exige: a via nasceu em **`eed6240`, 2026-07-17,
#197**, ~7 semanas antes; o guard nasceu **2026-09-02** neste bloco; e `src/modules/mobile/**`
**não está** no §5 permitido — o dev estava **proibido** de tocá-la, e o diff prova que não tocou.
O veto continua inteiro para o que o bloco mexeu, e o que ele mexeu eu ataquei por execução e
está de pé.

Reprovar no ciclo-teto por uma **fronteira de censo** dentro de um achado já aberto e já dono-ado,
cuja classe é 7 semanas mais velha que o bloco e era território proibido, é precisamente o padrão
que a auditoria de 2026-08-28 mediu e que o `D-JUNTA-ESCOPO-E-CALIBRACAO` existe para parar — e
custaria quatro melhorias reais e provadas (chave dedicada de aprovação, SoD nos dois verbos,
escopo por objeto nas duas rotas mais pesadas, e o fim do amplificador de lockout anônimo).

**O que fica dito, e é vinculante para quem ler o número:** *"9 rotas"* é um número **escopado aos
2 routers censados**, não o total do produto. O `B-O6R-07c` **não fecha o `Ω6R-SEC-002`** enquanto
não censar a superfície de sync do app — onde ≥1 via está **provada aberta por execução**.

## Limpeza (§C5)

- Worktree próprio `.claude/worktrees/jur-c1v2s` @ `9989c62` (`npm ci` próprio, zero junction) —
  **removido por `git worktree remove --force`** ao fim, com os 2 arquivos de drill dentro dele.
- **Nenhum container subido, nenhuma porta aberta** (todo o mandato em arnês em memória);
  `erp-postgres`/`erp-redis` e os containers do c5 **não foram tocados nem lidos**.
- Mutação de prova desfeita por **edição inversa exata** (`git status --porcelain src/` vazio),
  e ela viveu só no meu worktree descartável — **nunca** no `b07` nem na árvore principal.
- Na árvore `b07` escrevi **só** este arquivo de evidência e o meu `…-voto.json`. **Não commitei.**
- Registro, sem ser eu o autor: o worktree `jur-c1v2-drill` foi destruído por outra sessão no meio
  do meu trabalho; conferi e **não houve dano ao `b07` nem à árvore principal**.
