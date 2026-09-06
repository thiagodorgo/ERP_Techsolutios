import { env } from "../../config/env.js";
import type { ChecklistStorageProviderName } from "../checklists/storage/checklist-storage.types.js";

/**
 * B-O6R-07b (Ω6R-SEC-004) · EMENDA E1·2 — a chave de storage tem de ficar DENTRO do tenant da linha.
 *
 * O ACHADO, medido pelo `critico-adversarial` (rodada 1, A2) e re-lido para escrever isto:
 * `POST /api/v1/impound-processes/:id/inspection/photos` (`impound.service.ts:379-386`) e
 * `POST /api/v1/impound-processes/:id/notifications/:nid/issue`
 * (`impound.notifications.validators.ts:78-92`) gravam uma linha `attachment` com `status: "stored"`
 * e `storage_key` / `storage_provider` / `content_type` **vindos do CORPO da requisição**. E o provider
 * local só impede sair do diretório-base (`resolveSafeStoragePath`) — ele **não confere o prefixo de
 * tenant**. Resultado: `E5` (`GET /portal/v1/owner/photos/:opaqueRef`) monta um `Attachment` sintético
 * com a `storageKey` DA LINHA (`owner-portal.service.ts:417-441`) e lê o objeto por ela. Um cliente que
 * escrevesse `outroTenant/…` no corpo faria o portal servir bytes de outro tenant.
 *
 * POR QUE O CONSERTO VIVE AQUI, E NÃO NO OWNER-PORTAL: `src/modules/owner-portal/**` e
 * `src/modules/impound/**` são PROIBIDOS no §5 do plano (E5 foi endurecida por junta-5 no Ω5P PR-17b;
 * a metade WRITE do impound é pendência com dono — `P-O6R-B07B-ATTACHMENT-STORED-DO-CLIENTE`). Mas
 * TODO caminho até o `getObject` passa por um dos **4** resolvers de download, medido por PRESENÇA e não
 * por ausência de grep (`getObject(` tem 7 sítios em `src/`: a declaração da interface, as 2
 * implementações e 4 chamadas, uma dentro de cada resolver):
 *   - `attachment.storage.ts` → `resolveAttachmentDownload`            (e é ESTE que o owner-portal chama)
 *   - `work-order-attachment.storage.ts` → `resolveWorkOrderAttachmentDownload`
 *   - `damage-attachment.storage.ts` → `resolveDamageAttachmentDownload`
 *   - `checklist-attachment.storage.ts` → `resolveChecklistAttachmentDownload`
 * Os 4 arquivos JÁ estão no escopo permitido. Chamando o guard dentro deles, **E5 herda a proteção sem
 * uma linha em `owner-portal/**`** — é o que o caso T9 prova por execução.
 *
 * ALCANCE, dito às claras (nota residual R2·3 do crítico, para o próximo bloco não herdar garantia que
 * não existe): o guard vive em **4 sítios nominais** e o censo do bloco cobre ESCRITA, não LEITURA — não
 * há tripwire de texto que pegue um QUINTO leitor que chame `getObject` amanhã por fora. Os casos T1–T9
 * exercitam os 4 que existem hoje.
 *
 * FORMA DA CHAVE (lida nos dois providers, não suposta):
 *   - local: `path.posix.join(tenantId, runId, objeto)`         → `tenantId/…`
 *     (`local-checklist-storage.provider.ts:24`)
 *   - s3:    `[prefixo, tenantId, runId, objeto].filter(Boolean).join("/")` → `[prefixo/]tenantId/…`
 *     (`s3-checklist-storage.provider.ts:118-123`; `normalizedPrefix` pode ser vazio)
 *   - a via V2 usa o slot `runId` como `${entityType}/${entityId}` (`attachment.storage.ts:166-168`) —
 *     4 segmentos em vez de 3, mas o tenant continua no PRIMEIRO. O guard vale para as quatro vias.
 *
 * RISCO CONSIGNADO: chave S3 gravada com um prefixo ANTIGO (config mudada entre a gravação e a leitura)
 * passa a dar 404. S3 não está configurado em ambiente algum (`.env.example` traz bucket/região vazios),
 * logo o efeito hoje é nulo — registrado como `P-O6R-B07B-S3-PREFIXO-LEGADO` (BAIXA).
 */

export type StorageKeyScopeInput = {
  readonly storageKey: string;
  readonly tenantId: string;
  readonly provider: ChecklistStorageProviderName;
};

/** Mesma normalização do `normalizePrefix` do provider S3 (`s3-checklist-storage.provider.ts`). */
function normalizedS3Prefix(): readonly string[] {
  return env.CHECKLIST_STORAGE_S3_PREFIX.split("/")
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * `true` quando a chave começa no tenant da linha (depois de descontar o prefixo S3 vigente, se houver).
 * Separada do assert para o teste poder medir a decisão sem montar uma resposta HTTP.
 */
export function isStorageKeyWithinTenant(input: StorageKeyScopeInput): boolean {
  const tenantId = input.tenantId.trim();
  if (!tenantId) return false;

  const segments = input.storageKey.split("/").filter((segment) => segment.length > 0);
  if (segments.length === 0) return false;

  // Sem prefixo (local, ou S3 com prefixo vazio) a chave começa direto no tenant.
  if (segments[0] === tenantId) return true;

  if (input.provider !== "s3") return false;

  // S3: desconta o prefixo vigente e exige o tenant logo em seguida.
  const prefix = normalizedS3Prefix();
  if (prefix.length === 0) return false;
  if (segments.length <= prefix.length) return false;
  for (let index = 0; index < prefix.length; index += 1) {
    if (segments[index] !== prefix[index]) return false;
  }
  return segments[prefix.length] === tenantId;
}

/**
 * Recusa a leitura quando a chave aponta para fora do tenant da linha. `notFound` devolve o MESMO erro
 * 404 `attachment_file_not_found` que aquele resolver já lança quando não há chave — a recusa não pode
 * revelar que o objeto existe em outro lugar (nem distinguir "chave alheia" de "sem chave").
 */
export function assertStorageKeyWithinTenant(input: StorageKeyScopeInput, notFound: () => Error): void {
  if (!isStorageKeyWithinTenant(input)) {
    throw notFound();
  }
}
