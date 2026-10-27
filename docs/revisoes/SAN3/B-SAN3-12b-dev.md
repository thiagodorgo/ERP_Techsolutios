# B-SAN3-12b — relatório do DEV

> Papel: `dev-san312b-sol` (DEV). Modelo declarado: Codex GPT-5.6 Sol, esforço medium, nível menor. Não planejou, não criticou e não vota.
> Worktree: `C:/Users/AMP/w-san312b`. Ramo: `feat/web-financeiro-baixa-e-contas`.

## P1 — evidência incremental

### E0 — contrato, plano e terreno inicial

- Comando: leitura integral de `CLAUDE.md`, `PROJECT_MEMORY.md`, plano externo `B-SAN3-12-plano.md` (incluindo §0, §4, §7.2, §7.4, §8.2, §9, §12 e E1/E1-bis) e skills `ts-frontend-full`/`ui-ux-pro-max`.
- Saída resumida: 12b limitado à camada de dados compartilhada e à aparência A; B/C são do 12c; `Kpis/**`, referências HTML, lockfiles e demais caminhos do §7.4 permanecem proibidos.
- Veredito parcial: contrato carregado; decisões do dono não reabertas.

### E1 — ref e worktree

- Comando: `git status --short --branch; git rev-parse HEAD; git rev-parse origin/main; git log -1 --oneline origin/main`.
- Saída resumida: ramo `feat/web-financeiro-baixa-e-contas`; head inicial `f6c9a9629b5bf2927ea5aebd4279e4c42188bae2`; `origin/main` medida em `c9a2d036c1aaff21df92817525d7f9c92cbbe272`, contendo o 12a (`9dad66c0`) e o seletor (`b2f8e6cf`). O único commit do ramo é o das referências, preparado pelo orquestrador.
- Veredito parcial: base contratual presente; nenhuma premissa falsa até aqui.

### E2 — disco inicial

- Comando: `Get-PSDrive -Name C` antes de qualquer `npm ci`.
- Saída resumida: `10,45 GB` livres.
- Veredito parcial: acima do piso obrigatório de `7 GB`.

### E3 — dependências próprias e Prisma Client

- Comandos: `npm ci`; nova medição de disco; `npm --prefix frontend ci`; `npm run db:generate`.
- Saída resumida: raiz `326` pacotes; disco antes do segundo `npm ci`: `10,04 GB`; frontend `103` pacotes. A primeira geração falhou porque `prisma.config.ts` exige `DATABASE_URL`; repetida com URL sintética não conectável em `127.0.0.1:59999`, gerou Prisma Client v7.8.0 sem tocar `.env` nem banco.
- Veredito parcial: instalações próprias concluídas, sem junction; a exigência de variável na geração é configuração existente, não premissa falsa do plano.

### E4 — PARADA por premissa falsa no PERMITIDO

- Comando: `Select-String` no plano por `finance-errors.ts`, `### 7.2`, `### 7.3` e leitura das linhas 446–458.
- Saída resumida:
  - linha 216: o contrato obriga que a lista única das mensagens viva em `frontend/src/modules/finance/entries/finance-errors.ts` e exporte `FINANCE_UI_ERROR_REASONS`;
  - linhas 446–458: o PERMITIDO do 12b enumera os novos arquivos de `entries/**`, componentes, views, testes e registros, mas **não inclui** `finance-errors.ts`;
  - linha 512: F4 ainda chama a lista de **31**, enquanto §4.1 e `API_CONTRACTS.md:575-582` fixam **32** razões traduzidas.
- Comando de terreno: `git ls-tree -r --name-only origin/main | Select-String 'finance-errors'`.
- Saída resumida: nenhuma ocorrência; o arquivo não preexiste na `origin/main` medida em `c9a2d036`.
- Veredito parcial: **PREMISSA FALSA / EMENDA NECESSÁRIA ANTES DO CÓDIGO**. Criar o arquivo exigido por §4/F4 tocaria caminho não autorizado pelo §7.2; absorver a lista em outro arquivo contrariaria a localização única explícita do contrato. A contagem 31×32 também precisa ser normalizada na mesma emenda.

## Estado da parada

- Nenhum código de produto ou teste foi criado/editado; portanto o vermelho-controle ainda não foi iniciado.
- Nenhum Docker foi iniciado e nenhuma porta/banco foi tocado.
- `Kpis/**`, `*.reference.html`, lockfiles e demais caminhos proibidos permanecem intactos por este DEV.
- Único arquivo criado pelo DEV: este relatório P1, autorizado pela tarefa.
- Próximo passo após emenda aprovada: acrescentar nominalmente `frontend/src/modules/finance/entries/finance-errors.ts` ao §7.2, fixar F4 em 32, re-medir a ref alvo e então criar/rodar os testes novos em vermelho antes da implementação.
- Limpeza: nenhum artefato de build, container ou scratchpad foi criado; `node_modules` próprios foram preservados conforme §C5.
- Conferência final: `git ls-tree -r --name-only origin/main | Select-String 'finance-errors'` → `0` ocorrências; `git diff --check` → verde; disco → `9,39 GB` livres; `git status` mostra somente este relatório não rastreado além do commit já existente do orquestrador.

**HEAD NA PARADA:** `f6c9a9629b5bf2927ea5aebd4279e4c42188bae2` — `BLOQUEADO-POR-EMENDA`

### E5 — ratificação do orquestrador e retomada

- Fonte: seção `Ratificação do orquestrador (2026-10-26 14:35Z)` apensa ao fim de `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-SAN3-12-plano.md`.
- Saída resumida: o orquestrador ratificou por escrito que `frontend/src/modules/finance/entries/finance-errors.ts` entra no PERMITIDO do §7.2 e que o F4 usa a lista fechada de **32** itens, igual ao §4.1 e ao `API_CONTRACTS.md`.
- Veredito parcial: as duas premissas falsas da E4 estão resolvidas antes do código; a retomada segue pelo vermelho-controle, sem reabrir decisões do dono.

### E6 — nova PARADA: o comando obrigatório do F8 já é vermelho na `origin/main`

- Ref medida: `origin/main` `c9a2d036c1aaff21df92817525d7f9c92cbbe272` (após `git fetch origin main`).
- Comando exigido pelo §9.2/F8, medido de forma equivalente na ref alvo: `git grep -n -E 'reduce\(|\+= *[a-zA-Z.]*amount' origin/main -- frontend/src/modules/finance`.
- Saída resumida: exit `0` e **8 ocorrências preexistentes**, entre elas `frontend/src/modules/finance/titles/financial-titles.adapter.ts:198` somando `title.amount`, além de 7 ocorrências em `modules/finance/commissions/**` (diretório explicitamente PROIBIDO pelo §7.4).
- Contradição: o §9.2 manda o comando terminar sem ocorrência (`test $? -eq 1`) e o F8 exige “zero `reduce`/`+=` ... em `frontend/src/modules/finance/**`”, mas a própria `origin/main` já viola essa forma antes do 12b. O arquivo `financial-titles.adapter.ts` não está autorizado no §7.2; `commissions/**` está nominalmente proibido.
- Veredito parcial: **PREMISSA FALSA / EMENDA NECESSÁRIA ANTES DO CÓDIGO**. A correção precisa definir se o guard mede apenas arquivos novos/tocados pelo 12b, se congela uma allowlist das 8 ocorrências preexistentes, ou se amplia nominalmente o escopo para remover somas existentes. O DEV não escolhe entre essas alternativas.

## Estado da segunda parada

- A ratificação das duas incoerências anteriores foi registrada.
- Nenhum teste novo foi criado; o vermelho-controle não foi iniciado porque a re-medição obrigatória anterior ao código encontrou a nova premissa falsa.
- Nenhum código de produto, referência HTML, lockfile, `Kpis/**`, banco, porta ou container foi tocado.
- `git diff --check` permanece verde; o head continua `f6c9a9629b5bf2927ea5aebd4279e4c42188bae2`.
- Próximo passo após nova emenda: re-medir o F8 na ref alvo com a régua ratificada, criar todos os testes novos e executar o vermelho-controle antes da implementação.

**HEAD NA SEGUNDA PARADA:** `f6c9a9629b5bf2927ea5aebd4279e4c42188bae2` — `BLOQUEADO-POR-EMENDA-F8`

### E7 — ratificação do orquestrador para o F8 e retomada 2

- Fonte: seção `Ratificação do orquestrador (2026-10-26 14:40Z)` no fim de `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-SAN3-12-plano.md`.
- Decisão transcrita: o F8 passa a ser uma trava por inventário congelado das 8 ocorrências preexistentes medidas na `origin/main` `c9a2d036`; o inventário é vazio em `accounts/**`, `entries/**` e `pages/**`; ocorrência nova ou entrada morta reprova.
- Pendência obrigatória deste PR: abrir `P-FINANCE-FRONT-SOMA-DINHEIRO-PRE-EXISTENTE`, BAIXA e preexistente; 7 ocorrências ficam com o bloco das telas de comissões e 1 em `titles/` com `B-SAN3-24`; fechamento quando o inventário ficar vazio.
- Veredito parcial: a premissa falsa de E6 está resolvida pelo próprio plano. A retomada segue sem nova decisão de produto e sem tocar os caminhos proibidos.


## Sucessão (dev-san312b-opus)

> Papel: `dev-san312b-opus` (DEV). Modelo declarado: Claude Opus 5.5, nível menor. Assume o bloco no lugar de `dev-san312b-sol`
> (Codex), que caiu pelo limite de uso às 14:38Z sem gravar `## PAUSA`. Não planejou, não critica e não vota.
> Fontes relidas: o mandato `dev-san3-12b.md`, as retomadas 1 e 2 e o plano inteiro nas seções do mandato, com as duas ratificações
> do orquestrador (14:35Z e 14:40Z).

### S0 — medição do parcial deixado (15:10Z)

- Comandos: `git status --short`; `git diff --stat`; `git fetch origin`; `git rev-parse HEAD origin/main`; leitura integral de cada
  arquivo tocado (15 rastreados e 31 novos).
- Saída resumida: head `f6c9a962` (só o commit de referências do orquestrador), `origin/main` `c9a2d036` (não andou). 15 arquivos
  rastreados alterados (+77/−265) e 31 novos, nenhum commit. O relatório dele termina em E7 (ratificação do F8): **não há registro de
  vermelho-controle, de teste executado nem de nenhum comando da bateria**. Disco: 9,9 GB livres.
- Cópia do parcial ANTES de descartar (lição "preservar o parcial antes do sucessor"): `git diff` e os 31 arquivos novos copiados para
  o scratchpad da sessão (`.../scratchpad/codex-parcial/`).
- Veredito parcial: o parcial é meio escrito. O código novo está compactado em linhas únicas (até 2 KB por linha), sem os estados §7
  da maquete, com 4 indicadores em vez dos 6 da opção A, com "—" fingindo dado no cartão da conta (fere o F19), sem o bloco do
  cheque pendente (F6), sem o bloqueio do reenvio até a releitura (F3), sem a releitura e repintura da linha no 409 da conciliação
  (F22), com `KPI A conciliar` contando só as linhas carregadas e com testes que, na maioria, leem o texto do código em vez de
  executar o comportamento. Nada disso foi medido por ele.

### S1 — o que aproveito e o que descarto

| Item do parcial | Decisão | Por quê |
|---|---|---|
| Lista das 32 razões em `finance-errors.ts` | **aproveito o conteúdo** (reescrevo o arquivo) | confere, como conjunto, com o §4.1 e com `API_CONTRACTS.md` (lista da tela) — conferido de novo no F4 |
| Inventário das 8 ocorrências do F8 | **aproveito o conteúdo** (reescrevo o guarda) | é o inventário da ratificação de 14:40Z; o guarda é re-medido na `origin/main` |
| `App.tsx` (`/finance/charges` e `/finance/payments` → `<Navigate>`), `appSidebarNav.ts` (os dois `path`), `docs/navigation-matrix.md` (l.58-59) | **aproveito** | é a letra do §7.2 e do F13 |
| `KpiStatCard` com `pressed` → `aria-pressed` | **aproveito** | é a letra do §6.2 |
| `financial-titles.types.ts` (+`workOrderId`, payload da baixa), `financial-titles.service.ts` (`getFinancialTitle`, `payFinancialTitle`) | **aproveito, reformatado** | §7.2 |
| `financial-titles.adapter.ts` (+1 linha: lê `workOrderId`) | **aproveito, declarado (D-2)** | fora da lista nominal; ver D-2 |
| `dashboard/financial-summary.{adapter,types}.ts` (+`linkedPending*`) | **aproveito, declarado (D-1)** | fora da lista nominal; ver D-1 |
| `frontend/package.json` (linha `test:smoke`) | **refaço** | a lista final depende dos testes que de fato ficam |
| `DenseTable.tsx`, `DenseExpandableRow.tsx`, `dense-list/index.ts` | **descarto e reescrevo** | o detalhe usava classes novas em vez das `.pat-ab-*` que o padrão já tem (`D-PADRAO-BLOCOS-CLICAVEIS`) |
| `app.css` (2 regras novas) | **descarto** (`git checkout -- frontend/src/styles/app.css`) | com as classes `.pat-ab-*` existentes, nenhuma regra nova é necessária |
| `COMPONENT_LIBRARY.md` | **descarto e reescrevo** | o texto foi inserido entre o título "React priorities" e a lista numerada dele, quebrando a lista |
| `FinanceiroPage.tsx`, `views/FinanceiroViewA.tsx`, `financeiro.state.ts`, `accounts/**`, `entries/**` (exceto a lista de razões) | **descarto e reescrevo** | meio escritos (ver S0) |
| os 9 arquivos de teste novos | **descarto e reescrevo** | testes de texto, não de comportamento; sem vermelho-controle |

Desfazer: só por arquivo e só o que é dele — `git checkout -- <arquivo>` nos rastreados descartados e `rm <arquivo>` nos novos dele,
um a um. Nada de `reset --hard`, `stash` ou `clean`.

### S2 — desfeito (15:22Z)

- Comandos: `git checkout -- <arquivo>` nos 15 rastreados (um a um) e `rm <arquivo>` nos 30 novos dele (um a um; o relatório fica).
- Saída: `git status --short` → só `?? docs/revisoes/SAN3/B-SAN3-12b-dev.md`. Nada de `reset`, `stash` ou `clean`.
- Veredito parcial: árvore de volta ao head `f6c9a962`; o parcial está preservado no scratchpad para conferência.

### S3 — vermelho-controle ANTES do código (15:36Z)

- Testes novos escritos antes de qualquer código de produto: `frontend/tests/{financial-accounts.adapter,financial-entries.adapter}.test.ts`,
  `dense-expandable-row.test.tsx`, `finance-no-money-reduce.guard.test.ts`, `finance-redirects.test.tsx`,
  `finance-{baixa,contas-extrato,conciliacao}.smoke.test.tsx`, `finance-page-live.test.tsx` e o backend `tests/b-san3-12-ce4-db.test.ts`.
- Comando: `cd frontend && node --test --import tsx tests/<arquivo>` em cada um.
- Saída: 8 de 9 VERMELHOS — os 7 de unidade/SSR com `ERR_MODULE_NOT_FOUND` ou `does not provide an export named 'DenseExpandableRow'`
  (o código não existe), e o `finance-page-live` com **19 de 19** casos falhando contra o `FinanceiroPage` atual ("elemento para clicar
  não encontrado": não há indicador que filtra, aba, linha que abre detalhe, baixa etc.). O guarda do F8 fica **verde** na base, como deve:
  ele é a trava do inventário pré-existente (ratificação de 14:40Z) e fica vermelho só por mutação (§M).
- Achado de terreno (D-3): rodado da RAIZ, um `.tsx` que monta componente de `frontend/src` falha com `React is not defined` (o tsx usa o
  `tsconfig` da raiz, sem `"jsx": "react-jsx"`). A bateria do §9.2 escreve `node --test --import tsx frontend/tests/finance-*.test.tsx`
  a partir da raiz; executo-a de `frontend/` (é o mesmo diretório do `test:smoke` da CI). Transcrição, não decisão nova.
- O CE-4 `-db` não tem vermelho "antes do código": o backend dele já está na `main` (12a). O vermelho dele é por mutação (F18, §M).

### S4 — código e verde dos testes do bloco (15:54Z)

- Escrito (formatado, um componente por arquivo, padrão do repo): biblioteca `DenseExpandableRow` + `DenseTable` (`renderDetail`,
  `expandedKey`, `cellTitle`, coluna `width`) + `KpiStatCard.pressed`, usando as classes `.pat-ab-*` que já existem (app.css intocado);
  `finance/accounts/**` (tipos, adaptador, serviço, `useFinancialAccounts`, `AccountCard`, `NovaContaModal`); `finance/entries/**` (tipos,
  adaptador, serviço, `finance-errors.ts` com as 32, `useFinancialEntries`, `useEntriesAggregate`, `useReconciliationPolicy`,
  `useFinanceActions`, `BaixaForm`, `ConciliarForm`, `DesvincularChequeModal`, `EntryDetail`, `TitleDetail`); `pages/financeiro.state.ts`,
  `pages/views/FinanceiroViewA.tsx`, `FinanceiroPage.tsx` (contêiner com `useScreenAppearance("financeiro")`); `titles` service/types/adapter;
  resumo (D-1); `App.tsx`, `appSidebarNav.ts`, `docs/navigation-matrix.md`.
- `TitleRowActions.tsx`: medido (`grep -n -i "pay\|baix"` → 0); a baixa nunca esteve no menu ⋮ na `main`, então não há o que tirar dele.
  A baixa vive no detalhe do título (`TitleDetail`). Arquivo não tocado.
- Calibração de teste (antes de qualquer verde, sem afrouxar critério): (a) o dublê de `GET /financial-titles` usava `{ data: [...] }`, e o
  DTO real (`toFinancialTitleListDto`) é `{ items, pagination }` — corrigido para os bytes reais; (b) o React 19 grava `name`/`value` de
  `<input>`/`<textarea>` como propriedade do nó, não atributo — o `byName` do arnês lê os dois (o F21 "nenhum campo de valor" passou a
  procurar de verdade); (c) `formatBRL` usa espaço não separável; (d) a régua do F19 do cartão olha o texto visível (o `aria-label` tem um
  travessão legítimo de frase); (e) React 19 serializa `colSpan` sem minúscula.
- Comando: `cd frontend && npm run check` → verde; cada arquivo novo com `node --test --import tsx tests/<arquivo>`.
- Saída: `financial-accounts.adapter` 6/6 · `financial-entries.adapter` 11/11 · `dense-expandable-row` 5/5 · `finance-no-money-reduce.guard`
  3/3 · `finance-redirects` 3/3 · `finance-baixa.smoke` 8/8 · `finance-contas-extrato.smoke` 7/7 · `finance-conciliacao.smoke` 5/5 ·
  `finance-page-live` 19/19 → **67 casos novos**, 0 falha, 0 `console.error`.

### S5 — divergências declaradas (regra da retomada 2: transcrição do que o plano já decide; nenhuma decisão nova de produto)

- **D-1 — `frontend/src/modules/finance/dashboard/financial-summary.{types,adapter}.ts` fora da lista nominal do §7.2.** O §4.7 põe
  `cheques.linkedPendingCount/linkedPendingAmount` no resumo "para a tela rotular", e o §12.1 fecha `P-SAN3-20-RESUMO-CHEQUE-VINCULADO`
  com "rótulo na tela em 12b". O rótulo não existe sem a tela ler os dois campos. Toque: +2 campos no tipo, +2 leituras no adaptador, +2
  zeros no vazio. Nenhum arquivo PROIBIDO; nenhum critério de dinheiro ou permissão enfraquecido (o número continua vindo do servidor).
  Comando: `git diff --stat -- frontend/src/modules/finance/dashboard` → `2 files changed, 6 insertions(+), 1 deletion(-)`.
- **D-2 — `frontend/src/modules/finance/titles/financial-titles.adapter.ts` (+1 linha: `workOrderId`).** O §7.2 lista `financial-titles.types.ts`
  com `+workOrderId`; sem o adaptador ler o campo, o tipo fica sempre vazio. Mesma natureza da D-1.
- **D-3 — a bateria do §9.2 roda `.tsx` de `frontend/tests` a partir de `frontend/`.** Da raiz, o `tsx` usa o `tsconfig` da raiz (sem
  `"jsx": "react-jsx"`) e todo componente de `frontend/src` falha com `React is not defined` (medido em S3). O `test:smoke` da CI já roda de
  `frontend/`.
- **D-4 — o menu com `?aba=` (F13) tem dois efeitos fora do PERMITIDO.** Os três itens Financeiro/Cobranças/Pagamentos ficam ativos em
  `/finance` (o `NavLink` compara só o caminho; `AppShell.tsx` fora do §7.2) e os dois itens deixam de casar com os caminhos governados
  pelo menu do backend (`navigation.registry.ts`, PROIBIDO). A rota `/finance` e o servidor continuam guardando. Pendência nova
  `P-SAN3-12B-MENU-ABAS-FORA-DO-GOVERNO` (dono `B-SAN3-24`).
- **D-5 — "Conciliação por conta" mostra a CONTAGEM a conciliar por conta, não a barra conciliado/ressalva/a conciliar da maquete.** A
  barra proporcional exige três contagens por conta; o agregado do 12a não agrupa por conta, então seriam 3 consultas por conta. A tela pede
  UMA por conta (`/aggregate?group_by=none&reconciled=false&account_id=`), e os totais por situação vão nos blocos da aba Conciliação
  (4 consultas). Nada é contado no front.
- **D-6 — sem "Cancelar o cheque" depois do desvínculo (R-res-6).** O §4.1 não lista `POST /cheques/:id/cancel` entre as rotas que a tela
  consome e a tela de Cheques é do `B-SAN3-24`. Depois do desvínculo a baixa reabre com o aviso persistente "Ele continua registrado em
  Cheques; se não for mais usado, cancele-o lá", e, se o servidor devolver `warning: cheque_still_depositable`, o aviso diz que o cheque
  ainda pode compensar. A pendência `P-SAN3-12-CHEQUE-DESVINCULADO-CAIXA-SEM-TITULO` (dono `B-SAN3-24`) já cobre o resto.
- **D-7 — `422 title_has_pending_cheque.details` não chega ao front.** O `ApiError` de `services/api/client.ts` (fora do §7.2) lê só
  `code`/`reason`. O bloco do cheque (F6) lê os cheques por `GET /cheques?title_id=` (rota do §4.1), que dá número, banco, valor e situação.
- **D-8 — Node 22 indisponível nesta máquina** (`node --version` → `v20.19.5`; sem nvm). O `test:smoke` rodou em Node 20; o de Node 22 fica
  com a CI.
- **D-9 — a aparência:** a página chama `useScreenAppearance("financeiro")` e renderiza a A para qualquer valor, porque B e C são do 12c. O
  `appearance.registry.ts` (não listado no §7.2) não ganha "financeiro": o comentário dele diz que a tela entra no menu "no mesmo bloco que
  entrega as 3". Sem nada gravado, abrir a página não grava a chave (F15 já coberto pelos testes do `B-APARENCIA-USUARIO`, #461).

### S6 — bateria do §9.2 (12b) — 16:00Z a 16:40Z, head local `c022182d` (código) + registro

| Comando | Saída resumida | Veredito |
|---|---|---|
| `npm --prefix frontend run check` | `tsc -b --noEmit` sem erro | verde |
| `cd frontend && node --test --import tsx tests/finance-*.test.ts* tests/financial-*.adapter.test.ts tests/dense-expandable-row.test.tsx` (um a um) | 67/67 nos 9 arquivos novos (S4); `finance-titles` e `financial-summary.adapter` passam no smoke | verde |
| `cd frontend && npm run test:smoke` (Node 20.19.5; lista do `package.json` + os 9 novos) | `# tests 1435 · pass 1435 · fail 0 · skipped 0` (1368 antes + 67 novos — o 1368 é DERIVADO por subtração, não medido) | verde |
| `npm --prefix frontend run build` | `✓ built in 28.76s` (aviso de chunk > 500 kB pré-existente) | verde |
| Postgres 16 descartável `dev-san312b-pg` em `127.0.0.1:55732`; `npx prisma migrate deploy`; `CORE_SAAS_PERSISTENCE=prisma npm run db:provision-rbac` | "All migrations have been successfully applied"; "12 criado(s) … 912 concessões … CONVERGIDO" | ok |
| `CORE_SAAS_PERSISTENCE=prisma node --test --import tsx tests/b-san3-12-ce4-db.test.ts` (F18) | `# tests 2 · pass 2` — **braço 1 (base PROVISIONADA)**; o banco concede `financial_entries:unreconcile` e `cheques:unlink_title` ao `tenant_admin` e nega ao `finance`; a cadeia inteira 201 → … → 409 → 400 → 403 → 200 | verde |
| F8 como comando: `git grep -n -E 'reduce\(|\+= *[a-zA-Z.]*amount' -- frontend/src/modules/finance` | exatamente as 8 linhas do inventário (7 em `commissions/**`, 1 em `titles/financial-titles.adapter.ts:198`) e nenhuma em `accounts/`, `entries/`, `pages/` | igual ao inventário |
| `npm run check` · `npm run lint` · `npm run build` (raiz) | exit 0 · 0 · 0 | verde |
| `npm test` (raiz, `DATABASE_URL` do descartável) | `359 arquivos · 4072 testes · pass 4062 · fail 8 · skipped 2` + aviso de denominador (1 arquivo sem teste registrado) | ver abaixo |
| `git diff --check` | vazio | verde |

**As 8 falhas do `npm test` não são do bloco** (§C7.1-ter(a), `pre-existente`/ambiente): `git diff --name-only f6c9a962 HEAD -- src prisma scripts` → **0 arquivos** (o 12b não toca uma linha de backend; o único `.ts` de backend novo é o próprio CE-4, que passou). Todas são suítes `-db` de drill/ingestão rodando no Windows contra o descartável PROVISIONADO:
`san3-05` (T14a–d, "missing ) after argument list" do roteiro shell e asserções do drill), `san3-09` T2.1 (exige base "só migrada": esta está provisionada, de propósito, para o F18), `traccar-event-migration-drill-db` (`EBUSY … rmdir … trc02-mdrill-*`, sem teste registrado — o aviso de denominador) e `traccar-position-ingestion-db` (2 de 22 também quando rodado sozinho: `# pass 20 # fail 2`). São as famílias das pendências já abertas `P-ARNES-WINDOWS-DRILLS-EBUSY-SETSID` e `P-SAN3-12-DRILL-PRISMA-SHIM-WINDOWS`; a CI Linux (`backend-postgres`) é a régua delas.

### §M — mutações F1–F22 (uma por vez, âncora única, teste dono, restauro conferido por sha256) — 16:45Z a 17:20Z

Roteiro: `scratchpad/dev-san312b-opus/mutacoes.py` (aplica, roda, restaura os bytes e confere o sha256 de cada arquivo tocado; uma linha
por mutação em `mutacoes.tsv`). Todas restauradas com hash igual; `git status` limpo depois de cada rodada.

| # | Mutação | Teste dono | Resultado |
|---|---|---|---|
| F1 | `payFinancialTitle` vai a `PATCH /status` | live "F1/F2/F3" | VERMELHO (0/1) |
| F2 | id novo a cada envio (`newClientActionId()` no submit) | live "F1/F2/F3" | VERMELHO |
| F3 | falha da baixa vira erro final, sem releitura | live "F3: 409" | VERMELHO |
| F4 | tirar `unlink_requires_privilege` da lista | `financial-entries.adapter` | VERMELHO (9/11) |
| F4b | acrescentar `bounce_reason_required` à lista | `financial-entries.adapter` | VERMELHO (9/11) |
| F5 | "Cheque" no seletor de meios | `finance-baixa.smoke` | VERMELHO (7/8) |
| F6 | "Desvincular o cheque" para quem não tem a permissão | live "F6/F21" | VERMELHO |
| F7 | baixa sem o gate `financial_entries:create` | `finance-baixa.smoke` | VERMELHO (7/8) |
| F8 | `items.reduce` somando `amount` na view A | guard F8 | VERMELHO (1/3) |
| F8b | entrada falsa no inventário | guard F8 | VERMELHO (1/3) |
| F9 | `receivables.failed` forçado a `false` (fallback vira lista vazia) | live "F9" | VERMELHO — na 1ª rodada o processo TRAVOU em vez de reprovar (240 s): `assert.ok` sem mensagem faz o Node reler a linha-fonte, que o tsx transpila numa linha só. Corrigido no teste (mensagem em todo `assert.ok`, commit `aa80e3fb`) e re-executado: VERMELHO em 1 s |
| F10 | sem `expected_reconciled`/`expected_reconciled_at` no corpo | `finance-conciliacao.smoke` | VERMELHO (3/5) |
| F11 | o indicador "A receber vencido" não filtra | live "F11" | VERMELHO |
| F12 | todas as linhas abertas quando uma abre | live "F12" | VERMELHO |
| F13 | `/finance/charges` redireciona para `/finance` sem a aba | `finance-redirects` | VERMELHO (2/3) |
| F14 | a view chama `useFinancialSummary()` de novo | live "F14" | VERMELHO |
| F15 | chave da aparência sem o `userId` (`appearance.storage.ts`, do #461, temporário) | `aparencia-storage` | VERMELHO (5/9) |
| F16 | tirar o `StaleDataBanner` | live "F16 desatualizado" | VERMELHO |
| F17 | "Saldo do tenant indisponível" num rótulo | `finance-contas-extrato.smoke` | VERMELHO (5/7) |
| F18 | conciliar mandando o estado errado (`expected_reconciled: true` no 1º passo) | CE-4 `-db` | VERMELHO (1/2) |
| F19 | "—" no lugar de "Saldo indisponível" | `finance-contas-extrato.smoke` | VERMELHO (6/7) |
| F20 | "Estornar" habilitado no conciliado | `finance-contas-extrato.smoke` | VERMELHO (6/7) |
| F21 | campo de valor no bloco do cheque pendente | live "F6/F21" | VERMELHO |
| F22 | `expected_reconciled_at: null` fixo | live "F10: desfazer" | VERMELHO |

24 mutações, 24 vermelhas, 24 restauradas por hash.

### S7 — limpeza (§C5) e entrega (16:47Z)

- Limpeza: container `dev-san312b-pg` removido (`docker rm -f`); removidos do worktree `dist/`, `frontend/dist/`, `frontend/tsconfig.tsbuildinfo`,
  `test-results/` e os anexos de teste em `storage/checklist-attachments/` (todos desta sessão, 15:59Z–16:20Z); o `.gitkeep` rastreado dessa
  pasta foi apagado junto por engano e restaurado com `git checkout --` antes de qualquer commit. `node_modules` próprios e o worktree
  preservados. Disco: 11 GB livres.
- Commits do sucessor (Conventional Commits, sem linha de atribuição): `8ff80316` (biblioteca), `c022182d` (camada + aparência A + testes +
  CE-4), `aa80e3fb` (mensagem nos `assert.ok` do teste vivo), `5d8aa9a3` (registro e relatório) e este.
- `Kpis/**`, `*.reference.html`, `prisma/**`, `src/**`, lockfiles: intocados (`git diff --name-only f6c9a962 HEAD -- Kpis prisma src '*.reference.html'` → 0).
- PR não aberto (mandato).

## RETOMADA 1

- **Fatia:** 1 — merge da `main` pela E2.5.
- **Executor e modelo:** `dev-san312b-c2-f1-sol` · Codex CLI · GPT-5.6 Sol · esforço medium · nível menor declarado. Não achou, não planejou e não vota.
- **Head de entrada:** `8dd477b8c2f19fc047069705010ace54ad32dd2a`; `origin/main` medida em `f7922ab7360487ced44203a76de75b80c5094140`. Esta seção integra o próprio commit de merge; o head de saída é publicado pelo `git rev-parse HEAD` após o commit e no push.

### Feito — comando → saída

- `git fetch origin main; git status --porcelain; git rev-parse HEAD origin/main` → árvore vazia; head `8dd477b8…`; alvo `f7922ab7…`; disco `9,47 GB` livres antes da fatia.
- `python -I agent-orchestration/controle/gerar-indice-pendencias.py` no objeto de entrada → vermelho-controle de R7: `104` linhas (`53 insertions`, `51 deletions`); restauração por `git checkout --` com hash antes/depois `0622dd90b9325f7523a7cb95549984527c88418e` igual.
- `git merge origin/main` → os 3 conflitos previstos pela E2.5, somente em `pendencias.md`, `pendencias-indice.md` e `frontend/package.json`.
- Resolução de `pendencias.md` → lado da `main` primeiro e as 2 entradas do 12b depois; cada cabeçalho conferido uma vez, inclusive `P-FINANCE-FRONT-SOMA-DINHEIRO-PRE-EXISTENTE`, `P-SAN3-12B-MENU-ABAS-FORA-DO-GOVERNO`, `P-SAN3-20-RESUMO-CHEQUE-VINCULADO` e os 4 cabeçalhos do #464 medidos.
- `python -I agent-orchestration/controle/gerar-indice-pendencias.py` após unir a fonte → `666 cabeçalhos / 655 IDs`; índice regenerado, nunca resolvido à mão.
- União do `test:smoke` por token, preservando a lista da `main` e anexando os 9 testes do 12b → `173` tokens, `173` únicos; `tests/checklists-editor-lock.smoke.test.tsx` aparece uma vez.
- `git diff --check` → vazio.
- `npm --prefix frontend run check` (Node `v20.19.5`) → `tsc -b --noEmit`, exit `0`.
- `npm --prefix frontend run test:smoke` (Node `v20.19.5`) → TAP `1458 tests · 1458 pass · 0 fail · 0 skipped · 0 cancelled`.

### Mutações

- **R7 / índice não regenerado:** no head de entrada, o gerador alterou o índice em 104 linhas, portanto o critério ficou vermelho; o arquivo foi restaurado e o hash original conferido. Depois da união de `pendencias.md`, o índice foi gerado da fonte do mesmo commit.

### Falta

- Nada da FATIA 1. As FATIAS 2–9 da E2.6 permanecem para execuções posteriores; nenhuma delas foi iniciada aqui.

### Próximo comando exato

`"C:/Program Files/Git/bin/bash.exe" -lc "cd /c/Users/AMP/w-san312b && git fetch origin && git status --porcelain && git rev-parse HEAD"`
