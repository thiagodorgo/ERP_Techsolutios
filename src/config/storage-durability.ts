/**
 * B-EVIDENCIA-DURAVEL (plano §3.4, fecha `P-UPLOAD-ARMAZENAMENTO-EFEMERO`) — a regra ÚNICA do armazenamento durável.
 *
 * O que é "durável" em produção, num lugar só: o provedor efetivo é `s3`, o bucket não é vazio, a região tem a forma de
 * região da AWS e o endpoint é EXATAMENTE `https://s3.<região>.amazonaws.com` da região configurada (sem porta, usuário,
 * senha, caminho, consulta nem fragmento). Qualquer outra forma é recusada.
 *
 * Três chamadores, a mesma resposta:
 *   - a trava de boot `G-STORAGE-DURAVEL` do `superRefine` de `src/config/env.ts` (uma issue por chave que falha);
 *   - o portão por requisição do comprovante de despesa (`assertReceiptStorageDurable`, #525), de onde a regra saiu;
 *   - o portão por requisição da evidência do app (`assertEvidenceStorageDurable`, `mobile-evidence-upload.ts`).
 * O teste GS14 de `tests/evidencia-duravel-boot-gate.test.ts` confere a paridade linha a linha.
 *
 * É lista do que PASSA, não do que não passa: não depende de DNS (`localtest.me` resolve para loopback) e recusa o
 * endpoint vazio, com o qual o SDK escolheria o destino por `AWS_ENDPOINT_URL_S3`, `AWS_ENDPOINT_URL` ou
 * `~/.aws/config`, que a regra não vê. O `forcePathStyle` não entra na conta.
 *
 * Arquivo PURO: não importa `env` (o `env.ts` importa este arquivo; o contrário criaria ciclo).
 */

export type StorageDurabilityInput = {
  /** O provedor EFETIVO (`CHECKLIST_STORAGE_PROVIDER ?? CHECKLIST_ATTACHMENT_STORAGE_DRIVER ?? "local"`). */
  readonly provider: string;
  readonly bucket: string;
  readonly region: string;
  readonly endpoint?: string;
};

/** Qual condição falhou: a trava de boot põe a issue na chave correspondente. */
export type StorageDurabilityProblem = "provider" | "bucket" | "region" | "endpoint";

const AWS_REGION_PATTERN = /^[a-z]{2}(?:-[a-z]+)+-\d{1,2}$/;

function approvedS3Host(region: string): string | undefined {
  return AWS_REGION_PATTERN.test(region) ? `s3.${region}.amazonaws.com` : undefined;
}

function isApprovedS3Endpoint(input: StorageDurabilityInput): boolean {
  const host = approvedS3Host(input.region.trim());
  if (!host) return false;
  const raw = (input.endpoint ?? "").trim();
  if (!raw) return false; // vazio: o SDK resolveria o destino por AWS_ENDPOINT_URL_S3, AWS_ENDPOINT_URL ou ~/.aws/config
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  return (
    url.protocol === "https:" &&
    url.hostname === host &&
    url.port === "" &&
    url.username === "" &&
    url.password === "" &&
    (url.pathname === "/" || url.pathname === "") &&
    url.search === "" &&
    url.hash === ""
  );
}

/** As condições que falham, em ordem fixa. Vazio = durável. */
export function storageDurabilityProblems(input: StorageDurabilityInput): StorageDurabilityProblem[] {
  const problems: StorageDurabilityProblem[] = [];
  if (input.provider !== "s3") problems.push("provider");
  if (input.bucket.trim() === "") problems.push("bucket");
  if (!approvedS3Host(input.region.trim())) problems.push("region");
  if (!isApprovedS3Endpoint(input)) problems.push("endpoint");
  return problems;
}

/** `true` só quando o armazenamento configurado é o durável da D-014 (todas as condições valem). */
export function isDurableStorageConfig(input: StorageDurabilityInput): boolean {
  return storageDurabilityProblems(input).length === 0;
}
