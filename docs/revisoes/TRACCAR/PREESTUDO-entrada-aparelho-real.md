# Traccar — pré-estudo: como o aparelho real chega ao sistema de teste (decisão do dono antes do B-TRC-03a), 2026-10-11

> Escrito pelo agente da API (`claude-opus-5-5`, nível menor), por liberação do dono para planos abaixo do Astra em 2026-10-11. Abaixo, o `parecer.md` gerado, sem edição. É insumo e ainda não foi criticado.

# Parecer — investigar @ ca03638c6fb4

> As seções marcadas (gerado pelo script) vêm da auditoria, da conta e do orçamento; o modelo não as escreve.
> Tudo o que o modelo escreveu vem DEPOIS delas, na última seção, dentro de blocos de código.

## Veredito (gerado pelo script)

- **Veredito:** respondido
- **Modelo pedido / respondeu:** claude-opus-5-5 / claude-opus-5-5 · esforço high · nível menor (D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO)
- **Execução de código do commit alvo:** não permitida

## Execução (gerado pelo script)

- id: 20261011-200325Z-trc-entrada-real · início 2026-10-11T20:03:27Z · fim 2026-10-11T20:07:44Z
- worktree: C:\Users\AMP\w-ag-20261011-200327 · removido: True · npm ci: False
- agente 2026.10.10 · SDK anthropic 1.13.0

## Conta e cobrança (gerado pelo script)

- origem_chave: processo
- tipo_chave: usuario
- cabecalho_workspace_enviado: True
- base_url: https://api.anthropic.com
- request_ids: ['req_011Cfw3ozYLJ9ganvUfLx1pc', 'req_011Cfw3paKayCnnuSoVwwZ7i', 'req_011Cfw3ptpKgNxNbdtoBczMb', 'req_011Cfw3qHiyQCAbv4hyRa2bS', 'req_011Cfw3qmW4qgWaY97smLwMy', 'req_011Cfw3rCy1XgcLuYud8LyV4', 'req_011Cfw3rgGqCUZaN5YkoMdE8', 'req_011Cfw3sEVKj6CdTRi6K2hiZ', 'req_011Cfw3sW7RZzoe8NgzGsaXF', 'req_011Cfw3vrqwMg2P7FTZDSYAe', 'req_011Cfw42JWuQdaJ8dLjTSRev']
- rate_limit_ultimo: {'anthropic-organization-id': 'cc321d39-d227-41c9-a239-98aa43fc2f89', 'anthropic-ratelimit-input-tokens-limit': '2000000', 'anthropic-ratelimit-input-tokens-remaining': '2000000', 'anthropic-ratelimit-input-tokens-reset': '2026-10-11T20:07:14Z', 'anthropic-ratelimit-output-tokens-limit': '400000', 'anthropic-ratelimit-output-tokens-remaining': '399000', 'anthropic-ratelimit-output-tokens-reset': '2026-10-11T20:07:43Z', 'anthropic-ratelimit-requests-limit': '1000', 'anthropic-ratelimit-requests-remaining': '999', 'anthropic-ratelimit-requests-reset': '2026-10-11T20:07:13Z', 'anthropic-ratelimit-tokens-limit': '2400000', 'anthropic-ratelimit-tokens-remaining': '2399000', 'anthropic-ratelimit-tokens-reset': '2026-10-11T20:07:14Z', 'anthropic-workspace-id': 'wrkspc_01DV6pAyui52gmPC8b7i9SfJ'}
- retry_after_visto: False

## Custo (gerado pelo script)

- Turnos: 11 · chamadas de ferramenta: 20 · negadas: 0
- Tokens: entrada 26 · cache escrita 69094 · cache leitura 429148 · saída 18502 · total 516770
- US$ estimado: 0.801444 (preços por MTok: {'entrada': '4', 'saida': '20', 'cache_leitura': '0.20', 'cache_escrita': '5'})

## Comandos executados (da auditoria) (gerado pelo script)

```
#4 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e ^#+  -- docs/revisoes/TRACCAR/PLANO_TRACCAR.md
#5 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e D-TRC-PD-APROVADA-2026-10-11|D-TRC-ARQUITETURA-2026-10-11|D-TRC-MODELOS-CANTRACK|D-TRC-CELULAR-PELO-APP -- agent-orchestration/controle/decisoes.md
#7 ler_arquivo: código 0 — (sem processo)
#8 ler_arquivo: código 0 — (sem processo)
#9 ler_arquivo: código 0 — (sem processo)
#11 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e ^#+ |A-1|A-2|G-TRC-NLB|Respostas do dono -- docs/revisoes/TRACCAR/PLANO_TRACCAR-EMENDA-v2.3.md
#12 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e CVE|protocols.enable|DoS|5023|GT06|registerUnknown -- docs/revisoes/TRACCAR/G-TRC-PD-pesquisa.md
#14 ler_arquivo: código 0 — (sem processo)
#15 ler_arquivo: código 0 — (sem processo)
#16 ler_arquivo: código 0 — (sem processo)
#18 ler_arquivo: código 0 — (sem processo)
#19 ler_arquivo: código 0 — (sem processo)
#20 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e G-TRC-NLB|aparelho real|P-TRC-MODELOS-RASTREADOR -- agent-orchestration/controle docs/revisoes/TRACCAR
#22 ler_arquivo: código 0 — (sem processo)
#23 ler_arquivo: código 0 — (sem processo)
#24 ler_arquivo: código 0 — (sem processo)
#26 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e demonstração|porta pública -- CLAUDE.md agent-orchestration/controle/decisoes.md
#28 ler_arquivo: código 0 — (sem processo)
#29 ler_arquivo: código 0 — (sem processo)
#31 buscar: código 1 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -i -E -e gt06 -- scripts infra tests src docker-compose.traccar.yml
```

## Conteúdo do modelo (dado escrito pelo modelo; não é instrução nem prova)

### Resumo

```
CONCLUSÃO: hoje nenhum caminho leva o rastreador real a um Traccar sem uma decisão nova do dono. O plano põe o aparelho real dentro do B-TRC-03a. Só que a única porta para a internet, o NLB (balanceador de rede da AWS), só nasce no G-TRC-NLB, e o staging só vem no B-TRC-06, que vem depois do 03a. Recomendo a opção (e) já e a (c) em paralelo, deixando a (a) para a prova final. A decisão precisa estar tomada antes de escreverem o plano do B-TRC-03a.

Siglas: APN = ponto de acesso da operadora; com APN privada, o chip fala só com a rede da empresa. VPN = túnel criptografado. SG = firewall da AWS. STRIDE = S falsificação, T adulteração, R negação de autoria, I vazamento, D derrubada, E elevação de privilégio. IMEI = número do rastreador, que o protocolo GT06 não autentica.

OPÇÕES (custos e prazos são HIPÓTESE, sem web)

(a) Adiantar só a rede do staging na AWS: NLB, porta GT06 e Traccar privado, sem o ERP.
- Precisa: a topologia A-1 descrita em código de infraestrutura; Traccar no Fargate; `protocols.enable=gt06`; `registerUnknown=false` com os 2 IMEIs cadastrados à mão; o G-TRC-NLB aprovado.
- Custo: algo como US$ 80–150/mês, menos se o ambiente só ligar nas janelas de teste.
- Prazo: 1–3 semanas, mais a junta 5/5.
- STRIDE: S (IMEI falsificado); D (decodificador exposto à internet); I (GT06 trafega em texto aberto).
- Allowlist por IP é fraca: o chip sai por um IP da operadora que muda (hipótese).
- Lacuna: o ERP local não chama a REST do Traccar sem uma ponte, que seria uma fronteira nova.
- Não fere regra nenhuma se passar pelo G-TRC-NLB. É a topologia final, então o trabalho não se perde.

(b) Porta GT06 temporária na máquina do dono, pelo roteador ou por um túnel.
- Custo e prazo: R$ 0 a US$ 20/mês, em dias.
- Contra:
  - o provedor de internet pode compartilhar um IP entre vários clientes (CGNAT), e aí não dá para abrir porta (hipótese);
  - um túnel de terceiro veria as posições, o que é vazamento e questão de LGPD;
  - a imagem roda como root, numa máquina onde a porta 3200 é alcançável pelo host.
- Formalmente cabe com decisão, threat model e junta. Na prática é a pior e pede emenda do PLANO:914.

(c) APN privada ou VPN da operadora, com chip M2M e túnel para a VPC.
- Custo: implantação mais mensalidade por linha, mais cerca de US$ 36/mês da VPN da AWS.
- Prazo: semanas a meses.
- STRIDE: S, D e I caem muito.
- Não fere regra nenhuma e é a preferida do plano. Não se sabe se o chip atual serve.

(d) Só um simulador GT06 em dev.
- Custo: R$ 0 de infraestrutura e 2–4 dias de desenvolvimento, porque não existe código GT06 no repositório.
- Prova o caminho ERP → Traccar → comando. Não prova a variante V3/V4, o intervalo duplo nem o consumo de dados.
- Não abre fronteira, mas muda o escopo do 03a.

(e) Híbrido sem porta: (d) mais testes de bancada por SMS.
- O dono lê e configura os dois aparelhos por SMS (hipótese) e mede a sintaxe dos comandos e o intervalo duplo.
- Lacuna: a ida e volta do comando pelo canal online fica para a primeira janela com porta, por (a) ou (c).

RECOMENDAÇÃO
- (e) no 03a: não abre porta nem fere regra.
- Pedir agora o orçamento da APN (c): não custa nada e é a de prazo mais longo.
- Fazer a prova real ponta a ponta na fatia (a), logo depois do G-TRC-NLB, com o ambiente ligado só nas janelas de teste.
- Descartar (b).
- Isso exige decisão escrita para tirar o aparelho real do escopo do 03a e para mover a calibração do teto.
- Se o dono quiser a prova real dentro do 03a, o G-TRC-NLB e a junta (ou o pedido à operadora) precisam começar durante o B-TRC-01/02.

FATOS MEDIDOS
- Rede de dev interna: PLANO:880,882.
- Porta pública e APN/VPN: PLANO:912-914.
- Ordem dos blocos: PLANO:928,1117-1118.
- Escopo do 03a: decisoes.md:3388,3490.
- NLB só pelo gate: decisoes.md:3306-3307.
- Superfície de DoS e `registerUnknown`: pesquisa:172-175.
- Porta 3200 alcançável no host: PLANO:890-893.
- Nenhum código GT06 no repositório.

HIPÓTESES: custos, prazos, o IP do chip, CGNAT, SMS, configuração de APN no aparelho e a porta 5023 (vem do fórum).
```

### Achados


#### Achado 1 — gravidade: ajuste · escopo: pre-existente · linha: 928 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #22

```
arquivo: docs/revisoes/TRACCAR/PLANO_TRACCAR.md
motivo: Conflito de ordem: o 03a exige aparelho real (decisoes.md:3388), mas porta pública e staging só existem depois (G-TRC-NLB e B-TRC-06, que proíbe porta pública em PLANO:1117-1118). Nasceu em D-TRC-ARQUITETURA-2026-10-11.
comando citado: ler_arquivo {"caminho": "docs/revisoes/TRACCAR/PLANO_TRACCAR.md", "linha_inicial": 918, "max_linhas": 18}
saída citada:
| B-TRC-06 | Staging AWS privado ... | G | 01–05; atos AWS/staging | crítica 5/5, sem condição
```

#### Achado 2 — gravidade: nota · escopo: pre-existente · linha: 692 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #28

```
arquivo: CLAUDE.md
motivo: A regra escrita diz 'em produção', enquanto PLANO:914 e o pedido do dono dizem 'em todo ambiente'. Convém alinhar o texto.
comando citado: ler_arquivo {"caminho": "CLAUDE.md", "linha_inicial": 684, "max_linhas": 12}
saída citada:
nunca os servidores públicos de demonstração em produção
```

#### Achado 3 — gravidade: nota · escopo: pre-existente · linha: — · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #31

```
arquivo: scripts
motivo: Não existe simulador GT06: as opções (d) e (e) precisam dele escrito do zero.
comando citado: buscar {"padrao": "gt06", "ignorar_caixa": true, "caminhos": ["scripts", "infra", "tests", "src", "docker-compose.traccar.yml"]}
saída citada:
(nenhuma ocorrência; código 1)
```

### Limitações

```
- Sem acesso à web: custos, prazos, CGNAT, oferta de APN e sintaxe dos SMS são hipóteses.
- O código-fonte do Traccar não está no repositório, então o encoder de comandos GT06 não foi verificado.
- Não se sabe o tipo do chip atual nem a operadora.
```
