# `screen-refs/` — Galeria de referência visual (alvo pixel a pixel)

**74 telas** do protótipo oficial renderizadas e capturadas direto do runtime
(**35** ERP Web + **39** ERP Mobile). Cada PNG é o **alvo visual exato** da tela no React/Flutter.

> **Recriar, não reinterpretar.** Abra o PNG da tela + leia o **mesmo** trecho no
> código-fonte do protótipo (`ERP Web.dc.html` / `ERP Mobile.dc.html`): o PNG mostra o
> alvo renderizado, o fonte mostra grade, tokens e cópia exatos. As regras completas de
> fidelidade estão em **`../CLAUDE.md` §11**.

> **Substituídos pelo design padronizado (decisão do dono, 2026-10-08, `D-OS-CABECALHO-PADRONIZADO`).** Para as 5
> telas padronizadas — Dashboard, Ordens de Serviço, Usuários, Auditoria e Pátios — a referência visual é
> **`ERP Web - Telas Padronizadas.dc.html`** (raiz do repo; telas `sc_dash`, `sc_os`, `sc_users`, `sc_audit`,
> `sc_patios`; ver `docs/juntas/J-TELAS-PADRONIZADAS.md`), **não** os PNGs `dashboard-operacional.png`,
> `ordens-servico.png`, `usuarios.png` e `auditoria-organizacao.png` (não há PNG de Pátios). Divergência entre esses
> PNGs e o app não é achado de fidelidade. Os PNGs ficam como histórico do protótipo antigo.
>
> **Tamanho real das capturas web: 924×540** (medido nos 35 arquivos em 2026-10-08), não 1440px — por isso alguns
> textos quebram linha no PNG e não no app.

**Padrão-ouro (HTML):** `Cloud Billing.reference.html` é a única tela também exportada como
**HTML estático isolado** — use-a como exemplo do nível de fidelidade esperado em todas as demais.

**Padrão aprovado de painel com lista (HTML):** `financeiro-ab.reference.html`, a tela do Financeiro aprovada pelo
dono em 2026-10-12 (`D-PADRAO-BLOCOS-CLICAVEIS`, CLAUDE.md §4 item 6): indicadores e blocos de resumo clicáveis que
filtram a lista, linhas de uma linha, detalhe que abre embaixo da linha. É a referência do Financeiro no lugar de
`financeiro.png`. A seção escura no rodapé ("camada de revisão") é nota para o dono, não faz parte da tela, e os
números são de exemplo. A página carrega as fontes do Google Fonts; sem rede, cai na fonte do sistema.

**Toda tela passa por 3 opções (`D-TELAS-TRES-OPCOES`, CLAUDE.md §4 item 7):** antes do dev, uma maquete com as opções A, B e C no padrão do sistema; a escolhida pelo dono entra nesta pasta como referência da tela.

**As 3 opções ficam todas, como aparências por usuário (`D-APARENCIA-POR-USUARIO`, 2026-10-14):** o dono aprovou as 3 opções de cada tela; cada usuário vai escolher a sua em Configurações, e desde 2026-10-14 toda tela implementada sai com as 3 (`D-TELAS-SAEM-COM-TRES`). Referências com as 3 aprovadas (maquetes feitas pelo Claude, `D-DESIGN-SO-CLAUDE`; troque a opção no seletor do topo; o quadro de notas no rodapé não faz parte da tela, e os números são de exemplo):
- `patios-3opcoes.reference.html` — Pátios: lista → vagas (`OccupancyMap`) → dossiê do veículo em 8 abas, janela fixa, fotos em linha com quebra, Mover · Liberar · Editar numa linha. Preferida do dono: B (Analítica).
- `dashboard-3opcoes.reference.html` — Dashboard: A fiel, B analítica, C central de prioridades.
- `ordens-de-servico-3opcoes.reference.html` — Ordens de Serviço: A fiel, B analítica (com SLA vencido), C fila por agenda; lista → resumo → detalhe da OS.
- `usuarios-3opcoes.reference.html` — Usuários (2026-10-14), BI nas três: A fiel com indicadores e barras, B analítica (entradas por dia, perfis, último acesso), C saúde do acesso (nota 0–100, mapa de calor dia × hora, matriz perfil × módulo).
- `auditoria-3opcoes.reference.html` — Auditoria (2026-10-15), BI nas três: A fiel com indicadores e eventos sensíveis, B analítica (comparação com o período anterior, "O que mudou?"), C radar de risco (Crítico, Atenção, Rotina e trilha de investigação).
- `financeiro-3opcoes.reference.html` — Financeiro (2026-10-16), parte da `financeiro-ab.reference.html` aprovada: A fiel com BI, B analítica (fluxo de caixa de 6 meses, aging em 7 faixas, recebido × pago), C agenda de caixa (15 dias com saldo projetado e a mesa do dia); a baixa em janela fixa com as mensagens do plano do B-SAN3-12.

---

## ERP Web — 35 telas · fonte `ERP Web.dc.html`
Navegação no protótipo: estado `screen` (+ `role`, que define a sidebar). Agrupadas por papel:

### Plataforma · `role: platform`
| Arquivo | Tela | `screen` |
|---|---|---|
| `visao-geral-plataforma.png` | Visão Geral da Plataforma | `platformDashboard` |
| `organizacoes.png` | Organizações (console) | `console` |
| `organizacao-detalhe.png` | Organização · detalhe | `tenantDetail` |
| `planos-e-modulos.png` | Planos e Módulos | `plans` |
| `cloud-billing.png` ★ | Cloud Billing *(ver também o HTML)* | `cloudBilling` |
| `auditoria-plataforma.png` | Auditoria Global | `auditPlatform` |
| `health-sistema.png` | Health do Sistema | `platformHealth` |
| `apis-credenciais.png` | APIs e Credenciais | `apis` |
| `config-plataforma.png` | Configurações (Plataforma) | `platformSettings` |

### Operação · `role: gestor`
| Arquivo | Tela | `screen` |
|---|---|---|
| `dashboard-operacional.png` *(substituído pelo design padronizado)* | Dashboard Operacional | `dashboard` |
| `ordens-servico.png` *(substituído pelo design padronizado)* | Ordens de Serviço (lista) | `workOrders` |
| `os-detalhe.png` | Ordem de Serviço · detalhe | `workOrderDetail` |
| `mapa-operacional.png` | Mapa Operacional | `opsMap` |
| `despachos.png` | Despachos | `dispatches` |
| `aprovacoes-fila.png` | Fila de Aprovações | `approvals` |
| `aprovacao-detalhe.png` | Aprovação · detalhe | `approvalDetail` |
| `estoque.png` | Estoque | `estoque` |
| `estoque-detalhe.png` | Estoque · detalhe | `estoqueDetail` |
| `checklists-operacionais.png` | Checklists Operacionais | `checklistsOps` |
| `checklist-execucao.png` | Execução de Checklist | `checklistRun` |
| `pedidos-compra.png` | Pedidos de Compra | `pedidos` |
| `rotas-logisticas.png` | Rotas Logísticas | `logisticsRoutes` |
| `relatorios.png` | Relatórios | `reports` |

### Despacho · `role: dispatcher`
| Arquivo | Tela | `screen` |
|---|---|---|
| `console-tempo-real.png` | Console Tempo Real | `dispatchConsole` |
| `tecnicos-disponibilidade.png` | Técnicos · Disponibilidade | `dispatchTechs` |
| `operadores-campo.png` | Operadores de Campo | `fieldOperators` |

### Administração · `role: admin`
| Arquivo | Tela | `screen` |
|---|---|---|
| `builder-checklists.png` | Builder de Checklists | `adminChecklists` |
| `usuarios.png` *(substituído pelo design padronizado)* | Usuários | `users` |
| `config-organizacao.png` | Configurações da Organização | `settings` |
| `auditoria-organizacao.png` *(substituído pelo design padronizado)* | Auditoria (organização) | `auditTenant` |
| `notificacoes.png` | Notificações | `notifications` |

### Financeiro · `role: finance`
| Arquivo | Tela | `screen` |
|---|---|---|
| `financeiro.png` *(substituído por `financeiro-ab.reference.html`)* | Financeiro | `financeiro` |
| `cobrancas.png` | Cobranças | `charges` |
| `faturas.png` | Faturas | `invoices` |
| `pagamentos.png` | Pagamentos | `payments` |

---

## ERP Mobile — 39 telas · fonte `ERP Mobile.dc.html`
Navegação: estado `screen` (+ `serviceType`: `guincho`/`prestador`, e `entregaMode` para coleta × entrega).

### Sessão & navegação
| Arquivo | Tela | `screen` |
|---|---|---|
| `splash.png` | Splash | `splash` |
| `login.png` | Login | `login` |
| `selecao-organizacao.png` | Seleção de Organização | `tenant` |
| `home.png` | Home operacional | `home` |
| `os-lista.png` | Lista de OS | `osList` |
| `os-detalhe.png` | Detalhe da OS | `osDetail` |
| `mapa-campo.png` | Mapa · Em campo | `map` |
| `perfil.png` | Perfil | `profile` |
| `perfil-editar.png` | Editar perfil | `profileEdit` |
| `notificacoes.png` | Notificações | `notifications` |
| `chat-lista.png` | Chat · lista | `chatList` |
| `chat-conversa.png` | Chat · conversa | `chatThread` |
| `diagnostico.png` | Diagnóstico do app | `diagnostics` |

### Fluxo Guincho · `serviceType: guincho`
| Arquivo | Tela | `screen` |
|---|---|---|
| `checkin-chegada.png` | Check-in / chegada | `checkin` |
| `status-localizacao.png` | Status de localização | `locStatus` |
| `ocr-placa.png` | Leitura de placa (OCR) | `ocr` |
| `consentimento-lgpd.png` | Consentimento LGPD | `consent` |
| `checklist-coleta.png` | Checklist de Coleta | `checklist` |
| `evidencias.png` | Evidências / fotos | `evidence` |
| `assinatura.png` | Assinatura *(modo paisagem)* | `signature` |
| `sincronizacao.png` | Sincronização (fila offline) | `sync` |
| `conclusao-guincho.png` | Conclusão (Guincho) | `conclusao` |
| `entrega-inicio.png` | Entrega · início | `entrega` (`entregaMode`) |
| `checklist-entrega.png` | Checklist de Entrega | `checklist` (`entregaMode`) |
| `materiais-pecas.png` | Materiais / peças | `materials` |

### Fluxo Prestador · `serviceType: prestador`
| Arquivo | Tela | `screen` |
|---|---|---|
| `prestador-diagnostico.png` | Diagnóstico | `atDiag` |
| `prestador-execucao.png` | Execução do atendimento | `atExec` |
| `prestador-estoque-tecnico.png` | Estoque do técnico | `atStock` |
| `prestador-resumo.png` | Resumo do atendimento | `atResumo` |
| `conclusao-prestador.png` | Conclusão (Prestador) | `conclusao` |

### Aprovação · Despesas (RDV) · Comissões
| Arquivo | Tela | `screen` |
|---|---|---|
| `aprovacoes.png` | Aprovações | `approvals` |
| `despesas-lista.png` | Despesas · lista | `rdvList` |
| `despesa-nova.png` | Nova despesa | `rdvCreate` |
| `despesas-relatorio.png` | Relatório de despesas | `rdvReport` |
| `rdv-novo-item.png` | RDV · novo item | `rdvNew` |
| `rdv-item.png` | RDV · item | `rdvItem` |
| `rdv-recibo.png` | RDV · recibo | `rdvReceipt` |
| `rdv-enviar.png` | RDV · enviar | `rdvSubmit` |
| `comissoes.png` | Comissões | `comStats` |

---

## Notas de captura (para leitura correta das imagens)
- **Web:** shell renderizado a **1440px**; a barra de andaime de dev (URL falsa / PAPEL / TEMA) foi **ocultada** — o que se vê é só o app.
- **Mobile:** aparelho **390×812** escalado para caber inteiro sobre fundo escuro; cada PNG mostra a **dobra inicial** da tela (telas longas rolam dentro do aparelho no protótipo).
- **Estados:** telas de *detalhe* usam a **seleção padrão** do protótipo (ex.: `OS-2891`, item de estoque `Resistor 10kΩ`). A `assinatura` aparece **em paisagem** — é a UX real (assinar girando o aparelho).
- **Fonte da verdade:** onde PNG e código divergirem, o **código-fonte** do protótipo vence para tokens/medidas; o PNG vence para *layout e intenção visual*.
