import { Landmark, Wallet, WalletCards } from "lucide-react";

import { formatBRL } from "../../titles/financial-titles.adapter";
import { getAccountKindLabel } from "../financial-accounts.adapter";
import type { FinancialAccount, FinancialAccountBalance } from "../financial-accounts.types";

// B-SAN3-12b — cartão de CONTA da aba "Contas e extrato" (opção A da maquete): clicável, filtra o extrato pela conta
// (`aria-pressed`, D-PADRAO-BLOCOS-CLICAVEIS). O saldo é o do GET /financial-accounts/:id/balance, somado no servidor
// (F8); sem ele, o cartão diz "Saldo indisponível" — nunca "—" nem R$ 0,00 fingido (F19). Classes `.pat-kpi*` existentes.

const ICONS = { bank: Landmark, cash: Wallet, wallet: WalletCards } as const;

export function AccountCard({
  account,
  balance,
  pendingCount,
  selected,
  onSelect,
}: {
  readonly account: FinancialAccount;
  readonly balance: FinancialAccountBalance | null | undefined;
  /** Lançamentos a conciliar nesta conta (contagem do servidor), ou null se o servidor não respondeu. */
  readonly pendingCount: number | null;
  readonly selected: boolean;
  readonly onSelect: () => void;
}) {
  const Icon = ICONS[account.kind];
  const saldo = balance ? formatBRL(balance.balance) : null;
  const conciliacao = pendingCount === null ? null : pendingCount > 0 ? `${pendingCount} a conciliar` : "tudo conciliado";
  return (
    <button
      type="button"
      className="pat-kpi pat-kpi--clickable"
      aria-pressed={selected}
      aria-label={`${account.name}: ${saldo ? `saldo ${saldo}` : "saldo indisponível"} — ver o extrato da conta`}
      onClick={onSelect}
      style={selected ? { borderColor: "#93C5FD" } : undefined}
    >
      <div className="pat-kpi__head">
        <span className="pat-kpi__tile" style={{ background: "#EFF6FF", color: "#2563EB" }} aria-hidden="true">
          <Icon size={16} />
        </span>
      </div>
      <div className="pat-kpi__value" style={saldo ? undefined : { fontSize: 14, color: "#64748B" }}>
        {saldo ?? "Saldo indisponível"}
      </div>
      <div className="pat-kpi__label" title={account.name}>
        {account.name}
      </div>
      <div className="pat-kpi__hint">{conciliacao ? `${getAccountKindLabel(account.kind)} · ${conciliacao}` : getAccountKindLabel(account.kind)}</div>
    </button>
  );
}
