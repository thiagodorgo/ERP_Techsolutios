// Ω5P PR-17b — S2+C2 (junta-5 UNÂNIME, requisito OBRIGATÓRIO — convergência agente-secops + critico-adversarial):
// SEMÁFORO GLOBAL de concorrência para a decodificação/resize de fotos, no PROCESSO Node INTEIRO (não por sessão,
// não por rota). O timeout de 4000ms do pipeline (owner-portal.photo-pipeline.ts) NÃO cancela trabalho SÍNCRONO
// já em curso — um `Jimp.read()`/resize em andamento continua consumindo CPU até terminar, o timeout só desiste
// de ESPERAR a resposta. Quem realmente CONTÉM o CPU-bound é este limite: no máximo N decodificações simultâneas
// no processo; a (N+1)-ésima requisição recebe 503 IMEDIATO — nunca enfileira sem teto (isso só trocaria fila de
// CPU por fila de memória/latência não-cotada).
//
// N=3 — dado o volume BAIXO do owner-portal (superfície pública de consulta, não um pipeline de mídia em massa);
// number explícito exigido pelo crítico (C2). Zero dependência nova (contador in-process).

export const PHOTO_PIPELINE_MAX_CONCURRENCY = 3;

// 503 genérico — nunca detalha "quantas decodificações estão em curso" (§2.8 anti-fingerprinting de carga).
export class PhotoConcurrencySaturatedError extends Error {
  constructor() {
    super("Muitas solicitações de imagem em processamento no momento. Tente novamente em instantes.");
    this.name = "PhotoConcurrencySaturatedError";
  }
}

export class PhotoConcurrencyGuard {
  private inFlight = 0;

  constructor(private readonly maxConcurrency: number = PHOTO_PIPELINE_MAX_CONCURRENCY) {}

  get inFlightCountForTests(): number {
    return this.inFlight;
  }

  // Admite a task SÓ se houver folga (peek+incremento síncronos — sem corrida entre o check e o incremento, pois
  // o event loop é single-thread e nenhum `await` ocorre entre a leitura de `inFlight` e o `+= 1`). Estourou →
  // rejeita IMEDIATAMENTE com PhotoConcurrencySaturatedError (nunca enfileira).
  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.inFlight >= this.maxConcurrency) {
      throw new PhotoConcurrencySaturatedError();
    }
    this.inFlight += 1;
    try {
      return await task();
    } finally {
      this.inFlight -= 1;
    }
  }
}

// Singleton do processo — TODAS as leituras de foto do owner-portal (qualquer sessão/processo) compartilham o
// MESMO semáforo, porque a contenção é de CPU do processo Node, não de um recurso por-tenant.
export const defaultPhotoConcurrencyGuard = new PhotoConcurrencyGuard();
