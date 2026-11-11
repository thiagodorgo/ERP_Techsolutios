// B-ASS-08b · (c2) — repositório Prisma de `subscription_statement_invoices` (FORCE RLS). Toda operação roda sob
// `withTenantRls(tenantId)`; o espelho em `subscription_statements.invoice_status` vai na MESMA transação. `beginIssue`
// reserva `numero_dps` em `billing_invoice_sequences` (GLOBAL, sem RLS — exceção declarada M5) com `nextDpsNumberInTx` no
// MESMO `tx` da linha da nota: rollback não consome número (R-H, T-NF-db-1). Nenhuma rede aqui (R-OBX-1).

import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../../database/rls.js";
import { nextDpsNumberInTx } from "../invoice-sequence.service.js";
import { InvoiceProviderError } from "../providers/invoice/invoice-errors.js";
import type { AuthorizedPatch, BeginIssueInput, StatementInvoiceRepository } from "./invoices.repository.js";
import { invoiceExternalRef, type StatementInvoiceStatus, type SubscriptionStatementInvoice } from "./invoices.types.js";

type Row = {
  id: string;
  tenant_id: string;
  statement_id: string;
  seq: number;
  provider: string;
  external_ref: string;
  provider_invoice_id: string | null;
  serie_dps: number | null;
  numero_dps: number | null;
  status: string;
  number: string | null;
  verification_code: string | null;
  pdf_url: string | null;
  xml_url: string | null;
  pdf_source: string | null;
  issued_at: Date | null;
  cancelled_at: Date | null;
  cancel_reason: string | null;
  cancel_code: string | null;
  error: string | null;
  created_at: Date;
  updated_at: Date;
};

function toDomain(row: Row): SubscriptionStatementInvoice {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    statementId: row.statement_id,
    seq: row.seq,
    provider: row.provider,
    externalRef: row.external_ref,
    providerInvoiceId: row.provider_invoice_id,
    serieDps: row.serie_dps,
    numeroDps: row.numero_dps,
    status: row.status as StatementInvoiceStatus,
    number: row.number,
    verificationCode: row.verification_code,
    pdfUrl: row.pdf_url,
    xmlUrl: row.xml_url,
    pdfSource: (row.pdf_source as SubscriptionStatementInvoice["pdfSource"]) ?? null,
    issuedAt: row.issued_at,
    cancelledAt: row.cancelled_at,
    cancelReason: row.cancel_reason,
    cancelCode: row.cancel_code,
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const LIVE_SQL = `status IN ('pending', 'authorized', 'cancel_pending')`;

/** §2.1 do conserto-c2 / §11 (k): o DEMONSTRATIVO PRIMEIRO. Toda transação da nota trava o demonstrativo antes de mexer na
 * linha da nota (o INSERT da nota toma KEY SHARE no demonstrativo pela FK, e o espelho, depois, um UPDATE: sem a trava antes,
 * é o upgrade KEY SHARE → UPDATE que o T-LOCK-2 acusa como ORD-0). `FOR NO KEY UPDATE` é a mesma força do UPDATE do espelho
 * (não bloqueia o INSERT de filhas de outras transações). `false` = demonstrativo inexistente (ou de outra organização). */
async function lockStatement(tx: Prisma.TransactionClient, statementId: string): Promise<boolean> {
  const rows = (await tx.$queryRawUnsafe(`SELECT id FROM subscription_statements WHERE id = $1::uuid FOR NO KEY UPDATE`, statementId)) as Array<{ id: string }>;
  return rows.length > 0;
}

/** A mesma trava, achada pela nota: o demonstrativo da nota, `FOR NO KEY UPDATE OF s` (só o demonstrativo; a linha da nota é
 * travada depois, pelo UPDATE condicional). `false` = nota inexistente (ou de outra organização). */
async function lockStatementOfInvoice(tx: Prisma.TransactionClient, invoiceId: string): Promise<boolean> {
  const rows = (await tx.$queryRawUnsafe(
    `SELECT s.id FROM subscription_statements s JOIN subscription_statement_invoices i ON i.statement_id = s.id AND i.tenant_id = s.tenant_id WHERE i.id = $1::uuid FOR NO KEY UPDATE OF s`,
    invoiceId,
  )) as Array<{ id: string }>;
  return rows.length > 0;
}

/** O espelho do estado da nota viva no demonstrativo — na MESMA transação da linha da nota, com o demonstrativo já travado. */
async function mirrorStatement(tx: Prisma.TransactionClient, statementId: string, status: StatementInvoiceStatus, now: Date): Promise<void> {
  await tx.$executeRawUnsafe(`UPDATE subscription_statements SET invoice_status = $2, updated_at = $3 WHERE id = $1::uuid`, statementId, status, now);
}

export class PrismaStatementInvoiceRepository implements StatementInvoiceRepository {
  constructor(private readonly client: PrismaClient) {}

  async beginIssue(input: BeginIssueInput, now: Date): Promise<{ readonly invoice: SubscriptionStatementInvoice; readonly created: boolean }> {
    return withTenantRls(this.client, input.tenantId, async (tx) => {
      // O demonstrativo PRIMEIRO (§2.1): duas emissões do mesmo demonstrativo se serializam aqui.
      if (!(await lockStatement(tx, input.statementId))) throw new Error("statement_not_found");
      const externalRef = invoiceExternalRef(input.statementId, input.seq);
      const existing = (await tx.$queryRawUnsafe(
        `SELECT * FROM subscription_statement_invoices WHERE provider = $1 AND external_ref = $2`,
        input.provider,
        externalRef,
      )) as Row[];
      if (existing.length > 0) return { invoice: toDomain(existing[0]!), created: false };
      const live = (await tx.$queryRawUnsafe(
        `SELECT external_ref FROM subscription_statement_invoices WHERE statement_id = $1::uuid AND ${LIVE_SQL} LIMIT 1`,
        input.statementId,
      )) as Array<{ external_ref: string }>;
      if (live.length > 0) throw new InvoiceProviderError("invoice_already_live", "The statement already has a live invoice.", { existingId: live[0]!.external_ref });
      // R-H/G10: o número nasce na MESMA transação da linha — rollback não consome número.
      const numeroDps = await nextDpsNumberInTx(tx, { provider: input.provider, environment: input.environment, serie: input.serie });
      const rows = (await tx.$queryRawUnsafe(
        `INSERT INTO subscription_statement_invoices
           (tenant_id, statement_id, seq, provider, external_ref, serie_dps, numero_dps, status, created_at, updated_at)
         VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, 'pending', $8, $8) RETURNING *`,
        input.tenantId,
        input.statementId,
        input.seq,
        input.provider,
        externalRef,
        input.serie,
        numeroDps,
        now,
      )) as Row[];
      await mirrorStatement(tx, input.statementId, "pending", now);
      return { invoice: toDomain(rows[0]!), created: true };
    });
  }

  async findByRef(tenantId: string, provider: string, externalRef: string): Promise<SubscriptionStatementInvoice | undefined> {
    return withTenantRls(this.client, tenantId, async (tx) => {
      const rows = (await tx.$queryRawUnsafe(`SELECT * FROM subscription_statement_invoices WHERE provider = $1 AND external_ref = $2`, provider, externalRef)) as Row[];
      return rows.length > 0 ? toDomain(rows[0]!) : undefined;
    });
  }

  async findLive(tenantId: string, statementId: string): Promise<SubscriptionStatementInvoice | undefined> {
    return withTenantRls(this.client, tenantId, async (tx) => {
      const rows = (await tx.$queryRawUnsafe(`SELECT * FROM subscription_statement_invoices WHERE statement_id = $1::uuid AND ${LIVE_SQL} LIMIT 1`, statementId)) as Row[];
      return rows.length > 0 ? toDomain(rows[0]!) : undefined;
    });
  }

  async listByStatement(tenantId: string, statementId: string): Promise<readonly SubscriptionStatementInvoice[]> {
    return withTenantRls(this.client, tenantId, async (tx) => {
      const rows = (await tx.$queryRawUnsafe(`SELECT * FROM subscription_statement_invoices WHERE statement_id = $1::uuid ORDER BY seq ASC`, statementId)) as Row[];
      return rows.map(toDomain);
    });
  }

  // Cada mutação abaixo é um UPDATE condicional da linha + espelho no demonstrativo, na MESMA transação; sem linha
  // alcançada, nada muda. O SQL fica LITERAL em cada sítio (nunca numa variável): o guard de escritores
  // (tests/inventory-write-paths-guard.test.ts, D1) classifica todo `$queryRawUnsafe` pelo literal — SQL dinâmico é
  // "escritor em potencial sem classificação" e reprova (medido nesta 08b: o helper com `sql: string` ficou vermelho).

  async markIssued(tenantId: string, id: string, providerInvoiceId: string | null, now: Date): Promise<void> {
    await withTenantRls(this.client, tenantId, async (tx) => {
      if (!(await lockStatementOfInvoice(tx, id))) return;
      const rows = (await tx.$queryRawUnsafe(
        `UPDATE subscription_statement_invoices
           SET provider_invoice_id = COALESCE($2, provider_invoice_id), issued_at = COALESCE(issued_at, $3), updated_at = $3
         WHERE id = $1::uuid AND status = 'pending' RETURNING statement_id`,
        id,
        providerInvoiceId,
        now,
      )) as Array<{ statement_id: string }>;
      if (rows.length > 0) await mirrorStatement(tx, rows[0]!.statement_id, "pending", now);
    });
  }

  async markAuthorized(tenantId: string, id: string, patch: AuthorizedPatch, now: Date): Promise<void> {
    await withTenantRls(this.client, tenantId, async (tx) => {
      if (!(await lockStatementOfInvoice(tx, id))) return;
      const rows = (await tx.$queryRawUnsafe(
        `UPDATE subscription_statement_invoices
           SET status = 'authorized', number = $2, verification_code = $3, pdf_url = $4, xml_url = $5, pdf_source = $6, error = NULL, updated_at = $7
         WHERE id = $1::uuid AND status IN ('pending', 'authorized') RETURNING statement_id`,
        id,
        patch.number ?? null,
        patch.verificationCode ?? null,
        patch.pdfUrl ?? null,
        patch.xmlUrl ?? null,
        patch.pdfSource,
        now,
      )) as Array<{ statement_id: string }>;
      if (rows.length > 0) await mirrorStatement(tx, rows[0]!.statement_id, "authorized", now);
    });
  }

  async markRejected(tenantId: string, id: string, error: string | null, now: Date): Promise<void> {
    await withTenantRls(this.client, tenantId, async (tx) => {
      if (!(await lockStatementOfInvoice(tx, id))) return;
      const rows = (await tx.$queryRawUnsafe(
        `UPDATE subscription_statement_invoices SET status = 'rejected', error = $2, updated_at = $3 WHERE id = $1::uuid AND status = 'pending' RETURNING statement_id`,
        id,
        error,
        now,
      )) as Array<{ statement_id: string }>;
      if (rows.length > 0) await mirrorStatement(tx, rows[0]!.statement_id, "rejected", now);
    });
  }

  async markCancelPending(tenantId: string, id: string, cancel: { readonly reason: string; readonly code: string }, now: Date): Promise<void> {
    await withTenantRls(this.client, tenantId, async (tx) => {
      if (!(await lockStatementOfInvoice(tx, id))) return;
      const rows = (await tx.$queryRawUnsafe(
        `UPDATE subscription_statement_invoices SET status = 'cancel_pending', cancel_reason = $2, cancel_code = $3, updated_at = $4
         WHERE id = $1::uuid AND status IN ('authorized', 'cancel_pending') RETURNING statement_id`,
        id,
        cancel.reason,
        cancel.code,
        now,
      )) as Array<{ statement_id: string }>;
      if (rows.length > 0) await mirrorStatement(tx, rows[0]!.statement_id, "cancel_pending", now);
    });
  }

  async markCancelFailed(tenantId: string, id: string, error: string | null, now: Date): Promise<void> {
    await withTenantRls(this.client, tenantId, async (tx) => {
      if (!(await lockStatementOfInvoice(tx, id))) return;
      const rows = (await tx.$queryRawUnsafe(
        `UPDATE subscription_statement_invoices SET status = 'authorized', error = $2, updated_at = $3 WHERE id = $1::uuid AND status = 'cancel_pending' RETURNING statement_id`,
        id,
        error,
        now,
      )) as Array<{ statement_id: string }>;
      if (rows.length > 0) await mirrorStatement(tx, rows[0]!.statement_id, "authorized", now);
    });
  }

  async markCancelled(tenantId: string, id: string, now: Date): Promise<void> {
    await withTenantRls(this.client, tenantId, async (tx) => {
      if (!(await lockStatementOfInvoice(tx, id))) return;
      const rows = (await tx.$queryRawUnsafe(
        `UPDATE subscription_statement_invoices SET status = 'cancelled', cancelled_at = $2, updated_at = $2 WHERE id = $1::uuid AND status <> 'cancelled' RETURNING statement_id`,
        id,
        now,
      )) as Array<{ statement_id: string }>;
      if (rows.length > 0) await mirrorStatement(tx, rows[0]!.statement_id, "cancelled", now);
    });
  }
}
