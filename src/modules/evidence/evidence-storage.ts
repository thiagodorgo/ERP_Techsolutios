// B-EVIDENCIA-DURAVEL (plano §3.6 e Emenda 1 §E1.4) — este arquivo deixou de ser escritor de bytes. O provedor local
// protegido (que gravava a foto do app no diretório temporário do sistema, perdida no reinício) e os seus 3 tipos saíram:
// a foto grava pelo provedor da D-014 (`mobile-evidence-upload.ts`). Ficam os limites, os scanners e a trilha.

export const EVIDENCE_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const EVIDENCE_ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png"]);

export type EvidenceScanInput = {
  readonly tenantId: string;
  readonly evidenceId: string;
  readonly clientEvidenceId: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly checksumSha256: string;
  readonly buffer: Buffer;
};

export type EvidenceScanResult =
  | { readonly status: "clean" }
  | { readonly status: "infected"; readonly reason?: string }
  | { readonly status: "failed"; readonly reason?: string };

export interface EvidenceScanner {
  scan(input: EvidenceScanInput): Promise<EvidenceScanResult>;
}

export class NoopEvidenceScanner implements EvidenceScanner {
  async scan(): Promise<EvidenceScanResult> {
    return { status: "clean" };
  }
}

export class FakeEvidenceScanner implements EvidenceScanner {
  constructor(private readonly result: EvidenceScanResult) {}

  async scan(): Promise<EvidenceScanResult> {
    return this.result;
  }
}

/**
 * B-O6R-07b (Ω6R-SEC-004) — o scanner FAIL-CLOSED.
 *
 * `NoopEvidenceScanner` responde `clean` para qualquer byte: era ele o default de módulo das 3 vias que
 * tinham scanner, e é literalmente o primeiro dos três mecanismos do achado ("scanner default sempre
 * clean"). Este aqui é o oposto: nunca aprova nada. Em produção (e em staging, que roda
 * `NODE_ENV=production` — `fly.staging.toml:31`) ele é o default resolvido por
 * `evidence-scanner.factory.ts`, e o efeito é declarado em voz alta no plano §3.2/§10: **todo upload
 * responde 503 até existir antivírus real** (`P-O6R-B07B-SCANNER-AV-REAL`, serviço externo → junta-5).
 * A alternativa — deixar o Noop de pé em produção — É o achado.
 */
export class UnavailableEvidenceScanner implements EvidenceScanner {
  async scan(): Promise<EvidenceScanResult> {
    return { status: "failed", reason: "scanner_not_configured" };
  }
}

export type EvidenceAuditAction =
  | "evidence.upload.accepted"
  | "evidence.upload.rejected"
  | "evidence.upload.scan_failed"
  // B-EVIDENCIA-DURAVEL (plano §3.2): o provedor da D-014 falhou ao gravar; a rota responde 503 e o app mantém a foto.
  | "evidence.upload.storage_failed"
  | "evidence.upload.stored";

export type EvidenceAuditEvent = {
  readonly action: EvidenceAuditAction;
  readonly tenantId: string;
  readonly actorId: string;
  readonly evidenceId: string;
  readonly outcome: "success" | "failure" | "denied";
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
};

const sensitiveAuditKeys = new Set([
  "authorization",
  "bearer",
  "accesstoken",
  "refreshtoken",
  "token",
  "base64",
  "file_data",
  "local_path",
  "path",
  "bucket",
  "storage_key",
  "storagekey",
  "absolutepath",
]);

const auditEvents: EvidenceAuditEvent[] = [];

export function recordEvidenceAuditEvent(input: Omit<EvidenceAuditEvent, "metadata" | "createdAt"> & {
  readonly metadata?: Readonly<Record<string, unknown>>;
}): void {
  auditEvents.push({
    ...input,
    metadata: sanitizeEvidenceAuditMetadata(input.metadata ?? {}),
    createdAt: new Date().toISOString(),
  });
}

export function getEvidenceAuditEventsForTests(): readonly EvidenceAuditEvent[] {
  return auditEvents.map((event) => ({
    ...event,
    metadata: { ...event.metadata },
  }));
}

export function resetEvidenceAuditEventsForTests(): void {
  auditEvents.length = 0;
}

export function sanitizeEvidenceAuditMetadata(value: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    const normalized = key.toLowerCase();
    if (sensitiveAuditKeys.has(normalized)) continue;
    sanitized[key] = sanitizeEvidenceAuditValue(entry);
  }
  return sanitized;
}

function sanitizeEvidenceAuditValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeEvidenceAuditValue);
  }
  if (value && typeof value === "object") {
    return sanitizeEvidenceAuditMetadata(value as Readonly<Record<string, unknown>>);
  }
  return value;
}
