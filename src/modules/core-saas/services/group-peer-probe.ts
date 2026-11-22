import type { Prisma } from "@prisma/client";

import {
  assertRowsBelongToTenant,
  setTenantRlsContext,
} from "../../../database/rls.js";
import {
  groupOfTenantOn,
  todayBusinessDate,
  type MemberRow,
} from "../../subscription-billing/economic-groups/membership.rules.js";

// Relogio injetavel da volta: os testes trocam groupProbeClock.now para ancorar o dia de negocio
// de Sao Paulo (K12 usa 2026-11-21T01:30:00Z = 22:30 de SP do dia anterior).
export const groupProbeClock = {
  now: (): Date => new Date(),
};

export type GroupPeerProbeInput = {
  readonly tenantId: string;
  readonly email: string;
};

export type GroupPeerProbeResult = {
  readonly users: number;
  readonly identityIds: readonly string[];
  readonly origins: readonly {
    readonly tenantId: string;
    readonly userId: string;
    readonly identityId: string | null;
    readonly attachedVia: string | null;
  }[];
};

// O e-mail ja tem acesso no grupo vigente: a criacao volta inteira e o servico grava o 'cancelado'.
export class EmailInGroupError extends Error {
  constructor() {
    super("email_in_group");
    this.name = "EmailInGroupError";
  }
}

export class LoginNotFoundInGroupError extends Error {
  constructor() {
    super("login_not_found_in_group");
    this.name = "LoginNotFoundInGroupError";
  }
}

export class LoginAmbiguousInGroupError extends Error {
  constructor() {
    super("login_ambiguous_in_group");
    this.name = "LoginAmbiguousInGroupError";
  }
}

type TenantIdRow = { readonly id: string };

type MembershipDbRow = {
  readonly tenant_id: string;
  readonly group_id: string;
  readonly valid_from: string;
  readonly valid_to: string | null;
};

type PeerUserRow = {
  readonly id: string;
  readonly tenantId: string;
  readonly identityId: string | null;
  readonly attachedVia: string | null;
};

type PeerUserDbRow = {
  readonly id: string;
  readonly tenant_id: string;
  readonly identity_id: string | null;
  readonly attached_via: string | null;
};

function toMemberRow(row: MembershipDbRow): MemberRow {
  return {
    tenantId: row.tenant_id,
    groupId: row.group_id,
    validFrom: row.valid_from,
    validTo: row.valid_to,
  };
}

function groupOfTenantOnDay(rows: readonly MemberRow[], tenantId: string, day: string): string | null {
  return groupOfTenantOn(rows, tenantId, day);
}

async function readMembership(
  tx: Prisma.TransactionClient,
  tenantId: string,
): Promise<MemberRow[]> {
  await setTenantRlsContext(tx, tenantId);

  const rows = await tx.$queryRaw<Array<MembershipDbRow>>`
    SELECT tenant_id::text AS tenant_id, group_id::text AS group_id,
           valid_from::text AS valid_from, valid_to::text AS valid_to
    FROM economic_group_members WHERE tenant_id = ${tenantId}::uuid
  `;
  const members = rows.map(toMemberRow);
  assertRowsBelongToTenant(members, tenantId, "economic_group_members");

  return members;
}

async function readPeerUsers(
  tx: Prisma.TransactionClient,
  peerId: string,
  email: string,
): Promise<PeerUserRow[]> {
  const rows = await tx.$queryRaw<Array<PeerUserDbRow>>`
    SELECT
      u.id::text AS id,
      u.tenant_id::text AS tenant_id,
      l.identity_id::text AS identity_id,
      l.attached_via AS attached_via
    FROM users u LEFT JOIN auth_identity_links l ON l.tenant_id = u.tenant_id AND l.user_id = u.id WHERE u.tenant_id = ${peerId}::uuid AND lower(u.email) = lower(${email})
  `;
  const peers = rows.map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    identityId: row.identity_id,
    attachedVia: row.attached_via,
  }));
  assertRowsBelongToTenant(peers, peerId, "users");

  return peers;
}

// A volta patio a patio: le a vigencia NA HORA, pelo dia de negocio de Sao Paulo, e conta os
// usuarios com o e-mail nos outros patios do grupo vigente — ativos ou nao (D6). Leitura de
// usuario so em patio do MESMO grupo (nunca a funcao de candidatos do login; censo G-VOLTA = 0).
export async function probeGroupPeers(
  tx: Prisma.TransactionClient,
  input: GroupPeerProbeInput,
): Promise<GroupPeerProbeResult> {
  const day = todayBusinessDate(groupProbeClock.now());
  const ownTenantId = input.tenantId;

  const tenantRows = await tx.$queryRaw<Array<TenantIdRow>>`
    SELECT id::text AS id FROM tenants ORDER BY id
  `;
  const tenantIds = tenantRows.map((row) => row.id);

  const ownMembership = await readMembership(tx, ownTenantId);
  const ownGroupId = groupOfTenantOnDay(ownMembership, ownTenantId, day);

  let users = 0;
  const identityIds = new Set<string>();
  const origins: Array<{
    tenantId: string;
    userId: string;
    identityId: string | null;
    attachedVia: string | null;
  }> = [];

  try {
    if (ownGroupId !== null) {
      for (const peerId of tenantIds) {
        if (peerId === ownTenantId) continue;

        const peerMembership = await readMembership(tx, peerId);
        const peerGroupId = groupOfTenantOnDay(peerMembership, peerId, day);
        if (peerGroupId !== ownGroupId) continue;

        const peerUsers = await readPeerUsers(tx, peerId, input.email);
        for (const row of peerUsers) {
          users += 1;
          origins.push({
            tenantId: row.tenantId,
            userId: row.id,
            identityId: row.identityId,
            attachedVia: row.attachedVia,
          });
          if (row.identityId !== null) {
            identityIds.add(row.identityId);
          }
        }
      }
    }
  } catch (error) {
    // A reposicao do GUC nunca toma o lugar do erro que ja esta subindo (1.8.3.17, I1): com a transacao abortada pelo
    // prazo, o set_config falharia com 25P02 e esconderia o 55P03/57014 que vira 503. So a falha da reposicao e engolida.
    await setTenantRlsContext(tx, ownTenantId).catch(() => undefined);
    throw error;
  }

  // Devolve o contexto da organizacao de origem: quem chamou continua a criar o usuario NELA.
  await setTenantRlsContext(tx, ownTenantId);

  return { users, identityIds: [...identityIds], origins };
}

export function loginOriginsOf(
  origins: GroupPeerProbeResult["origins"],
  identityId: string,
): GroupPeerProbeResult["origins"] {
  return origins.filter(
    (peer) =>
      peer.identityId === identityId &&
      peer.attachedVia !== "concessao" &&
      peer.attachedVia !== "religacao",
  );
}
