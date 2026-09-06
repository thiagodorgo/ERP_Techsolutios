import type { Readable } from "node:stream";

import type { UploadVerification } from "../../evidence/upload-gate.js";

export type ChecklistStorageProviderName = "local" | "s3";

export type ChecklistStorageObjectBody = Buffer | Readable;

export type SaveChecklistStorageObjectInput = {
  tenantId: string;
  runId: string;
  buffer: Buffer;
  originalName: string;
  safeFileName: string;
  sizeBytes: number;
  checksumSha256: string;
  /**
   * B-O6R-07b (Ω6R-SEC-004) · §3.4 — OBRIGATÓRIA. É este campo que faz "caminho novo sem gate não
   * compila": um sexto parser que apareça amanhã e chame `provider.save(...)` sem passar pelo
   * `verifyUploadContent` falha o `npm run check` (`tsc -p tsconfig.json`, cujo `include` é o glob de
   * todo `.ts` sob `src/`) antes de qualquer teste rodar. É a mutação M-B1 do plano.
   *
   * O campo `mimeType` SAIU deste tipo de propósito: ele carregava o valor DECLARADO PELO CLIENTE
   * (`info.mimeType` do busboy) até o `ContentType` do S3 e até a coluna `mime_type`. O tipo gravado
   * agora vem de `assertUploadVerification(...).mimeType` dentro do provider — do RETORNO do assert,
   * nunca de um campo de entrada que alguém possa preencher à mão.
   *
   * FRONTEIRA DECLARADA (E1·7): a quebra de build alcança só quem chama estes providers. Não alcança
   * `tests/**` (fora do `tsconfig`), `.js`/`.mjs` em `src/` (o include é `*.ts`), `scripts/**`, nem quem
   * escreva bytes sem passar por provider nenhum — para esse último caso a rede é a cláusula C5 do
   * censo, que é tripwire de TEXTO, não prova.
   */
  verification: UploadVerification;
};

export type StoredChecklistStorageObject = {
  fileUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  storageProvider: ChecklistStorageProviderName;
  storageKey: string;
};

export type GetChecklistStorageObjectInput = {
  storageKey: string;
};

export type ChecklistStorageObject = {
  body: ChecklistStorageObjectBody;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
};

export type ChecklistStorageProvider = {
  readonly name: ChecklistStorageProviderName;
  save(input: SaveChecklistStorageObjectInput): Promise<StoredChecklistStorageObject>;
  getObject(input: GetChecklistStorageObjectInput): Promise<ChecklistStorageObject>;
  deleteObject(input: GetChecklistStorageObjectInput): Promise<void>;
};
