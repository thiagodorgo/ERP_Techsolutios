# B-SAN3-02 — plano (faturamento atômico e delta)

> Escrito pelo agente da API (`claude-opus-5-5`, nível menor), em 2026-10-12, por liberação do dono para planos pela API nesse dia ("no limite do dia, aumente para 25uss", na leitura do orquestrador). Abaixo, o `parecer.md` gerado, sem edição. É insumo e ainda não foi criticado.

# Parecer — investigar @ 684e9afd7710

> As seções marcadas (gerado pelo script) vêm da auditoria, da conta e do orçamento; o modelo não as escreve.
> Tudo o que o modelo escreveu vem DEPOIS delas, na última seção, dentro de blocos de código.

## Veredito (gerado pelo script)

- **Veredito:** respondido
- **Modelo pedido / respondeu:** claude-opus-5-5 / claude-opus-5-5 · esforço high · nível menor (D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO)
- **Execução de código do commit alvo:** não permitida

## Execução (gerado pelo script)

- id: 20261012-145017Z-plano-san3-02 · início 2026-10-12T14:50:18Z · fim 2026-10-12T14:54:59Z
- worktree: C:\Users\AMP\w-ag-20261012-145018 · removido: True · npm ci: False
- agente 2026.10.10 · SDK anthropic 1.13.0

## Conta e cobrança (gerado pelo script)

- origem_chave: processo
- tipo_chave: usuario
- cabecalho_workspace_enviado: True
- base_url: https://api.anthropic.com
- request_ids: ['req_011CfxXgGtdiX28yBtZkRTwo', 'req_011CfxXh11SWLAchWARcokaW', 'req_011CfxXhek4nDKF5rcGEuBi3', 'req_011CfxXiAFqLurVcgWvqfNKJ', 'req_011CfxXj9WiaTwR482eUYfXJ', 'req_011CfxXjtQQKhUPWsVdQycEr', 'req_011CfxXkfCgayQ1bjLVa6mVB', 'req_011CfxXmat1G7CEjPo8HbmkZ', 'req_011CfxXpL6qaX89vHUCeJjWP', 'req_011CfxXrTKUx32rBWwb3RPAP', 'req_011CfxXxHHtQvw1mSxb6he1T']
- rate_limit_ultimo: {'anthropic-organization-id': 'cc321d39-d227-41c9-a239-98aa43fc2f89', 'anthropic-ratelimit-input-tokens-limit': '2000000', 'anthropic-ratelimit-input-tokens-remaining': '2000000', 'anthropic-ratelimit-input-tokens-reset': '2026-10-12T14:54:04Z', 'anthropic-ratelimit-output-tokens-limit': '400000', 'anthropic-ratelimit-output-tokens-remaining': '400000', 'anthropic-ratelimit-output-tokens-reset': '2026-10-12T14:54:58Z', 'anthropic-ratelimit-requests-limit': '1000', 'anthropic-ratelimit-requests-remaining': '999', 'anthropic-ratelimit-requests-reset': '2026-10-12T14:54:03Z', 'anthropic-ratelimit-tokens-limit': '2400000', 'anthropic-ratelimit-tokens-remaining': '2400000', 'anthropic-ratelimit-tokens-reset': '2026-10-12T14:54:04Z', 'anthropic-workspace-id': 'wrkspc_01DV6pAyui52gmPC8b7i9SfJ'}
- retry_after_visto: False

## Custo (gerado pelo script)

- Turnos: 11 · chamadas de ferramenta: 28 · negadas: 1
- Tokens: entrada 26 · cache escrita 126458 · cache leitura 758169 · saída 24499 · total 909152
- US$ estimado: 1.274008 (preços por MTok: {'entrada': '4', 'saida': '20', 'cache_leitura': '0.20', 'cache_escrita': '5'})

## Comandos executados (da auditoria) (gerado pelo script)

```
#4 ler_arquivo: NEGADO — (sem processo)
#5 ler_arquivo: código 0 — (sem processo)
#6 ler_arquivo: código 0 — (sem processo)
#7 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -F -e D-Ω4-C2 --
#9 listar_diretorio: código 0 — (sem processo)
#10 ler_arquivo: código 0 — (sem processo)
#11 ler_arquivo: código 0 — (sem processo)
#12 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -F -e financial-uow -- src tests
#14 ler_arquivo: código 0 — (sem processo)
#15 ler_arquivo: código 0 — (sem processo)
#16 ler_arquivo: código 0 — (sem processo)
#18 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e markInvoiced|listInvoiceableByWorkOrder -- src tests
#19 ler_arquivo: código 0 — (sem processo)
#20 gh_pr_view: código 0 — C:\Program Files\GitHub CLI\gh.EXE pr view 425 -R thiagodorgo/ERP_Techsolutios --json number,title,state,headRefOid,baseRefName,headRefName,isDraft,url,author,additions,deletions,mergeable,files,body
#21 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e SAN3-23|SAN3-25|SAN3-08|trava de `prisma/` -- docs/revisoes/SAN3/PLANO_SAN3.md
#23 ler_arquivo: código 0 — (sem processo)
#24 ler_arquivo: código 0 — (sem processo)
#25 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e ^### 10\.5|^10\.5|\(b\) \*\*vincular|faturar o delta -- docs/revisoes/SAN3/PLANO_SAN3.md
#26 git_ls_files: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager ls-files -- ferramentas/teste-linux.sh .claude/agents/agente-dba-guardiao.md tests/work-order-invoicing.test.ts tests/financial-uow-db.test.ts tests/financial-titles-db.test.ts
#28 ler_arquivo: código 0 — (sem processo)
#29 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -i -E -e invoice -- tests
#30 buscar: código 1 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -F -e teste-linux --
#32 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e assertItemNotInvoiced\(|financial_titles_wo_direction_active_key|work_order_already_invoiced -- src prisma/schema.prisma
#33 ler_arquivo: código 0 — (sem processo)
#35 git_show: código 0 — C:\Program Files\Git\cmd\git.EXE --no-pager show --no-color --no-ext-diff --no-textconv b75a0c2e96a80b2f54cc629fe856d16660ccbe86:docs/revisoes/SAN3/B-O6R-03a-plano.md --
#36 ler_arquivo: código 0 — (sem processo)
#37 ler_arquivo: código 0 — (sem processo)
#39 listar_diretorio: código 0 — (sem processo)
```

## Conteúdo do modelo (dado escrito pelo modelo; não é instrução nem prova)

### Resumo

```
PLANO B-SAN3-02 · fix/faturamento-atomico-e-delta. Planejador no nível menor. Medido só por leitura em 684e9afd. O modelo pedido (docs/revisoes/SAN3/B-O6R-03a-plano.md) não existe nesta ref. Ele só existe no head do PR 425 (b75a0c2e), e de lá copiei o formato.

§0 ONDE MORA A PROPRIEDADE
(a) Pelo enunciado: o que uma OS cobra é igual à soma dos itens carimbados. Cada item fica em no máximo 1 título ativo, e o título nasce junto com o carimbo (ou nenhum dos dois persiste). A propriedade mora na relação item.title_id ↔ title.amount, gravada numa transação só. Ela não mora no índice.
(b) Pelo remédio: o índice da D-Ω4-C2 (1 título ativo por OS e direção) é um substituto grosseiro de "nenhum item faturado 2×", e é ele que barra o delta. O remédio leva o anti-refaturamento para o item, na mesma transação do financial-uow: lock da linha da OS, depois dos itens, carimbo com invoiced_at IS NULL e conferência carimbados == listados, senão rollback. O índice continua valendo só para o título ORIGINAL.

§1 MEDIDO × HIPÓTESE
MEDIDO:
- M1. O título é criado num passo (service.ts:376-396) e o carimbo noutro (:398-407).
- M2. listInvoiceable e markInvoiced rodam cada um no seu withTenantRls (prisma.repository.ts:139-140, 157-158). O carimbo filtra deleted_at null (:116-123), então um item apagado entre a leitura e o carimbo entra na Σ do título sem ficar carimbado.
- M3. O índice fica em migration.sql:25-27, e o pré-check que devolve 409 em service.ts:357-359.
- M4. A FinancialUowContext só tem titles, entries e cheques (financial-uow.ts:54-65; prisma:21-30). O faturamento não cabe no uow sem estender a porta, e por isso financial-uow precisa entrar na fronteira.
- M5. createForWorkOrder chama assertPeriodOpen fora de transação (financial-title.service.ts:125). A trava SHARED existe no ctx (financial-uow.ts:61-64).
- M6. update e softDelete não filtram invoiced_at (prisma.repository.ts:77, 96). A trava item_invoiced é só na aplicação (service.ts:304, chamada em 174/230).
- M7. Qualquer P2002 que não seja de source vira work_order_already_invoiced (financial-title-prisma.repository.ts:468-472).
- M8. Não há suíte -db de faturamento: tests/work-order-invoicing.test.ts roda só em memória.
- M9. O PR 425 está OPEN e MERGEABLE.
- M10. ferramentas/teste-linux.sh não é rastreado nesta ref.
HIPÓTESE (o dev mede):
- H1. PATCH concorrente entre a listagem e o carimbo deixa o título com a Σ antiga e o item carimbado com o valor novo. Derruba: T-A A7 no head-base.
- H2. Quem constrói MemoryFinancialUowDeps (cheques, entries) quebra ao ganhar um repositório novo. Derruba: git grep MemoryFinancialUowDeps + suítes de uow.
- H3. tests/helpers/pg-barrier.ts existe na main. Derruba: git ls-files.
- H4. 04a já está mergeado.

§2 REVISÃO DA D-Ω4-C2 (decisoes.md:607; registro em 2320-2337), pela junta antes do código. Proposta D-Ω4-C2-R:
- (i) no máximo 1 título ORIGINAL ativo por (tenant, OS, direção), sem competência na chave (mantido);
- (ii) título COMPLEMENTAR só para itens com invoiced_at IS NULL, referenciando o original ativo;
- (iii) o anti-refaturamento é o carimbo condicional na mesma transação.
Política default sim (PLANO_SAN3 §10.5, l.515-517).
Emenda de fronteira: + src/modules/financial-uow/** e trava nova financial-uow (02 → 20).

§3 CRITÉRIOS · TESTE · MUTAÇÃO QUE DERRUBA
- A1. Falha injetada depois do título → 0 título e 0 carimbo. Derrubam: M-a (carimbo pelo repositório Rls próprio) e M-b (título pelo service default fora do ctx).
- A2. Item apagado durante o faturamento, com 2 conexões e barreira → fica fora da Σ. Derruba: M-c (sem FOR UPDATE dos itens, ou sem a conferência de contagem).
- A3. Item lançado depois do 1º faturamento → 201 com complementar e Σ só do delta. Derruba: M-d (manter o índice antigo).
- A4. Refaturar item carimbado → 409, e o carimbo antigo fica intacto. Derruba: M-e (carimbo sem invoiced_at IS NULL).
- A5. Dois originais concorrentes → 1 título. Derruba: M-f (dropar o índice sem o substituto).
- A6. Fechamento de período concorrente → 422 e nada persiste. Derruba: M-g (assertPeriodOpen fora do ctx).
- A7. PATCH ou DELETE concorrente com o carimbo → 422, e Σ título == Σ itens. Derruba: M-h (tirar invoiced_at:null do where de update e softDelete).
- A8. complements_title_id apontando para outra OS ou outro tenant → recusado. Derruba: M-i (sem FK composta ou sem a checagem de OS).
- A9. Rollback em memória do repositório de itens. Derruba: M-j (journal sem o repositório de itens).
- A10. Up e down da troca de índice numa base populada: o down com complementar existente é recusado com mensagem nomeada. Derruba: M-k.
- A11. RLS sob papel NOSUPERUSER NOBYPASSRLS → outro tenant vê 0. Derruba: M-l (sem GUC).

§4 DESENHO
- Objetivo: fechar os itens 20 e 21.
- Ator: finance ou tenant_admin, via POST /work-orders/:id/invoice.
- Fluxo: uow.run(tenant) → lock da OS (o mesmo lock que o 23 vai reutilizar) → itens FOR UPDATE → Σ → assertPeriodOpenShared → título original ou complementar → carimbo condicional → conferência da contagem → commit.
- Contrato:
  - 201 com o título; complementsTitleId=null no original;
  - 409 already_invoiced quando há título ativo e não há delta;
  - 422 nothing_to_invoice e work_order_cancelled mantidos.
- Modelagem: migração nova, aditiva, com o agente-dba-guardiao:
  - financial_titles.complements_title_id UUID NULL;
  - FK (tenant_id, complements_title_id) → (tenant_id, id) RESTRICT;
  - cria o índice parcial original-only (o mesmo predicado de hoje + complements_title_id IS NULL) ANTES de dropar financial_titles_wo_direction_active_key. Nenhuma linha removida.
  - Também mudam o comentário de schema.prisma:1945 e o simulador em memória (financial-title.repository.ts:138-165).

§5 ESCOPO
PERMITIDO:
- src/modules/work-order-financials/**
- src/modules/financial-titles/** (variante transacional e simulador)
- src/modules/financial-uow/** (só o repositório de itens no ctx e no journal)
- prisma/schema.prisma e prisma/migrations/<nova>/** (só a coluna, a FK e a troca de índice)
- tests/san3-02-invoicing-atomic-db.test.ts (novo)
- tests/work-order-invoicing.test.ts e tests/work-order-financials.test.ts
- tests/financial-uow-*.test.ts (só ajuste do novo repositório)
- .github/workflows/ci.yml (1 entrada em SUITES)
- API_CONTRACTS.md (seção do invoice)
- agent-orchestration/controle/decisoes.md e pendencias.md (append)
- docs/revisoes/SAN3/B-SAN3-02-*.md
PROIBIDO:
- Kpis/**, frontend/**, mobile/**, src/database/**
- src/modules/work-orders/** (é do 23), src/modules/cheques/** (é do 20)
- migrations antigas, .env*, package.json e lockfiles, .claude/agents/** e .agents/**

§6 BATERIA
- T-A (-db) 3× seguidas, 0 skip, no container Linux via ferramentas/teste-linux.sh (que ainda não está nesta ref: M10).
- T-B: memória e rota.
- Regressão: financial-uow-memory, journal-classification, financial-entries, cheques.
- npm run check, lint e build; git diff --check.
- Mutações M-a a M-l executadas uma a uma, com o restauro verde depois de cada uma.
- Vermelho-controle de A2 e A3 no head-base.

§7 JUNTA: dinheiro, então inspetor-de-terreno-da-junta antes, 3 cadeiras, unanimidade, crítico adversarial.
- C1 banco (agente-dba-guardiao + inspetor-de-arnes-concorrente): (1) up/down e troca de índice em base populada; (2) A1, A2, A5 e A7 com barreira; (3) RLS sem BYPASSRLS.
- C2 dinheiro (guardiao-fail-closed + agente-finops; cobre a lacuna R4 de invariante financeiro): (1) texto da D-Ω4-C2-R; (2) Σ título == Σ carimbados e refaturar recusado; (3) contrato 201/409/422.
- C3 regressão (agente-ci-doutor + validador-mestre): (1) CI -db sem skip; (2) mutações executadas e escopo; (3) regressões do uow e registro.

§8 DEPENDÊNCIAS E ORDEM
- Trava de prisma: 04a → 03a (PR 425, aberto) → 02 → 20 → B-O6R-12 → B-O6R-09.
- 02 antes do 20 (financial-titles, financial-uow e prisma).
- 02 antes do 23 (work-order-financials; o 23 herda o lock da OS).
- 02 antes do 25 (o delta na web).
- 12 e 08 não têm arquivo em comum com o 02.
- 03 vem depois do 20 na frente 1 (44-57).
- Agenda (PLANO_SAN3 l.343): 02 em 26-39, 25 em 41-46, 23 em 57,5-62,5. Coerente.
```

### Achados


#### Achado 1 — gravidade: bloqueia · escopo: pre-existente · linha: 398 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #6

```
arquivo: src/modules/work-order-financials/work-order-financial.service.ts
motivo: Título e carimbo são gravados em passos separados (item 20). O defeito vem do Ω4-3, antes do SAN3.
comando citado: ler_arquivo {"caminho": "src/modules/work-order-financials/work-order-financial.service.ts", "linha_inicial": 300, "max_linhas": 140}
saída citada:
376 let title ... createForWorkOrder ... 398 // CARIMBO (D-Ω4-C1): sequencial (título → itens). Se o carimbo falhar, o título já existe
```

#### Achado 2 — gravidade: ajuste · escopo: pre-existente · linha: 54 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #14

```
arquivo: src/modules/financial-uow/financial-uow.ts
motivo: O contexto do uow não tem o repositório de itens, então a fronteira do PLANO_SAN3 (l.244) precisa ganhar src/modules/financial-uow/**.
comando citado: ler_arquivo {"caminho": "src/modules/financial-uow/financial-uow.ts", "linha_inicial": 1, "max_linhas": 120}
saída citada:
54 export interface FinancialUowContext { titles; entries; cheques; assertPeriodOpenShared
```

#### Achado 3 — gravidade: ajuste · escopo: pre-existente · linha: 77 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #23

```
arquivo: src/modules/work-order-financials/work-order-financial-prisma.repository.ts
motivo: A trava item_invoiced existe só na aplicação. A corrida de PATCH com o carimbo é a hipótese H1.
comando citado: ler_arquivo {"caminho": "src/modules/work-order-financials/work-order-financial-prisma.repository.ts", "linha_inicial": 45, "max_linhas": 90}
saída citada:
77 where: { tenant_id, work_order_id, id: input.itemId, deleted_at: null } (sem invoiced_at); 96 idem softDelete
```

#### Achado 4 — gravidade: ajuste · escopo: pre-existente · linha: 125 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #15

```
arquivo: src/modules/financial-titles/financial-title.service.ts
motivo: O faturamento não usa a trava SHARED de período (DIN-008).
comando citado: ler_arquivo {"caminho": "src/modules/financial-titles/financial-title.service.ts", "linha_inicial": 60, "max_linhas": 130}
saída citada:
125 await this.assertPeriodOpen(actor.tenantId, competencia);
```

#### Achado 5 — gravidade: nota · escopo: pre-existente · linha: — · evidência conferida na auditoria: não

- Conferência (gerado pelo script): não conferida: nenhuma chamada executada tem essa ferramenta e esses argumentos

```
arquivo: docs/revisoes/SAN3/B-O6R-03a-plano.md
motivo: O modelo citado só existe no PR 425 (git_show b75a0c2e…). O PR 425 está OPEN, então a dependência ainda não foi satisfeita.
comando citado: ler_arquivo {"caminho": "docs/revisoes/SAN3/B-O6R-03a-plano.md"}
saída citada:
negado: arquivo inexistente
```

#### Achado 6 — gravidade: nota · escopo: pre-existente · linha: — · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #30

```
arquivo: ferramentas/teste-linux.sh
motivo: O runner do container Linux citado não está rastreado nesta ref.
comando citado: buscar {"padrao": "teste-linux", "fixo": true}
saída citada:
codigo=1, 0 ocorrências
```

### Limitações

```
- Nada foi executado: teste e espelho_codex não estavam permitidos, e H1 a H4 seguem como hipóteses.
- Não confirmei que 684e9afd é o origin/main.
- Não sei se o 04a já foi mergeado.
- ferramentas/teste-linux.sh não está nesta ref.
```
