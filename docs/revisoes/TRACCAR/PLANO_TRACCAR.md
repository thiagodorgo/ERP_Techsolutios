# Plano da trilha do Traccar — v2.1

> **Estado:** v2.1 **FINAL** (ajustes da crítica r2; não há rodada 3). Não autoriza código sozinho: o B-TRC-01 começa
> quando as sete linhas do gate de §8.0 estiverem verdes, inclusive as decisões 1, 2 e 3 do dono e o registro.
> **v2.1:** a crítica r2 (`critico-traccar-r2`, `790c2084`) deu **PRONTO COM AJUSTES** — 0 `bloqueia`, 14 `ajuste`,
> 9 `nota`. Não há rodada 3. Os 14 ajustes viraram requisitos explícitos no corpo (tabela em "Resposta à crítica r2");
> as seis decisões que a r2 separou estão em "Decisões do dono antes do B-TRC-01"; o texto a registrar em `controle/`
> está em "Para o registro", no fim. Ref de código da v2.1: `origin/main@c1cfdabe` (igual à da r2).
> **Versão:** v2, por `planejador-traccar-02`, sobre a v1 de `planejador-traccar-01` (`612d6650`) e a
> crítica r1 de `critico-traccar-r1` (`1dfd0774`, veredito VOLTA AO PLANO, 7 `bloqueia` e 7 `ajuste`).
> **Ref medida (§A7):** código em `origin/main@a2937bad`. Entre a base da v1 (`a9fbe283`) e `a2937bad` entraram
> só `Kpis/*` (#412) e o console da plataforma (#411: `frontend/src/modules/platform/**`, testes, scripts
> `scripts/san3-06b-*.mjs`, docs e registro). `git diff --name-only a9fbe283 origin/main -- src prisma docs/deployment.md`
> devolve vazio, e nenhum arquivo do #411 é do mapa operacional, da localização ou do despacho: **não afeta o plano**.
> **Avanço durante a v2:** a `origin/main` foi a `c1cfdabe` (#413, só registro: 9 arquivos em `agent-orchestration/`,
> nenhum em `src/`, `prisma/` ou `docs/deployment.md`). Pela regra do mandato, a v2 seguiu e declara: o parecer do
> porteiro do #405 entrou na `main` (§8.0), a pendência do Ato 2 ganhou dono e as linhas citadas de `decisoes.md` e
> `pendencias.md` não se moveram (o #413 acrescentou depois da linha 3050 e da 10477 e trocou linhas 1 por 1).
> **Planejador:** `planejador-traccar-02` (`planejador-mestre`), identidade nova; não escreveu a v1 nem a crítica
> (§C7.4-bis: quem acha ≠ quem planeja ≠ quem desenvolve).
> **Substituição declarada (§C7.6-bis):** papel `planejador-mestre` · modelo que rodou **Claude Opus 5.5
> (`claude-opus-5-5`)**, no Claude Code · por que não Fable: `D-FABLE-ASTRA-SO-DINHEIRO`
> (`decisoes.md:2982`) — Fable só em bloco que toca dinheiro, e esta trilha não toca. O mandato desta v2 foi
> escrito para o Codex (GPT-5.6 Sol), que caiu por limite semanal antes de gravar qualquer coisa; o orquestrador
> relançou no Claude Code. A v2.1 é da mesma identidade, também em Opus 5.5, pela mesma razão. O frontmatter do corpo
> continua `model: fable`.

## Decisões do dono antes do B-TRC-01

São seis perguntas. **Três precisam de resposta antes de o primeiro código do Traccar começar** — ou, quando a
recomendação é adiar, de um "pode seguir assim por enquanto" escrito: a 1, a 2 e a 3. **As outras três podem esperar
o bloco em que pesam**: a 4 até as telas (B-TRC-04), a 5 até o cadastro de rastreador (B-TRC-03), a 6 até o staging com
dado real ou a produção. As seis entram no registro (`controle/`) antes do código, como pede a crítica r2; o texto está
em "Para o registro".

### 1. Forma da trilha

**Pergunta:** em quantos pedaços entregamos o Traccar, e o primeiro já mostra a posição no mapa?

| Opção | Como fica | Efeito |
|---|---|---|
| **A — a sua, ao pé da letra** (`decisoes.md:2275-2279`) | 4 blocos por assunto: Dia 1 contrato e infraestrutura (pesquisa, versão, rede privada, segredo, ameaças, junta), **sem posição entrando**; Dia 2 ingestão e reconciliação; Dia 3 alimentar os módulos; Dia 4 endurecimento e demonstração | o primeiro bloco não mostra nada no mapa; a posição só aparece no Dia 3; o B-TRC-01 deste plano teria de ser cortado em três pedaços |
| **B — quatro blocos do planejador** (Q1–Q4) | Q1 = B-TRC-01 inteiro (posição no mapa, em dev); Q2 = eventos + cadastro e reconciliação; Q3 = telas + alarmes; Q4 = staging + produção | algo visível no primeiro bloco; blocos e juntas maiores; Q4 inteiro sob junta de 5 |
| **C — sete blocos** (proposta) | G-TRC-PD (pesquisa, junta de 5, sem código) + B-TRC-01 a 07 | o mesmo primeiro resultado da B, com blocos menores e a produção numa junta própria de 5 |

**Recomendação: C.** O senhor pediu "o traccar integrado e rodando" (`decisoes.md:2999-3000`), e a C entrega a posição
no mapa já no primeiro bloco de código. Blocos menores combinam com o ritmo medido (o #405 levou quatro ciclos de
junta) e com a regra de no máximo três itens por cadeira de junta. Nenhuma das três formas cabe em 4 dias (§10.2).

**O que trava:** o início do B-TRC-01. Na forma A, o B-TRC-01 muda de forma; nas formas B e C, ele é o mesmo.

### 2. AWS × Fly, e quando decidir

**Pergunta:** o ERP inteiro vai para a AWS, ou só o Traccar vai e o ERP fica no Fly — e quando o senhor decide isso?

| Opção | Efeito |
|---|---|
| **a — ERP inteiro na AWS** | ERP e Traccar na mesma rede privada: é a leitura literal de "HTTP privado dentro da AWS" e a mais simples de proteger. Custo: migrar o ERP, com plano próprio |
| **b — só o Traccar na AWS, ERP no Fly** | menos mudança agora; a ponte privada entre provedores muda o modelo de ameaças, pede nova junta e não é "dentro da AWS" ao pé da letra |
| **c — adiar a escolha para antes do B-TRC-06**, aceitando por escrito | o registro pôs a escolha "por escrito, antes do Dia 1 do Traccar" (`decisoes.md:2306`); adiar exige o seu aceite expresso |

**Recomendação: c, com a "a" como direção.** Do B-TRC-01 ao B-TRC-05 tudo roda em dev e igual em qualquer
provedor; a escolha só pesa no staging (B-TRC-06), e migrar o ERP inteiro merece estudo de custo próprio. Mas, sem o
seu aceite escrito do adiamento, o B-TRC-01 não começa.

**O que trava:** o B-TRC-01 (só o aceite do adiamento) e o B-TRC-06 (a escolha em si).

### 3. Convivência do app com o Traccar no "último ponto" do técnico

**Pergunta:** quando o técnico manda posição pelo celular e a viatura manda pelo rastreador, qual ponto aparece no
mapa?

| Opção | Efeito | Custo estimado (hipótese) |
|---|---|---|
| **a — vence o mais recente**, seja qual for a fonte | é o que o B-TRC-01 faz: mesma tabela, último ponto pelo horário do fix (`field-location-prisma.repository.ts:41-65`). Risco: o pino alterna entre celular e viatura quando o técnico desce do carro | nenhum agora |
| **b — preferência por fonte**: o celular vence se mandou nos últimos N minutos; senão, a viatura | uma regra nova na leitura do "último ponto" | 1–2 dias dentro do B-TRC-04 |
| **c — dois pinos**, técnico e viatura | tela nova e, para viatura sem técnico, uma "posição de viatura" (ver a decisão 4) | bloco próprio, 4–7 dias |

**Recomendação:** aceitar a **a** só como modo provisório de dev no B-TRC-01, e escolher entre **b** e **c** antes
do B-TRC-04. No demo não há celular mandando junto, mas em produção a alternância confundiria o despachante. O senhor
pediu o custo dos dois caminhos antes de decidir (`decisoes.md:2295-2296`): está na tabela.

**O que trava:** o B-TRC-01 (só o aceite do modo provisório); o B-TRC-04 e a produção (a escolha em si).

### 4. Regras de produto da atribuição por despacho, inclusive viatura sem técnico

**Pergunta:** quando a viatura deve aparecer no mapa, e em nome de quem?

**O que a regra segura faz.** A regra segue a sua decisão: "o vínculo pessoa↔viatura é pela janela do despacho",
para que o trajeto de um técnico nunca vá para outro (`decisoes.md:2290-2292`). No B-TRC-01, ela faz o seguinte:

- a viatura só aparece enquanto um técnico tem despacho **aceito por ele mesmo** depois de recebê-lo;
- despacho que pulou o "aceito" (hoje o sistema permite "atribuído → a caminho") não mostra a viatura;
- despacho reatribuído só volta a mostrar quando o novo técnico aceitar;
- posição fora disso não vai ao mapa: vira um contador de quarentena, e o ponto fica guardado só no Traccar;
- viatura **sem** técnico (frota parada, uso fora do expediente) não aparece em lugar nenhum.

| Opção | Efeito |
|---|---|
| **a — regra estrita** (a do B-TRC-01) | nunca atribui trajeto ao técnico errado; mostra menos |
| **b — aceitar também "a caminho" sem aceite** | mostra mais; se o despachante muda o status pelo técnico, o trajeto pode cair no técnico errado |
| **c — "posição da viatura" sem técnico** | atende o plano pago de localização de veículos (`decisoes.md:2293-2294`); é modelo novo, bloco próprio e junta |

**Recomendação: a agora.** A decidir antes do B-TRC-04: se o plano pago exige ver a viatura sem técnico (a **c**).
Porquê: é a regra que o senhor já fixou, e privacidade vem antes de cobertura.

**O que trava:** não trava o B-TRC-01, que nasce com a **a**. Trava o B-TRC-04 e a oferta comercial do rastreamento
de veículos.

### 5. Quem pode vincular rastreador, e como se prova a posse

**Pergunta:** quem pode dizer "este rastreador é desta viatura", e como se prova que a organização é dona dele?

**Fato:** há um Traccar só para todas as organizações. Quem vincular primeiro o número de um rastreador passa a
receber as posições dele. O banco garante um dono por vez, mas não garante que seja o dono certo. A v2 deixava
qualquer gestor com permissão de editar viatura fazer o vínculo (achado A2-05 da crítica r2).

| Opção | Efeito |
|---|---|
| **a — só a plataforma vincula** (Admin Plataforma), a pedido da organização, com o rastreador registrado na compra ou na instalação | posse provada pelo processo; mais trabalho da plataforma |
| **b — a organização vincula, mas só rastreador que a plataforma já liberou para ela** (lista de rastreadores por organização) | escala melhor; precisa da lista e da tela da plataforma |
| **c — a organização vincula qualquer número** | permite ocupar o rastreador de outra organização. **Não recomendado** |

**Recomendação: a para começar, b quando houver volume.** Porquê: fecha "um rastreador, um dono" pelo processo, não só
pelo banco. Junto: o vínculo vale a partir do momento em que é gravado, pelo relógio do servidor; vínculo retroativo
não existe (achado A2-04).

**O que trava:** o início do B-TRC-03. Não trava o B-TRC-01, onde só o teste e o demo criam vínculo.

### 6. LGPD antes da produção

**Pergunta:** a posição da viatura passa a ser dado pessoal do técnico. Com que base legal, por quanto tempo se guarda
e quem vê?

**Fatos:**

- o B-TRC-01 grava a posição da viatura como posição do técnico (`FieldOperatorLocation.operator_user_id`), sem o aviso
  e o consentimento que o app pede;
- os recibos (um por posição) e a quarentena (número do rastreador) não têm prazo de guarda;
- nome, telefone e contato do rastreador chegam em todo envio e são descartados.

| Ponto | Opções para o senhor |
|---|---|
| base legal | execução do contrato de trabalho ou legítimo interesse, com aviso ao técnico (no app e no contrato) |
| guarda | por exemplo: posição e recibo 90 dias; quarentena resolvida 30 dias; depois, apagar ou anonimizar |
| quem vê | despacho e gestão da organização, com trilha de consulta |

**Recomendação:** decidir antes do staging com dado real (B-TRC-06) e, no mais tardar, antes da produção. Guarda curta
para a quarentena; aviso ao técnico no app.

**O que trava:** a produção (B-TRC-07), e o staging se ele usar dado real. Não trava o B-TRC-01, que usa só dado
sintético.

## Resposta à crítica r2

A r2 é a última rodada (2 de 2). Todo `ajuste` virou **requisito explícito**, no lugar onde o dev o lê; nenhum foi
recusado. Das 9 notas, entram as 7 que mudam algo (N2-01 e N2-09 já estavam declaradas e não mudam nada).

| Ajuste | Requisito na v2.1 | Onde | Prova |
|---|---|---|---|
| A2-01 alcance da 3200 a partir do host | A frase "nem do host" sai. No Linux e na VM do Docker Desktop, o host alcança o IP da rede interna (medido pela r2, E-01c); a barreira nesse caminho é o segredo. O teste de topologia prova "não publicada", e o plano diz isso | §6.1, §5 | `traccar-dev-topology` (nome da propriedade corrigido) |
| A2-02 `listen` com host errado derruba a API | O bootstrap trata `error` do `listen` e devolve `bind_failed`; a API pública segue no ar | §4.1 | `traccar-ingest-listener`; MUT-39 |
| A2-03 timeout em `withTenantRls` | Helper novo `withTenantRlsBudget` com `maxWait`/`timeout`; a fase 2 abre com `SET LOCAL lock_timeout` e `statement_timeout` (medido: `canceling statement due to lock timeout`); `withTenantRls` intacto | §4.2 passo 0, §4.6, §8.3 | `traccar-resolution-race-db`; MUT-40 |
| A2-04 validade sobreposta no B-TRC-03 | Condição de início do B-TRC-03: um dono no instante do fix, por construção (`EXCLUDE` com faixas de validade, ou `valid_from` = relógio do servidor por gatilho); sem vínculo retroativo | §7 B-TRC-03, §1 item 5 | condição de início, não teste do B-TRC-01 |
| A2-05 posse do rastreador | Condição de início do B-TRC-03: a decisão 5 respondida e registrada | §7 B-TRC-03, decisão 5 | idem |
| A2-06 penhasco do teto de 500 | Confirmação bem-sucedida renova a dica (validade deslizante); reinício zera e é declarado; métrica e log de "organizações ativas × teto" a partir de 80 %; o penhasco entra como risco | §4.3, §10.1 | `traccar-resolution-cost` (renovação); métrica no B-TRC-01, alarme no B-TRC-06 |
| A2-07 pool de banco compartilhado | A ingestão usa `PrismaClient` próprio com `max = TRACCAR_DB_POOL_MAX` (5); concorrência padrão cai de 32 para 10; o app público fica com o pool dele | §4.1, §4.6, §8.3 | `traccar-ingest-pool-db`; MUT-41 |
| A2-08 PORTEIRO-411 e `Ω6R-SEC-002` | O gate de início inclui o porteiro do último merge de produto (#411) e a leitura da trava `Ω6R-SEC-002` bloco a bloco | §8.0 linha 6, §7 B-TRC-03/04/05 | comando em §8.0 |
| A2-09 forma literal do dono | Decisão 1 com as três formas; registro em `controle/` e resposta do dono passam a ser condição do §8.0 | decisão 1, §7.2, §8.0 linha 7 | §8.0 |
| A2-10 retry com `position.id > 0` | Runtime aceita `id` ausente, 0 ou maior que 0 e o ignora na chave e no digest; a parada do §8.5 passo 3 deixa de olhar o `id` | §4.4, §8.2, §8.5 passo 3 | `traccar-position-contract`; MUT-42 |
| A2-11 critérios sem mutação | Testes e mutações para taxa/concorrência (429), bind no host, 413, 415, `FORCE`, atomicidade recibo + localização, canário, prazo de 72 h e `Authorization` | §8.6, §8.9 (MUT-30 a MUT-38) | as próprias mutações |
| A2-12 `reassign` não atômico | Coluna `operator_assigned_at` em `field_dispatches`, gravada por gatilho na mesma instrução que troca o operador; regra `operator_assigned_at ≤ accepted_at ≤ fixTime`. Nunca depende do evento (medido em PG 16) | §3.1 item 5, §4.2, §8.3 | `traccar-position-ingestion-db` (4 casos novos); MUT-22 redefinida, MUT-43 |
| A2-13 convivência app × Traccar | Decisão 3; o B-TRC-01 só começa com o aceite do modo provisório | decisão 3, §3 | §8.0 linha 7 |
| A2-14 prazo AWS × Fly | Decisão 2; o B-TRC-01 só começa com a escolha ou com o aceite escrito do adiamento | decisão 2, §6.2, §9.1 | §8.0 linha 7 |

| Nota | O que muda | Onde |
|---|---|---|
| N2-02 MUT-07–09 fora das cadeiras | entram na cadeira (c) | §8.10 |
| N2-03 operador antes do recibo | a fase 2 procura o recibo **antes** de resolver o operador; reenvio de posição já gravada sai 204 sem reavaliar o despacho | §4.2; MUT-45 |
| N2-04 MUT-13 × M-21 | a MUT-13 passa a dizer o que acontece de fato (`42P10` em toda entrega), e M-21 ganha a correção | §8.9, §11 |
| N2-05 LGPD em dev | o script de captura recusa `uniqueId` diferente de `trcdemo01` e troca `name`/`phone`/`contact` antes de imprimir; retenção vai à decisão 6 | §8.3, decisão 6 |
| N2-06 `VALIDATE` no mesmo arquivo | o `VALIDATE CONSTRAINT` vai para uma segunda migração | §3.1 item 4 |
| N2-07 organização suspensa com dica | a fase 2 confere `tenants.status = 'active'` da candidata; senão, quarentena `tenant_inactive` | §4.2 passo 1; MUT-44 |
| N2-08 volume e retenção dos recibos | retenção na decisão 6; volume (recibo + job de fanout por posição) medido no B-TRC-06 | decisão 6, §10.1 |

## Resposta à crítica r1

Todos os 14 achados foram **aceitos**; nenhum foi recusado, porque cada um reproduziu na ref. A v2 também traz
**oito fatos novos** que a medição desta rodada achou e que nem a v1 nem a crítica tinham (tabela B). Cada linha
diz onde o plano mudou e qual teste, ou qual mutação, prova a correção. Os de segurança vêm primeiro.

### A. Achado a achado

| Achado | Classe | Resposta | Onde mudou na v2 | Prova (teste que fica vermelho sem a correção) |
|---|---|---|---|---|
| B-01 rota "privada" no listener público | bloqueia | **ACEITO** | §4.1, §6.1, §8.3, §8.6 | `traccar-ingest-listener.test.ts`; mutações MUT-01, MUT-02, MUT-03 |
| B-02 vínculo cross-tenant depois da varredura | bloqueia | **ACEITO** | §3.1, §4.2, §4.3 | `traccar-binding-uniqueness-db.test.ts`, `traccar-resolution-race-db.test.ts`; MUT-04, MUT-05, MUT-06 |
| B-03 varredura O(organizações) sem dimensão | bloqueia | **ACEITO** | §4.3 (limite e medição), §8.6, §11 M-22 | `traccar-resolution-cost.test.ts`; MUT-07, MUT-08, MUT-09 |
| B-04 mesma chave, conteúdo diferente, sucesso | bloqueia | **ACEITO** | §4.4 | `traccar-idempotency-db.test.ts`; MUT-10, MUT-11, MUT-12 |
| B-05 quarentena sem identidade concorrente | bloqueia | **ACEITO** | §3.1, §4.5 | `traccar-quarantine-db.test.ts`; MUT-13, MUT-14 |
| B-06 porteiro do #405 não reproduzido | bloqueia | **ACEITO** | §8.0 (gate de início), §7.1 | conferência por comando em §8.0 (passa em `c1cfdabe`) |
| B-07 quatro × sete blocos sem registrar conflito | bloqueia | **ACEITO** | §7.2 (conflito §A2, não consolidado), §9.1 item 0 | texto medido em §7.2 |
| A-01 ativação de env do Traccar ausente | ajuste | **ACEITO** | §4.6, §6.1, §8.3 | `traccar-dev-topology.test.ts`; demo §8.8; MUT-15 |
| A-02 prova de não vazamento incompleta | ajuste | **ACEITO** | §4.7 | `traccar-ingest-logs.test.ts`; MUT-16 |
| A-03 28 critérios, 7 mutações | ajuste | **ACEITO** | §8.9 (uma mutação por propriedade crítica, 29 no total) | a própria tabela §8.9 |
| A-04 bateria diz ter timeout e não tem | ajuste | **ACEITO** | §8.8 (todo comando com `timeout -k`) | §8.8 |
| A-05 worktree novo não roda a bateria | ajuste | **ACEITO** | §8.4 (preparação completa) | §8.4 |
| A-06 M-16 não sustenta os 83 casos | ajuste | **ACEITO** | §8.7 (lista explícita, comando e contagem por execução) | §8.7, §11 M-32 |
| A-07 quórum e gates não determinísticos | ajuste | **ACEITO** | §7.1 (G-TRC-PD 5/5 antes do código; B-TRC-06 5/5 sem condição), §7 B-TRC-07 (os 4 P0 nomeados) | §7.1, §11 M-28 |

**B-01 — ACEITO.** Fato medido: hoje há um listener por app, e o repo já tem o precedente de app separado em porta
própria — `src/server.ts:35-44` sobe `createPortalApp()` em `PORTAL_PORT` (default 3100, `src/config/env.ts:292`) ao
lado do core em `PORT`; `src/portal-app.ts:21-55` é um Express distinto, sem `attachAuthenticatedActor`, com 404
próprio; e `docker-compose.prod.yml:93-94` publica só a 3000, não a 3100. A v2 copia esse desenho: a ingestão vira um
**terceiro app Express, em porta própria (`TRACCAR_INGEST_PORT`, default 3200), ligado só a um endereço privado
(`TRACCAR_INGEST_HOST`, default `127.0.0.1`) e desligado por padrão (`TRACCAR_INGEST_ENABLED=false`)**. O app público
(`src/app.ts`) **não é tocado** e passa a ser escopo proibido do B-TRC-01: nenhuma rota do Traccar existe nele, logo
nenhum caminho do listener público alcança a ingestão, qualquer que seja a rede. Em dev, a porta 3200 não aparece em
`ports:` e o processo a liga ao IP fixo da rede interna `traccar_private`; na AWS, é uma porta de contêiner distinta,
com regra de Security Group só a partir do SG do Traccar — o SG filtra porta, e agora a porta é só da ingestão. O SSE
continua funcionando porque o broker é em memória do processo (`field-ops-realtime.broker.ts:25`) e os dois listeners
vivem no mesmo processo. Provas: o app público responde não-2xx ao caminho de ingestão com token válido e zero
escrita; o texto de `src/app.ts` não contém `traccar`; o app de ingestão só serve `POST /ingest/traccar/v1/positions`;
o bootstrap não escuta com a flag desligada; o env reprova porta de ingestão igual a `PORT` ou `PORTAL_PORT`.

**B-02 — ACEITO, fechado por construção.** Duas peças do PostgreSQL, ambas medidas num cluster descartável
(`pltrc2-pg`, PG 16.14, papel `NOSUPERUSER NOBYPASSRLS`, §11 M-21): (1) **índice único parcial GLOBAL**
`(instance_key, external_device_key) WHERE valid_to IS NULL`, sem `tenant_id` — a unicidade é verificada no índice e
**não passa pela política de RLS**: sob o GUC da organização B, inserir o mesmo dispositivo ativo que está em A deu
`duplicate key value violates unique constraint`, embora B enxergue zero linhas de A (U1b/U1c); (2) **confirmação com
`SELECT … FOR SHARE`** do vínculo ativo, dentro da transação que grava a posição: a desativação concorrente do vínculo
esperou 1,98 s até a ingestão terminar; com `FOR KEY SHARE` ou sem trava, esperou 0,00 s (U4); e uma ingestão que
começa durante uma desativação em voo espera e depois vê **zero** vínculos (re-checagem do PostgreSQL), sem gravar em
A (U4d). Juntas: enquanto a posição é gravada em A, o vínculo de A está travado ativo e nenhum outro tenant pode ter
vínculo ativo do mesmo dispositivo — vale para qualquer escritor (SQL manual, seed, rota futura), sem advisory lock
voluntário. O advisory lock da v1 **sai**: ele era disciplina, não construção. Custo declarado: o 23505 revela a
quem tenta vincular que o dispositivo já está vinculado em algum lugar — 1 bit, inerente à regra "um dispositivo,
uma organização"; o B-TRC-03 responde `409` neutro, sem dizer onde.

**B-03 — ACEITO.** A varredura deixa de ser o caminho de toda posição. A resolução tem duas fases (§4.2): a
**descoberta** (dica em memória → senão varredura com parada no primeiro achado) só sugere o tenant; a **confirmação**
(B-02) é a autoridade. Medido no cluster descartável (pgbench, 1 cliente, TCP local, §11 M-22): caminho quente
(confirmação + recibo) **0,534 ms**; varredura de pior caso **1,455 ms** com 10 organizações, **15,47 ms** com 100,
**165,7 ms** com 1.000 — linear, ~0,16 ms por organização no servidor, mais 2 idas e voltas de rede por organização no
cliente. Limite: `TRACCAR_RESOLVE_MAX_TENANTS=500`; acima disso a descoberta não roda e a posição vai à quarentena
`resolution_budget_exceeded` (202, durável, com métrica), nunca a um tenant adivinhado. Dica positiva com validade de
10 min e cache negativo de 60 s para dispositivo não mapeado, os dois com no máximo 10.000 entradas. Nenhuma leitura
cross-tenant nova (cada sondagem roda sob o GUC da própria organização, com o canário `assertRowsBelongToTenant`),
nenhuma `SECURITY DEFINER`, nenhuma view (o guard do runtime proíbe view sobre FORCE, `runtime-role.ts:1-50`), nenhum
`BYPASSRLS`. Prova em CI por **contagem de sondagens**, determinística; a latência é evidência do dev no PR (§8.5 passo 11) e
volta a ser medida no B-TRC-06 com o número real de organizações.

**B-04 — ACEITO.** O recibo usa `INSERT … ON CONFLICT (instance_key, message_kind, external_event_key) DO NOTHING
RETURNING` (o `INSERT` puro aborta a transação, medido em U3d) e, quando não volta linha, lê o recibo existente e
**compara o digest**: igual → `204`, nada novo; diferente → **`409 traccar_idempotency_conflict`**, contador de
conflito no recibo, nenhuma posição, nenhum evento. A unicidade do recibo também passa a ser **global** (sem
`tenant_id` na chave): se a chave já pertence a outra organização, o `INSERT` volta 0 linhas e o `SELECT` também
(medido em U3c) → `409` + quarentena `idempotency_key_owned_elsewhere`. Fato novo que muda a chave: no Traccar 6.16.0 o
encaminhamento roda **antes** de gravar a posição (`ProcessingHandler.java:101-119`: `PositionForwardingHandler` antes
de `DatabaseHandler`), então `position.id` ainda não existe no forward; a chave passa a ser o hash da identidade
(instância, `uniqueId`, `fixTime`, lat, lon) e o digest cobre todos os campos permitidos — mesma identidade com
velocidade, rumo, precisão ou validade diferentes é conflito, não reenvio.

**B-05 — ACEITO.** `traccar_quarantine_items` ganha identidade: índice único parcial `(instance_key,
external_device_key, reason) WHERE resolved_at IS NULL`, gravação por `INSERT … ON CONFLICT … DO UPDATE SET
delivery_count = delivery_count + 1`. Medido (U5): 20 entregas concorrentes → **1 linha, `delivery_count=20`**; com a
mutação "sem o índice" → 20 linhas; com a mutação `SET delivery_count = EXCLUDED.delivery_count` → contagem 1. Estado
final único e determinístico; `delivery_count` conta entregas (inclusive retries do Traccar), não posições distintas,
e isso fica escrito. Uma quarentena resolvida não é reaberta: a entrega seguinte abre outro episódio.

**B-06 — ACEITO.** No início desta v2 o parecer existia só no ramo `origin/docs/registro-2026-10-10` (`6d6568dc`, PR
#413 aberto) e `git cat-file -e origin/main:agent-orchestration/omega/juntas/votos/B-SAN3-05/PORTEIRO-405.md` falhava
em `a2937bad`; durante a v2 o #413 foi mergeado e o parecer está na `main` desde `c1cfdabe` (164 linhas, o mesmo
número medido no ramo). O veredito, linha 164:
**"LIBERADO COM RESSALVA: plano da trilha do Traccar (sem código de ingestão em produção)"**, com três ressalvas que
este plano cumpre em §5 e §8.0: ingestão em produção depende do Ato 2 e de `P-SAN3-05-ATO2-CINCO-TAREFAS`; tratar
`P-SAN3-05-REGRA-EM-TABELA` (reproduzida pelo porteiro) e `P-SAN3-05-SECURITY-DEFINER-INVENTARIO` no threat model;
`DEEP_CLEAN=1` antes de etapa pesada. A v1 dizia "cumprido" sem citar; a v2 cita, diz onde está e põe o parecer na `main` como condição de
início do código (§8.0), hoje satisfeita.

**B-07 — ACEITO, e não consolidado.** O texto medido está em §7.2: a decisão do dono (`decisoes.md:2275-2279`) diz
"Plano de 4 dias … Cada dia é bloco com junta, CI, KPI e porteiro"; o `PLANO_SAN3` §11 (`PLANO_SAN3.md:533-537`) não
fala em número de blocos, só em "nenhuma linha de integração nasce antes do gate" — regra revogada pela
`D-GOV-PROPORCIONAL` (`decisoes.md:2956`). A v2 registra a divergência, explica por que propõe sete blocos, oferece ao
dono a forma de quatro blocos, e **não escolhe por ele**: o B-TRC-01 é o mesmo nas duas formas, e o conflito bloqueia
o início do B-TRC-02 até a escolha. O registro em `controle/` cabe ao orquestrador (esta rodada só commita o plano); o
texto a copiar está em §7.2.

**A-01 — ACEITO.** No 6.16.0 a leitura do ambiente só liga com `CONFIG_USE_ENVIRONMENT_VARIABLES=true` ou
`config.useEnvironmentVariables` (`Config.java:48-49`); o nome é derivado da chave (`Config.java:140-142`:
`forward.header` → `FORWARD_HEADER`). O overlay de dev passa os dois; o teste de topologia exige a chave; o smoke só
fica verde se o header chegar (sem ele, 401 e nenhuma posição).

**A-02 — ACEITO.** O app de ingestão não usa o serializador padrão do `pino-http`: usa um serializador de
**allowlist** (`método` + caminho sem query; `statusCode`) — cabeçalho nenhum chega ao log, por construção, e a
`redact` fica só como cinto. A rota recusa query string (400) antes de autenticar, e o erro é logado só com o código.
O teste captura o logger real em 204, 400 (query), 401, 400 (JSON inválido), 413, 415, 422 e 503 (timeout) e procura o
valor-sentinela do segredo e do corpo.

**A-03 — ACEITO.** §8.9 tem uma mutação por propriedade crítica — 29 na v2, 45 na v2.1 —, cada uma com a edição exata e o teste que tem
de ficar vermelho.

**A-04 — ACEITO.** Todo comando de §8.8 roda sob `timeout -k 15 <s>` (Git Bash) e todo teste novo declara
`{ timeout }` no `node:test`. Depois da bateria, conferência de órfãos `node.exe` pelo caminho do worktree.

**A-05 — ACEITO.** §8.4 traz a preparação inteira: worktree próprio, `npm ci` nos dois pacotes (nunca junction),
`prisma generate` com `DATABASE_URL` só no ambiente do comando (espelho do `Dockerfile:17`), cluster descartável com
nome próprio em porta de loopback, `migrate deploy`, e a remoção por nome.

**A-06 — ACEITO.** O "83 em dez arquivos" sai. §8.7 lista os arquivos, dá o comando de contagem estática e manda o dev
registrar a contagem **executada** (`# tests` do TAP) no passo 0; a meta M ≥ 2N é sobre a contagem executada.

**A-07 — ACEITO.** (1) A PD e a decisão de usar a imagem do Traccar vão à junta **5/5** num gate próprio, o
**G-TRC-PD**, antes da primeira linha de código do B-TRC-01 (`decisoes.md:2283-2285`); (2) o B-TRC-06 é **5/5 sem
condição** (provisiona serviço pago); (3) os "quatro críticos de J-6R" ganham nome e comando: os P0 não fechados em
`docs/revisoes/O6R/achados.jsonl` na `a2937bad` são `Ω6R-DIN-009`, `Ω6R-DAT-002`, `Ω6R-DAT-003` (ativos) e
`Ω6R-SEC-002` (parcialmente superado).

### B. Fatos novos que a v2 mediu (não estavam na v1 nem na crítica)

| # | Fato medido | Evidência | Consequência no plano |
|---|---|---|---|
| P-01 | O forward roda antes da gravação: `position.id` não existe no JSON encaminhado | `ProcessingHandler.java:101-119` (6.16.0) | chave = hash da identidade; o contract test assere `id` ausente ou 0 (§4.4) |
| P-02 | O corpo encaminhado é `{position, device}`; `device` traz `name`, `phone`, `contact`, `model` | `PositionData.java:23-35`, `PositionForwardingHandler.java:123-130`, `Device.java:44-125` | a allowlist lê só `device.uniqueId` e `device.id`; o resto nunca é lido nem gravado (§4.6, §8.2) |
| P-03 | `speed` vem em nós; `outdated` não vai no JSON | `Position.java:267`, `Position.java:209-211` | conversão nó → m/s (×1852/3600) testada; `outdated` sai da lista (§8.2) |
| P-04 | `forward.url` aceita sobrescrita por dispositivo; o header global só vai para a URL global; retry vem desligado por padrão e, ligado, dobra o atraso até 10 tentativas e descarta acima de 100 pendentes | `Keys.java:1102-1157`, `PositionForwarderJson.java:53-72`, `PositionForwardingHandler.java:89-98` | egress do Traccar fechado; `forward.retry.enable=true` no dev; perda acima do teto vira reconciliação REST (§4.8, §5) |
| P-05 | `database.registerUnknown` só registra ids que casam `\w{3,15}` — o `sim-traccar-01` da v1 não registraria | `Keys.java:626-650` | o dispositivo do demo vira `trcdemo01` (§8.1) |
| P-06 | `field_operator_locations` tem CHECK `source IN ('mobile','web','system')` | `prisma/migrations/20260615000000_add_field_operator_locations/migration.sql:16` | a migração alarga o CHECK (`NOT VALID` + `VALIDATE`), sob o DBA (§3.1) |
| P-07 | A rota móvel aceita `source` do cliente a partir de `FIELD_LOCATION_SOURCES` | `field-location.service.ts:30,160-169`; `field-location.types.ts:3` | `traccar` entra numa lista separada, só gravável pelo comando interno; a rota móvel continua recusando `traccar` (§3.1) |
| P-08 | `reassign` sobrescreve `operator_user_id` na própria linha do despacho | `field-dispatch-prisma.repository.ts:98-114` | despacho reatribuído não serve para atribuição temporal no B-TRC-01: quarentena `operator_history_ambiguous` (§4.2). **v2.1:** o sinal deixa de ser o evento e passa a ser `operator_assigned_at`, gravado por gatilho (A2-12) |

## 1. Resumo para o dono

1. A trilha entrega o Traccar integrado ao ERP sem segundo mapa, segunda frota ou "módulo Traccar": ele alimenta
   localização, despacho, mapa, telemetria e notificações que já existem.
2. Proposta: um gate de pesquisa (**G-TRC-PD**, junta de 5) e **7 blocos** — posição no mapa; eventos; cadastro e
   reconciliação; telas; alarmes; staging AWS; produção. A sua decisão de 2026-09-11 falava em **4 dias / 4 blocos**;
   a v2 mostra a diferença, oferece a forma de 4 blocos e deixa a escolha com você (§7.2). O primeiro bloco é igual nas
   duas formas.
3. O **B-TRC-01 já é vertical**: um ponto simulado entra no Traccar local, é encaminhado por HTTP privado e aparece no
   mapa operacional que já existe.
4. A ingestão roda num **listener próprio, em porta própria e endereço privado**, desligado por padrão: a API pública
   não tem a rota, então ninguém de fora a alcança por ela.
5. No B-TRC-01, uma posição **não tem como ir para a organização errada**: o banco garante um vínculo ativo por
   dispositivo em todas as organizações juntas, e o vínculo fica travado enquanto a posição é gravada (medido). Para a
   trilha inteira falta "um dono no instante do fix" e "quem vincula prova que é dono": são condições de início do
   B-TRC-03 (A2-04, A2-05; decisão 5).
6. Custo controlado: com o vínculo conhecido, uma posição custa ~0,5 ms de banco; a busca completa só roda na primeira
   vez de cada dispositivo e tem teto de 500 organizações (medido: 15 ms com 100).
7. Reenvio igual não duplica; reenvio com conteúdo diferente **não** passa como sucesso (409); posição atrasada entra
   no histórico sem fazer o mapa voltar no tempo.
8. Dispositivo desconhecido, sem técnico no horário ou com histórico de despacho ambíguo vai para quarentena — uma
   linha por dispositivo e motivo, sem coordenada.
9. Segredo só em header, nunca em log (o log da ingestão só sabe método, caminho e status), comparação em tempo
   constante e troca com prazo.
10. A produção **não é ligada** antes do Ato 2, dos 4 P0 da J-6R ainda abertos, da amarração de staging e dos dois
    resíduos de RLS.

## 2. Método, fatos e hipóteses

### 2.1 Regra de leitura

As afirmações sobre o repositório foram medidas no blob de `origin/main` (§A7): a v1 em `a9fbe283`, e a v2
re-mediu em `a2937bad` tudo o que cita com linha nova. Cada `M-n` remete a um comando de §11; `T-n` é documentação
oficial do Traccar; `S-n` é código-fonte oficial da tag `v6.16.0`. **FATO** = a ref, o código-fonte oficial ou uma
execução prova; **HIPÓTESE** = precisa da prova indicada antes de virar implementação.

**Fatos de governança.** A decisão vigente manda forward HTTP JSON privado, alimentar os domínios existentes, nunca
confiar em `tenant_id` do payload, nenhuma porta pública e nenhum servidor de demonstração
(`decisoes.md:2208-2285`, M-2), e diz que "associação cross-tenant é impossível por construção"
(`decisoes.md:2245-2249`). O plano só começa depois do merge do #405 (`D-TRACCAR-PLANO-APOS-405`, `decisoes.md:3009`),
mergeado em `a9fbe283`; o porteiro do #405 liberou o plano com ressalva, parecer na `main` desde `c1cfdabe` (§8.0). A
`D-ORDEM-NOITE-2026-10-10` (`decisoes.md:3080-3084`, em `c1cfdabe`) põe o plano do Traccar, a crítica e os blocos de
ingestão com junta completa de segurança em 4º lugar, antes de destravar a produção (5), das telas (6) e do Ato 2 (7).
KPI congelado e junta completa de segurança nos blocos de ingestão (`CLAUDE.md:611-650`, M-1).

### 2.2 Fatos do Traccar 6.16.0 medidos no código-fonte oficial (novos na v2)

Baixados de `raw.githubusercontent.com/traccar/traccar/v6.16.0/…` em 2026-10-10 (§11 S-1):

- o forward roda **antes** de gravar a posição (`ProcessingHandler.java:101-119`) — sem `position.id` (P-01);
- o corpo é `{position, device}` (`PositionData.java:23-35`; montado em `PositionForwardingHandler.java:123-130`) — o
  `device` traz `name`, `phone`, `contact` e `model` (`Device.java:44-125`) (P-02);
- `speed` em nós (`Position.java:267`); `outdated` não é serializado (`Position.java:209-211`) (P-03);
- `forward.url` aceita valor por dispositivo; `forward.header` só vai para a URL global; retry desligado por padrão,
  atraso dobrando a partir de 100 ms, 10 tentativas, 100 pendentes (`Keys.java:1102-1157`;
  `PositionForwarderJson.java:53-72,80-84`; `PositionForwardingHandler.java:89-98`) (P-04);
- `database.registerUnknown` com filtro `\w{3,15}` (`Keys.java:626-650`) (P-05);
- ambiente só com `CONFIG_USE_ENVIRONMENT_VARIABLES=true` e nome derivado da chave (`Config.java:48-49,80-88,140-142`);
- `protocols.enable` restringe os protocolos (`Keys.java:1828-1835`); `web.address` liga a interface a um endereço
  (`Keys.java:929-935`).

**Hipóteses que a fixture do passo 3 de §8.5 fecha:** formato das datas no JSON; presença de `position.id` igual a 0
ou ausente; caminho do arquivo de config dentro da imagem. Capacidade real, frequência dos rastreadores, retenção e
tipos de alarme seguem sem dado de produção: limites iniciais configuráveis, medidos no B-TRC-06.

### 2.3 Decisões de arquitetura deste plano

- Camada anticorrupção em `src/integrations/traccar/`; regra de negócio nos módulos existentes; não nasce
  `src/modules/traccar`.
- Ingestão em **app e listener próprios** (§4.1), espelho do portal (`src/portal-app.ts`, `src/server.ts:35-44`).
- Organização nunca vem do JSON: descoberta barata e não autoritativa + confirmação autoritativa sob RLS, com unicidade
  global no índice e `FOR SHARE` na transação (§4.2, §4.3). Sem advisory lock, sem diretório cross-tenant, sem
  `SECURITY DEFINER`, sem view, sem `BYPASSRLS`.
- A primeira visualização é a do **técnico em despacho**: o mapa é orientado a `operator_user_id`, e a posição da
  viatura vai ao técnico que aceitou o despacho depois de recebê-lo e antes do fix, com o despacho não encerrado no
  `fixTime` (`operator_assigned_at ≤ accepted_at ≤ fixTime`, §4.2; A2-12).
- O SSE existente continua sendo o aviso; o navegador busca a posição pela REST do ERP. Sem WebSocket e sem chamada do
  navegador ao Traccar (M-10, M-11).

## 3. Mapa do que já existe

| Dado recebido | Destino de domínio | Estado medido e decisão |
|---|---|---|
| Posição (`lat/lon`, precisão, rumo, velocidade, `fixTime`) | `FieldOperatorLocation` + `FieldLocationService` | **Existe.** O modelo guarda os campos e timestamps (`prisma/schema.prisma:1021-1042`, M-5); o serviço valida, sanitiza e publica `field_location.updated` (`field-location.service.ts:21-53,84-125`, M-6). O B-TRC-01 grava pelo mesmo repositório, no `tx` da fase 2, com `source='traccar'` — o que exige alargar o CHECK da coluna (P-06) e manter `traccar` fora da lista que o cliente móvel pode mandar (P-07). |
| Posição atual no mapa | `/field-locations/latest` + mapa operacional | **Existe.** O repositório ordena `recorded_at DESC, received_at DESC` e escolhe uma por operador (`field-location-prisma.repository.ts:41-65`, M-7). O front lê essa rota e atualiza por SSE, com polling de 30 s só como fallback (`useOperationsMap.ts:9,90-94`, M-10), e não lê o campo `source` (M-25). Nenhum mapa novo, nenhuma mudança de tela no B-TRC-01. **Convivência (A2-13):** o "último ponto" escolhe por `recorded_at` sem olhar a fonte, então app e viatura disputam o mesmo ponto do técnico. No B-TRC-01 isso é modo provisório de dev, que só vale com o aceite do dono (decisão 3). |
| Evento técnico do Traccar | `telemetry` veicular | **Falta destino compatível.** `TelemetryEvent` é telemetria do app e exige `operator_profile_id` (`schema.prisma:2180-2215`, M-5). B-TRC-02 cria o menor modelo veicular necessário, dentro de `telemetry`. |
| Dispositivo | vínculo com `Vehicle` e organização | **Não existe.** `Vehicle` não tem dispositivo (`schema.prisma:1074-1103`) e a busca por `traccar\|device_id\|unique_id` não acha vínculo de frota (M-4). `ThirdPartyVehicleIdentity` é veículo recolhido, não rastreador (M-18). O B-TRC-01 cria `vehicle_tracking_bindings`, tenant-scoped, com **unicidade ativa global** por dispositivo (§3.1). A chave do dispositivo é `device.uniqueId` (o IMEI, que o administrador conhece), porque o JSON encaminhado traz o objeto `device` (P-02). |
| Técnico que aparece no mapa | `WorkOrder.vehicle_id` → `FieldDispatch.operator_user_id` | **Existe a cadeia** (`schema.prisma:2347,2390,2471-2503`). A resolução é no `fixTime`, com `operator_assigned_at ≤ accepted_at ≤ fixTime` e antes do término: `reassign` sobrescreve o operador na própria linha (P-08) e o evento sai em outra transação, então a troca é registrada por gatilho em `operator_assigned_at` (§3.1 item 5, §4.2; A2-12). |
| Ignição | evento veicular normalizado | **Falta.** B-TRC-02. No B-TRC-01, `attributes` é ignorado por inteiro. |
| Odômetro | amostra veicular; agregação de km | **Falta telemetria contínua.** A OS só guarda `mileage_start/end` informado (`schema.prisma:2369-2376`). B-TRC-02 conserva a amostra; nunca sobrescreve km de OS. |
| Alarme | evento veicular; `notifications` se houver regra | **Parcial.** B-TRC-05, só tipos aprovados. |
| Online/offline do dispositivo | visão "Dispositivos" da telemetria | **Tela e contrato do app existem; fonte Traccar não** (`telemetry.service.ts:16-99`, M-12). B-TRC-03/04. |

### 3.1 Modelagem mínima do B-TRC-01

Três tabelas novas, um CHECK alargado e uma coluna com gatilho em `field_dispatches`, em duas migrações aditivas e
forward-only, sob o `agente-dba-guardiao`. Todas as
datas em `timestamptz(6)`. O rollback SQL é comentado no topo da migração, como em
`prisma/migrations/20260811000000_add_invoicing/migration.sql:20-23`, e só vale antes de haver dado real.

1. **`vehicle_tracking_bindings`** (tenant-scoped, `ENABLE` + `FORCE ROW LEVEL SECURITY`, política no formato de
   `20260615000000_add_field_operator_locations/migration.sql:42-47`): `id`, `tenant_id`, `vehicle_id` (FK composta
   `(tenant_id, vehicle_id)` → `vehicles(tenant_id, id)`, que é `@@unique([tenant_id, id])`), `instance_key`,
   `external_device_key` (o `device.uniqueId`), `valid_from`, `valid_to` (nulo = ativo), `created_by`, `created_at`,
   `updated_at`; CHECK `valid_to IS NULL OR valid_to > valid_from`. Índices (raw SQL, como o índice parcial de
   `20260811000000_add_invoicing/migration.sql:25-27`):
   - **único global** `(instance_key, external_device_key) WHERE valid_to IS NULL` — sem `tenant_id`, de propósito
     (§4.3);
   - único `(tenant_id, vehicle_id) WHERE valid_to IS NULL` — uma viatura, um rastreador ativo;
   - `(tenant_id, instance_key, external_device_key) WHERE valid_to IS NULL` — a sondagem por organização.
   Desativar é gravar `valid_to` (delete lógico); a aplicação não apaga linha. No B-TRC-01 só o seed de teste e o do
   demo escrevem aqui; o CRUD é do B-TRC-03. O índice garante **um vínculo ativo agora**, não **um dono no instante do
   fix**: com validade retroativa, dois vínculos de organizações diferentes cobririam o mesmo instante (r2, E-02c).
   Fechar isso é condição de início do B-TRC-03 (A2-04); no B-TRC-01 não acontece, porque só a semente grava vínculo,
   com `valid_from` = relógio do servidor.
2. **`traccar_ingress_receipts`** (tenant-scoped, `FORCE`): `id`, `tenant_id`, `instance_key`, `message_kind`
   (CHECK `'position'` no B-TRC-01), `external_event_key`, `payload_digest`, `binding_id` (FK composta), `vehicle_id`,
   `location_id` (FK composta para `field_operator_locations(tenant_id, id)`, nula até a gravação), `traccar_device_id`,
   `fix_time`, `received_at`, `conflict_count` (default 0), `last_conflict_at`. **Único global**
   `(instance_key, message_kind, external_event_key)` (§4.4). Não guarda JSON bruto.
3. **`traccar_quarantine_items`** (global, sem RLS, sem `tenant_id`, sem coordenada, sem payload; §4.5). A necessidade
   é a da nota N-02 da crítica: sem organização resolvida, uma linha tenant-scoped fabricaria contexto.
4. **CHECK de `field_operator_locations.source`** alargado para `('mobile','web','system','traccar')`, espelho de
   `20260858000000_extend_field_dispatch_event_type_check/migration.sql`. Na primeira migração vão o DROP e o
   `ADD … NOT VALID`; o `VALIDATE CONSTRAINT` vai numa **segunda** migração (`<timestamp>_validate_location_source_check`).
   A r2 mediu (N2-06): os três comandos num arquivo só seguram o `ACCESS EXCLUSIVE` até o fim (um `INSERT` esperou
   1,99 s); com o `VALIDATE` à parte, 0,00 s. O precedente de FK (`20260837…`) não serve de argumento, porque a trava de
   FK é outra. Toda linha existente já satisfaz o CHECK novo (5.000 linhas idênticas por md5 antes e depois, E-3b); o
   rollback só re-estreita depois de provar zero linhas `traccar`.
5. **`field_dispatches.operator_assigned_at`** (`timestamptz`, nulo, sem default: `ADD COLUMN` só de metadado) +
   função de gatilho `field_dispatch_operator_assigned_at()` (`plpgsql`, `SECURITY INVOKER`, sem `SECURITY DEFINER`) +
   gatilho `BEFORE INSERT OR UPDATE … FOR EACH ROW`. No `INSERT` grava `now()`; no `UPDATE` grava `now()` quando
   `operator_user_id` muda (`IS DISTINCT FROM`) e repõe o valor antigo em qualquer outro caso, ignorando o que o
   cliente mandar. É o que torna a regra do operador (§4.2) construção, e não disciplina (A2-12). Medido em PG 16, sob
   papel sem bypass (§11 M-38): `prosecdef = false`, forja ignorada, reatribuição sem evento detectada. Não é `RULE` (não
   reabre `P-SAN3-05-REGRA-EM-TABELA`). Linhas antigas ficam com nulo, e nulo é inelegível. O rollback remove gatilho,
   função e coluna, e só antes de dado real. Nada mais em `field_dispatches` muda.

No código: `FIELD_LOCATION_SOURCES` (`field-location.types.ts:3`) **não muda** — é a lista que `parseSource` aceita do
cliente (`field-location.service.ts:160-169`); nasce `FIELD_LOCATION_STORED_SOURCES` com `traccar`, usada só no tipo
gravado e no comando interno. A rota móvel continua respondendo `400 invalid_source` a `source: "traccar"`.

Não se cria `VehicleLocation`: a posição viva já tem destino. `VehicleTelemetryEvent` só entra no B-TRC-02.

### 3.2 Destino de cada módulo citado no briefing

| Módulo existente | Como a trilha o alimenta ou preserva |
|---|---|
| `field-location` | B-TRC-01 grava a posição normalizada pelo repositório existente, no `tx` da fase 2, com `source='traccar'` só pelo comando interno (P-07). |
| `field-ops-realtime` | B-TRC-01 publica `field_location.updated`; o broker/SSE existente só sinaliza e não transporta coordenada. |
| `telemetry` | B-TRC-02 acrescenta a vertente veicular sem alterar a semântica da telemetria do app; B-TRC-04 oferece leitura unificada com fonte explícita. |
| `vehicles` | B-TRC-03 torna o cadastro de viatura dono do vínculo ao rastreador; não nasce cadastro duplicado. |
| `vehicle-identities` | **Não recebe dispositivo.** A medição mostra que esse módulo é a identidade canônica de veículo **de terceiro/recolhido**, com placa/chassi/RENAVAM e merge (`vehicle-identity.types.ts:10-42,94-113`, M-18). Misturar tracker ali corromperia o domínio. Ele só participa futuramente se uma regra aprovada ligar uma identidade recolhida a uma `Vehicle`; essa regra não existe hoje. |
| `field-dispatch` | B-TRC-01 adiciona `findOperatorsForVehicleAt` (`operator_assigned_at ≤ accepted_at ≤ fixTime` e antes do término, A2-12) e a coluna `operator_assigned_at` com gatilho; não cria fluxo de despacho nem muda o serviço. |
| `mobile` | Continua sendo a entrada autenticada da telemetria do app, derivando tenant/operador do ator (`mobile-telemetry-sync.ts:11-25`, M-18). O Traccar não chama rota mobile; B-TRC-04 preserva as duas fontes sem dupla contagem. |
| mapa operacional | Recebe o mesmo DTO `/field-locations/latest`; não chama Traccar. |
| `notifications` | Só B-TRC-05, somente para alarmes com contrato/regra aprovados. |

Esse tratamento registra uma divergência aparente, não a esconde: “alimentar os módulos que já
existem” não autoriza gravar um identificador de hardware em `vehicle-identities`, pois a decisão
canônica enumera `vehicles`, despacho e mapa — não identidade de pátio
(`decisoes.md:2223-2230`, M-2). A trilha preserva o módulo e documenta por que ele não é destino.

## 4. Desenho da ingestão

### 4.1 Listener próprio, em porta própria (fecha B-01)

**Fato.** Cada app Express do repo tem o seu listener, e já existe o precedente de um segundo app em porta própria:
`src/server.ts:35-44` sobe `createPortalApp()` em `env.PORTAL_PORT` (default 3100, `src/config/env.ts:292`) ao lado
de `createApp()` em `env.PORT`; `src/portal-app.ts:21-55` monta helmet, CORS e logger próprios, nenhuma rota sob
`/api/v1` e um 404 próprio; `docker-compose.prod.yml:93-94` publica só a 3000. No app público, tudo sob `/api/v1`
passa por `attachAuthenticatedActor()` e termina num 404 (`src/app.ts:126-256`).

**Desenho (espelho = `src/portal-app.ts` + `src/infra/jobs/job-worker.bootstrap.ts:87`).**

- `src/integrations/traccar/traccar-ingest.app.ts` exporta `createTraccarIngestApp(deps)`: Express distinto, que
  serve **uma** rota, `POST /ingest/traccar/v1/positions`, e 404 `{"error":{"code":"NOT_FOUND"}}` para todo o resto.
  Ordem fixa dos middlewares da rota: (1) query string presente → `400 query_not_allowed` (segredo nunca em query,
  por construção); (2) autenticação do header → `401`; (3) `Content-Type` diferente de `application/json` → `415`;
  (4) `express.json({ limit: "64kb", strict: true })` → `413` ou `400 invalid_json`; (5) limite de taxa e de
  concorrência → `429`; (6) schema allowlist → `422`; (7) serviço com orçamento de tempo → `204`/`202`/`409`/`503`.
  Sem CORS (nenhum navegador fala com esta porta) e sem `attachAuthenticatedActor` (não há usuário).
- `src/integrations/traccar/traccar-ingest.bootstrap.ts` exporta `startTraccarIngestListenerIfEnabled({ logger })`:
  flag desligada → não escuta e devolve `{ status: "disabled" }`; ligada → registra `server.once("error", …)` **antes**
  de `listen(TRACCAR_INGEST_PORT, TRACCAR_INGEST_HOST)` e devolve `{ status: "listening" }` ou
  `{ status: "bind_failed", code }`. **Falha do `listen` não derruba a API pública (A2-02):** em `EADDRNOTAVAIL`,
  `EADDRINUSE` ou `EACCES` o bootstrap loga `{ code, host, port }` em nível `error`, não relança, e o processo segue
  servindo o app público; a ingestão fica fora até o próximo deploy (`traccar_ingest_listener_up = 0`). Medido pela
  r2 (E-01d): sem tratador, o `EADDRNOTAVAIL` sai como `Unhandled 'error' event` e o processo morre com a API junto.
  A mesma lacuna no `portalApp.listen` (`src/server.ts:39-44`) é pré-existente e vai ao registro
  (`P-PORTAL-LISTEN-SEM-TRATADOR`).
- `src/server.ts` ganha uma chamada a esse bootstrap depois do `portalApp.listen`. **`src/app.ts` não muda** e é escopo
  proibido do B-TRC-01: o app público não tem rota do Traccar, então nenhum caminho do listener público chega à
  ingestão, seja qual for a rede.
- `src/config/env.ts` ganha: `TRACCAR_INGEST_ENABLED` (`booleanFlag(false)`), `TRACCAR_INGEST_HOST` (default
  `127.0.0.1`), `TRACCAR_INGEST_PORT` (default `3200`), `TRACCAR_INSTANCE_KEY` (sem default), `TRACCAR_FORWARD_SECRET_CURRENT`,
  `TRACCAR_FORWARD_SECRET_PREVIOUS`, `TRACCAR_FORWARD_SECRET_PREVIOUS_UNTIL` (ISO), `TRACCAR_INGEST_RATE_PER_SECOND` (20),
  `TRACCAR_INGEST_BURST` (100), `TRACCAR_INGEST_MAX_CONCURRENCY` (10), `TRACCAR_DB_POOL_MAX` (5), `TRACCAR_INGEST_TIMEOUT_MS` (3000),
  `TRACCAR_RESOLVE_MAX_TENANTS` (500), `TRACCAR_RESOLVE_HINT_TTL_MS` (600000), `TRACCAR_RESOLVE_NEGATIVE_TTL_MS` (60000),
  `TRACCAR_RESOLVE_CACHE_MAX` (10000). Gates no `superRefine`, em qualquer ambiente com a flag ligada:
  `TRACCAR_INSTANCE_KEY` casa `^[a-z0-9-]{3,40}$`; segredo current com ao menos 32 caracteres e fora da lista de
  defaults de dev; previous, se houver, exige `…_PREVIOUS_UNTIL` no futuro e no máximo 72 h adiante; porta de ingestão
  diferente de `PORT` e de `PORTAL_PORT`. Em produção, flag ligada sem segredo forte **não boota**.

**Rede.** Dev: §6.1 (a 3200 não aparece em `ports:` e o processo a liga ao IP fixo da rede interna). AWS: §6.2 (porta
de contêiner própria, Security Group de entrada só a partir do SG do Traccar, nenhum target group público nela).

**Pool de banco próprio (A2-07).** Hoje o processo tem um `PrismaClient` só, criado com
`new PrismaPg({ connectionString })` sem `max` (`src/database/prisma.ts:15-17`); a r2 mediu no `node_modules` do clone
principal que isso vira um `pg.Pool` de **10** conexões (`@prisma/adapter-pg` 7.8.0, `pg-pool` 3.14.0). Para a ingestão
não roubar conexão do ERP público, `src/integrations/traccar/traccar-db.ts` cria um `PrismaClient` **só da ingestão**,
com `new PrismaPg({ connectionString: DATABASE_URL, max: TRACCAR_DB_POOL_MAX })` (5), mesmo papel `erp_runtime`; a
ingestão nunca importa `src/database/prisma.ts`. Concorrência da ingestão = 2 × pool (10); quem passar espera no pool
até o `maxWait` de 250 ms e recebe `503`. Por processo: 10 conexões do app público + 5 da ingestão.

**Por que o SSE continua funcionando.** O broker do tempo real é um mapa em memória do processo
(`src/modules/field-ops-realtime/field-ops-realtime.broker.ts:25`); os dois listeners vivem no mesmo processo, então o
evento publicado pela ingestão chega aos assinantes do SSE do app público. Com várias réplicas, assinante de uma não
recebe evento de outra — limitação preexistente do broker (vale igual para o app móvel), registrada para o B-TRC-06.

### 4.2 Fluxo em duas fases

```text
rastreador/simulador → Traccar (OsmAnd 5055, rede traccar_devices)
  → forward JSON {position, device} + header X-Traccar-Forward-Token, rede traccar_private
  → listener de ingestão (3200, IP privado): query? → auth → content-type → 64 KiB → limite → schema allowlist
  → comando canônico (chave de identidade + digest)                              [§4.4]
  → FASE 1, descoberta (sem trava, NÃO autoritativa)                              [§4.3]
       dica em memória → senão organizações ativas, uma sondagem por organização sob o GUC dela,
       parando no primeiro vínculo ativo; orçamento de 500 organizações; transação com { maxWait: 250, timeout: 1000 }
  → FASE 2, transação curta: withTenantRlsBudget(clienteDaIngestão, candidata, { maxWait: 250, timeout: 1750 })
       0. SET LOCAL lock_timeout = '1000ms'; SET LOCAL statement_timeout = '1500ms'        [A2-03]
       1. a candidata ainda está 'active' em tenants; senão quarentena tenant_inactive       [N2-07]
       2. SELECT do vínculo ativo (instância, dispositivo) … FOR SHARE
          0 linhas → ROLLBACK, invalida a dica e, se restar ≥ 1 s do orçamento, refaz descoberta + fase 2 UMA vez;
          0 de novo → quarentena unmapped_device; sem orçamento → 503
       3. valid=true e valid_from ≤ fixTime ≤ agora + 5 min; senão quarentena invalid_fix /
          fix_before_active_binding / fix_in_future
       4. SELECT do recibo pela chave: se visível, compara o digest → 204 (igual) ou 409 (diferente),
          SEM resolver operador                                                            [N2-03]
       5. operador do veículo no fixTime (regra abaixo): exatamente um; senão quarentena
          no_operator_at_fix_time / ambiguous_operator_at_fix_time / operator_history_ambiguous
       6. INSERT do recibo … ON CONFLICT DO NOTHING RETURNING; sem linha (corrida) → compara o digest [§4.4]
       7. INSERT de FieldOperatorLocation (source='traccar') e UPDATE do recibo com location_id
     COMMIT
  → só depois do commit, e só na primeira gravação: publishDomainEvent('field_location.updated', sem coordenadas)
  → SSE existente → o mapa busca /api/v1/field-locations/latest e redesenha o pin
```

Quando a decisão é quarentena dentro da fase 2, a linha de quarentena (tabela global, §4.5) é gravada na mesma
transação e nada de domínio é escrito; quando nem a descoberta acha organização, a quarentena é uma transação
própria, sem GUC.

**Operador no instante (regra fail-closed do B-TRC-01, refeita na v2.1 para fechar A2-12).** Elegível é o despacho `d`
da OS `wo` com `wo.vehicle_id = vínculo.vehicle_id` e

- `d.operator_assigned_at ≤ d.accepted_at ≤ fixTime`, e
- `fixTime` antes do primeiro entre `completed_at`, `cancelled_at` e `failed_at` que não for nulo.

`operator_assigned_at` é coluna nova em `field_dispatches`. Um gatilho a grava na **mesma instrução** que cria o
despacho ou troca `operator_user_id`, e ignora o valor que o cliente mandar (§3.1 item 5). `accepted_at` só é gravado
quando o status vai a `accepted` (`field-dispatch-prisma.repository.ts:86`). Então a desigualdade diz: o técnico que
está hoje no despacho aceitou-o **depois de recebê-lo** e **antes do fix**. Medido em PostgreSQL 16, sob papel sem
bypass (§11 M-38):

- reatribuição A→B **sem** evento deixa B inelegível;
- `reassigned → on_route` sem novo aceite continua inelegível;
- B aceitando de novo passa a valer dali para frente;
- valor forjado no `UPDATE` é ignorado.

Na ida e volta A→B→A, a volta regrava `operator_assigned_at`, e nenhum fix do período de B vai para A.

**Por que não o evento.** `reassign` e `createEvent` rodam em transações separadas
(`field-dispatch-prisma.repository.ts:170,174`; `field-dispatch.service.ts:550-577`). O `accepted_at` antigo
permanece, e `reassigned → on_route` dispensa novo aceite (`field-dispatch.validators.ts:7-17`). A r2 mediu tudo isso
(E-3e). A não atomicidade é pré-existente e vai ao registro (`P-FIELD-DISPATCH-REASSIGN-NAO-ATOMICO`); o B-TRC-01
deixa de depender dela.

**Resultado:**

- exatamente um `operator_user_id` distinto grava;
- zero dá `no_operator_at_fix_time`; mais de um dá `ambiguous_operator_at_fix_time`;
- despacho na janela com `accepted_at` anterior a `operator_assigned_at`, ou com `operator_assigned_at` nulo, dá
  `operator_history_ambiguous`.

Despachos anteriores à migração têm `operator_assigned_at` nulo e ficam inelegíveis até nova atribuição ou novo aceite
(falha fechada). A consulta mora no `field-dispatch` (`findOperatorsForVehicleAt(tx, { tenantId, vehicleId, at })`),
recebe o `tx` da fase 2 e não abre transação. Os efeitos visíveis dessa regra são a decisão 4 do dono.

### 4.3 Resolução do dispositivo: janela fechada e custo limitado (fecha B-02 e B-03)

**Janela fechada por construção, não por disciplina.** Duas garantias do PostgreSQL, medidas sob papel
`NOSUPERUSER NOBYPASSRLS` no cluster descartável (§11 M-21):

1. Índice único parcial **global** em `vehicle_tracking_bindings (instance_key, external_device_key) WHERE valid_to
   IS NULL`. Índice único não passa pela política de RLS: sob o GUC de B, o `INSERT` do dispositivo ativo em A falhou
   com `duplicate key value violates unique constraint` (U1b), embora B enxergue zero linhas de A (U1c); com
   `ON CONFLICT … DO NOTHING`, voltou 0 linhas sem erro (U2). Logo, a qualquer instante, existe no máximo um vínculo
   ativo por dispositivo em todo o banco — para qualquer escritor.
2. A fase 2 confirma o vínculo com `SELECT … FOR SHARE` na mesma transação que grava a posição. Medido (U4): com
   `FOR SHARE`, a desativação concorrente do vínculo esperou 1,98 s, até a ingestão terminar; com `FOR KEY SHARE`,
   0,00 s; sem trava, 0,00 s. E uma ingestão que começa durante uma desativação em voo espera, e a re-checagem do
   PostgreSQL devolve 0 vínculos (U4d): ela não grava em A e cai na redescoberta. O `FOR SHARE` exige privilégio de
   UPDATE e passa pela política `FOR ALL` da tabela — o `erp_runtime` tem os dois (DEFAULT PRIVILEGES do migrador), e o
   U4 rodou exatamente assim, sob papel sem bypass.

Daí: enquanto a posição é gravada em A, o vínculo de A está travado e ativo, e nenhum outro tenant pode ter vínculo
ativo do mesmo dispositivo; para B ganhar o vínculo, A precisa ser desativado antes, e essa desativação espera a
ingestão. O advisory lock da v1 sai: ele só valia para escritores que o pedissem.

**Custo medido e limitado.** A descoberta é só uma dica — a confirmação da fase 2 é a autoridade —, então ela pode
ser barata e pode errar sem risco:

- **Dica positiva** em memória `(instância, dispositivo) → tenant`, validade `TRACCAR_RESOLVE_HINT_TTL_MS` (10 min),
  no máximo `TRACCAR_RESOLVE_CACHE_MAX` (10.000) entradas. Com a dica certa, a posição custa **uma** sondagem: a
  confirmação. Dica errada (envenenada, velha): a confirmação volta 0, a dica cai e a descoberta roda de novo.
- **Varredura com parada no primeiro achado.** Como o índice global garante um vínculo ativo só, o primeiro achado é
  o único; não é preciso varrer todas as organizações para provar ausência de outro.
- **Cache negativo** de 60 s para dispositivo sem vínculo, com o mesmo teto: o segundo envio de um dispositivo
  desconhecido não varre de novo; vai direto à quarentena.
- **Orçamento.** Com mais de `TRACCAR_RESOLVE_MAX_TENANTS` (500) organizações ativas, a descoberta não roda: a posição
  vai à quarentena `resolution_budget_exceeded` (`202`, durável, métrica), nunca a uma organização adivinhada.

**O penhasco do teto, declarado (A2-06).** O teto conta **todas** as organizações ativas da plataforma, não só as que
têm rastreador. Na 501ª, qualquer que seja, todo dispositivo sem dica válida vai para a quarentena, e a coordenada
fica só no Traccar. Como `202` é 2xx, o Traccar não repete. Três regras escritas:

1. **Validade deslizante:** cada confirmação bem-sucedida da fase 2 renova a dica por mais
   `TRACCAR_RESOLVE_HINT_TTL_MS`, então um dispositivo que manda posição não perde a dica enquanto manda.
2. **Reinício frio, declarado:** deploy ou reinício zeram as dicas (memória do processo). Abaixo do teto, cada
   dispositivo redescobre uma vez (≤ 0,4 s pela hipótese de §4.3); acima, todos vão à quarentena até o teto subir.
3. **Aviso antes do penhasco:** o B-TRC-01 emite o número de organizações ativas contra o teto, no log de início e
   numa métrica a cada descoberta, com aviso a partir de 80 %; o alarme ligado a isso é do B-TRC-06.

A saída estrutural — contar só as organizações com o módulo de rastreamento — depende da decisão sobre o recurso pago
(decisão 4 do dono, opção c, e §9.1 item 7) e não entra no B-TRC-01. Hoje o número de organizações ativas em produção
não foi medido (HIPÓTESE: muito abaixo de 500).

Medição (pgbench, 1 cliente, TCP local dentro do contêiner, PG 16.14, §11 M-22): caminho quente — confirmação
`FOR SHARE` + `INSERT` do recibo — **0,534 ms** por transação; varredura de pior caso (dispositivo sem vínculo) com
10, 100 e 1.000 organizações — **1,455 ms**, **15,47 ms** e **165,7 ms**. É linear: ~0,16 ms de servidor por
organização, mais duas idas e voltas de rede no cliente (troca de GUC + sondagem). **Hipótese a medir no B-TRC-06:** com
0,3 ms de ida e volta na VPC, 500 organizações custam ~0,08 s de servidor + ~0,3 s de rede ≈ 0,4 s, abaixo do orçamento
de 3 s; o B-TRC-06 mede com o número real de organizações e ajusta o teto sem código.

**Sem leitura cross-tenant nova, sem `SECURITY DEFINER`, sem `BYPASSRLS`.** A lista de organizações ativas vem de
`tenants`, tabela global sem RLS e já enumerada pelo produto (`impound.reconcile.service.ts:50`,
`charge.accrual.service.ts:19`; nota N-01 da crítica). Cada sondagem roda sob o GUC da própria organização e passa pelo
canário `assertRowsBelongToTenant` (`src/database/rls.ts:83-91`). Um diretório global `dispositivo → organização`
seria leitura cross-tenant e é recusado; uma view sobre tabela FORCE é recusada pelo guard do runtime
(`src/database/runtime-role.ts:1-50`); uma função `SECURITY DEFINER` reabriria o resíduo
`P-SAN3-05-SECURITY-DEFINER-INVENTARIO`. O helper novo `findFirstTenantRls(client, tenantIds, probe)` entra em
`src/database/rls.ts` (transação somente leitura, uma troca de GUC por volta, canário, parada no primeiro achado) sem
mudar `withTenantRls` nem `forEachTenantRls`.

### 4.4 Idempotência (fecha B-04)

**Fato que muda a chave (P-01).** No 6.16.0, `PositionForwardingHandler` roda antes de `DatabaseHandler`
(`ProcessingHandler.java:101-119`): o forward sai antes de a posição ganhar `id`. A chave `instância + deviceId +
positionId` da decisão (`decisoes.md:2250-2252`) não está disponível nesta versão; vale o ramo que a própria decisão
prevê — "chave determinística documentada, nunca só timestamp":

- `external_event_key` = SHA-256 (hex) de `v1`, `instance_key`, `device.uniqueId`, `fixTime` em milissegundos UTC,
  latitude e longitude com 7 casas, unidos por barra vertical; `message_kind = 'position'`.
- `payload_digest` = SHA-256 (hex) do JSON canônico de todos os campos permitidos — `uniqueId`, `traccarDeviceId`,
  `protocol`, `fixTime`, `deviceTime`, `valid`, latitude e longitude com 7 casas, `speedKnots`, `course`, `accuracy` —,
  sem `serverTime` e sem `attributes`.

**Algoritmo (fase 2, sob o GUC da organização confirmada).** O reenvio comum já sai no passo 4 da fase 2 (`SELECT`
do recibo antes de resolver o operador, N2-03); a tabela abaixo é o passo 6, que cobre a corrida entre duas entregas.

| Resultado do `INSERT … ON CONFLICT DO NOTHING RETURNING` | `SELECT` do recibo pela chave | Desfecho |
|---|---|---|
| 1 linha | — | grava a posição; `COMMIT`; publica o evento; `204` |
| 0 linhas | visível, mesmo digest | nada novo, nada publicado; `204` |
| 0 linhas | visível, digest diferente | `conflict_count + 1` e `last_conflict_at` no recibo; nenhuma posição; `409 traccar_idempotency_conflict` |
| 0 linhas | invisível (a chave é de outra organização) | quarentena `idempotency_key_owned_elsewhere`; `409` |

A unicidade do recibo é **global** (`instance_key, message_kind, external_event_key`, sem `tenant_id`), pela mesma
razão do vínculo: uma posição do Traccar nunca vira duas linhas em duas organizações. O `INSERT` puro aborta a
transação na violação (U3d, `current transaction is aborted`), por isso o `ON CONFLICT`. Sob concorrência, o segundo
`INSERT` igual espera o primeiro terminar e então volta 0 linhas (semântica do `ON CONFLICT` do PostgreSQL): as duas
entregas idênticas respondem 2xx com um recibo e uma posição; duas divergentes respondem uma `204` e uma `409`.
O Traccar repete toda resposta não-2xx — `409` inclusive — até `forward.retry.count` (10) com atraso dobrando a partir
de 100 ms, e depois descarta (`Keys.java:1118-1157`, `PositionForwardingHandler.java:89-98`): o custo de um conflito é
limitado e aparece na métrica e no contador do recibo. Como a chave não usa `position.id`, reiniciar o banco do Traccar
não gera colisão falsa.

**Retry com `position.id > 0` (A2-10).** O P-01 vale só para a **primeira** tentativa. Cada retry reserializa o mesmo
objeto `Position` (`PositionForwardingHandler.java:68-130`), e o `DatabaseHandler` já gravou o `id` nele por
`position.setId(id)` (`DatabaseHandler.java:39-48`, tag v6.16.0, medido pela r2 em E-2a). Por isso o parser de
runtime aceita `id` ausente, 0 ou maior que 0, e **ignora** o valor: ele não entra na chave nem no digest. Primeira
entrega e retry da mesma posição geram a mesma chave e o mesmo digest e terminam em `204`. Rejeitar `id > 0` com 422
perderia justamente as posições que o retry existe para salvar. O teste de contrato prova as duas entregas (MUT-42).

### 4.5 Quarentena (fecha B-05)

Tabela global `traccar_quarantine_items`, **sem `tenant_id`, sem coordenada, sem payload**: `id`, `instance_key`,
`external_device_key`, `reason`, `first_seen_at`, `last_seen_at`, `first_fix_at`, `last_fix_at`, `delivery_count`
(≥ 1), `last_event_key`, `last_payload_digest`, `resolved_at`, `resolution`. Motivos (CHECK): `unmapped_device`,
`invalid_fix` (`valid=false`, sem fix de GPS), `tenant_inactive` (organização da dica deixou de estar ativa, N2-07), `fix_before_active_binding`, `fix_in_future`, `no_operator_at_fix_time`, `ambiguous_operator_at_fix_time`,
`operator_history_ambiguous`, `resolution_budget_exceeded`, `idempotency_key_owned_elsewhere`. O antigo
`ambiguous_binding` sai: dois vínculos ativos ficaram impossíveis (§4.3).

**Identidade sob concorrência:** índice único parcial `(instance_key, external_device_key, reason) WHERE resolved_at
IS NULL` — um episódio aberto por dispositivo e motivo. Gravação (cada `:nome` vira parâmetro do `$queryRaw` com template, nunca texto concatenado):

```sql
INSERT INTO traccar_quarantine_items
  (instance_key, external_device_key, reason, first_fix_at, last_fix_at, last_event_key, last_payload_digest)
VALUES (:instance, :device, :reason, :fix, :fix, :key, :digest)
ON CONFLICT (instance_key, external_device_key, reason) WHERE resolved_at IS NULL
DO UPDATE SET delivery_count      = traccar_quarantine_items.delivery_count + 1,
              last_seen_at        = now(),
              first_fix_at        = LEAST(traccar_quarantine_items.first_fix_at, EXCLUDED.first_fix_at),
              last_fix_at         = GREATEST(traccar_quarantine_items.last_fix_at, EXCLUDED.last_fix_at),
              last_event_key      = EXCLUDED.last_event_key,
              last_payload_digest = EXCLUDED.last_payload_digest;
```

Medido (U5): 20 entregas concorrentes → 1 linha, `delivery_count = 20`. Semântica escrita: `delivery_count` conta
**entregas** (retries do Traccar inclusive), não posições distintas; a janela `first_fix_at … last_fix_at` é o que a
reconciliação do B-TRC-03 pede à REST do Traccar. Episódio resolvido não reabre: a entrega seguinte abre outro.
Resposta `202` depois do commit; o Traccar não repete 2xx. O papel de runtime recebe DML na tabela nova pelos
`DEFAULT PRIVILEGES` do migrador (`scripts/db-runtime-role.sh:67-79`); a migração não concede nada além.

### 4.6 Autenticação, rotação e respostas

- **Header único:** `X-Traccar-Forward-Token`. O Traccar o envia a partir de `forward.header`, no formato
  `Nome: valor` (divide no primeiro `:`, `PositionForwarderJson.java:61-71`), e **só para a URL global**
  (`Keys.java:1110-1116`). Em produção e em dev o valor vem do ambiente: `CONFIG_USE_ENVIRONMENT_VARIABLES=true` e
  `FORWARD_HEADER` (`Config.java:48-49,80-88,140-142`; fecha A-01). O segredo tem 32 bytes aleatórios
  (`randomBytes(32).toString("base64url")`), mora no gerenciador de segredos/env e nunca em código, query string,
  corpo, frontend, resposta ou log.
- **Comparação:** apresentado e candidatos viram SHA-256 de tamanho fixo e são comparados com
  `crypto.timingSafeEqual` contra `TRACCAR_FORWARD_SECRET_CURRENT` e, se `agora < TRACCAR_FORWARD_SECRET_PREVIOUS_UNTIL`,
  contra `..._PREVIOUS`. Rotação: gravar o novo como current mantendo o antigo como previous com prazo de até 72 h,
  trocar o `FORWARD_HEADER` do Traccar, confirmar tráfego, remover o previous. Prazo vencido → previous recusado.
- **Formas recusadas com 401:** header ausente; valor errado; tamanhos diferentes; header repetido (o Node junta
  repetições de header não padronizado com `, ` — medido no Node v20.19.5, §11 M-35 —, então o valor deixa de bater); segredo enviado em `Authorization`.
- **Respostas** (corpo vazio em 2xx; `{"error":{"code":"…"}}` nos demais, sem detalhe):

| Código | Quando | O que o Traccar faz (6.16.0) |
|---|---|---|
| `204` | posição gravada, ou reenvio idêntico já gravado | encerra |
| `202` | quarentena durável | encerra |
| `400` | query string presente; JSON malformado | repete até o teto e descarta |
| `401` | header ausente, inválido, repetido ou previous vencido | repete até o teto e descarta |
| `409` | mesma chave com digest diferente; chave de outra organização | repete até o teto e descarta |
| `413` | corpo acima de 64 KiB | repete até o teto e descarta |
| `415` | `Content-Type` não JSON | repete até o teto e descarta |
| `422` | schema fora da allowlist; campo reservado presente | repete até o teto e descarta |
| `429` | taxa ou concorrência acima do limite | repete com atraso crescente |
| `503` | falha transitória antes do commit (banco, orçamento de tempo) | repete com atraso crescente |

  O Traccar não distingue 4xx de 5xx: toda resposta não-2xx entra no retry, se `forward.retry.enable=true`, até
  `forward.retry.count` (default 10) e com no máximo `forward.retry.limit` (default 100) pendentes
  (`Keys.java:1118-1157`). O que passar do teto se recupera pela REST no B-TRC-03.
- **Limites iniciais, configuráveis:** 64 KiB; 20 req/s sustentadas e rajada de 100 (token bucket por processo);
  10 em processamento sobre um pool próprio de 5 conexões (§4.1, A2-07); 3 s de orçamento por requisição, assim
  dividido (A2-03): descoberta em transação com `{ maxWait: 250, timeout: 1000 }`; fase 2 em `withTenantRlsBudget`
  com `{ maxWait: 250, timeout: 1750 }`, que começa por `SET LOCAL lock_timeout = '1000ms'` e
  `SET LOCAL statement_timeout = '1500ms'` no servidor. O `FOR SHARE` que espera além disso é cancelado pelo próprio
  PostgreSQL (`canceling statement due to lock timeout`, medido em PG 16, §11 M-39), a transação volta, nada é gravado,
  e a resposta é `503`. `withTenantRls` não aceita opções (`src/database/rls.ts:29-39`) e continua intacto: o helper
  novo vive ao lado dele. São HIPÓTESE de proteção, não capacidade prometida; o B-TRC-06 mede.

### 4.7 Logs sem segredo (fecha A-02)

- O app de ingestão cria o próprio `pinoHttp` com **serializadores de allowlist**: `req` → `{ method, path }` (caminho
  sem query), `res` → `{ statusCode }`. Nenhum header entra no log, por construção; a `redact` de
  `req.headers["x-traccar-forward-token"]`, `req.headers.authorization` e `req.headers.cookie` fica como cinto.
- Corpo nunca é logado; o tratador de erro loga só `{ code }`, sem `err.stack` nem payload.
- No Traccar, a falha de forward vira `RuntimeException("HTTP code " + code)` (`PositionForwarderJson.java:83-84`) e
  o retry loga esse erro e a contagem pendente (`PositionForwardingHandler.java:98`): o header não aparece.
- Prova: `tests/traccar-ingest-logs.test.ts` liga o app a um logger `pino` com destino em memória, envia requisições
  que terminam em 204, 202, 400 (query), 401, 400 (JSON inválido), 413, 415, 422 e 503 (serviço falso que estoura o tempo),
  cada uma com um segredo-sentinela e uma coordenada-sentinela, e exige que nenhum dos dois apareça no log capturado.

### 4.8 Eventos, tempo real e REST

- O SSE existente leva só o aviso: o broker remove chaves de coordenada (`field-ops-realtime.broker.ts:21`); a
  publicação acontece depois do commit e só na primeira gravação. O mapa continua lendo `/api/v1/field-locations/latest`.
- O mapa do frontend não lê o campo `source` da localização (busca em `frontend/src/modules/operations/map/**`, §11
  M-25), então o novo valor `traccar` não exige mudança de tela no B-TRC-01.
- A REST do Traccar serve a cadastro, saúde, reconciliação da quarentena, backfill por janela e lacunas (B-TRC-03), com
  cursor, paginação, backoff e orçamento; nunca polling curto; sem WebSocket. Evento técnico (`event.forward.*`) é do
  B-TRC-02; a documentação não traz retry para evento, então evento perdido se reconcilia pela REST.
- **Risco medido do lado do Traccar (P-04):** `forward.url` aceita valor por dispositivo (`Keys.java:1102-1108`);
  quem administrar o Traccar poderia desviar posições para outra URL (sem o header, mas com a posição). Mitigação: a
  interface e a REST do Traccar não são expostas; a conta administrativa é só do serviço do ERP (B-TRC-03); o egress
  do Traccar fica restrito ao ERP (rede interna em dev; Security Group de saída na AWS).

## 5. Threat model

### 5.1 Ativos, atores e fronteiras

**Ativos:** localização e histórico, vínculo dispositivo ↔ organização ↔ viatura, atribuição a técnico, segredos de
forward e REST, recibos e quarentena, disponibilidade da ingestão e isolamento RLS. **Atores:** rastreador, Traccar,
`erp_runtime`, usuário ERP autorizado, operador de nuvem, insider, administrador do Traccar, dispositivo comprometido e
atacante de rede. **Fronteiras:** dispositivo → listener de protocolo do Traccar; Traccar → **listener de ingestão
próprio** do ERP (porta 3200, §4.1); descoberta → confirmação sob RLS; ERP → PostgreSQL; ERP → REST do Traccar
(B-TRC-03); ERP → SSE/REST → navegador. A porta de protocolo dos rastreadores físicos é outra fronteira e não é
autorizada por este plano.

| STRIDE | Ameaça concreta | Mitigação e prova |
|---|---|---|
| Spoofing | Forward falso, ou segredo antigo reutilizado | Listener próprio, inalcançável pela rede pública e pelo listener público (§4.1); em dev, alcançável do host Linux ou da VM do Docker (A2-01), onde a barreira é o segredo; segredo de 32 bytes em header; SHA-256 + `timingSafeEqual`; previous com prazo de até 72 h; `Authorization` recusado. Testes de `traccar-forward-auth` e `traccar-ingest-listener`; MUT-01 a MUT-03, MUT-17 a MUT-19, MUT-31, MUT-37, MUT-38 |
| Spoofing | Payload declara outra organização | Organização nunca vem do payload; chave reservada dá 422; a confirmação sob RLS decide. MUT-20 |
| Tampering | Mass assignment, coordenada ou unidade alterada | Allowlist do envelope `{position, device}`, `attributes` ignorado, nós → m/s explícito, limites físicos, digest canônico. MUT-25 |
| Tampering / integridade | Mesma posição com conteúdo trocado | Chave de identidade + digest; divergência dá 409 e contador no recibo. MUT-10 a MUT-12 |
| Repudiation | Traccar ou ERP nega entrega ou replay | Recibo com chave, digest, tempos e resultado; quarentena com contador; nada de payload bruto ou token |
| Information disclosure | Token, coordenada ou organização em log, erro, SSE ou tela indevida | Serializador de allowlist no log da ingestão; corpo nunca logado; `device.name/phone/contact` nunca lidos; quarentena sem coordenada; SSE sem coordenada; respostas sem detalhe. MUT-16, MUT-27, MUT-28 |
| Information disclosure (canal lateral) | O 23505 do índice global revela que o dispositivo está vinculado em algum lugar | Inerente à regra "um dispositivo, uma organização"; só a ação administrativa de vínculo (B-TRC-03) o vê, e responde 409 sem dizer onde |
| Denial of service | Corpo grande, rajada, retry storm, varredura forçada, pool de banco esgotado, `listen` que falha | 64 KiB (MUT-32); `Content-Type` (MUT-33); 20 req/s, rajada 100, 10 em processamento → 429 (MUT-30); pool próprio de 5 conexões, o app público fica com o dele (MUT-41); `lock_timeout`/`statement_timeout` (MUT-40); falha do `listen` não derruba a API (MUT-39); dica, cache negativo e teto de 500 organizações, com o penhasco declarado (§4.3; MUT-07 a MUT-09); métricas de 202/409/429/503 |
| Elevation of privilege | Runtime contorna FORCE por papel, regra de tabela ou função elevada | `NOSUPERUSER NOBYPASSRLS`; nenhuma `RULE`, view ou `SECURITY DEFINER` nova (o teste do vínculo conta `pg_rules` das tabelas novas e roda o `RUNTIME_ROLE_GUARD_SQL`); produção bloqueada pelos dois resíduos abaixo |
| Elevation / tampering | Dois tenants com o mesmo dispositivo, ou troca do vínculo no meio da gravação | Índice único **global** + `SELECT … FOR SHARE` na transação da gravação (§4.3, medido). MUT-04 a MUT-06 |
| Elevation / tampering (B-TRC-03) | Organização vincula rastreador que não é dela, ou vínculo retroativo cobre fix de outra organização | Condições de início do B-TRC-03: posse provada (decisão 5) e um dono no instante do fix por construção, sem vínculo retroativo (A2-04, A2-05). O oráculo de 1 bit do 23505 não vaza chave nem `tenant_id` (r2, E-02a) |
| Tampering (lado do Traccar) | Administrador do Traccar põe `forward.url` por dispositivo e desvia posições | `forward.url` aceita valor por dispositivo (`Keys.java:1102-1108`); interface e REST do Traccar não expostas, conta só do serviço do ERP, egress do Traccar fechado (rede interna em dev, SG de saída na AWS) |
| Supply chain | Imagem do Traccar adulterada ou vulnerável | Tag **e** digest (`sha256:03ebb7ed…`, §11 M-20), scan no B-TRC-06, atualização explícita com contract tests; nunca `latest`; nunca servidor público de demonstração |
| Privacy | Trajeto atribuído a quem não dirigia, ou retenção excessiva | `operator_assigned_at ≤ accepted_at ≤ fixTime`, gravado por gatilho na mesma instrução que troca o operador (§4.2, §3.1 item 5); despacho reatribuído sem novo aceite vai à quarentena (MUT-22, MUT-43); retenção, base legal e quem vê são a decisão 6 do dono, antes da produção |

**Resíduos de RLS que bloqueiam produção** (ressalva do porteiro do #405, `PORTEIRO-405.md:147`, na `main`
desde `c1cfdabe`): `P-SAN3-05-REGRA-EM-TABELA` (`pendencias.md:10367`) — o porteiro **reproduziu**: um
papel limpo gravou linha de B sob contexto de A por uma regra `DO ALSO`, e a trava não acusou; hoje há 0 regras de
usuário no banco migrado — e `P-SAN3-05-SECURITY-DEFINER-INVENTARIO` (`pendencias.md:10115`, `auth_login_candidates`).
O B-TRC-01 não cria regra nem função elevada e prova isso por teste; o B-TRC-06 reexecuta os inventários; o B-TRC-07
exige os dois fechados ou nova decisão expressa do dono com junta de segurança.

**Cadeia de produção** (`PORTEIRO-405.md:145`): ingestão em produção ⇐ deploy de produção ⇐ Ato 2 (o boot de produção
depois de `a9fbe283` recusa papel que escapa do RLS) ⇐ `P-SAN3-05-ATO2-CINCO-TAREFAS` (`pendencias.md:10263`). Nada
disso bloqueia o plano (porteiro do #405). Que o dev também não dependa do Ato 2 era leitura do orquestrador (errata
A-1, `decisoes.md:3085-3091`); a v2 a apoia numa medição: o demo do B-TRC-01 roda em `NODE_ENV=production` com o papel
`erp_runtime` do `docker-compose.prod.yml`, a mesma montagem que o job `docker` da CI sobe pelo
`smoke-compose-persistence.mjs` (`ci.yml:394,473`) — verde em `a2937bad`, depois do #405 (§11 M-36).

## 6. Ambientes

### 6.1 Dev local (fecha a parte de rede do B-01)

**Base:** `docker-compose.prod.yml` (validação local-prod que já existe: Postgres com o papel `erp_runtime` criado no
`initdb`, `migrate` como `postgres`, `api` como `erp_runtime` com `NODE_ENV=production`, sem porta de banco publicada,
`docker-compose.prod.yml:1-115`) **+ overlay** `docker-compose.traccar.yml`. O demo roda sob o projeto fixo
`erp-trc01-demo` e nunca colide com o stack do dono (`erp-postgres`, `erp-redis`, 3000, 5173, 5050).

| Serviço / rede | Configuração do overlay |
|---|---|
| rede `traccar_private` | `internal: true`, sub-rede `${TRC_PRIVATE_SUBNET:-172.31.250.0/24}` (o demo confere colisão antes de subir) |
| rede `traccar_devices` | `internal: true`; só Traccar e simulador |
| `api` | redes `default` + `traccar_private` com `ipv4_address: ${TRC_API_PRIVATE_IP:-172.31.250.10}`; `TRACCAR_INGEST_ENABLED=true`, `TRACCAR_INGEST_HOST` = esse IP, `TRACCAR_INGEST_PORT=3200`, `TRACCAR_INSTANCE_KEY=erp-dev`, `TRACCAR_FORWARD_SECRET_CURRENT=${TRC_FORWARD_SECRET:?}`; `ports: !override ["127.0.0.1:${TRC_API_PORT:-3102}:3000"]` — a 3200 **nunca** em `ports` |
| `traccar` | `traccar/traccar:6.16.0@sha256:03ebb7ed…` (digest completo em §8.4); redes `traccar_private` + `traccar_devices`; **sem `ports`**; `CONFIG_USE_ENVIRONMENT_VARIABLES=true`, `FORWARD_URL=${TRC_FORWARD_URL:-http://api:3200/ingest/traccar/v1/positions}`, `FORWARD_HEADER=${TRC_FORWARD_HEADER:?}`; `infra/traccar/dev/traccar.xml` montado somente leitura no caminho de config da imagem (confirmado por `docker image inspect` no passo 3 de §8.5); H2 dentro do contêiner, que morre no `down -v` |
| `traccar-sim` | `node:20-bookworm-slim@sha256:2cf067cf…`; só `traccar_devices`; `profiles: ["tools"]`; um `fetch` OsmAnd a `http://traccar:5055/` com `id`, `lat`, `lon`, `timestamp`, `speed` (parâmetros oficiais, T-4) |
| `traccar-capture` | mesma imagem node; só `traccar_private`; `profiles: ["capture"]`; recebe na 3200 e imprime o corpo e só os **nomes** dos headers |
| `web` | só com `--with-web`: `ports: !override ["127.0.0.1:${TRC_WEB_PORT:-18080}:8080"]` |

Medido nesta máquina (Compose v5.2.0, `docker compose config` sem subir nada, §11 M-23): `ports: !override` substitui a
porta da base e `host_ip` sai `127.0.0.1`; rede `internal: true` com `ipv4_address` fixo é aceita. O Traccar fala
com a ingestão por `http://api:3200` dentro da `traccar_private`, e a API escuta a 3200 só no IP dessa rede. Da rede
`default` (Postgres, Redis, web) ela não é alcançável. **Do host, é** (A2-01, corrigido): a rede `internal` tem
gateway do lado do host (`172.31.x.1`), e a r2 conectou ao IP privado a partir de um contêiner `--network host`, isto
é, do namespace da VM do Docker Desktop (E-01c). No Docker nativo do Linux (CI, dev Linux), esse namespace é o próprio
host. Do Windows, deu `TIMEOUT`. Nesse caminho a barreira é o segredo, sorteado a cada rodada do demo. O teste de
topologia prova "3200 não publicada", que é outra propriedade, e o plano não a apresenta como inalcançabilidade. O simulador só alcança o Traccar. A interface e a REST
do Traccar ficam presas ao `127.0.0.1` do próprio contêiner no B-TRC-01 (`web.address`).

### 6.2 Staging e produção AWS

Topologia alvo: Traccar em ECS/Fargate em subnet privada, banco do Traccar em RDS PostgreSQL dedicado, Secrets Manager
para forward, REST e banco, logs sem payload, egress do Traccar fechado ao ERP e ao RDS. O backend de ingestão expõe a
**porta de contêiner própria** (3200) com Security Group de entrada só a partir do SG do Traccar e **nenhum target
group público** nela; o target group público, se houver, é só da 3000. Traccar sem IP público, sem ALB/NLB público,
sem domínio público. Navegador e Flutter nunca atravessam essa fronteira.

Conflito não consolidado, mantido da v1: `docs/deployment.md:11-63,296-297` ainda descreve Fly.io como provedor
principal (M-14), e `D-TRACCAR-HTTP-PRIVADO-AWS` é a decisão posterior e específica do dono (M-2). O dono escolhe entre
(1) **recomendado:** backend de ingestão e Traccar na mesma VPC AWS; ou (2) ERP no Fly com ponte privada autenticada
Fly↔AWS, que muda threat model, custo e operação e exige nova junta antes de qualquer porta. **Quando (A2-14):** o
registro pede a escolha "por escrito, antes do Dia 1 do Traccar" (`decisoes.md:2306`); a v2 a tinha levado para antes
do B-TRC-06 sem registrar. Agora é a decisão 2 do dono: a escolha ou o aceite expresso do adiamento, antes do B-TRC-01.

O listener dos rastreadores reais é decisão separada: APN/VPN privada é preferível; NLB público por protocolo só nasce
depois de modelo do dispositivo, portas, rate/DDoS, TLS quando houver, threat model próprio e junta unânime. Este
plano autoriza só OsmAnd na rede privada de dev. Servidores públicos de demonstração são proibidos em todo ambiente.

## 7. Blocos da trilha

### 7.1 Visão de ordem e quórum (fecha A-07)

| Etapa | Entrega visível | Tam. | Depende de | Quórum |
|---|---|---:|---|---|
| G-TRC-PD | PD do Traccar registrada em `docs/omega-pd.md`: versão 6.16.0 por tag e digest, semântica de forward medida no código-fonte (§2.2, P-01 a P-05), uso da imagem em dev | P | crítica r2 sem `bloqueia` | **crítica 5/5** (`decisoes.md:2283-2285`: "a PD e a decisão de implantação vão a junta unânime de 5"). Gate documental, sem código |
| B-TRC-01 | Posição OsmAnd simulada aparece no mapa em dev | G | G-TRC-PD e §8.0 (inclui as decisões 1 a 3 do dono) | segurança 3/3 |
| B-TRC-02 | Ignição, odômetro, evento e estado do dispositivo persistidos | G | 01 e escolha do dono em §7.2 | segurança 3/3 |
| B-TRC-03 | Vínculo de rastreador no cadastro da viatura + sincronização e reconciliação REST | G | 01–02; credencial dev/staging | segurança 3/3 |
| B-TRC-04 | Rastreamento, km e Dispositivos sem placeholder nem dado fabricado | G | 02–03 | segurança 3/3 (reclassificável para revisor + CI só antes de começar, com diff medido) |
| B-TRC-05 | Alarmes aprovados viram notificações; quarentena operável | M | 02–03; catálogo de alarmes | segurança 3/3 |
| B-TRC-06 | Staging AWS privado, observável, testado em carga e falha | G | 01–05; atos AWS/staging | **crítica 5/5, sem condição** (provisiona serviço pago) |
| B-TRC-07 | Go-live controlado, reconciliação e rollback ensaiado | M | 06 + gates produtivos | **crítica 5/5** |

Por `D-GOV-PROPORCIONAL` (5), nenhuma etapa toca `Kpis/*` enquanto o congelamento valer. Cada bloco tem ramo e PR
próprios; o seguinte começa depois do porteiro do anterior (regra (3): porteiro depois de merge de produto). O
G-TRC-PD não é bloco de código: é a junta que a decisão do dono exige sobre a PD antes da primeira linha de
integração — e por isso não entra na contagem de blocos discutida em §7.2.

### 7.2 Conflito registrado, não consolidado: quatro dias × sete blocos (fecha B-07)

**O que as fontes dizem (medido em `a2937bad`):**

- `decisoes.md:2218-2221` (`D-TRACCAR-HTTP-PRIVADO-AWS`, 2026-09-11): *"só então a integração com o Traccar, em 4 dias"*.
- `decisoes.md:2275-2279`: *"### Plano de 4 dias (depois do gate) — Dia 1 — contrato e infraestrutura (PD, versão, rede
  privada, segredo, threat model, junta); Dia 2 — ingestão e reconciliação (adaptador, idempotência, quarentena,
  semântica 2xx/4xx/5xx); Dia 3 — alimentação dos módulos existentes; Dia 4 — endurecimento e demonstração. Cada dia é
  bloco com junta, CI, KPI e porteiro."*
- `docs/revisoes/SAN3/PLANO_SAN3.md:533-537` (§11): não fala em número de blocos; diz só *"Nenhuma linha de integração
  nasce antes do gate."* Essa regra foi revogada por nome pela `D-GOV-PROPORCIONAL` (`decisoes.md:2956`).
- Decisões posteriores que tocam a forma: `D-GOV-PROPORCIONAL` congela o KPI — o "KPI" de "cada dia é bloco com junta,
  CI, KPI e porteiro" está suspenso — e limita o porteiro a merge de produto; em 2026-10-08 o dono fixou o alvo como
  *"o traccar integrado e rodando, telas sem place holde, funcional"* (`decisoes.md:2999-3000`), o que põe as telas
  (B-TRC-04) dentro da entrega esperada.

**A divergência, sem esconder:** a v1 trocou quatro dias/quatro blocos por sete blocos e 25–45 dias úteis sem
registrar o conflito. A v2 registra e **não escolhe pelo dono**.

**Como os quatro dias cabem nos blocos:** Dia 1 → G-TRC-PD + a parte de topologia, segredo e threat model do B-TRC-01
(a rede privada AWS é do B-TRC-06); Dia 2 → B-TRC-01 (adaptador, idempotência, quarentena, 2xx/4xx/5xx) + reconciliação
do B-TRC-03; Dia 3 → B-TRC-01 (mapa), B-TRC-02 (telemetria), B-TRC-05 (notificações), B-TRC-04 (telas); Dia 4 →
B-TRC-06 e B-TRC-07.

**Por que o planejador propõe sete (evidência, não preferência):**

1. ritmo medido: o #405 levou quatro ciclos de junta em cerca de seis dias e o #400 dois ciclos
   (`agent-orchestration/docs/status-geral.md`, §11 M-17) — "um dia por bloco com junta 3/3" não se sustenta;
2. a P4 do protocolo limita cada cadeira a três itens; bloco maior exige mais cadeiras ou mandatos mais longos, e o
   custo de queda cresce com a exposição;
3. produção é decisão crítica 5/5 (§C7.1; `decisoes.md:2283-2285`) e staging provisiona serviço pago (5/5): juntar
   código 3/3 com esses atos num bloco só leva o 5/5 ao código inteiro;
4. a decisão de quatro dias nasceu quando o Traccar só começaria depois do gate da versão vendável; hoje ele corre em
   paralelo aos bloqueantes do gate (`D-GOV-PROPORCIONAL` (4)).

**As três formas para o dono (decisão 1; corrigido pela r2, A2-09):**

- **A — a forma literal dele**, por assunto: o Dia 1 é contrato e infraestrutura, **sem ingestão**.
- **B — quatro blocos do planejador:** Q1 = B-TRC-01 inteiro; Q2 = B-TRC-02 + B-TRC-03; Q3 = B-TRC-04 + B-TRC-05;
  Q4 = B-TRC-06 + B-TRC-07, inteiro sob 5/5.
- **C — sete blocos** (proposta).

A v2 oferecia só B e C como se fossem as duas formas. A B **não é** a do dono: o próprio mapeamento acima põe o B-TRC-01
nos Dias 1, 2 e 3 dele. Custo da B: blocos maiores, mais cadeiras por junta, 5/5 sobre o código de staging.
**Prazo:** em nenhuma das formas o plano promete quatro dias; a estimativa honesta está em §10.2.

**O que fica parado.** O B-TRC-01 só é o mesmo nas formas B e C; na forma A ele seria cortado em três. Por isso o
B-TRC-01 só começa depois de duas coisas, que viram a linha 7 do gate de §8.0:

- o registro em `controle/`, que a §A2 pede antes de consolidar;
- a resposta do dono à decisão 1.

A `D-ORDEM-NOITE-2026-10-10` (`decisoes.md:3080-3084`) autoriza "os blocos de ingestão com junta completa de
segurança" sem fixar número: atenua, mas não escolhe a forma.

O texto de `P-TRC-FORMA-QUATRO-OU-SETE`, agora com as três formas, está em "Para o registro".

### B-TRC-01 — posição segura no mapa, ponta a ponta

Plano executável inteiro em §8: gate de início, contrato, arquivos, preparação, ordem, testes, baseline, bateria,
mutações e quórum.

### B-TRC-02 — eventos e telemetria veicular

**Objetivo.** Receber `event.forward.*` e os atributos allowlisted de posição para conservar
ignição, odômetro, alarmes técnicos e online/offline sem misturar com telemetria do app.

**Permitido:** `prisma/schema.prisma`, uma migration
`*_vehicle_telemetry_events`; `src/integrations/traccar/**`;
`src/modules/telemetry/**`; `src/modules/vehicles/**` apenas para porta de leitura do veículo;
`src/config/env.ts`, `.env.example` (o forward de evento entra no app de ingestão, nunca em `src/app.ts`, que segue
proibido); `tests/traccar-event-*.test.ts`,
`tests/telemetry.test.ts`; contratos/docs/orquestração. **Proibido:** frontend/mobile,
notifications, infra cloud, RBAC, lockfiles, KPI, porta pública, WebSocket e escrita automática em
`WorkOrder.mileage_*`.

**Migração:** aditiva, com `agente-dba-guardiao`: `VehicleTelemetryEvent` tenant-first, FK composta
para veículo, tipo/tempo/dados normalizados, idempotência e índices temporais; nenhum raw payload.
Rollback SQL manual remove só a tabela/índices novos, apenas antes de dado real. **Testes:** fixtures reais de evento/posição 6.16.0;
dedupe; ordem atrasada; unidades; tipos desconhecidos; cross-tenant; RLS; ausência de retry de
evento compensada por reconciliação fake; mutation de tenant e de idempotência.

**Quórum:** segurança 3/3. **Tamanho:** G. **Dependências:** B-TRC-01, versão Traccar congelada e a escolha do dono entre
quatro e sete blocos (§7.2). **Chave de evento:** a fixture de evento decide; P-01 mostra que a posição sai sem `id` no
forward, e o mesmo pode valer para evento — se valer, chave determinística no padrão de §4.4.

### B-TRC-03 — cadastro, sincronização e reconciliação

**Objetivo.** Um `tenant_admin`/gestor autorizado vincula dispositivo a viatura; um worker
server-to-server sincroniza devices e reconcilia lacunas/quarentena por REST do Traccar, sem
expor credencial ou DTO externo.

**Contrato ERP:** `GET/POST /api/v1/vehicles/:vehicleId/tracking-bindings` e
`DELETE /api/v1/vehicles/:vehicleId/tracking-bindings/:id`, usando `vehicles:read/update` já
canônicos (RBAC medido em M-15); cross-tenant/not-found sempre `404`, conflito ativo `409`, input
inválido `422`. Rota de reconciliação manual, se necessária, é ação administrativa do ERP e retorna
somente contagem/status.

**Permitido:** `src/modules/vehicles/**`, `src/integrations/traccar/**`,
`src/infra/jobs/**` e registro de job existente; `src/config/env.ts`, `.env.example` (as rotas de vínculo entram no router
de veículos, já montado; `src/app.ts` não muda);
frontend de veículos estritamente para o vínculo (`frontend/src/modules/vehicles/**`); `infra/traccar/dev/**` e o overlay
só para abrir a REST do Traccar no IP da rede privada (`web.address`), alcançável apenas pelo worker do ERP;
`tests/vehicles*.test.ts`, `tests/traccar-rest-*.test.ts`, testes frontend correspondentes;
contratos/docs/orquestração. **Proibido:** novo papel/permissão sem decisão, WebSocket, REST
Traccar no browser, polling abaixo de 5 min, raw payload, acesso a servidor demo, infra/prod, KPI e
lockfiles.

**Migração:** nenhuma prevista. Se fixture real provar coluna adicional indispensável, parar,
replanejar e convocar `agente-dba-guardiao`; não ampliar B-TRC-03 silenciosamente. **Testes:**
409 neutro quando o índice global recusa o vínculo (23505 → `409`, sem dizer em que organização); dois tenants
tentam o mesmo dispositivo ao mesmo tempo — um ganha, o outro `409`; `valid_from` é o relógio do servidor (sem vínculo
retroativo; condição 2 acima); create/rotate/deactivate temporal do binding; quarentena resolvida com backfill pela janela
`first_fix_at … last_fix_at`; 404 cross-tenant; timeout/401/429/5xx Traccar; cursor e backoff; reconciliação não
duplica; nenhuma credencial/tenant externo em log/DTO.

**Condições de início (v2.1, viram linha do gate deste bloco):**

1. **A2-05, posse:** a decisão 5 do dono, respondida e registrada; a rota de vínculo segue a resposta (só a
   plataforma, ou a organização sobre a lista de rastreadores liberados pela plataforma).
2. **A2-04, um dono no instante do fix, por construção:** o banco recusa dois vínculos de organizações diferentes
   cobrindo o mesmo instante — restrição `EXCLUDE` sobre `(instance_key, external_device_key)` e a faixa
   `[valid_from, valid_to)`, que pede a extensão `btree_gist` (a decidir no G-TRC-PD ou pelo DBA). Se a extensão for
   recusada: `valid_from` = relógio do servidor por gatilho, sem valor do cliente, e `valid_to` imutável depois de
   gravado. A tolerância de "agora − 5 min" da v2 sai. Teste: vínculo de B não pode cobrir fix anterior à desativação
   de A (o caso E-02c da r2).
3. **A2-08, `Ω6R-SEC-002`:** o bloco abre rota sob `/vehicles` com permissões existentes. Se a resposta à decisão 5
   exigir permissão nova, o bloco amplia RBAC e cai na trava (`pendencias.md:3118`) até o `Ω6R-SEC-002` fechar; a
   junta confere isso antes de votar.

**Quórum:** segurança 3/3 (permissão, tenant, segredo REST). **Tamanho:** G. **Dependências:** 01–02,
credencial do Traccar do ambiente e escolha de quem é source of truth para cadastro (recomendado:
ERP cria/vincula; Traccar devolve ID técnico).

### B-TRC-04 — telas de telemetria com dados reais

**Objetivo.** Fazer Rastreamento, Quilometragem e Dispositivos exibirem fonte app e/ou veículo,
com rótulo claro, estados loading/empty/error/forbidden/stale e sem dados fabricados. O mapa
operacional continua único.

**Permitido:** queries/DTOs em `src/modules/telemetry/**`; somente leitura em
`src/modules/vehicles/**` e `src/integrations/traccar/**`; `frontend/src/modules/telemetry/**`;
testes `tests/telemetry.test.ts`, `tests/traccar-telemetry-query.test.ts`,
`frontend/tests/telemetry*.test.ts`; `API_CONTRACTS.md`, docs/orquestração. **Proibido:** migration,
ingestão, segredo, chamada direta Traccar, mapa novo, mudança de design system, mobile, infra,
lockfiles e KPI.

**Migração:** nenhuma. **Testes:** seleção app/viatura; trilha ordenada; km sem dupla contagem;
odômetro regressivo sinalizado; stale; 403/404; isolamento entre tenants; paginação/limite;
acessibilidade e nenhum placeholder/mock. **Quórum:** segurança 3/3 porque queries carregam
localização tenant-scoped; se o diff final for comprovadamente só apresentação sobre DTO já
aprovado, a junta pode reclassificar para revisor independente + CI antes de começar, nunca depois.
**Tamanho:** G. **Dependências:** 02–03, decisões 3 e 4 do dono (convivência e viatura sem técnico) e o plano
comercial. **`Ω6R-SEC-002` (A2-08):** lê quilometragem de OS e não abre rota nem permissão de OS; leitura fora da trava,
conferida pela junta.

### B-TRC-05 — alarmes, notificações e operação da quarentena

**Objetivo.** Converter uma allowlist de alarmes relevantes em notificações já existentes e dar ao
administrador visão/ação segura sobre quarentenas, sem expor coordenada desconhecida.

**Permitido:** `src/integrations/traccar/**`, `src/modules/telemetry/**`,
`src/modules/notifications/**`; UI administrativa no módulo já dono de veículos/telemetria;
testes de integração/notificação/UI; contratos/docs/orquestração. **Proibido:** migration salvo
replanejamento, push/SMS/e-mail novo, dependência nova, regra baseada em atributo arbitrário,
coordenada/payload de quarentena, infra, KPI e lockfiles.

**Migração:** nenhuma prevista. **Testes:** alarme allowlisted cria uma notificação idempotente;
desconhecido não cria; tenant/permission; ack/resolução; quarantine→vínculo→backfill; conteúdo
sanitizado; rate storm não inunda. **Quórum:** segurança 3/3. **Tamanho:** M. **Dependências:**
02–03 e catálogo de alarmes aprovado pelo dono. **`Ω6R-SEC-002` (A2-08):** notificações não são superfície de OS nem
de aprovação; fora da trava, conferida pela junta.

### B-TRC-06 — staging AWS privado e prova operacional

**Objetivo.** Materializar a topologia privada escolhida, executar contract/load/failure tests e
produzir runbook de segredo, backup, reconciliação e atualização do Traccar.

**Permitido:** `infra/**` no subdiretório Traccar/AWS aprovado, configuração de staging,
`docs/deployment.md`, `docs/revisoes/TRACCAR/**`, scripts finitos de smoke/carga, env examples e
workflows de staging apenas após fechar `P-SAN3-05-STAGING-CD-AMARRACAO`; ajustes de métricas/health
em `src/integrations/traccar/**`; testes/orquestração. **Proibido:** apply em produção, IP/porta
pública, demo server, segredo no repo/CLI output, mudança Fly↔AWS implícita, migração destrutiva,
polling agressivo, KPI e `latest` image.

**Migração:** nenhuma prevista; se ajuste de índice nascer da carga, novo plano +
`agente-dba-guardiao`. **Testes:** IaC validate/plan; SG negativo; secret rotation; p95 e throughput
contratados; retry storm; queda ERP/Traccar/DB; restore do banco Traccar; reconciliação; imagem por
digest; runtime-role guard e inventários de table rules/`SECURITY DEFINER`; smoke no SHA.

Também: Security Group de entrada da porta de ingestão só a partir do SG do Traccar, e teste negativo dela a partir da
rede pública e da subnet da API pública; resolução medida com o número real de organizações ativas e o teto de
§4.3 ajustado; SSE com várias réplicas (o broker é em memória do processo, §4.1) — decidir broker compartilhado, sem
dependência nova sem junta.

**Quórum:** decisão crítica, **unanimidade 5/5, sem condição** — o bloco provisiona serviço externo pago (ECS/Fargate,
RDS, Secrets Manager) e configura staging (§C7.1; `decisoes.md:2283-2285`); mais o inspetor de terreno e o ato do
dono. **Tamanho:** G. **Dependências:** 01–05, decisão AWS×Fly/forma da ponte, conta/rede/secrets, amarração de
staging.

### B-TRC-07 — habilitação de produção

**Objetivo.** Promover exatamente a imagem aprovada, ligar forward de modo gradual, observar,
reconciliar e provar rollback sem perda/contaminação entre tenants.

**Permitido:** manifests/config de produção já aprovados, runbooks/smokes/atestados, parâmetros e
secrets pelo gerenciador (nunca conteúdo), registro de decisão/junta. **Proibido:** mudança de
código funcional/schema, porta pública não aprovada, imagem diferente do SHA de staging,
credencial em arquivo/log, seed, demo server e qualquer bypass de gate.

**Migração:** nenhuma; migration necessária devolve ao bloco de código e ao
`agente-dba-guardiao`. **Testes/gates:** staging verde no mesmo SHA; Ato 2 das cinco tarefas sob
`erp_runtime` (`D-ATO2-OPCAO-B`; `P-SAN3-05-ATO2-CINCO-TAREFAS`, `pendencias.md:10263` — o boot de produção depois de
`a9fbe283` recusa papel que escapa do RLS, então sem o Ato 2 não há deploy de produção, e sem deploy não há ingestão);
os P0 de J-6R ainda não fechados em `docs/revisoes/O6R/achados.jsonl` — em `a2937bad`, `Ω6R-DIN-009`, `Ω6R-DAT-002`,
`Ω6R-DAT-003` (ativos) e `Ω6R-SEC-002` (parcialmente superado) — fechados, ou nova decisão expressa do dono sobre o
veredito da J-6R (comando em §11 M-28 devolve zero linhas); `P-SAN3-05-STAGING-CD-AMARRACAO`,
`P-SAN3-05-REGRA-EM-TABELA` e `P-SAN3-05-SECURITY-DEFINER-INVENTARIO` fechados; backup/restore;
rotação; canário de um dispositivo/tenant; isolamento; métricas; rollback; reconciliação pós-volta.

**Quórum:** decisão crítica, unanimidade 5/5 (produção + serviço externo/pago), além do inspetor de
terreno. **Tamanho:** M de engenharia, prazo externo indeterminado. **Dependências:** todas as
anteriores e todos os atos do dono da §9.

## 8. Plano detalhado do B-TRC-01

### 8.0 Gate de início do código (fecha B-06)

O dev só abre o ramo do B-TRC-01 com as sete condições abaixo verdadeiras, cada uma conferida pelo comando ao lado
(Git Bash, a partir de qualquer worktree do repo):

| # | Condição | Comando | Estado medido em 2026-10-10 |
|---|---|---|---|
| 1 | Parecer do porteiro do #405 na `main` | `timeout 60 git fetch origin --prune && git cat-file -e origin/main:agent-orchestration/omega/juntas/votos/B-SAN3-05/PORTEIRO-405.md && echo OK` | falhava em `a2937bad`; **passa em `c1cfdabe`** (#413 mergeado). Veredito (linha 164): "LIBERADO COM RESSALVA: plano da trilha do Traccar (sem código de ingestão em produção)" |
| 2 | Ressalvas do porteiro cumpridas no plano | leitura de §5 (resíduos de RLS e cadeia de produção), §7 B-TRC-07 (Ato 2) e §8.4 passo 1 (`DEEP_CLEAN`) | cumpridas nesta v2 |
| 3 | Plano aprovado | `docs/revisoes/TRACCAR/CRITICA-r2.md` sem achado `bloqueia`, e os 14 `ajuste` como requisitos (seção "Resposta à crítica r2") | r2 = PRONTO COM AJUSTES, 0 `bloqueia`; requisitos nesta v2.1 |
| 4 | G-TRC-PD aprovado 5/5 (§7.1) | ata `agent-orchestration/omega/juntas/J-TRC-PD.md` na `main`, com cinco votos `APROVO` | pendente |
| 5 | Código-base igual ao medido | `git diff --name-only c1cfdabe origin/main -- src prisma docs/deployment.md` vazio; se não, o dev re-mede os arquivos de §8.3 antes do passo 1 de §8.5 e registra o que mudou | vazio em `c1cfdabe` |
| 6 | Porteiro do **último merge de produto** e a trava `Ω6R-SEC-002` (A2-08) | `git show origin/main:agent-orchestration/omega/juntas/votos/B-SAN3-06b/PORTEIRO-411.md \| sed -n '101p;107p'`; `git show origin/main:agent-orchestration/controle/pendencias.md \| sed -n '3104,3123p'` | PORTEIRO-411, l.107: "LIBERADO COM RESSALVA … e o Traccar não amplia OS/aprovação enquanto o Ω6R-SEC-002 residual estiver aberto"; trava: "feature nova em ordens de serviço, aprovações e RBAC". **Leitura do B-TRC-01:** lê `work_orders.vehicle_id` e `field_dispatches`, não abre rota, não cria permissão, não escreve em OS nem em aprovação; a coluna com gatilho em `field_dispatches` registra a troca de operador, não muda fluxo de despacho. Fora da trava; a cadeira (c) da junta confere (§8.10) |
| 7 | Decisões 1, 2 e 3 do dono respondidas (ou com aceite escrito do adiamento ou do modo provisório) e as seis registradas em `controle/` (A2-09, A2-13, A2-14) | `git show origin/main:agent-orchestration/controle/pendencias.md \| grep -n -E 'P-TRC-(FORMA-QUATRO-OU-SETE\|AWS-FLY-PRAZO\|CONVIVENCIA-APP\|ATRIBUICAO-PRODUTO\|VINCULO-POSSE\|LGPD)'` devolve as seis, e `decisoes.md` traz a resposta às três primeiras | pendente: o texto pronto está em "Para o registro" |

A v2 dizia que o conflito de forma não impedia o B-TRC-01. A r2 mostrou que isso só valia entre as duas formas do
planejador (A2-09). Na forma literal do dono, o Dia 1 não tem ingestão; por isso a linha 7 existe.

### 8.1 Objetivo, ator, fluxo e critérios observáveis

**Objetivo e ator.** O operador da central (papel `field_dispatcher`, "Operação de Campo") vê no mapa operacional que já
existe a posição da viatura rastreada, atribuída ao técnico que a dirigia no instante do fix; o dispositivo é simulado
no B-TRC-01. **Fluxo:** simulador → Traccar → forward privado → listener de ingestão → descoberta e confirmação sob RLS →
recibo + `FieldOperatorLocation` → evento → SSE → mapa (§4.2). **Contrato:** §8.2. **Modelagem:** §3.1 (aditiva,
`timestamptz`, delete lógico por `valid_to`, rollback comentado). **Riscos e rollback:** §10.

Ao terminar, `node scripts/traccar-dev-demo.mjs` — um comando finito — faz, nesta ordem, e sai com 0:

1. confere o terreno: Docker responde; a sub-rede `TRC_PRIVATE_SUBNET` (default `172.31.250.0/24`) não colide com rede
   Docker existente; há pelo menos 10 GB livres (senão aborta pedindo `DEEP_CLEAN`);
2. gera o segredo de forward da rodada (`randomBytes(32)`), que só vive no ambiente do processo filho do `docker
   compose` e nunca é impresso;
3. sobe, sob o projeto fixo `erp-trc01-demo`, `docker-compose.prod.yml` + `docker-compose.traccar.yml`, só os serviços
   `postgres redis migrate api traccar`, com `--build --wait`;
4. semeia uma organização com o módulo `field_operations`, um técnico, um operador de despacho, uma viatura, uma OS
   com essa viatura, um despacho aceito pelo técnico e o vínculo `trcdemo01 → viatura` na instância `erp-dev`
   (usuários pelo agregado core-saas dentro do contêiner `api`, como o passo 4 de
   `scripts/smoke-compose-persistence.mjs`; viatura, OS, despacho e vínculo por SQL como `postgres` no contêiner
   `postgres`). O despacho é inserido numa transação e **aceito noutra** (`UPDATE … status='accepted', accepted_at =
   now()`), para valer `operator_assigned_at ≤ accepted_at` (§4.2); a posição do passo 6 sai depois do aceite;
5. abre o SSE `/api/v1/operations/field-events/stream` com token `field_dispatcher` assinado como o smoke assina;
6. manda uma posição OsmAnd pelo serviço descartável `traccar-sim` à porta 5055 do Traccar (retenta só erro de
   conexão, nunca depois de resposta HTTP);
7. espera, até 60 s, `/api/v1/field-locations/latest` devolver o técnico na coordenada enviada (tolerância 1e-6) com
   `source: "traccar"`;
8. confere que o SSE recebeu `field_location.updated` sem nenhuma chave de coordenada;
9. confere por SQL: 1 recibo, 1 localização `traccar`, 0 quarentena;
10. reenvia o mesmo ponto (mesmo `timestamp`, mesma coordenada), espera 10 s e confere: ainda 1 recibo e 1
    localização;
11. derruba tudo com `down -v --remove-orphans` (sempre, inclusive em falha), salvo `--keep`;
12. imprime só nomes de passo e estado — nunca segredo, token, id de organização ou coordenada.

O id `trcdemo01` respeita `database.registerUnknown.regex` (`\w{3,15}`, `Keys.java:647-650`); o `sim-traccar-01` da
v1 não seria registrado. Opcional — a prova do bloco são os passos 7 a 10: com `--keep --with-web`, o `web` sobe em `127.0.0.1:18080` e o dono abre o mapa operacional
já existente e vê o pin (login com a senha que ele mesmo passa em `TRC_DEMO_PASSWORD`, nunca impressa). Nenhuma tela
do Traccar, nenhuma porta 3200, 5055 ou 8082 aparece no host.

### 8.2 Contrato

**Rota de serviço, só no listener de ingestão (§4.1):** `POST /ingest/traccar/v1/positions`.

**Headers:** `Content-Type: application/json`; `X-Traccar-Forward-Token: <segredo>`. Segredo em `Authorization`,
query ou corpo não é aceito.

**Corpo (fato do código-fonte 6.16.0, a confirmar pela fixture):** `{"position": {…}, "device": {…}}`
(`PositionData.java:23-35`, `@JsonInclude(NON_NULL)`). A allowlist lê somente:

- `position`: `id` (aceito ausente, 0 ou maior que 0 e **ignorado**: a primeira entrega sai sem `id` e o retry sai com
  o `id` do banco, A2-10, §4.4), `deviceId`, `protocol`, `fixTime`, `deviceTime`, `serverTime` (só para métrica de atraso), `valid`, `latitude`,
  `longitude`, `speed` (nós, `Position.java:267`), `course`, `accuracy`;
- `device`: `id` e `uniqueId`.

Todo o resto — `device.name`, `phone`, `contact`, `model`, `position.attributes`, `network`, `address`,
`geofenceIds` — é ignorado e **nunca** lido para o domínio nem gravado. A presença de `tenantId`, `tenant_id`, `token`,
`secret`, `authorization`, `path`, `bucket` ou `storageKey` como chave do envelope, de `position` ou de `device` dá
`422` (dentro de `attributes` não se procura: o objeto é ignorado por inteiro no B-TRC-01). `uniqueId` precisa casar
`^[A-Za-z0-9_.:-]{1,64}$`; latitude em [-90, 90], longitude em [-180, 180], datas ISO 8601 com fuso; fora disso,
`422`. Velocidade: `speedMetersPerSecond = speed × 1852 / 3600`.

**Comando interno canônico** (não é DTO público):

```ts
type TraccarPositionCommand = {
  instanceKey: string;          // TRACCAR_INSTANCE_KEY, nunca do corpo
  externalDeviceKey: string;    // device.uniqueId normalizado
  traccarDeviceId: string;      // position.deviceId / device.id, só para reconciliação
  externalEventKey: string;     // §4.4
  payloadDigest: string;        // §4.4
  fixedAt: Date;
  deviceAt?: Date;
  receivedAt: Date;             // relógio do ERP
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  headingDegrees?: number;
  speedMetersPerSecond?: number;
  valid: boolean;
};
```

**Códigos:** tabela de §4.6. A ingestão duplicada idêntica é sucesso (`204`), não conflito; `409` é só divergência de
conteúdo sob a mesma chave ou chave de outra organização. As rotas públicas existentes continuam com `404`
cross-tenant.

### 8.3 Arquivos: permitido, proibido e o trabalho de cada um

**Permitido** (caminhos exatos; espelho entre parênteses):

| Arquivo | Trabalho |
|---|---|
| `prisma/schema.prisma` | Três modelos da §3.1 e relações; em `FieldDispatch`, só o campo `operator_assigned_at DateTime? @db.Timestamptz(6)`; nada mais existente muda. |
| `prisma/migrations/<timestamp>_traccar_ingestion_foundation/migration.sql` | Tabelas, FKs compostas, CHECKs, índices parciais (inclusive os dois **globais**), `ENABLE`/`FORCE` RLS e políticas nas duas tenant-scoped; DROP + `ADD … NOT VALID` do CHECK de `source`; coluna `field_dispatches.operator_assigned_at` com função e gatilho (§3.1 item 5); rollback comentado no topo (espelho `20260811000000_add_invoicing`, `20260858000000_extend_field_dispatch_event_type_check`). |
| `prisma/migrations/<timestamp+1>_validate_location_source_check/migration.sql` | Só `VALIDATE CONSTRAINT` do CHECK de `source`, em migração (logo, transação) separada (N2-06). |
| `src/integrations/traccar/traccar-ingest.app.ts` | App Express da ingestão, uma rota, ordem fixa de middlewares (§4.1) (espelho `src/portal-app.ts`). |
| `src/integrations/traccar/traccar-ingest.bootstrap.ts` | `startTraccarIngestListenerIfEnabled` (espelho `src/infra/jobs/job-worker.bootstrap.ts:87`). |
| `src/integrations/traccar/traccar-ingest.logger.ts` | `pinoHttp` com serializadores de allowlist (§4.7). |
| `src/integrations/traccar/traccar-forward-auth.ts` | Header único, SHA-256 + `timingSafeEqual`, current/previous com prazo, relógio injetável. |
| `src/integrations/traccar/traccar-rate-limit.ts` | Token bucket e limite de concorrência por processo, relógio injetável, sem dependência nova. |
| `src/integrations/traccar/traccar-position.schema.ts` | Parser estrito do envelope `{position, device}`, chaves reservadas, limites físicos. |
| `src/integrations/traccar/traccar-position.adapter.ts` | Envelope → `TraccarPositionCommand`; chave e digest (§4.4); nó → m/s. Sem banco. |
| `src/integrations/traccar/traccar-resolution.ts` | Fase 1: dica, cache negativo, orçamento, varredura com parada no primeiro achado (§4.3); portas injetáveis para contar sondagens. |
| `src/integrations/traccar/traccar-ingestion.repository.ts` | Fase 2 em SQL parametrizado (`$queryRaw` com template): `FOR SHARE`, recibo `ON CONFLICT`, comparação de digest, quarentena `ON CONFLICT … DO UPDATE`. |
| `src/integrations/traccar/traccar-ingestion.service.ts` | Orquestra fases, códigos de resposta, publicação pós-commit, orçamento de tempo. |
| `src/integrations/traccar/index.ts` | Exporta só fábricas e tipos necessários. |
| `src/server.ts` | Uma chamada ao bootstrap, depois do `portalApp.listen` (`src/server.ts:38-44`). |
| `src/database/rls.ts` | Acrescenta `findFirstTenantRls` (somente leitura, canário, parada no primeiro achado, `{ maxWait, timeout }`) e `withTenantRlsBudget(client, tenantId, { maxWait, timeout }, work)` (A2-03); `withTenantRls` e `forEachTenantRls` intactos. |
| `src/integrations/traccar/traccar-db.ts` | `PrismaClient` só da ingestão, `new PrismaPg({ connectionString, max: TRACCAR_DB_POOL_MAX })`, com `application_name=erp-traccar-ingest` acrescentado à URL (A2-07); a ingestão nunca importa `src/database/prisma.ts`. |
| `src/config/env.ts`, `.env.example` | Variáveis e gates de §4.1; exemplos vazios e rotulados. |
| `src/modules/field-location/field-location.types.ts` | `FIELD_LOCATION_STORED_SOURCES`; `FIELD_LOCATION_SOURCES` intacta. |
| `src/modules/field-location/field-location.repository.ts`, `field-location-prisma.repository.ts` | Gravação a partir de um `tx` recebido, sem transação aninhada (espelho `field-dispatch-prisma.repository.ts:169-170`, `new Prisma…Repository(tx)`). |
| `src/modules/field-location/field-location.service.ts` | Extrai a publicação de `field_location.updated` para uma função reutilizável; `recordMobileLocation` e `parseSource` com o mesmo comportamento. |
| `src/modules/field-dispatch/field-dispatch.types.ts`, `field-dispatch.repository.ts`, `field-dispatch-prisma.repository.ts` | `findOperatorsForVehicleAt(tx, …)` com a regra de §4.2. |
| `docker-compose.traccar.yml` | Overlay de dev (§6.1): Traccar por tag+digest, redes internas, `api` com IP fixo e env da ingestão, `traccar-sim`, `traccar-capture`, `web` só em loopback. |
| `infra/traccar/dev/traccar.xml` | `protocols.enable=osmand`, `osmand.port=5055`, H2 local, `forward.type=json`, `forward.retry.enable=true`, `database.registerUnknown=true`, `geocoder.enable=false`, `web.address=127.0.0.1` (interface e REST do Traccar só dentro do contêiner no B-TRC-01); sem segredo e sem URL de servidor público. |
| `infra/traccar/fixtures/6.16.0/position-osmand.json` | Corpo real capturado (§8.5 passo 3), sanitizado. |
| `scripts/traccar-dev-demo.mjs` | O smoke vertical de §8.1 (espelho `scripts/smoke-compose-persistence.mjs`: projeto fixo, loopback cravado, token HS256 com o placeholder do compose, `down -v` sempre, redação de saída). |
| `scripts/traccar-capture-fixture.mjs` | Sobe Traccar + `traccar-capture` (espera o `traccar-capture` responder antes do primeiro envio), manda um ponto, grava o corpo recebido sanitizado; imprime só nomes de header, nunca valores; **recusa** corpo cujo `device.uniqueId` não seja `trcdemo01` e troca `name`, `phone` e `contact` por valores sintéticos **antes** de gravar ou imprimir (N2-05); só roda sob o projeto `erp-trc01-capture`. |
| os 13 arquivos de teste de §8.6 | Propriedades, não formato. |
| `API_CONTRACTS.md`, `docs/deployment.md` | Rota interna (marcada "não é API de cliente"), variáveis, execução do demo. |
| `docs/revisoes/TRACCAR/**`, `agent-orchestration/codex/comandos/B-TRC-01-*.md` e os registros de junta | Comando do bloco, evidências, ata. |

**Proibido:** `src/app.ts` e `src/portal-app.ts` (a separação de B-01 depende disso); `frontend/**`; `mobile/**`;
`src/modules/vehicles/**`, `src/modules/vehicle-identities/**`, `src/modules/telemetry/**`,
`src/modules/notifications/**`, `src/modules/field-ops-realtime/**`; `src/infra/**`; `Dockerfile`,
`docker-compose.yml`, `docker-compose.prod.yml`; `.github/workflows/**`; `package.json` e lockfiles (zero dependência
nova); `Kpis/**` (`D-GOV-PROPORCIONAL` (5)); `fly*.toml`; `infra/**` fora de `infra/traccar/dev/**` e
`infra/traccar/fixtures/**`; credencial real; porta publicada fora de `127.0.0.1`; servidor externo, inclusive os
servidores públicos de demonstração do Traccar. Não criar WebSocket, mapa, polling, rota pública nem rota
administrativa.

### 8.4 Preparação de um worktree novo (fecha A-05)

Git Bash. Variáveis de banco vão **só no ambiente do comando** (prefixo), nunca `export` — o ambiente do executor vaza
na medição. Nomes próprios `trc01-*`, portas só em `127.0.0.1` e fora das do dono (5432, 6379, 3000, 5173, 5050);
os contêineres `erp-*` não são tocados.

```bash
R=C:/Users/AMP/Documents/GitHub/ERP_Techsolutios   # clone principal: só se lê refs dele
W=C:/Users/AMP/w-trc01                             # caminho curto (Windows)
timeout 120 git -C "$R" fetch origin --prune
timeout 120 git -C "$R" worktree add "$W" -b feat/traccar-b-trc-01 origin/main
cd "$W" && git status --short --branch && git rev-parse HEAD           # registrar o head de partida

# 1. disco — ressalva do porteiro do #405: abaixo de 10 GB livres, limpeza profunda antes de baixar imagem
df -h /c
# se "Avail" < 10G:  DEEP_CLEAN=1 timeout -k 15 1800 bash scripts/post-merge-cleanup.sh && df -h /c

# 2. dependências próprias — nunca junction/symlink de node_modules entre worktrees (§C7.1-ter(c))
timeout -k 15 900 npm ci
timeout -k 15 900 npm --prefix frontend ci
DATABASE_URL='postgresql://build:build@localhost:5432/build?schema=public' timeout -k 15 300 npx prisma generate

# 3. banco e Redis descartáveis (espelho do job `backend` da CI: Postgres 16 + Redis 7)
timeout -k 15 120 docker run -d --name trc01-pg -p 127.0.0.1:55432:5432 \
  -e POSTGRES_PASSWORD=trc01-local-not-a-secret -e POSTGRES_DB=erp_techsolutions postgres:16
timeout -k 15 120 docker run -d --name trc01-redis -p 127.0.0.1:56379:6379 redis:7
timeout 90 sh -c 'until docker exec trc01-pg pg_isready -U postgres -d erp_techsolutions; do sleep 1; done'
DATABASE_URL='postgresql://postgres:trc01-local-not-a-secret@127.0.0.1:55432/erp_techsolutions?schema=public' \
  timeout -k 15 300 npx prisma migrate deploy

# 4. imagem do Traccar pela tag E pelo digest aprovados no G-TRC-PD (medido em 2026-10-10, §11 M-20)
for i in 1 2 3; do   # até 3 tentativas: limite do Docker Hub (P-CI-DOCKER-HUB-LIMITE)
  timeout -k 15 900 docker pull traccar/traccar:6.16.0@sha256:03ebb7ed2b219d4f25c326873bd022f5062f80bcae622a9d9422846b51951eda && break
done
```

**Ao fim do bloco (§C5), sempre:**

```bash
timeout 60 docker rm -f trc01-pg trc01-redis
timeout 300 docker compose -p erp-trc01-demo -f docker-compose.prod.yml -f docker-compose.traccar.yml down -v --remove-orphans
timeout 300 docker compose -p erp-trc01-capture -f docker-compose.prod.yml -f docker-compose.traccar.yml down -v --remove-orphans
# órfãos de node do worktree (só os do caminho deste worktree; nunca por nome de processo)
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { \$_.CommandLine -like '*w-trc01*' } | Select-Object ProcessId,CommandLine"
# remoção do worktree só depois de zero processo vivo nele, e só por: git -C "$R" worktree remove --force "$W"
```

Nunca `docker system prune`, `git stash`, `git clean` ou `reset --hard`. A limpeza é reportada em uma linha no PR.

### 8.5 Ordem de execução — testes primeiro

0. **Gate e terreno.** §8.0 inteiro verde; §8.4 passos 1–4; baseline executado (§8.7) no ramo ainda sem mudança,
   gravado em `docs/revisoes/TRACCAR/B-TRC-01-evidencia.md` (comando → saída resumida → veredito, um item por vez).
1. **Comando do bloco** `agent-orchestration/codex/comandos/B-TRC-01-traccar-posicao-no-mapa.md`, no molde do
   `comando-template.md`, copiando §8.3 como escopo permitido/proibido e §8.8 como bateria.
2. **Topologia primeiro.** `tests/traccar-dev-topology.test.ts` (vermelho: overlay não existe) → `docker-compose.traccar.yml`
   e `infra/traccar/dev/traccar.xml` → verde.
3. **Fixture real.** `timeout -k 30 600 node scripts/traccar-capture-fixture.mjs` sobe Traccar + `traccar-capture`
   (projeto `erp-trc01-capture`), manda um ponto OsmAnd `trcdemo01`, grava o corpo recebido, troca valores pessoais por
   sintéticos mantendo as chaves, e derruba o projeto. A fixture gravada leva `position.id = 0`; o dev registra se o
   corpo capturado veio da primeira entrega (`id` ausente ou 0) ou de um retry (`id > 0`) — as duas são legítimas
   (A2-10). **Parada:** só se o corpo não for `{position, device}` ou se `device.uniqueId` faltar; aí o dev registra a
   evidência e para, e o plano volta para o contrato.
4. **Contrato.** `tests/traccar-position-contract.test.ts` vermelho → `traccar-position.schema.ts` e
   `traccar-position.adapter.ts` → verde.
5. **Autenticação e limite.** `tests/traccar-forward-auth.test.ts` e `tests/traccar-rate-limit.test.ts` vermelhos →
   `traccar-forward-auth.ts` e `traccar-rate-limit.ts` → verdes.
6. **Listener e logs.** `tests/traccar-ingest-listener.test.ts` e `tests/traccar-ingest-logs.test.ts` vermelhos →
   app, bootstrap, logger, `env.ts`, `server.ts` → verdes.
7. **Esquema, sob o `agente-dba-guardiao`.** `tests/traccar-binding-uniqueness-db.test.ts`,
   `tests/traccar-quarantine-db.test.ts` e `tests/traccar-idempotency-db.test.ts` vermelhos (tabelas não existem) →
   as duas migrações → `migrate deploy` no `trc01-pg` → `prisma generate` → verdes.
8. **Resolução.** `tests/traccar-resolution-cost.test.ts` vermelho → `traccar-resolution.ts` + `findFirstTenantRls` →
   verde; `tests/traccar-resolution-race-db.test.ts` vermelho → `FOR SHARE` na fase 2 → verde.
9. **Vertical no banco.** `tests/traccar-position-ingestion-db.test.ts` e `tests/traccar-ingest-pool-db.test.ts`
   vermelhos → serviço, repositório, `traccar-db.ts`, `withTenantRlsBudget`, `field-location` e `field-dispatch` →
   verdes.
10. **Smoke.** `node scripts/traccar-dev-demo.mjs` verde (§8.1).
11. **Bateria e autocontrole.** §8.8 inteira; depois, em worktree descartável do próprio dev, cada mutação de §8.9
    uma a uma, registrando que o teste indicado ficou vermelho. Mutação que não derruba teste nenhum não se "conserta"
    no teste sem registrar: é achado, vai à evidência. Também aqui, como evidência e não como gate de CI: o pgbench de
    §11.3 contra a migração real no `trc01-pg`, com 10, 100 e 500 organizações, registrado no arquivo de evidência.
12. **Limpeza e PR.** Fim de §8.4; PR sem `Kpis/*`; junta de segurança (§8.10).

### 8.6 Testes novos — propriedades mínimas (113 casos em 13 arquivos; v2.1 acrescenta 20 e 2 arquivos)

Todo teste novo declara `{ timeout }` no `node:test` (30 s para os sem banco, 120 s para os `-db`); os `-db` se
declaram pulados sem `DATABASE_URL` e, com ela, rodam sob o papel efêmero `NOSUPERUSER NOBYPASSRLS` do arnês
(`createEphemeralRole`, `tests/helpers/auth-identity-fixture.ts:324`), com semeadura e limpeza pela conexão
administrativa e escopo da própria rodada (nunca apagar por curinga).

`tests/traccar-ingest-listener.test.ts` (15): o app público não serve `POST /ingest/traccar/v1/positions` nem
`POST /api/v1/internal/traccar/positions` com token válido (não-2xx); `src/app.ts` não menciona `traccar`; o app de
ingestão responde 404 a `GET` no caminho e a `POST` em outro caminho; não emite `Access-Control-Allow-Origin`; query
string dá 400 sem chamar o serviço; bootstrap com flag desligada não escuta; ligado, escuta no host e porta pedidos;
porta de ingestão igual a `PORT` ou `PORTAL_PORT` reprova o env; flag ligada sem instance key ou sem segredo de 32+
reprova, e em produção o default de dev reprova; a rota móvel recusa `source: "traccar"` com `400 invalid_source`.
**v2.1 (A2-02, A2-11):** com host que não existe na máquina (`192.0.2.1`), o bootstrap devolve `bind_failed` e o app
público, já no ar no mesmo processo, segue respondendo; corpo de 64 KiB + 1 dá `413`; `Content-Type: text/plain` dá
`415`; a 101ª requisição numa rajada dá `429`; `TRACCAR_FORWARD_SECRET_PREVIOUS_UNTIL` a mais de 72 h reprova o env.

`tests/traccar-forward-auth.test.ts` (9): aceita current sem ecoá-lo; aceita previous antes do prazo; recusa previous
depois do prazo (relógio injetado); recusa ausente; recusa valor errado de mesmo tamanho e de tamanho diferente;
recusa header repetido; recusa o segredo em `Authorization`; compara digests SHA-256 de 32 bytes com
`timingSafeEqual` (espião); a resposta 401 não traz segredo nem motivo.

`tests/traccar-ingest-logs.test.ts` (9): um caso por desfecho — 204, 202, 400 (query), 401, 400 (JSON inválido),
413, 415, 422 e 503 (serviço falso estoura o tempo) —, cada um com segredo-sentinela e coordenada-sentinela, e
nenhum dos dois no log capturado.

`tests/traccar-position-contract.test.ts` (13): a fixture 6.16.0 é `{position, device}` e adapta para o comando;
a mesma posição com `id` ausente, 0 e maior que 0 (primeira entrega × retry, A2-10) gera a mesma chave e o mesmo
digest; `device.name`, `phone`, `contact` e `model` não chegam ao comando;
`attributes` é ignorado; chave reservada no envelope, em `position` e em `device` dá 422 (três casos); 10 nós viram
5,1444 m/s; mesma identidade gera a mesma chave e latitude diferente gera outra; mesma identidade com velocidade
diferente mantém a chave e muda o digest; `serverTime` não muda chave nem digest; coordenada fora da faixa, data
inválida ou `uniqueId` inválido dão 422; `fixTime` além de agora + 5 min e `valid=false` produzem os motivos
`fix_in_future` e `invalid_fix`.

`tests/traccar-resolution-cost.test.ts` (9, portas falsas que contam chamadas): dica confirmada custa 1 sondagem e 0
listagem; sem dica, para no primeiro achado (k sondagens); sem vínculo, T sondagens e, no prazo do cache negativo, 0;
com mais de 500 organizações, 0 sondagens e `resolution_budget_exceeded`; dica envenenada cai e a descoberta acha a
organização certa; linha de outra organização numa volta dá `TenantRowsLeakError` e 503; os caches respeitam o teto;
**v2.1 (A2-06):** a confirmação bem-sucedida renova a validade da dica (relógio injetado: passados 10 min de uma dica
renovada aos 9 min, ainda 1 sondagem); com 400 de 500 organizações ativas sai o aviso de 80 %.

`tests/traccar-rate-limit.test.ts` (4, relógio injetado; A2-11): a rajada de 100 passa e a 101ª dá 429; depois de 1 s,
20 novas passam; com 10 em processamento, a 11ª dá 429; liberada uma vaga, a seguinte passa.

`tests/traccar-binding-uniqueness-db.test.ts` (6): com o dispositivo ativo em A, o `INSERT` ativo em B falha com
23505 embora B não enxergue A; sob B, `ON CONFLICT DO NOTHING` volta 0 linhas sem erro; segunda viatura não ganha
rastreador ativo duplicado na mesma organização; desativado em A, B vincula; as duas tabelas tenant-scoped estão em
`FORCE`, as três tabelas novas têm zero `pg_rules`, nenhuma função `SECURITY DEFINER` nova existe e o
`RUNTIME_ROLE_GUARD_SQL` não acusa escape do papel; a quarentena não tem coluna de coordenada nem de
payload (catálogo).

`tests/traccar-resolution-race-db.test.ts` (5, barreira entre conexões): a desativação concorrente espera a ingestão
confirmada terminar, e a posição fica em A; a ingestão que começa durante uma desativação em voo confirma 0 e não grava
em A; o vínculo ativo em B falha enquanto A está ativo e passa depois; em nenhum instante amostrado há dois vínculos
ativos do mesmo dispositivo; **v2.1 (A2-03):** com o vínculo preso por 4 s noutra conexão, a ingestão responde 503
antes de 3 s, sem recibo nem localização.

`tests/traccar-idempotency-db.test.ts` (8): primeira entrega — 204, 1 recibo, 1 localização, 1 evento; reenvio
idêntico — 204, nada novo, nenhum evento; mesma chave com digest diferente — 409, `conflict_count = 1`, nenhuma
localização; duas idênticas concorrentes — ambas 2xx, 1 recibo, 1 localização; duas divergentes concorrentes — uma 204
e uma 409; chave já registrada em outra organização — 409 e quarentena `idempotency_key_owned_elsewhere`, nada na
segunda; falha antes do commit — 503 e nada gravado, e a nova entrega dá 204; **v2.1 (A2-11):** falha forçada depois
do `INSERT` do recibo e antes do da localização (porta de falha injetada no repositório) — nem recibo nem localização
ficam.

`tests/traccar-quarantine-db.test.ts` (6): dispositivo sem vínculo — 202, uma linha aberta, nenhuma localização nem
recibo; 20 entregas concorrentes — 1 linha, `delivery_count = 20`; episódio resolvido não reabre; `fixTime` anterior
ao `valid_from` — `fix_before_active_binding`; `valid=false` — `invalid_fix`; `first_fix_at`/`last_fix_at` acompanham
mínimo e máximo.

`tests/traccar-position-ingestion-db.test.ts` (15): recibo e localização gravados atomicamente sob o papel efêmero;
`source='traccar'` e `/field-locations/latest` devolve o técnico na organização certa; `tenantId` no envelope — 422 e
zero escrita em qualquer organização; operador aceito antes do fix e terminado depois grava para ele; despacho só
atribuído ou já terminado — `no_operator_at_fix_time`; dois operadores — `ambiguous_operator_at_fix_time`;
**v2.1 (A2-12, N2-03, N2-07):** reatribuição A→B feita só pelo repositório, **sem** evento: o fix de A anterior à troca
não vai para B; `reassigned → on_route` sem novo aceite — `operator_history_ambiguous`; B aceita de novo — fixes depois
do aceite vão para B; A→B→A — nenhum fix do período de B vai para A; organização suspensa com dica válida —
`tenant_inactive`; reenvio de posição já gravada depois de uma reatribuição — 204, sem quarentena; posição atrasada entra no histórico e não regride o latest; o evento sai
uma vez, depois do commit, sem coordenada, e não sai em quarentena, duplicata ou rollback; a organização B não lê
localização, recibo nem vínculo de A.

`tests/traccar-ingest-pool-db.test.ts` (2; A2-07): com as 5 conexões da ingestão presas em `FOR SHARE`, uma consulta
feita pelo cliente do app público (`src/database/prisma.ts`) responde em menos de 1 s; a ingestão nunca abre mais que
`TRACCAR_DB_POOL_MAX` conexões (contadas em `pg_stat_activity` pelo `application_name=erp-traccar-ingest` da URL da
ingestão).

`tests/traccar-dev-topology.test.ts` (12, sobre `docker compose -p trc-topology -f docker-compose.prod.yml -f
docker-compose.traccar.yml config --format json` com placeholders no ambiente do comando): Traccar sem `ports`; nenhum
serviço publica 3200, 5055 ou 8082; `api` publica só a 3000 e só em `127.0.0.1`; `web`, se presente, só em
`127.0.0.1`; `traccar_private` e `traccar_devices` são `internal`; `TRACCAR_INGEST_HOST` da `api` é o `ipv4_address`
dela na `traccar_private`; imagens do overlay por tag e `@sha256:`; `CONFIG_USE_ENVIRONMENT_VARIABLES=true` e
`FORWARD_HEADER` só por interpolação obrigatória (`${TRC_FORWARD_HEADER:?}`); `forward.retry.enable=true` e
`protocols.enable=osmand` no `traccar.xml`; nenhum host de servidor público de demonstração do Traccar no overlay, na
config ou nos scripts; `database.registerUnknown` só em `infra/traccar/dev/`; os scripts de demo e captura têm
timeout e não usam `tail -f` nem `docker system prune`. Sem Docker, o teste **falha** com mensagem clara (não se
declara pulado): o job `backend` da CI roda em `ubuntu-latest`, que tem Docker.

### 8.7 Baseline N e meta M ≥ 2N (fecha A-06)

**Conjunto direto** — os testes dos módulos que o B-TRC-01 toca ou dos quais depende, nenhum deles editado:
`tests/field-location-routes.test.ts`, `tests/field-ops-realtime.test.ts`, `tests/field-ops-events.test.ts`,
`tests/field-dispatch.test.ts`, `tests/field-dispatch-routes.test.ts`, `frontend/tests/operations-map.adapter.test.ts`,
`frontend/tests/operations-map-technicians.test.ts`, `frontend/tests/operations-map-calls.test.ts`.

**Contagem estática** (casos `test(`/`it(` de topo; não conta `t.test`), medida em `a2937bad`: 2 + 4 + 12 + 4 + 2 +
14 + 13 + 14 = **65**.

```bash
for f in tests/field-location-routes.test.ts tests/field-ops-realtime.test.ts tests/field-ops-events.test.ts \
         tests/field-dispatch.test.ts tests/field-dispatch-routes.test.ts frontend/tests/operations-map.adapter.test.ts \
         frontend/tests/operations-map-technicians.test.ts frontend/tests/operations-map-calls.test.ts; do
  printf '%s %s\n' "$(git show origin/main:$f | grep -c -E '^\s*(test|it)(\.(only|skip|todo))?\s*\(')" "$f"
done
```

**Contagem executada** — a que vale. No passo 0 de §8.5, no ramo ainda sem mudança:

```bash
timeout -k 15 300 npm test -- tests/field-location-routes.test.ts tests/field-ops-realtime.test.ts \
  tests/field-ops-events.test.ts tests/field-dispatch.test.ts tests/field-dispatch-routes.test.ts 2>&1 | grep -E '^# (tests|pass|fail|skipped)'
(cd frontend && timeout -k 15 300 node --test --test-reporter=tap --import tsx tests/operations-map.adapter.test.ts \
  tests/operations-map-technicians.test.ts tests/operations-map-calls.test.ts 2>&1 | grep -E '^# (tests|pass|fail|skipped)')
```

N = soma dos dois `# tests`. Meta: os N continuam verdes sem edição, e os casos novos são ≥ N; com os 113 de §8.6 e
N estático 65, M = 178 ≥ 130. Se a contagem executada passar de 113, o dev escreve casos novos até `novos ≥ N` —
propriedade, não snapshot.

### 8.8 Bateria exata do B-TRC-01 (fecha A-04)

Git Bash, na raiz do worktree, depois de §8.4. Todo comando tem teto (`timeout -k 15 <s>` mata o processo e, 15 s
depois, força); nenhum acompanha log. As URLs são do cluster descartável de §8.4 e entram só no ambiente do comando.

```bash
DB='postgresql://postgres:trc01-local-not-a-secret@127.0.0.1:55432/erp_techsolutions?schema=public'
RD='redis://127.0.0.1:56379'

timeout -k 15 600 npm run check
timeout -k 15 600 npm run lint

# testes novos sem banco
timeout -k 15 300 npm test -- tests/traccar-ingest-listener.test.ts tests/traccar-forward-auth.test.ts \
  tests/traccar-ingest-logs.test.ts tests/traccar-position-contract.test.ts tests/traccar-resolution-cost.test.ts \
  tests/traccar-rate-limit.test.ts
timeout -k 15 300 npm test -- tests/traccar-dev-topology.test.ts

# testes novos com banco (papel efêmero NOSUPERUSER NOBYPASSRLS no cluster descartável)
DATABASE_URL="$DB" timeout -k 15 900 npm test -- tests/traccar-binding-uniqueness-db.test.ts \
  tests/traccar-resolution-race-db.test.ts tests/traccar-idempotency-db.test.ts tests/traccar-quarantine-db.test.ts \
  tests/traccar-position-ingestion-db.test.ts tests/traccar-ingest-pool-db.test.ts

# regressões diretas (§8.7) e a do papel de runtime
timeout -k 15 300 npm test -- tests/field-location-routes.test.ts tests/field-ops-realtime.test.ts \
  tests/field-ops-events.test.ts tests/field-dispatch.test.ts tests/field-dispatch-routes.test.ts
DATABASE_URL="$DB" timeout -k 15 900 npm test -- tests/san3-05-leituras-de-plataforma-db.test.ts

# suíte inteira nas duas formas canônicas do runner (sem banco; e com banco, como o job backend da CI)
timeout -k 15 2400 npm test
DATABASE_URL="$DB" REDIS_URL="$RD" timeout -k 15 3000 npm test

# frontend (não muda no B-TRC-01; regressão do mapa vem no smoke)
timeout -k 15 900 npm --prefix frontend run test:smoke
timeout -k 15 600 npm --prefix frontend run check
timeout -k 15 900 npm --prefix frontend run build

timeout -k 15 900 npm run build

# vertical ponta a ponta (sobe e derruba o próprio projeto compose)
timeout -k 30 900 node scripts/traccar-dev-demo.mjs

git diff --check
```

O `--wait` e os passos internos do demo usam `AbortSignal.timeout`; o teto externo de 900 s cobre build da imagem e
pull. Depois da bateria, o comando de órfãos de §8.4. No PowerShell, quem preferir: as mesmas linhas com `$env:X='…'`
por comando e `Remove-Item Env:X` logo depois — nunca deixar `DATABASE_URL` no ambiente da sessão.

### 8.9 Mutações de controle — uma por propriedade crítica (fecha A-03)

Cada mutação é aplicada **sozinha**, num worktree descartável próprio da rodada (um só, com `npm ci` próprio e cluster
`trc01-mut-pg` próprio): aplica-se a edição, roda-se o teste indicado, registra-se o vermelho e desfaz-se a edição com
`git checkout -- <arquivo>` antes da próxima; no fim, o worktree sai por `git worktree remove --force`. O dev faz a rodada inteira uma vez antes do PR (autocontrole, §8.5 passo 11); os jurados re-executam
pelo menos as de segurança (MUT-01 a MUT-15, MUT-17 a MUT-22, MUT-30 a MUT-45). Mutação que não derruba o teste indicado é achado.

| Mutação | Propriedade | Edição | Fica vermelho |
|---|---|---|---|
| MUT-01 | ingestão fora do listener público | montar o router de ingestão em `createApp` (`src/app.ts`) | `traccar-ingest-listener` (app público não serve; `src/app.ts` sem `traccar`) |
| MUT-02 | listener só com a flag | bootstrap ignora `TRACCAR_INGEST_ENABLED` | `traccar-ingest-listener` (flag desligada não escuta) |
| MUT-03 | porta própria | remover o gate de porta igual a `PORT`/`PORTAL_PORT` | `traccar-ingest-listener` (env) |
| MUT-04 | um vínculo ativo por dispositivo no banco todo | índice ativo com `tenant_id` no lugar do global | `traccar-binding-uniqueness-db` (23505 em B) |
| MUT-05 | vínculo travado durante a gravação | `FOR SHARE` → `FOR KEY SHARE` na fase 2 | `traccar-resolution-race-db` (desativação espera) |
| MUT-06 | confirmação é a autoridade | gravar no tenant da dica sem o `SELECT … FOR SHARE` | `traccar-resolution-cost` (dica envenenada) e `traccar-position-ingestion-db` |
| MUT-07 | parada no primeiro achado | varrer sempre todas as organizações | `traccar-resolution-cost` (k sondagens) |
| MUT-08 | dica positiva | ignorar a dica | `traccar-resolution-cost` (1 sondagem, 0 listagem) |
| MUT-09 | orçamento de organizações | remover o teto de 500 | `traccar-resolution-cost` (0 sondagens + motivo) |
| MUT-10 | conteúdo divergente não é sucesso | 0 linhas → 204 sem comparar digest | `traccar-idempotency-db` (409) |
| MUT-11 | conflito não aborta a transação | `INSERT` puro do recibo | `traccar-idempotency-db` (idênticas concorrentes) |
| MUT-12 | posição em uma organização só | `tenant_id` na unique do recibo | `traccar-idempotency-db` (chave de outra organização) |
| MUT-13 | identidade da quarentena | remover o índice único parcial (o `ON CONFLICT` passa a falhar com `42P10` em toda entrega, medido pela r2; com `INSERT` puro no lugar, nascem 20 linhas) | `traccar-quarantine-db` (1 linha; 202 em toda entrega) |
| MUT-14 | contador sem perda | `SET delivery_count = EXCLUDED.delivery_count` | `traccar-quarantine-db` (20) |
| MUT-15 | header do Traccar pelo ambiente | tirar `CONFIG_USE_ENVIRONMENT_VARIABLES` do overlay | `traccar-dev-topology`; o demo dá 401 e nenhuma posição |
| MUT-16 | log sem segredo | serializadores padrão do `pino-http` | `traccar-ingest-logs` |
| MUT-17 | rotação com prazo | ignorar `TRACCAR_FORWARD_SECRET_PREVIOUS_UNTIL` | `traccar-forward-auth` (previous vencido) |
| MUT-18 | comparação em tempo constante | trocar digest + `timingSafeEqual` por `===` | `traccar-forward-auth` (espião) |
| MUT-19 | header repetido recusado | usar só o primeiro valor de um header repetido | `traccar-forward-auth` (repetido → 401) |
| MUT-20 | tenant do payload nunca vale | remover a checagem de chaves reservadas | `traccar-position-contract` (422) e `traccar-position-ingestion-db` |
| MUT-21 | cliente não se diz Traccar | `traccar` dentro de `FIELD_LOCATION_SOURCES` | `traccar-ingest-listener` (rota móvel recusa) |
| MUT-22 | trajeto não muda de dono (A2-12) | o gatilho deixa de regravar `operator_assigned_at` quando `operator_user_id` muda | `traccar-position-ingestion-db` (A→B sem evento: fix de A não vai a B) |
| MUT-23 | evento só depois do commit e uma vez | publicar antes do commit, ou também na duplicata | `traccar-position-ingestion-db`, `traccar-idempotency-db` |
| MUT-24 | latest não regride | ordenar por `received_at` antes de `recorded_at` (`field-location-prisma.repository.ts:41-65`) | `traccar-position-ingestion-db` (posição atrasada) |
| MUT-25 | unidade certa | gravar nós como m/s | `traccar-position-contract` (10 nós → 5,1444) |
| MUT-26 | Traccar sem porta no host | `ports: ["127.0.0.1:5055:5055"]` no serviço `traccar` | `traccar-dev-topology` |
| MUT-27 | SSE sem coordenada (regressão existente) | tirar `coordinateKeyPattern` do broker | `tests/field-ops-realtime.test.ts:118-120` |
| MUT-28 | segredo nunca em query | aceitar query string | `traccar-ingest-listener`, `traccar-ingest-logs` (400) |
| MUT-29 | fix inválido não vai ao mapa | gravar `valid=false` | `traccar-position-contract`, `traccar-quarantine-db` (`invalid_fix`) |
| MUT-30 | taxa e concorrência (A2-11) | o token bucket nunca esvazia | `traccar-rate-limit`, `traccar-ingest-listener` (429) |
| MUT-31 | bind só no host privado (A2-11) | `listen(TRACCAR_INGEST_PORT)` sem host, como o `portalApp.listen` | `traccar-ingest-listener` (endereço = host pedido) |
| MUT-32 | corpo limitado | limite do parser em `2mb` | `traccar-ingest-listener` (413) |
| MUT-33 | só JSON | aceitar qualquer `Content-Type` | `traccar-ingest-listener` (415) |
| MUT-34 | `FORCE` nas tabelas novas | migração sem `FORCE ROW LEVEL SECURITY` no recibo | `traccar-binding-uniqueness-db` (catálogo) |
| MUT-35 | recibo e localização atômicos | recibo gravado em transação própria, antes da da localização | `traccar-idempotency-db` (falha injetada não deixa recibo) |
| MUT-36 | canário na varredura | tirar `assertRowsBelongToTenant` de `findFirstTenantRls` | `traccar-resolution-cost` (`TenantRowsLeakError`) |
| MUT-37 | previous com prazo de até 72 h | tirar o teto de 72 h do gate do env | `traccar-ingest-listener` (env) |
| MUT-38 | segredo só no header próprio | aceitar o segredo em `Authorization: Bearer` | `traccar-forward-auth` |
| MUT-39 | falha do `listen` não derruba a API (A2-02) | tirar o tratador de `error` do bootstrap | `traccar-ingest-listener` (`bind_failed`) |
| MUT-40 | orçamento de tempo no banco (A2-03) | tirar `lock_timeout`/`statement_timeout` e as opções do `withTenantRlsBudget` | `traccar-resolution-race-db` (503 antes de 3 s) |
| MUT-41 | pool próprio (A2-07) | a ingestão usa o `prisma` de `src/database/prisma.ts` | `traccar-ingest-pool-db` |
| MUT-42 | retry com `id > 0` (A2-10) | pôr `position.id` na chave | `traccar-position-contract` (mesma chave na primeira entrega e no retry) |
| MUT-43 | operador no instante (A2-12) | regra sem `operator_assigned_at` (só `accepted_at ≤ fixTime`) | `traccar-position-ingestion-db` (A→B sem evento; A→B→A) |
| MUT-44 | organização suspensa (N2-07) | fase 2 sem conferir `tenants.status` | `traccar-position-ingestion-db` (`tenant_inactive`) |
| MUT-45 | recibo antes do operador (N2-03) | resolver o operador antes do `SELECT` do recibo | `traccar-position-ingestion-db` (reenvio depois de reatribuição → 204) |

O jurado também lê o código e confirma que `timingSafeEqual` recebe dois buffers de 32 bytes: estatística de tempo em
CI não é prova.

### 8.10 Pronto significa, e quem aprova

- os casos novos de §8.6 verdes (≥ N executado), os N diretos verdes sem edição, as duas formas da suíte verdes;
- migração aditiva aprovada pelo `agente-dba-guardiao`; `FORCE` e o guard do runtime provados sob papel efêmero;
- smoke vertical verde, com 1 recibo e 1 localização depois do reenvio;
- as 45 mutações registradas em vermelho;
- `check`, `lint`, `build`, frontend `check`/`build`/`test:smoke` e `git diff --check` verdes;
- limpeza de §8.4 reportada em uma linha; PR sem `Kpis/*`.

**Quórum:** junta completa de segurança, **unanimidade 3/3**, com o `inspetor-de-terreno-da-junta` antes (ingestão,
tenant, segredo e localização: `D-GOV-PROPORCIONAL` (1) e (4)). Três cadeiras, cada uma com no máximo três itens (P4):

- **(a) RLS, unicidade e banco.** Itens: vínculo global e trava da confirmação; recibo global e atomicidade;
  orçamento de tempo e pool próprio. Re-executa MUT-04 a MUT-06, MUT-12, MUT-34, MUT-35, MUT-40 e MUT-41.
- **(b) Superfície e segredo.** Itens: listener próprio (bind, falha do `listen`, 413/415/429); autenticação e
  rotação; logs. Re-executa MUT-01 a MUT-03, MUT-15 a MUT-19, MUT-28, MUT-30 a MUT-33 e MUT-37 a MUT-39.
- **(c) Contrato e atribuição.** Itens: idempotência e quarentena; operador no instante, com a leitura da trava
  `Ω6R-SEC-002` de §8.0 linha 6; resolução (dica, teto, canário). Re-executa MUT-07 a MUT-11, MUT-13, MUT-14,
  MUT-20 a MUT-24, MUT-36 e MUT-42 a MUT-45 (N2-02: as de resolução agora têm cadeira).

Teto de 2 ciclos; do ciclo 3 em diante só defeito grave de produto
bloqueia (`D-GOV-PROPORCIONAL` (2)). Depois do merge, porteiro (bloco de produto, regra (3)). Nada disso autoriza
staging nem produção.

## 9. Atos do dono e fora deste plano

### 9.1 Decisões e ações que pertencem ao dono

0. **As seis decisões da seção "Decisões do dono antes do B-TRC-01"**: as 1, 2 e 3 antes do B-TRC-01; a 4 antes do
   B-TRC-04; a 5 antes do B-TRC-03; a 6 antes do staging com dado real ou da produção. Os itens 1 e 7 abaixo detalham as
   decisões 2 e 6.
1. **AWS × Fly / alcance da mudança.** Confirmar se todo backend de ingestão vai à AWS com o
   Traccar (recomendado) ou se ERP permanece no Fly e haverá ponte privada. A decisão específica
   `D-TRACCAR-HTTP-PRIVADO-AWS` prevalece para o Traccar, mas não migra o ERP inteiro em silêncio;
   `D-INFRA-PROVIDER` ainda nomeia Fly primeiro (M-2/M-14).
2. **Hospedagem Traccar.** Aprovar conta, região, VPC/subnets, ECS/Fargate, RDS dedicado, backup,
   retenção, observabilidade e orçamento. Aprovar também versão/digest depois do scan.
3. **Entrada dos rastreadores reais.** Informar modelos/protocolos, quantidade/frequência, APN/VPN
   disponível e se alguma porta pública é indispensável. Porta pública é uma nova decisão, threat
   model e junta — não consequência deste plano.
4. **Contas e segredos.** Criar/autorizar contas AWS/Traccar, gerar e injetar forward current e
   credencial REST via Secrets Manager/GitHub Environment, definir responsáveis e periodicidade de
   rotação. O valor nunca passa pelo PR ou chat.
5. **Ato 2.** Medir as cinco tarefas automáticas sob `erp_runtime`, com o mesmo seed e efeito não
   vazio, antes de trocar a conexão produtiva (`P-SAN3-05-ATO2-CINCO-TAREFAS`,
   `pendencias.md:10263`, M-3; `D-ATO2-OPCAO-B`, M-2), cujo dono é o bloco `B-SAN3-05-ATO2` desde `c1cfdabe`
   (`pendencias.md:10270`; nome dado pelo orquestrador, não pelo dono). Ele não bloqueia B-TRC-01–05, mas bloqueia produção: o boot de produção depois de
   `a9fbe283` recusa papel que escapa do RLS.
6. **Gates produtivos existentes.** Fechar os P0 de J-6R ainda abertos — `Ω6R-DIN-009`, `Ω6R-DAT-002`, `Ω6R-DAT-003`
   e `Ω6R-SEC-002` em `a2937bad` (§11 M-28) — ou decidir expressamente sobre o veredito da J-6R; e
   `P-SAN3-05-STAGING-CD-AMARRACAO` antes de staging/CD produtivo. Fechar também os dois resíduos
   de RLS da §5 antes de ligar ingestão de produção.
7. **Produto/LGPD.** Decidir retenção de localização, quem pode ver trilha veicular, coexistência
   rastreamento do app×Traccar, se rastreamento veicular é recurso pago e catálogo de alarmes que
   merece notificação. A decisão anterior aponta “veículo pago, técnico grátis”, mas preço/entitlement
   não será inferido.
8. **Registro.** O parecer do porteiro do #405 já está na `main` (`c1cfdabe`); falta registrar
   `P-TRC-FORMA-QUATRO-OU-SETE` (§7.2).

### 9.2 Fora deste plano

- comprar/instalar rastreador, SIM, APN ou contrato de operadora;
- certificar protocolo/firmware de cada hardware físico;
- expor listener público, implantar WAF/NLB público ou usar servidor demo;
- substituir o rastreamento consentido do app ou mudar sua política LGPD;
- WebSocket, segundo mapa, painel administrativo Traccar exposto ou login Traccar para cliente;
- roteirização, geofence avançada, corte de ignição, comando remoto e automação de condução;
- faturamento/entitlement do recurso pago; este plano apenas preserva a fronteira para decisão;
- migrar todo o ERP Fly→AWS sem plano próprio;
- executar produção antes do B-TRC-07 e de seus gates.

## 10. Riscos, estimativa e rollback

### 10.1 Riscos principais

| Risco | Prob./impacto | Tratamento |
|---|---|---|
| Posição na organização errada | média/crítico | Descoberta não autoritativa + confirmação `FOR SHARE` sob RLS + índice único global do vínculo (§4.3, medido U1–U4); nunca payload, default ou bypass. MUT-04 a MUT-06. |
| Associação errada por atraso/revezamento de veículo | média/crítico | Despacho aceito e não encerrado no `fixTime`; despacho reatribuído vai à quarentena (P-08); ambíguo/ausente em quarentena. MUT-22. |
| Reenvio, conteúdo divergente ou ordem fora de sequência | alta/alto | Recibo com unicidade global e digest (409 na divergência), transação única, latest por `recorded_at`; backfill por janela. MUT-10 a MUT-12, MUT-24. |
| Evento perdido porque `event.forward` não documenta retry | média/alto | Receipt quando recebido + reconciliação REST periódica e métricas de gap; não prometer exactly-once. |
| Drift do JSON/versão Traccar | média/alto | Tag+digest, fixture versionada, contract test e upgrade explícito; o contract test acusa se o forward passar a trazer `position.id` (mudança de ordem do pipeline, P-01). |
| Administrador do Traccar desvia `forward.url` por dispositivo | baixa/alto | Interface e REST do Traccar fechadas, conta só do serviço, egress do Traccar restrito (P-04). |
| SSE com várias réplicas | média/médio | Broker em memória do processo (§4.1): decidir broker compartilhado no B-TRC-06, sem dependência nova sem junta. |
| Vazamento de localização/segredo | média/crítico | Rede privada, redaction, resposta vazia, allowlist, quarentena sem coordenada, RLS/RBAC e teste de log. |
| Varredura O(n) degrada com muitos tenants | média/alto | Dica positiva, parada no primeiro achado, cache negativo e teto de 500 organizações (§4.3); medido 15 ms/100 e 166 ms/1.000 no servidor; re-medido no B-TRC-06. MUT-07 a MUT-09. |
| Limite do Docker Hub ao baixar imagens (`P-CI-DOCKER-HUB-LIMITE`, `pendencias.md:10479`) | média/médio | A imagem do Traccar só é baixada na máquina do dev (§8.4 passo 4) e por digest; o teste de topologia usa `docker compose config`, que não baixa nada, então a CI não depende do Traccar no Docker Hub. |
| Volume maior que limite inicial | média/alto | Limites configuráveis, load test de staging, métricas, sizing antes do go-live. |
| Resíduos table-rule/SECURITY DEFINER anulam guard | existente/crítico | Bloquear B-TRC-07 até fechar as duas pendências e reexecutar inventários. |
| Conflito AWS específico × Fly atual | alta/alto | Decisão 2 do dono: escolha ou aceite escrito do adiamento antes do B-TRC-01; a escolha em si antes do B-TRC-06; nenhuma ponte pública improvisada. |
| Penhasco do teto de 500 organizações | baixa hoje/alto | Falha fechada; validade deslizante da dica; aviso a partir de 80 % no B-TRC-01, alarme no B-TRC-06; contar só organizações com o módulo depende da decisão sobre o recurso pago (§4.3, A2-06). |
| Ingestão degrada a API pública | média/alto | Pool próprio de 5 conexões, concorrência 10, `lock_timeout`, falha do `listen` sem derrubar o processo (§4.1, A2-02, A2-07). MUT-39 a MUT-41. |
| Volume de recibos e de jobs de fanout | média/médio | Um recibo e um job `field-ops-event-fanout` no Redis por posição (`domain-event.publisher.ts:34,57-80`; r2, N2-08); medido no B-TRC-06; retenção na decisão 6. |
| Custo/lock-in operacional | média/médio | OCI fixada, DB PostgreSQL, IaC, backup/restore e estimativa AWS aprovada antes de apply. |

### 10.2 Estimativa honesta

O ritmo informado pelo dono é a base: **#400 levou 2 ciclos; #405, 4 ciclos e 6 dias; #409,
somente revisor**. O código confirma que #400 teve junta 2 e #405 chegou ao menos ao ciclo 4,
enquanto #409 foi revisão independente (`status-geral.md:4983-4990`, atas/mandatos em M-17). O
Traccar se parece mais com #405 do que com #409: toca segredo, RLS, tenant e dado de localização.

| Faixa | Prazo de engenharia serial | Observação |
|---|---:|---|
| G-TRC-PD | 1 | Junta 5/5 sobre a PD; sem código. |
| B-TRC-01 | **5–8 dias úteis** | Primeiro resultado funcionando; teto de 2 ciclos de segurança (`D-GOV-PROPORCIONAL` (2)). |
| B-TRC-02 | 4–7 | Novo modelo e contrato de eventos. |
| B-TRC-03 | 4–7 | Cadastro, segredo REST e concorrência. |
| B-TRC-04 | 3–5 | Pode cair para revisor+CI se o diff for só apresentação. |
| B-TRC-05 | 2–4 | Catálogo de alarme precisa estar decidido. |
| B-TRC-06 | 5–10 | Não inclui espera por conta, rede ou compra. |
| B-TRC-07 | 2–4 | Não inclui espera pelos gates/atos do dono. |
| **Total** | **26–46 dias úteis** | Sem tempo externo; serial por bloco e porteiro; na forma de quatro blocos (§7.2) o total muda pouco, porque o trabalho é o mesmo. |

É uma faixa, não promessa. O melhor caso requer decisões antes de cada dependência e junta verde no
primeiro/segundo ciclo; quatro ciclos como #405 empurram para o limite superior. O dono vê algo real
ao fim do B-TRC-01, sem esperar as telas e a nuvem completas.

### 10.3 Rollback

- **B-TRC-01:** `TRACCAR_INGEST_ENABLED=false` (o listener nem sobe) e remover `FORWARD_URL`/`FORWARD_HEADER` do
  Traccar; promover imagem anterior. Tabelas aditivas ficam inertes para investigação; rollback SQL manual só em ambiente
  sem dado, nunca como rollback produtivo automático.
- **B-TRC-02:** desligar `event.forward.url` e leitura da fonte veicular; conservar eventos já
  recebidos. Nenhuma OS/quilometragem manual foi sobrescrita.
- **B-TRC-03:** desabilitar worker REST e ações de vínculo; segredo é revogado/rotacionado. Forward
  continua pela rota existente se bindings estiverem válidos.
- **B-TRC-04:** promover frontend anterior; APIs continuam compatíveis/aditivas.
- **B-TRC-05:** esvaziar allowlist de alarmes; notificações já emitidas permanecem auditáveis.
- **B-TRC-06:** destruir somente recursos de staging nomeados pelo IaC após snapshot/restore
  comprovado; revogar secrets/SG.
- **B-TRC-07:** desligar forward primeiro, promover SHA anterior, rotacionar segredo comprometido,
  manter Traccar coletando e depois reconciliar a janela. Nunca apagar receipts/telemetria para
  “voltar”.

## 11. Fontes e comandos de medição

### 11.1 Repositório — medidas da v1 em `origin/main@a9fbe283`, conferidas pela crítica r1 em `a2937bad`

| ID | Comando reproduzível | O que sustenta |
|---|---|---|
| M-0 | `git -C C:/Users/AMP/w-traccar rev-parse HEAD; git ... rev-parse origin/main; git ... branch --show-current` | Head/ref/branch exigidos. |
| M-1 | `git show origin/main:CLAUDE.md` | Contrato inteiro, em especial §C7 item 8(4), KPI e quórum. |
| M-2 | `git show origin/main:agent-orchestration/controle/decisoes.md` | D-TRACCAR, pós-#405, governança, provedor, Ato 2 e modelo. |
| M-3 | `git show origin/main:agent-orchestration/controle/pendencias.md` | Quatro ressalvas SAN3 exigidas. |
| M-4 | `git grep -n -i -E 'traccar\|device_id\|unique.?id\|ignition\|odometer\|alarm' origin/main -- prisma src frontend/src` | Ausência/presença de vínculo e campos; resultados lidos no contexto, não só contados. |
| M-5 | `git show origin/main:prisma/schema.prisma` com numeração de linhas | `FieldOperatorLocation`, `Vehicle`, `TelemetryEvent`, OS/despacho e identidade de terceiro. |
| M-6 | `git show origin/main:src/modules/field-location/field-location.service.ts` | Validação, sanitização e evento existente. |
| M-7 | `git show origin/main:src/modules/field-location/field-location-prisma.repository.ts` | RLS wrapper, latest e história. |
| M-8 | `git show origin/main:src/database/rls.ts`; `git show origin/main:src/database/runtime-role.ts` | `withTenantRls`, `forEachTenantRls` e trava do runtime. |
| M-9 | `git show origin/main:src/app.ts`; `git show origin/main:src/config/env.ts` | Parser 2 MB, redaction atual e ordem de routers/env. |
| M-10 | `git show origin/main:frontend/src/modules/operations/map/operations-map.service.ts`; `.../useOperationsMap.ts` | REST latest, SSE e fallback 30 s. |
| M-11 | `git show origin/main:src/modules/field-ops-realtime/field-ops-realtime.broker.ts`; rotas correspondentes | Evento existente, segregação por tenant e remoção de coordenadas. |
| M-12 | `git show origin/main:frontend/src/modules/telemetry/telemetry.service.ts`; arquivos do módulo | Estado real das telas e vazio honesto. |
| M-13 | `git show origin/main:docker-compose.yml`; `git show origin/main:Dockerfile`; `git show origin/main:docker-compose.prod.yml` | Topologia local/runtime atual. |
| M-14 | `git show origin/main:docs/deployment.md`; `git show origin/main:docs/revisoes/SAN3/PLANO_SAN3.md` | Fly atual, runtime role, §10.2/§11 e atos. |
| M-15 | `git show origin/main:RBAC_MATRIX.md`; `git show origin/main:API_CONTRACTS.md` | Permissões e contratos de localização, veículos, telemetria e SSE. |
| M-16 | **Substituída na v2** pela lista explícita e pelo comando de §8.7 (M-32) | A contagem 2+4+14=20 reproduzia; os "dez arquivos / 83" não (achado A-06). |
| M-17 | `git grep -n -E '#400\|#405\|#409' origin/main -- agent-orchestration docs` | Ritmo/ciclos e gates recentes. |
| M-18 | `git show origin/main:src/modules/vehicle-identities/vehicle-identity.types.ts`; `git show origin/main:src/modules/mobile/mobile-telemetry-sync.ts` | Identidade de terceiro/recolhido e entrada mobile derivada do ator. |

Linhas foram obtidas por `git show origin/main:<arquivo> | ForEach-Object` com contador; isso evita
medir a árvore mutável e é EOL-neutro para o propósito do plano. O `git grep` M-4 encontrou o termo
“deviceId” apenas em metadados/fixtures alheios e nenhum modelo de vínculo Traccar↔frota; o resultado
foi conferido manualmente contra `Vehicle` e `ThirdPartyVehicleIdentity`, não inferido de busca vazia.


### 11.2 Medições novas da v2 (2026-10-10, ref `a2937bad`, worktree `C:/Users/AMP/w-traccar` em `1dfd0774`)

| ID | Comando ou fonte | Resultado que sustenta o plano |
|---|---|---|
| M-19 | `git diff --name-only a9fbe283 origin/main -- src prisma docs/deployment.md` | vazio: #411 e #412 não tocam o que o plano mede |
| M-20 | `docker buildx imagetools inspect traccar/traccar:6.16.0`; idem `node:20-bookworm-slim` | índices `sha256:03ebb7ed2b219d4f25c326873bd022f5062f80bcae622a9d9422846b51951eda` e `sha256:2cf067cfed83d5ea958367df9f966191a942351a2df77d6f0193e162b5febfc0`, sem `pull` |
| M-21 | cluster descartável `pltrc2-pg` (PostgreSQL 16.14, sem porta publicada, removido por nome), papel `app_rt NOSUPERUSER NOBYPASSRLS`; SQL em §11.3 | U1b 23505 sob B; U1c B vê 0; U2 `DO NOTHING` 0 linhas sem erro; U3b/U3c digest legível só na própria organização; U3d `INSERT` puro aborta; U4 `FOR SHARE` faz a desativação esperar 1,98 s, `FOR KEY SHARE` e sem trava 0,00 s; U4d confirmação durante desativação em voo espera e vê 0; U5 20 concorrentes → 1 linha e contagem 20, mutações → 1 e 20; **correção da v2.1 (N2-04):** "sem o índice", com o `INSERT … ON CONFLICT` igual, dá `42P10` em toda entrega; as 20 linhas só aparecem trocando também o `INSERT` por um puro |
| M-22 | `pgbench -n -c 1` dentro do contêiner, 1.000 organizações, 21.000 vínculos (1.000 ativos) | quente 0,534 ms; varredura 1,455 / 15,47 / 165,7 ms para 10 / 100 / 1.000 organizações |
| M-23 | `docker compose -p pltrc2cfg -f base.yml -f over.yml config --format json` (Compose v5.2.0), sem subir nada | `ports: !override` substitui; `API_PORT=127.0.0.1:3102` sai `host_ip 127.0.0.1`; rede `internal` com `ipv4_address` aceita |
| M-24 | `git show origin/main:src/server.ts` (35-44), `:src/portal-app.ts` (21-55), `:src/config/env.ts` (292), `:docker-compose.prod.yml` (93-94) | precedente de app e porta próprios; só a 3000 publicada |
| M-25 | `git grep -n "source" origin/main -- frontend/src/modules/operations/map` | só fonte de mapa (MapLibre) e fonte de dados (`api`/`mock`/`fallback`); o campo `source` da localização não é lido |
| M-26 | `git show origin/main:prisma/migrations/20260615000000_add_field_operator_locations/migration.sql` (16); `:src/modules/field-location/field-location.service.ts` (30, 160-169); `:src/modules/field-dispatch/field-dispatch-prisma.repository.ts` (98-114) | P-06, P-07, P-08 |
| M-27 | `git cat-file -e origin/main:agent-orchestration/omega/juntas/votos/B-SAN3-05/PORTEIRO-405.md`; `gh pr view 413 --json state,mergeCommit` | em `a2937bad` falhava (parecer só no ramo `6d6568dc`, 164 linhas); em `c1cfdabe` passa, #413 MERGED, 164 linhas, veredito na 164 |
| M-28 | comando abaixo da tabela | P0 não fechados em `a2937bad`: `Ω6R-SEC-002` (parcialmente superado), `Ω6R-DIN-009`, `Ω6R-DAT-002`, `Ω6R-DAT-003` |
| M-29 | `git show origin/main:agent-orchestration/controle/decisoes.md` (2218-2221, 2275-2285, 2938-2957, 2999-3000); `git show origin/main:docs/revisoes/SAN3/PLANO_SAN3.md` (533-537) | texto do conflito de §7.2 |
| M-30 | `git show origin/main:scripts/run-backend-tests.mjs` (303-327: aceita vários alvos; nenhum timeout); `git show origin/main:.github/workflows/ci.yml` (31-112: job `backend` com Postgres, Redis e `DATABASE_URL`) | bateria de §8.8 e os testes `-db` rodando na CI sem tocar o workflow |
| M-31 | `git show origin/main:scripts/smoke-compose-persistence.mjs` (projeto fixo, loopback, token HS256 em 262-291, `down -v` sempre) | espelho do demo |
| M-32 | laço de contagem de §8.7 | 2, 4, 12, 4, 2, 14, 13, 14 = 65 |
| M-33 | `git show origin/main:src/modules/core-saas/permissions/catalog.ts` (bloco `field_dispatcher`, 628-675, com `field_location:read` em 660); `:src/modules/field-ops-realtime/field-ops-realtime.routes.ts` (`/operations/field-events/stream` com `field_location:read`) | papel do token do demo e rota do SSE |
| M-34 | `git show origin/main:src/modules/field-ops-realtime/field-ops-realtime.broker.ts` (21, 25) | broker em memória do processo; coordenadas removidas |
| M-35 | `node -e` com `http.createServer` e um socket cru mandando `X-Traccar-Forward-Token` duas vezes (Node v20.19.5) | o servidor recebe `"aaa, bbb"`: header repetido não bate com segredo nenhum |
| M-36 | `gh api repos/thiagodorgo/ERP_Techsolutios/commits/a2937bada1661e678b36a42e4742c2a92bf5d949/check-runs` | `docker`, `backend`, `backend-postgres`, `frontend` e os portais `success`; o job `docker` roda `smoke-compose-persistence.mjs` (`ci.yml:394,473`) |
| M-37 | `git fetch origin --prune`; `git diff --name-only a2937bad origin/main`; `git diff -U0 a2937bad origin/main -- agent-orchestration/controle/decisoes.md agent-orchestration/controle/pendencias.md` | `origin/main` = `c1cfdabe` (#413); 9 arquivos, todos de registro; `decisoes.md` cresce depois da 3050, `pendencias.md` troca 10270-10271 e 10397 linha por linha e cresce depois da 10477 |
| M-38 | cluster descartável `pltrc3-pg` (PG 16, sem porta, `--rm`), tabela espelho de `field_dispatches` com RLS `FORCE`, a função e o gatilho de §3.1 item 5, papel `app_rt NOSUPERUSER NOBYPASSRLS` | `prosecdef=false`; depois do aceite de A, um `UPDATE` só de status com `operator_assigned_at` forjado mantém o valor do gatilho; reatribuição A→B sem evento → B inelegível; `reassigned → on_route` → inelegível; B aceita de novo → elegível |
| M-39 | mesmo cluster: sessão 1 segura a linha com `UPDATE` + `pg_sleep(3)`; sessão 2 faz `SET LOCAL lock_timeout = '500ms'` e `SELECT … FOR SHARE` | `ERROR: canceling statement due to lock timeout` (55P03) na sessão 2; o PostgreSQL cancela a espera sozinho |
| M-40 | `git show origin/main:agent-orchestration/omega/juntas/votos/B-SAN3-06b/PORTEIRO-411.md` (l. 83, 101, 107); `git show origin/main:agent-orchestration/controle/pendencias.md` (3104-3123) | ressalva nominal ao Traccar e a trava do `Ω6R-SEC-002` ("Bloqueia" na 3118) |
| M-41 | `git show origin/main:src/database/prisma.ts` (15-17); medida da r2 no `node_modules` do clone principal (`@prisma/adapter-pg` 7.8.0 → `new pg.Pool(config)`; `pg-pool` 3.14.0, `max \|\| poolSize \|\| 10`) | um `PrismaClient` por processo com pool padrão de 10 |

Comando de M-28 (Git Bash):

```bash
git show origin/main:docs/revisoes/O6R/achados.jsonl | node -e '
let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
  for (const l of s.split("\n").filter(Boolean)) {
    const r = JSON.parse(l);
    if (r.severidade === "P0" && r.status !== "fechado") console.log(r.id, r.status);
  }
});'
```

### 11.3 Como reproduzir M-21, M-22 e M-23 (nada nas portas do dono; tudo removido por nome)

```bash
timeout 60 docker run -d --name pltrc2-pg -e POSTGRES_PASSWORD=pltrc2-local-not-a-secret -e POSTGRES_DB=pltrc2 postgres:16
timeout 60 sh -c 'until docker exec pltrc2-pg pg_isready -U postgres -d pltrc2; do sleep 1; done'
# setup (como postgres):
#   CREATE ROLE app_rt LOGIN PASSWORD '…' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT;
#   tenants(id uuid pk, status text); bindings(id, tenant_id, instance_key, external_device_key, vehicle_id,
#     valid_from, valid_to) com CREATE UNIQUE INDEX … ON bindings (instance_key, external_device_key) WHERE valid_to IS NULL;
#   receipts(…, payload_digest, conflict_count) com unique (instance_key, message_kind, external_event_key);
#   quarantine(…, delivery_count, resolved_at) com unique (instance_key, external_device_key, reason) WHERE resolved_at IS NULL;
#   ENABLE + FORCE RLS e política USING/WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
#   em bindings e receipts; GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_rt.
# U1–U3: como app_rt, BEGIN; SELECT set_config('app.current_tenant_id', '<A ou B>', true); INSERT/SELECT; COMMIT.
# U4: sessão 1 = BEGIN; GUC A; SELECT id FROM bindings WHERE … AND valid_to IS NULL FOR SHARE; SELECT pg_sleep(3); COMMIT;
#     sessão 2, 1 s depois = BEGIN; GUC A; UPDATE bindings SET valid_to = now() WHERE …; mede clock_timestamp(); COMMIT.
#     Repetir com FOR KEY SHARE e sem trava. U4d: ordem inversa (UPDATE + pg_sleep(3) primeiro, FOR SHARE depois).
# U5: 20 processos psql em paralelo com o INSERT … ON CONFLICT … DO UPDATE de §4.5.
# M-22: pgbench -n -h 127.0.0.1 -U app_rt -c 1 -t <n> -f <script> pltrc2, com MSYS_NO_PATHCONV=1 só nesse comando;
#     script quente = BEGIN; GUC; SELECT … FOR SHARE; INSERT recibo ON CONFLICT DO NOTHING RETURNING id; ROLLBACK;
#     script de varredura = BEGIN READ ONLY; (GUC + SELECT do vínculo) × T; COMMIT.
timeout 60 docker rm -f pltrc2-pg
```

M-23 usa dois arquivos de rascunho: `base.yml` com `api` (`ports: ["${API_PORT:-3000}:3000"]`) e `web` (`8080:8080`);
`over.yml` com `api` em `default` + `traccar_private` (`ipv4_address: 172.31.250.10`), `web` com
`ports: !override ["127.0.0.1:${TRC_WEB_PORT:-18080}:8080"]` e a rede `traccar_private` `internal: true` com sub-rede
`172.31.250.0/24`; renderizados com `API_PORT=127.0.0.1:3102 docker compose -p pltrc2cfg -f base.yml -f over.yml config
--format json`.

### 11.4 Traccar oficial — versão de referência 6.16.0

- T-1 — [release oficial v6.16.0](https://github.com/traccar/traccar/releases/tag/v6.16.0).
- T-2 — [Configuration File Reference](https://www.traccar.org/configuration-file/): `forward.*` e `event.forward.*`.
- T-3 — [Forwarding Overview](https://www.traccar.org/forward/): posição processada, evento e forwarding bruto são
  fluxos diferentes; o plano usa os dois primeiros e proíbe o bruto.
- T-4 — [OsmAnd protocol](https://www.traccar.org/osmand/): HTTP, identificador obrigatório, `lat/lon/timestamp`.
- T-5 — [Traccar API](https://www.traccar.org/traccar-api/): REST server-to-server para cadastro e reconciliação;
  o WebSocket da plataforma não é usado.
- S-1 — código-fonte da tag, baixado por
  `timeout 30 curl -sSfL https://raw.githubusercontent.com/traccar/traccar/v6.16.0/<caminho>` para
  `src/main/java/org/traccar/ProcessingHandler.java`, `forward/PositionForwarderJson.java`, `forward/PositionData.java`,
  `forward/EventForwarderJson.java`, `handler/PositionForwardingHandler.java`, `config/Config.java`,
  `config/Keys.java`, `model/Position.java`, `model/Device.java`, `ServerManager.java` e `setup/traccar.xml` (default
  H2). As linhas citadas na v2 são desses arquivos.

Se a rede faltar na execução, a confirmação vem da imagem fixada por digest e da fixture capturada; sem ela, o contract
test fica vermelho e o bloco não avança.

## Para o registro

Texto pronto para o orquestrador copiar para `agent-orchestration/controle/pendencias.md`, no formato das entradas
de lá. Esta rodada commita só o plano. Nenhuma linha abaixo é decisão do dono: as seis primeiras são perguntas
abertas, à espera da resposta dele. A resposta, quando vier, vai para `decisoes.md` com a frase literal do dono.

```markdown
## P-TRC-FORMA-QUATRO-OU-SETE (2026-10-10) — conflito §A2 entre a forma do Traccar na decisão do dono e a do plano — ALTA

- **status:** ABERTA · **escopo:** `dentro-do-plano` — `D-TRACCAR-HTTP-PRIVADO-AWS` (`decisoes.md:2275-2279`: quatro
  dias por assunto, "cada dia é bloco", Dia 1 = contrato e infraestrutura, sem ingestão) × `PLANO_TRACCAR.md` v2.1 (§7.2,
  "Decisões do dono", decisão 1) · **dono:** o dono do produto.
- Três formas na mesa: A (a literal do dono), B (Q1–Q4 do planejador, Q1 = B-TRC-01 inteiro) e C (G-TRC-PD + sete
  blocos, proposta). O B-TRC-01 só é o mesmo em B e C. Achados A2-09 da crítica r2 e B-07 da r1. A
  `D-ORDEM-NOITE-2026-10-10` autoriza "os blocos de ingestão" sem fixar número.
- **bloqueia:** o início do B-TRC-01 (na forma A ele muda) e tudo depois dele.
- **teste de encerramento:** `decisoes.md` registra a escolha (A, B ou C) com a frase do dono, e o plano é ajustado
  se a escolha for A.

## P-TRC-AWS-FLY-PRAZO (2026-10-10) — escolha AWS × Fly, que o registro pôs antes do Dia 1 do Traccar — ALTA

- **status:** ABERTA · **escopo:** `dentro-do-plano` — `decisoes.md:2306` ("por escrito, antes do Dia 1 do Traccar") ×
  plano v2, que levava a escolha para antes do B-TRC-06 sem registrar (achado A2-14) · **dono:** o dono do produto.
- Opções: (a) ERP inteiro na AWS; (b) só o Traccar na AWS, ERP no Fly com ponte privada; (c) adiar a escolha para antes
  do B-TRC-06, com aceite escrito. Recomendação do planejador: (c), com (a) como direção.
- **bloqueia:** o B-TRC-01, até a escolha ou o aceite escrito do adiamento; o B-TRC-06, até a escolha.
- **teste de encerramento:** `decisoes.md` registra a escolha, ou o aceite do adiamento com o novo prazo.

## P-TRC-CONVIVENCIA-APP (2026-10-10) — app e Traccar disputam o mesmo "último ponto" do técnico — ALTA

- **status:** ABERTA · **escopo:** `dentro-do-plano` — `decisoes.md:2295-2296` (convivência em aberto, o dono pediu o
  custo dos dois caminhos) × B-TRC-01, que grava a posição da viatura em `field_operator_locations` do técnico, com o
  latest escolhendo por `recorded_at` sem olhar a fonte (achado A2-13) · **dono:** o dono do produto.
- Opções e custo estimado: (a) vence o mais recente, nenhum custo agora; (b) preferência por fonte, 1–2 dias no
  B-TRC-04; (c) dois pinos, bloco próprio de 4–7 dias. Recomendação: (a) só como modo provisório de dev no B-TRC-01;
  escolher (b) ou (c) antes do B-TRC-04.
- **bloqueia:** o B-TRC-01, até o aceite do modo provisório; o B-TRC-04 e a produção, até a escolha.
- **teste de encerramento:** `decisoes.md` registra o aceite do provisório e, antes do B-TRC-04, a escolha.

## P-TRC-ATRIBUICAO-PRODUTO (2026-10-10) — o que a atribuição por despacho mostra e esconde no mapa — MÉDIA

- **status:** ABERTA · **escopo:** `dentro-do-plano` — regra do dono (`decisoes.md:2290-2292`) aplicada no B-TRC-01 (§4.2
  do plano): a viatura só aparece com despacho aceito pelo técnico atual; "atribuído → a caminho" sem aceite não mostra;
  reatribuído só volta com novo aceite; viatura sem técnico não aparece · **dono:** o dono do produto.
- Recomendação do planejador: manter a regra estrita no B-TRC-01; decidir antes do B-TRC-04 se o plano pago de
  localização de veículos (`decisoes.md:2293-2294`) exige ver viatura sem técnico (modelo novo, bloco próprio).
- **bloqueia:** o B-TRC-04 e a oferta comercial do rastreamento; não bloqueia o B-TRC-01.
- **teste de encerramento:** `decisoes.md` registra a regra de exibição e o destino da viatura sem técnico.
```


```markdown
## P-TRC-VINCULO-POSSE (2026-10-10) — quem vincula rastreador e como prova que é dono — ALTA

- **status:** ABERTA · **escopo:** `dentro-do-plano` (B-TRC-03) — instância única do Traccar para todas as
  organizações; o índice global garante um dono por vez, não o dono certo; o 23505 é oráculo de 1 bit; e validade
  retroativa entrega a B fix de quando o rastreador estava em A (achados A2-04 e A2-05 da crítica r2, E-02c/E-02d) ·
  **dono:** o dono do produto (regra de posse) e o `agente-dba-guardiao` (a construção temporal).
- Recomendação do planejador: só a plataforma vincula, a pedido da organização, para começar; depois, lista de
  rastreadores liberados por organização. Vínculo vale do relógio do servidor em diante, sem retroativo; `EXCLUDE` com
  faixas de validade (`btree_gist`) ou gatilho de `valid_from`.
- **bloqueia:** o início do B-TRC-03; não bloqueia o B-TRC-01, onde só o teste e o demo vinculam.
- **teste de encerramento:** `decisoes.md` registra quem vincula; o B-TRC-03 prova por teste que B não vincula
  rastreador fora da sua lista (ou sem a plataforma) e que nenhum vínculo cobre fix anterior à desativação do anterior.

## P-TRC-LGPD (2026-10-10) — posição da viatura como dado pessoal do técnico, guarda e acesso — ALTA

- **status:** ABERTA · **escopo:** `dentro-do-plano` — `FieldOperatorLocation.operator_user_id` (NOT NULL,
  `schema.prisma:1024`) recebe a posição da viatura sem o aviso e o consentimento do app; recibos (um por posição) e
  quarentena (número do rastreador) sem guarda definida; `device.name/phone/contact` chegam e são descartados (nota
  N2-05 e N2-08 da r2) · **dono:** o dono do produto.
- Recomendação do planejador: base legal com aviso ao técnico; guarda curta (ex.: posição e recibo 90 dias,
  quarentena resolvida 30 dias); acesso de despacho e gestão com trilha de consulta.
- **bloqueia:** a produção (B-TRC-07) e o staging, se usar dado real; não bloqueia o B-TRC-01 (dado sintético).
- **teste de encerramento:** `decisoes.md` registra base legal, prazos e quem vê; o bloco seguinte implementa o expurgo
  com teste.

## P-TRC-TETO-ORGANIZACOES (2026-10-10) — teto de 500 organizações ativas na descoberta do Traccar — MÉDIA

- **status:** ABERTA · **escopo:** `dentro-do-plano` — o teto conta todas as organizações ativas, não só as com
  rastreador; na 501ª, todo dispositivo sem dica vai à quarentena (achado A2-06 da r2) · **dono:** `B-TRC-06` (alarme e
  medição com o número real) e a decisão do recurso pago (contar só organizações com o módulo).
- O B-TRC-01 entrega a validade deslizante da dica e o aviso de 80 % (log e métrica).
- **bloqueia:** não, abaixo de 400 organizações ativas.
- **teste de encerramento:** alarme do B-TRC-06 dispara a 80 %, e o teto passa a contar só organizações com o módulo,
  ou é re-medido e ajustado.

## P-FIELD-DISPATCH-REASSIGN-NAO-ATOMICO (2026-10-10) — reatribuição e evento em transações separadas — MÉDIA

- **status:** ABERTA · **escopo:** `pre-existente` — `field-dispatch-prisma.repository.ts:170,174` e
  `field-dispatch.service.ts:550-577`: `reassign` grava o operador novo e o status e, em outra transação, o evento
  `field_dispatch_reassigned`; o `accepted_at` do operador antigo fica; `reassigned → on_route` dispensa novo aceite
  (`field-dispatch.validators.ts:7-17`). Medido pela crítica r2 (E-3e) · **dono:** a nomear (próximo bloco que tocar
  `field-dispatch.service.ts`).
- O Traccar deixa de depender disso: o B-TRC-01 usa `operator_assigned_at`, gravado por gatilho na mesma instrução da
  troca. Fica o defeito de auditoria: despacho reatribuído pode ficar sem o evento.
- **bloqueia:** não.
- **teste de encerramento:** troca de operador e evento na mesma transação, com teste de falha injetada no evento.

## P-PORTAL-LISTEN-SEM-TRATADOR (2026-10-10) — falha do listen do portal derruba a API do ERP — MÉDIA

- **status:** ABERTA · **escopo:** `pre-existente` — `src/server.ts:39-44`: `portalApp.listen(env.PORTAL_PORT)` sem host
  (todas as interfaces) e sem tratador de `error`; um `EADDRINUSE` na 3100 sai como `Unhandled 'error' event` e leva o
  processo, com a API pública (medido para a ingestão pela r2, E-01d; mesmo mecanismo) · **dono:** a nomear (bloco do
  portal).
- **bloqueia:** não.
- **teste de encerramento:** porta do portal ocupada não derruba a API; host do portal explícito.
```
