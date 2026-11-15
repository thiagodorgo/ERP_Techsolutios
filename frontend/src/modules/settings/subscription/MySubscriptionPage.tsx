import { useCallback, useState } from "react";

import { useAutoRefresh } from "../../../hooks/useAutoRefresh";
import { useAuth } from "../../../providers/AuthProvider";
import { usePermissions } from "../../../providers/PermissionProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { useScreenAppearance, type Appearance } from "../../appearance";
import { copyFeedbackText, type CopyFeedback, type CopyTarget, type MySubscriptionLoadState, type MySubscriptionViewModel } from "./components/my-subscription.shared";
import { MySubscriptionViewA } from "./components/MySubscriptionViewA";
import { buildMySubscriptionScreen } from "./my-subscription.state";
import type { MySubscriptionBlock } from "./my-subscription.types";
import { useMySubscription } from "./useMySubscription";

// B-ASS-11 (F3) — a tela "Minha assinatura" em `/administrator/subscription` (rota guardada por `billing:read`; o servidor
// é a autoridade e recusa com 403 o papel sem a permissão e o ator de plataforma). É o CONTÊINER das 3 aparências
// (`useScreenAppearance("minha-assinatura")`, D-APARENCIA-POR-USUARIO), no molde de `ChequesPage`: lê a assinatura, monta o
// modelo único e o entrega a uma vista PURA. Um bloco aberto por vez; na aparência C, com fatura em aberto, o "Como pagar"
// já abre. O nome da organização vem da sessão (nunca do payload nem de literal). Estados §7: carregando, erro, acesso não
// permitido, sem assinatura e dados desatualizados.

type OpenChoice = { readonly appearance: Appearance; readonly open: MySubscriptionBlock | null };

export function MySubscriptionPage() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can, hasAny } = usePermissions();
  const { appearance } = useScreenAppearance("minha-assinatura");
  const canRead = can("billing:read");
  const subscription = useMySubscription({ enabled: canRead });
  useAutoRefresh(subscription.refresh, { enabled: canRead && Boolean(activeContext) });

  const organizationName = session?.tenant?.name ?? null;
  const loaded = subscription.data;
  const screen = loaded?.kind === "ready" ? buildMySubscriptionScreen(loaded.subscription, subscription.todayKey, organizationName) : null;

  const [choice, setChoice] = useState<OpenChoice | null>(null);
  const [copy, setCopy] = useState<CopyFeedback | null>(null);
  const defaultOpen: MySubscriptionBlock | null = appearance === "C" && screen?.invoice ? "pagar" : null;
  const open = choice && choice.appearance === appearance ? choice.open : defaultOpen;

  const choose = useCallback(
    (next: MySubscriptionBlock | null) => {
      setCopy(null);
      setChoice({ appearance, open: next });
    },
    [appearance],
  );

  const invoice = screen?.invoice ?? null;
  const onCopy = useCallback(
    async (target: CopyTarget) => {
      if (!invoice) return;
      const text = target === "invoice" ? invoice.copyText : target === "pix" ? invoice.pixCopyPaste : invoice.boletoLine;
      if (!text) return;
      try {
        const clipboard = globalThis.navigator?.clipboard;
        if (!clipboard || typeof clipboard.writeText !== "function") throw new Error("área de transferência indisponível");
        await clipboard.writeText(text);
        setCopy({ target, ok: true, text: copyFeedbackText(target, true, text) });
      } catch {
        setCopy({ target, ok: false, text: copyFeedbackText(target, false, text) });
      }
    },
    [invoice],
  );

  let state: MySubscriptionLoadState;
  if (!canRead || subscription.forbidden) state = "forbidden";
  else if (loaded === null) state = subscription.failed && !subscription.loading ? "error" : "loading";
  else state = loaded.kind === "none" ? "none" : "ready";

  const model: MySubscriptionViewModel = {
    state,
    screen,
    organizationName,
    stale: subscription.stale,
    lastUpdatedAt: subscription.lastUpdatedAt,
    refreshing: subscription.refreshing,
    open,
    onToggle: (block) => choose(open === block ? null : block),
    onOpen: (block) => choose(block),
    onClose: () => choose(null),
    onRetry: () => void subscription.refresh(false),
    canSeeUsers: hasAny(["users.read", "users:read"]),
    copy,
    onCopy: (target) => void onCopy(target),
  };

  return <MySubscriptionViewA {...model} />;
}

export default MySubscriptionPage;
