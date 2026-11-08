// B-ASS-05 · F1 — o claro de uma credencial, embrulhado para NÃO sair (plano §4.5, R-VLT-3).
//
//  - `JSON.stringify` lança `never_serialize_secret`: o segredo não entra em resposta, log nem trilha por acidente.
//  - `String(secret)`, template string e `util.inspect` (o que o `pino` e o `console` usam) dão `[redacted]`.
//  - Só quem precisa do claro chama `reveal()`: os adaptadores dos provedores (B-ASS-06..08).

import { inspect } from "node:util";

export const REDACTED = "[redacted]";

export class VaultSecret {
  readonly #value: string;

  constructor(value: string) {
    this.#value = value;
  }

  /** O claro. Uso interno do cofre e dos adaptadores; nunca em resposta, log ou trilha. */
  reveal(): string {
    return this.#value;
  }

  toJSON(): never {
    // Mesma classe de erro do cofre, sem importar o módulo da cifra (evita ciclo).
    const error = new Error("A vault secret can never be serialized.");
    error.name = "VaultError";
    (error as Error & { code: string }).code = "never_serialize_secret";
    throw error;
  }

  toString(): string {
    return REDACTED;
  }

  [Symbol.toPrimitive](): string {
    return REDACTED;
  }

  [inspect.custom](): string {
    return REDACTED;
  }
}
