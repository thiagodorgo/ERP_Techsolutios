# B-TRC-02 — crítica adversarial, rodada 2 (ÚLTIMA) — critico-trc02-opus

> **Papel:** crítico adversarial; mesma identidade da r1 (`critico-trc02-opus`), Claude Opus `claude-opus-5-5`, nível menor, DECLARADO.
> **Objeto:** v2 do plano, `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-TRC-02-plano.md` (1173 l.); v1 em `B-TRC-02-plano-v1.md`.
> **Regra:** quem acha não conserta (§C7.4-bis) — sem correção proposta. Nada editado no repo; sem Docker; sem base viva.
> **Estado:** COMPLETO — 12 evidências (R2-E1..E12); 4 bloqueia da r1 fechados; 4 achados novos (0 bloqueia, 4 ajuste); veredito APROVA COM AJUSTES.

## Evidência incremental (P1)

- **R2-E1** `git fetch -q origin; git rev-parse origin/main` → `bf83cda8` (#447, registro). `git diff --stat 3fbcaea2 origin/main -- src/integrations/traccar src/modules/telemetry prisma docker-compose.traccar.yml infra/traccar scripts tests/traccar-* .github/workflows/ci.yml` → **vazio**. Veredito parcial: a medição da v2 em `3fbcaea2` vale para a ref de hoje.
- **R2-E2** Leitura da v2 l.1-449 (resumo, §1 respostas, §2 mudanças de alvo, §3 fatos, §5 fluxos, §6.1 modelagem/migração parte 1-2). Veredito parcial: insumo dos itens 1-3.
- **R2-E3** `git show origin/main:src/modules/auth/services/identity-resolver.ts | sed -n '45,80p'` → o precedente de SAVEPOINT trata **23505/FK** e, no `catch`, **relê** e segue fail-closed; `git show origin/main:src/integrations/traccar/traccar-db.ts` → a ingestão usa `PrismaClient` + `@prisma/adapter-pg` próprio; `withTenantRlsBudget` (`src/database/rls.ts:117`) põe `lock_timeout`/`statement_timeout` locais. Veredito parcial: o mecanismo é plausível (H-10), mas o `catch` do fluxo S da v2 (l.272: "22003/23514/23503/**qualquer**") é mais largo que o precedente.
- **R2-E4** Leitura da v2 l.449-1173 (§6.1 parte 2 e rollback, §6.3-6.6, §7, §8, §9, §Q1, §13). Veredito parcial: insumo dos itens 1-3.
- **R2-E5** `git show origin/main:tests/traccar-{idempotency,resolution-race,quarantine}-db.test.ts | sed -n '81p' / '89p' / '73p'` → nos três, a lista de limpeza é **uma linha só** (`for (const table of ["traccar_ingress_receipts", …]) {`). A v2 l.611 diz "`+1` linha, `−0`"; l.881, "5 linhas `+`, 0 `−`"; l.706 (C-20), "numa linha anterior"; l.752-753 (H9), "antes no mesmo bloco". Veredito parcial: R2-A3.
- **R2-E6** `git show origin/main:src/integrations/traccar/traccar-ingestion.service.ts | sed -n '231-262'` (passos 4-6 do 01: o passo 4 procura recibo **`'position'`**; o "invisível = outra organização" só nasce no passo 6) × v2 §Q1.3 (l.1051-1063: o `owned_elsewhere` da amostra só olha recibo `'position_sample'`) × I5 (l.1097-1098: "`idempotency_key_owned_elsewhere` (recibo `position` da mesma chave semeado em B) → 0 amostra"). Veredito parcial: R2-A1.
- **R2-E7** v2 l.1042-1047 ("Global (sem `tenant_id`)… a mesma classe de desfecho cross-tenant do 01 (`owned_elsewhere`)"; "Um recibo `position_sample` **sem** amostra é impossível (os dois caem juntos)") × l.1061 (`insertSample … ON CONFLICT (fix_key) … DO NOTHING`, que **não** lança). Veredito parcial: R2-A1.
- **R2-E8** `git show origin/main:src/integrations/traccar/traccar-position.adapter.ts | sed -n '59,72p'` → o digest da posição inclui `speedKnots` (o I3 é exercitável). Veredito parcial: sem achado.
- **R2-E9** `sed -n '805p;508,510p' …/B-TRC-02-plano-v1.md` → a v1 dizia, literalmente, "o teste E12 **prova** que a chave é delivery-independente **hoje**" e "o teste E-12 … **prova** o dedupe nos dois sentidos". Veredito parcial: a contestação da A-08 não procede quanto ao fato (item 2).
- **R2-E10** `git show 'origin/main:docs/revisoes/TRACCAR/B-TRC-01-evidencias/mutations.mjs' | grep -n 'id: "MUT-(04|09|38)"'` → as três existem (l.45, 50, 79). `git grep -n -i savepoint origin/main -- src` → o único precedente de SAVEPOINT com recuperação é `identity-resolver.ts:49-77`, cujo `catch` **relê e falha fechado**; `checklist-prisma.repository.ts:458` anota que "o Prisma não cria savepoint por query em tx interativa". Veredito parcial: as citações da v2 conferem; o `catch` da v2 é mais largo que o precedente (R2-A4).
- **R2-E11** `git grep -n -i 'GRANT EXECUTE ON FUNCTION public.auth_login_candidates' origin/main -- . ':!agent-orchestration'` → hoje só aparece em `docs/deployment.md:649-650`. Depois do bloco, aparece também no demo e na **agulha do próprio teste H7**. Veredito parcial: R2-A3(iii).
- **R2-E12** `git show origin/main:src/config/env.ts | grep TRACCAR_` → `MAX_CONCURRENCY` 10 e `DB_POOL_MAX` 5: a concorrência já passava do pool no 01. Veredito parcial: limitador por rota sem achado novo (o pool continua o teto real, como declarado).

> **Limite da medição, declarado:** o código do bloco ainda não existe, e este mandato proíbe Docker e base. "Por execução", aqui, quer
> dizer: rodei os comandos acima contra a `origin/main` e chequei cada mutação contra a âncora e o teste que o plano nomeia. Não rodei as
> mutações; isso é do dev (passo 11) e da junta.

---

## 1. Os 4 `bloqueia` da r1 — fecharam?

| r1 | Situação na v2 | A mutação derruba o teste certo? | Ressalva |
|---|---|---|---|
| **A-01** teardown × FK `RESTRICT` | **FECHADO em substância.** A FK continua `RESTRICT`, os 5 arnês que ingerem posição ganham `vehicle_telemetry_events` antes de `traccar_ingress_receipts`, e o `ingest-pool-db` fica de fora, corretamente: ele não ingere. | **Sim.** A M-E43 tira a entrada da idempotency e faz o `after` dar 23503, porque a fixture tem `motion`/`totalDistance` (r1/E6). | R2-A3 (i)(ii) |
| **A-02** parser ⊄ banco → 503 | **FECHADO.** Os 7 domínios têm fonte única; `power` 0..1000 V (≤ 1 000 000 mV, cabe em int4); `hours`/`odometer`/`totalDistance` ≤ 2^53−1 em `BIGINT`; bateria arredonda e depois limita. Mais uma 2ª defesa por SAVEPOINT. | **Sim.** M-E30 → B9 (`power:-1` passa a ser aceito); M-E31 → F9 (o valor recusado, inserido direto, entra); M-E32 → F10 (503, 0 localização). Os vermelhos medem a propriedade, não a forma. | R2-A4 |
| **A-03** segredo em `event.forward.header` | **FECHADO.** O H6 aplica a regex ao nome inteiro da chave (`*forward.header`) e proíbe o literal do header fora de `${TRC_FORWARD_HEADER:?`. | **Sim.** A âncora da M-E33 (`<entry key='forward.type'>json</entry>`) é única e não é substring de `key='event.forward.type'`. O H6 fica vermelho e a guarda do 01 (l.214) verde, o que prova a lacuna. A H-2 virou fato (S-E15). | — |
| **A-04** Q1 = SIM sem caminho | **FECHADO em estrutura.** §Q1 removível; 3 motivos que guardam e 7 que não; recibo `position_sample` (o `'position'` travaria o passo 4 do 01, conferido em R2-E6); contrato 202; savepoint; `fix_key` + índice parcial; "2º índice global" retirado com prova. | **Em parte.** A M-Q1-01 → I5 está certa, mas o I5 tem um caso impossível (R2-A1a), e o "recibo órfão impossível" que o C-Q1-3/I7 assumem é falso num ramo (R2-A1b). | R2-A1, R2-A2 |

## 2. A contestação da A-08 — procede?

**Não procede quanto ao fato, e é inócua quanto ao efeito.** A v1 dizia, literalmente, que o E12 "**prova** que a chave é
delivery-independente **hoje**" (l.805) e que "prova o dedupe nos dois sentidos" (l.508-510) (R2-E9). Mas a v2 aceitou o conserto
inteiro: o E12 passa a provar só o determinismo, e a propriedade da REST virou a H-11 do B-TRC-03. A contestação não muda nada do que o
dev faz. Sem achado.

---

## 3. Achados novos (todos `dentro-do-bloco`; o que a v2 trouxe)

### R2-A1 — `fix_key`/§Q1: o I5 tem um caso impossível, e duas afirmações de propriedade são falsas · **ajuste** (requisito antes do código) · `dentro-do-bloco`

- **Evidência:** R2-E6 e R2-E7.
  - **(a) O caso `idempotency_key_owned_elsewhere` do I5 contradiz o §Q1.3.** O I5 semeia um recibo **`'position'`** da mesma chave em B e espera 0 amostra em A. Só que o passo 4 do 01 só procura `'position'` sob o GUC de A (o de B é invisível), e o "owned elsewhere" do §Q1.3 só olha recibo **`'position_sample'`**. Com a viatura de A sem despacho, o fluxo cai no passo 5, grava `position_sample` (outro `message_kind`, sem conflito no índice global) e grava a amostra. O I5 fica vermelho contra o próprio plano. A saída alternativa (dar operador a A) leva o caso ao passo 6, onde amostra nenhuma nasce em desenho algum. Aí ele passa por vacuidade e não exercita a `SAMPLE_ON_QUARANTINE_REASONS`.
  - **(b) A frase "um recibo `position_sample` sem amostra é impossível (os dois caem juntos)" (l.1046) é falsa.** A amostra usa `ON CONFLICT (fix_key) … DO NOTHING`, que **não lança**. Com a `fix_key` já existente (o índice é global, sem `tenant_id`), o recibo é gravado, a amostra devolve 0 linhas, o `RELEASE` acontece e o recibo fica órfão. Na reentrega, o §Q1.3 lê "existing ∧ digest igual → nada (amostra já existe)". É exatamente o risco que a própria l.1047 nomeia.
  - **(c) "A mesma classe de desfecho cross-tenant do 01 (`owned_elsewhere`)" (l.1042-1043) também é falsa.** No 01, a chave alheia dá **409 + linha de quarentena** (visível). No `fix_key`, o conflito é **silencioso**: no caminho aceito, a posição de A vira `stored` (204) e a amostra de A some sem rastro.
- **Alcance:** a mesma chave de fix em duas organizações só nasce pela tolerância de +5 min do `fix_in_future` combinada com uma troca de vínculo na janela. É a classe `pre-existente` do 01. Mas o desfecho silencioso e as afirmações falsas nascem neste bloco.
- **Motivo:** um teste que não pode passar e duas propriedades falsas num bloco de segurança fazem a correção nascer no dev, sob pressão de vermelho. É a patologia que a §C7.4-bis registra. E a nota de contrato da §Q1.4 ("chave de outra organização → 409") não vale para o caso que o próprio I5 monta.

### R2-A2 — Gate 7 "SIM **ou silêncio**" × reversão depois do merge = migração destrutiva · **ajuste** · `dentro-do-bloco`

- **Evidência:** l.672 (gate 7: "SIM (ou silêncio) → implementa §Q1"); l.1011-1015 (a Q1 foi **devolvida** ao dono porque o primeiro SIM veio sem o contexto da decisão 4 e da `P-TRC-LGPD`). A §Q1.7 só cobre o NÃO **antes** de escrever a migração (l.1120).
- **Motivo:**
  - **O que o silêncio faz:** enquanto a pergunta reaberta está pendente, o silêncio implementa o caminho que reduz privacidade, o oposto do "privacidade vem antes de cobertura".
  - **O que um NÃO depois do merge custa:** exige `DROP COLUMN fix_key`, `DROP INDEX`, re-estreitar o CHECK do recibo e apagar recibos `position_sample` e amostras. Isso é migração destrutiva e apagamento de dado, da família das paradas irredutíveis (§C7.5).
  - **A promessa que não se cumpre:** o "removível" só vale até o merge, e o plano não diz isso, nem o que acontece se a resposta chegar depois.

### R2-A3 — Três réguas de forma que não passam como escritas · **ajuste** · `dentro-do-bloco`

- **Evidência:** R2-E5 e R2-E11.
  - **(i) A régua "+1/−0" é impossível em 3 dos 5 arquivos.** Em `idempotency` (l.81), `resolution-race` (l.89) e `quarantine` (l.73), a lista de limpeza está **numa linha só**. A edição pedida pela própria tabela do §7.2 produz `+1 −1`. Então "`+1` linha, `−0`" (l.611) e "5 linhas `+`, 0 `−`" (l.881, bateria passo 4) não podem passar. Cumprir a letra exigiria reformatar o array, o que gera mais linhas.
  - **(ii) O C-20 e o H9 se contradizem.** O C-20 (l.706) diz "numa linha **anterior**", o que é impossível nas mesmas três listas. O H9 (l.752-753) diz "**antes no mesmo bloco**". Dois enunciados para o mesmo teste.
  - **(iii) O H7 conta a si mesmo.** Ele exige o literal do `GRANT` em "**exatamente um** arquivo do repositório", com só `docs/` fora da varredura (l.302-305). Mas o arquivo do próprio H7 (`tests/traccar-event-topology.test.ts`) carrega a agulha, a menos que ela seja montada por partes, e o plano não diz isso. Lido ao pé da letra, o resultado é 2 arquivos e vermelho.
- **Motivo:** são critérios que falham por construção, ou que o dev "acerta" reescrevendo a régua. É a classe que a auditoria de 2026-08-28 mediu como bloqueante de processo. Aqui é ajuste porque a propriedade de fundo (teardown FK-safe; `GRANT` confinado) está certa e tem mutação própria.

### R2-A4 — O SAVEPOINT engole qualquer erro, e a borda aceita do F9 pode não passar pelo caminho de produção · **ajuste** · `dentro-do-bloco`

- **Evidência:**
  - **O catch da v2:** l.272 ("22003/23514/23503/**qualquer**") e a forma exata na l.575-578 (`catch (error)` sem filtro → `ROLLBACK TO` → `warn` → segue). O §Q1.2 faz o mesmo (l.1044-1045).
  - **O precedente:** o único SAVEPOINT com recuperação no repositório (`identity-resolver.ts:74-79`, R2-E10) **relê e falha fechado**; não registra e segue.
  - **O F9:** l.777-779 diz que o valor aceito na borda "insere sob o papel efêmero", mas não diz que passa por `insertSample` (o `$queryRaw` com template e o adaptador `pg` de produção). Só o recusado é dito "direto (sem parser)".
- **Motivo:**
  - **(i) O que o catch transforma em `warn` + 204/202:** a FK de 4 colunas que a v2 acabou de pôr no banco (A-12, `23503`), o `WITH CHECK` do RLS (`42501`) e as falhas de contenção (`55P03`/`57014`). Nenhum teste distingue "amostra recusada por domínio" de "amostra recusada por isolamento"; o sinal de um defeito de isolamento no caminho da amostra fica restrito a um `code` num `warn`.
  - **(ii) O que o F9 não pega:** se a borda aceita (2^53−1 em `BIGINT`, 1 000 000 em `INTEGER`) falhar só pela tipagem do parâmetro no caminho real, o savepoint engole a falha. B9 e F9 seguem verdes, e a amostra some exatamente na borda que o A-02 mandou provar.

---

## 4. Itens atacados sem achado

- **Linha de teardown × "byte a byte" da v1:** a mudança de alvo está declarada (§2 #1, §7.3, `D-TRC02-ESCOPO`). A alternativa `CASCADE` foi descartada com razão (l.488), e o precedente do repositório confere (r1/E15). Sem achado de mérito; só a régua de forma (R2-A3).
- **Limitador por rota (A-06):** `eventLimiter?` é aditivo; o C11 prova que o app de produção passa duas instâncias, e a M-E36 morde. A concorrência já passava do pool no 01 (R2-E12). Sem achado.
- **Chave do evento com coordenada (A-07):** o A15 e a M-E39 medem. Com o mesmo ms e a mesma coordenada mas `fixTime` diferente, o digest difere e vira 409 visível, não colisão silenciosa. Sem achado.
- **FK de 4 colunas (A-12):** o G10 e a M-E40 medem. O índice único novo no recibo é aditivo; não há produção. Sem achado.
- **Rollback (A-13):** a ordem é executável (a dependente cai primeiro, para se não houver zero recibos ≠ `'position'`, limpa `_prisma_migrations`). Sem achado.
- **Q2/H7 (A-15):** o confinamento é medido (H7, guard 8, M-E34/M-E35), salvo R2-A3(iii).
- **Citações:** MUT-04, MUT-09 e MUT-38 existem (R2-E10); o digest da posição tem `speedKnots`, logo o I3 é exercitável (R2-E8).

---

## Veredito: **APROVA COM AJUSTES**

- **`bloqueia`: 0.** Os 4 da r1 estão fechados em substância, e a mutação nova de cada um derruba o teste certo.
- **`ajuste`: 4 achados novos** (R2-A1 … R2-A4), todos `dentro-do-bloco`. Esta é a última rodada de crítica, então eles viram **requisitos explícitos do plano antes do código** (emenda escrita, `D-EMENDA-ANTES-DO-CODIGO`):
  - **R2-A1:** é o que mais importa. O I5 hoje não pode passar, e as l.1042-1047 afirmam duas propriedades falsas.
  - **R2-A2:** decidir o que vale enquanto a Q1 devolvida está pendente, e o que acontece se o NÃO chegar depois do merge.
  - **R2-A3:** acertar as três réguas de forma.
  - **R2-A4:** deixar explícito o que o `catch` do savepoint pode engolir, e por qual caminho a borda aceita do F9 é inserida.
- **A-08:** a contestação não procede quanto ao fato, mas é inócua (o conserto foi aceito).
- **Robustez:** o núcleo de isolamento continua no banco e ficou mais forte: FK de 4 colunas, domínio fechado e H6. Não achei vazamento entre organizações. O que sobra está na §Q1 (o `fix_key` global e silencioso) e em réguas de forma.

> Crítico: `critico-trc02-opus` (Claude Opus `claude-opus-5-5`, nível menor, declarado). Sem correção proposta (§C7.4-bis). Nada editado no repositório, sem Docker, sem base viva, sem `tail -f`. Retomado depois do esgotamento do limite (06:20); o parcial de 1675 bytes foi preservado e continuado no mesmo arquivo.
