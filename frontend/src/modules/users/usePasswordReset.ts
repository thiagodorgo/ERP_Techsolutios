import { useCallback, useRef, useState } from "react";

import { interpretPasswordResetError } from "./users.adapter";
import { resetUserPassword } from "./users.service";
import type { UsersApiContext } from "./users.types";

// B-APP-ORG-2S (S3, plano 1.8.3 §2.3) — o estado da redefinição de senha. A provisória vive SÓ no estado `revealed` e
// sai da memória da tela no `dismiss()` (fechar o diálogo): nada a copia para a lista, para o armazenamento ou para log.
export type PasswordResetState =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "revealed"; readonly temporaryPassword: string; readonly affectedPatios: number }
  | { readonly status: "error"; readonly message: string };

const IDLE: PasswordResetState = { status: "idle" };

export function usePasswordReset(context: UsersApiContext) {
  const [state, setState] = useState<PasswordResetState>(IDLE);
  // Trava de pedido em voo: um clique duplo não gera duas provisórias (a segunda anularia a primeira no servidor).
  const inFlight = useRef(false);
  // Guarda de pedido velho: a resposta que chega depois do `dismiss()` não reabre o diálogo nem reaparece na tela.
  const generation = useRef(0);

  const reset = useCallback(
    async (userId: string) => {
      if (inFlight.current) return;
      inFlight.current = true;
      const current = ++generation.current;
      setState({ status: "loading" });
      try {
        const result = await resetUserPassword(context, userId);
        if (current !== generation.current) return;
        setState({ status: "revealed", temporaryPassword: result.temporaryPassword, affectedPatios: result.affectedPatios });
      } catch (error) {
        if (current !== generation.current) return;
        setState({ status: "error", message: interpretPasswordResetError(error) });
      } finally {
        inFlight.current = false;
      }
    },
    [context],
  );

  const dismiss = useCallback(() => {
    generation.current += 1;
    setState(IDLE);
  }, []);

  return { state, reset, dismiss };
}
