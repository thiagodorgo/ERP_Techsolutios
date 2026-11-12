// B-SAN3-18 — arnês do gate de módulo: o app REAL (`createApp`) sobre o núcleo em memória, organizações com módulos
// explícitos e tokens JWT de verdade (`signAccessToken`). Sem banco e sem desvio em `src/`: o gate lê os módulos da
// organização do ator pelo mesmo `ICoreSaasService` que o app recebe.
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

export { TODOS_OS_MODULOS } from "./san3-18-modulos.js";

export type Resposta = { readonly status: number; readonly reason: string; readonly body: any };

export type ArnesDoGate = {
  readonly baseUrl: string;
  readonly core: any;
  readonly criarOrganizacao: (modules: readonly string[], nome?: string) => { readonly id: string };
  readonly criarUsuario: (tenantId: string, roles: readonly string[]) => { readonly id: string; readonly email: string };
  readonly token: (input: { readonly tenantId: string; readonly userId: string; readonly email?: string; readonly roles: readonly string[] }) => Promise<string>;
  readonly chamar: (method: string, path: string, opcoes?: { readonly token?: string; readonly headers?: Record<string, string>; readonly body?: unknown }) => Promise<Resposta>;
  readonly fechar: () => Promise<void>;
};

let contador = 0;

export async function abrirArnesDoGate(opcoes: { readonly envolverServico?: (servico: any) => any } = {}): Promise<ArnesDoGate> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";
  delete process.env.DATABASE_URL;
  delete process.env.REDIS_URL;

  const [{ createApp }, { signAccessToken }, { CoreSaasRegistry }, { MemoryCoreSaasAdapter }, { InMemoryCoreSaasStore }] = await Promise.all([
    import("../../src/app.js"),
    import("../../src/modules/auth/index.js"),
    import("../../src/modules/core-saas/services/core-saas.service.js"),
    import("../../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../../src/modules/core-saas/store/core-saas.store.js"),
  ]);
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const adapter = new MemoryCoreSaasAdapter(core);
  const servico = opcoes.envolverServico ? opcoes.envolverServico(adapter) : adapter;
  const app = createApp(servico);
  const server: Server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  return {
    baseUrl,
    core,
    criarOrganizacao: (modules, nome) => core.createTenant({ name: nome ?? `Gate ${++contador}`, modules: [...modules] }),
    criarUsuario: (tenantId, roles) => {
      const email = `gate-${++contador}-${Date.now()}@example.com`;
      const user = core.createUser({ tenantId, name: `Gate ${contador}`, email, roles: [...roles] });
      return { id: user.id, email };
    },
    token: ({ tenantId, userId, email, roles }) =>
      signAccessToken({ user_id: userId, tenant_id: tenantId, email: email ?? `${userId}@example.com`, roles: [...roles] }),
    chamar: async (method, path, opcoesChamada = {}) => {
      const headers: Record<string, string> = { "content-type": "application/json", ...(opcoesChamada.headers ?? {}) };
      if (opcoesChamada.token) headers.authorization = `Bearer ${opcoesChamada.token}`;
      const semCorpo = method === "GET" || method === "HEAD";
      const response = await fetch(baseUrl + path, {
        method,
        headers,
        body: semCorpo ? undefined : JSON.stringify(opcoesChamada.body ?? {}),
        signal: AbortSignal.timeout(5000),
      }).catch(() => null);
      if (!response) return { status: 0, reason: "sem-resposta", body: null };
      const text = await response.text().catch(() => "");
      let body: any = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = null;
      }
      return { status: response.status, reason: String(body?.error?.reason ?? ""), body };
    },
    fechar: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
