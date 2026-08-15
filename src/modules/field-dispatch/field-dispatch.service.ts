import { env } from "../../config/env.js";
import { publishDomainEvent } from "../../infra/events/domain-event.publisher.js";
import type { ICoreSaasService } from "../core-saas/services/core-saas-service.interface.js";
import { WorkOrderError, type WorkOrder } from "../work-orders/work-order.types.js";
import {
  createDefaultWorkOrderService,
  createMemoryWorkOrderService,
  type WorkOrderService,
} from "../work-orders/work-order.service.js";
import {
  createDefaultChecklistService,
  createMemoryChecklistService,
  type ChecklistService,
} from "../checklists/checklist.service.js";
import {
  createDefaultNotificationService,
  createMemoryNotificationService,
  type NotificationService,
} from "../notifications/notification.service.js";
import {
  InMemoryFieldDispatchRepository,
  type FieldDispatchRepository,
} from "./field-dispatch.repository.js";
import type { ChecklistRunRole } from "../checklists/checklist.types.js";
import type { WorkOrderChecklistLink } from "../work-orders/work-order-checklists.types.js";
import type {
  DispatchChecklistLine,
  FieldDispatch,
  FieldDispatchActorContext,
  FieldDispatchEvent,
  FieldDispatchStatus,
  ListFieldDispatchesInput,
  ListFieldDispatchesResult,
} from "./field-dispatch.types.js";
import { FIELD_DISPATCH_TARGET_ROLES, FieldDispatchError } from "./field-dispatch.types.js";
import {
  assertNonTerminalStatus,
  assertStatusTransition,
  optionalString,
  parseFieldDispatchStatus,
  parseInitialFieldDispatchStatus,
  parseLimit,
  parseOffset,
  parseOptionalSearch,
  parseOptionalUuid,
  parseRequiredUuid,
} from "./field-dispatch.validators.js";

type RawRecord = Record<string, unknown>;

// Ω3-c (port do crítico, Req C) — resolve o snapshot congelável de um checklist SEM que este módulo
// importe `checklists` diretamente (dependency-inverted; a raiz de composição injeta o resolver).
// Retorna null quando não há template publicado — o despacho segue sem checklist.
export type ChecklistSnapshotResolver = (tenantId: string, checklistId: string) => Promise<Record<string, unknown> | null>;

// D-CHK-DISPATCH-CREATE — provisiona a RUN do checklist como EFEITO DE DOMÍNIO do despacho (mesmo padrão de
// inversão de dependência do resolver de snapshot: a raiz de composição injeta um provisioner que fala com
// `checklists`, sem este módulo importar aquele). Deve ser IDEMPOTENTE (chave determinística por OS+checklist):
// re-despacho/reassign da mesma OS NÃO cria run duplicada. Sem injeção → no-op (despacho segue sem run).
export type ChecklistRunProvisioner = (input: {
  readonly tenantId: string;
  readonly actorUserId: string;
  readonly workOrderId: string;
  readonly checklistId: string;
  // CHECKLIST P1 PR-04c (§8/§9) — a FASE da linha que originou a execução. Entra na `client_run_key` (a
  // identidade da vistoria passou a incluir a fase) e é carimbada na própria execução.
  readonly role: ChecklistRunRole;
}) => Promise<void>;

// CHECKLIST P1 PR-04c (ciclo 4) — A PERGUNTA QUE O DESPACHO PRECISA FAZER: **esta vistoria foi ao campo?**
//
// Três ciclos desta fatia responderam essa pergunta com substitutos, e todos os substitutos erram:
//
//  · "dá para criar?" (TENTAR provisionar) — responde, mas ESCREVE. `provisionChecklistRun` pode criar
//    (basta uma publicação concorrente na janela entre `resolveChecklistSnapshot` e o laço) e pode carimbar
//    (`stampRunRole`, na adoção da chave legada). Auditoria que muta o que audita não é auditoria; e criar
//    aqui violaria a escolha (b) do §7.3, que reserva a execução à linha primária.
//  · "está congelada?" (`frozenSnapshot !== null`) — erra nas DUAS direções, porque quem congela e quem
//    provisiona são caminhos diferentes: o `create` é FAIL-OPEN (congela e a provisão pode falhar), logo
//    existe linha CONGELADA com zero execução; e o `reassign` provisiona SEM congelar (é read-only sobre
//    snapshots — ver `provisionChecklistRunForDispatch`), logo existe EXECUÇÃO VIVA com zero congelamento.
//    Este segundo estado é o de toda ordem legada recuperada por reatribuição — hoje, o universo inteiro.
//
// Por isso a pergunta ganhou um verbo próprio, READ-ONLY, com a mesma inversão de dependência do
// provisionador: a raiz de composição o constrói a partir do `ChecklistService`, e este módulo não importa
// aquele. Consulta as MESMAS duas chaves do provisionador — a com fase e, só para `generic`, a LEGADA —
// porque a pergunta é sobre a mesma identidade de vistoria que o provisionamento grava.
//
// NUNCA lança por decisão de negócio: `false` é "não existe execução". Um erro que escape daqui é falha de
// INFRAESTRUTURA, e o chamador o trata como tal (nunca como fato de negócio na tela do campo).
export type ChecklistRunLookup = (input: {
  readonly tenantId: string;
  readonly actorUserId: string;
  readonly workOrderId: string;
  readonly checklistId: string;
  readonly role: ChecklistRunRole;
}) => Promise<boolean>;

/** O alvo de um dos eventos que o despacho escreve na história da ORDEM: modelo + etapa daquela linha. */
export type WorkOrderChecklistSetEventInput = {
  readonly tenantId: string;
  readonly actorUserId: string;
  readonly workOrderId: string;
  readonly checklistId: string;
  readonly role: ChecklistRunRole;
};

// CHECKLIST P1 PR-04c (§7) — o CONJUNTO de vistorias da ordem de serviço, visto pelo despacho.
//
// Os quatro verbos viajam JUNTOS num porto só, e isso é proposital: quem entrega o conjunto assume também o
// congelamento das linhas que não viram execução e a linha do tempo delas. Fosse um porto por verbo, daria
// para ligar a leitura e "esquecer" a auditoria — e a escolha (b) do §7.3 (persistir N, provisionar 1) só é
// honesta porque a vistoria diferida APARECE.
//
// O porto é OBRIGATÓRIO no construtor (não mais um parâmetro opcional), e isso é a correção de um buraco real:
// enquanto ele era opcional, as duas raízes de composição de PRODUÇÃO montavam o serviço sem ele e o despacho
// enxergava toda ordem pela visão sintética. Numa ordem cuja linha primária tenha fase CONCRETA — o ajuste do
// operador já cria uma — a execução nascia carimbada `generic`, proveniência ERRADA gravada em cima de prova e
// INCORRIGÍVEL (o carimbo de fase nunca sobrescreve), e no dia em que o porto fosse ligado a linha pediria a
// sua própria chave, daria miss, e nasceria uma segunda execução — uma unidade FATURADA nova. Com o parâmetro
// obrigatório, compor sem porto virou erro de compilação em vez de dano silencioso em produção.
//
// INTEGRAÇÃO: `load` tem, de propósito, a assinatura de `WorkOrderService.listChecklistLinks` — ligar o porto é
// devolver o que aquele método já devolve, sem tradução no meio.
export type WorkOrderChecklistSetPort = {
  /**
   * As linhas VIVAS da ordem, já na ordem de precedência (menor `order_index` primeiro, desempate por
   * `created_at`/`id`). Lista vazia ⇒ o despacho cai na visão sintética da ordem antiga.
   */
  readonly load: (tenantId: string, workOrderId: string) => Promise<readonly WorkOrderChecklistLink[]>;
  /**
   * Congela o formulário das linhas que NÃO são a primária (a primária já é congelada por
   * `WorkOrderService.freezeChecklistSnapshot`, que grava o espelho da ordem e a linha primária na mesma
   * escrita).
   *
   * Por que congelar uma vistoria que não vai a campo agora: o freeze é a garantia de que o técnico responde o
   * formulário como publicado no INSTANTE do despacho. Congelar só a primária deixaria a vistoria de entrega
   * sem essa garantia, e quando ela for provisionada (PR do app) seria congelada com um formulário de outra
   * época. Congelar N custa uma coluna JSONB e ZERO faturamento; não congelar custa a garantia.
   */
  readonly freeze: (input: {
    readonly tenantId: string;
    readonly actorUserId: string;
    readonly workOrderId: string;
    readonly entries: readonly {
      readonly checklistId: string;
      readonly role: ChecklistRunRole;
      readonly snapshot: Record<string, unknown> | null;
    }[];
  }) => Promise<void>;
  /**
   * Registra na história da ORDEM que uma vistoria do conjunto ficou para depois. É o que impede a escolha (b)
   * de ser silêncio: a linha do tempo da ORDEM (`work_order_events`, não a do despacho) é a que o aplicativo de
   * campo lê, então o guincheiro vê que existe uma segunda vistoria mesmo antes de o app saber abri-la.
   *
   * A implementação de produção (`buildWorkOrderChecklistSetPort`) grava nessa tabela; é a única que as duas
   * raízes de composição ligam. Um dublê de teste pode só contar chamadas — daí a suíte que exercita a
   * composição REAL e confere o evento na timeline da ordem, e não apenas a chamada ao porto.
   */
  readonly recordDeferred: (input: WorkOrderChecklistSetEventInput) => Promise<void>;
  /**
   * ALTA 9 — a VISTORIA PROMETIDA QUE NÃO FOI. O modelo foi arquivado/despublicado entre a criação da ordem e o
   * despacho: não há formulário para congelar, a vistoria não vai a campo, e antes desta fatia isso era um `if`
   * que não entrava — sumiço sem nenhuma linha, descoberto só no litígio.
   *
   * Simétrico ao `recordDeferred` e pela mesma razão: a falha JÁ era registrada na timeline do DESPACHO (que
   * serve o escritório) e notificada ao operador; o que faltava era o lado que chega a quem está com o veículo
   * na mão. Escrever em `work_order_events` é escrever na tela do guincheiro sem uma linha de Dart.
   */
  readonly recordMissingAtDispatch: (input: WorkOrderChecklistSetEventInput) => Promise<void>;
};

// D-CHK-DISPATCH-CREATE (achado MÉDIA do crítico, item 3b) — quando a provisão da run FALHA (fail-open), além
// do evento durável na timeline emite-se uma NOTIFICAÇÃO ao operador para a falha não ficar invisível. A aresta
// field-dispatch→notifications vive só na raiz de composição (dependency-inverted, como o provisioner): a raiz
// injeta um notifier que fala com o motor de notificações. Sem injeção → no-op. Best-effort (nunca 500).
export type ChecklistRunFailureNotifier = (input: {
  readonly tenantId: string;
  readonly recipientUserId: string;
  readonly workOrderId: string;
  readonly dispatchId: string;
  readonly checklistId: string;
  readonly reasonCode: string;
}) => Promise<void>;

export class FieldDispatchService {
  constructor(
    private readonly repository: FieldDispatchRepository,
    private readonly workOrderService: WorkOrderService,
    private readonly coreService: ICoreSaasService,
    private readonly resolveChecklistSnapshot: ChecklistSnapshotResolver = async () => null,
    private readonly provisionChecklistRun: ChecklistRunProvisioner = async () => {},
    private readonly notifyChecklistRunFailure: ChecklistRunFailureNotifier = async () => {},
    // OBRIGATÓRIO (CHECKLIST P1 PR-04c): ver a razão inteira no comentário de `WorkOrderChecklistSetPort`.
    // Parâmetro sem default depois de parâmetros com default é legal e é o ponto: nenhuma raiz de composição
    // consegue mais montar o despacho "esquecendo" o conjunto de vistorias.
    private readonly workOrderChecklistSet: WorkOrderChecklistSetPort,
    // OBRIGATÓRIO pela mesma razão, e não por simetria: um default aqui seria uma resposta INVENTADA sobre
    // prova. `async () => false` faria toda ordem de uma raiz desatenta declarar ao guincheiro que a vistoria
    // que ele tem na mão não foi enviada; `async () => true` calaria a vistoria que de fato sumiu. Não existe
    // default honesto para "esta vistoria foi ao campo?", então compor sem a leitura é erro de compilação.
    private readonly hasChecklistRun: ChecklistRunLookup,
  ) {}

  async list(actor: FieldDispatchActorContext, query: RawRecord): Promise<ListFieldDispatchesResult> {
    const input: ListFieldDispatchesInput = {
      tenantId: actor.tenantId,
      status: query.status ? parseFieldDispatchStatus(query.status) : undefined,
      workOrderId: parseOptionalUuid(query.workOrderId, "workOrderId"),
      operatorUserId: parseOptionalUuid(query.operatorUserId, "operatorUserId"),
      search: parseOptionalSearch(query.search),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    };

    return this.repository.list(input);
  }

  async create(actor: FieldDispatchActorContext, body: RawRecord): Promise<FieldDispatch> {
    const workOrderId = parseRequiredUuid(body.workOrderId, "workOrderId");
    const operatorUserId = parseRequiredUuid(body.operatorUserId ?? body.operatorId ?? body.userId, "operatorUserId");
    const status = parseInitialFieldDispatchStatus(body.status);

    const workOrder = await this.assertWorkOrderBelongsToTenant(actor, workOrderId);
    await this.assertOperatorBelongsToTenant(actor.tenantId, operatorUserId);

    // Ω3-c (E1/E3) — congela o snapshot ANTES de criar o despacho (freeze→create; falha após o freeze deixa a
    // OS com snapshot órfão, inócuo — nunca despacho sem checklist). Idempotente: re-despacho re-congela com o
    // template vigente daquele momento.
    //
    // CHECKLIST P1 PR-04c (§7.1/§7.2) — congela TODAS as vistorias vivas da ordem, não só a que vira execução.
    // "Todas" é literal e verificável: o porto é obrigatório e as duas raízes ligam a leitura crua da junção,
    // então uma ordem com coleta + entrega sai deste bloco com as DUAS linhas carimbadas.
    const lines = await this.loadDispatchChecklistLines(actor, workOrder);
    const frozen = await Promise.all(
      lines.map(async (line) => ({
        line,
        snapshot: await this.resolveChecklistSnapshot(actor.tenantId, line.checklistId),
      })),
    );

    // O espelho da ordem (`work_orders.checklist_snapshot`) recebe o snapshot da linha PRIMÁRIA — e essa mesma
    // escrita congela a linha primária da junção. Numa ordem de uma vistoria só (todas as de hoje) isto é
    // literalmente o comportamento anterior.
    //
    // BLOQUEANTE 1 (ciclo 2 da revisão) — O RE-DESPACHO NÃO APAGA MAIS O FORMULÁRIO CONGELADO.
    //
    // `resolveChecklistSnapshot` devolve `null` quando o modelo saiu de circulação (arquivado/inativado — fluxo
    // NORMAL do editor), e nada impede um segundo despacho da mesma ordem: não há unique em
    // `field_dispatches(work_order_id)` e o comentário acima diz literalmente "re-despacho re-congela". O que o
    // código fazia com esse `null` era ESCREVER POR CIMA do congelamento do despacho anterior — no espelho da
    // ordem, na linha primária da junção (que desde o PR-04c-A é gravada na MESMA escrita) e em cada linha
    // secundária. O formulário que o técnico recebeu deixava de existir, sem cópia em lugar nenhum: perda de
    // PROVA irrecuperável, a garantia Ω3-c (E1/E3) prometida no docblock do porto virando mentira e a invariante
    // do §7.4.2 ("nenhuma linha viva de OS despachada tem snapshot NULL") quebrada em silêncio.
    //
    // O freeze passa a ser MONOTÔNICO: grava quando há formulário publicado para gravar, PRESERVA quando não há.
    // Nunca zera. Congelar é acumular prova; nenhum caminho de despacho tem motivo para apagá-la.
    const primary = frozen[0];
    const secondary = frozen.slice(1);
    await this.workOrderService.freezeChecklistSnapshot(
      actor,
      workOrder.id,
      primary?.snapshot ?? primary?.line.frozenSnapshot ?? null,
    );

    // Idem para as secundárias: a linha que já foi congelada por um despacho anterior fica como está. Passar
    // `snapshot: null` aqui zeraria a coluna `checklist_snapshot` daquela linha (é o contrato de
    // `freezeChecklistLinkSnapshots`: ele grava o que recebe, inclusive nulo).
    const freezable = secondary.filter(({ snapshot }) => snapshot !== null);
    if (freezable.length > 0) {
      await this.workOrderChecklistSet.freeze({
        tenantId: actor.tenantId,
        actorUserId: actor.userId,
        workOrderId: workOrder.id,
        entries: freezable.map(({ line, snapshot }) => ({
          checklistId: line.checklistId,
          role: line.role,
          snapshot,
        })),
      });
    }

    // D-CHK-DISPATCH-CREATE — EFEITO DE DOMÍNIO NÃO-AMPLIFICADOR: logo após o freeze, provisiona a execução da
    // vistoria ligada à OS, SÓ quando há modelo publicado (mesma condição do freeze: linha viva E
    // `snapshot != null`). A autoridade é `field_dispatch:create` (já exigida na rota) — este efeito NÃO
    // re-checa `checklist_runs:create` do despachante (o provisioner chama o serviço de domínio, que não faz
    // checagem de permissão), então não amplifica permissão. Nem o conjunto muda isso: N vistorias continuam
    // sendo ZERO verificações de permissão a mais. FAIL-OPEN: a falha ao criar a execução NÃO bloqueia o
    // despacho; o erro é guardado para AUDITAR na timeline abaixo (nunca engolido em silêncio — senão o
    // guincheiro baixaria a OS sem execução e o checklist se perderia, que é o data-loss que aquele PR
    // consertou).
    //
    // CHECKLIST P1 PR-04c (§7.3, escolha (b) da junta) — SÓ A LINHA PRIMÁRIA VIRA EXECUÇÃO.
    // Medido no app de campo: nenhuma navegação em `lib/` passa `kind=delivery` e nenhuma tela alcança a de
    // comparação; a tela de detalhe mostra UM cartão de vistoria e a trava de conclusão fala do checklist
    // singular. Provisionar N execuções hoje entregaria N unidades FATURADAS que ninguém consegue preencher — e
    // execução vazia entra AUTOMATICAMENTE no dossiê de custódia, que é prova jurídica lida por autoridade.
    // Errar por diferir é aditivo e curável (o formulário certo já está congelado); errar por provisionar cobra
    // e polui prova, e nenhum dos dois se desfaz.
    let checklistRunProvisionError: unknown;
    if (primary && primary.snapshot) {
      try {
        await this.provisionChecklistRun({
          tenantId: actor.tenantId,
          actorUserId: actor.userId,
          workOrderId: workOrder.id,
          checklistId: primary.line.checklistId,
          role: primary.line.role,
        });
      } catch (error) {
        checklistRunProvisionError = error;
      }
    }

    // As vistorias que NÃO viraram execução neste despacho, cada uma com a sua razão. Nenhuma some em silêncio:
    // a de modelo despublicado vira falha auditada (ALTA 9) e a diferida vira linha na história da ordem.
    //
    // ALTA 2 (ciclo 2 da revisão) — O AVISO SÓ SAI QUANDO O FATO NEGATIVO É VERDADEIRO.
    //
    // "Não há snapshot novo para congelar" não é o mesmo fato que "a vistoria não foi ao técnico". Uma ordem
    // despachada com sucesso, com a execução criada e o guincheiro respondendo, cujo modelo foi arquivado
    // DEPOIS: no re-despacho, `snapshot === null` — e a timeline da ORDEM (a que o aplicativo baixa) recebia
    // "Uma vistoria da coleta não foi enviada ao técnico: o modelo não está publicado". ELA FOI. É exatamente a
    // classe que o comentário do `provisionChecklistRunForDispatch` condena ("auditoria que afirma um fato
    // negativo falso é pior que auditoria ausente").
    //
    // CICLO 4 — O LAÇO PASSOU A FAZER A PERGUNTA CERTA, EM VEZ DE ADIVINHAR POR UM SUBSTITUTO.
    //
    // O ciclo 2 discriminou por `frozenSnapshot !== null` (lendo congelamento como envio) e o ciclo 3 inverteu
    // para `frozenSnapshot === null` (lendo ausência de congelamento como ausência de envio). Os dois erram,
    // porque CONGELAR e PROVISIONAR são caminhos diferentes: o `create` é fail-open (congela e a provisão pode
    // falhar ⇒ congelada sem execução) e o `reassign` provisiona sem congelar (⇒ execução sem congelamento —
    // o estado de toda ordem legada recuperada por reatribuição). E o ciclo 3 respondia TENTANDO provisionar,
    // o que escreve: uma publicação concorrente na janela entre a resolução do snapshot e este laço fazia o
    // `createRun` ter sucesso e nascer uma execução SECUNDÁRIA — unidade faturada nova, execução vazia no
    // dossiê de custódia e a escolha (b) do §7.3 violada por uma corrida.
    //
    // Agora a pergunta é feita direto e por LEITURA: existe execução desta vistoria? A decisão é uma só, sem
    // ramo estreito, e `frozenSnapshot` saiu dela — ele nunca foi a resposta.
    //
    //   snapshot vivo    ⇒ nada a declarar (a vistoria está publicada; a primária virou execução acima)
    //   execução existe  ⇒ SILÊNCIO, e agora o silêncio é verdadeiro
    //   nenhuma das duas ⇒ a vistoria prometida não foi, e a linha é verdadeira
    //
    // A leitura FALHANDO é o terceiro caso, e não pode ser confundido com os outros dois: incidente de
    // servidor não é decisão da organização. Ele vira `unexpected` só na timeline do DESPACHO, jamais na
    // história da ORDEM — a mesma regra que o `reassign` já pratica e escreve no próprio comentário 300 linhas
    // abaixo ("falha de infraestrutura NÃO vira linha na tela do campo").
    const deferredLines = secondary.filter(({ snapshot }) => snapshot !== null).map(({ line }) => line);
    const unpublishedLines: DispatchChecklistLine[] = [];
    const lookupFailedLines: DispatchChecklistLine[] = [];

    for (const { line, snapshot } of frozen) {
      if (snapshot !== null) continue;

      let alreadyInField: boolean;
      try {
        alreadyInField = await this.hasChecklistRun({
          tenantId: actor.tenantId,
          actorUserId: actor.userId,
          workOrderId: workOrder.id,
          checklistId: line.checklistId,
          role: line.role,
        });
      } catch {
        lookupFailedLines.push(line);
        continue;
      }

      if (!alreadyInField) {
        unpublishedLines.push(line);
      }
    }

    const dispatch = await this.repository.create({
      tenantId: actor.tenantId,
      workOrderId,
      operatorUserId,
      status,
      observation: optionalString(body.observation),
      reason: optionalString(body.reason),
      createdBy: actor.userId,
      updatedBy: actor.userId,
      metadata: {},
    });

    await this.repository.createEvent({
      tenantId: actor.tenantId,
      dispatchId: dispatch.id,
      workOrderId: dispatch.workOrderId,
      eventType: "field_dispatch_created",
      toStatus: dispatch.status,
      actorUserId: actor.userId,
      message: "Despacho operacional criado.",
      metadata: {
        operatorUserId: dispatch.operatorUserId,
      },
    });

    // D-CHK-DISPATCH-CREATE — auditoria FAIL-OPEN: se a provisão da execução falhou acima, registra a falha na
    // timeline do despacho (durável/visível) + notifica o operador. Reason CODIFICADO (§2.8), nunca o
    // error.message cru. O despacho segue 201. (`primary` é garantido não-nulo neste ramo.)
    if (checklistRunProvisionError && primary) {
      await this.recordChecklistRunFailure(
        actor,
        dispatch,
        primary.line.checklistId,
        classifyChecklistProvisionError(checklistRunProvisionError),
      );
    }

    // CHECKLIST P1 PR-04c (ALTA 9) — VISTORIA PROMETIDA QUE NÃO FOI.
    //
    // Até aqui, modelo sem publicação era um `if` que simplesmente não entrava (`checklistId && snapshot`):
    // skip SILENCIOSO, fora do caminho de auditoria, que só cobria EXCEÇÃO. Com a regra de aplicabilidade, a
    // vistoria foi prometida no nascimento da ordem; se o modelo for arquivado ou despublicado entre a criação
    // e o despacho, ela sumia sem uma linha na história — e ninguém descobria até o litígio. Agora vira falha
    // auditada + notificação, com razão codificada. O `event_type` já era admitido pelo CHECK (migração
    // 20260858000000): sem migração nova.
    //
    // DOIS registros, dois públicos, e nenhum dos dois é redundante: a timeline do DESPACHO + a notificação
    // servem o escritório (quem despachou precisa agir); `work_order_events` é a timeline da ORDEM, que o
    // aplicativo de campo baixa — é lá que a ausência chega a quem está com o veículo. O laudo do crítico media
    // exatamente isto: só o primeiro existia, e o guincheiro não via nada da vistoria prometida que não veio.
    for (const line of unpublishedLines) {
      await this.recordChecklistRunFailure(actor, dispatch, line.checklistId, "template_not_published");
      await this.workOrderChecklistSet.recordMissingAtDispatch({
        tenantId: actor.tenantId,
        actorUserId: actor.userId,
        workOrderId: dispatch.workOrderId,
        checklistId: line.checklistId,
        role: line.role,
      });
    }

    // CICLO 4 — INCIDENTE DE SERVIDOR NÃO VIRA FATO DE NEGÓCIO NA TELA DO CAMPO.
    //
    // A leitura de "esta vistoria foi ao campo?" não respondeu (banco fora do ar, timeout). O que se sabe é
    // que NÃO SE SABE — e escrever `template_not_published` aqui seria afirmar ao guincheiro, no documento
    // que vira prova, uma decisão que a organização não tomou. Um destinatário só, então: a timeline do
    // DESPACHO, que serve o escritório e é quem pode re-despachar. É a mesma regra que o `reassign` já
    // pratica e documenta no `catch` do provisionamento.
    for (const line of lookupFailedLines) {
      await this.recordChecklistRunFailure(actor, dispatch, line.checklistId, "unexpected");
    }

    // CHECKLIST P1 PR-04c (§7.3) — a contrapartida de provisionar só a primária: cada vistoria que ficou para
    // depois APARECE na história da ordem, que o app de campo lê. Diferir em silêncio seria a mesma doença que
    // a decisão do dono nomeia, pelo avesso — efeito sem superfície.
    for (const line of deferredLines) {
      await this.workOrderChecklistSet.recordDeferred({
        tenantId: actor.tenantId,
        actorUserId: actor.userId,
        workOrderId: dispatch.workOrderId,
        checklistId: line.checklistId,
        role: line.role,
      });
    }

    await publishDomainEvent(
      "field_dispatch.created",
      {
        entity_type: "field_dispatch",
        entity_id: dispatch.id,
        work_order_id: dispatch.workOrderId,
        operator_user_id: dispatch.operatorUserId,
        status: dispatch.status,
      },
      { tenantId: actor.tenantId, actorId: actor.userId },
    );

    return dispatch;
  }

  async get(actor: FieldDispatchActorContext, dispatchId: string): Promise<FieldDispatch> {
    const dispatch = await this.repository.findById(actor.tenantId, parseRequiredUuid(dispatchId, "dispatchId"));

    if (!dispatch) {
      throw new FieldDispatchError(404, "FIELD_DISPATCH_NOT_FOUND", "not_found", "Dispatch was not found.");
    }

    return dispatch;
  }

  async changeStatus(actor: FieldDispatchActorContext, dispatchId: string, body: RawRecord): Promise<FieldDispatch> {
    const current = await this.get(actor, dispatchId);
    const nextStatus = parseFieldDispatchStatus(body.status);
    const message = optionalString(body.message) ?? defaultStatusMessage(nextStatus);
    const reason = optionalString(body.reason);
    const observation = optionalString(body.observation);

    assertStatusTransition(current.status, nextStatus);
    if (nextStatus === "cancelled" && !reason) {
      throw new FieldDispatchError(400, "FIELD_DISPATCH_INVALID", "cancel_reason_required", "reason is required when cancelling a dispatch.");
    }

    const updated = await this.repository.changeStatus({
      tenantId: actor.tenantId,
      dispatchId: current.id,
      status: nextStatus,
      reason,
      observation,
      actorUserId: actor.userId,
    });

    if (!updated) {
      throw new FieldDispatchError(404, "FIELD_DISPATCH_NOT_FOUND", "not_found", "Dispatch was not found.");
    }

    await this.repository.createEvent({
      tenantId: actor.tenantId,
      dispatchId: updated.id,
      workOrderId: updated.workOrderId,
      eventType: statusEventType(nextStatus),
      fromStatus: current.status,
      toStatus: nextStatus,
      actorUserId: actor.userId,
      message,
      metadata: {
        reason,
        observation,
      },
    });

    await publishDomainEvent(
      nextStatus === "cancelled" ? "field_dispatch.cancelled" : "field_dispatch.status_changed",
      {
        entity_type: "field_dispatch",
        entity_id: updated.id,
        work_order_id: updated.workOrderId,
        operator_user_id: updated.operatorUserId,
        from_status: current.status,
        to_status: nextStatus,
      },
      { tenantId: actor.tenantId, actorId: actor.userId },
    );

    return updated;
  }

  async reassign(actor: FieldDispatchActorContext, dispatchId: string, body: RawRecord): Promise<FieldDispatch> {
    const current = await this.get(actor, dispatchId);
    assertNonTerminalStatus(current.status);
    assertStatusTransition(current.status, "reassigned");

    const operatorUserId = parseRequiredUuid(body.operatorUserId ?? body.operatorId ?? body.userId, "operatorUserId");
    await this.assertOperatorBelongsToTenant(actor.tenantId, operatorUserId);

    const updated = await this.repository.reassign({
      tenantId: actor.tenantId,
      dispatchId: current.id,
      operatorUserId,
      reason: optionalString(body.reason),
      observation: optionalString(body.observation),
      actorUserId: actor.userId,
    });

    if (!updated) {
      throw new FieldDispatchError(404, "FIELD_DISPATCH_NOT_FOUND", "not_found", "Dispatch was not found.");
    }

    await this.repository.createEvent({
      tenantId: actor.tenantId,
      dispatchId: updated.id,
      workOrderId: updated.workOrderId,
      eventType: "field_dispatch_reassigned",
      fromStatus: current.status,
      toStatus: updated.status,
      actorUserId: actor.userId,
      message: optionalString(body.message) ?? "Despacho operacional reatribuido.",
      metadata: {
        previousOperatorUserId: current.operatorUserId,
        operatorUserId: updated.operatorUserId,
        reason: optionalString(body.reason),
      },
    });

    // D-CHK-DISPATCH-CREATE (achado MÉDIA do crítico, item 3a) — AUTO-RECUPERAÇÃO: o reassign também provisiona
    // a run (idempotente). Se a provisão do create deu certo, o findRunByClientKey a devolve sem duplicar; se
    // FALHOU na criação, reatribuir agora RECRIA a run — o reassign passa a ser um caminho real de recuperação
    // (antes o único retry era um novo despacho). Fail-open + auditado + notificado, igual ao create.
    await this.provisionChecklistRunForDispatch(actor, updated);

    await publishDomainEvent(
      "field_dispatch.reassigned",
      {
        entity_type: "field_dispatch",
        entity_id: updated.id,
        work_order_id: updated.workOrderId,
        operator_user_id: updated.operatorUserId,
        previous_operator_user_id: current.operatorUserId,
      },
      { tenantId: actor.tenantId, actorId: actor.userId },
    );

    return updated;
  }

  async timeline(actor: FieldDispatchActorContext, dispatchId: string): Promise<readonly FieldDispatchEvent[]> {
    const dispatch = await this.get(actor, dispatchId);

    return this.repository.listTimeline(actor.tenantId, dispatch.id);
  }

  // D-CHK-DISPATCH-CREATE — provisão IDEMPOTENTE da run a partir de um despacho já existente (usada pelo
  // reassign como auto-recuperação). READ-only sobre snapshots: NÃO re-congela nada (nem a coluna da ordem, nem
  // as linhas do conjunto) — quem congela é o despacho, no instante em que a ordem foi prometida ao campo.
  // Fail-open: erro NÃO é relançado; vira registro auditado + notificação (e, quando o fato é de negócio, linha
  // na história da ordem). Carregar a OS é best-effort — o reassign já concluiu; recriar a execução é cortesia
  // de recuperação, não pré-condição.
  private async provisionChecklistRunForDispatch(
    actor: FieldDispatchActorContext,
    dispatch: FieldDispatch,
  ): Promise<void> {
    let workOrder: WorkOrder | null;
    try {
      workOrder = await this.workOrderService.get(actor, dispatch.workOrderId);
    } catch {
      return;
    }

    // CHECKLIST P1 PR-04c (§7.1.6) — só a PRIMÁRIA, aqui também. O reassign é recuperação da execução que o
    // despacho já prometeu, não uma segunda chance de o conjunto inteiro virar execução.
    const primary = (await this.loadDispatchChecklistLines(actor, workOrder))[0];
    if (!primary) {
      return;
    }

    // CHECKLIST P1 PR-04c (BLOQ 3, §7.4.3) — GUARD DURO: nenhuma linha de junção sem freeze vira execução.
    //
    // O caminho perigoso é exatamente este: o reassign é READ-only sobre snapshots (não re-congela, comentário
    // acima) e roda em TODA reatribuição. Uma vistoria acrescentada ao conjunto DEPOIS do despacho tem
    // `checklist_snapshot` nulo — provisioná-la mandaria ao técnico um formulário que o congelamento nunca viu,
    // e se o modelo mudou nesse intervalo ele preencheria uma versão diferente da que o despacho prometeu.
    // Invariante Ω3-c (E1/E3) quebrado, com a execução ainda por cima FATURADA.
    //
    // A visão sintética (ordem antiga, sem linha de junção) não entra nesta trava: ali não há freeze de linha
    // nenhum para respeitar, e resolver ao vivo é o que faz do reassign um caminho real de recuperação quando a
    // provisão do create falhou.
    //
    // MÉDIA 3 (ciclo 2 da revisão) — A TRAVA NÃO É MUDA. O `return` seco daqui era o mesmo silêncio que o
    // comentário logo abaixo declara eliminado: a reatribuição saía sem provisionar e sem uma linha em nenhuma
    // das duas timelines, e quem reatribuiu ficava achando que a vistoria seguiu junto. O fato é de negócio e é
    // verdadeiro — a vistoria entrou na ordem depois do despacho, então nenhum despacho congelou o formulário
    // dela — e por isso vira registro auditado, com razão própria (`checklist_not_frozen`, NUNCA colapsada em
    // `template_not_published`: o modelo pode estar publicadíssimo).
    //
    // Só a timeline do DESPACHO, de propósito: o destinatário é quem despacha (a correção é re-despachar a
    // ordem, que congela a linha nova). Escrever na timeline da ORDEM usaria a frase de `recordMissingAtDispatch`
    // — "o modelo não está publicado" — que aqui seria falsa.
    if (primary.fromJunction && primary.frozenSnapshot === null) {
      await this.recordChecklistRunFailure(actor, dispatch, primary.checklistId, "checklist_not_frozen");
      return;
    }

    // CHECKLIST P1 PR-04c — NÃO HÁ MAIS PRÉ-GATE DE PUBLICAÇÃO AQUI, e a ausência é deliberada.
    //
    // O que existia era `if (!snapshot) return` — resolver o modelo ao vivo e, se ele não estivesse mais
    // publicado, SAIR EM SILÊNCIO. Duas coisas estavam erradas nisso, e nenhuma se conserta reintroduzindo o
    // gate:
    //
    //  1. O silêncio é a doença que a ALTA 9 matou no `create`: a vistoria prometida na criação da ordem some
    //     e ninguém descobre até o litígio. Aqui o sumiço era ainda mais invisível, porque o reassign é o
    //     caminho de RECUPERAÇÃO de quem já teve a provisão do despacho falhando.
    //  2. Um pré-gate dispara ANTES de saber se a execução já existe — e a execução existe no caso normal. Uma
    //     ordem despachada com sucesso cujo modelo foi arquivado DEPOIS geraria, a cada reatribuição, um aviso
    //     dizendo que a vistoria não foi enviada. Ela FOI: o guincheiro está com ela na mão. Auditoria que
    //     afirma um fato negativo falso é pior que auditoria ausente.
    //
    // A ordem certa é a inversa: TENTAR e deixar a tentativa responder. O provisionamento é idempotente e
    // consulta as duas chaves antes de qualquer coisa — execução existente devolve cedo, sem erro e sem
    // registro. Só quando não há execução E o modelo não pode mais ser executado é que se produz uma linha, e
    // ela é verdadeira. (O snapshot congelado da linha não substitui essa pergunta: ele é a prova do que foi
    // prometido, não uma licença para executar um modelo que a organização retirou.)
    //
    // ESTA DOUTRINA É DAQUI, E NÃO SE COPIA PARA O LAÇO DE AUDITORIA DO `create` (ciclo 4 da revisão). Tentar
    // é certo AQUI porque o trabalho do reassign É criar a execução: ele é o caminho de recuperação, e a
    // criação é o resultado desejado. O laço do `create` só AUDITA — criar ali é efeito colateral proibido
    // (§7.3 reserva a execução à primária) e chega a acontecer por corrida, então lá a pergunta é feita por
    // LEITURA (`hasChecklistRun`). Mesma pergunta, instrumentos diferentes, porque o que se pode escrever é
    // diferente. Foi copiar este parágrafo para lá que produziu o BLOQUEANTE 2.
    try {
      await this.provisionChecklistRun({
        tenantId: actor.tenantId,
        actorUserId: actor.userId,
        workOrderId: dispatch.workOrderId,
        checklistId: primary.checklistId,
        role: primary.role,
      });
    } catch (error) {
      const reason = normalizeChecklistProvisionReason(classifyChecklistProvisionError(error));
      await this.recordChecklistRunFailure(actor, dispatch, primary.checklistId, reason);

      // Simetria com o `create`: quando a razão é o modelo indisponível, a ausência da vistoria também vai para
      // a história da ORDEM — o técnico que acabou de RECEBER a reatribuição é justamente quem precisa saber
      // que a vistoria prometida não vem. Falha de infraestrutura (`unexpected`) NÃO vira linha na tela do
      // campo: ali só entra fato de negócio, não incidente de servidor.
      if (reason === "template_not_published") {
        await this.workOrderChecklistSet.recordMissingAtDispatch({
          tenantId: actor.tenantId,
          actorUserId: actor.userId,
          workOrderId: dispatch.workOrderId,
          checklistId: primary.checklistId,
          role: primary.role,
        });
      }
    }
  }

  // CHECKLIST P1 PR-04c (§5.3) — o conjunto de vistorias da ordem, com a PRECEDÊNCIA de leitura derivada,
  // nunca gravada: a junção viva manda; sem ela, a ordem antiga é lida como UMA vistoria de fase genérica; sem
  // nem isso, o conjunto é vazio (a ordem sem vistoria de hoje, que segue sendo estado legítimo).
  //
  // A visão sintética é o que permite esta fatia entrar SEM backfill: nenhuma ordem existente é reescrita e,
  // ainda assim, todo o caminho novo passa a valer para elas.
  private async loadDispatchChecklistLines(
    actor: FieldDispatchActorContext,
    workOrder: WorkOrder,
  ): Promise<readonly DispatchChecklistLine[]> {
    const live = await this.workOrderChecklistSet.load(actor.tenantId, workOrder.id);

    if (live.length > 0) {
      // A ordem de precedência é do porto (que conhece `order_index`, `created_at` e `id`). O `sort` aqui é
      // rede secundária e ESTÁVEL: preserva o desempate do porto e só protege contra uma listagem fora de
      // ordem trocar qual vistoria é a primária — que trocaria qual vistoria vai a campo.
      return [...live]
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((link) => ({
          checklistId: link.checklistId,
          role: link.role,
          orderIndex: link.orderIndex,
          fromJunction: true,
          frozenSnapshot: link.checklistSnapshot ?? null,
        }));
    }

    return workOrder.checklistId
      ? [
          {
            checklistId: workOrder.checklistId,
            role: "generic",
            orderIndex: 0,
            fromJunction: false,
            frozenSnapshot: workOrder.checklistSnapshot ?? null,
          },
        ]
      : [];
  }

  // D-CHK-DISPATCH-CREATE — registra a FALHA fail-open da provisão da run: (1) evento DURÁVEL na timeline do
  // despacho (reason CODIFICADO, §2.8 — item 4) e (2) NOTIFICAÇÃO ao operador (item 3b), para a falha não ficar
  // invisível ao guincheiro/operação. Cada efeito é best-effort próprio: a auditoria/notificação NUNCA pode
  // converter-se num 500 com despacho órfão. O conserto PRIMÁRIO do não-500 é a migração 20260858000000 (que
  // admite o event_type novo no CHECK; sem ela o INSERT do evento estouraria 23514); este try/catch é a REDE
  // SECUNDÁRIA. "nunca em silêncio": o registro primário é o evento de timeline — o catch só cobre um erro
  // INESPERADO de escrita (com a migração aplicada, o caminho feliz sempre grava o evento).
  //
  // CHECKLIST P1 PR-04c (ALTA 9) — passa a receber a RAZÃO já classificada, em vez do erro. Motivo: nem toda
  // vistoria que não foi a campo veio de uma exceção. Modelo despublicado entre a criação da ordem e o despacho
  // não lança nada — simplesmente não há formulário para congelar — e antes disso era um `if` que não entrava.
  // Uma vistoria prometida pela regra e não entregue precisa de linha na história nos DOIS casos.
  private async recordChecklistRunFailure(
    actor: FieldDispatchActorContext,
    dispatch: FieldDispatch,
    checklistId: string,
    reason: string,
  ): Promise<void> {
    try {
      await this.repository.createEvent({
        tenantId: actor.tenantId,
        dispatchId: dispatch.id,
        workOrderId: dispatch.workOrderId,
        eventType: "field_dispatch_checklist_run_failed",
        toStatus: dispatch.status,
        actorUserId: actor.userId,
        message: checklistRunFailureMessage(reason),
        metadata: {
          checklistId,
          reason,
        },
      });
    } catch {
      // Rede secundária (item 1): impede que um erro INESPERADO de escrita da auditoria vire um 500 com
      // despacho órfão. Com a migração 20260858000000 aplicada, o INSERT do evento não estoura mais 23514.
    }

    try {
      await this.notifyChecklistRunFailure({
        tenantId: actor.tenantId,
        recipientUserId: actor.userId,
        workOrderId: dispatch.workOrderId,
        dispatchId: dispatch.id,
        checklistId,
        reasonCode: reason,
      });
    } catch {
      // Notificação é best-effort — nunca bloqueia/500 o despacho.
    }
  }

  // Ω3-c — passa a RETORNAR a OS (antes descartava) para o `create` ler o `checklistId` e congelar o
  // snapshot. Mesmo mapeamento de 404.
  private async assertWorkOrderBelongsToTenant(actor: FieldDispatchActorContext, workOrderId: string): Promise<WorkOrder> {
    try {
      return await this.workOrderService.get(actor, workOrderId);
    } catch (error) {
      if (error instanceof WorkOrderError && error.statusCode === 404) {
        throw new FieldDispatchError(404, "WORK_ORDER_NOT_FOUND", "not_found", "Work order was not found.");
      }
      throw error;
    }
  }

  // D1/D3 — valida que o ALVO (operatorUserId) existe no tenant (404) E é técnico de campo (422).
  // Existência é checada ANTES do papel (404 não é mascarado por 422). Guard único → cobre create E
  // reassign. Checa o CONJUNTO `roles` (plural), não só o primeiro (D1.a).
  private async assertOperatorBelongsToTenant(tenantId: string, operatorUserId: string): Promise<void> {
    let user: Awaited<ReturnType<ICoreSaasService["getUserForTenant"]>>;
    try {
      user = await this.coreService.getUserForTenant(operatorUserId, tenantId);
    } catch {
      throw new FieldDispatchError(404, "FIELD_OPERATOR_NOT_FOUND", "not_found", "Field operator was not found.");
    }

    const roles = user.roles ?? [];
    const isFieldTarget = roles.some((role) => (FIELD_DISPATCH_TARGET_ROLES as readonly string[]).includes(role));
    if (!isFieldTarget) {
      throw new FieldDispatchError(
        422,
        "FIELD_DISPATCH_TARGET_INVALID",
        "target_not_field_technician",
        "The dispatch target must be a field technician.",
      );
    }
  }
}

const memoryRepository = new InMemoryFieldDispatchRepository();
let defaultServicePromise: Promise<FieldDispatchService> | undefined;

// D-CHK-DISPATCH-CREATE — constrói o provisioner de execução a partir de um ChecklistService concreto (a aresta
// field-dispatch→checklists vive só na raiz de composição, não na classe). IDEMPOTENTE por chave determinística:
// pré-consulta a execução pela client_run_key e NÃO recria (nem re-emite evento) se já existir — re-despacho e
// reassign da mesma OS não duplicam. A corrida remanescente é barrada de novo no serviço/unique (createRun
// devolve a existente na colisão P2002). started_by = despachante.
//
// CHECKLIST P1 PR-04c (BLOQ 2, §8) — A CHAVE GANHOU A FASE, E POR ISSO GANHOU UM FALLBACK.
//
// A chave passou a ser `dispatch:<ordem>:<modelo>:<fase>`, porque a identidade da vistoria passou a incluir a
// fase (a mesma ordem pode ter coleta e entrega do mesmo modelo). Trocar a FORMA de uma chave de idempotência
// tem um custo que não aparece em teste feliz: toda ordem EM VOO no dia do deploy — despachada, guincheiro
// respondendo — tem execução gravada com a chave ANTIGA `dispatch:<ordem>:<modelo>`. Bastaria um `reassign`
// (caminho normal de recuperação, que roda o provisionamento SEMPRE) para a consulta pela chave nova dar miss:
// nasceria uma SEGUNDA execução vazia do mesmo modelo, com `created:true` — e, como a métrica FATURADA
// `checklist_runs_count` deduplica por `event.id`, uma emissão nova é uma UNIDADE COBRADA nova. Pior: duas
// execuções da mesma fase deixam a busca por fase ambígua, e a tela de comparação passa a RECUSAR comparar.
// Cobrança e prova, no mesmo bug.
//
// Por isso o miss consulta a chave LEGADA e, achando, ADOTA: carimba a fase na execução que já existe, não cria
// nada e não publica `checklist_run.created`.
//
// Duas escolhas dentro da adoção, ambas deliberadas:
//  - A chave legada NÃO é reescrita para o formato novo. Ela é a chave durável de idempotência do replay
//    offline do app; mutá-la "para arrumar o formato" trocaria um risco conhecido por um desconhecido. O custo
//    de não reescrever é uma consulta indexada a mais por despacho de ordem legada. Aceito.
//  - Só a fase GENÉRICA adota. A chave legada nasceu num mundo sem fase, e a linha primária de uma ordem dessas
//    é sempre a genérica (é assim que a promoção preguiçosa materializa a vistoria legada). Deixar uma linha de
//    coleta adotar essa execução carimbaria nela uma fase que ela nunca teve — proveniência inventada (D-007)
//    em cima de prova.
//
// EXPORTADO: esta regra é o que decide se uma ordem em voo ganha uma execução — e uma unidade faturada — a mais
// no dia do deploy. Ela precisa ser exercitável com os dois formatos de chave vivos ao mesmo tempo, sem
// depender de um despacho HTTP inteiro para chegar até ela.
export function buildChecklistRunProvisioner(checklistService: ChecklistService): ChecklistRunProvisioner {
  return async ({ tenantId, actorUserId, workOrderId, checklistId, role }) => {
    const clientRunKey = `dispatch:${workOrderId}:${checklistId}:${role}`;
    const actorContext = { tenantId, userId: actorUserId };
    const existing = await checklistService.findRunByClientKey(actorContext, clientRunKey);

    if (existing) {
      return;
    }

    if (role === "generic") {
      const legacy = await checklistService.findRunByClientKey(actorContext, `dispatch:${workOrderId}:${checklistId}`);

      if (legacy) {
        // ADOÇÃO: a execução em voo continua sendo a mesma (mesmo id, mesmas respostas do guincheiro, mesma
        // chave) — só passa a ter proveniência de fase. `stampRunRole` não sobrescreve fase já gravada.
        await checklistService.stampRunRole(actorContext, legacy.id, role);
        return;
      }
    }

    await checklistService.createRun(actorContext, {
      checklistId,
      clientRunKey,
      relatedEntityType: "work_order",
      relatedEntityId: workOrderId,
      role,
      answers: [],
    });
  };
}

// CHECKLIST P1 PR-04c (ciclo 4) — A LEITURA, construída do MESMO `ChecklistService` que o provisionador.
//
// Espelha, sem escrever nada, a identidade que `buildChecklistRunProvisioner` grava: a chave com fase e, só
// para `generic`, a chave LEGADA. O par de formatos é repetido em três lugares (aqui, no provisionador acima e
// em `hasProvisionedChecklistRun`, na raiz de composição de work-orders, que explica por que não importa o
// formato de volta — fecharia o ciclo de import). Perguntar só pela chave nova daria "não foi ao campo" para
// toda ordem em voo no dia do deploy — e o guincheiro receberia, na timeline da própria ordem, a negação de
// uma vistoria que está aberta no aparelho dele.
//
// EXPORTADO pela mesma razão que o provisionador: é a regra que decide se um fato negativo é declarado sobre
// prova jurídica, e precisa ser exercitável com os dois formatos de chave vivos ao mesmo tempo.
export function buildChecklistRunLookup(checklistService: ChecklistService): ChecklistRunLookup {
  return async ({ tenantId, actorUserId, workOrderId, checklistId, role }) => {
    const actorContext = { tenantId, userId: actorUserId };

    if (await checklistService.findRunByClientKey(actorContext, `dispatch:${workOrderId}:${checklistId}:${role}`)) {
      return true;
    }

    // A chave legada nasceu num mundo sem fase, e a linha primária de uma ordem dessas é sempre a genérica —
    // a mesma restrição da ADOÇÃO no provisionador. Deixar uma linha de coleta enxergar aquela execução faria
    // o despacho calar a coleta por causa de uma vistoria que nunca teve fase.
    if (role !== "generic") {
      return false;
    }

    return (await checklistService.findRunByClientKey(actorContext, `dispatch:${workOrderId}:${checklistId}`)) !== null;
  };
}

// D-CHK-DISPATCH-CREATE (item 3b) — constrói o notifier de falha de provisão a partir do motor de notificações
// concreto (a aresta field-dispatch→notifications vive só na raiz de composição, não na classe). Best-effort no
// serviço (envolto em try/catch). Idempotência por dispatch+checklist evita notificação repetida se o reassign
// também falhar. Metadata sanitizado pelo próprio NotificationService (§2.8).
function buildChecklistRunFailureNotifier(notificationService: NotificationService): ChecklistRunFailureNotifier {
  return async ({ tenantId, recipientUserId, workOrderId, dispatchId, checklistId, reasonCode }) => {
    await notificationService.createNotification({
      tenantId,
      recipientUserId,
      type: "field_dispatch.checklist_run_failed",
      title: "Falha ao preparar o checklist do despacho",
      message:
        "Nao foi possivel criar automaticamente a execucao do checklist deste despacho. Reatribua o despacho ou tente novamente.",
      severity: "warning",
      sourceType: "field_dispatch",
      sourceId: dispatchId,
      actionUrl: `/operations/dispatches/${dispatchId}`,
      idempotencyKey: `field_dispatch_checklist_run_failed:${dispatchId}:${checklistId}`,
      metadata: {
        workOrderId,
        checklistId,
        reason: reasonCode,
      },
    });
  };
}

// D-CHK-DISPATCH-CREATE (achado BAIXO do crítico+coordenador, item 4) — reason CODIFICADO para a auditoria,
// NUNCA o `error.message` cru (que, para erros inesperados de Prisma, pode ecoar nome de constraint/coluna/
// valor de entrada — §2.8). ChecklistError expõe um `reason` curto/codificado (ex.: `checklist_not_published`,
// `checklist_not_found`); é duck-typed aqui para NÃO acoplar field-dispatch ao módulo de checklists (a aresta
// vive só na raiz de composição). Erros fora dessa taxonomia viram `unexpected`.
function classifyChecklistProvisionError(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "reason" in error &&
    typeof (error as { reason?: unknown }).reason === "string" &&
    (error as { reason: string }).reason.trim() !== ""
  ) {
    return (error as { reason: string }).reason;
  }

  return "unexpected";
}

// CHECKLIST P1 PR-04c — UM FATO, UM CÓDIGO.
//
// O módulo de vistorias distingue "modelo não publicado" (409) de "modelo não encontrado" (404 — arquivado ou
// apagado). Para o DESPACHO os dois são a mesma ocorrência: não há formulário publicado para mandar a campo. O
// `create` já os colapsa sem querer, porque `snapshotPublishedTemplate` devolve `null` nos dois casos e a
// auditoria sai como `template_not_published`; só o caminho do reassign, que descobre o fato pela EXCEÇÃO do
// provisionamento, vazava os códigos internos. Duas grafias para o mesmo evento é uma métrica que ninguém
// consegue somar seis meses depois — e foi assim que este achado entrou como resíduo não declarado.
//
// O que NÃO é colapsado: qualquer outra razão (inclusive `unexpected`) segue com o próprio nome. Falha de
// infraestrutura não pode se disfarçar de decisão de negócio.
const TEMPLATE_UNAVAILABLE_REASONS: readonly string[] = ["checklist_not_published", "checklist_not_found"];

function normalizeChecklistProvisionReason(reason: string): string {
  return TEMPLATE_UNAVAILABLE_REASONS.includes(reason) ? "template_not_published" : reason;
}

// A frase que o escritório lê na timeline do despacho, por RAZÃO. Cada fato tem a sua: dizer "o modelo não está
// publicado" quando a causa foi outra é a mesma doença do fato negativo falso, um nível abaixo. O ramo genérico
// cobre incidente de infraestrutura (`unexpected`), que não tem frase de negócio para dar.
function checklistRunFailureMessage(reason: string): string {
  if (reason === "template_not_published") {
    return "A vistoria não foi enviada ao técnico: o modelo não está publicado.";
  }

  if (reason === "checklist_not_frozen") {
    return "A vistoria não foi enviada ao técnico: ela entrou nesta ordem de serviço depois do despacho.";
  }

  return "Falha ao provisionar a execução do checklist do despacho (despacho mantido).";
}

// CHECKLIST P1 PR-04c — A LIGAÇÃO DO PORTO, num lugar só.
//
// Os quatro verbos caem em quatro membros públicos de `WorkOrderService`, sem tradução no meio. `load` vai
// para `listChecklistLinks` (as linhas VIVAS e CRUAS, com `checklistSnapshot`) e NÃO para `listChecklistSet`:
// aquele devolve o conjunto EFETIVO, que descarta o snapshot por linha e materializa a ordem legada como uma
// linha genérica — apagando exatamente a distinção que o guard do BLOQ 3 usa para separar "linha que o
// congelamento nunca viu" de "ordem anterior ao conjunto". Ligar o porto àquela leitura mandaria a campo
// formulário não congelado E trancaria a auto-recuperação do reassign nas ordens antigas.
export function buildWorkOrderChecklistSetPort(workOrderService: WorkOrderService): WorkOrderChecklistSetPort {
  return {
    load: (tenantId, workOrderId) => workOrderService.listChecklistLinks(tenantId, workOrderId),
    freeze: (input) => workOrderService.freezeChecklistLinkSnapshots(input),
    recordDeferred: (input) => workOrderService.recordChecklistDeferredAtDispatch(input),
    recordMissingAtDispatch: (input) => workOrderService.recordChecklistMissingAtDispatch(input),
  };
}

// CHECKLIST P1 PR-04c — O PORTO DO CONJUNTO ESTÁ LIGADO NAS DUAS RAÍZES (esta e a de Prisma), e a assinatura
// do construtor não deixa mais compor sem ele.
//
// `workOrderChecklistSet` continua sendo parâmetro daqui só como PONTO DE SUBSTITUIÇÃO de teste (um dublê que
// conta chamadas); omitir cai no porto de verdade, sobre a MESMA instância de `WorkOrderService` que o serviço
// usa — senão a leitura da junção viria de um repositório e a escrita iria para outro.
export function createMemoryFieldDispatchService(
  coreService: ICoreSaasService,
  workOrderChecklistSet?: WorkOrderChecklistSetPort,
): FieldDispatchService {
  // Composição: injeta o resolver de snapshot E o provisioner de execução (arestas field-dispatch→checklists só
  // aqui, não na classe). O MESMO ChecklistService (repositório em memória singleton) serve os dois, para que a
  // execução provisionada seja visível às rotas de checklist (comparison, GET run-por-OS).
  const checklistService = createMemoryChecklistService();
  const workOrderService = createMemoryWorkOrderService();
  const resolveChecklistSnapshot: ChecklistSnapshotResolver = (tenantId, checklistId) =>
    checklistService.snapshotPublishedTemplate(tenantId, checklistId);
  const provisionChecklistRun = buildChecklistRunProvisioner(checklistService);
  const notifyChecklistRunFailure = buildChecklistRunFailureNotifier(createMemoryNotificationService());
  return new FieldDispatchService(
    memoryRepository,
    workOrderService,
    coreService,
    resolveChecklistSnapshot,
    provisionChecklistRun,
    notifyChecklistRunFailure,
    workOrderChecklistSet ?? buildWorkOrderChecklistSetPort(workOrderService),
    // A LEITURA sai do MESMO `checklistService` que o provisionador — se viessem de serviços diferentes, a
    // pergunta "esta vistoria foi ao campo?" seria feita a um repositório e respondida por outro.
    buildChecklistRunLookup(checklistService),
  );
}

export function getMemoryFieldDispatchRepositoryForTests(): InMemoryFieldDispatchRepository {
  return memoryRepository;
}

export async function createDefaultFieldDispatchService(coreService: ICoreSaasService): Promise<FieldDispatchService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryFieldDispatchService(coreService);
  }

  defaultServicePromise ??= createPrismaFieldDispatchService(coreService);

  return defaultServicePromise;
}

export function resetFieldDispatchRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaFieldDispatchService(coreService: ICoreSaasService): Promise<FieldDispatchService> {
  const { createPrismaFieldDispatchRepository } = await import("./field-dispatch-prisma.repository.js");
  const repository = await createPrismaFieldDispatchRepository();
  const workOrderService = await createDefaultWorkOrderService();
  const checklistService = await createDefaultChecklistService();
  const resolveChecklistSnapshot: ChecklistSnapshotResolver = (tenantId, checklistId) =>
    checklistService.snapshotPublishedTemplate(tenantId, checklistId);
  const provisionChecklistRun = buildChecklistRunProvisioner(checklistService);
  const notifyChecklistRunFailure = buildChecklistRunFailureNotifier(await createDefaultNotificationService());

  return new FieldDispatchService(
    repository,
    workOrderService,
    coreService,
    resolveChecklistSnapshot,
    provisionChecklistRun,
    notifyChecklistRunFailure,
    // A RAIZ DE PRODUÇÃO. Era ela que montava o despacho sem o conjunto: toda ordem era lida pela visão
    // sintética, a execução nascia com fase `generic` mesmo quando a linha dizia coleta, e o carimbo de fase
    // nunca sobrescreve — proveniência errada, permanente, em cima de prova.
    buildWorkOrderChecklistSetPort(workOrderService),
    buildChecklistRunLookup(checklistService),
  );
}

function defaultStatusMessage(status: FieldDispatchStatus): string {
  const labels: Record<FieldDispatchStatus, string> = {
    draft: "Despacho operacional em rascunho.",
    assigned: "Despacho operacional atribuido.",
    accepted: "Despacho operacional aceito.",
    on_route: "Operador em rota.",
    arrived: "Operador chegou ao destino.",
    in_service: "Atendimento em execucao.",
    completed: "Despacho operacional concluido.",
    cancelled: "Despacho operacional cancelado.",
    reassigned: "Despacho operacional reatribuido.",
    failed: "Despacho operacional falhou.",
  };

  return labels[status];
}

function statusEventType(status: FieldDispatchStatus) {
  if (status === "cancelled") return "field_dispatch_cancelled" as const;
  return "field_dispatch_status_changed" as const;
}
