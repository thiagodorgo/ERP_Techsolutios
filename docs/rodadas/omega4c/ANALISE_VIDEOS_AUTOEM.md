# Análise Detalhada — Vídeos de Treinamento AutEM (Menu Controle)

> **Fonte:** 9 vídeos de treinamento do sistema **AutEM v2.2.1** (Satellitus Tecnologia — autem.com.br), 1280×720, ~24,6 min no total.
> **Método:** transcrição integral do áudio (faster-whisper PT-BR, com timestamps) + extração de frames a 1 fps com deduplicação por perceptual hash (643 → 346 telas únicas) + recortes em resolução original dos modais.
> **Legenda de confiabilidade:** ✓ = confirmado visualmente em frame · ~ = extraído do áudio (padrão consistente com os módulos confirmados, validar na Fase 0).
> **Objetivo:** fidelidade **comportamental** (funções, popups, fluxos, arquitetura de informação) — não clone visual (princípio Ω3F).

---

## 0. Padrões globais de UI/UX observados ✓

**Shell da aplicação**
- Navbar superior escura (preta) com menus: `Dashboard · Serviços · Controle · Financeiro · Configurações · Relatórios` + ícones à direita (calendário, notificações/sino, usuário). Linha de acento laranja sob a navbar.
- Cabeçalho de página: ícone do módulo + título + breadcrumb (`autem.com.br / controle / frota / abastecimentos`).
- Rodapé: `Copyright © 2022 AutEM v2.2.1`.

**Padrão de listagem (todas as telas de tabela)**
- Toolbar alinhada à direita, acima da tabela: ícones cinza `[seletor de colunas] [filtro] [refresh] [download/exportar]` + botão `PROCURAR` (cinza) + botão `+ CADASTRAR` (azul).
- Colunas com ordenação (⇅). Paginação no rodapé: `Mostrando de 1 até N de M resultado(s)` + botões de página.
- **Ao entrar no módulo, o modal de Pesquisa abre automaticamente** (pode ser fechado no X). ✓ (Abastecimento) / ~ (demais).
- Toast de sucesso verde no topo direito: `Cadastro efetuado com sucesso!`.
- Banner informativo azul-claro acima da tabela quando a tela depende de dados externos (telemetria mobile).

**Padrão de modal de cadastro/edição**
- Modal centrado ~800 px, header azul com título (`Cadastrar` / nome da entidade) e X à direita.
- **Sidebar interna à esquerda** (~150 px) com abas do registro: `+ Cadastrar` (ou `Editar`) · `Arquivos` · (Estoque tem também `Resumo` e `Movimentação`).
- Corpo com **seções tituladas em azul-claro com régua** (`Informações Gerais`, `Identificação do Dano`, `Valores e Descontos`, …), grid de 2–3 colunas; campos com rótulo acima; ícones ⓘ com tooltip nos campos com regra.
- Datetime abre datepicker inline (calendário + relógio).
- Rodapé do modal: **Cadastrar** (azul, à direita) no modo criação; no modo edição: **EXCLUIR** (vermelho) + ícones de ação (impressora, etc.) à esquerda e **SALVAR** (azul) à direita.
- Checkbox `Continuar cadastrando ⓘ` presente nos formulários de criação (mantém o modal aberto e limpo após salvar).
- Sub-modais de ação (Entrada, Vincular, Saída, Cadastrar Item) usam **header laranja** com botão laranja `+ ADICIONAR` — diferenciação visual entre "registro principal" (azul) e "movimento/filho" (laranja). ✓

**Aba Arquivos (padrão genérico por entidade)** ✓
- Bloco `Detalhes do Registro` (resumo somente-leitura: Data e Hora, Tipo, Objeto, Situação…) + seção `Arquivos` com toolbar `[filtro] [refresh] [download] [+ azul "Cadastrar Arquivo"]` e tabela `Data e Hora | Extensão | Tipo`. Vazio: "Nenhum registro encontrado…".

---

## 1. Controle > Frota > Abastecimento (`Controle_Abastecimento.mp4`, 2:25)

**Rota/breadcrumb:** `controle / frota / abastecimentos` ✓

**Listagem** ✓ — colunas: `Data ⇅ | Viatura | Motorista | OBS | Posto | Combustível | KM | KM/L | Litros | Valor (R$)`. Coluna calculada **KM/L** (consumo) na própria grid. Toolbar padrão + PROCURAR + CADASTRAR.

**Modal Cadastrar — seção "Informações Gerais"** ✓ (larguras em frações da linha):

| # | Campo | Tipo | Largura | Obs |
|---|-------|------|---------|-----|
| 1 | Viatura* | select | 1/1 | ex. "VT DANIELE" |
| 2 | Data e Hora* | datetime | 1/2 | datepicker inline |
| 3 | Posto* | select `INTERNO/EXTERNO` | 1/2 | controla campos condicionais |
| 4 | Estoque* | select | 1/2 | **só quando INTERNO** — itens do estoque com flag combustível |
| 4b | Posto (fornecedor)* | select | 1/2 | **só quando EXTERNO** — de Configurações > Clientes e Fornecedores ~ |
| 5 | Profissional* | select | 1/2 | |
| 6 | Combustível* | select | 1/2 | ex. "ETANOL" ✓ |
| 7 | Litros Abastecidos* | número | 1/3 | |
| 8 | Valor Unitário (R$)* | número | 1/3 | |
| 9 | Valor (R$) | número (calc) | 1/3 | = litros × unitário, editável ~ |
| 10 | Hodômetro (KM)* | número | 1/2 | alimenta relatórios de consumo |
| 11 | OBS / Assistência | textarea | 1/1 | ~3 linhas |

**Checkboxes do rodapé** ✓: `Desconsiderar último KM ⓘ` (ignora validação contra o hodômetro anterior — usado no 1º abastecimento da viatura ou correções) · `Gerar lançamento em contas a pagar` · `Continuar cadastrando ⓘ`.

**Modal Editar** ~/✓: mesmos campos preenchidos + botões EXCLUIR (vermelho) e SALVAR (azul); ação para **lançar o título no contas a pagar mesmo após a criação** (quando não foi lançado no cadastro).

**Regras de negócio faladas:**
- RN: Posto INTERNO consome do estoque da base (item marcado como combustível); EXTERNO exige fornecedor previamente cadastrado.
- RN: Hodômetro obrigatório "para que esses abastecimentos gerem relatórios" (consumo KM/L).
- RN: Lançamento no contas a pagar é opcional no cadastro e disponível depois na edição.

---

## 2. Controle > AutEM Mobile (`Controle_AutEM_Mobile.mp4`, 2:21)

Submenu: `Acessos · Quilometragem · Rastreamento · Recusas · Usuários`.

### 2.1 Acessos ~
Tabela com data/hora em que o profissional **conectou e desconectou** do aplicativo. Busca por período e por profissional específico.

### 2.2 Quilometragem ✓
- Banner azul: "Exibe a quilometragem percorrida pelos profissionais de acordo com os dados enviados automaticamente do aplicativo para o AutEM Web. Oscilação de sinal, falha de internet, economia de bateria e configurações incompletas podem comprometer esses dados."
- Colunas: `Data ⇅ | Profissional ⓘ ⇅ | Sinal ⇅ (WIFI/4G) | Bateria (%) | Distância ⇅ | Precisão | Velocidade ⇅ | Pontos ⇅ | S…`
- **Linha de rodapé com agregados:** `Total (distância) | Média (precisão) | Média (velocidade) | Média (pontos)`.
- RN: cálculo depende do app em primeiro plano, sem pico/queda de internet e GPS ativo.

### 2.3 Rastreamento ✓
- Layout: **mapa Leaflet ocupando a tela** (crédito "Leaflet | Satellitus Tecnologia", zoom +/− no canto) + **painel lateral direito** com header azul "Rastreamento":
  - `PROFISSIONAL` (select, ex. "ANNA BEATRIZ RODRIGUES (ANNABE)")
  - `Período:` `[20/09/2022 00:00] até [20/09/2022 23:59]` — **janela fixa de 24 h** ~
  - Botão `PROCURAR` + ícone auxiliar; checkbox azul `Exibe Pontos`
  - Banner azul com o mesmo disclaimer de telemetria.
- Pontos plotados como markers; com deslocamento, traça a rota percorrida.

### 2.4 Recusas ✓
- Banner azul: "Exibe as recusas dos profissionais aos serviços que foram enviados para o aplicativo."
- Colunas: `Data do Serviço ⇅ | Recusado em ⇅ | Usuário ⇅ | Produto ⇅ | Assistência ⇅ (protocolo) | Status`.
- Badges de Status: `RECUSADO` (vermelho) · `ENVIADO PRA OUTRO` (laranja) — quando o serviço recusado é reenviado a outro profissional, gera nova linha/atualização.

### 2.5 Usuários (dispositivos) ✓
- Colunas: `Profissional | Placa | Conectado (badge ✓ verde) | Versão (badge colorido: laranja=desatualizada, verde=atual, vermelho=0.0.0/inválida) | Usuário | Dispositivo (modelo, ex. Galaxy S20 Ultra 5G, ZenFone 5 Lite ZC600KL, LG K11) | SDK (Android API level: 25, 28, 29, 30…) | Último sinal (internet)`.
- Paginação: "Mostrando de 1 até 25 de 100 resultado(s)".

---

## 3. Controle > Danos (`Controle_Danos.mp4`, 2:35)

**Rota:** `controle / danos` ✓ · Modal com sidebar `+ Cadastrar | Arquivos` (edição: `Editar | Arquivos`).

**Modal Cadastrar — 4 seções** ✓:

**Seção "Informações Gerais"**
| Campo | Tipo | Obs |
|-------|------|-----|
| Data e Hora do Dano* | datetime | |
| Tipo de Dano* | select `INTERNO / EXTERNO / AMBOS` | ex. gravado: "DANO EXTERNO E INTERNO" |
| Origem* | select `COLISÃO / MULTA / OUTROS` | |
| Profissional* | select | quem sofreu/causou o dano |
| Aviso ⓘ | — | tooltip informativo ✓ |
| Situação* | select `EM ANÁLISE / FINALIZADO COM INDENIZAÇÃO / FINALIZADO SEM INDENIZAÇÃO` | ✓ "FINALIZADO COM INDENIZACAO" |
| Assistência ⓘ | select `SIM/NÃO` | SIM → abre campo **Protocolo** do serviço vinculado |
| Viaturas ⓘ | select `SIM/NÃO` | SIM → abre select da viatura (ex. "CELTA - GHI0123") ✓ |

**Seção "Identificação do Dano"**: `Objeto` (texto, ex. RETROVISOR) · `Identificação do Objeto` (texto — a avaria: QUEBRADO, RISCADO, AMASSADO…). ✓

**Seção "Valores e Descontos"** ✓: `Valor Total do Dano (R$)` (ex. 500,00) · `Profissional (R$) ⓘ` (valor a descontar — pode ser parcial, ex. 250,00) · `Parcelas` (ex. 2) · `Data ⓘ` (data do 1º desconto, com check verde de validação).

**Seções finais**: `Descrição do Dano` (textarea) · `Análise Interna do Dano` (textarea — não sai na impressão ~).

**Edição — comportamentos críticos** ✓:
- Ao lançar o desconto, aparece **alerta amarelo**: *"O valor do dano já se encontra no extrato do profissional. A exclusão e algumas alterações não podem ser feitas até que todas as parcelas sejam removidas do mesmo."* → trava de integridade entre Dano e Extrato.
- Rodapé: `EXCLUIR` (vermelho) · ícone impressora · ícone vermelho (retirar do extrato) · `SALVAR` (azul).
- Ações faladas ~: imprimir **com ou sem parágrafo de ciência** (termo para o profissional assinar); botão "lançar no extrato do profissional" → o valor vai para a folha de pagamento em parcelas.

**Aba Arquivos** ✓: `Detalhes do Registro` (Data e Hora, Tipo de Danos, Objeto, Situação) + upload (imagens do dano).

**Listagem** ✓ (parcial): colunas incluem `Data | Profissional | Tipo (DANO EXTERNO / DANO INTERNO) | Valor` …

---

## 4. Controle > Estoque (`Controle_Estoque.mp4`, 3:36)

**Rota:** `controle / estoque` ✓ · Modal "Item" com sidebar `Cadastrar(Editar) | Resumo | Movimentação` ✓ e badge de status `ATIVO` (fita verde no canto superior direito). ✓

**Modal Cadastrar/Editar — "Informações Gerais"** ✓:
| Campo | Tipo | Obs |
|-------|------|-----|
| Código | número (auto/edit) | ex. 50, 77 |
| Tipo* | select `PRODUTO / EQUIPAMENTO` | **EQUIPAMENTO oculta Compra/Venda** ✓ |
| Nome* | texto | ex. "AAA PILHAS" |
| Unidade* | select `UNIDADE / LITROS / METROS / KG` | |
| Mínimo ⓘ | número | estoque mínimo (alerta) |
| Máximo ⓘ | número | ex. 300.000,00 |
| Compra (R$) ⓘ | número | só PRODUTO |
| Venda (R$) ⓘ | número | só PRODUTO |
| Descrição | textarea | |
| Combustível | checkbox | habilita o item no Abastecimento interno |

Rodapé edição ✓: `EXCLUIR` (vermelho) · `ATIVO/INATIVAR` (verde) · `SALVAR` (azul).

**Aba Resumo** ✓: `Detalhes do Registro`: Código, Nome, Estoque Mínimo, Estoque Máximo, **Qtd. Viatura** (ex. 585), **Qtd. Profissional** (21), **Qtd. Base** (476) — saldo segmentado por custódia. Abaixo, seções `Profissionais` e `Viaturas`: tabelas `Nome | Qtd` com toolbar `[filtro][refresh][export]`.

**Aba Movimentação** ✓:
- Toolbar de ações com 4 botões coloridos: **laranja (Entrada)** · **azul (Vincular 🔗)** · **vermelho (Saída ↑)** · **verde (↓ retorno/desvincular)**.
- Tabela de histórico: `Data | ícone do tipo (↓ verde entrada · ↑ vermelho saída · 🔗 azul vínculo) | Origem/Destino (BASE / FUNCIONARIO / VIATURA) | Qtd ⇅ | ✕ (excluir movimento)`.

**Sub-modal "Entrada"** (header laranja) ✓: `Data | Número da nota | Fornecedor (dropdown com a lista de Clientes e Fornecedores) | Quantidade | Valor Unitário (editável) | Valor Total` → `+ ADICIONAR`. Soma ao saldo da BASE.

**Sub-modal "Vincular"** (header laranja) ✓: `Data | Número da nota | Vincular por: PROFISSIONAL/VIATURA | (select do destino) | Quantidade` → `VINCULAR`. Transfere custódia BASE → profissional/viatura.

**Sub-modal "Saída"** (header laranja) ✓: `Data | Número da nota | Origem (select: BASE/PROFISSIONAL/VIATURA ~) | Tipo de Saída (select — ex. venda direta) | Quantidade | Valor Unitário | Valor Total` → `+ ADICIONAR`.

**Regras faladas:**
- RN: cadastrar o item não cria saldo — a quantidade entra apenas via movimento de Entrada.
- RN: **venda em serviço vinculada ao profissional dá baixa automática** no saldo em custódia dele.
- RN: desvincular devolve a quantidade do profissional/viatura para a base.
- RN: Editar permite excluir ou **inativar** (some das seleções, preserva histórico).

---

## 5. Controle > Frota > Manutenção (`Controle_Manutenção.mp4`, 3:03)

**Rota:** `controle / frota / manutenção` ✓

**Integração proativa** ✓: ao selecionar a viatura, toast lateral escuro: *"Encontramos no sistema um abastecimento feito em 31/05/2022 onde o hodômetro era 15.500 Km. Deseja preencher nesta manutenção?"* + botão `Sim, preencher` → **sugestão automática de hodômetro a partir do último abastecimento**.

**Modal Cadastrar — "Informações Gerais"** ✓: `Viatura* (ex. ANA2000) | Data* (datepicker) | Hodômetro (KM) | Documento ⓘ (nº da nota, ex. 1222311536666) | Fornecedor* (de Clientes e Fornecedores, ex. LIGEIRINHO) | OBS (textarea)` → `+ CADASTRAR`.

**Após criar** ✓: modal vira modo `Editar | Arquivos` e libera a **grid de itens**: `Descrição | Valor Unit. | Qtd | Valor Total` + linha vazia "Nenhum registro encontrado…" + toolbar `[impressora] [+ azul]`. Totalizadores no rodapé da grid: `Total Produtos (R$) | Total Serviços (R$) | Total (R$)` ✓ (ex. 0,00 | 400,00 | 400,00).

**Sub-modal "Cadastrar Item"** (header laranja) ✓: `Tipo* (select: SERVIÇO / PRODUTO / ESTOQUE ~) | Item* | Valor Unitário | Quantidade | Valor Total (calc) | OBS | checkbox Continuar cadastrando ⓘ` → `+ ADICIONAR`. (ex.: "MÃO DE OBRA CHAVE RESERVA", 400,00 × 1,00.)

**Popup pós-item — notificação de próxima manutenção** ~: ao adicionar item, pergunta "Deseja ser notificado da próxima manutenção?" → se **Sim**: escolher recorrência **por Tempo ou por Quilometragem** + tipo de notificação `PRIVADA (só meu usuário) / PÚBLICA (todos os usuários) / PERSONALIZADA (selecionar usuários)`.

**Ações** ✓/~: lançar o valor total no **contas a pagar** · `EXCLUIR` · **imprimir** (ordem/itens de manutenção) · aba **Arquivos** (foto, documento, nota). Edição de item: clicar na linha, alterar, salvar.

**Listagem** ✓ (parcial): `[bolinha status] | Documento | Data | Fornecedor | Viatura | Qtd itens | Valor Total | OBS`.

---

## 6. Controle > Frota > Multas (`Controle_Multas.mp4`, 3:15)

**Rota:** `controle / frota / multas` ✓

**Modal Cadastrar — "Informações Gerais"** ✓:
| Campo | Tipo | Obs |
|-------|------|-----|
| Viatura* | select | 1/1, ex. ANA2000 |
| Auto de Infração ⓘ* | texto | ex. 7456 |
| Data e Hora da Infração* | datetime | |
| Data Limite de Indicação ⓘ* | date | prazo p/ indicar condutor; check verde de validação ✓ |
| Município* | autocomplete | ex. "JUNDIAÍ - SP" (cidade-UF) |
| Endereço | texto | 1/1, ex. "AV. NOVE DE JULHO - CENTRO, JUNDIAÍ - SP, BRASIL" |
| Descrição da Multa | texto | ex. "VELOCIDADE ALTA" |
| Natureza* | select | **com pontuação CTB**: `LEVE (3 PONTOS) / MÉDIA (4 PONTOS) / GRAVE (5 PONTOS) / GRAVÍSSIMA (7 PONTOS)` ✓ |
| Condutor | select profissional | ex. ANNA BEATRIZ RODRIGUES |
| Condutor responsável ⓘ | select `SIM/NÃO` ✓ | **decide o fluxo financeiro** |
| Parcelas | número | |
| Data de Vencimento | date | |
| Valor (R$) | número | valor da multa |
| Valor Pago (R$) | número | valor efetivamente pago (à vista/desconto) |
| Observação | textarea | |
| Contas à Pagar ⓘ | checkbox | lançar título ao cadastrar |
| Continuar cadastrando ⓘ | checkbox | |

**Regra central falada:** `Condutor responsável = SIM` → o valor é **descontado no extrato do profissional** (parcelado conforme Parcelas/Vencimento); `= NÃO` → a **empresa assume** e o valor vai para o **contas a pagar**.

**Pós-cadastro / edição** ~: badge indicando "lançado no extrato do profissional"; ações: **cadastrar notificação de vencimento** (data/hora + antecedência "quanto tempo antes" + tipo PRIVADA/PÚBLICA/PERSONALIZADA + título + mensagem); lançar/retirar do contas a pagar; **retirar do extrato do profissional**; **imprimir** a multa; aba **Arquivos** (foto/documento da multa).

**Pesquisa** ~: por data da infração, data de vencimento (período), viatura, profissional ou nº do auto de infração.

---

## 7. Controle > Remunerações (`Controle_Remunerações.mp4`, 3:03)

**Comportamento de entrada** ~: abre **direto no modal de filtro**: `Período (De/Até) | Profissional | KM | Empresa | Nº do documento | Filial(?)` — seleção mínima: período + profissional → lista todos os serviços do profissional no período.

**Grid de serviços** ~/✓:
- **Bolinha vermelha** no início da linha = serviço **não liquidado** (valor ainda não pago ao profissional); **verde** = liquidado.
- Indicador quando o serviço está marcado para **não remunerar**.
- **Seletor de colunas visíveis** (mostrar/ocultar colunas da grid — "não quero que apareça um monte de informação, é só vir aqui em selecionar para tirar").
- Rolagem horizontal até as colunas finais: **valor do serviço** e **valor de remuneração aplicado**.
- **Totalizadores**: valor total a pagar (ex. R$ 148,50), quantidade de serviços e **KM rodados** dentro dos serviços.
- Checkbox por linha + **selecionar todos**.

**Ação em massa (engrenagem)** ~: com linhas selecionadas, aplicar por serviço: `Comissão (%) | Valor fixo | Não remunerar | Remuneração padrão` (padrão = regra do cadastro do profissional: **tabela de valores** ou **comissão fixa**).

**Painel de conferência da remuneração** ~: por serviço, exibe `valor da saída | valor pago ao profissional | valor do KM | adicionais/etapas dentro do serviço | valor repassado`.

**Liquidar** ~: selecionar linhas → `LIQUIDAR` → bolinha vermelha → verde (sinaliza pago nas próximas buscas).

**Extras** ~: **impressão** das remunerações; expandir colunas; **exportar para Excel**; nova busca para outro profissional.

---

## 8. Controle > Frota > Seguros + Controle > Notificações (`Controle_Seguros_e_Notificações.mp4`, 2:38)

### 8.1 Seguros ~
**Modal Cadastrar**: `Vigência (até)* | Viatura* | Seguradora* (de Clientes e Fornecedores) | Apólice | Bônus | Valor (R$)* | Observação | checkbox Lançar em contas a pagar` → Cadastrar.
**Pós-cadastro**: badge "lançado no contas a pagar"; **cadastrar notificação de vencimento** (data/hora exatos + antecedência + tipo PRIVADA/PÚBLICA/PERSONALIZADA + título + mensagem); aba **Arquivos** (upload da apólice).

### 8.2 Central de Notificações ~
**Rota:** `controle / notificações`. Lista **todas** as notificações cadastradas — geradas de Manutenção, de Contas a Pagar (vencimentos), de Multas/Seguros e **avulsas**.
**Modal Cadastrar (avulsa)**: `Data e Hora da notificação* | Quanto tempo antes deseja ser lembrado (antecedência)* | Título* | Mensagem* | Tipo*: PRIVADA (só meu usuário) / PÚBLICA (todos os usuários do AutEM) / PERSONALIZADA (selecionar usuários)`.
**Ações**: editar e excluir notificações.

---

## 9. Controle > Usuários (`Controle_Usuários.mp4`, 1:35)

Submenu: `Acessos · Logs · Sessões`.

### 9.1 Acessos ~
Tabela: `Data/hora | Usuário | Último acesso` (último login na plataforma web). Busca por período e usuário específico.

### 9.2 Logs (auditoria global) ~
"Tudo que a gente faz no sistema fica registrado." Tabela: `Operação (CRIAÇÃO / ALTERAÇÃO / EXCLUSÃO) | Usuário que fez | Data/hora | Alvo/detalhe da edição`. Cobre todos os módulos.

### 9.3 Sessões ~
Tabela: `Data/hora (login) | Usuário | Tempo logado no sistema | ✕ (desconectar)`. O ✕ **derruba a sessão** — o usuário precisa fazer login novamente. Busca por usuário.

---

## 10. Matriz de integrações transversais (o coração da rodada)

| Serviço transversal | Consumido por | Comportamento |
|---|---|---|
| **Contas a Pagar** (títulos) | Abastecimento, Manutenção, Multa (condutor NÃO responsável), Seguro | checkbox no cadastro OU ação posterior na edição; badge de "lançado"; ação de retirar |
| **Extrato do Profissional** (descontos em folha) | Dano, Multa (condutor responsável), Remunerações (créditos) | parcelado (N parcelas + data 1ª); trava: registro com parcelas no extrato não pode ser excluído/alterado ✓ |
| **Motor de Notificações** | Manutenção (próxima por tempo/km), Multa, Seguro, Contas a Pagar, avulsas | data-alvo + antecedência + visibilidade PRIVADA/PÚBLICA/PERSONALIZADA + título + mensagem; central única |
| **Arquivos (anexos)** | Dano, Manutenção, Multa, Seguro | aba padrão no modal, com Detalhes do Registro + tabela + upload |
| **Clientes e Fornecedores** | Abastecimento (posto externo), Estoque (entrada), Manutenção (fornecedor), Seguro (seguradora) | pré-requisito de cadastro em Configurações |
| **Estoque (custódia)** | Abastecimento interno (baixa de combustível), Manutenção (item tipo ESTOQUE ~), Serviços/OS (baixa automática na venda) | saldo segmentado BASE/PROFISSIONAL/VIATURA |
| **Telemetria do app mobile** | Acessos, Quilometragem, Rastreamento, Recusas, Usuários(dispositivos) | app envia: eventos login/logout, heartbeat GPS (lat/lng/precisão/velocidade), bateria, tipo de sinal, versão/dispositivo/SDK, recusas de serviço |
| **Auditoria + Sessões** | Todos os módulos | log CRUD global; sessões com revogação forçada |

## 11. Pontos a validar na Fase 0 (baixa confiança / não visto em frame)

1. Rótulo e opções exatas do filtro de Remunerações (li "KM, empresa, nº documento, filial" no áudio com ruído).
2. Nome do campo "empilhadas" no painel de conferência da remuneração — provavelmente **etapas/estadias/horas paradas** do serviço.
3. Opções exatas do `Tipo de Saída` no sub-modal Saída do Estoque.
4. Se a origem `MULTA` em Danos cria vínculo automático com o módulo Multas ou é apenas classificação.
5. Colunas exatas das listagens de Multas, Seguros, Danos e Remunerações (confirmadas parcialmente).
6. Se o popup de notificação de próxima manutenção é disparado por item ou por manutenção (áudio sugere por item).
7. Janela do Rastreamento: fixa em 24 h (00:00–23:59 do dia) ou período livre limitado a 24 h.
