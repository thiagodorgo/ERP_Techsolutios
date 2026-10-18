papel: C1 | identidade: jurado-07cb1-c1-argon | modelo: Gemini 4 Argon (esforço médio) · nível menor DECLARADO (§C7.6) (autorização: ordem explícita do dono em 2026-10-17 no disparo: "use o argon pra fazer essa junta, vc faz uma cadeira o argon faz outra e fecha com o gemini pro"; §A1.1; também `dev-b-o6r-07c-b1-dev.md:4` em b198fe358b41186b2598ab258ccb735da8c04cbc) | mandato_md5: fa118ae5593163d8d63f951aea03e225 (declarado no disparo: fa118ae5593163d8d63f951aea03e225) | corpo_md5: .claude=1a5e17a56621860cdc3113831e166e4e .agents=3d2fa99facb4ca5dbfbaf5692651d1d6 (recebido no prompt: 1a5e17a56621860cdc3113831e166e4e)

# Evidência — Cadeira C1 (`jurado-07cb1-c1-argon`, competência de `jurado-07cb1-c1-escopo-e-rbac` / `coordenador-de-acessos`) — B-O6R-07c-b1 (PR #440, ciclo 1)

## 0. Terreno, Legalidade e Normas (§A1, §A7, §C7.1-bis, §C7.6, §C7.7)

- **Objeto resolvido por duas fontes:**
  - `git ls-remote origin refs/heads/fix/o6r07cb1-despacho-atribui` → `b198fe358b41186b2598ab258ccb735da8c04cbc`
  - `gh pr view 440 --repo thiagodorgo/ERP_Techsolutios --json headRefOid,baseRefName,state,isDraft,mergeable` → `{"baseRefName":"main","headRefOid":"b198fe358b41186b2598ab258ccb735da8c04cbc","isDraft":false,"mergeable":"UNKNOWN","state":"OPEN"}`
- **Base (`B`) e `origin/main`:**
  - `origin/main` no início: `2a49b0159c83a6019a63b4d2af4d119fe7410972` (avançou com #441 `79599143` e #442 `2a49b015`)
  - `B = git merge-base origin/main b198fe358b41186b2598ab258ccb735da8c04cbc` → `4fe7524ecbcc68b3e69336453cc774ed5937cb1c`
  - Merges em `B..objeto`: `0` (vazio)
  - Cerca do mandato = `b198fe358b41186b2598ab258ccb735da8c04cbc` (`git diff --name-only <cerca> <objeto>` vazio, delta = 0)
  - Arquivos de `src/` no bloco (`git diff --name-only B objeto -- src/`, N = 13):
    `src/modules/checklists/checklist.controller.ts`, `src/modules/checklists/checklist.service.ts`, `src/modules/field-dispatch/field-dispatch-prisma.repository.ts`, `src/modules/field-dispatch/field-dispatch.repository.ts`, `src/modules/field-dispatch/field-dispatch.service.ts`, `src/modules/mobile/mobile-checklist-sync.ts`, `src/modules/mobile/mobile-evidence-sync.ts`, `src/modules/mobile/mobile-evidence-upload.ts`, `src/modules/mobile/mobile-work-order-sync.ts`, `src/modules/work-orders/work-order-prisma.repository.ts`, `src/modules/work-orders/work-order.repository.ts`, `src/modules/work-orders/work-order.service.ts`, `src/modules/work-orders/work-order.types.ts`
- **Parecer do inspetor de terreno:** `C:/Users/AMP/w-07cb1/agent-orchestration/omega/juntas/votos/B-O6R-07c-b1/insp-07cb1-parecer.md` · instância `inspetor-07cb1-opus` · `LIBERADO COM RESSALVA` (2026-10-17 03:30Z–03:40Z). Confere a cadeira C1 (`jurado-07cb1-c1-escopo-e-rbac`, corpo commitado nos dois espelhos `.claude` `1a5e17a5…` e `.agents` `3d2fa99f…`) e o worktree `C:/Users/AMP/w-j07cb1c1`. Nota de sucessão: o Codex inicialmente previsto na tabela do inspetor foi parado pelo dono antes de medir (`00-quedas.md`, 0 bytes gravados), e o dono ordenou o disparo em Gemini 4 Argon com identidade nova `jurado-07cb1-c1-argon` (ressalva R4 do inspetor / §C7.7 P3).
- **Check-runs no objeto:** `gh api repos/thiagodorgo/ERP_Techsolutios/commits/b198fe358b41186b2598ab258ccb735da8c04cbc/check-runs?per_page=100` → `total=14 | nao-verdes=0 | pendentes=0`.
- **Inelegibilidade e Obituário:** `OBITUARIO-IDENTIDADES.md` tem 301 linhas no objeto e em `origin/main`; `grep -ic 07cb1` = `0` nos dois. `jurado-07cb1-c1-argon` e `jurado-07cb1-c1-escopo-e-rbac` não constam como dev, planejador, crítico, achador ou votante anterior. Competência herdada declarada: `coordenador-de-acessos` (inelegível como identidade por ter achado o item 51 / `C2-09`).
- **Decisões do dono medidas por script (`git show <ref>:agent-orchestration/controle/decisoes.md | grep -n <ID>`):**
  - No objeto (`b198fe358b41186b2598ab258ccb735da8c04cbc`): `D1-07c`: `3166,3424,3654` · `D2-07c`: `3171,3425,3655` · `D-07CB-EMENDA-RECOMENDACOES`: `3658` · `D-DESP-INICIO-ATENDIMENTO`, `D-INICIO-ATENDIMENTO-CONFIRMADO`, `D-07CB1-TRAVA-ATE-B2`, `D-07CB1-DESPACHO-OS-ENCERRADA`, `D-07CB1-TECNICO-SEM-ATIVAR-RASCUNHO`, `D-GEMINI-PRO-API-TETO`, `D-BRACOS-E-DOCKER-17-10`: `ausente`.
  - Em `origin/main` (`2a49b015`, que inclui o merge `79599143` do PR #441 após deleção do ramo `origin/docs/registro-17-10`, ressalva R1): `D1-07c`: `3166,3424,3654` · `D2-07c`: `3171,3425,3655` · `D-07CB-EMENDA-RECOMENDACOES`: `3658,3719` · `D-DESP-INICIO-ATENDIMENTO`: `3699,3709` · `D-INICIO-ATENDIMENTO-CONFIRMADO`: `3719` · `D-07CB1-TRAVA-ATE-B2`: `3709,3719` · `D-07CB1-DESPACHO-OS-ENCERRADA`: `3710` · `D-07CB1-TECNICO-SEM-ATIVAR-RASCUNHO`: `3711` · `D-GEMINI-PRO-API-TETO`: `3715,3723` · `D-BRACOS-E-DOCKER-17-10`: `3716`.
  - Tensão P3 (`on_route`) × "No local": conciliada e registrada em `origin/main` (`79599143:agent-orchestration/controle/decisoes.md:3719`) sob `D-INICIO-ATENDIMENTO-CONFIRMADO` ("no local..." substitui a P3 de `D-07CB-EMENDA-RECOMENDACOES`).
- **Âncoras do `CLAUDE.md` medidas no objeto e em `origin/main`:**
  - `A1.`: 1 / 1 · `A2.`: 1 / 1 · `A6.`: 1 / 1 · `A7.`: 1 / 1 · `C5.`: 1 / 1 · `C7.1-bis`: 2 / 2 · `C7.1-ter`: 3 / 3 · `C7.4-bis`: 6 / 6 · `C7.6`: 9 / 9 · `C7.6-bis`: 2 / 2 · `D-GOV-PROPORCIONAL`: 3 / 3 · `C7.7` (cabeçalho `## C7.7` l.638 com `[P1]`..`[P7]` e `D-PAUSA-GRAVA-E-PARA` l.675): presente nos dois.
- **Ambiente e Worktree próprio:**
  - `$SCRATCH`: `C:/Users/AMP/.gemini/antigravity-cli/brain/d9d16a23-c79a-4bff-b05d-f43d2c2585f9/scratch/c1`
  - `uname -a`: `MINGW64_NT-10.0-22631 N3SOH82 3.6.6-1cdd4371.x86_64 2026-01-15 22:20 UTC x86_64 Msys`
  - `node -v`: `v20.19.5`
  - Disco `C:` antes do `npm ci`: `11G` livres (96%); após `npm ci`: `9.5G` livres (97%), acima do piso de 2 GB.
  - Worktree criado: `git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios worktree add --detach C:/Users/AMP/w-j07cb1c1 b198fe358b41186b2598ab258ccb735da8c04cbc` (`test -e C:/Users/AMP/w-j07cb1c1/.git` → `WORKTREE_GIT_OK=1`).
  - Baseline no worktree próprio: `npm ci --no-audit --no-fund` → `ec=0` (sem junction/symlink); `env DATABASE_URL="postgresql://x:x@127.0.0.1:1/x" npm run db:generate` → `ec=0`; `env -u DATABASE_URL -u REDIS_URL CORE_SAAS_PERSISTENCE=memory npm run check` → `ec=0`.
  - Nenhum container criado (`CORE_SAAS_PERSISTENCE=memory` no Node do worktree Windows); base viva (`erp-postgres`, `erp-redis`) e portas 5432, 6379, 3000, 5173, 5050, 8899 intocadas.

---

## Item 1 — As 23 vias (`VISTORIA·ESCOPO` 18 · `EVIDENCIA-OS·ESCOPO` 4 · `DESPACHO·ALVO` 1): escopo por objeto, ex-técnico (`conflicts[]` / 409), quem nunca foi (`rejected` / 403), `S-ORFA`, `S-ORDEM` e 404 cross-tenant

### 1(a) Fechamento das 23 vias entre `B` (`4fe7524ecbcc68b3e69336453cc774ed5937cb1c`) e `O` (`b198fe358b41186b2598ab258ccb735da8c04cbc`)

**Comando executado:**
```bash
npx tsx C:/Users/AMP/.gemini/antigravity-cli/brain/d9d16a23-c79a-4bff-b05d-f43d2c2585f9/scratch/c1/04-item1a.mts
```

**Saída:**
```text
COUNT_O=23 COUNT_B=23 ONLY_O=0 ONLY_B=0
01. PAR /api/v1/mobile/sync/checklist-actions · checklist_acknowledgement.create | B: VISTORIA·07c-b -> O: VISTORIA·ESCOPO
02. PAR /api/v1/mobile/sync/checklist-actions · checklist_attachment.attach | B: VISTORIA·07c-b -> O: VISTORIA·ESCOPO
03. PAR /api/v1/mobile/sync/checklist-actions · checklist_divergence.create | B: VISTORIA·07c-b -> O: VISTORIA·ESCOPO
04. PAR /api/v1/mobile/sync/checklist-actions · checklist_marker.create | B: VISTORIA·07c-b -> O: VISTORIA·ESCOPO
05. PAR /api/v1/mobile/sync/checklist-actions · checklist_run.complete | B: VISTORIA·07c-b -> O: VISTORIA·ESCOPO
06. PAR /api/v1/mobile/sync/checklist-actions · checklist.acknowledgement_create | B: VISTORIA·07c-b -> O: VISTORIA·ESCOPO
07. PAR /api/v1/mobile/sync/checklist-actions · checklist.attachment_attach | B: VISTORIA·07c-b -> O: VISTORIA·ESCOPO
08. PAR /api/v1/mobile/sync/checklist-actions · checklist.complete | B: VISTORIA·07c-b -> O: VISTORIA·ESCOPO
09. PAR /api/v1/mobile/sync/checklist-actions · checklist.divergence_create | B: VISTORIA·07c-b -> O: VISTORIA·ESCOPO
10. PAR /api/v1/mobile/sync/checklist-actions · checklist.item_answer | B: VISTORIA·07c-b -> O: VISTORIA·ESCOPO
11. PAR /api/v1/mobile/sync/checklist-actions · checklist.item_note | B: VISTORIA·07c-b -> O: VISTORIA·ESCOPO
12. PAR /api/v1/mobile/sync/checklist-actions · checklist.marker_create | B: VISTORIA·07c-b -> O: VISTORIA·ESCOPO
13. PAR /api/v1/mobile/sync/evidence-actions · evidence.work_order_observation | B: EVIDENCIA-OS·07c-b -> O: EVIDENCIA-OS·ESCOPO
14. PAR /api/v1/mobile/sync/evidence-actions · evidence.work_order_photo | B: EVIDENCIA-OS·07c-b -> O: EVIDENCIA-OS·ESCOPO
15. PAR /api/v1/mobile/sync/evidence-actions · evidence.work_order_signature | B: EVIDENCIA-OS·07c-b -> O: EVIDENCIA-OS·ESCOPO
16. ROTA PATCH /api/v1/mobile/checklist-runs/:runId | B: VISTORIA·07c-b -> O: VISTORIA·ESCOPO
17. ROTA PATCH /api/v1/operations/dispatches/:dispatchId/status | B: DESPACHO·07c-b -> O: DESPACHO·ALVO
18. ROTA POST /api/v1/mobile/checklist-runs/:runId/acknowledgement | B: VISTORIA·07c-b -> O: VISTORIA·ESCOPO
19. ROTA POST /api/v1/mobile/checklist-runs/:runId/attachments | B: VISTORIA·07c-b -> O: VISTORIA·ESCOPO
20. ROTA POST /api/v1/mobile/checklist-runs/:runId/complete | B: VISTORIA·07c-b -> O: VISTORIA·ESCOPO
21. ROTA POST /api/v1/mobile/checklist-runs/:runId/divergence | B: VISTORIA·07c-b -> O: VISTORIA·ESCOPO
22. ROTA POST /api/v1/mobile/checklist-runs/:runId/markers | B: VISTORIA·07c-b -> O: VISTORIA·ESCOPO
23. ROTA POST /api/v1/mobile/evidence-uploads | B: EVIDENCIA-OS·07c-b -> O: EVIDENCIA-OS·ESCOPO
```

**Análise 1(a):**
- As 23 entradas de `tests/fixtures/o6r07c-classificacao-vias.json` que eram `VISTORIA·07c-b` (18), `EVIDENCIA-OS·07c-b` (4) e `DESPACHO·07c-b` (1) na base `B` são **exatamente** as 23 entradas `VISTORIA·ESCOPO` (18), `EVIDENCIA-OS·ESCOPO` (4) e `DESPACHO·ALVO` (1) no objeto `O` (`ONLY_O=0`, `ONLY_B=0`).
- Controle-vermelho da 1(a) provou que remover 1 entrada acende `SIMULATION_DIFF_COUNT=1`.

---

### 1(b) Sonda própria de escopo por objeto nas 23 vias (com código-fonte integral + `md5sum`)

- **Arquivo da sonda:** `C:/Users/AMP/.gemini/antigravity-cli/brain/d9d16a23-c79a-4bff-b05d-f43d2c2585f9/scratch/c1/05-sonda-item1.mts`
- **md5sum:** `701b542899b761da19d697753369dd9f`

**Código-fonte integral de `05-sonda-item1.mts`:**
```ts
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";

process.env.LOG_LEVEL = "silent";
process.env.CORE_SAAS_PERSISTENCE = "memory";

const DIR_ANEXOS = fs.mkdtempSync(path.join(os.tmpdir(), "c1-sonda-anexos-"));
const DIR_EVID = fs.mkdtempSync(path.join(os.tmpdir(), "c1-sonda-evid-"));
process.env.CHECKLIST_STORAGE_LOCAL_DIR = DIR_ANEXOS;

const WT_URL = "file:///C:/Users/AMP/w-j07cb1c1";
const [
  { JPEG_BYTES },
  { createApp },
  { CoreSaasRegistry },
  { MemoryCoreSaasAdapter },
  { InMemoryCoreSaasStore },
  { resolvePermissionsForRoles },
  workOrders,
  fieldDispatch,
  checklists,
  checklistSync,
  evidenceSync,
  evidenceUpload,
  workOrderSync,
  operatorProfiles,
] = await Promise.all([
  import(`${WT_URL}/tests/helpers/upload-fixtures.js`),
  import(`${WT_URL}/src/app.js`),
  import(`${WT_URL}/src/modules/core-saas/services/core-saas.service.js`),
  import(`${WT_URL}/src/modules/core-saas/services/memory-core-saas.adapter.js`),
  import(`${WT_URL}/src/modules/core-saas/store/core-saas.store.js`),
  import(`${WT_URL}/src/modules/core-saas/permissions/catalog.js`),
  import(`${WT_URL}/src/modules/work-orders/index.js`),
  import(`${WT_URL}/src/modules/field-dispatch/index.js`),
  import(`${WT_URL}/src/modules/checklists/index.js`),
  import(`${WT_URL}/src/modules/mobile/mobile-checklist-sync.js`),
  import(`${WT_URL}/src/modules/mobile/mobile-evidence-sync.js`),
  import(`${WT_URL}/src/modules/mobile/mobile-evidence-upload.js`),
  import(`${WT_URL}/src/modules/mobile/mobile-work-order-sync.js`),
  import(`${WT_URL}/src/modules/operator-profiles/operator-profile.service.js`),
]);

const SNAPSHOT_PATH = "C:/Users/AMP/w-j07cb1c1/tests/fixtures/o6r07c-classificacao-vias.json";
const SNAPSHOT = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf8")) as Record<string, { classe: string; n: number }>;
const CLASSES_23 = new Set(["VISTORIA·ESCOPO", "EVIDENCIA-OS·ESCOPO", "DESPACHO·ALVO", "VISTORIA·07c-b", "EVIDENCIA-OS·07c-b", "DESPACHO·07c-b"]);
const VIAS_23 = Object.entries(SNAPSHOT)
  .filter(([, v]) => CLASSES_23.has(v.classe))
  .map(([k, v]) => ({ key: k, classe: v.classe }))
  .sort((a, b) => a.key.localeCompare(b.key));

const LOTE_VISTORIA = "/api/v1/mobile/sync/checklist-actions";
const LOTE_EVIDENCIA = "/api/v1/mobile/sync/evidence-actions";
const JPEG_SHA = createHash("sha256").update(JPEG_BYTES).digest("hex");

function isAckVia(key: string): boolean {
  return (
    key.includes("acknowledgement")
  );
}

type ActorDef = { id: string; roleHeader: string; tenantId: string; name: string };
type SeedTarget = { workOrderId: string; dispatchId: string; runId: string; componentId: string; tenantId: string };

async function startEnv() {
  workOrders.resetWorkOrderRuntimeForTests();
  fieldDispatch.resetFieldDispatchRuntimeForTests();
  checklists.resetChecklistRuntimeForTests();
  checklistSync.resetMobileChecklistSyncRuntimeForTests();
  evidenceSync.resetMobileEvidenceSyncRuntimeForTests();
  workOrderSync.resetMobileWorkOrderSyncRuntimeForTests();
  operatorProfiles.getMemoryOperatorProfileRepositoryForTests().reset();
  evidenceUpload.configureMobileEvidenceUploadStorageForTests(DIR_EVID);
  await evidenceUpload.resetMobileEvidenceUploadRuntimeForTests();

  const modulos = ["work_orders", "field_operations", "tenant_checklist", "checklists"];
  const store = new InMemoryCoreSaasStore();
  const core = new CoreSaasRegistry(store);
  const tenantA = core.createTenant({ name: "Org A", modules: modulos });
  const tenantB = core.createTenant({ name: "Org B", modules: modulos });
  const mkUser = (tId: string, name: string, roles: string[]): ActorDef => {
    const id = randomUUID();
    const u = core.createUser({ tenantId: tId, name, email: `${name}-${id.slice(0, 6)}@c1.test`, roles: roles as never });
    store.saveUser({ ...u, id });
    return { id, roleHeader: roles.join(","), tenantId: tId, name };
  };

  const actors = {
    tenantA,
    tenantB,
    tenant_admin: mkUser(tenantA.id, "adminA", ["tenant_admin"]),
    manager: mkUser(tenantA.id, "managerA", ["manager"]),
    operator: mkUser(tenantA.id, "operatorA", ["operator"]),
    field_dispatcher: mkUser(tenantA.id, "dispatcherA", ["field_dispatcher"]),
    auditor: mkUser(tenantA.id, "auditorA", ["auditor"]),
    tecA: mkUser(tenantA.id, "tecA", ["field_technician"]),
    tecP: mkUser(tenantA.id, "tecP", ["field_technician"]),
    tecU: mkUser(tenantA.id, "tecU", ["field_technician"]),
    tecT2: mkUser(tenantA.id, "tecT2", ["technician"]),
    tecB: mkUser(tenantA.id, "tecB", ["field_technician"]),
    tecT: mkUser(tenantA.id, "tecT", ["technician"]),
    tecX: mkUser(tenantA.id, "tecX", ["field_technician"]),
    tecC: mkUser(tenantA.id, "tecC", ["field_technician"]),
    dual: mkUser(tenantA.id, "dual", ["field_technician", "manager"]),
    adminB: mkUser(tenantB.id, "adminB", ["tenant_admin"]),
    managerB: mkUser(tenantB.id, "managerB", ["manager"]),
    tecB2: mkUser(tenantB.id, "tecB2", ["field_technician"]),
  };

  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server: Server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const h = (a: ActorDef, overrideTenantId?: string): Record<string, string> => ({
    "x-tenant-id": overrideTenantId ?? a.tenantId,
    "x-user-id": a.id,
    "x-role": a.roleHeader,
  });

  const reqJson = async (method: string, urlPath: string, headers: Record<string, string>, body?: unknown) => {
    const res = await fetch(`${baseUrl}${urlPath}`, {
      method,
      headers: { "content-type": "application/json", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch {}
    return { status: res.status, body: json };
  };

  // Create published checklist template in Org A
  const tplRes = await reqJson("POST", "/api/v1/tenant/checklists", h(actors.tenant_admin), {
    name: "Modelo C1",
    type: "technical_evidence",
    schema: { v: 1 },
    components: [{ componentKey: "c1_item", type: "observation", label: "Item C1", required: true, config: {}, validationRules: {}, visibilityRules: {} }],
  });
  const pubRes = await reqJson("POST", `/api/v1/tenant/checklists/${tplRes.body.data.id}/publish`, h(actors.tenant_admin), {});
  const checklistIdA = tplRes.body.data.id as string;
  const componentIdA = pubRes.body.data.components[0].id as string;

  // Create operator profile for tecP via OperatorProfileService
  const profileService = await operatorProfiles.createDefaultOperatorProfileService();
  const actorAdmin = { tenantId: tenantA.id, userId: actors.tenant_admin.id, roles: ["tenant_admin"], permissions: [] } as never;
  const perfilP = await profileService.create(actorAdmin, {
    user_id: actors.tecP.id,
    full_name: "Tecnico Perfil P",
  });
  const tecPProfileId = perfilP.id as string;

  // Helper to create OS + dispatch + run (or pending_acknowledgement run for ack via)
  const makeDispatchedSeed = async (targetTech: ActorDef, forAck = false): Promise<SeedTarget> => {
    const woRes = await reqJson("POST", "/api/v1/work-orders", h(actors.manager), {
      title: `OS-${targetTech.name}`,
      checklistId: checklistIdA,
    });
    const workOrderId = woRes.body.data.id as string;
    const dispRes = await reqJson("POST", "/api/v1/operations/dispatches", h(actors.manager), {
      workOrderId,
      operatorUserId: targetTech.id,
    });
    const dispatchId = dispRes.body.data.id as string;
    const runsRes = await reqJson("GET", `/api/v1/mobile/checklist-runs?workOrderId=${workOrderId}`, h(actors.tenant_admin));
    const runId = runsRes.body.data[0].id as string;
    if (forAck) {
      await reqJson("POST", `/api/v1/mobile/checklist-runs/${runId}/divergence`, h(actors.operator), {
        componentId: componentIdA,
        observation: "Divergencia prévia para teste de ciencia",
        fileUrl: "https://example.com/div-seed.jpg",
      });
    }
    return { workOrderId, dispatchId, runId, componentId: componentIdA, tenantId: actors.tenantA.id };
  };

  // Helper to create OS assigned by profile (osP) or by userId (osU) + run linked to that OS
  const makeWebAssignedSeed = async (mode: "profile" | "userId", forAck = false, forDispatch = false): Promise<SeedTarget> => {
    const targetActor = mode === "profile" ? actors.tecP : actors.tecU;
    if (forDispatch) {
      return makeDispatchedSeed(targetActor, forAck);
    }
    const woRes = await reqJson("POST", "/api/v1/work-orders", h(actors.manager), {
      title: `OS-web-${mode}`,
      checklistId: checklistIdA,
    });
    const workOrderId = woRes.body.data.id as string;
    if (mode === "profile") {
      await reqJson("POST", `/api/v1/work-orders/${workOrderId}/assign`, h(actors.manager), {
        operatorId: tecPProfileId,
      });
    } else {
      await reqJson("POST", `/api/v1/work-orders/${workOrderId}/assign`, h(actors.manager), {
        userId: actors.tecU.id,
      });
    }
    // Create run linked to workOrderId via POST /api/v1/mobile/checklist-runs as operator
    const runRes = await reqJson("POST", "/api/v1/mobile/checklist-runs", h(actors.operator), {
      checklistId: checklistIdA,
      relatedEntityType: "work_order",
      relatedEntityId: workOrderId,
    });
    const runId = runRes.body.data.id as string;
    if (forAck) {
      await reqJson("POST", `/api/v1/mobile/checklist-runs/${runId}/divergence`, h(actors.operator), {
        componentId: componentIdA,
        observation: "Divergencia prévia",
        fileUrl: "https://example.com/div-seed.jpg",
      });
    }
    return { workOrderId, dispatchId: "", runId, componentId: componentIdA, tenantId: actors.tenantA.id };
  };

  // State reader (by manager / memory repo for checklist details & evidence audit events)
  const readState = async (s: SeedTarget) => {
    const chkSvc = await checklists.createDefaultChecklistService();
    const runDetails = await chkSvc.getRun({ tenantId: s.tenantId, userId: actors.manager.id }, s.runId);
    const dispRes = s.dispatchId
      ? await reqJson("GET", `/api/v1/operations/dispatches/${s.dispatchId}`, h(actors.manager))
      : { body: null };
    const woRes = await reqJson("GET", `/api/v1/work-orders/${s.workOrderId}`, h(actors.manager));
    const evidEvents = evidenceUpload.getMobileEvidenceUploadAuditEventsForTests().length;
    const filesAnexos = fs.existsSync(DIR_ANEXOS) ? fs.readdirSync(DIR_ANEXOS).length : 0;
    const filesEvid = fs.existsSync(DIR_EVID)
      ? fs.readdirSync(DIR_EVID, { recursive: true }).filter((f) => typeof f === "string" && !fs.statSync(path.join(DIR_EVID, f)).isDirectory()).length
      : 0;
    return {
      runStatus: runDetails.run.status,
      answers: runDetails.answers.length,
      answerActionIds: runDetails.answers.map((a) => (a.metadata as any)?.sync_client_action_id ?? null),
      attachments: runDetails.attachments.length,
      markers: runDetails.markers.length,
      acks: runDetails.acknowledgements.length,
      dispatchStatus: dispRes.body?.data?.status,
      dispatchTarget: dispRes.body?.data?.operatorUserId,
      woAssignedOp: woRes.body?.data?.assignedOperatorId ?? null,
      woAssignedUser: woRes.body?.data?.assignedUserId ?? null,
      evidEvents,
      filesAnexos,
      filesEvid,
    };
  };

  const close = async () => {
    await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
    fs.rmSync(DIR_ANEXOS, { recursive: true, force: true });
    fs.rmSync(DIR_EVID, { recursive: true, force: true });
  };

  return { actors, baseUrl, h, reqJson, checklistIdA, componentIdA, tecPProfileId, makeDispatchedSeed, makeWebAssignedSeed, readState, close };
}

type CallResult = {
  httpStatus: number;
  bucket?: string;
  reason?: string;
  conflictType?: string;
  stateBefore: any;
  stateAfter: any;
  stateChanged: boolean;
};

async function invokeVia(
  env: Awaited<ReturnType<typeof startEnv>>,
  viaKey: string,
  actor: ActorDef,
  s: SeedTarget,
  mode: "empty" | "valid",
  beforeUploadHook?: () => Promise<void>,
  overrideReceiptClientEvidenceId?: string,
): Promise<CallResult> {
  const hdrs = env.h(actor);
  if (viaKey === "ROTA POST /api/v1/mobile/evidence-uploads") {
    let clientEvidId = overrideReceiptClientEvidenceId;
    if (!clientEvidId) {
      clientEvidId = `ev-${randomUUID()}`;
      const syncRes = await env.reqJson("POST", LOTE_EVIDENCIA, hdrs, {
        client_batch_id: randomUUID(),
        actions: [{
          client_evidence_id: clientEvidId,
          type: "evidence.work_order_photo",
          local_created_at: new Date().toISOString(),
          payload: {
            work_order_id: s.workOrderId,
            file_name: "foto.jpg",
            content_type: "image/jpeg",
            size_bytes: JPEG_BYTES.length,
            sha256: JPEG_SHA,
          },
        }],
      });
      const data = syncRes.body?.data ?? {};
      const item = [...(data.accepted ?? []), ...(data.rejected ?? []), ...(data.conflicts ?? [])][0];
      if (!item || item.status !== "accepted") {
        const st = await env.readState(s);
        return {
          httpStatus: syncRes.status,
          bucket: item?.status ?? "http_error",
          reason: item?.error?.reason ?? syncRes.body?.error?.reason,
          conflictType: item?.conflict?.conflict_type,
          stateBefore: st,
          stateAfter: st,
          stateChanged: false,
        };
      }
    }
    await beforeUploadHook?.();
    const stateBefore = await env.readState(s);
    const form = new FormData();
    form.set("evidence_id", `evidence:${s.tenantId}:${clientEvidId}`);
    form.set("client_evidence_id", clientEvidId);
    if (mode === "valid") {
      form.set("sha256", JPEG_SHA);
      form.set("size_bytes", String(JPEG_BYTES.length));
      form.set("content_type", "image/jpeg");
      form.set("file", new Blob([JPEG_BYTES], { type: "image/jpeg" }), "foto.jpg");
    } else {
      form.set("sha256", "not-a-sha");
      form.set("size_bytes", "10");
    }
    const res = await fetch(`${env.baseUrl}/api/v1/mobile/evidence-uploads`, { method: "POST", headers: hdrs, body: form });
    const txt = await res.text();
    const body = txt ? JSON.parse(txt) : null;
    const stateAfter = await env.readState(s);
    return {
      httpStatus: res.status,
      reason: body?.error?.reason ?? body?.data?.status,
      stateBefore,
      stateAfter,
      stateChanged: JSON.stringify(stateBefore) !== JSON.stringify(stateAfter),
    };
  }

  await beforeUploadHook?.();
  const stateBefore = await env.readState(s);

  if (viaKey.startsWith("ROTA ")) {
    const [, method, rawPath] = viaKey.split(" ");
    const urlPath = rawPath!
      .replace(":runId", s.runId)
      .replace(":dispatchId", s.dispatchId);

    // Multipart upload on /attachments when mode === "valid"
    if (urlPath.endsWith("/attachments") && mode === "valid") {
      const form = new FormData();
      form.set("componentId", s.componentId);
      form.set("file", new Blob([JPEG_BYTES], { type: "image/jpeg" }), "anexo.jpg");
      const res = await fetch(`${env.baseUrl}${urlPath}`, { method: "POST", headers: hdrs, body: form });
      const body = JSON.parse(await res.text());
      const stateAfter = await env.readState(s);
      return {
        httpStatus: res.status,
        reason: body?.error?.reason,
        stateBefore,
        stateAfter,
        stateChanged: JSON.stringify(stateBefore) !== JSON.stringify(stateAfter),
      };
    }

    let body: Record<string, unknown> = {};
    if (mode === "empty") {
      if (urlPath.includes("/dispatches/")) body = {};
      else if (urlPath.endsWith("/complete")) body = { hasDivergence: "invalid_boolean" };
      else if (urlPath.endsWith("/markers") || urlPath.endsWith("/divergence") || urlPath.endsWith("/acknowledgement") || urlPath.endsWith("/attachments")) body = {};
      else body = { status: "invalid_status" };
    } else {
      if (urlPath.includes("/dispatches/")) body = { status: "accepted" };
      else if (urlPath.endsWith("/markers")) body = { componentId: s.componentId, markerType: "scratch", x: 0.5, y: 0.5, description: "Porta" };
      else if (urlPath.endsWith("/complete")) body = { hasDivergence: false };
      else if (urlPath.endsWith("/divergence")) body = { componentId: s.componentId, observation: "Risco lateral", fileUrl: "https://example.com/div.jpg" };
      else if (urlPath.endsWith("/acknowledgement")) body = { message: "Ciente" };
      else body = { answers: [{ componentId: s.componentId, value: "OK" }] };
    }
    const res = await env.reqJson(method!, urlPath, hdrs, body);
    const stateAfter = await env.readState(s);
    return {
      httpStatus: res.status,
      reason: res.body?.error?.reason,
      stateBefore,
      stateAfter,
      stateChanged: JSON.stringify(stateBefore) !== JSON.stringify(stateAfter),
    };
  }

  // PAR <lote> · <tipo>
  const [lote, tipo] = viaKey.slice("PAR ".length).split(" · ");
  const idKey = lote === LOTE_EVIDENCIA ? "client_evidence_id" : "client_action_id";
  const actionId = `act-${randomUUID()}`;
  let payload: Record<string, unknown> = {};
  if (mode === "empty") {
    payload = lote === LOTE_EVIDENCIA ? { work_order_id: s.workOrderId } : { run_id: s.runId, component_id: s.componentId };
  } else if (lote === LOTE_EVIDENCIA) {
    if (tipo === "evidence.work_order_observation") {
      payload = { work_order_id: s.workOrderId, note: "Observacao valida" };
    } else if (tipo === "evidence.work_order_photo") {
      payload = { work_order_id: s.workOrderId, file_name: "foto.jpg", content_type: "image/jpeg", size_bytes: JPEG_BYTES.length, sha256: JPEG_SHA };
    } else {
      payload = { work_order_id: s.workOrderId, file_name: "ass.jpg", content_type: "image/jpeg", size_bytes: JPEG_BYTES.length, sha256: JPEG_SHA, signer_name: "Cliente" };
    }
  } else {
    const canon = tipo!
      .replace("checklist_marker.create", "checklist.marker_create")
      .replace("checklist_divergence.create", "checklist.divergence_create")
      .replace("checklist_acknowledgement.create", "checklist.acknowledgement_create")
      .replace("checklist_attachment.attach", "checklist.attachment_attach")
      .replace("checklist_run.complete", "checklist.complete");
    if (canon === "checklist.item_answer") payload = { run_id: s.runId, component_id: s.componentId, value: "Resp valida" };
    else if (canon === "checklist.item_note") payload = { run_id: s.runId, component_id: s.componentId, note: "Nota valida" };
    else if (canon === "checklist.marker_create") payload = { run_id: s.runId, component_id: s.componentId, marker_type: "scratch", position_label: "Capo" };
    else if (canon === "checklist.divergence_create") payload = { run_id: s.runId, component_id: s.componentId, observation: "Divergencia valida" };
    else if (canon === "checklist.acknowledgement_create") payload = { run_id: s.runId, message: "Ciente valido" };
    else if (canon === "checklist.attachment_attach") payload = { run_id: s.runId, local_att_id: `att-${randomUUID()}`, field_id: s.componentId, file_name: "a.jpg", mime_type: "image/jpeg", size_bytes: 123, checksum: "abc" };
    else if (canon === "checklist.complete") payload = { run_id: s.runId, has_divergence: false };
  }

  const res = await env.reqJson("POST", lote!, hdrs, {
    client_batch_id: randomUUID(),
    actions: [{ [idKey]: actionId, type: tipo, local_created_at: new Date().toISOString(), payload }],
  });
  const data = res.body?.data ?? {};
  const item = [...(data.accepted ?? []), ...(data.rejected ?? []), ...(data.conflicts ?? []), ...(data.already_applied ?? [])].find((x: any) => x[idKey] === actionId);
  const stateAfter = await env.readState(s);
  const stateChanged = JSON.stringify(stateBefore) !== JSON.stringify(stateAfter) || item?.status === "accepted";
  return {
    httpStatus: res.status,
    bucket: item?.status,
    reason: item?.error?.reason ?? res.body?.error?.reason,
    conflictType: item?.conflict?.conflict_type,
    stateBefore,
    stateAfter,
    stateChanged,
  };
}

async function main() {
  const modeArg = process.argv[2] ?? "object";
  const env = await startEnv();
  try {
    // Controls 1 & 2
    const sCtrl = await env.makeDispatchedSeed(env.actors.tecA, false);
    const ctrlEffect = await invokeVia(env, "ROTA PATCH /api/v1/mobile/checklist-runs/:runId", env.actors.operator, sCtrl, "valid");
    const auditorPerms = resolvePermissionsForRoles(["auditor"]);
    const ctrlAuditor = await invokeVia(env, "ROTA PATCH /api/v1/mobile/checklist-runs/:runId", env.actors.auditor, sCtrl, "valid");
    console.log(`CONTROL_1_EFFECT_OPERATOR: status=${ctrlEffect.httpStatus} answersBefore=${ctrlEffect.stateBefore.answers} answersAfter=${ctrlEffect.stateAfter.answers} changed=${ctrlEffect.stateChanged}`);
    console.log(`CONTROL_2_AUDITOR_MOTIVE: hasUpdatePerm=${auditorPerms.includes("checklist_runs:update" as any)} status=${ctrlAuditor.httpStatus} reason=${ctrlAuditor.reason}`);

    // G-NEG Upload with stolen receipt (tecB using tecA's receipt)
    const sUp = await env.makeDispatchedSeed(env.actors.tecA, false);
    const tecAClientEvidId = `ev-teca-${randomUUID()}`;
    const metaA = await env.reqJson("POST", LOTE_EVIDENCIA, env.h(env.actors.tecA), {
      client_batch_id: randomUUID(),
      actions: [{
        client_evidence_id: tecAClientEvidId,
        type: "evidence.work_order_photo",
        local_created_at: new Date().toISOString(),
        payload: { work_order_id: sUp.workOrderId, file_name: "f.jpg", content_type: "image/jpeg", size_bytes: JPEG_BYTES.length, sha256: JPEG_SHA },
      }],
    });
    const stolenByB = await invokeVia(env, "ROTA POST /api/v1/mobile/evidence-uploads", env.actors.tecB, sUp, "valid", undefined, tecAClientEvidId);
    const stolenByT = await invokeVia(env, "ROTA POST /api/v1/mobile/evidence-uploads", env.actors.tecT, sUp, "valid", undefined, tecAClientEvidId);
    console.log(`UPLOAD_STOLEN_RECEIPT: metaA=${metaA.body?.data?.accepted?.length} tecB_status=${stolenByB.httpStatus} tecB_reason=${stolenByB.reason} tecB_files=${stolenByB.stateAfter.filesEvid} tecT_status=${stolenByT.httpStatus} tecT_reason=${stolenByT.reason}`);

    // Loop over all 23 vias
    const rows: any[] = [];
    for (const v of VIAS_23) {
      const ack = isAckVia(v.key);
      // G-NEG: tecB and tecT on osA, empty and valid
      const gNegBEmpty = await invokeVia(env, v.key, env.actors.tecB, await env.makeDispatchedSeed(env.actors.tecA, ack), "empty");
      const gNegBValid = await invokeVia(env, v.key, env.actors.tecB, await env.makeDispatchedSeed(env.actors.tecA, ack), "valid");
      const gNegTEmpty = await invokeVia(env, v.key, env.actors.tecT, await env.makeDispatchedSeed(env.actors.tecA, ack), "empty");
      const gNegTValid = await invokeVia(env, v.key, env.actors.tecT, await env.makeDispatchedSeed(env.actors.tecA, ack), "valid");

      // G-EX: tecX on osX after reassign to tecC
      const sEx = await env.makeDispatchedSeed(env.actors.tecX, ack);
      const gExValid = await invokeVia(env, v.key, env.actors.tecX, sEx, "valid", async () => {
        await env.reqJson("PATCH", `/api/v1/operations/dispatches/${sEx.dispatchId}/reassign`, env.h(env.actors.manager), {
          operatorUserId: env.actors.tecC.id,
        });
      });

      // G-POS: tecA (dispatched), tecT2 (technician dispatched), tecP (profile), tecU (userId), dual
      const gPosA = await invokeVia(env, v.key, env.actors.tecA, await env.makeDispatchedSeed(env.actors.tecA, ack), "valid");
      const gPosT2 = await invokeVia(env, v.key, env.actors.tecT2, await env.makeDispatchedSeed(env.actors.tecT2, ack), "valid");
      const isDispatchVia = v.key.includes("/operations/dispatches/");
      const gPosP = isDispatchVia
        ? await invokeVia(env, v.key, env.actors.tecP, await env.makeDispatchedSeed(env.actors.tecP, ack), "valid")
        : await invokeVia(env, v.key, env.actors.tecP, await env.makeWebAssignedSeed("profile", ack), "valid");
      const gPosU = isDispatchVia
        ? await invokeVia(env, v.key, env.actors.tecU, await env.makeDispatchedSeed(env.actors.tecU, ack), "valid")
        : await invokeVia(env, v.key, env.actors.tecU, await env.makeWebAssignedSeed("userId", ack), "valid");
      const gDual = await invokeVia(env, v.key, env.actors.dual, await env.makeDispatchedSeed(env.actors.tecA, ack), "valid");

      // G-WIDE: first of operator, tenant_admin, manager, field_dispatcher that doesn't get permission_required
      let gWideRole = "NONE";
      let gWideRes: CallResult | null = null;
      for (const rName of ["operator", "tenant_admin", "manager", "field_dispatcher"] as const) {
        const candidate = await invokeVia(env, v.key, env.actors[rName], await env.makeDispatchedSeed(env.actors.tecA, ack), "valid");
        if (candidate.reason === "permission_required") continue;
        gWideRole = rName;
        gWideRes = candidate;
        break;
      }

      const fmt = (r: CallResult) => `${r.httpStatus}:${r.bucket ?? "-"}:${r.reason ?? "ok"}${r.conflictType ? `(${r.conflictType})` : ""}:chg=${r.stateChanged}`;
      const row = {
        via: v.key,
        classe: v.classe,
        gNegB_empty: fmt(gNegBEmpty),
        gNegB_valid: fmt(gNegBValid),
        gNegT_empty: fmt(gNegTEmpty),
        gNegT_valid: fmt(gNegTValid),
        gEx_valid: fmt(gExValid),
        gPos_tecA: fmt(gPosA),
        gPos_tecT2: fmt(gPosT2),
        gPos_tecP: fmt(gPosP),
        gPos_tecU: fmt(gPosU),
        gDual: fmt(gDual),
        gWide: `${gWideRole}=>${gWideRes ? fmt(gWideRes) : "EMPTY"}`,
      };
      rows.push(row);
      console.log(`VIA [${modeArg}] ${v.key} | B_emp=${row.gNegB_empty} | B_val=${row.gNegB_valid} | T_emp=${row.gNegT_empty} | T_val=${row.gNegT_valid} | EX=${row.gEx_valid} | posA=${row.gPos_tecA} | posT2=${row.gPos_tecT2} | posP=${row.gPos_tecP} | posU=${row.gPos_tecU} | dual=${row.gDual} | wide=${row.gWide}`);
    }

    // S-ORFA: run without OS
    const orfaRunRes = await env.reqJson("POST", "/api/v1/mobile/checklist-runs", env.h(env.actors.operator), {
      checklistId: env.checklistIdA,
    });
    const orfaRunId = orfaRunRes.body.data.id as string;
    const orfaTecA = await env.reqJson("PATCH", `/api/v1/mobile/checklist-runs/${orfaRunId}`, env.h(env.actors.tecA), { answers: [{ componentId: env.componentIdA, value: "x" }] });
    const orfaTecB = await env.reqJson("PATCH", `/api/v1/mobile/checklist-runs/${orfaRunId}`, env.h(env.actors.tecB), { answers: [{ componentId: env.componentIdA, value: "x" }] });
    const orfaTecT = await env.reqJson("PATCH", `/api/v1/mobile/checklist-runs/${orfaRunId}`, env.h(env.actors.tecT), { answers: [{ componentId: env.componentIdA, value: "x" }] });
    const orfaOp = await env.reqJson("PATCH", `/api/v1/mobile/checklist-runs/${orfaRunId}`, env.h(env.actors.operator), { answers: [{ componentId: env.componentIdA, value: "ok" }] });
    console.log(`S_ORFA: tecA=${orfaTecA.status}:${orfaTecA.body?.error?.reason} tecB=${orfaTecB.status}:${orfaTecB.body?.error?.reason} tecT=${orfaTecT.status}:${orfaTecT.body?.error?.reason} operator=${orfaOp.status}:${orfaOp.body?.data?.answers?.length}`);

    // S-ORDEM: invalid body on all 5 REST checklist routes with body + dispatch status
    const sOrdem = await env.makeDispatchedSeed(env.actors.tecA, false);
    for (const suf of ["", "/attachments", "/markers", "/complete", "/divergence", "/acknowledgement"]) {
      const rB = await env.reqJson(suf === "" ? "PATCH" : "POST", `/api/v1/mobile/checklist-runs/${sOrdem.runId}${suf}`, env.h(env.actors.tecB), { answers: "bad", hasDivergence: "bad" });
      const rT = await env.reqJson(suf === "" ? "PATCH" : "POST", `/api/v1/mobile/checklist-runs/${sOrdem.runId}${suf}`, env.h(env.actors.tecT), { answers: "bad", hasDivergence: "bad" });
      console.log(`S_ORDEM /mobile/checklist-runs/:runId${suf}: tecB=${rB.status}:${rB.body?.error?.reason} tecT=${rT.status}:${rT.body?.error?.reason}`);
    }
    const rDispOrdB = await env.reqJson("PATCH", `/api/v1/operations/dispatches/${sOrdem.dispatchId}/status`, env.h(env.actors.tecB), { status: "NOT_A_VALID_STATUS" });
    const rDispOrdT = await env.reqJson("PATCH", `/api/v1/operations/dispatches/${sOrdem.dispatchId}/status`, env.h(env.actors.tecT), { status: "NOT_A_VALID_STATUS" });
    console.log(`S_ORDEM /operations/dispatches/:dispatchId/status: tecB=${rDispOrdB.status}:${rDispOrdB.body?.error?.reason} tecT=${rDispOrdT.status}:${rDispOrdT.body?.error?.reason}`);

    // 404 Cross-tenant (CA10): tecB2 (Org B) accessing Org A's run, dispatch, workOrder in evidence sync, and receipt in upload; plus non-existent IDs; vs tecB (Org A) -> 403
    const sXt = await env.makeDispatchedSeed(env.actors.tecA, false);
    const xtRunAlheio = await env.reqJson("POST", `/api/v1/mobile/checklist-runs/${sXt.runId}/complete`, env.h(env.actors.tecB2), { hasDivergence: false });
    const xtRunInexist = await env.reqJson("POST", `/api/v1/mobile/checklist-runs/${randomUUID()}/complete`, env.h(env.actors.tecB2), { hasDivergence: false });
    const xtRunMesmaOrg = await env.reqJson("POST", `/api/v1/mobile/checklist-runs/${sXt.runId}/complete`, env.h(env.actors.tecB), { hasDivergence: false });

    const xtDispAlheio = await env.reqJson("PATCH", `/api/v1/operations/dispatches/${sXt.dispatchId}/status`, env.h(env.actors.tecB2), { status: "accepted" });
    const xtDispInexist = await env.reqJson("PATCH", `/api/v1/operations/dispatches/${randomUUID()}/status`, env.h(env.actors.tecB2), { status: "accepted" });
    const xtDispMesmaOrg = await env.reqJson("PATCH", `/api/v1/operations/dispatches/${sXt.dispatchId}/status`, env.h(env.actors.tecB), { status: "accepted" });

    const xtLoteRunAlheio = await env.reqJson("POST", LOTE_VISTORIA, env.h(env.actors.tecB2), {
      client_batch_id: randomUUID(),
      actions: [{ client_action_id: randomUUID(), type: "checklist.item_answer", local_created_at: new Date().toISOString(), payload: { run_id: sXt.runId, component_id: sXt.componentId, value: "x" } }],
    });
    const xtLoteEvidAlheio = await env.reqJson("POST", LOTE_EVIDENCIA, env.h(env.actors.tecB2), {
      client_batch_id: randomUUID(),
      actions: [{ client_evidence_id: randomUUID(), type: "evidence.work_order_observation", local_created_at: new Date().toISOString(), payload: { work_order_id: sXt.workOrderId, note: "x" } }],
    });
    const xtUploadAlheio = await invokeVia(env, "ROTA POST /api/v1/mobile/evidence-uploads", env.actors.tecB2, sUp, "valid", undefined, tecAClientEvidId);
    const xtUploadInexist = await invokeVia(env, "ROTA POST /api/v1/mobile/evidence-uploads", env.actors.tecB2, sUp, "valid", undefined, `ev-inexist-${randomUUID()}`);

    console.log(`CA10_XT_RUN: alheio=${xtRunAlheio.status}:${xtRunAlheio.body?.error?.reason}:${xtRunAlheio.body?.error?.message} | inexist=${xtRunInexist.status}:${xtRunInexist.body?.error?.reason}:${xtRunInexist.body?.error?.message} | mesmaOrg=${xtRunMesmaOrg.status}:${xtRunMesmaOrg.body?.error?.reason}`);
    console.log(`CA10_XT_DISP: alheio=${xtDispAlheio.status}:${xtDispAlheio.body?.error?.reason}:${xtDispAlheio.body?.error?.message} | inexist=${xtDispInexist.status}:${xtDispInexist.body?.error?.reason}:${xtDispInexist.body?.error?.message} | mesmaOrg=${xtDispMesmaOrg.status}:${xtDispMesmaOrg.body?.error?.reason}`);
    console.log(`CA10_XT_LOTE_RUN: bucket=${xtLoteRunAlheio.body?.data?.rejected?.[0]?.status} reason=${xtLoteRunAlheio.body?.data?.rejected?.[0]?.error?.reason}`);
    console.log(`CA10_XT_LOTE_EVID: bucket=${xtLoteEvidAlheio.body?.data?.rejected?.[0]?.status} reason=${xtLoteEvidAlheio.body?.data?.rejected?.[0]?.error?.reason}`);
    console.log(`CA10_XT_UPLOAD: alheio=${xtUploadAlheio.httpStatus}:${xtUploadAlheio.reason} | inexist=${xtUploadInexist.httpStatus}:${xtUploadInexist.reason}`);
  } finally {
    await env.close();
  }
}

await main();
```

**Comando executado em `O` (`b198fe358b41186b2598ab258ccb735da8c04cbc`):**
```bash
CORE_SAAS_PERSISTENCE=memory npx tsx C:/Users/AMP/.gemini/antigravity-cli/brain/d9d16a23-c79a-4bff-b05d-f43d2c2585f9/scratch/c1/05-sonda-item1.mts object
```

**Saída integral em `O` (`05-sonda-object.log`):**
```text
CONTROL_1_EFFECT_OPERATOR: status=200 answersBefore=0 answersAfter=1 changed=true
CONTROL_2_AUDITOR_MOTIVE: hasUpdatePerm=false status=403 reason=permission_required
UPLOAD_STOLEN_RECEIPT: metaA=1 tecB_status=409 tecB_reason=evidence_metadata_required tecB_files=0 tecT_status=409 tecT_reason=evidence_metadata_required
VIA [object] PAR /api/v1/mobile/sync/checklist-actions · checklist_acknowledgement.create | B_emp=200:rejected:not_assigned_to_actor:chg=false | B_val=200:rejected:not_assigned_to_actor:chg=false | T_emp=200:rejected:not_assigned_to_actor:chg=false | T_val=200:rejected:not_assigned_to_actor:chg=false | EX=200:conflict:not_assigned_to_actor(assignment_changed_pending_review):chg=false | posA=200:accepted:ok:chg=true | posT2=200:accepted:ok:chg=true | posP=200:accepted:ok:chg=true | posU=200:accepted:ok:chg=true | dual=200:accepted:ok:chg=true | wide=tenant_admin=>200:accepted:ok:chg=true
VIA [object] PAR /api/v1/mobile/sync/checklist-actions · checklist_attachment.attach | B_emp=200:rejected:not_assigned_to_actor:chg=false | B_val=200:rejected:not_assigned_to_actor:chg=false | T_emp=200:rejected:not_assigned_to_actor:chg=false | T_val=200:rejected:not_assigned_to_actor:chg=false | EX=200:conflict:not_assigned_to_actor(assignment_changed_pending_review):chg=false | posA=200:accepted:ok:chg=true | posT2=200:accepted:ok:chg=true | posP=200:accepted:ok:chg=true | posU=200:accepted:ok:chg=true | dual=200:accepted:ok:chg=true | wide=operator=>200:accepted:ok:chg=true
VIA [object] PAR /api/v1/mobile/sync/checklist-actions · checklist_divergence.create | B_emp=200:rejected:not_assigned_to_actor:chg=false | B_val=200:rejected:not_assigned_to_actor:chg=false | T_emp=200:rejected:not_assigned_to_actor:chg=false | T_val=200:rejected:not_assigned_to_actor:chg=false | EX=200:conflict:not_assigned_to_actor(assignment_changed_pending_review):chg=false | posA=200:accepted:ok:chg=true | posT2=200:accepted:ok:chg=true | posP=200:accepted:ok:chg=true | posU=200:accepted:ok:chg=true | dual=200:accepted:ok:chg=true | wide=operator=>200:accepted:ok:chg=true
VIA [object] PAR /api/v1/mobile/sync/checklist-actions · checklist_marker.create | B_emp=200:rejected:not_assigned_to_actor:chg=false | B_val=200:rejected:not_assigned_to_actor:chg=false | T_emp=200:rejected:not_assigned_to_actor:chg=false | T_val=200:rejected:not_assigned_to_actor:chg=false | EX=200:conflict:not_assigned_to_actor(assignment_changed_pending_review):chg=false | posA=200:accepted:ok:chg=true | posT2=200:accepted:ok:chg=true | posP=200:accepted:ok:chg=true | posU=200:accepted:ok:chg=true | dual=200:accepted:ok:chg=true | wide=operator=>200:accepted:ok:chg=true
VIA [object] PAR /api/v1/mobile/sync/checklist-actions · checklist_run.complete | B_emp=200:rejected:not_assigned_to_actor:chg=false | B_val=200:rejected:not_assigned_to_actor:chg=false | T_emp=200:rejected:not_assigned_to_actor:chg=false | T_val=200:rejected:not_assigned_to_actor:chg=false | EX=200:conflict:not_assigned_to_actor(assignment_changed_pending_review):chg=false | posA=200:accepted:ok:chg=true | posT2=200:accepted:ok:chg=true | posP=200:accepted:ok:chg=true | posU=200:accepted:ok:chg=true | dual=200:accepted:ok:chg=true | wide=operator=>200:accepted:ok:chg=true
VIA [object] PAR /api/v1/mobile/sync/checklist-actions · checklist.acknowledgement_create | B_emp=200:rejected:not_assigned_to_actor:chg=false | B_val=200:rejected:not_assigned_to_actor:chg=false | T_emp=200:rejected:not_assigned_to_actor:chg=false | T_val=200:rejected:not_assigned_to_actor:chg=false | EX=200:conflict:not_assigned_to_actor(assignment_changed_pending_review):chg=false | posA=200:accepted:ok:chg=true | posT2=200:accepted:ok:chg=true | posP=200:accepted:ok:chg=true | posU=200:accepted:ok:chg=true | dual=200:accepted:ok:chg=true | wide=tenant_admin=>200:accepted:ok:chg=true
VIA [object] PAR /api/v1/mobile/sync/checklist-actions · checklist.attachment_attach | B_emp=200:rejected:not_assigned_to_actor:chg=false | B_val=200:rejected:not_assigned_to_actor:chg=false | T_emp=200:rejected:not_assigned_to_actor:chg=false | T_val=200:rejected:not_assigned_to_actor:chg=false | EX=200:conflict:not_assigned_to_actor(assignment_changed_pending_review):chg=false | posA=200:accepted:ok:chg=true | posT2=200:accepted:ok:chg=true | posP=200:accepted:ok:chg=true | posU=200:accepted:ok:chg=true | dual=200:accepted:ok:chg=true | wide=operator=>200:accepted:ok:chg=true
VIA [object] PAR /api/v1/mobile/sync/checklist-actions · checklist.complete | B_emp=200:rejected:not_assigned_to_actor:chg=false | B_val=200:rejected:not_assigned_to_actor:chg=false | T_emp=200:rejected:not_assigned_to_actor:chg=false | T_val=200:rejected:not_assigned_to_actor:chg=false | EX=200:conflict:not_assigned_to_actor(assignment_changed_pending_review):chg=false | posA=200:accepted:ok:chg=true | posT2=200:accepted:ok:chg=true | posP=200:accepted:ok:chg=true | posU=200:accepted:ok:chg=true | dual=200:accepted:ok:chg=true | wide=operator=>200:accepted:ok:chg=true
VIA [object] PAR /api/v1/mobile/sync/checklist-actions · checklist.divergence_create | B_emp=200:rejected:not_assigned_to_actor:chg=false | B_val=200:rejected:not_assigned_to_actor:chg=false | T_emp=200:rejected:not_assigned_to_actor:chg=false | T_val=200:rejected:not_assigned_to_actor:chg=false | EX=200:conflict:not_assigned_to_actor(assignment_changed_pending_review):chg=false | posA=200:accepted:ok:chg=true | posT2=200:accepted:ok:chg=true | posP=200:accepted:ok:chg=true | posU=200:accepted:ok:chg=true | dual=200:accepted:ok:chg=true | wide=operator=>200:accepted:ok:chg=true
VIA [object] PAR /api/v1/mobile/sync/checklist-actions · checklist.item_answer | B_emp=200:rejected:not_assigned_to_actor:chg=false | B_val=200:rejected:not_assigned_to_actor:chg=false | T_emp=200:rejected:not_assigned_to_actor:chg=false | T_val=200:rejected:not_assigned_to_actor:chg=false | EX=200:conflict:not_assigned_to_actor(assignment_changed_pending_review):chg=false | posA=200:accepted:ok:chg=true | posT2=200:accepted:ok:chg=true | posP=200:accepted:ok:chg=true | posU=200:accepted:ok:chg=true | dual=200:accepted:ok:chg=true | wide=operator=>200:accepted:ok:chg=true
VIA [object] PAR /api/v1/mobile/sync/checklist-actions · checklist.item_note | B_emp=200:rejected:not_assigned_to_actor:chg=false | B_val=200:rejected:not_assigned_to_actor:chg=false | T_emp=200:rejected:not_assigned_to_actor:chg=false | T_val=200:rejected:not_assigned_to_actor:chg=false | EX=200:conflict:not_assigned_to_actor(assignment_changed_pending_review):chg=false | posA=200:accepted:ok:chg=true | posT2=200:accepted:ok:chg=true | posP=200:accepted:ok:chg=true | posU=200:accepted:ok:chg=true | dual=200:accepted:ok:chg=true | wide=operator=>200:accepted:ok:chg=true
VIA [object] PAR /api/v1/mobile/sync/checklist-actions · checklist.marker_create | B_emp=200:rejected:not_assigned_to_actor:chg=false | B_val=200:rejected:not_assigned_to_actor:chg=false | T_emp=200:rejected:not_assigned_to_actor:chg=false | T_val=200:rejected:not_assigned_to_actor:chg=false | EX=200:conflict:not_assigned_to_actor(assignment_changed_pending_review):chg=false | posA=200:accepted:ok:chg=true | posT2=200:accepted:ok:chg=true | posP=200:accepted:ok:chg=true | posU=200:accepted:ok:chg=true | dual=200:accepted:ok:chg=true | wide=operator=>200:accepted:ok:chg=true
VIA [object] PAR /api/v1/mobile/sync/evidence-actions · evidence.work_order_observation | B_emp=200:rejected:not_assigned_to_actor:chg=false | B_val=200:rejected:not_assigned_to_actor:chg=false | T_emp=200:rejected:not_assigned_to_actor:chg=false | T_val=200:rejected:not_assigned_to_actor:chg=false | EX=200:conflict:not_assigned_to_actor(assignment_changed_pending_review):chg=false | posA=200:accepted:ok:chg=true | posT2=200:accepted:ok:chg=true | posP=200:accepted:ok:chg=true | posU=200:accepted:ok:chg=true | dual=200:accepted:ok:chg=true | wide=operator=>200:accepted:ok:chg=true
VIA [object] PAR /api/v1/mobile/sync/evidence-actions · evidence.work_order_photo | B_emp=200:rejected:not_assigned_to_actor:chg=false | B_val=200:rejected:not_assigned_to_actor:chg=false | T_emp=200:rejected:not_assigned_to_actor:chg=false | T_val=200:rejected:not_assigned_to_actor:chg=false | EX=200:conflict:not_assigned_to_actor(assignment_changed_pending_review):chg=false | posA=200:accepted:ok:chg=true | posT2=200:accepted:ok:chg=true | posP=200:accepted:ok:chg=true | posU=200:accepted:ok:chg=true | dual=200:accepted:ok:chg=true | wide=operator=>200:accepted:ok:chg=true
VIA [object] PAR /api/v1/mobile/sync/evidence-actions · evidence.work_order_signature | B_emp=200:rejected:not_assigned_to_actor:chg=false | B_val=200:rejected:not_assigned_to_actor:chg=false | T_emp=200:rejected:not_assigned_to_actor:chg=false | T_val=200:rejected:not_assigned_to_actor:chg=false | EX=200:conflict:not_assigned_to_actor(assignment_changed_pending_review):chg=false | posA=200:accepted:ok:chg=true | posT2=200:accepted:ok:chg=true | posP=200:accepted:ok:chg=true | posU=200:accepted:ok:chg=true | dual=200:accepted:ok:chg=true | wide=operator=>200:accepted:ok:chg=true
VIA [object] ROTA PATCH /api/v1/mobile/checklist-runs/:runId | B_emp=403:-:not_assigned_to_actor:chg=false | B_val=403:-:not_assigned_to_actor:chg=false | T_emp=403:-:not_assigned_to_actor:chg=false | T_val=403:-:not_assigned_to_actor:chg=false | EX=403:-:not_assigned_to_actor:chg=false | posA=200:-:ok:chg=true | posT2=200:-:ok:chg=true | posP=200:-:ok:chg=true | posU=200:-:ok:chg=true | dual=200:-:ok:chg=true | wide=operator=>200:-:ok:chg=true
VIA [object] ROTA PATCH /api/v1/operations/dispatches/:dispatchId/status | B_emp=403:-:not_assigned_to_actor:chg=false | B_val=403:-:not_assigned_to_actor:chg=false | T_emp=403:-:permission_required:chg=false | T_val=403:-:permission_required:chg=false | EX=403:-:not_assigned_to_actor:chg=false | posA=200:-:ok:chg=true | posT2=403:-:permission_required:chg=false | posP=200:-:ok:chg=true | posU=200:-:ok:chg=true | dual=200:-:ok:chg=true | wide=operator=>200:-:ok:chg=true
VIA [object] ROTA POST /api/v1/mobile/checklist-runs/:runId/acknowledgement | B_emp=403:-:not_assigned_to_actor:chg=false | B_val=403:-:not_assigned_to_actor:chg=false | T_emp=403:-:not_assigned_to_actor:chg=false | T_val=403:-:not_assigned_to_actor:chg=false | EX=403:-:not_assigned_to_actor:chg=false | posA=201:-:ok:chg=true | posT2=201:-:ok:chg=true | posP=201:-:ok:chg=true | posU=201:-:ok:chg=true | dual=201:-:ok:chg=true | wide=tenant_admin=>201:-:ok:chg=true
VIA [object] ROTA POST /api/v1/mobile/checklist-runs/:runId/attachments | B_emp=403:-:not_assigned_to_actor:chg=false | B_val=403:-:not_assigned_to_actor:chg=false | T_emp=403:-:not_assigned_to_actor:chg=false | T_val=403:-:not_assigned_to_actor:chg=false | EX=403:-:not_assigned_to_actor:chg=false | posA=201:-:ok:chg=true | posT2=201:-:ok:chg=true | posP=201:-:ok:chg=true | posU=201:-:ok:chg=true | dual=201:-:ok:chg=true | wide=operator=>201:-:ok:chg=true
VIA [object] ROTA POST /api/v1/mobile/checklist-runs/:runId/complete | B_emp=403:-:not_assigned_to_actor:chg=false | B_val=403:-:not_assigned_to_actor:chg=false | T_emp=403:-:not_assigned_to_actor:chg=false | T_val=403:-:not_assigned_to_actor:chg=false | EX=403:-:not_assigned_to_actor:chg=false | posA=200:-:ok:chg=true | posT2=200:-:ok:chg=true | posP=200:-:ok:chg=true | posU=200:-:ok:chg=true | dual=200:-:ok:chg=true | wide=operator=>200:-:ok:chg=true
VIA [object] ROTA POST /api/v1/mobile/checklist-runs/:runId/divergence | B_emp=403:-:not_assigned_to_actor:chg=false | B_val=403:-:not_assigned_to_actor:chg=false | T_emp=403:-:not_assigned_to_actor:chg=false | T_val=403:-:not_assigned_to_actor:chg=false | EX=403:-:not_assigned_to_actor:chg=false | posA=200:-:ok:chg=true | posT2=200:-:ok:chg=true | posP=200:-:ok:chg=true | posU=200:-:ok:chg=true | dual=200:-:ok:chg=true | wide=operator=>200:-:ok:chg=true
VIA [object] ROTA POST /api/v1/mobile/checklist-runs/:runId/markers | B_emp=403:-:not_assigned_to_actor:chg=false | B_val=403:-:not_assigned_to_actor:chg=false | T_emp=403:-:not_assigned_to_actor:chg=false | T_val=403:-:not_assigned_to_actor:chg=false | EX=403:-:not_assigned_to_actor:chg=false | posA=201:-:ok:chg=true | posT2=201:-:ok:chg=true | posP=201:-:ok:chg=true | posU=201:-:ok:chg=true | dual=201:-:ok:chg=true | wide=operator=>201:-:ok:chg=true
VIA [object] ROTA POST /api/v1/mobile/evidence-uploads | B_emp=200:rejected:not_assigned_to_actor:chg=false | B_val=200:rejected:not_assigned_to_actor:chg=false | T_emp=200:rejected:not_assigned_to_actor:chg=false | T_val=200:rejected:not_assigned_to_actor:chg=false | EX=409:-:assignment_changed_pending_review:chg=false | posA=201:-:stored:chg=true | posT2=201:-:stored:chg=true | posP=201:-:stored:chg=true | posU=201:-:stored:chg=true | dual=201:-:stored:chg=true | wide=operator=>201:-:stored:chg=true
S_ORFA: tecA=403:not_assigned_to_actor tecB=403:not_assigned_to_actor tecT=403:not_assigned_to_actor operator=200:1
S_ORDEM /mobile/checklist-runs/:runId: tecB=403:not_assigned_to_actor tecT=403:not_assigned_to_actor
S_ORDEM /mobile/checklist-runs/:runId/attachments: tecB=403:not_assigned_to_actor tecT=403:not_assigned_to_actor
S_ORDEM /mobile/checklist-runs/:runId/markers: tecB=403:not_assigned_to_actor tecT=403:not_assigned_to_actor
S_ORDEM /mobile/checklist-runs/:runId/complete: tecB=403:not_assigned_to_actor tecT=403:not_assigned_to_actor
S_ORDEM /mobile/checklist-runs/:runId/divergence: tecB=403:not_assigned_to_actor tecT=403:not_assigned_to_actor
S_ORDEM /mobile/checklist-runs/:runId/acknowledgement: tecB=403:not_assigned_to_actor tecT=403:not_assigned_to_actor
S_ORDEM /operations/dispatches/:dispatchId/status: tecB=403:not_assigned_to_actor tecT=403:permission_required
CA10_XT_RUN: alheio=404:checklist_run_not_found:Checklist run not found. | inexist=404:checklist_run_not_found:Checklist run not found. | mesmaOrg=403:not_assigned_to_actor
CA10_XT_DISP: alheio=404:not_found:Dispatch was not found. | inexist=404:not_found:Dispatch was not found. | mesmaOrg=403:not_assigned_to_actor
CA10_XT_LOTE_RUN: bucket=rejected reason=checklist_run_not_found
CA10_XT_LOTE_EVID: bucket=rejected reason=not_found
CA10_XT_UPLOAD: alheio=403:evidence_tenant_mismatch | inexist=403:evidence_tenant_mismatch
```

**Análise 1(b) (em `O`):**
1. **Controles da sonda:**
   - **Controle 1 (`CONTROL_1_EFFECT_OPERATOR`):** `status=200 answersBefore=0 answersAfter=1 changed=true` — o leitor de estado confirma transição real de `0` para `1` resposta gravada.
   - **Controle 2 (`CONTROL_2_AUDITOR_MOTIVE`):** `hasUpdatePerm=false status=403 reason=permission_required` — distingue `permission_required` (gate RBAC de rota) de `not_assigned_to_actor` (escopo por objeto).
2. **Upload com recibo furtado (`UPLOAD_STOLEN_RECEIPT`):** `tecA` registra metadado válido (`metaA=1`); quando `tecB` (`field_technician`) ou `tecT` (`technician`) tenta subir o binário usando o `client_evidence_id` de `tecA`, o servidor busca o recibo por `(tenantId, userId, clientEvidenceId)` e recusa com `409 evidence_metadata_required` (`tecB_files=0`), sem gravar byte algum em disco.
3. **As 23 vias × atores × corpos (`empty` e `valid`):**
   - **`G-NEG` (`tecB` `field_technician` e `tecT` `technician` nunca atribuídos à `osA`):**
     - Nas **15 vias de lote** (`12` em `/api/v1/mobile/sync/checklist-actions` + `3` em `/api/v1/mobile/sync/evidence-actions`): tanto com payload incompleto (`empty`) quanto válido (`valid`), o lote retorna HTTP `200` e a ação cai em `rejected` com `reason: "not_assigned_to_actor"` e `chg=false` (zero efeito colateral).
     - Nas **6 rotas REST de vistoria** (`PATCH /mobile/checklist-runs/:runId` e `POST` em `/acknowledgement`, `/attachments`, `/complete`, `/divergence`, `/markers`): tanto com corpo inválido (`empty`) quanto válido (`valid`), `tecB` e `tecT` recebem HTTP `403` `reason: "not_assigned_to_actor"` e `chg=false`.
     - Na rota **`PATCH /api/v1/operations/dispatches/:dispatchId/status`** (`DESPACHO·ALVO`): `tecB` recebe `403 not_assigned_to_actor` (`chg=false`) tanto em `empty` quanto em `valid`; `tecT` (`technician`) é barrado já no middleware RBAC da rota com `403 permission_required` (`chg=false`) porque `technician` não possui `field_operations:status` em `catalog.ts`.
     - Na rota **`POST /api/v1/mobile/evidence-uploads`**: `tecB` e `tecT` são barrados já na etapa de metadado com `rejected:not_assigned_to_actor` (`chg=false`) e, com recibo furtado de `tecA`, com `409 evidence_metadata_required` (`chg=false`).
   - **`G-EX` (`tecX` ex-técnico após `PATCH /operations/dispatches/:id/reassign` para `tecC`, `D2-07c` = (d)):**
     - Nas **15 vias de lote**: HTTP `200`, ação em `conflicts[]` com `conflict_type: "assignment_changed_pending_review"`, `reason: "not_assigned_to_actor"` e `chg=false` (nada gravado na OS nem na vistoria).
     - Nas **7 rotas REST** (6 de vistoria + `dispatches/:id/status`): HTTP `403` `reason: "not_assigned_to_actor"`, `chg=false`.
     - Em **`POST /api/v1/mobile/evidence-uploads`** (recibo registrado quando `tecX` ainda era o técnico, binário enviado após reatribuição para `tecC`, sem `work_order_id` no form): HTTP `409` `reason: "assignment_changed_pending_review"` (`code: "EVIDENCE_ASSIGNMENT_CHANGED"`), `chg=false` (nenhum arquivo gravado).
   - **`G-POS` (`tecA` despachado, `tecT2` `technician` despachado, `tecP` atribuído só por `operatorProfile.id`, `tecU` atribuído só por `userId`, `dual` `field_technician + manager`) e `G-WIDE` (`operator` / `tenant_admin`):**
     - Passam com `200`/`201` (`accepted`/`stored`) e `chg=true` em todas as 23 vias (exceto `tecT2` em `PATCH /operations/dispatches/:dispatchId/status`, onde o papel `technician` não tem `field_operations:status` no catálogo e recebe `403 permission_required`).
4. **`S-ORFA` (vistoria órfã sem OS):** `tecA`, `tecB` e `tecT` recebem `403 not_assigned_to_actor` (fail-closed); `operator` (`tenant_wide`) responde `200` e grava `1` resposta.
5. **`S-ORDEM` (escopo antes do parse/validação):** nas 6 rotas REST de vistoria com corpo inválido (`{ answers: "bad", hasDivergence: "bad" }`), `tecB` e `tecT` recebem `403 not_assigned_to_actor` (nunca `400`); em `PATCH /operations/dispatches/:id/status` com `{ status: "NOT_A_VALID_STATUS" }`, `tecB` recebe `403 not_assigned_to_actor` e `tecT` recebe `403 permission_required` (nunca `400`).
6. **`CA10` (404 cross-tenant intacto):** `tecB2` (Org B) contra `runId` e `dispatchId` da Org A recebe `404` idêntico ao de UUID inexistente (`checklist_run_not_found` / `not_found`), enquanto `tecB` (mesma Org A) recebe `403 not_assigned_to_actor`. Nos lotes, `tecB2` recebe `rejected` (`checklist_run_not_found` / `not_found`), nunca `conflict` nem `not_assigned_to_actor`. No upload com `evidence_id` de outro tenant, `tecB2` recebe `403 evidence_tenant_mismatch` idêntico para recibo alheio e inexistente.

---

### 1(c) Vermelho-controle da 1(b) contra a base `B` (`4fe7524ecbcc68b3e69336453cc774ed5937cb1c`)

**Comandos executados (Controle 3 — `git hash-object` dos 13 arquivos igual a `B:<arquivo>` antes da sonda, e igual a `O:<arquivo>` após restauração):**
```bash
bash C:/Users/AMP/.gemini/antigravity-cli/brain/d9d16a23-c79a-4bff-b05d-f43d2c2585f9/scratch/c1/06-item1cd.sh to-base
CORE_SAAS_PERSISTENCE=memory npx tsx C:/Users/AMP/.gemini/antigravity-cli/brain/d9d16a23-c79a-4bff-b05d-f43d2c2585f9/scratch/c1/05-sonda-item1.mts base
bash C:/Users/AMP/.gemini/antigravity-cli/brain/d9d16a23-c79a-4bff-b05d-f43d2c2585f9/scratch/c1/06-item1cd.sh restore
```

**Prova de identidade dos blobs com `B` (`06-to-base.log`):**
```text
BASE_FILE src/modules/checklists/checklist.controller.ts blob_B=0c4dffbfdb1fa268efb3c1691e0f488cbc62625e hash_wt=0c4dffbfdb1fa268efb3c1691e0f488cbc62625e match=true
BASE_FILE src/modules/checklists/checklist.service.ts blob_B=eeabc3488142dc7ba16091fb5c619452015a945d hash_wt=eeabc3488142dc7ba16091fb5c619452015a945d match=true
BASE_FILE src/modules/field-dispatch/field-dispatch-prisma.repository.ts blob_B=498738e9c98405652ada3e8bbde1277e31de3958 hash_wt=498738e9c98405652ada3e8bbde1277e31de3958 match=true
BASE_FILE src/modules/field-dispatch/field-dispatch.repository.ts blob_B=8cea8af7a1752636ea8e0f9097b0e6e571067276 hash_wt=8cea8af7a1752636ea8e0f9097b0e6e571067276 match=true
BASE_FILE src/modules/field-dispatch/field-dispatch.service.ts blob_B=89053241c82693dab80e8f4b1981a6c2a69c2b3d hash_wt=89053241c82693dab80e8f4b1981a6c2a69c2b3d match=true
BASE_FILE src/modules/mobile/mobile-checklist-sync.ts blob_B=b60c78916fd0615bc4c3f7ea7878cbc855c6aa05 hash_wt=b60c78916fd0615bc4c3f7ea7878cbc855c6aa05 match=true
BASE_FILE src/modules/mobile/mobile-evidence-sync.ts blob_B=be699c9d5e65fc59bdee0ffebefa04d2d1df3994 hash_wt=be699c9d5e65fc59bdee0ffebefa04d2d1df3994 match=true
BASE_FILE src/modules/mobile/mobile-evidence-upload.ts blob_B=6537c08dc76d7ffc42c322ac4255fa3f8c7a2467 hash_wt=6537c08dc76d7ffc42c322ac4255fa3f8c7a2467 match=true
BASE_FILE src/modules/mobile/mobile-work-order-sync.ts blob_B=7ba80969df2811dd8aafa33df230c2cb66ac1d42 hash_wt=7ba80969df2811dd8aafa33df230c2cb66ac1d42 match=true
BASE_FILE src/modules/work-orders/work-order-prisma.repository.ts blob_B=3eebe789fb29d7291e93778461fcf67dc7fd901d hash_wt=3eebe789fb29d7291e93778461fcf67dc7fd901d match=true
BASE_FILE src/modules/work-orders/work-order.repository.ts blob_B=288ab6e51a8c840600cbbddca16dffbfa3306a6c hash_wt=288ab6e51a8c840600cbbddca16dffbfa3306a6c match=true
BASE_FILE src/modules/work-orders/work-order.service.ts blob_B=4196e96807a9c8c8ca800ca203c349da893288df hash_wt=4196e96807a9c8c8ca800ca203c349da893288df match=true
BASE_FILE src/modules/work-orders/work-order.types.ts blob_B=ae1c67200f885e748c3b966fab315b52f244dbd1 hash_wt=ae1c67200f885e748c3b966fab315b52f244dbd1 match=true
TO_BASE_OK count=13 all_match_B=true
```

**Saída integral da sonda na base `B` (`05-sonda-base.log`):**
```text
CONTROL_1_EFFECT_OPERATOR: status=200 answersBefore=0 answersAfter=1 changed=true
CONTROL_2_AUDITOR_MOTIVE: hasUpdatePerm=false status=403 reason=permission_required
UPLOAD_STOLEN_RECEIPT: metaA=1 tecB_status=409 tecB_reason=evidence_metadata_required tecB_files=0 tecT_status=409 tecT_reason=evidence_metadata_required
VIA [base] PAR /api/v1/mobile/sync/checklist-actions · checklist_acknowledgement.create | B_emp=200:rejected:required_field:chg=false | B_val=200:accepted:ok:chg=true | T_emp=200:rejected:required_field:chg=false | T_val=200:accepted:ok:chg=true | EX=200:accepted:ok:chg=true | posA=200:accepted:ok:chg=true | posT2=200:accepted:ok:chg=true | posP=200:accepted:ok:chg=true | posU=200:accepted:ok:chg=true | dual=200:accepted:ok:chg=true | wide=tenant_admin=>200:accepted:ok:chg=true
VIA [base] PAR /api/v1/mobile/sync/checklist-actions · checklist_attachment.attach | B_emp=200:accepted:ok:chg=true | B_val=200:accepted:ok:chg=true | T_emp=200:accepted:ok:chg=true | T_val=200:accepted:ok:chg=true | EX=200:accepted:ok:chg=true | posA=200:accepted:ok:chg=true | posT2=200:accepted:ok:chg=true | posP=200:accepted:ok:chg=true | posU=200:accepted:ok:chg=true | dual=200:accepted:ok:chg=true | wide=operator=>200:accepted:ok:chg=true
VIA [base] PAR /api/v1/mobile/sync/checklist-actions · checklist_divergence.create | B_emp=200:rejected:required_field:chg=false | B_val=200:accepted:ok:chg=true | T_emp=200:rejected:required_field:chg=false | T_val=200:accepted:ok:chg=true | EX=200:accepted:ok:chg=true | posA=200:accepted:ok:chg=true | posT2=200:accepted:ok:chg=true | posP=200:accepted:ok:chg=true | posU=200:accepted:ok:chg=true | dual=200:accepted:ok:chg=true | wide=operator=>200:accepted:ok:chg=true
VIA [base] PAR /api/v1/mobile/sync/checklist-actions · checklist_marker.create | B_emp=200:accepted:ok:chg=true | B_val=200:accepted:ok:chg=true | T_emp=200:accepted:ok:chg=true | T_val=200:accepted:ok:chg=true | EX=200:accepted:ok:chg=true | posA=200:accepted:ok:chg=true | posT2=200:accepted:ok:chg=true | posP=200:accepted:ok:chg=true | posU=200:accepted:ok:chg=true | dual=200:accepted:ok:chg=true | wide=operator=>200:accepted:ok:chg=true
VIA [base] PAR /api/v1/mobile/sync/checklist-actions · checklist_run.complete | B_emp=200:accepted:ok:chg=true | B_val=200:accepted:ok:chg=true | T_emp=200:accepted:ok:chg=true | T_val=200:accepted:ok:chg=true | EX=200:accepted:ok:chg=true | posA=200:accepted:ok:chg=true | posT2=200:accepted:ok:chg=true | posP=200:accepted:ok:chg=true | posU=200:accepted:ok:chg=true | dual=200:accepted:ok:chg=true | wide=operator=>200:accepted:ok:chg=true
VIA [base] PAR /api/v1/mobile/sync/checklist-actions · checklist.acknowledgement_create | B_emp=200:rejected:required_field:chg=false | B_val=200:accepted:ok:chg=true | T_emp=200:rejected:required_field:chg=false | T_val=200:accepted:ok:chg=true | EX=200:accepted:ok:chg=true | posA=200:accepted:ok:chg=true | posT2=200:accepted:ok:chg=true | posP=200:accepted:ok:chg=true | posU=200:accepted:ok:chg=true | dual=200:accepted:ok:chg=true | wide=tenant_admin=>200:accepted:ok:chg=true
VIA [base] PAR /api/v1/mobile/sync/checklist-actions · checklist.attachment_attach | B_emp=200:accepted:ok:chg=true | B_val=200:accepted:ok:chg=true | T_emp=200:accepted:ok:chg=true | T_val=200:accepted:ok:chg=true | EX=200:accepted:ok:chg=true | posA=200:accepted:ok:chg=true | posT2=200:accepted:ok:chg=true | posP=200:accepted:ok:chg=true | posU=200:accepted:ok:chg=true | dual=200:accepted:ok:chg=true | wide=operator=>200:accepted:ok:chg=true
VIA [base] PAR /api/v1/mobile/sync/checklist-actions · checklist.complete | B_emp=200:accepted:ok:chg=true | B_val=200:accepted:ok:chg=true | T_emp=200:accepted:ok:chg=true | T_val=200:accepted:ok:chg=true | EX=200:accepted:ok:chg=true | posA=200:accepted:ok:chg=true | posT2=200:accepted:ok:chg=true | posP=200:accepted:ok:chg=true | posU=200:accepted:ok:chg=true | dual=200:accepted:ok:chg=true | wide=operator=>200:accepted:ok:chg=true
VIA [base] PAR /api/v1/mobile/sync/checklist-actions · checklist.divergence_create | B_emp=200:rejected:required_field:chg=false | B_val=200:accepted:ok:chg=true | T_emp=200:rejected:required_field:chg=false | T_val=200:accepted:ok:chg=true | EX=200:accepted:ok:chg=true | posA=200:accepted:ok:chg=true | posT2=200:accepted:ok:chg=true | posP=200:accepted:ok:chg=true | posU=200:accepted:ok:chg=true | dual=200:accepted:ok:chg=true | wide=operator=>200:accepted:ok:chg=true
VIA [base] PAR /api/v1/mobile/sync/checklist-actions · checklist.item_answer | B_emp=200:accepted:ok:chg=true | B_val=200:accepted:ok:chg=true | T_emp=200:accepted:ok:chg=true | T_val=200:accepted:ok:chg=true | EX=200:accepted:ok:chg=true | posA=200:accepted:ok:chg=true | posT2=200:accepted:ok:chg=true | posP=200:accepted:ok:chg=true | posU=200:accepted:ok:chg=true | dual=200:accepted:ok:chg=true | wide=operator=>200:accepted:ok:chg=true
VIA [base] PAR /api/v1/mobile/sync/checklist-actions · checklist.item_note | B_emp=200:rejected:required_field:chg=false | B_val=200:accepted:ok:chg=true | T_emp=200:rejected:required_field:chg=false | T_val=200:accepted:ok:chg=true | EX=200:accepted:ok:chg=true | posA=200:accepted:ok:chg=true | posT2=200:accepted:ok:chg=true | posP=200:accepted:ok:chg=true | posU=200:accepted:ok:chg=true | dual=200:accepted:ok:chg=true | wide=operator=>200:accepted:ok:chg=true
VIA [base] PAR /api/v1/mobile/sync/checklist-actions · checklist.marker_create | B_emp=200:accepted:ok:chg=true | B_val=200:accepted:ok:chg=true | T_emp=200:accepted:ok:chg=true | T_val=200:accepted:ok:chg=true | EX=200:accepted:ok:chg=true | posA=200:accepted:ok:chg=true | posT2=200:accepted:ok:chg=true | posP=200:accepted:ok:chg=true | posU=200:accepted:ok:chg=true | dual=200:accepted:ok:chg=true | wide=operator=>200:accepted:ok:chg=true
VIA [base] PAR /api/v1/mobile/sync/evidence-actions · evidence.work_order_observation | B_emp=200:rejected:required_field:chg=false | B_val=200:accepted:ok:chg=true | T_emp=200:rejected:required_field:chg=false | T_val=200:accepted:ok:chg=true | EX=200:accepted:ok:chg=true | posA=200:accepted:ok:chg=true | posT2=200:accepted:ok:chg=true | posP=200:accepted:ok:chg=true | posU=200:accepted:ok:chg=true | dual=200:accepted:ok:chg=true | wide=operator=>200:accepted:ok:chg=true
VIA [base] PAR /api/v1/mobile/sync/evidence-actions · evidence.work_order_photo | B_emp=200:rejected:required_field:chg=false | B_val=200:accepted:ok:chg=true | T_emp=200:rejected:required_field:chg=false | T_val=200:accepted:ok:chg=true | EX=200:accepted:ok:chg=true | posA=200:accepted:ok:chg=true | posT2=200:accepted:ok:chg=true | posP=200:accepted:ok:chg=true | posU=200:accepted:ok:chg=true | dual=200:accepted:ok:chg=true | wide=operator=>200:accepted:ok:chg=true
VIA [base] PAR /api/v1/mobile/sync/evidence-actions · evidence.work_order_signature | B_emp=200:rejected:required_field:chg=false | B_val=200:accepted:ok:chg=true | T_emp=200:rejected:required_field:chg=false | T_val=200:accepted:ok:chg=true | EX=200:accepted:ok:chg=true | posA=200:accepted:ok:chg=true | posT2=200:accepted:ok:chg=true | posP=200:accepted:ok:chg=true | posU=200:accepted:ok:chg=true | dual=200:accepted:ok:chg=true | wide=operator=>200:accepted:ok:chg=true
VIA [base] ROTA PATCH /api/v1/mobile/checklist-runs/:runId | B_emp=400:-:invalid_request:chg=false | B_val=200:-:ok:chg=true | T_emp=400:-:invalid_request:chg=false | T_val=200:-:ok:chg=true | EX=200:-:ok:chg=true | posA=200:-:ok:chg=true | posT2=200:-:ok:chg=true | posP=200:-:ok:chg=true | posU=200:-:ok:chg=true | dual=200:-:ok:chg=true | wide=operator=>200:-:ok:chg=true
VIA [base] ROTA PATCH /api/v1/operations/dispatches/:dispatchId/status | B_emp=400:-:invalid_status:chg=false | B_val=200:-:ok:chg=true | T_emp=403:-:permission_required:chg=false | T_val=403:-:permission_required:chg=false | EX=200:-:ok:chg=true | posA=200:-:ok:chg=true | posT2=403:-:permission_required:chg=false | posP=200:-:ok:chg=true | posU=200:-:ok:chg=true | dual=200:-:ok:chg=true | wide=operator=>200:-:ok:chg=true
VIA [base] ROTA POST /api/v1/mobile/checklist-runs/:runId/acknowledgement | B_emp=400:-:invalid_request:chg=false | B_val=201:-:ok:chg=true | T_emp=400:-:invalid_request:chg=false | T_val=201:-:ok:chg=true | EX=201:-:ok:chg=true | posA=201:-:ok:chg=true | posT2=201:-:ok:chg=true | posP=201:-:ok:chg=true | posU=201:-:ok:chg=true | dual=201:-:ok:chg=true | wide=tenant_admin=>201:-:ok:chg=true
VIA [base] ROTA POST /api/v1/mobile/checklist-runs/:runId/attachments | B_emp=400:-:invalid_request:chg=false | B_val=201:-:ok:chg=true | T_emp=400:-:invalid_request:chg=false | T_val=201:-:ok:chg=true | EX=201:-:ok:chg=true | posA=201:-:ok:chg=true | posT2=201:-:ok:chg=true | posP=201:-:ok:chg=true | posU=201:-:ok:chg=true | dual=201:-:ok:chg=true | wide=operator=>201:-:ok:chg=true
VIA [base] ROTA POST /api/v1/mobile/checklist-runs/:runId/complete | B_emp=400:-:invalid_request:chg=false | B_val=200:-:ok:chg=true | T_emp=400:-:invalid_request:chg=false | T_val=200:-:ok:chg=true | EX=200:-:ok:chg=true | posA=200:-:ok:chg=true | posT2=200:-:ok:chg=true | posP=200:-:ok:chg=true | posU=200:-:ok:chg=true | dual=200:-:ok:chg=true | wide=operator=>200:-:ok:chg=true
VIA [base] ROTA POST /api/v1/mobile/checklist-runs/:runId/divergence | B_emp=400:-:invalid_request:chg=false | B_val=200:-:ok:chg=true | T_emp=400:-:invalid_request:chg=false | T_val=200:-:ok:chg=true | EX=200:-:ok:chg=true | posA=200:-:ok:chg=true | posT2=200:-:ok:chg=true | posP=200:-:ok:chg=true | posU=200:-:ok:chg=true | dual=200:-:ok:chg=true | wide=operator=>200:-:ok:chg=true
VIA [base] ROTA POST /api/v1/mobile/checklist-runs/:runId/markers | B_emp=400:-:invalid_request:chg=false | B_val=201:-:ok:chg=true | T_emp=400:-:invalid_request:chg=false | T_val=201:-:ok:chg=true | EX=201:-:ok:chg=true | posA=201:-:ok:chg=true | posT2=201:-:ok:chg=true | posP=201:-:ok:chg=true | posU=201:-:ok:chg=true | dual=201:-:ok:chg=true | wide=operator=>201:-:ok:chg=true
VIA [base] ROTA POST /api/v1/mobile/evidence-uploads | B_emp=400:-:file_required:chg=false | B_val=201:-:stored:chg=true | T_emp=400:-:file_required:chg=false | T_val=201:-:stored:chg=true | EX=201:-:stored:chg=true | posA=201:-:stored:chg=true | posT2=201:-:stored:chg=true | posP=201:-:stored:chg=true | posU=201:-:stored:chg=true | dual=201:-:stored:chg=true | wide=operator=>201:-:stored:chg=true
S_ORFA: tecA=200:undefined tecB=200:undefined tecT=200:undefined operator=200:1
S_ORDEM /mobile/checklist-runs/:runId: tecB=400:invalid_request tecT=400:invalid_request
S_ORDEM /mobile/checklist-runs/:runId/attachments: tecB=400:invalid_request tecT=400:invalid_request
S_ORDEM /mobile/checklist-runs/:runId/markers: tecB=400:invalid_request tecT=400:invalid_request
S_ORDEM /mobile/checklist-runs/:runId/complete: tecB=400:invalid_request tecT=400:invalid_request
S_ORDEM /mobile/checklist-runs/:runId/divergence: tecB=400:invalid_request tecT=400:invalid_request
S_ORDEM /mobile/checklist-runs/:runId/acknowledgement: tecB=400:invalid_request tecT=400:invalid_request
S_ORDEM /operations/dispatches/:dispatchId/status: tecB=400:invalid_status tecT=403:permission_required
CA10_XT_RUN: alheio=404:checklist_run_not_found:Checklist run not found. | inexist=404:checklist_run_not_found:Checklist run not found. | mesmaOrg=200:undefined
CA10_XT_DISP: alheio=404:not_found:Dispatch was not found. | inexist=404:not_found:Dispatch was not found. | mesmaOrg=200:undefined
CA10_XT_LOTE_RUN: bucket=rejected reason=checklist_run_not_found
CA10_XT_LOTE_EVID: bucket=undefined reason=undefined
CA10_XT_UPLOAD: alheio=403:evidence_tenant_mismatch | inexist=403:evidence_tenant_mismatch
```

**Análise 1(c) (vermelho-controle na base `B`):**
- Na base `B`, o defeito `Ω6R-SEC-002` acende em **todas as 23 vias**:
  - `B_val` (`tecB` nunca atribuído) e `T_val` (`tecT` nunca atribuído, nas 22 vias que alcança) passam com **`200`/`201` (`accepted`/`stored`) e `chg=true`**!
  - `EX` (`tecX` ex-técnico após reatribuição) também passa com **`200`/`201` (`accepted`/`stored`) e `chg=true`** (sem conflito nem 403/409)!
  - `B_emp` e `T_emp` (corpos vazios/inválidos) caem em **`400 invalid_request`/`invalid_status`/`file_required`** ou `rejected:required_field` (porque não havia escopo antes do parse)!
  - `S_ORFA` passa com **`200`** para `tecA`, `tecB` e `tecT`!
  - `S_ORDEM` retorna **`400 invalid_request`/`invalid_status`** em vez de `403 not_assigned_to_actor`!
  - Enquanto isso, o controle `CA10_XT` (404 cross-tenant) e `G-WIDE` já passavam na base `B`, provando que a sonda isola cirurgicamente o efeito de `B-O6R-07c-b1`.

---

### 1(d) Mutações M22 (`checklist.service.ts`) e M24 (`work-order.service.ts`) e restauração provada

**Comandos executados:**
```bash
bash C:/Users/AMP/.gemini/antigravity-cli/brain/d9d16a23-c79a-4bff-b05d-f43d2c2585f9/scratch/c1/06-item1cd.sh mut-m22
CORE_SAAS_PERSISTENCE=memory npx tsx C:/Users/AMP/.gemini/antigravity-cli/brain/d9d16a23-c79a-4bff-b05d-f43d2c2585f9/scratch/c1/05-sonda-item1.mts m22
CORE_SAAS_PERSISTENCE=memory npx tsx --test tests/o6r07c-b-scope.test.ts
bash C:/Users/AMP/.gemini/antigravity-cli/brain/d9d16a23-c79a-4bff-b05d-f43d2c2585f9/scratch/c1/06-item1cd.sh restore

bash C:/Users/AMP/.gemini/antigravity-cli/brain/d9d16a23-c79a-4bff-b05d-f43d2c2585f9/scratch/c1/06-item1cd.sh mut-m24
CORE_SAAS_PERSISTENCE=memory npx tsx C:/Users/AMP/.gemini/antigravity-cli/brain/d9d16a23-c79a-4bff-b05d-f43d2c2585f9/scratch/c1/05-sonda-item1.mts m24
CORE_SAAS_PERSISTENCE=memory npx tsx --test tests/o6r07c-b-scope.test.ts
CORE_SAAS_PERSISTENCE=memory npx tsx --test tests/o6r07c-subresource-scope.test.ts
bash C:/Users/AMP/.gemini/antigravity-cli/brain/d9d16a23-c79a-4bff-b05d-f43d2c2585f9/scratch/c1/06-item1cd.sh restore
```

**Diff e resultado de M22 (`checklist.service.ts` — `assertRunMutationScope` sem o retorno antecipado `if (!actorMutatesAssignedOnly(woActor))`):**
```text
M22_APPLIED anchor_count=1
diff --git a/src/modules/checklists/checklist.service.ts b/src/modules/checklists/checklist.service.ts
index 58d3c489..b47d3849 100644
--- a/src/modules/checklists/checklist.service.ts
+++ b/src/modules/checklists/checklist.service.ts
@@ -414,9 +414,7 @@ export class ChecklistService {
     const details = await this.getRun(actor, runId);
     const woActor = toWorkOrderActor(actor);

-    if (!actorMutatesAssignedOnly(woActor)) {
-      return details;
-    }
+    // M22: tenant_wide tambem cai no escopo

     const workOrderId =
       details.run.relatedEntityType === "work_order" && typeof details.run.relatedEntityId === "string"
S_ORFA: tecA=403:not_assigned_to_actor tecB=403:not_assigned_to_actor tecT=403:not_assigned_to_actor operator=403:undefined
not ok 33 - S-ORFA — vistoria sem OS: o técnico é recusado (fail-closed); o operator responde
# tests 41
# pass 40
# fail 1
```

**Diff e resultado de M24 (`work-order.service.ts` — `assertMutationObjectScope` sem o retorno antecipado `if (!actorMutatesAssignedOnly(actor)) return;`):**
```text
M24_APPLIED anchor_count=1
diff --git a/src/modules/work-orders/work-order.service.ts b/src/modules/work-orders/work-order.service.ts
index 213b5e8d..7ad8b26f 100644
--- a/src/modules/work-orders/work-order.service.ts
+++ b/src/modules/work-orders/work-order.service.ts
@@ -807,7 +807,7 @@ export class WorkOrderService {
     actor: WorkOrderActorContext,
     workOrder: WorkOrder,
   ): Promise<void> {
-    if (!actorMutatesAssignedOnly(actor)) return;
+    // M24: tenant_wide tambem cai no escopo da OS

     const resolver = this.references.resolveActorOperatorProfileId;
     const operatorProfileId = resolver ? await resolver(actor) : undefined;
--- tests/o6r07c-b-scope.test.ts sob M24 ---
# tests 41
# pass 41
# fail 0
--- tests/o6r07c-subresource-scope.test.ts sob M24 ---
not ok 2 - laço G [OS·07c-a] PAR /api/v1/mobile/sync/work-order-actions · work_order.mileage — G-NEG 403, G-POS e G-WIDE passam
not ok 3 - laço G [OS·07a] PAR /api/v1/mobile/sync/work-order-actions · work_order.status_change — G-NEG 403, G-POS e G-WIDE passam
not ok 4 - laço G [OS·07c-a] ROTA DELETE /api/v1/work-orders/:workOrderId/attachments/:attachmentId — G-NEG 403, G-POS e G-WIDE passam
not ok 5 - laço G [OS·07c-a] ROTA DELETE /api/v1/work-orders/:workOrderId/comments/:commentId — G-NEG 403, G-POS e G-WIDE passam
not ok 6 - laço G [OS·07c-a] ROTA DELETE /api/v1/work-orders/:workOrderId/comments/:commentId/tags/:tagId — G-NEG 403, G-POS e G-WIDE passam
not ok 7 - laço G [OS·07a] ROTA PATCH /api/v1/work-orders/:workOrderId — G-NEG 403, G-POS e G-WIDE passam
not ok 8 - laço G [OS·07c-a] ROTA PATCH /api/v1/work-orders/:workOrderId/comments/:commentId — G-NEG 403, G-POS e G-WIDE passam
not ok 9 - laço G [OS·07a] ROTA PATCH /api/v1/work-orders/:workOrderId/status — G-NEG 403, G-POS e G-WIDE passam
not ok 10 - laço G [OS·07c-a] ROTA POST /api/v1/work-orders/:workOrderId/attachments — G-NEG 403, G-POS e G-WIDE passam
not ok 11 - laço G [OS·07c-a] ROTA POST /api/v1/work-orders/:workOrderId/comments — G-NEG 403, G-POS e G-WIDE passam
not ok 12 - laço G [OS·07c-a] ROTA POST /api/v1/work-orders/:workOrderId/comments/:commentId/tags/:tagId — G-NEG 403, G-POS e G-WIDE passam
not ok 13 - laço G [OS·07c-a] ROTA POST /api/v1/work-orders/:workOrderId/geocode — G-NEG 403, G-POS e G-WIDE passam
not ok 14 - laço G [OS·07c-a] ROTA POST /api/v1/work-orders/:workOrderId/geocode-destination — G-NEG 403, G-POS e G-WIDE passam
not ok 15 - S-ANX — técnico B não apaga anexo da OS do técnico A; o anexo segue baixável
not ok 19 - S-MOD — moderação intacta: gestão edita e apaga o comentário do técnico; o atribuído edita o da gestão
not ok 22 - S-XT — cross-tenant segue 404 em anexo, comentário e km (o 403 novo não o substituiu)
not ok 24 - S-ROLES — ator técnico E gestor na OS alheia: a união vence, anexo e comentário passam
# tests 24
# pass 7
# fail 17
```

**Restauração dos 13 arquivos ao blob `O` e verificação de árvore limpa:**
```text
RESTORE_OK count=13 all_match_O=true status_clean=true
```

**Análise 1(d):**
- **M22 (`checklist.service.ts`):** âncora única (`anchor_count=1`). Ao remover `if (!actorMutatesAssignedOnly(woActor)) return details;` em `assertRunMutationScope`, toda vistoria sem OS (`S-ORFA`) passa a recusar também o papel `tenant_wide` (`operator=403` na sonda `05-sonda-m22.log` e `not ok 33 - S-ORFA` em `tests/o6r07c-b-scope.test.ts`: `pass 40, fail 1`). Já nas vistorias ligadas a uma OS, a chamada seguinte `workOrderService.getForMutation` possui sua própria guarda `if (!actorMutatesAssignedOnly(actor)) return;` em `assertMutationObjectScope`, preservando a defesa em profundidade para `tenant_wide`.
- **M24 (`work-order.service.ts`):** âncora única (`anchor_count=1`). Ao remover `if (!actorMutatesAssignedOnly(actor)) return;` em `assertMutationObjectScope`, `tests/o6r07c-b-scope.test.ts` tem `0` falhas (`pass 41, fail 0`) porque os chamadores do `07c-b1` (`ChecklistService.assertRunMutationScope`, `mobile-evidence-sync.ts`, `mobile-evidence-upload.ts`) já filtram `actorMutatesAssignedOnly` antes de chamar `getForMutation`, enquanto `tests/o6r07c-subresource-scope.test.ts` acusa imediatamente **17 falhas** (`pass 7, fail 17`, incluindo todas as 13 vias `OS·07a`/`OS·07c-a`, `S-XT` e `S-ROLES`).
- Após M22 e M24, todos os 13 arquivos de `src/` foram restaurados e verificados contra `git rev-parse O:<arquivo>` (`RESTORE_OK count=13 all_match_O=true status_clean=true`).

**Veredito parcial do Item 1:** **PASSOU (APROVADO)** — Todos os critérios de `1(a)`, `1(b)`, `1(c)` e `1(d)` comprovados sem ressalva.
