// Ω5P PR-17b — C3 (critico-adversarial, OBRIGATÓRIO): cache LRU IN-PROCESS do BUFFER JÁ MINIMIZADO, chaveado
// SEMPRE pelo attachmentId INTERNO já resolvido — NUNCA pelo opaqueRef cru do cliente. Lookup/write só podem
// acontecer DEPOIS que o opaqueRef já foi comparado por HMAC (owner-portal.service.ts). Chavear pelo opaqueRef
// abriria um ORÁCULO de cache-hit-timing: um opaqueRef ADIVINHADO que bate uma chave de cache responderia mais
// rápido (hit) que um que não bate (sempre miss), mesmo SEM nunca ter sido validado — vazando 1 bit por tentativa
// sobre se o ref "parece" certo. Chaveando pelo attachmentId (só alcançável PÓS-validação), um ref adivinhado
// errado nunca toca o cache, e o timing do caminho de rejeição é uniforme.
//
// B1 (agente-dba-guardiao, backlog OBRIGATÓRIO): quando I9 (expurgo/anonimização de evidência) for implementado,
// este cache PRECISA de invalidação ATIVA — não pode depender só do TTL passivo de 15min. Uma foto expurgada
// continuaria servível pelo cache até o TTL expirar, o que violaria o expurgo. Registrar/priorizar em Ω6
// (backlog: "PortalPhotoCache — invalidação ativa acoplada ao expurgo de evidência I9").

export const PHOTO_CACHE_MAX_ENTRIES = 50;
export const PHOTO_CACHE_MAX_BYTES = 32 * 1024 * 1024; // 32MB agregados
export const PHOTO_CACHE_TTL_MS = 15 * 60 * 1000; // 15min

export type CachedPhoto = { readonly buffer: Buffer; readonly contentType: string };

type CacheEntry = CachedPhoto & { readonly storedAtMs: number };

export class PhotoLruCache {
  // Map preserva a ordem de INSERÇÃO — usamos delete+set no `get`/`set` para simular "mover para o fim" (mais
  // recentemente usado), e evictamos pelo início (mais antigo) quando algum teto estoura.
  private readonly entries = new Map<string, CacheEntry>();
  private totalBytes = 0;

  constructor(
    private readonly maxEntries: number = PHOTO_CACHE_MAX_ENTRIES,
    private readonly maxBytes: number = PHOTO_CACHE_MAX_BYTES,
    private readonly ttlMs: number = PHOTO_CACHE_TTL_MS,
    private readonly now: () => number = () => Date.now(),
  ) {}

  get sizeForTests(): number {
    return this.entries.size;
  }

  // Lookup SÓ pelo attachmentId interno (pós-HMAC — C3). undefined = miss (ausente ou expirado pelo TTL).
  get(attachmentId: string): CachedPhoto | undefined {
    const entry = this.entries.get(attachmentId);
    if (!entry) return undefined;
    if (this.now() - entry.storedAtMs > this.ttlMs) {
      this.remove(attachmentId, entry);
      return undefined;
    }
    // Toque de LRU: reinsere ao final (mais recentemente usado).
    this.entries.delete(attachmentId);
    this.entries.set(attachmentId, entry);
    return { buffer: entry.buffer, contentType: entry.contentType };
  }

  // Write SÓ pelo attachmentId interno (pós-HMAC — C3).
  set(attachmentId: string, buffer: Buffer, contentType: string): void {
    const existing = this.entries.get(attachmentId);
    if (existing) this.remove(attachmentId, existing);
    this.entries.set(attachmentId, { buffer, contentType, storedAtMs: this.now() });
    this.totalBytes += buffer.length;
    this.evictIfNeeded();
  }

  reset(): void {
    this.entries.clear();
    this.totalBytes = 0;
  }

  private remove(key: string, entry: CacheEntry): void {
    this.entries.delete(key);
    this.totalBytes -= entry.buffer.length;
  }

  private evictIfNeeded(): void {
    while (this.entries.size > this.maxEntries || this.totalBytes > this.maxBytes) {
      const oldestKey = this.entries.keys().next().value as string | undefined;
      if (oldestKey === undefined) break;
      const oldest = this.entries.get(oldestKey);
      if (oldest) this.remove(oldestKey, oldest);
      else this.entries.delete(oldestKey);
    }
  }
}

// Singleton do processo — reusado pelo owner-portal.runtime.ts default wiring; testes constroem instâncias
// próprias (TTL/tetos injetáveis) via `new PhotoLruCache(...)`.
export const defaultPhotoLruCache = new PhotoLruCache();
