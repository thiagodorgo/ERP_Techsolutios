# Registro central de achados — Ω6R

Junta: J-6R  
Branch: `revisao/o6r-auditoria-total`  
Regra: append-only; um achado só existe após verificação do Relator e registro simultâneo neste arquivo e em `achados.jsonl`.

## Contadores de ID

| Categoria | Próximo número |
|---|---:|
| SEC | 002 |
| TEN | 002 |
| DIN | 006 |
| DAT | 002 |
| PERF | 001 |
| ARQ | 001 |
| QUA | 001 |
| LGPD | 001 |
| DEP | 001 |
| HIP | 001 |
| DIV | 001 |

## Achados

### [Ω6R-DIN-001] Pagamento concorrente pode criar lançamento órfão e inflar o saldo
- Severidade: P0        Confiança: 0.99
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

## Hipóteses a confirmar

Nenhuma hipótese registrada até o momento.

## Dívida observada

Nenhuma dívida registrada até o momento.

## Checagem de consistência da Fase 4

Pendente.
