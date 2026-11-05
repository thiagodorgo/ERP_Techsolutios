// B-ASS-02 — abstração da trilha de atos de plataforma (sem organização). A persistência real em
// platform_audit_logs nasce na B-ASS-05 (M4, §3.2 do plano); aqui o módulo entrega o CONTRATO — o que
// o serviço grava e quando — e uma gravação em memória para dev/teste. Nenhum preço, valor ou segredo
// entra na trilha: só ação, entidade e códigos de plano (já públicos no catálogo).

export type PlatformAuditEntry = {
  readonly action: string;
  readonly entity: string;
  readonly entityId?: string | null;
  readonly metadata?: Readonly<Record<string, unknown>>;
};

export type PlatformAuditWriter = {
  record(entry: PlatformAuditEntry): Promise<void>;
};

export class RecordingPlatformAuditWriter implements PlatformAuditWriter {
  private readonly entries: PlatformAuditEntry[] = [];

  async record(entry: PlatformAuditEntry): Promise<void> {
    this.entries.push(entry);
  }

  list(): readonly PlatformAuditEntry[] {
    return this.entries;
  }

  clear(): void {
    this.entries.length = 0;
  }
}
