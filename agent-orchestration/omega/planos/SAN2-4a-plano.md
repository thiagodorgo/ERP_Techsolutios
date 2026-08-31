# SAN2-4a — MEDIR o arnês: três números com N, forma e causa — e NENHUM conserto

> **Plano do `planejador-mestre`** (Fable por contrato, `D-PLANEJADOR-MODELO-FABLE`), gravado seção a
> seção em 2026-08-31. Branch `chore/san2-4a-medir-arnes` (da `main` = `c9fd3a1`), worktree
> `.claude/worktrees/san2-r`, head no momento do plano `26ede73`. Autorização de start: porteiro
> pós-merge do #364 = **LIBERADO COM RESSALVA**
> (`agent-orchestration/omega/juntas/votos/SAN2-3/00c-porteiro-pos-merge-364.md`), e este plano
> incorpora a ressalva dele como obrigação do PR (§1.6). Quem planeja não desenvolve nem vota
> (§C7.4-bis) — outro agente executa este plano.

## §0 — A natureza do bloco, dita antes de qualquer outra coisa

O SAN2-4 foi partido em **4a (MEDIR)** e **4b (CORRIGIR)** de propósito. Este bloco **não conserta
nada**: nem uma linha de `tests/`, `scripts/`, `src/`, `prisma/`, `.github/` — nem "de passagem",
nem "já que estou aqui", nem "é só um caractere". Quem mede e conserta na mesma passada convence a
si mesmo do diagnóstico enquanto escreve a correção — é a classe que a `D-JUNTA-SEPARACAO-DE-PAPEIS`
existe para impedir, medida quatro vezes na repaginação do painel (as 4 instâncias nasceram em
correções, nenhuma no código original). O produto deste bloco é **números com N, forma e causa**,
registrados onde o 4b e o ciclo 5 do financeiro vão consumi-los. Se a medição achar defeito novo:
**pendência nomeada com dono, jamais conserto** — o executor deste plano é *achador* no sentido do
§C7.4-bis, e achador não conserta.

## §1 — Objetivo, ator, fluxo, contrato, modelagem, baseline

**1.1 Objetivo.** Produzir as três medições que o porteiro do #364 nomeou como o conteúdo do bloco:
(1) a intermitência de `tests/authority-portal.test.ts` com **N≥10 e forma declarada**
(`P-ARNES-AUTHORITY-PORTAL-INTERMITENTE` hoje tem UMA medição de 1/2 e nada mais);
(2) o veredito **por execução** entre as duas listas contraditórias da "bateria barata" que declaram
o mesmo denominador 37 (`P-REG-BATERIA-BARATA-DUAS-LISTAS`) — a receita de reprodutibilidade que o
ciclo 5 vai reusar; (3) o **censo do mecanismo** dos roles `rls_test_`: quem cria, com que
privilégio, quem derruba (resposta medida: ninguém), como nasce o órfão — em **cluster descartável
próprio**, com o número vivo (68) declarado como CARREGADO e não re-verificado (§3.3-F10).

**1.2 Ator.** Executor: uma instância dev designada pelo orquestrador (não este planejador).
Leitores-alvo do artefato: o **SAN2-4b** (quem corrige recebe daqui o diagnóstico que não escreveu),
a **junta do ciclo 5 do `B-O6R-02`** (que reusa a forma da bateria barata no D29 do plano dela) e a
**junta** que decidirá o destino das 68 órfãs (`P-ARNES-RLS-TEST-FORA-DO-SWEEP`).

**1.3 Fluxo origem→destino.**
1. Pendências com medição faltante (`pendencias.md`) → **`agent-orchestration/omega/medicoes/SAN2-4a-medicao.md`**
   (NOVO — relatório canônico, com toda tabela rodada-a-rodada) → **apensos** datados (§A2, texto
   original intocado) nas quatro pendências alvo → **errata** no registro que a execução contradisser
   (`status-geral.md` l.33 e/ou a lista da seção EMENDAS de `pendencias.md`).
2. Ressalva do porteiro do #364 → `Kpis/kpis-history.json` (backfill da entrada SAN2-3) e
   `Kpis/kpis-latest.json` (§1.6).
3. Plano → inspetor de terreno → junta (§8) → PR → porteiro pós-merge.

**1.4 Contrato REST: N/A declarado.** Nenhuma rota, payload ou código de status nasce ou muda —
nenhum 404/422/409 a definir. Diff vazio em código é verificação da bateria (§6.1).

**1.5 Modelagem: N/A declarado, com o princípio aplicado.** Nenhum model, migration, Decimal ou
timestamptz. O princípio que sobra é o do delete lógico aplicado a REGISTRO: erratas e apensos
datados, nunca reescrita (§A2) — e, no terreno, **nenhum objeto derrubado fora do teardown escopado
dos clusters descartáveis** (o incidente de mass-delete de 26/07 é a contraprova permanente).

**1.6 Ressalva do porteiro que ESTE PR carrega (obrigação, não opção).** Backfill §C3.5 da entrada
SAN2-3: `pr: 364` · `merge_commit: "c9fd3a1"` · `approved_head: "23d9227"` — o head **julgado da ata**
`J-SAN2-3.md` l.4, NÃO o headRefOid que o GitHub registra (mesma lógica dos backfills do #362/#363).
Aplicar na última entrada de `Kpis/kpis-history.json` (hoje com os 3 campos `null`, medido no §2.6)
e nos campos correspondentes de `Kpis/kpis-latest.json`, com `backfill_note` explicando o porquê do
head da ata. A entrada NOVA do SAN2-4a nasce com os 3 campos `null` (§C3.5, autoria) e
`blocks_completed` 153→154 (o merge do SAN2-3/#364, como a entrada dele anunciou: "sobe para 154 só
quando o SAN2-3 mergear"); 155 só quando o SAN2-4a mergear.

**1.7 Baseline N de testes e meta M≥2N — argumentado, não fingido.** O bloco **não adiciona teste**
(adicionar teste = tocar `tests/`, proibido no §5; e um teste novo seria conserto de arnês, que é o
4b). Baseline reexecutado de verdade: **N = 16** casos (`tests/kpi-dashboard-charts.test.ts`, único
guard que o diff exercita — os JSONs de KPI mudam). A quota M≥2N se cumpre como no precedente
SAN2-3, aprovado 3×0: **prova dobrada por bateria de medição** — ≥ 32 execuções-com-veredito
registradas (30 da F1 sozinha, mais F2/F4/F5/F7/F8/F9), cada uma com ec, denominador e log nomeado.
A junta pode derrubar este argumento; o plano o declara em vez de escondê-lo (P9: não afirmar
propriedade que a entrega não tem).

## §2 — Diagnóstico do que JÁ se sabe (comandos executados por este planejador, 2026-08-31, worktree `san2-r` em `26ede73`)

**2.1 — Alvo 1: a pendência tem UMA medição, e o teste é memory-only.**
`P-ARNES-AUTHORITY-PORTAL-INTERMITENTE` (pendencias.md l.3890-3900): falha `ERR_ASSERTION true !== false`
em `tests/authority-portal.test.ts:162` em **1 de 2** rodadas da suíte inteira do jurado do B-O6R-ARNES;
a própria pendência exige *"N≥10 isolado antes de qualquer correção"*. Lido o arquivo
(`sed -n '150,180p' tests/authority-portal.test.ts` + cabeçalho): o teste seta
`CORE_SAAS_PERSISTENCE=memory` na l.7 e **não usa `DATABASE_URL`** — a intermitência pode ser medida
sem banco. A l.162 é `assert.equal(await verifyPassword("senha-forte-123", tampered), false)` onde
`tampered = hash.slice(0, -1) + (hash.at(-1) === "A" ? "B" : "A")`. Fato de código relevante (lido em
`src/modules/authority/authority-password.ts:58`): o hash termina em `derived.toString("base64")` com
`keylen=32` — 32 bytes não são múltiplo de 3, o último caractere do base64 carrega bits parciais/padding.
**Isto é HIPÓTESE de causa, não causa** — a sonda F3 (§3.1) a confirma ou derruba por execução; o plano
a registra para que o medidor saiba o que capturar quando a falha vier.

**2.2 — Alvo 2: são TRÊS registros vivos, não dois — e os três afirmam 37 por execução.**
- `agent-orchestration/docs/status-geral.md` l.33 (lido): lista de **7** arquivos com contagem por
  arquivo — `audit-security` (1) · `auth-identity-backfill-db` (6) · `auth-identity-link-events-db` (5) ·
  `auth-identity-role-real-db` (10) · `impound-process-checklist-link-schema` (5) ·
  `rls-tenant-isolation` (1) · `vehicle-identity-schema` (9) = 37 — e a sentença *"nenhuma combinação
  de 6 que contenha as vítimas nomeadas fecha 37"*.
- `pendencias.md` l.3441-3448 (EMENDAS do B-O6R-ARNES, lido): lista de **6** arquivos
  (`audit-security` · `auth-identity-backfill-db` · `auth-identity-links-db` · `rls-tenant-isolation` ·
  `vehicle-identity-schema` · `impound-process-checklist-link-schema`), N=13 PRÉ 7/13 vermelhas e PÓS
  13/13 com **denominador 37 idêntico**.
- `agent-orchestration/omega/planos/B-O6R-02-ciclo5-plano.md` §0.a (lido): o plano do ciclo 5 declara
  a MESMA lista de 6 como forma do D29 e mediu **N=13 com tests=37** (r13 caiu 37→32 por aborto XX000).
Aritmética que a medição decide: se `auth-identity-links-db` tiver **15** testes, AS DUAS listas fecham
37 (1+6+15+1+9+5) e a sentença falsa é só a do status-geral. Contagem estática não responde:
`grep -cE '^\s*(test|it)\(' tests/<f>.test.ts` nos 8 candidatos devolve 2·2·2·3·2·6·2·10 — números que
contradizem as contagens declaradas (subtestes aninhados invisíveis ao grep). **Só execução conta teste.**
Os 4 arquivos em disputa existem todos (`ls tests/auth-identity-{links,link-events,role-real,backfill}-db.test.ts`).

**2.3 — Alvo 3: criador único, teardown no mesmo lock, e exclusão do sweep POR ESCRITO.**
`grep -rn "rls_test_" tests/ src/ scripts/` devolve 4 arquivos; o único **criador** é
`tests/rls-tenant-isolation.test.ts:25` — `rls_test_${Date.now()}_${random}` com `CREATE ROLE … LOGIN`
+ GRANT USAGE ON SCHEMA + GRANT SELECT/INSERT/UPDATE/DELETE ON ALL TABLES + GRANT ON SEQUENCES, tudo
dentro de `withRoleCatalogLock` (l.31-40); o teardown `DROP OWNED BY`/`DROP ROLE IF EXISTS` vive nas
l.3149-3150, também sob lock — logo **órfã só nasce quando o processo morre entre o CREATE e o DROP**.
O varredor (`tests/helpers/auth-identity-fixture.ts:105-111`, `SWEPT_ROLE_FAMILIES`) cobre
`o6r_b01 · o6r_clone_owner · audit_rls · vid_rls_test · vid_link_rls` e **exclui `rls_test_` por
decisão consciente escrita** (l.94; pendência `P-ARNES-RLS-TEST-FORA-DO-SWEEP`, que também registra o
porquê: um sweep que a alcançasse seria a classe do incidente de mass-delete de 26/07). O número
**68 órfãs vivas, todas com LOGIN** é da base do dono, medido em 2026-08-18
(`P-O6R-ARNES-ISOLAMENTO` l.3296-3298: 81 roles não-sistema, 74 com LOGIN, até 460 privilégios de
tabela cada) e reafirmado em 28/08 — **nunca re-verificado desde então, e este bloco não pode
verificá-lo** (base viva intocável, §5).

**2.4 — Terreno: portas, containers, migrations, Node.**
`P-SAN2-2-PORTA-55432-RESERVADA` (l.4289-4340): 55432 cai na faixa de exclusão dinâmica do
Windows/Hyper-V (`netsh … show excludedportrange` mostrou 55353-55452); o SAN2-2 contornou com
**56432/56379**. As faixas são DINÂMICAS — a lição durável é consultar o `netsh` antes de fixar porta.
`node -v` = **v20.19.5**. `ls prisma/migrations | wc -l` = **103** (na `main`; os "105" do plano do
ciclo 5 eram da branch do financeiro). `docker ps`: `erp-postgres`/`erp-redis` Up (healthy) — e este
bloco não os toca nem para leitura.

**2.5 — O que o repositório já fixou sobre medição honesta (e este plano herda).**
P8 de `P-O6R-ARNES-ISOLAMENTO`: *"verde em N execuções não é prova sem N e forma declarados"*.
`D-JUNTA-ESCOPO-E-CALIBRACAO` §(c): não medir conteúdo de commit com `git archive`+`tar` sob
`core.autocrlf=true`; armadilha do SAN2-3: `md5sum` e `git status` MENTEM sobre arquivo regenerado em
LF — só comparação EOL-neutra responde. Junction/symlink de `node_modules` entre worktrees: PROIBIDA
(incidente de 26/08). Este worktree tem `npm ci` próprio.

**2.6 — KPI: onde o backfill cai.** `node -e` sobre `Kpis/kpis-history.json`: última entrada =
SAN2-3, `pr/merge_commit/approved_head` **null**, `blocks_completed 153`; `Kpis/kpis-latest.json`
`release` idem (3 nulls). `node scripts/kpi-freeze.mjs --check` = "em dia (snapshot 2026-08-30)", ec=0
— os JSONs mudam neste PR, então o freeze precisa ser regravado e re-conferido (§6.3).

## §3 — COMO medir cada um dos três (N, forma, critério de "medição suficiente")

### 3.0 — Arranjo de terreno, ANTES de qualquer medição (fail-closed)

1. **Consultar as faixas excluídas primeiro:** `netsh interface ipv4 show excludedportrange
   protocol=tcp`, transcrever a saída no relatório, e escolher as 3 portas FORA de toda faixa
   listada — preferência **56432** (pg A), **56433** (pg B) e **56379** (redis), como o SAN2-2; se
   alguma cair em faixa, a porta escolhida e o porquê entram no relatório. É o critério de fechamento
   de `P-SAN2-2-PORTA-55432-RESERVADA` sendo executado, não só citado.
2. **DOIS clusters Postgres descartáveis + um Redis**, para as medições não se contaminarem:
   - `san2-4a-pg` (postgres:16, porta A) — exclusivo do **alvo 2** (denominadores). Nele ninguém roda
     sonda de aborto nem cria role sintética.
   - `san2-4a-pg2` (postgres:16, porta B) — exclusivo do **alvo 3** (censo/aborto/órfãs). É sujo por
     desenho; nunca serve de base a contagem de denominador.
   - `san2-4a-redis` (porta C) — `REDIS_URL` das rodadas do alvo 2.
   Cada pg recebe `npx prisma migrate deploy` com ec=0 e **103** migrations aplicadas (conferir e
   transcrever a contagem). O alvo 1 não usa banco nenhum.
3. **Base viva:** `erp-postgres`/`erp-redis` — **zero comandos, nem leitura**. `DATABASE_URL` e
   `REDIS_URL` só por env explícita apontando para os descartáveis, nunca herdada de `.env`.
4. **Higiene de medição:** exit code capturado por variável imediatamente após cada comando; saída de
   toda rodada em arquivo próprio no scratchpad (`san2-4a-<alvo>-r<NN>.log`); nenhum número
   transcrito de memória; rodada vermelha CONTA no N (descartar vermelho é maquiar); toda comparação
   de arquivo regenerado é EOL-neutra (§2.5). Node v20.19.5 declarado em cada tabela.
5. **Escrita incremental:** o relatório `SAN2-4a-medicao.md` é criado ANTES da primeira rodada e cada
   tabela é gravada em disco ao fim de cada forma (F1, F2, ...) — dezenas de agentes caíram por
   `server_error` em 29-31/08; o que fica só em contexto não sobrevive.

### 3.1 — Alvo 1 · intermitência do `authority-portal` (a pendência exige N maior ou igual a 10; este plano exige mais)

- **F1 — isolado, forma canônica do runner:** `node scripts/run-backend-tests.mjs
  tests/authority-portal.test.ts`, **sem** `DATABASE_URL` (o arquivo seta
  `CORE_SAAS_PERSISTENCE=memory` na l.7), **N=30** rodadas sequenciais. Por rodada: ec, denominador
  (tests/pass/fail/skipped), duração; TAP completo salvo. Em falha: transcrever a linha da asserção,
  a mensagem inteira e o nome do teste.
- **F2 — sob contenção declarada** (aproxima a forma do jurado, que viu o 1/2 na suíte inteira):
  mesma invocação, **N=10**, com carga sintética declarada — `availableParallelism()-1` processos
  Node em busy-loop vivos durante toda a rodada (sobem antes, morrem depois; PIDs no log). Não é a
  suíte inteira (custo proibitivo, e contaminaria o N com os defeitos já medidos do lote); é uma
  forma DECLARADA de starvation de CPU, publicada como tal — quem comparar com o 1/2 do jurado sabe
  que as formas diferem.
- **F3 — sonda de causa** (scratchpad, importando de `src/` sem editar nada): script que importa
  `hashPassword`/`verifyPassword` de `src/modules/authority/authority-password.ts` e replica byte a
  byte o tamper das l.160-162 do teste (`FAST_PARAMS`), **100.000 iterações no mínimo**. Registrar:
  distribuição do último caractere do hash (a hipótese §2.1 prevê `=` sempre — medir, não assumir);
  quantos `verifyPassword(tampered)` devolvem `true`; para cada `true`: hash íntegro, tampered e
  comprimentos dos buffers decodificados. Controles no mesmo loop: senha certa devolve `true`
  (esperado 100%) e senha errada devolve `false` — controle falhou = sonda quebrada, rodada não vale.
  Sondar também os dois malformados das l.164-165, 10.000 iterações.
- **Medição suficiente =** um de dois desfechos, ambos válidos, ambos encerrando o 4a:
  (i) **1 ou mais falhas capturadas** em F1/F2/F3 → publicar taxa por forma (x/30, x/10, x/100k), a
  asserção exata, os inputs capturados e a **causa nomeada por execução** — ou, se a captura não
  bastar para nomear, "capturado sem causa nomeada", com o material bruto transcrito e sem causa
  inventada; (ii) **0 falhas** → publicar 0/30 + 0/10 + 0/100k com formas e máquina, e a emenda na
  pendência diz que a única medição vermelha continua sendo a do jurado (1/2, suíte inteira, máquina
  dele) — o 4b decide de posse dos DOIS dados. Nenhum desfecho autoriza conserto.

### 3.2 — Alvo 2 · as duas listas da "bateria barata" (a receita que o ciclo 5 vai reusar)

Forma comum: `node scripts/run-backend-tests.mjs <arquivos>`, `DATABASE_URL` apontando para
`san2-4a-pg`, `REDIS_URL` para `san2-4a-redis`, `CORE_SAAS_PERSISTENCE` **não exportada**, Node
v20.19.5 — a mesma forma declarada nos três registros do §2.2.

- **F4 — denominador POR ARQUIVO:** cada um dos **8** candidatos (união dos 6 com os 7), sozinho,
  **N=3** por arquivo (N=5 se o denominador variar entre as 3, e a variação vira achado com log).
  Publica a tabela arquivo → denominador que decide a aritmética das listas.
- **F5 — as duas listas completas:** lista-6 (`pendencias.md` EMENDAS + plano do ciclo 5 §0.a) e
  lista-7 (`status-geral.md` l.33), **N=5 cada**, sequencial. Por rodada: ec, denominador, contagem
  de `XX000`/`unhandledRejection` no log. Pós-arnês o esperado é 5/5 ec=0 e denominador estável — se
  aparecer `XX000` ou queda de denominador, é ACHADO (a classe voltou ou nunca fechou), registrado
  com o log, jamais consertado aqui.
- **Reconciliação aritmética:** a soma dos denominadores F4 dos membros tem de bater com o
  denominador F5 da lista. Se não bater, o paralelismo do runner interfere na contagem — achado
  próprio, com N elevado a 10 na lista divergente antes de publicar.
- **Medição suficiente =** os DOIS denominadores publicados com N e forma; a sentença do
  `status-geral.md` l.33 ("nenhuma combinação de 6 que contenha as vítimas nomeadas fecha 37")
  **confirmada ou derrubada por execução**; **errata datada apensada** (§A2 — o texto original fica)
  no registro que a execução contradisser, nomeando a medição que a produziu; e a linha final que o
  ciclo 5 precisa: "a forma do D29 é ESTA lista, com este denominador, medido em N=5 por lista + N=3
  por arquivo". Desfecho possível e legítimo: as duas listas fecham 37 (basta
  `auth-identity-links-db` medir 15) — nesse caso a errata cai só na sentença falsa, e a receita
  publicada nomeia UMA lista canônica (a de 6, que é a que o plano do ciclo 5 já declara no §0.a e
  já mediu em N=13), com a outra registrada como forma alternativa equivalente.
  `P-REG-BATERIA-BARATA-DUAS-LISTAS` **fecha por este bloco**: a medição prescrita no "Como fechar"
  dela é exatamente esta, o mandato do SAN2-4a a assumiu por escrito, e o apenso de fechamento
  registra a re-atribuição de dono (ao ciclo 5 resta o REUSO da forma publicada).

### 3.3 — Alvo 3 · censo dos roles `rls_test_` (cluster `san2-4a-pg2`; a base viva NÃO é alvo)

- **F6 — censo do mecanismo, por leitura com linha citada:** enumerar criadores
  (`grep -rn "rls_test_" tests/ src/ scripts/`), o privilégio concedido (as 4 GRANTs de
  `tests/rls-tenant-isolation.test.ts:31-40`), o teardown (l.3149-3150, no mesmo lock) e a exclusão
  do sweep (`tests/helpers/auth-identity-fixture.ts:94-118` + `SWEPT_ROLE_FAMILIES` l.105-111). Já
  esboçado no §2.3; o executor re-confere no head dele e transcreve.
- **F7 — caminho feliz não vaza:** `node scripts/run-backend-tests.mjs
  tests/rls-tenant-isolation.test.ts` no pg2, **N=5**; snapshot de `pg_roles` (roles não-sistema)
  antes e depois de cada rodada. Esperado delta 0 em 5/5; qualquer delta diferente é achado com log.
- **F8 — gênese do órfão, por execução:** iniciar a suíte e matar o processo (SIGKILL) na janela
  pós-CREATE/pré-teardown — janela detectada por polling de `pg_roles` a 10-20 Hz até aparecer
  `rls_test_%`, então kill. **N=5 tentativas.** Publicar: quantas produziram órfã (x/5); para cada
  órfã: `rolcanlogin`, contagem de privilégios de tabela (`information_schema.role_table_grants`) e
  o timestamp embutido no nome — o nome carrega `Date.now()`, fato que permitirá DATAR cada uma das
  68 quando a recontagem supervisionada for autorizada. Depois: rodar a suíte inteira 1 vez e o
  caminho do varredor, e provar que a órfã **sobrevive** (nada a recolhe).
- **F9 — prova de que NENHUM mecanismo derruba a família, com contraprova:** no pg2, criar por SQL
  direto uma role sintética `rls_test_<ts de 2h atrás>_deadbeef` e uma `audit_rls_<mesmo ts>_deadbeef`;
  invocar o varredor via runner de scratchpad que importe o helper de
  `tests/helpers/auth-identity-fixture.ts`; esperado: a `audit_rls_` (família coberta, mais velha que
  60 min) é recolhida e a `rls_test_` sobrevive. **N=2.** A contraprova é o vermelho-controle: se a
  `audit_rls_` também sobreviver, a sonda não invocou o sweep de verdade e a rodada não vale.
- **F10 — o número vivo, dito sem maquiagem:** "quantos existem HOJE" na base do dono **não será
  medido** — `erp-postgres` é intocável por regra deste bloco, nem leitura. O relatório publica: o
  último valor medido **68** (2026-08-18, `P-O6R-ARNES-ISOLAMENTO` l.3296; reafirmado 28/08 em
  `P-ARNES-RLS-TEST-FORA-DO-SWEEP`) como **CARREGADO, com data e fonte, não re-verificado**; a taxa
  de gênese medida em F8; e o que resta, nomeado para a junta das 68 (recontagem supervisionada
  única, fora de lote de teste — a decisão que `P-ARNES-RLS-TEST-FORA-DO-SWEEP` já guarda). Publicar
  68 como se fosse de hoje seria exatamente a classe que esta rodada existe para exterminar.
- **Medição suficiente =** criadores enumerados com arquivo e linha; F7 com N e deltas publicados;
  1 ou mais órfãs produzidas e caracterizadas em F8 (se 0/5, publicar 0/5 mais a duração da janela
  medida pelo polling — também é medição); F9 com contraprova verde; e o CARREGADO do F10 rotulado
  como carregado.

### 3.4 — Teardown obrigatório (parte da medição, não cortesia)

`docker rm -f san2-4a-pg san2-4a-pg2 san2-4a-redis` ao final (ou em qualquer aborto), `docker ps`
transcrito sem `san2-4a-*`, scratchpad varrido dos logs já transcritos. Nada disso toca
`erp-postgres`/`erp-redis` nem arquivo rastreado. Linha de limpeza §C5 no fechamento do PR.

## §4 — O que distingue MEDIR de ADIVINHAR (a prova de honestidade, item a item)

1. **Todo número publicado carrega N, forma, env, versão do Node e log nomeado** (P8 de
   `P-O6R-ARNES-ISOLAMENTO`, cumprido nesta entrega como o arnês cumpriu na dele). Número sem essa
   quádrupla não entra no relatório — entra na lixeira.
2. **Rodada vermelha conta no N.** A taxa é x/N sobre TODAS as rodadas executadas, na ordem em que
   saíram. Re-rodar até dar verde e publicar o verde é a definição operacional de adivinhar.
3. **Clusters separados por papel** (§3.0.2): quem conta denominador nunca compartilha catálogo com
   quem fabrica órfã. Sem isso, o alvo 3 contamina o alvo 2 e nenhum dos dois números significa nada
   — é a mesma razão do cluster-por-jurado da `D-INSPETOR-TERRENO-JUNTA`.
4. **Controles e contraprovas embutidos:** F3 tem controle positivo e negativo no mesmo loop; F9 tem
   vermelho-controle (a família coberta TEM de ser recolhida, senão a sonda não invocou o sweep);
   F4×F5 têm reconciliação aritmética. Medição sem controle é fé com tabela.
5. **Hipótese rotulada de hipótese até a execução decidir:** o §2.1 (base64/último caractere) e o
   §2.2 (links-db = 15) estão escritos como hipóteses, com a sonda que os decide nomeada. O medidor
   que "confirmar" uma hipótese sem a sonda correspondente está adivinhando com passos extras.
6. **Contagem estática declarada não-prova:** o próprio §2.2 mostra o grep mentindo (2·2·2·3·2·6·2·10
   contra 1·6·—·5·10·5·1·9 declarados). Nenhuma contagem de teste deste bloco vem de grep — todas
   vêm do sumário de execução do runner.
7. **O que NÃO foi medido é dito com esta letra:** F10 (o 68 vivo) e a forma exata do jurado (suíte
   inteira na máquina dele) ficam publicados como não-medidos, com o porquê. Relatório que só lista o
   que mediu esconde o denominador da própria honestidade.
8. **Separação de papéis:** quem mediu não conserta (§0, §C7.4-bis); os achados novos nascem como
   pendência com dono, e o 4b recebe o diagnóstico de alguém que não escreverá a correção.
9. **Reprodutibilidade por terceiro:** cada forma F1-F9 está escrita de modo que o inspetor de
   terreno ou um jurado re-execute sem perguntar nada a ninguém — comando, env, N, porta, cluster e
   critério. É o teste final: medição que só o medidor reproduz é anedota.

## §5 — Escopo (caminhos exatos) — e a PROIBIÇÃO DE CORRIGIR, por extenso

### 5.1 Permitido (lista fechada; fora dela = fora do bloco)

- `agent-orchestration/omega/medicoes/SAN2-4a-medicao.md` — **NOVO**; diretório novo; relatório
  canônico com todas as tabelas rodada-a-rodada e o diário de terreno.
- `agent-orchestration/omega/planos/SAN2-4a-plano.md` — este arquivo (já na branch).
- `agent-orchestration/controle/pendencias.md` — **apensos datados** (§A2, texto original intocado)
  em: `P-ARNES-AUTHORITY-PORTAL-INTERMITENTE` (a medição N≥40 que ela exige),
  `P-REG-BATERIA-BARATA-DUAS-LISTAS` (medição + fechamento, §3.2),
  `P-O6R-ARNES-ISOLAMENTO` (emenda: denominadores por arquivo e por lista),
  `P-ARNES-RLS-TEST-FORA-DO-SWEEP` (emenda: F7-F10),
  `P-SAN2-2-PORTA-55432-RESERVADA` (fechamento SE o critério dela for cumprido pelo §3.0.1 + §5.1
  do apenso ao plano do SAN2-2; senão, emenda dizendo o que faltou).
- `agent-orchestration/omega/planos/SAN2-2-plano.md` — **apenso de errata de até 5 linhas** ao §6
  dele (as duas linhas que prescrevem 55432 ganham nota datada apontando o netsh; texto original
  fica).
- `agent-orchestration/docs/status-geral.md` — errata datada na l.33 SE a execução a contradisser
  (§3.2) + parágrafo curto de estado do bloco.
- `agent-orchestration/controle/pendencias-indice.md` — regenerado por
  `agent-orchestration/controle/gerar-indice-pendencias.py` (comparação EOL-neutra; o script NÃO é
  editado — o defeito do falso-sim tem dono, SAN2-5).
- `Kpis/kpis-history.json` (backfill §1.6 + entrada nova SAN2-4a) · `Kpis/kpis-latest.json`
  (release SAN2-4a com nulls §C3.5 + backfill_note) · `Kpis/app.js` (SOMENTE a linha FROZEN, gravada
  por `node scripts/kpi-freeze.mjs`, nunca à mão).
- `agent-orchestration/omega/juntas/**` — briefing, votos, ata e pareceres desta junta (criados
  pelos papéis dela, não pelo dev).
- Scratchpad da sessão — sondas F2/F3/F8/F9 e logs; morre com o bloco.

### 5.2 PROIBIDO (e o porquê fica escrito)

- **CORRIGIR QUALQUER COISA.** `tests/**`, `scripts/**`, `src/**`, `prisma/**`, `frontend/**`,
  `mobile/**`, `portals/**`, `.github/**`, `package.json`, `package-lock.json`,
  `.claude/agents/**`, `.agents/**`: **zero edições, de qualquer natureza** — nem conserto, nem
  "melhoria de log", nem typo. Sondas IMPORTAM de `src/` e `tests/helpers/`; jamais os alteram.
  Diff vazio nesses caminhos é verificação da bateria (§6.1). Se a medição achar defeito: pendência
  nomeada com dono + evidência, e o conserto é do 4b ou de quem a junta designar (§0).
- **`erp-postgres` / `erp-redis`: nenhum comando, nem leitura.** O censo vivo fica CARREGADO (§3.3-F10).
- **Mass-delete ad-hoc em qualquer base:** limpeza só por teardown escopado dos containers
  `san2-4a-*` (§3.4). O incidente de 26/07 é a regra.
- **Junction/symlink de `node_modules` entre worktrees** (incidente de 26/08; este worktree tem
  `npm ci` próprio).
- **Porta sem consulta ao netsh** (§3.0.1) · **medir commit com `git archive`+`tar` sob autocrlf** ·
  **comparar regenerados com md5 cru** (§2.5).
- **Reescrever registro:** nenhuma linha existente de `pendencias.md`/`status-geral.md` é apagada ou
  alterada — só apenso e errata datados (§A2).
- **`demo/investidor` e qualquer outra branch:** intocadas.

## §6 — Bateria de validação (na ordem; ec registrado um a um)

1. **Diff de código VAZIO, nas duas pontas:** `git diff --name-only main...HEAD -- src tests scripts
   prisma frontend mobile portals .github package.json package-lock.json .claude/agents .agents` =
   vazio, e o mesmo comando sem `main...HEAD` (working tree) = vazio. Qualquer linha aqui = o bloco
   virou outra coisa; parar.
2. **Checklist de números:** cada número do `SAN2-4a-medicao.md` tem N + forma + log nomeado (§4.1);
   conferido por leitura linha a linha antes da junta — sem exceção "óbvia".
3. **KPI:** editar os 2 JSONs → `node scripts/kpi-freeze.mjs` (grava) → `node scripts/kpi-freeze.mjs
   --check` ec=0 → `node --check Kpis/app.js` ec=0 → `node --test --import tsx
   tests/kpi-dashboard-charts.test.ts` = 16/16 (reexecutado DEPOIS das edições).
4. **Backfill conferido por parser, não por olho:** node -e lendo `Kpis/kpis-history.json` e
   `Kpis/kpis-latest.json` — entrada SAN2-3 com `pr 364` / `merge_commit "c9fd3a1"` /
   `approved_head "23d9227"`; entrada/release SAN2-4a com os 3 campos null e
   `blocks_completed 154`.
5. **Índice de pendências:** regenerar via `gerar-indice-pendencias.py`; comparação EOL-neutra do
   antes/depois transcrita (a armadilha do §2.5 diz por quê).
6. **Espelho de agentes:** `node scripts/sync-agent-agents.mjs --check` ec=0 (o bloco não toca
   agentes; o check é a fatia S0 que o inspetor exige de toda junta).
7. **`git diff --check`** limpo.
8. **Teardown provado:** `docker ps` transcrito sem `san2-4a-*` (§3.4); linha de limpeza §C5 no
   fechamento.
9. **Contagens carregadas com marcador:** `backend_tests 2607/2609`, `frontend_smoke 1126/1126`,
   `flutter 864/864` entram na entrada nova como CARREGADOS com nota §C3.3 (o PR não toca essas
   trilhas — o item 1 prova); o que o PR exerceu (16/16 do kpi-charts + as execuções de medição, com
   N e forma) entra como execução real.

## §7 — Riscos e rollback

- **Queda de agente por `server_error` (recorrente nesta rodada):** mitigada por §3.0.5 — relatório
  criado antes da primeira rodada, tabela gravada a cada forma concluída, logs em disco. Retomada:
  qualquer instância nova continua da última tabela gravada, re-rodando apenas a forma interrompida
  (N recomeça POR FORMA, nunca "aproveita" metade de N).
- **Porta em faixa excluída** (a parede do SAN2-2): §3.0.1 consulta o netsh ANTES; se as três
  preferidas caírem em faixa, escolher fora e registrar.
- **XX000 ou queda de denominador reaparecendo na F5:** é achado de primeira grandeza (a classe que
  o arnês declarou fechada teria voltado) — registrar com log completo, publicar, NÃO consertar, e a
  junta decide se o 4b muda de tamanho. O plano não presume o resultado.
- **F8 não acertar a janela do kill (0/5 órfãs):** publicar 0/5 + a duração medida da janela; o
  mecanismo de gênese fica demonstrado por F6 (leitura) e o fato de a janela ser estreita É um dado.
- **Contaminação entre alvos:** impedida por desenho (§3.0.2, dois clusters). Se por erro operacional
  uma sonda rodar no cluster errado, a medição daquele alvo é DESCARTADA POR ESCRITO e re-executada
  em cluster recriado — descarte registrado no relatório, não silenciado.
- **Disco (93% usado, 18 GB livres no parecer do porteiro):** dois postgres:16 + logs cabem; se o
  livre cair abaixo de ~10 GB durante o bloco, rodar `DEEP_CLEAN=1 bash
  scripts/post-merge-cleanup.sh` conforme §C5 antes de prosseguir.
- **Tentação de consertar** (o risco número 1 deste bloco, pelo desenho): tratado no §0 e §5.2. O
  jurado que encontrar UMA linha de conserto no diff reprova por escopo, sem discussão de mérito.
- **Rollback:** trivial e total — branch descartável, zero mutação fora de docs/KPI, clusters
  removidos, base viva jamais tocada. Reverter = fechar o PR sem merge e apagar a branch.

## §8 — Junta, quórum e papéis (sob `D-JUNTA-ESCOPO-E-CALIBRACAO`)

**Quórum decidido: MAIORIA SIMPLES de 3.** Argumento, pelos dois lados: o bloco toca banco e
catálogo — mas só em clusters descartáveis que nascem e morrem dentro dele, e o §C7.1-ter(b) calibra
por o que o bloco TOCA no produto: dinheiro, segurança, permissão ou perda de dado — e o diff de
código deste PR é VAZIO por construção (§6.1); nenhum dado vivo é alcançável (§5.2). O que
aproximaria unanimidade é o fato de o alvo 2 ser insumo do ciclo 5 financeiro — mas o consumo desse
insumo terá a própria junta (unânime, 7 cadeiras) para conferi-lo; duplicar a unanimidade aqui seria
repetir o erro medido na auditoria de 28/08 (regra não-escrita escalando quórum e queimando ciclos).
Precedentes na mesma classe: SAN2-3 e B-O6R-REG, ambos maioria de 3, ambos aprovados.

- **Inspetor de terreno ANTES da junta** (§C7.1-bis, fail-closed): worktree limpo, S0 (espelho) verde,
  clusters do dev descartáveis e MORTOS antes do voto, baseline honesto, inelegibilidade conferida
  por nome contra `OBITUARIO-IDENTIDADES.md`.
- **Composição (3 cadeiras):** (1) **medição/estatística** — julga N, formas, controles e se cada
  número sobrevive à quádrupla do §4.1; (2) **catálogo/Postgres** — julga F6-F10 e o isolamento de
  terreno; **não pode ser `jurado-c5-arnes-catalogo-postgres`** (RESERVADA à junta do ciclo 5 no
  obituário l.92; usá-la aqui queimaria a composição do próximo bloco) nem `critico-c5-adversarial`
  (reservada, l.93; e o crítico ataca plano só em bloco de invariante — este não é); (3)
  **diff/escopo e KPI** — julga §6.1, §1.6, §1.7 e se algum conserto entrou disfarçado. Identidades
  novas ou permanentes elegíveis; conferência nominal é do inspetor.
- **Escopo nos votos:** todo voto declara `gravidade` E `escopo` com evidência de data/origem
  (§C7.1-ter(a)). Os defeitos que a MEDIÇÃO revelar no produto são `pre-existente` por construção
  (o diff de código é vazio) → viram pendência nomeada com dono, não reprovação; o veto inteiro vale
  para o que o bloco fez: medir errado, publicar número sem forma, consertar escondido, tocar o
  proibido.
- **Papéis separados** (§C7.4-bis): planejador = esta instância (não desenvolve, não vota);
  dev/medidor = instância designada pelo orquestrador; jurados = terceiros. Em reprovação: quem
  achou não conserta; replanejamento volta a um `planejador-mestre` em Fable (obrigatório na
  revalidação, `D-PLANEJADOR-MODELO-FABLE`), respeitado o teto vigente da rodada
  (`D-TETO-DOIS-CICLOS`).
- **Registro:** briefing + votos + ata em `agent-orchestration/omega/juntas/` (`J-SAN2-4a.md` e
  `votos/SAN2-4a/`); ata consigna o head julgado — é ele que o backfill §C3.5 do PRÓXIMO bloco vai
  usar, não o headRefOid do GitHub (lição dos #362/#363/#364).

---

**Fecho.** Sem plano = veto automático; este plano existe para o contrário: veto automático a
qualquer linha que CONSERTE. O 4a entrega três verdades medidas — a taxa real do `authority-portal`,
a lista real do 37, o mecanismo real das `rls_test_` — cada uma com N, forma e causa, gravadas onde
o 4b e o ciclo 5 as encontrarão sem perguntar nada a ninguém.
