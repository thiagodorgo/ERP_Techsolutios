# Crítica adversarial r2 — Plano do Traccar (v2)

## Identidade, objeto e refs

- Papel: `critico-adversarial` · Identidade: `critico-traccar-r2` (nova; não escreveu o plano, nem a r1, nem
  desenvolverá — §C7.4-bis). Ataca com evidência executada e diz o motivo; **não propõe correção**.
- **Substituição declarada (§C7.6-bis):** papel `critico-adversarial` · modelo que rodou **Claude Opus 5.5
  (`claude-opus-5-5`)**, no Claude Code · por que não Fable: `D-FABLE-ASTRA-SO-DINHEIRO` (Fable só em bloco de
  dinheiro); o Codex, que fez a r1, está sem cota até 15/10.
- Rodada: **2 de 2** (última que o corpo permite).
- Objeto: `docs/revisoes/TRACCAR/PLANO_TRACCAR.md` v2 (`planejador-traccar-02`), ramo `docs/plano-traccar`,
  head medido `c49c9c61` (= esperado).
- Ref de código (§A7): `origin/main@c1cfdabe`, medida com `git show origin/main:<caminho>`.

## Estado

**CONCLUÍDA.** Gravada incrementalmente (P1/P2); cada item traz comando → saída resumida → veredito parcial.
Veredito: **PRONTO COM AJUSTES** — 0 `bloqueia`, 14 `ajuste`, 9 `nota`.

## 1. Respostas aos 7 `bloqueia` da r1

### 1.1 B-01 — listener próprio

**E-01a — o precedente.** `git show origin/main:src/server.ts` (l. 23 e 38-44) e `:src/portal-app.ts` (l. 21-55):
o core escuta `env.PORT`; o owner-portal é um segundo Express no mesmo processo, em `env.PORTAL_PORT`
(`env.ts:292`, default 3100), **sem host** (todas as interfaces), **sempre ligado** e **sem tratador de `error`** no
`listen`. `docker-compose.prod.yml:93-94` publica só a 3000; `Dockerfile:42` só `EXPOSE 3000`.
**Veredito parcial:** o desenho da v2 **repete** o do portal (app distinto, porta própria, mesmo processo, chamada em
`server.ts` depois do `portalApp.listen`) e **difere** em três pontos a favor: host explícito, flag desligada por
padrão, sem CORS. Como `src/app.ts` fica proibido e o teste exige que ele não mencione `traccar`, **nenhuma rota
do listener público alcança a ingestão, por construção** — a classe de B-01 (rota interna no listener público) está
fechada, não só a instância.

**E-01b — portas publicadas na topologia de §6.1.** Overlay de rascunho fiel à tabela de §6.1 sobre o
`docker-compose.prod.yml` de `origin/main`; `docker compose -p crtrc2-topo … config --format json` (Compose v5.2.0,
nada sobe). Saída: `api` só `127.0.0.1:3102→3000`; `web` só `127.0.0.1:18080→8080`; `postgres`, `redis`,
`migrate`, `traccar` sem porta; `traccar_private` e `traccar_devices` `internal=true`.
**Veredito parcial:** reproduz M-23. Nada além da API (e do web opcional) em loopback.

**E-01c — alcançabilidade real do IP privado (contêineres `crtrc2-*`, rede interna `172.31.252.0/24`, removidos pelo
nome).** Um processo node escutando `172.31.252.10:3200` num contêiner ligado a uma rede `bridge` e a uma `internal`:
- de outro contêiner só na rede `default` → `TIMEOUT`; para o IP `default` da api → `ECONNREFUSED`;
- de um contêiner só na rede interna (papel do Traccar) → `CONNECTED`;
- **de um contêiner `--network host` (namespace da VM do Docker) → `CONNECTED`**; do Windows → `TIMEOUT`.
- `docker network inspect`: a rede `internal` recebe gateway `172.31.252.1` no lado do host (Docker 29.6.1, linux).

**Veredito parcial:** a frase de §6.1 *"nada da rede default (Postgres, Redis, web) **nem do host** a alcança"* é
**falsa** para o host. Medido: do namespace de rede da VM do Docker Desktop (`--network host`) o IP privado conecta.
Inferido, não medido aqui: no Docker Engine nativo (CI `ubuntu-latest`, dev Linux) esse namespace é o próprio host, então
qualquer processo do host alcançaria `172.31.250.10:3200`. O teste de topologia prova "3200 não publicada", que é outra propriedade. O
segredo continua exigido, então não é bypass de autenticação; é afirmação de rede errada no plano (achado A2-01).

**E-01d — falha do `listen` no mesmo processo.** `node -e` (v20.19.5) com um servidor "público" em loopback e um
segundo `listen(3200,"172.31.250.10")` num host sem esse IP: `Error: listen EADDRNOTAVAIL` como **`Unhandled 'error'
event`**, e o processo sai com código 1 levando o servidor público junto.
**Veredito parcial:** §4.1 especifica o bootstrap ("ligada → `listen(TRACCAR_INGEST_PORT, TRACCAR_INGEST_HOST)`") e não
o comportamento na falha do `listen`; o precedente do portal tem a mesma lacuna (pré-existente). Um host de ingestão
mal configurado derruba a API pública — a ingestão "desligável" passa a ser ponto único de falha do core (achado A2-02).

### 1.2 B-02 — índice global + FOR SHARE

Cluster próprio `crtrc2-pg` (PostgreSQL 16.14, **sem porta publicada**, removido pelo nome no fim), esquema espelho de
§3.1 (vínculo, recibo e quarentena com os índices globais/parciais do plano; RLS `ENABLE`+`FORCE` com a política do
repo), papel `app_rt NOSUPERUSER NOBYPASSRLS`. Organizações A e B; `trcdemo01` ativo em A.

**E-02a — o 23505 é oráculo entre organizações?** Sob o GUC de B: `SELECT count(*)` → **0**; `INSERT` ativo do mesmo
dispositivo → `ERROR: 23505 duplicate key value violates unique constraint "vtb_active_global"` **sem linha
`DETAIL`** (o PostgreSQL suprime os valores da chave sob RLS: nem chave, nem `tenant_id` de A vazam); com
`ON CONFLICT … DO NOTHING RETURNING` → **0 linhas**; controle com dispositivo inexistente → **1 linha**.
**Veredito parcial:** sim, é um **oráculo de 1 bit**: B, que não vê nada de A, aprende que *aquele identificador está
ativo em outra organização* (descarta a própria por um `SELECT`). O plano declara o canal (§5, linha "canal lateral")
e o restringe ao `409` neutro do B-TRC-03. O bit é inerente a qualquer unicidade global; **não vaza dado de A**, mas é
vazamento de existência e, sobretudo, **não prova posse** — ver E-02d.

**E-02b — o `FOR SHARE` cobre todas as vias?** Sessão 1 = ingestão sob A (`SELECT … FOR SHARE` + `pg_sleep(3)`);
sessão 2, 1 s depois, mede a própria espera com `clock_timestamp()`:

| Via (sessão 2) | Papel | Espera com `FOR SHARE` | com `FOR KEY SHARE` | sem trava |
|---|---|---:|---:|---:|
| desativar (`UPDATE valid_to`) | app_rt sob A | **2,00 s** | 0,00 s | 0,00 s |
| mover para B (`UPDATE tenant_id, vehicle_id`) | postgres (SQL manual) | **2,00 s** | 2,03 s | — |
| `DELETE` do vínculo | postgres | **2,00 s** | — | — |
| trocar viatura (`UPDATE vehicle_id`) | app_rt sob A | **2,00 s** | — | — |
| `TRUNCATE` | postgres | **2,05 s** | — | — |
| trocar a chave do dispositivo | postgres | **2,00 s** | — | — |

Ordem inversa (U4d): desativação em voo, confirmação `FOR SHARE` começa 1 s depois → espera **2,01 s** e vê **0**
vínculos. Estado final íntegro (1 ativo).
**Veredito parcial:** reproduz U4/U4d e vai além do medido pelo plano: toda via que **muda a linha** do vínculo —
inclusive SQL de superusuário que contorna o RLS — espera a gravação. Junto com o índice global (E-02a), a classe de
B-02 (*dois vínculos ativos* ou *vínculo trocado no meio da gravação*) está **fechada por construção**, não por
disciplina. A MUT-05 é significativa (só a desativação escapa com `FOR KEY SHARE`).

**E-02c — o que a construção NÃO cobre: a dimensão temporal.** No mesmo cluster: A desativa agora (`T_d`); B vincula
logo depois com `valid_from = agora − 5 min` (o limite que o próprio plano aceita no B-TRC-03, §7: *"`valid_from` não
pode ficar antes de agora − 5 min (sem vínculo retroativo)"*). O banco **aceita** (nenhuma restrição impede validade
sobreposta entre organizações). Para um fix em `T_d − 2 min` — o rastreador ainda na viatura de A —, os vínculos
válidos no instante são **A(inativo) e B(ativo)**, e a regra da fase 2 (§4.2 passos 1-2: só o ativo, `valid_from ≤
fixTime`) **escolhe B**.
**Veredito parcial:** o índice global garante *um ativo agora*, não *um dono no instante do fix*. A regra da fase 2
compara o fix com o vínculo **ativo hoje**, e a tolerância retroativa do B-TRC-03 abre uma janela de até 5 min em que a
posição de A vai para B (se B tiver despacho aceito no intervalo). O motivo `idempotency_key_owned_elsewhere` (§4.4) só
é alcançável dentro dessa janela: o plano a antecipa como quarentena, mas a posição **sem** recibo prévio em A não cai
nela — vai para B. Fora do B-TRC-01 (lá só a semente escreve vínculo), dentro do B-TRC-03 (achado A2-04).

**E-02d — legitimidade do vínculo (leitura do §7 B-TRC-03 e da decisão do dono).** O B-TRC-03 deixa "um
`tenant_admin`/gestor autorizado" vincular **qualquer** `uniqueId` com `vehicles:update`; a instância do Traccar é
única para todas as organizações; nada no plano prova que a organização **possui** o rastreador. Pelo E-02a, B pode
sondar e, se o identificador estiver livre, **ocupá-lo**: as posições do rastreador físico de A passam a ser
resolvidas para B. A decisão do dono exige "associação cross-tenant impossível **por construção**"
(`decisoes.md:2245-2249`); a construção da v2 garante unicidade, não posse. Quem pode vincular (organização ou
plataforma) e como se prova a posse é **regra de negócio nova** (decisão do dono, achado A2-05).

### 1.3 B-03 — dica + teto de 500

**E-03a — o que acontece no 501º (leitura de §4.3, §8.6 e §4.1).** O teto compara com **todas** as organizações
ativas da plataforma (a lista vem de `tenants`, §4.3), não com as que têm rastreador. Na 501ª organização ativa —
qualquer uma, mesmo sem Traccar —, **a descoberta deixa de rodar para todo dispositivo sem dica válida**, e a posição vai à
quarentena `resolution_budget_exceeded` com `202`. Como `202` é 2xx, o Traccar **não repete** (§4.5); a coordenada
não fica no ERP (a quarentena não guarda coordenada). A dica vive **em memória**, por processo, com validade de 10 min; o
plano **não diz** se a confirmação bem-sucedida renova a validade. Sem renovação, 10 min depois do 501º todo dispositivo
cai na quarentena; com renovação, cai todo dispositivo que ficar 10 min calado e **todos** depois de qualquer restart ou
deploy (memória zerada). O teste `traccar-resolution-cost` fixa esse comportamento como propriedade ("com mais de 500
organizações, 0 sondagens e `resolution_budget_exceeded`").
**Veredito parcial:** o 501º é **seguro** (falha fechada, nunca adivinha organização) — a classe de B-03 (*custo sem
dimensão*) está fechada no caminho quente (1 sondagem) e medida no frio. Mas o teto troca um problema de custo por um
**penhasco de disponibilidade global**, disparado por crescimento de organizações não relacionadas ao Traccar, e a
recuperação (reconciliação do B-TRC-03) precisa da mesma descoberta que o teto bloqueia. O plano não declara o penhasco
como risco nem a semântica de renovação da dica (achado A2-06).

**E-03b — pool de conexões compartilhado.** `git show origin/main:src/database/prisma.ts`: um único `PrismaClient` por
processo com `new PrismaPg({ connectionString })`, sem `max`; no `node_modules` do clone principal, `@prisma/adapter-pg`
7.8.0 cria `new pg.Pool(this.config)` e `pg-pool` 3.14.0 usa `max || poolSize || 10` (`index.js:89`) → **10** conexões. O listener de ingestão vive no **mesmo processo** (§4.1) e §4.1 fixa `TRACCAR_INGEST_MAX_CONCURRENCY=32`.
`grep -n -i -E 'pool|conex|connection'` no plano: 4 ocorrências de "conexão" (l.916, 1107, 1146, 1339), nenhuma sobre pool de banco. Cada ingestão segura uma conexão na descoberta
(varredura de até 500 organizações, ~0,4 s pela hipótese do próprio plano) e outra na fase 2 (até 2,75 s se esperar o
`FOR SHARE`).
**Veredito parcial:** 32 ingestões simultâneas cabem em 10 conexões só se cada uma for curta. No cenário frio (deploy
zera as dicas, todos os dispositivos descobrem de novo) ou numa desativação de vínculo em voo, a ingestão pode ocupar o
pool inteiro e **enfileirar as requisições da API pública** do mesmo processo. O isolamento que o B-01 deu à rede não
se estende ao banco: a ingestão continua capaz de degradar o ERP público (achado A2-07).

### 1.4 B-04 e B-05 — reprodução em Postgres próprio (`crtrc2-pg`)

Mesmo cluster de 1.2; recibos com a unique **global** `(instance_key, message_kind, external_event_key)` e RLS
`FORCE`; quarentena global com o índice parcial `(instance_key, external_device_key, reason) WHERE resolved_at IS
NULL` e o `INSERT … ON CONFLICT … DO UPDATE` **literal** de §4.5. Tudo como `app_rt`.

**E-04 — B-04 (recibo e digest).**

| Caso | Saída | Desfecho pelo algoritmo de §4.4 |
|---|---|---|
| R1 A, primeira entrega | `RETURNING` 1 linha | 204, gravou |
| R2 A, reenvio igual | 0 linhas; `SELECT` visível, `digest=d1` | 204, nada novo |
| R3 A, mesma chave, `d2` | 0 linhas; visível `d1≠d2`; `UPDATE conflict_count` | 409; estado final `K1:d1:c1` |
| R4 B, mesma chave | 0 linhas; `SELECT` invisível; B vê 0 recibos | 409 + quarentena `owned_elsewhere` |
| R5 A, `INSERT` puro duplicado | `23505` e em seguida `current transaction is aborted` | reproduz U3d |
| corrida igual (1º segura 3 s) | 2º espera **2,01 s**, 0 linhas, lê `d1` | 204 reenvio |
| corrida divergente | 2º espera **2,01 s**, 0 linhas, lê `d1` | 409 |
| 1º faz `ROLLBACK` | 2º espera **2,00 s** e **insere** | 204 gravou |

**Veredito parcial:** reproduz U3b/U3c/U3d e a semântica concorrente que o plano descreve. A classe de B-04 (*mesma
chave, conteúdo diferente, sucesso*) está **fechada**: a comparação de digest é obrigatória no ramo de 0 linhas, e
MUT-10 a derruba. Ressalva de ordem (achado N2-03): no §4.2 a resolução do operador (passo 3) roda **antes** do
recibo (passo 4); um reenvio de posição **já gravada** reavalia o despacho, e, se ele foi reatribuído entre a entrega e
o reenvio, sai `202` + quarentena para uma posição que está no mapa.

**E-05 — B-05 (identidade da quarentena).**

| Caso | Saída |
|---|---|
| Q1 20 entregas concorrentes, SQL do plano | **1 linha, `delivery_count=20`**, 0 erro |
| Q3 MUT-14 (`EXCLUDED.delivery_count`) | 1 linha, `delivery_count=1` |
| Q4 episódio resolvido + 1 entrega | 2 linhas, 1 aberta (`20,1`): não reabre |
| Q5 entrega durante resolução em voo (3 s) | 2 linhas, 1 aberta (`1,1`): a entrega espera e abre episódio novo |
| Q2a MUT-13 "sem o índice", SQL igual | **0 linhas e 20 × `there is no unique or exclusion constraint matching the ON CONFLICT specification`** |
| Q2b MUT-13 sem índice **e** `INSERT` puro | 20 linhas |

**Veredito parcial:** reproduz U5. A classe de B-05 (*estado durável indeterminado sob concorrência*) está **fechada**:
um episódio aberto por dispositivo e motivo, contador sem perda, inclusive na corrida com a resolução. Imprecisão
(nota N2-04): a MUT-13 como escrita ("remover o índice único parcial") **não** produz as "20 linhas" que §11 M-21 relata,
e sim erro em toda entrega; o teste indicado fica vermelho do mesmo jeito, mas a evidência de M-21 descreve outra edição.

### 1.5 B-06 e B-07

**E-06a — gate de §8.0, executado em `origin/main@c1cfdabe`.**

| # | Comando | Saída | Estado |
|---|---|---|---|
| 1 | `git cat-file -e origin/main:…/B-SAN3-05/PORTEIRO-405.md && echo OK` | `OK`; 164 linhas; l.164 = "LIBERADO COM RESSALVA: plano da trilha do Traccar (sem código de ingestão em produção)" | passa |
| 2 | leitura de §5, §7 B-TRC-07, §8.4 passo 1 contra as ressalvas da l.164 | Ato 2, `-REGRA-EM-TABELA`, `-SECURITY-DEFINER-INVENTARIO` e `DEEP_CLEAN` estão no plano | passa |
| 3 | esta crítica sem `bloqueia` | ver veredito | — |
| 4 | `git cat-file -e origin/main:agent-orchestration/omega/juntas/J-TRC-PD.md` | `fatal: path … does not exist` (exit 128) | pendente, como o plano diz |
| 5 | `git diff --name-only a2937bad origin/main -- src prisma docs/deployment.md \| wc -l` | `0` | passa |

**E-06b — o porteiro mais recente.** O último merge de **produto** é o #411 (`B-SAN3-06b`), e o parecer dele está na
`main` desde `c1cfdabe`: `agent-orchestration/omega/juntas/votos/B-SAN3-06b/PORTEIRO-411.md` (107 linhas), l.107
"LIBERADO COM RESSALVA: PR de registro … → plano/crítica do Traccar → retomada do #389 | … **e o Traccar não amplia
OS/aprovação enquanto o Ω6R-SEC-002 residual estiver aberto**" (também l.83 e R5, l.101). A pendência
(`pendencias.md:3104-3121`, "Bloqueia" na l.3118) diz: *"**Bloqueia:** feature nova em ordens de serviço, aprovações e RBAC … qualquer fatia
que amplie superfície de OS/aprovação cai neste bloqueio"*. `grep -n 'SEC-002'` no plano: só l.153, 866, 1344 e 1472 —
todas como **gate de produção** do B-TRC-07; nenhuma como trava de escopo dos B-TRC-01–05, e o §8.0 não cita o
PORTEIRO-411.
**Veredito parcial B-06:** a **instância** está corrigida (o parecer do #405 existe, é citado com linha e é condição
verificável). A **classe** (*o gate de início se apoia no parecer certo*) não: pela §C2.8 o gate do próximo início é o
porteiro do **último** merge de produto, e a ressalva dele que nomeia o Traccar não entrou no plano. Pelo que mede o §8.3,
o B-TRC-01 só **lê** OS e despacho (`findOperatorsForVehicleAt`) e não abre rota — provavelmente fora da trava —, mas o
plano não faz essa conta, e os B-TRC-03/04/05 (rotas de veículo, km, notificações) nem são examinados (achado A2-08).

**E-07 — B-07.** `git show origin/main:agent-orchestration/controle/pendencias.md | grep -n P-TRC-FORMA` → **vazio**: o
conflito está escrito no plano (§7.2), não em `controle/` (o plano delega ao orquestrador). Leitura de
`decisoes.md:2275-2279` contra §7.2: a forma do dono é por **assunto** — Dia 1 contrato e infraestrutura (PD, versão,
rede privada, segredo, threat model, junta), Dia 2 ingestão e reconciliação, Dia 3 alimentar os módulos, Dia 4
endurecimento e demonstração. A "forma de quatro blocos" que o plano oferece (Q1 = B-TRC-01 inteiro, ingestão + mapa) é
**outra** forma de quatro: o próprio §7.2 mapeia o B-TRC-01 nos Dias 1, 2 **e** 3 do dono. A frase *"o B-TRC-01 é o
mesmo nas duas formas"* vale para as duas formas **do planejador**, não para a do dono.
**Veredito parcial B-07:** a **instância** (*conflito não registrado*) está corrigida no texto, e o plano não escolhe
pelo dono. A **classe** (*consolidar em silêncio*) não fecha: (i) o registro em `controle/`, que a §A2 exige **antes**
de consolidar, ainda não existe e não é condição do §8.0; (ii) o cardápio dado ao dono omite a forma literal dele, e
começar o B-TRC-01 antes da escolha já é escolher contra o Dia 1 do dono. Atenuante medido: a ordem mais recente
(`D-ORDEM-NOITE-2026-10-10`, `decisoes.md:3080-3084`) autoriza "os blocos de ingestão com junta completa de segurança"
sem fixar número (achado A2-09; decisão do dono).

## 2. Fatos novos do Traccar 6.16.0 e LGPD

**Fonte e versão.** `curl -sSfL https://api.github.com/repos/traccar/traccar/releases/tags/v6.16.0` → `v6.16.0`,
publicada em `2026-09-27T00:20:15Z`, `draft=false`, `prerelease=false`. Arquivos baixados de
`https://raw.githubusercontent.com/traccar/traccar/v6.16.0/src/main/java/org/traccar/<caminho>` (timeout 30 s cada):
`ProcessingHandler.java` (224 l.), `forward/PositionData.java`, `forward/PositionForwarderJson.java`,
`handler/PositionForwardingHandler.java`, `handler/DatabaseHandler.java`, `config/Config.java`, `config/Keys.java`,
`model/{Position,Device,BaseModel,ExtendedModel,GroupedModel,Message}.java`.

| Fato do plano | Conferência na tag | Resultado |
|---|---|---|
| P-01 forward antes do insert | `ProcessingHandler.java:118-119`: `PositionForwardingHandler.class, DatabaseHandler.class` (últimos da lista); `PositionForwardingHandler.onPosition` (l.123-130) serializa e chama `callback.processed(false)` sem esperar | **confere** para a 1ª tentativa — **incompleto**, ver E-2a |
| P-02 corpo `{position, device}` | `PositionData.java`: `@JsonInclude(NON_NULL)`, campos `position` e `device`; `device` = `cacheManager.getObject(Device.class, …)` inteiro | **confere** |
| P-02 `device` com dado pessoal | `Device.java`: campos serializados `name` (l.42), `uniqueId`, `status`, `lastUpdate`, `positionId`, `phone` (l.103), `model`, `contact` (l.123), `category`, `disabled`, `expirationTime`, `calendarId`, `groupId` e `attributes` livres; os `motion*`/`overspeed*` têm `@JsonIgnore` | **confere** |
| P-03 `speed` em nós; `outdated` fora do JSON | `Position.java:267` `private double speed; // value in knots`; l.209-212 `@JsonIgnore` em `getOutdated` | **confere** |
| P-04 `forward.url` por dispositivo; header só na URL global; retry | `Keys.java`: `forward.url` `List.of(KeyType.CONFIG, KeyType.DEVICE)`; `forward.header` só `CONFIG`; `forward.retry.delay` 100, `.count` 10, `.limit` 100; `PositionForwarderJson.java`: `AttributeUtil.lookup(…FORWARD_URL, deviceId)` e header só `if (url.equals(this.url) …)` | **confere** |
| P-05 `registerUnknown` `\w{3,15}` | `Keys.java`: `"database.registerUnknown.regex", List.of(KeyType.CONFIG), "\w{3,15}"` | **confere** |
| A-01 ambiente | `Config.java`: `useEnvironmentVariables = parseBoolean(getenv("CONFIG_USE_ENVIRONMENT_VARIABLES")) \|\| …"config.useEnvironmentVariables"`; `getEnvironmentVariableName`: `.`→`_` e maiúsculas | **confere** |
| P-06 / P-07 / P-08 (repo) | `origin/main`: `20260615000000…/migration.sql:16` CHECK `('mobile','web','system')`; `field-location.types.ts:3` e `field-location.service.ts:160-169`; `field-dispatch-prisma.repository.ts:99-115` sobrescreve `operator_user_id` **e** põe `status: "reassigned"` | **confere** |

Oito de oito conferem na letra; um está incompleto no efeito:

**E-2a — P-01 vale só para a 1ª tentativa.** `PositionForwardingHandler`: cada retry chama `send()` →
`positionForwarder.forward(positionData)` → `objectMapper.writeValueAsString(positionData)` **sobre o mesmo objeto**
(`AsyncRequestAndCallback` l.68, `send()` l.79, `schedule()` l.102, `run()` l.107; atraso `retryDelay * (1L << retries++)`, 1º retry em 100 ms).
`DatabaseHandler.onPosition` (l.39-48): `batchWriter.submit(position).whenComplete((id, error) -> { … position.setId(id); …`
— grava o `id` **no mesmo `Position`**. Logo, um reenvio por retry sai com `position.id` = id do banco (>0), conforme o
`batchWriter` tenha ou não terminado antes do retry.
**Veredito parcial:** a chave e o digest de §4.4 **não** usam `id`, então a idempotência resiste (bom desenho). Mas o
plano trata `id > 0` como sinal de mudança de versão: §8.2 ("se vier maior que 0, o contract test acusa e o plano
volta") e a **parada** do §8.5 passo 3 ("se `position.id` vier maior que 0, o dev registra a evidência e para"). Na
captura da fixture, se o `traccar-capture` não estiver pronto na 1ª entrega, a fixture gravada é a de um retry, com
`id > 0`, e a parada dispara por uma razão falsa. E o plano não diz o que o parser de **runtime** faz com `id > 0`:
se rejeitar (422), toda posição cuja 1ª entrega falhou se perde nos retries — justamente o caminho que
`forward.retry.enable=true` existe para salvar (achado A2-10).

**E-2b — LGPD e allowlist (§2.8).** `device.name`, `phone` e `contact` chegam em toda requisição (E-2 tabela). O plano:
lê só `device.id`/`uniqueId` (§8.2), nunca grava nem loga (serializador de allowlist, §4.7; MUT-16), sanitiza a fixture
(§8.5 passo 3) e restringe o `traccar-capture` a dev. Isso **cumpre** a allowlist do §2.8 para o payload.
O que o plano **não** trata, medido no texto: (i) o `traccar-capture` "imprime o corpo" (§6.1) — com o Traccar de dev os
valores são sintéticos, mas o script não tem trava contra rodar com um `device` real; (ii) a quarentena global grava
`external_device_key` (IMEI) sem organização e **sem retenção definida** (§4.5 não fala em expurgo) — identificador
indireto de pessoa quando a viatura tem condutor; (iii) a decisão de produto que mais pesa em LGPD — a posição da
**viatura** vira posição do **técnico** (`FieldOperatorLocation.operator_user_id`, NOT NULL, `schema.prisma:1024`) sem o
fluxo de consentimento do app — fica para "antes da produção" (§9.1 item 7). Para o B-TRC-01 em dev, com dado sintético,
é aceitável; para a trilha, é decisão do dono (achado N2-05).

## 3. B-TRC-01 executável

**E-3a — gate de início.** As condições 1, 2 e 5 de §8.0 passam por comando em `c1cfdabe`; a 4 (`J-TRC-PD.md`) está
ausente, como o próprio plano declara; a 3 é esta crítica (tabela em E-06a). Falta ao gate o PORTEIRO-411 (E-06b) e o
registro de `P-TRC-FORMA-QUATRO-OU-SETE` em `controle/` (E-07). Os artefatos que a bateria e os testes citam existem na
ref: `createEphemeralRole` (`tests/helpers/auth-identity-fixture.ts:324`), `RUNTIME_ROLE_GUARD_SQL`
(`src/database/runtime-role.ts:13`), `tests/san3-05-leituras-de-plataforma-db.test.ts`,
`scripts/smoke-compose-persistence.mjs`, `src/infra/jobs/job-worker.bootstrap.ts`, os oito arquivos do baseline de §8.7.
Na CI, `npm test` só roda no job `backend`, em `runs-on: ubuntu-latest` sem `container:` (`ci.yml:31-109`): o teste de
topologia terá Docker. Compose v5.2.0 local: `up -d --wait migrate api` com `migrate` de execução única → exit 0
(projeto `crtrc2-wait`, removido) — o `--wait` do demo funciona.

**E-3b — a migração é aditiva?** No `crtrc2-pg`, 5.000 linhas em `field_operator_locations` com o CHECK original; a
troca de §3.1 item 4 (`DROP CONSTRAINT` + `ADD … CHECK (… 'traccar') NOT VALID` + `VALIDATE`):
- `count||md5` das linhas antes = depois = `5000:517017bf59f3914ccf49ea1defd7bb86` → **nenhuma linha alterada**;
  CHECK final `convalidated=t`. As três tabelas são `CREATE`; o rollback é comentário manual. **Nenhum passo apaga ou
  altera linha: não é parada §C7.5.**
- **M1** (os três comandos numa transação, como num `migration.sql`): um `INSERT` do app móvel **espera 1,99 s**, a
  transação inteira. **M2** (`VALIDATE` em transação separada): **0,00 s**.
**Veredito parcial:** aditiva. Mas a frase de §3.1 — "com `NOT VALID` + `VALIDATE CONSTRAINT` se o DBA quiser evitar a
varredura sob trava forte" — só vale com o `VALIDATE` em **outra** transação; num único arquivo de migração o
`ACCESS EXCLUSIVE` do `ALTER` dura até o fim. O precedente citado (`20260837…:13-15`) é de **FK**, cuja trava é outra.
Impacto pequeno (tabela de localização bloqueada pelo tempo da varredura), sem perda de dado (nota N2-06).

**E-3c — 93 casos e 29 mutações: todo critério tem a mutação que o derruba?** Contagem declarada em §8.6:
10+9+9+13+7+6+4+7+6+10+12 = **93** em 11 arquivos (confere). Mutações MUT-01 a MUT-29 (confere). Busca de cada critério
em §8.6 (testes) × §8.9 (mutações):

| Critério do plano | Teste em §8.6 | Mutação em §8.9 |
|---|---|---|
| taxa 20/s, rajada 100, 32 em processamento → `429` (§4.1 passo 5, §4.6) | **nenhum** ("429"/"taxa"/"rajada": 0 ocorrências) | **nenhuma** |
| listener liga **só no host pedido** (o cerne de rede do B-01) | "ligado, escuta no host e porta pedidos" | **nenhuma** (MUT-02/03 são flag e porta; ligar em todas as interfaces, como o portal, não é mutado) |
| 64 KiB → `413`; `Content-Type` → `415` | só como desfecho do teste de **logs**, cujo foco é a ausência de sentinela | nenhuma |
| `FORCE` nas tabelas novas; B não lê A | catálogo e leitura cruzada | nenhuma |
| recibo + localização **atômicos** | "gravados atomicamente" | nenhuma |
| canário `TenantRowsLeakError` na varredura | sim | nenhuma |
| previous com prazo ≤ 72 h (gate do env) | **nenhum** | nenhuma |
| segredo em `Authorization` recusado | sim | nenhuma |

As 29 mutações cobrem bem B-02/B-04/B-05 e o segredo. **Veredito parcial:** a classe de A-03 (*critério que pode
regredir em verde*) persiste em pontos de segurança: o limite de taxa/concorrência **não tem teste algum** apesar de o
arquivo `traccar-rate-limit.ts` estar no escopo e o threat model citar "MUT-07 a MUT-09" como prova de DoS (essas são de
resolução); e a propriedade de rede do B-01 (bind no host privado) não tem mutação — a regressão mais provável é
justamente copiar o `portalApp.listen(env.PORTAL_PORT)` sem host (achado A2-11). Nota: as cadeiras de §8.10 re-executam
MUT-01–06, 10–24 e 28; MUT-07–09 entram em "pelo menos as de segurança" mas não estão em cadeira nenhuma.

**E-3d — o demo publica algo além da API em `127.0.0.1`?** E-01b: não — só `api` em `127.0.0.1:3102` e, com
`--with-web`, `web` em `127.0.0.1:18080`; `postgres`, `redis`, `migrate` e `traccar` sem porta (o
`docker-compose.prod.yml` não publica banco nem Redis, l.6-36). A ressalva é a do E-01c: sem porta publicada não
significa inalcançável a partir do host Linux/VM do Docker.

**E-3e — o `reassign` → quarentena muda o despacho existente?** Não muda: o plano só **lê** despacho
(`findOperatorsForVehicleAt`, §4.2) e não toca `reassign` nem a máquina de estados. O que a medição mostra:
- `RlsPrismaFieldDispatchRepository.reassign` (`field-dispatch-prisma.repository.ts:170`) e `.createEvent` (l.174)
  abrem **cada um** o seu `withTenantRls`: o serviço (`field-dispatch.service.ts:550-577`) grava a linha (operador novo,
  `status: "reassigned"`) e **depois**, em outra transação, o evento `field_dispatch_reassigned`. Entre os dois commits —
  ou para sempre, se o segundo falhar — o despacho tem o operador novo, o `accepted_at` **do operador antigo** (o
  `reassign` não o zera, l.105-111) e **nenhum** evento de reatribuição.
- `FIELD_DISPATCH_STATUS_TRANSITIONS` (`field-dispatch.validators.ts:7-17`): `reassigned → on_route` sem nova aceitação
  (o `accepted_at` antigo fica); `assigned → on_route` sem aceitação nenhuma (`accepted_at` nulo).
**Veredito parcial:** a regra de §4.2 tem como **único** sinal de reatribuição a existência do evento — premissa que o
código não garante atomicamente (pré-existente). Na janela, a posição de um fix anterior à troca (inclusive posição
bufferizada, que chega atrasada) é atribuída ao operador **novo**: exatamente o "trajeto de um técnico atribuído a outro
(erro de dado **e** exposição de dado pessoal)" que o dono vetou (`decisoes.md:2290-2292`). O plano chama a regra de
fail-closed e não testa o despacho reatribuído **sem** evento (achado A2-12). Efeitos visíveis da regra, sem defeito,
que o dono precisa conhecer: a viatura **só aparece** no mapa durante despacho aceito; despacho que pulou o "aceito"
(`assigned → on_route`) ou que foi reatribuído **some do mapa inteiro**; posição fora disso vira contador de quarentena,
sem coordenada no ERP. Isso é regra de produto (ver Decisões do dono).

## 4. Regras do dono

Fonte: `D-TRACCAR-HTTP-PRIVADO-AWS` (`decisoes.md:2208-2309`, lida em `origin/main`).

| Regra | Cumpre? | Evidência |
|---|---|---|
| nunca `tenant_id` do payload | **sim** | §8.2: chaves reservadas (`tenantId`, `tenant_id`…) → 422, MUT-20; `instanceKey` vem do env; organização vem do vínculo. Nenhuma chave reservada é campo nativo de `Position`/`Device` 6.16.0 (E-2), então a regra não derruba payload legítimo |
| quarentena | **sim** | dispositivo sem vínculo → 202 + quarentena durável (E-05). Ressalva: a quarentena também recebe estados **normais** de operação (`no_operator_at_fix_time` = viatura fora de despacho), sem coordenada — ver Decisões do dono |
| ambíguo falha fechado | **parcial** | fecha "dois vínculos ativos" (E-02a/b) e "dois operadores" (§4.2). **Não** fecha a ambiguidade temporal entre organizações (E-02c) nem o despacho reatribuído sem evento (E-3e) |
| token fora de código, log, query, frontend e payload público; tempo constante | **sim** | env/Secrets; header único; query → 400 **antes** da autenticação (MUT-28); serializador de allowlist (MUT-16); SHA-256 + `timingSafeEqual` (MUT-18); a fonte 6.16.0 confirma que o erro de forward só leva o código HTTP (`PositionForwarderJson`). Em dev o segredo fica visível em `docker inspect` do contêiner — inerente a env, sorteado por rodada |
| nenhuma porta pública sem decisão, threat model e junta | **sim** | dev: só `127.0.0.1` (E-01b); AWS no B-TRC-06 com 5/5; rastreadores físicos fora do plano (§6.2). Ressalva E-01c (alcance a partir do host) |
| nunca servidores públicos de demonstração | **sim** | proibido em §8.3, §6.2, §9.2; o teste de topologia procura os hosts no overlay, na config e nos scripts |
| nada de domínio "Traccar", segunda tabela de localização ou cadastro duplicado sem necessidade | **sim na letra** | `src/integrations/traccar/` é a camada anticorrupção que a própria decisão manda ter (`decisoes.md:2225-2230`); `src/app.ts` sem `traccar` (contagem 0 na ref); nenhuma tabela nova guarda latitude/longitude; nenhum cadastro novo de veículo |

**As três tabelas são necessidade comprovada?**
- `vehicle_tracking_bindings`: **sim** — `Vehicle` não tem dispositivo (M-4) e o vínculo precisa de validade no tempo
  (o próprio dono exige janela, `decisoes.md:2290-2292`).
- `traccar_quarantine_items`: **sim** — sem organização resolvida não há linha `FORCE` possível (N-02 da r1).
- `traccar_ingress_receipts`: a necessidade de **persistir chave e digest** está comprovada (P-01: sem `position.id`). A
  de **tabela própria** não: a razão escrita (§4.4, "unicidade global, pela mesma razão do vínculo") não exige tabela à
  parte, porque índice único não passa por RLS em tabela nenhuma (E-02a). E o recibo é uma linha por posição do Traccar
  (volume = volume de posições), sem retenção definida (nota N2-08).

**Pontos da mesma decisão que o plano desloca ou consolida sem registrar:**
- **AWS × Fly.** `decisoes.md:2306`: *"O que ainda precisa ser decidido **por escrito, antes do Dia 1 do Traccar**: (a) o
  ERP inteiro migra para AWS; ou (b) …"*. O plano leva a escolha para "antes de B-TRC-06" (§10.1, l.1384; §7 B-TRC-06,
  l.848) e o próprio §7.2 diz que o Dia 1 do dono contém o G-TRC-PD e parte do B-TRC-01. O prazo mudou sem registro §A2
  (achado A2-14).
- **Convivência app × Traccar.** `decisoes.md:2295-2296`: *"em aberto por decisão do dono, que pediu o custo dos dois
  caminhos antes de decidir"*. O B-TRC-01 grava a posição da viatura em `field_operator_locations` do técnico, e
  `/field-locations/latest` escolhe por `recorded_at` **sem olhar a fonte** (M-7): no mapa, app e viatura passam a disputar
  o mesmo "último ponto" do técnico. É um modo de convivência escolhido no B-TRC-01; o plano só lista a convivência como
  dependência do B-TRC-04 e da produção (§7, §9.1 item 7), sem o custo dos dois caminhos pedido pelo dono (achado A2-13).
- **Recurso pago.** *"rastreamento de veículo é feature de plano pago"* (`decisoes.md:2293-2294`): o B-TRC-01 ingere para
  qualquer organização com vínculo, sem gate de módulo; o plano declara isso fora de escopo (§9.2). Aceitável em dev; é
  decisão do dono antes da produção (já no §9.1 item 7).
- **Confiabilidade.** A decisão lista "circuit breaker" e "alerta de encaminhamento degradado"; o plano tem métricas de
  202/409/429/503 e adia o resto ao B-TRC-06 (nota N2-09).
- **Custo por posição não medido no plano:** `publishDomainEvent` (`domain-event.publisher.ts:57-80`) publica em memória
  **e** enfileira um job `field-ops-event-fanout` no Redis para cada `field_location.updated`; `field_location.updated` não
  é medido como consumo faturável (`cloud-usage.events.ts`), então **não toca dinheiro** (nota N2-08).

## Achados classificados

Nenhum achado `bloqueia` o início do B-TRC-01. Nenhum é atribuído a defeito novo de produto: são lacunas do plano,
afirmações erradas dele ou premissas que o código da `main` não garante. Cada `ajuste` abaixo vira **requisito
explícito** (rodada 2 de 2), sem proposta de correção desta identidade.

### `bloqueia`

Nenhum.

### `ajuste`

| ID | Achado | Escopo (evidência) | Motivo |
|---|---|---|---|
| A2-01 | §6.1 afirma que "nem do host" se alcança a 3200; o host Linux e a VM do Docker alcançam | dentro-do-plano (E-01c, §6.1) | premissa de rede falsa usada como argumento de segurança; o teste de topologia prova outra propriedade (não publicação) |
| A2-02 | falha do `listen` da ingestão (`EADDRNOTAVAIL` etc.) derruba o processo, inclusive a API pública | dentro-do-plano (E-01d, §4.1); a lacuna do `portalApp.listen` é pré-existente (`server.ts:39-44`) | a ingestão "desligável" vira ponto único de falha do core por erro de configuração |
| A2-03 | §4.2/§4.6 exigem `timeout` de 2,75 s na fase 2 "sob `withTenantRls`", e §8.3 manda `withTenantRls` intacto; ele não aceita opções (`rls.ts:29-39`; default do Prisma 5 s, mais o `maxWait` de conexão) | dentro-do-plano | contradição executável: o dev escolhe entre violar o escopo ou ficar sem o orçamento de tempo que o 503 pressupõe |
| A2-04 | validade sobreposta entre organizações é aceita pelo banco, e o B-TRC-03 permite `valid_from` até 5 min no passado; a fase 2 entrega a B um fix de quando o rastreador estava em A | dentro-do-plano, B-TRC-03 (E-02c; §7 B-TRC-03, testes); não afeta o B-TRC-01, onde só a semente grava vínculo | a construção garante "um ativo agora", não "um dono no instante do fix"; a frase do §1 item 5 ("uma posição não tem como ir para a organização errada") é falsa para a trilha. **Condição de início do B-TRC-03** |
| A2-05 | nada prova que a organização possui o rastreador que vincula; com o oráculo do 23505, B sonda e ocupa um identificador livre e passa a receber as posições do rastreador físico de A | dentro-do-plano, B-TRC-03 (E-02a, E-02d) | "associação cross-tenant impossível por construção" (`decisoes.md:2245-2249`) exige posse, não só unicidade. **Regra de negócio nova; decide o dono** |
| A2-06 | o teto de 500 conta **todas** as organizações ativas; no 501º, todo dispositivo sem dica vai à quarentena sem coordenada; renovação da dica e restart não especificados | dentro-do-plano (E-03a; §4.3, §8.6) | falha fechada correta, mas é um penhasco de disponibilidade global disparado por crescimento alheio ao Traccar, sem risco declarado |
| A2-07 | ingestão (32 simultâneas) e API pública dividem o mesmo pool de 10 conexões (`prisma.ts:15`, padrão do `pg`) | dentro-do-plano (E-03b) | o isolamento de rede do B-01 não se estende ao banco: descoberta fria ou `FOR SHARE` em espera podem enfileirar o ERP público |
| A2-08 | o §8.0 ancora o início só no porteiro do #405; o porteiro do **último** merge de produto (#411) traz ressalva nominal ao Traccar (`Ω6R-SEC-002`: "não amplia OS/aprovação") que o plano trata só como gate de produção | dentro-do-plano (E-06b; `PORTEIRO-411.md:83,101,107`; `pendencias.md:3118`) | a classe de B-06 (gate apoiado no parecer certo) não fecha; B-TRC-03/04/05 nem são examinados contra a trava |
| A2-09 | o cardápio de forma oferece "quatro blocos" Q1–Q4 que **não** é a forma literal do dono (Dia 1 = contrato e infraestrutura, sem ingestão); `P-TRC-FORMA-QUATRO-OU-SETE` não está em `controle/` | dentro-do-plano (E-07; `decisoes.md:2275-2279`; `grep` vazio em `pendencias.md`) | começar o B-TRC-01 antes da escolha já escolhe contra o Dia 1 do dono; §A2 pede o registro **antes**. **Decide o dono** |
| A2-10 | P-01 vale só para a 1ª tentativa: o retry reserializa o mesmo objeto, que o `DatabaseHandler` já marcou com `setId` | dentro-do-plano (E-2a; `PositionForwardingHandler.java:68-130`, `DatabaseHandler.java:39-48`, tag v6.16.0) | a parada do §8.5 passo 3 dispara por razão falsa se a fixture vier de um retry; o comportamento de runtime para `id > 0` não está escrito, e um 422 perderia exatamente as posições que o retry salva |
| A2-11 | taxa/concorrência (429) sem teste e sem mutação; o bind no host privado (cerne de rede do B-01) sem mutação; `FORCE`, atomicidade recibo+localização, canário e gate de 72 h sem mutação | dentro-do-plano (E-3c) | a classe de A-03 persiste em pontos de segurança; o threat model cita MUT-07–09 (resolução) como prova de DoS |
| A2-12 | a regra "despacho reatribuído não serve" depende só do evento `field_dispatch_reassigned`, gravado em transação separada da troca do operador; o `accepted_at` antigo permanece e `reassigned → on_route` dispensa nova aceitação | dentro-do-plano (E-3e); a não atomicidade é pré-existente (`field-dispatch-prisma.repository.ts:170,174`, `field-dispatch.service.ts:550-577`) | na janela (ou para sempre, se o evento falhar) a posição atrasada de um técnico é atribuída a outro, o erro que o dono vetou (`decisoes.md:2290-2292`); não há teste do despacho reatribuído **sem** evento |
| A2-13 | o B-TRC-01 consolida um modo de convivência app × Traccar (mesma tabela, mesmo "último ponto" do técnico) que o dono deixou em aberto pedindo o custo dos dois caminhos | dentro-do-plano (§4; `decisoes.md:2295-2296`; M-7) | consolidação sem registro §A2. **Decide o dono** |
| A2-14 | a escolha AWS × Fly, registrada como "antes do Dia 1 do Traccar", foi deslocada para "antes de B-TRC-06" | dentro-do-plano (`decisoes.md:2306` × plano l.848, 1384) | mudança de prazo de decisão do dono sem registro §A2. **Decide o dono** |

### `nota`

| ID | Nota | Escopo (evidência) | Motivo |
|---|---|---|---|
| N2-01 | o 23505 é oráculo de 1 bit ("ativo em outra organização"), sem `DETAIL`, sem chave e sem `tenant_id` de A | dentro-do-plano, declarado em §5 (E-02a) | inerente a qualquer unicidade global; o plano o declara e limita ao 409 neutro; o risco real é o de A2-05 |
| N2-02 | MUT-07–09 entram em "pelo menos as de segurança", mas nenhuma cadeira de §8.10 as re-executa | dentro-do-plano (§8.9 × §8.10) | o orçamento de resolução fica só no autocontrole do dev |
| N2-03 | a resolução do operador (passo 3) roda antes do recibo (passo 4): reenvio de posição já gravada pode virar 202 + quarentena se o despacho mudou nesse meio-tempo | dentro-do-plano (§4.2; E-04) | mesma posição gravada **e** em quarentena; raro, sem vazamento |
| N2-04 | M-21 relata "sem o índice → 20 linhas"; a MUT-13 como escrita dá `42P10` em toda entrega (20 linhas só com `INSERT` puro) | dentro-do-plano (E-05, Q2a × Q2b) | o teste fica vermelho igual; a evidência descreve outra edição |
| N2-05 | LGPD: `traccar-capture` imprime o corpo sem trava contra `device` real; quarentena guarda IMEI sem retenção; posição da viatura vira posição do técnico sem o consentimento do app | dentro-do-plano (E-2b; `schema.prisma:1024`) | aceitável em dev com dado sintético; decisão de produto antes da produção (§9.1 item 7) |
| N2-06 | `NOT VALID` + `VALIDATE` no mesmo `migration.sql` não evita a trava forte (M1 1,99 s × M2 0,00 s); o precedente citado é de FK | dentro-do-plano (E-3b; `20260837…:13-15`) | migração aditiva, linhas idênticas (md5); só a frase está errada |
| N2-07 | a fase 2 com dica não reconfere `tenants.status`; organização suspensa segue recebendo posição enquanto a dica valer | dentro-do-plano (§4.2, §4.3) | a lista de "ativas" só vale na descoberta |
| N2-08 | recibo 1:1 por posição, sem retenção; cada posição também enfileira um job `field-ops-event-fanout` no Redis (`domain-event.publisher.ts:34,57-80`); não é consumo faturável | dentro-do-plano (§3.1, §4.4) | volume não dimensionado até o B-TRC-06; não toca dinheiro |
| N2-09 | "circuit breaker" e "alerta de encaminhamento degradado" da decisão ficam para o B-TRC-06 | dentro-do-plano (`decisoes.md:2262-2267`) | adiamento declarado, não omitido |

## Veredito

**PRONTO COM AJUSTES.**

Por execução, quatro classes técnicas da r1 estão **fechadas por construção**: B-01 (nenhuma rota pública alcança a
ingestão: `src/app.ts` proibido e sem `traccar`, app próprio, porta não publicada); B-02 no eixo "dois ativos / troca
durante a gravação" (índice global + `FOR SHARE` seguram até SQL de superusuário, E-02b); B-04 (digest comparado, 409,
corridas corretas, E-04); B-05 (um episódio aberto por dispositivo e motivo, contador sem perda, E-05). B-03 está
fechado no custo, com um penhasco de disponibilidade a declarar (A2-06). B-06 e B-07 estão corrigidos na instância e
abertos na classe (A2-08, A2-09).

O que sobrevive vira requisito explícito do plano antes de o dev abrir o ramo: A2-01, A2-02, A2-03, A2-10, A2-11 e A2-12
(do B-TRC-01); A2-06 e A2-07 (dimensionamento); A2-08 (gate). A2-04 e A2-05 são **condição de início do B-TRC-03**: a
garantia "impossível por construção" ainda não vale na dimensão temporal nem contra quem vincula o que não possui.

Condição do veredito: os itens que o dono decide (A2-05, A2-09, A2-13, A2-14) precisam estar registrados em
`controle/` antes do início do código. A2-14, que o registro de decisões situa **antes do Dia 1**, e A2-09 e A2-13, que
o B-TRC-01 consolida, precisam de resposta do dono, ou de aceite expresso do deslocamento, antes de o dev abrir o
`feat/traccar-b-trc-01`.

## Decisões do dono (separadas)

**1. Forma da trilha (7 × 4).** Há **três** formas, não duas: a do dono (`decisoes.md:2275-2279`, por assunto: Dia 1
contrato e infraestrutura, Dia 2 ingestão e reconciliação, Dia 3 alimentar os módulos, Dia 4 endurecimento e
demonstração, cada dia um bloco); a de quatro blocos do planejador (Q1–Q4, com Q1 = B-TRC-01 inteiro); e a de sete. O
B-TRC-01 só é "igual nas duas formas" entre as do planejador; na do dono ele atravessa os Dias 1, 2 e 3 (§7.2). A ordem
mais recente (`D-ORDEM-NOITE-2026-10-10`) autoriza "os blocos de ingestão" sem fixar número.

**2. AWS × Fly e o prazo dela.** O registro pede a escolha por escrito antes do Dia 1 (`decisoes.md:2306`); o plano a
leva para antes do B-TRC-06. O dono decide agora ou aceita expressamente o deslocamento.

**3. Convivência app × Traccar.** O dono pediu o custo dos dois caminhos antes de decidir (`decisoes.md:2295-2296`); o
B-TRC-01 já põe app e viatura no mesmo "último ponto" do técnico.

**4. Regras de produto que a atribuição por despacho cria.** Elas derivam da regra do próprio dono
(`decisoes.md:2290-2292`), mas têm efeito visível:
- a viatura **só aparece** no mapa durante despacho **aceito**; fora dele, a posição vira contador de quarentena, sem
  coordenada no ERP (fica só no banco do Traccar);
- despacho que pulou o "aceito" (`assigned → on_route`, permitido hoje) nunca mostra a viatura;
- despacho reatribuído some do mapa **inteiro**, para o técnico antigo e o novo;
- não há destino para posição de viatura **sem** técnico (frota parada, uso fora do expediente), o que pesa sobre o
  "plano pago de localização de veículos" (`decisoes.md:2293-2294`).

**5. Quem pode vincular rastreador e como se prova a posse (B-TRC-03).** Hoje o plano deixa qualquer
`tenant_admin`/gestor com `vehicles:update` vincular qualquer identificador na instância única do Traccar (A2-05). A
tolerância de 5 min de `valid_from` retroativo (A2-04) também é regra nova, não do dono.

**6. LGPD antes da produção** (já no §9.1 item 7, reforçado por N2-05): posição da viatura como dado pessoal do técnico
sem o consentimento do app; retenção de recibos e da quarentena (IMEI).

## Higiene do terreno

- Contêineres e redes criados: `crtrc2-pg`, `crtrc2-api`, `crtrc2-other`, `crtrc2-other2`, `crtrc2-trc`,
  `crtrc2-hostns`, redes `crtrc2-def` e `crtrc2-priv`, projeto `crtrc2-wait`. Nenhum publicou porta; todos removidos
  pelo nome (conferido ao fim). O projeto `crtrc2-topo` só passou por `docker compose config` (nada subiu).
- Não tocados: portas 5432/6379/3000/5173/5050, contêineres `erp-*`, `C:/Users/AMP/w-389i`, contêineres `dev389i-*`.
- Nenhum `git stash`/`clean`/`reset --hard`; nenhum `tail -f`. Todo comando de rede, Docker e banco rodou com `timeout`;
  leituras locais (`git show`, `grep`, `sed`) e as edições deste arquivo por `node` rodaram sem `timeout` (desvio declarado,
  todos terminaram).
