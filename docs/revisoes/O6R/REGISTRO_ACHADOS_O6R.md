# Registro central de achados — Ω6R

Junta: J-6R  
Branch: `revisao/o6r-auditoria-total`  
Regra: append-only; um achado só existe após verificação do Relator e registro simultâneo neste arquivo e em `achados.jsonl`.

## Contadores de ID

| Categoria | Próximo número |
|---|---:|
| SEC | 005 |
| TEN | 002 |
| DIN | 012 |
| DAT | 005 |
| PERF | 004 |
| ARQ | 005 |
| QUA | 006 |
| LGPD | 001 |
| DEP | 001 |
| HIP | 001 |
| DIV | 001 |

## Achados

### [Ω6R-DIN-001] Pagamento concorrente pode criar lançamento órfão e inflar o saldo
- Severidade: P0        Confiança: 0.99
- Status: **aguardando_merge** — implementação B-O6R-02 F1–F6 concluída em autoria; fechamento depende de revisão independente, junta, merge e porteiro.
- Categoria: DIN
- Módulo: financial-entries / financial-titles        Lente: A3
- Local: `src/modules/financial-entries/financial-entry.service.ts:261-282`, `src/modules/financial-titles/financial-title-prisma.repository.ts:132-138`
- Descrição: O lançamento financeiro é persistido antes da aplicação do pagamento ao título. Duas requisições concorrentes sem `client_action_id` podem criar dois lançamentos; a segunda atualização do título é recusada depois, deixando o saldo da conta inflado e um lançamento sem pagamento correspondente.
- Evidência:
  ```ts
  // CRITICAL: applyPayment is called after creating the financial entry. In a
  // concurrent scenario without client_action_id, two requests can both pass the
  // overpayment check, both create entries, then the second applyPayment will
  // refuse — leaving an orphan entry and inflated account balance. The ideal fix
  // is to wrap createEntry + applyPayment in the same transaction. For now the
  // atomic update in applyPayment prevents title overpayment but not the orphan.
  if (input.title_id) {
    await financialTitleRepository.applyPayment(ctx.tenantId, input.title_id, {
  ```
- Impacto: Um retry ou duas confirmações simultâneas do mesmo pagamento podem duplicar movimento de caixa/conta sem duplicar o valor pago do título. A divergência afeta saldos financeiros, conciliação e relatórios do tenant.
- Correção sugerida: Executar a criação do lançamento e o `applyPayment` na mesma transação Prisma, usando atualização condicional/lock do título. Exigir chave de idempotência também nos caminhos interativos que pagam títulos e persistir o resultado da operação.
- Teste recomendado: Disparar duas requisições concorrentes, sem `client_action_id`, para quitar o mesmo saldo remanescente; provar que existe exatamente um lançamento e que título e saldo da conta permanecem consistentes.

### [Ω6R-DIN-002] Estorno de lançamento não reabre nem reduz o valor pago do título
- Severidade: P0        Confiança: 0.98
- Status: **aguardando_merge** — foi REABERTO em 2026-08-22 pela junta `J-B-O6R-02-ciclo1` (bloqueante B-1) e o ciclo 2 o consertou em autoria; volta a `aguardando_merge` (conserto escrito, NÃO na main). O `reverse` passou a devolver, mas o `DELETE` do MESMO lançamento de liquidação continuava aceito no head `e4e914a`: o caixa voltava e o título ficava com `paid_amount` intacto — o impacto declarado deste achado seguia alcançável por HTTP, pela outra porta. O caminho do delete está registrado em detalhe como `Ω6R-DIN-010`; os dois só voltam a `aguardando_merge` juntos.
- Categoria: DIN
- Módulo: financial-entries / financial-titles        Lente: A3
- Local: `src/modules/financial-entries/financial-entry.service.ts:158-195`
- Descrição: O estorno cria uma contrapartida contábil, mas deliberadamente não reverte `paid_amount` nem o status do título associado. O caixa é revertido enquanto a obrigação ou recebível permanece quitado, produzindo duas verdades financeiras incompatíveis.
- Evidência:
  ```ts
  // Reversals create a counter-entry with opposite type and positive amount.
  // Title paid_amount is NOT reversed — that requires a dedicated title payment
  // reversal operation (future enhancement). The reversal entry has no title_id
  // to avoid double-counting.
  const original = await financialEntryRepository.findById(ctx.tenantId, id);
  ```
- Impacto: Após estornar um pagamento, extrato/saldo indicam a devolução do dinheiro, mas o título continua parcial ou totalmente pago. Cobrança, aging, conciliação e fechamento financeiro passam a operar sobre estado incorreto.
- Correção sugerida: Implementar uma operação transacional de estorno de pagamento que bloqueie/condicione o título, crie a contrapartida vinculada e reduza `paid_amount`, recalculando o status. Torná-la idempotente para retries e estornos concorrentes.
- Teste recomendado: Pagar integralmente um título, estornar o lançamento e verificar atomicamente que o saldo foi revertido, `paid_amount` voltou ao valor anterior e o status do título foi reaberto; repetir o estorno e provar idempotência.

### [Ω6R-DIN-003] Compensação e devolução de cheque podem deixar lançamento financeiro órfão
- Severidade: P0        Confiança: 0.97
- Status: **aguardando_merge** — implementação B-O6R-02 F1–F6 concluída em autoria; fechamento depende de revisão independente, junta, merge e porteiro.
- Categoria: DIN
- Módulo: cheques / financial-entries        Lente: A3
- Local: `src/modules/cheques/cheque.service.ts:152-184`, `src/modules/cheques/cheque.service.ts:187-231`
- Descrição: A mudança de estado do cheque, o lançamento financeiro e a vinculação entre ambos são operações separadas. Falha ou queda depois do lançamento e antes do vínculo deixa dinheiro movimentado sem uma relação recuperável e com rollback de estado apenas best-effort.
- Evidência:
  ```ts
      try {
        await repository.transitionStatus(ctx.tenantId, id, "deposited", {
          note: "Rollback after failed financial posting",
        });
      } catch {
        // best-effort rollback
      }
      throw error;
    }

    return repository.attachFinancialEntry(ctx.tenantId, id, entry.id);
  ```
- Impacto: Timeout, crash ou erro de banco entre as etapas pode registrar entrada/saída de caixa sem cheque associado, ou deixar o cheque em estado incompatível. Retries podem repetir a movimentação e comprometer conciliação e saldos.
- Correção sugerida: Colocar transição condicional, criação do lançamento e vínculo em uma única transação. Se a integração exigir etapas assíncronas, usar saga durável com idempotência, estado pendente explícito e reconciliação automática.
- Teste recomendado: Injetar falha após criar o lançamento e antes de `attachFinancialEntry`, nos fluxos de compensação e devolução; provar que não sobra lançamento órfão e que retry não duplica dinheiro.

### [Ω6R-DIN-004] Título pago aceita valor inferior ao liquidado e exclusão lógica
- Severidade: P0        Confiança: 0.99
- Status: **aguardando_merge** — CAS de PATCH/DELETE e cobertura G7–G9 implementados; fechamento depende de revisão independente, junta, merge e porteiro.
- Categoria: DIN
- Módulo: financial-titles        Lente: A3
- Local: `src/modules/financial-titles/financial-title.service.ts:218-243`, `src/modules/financial-titles/financial-title.service.ts:317-325`, `src/modules/financial-titles/financial-title-prisma.repository.ts:102-118`, `prisma/schema.prisma:1762-1767`
- Descrição: O `PATCH` aceita alterar `amount` sem comparar o novo valor com `paid_amount`, e o `DELETE` lógico não bloqueia títulos parcial ou totalmente pagos. A regra `paid_amount <= amount` existe apenas em comentário no schema, sem `CHECK` de banco.
- Evidência:
  ```ts
  // Editáveis: party_name/document/category/description/amount/due_date/account_id. NÃO altera
  // status/paid_amount/competencia/direction/party_type (imutáveis pós-create nesta fatia).
  const updated = await this.repository.update({
    tenantId: actor.tenantId,
    financialTitleId: current.id,
    partyName: body.party_name === undefined && body.partyName === undefined ? undefined : parsePartyName(body.party_name ?? body.partyName),
    document: parseOptionalDocument(body.document),
    category: parseOptionalCategory(body.category),
    description: parseOptionalDescription(body.description),
    amount: rawAmount === undefined ? undefined : parseAmount(rawAmount),
  ```
- Impacto: Um título pago em 80 pode ser reduzido para 50, deixando `paid_amount > amount`; também pode desaparecer das consultas ativas embora lançamentos ainda o referenciem. Totais de contas, aging, conciliação e trilha de cobrança ficam contraditórios.
- Correção sugerida: Bloquear alteração para `amount < paid_amount` e exclusão de título com pagamento, de forma condicional no banco. Adicionar `CHECK (paid_amount >= 0 AND paid_amount <= amount)` e usar estorno/cancelamento explícito para desfazer títulos com movimento.
- Teste recomendado: Pagar 80 de um título de 100 e tentar `PATCH amount=50` e `DELETE`; ambos devem falhar sem alterar título ou lançamentos, inclusive sob concorrência.

### [Ω6R-DIN-005] Métrica faturável de checklist pode ser perdida definitivamente
- Severidade: P0        Confiança: 0.99
- Categoria: DIN
- Módulo: checklists / cloud-usage / cloud-cost-allocation        Lente: A1
- Local: `src/modules/checklists/checklist.service.ts:247-269`, `src/modules/checklists/checklist-prisma.repository.ts:394-406`, `src/infra/events/domain-event.publisher.ts:48-60`, `src/modules/cloud-usage/cloud-usage.service.ts:149-168`, `src/modules/cloud-usage/cloud-usage.events.ts:38-53`, `src/modules/cloud-cost-allocation/cloud-cost-allocation.rules.ts:61-66`
- Descrição: A execução do checklist é confirmada antes da emissão da métrica faturável, que roda fora da transação e absorve falhas em modo best-effort. No retry com a mesma chave, o repositório retorna `created:false` e o serviço não republica, tornando a perda definitiva.
- Evidência:
  ```ts
  // foi REALMENTE inserida. Se o repositório devolveu idempotentemente a run pré-existente (`created:false`,
  // por colisão de `client_run_key`: 2 despachos concorrentes da mesma OS ou 2× POST com a mesma chave),
  // PULA os dois efeitos — senão `checklist_run.created` sairia 2× e a métrica FATURADA `checklist_runs_count`
  // (dedup por `event.id`, único por emissão) super-contaria, além de duplicar a auditoria "run created".
  if (created) {
  ```
- Impacto: Queda do processo ou falha de banco depois da criação do checklist e antes da métrica elimina uma unidade de cobrança e altera o rateio de custos entre organizações. Não existe replay capaz de reparar automaticamente a perda.
- Correção sugerida: Gravar um evento Outbox com ID estável na mesma transação da `checklist_run`; despachar com retry e consumir por Inbox/upsert idempotente. Derivar a chave da execução persistida, não de um UUID criado apenas na publicação.
- Teste recomendado: Injetar falha entre o commit da run e a gravação de uso, repetir a mesma `client_run_key` e provar que termina com exatamente uma `checklist_runs_count` persistida.

### [Ω6R-SEC-001] Administrador de organização pode se promover a administrador global
- Severidade: P0        Confiança: 1.00
- Status: **fechado** em 2026-08-18 pelo B-O6R-01 (PR na autoria; nº e hash no backfill pós-merge).
  Allowlist **fechada por construção**: `PLATFORM_ROLES`/`TENANT_ASSIGNABLE_ROLES` derivadas do catálogo
  com guard de exaustividade em dois níveis (tipo que não compila papel sem classificação + teste de
  partição), `assertAssignableRole` nos **quatro** pontos de validação (create/update × prisma/memória)
  e no escritor sem rota `store.assignRoleToUser` — papel de plataforma → **403 role_not_assignable**;
  papel inválido → **400** (era Error cru); `findByKeyForTenant` resolve key de sistema **só na linha
  global** (defesa em profundidade, não conserto — o global já vencia por `DESC`/NULLS FIRST). A
  fronteira legítima de provisionamento de plataforma segue sendo o seed (escrita direta) e a futura
  rota de plataforma (pendência `P-O6R-B01-PROMOCAO-PLATAFORMA`). Prova ponta a ponta: o token do
  `tenant_admin` que tentou a escalada segue 403 em `/api/v1/platform/*`.
- Categoria: SEC
- Módulo: core-saas / auth / platform        Lente: A2
- Local: `src/modules/core-saas/routes/users.routes.ts:53-69`, `src/modules/core-saas/permissions/catalog.ts:301-307`, `src/modules/core-saas/services/prisma-core-saas.service.ts:199-214`, `src/modules/core-saas/services/prisma-core-saas.service.ts:284-295`, `src/modules/core-saas/repositories/role.repository.ts:35-50`, `prisma/seed.ts:252-280`, `src/modules/auth/routes/auth.routes.ts:255-272`, `src/modules/platform/platform-permissions.ts:29-57`
- Descrição: A rota de gestão de usuários permite que quem possui `users.manage` atribua qualquer papel válido, inclusive o papel global `super_admin`. `tenant_admin` possui essa permissão, o repositório resolve papéis globais e o token subsequente concede acesso de plataforma apenas pela presença desse papel.
- Evidência:
  ```ts
  router.patch(
    "/:userId",
    requirePermission("users.manage"),
    handleAsyncRoute(async (request, response) => {
      const actor = requireTenantContext(request);
      const body = request.body as Record<string, unknown>;
      const input: UpdateUserInput = {
        userId: readRouteParam(request.params.userId),
        tenantId: actor.tenantId,
        ...(typeof body.name === "string" ? { name: readString(body.name) } : {}),
  ```
- Impacto: Um administrador de qualquer organização pode promover a própria conta ou outra conta a `super_admin`, renovar o token e listar, alterar ou suspender organizações e recursos globais. É uma escalada vertical completa de privilégio.
- Correção sugerida: Aplicar allowlist de papéis atribuíveis por papel do ator e proibir qualquer papel de plataforma nesta rota tenant-scoped. Separar membership da organização da identidade/autoridade global e exigir operação de plataforma específica, auditada e com SoD para promoção global.
- Teste recomendado: Como `tenant_admin`, executar `PATCH /users/:self` com `roles=["super_admin"]`; exigir 403 e provar que tokens antigos e novos continuam bloqueados em `/api/v1/platform/*`.

### [Ω6R-TEN-001] Troca de organização por e-mail permite assumir conta homônima de outro tenant
- Severidade: P0        Confiança: 0.99
- Status: **fechado** em 2026-08-18 pelo B-O6R-01 (PR na autoria; nº e hash no backfill pós-merge).
  Identidade global (`auth_identities`) + vínculo explícito (`auth_identity_links`, FK composta ao par
  `(tenant_id, user_id)`) + trilha append-only ilegível por organização. `listTenantsForUserEmail` foi
  **removida** (guard de padrão trava o retorno); `active-tenant`, `/me/tenants` e o bootstrap mobile
  decidem pelo **vínculo** (sem vínculo → 403, fail-closed; usuário inativo/organização suspensa →
  403). O login sem organização atravessa a única `SECURITY DEFINER` do repositório com teto interno —
  o e-mail só seleciona candidatos internos e a **credencial decide** (I1). A religação move
  **exatamente um** vínculo (o da organização provada) e o desvínculo revoga as sessões do par na
  mesma transação (I3; janela do access de 15 min declarada no contrato). Repro do achado virou teste:
  homônimo sem vínculo → `active-tenant` 403 (tests/auth-identity-links-db.test.ts), com as transações
  centrais provadas sob role efêmera NOSUPERUSER (tests/auth-identity-role-real-db.test.ts).
- Categoria: TEN
- Módulo: auth / core-saas        Lente: A2
- Local: `src/modules/auth/routes/auth.routes.ts:245-272`, `src/modules/core-saas/services/prisma-core-saas.service.ts:301-313`, `prisma/schema.prisma:142-187`
- Descrição: A troca de organização correlaciona memberships exclusivamente pelo e-mail do JWT e emite um novo token como o `User` encontrado no tenant pedido. Como `User` é tenant-local e o e-mail só é único dentro do tenant, não existe um subject global que prove que registros homônimos pertencem à mesma pessoa.
- Evidência:
  ```ts
  const service = await resolveCoreSaasService();
  const memberships = await service.listTenantsForUserEmail(payload.email);
  const match = memberships.find((m) => m.tenant.id === requestedTenantId);
  if (!match) {
    response.status(403).json({
      error: { code: "FORBIDDEN", message: "User does not belong to the requested tenant." },
    });
    return;
  }
  const accessToken = await issueAccessToken({
  ```
- Impacto: Uma identidade autenticada no tenant B pode assumir o usuário ativo de mesmo e-mail no tenant A sem possuir credencial, convite ou vínculo comprovado em A. O mesmo vínculo por e-mail também expõe a enumeração de organizações da conta homônima.
- Correção sugerida: Introduzir identidade global imutável vinculada ao `sub` do provedor e memberships explícitos `(subject_id, tenant_id)`. Nunca usar e-mail como chave de autorização ou correlação cross-tenant.
- Teste recomendado: Criar identidades distintas com o mesmo e-mail em A e B; o token de B não pode listar A nem trocar para A, enquanto uma identidade com membership explícito em ambos deve poder fazê-lo.

### [Ω6R-DAT-001] Produção pode iniciar silenciosamente com persistência volátil
- Severidade: P0        Confiança: 1.00
- Status: **fechado** em 2026-08-15 pelo B-O6R-05 (PR #353, `a8901ff`). O gate **G1** do `env.ts` passou a
  **exigir** `CORE_SAAS_PERSISTENCE=prisma` em todo `NODE_ENV=production` — o boot é **reprovado**, não
  avisado. O `docker-compose.prod.yml`, que fixava `memory`, foi corrigido no mesmo bloco. O achado não é
  mais alcançável por nenhum dos caminhos de implantação: manifests de staging e produção declaram `prisma`
  explicitamente, e o gate os cobre mesmo que não declarassem.
- Categoria: DAT
- Módulo: config / core-saas / runtime        Lente: A1
- Local: `src/config/env.ts:21-34`, `src/config/env.ts:112-208`, `src/modules/core-saas/core-saas-runtime.ts:6-16`, `docker-compose.prod.yml:41-52`
- Descrição: `CORE_SAAS_PERSISTENCE` usa `memory` por padrão e os gates de produção não a rejeitam. O compose de produção fixa explicitamente esse modo, portanto o serviço aceita escritas em RAM e aparenta funcionar apesar de perder os dados no restart.
- Evidência:
  ```ts
  CORE_SAAS_PERSISTENCE: z.enum(["memory", "prisma"]).default("memory"),
  // Ω4C PR-04 (D-Ω4C-NOTIF-SCHEDULER) — liga o worker in-process (job.worker.ts). Default DESLIGADO: com false o
  // loop de jobs NÃO sobe (CI/testes que importam app.ts nunca disparam o scheduler). Só com true ∧
  // persistence=prisma o server.ts inicia o worker + enfileira o 1º `notifications.scan-due`.
  JOBS_WORKER_ENABLED: booleanFlag(false),
  ```
- Impacto: Um deploy que omita a variável — e o manifesto `docker-compose.prod.yml` atual — inicia verde, aceita alterações de usuários, papéis e outros agregados mantidos pelos adapters em memória e perde tudo ao reiniciar. O banco estar disponível não impede a perda silenciosa.
- Correção sugerida: Fazer o schema falhar quando `NODE_ENV=production` e a persistência não for `prisma`; restringir o default `memory` a dev/test e corrigir o compose de validação produtiva. Adicionar probe que confirme persistência real, não apenas processo vivo.
- Teste recomendado: `production` sem flag e `production+memory` devem abortar antes de `listen`; smoke no compose grava dado, reinicia a API e comprova leitura do mesmo registro.

### [Ω6R-SEC-002] Técnico de campo pode alterar OS alheia e decidir aprovações do tenant
- Severidade: P0        Confiança: 1.00
- Categoria: SEC
- Módulo: work-orders / approvals / RBAC        Lente: A2
- Local: `src/modules/core-saas/permissions/catalog.ts:784-820`, `src/modules/work-orders/work-order.routes.ts:70-83`, `src/modules/work-orders/work-order.routes.ts:110-123`, `src/modules/work-orders/work-order.service.ts:759-804`, `src/modules/work-orders/approval.service.ts:61-97`, `RBAC_MATRIX.md:44-46`, `RBAC_MATRIX.md:66`, `APPROVAL_LIMITS.md:38-52`
- Descrição: `field_technician` recebe as permissões gerais de update/status, e as rotas não impõem escopo por OS atribuída. As decisões de aprovação reutilizam `work_orders:update` e o service não verifica papel, alçada, propriedade ou segregação de função.
- Evidência:
  ```ts
  router.post(
    "/approvals/:approvalId/approve",
    requirePermission(WORK_ORDER_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await approvalController.approve(request));
    }),
  );
  ```
- Impacto: Um técnico pode mudar estado ou conteúdo de OS atribuída a outro técnico e aprovar/rejeitar solicitações tenant-wide, inclusive com consequência financeira/operacional. Isso contorna autorização por objeto, alçada e SoD definidas nas fontes de verdade.
- Correção sugerida: Aplicar guards object-scoped no service/repositório para papéis de campo (`assigned_user_id`/equipe) e criar política/permissão dedicada de aprovação que valide ator, alçada, tipo e segregação. A consulta e o write devem compartilhar o mesmo predicado.
- Teste recomendado: Técnico A tenta alterar/status da OS de B e aprovar uma solicitação; ambos retornam 403. Gestor autorizado dentro da alçada consegue decidir, e o próprio solicitante não aprova quando a política proíbe.

### [Ω6R-ARQ-001] Fila Redis perde jobs após retirada destrutiva
- Severidade: P1        Confiança: 0.99
- Categoria: ARQ
- Módulo: infra/jobs        Lente: A1
- Local: `src/infra/jobs/job.queue.ts:54-77`, `src/infra/jobs/job.worker.ts:24-41`
- Descrição: `dequeue` executa `LPOP` antes de registrar atomicamente o job numa área de processamento. Não existe lease, visibility timeout, processing list ou reclaim para recuperar trabalho de worker morto.
- Evidência:
  ```ts
  const jobId = await this.redis.command("LPOP", this.pendingKey);
  if (typeof jobId !== "string") return null;
  const envelope = await this.getJob(jobId);
  if (!envelope) return null;
  const processing = {
    ...envelope,
    status: "processing" as const,
    updatedAt: now.toISOString(),
  };
  await this.save(processing);
  ```
- Impacto: Crash entre o `LPOP` e o `save`, ou durante o handler, remove definitivamente notificações, reconciliações de custódia, diárias e fanout de eventos da fila.
- Correção sugerida: Usar Redis Streams com consumer groups ou claim atômico pending→processing, lease/visibility timeout e reclaim. Tornar também a gravação do envelope e a publicação na fila atômicas.
- Teste recomendado: Matar o worker imediatamente após dequeue e durante o handler; outro worker deve recuperar o mesmo job após o lease, sem perda nem execução simultânea.

### [Ω6R-ARQ-002] Cada inicialização multiplica cadeias de jobs recorrentes
- Severidade: P1        Confiança: 0.98
- Categoria: ARQ
- Módulo: infra/jobs        Lente: A1
- Local: `src/server.ts:15-39`, `src/modules/charging/charge.jobs.ts:10-23`, `src/infra/jobs/job.queue.ts:20-49`
- Descrição: Toda inicialização enfileira uma nova instância de cada sweep com UUID aleatório, e cada handler sempre cria seu sucessor. Não há chave de schedule, deduplicação, líder ou lease global.
- Evidência:
  ```ts
  startWorker();
  await enqueueInitialScheduledNotificationScan();
  await enqueueInitialImpoundReconcileScan();
  await enqueueInitialChargingAccrueScan();
  await enqueueInitialImpoundNotifyDueScan();
  ```
- Impacto: Rolling restarts e múltiplas réplicas criam cadeias imortais adicionais; o número de sweeps cresce com o histórico de startups, elevando carga e amplificando efeitos não perfeitamente idempotentes.
- Correção sugerida: Chave determinística por schedule com `SET NX`/lease e renovação, leader election ou scheduler único. O sucessor deve manter a identidade lógica da agenda.
- Teste recomendado: Iniciar duas réplicas e reiniciá-las; em várias janelas, deve ocorrer exatamente um sweep de cada nome por intervalo.

### [Ω6R-ARQ-003] SSE operacional é local ao processo e perde eventos entre réplicas
- Severidade: P1        Confiança: 0.98
- Categoria: ARQ
- Módulo: field-ops-realtime        Lente: A1
- Local: `src/modules/field-ops-realtime/field-ops-realtime.broker.ts:24-54`, `src/infra/events/domain-event.publisher.ts:59-80`, `src/modules/field-dispatch/field-ops-event-fanout.jobs.ts:5-14`
- Descrição: Assinantes e deduplicação vivem em `Map` local. O publisher e o consumidor do job publicam somente no broker da réplica que executa cada trecho, sem broadcast ou replay distribuído.
- Evidência:
  ```ts
  export class FieldOpsRealtimeBroker {
    private readonly subscribersByTenant = new Map<string, Set<FieldOpsRealtimeSubscriber>>();
    private readonly recentEventIds: string[] = [];
    private readonly recentEventIdSet = new Set<string>();
  ```
- Impacto: Cliente conectado à réplica B não recebe mutação executada em A quando o fanout roda em A ou C. O mapa de despacho pode ficar silenciosamente desatualizado até refresh manual.
- Correção sugerida: Distribuir os eventos por Pub/Sub/Streams para todas as réplicas ou usar gateway SSE único; preservar ID, cursor e `Last-Event-ID` para replay.
- Teste recomendado: Cliente SSE em B, mutação em A e worker em C; B deve receber o evento uma vez e recuperá-lo após reconexão.

### [Ω6R-ARQ-004] Despacho e timeline obrigatória são gravados em transações distintas
- Severidade: P1        Confiança: 0.99
- Categoria: ARQ
- Módulo: field-dispatch        Lente: A1
- Local: `src/modules/field-dispatch/field-dispatch.service.ts:138-161`, `src/modules/field-dispatch/field-dispatch-prisma.repository.ts:150-174`
- Descrição: O agregado de despacho é criado e depois o evento de timeline é persistido por outro método `withTenantRls`, portanto outra transação. A criação não possui chave de ação durável para retry.
- Evidência:
  ```ts
  const dispatch = await this.repository.create({
    tenantId: actor.tenantId,
    workOrderId,
    operatorUserId,
    status,
    // ...
  });
  await this.repository.createEvent({
  ```
- Impacto: Falha entre writes deixa despacho sem evento probatório; retry pode criar outro despacho. Mudança de status e reatribuição repetem a fronteira estado→evento separada.
- Correção sugerida: Comandos `create/changeStatus/reassignWithEvent` numa transação tenant-scoped compartilhada e `client_action_id`/chave única na criação.
- Teste recomendado: Injetar falha no insert do evento e exigir rollback do despacho; replay da mesma chave resulta em um agregado e um evento.

### [Ω6R-DIN-006] Manifests deixam workers financeiros e legais desativados
- Severidade: P0        Confiança: 1.00
- Status: **fechado** em 2026-08-15 pelo B-O6R-05 (PR #353, `a8901ff`). O gate **G3** do `env.ts` exige
  `JOBS_WORKER_ENABLED=true` em produção, e os manifests de staging e produção passaram a declará-la.
  Fechado com uma correção que o próprio achado não previa: em staging a máquina **escalava a zero**, e com
  ela dormindo o worker não roda — o ambiente diria "verde" sem nunca ter executado uma tarefa. O
  `min_machines_running = 1` (PR #354, custo autorizado pelo dono em 2026-08-15) é parte do fechamento, não
  um extra: sem ele o gate estaria satisfeito e o efeito, ausente.
- Categoria: DIN
- Módulo: jobs / charging / impound / notifications        Lente: A1
- Local: `src/config/env.ts:28-33`, `src/server.ts:15-39`, `fly.production.toml:29-35`, `fly.staging.toml:22-28`
- Descrição: `JOBS_WORKER_ENABLED` usa `false` por padrão e os manifests reais de staging/produção não definem a flag. Assim, o runtime não inicia reconciliação OS→custódia, acumulação de diárias, notificações agendadas ou marcos legais.
- Evidência:
  ```ts
  async function startJobWorkerIfEnabled(): Promise<void> {
    if (!env.JOBS_WORKER_ENABLED || env.CORE_SAAS_PERSISTENCE !== "prisma") {
      return;
    }
  ```
- Impacto: Diárias cobradas deixam de ser materializadas, OS concluídas não abrem/corrigem custódia pelo sweep e prazos/notificações legais não são emitidos. Há perda financeira e de estado operacional/regulatório sem erro de startup.
- Correção sugerida: Habilitar explicitamente worker dedicado em staging/produção e falhar readiness/gate de deploy sem heartbeat recente. Separar processo web do worker e monitorar cada schedule crítico.
- Teste recomendado: Smoke pós-deploy verifica heartbeat recente e prova reconciliação de OS, materialização de diária e emissão de notificação; manifesto sem worker deve falhar o gate.

### [Ω6R-PERF-001] Worker sobrepõe ticks sem limite e não impõe timeout aos handlers
- Severidade: P1        Confiança: 0.99
- Categoria: PERF
- Módulo: infra/jobs        Lente: A4
- Local: `src/infra/jobs/job.worker.ts:24-78`, `src/infra/jobs/job.worker.ts:81-90`
- Descrição: O `setInterval` dispara `processNextJob()` sem aguardar o tick anterior, e handlers não possuem deadline ou cancelamento. Qualquer execução acima de 1 segundo cria sobreposição; handler travado permanece ocupando recursos indefinidamente.
- Evidência:
  ```ts
  this.timer = setInterval(() => {
    this.processNextJob().catch((error: unknown) => {
      this.logger.error({ error }, "Job worker tick failed.");
    });
  }, pollIntervalMs);
  ```
- Impacto: Banco/Redis lentos ou integrações travadas acumulam Promises e jobs concorrentes sem controle, ampliando conexões, memória e pressão sobre caminhos financeiros e legais.
- Correção sugerida: Loop autoagendado que só inicia após conclusão, semaphore de concorrência explícita e timeout/cancelamento por tipo de job; heartbeat deve distinguir running/stuck.
- Teste recomendado: Handler bloqueado por barreira durante vários intervalos não inicia execuções acima do limite; ao vencer timeout, job segue a política de retry/reclaim.

### [Ω6R-PERF-002] Polling web acumula requisições sem timeout e aceita respostas fora de ordem
- Severidade: P1        Confiança: 0.98
- Categoria: PERF
- Módulo: frontend / API client        Lente: A4
- Local: `frontend/src/hooks/useAutoRefresh.ts:26-41`, `frontend/src/services/api/client.ts:118-140`
- Descrição: O hook dispara a Promise de refresh sem trava in-flight em intervalo fixo, e o cliente usa `fetch` sem `AbortSignal` ou deadline. O padrão aparece em 54 arquivos/53 consumidores.
- Evidência:
  ```ts
  const tick = () => {
    if (pauseWhenHidden && typeof document !== "undefined" && document.hidden) return;
    void savedRefresh.current(true);
  };
  const id = window.setInterval(tick, intervalMs);
  ```
- Impacto: Backend lento por mais de 30s acumula requests por tela; respostas antigas podem chegar depois das novas e sobrescrever estado atual, além de multiplicar carga durante degradação.
- Correção sugerida: Coalescer/trava por refresh, cancelar a requisição anterior ou descartar resultado por generation ID e aplicar timeout central com `AbortController` no cliente.
- Teste recomendado: Fazer requests demorarem mais que dois intervalos e resolver fora de ordem; deve existir no máximo uma chamada ativa e o estado final deve vir da geração mais recente.

### [Ω6R-PERF-003] Pipeline público de imagens bloqueia e pressiona a API autenticada
- Severidade: P1        Confiança: 0.98
- Categoria: PERF
- Módulo: owner-portal / runtime        Lente: A4
- Local: `src/modules/owner-portal/owner-portal.photo-pipeline.ts:57-103`, `src/modules/owner-portal/image-header-guard.ts:9-16`, `src/modules/owner-portal/photo-concurrency-guard.ts:1-43`, `src/server.ts:43-65`, `package.json:35-47`
- Descrição: Jimp decodifica, redimensiona, imprime e codifica imagens no mesmo processo Node que serve a API ERP. O teto admite 40 milhões de pixels e três pipelines concorrentes; o timeout só deixa de esperar, sem interromper CPU ou liberar memória.
- Evidência:
  ```ts
  const image = await Jimp.read(sourceBuffer);
  const { width, height } = image.bitmap;
  const longestSide = Math.max(width, height);
  if (longestSide > PHOTO_MAX_LONGEST_SIDE_PX) {
    const scale = PHOTO_MAX_LONGEST_SIDE_PX / longestSide;
    image.resize({ w: targetWidth, h: targetHeight });
  }
  ```
- Impacto: Três imagens válidas no teto podem exigir cerca de 480 MB apenas para RGBA, além de overhead/cópias, e bloquear o event loop. Uma superfície pública degrada login, pagamentos e operações autenticadas no mesmo processo.
- Correção sugerida: Isolar decode/resize/encode em worker thread ou processo com limites de memória/CPU e cancelamento real; reduzir teto conforme necessidade do produto e separar o portal do processo ERP.
- Teste recomendado: Carga com três imagens no limite mede RSS e p99 de `/health`/rota autenticada; limites devem ser preservados e timeout deve encerrar o trabalho, não só a resposta.

### [Ω6R-QUA-001] Replay de despesas mobile é construído sem autenticação
- Severidade: P1        Confiança: 0.99
- Categoria: QUA
- Módulo: mobile-flutter / expense-management        Lente: A5
- Local: `mobile/flutter_app/lib/core/sync/sync_providers.dart:51`, `mobile/flutter_app/lib/core/sync/sync_providers.dart:109-119`, `mobile/flutter_app/lib/core/auth/auth_notifier.dart:152-160`, `mobile/flutter_app/lib/core/network/http_client.dart:33-47`, `src/modules/expense-management/expense-management.routes.ts:110-115`
- Descrição: O provider de replay RDV usa `apiConfigProvider`, que sempre retorna configuração sem token, em vez do provider autenticado usado pelos demais syncs. O cliente só envia `Authorization` quando há token, enquanto o endpoint exige contexto e permissão.
- Evidência:
  ```dart
  final syncBatchApiProvider = Provider<ExpenseSyncBatchApi>((ref) {
    final config = ref.watch(apiConfigProvider);
    return DioExpenseSyncBatchApi(createExpenseHttpClient(config));
  });
  ```
- Impacto: Toda ação offline de despesa tenta replay sem Bearer, recebe 401/403 e permanece pendente/falhando. RDV criado em campo não converge para o ERP.
- Correção sugerida: Usar `authenticatedApiConfigProvider`, retornar implementação pending quando não autenticado e usar o cliente com refresh/logout compartilhado.
- Teste recomendado: ProviderContainer com sessão intercepta POST de sync e exige Bearer; 401 provoca refresh e um retry, e sessão ausente não consome a fila.

### [Ω6R-QUA-002] Mobile de estoque implementa contrato paralelo e não possui replay
- Severidade: P1        Confiança: 0.99
- Categoria: QUA
- Módulo: mobile-flutter / mobile-inventory / inventory        Lente: A5
- Local: `mobile/flutter_app/lib/features/inventory/data/inventory_repository.dart:92-105`, `mobile/flutter_app/lib/features/inventory/data/inventory_repository.dart:147-159`, `mobile/flutter_app/lib/core/sync/sync_providers.dart:114-119`, `mobile/flutter_app/lib/core/sync/auto_sync_coordinator.dart:90-118`, `src/modules/mobile/mobile-inventory-sync.ts:98-105`, `src/modules/mobile/mobile-inventory-sync.ts:288-305`
- Descrição: Flutter enfileira `inventory_entry.create`, `inventory_exit.create` e `work_order_material.add`, mas o backend só aceita `inventory.reserve|consume|shortage_report`. O coordenador não chama replay de estoque e o backend usa Maps em memória separados do agregado Prisma.
- Evidência:
  ```ts
  const supportedActionTypes: readonly InventoryActionType[] = [
    "inventory.reserve",
    "inventory.consume",
    "inventory.shortage_report",
  ];
  ```
- Impacto: Entradas, baixas e materiais ficam apenas no aparelho e pendentes indefinidamente; mesmo um replay adicionado hoje seria rejeitado e não alteraria o estoque real. Operação e inventário exibem saldos divergentes.
- Correção sugerida: Definir contrato canônico único, plumbá-lo no Flutter e backend Prisma, criar replay dedicado no coordinator e remover catálogo/saldo demonstrativo em memória do caminho produtivo.
- Teste recomendado: Fixture de contrato para cada ação, replay pelo coordinator e consulta do mesmo estoque Prisma; reiniciar backend e provar persistência/idempotência.

### [Ω6R-DIN-007] Resumo de custo ignora silenciosamente itens após o limite 10.000
- Severidade: P0        Confiança: 1.00
- Categoria: DIN
- Módulo: cloud-costs        Lente: A4
- Local: `src/modules/cloud-costs/aws-cur.service.ts:85-100`, `src/modules/cloud-costs/aws-cur.service.ts:184-191`, `src/modules/cloud-costs/aws-cur-prisma.repository.ts:136-157`
- Descrição: O resumo soma em memória o retorno de `listLineItems`, mas normaliza silenciosamente a consulta para `limit: 10_000`. O repositório aplica esse valor em `take`, portanto custos posteriores jamais entram no total.
- Evidência:
  ```ts
  return {
    ...filters,
    periodEnd: filters.periodEnd ?? now,
    periodStart: filters.periodStart ?? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    limit: 10_000,
  };
  ```
- Impacto: Qualquer período AWS com mais de 10 mil line items tem custo total e rateio subestimados. O erro movimenta cobrança entre organizações sem aviso de truncamento.
- Correção sugerida: Calcular `SUM/GROUP BY` no banco sobre todo o filtro; limite pertence somente ao endpoint detalhado/paginado. Expor precisão decimal do banco até a borda.
- Teste recomendado: Inserir 10.001 itens com valor relevante no último; resumo, agrupamento e posterior rateio devem incluí-lo integralmente.

### [Ω6R-QUA-003] Testes financeiros críticos exercem apenas adapters em memória
- Severidade: P1        Confiança: 0.99
- Status: **aguardando_merge** — cinco suítes PostgreSQL somam 32 casos top-level; fechamento depende de revisão independente, junta, merge e porteiro.
- Categoria: QUA
- Módulo: financial-entries / cheques / period-close / expenses        Lente: A5
- Local: `tests/financial-entries.test.ts:53-59`, `tests/financial-entries.test.ts:436-439`, `tests/cheques.test.ts:59-65`, `tests/cheques.test.ts:453-466`, `tests/financial-period-closes.test.ts:49-59`, `tests/expense-management-routes.test.ts:182-204`
- Descrição: As suítes financeiras instanciam repositórios Memory, e uma delas declara explicitamente que Prisma não é exercido. Mutex/Maps mascaram as fronteiras de transação, constraints e interleavings que originam os P0 desta rodada.
- Evidência:
  ```ts
  function setup() {
    resetAll();
    return {
      entries: createMemoryFinancialEntryService(),
      accounts: createMemoryFinancialAccountService(),
      titles: createMemoryFinancialTitleService(),
    };
  }
  ```
- Impacto: Pay/reverse, cheque, fechamento e sync de despesas podem passar verdes apesar de falharem em PostgreSQL sob concorrência e fault injection. O CI não filtra as regressões financeiras mais caras.
- Correção sugerida: Suíte DB-gated obrigatória com Prisma/PostgreSQL, duas conexões e barreiras determinísticas para os fluxos críticos; verificar invariantes finais diretamente no banco.
- Teste recomendado: Corridas pay/reverse, clear/bounce, close×writer e expense effect×receipt com falha entre writes; assertar contagens/saldos/status/receipts reais.

### [Ω6R-DIN-008] Escritores podem confirmar dinheiro depois do snapshot de período fechado
- Severidade: P0        Confiança: 1.00
- Status: **aguardando_merge** — write-path financeiro e PATCH compartilham a trava de competência; fechamento depende de revisão independente, junta, merge e porteiro.
- Categoria: DIN
- Módulo: financial-period-closes / financial writers        Lente: A3
- Local: `src/modules/financial-period-closes/financial-period-close-prisma.repository.ts:49-52`, `src/modules/financial-period-closes/financial-period-close-prisma.repository.ts:77-89`, `src/modules/financial-titles/financial-title.service.ts:338-344`
- Descrição: O fechamento usa advisory lock por tenant/período, mas os caminhos de escrita apenas consultam se o período está aberto em outra transação e não adquirem o mesmo lock. Um writer já aprovado pode commitar depois do snapshot e do status fechado.
- Evidência:
  ```ts
  // Um advisory lock em (tenant,period) serializa fechamentos concorrentes; a proteção completa
  // contra read-skew de writers exige o mesmo lock no write-path (P-Ω4-6-CLOSE-RACE — fora deste bloco). O
  // controle compensatório REAL é a re-derivação material (D1), que flagra um título vazado a posteriori.
  ```
- Impacto: O período fechado contém lançamentos/títulos que não aparecem no snapshot assinado, alterando saldo, conciliação e relatórios depois do fechamento.
- Correção sugerida: Todos os writes financeiros adquirem o mesmo advisory lock e revalidam o período dentro da transação que grava. Close e write devem serializar pelo mesmo recurso.
- Teste recomendado: Pausar writer após open-check, fechar período e retomá-lo; ele deve falhar ou integrar snapshot, jamais commitar fora dele.

### [Ω6R-DIN-009] Receipt de despesas é persistido depois do efeito monetário e não vincula usuário/payload
- Severidade: P0        Confiança: 1.00
- Categoria: DIN
- Módulo: expense-management        Lente: A3
- Local: `src/modules/expense-management/expense-management.service.ts:155-193`, `src/modules/expense-management/expense-management-prisma.repository.ts:150-177`, `src/modules/expense-management/expense-management-prisma.repository.ts:238-278`, `prisma/schema.prisma:2696-2713`
- Descrição: O sync consulta receipt, executa a ação e só depois cria receipt em outra transação. A chave é apenas tenant+`client_action_id`, sem usuário ou fingerprint do payload.
- Evidência:
  ```ts
  const existing = await this.repository.findMobileActionReceipt({ tenantId: actor.tenantId, clientActionId });
  // ...
  const resultRef = await this.processSyncAction(actor, type, payload);
  await this.repository.createMobileActionReceipt({
    tenantId: actor.tenantId,
    clientActionId,
    actorUserId: actor.userId,
  ```
- Impacto: Crash ou concorrência após o efeito repete item/relatório/valor; dois usuários podem colidir na mesma chave e payload divergente pode receber replay indevido. Há duplicação e atribuição errada de dinheiro.
- Correção sugerida: Claim durável `processing` por tenant+usuário+ação com hash do payload, ou efeito e receipt na mesma transação. Replays com fingerprint diferente devem ser conflito.
- Teste recomendado: Crash effect→receipt, duas chamadas concorrentes, dois usuários com mesma chave e mesma chave/payload diferente; exatamente um efeito correto deve persistir.

### [Ω6R-DAT-002] Saldo de estoque usa check-then-insert sem serialização
- Severidade: P0        Confiança: 0.99
- Categoria: DAT
- Módulo: inventory        Lente: A3
- Local: `src/modules/inventory/inventory-prisma.repository.ts:199-236`, `src/modules/inventory/inventory-prisma.repository.ts:410-426`, `prisma/migrations/20260828000000_add_stock_custody_ledger/migration.sql:74-81`
- Descrição: A transação calcula o saldo agregado, valida e insere o movimento sem bloquear uma linha/lock lógico do item+custódia. Reversão também verifica existência antes de inserir, sem unicidade ativa sobre o movimento revertido.
- Evidência:
  ```ts
  const custodySaldoBefore = await this.saldoOfCustody(input.tenantId, input.itemId, custody);
  if (wouldOverdraw(custodySaldoBefore, input.quantidadeSinalizada)) {
    throw insufficientBalanceError(custodySaldoBefore);
  }
  return this.insertMovement({ ...input, custody });
  ```
- Impacto: Com saldo 10, duas saídas de 8 podem observar 10 e persistir -16; duas reversões podem compensar o mesmo movimento duas vezes. O estoque e a custódia ficam corrompidos.
- Correção sugerida: Serializar `(tenant,item,custody)` com balance row/`FOR UPDATE`, advisory lock ou CAS e criar unicidade para reversão ativa.
- Teste recomendado: Vinte retiradas concorrentes e N reversões no PostgreSQL; saldo nunca negativo e exatamente uma compensação por origem.

### [Ω6R-DAT-003] Fechamento de contagem cíclica pode duplicar ajustes e ficar parcial
- Severidade: P0        Confiança: 1.00
- Categoria: DAT
- Módulo: inventory / cycle-count        Lente: A3
- Local: `src/modules/inventory/cycle-count.service.ts:137-218`, `src/modules/inventory/cycle-count-prisma.repository.ts:100-119`
- Descrição: A sessão e ajustes existentes são lidos antes do loop; cada `createMovement` commita em transação própria e o fechamento ocorre só ao final. Dois fechamentos podem observar ausência e criar os mesmos ajustes, e falha intermediária deixa aplicação parcial.
- Evidência:
  ```ts
  // se um fechamento anterior falhou no meio do laço, ajustes
  // ja podem ter sido gravados para alguns itens (cada createMovement commita na
  // propria transacao). Um novo "Fechar" NAO pode duplicar esses ajustes
  const existingAdjustments = await this.inventory.listMovements({
  ```
- Impacto: Variações de inventário são aplicadas duas vezes sob corrida, ou apenas para parte dos itens após falha. Saldos e valor de estoque ficam incorretos.
- Correção sugerida: Uma transação com `FOR UPDATE` da sessão, status condicional e unicidade `(tenant,cycle_count,item)`; todos os movimentos e fechamento fazem commit/rollback juntos.
- Teste recomendado: N closes concorrentes e falha no item intermediário; um ajuste por item, vencedor único e rollback integral.

### [Ω6R-QUA-004] Cliente Flutter de OS viola envelope, casing e payload do backend
- Severidade: P1        Confiança: 0.99
- Status: **parcialmente superado** — verificado em `origin/main` `e80430a` (2026-08-14). O componente
  **timeline** caiu com o PR #351 (`7e60b90`, B-127): `fetchTimeline` passou a pedir `Map<String, dynamic>` e a
  desembrulhar `resp.data?['data']` (`work_order_remote_api.dart:122-138`). Os demais componentes **continuam
  abertos**: `fetchWorkOrder` (`:94-103`) e `updateWorkOrderStatus` (`:105-119`) ainda entregam o envelope
  inteiro a `_workOrderFromJson`, que lê chaves snake_case na **raiz** (`:223-234`), e `assignWorkOrder`
  (`:141-160`) ainda envia `'user_id'` (`:151`) enquanto o service lê `body.operatorId ?? body.userId`
  (`work-order.service.ts:1087`) — nenhum dos dois casa, então o assign falha em 400. O achado **não** pode ser
  fechado.
- Categoria: QUA
- Módulo: mobile-flutter / work-orders        Lente: A5
- Local (faixas rebaseadas sobre a `main` pós-#351): `mobile/flutter_app/lib/features/work_orders/data/work_order_remote_api.dart:94-119`, `mobile/flutter_app/lib/features/work_orders/data/work_order_remote_api.dart:141-160`, `mobile/flutter_app/lib/features/work_orders/data/work_order_remote_api.dart:223-234`, `src/modules/work-orders/work-order.controller.ts:52-58`, `src/modules/work-orders/work-order.routes.ts:262-266`, `src/modules/work-orders/work-order.dto.ts:15-24`, `src/modules/work-orders/work-order.service.ts:1079-1088`, `mobile/flutter_app/test/features/b099_real_work_orders_pull_test.dart:209-238`
- Descrição: Backend responde `{data: DTO}` em camelCase, mas detalhe/status entregam o envelope ao parser snake_case e timeline espera uma lista na raiz. Assign envia `user_id`, campo que o service não lê. (Componente timeline corrigido pelo #351; ver Status.)
- Evidência:
  ```dart
  final resp = await _dio.get<Map<String, dynamic>>(
    WorkOrderApiEndpoints.workOrder(workOrderId),
  );
  return _workOrderFromJson(resp.data!);
  ```
- Impacto: Timeline remota falha e volta silenciosamente ao cache; detalhe, status e assign quebram quando exercidos. O teste existente não chama Dio/parser real e produz falso verde.
- Correção sugerida: Normalizador único do envelope/camelCase, payload conforme contrato e fixtures compartilhadas derivadas das respostas reais do backend.
- Teste recomendado: MockAdapter executa `DioWorkOrderRemoteApi` em list/detail/status/timeline/assign com respostas reais e valida requests/respostas ponta a ponta.

### [Ω6R-QUA-005] Seleção multi-SKU retorna antes de persistir a fila offline
- Severidade: P1        Confiança: 0.98
- Categoria: QUA
- Módulo: mobile-flutter / prestador        Lente: A5
- Local: `mobile/flutter_app/lib/features/prestador/data/prestador_repository.dart:117-136`, `mobile/flutter_app/lib/core/sync/sync_queue_repository.dart:4-33`, `mobile/flutter_app/lib/core/local_db/drift_sync_action_store.dart:28-55`
- Descrição: `selection.forEach` dispara `enqueue`, que é assíncrono, sem `await`, e o método retorna sucesso antes da durabilidade. Cada enqueue faz load-all/save-all, portanto SKUs concorrentes também podem sobrescrever a fila.
- Evidência:
  ```dart
  selection.forEach((sku, qty) {
    if (qty <= 0) return;
    final action = _actionFactory.create(
      // ...
    );
    _syncQueue.enqueue(action);
  });
  ```
- Impacto: Crash logo após confirmar materiais perde ações; seleção de vários materiais pode persistir só parte deles, divergindo consumo da OS e estoque.
- Correção sugerida: `for...in` com `await` ou `enqueueAll` atômico numa transação Drift; retornar apenas após commit da fila.
- Teste recomendado: Três SKUs com store atrasado e restart imediato após retorno; as três ações devem existir após reabrir o banco.

### [Ω6R-SEC-003] Lockout de login é caminho morto e permite tentativas ilimitadas
- Severidade: P1        Confiança: 1.00
- Categoria: SEC
- Módulo: auth        Lente: A2
- Local: `src/modules/auth/services/local-auth-login.service.ts:113-141`, `src/modules/auth/repositories/local-auth-credential.repository.ts:101-112`, `src/modules/auth/routes/auth.routes.ts:53-91`
- Descrição: Login consulta `locked_until`, mas senha incorreta apenas incrementa contador; não existe threshold nem gravação de lock. A rota pública também não aplica rate limit.
- Evidência:
  ```ts
  if (!passwordMatches) {
    await this.credentials.incrementFailedAttempts(credential.id, tenantId);
    await this.recordLoginFailure(tenantId, email, "invalid_credentials", auditContext);
    return { ok: false, reason: "invalid_credentials" };
  }
  ```
- Impacto: Ataque de força bruta/credential stuffing pode tentar senhas indefinidamente; resposta 423 é inalcançável pelo fluxo normal.
- Correção sugerida: Operação atômica que incrementa, aplica threshold/janela e `locked_until`; rate limit por conta/IP e reset somente em sucesso.
- Teste recomendado: N falhas concorrentes armam lock persistente; senha correta durante TTL retorna 423 e funciona após expiração.

### [Ω6R-SEC-004] Uploads produtivos usam scanner no-op e confiam no MIME declarado
- Severidade: P1        Confiança: 0.99
- Categoria: SEC
- Módulo: evidence / attachments / mobile        Lente: A2
- Local: `src/modules/evidence/evidence-storage.ts:46-53`, `src/modules/mobile/mobile-evidence-upload.ts:52-54`, `src/modules/attachments/attachment.storage.ts:52-61`, `src/modules/attachments/attachment.storage.ts:90-105`, `src/modules/attachments/attachment.routes.ts:71-83`
- Descrição: O scanner padrão sempre devolve `clean`; não há wiring produtivo alternativo. Multipart aceita MIME fornecido pelo cliente e download é `inline` com o mesmo MIME persistido.
- Evidência:
  ```ts
  export class NoopEvidenceScanner implements EvidenceScanner {
    async scan(): Promise<EvidenceScanResult> {
      return { status: "clean" };
    }
  }
  ```
- Impacto: Usuário autenticado armazena bytes hostis rotulados como imagem/PDF e o sistema os entrega inline a outros usuários, ampliando malware e active-content.
- Correção sugerida: Scanner obrigatório e fail-closed em produção, validação por magic bytes/decoder e quarentena; download como attachment quando inline não for necessário.
- Teste recomendado: EICAR/mock infected, MIME divergente e scanner indisponível não criam blob/linha nem permitem download.

### [Ω6R-DAT-004] Editar o perfil normativo re-tempera custódias em curso e a auditoria não registra o que mudou
- Severidade: P1        Confiança: 0.95
- Categoria: DAT
- Módulo: jurisdiction / charging        Lente: A3
- Origem: registrado na **reconciliação pós-merge de 2026-08-14**, quando o módulo `jurisdiction` foi de fato revisado (a matriz o marcava ✅ sem relatório). **Não passou pela votação de severidade da J-6R.**
- Local: `src/modules/jurisdiction/jurisdiction.service.ts:76-98`, `src/modules/jurisdiction/jurisdiction-prisma.repository.ts:63-89`, `src/modules/jurisdiction/jurisdiction.controller.ts:45-59`, `src/modules/charging/charge-prisma.repository.ts:226-231`, `src/modules/charging/charge.accrual.ts:159-164`, `src/modules/charging/charge.service.ts:131-134`, `src/modules/auction/auction.eligibility.ts:16-44`, `src/modules/jurisdiction/jurisdiction.defaults.ts:36-39`, `prisma/schema.prisma:2937-2956`
- Descrição: O `PATCH` do perfil normativo altera `scope`, prazos legais, `daily_model`, `daily_cap` e `release_requirements` **in place**, sem versão, sem data de vigência e sem qualquer guarda para perfis já referenciados. `ImpoundProcess.profile_id` é NOT NULL com FK `RESTRICT`, e o motor de diárias resolve o teto lendo o perfil **vivo** no instante do cálculo, não o regime vigente em `entered_at`. O comentário canônico declara que o teto do Tema 124 é intertemporal "por DATA DE ENTRADA", mas nada no código vincula o processo à sua data de entrada: `TEMA_124_LEGACY_CAP` é exportado e nunca consumido fora do teste. Em paralelo, a auditoria da edição grava apenas `{scope, active}` — não o campo alterado, nem o valor anterior, nem o novo.
- Evidência:
  ```ts
  // charge-prisma.repository.ts:226-231 — o teto vem do perfil ATUAL, não do vigente em entered_at
  SELECT ip.entered_at, ip.frozen_at, COALESCE(y.timezone, 'America/Sao_Paulo') AS timezone,
         jp.scope, jp.daily_model, jp.daily_cap, jp.daily_service_catalog_id
  FROM impound_processes ip
  JOIN jurisdiction_profiles jp ON jp.tenant_id = ip.tenant_id AND jp.id = ip.profile_id
  // jurisdiction.controller.ts:50-57 — a auditoria da edição não diz o que mudou
  metadata: { scope: profile.scope, active: profile.active },
  ```
- Impacto: Um `PATCH` autorizado (`jurisdiction:update`, que gestão e administradores possuem) re-tempera todas as custódias em curso ligadas ao perfil. Elevar o teto de `THIRTY_DAYS_LEGACY` para `SIX_MONTHS`/`UNLIMITED`, ou trocar `ROLLING_24H` por `CALENDAR`, muda o valor devido de bens que entraram sob o regime anterior — e nessa direção não há compensação: `charging` só detecta e estorna a **sobre**-acumulação (`reconciliationPending`/`overAccruedDailies` em `charge.service.ts:131-134`, estorno no settle), nunca a sub-acumulação. Como o registro não guarda de/para, a organização não consegue reconstruir sob qual regime cada diária foi cobrada — que é exatamente a prova exigida para sustentar uma cobrança de estada contestada. Mitigações reais, que limitam o alcance e por isso a severidade é P1 e não P0: o gate de leilão impõe piso federal de 60 dias com `max(profileDays, 60)` e exige `OWNER_INITIAL` satisfeita independentemente do perfil (`auction.eligibility.ts:16-44`), fechando a direção "encurtar o relógio para leiloar antes".
- Correção sugerida: Carimbar no processo o snapshot normativo vigente em `entered_at` (ou versionar o perfil e referenciar a versão a partir de `impound_processes`), fazendo os motores lerem o regime do processo em vez do perfil corrente; e auditar a edição campo a campo, com valor anterior e novo, sem PII (os campos são todos numéricos/enums, então cabem na allowlist do §2.8).
- Teste recomendado: Custódia com `entered_at` sob `THIRTY_DAYS_LEGACY`; `PATCH` do perfil para `SIX_MONTHS`; o extrato da custódia antiga mantém `capCount = 30` enquanto uma custódia nova nasce com o teto novo; e o registro de auditoria da edição contém o campo alterado com valor anterior e novo.

### [Ω6R-DIN-010] DELETE de lançamento de liquidação apaga o caixa, mantém o título pago e cria estado sem rota de saída
- Severidade: P0        Confiança: 1.00
- Status: **aguardando_merge** — achado NOVO da junta `J-B-O6R-02-ciclo1` (bloqueantes B-1 e B-2), medido por execução no head `e4e914a`; corrigido em autoria no ciclo 2 (C1), NÃO na main. Registrado por agente distinto de quem o achou e de quem o corrige (§C7.4-bis).
- Categoria: DIN
- Módulo: financial-entries / financial-titles        Lente: A3
- Local: `src/modules/financial-entries/financial-entry.service.ts:153-168`, `src/modules/financial-titles/financial-title-prisma.repository.ts:166-178`
- Descrição: `delete()` do serviço de lançamentos checa `assertMutable`, par de estorno e período — **nunca `titleId`**. Um lançamento de LIQUIDAÇÃO é, portanto, deletável: o caixa volta e o título continua com `paid_amount > 0`, sem lançamento vivo que o sustente. Agravante do mesmo diff: o CAS de `softDelete` do título passou a exigir `paid_amount = 0`, de modo que o título resultante também não tem saída pela API — `DELETE` do título dá 422 `title_has_payments` e o `reverse` do lançamento (já deletado) dá 404 `entry_not_found`.
- Evidência:
  ```
  DELETE do lancamento de LIQUIDACAO: PERMITIDO
    | titulo paid=40 status=partially_paid
    | saldo pos-pagamento=40 pos-delete=0
  apos apagar o lancamento: titulo.delete=422 title_has_payments
    | reverse do lancamento=404 entry_not_found
    | titulo paid=40 deleted_at=null
  ```
- Impacto: o dinheiro some por uma chamada HTTP, **com a mesma permissão de quem paga** — sem concorrência, sem crash, sem SQL cru. O razão perde a liquidação e o título segue quitado (as duas verdades incompatíveis do `Ω6R-DIN-002`, por outra porta). E o título fica num estado irreversível: nem se apaga nem se estorna.
- Correção sugerida: lançamento vinculado a um agregado só se desfaz **pelo fluxo do agregado**. `DELETE` de lançamento com `title_id` RECUSA (422 `settlement_entry_immutable`, mensagem apontando o remédio: use `reverse`), porque o `reverse` já devolve o pagamento ao título na mesma unidade, com contrapartida e trilha no razão. Ensinar o `delete` a devolver criaria uma **segunda semântica de desfazer** — exatamente a classe de defeito do `Ω6R-DIN-011`.
- Teste recomendado: pagar 40 de 100; `DELETE` do lançamento de liquidação → 422 `settlement_entry_immutable`, título e lançamento intactos; `reverse` → `paid_amount = 0` e status `open`; `DELETE` do título volta a ser aceito — a rota de saída provada ponta a ponta contra o Postgres.

### [Ω6R-DIN-011] Cheque devolve em dobro: o lançamento de compensação se desfaz por fora da máquina de estados
- Severidade: P0        Confiança: 1.00
- Status: **aguardando_merge** — achado NOVO da junta `J-B-O6R-02-ciclo1` (bloqueante B-3), medido por execução no head `e4e914a`; corrigido em autoria no ciclo 2 (C2), NÃO na main. Cruza com `Ω6R-DIN-003`: aquele nomeia a atomicidade de clear/bounce (corrigida e provada por ataque); este é o defeito **distinto** de duas portas desfazerem o mesmo dinheiro. Nada merge com este aberto.
- Categoria: DIN
- Módulo: cheques / financial-entries        Lente: A3
- Local: `src/modules/cheques/cheque.service.ts:164-235`, `src/modules/financial-entries/financial-entry.service.ts:153-246`
- Descrição: `clear`/`bounce` vinculam o lançamento ao cheque no nascimento (`cleared_entry_id`/`bounce_entry_id`, mesma unidade), mas a superfície de lançamentos (`delete`/`reverse`) **nunca consulta esse vínculo**. Estornar o lançamento de compensação é aceito e o cheque **continua `cleared`**; o `bounce` seguinte é legal e posta o contra-lançamento.
- Evidência:
  ```
  cheque +100 compensado -> reverse do lancamento: PERMITIDO -> bounce: PERMITIDO
    | saldo clear=100 reverse=0 bounce=-100 | cheque.status=bounced
  ```
- Impacto: **200 devolvidos num cheque de 100**. O estado do cheque diverge do razão e o caixa é debitado duas vezes. A suíte do ciclo 1 afirmava a invariante como **existência** do lançamento, nunca como **efeito líquido** — o lançamento existe; o dinheiro já voltou.
- Correção sugerida: lançamento referenciado por `cleared_entry_id` ou `bounce_entry_id` recusa `delete` **e** `reverse` pela superfície de lançamentos (422 `cheque_entry_immutable`); desfazer vira exclusividade da máquina de estados do cheque. A invariante nos testes passa a ser de EFEITO: `net(lançamentos vivos do cheque) ∈ {+valor (cleared), 0 (bounced após clear), sem lançamento (demais)}`.
- Teste recomendado: `clear` +100 → `reverse` do lançamento de compensação → 422 `cheque_entry_immutable`, cheque segue `cleared` e `net = +100` → `bounce` → `net = 0`, **nunca −100**. Idem para o `delete` do lançamento de compensação e o `reverse` do contra-lançamento de `bounce`.

## Hipóteses a confirmar

Nenhuma hipótese registrada até o momento.

## Dívida observada

Três dívidas registradas (`Ω6R-DIV-001`, `-002`, `-003`), detalhadas abaixo. Nenhuma delas é achado: são
lacunas conhecidas e declaradas, sem defeito executável comprovado nesta rodada. (Até 2026-08-14 esta linha
dizia "Nenhuma dívida registrada até o momento" logo acima das três entradas — contradição corrigida na
reconciliação pós-merge, sem alterar as dívidas em si.)

### [Ω6R-DIV-001] Outbox de custódia não possui dispatcher nem Inbox
- Estado: observado na Fase 2; não é achado novo porque a migration declara explicitamente a entrega futura.
- Local: `prisma/migrations/20260853000000_add_impound_outbox_events/migration.sql:12-19`
- Direção: implementar dispatcher com lease/retry e consumidor idempotente antes de depender de efeitos externos do Outbox.

### [Ω6R-DIV-002] Lint raiz não executa ESLint
- Estado: observado na Fase 1/A5.
- Local: `package.json` (`lint` delega a `npm run check`).
- Direção: configurar lint real e transformar supressões React Hooks em regras verificáveis; sem classificar estilo como defeito de produto.

### [Ω6R-DIV-003] Dependências possuem avisos sem exploit produtivo confirmado
- Estado: 15 avisos nos quatro workspaces; 0 com caminho produtivo confirmado.
- Local: `01_VARREDURAS/06_npm_audit_root.json.txt` a `09_npm_audit_authority_portal.json.txt`.
- Direção: atualizar em bloco próprio de supply chain, validando regressões; não tratar CVE transitivo de build como P0.

## Checagem de consistência da Fase 4

- Executada em 2026-08-11.
- Achados no Markdown: 29; IDs únicos: 29.
- Linhas válidas no JSONL: 29; IDs JSONL fora do Markdown: 0.
- IDs únicos citados em `02_MODULOS/` + `03_TRANSVERSAIS/`: 29.
- Achados sem relatório: 0; citações órfãs: 0; superseded: 0.
- Fechamento: 100% consistente (registro ↔ JSONL ↔ relatórios).

## Atualizações por votação — Fase 4

- Ω6R-SEC-002: P0 mantido por 5×0.
- Ω6R-DAT-001: P0 mantido por 5×0.
- Ω6R-DIN-005: P0 mantido por 5×0.
- Ω6R-DIN-006: P0 mantido por 5×0.
- Ω6R-DIN-007: P0 mantido por 3×2; A3/A4 defenderam P1 porque não há mutação direta do ledger.
- Ω6R-DAT-002: P0 mantido por 5×0.
- Ω6R-DAT-003: P0 mantido por 5×0.
- Veredito: REPROVADO PARA PRODUÇÃO por 5×0. O Relator não votou.

## Checagem de consistência da Fase 5 — reconciliação pós-merge

> Esta seção substitui a segunda ocorrência de "Checagem de consistência da Fase 4", que dizia apenas
> "Pendente" e contradizia a checagem homônima acima (fechada em 100%). A checagem da Fase 4 permanece
> intacta como registro do que a J-6R votou; esta registra o estado **depois** do merge do #347.

- Executada em 2026-08-14 sobre `origin/main` `e80430a`.
- Achados no Markdown: 30; IDs únicos: 30. Linhas válidas no JSONL: 30; IDs JSONL fora do Markdown: 0.
- Delta desde a Fase 4: **+1** — `Ω6R-DAT-004` (P1), registrado ao revisar de fato o módulo `jurisdiction`,
  que a matriz marcava ✅ nas cinco lentes sem relatório correspondente. Não foi votado pela J-6R.
- Superação: **1 parcial** — `Ω6R-QUA-004` teve o componente *timeline* corrigido pelo PR #351 (`7e60b90`);
  detalhe, status e assign seguem abertos. Nenhum achado foi fechado.
- Relatórios de módulo: 70/70 (era 69/70; `02_MODULOS/jurisdiction.md` criado nesta reconciliação).
- Achados sem relatório: 0; citações órfãs: 0.

## Checagem de consistência da Fase 6 — primeiros fechamentos

- Executada em 2026-08-16 sobre `main` `d0cdada`.
- Achados no Markdown: 30; IDs únicos: 30. Linhas válidas no JSONL: 30; IDs JSONL fora do Markdown: 0.
- Delta desde a Fase 5: **nenhum achado novo**. O que mudou foi **estado**, não população.
- **Primeiros fechamentos da auditoria: 2.** `Ω6R-DAT-001` e `Ω6R-DIN-006`, ambos P0, ambos pelo B-O6R-05
  (PR #353, `a8901ff`), com o complemento do PR #354 no segundo. Registrados aqui e no JSONL com
  `fechado_em`, `fechado_por` e evidência.
- Distribuição resultante: **P0 15 (2 fechados, 13 abertos) · P1 15 (0 fechados, 15 abertos)** —
  1 dos abertos é o parcialmente superado `Ω6R-QUA-004`.
- **Atualização 2026-08-18 (B-O6R-01):** `Ω6R-SEC-001` e `Ω6R-TEN-001` fechados (seções acima e JSONL,
  com rastro). Distribuição passa a **P0 15 (4 fechados, 11 abertos) · P1 15 (0 fechados, 15 abertos)**.
- **O veredito da J-6R segue integral:** REPROVADO PARA PRODUÇÃO. Fechar 4 de 15 P0 não move o veredito, e
  esta seção existe para que o número de fechados nunca seja lido como progresso de liberação.
- Backfill executado ao repaginar o painel de KPI: antes desta seção, o registro dizia 29 ativos enquanto o
  painel já contaria 2 fechados. A divergência foi encontrada pelo próprio trabalho do painel.
- **Achado órfão fechado: `Ω6R-DAT-004` não tinha bloco de correção.** O `PLANO_O6R.md` é de 2026-08-11 e
  cobria os 29 achados de então; o DAT-004 entrou na Fase 5 (2026-08-14) e ficou de fora do cronograma —
  aberto, e invisível para quem lesse o plano. Fechado com a linha 12 (`B-O6R-12`), marcada no plano como
  adendo pós-junta e com critério de aceite **provisório**.
- **Mecanismo permanente:** `tests/kpi-achados-paridade.test.ts` passa a exigir, na bateria, que
  JSONL ↔ painel ↔ registro contem a mesma história — contagem por severidade, estado de cada achado, rastro
  de quem fechou, e **todo achado aberto coberto por um bloco do cronograma**. Foi ele que encontrou o órfão,
  na primeira execução. Antes disso, os três artefatos eram mantidos em paridade **à mão**, e já haviam
  divergido duas vezes nesta mesma seção.
