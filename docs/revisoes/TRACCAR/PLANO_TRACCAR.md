# Plano da trilha do Traccar

> **Estado:** PRONTO PARA JUNTA DE PLANO — não autoriza código nem ambiente.
> **Ref medida:** `origin/main` em `a9fbe283`.
> **Planejador:** `planejador-traccar-01` (`planejador-mestre`).
> **Substituição declarada (§C7.6-bis):** GPT-5.6 Sol, por decisão explícita do dono nesta convocação; Fable/Astra foi reservado a bloco de dinheiro, e esta trilha não é financeira.

## 1. Resumo para o dono

1. A trilha entrega o Traccar integrado ao ERP sem criar um segundo mapa, uma segunda frota ou um “módulo Traccar”.
2. São **7 blocos**: posição no mapa; eventos veiculares; cadastro/reconciliação; telas; alarmes; staging AWS; produção.
3. O **B-TRC-01 já é vertical**: um ponto OsmAnd simulado entra no Traccar local, é encaminhado por HTTP privado e aparece no mapa operacional.
4. Essa primeira fatia já nasce com segredo fora do payload, comparação em tempo constante, vínculo dispositivo→organização e RLS sem bypass.
5. Dispositivo desconhecido fica em quarentena; dois vínculos possíveis encerram o processamento sem gravar posição em organização alguma.
6. Reenvio não duplica, posição atrasada entra no histórico sem fazer a posição “mais recente” andar para trás.
7. O ERP continua dono de veículos, despachos, mapa, notificações e permissões; o Traccar decodifica protocolos e conserva sua trilha técnica.
8. A API REST do Traccar serve apenas a cadastro, reconciliação, lacunas e saúde; não haverá polling agressivo nem WebSocket.
9. Dev funciona sem porta pública; staging e produção ficam em subnet privada AWS, sujeitos às decisões e credenciais do dono.
10. A produção **não é ligada** antes do Ato 2, dos quatro críticos de J-6R, da amarração de staging e dos dois resíduos de RLS deste threat model.

## 2. Método, fatos e hipóteses

### 2.1 Regra de leitura

Todas as afirmações sobre o repositório abaixo foram medidas no blob de `origin/main` em
`a9fbe283`, nunca na árvore da sessão. Cada marcador `M-n` remete ao comando reproduzível da
§11. As URLs `T-n` são documentação oficial do Traccar. “FATO” significa que a ref ou a fonte
oficial prova a afirmação; “HIPÓTESE” exige a prova indicada antes de virar implementação.

**FATOS de governança.** A decisão vigente manda usar forward HTTP JSON privado dentro da AWS,
alimentar domínios existentes, não confiar em `tenant_id` do payload, não expor porta pública e
não usar servidor demo em produção (`agent-orchestration/controle/decisoes.md:2208-2285`, M-2).
O plano só podia começar depois do merge do #405, condição que a convocação do dono declara
cumprida (`decisoes.md:3009-3010`, M-2). A política atual congela KPI e exige junta completa de
segurança nos blocos de ingestão (`CLAUDE.md:611-650`, M-1). A substituição deste planejador por
GPT-5.6 Sol é uma decisão expressa desta convocação e é coerente com
`D-FABLE-ASTRA-SO-DINHEIRO` (`decisoes.md:2982-2985`, M-2).

**HIPÓTESES que não autorizam produção.** A forma exata do JSON de posição/evento, as unidades
efetivas do rastreador escolhido e a estabilidade do identificador externo serão congeladas a
partir de fixtures capturadas da imagem Traccar aprovada no B-TRC-01. A versão de referência deste
plano é **Traccar 6.16.0**, release atual medido em 2026-10-10 (T-1); upgrade troca a fixture e
repete contract tests. Capacidade, frequência real de trackers, retenção e tipos de alarme ainda
não têm dado de produção; os limites iniciais são conservadores e configuráveis, e o B-TRC-06
mede antes do go-live.

### 2.2 Decisões de arquitetura deste plano

- Integração anticorrupção em `src/integrations/traccar/`; regras de negócio continuam nos módulos
  já existentes. Não nasce `src/modules/traccar`.
- O identificador de organização nunca é aceito no JSON. O backend enumera IDs de organizações
  ativas pela superfície global já existente e procura o vínculo **dentro do contexto RLS de cada
  uma**, em uma única transação, seguindo o padrão `forEachTenantRls` já usado no repo (M-8).
- A resolução segura usa advisory lock determinístico por `(instância, dispositivo)`, varre os
  vínculos tenant-scoped, exige exatamente um resultado e volta a fixar o GUC no tenant vencedor
  antes da escrita, ainda na mesma transação. Assim não nasce diretório cross-tenant, função
  `SECURITY DEFINER` ou `BYPASSRLS`. O custo O(número de organizações) é aceito no primeiro corte e
  medido no B-TRC-06; otimização futura exige nova evidência/threat model, não cache inseguro.
- A primeira visualização é a do **técnico em despacho**, porque o mapa existente é orientado a
  `operator_user_id`; a posição do veículo é atribuída ao técnico que tinha despacho válido para
  aquele veículo no `fixTime`. Zero ou mais de um técnico elegível não produz localização.
- SSE existente continua sendo o sinal de atualização; o navegador busca a nova posição pela REST
  do ERP. Não há WebSocket nem chamada do browser ao Traccar (M-10, M-11).

## 3. Mapa do que já existe

| Dado recebido | Destino de domínio | Estado medido e decisão |
|---|---|---|
| Posição (`lat/lon`, precisão, rumo, velocidade, `fixTime`) | `FieldOperatorLocation` + `FieldLocationService` | **Existe.** O modelo já guarda os campos e timestamps (`prisma/schema.prisma:1021-1042`, M-5); o serviço valida, sanitiza e publica `field_location.updated` (`src/modules/field-location/field-location.service.ts:21-53,84-125`, M-6). B-TRC-01 adiciona a entrada confiável de sistema e `source=traccar`, sem copiar o domínio. |
| Posição atual no mapa | `/field-locations/latest` + mapa operacional | **Existe.** O repositório ordena `recorded_at DESC, received_at DESC` e escolhe uma por operador (`field-location-prisma.repository.ts:41-65`, M-7). O front lê essa rota e atualiza por SSE, com polling de 30 s só como fallback (`operations-map.service.ts:37-58,223-292`; `useOperationsMap.ts:9,90-94,148`, M-10). Nenhum mapa novo. |
| Evento técnico do Traccar | `telemetry` veicular | **Falta destino compatível.** `TelemetryEvent` é explicitamente telemetria do app e exige `operator_profile_id`; seus tipos são heartbeat/conexão/recusa (`schema.prisma:2180-2215`, M-5). B-TRC-02 cria o menor modelo veicular necessário, dentro de `telemetry`, sem forçar evento de veículo no modelo do app. |
| Dispositivo | vínculo com `Vehicle` e organização | **Não existe.** `Vehicle` não tem dispositivo (`schema.prisma:1074-1103`, M-5) e a busca por `traccar|device_id|unique_id` não encontra vínculo de frota (M-4). `ThirdPartyVehicleIdentity` é identidade de veículo recolhido, não rastreador (`schema.prisma:3021-3052`, M-5). B-TRC-01 cria apenas `VehicleTrackingBinding`, tenant-scoped; o tenant é descoberto por varredura RLS fail-closed. |
| Técnico que aparece no mapa | `WorkOrder.vehicle_id` → `FieldDispatch.operator_user_id` | **Existe a cadeia.** A OS liga o veículo (`schema.prisma:2340-2347,2387-2391`) e o despacho liga a OS ao usuário (`2471-2503`, M-5). A resolução é temporal no `fixTime`, não “quem está agora”. |
| Ignição | evento veicular normalizado | **Falta.** Não há campo de ignição em `Vehicle`, `FieldOperatorLocation` ou `TelemetryEvent` (M-4/M-5). B-TRC-02 adiciona atributo allowlisted no novo evento veicular; não altera cadastro do veículo. |
| Odômetro | amostra veicular; agregação de km | **Falta telemetria contínua.** A OS só guarda `mileage_start/end` informado pelo app/base (`schema.prisma:2369-2376`, M-5). B-TRC-02 conserva amostra de odômetro; B-TRC-04 a usa nas telas. Nunca sobrescreve km de OS em silêncio. |
| Alarme | evento veicular; `notifications` se houver regra | **Parcial.** Existe módulo de notificações, mas não contrato Traccar (M-4). B-TRC-05 transforma somente tipos aprovados em notificação existente; atributo desconhecido permanece evento técnico, sem inventar alerta. |
| Estado online/offline do dispositivo | visão “Dispositivos” da telemetria | **Tela e contrato do app existem; fonte Traccar não.** As páginas atuais consomem `/telemetry/*` e retornam vazio honesto em mock/erro (`frontend/src/modules/telemetry/telemetry.service.ts:17-99`, M-12). B-TRC-03/B-TRC-04 unem as fontes por DTO interno, sem expor DTO Traccar. |

### 3.1 Modelagem mínima comprovada

O B-TRC-01 precisa de três tabelas aditivas, todas com `timestamptz`, nomes internos e migration
forward-only; o rollback SQL manual é documentado e só é seguro antes de receber dado real:

1. `vehicle_tracking_bindings`: tenant-scoped, FK composta para `Vehicle`, instância,
   `external_device_id`, `valid_from`, `valid_to`, auditoria e soft-delete temporal. Índices parciais
   raw SQL garantem no máximo um vínculo ativo por dispositivo e por veículo **dentro do tenant**.
   O advisory lock e a varredura RLS impedem criação/uso cross-tenant concorrente; no B-TRC-01 há
   fixture/seed apenas de teste e dev, e o CRUD chega no B-TRC-03.
2. `traccar_ingress_receipts`: tenant-scoped, chave única
   `(tenant_id, instance_key, message_kind, external_event_key)`, digest allowlisted, vínculo,
   veículo, localização resultante, `fix_time`, `received_at` e resultado. É a barreira durável de
   idempotência; não guarda JSON bruto.

3. A quarentena de tenant ainda desconhecido é `traccar_quarantine_items`, global e mínima:
instância, dispositivo, chave/digest, motivo enum (`unmapped_device`, `ambiguous_binding`,
`no_operator_at_fix_time`, `ambiguous_operator_at_fix_time`), primeira/última ocorrência,
contador e resolução. **Não guarda coordenada nem payload.** O dado detalhado continua no Traccar e
é reconciliado por REST após o vínculo. A necessidade é comprovada: uma linha sem tenant não passa
por uma policy tenant-scoped, e atribuir tenant artificial seria exatamente confiar em contexto
inventado. A tabela não tem rota pública no B-TRC-01.

Não se cria `VehicleLocation`: a posição viva já tem destino. O novo modelo
`VehicleTelemetryEvent` só entra no B-TRC-02, após fixtures provarem os campos reais de evento,
porque hoje nenhum modelo aceita evento de veículo sem mentir sobre `operator_profile_id`.

### 3.2 Destino de cada módulo citado no briefing

| Módulo existente | Como a trilha o alimenta ou preserva |
|---|---|
| `field-location` | B-TRC-01 grava a posição normalizada pelo serviço/repositório existente. |
| `field-ops-realtime` | B-TRC-01 publica `field_location.updated`; o broker/SSE existente só sinaliza e não transporta coordenada. |
| `telemetry` | B-TRC-02 acrescenta a vertente veicular sem alterar a semântica da telemetria do app; B-TRC-04 oferece leitura unificada com fonte explícita. |
| `vehicles` | B-TRC-03 torna o cadastro de viatura dono do vínculo ao rastreador; não nasce cadastro duplicado. |
| `vehicle-identities` | **Não recebe dispositivo.** A medição mostra que esse módulo é a identidade canônica de veículo **de terceiro/recolhido**, com placa/chassi/RENAVAM e merge (`vehicle-identity.types.ts:10-42,94-113`, M-18). Misturar tracker ali corromperia o domínio. Ele só participa futuramente se uma regra aprovada ligar uma identidade recolhida a uma `Vehicle`; essa regra não existe hoje. |
| `field-dispatch` | B-TRC-01 adiciona/reusa uma consulta temporal para achar o técnico do veículo no `fixTime`; não cria fluxo de despacho. |
| `mobile` | Continua sendo a entrada autenticada da telemetria do app, derivando tenant/operador do ator (`mobile-telemetry-sync.ts:11-25`, M-18). O Traccar não chama rota mobile; B-TRC-04 preserva as duas fontes sem dupla contagem. |
| mapa operacional | Recebe o mesmo DTO `/field-locations/latest`; não chama Traccar. |
| `notifications` | Só B-TRC-05, somente para alarmes com contrato/regra aprovados. |

Esse tratamento registra uma divergência aparente, não a esconde: “alimentar os módulos que já
existem” não autoriza gravar um identificador de hardware em `vehicle-identities`, pois a decisão
canônica enumera `vehicles`, despacho e mapa — não identidade de pátio
(`decisoes.md:2223-2230`, M-2). A trilha preserva o módulo e documenta por que ele não é destino.

## 4. Desenho da ingestão

### 4.1 Fluxo de posição

```text
rastreador/simulador → listener de protocolo Traccar
  → forward HTTP JSON privado
  → POST /api/v1/internal/traccar/positions
  → autenticação de serviço + limite + schema allowlist
  → Traccar DTO → DTO interno canônico
  → rota de dispositivo (zero/um; nunca tenant do payload)
  → withTenantRls(tenant interno) + confirmação do vínculo
  → veículo → despacho temporal no fixTime → técnico (exatamente um)
  → receipt idempotente + FieldOperatorLocation, na mesma transação
  → commit → field_location.updated → SSE já existente
  → mapa chama /field-locations/latest e redesenha o pin
```

O endpoint é montado antes de `attachAuthenticatedActor`, pois não há usuário, mas tem middleware
de serviço próprio. Hoje o parser global aceita 2 MB e o logger só mascara `authorization`
(`src/app.ts:101-113`, M-9); B-TRC-01 monta o router interno antes do parser global, com JSON
estrito de **64 KiB**, e adiciona o header do Traccar à redação. As demais rotas continuam atrás do
JWT, como mostram as montagens atuais (`src/app.ts:120-155`, M-9).

### 4.2 Autenticação, rotação e respostas

- Header único: `X-Traccar-Forward-Token`. O Traccar suporta header adicional em forward de posição
  e evento (T-2/T-3). O valor tem pelo menos 32 bytes aleatórios, fica em secret manager/env, nunca
  em código, query string, body, frontend, retorno ou log.
- O backend transforma apresentado e candidato em digests SHA-256 de tamanho fixo e usa
  `crypto.timingSafeEqual`; compara contra `TRACCAR_FORWARD_SECRET_CURRENT` e, durante janela curta,
  `..._PREVIOUS`. Rotação: instalar novo como “previous”, atualizar Traccar, confirmar tráfego,
  promover e remover o antigo. Segredo ausente em produção impede boot.
- `204` = persistido ou reenvio já persistido; `202` = quarentena durável, resposta sem motivo;
  `401` = segredo inválido/ausente; `413` = corpo >64 KiB; `415` = não JSON; `422` = DTO inválido;
  `429` = limite; `503` = falha transitória antes da durabilidade. Nenhuma resposta devolve tenant,
  dispositivo, coordenada ou token.
- Limite inicial configurável por instância: **20 req/s sustentadas, burst 100**, no máximo 32
  processamentos concorrentes e timeout interno de 3 s. É HIPÓTESE de proteção, não capacidade
  prometida; B-TRC-06 mede p95, fila e descarte com a frequência contratada e ajusta sem código.

### 4.3 Tenant, quarentena e falha fechada

O endpoint normaliza o `deviceId`, adquire advisory lock transacional por instância/dispositivo,
obtém a lista global de IDs de tenants ativos e executa uma volta RLS por tenant sobre
`VehicleTrackingBinding`. O helper existente já prova o padrão de uma única transação, troca de GUC
por volta e canário contra linha do tenant anterior (`src/database/rls.ts:41-89`, M-8); o bloco
acrescenta a variante atômica que, após exigir um único match, repõe o GUC vencedor e executa a
escrita antes do commit. Não troca role, não usa superuser e não usa `SECURITY DEFINER`.

Qualquer `tenantId`, `groupId`, nome de organização ou atributo do payload é ignorado e rejeitado se
tentar ocupar campo reservado. Zero binding gera quarentena `unmapped_device`; mais de um binding
em qualquer combinação de tenants, binding inativo/fora da janela ou inconsistência geram
`ambiguous_binding`. Zero/mais de um despacho temporal geram motivos próprios. Em todos esses casos
não há `FieldOperatorLocation`, evento em tempo real nem notificação. O retorno `202` só reconhece
que a quarentena ficou durável; não “aceita” a posição no domínio.

### 4.4 Idempotência, ordem e atraso

- Chave primária de posição: `instance_key + device.id + position.id`, quando `position.id > 0`.
  Se a versão aprovada não garantir ID persistido no forward, usa SHA-256 de tupla canônica
  allowlisted (`instance`, device ID, `fixTime`, lat, lon, protocol, valid, course, speed), **nunca
  timestamp sozinho**. A fixture real decide qual ramo fica ativo.
- Receipt e localização entram na mesma transação tenant-scoped. Conflito na unique lê o receipt e
  responde `204`; não republica evento.
- Histórico aceita posição atrasada com seu `fixTime`. O “latest” existente ordena por
  `recorded_at`, portanto uma chegada antiga não vence uma posição mais nova (M-7). Empate usa
  `received_at`; a chave idempotente impede duplicata idêntica.
- Relógio futuro além de 5 min, fix anterior à retenção configurada ou coordenada inválida vai para
  quarentena/`422` conforme recuperabilidade; nenhuma delas atualiza o mapa.

### 4.5 Eventos, tempo real, mapa e API REST

Posições válidas alimentam `field-location`; o evento SSE existente leva somente o aviso sem
coordenadas — o broker remove chaves de latitude/longitude (`field-ops-realtime.broker.ts:21-22,
42-59,99-122`, M-11) — e o mapa busca DTO autorizado pela REST do ERP. Ignição, odômetro, alarmes
e estados de dispositivo entram em `telemetry` a partir do B-TRC-02. Somente alarmes com regra
explícita alimentam `notifications` no B-TRC-05.

A REST do Traccar fica server-to-server e serve: cadastro/sync de devices, saúde, reconciliação de
quarentena, backfill por janela e fechamento de lacunas. Há cursor/intervalo mínimo, paginação,
backoff e orçamento; nunca loop de polling curto. Não se usa WebSocket. A documentação oficial
distingue forward de posição e evento (T-3); retry documentado existe para **posição**, com delay,
contagem e limite, mas não há `event.forward.retry.*` documentado na 6.16.0 (T-2/T-3). Logo evento
perdido é reconciliado pela REST; o plano não inventa garantia do Traccar.

## 5. Threat model

### 5.1 Ativos, atores e fronteiras

**Ativos:** localização/histórico, vínculo dispositivo↔tenant↔veículo, atribuição a técnico,
segredos de forward e REST, receipts/quarentena, disponibilidade da ingestão e isolamento RLS.
**Atores:** rastreador, Traccar, `erp_runtime`, usuário ERP autorizado, operador cloud, insider,
dispositivo comprometido e atacante de rede. **Fronteiras:** dispositivo→listener de protocolo;
Traccar→endpoint privado ERP; adaptador→varredura tenant-scoped; ERP→PostgreSQL sob RLS; ERP→REST Traccar;
ERP→SSE/REST→browser. A porta de protocolo físico é outra fronteira e não é autorizada por este
plano.

| STRIDE | Ameaça concreta | Mitigação e teste obrigatório |
|---|---|---|
| Spoofing | Atacante envia forward falso ou reutiliza segredo antigo. | SG privado + segredo forte em header + comparação constante + janela dual curta. Testes de ausente, inválido, comprimentos diferentes, current/previous e expiração; logs não contêm valor. |
| Spoofing | Payload declara outro tenant/device. | Tenant nunca é lido do payload; rota interna e confirmação tenant-scoped. Mutation test injeta `tenantId` vítima e prova zero escrita fora do tenant. |
| Tampering | Atributos arbitrários, mass assignment, coordenada/unidade alterada. | Zod estrito, allowlist por versão/fixture, conversão explícita, limites físicos, digest canônico. Campo extra reservado dá `422`; atributo comum desconhecido é descartado, não persistido. |
| Repudiation | Traccar ou ERP nega entrega/replay. | Receipt idempotente com chave, digest, tempos e resultado; audit trail de vínculo. Sem payload bruto/token. Correlation ID interno não exposto. |
| Information disclosure | Token, localização ou tenant chega a log/erro/SSE/UI indevida. | Redaction do header, mensagens neutras, quarentena sem coordenadas, SSE já remove coordenadas e REST aplica RBAC/RLS. Teste captura logger e respostas; cross-tenant permanece `404`. |
| Denial of service | Corpo grande, rajada, retry storm ou REST agressiva. | 64 KiB, 20 rps/burst 100 configurável, concorrência 32, timeout 3 s, retry limitado no Traccar, circuit breaker/backoff na REST, métricas de 202/429/503 e fila. Load test em staging. |
| Elevation of privilege | Runtime contorna FORCE RLS por role, table rule ou função elevada. | `withTenantRls`, canário de tenant, role `NOSUPERUSER NOBYPASSRLS`, nenhuma nova `SECURITY DEFINER`. Produção bloqueada por `P-SAN3-05-REGRA-EM-TABELA` e `P-SAN3-05-SECURITY-DEFINER-INVENTARIO`; repetir runtime-role guard depois de cada migration. |
| Elevation/tampering | Dois tenants vinculam o mesmo dispositivo ou uma corrida muda o vínculo. | Advisory lock por instância/dispositivo, varredura de todos os tenants sob RLS, exatamente um match e confirmação na mesma transação; zero/dois falham fechado; testes concorrentes. |
| Supply chain | Imagem Traccar adulterada/vulnerável. | Tag **e digest** fixos, SBOM/scan, origem oficial, atualização explícita com contract tests; nunca `latest`, nunca demo público. |
| Privacy | Rastreamento fora da jornada ou retenção excessiva. | Atribuição temporal pelo despacho, política de retenção aprovada pelo dono, acesso RBAC e trilha de consulta. Decisão de coexistência app/veículo e finalidade LGPD antes da produção. |

Os dois resíduos exigidos não ficam em nota: `P-SAN3-05-REGRA-EM-TABELA` pode permitir que uma
regra PostgreSQL desvie do guard de runtime; `P-SAN3-05-SECURITY-DEFINER-INVENTARIO` mostra que uma
função elevada fora do inventário pode atravessar FORCE RLS (`pendencias.md:10107-10118,
10359-10364`, M-3). Eles não impedem o demo local, mas **impedem habilitar ingestão em produção**.
O B-TRC-06 reexecuta o inventário e o guard; o B-TRC-07 exige ambos fechados ou nova decisão
explícita do dono com junta de segurança — não basta “aceitar risco” no chat.

## 6. Ambientes

### 6.1 Dev local

O B-TRC-01 acrescenta `docker-compose.traccar.yml`, usado junto ao compose atual. Hoje o compose
publica Postgres/Redis e usa a rede `erp_techsolutions_local` (`docker-compose.yml:1-29`, M-13).
O overlay cria rede interna `traccar_private`, Traccar por **tag+digest**, banco Traccar separado,
config read-only e um simulador descartável. Nenhuma porta Traccar (`8082`, `5055` etc.) é
publicada no host. O simulador entra na rede e envia OsmAnd HTTP ao listener 5055; `id/deviceid` é
obrigatório e `lat/lon/timestamp` são suportados oficialmente (T-4). Ele usa nome DNS interno, não
servidor demo.

Para o forward alcançar o backend local sem abrir Traccar, o overlay também conecta a API dev à
rede privada (ou sobe a API pelo target já existente do `Dockerfile`; decisão de implementação
medida no spike do bloco). O endpoint só é resolvível nessa rede. Um script finito com timeout
semeia organização/veículo/despacho/vínculo, envia um ponto, consulta a API do ERP e abre o mapa;
não usa `tail -f`. A UI do Traccar não faz parte da demonstração.

### 6.2 Staging e produção AWS

Topologia alvo: Traccar em ECS/Fargate numa subnet privada, banco Traccar em RDS PostgreSQL
dedicado, Secrets Manager para forward/REST/DB, logs sem payload, egress controlado; adaptador ERP
na mesma VPC ou ligado por conectividade privada aprovada. Traccar não recebe IP público, ALB/NLB
público nem domínio público. SG permite somente Traccar→ERP na porta privada do backend e
ERP→Traccar REST. Browser/mobile nunca atravessam essa fronteira.

Há um conflito deliberadamente não consolidado: `docs/deployment.md:11-63,296-297` ainda descreve
Fly.io como provedor principal (M-14), enquanto `D-TRACCAR-HTTP-PRIVADO-AWS` é a decisão posterior e
específica do dono para esta integração (M-2). O dono precisa escolher entre:

1. **Recomendado:** mover/instanciar backend de ingestão e Traccar na mesma VPC AWS; ou
2. manter o ERP no Fly e criar uma ponte privada autenticada Fly↔AWS, que muda o threat model,
   custo e operação e exige nova junta antes de qualquer porta.

O listener dos rastreadores reais também é decisão separada: APN/VPN privada é preferível; NLB
público por protocolo só nasce após modelo do dispositivo, portas necessárias, rate/DDoS, TLS
quando suportado, threat model específico e junta unânime. O plano atual autoriza apenas OsmAnd na
rede privada de dev. Servidores públicos de demonstração são proibidos em staging/produção.

## 7. Blocos da trilha

### 7.1 Visão de ordem

| Bloco | Entrega visível | Tam. | Dependência | Gate |
|---|---|---:|---|---|
| B-TRC-01 | Posição OsmAnd simulada aparece no mapa em dev | G | #405/porteiro: cumprido | Segurança 3/3 |
| B-TRC-02 | Ignição, odômetro, evento e estado do dispositivo persistidos | G | 01 | Segurança 3/3 |
| B-TRC-03 | Vínculo de rastreador no cadastro da viatura + sync/reconciliação REST | G | 01–02; credencial dev/staging | Segurança 3/3 |
| B-TRC-04 | Rastreamento, km e Dispositivos sem placeholder/dado fabricado | G | 02–03 | Segurança 3/3 |
| B-TRC-05 | Alarmes aprovados viram notificações; quarentena operável | M | 02–03 | Segurança 3/3 |
| B-TRC-06 | Staging AWS privado, observável e testado em carga/falha | G | 01–05; atos AWS/staging | Segurança 3/3; 5/5 se provisionar serviço pago |
| B-TRC-07 | Go-live controlado, reconciliação e rollback ensaiado | M | 06 + todos os gates produtivos | Crítica 5/5 |

Por `D-GOV-PROPORCIONAL`, nenhum bloco toca `Kpis/*` enquanto o congelamento estiver vigente
(`CLAUDE.md:611-650`, M-1). Cada bloco usa branch/PR próprio e só começa após o porteiro do anterior.

### B-TRC-01 — posição segura no mapa, ponta a ponta

**Objetivo/ator/fluxo.** O operador de campo envia uma posição pelo dispositivo simulado; Traccar
decodifica, encaminha ao ERP, o backend resolve veículo e técnico por vínculo interno e o operador
da central vê o pin no mapa já existente. É a fatia vertical descrita em detalhe na §8.

**Permitido:**

- `prisma/schema.prisma` e
  `prisma/migrations/<timestamp>_traccar_ingestion_foundation/migration.sql`;
- `src/integrations/traccar/**` (novo adaptador, sem regra de UI/domínio duplicada);
- `src/modules/field-location/field-location.types.ts`,
  `field-location.service.ts`, `field-location.repository.ts`,
  `field-location-prisma.repository.ts`;
- `src/modules/field-dispatch/field-dispatch.types.ts`,
  `field-dispatch.service.ts`, `field-dispatch.repository.ts` e
  `field-dispatch-prisma.repository.ts`, somente para a consulta temporal veículo→operador;
- `src/database/rls.ts` para o helper genérico de resolução atômica por varredura, sem mudar a
  semântica de `withTenantRls`/`forEachTenantRls`;
- `src/config/env.ts`, `src/app.ts`, `.env.example`;
- `docker-compose.traccar.yml`, `infra/traccar/dev/**`,
  `scripts/traccar-dev-demo.mjs`;
- `tests/traccar-forward-auth.test.ts`, `tests/traccar-position-contract.test.ts`,
  `tests/traccar-position-ingestion-db.test.ts`, `tests/traccar-tenant-isolation.test.ts`,
  `tests/traccar-dev-topology.test.ts`, `tests/san3-05-leituras-de-plataforma-db.test.ts`,
  testes existentes de field-location/realtime e, somente
  para a costura, `frontend/tests/operations-map*.test.ts`;
- `API_CONTRACTS.md`, `docs/deployment.md`, `docs/omega-pd.md`,
  `docs/revisoes/TRACCAR/**` e registros obrigatórios
  da orquestração/junta.

**Proibido:** `frontend/src/**`, `src/modules/vehicles/**`, `src/modules/vehicle-identities/**`, `src/modules/telemetry/**`,
`src/modules/notifications/**`, `mobile/**`, `fly*.toml`, `.github/workflows/**`, lockfiles,
`Kpis/**`, credenciais reais, porta publicada e qualquer servidor externo. Não criar WebSocket,
mapa, polling ou rota pública de administração.

**Migração:** somente aditiva, sob parecer do `agente-dba-guardiao`: três tabelas da §3.1,
FKs compostas, uniques/índices parciais, RLS FORCE nas duas tenant-scoped, grants mínimos na
quarentena global sem dado de domínio e rollback
SQL manual documentado que remove apenas objetos novos e nunca roda automaticamente. O guard prova
que `erp_runtime` continua sem bypass. Nenhuma coluna
existente muda de semântica.

**Vermelho hoje → verde:** não existe rota, vínculo, receipt nem fonte `traccar` (M-4/M-5/M-9).
Encerramento exige os cinco novos arquivos de teste verdes, regressões de localização/realtime/mapa,
uma mutation controlada por regra crítica e smoke finito `OsmAnd → Traccar → ERP → latest`.

**Quórum:** junta completa de segurança, unanimidade 3/3 (ingestão, tenant, segredo e localização).
**Tamanho:** G. **Dependências:** somente #405/porteiro, já declarado cumprido; não depende de AWS
nem do Ato 2 porque não ativa produção.

### B-TRC-02 — eventos e telemetria veicular

**Objetivo.** Receber `event.forward.*` e os atributos allowlisted de posição para conservar
ignição, odômetro, alarmes técnicos e online/offline sem misturar com telemetria do app.

**Permitido:** `prisma/schema.prisma`, uma migration
`*_vehicle_telemetry_events`; `src/integrations/traccar/**`;
`src/modules/telemetry/**`; `src/modules/vehicles/**` apenas para porta de leitura do veículo;
`src/config/env.ts`, `.env.example`, `src/app.ts`; `tests/traccar-event-*.test.ts`,
`tests/telemetry.test.ts`; contratos/docs/orquestração. **Proibido:** frontend/mobile,
notifications, infra cloud, RBAC, lockfiles, KPI, porta pública, WebSocket e escrita automática em
`WorkOrder.mileage_*`.

**Migração:** aditiva, com `agente-dba-guardiao`: `VehicleTelemetryEvent` tenant-first, FK composta
para veículo, tipo/tempo/dados normalizados, idempotência e índices temporais; nenhum raw payload.
Rollback SQL manual remove só a tabela/índices novos, apenas antes de dado real. **Testes:** fixtures reais de evento/posição 6.16.0;
dedupe; ordem atrasada; unidades; tipos desconhecidos; cross-tenant; RLS; ausência de retry de
evento compensada por reconciliação fake; mutation de tenant e de idempotência.

**Quórum:** segurança 3/3. **Tamanho:** G. **Dependência:** B-TRC-01 e versão Traccar congelada.

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
`src/infra/jobs/**` e registro de job existente; `src/config/env.ts`, `.env.example`, `src/app.ts`;
frontend de veículos estritamente para o vínculo (`frontend/src/modules/vehicles/**`);
`tests/vehicles*.test.ts`, `tests/traccar-rest-*.test.ts`, testes frontend correspondentes;
contratos/docs/orquestração. **Proibido:** novo papel/permissão sem decisão, WebSocket, REST
Traccar no browser, polling abaixo de 5 min, raw payload, acesso a servidor demo, infra/prod, KPI e
lockfiles.

**Migração:** nenhuma prevista. Se fixture real provar coluna adicional indispensável, parar,
replanejar e convocar `agente-dba-guardiao`; não ampliar B-TRC-03 silenciosamente. **Testes:**
409 concorrente de vínculo; dois tenants tentam o mesmo device sob o mesmo advisory lock;
create/rotate/deactivate temporal do binding; 404 cross-tenant; timeout/401/429/5xx Traccar; cursor e backoff; reconciliação não
duplica; nenhuma credencial/tenant externo em log/DTO.

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
**Tamanho:** G. **Dependências:** 02–03 e decisão do dono sobre coexistência/plano comercial.

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
02–03 e catálogo de alarmes aprovado pelo dono.

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

**Quórum:** segurança 3/3 para código/IaC. Se o bloco criar/configurar serviço externo pago ou
executar deploy, vira decisão crítica 5/5 (§C7) e exige ato do dono. **Tamanho:** G. **Dependências:**
01–05, decisão AWS×Fly/forma da ponte, conta/rede/secrets, amarração de staging.

### B-TRC-07 — habilitação de produção

**Objetivo.** Promover exatamente a imagem aprovada, ligar forward de modo gradual, observar,
reconciliar e provar rollback sem perda/contaminação entre tenants.

**Permitido:** manifests/config de produção já aprovados, runbooks/smokes/atestados, parâmetros e
secrets pelo gerenciador (nunca conteúdo), registro de decisão/junta. **Proibido:** mudança de
código funcional/schema, porta pública não aprovada, imagem diferente do SHA de staging,
credencial em arquivo/log, seed, demo server e qualquer bypass de gate.

**Migração:** nenhuma; migration necessária devolve ao bloco de código e ao
`agente-dba-guardiao`. **Testes/gates:** staging verde no mesmo SHA; Ato 2 das cinco tarefas sob
`erp_runtime`; quatro críticos de J-6R fechados; `P-SAN3-05-STAGING-CD-AMARRACAO`,
`P-SAN3-05-REGRA-EM-TABELA` e `P-SAN3-05-SECURITY-DEFINER-INVENTARIO` fechados; backup/restore;
rotação; canário de um dispositivo/tenant; isolamento; métricas; rollback; reconciliação pós-volta.

**Quórum:** decisão crítica, unanimidade 5/5 (produção + serviço externo/pago), além do inspetor de
terreno. **Tamanho:** M de engenharia, prazo externo indeterminado. **Dependências:** todas as
anteriores e todos os atos do dono da §9.

## 8. Plano detalhado do B-TRC-01

### 8.1 Resultado e critérios observáveis

Ao terminar, um dev executa um comando finito, que:

1. sobe apenas o stack local necessário em redes Docker privadas;
2. cria/usa uma organização demo, um técnico, uma viatura, uma OS/despacho temporal e o vínculo
   `sim-traccar-01 → viatura`;
3. envia uma posição OsmAnd ao Traccar local;
4. prova por consulta autenticada ao ERP que `/api/v1/field-locations/latest` devolve o técnico na
   coordenada enviada, com `source=traccar`;
5. prova que o evento SSE notificou a mudança sem carregar coordenadas; e
6. imprime somente IDs/códigos não sensíveis e termina sozinho com status 0.

O operador da central abre o mapa operacional já existente e vê o pin. Nenhuma tela Traccar, rota
do Traccar ou porta 5055/8082 é exposta ao host.

### 8.2 Contrato externo e interno

**Rota de serviço:** `POST /api/v1/internal/traccar/positions`.

**Headers:** `Content-Type: application/json`; `X-Traccar-Forward-Token: <secret>`; opcional
`X-Request-Id` gerado/validado pelo backend. Não aceitar segredo em `Authorization`, query ou body,
para que haja uma única forma auditável.

**Payload Traccar:** o contract test usa a fixture capturada da imagem 6.16.0. A forma esperada —
a confirmar antes da implementação — é o objeto de posição com `id`, `deviceId`, `protocol`,
`serverTime`, `deviceTime`, `fixTime`, `valid`, `outdated`, `latitude`, `longitude`, `speed`,
`course`, `accuracy` e `attributes`. O parser aceita o envelope real comprovado, extrai somente a
allowlist e descarta campos comuns desconhecidos; presença de `tenantId`, `tenant_id`, `token`,
`secret`, `authorization`, `path`, `bucket`, `storageKey` ou base64 em qualquer profundidade gera
`422`. Limite 64 KiB.

**DTO canônico interno** (não é DTO público):

```ts
type TraccarPositionCommand = {
  instanceKey: string;          // configuração da rota, nunca do JSON
  externalDeviceId: string;     // position.deviceId normalizado
  externalPositionId?: string;  // position.id > 0
  idempotencyKey: string;       // ID externo ou hash canônico
  fixedAt: Date;
  receivedAt: Date;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  headingDegrees?: number;
  speedMetersPerSecond?: number;
  valid: boolean;
  payloadDigest: string;
};
```

A conversão de velocidade só é implementada depois de o teste de fixture fixar a unidade da
versão/configuração escolhida. Para a demonstração inicial, a posição usa velocidade zero; não se
“adivinha” knot↔km/h. `instanceKey` vem da configuração do endpoint (`TRACCAR_INSTANCE_KEY`) e não
é aceito do body.

**Códigos:** os da §4.2. Erro de domínio cross-tenant em rotas públicas existentes continua `404`;
`409` é reservado a tentativa administrativa concorrente de vínculo (B-TRC-03); ingestão duplicada
é sucesso idempotente `204`, não conflito.

### 8.3 Arquivos e responsabilidade exata

| Arquivo | Trabalho |
|---|---|
| `prisma/schema.prisma` | Declarar as três tabelas e relações da §3.1; nenhuma alteração destrutiva. |
| `prisma/migrations/<timestamp>_traccar_ingestion_foundation/migration.sql` | Criar tabelas/constraints/índices parciais/RLS FORCE/grants; comments de segurança e rollback SQL manual documentado, nunca migration automática de down. |
| `src/integrations/traccar/traccar-position.schema.ts` | Parser externo estrito, limite lógico, lista de chaves proibidas e fixture versionada. |
| `src/integrations/traccar/traccar-position.adapter.ts` | Converter Traccar DTO em comando canônico; normalizar datas/IDs/unidades e gerar chave/digest. |
| `src/integrations/traccar/traccar-forward-auth.ts` | Ler um único header, comparar current/previous em tempo constante, sem log. |
| `src/integrations/traccar/traccar-rate-limit.ts` | Token bucket/config e limite de concorrência, sem dependência nova. |
| `src/integrations/traccar/traccar-ingestion.repository.ts` | Sob advisory lock, varrer bindings com contexto RLS, exigir um tenant, resolver despacho no `fixedAt` e gravar receipt+localização na mesma transação; quarentena mínima quando não resolvido. |
| `src/integrations/traccar/traccar-ingestion.service.ts` | Orquestrar autenticação já feita, adaptação, resolução zero/um, idempotência, códigos e publicação pós-commit. |
| `src/integrations/traccar/traccar.routes.ts` | Endpoint privado; body parser 64 KiB, timeout e resposta vazia. |
| `src/integrations/traccar/index.ts` | Exportar somente factory/router/ports necessários. |
| `src/database/rls.ts` | Acrescentar helper genérico que varre tenants, aplica canário, exige um match, repõe o GUC vencedor e executa trabalho na mesma transação; preservar APIs existentes. |
| `src/modules/field-location/field-location.types.ts` | Acrescentar `traccar` à fonte canônica. |
| `src/modules/field-location/field-location.service.ts` | Extrair validação compartilhada e oferecer comando interno confiável; preservar `recordMobileLocation`. |
| `src/modules/field-location/field-location.repository.ts` e `field-location-prisma.repository.ts` | Permitir gravação no transaction client recebido, sem abrir transação aninhada; manter leituras atuais. |
| `src/modules/field-dispatch/field-dispatch.types.ts`, `field-dispatch.service.ts`, `field-dispatch.repository.ts`, `field-dispatch-prisma.repository.ts` | Expor consulta tenant-scoped “operador do veículo no instante”; centralizar estados/janela no domínio de despacho, em vez de SQL de negócio no adaptador. |
| `src/config/env.ts`, `.env.example` | Declarar instance key, current/previous secret, limites; gate de produção e exemplos vazios/rotulados. |
| `src/app.ts` | Redaction do header e montagem do router antes do parser JSON global/JWT, sem alargar outra rota. |
| `docker-compose.traccar.yml` | Traccar, DB isolado, redes internas, config read-only, healthcheck e simulador; tag+digest, zero `ports:` Traccar. |
| `infra/traccar/dev/traccar.xml` | Somente protocolos/config de dev, forward JSON/header por env; nenhum segredo literal. |
| `infra/traccar/fixtures/6.16.0/position-osmand.json` | Payload real capturado e sanitizado que congela o contrato. |
| `scripts/traccar-dev-demo.mjs` | Setup/smoke finito, `AbortSignal.timeout`, teardown opcional e saída sem segredo. |
| testes nomeados abaixo | Provar propriedades, não apenas formato. |
| `API_CONTRACTS.md`, `docs/deployment.md` | Registrar rota interna, respostas, variáveis e execução local; não publicar como API de cliente. |

Se a fixture 6.16.0 não tiver `deviceId` estável ou `position.id > 0`, o dev **para a etapa de
modelagem**, registra a evidência e ativa o fallback de chave canônica já previsto; não troca para
`uniqueId` por memória nem aceita timestamp isolado.

### 8.4 Ordem de execução — testes primeiro

1. **Terreno e PD.** Confirmar worktree/branch/head limpos; criar comando do bloco; medir de novo os
   arquivos com `git show origin/main:<path>`; registrar versão/digest da imagem sem puxar ou subir
   serviço ainda. Registrar em `docs/omega-pd.md` a pesquisa oficial exigida por
   `D-TRACCAR-HTTP-PRIVADO-AWS` antes da primeira linha funcional.
2. **Fixtures/contrato vermelho.** Obter da imagem aprovada a fixture oficial em ambiente local
   descartável e sanitizá-la. Escrever `tests/traccar-position-contract.test.ts`; ele deve falhar
   porque parser/adapter não existem.
3. **Auth vermelho.** Escrever `tests/traccar-forward-auth.test.ts` para segredo current/previous,
   inválido, ausente, tamanhos diferentes, header duplicado e não vazamento. Só então implementar o
   verifier com `node:crypto`.
4. **Schema/RLS vermelho.** Sob `agente-dba-guardiao`, escrever os testes DB de migration,
   constraints, FORCE RLS, grants e isolation; provar que falham antes. Criar migration aditiva e
   gerar Prisma Client sem alterar lockfile.
5. **Adaptador mínimo.** Implementar schema+adapter até os contract tests ficarem verdes; nenhum
   acesso a banco nessa camada.
6. **Resolução segura.** Implementar advisory lock→varredura RLS dos bindings→exatamente um
   tenant→veículo→despacho no `fixedAt`, na mesma transação. O dispatch é elegível se nasceu antes do fix e não terminou/cancelou/falhou antes
   dele; exatamente um operador. Zero/mais de um vai à quarentena.
7. **Transação/idempotência.** Na mesma transação `withTenantRls`, inserir receipt com unique e
   `FieldOperatorLocation`; conflito retorna o resultado prévio. Publicar `field_location.updated`
   somente depois do commit e somente na primeira gravação.
8. **HTTP seguro.** Montar rota com parser próprio antes de `express.json({limit:"2mb"})`, adicionar
   redaction e limites. Não logar body. Exercitar todos os códigos com `tests/traccar-position-ingestion-db.test.ts`.
9. **Topologia dev.** Escrever o teste estrutural do compose antes do compose: zero porta Traccar,
   rede `internal`, segredo por env, imagem fixada, healthchecks. Criar overlay/config/script.
10. **Vertical.** Rodar o smoke com tempo total máximo de 120 s: um ponto, receipt 1, location 1,
    segunda entrega receipt/location ainda 1, latest correto e SSE sem coordenadas. Capturar a
    evidência textual sanitizada.
11. **Regressão/bateria.** Executar a §8.7, limpar containers/volumes somente do projeto Traccar
    pelo nome explícito, nunca `docker system prune`, e registrar a linha de limpeza.
12. **Junta.** Inspetor de terreno, três jurados de segurança elegíveis e unanimidade. Não autoriza
    staging/produção.

### 8.5 Testes novos — nomes mínimos

`tests/traccar-forward-auth.test.ts`:

- `aceita o segredo current e responde sem ecoá-lo`;
- `aceita previous somente durante a janela de rotação`;
- `nega ausente, inválido e header duplicado`;
- `compara digests de tamanho fixo com timingSafeEqual`;
- `redige o header e o body em logs de sucesso e erro`;
- `produção não inicia sem current secret forte`.

`tests/traccar-position-contract.test.ts`:

- `adapta a fixture OsmAnd Traccar 6.16.0 para DTO interno`;
- `ignora tenant e instance externos e rejeita chaves sensíveis reservadas`;
- `rejeita coordenada, data, id ou corpo inválidos e corpo acima de 64 KiB`;
- `gera a mesma chave para o mesmo position id`;
- `fallback determinístico usa tupla completa e nunca somente timestamp`.

`tests/traccar-position-ingestion-db.test.ts`:

- `persiste receipt e localização atomicamente sob erp_runtime`;
- `reenvio responde 204 sem duplicar nem republicar`;
- `posição atrasada entra no histórico e não regride latest`;
- `resolve o técnico cujo despacho cobria o fixTime`;
- `zero ou dois despachos elegíveis não gravam localização`;
- `falha transitória antes do commit responde 503 e permite retry`;
- `current e previous produzem a mesma semântica de domínio`.

`tests/traccar-tenant-isolation.test.ts`:

- `tenant_id injetado no payload não escolhe organização`;
- `dispositivo não mapeado cria somente quarentena sem coordenada`;
- `dois bindings em tenants distintos falham fechado`;
- `troca concorrente de binding sob advisory lock não contamina tenant`;
- `tenant A não lê/escreve localização, receipt ou binding de B`;
- `runtime role não é superuser, bypass, owner nem membro do owner`.

`tests/traccar-dev-topology.test.ts`:

- `compose não publica portas do Traccar`;
- `serviços usam rede privada e imagem por tag+digest`;
- `config não contém segredo literal nem servidor demo`;
- `smoke tem timeout e não usa tail -f`.

São **28 casos mínimos novos**; nomes podem ser agrupados sem reduzir as propriedades.

### 8.6 Baseline N e meta M ≥ 2N

O baseline direto é **N=20 casos**: 2 em `tests/field-location-routes.test.ts`, 4 em
`tests/field-ops-realtime.test.ts` e 14 em `frontend/tests/operations-map.adapter.test.ts`, contados
por M-16. A meta do B-TRC-01 é **M=48 casos diretos** (20 preservados + 28 novos), logo `M ≥ 2N`
(48 ≥ 40). A trilha ampla mede também 83 casos nos dez arquivos adjacentes de localização,
realtime, telemetria, veículos, despacho e mapa (M-16); até B-TRC-07 deve preservar os 83 e somar
ao menos 83 casos novos distribuídos, sem converter teste em snapshot vazio.

### 8.7 Bateria exata do B-TRC-01

Todos os comandos têm timeout no executor/CI; nenhum processo fica acompanhando log.

```powershell
npm run check
npm run lint
npm test -- tests/traccar-forward-auth.test.ts
npm test -- tests/traccar-position-contract.test.ts
$env:CORE_SAAS_PERSISTENCE='prisma'; npm test -- tests/traccar-position-ingestion-db.test.ts
$env:CORE_SAAS_PERSISTENCE='prisma'; npm test -- tests/traccar-tenant-isolation.test.ts
$env:CORE_SAAS_PERSISTENCE='prisma'; npm test -- tests/san3-05-leituras-de-plataforma-db.test.ts
Remove-Item Env:CORE_SAAS_PERSISTENCE -ErrorAction SilentlyContinue
npm test -- tests/traccar-dev-topology.test.ts
npm test -- tests/field-location-routes.test.ts
npm test -- tests/field-ops-realtime.test.ts
npm --prefix frontend exec -- node --test --import tsx tests/operations-map.adapter.test.ts tests/operations-map-technicians.test.ts tests/operations-map-calls.test.ts
npm run test
npm --prefix frontend run test:smoke
npm run build
npm --prefix frontend run check
npm --prefix frontend run build
node scripts/traccar-dev-demo.mjs --timeout-ms 120000
git diff --check
```

O job PostgreSQL usa cluster descartável próprio, migration desde zero e `erp_runtime`; não aponta
para banco vivo. No PowerShell, variáveis de teste são removidas antes das baterias seguintes. O
smoke Docker só roda depois dos testes estruturais e termina/limpa seus serviços nomeados.

### 8.8 Vermelho-controle e mutations

Antes do voto, em cópia/worktree descartável do jurado, aplicar uma mutação por vez e provar que a
bateria indicada fica vermelha; depois descartar o worktree pelo mecanismo seguro:

1. aceitar `tenantId` do JSON como tenant → `traccar-tenant-isolation` falha;
2. fazer segredo inválido retornar true → `traccar-forward-auth` falha;
3. remover a unique do receipt ou ignorar conflito → ingestion DB duplica e falha;
4. ordenar latest por `received_at` antes de `recorded_at` → teste de atraso falha;
5. gravar sem repor o GUC do tenant vencedor/usar client global → isolamento sob runtime falha;
6. publicar latitude no evento SSE → regressão de realtime falha;
7. adicionar `ports: ["5055:5055"]` ao compose → topology falha.

Além disso, o jurado inspeciona que `timingSafeEqual` recebe digests fixos; timing estatístico em CI
não é teste confiável e não substitui análise de código.

### 8.9 Pronto significa

- 28 propriedades novas verdes, 20 diretas preservadas e suíte completa verde;
- migration aditiva revisada pelo DBA, RLS FORCE e grants provados sob `erp_runtime`;
- um e somente um receipt/location no reenvio; tenant injetado não altera destino;
- quarentenas sem coordenada/payload; ambiguidade produz zero escrita de domínio;
- posição atrasada não regride latest;
- segredo ausente/ruim não vaza e produção não boota sem segredo forte;
- Traccar sem porta host, sem demo, imagem fixada e smoke local finito;
- mapa existente exibe o ponto real; SSE não transporta coordenadas;
- `npm run check`, `lint`, `test`, `build`, baterias frontend e `git diff --check` verdes;
- limpeza reportada; ata da junta 3/3 e porteiro pós-merge. Nada disso autoriza produção.

## 9. Atos do dono e fora deste plano

### 9.1 Decisões e ações que pertencem ao dono

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
   `pendencias.md:10255-10265`, M-3; `D-ATO2-OPCAO-B`, M-2). Ele não bloqueia B-TRC-01–05, mas
   bloqueia produção.
6. **Gates produtivos existentes.** Fechar os quatro críticos de J-6R e
   `P-SAN3-05-STAGING-CD-AMARRACAO` antes de staging/CD produtivo. Fechar também os dois resíduos
   de RLS da §5 antes de ligar ingestão de produção.
7. **Produto/LGPD.** Decidir retenção de localização, quem pode ver trilha veicular, coexistência
   rastreamento do app×Traccar, se rastreamento veicular é recurso pago e catálogo de alarmes que
   merece notificação. A decisão anterior aponta “veículo pago, técnico grátis”, mas preço/entitlement
   não será inferido.

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
| Resolver tenant antes da RLS | média/crítico | Enumerar tenants globais e varrer bindings com `forEachTenantRls`/helper atômico, canário e advisory lock; nunca payload/default/bypass. |
| Associação errada por atraso/revezamento de veículo | média/crítico | Resolver despacho no `fixTime`, não no “agora”; ambíguo/ausente em quarentena; teste temporal. |
| Reenvio ou ordem fora de sequência | alta/alto | Receipt unique, transação única e latest por `recorded_at`; backfill por janela. |
| Evento perdido porque `event.forward` não documenta retry | média/alto | Receipt quando recebido + reconciliação REST periódica e métricas de gap; não prometer exactly-once. |
| Drift do JSON/versão Traccar | média/alto | Tag+digest, fixture versionada, contract test e upgrade explícito. |
| Vazamento de localização/segredo | média/crítico | Rede privada, redaction, resposta vazia, allowlist, quarentena sem coordenada, RLS/RBAC e teste de log. |
| Varredura O(n) degrada com muitos tenants | média/alto | Limite/rate control no B1, índice tenant-first e benchmark B6; qualquer índice global futuro exige novo plano e threat model. |
| Volume maior que limite inicial | média/alto | Limites configuráveis, load test de staging, métricas, sizing antes do go-live. |
| Resíduos table-rule/SECURITY DEFINER anulam guard | existente/crítico | Bloquear B-TRC-07 até fechar as duas pendências e reexecutar inventários. |
| Conflito AWS específico × Fly atual | alta/alto | Ato explícito do dono antes de B-TRC-06; nenhuma ponte pública improvisada. |
| Custo/lock-in operacional | média/médio | OCI fixada, DB PostgreSQL, IaC, backup/restore e estimativa AWS aprovada antes de apply. |

### 10.2 Estimativa honesta

O ritmo informado pelo dono é a base: **#400 levou 2 ciclos; #405, 4 ciclos e 6 dias; #409,
somente revisor**. O código confirma que #400 teve junta 2 e #405 chegou ao menos ao ciclo 4,
enquanto #409 foi revisão independente (`status-geral.md:4983-4990`, atas/mandatos em M-17). O
Traccar se parece mais com #405 do que com #409: toca segredo, RLS, tenant e dado de localização.

| Faixa | Prazo de engenharia serial | Observação |
|---|---:|---|
| B-TRC-01 | **5–8 dias úteis** | Primeiro resultado funcionando; prevê 2–4 ciclos de segurança. |
| B-TRC-02 | 4–7 | Novo modelo e contrato de eventos. |
| B-TRC-03 | 4–7 | Cadastro, segredo REST e concorrência. |
| B-TRC-04 | 3–5 | Pode cair para revisor+CI se o diff for só apresentação. |
| B-TRC-05 | 2–4 | Catálogo de alarme precisa estar decidido. |
| B-TRC-06 | 5–10 | Não inclui espera por conta, rede ou compra. |
| B-TRC-07 | 2–4 | Não inclui espera pelos gates/atos do dono. |
| **Total** | **25–45 dias úteis** | Sem tempo externo; a trilha é serial por bloco/porteiro. |

É uma faixa, não promessa. O melhor caso requer decisões antes de cada dependência e junta verde no
primeiro/segundo ciclo; quatro ciclos como #405 empurram para o limite superior. O dono vê algo real
ao fim do B-TRC-01, sem esperar as telas e a nuvem completas.

### 10.3 Rollback

- **B-TRC-01:** remover `forward.url/header` do Traccar e desabilitar o router por configuração;
  promover imagem anterior. Tabelas aditivas ficam inertes para investigação; rollback SQL manual só em ambiente
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

### 11.1 Repositório — todos em `origin/main@a9fbe283`

| ID | Comando reproduzível | O que sustenta |
|---|---|---|
| M-0 | `git -C C:/Users/AMP/w-traccar rev-parse HEAD; git ... rev-parse origin/main; git ... branch --show-current` | Head/ref/branch exigidos. |
| M-1 | `git show origin/main:CLAUDE.md` | Contrato inteiro, em especial §C7 item 8(4), KPI e quórum. |
| M-2 | `git show origin/main:agent-orchestration/controle/decisoes.md` | D-TRACCAR, pós-#405, governança, provedor, Ato 2 e modelo. |
| M-3 | `git show origin/main:agent-orchestration/controle/pendencias.md` | Quatro ressalvas SAN3 exigidas. |
| M-4 | `git grep -n -i -E 'traccar|device_id|unique.?id|ignition|odometer|alarm' origin/main -- prisma src frontend/src` | Ausência/presença de vínculo e campos; resultados lidos no contexto, não só contados. |
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
| M-16 | Script PowerShell que conta `^\s*(test|it)\s*\(` nos dez arquivos listados na §8.6 | N=20 direto; 83 adjacentes. |
| M-17 | `git grep -n -E '#400|#405|#409' origin/main -- agent-orchestration docs` | Ritmo/ciclos e gates recentes. |
| M-18 | `git show origin/main:src/modules/vehicle-identities/vehicle-identity.types.ts`; `git show origin/main:src/modules/mobile/mobile-telemetry-sync.ts` | Identidade de terceiro/recolhido e entrada mobile derivada do ator. |

Linhas foram obtidas por `git show origin/main:<arquivo> | ForEach-Object` com contador; isso evita
medir a árvore mutável e é EOL-neutro para o propósito do plano. O `git grep` M-4 encontrou o termo
“deviceId” apenas em metadados/fixtures alheios e nenhum modelo de vínculo Traccar↔frota; o resultado
foi conferido manualmente contra `Vehicle` e `ThirdPartyVehicleIdentity`, não inferido de busca vazia.

### 11.2 Traccar oficial — versão de referência 6.16.0

- T-1 — [release oficial Traccar v6.16.0](https://github.com/traccar/traccar/releases/tag/v6.16.0).
- T-2 — [Configuration File Reference](https://www.traccar.org/configuration-file/):
  `forward.type/url/header/retry.*` e `event.forward.type/url/header`.
- T-3 — [Forwarding Overview](https://www.traccar.org/forward/): posição processada, evento e
  forwarding bruto são fluxos diferentes; este plano usa os dois primeiros e proíbe o bruto.
- T-4 — [OsmAnd protocol](https://www.traccar.org/osmand/): HTTP, identificador obrigatório,
  `lat/lon/timestamp` e atributos aceitos. Os exemplos públicos são apenas documentação; o smoke usa
  endereço local privado.
- T-5 — [Traccar API](https://www.traccar.org/traccar-api/): REST é usada server-to-server somente
  para cadastro/reconciliação; o WebSocket descrito pela plataforma não é usado neste desenho.

Consulta web feita em 2026-10-10. Se a rede estiver indisponível na execução, a hipótese é
confirmada pela imagem/tag fixada e pelos arquivos oficiais embarcados; o dev registra `docker image
inspect <imagem@digest>` e a fixture capturada. Sem essa confirmação, o contract test permanece
vermelho e o bloco não avança.
