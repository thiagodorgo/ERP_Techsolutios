# B-SAN3-24 — diário do dev (`dev-24-cl`)

- **Autor:** `dev-24-cl`, **Claude Opus 5.5**, subagente da sessão, nível menor, identidade de dev declarada.
- **Exceção declarada (§C7 itens 6 e 11(6)):** as duas contas Codex estão sem cota semanal até 16/11, a API está
  reservada para verificação e o Antigravity está no limite de 5 h. Por isso o dev é Claude, e a pré-revisão e a
  conferência ficam com outro modelo, pela API. Não escrevi o plano nem o critiquei.
- **Plano:** `plano-B-SAN3-24-v2.md` (fora do repositório, `erp-pausa-2026-10-03/planos/`), com a Emenda 1 (N-01..N-09
  da crítica r2, `crit-24-r2-cl`), que prevalece sobre o corpo.
- **Respostas do dono:** `D-DONO-TODAS-RECOMENDACOES-1111` (11/11, "Sim, todas (Recomendado)"): vale a recomendação de
  cada pergunta. Q1 = **(b)**: o motivo do fechamento forçado entra na auditoria (1 linha no controller).
- **Terreno:** worktree `C:/Users/thiag/w-24`, ramo `feat/web-cheques-fechamento`, a partir de `origin/main`
  `da12fec6` (#541). `npm ci` próprio na raiz e no `frontend/` (sem junction).
- **Toda hora** vem de `date` (fuso de São Paulo).

## Fatias

### a0 — registro (`53c041a3`, 11/11 10:56 SP)
- `decisoes.md`: adendo do `REGISTRO-SAN3-CONFLITOS` com C-24-1..4 (C-24-4 resolvido pela Q1 = (b)).
- `pendencias.md`: `P-COMISSAO-MOTOR-E-POLITICA` e `P-SAN3-24-AUDITORIA-BEST-EFFORT` (novas); nota na mãe
  `P-WEB-FIN-CHEQUE-FECHAMENTO-COMISSAO-SEM-TELA`; índice regenerado pelo gerador (`gerar-indice-pendencias.py`).
- `PLANO_SAN3.md`: só `:157` (item 29) e `:278` (linha do `B-SAN3-24` no §5, sem `commissions/**` e sem "editar
  política de comissão"; o ramo passou a `feat/web-cheques-fechamento`).
- **Desvio declarado (N-07):** `grep -n "política de comissão" PLANO_SAN3.md` ainda dá a linha 29, e a 536 promete
  "cheques/fechamento/comissão pela web (29)". As duas estão fora do PERMITIDO da a0; não as editei. **Pergunta ao
  orquestrador:** emenda para a a0 alcançar `:29` e `:536`, ou o PR de registro as corrige.

### M — referências (`6e20f8be`, 11/11 10:57 SP)
- `cheques-3opcoes.reference.html` e `fechamento-periodo-3opcoes.reference.html` copiadas sem alteração das maquetes
  aprovadas; `README.md` só com as 2 linhas do índice. `checar-3opcoes.cjs`: PASSOU nos dois;
  `data-opcao="[abc]"` = 3 e `>[ABC] · ` = 3 em cada.
- **Desvio declarado:** o prompt do orquestrador pede `fechamento-3opcoes.reference.html`; o plano (que prevalece)
  nomeia `fechamento-periodo-3opcoes.reference.html` no PERMITIDO e no B6. Usei o nome do plano.

### a1 + a2 — serviço, adaptador, ações e impacto de caixa (`1e3916e8`, um commit só, 11/11 11:24 SP)
- Módulos novos em `frontend/src/modules/finance/cheques/`: `cheques.types.ts`, `cheques.adapter.ts`,
  `cheques.service.ts`, `cheque-actions.ts`, `cheque-cash-impact.ts` (só TypeScript puro, R-E2E-JWT).
- **Junção declarada:** a1 e a2 saíram num commit só, porque o arquivo de contrato (A1–A3 e A5/A6a) é um só e importa
  os módulos das duas fatias.
- **Arnês (R-E2E-JWT):** a ação sob teste vai SEMPRE pela função do front com JWT (`signAccessToken`); o preparo e a
  leitura de conferência vão como administrador por cabeçalho (`x-tenant-id`/`x-role`), que o modo memória aceita.
  Motivo medido: cada requisição com JWT passa pelo `attachAuthenticatedActor` de cada roteador montado; no 1º arranque
  medi ~700 ms por requisição com JWT contra ~10 ms por cabeçalho. No A5, as ações NEGADAS (que não mudam o cheque)
  rodam em paralelo sobre um cheque preparado, conferido intacto no fim; cada OFERECIDA roda sobre um cheque novo.
- **Contagens (TAP, execução real):** `tests/b-san3-24-cheques-front-contract.test.ts` 12/12 (20,8 s);
  `frontend/tests/b-san3-24-cheque-actions.test.ts` + `b-san3-24-cheque-cash-impact.test.ts` 8/8;
  `tests/cheque-title-link.test.ts` verde com a asserção nova do A3. A5: 24 oferecidas (2xx) + 246 negadas (403/422) =
  270 = 5 papéis × 9 combinações alcançáveis × 6 ações.
- **Mutações (todas vermelhas, cada uma restaurada; `grep -c` da âncora = 1 antes):**

  | # | Mutação literal | Resultado |
  |---|---|---|
  | A1 | `cheques.service.ts`: `/clear` → `/deposit` | 7 fail (A1 (i), A1 (v), A5, A6a…) |
  | A2 | `cheques.service.ts`: `body: { reason }` → `body: {}` | 2 fail (A2 com `bounce_reason_required`, A5) |
  | A3 | sonda no servidor: apagar `^      titleId: cheque.titleId ?? null,$` em `cheque.dto.ts` | 2 fail (A3 do contrato e K1 do `cheque-title-link`); os do detalhe verdes |
  | A4 | `cheque-actions.ts`: `moveMoney` só com `cheques:update` | 2 fail |
  | A5 | `cheque-actions.ts`: `const linkFree = true;` | 1 fail (A5) |
  | A5b | `cheque-actions.ts`: `perms.has("cheques:create")` → `perms.has("cheques:read")` | 1 fail (registrar: o gestor recebe 403) |
  | A6a | `cheque-cash-impact.ts`: `received` → `issued` no `clearMovement` | 4 fail (os 4 casos de caixa) |
  | A6b | a mesma, na tabela pura | 2 fail |
  | A6b-2 | apagar o ramo `title: "reopens"` da devolução de `cleared` | 2 fail |

- **N-05 (crítica r2) resolvido no impacto:** `cashImpactFor` aceita o título lido (`document`, `amount`, `paidAmount`)
  e devolve `titleAfter` (`open` ou `partially_paid`); o texto diz "volta a ficar em aberto" ou "volta a ficar
  parcialmente pago". O enum `title: "reopens"` do plano ficou como está.
- **N-04 (crítica r2) resolvido no tipo:** `EditChequePayload` só tem número, banco, "bom para", observações e o 1º
  vínculo; valor, conta e direção nem existem no corpo da edição.

### a3 + a4 — tela de Cheques com as 3 aparências (`526fabcd`, 11/11 11:42 SP)
- **Tela-modelo:** `frontend/src/modules/finance/pages/FinanceiroPage.tsx` + `FinanceiroViewA` (D-PADRAO-BLOCOS-CLICAVEIS):
  `PageHeader`, `KpiStatCard` clicáveis, blocos `pat-os-tab` que filtram, `DenseTable` de uma linha com detalhe abaixo
  (um por vez), `StatePanel`/`StaleDataBanner`, `Modal` da biblioteca. Skills: `ts-frontend-full` (implementar) e
  `ui-ux-pro-max` (revisar: foco visível nos botões, `aria-pressed` nos blocos, alvo ≥ 40 px nas linhas da B/C).
- `ChequesPage` (contêiner, `useScreenAppearance("cheques")`) + `ChequesViewA/B/C` + `ChequeClearConfirm` (a
  confirmação é UMA, aberta pelo contêiner, igual nas 3) + `ChequeFormModal` (registrar/editar) + `cheques.shared.tsx`.
- **N-02 (crítica r2), resolução declarada dentro do escopo (sem `src/**`):** "A receber/A pagar pendentes" filtram por
  direção e pedem ao servidor as DUAS situações pendentes (registrado e depositado), mostrando os dois totais do
  servidor lado a lado (sem somar no navegador). "Vinculados a título" não tem filtro no servidor: a tela filtra os
  pendentes CARREGADOS (até 100 por situação) e diz isso na lista quando não vieram inteiros. **Pergunta ao
  orquestrador / pendência proposta:** `P-SAN3-24-CHEQUE-FILTRO-VINCULADO` (filtro `has_title` e situação múltipla no
  `GET /cheques`), dono: o próximo bloco de backend financeiro.
- **N-03 (crítica r2), resolução declarada:** o link do cheque vinculado leva à ABA do Financeiro (`/finance?aba=rec|pag`),
  não ao título (o Financeiro não abre título pela URL, e os arquivos que permitiriam isso estão no PROIBIDO). O texto
  mostra o documento do título, lido de `GET /financial-titles/:id` ao abrir o detalhe. **Pergunta ao orquestrador:**
  abrir o título pela URL fica para o B-SAN3-25 ou um bloco do Financeiro.
- **Elementos "falta no backend" da referência aprovada (marcados assim nela) não foram construídos:** na A, "Para
  depositar até hoje" e a série de devolvidos (o card "Devolvidos" mostra o total do servidor); na B, "Bom para · 6
  semanas" e "Compensados × devolvidos · 4 meses"; nome do cliente/fornecedor na linha (o DTO do cheque não o traz; a
  linha diz "Vinculado a título" / "Sem título"). Na C, a agenda, a mesa de hoje e os blocos de prazo contam os
  pendentes carregados (o prazo "bom para" é data de calendário que o servidor não agrupa) e dizem isso na tela.
- **Contagens (TAP):** `b-san3-24-cheques.smoke.test.tsx` 7/7; `b-san3-24-cheques-live.test.tsx` 5/5;
  `b-san3-24-cheques-aparencias-live.test.tsx` 2/2; `aparencia-registro.guard.test.ts` 23/23; `npm --prefix frontend run
  check` verde.
- **Mutações (todas vermelhas e restauradas):**

  | # | Mutação | Resultado |
  |---|---|---|
  | A6c | `ChequeClearConfirm.tsx`: `cashImpactText(impact)` → `"Entra " + formatMoney(impact.amount)` | 6 fail (3 SSR + o vivo nas 3 aparências…) |
  | A7(i) | `useChequeActions.ts`: apagar `if (inFlightRef.current) return;` | 1 fail (2 POST) |
  | A7(iv) | `cheque-errors.ts`: `case "period_closed":` → `case "period_closed_x":` | 1 fail |
  | A8 | sonda `const total = model.list.items.reduce(...)` em `ChequesViewA.tsx` | F8: 2 fail |
  | A10 | `ChequesPage.tsx`: `appearance === "C" ? <ChequesViewC` → `<ChequesViewB` | 2 fail |

  A âncora do A6c aparecia também num comentário; reescrevi o comentário para ela ficar única (`grep -c` = 1).

### a5 — rota, menu e registro de navegação (`3900aa42`, 11/11 11:42 SP)
- `navigation.registry.ts`: só `finance.cheques` (`cheques:read`, módulo `finance`, `implemented`, ordem 440).
- `App.tsx`: `/finance/cheques` com `PermissionGuard` `cheques:read`; `appSidebarNav.ts`: `CHEQUES` no GESTÃO de admin,
  gestor e financeiro, e em `MVP_NAV_PATHS`.
- **D2 (N-01), desenho declarado:** a regra é função pura com casos fixos (roda sempre, inclusive na CI); o diff real
  (commitado + árvore + novos) só roda no ramo `feat/web-cheques-fechamento` com `origin/main`; fora disso registra o
  motivo em `t.diagnostic` e passa, SEM `t.skip` (o orçamento de 2 pulos do job `backend` já está usado). Na CI (checkout
  raso) o aceite do diff real é o comando rodado pelo verificador.
- **Contagens:** `navigation-menu` + `san3-04a-menu-front-x-catalogo` + `navigation-provisioning` 120/120 (0 skip);
  `b-san3-24-escopo` 2/2 (38 caminhos medidos no ramo).
- **Mutações:** A9 (`requiredPermissions: ["cheques:read"]` → `["financial_entries:read"]`) → 1 fail, só o caso novo
  (**declarado, como o plano previa:** a `san3-04a` não discrimina essa troca, porque todo papel com `cheques:read` tem
  `financial_entries:read`); D2 (criar `frontend/src/modules/finance/commissions/politicas.ts` vazio, sem commit) → 1 fail.

### b1 + b2 — serviço, adaptador e ações do fechamento (`3cfd88ec`, 11/11 12:10 SP)
- `period-closes.types/adapter/service.ts`, `period-actions.ts`, `period-errors.ts` (e `period-keys.ts`, que já veio no
  `526fabcd` porque a mensagem do mês fechado dos cheques usa a competência). TS puro (R-E2E-JWT). O adaptador NÃO guarda
  os ids dos títulos em disputa do checklist (só a contagem).
- **B5, âncora declarada:** "Fechar" é oferecido para toda situação que não é `closed`, e o `closing` sai pela linha
  `if (period.status === "closing") return NONE;` — assim a mutação do B5 não é equivalente.
- **N-09 (crítica r2), resolução declarada:** o B1(iii) da raiz prova o contrato (422 `pending_items_block_close` sem
  `force` e o GET relido com `inDisputeTitles === 1`) pelas funções do front, sem hook; a RELEITURA feita pelo hook é
  provada no B4(iv), no arnês do front. A mutação (2) do B1 (apagar a linha da releitura em `usePeriodActions.ts`) fica
  vermelha no B4(iv).
- **Contagens:** `tests/b-san3-24-periodos-front-contract.test.ts` 6/6 (B1 ×4, B2, B3; a máquina estava com CPU em 100%
  e o arquivo levou ~115 s); `frontend/tests/b-san3-24-period-actions.test.ts` 3/3.

### b3 + aparências — tela de Fechamento do mês (`de3474d1`, 11/11 12:10 SP)
- **Tela-modelo:** a mesma do 24a (`FinanceiroPage` + `FinanceiroViewA`). `FechamentoPage` (contêiner,
  `useScreenAppearance("fechamento")`), `FechamentoViewA/B/C`, `PeriodCloseConfirm` (uma confirmação para as 3),
  `fechamento.shared.tsx`, `usePeriods`/`usePeriodDetails`, `usePeriodActions`.
- A lista mostra as competências que o servidor tem e acrescenta a CORRENTE e a ANTERIOR quando ele não as tem
  (**ampliação declarada:** o plano pede só a corrente; a anterior entra para o "mês que terminou e não fechou" aparecer).
- **Elementos "falta no backend" da referência não construídos:** "tempo médio para fechar", "fechados com pendência",
  "dias para fechar" e o resultado do mês na linha (o resultado aparece no detalhe e no gráfico da B, do retrato
  congelado dos meses fechados).
- **Achado do próprio teste, consertado:** a guarda "nenhum console.error" do B6 pegou um aviso do React (borda
  abreviada + lateral num rerender) na C do Fechamento; o mesmo padrão estava na mesa de hoje da C dos Cheques e foi
  corrigido junto.
- **Contagens:** `b-san3-24-fechamento-live.test.tsx` 5/5 (B4 (i)–(iv), B5, estados §7);
  `b-san3-24-fechamento-aparencias-live.test.tsx` 2/2; `b-san3-24-cheques-aparencias-live.test.tsx` 2/2 de novo.

### b4 — auditoria do fechamento forçado pelo banco (`1c562688`, 11/11 12:10 SP)
- `financial-period-close.controller.ts`: só a linha `forcedReason: record.snapshot?.latest.forcedReason ?? null,`
  dentro do ternário do `meta.forced` (o ternário passou de 1 para 7 linhas por formatação). Q1 = (b).
- B7 em Postgres 16 PRÓPRIO (`dev24-pg`, 127.0.0.1:55522, `prisma migrate deploy` limpo), papel efêmero
  NOSUPERUSER NOBYPASSRLS (asserido no próprio teste), JWT e permissões do banco: 1/1, `# skipped 0`.
- `tests/financial-period-closes.test.ts` + `financial-period-closes-routes.test.ts` 21/21 com a linha nova.

### b5 — registro de aparência, rota e menu (`fc17bc2b`, 11/11 12:10 SP)
- `finance.period_closes` (`financial_period:read`); ícones do registro trocados para nomes que o adaptador do front já
  mapeia (`Wallet` para Cheques, `ClipboardCheck` para Fechamento; antes, `Banknote`/`CalendarCheck` cairiam no ícone
  genérico). O menu lateral usa os componentes `Banknote` e `CalendarCheck`.
- `navigation-menu` + `san3-04a` + `navigation-provisioning` 121/121, 0 skip; guarda de aparência com `fechamento`.

### Mutações do 24b (todas vermelhas e restauradas; âncora única antes de cada uma)

| # | Mutação literal | Resultado |
|---|---|---|
| B1(1) | `period-closes.service.ts`: `body: { reason }` → `body: {}` | 2 fail (B1 (ii) com 400, B3) |
| B1(2) | `usePeriodActions.ts`: apagar `if (error.reason === "pending_items_block_close") await reloadPeriod();` | 1 fail (B4(iv); ver N-09) |
| B2 | `period-keys.ts`: `timeZone: "America/Sao_Paulo",` → `timeZone: "UTC",` | 1 fail |
| B3 | `period-actions.ts`: `perms.has("financial_period:reopen")` → `perms.has("financial_period:close")` | 3 fail (2 da tabela + o do servidor) |
| B4(1) | `PeriodCloseConfirm.tsx`: `disabled={sending \|\| (forcing && reason.trim() === "")}` → `disabled={sending}` | 1 fail (ii) |
| B4(2) | `usePeriodActions.ts`: corpo sempre `{ force: true, reason }` | 2 fail ((i) e (iv)). **Declarado:** o plano esperava (i) e (iii); o meu (iii) prova "nenhum POST antes do 2º passo", que a mutação não muda |
| B5 | `period-actions.ts`: apagar `if (period.status === "closing") return NONE;` | 3 fail |
| B6 | `FechamentoPage.tsx`: `appearance === "C" ? <FechamentoViewC` → `<FechamentoViewB` | 2 fail |
| B7 | sonda no controller: `forced: meta.forced,` → `forced: false,` | 1 fail ("(ii) forced na auditoria") |
| B7(iii) | apagar a linha `forcedReason: …` | 1 fail ("(iii) o motivo na auditoria") |

- **Lição de terreno:** rodar teste `.tsx` do front a partir da RAIZ usa o `tsconfig` da raiz (`jsx` clássico) e dá
  "React is not defined"; as mutações de tela rodam de dentro de `frontend/` (a 1ª tentativa do B5 rodou da raiz, foi
  descartada e refeita).

### Bateria final e PR (#547, 11/11 12:54 SP)
- **`npm run check`** verde; **`npm run lint`** (= `check`) verde; **`npm run build`** verde; `node --check Kpis/app.js`
  ok (inalterado); `git diff --check` limpo; `Kpis/**`, `prisma/**`, `.github/**` e `mobile/**` sem diff.
- **`npm --prefix frontend run check`** e **`build`** verdes; **`test:smoke`: 1766/1766, `# skipped 0`** (inclui os 8
  arquivos novos do front).
- **`npm test` na forma do job `backend`** (Postgres 16 próprio `dev24-pg` migrado, Redis 7 próprio `dev24-redis` em
  127.0.0.1:56522, `CORE_SAAS_PERSISTENCE=memory`): 492 arquivos · **5060 testes · 5034 pass · 23 fail · 1 cancelado ·
  2 skipped** (o orçamento de 2 pulos, como na CI). A máquina estava com CPU em 100% (outras frentes).
  **Os 23 são todos de ambiente, nenhum toca o diff do bloco:**
  - re-executados em série (`--test-concurrency=1`), 7 dos 10 arquivos passaram: `b-san3-12-ce4-db`,
    `checklist-template-lock-db`, `auth-identity-exposure-scan` (o erro era "Redis command timed out"), `ass-08-channel-db`,
    `traccar-position-ingestion-db`, `expense-sync-atomic-db`, `work-order-invoicing-atomic-db`;
  - continuam vermelhos só por Windows/carga: `san3-05-runtime-role-guard-db` e `san3-09-bootstrap-platform-admin-db`
    ("setsid: ausente — necessário para impedir que psql \password leia a senha do terminal"), `ass-03-metering-db`
    (testes de estouro de tempo); e os drills/tempos do 1º passe (`ass-02-plans-migration-drill`, `ass-08-lock-order`,
    `ass-08b-invoice-intent`, `ass-08-channel-migration-drill`, `traccar-event-migration-drill`: "transação expirou em
    5000 ms", "< 1 000 ms", "teto 2 000").
  - **O aceite que vale é o TAP do job `backend` da CI no PR** (§C7.11(3)): `ok` sem `# SKIP` para `san3-04a T2`, para os
    `b-san3-24-*-front-contract` e para o B7. Fica para o verificador ler com
    `gh run view <run> --job <job> --log | grep -E 'not ok|# fail|# SKIP'`.
- **D2 na CI:** o checkout raso não tem `origin/main`; a parte do diff real registra o motivo em `t.diagnostic` e passa
  (sem `t.skip`). O aceite do diff real é este comando no worktree do verificador:
  `node --test --import tsx tests/b-san3-24-escopo.test.ts` (no ramo `feat/web-cheques-fechamento`).
- **Conferência visual** contra as referências, nas 3 aparências: fica com a pré-revisão (outro modelo), como o plano
  manda; o dev não sobe a tela nas portas 3000/5173 (proibidas pelo mandato).

### Desvios declarados (resumo)
1. **Um PR só para 24a e 24b** (o plano previa dois em série); o mandato pediu um ramo e um PR com as duas telas. O 24d
   (remoção de Cobranças/Pagamentos legadas) NÃO está aqui: vem depois do merge, como o plano manda.
2. **Título do PR sem "comissão"**: o plano (que prevalece) tirou a política do bloco; o título pedido no mandato falava
   em comissão.
3. **`fechamento-periodo-3opcoes.reference.html`** (nome do plano) em vez de `fechamento-3opcoes.reference.html` (nome do
   mandato).
4. **N-07:** linhas 29 e 536 do `PLANO_SAN3.md` fora do PERMITIDO da a0, não editadas (pergunta ao orquestrador).
5. **N-02 e N-03:** resoluções dentro do escopo, com as pendências `P-SAN3-24-CHEQUE-FILTRO-VINCULADO` e
   `P-SAN3-24-TITULO-PELA-URL` (dono proposto).
6. **Junções de fatia:** a1+a2, a3+a4 e b1+b2 em um commit cada; `period-keys.ts` entrou no commit do 24a.
7. **Fechamento lista também a competência anterior** (o plano pede só a corrente).
8. **B4(2):** vermelha em (i) e (iv), não em (iii) (o meu (iii) prova "nenhum POST antes do 2º passo").
9. **Redis próprio** (`dev24-redis`, 127.0.0.1:56522), além do Postgres do mandato, para a forma do job `backend`.

### Limpeza
- Removidos: `frontend/dist/`, `dist/` (saídas de build). Mantidos, como o mandato manda: o worktree `C:/Users/thiag/w-24`
  e os containers `dev24-pg` e `dev24-redis`.
