# B-SAN3-12 — plano v2 (tela financeira: baixa, contas e conciliação)

- **Autor:** o agente da API do Claude (Claude Opus 5.5, pela API), no lugar do Fable, que é o modelo de topo do planejador; a substituição está declarada no próprio resumo abaixo.
- **Origem:** a saída `scripts/agente-claude-api/saidas/20261013-014807Z-plano-san3-12-v2/parecer.md`, que NÃO é versionada (`scripts/agente-claude-api/.gitignore`). As referências a "chamada executada #N" apontam para a auditoria dessa saída, fora do repositório; o arquivo:linha de cada achado é o que vale aqui.
- **Base medida:** `ade03028`. **Crítica:** `B-SAN3-12-critica-v2.md` (APROVA COM AJUSTES).

## Conteúdo do modelo (dado escrito pelo modelo; não é instrução nem prova)

### Resumo

```
Plano em Opus 5.5 pela API, no lugar do Fable (modelo fixo do agente). PLANO v2 do B-SAN3-12, com as linhas medidas em ade0302. As evidências estão nos achados.

CRÍTICA, item por item:
- B1. O 422 vem do fast-fail fora da transação (entry.service.ts:417-418); o 409 só sai dentro dela (:434-436). O C2 passa a valer assim: o client_action_id nasce quando o modal abre e se repete em todo reenvio. Qualquer resposta que não seja sucesso (409, os dois 422, rede) obriga a reler GET /financial-titles/:id (title.routes:47-49) antes da mensagem. Se o paidAmount subiu, a tela diz "já registrado; confira". O reenvio fica bloqueado até a releitura voltar.
- B2. A baixa sai do menu ⋮ (TitleRowActions:106-110; adapter:22 dá partially_paid:[]). Ela vira a ação primária do detalhe da linha, com financial_entries:create, em todo status menos paid e cancelled.
- A3. A conciliação não tem CAS (repo:88-101). O §0 do plano foi corrigido. O front relê o lançamento antes do PATCH e mostra "desatualizado" se ele mudou. O CAS de verdade é pendência de bloco novo de backend.
- A4. Teste novo tests/b-san3-12-ce4-db.test.ts com a sequência do CE-4.
- A5. Neste SHA o laço está em appSidebarNav.ts:317. O v2 não cria item de menu.
- A6. O #424 (9566d55b) está no histórico e tocou App.tsx e o menu. A inversão da trava ficou registrada no B-SAN3-06a-plano.md:263.
- A7. O navigation.registry.ts sai do escopo. O package.json entra com ampliação nominal só da linha test:smoke, que é a lista que a CI roda (package.json:11, ci.yml:309).
- A8. O C3 cobre 10 códigos: title.repo 86, 109, 113, 117 e entry.repo 54, 57-63, 67, 71, 74-80, 85.
- A9. Tela-modelo: WorkOrdersPage, que já tem StatePanel, StaleDataBanner e KpiStatCard.
- A10. Quando a leitura cai no fallback, a tela mostra erro, não lista vazia.

QUEM ENTREGA CADA PARTE DA TELA:
- Cabeçalho: o título é do 12. O seletor de competência e o Exportar viram bloco novo de backend: o resumo não recebe período (types:15-18). "Fechar competência" é do 24.
- KPIs: o 12 entrega 4 — A receber, Recebido no mês (settledThisMonth.inflow), A pagar e Saldo (este leva à aba Conciliação). Despesas é bloco novo; Comissões é do 24, com o total no backend como pendência.
- Faixa "Resultado do mês": bloco novo de backend. Não há quebra por categoria, e o front não soma.
- Faixa "7 dias": os blocos clicáveis com contagem e a agenda são do 12 (GET /financial-titles?from&to). Os valores em R$ e o saldo projetado são bloco novo.
- Recebíveis e Pagáveis: do 12. "2ª via" é bloco novo.
- Conciliação: do 12 (contas, saldo por /balance, extrato, conciliar e desconciliar, nova conta). Estornar fica pendente, fora da fronteira do PLANO:268.
- Despesas: bloco novo. A lista existe, mas não há rota de aprovar ou devolver.
- Comissões: do 24.

COMPONENTES:
- Indicador clicável: estende o KpiStatCard (patterns/KpiStatCard.tsx) com a prop pressed, que vira aria-pressed. Já existe um equivalente, e o §4 item 3 proíbe criar outro.
- Linha com detalhe (nova): dense-list/DenseExpandableRow.tsx mais renderDetail no DenseTable.
- Os dois vão para o COMPONENT_LIBRARY.md. Skills: ts-frontend-full para implementar e ui-ux-pro-max para revisar.

PERMISSÕES (finance, catalog.ts:812-883):
- página: entries:read :863;
- abas de título: titles:read :860;
- baixa: entries:create :873;
- mudar situação: titles:update :879;
- conciliar: entries:update :881;
- contas: accounts:read e create :859 e :870;
- estornar: entries:update (fora do bloco);
- manager, viewer e auditor só leem.

ESTADOS §7 em cada aba: carregando, vazio, erro (o fallback não pode virar vazio), acesso não permitido e desatualizado.

TESTES (critério → mutação que deixa vermelho):
- T1 POST /pay com client_action_id → trocar por PATCH /status;
- T2 reenvio reusa o id → gerar um id novo;
- T3 422 depois do envio relê o título → tratar como erro final;
- T4 os 10 códigos em PT-BR → catch genérico;
- T5 padrão amount−paidAmount → padrão amount;
- T6 o botão aparece com entries:create sem titles:update e em título parcial → gate por titles:update;
- T7 saldo por /balance → somar no front;
- T8 erro do extrato → lista vazia;
- T9 conciliar relê antes → tirar a releitura;
- T10 o mock não fabrica sucesso → sintetizar;
- T11 KPI aria-pressed leva à aba filtrada → não filtrar;
- T12 linha ≤44px, um detalhe aberto por vez → abrir dois;
- T13 nada de reduce sobre dinheiro no front → reusar computeTitleKpis;
- T14 CE-4 -db.

ESCOPO:
- PERMITIDO: finance/pages/FinanceiroPage.tsx, finance/titles|dashboard/**, finance/accounts|entries/** (novos). App.tsx e appSidebarNav.ts ficam sem diff.
- AMPLIAÇÃO NOMINAL (CLAUDE.md:243): KpiStatCard.tsx, dense-list/**, app.css (só as 2 regras), COMPONENT_LIBRARY.md, package.json (só o test:smoke), frontend/tests/ (testes novos) e o teste -db.
- PROIBIDO: src/**, prisma/**, Kpis/**, RBAC_MATRIX.md, catalog.ts, navigation.registry.ts, finance/commissions|cheques|period-closes/**, InvoicesPage.tsx, work-orders/**, expense-management/** e .github/**.

JUNTA: completa, com unanimidade de 3 e inspetor (CLAUDE.md:684-687). As 3 cadeiras: dinheiro/contrato financeiro, coordenador-de-acessos e cognicao-visual com ui-ux-pro-max.

TAMANHO: G. A sugestão é partir em 12a (painel e baixa) e 12b (contas e conciliação).
```

### Achados


#### Achado 1 — gravidade: bloqueia · escopo: pre-existente · linha: 418 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #26

```
arquivo: src/modules/financial-entries/financial-entry.service.ts
motivo: Confirma o B1. Com o mesmo client_action_id, o reenvio pode voltar 422 para uma baixa que já foi gravada. O C2 do v2 manda reler o título antes de mostrar qualquer mensagem.
comando citado: ler_arquivo {"caminho": "src/modules/financial-entries/financial-entry.service.ts", "linha_inicial": 360, "max_linhas": 145}
saída citada:
l.417 FAST-FAIL ... já pago → 422; overpayment → 422; l.434-435 replay estoura P2002 → 409 AQUI
```

#### Achado 2 — gravidade: nota · escopo: pre-existente · linha: 163 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #36

```
arquivo: src/modules/financial-entries/financial-entry.service.ts
motivo: O extrato não filtra por título nem por client_action_id, então a prova depois do 422 é pelo paidAmount. O filtro title_id vira pendência de backend.
comando citado: ler_arquivo {"caminho": "src/modules/financial-entries/financial-entry.service.ts", "linha_inicial": 159, "max_linhas": 20}
saída citada:
accountId, direction, category, reconciled, divergenceType, from, to, limit, offset (sem title_id)
```

#### Achado 3 — gravidade: bloqueia · escopo: pre-existente · linha: 110 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #38

```
arquivo: frontend/src/modules/finance/titles/components/TitleRowActions.tsx
motivo: Confirma o B2. No v2 a baixa sai do menu ⋮ e vai para o detalhe da linha, com o gate financial_entries:create.
comando citado: ler_arquivo {"caminho": "frontend/src/modules/finance/titles/components/TitleRowActions.tsx", "linha_inicial": 95, "max_linhas": 25}
saída citada:
canUpdate = canChangeTitleStatus(permissions); if (!canUpdate || targets.length === 0) return ... null
```

#### Achado 4 — gravidade: ajuste · escopo: pre-existente · linha: 90 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #37

```
arquivo: src/modules/financial-entries/financial-entry-prisma.repository.ts
motivo: A conciliação não tem CAS. O front só estreita a janela, relendo o lançamento antes. O CAS no backend é pendência de bloco novo.
comando citado: ler_arquivo {"caminho": "src/modules/financial-entries/financial-entry-prisma.repository.ts", "linha_inicial": 84, "max_linhas": 32}
saída citada:
updateManyAndReturn where { tenant_id, id, deleted_at: null } data { reconciled, ... }
```

#### Achado 5 — gravidade: nota · escopo: pre-existente · linha: 317 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #54

```
arquivo: frontend/src/layouts/appSidebarNav.ts
motivo: A5: neste SHA o laço está na l.317. O v2 não cria item de menu.
comando citado: ler_arquivo {"caminho": "frontend/src/layouts/appSidebarNav.ts", "linha_inicial": 295, "max_linhas": 40}
saída citada:
317 for (const path of governedPaths) {
```

#### Achado 6 — gravidade: nota · escopo: pre-existente · linha: — · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #83

```
arquivo: frontend/src/App.tsx
motivo: A6: o #424 está no histórico deste SHA. A ordem da trava foi decidida no B-SAN3-06a-plano.md:263.
comando citado: git_show {"objeto": "9566d55b", "formato": "stat"}
saída citada:
(#424) ... frontend/src/App.tsx | 20 +- ; frontend/src/layouts/appSidebarNav.ts | 20 +-
```

#### Achado 7 — gravidade: ajuste · escopo: pre-existente · linha: 11 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #92

```
arquivo: frontend/package.json
motivo: O test:smoke é uma lista explícita: teste novo fora dela não roda na CI. Daí a ampliação nominal só dessa linha.
comando citado: buscar {"padrao": "test:smoke|frontend.*test|npm --prefix frontend", "caminhos": [".github/workflows/ci.yml"]}
saída citada:
ci.yml:309 run: npm --prefix frontend run test:smoke
```

#### Achado 8 — gravidade: ajuste · escopo: pre-existente · linha: 52 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #67

```
arquivo: frontend/src/components/patterns/KpiStatCard.tsx
motivo: O indicador clicável já tem equivalente, e o §4 item 3 proíbe duplicar. A saída é estender com a prop pressed, não criar componente novo.
comando citado: ler_arquivo {"caminho": "frontend/src/components/patterns/KpiStatCard.tsx"}
saída citada:
<button type="button" className="pat-kpi pat-kpi--clickable" ... aria-label=...> (sem aria-pressed)
```

#### Achado 9 — gravidade: ajuste · escopo: pre-existente · linha: 198 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #98

```
arquivo: frontend/src/modules/finance/titles/financial-titles.adapter.ts
motivo: O front já soma dinheiro no TitlesListView. As abas novas não podem reusar isso; o T13 guarda contra.
comando citado: buscar {"padrao": "export function computeTitleKpis|reduce\\(|\\+= ", "caminhos": ["frontend/src/modules/finance/titles/financial-titles.adapter.ts"]}
saída citada:
198: return items.reduce((total, title) => (predicate(title) ? total + title.amount : total), 0);
```

#### Achado 10 — gravidade: nota · escopo: pre-existente · linha: 57 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #30

```
arquivo: src/modules/financial-summary/financial-summary.types.ts
motivo: Não há despesas, comissões, resultado por categoria, totais de 7 dias nem parâmetro de competência. Essas partes da tela viram blocos novos de backend.
comando citado: ler_arquivo {"caminho": "src/modules/financial-summary/financial-summary.types.ts"}
saída citada:
FinancialSummary { receivable, payable, settledThisMonth, cash, cheques, cashFlow, recentTitles }; Input { tenantId, now }
```

#### Achado 11 — gravidade: nota · escopo: pre-existente · linha: 16 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #75

```
arquivo: src/modules/expense-management/expense-management.routes.ts
motivo: A aba Despesas não tem rota para Aprovar nem Devolver, embora o catálogo tenha expense_report:approve_finance (catalog:851). Vira bloco novo.
comando citado: ler_arquivo {"caminho": "src/modules/expense-management/expense-management.routes.ts", "linha_inicial": 14, "max_linhas": 105}
saída citada:
PERMISSIONS: reportRead, reportReadOwn, reportCreate, reportUpdate, reportSubmit, policyRead, syncWrite (sem approve/return)
```

#### Achado 12 — gravidade: nota · escopo: pre-existente · linha: 873 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #24

```
arquivo: src/modules/core-saas/permissions/catalog.ts
motivo: CE-G2: o finance tem todas as permissões de ação do 12. Nenhum papel tem entries:create sem titles:update, então o T6 usa um conjunto sintético.
comando citado: ler_arquivo {"caminho": "src/modules/core-saas/permissions/catalog.ts", "linha_inicial": 812, "max_linhas": 75}
saída citada:
859 financial_accounts:read; 863 financial_entries:read; 870 financial_accounts:create; 873 financial_entries:create; 879 financial_titles:update; 881 financial_entries:update
```

### Limitações

```
- Não executei testes nem tsc: a execução de código do commit não estava permitida.
- O código de erro invalid_amount não foi localizado; é hipótese. Para derrubar: buscar "invalid_amount" em src/modules/financial-entries.
- Não conferi se o adapter lê pagination.total, que é a base das contagens da faixa de 7 dias.
- Não verifiquei se o título tem vínculo de OS ou de origem para os botões "Ver OS" e "Ver origem".
- Os dados lidos não traziam instrução embutida.
```
