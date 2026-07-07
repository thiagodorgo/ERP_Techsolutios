---
name: ui-ux-pro-max
description: "QA de UI/UX e boas práticas para o ERP Techsolutions (SaaS multi-tenant de serviços de campo). Usar ao criar ou revisar telas web React/TS/Tailwind (tabelas densas, modais de cadastro, formulários, dashboards KPI, listas com filtros) e telas Flutter do app de campo. Ações: revisar, criar, implementar, corrigir e validar UI/UX. NÃO usar para escolher estilo, paleta, fonte ou tema — o design system do projeto é fixo e aprovado."
---

# UI/UX Pro Max — Edição ERP Techsolutions

## REGRA ZERO — Design system congelado
O design system deste projeto está APROVADO e é IMUTÁVEL por esta skill:
- Fonte de verdade: `DESIGN_SYSTEM.md`, `COMPONENT_LIBRARY.md` e os tokens
  já existentes no código (web e Flutter).
- Paleta fixa: azul industrial profundo (primária), neutros slate/steel,
  cyan/azul elétrico (acento). Sidebar colapsável é o padrão estrutural.
- Esta skill NUNCA propõe, escolhe ou altera: estilo visual, paleta,
  tipografia, tema, radius, sombras, layout global ou navegação estrutural.
- PROIBIDO usar `--design-system`, `--persist`, e os domínios `style`,
  `color`, `typography`, `google-fonts`, `landing`, `product` e `prompt`
  do search.py como fonte de DECISÃO. Se consultados por curiosidade,
  nada do resultado pode sobrescrever os tokens do repo.
- Precedência em qualquer conflito:
  decisões do prompt em execução e arquivos do repo (DESIGN_SYSTEM.md,
  COMPONENT_LIBRARY.md, RBAC_MATRIX.md, mobile-sync-contracts.md)
  > esta skill > julgamento próprio.

## Papel desta skill
Garantir QUALIDADE DE EXECUÇÃO da UI dentro do padrão aprovado:
acessibilidade, densidade operacional, estados, formulários, navegação,
gráficos/KPIs e checklist pré-entrega. É uma skill de revisão e
implementação correta — não de direção de arte.

## Stack real do projeto (corrige a versão genérica)
- Web: React 18 + TypeScript + Vite + Tailwind. Componentes de
  `frontend/src/components` e padrões de página espelhados das páginas
  existentes (ex.: WorkOrdersListPage.tsx).
- Mobile: Flutter 3.x + Material 3 (app de campo, offline-first).
  Diretrizes de stack Flutter vêm das skills flutter-ai-architect /
  flutter-expert; esta skill cobre UX e QA visual.
- `--stack react-native` do search.py NÃO se aplica; para guidance de
  app nativo usar `--domain web` (touch, safe areas, acessibilidade).

## Quando usar
- Criar/revisar qualquer tela, modal, formulário, tabela, card ou gráfico
  (web ou Flutter) — na fase de PLANEJAMENTO e antes do gate de merge.
- Revisão de acessibilidade, estados de interação, feedback de erro,
  densidade e hierarquia de informação.
- Validar dashboards e KPIs (tipo de gráfico correto para a pergunta de
  negócio; regra da skill flutter-ai-architect também se aplica:
  gráfico se escolhe pelo dado, não pela estética).

## Quando NÃO usar
- Backend puro, API, banco, DevOps.
- Qualquer decisão de identidade visual (já tomada).

## Domínios liberados do search.py
| Necessidade | Comando |
|---|---|
| Boas práticas UX (foco, loading, z-index, animação) | `--domain ux "<tema>"` |
| Escolha/QA de gráficos para KPIs | `--domain chart "<tipo de dado>"` |
| Performance React (rerender, memo, listas) | `--domain react "<tema>"` |
| Guidance mobile (touch, safe area, a11y) | `--domain web "<tema>"` |

## Regras prioritárias adaptadas ao ERP (ordem de auditoria)

### 1. Acessibilidade (CRÍTICO)
Contraste 4.5:1 (texto) e 3:1 (elementos grandes) — validar com a paleta
aprovada, nunca ajustando a paleta: se um par falhar, usar o token de
texto/superfície correto do design system, não inventar cor. Foco visível,
navegação por teclado na web (operador de balcão usa teclado), labels em
todos os inputs, aria-label em botões de ícone, erros com role="alert".

### 2. Densidade operacional (CRÍTICO — identidade do produto)
Telas do ERP são densas, escaneáveis e estruturadas:
- Tabelas: cabeçalho fixo, ordenação com aria-sort, paginação, busca e
  filtros persistentes (voltar da tela de detalhe NÃO pode perder filtro
  — state-preservation), números tabulares em colunas de valores/datas,
  truncar com ellipsis + tooltip, nunca quebrar linha em coluna de código.
- Toda lista tem SEMPRE os 4 estados: loading (skeleton, não spinner
  bloqueante), vazio (mensagem + ação, ex.: "Nenhum cliente — Cadastrar"),
  erro (causa + botão tentar de novo), populado.
- Nada de dado técnico cru na UI (UUIDs, enums internos, JSON).

### 3. Estados semânticos (CRÍTICO — obrigatórios do projeto)
Os 12 estados têm representação visual consistente em TODA tela:
sucesso, aviso, perigo, informação, pendente, escalado, rascunho,
agendado, em execução, reconciliado, auditoria, exceção.
Regra: cor NUNCA é o único indicador — sempre cor + ícone e/ou rótulo
(chips/badges do COMPONENT_LIBRARY.md). Multi-tenant: contexto do tenant
e do papel sempre inequívocos; elemento sem permissão RBAC não renderiza
desabilitado "de enfeite" — some ou explica.

### 4. Formulários e modais de cadastro (ALTO)
- Label visível (nunca só placeholder), obrigatórios marcados, helper
  text persistente em campos complexos (documento, placa).
- Validação no blur, erro abaixo do campo com causa + como corrigir;
  após submit com erro, focar o primeiro campo inválido.
- Submit com estado de loading e desabilitado durante o envio; sucesso
  confirmado (toast auto-dismiss 3–5s, aria-live="polite").
- Modal: fecha por X, ESC e clique no scrim; confirmar antes de fechar
  com alterações não salvas; ação destrutiva (desativar cadastro) pede
  confirmação e usa a cor de perigo separada da ação primária.
- Inputs mobile com type semântico (tel, email, number) e altura ≥44px.

### 5. Navegação (ALTO)
Sidebar colapsável é fixa: itens novos entram como grupo/subitem no
padrão do tenantNavigation.ts, com ícone + rótulo (nunca só ícone),
estado ativo destacado, visibilidade por RBAC. Voltar preserva scroll,
filtros e inputs. Breadcrumb em hierarquias de 3+ níveis. Modal não é
navegação primária.

### 6. Dashboards e gráficos (MÉDIO)
- Tendência → linha; comparação → barra; proporção → pizza/rosca só até
  5 categorias (acima disso, barra); tempo com granularidade explícita.
- Todo gráfico: legenda visível, tooltip com valor exato, eixos com
  unidade, skeleton no loading, estado vazio com orientação, estado de
  erro com retry — nunca eixo em branco.
- Cores das séries derivadas dos tokens semânticos aprovados; daltonismo:
  nunca só vermelho/verde para distinguir séries.
- KPI cards: número tabular, rótulo claro, período explícito ("hoje",
  "no mês") — sem número solto sem contexto.

### 7. Interação e feedback (MÉDIO)
Feedback de press em ≤100ms; micro-interações 150–300ms, transform/
opacity apenas; skeleton para operações >1s; botões async desabilitados
com spinner; cursor-pointer em clicáveis; respeitar
prefers-reduced-motion.

### 8. App de campo Flutter (ALTO quando o bloco tocar mobile)
- Alvos de toque ≥48dp, espaçamento ≥8dp, uso com luva/sol: priorizar
  legibilidade e contraste dentro dos tokens.
- Safe areas respeitadas (notch, gesture bar); botão primário fora da
  zona de gesto.
- Offline é estado de primeira classe: indicador de fila/sync visível,
  ação nunca "some" sem feedback, retry claro; estados por tela iguais
  aos da web (loading/vazio/erro/populado + offline).
- Ícones vetoriais de uma única família (nunca emoji como ícone),
  tamanhos por token.

## Checklist pré-merge (rodar em TODA PR com tela; anexar resultado à PR)
Web:
- [ ] Tokens/componentes do design system em 100% dos elementos novos
      (zero hex/tamanho hardcoded)
- [ ] 4 estados da tela implementados (loading/vazio/erro/populado)
- [ ] Estados semânticos com cor + ícone/rótulo (nunca cor sozinha)
- [ ] Filtros/scroll preservados no voltar; tabela ordenável e paginada
- [ ] Labels, erros com recuperação, foco pós-erro, contraste 4.5:1
- [ ] Navegação: item com ícone+rótulo, ativo destacado, RBAC aplicado
- [ ] Gráficos com legenda, tooltip, vazio/erro tratados
- [ ] Teclado: fluxo completo operável sem mouse
Flutter (quando aplicável):
- [ ] Toque ≥48dp, safe areas, feedback de press ≤100ms
- [ ] Estados offline/fila de sync visíveis e testados
- [ ] Sem emoji como ícone; família única de ícones
- [ ] reduced-motion e escala de fonte do sistema sem quebra de layout