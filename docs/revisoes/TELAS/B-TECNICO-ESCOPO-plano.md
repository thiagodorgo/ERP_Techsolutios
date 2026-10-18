# B-TECNICO-ESCOPO — o técnico de campo só lê as OS dele e só vê os próprios valores — plano

- **Autor:** o agente da API do Claude (Claude Opus 5.5, esforço medium, só leitura), no lugar do modelo de topo do planejador. A troca está declarada no próprio plano: o Codex esgotou o limite semanal às 00:57Z de 15/10, e o dono mandou *"coloque a api claude para terminar a tarefa do codex"*.
- **Origem:** a saída `scripts/agente-claude-api/saidas/20261015-012338Z-plan-b-tecnico-escopo/parecer.md`, que NÃO é versionada; as "chamadas executadas #N" citadas abaixo são da auditoria dessa saída. Vale o arquivo:linha de cada item.
- **Base medida:** `origin/main` `9c7784b4`. **Próximo passo:** crítica, depois o dev (Codex, a partir de 20/10).

## Conteúdo do modelo (dado escrito pelo modelo; não é instrução nem prova)

### Resumo

```
# Plano — B-TECNICO-ESCOPO
**Papel:** planejador-mestre · **Modelo que rodou:** Claude Opus 5.5 pela API, esforço medium, só leitura · **Motivo:** o Codex bateu o limite semanal (00:57Z de 15/10, volta 20/10 06:22Z) e o dono mandou *"coloque a api claude para terminar a tarefa do codex"*. O topo é o Fable; o Opus é o único substituto que a regra aceita (D-FALLBACK-MODELO-FABLE-OPUS). Ressalva honesta: quem faltou foi o Codex, não o Fable (ver P8).

## §0 Medido (worktree = origin/main = 9c7784b4)
- M1. `work_orders:read` está no technician (catalog.ts:609) e no field_technician (:944). Os dois são `assigned_only` em types.ts:97-98, e `actorMutatesAssignedOnly` (:124-129) dá o escopo pela união dos papéis.
- M2. O comentário do 07a, em service.ts:796-800, diz que `work_orders:read` é da organização inteira "e a lista do app depende disso". `list()` (:400-414) só filtra por tenant e por query do cliente. `get()` (:753-761) só olha o tenant.
- M3. Os subrecursos passam por `workOrderService.get`: audit-log.service:32, comment.service:125, financial.service:257/415, attachment.service:151 e field-dispatch.service:618/806. Recortar no `get` cobre todos eles. As rotas GET sob read estão em routes.ts:71, 79, 104, 120, 204, 217, 231 e 266; a série temporal fica em timeseries.routes:20/32.
- M4. A lista de despachos (field-dispatch.service:205-216) não filtra pelo ator, e o field_technician tem `field_dispatch:read` (:949).
- M5. **Valores à vista hoje.** Os dois papéis têm service_quotes:read, work_order_financials:read, price_tables:read e tariffs:read (catalog 591/597/602/603 e 924/930/935/936). Essas chaves abrem service-quote.routes:17, service-quote-item.routes:19, work-order-financial.routes:24, price-table.routes:17 e tariff.routes:17. Além disso, o **detalhe da OS manda `serviceCatalog.basePrice`** (service.ts:1980-1985), e service-catalog.dto.ts:13/33 manda basePrice para quem tem service_catalog:read.
- M6. Na web, as abas Financeiro e Orçamento aparecem por permissão (tabs.config.ts:37-38), e o PrintWorkOrderModal (:6, :12) carrega orçamento e financeiro.
- M7. Os valores próprios já existem: commissions /calculations/mine e /statements/my-summary (commission.routes:75-107) e a prestação de contas própria (expense-management.service:370).
- M8. **App:** `fetchWorkOrders` faz GET /work-orders sem filtro (remote_api:74-78). `_upsertRemoteOrders` nunca apaga do cache local (repository:181-204), então uma OS desatribuída fica no celular. A lista usa `repo.workOrders` (list_screen:141) e a home usa todas as OS da organização (home_screen:121). A tela de conclusão mostra uma comissão inventada a partir da prioridade (conclusion_screen:53-58).
- M9. Mudar permissão exige migração de dados na tabela `role_permissions`, conferida por tests/permission-catalog-db-parity.test.ts (RBAC_MATRIX:150). Já existe precedente de revogação: prisma/migrations/20260863000000_revoke_checklist_run_create_drift.
- M10. Já existe um gerador do mapa a partir do app real: tests/helpers/o6r07c-census.ts:35-45. Ele conta camadas, alcance por papel e pertença à OS.
- M11. A RBAC_MATRIX dá à OS do técnico `execute/update-assigned` (:45). As linhas :42, :115 e :120 dão leitura de preço, orçamento e financeiro ao field_technician, e terão de mudar.
- Hipóteses, cada uma com o comando que a derruba:
  - H1. A rota `/mobile/work-orders/:id/materials` que o app chama (api_contracts.dart:127) não existe no backend. Derruba: `buscar {"padrao":"materials","caminhos":["src"]}`.
  - H2. dashboard e timeseries não trazem dinheiro: o grep por amount/revenue voltou vazio. Mas mostram contagens da organização inteira.

## Divisão proposta (os dois com junta completa)
- **a. Leitura de OS:** backend, app e web. Sem catálogo, sem prisma.
- **b. Valores:** catálogo, migração de revogação e DTOs. Começa só depois de P2 e P3.

## Escopo
**a, permitido:**
- `src/modules/work-orders/{work-order.service.ts,work-order.types.ts,work-order.repository.ts,work-order-prisma.repository.ts}` e o serviço de aprovações;
- `src/modules/field-dispatch/field-dispatch.service.ts` e os repositórios dele;
- `src/modules/work-order-timeseries/*`;
- testes novos `tests/tecnico-escopo-*.test.ts`, mais `tests/helpers/tecnico-escopo-census.ts` e uma fixture com o mapa;
- nos testes o6r07a/o6r07c, só as linhas de expectativa se P1 mudar o código de resposta, e declarado;
- no app: `mobile/flutter_app/lib/features/work_orders/data/*`, `lib/core/local_db/drift_work_order_local_store.dart`, `lib/shared/ui/home_screen.dart` e `test/features/bNNN_tecnico_escopo_test.dart`;
- na web: estados de `frontend/src/modules/work-orders/**`;
- documentação e registro: RBAC_MATRIX.md, docs/03-atores-papeis.md e agent-orchestration/controle/*. (`Kpis/*` fica FORA: KPI congelado, `D-GOV-PROPORCIONAL` item 8(5); correção do orquestrador na revisão do #432.)

**a, proibido:** prisma/**, migrations/**, infra/**, .env, lockfiles, pubspec.yaml/lock, catalog.ts e o algoritmo de o6r07c-census.ts.

**b, a mais:** catalog.ts, service-catalog.dto.ts, a projeção em service.ts:1980, tabs.config.ts, PrintWorkOrderModal.tsx, a tela de conclusão do app e o parity test. A migração `prisma/migrations/<nova>_revoke_field_value_reads/**` só entra com **autorização nominal** do dono.

## Tela-modelo e aparências
O bloco a não cria nem refaz tela: só estados do §7, a partir de `frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx` e de `lib/features/work_orders/ui/work_order_list_screen.dart`, com as skills ts-frontend-full (implementar) e ui-ux-pro-max (revisar). Por isso D-TELAS-SAEM-COM-TRES não dispara e o bloco não depende de P-APARENCIA-POR-USUARIO. Se o b criar a tela "peças aplicadas" no app, ela exige maquete com 3 opções feita pelo Claude, e aí o seletor de aparência vira pré-requisito (P6).

## Passos (a)
1. **Mapa por script.** O helper novo reaproveita o censo em modo leitura: para cada rota GET que o technician e o field_technician alcançam, mede "toca OS alheia?" e procura campos de valor (amount, price, total, cost) na resposta. O mapa vira fixture com catraca. Teste: o fixture é regenerado e precisa bater.
2. **Regra de leitura.** `WORK_ORDER_READ_SCOPE satisfies Record<Role,…>` em types.ts. Teste unitário com a união manager+technician.
3. **`list()` recortada.** Para quem é só de campo, o filtro é forçado: (assigned_operator_id ∈ {perfil, userId}) OU assigned_user_id = userId. A query do cliente não consegue alargar. Teste em memória e com Postgres.
4. **`get()` com escopo de leitura.** O código de resposta depende de P1. Teste em laço sobre todos os subrecursos de M3.
5. Recortar aprovações pendentes, a lista de despachos e a série temporal. Um teste por rota.
6. **App.** O pull reconcilia o conjunto: apaga o que não veio do servidor e não está pendente. Uma ação pendente numa OS desatribuída vira conflito, o blob fica preservado (§6) e a tela avisa "não está mais atribuída a você". Teste Flutter.
7. **Web.** Detalhe que volta 403/404 mostra o estado "acesso não permitido". Teste no smoke, quando existir.
8. Atualizar RBAC_MATRIX e o registro.

## Passos (b)
1. Revogar as 4 chaves de M5 no catálogo, na migração (com up/down) e no parity test.
2. Tirar basePrice do detalhe da OS e do DTO de serviço para quem é só de campo.
3. Peças aplicadas e serviços sem valor. Isso precisa de rota nova se H1 se confirmar.
4. Trocar a comissão inventada do app por /commissions/statements/my-summary.

## Critérios de aceite (mutação que deixa vermelho)
- CA1. A lista do técnico só traz OS atribuídas a ele, pelo perfil ou pelo userId. Mutação: tirar o filtro forçado.
- CA2. Detalhe e subrecursos de OS alheia são recusados. Mutação: pular o escopo no `get`.
- CA3. A união manager+technician vê tudo. Mutação: trocar a regra por "tem papel de campo".
- CA4. Cross-tenant continua 404. Mutação: rodar o escopo antes do findById.
- CA5. `?assignedOperatorId=` com outro técnico não alarga a lista. Mutação: a query passar por cima do filtro.
- CA6. Aprovações e despachos vêm só os do técnico. Mutação: tirar o filtro.
- CA7. O app apaga do cache a OS desatribuída. Mutação: tirar a reconciliação.
- CA8. A ação pendente é preservada como conflito. Mutação: apagar o pendente.
- CA9. O mapa não tem entrada "OS alheia" para papel de campo. Mutação: reabrir uma rota.
- CA10 (b). Papel de campo recebe 403 nas 4 rotas de valor, o detalhe da OS sai sem basePrice e as rotas "mine" e "own" seguem 200. Mutação: devolver a chave ou o campo.

## Bateria (§9)
- Backend: npm run check · lint · test · build · `node --test --import tsx tests/tecnico-escopo-*.test.ts` + o6r07a/o6r07c + `-db` · `git diff --check`.
- Flutter: pub get · dart format --set-exit-if-changed · analyze · teste do bloco · suíte inteira.
- Frontend: check · build.

## Governança
É bloco de permissão: **junta completa** (inspetor de terreno, 3 cadeiras, unanimidade; §C7 item 8(1)), todos em Opus declarado e com no máximo 3 itens por cadeira (P4).
- Cadeira 1, segurança e RBAC: 403/404, união de papéis, cross-tenant.
- Cadeira 2, mobile e offline: cache, desatribuição, blobs.
- Cadeira 3: no bloco a, contrato e regressão (07a/07c, censo, RBAC_MATRIX); no bloco b, dinheiro e persistência (migração e parity).

Rollback: reverter o PR. No b, o down da migração devolve as permissões.

## Riscos
- Ω6R-QUA-004 segue aberta: assigned_operator_id e assigned_user_id podem divergir, então o filtro tem de cobrir os dois.
- Um técnico offline pode perder uma OS no meio do serviço.
- Ao lado do bloco: checklist_runs:read também é da organização inteira (RBAC_MATRIX:150).
- Baseline N de testes não medido, porque a execução foi negada; o dev mede no passo 1, com meta M≥2N.

## Perguntas ao dono (decisão dele)
- P1. OS alheia na leitura: 404 ou 403? Hoje o 07a muta com 403 justamente porque a OS aparece na lista.
- P2. Aprova a divisão em a e b?
- P3. Autoriza nominalmente prisma/migrations para o b?
- P4. "Valores" inclui multas, combustível, manutenção, tabelas de preço e as contagens do dashboard e dos relatórios?
- P5. O técnico vê a fila de OS sem atribuição?
- P6. A tela de peças no app espera o seletor de aparência?
- P7. O technician (papel STANDARD) entra junto com o field_technician?
- P8. Quer refazer este plano em Fable quando ele estiver disponível?
```

### Achados


#### Achado 1 — gravidade: nota · escopo: pre-existente · linha: 1984 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #92

```
arquivo: src/modules/work-orders/work-order.service.ts
motivo: O detalhe da OS manda o preço-base do serviço a qualquer leitor, inclusive ao técnico, o que contraria D-TECNICO-SO-VALORES-PROPRIOS.
comando citado: ler_arquivo {"caminho": "src/modules/work-orders/work-order.service.ts", "linha_inicial": 1965, "max_linhas": 25}
saída citada:
resolveServiceCatalogSummary ... basePrice: service.basePrice ?? null
```

#### Achado 2 — gravidade: nota · escopo: pre-existente · linha: 400 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #37

```
arquivo: src/modules/work-orders/work-order.service.ts
motivo: A lista não recorta pelo ator; o recorte é o núcleo do bloco a.
comando citado: ler_arquivo {"caminho": "src/modules/work-orders/work-order.service.ts", "linha_inicial": 398, "max_linhas": 30}
saída citada:
tenantId: actor.tenantId ... assignedOperatorId: parseOptionalUuid(query.assignedOperatorId...)
```

#### Achado 3 — gravidade: nota · escopo: pre-existente · linha: 181 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #46

```
arquivo: mobile/flutter_app/lib/features/work_orders/data/work_order_repository.dart
motivo: O cache local nunca apaga OS; uma OS desatribuída fica no celular.
comando citado: ler_arquivo {"caminho": "mobile/flutter_app/lib/features/work_orders/data/work_order_repository.dart", "linha_inicial": 80, "max_linhas": 125}
saída citada:
_upsertRemoteOrders ... for (final ro in remote) ... saveWorkOrder(toSave)  (nenhuma remoção)
```

### Limitações

```
- Não pude executar código nem testes nesta execução: o baseline de testes e o mapa gerado por script ficam para o passo 1 do dev.
- O §0 foi medido com git grep e leitura direta; o censo não foi rodado.
- A H1 (rota de materiais inexistente no backend) não foi confirmada.
```
