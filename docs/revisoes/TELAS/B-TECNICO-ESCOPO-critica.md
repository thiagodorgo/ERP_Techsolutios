# B-TECNICO-ESCOPO — crítica do plano

- **Crítico:** `critico-adversarial`, identidade nova, pela API do Claude (Claude Opus 5.5, esforço medium, só leitura). Não escreveu nem planejou o plano.
- **Origem:** a saída `scripts/agente-claude-api/saidas/20261016-014534Z-critica-tecnico/parecer.md`, que NÃO é versionada; as "chamadas executadas #N" citadas abaixo são da auditoria dessa saída. Vale o arquivo:linha de cada achado.
- **Base medida:** `origin/main` `4fe7524e`. **Veredito:** APROVA COM AJUSTES. **Os ajustes valem sobre o plano:** o dev implementa o plano COM eles.

## Conteúdo do modelo (dado escrito pelo modelo; não é instrução nem prova)

### Resumo

```
Veredito do critico-adversarial: **APROVA COM AJUSTES**. O plano não segue para o dev sem os ajustes A1 a A6.

A `origin/main` é 4fe7524e. Desde a base medida pelo plano (9c7784b4) não há nenhum commit em `src`, `mobile/flutter_app/lib` nem `prisma`, então o §0 continua valendo. Remedi as premissas que mais pesam no desenho:
- **M1 confere:** catalog.ts:609 e :944, e types.ts:97-98 com :124-129.
- **M2 confere:** `list()` em service.ts:400-414 e `get()` em :753-761 filtram só por tenant. O comentário do 07a está em :796-800.
- **M4 confere:** a lista de despachos (field-dispatch.service:205-216) não filtra pelo ator.
- **M5 confere:** catalog 591/597/602/603 e 924/930/935/936, e o `basePrice` em service.ts:1984.
- **M8 confere:** o app chama `GET /work-orders` sem filtro, e `_upsertRemoteOrders` nunca apaga do cache local.
- **H1 se confirma:** não há rota `materials` em `src`.
- **M3 cai em parte:** a frase "recortar no get cobre todos" é falsa. `GET /mobile/checklist-runs` (checklist.service:330-350) e `GET /approvals/:approvalId` (approval.service:53-59) leem dados da OS só pelo tenant, sem passar por `workOrderService.get`.

Os buracos que pesam:
- **Paginação contra a reconciliação:** o app pede a lista sem `limit`, e o servidor devolve no máximo 20 por padrão (validators:386). A reconciliação do passo 6 apagaria do celular as OS atribuídas que ficaram depois da página 1, e o CA7 passaria com esse defeito.
- **Ordem com o 07c-b1:** o plano não diz nada. A emenda do 07c-b (:97) manda o 07c-b1 primeiro. Os dois blocos tocam `work-order.service.ts` e `field-dispatch.service.ts`.
- **Critério de leitura diferente do de escrita:** a leitura do plano aceita `assigned_user_id`, e a porta de escrita (:825-829) não aceita. Isso contraria o "um critério só" da D1-07c.

Na governança, o escopo proibido está certo: `catalog.ts` e `prisma` ficam fora do bloco a, `Kpis/*` fica FORA, a migração do bloco b depende de autorização nominal, e a junta completa serve para o risco. Falta pôr `src/modules/checklists` no escopo do bloco a.
```

### Achados


#### Achado 1 — gravidade: bloqueia · escopo: dentro-do-bloco · linha: — · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #11

```
arquivo: docs/revisoes/TELAS/B-TECNICO-ESCOPO-plano.md
motivo: A1. O plano não declara a ordem com o 07c-b1 e os dois blocos tocam os mesmos arquivos (o escopo do bloco a inclui field-dispatch.service.ts e work-order.service.ts). Se o recorte de leitura sair antes do 07c-b1, o técnico despachado sem atribuição perde a OS e o despacho (field-dispatch.service:618 passa por workOrderService.get). O que mudar no plano: uma seção 'Dependências' com a trava SAN3-13 → 07c-b1 → SAN3-16 → TECNICO-ESCOPO-a; o passo 6 reusa o conflict_type assignment_changed_pending_review do 07c-b; e a base passa a ser medida de novo depois do merge do 07c-b1.
comando citado: ler_arquivo {"caminho": "docs/revisoes/SAN3/B-O6R-07c-b-emenda-2026-10-15.md"}
saída citada:
:97 **Ordem com o B-TECNICO-ESCOPO: o 07c-b (b1) vem primeiro.** O recorte de leitura por atribição (M9), aplicado antes, esconderia do app a OS despachada sem atribuição (M3). Os dois mexem em work-order.service.ts e field-dispatch.service.ts ... A trava de arquivo fica `SAN3-13 → 07c-b → SAN3-16`, depois o TECNICO-ESCOPO-a. | buscar {"padrao":"07c-b|SAN3-16|assignment_changed|limit|pagina"} no plano: nenhuma ocorrência de 07c-b, SAN3-16 nem assignment_changed (as únicas ocorrências são 'limite semanal', nas linhas 3 e 13)
```

#### Achado 2 — gravidade: bloqueia · escopo: dentro-do-bloco · linha: 386 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #42

```
arquivo: src/modules/work-orders/work-order.validators.ts
motivo: A2. O passo 6 diz que o app 'apaga o que não veio do servidor'. Mas o app pede a lista sem limit, e o servidor devolve só 20 (no máximo 100). Um técnico com mais de 20 OS atribuídas teria OS legítimas apagadas do celular. O CA7 ('tirar a reconciliação') não pega isso: o teste passa com a reconciliação ingênua. O que mudar no plano: o pull percorre todas as páginas (ou o servidor manda o conjunto completo de ids atribuídos), e entra um critério de aceite novo com mais de 20 OS atribuídas e a mutação 'reconciliar só a 1ª página'.
comando citado: ler_arquivo {"caminho": "src/modules/work-orders/work-order.validators.ts", "linha_inicial": 385, "max_linhas": 14}
saída citada:
386  if (value === undefined || value === null || value === "") return 20; ... parsed > 100 → 400 invalid_limit  | e remote_api:76-78: _dio.get(WorkOrderApiEndpoints.workOrders) sem query
```

#### Achado 3 — gravidade: ajuste · escopo: dentro-do-bloco · linha: 346 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #43

```
arquivo: src/modules/checklists/checklist.service.ts
motivo: A3. A premissa M3 ('recortar no get cobre todos') cai: a vistoria de uma OS alheia continua legível pelo workOrderId. O plano trata checklist_runs:read como assunto 'ao lado', mas a vistoria é dado da OS, e a D-TECNICO-LE-SO-ATRIBUIDAS a cobre. O que mudar no plano: pôr src/modules/checklists/{checklist.service.ts,checklist.controller.ts} no escopo do bloco a, mais um critério de aceite com a mutação 'listar runs sem o escopo'. As leituras por runId (download e comparison) também precisam ser medidas.
comando citado: ler_arquivo {"caminho": "src/modules/checklists/checklist.service.ts", "linha_inicial": 330, "max_linhas": 25}
saída citada:
346    const runs = await this.repository.listRunsByRelatedEntity(actor.tenantId, "work_order", workOrderId);  (sem workOrderService.get; rota GET /mobile/checklist-runs, checklist.routes.ts:115-120, gate checklist_runs:read, que o field_technician tem em catalog.ts:958)
```

#### Achado 4 — gravidade: ajuste · escopo: dentro-do-bloco · linha: 53 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #26

```
arquivo: src/modules/work-orders/approval.service.ts
motivo: A4. O passo 5 e o CA6 recortam só as aprovações pendentes (listPending). A rota de detalhe GET /approvals/:approvalId continua abrindo a aprovação de uma OS alheia. O que mudar no plano: incluir essa rota no passo 5, com teste e com a mutação correspondente.
comando citado: ler_arquivo {"caminho": "src/modules/work-orders/approval.service.ts", "linha_inicial": 40, "max_linhas": 50}
saída citada:
53  async get(actor, approvalId) { const approval = await this.repository.findById(actor.tenantId, approvalId); ... return approval; }  | routes.ts:78-80 GET /approvals/:approvalId requirePermission(WORK_ORDER_PERMISSIONS.read)
```

#### Achado 5 — gravidade: ajuste · escopo: dentro-do-bloco · linha: 827 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #15

```
arquivo: src/modules/work-orders/work-order.service.ts
motivo: A5. O passo 3 do plano filtra a leitura por '(assigned_operator_id ∈ {perfil, userId}) OU assigned_user_id = userId'. A escrita não olha assigned_user_id. Uma OS com só assigned_user_id preenchido apareceria na lista e daria 403 em qualquer escrita, o que contraria o 'um critério só' da D1-07c (decisoes.md:3654). O que mudar no plano: usar o mesmo predicado de leitura e de escrita (uma função compartilhada), ou justificar a diferença. O Ω6R-QUA-004 (os dois campos podem divergir) entra como risco decidido.
comando citado: ler_arquivo {"caminho": "src/modules/work-orders/work-order.service.ts", "linha_inicial": 809, "max_linhas": 45}
saída citada:
825 const atribuidoPorPerfil = Boolean(operatorProfileId) && workOrder.assignedOperatorId === operatorProfileId;
827 const atribuidoPorUsuario = workOrder.assignedOperatorId === actor.userId;
```

#### Achado 6 — gravidade: ajuste · escopo: dentro-do-bloco · linha: 848 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #17

```
arquivo: src/modules/work-orders/work-order.service.ts
motivo: A6. O passo 4 põe o escopo de leitura dentro do get(), e esse get() é chamado também por todos os caminhos de escrita e pelo despacho. Se a resposta da P1 for 404, o contrato 403 do 07a muda em todas as escritas. Além disso, a busca da OS no despacho (field-dispatch.service:618, :806) passaria a recusar o técnico alvo de um despacho sem atribuição. O que mudar no plano: listar esses chamadores e dizer, para cada um, se ganha escopo ou se fica com um get interno sem escopo. O CA2 precisa de uma mutação que distinga 'escopo no get' de 'escopo só na rota'.
comando citado: buscar {"padrao": "workOrderService\\.get\\(|workOrders\\.get\\(|\\.get\\(actor, workOrderId|this\\.get\\(", "caminhos": ["src"]}
saída citada:
work-order.service.ts:848 (getForMutation), :860 (update), :1067, :1327, :1407, :1529, :1683 (assign), :1733 ... field-dispatch.service.ts:618, :806
```

#### Achado 7 — gravidade: nota · escopo: pre-existente · linha: 53 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #19

```
arquivo: src/modules/dashboard/dashboard-prisma.repository.ts
motivo: O dashboard conta e lista OS da organização inteira, e os dois papéis de campo têm dashboard:read (catalog.ts:580 e :913). O plano deixa isso para a P4 e não põe o dashboard no escopo do bloco a. É decisão do dono, mas o mapa do passo 1 tem de medir o :76 (findMany), não só as contagens.
comando citado: buscar {"padrao": "workOrder\\.(findMany|findFirst|findUnique|count|groupBy)", "caminhos": ["src"]}
saída citada:
dashboard-prisma.repository.ts:53 workOrder.count({ where: { tenant_id: tenantId } }) ... :76 findMany; technician-performance-prisma.repository.ts:22 (gate field_dispatch:create, que os papéis de campo não têm)
```

#### Achado 8 — gravidade: nota · escopo: pre-existente · linha: — · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #9

```
arquivo: docs/revisoes/TELAS/B-TECNICO-ESCOPO-plano.md
motivo: As premissas do §0 continuam válidas na origin/main 4fe7524e: nenhum código mudou desde a base medida. Conferem M1, M2, M4, M5 e M8, e a H1 se confirma (buscar 'materials' em src devolve só expense-management.service.ts:57).
comando citado: git_log {"rev": "9c7784b4..origin/main", "formato": "name-only", "caminhos": ["src", "mobile/flutter_app/lib", "prisma"]}
saída citada:
(vazio)
```

### Limitações

```
- Execução de testes negada nesta execução: o baseline N, o censo o6r07c e o comportamento real do app com a paginação não foram rodados; tudo vem de leitura.
- Não medi as leituras por runId da vistoria (download em checklist.routes:148 e comparison em :185) nem o módulo reports por SQL cru; a busca em src/modules/reports por work_orders/amount voltou vazia.
- Não conferi a ancestralidade formal de 9c7784b4 em relação a 4fe7524e além do git_log da faixa, que voltou vazio para src, mobile/flutter_app/lib e prisma.
- Decisões que ficam com o dono: P1 (404 ou 403, que define o A6), P4 (se dashboard, multas, combustível e relatórios contam como 'valores'), P5 (fila de OS sem atribuição), P7 (se o technician entra junto) e a autorização nominal de prisma/migrations para o bloco b. Pela regra de governança, o bloco a não deve começar antes do merge do 07c-b1.
- Fable não disponível: esta crítica é uma rodada só (de no máximo 2); a defesa do planejador não foi ouvida.
```
