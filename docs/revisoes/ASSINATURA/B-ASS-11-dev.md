# B-ASS-11 — diário de dev (Parte T do item 62: a tela "Minha assinatura")

Bloco **B-ASS-11** — a tela do cliente `/administrator/subscription`, com as 3 aparências aprovadas, o item de menu e a pizza
da franquia (`UsagePie`). Revisão reforçada + conferência visual (a trava não casa nenhum caminho do PERMITIDO).
Identidade de dev: **`dev-62t-cl`, Claude Opus 5.5, identidade nova, DECLARADA.** Tela no Claude (`D-DESIGN-SO-CLAUDE`,
`D-CODEX-PRIMEIRO-TELAS-E-PLANOS-NO-CLAUDE`). Não escrevi o plano nem as emendas e não os critiquei.

- **Lei (a mais nova prevalece):** `erp-pausa-2026-10-03/planos/plano-B-ASS-11-emenda1.md` → `plano-B-ASS-11-emenda1.1.md`
  → `plano-B-ASS-11-emenda1.1.1.md`. Fora do repositório.
- **Referência aprovada:** `docs/claude-code-handoff/screen-refs/minha-assinatura-3opcoes.reference.html` (a v3, byte a byte;
  `D-ASS11-MAQUETE-APROVADA`). **Tela-modelo:** `frontend/src/modules/settings/pages/TenantSettingsPage.tsx`; contêiner no
  molde de `ChequesPage.tsx`; dados no molde de `tenant-settings.*` e `useCheques.ts`. Skills `ts-frontend-full` e
  `ui-ux-pro-max`.
- **Ramo:** `feat/ass-minha-assinatura-62t` (nomeado pelo orquestrador; a Emenda 1.1 §4.2 cita `feat/my-subscription-view`, e
  o T-G3 aceita os dois). **Worktree:** `~/w-62t`, a partir de `origin/main` `b00f3161` (#574); `npm ci` próprio na raiz e
  no `frontend/` (sem junction); `prisma generate` com `DATABASE_URL` fictícia.
- **Atualização com a `main`:** por **merge** (a `4acd14ad`, #569, entrou depois do 1º push). Rebase exigiria push com force,
  que é proibido; os comandos do §1.3, que pedem rebase, rodaram num worktree destacado descartável.
- **Banco e Docker:** nenhum. A API não subiu: nas capturas, a rede da API é interceptada no navegador.
- **Diário completo, com cada comando e a hora de `date`:** `erp-pausa-2026-10-03/revisoes/b-ass-11/dev-62t-cl.md`, fora do
  repositório. Abaixo, o resumo por fatia.

## Fatias

| fatia | o que entrou | vermelho antes | verde depois |
|---|---|---|---|
| Fm-b | a v3 aprovada em `screen-refs/` (md5 `5fcd42a2…`) e a linha no README | — | — |
| F0 | este comando do bloco; base N | T-M1 a T-M5: 5/5 por asserção | base: `test:smoke` **1806/1806** em 201 arquivos |
| F1 | `UsagePie` + `UsageBadge` na biblioteca, CSS, `COMPONENT_LIBRARY.md` | T-U: o `index.ts` não exportava (`SyntaxError`) | T-U1 a T-U6: 6/6 |
| F2 | tipos, adapter por nível (allowlist), service, modelo puro, hook com o único relógio | T-A: módulo afastado (`ERR_MODULE_NOT_FOUND`) | T-A1 (8 níveis + sem extras) a T-A9: 18/18 |
| F3 | peças comuns, aparência A, contêiner, rota no `App.tsx` | T-M1 vermelho na F0 | T-M1 ok |
| F4 | aparências B e C, registro de aparência, linha no guard | T-S: vistas afastadas; guard (iii) sem a referência | T-S1 a T-S7: 8/8; guard 29/29 |
| F5 | estados, teclado, foco e cópia, provados na tela real | T-L: página afastada | T-L1 a T-L9: 9/9, 0 erro no console |
| F6 | menu nos 3 lugares (no fim), `MVP_NAV_PATHS`, matriz, docs, `test:smoke` | T-G2 com campo de dinheiro injetado | T-M 5/5; T-G1 a T-G3 4/4; regressão de menu 70/70 (front) e 14/14 (raiz) |
| visual | conferência contra a referência (66 capturas, 0 achado) e ajustes | — | ver abaixo |
| F7 | bateria, as 18 mutações, o §4.1, o §1.3, o registro e o PR | — | ver abaixo |

## Decisões de forma (declaradas)

- O selo "Passou do limite"/"Em estimativa" é o export `UsageBadge` do `UsagePie.tsx`, porque a referência o põe no cabeçalho
  do cartão.
- A situação na tela sai sempre de `overdue` (a linha contratual), para a MT-13 ter efeito visível.
- "Acesso não permitido" reusa `.apardash-acesso` (o mesmo do Dashboard aprovado, que a maquete copiou).
- O aviso da cópia aparece dentro do detalhe do "Como pagar" (`ui-alert`, `role="status"`, padrão de `BaixaForm.tsx`), e não
  como toast fixo: o toast da maquete é recurso dela para ações simuladas.
- "Tentar de novo" (texto da emenda e da maquete), numa faixa com as classes do `StaleDataBanner` (que diz "Tentar
  novamente").
- Na aparência A, o selo do período fica à direita do título, como na referência: a regra genérica `.page-heading` (grade)
  vence `.page-heading--row` no `app.css`; regra com escopo na tela e a pendência `P-PAGE-HEADING-ROW-GRADE`.
- Os blocos são `<button type="button">` nativos: Enter e Espaço são do navegador; Esc fecha pela raiz da vista e devolve o
  foco ao bloco.
