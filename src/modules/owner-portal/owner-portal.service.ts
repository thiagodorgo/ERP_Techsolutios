import type { Attachment } from "../attachments/attachment.types.js";
import { resolveAttachmentDownload } from "../attachments/attachment.storage.js";
import type { ImpoundProcess } from "../impound/impound.types.js";
import {
  AntiAbuse,
  constantTimeEqual,
  derivePhotoRefKey,
  ipHash,
  issueChallenge,
  normalizeRenavamKey,
  photoRef,
  plateRateKey,
  queryFingerprint,
  sessionRateKey,
  signOwnerSession,
  TokenBucket,
  verifySolution,
  type ChallengeStore,
  type PortalAccessLogRepository,
  type PowChallenge,
  type TokenBucketConfig,
} from "../portal-shared/index.js";
import { formatDateLabelPtBr, toOwnerDossierDto, toOwnerPortalProcessDto, type OwnerDossierDto, type OwnerPortalProcessDto } from "./owner-portal.dto.js";
import { PhotoConcurrencySaturatedError, type PhotoConcurrencyGuard } from "./photo-concurrency-guard.js";
import { runPipeline as runPhotoPipeline, withTimeout as withPhotoPipelineTimeout, PHOTO_PIPELINE_TIMEOUT_MS } from "./owner-portal.photo-pipeline.js";
import type { PhotoLruCache } from "./owner-portal.photo-cache.js";
import { resolveOwnerSession } from "./owner-portal.session.js";
import type { PortalReleaseRequestRepository } from "./portal-release-request.types.js";
import type { LookupRequest } from "./owner-portal.validators.js";

// Ω5P PR-17b — C2 (crítico-adversarial, OBRIGATÓRIO): balde DEDICADO de rate-limit para a leitura de fotos —
// SEPARADO do balde do dossiê (DEFAULT_READ_BUCKET) e MAIS RESTRITO (a geração de foto é CPU-cara: decode+
// resize+watermark). Número EXPLÍCITO: 10 leituras / 5min por sessão+IP.
export const PHOTO_READ_BUCKET_DEFAULT: TokenBucketConfig = { capacity: 10, refillTokens: 10, refillIntervalMs: 5 * 60 * 1000 };

// Ω5P PR-16 — read-ports ESTREITOS que o BFF consome IN-PROCESS (D-Ω5P-PORTAL-03) — nunca loopback HTTP, nunca
// JWT/AuthSession do ERP. Cada porta recebe o tenantId do BINDING de deploy; o RLS na camada de repositório
// garante que o portal jamais lê o processo de OUTRO tenant.
export interface OwnerPortalImpoundPort {
  findByIdentity(tenantId: string, plate: string): Promise<ImpoundProcess | undefined>;
  // Ω5P PR-17 — resolve o processo pelo ID da SESSÃO JWE (nunca do corpo); RLS garante isolamento cross-tenant.
  findByIdForPortal(tenantId: string, processId: string): Promise<ImpoundProcess | undefined>;
  // Ω5P PR-17 — contagem de conjuntos de foto (placeholder honesto; NENHUM byte de foto — CORTE PR-17b).
  countAvailablePhotoSets(tenantId: string, processId: string): Promise<number>;
  // Ω5P PR-17b — {attachmentId, capturedAt} de TODAS as fotos do processo (recompute do opaqueRef, C4).
  listInspectionPhotosForPortal(tenantId: string, processId: string): Promise<readonly { attachmentId: string; capturedAt: Date }[]>;
  // Ω5P PR-17b — Attachment BRUTO de UMA foto (storage_key/provider) — SÓ chamado pós-HMAC validado.
  getInspectionPhotoAttachmentForPortal(
    tenantId: string,
    processId: string,
    attachmentId: string,
  ): Promise<
    | {
        readonly attachmentId: string;
        readonly fileName?: string;
        readonly contentType?: string;
        readonly storageProvider?: string;
        readonly storageKey?: string;
        readonly status: string;
      }
    | undefined
  >;
}
export interface OwnerPortalChargePort {
  getPublicSummary(tenantId: string, processId: string): Promise<{ totalDueCents: number; currency: string }>;
  // Ω5P PR-17 — débitos ITEMIZADOS por kind (§2.8: sem tariffId/unitAmount/periodSeq/id de linha).
  getPublicItemizedSummary(
    tenantId: string,
    processId: string,
  ): Promise<{
    readonly currency: string;
    readonly items: ReadonlyArray<{ readonly kind: "REMOVAL" | "DAILY" | "ADDITIONAL"; readonly subtotalCents: number; readonly count: number }>;
    readonly capReached: boolean;
    readonly totalDueCents: number;
  }>;
}
export interface OwnerPortalYardPort {
  getPublicYard(tenantId: string, yardId: string): Promise<{ name: string; address: string } | undefined>;
}
// Ω5P PR-17 — prazos legais (offsets do t0) + exigências de liberação (§2.8: só {label, required}; nunca satisfied).
export interface OwnerPortalJurisdictionPort {
  getPortalProfile(
    tenantId: string,
    profileId: string,
  ): Promise<
    | {
        readonly ownerNotifDays: number;
        readonly noticeEdictDay: number;
        readonly auctionEligibleDay: number;
        readonly requirements: ReadonlyArray<{ readonly label: string; readonly required: boolean }>;
      }
    | undefined
  >;
}

export type OwnerPortalDeps = {
  readonly tenantId: string; // BINDING de deploy (PORTAL_TENANT_ID / host→tenant)
  readonly impound: OwnerPortalImpoundPort;
  readonly charge: OwnerPortalChargePort;
  readonly yard: OwnerPortalYardPort;
  readonly jurisdiction: OwnerPortalJurisdictionPort; // Ω5P PR-17 — prazos/exigências do dossiê
  readonly releaseRequests: PortalReleaseRequestRepository; // Ω5P PR-17 — intenção de liberação
  readonly accessLog: PortalAccessLogRepository;
  readonly antiAbuse: AntiAbuse;
  readonly challengeStore: ChallengeStore;
  readonly logSecret: string;
  readonly sessionSecret: string;
  readonly minLatencyMs: number; // atraso mínimo constante (normaliza timing anti-enumeração)
  readonly challengeTtlMs: number;
  readonly now?: () => number; // relógio em ms (injetável em teste)
  // Ω5P PR-17b — balde DEDICADO de leitura de foto (C2, separado do dossiê). Injetável em teste.
  readonly photoRateLimiter: TokenBucket;
  // Ω5P PR-17b — semáforo GLOBAL de concorrência do pipeline de minimização (S2+C2).
  readonly photoConcurrencyGuard: PhotoConcurrencyGuard;
  // Ω5P PR-17b — cache LRU do buffer JÁ MINIMIZADO, chaveado pelo attachmentId interno (C3).
  readonly photoCache: PhotoLruCache;
};

// Retornado ao controller. A RESPOSTA das 3 negativas (não-encontrado × Renavam-errado × não-autorizado) é
// UNIFORME (kind:'not_found' → mesmo shape/status/latência); só 'found' difere (é o desfecho legítimo distinto).
export type OwnerLookupResult =
  | { readonly kind: "found"; readonly process: OwnerPortalProcessDto; readonly session: string }
  | { readonly kind: "not_found" }
  | { readonly kind: "rate_limited" }
  | { readonly kind: "challenge_failed" };

// Desfecho do /challenge: emitido OU barrado por rate-limit (HIGH-1). O flood anônimo de desafios não pode
// crescer o challenge store nem a trilha de log sem teto — o balde por IP corta ANTES de emitir/logar.
export type OwnerChallengeResult =
  | { readonly kind: "issued"; readonly challenge: PowChallenge }
  | { readonly kind: "rate_limited" };

// Ω5P PR-17 — desfecho do /dossier. `session_invalid` (401) é UNIFORME p/ ausente/expirada/forjada/audience-errada
// (sem oráculo). `not_found` (cross-tenant/removido) NÃO devolve o processo. Só `ok` traz o agregado minimizado.
export type OwnerDossierResult =
  | { readonly kind: "ok"; readonly dossier: OwnerDossierDto }
  | { readonly kind: "session_invalid" }
  | { readonly kind: "not_found" }
  | { readonly kind: "rate_limited" };

// Ω5P PR-17 — desfecho do /release-request. `ok` = intenção REGISTRADA (ou já havia uma aberta — idempotente); a
// resposta ao cliente é SEMPRE genérica ({received:true}) — não confirma/nega existência do processo (anti-oráculo).
export type OwnerReleaseRequestResult =
  | { readonly kind: "ok" }
  | { readonly kind: "session_invalid" }
  | { readonly kind: "rate_limited" };

// Ω5P PR-17b — desfecho do GET /photos/:opaqueRef. `not_found` cobre TANTO "não existe" QUANTO "opaqueRef não
// bate" (mesma filosofia anti-oráculo dos demais endpoints — nunca distingue os dois). `saturated` (503) é o
// semáforo de concorrência (S2+C2) — nunca confundido com rate_limited (429, balde do cliente).
export type OwnerPhotoResult =
  | { readonly kind: "ok"; readonly buffer: Buffer; readonly contentType: string }
  | { readonly kind: "session_invalid" }
  | { readonly kind: "not_found" }
  | { readonly kind: "rate_limited" }
  | { readonly kind: "saturated" };

function truncateUa(userAgent: string | undefined): string | undefined {
  if (!userAgent) return undefined;
  return userAgent.slice(0, 200);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Ω5P PR-17b — resolveAttachmentDownload pode devolver Readable (provider s3); o pipeline de minimização exige
// Buffer (buffer-in/buffer-out, zero disco). Consome o stream inteiro em memória — condizente com o cap de bytes
// (PHOTO_MAX_SOURCE_BYTES) já aplicado pelo pipeline logo em seguida.
async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export class OwnerPortalService {
  private readonly clock: () => number;

  constructor(private readonly deps: OwnerPortalDeps) {
    this.clock = deps.now ?? (() => Date.now());
  }

  // POST /portal/v1/owner/challenge — emite o desafio PoW (dificuldade progressiva pelas falhas do IP) e loga
  // CHALLENGE_ISSUED (I10). NÃO consome rate-limit de consulta (é só o "pré-flight" anti-bot).
  async challenge(ctx: { ip: string; userAgent?: string }): Promise<OwnerChallengeResult> {
    const nowMs = this.clock();
    const ip = ipHash(this.deps.logSecret, ctx.ip);
    // (0) Rate-limit BARATO do /challenge por IP (HIGH-1). Um flood anônimo é barrado ANTES de emitir o desafio e
    // ANTES de gravar 1 linha de log → o balde limita simultaneamente o crescimento do challenge store e a taxa de
    // escrita no PortalAccessLog. Sem log/emissão no caminho barrado (é o próprio ponto de conter a exaustão).
    if (this.deps.antiAbuse.checkChallengeRate(ip, nowMs).limited) {
      return { kind: "rate_limited" };
    }
    const difficulty = this.deps.antiAbuse.difficultyFor(ip, nowMs);
    const challenge = issueChallenge(this.deps.challengeStore, difficulty, this.deps.challengeTtlMs, nowMs);
    await this.deps.accessLog.append({
      tenantId: this.deps.tenantId,
      portal: "OWNER",
      action: "CHALLENGE_ISSUED",
      outcome: "ISSUED",
      ipHash: ip,
      userAgent: truncateUa(ctx.userAgent),
      occurredAt: new Date(),
    });
    return { kind: "issued", challenge };
  }

  // POST /portal/v1/owner/lookup — o CORAÇÃO de segurança: PoW → rate-limit → 2 fatores (Renavam em tempo
  // constante) → resposta UNIFORME. TODA tentativa vira 1 linha no PortalAccessLog; o `outcome` interno
  // (FACTOR_MISMATCH×NOT_FOUND) NUNCA vai para a resposta.
  async lookup(input: LookupRequest & { ip: string; userAgent?: string }): Promise<OwnerLookupResult> {
    const startMs = this.clock();
    const ip = ipHash(this.deps.logSecret, input.ip);
    const fingerprint = queryFingerprint(this.deps.logSecret, input.plate, input.renavam);
    const ua = truncateUa(input.userAgent);
    const nowMs = this.clock();

    // (1) PoW obrigatório. Inválida/expirada/reusada → falha genérica + CHALLENGE_FAILED + sobe a dificuldade.
    const pow = verifySolution(
      this.deps.challengeStore,
      { challengeId: input.challengeId, solution: input.solution },
      nowMs,
    );
    if (!pow.ok) {
      this.deps.antiAbuse.registerFailure(ip, nowMs);
      await this.deps.accessLog.append({
        tenantId: this.deps.tenantId,
        portal: "OWNER",
        action: "LOOKUP",
        outcome: "CHALLENGE_FAILED",
        queryFingerprint: fingerprint,
        ipHash: ip,
        userAgent: ua,
        occurredAt: new Date(),
      });
      return this.settle(startMs, { kind: "challenge_failed" });
    }

    // (2) Rate-limit por IP E por placa (o mais restritivo vence) → 429 genérico + RATE_LIMITED.
    const rate = this.deps.antiAbuse.checkRate(ip, plateRateKey(this.deps.logSecret, input.plate), nowMs);
    if (rate.limited) {
      await this.deps.accessLog.append({
        tenantId: this.deps.tenantId,
        portal: "OWNER",
        action: "LOOKUP",
        outcome: "RATE_LIMITED",
        queryFingerprint: fingerprint,
        ipHash: ip,
        userAgent: ua,
        occurredAt: new Date(),
      });
      return this.settle(startMs, { kind: "rate_limited" });
    }

    // (3) 2 fatores. 1º = placa (resolve o processo, escopo=tenant vinculado sob RLS). 2º = Renavam em TEMPO
    // CONSTANTE. NOT_FOUND × FACTOR_MISMATCH → resposta IDÊNTICA; o outcome interno fica só no log (I10).
    const process = await this.deps.impound.findByIdentity(this.deps.tenantId, input.plate);
    const provided = normalizeRenavamKey(input.renavam);
    const stored = process?.vehicleRenavam ? normalizeRenavamKey(process.vehicleRenavam) : null;
    // Compara SEMPRE (mesmo com stored ausente) para não abrir fast-path de timing; força false se não há Renavam.
    const rawMatch = constantTimeEqual(this.deps.logSecret, stored ?? "", provided);
    // CRÍTICO-1 (bypass do 2º fator por normalização vazia): `constantTimeEqual("","")` é true — um registro sem
    // Renavam-dígito ("N/A", "-") normalizaria stored→"" e um lookup com Renavam sem dígito daria provided→"",
    // degradando 2 fatores em 1 (placa só). A guarda de comprimento é um AND booleano sobre valores JÁ computados
    // (rawMatch continua rodando incondicionalmente → tempo-constante preservado): Renavam vazio NUNCA autentica e
    // um registro sem Renavam-dígito fica não-consultável, exatamente como o caso `null` já seguro.
    const matched =
      process !== undefined && stored !== null && provided.length > 0 && stored.length > 0 && rawMatch;

    if (!process || !matched) {
      await this.deps.accessLog.append({
        tenantId: this.deps.tenantId,
        portal: "OWNER",
        action: "LOOKUP",
        outcome: process ? "FACTOR_MISMATCH" : "NOT_FOUND",
        queryFingerprint: fingerprint,
        ipHash: ip,
        userAgent: ua,
        occurredAt: new Date(),
      });
      return this.settle(startMs, { kind: "not_found" });
    }

    const due = await this.deps.charge.getPublicSummary(this.deps.tenantId, process.id);
    const yard = process.yardId ? await this.deps.yard.getPublicYard(this.deps.tenantId, process.yardId) : undefined;
    const dto = toOwnerPortalProcessDto(process, yard, due);
    const session = await signOwnerSession({ processId: process.id }, { secret: this.deps.sessionSecret });
    await this.deps.accessLog.append({
      tenantId: this.deps.tenantId,
      portal: "OWNER",
      action: "LOOKUP",
      outcome: "FOUND",
      processId: process.id,
      queryFingerprint: fingerprint,
      ipHash: ip,
      userAgent: ua,
      occurredAt: new Date(),
    });
    return this.settle(startMs, { kind: "found", process: dto, session });
  }

  // GET /portal/v1/owner/dossier — dossiê detalhado MINIMIZADO (§2.8). A SESSÃO É A AUTORIZAÇÃO: o processId vem
  // SEMPRE da JWE verificada (nunca do corpo). Rejeição uniforme p/ sessão ausente/expirada/forjada/audience-errada.
  async dossier(ctx: { authorization?: string; ip: string; userAgent?: string }): Promise<OwnerDossierResult> {
    const startMs = this.clock();
    const ip = ipHash(this.deps.logSecret, ctx.ip);
    const ua = truncateUa(ctx.userAgent);
    const nowMs = this.clock();

    const session = await resolveOwnerSession(ctx.authorization, this.deps.sessionSecret);
    if (!session) {
      // Sessão inválida = vetor de DoS BARATO (JWE forjada). Rate-limit por IP ANTES de logar → o flood de tokens
      // ruins não cresce a trilha sem teto (mesmo espírito do /challenge). Barrado → 429 SEM log.
      if (this.deps.antiAbuse.checkReadRate("anon", ip, nowMs).limited) {
        return this.settle(startMs, { kind: "rate_limited" });
      }
      await this.logPortal("DOSSIER_VIEWED", "SESSION_INVALID", { ip, ua });
      return this.settle(startMs, { kind: "session_invalid" });
    }

    // Sessão VÁLIDA (já custou um PoW no lookup) → rate-limit por sessão+IP (balde dedicado; sem PoW nos reads).
    const readKey = sessionRateKey(this.deps.logSecret, session.processId);
    if (this.deps.antiAbuse.checkReadRate(readKey, ip, nowMs).limited) {
      await this.logPortal("DOSSIER_VIEWED", "RATE_LIMITED", { ip, ua });
      return this.settle(startMs, { kind: "rate_limited" });
    }

    // processId DA SESSÃO — RLS garante que uma sessão de A jamais lê B (findByIdForPortal filtra tenant vinculado).
    const process = await this.deps.impound.findByIdForPortal(this.deps.tenantId, session.processId);
    if (!process) {
      await this.logPortal("DOSSIER_VIEWED", "NOT_FOUND", { ip, ua });
      return this.settle(startMs, { kind: "not_found" });
    }

    const [charges, plan, photoCandidates] = await Promise.all([
      this.deps.charge.getPublicItemizedSummary(this.deps.tenantId, process.id),
      this.deps.jurisdiction.getPortalProfile(this.deps.tenantId, process.profileId),
      this.deps.impound.listInspectionPhotosForPortal(this.deps.tenantId, process.id),
    ]);
    const yard = process.yardId ? await this.deps.yard.getPublicYard(this.deps.tenantId, process.yardId) : undefined;
    // Ω5P PR-17b (item 8) — `photos` vira {sets:[{opaqueRef,capturedAtLabel}]}. O opaqueRef é o MESMO HMAC que o
    // endpoint /photos/:opaqueRef recompõe — nunca o attachmentId cru (§2.8).
    const photoRefKey = derivePhotoRefKey(this.deps.logSecret);
    const photos = photoCandidates.map((candidate) => ({
      opaqueRef: photoRef(photoRefKey, candidate.attachmentId, process.id),
      capturedAtLabel: formatDateLabelPtBr(candidate.capturedAt),
    }));
    const dossier = toOwnerDossierDto({ process, yard, charges, plan, photos, now: new Date() });
    await this.logPortal("DOSSIER_VIEWED", "AUTHORIZED", { ip, ua, processId: process.id });
    return this.settle(startMs, { kind: "ok", dossier });
  }

  // GET /portal/v1/owner/photos/:opaqueRef — foto de evidência MINIMIZADA (resize≤1024px + marca-d'água, JPEG
  // q70), NUNCA full-res. D1 (coordenador-de-acessos, OBRIGATÓRIO): esta rota SÓ existe no ownerRouter isolado
  // (owner-portal.routes.ts) — NUNCA sob /api/v1, NUNCA com attachAuthenticatedActor. O opaqueRef é comparado
  // (C4: sem early-return, sobre TODAS as fotos do processo DA SESSÃO) — o attachmentId do cliente NUNCA existe
  // nesta rota (só o opaqueRef no path).
  async photo(ctx: { authorization?: string; opaqueRef: string; ip: string; userAgent?: string }): Promise<OwnerPhotoResult> {
    const startMs = this.clock();
    const ip = ipHash(this.deps.logSecret, ctx.ip);
    const ua = truncateUa(ctx.userAgent);
    const nowMs = this.clock();

    const session = await resolveOwnerSession(ctx.authorization, this.deps.sessionSecret);
    if (!session) {
      if (this.deps.antiAbuse.checkReadRate("anon", ip, nowMs).limited) {
        return this.settle(startMs, { kind: "rate_limited" });
      }
      await this.logPortal("PHOTO_VIEWED", "SESSION_INVALID", { ip, ua });
      return this.settle(startMs, { kind: "session_invalid" });
    }

    // C2 — balde DEDICADO de foto (mais restrito que o do dossiê; chave sessão+IP, mesmo padrão do readBucket).
    const rateKey = `${sessionRateKey(this.deps.logSecret, session.processId)}:${ip}`;
    if (!this.deps.photoRateLimiter.wouldAllow(rateKey, nowMs)) {
      await this.logPortal("PHOTO_VIEWED", "RATE_LIMITED", { ip, ua });
      return this.settle(startMs, { kind: "rate_limited" });
    }
    this.deps.photoRateLimiter.consume(rateKey, nowMs);

    // processId DA SESSÃO — nunca do path/corpo. RLS garante que a sessão de A jamais lê fotos de B.
    const process = await this.deps.impound.findByIdForPortal(this.deps.tenantId, session.processId);
    if (!process) {
      await this.logPortal("PHOTO_VIEWED", "NOT_FOUND", { ip, ua });
      return this.settle(startMs, { kind: "not_found" });
    }

    // D2 — subchave derivada (NUNCA o PORTAL_LOG_SECRET cru) + C4 — recompute contra TODAS as fotos do processo,
    // SEM early-return (OR booleano, o loop sempre roda até o fim), normalizando o caso "processo sem fotos".
    const photoRefKey = derivePhotoRefKey(this.deps.logSecret);
    const candidates = await this.deps.impound.listInspectionPhotosForPortal(this.deps.tenantId, process.id);
    let matchedAttachmentId: string | undefined;
    for (const candidate of candidates) {
      const expected = photoRef(photoRefKey, candidate.attachmentId, process.id);
      const isMatch = constantTimeEqual(photoRefKey, expected, ctx.opaqueRef);
      matchedAttachmentId = isMatch ? candidate.attachmentId : matchedAttachmentId; // sem break (C4)
    }
    if (candidates.length === 0) {
      // C4 — normaliza o timing do caso zero-fotos: ≥1 comparação dummy de mesmo formato.
      const dummyExpected = photoRef(photoRefKey, "00000000-0000-0000-0000-000000000000", process.id);
      constantTimeEqual(photoRefKey, dummyExpected, ctx.opaqueRef);
    }
    if (!matchedAttachmentId) {
      await this.logPortal("PHOTO_VIEWED", "NOT_FOUND", { ip, ua });
      return this.settle(startMs, { kind: "not_found" });
    }

    // C3 — cache SÓ pelo attachmentId JÁ RESOLVIDO (pós-HMAC), nunca pelo opaqueRef cru.
    const cached = this.deps.photoCache.get(matchedAttachmentId);
    if (cached) {
      await this.logPortal("PHOTO_VIEWED", "AUTHORIZED", { ip, ua, processId: process.id });
      return this.settle(startMs, { kind: "ok", buffer: cached.buffer, contentType: cached.contentType });
    }

    const attachment = await this.deps.impound.getInspectionPhotoAttachmentForPortal(this.deps.tenantId, process.id, matchedAttachmentId);
    if (!attachment || !attachment.storageProvider || !attachment.storageKey) {
      await this.logPortal("PHOTO_VIEWED", "NOT_FOUND", { ip, ua });
      return this.settle(startMs, { kind: "not_found" });
    }

    try {
      // Recon #2 — resolveAttachmentDownload resolve o buffer EM MEMÓRIA (sem disco). Objeto Attachment
      // sintético: só os campos usados pela função (storageProvider/storageKey/fileName/contentType); os demais
      // são placeholders inertes (nunca saem desta função).
      const attachmentForDownload: Attachment = {
        id: attachment.attachmentId,
        tenantId: this.deps.tenantId,
        entityType: "impound_intake_inspection",
        entityId: process.id,
        fileUrl: "",
        fileName: attachment.fileName,
        contentType: attachment.contentType,
        storageProvider: attachment.storageProvider,
        storageKey: attachment.storageKey,
        status: "stored",
        metadata: {},
        uploadedAt: new Date(0),
        createdAt: new Date(0),
      };
      const download = await resolveAttachmentDownload(attachmentForDownload);
      const sourceBuffer = Buffer.isBuffer(download.body) ? download.body : await streamToBuffer(download.body);

      // S2+C2 — semáforo GLOBAL de concorrência: além dele, 503 IMEDIATO (nunca enfileira). COMPOSIÇÃO CORRIGIDA
      // (conserto pós-junta, achado do crítico-adversarial): o guard envolve DIRETAMENTE o trabalho REAL
      // (`runPhotoPipeline`, SEM timeout embutido) — `inFlight` só decrementa quando a decodificação de fato
      // termina (resolve OU rejeita). O timeout de resposta HTTP envolve o RESULTADO de `guard.run(...)`, nunca
      // o inverso — se compuséssemos `guard.run(() => withTimeout(...))`, o `finally` do guard dispararia no que
      // resolvesse PRIMEIRO (o timeout de 4s OU o trabalho real), devolvendo o slot ao pool enquanto a
      // decodificação síncrona (jimp puro-JS) continua consumindo CPU em background sem ser contada — anulando a
      // garantia central do semáforo (N=3 decodificações reais simultâneas).
      const result = await withPhotoPipelineTimeout(
        this.deps.photoConcurrencyGuard.run(() => runPhotoPipeline(sourceBuffer, () => new Date(this.clock()))),
        PHOTO_PIPELINE_TIMEOUT_MS,
      );
      this.deps.photoCache.set(matchedAttachmentId, result.buffer, result.contentType);
      await this.logPortal("PHOTO_VIEWED", "AUTHORIZED", { ip, ua, processId: process.id });
      return this.settle(startMs, { kind: "ok", buffer: result.buffer, contentType: result.contentType });
    } catch (error) {
      if (error instanceof PhotoConcurrencySaturatedError) {
        // Sem log NOT_FOUND (não é "não encontrado" — é sobrecarga transitória). Sem AUTHORIZED (não serviu).
        return this.settle(startMs, { kind: "saturated" });
      }
      // Decode falho / timeout (PhotoPipelineError) / storage indisponível → erro GENÉRICO, NUNCA stack ao
      // cliente. Mesma filosofia anti-oráculo: não distingue "arquivo corrompido" de "não encontrado".
      await this.logPortal("PHOTO_VIEWED", "NOT_FOUND", { ip, ua });
      return this.settle(startMs, { kind: "not_found" });
    }
  }

  // POST /portal/v1/owner/release-request — registra a INTENÇÃO de liberação (nota curta opcional; SEM upload). O
  // processId vem da SESSÃO. Idempotente (1 aberta por processo via partial-unique). Resposta SEMPRE genérica.
  async releaseRequest(ctx: { authorization?: string; note?: string; ip: string; userAgent?: string }): Promise<OwnerReleaseRequestResult> {
    const startMs = this.clock();
    const ip = ipHash(this.deps.logSecret, ctx.ip);
    const ua = truncateUa(ctx.userAgent);
    const nowMs = this.clock();

    const session = await resolveOwnerSession(ctx.authorization, this.deps.sessionSecret);
    if (!session) {
      if (this.deps.antiAbuse.checkReadRate("anon", ip, nowMs).limited) {
        return this.settle(startMs, { kind: "rate_limited" });
      }
      await this.logPortal("RELEASE_REQUESTED", "SESSION_INVALID", { ip, ua });
      return this.settle(startMs, { kind: "session_invalid" });
    }

    const readKey = sessionRateKey(this.deps.logSecret, session.processId);
    if (this.deps.antiAbuse.checkReadRate(readKey, ip, nowMs).limited) {
      await this.logPortal("RELEASE_REQUESTED", "RATE_LIMITED", { ip, ua });
      return this.settle(startMs, { kind: "rate_limited" });
    }

    // Resolve o processo pelo id da sessão ANTES de inserir (evita FK-violation cross-tenant; resposta genérica).
    const process = await this.deps.impound.findByIdForPortal(this.deps.tenantId, session.processId);
    if (!process) {
      await this.logPortal("RELEASE_REQUESTED", "NOT_FOUND", { ip, ua });
      return this.settle(startMs, { kind: "ok" }); // genérica: não revela que o processo não existe neste tenant
    }

    await this.deps.releaseRequests.createIfNoneOpen({
      tenantId: this.deps.tenantId,
      processId: process.id,
      note: ctx.note,
      sessionRef: sessionRateKey(this.deps.logSecret, process.id).slice(0, 24), // ref OPACA (HMAC truncado); nunca a JWE
      requestedAt: new Date(),
    });
    // `created` é interno (idempotência); a resposta é genérica em ambos os casos → sem oráculo.
    await this.logPortal("RELEASE_REQUESTED", "AUTHORIZED", { ip, ua, processId: process.id });
    return this.settle(startMs, { kind: "ok" });
  }

  // 1 linha no PortalAccessLog (I10) para as ações autorizadas por sessão. Sem PII (só ip_hash/ua truncada;
  // processId só quando o desfecho amarra o bem — AUTHORIZED, coerente com o CHECK process_found alargado).
  private async logPortal(
    // Ω5P PR-17b (A1) — PHOTO_VIEWED usa o MESMO allowlist de campos do DOSSIER_VIEWED (só ip_hash/ua truncada +
    // outcome; process_id só em AUTHORIZED). Nunca attachmentId/opaqueRef em claro — nem aqui nem em nenhum lugar.
    action: "DOSSIER_VIEWED" | "RELEASE_REQUESTED" | "PHOTO_VIEWED",
    outcome: "AUTHORIZED" | "SESSION_INVALID" | "RATE_LIMITED" | "NOT_FOUND",
    ctx: { ip: string; ua?: string; processId?: string },
  ): Promise<void> {
    await this.deps.accessLog.append({
      tenantId: this.deps.tenantId,
      portal: "OWNER",
      action,
      outcome,
      processId: ctx.processId,
      ipHash: ctx.ip,
      userAgent: ctx.ua,
      occurredAt: new Date(),
    });
  }

  // Atraso mínimo CONSTANTE — normaliza a latência (a via com mais trabalho vs a via curta; a curta "espera" até o
  // piso). Aplicado a TODOS os desfechos → nenhuma via é um oráculo de timing. Genérico (lookup/dossier/release).
  private async settle<T>(startMs: number, result: T): Promise<T> {
    const elapsed = this.clock() - startMs;
    if (elapsed < this.deps.minLatencyMs) {
      await sleep(this.deps.minLatencyMs - elapsed);
    }
    return result;
  }
}
