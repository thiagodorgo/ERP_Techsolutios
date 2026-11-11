import { useRef } from "react";

import type { DispatchCreatePayload } from "./dispatches.types";

/**
 * B-O6R-09 (item 7 do portão; Pergunta 1 = (A), `D-PORTAO-3-RECOMENDACOES-1111`) — a chave de repetição da CRIAÇÃO de
 * despacho, POR INTENÇÃO. O servidor cria no máximo um despacho por (organização, autor, chave): quando a resposta do
 * primeiro envio se perde (tempo esgotado, queda), a nova tentativa com a MESMA chave devolve o despacho já criado em vez
 * de criar um segundo.
 *
 * - a nova tentativa da mesma intenção (mesma OS, mesmo técnico, mesmo status inicial) reusa a chave;
 * - depois do sucesso, a chave muda (o próximo despacho é outra intenção);
 * - mudar a OS, o técnico ou o status muda a chave — assim a tela nunca provoca o 422 de chave reusada com outro pedido.
 *
 * A chave é um UUID (cabe no formato do servidor: 8 a 128 caracteres em `[A-Za-z0-9._:-]`) e nunca aparece na tela.
 */
export type DispatchIntent = Pick<DispatchCreatePayload, "workOrderId" | "operatorUserId" | "status">;

export type DispatchIntentKeySource = {
  /** A chave da intenção: a mesma enquanto a intenção não mudar e não tiver dado certo. */
  keyFor(intent: DispatchIntent): string;
  /** A intenção deu certo: a próxima chamada de `keyFor` gera uma chave nova. */
  succeeded(): void;
};

export function createDispatchIntentKeySource(generate: () => string = () => crypto.randomUUID()): DispatchIntentKeySource {
  const keyRef: { current: string | null } = { current: null };
  let signature: string | null = null;

  return {
    keyFor(intent) {
      const next = JSON.stringify([intent.workOrderId, intent.operatorUserId, intent.status ?? "assigned"]);
      if (keyRef.current === null || signature !== next) {
        keyRef.current = generate();
        signature = next;
      }
      return keyRef.current;
    },
    succeeded() {
      keyRef.current = null;
      signature = null;
    },
  };
}

/** A fonte de chave por intenção, estável durante a vida do componente. */
export function useDispatchIntentKey(): DispatchIntentKeySource {
  const sourceRef = useRef<DispatchIntentKeySource | null>(null);
  sourceRef.current ??= createDispatchIntentKeySource();
  return sourceRef.current;
}
