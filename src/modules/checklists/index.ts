// CHECKLIST P1 PR-04a — regra de APLICABILIDADE de modelo de vistoria. O subdiretório nasce INERTE: nada em
// `src/app.ts` consome estes símbolos nesta fatia (não há serviço, controller nem rota — eles entram na
// PR-04c, junto com o consumidor).
//
// O repositório PRISMA fica DE FORA deste barrel de propósito (achado do verificador): `src/app.ts` importa
// este barrel, então um `export *` daqui faria o módulo Prisma ser avaliado no boot de TODO processo —
// inclusive em `CORE_SAAS_PERSISTENCE=memory`, que não tem banco nenhum. É a convenção do próprio módulo:
// `checklist-prisma.repository.ts` também não está no barrel e é carregado por `import()` dinâmico em
// `checklist.service.ts`. A PR-04c faz o mesmo quando precisar dele.
export * from "./applicability/checklist-applicability.repository.js";
export * from "./applicability/checklist-applicability.resolution.js";
export * from "./applicability/checklist-applicability.types.js";
export * from "./checklist.audit.js";
export * from "./checklist-attachment.storage.js";
export * from "./checklist.components.js";
export * from "./checklist.controller.js";
export * from "./checklist.dto.js";
export * from "./checklist.permissions.js";
export * from "./checklist.repository.js";
export * from "./checklist.routes.js";
export * from "./checklist.service.js";
export * from "./checklist.types.js";
export * from "./checklist.validator.js";
export * from "./storage/checklist-storage.factory.js";
export * from "./storage/checklist-storage.types.js";
export * from "./storage/local-checklist-storage.provider.js";
export * from "./storage/s3-checklist-storage.provider.js";
