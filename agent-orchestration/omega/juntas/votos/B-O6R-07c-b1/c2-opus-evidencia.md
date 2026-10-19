papel: C2 | identidade: jurado-07cb1-c2-opus (corpo jurado-07cb1-c2-mobile-e-conflito; SUCESSOR P3 do Gemini 3.1 Pro caído às 05:14Z) | modelo: Claude Opus 5.5 (claude-opus-5-5) · nível menor (autorização: CLAUDE.md §C7.6 do objeto e da origin/main — Opus é o nível menor declarado; ref b198fe35 e origin/main 2a49b015) | mandato_md5: 83c4674ca32e948b683d9d40438f39c5 (declarado no disparo: 83c4674ca32e948b683d9d40438f39c5) | corpo_md5: fc06a7d5351e0c4bbe1e225251dd2645 (.claude, blob do objeto; .agents 3d45cc3b21aff08d913d1dd0a3a01e5f) (recebido no prompt: n/a — lido do blob por git show, md5 = declarado no disparo fc06a7d5…)

# Evidência C2 (Opus, sucessor) — junta B-O6R-07c-b1 (PR #440, ciclo 1)

- objeto: b198fe358b41186b2598ab258ccb735da8c04cbc · B = 4fe7524ecbcc68b3e69336453cc774ed5937cb1c · origin/main no início: 2a49b0159c83a6019a63b4d2af4d119fe7410972 (andou após 79599143; o #441 já mergeado)
- SCRATCH: C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/c2o-07cb1
- uname: MINGW64_NT-10.0-22631 x86_64 Msys · node v20.19.5 · livre em C: 8.8G (97%) às 09:54Z
- ambiente da sonda: env -u DATABASE_URL -u REDIS_URL CORE_SAAS_PERSISTENCE=memory (declarado por comando; nada exportado)
- P3 (sucessão): o arquivo c2-evidencia.md do caído tem 2 linhas (cabeçalho e objeto), NENHUM comando registrado → nada a re-executar; tudo medido do zero.
- Lido: corpo (blob), mandato cadeira-c2.md, parecer do inspetor, c2-evidencia.md do caído, 00-quedas.md (só cabeçalho e a linha da C1, que é registro de queda, não voto). NÃO li c1-*/c3-* (só vi os nomes no ls da pasta).

## Legalidade

- cmd: `git ls-remote origin refs/heads/fix/o6r07cb1-despacho-atribui` → b198fe35…; `gh pr view 440 --json headRefOid,…` → headRefOid b198fe35…, OPEN, isDraft=false, MERGEABLE → **coincidem**.
- cmd: `gh api repos/thiagodorgo/ERP_Techsolutios/commits/<O>/check-runs?per_page=100` → total 14 | não-verdes 0 | pendentes 0; flutter:completed/success (2×).
- cmd: `git merge-base origin/main <O>` = 4fe7524e; `git log --merges B..O` → vazio; `git diff --name-only B O -- mobile/` → 0 linhas (mobile/ vazio no diff do bloco); src/ → 13 arquivos (checklists ×2, field-dispatch ×3, mobile ×4, work-orders ×4).
- parecer do inspetor: insp-07cb1-parecer.md, instância inspetor-07cb1-opus, 03:30–03:40Z, **LIBERADO COM RESSALVA**; nomeia a cadeira C2 (corpo .claude fc06a7d5…, .agents 3d45cc3b…), worktree C:/Users/AMP/w-j07cb1c2 (ou sufixo); o executor nomeado era Gemini — a substituição por Opus vem do disparo do orquestrador (sucessão P3, R4) com worktree C:/Users/AMP/w-j07cb1c2o.
- decisões (cmd: `git show <ref>:agent-orchestration/controle/decisoes.md | grep -n`): objeto → D2-07c 3171,3425,3655 · D1-07c 3166,3424,3654 · D-07CB-EMENDA-RECOMENDACOES 3658 · D-07CB1-TRAVA-ATE-B2 ausente; 79599143 e origin/main → D2-07c 3655 · D1-07c 3654 · EMENDA 3658,3719 · TRAVA-ATE-B2 3709,3719 · D-INICIO-ATENDIMENTO-CONFIRMADO 3719 · D-GEMINI-PRO-API-TETO 3715,3723 · D-BRACOS-E-DOCKER-17-10 3716. (R1: origin/docs/registro-17-10 apagada; lido 79599143/origin/main.)
- âncoras do CLAUDE.md (objeto | origin/main, `grep -c`): §6 1|1 · "## A7." 1|1 · C7.1-bis 2|2 · C7.1-ter 3|3 · C7.4-bis 6|6 · 6-bis 3|3 · "P3 — Perda" 1|1 · "P7 — Pausa" 1|1 · GOVERNANÇA PROPORCIONAL 1|1 · "Teto de 2 ciclos" 2|2 · KPI congelado 2|2 · "apagado só em" 1|1.
- inelegibilidade: `jurado-07cb1-c2-opus` → 0 no OBITUÁRIO (origin/main), 0 em `git grep` no objeto; não é planejador, dev, crítico, achador, cadeira do 07c-a, porteiro, inspetor, fábrica nem orquestrador.
- quórum: unanimidade de 3 com veto · ciclo 1 (bloqueia + dentro-do-bloco reprova, qualquer classe).
- veredito parcial (legalidade): OK.

## Terreno

- worktree próprio: `git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios worktree add --detach C:/Users/AMP/w-j07cb1c2o b198fe35…` → ec=0; `test -e …/.git` ok; HEAD = objeto. `npm ci --no-audit --no-fund` ec=0 (326 pacotes, sem junction). `DATABASE_URL=postgresql://x:y@127.0.0.1:1/none npm run db:generate` ec=0 (R7). `git status --porcelain` = 0.
- Docker: `docker ps` grupos tl/j = 0 no início; NÃO subi container (sonda em memória). Base viva e portas do dono intocadas.
- Sonda (verbatim no SCRATCH/sonda; md5): lib.mts 3b5dcaed…, acoes.mts 1f252916…, apprule.mts 97d76d5e…, item1.mts 374ca3f6…; executada por `env -u DATABASE_URL -u REDIS_URL CORE_SAAS_PERSISTENCE=memory timeout 300 node --import tsx <SCRATCH>/sonda/item1.mts C:/Users/AMP/w-j07cb1c2o <out.json> <tag>` com cwd no meu worktree. createApp(MemoryCoreSaasAdapter) do objeto em listen(0); ator por cabeçalhos x-tenant-id/x-user-id/x-role (o modo memória resolve as permissões pelo catálogo do papel, `src/modules/core-saas/permissions/catalog.ts`). Nenhum helper de tests/ importado. Storage da execução em os.tmpdir()/j07cb1-c2o-<tag>-*, apagado ao fim de cada execução.
- Semente (org A): tecA field_technician despachado à osA (201, run provisionada) e depois **reatribuído** a tecC (PATCH reassign 200); tecW (perfil pW) atribuído à osW pela rota web `POST /work-orders/:id/assign {operatorId: pW}` (200) e depois a OS passa a pW2 pela MESMA rota (200) — ex-técnico **sem** despacho; run da osW criada por tenant_admin (`POST /mobile/checklist-runs`, 201). tecB técnico ATUAL da osB. tecT `technician`, nunca técnico. tecC técnico atual da osA. osN despachada só ao tecC. osA2 = OS atual do tecA. Org B: tecZ despachado à osZ e reatribuído a tecZ2. Trabalho offline GERADO antes da troca, ENVIADO depois.

## Item 1 — contrato de conflito nas 4 famílias e destino no app

### (a) Família × ator, no objeto (N: vistoria 12 pares = 7 canônicos + 5 apelidos, `mobile-checklist-sync.ts:44-58`; evidência 3 `work_order_*`; OS 2 = status_change + mileage)
- cmd: item1.mts tag obj → ec=0; saída `item1-objeto.json` (SCRATCH).

| ator | vistoria (12) | evidência (3) | OS (2) | HTTP | estado antes = depois | recibos evid. criados |
|---|---|---|---|---|---|---|
| tecA (ex, despacho) | 12 conflicts / assignment_changed_pending_review / not_assigned_to_actor | 3 idem | 2 idem | 200×3 | sim | 0 |
| tecW (ex, sem despacho, perfil) | 12 idem | 3 idem | 2 idem | 200×3 | sim | 0 |
| tecB (nunca; técnico de outra OS) | 12 rejected / not_assigned_to_actor | 3 idem | 2 idem | 200×3 | sim | 0 |
| tecT (`technician`, nunca) | 12 rejected / not_assigned_to_actor | 3 idem | 2 idem | 200×3 | sim | 0 |
| tecZ (org B) → osA | 12 rejected / checklist_run_not_found | 3 rejected / not_found | 2 rejected / not_found | 200×3 | sim | 0 |
| tecZ → osZ (ex na org B) | 12 conflicts / assignment_changed… | 3 idem | 2 idem | 200×3 | sim | 0 |
| tecB → osN (sem ex-técnico) | 12 rejected / not_assigned_to_actor | 3 idem | 2 idem | 200×3 | sim | 0 |
| tecB → OS/run inexistentes | 12 rejected / checklist_run_not_found | 3 rejected / not_found | 2 rejected / not_found | 200×3 | — | 0 |

- conflito: `next_action = await_supervisor_review` em 17/17 ações de cada ex-técnico; chaves do item — vistoria `checklist_run_id,client_action_id,conflict,error,status,type` / conflito `conflict_type,local,next_action,retriable(false),server_id`; evidência `client_evidence_id,conflict,error,status,type,work_order_id` / `conflict_type,local,next_action,server_id`; OS `client_action_id,conflict,error,status,type,work_order_id` / idem. `local` = a ação do próprio ator, sem tenant_id.
- estado lido pelo manager (status, km, timeline; run: status, answers, attachments, markers, acknowledgements; audit e storage de evidência) idêntico antes/depois para 8/8 atores.
- nunca-técnico não sabe da troca: resposta sanitizada do tecB na osA (teve tecA) == do tecB na osN (nunca teve outro), ids trocados por marcador → true nas 3 famílias. tecZ → osA (org A) == OS/run inexistente (mesmo code/reason/message) → sem vazamento entre organizações. (404 × 403 dentro da mesma org é da C1.)
- S-MIX (tecA, 1 lote por família: osA2 dele + osA ex + osB nunca): vistoria `accepted / conflicts assignment_changed / rejected not_assigned`; evidência idem; OS idem; HTTP 200×3; km da osA2 aplicada [1000,1100].
- veredito parcial (a): VERDE.

### (b) Servidor × parser do app (blob do objeto, só leitura; regra reproduzida em apprule.mts)
- OS: `WorkOrderSyncCodec.decodeResponse` sync_replay_service.dart:306-343 — item de `data.conflicts` com `client_action_id` vira `'conflict'` (:331-339); `_replayEligible` :755-762 → `SyncStatus.conflict`, payload mantido; elegíveis excluem conflict (:665) e o teto 5 (:666).
- Vistoria: `ChecklistSyncCodec.decodeResponse` :889-923; replay :1450-1463 — conflito só volta ao reenvio se o código ∈ `{acknowledgement_not_required}` (:1337-1342); `assignment_changed_pending_review` não está → `SyncStatus.conflict`; elegíveis excluem conflict (:1366).
- Evidência: evidence_sync.dart `_decodeItem` :212-232; replay :351-366 → `SyncStatus.conflict`; elegíveis excluem conflict (:296).
- km: o app não emite `work_order.mileage` pela fila (api_contracts.dart:49-61; replay só create/status_update/assign, sync_replay_service.dart:641-653); a forma do conflito de km é a do lote de OS. nota.
- destinos (regra aplicada às respostas do (a)): tecA 17/17, tecW 17/17, tecZ→osZ 17/17 = `conflito (fora do reenvio; payload mantido)`; tecB/tecT/tecZ→osA/inexistente 17/17 = `reenvio (teto 5)` (teto pré-existente, `P-O6R-07C-APP-RECUSA-PERMANENTE-SEM-SAIDA`, dono B-SAN3-16).
- tela: sync_screen.dart:100-107 mostra todo `SyncStatus.conflict` com "manter a minha"/"usar a do servidor"; `resolveConflictAction` sync_conflict_resolver.dart:20-35: keepMine → pending, retryCount 0 (o reenvio volta ao MESMO conflito — item 3); useServer → `synced` sem estado de servidor (o trabalho deixa a fila por escolha do técnico). work_order_conflict_resolution_service.dart:60-80 acceptServer exige serverId (vem `server_id`) e marca synced. → perda consciente por escolha: `ajuste`, não grave, dono B-SAN3-16.
- veredito parcial (b): VERDE; 1 ajuste não grave (useServer), 1 nota (km).

### (c) Vermelho-controle no head-base
- cmd: `git diff --name-only B O -- src/` (13) → `git cat-file --filters B:<f> > <f>`; prova `git hash-object` = `git rev-parse B:<f>` 13/13; item1.mts tag base ec=0; restauro `git cat-file --filters O:<f>` 13/13 = blob do objeto; `git status --porcelain` = 0.
- base: tecA vistoria 5 accepted + 3 already_applied + 4 conflitos de estado (run concluída pelo próprio tecA), evidência 3 accepted (3 recibos), OS 2 rejected; estado da osA MUDOU; tecW idem; tecB/tecT escrevem na evidência (3 recibos) e a vistoria fica por estado; S-MIX: vistoria da osB (nunca) `accepted`, evidência 3/3 `accepted`, OS 3/3 rejected. A sonda acusa.
- controles: (1) efeito — tecC (atual) na osA: status assigned→accepted, km null→[7000,7100], timeline 3→5, answers 0→1; (2) baldes — resposta fabricada accepted/conflict/rejected → 1/1/1; (3) regra do app — sem a chave `conflicts` → `reenvio(MISSING_RESULT)` (OS e vistoria), conflito sem client_action_id → reenvio, código retentável → reenvio, evidência fora do balde → reenvio. Os três acusam.
- **veredito parcial item 1: VERDE** (0 bloqueia; 1 ajuste não grave; 1 nota).

## Item 2 — upload pela OS do recibo; 409 no app; evidência field_* com work_order_id

- cmd: `env -u DATABASE_URL -u REDIS_URL CORE_SAAS_PERSISTENCE=memory timeout 300 node --import tsx <SCRATCH>/sonda/item2.mts C:/Users/AMP/w-j07cb1c2o <out> obj|base` (item2.mts 5204 B); base pela mesma troca/restauro do item 1 (13/13 iguais a B; 13/13 restaurados ao objeto; porcelain 0). ec=0 nas duas.
- (a) objeto: tecA, técnico da osU (despacho), registra 4 fotos `evidence.work_order_photo` (4 accepted, recibo com scope `work_order`). Controle "antes da troca": upload U0 → **201 stored**, storage 0→1. Troca (reassign 200). Depois:

| forma | objeto | base |
|---|---|---|
| F1 sem `work_order_id` no formulário (é o que o app manda: evidence_upload.dart:188-197 não passa workOrderId) | **409 MOBILE_EVIDENCE_CONFLICT / assignment_changed_pending_review**, storage 1→1, audit 2→2 | **201 stored**, storage 1→2 |
| F2 `work_order_id` = osU | **409 / assignment_changed_pending_review**, storage igual | **201**, storage 2→3 |
| F3 `work_order_id` = osA2 (OS dele) | **409 / work_order_mismatch** (checagem formulário × recibo, `mobile-evidence-upload.ts:117`, de 2026-06-17 ad228aee), storage igual | 409 / work_order_mismatch |

  O campo do formulário NÃO abre a porta: com ele igual a uma OS dele, o upload segue recusado (409) e nada grava; sem ele, a decisão é pela OS do recibo. Corpo do 409: só `{error:{code,reason,message}}` (sem id, tenant ou caminho).
- controles: (1) tecC com recibo próprio da osU → 201 stored, storage 2→3, audit 4→6 (o leitor de storage acha); tecA com recibo da osA2 (dele) → 201, storage 1→2; (2) o 409 é do bloco: na base F1 e F2 dão 201 e gravam.
- (b) app: o 409 vira `ApiConflictError` (http_client.dart:79-80) → `uploadStatus = conflict`, `UPLOAD_CONFLICT`, **sem apagar o blob** (evidence_upload.dart:219-225); o único `_blobStore.delete` está no ramo `stored/uploaded` (:199-207); o item em conflito sai da seleção do próximo upload (filtro pending|failed, :150-157) — preservado, sem reenvio. O sync de metadados que antecede (lote) leva o mesmo ex-técnico a `SyncStatus.conflict` (item 1) e o provider marca `uploadStatus: conflict` (sync_providers.dart:288-291). → blob preservado, destino visível como conflito. VERDE.
- (c) field_* do nunca-técnico tecB com `metadata.work_order_id = osA`: objeto e base IGUAIS — 3/3 `accepted`, recibo devolve `work_order_id = <osA>`, scope `field`; upload do binário field_photo → 201 (objeto e base). Efeito na OS: leituras do manager — `GET /work-orders/<osA>`, `/timeline`, `/attachments`, `/mobile/checklist-runs?workOrderId=<osA>` (200) e as mesmas da osU — encontram **0** cids field_* (e 0 do tecC legítimo). Varredor: `git grep -l "evidenceStorageProvider|LocalProtectedEvidenceStorageProvider|getEvidenceAuditEvents|findMobileEvidenceSyncReceiptForUpload" -- src/` → só evidence-storage.ts, mobile-evidence-sync.ts, mobile-evidence-upload.ts: não há leitor de evidência móvel por OS no servidor (controle 3: o varredor acha os 2 únicos leitores — o recibo, que o upload usa, e o storage, onde a sonda viu a evidência do tecC). Origem: tipos `evidence.field_*` e o eco do `work_order_id` desde 366e82da (2026-06-15). → `nota`, `pre-existente` (rótulo livre ecoado, sem leitor por OS; não é escrita na OS alheia).
- (d) tenant_admin, 3 `evidence.work_order_*` em OS inexistente: objeto 3/3 `accepted`, base 3/3 `accepted` — igual (decisão R4 do dev: tenant_wide não passa pela porta da OS). VERDE.
- **veredito parcial item 2: VERDE** (0 bloqueia; 1 nota pré-existente field_*).

## Item 3 — idempotência: client_action_id, estado, "manter a minha", reinício, S-KM-RESTART

- cmd: `env -u DATABASE_URL -u REDIS_URL CORE_SAAS_PERSISTENCE=memory timeout 300 node --import tsx <SCRATCH>/sonda/item3.mts C:/Users/AMP/w-j07cb1c2o <out> obj|base` (item3.mts md5 cd14d50b…; item3b.mts 60a6d551…); base pela mesma troca/restauro (13/13 = B; 13/13 restaurados = objeto; porcelain 0). ec=0. "reset" = `resetMobile{Checklist,Evidence,WorkOrder}SyncRuntimeForTests` (os 3 `Map` de recibo; o domínio em memória fica, como o banco num reinício).
- (a) tecA (despachado à osK) manda K1 resposta, K3 evidência obs., K4 km, K2 conclusão → 4/4 accepted; troca (reassign 200).

| momento | K1 resposta (cid durável) | K2 conclusão (estado) | K3 evidência (Map) | K4 km (Map) |
|---|---|---|---|---|
| objeto, mesmo processo | already_applied | already_applied | already_applied | already_applied |
| objeto, após reset | already_applied | **conflicts / assignment_changed** | conflicts / assignment_changed | conflicts / assignment_changed |
| base, mesmo processo | already_applied | already_applied | already_applied | rejected (na base o despacho não atribui) |
| base, após reset | already_applied | already_applied | accepted (de novo) | rejected |

  Estado da osK (status, km [2000,2100], resposta "Sem avarias", run `completed`) igual do 1º reenvio ao fim (e2 == e3; a diferença e1→e2 é só +1 na timeline = o evento da própria reatribuição). Nada duplicado, nada desfeito.
- (b) por estado: osS (tecA → tecC); tecC registra divergência (accepted; run `pending_acknowledgement`). Nova divergência + conclusão: **tecB (nunca) → rejected/not_assigned_to_actor ×2** (base: `already_applied` na divergência — a regra D-07c-IDEMP fecha isso); **tecA (ex) → conflicts/assignment_changed ×2** (base: already_applied). Estado da run igual.
- extra (cid durável antes do escopo): tecB reenviando o MESMO `client_action_id` de uma resposta gravada pelo tecC → `already_applied` com `server_state{run,answers}`; nada gravado (answers = 1). Mesmo comportamento na base (sem escopo nenhum); lookup por cid sem ator desde 8a938414 (2026-08-01, `mobile-checklist-sync.ts:437`); exige conhecer um UUID alheio; a leitura de OS alheia não é deste PR.
- (c) K5 coletado antes da troca (km, marcador, evidência), reenviado **6×** no mesmo processo + 1× após reset + 1× mesmo cid e payload diferente: objeto **8/8 × 3 famílias = conflicts / assignment_changed_pending_review**; estado da osF igual (km null, marcadores 0), audit 0→0, recibo de evidência ausente. Payload diferente NÃO vira `idempotency_payload_mismatch` (o conflito não é gravado como recibo; a semântica do conflito se mantém). Base: km rejected; marcador e evidência `accepted` no 1º envio (escrita), mismatch no payload diferente.
- (d) S-KM-RESTART (via rota web, comparável): tecW (perfil pW) km 500 → accepted; OS passa a pW2 (200); reenvio no mesmo processo → already_applied; reset; reenvio → **objeto `conflicts/assignment_changed_pending_review` · base `rejected/not_assigned_to_actor`**; km = 500 no fim nos dois. Mesmo ator, mesma ação: só o balde muda = exatamente a `D2-07c`.
- controles: (1) reset real — tecC (atual) km: accepted → após reset **accepted de novo** (Map perdido; timeline 3→4); resposta: após reset `already_applied` pela via durável; (2) comparador — 2 marcadores com cids novos e mesmo conteúdo → markers 0→2 (vê a duplicação); (3) base difere no (d) (rejected × conflict).
- classificação: K2/K3/K4 após reinício voltam como conflito para quem já tinha aplicado (N=3 de 4 formas; forma: reenvio sem resposta + reinício + troca no meio; efeito: nenhum dado perdido nem duplicado, o app mostra conflito de algo já aplicado; "usar a do servidor" resolve sem perda). K3/K4: premissa A4 (recibo em `Map`, `mobile-evidence-sync.ts:92` 366e82da 2026-06-15; `mobile-work-order-sync.ts:71` 34807d67 2026-06-14) → `pre-existente` (na base a evidência era reaplicada e a km recusada — o bloco melhora). K2 (por estado): mudou de already_applied (base) para conflito, consequência declarada da regra "por estado, o escopo antes" (plano 07c-b.4, D-07c-IDEMP, l.550-557) → `ajuste`, não grave, dentro-do-bloco, dono B-O6R-07c-b2 (a decisão do superior). Mesmo processo: nenhuma legítima vira conflito.
- **veredito parcial item 3: VERDE** (0 bloqueia; 1 ajuste não grave K2; 1 nota pré-existente cid durável sem ator; K3/K4 pós-reinício pré-existente A4).

## Apêndice — sonda verbatim (md5 do arquivo executado; re-execução P3: copiar para uma pasta, rodar com cwd num worktree detached no objeto com npm ci + db:generate)

### lib.mts — md5 3b5dcaedcfa56e842e101f9f354845c5
```ts
// Sonda C2 (jurado-07cb1-c2-opus) — arnes: monta o app do worktree (argv WT) em memoria, HTTP em listen(0).
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const LV = "/api/v1/mobile/sync/checklist-actions";
export const LE = "/api/v1/mobile/sync/evidence-actions";
export const LO = "/api/v1/mobile/sync/work-order-actions";
export const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9]);

export async function makeCtx(WT: string, tag: string) {
  const runDir = fs.mkdtempSync(path.join(os.tmpdir(), "j07cb1-c2o-" + tag + "-"));
  const dirAnexos = path.join(runDir, "anexos"); const dirEvid = path.join(runDir, "evid");
  fs.mkdirSync(dirAnexos); fs.mkdirSync(dirEvid);
  process.env.CHECKLIST_STORAGE_LOCAL_DIR = dirAnexos;
  process.env.LOG_LEVEL = "silent";
  const imp = (p: string) => import(pathToFileURL(path.join(WT, p)).href);
  const [appM, wo, fd, ck, ckS, evS, evU, woS, coreSvc, memAd, store] = await Promise.all([
    imp("src/app.ts"), imp("src/modules/work-orders/index.ts"), imp("src/modules/field-dispatch/index.ts"),
    imp("src/modules/checklists/index.ts"), imp("src/modules/mobile/mobile-checklist-sync.ts"),
    imp("src/modules/mobile/mobile-evidence-sync.ts"), imp("src/modules/mobile/mobile-evidence-upload.ts"),
    imp("src/modules/mobile/mobile-work-order-sync.ts"), imp("src/modules/core-saas/services/core-saas.service.ts"),
    imp("src/modules/core-saas/services/memory-core-saas.adapter.ts"), imp("src/modules/core-saas/store/core-saas.store.ts"),
  ]);
  wo.resetWorkOrderRuntimeForTests(); fd.resetFieldDispatchRuntimeForTests(); ck.resetChecklistRuntimeForTests();
  ckS.resetMobileChecklistSyncRuntimeForTests(); evS.resetMobileEvidenceSyncRuntimeForTests(); woS.resetMobileWorkOrderSyncRuntimeForTests();
  evU.configureMobileEvidenceUploadStorageForTests(dirEvid); await evU.resetMobileEvidenceUploadRuntimeForTests();
  const mods = ["work_orders", "field_operations", "tenant_checklist", "checklists"];
  const core = new coreSvc.CoreSaasRegistry(new store.InMemoryCoreSaasStore());
  const tA = core.createTenant({ name: "C2O A", modules: mods }); const tB = core.createTenant({ name: "C2O B", modules: mods });
  const suf = randomUUID().slice(0, 8);
  const u = (t: any, n: string, roles: string[]) => (process.env.C2O_UUID_USERS === "1" ? { id: randomUUID(), name: n } : core.createUser({ tenantId: t.id, name: n, email: n + "-" + suf + "@c2o.example.com", roles }));
  const U: Record<string, any> = {
    tecA: u(tA, "teca", ["field_technician"]), tecW: { id: randomUUID(), name: "tecw" }, tecW2: { id: randomUUID(), name: "tecw2" }, tecB: u(tA, "tecb", ["field_technician"]),
    tecT: u(tA, "tect", ["technician"]), tecC: u(tA, "tecc", ["field_technician"]), mgr: u(tA, "mgr", ["manager"]), adm: u(tA, "adm", ["tenant_admin"]),
    tecZ: u(tB, "tecz", ["field_technician"]), tecZ2: u(tB, "tecz2", ["field_technician"]), mgrB: u(tB, "mgrb", ["manager"]), admB: u(tB, "admb", ["tenant_admin"]),
  };
  const ROLE: Record<string, string> = { tecA: "field_technician", tecW: "field_technician", tecW2: "field_technician", tecB: "field_technician", tecT: "technician", tecC: "field_technician", mgr: "manager", adm: "tenant_admin", tecZ: "field_technician", tecZ2: "field_technician", mgrB: "manager", admB: "tenant_admin" };
  const TEN: Record<string, any> = { tecZ: tB, tecZ2: tB, mgrB: tB, admB: tB };
  const app = appM.createApp(new memAd.MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  await new Promise<void>((r) => server.once("listening", () => r()));
  const base = "http://127.0.0.1:" + (server.address() as any).port;
  const h = (k: string) => ({ "x-tenant-id": (TEN[k] ?? tA).id, "x-user-id": U[k].id, "x-role": ROLE[k] });
  const req = async (p: string, o: { method?: string; headers?: any; body?: any } = {}) => {
    const r = await fetch(base + p, { method: o.method ?? "GET", headers: { "content-type": "application/json", ...o.headers }, body: o.body === undefined ? undefined : JSON.stringify(o.body) });
    const t = await r.text(); return { status: r.status, body: t ? JSON.parse(t) : null };
  };
  const lote = async (lp: string, k: string, actions: any[]) => req(lp, { method: "POST", headers: h(k), body: { client_batch_id: randomUUID(), actions } });
  const MOD: Record<string, { id: string; comp: string }> = {};
  const modelo = async (k: string) => {
    if (MOD[k]) return MOD[k];
    const c = await req("/api/v1/tenant/checklists", { method: "POST", headers: h(k), body: { name: "Vistoria C2O", type: "technical_evidence", schema: { source: "c2o" }, components: [{ componentKey: "estado", type: "observation", label: "Estado", required: true, config: {}, validationRules: {}, visibilityRules: {} }] } });
    const p = await req("/api/v1/tenant/checklists/" + c.body.data.id + "/publish", { method: "POST", headers: h(k), body: {} });
    MOD[k] = { id: c.body.data.id, comp: p.body.data.components[0].id }; return MOD[k];
  };
  const criarOs = async (k = "mgr") => {
    const m = await modelo(k === "mgrB" ? "admB" : "adm");
    const r = await req("/api/v1/work-orders", { method: "POST", headers: h(k), body: { title: "OS C2O", checklistId: m.id } });
    if (r.status !== 201) throw new Error("criarOs " + JSON.stringify(r.body)); return r.body.data.id as string;
  };
  const despachar = async (wo: string, tec: string, k = "mgr") => req("/api/v1/operations/dispatches", { method: "POST", headers: h(k), body: { workOrderId: wo, operatorUserId: U[tec].id } });
  const reatribuir = async (dId: string, tec: string, k = "mgr") => req("/api/v1/operations/dispatches/" + dId + "/reassign", { method: "PATCH", headers: h(k), body: { operatorUserId: U[tec].id } });
  const atribuirWeb = async (wo: string, tec: string, k = "mgr") => req("/api/v1/work-orders/" + wo + "/assign", { method: "POST", headers: h(k), body: { userId: U[tec].id } });
  const runs = async (wo: string, k = "adm") => (await req("/api/v1/mobile/checklist-runs?workOrderId=" + wo, { headers: h(k) })).body?.data ?? [];
  const criarRun = async (wo: string, k = "adm") => req("/api/v1/mobile/checklist-runs", { method: "POST", headers: h(k), body: { checklistId: (await modelo(k === "admB" ? "admB" : "adm")).id, workOrderId: wo } });
  const svcRun = async (runId: string, tenant: any = tA, userId: string = U.mgr.id) => { const s = await ck.createDefaultChecklistService(); return s.getRun({ tenantId: tenant.id, userId }, runId); };
  const upload = async (k: string, cid: string, woField?: string, bytes = JPEG) => {
    const f = new FormData();
    f.set("evidence_id", "evidence:" + (TEN[k] ?? tA).id + ":" + cid); f.set("client_evidence_id", cid);
    f.set("sha256", createHash("sha256").update(bytes).digest("hex")); f.set("size_bytes", String(bytes.length)); f.set("content_type", "image/jpeg");
    if (woField !== undefined) f.set("work_order_id", woField);
    f.set("file", new Blob([bytes], { type: "image/jpeg" }), "foto.jpg");
    const r = await fetch(base + "/api/v1/mobile/evidence-uploads", { method: "POST", headers: h(k), body: f });
    const t = await r.text(); return { status: r.status, body: t ? JSON.parse(t) : null };
  };
  const listDir = (d: string): string[] => fs.existsSync(d) ? (fs.readdirSync(d, { recursive: true }) as string[]).map(String).filter((x) => fs.statSync(path.join(d, x)).isFile()) : [];
  const resetSync = () => { ckS.resetMobileChecklistSyncRuntimeForTests(); evS.resetMobileEvidenceSyncRuntimeForTests(); woS.resetMobileWorkOrderSyncRuntimeForTests(); };
  const receipt = (k: string, cid: string) => evS.findMobileEvidenceSyncReceiptForUpload({ tenantId: (TEN[k] ?? tA).id, userId: U[k].id }, cid);
  const audit = () => evU.getMobileEvidenceUploadAuditEventsForTests().map((e: any) => e.action + ":" + e.actorId);
  const opM = await imp("src/modules/operator-profiles/operator-profile.service.ts");
  try { opM.resetOperatorProfileRuntimeForTests?.(); } catch {}
  const perfil = async (k: string) => { const s = await opM.createDefaultOperatorProfileService(); return s.create({ tenantId: (TEN[k] ?? tA).id, userId: U.adm.id, roles: ["tenant_admin"], permissions: [] }, { user_id: U[k].id, full_name: "Perfil " + k }); };
  const atribuirPerfil = async (wo: string, perfilId: string, k = "mgr") => req("/api/v1/work-orders/" + wo + "/assign", { method: "POST", headers: h(k), body: { operatorId: perfilId } });
  const close = async () => { await new Promise<void>((r, j) => server.close((e: any) => (e ? j(e) : r()))); fs.rmSync(runDir, { recursive: true, force: true }); };
  return { perfil, atribuirPerfil, U, tA, tB, h, req, lote, modelo, criarOs, despachar, reatribuir, atribuirWeb, runs, criarRun, svcRun, upload, listDir, dirEvid, runDir, resetSync, receipt, audit, close, sha: createHash("sha256").update(JPEG).digest("hex") };
}
```

### acoes.mts — md5 1f252916a609f7162163a812b9432998
```ts
// Construtores de acoes e leitores (sonda C2 opus).
import { randomUUID } from "node:crypto";
import { JPEG } from "./lib.mts";
import { createHash } from "node:crypto";
const now = () => new Date().toISOString();
export const VIST_TIPOS: Array<[string, string]> = [
  ["checklist.item_answer", "answer"], ["checklist.item_note", "note"], ["checklist.marker_create", "marker"],
  ["checklist.divergence_create", "divergence"], ["checklist.acknowledgement_create", "ack"], ["checklist.attachment_attach", "attach"],
  ["checklist.complete", "complete"], ["checklist_marker.create", "marker"], ["checklist_divergence.create", "divergence"],
  ["checklist_acknowledgement.create", "ack"], ["checklist_attachment.attach", "attach"], ["checklist_run.complete", "complete"],
];
export function payloadVist(kind: string, run: string, comp: string): any {
  const b = { run_id: run };
  switch (kind) {
    case "answer": return { ...b, component_id: comp, value: "Sem avarias (C2O)." };
    case "note": return { ...b, component_id: comp, note: "Nota C2O." };
    case "marker": return { ...b, component_id: comp, marker_type: "scratch", position_label: "Porta" };
    case "divergence": return { ...b, component_id: comp, observation: "Avaria C2O." };
    case "ack": return { ...b, message: "Ciente C2O." };
    case "attach": return { ...b, local_att_id: "att-" + randomUUID(), field_id: comp, file_name: "a.jpg", mime_type: "image/jpeg", size_bytes: 1000, checksum: "abc" };
    case "complete": return { ...b, has_divergence: false };
  }
  throw new Error("kind " + kind);
}
export const vistoria = (run: string, comp: string) => VIST_TIPOS.map(([t, k]) => ({ client_action_id: randomUUID(), type: t, local_created_at: now(), payload: payloadVist(k, run, comp) }));
export const EVI_TIPOS = ["evidence.work_order_observation", "evidence.work_order_photo", "evidence.work_order_signature"];
export function payloadEvi(t: string, wo: string | undefined): any {
  const b: any = wo === undefined ? {} : { work_order_id: wo };
  const arq = { file_name: "foto.jpg", content_type: "image/jpeg", size_bytes: JPEG.length, sha256: createHash("sha256").update(JPEG).digest("hex") };
  if (t.endsWith("_observation")) return { ...b, note: "Obs C2O." };
  if (t.endsWith("_photo")) return { ...b, ...arq };
  return { ...b, ...arq, signer_name: "Cliente" };
}
export const evidencia = (wo: string, tipos = EVI_TIPOS) => tipos.map((t) => ({ client_evidence_id: "c2o-" + randomUUID(), type: t, local_created_at: now(), payload: payloadEvi(t, wo) }));
export const osAcoes = (wo: string, km = 1000) => [
  { client_action_id: randomUUID(), type: "work_order.status_change", local_created_at: now(), payload: { work_order_id: wo, status: "accepted" } },
  { client_action_id: randomUUID(), type: "work_order.mileage", local_created_at: now(), payload: { work_order_id: wo, mileage_start: km, mileage_end: km + 100 } },
];
// baldes por acao: cid -> {balde, status, conflict_type, next_action, reason, chaves_conflict}
export function baldes(resp: any, idKey = "client_action_id"): Record<string, any> {
  const d = resp?.body?.data ?? resp?.body ?? {};
  const out: Record<string, any> = {};
  for (const b of ["accepted", "rejected", "conflicts", "already_applied"]) {
    for (const it of d[b] ?? []) {
      out[it[idKey]] = { balde: b, status: it.status, conflict_type: it.conflict?.conflict_type, next_action: it.conflict?.next_action, reason: it.error?.reason, retriable: it.conflict?.retriable, chaves_item: Object.keys(it).sort().join(","), chaves_conflict: it.conflict ? Object.keys(it.conflict).sort().join(",") : "" };
    }
  }
  return out;
}
export function resumo(resp: any, idKey = "client_action_id") {
  const b = baldes(resp, idKey); const cont: Record<string, number> = {};
  for (const v of Object.values(b)) { const k = v.balde + "|" + (v.conflict_type ?? "-") + "|" + (v.reason ?? "-"); cont[k] = (cont[k] ?? 0) + 1; }
  return { http: resp.status, N: Object.keys(b).length, contagem: cont };
}
// sanitiza para publicar (sec 2.8): tira tenant_id, ids longos viram marcadores
export function sanit(o: any, ids: Record<string, string>): any {
  if (o === undefined) return null;
  let s = JSON.stringify(o, (k, v) => (k === "tenant_id" || k === "tenantId" || k === "server_time" ? undefined : v));
  for (const [nome, id] of Object.entries(ids)) if (id) s = s.split(id).join("<" + nome + ">");
  s = s.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, "<uuid>");
  return JSON.parse(s);
}
```

### apprule.mts — md5 97d76d5e754f680c30aea1638297b932
```ts
// Regra do app (blob do objeto b198fe35), reproduzida. Destino por acao: conflito | reenvio | sincronizado.
// OS: WorkOrderSyncCodec.decodeResponse sync_replay_service.dart:306-343 (conflicts -> 'conflict' se tem client_action_id :331-339);
//     WorkOrderSyncReplayService._replayEligible :660-812 ('conflict' -> SyncStatus.conflict :755-762; elegivel exclui conflict :665; teto :666).
// Vistoria: ChecklistSyncCodec.decodeResponse :889-923; ChecklistSyncReplayService :1360-1500
//     ('conflict' com codigo em {acknowledgement_not_required} -> failed/retry :1337-1342,:1450-1458; senao SyncStatus.conflict :1459-1463; elegivel exclui conflict :1366).
// Evidencia: EvidenceSyncCodec._decodeItem evidence_sync.dart:212-232 (status do item; senao o do balde :424-435);
//     replay :293-393 (isIdempotentSuccess -> synced :351-360; conflict -> SyncStatus.conflict :361-366; resto failed :367-373).
const lst = (v: any) => (Array.isArray(v) ? v.filter((x) => x && typeof x === "object") : []);
const s = (v: any) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
export function decodeOS(body: any) {
  const d = body?.data ?? body ?? {}; const r: any[] = [];
  const cid = (i: any) => s(i.client_action_id) ?? s(i.clientActionId);
  for (const i of lst(d.accepted)) if (cid(i)) r.push({ cid: cid(i), st: "processed" });
  for (const i of lst(d.already_applied ?? d.alreadyApplied)) if (cid(i)) r.push({ cid: cid(i), st: "ignored" });
  for (const i of lst(d.rejected)) if (cid(i)) r.push({ cid: cid(i), st: "failed", code: s(i.error?.reason) ?? s(i.error?.code) });
  for (const i of lst(d.conflicts)) if (cid(i)) r.push({ cid: cid(i), st: "conflict", code: s(i.conflict?.conflict_type) ?? s(i.conflict?.conflictType) ?? s(i.error?.reason) });
  return r;
}
export const decodeVist = decodeOS; // mesma forma (ChecklistSyncCodec.decodeResponse :889-923)
const RETRYABLE = new Set(["acknowledgement_not_required"]);
export function destinoOS(body: any, cids: string[]) {
  const m = new Map(decodeOS(body).map((x) => [x.cid, x]));
  return Object.fromEntries(cids.map((c) => { const x = m.get(c); if (!x) return [c, "reenvio(MISSING_RESULT)"]; return [c, x.st === "conflict" ? "conflito(fora do reenvio; payload mantido)" : x.st === "failed" ? "reenvio(teto 5)" : "sincronizado"]; }));
}
export function destinoVist(body: any, cids: string[]) {
  const m = new Map(decodeVist(body).map((x) => [x.cid, x]));
  return Object.fromEntries(cids.map((c) => { const x = m.get(c); if (!x) return [c, "reenvio(MISSING_RESULT)"];
    if (x.st === "conflict" && x.code && RETRYABLE.has(String(x.code).toLowerCase())) return [c, "reenvio(conflito retentavel)"];
    return [c, x.st === "conflict" ? "conflito(fora do reenvio; payload mantido)" : x.st === "failed" ? "reenvio(teto 5)" : "sincronizado"]; }));
}
export function destinoEvi(body: any, cids: string[]) {
  const d = body?.data ?? body ?? {}; const m = new Map<string, string>();
  const st = (v: any, fb: string) => (v === "accepted" ? "accepted" : v === "rejected" ? "rejected" : v === "conflict" ? "conflict" : v === "already_applied" || v === "alreadyApplied" ? "alreadyApplied" : fb);
  const add = (raw: any, fb: string) => { if (!Array.isArray(raw)) return; for (const i of raw.filter((x: any) => x && typeof x === "object")) { const id = s(i.client_evidence_id) ?? s(i.clientEvidenceId) ?? s(i.client_action_id) ?? s(i.clientActionId) ?? ""; m.set(id, st(i.status, fb)); } };
  add(d.accepted, "accepted"); add(d.rejected, "rejected"); add(d.conflicts, "conflict"); add(d.already_applied ?? d.alreadyApplied, "alreadyApplied");
  return Object.fromEntries(cids.map((c) => { const x = m.get(c); if (!x) return [c, "reenvio(MISSING_RESULT)"];
    return [c, x === "accepted" || x === "alreadyApplied" ? "sincronizado" : x === "conflict" ? "conflito(fora do reenvio; payload mantido)" : "reenvio(teto 5)"]; }));
}
// upload binario: evidence_upload.dart:198-240 + http_client.dart:79-81 (409 -> ApiConflictError; 401/403 -> ApiUnauthorizedError)
export function destinoUpload(http: number, status?: string) {
  if (http >= 200 && http < 300 && (status === "stored" || status === "uploaded")) return "synced; blob APAGADO (:207)";
  if (http >= 200 && http < 300) return status === "pending_review" ? "pending; blob mantido" : "failed; blob mantido";
  if (http === 409) return "uploadStatus=conflict UPLOAD_CONFLICT; blob MANTIDO (:219-225); fora do proximo upload (filtro :154-156)";
  return "uploadStatus=failed; blob mantido; reenviado no proximo upload (:226-239)";
}
```

### item1.mts — md5 374ca3f6cc22e52d7661ad2e7adec348
```ts
// ITEM 1 — contrato de conflito nas 4 familias, por ator; isolamento; destino no app. argv: WT out.json tag
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { makeCtx, LV, LE, LO } from "./lib.mts";
import { vistoria, evidencia, osAcoes, baldes, resumo, sanit } from "./acoes.mts";
import { destinoOS, destinoVist, destinoEvi } from "./apprule.mts";
const [WT, OUT, TAG] = process.argv.slice(2);
const c = await makeCtx(WT, TAG);
const R: any = { tag: TAG, passos: [] };
const log = (k: string, v: any) => { R[k] = v; };
try {
  const comp = (await c.modelo("adm")).comp;
  // sementes
  const osA = await c.criarOs(); const dA = await c.despachar(osA, "tecA"); const runA = (await c.runs(osA))[0]?.id;
  const osA2 = await c.criarOs(); await c.despachar(osA2, "tecA"); const runA2 = (await c.runs(osA2))[0]?.id;
  const osB = await c.criarOs(); await c.despachar(osB, "tecB"); const runB = (await c.runs(osB))[0]?.id;
  const osN = await c.criarOs(); await c.despachar(osN, "tecC"); const runN = (await c.runs(osN))[0]?.id;
  const pW = await c.perfil("tecW"); const pW2 = await c.perfil("tecW2");
  const osW = await c.criarOs(); const aw1 = await c.atribuirPerfil(osW, pW.id); const crW = await c.criarRun(osW); const runW = crW.body?.data?.id;
  const osZ = await c.criarOs("mgrB"); const dZ = await c.despachar(osZ, "tecZ", "mgrB"); const runZ = (await c.runs(osZ, "admB"))[0]?.id;
  log("semente", { despachoA: dA.status, runA: !!runA, runA2: !!runA2, runB: !!runB, runN: !!runN, webW: aw1.status, runW: crW.status, despZ: dZ.status, runZ: !!runZ });
  // trabalho offline GERADO antes da troca
  const off: any = {
    tecA: { v: vistoria(runA, comp), e: evidencia(osA), o: osAcoes(osA) },
    tecW: { v: vistoria(runW, comp), e: evidencia(osW), o: osAcoes(osW) },
    tecB: { v: vistoria(runA, comp), e: evidencia(osA), o: osAcoes(osA) },
    tecT: { v: vistoria(runA, comp), e: evidencia(osA), o: osAcoes(osA) },
    tecZ: { v: vistoria(runA, comp), e: evidencia(osA), o: osAcoes(osA) },
    tecZ_osZ: { v: vistoria(runZ, (await c.modelo("admB")).comp), e: evidencia(osZ), o: osAcoes(osZ) },
    tecB_osN: { v: vistoria(runN, comp), e: evidencia(osN), o: osAcoes(osN) },
    tecB_inex: { v: vistoria(randomUUID(), comp), e: evidencia(randomUUID()), o: osAcoes(randomUUID()) },
  };
  // a troca
  const rA = await c.reatribuir(dA.body.data.id, "tecC"); const rW = await c.atribuirPerfil(osW, pW2.id);
  const rZ = await c.reatribuir(dZ.body.data.id, "tecZ2", "mgrB");
  log("troca", { osA: rA.status, osW: rW.status, osZ: rZ.status });
  // estado lido pelo manager
  const estado = async (wo: string, run: string, mk = "mgr", ten = c.tA) => {
    const o = await c.req("/api/v1/work-orders/" + wo, { headers: c.h(mk) }); const t = await c.req("/api/v1/work-orders/" + wo + "/timeline", { headers: c.h(mk) });
    let rd: any = {}; try { const d: any = await c.svcRun(run, ten, c.U[mk].id); rd = { status: d.run.status, ...Object.fromEntries(Object.entries(d).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, (v as any[]).length])) }; } catch (e: any) { rd = { erro: e?.reason ?? String(e) }; }
    return { os_status: o.body?.data?.status, km: [o.body?.data?.mileageStart, o.body?.data?.mileageEnd], timeline: (t.body?.data ?? t.body?.items ?? []).length, run: rd, audit: c.audit().length, storage: c.listDir(c.dirEvid).length };
  };
  const alvos: any = { tecA: [osA, runA], tecW: [osW, runW], tecB: [osA, runA], tecT: [osA, runA], tecZ: [osA, runA], tecZ_osZ: [osZ, runZ, "mgrB", c.tB], tecB_osN: [osN, runN], tecB_inex: [osA, runA] };
  const ids = { osA, osA2, osB, osN, osW, osZ, runA, runA2, runB, runN, runW, runZ, tecA: c.U.tecA.id, tecB: c.U.tecB.id, tecC: c.U.tecC.id, tecW: c.U.tecW.id };
  const tab: any = {}; const formas: any = {}; const destinos: any = {};
  for (const [quem, w] of Object.entries(off) as any) {
    const ator = quem.split("_")[0]; const [wo, run, mk, ten] = alvos[quem];
    const antes = await estado(wo, run, mk, ten);
    const rv = await c.lote(LV, ator, w.v); const re = await c.lote(LE, ator, w.e); const ro = await c.lote(LO, ator, w.o);
    const depois = await estado(wo, run, mk, ten);
    tab[quem] = { vistoria: resumo(rv), evidencia: resumo(re, "client_evidence_id"), os: resumo(ro), estado_igual: JSON.stringify(antes) === JSON.stringify(depois), antes, depois, recibos_evid_criados: w.e.filter((a: any) => !!c.receipt(ator, a.client_evidence_id)).length };
    formas[quem] = { vistoria_1: sanit(rv.body?.data?.conflicts?.[0] ?? rv.body?.data?.rejected?.[0], ids), evid_1: sanit((re.body?.data?.conflicts ?? [])[0] ?? (re.body?.data?.rejected ?? [])[0], ids), os_1: sanit((ro.body?.data?.conflicts ?? [])[0] ?? (ro.body?.data?.rejected ?? [])[0], ids), baldes_v: baldes(rv), baldes_e: baldes(re, "client_evidence_id"), baldes_o: baldes(ro) };
    destinos[quem] = { vistoria: destinoVist(rv.body, w.v.map((a: any) => a.client_action_id)), evidencia: destinoEvi(re.body, w.e.map((a: any) => a.client_evidence_id)), os: destinoOS(ro.body, w.o.map((a: any) => a.client_action_id)) };
  }
  log("tabela", tab); log("formas", formas); log("destinos_app", destinos);
  // S-MIX dentro do tecA: legitima (osA2) + conflito (osA) + recusa (osB), por familia
  const mixV = [vistoria(runA2, comp)[0], vistoria(runA, comp)[0], vistoria(runB, comp)[0]];
  const mixE = [evidencia(osA2, ["evidence.work_order_observation"])[0], evidencia(osA, ["evidence.work_order_observation"])[0], evidencia(osB, ["evidence.work_order_observation"])[0]];
  const mixO = [osAcoes(osA2)[1], osAcoes(osA)[1], osAcoes(osB)[1]];
  const mv = await c.lote(LV, "tecA", mixV); const me = await c.lote(LE, "tecA", mixE); const mo = await c.lote(LO, "tecA", mixO);
  const ord = (b: any, xs: any[], k = "client_action_id") => xs.map((x) => { const y = baldes(b, k)[x[k]]; return y ? y.balde + "/" + (y.conflict_type ?? y.reason ?? "-") : "AUSENTE"; });
  const kmA2 = (await c.req("/api/v1/work-orders/" + osA2, { headers: c.h("mgr") })).body?.data;
  log("s_mix", { http: [mv.status, me.status, mo.status], vistoria: ord(mv, mixV), evidencia: ord(me, mixE, "client_evidence_id"), os: ord(mo, mixO), km_osA2_aplicada: [kmA2?.mileageStart, kmA2?.mileageEnd] });
  // controle 1: o leitor de efeito acha (tecC, tecnico atual da osA)
  const a0 = await estado(osA, runA);
  const cv = await c.lote(LV, "tecC", [vistoria(runA, comp)[0]]); const co = await c.lote(LO, "tecC", osAcoes(osA, 7000)); const ce = await c.lote(LE, "tecC", evidencia(osA, ["evidence.work_order_observation"]));
  const a1 = await estado(osA, runA);
  log("controle1_efeito", { vistoria: resumo(cv), os: resumo(co), evid: resumo(ce, "client_evidence_id"), antes: a0, depois: a1, moveu: JSON.stringify(a0) !== JSON.stringify(a1) });
} catch (e: any) { R.erro = String(e?.stack ?? e); } finally { await c.close(); fs.writeFileSync(OUT, JSON.stringify(R, null, 1)); }
```

### controles1.mts — md5 abf5a348550a4b07cb880b6c51055b7b
```ts
import { resumo } from "./acoes.mts";
import { destinoOS, destinoVist, destinoEvi } from "./apprule.mts";
const fab = { status: 200, body: { data: { accepted: [{ client_action_id: "a1", status: "accepted" }], conflicts: [{ client_action_id: "c1", status: "conflict", conflict: { conflict_type: "assignment_changed_pending_review" } }], rejected: [{ client_action_id: "r1", status: "rejected", error: { reason: "not_assigned_to_actor" } }], already_applied: [] } } };
console.log("C2 leitor de baldes:", JSON.stringify(resumo(fab).contagem));
const ok = destinoOS(fab.body, ["a1", "c1", "r1"]);
const semChave = { data: { accepted: [], conflict: [{ client_action_id: "c1", conflict: { conflict_type: "assignment_changed_pending_review" } }] } };
const semCid = { data: { conflicts: [{ id: "c1", conflict: { conflict_type: "assignment_changed_pending_review" } }] } };
const retent = { data: { conflicts: [{ client_action_id: "c1", conflict: { conflict_type: "acknowledgement_not_required" } }] } };
const eviSemStatus = { data: { conflict: [{ client_evidence_id: "c1" }] } };
console.log("C3 regra do app, resposta normal OS:", JSON.stringify(ok));
console.log("C3 sem a chave 'conflicts' (OS):", JSON.stringify(destinoOS(semChave, ["c1"])), "(vistoria):", JSON.stringify(destinoVist(semChave, ["c1"])));
console.log("C3 conflito sem client_action_id (OS):", JSON.stringify(destinoOS(semCid, ["c1"])));
console.log("C3 conflito de codigo retentavel (vistoria):", JSON.stringify(destinoVist(retent, ["c1"])));
console.log("C3 evidencia sem balde conflicts nem status:", JSON.stringify(destinoEvi(eviSemStatus, ["c1"])));
```

### item2.mts — md5 cfe0bceaa7e4eb4a20db3e35244370ff
```ts
// ITEM 2 — upload pela OS do recibo; evidencia field_* com work_order_id; tenant_wide em OS inexistente. argv: WT out tag
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { makeCtx, LE } from "./lib.mts";
import { evidencia, baldes, sanit } from "./acoes.mts";
import { destinoUpload } from "./apprule.mts";
const [WT, OUT, TAG] = process.argv.slice(2);
const c = await makeCtx(WT, TAG);
const R: any = { tag: TAG };
try {
  const osU = await c.criarOs(); const dU = await c.despachar(osU, "tecA");
  const osA2 = await c.criarOs(); await c.despachar(osA2, "tecA");
  const osA = await c.criarOs(); await c.despachar(osA, "tecC");
  const ids = { osU, osA2, osA, tecA: c.U.tecA.id, tecB: c.U.tecB.id, tecC: c.U.tecC.id };
  const fotos = evidencia(osU, ["evidence.work_order_photo", "evidence.work_order_photo", "evidence.work_order_photo", "evidence.work_order_photo"]);
  const f2 = evidencia(osA2, ["evidence.work_order_photo"]);
  const reg = await c.lote(LE, "tecA", [...fotos, ...f2]);
  R.registro_tecA = Object.values(baldes(reg, "client_evidence_id")).map((b: any) => b.balde);
  const st = () => ({ storage: c.listDir(c.dirEvid).length, audit: c.audit().length });
  const s0 = st(); const u0 = await c.upload("tecA", fotos[0].client_evidence_id); const s1 = st();
  R.ctrl_tecA_antes_da_troca = { http: u0.status, status: u0.body?.data?.status ?? u0.body?.status, storage: [s0.storage, s1.storage], app: destinoUpload(u0.status, u0.body?.data?.status ?? u0.body?.status) };
  R.troca = (await c.reatribuir(dU.body.data.id, "tecC")).status;
  const formas: any = {};
  for (const [nome, ev, campo] of [["F1_sem_campo", fotos[1], undefined], ["F2_campo_osU", fotos[2], osU], ["F3_campo_osA2_dele", fotos[3], osA2]] as any) {
    const a = st(); const r = await c.upload("tecA", ev.client_evidence_id, campo); const b = st();
    formas[nome] = { http: r.status, code: r.body?.error?.code, reason: r.body?.error?.reason, corpo: sanit(r.body, ids), storage_antes_depois: [a.storage, b.storage], audit_antes_depois: [a.audit, b.audit], app: destinoUpload(r.status) };
  }
  R.upload_ex_tecnico = formas;
  // controle G-POS: recibo da osA2 (dele) segue gravando
  const g = st(); const ug = await c.upload("tecA", f2[0].client_evidence_id); R.ctrl_tecA_osA2 = { http: ug.status, storage: [g.storage, st().storage] };
  // controle 1: tecC com recibo proprio grava
  const fc = evidencia(osU, ["evidence.work_order_photo"]); const rc = await c.lote(LE, "tecC", fc);
  const a1 = st(); const uc = await c.upload("tecC", fc[0].client_evidence_id); const b1 = st();
  R.ctrl1_tecC = { registro: Object.values(baldes(rc, "client_evidence_id")).map((b: any) => b.balde), http: uc.status, status: uc.body?.data?.status ?? uc.body?.status, storage: [a1.storage, b1.storage], audit: [a1.audit, b1.audit], app: destinoUpload(uc.status, uc.body?.data?.status ?? uc.body?.status) };
  // (c) field_* do nunca-tecnico tecB com work_order_id = osA
  const fld = evidencia(osA, ["evidence.field_photo", "evidence.field_observation", "evidence.field_signature"]);
  const rf = await c.lote(LE, "tecB", fld);
  const bf = baldes(rf, "client_evidence_id");
  R.field_tecB = fld.map((x: any) => ({ tipo: x.type, balde: bf[x.client_evidence_id]?.balde, recibo_wo: (rf.body?.data?.accepted ?? []).find((y: any) => y.client_evidence_id === x.client_evidence_id)?.work_order_id === osA ? "<osA>" : "outro/ausente", scope: (rf.body?.data?.accepted ?? []).find((y: any) => y.client_evidence_id === x.client_evidence_id)?.server_state?.scope }));
  const fa = st(); const uf = await c.upload("tecB", fld[0].client_evidence_id, osA); const fb = st();
  R.field_tecB_upload = { http: uf.status, storage: [fa.storage, fb.storage] };
  // leituras da OS alheia pelo manager: a evidencia field_* aparece?
  const cids = fld.map((x: any) => x.client_evidence_id).concat(fc.map((x: any) => x.client_evidence_id));
  const leit: any = {};
  for (const p of ["/api/v1/work-orders/" + osA, "/api/v1/work-orders/" + osA + "/timeline", "/api/v1/work-orders/" + osA + "/attachments", "/api/v1/attachments?entityType=work_order&entityId=" + osA, "/api/v1/mobile/checklist-runs?workOrderId=" + osA, "/api/v1/work-orders/" + osU, "/api/v1/work-orders/" + osU + "/timeline", "/api/v1/work-orders/" + osU + "/attachments"]) {
    const r = await c.req(p, { headers: c.h("mgr") }); const txt = JSON.stringify(r.body);
    leit[p.replace(osA, "<osA>").replace(osU, "<osU>")] = { http: r.status, cids_field_tecB_achados: fld.filter((x: any) => txt.includes(x.client_evidence_id)).length, cid_tecC_achado: txt.includes(fc[0].client_evidence_id) };
  }
  R.leituras_manager = leit;
  // (d) tenant_admin evidencia work_order_* em OS inexistente
  const inex = evidencia(randomUUID(), ["evidence.work_order_observation", "evidence.work_order_photo", "evidence.work_order_signature"]);
  const ri = await c.lote(LE, "adm", inex);
  R.tenant_wide_os_inexistente = Object.values(baldes(ri, "client_evidence_id")).map((b: any) => b.balde + "/" + (b.reason ?? "-"));
  R.cids = cids.length;
} catch (e: any) { R.erro = String(e?.stack ?? e); } finally { await c.close(); fs.writeFileSync(OUT, JSON.stringify(R, null, 1)); }
```

### item3.mts — md5 cd14d50b7a63e7856cdbea1d1e6939e9
```ts
// ITEM 3 — idempotencia: K1-K4 legitimas reenviadas; por estado; K5 6x + reset; payload diferente; S-KM-RESTART. argv: WT out tag
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { makeCtx, LV, LE, LO } from "./lib.mts";
import { payloadVist, evidencia, osAcoes, baldes } from "./acoes.mts";
const [WT, OUT, TAG] = process.argv.slice(2);
const c = await makeCtx(WT, TAG);
const R: any = { tag: TAG };
const now = () => new Date().toISOString();
const va = (kind: string, run: string, comp: string, cid = randomUUID()) => ({ client_action_id: cid, type: kind === "complete" ? "checklist.complete" : kind === "marker" ? "checklist.marker_create" : kind === "divergence" ? "checklist.divergence_create" : "checklist.item_answer", local_created_at: now(), payload: payloadVist(kind, run, comp) });
const b1 = (resp: any, id: string, k = "client_action_id") => { const x = baldes(resp, k)[id]; return x ? x.balde + "/" + (x.conflict_type ?? x.reason ?? "-") : "AUSENTE(http " + resp.status + ")"; };
try {
  const comp = (await c.modelo("adm")).comp;
  const est = async (wo: string, run: string) => { const o = (await c.req("/api/v1/work-orders/" + wo, { headers: c.h("mgr") })).body?.data; const t = (await c.req("/api/v1/work-orders/" + wo + "/timeline", { headers: c.h("mgr") })).body; const d: any = await c.svcRun(run);
    return JSON.stringify({ st: o?.status, km: [o?.mileageStart, o?.mileageEnd], tl: (t?.data ?? t?.items ?? []).length, run: d.run.status, ans: d.answers.length, mk: d.markers.length, ack: d.acknowledgements.length, ansVal: d.answers.map((a: any) => JSON.stringify(a.value ?? a.answer ?? null)).join("|") }); };
  // (a) K1-K4 legitimas antes da troca
  const osK = await c.criarOs(); const dK = await c.despachar(osK, "tecA"); const runK = (await c.runs(osK))[0].id;
  const K1 = va("answer", runK, comp); const K2 = va("complete", runK, comp); const K3 = evidencia(osK, ["evidence.work_order_observation"])[0]; const K4 = osAcoes(osK, 2000)[1];
  const envia = async () => { const r1 = await c.lote(LV, "tecA", [K1]); const r3 = await c.lote(LE, "tecA", [K3]); const r4 = await c.lote(LO, "tecA", [K4]); const r2 = await c.lote(LV, "tecA", [K2]);
    return { K1: b1(r1, K1.client_action_id), K2: b1(r2, K2.client_action_id), K3: b1(r3, K3.client_evidence_id, "client_evidence_id"), K4: b1(r4, K4.client_action_id) }; };
  const pa: any = { p1: await envia(), e1: await est(osK, runK) };
  pa.troca = (await c.reatribuir(dK.body.data.id, "tecC")).status;
  pa.p2_mesmo_processo = await envia(); pa.e2 = await est(osK, runK);
  c.resetSync(); pa.p3_apos_reset = await envia(); pa.e3 = await est(osK, runK);
  pa.estado_inalterado_desde_p1 = pa.e1 === pa.e2 && pa.e2 === pa.e3;
  R.a_K1K4 = pa;
  // controle 1 (reset real) e 2 (comparador acha duplicacao): tecC tecnico atual de osC
  const osC = await c.criarOs(); await c.despachar(osC, "tecC"); const runC = (await c.runs(osC))[0].id;
  const kc = osAcoes(osC, 3000)[1]; const ac = va("answer", runC, comp);
  const x1 = [b1(await c.lote(LO, "tecC", [kc]), kc.client_action_id), b1(await c.lote(LV, "tecC", [ac]), ac.client_action_id)];
  const tl0 = await est(osC, runC); c.resetSync();
  const x2 = [b1(await c.lote(LO, "tecC", [kc]), kc.client_action_id), b1(await c.lote(LV, "tecC", [ac]), ac.client_action_id)];
  const tl1 = await est(osC, runC);
  const m1 = va("marker", runC, comp); const m2 = va("marker", runC, comp);
  const e0 = JSON.parse(await est(osC, runC)).mk; await c.lote(LV, "tecC", [m1]); await c.lote(LV, "tecC", [m2]); const e1 = JSON.parse(await est(osC, runC)).mk;
  R.ctrl1_reset_real = { antes_reset: x1, depois_reset: x2, estado_antes: tl0, estado_depois: tl1 };
  R.ctrl2_comparador = { markers_antes: e0, markers_depois_2_cids: e1, viu_duplicacao: e1 === e0 + 2 };
  // (b) por estado, escopo antes
  const osS = await c.criarOs(); const dS = await c.despachar(osS, "tecA"); const runS = (await c.runs(osS))[0].id;
  await c.reatribuir(dS.body.data.id, "tecC");
  const dvC = va("divergence", runS, comp); const cpC = va("complete", runS, comp);
  const pb: any = { tecC: [b1(await c.lote(LV, "tecC", [dvC]), dvC.client_action_id), b1(await c.lote(LV, "tecC", [cpC]), cpC.client_action_id)] };
  const sb0 = await est(osS, runS);
  for (const q of ["tecB", "tecA"]) { const dv = va("divergence", runS, comp); const cp = va("complete", runS, comp);
    pb[q] = [b1(await c.lote(LV, q, [dv]), dv.client_action_id), b1(await c.lote(LV, q, [cp]), cp.client_action_id)]; }
  const ansC = va("answer", runS, comp); await c.lote(LV, "tecC", [ansC]);
  pb.tecB_com_cid_alheio_answer = b1(await c.lote(LV, "tecB", [{ ...ansC }]), ansC.client_action_id);
  pb.estado_igual = sb0 === (await est(osS, runS)) ? "igual" : "MUDOU(" + sb0 + " -> " + (await est(osS, runS)) + ")";
  pb.run_status = JSON.parse(sb0).run;
  R.b_por_estado = pb;
  // (c) K5 novo (coletado antes da troca) 6x + reset + payload diferente
  const osF = await c.criarOs(); const dF = await c.despachar(osF, "tecA"); const runF = (await c.runs(osF))[0].id;
  const K5o = osAcoes(osF, 4000)[1]; const K5v = va("marker", runF, comp); const K5e = evidencia(osF, ["evidence.work_order_observation"])[0];
  await c.reatribuir(dF.body.data.id, "tecC");
  const f0 = await est(osF, runF); const aud0 = c.audit().length; const seq: string[] = [];
  const manda = async (o = K5o, v = K5v, e = K5e) => [b1(await c.lote(LO, "tecA", [o]), o.client_action_id), b1(await c.lote(LV, "tecA", [v]), v.client_action_id), b1(await c.lote(LE, "tecA", [e]), e.client_evidence_id, "client_evidence_id")].join(" ; ");
  for (let i = 0; i < 6; i++) seq.push("envio" + (i + 1) + ": " + await manda());
  c.resetSync(); seq.push("apos_reset: " + await manda());
  seq.push("payload_diferente_mesmo_cid: " + await manda({ ...K5o, payload: { ...K5o.payload, mileage_start: 9999 } }, { ...K5v, payload: { ...K5v.payload, position_label: "Capo" } }, { ...K5e, payload: { ...K5e.payload, note: "outra" } }));
  const f1 = await est(osF, runF);
  R.c_K5 = { seq, estado_igual: f0 === f1, estado: f1, audit: [aud0, c.audit().length], recibo_evid: !!c.receipt("tecA", K5e.client_evidence_id) };
  // (d) S-KM-RESTART (via web, igual na base): tecW por perfil
  const pW = await c.perfil("tecW"); const pW2 = await c.perfil("tecW2");
  const osM = await c.criarOs(); await c.atribuirPerfil(osM, pW.id);
  const K = { client_action_id: randomUUID(), type: "work_order.mileage", local_created_at: now(), payload: { work_order_id: osM, mileage_start: 500 } };
  const km = async () => (await c.req("/api/v1/work-orders/" + osM, { headers: c.h("mgr") })).body?.data?.mileageStart;
  const d: any = { p1: b1(await c.lote(LO, "tecW", [K]), K.client_action_id), km1: await km() };
  d.troca = (await c.atribuirPerfil(osM, pW2.id)).status;
  d.p2 = b1(await c.lote(LO, "tecW", [K]), K.client_action_id); c.resetSync();
  d.p3 = b1(await c.lote(LO, "tecW", [K]), K.client_action_id); d.km_fim = await km();
  R.d_s_km_restart = d;
} catch (e: any) { R.erro = String(e?.stack ?? e); } finally { await c.close(); fs.writeFileSync(OUT, JSON.stringify(R, null, 1)); }
```

### item3b.mts — md5 60a6d5518e364d1a439d57611a69d6d6
```ts
// ITEM 3 extra — nunca-tecnico reenviando o client_action_id de uma resposta ja gravada pelo tecnico atual (cid durável antes do escopo)
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { makeCtx, LV } from "./lib.mts";
import { payloadVist, baldes } from "./acoes.mts";
const [WT, OUT, TAG] = process.argv.slice(2);
const c = await makeCtx(WT, TAG); const R: any = { tag: TAG };
try {
  const comp = (await c.modelo("adm")).comp;
  const os = await c.criarOs(); await c.despachar(os, "tecC"); const run = (await c.runs(os))[0].id;
  const a = { client_action_id: randomUUID(), type: "checklist.item_answer", local_created_at: new Date().toISOString(), payload: payloadVist("answer", run, comp) };
  const r1 = await c.lote(LV, "tecC", [a]); R.tecC = baldes(r1)[a.client_action_id]?.balde;
  const r2 = await c.lote(LV, "tecB", [a]); const x = (r2.body?.data?.already_applied ?? [])[0];
  R.tecB_mesmo_cid = baldes(r2)[a.client_action_id]?.balde; R.tecB_recebe_server_state = x ? Object.keys(x.server_state ?? {}).join(",") : "-";
  R.answers = (await c.svcRun(run)).answers.length;
} catch (e: any) { R.erro = String(e?.stack ?? e); } finally { await c.close(); fs.writeFileSync(OUT, JSON.stringify(R)); }
```

## Fechamento

- objeto no fim: `git ls-remote` = b198fe35… = `gh pr view 440` headRefOid (OPEN) → igual; origin/main no fim 2a49b015 (= início).
- residual R5 (ex-técnico só de despacho reatribuído antes do deploy → `rejected`): declarado no relatório do dev (B-O6R-07c-b1-dev.md:67, :167 "pendência nova sugerida"); `git grep` em `agent-orchestration/controle/` no objeto e na origin/main: não registrado como pendência. Não medível em memória (exige estado anterior ao deploy + backfill, matéria da C3). Fica em pendências aceitas, sem N.
- limpeza: 13 arquivos de src/ trocados 3× e restaurados 3× (hash-object = blob do objeto 13/13; porcelain 0); storage de cada execução apagado (0 diretórios j07cb1-c2o-* no tmp); 0 processos com `w-j07cb1c2o`; `git worktree remove --force C:/Users/AMP/w-j07cb1c2o` ec=0, diretório e registro ausentes; 0 containers `j07cb1-c2*` (nunca subi); subpasta do scratch `c2o-07cb1` removida (só ela); base viva intocada; em w-07cb1 escrevi só c2-opus-evidencia.md e c2-voto.json; livre em C: 8.6G.
- quedas/pausa: nenhuma.
- **VOTO: APROVADO** (detalhe em c2-voto.json).
