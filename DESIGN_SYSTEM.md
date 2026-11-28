# ERP Techsolutions — Design System

## Purpose
Shared design system baseline for React, Flutter, and Figma. It should support the operational mission of ERP Techsolutions by increasing clarity, confidence, speed, traceability, and decision support across the platform.

## Product qualities
- operational clarity
- trust and control
- speed for repetitive work
- strong state visibility
- low ambiguity in approvals, status, and exceptions
- continuity across web, mobile, and future module expansion

## Design principles
- prioritize operational readability over visual ornament
- make tenant, status, risk, approval, and blockage states unmistakable
- optimize for daily ERP usage with dense but structured screens
- keep web and mobile behavior aligned, with platform-appropriate adaptation
- support field operation as seriously as administrative coordination
- reinforce auditability, approval visibility, and exception awareness through interface semantics

## Color system
### Core
- Primary: a marca Pátio Sul ERP (`D-DONO-2511-MARCA-PATIOSUL`): grafite nos fundos e painéis e o amarelo da marca (`--ps-amarelo`) na ação principal; os tokens estão na seção "Marca Pátio Sul ERP", abaixo. O azul antigo (`--color-core-primary` e família) segue nas telas de dentro até o bloco das telas azuis pelos tokens (`D-DONO-2511-MARCA-TELAS-AZUIS-PELOS-TOKENS`).
- Secondary: slate / steel neutrals for structure and dense interfaces
- Accent: o amarelo da marca no item ativo e no foco da sidebar, e o filete amarelo-laranja (`--ps-filete`) como assinatura da marca; o ciano e o azul elétrico antigos ficam só nas telas de dentro, na mesma transição.

### Semantic ERP states
- Success / completed
- Warning / attention needed
- Danger / blocked or critical error
- Info / informational status
- Pending / waiting approval or execution
- Escalated / higher-level intervention required
- Draft / not yet committed
- Scheduled / planned future action
- In service / field execution in progress
- Reconciled / financially or operationally validated
- Audit / traceability view state
- Exception / policy deviation under review

## Marca Pátio Sul ERP — tokens `--ps-*` (2026-11-27)

Decisões do dono que esta seção aplica: `D-DONO-2511-MARCA-PATIOSUL` (o nome do sistema e as cores dos logos),
`D-DONO-2511-MARCA-APARENCIA-PADRAO-C` (a Grafite é a de fábrica), `D-DONO-2711-LOGIN-APROVADO-GRAFITE-CARTAO-BRANCO`
(o login Grafite com o cartão branco), `D-DONO-2711-LOGIN-MAIS-BRANCA-E-PRETA` (a Branca e a Preta) e
`D-DONO-2711-SIDEBAR-MODELO-VIDEO` (a sidebar de vidro grafite). O registro está em `agent-orchestration/controle/decisoes.md`;
a referência do login é `docs/claude-code-handoff/screen-refs/login-patiosul.reference.html`.

- **Prefixo próprio, só acréscimo.** Os tokens da marca usam o prefixo `--ps-` e entram em
  `frontend/src/styles/tokens/tokens.css` sem mudar nenhum token que já existe. Repintar o sistema inteiro (as telas
  azuis) é o bloco das telas azuis pelos tokens, não este passo.
- **Cor só por token.** Nas telas da marca (o login e a sidebar), nenhuma cor é escrita solta no componente nem na folha
  de estilo da tela: toda cor vem de um token `--ps-*`.
- **Três cores do sistema.** A Grafite é o valor de base (`:root`). A Branca e a Preta trocam os valores pelo atributo
  `data-tema` no elemento raiz da página. O cartão do login é branco nas três.
- **Os vermelhos não se unificam aqui.** O sistema já tem `--color-status-danger` (`#DC2626`); a marca traz `--ps-perigo`
  (`#B42318`, a faixa de erro do login) e `--ps-sb-contador` (`#BF0000`, a pílula do contador), das maquetes aprovadas.
  Unificar os vermelhos é do bloco das telas azuis pelos tokens; ninguém "alinha" por conta própria.

### Tokens da marca (valor da Grafite)

| Token | Valor | Uso |
|---|---|---|
| `--ps-grafite` | `#3A3E3E` | fundo da página do login |
| `--ps-grafite-fundo` | `#2B2E2E` | fim do degradê do painel |
| `--ps-painel` | degradê a 155 graus: `#6F7373`, `#4C5050` a 45%, `#2B2E2E` | painel da marca no login; fundo do shell com a sidebar solta |
| `--ps-brasa` | `rgba(184,64,30,.55)`, em degradê radial | o calor no canto do painel |
| `--ps-filete` | degradê a 90 graus, de `#FBB343` a `#B8401E` | o filete do login |
| `--ps-amarelo` e `--ps-amarelo-hover` | `#FDC300` e `#E8B100` | botão Entrar; foco na sidebar |
| `--ps-sobre-amarelo` | `#1A1A1A` | texto sobre o amarelo |
| `--ps-superficie` | `#FFFFFF` | cartão |
| `--ps-texto` e `--ps-texto-mudo` | `#232626` e `#585C5C` | textos do cartão |
| `--ps-borda-campo` e `--ps-fio` | `#7A7E7E` e `#E4E4E0` | borda do campo; linha fina |
| `--ps-link` | `#7A5C00` | "Esqueci minha senha" |
| `--ps-foco` e `--ps-foco-anel` | `#232626` e `rgba(35,38,38,.22)` | foco no cartão |
| `--ps-perigo`, `--ps-perigo-fundo`, `--ps-perigo-borda` | `#B42318`, `#FDECEA`, `#E9B8B0` | faixa de erro do login |
| `--ps-sb-vidro` | degradê vertical de `rgba(78,82,82,.66)` a `rgba(36,39,39,.78)`, com desfoque de 18 px | o vidro da sidebar |
| `--ps-sb-solido` | `#34383A` | a sidebar sem vidro (navegador sem `backdrop-filter`) |
| `--ps-sb-texto` e `--ps-sb-texto-forte` | `#DCDCD8` e `#FFFFFF` | item; item sob o mouse e nome |
| `--ps-sb-rotulo` | `rgba(255,255,255,.80)` | rótulo de grupo, como TEXTO |
| `--ps-sb-contador` | `#BF0000` | FUNDO da pílula do contador, com número branco (6,53 para 1) |
| `--ps-sb-ok` | `#5BD66B` | ponto "tudo no ar", elemento gráfico |
| `--ps-sb-ativo-fundo` e `--ps-sb-ativo-texto` | `#FDC300` e `#1A1A1A` | item ativo (10,76 para 1) |

**Contraste da sidebar, diferença declarada em relação à maquete.** A maquete trazia o rótulo de grupo em branco a 44% e o
ponto "tudo no ar" em `#3BB54A`, que ficam em 2,66 e 2,50 para 1 no alto da sidebar, abaixo do mínimo. Com os valores da
tabela, as contas sobre os tokens dão 4,96 (rótulo) e 3,57 (ponto) no alto e 9,95 e 7,92 na base; sem o vidro, sobre o
sólido, 8,24 e 6,36. A medida na tela renderizada é do aceite da sidebar.

### Tokens de apoio do login (da maquete aprovada)

| Token | Valor (Grafite) | Uso |
|---|---|---|
| `--ps-painel-texto` | `#FFFFFF` | nome e frase no painel da marca |
| `--ps-superficie-2` | `#F1F1EE` | fundo do botão do olho sob o mouse |
| `--ps-cartao-borda` | `#E4E4E0` | borda do cartão |
| `--ps-cartao-sombra` | `0 10px 30px rgba(20,22,22,.35)` | sombra do cartão |
| `--ps-ok`, `--ps-ok-fundo`, `--ps-ok-borda` | `#166534`, `#F0FDF4`, `#BBF7D0` | aviso de senha alterada |
| `--ps-aviso`, `--ps-aviso-fundo`, `--ps-aviso-borda` | `#6B4E00`, `#FFF7E0`, `#E8C86A` | faixa do modo demonstração |

### As três cores: o que a Branca e a Preta trocam

| Token | Grafite (de fábrica) | Branca | Preta |
|---|---|---|---|
| `--ps-grafite` (fundo da página) | `#3A3E3E` | `#F4F4F1` | `#000000` |
| `--ps-grafite-fundo` (fim do degradê) | `#2B2E2E` | `#ECECE8` | `#000000` |
| `--ps-painel` (degradê a 155 graus) | `#6F7373`, `#4C5050` a 45%, `#2B2E2E` | `#FFFFFF`, `#FAFAF8` a 45%, `#ECECE8` | `#1C1C1C`, `#0E0E0E` a 45%, `#000000` |
| `--ps-painel-texto` | `#FFFFFF` | `#232626` | `#FFFFFF` |
| `--ps-brasa` | `rgba(184,64,30,.55)` | `rgba(253,195,0,.18)` | `rgba(184,64,30,.55)` |
| `--ps-cartao-borda` | `#E4E4E0` | `#DFDFDA` | `#E4E4E0` |
| `--ps-cartao-sombra` | `0 10px 30px rgba(20,22,22,.35)` | `0 6px 22px rgba(35,38,38,.10)` | `0 12px 34px rgba(0,0,0,.60)` |
| logo | o de letras amarelas, transparente | o de letras pretas, sem moldura, misturado ao fundo claro (`mix-blend-mode: multiply`) | o de letras amarelas, transparente |

O resto (cartão, textos, campos, botão, link, foco e faixas) é igual nas três. Os valores da Branca e da Preta são os da
maquete aprovada (aparências 2 e 3). O logo entra sem a linha do site, porque o repositório é público
(`P-MARCA-LOGO-SEM-SITE`). Por enquanto a cor escolhida só aparece no login: a sidebar só tem desenho aprovado em grafite
(`P-MARCA-SIDEBAR-BRANCA-PRETA`), e as telas de dentro seguem nos tokens azuis até o bloco das telas azuis pelos tokens.

## Typography
- Sans-serif UI family for clarity and density
- Strong hierarchy for page title, section title, table emphasis, labels, helper text
- Numeric and tabular readability for finance, inventory, and operational grids
- Clear distinction between command actions, evidence text, audit text, and helper text

## Spacing
- consistent spacing scale for tokens
- compact mode support for dense ERP tables and forms
- larger spacing only for summaries, empty states, and high-level dashboards
- preserve scanning efficiency for operational users under time pressure

## Core components
- buttons
- icon buttons
- inputs
- selects
- date/time pickers
- tables and data grids
- cards
- tabs
- side navigation
- top bars
- badges
- status chips
- drawers
- modals
- confirmation panels
- timeline / activity log
- approval stepper
- audit log row patterns

## States
Every major component should define:
- default
- hover / focus (web)
- active
- disabled
- loading
- empty
- error
- success
- blocked
- escalated
- read-only
- pending approval
- exception
- audit-visible

## Approval and control patterns
- approval cards should show requester, impact, threshold, urgency, and next approver
- blocked states should explain why the action is blocked and what resolves it
- escalation states should show who now owns the decision
- destructive actions should be visually distinct and confirmation-bounded
- audit and exception-related UI should make traceability visible without overwhelming primary workflows

## Figma alignment
- Figma should use the same naming for tokens, semantic states, and component families
- Web and mobile libraries should inherit from the same semantic model, even when implementation differs
- Figma artifacts should help preserve consistency between strategy, UX, and implementation rather than becoming a disconnected design layer
- The current repository technical implementation is being organized around React, Flutter, and a Node.js + TypeScript backend baseline, pending final architectural validation

## Operational alignment
- design should support both administrative precision and field execution speed
- tenant context should be visible where it affects decisions or risk
- permission-sensitive actions should present state clearly before the user attempts the action
- approval, blocked, escalated, reconciled, and evidence-capture moments should be treated as first-class design situations

## Implementation note
This file is the semantic source of truth. Detailed tokens and component mappings belong in COMPONENT_LIBRARY.md and later project documentation.
