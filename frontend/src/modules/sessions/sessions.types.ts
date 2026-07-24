// Ω4C PR-11 — Sessões e Acessos (Controle > Usuários). DTOs camelCase do backend admin de sessões
// (GET /sessions · GET /sessions/access-history · POST /sessions/:id/revoke). §2.8/D-Ω4C-AUD-ALLOWLIST-2.8:
// o front NUNCA carrega refresh_token_hash, ip_address cru, tenant_id nem user_id externo — só o allowlist
// que a tela mostra. O device é um rótulo grosseiro ("Chrome · Windows"), nunca a user-agent crua.

// Status em INGLÊS no contrato (rótulo PT-BR só na fronteira de apresentação — sessions.adapter.ts).
export type SessionStatus = "active" | "revoked" | "expired";

// Uma sessão ativa (linha da lista de Sessões). Datas chegam como ISO string do backend.
export type SessionView = {
  readonly id: string;
  readonly userLabel: string;
  readonly loginAt: string;
  readonly lastActivityAt: string;
  readonly deviceLabel: string;
  readonly status: string;
};

// Último acesso por usuário (linha da lista de Acessos), derivado de auth_sessions.created_at.
export type AccessView = {
  readonly userLabel: string;
  readonly lastAccessAt: string;
};

// `forbidden` é o estado §7 "acesso não permitido" (403 mapeado no service); distinto do fallback genérico.
export type SessionsSource = "api" | "mock" | "fallback" | "forbidden";

export type SessionsData = {
  readonly sessions: readonly SessionView[];
  readonly source: SessionsSource;
};

export type AccessData = {
  readonly accesses: readonly AccessView[];
  readonly source: SessionsSource;
};

export type SessionsApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

// Lista VAZIA honesta (mock/erro/403): sem inventar sessão (D-007). A UI mostra o estado honesto.
export function emptySessions(source: SessionsSource): SessionsData {
  return { sessions: [], source };
}

export function emptyAccesses(source: SessionsSource): AccessData {
  return { accesses: [], source };
}
