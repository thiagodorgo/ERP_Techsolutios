# ALINHAMENTO DE FIDELIDADE — Painel Logístico (referência) × ERP Techsolutions

Fonte: 8 vídeos analisados quadro a quadro (extração a cada 2s, 708 quadros → 319 distintos)
+ transcrição integral do áudio (PT-BR) + auditoria do repo em `main` (13/jul/2026).

**Nota sobre o material:** os 8 arquivos estão presentes e **todos os 8 foram transcritos e
analisados**. Verificação por md5: `Menu_Superior` (ea40f555, 148s) é um vídeo próprio e
distinto — na série do fornecedor, "Menu Superior" é o tutorial dos itens finais do editor do
serviço (Mapa, Logs, Cancelar, Imprimir, Duplicar, Copiar), e está integralmente coberto na
seção 1.3. A única duplicidade é outra: `Mapa_Logs_Cancelar_Imprimir_Duplicar_Copiar` e
`Mobile_Quilometragem_Base` são **byte-idênticos** (md5 13bf1085) — ambos contêm o tutorial
Mobile/Quilometragem/Base. Ou seja: 7 conteúdos distintos, todos analisados; nenhum tema da
série ficou de fora.

---

## 1. Como o sistema de referência funciona (modelo funcional extraído)

### 1.0 Navegação global (menu superior do sistema)
Barra horizontal no topo (lida em quadro ampliado, Detalhes_do_serviço ~0:14):
**Dashboard · Serviços · Controle · Financeiro · Configurações · Relatórios**, com busca à
direita. O dropdown de **Serviços** tem 3 entradas: **Painel logístico** (operação do dia),
**Visualizar** (finalizados/histórico) e **Orçamento** (standalone). O Dashboard traz cards
grandes coloridos (serviços por estado, TMC em minutos, profissional em destaque, km
percorrida) + mapa ao lado. Paridade: o ERP usa sidebar esquerda com RBAC — arquitetura de
informação equivalente já existe; o alinhamento aqui é garantir as três *visões* de Serviços
(operação / finalizados / orçamentos) como rotas distintas, não copiar o layout do menu.

### 1.1 Lista de serviços (tela principal)
KPI cards coloridos no topo (contadores por estado). Tabela com uma linha por serviço; cada
linha carrega **ações inline**: ícone de mensagem (sinaliza chat com o profissional), ícone de
mapa (rota do profissional), placa enviada para validação, **seta de envio ao profissional**
(abre lista dos disponíveis → confirma → aguarda aceite no app; aceite muda o indicador),
indicador de **atraso** (estourou a previsão de chegada), km preenchida no app, menu ⋮ com:
copiar texto pronto p/ WhatsApp, enviar SMS de rastreio ao beneficiário (link do mapa do
percurso; ao finalizar vira **pesquisa de avaliação**), excluir, **cancelar operação logística**
(desfaz envio p/ reenviar a outro profissional) e **dar andamento** (a base avança etapa
manualmente quando o técnico fica sem bateria). Serviços entram por cadastro manual **ou
importados da plataforma da assistência/seguradora**.

### 1.2 Cadastro de serviço (modal) — vídeo "Como cadastrar", 0:20–2:56
CNPJ próprio/filial → empresa (cliente) → **tipo de serviço (obrigatoriamente cadastrado na
tabela de valores daquele cliente)** → **campos dinâmicos por tipo**: socorro mecânico = placa,
veículo, cor, origem; **reboque = origem E destino**; reparo residencial = senha, objeto,
descrição (limpeza/instalação/desentupimento). Observação de previsão; **modo de acionamento**
(imediato: hora início + previsão de chegada; agendado: data + hora início/fim);
**recorrência** (diária/semanal/quinzenal/mensal/anual) que relança o serviço, os itens
financeiros e as tarefas automaticamente; "realizado por" (dispensa envio a profissional);
dados do beneficiário (nome/telefone — obrigatoriedade **configurável por cliente**);
observações visíveis ao técnico. Pós-cadastro: **tags** coloridas custom por serviço;
**ocorrências** vinculadas ao beneficiário (alerta no próximo cadastro do mesmo beneficiário);
notificações por serviço.

### 1.3 Edição do serviço — hub com menu lateral interno de 11 abas
`Informações gerais · Financeiro · Orçamento · Estoque · Comentários · Arquivos · Mobile ·
Quilometragem · Base · Mapa · Logs` + barra de ações no topo: `Cancelar · Imprimir · Duplicar ·
Copiar`.

- **Financeiro** (vídeo Informações gerais, 0:24–1:08): itens lançados a partir da **tabela de
  valores do cliente** (saída, km viagem já entram), edição inline de valor, "+" para lançar
  item (ex.: pedágio) com valor + observação, **total automático**.
- **Orçamento na OS** (1:10–2:34): cadastrar orçamento (número, data, validade) → lançar itens
  (item de serviço da tabela de valores OU **produto do estoque**; tipo apoio/estadia/troca de
  pneu; qtd × valor) → **aprovar/recusar**; aprovar pergunta "criar novo serviço?" → define modo
  de acionamento/agendamento → **novo serviço nasce no painel** para acionar profissional.
- **Estoque** (vídeo Estoque, 0:18–1:21): venda de produto na OS — origem do produto
  (**profissional / viatura / base**), produto com **quantidade disponível exibida**, data, qtd,
  valor e o checkbox-chave **"cadastrar no financeiro"** (sem ele registra só a saída física,
  sem receita). Pré-requisito: estoque cadastrado no controle.
- **Comentários** (1:21–1:46): comentário com **tags**, editar, excluir.
- **Arquivos** (1:46–2:09): arquivos subidos pelo profissional no app aparecem aqui; download,
  exclusão, upload manual com **tipo + nome**.
- **Mobile** (vídeo Mobile/KM/Base, 0:24–1:35): **timeline de etapas** (enviado → aceito →
  iniciado → origem → destino) com data/hora de cada validação; **mapa mostrando ONDE o
  profissional estava ao validar cada etapa**; checklist preenchido no app visível em tempo
  real; ao finalizar → **compartilhar checklist por e-mail, link, imagem, PDF ou WhatsApp**,
  com **registro de quem compartilhou e em que formato**; mensagens base↔profissional
  registradas.
- **Quilometragem** (1:38–1:58): km inicial/final da viatura preenchida pelo profissional no
  app; a base **corrige** se vier errada ou faltando.
- **Base** (1:58–2:35): pátio/guarda — entrada do veículo na base, liberação (sim/não; destino:
  proprietário/leilão/guincho), motivo, **valores de estadia**, chassi, placa e dados
  complementares.
- **Mapa** (vídeo no arquivo "Menu_Superior", 0:19–0:41): rota sugerida ao profissional com
  **ponto de partida selecionável** (posição real / localização da base / ponto de interesse
  cadastrado) → origem → destino, **calculando os km de deslocamento**.
- **Logs** (0:41–0:54): auditoria de tudo na OS (quem editou/alterou/excluiu, quando).
- **Cancelar** (0:54–1:20): fluxo com decisões — serviço em andamento? **situação financeira:
  manter valores / manter sem remunerar o profissional / zerar itens** + motivo.
- **Imprimir** (1:28–1:39): checkboxes escolhem o que sai na impressão.
- **Duplicar** (1:39–2:04): cópia com opções — novo nº de assistência, data/hora atual, copiar
  comentários, copiar checklist. Caso de uso citado: veículo pernoitou na base e saiu no dia
  seguinte com outro profissional.
- **Copiar** (2:04–2:12): copia a URL da página — **deep link** para outro usuário abrir a OS.

### 1.4 Serviços → Visualizar (finalizados) — vídeo Visualizar, 0:10–1:01
Grid dos finalizados do dia: data/hora, protocolo, **colunas configuráveis** (adicionar/
remover), impressão do layout, refresh forçado, **exportar para Excel**, busca avançada por
período/CNPJ/filial/protocolo/empresa.

### 1.5 Serviços → Orçamento (standalone) — 1:01–2:24
Orçamento para quem **ainda não tem serviço**: CNPJ, cliente cadastrado, produto/tipo de
serviço, protocolo, data + validade, prazo de execução, profissional sugerido, dados do
beneficiário. Compartilhar por **e-mail ou link**; cancelar; **abrir OS a partir dele**; itens
financeiros próprios; logs próprios; impressão configurável.

---

## 2. Matriz de paridade (referência → repo hoje)

Classificação: ✅ existe · 🟡 fundação pronta, falta a feature · 🔴 não existe.

| # | Capacidade da referência | Repo hoje | Classe |
|---|---|---|---|
| 1 | Lista de OS com KPI cards + tabela | WorkOrdersPage + SummaryCards + Filters | ✅ |
| 2 | Envio ao profissional c/ aceite no app | field-dispatch + aceite mobile (B-1xx) | ✅ |
| 3 | Timeline de eventos da OS | WorkOrderEvent + WorkOrderTimeline (simples) | ✅ |
| 4 | Tipo de serviço amarrado à tabela de valores do cliente | service-catalog + price-tables/tariffs (Ω2-a) existem; **falta o vínculo obrigatório no create** | 🟡 |
| 5 | Detalhe da OS em hub de 11 abas + barra de ações | DetailPage de card único (296 linhas, sem abas) | 🔴 |
| 6 | Financeiro da OS (itens da tabela, total) | tabela de valores existe; lançamento na OS não (Ω4) | 🟡 |
| 7 | Orçamento na OS + aprovar→novo serviço | inexistente (Ω3 planejado) | 🔴 |
| 8 | Orçamento standalone + compartilhar e-mail/link | inexistente | 🔴 |
| 9 | Venda de estoque na OS (origem base/viatura/prof. + flag financeiro) | **módulo inventory existe** + mobile-inventory-sync; falta vínculo OS+financeiro | 🟡 |
| 10 | Comentários da OS com tags | inexistente (Ω3 planejado; é a Fase A da comunicação) | 🔴 |
| 11 | Arquivos da OS (app sobe, base vê/baixa/sobe) | evidence storage existe p/ checklist; falta generalizar p/ OS | 🟡 |
| 12 | Aba Mobile: etapas com data/hora + posição no mapa por etapa | FieldDispatchEvent + field-location existem; falta a tela composta | 🟡 |
| 13 | Checklist compartilhável (PDF/link/imagem/e-mail/WhatsApp) c/ registro | execução + evidências existem; compartilhamento não | 🟡 |
| 14 | Mensagens base↔profissional na OS | inexistente (Fase A/B comms) | 🔴 |
| 15 | KM inicial/final (app preenche, base corrige) | inexistente no modelo (Ω3 "km est×real" planejado) | 🔴 |
| 16 | Base/pátio (guarda, estadia, liberação, leilão) | inexistente — domínio novo | 🔴 |
| 17 | Mapa da OS: rota c/ partida real/base/POI + km calculado | mapa operacional real (MapLibre) + geocode existem; rota/POI não (Ω2-d POI planejado) | 🟡 |
| 18 | Logs (auditoria por OS) | **AuditLog global existe**; falta a visão filtrada na OS | 🟡 |
| 19 | Cancelar com decisão financeira (manter/sem remunerar/zerar) | cancel simples c/ motivo existe; decisão financeira não | 🟡 |
| 20 | Imprimir configurável por seção | inexistente | 🔴 |
| 21 | Duplicar com opções (nº novo, data, comentários, checklist) | inexistente | 🔴 |
| 22 | Copiar URL (deep link da OS) | rotas por id existem; botão trivial | 🟡 |
| 23 | Campos dinâmicos por tipo (socorro/reboque/residencial) | create genérico; **modelo tem só 1 endereço (sem destino!)** | 🔴 |
| 24 | Origem E destino na OS (reboque) | `service_address` único no schema | 🔴 |
| 25 | Beneficiário ≠ cliente pagador (obrigatoriedade configurável) | `customer_name/phone` inline já separado do `customer_id` (empresa) — falta config de obrigatoriedade | 🟡 |
| 26 | Recorrência de serviço (+ itens financeiros e tarefas) | inexistente | 🔴 |
| 27 | Tags coloridas custom por OS | inexistente (Ω2-d "Tags" já planejado) | 🔴 |
| 28 | Ocorrências por beneficiário c/ alerta em novo cadastro | inexistente | 🔴 |
| 29 | Dar andamento manual (base avança etapa) | máquina de estados existe c/ transições; falta expor a ação "forçar etapa" c/ auditoria | 🟡 |
| 30 | Cancelar operação logística (desfazer envio p/ reenviar) | dispatch existe; verificar/expor "revogar envio" | 🟡 |
| 31 | Atraso (estouro da previsão de chegada) sinalizado na lista | `scheduled_for`/`arrived_at` existem; falta previsão de chegada + badge | 🟡 |
| 32 | Copiar texto pronto p/ WhatsApp | trivial (client-side) | 🔴 |
| 33 | SMS de rastreio p/ beneficiário → vira avaliação | inexistente (canal cliente final — fase 2, já decidido) | 🔴 |
| 34 | Visualizar finalizados: colunas configuráveis + **Excel** + busca avançada | lista existe; export/colunas/busca avançada não | 🟡 |
| 35 | Importar serviços da plataforma da assistência/seguradora | inexistente (integração externa, pós-piloto) | 🔴 |

**Placar: 3 ✅ · 15 🟡 · 17 🔴.** Leitura importante: dos 17 🔴, **10 estão em cima de fundações
que já existem** (tabela de valores, inventory, evidence, audit, state machine, dispatch, mapa,
geocode) — são telas e vínculos, não infraestrutura. Os "novos de verdade" são 5: Base/pátio,
recorrência, ocorrências, SMS/avaliação e importação de assistência.

---

## 3. Plano de alinhamento — RODADA Ω3-FIDELIDADE

Substitui/expande o Ω3 da `lista-execucao.md`. Mesma governança (juntas, KPI por PR,
protocolo de dificuldade). Mapa/rota passam pela **Junta de Mapas**.

### Fase 1 — Paridade essencial (pré-piloto) · ~16–19 PRs · ~2 semanas
| Bloco | Entrega | PRs |
|---|---|---|
| Ω3F-1 | **Hub da OS**: detalhe em abas (menu lateral interno) + barra Cancelar/Imprimir/Duplicar/Copiar (esqueleto) + Copiar URL + texto WhatsApp | 2 |
| Ω3F-2 | **Origem/destino + campos dinâmicos por tipo** (migração aditiva `origin_*`/`destination_*`; form por service_catalog; reboque=2 endereços) | 2 |
| Ω3F-3 | **Financeiro da OS**: WorkOrderFinancialItem ligado à price-table do cliente, lançamento/edição/total; validação "tipo precisa estar na tabela do cliente" no create | 2–3 |
| Ω3F-4 | **Orçamento**: quote na OS + standalone, itens (tabela de valores OU produto), aprovar→cria OS (com modo de acionamento), recusar, compartilhar link | 3 |
| Ω3F-5 | **Comentários (c/ tags) + Arquivos da OS** (generalizar evidence storage p/ anexo de OS; app→base e base→app) | 2 |
| Ω3F-6 | **Cancelar c/ decisão financeira + Duplicar c/ opções + Imprimir configurável** | 2 |
| Ω3F-7 | **KM real** (campos + app preenche + base corrige) e **aba Mobile** (etapas c/ hora + posição por etapa no mapa + checklist preview) | 2 |
| Ω3F-8 | **Aba Mapa da OS**: rota origem→destino, partida real/base/POI, km estimado (Junta de Mapas; POI junto do Ω2-d) + **aba Logs** (AuditLog filtrado por OS) | 2 |
| Ω3F-9 | **Ações de linha**: dar andamento (forçar etapa auditada), revogar envio, badge de atraso | 1–2 |

### Fase 2 — Paridade completa (durante/pós-piloto) · ~10–13 PRs
Estoque→OS com flag financeiro (2) · Tags de OS + Ocorrências por beneficiário (2) ·
Visualizar: colunas configuráveis + export Excel + busca avançada (2) · **Base/pátio**
(guarda/estadia/liberação — domínio novo, junta de modelagem antes) (3) · Recorrência (2) ·
Compartilhar checklist multi-formato c/ registro (1–2).

### Fase 3 — Pós-venda (já estava no plano)
SMS de rastreio + avaliação do beneficiário (canal cliente final, junto do WhatsApp BSP) ·
Importação de serviços de plataformas de assistência/seguradora (integração externa, PD+junta).

**Impacto no cronograma:** o Ω3 original estimava 4–6 PRs; a fidelidade pedida eleva para
~16–19 (fase 1) + 10–13 (fase 2). No ritmo atual (10–15 PRs/sem): fase 1 ≈ 2 semanas.
**Vendável agressivo desliza ~1–2 semanas (meados de outubro); o realista de fim de outubro
continua de pé** — o buffer do Ω4 ×1,5 e a fase 2 correndo durante o piloto absorvem o resto.

---

## 4. Nota de fidelidade (importante)

Fidelidade **funcional e de fluxo**: sim, total — workflows, campos, regras de negócio e
densidade de informação são práticas de mercado e é exatamente o que o piloto precisa para não
sentir downgrade. Fidelidade **de identidade visual**: não copiar — manter o design system
próprio (cores, tipografia, componentes shadcn) sobre a MESMA arquitetura de informação. Clonar
aparência/trade dress de concorrente é risco desnecessário; clonar o *modelo mental* do usuário
é estratégia.

## 5. Pendências desta análise
1. Confirmar em junta a modelagem de **Base/pátio** (é o único domínio 100% novo e específico
   de reboque — vale validar com o cliente-alvo antes de construir).
2. Decidir se **recorrência** entra no v1 (é a feature de maior custo/benefício duvidoso da
   lista — nenhum outro item depende dela).
3. Opcional: se existir na série um vídeo dedicado aos módulos **Controle / Financeiro /
   Configurações / Relatórios** do menu global, ele complementaria a matriz além do escopo de
   Serviços coberto pelos 8 atuais.
