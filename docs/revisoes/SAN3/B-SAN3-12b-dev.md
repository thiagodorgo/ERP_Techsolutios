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
- **(SUPERADA no ciclo 2 pela E2/R5: a tela oferece "Cancelar o cheque" após o desvínculo; o texto abaixo descreve o objeto do ciclo 1.)**
- **D-6 — sem "Cancelar o cheque" depois do desvínculo (R-res-6).** O §4.1 não lista `POST /cheques/:id/cancel` entre as rotas que a tela
  consome e a tela de Cheques é do `B-SAN3-24`. Depois do desvínculo a baixa reabre com o aviso persistente "Ele continua registrado em
  Cheques; se não for mais usado, cancele-o lá", e, se o servidor devolver `warning: cheque_still_depositable`, o aviso diz que o cheque
  ainda pode compensar. A pendência `P-SAN3-12-CHEQUE-DESVINCULADO-CAIXA-SEM-TITULO` (dono `B-SAN3-24`) já cobre o resto.
- **D-7 — `422 title_has_pending_cheque.details` não chega ao front.** O `ApiError` de `services/api/client.ts` (fora do §7.2) lê só
  `code`/`reason`. O bloco do cheque (F6) lê os cheques por `GET /cheques?title_id=` (rota do §4.1), que dá número, banco, valor e situação.
- **D-8 — Node 22 (corrigido no ciclo 2, E2/R13(c)).** Node 22.14.0 está instalado (`C:/Users/AMP/AppData/Local/nvm/v22.14.0/node.exe`); o
  `test:smoke` foi executado nas duas versões por caminho absoluto no PATH do comando, nunca `nvm use`; a CI roda Node 20. TAP do head da
  FATIA 8 (RETOMADA 8): Node `v20.19.5` → `tests 1475 · pass 1475 · fail 0 · skipped 0`; Node `v22.14.0` → `tests 1475 · pass 1475 · fail 0 ·
  skipped 0`. *Texto do ciclo 1, superado:* "Node 22 indisponível nesta máquina (`node --version` → `v20.19.5`; sem nvm). O `test:smoke`
  rodou em Node 20; o de Node 22 fica com a CI." — a CI não roda Node 22 (C3-06 do ciclo 1).
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

## RETOMADA 2

- **Fatia:** 2 — R2 + R1 pela E2.6.
- **Executor e modelo:** `dev-san312b-c2-f2-sol` · Codex CLI · GPT-5.6 Sol · esforço medium · nível menor declarado. Não achou, não planejou e não vota.
- **Head de entrada:** `b5246e8dc0db16a16b6ef41a3244720ac40115d9`, exatamente o head publicado pela RETOMADA 1. Esta seção integra o commit da fatia; o head de saída é publicado pelo `git rev-parse HEAD` após o commit e no push.
- **Skills aplicadas:** `ts-frontend-full` (camada/view e teste no padrão existente) e `ui-ux-pro-max` (filtro visível/removível, rótulo acessível e alinhamento sem regra nova em `app.css`). Tela-modelo e referência mantidas: `frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx` e `docs/claude-code-handoff/screen-refs/financeiro-ab.reference.html`.

### Feito — comando → saída

- `git fetch origin; git status --porcelain; git rev-parse HEAD; git log --oneline -3` → árvore vazia; head `b5246e8d`; os dois ancestrais imediatos são `8dd477b8` e `b2cbd5fd`; disco `9,94 GB` livres antes da fatia.
- Três casos foram escritos em `frontend/tests/finance-page-live.test.tsx` antes do produto: R2 (faixa com nome e contagem separados), R1 (conta + alvo, remoção da conta) e R1 (indicador organizacional limpa a conta).
- Vermelho-controle: `cd frontend && node --test --import tsx tests/finance-page-live.test.tsx` → `22 tests · 19 pass · 3 fail · 0 skipped`; falhas nominais: `display` ausente em R2 e chip de conta ausente nos dois cenários R1.
- Produto: `FinanceiroViewA.tsx` ganhou `FilterChips` na barra existente, na ordem conta → alvo; fallback `Conta selecionada`; botão `aria-label="Remover o filtro de conta"`; remoção preserva o outro filtro; os indicadores "Entradas em <mês>", "Saídas em <mês>" e "A conciliar" enviam `accountId: null`; a faixa usa `display:flex`, alinhamento, reticências, `title`, contagem sem quebra e margem de `8 px`, tudo inline e sem tocar `app.css`.
- Teste dono após o produto: `cd frontend && node --test --import tsx tests/finance-page-live.test.tsx` → `22 tests · 22 pass · 0 fail · 0 skipped`.
- Regressão dirigida: `cd frontend && node --test --import tsx tests/finance-page-live.test.tsx tests/finance-contas-extrato.smoke.test.tsx` → `29 tests · 29 pass · 0 fail · 0 skipped`.
- `npm --prefix frontend run check` → `tsc -b --noEmit`, exit `0` (reexecutado depois das mutações restauradas).
- `git diff --check` → vazio; escopo do diff antes do registro = somente `FinanceiroViewA.tsx` e `finance-page-live.test.tsx`.

### Mutações

- **R2 / tirar `display: "flex"`:** `node --test --import tsx --test-name-pattern="R2:" tests/finance-page-live.test.tsx` → `1 fail` nominal (`actual undefined`, esperado `flex`); restaurada.
- **R1 / voltar o chip a olhar só o alvo (suprimir o chip de conta):** teste nominal `R1: filtro de conta convive...` → `1 fail`, sem `Filtro: Conta: Banco do Brasil`; restaurada.
- **R1 / indicador "A conciliar" voltar a herdar `accountId`:** teste nominal `R1: indicador da organização...` → `1 fail`, chip `Conta: Caixa da loja` ainda presente e lista ainda restrita; restaurada.
- Hash de restauração conferido depois das três: `FinanceiroViewA.tsx` = `6cddd6ead6e79dc67a1050315372cfd88c5a8f43ea0102883944e01fd26aea66`; `finance-page-live.test.tsx` = `10ee1e694f5c7c178e7c6a3a7b255aded08ce725a5b3cc9f893b6e2e934531bb`, iguais aos hashes verdes medidos antes das mutações.

### Falta

- Nada da FATIA 2. As FATIAS 3–9 da E2.6 permanecem para execuções posteriores; nenhuma delas foi iniciada aqui.

### Próximo comando exato

`"C:/Program Files/Git/bin/bash.exe" -lc "cd /c/Users/AMP/w-san312b && git fetch origin && git status --porcelain && git rev-parse HEAD"`

## RETOMADA 3

- **Fatia:** 3 — R4 pela E2.6.
- **Executor e modelo:** `dev-san312b-c2-f3-sol` · Codex CLI · GPT-5.6 Sol · esforço medium · nível menor declarado. Não achou, não planejou e não vota.
- **Head de entrada:** `b90aa9f0c0e4e7713049b377956f266655e2f258`, exatamente o head publicado pela RETOMADA 2. Esta seção integra o próprio commit da fatia; o head de saída é publicado pelo `git rev-parse HEAD` após o commit e no push.
- **Skills aplicadas:** `ts-frontend-full` (IO mantido no contêiner, hooks específicos e proteção contra resposta assíncrona superada) e `ui-ux-pro-max` (contagens por conta continuam visíveis; nenhuma decisão visual ou alteração de design system).

### Feito — comando → saída

- `git fetch origin; git status --porcelain; git rev-parse HEAD; git log --oneline -3; df -BG /c` → árvore vazia; head `b90aa9f0`; ancestrais imediatos `b5246e8d` e `8dd477b8`; `11 GB` livres, acima do piso da E2.
- F14 foi ampliado antes do produto em `frontend/tests/finance-page-live.test.tsx`: o dublê segura `/financial-accounts` até sair o primeiro `/financial-entries/aggregate`, conta por URL completa e exige 6 URLs únicas (4 situações + 2 contas), cada uma uma vez, além das faixas `Banco do Brasil: 1 a conciliar` e `Caixa da loja: 1 a conciliar` presentes.
- Vermelho-controle: `cd frontend && node --test --import tsx --test-name-pattern="F14:" tests/finance-page-live.test.tsx` → `1 fail`; foram observadas `10` chamadas de agregado, não `6`, com as quatro URLs situacionais repetidas.
- Produto: `FinanceiroPage.tsx` passou a usar `SITUATION_QUERIES` constante de módulo e dois `useEntriesAggregate` independentes (situação e contas), mescla os dois mapas no view-model e faz `refreshAggregates(background)` disparar ambos. `useEntriesAggregate.ts` agora mescla cada rodada no estado anterior e usa contador em `useRef` para ignorar resultado de rodada superada.
- Teste dono após o produto: F14 nominal → `1 test · pass 1 · fail 0 · skipped 21`; seis URLs únicas, uma vez cada, com as duas contagens por conta presentes.
- `npm --prefix frontend run check` → `tsc -b --noEmit`, exit `0`.
- Regressão dirigida: `cd frontend && node --test --import tsx tests/finance-page-live.test.tsx tests/finance-contas-extrato.smoke.test.tsx` → `29 tests · pass 29 · fail 0 · skipped 0`.

### Mutações

- **R4 / recolocar as consultas por conta no mesmo `useMemo` das quatro situações:** F14 nominal → `1 fail`, `10 !== 6`; as quatro URLs situacionais voltaram a sair duas vezes. Restaurada.
- **R4 / a view chamar `useFinancialSummary()` novamente:** F14 nominal → `1 fail`, `/financial-summary` foi chamada `2` vezes, esperado `1`. Restaurada.
- Hashes verdes conferidos após as restaurações: `FinanceiroPage.tsx` = `e29f5cf29972c0566ad2807d02a9019b95efbc0ba776a40e1b79a6e527d482cc`; `useEntriesAggregate.ts` = `eeac736740f04f3e0eada2d402f785cf27aeeb31b8361661aed3420722dd7ae0`; `FinanceiroViewA.tsx` = `6cddd6ead6e79dc67a1050315372cfd88c5a8f43ea0102883944e01fd26aea66`; `finance-page-live.test.tsx` = `a4e3da32f089a11a9093d99352fea35e00215298743172b5271948d6b117625b`.

### Falta

- Nada da FATIA 3. As FATIAS 4–9 da E2.6 permanecem para execuções posteriores; nenhuma delas foi iniciada aqui.

### Próximo comando exato

`"C:/Program Files/Git/bin/bash.exe" -lc "cd /c/Users/AMP/w-san312b && git fetch origin && git status --porcelain && git rev-parse HEAD"`

## RETOMADA 4

- **Fatia:** 4 — R3(a)(b)(c) pela E2.6.
- **Executor e modelo:** `dev-san312b-c2-f4-opus` · subagente genérico Claude · Claude Opus 5.5 · nível menor declarado. Não achou, não planejou e não vota. **Cobertura declarada (E2.6, última linha):** o Codex caiu pelo limite duas vezes nesta fatia (`dev-san312b-c2-f4-sol` às 12:08Z e a retomada `dev-san312b-c2-f4b-sol`); o dono mandou o Claude terminar. Comandos pelo Bash normal da sessão (não pelo `C:/Program Files/Git/bin/bash.exe`, que era só para o Codex).
- **Head de entrada:** `7d8e8342fa55ea8464c5b03c53f6f9ed09aad849` (= `origin/feat/web-financeiro-baixa-e-contas`), o head publicado pela RETOMADA 3. O head de saída é o do commit desta fatia, publicado no push.
- **Skills:** `ts-frontend-full` (camada de dados no hook existente, sem lib nova) e `ui-ux-pro-max` (contagem honesta: número do servidor, nenhum número local parcial). Tela-modelo e referência inalteradas (`WorkOrdersPage.tsx`, `financeiro-ab.reference.html`).

### Parcial herdado, medido antes de confiar (P3/P7)

- `git status --short` → 7 arquivos modificados, nada commitado: `FinanceiroPage.tsx`, `FinanceiroViewA.tsx`, `financial-titles.service.ts`, `financial-titles.types.ts`, `useFinancialTitles.ts`, `finance-page-live.test.tsx` e este relatório (com uma RETOMADA 4 escrita pela execução caída, aqui substituída por esta).
- `git diff` comparado (sem as linhas `index`) com `arquivo-quedas/dev-12b-f4-sol/f4-parcial.patch` → idêntico. Nenhuma mutação pela metade: os 5 arquivos de produto lidos inteiros contra R3(a)(b)(c).
- Aproveitado: `offset?` nos filtros e no `buildQuery`; `total/hasMore/loadingMore/loadMore` no hook com rodada em `useRef`; fiação na página; abas por `summary.<dir>.openCount`; "Vencidos" por `summary.<dir>.overdueCount`; os outros três blocos sem número e com o `aria-label` da E2 enquanto `items.length < total`; os 2 testes R3(a) e R3(b-c) com o fixture de 130.
- Refeito por mim: (1) **falha na releitura** volta à forma de antes da paginação (o hook entrega o fallback vazio, como fazia `setData(nextData)`; o parcial mantinha as linhas velhas com `source: "fallback"`, o que mudava o que a lista legada `TitlesListView.tsx` mostra); (2) a trava contra clique duplo em `loadMore` passou a ser `useRef` (o estado só mudava no render seguinte), e `loadMore` ficou estável; (3) **fixture**: no parcial os 17 vencidos estavam todos na 1ª página, então "Vencidos" contado nas linhas carregadas também dava 17 e o teste não distinguia servidor de conta local; agora 10 vencidos estão na 1ª página e 7 depois do título 123 (total 17 só no resumo).

### Feito — comando → saída

- `git log --oneline -3; git status --short; git rev-parse HEAD origin/feat/web-financeiro-baixa-e-contas; df -h /c` → head `7d8e8342` nos dois; 11 GB livres (piso 7,5).
- **Vermelho-controle** (produto do head, teste novo): os 5 arquivos de produto copiados para o scratchpad (sha256 registrado), sobrescritos por `git show HEAD:<arquivo>`, e `cd frontend && node --test --import tsx --test-name-pattern="R3\(" tests/finance-page-live.test.tsx` → `24 tests · 0 pass · 2 fail · 22 skipped`; R3(a) `expected: 130` (o hook não expõe `total`), R3(b-c) `actual: 'A receber100'`. Parcial devolvido; `sha256sum -c` → 5/5 OK.
- `npm --prefix frontend run check` (Node `v20.19.5`) → `tsc -b --noEmit`, exit `0`.
- Teste dono: `node --test --import tsx --test-name-pattern="R3\(" tests/finance-page-live.test.tsx` → `24 tests · 2 pass · 0 fail · 22 skipped`.
- Regressão dirigida, depois das mutações: `cd frontend && node --test --import tsx tests/finance-page-live.test.tsx tests/finance-titles.test.tsx tests/finance-contas-extrato.smoke.test.tsx` → `54 tests · 54 pass · 0 fail · 0 skipped` (24 página viva + 23 legado de títulos + 7 contas/extrato).
- `git diff --check` → vazio. Escopo: só arquivos do PERMITIDO da E2.1 (os 5 de produto de R3, o teste vivo e este relatório); `src/**`, `prisma/**`, `app.css`, `components/**`, `Kpis/**`, lockfiles intocados.

### Mutações (uma por vez, âncora única, teste dono, restauro com sha256 conferido)

| # | Mutação | Arquivo | Teste dono | Resultado | Restauro |
|---|---|---|---|---|---|
| M4a | `loadMore` com `offset: 0` (sem offset) | `useFinancialTitles.ts` | R3(a) | VERMELHO (`expected 130`, `actual 100`) | hash igual `a9f9e9a0f3fc` |
| M4b | releitura só da 1ª página (`reached = PAGE_LIMIT`) | `useFinancialTitles.ts` | R3(a) | VERMELHO (130 → 100: encolheu) | hash igual `a9f9e9a0f3fc` |
| M4c | `loadMore` sem dedupe (repete um `id`) | `useFinancialTitles.ts` | R3(a) | VERMELHO (`actual 131`) | hash igual `a9f9e9a0f3fc` |
| M4d | `total` = linhas carregadas, não o do servidor | `useFinancialTitles.ts` | R3(a) | VERMELHO (`actual 100`) | hash igual `a9f9e9a0f3fc` |
| M4e | aba com `openRec.length` | `FinanceiroViewA.tsx` | R3(b-c) | VERMELHO (`'A receber100'`) | hash igual `62700f36c3b1` |
| M4f | "Vencidos" contado nas linhas carregadas | `FinanceiroViewA.tsx` | R3(b-c) | VERMELHO (`Vencidos: 10`) | hash igual `62700f36c3b1` |
| M4g | "Vencem hoje" conta com carga incompleta | `FinanceiroViewA.tsx` | R3(b-c) | VERMELHO (`'Vencem hoje1'`) | hash igual `62700f36c3b1` |

7 mutações, 7 vermelhas, 7 restauradas. M4a, M4e e M4g são as formas de 3 das 4 mutações da R3; a FATIA 5 as re-executa como as oficiais, junto da 4ª (`TablePager` removido), que depende de R3(e). Hashes finais: `useFinancialTitles.ts` `a9f9e9a0…a424`, `FinanceiroViewA.tsx` `62700f36…0b70`, `FinanceiroPage.tsx` `0b53cb57…be2`, `financial-titles.service.ts` `decc9846…bc5b`, `financial-titles.types.ts` `e5dcd160…8e23`, `finance-page-live.test.tsx` `7981140b…58e2`.

### Falta

- Nada da FATIA 4. Não testado aqui (fica para a bateria da FATIA 8): `test:smoke` inteiro e Node 22. As FATIAS 5–9 da E2.6 não foram iniciadas.

### Próximo comando exato

`"C:/Program Files/Git/bin/bash.exe" -lc "cd /c/Users/AMP/w-san312b && git fetch origin && git status --porcelain && git rev-parse HEAD"`

## RETOMADA 5

- **Fatia:** 5 — R3(d)(e)(f) pela E2.6.
- **Executor e modelo:** `dev-san312b-c2-f59-opus` · subagente genérico Claude · Claude Opus 5.5 · nível menor declarado. Não achou, não planejou e não vota. **Cobertura declarada (E2.6, última linha):** o dono mandou o Claude terminar as fatias 5 a 9. Comandos pelo Bash normal da sessão (o `C:/Program Files/Git/bin/bash.exe` era só para o Codex).
- **Head de entrada:** `16aa7fdce7ad80b3128b21013d1f850ece604edd` (= `origin/feat/web-financeiro-baixa-e-contas`), o head da RETOMADA 4. O head de saída é o do commit desta fatia, publicado no push.
- **Skills:** `ts-frontend-full` (paginação client-side no padrão da tela-modelo `WorkOrdersPage.tsx:234-240,504-515`; `TablePager` da biblioteca, nada novo em `components/**`) e `ui-ux-pro-max` (contador honesto; botão com estado de carga e desabilitado durante o pedido; `app.css` intocado).

### Feito — comando → saída

- `git fetch origin; git status --porcelain; git rev-parse HEAD origin/feat/web-financeiro-baixa-e-contas; df -h /c` → árvore vazia; head `16aa7fdc` nos dois; 11 GB livres (piso 7,5).
- Teste novo escrito antes do produto em `frontend/tests/finance-page-live.test.tsx`: `R3(d-e-f)` com o fixture de 130 (dublê honra `offset`; resumo `openCount=130`, `overdueCount=17`): aba "A receber 130"; contador `100 mais recentes de 130 títulos`; `TablePager` presente com `1–20 de 100 carregados · 130 no servidor` e 20 linhas; "Vencidos 17"; "Vencem hoje" sem número; "Carregar mais títulos (30 restantes)" → `GET …&limit=100&offset=100` → contador `130 títulos`, pager `1–20 de 130`, "Vencem hoje1", botão ausente; "Próxima" → `21–40 de 130`, linha 21 = Cliente 014 e linha 40 = Cliente 033 (ordem por vencimento); clicar "Vencidos" → página volta à 1ª (`1–17 de 17`, `17 títulos`).
- **Vermelho-controle** (produto do head `16aa7fdc`, teste novo): `cd frontend && node --test --import tsx --test-name-pattern="R3\(d" tests/finance-page-live.test.tsx` → `25 tests · 0 pass · 1 fail · 24 skipped`; `expected: '100 mais recentes de 130 títulos'`, `actual: '100 títulos'`.
- Produto (`FinanceiroViewA.tsx`, único arquivo de produto tocado): (d) contador `N títulos` com a carga completa; incompleta, `L mais recentes de T títulos` sem alvo e `N entre os L mais recentes de T títulos` com alvo; (e) `TablePager` (import de `components/patterns`) no rodapé da tabela de títulos, client-side sobre as linhas visíveis, `pageSize` 20 (opções padrão 20/50), `rangeLabel` `a–b de N` ou `a–b de N carregados · T no servidor`, página clampada como na tela-modelo; `go()` volta à página 1; trocar de página ou de tamanho fecha o detalhe aberto; (f) botão `pat-btn pat-btn--secondary` "Carregar mais títulos (R restantes)" ao lado do pager enquanto `hasMore`, desabilitado com "Carregando…" durante `loadingMore`, ausente quando `hasMore` é falso. Nada soma dinheiro (F8): contagens e fatias da lista.
- `npm --prefix frontend run check` (Node `v20.19.5`) → `tsc -b --noEmit`, exit `0`.
- Teste dono e regressão dirigida: `cd frontend && node --test --import tsx tests/finance-page-live.test.tsx tests/finance-titles.test.tsx tests/finance-contas-extrato.smoke.test.tsx` → `55 tests · 55 pass · 0 fail · 0 skipped` (25 página viva + 23 legado de títulos + 7 contas/extrato).
- `git diff --check` → vazio. Escopo: `FinanceiroViewA.tsx`, `finance-page-live.test.tsx` e este relatório (PERMITIDO da E2.1).

### Mutações — as 4 oficiais da R3 (roteiro `mutar.py` no scratchpad do dev: âncora única CRLF-consciente, teste dono `--test-name-pattern="R3\("`, restauro dos bytes e sha256 conferido)

| # | Mutação | Arquivo | Teste dono | Resultado | Restauro |
|---|---|---|---|---|---|
| R3-M1 (= M4e) | aba "A receber" com `openRec.length` | `FinanceiroViewA.tsx` | R3(b-c), R3(d-e-f) | VERMELHO (`25 · pass 1 · fail 2`) | hash igual |
| R3-M2 (= M4a) | `loadMore` com `offset: 0` | `useFinancialTitles.ts` | R3(a), R3(d-e-f) | VERMELHO (`fail 2`) | hash igual |
| R3-M3 (nova) | `TablePager` removido (`footer = null && (<TablePager …`) | `FinanceiroViewA.tsx` | R3(d-e-f) | VERMELHO (`fail 1`) | hash igual |
| R3-M4 (= M4g) | "Vencem hoje" contando com a carga incompleta | `FinanceiroViewA.tsx` | R3(b-c), R3(d-e-f) | VERMELHO (`fail 2`) | hash igual |

4 mutações, 4 vermelhas, 4 restauradas. Hashes verdes conferidos antes e depois: `FinanceiroViewA.tsx` `aaccfb4f…f0f4`, `useFinancialTitles.ts` `a9f9e9a0…a424` (inalterado desde a fatia 4), `finance-page-live.test.tsx` `532912de…a718` (antes desta seção do relatório).

### Falta

- Nada da FATIA 5. Não testado aqui (fica para a bateria da FATIA 8): `test:smoke` inteiro e Node 22. As FATIAS 6–9 não foram iniciadas.

### Próximo comando exato

`cd /c/Users/AMP/w-san312b && git fetch origin && git status --porcelain && git rev-parse HEAD`

## RETOMADA 6

- **Fatia:** 6 — R5 pela E2.6.
- **Executor e modelo:** `dev-san312b-c2-f59-opus` · subagente genérico Claude · Claude Opus 5.5 · nível menor declarado (cobertura declarada, ver RETOMADA 5).
- **Head de entrada:** `f137e186` (fatia 5, empurrado). O head de saída é o do commit desta fatia, publicado no push.
- **Skills:** `ts-frontend-full` (ação nova no serviço e nas ações existentes, sem rota nem DTO novos) e `ui-ux-pro-max` (ação adjacente a dinheiro em dois passos, confirmação explícita, recusa traduzida e botão mantido; nenhum termo técnico; `app.css` intocado).

### Feito — comando → saída

- `git status --porcelain; git rev-parse HEAD` → vazio; `f137e186`.
- Testes escritos antes do produto em `finance-page-live.test.tsx` (3 casos, dublê `unlinkThenCancelOverride`): **R5(a)** `tenant_admin` (ADMIN do arnês: `cheques:unlink_title` + `cheques:update`) — desvincula, vê o aviso "…cancele-o agora: assim o dinheiro não entra duas vezes.", "Cancelar o cheque nº 000123" → "Confirmar o cancelamento"/"Manter o cheque" (nada sai antes da confirmação), confirmar → `POST /cheques/ch-1/cancel` com corpo `null`; a 1ª resposta é 422 `cheque_linked_unlink_first` → mensagem traduzida e o botão fica; a 2ª é 200 → "Cheque nº 000123 cancelado. Ele não entra mais no caixa." e o botão some; a baixa continua aberta. **R5(c)** ator sintético `so:cheques:unlink_title` (o FINANCE do arnês sem `cheques:update`, mais `cheques:unlink_title`) — desvincula, nenhum botão "Cancelar o cheque…", aviso com "Peça a quem administra os cheques para cancelar o cheque nº 000123.", 0 escrita de cancelamento. **R5(b)** cheque `deposited` (unlink 200 com `warning: cheque_still_depositable`) — sem botão, aviso "…Atenção: ele já estava depositado e ainda pode compensar — confira com o banco antes de receber por outro meio.". Em `finance-baixa.smoke.test.tsx`: **R5(d)** a fonte do `BaixaForm` não tem `cancele-o lá|Confira em Cheques` e tem "Não foi possível listar o cheque agora. Tente de novo."; o SSR passa `canCancelCheque={false}` e a ação `cancelCheque` no dublê.
- **Vermelho-controle** (produto do head `f137e186`, testes novos): `cd frontend && node --test --import tsx --test-name-pattern="R5\(" tests/finance-page-live.test.tsx` → `28 tests · 0 pass · 3 fail · 25 skipped` (o texto da baixa reaberta é o antigo "Ele continua registrado em Cheques; se não for mais usado, cancele-o lá." e não há botão). E `git grep -c "Cancelar o cheque" fc5ead6c -- frontend/src` → nenhuma ocorrência (exit 1), como a E2 previa.
- Produto: `financial-entries.service.ts` + `cancelCheque(context, chequeId)` → `POST /cheques/<id>/cancel` sem corpo (erros propagam); `useFinanceActions.ts` + `cancelCheque` em `FinanceActions`; `BaixaForm.tsx` + prop `canCancelCheque`, ação `cancelCheque` em `BaixaActions`, estado `followUp` (oferta → confirmação → envio), textos da E2 R5(a)(b)(c), frase de l.210 trocada por "Não foi possível listar o cheque agora. Tente de novo." (a de l.282-283, "A tela de Cheques chega com o próximo bloco", fica: é honesta); `FinanceiroPage.tsx` `access.cancelCheque = can("cheques:update")` → `canCancelCheque`. Nenhuma rota, permissão ou DTO novo.
- **E2 R5(e)** (para a C2 conferir o gate = permissão da rota, CE-G2): `node --import tsx -e 'import("./src/modules/core-saas/permissions/catalog.ts").then(m=>…)'` no head → `tenant_admin cheques:update = true` · `finance cheques:update = true` · `tenant_admin cheques:unlink_title = true` · `finance cheques:unlink_title = false`. A rota: `src/modules/cheques/cheque.routes.ts:84-90` → `router.post("/cheques/:chequeId/cancel", requirePermission(CHEQUE_PERMISSIONS.update), …)`.
- `npm --prefix frontend run check` → exit `0`. Teste dono + regressão: `cd frontend && node --test --import tsx tests/finance-page-live.test.tsx tests/finance-baixa.smoke.test.tsx` → `37 · 37 pass · 0 fail`; todos os arquivos do bloco `node --test --import tsx tests/finance-*.test.ts* tests/financial-*.adapter.test.ts tests/dense-expandable-row.test.tsx` → `105 tests · 105 pass · 0 fail · 0 skipped`.
- `git grep -n -E "cancele-o lá|Confira em Cheques" -- frontend/src/modules/finance/entries/components/BaixaForm.tsx` → 0 (exit 1). `git diff --check` → vazio. Escopo: `BaixaForm.tsx`, `financial-entries.service.ts`, `useFinanceActions.ts`, `FinanceiroPage.tsx`, `finance-page-live.test.tsx`, `finance-baixa.smoke.test.tsx` e este relatório (PERMITIDO da E2.1; `financial-entries.types.ts` não precisou mudar).

### Mutações — as 3 da R5 (+1 variante da 3ª), roteiro `mutar.py`, teste dono `--test-name-pattern="R5\("`

| # | Mutação | Arquivo | Teste dono | Resultado | Restauro |
|---|---|---|---|---|---|
| R5-M1 | botão de cancelar também para o cheque `deposited` | `BaixaForm.tsx` | R5(b) | VERMELHO (`28 · pass 2 · fail 1`) | hash igual |
| R5-M2 | gate por `cheques:unlink_title` em vez de `cheques:update` | `FinanceiroPage.tsx` | R5(c) | VERMELHO (o ator `so:unlink` vê o botão) | hash igual |
| R5-M3 | `POST /cancel` com corpo `{}` | `financial-entries.service.ts` | R5(a) | VERMELHO | hash igual |
| R5-M3b (variante) | rota `/cheques/<id>` sem `/cancel` | `financial-entries.service.ts` | R5(a) | VERMELHO | hash igual |

Hashes verdes (antes e depois das mutações): `BaixaForm.tsx` `ecc2a7f3…`, `FinanceiroPage.tsx` `30996677…`, `financial-entries.service.ts` `ce587e90…`, `useFinanceActions.ts` `6cc5a64d…`, `finance-page-live.test.tsx` `bd6adf50…`, `finance-baixa.smoke.test.tsx` `363f2b6e…`.

### Falta

- Nada da FATIA 6. `test:smoke` inteiro e Node 22 ficam para a FATIA 8; FATIAS 7–9 não iniciadas.

### Próximo comando exato

`cd /c/Users/AMP/w-san312b && git fetch origin && git status --porcelain && git rev-parse HEAD`

## RETOMADA 7

- **Fatia:** 7 — R6 + R9 + R10 + R11 + R12 pela E2.6.
- **Executor e modelo:** `dev-san312b-c2-f59-opus` · subagente genérico Claude · Claude Opus 5.5 · nível menor declarado (cobertura declarada, ver RETOMADA 5).
- **Head de entrada:** `702d6bbb` (fatia 6, empurrado). O head de saída é o do commit desta fatia, publicado no push.
- **Skills:** `ts-frontend-full` (ordem das checagens depois da falha; estado de acesso no padrão `StatePanel tone="forbidden"`) e `ui-ux-pro-max` (mensagem honesta, sem afirmar o que o servidor recusou; estado obrigatório "acesso não permitido", §7).

### Feito — comando → saída

- `git status --porcelain; git rev-parse HEAD` → vazio; `702d6bbb`.
- **Testes antes do produto** (`finance-page-live.test.tsx`): **R6** (2 casos) — 422 `overpayment` com a releitura em `paidAmount 400` → "O valor ultrapassa o saldo em aberto do título." + "O título mudou desde que você abriu: pago R$ 400,00 de R$ 1.000,00.", formulário de volta com valor `600,00`, 1 só POST; rede caída com a releitura paga → "já está registrada"; 409 `duplicate_payment` com a releitura SEM mudança → "já está registrada". **R9** (2 casos, atores sintéticos por permissão, leituras + 1 permissão): `financial_entries:create` sem `financial_titles:update` → "Registrar recebimento" presente; `financial_titles:update` sem `financial_entries:create` → ausente, com "Seu perfil só consulta"; idem "Conciliar" (`financial_entries:update` × `financial_titles:update`). **R10** — `financial_entries:read` + `financial_titles:read`, sem `financial_accounts:read`, em `?aba=ext` → "Acesso não permitido" + "Seu perfil não inclui as contas desta organização. Para mais acesso, fale com o administrador da organização.", sem "Cadastre a primeira conta", nenhum botão de cadastro; a aba "A receber" segue igual.
- **Vermelho-controle** (produto do head `702d6bbb`, testes novos): `cd frontend && node --test --import tsx --test-name-pattern="^R(6|9|10):" tests/finance-page-live.test.tsx` → `33 tests · 2 pass · 3 fail · 28 skipped`: R6 ×2 vermelhos (a 422 `overpayment` virou "Esta baixa já está registrada no servidor"; a 409 sem mudança virou "Esta baixa já foi registrada." no formulário), R10 vermelho ("Cadastre a primeira conta"), **R9 ×2 verdes, como a E2 prevê** (o código do objeto está certo; o controle da R9 é a M2 aplicada, abaixo).
- **Vermelho-controle das guardas** (mutações sob as guardas ANTIGAS, `mutar.py`): `label="Reconciled"` em `EntryDetail.tsx` → F17 **VERDE** (`7 · pass 2 · fail 0`); `"Open (not reconciled)"` em `financial-titles.adapter.ts` → F17 **VERDE**; `let soma = 0; for (const e of model.entries.items) soma = soma + Number(e.amount)` na view A → F8 **VERDE** (`3 · 3 pass`). As três escapavam, como a C1 e a C3 provaram.
- **Medição antes de ampliar as guardas:** régua nova do F17 (literal com espaço, acento OU maiúscula inicial; `.ts` e `.tsx`) nos 4 diretórios `accounts/ entries/ pages/ titles/` → **0 ocorrência** em cada um (script de medição no scratchpad do dev); forma `\b(\w+)\s*=\s*\1\s*[+-]` em todo `frontend/src/modules/finance/**` (Python, linha a linha) → **N = 0**. Logo: nenhuma exclusão nominal no F17, nenhuma entrada nova no inventário do F8 (continua o das 8) e nada a acrescentar à `P-FINANCE-FRONT-SOMA-DINHEIRO-PRE-EXISTENTE`.
- Produto: `BaixaForm.tsx` `settleAfterFailure` — releitura → razão → só então o `paidAmount`: "já registrada" só de 409 `duplicate_payment` ou de falha sem status/5xx com a releitura mostrando o pagamento; toda outra recusa mostra a razão e, se o título mudou (`paidAmount` ou `status`), acrescenta "O título mudou desde que você abriu: pago R$ X de R$ Y." e refaz o valor para o saldo relido; `title_already_paid`/`title_cancelled`/status final fecham. `FinanceiroViewA.tsx` — aba `ext` sem `access.readAccounts` → `StatePanel tone="forbidden"` com o texto da E2. Guardas: `finance-contas-extrato.smoke.test.tsx` (F17: `titles/` e `.ts` na varredura; maiúscula inicial conta; controle positivo `label="Reconciled"`), `finance-no-money-reduce.guard.test.ts` (F8: forma `x = x ± …` nas duas réguas; controle positivo em diretório temporário).
- `npm --prefix frontend run check` → exit `0`. Arquivos do bloco: `cd frontend && node --test --import tsx tests/finance-*.test.ts* tests/financial-*.adapter.test.ts tests/dense-expandable-row.test.tsx` → `110 tests · 110 pass · 0 fail · 0 skipped`. `git diff --check` → vazio. Escopo: `BaixaForm.tsx`, `FinanceiroViewA.tsx`, `finance-page-live.test.tsx`, `finance-contas-extrato.smoke.test.tsx`, `finance-no-money-reduce.guard.test.ts` e este relatório (PERMITIDO da E2.1).

### Mutações (roteiro `mutar.py`; uma por vez; restauro dos bytes e sha256 conferido)

| # | Mutação | Arquivo | Teste dono | Resultado | Restauro |
|---|---|---|---|---|---|
| R6-M1 | `fresh.paidAmount > before.paidAmount → already` de volta antes da razão | `BaixaForm.tsx` | R6 | VERMELHO (`33 · pass 1 · fail 1`) | hash igual |
| R9-M1 (= M2 do plano) | gate da baixa por `financial_titles:update` | `FinanceiroPage.tsx` | R9 | VERMELHO | hash igual |
| R9-M1b (extra) | gate de "Conciliar" por `financial_titles:update` | `FinanceiroPage.tsx` | R9 | VERMELHO | hash igual |
| R10-M1 | aba `ext` sem leitura de contas volta ao vazio "Cadastre a primeira conta" | `FinanceiroViewA.tsx` | R10 | VERMELHO | hash igual |
| R11-M1 | `label="Reconciled"` em `EntryDetail.tsx` | `EntryDetail.tsx` | F17 | VERMELHO (`7 · pass 1 · fail 1`) | hash igual |
| R11-M2 | `"Open (not reconciled)"` em `financial-titles.adapter.ts` | `financial-titles.adapter.ts` | F17 | VERMELHO | hash igual |
| R12-M1 | `soma = soma + Number(e.amount)` na view A | `FinanceiroViewA.tsx` | F8 | VERMELHO (`3 · pass 1 · fail 2`) | hash igual |

Hashes verdes conferidos antes e depois: `BaixaForm.tsx` `4ec00001…`, `FinanceiroViewA.tsx` `4ef421aa…`, `finance-contas-extrato.smoke.test.tsx` `e0b5b3ef…`, `finance-no-money-reduce.guard.test.ts` `56a0af17…`, `finance-page-live.test.tsx` `c2fcf35b…`, `FinanceiroPage.tsx` `30996677…`, `EntryDetail.tsx` `68dfe2f4…`, `financial-titles.adapter.ts` `8a7cfbd6…` (os três últimos sem diff).

### Falta

- Nada da FATIA 7. FATIA 8 (registro + bateria completa em Node 20 e 22) e FATIA 9 (mutações no head final) a seguir.

### Próximo comando exato

`cd /c/Users/AMP/w-san312b && git fetch origin && git status --porcelain && git rev-parse HEAD`

## RETOMADA 8

- **Fatia:** 8 — R13 + R14 (bateria) pela E2.6.
- **Executor e modelo:** `dev-san312b-c2-f59-opus` · subagente genérico Claude · Claude Opus 5.5 · nível menor declarado (cobertura declarada, ver RETOMADA 5).
- **Head de entrada:** `8b7ebab5` (fatia 7, empurrado). O head de saída é o do commit desta fatia, publicado no push. `origin/main` medida agora: `972dc0ab` (andou 1 commit depois de `f7922ab7`: o #471, só `Kpis/**`); `git merge-base --is-ancestor f7922ab7 HEAD` → verdadeiro.

### R13 — registro

- **(a)** Apensadas **verbatim** ao fim de `docs/revisoes/SAN3/B-SAN3-12-plano.md` as linhas 939–1119 da cópia do orquestrador (`C:/Users/AMP/erp-pausa-2026-10-03/planos/B-SAN3-12-plano.md`): as duas seções "Ratificação do orquestrador" (14:35Z, com os 2 itens; 14:40Z) e a Emenda E2 inteira (E2.1–E2.7). Conferência: a E2 da cópia é idêntica à do parecer `R-B-SAN3-12b-ciclo1.md` (`diff` vazio). Medição: `grep -c "^## Ratificação do orquestrador"` → **2**; `grep -c "Emenda E2"` → **2** (≥ 1). **Divergência de transcrição declarada:** o comando literal da R13 (`git grep -c "Ratificação do orquestrador" <head> -- docs/revisoes/SAN3/B-SAN3-12-plano.md` = 2) dá **3** no head, porque a própria E2, apensa verbatim, cita essa expressão no critério da R13 (l.1202 do plano versionado). As seções de ratificação são 2 (l.1072 e l.1079); a mutação da R13 (tirar uma ratificação) leva o `grep -c "^## Ratificação do orquestrador"` de 2 para 1 e o comando literal de 3 para 2. A frase de `pendencias.md` (l.11925, "ratificação … no fim do plano") passa a ser verdadeira.
- **(b)** Seção nova no fim do plano versionado, "Transcrições da E2 no plano versionado (R13(b))", sem editar o corpo v3: §4.1 + `POST /cheques/:chequeId/cancel`; §10 — a C3 também julga F20–F22; F4 = 32.
- **(c)** D-8 deste relatório corrigido no lugar (o texto do ciclo 1 fica citado como superado), com os dois TAP abaixo.
- **(d)** 4 pendências da E2.4 abertas em `agent-orchestration/controle/pendencias.md`, cada uma com status, escopo com evidência, dono e encerramento: `P-SAN3-12B-BUSCA-TABELA-TITULOS` (dono `B-SAN3-12c`), `P-WEB-GUARDA-ROTA-TEXTO-SEM-ACENTO` (pré-existente: `git blame frontend/src/guards/PermissionGuard.tsx:29` → `98b4bee34` 2026-06-06; dono `B-SAN3-06a`, alternativa `B-SAN3-24`), `P-FINANCE-SUMMARY-ADAPTER-NUM-ZERO` (pré-existente: `git blame …/financial-summary.adapter.ts:113` → `08d009492` 2026-07-18; dono `B-SAN3-12c`), `P-SAN3-12-CE4-BRACO1-NA-CI` (dono `B-SAN3-12c` + ferramentas de processo). `P-SAN3-12B-MENU-ABAS-FORA-DO-GOVERNO` e `P-FINANCE-FRONT-SOMA-DINHEIRO-PRE-EXISTENTE` já existiam (1 cabeçalho cada) e ficam inalteradas (a R12 mediu N = 0 forma nova pré-existente, ver RETOMADA 7). Índice: `python -I agent-orchestration/controle/gerar-indice-pendencias.py` → `670 cabeçalhos / 659 IDs | ABERTA 508 · FECHADA 158 · SEM-STATUS 4`; regerado de novo → sha256 igual (`8a4b84a1db93e5c2…`), logo o versionado é o que o gerador produz da fonte deste commit (R7).

### Ajuste de caso (R11/R12), declarado

- Os controles positivos da R11 e da R12, que a FATIA 7 tinha posto como asserções dentro de casos existentes, viraram **casos próprios** (um por critério, como a meta da E2 conta): `F17/R11` em `finance-contas-extrato.smoke.test.tsx` (palavra única com maiúscula, literal de adaptador `.ts`, `titles/` e `.ts` na varredura) e `F8/R12` em `finance-no-money-reduce.guard.test.ts` (`soma = soma + …` e `resto = resto - 1` acusados nas duas réguas, em diretório temporário). Nenhum critério afrouxado; as mutações R11/R12 são re-executadas na FATIA 9.

### R14 — bateria (head local desta fatia; cada linha com `tests · pass · fail · skipped`)

| Comando | Saída | Veredito |
|---|---|---|
| `npm --prefix frontend run check` (Node `v20.19.5`) | `tsc -b --noEmit`, exit 0 | verde |
| `cd frontend && node --test --import tsx tests/finance-*.test.ts* tests/financial-*.adapter.test.ts tests/dense-expandable-row.test.tsx tests/finance-titles.test.tsx` | `112 · 112 · 0 · 0` (antes do ajuste de caso: `110`) | verde |
| por arquivo, os 9 do bloco | `finance-page-live` 33 · `finance-baixa.smoke` 9 · `finance-contas-extrato.smoke` 8 · `finance-conciliacao.smoke` 5 · `finance-no-money-reduce.guard` 4 · `finance-redirects` 3 · `financial-accounts.adapter` 6 · `financial-entries.adapter` 11 · `dense-expandable-row` 5 = **84** (baseline do ciclo 1: 67; meta da E2 ≥ 84 — **atingida**, 17 casos novos) | verde |
| `npm --prefix frontend run test:smoke` em Node `v20.19.5` | `1475 · 1475 · 0 · 0` (fatia 1: 1458; + 17 casos novos) | verde |
| `PATH="/c/Users/AMP/AppData/Local/nvm/v22.14.0:$PATH" npm --prefix frontend run test:smoke` (o `node --version` do comando e o de dentro de `frontend/` → `v22.14.0`; nunca `nvm use`) | `1475 · 1475 · 0 · 0` | verde |
| `npm --prefix frontend run build` | `✓ built in 58.85s`, exit 0 | verde |
| raiz `npm run check` · `npm run lint` · `npm run build` | exit 0 · 0 · 0 | verde |
| **CE-4 `-db` (F18), braço 1:** Postgres 16 descartável `dev12b-f8-pg` em `127.0.0.1:55821`; `npx prisma migrate deploy` → "All migrations have been successfully applied."; `CORE_SAAS_PERSISTENCE=prisma npm run db:provision-rbac` → "912 criada(s) … CONVERGIDO"; `CORE_SAAS_PERSISTENCE=prisma node --test --import tsx tests/b-san3-12-ce4-db.test.ts` | `2 · 2 · 0 · 0` (base PROVISIONADA) | verde |
| backend byte-idêntico | `git diff --name-only f7922ab7 HEAD -- src prisma scripts` → 0; `git diff --name-only origin/main...HEAD -- src prisma scripts` → 0. (Contra `c9a2d036` dá 7, todos `src/modules/checklists/**`, trazidos pelo merge do #464 na FATIA 1, não pelo 12b.) | igual |
| F8 como comando: `git grep -n -E "reduce\(\|\+= *[a-zA-Z.]*amount" -- frontend/src/modules/finance` | exatamente as **8** do inventário (7 em `commissions/**`, 1 em `titles/financial-titles.adapter.ts:198`) | igual ao inventário |
| `git diff --check` | vazio | verde |
| índice (R7) | gerador → sha256 estável `8a4b84a1…` (acima) | verde |
| `npm test` (raiz, `DATABASE_URL` do descartável `dev12b-f8-pg`, 14:03Z–14:22Z) | `4148 · 4131 · 15 · 2` + o aviso de denominador (1 arquivo sem teste registrado: `traccar-event-migration-drill-db.test.ts`), rc 1 | ver abaixo |

**As 15 falhas do `npm test` não são do bloco** (§C7.1-ter(a), ambiente/pré-existente; o 12b não toca `src/`, `prisma/` nem `scripts/`, medido acima). São as mesmas 4 famílias do ciclo 1 (`P-ARNES-WINDOWS-DRILLS-EBUSY-SETSID`, `P-SAN3-12-DRILL-PRISMA-SHIM-WINDOWS`): `san3-05-runtime-role-guard-db` (9 subtestes + o pai), `san3-09` T2.1 (o shim `node_modules/.bin/prisma` lido como JS no Windows: "SyntaxError: missing ) after argument list"; + o pai), `traccar-event-migration-drill-db` (sem teste registrado — o aviso de denominador) e `traccar-position-ingestion-db` (2: "tempo esgotado → 503"). **Por que 15 e não 8:** o meu descartável foi criado com `POSTGRES_USER=dev12b`, e o T5/T6/T9 e os T8b–T8e/T15 do san3-05 procuram o escape pelo superusuário de nome `postgres` ("escape atributo/postgres não encontrado: … rolname dev12b, rolsuper true"). Controle: num segundo descartável `dev12b-f8-pg2` (`127.0.0.1:55822`, superusuário `postgres`, migrado e provisionado) o mesmo arquivo dá `12 · 8 · 4 · 0` — só T14a/b, T14c, T14d e o pai, a família do roteiro shell no Windows, como no ciclo 1. A CI Linux (`backend-postgres`) é a régua dessas suítes.
- Limpeza parcial desta fatia: `docker rm -f dev12b-f8-pg dev12b-f8-pg2` → removidos; `docker ps -a | grep -c dev12b` → 0. Os artefatos de build ficam para a limpeza da FATIA 9 (§C5).

### Mutações desta fatia

- **R13:** tirar a seção "Ratificação do orquestrador (2026-10-26 14:40Z)" do plano versionado → `grep -c "^## Ratificação do orquestrador"` cai de 2 para 1. Executada no head final pela FATIA 9, com restauro por hash.

### Falta

- FATIA 9: as 24 + 17 mutações no head final, tabela §M, `git diff --check`, push final e "pronto para a junta".

### Próximo comando exato

`cd /c/Users/AMP/w-san312b && git fetch origin && git status --porcelain && git rev-parse HEAD`

## RETOMADA 9

- **Fatia:** 9 — R14 (mutações) pela E2.6.
- **Executor e modelo:** `dev-san312b-c2-f59-opus` · subagente genérico Claude · Claude Opus 5.5 · nível menor declarado (cobertura declarada, ver RETOMADA 5).
- **Head medido (objeto das mutações):** `bb4f068022d8aa3f1ff6b4d467d84577c0b240e5` (fatia 8, empurrado; `git status --porcelain` vazio antes e depois). Esta seção é o único arquivo deste commit; nenhum teste mudou nesta fatia, então o código e os testes do head de saída são os de `bb4f0680`.

### §M — as 24 do ciclo 1 + as 17 novas da E2 (+ R12, R7 e R13), no head final

- Roteiro: `mutar.py` do dev (scratchpad da sessão): cada mutação aplica UMA edição de âncora única (CRLF-consciente), roda o teste dono, exige saída ≠ 0, restaura os bytes originais e confere o sha256 de cada arquivo tocado. As 24 do ciclo 1 vêm, uma a uma, do roteiro do ciclo 1 (`scratchpad/dev-san312b-opus/mutacoes.py`), com as mesmas âncoras e o mesmo teste dono; a F15 recalcula a âncora a partir de `appearance.storage.ts` como o roteiro antigo fazia. A F18 rodou contra um Postgres 16 descartável próprio (`dev12b-f9-pg`, `127.0.0.1:55823`, migrado e provisionado; CE-4 verde `2 · 2` antes das mutações) e o contêiner foi removido depois.
- Comando: `python -I mutar.py f9/muts.py` com `DATABASE_URL` do descartável e `CORE_SAAS_PERSISTENCE=prisma`, de 14:30Z a 14:31Z.
- **Resultado: 44 mutações, 44 VERMELHAS, 44 restauradas com sha256 igual.** São 24 do ciclo 1 (F1–F22 com F4b e F8b), 17 novas (R1 ×2, R2 ×1, R3 ×4, R4 ×2, R5 ×3, R6 ×1, R9 ×1, R10 ×1, R11 ×2) e as 3 que contam como as suas próprias (R12, R7, R13). `git status --porcelain` → vazio depois da rodada.

| # | Resultado | Teste dono (`tests · pass · fail`) | Caso que caiu | Restauro |
|---|---|---|---|---|
| F1 | VERMELHO | `33 · pass 0 · fail 1` | F1/F2/F3: rede caiu → relê o título antes de falar e trava o reenvio até a releitura volta | igual |
| F2 | VERMELHO | `33 · pass 0 · fail 1` | F1/F2/F3: rede caiu → relê o título antes de falar e trava o reenvio até a releitura volta | igual |
| F3 | VERMELHO | `33 · pass 0 · fail 1` | F3: 409 duplicate_payment também relê antes de falar; se a releitura mostra o título quita | igual |
| F4 | VERMELHO | `11 · pass 9 · fail 2` | F4: a lista do código é IGUAL, como conjunto, à lista da tela de API_CONTRACTS.md — e tem  | igual |
| F4b | VERMELHO | `11 · pass 9 · fail 2` | F4: a lista do código é IGUAL, como conjunto, à lista da tela de API_CONTRACTS.md — e tem  | igual |
| F5 | VERMELHO | `9 · pass 8 · fail 1` | F5: os meios oferecidos são Pix, Transferência, Boleto, Dinheiro e Cartão — nunca cheque | igual |
| F6 | VERMELHO | `33 · pass 0 · fail 1` | F6/F21: 422 title_has_pending_cheque → bloco do cheque (valor e nº), sem campo de valor; s | igual |
| F7 | VERMELHO | `9 · pass 8 · fail 1` | F7: no detalhe do título, 'Registrar recebimento' só com a permissão de baixa e em título  | igual |
| F8 | VERMELHO | `4 · pass 2 · fail 2` | F8: o módulo financeiro tem EXATAMENTE as 8 ocorrências do inventário congelado (nenhuma n | igual |
| F8b | VERMELHO | `4 · pass 2 · fail 2` | F8: o módulo financeiro tem EXATAMENTE as 8 ocorrências do inventário congelado (nenhuma n | igual |
| F9 | VERMELHO | `33 · pass 0 · fail 1` | F9: títulos fora do ar (fallback) → painel de erro na aba, nunca 'nenhum título' | igual |
| F10 | VERMELHO | `5 · pass 3 · fail 2` | F10: conciliar leva SEMPRE expected_reconciled e expected_reconciled_at lidos da linha | igual |
| F11 | VERMELHO | `33 · pass 0 · fail 1` | F11: o indicador 'A receber vencido' leva à aba filtrada; o filtro aparece e sai com um cl | igual |
| F12 | VERMELHO | `33 · pass 0 · fail 1` | F12: linha de uma altura, sem botão; o detalhe abre logo abaixo, um por vez; Enter/Espaço  | igual |
| F13 | VERMELHO | `3 · pass 2 · fail 1` | F13: /finance/charges e /finance/payments redirecionam (replace) para /finance?aba=rec e ? | igual |
| F14 | VERMELHO | `33 · pass 0 · fail 1` | F14: a página pede cada rota e cada URL de agregado UMA vez por carga, sem perder as conta | igual |
| F15 | VERMELHO | `9 · pass 5 · fail 4` | chave por organização E usuário; sem um dos dois não há chave | igual |
| F16 | VERMELHO | `33 · pass 0 · fail 1` | F16 desatualizado: a atualização em 2º plano falha → faixa 'Dados desatualizados' e o dado | igual |
| F17 | VERMELHO | `8 · pass 6 · fail 2` | F19: conta sem saldo do servidor diz 'saldo indisponível' — nunca '—' nem R$ 0,00 fingido | igual |
| F18 | VERMELHO | `2 · pass 1 · fail 1` | B-SAN3-12 CE-4 (F18): conta → título → baixa → extrato → saldo → conciliar → 409 → 400 → 4 | igual |
| F19 | VERMELHO | `8 · pass 7 · fail 1` | F19: conta sem saldo do servidor diz 'saldo indisponível' — nunca '—' nem R$ 0,00 fingido | igual |
| F20 | VERMELHO | `8 · pass 7 · fail 1` | F20: lançamento conciliado — Estornar e Excluir desabilitados com a frase; sem o privilégi | igual |
| F21 | VERMELHO | `33 · pass 0 · fail 1` | F6/F21: 422 title_has_pending_cheque → bloco do cheque (valor e nº), sem campo de valor; s | igual |
| F22 | VERMELHO | `33 · pass 0 · fail 1` | F10: desfazer (com o privilégio) manda reconciled=false e o carimbo lido, em ms; F20: sem  | igual |
| R1-M1-chip-so-alvo | VERMELHO | `33 · pass 0 · fail 1` | R1: filtro de conta convive com o alvo e sai com um clique sem manter account_id | igual |
| R1-M2-a-conciliar-herda-conta | VERMELHO | `33 · pass 0 · fail 1` | R1: indicador da organização limpa a conta selecionada antes de abrir 'A conciliar' | igual |
| R2-M1-sem-display-flex | VERMELHO | `33 · pass 0 · fail 1` | R2: 'Conciliação por conta' separa nome e contagem com flex e distância mínima | igual |
| R3-M1-aba-length | VERMELHO | `33 · pass 1 · fail 2` | R3(b-c): abas e Vencidos usam o resumo; blocos locais omitem a contagem enquanto faltam pá | igual |
| R3-M2-loadMore-sem-offset | VERMELHO | `33 · pass 1 · fail 2` | R3(a): o hook carrega 100, busca offset 100, deduplica e relê todas as páginas alcançadas | igual |
| R3-M3-TablePager-removido | VERMELHO | `33 · pass 2 · fail 1` | R3(d-e-f): contador honesto, TablePager da biblioteca e 'Carregar mais títulos' até todos  | igual |
| R3-M4-vencem-hoje-incompleta | VERMELHO | `33 · pass 1 · fail 2` | R3(b-c): abas e Vencidos usam o resumo; blocos locais omitem a contagem enquanto faltam pá | igual |
| R4-M1-contas-no-memo-das-situacoes | VERMELHO | `33 · pass 0 · fail 1` | F14: a página pede cada rota e cada URL de agregado UMA vez por carga, sem perder as conta | igual |
| R4-M2-view-chama-resumo | VERMELHO | `33 · pass 0 · fail 1` | F14: a página pede cada rota e cada URL de agregado UMA vez por carga, sem perder as conta | igual |
| R5-M1-botao-tambem-depositado | VERMELHO | `33 · pass 2 · fail 1` | R5(b): cheque já depositado (warning cheque_still_depositable) — sem botão de cancelar e c | igual |
| R5-M2-gate-unlink-title | VERMELHO | `33 · pass 2 · fail 1` | R5(c): ator que desvincula mas não tem cheques:update não vê 'Cancelar o cheque' e o aviso | igual |
| R5-M3-post-com-corpo | VERMELHO | `33 · pass 2 · fail 1` | R5(a): com cheques:update, depois de desvincular um cheque registrado a baixa oferece 'Can | igual |
| R6-M1-paid-antes-da-razao | VERMELHO | `33 · pass 1 · fail 1` | R6: 422 overpayment com o título já pago em parte → razão da recusa + 'O título mudou…', f | igual |
| R9-M1-baixa-gate-titles-update | VERMELHO | `33 · pass 1 · fail 1` | R9: 'Registrar recebimento' segue financial_entries:create (não financial_titles:update) | igual |
| R10-M1-volta-ao-vazio | VERMELHO | `33 · pass 0 · fail 1` | R10: aba 'Contas e extrato' sem financial_accounts:read mostra acesso não permitido, nunca | igual |
| R11-M1-label-Reconciled | VERMELHO | `8 · pass 2 · fail 1` | F17: nenhum termo técnico (tenant, role, reconciled, rota de API) nos textos de tela do Fi | igual |
| R11-M2-adapter-open-not-reconciled | VERMELHO | `8 · pass 2 · fail 1` | F17: nenhum termo técnico (tenant, role, reconciled, rota de API) nos textos de tela do Fi | igual |
| R12-M1-soma-x-igual-x-mais | VERMELHO | `4 · pass 2 · fail 2` | F8: o módulo financeiro tem EXATAMENTE as 8 ocorrências do inventário congelado (nenhuma n | igual |
| R7-M1-status-sem-regenerar | VERMELHO | `rc=1` | gerador rodado sobre a fonte mutada: `pendencias-indice.md` muda `1 file changed, 6 insertions(+), 6 deletions(-)` contra o versionado | igual |
| R13-M1-tira-ratificacao | VERMELHO | `rc=1` | `^## Ratificação do orquestrador` cai de 2 para 1 no plano versionado | igual |

Notas: R4-M2 é a mesma forma da F14 do ciclo 1 (a view chama `useFinancialSummary()` de novo), como a E2 a enumera; conta nas duas listas. R4-M1 põe as 4 consultas de situação dentro do memo das contas (a forma do objeto do ciclo 1). Variantes a mais executadas nas fatias 6 e 7 (R5-M3b, rota sem `/cancel`; R9-M1b, gate de "Conciliar") ficaram vermelhas lá e não entram na contagem.

### Fecho

- `git diff --check` → vazio. `git status --porcelain --ignored` (fora `node_modules`) → vazio depois da limpeza.
- **Limpeza (§C5):** contêineres `dev12b-f8-pg`, `dev12b-f8-pg2` e `dev12b-f9-pg` removidos (`docker ps -a | grep -c dev12b` → 0); removidos `dist/`, `frontend/dist/`, `frontend/tsconfig.tsbuildinfo` e os 13 diretórios de anexos em `storage/checklist-attachments/` criados pelo `npm test` desta sessão (11:03–11:20 BRT); o `.gitkeep` rastreado ficou. `node_modules` próprios e o worktree preservados. Disco: 11 GB livres.
- PR #469: `gh pr view 469 --json mergeable` → `MERGEABLE` (head `bb4f0680`); check-runs de `bb4f0680` em andamento na medição (`frontend`, `flutter`, `authority-portal` concluídos com sucesso; `backend`, `backend-postgres`, `owner-portal` em curso). O commit desta seção abre uma rodada nova de CI; a junta julga o SHA com check-runs concluídos (§C7.1-bis).
- `origin/main` andou para `972dc0ab` (#471, só `Kpis/**`); o ramo segue mergeável e não toca `Kpis/**`.

### Falta

- Nada das 9 fatias da E2.6. **Pronto para a junta do ciclo 2**, sobre o head de saída deste commit, depois de os check-runs dele concluírem.

### Próximo comando exato

`gh api repos/{owner}/{repo}/commits/$(git -C C:/Users/AMP/w-san312b rev-parse HEAD)/check-runs --jq '.check_runs[] | "\(.name) \(.status) \(.conclusion)"'`

## RETOMADA 10

- **Fatia:** 1 da E3.5 — R-E3-1 + R-E3-6(a).
- **Executor e modelo:** `dev-san312b-ciclo3-claude` · subagente Claude · Claude Opus · nível menor declarado (§C7.6). **Substituição declarada:** o Codex (`dev-san312b-ciclo3-sol`, executor da E3) está sem a janela de 5 h até cerca de 05:31Z; pela E3.5 e pela regra do dono, o Claude cobre a fatia.
- **Head de partida:** `d31f466650a8229be9a9d689640d6867c1156c78` (= `ls-remote` do ramo; `git status --porcelain` vazio; `origin/main` = `f0769739` = merge-base, sem merge a fazer). Início 03:17Z, fim 03:22Z (hora de `date -u`).

### Feito — comando → saída

- Vermelho-controle (R-E3-1(b)), no head de partida: `tres-vias.sh e77a5ac1 agent-orchestration/controle/pendencias.md` (A = `git diff c9a2d036 fc5ead6c` `^+`, B = idem `^-`, sem CR, `sort -u`; H = blob da ref) → `A=15 B=2 comm-23=4 comm-12=2`: as 2 linhas de status FECHADA, a linha "critério medido no fechamento" e a linha "fechamento:" perdidas; as 2 linhas de status ABERTA de volta. Igual ao parecer (4/2).
- R-E3-1(a): as seções `P-SAN3-20-RESUMO-CHEQUE-VINCULADO` e `P-SAN3-12-REFERENCIA-FINANCEIRO-3OPCOES-CHEQUE` substituídas **inteiras** pelas de `git show fc5ead6c:agent-orchestration/controle/pendencias.md` (script que confere cabeçalho igual, árvore == HEAD antes de editar e grava CRLF como a árvore) → `git diff`: `4 insertions(+), 2 deletions(-)`, só as 4/2 linhas acima; as outras linhas das duas seções eram iguais nos dois lados.
- R-E3-1(b), no índice do git (o conteúdo deste commit): `tres-vias.sh : pendencias.md` → `comm-23=0 comm-12=0`. Lista nominal de descontos em `pendencias.md`: nenhuma.
- R-E3-1(c): `python -I agent-orchestration/controle/gerar-indice-pendencias.py` → `670 cabecalhos / 659 IDs | {'FECHADA': 160, 'ABERTA': 506, 'SEM-STATUS': 4}` (no objeto: 158 / 508); as duas linhas saem de "ABERTAS · balde B" (213 → 211) e entram em "FECHADAS" (158 → 160). Gerador rodado de novo sobre o conteúdo do commit → `git diff` do índice = 0 linha.
- R-E3-1(d): `grep -c "^## P-"` → `e77a5ac1` = 670, commit = 670.
- R-E3-1(e): `tres-vias.sh` no commit → `B-SAN3-12-plano.md`: `A=0 B=0 comm-23=0 comm-12=0` (o ramo não tocou o plano versionado entre `c9a2d036` e `fc5ead6c`; vazio por vacuidade). `B-SAN3-12b-dev.md`: `A=216 B=0 comm-23=2 comm-12=0` — **o esperado "vazio" do parecer não se confirma**; as 2 linhas são a D-8 antiga ("D-8 — Node 22 indisponível nesta máquina …" e a continuação "com a CI."), **reescrita de propósito no ciclo 2 pela E2/R13(c)** no commit `bb4f0680` (`git log -S"Node 22 indisponível nesta máquina" fc5ead6c..e77a5ac1` → `bb4f0680`). Já é 2 também em `e77a5ac1`. Lista nominal de descontos, com o commit: essas 2 linhas, `bb4f0680`. Fora delas, vazio.
- R-E3-6(a): linha nova antes da D-6: `- **(SUPERADA no ciclo 2 pela E2/R5: a tela oferece "Cancelar o cheque" após o desvínculo; o texto abaixo descreve o objeto do ciclo 1.)**`. A linha da D-6 não foi alterada (por isso a propriedade (e) do relatório continua sem perda).
- `npm --prefix frontend run check` (Node v20.19.5) → rc 0. `git diff --cached --check` → vazio.

### Mutações

- **M-E3-1** — em `pendencias.md`, a linha de status de `P-SAN3-12-REFERENCIA-FINANCEIRO-3OPCOES-CHEQUE` volta a `- **status:** ABERTA · **dono:** \`B-SAN3-12b\` · **bloqueia:** não.` (âncora única) → `comm -23` = **1** (a linha FECHADA perdida) e o gerador muda o índice (`1 file changed, 6 insertions(+), 6 deletions(-)`; `FECHADA 159 · ABERTA 507`) → **VERMELHO**. Restauro: `sha256` de `pendencias.md` `8db2d085…10e3` e do índice `72d4641c…f3b4` iguais antes e depois.

### Falta

- Fatias 2, 3 e 4 da E3.5 (a 2 a seguir, nesta mesma sessão).
- A seção `## Ciclo 3 (dev-san312b-ciclo3-sol)` do relatório é da fatia 4 (R-E3-6(e)).

### Próximo comando exato

`cd /c/Users/AMP/w-san312b && git fetch origin && git status --porcelain && git rev-parse HEAD`

## RETOMADA 11

- **Fatia:** 2 da E3.5 — R-E3-2.
- **Executor e modelo:** `dev-san312b-ciclo3-claude` · subagente Claude · Claude Opus · nível menor declarado (§C7.6). Substituição declarada, a mesma da RETOMADA 10 (Codex sem a janela de 5 h até cerca de 05:31Z).
- **Head de partida:** `864598f5ad32e14e3eb6415bbac5852d2bcc169e` (fatia 1, empurrado; `git fetch` + `git status --porcelain` vazio). Início 03:22Z, fim 03:26:45Z (hora real do push, medida com `date -u`; corrigida na fatia 4: o "03:27Z" que estava aqui era estimado, não medido).
- **Arquivo tocado:** só `frontend/tests/finance-no-money-reduce.guard.test.ts` (e esta seção). Produto intocado.

### Feito — comando → saída

- Vermelho-controle (antes do código): os 2 casos novos escritos contra o `scanFinance` do objeto → `node --test --import tsx tests/finance-no-money-reduce.guard.test.ts` (de `frontend/`, Node v20.19.5) → `tests 6 · pass 5 · fail 1 · skipped 0`; cai `F8/E3: o detector acusa .reduce( com qualquer receptor…` (o scanner antigo não vê `f(x).reduce(`, `(a ?? []).reduce(`, `a[0].reduce(` nem a cadeia quebrada em linhas). O caso da contagem passa já no objeto (o produto tem 6 tokens e 0 nos diretórios do 12b).
- R-E3-2(a): `scanFinance` procura o TOKEN `REDUCE_TOKEN = /\.\s*reduce\s*(?:<[^<>()]*>\s*)?\(/g` e registra uma chave para cada um; o receptor (`receiverStart`) anda para trás sobre identificadores, `.`/`?.`, chamadas e índices balanceados e um parêntese de agrupamento, com espaço e quebra de linha entre os elos, e para em palavra-chave (`return (x)` → `(x)`) e em `...spread`. Chave = `arquivo::expressão-sem-espaços`, como antes. As 8 chaves do inventário saem **idênticas** (impressas pelo `scanFinance()` do head: as mesmas 8 strings de `FROZEN_INVENTORY`; o caso F8 do inventário continua verde).
- R-E3-2(b): `reduceTokens()` conta o token no código sem comentários, sem olhar o receptor; caso novo `F8/E3: todo token .reduce( … — 6 no módulo, 0 em accounts/, entries/ e pages/` (`FROZEN_REDUCE_TOKENS = 6`; mensagem do F8 "o dinheiro vem do servidor").
- R-E3-2(c): controle positivo novo com 7 formas em diretório temporário — `items.filter((e) => e.ok).reduce(`, `return (rows ?? []).reduce(`, `Object.values(m).reduce(`, `(list ?? []).reduce(`, `arr[0].reduce(`, `items?.reduce(`, `items\n  .filter(Boolean)\n  .reduce<number>(` — e um `.reduce(` comentado que não conta; `scanFinance` nas duas réguas devolve as 7 chaves esperadas e `reduceTokens` conta 7 (uma chave por token, nenhuma perdida).
- Guard no head: Node v20.19.5 → `tests 6 · pass 6 · fail 0 · skipped 0`; Node 22 por caminho absoluto (`C:/Users/AMP/AppData/Local/nvm/v22.14.0/node.exe`) → `tests 6 · pass 6 · fail 0 · skipped 0`. Meta da E3: +2 casos (4 → 6).
- R-E3-2(d): `git grep -n -E "reduce\(|\+= *[a-zA-Z.]*amount" -- frontend/src/modules/finance` → **8** = inventário. `npm --prefix frontend run check` → rc 0. `git diff --check` → vazio.
- **Elaboração do dev, declarada:** o token aceita argumento de tipo antes do `(` (`.reduce<number>(`), que é a mesma chamada e que a regex `\.reduce\(` da letra da E3 não veria; o produto tem 0 ocorrências dessa forma, logo a contagem 6/0 não muda. **Resíduo declarado (fora do token da E3, não coberto):** `.reduceRight(`, `["reduce"](` e `.reduce.call(`; o andar para trás conta parênteses sem olhar strings (um `")"` dentro de string na cadeia muda a chave, não a contagem). Medido: 0 ocorrência das três formas no módulo (`git grep -n -E 'reduceRight|\["reduce"\]|\.reduce\.call' -- frontend/src/modules/finance` → 0).

### Mutações (roteiro `mutar.py` no scratchpad; cada uma acrescenta UMA linha ao fim do arquivo, roda o guard e restaura os bytes com sha256 conferido)

| # | Arquivo | Linha injetada | Guard do head | Guard do objeto `e77a5ac1` | Restauro |
|---|---|---|---|---|---|
| M-E3-2a | `entries/useFinanceActions.ts` | `items.filter(f).reduce((s, e) => s + e.amount, 0)` | VERMELHO `6 · pass 3 · fail 3` (inventário, diretórios do 12b, contagem) | verde `4 · pass 4` | igual |
| M-E3-2b | `pages/views/FinanceiroViewA.tsx` | `Object.values(m).reduce(…)` | VERMELHO `6 · pass 3 · fail 3` | verde `4 · pass 4` | igual |
| M-E3-2c | `pages/views/FinanceiroViewA.tsx` | `(list ?? []).reduce(…)` | VERMELHO `6 · pass 3 · fail 3` | verde `4 · pass 4` | igual |
| M-E3-2d | `pages/views/FinanceiroViewA.tsx` | `arr[0].reduce(…)` | VERMELHO `6 · pass 3 · fail 3` | verde `4 · pass 4` | igual |
| M-E3-2e | `accounts/useFinancialAccounts.ts` | `items?.reduce(…)` | VERMELHO `6 · pass 3 · fail 3` | (não medido: a forma `?.` já era vista) | igual |
| M-E3-2f | o próprio guard | entrada falsa `entries/falso.ts::x.reduce(…)` no `FROZEN_INVENTORY` | VERMELHO `6 · pass 4 · fail 2` (entrada morta; inventário não vazio nos diretórios do 12b) | — | igual |

O guard do objeto rodou como cópia temporária em `frontend/tests/zz-f8-objeto-e77a5ac1.tmp.test.ts` (`git show e77a5ac1:…`), apagada no fim; `git status --porcelain` depois da rodada → só o guard alterado.

### Falta

- Fatias 3 e 4 da E3.5 (não são deste disparo).

### Próximo comando exato

`cd /c/Users/AMP/w-san312b && git fetch origin && git status --porcelain && git rev-parse HEAD`

## RETOMADA 12

- **Fatia:** 3 da E3.5 — R-E3-3 + R-E3-4 + R-E3-5 + R-E3-6(b).
- **Executor e modelo:** `dev-san312b-ciclo3-claude` · subagente Claude · Claude Opus · nível menor declarado (§C7.6). Substituição declarada, a mesma das RETOMADAS 10 e 11 (Codex sem a janela de 5 h até cerca de 05:31Z). Tela: skills `ts-frontend-full` e `ui-ux-pro-max` do repositório carregadas; tela-modelo = a própria opção A (`FinanceiroViewA.tsx`) e a biblioteca (`.pat-kpi-row--4/--5`, `.dense-table`); nenhum componente, token ou modificador novo além das regras nomeadas na E3.1.
- **Head de partida:** `19abdf5576e585e3390387c57b4aab021fb5361f` (fatia 2, empurrado; `git fetch` + `git status --porcelain` vazio; `origin/main` = `f0769739` = merge-base). Início 03:28:16Z; seção gravada às 03:34:38Z (`date -u`, antes do commit; a hora real do push vai na RETOMADA 13).
- **Arquivos tocados (todos no PERMITIDO da E3.1):** `frontend/src/styles/app.css` (+8: as 3 regras `.pat-kpi-row--6` com a `@media (max-width: 1340px)` e as 3 regras espelho `.pat-ab-*`, com 1 linha de comentário por grupo), `FinanceiroViewA.tsx` (só l.212 e l.504), `COMPONENT_LIBRARY.md` (+2 linhas de registro), `frontend/tests/finance-contas-extrato.smoke.test.tsx` (TECH + 5 casos). `git diff --name-only e77a5ac1 19abdf55 -- frontend/src COMPONENT_LIBRARY.md frontend/tests/finance-contas-extrato.smoke.test.tsx` → vazio: o ponto de partida tem o produto do objeto.

### Feito — comando → saída

- Vermelho-controle (antes do código; produto = o do objeto `e77a5ac1`, TECH antigo): `node --test --import tsx tests/finance-contas-extrato.smoke.test.tsx` (de `frontend/`, Node v20.19.5) → `tests 13 · pass 9 · fail 4 · skipped 0`; caem os 4 casos de critério: `F17/R-E3-5` ("palavra única 'Scope' num rótulo"), `R-E3-3` CSS ("grade de 6 da biblioteca"), `R-E3-3` SSR ("classe da variante de 6 (loading=false)"), `R-E3-4` CSS (`.pat-ab-table th.dense-col-right { text-align: right }`). O 5º caso (`R-E3-4` SSR: `th`/`td` de VALOR e SALDO EM ABERTO com `dense-col-right dense-col-tabular`) já passa no objeto, como a E3 diz (a classe já chega ao DOM; faltava a regra no skin): é trava de regressão, não critério novo.
- R-E3-3(a): `app.css`, ao lado de `--4/--5`: `.pat-kpi-row--6 { grid-template-columns: repeat(6, minmax(0, 1fr)); }`, `.pat-kpi-row--6 .pat-kpi__value { font-size: 18px; letter-spacing: -0.5px; line-height: 1.15; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }`, `@media (max-width: 1340px) { .pat-kpi-row--6 .pat-kpi__value { font-size: 15.5px; letter-spacing: -0.4px; } }`. Nenhuma outra regra `.pat-kpi*` mudou (`git diff -- frontend/src/styles/app.css` → só linhas `+`).
- R-E3-3(b): view l.212 → `className="pat-kpi-row pat-kpi-row--6"`, sem `style`; o esqueleto (`aria-busy`) é o mesmo `div`. `git grep -n "repeat(6" -- frontend/src/modules/finance` → **0**.
- R-E3-3(c), sonda no navegador (roteiro do planejador `plan12b-c2rep/kpi/probe.{html,mjs}`, **sem CSS de override**: cada lado com o seu CSS real — `obj` = `styles/` de `e77a5ac1` + grade inline; `head` = `styles/` desta fatia + `class="pat-kpi-row pat-kpi-row--6"` sem `style`; Chromium do `ms-playwright` pelo `playwright` do `w-san312b`; script `scratchpad/f3sonda/probe-f3.mjs`, saída `probe-f3-out.txt`, capturas `cap-f3-head-{1280,1366,1440}.png`). Sobra = borda interna direita do cartão − fim do texto; `cabe` = `scrollWidth <= clientWidth` e sobra ≥ 0:

  | Largura | Objeto `e77a5ac1` (27 px) — sobra nos 5 valores em R$ | Head (fatia 3) — fs · sobra nos 5 valores em R$ | Cabe (head) |
  |---|---|---|---|
  | 1280×720 | −39 / −39 / −27 / −27 / −27 (`scroll 175/163 > client 120`) | 15,5 px · **+35 / +35 / +42 / +42 / +42** (`scroll 120 = client 120`) | 5/5 |
  | 1366×768 | −25 / −25 / −13 / −13 / −13 (`scroll 175/163 > client 134`) | 18 px · **+33 / +33 / +41 / +41 / +41** | 5/5 |
  | 1440×900 | −12 / −12 / 0 / 0 / 0 (`scroll 175/163 > client 147`) | 18 px · **+45 / +45 / +54 / +54 / +54** | 5/5 |

  Valores: `R$ 126.958,65`, `R$ 167.692,35`, `R$ 56.999,50`, `R$ 56.330,00`, `R$ 30.520,00` (NBSP, como o `formatBRL`). Nas 3 larguras do head: 6 colunas computadas, 12 px entre cartões (nenhum encobre o vizinho), `white-space: nowrap`, `text-overflow: ellipsis`, rótulo e `hint` sem estouro (`scrollWidth <= clientWidth`). Fonte resolvida `Inter, ui-sans-serif…` (Inter não instalada: cai no fallback desta máquina, E3.6). A sonda usa a barra lateral do token (248 px) e não a de 236 px da tela real: a diferença é a favor do rigor. Números iguais aos do planejador (`probe-out.txt`, variante "E3"). A prova no app real (Vite) é da C1 (`j12b2-c1r2/zz-j12bc1r2-kpiclip.mjs`); não subi servidor de desenvolvimento (portas da base viva proibidas).
- R-E3-3(d): `pattern-css-guard.test.ts` verde (as regras novas não têm `*/`; `tests 16 · pass 16` junto do arquivo do bloco).
- R-E3-3(e) e R-E3-4: `COMPONENT_LIBRARY.md` ganhou 2 linhas no registro por bloco, logo abaixo do `KpiStatCard`: `.pat-kpi-row--6` e as colunas de dinheiro do `.pat-ab-table`.
- R-E3-4(a): `.pat-ab-table th.dense-col-right, .pat-ab-row td.dense-col-right { text-align: right; }`, `.pat-ab-table th.dense-col-tabular, .pat-ab-row td.dense-col-tabular { font-variant-numeric: tabular-nums; }`, `.pat-ab-table th.dense-col-right .dense-sort-btn { justify-content: flex-end; }` (especificidade 0,2,1 sobre `.pat-ab-table thead th` 0,1,2 e `.pat-ab-row td` 0,1,1). `DenseTable.tsx`/`DenseExpandableRow.tsx` intocados. Sonda no navegador (`scratchpad/f3sonda/table-probe.mjs`, saída `table-probe-out.txt`, 1280×720, tabela `.pat-ab-table` com as classes que o `DenseTable` emite): objeto → `th VALOR align=left nums=normal`, `td R$ 1.500,00 align=start nums=normal`; head → `th VALOR`/`SALDO EM ABERTO` e os 2 `td` `align=right nums=tabular-nums`; `DOCUMENTO` inalterado (`left`/`start`); `td` com 41 px de altura (40 + borda, ≤ 42).
- R-E3-5: `TECH` = `/\b(tenant|tenants|role|roles|reconciled|unreconcile|payment_method|client_action_id|scope|scopes|rbac|permission|permissions)\b|\/api\/|\/financial-|\/cheques\//i`; o F17 continua verde no head (0 ofensor); controle positivo novo: `label="Scope"`, `"Sem permission"` e `"Perfil sem RBAC"` acusam, `"Sem permissão"` não.
- R-E3-6(b): l.504 → `className="pat-btn"`; `git grep -n "pat-btn--secondary" -- frontend/src` → **0**.
- Testes no head (de `frontend/`): `node --test --import tsx tests/finance-contas-extrato.smoke.test.tsx tests/pattern-css-guard.test.ts` → Node v20.19.5 `tests 16 · pass 16 · fail 0 · skipped 0`; Node 22 (`C:/Users/AMP/AppData/Local/nvm/v22.14.0/node.exe`, caminho absoluto) `tests 16 · pass 16 · fail 0 · skipped 0`. A linha de arquivos da R-E3-7 (`tests/finance-*.test.ts* tests/financial-*.adapter.test.ts tests/dense-expandable-row.test.tsx tests/finance-titles.test.tsx tests/pattern-css-guard.test.ts`, Node 20) → `tests 122 · pass 122 · fail 0 · skipped 0` (a conferência contra a meta M ≥ 119 e a baseline N = 112 é da bateria da fatia 4, que mede a mesma linha no objeto). `npm --prefix frontend run check` → rc 0. `git diff --check` → vazio.

### Mutações (roteiro `scratchpad/f3sonda/mut.sh` + `mutar.py`: troca exata com âncora única, roda `finance-contas-extrato.smoke.test.tsx`, restaura os bytes e confere o sha256)

| # | Arquivo | Mutação | Resultado no head | Restauro |
|---|---|---|---|---|
| M-E3-3a | `app.css` | tira a regra `.pat-kpi-row--6 .pat-kpi__value {…18px…}` | VERMELHO `13 · pass 12 · fail 1` (cai `R-E3-3` CSS) | sha `a2521631…` igual |
| M-E3-3b | `FinanceiroViewA.tsx` | devolve `style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }}` e tira `pat-kpi-row--6` | VERMELHO `13 · pass 12 · fail 1` (cai `R-E3-3` SSR); a sonda do objeto mede esse estado: −39 a 1280 | sha `6f61f8ab…` igual |
| M-E3-4 | `app.css` | tira `.pat-ab-row td.dense-col-right` da regra de alinhamento (fica só o `th`) | VERMELHO `13 · pass 12 · fail 1` (cai `R-E3-4` CSS) | sha `a2521631…` igual |
| M-E3-5 | `entries/components/TitleDetail.tsx` | `<Field label="Categoria">` → `<Field label="Scope">` | VERMELHO `13 · pass 12 · fail 1` (cai o F17). **Vermelho-controle:** o F17 de `e77a5ac1` (cópia temporária `tests/zz-f17-objeto-e77a5ac1.tmp.test.tsx`, apagada) sob a mesma mutação → verde `8 · pass 8` | sha `b96a1cc0…` igual |

`git status --porcelain` depois das 4 → só os 4 arquivos da fatia (e este relatório).

### Falta

- Fatia 4 da E3.5: R-E3-6(c)(d)(e) + R-E3-7 (E3 verbatim no plano versionado, pendências de E3.4, índice, bateria em Node 20 e 22, as 11 + 17 mutações, a seção `## Ciclo 3`), mais a correção da hora de fim da RETOMADA 11 (o "03:27Z" foi estimado; o push real foi às 03:26:45Z).

### Próximo comando exato

`cd /c/Users/AMP/w-san312b && git fetch origin && git status --porcelain && git rev-parse HEAD`

## Ciclo 3 (dev-san312b-ciclo3-sol)

> Executor real das 4 fatias: `dev-san312b-ciclo3-claude` (subagente Claude, Claude Opus, nível menor declarado, §C7.6), no lugar do `dev-san312b-ciclo3-sol` que a E3 nomeia. Substituição DECLARADA pela E3.5 e pela regra do dono: o Codex ficou sem a janela de 5 h até cerca de 05:31Z. O cabeçalho mantém o nome que a R-E3-6(e) pede. Detalhe de cada fatia (comando → saída) nas RETOMADAS 10 a 13; abaixo, o P1 resumido, uma linha por item.

| Fatia | Commit | Item | Comando → saída | Veredito parcial |
|---|---|---|---|---|
| 1 | `864598f5` | R-E3-1(a)(b) | `tres-vias.sh` em `e77a5ac1` → `comm-23=4 comm-12=2`; no commit → `0/0` | cumprido |
| 1 | `864598f5` | R-E3-1(c)(d)(e) | gerador → índice sem diff; `^## P-` 670 = 670; plano `0/0`; relatório `comm-23=2` (a D-8 reescrita em `bb4f0680`, desconto nominal) | cumprido, com o desconto declarado |
| 1 | `864598f5` | R-E3-6(a) | linha "(SUPERADA no ciclo 2 pela E2/R5 …)" antes da D-6 | cumprido |
| 2 | `19abdf55` | R-E3-2(a)–(d) | guard Node 20 e 22 `6 · pass 6`; `git grep` F8 = 8; contagem 6/0 | cumprido |
| 3 | `fccd77b0` | R-E3-3 | `.pat-kpi-row--6` + `@media 1340`; view sem grade inline (`repeat(6` = 0); sonda: sobra +35/+42 (1280), +33/+41 (1366), +45/+54 (1440) | cumprido |
| 3 | `fccd77b0` | R-E3-4 | 3 regras `.pat-ab-*`; sonda: `th`/`td` de dinheiro `right` + `tabular-nums` | cumprido |
| 3 | `fccd77b0` | R-E3-5 · R-E3-6(b) | TECH com scope, scopes, rbac, permission e permissions; `pat-btn--secondary` = 0 | cumprido |
| 4 | este commit | R-E3-6(c) | E3 apensa ao plano versionado; `grep -c "Emenda E3"` = 3; trecho de `## Emenda E3` ao fim, sem CR, igual ao do parecer (l.50–137) e ao do plano externo | cumprido |
| 4 | este commit | R-E3-6(d) | 5 pendências da E3.4 abertas com dono e critério; `^## P-` 670 → 675; gerador sobre o índice do git → diff 0 | cumprido |
| 4 | este commit | R-E3-6(e) · R-E3-7 | esta seção; bateria e 29 mutações na RETOMADA 13 | cumprido |

## RETOMADA 13

- **Fatia:** 4 da E3.5 — R-E3-6(c)(d)(e) + R-E3-7.
- **Executor e modelo:** `dev-san312b-ciclo3-claude` · subagente Claude · Claude Opus · nível menor declarado (§C7.6). Substituição declarada, a mesma das RETOMADAS 10 a 12.
- **Head de partida:** `fccd77b07306311643cded56dd5135b6af839b1b` (fatia 3, empurrado às 03:36:37Z, `date -u` logo depois do `git push`; `ls-remote` = `fccd77b0`; `git fetch` + `git status --porcelain` vazio). Início 03:37:04Z; seção gravada às 03:56Z (`date -u`, antes do commit; a hora real do push desta fatia fica no relatório ao orquestrador e na próxima seção, se houver).
- **Correção de registro (pedida pelo orquestrador):** a RETOMADA 11 dizia "fim 03:27Z", hora estimada; a hora real do push da fatia 2 foi 03:26:45Z. A linha foi corrigida lá, com a nota. Daqui em diante, só hora de `date -u`.
- **Arquivos desta fatia:** `docs/revisoes/SAN3/B-SAN3-12-plano.md` (+91: separador e a E3), `agent-orchestration/controle/pendencias.md` (+25: 5 seções), `pendencias-indice.md` (gerado), este relatório. Produto e testes intocados nesta fatia.

### Feito — comando → saída

- R-E3-6(c): o trecho da E3 extraído do parecer (`R-B-SAN3-12b-ciclo2.md` l.50–137, sem CR, 88 linhas) é idêntico ao trecho do plano externo (`C:/Users/AMP/erp-pausa-2026-10-03/planos/B-SAN3-12-plano.md`, de `## Emenda E3` ao fim: `diff` vazio). Apensado ao plano versionado depois de `---`, em CRLF como a árvore → `tail` desde `## Emenda E3`, sem CR, `diff` com o trecho do parecer → vazio. `grep -c "Emenda E3"` → 3 (no objeto `e77a5ac1` → 0).
- R-E3-6(d): 5 seções novas ao fim de `pendencias.md`, com status, escopo, dono, bloqueia, origem e encerramento da E3.4: `P-SAN3-12B-R4B-TRAVA-RODADA-SEM-TESTE`, `P-SAN3-12B-KPI-PRESSED-COM-CONTA`, `P-SAN3-12B-PERFIL-SEM-ENTRIES-READ-VAZIO`, `P-SAN3-12B-PAGER-ROTULO-FILTRADO` (BAIXA, dono `B-SAN3-12c`) e `P-REGISTRO-MERGE-CONFERE-TRES-VIAS` (MÉDIA, leitura do dev declarada na própria seção: a E3.4 não fixa a severidade; dono: o bloco de ferramentas de processo). As 6 já abertas da E3.4 seguem inalteradas. `python -I agent-orchestration/controle/gerar-indice-pendencias.py` → `675 cabecalhos / 664 IDs | {'FECHADA': 160, 'ABERTA': 511, 'SEM-STATUS': 4}`; as 5 entram no índice com `aberta = sim`. `^## P-`: 670 (objeto) → 675 (+5, só as da E3.4; a R-E3-1(d) era sobre o restauro, que não criou nem matou cabeçalho).
- R-E3-1 de novo, sobre o índice do git desta fatia: `tres-vias.sh :` → `pendencias.md` `A=15 B=2 comm-23=0 comm-12=0`; `B-SAN3-12-plano.md` `A=0 B=0 0/0`; `B-SAN3-12b-dev.md` `comm-23=2 comm-12=0` (as 2 linhas da D-8 antiga, reescritas de propósito em `bb4f0680`; o mesmo desconto nominal da RETOMADA 10).

### R-E3-7 — bateria (head desta fatia; produto e testes = `fccd77b0`)

| Comando | Saída |
|---|---|
| `npm --prefix frontend run check` | rc 0 |
| linha de arquivos da R-E3-7 (de `frontend/`), Node v20.19.5 | `tests 122 · pass 122 · fail 0 · skipped 0` |
| a mesma, Node 22 (`C:/Users/AMP/AppData/Local/nvm/v22.14.0/node.exe`) | `tests 122 · pass 122 · fail 0 · skipped 0` |
| a mesma no objeto (os 2 arquivos de teste que a E3 mudou trocados pelas cópias de `e77a5ac1`, temporárias e apagadas) | `tests 115 · pass 115` |
| `npm --prefix frontend run test:smoke`, Node v20.19.5 | `tests 1482 · pass 1482 · fail 0 · skipped 0` (03:40:55Z–03:45:04Z) |
| `npm --prefix frontend run test:smoke`, Node v22.14.0 (o diretório do Node 22 na frente do `PATH`, sem `nvm use`) | `tests 1482 · pass 1482 · fail 0 · skipped 0` (03:45:12Z–03:49:09Z) |
| `npm --prefix frontend run build` | rc 0 (`built in 34.05s`) |
| raiz `npm run check` · `npm run lint` · `npm run build` | rc 0 · rc 0 · rc 0 |
| o `git grep` do F8 da R-E3-2(d), em `frontend/src/modules/finance` | 8 = inventário |
| os 2 `comm` da R-E3-1 (`pendencias.md`, índice do git) | 0 / 0 |
| gerador sobre o índice do git → `git diff -- pendencias-indice.md` | 0 linha |
| `git diff --check` e `git diff --cached --check` | vazios |
| `git diff --name-only e77a5ac1 HEAD -- src prisma scripts` (e na árvore) | 0 / 0 (CE-4: backend intocado; a régua do F18 é o job `backend` da CI no head) |

- **Contagem dos testes, declarada:** por arquivo, no head: `dense-expandable-row` 5, `finance-baixa` 9, `finance-conciliacao` 5, `finance-contas-extrato` 13, `finance-no-money-reduce.guard` 6, `finance-page-live` 33, `finance-redirects` 3, `finance-titles` 23, `financial-accounts.adapter` 6, `financial-entries.adapter` 11, `financial-summary.adapter` 5, `pattern-css-guard` 3 = **122**. Sem o `pattern-css-guard` (que não é do bloco): **119** no head e **112** no objeto — a baseline N = 112 da E3 é essa conta, e a meta **M ≥ 119** está cumprida exatamente (+2 R-E3-2, +2 R-E3-3, +2 R-E3-4, +1 R-E3-5). Um dos 2 casos da R-E3-4 (o SSR das classes no `th`/`td`) já passava no objeto, como a E3 previa: é trava de regressão. `test:smoke` 1475 → **1482** (+7), igual ao esperado.
- `git diff --name-only e77a5ac1` (índice desta fatia): `COMPONENT_LIBRARY.md`, `pendencias.md`, `pendencias-indice.md`, `B-SAN3-12-plano.md`, `B-SAN3-12b-dev.md`, `FinanceiroViewA.tsx`, `app.css`, `finance-contas-extrato.smoke.test.tsx`, `finance-no-money-reduce.guard.test.ts`, mais o parecer `R-B-SAN3-12b-ciclo2.md` e os 15 arquivos de votos do ciclo 2 (commits do orquestrador `c8d455dc` e `d31f4666`). É o diff esperado do §4 do parecer; nada fora do PERMITIDO da E3.1. A interseção com o `arquivos_medidos` da C2 é não vazia (`FinanceiroViewA.tsx`, `pendencias.md`, `pendencias-indice.md`, `B-SAN3-12-plano.md`): a C2 é revalidada pela regra (2).

### R-E3-7 — mutações, todas no head desta fatia (uma por vez, âncora única, restauro por hash)

Roteiros: `scratchpad/mutar.py` (o do ciclo 2) com `scratchpad/f4/muts.py` (5 novas + as do ciclo 2, cujas definições vêm de `scratchpad/f9/muts.py`, sem alteração) e `scratchpad/f2/mutar.py` (as 6 da R-E3-2, que acrescentam uma linha ao fim do arquivo). 03:54:20Z–03:55Z. **Resultado: 29 mutações, 29 VERMELHAS, 29 restauradas com sha256 igual; `git status --porcelain` depois → só os arquivos desta fatia.**

**As 11 novas da E3:**

| # | Teste dono (`tests · pass · fail`) | Caso que caiu | Vermelho-controle no objeto |
|---|---|---|---|
| M-E3-2a `items.filter(f).reduce(` em `entries/` | guard `6 · 3 · 3` | inventário, diretórios do 12b, contagem | guard de `e77a5ac1` verde `4 · 4` |
| M-E3-2b `Object.values(m).reduce(` na view | guard `6 · 3 · 3` | idem | verde `4 · 4` |
| M-E3-2c `(list ?? []).reduce(` na view | guard `6 · 3 · 3` | idem | verde `4 · 4` |
| M-E3-2d `arr[0].reduce(` na view | guard `6 · 3 · 3` | idem | verde `4 · 4` |
| M-E3-2e `items?.reduce(` em `accounts/` | guard `6 · 3 · 3` | idem | (forma já vista pelo guard antigo) |
| M-E3-2f entrada falsa no inventário | guard `6 · 4 · 2` | inventário, diretórios do 12b | — |
| M-E3-3a sem `.pat-kpi-row--6 .pat-kpi__value` | contas `13 · 12 · 1` | R-E3-3 CSS | `e77a5ac1`: regra ausente |
| M-E3-3b grade inline de volta, sem a classe | contas `13 · 12 · 1` | R-E3-3 SSR | sonda do objeto: −39 a 1280 |
| M-E3-4 `td.dense-col-right` fora da regra | contas `13 · 12 · 1` | R-E3-4 CSS | `e77a5ac1`: regra ausente |
| M-E3-5 `label="Scope"` em `TitleDetail.tsx` | contas `13 · 3 · 1` (padrão `F17`) | F17 | F17 de `e77a5ac1` verde `8 · 8` (RETOMADA 12) |
| M-E3-6 a E3 tirada do plano versionado | `e3check.py` rc 1 (`emenda_e3 0 trecho_igual False`) | R-E3-6(c) | `e77a5ac1`: `grep -c "Emenda E3"` = 0 |

**As do ciclo 2 cujo teste dono lê arquivo que a E3 tocou (re-executadas):**

| # | Teste dono | Caso que caiu |
|---|---|---|
| R1-M1-chip-so-alvo | live `33 · 0 · 1` (padrão) | R1: filtro de conta convive com o alvo |
| R1-M2-a-conciliar-herda-conta | live `33 · 0 · 1` | R1: indicador da organização limpa a conta |
| R2-M1-sem-display-flex | live `33 · 0 · 1` | R2: Conciliação por conta com flex |
| R3-M1-aba-length | live `33 · 1 · 2` | R3(b-c), R3(d-e-f) |
| R3-M2-loadMore-sem-offset | live `33 · 1 · 2` | R3(a), R3(d-e-f) |
| R3-M3-TablePager-removido | live `33 · 2 · 1` | R3(d-e-f) |
| R3-M4-vencem-hoje-incompleta | live `33 · 1 · 2` | R3(b-c), R3(d-e-f) |
| R10-M1-volta-ao-vazio | live `33 · 0 · 1` | R10 |
| R11-M1-label-Reconciled | contas `13 · 3 · 1` (padrão `F17`) | F17 |
| R11-M2-adapter-open-not-reconciled | contas `13 · 3 · 1` | F17 |
| F11 | live `33 · 0 · 1` | F11 |
| F12 | live `33 · 0 · 1` | F12 |
| F16 | live `33 · 0 · 1` | F16 desatualizado |
| F17 | contas `13 · 11 · 2` | F19, F17 |
| F19 | contas `13 · 12 · 1` | F19 |
| R12-M1-soma-x-igual-x-mais (F8/R12) | guard `6 · 4 · 2` | F8 inventário, diretórios do 12b |
| F8 (ratificação 14:40Z, mutação 1) | guard `6 · 3 · 3` | F8 inventário, diretórios do 12b, contagem |
| F8b (ratificação 14:40Z, mutação 2) | guard `6 · 4 · 2` | F8 inventário, diretórios do 12b |

- **Contagem, declarada:** a E3 enumera "R1 ×2, R2, R3 ×4, R10, R11 ×2, F11, F12, F16, F17, F19, F8/R12 ×1 e as 2 da ratificação — 17", mas a soma dessa lista é **18** (10 + 5 + 1 + 2). Executei as 18: a R12-M1 é a "F8/R12 ×1" e as 2 da ratificação de 14:40Z são as duas mutações que ela nomeia (`items.reduce` numa view = F8; entrada falsa no inventário = F8b). Total desta fatia: 11 + 18 = **29**.
- As outras 24 do ciclo 2 (BaixaForm, hooks, gates, registro) não se re-executam: o diff da E3 (lista acima) não toca nenhum dos arquivos delas.

### Limpeza (§C5)

- Removidos `dist/`, `frontend/dist/` e `frontend/tsconfig.tsbuildinfo` (saídas dos builds; ignorados pelo git). As cópias temporárias de teste do objeto (`tests/zz-*.tmp.test.ts*`) foram apagadas no fim de cada uso. Sem Docker, sem banco. `node_modules` próprios e o worktree preservados. Disco: 13 GB livres.

### Falta

- Nada das 4 fatias da E3.5. **Pronto para a junta do ciclo 3**, sobre o head de saída deste commit **mais** o commit do orquestrador com o parecer (§4 do parecer), depois de os check-runs desse SHA concluírem (§C7.1-bis). A C2 é revalidada pela regra (2); a C1 e a C3 são refeitas.

### Próximo comando exato

`gh api repos/{owner}/{repo}/commits/$(git -C C:/Users/AMP/w-san312b rev-parse HEAD)/check-runs --jq '.check_runs[] | "\(.name) \(.status) \(.conclusion)"'`
