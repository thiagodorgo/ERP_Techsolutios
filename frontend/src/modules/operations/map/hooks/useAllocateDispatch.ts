import { useCallback, useState } from "react";

import { ApiError } from "../../../../services/api/client";
import { createDispatch } from "../../dispatches/dispatches.service";
import type { DispatchCreatePayload, DispatchesApiContext } from "../../dispatches/dispatches.types";
import { useDispatchIntentKey } from "../../dispatches/useDispatchIntentKey";

/**
 * J-MAPAS-7 (SPRINT ALOCAÇÃO) — ação de ALOCAR (POST /operations/dispatches via `createDispatch`) com
 * feedback HONESTO: sucesso e erro vêm do resultado REAL da chamada, nunca fabricados. Compartilhado pelos
 * dois popups (D chamado→técnico, E técnico→chamado) — a MESMA payload, o MESMO endpoint, uma verdade só.
 *
 * Fluxo otimista: `pendingOperatorUserId` marca a linha em curso (spinner/desabilita) enquanto o POST
 * corre; ao concluir, `onAllocated` dispara o refresh (o SSE/poll do mapa reflete o novo despacho). Erros
 * do backend viram mensagem clara: 404 (OS/técnico não encontrado), 409 (já despachado), 422 (alvo não é
 * técnico) — traduzidos do status real, sem inventar sucesso.
 */

export type AllocationFeedback =
  | { readonly kind: "success"; readonly operatorUserId: string; readonly message: string }
  | { readonly kind: "error"; readonly operatorUserId: string; readonly message: string };

function messageForError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return "Chamado ou técnico não encontrado. Recarregue o mapa e tente novamente.";
    if (error.status === 409) return "Este técnico já tem um despacho para este chamado.";
    if (error.status === 422) return "Não foi possível alocar: o alvo não é um Técnico de Campo válido.";
    if (error.status === 401 || error.status === 403) return "Sem permissão para alocar (verifique seu perfil).";
    return error.safeMessage;
  }
  return "Não foi possível alocar agora. Nenhum despacho foi criado.";
}

export function useAllocateDispatch(context: DispatchesApiContext, onAllocated: () => void | Promise<void>) {
  const [pendingOperatorUserId, setPendingOperatorUserId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<AllocationFeedback | null>(null);
  // B-O6R-09 — a chave de repetição por intenção: a nova tentativa depois de um erro reusa a mesma; o sucesso a troca.
  const intent = useDispatchIntentKey();

  const allocate = useCallback(
    async (requested: DispatchCreatePayload, operatorDisplayName: string) => {
      if (pendingOperatorUserId) return; // evita clique duplo enquanto o POST corre
      const payload: DispatchCreatePayload = { ...requested, idempotencyKey: intent.keyFor(requested) };
      setPendingOperatorUserId(payload.operatorUserId);
      setFeedback(null);
      try {
        await createDispatch(context, payload);
        intent.succeeded();
        setFeedback({
          kind: "success",
          operatorUserId: payload.operatorUserId,
          message: `Despacho criado para ${operatorDisplayName}. O mapa atualiza com a nova situação.`,
        });
        await onAllocated();
      } catch (error) {
        setFeedback({ kind: "error", operatorUserId: payload.operatorUserId, message: messageForError(error) });
      } finally {
        setPendingOperatorUserId(null);
      }
    },
    [context, intent, onAllocated, pendingOperatorUserId],
  );

  const resetFeedback = useCallback(() => setFeedback(null), []);

  return { allocate, pendingOperatorUserId, feedback, resetFeedback } as const;
}
