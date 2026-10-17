# Crítica adversarial r1 — Plano do Traccar

## Identidade, objeto e refs

- Papel: `critico-adversarial`
- Identidade: `critico-traccar-r1`
- Modelo executado: GPT-5.6 Sol, substituição declarada conforme §C7.6-bis; Astra/Fable reservado pelo dono a bloco de dinheiro.
- Objeto: `docs/revisoes/TRACCAR/PLANO_TRACCAR.md`
- Head do plano: `612d6650`
- Ref de código medida: `origin/main` iniciou em `8a79532f` e avançou para `a2937bad` durante o
  fechamento. O avanço foi rechecado conforme §A7.
- Regra de separação: esta identidade não escreveu o plano, não propõe correções e não desenvolverá os achados.

## Resumo executivo

O plano **volta ao planejamento**. A direção de produto está correta — reutiliza localização,
despacho, mapa e telemetria existentes, não aceita `tenant_id` externo e mantém o Traccar fora do
domínio público —, mas o desenho ainda não sustenta quatro propriedades que ele próprio declara:

1. o endpoint interno divide o único listener da API com as rotas públicas e não há mecanismo que
   torne somente esse path alcançável pelo Traccar;
2. a unicidade do vínculo é apenas por tenant e o advisory lock é voluntário, logo há uma janela
   executável de associação cross-tenant após a varredura;
3. a idempotência não define o resultado de “mesma chave, digest diferente” nem uma chave/semântica
   concorrente para a quarentena;
4. fatos e gates usados para autorizar o começo não reproduzem: o porteiro pós-merge do #405 não foi
   localizado e a mudança de quatro blocos/quatro dias para sete blocos/25–45 dias não registra o
   conflito com a decisão do dono.

Há **7 achados `bloqueia`**, **7 `ajuste`** e **4 `nota`**. Todos os bloqueantes pertencem ao plano;
nenhum é atribuído ao código preexistente.

## 1. Resolução de organização e RLS

### Medição RLS/enumeração

- `origin/main:src/database/rls.ts:41-68` confirma que `forEachTenantRls` recebe `tenantIds` já resolvidos, abre uma transação, troca `app.current_tenant_id` por volta e executa o callback. O canário existe separadamente em `rls.ts:71-90`; o helper não o aplica sozinho.
- `origin/main:src/modules/cloud-usage/cloud-usage-prisma.repository.ts:166-225` e `src/modules/cloud-charges/cloud-charge-prisma.repository.ts:216-327` confirmam o padrão global já existente: consultar `tenants` sem RLS e então varrer tabelas FORCE por organização. `Tenant` não possui `tenant_id` (`prisma/schema.prisma:9-18`) e o próprio código registra que `tenants` não tem RLS (`cloud-usage-prisma.repository.ts:220-224`). Jobs também enumeram organizações ativas diretamente, por exemplo `src/modules/impound/impound.reconcile.service.ts:44-55`.
- `origin/main:scripts/db-runtime-role.sh:67-79` concede ao `erp_runtime` DML nas tabelas públicas, enquanto `src/database/runtime-role.ts:1-50` veta superuser/BYPASSRLS/posse/view sobre FORCE. Logo a enumeração de `tenants` funciona sob o papel runtime do B-SAN3-05; não exige bypass.

**Resposta às perguntas.** O padrão é executável sob FORCE RLS e o papel runtime do B-SAN3-05; a
enumeração de organizações é superfície global **preexistente**, não uma leitura cross-tenant nova.
Isso não torna o algoritmo seguro nem barato:

- a transação faz pelo menos uma troca de GUC e uma consulta indexada por organização. A 20 posições/s
  e 100 organizações são, por inferência, ao menos 4.000 statements/s em laço serial, antes de
  receipt, despacho e localização. O plano não fixa cardinalidade suportada nem orçamento de latência
  e só mede isso no B-TRC-06, depois de cinco blocos (`PLANO_TRACCAR.md:162-164,775-776`);
- os índices parciais garantem unicidade apenas **dentro** do tenant
  (`PLANO_TRACCAR.md:84-88`). Um writer por SQL, seed ou caminho futuro que não adquira o mesmo lock
  pode inserir o vínculo no tenant B depois de B ter sido varrido; a ingestão repõe o GUC de A e grava
  em A. O lock não é constraint e a varredura sob `READ COMMITTED` não fecha essa janela;
- o teste “dois bindings em tenants distintos falham fechado” prova o estado já ambíguo, e “troca
  concorrente sob advisory lock” prova apenas writers cooperantes
  (`PLANO_TRACCAR.md:639-644`). Nenhuma das sete mutações viola deliberadamente o lock ou cria o
  segundo vínculo depois de sua volta (`PLANO_TRACCAR.md:699-705`). Portanto, “ambíguo falha fechado”
  é provável no caso estático, mas não está provado na corrida que pode gravar no tenant errado.

## 2. Segredo do forward

### Medição

- O Traccar 6.16.0 suporta configuração por ambiente somente quando `CONFIG_USE_ENVIRONMENT_VARIABLES=true`; `forward.header` vira `FORWARD_HEADER` (`Config.java:39-45,56-80,127-129` na tag oficial v6.16.0). O forward JSON lê `FORWARD_URL` e `FORWARD_HEADER`, aplica o header separadamente da URL e, em HTTP não-2xx, cria erro contendo apenas o status (`PositionForwarderJson.java:39-44,53-77`). O retry registra o `Throwable` e a contagem pendente (`PositionForwardingHandler.java:73-95`), não o header.
- No ERP atual, `pinoHttp` serializa a requisição e só redige `req.headers.authorization` (`origin/main:src/app.ts:101-113`). O plano manda acrescentar a redação do header Traccar e testar logs de sucesso/erro, mas não fixa o caminho de redaction com chave hifenizada nem o comportamento em falhas que ocorram antes/depois do middleware.
- A comparação proposta transforma apresentado e candidatos em SHA-256 de tamanho fixo e usa `crypto.timingSafeEqual` (`PLANO_TRACCAR.md:151-157`), o que atende à comparação de tamanho constante no desenho. A URL não contém o segredo.

**Resposta às perguntas.** O segredo mora em env/Secrets Manager e chega ao processo Traccar como
`FORWARD_HEADER`; no ERP, current/previous são digeridos e comparados com `timingSafeEqual`. Ele não
está na URL, no body nem em payload público. No código oficial 6.16.0, erro HTTP normal contém apenas
status e o retry registra o `Throwable`, não o header. Entretanto:

- o plano não contém `CONFIG_USE_ENVIRONMENT_VARIABLES` nem `config.useEnvironmentVariables`; sem
  essa ativação documentada oficialmente, `FORWARD_HEADER` não sobrescreve `forward.header`;
- no ERP atual, o logger só redige `authorization`. O plano promete teste real de logs, mas não
  determina a ordem logger/router após mover a rota antes do parser nem prova a chave hifenizada em
  erros de parser, autenticação e timeout (`PLANO_TRACCAR.md:143-147,596-597`).

Fontes oficiais medidas: [configuração do Traccar](https://www.traccar.org/configuration-file/),
[`Config.java` v6.16.0](https://github.com/traccar/traccar/blob/v6.16.0/src/main/java/org/traccar/config/Config.java),
[`PositionForwarderJson.java` v6.16.0](https://github.com/traccar/traccar/blob/v6.16.0/src/main/java/org/traccar/forward/PositionForwarderJson.java)
e [`PositionForwardingHandler.java` v6.16.0](https://github.com/traccar/traccar/blob/v6.16.0/src/main/java/org/traccar/forward/PositionForwardingHandler.java).

## 3. Quarentena e idempotência

Há uma tabela nova, `traccar_quarantine_items`, global e mínima
(`PLANO_TRACCAR.md:94-100`). A necessidade está demonstrada: antes de resolver organização não existe
tenant válido para uma tabela FORCE RLS; ela não guarda coordenada nem payload e, portanto, **não é uma
segunda tabela de localização**. As outras tabelas são vínculo e receipt, não duplicações do domínio.

A chave de posição é `(instance, device, position.id)` ou hash da tupla canônica; a unique persistida
é `(tenant_id, instance_key, message_kind, external_event_key)`
(`PLANO_TRACCAR.md:89-92,184-189`). Dois defeitos ficam abertos:

- no conflito, o plano lê o receipt e retorna `204` sem comparar o `payloadDigest`. A mesma chave com
  corpo diferente é tratada como reenvio idêntico, embora o digest exista justamente para distinguir
  o conteúdo;
- a quarentena lista chave, digest, contador e tempos, mas não declara unique, chave lógica nem
  semântica de conflito. Sob duas entregas concorrentes, o plano não determina se nascem duas linhas,
  se o contador perde incremento ou qual resultado é durável. O teste promete apenas uma entrega não
  mapeada (`PLANO_TRACCAR.md:639-640`) e não existe mutação de concorrência da quarentena.

Além disso, “conflito na unique lê o receipt” não identifica uma operação transacional observável: em
PostgreSQL, um INSERT que viola unique aborta a transação corrente; o texto não define qual comportamento
o teste exigirá do repositório. Assim, o reenvio seguro sob concorrência **não está especificado**.

## 4. Executabilidade do B-TRC-01

### Medição do ambiente e dos encerramentos

- Nesta máquina: Docker Server `29.6.1`, Compose `v5.2.0`, Node `v20.19.5` e npm `11.7.0` respondem. As portas 5432/6379 estão ocupadas e os containers `erp-postgres`/`erp-redis` estão saudáveis; nenhum deles foi alterado.
- `origin/main:docker-compose.yml:1-42` só define Postgres/Redis e publica 5432/6379. `origin/main:Dockerfile:23-46` expõe um único listener da API em 3000. `origin/main:docker-compose.prod.yml:51-112` publica esse mesmo listener e serve o web separadamente.
- Os cinco testes novos não existem no head do plano. Os cinco comandos foram executados isoladamente,
  com teto externo de 20 s, e todos terminaram com exit 1 por arquivo ausente. O vermelho atual prova
  somente ausência do alvo, não cada propriedade. O runner aceita alvo individual
  (`origin/main:scripts/run-backend-tests.mjs:48-56`).
- A bateria da §8.7 afirma timeout para todos os comandos, mas somente o smoke recebe `--timeout-ms`; os comandos `npm` literais não trazem wrapper/teto.
- Este worktree não tem `node_modules` nem `frontend/node_modules`; os baselines existentes não
  executaram por ausência de `tsx`. A ordem e a bateria do B-TRC-01 não incluem a preparação de
  dependências, embora a regra do repo proíba compartilhar `node_modules` entre worktrees.
- Há 28 propriedades mínimas (`PLANO_TRACCAR.md:610-653`) e apenas sete mutações
  (`PLANO_TRACCAR.md:694-705`). Rotação expirada, header duplicado, não vazamento, boot sem segredo,
  64 KiB, tupla fallback, rollback atômico, retry, corrida sem lock, quarentena concorrente, imagem
  demo/digest e timeout não têm mutação que prove o vermelho.

**Resposta às perguntas.** Docker Desktop permite um stack `crtrc-*` privado, sem usar 5432/6379 e
sem tocar `erp-*`. Isso não torna a vertical reproduzível como escrita: o único listener da API serve
rota pública e rota interna. Se ele for publicado para o navegador abrir o mapa, o path de ingestão
também é alcançável na rede; se não for publicado, o navegador não alcança o mapa. Security Group
restringe porta/origem, não path Express. O plano deixa a decisão para um spike dentro do bloco
(`PLANO_TRACCAR.md:255-259`), embora o critério exija simultaneamente rede privada e mapa.

Logo um dev consegue começar sem pergunta, mas não consegue encerrar **todos** os critérios sem tomar
decisões ausentes. Os cinco testes ficam vermelhos hoje, porém não pelas propriedades; e nem cada
critério tem mutação de controle.

## 5. Escopo, ordem e governança dos sete blocos

### Fatia e dependências

- A fatia B-TRC-01 é vertical no domínio: simulador → Traccar → ingestão → receipt/localização → SSE
  → mapa (`PLANO_TRACCAR.md:478-494`). Ela reaproveita os módulos existentes e entrega algo visível.
- #388, #389 e #393 continuam abertos/estacionados; #405 foi mergeado em `a9fbe283`; #400, #401 e
  #409 também estão mergeados. Isso reproduz `D-388-389-ESTACIONADOS` e
  `D-TRACCAR-PLANO-APOS-405` (`decisoes.md:3006-3010`).
- O Ato 2 não bloqueia B-TRC-01–05 e bloqueia produção, como o plano registra
  (`PLANO_TRACCAR.md:739-745`; `pendencias.md:10255-10263`). Staging/CD e os resíduos de
  `SECURITY DEFINER`/table rule permanecem gates produtivos (`pendencias.md:10107-10118,10359-10369`).
- O plano, porém, chama de “cumprido” o porteiro do #405
  (`PLANO_TRACCAR.md:288,347`). Nenhum artefato de porteiro do B-SAN3-05 existe no tree do head, e a
  busca nos comentários/reviews do PR #405 não retornou `porteiro` nem `LIBERADO`.
- “quatro críticos de J-6R” não identifica IDs ou títulos (`PLANO_TRACCAR.md:743-745`); a condição
  de produção não é reexecutável por um dev ou porteiro.

### Escopo e quórum

- A decisão do dono determina quatro dias/quatro blocos (`decisoes.md:2275-2279`). O plano muda para
  sete blocos e 25–45 dias (`PLANO_TRACCAR.md:11,788-797`) sem registrar conflito conforme §A2.
- A decisão também exige 5/5 para a PD e a decisão de implantação e 3/3 para blocos de código
  (`decisoes.md:2281-2285`). B-TRC-01–05 usam segurança 3/3, corretamente. B-TRC-07 usa 5/5,
  corretamente. B-TRC-06 materializa ECS/RDS/Secrets/staging, mas marca 5/5 apenas “se” provisionar
  serviço pago (`PLANO_TRACCAR.md:293,437-456`); pelo objetivo do próprio bloco, essa condição já é
  verdadeira. O quadro também não registra o gate 5/5 da PD antes do primeiro código.
- O B-TRC-04 pode ser reclassificado somente após diff medido, coerente com
  `D-GOV-PROPORCIONAL`; ingestão, tenant, segredo e localização permanecem segurança 3/3.

## 6. Reexecução das afirmações M-n

| Fato | Resultado reexecutado na ref | Evidência |
|---|---|---|
| M-0 | reproduz | head `612d6650`, branch correta; `origin/main` medido em `8a79532f` e rechecado em `a2937bad` |
| M-2 | reproduz com conflito omitido | decisão privada/AWS e 4 blocos em `decisoes.md:2237-2285` |
| M-3 | parcial | pendências existem, mas “quatro críticos J-6R” não são nomeados |
| M-4 | reproduz | busca contextual sem vínculo Traccar↔Vehicle em `prisma/**`, `src/**`, `frontend/src/**` |
| M-5 | reproduz | modelos de localização, veículo, telemetria, despacho e identidade de terceiro em `prisma/schema.prisma` |
| M-6 | reproduz | validação, sanitização e evento em `src/modules/field-location/field-location.service.ts:21-53,84-144` |
| M-7 | reproduz | latest por `recorded_at`, depois `received_at`, em `field-location-prisma.repository.ts:41-65` |
| M-8 | parcial | runtime FORCE funciona; `forEachTenantRls` recebe IDs e não aplica sozinho o canário (`rls.ts:41-90`) |
| M-9 | reproduz | parser global 2 MB e pino redigindo só authorization em `src/app.ts:101-113` |
| M-10 | reproduz | REST+SSE e fallback 30 s em `frontend/src/modules/operations/map/useOperationsMap.ts:9,90-94` |
| M-11 | reproduz | broker tenant-scoped remove coordenadas antes do SSE em `field-ops-realtime.broker.ts` |
| M-12 | reproduz | telemetria mantém vazio/fallback honesto em `frontend/src/modules/telemetry/telemetry.service.ts:16-99` |
| M-13 | reproduz | compose local só Postgres/Redis; API tem um listener em `Dockerfile:23-46` |
| M-14 | reproduz | Fly continua provedor atual em `docs/deployment.md:11-63,296-299` |
| M-15 | reproduz | permissões/contratos de veículo, localização e SSE em `RBAC_MATRIX.md:99-127` e `API_CONTRACTS.md:353-378,538-546` |
| M-16 | **não reproduz integralmente** | contagem executada dá 2+4+14=20 nos três arquivos nomeados; a §8.6 não lista os “dez arquivos” nem permite recompor 83 |
| M-17 | reproduz | estados reais: #400/#405/#409 mergeados; #405 teve quatro ciclos registrados |
| M-18 | reproduz | identidade de terceiro é outro domínio; mobile deriva tenant/usuário do ator em `mobile-telemetry-sync.ts` |

A amostra cobre 15 afirmações M-n além das refs. Os fatos que não reproduzem integralmente viraram
achados; não foram tratados como detalhe editorial.

## Achados classificados

### `bloqueia`

#### B-01 — a rota “privada” está no listener público

- **Classificação:** `bloqueia`
- **Escopo:** `dentro-do-plano` — nasce em `PLANO_TRACCAR.md:143-147,255-259,498,561`; o listener único
  preexistente apenas torna o defeito demonstrável (`origin/main:Dockerfile:23-46`).
- **Motivo:** a decisão exige restrição de rede **e** autenticação
  (`decisoes.md:2237-2244,2255-2261`). O plano só separa middleware/path. Publicar a API para o mapa
  torna a rota alcançável pela mesma origem; esconder o listener impede a vertical no navegador.
- **Como provar:** subir a topologia descrita e, da rede/host que acessa `/field-locations/latest`,
  abrir conexão ao mesmo host/porta/path interno. O resultado contradiz “só alcançável pelo Traccar”.

#### B-02 — vínculo cross-tenant pode nascer depois da varredura

- **Classificação:** `bloqueia`
- **Escopo:** `dentro-do-plano` — a garantia é criada por `PLANO_TRACCAR.md:84-88,168-179,232`.
- **Motivo:** unicidade é tenant-local e advisory lock não obriga todo writer. Sob `READ COMMITTED`, um
  vínculo em B pode ser inserido depois da volta de B; a ingestão termina com A e grava no tenant errado.
- **Como provar:** pausar a ingestão após consultar B, inserir o mesmo `(instance,device)` em B por
  conexão que não toma o advisory lock e liberar a ingestão; verificar localização/receipt em A e dois
  bindings ativos ao final.

#### B-03 — varredura O(organizações) é aceita antes de ser dimensionada

- **Classificação:** `bloqueia`
- **Escopo:** `dentro-do-plano` — algoritmo e postergação estão em
  `PLANO_TRACCAR.md:162-164,168-173,775-776`.
- **Motivo:** cada posição mantém transação e laço serial por todos os tenants; 20 req/s × 100 tenants
  implica ao menos 4.000 statements/s antes das escritas. A capacidade só seria medida no sexto bloco,
  depois de cinco blocos dependerem dessa fundação.
- **Como provar:** instrumentar quantidade de statements/latência com cardinalidades crescentes e
  confrontar o timeout de 3 s; o plano hoje não contém limiar de aprovação.

#### B-04 — mesma chave idempotente com outro conteúdo recebe sucesso

- **Classificação:** `bloqueia`
- **Escopo:** `dentro-do-plano` — `PLANO_TRACCAR.md:89-92,184-189,593-595`.
- **Motivo:** o receipt guarda digest, mas conflito retorna `204` sem exigir igualdade. Colisão,
  corrupção ou reuso de ID com coordenada diferente passa como duplicata válida.
- **Como provar:** enviar dois payloads válidos com mesma chave externa e digests distintos; o contrato
  descrito manda ler o primeiro receipt e responder `204` ao segundo.

#### B-05 — quarentena não tem identidade concorrente especificada

- **Classificação:** `bloqueia`
- **Escopo:** `dentro-do-plano` — a nova tabela nasce em `PLANO_TRACCAR.md:94-100`.
- **Motivo:** há chave/digest, contador e primeira/última ocorrência, mas nenhuma unique ou semântica de
  conflito. O comportamento durável sob reenvio concorrente é indeterminado.
- **Como provar:** entregar simultaneamente a mesma posição de dispositivo não mapeado e observar que
  mais de um estado final é compatível com o texto; os testes/mutações não fixam a propriedade.

#### B-06 — o gate que autoriza o início é um fato não reproduzido

- **Classificação:** `bloqueia`
- **Escopo:** `dentro-do-plano` — o plano afirma “#405/porteiro: cumprido” em
  `PLANO_TRACCAR.md:288,347`.
- **Motivo:** #405 foi mergeado, mas a ref julgada não contém parecer pós-merge do B-SAN3-05 e os
  comentários/reviews do PR não contêm `porteiro`/`LIBERADO`. §C7 torna esse parecer gate do próximo start.
- **Como provar:** `git ls-tree -r 612d6650` filtrado pelo porteiro B-SAN3-05 e consulta de
  comments/reviews do PR #405; ambos retornaram vazio.

#### B-07 — sete blocos substituem decisão de quatro sem registrar conflito

- **Classificação:** `bloqueia`
- **Escopo:** `dentro-do-plano` — divergência entre `decisoes.md:2275-2279` e
  `PLANO_TRACCAR.md:11,788-797`.
- **Motivo:** a fonte superior diz quatro dias e “cada dia é bloco”; o plano define sete blocos e
  25–45 dias. §A2 proíbe consolidar a mudança silenciosamente.
- **Como provar:** comparar as linhas citadas; não há registro de resolução/supersessão dessa parte da
  decisão no plano ou em `decisoes.md`.

### `ajuste`

#### A-01 — ativação de env do Traccar ausente

- **Classificação:** `ajuste`
- **Escopo:** `dentro-do-plano` — o plano promete header por env em
  `PLANO_TRACCAR.md:151-157,562-564`, mas não contém a chave de ativação.
- **Motivo:** no 6.16.0, overrides `FORWARD_HEADER` dependem de
  `CONFIG_USE_ENVIRONMENT_VARIABLES=true`; sem isso, o forward pode executar sem o segredo esperado.
- **Como provar:** iniciar a imagem/config descrita apenas com `FORWARD_HEADER` e observar a configuração
  efetiva/requisição recebida.

#### A-02 — prova de não vazamento no ERP está incompleta no texto

- **Classificação:** `ajuste`
- **Escopo:** `dentro-do-plano` — a mudança de ordem nasce em `PLANO_TRACCAR.md:143-147,596-597`.
- **Motivo:** a suíte promete logs reais, mas o plano não fixa qual middleware observa a rota antes do
  parser nem a redação da chave hifenizada em todos os erros. O estado atual redige só `authorization`.
- **Como provar:** capturar logger real em sucesso, 401, 413, JSON inválido e timeout e procurar pelo valor
  sentinela do header e pelo body.

#### A-03 — 28 critérios, somente sete mutations

- **Classificação:** `ajuste`
- **Escopo:** `dentro-do-plano` — comparação de `PLANO_TRACCAR.md:610-653` com `:694-705`.
- **Motivo:** vários encerramentos podem permanecer verdes após regressão, sem a contraprova exigida.
- **Como provar:** aplicar regressões nos critérios não representados e executar a bateria indicada; o
  plano não declara qual teste deve ficar vermelho.

#### A-04 — a bateria diz ter timeout, mas não o expressa

- **Classificação:** `ajuste`
- **Escopo:** `dentro-do-plano`; a limitação do runner é preexistente e registrada em
  `pendencias.md:10079-10084`, mas a afirmação falsa está em `PLANO_TRACCAR.md:664-686`.
- **Motivo:** somente o demo recebe teto literal; `npm run check/lint/test/build` não recebe wrapper ou
  timeout. “Todos os comandos têm timeout” não é executável a partir do documento.
- **Como provar:** executar um teste que não encerra; o comando listado não o mata pelo plano.

#### A-05 — worktree limpo não executa a bateria exata

- **Classificação:** `ajuste`
- **Escopo:** `dentro-do-plano` — a ordem/bateria está em `PLANO_TRACCAR.md:573-606,664-688`; a ausência
  atual de dependências é condição de terreno, não defeito de produto.
- **Motivo:** não há passo de preparação e cada worktree deve ter dependências próprias. Nesta árvore,
  backend/frontend falharam antes do teste por ausência de `tsx`.
- **Como provar:** executar a bateria literal no worktree recém-criado sem `node_modules`.

#### A-06 — M-16 não sustenta os 83 casos

- **Classificação:** `ajuste`
- **Escopo:** `dentro-do-plano` — `PLANO_TRACCAR.md:655-662,842`.
- **Motivo:** a contagem 2+4+14=20 reproduz; os “dez arquivos listados na §8.6” não estão listados, logo
  83 e a meta posterior não são reexecutáveis.
- **Como provar:** ler §8.6 e executar a regex nos três únicos caminhos nomeados.

#### A-07 — quórum/gates finais não são determinísticos

- **Classificação:** `ajuste`
- **Escopo:** `dentro-do-plano` — `PLANO_TRACCAR.md:293,437-456,743-745`.
- **Motivo:** B-TRC-06 já descreve provisionar/configurar serviço pago, mas deixa 5/5 condicional; o gate
  5/5 da PD não aparece antes do primeiro código; e os “quatro críticos de J-6R” não têm IDs.
- **Como provar:** tentar formar a junta de B-TRC-06 ou conferir o gate do B-TRC-07 apenas com o quadro;
  mais de uma composição/lista atende ao texto.

### `nota`

#### N-01 — enumeração global é preexistente e roda sob o runtime

- **Classificação:** `nota`
- **Escopo:** `pre-existente` — `cloud-usage-prisma.repository.ts:166-225`,
  `cloud-charge-prisma.repository.ts:216-327`, `prisma/schema.prisma:9-18`,
  `scripts/db-runtime-role.sh:67-79` em `origin/main@8a79532f`.
- **Motivo:** não é correto reprovar o plano por “inventar” a leitura global; o problema é a garantia que
  ele constrói sobre a varredura.

#### N-02 — a quarentena nova tem necessidade de domínio comprovada

- **Classificação:** `nota`
- **Escopo:** `dentro-do-plano` — `PLANO_TRACCAR.md:94-100`.
- **Motivo:** sem tenant resolvido, uma linha tenant-scoped fabricaria contexto. A tabela mínima sem
  coordenada/payload não duplica histórico de localização.

#### N-03 — não nasce domínio “Traccar” paralelo

- **Classificação:** `nota`
- **Escopo:** `dentro-do-plano` — fluxo em `PLANO_TRACCAR.md:127-140,541-567`.
- **Motivo:** localização, despacho, SSE, mapa e telemetria existentes continuam autoridades; as tabelas
  novas são estado de integração. M-4 a M-12 reproduzem essa leitura.

#### N-04 — avanço de main não contaminou a crítica

- **Classificação:** `nota`
- **Escopo:** `pre-existente` — no início, `a9fbe283..8a79532f` continha somente `Kpis/*`; durante a
  crítica entrou `a2937bad` (`feat(web): console da plataforma sem ficção (B-SAN3-06b) (#411)`).
- **Motivo:** o avanço alterou `frontend/`, documentação/controle e scripts do B-SAN3-06b, mas não
  tocou `src/`, `prisma/`, `docs/deployment.md` nem os arquivos frontend/testes amostrados nesta
  crítica. Pela regra expressa do dono, o trabalho seguiu e o drift fica declarado.

## Veredito

**VOLTA AO PLANO.**

Bloqueiam: B-01 rota interna no listener alcançável; B-02 janela cross-tenant; B-03 custo O(tenants)
sem limite medido; B-04 colisão de chave com digest divergente; B-05 quarentena concorrente sem
identidade; B-06 porteiro #405 não reproduzido; B-07 conflito silencioso quatro×sete blocos.

Ajustes obrigatórios antes do dev: A-01 ativação env; A-02 prova de redaction; A-03 cobertura por
mutations; A-04 timeout real; A-05 preparo do worktree; A-06 baseline 83 reexecutável; A-07 quórum e
gates determinísticos.

## Evidência de encerramento

### E-00 — terreno e refs

- Comando: `git status --short --branch; git rev-parse --short=8 HEAD; git branch --show-current`.
- Saída resumida: árvore limpa, branch `docs/plano-traccar`, HEAD `612d6650`.
- Veredito parcial: objeto correto; trabalho autorizado.
- Comando inicial: `git fetch origin --prune; git rev-parse --short=8 origin/main; git diff
  --name-status a9fbe283..origin/main`.
- Saída inicial: `origin/main=8a79532f`; desde a base do plano mudaram somente quatro arquivos `Kpis/*`.
- Rechecagem final: `origin/main=a2937bad`; `git diff --name-only 8a79532f..origin/main -- src prisma
  docs/deployment.md` e a mesma comparação sobre os arquivos amostrados retornaram vazios. O commit
  novo é o B-SAN3-06b de frontend/plataforma e registros.
- Veredito: avanço permitido pela regra do dono, declarado e sem impacto na evidência desta crítica.

### E-01 — M-8 e superfície global

- Comando: `git show origin/main:src/database/rls.ts`; `git grep -n "forEachTenantRls" origin/main -- src tests`; leitura dos repositórios `cloud-usage`/`cloud-charges`, dos jobs de `impound` e do runtime role.
- Saída resumida: `forEachTenantRls(client, tenantIds, work)` não enumera organizações; `tenants` é global/sem RLS e já é enumerada no produto; `erp_runtime` recebe DML em tabelas públicas e não pode escapar das tabelas FORCE.
- Veredito: superfície global preexistente e compatível com runtime; atomicidade cross-tenant não é
  consequência do helper.

### E-02 — M-4 a M-12 (amostra de fatos do código)

- Comando: `git grep -n -i -E 'traccar|device_id|unique.?id|ignition|odometer|alarm' origin/main -- prisma src frontend/src`; `git show origin/main:<arquivo>` para schema, field-location, app, mapa, broker e telemetria.
- Saída resumida: 244 ocorrências contextuais, sem modelo de vínculo Traccar↔Vehicle; `FieldOperatorLocation`, validação/sanitização/evento, latest por `recorded_at/received_at`, REST+SSE/fallback 30 s e vazio honesto da telemetria reproduzidos.
- Veredito: M-4, M-5, M-6, M-7, M-9, M-10, M-11 e M-12 reproduzem nos pontos amostrados; M-9 também mostra que hoje o logger só redige `authorization`.

### E-03 — fonte oficial Traccar 6.16.0

- Comando: leitura da documentação oficial de configuração/forward e dos fontes oficiais tag `v6.16.0`: `Config.java`, `PositionForwarderJson.java`, `EventForwarderJson.java`, `PositionForwardingHandler.java`.
- Saída resumida: ambiente exige `CONFIG_USE_ENVIRONMENT_VARIABLES=true`; header é configuração separada da URL; erro HTTP normal contém status; retry loga o throwable.
- Veredito: segredo não precisa estar na URL nem no XML; faltam a ativação de env e a prova integral
  de redação no ERP.

### E-04 — ambiente Windows/Docker e topologia atual

- Comando: `docker version`, `docker compose version`, `node --version`, `npm --version`, leitura de portas/containers e `git show origin/main:{docker-compose.yml,Dockerfile,docker-compose.prod.yml}`.
- Saída resumida: ferramentas disponíveis; 5432/6379 pertencem aos `erp-*` saudáveis; compose dev não tem API; API atual possui um listener 3000.
- Veredito: é possível criar stack `crtrc-*` sem tocar os serviços do dono, mas o plano não fecha a separação de rede por rota no listener único.

### E-05 — vermelho atual e mutations

- Comando: cinco invocações `npm test -- tests/traccar-*.test.ts`, cada uma em processo com teto externo
  de 20 s; leitura de `PLANO_TRACCAR.md:610-708`.
- Saída resumida: todas exit 1 por arquivo inexistente; 28 propriedades e sete mutações declaradas.
- Veredito: vermelho atual não isola propriedades e não há mutation para cada critério.

### E-06 — governança e fatos externos

- Comando: `gh pr view` para #388/#389/#393/#400/#401/#405/#409; busca em comments/reviews do #405;
  `git ls-tree -r HEAD`; leitura de `decisoes.md:2237-2285,2938-3010` e pendências SAN3.
- Saída resumida: #405 mergeou em `a9fbe283`; não foi localizado porteiro pós-merge; decisão vigente
  contém quatro blocos e 5/5 para PD/implantação; plano contém sete blocos e não nomeia os quatro J-6R.
- Veredito: ordem macro Ato 2/staging está correta, mas o gate de início e a forma/quórum não estão.

### E-07 — contagem M-16 e dependências

- Comando: regex `^\s*(test|it)\s*\(` em `field-location-routes` (2), `field-ops-realtime` (4) e
  `operations-map.adapter` (14); execução de baselines no worktree.
- Saída resumida: N=20 reproduz; os dez arquivos/83 não são identificáveis; baselines não iniciam sem
  `tsx`, pois ambos os `node_modules` estão ausentes.
- Veredito: M-16 é parcial e a bateria não é autocontida para um worktree novo.
