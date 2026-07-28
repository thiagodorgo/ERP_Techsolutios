# `screen-refs/` — Referências de fidelidade visual (alvo pixel a pixel)

Esta pasta é o **alvo visual** das telas do ERP, conforme o **`CLAUDE.md` §11 (Fidelidade
visual — referências renderizadas)**. Quando existir uma referência renderizada para a tela do
bloco que você está implementando, ela é o **alvo exato**: mesma grade, mesmos tokens, mesma
densidade, mesma cópia.

> **Recriar, não reinterpretar.** A referência não é código para copiar — é o pixel/estrutura
> já resolvidos que o React (web) ou o Flutter (mobile) devem reproduzir fielmente. Sem
> simplificar, sem inventar abas, sem andaime de dev na UI.

---

## 1. Estado dos assets (HONESTO — leia antes de usar)

O `CLAUDE.md` §11 descreve esta pasta com **35 PNGs web**, **39 PNGs mobile** e um
`Cloud Billing.reference.html` **na raiz** (`screen-refs/`). A verdade atual do repositório:

- **Esta pasta raiz `screen-refs/` ainda NÃO contém os PNGs/HTML** — no momento ela guarda
  apenas este README. **NÃO** afirme que os renders estão aqui: eles não estão **neste caminho**.
- **Porém esses assets NÃO estão perdidos.** Eles **já existem no repositório, versionados no
  git**, sob **`docs/claude-code-handoff/screen-refs/`**:
  - `docs/claude-code-handoff/screen-refs/web/` — **35 PNGs** (ERP Web, agrupados por papel).
  - `docs/claude-code-handoff/screen-refs/mobile/` — **39 PNGs** (ERP Mobile).
  - `docs/claude-code-handoff/screen-refs/Cloud Billing.reference.html` — padrão-ouro em HTML.
  - `docs/claude-code-handoff/screen-refs/README.md` — **índice completo** (tabela PNG → chave
    `screen`, agrupada por papel/fluxo). **É a referência de mapeamento definitiva hoje.**
- **A pendência real é de ESPELHAMENTO/caminho**, não de asset faltante: os renders precisam ser
  **espelhados/movidos** para esta raiz `screen-refs/` **ou** o `CLAUDE.md` §11 precisa passar a
  apontar para `docs/claude-code-handoff/screen-refs/`. Enquanto isso não é decidido, **use as
  cópias em `docs/claude-code-handoff/screen-refs/`** — são as mesmas imagens que o §11 descreve.

### Fonte de verdade visual vigente: os protótipos `.dc.html`

Independentemente dos PNGs, a **grade, os tokens e a cópia exatos** vêm do **código-fonte do
protótipo** (`.dc.html`). Onde PNG e código divergirem: **código vence para tokens/medidas; PNG
vence para layout/intenção visual**. Protótipos presentes no repo (em
`docs/claude-code-handoff/`):

| Arquivo (`.dc.html`) | Papel | Presente? |
|---|---|---|
| `ERP Web.dc.html` | Console ERP (React) — 37 telas, 5 papéis | ✅ sim |
| `Login.dc.html` | Login standalone (web + seleção de organização) | ✅ sim |
| `Handoff MVP Mobile.dc.html` | Doc: 11 telas MVP mobile, reconciliação spec × protótipo | ✅ sim |
| `Catálogo de Telas e Endpoints.dc.html` | Doc: inventário (74 telas) + endpoints | ✅ sim |
| `ERP Mobile.dc.html` | App de campo (Flutter) — 37 telas | ⚠️ **NÃO está no repo** |

> **Nota honesta sobre mobile:** o `CLAUDE.md` Parte B §1 e o índice em
> `docs/claude-code-handoff/screen-refs/README.md` citam **`ERP Mobile.dc.html`** como fonte das
> telas de campo, mas **esse arquivo não existe no repositório** (só 4 `.dc.html` estão
> presentes). Para o mobile, a fidelidade se apoia hoje nos **39 PNGs** de
> `docs/claude-code-handoff/screen-refs/mobile/` + no doc `Handoff MVP Mobile.dc.html`. Se o
> protótipo mobile completo for necessário, ele é uma pendência de asset a solicitar.

**Como ler a lógica de um `.dc.html`** (abra como texto): cada tela é um bloco
`<sc-if value="{{ sc_<screen> }}">…</sc-if>`; o **estado** e os **handlers** ficam na
`class Component` (`renderVals()`, `setState`, métodos de ação). O `support.js` é só runtime para
abrir o protótipo no navegador — **não portar**.

---

## 2. Estrutura intencionada desta pasta (quando os renders forem espelhados aqui)

Quando os PNGs forem promovidos para esta raiz (ou este README for atualizado para apontar ao
caminho definitivo), a organização é:

```
screen-refs/
├── README.md                      ← este arquivo (índice + regras)
├── web/                           ← 35 PNGs do ERP Web, agrupados por papel
│   ├── (Plataforma · role: platform)     visao-geral-plataforma, organizacoes,
│   │                                      organizacao-detalhe, planos-e-modulos,
│   │                                      cloud-billing ★, auditoria-plataforma,
│   │                                      health-sistema, apis-credenciais, config-plataforma
│   ├── (Operação · role: gestor)         dashboard-operacional, ordens-servico, os-detalhe,
│   │                                      mapa-operacional, despachos, aprovacoes-fila,
│   │                                      aprovacao-detalhe, estoque, estoque-detalhe,
│   │                                      checklists-operacionais, checklist-execucao,
│   │                                      pedidos-compra, rotas-logisticas, relatorios
│   ├── (Despacho · role: dispatcher)     console-tempo-real, tecnicos-disponibilidade,
│   │                                      operadores-campo
│   ├── (Administração · role: admin)     builder-checklists, usuarios, config-organizacao,
│   │                                      auditoria-organizacao, notificacoes
│   └── (Financeiro · role: finance)      financeiro, cobrancas, faturas, pagamentos
├── mobile/                        ← 39 PNGs do ERP Mobile (aparelho 390×812 inteiro)
│   ├── (Sessão & navegação)              splash, login, selecao-organizacao, home, os-lista,
│   │                                      os-detalhe, mapa-campo, perfil, perfil-editar,
│   │                                      notificacoes, chat-lista, chat-conversa, diagnostico
│   ├── (Fluxo Guincho · serviceType:     checkin-chegada, status-localizacao, ocr-placa,
│   │   guincho)                          consentimento-lgpd, checklist-coleta, evidencias,
│   │                                      assinatura, sincronizacao, conclusao-guincho,
│   │                                      entrega-inicio, checklist-entrega, materiais-pecas
│   ├── (Fluxo Prestador · serviceType:   prestador-diagnostico, prestador-execucao,
│   │   prestador)                        prestador-estoque-tecnico, prestador-resumo,
│   │                                      conclusao-prestador
│   └── (Aprovação · Despesas/RDV ·       aprovacoes, despesas-lista, despesa-nova,
│       Comissões)                        despesas-relatorio, rdv-novo-item, rdv-item,
│                                         rdv-recibo, rdv-enviar, comissoes
└── Cloud Billing.reference.html   ← padrão-ouro em HTML estático isolado
```

`Cloud Billing.reference.html` é a **única** tela também exportada como **HTML estático,
renderizado e autocontido** — use-a como exemplo do nível de fidelidade exigido nas demais.

### Convenção de mapeamento PNG → chave `screen`

Cada PNG corresponde a **uma** chave `screen` no protótipo. A navegação depende de dimensões de
estado:

- **Web:** `screen` **+ `role`** (o papel define a sidebar/agrupamento). Ex.:
  `visao-geral-plataforma.png` → `screen: platformDashboard` com `role: platform`;
  `os-detalhe.png` → `screen: workOrderDetail` com `role: gestor`.
- **Mobile:** `screen` **+ `serviceType`** (`guincho`/`prestador`) **+ `entregaMode`** (coleta ×
  entrega). Ex.: `checklist-coleta.png` → `screen: checklist` (`serviceType: guincho`);
  `checklist-entrega.png` → `screen: checklist` com `entregaMode` de entrega.

> A **tabela completa e definitiva** (arquivo → tela → chave `screen`, por papel/fluxo) está em
> **`docs/claude-code-handoff/screen-refs/README.md`**. Consulte-a ao localizar a referência de
> uma tela.

---

## 3. Fluxo de trabalho por tela (§11)

1. **Abra o PNG** da tela (quando existir — hoje em `docs/claude-code-handoff/screen-refs/…`) →
   é o **alvo visual** (layout, densidade, composição completa).
2. **Leia o mesmo `screen`** no `.dc.html` correspondente → grade, tokens e cópia exatos.
3. **Reproduza em React (web) / Flutter (mobile)** usando os componentes do repo
   (`DESIGN_SYSTEM.md`, `COMPONENT_LIBRARY.md`); onde houver equivalente, **use o do repo**.
4. **Regra de desempate:** **código vence** para tokens/medidas; **PNG vence** para
   layout/intenção visual.
5. **Linguagem PT-BR de negócio, sempre:** "Organização/Organizações", **nunca**
   "Tenant/Tenants" — nem em coluna, chip, placeholder ou título (ver `CLAUDE.md` §3).
6. **Estados obrigatórios (§7):** loading/skeleton · empty · error · **acesso não permitido** ·
   offline/sync (mobile) · dados desatualizados — já desenhados no protótipo, recriar.
7. **Nada de andaime de dev na UI:** sem badges `PLANNED`/`TODO`/`WIP`, sem código de tela
   (`P04…`) visível, sem path de rota/endpoint como subtítulo.

### Notas de captura (para ler as imagens corretamente)

- **Web:** shell renderizado a **1440px**; a barra de andaime de dev (URL falsa / PAPEL / TEMA)
  foi **ocultada** — o que se vê é só o app.
- **Mobile:** aparelho **390×812** inteiro sobre fundo escuro; cada PNG mostra a **dobra
  inicial** (telas longas rolam dentro do aparelho). `assinatura` aparece **em paisagem** — é a
  UX real (assinar girando o aparelho).
- **Detalhes:** telas de *detalhe* usam a **seleção padrão** do protótipo (ex.: `OS-2891`, item
  `Resistor 10kΩ`).

---

## 4. Regras de fidelidade (resumo do `CLAUDE.md` §11)

1. **Linguagem PT-BR de negócio, sempre** — "Organização/Organizações", **nunca**
   "Tenant/Tenants" (ver §3).
2. **Nada de andaime de dev na UI** — sem `PLANNED`/`TODO`/`WIP`, sem código de tela visível,
   sem rota/endpoint como subtítulo.
3. **Acentuação correta** — Visão, Órgão, Configurações, Auditoria, média… (jamais
   "Configuracoes", "Saude", "Operacoes").
4. **Page header = título + subtítulo + ações à direita** (seletores + botão primário). Nunca um
   único botão esticado ocupando a largura toda.
5. **KPIs com semântica** — reproduza **todos** os cards (valor + variação + selo de risco com a
   cor certa: azul plataforma · verde sucesso · âmbar atenção · vermelho crítico · roxo receita).
6. **Composição completa** — se a referência tem gráficos, painel "O que mudou?" (IA) e tabela
   de recursos, **todos** entram. Não reduza a tela a "KPIs + tabela".
7. **Sidebar** — grupos e ordem exatos (PRINCIPAL / PLATAFORMA…), item ativo azul sólido, ícone
   e texto brancos; colapso **236→74px** preserva ícones e badges.

---

## 5. Pendência registrada

Os renders de referência (35 PNGs web + 39 PNGs mobile + `Cloud Billing.reference.html`) que o
`CLAUDE.md` §11 espera **nesta raiz `screen-refs/`** são uma **pendência de espelhamento de
asset** (as imagens existem em `docs/claude-code-handoff/screen-refs/`, mas ainda não foram
promovidas/apontadas para este caminho). Adicionalmente, o protótipo **`ERP Mobile.dc.html`**
citado pelo `CLAUDE.md` Parte B §1 é uma **pendência de asset faltante** (não está no repo). Ver
**`agent-orchestration/controle/pendencias.md`** para o registro e a decisão de tratamento.

**Até a resolução, para qualquer tela use, nesta ordem:**
1. o PNG correspondente em **`docs/claude-code-handoff/screen-refs/`** (alvo visual);
2. o mesmo `screen` no **`.dc.html`** presente (grade/tokens/cópia — para mobile, os PNGs +
   `Handoff MVP Mobile.dc.html`);
3. **`DESIGN_SYSTEM.md`** e **`COMPONENT_LIBRARY.md`** (tokens, estados e componentes canônicos
   do repo).
