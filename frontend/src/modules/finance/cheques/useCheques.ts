import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useFinanceApiContext } from "../accounts/useFinancialAccounts";
import { listCheques } from "./cheques.service";
import { CHEQUE_STATUSES, type Cheque, type ChequeDirection, type ChequeFilters, type ChequeStatus, type ChequesData } from "./cheques.types";

// B-SAN3-24 (24a) — leitura da lista de cheques, com TODO filtro aplicado no SERVIDOR (`GET /cheques`), e as contagens
// por situação (o `total` que o servidor devolve, pedido com `limit=1`). Atualização em 2º plano que falha com dado
// anterior → `stale` (o dado fica); falha sem dado anterior → erro (403 → acesso não permitido), nunca lista vazia.
//
// "Pendentes" (N-02 da crítica r2): a lista do servidor filtra a situação por IGUALDADE a um valor só, e pendente quer
// dizer registrado OU depositado. A tela pede as duas situações ao servidor (2 consultas, cada uma com o seu total) e
// mostra as duas contagens lado a lado, sem somar no navegador. Os filtros "vinculados a título" e "sem título" não
// existem no servidor: a tela os aplica sobre os pendentes CARREGADOS e diz isso na própria lista (`complete` =
// carregou todos).

export type ChequeListFilter = {
  readonly status: ChequeStatus | "pending" | null;
  readonly direction: ChequeDirection | null;
  readonly accountId: string | null;
  /** Vínculo com título, aplicado sobre os carregados (o servidor não filtra por "tem título"). */
  readonly link: "linked" | "unlinked" | null;
};

export const EMPTY_FILTER: ChequeListFilter = { status: null, direction: null, accountId: null, link: null };

/** J-547 C3-04 — o recorte de vínculo, igual na lista paginada e nos pendentes. */
export function byLink(items: readonly Cheque[], link: ChequeListFilter["link"]): readonly Cheque[] {
  if (link === "linked") return items.filter((cheque) => cheque.titleId !== null);
  if (link === "unlinked") return items.filter((cheque) => cheque.titleId === null);
  return items;
}

export type ChequeList = {
  readonly items: readonly Cheque[];
  /** Total do servidor para o filtro (no modo "pendentes", `null`: veja `pendingTotals`). */
  readonly total: number | null;
  readonly pendingTotals: { readonly registered: number; readonly deposited: number } | null;
  /** No modo "pendentes": as duas situações vieram inteiras (nenhuma passou de 100). */
  readonly complete: boolean;
  readonly loading: boolean;
  readonly failed: boolean;
  readonly forbidden: boolean;
  readonly stale: boolean;
  readonly lastUpdatedAt: string | null;
};

const SERVER_MAX = 100;

function baseFilters(filter: ChequeListFilter): ChequeFilters {
  return {
    ...(filter.direction ? { direction: filter.direction } : {}),
    ...(filter.accountId ? { accountId: filter.accountId } : {}),
  };
}

type Loaded = { readonly items: readonly Cheque[]; readonly total: number | null; readonly pendingTotals: ChequeList["pendingTotals"]; readonly complete: boolean };

export function useCheques(filter: ChequeListFilter, page: { readonly offset: number; readonly limit: number }, options: { readonly enabled: boolean }) {
  const { context, ready } = useFinanceApiContext();
  const [data, setData] = useState<Loaded>({ items: [], total: 0, pendingTotals: null, complete: true });
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<{ readonly status: number | null } | null>(null);
  const [stale, setStale] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const hasGood = useRef(false);
  const key = JSON.stringify({ filter, page });

  const refresh = useCallback(
    async (background = false) => {
      if (!ready || !options.enabled) {
        setLoading(false);
        return;
      }
      if (!background) setLoading(true);
      const { filter: f, page: p } = JSON.parse(key) as { filter: ChequeListFilter; page: { offset: number; limit: number } };
      let next: Loaded | null = null;
      let failedWith: ChequesData | null = null;
      if (f.status === "pending") {
        const [registered, deposited] = await Promise.all([
          listCheques(context, { ...baseFilters(f), status: "registered", limit: SERVER_MAX }),
          listCheques(context, { ...baseFilters(f), status: "deposited", limit: SERVER_MAX }),
        ]);
        const bad = [registered, deposited].find((part) => part.source === "fallback");
        if (bad) failedWith = bad;
        else {
          const items = [...registered.items, ...deposited.items];
          next = {
            items: byLink(items, f.link),
            total: null,
            pendingTotals: { registered: registered.pagination.total, deposited: deposited.pagination.total },
            complete: registered.pagination.total <= registered.items.length && deposited.pagination.total <= deposited.items.length,
          };
        }
      } else {
        const result = await listCheques(context, { ...baseFilters(f), ...(f.status ? { status: f.status } : {}), limit: p.limit, offset: p.offset });
        if (result.source === "fallback") failedWith = result;
        else next = { items: byLink(result.items, f.link), total: result.pagination.total, pendingTotals: null, complete: true };
      }
      if (next) {
        setData(next);
        setFailure(null);
        hasGood.current = true;
        setStale(false);
        setLastUpdatedAt(new Date().toISOString());
      } else if (hasGood.current && background) {
        setStale(true);
      } else {
        setFailure({ status: failedWith?.fallbackStatus ?? null });
      }
      setLoading(false);
    },
    [context, ready, options.enabled, key],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const replaceItem = useCallback((cheque: Cheque) => {
    setData((current) => ({ ...current, items: current.items.map((item) => (item.id === cheque.id ? cheque : item)) }));
  }, []);

  const list: ChequeList = {
    ...data,
    loading,
    failed: failure !== null,
    forbidden: failure?.status === 403,
    stale,
    lastUpdatedAt,
  };
  return { list, refresh, replaceItem, context };
}

export type ChequeCounts = Readonly<Record<ChequeStatus, number | null>>;

const NO_COUNTS = Object.fromEntries(CHEQUE_STATUSES.map((status) => [status, null])) as ChequeCounts;

/**
 * O total de cada situação, do servidor (`limit=1`), no mesmo recorte de direção e conta da lista.
 * J-547 C3-07 e C3-08 (§7): `loading` enquanto a 1ª leitura do recorte não voltou (a tela mostra esqueleto, nunca
 * "indisponível"); numa releitura que falha, cada situação MANTÉM o último número bom (dado desatualizado, sem trocar a
 * tela) e só fica `null` se nunca houve número.
 */
export function useChequeCounts(direction: ChequeDirection | null, accountId: string | null, options: { readonly enabled: boolean }) {
  const { context, ready } = useFinanceApiContext();
  const [counts, setCounts] = useState<ChequeCounts>(NO_COUNTS);
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);
  const scope = `${direction ?? ""}|${accountId ?? ""}`;
  const loadedScope = useRef<string | null>(null);
  const refresh = useCallback(async () => {
    if (!ready || !options.enabled) {
      setLoading(false);
      return;
    }
    if (loadedScope.current !== scope) setLoading(true);
    const results = await Promise.all(
      CHEQUE_STATUSES.map((status) =>
        listCheques(context, { status, limit: 1, ...(direction ? { direction } : {}), ...(accountId ? { accountId } : {}) }),
      ),
    );
    const sameScope = loadedScope.current === scope;
    setCounts((current) =>
      Object.fromEntries(
        CHEQUE_STATUSES.map((status, index) => [status, results[index].source === "fallback" ? (sameScope ? current[status] : null) : results[index].pagination.total]),
      ) as ChequeCounts,
    );
    setStale(sameScope && results.some((result) => result.source === "fallback"));
    loadedScope.current = scope;
    setLoading(false);
  }, [context, ready, options.enabled, direction, accountId, scope]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { counts, loading, stale, refresh };
}

export type AccountPendingCounts = Readonly<Record<string, { readonly registered: number | null; readonly deposited: number | null }>>;

/** Pendentes por conta (aparência B): registrados e depositados de cada conta, cada número do servidor. */
export function useChequeAccountCounts(accountIds: readonly string[], options: { readonly enabled: boolean }) {
  const { context, ready } = useFinanceApiContext();
  const [counts, setCounts] = useState<AccountPendingCounts>({});
  const idsKey = accountIds.join(",");
  const ids = useMemo(() => (idsKey ? idsKey.split(",") : []), [idsKey]);
  const refresh = useCallback(async () => {
    if (!ready || !options.enabled || ids.length === 0) return;
    const pairs = await Promise.all(
      ids.map(async (accountId) => {
        const [registered, deposited] = await Promise.all([
          listCheques(context, { accountId, status: "registered", limit: 1 }),
          listCheques(context, { accountId, status: "deposited", limit: 1 }),
        ]);
        return [
          accountId,
          {
            registered: registered.source === "fallback" ? null : registered.pagination.total,
            deposited: deposited.source === "fallback" ? null : deposited.pagination.total,
          },
        ] as const;
      }),
    );
    setCounts(Object.fromEntries(pairs));
  }, [context, ready, options.enabled, ids]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { counts, refresh };
}
