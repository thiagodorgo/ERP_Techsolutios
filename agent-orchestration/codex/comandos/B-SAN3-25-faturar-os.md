# B-SAN3-25 — a web fatura a OS (item 50 do portão)

- **Ramo:** `feat/web-faturar-os` · **PR:** #559 (rascunho até a pré-revisão).
- **Papel destas execuções:** DEV; não planejam, não criticam e não votam.
- **Executores** (todos Claude **Opus** 5.5, subagentes da sessão; nível menor, declarado, §C7.6):
  - `dev-25t-cl` — Dev T (a tela), fases A0, A1, A2, B1 e B2 do front (`D-DESIGN-SO-CLAUDE`, `D-CODEX-PRIMEIRO-TELAS-E-PLANOS-NO-CLAUDE`);
  - `dev-25s-cl` — Dev S (a raiz), A0 e A3 da raiz, o merge `9c4c0840` e a B2 de servidor. O plano dava o Dev S ao Codex; as contas estavam sem janela, e o Claude cobriu (`D-CLAUDE-CODA-40`, exceção declarada);
  - `dev-25c-cl` — Dev T, fase C (C1 e C2), identidade nova.
- **Plano canônico:** `plano-B-SAN3-25-v2.md` (planejador `plano-25-v2-cl`, Claude Opus 5.5, topo por fallback declarado; o Fable está suspenso), com as **Emendas 1, 2 e 3**, que prevalecem (fora do repositório, na pasta do orquestrador):
  - **Emenda 1** (achado R2-1 da crítica r2, APROVADO COM AJUSTES): a enumeração dos motivos passa a derivar a pilha de middlewares do `src/app.ts`; a tela ganha as frases de `session_inactive`, `session_check_unavailable`, `password_change_required` e `invalid_json`;
  - **Emenda 2** (orquestrador): a catraca `PRE_EXISTENTES_SEM_CONTRATO` de `tests/b-san3-12a-reasons-census.test.ts` desce (saem `invalid_currency` e `invalid_due_date`, agora documentados), e o diálogo mostra "<código> · <título>" da OS;
  - **Emenda 3** (orquestrador; ressalva (1) do porteiro do #558): a guarda D3 do 24d (`frontend/tests/b-san3-24-titles-sem-orfao.test.ts`) entra na lista do `test:smoke`.
- **Decisão do dono:** `D-DONO-TODAS-RECOMENDACOES-1111` ("B-SAN3-25: as 4 recomendações do plano"), aplicada em `D-SAN3-25-RESPOSTAS-DO-DONO`. Ordem e nível: `D-SAN3-25-ORDEM`.
- **Diários dos devs:** `revisoes/b-san3-25/dev-25t-cl.md`, `dev-25s-cl.md` e `dev-25c-cl.md` (fora do repositório, na pasta do orquestrador): comando → saída → veredito de cada fatia e de cada mutação.
- **Nível:** junta completa (escrita de dinheiro e gate de permissão; §C7 item 10(1)). KPI congelado (§C7 item 8(5)).

## O que o bloco entrega

Sem mudar servidor, banco nem permissão: a aba Financeiro da OS fatura pela rota que já existia
(`POST /api/v1/work-orders/:workOrderId/invoice`, `financial_titles:create`, módulo `finance`).

1. Botão **Faturar OS** só para quem tem `financial_titles:create`, só com item pendente, nunca em OS cancelada.
2. Diálogo de confirmação com os itens; no 1º faturamento, o "Valor do título" é o `totalAmount` do servidor (a tela não
   soma dinheiro); vencimento opcional (vazio manda `{}`, com data manda `{ "due_date": "AAAA-MM-DD" }`).
3. **Um pedido por clique** (`createInvoiceSubmitter`, ligado por `useMemo`); aviso com o valor que o servidor faturou e
   aviso de divergência quando o valor ou a quantidade faturados diferem do mostrado (comparação de igualdade).
4. Itens "Faturado" sem editar e excluir; quadro "Títulos desta OS" (original, complementar, cancelado, removido);
   faturamento complementar pelo mesmo botão; 503 com "Tentar de novo" e o mesmo corpo.
5. Recusas pela lista fechada `INVOICE_UI_REASONS` (18 pares, chave status + motivo), conferida contra o servidor nas
   duas direções pelo E1; fora da lista, frase genérica que não afirma nada e relê a lista.
6. A tela Faturas (`InvoicesPage.tsx:53`) aponta o faturamento para a aba Financeiro de cada ordem de serviço.

## Validação

- Front, com cwd `frontend`: `tests/b-san3-25-faturar-os.smoke.test.tsx`, `tests/b-san3-25-faturar-os-live.test.tsx`,
  `tests/invoices-nfe-honest-stop.smoke.test.tsx` (A9), `npm --prefix frontend run check`, `build` e `test:smoke`
  (com os 2 arquivos novos e a guarda D3).
- Raiz: `tests/b-san3-25-motivos-do-faturamento.test.ts` (E1, E2), `tests/b-san3-25-corpo-do-faturamento.test.ts` (C1),
  `tests/b-san3-25-faturar-concorrente-db.test.ts` (A5o, A5c, A5r, A5n) e `tests/b-san3-25-faturar-os-db.test.ts`
  (D1–D7, nos dois braços: só migrada e provisionada), cada `-db` 20 vezes; `npm run check`, `lint`, `test`, `build`;
  `git diff --check`.
- Mutações literais do §4.3 e da Emenda 1 (as de servidor temporárias, revertidas, `git status --short src` vazio).
- Sem `src/**`, `prisma/**`, `.github/**`, `Kpis/**`, lockfiles ou `.env`.
