# As Interfaces dos 10 Principais SaaS de Supervisão de Refrigeração: Um Estudo Multi-Caso com Análise Cognitiva

**Versão 1.0 · 11/07/2026 · Autoria: pesquisa conduzida para o projeto Kryos V-1.0**

---

## Resumo

Este estudo examina, com método explícito e evidência rotulada, as interfaces dos dez principais SaaS de supervisão de refrigeração do mundo: o que cada tela mostra, como cada interface sustenta a consciência situacional do operador, como cada produto administra o problema clássico de fadiga de alarme, e onde reside a inteligência cognitiva — tanto no produto quanto no site comercial que o vende. As fontes triangulam sites oficiais, help centers com documentação tela-a-tela, manuais técnicos, descrições de vídeos oficiais no YouTube, fóruns de técnicos (HVAC-Talk) e imprensa especializada brasileira, ancoradas por um dado primário raro: a dissecação, arquivo por arquivo, do código do webapp do supervisório líder (Carel boss/PlantVisorPRO), realizada em estudo anterior deste mesmo programa de pesquisa. O resultado central é a identificação de um **repertório canônico de nove telas** que emergiu por convergência evolutiva em todos os dez produtos, um conjunto de **micro-interações de estado de alarme** que constituem a fronteira real de qualidade entre os produtos, e a constatação de que a inteligência cognitiva do setor está migrando do nível do dado para o nível do diagnóstico — sem que nenhum player tenha fechado o ciclo de ação governada que o Kryos propõe.

---

## 1. Perguntas de pesquisa

- **RQ1.** Que telas compõem o repertório de interface desses produtos, e o que cada uma mostra?
- **RQ2.** Como cada interface sustenta os três níveis de consciência situacional (percepção, compreensão, projeção) do operador de refrigeração?
- **RQ3.** Que mecanismos cada produto emprega contra a fadiga de alarme, o problema cognitivo central da categoria?
- **RQ4.** Onde reside a inteligência de cada produto — na escada que vai do dado bruto ao diagnóstico acionável — e como o site comercial de cada um constrói persuasão?
- **RQ5.** Que implicações de design derivam disso para o Kryos V-1.0?

## 2. Método

**Corpus.** Dez produtos, selecionados por liderança global e diversidade de segmento dentro de refrigeração/cadeia do frio: Carel (boss/RemotePRO/RED), Danfoss Alsense, Copeland/Emerson (E2/E3/Site Supervisor + ProAct), SmartSense by Digi, AKO (AKONET.Cloud), Full Gauge (Sitrad Pro) — dominante no Brasil —, Eliwell/Schneider (AIR), Sensitech/Carrier (ColdStream), ORBCOMM (cold chain) e Monnit (iMonnit).

**Fontes e triangulação.** Quatro camadas, em ordem decrescente de força probatória: (1) **código-fonte real** — o webapp do Carel boss dissecado no estudo `estudo-webapp-carel-boss.md`, único caso em que a interface foi lida no nível do template e do binding; (2) **documentação tela-a-tela de help center** — SmartSense e AKO publicam manuais operacionais que descrevem cada tela, botão e estado; (3) **material oficial** — páginas de produto, manuais PDF (Emerson E2/Site Supervisor), playlists de tutorial no YouTube (AKO publica série cobrindo acesso, menus principais, grupos, alarmes, regras de notificação e relatórios; Danfoss publica demonstrações do dashboard) e imprensa especializada brasileira (Revista do Frio, com declarações de executivos da Full Gauge, Carel e Danfoss); (4) **voz da comunidade técnica** — fóruns como HVAC-Talk, onde técnicos discutem as interfaces que operam diariamente.

**Rotulagem de evidência.** Toda afirmação carrega um de três rótulos: **[medido]** — lido em código ou documento técnico verificável; **[documentado]** — afirmado em documentação/manual/help center oficial; **[inferido]** — deduzido de convenção da categoria, sem captura direta. Vídeos do YouTube não foram assistidos quadro a quadro; o que deles se usa vem de títulos, descrições e cobertura textual associada, e é rotulado [documentado] no máximo.

**Limitações.** As telas internas de Alsense, ColdStream, ORBCOMM, Eliwell AIR e Bitzer BDN ficam atrás de login corporativo; para esses, a granularidade de tela é menor e o rótulo [inferido] aparece com mais frequência. Material de marketing tem viés de autoapresentação; onde só há marketing, o estudo o diz. A amostra de fórum é anglófona (HVAC-Talk) e centrada em Emerson; a voz do técnico brasileiro chega mediada pela imprensa especializada.

## 3. Moldura teórica

Quatro lentes estruturam a análise:

**Consciência situacional (Endsley).** O modelo canônico para interfaces de supervisão define três níveis: **Nível 1 — percepção** dos elementos (a temperatura da câmara 3 agora); **Nível 2 — compreensão** do que significam (está 4°C acima do limite há 12 minutos, e não é degelo); **Nível 3 — projeção** do que vai acontecer (nesse ritmo, o produto sai da faixa segura em 40 minutos). Uma tela de supervisão é boa na medida em que eleva o operador de nível com o mínimo de esforço.

**Carga cognitiva (Sweller).** Todo elemento na tela consome memória de trabalho. A carga *intrínseca* (a complexidade real da planta) não pode ser removida, mas a *extrínseca* (ruído de apresentação) sim. A tese "insight acionável, não dashboard poluído", repetida pelo setor, é uma formulação vernacular exata da minimização de carga extrínseca.

**Gestão de alarmes (ISA-18.2 / EEMUA 191).** As normas industriais de alarme estabelecem que alarme existe para provocar *ação* do operador; alarme sem ação correspondente é ruído que treina o operador a ignorar — a **fadiga de alarme**, causa documentada de acidentes industriais. Os mecanismos que as normas prescrevem (racionalização, priorização, supressão por estado conhecido, escalonamento) aparecem — ou faltam — em cada produto analisado.

**Arquitetura de persuasão do site.** O site comercial é ele próprio uma interface com objetivo cognitivo: converter visitante em lead. A análise usa os conceitos de prova social, ancoragem por autoridade (Azure, NIST, certificações), fricção deliberada (demo-gating, preço oculto) e trilha de escassez informacional.

---

## 4. Análise por produto

### 4.1 Carel boss/PlantVisorPRO — o único caso [medido] no nível do código

Síntese do estudo primário (detalhe completo em `estudo-webapp-carel-boss.md`): a home é o mapa sinótico da planta, não um menu — filosofia planta-primeiro. Navegação em 9 domínios (Plant, Alarm/Event, Energy, HVAC, Scheduler, Report, Configuration, Tools, Quick Links). O detalhe de dispositivo é composto por slots configuráveis (área principal RO, área RW, régua de sondas, tabela completa) onde cada variável é *posicionada* pelo integrador. O binding de estado usa enumeração por posição com fragmento default obrigatório — toda leitura tem estado "sem dado" desenhado. O sino global de alarme tem **três estados** (sem alarme, alarme, alarme escalonado pelo watchdog Guardian) com som local opcional. Relatórios de energia com semana ISO-8601 e dado ausente como `***`. Kiosk é modo de primeira classe. Antipadrão central: três motores de UI acumulados em vinte anos de evolução.

**Leitura cognitiva:** o boss é forte em Nível 1 de SA (percepção densa, sinóticos) e razoável em Nível 2 (Guardian distingue "alarme" de "alarme que ninguém tratou"); quase não oferece Nível 3 (projeção) — não há tendência preditiva nativa. A fadiga de alarme é atacada por priorização e escalonamento, mecanismos ISA-18.2 clássicos, implementados antes de a norma popularizá-los.

### 4.2 SmartSense by Digi — a documentação tela-a-tela mais rica [documentado]

O help center da SmartSense descreve cada tela operacional, o que permite reconstruir o produto com precisão incomum:

- **Home/Dashboard:** retrato do estado da conta em dois blocos — Incidentes e Ativos. Seletor de hierarquia no canto superior esquerdo (dropdown + busca + botão de hierarquia com filtro por nome/número) — a hierarquia multi-site é o primeiro controle da interface, não um filtro escondido.
- **Aba Assets:** tabela com localização, incidentes ativos, última leitura (data/hora), temperatura atual e **máxima/mínima de 24h** — o par máx/mín de 24h eleva o operador do Nível 1 ao 2 de SA sem clique algum: a linha já diz se o ativo *esteve* em risco hoje.
- **Asset Details:** gráfico interativo com janelas fixas (Hoje, Ontem, 7 dias, Último mês — e nada além de um mês, limite explícito), com **linhas horizontais de limiar de alarme desenhadas sobre o gráfico** (vermelha alta, azul baixa) — a codificação mais eficiente possível de Nível 2: o olho vê a distância entre a curva e o limite sem ler número algum. Abaixo: histórico do ativo, sensores (com sinal, bateria, porta, ID e **data de vencimento da calibração + link para o certificado NIST**), e alarmes configurados.
- **Aba Incidents:** incidentes de alta severidade como **tiles destacados no topo**; abaixo, a lista completa com tipo, local, ID numérico único, **severidade em barras de 1 a 5**, hora do gatilho e responsável. ACK com máquina de estados visual: ícone **azul → verde** ao reconhecer; estados New/Closed/On Hold; atribuição a usuário; botão **Corrective Actions** abrindo caixa de texto de ação tomada — o fechamento do ciclo alarme→ação documentada que a ISA-18.2 pede e que quase nenhum concorrente implementa como objeto de primeira classe.
- **Mobile:** cinco abas por ativo (Details, Alarms, Incidents, Sensors, History), gráficos de tendência horária ajustáveis (6/12/24h) com as mesmas linhas de limiar; status do ativo por cor.
- **Inteligência:** o produto nomeado SmartSense IQ aplica detecção de anomalia, **risk scoring** e apoio à decisão — nível 4-5 da escada cognitiva; a temperatura simulada de produto (patenteada) é projeção genuína de Nível 3 de SA: modela o que o *produto* está sentindo, não o ar.

**Leitura cognitiva:** SmartSense é o produto com o ciclo ISA-18.2 mais completo da amostra (alarme → incidente → ACK visual → ação corretiva → relatório de incidentes abertos exportável), e o único que transforma calibração em elemento visível da tela do ativo.

### 4.3 AKO AKONET.Cloud — micro-interações de frescor e faixa [documentado]

A ajuda oficial do AKONET revela codificações visuais originais:

- **Widget de dispositivo:** cada equipamento é um cartão ("widget") que **pisca por um minuto quando dados novos chegam**, exibindo nesse intervalo a medição instantânea e voltando depois às médias — frescor do dado comunicado por movimento, sem texto. Passar o mouse mostra a hora da última sincronização.
- **Codificação de faixa:** área **hachurada** = faixa total de medição do dispositivo; área **sólida** = faixa real de trabalho (máx/mín atingidos no período) — dois retângulos sobrepostos dizem, sem número, "onde este ativo pode operar" e "onde ele de fato operou".
- **Máquina de estados do alarme no contorno do widget:** contorno piscando em vermelho = alarme ativo; confirmado (mute) = contorno apaga; **halo vermelho intermitente = alarme não confirmado** — o estado de reconhecimento vive na borda do cartão.
- **Telas analíticas:** Tempo em Setpoint (% do dia dentro, acima e abaixo), histograma TTI (distribuição do tempo por valor versus setpoint), resumo HACCP (máximas por hora versus limiar) e tempo total em alarme por dia — quatro visões que são todas Nível 2 de SA: transformam série bruta em julgamento ("este ativo passa 12% do dia acima do setpoint").
- **Estrutura:** grupos por estabelecimento, região, refrigeração positiva/negativa e áreas internas; app iOS/Android; menus documentados em playlist de tutoriais (acesso, menus, grupos, alarmes, regras de notificação, relatórios por família de dispositivo).

**Leitura cognitiva:** AKO é o produto com a linguagem visual mais *semanticamente densa* da amostra — cada pixel do widget codifica algo (frescor, faixa, estado de ACK) — mantendo carga extrínseca baixa porque a codificação é consistente.

### 4.4 Danfoss Alsense — curadoria e a tela única de energia [documentado]

- Tese explícita de produto: insights relevantes e digeríveis em vez de dashboards poluídos — a formulação mais direta de minimização de carga extrínseca do setor.
- **Flex Dashboard** (nomeado em webinar oficial): dashboard personalizável; **Alarm Rules** e **Performance Rules** como objetos distintos — separar "regra de alarme" de "regra de desempenho" é uma decisão taxonômica que reduz fadiga: nem todo desvio vira sino.
- **Dashboard de energia em uma tela** (demonstração em vídeo oficial na EuroShop): números-chave consolidados com **destaque automático do que importa** — um alarme disparado ou uma temperatura fora do padrão sobem visualmente sem o usuário procurar. É Nível 2 de SA automatizado: a interface faz a compreensão e entrega o resultado.
- **AlarmHub:** captura e priorização enterprise, rastreio de resolução, identificação de lojas/ativos outliers, notificação conforme o processo do cliente — gestão de alarme como fluxo corporativo, não lista local.
- Hubs documentados: energia (tendências de medidor principal/sub-medidores, perfil por uso — refrigeração/HVAC/iluminação —, estimativa de custo), food safety (captura enterprise de temperatura, exceções por tipo de alimento, **relatório HACCP diário gerado e distribuído automaticamente**, reconhecimento de exceções que afetam integridade do dado), manutenção (benchmark de setpoints para achar desvios entre lojas).
- Serviço gerenciado: centrais de monitoramento 24/7 que alarmam a loja, fazem reparo remoto e despacham técnico — o "dispatch" existe como serviço humano da Danfoss, não como tela do cliente.

**Leitura cognitiva:** Alsense aposta que o cliente enterprise não quer *ver mais*, quer *decidir mais rápido* — terceiriza a percepção (Nível 1) para o monitoramento 24/7 e entrega ao gestor apenas Níveis 2-3 (outliers, tendências, recomendação).

### 4.5 Copeland/Emerson (E2/E3/Site Supervisor + ProAct) — o legado e a voz do técnico [documentado + fórum]

- **E2** é um controlador com interface própria de teclas de função e telas hierárquicas de setup (manual de operação documenta navegação por Setup Screens, entrada de setpoints e tecla de ajuda por propriedade) — a geração de interface pré-web que ainda domina milhares de lojas.
- **Voz do técnico (HVAC-Talk):** na comparação entre gerações de controladores da mesma família, o técnico elogia a mais nova exatamente porque configura uma aplicação em uma única tela em vez de saltar entre várias, e porque online consegue **sobrescrever e mudar setpoints com muito menos fricção**. Essa é a hierarquia real de valores do usuário técnico: menos navegação para configurar, escrita de setpoint rápida. Nenhum material de marketing do setor diz isso com tanta clareza quanto um fórum.
- **Site Supervisor/E3:** interface web via navegador; tela Home após login; perfis de usuário; **unidades de engenharia padrão derivadas do idioma escolhido** e personalizáveis por usuário — internacionalização levada até a unidade física.
- **ProAct + Smart Alarms:** alarmes que identificam causas potenciais e sugerem ação de alta probabilidade de resolução — o Nível 5 da escada cognitiva (diagnóstico acionável) mais explícito da amostra, e recepção multi-fabricante (BAS) com priorização e análise centralizada.

**Leitura cognitiva:** a linha Copeland mostra as três eras convivendo — tela de teclas (E2), web local (E3/Site Supervisor) e nuvem com diagnóstico (ProAct). A lição de fadiga vem do fórum: o técnico não pediu mais dados, pediu menos telas entre ele e o setpoint.

### 4.6 Full Gauge Sitrad Pro — o incumbente brasileiro [documentado + imprensa]

- Mostra em tempo real todas as variáveis dos instrumentos: status operacional nomeado no vocabulário do frio (**refrigeração, degelo, pós-degelo, modo eco, turbo**), temperaturas por sensor, alteração remota de parâmetros, erros e alarmes tipificados (sensor com problema, alta/baixa temperatura, alta/baixa tensão, porta aberta) e histórico das atividades.
- Relatórios gráficos e de texto, alarmes programáveis, **níveis de acesso** e app Sitrad Mobile; alertas para celulares cadastrados quando variáveis saem do padrão.
- **Caso real de diagnóstico via interface** (imprensa especializada): encarregado de manutenção, olhando relatórios gráficos nas primeiras horas de uso, identificou que a resistência de degelo não completava o processo e estava causando perda de sorvetes — trocou por resistência mais potente. Esse episódio é um *cognitive walkthrough* espontâneo de Nível 2→3: o gráfico permitiu compreender a causa e projetar a solução.
- Modelo arquitetural: servidor local + acesso remoto — a geração anterior à nuvem nativa, e a razão de o Sitrad ser simultaneamente o mais instalado e o mais vulnerável a substituição.

### 4.7 ORBCOMM — a supervisão em movimento [documentado]

- Plataforma de cadeia fria para reboques/contêineres: **mapa da frota** como tela central, posição + estado do equipamento de refrigeração em trânsito, **gráficos dinâmicos de temperatura fáceis de compartilhar** (o gráfico como artefato de handoff entre embarcador e recebedor), detecção de abertura de porta com hora e local.
- **Comando bidirecional completo documentado**: ligar/desligar unidade, verificar e limpar alarmes, ajustar setpoint e modo de operação, iniciar degelo e teste pré-viagem — tudo remoto, tudo registrado.
- Hardware com até 3 zonas de temperatura por unidade e reporte por bateria por até 10 dias sem alimentação externa.

**Leitura cognitiva:** ORBCOMM demonstra que o comando remoto governado (o que o Kryos chama de canal `kryos.edge`) já é prática madura no transporte — o varejo fixo é que ficou para trás.

### 4.8 Eliwell AIR, Bitzer BDN e Monnit iMonnit — cobertura menor, padrões confirmatórios [documentado fino / inferido]

- **Eliwell AIR (Schneider):** módulo de borda plug-and-play com geolocalização automática do equipamento; módulo HACCP com registro de temperatura e alarme totalmente automático, sempre disponível em PDF/CSV pronto para inspeção. Telas específicas não publicadas [inferido: app mobile-first com lista de equipamentos e detalhe simples].
- **Bitzer BDN:** visão panorâmica → análise detalhada (a metáfora *bird's-eye* explícita), gestão de componentes, sistemas e sites inteiros, upload de documentos e **rastreio de atividades de serviço vinculadas ao ativo** — o prontuário do equipamento. Gratuito para quem compra compressor Bitzer (modelo OEM).
- **Monnit iMonnit:** dashboards flexíveis, exportação irrestrita, API/webhooks, configuração para **ignorar ciclos de degelo e abertura de porta** nas regras de alarme (supressão por estado conhecido — mecanismo ISA-18.2 nomeado no marketing), log automático HACCP/21 CFR Part 11.

---

## 5. Síntese cruzada I — o repertório canônico de nove telas (RQ1)

A convergência entre os dez produtos é forte o bastante para afirmar que existe uma **gramática de telas da categoria**, que nenhum entrante pode ignorar e sobre a qual a diferenciação acontece nos detalhes:

| # | Tela canônica | Evidência mais forte | O que mostra (invariantes) |
|---|---|---|---|
| 1 | **Login + hierarquia** | SmartSense [documentado], boss [medido] | Autenticação; seleção de site/hierarquia como primeiro controle pós-login |
| 2 | **Dashboard/estado da conta** | SmartSense, Alsense, AKO [documentado] | Resumo em dois eixos: incidentes ativos × ativos; destaque automático do anômalo |
| 3 | **Lista de ativos** | SmartSense [documentado], Sitrad [documentado] | Nome, local, valor atual, última leitura, máx/mín de 24h, estado por cor |
| 4 | **Detalhe do ativo** | boss [medido], SmartSense, AKO [documentado] | Gráfico com limiar desenhado; janelas fixas de tempo; sensores com saúde (sinal/bateria/calibração); alarmes configurados; histórico |
| 5 | **Inbox de incidentes/alarmes** | SmartSense [documentado], boss [medido] | Alta severidade destacada no topo; linhas com tipo/local/ID/severidade/hora/responsável; ACK visual; ação corretiva |
| 6 | **Sinótico/mapa** | boss [medido], ORBCOMM [documentado] | Planta gráfica (fixo) ou mapa geográfico (móvel/multi-site) com estado ao vivo |
| 7 | **Energia/analítica** | Alsense, AKO, boss [documentado/medido] | Consumo por hierarquia, tempo-em-setpoint, comparações, custo estimado |
| 8 | **Relatórios/compliance** | Alsense, Eliwell, Monnit [documentado] | HACCP automático diário, PDF/CSV, excursões, prontos para inspeção |
| 9 | **Configuração** | AKO (tutoriais), Site Supervisor [documentado] | Dispositivos, regras de alarme, regras de notificação, usuários/papéis, unidades por idioma |

Duas telas emergentes ainda não universais completam o repertório: **comando remoto governado** (ORBCOMM, boss, Sitrad — escrever setpoint/degelo com registro) e **ação corretiva** (SmartSense como objeto; TempGenius idem) — exatamente as duas que o inventário do Kryos já incorporou como diferenciais.

## 6. Síntese cruzada II — análise cognitiva (RQ2, RQ3)

### 6.1 Consciência situacional: onde cada nível é servido

- **Nível 1 (percepção)** é commodity: todos mostram valor atual com cor de estado. A diferenciação está na *densidade honesta* — o par máx/mín de 24h da SmartSense e a área sólida-sobre-hachurada do AKO entregam percepção do período inteiro numa única linha/cartão.
- **Nível 2 (compreensão)** é onde os líderes trabalham: limiar desenhado sobre o gráfico (SmartSense), tempo-em-setpoint e histograma TTI (AKO), destaque automático do anômalo (Alsense), Guardian distinguindo alarme tratado de abandonado (Carel). O padrão comum: **pré-computar o julgamento** e mostrar o resultado, não os insumos.
- **Nível 3 (projeção)** é a fronteira rala: temperatura simulada de produto (SmartSense, patenteada), predição de falha por ML (Carel RED, corporativo), risk scoring (SmartSense IQ). Nenhum produto mostra ao operador comum uma projeção do tipo "sai da faixa em ~40 min" — a lacuna de Nível 3 no plano operacional está aberta na categoria inteira.

### 6.2 Fadiga de alarme: o repertório de mecanismos observado

Mapeando contra ISA-18.2/EEMUA 191, a amostra exibe seis mecanismos, nenhum produto com todos:

1. **Priorização visível** (severidade em barras 1–5 na SmartSense; prioridades com política por nível no boss) — universal nos líderes.
2. **Supressão por estado conhecido** (ignorar degelo/porta aberta: Monnit nomeia; Sitrad tipifica os estados; boss configura por regra) — o antídoto número um do falso positivo em refrigeração.
3. **Escalonamento por não-tratamento** (Guardian no boss, distinto até no ícone; cadeia de notificação da Alsense conforme processo do cliente).
4. **ACK como máquina de estados visual** (azul→verde SmartSense; halo intermitente até confirmar no AKO) — o estado de reconhecimento *mora na interface*, não num log.
5. **Separação alarme × desempenho** (Alarm Rules vs Performance Rules na Alsense) — nem todo desvio toca sino; parte vira insight assíncrono.
6. **Fechamento com ação corretiva** (SmartSense; TempGenius) — o alarme só "termina" quando alguém documenta o que fez.

A voz do técnico no fórum acrescenta o sétimo mecanismo, que nenhuma norma formaliza: **reduzir o número de telas entre o técnico e o setpoint**. Fricção de navegação é fadiga também.

### 6.3 Micro-interações que constituem a fronteira de qualidade

Três achados desta pesquisa merecem status de padrão a adotar: o **widget que pisca um minuto ao receber dado fresco** (AKO) — frescor como movimento, resolvendo a pergunta silenciosa "isso está atualizado?"; a **linha de limiar desenhada no gráfico** (SmartSense) — compreensão sem leitura numérica; e o **contorno do cartão como estado de ACK** (AKO) — o não-reconhecido nunca descansa visualmente. São detalhes de custo baixo e efeito cognitivo alto.

## 7. Inteligência cognitiva do produto e do site (RQ4)

### 7.1 A escada, posicionada por produto

Aplicando a escada de 7 níveis (dado→estado→alarme priorizado→insight→score preditivo→diagnóstico acionável→ação governada) definida nos estudos anteriores: Sitrad e Monnit operam nos níveis 1–3; AKO e Eliwell nos 2–3 com analítica forte de Nível 2; boss/RemotePRO nos 2–4 (Guardian, energia) com RED tocando o 5 via ML corporativo; Alsense nos 3–5 (outliers, destaque automático, serviço gerenciado); ORBCOMM nos 3 e 6-execução (comando remoto maduro, sem diagnóstico); SmartSense nos 4–5 (risk scoring, simulação de produto, prescriptive workflows); Copeland ProAct no 5 mais explícito (causa provável + ação sugerida). **Nenhum fecha o 6 completo** — recomendação → validação de política → execução → aprovação humana com registro auditável — que é a tese do Kryos.

### 7.2 A inteligência do site comercial

Os dez sites compartilham uma arquitetura de persuasão identificável: **ancoragem por autoridade técnica** (Azure na Danfoss, NIST na SmartSense/Dickson, certificação HACCP na Carel — o selo terceirizado como redutor de risco percebido); **prova social por logotipo e escala** (250 sites/dia na SmartSense; 150k instalações na Copeland); **educação como captura** (playlists de tutorial da AKO e webinars da Alsense funcionam como onboarding antes da compra — quem aprendeu a usar já meio comprou); e **fricção deliberada no preço** (demo-gating universal nos enterprise; só o self-service americano publica número — achado do estudo de preços anterior). A exceção instrutiva é a Bitzer: preço zero como estratégia de retenção de hardware — o site nem tenta vender o software, vende o ecossistema.

## 8. Implicações para o Kryos (RQ5)

1. **O repertório de 9 telas está validado** — o inventário de 15 telas do `frontend-product-requirements.md` cobre as nove canônicas e as duas emergentes; nenhuma tela nova é necessária, e nenhuma das existentes é supérflua.
2. **Adotar as três micro-interações de fronteira** (pulso de frescor no cartão; limiar desenhado no gráfico; estado de ACK na borda) — candidatas a novos requisitos RFF-MON/RFF-ALM de baixo custo e alto efeito.
3. **Atacar a lacuna de Nível 3 operacional**: projeção simples ("no ritmo atual, fora da faixa em ~N min") no cartão em alarme — nenhum concorrente entrega isso ao operador comum; o Kryos tem a série temporal para calcular.
4. **Separar regra de alarme de regra de desempenho** (lição Alsense) no alert-engine — reduz fadiga por taxonomia, antes de qualquer IA.
5. **Máx/mín de 24h na linha do ativo** (lição SmartSense) — Nível 2 de SA de custo trivial.
6. **A voz do técnico como requisito**: contar cliques entre login e escrita de setpoint governada; se passar de três telas, a fricção vira argumento de venda do concorrente.
7. **O site do Kryos** deve herdar a arquitetura de persuasão com uma inversão deliberada: preço publicado como diferencial de transparência (consistente com a recomendação do estudo de precificação), mantendo autoridade técnica (HACCP, decision ledger auditável) como âncora.

## 9. Ameaças à validade

Granularidade desigual entre produtos (código no Carel; help center na SmartSense/AKO; marketing nos demais) pode inflar a avaliação dos mais documentados — mitigada pela rotulagem explícita, não eliminada. Vídeos não assistidos quadro a quadro. Fóruns amostrados em inglês, centrados em Emerson. Datas de captura: julho/2026; interfaces SaaS mudam sem changelog público. Este estudo descreve o estado observável das interfaces, não mede desempenho de operadores — as leituras cognitivas são análise fundamentada em teoria, não experimento com usuários; a validação experimental (teste de usabilidade com técnicos brasileiros) é o próximo passo natural quando o Kryos tiver protótipo navegável.

## 10. Fontes

Danfoss (páginas Alsense food retail/food service, vídeo EuroShop, LinkedIn oficial, SiteService); SmartSense by Digi (help center: Web App Responder Guide, Asset Management, Incident Management, Open Incidents Report, mobile app; páginas de produto e FAQ); AKO (help akonet — AKOCONTROL, tutoriais AKONET.Cloud, catálogo Pecomark 2022, páginas de monitorização); Emerson/Copeland (manual E2 845-1100, Site Supervisor Quick Setup/User Guide, boletim de integração X-Line, HVAC-Talk threads 159203 e 663241, páginas ProAct); Full Gauge/Sitrad (guia do usuário, sitrad.com.br, Revista do Frio, Thermo King newsroom); ORBCOMM e Sensitech (páginas cold chain, coberturas de mercado); Eliwell (páginas AIR/HACCP); Bitzer (BDN); Monnit (páginas iMonnit); estudos internos anteriores: `estudo-webapp-carel-boss.md` [medido], `estudo-10-saas-frontend.md`, `metodologia-tecnica-10-saas-refrigeracao.md`. Capturas: julho/2026.
