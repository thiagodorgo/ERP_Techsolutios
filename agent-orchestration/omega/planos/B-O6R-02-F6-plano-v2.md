# PLANO B-O6R-02/F6 v2 — invariantes de título + consolidação da atomicidade financeira

> **REPROVADO ANTES DE CÓDIGO:** o crítico independente classificou este plano como `PLANO NÃO ROBUSTO`.
> Preservado apenas como histórico; não implementar. O plano vigente é
> [`B-O6R-02-F6-plano-v3.md`](B-O6R-02-F6-plano-v3.md).

**Bloco:** `B-O6R-02` · **fatia:** F6 de 6 · **branch:** `feat/o6r-b02-financial-uow`
**HEAD medido pelo planejador:** `205ef40` (F1–F5 commitadas; árvore limpa antes deste plano)
**Comando:** [`B-O6R-02-financial-uow.md`](../../codex/comandos/B-O6R-02-financial-uow.md)
**Plano-base preservado:** [`B-O6R-02-plano-v1.md`](B-O6R-02-plano-v1.md)

## 0. Papel, independência e exceção de modelo

Este artefato foi produzido por **`/root/planejador_f6`**, atuando exclusivamente como
`planejador-mestre`. Ele **não implementa, não analisa/aprova o diff e não participa do porteiro**.

O frontmatter de `.agents/agents/planejador-mestre.md` fixa `model: fable`. O catálogo de modelos desta
sessão não oferece Fable; por isso foi usado o modelo herdado, como **exceção documentada por
indisponibilidade** permitida em `D-PLANEJADOR-MODELO-FABLE`. A exceção muda somente o modelo disponível;
não afrouxa a separação de papéis.

Aplica-se desde já `D-JUNTA-SEPARACAO-DE-PAPEIS-TODO-FLUXO`:

| Alçada desta entrega | Ocupante | Regra |
|---|---|---|
| Origem/achado | auditoria Ω6R / J-6R | não planeja nem implementa F6 |
| Planejamento F6 | `/root/planejador_f6` | encerra a atuação ao publicar este plano |
| Desenvolvimento | **outro agente, ainda a designar** | implementa; não vota nem faz o porteiro |
| Análise/junta | **agentes distintos do achador, planejador e desenvolvedor** | reexecutam e votam; cada cadeira é uma pessoa/agente |
| Porteiro pós-merge | **novo `porteiro-pos-merge`**, nascido só depois do merge | não participou de nenhuma alçada anterior |

Se qualquer ocupante aparecer em duas alçadas, a entrega é inválida e não segue para merge. Passes do mesmo
agente com rótulos diferentes não contam como independência.

## 1. Objetivo e fronteira da F6

Fechar o `Ω6R-DIN-004` nas duas bordas que ainda estão abertas:

1. `PATCH /api/v1/financial-titles/:id` nunca deixa `amount < paid_amount`, inclusive quando um pagamento
   está em voo.
2. `DELETE /api/v1/financial-titles/:id` nunca faz soft-delete de título com `paid_amount > 0`, inclusive
   sob concorrência; depois de um estorno total (`paid_amount = 0`) a exclusão volta a ser permitida.
3. O `CHECK (paid_amount >= 0 AND paid_amount <= amount)` já criado na F1 continua como backstop de banco e
   é provado por SQL cru (`23514`).
4. Criar a quinta suíte PostgreSQL do bloco, registrar as cinco no CI, executar G7–G9, drills D4/D5 e o lote
   N≥10; então consolidar contratos, achados, pendências e KPIs do bloco inteiro.

F6 **não refaz F1–F5**, não altera regra de competência, não cria coluna/índice/migração, não muda RBAC, não
torna `client_action_id` obrigatório e não libera produção. O veredito `REPROVADO PARA PRODUÇÃO` da J-6R
permanece.

## 2. Ator e autorização

- Ator HTTP: usuário autenticado no tenant ativo, com `financial_titles:update`; o backend continua sendo a
  autoridade.
- `tenant_id` vem exclusivamente das claims/JWT. Campo homônimo no body é ignorado; `X-Tenant-Id` apenas
  resolve a organização ativa conforme o contrato existente.
- Título inexistente, deletado ou de outra organização continua retornando **404 `title_not_found`**, nunca
  403 nem um motivo que confirme pagamento.
- Papéis sem `financial_titles:update` continuam em **403** pelo middleware existente. Nenhuma permissão nova.
- DTO público continua em allowlist, sem `tenant_id`, token, path, bucket, storage key, base64 ou binário.

## 3. Fluxo origem → destino

### 3.1 PATCH de `amount`

**Origem medida no HEAD `205ef40`:** o serviço lê o título e chama `repository.update`; o Prisma executa
`updateManyAndReturn` por `(tenant_id,id,deleted_at IS NULL)` sem predicado sobre `paid_amount`. Um pagamento
concorrente pode mudar `paid_amount` entre a leitura e o update.

**Destino:** o repositório recebe uma mutação guardada. Quando `amount` estiver presente, o próprio `UPDATE`
inclui `paid_amount <= novo_amount`. Se um pagamento possuir o row lock, o PATCH espera e o PostgreSQL
reavalia o predicado contra a tupla commitada. Zero linhas é classificado **dentro da mesma transação**, por
leitura estável `FOR UPDATE`, em:

- inexistente/cross-tenant/deletado → 404 `title_not_found`;
- `novo_amount < paid_amount` → 422 `amount_below_paid`;
- qualquer outro zero inesperado → fail-closed, sem traduzir para sucesso.

O serviço pode manter um fast-fail sobre a leitura inicial para ergonomia, mas ele **não é a garantia**. A
garantia é o predicado no `UPDATE`; D4 deve provar isso.

### 3.2 DELETE lógico

**Origem medida:** `softDelete` casa qualquer título ativo, independentemente de pagamento.

**Destino:** o soft-delete vira CAS com `paid_amount = 0` no mesmo `UPDATE` que grava `deleted_at`. Zero linhas
é classificado dentro da transação e sob `FOR UPDATE`:

- inexistente/cross-tenant/já deletado → 404 `title_not_found`;
- `paid_amount > 0` → 422 `title_has_payments`;
- qualquer outro zero inesperado → fail-closed.

Interleavings aceitos:

- pagamento vence primeiro → DELETE espera, reavalia e termina 422;
- DELETE vence primeiro → pagamento não encontra título ativo e sua UoW faz rollback, sem lançamento órfão;
- estorno total vence primeiro → DELETE reavalia `paid_amount = 0` e pode concluir.

### 3.3 Ordem de locks

Preservar a ordem já estabelecida: **advisory lock compartilhado da competência antes de row lock**. A F6
reutiliza `assertPeriodOpenSharedInTx`; não cria outra expressão de `pg_advisory` e não duplica a lista de
status bloqueantes.

## 4. Contrato REST — delta exato

Rotas e payloads permanecem os mesmos:

| Método/rota | Entrada relevante | Sucesso | Novo erro |
|---|---|---|---|
| `PATCH /api/v1/financial-titles/:id` | `{ "amount": number }` | `200 { data: FinancialTitleDto }` | `422`, envelope existente, `reason: "amount_below_paid"` |
| `DELETE /api/v1/financial-titles/:id` | sem body relevante | `200 { data: FinancialTitleDto }` com exclusão lógica | `422`, envelope existente, `reason: "title_has_payments"` |

Semântica dos erros:

- `amount_below_paid`: o valor nominal proposto é menor que o total já liquidado; nada muda.
- `title_has_payments`: o título possui liquidação parcial ou total; primeiro é necessário estornar pelos
  fluxos explícitos; nada é apagado.

Precedências preservadas: auth/RBAC antes do serviço; 404 cross-tenant sem vazamento; `period_closed` mantém
a precedência atual do chokepoint; erro de validação do payload continua 400/422 conforme validadores atuais.
Não nasce 409 novo nesta fatia.

## 5. Modelagem e persistência

F6 não altera o modelo. O estado já entregue na F1 é:

- `financial_titles.amount` e `paid_amount`: `Decimal(12,2)` no Prisma/PostgreSQL;
- `tenant_id` UUID, índices/FKs tenant-first e RLS existente preservados;
- delete lógico por `deleted_at`; hard-delete continua proibido;
- migration aditiva existente: `prisma/migrations/20260869000000_add_financial_invariants/migration.sql`;
- constraint `financial_titles_paid_amount_check` com `0 <= paid_amount <= amount`, criada `NOT VALID` e
  validada condicionalmente; na base medida pela F1, ponta A (`convalidated=true`, zero legado violador);
- índice parcial de estorno permanece intocado.

Não editar `prisma/schema.prisma` nem a migration na F6. D5 manipula somente **banco descartável de teste** e
o destrói ao fim; nunca derruba constraint na base viva.

## 6. Desenho de porta/repositório

O desenvolvedor deve criar resultado discriminado para as duas CAS, em vez de inferir erro de uma leitura
stale no serviço. Nomes podem seguir o idioma do módulo, mas o contrato semântico é obrigatório:

- update guardado → `updated | not_found | amount_below_paid`;
- soft-delete guardado → `deleted | not_found | title_has_payments`.

Implementar paridade nos dois adapters:

- **Prisma:** predicado no `UPDATE`, classificação estável dentro da mesma `withTenantRls`/transação;
- **InMemory:** condição e escrita síncronas sobre a linha atual, com o mesmo resultado discriminado. O adapter
  de memória mantém testes de contrato, mas não conta como prova de concorrência.

As fábricas de erro ficam no módulo de títulos, com HTTP 422 e `FINANCIAL_TITLE_UNPROCESSABLE`; mensagem sem
PII/tenant. Não traduzir `23514` do caminho de produção em sucesso: o CHECK é backstop e erro inesperado deve
falhar fechado.

## 7. Arquivos exatos

### 7.1 Permitidos ao desenvolvedor F6 — código/teste

- `src/modules/financial-titles/financial-title.types.ts`
- `src/modules/financial-titles/financial-title.repository.ts`
- `src/modules/financial-titles/financial-title-prisma.repository.ts`
- `src/modules/financial-titles/financial-title.service.ts`
- `tests/financial-titles.test.ts`
- `tests/financial-titles-routes.test.ts`
- `tests/financial-title-invariants-db.test.ts` (**novo**)
- `.github/workflows/ci.yml` (somente registrar a quinta suíte e comentar G7–G9)

### 7.2 Permitidos na consolidação do mesmo bloco

- `API_CONTRACTS.md`
- `docs/revisoes/O6R/REGISTRO_ACHADOS_O6R.md`
- `docs/revisoes/O6R/achados.jsonl`
- `agent-orchestration/controle/pendencias.md`
- `agent-orchestration/docs/status-geral.md`
- `agent-orchestration/codex/log-execucao.md`
- `agent-orchestration/omega/task-history/T-O6R-B02-F6.md` (**novo; execução real e drills, sem voto**)
- `Kpis/kpis-latest.json`
- `Kpis/kpis-history.json`
- `Kpis/kpis-history.md`
- `Kpis/app.js` (somente saída gerada por `node scripts/kpi-freeze.mjs`)
- `Kpis/index.html` somente se a validação provar necessidade estrutural; não há dimensão nova prevista
- `agent-orchestration/omega/juntas/J-O6R-B02.md` (**criado/preenchido apenas pelos revisores da junta**)

Os arquivos de governança modificados pelo planejador (`CLAUDE.md`, `AGENTS.md`, `decisoes.md`, comando e
este plano) devem ser preservados; o desenvolvedor não os reescreve.

### 7.3 Proibidos

- qualquer outro `src/**` ou `tests/**` não listado;
- `prisma/schema.prisma`, qualquer `prisma/migrations/**` e `prisma/seed.ts`;
- `.env`, lockfiles, `infra/**`, `fly.*.toml`, workflows de deploy;
- frontend, mobile/Flutter, Figma e protótipos;
- alterar F1–F5 para “simplificar”, afrouxar gates, mudar RBAC, reclassificar achado ou mover
  `mvp_demo`/`mvp_vendavel`;
- importar/cherry-pickar no PR financeiro o commit alheio `a109fd7` sem decisão explícita de reconciliação.

Qualquer necessidade fora dessa lista volta ao planejador; não cresce em silêncio.

## 8. Baseline N e meta M — régua declarada

Medição estática no HEAD `205ef40` (sem alegar execução nova):

- suíte direta F6 `tests/financial-title-invariants-db.test.ts`: **N_F6 = 0** (arquivo inexistente);
- suítes PostgreSQL financeiras existentes: **4 arquivos**, com **11 testes top-level executáveis** quando
  há `DATABASE_URL` (2 pay + 3 reverse + 4 cheque + 2 close); sem banco, cada arquivo registra 1 sentinel skip;
- memória direta de títulos: `financial-titles.test.ts` **57** testes; rotas **11** testes;
- última execução herdada de F3–F5, não reexecutada pelo planejador: 9/9 nas três suítes e
  2585 pass / 10 skip / 0 fail na suíte completa. É histórico, não resultado desta F6.

Como `M ≥ 2N` degenera para zero na suíte nova, aplica-se piso verificável:

- **M_F6 ≥ 6 testes top-level PostgreSQL**, no mínimo dois por garantia G7, G8 e G9;
- **M_memory/HTTP ≥ 4 testes novos** cobrindo os dois códigos e a não mutação;
- meta do bloco continua sendo **5 suítes `-db` registradas, zero skips no job e ≥24 cenários/asserções de
  garantia documentados** no task-history. O registro deve distinguir testes top-level de cenários internos;
  não pode chamar 17 testes de “24 testes”.

Se a contagem executada divergir, publica-se a execução real e explica-se o delta; nunca se copia 2585/2595.

## 9. Suíte PostgreSQL nova — G7, G8 e G9

`tests/financial-title-invariants-db.test.ts` segue o idioma das quatro suítes existentes:

- auto-skip apenas quando `DATABASE_URL` não existe;
- fixa `CORE_SAAS_PERSISTENCE=prisma` **antes** de qualquer import da aplicação e asserta o modo;
- tenant descartável por teste, ids aleatórios, teardown FK-ordered e escopado;
- duas conexões e barreira determinística por `pg_stat_activity`/`pg_locks`; `sleep` não é prova;
- HTTP usa JWT real; SQL cru usa conexão explicitamente tenant-scoped quando a garantia exigir;
- toda asserção consulta apenas ids criados pelo próprio teste.

Casos mínimos:

### G7 — PATCH nunca cruza `paid_amount`

1. Pagar 80 de 100; PATCH `amount=50` → 422 `amount_below_paid`; título permanece 100/80 e lançamentos
   permanecem idênticos.
2. Pagamento segura o row lock antes do commit; PATCH real entra atrás; após commit, PATCH → 422 pelo CAS,
   sem mutação. A fila do lock é observada.
3. Ordem inversa: PATCH válido vence e reduz o nominal; pagamento que excederia o novo nominal falha e sua
   UoW deixa zero lançamento órfão.

### G8 — DELETE exige zero pagamento

1. Título parcial e título pago: DELETE → 422 `title_has_payments`, `deleted_at IS NULL`, lançamentos intactos.
2. Depois de estorno total confirmado: DELETE → 200 e apenas então `deleted_at IS NOT NULL`.
3. Pagamento em voo vence; DELETE real bloqueia/reavalia e termina 422. Como controle de isolamento, a mesma
   operação com ator de outro tenant termina 404 sem revelar `title_has_payments`.

### G9 — CHECK de banco

1. SQL cru tenta `paid_amount > amount` → SQLSTATE **23514**, linha intacta.
2. SQL cru tenta `paid_amount < 0` → SQLSTATE **23514**, linha intacta; confirmar em catálogo que a constraint
   existe. `convalidated=true` é esperado em banco novo/limpo de CI; se a ponta B ocorrer, abrir a pendência
   de legado e não mentir que validou.

## 10. Drills D4 e D5

Cada drill segue: registrar baseline verde → aplicar **uma** quebra → executar o teste discriminante → exigir
exit não zero e mensagem que demonstre a regressão → reverter → executar novamente verde → `git diff` prova
zero resíduo. A saída real entra em `T-O6R-B02-F6.md`.

| Drill | Mutação temporária | Teste discriminante / vermelho esperado |
|---|---|---|
| **D4** | remover somente `paid_amount <= novo_amount` do CAS do PATCH | G7 concorrente deixa de produzir o 422 de domínio (o CHECK pode acusar 23514); de qualquer forma o teste reprova, provando que o CAS — e não o fast-fail — sustenta o contrato |
| **D5** | em banco **descartável validado pelo nome**, remover `financial_titles_paid_amount_check` | G9 deixa o SQL cru inválido persistir ou deixa de obter 23514; teste reprova; ao final o banco descartável é removido e a base viva não foi tocada |

Drill verde após a quebra = teste de teatro e bloqueio imediato para a junta. É proibido “ajustar” a asserção
para fazê-lo passar.

## 11. Bateria e lote PostgreSQL

Ordem obrigatória, com exit code da ferramenta testada (nunca o do `tail`/`tee`):

1. `npm run check`
2. `npm run lint`
3. `npm test`
4. suíte F6 isolada com banco real
5. as **cinco** suítes financeiras juntas:
   - `financial-pay-title-atomic-db`
   - `financial-entry-reverse-restore-db`
   - `cheque-clear-bounce-atomic-db`
   - `financial-period-close-write-race-db`
   - `financial-title-invariants-db`
6. D4 e D5, com volta ao verde e zero resíduo
7. lote na forma exata do job `backend-postgres`, **N≥10**, com `npm run db:seed` em **cada iteração**,
   `CORE_SAAS_PERSISTENCE=prisma`, as cinco suítes, `set -o pipefail`/equivalente e **zero skips**; denominador
   e ocorrência de `XX000|23503|23505|40P01` registrados por iteração
8. `npm run build`
9. `npm --prefix frontend run check` (trilha carregada; nenhuma alteração web)
10. `node scripts/kpi-freeze.mjs` depois dos JSON de KPI
11. `node --check Kpis/app.js`
12. `node --test --import tsx tests/kpi-dashboard-charts.test.ts tests/kpi-achados-paridade.test.ts`
13. `git diff --check`

O lote só é “10/10” se as 10 iterações executaram o seed e as cinco suítes com zero skip. Falha intermitente
não é arredondada; abre reprovação.

## 12. Consolidação de achados, pendências e KPI

### 12.1 Achados

Após bateria e junta verdes, atualizar em paridade:

- `Ω6R-DIN-001`, `DIN-002`, `DIN-003`, `DIN-004`, `DIN-008` e `QUA-003`;
- Markdown e JSONL com a mesma evidência, contagens executadas e rastro do bloco;
- `P-O6R-B02` deixa de bloquear o financeiro **somente quando o merge existir na main**.

Na autoria do PR, hash de merge ainda não existe: manter estado honesto (`aguardando_merge`/ativo com
evidência do PR) e não contar como fechado no painel. Depois do merge, fazer o backfill pós-merge conforme
§C3.5, preenchendo o hash real; só então o guard/painel conta os achados como fechados.

Se a migração encontrar ponta B:

- violação de `paid_amount` → abrir `P-O6R-B02-PAID-LEGADO`;
- duplicata de `reversal_of`/índice ausente → abrir pendência própria;
- não corrigir dado financeiro nem reconstruir índice nesta F6.

Registrar também o risco herdado: transação Prisma interativa tem timeout default de 5s; um fechamento
patológico acima disso pode devolver timeout ao writer em vez do 422. É pendência de resiliência, não motivo
para alongar transação agora.

### 12.2 KPI

- backend e bateria focada vêm da execução final real da árvore da entrega;
- frontend e Flutter são carregados com nota explícita de não reexecução, salvo se efetivamente executados;
- `blocks_completed` só avança quando o bloco for publicado conforme a política;
- `mvp_demo` e `mvp_vendavel` permanecem inalterados: esta F6 fecha risco, não move escopo;
- `pr` é preenchido após `gh pr create`; `merge_commit`/`approved_head` são `null` na autoria e recebem backfill
  pós-merge; `status: "published_per_pr"`;
- sem dimensão nova: `index.html` não precisa de alteração estrutural. Os JSON movem o painel em runtime e
  `kpi-freeze` atualiza o fallback de `file://` em `app.js`.

## 13. Junta e gates independentes

Por tocar dinheiro e uma migration já presente no diff do bloco, a junta mínima da entrega é:

- `critico-adversarial` — agente distinto, ataca contrato/concurrency e não corrige;
- `validador-mestre` — agente distinto, reexecuta diff × plano × bateria;
- `agente-dba-guardiao` — agente distinto, veto sobre CHECK, SQL, RLS, locks, D5 e reversibilidade;
- opcionalmente `inspetor-de-arnes-concorrente` como quarta cadeira se a execução variar sob lote.

Planejador e desenvolvedor não votam. A ata `J-O6R-B02.md` nomeia todos, inclui os resultados reexecutados e
declara se há veto. CI verde + junta verde autorizam o merge. Após o merge nasce outro agente
`porteiro-pos-merge`, que reexecuta promessa × diff × contagens × KPI/backfill × pendências × limpeza e emite
`LIBERADO`, `LIBERADO COM RESSALVA` ou `BLOQUEADO`. Nenhum próximo bloco começa antes disso.

## 14. Riscos, rollback e condições de parada

| Risco | Contenção |
|---|---|
| guard só no service e corrida preservada | CAS no `UPDATE` + G7/G8 com duas conexões + D4 |
| zero linhas virar 404 e esconder regra financeira | resultado discriminado e classificação estável na mesma tx |
| deadlock por ordem invertida | advisory compartilhado antes de row lock, sem SQL de trava fora do helper |
| CHECK ausente/ineficaz | G9 + catálogo + D5 em banco descartável |
| suite rodar em memória com banco disponível | fixa/asserta `CORE_SAAS_PERSISTENCE=prisma`; guard de zero skips no CI |
| teste sujar a base viva | tenant/id escopados, teardown FK-ordered; D5 só em banco descartável validado |
| número herdado virar KPI “real” | reexecução final e forma de contagem declarada |
| timeout Prisma de 5s sob close longo | registrar pendência; não aumentar timeout sem medição/junta |

Rollback de código: revert do commit F6 restaura o comportamento anterior, mas **não remove** a constraint
aditiva da F1. Rollback da migration segue o down documentado, somente em banco descartável/rollback aprovado;
produção nunca recebe DROP ad hoc. Paradas imediatas: migration destrutiva, exposição de segredo ou ação
irreversível em produção sem junta unânime.

## 15. Conflito de rastreabilidade encontrado antes da autoria

O relatório de handoff dizia que as ressalvas do porteiro do PR #357 estavam “todas fechadas em `a109fd7`”.
A medição local de 2026-08-20 mostra:

- `a109fd7` está apenas na branch local `chore/ressalvas-porteiro-357`;
- não é ancestral de `main` (`6efe5ad`) nem desta branch (`205ef40`);
- `gh pr list --state all --head chore/ressalvas-porteiro-357` devolveu lista vazia.

Isso não autoriza misturar cinco arquivos de auth/KPI no PR financeiro. Antes de publicar/mergear B-O6R-02,
o orquestrador deve registrar o destino dessa branch em fluxo próprio. O fato não altera o desenho F6, mas
impede afirmar que as ressalvas estão fechadas na `main`.

## 16. Definition of Done da F6

- [ ] somente arquivos permitidos tocados; nenhum resíduo de drill;
- [ ] `amount_below_paid` e `title_has_payments` documentados e provados em memória/HTTP/PostgreSQL;
- [ ] G7–G9 verdes; D4/D5 vermelhos durante a mutação e verdes após reversão;
- [ ] cinco suítes registradas no CI; batch N≥10, seed por iteração, denominador estável e zero skips;
- [ ] `npm run check/lint/test/build`, frontend check, guards KPI e `git diff --check` verdes;
- [ ] registros Ω6R, pendências e KPI honestos e em paridade;
- [ ] junta independente registrada, sem acúmulo de alçadas e sem veto;
- [ ] PR/CI/merge; backfill com hashes reais; limpeza §C5;
- [ ] porteiro pós-merge novo e independente emite parecer antes de qualquer próximo bloco.
