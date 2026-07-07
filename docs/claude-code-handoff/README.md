# Handoff para Claude Code — ERP Techsolutions

Pacote de entrega para o **Claude Code** implementar os protótipos de design no repositório
oficial (**Node.js + TypeScript** backend · **React** em `frontend/` · **Flutter** mobile).

## Como usar
1. Faça checkout do repositório oficial no **GitHub** e coloque esta pasta na raiz (ou aponte o Claude Code para ela).
2. Abra o **`CLAUDE.md`** — é o **contrato de execução** (governança que espelha o `AGENTS.md`, guia de implementação e o modelo de blocos).
3. Leia **`PROJECT_MEMORY.md`** (estado real: blocos B-076→B-109, stack, contratos, KPIs) e `EXECUTION_MODEL.md` (a **lógica de execução por blocos** que vinha do Codex); use `comando-template.md` para criar cada comando. Consulte `API_CONTRACTS.md` e `BUILD_ORDER.md`.
4. Peça ao Claude Code para começar pela **Fase 0** e depois **Fase 1 (MVP Mobile)** — **um bloco por vez**.
5. Trabalho em **GitHub Flow**: 1 bloco = 1 branch → **PR no GitHub** → CI verde → merge (ver `CLAUDE.md` §8). KPIs **só após avaliação humana**, em bloco separado (ver `EXECUTION_MODEL.md` §4).

## Conteúdo
| Arquivo | O que é |
|---|---|
| `CLAUDE.md` | **Contrato de execução** — governança (espelha AGENTS.md), regras de ouro, papéis/linguagem, web, mobile, sync, modelo de blocos, GitHub Flow, DoD |
| `PROJECT_MEMORY.md` | **Memória viva** — estado real (blocos B-076→B-109), stack confirmada, contratos conectados, invariantes/LGPD, KPIs, decisões, pendências, índice de blocos |
| `screen-refs/` | **Galeria de referência visual** — **74 telas** renderizadas do protótipo (35 Web + 39 Mobile) como alvo pixel a pixel, + `Cloud Billing.reference.html` (padrão-ouro HTML) + `README.md` (índice tela→arquivo→`screen`). Ver `CLAUDE.md` §11 |
| `EXECUTION_MODEL.md` | **Modelo de execução por blocos** — anatomia do bloco, ciclo de vida, política de KPI (10 regras), limpeza, segurança, rastreabilidade |
| `comando-template.md` | Molde de **comando** `B-NNN-<slug>.md` (formato do repo) |
| `API_CONTRACTS.md` | Endpoints por domínio (● já no protótipo · ○ proposto) |
| `BUILD_ORDER.md` | Sequência de blocos/PRs pequenos (MVP mobile primeiro) |
| `ERP Mobile.dc.html` | Protótipo do app de campo (Flutter) — 37 telas, guincho + prestador |
| `ERP Web.dc.html` | Protótipo do console (React) — 37 telas, 5 papéis |
| `Login.dc.html` | Login standalone + seleção de organização |
| `Handoff MVP Mobile.dc.html` | Doc navegável: 11 telas MVP mobile, reconciliação spec × protótipo |
| `Catálogo de Telas e Endpoints.dc.html` | Inventário completo (74 telas) + índice de endpoints |
| `support.js` | Runtime só para **abrir** os `.dc.html` no navegador (não portar) |

## Natureza dos arquivos de design
Os `*.dc.html` são **referências de design em HTML** — protótipos de look, comportamento,
estados e **lógica de interação**. **Não são código de produção.** A tarefa é **recriá-los**
no ambiente existente do repo (React/Flutter), com os padrões e libs de lá. Fidelidade:
**alta** — cores/tipografia/espaçamento/estados são finais.

Para ler a lógica: abra o `.dc.html` como texto — telas são blocos
`<sc-if value="{{ sc_<screen> }}">`; estado e handlers ficam na `class Component` ao final.

## Estado de integração
Tudo é **mock** no protótipo; **nenhuma chamada de rede real**. 13 endpoints já anotados
(`data-endpoint`, marcados ● ) são a prioridade de integração. O resto é contrato proposto.

## Alinhar com a documentação do repo (fonte oficial de regra)
`PRODUCT_CONTEXT.md` · `RBAC_MATRIX.md` · `APPROVAL_LIMITS.md` · `DESIGN_SYSTEM.md` ·
`COMPONENT_LIBRARY.md` · `docs/03-atores-papeis.md` · `docs/04-regras-negocio.md`. O protótipo
é a UI; **permissões, papéis e alçadas oficiais vivem nesses docs** — reconcilie antes de codar.
