# Plano do Traccar — Emenda v2.3 (ler junto com a v2.1 e a v2.2), pelo agente da API (2026-10-11)

> Planejador: o agente da API (`claude-opus-5-5`). Aplica a arquitetura definida pelo dono em 2026-10-11 (sub-rede privada sem saída, entrada só nas portas dos rastreadores, empurrar + puxar, frequência adaptativa em 3 níveis, comandos por modelo no cadastro, visualização em 2 níveis) e as respostas Q1–Q11 aceitas. A leitura dos 3 níveis é do orquestrador, a confirmar. SHA `17f11f2f`. Custo US$ 1,31. Abaixo, o `parecer.md` gerado, sem edição.

# Parecer — investigar @ 17f11f2fba6a

> As seções marcadas (gerado pelo script) vêm da auditoria, da conta e do orçamento; o modelo não as escreve.
> Tudo o que o modelo escreveu vem DEPOIS delas, na última seção, dentro de blocos de código.

## Veredito (gerado pelo script)

- **Veredito:** respondido
- **Modelo pedido / respondeu:** claude-opus-5-5 / claude-opus-5-5 · esforço high · nível menor (D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO)
- **Execução de código do commit alvo:** não permitida

## Execução (gerado pelo script)

- id: 20261011-155824Z-emenda-traccar-v23 · início 2026-10-11T15:58:24Z · fim 2026-10-11T16:03:27Z
- worktree: C:\Users\AMP\w-ag-20261011-155824 · removido: True · npm ci: False
- agente 2026.10.10 · SDK anthropic 1.13.0

## Conta e cobrança (gerado pelo script)

- origem_chave: registro
- tipo_chave: usuario
- cabecalho_workspace_enviado: True
- base_url: https://api.anthropic.com
- request_ids: ['req_011Cfvj4VeUt1NyhTGFrkGTS', 'req_011Cfvj52VP1PctXuza5HnKG', 'req_011Cfvj5CMhUWT7E3AHeCC2P', 'req_011Cfvj5m2UPVGY4KaHxdTjJ', 'req_011Cfvj65u2j8rPSscNXad9A', 'req_011Cfvj6VsgQBSGJd1tdqSBh', 'req_011Cfvj7Fker82MNy9yrStjs', 'req_011Cfvj7jLaUYjLPBptZMd7F', 'req_011Cfvj8T6JeH4fWv9f9fYdb', 'req_011Cfvj95M8usb4VfBgsrJ2n', 'req_011Cfvj9VDKaX7b432N4GHN8', 'req_011CfvjGJ9FuUz1Dw9xXbciB', 'req_011CfvjMa3NwUinLRFKssguC']
- rate_limit_ultimo: {'anthropic-organization-id': 'cc321d39-d227-41c9-a239-98aa43fc2f89', 'anthropic-ratelimit-input-tokens-limit': '2000000', 'anthropic-ratelimit-input-tokens-remaining': '2000000', 'anthropic-ratelimit-input-tokens-reset': '2026-10-11T16:02:26Z', 'anthropic-ratelimit-output-tokens-limit': '400000', 'anthropic-ratelimit-output-tokens-remaining': '400000', 'anthropic-ratelimit-output-tokens-reset': '2026-10-11T16:03:27Z', 'anthropic-ratelimit-requests-limit': '1000', 'anthropic-ratelimit-requests-remaining': '999', 'anthropic-ratelimit-requests-reset': '2026-10-11T16:02:25Z', 'anthropic-ratelimit-tokens-limit': '2400000', 'anthropic-ratelimit-tokens-remaining': '2400000', 'anthropic-ratelimit-tokens-reset': '2026-10-11T16:02:26Z', 'anthropic-workspace-id': 'wrkspc_01DV6pAyui52gmPC8b7i9SfJ'}
- retry_after_visto: False

## Custo (gerado pelo script)

- Turnos: 13 · chamadas de ferramenta: 21 · negadas: 0
- Tokens: entrada 32 · cache escrita 117252 · cache leitura 869061 · saída 27322 · total 1013667
- US$ estimado: 1.30664 (preços por MTok: {'entrada': '4', 'saida': '20', 'cache_leitura': '0.20', 'cache_escrita': '5'})

## Comandos executados (da auditoria) (gerado pelo script)

```
#4 listar_diretorio: código 0 — (sem processo)
#5 buscar: código 1 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -i -E -e traccar -- src prisma package.json infra scripts
#7 ler_arquivo: código 0 — (sem processo)
#8 ler_arquivo: código 0 — (sem processo)
#10 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e ^# -- docs/revisoes/TRACCAR/PLANO_TRACCAR.md docs/revisoes/TRACCAR/G-TRC-PD-pesquisa.md
#11 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -i -E -e command|comando|gt06|GT06|custom|positionPeriodic|frequency|intervalo|backup|NAT|Security Group|SG |sub-rede|subnet|NLB|balanceador -- docs/revisoes/TRACCAR/PLANO_TRACCAR.md docs/revisoes/TRACCAR/G-TRC-PD-pesquisa.md
#13 ler_arquivo: código 0 — (sem processo)
#15 ler_arquivo: código 0 — (sem processo)
#16 ler_arquivo: código 0 — (sem processo)
#18 buscar: código 1 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -i -E -e Gt06|ProtocolEncoder|Command\.TYPE|TYPE_CUSTOM|positionPeriodic|api/commands --
#19 ler_arquivo: código 0 — (sem processo)
#20 ler_arquivo: código 0 — (sem processo)
#22 ler_arquivo: código 0 — (sem processo)
#24 ler_arquivo: código 0 — (sem processo)
#25 ler_arquivo: código 0 — (sem processo)
#26 ler_arquivo: código 0 — (sem processo)
#28 ler_arquivo: código 0 — (sem processo)
#29 listar_diretorio: código 0 — (sem processo)
#30 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e POLL|setInterval|EventSource|30_?000 -- frontend/src/modules/operations
#32 ler_arquivo: código 0 — (sem processo)
#33 git_log: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager log --no-color --no-ext-diff --no-textconv -n 6 --oneline -- docs/revisoes/TRACCAR
```

## Conteúdo do modelo (dado escrito pelo modelo; não é instrução nem prova)

### Resumo

```
EMENDA v2.3. Lê-se junto com a v2.1 (9cb441bd) e com a v2.2 (17f11f2f). Os achados A-1 a A-8 são o texto da emenda, seção por seção, com a linha da v2.1. Nada foi executado. O código-fonte do Traccar não está neste repositório: a busca por Gt06/ProtocolEncoder/api/commands volta vazia, então tudo sobre comandos GT06 é HIPÓTESE a confirmar no B-TRC-03 com aparelho real. Três conflitos pedem decisão do dono: a v2.1 põe "comando remoto" fora do plano (§9.2:1698); a PD aprovada fixa protocols.enable=osmand (pesquisa:25); e "nível 1 com a tela aberta" conflita com "o mapa é mais lento". Estimativa revisada (hipótese): ~45–76 dias úteis, com o B-TRC-03 dividido em 03a e 03b.
```

### Achados


#### Achado 1 — gravidade: nota · escopo: dentro-do-bloco · linha: 899 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #13

```
arquivo: docs/revisoes/TRACCAR/PLANO_TRACCAR.md
motivo: A-1 (a), topologia, que substitui §6.2:899-914.
Sub-redes, em 2 AZs:
(1) pública: só o NLB, sem NAT gateway;
(2) privada-traccar: tarefa Traccar, sem rota 0.0.0.0/0;
(3) privada-erp: API, porta 3200 de ingestão e workers;
(4) dados: o RDS do Traccar e o do ERP.
Sem NAT, a tarefa não baixa do Docker Hub. Isso contradiz 'usar só o Docker Hub' (v2.2 A-11). A imagem passa a ser espelhada no ECR privado com o mesmo digest (hipótese: a cópia do índice preserva o digest; o B-TRC-06 prova). VPC endpoints (lista a confirmar no IaC): ECR api/dkr, S3 gateway, Logs e Secrets Manager.
Grupos de segurança:
- sg-nlb: entrada só na porta TCP do protocolo aprovado (a porta GT06 é HIPÓTESE);
- sg-traccar: entrada da porta do protocolo só do sg-nlb, e da web/REST só do sg-erp-worker, nunca do NLB; saída só para 3200→sg-erp-ingest, 5432→sg-rds-traccar e 443→sg-endpoints;
- sg-erp-ingest: 3200 só do sg-traccar; o ALB público vai só à 3000 (§6.2:901-902);
- sg-rds-traccar: 5432 só do sg-traccar.
O ERP não recebe credencial do banco do Traccar e lê o trajeto pela REST (pergunta F-2).
Segredo do forward: no Secrets Manager. No Traccar entra como FORWARD_HEADER por variável de ambiente, com CONFIG_USE_ENVIRONMENT_VARIABLES=true (pesquisa:214), nunca no traccar.xml (pesquisa:278). No ERP entra como TRACCAR_FORWARD_SECRET_CURRENT/PREVIOUS (§4.1:527-528). A credencial REST vai só ao papel do worker. Rotação: o Traccar precisa de novo deploy; o ERP aceita o segredo anterior por até 72 h.
O texto pressupõe D2=a, ERP na mesma VPC. Uma ponte para o Fly fere o 'sem saída' (F-1).
comando citado: ler_arquivo {"caminho": "docs/revisoes/TRACCAR/PLANO_TRACCAR.md", "linha_inicial": 811, "max_linhas": 350}
saída citada:
899: Traccar em ECS/Fargate em subnet privada, banco do Traccar em RDS PostgreSQL dedicado, Secrets Manager; 902: sem ALB/NLB público; 912-914: NLB público por protocolo só nasce depois de ... threat model próprio e junta unânime. Este plano autoriza só OsmAnd
```

#### Achado 2 — gravidade: nota · escopo: dentro-do-bloco · linha: 1126 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #13

```
arquivo: docs/revisoes/TRACCAR/PLANO_TRACCAR.md
motivo: A-2 (a), B-TRC-06 e threat model.
O B-TRC-06 (1109-1134) ganha:
- prova de que a tabela de rotas da privada-traccar não tem 0.0.0.0/0 e de que a tarefa não alcança a internet;
- os endpoints e o espelho no ECR conferido por digest;
- SG negativo da web/REST do Traccar a partir do NLB, da internet e da sub-rede do ALB;
- o NLB expondo só a porta aprovada;
- expurgo de 90 dias e backup/restore do RDS do Traccar.
O NLB só é ligado depois de um gate próprio, G-TRC-NLB: decisão escrita, threat model e junta 5/5.
O §5.1 (834-835) passa a ter a fronteira internet→NLB→porta do protocolo. Linhas novas do STRIDE:
- DoS no decodificador: protocols.enable restrito (pesquisa:174);
- spoofing de IMEI, já que o GT06 não autentica: registerUnknown=false, quarentena e plausibilidade, com risco residual declarado;
- comando perigoso (corte de motor) pela API de comandos: allowlist de tipo e de modelo;
- gasto do chip: teto;
- trajeto de um dono anterior vazando: recorte pelas janelas de vínculo, ver A-4;
- repúdio: log de comandos e trilha de consulta (Q10).
comando citado: ler_arquivo {"caminho": "docs/revisoes/TRACCAR/PLANO_TRACCAR.md", "linha_inicial": 811, "max_linhas": 350}
saída citada:
1122: IaC validate/plan; SG negativo; secret rotation; ... restore do banco Traccar; 1126: Security Group de entrada da porta de ingestão só a partir do SG do Traccar; 834-835: A porta de protocolo dos rastreadores físicos é outra fronteira e não é autorizada por este plano
```

#### Achado 3 — gravidade: nota · escopo: dentro-do-bloco · linha: 25 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #28

```
arquivo: src/modules/field-ops-realtime/field-ops-realtime.broker.ts
motivo: A-3 (b), modelo de dados mínimo. Muda o §3.1 (474: 'Não se cria VehicleLocation').
(1) Perfil de comunicação por modelo: catálogo global da plataforma, escrito só com a permissão platform: (D5). Guarda fabricante/modelo, protocolo, modo (automático por comando ou guiado), se há intervalo duplo nativo movimento/parado, mínimo/máximo, instruções guiadas versionadas, quem aprovou e quando.
(2) Comandos por nível, por modelo: nível, ordem, tipo (allowlist que proíbe corte de motor), modelo de texto sem segredo, resposta esperada e versão.
(3) Estado por VÍNCULO, tenant-scoped, com RLS: nível desejado e aplicado; estado aplicado, aguardando_aplicar, falhou, guiado_pendente ou divergente; tentativas; próxima tentativa; cadência observada; contadores do teto. Chavear pelo vínculo zera o estado quando o dono muda.
(4) Log de comandos, tenant-scoped, guarda de 90 dias: gatilho, alvo, resposta da REST, quando foi enviado e quando foi confirmado.
(5) Presença no Redis, que já existe (job.queue.ts:3), com TTL de ~90 s renovado pela tela a cada ~30 s. O broker em memória não serve: conta por organização, não por viatura, e não atravessa réplicas (broker.ts:25,62; §4.1:547-550). A trilha de Q10 fica em tabela própria, só de inclusão.
(6) O ERP grava o último ponto por viatura (só avança pelo fixTime), o trajeto resumido (pontos por tempo, distância ou mudança de rumo, com parâmetros a confirmar) e os recibos, tudo com 90 dias. Só no Traccar ficam: todos os pontos, os atributos e os campos pessoais do device (pesquisa:207), com 90 dias e backup. O expurgo nativo do Traccar é HIPÓTESE; se não existir, entra um job do DBA.
comando citado: ler_arquivo {"caminho": "src/modules/field-ops-realtime/field-ops-realtime.broker.ts"}
saída citada:
25: private readonly subscribersByTenant = new Map<string, Set<FieldOpsRealtimeSubscriber>>(); 62: subscriberCount(tenantId?: string): number
```

#### Achado 4 — gravidade: nota · escopo: dentro-do-bloco · linha: 26 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #32

```
arquivo: src/infra/jobs/job.queue.ts
motivo: A-4 (c), fluxo de troca de nível.
Gatilhos:
- presença criada → nível 1;
- presença expirada mais ~10 min de histerese → volta ao nível base;
- movimento ou parada → níveis 2/3. Se o modelo tem intervalo duplo nativo, o próprio aparelho troca, sem comando. Se não tem, o ERP envia, sob o teto.
Um reconciliador converge o estado desejado para o aplicado, com no máximo um comando em voo por rastreador, usando a fila com atraso que já existe (job.queue.ts:26-46).
Envio: pela REST do Traccar, a partir do worker. HIPÓTESE: a REST responde enviado ou 'enfileirado', se o aparelho estiver offline. 'Enfileirado' vira aguardando_aplicar, sem reenvio. Se não houver fila, novas tentativas com backoff até N, depois 'falhou'.
Confirmação: resposta commandResult (hipótese) OU cadência observada compatível em k fixes.
Regra: se o nível 1 for aplicado sem ninguém olhando, envia logo a restauração.
Teto, a confirmar: intervalo mínimo de 5 min entre comandos, até 2 subidas por hora e até 6 comandos por dia por rastreador. Ao bater o teto, fica no nível base, mostra o aviso e grava métrica.
Trajeto sob demanda: passa pelo ERP (o navegador nunca chama o Traccar, §2.3:408-409), recortado pelas janelas [valid_from, valid_to) da organização e pelas regras D4/D6. A leitura é limitada por usuário e não conflita com 'polling abaixo de 5 min' (1041), porque não é polling.
comando citado: ler_arquivo {"caminho": "src/infra/jobs/job.queue.ts", "max_linhas": 60}
saída citada:
26: const delayMs = options.delayMs ?? 0; 33: maxAttempts: options.maxAttempts ?? 3; 46: ZADD this.delayedKey
```

#### Achado 5 — gravidade: nota · escopo: dentro-do-bloco · linha: 1878 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #18

```
arquivo: docs/revisoes/TRACCAR/PLANO_TRACCAR.md
motivo: A-5 (d), API de comandos GT06 na 6.16.0: SEM CÓDIGO NO REPOSITÓRIO, sem arquivo:linha.
Tudo abaixo é HIPÓTESE, da memória do revisor e não verificada:
- o encoder GT06 aceitaria `custom` (texto livre do fabricante; o intervalo provavelmente vem por um texto do tipo TIMER da família Concox), além de engineStop/engineResume;
- haveria uma rota de envio e outra de tipos suportados por dispositivo, e uma fila para aparelho offline.
O B-TRC-03a precisa baixar o encoder GT06 e o recurso de comandos da tag v6.16.0, com arquivo:linha, e provar com o aparelho real: tipos, fila, resposta, intervalo duplo nativo e consumo de dados.
Como engineStop existiria no mesmo encoder, a allowlist do ERP é obrigatória. O §9.2:1698 passa a dizer: 'comando remoto, exceto os comandos de intervalo da allowlist aprovada pela plataforma'.
comando citado: buscar {"padrao": "Gt06|ProtocolEncoder|Command\\.TYPE|TYPE_CUSTOM|positionPeriodic|api/commands", "ignorar_caixa": true}
saída citada:
(nenhuma ocorrência; código 1). §11.4:1878-1883 lista os arquivos-fonte baixados: nenhum encoder de protocolo nem recurso de comandos
```

#### Achado 6 — gravidade: nota · escopo: dentro-do-bloco · linha: 25 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #20

```
arquivo: docs/revisoes/TRACCAR/G-TRC-PD-pesquisa.md
motivo: A-6, PD. Ligar o GT06 muda uma condição da PD aprovada (protocols.enable=osmand) e a linha 1295 da v2.1. É emenda da PD, com aprovação escrita do dono e o decodificador GT06 tratado como superfície de DoS (pesquisa:174). Até essa aprovação, o B-TRC-01 continua só com OsmAnd.
comando citado: ler_arquivo {"caminho": "docs/revisoes/TRACCAR/G-TRC-PD-pesquisa.md", "linha_inicial": 1, "max_linhas": 40}
saída citada:
25: `protocols.enable=osmand` (o padrão sobe os 266 protocolos com porta default), `database.registerUnknown=false` fora de dev
```

#### Achado 7 — gravidade: nota · escopo: dentro-do-bloco · linha: 1739 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #15

```
arquivo: docs/revisoes/TRACCAR/PLANO_TRACCAR.md
motivo: A-7 (e), blocos e estimativa. Tudo é hipótese, somada aos ~39–67 da v2.2.
- B-TRC-01: sem mudança; continua só OsmAnd e o último ponto.
- B-TRC-02: sem mudança.
- B-TRC-03a: vínculo pela plataforma, vínculo fixo, expediente, perfil por modelo, comandos por nível, código GT06 conferido e aparelho real; +3–4.
- B-TRC-03b: reconciliação REST, reconciliador de nível, presença no Redis, teto, log de comandos, último ponto e trajeto resumido; +2–3.
- B-TRC-04: tela de rastreamento com linha do trajeto sob demanda, aguardando_aplicar e trilha de consulta; +1–2.
- B-TRC-05: expurgo de 90 dias no ERP.
- B-TRC-06: sem NAT, endpoints, ECR, SG, expurgo e backup do RDS do Traccar; +1–2.
- G-TRC-NLB: novo, só documental, +1.
Total: ~45–76 dias úteis.
comando citado: ler_arquivo {"caminho": "docs/revisoes/TRACCAR/PLANO_TRACCAR.md", "linha_inicial": 1656, "max_linhas": 115}
saída citada:
1739: B-TRC-03 | 4–7; 1742: B-TRC-06 | 5–10; 1744: Total 26–46 dias úteis; 1698: corte de ignição, comando remoto
```

#### Achado 8 — gravidade: nota · escopo: pre-existente · linha: 885 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #13

```
arquivo: docs/revisoes/TRACCAR/PLANO_TRACCAR.md
motivo: Divergência que vem da v2.1 (9cb441bd): o overlay mapeia a web do Traccar para a 8080 do contêiner, mas o exemplo oficial citado pela pesquisa usa a 8082, e o traccar.xml de dev (1295) não define web.port. Conferir antes do B-TRC-01 e usar a mesma porta nos SGs de A-1.
comando citado: ler_arquivo {"caminho": "docs/revisoes/TRACCAR/PLANO_TRACCAR.md", "linha_inicial": 811, "max_linhas": 350}
saída citada:
885: `web` só com `--with-web`: ports: !override ["127.0.0.1:${TRC_WEB_PORT:-18080}:8080"]  — pesquisa:264: o exemplo de docker run ... publica `80:8082`
```

#### Achado 9 — gravidade: nota · escopo: dentro-do-bloco · linha: 212 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #30

```
arquivo: docs/revisoes/TRACCAR/PLANO_TRACCAR-EMENDA-v2.2.md
motivo: A-8 (f), perguntas que ficam para o dono.
F-1: confirma D2=a (ERP na mesma VPC)? Uma ponte para o Fly fere o 'sem saída'.
F-2: 'do banco do Traccar' quer dizer pela REST (recomendado) ou por SQL direto?
F-3: o nível 1 vale só na tela de rastreamento de uma viatura, ou também no mapa? O mapa é 'mais lento' e hoje faz polling a 30 s.
F-4: confirma os 3 níveis de 1–2, 3–5 e 15 min?
F-5: confirma o teto e a histerese de A-4?
F-6: aprova emendar a PD para ligar o GT06?
F-7: aceita a exceção 'comandos de intervalo' no §9.2:1698?
F-8: os backups do RDS guardam dado além de 90 dias. Qual guarda de backup?
F-9: G-TRC-NLB: modelo, porta e se há APN/VPN (§9.1:1669-1671).
comando citado: buscar {"padrao": "POLL|setInterval|EventSource|30_?000", "caminhos": ["frontend/src/modules/operations"]}
saída citada:
useOperationsMap.ts:9: const POLL_INTERVAL_MS = 30_000;
```

### Limitações

```
- O código-fonte do Traccar não está no repositório. O item (d) é inteiramente hipótese e não tem arquivo:linha.
- Nada foi executado: as verificações que rodam código não estavam permitidas.
- A porta padrão do GT06, a fila de comandos, o commandResult e o expurgo nativo do Traccar não foram verificados.
- As estimativas e os tetos são hipótese do revisor.
```

## Respostas do dono (2026-10-11), escritas pelo orquestrador

O dono respondeu *"Traccar: seguir recomendações"* e aprovou a PD com OsmAnd e GT06. O que vale para os blocos está em
`agent-orchestration/controle/decisoes.md`: `D-TRC-PD-APROVADA-2026-10-11` (as condições da PD) e
`D-TRC-ARQUITETURA-2026-10-11` (a arquitetura e as respostas). Em resumo:

- **F-1:** o ERP fica na mesma VPC.
- **F-2:** o trajeto vem pela REST, nunca por SQL.
- **F-3:** o nível 1 vale só na tela de rastreamento de uma viatura e no detalhe dela.
- **F-4:** os níveis são 1–2 min, 3–5 min e 15 min.
- **F-5:** valem o teto e a histerese do A-4, calibrados no B-TRC-03a.
- **F-6:** o GT06 entra na PD. O B-TRC-01 segue só com OsmAnd.
- **F-7:** a exceção cobre só os comandos de intervalo da allowlist. Nunca corte de motor.
- **F-8:** o backup guarda 14 dias.
- **F-9:** os modelos de rastreador seguem em aberto (`P-TRC-MODELOS-RASTREADOR`). Isso bloqueia o 03a e o `G-TRC-NLB`,
  mas não o B-TRC-01.

**[leitura do orquestrador]** A leitura dos 3 níveis, marcada "a confirmar" no cabeçalho desta emenda, está confirmada
pela F-4.
