import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "../../../services/api/client";
import type { BillingOpsAccess } from "./billing-ops.access";
import { getBillingProfile, getCharges, getStatement, listBillingOrganizations, listInvoiceBacklog, listProviders, listQueue, listStatements, runLimited } from "./billing-ops.service";
import type { BillingOpsData, BillingProfileSummary, ChargesView, Organization, OrganizationReading, ProvidersReading, StatementDetail } from "./billing-ops.types";

// B-ASS-10c-OPERACAO — a leitura da tela (§3.1 do plano e emenda 1, A3). Ao abrir: a lista de organizações e, para cada
// uma, 5 leituras em segundo plano (demonstrativos, fila em revisão, fila com falha, notas pendentes e perfil), no máximo
// 3 requisições ao mesmo tempo (`runLimited`, R-PARCIAL). Organização com qualquer leitura falhada fica "não carregou" e
// nunca entra como zero. Os provedores só são lidos com `platform:billing-providers:manage` (sem a chave, nenhuma
// requisição). Releitura que falha mantém os últimos dados confirmados e liga o aviso de desatualizados.

export type DetailReading =
  | { readonly state: "loading" }
  | { readonly state: "failed"; readonly notFound: boolean }
  | { readonly state: "ok"; readonly detail: StatementDetail; readonly charges: ChargesView };

const EMPTY: BillingOpsData = { organizations: [], listState: "loading", readings: {}, providers: { state: "loading" }, stale: false, readAt: null };

type OkReading = Extract<OrganizationReading, { state: "ok" }>;

/** As 5 leituras de uma organização, cada uma uma tarefa de UMA requisição (o teto de 3 vale por requisição). */
function organizationTasks(org: Organization, onDone: (reading: OrganizationReading) => void): (() => Promise<void>)[] {
  const parts: Partial<{ statements: OkReading["statements"]; review: OkReading["review"]; failedLines: OkReading["failedLines"]; backlog: OkReading["backlog"]; profile: BillingProfileSummary | null }> = {};
  let pending = 5;
  let failed = false;
  const settle = () => {
    pending -= 1;
    if (pending > 0) return;
    if (failed) onDone({ state: "failed" });
    else onDone({ state: "ok", statements: parts.statements ?? [], review: parts.review ?? [], failedLines: parts.failedLines ?? [], backlog: parts.backlog ?? [], profile: parts.profile ?? null });
  };
  const task =
    <T,>(read: () => Promise<T>, keep: (value: T) => void) =>
    async () => {
      try {
        keep(await read());
      } catch {
        failed = true;
      }
      settle();
    };
  return [
    task(() => listStatements(org.id), (value) => (parts.statements = value)),
    task(() => listQueue(org.id, "NEEDS_REVIEW"), (value) => (parts.review = value)),
    task(() => listQueue(org.id, "FAILED"), (value) => (parts.failedLines = value)),
    task(() => listInvoiceBacklog(org.id), (value) => (parts.backlog = value)),
    task(() => getBillingProfile(org.id), (value) => (parts.profile = value)),
  ];
}

async function readProviders(access: BillingOpsAccess): Promise<ProvidersReading> {
  if (!access.manageProviders) return { state: "forbidden" };
  try {
    return { state: "ok", providers: await listProviders() };
  } catch (error) {
    return error instanceof ApiError && error.status === 403 ? { state: "forbidden" } : { state: "failed" };
  }
}

export function useBillingOps(access: BillingOpsAccess) {
  const [data, setData] = useState<BillingOpsData>(EMPTY);
  const [details, setDetails] = useState<Readonly<Record<string, DetailReading>>>({});
  const generation = useRef(0);
  const dataRef = useRef(data);
  dataRef.current = data;

  const readAll = useCallback(async () => {
    const run = ++generation.current;
    const previous = dataRef.current;
    const hadData = previous.listState === "ok";
    let organizations: Organization[];
    try {
      organizations = await listBillingOrganizations();
    } catch (error) {
      if (run !== generation.current) return;
      if (error instanceof ApiError && error.status === 403) setData({ ...EMPTY, listState: "forbidden", providers: { state: "forbidden" } });
      else if (hadData) setData((current) => ({ ...current, stale: true }));
      else setData({ ...EMPTY, listState: "failed" });
      return;
    }
    if (run !== generation.current) return;
    // Primeira leitura: as organizações aparecem "carregando". Releitura: os dados confirmados ficam até a resposta.
    setData((current) => ({
      organizations,
      listState: "ok",
      readings: hadData ? current.readings : Object.fromEntries(organizations.map((org) => [org.id, { state: "loading" } as OrganizationReading])),
      providers: hadData ? current.providers : { state: "loading" },
      stale: false,
      readAt: current.readAt,
    }));
    let anyFailed = false;
    const tasks = organizations.flatMap((org) =>
      organizationTasks(org, (reading) => {
        if (run !== generation.current) return;
        // Releitura que falha numa organização já lida: o dado confirmado fica, e a tela avisa que está desatualizada.
        if (reading.state === "failed" && dataRef.current.readings[org.id]?.state === "ok") {
          anyFailed = true;
          setData((current) => ({ ...current, stale: true }));
          return;
        }
        setData((current) => ({ ...current, readings: { ...current.readings, [org.id]: reading } }));
      }),
    );
    const providers = readProviders(access);
    await runLimited(tasks, 3);
    const providersReading = await providers;
    if (run !== generation.current) return;
    setData((current) => ({
      ...current,
      providers: providersReading.state === "failed" && current.providers.state === "ok" ? current.providers : providersReading,
      stale: anyFailed || (providersReading.state === "failed" && current.providers.state === "ok") ? true : current.stale,
      readAt: new Date().toISOString(),
    }));
  }, [access]);

  useEffect(() => {
    void readAll();
  }, [readAll]);

  /** Relê UMA organização (depois de uma escrita nela): as 5 leituras, com o mesmo teto. */
  const rereadOrganization = useCallback(async (orgId: string) => {
    const org = dataRef.current.organizations.find((item) => item.id === orgId);
    if (!org) return;
    let failed = false;
    await runLimited(
      organizationTasks(org, (reading) => {
        if (reading.state === "failed") failed = true;
        if (reading.state === "failed" && dataRef.current.readings[org.id]?.state === "ok") setData((current) => ({ ...current, stale: true }));
        else setData((current) => ({ ...current, readings: { ...current.readings, [org.id]: reading } }));
      }),
      3,
    );
    if (!failed) setData((current) => ({ ...current, readAt: new Date().toISOString() }));
  }, []);

  /** Relê o canal (depois de toda escrita de provedor: a tela nunca usa o que a escrita devolveu). */
  const rereadProviders = useCallback(async () => {
    const reading = await readProviders(access);
    setData((current) => (reading.state === "failed" && current.providers.state === "ok" ? { ...current, stale: true } : { ...current, providers: reading }));
  }, [access]);

  /** Lê o detalhe e as cobranças de um demonstrativo (ao abrir a linha e depois de uma escrita nele). */
  const loadDetail = useCallback(async (orgId: string, statementId: string) => {
    setDetails((current) => (current[statementId]?.state === "ok" ? current : { ...current, [statementId]: { state: "loading" } }));
    try {
      const [detail, charges] = await Promise.all([getStatement(orgId, statementId), getCharges(orgId, statementId)]);
      setDetails((current) => ({ ...current, [statementId]: { state: "ok", detail, charges } }));
    } catch (error) {
      const notFound = error instanceof ApiError && error.status === 404;
      setDetails((current) => (current[statementId]?.state === "ok" && !notFound ? current : { ...current, [statementId]: { state: "failed", notFound } }));
    }
  }, []);

  return { data, details, reload: readAll, rereadOrganization, rereadProviders, loadDetail };
}
