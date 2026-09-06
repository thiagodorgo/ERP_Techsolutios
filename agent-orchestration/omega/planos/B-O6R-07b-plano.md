# PLANO B-O6R-07b — `fix/o6r07b-uploads` (Ω6R-SEC-004 · P1 · evidence / attachments / mobile)

**Papel:** `planejador-mestre` (Fable — `D-PLANEJADOR-MODELO-FABLE`). **Data:** 2026-09-06.
**Terreno medido:** `origin/main` = **`e55245a`** (#379), lido no worktree `.claude/worktrees/status-read`
(leitura, sem execução). Este arquivo nasce num worktree PRÓPRIO, documental, `.claude/worktrees/o6r07b-plano`
(branch `docs/o6r07b-plano`, base `e55245a`), sem `npm ci`, sem junction. **Quem executa: OUTRO agente**
(§C7.4-bis — quem planeja não desenvolve nem vota). Nada aqui é herdado de ata sem releitura: cada afirmação
do §2 traz arquivo:linha do head `e55245a`.

**Forma de medição, dita às claras:** este plano mede por LEITURA (Read/rg sobre `e55245a`), não por
execução. O que exige execução (baseline por execução, vermelho-controle, helmet no fio) está marcado como
obrigação do dev na abertura da branch (§8). Onde o plano-mãe afirmou algo que a leitura de hoje contradiz,
está registrado como ERRATA (§0 e §2.5), não silenciado (§A2).

---

## §0 · Relação com `B-O6R-07-plano.md` — o que se reaproveita, o que era só do 07a, o que fica emendado

O plano-mãe (`agent-orchestration/omega/planos/B-O6R-07-plano.md`, corpo de 2026-09-01 medido em `53e44d3`,
+ EMENDA E1, EMENDA E2 e CICLO 2, todos do 07a) continua sendo o registro do bloco `B-O6R-07` inteiro. **Este
plano é o plano de execução do sub-bloco 07b e VENCE o plano-mãe em tudo que disser respeito ao 07b.** Ele não
reescreve o plano-mãe (append-only da casa); onde divergir, vale este. Mapa seção a seção:

| Seção do plano-mãe | Situação para o 07b |
|---|---|
| §1 objetivo/atores/achados/pendência-mãe/fatiamento 07a÷07b | **Reaproveitado.** O fatiamento (2 PRs, arquivos disjuntos, ordem 07a→07b, gate CHECKLIST P1 = 06 E 07a E 07b) está executado pela metade: 07a mergeou no #369 (`dc8168b`, 2 ciclos). Resta o 07b. |
| §2.1, §2.2, §2.4 (SEC-002, SEC-003, pino KDF) | **Só do 07a.** Não se relê aqui. |
| §2.3 (SEC-004 — "ATIVO nas 2 vias citadas + 3 irmãs") | **Reaproveitado na direção, EMENDADO na medição** (§2.5 deste plano): (i) checklists e damages **não têm scanner nenhum** — nem Noop —, o plano-mãe os tratou como "mesmo bloco busboy" e deixou implícito que só o MIME faltava; (ii) "Sem X-Content-Type-Options" é **FALSO**: `helmet()` é global (`src/app.ts:101`, `src/portal-app.ts:24`) e o helmet 8.1.0 emite `nosniff` por default; (iii) download inline existe em **4 routers**, não só em `attachment.routes.ts`; (iv) a via mobile de evidência **não tem rota de download** (nada serve `evfile_*`); (v) há superfícies de METADADO (JSON/sync) que declaram MIME/URL/chave sem passar bytes — a classe que o 07a deixou escapar — enumeradas no §2.3 e tratadas como pendência nomeada, não como escopo. |
| §2.5 (detecção = 0; baseline estática 58) | **Emendado**: a baseline do 07b é outra (§2.6); o "detecção = 0" continua verdadeiro para o SEC-004 (nenhum teste sobe bytes que mentem sobre o tipo). |
| §3.1–3.6 (07a) | **Só do 07a.** Congelados pela junta do 07a (C2·5 PROIBIDO). |
| §3.7 scanner fail-closed | **Reaproveitado + emendado**: Noop **não** passa a ser "declarado por env em cada teste" (isso tocaria dezenas de suítes por nada); o default é por `NODE_ENV` e `noop` em produção é recusado no BOOT (§3.2). `503` preservando blob: mantido. |
| §3.8 magic bytes in-house | **Reaproveitado + emendado**: o módulo de referência da casa para parse de header em buffer puro já existe e foi aprovado por junta-5 — `src/modules/owner-portal/image-header-guard.ts` (regra do espelho, §3.3). A allowlist configurável passa a ser validada no BOOT contra o conjunto sniffável (§3.2). |
| §3.9 download endurecido | **Emendado**: `attachment` para **TODOS** os tipos, inclusive imagem verificada — medido que nenhum cliente atual depende de `inline` (§2.4/§7). E o tipo servido vem dos BYTES no ato do download (re-sniff), não do banco — o que resolve o legado sem migration (§3.5). |
| §3.10 contrato/modelagem | **Reaproveitado**: ZERO migration continua verdadeiro para o 07b, agora com o porquê medido (§4). |
| §4 (prova; linhas 7–9) | **Reaproveitado na regra-mãe (vermelho-controle por sonda), EMENDADO nos pisos**: 07b sobe de "≥9 casos" para **≥40** (§6), porque o censo achou 5 vias de bytes + 4 egressos + 2 vias sem scanner e o mandato exige mutação que quebre o build. |
| §5 PERMITIDO 07b | **Reaproveitado + ampliado nominalmente** (§5): entram `checklist.service.ts`/`damage.service.ts` (só o método de upload), os routers de download (só o ramo de arquivo), `checklist-storage.types.ts` e os 2 providers (para a marca de verificação), `src/config/env.ts` + `.env.example`. |
| §5 PROIBIDO "colisão com o ciclo 5" | **OBSOLETO como colisão** — o ciclo 5 mergeou no #371 (`99f1840`). Os arquivos seguem fora do escopo porque o 07b **não precisa** deles, não porque colidam. |
| §6 bateria/armadilhas | **Reaproveitado**, com base da branch `e55245a` e portas re-medidas (§8). |
| §7.1 matriz de colisão | **Emendada**: o paralelo hoje não é o ciclo 5 — é `B-O6R-04` e `B-O6R-06`, liberados em paralelo pelo porteiro do #369 (l.184) — módulos disjuntos; registro compartilhado conflita textualmente (mesmo remédio). |
| §8 junta 07b (C1 conteúdo · C2 contrato mobile · C3 contrato/regressão; unanimidade de 3) | **Reaproveitado** — com `agente-secops` ocupando a C1 e o `critico-adversarial` atacando ESTE plano antes do código (§11). |
| §8 registro (backfill #368, `blocks_completed` 158→159) | **Superado pelos fatos**: o backfill do #368 já foi pago; `blocks_completed` hoje é **160** (#377); o 07b conta **160→161** (§9). |

---

## §1 · Objetivo, ator, fluxo origem→destino, fila e paralelismo

**Objetivo:** fechar `Ω6R-SEC-004` (`docs/revisoes/O6R/achados.jsonl` l.29, `status: ativo`, P1): *"Scanner
default sempre clean, MIME vem do cliente e download usa inline com esse MIME"* → impacto *"bytes hostis podem
ser armazenados e entregues inline a usuários"*; aceite do achado (campo `teste`): *"Infected, MIME divergente e
scanner down não persistem nem baixam."* Pendência-mãe `P-O6R-B07` (`pendencias.md` l.2917-2973): status
*"ABERTA — resta 1 P1 (Ω6R-SEC-004, sub-bloco 07b)"*, aceite *"scanner fail-closed com magic bytes"*, campo
**Bloqueia** que ainda vale: *"feature em evidências/anexos/upload mobile"*.

**Atores:** técnico de campo (app Flutter, fila offline) sobe evidência e anexo de checklist; operador/gestor
(console web) sobe anexo genérico, de OS e de dano; qualquer consumidor autenticado baixa anexo pelo console;
o proprietário (owner-portal) vê foto já minimizada. **Após o bloco:** todo byte que entra passa por UM gate
(sniff de assinatura + scanner fail-closed) antes de tocar o storage, e todo byte que sai leva tipo derivado
dos próprios bytes, `Content-Disposition: attachment` e `nosniff`.

**Fluxo origem→destino (uma linha por via — censo completo no §2):**
cliente → multipart (busboy) → parser da via (allowlist declarada, tamanho) → checagens da via (posse,
idempotência) → **GATE** (`verifyUploadContent`: sniff → scanner) → `save*File` (exige a marca de verificação)
→ provider (local/S3) → linha `stored`. Download: linha `stored` → provider `getObject` → **`sendVerifiedFile`**
(peek dos primeiros bytes → tipo servido → headers) → cliente.

**Fila — FATO medido hoje e DECISÃO PENDENTE DO DONO (não resolvida aqui):** `docs/revisoes/O6R/PLANO_O6R.md`
l.3 manda *"P0 precede P1"*. O 07b carrega **1 P1** enquanto **6 P0** seguem abertos no `achados.jsonl`
(`kpis-latest.json → production_readiness`: `p0_abertos: 6`): `B-O6R-06` 2 (DIN-005, DIN-007), `B-O6R-04` 2
(DAT-002, DAT-003), `B-O6R-03` 1 (DIN-009), `B-O6R-07c` 1 (SEC-002 `parcialmente_superado`, residual em
`P-O6R-SUBRECURSO-OBJECT-SCOPE`). O start do 07b foi autorizado assim mesmo pelo porteiro pós-merge
(`votos/B-O6R-02-ciclo5-consolidado/04-porteiro-pos-merge-ed0a692.md` l.105-137: *"LIBERADO COM RESSALVA:
B-O6R-07b"*, com a tabela mostrando que nenhuma pendência com BLOQUEIA alcança a superfície do 07b) e, antes,
pelo porteiro do #369 (`votos/O6R-07a/00c-porteiro-pos-merge-369.md` l.184: *"LIBERADO COM RESSALVA: B-O6R-07b
— e, em paralelo, B-O6R-04 e B-O6R-06; B-O6R-07c depois do 07b"*). **Este plano registra a tensão e não a
resolve:** o dev abre em `pendencias.md` a entrada `P-GOV-FILA-P1-ANTES-DE-P0` (dono = dono, MÉDIA) com estes
números e as duas citações, e a ata da junta do 07b a cita. Nenhuma decisão de fila é tomada por agente.

**Paralelismo declarado:** `B-O6R-04` (`fix/inventory-consistency`, módulo inventory) e `B-O6R-06`
(`fix/billing-durability`, módulos cloud-usage/cloud-costs) podem estar em execução — `src/**` disjunto do 07b
por construção; **registro compartilhado** (`Kpis/*`, `pendencias.md`, `achados.jsonl`, `REGISTRO_ACHADOS`,
`status-geral.md`, `log-execucao.md`, `API_CONTRACTS.md`) conflita textualmente para o segundo a mergear —
remédio do plano-mãe §7.1: rebase + re-append (history é append-only) + re-medição das contagens + `kpi-freeze`
re-rodado. `B-O6R-07c` só começa depois do 07b (sequência, não bloqueio) e **recebe** deste plano duas
pendências (§12).

---

## §2 · Diagnóstico MEDIDO em `e55245a` — o censo das vias (enumerado por mim; "5" era texto herdado)

Método: `rg` de `Busboy(`/`multipart` em `src/**` (parsers), de `.scan(`/`NoopEvidenceScanner` (scanner), de
`Content-Disposition`/`setHeader("Content-Type"`/`.type(` (egresso), de `base64`/`data:`/`file_url`/
`storage_key` (bytes ou chave fora do multipart) — e leitura integral dos arquivos citados. Delta desde o head
do plano-mãe (`git diff --stat 53e44d3 e55245a` na superfície SEC-004): **só `work-order.routes.ts`** (+10/−2,
o `work_orders:approve` do 07a) — nada da superfície de upload/download mudou; toda linha abaixo foi relida
mesmo assim.

### 2.1 · Ingresso de BYTES — **5 vias** (o número herdado está certo; a composição, não)

| # | Rota | Parser (busboy) | Allowlist declarada | Scanner hoje | Storage | Egresso |
|---|---|---|---|---|---|---|
| **V1** | `POST /api/v1/mobile/evidence-uploads` (`mobile.routes.ts:186-193`) | `mobile-evidence-upload.ts:218-301` | `EVIDENCE_ALLOWED_MIME_TYPES` = jpeg/png (`evidence-storage.ts:7`), checado no MIME **declarado** (l.117, `400 unsupported_content_type`; `normalizeContentType` l.337-343 aceita `application/octet-stream` + campo `content_type`) | `NoopEvidenceScanner` como default de módulo (l.54), chamado em l.133 | `LocalProtectedEvidenceStorageProvider.store` (`evidence-storage.ts:67-93`; extensão `.png`/`.jpg` pelo MIME declarado) | **NENHUM** — `evfile_*` não é servido por rota alguma (`rg evfile_ src/` → só o provider) |
| **V2** | `POST /api/v1/attachments` (`attachment.routes.ts:47-52`) | `attachment.storage.ts:68-155` | `config.allowedMimeTypes` (env `CHECKLIST_STORAGE_ALLOWED_MIME_TYPES`, default `image/jpeg,image/png,image/webp,application/pdf` — `env.ts:548-551`) no MIME declarado (l.102, `415 unsupported_media_type`) | Noop default de módulo (l.53), chamado em `attachment.service.ts:71` (após 409 de idempotência) | `getDefaultChecklistStorageProvider().save` (l.165) com `mimeType` declarado | **E1** |
| **V3** | `POST /api/v1/work-orders/:workOrderId/attachments` | `work-order-attachment.storage.ts:65-148` | idem V2 (l.99, 415) | Noop (l.50), chamado em `work-order-attachment.service.ts:59` | idem (l.157) | **E2** |
| **V4** | `POST /api/v1/mobile/checklist-runs/:runId/attachments` — ramo multipart (`checklist.controller.ts:196-209`) | `checklist-attachment.storage.ts:52-166` | idem (l.95, mas **`400 mime_type_not_allowed`**; tamanho excedido também é `400`, l.103) | **NENHUM** — `checklist.service.ts:394` chama `saveChecklistAttachmentFile` direto; `rg scan src/modules/checklists` → zero | idem (l.175) | **E4** |
| **V5** | `POST /api/v1/damages/:damageId/attachments` | `damage-attachment.storage.ts:64-168` | idem (l.105, 415) | **NENHUM** — `damage.service.ts:314` salva direto | idem (l.177) | **E3** |

Comum às 5: `mimeType = info.mimeType.toLowerCase()` do busboy (o que o cliente escreveu no part), a allowlist
compara ESSE valor, e é ESSE valor que vai para `save(...mimeType)` → `ContentType` no S3
(`s3-checklist-storage.provider.ts:58`) e `mime_type`/`content_type` na linha. `rg -n -i "magic|sniff|signature"
src/modules/{evidence,attachments,checklists,damages,work-orders,mobile}` → **zero**. O único parser de header
de imagem do repo é `owner-portal/image-header-guard.ts` (PNG/JPEG, dimensões — não é usado por nenhuma via de
upload).

### 2.2 · Egresso de BYTES — **5 rotas** (4 na classe do achado + 1 já endurecida)

| # | Rota | `Content-Type` | `Content-Disposition` | `nosniff` |
|---|---|---|---|---|
| **E1** | `GET /api/v1/attachments/:attachmentId/download` — `attachment.routes.ts:73-86` | `result.file.mimeType` = `object.mimeType ?? attachment.contentType ?? octet-stream` (`attachment.storage.ts:206`) — no local, `getObject` **não devolve mimeType** (`local-checklist-storage.provider.ts:41-52`) → cai no `contentType` da LINHA (declarado pelo cliente); no S3, `ContentType` gravado no save (idem declarado) | `inline; filename="…"` (l.79; escape só de `"`, `\`, CR/LF) | **sim, pelo helmet global** (`app.ts:101`; `node_modules/helmet/index.mjs:241` `X-Content-Type-Options: nosniff`) |
| **E2** | `GET /api/v1/work-orders/:workOrderId/attachments/:attachmentId/download` — `work-order.routes.ts:276-289` | idem (`work-order-attachment.storage.ts:197`) | `inline` (l.283) | sim (helmet) |
| **E3** | `GET /api/v1/damages/:damageId/attachments/:attachmentId/download` — `damage.routes.ts:108-121` | idem (`damage-attachment.storage.ts:222`) | `inline` (l.115) | sim (helmet) |
| **E4** | `GET /api/v1/mobile/checklist-runs/:runId/attachments/:attachmentId/download` — `checklist.routes.ts:210-223` | idem (`checklist-attachment.storage.ts:217`) | `inline` (l.217) | sim (helmet) |
| **E5** | `GET /portal/v1/owner/photos/:opaqueRef` — `owner-portal.routes.ts:32-35, 52-54` | **fixo pelo servidor**: `image/jpeg` re-codificado por Jimp após `assertSafeImageDimensions` (`owner-portal.photo-pipeline.ts:57-86`) | ausente (inerte: bytes re-codificados) | sim (`portal-app.ts:24`) |

E5 foi endurecido pela junta-5 do Ω5P PR-17b e **não se toca** (§5). E1–E4 são a classe do achado: tipo do
cliente + `inline`. A afirmação do plano-mãe "sem X-Content-Type-Options" está **errada** — o header já existe
por helmet; o que o 07b faz é **afirmá-lo no teste** (regressão se alguém desligar `xContentTypeOptions`) e
setá-lo explicitamente no helper de envio (cinto e suspensório, custo zero).

### 2.3 · Superfícies de METADADO (cliente declara MIME/URL/chave SEM passar bytes) — a classe que o 07a deixou escapar

Censo feito ANTES de declarar o número, como manda `P-O6R-SUBRECURSO-OBJECT-SCOPE` (l.6558: *"censar a
superfície de sync antes de declarar"*). Nenhuma delas recebe bytes por HTTP, logo **nenhuma é via de
upload** — mas três delas alimentam o mesmo mecanismo do achado (tipo/chave do cliente servido depois) e
por isso ficam NOMEADAS, com dono, e fora do escopo de código deste bloco (§C7.1-ter(a): pré-existentes,
origem datada abaixo).

| # | Superfície | O que o cliente declara | Efeito medido | Veredito |
|---|---|---|---|---|
| **M1** | `POST /api/v1/mobile/checklist-runs/:runId/attachments` — ramo **JSON** (`checklist.controller.ts:212-216`; `checklist-routes.test.ts:143-152` o exercita) | `fileUrl` (qualquer string ≥1, `checklist.validator.ts:225`), `mimeType` | cria anexo SEM `storageKey` → E4 responde 404 `attachment_file_not_found`; o DTO devolve o `fileUrl` cru quando não há storage gerenciado (`checklist.dto.ts:180-182`); o web só bloqueia caminho Windows (`checklist-attachments.adapter.ts:103-108`) e decide ícone pelo `mimeType` declarado (`ChecklistEvidencePreview.tsx` l.18-19) | pré-existente (Ω3/CHK) · **pendência MÉDIA** `P-O6R-B07B-CHECKLIST-JSON-FILEURL` (§12) |
| **M2** | `POST /api/v1/impound-processes/:processId/inspection/photos` (`impound.routes.ts:126`) | `file_url` (só tamanho, `impound.intake.validators.ts:77-86`), `content_type`, `storage_provider`, **`storage_key`** (`impound.service.ts:379-386`) | **cria `Attachment` `status: "stored"`** com esses valores (`impound-prisma.repository.ts:533-544`) → é servível por **E1** (`/attachments/:id/download` só exige tenant da LINHA + `stored`) e pelo owner-portal (`owner-portal.service.ts:2,167`) — o provider local só impede sair do diretório-base (`resolveSafeStoragePath`), não confere o prefixo de tenant da chave | pré-existente (Ω5P PR-10/17b) · **pendência ALTA** `P-O6R-B07B-IMPOUND-PHOTO-KEY-DO-CLIENTE` (§12). O 07b **neutraliza a metade "tipo"** (E1 passa a servir o tipo dos bytes, `attachment`) e **não** a metade "chave" — é autorização por chave, conserta-se no WRITE (aceitar só `attachmentId` próprio), e o módulo `impound/**` é PROIBIDO aqui |
| **M3** | `POST /api/v1/mobile/sync/checklist-actions` — `payload.value` pode ser data-URI base64 (assinatura/foto) | o binário inteiro, em JSON | **persistido** (`mobile-checklist-sync.ts:684,699`) e devolvido em GET (`checklist.dto.ts:160`); teto = só o `express.json({limit:"2mb"})` de `app.ts:106`; nenhum consumidor web/app renderiza `data:` como imagem (rg em `frontend/src` e `mobile/flutter_app/lib` → só o SVG do mapa) | pré-existente (CHK PR-03) · **pendência MÉDIA** `P-O6R-B07B-DATAURI-NO-VALUE` (§12). Não é o mecanismo do achado (nunca vira `Content-Type`), mas é byte não-verificado no banco |
| **M4** | `POST /api/v1/mobile/sync/evidence-actions` | `content_type` (validado contra jpeg/png, `mobile-evidence-sync.ts:459-465`), chaves proibidas `base64/file_data/local_path/path` (l.84) | só metadado; o upload V1 **não cruza** o `content_type` do recibo com o tipo dos bytes | inofensivo hoje · nota BAIXA (§12), fora do bloco |

`mobile-work-order-sync.ts:406-418` e `expense-management.validators.ts:11-26` **recusam** chaves `base64`/
`receiptbase64` — não são ingresso. `POST /mobile/sync/work-order-actions` não carrega bytes.

### 2.4 · O que os clientes fazem com o download (decide `inline` × `attachment`)

- **Web:** anexos genéricos (`attachments.service.ts:62-68` → `apiBlobRequest` → object URL → `anchor.download`,
  `EntityAttachmentsTab.tsx:135-142,396`), evidências de checklist (`checklist-attachments.adapter.ts:54-75` →
  blob → `<img src={objectUrl}>` em `ChecklistEvidencePreview.tsx:56`) e miniaturas de dano
  (`DamageDetailModal.tsx:287,354` → blob → object URL). **Zero** `window.open`/`<img src="/api/…">` direto
  (`rg` em `frontend/src`). `Content-Disposition` é **inerte** para `fetch`+blob.
- **Flutter:** só a URL de download de anexo de checklist existe em `api_contracts.dart:100`; **nenhum**
  `Image.network`/`Image.memory` sobre rota de download (`rg` em `mobile/flutter_app/lib`).
- Logo `attachment` para todos os tipos **não quebra consumidor atual** — e remove a decisão "inline só para
  imagem verificada" do plano-mãe §3.9, que existia para preservar um preview que **não** é feito por navegação.

### 2.5 · Erratas ao plano-mãe (registradas, não silenciadas — §A2)

1. §2.3 "3 vias irmãs com o mesmo bloco busboy" → duas delas (V4, V5) **não têm scanner** (nem Noop): o 07b
   INTRODUZ o scan ali, não o "torna fail-closed".
2. §2.3 "Sem X-Content-Type-Options" → **falso**; helmet global emite `nosniff` (E1–E5).
3. §3.9 "vias irmãs de download, se o dev medir que existem" → **existem, são 4** (E1–E4) + E5 já endurecida.
4. §3.7 "os testes que hoje dependem do default Noop passam a declará-lo" → **retirado**: default por
   `NODE_ENV`, produção recusa `noop` no boot (§3.2). Declarar env em cada suíte seria ruído sem prova.
5. §3.9 "inline só para tipos de imagem verificados" → **`attachment` para todos** (§2.4).
6. §4 linha 9 "Content-Type = verificado" → precisa-se dizer DE ONDE: dos **bytes no ato do download**
   (re-sniff), porque o banco carrega tipo declarado em toda linha pré-07b e M2 continua gravando tipo do cliente.

### 2.6 · Detecção hoje e baseline

- Suíte verde no head defeituoso (`kpis-latest.json → backend_tests` **2815/2817**, execução real do #371):
  **nenhum** teste sobe bytes que mentem sobre o tipo e espera recusa; os únicos negativos de tipo testam o MIME
  DECLARADO (`work-order-attachments-routes.test.ts:33-38`, `damages-routes.test.ts:255-274`,
  `checklist-attachments.test.ts:149`, `mobile-backend-contracts.test.ts:2107`). Scanner `infected`/`failed`
  só é exercido em V1/V2/V3 com `FakeEvidenceScanner` (`mobile-backend-contracts.test.ts:2052-2064`,
  `attachments-crud.test.ts:230-247`, `work-order-attachments{,-routes}.test.ts`). **Detecção do SEC-004 = 0.**
- **Baseline N (estática por `grep -cE '^\s*test\('`; o dev re-mede POR EXECUÇÃO na abertura):** arquivos-alvo
  `attachments-crud` 11 · `work-order-attachments` 8 · `work-order-attachments-routes` 12 · `damages-routes` 12 ·
  `damages` 7 · `checklist-attachments` 2 · `checklist-storage` 4 · `checklist-routes` 15 · `checklist-routes-db`
  5 · `mobile-backend-contracts` 25 (fatia de evidência ≈4) · `owner-portal-photos` 17 · `rls-tenant-isolation` 2
  · `domain-events` · `impound-notifications-chain` · `checklist-run-lifecycle-db` (citam anexos; rodar como
  regressão). **N = casos que exercem upload/download nas 5 vias ≈ 20** (estática; publicar o real). **Meta M ≥
  2N = ≥ 40 casos novos permanentes** (§6 soma ≥ 44).

---

## §3 · Correção proposta — o desenho (o COMO fino é do dev; aqui vai o QUÊ, o ONDE e o critério)

Princípio único: **o storage recusa byte não verificado, por TIPO (build) e por RUNTIME (marca ligada ao hash),
e existe UM só lugar onde bytes são verificados.** Um caminho novo que não passe por ele não compila; um que
burle o compilador não grava; um parser novo que apareça em `src/` sem estar no censo derruba o guard.

### 3.1 · Gate único — `src/modules/evidence/upload-gate.ts` (NOVO)

- `verifyUploadContent(input: { buffer; declaredMimeType; allowedMimeTypes: readonly string[]; scan: { tenantId;
  evidenceId; clientEvidenceId } }): Promise<UploadVerification>` — na ordem: (1) **sniff** (§3.3): tipo efetivo =
  assinatura dos bytes; sem assinatura reconhecida → `content_unrecognized`; assinatura ∉ allowlist da via →
  `unsupported_media_type`; assinatura ≠ declarado (após normalização da via) → `content_type_mismatch`; (2)
  **scanner** (§3.2): `infected` → `scanner_infected`; `failed` → `scanner_unavailable`; (3) devolve a marca.
  Sniff antes do scanner: barato primeiro, e o scanner só vê tipos bem-formados.
- `UploadVerification` = objeto **marcado** por `Symbol` privado do módulo, carregando `mimeType` verificado,
  `sha256`, `sizeBytes`, `scanner` (nome) e `verifiedAt`. `assertUploadVerification(value, buffer)` confere a
  marca **e** `sha256(buffer) === value.sha256 && buffer.length === value.sizeBytes` — a marca vale para
  AQUELES bytes; reusar a marca de outro buffer ou forjá-la por `as` cai em runtime (`upload_not_verified`).
- Erro do gate é neutro (`UploadGateError { kind, detail }`); **cada via mapeia para a SUA família de código**
  (tabela §4) — nada de erro genérico vazando família nova em contrato existente.
- Rejeição emite **1 linha de log estruturado** (pino `warn`, sem PII, sem path: `via`, `tenantId`, `kind`,
  `declared`, `sniffed`, `sizeBytes`, `sha256`). V1 mantém, além disso, o `evidence.upload.rejected` em memória
  já existente (`mobile-evidence-upload.ts:360-381`) com reason `content_type_mismatch`/`content_unrecognized`.
  Auditoria em `audit_logs` para rejeição nas vias V2–V5 **não** entra (pendência BAIXA, §12).

### 3.2 · Scanner fail-closed por AMBIENTE — `src/modules/evidence/evidence-scanner.factory.ts` (NOVO) + `env.ts`

- `EVIDENCE_SCANNER: z.enum(["noop", "unavailable"]).optional()` em `envSchema` (`src/config/env.ts:186+`),
  exportado em `env` (l.522+) com default **por `NODE_ENV`**: `production` → `unavailable`; `development`/`test`
  → `noop`. **Refinamento no boot** (mesmo idioma dos gates do B-O6R-05, `env.ts:297-510`): `NODE_ENV ===
  "production" && EVIDENCE_SCANNER === "noop"` → `addIssue` *"EVIDENCE_SCANNER=noop is not allowed in
  production"* — produção **não sobe** com scanner que mente. Esquecer a var em produção = `unavailable` =
  fail-closed sem depender de ninguém lembrar.
- `UnavailableEvidenceScanner.scan()` → `{ status: "failed", reason: "scanner_not_configured" }` (vive em
  `evidence-storage.ts` ao lado de `Noop`/`Fake`, mesmo idioma). Resultado nas vias: **503**, nada persistido,
  blob do cliente preservado por contrato (§7).
- `resolveEvidenceScanner()` memoizado; `setEvidenceScannerForTests()`/`resetEvidenceScannerForTests()` no
  registro único; os três `configure*ScannerForTests`/`reset*ScannerForTests` existentes (`mobile-evidence-
  upload.ts:61-73`, `attachment.storage.ts:54-59`, `work-order-attachment.storage.ts:51-56`) viram **wrappers
  finos** do registro — as suítes que os usam não mudam. `new NoopEvidenceScanner()` deixa de existir em
  `src/**` fora da factory (censo §3.6).
- **O que NÃO entra, dito às claras:** antivírus REAL. Um ClamAV é serviço novo (container em compose/fly) —
  categoria "contratação/config de serviço externo" do §C7.1 → **junta-5 + PD**, e mudaria a categoria deste
  bloco. A interface (`EvidenceScanner`) e a env já ficam prontas; o cliente `clamd INSTREAM` in-house via
  `node:net` (zero dependência) é o candidato natural do bloco `P-O6R-B07B-SCANNER-AV-REAL` (§12). Consequência
  honesta: **em produção, até esse bloco, TODO upload responde 503** — não há produção ativa (go-live readiness
  pendente), e a alternativa (Noop) é exatamente o achado. "Quarentena" (guardar o infectado) também não entra:
  reter byte hostil é superfície nova + decisão de retenção; infectado → 422 + log, nada gravado.
- **Staging:** `deploy-staging.yml`/`Dockerfile` — o dev mede qual `NODE_ENV` roda lá (§8). Se não for
  `production`, o default é `noop` e staging fica sem gate real: `.github/**` é PROIBIDO aqui → vira a pendência
  `P-O6R-B07B-STAGING-SCANNER-ENV` (§12), com o valor a setar (`EVIDENCE_SCANNER=unavailable`).

### 3.3 · Magic bytes in-house — `src/modules/evidence/content-sniff.ts` (NOVO; ZERO dependência)

- **Regra do espelho = `src/modules/owner-portal/image-header-guard.ts`** (junta-5 Ω5P PR-17b): buffer puro,
  parse só de HEADER, nunca decodifica, comentários com a fonte de cada offset. O módulo novo NÃO importa o
  guard de dimensões (o cap de 40 MP/20 000 px daquele guard rejeitaria foto legítima de câmera moderna — ex.
  16 320×12 240 ≈ 200 MP — e dimensão não é o achado); copia o **idioma**, não a regra.
- `SNIFFABLE_MIME_TYPES` = `image/jpeg` · `image/png` · `image/webp` · `application/pdf` — exatamente o default
  da allowlist (`env.ts:551`) ∪ `EVIDENCE_ALLOWED_MIME_TYPES`. `sniffMimeType(buffer): SniffableMime | undefined`.
  Tabela **PROVISÓRIA** (a fechar por **PD-O6R-B07B-MAGIC-BYTES**, §11, ANTES de o dev escrever o arquivo):
  JPEG `FF D8 FF` (+ byte de marcador válido) · PNG `89 50 4E 47 0D 0A 1A 0A` (8 bytes; RFC 2083 §3.1) · WebP
  `52 49 46 46 ?? ?? ?? ?? 57 45 42 50` (`RIFF`+tamanho+`WEBP`, 12 bytes) · PDF `25 50 44 46 2D` (`%PDF-`) em
  **offset 0** (a tolerância de 1 024 bytes de lixo antes do header, que leitores aceitam, é o que a PD
  decide — provisório: só offset 0). Buffer menor que a assinatura → `undefined`.
- **Fail-closed no BOOT para a allowlist configurável:** refinamento em `env.ts`: toda entrada de
  `CHECKLIST_STORAGE_ALLOWED_MIME_TYPES` ∉ `SNIFFABLE_MIME_TYPES` → `addIssue` nomeando a entrada. Ninguém liga
  `image/svg+xml`, `text/html` ou `image/heic` por env e ganha um tipo que o gate não sabe verificar.
- Polyglot dito em voz alta: um JPEG com HTML/ZIP anexado ao fim passa o sniff (é um JPEG) e é servido como
  `image/jpeg` + `attachment` + `nosniff` — inerte no navegador; o que **não** é inerte (PDF com JS, ZIP-bomb)
  é território do antivírus real (§3.2), não do sniff. Checar trailer (`FF D9`/`IEND`) é pergunta da PD.

### 3.4 · A marca no STORAGE — é aqui que "caminho novo sem scanner nasce recusado"

- `SaveChecklistStorageObjectInput` (`checklist-storage.types.ts:7-16`) e `EvidenceStorageInput`
  (`evidence-storage.ts:9-16`) ganham `readonly verification: UploadVerification` — **obrigatório**. `npm run
  check` (`tsc` sobre `src/**`, `tsconfig.json include`) **falha** para qualquer chamador em `src/` que não a
  passe: um sexto parser que apareça amanhã e chame `provider.save(...)` sem o gate **não compila** — esta é a
  prova "quebra o BUILD" do mandato (mutação M-B1, §6).
- Os DOIS providers (`local-checklist-storage.provider.ts:22`, `s3-checklist-storage.provider.ts` `save`) e o
  `LocalProtectedEvidenceStorageProvider.store` (`evidence-storage.ts:67`) chamam
  `assertUploadVerification(input.verification, input.buffer)` **antes** de escrever, e gravam
  `mimeType = input.verification.mimeType` (nunca `input.mimeType` declarado; o campo declarado pode até sair
  do tipo de entrada — decisão do dev, desde que nenhum chamador o use). `ContentType` no S3 (l.58) idem.
- Os 5 `save*File` (`attachment.storage.ts:157`, `work-order-attachment.storage.ts:150`,
  `checklist-attachment.storage.ts:168`, `damage-attachment.storage.ts:170`) recebem a marca do chamador e a
  repassam. A extensão do nome (`sanitizeFileName(originalName, mimeType)`) e a extensão de V1 (`.png`/`.jpg`,
  `evidence-storage.ts:75`) passam a derivar do tipo **verificado**.
- **Onde o gate é chamado, via a via (posição = onde o scan já está ou onde deveria estar):**
  V1 `mobile-evidence-upload.ts:133` (no lugar do `evidenceScanner.scan`, DEPOIS dos 400 de sha/size — ordem
  vigente preservada) · V2 `attachment.service.ts:71` (no lugar do scan, DEPOIS do 409 de idempotência e da
  posse) · V3 `work-order-attachment.service.ts:59` (idem) · **V4 `checklist.service.ts:394`** (ANTES do
  `saveChecklistAttachmentFile`, DEPOIS do `assertRunComponent` — scan **nasce** aqui) · **V5
  `damage.service.ts:314`** (ANTES do `saveDamageAttachmentFile`, DEPOIS do `getEntity` — scan **nasce** aqui).
  Consequência: nas 5 vias, 409/403/404 da via precedem 415/422/503 do gate — "não gasta scan num retry já
  resolvido" (comentário vigente em V2/V3) continua verdadeiro.

### 3.5 · Download endurecido — `src/modules/evidence/serve-verified-file.ts` (NOVO), usado por E1–E4

- `sendVerifiedFile(response, file: { body: Buffer | Readable; fileName; sizeBytes? })`: (1) **peek** dos
  primeiros 32 bytes do corpo (Buffer: `subarray`; Readable: lê até ≥32 bytes ou fim e recompõe o fluxo sem
  perder byte — o dev escolhe o mecanismo; o aceite é comportamental: corpo entregue byte-idêntico, medido em
  0 B, 5 B, 32 B e 10 MB); (2) `Content-Type` = `sniffMimeType(head)` se ∈ `SNIFFABLE_MIME_TYPES`, senão
  `application/octet-stream`; (3) `Content-Disposition: attachment; filename="<ASCII seguro>"; filename*=UTF-8''<pct-encoded>`
  (forma a confirmar por **PD-O6R-B07B-DISPOSITION**, §11; o escape atual `/["\\r\n]/g` fica como piso); (4)
  `X-Content-Type-Options: nosniff` explícito (helmet já põe — cinto e suspensório); (5) `Content-Length` de
  `sizeBytes` quando conhecido; (6) headers só são escritos DEPOIS do peek (nada foi enviado antes).
- **O tipo servido NUNCA vem do banco nem do cliente** — vem dos bytes, no ato. É isso que resolve, sem
  migration e sem varredura, (a) toda linha pré-07b gravada com tipo declarado, (b) as linhas de M2 (tipo do
  cliente), (c) S3 `ContentType` legado. Se banco ≠ bytes → serve o dos bytes + `warn` estruturado (sem PII).
  O DTO de listagem continua expondo o `mimeType` gravado (só ícone/rótulo no web) — para linhas novas ele é o
  verificado; para legado, pendência `P-O6R-B07B-LEGADO-MIME` (§12).
- Os 4 `sendResult` (`attachment.routes.ts:71-86`, `work-order.routes.ts:276-289`, `damage.routes.ts:108-121`,
  `checklist.routes.ts:210-223`) trocam o ramo `if (result.file)` por `sendVerifiedFile(...)`; o ramo JSON/204
  não muda. E5 (owner-portal) **não se toca**.

### 3.6 · Censo permanente — `tests/o6r07b-upload-gate-census.test.ts` (NOVO; idioma dos guards da casa)

Precedentes: `financial-entry-link-census.test.ts`, `db-catalog-write-guard.test.ts`, `seed-guard.test.ts`.
Cláusulas, cada uma com a mutação que a deixa vermelha (§6): (C1) todo arquivo de `src/**` com `Busboy(` está
na lista nominal V1–V5; (C2) `.scan(` sobre `EvidenceScanner` só ocorre em `upload-gate.ts`; (C3)
`new NoopEvidenceScanner(`/`new UnavailableEvidenceScanner(` só em `evidence-scanner.factory.ts` (e nas classes);
(C4) identificadores `*ForTests` do gate/factory não são referenciados em `src/**` fora do módulo que os define;
(C5) `writeFile(`/`PutObjectCommand` em `src/modules/**` só nos 3 providers; (C6) nenhum `as UploadVerification`/
`as unknown as UploadVerification` em `src/**`. A mensagem de falha de cada cláusula cita ESTE plano (§3.6) —
quem alargar a lista sabe o que está alargando.

### 3.7 · O que fica DE FORA, com o porquê (para a junta não descobrir sozinha)

Antivírus real e quarentena (§3.2) · `inline` para imagem (§2.4) · cap de dimensão no upload (§3.3) ·
normalização dos códigos pré-existentes de V4 (`400` onde as irmãs usam `415`/`413` — contrato vigente,
`checklist-attachments.test.ts:149` o afirma; pendência BAIXA) · cruzamento `content_type` do recibo × tipo
verificado em V1 (M4; nota BAIXA) · M1/M2/M3 (pendências com dono, §12) · auditoria em banco das rejeições
V2–V5 (log estruturado entra; `audit_logs` não) · re-verificação em lote do legado (pendência) · qualquer
mudança em `mobile/**` ou `frontend/**` (§7 prova que não é preciso).

---

## §4 · Contrato (delta em `API_CONTRACTS.md`, versionado por bloco) e modelagem

**Regra:** os códigos que JÁ existem em cada via não mudam (contrato vigente, testes e app os afirmam); o que o
gate acrescenta usa a **família de código da própria via** e o mesmo `reason` em todas. Preservados: 404
cross-tenant, 409 de idempotência/estado (`already_uploaded`, `evidence_metadata_required`, `work_order_mismatch`),
413/400 de tamanho, 400 de campo, 403 de permissão.

| Via | Sniff: declarado ≠ bytes / sem assinatura / assinatura fora da allowlist | Scanner `infected` | Scanner `failed`/`unavailable` |
|---|---|---|---|
| V1 mobile evidence | **NOVO** `415 UNSUPPORTED_MEDIA_TYPE` · reason `content_type_mismatch` \| `content_unrecognized` \| `unsupported_media_type` (+ evento `evidence.upload.rejected` com o mesmo reason). O `400 unsupported_content_type` do MIME DECLARADO (l.117) **permanece** e roda antes | `422 UNPROCESSABLE_ENTITY / evidence_rejected` (vigente, l.144) | `503 SERVICE_UNAVAILABLE / evidence_scan_failed` (vigente, l.160) |
| V2 attachments | **NOVO** `415 ATTACHMENT_UNSUPPORTED_MEDIA_TYPE` · mesmos reasons (o `415 unsupported_media_type` do declarado, l.103, permanece) | `422 ATTACHMENT_REJECTED / evidence_rejected` (vigente) | `503 ATTACHMENT_SCAN_UNAVAILABLE / scan_unavailable` (vigente) |
| V3 work-order attachments | **NOVO** `415 WORK_ORDER_ATTACHMENT_UNSUPPORTED_MEDIA_TYPE` · mesmos reasons | `422 WORK_ORDER_ATTACHMENT_REJECTED` (vigente) | `503 WORK_ORDER_ATTACHMENT_SCAN_UNAVAILABLE` (vigente) |
| V4 checklist attachments | **NOVO** `415 CHECKLIST_ATTACHMENT_UNSUPPORTED_MEDIA_TYPE` · mesmos reasons (o `400 mime_type_not_allowed` do declarado, l.96, permanece — inconsistência pré-existente declarada, §3.7) | **NOVO** `422 CHECKLIST_ATTACHMENT_REJECTED / evidence_rejected` | **NOVO** `503 CHECKLIST_ATTACHMENT_SCAN_UNAVAILABLE / scan_unavailable` |
| V5 damage attachments | **NOVO** `415 DAMAGE_ATTACHMENT_UNSUPPORTED_MEDIA_TYPE` · mesmos reasons | **NOVO** `422 DAMAGE_ATTACHMENT_REJECTED / evidence_rejected` | **NOVO** `503 DAMAGE_ATTACHMENT_SCAN_UNAVAILABLE / scan_unavailable` |

**Espelho para as famílias novas de V4/V5 = módulo `attachments` (Ω4C PR-01)**: mesmos `reason`, mesma
mensagem, mesma posição (antes do store, nada persistido, nenhum órfão no storage — assert no teste).

**Egresso E1–E4 (delta):** `Content-Type` = tipo dos bytes (∈ jpeg/png/webp/pdf) ou `application/octet-stream`;
`Content-Disposition: attachment; filename="…"; filename*=UTF-8''…`; `X-Content-Type-Options: nosniff`;
`Content-Length` quando conhecido. Status/erros (200/404/409 `not stored`) inalterados. E5 inalterado.

**Corpo 201 de V1 (`mobile_evidence_file_upload@2026-06-18.b108`) — INALTERADO em forma:** `status: "stored"`,
`mime_type`/`content_type` = tipo verificado (igual ao declarado sempre que aceito, porque divergência é 415),
demais campos idem. **Versão do contrato não muda**: nenhum campo novo, nenhum status novo no corpo; o que muda
são códigos HTTP de recusa, que o app já trata genericamente (§7). Se a junta preferir carimbar versão, o
custo é 1 constante + 1 asserção — decisão de ata, não de código.

**Env (delta em `.env.example`):** `EVIDENCE_SCANNER="noop"` com comentário de 2 linhas (noop só fora de
produção; produção = `unavailable` → uploads recusados com 503 até `P-O6R-B07B-SCANNER-AV-REAL`).

**Modelagem: ZERO migration, zero campo, zero seed.** Por quê, medido: a verificação é ligada aos bytes no
upload (marca) e re-derivada dos bytes no download (peek) — não precisa de coluna `verified_at`/`verified_mime`
nem de backfill; `metadata` JSON existe em attachments/checklists (poderia carregar um carimbo), mas um carimbo
que o download não lê é enfeite, e `damage_attachments` teria de ganhar coluna. Decimal/timestamptz/delete
lógico: N/A (nenhum modelo novo). `prisma/**` inteiro PROIBIDO (§5). Migration destrutiva: não há — se o dev
achar que precisa de UMA migration qualquer, **PARA e devolve** (parada irredutível §C7.5 nem chega a ser
testada: não há migração neste bloco).

---

## §5 · Escopo — caminhos exatos (arquivo fora das listas → o dev PARA e devolve ao planejador, como no 07a/E1)

### PERMITIDO — código
1. **NOVOS:** `src/modules/evidence/upload-gate.ts` · `src/modules/evidence/content-sniff.ts` ·
   `src/modules/evidence/evidence-scanner.factory.ts` · `src/modules/evidence/serve-verified-file.ts`
2. `src/modules/evidence/evidence-storage.ts` — `EvidenceStorageInput.verification`; `store()` assere e grava o
   tipo verificado; classe `UnavailableEvidenceScanner`; nada mais
3. `src/modules/mobile/mobile-evidence-upload.ts` — gate no lugar do scan (l.133-161); registro de scanner via
   factory (l.54, 61-73); 415 novo; extensão/`mime_type` pelo verificado
4. `src/modules/attachments/attachment.storage.ts` (registro do scanner → wrapper; `saveAttachmentFile` recebe a
   marca) · `attachment.service.ts` (SÓ o trecho l.69-87: gate no lugar do scan) · `attachment.routes.ts` (SÓ o
   ramo `if (result.file)` de `sendResult`, l.73-86)
5. `src/modules/work-orders/work-order-attachment.storage.ts` · `work-order-attachment.service.ts` (SÓ l.57-75)
   · `work-order.routes.ts` (**SÓ** o ramo de arquivo de `sendResult`, l.276-289 — o resto do router é
   território congelado do 07a e alvo do 07c; qualquer outra linha = PARA)
6. `src/modules/checklists/checklist-attachment.storage.ts` · `checklist.service.ts` (**SÓ**
   `createUploadedAttachment`, l.387-415) · `checklist.routes.ts` (**SÓ** o ramo de arquivo, l.210-223) ·
   `src/modules/checklists/storage/checklist-storage.types.ts` (campo `verification`) ·
   `local-checklist-storage.provider.ts` e `s3-checklist-storage.provider.ts` (assert + tipo verificado no save)
7. `src/modules/damages/damage-attachment.storage.ts` · `damage.service.ts` (**SÓ** `createUploadedAttachment`,
   l.307-335) · `damage.routes.ts` (**SÓ** o ramo de arquivo, l.108-121)
8. `src/config/env.ts` — `EVIDENCE_SCANNER` (schema, refinamento de produção, export) + refinamento da allowlist
   ⊂ sniffável · `.env.example` — 1 var + comentário. **`.env` real: PROIBIDO.**

### PERMITIDO — testes
9. **NOVOS:** `tests/o6r07b-content-sniff.test.ts` · `tests/o6r07b-upload-gate.test.ts` ·
   `tests/o6r07b-scanner-failclosed.test.ts` · `tests/o6r07b-mime-sniff-routes.test.ts` ·
   `tests/o6r07b-download-hardened.test.ts` · `tests/o6r07b-upload-gate-census.test.ts` ·
   `tests/helpers/upload-fixtures.ts` (bytes mínimos válidos jpeg/png/webp/pdf + `MZ` + truncados + poliglota;
   **um** lugar, importado por todos)
10. **EDIÇÕES nominais, só troca de fixture ou de marca — justificadas linha a linha no PR:**
    `tests/attachments-crud.test.ts:58` e `tests/work-order-attachments.test.ts:33` (buffer de 4 bytes
    `89 50 4E 47` → assinatura PNG completa via helper) · `tests/mobile-backend-contracts.test.ts:1886`
    (`"fake-jpeg-bytes"` → JPEG mínimo via helper; o caso "bytes falsos declarados jpeg → 415" nasce no arquivo
    NOVO de rotas, não aqui — a suíte de contrato B-108 muda o mínimo) · `tests/checklist-storage.test.ts`
    (4 casos de provider: passam a construir a marca pelo gate com bytes reais, ou por
    `createUploadVerificationForTests` — o censo C4 impede que esse helper vaze para `src/`) · qualquer suíte da
    lista de regressão (§2.6) que quebrar SÓ por fixture de bytes: mesma regra (troca de fixture, zero asserção
    afrouxada). **Asserção que passe a esperar 415/422/503 onde esperava 201 é caso NOVO, não edição.**

### PERMITIDO — registro
11. `API_CONTRACTS.md` (delta §4) · `docs/api.md` (parágrafo B-108 l.243: "default Noop" → forma nova, 1-2
    linhas) · `Kpis/kpis-latest.json` + `kpis-history.json` + `kpis-history.md` + `index.html` + **`Kpis/app.js`
    (só a paridade `var FROZEN`, §C3.0 — lição C3-A3 do 07a)** · `agent-orchestration/controle/pendencias.md`
    (**SÓ APPEND** — EOL misto, nunca `sed -i`) · `docs/revisoes/O6R/achados.jsonl` (linha SEC-004) +
    `REGISTRO_ACHADOS_O6R.md` (seção l.701 + parágrafo de atualização) · `agent-orchestration/docs/status-geral.md`
    · `agent-orchestration/codex/log-execucao.md` · `docs/omega-pd.md` (as 2 PDs, escritas pelo pesquisador) ·
    este plano (apensos) · registros da junta (briefing, votos, ata, diários)

### PROIBIDO
`prisma/**` INTEIRO (zero migration — §4) · `mobile/**` · `frontend/**` · `src/modules/owner-portal/**` (E5,
junta-5) · `src/modules/impound/**` (M2 → pendência) · `src/modules/mobile/mobile-checklist-sync.ts`,
`mobile-evidence-sync.ts`, `mobile-work-order-sync.ts`, `mobile.routes.ts` (superfícies de sync = 07c/pendências)
· `src/modules/work-orders/work-order.service.ts`, `approval.*`, `work-order-comment*`,
`src/modules/core-saas/**` (07a congelado; 07c) · `src/modules/auth/**` · `src/modules/authority/**` ·
`src/modules/financial-*/**` · `src/app.ts` e `src/portal-app.ts` (helmet fica; a mutação M-D3 do §6 é
temporária no worktree do dev e **nunca** entra no diff) · `scripts/**` (executar pode; editar não) ·
`.github/**` · `Dockerfile`/`docker-compose*` · `CLAUDE.md`/`AGENTS.md` · `RBAC_MATRIX.md`/`APPROVAL_LIMITS.md` ·
`docs/revisoes/O6R/PLANO_O6R.md` · lockfiles JS (**zero dependência nova** — se o dev concluir que precisa de
uma, PARA: é junta-5 + PD e muda a categoria do bloco) · `.env` real · junction/symlink de `node_modules` ·
mass-delete ad-hoc · `erp-postgres`/`erp-redis` (nem leitura). Os 8 arquivos de teste do antigo "ciclo 5"
(`audit-security`, `vehicle-identity-schema`, `impound-process-checklist-link-schema`,
`helpers/auth-identity-fixture`, `db-catalog-write-guard`, `core-saas-role-authority-db`,
`npm-test-runner-guard`, `financial-entry-delete-reverse-race-db`) seguem intocados — não por colisão (o c5
mergeou), mas porque o 07b **não precisa** deles.

---

## §6 · Critério de aceite FALSIFICÁVEL — por via, com a mutação que deixa cada um vermelho

**Regra-mãe (herdada do plano-mãe §4, vinculante):** nenhuma sonda vale por "ficou verde". Para CADA caso novo
o dev registra na evidência (P1) a execução da MESMA sonda contra a **base `e55245a`** (worktree da base com os
arquivos de teste copiados) ou com a correção revertida por mutação, **VERMELHA, com `ec` e trecho** — só então o
verde vale. `ec` lido de `PIPESTATUS[0]`, nunca depois de `| tail`. N = 3 execuções com denominador idêntico
para arquivo novo (tudo determinístico: scanner e env injetados, sem relógio, sem corrida); suíte plena 1×.

### 6.1 · Aceites por VIA de upload (V1–V5) — arquivo `tests/o6r07b-mime-sniff-routes.test.ts` + `-scanner-failclosed`

| # | Caso (por via, salvo indicação) | Verde exigido | Vermelho-controle / mutação que o derruba |
|---|---|---|---|
| A1 | `MZ…` (executável) declarado `image/png` | **415** `content_type_mismatch`/`content_unrecognized` na família da via; **nada persistido** (assert: diretório do storage sem arquivo novo E repositório sem linha — os dois, sempre) | base `e55245a`: **201** e arquivo no storage (V2–V5) / `stored` (V1). Mutação: comentar a chamada ao gate na via → 201 |
| A2 | bytes PNG válidos declarados `image/jpeg` | 415 `content_type_mismatch`; nada persistido | base: 201 |
| A3 | PNG válido declarado `image/png` (caso limpo) | 201; `mime_type` gravado = `image/png`; extensão `.png` | regressão (sem vermelho próprio) — e mutação: sniff devolvendo sempre `undefined` → 415 no caso limpo |
| A4 | bytes truncados (7 bytes de PNG) | 415 `content_unrecognized` | base: 201 |
| A5 | PDF `%PDF-` em V2 (allowlist inclui pdf) × PDF em V1 (allowlist jpeg/png) | V2: 201 · V1: 415 `unsupported_media_type` (assinatura fora da allowlist da VIA) | base V1: `400 unsupported_content_type` só se o cliente DECLARAR pdf; declarando `image/jpeg` com bytes PDF a base dá **201** — este é o vermelho |
| A6 | scanner `unavailable` (registro) — 1 caso por via (5) | **503** da família da via; nada persistido; para V1, evento `evidence.upload.scan_failed` | base: V4/V5 dão 201 **sem scanner algum ter rodado** (não há chamada); V1–V3 dão 201 porque o default é Noop |
| A7 | scanner `infected` em V4 e V5 (as vias que não tinham scan) | 422 `evidence_rejected`; nada persistido; nenhum órfão no storage | base: 201 |
| A8 | ordem dos gates: em V2, `client_action_id` duplicado + bytes `MZ` | **409** (idempotência antes do gate) | mutação: mover o gate antes da checagem de idempotência → 415 |
| A9 | V1: recibo de sync ausente + bytes `MZ` | 409 `evidence_metadata_required` (ordem vigente) | mutação idem |
| A10 | V1: tamanho/sha corretos, `content_type` declarado jpeg, bytes PNG | 415 (o 400 de declarado NÃO dispara — o declarado é permitido) | base: 201 `stored` |

Piso: A1, A2, A4 em **todas** as 5 vias (15) + A3 (5) + A5 (2) + A6 (5) + A7 (2) + A8–A10 (3) = **≥ 32**.

### 6.2 · Aceites do gate e do sniff (unitários) — `o6r07b-content-sniff` + `o6r07b-upload-gate`

| # | Caso | Verde | Mutação |
|---|---|---|---|
| B1 | tabela: cada assinatura da PD reconhecida; `MZ`, `<html`, `GIF8`, `<svg`, `PK\x03\x04` → `undefined` | conforme | trocar 1 byte da tabela → o caso do formato cai |
| B2 | PDF com 10 bytes de lixo antes de `%PDF-` | `undefined` (provisório; a PD pode mudar — o teste segue a PD) | tolerância acidental → verde-cego detectado |
| B3 | WebP `RIFF` sem `WEBP` no offset 8 | `undefined` | — |
| B4 | marca ligada aos bytes: `assertUploadVerification(marca_de_A, buffer_B)` | lança `upload_not_verified` | remover a comparação de sha → passa |
| B5 | marca forjada `{} as UploadVerification` | lança | remover o Symbol → passa |
| B6 | `verifyUploadContent` com scanner `failed` NÃO grava nem chama `save` (espião no provider: 0 chamadas) | 0 chamadas | inverter ordem gate/save → 1 chamada |

Piso: **≥ 12**.

### 6.3 · Fail-closed provado por MUTAÇÃO — e quebrando o BUILD (o item do mandato)

Cada mutação é feita no worktree do dev, executada, registrada (comando + `ec` + trecho) e **revertida por
`git checkout -- <arquivo>`** antes do commit; a evidência é o arquivo P1 da junta. Nenhuma mutação entra no diff.

| # | Mutação | O que TEM de acontecer | Prova |
|---|---|---|---|
| M-B1 | **Caminho novo sem gate:** criar `src/modules/x/x.storage.ts` que chama `getDefaultChecklistStorageProvider().save({...})` SEM `verification` (e um segundo que chama `LocalProtectedEvidenceStorageProvider.store` idem) | `npm run check` **ec ≠ 0** com erro de tipo apontando `verification` ausente — o BUILD quebra antes de qualquer teste | saída do `tsc` |
| M-B2 | remover `verification` de UM `save*File` existente (ex. `damage-attachment.storage.ts`) | `npm run check` ec ≠ 0 | idem |
| M-B3 | burlar o compilador: `verification: {} as unknown as UploadVerification` numa via | `npm run check` ec = 0 (o cast passa) **mas** a suíte de rotas dá **500/erro `upload_not_verified`** no caso limpo A3 daquela via, e o censo C6 fica vermelho | dois vermelhos independentes |
| M-B4 | reusar a marca de outro buffer (verificar `bytes_A`, salvar `bytes_B`) | provider lança `upload_not_verified` (B4) | teste unitário |
| M-B5 | parser novo: adicionar arquivo com `Busboy(` fora da lista V1–V5 | censo C1 vermelho, nomeando o arquivo | saída do guard |
| M-B6 | `new NoopEvidenceScanner()` em qualquer arquivo de `src/` fora da factory | censo C3 vermelho | idem |
| M-B7 | env: `NODE_ENV=production` sem `EVIDENCE_SCANNER` → `envSchema.parse` resolve `unavailable`; `NODE_ENV=production` + `EVIDENCE_SCANNER=noop` → **parse FALHA** (boot recusado); `NODE_ENV=test` → `noop` | 3 casos em `o6r07b-scanner-failclosed` (idioma de `production-runtime-gates.test.ts`) | base: a var não existe → os 3 casos falham (vermelho-controle) |
| M-B8 | env: `CHECKLIST_STORAGE_ALLOWED_MIME_TYPES=image/png,image/svg+xml` | parse FALHA nomeando `image/svg+xml` | base: aceita |

### 6.4 · Aceites do EGRESSO (E1–E4) — `tests/o6r07b-download-hardened.test.ts`

| # | Caso | Verde | Vermelho-controle / mutação |
|---|---|---|---|
| D1 | upload PNG válido → download (nas 4 rotas) | `content-type: image/png` · `content-disposition` começa com `attachment;` · `x-content-type-options: nosniff` · corpo byte-idêntico · `content-length` = tamanho | base: `inline` (vermelho na disposition) |
| D2 | linha gravada com **tipo mentiroso** (semear pelo repositório em memória: `contentType: "text/html"`, bytes PNG) → download | `content-type: image/png` (dos bytes), não `text/html` | base: `text/html` inline |
| D3 | bytes sem assinatura (legado, semeado) → download | `application/octet-stream` + `attachment` | base: tipo do banco inline |
| D4 | `fileName` com `"`, `\`, CR/LF, acento e emoji | `filename="…"` ASCII seguro + `filename*=UTF-8''…` (forma da PD-DISPOSITION); nenhuma quebra de header | base: só `"`/`\`/CR/LF escapados |
| D5 | corpo `Readable` de 0 B, 5 B, 32 B, 10 MB | bytes idênticos; headers coerentes (0 B → octet-stream) | mutação: peek que consome sem recompor → corpo truncado |
| D6 | helmet desligado para `xContentTypeOptions` (mutação temporária em `app.ts`) | D1 continua verde — o helper põe `nosniff` sozinho | prova de cinto-e-suspensório |
| D7 | E5 (`/portal/v1/owner/photos/:opaqueRef`) | **inalterado**: `image/jpeg`, corpo re-codificado — regressão de `owner-portal-photos.test.ts` 17/17 | — |

Piso: D1 ×4 + D2 ×4 + D3 + D4 + D5 ×4 + D6 = **≥ 15**.

### 6.5 · Aceites do CENSO (`o6r07b-upload-gate-census`) — C1–C6 do §3.6, cada um com a mutação M-B5/M-B6/M-B3

Piso ≥ 6. **Total de casos novos permanentes: ≥ 32 + 12 + 15 + 6 = ≥ 65** (a meta M ≥ 2N = 40 do §2.6 fica
coberta com folga; publicar o número real, não o piso).

---

## §7 · Contrato offline-first (§B6 + B-108) — efeito MEDIDO no app, e por que o Flutter não muda

**O que o app faz hoje (lido em `e55245a`, `mobile/flutter_app/lib`):**
- `core/evidence/evidence_upload.dart:150-156` seleciona para envio itens com `serverId`, `localBlobRef` e
  `uploadStatus ∈ {pending, failed}`; l.196-206: **só** `_isStoredStatus(response.status)` (`'stored'`/
  `'uploaded'`, l.266-267) → `synced` + **`_blobStore.delete(blobRef)`**; qualquer outro `status` no corpo →
  `failed` (ou `pending` se `pending_review`) **com blob preservado** (l.207-215).
- Erros HTTP (l.216-243 + `core/network/http_client.dart:70-88`): 401/403 → `UNAUTHORIZED`; **409 →
  `ApiConflictError` → `SyncStatus.conflict`** (resolução manual, B-107); demais 4xx/5xx → `ApiServerError(status)`
  → `_uploadErrorCode` (l.249-262): 400 `UPLOAD_VALIDATION` · 413 `FILE_TOO_LARGE` · 422 `UPLOAD_REJECTED` ·
  503 `SCAN_FAILED` · **outros (inclusive 415) `UPLOAD_FAILED`** — todos `SyncStatus.failed`, **blob preservado**.
- Anexo de checklist: `features/checklists/data/checklist_attachment_upload.dart:185-240` — mesma família
  (rejected/scan_failed/pending_review preservam; l.231-240 mapeia status) e mesmo `mapDioError`.

**Efeito do 07b, código a código (V1 e V4 são as vias do app):**

| Resposta nova | O que o app vê | Blob | Estado | Contrato B-108 |
|---|---|---|---|---|
| **415** (sniff) | `ApiServerError(415)` → `UPLOAD_FAILED` | **preservado** | `failed` → re-tentado na próxima passada | **aguenta** — código genérico já mapeado |
| **422** (infected, novo em V4) | `UPLOAD_REJECTED` | preservado | `failed` | aguenta (V1 já respondia 422) |
| **503** (`unavailable` — produção sem AV) | `SCAN_FAILED` | preservado | `failed` → re-tentado | aguenta — é o desenho do B-108 para "scanner down" |
| **201** `status: "stored"` | idêntico | apagado (só aqui) | `synced` | corpo em forma **inalterada** (§4) |

**Conclusão: o contrato AGUENTA sem mudança no Flutter.** Nenhum `status` novo no corpo 201; nenhum código HTTP
cai num ramo que apague blob; `pending_review` continua não usado (não há fluxo de revisão). O que MUDA de fato,
e vai escrito no PR e na ata:
1. **Produção sem antivírus recusa TODA evidência com 503** até `P-O6R-B07B-SCANNER-AV-REAL` — a fila do app
   retém e re-tenta (custo: banda/bateria por passada; nenhuma perda). Aceito pelo plano-mãe §7.2 ("não há
   produção ativa"); repetido aqui porque é a consequência mais visível do bloco.
2. **Arquivo permanentemente rejeitado (415/422) é re-tentado a cada passada** — o app não tem estado terminal
   para "rejeitado, aguarda revisão"; era assim para 422 e passa a valer para 415. Pré-existente na classe;
   pendência `P-O6R-B07B-MOBILE-RETRY-PERMANENTE` (§12), dono = trilha mobile. O 07b **não** muda `mobile/**`.
3. Um app que enviasse `image/jpeg` com bytes HEIC/PNG (conversão trocada) passaria a receber 415 em vez de
   `stored` — hoje o app grava `item.mimeType` na captura e envia o mesmo blob; não há caminho medido que
   produza divergência. Se a junta C2 achar um, é caso de teste no app (fora daqui), não relaxamento do gate.
4. Idempotência de V1 (`tenant + usuário + client_evidence_id`) não muda: 415/422/503 não gravam nada, e o
   retry com os mesmos bytes recebe a mesma resposta (determinístico) — sem "409 fantasma".

**Item da cadeira C2 (contrato mobile):** re-executar `tests/mobile-backend-contracts.test.ts` inteiro (a fatia
de evidência com os fixtures novos) + ler os trechos Dart acima e confirmar a tabela — **sem** rodar Flutter (o
app não muda; `flutter_tests` é carregado com nota, §9). Se a cadeira quiser prova executada no app, o custo é
uma suíte Dart de mapeamento (415 → `UPLOAD_FAILED`), que existe como padrão em
`bo6r01_login_sem_org_erros_test.dart` — mas `mobile/**` é PROIBIDO neste PR: vira item da pendência acima.

---

## §8 · Bateria de validação exata (§9 do CLAUDE.md) + pisos + armadilhas

**Base da branch:** `origin/main` = `e55245a` (`git pull --rebase origin main` antes de abrir o PR; re-medir se
`B-O6R-04`/`B-O6R-06` mergearem antes). **Worktree PRÓPRIO** (nome com o identificador do BLOCO, ex.
`.claude/worktrees/o6r07b-dev` — não "dev"/"b07"), `npm ci` próprio, `npx prisma generate`; **junction/symlink
de `node_modules` PROIBIDA**; remoção só por `git worktree remove --force` (Windows: "Filename too long" →
`[System.IO.Directory]::Delete("\?\<path>", $true)`). Não tocar `gov-descuido`, `san2-r`, `o6r07b-plan`,
`status-read`, `o6r07b-plano`.

**Cluster descartável próprio** (a base viva `erp-postgres`/`erp-redis` em 5432/6379 é INTOCÁVEL): portas
escolhidas DEPOIS de `netsh interface ipv4 show excludedportrange protocol=tcp` E `docker ps` (B-O6R-04/06 podem
estar rodando); sugerido `o6r07b-pg` :56436 / `o6r07b-redis` :56383; nunca 55432; derrubar ao final (§C5).

**Na ABERTURA (antes de qualquer linha de código) — baseline por EXECUÇÃO, publicada:**
1. `npm test` na forma canônica (`node scripts/run-backend-tests.mjs` com `DATABASE_URL`/`REDIS_URL` do cluster
   descartável) → denominador de partida (esperado ≈ 2817 + Δ dos merges #372–#379, que são documentais → 2817).
2. Focados: os arquivos-alvo do §2.6 → N real (substitui a estática ≈20).
3. **Confirmar o que este plano mediu por leitura:** (a) `curl -sI` de E1 no servidor de teste → `x-content-type-options:
   nosniff` presente na base (helmet); (b) `Dockerfile:25` `ENV NODE_ENV=production` na imagem final e
   `deploy-staging.yml` sem sobrescrita → staging herda `production` → default `unavailable` (se divergir:
   pendência `P-O6R-B07B-STAGING-SCANNER-ENV`); (c) `attachments-crud.test.ts:58` / `work-order-attachments.test.ts:33`
   usam 4 bytes de PNG (vão quebrar no sniff de 8 — troca de fixture, §5.10).
4. **PDs fechadas ANTES de `content-sniff.ts` e `serve-verified-file.ts`** (§11) — o resto (gate, factory,
   env, marca, censo, providers) não depende delas e começa já.

**Por PR (ordem fixa; `ec` de cada passo registrado):**
1. `npm run check` (= `tsc --noEmit`) · `npm run lint` · `npm run build`
2. **Mutações do §6.3** (M-B1…M-B8), cada uma: aplicar → rodar o comando que TEM de ficar vermelho → registrar
   `ec`+trecho → `git checkout -- <arquivo>` (+ apagar o arquivo criado) → `git status` limpo
3. Focados, **N=3, denominador idêntico**: `node --test --import tsx tests/o6r07b-*.test.ts` (6 arquivos) e os
   arquivos-alvo do §2.6 (regressão: `attachments-crud`, `work-order-attachments{,-routes}`, `damages{,-routes}`,
   `checklist-attachments`, `checklist-storage`, `checklist-routes{,-db}`, `checklist-run-lifecycle-db`,
   `owner-portal-photos`, `rls-tenant-isolation`, `domain-events`, `impound-notifications-chain`)
4. **Contrato mobile:** `node --test --import tsx tests/mobile-backend-contracts.test.ts` (B-108 não regride)
5. **Vermelho-controle na base:** worktree de `e55245a` (pode ser `status-read`, SÓ LEITURA + cópia dos testes
   novos para fora dele? NÃO — copiar os testes para um worktree descartável PRÓPRIO da base com `npm ci`) →
   rodar A1/A2/A4/A5/A6/A7/D1/D2/M-B7/M-B8 → **vermelho com `ec` e trecho**
6. `npm test` completo, **1×, ec=0**, denominador publicado = base + Δ **nomeado por arquivo**
7. Frontend sem tocar frontend: `npm --prefix frontend run check` + `npm --prefix frontend run build` (nenhum
   teste-contrato de front lê os arquivos deste bloco — o dev confere com `rg -l "attachment|evidence" tests/*frontend*`)
8. `node --check Kpis/app.js` · `node --test --import tsx tests/kpi-dashboard-charts.test.ts
   tests/kpi-achados-paridade.test.ts` · `node scripts/kpi-freeze.mjs --check` (executar pode; editar não)
9. `git diff --check` · `sync-agent-agents.mjs --check` NÃO se aplica (nenhum agente muda) · limpeza §C5 em 1 linha

**Armadilhas (medidas nesta rodada e nas anteriores, transcritas porque cada uma já queimou alguém):** `ec`
depois de `| tail` é o do `tail` · `git status` mostra ` M` FANTASMA em 3 arquivos sob autocrlf — confirmar com
`git diff`/`git hash-object` · absorção prova-se com `rev^{tree}` (`is-ancestor` mente sob squash) · `git log -S`
na main não data nada de dentro de branch squashada · `pendencias.md` tem EOL misto → **só APPEND**, nunca
`sed -i`/`perl -i` · heredoc > ~7,5 KB estoura o arnês → arquivos grandes em pedaços ≤5,5 KB (este plano foi
escrito assim) · `grep -c` não conta CR · nunca `git archive`+`tar` para comparar conteúdo · disparo de jurados
≤2 em paralelo (P5) · remoção de worktree só pelo identificador do bloco.

---

## §9 · KPI (§C3) — 4 arquivos + `app.js` no MESMO PR, contagem de execução real

- `Kpis/kpis-latest.json`: `release.block` = B-O6R-07b; `pr` preenchido após `gh pr create`; `merge_commit`/
  `approved_head` **null na autoria** (backfill pós-merge pelo porteiro/bloco seguinte — não bloqueia);
  `metrics.backend_tests` = execução real deste PR (**N=1 suíte plena, forma canônica declarada** — a mesma nota
  de forma do #371); `frontend_smoke_tests` **1126/1126** e `flutter_tests` **864/864** **carregados** com nota
  explícita ("trilha não tocada neste PR"); `blocks_completed` **160 → 161** (sub-bloco pleno, precedente
  SAN2-4a/4b e 07a); `mvp_demo`/`mvp_vendavel` **intocados** (correção de segurança não move escopo — 1 linha).
- `production_readiness`: `aguardando_merge` = `[{ id: "Ω6R-SEC-004", … }]` (o guard `kpi-achados-paridade.test.ts:192-196`
  exige que a lista seja EXATAMENTE os fechados na autoria); `p1_fechados` **continua 2** e `fechados` não ganha
  SEC-004 até haver hash de merge (l.199-206 do guard) — quem mover isso na autoria fica vermelho.
- `kpis-history.json` (append: `snapshot_date, version, pr, merge_commit, approved_head, flutter_tests,
  backend_tests, frontend_smoke_tests, blocks_completed, description, backfill_note`) + `kpis-history.md`
  (espelho — o backlog `P-KPI-HISTORY-MD-BACKLOG` não é deste PR; esta entrada, sim) + `index.html` (hidrata
  dos JSON) + **`app.js` só a `var FROZEN`** (§C3.0; C3-A3 do 07a).
- A **junta valida os números** (C3): `ec` de cada passo, N e forma, denominador e Δ por arquivo.

---

## §10 · Riscos e rollback

| Risco | Mitigação / o que se declara |
|---|---|
| **Produção sem antivírus = zero upload (503)** até o bloco de AV real | É o fail-closed pedido; não há produção ativa; env explícita `unavailable` documentada; pendência ALTA com BLOQUEIA go-live de upload (§12). Alternativa (Noop) é o achado. |
| Sniff estrito rejeita arquivo legítimo (PDF com lixo antes do header; JPEG de câmera exótica; WebP lossless `VP8L`) | tabela fechada por PD (≥3 fontes) antes do código; casos de tabela B1–B3; erro é DECLARADO (415 com reason), nunca perda silenciosa; ajuste de tabela é 1 linha + 1 caso |
| Re-sniff no download muda o `Content-Type` de linhas legadas (ex. jpeg gravado como png) | tipo dos bytes é o correto por definição; web decide preview pelo blob (§2.4); pendência `LEGADO-MIME` para corrigir o gravado |
| Peek em `Readable` truncar/duplicar bytes ou travar backpressure | D5 (0 B/5 B/32 B/10 MB byte-idêntico); provider local é `createReadStream`, S3 é `Body` stream — os dois exercidos (S3 com o fake de `checklist-storage.test.ts:133`) |
| A marca vira "ruído de tipo" e o dev a propaga com `as` | censo C6 + assert em runtime (M-B3); a marca carrega sha e tamanho — não há atalho barato |
| Registro único de scanner vaza estado entre testes do MESMO arquivo | wrappers `reset*ForTests` restauram o default da factory; `node --test` isola por ARQUIVO (processo) — medido na PD-O6R-B01-ISOLAMENTO M1 |
| `EVIDENCE_SCANNER` mal setada em staging deixa gate real desligado | §8.3(b): confirmar `NODE_ENV=production` herdado; senão pendência de infra com o valor a setar |
| M2 (impound) continua servível por chave do cliente | dito às claras: metade "tipo" neutralizada por E1 endurecido; metade "chave" é pendência ALTA com dono; **não** é reprovação deste bloco (§C7.1-ter(a), origem Ω5P PR-10/17b) |
| Colisão de registro com B-O6R-04/06 | rebase + re-append + re-medição (§1) |
| Correção-que-nasce-defeito (classe da `D-JUNTA-SEPARACAO-DE-PAPEIS`) | papéis separados (§11), vermelho-controle por sonda, mutações registradas, teto de 2 ciclos |
| **Rollback** | revert do squash restaura os 5 parsers/serviços/routers e a env; ZERO migration → zero `down`; arquivos gravados durante a vigência têm tipo verificado (compatível para trás); `EVIDENCE_SCANNER` órfã é ignorada pelo schema antigo (zod não falha em var desconhecida) |

---

## §11 · Junta, quórum, papéis — e o que o crítico ataca primeiro

**Quórum: UNANIMIDADE DE 3** (§C7.1-ter(b): o núcleo do diff é SEGURANÇA — o que entra e o que é servido).
**Não é junta-5**: zero dependência nova (sniff e gate in-house; `jimp`/`busboy`/`helmet` já existem), zero
serviço externo, zero deploy. Se qualquer dessas três premissas cair durante o desenvolvimento, o dev PARA.
**`agente-secops` é obrigatório** (PR de superfície de segurança) e ocupa a **C1**. Todo voto declara
`gravidade` E `escopo` (`dentro-do-bloco` | `pre-existente`, com evidência de data/origem — as superfícies
M1–M4 e E5 já vêm com origem declarada no §2 para o jurado citar). **Inspetor de terreno LIBERA antes**
(fail-closed §C7.1-bis). **Porteiro pós-merge** depois. **Teto: 2 ciclos** (`D-TETO-DOIS-CICLOS`).

**Composição (identidades novas; mandato ≤3 itens por cadeira — P4):**
- **C1 · `agente-secops` — segurança de conteúdo:** (1) ataca o GATE e a MARCA: cast, reuso de marca, parser
  novo, ordem dos gates (A8–A10, M-B1…M-B6, censo); (2) ataca o SNIFF: poliglotas, truncados, PDF com lixo,
  WebP `VP8L`/`VP8X`, SVG por env (M-B8); (3) ataca o EGRESSO: D1–D6, header injection no `filename`, E5 intacto.
- **C2 · contrato mobile B-108:** (1) tabela do §7 confrontada com o Dart lido (não herdado); (2)
  `mobile-backend-contracts` com fixtures novos, corpo 201 inalterado, idempotência de V1; (3) fail-closed por
  ambiente (M-B7) e o efeito "503 em produção" consignado em ata como decisão vista.
- **C3 · contrato/regressão/registro:** (1) escopo §5 arquivo a arquivo, inclusive os congelados intocados e
  as edições nominais de teste (fixture, não asserção); (2) KPI com N, forma, Δ por arquivo, `FROZEN`,
  `aguardando_merge`; (3) delta `API_CONTRACTS.md` × diff, pendências novas bem-formadas, `achados.jsonl` +
  REGISTRO coerentes com o guard.
- **`critico-adversarial` ataca ESTE PLANO antes da primeira linha de código** (bloco de invariante de
  segurança; precedente Ω5P PR-03). Não vota.

**Separação de papéis (§C7.4-bis), na ata:** quem achou = auditoria O6R (SEC-004) + as medições deste plano
(M1–M4, V4/V5 sem scanner, helmet) — **não conserta**; quem planeja = este documento — **não desenvolvo, não
voto, não commito**; quem desenvolve = dev novo — **não julga o achado**. A cada reprovação: (a) a composição
cobre a competência? (b) quem achou consertou? (c) o planejador usou dado podre? — respondidas por escrito.

**O que o crítico deve atacar PRIMEIRO (na ordem em que eu atacaria):**
1. "A marca é burlável" → M-B3/M-B4 + C6; se ele achar um terceiro atalho, é caso novo, não relaxamento.
2. "Fail-closed em produção é indisponibilidade por desenho" → sim, declarado (§3.2/§7/§10); a única
   alternativa honesta é o AV real, que é junta-5.
3. "Sniff de cabeçalho não pega poliglota/JS em PDF" → declarado (§3.3): sniff garante TIPO, não inocuidade;
   inocuidade é o AV. `attachment`+`nosniff` fecham o vetor "executa no navegador".
4. "O egresso endurecido serve bytes de OUTRO tenant por chave do cliente (M2)" → pré-existente com dono;
   este bloco fecha a metade que é dele.
5. "Legado com tipo mentiroso no banco" → o download não lê o banco; pendência para o gravado.
6. "Códigos inconsistentes (V4 400 × 415)" → contrato vigente, declarado, pendência BAIXA.
7. "Fixtures editados para passar" → edição = troca de bytes; asserção nova = caso novo; C3 confere linha a linha.

**PDs — pedidas ANTES de decidir (§C7.3, `agente-pesquisador-web`, ≥3 fontes cada, registro em `docs/omega-pd.md`):**
- **`PD-O6R-B07B-MAGIC-BYTES`** — a tabela exata: JPEG (`FF D8 FF` + quais marcadores válidos no 4º byte), PNG
  (8 bytes; exigir chunk `IHDR`?), WebP (`RIFF`+size+`WEBP`; `VP8 `/`VP8L`/`VP8X` como 4º chunk?), PDF (`%PDF-` em
  offset 0 × tolerância de 1 024 bytes do ISO 32000-1 §7.5.2 / Acrobat), valor de checar trailer (`FF D9`,
  `IEND`) contra payload anexado, e a lista do que NUNCA entra (SVG, HTML, HEIC sem decoder). **Decide** a
  tabela e a tolerância do PDF. Provisório até lá: §3.3.
- **`PD-O6R-B07B-DISPOSITION`** — RFC 6266/5987 (`filename` ASCII + `filename*=UTF-8''`), efeito de
  `attachment` em `fetch`/XHR (inerte) × navegação (download), interação `nosniff`+ORB com `<img>` de origem
  cruzada, e se `Content-Security-Policy: sandbox` na resposta de arquivo acrescenta defesa a custo zero.
  **Decide** a forma do header e se o CSP entra. Provisório: `attachment` + `nosniff` + escape vigente.
- (Fora deste bloco, para o bloco de AV) `PD-O6R-B07B-CLAMD-INSTREAM` — protocolo `zINSTREAM`, `StreamMaxLength`,
  respostas `OK`/`FOUND`/`ERROR`, timeouts — só quando `P-O6R-B07B-SCANNER-AV-REAL` for planejado.

---

## §12 · Pendências — o que fecha, o que abre (nomeado), efeito na linha de status

### Fecha (no PR, na autoria; hash no backfill pós-merge)
- **`Ω6R-SEC-004`** → `docs/revisoes/O6R/achados.jsonl` l.29: `status: "fechado"`, `fechado_em`, `fechado_por:
  "B-O6R-07b (PR #<n>, autoria — hash no backfill)"`, `evidencia_fechamento` com os TRÊS mecanismos do achado e
  a prova de cada um (default fail-closed por ambiente = M-B7; tipo dos bytes nas 5 vias = A1/A2/A4/A5; egresso
  `attachment` + tipo dos bytes + `nosniff` = D1–D4) **e** os residuais nomeados (AV real, quarentena). Leitura
  que fundamenta `fechado` e não `parcialmente_superado`: a `descricao` do achado afirma três fatos — os três
  deixam de ser verdade — e o campo `teste` ("infected, MIME divergente e scanner down não persistem nem
  baixam") é provado; o `correcao` sugere meios ("real", "quarentena") que viram pendência com dono. Se a junta
  ler diferente, o fallback já está escrito: formato QUA-004 (`supersedido` + `componentes_abertos: ["antivírus
  real (serviço externo → junta-5)", "quarentena"]`) — decisão de ata, custo 1 linha. `REGISTRO_ACHADOS_O6R.md`
  l.701: `- Status: **fechado**` + parágrafo de atualização com a distribuição P1 (15 = 3 fechados na autoria
  aguardando merge…; o número exato é do dev, lido do JSONL no dia).
- **`P-O6R-B07`** (`pendencias.md` l.2917): APPEND com o fechamento do SEC-004 e nova linha
  `- status: FECHADA — 1 P0 + 2 P1: SEC-002 parcialmente superado no 07a (#369; residual P0 em
  P-O6R-SUBRECURSO-OBJECT-SCOPE, dono B-O6R-07c) · SEC-003 fechado no 07a (#369) · SEC-004 fechado no 07b (PR #<n>)`.
  O campo **Bloqueia** de "evidências/anexos/upload mobile" **cai**. Rodar o gerador do placar (o que #375/#376
  consertaram) e conferir que a entrada muda de balde — a linha que ele lê é a de `status:`, sem negrito.
- **Gate da CHECKLIST P1** (`J-CHK-04C-EMENDA`): de "B-O6R-06 E 07a E 07b" passa a depender **só de `B-O6R-06`**
  — 1 linha em `pendencias.md` e em `status-geral.md`.
- Nada mais fecha. `P-O6R-SUBRECURSO-OBJECT-SCOPE`, `P-O6R-B07-APPROVAL-BY-POLICY`,
  `P-O6R-B07-RATE-LIMIT-DISTRIBUIDO` seguem como estão.

### Abre (todas em `pendencias.md`, APPEND, com N/forma/causa/dono; o porteiro confere por amostragem)
1. **`P-O6R-B07B-SCANNER-AV-REAL` — ALTA — BLOQUEIA go-live de upload.** Produção responde 503 a todo upload até
   haver scanner real. Candidato: ClamAV (container em compose/fly) + cliente `INSTREAM` in-house via `node:net`
   (zero dep). É **serviço novo → junta-5 + PD** (`PD-O6R-B07B-CLAMD-INSTREAM`). Inclui "quarentena" como item a
   decidir lá. Dono: bloco próprio pós-O6R (`B-AV-REAL`), a encaixar pelo dono.
2. **`P-O6R-B07B-IMPOUND-PHOTO-KEY-DO-CLIENTE` — ALTA.** `POST /impound-processes/:id/inspection/photos` grava
   `Attachment stored` com `storage_key`/`storage_provider`/`content_type`/`file_url` do corpo
   (`impound.service.ts:379-386`, `impound-prisma.repository.ts:533-544`); servível por E1 e pelo owner-portal;
   o provider local não confere o prefixo de tenant da chave. Conserto no WRITE (aceitar só `attachmentId`
   próprio do tenant/processo). Origem: Ω5P PR-10/17b. Dono: **`B-O6R-07c`** (já dono do censo de superfícies
   JSON/sync) ou bloco de pátio — o dono decide; o 07c cita esta entrada no plano dele.
3. **`P-O6R-B07B-CHECKLIST-JSON-FILEURL` — MÉDIA.** Ramo JSON de `POST /mobile/checklist-runs/:runId/attachments`
   aceita `fileUrl`/`mimeType` arbitrários (`checklist.validator.ts:225`; também `registerDivergence`,
   `checklist.service.ts:647-650`); DTO devolve `fileUrl` cru sem storage gerenciado (`checklist.dto.ts:180-182`).
   Dono: trilha CHECKLIST (bloco de checklists).
4. **`P-O6R-B07B-DATAURI-NO-VALUE` — MÉDIA.** `value` de resposta de checklist aceita e persiste data-URI base64
   (`mobile-checklist-sync.ts:684,699`), sem teto próprio (só 2 MB do body), devolvido em GET
   (`checklist.dto.ts:160`). Correção: assinatura/foto viram anexo pela via V4 (gate), `value` ganha teto e
   recusa `data:`. Dono: trilha mobile/checklists.
5. **`P-O6R-B07B-MOBILE-RETRY-PERMANENTE` — MÉDIA.** App re-tenta 415/422 a cada passada (blob preservado,
   sem estado terminal "rejeitado — revisar"). Dono: trilha mobile (`B-O6R-11`/QUA-004). Inclui a suíte Dart de
   mapeamento 415 → `UPLOAD_FAILED`.
6. **`P-O6R-B07B-STAGING-SCANNER-ENV` — condicional** (só se §8.3(b) medir staging ≠ `production`): setar
   `EVIDENCE_SCANNER=unavailable`; `.github/**` proibido aqui. Dono: infra.
7. **`P-O6R-B07B-LEGADO-MIME` — BAIXA.** Linhas pré-07b com `mime_type`/`content_type` declarado; o download já
   serve o tipo dos bytes; falta relatório em lote (script, sem escrita em massa ad-hoc) e correção do gravado.
8. **`P-O6R-B07B-REJEICAO-SEM-AUDIT-LOG` — BAIXA.** 415/422/503 em V2–V5 só em log estruturado; V1 audita em
   memória. Auditoria em `audit_logs` para rejeição: bloco de auditoria.
9. **`P-O6R-B07B-CODIGOS-INCONSISTENTES` — BAIXA.** V4 usa `400` onde as irmãs usam `415`/`413` — pré-existente,
   mantido por contrato. Normalizar com versão de contrato.
10. **`P-O6R-B07B-RECEIPT-CONTENT-TYPE` — BAIXA (nota).** V1 não cruza `content_type` do recibo de sync com o
    tipo verificado dos bytes.
11. **`P-GOV-FILA-P1-ANTES-DE-P0` — MÉDIA — dono = dono.** Registro da tensão de fila do §1 (PLANO_O6R l.3 × 6 P0
    abertos × start do 07b autorizado por dois porteiros). Não é decidida por agente.

**Sem plano = veto automático. Este é o plano do 07b; o `critico-adversarial` o ataca e a junta do 07b o revisa
com o parecer dele antes da primeira linha de código.**

— fim —

---

## EMENDA E1 (2026-09-06) — pós-parecer do `critico-adversarial` (PLANO ROBUSTO COM RESSALVA, 8 achados)

**Papel:** `planejador-mestre` (Fable — `D-PLANEJADOR-MODELO-FABLE`; §C7.6: fluxo voltando ao planejador
pós-achado = Fable OBRIGATÓRIO). Mesma identidade que escreveu o corpo (não houve código nem voto; §C7.4-bis:
quem achou = crítico, `votos/B-O6R-07b/01-critico-adversarial.md`, commit `221843c`; quem planeja = esta
emenda; quem desenvolve = dev novo). **Terreno:** worktree `.claude/worktrees/o6r07b`, branch
`fix/o6r07b-uploads`, head `221843c` — `git diff --stat e55245a HEAD -- src tests frontend mobile prisma` =
**vazio** (só plano + parecer), logo todo `arquivo:linha` abaixo continua sendo `e55245a`. **Apenso
APPEND-ONLY:** nenhuma linha do corpo foi tocada (prova: `git diff --numstat 221843c -- <este arquivo>` = `N 0`).

### E1·0 · Precedência e o que o crítico CONFIRMOU (fica como está)

**Esta emenda VENCE o corpo onde divergirem.** Ficam de pé, re-medidos pelo crítico (parecer §2, D1–D11):
V4/V5 sem scanner (prova por presença: `.scan(` em exatamente 3 sítios de `src/`); 5 vias de bytes e 5
egressos (sem V6/E6); as 3 erratas ao plano-mãe; web/Flutter ignoram `Content-Disposition` (no Flutter, por
vacuidade — `downloadAttachment` de `api_contracts.dart:99-100` é declarado e nunca usado: vai à ata); a
ordem 409-antes-do-gate; o invariante B-108 (`_blobStore.delete` só dentro de `_isStoredStatus`, nos dois
arquivos Dart); o lastro aritmético dos pisos (exceto A8). O desenho — gate único, marca no storage,
re-derivação do tipo nos bytes — **não muda**; o que muda está numerado abaixo, um item por achado, cada
aceite reescrito com a mutação que o deixa vermelho (e, em A4/A5, **a mutação que o crítico executou**).

### E1·1 · A1 — o censo ganha **M5**, e a pendência passa a nomear a CLASSE (decisão: FORA do código do bloco, DENTRO do censo)

**M5 — `POST /api/v1/impound-processes/:processId/notifications/:notificationId/issue`** (`impound.routes.ts:175`),
campo "comprovante": `impound.notifications.validators.ts:78-92` (`parseOptionalAttachment`) aceita do corpo
`file_url` (≤2000, sem esquema), `file_name`, `content_type`, `checksum_sha256`, `storage_provider`,
`storage_key` (≤512); `impound.notifications-prisma.repository.ts:116-134` grava linha `attachment`
`status: "stored"`, `entity_type: "process_notification"`. Origem: `398a19d`, 2026-07-27, #290 (M2:
`574a1d2`, 2026-07-26, #285). Sítios de `attachment.create(` em `src/`: **3** (V2 + M2 + M5) — o crítico contou
e eu re-li; quem fechar a classe re-conta.

**Egresso das linhas de M5, medido por mim:** `rg process_notification src/` → só o writer, o DTO-comentário e
`resourceType` de auditoria — **nenhum leitor**; E1 devolve 404 (E1·2). Hoje o byte na chave que o cliente
escreveu **não é lido por rota alguma**. Isso não a absolve: a linha nasce `stored` com chave/tipo do cliente e
qualquer leitor futuro (um "baixar comprovante") herda o buraco.

**Decisão: M5 NÃO entra no código do 07b — entra no CENSO e na pendência, que muda de enunciado.** Por quê:
(i) o conserto correto é no WRITE (`impound/**` aceitar só `attachmentId` próprio ou receber bytes por V2 com
o `entity_type` registrado no resolver) — muda dois contratos do pátio cujos clientes (UI do pátio, PR-10/09)
este plano não mediu; (ii) `impound/**` é PROIBIDO e o bloco tem teto de 2 ciclos; (iii) a metade da classe que
É alcançável pelos arquivos deste bloco — a leitura por chave — **fecha aqui** (E1·2), para os dois routers.
A pendência `P-O6R-B07B-IMPOUND-PHOTO-KEY-DO-CLIENTE` do §12 é **RENOMEADA** para
**`P-O6R-B07B-ATTACHMENT-STORED-DO-CLIENTE`** e passa a dizer: a CLASSE (linha `attachment stored` com
`storage_key`/`content_type`/`storage_provider`/`file_url` do corpo), as DUAS rotas com arquivo:linha e
origem, o egresso real de cada uma (M2 → E5 pela chave; M5 → nenhum leitor hoje; E1 → 404 para ambas), o que o
07b fechou (guard de prefixo de tenant no READ) e o que resta (WRITE). Dono: `B-O6R-07c` (que já deve censar
superfícies JSON/sync) ou bloco de pátio — o dono decide; quem fechar prova por presença (3 sítios → 1).

### E1·2 · A2 — "M2 é servível por E1" é FALSO; o conflito §5 × pendência se resolve SEM tocar o owner-portal

**Premissa corrigida (caminho lido inteiro, não grep):** `attachment.service.ts:142-159` `loadOwnedAttachment`
→ `this.resolver.descriptorFor(entityType)`; `undefined` → **404** (l.151-156). O registro tem **4** entradas
(`attachment-entity-resolver.ts:83/98/113/128`: `damage`, `fine`, `insurance_policy`, `maintenance_order`);
`impound_intake_inspection` (M2) e `process_notification` (M5) não estão nele → **E1 nunca serve essas
linhas**. Onde a exposição vive: **E5** — `owner-portal.service.ts:417-441` monta um `Attachment` sintético com
`storageProvider`/`storageKey` **da linha** (`tenantId: this.deps.tenantId`, l.428) e chama
`resolveAttachmentDownload(attachmentForDownload)` (`attachment.storage.ts:196-209`, importado em
`owner-portal.service.ts:2`); o provider local (`resolveSafeStoragePath`, l.67-84) só impede sair do
diretório-base — **não confere o prefixo de tenant**. Retiro, portanto, o crédito do §2.3/§3.5/§11.4 ("o 07b
neutraliza a metade tipo via E1"): em E5 a metade tipo é inerte por outro motivo (Jimp re-codifica), e por E1
nada é servido. **Errata nominal ao §2.3 (linha M2), §3.5 e §11 item 4.**

**Resolução do conflito: o §5 NÃO muda (`owner-portal/**` segue INTOCÁVEL) e a pendência muda de enunciado —
porque a proteção que E5 precisa vive num arquivo que o §5 JÁ permite.** `resolveAttachmentDownload` é do
módulo `attachments` (§5 item 4). Entra no bloco, como item novo **3.8**:

- **`src/modules/evidence/storage-key-scope.ts` (NOVO):** `assertStorageKeyWithinTenant(storageKey, tenantId,
  provider)` — chave gravada pelos providers é `tenantId/runId/objeto` no local
  (`local-checklist-storage.provider.ts:24`) e `[prefixo/]tenantId/runId/objeto` no S3
  (`s3-checklist-storage.provider.ts:118-123`, `normalizedPrefix` pode ser vazio); o guard remove o prefixo
  normalizado ATUAL (se presente) e exige **primeiro segmento === tenantId da linha**; qualquer outra forma →
  o MESMO 404 `attachment_file_not_found` que os resolvers já lançam (nunca revela).
- Chamado nos **4** resolvers: `resolveAttachmentDownload` (`attachment.storage.ts:196`),
  `resolveWorkOrderAttachmentDownload` (`work-order-attachment.storage.ts:187`),
  `resolveDamageAttachmentDownload` (`damage-attachment.storage.ts:207`),
  `resolveChecklistAttachmentDownload` (`checklist-attachment.storage.ts:201`) — ANTES do `getObject`.
- **E5 herda o guard sem uma linha em `owner-portal/**`** (chama a função protegida com o tenant do deploy).
  Prova executada, não inferida: 1 caso NOVO apensado a `tests/owner-portal-photos.test.ts` (o harness de
  l.150-166 já cria a linha de foto com `storage_key`): linha do tenant do portal apontando para
  `outroTenant/…` (objeto existente) → **`not_found`**; vermelho-controle na base: **200** com a foto alheia
  re-codificada. Mais T1–T8 no §E1·10 (4 resolvers × {chave alheia → 404, chave própria → 200}).
- Risco declarado: chave S3 legada com prefixo ANTIGO (config mudou entre gravação e leitura) → 404. S3 não
  está configurado em ambiente algum (`.env.example:30-31` vazios); local não é afetado. Consignar.
- O que resta na pendência (E1·1): a metade WRITE. O crédito que o plano passa a reivindicar, dito com precisão:
  **"nenhum resolver deste repositório entrega objeto fora do prefixo de tenant da linha — inclusive E5"**, e
  nada sobre "tipo" para M2/M5.

### E1·3 · A4 — a marca ERA burlável por derivação; passa a ter identidade por INSTÂNCIA, não por conteúdo

**Resposta por escrito à pergunta do crítico** (*"um objeto derivado de uma marca legítima por clonagem é aceito
pelo provider?"*): no desenho do corpo, **sim** — o spread copia propriedades próprias enumeráveis, inclusive as
de chave `Symbol`, e a checagem de sha lia a propriedade do próprio objeto. O §3.1/§3.4 ficam **EMENDADOS**:

- **Identidade por instância, registro privado do módulo:** `verifyUploadContent` cria um objeto **opaco e
  congelado** (`Object.freeze({})` — **nenhuma** propriedade pública, nenhum `Symbol` em runtime; a "marca" de
  tipo `UploadVerification` é só de tipo, `unique symbol` declarado, sem existência em runtime) e registra os
  FATOS (`mimeType`, `sha256`, `sizeBytes`, `scanner`, `verifiedAt`) num **`WeakMap<object, VerifiedFacts>`
  privado** de `upload-gate.ts` (não exportado).
- **`assertUploadVerification(value, buffer): VerifiedFacts`** → `registry.get(value)`; ausente → lança
  `upload_not_verified:brand`; presente → compara `sha256(buffer)` e `buffer.length` com os fatos **do
  registro** (nunca com propriedade do objeto) → divergência lança `upload_not_verified:bytes`; devolve os
  fatos — **os providers usam `facts.mimeType` do retorno**, nunca leem o objeto.
- Consequência: `{ ...marca, sha256: sha(hostil), sizeBytes: hostil.length }` é um objeto NOVO → não está no
  `WeakMap` → recusado. Idem `Object.assign({}, marca)`, `Object.create(marca)` (prototype ≠ identidade),
  `structuredClone`, `JSON.parse(JSON.stringify(...))`, `new Proxy(marca, {})`. Mutar a marca é impossível
  (congelada) e irrelevante (os fatos vivem no registro). Construir de fora: não há construtor exportado; o
  único produtor é `verifyUploadContent` (e `createUploadVerificationForTests`, que o censo C4 impede de ser
  referenciado em `src/**`).
- **Aceites novos B7–B12 (§E1·10)** — e a mutação que os deixa vermelhos é **a réplica do crítico**: trocar
  `registry.get(value)` por checagem de propriedade/`Symbol` no objeto (identidade por conteúdo) → B7 (o
  spread exato: `{ ...marcaLegítima, sha256: sha(bufHostil), sizeBytes: bufHostil.length }`) passa a ACEITAR
  bytes hostis → vermelho. Registrar `ec` e trecho dessa mutação (**M-B9**) como de qualquer outra. C6
  (censo de `as UploadVerification`) **deixa de ser contado como prova** da marca — vira só higiene; a prova
  é B7–B12 + M-B9.

### E1·4 · A5 — o gate de boot da allowlist passa a validar a allowlist EFETIVA (os dois nomes), e M-B8 mutila o nome que escapava

Medido de novo: `env.ts:241` `CHECKLIST_STORAGE_ALLOWED_MIME_TYPES` e `:245` `CHECKLIST_ATTACHMENT_ALLOWED_MIME_TYPES`
(vivo em `.env.example:42`); o `superRefine` (l.283) lê o objeto **cru**; o `??` que escolhe a efetiva está em
l.548-551, **depois**. §3.3 fica **EMENDADO**:

- O refinamento calcula a allowlist efetiva **com a MESMA cadeia** `value.CHECKLIST_STORAGE_ALLOWED_MIME_TYPES
  ?? value.CHECKLIST_ATTACHMENT_ALLOWED_MIME_TYPES ?? DEFAULT` (a constante `DEFAULT` passa a ser UMA, importada
  nos dois lugares — hoje é literal duplicável) e exige ⊂ `SNIFFABLE_MIME_TYPES`, nomeando a entrada ofensora e
  **qual nome de env** a trouxe.
- **M-B8 reescrita para a mutação do crítico:** `CHECKLIST_ATTACHMENT_ALLOWED_MIME_TYPES=image/png,image/svg+xml`
  com `CHECKLIST_STORAGE_ALLOWED_MIME_TYPES` **ausente** → `envSchema.parse` **FALHA**. Mais **M-B8b**: os dois
  setados, legado com svg e o novo sem → parse PASSA (precedência do `??`, documentada — e a efetiva não tem
  svg); **M-B8c**: novo com svg → FALHA. Vermelho-controle: base não tem refinamento (os 3 falham na base);
  mutação que os derruba: refinamento lendo só a chave nova → M-B8 passa a aceitar (verde-com-defeito → o
  caso fica vermelho).
- **Segunda camada, dita às claras (para o aceite não depender só do boot):** mesmo com o gate de boot
  mutilado, nenhum SVG/HTML é gravado — `sniffMimeType` **nunca devolve** um tipo fora de `SNIFFABLE`, e o
  gate exige `sniffado ∈ allowlist`; `image/svg+xml` na allowlist é entrada morta. Caso **A11** (§E1·10):
  gate de boot removido por mutação + allowlist com svg + upload de SVG declarado `image/svg+xml` → **415**
  (`content_unrecognized`) e nada persistido; mutação que o derruba: sniff devolvendo o declarado quando não
  reconhece. O gate de boot existe para ser **barulhento** (o operador descobre no boot, não no primeiro 415).

### E1·5 · A3 — staging NÃO é condicional: recusa todo upload no dia do deploy; o remédio escrito era a própria pane

Medido: `fly.staging.toml:31` `NODE_ENV = "production"` (e l.9-12: *"regra geral: TODO ambiente com
NODE_ENV=production, staging incluso"*); `Dockerfile:25` idem; nenhum workflow sobrescreve. **§8.3(b) e §12.6
ficam SUPERADOS**: a condição já é verdadeira. Consequências escritas, para o humano ser **informado** (§C7.2):

1. **A partir do deploy do 07b em staging, as 5 vias respondem 503 a todo upload** (evidência mobile, anexo
   genérico, de OS, de checklist e foto de dano). O smoke do deploy (`scripts/smoke-staging.mjs`) **não faz
   upload** (rg zero) → o job fica **verde** e a pane só é visível a quem usa.
2. `EVIDENCE_SCANNER=unavailable` **não é remédio** — é o default que produz o 503; `noop` é recusado no boot de
   propósito. **Não haverá válvula** neste bloco (uma flag "permitir noop em produção" é o achado com outro
   nome); a única saída é o antivírus real (`P-O6R-B07B-SCANNER-AV-REAL`, junta-5).
3. `demo/investidor`: nenhum workflow nem `fly*.toml` referencia essa branch (rg zero) — é a árvore principal
   local. **Se a demonstração ao investidor usar staging com upload antes do bloco de AV, ela para de aceitar
   foto no dia do deploy.** Decisão de agenda é do dono, com três caminhos nomeados: (a) agendar o bloco de
   AV imediatamente após o 07b; (b) segurar o deploy do 07b em staging até o AV (a `main` já fica protegida);
   (c) qualquer rebaixamento temporário é decisão explícita do dono, não deste bloco. Vai à ata e à entrada
   `P-GOV-FILA-P1-ANTES-DE-P0` como item 2.
4. Pendência §12.6 **REESCRITA**: `P-O6R-B07B-STAGING-SEM-UPLOAD` — MÉDIA-ALTA — "staging recusa todo upload
   a partir do deploy do 07b; remédio = AV real; agenda = dono". A frase "setar `EVIDENCE_SCANNER=unavailable`"
   sai. `P-O6R-B07B-SCANNER-AV-REAL` passa a BLOQUEAR também "staging com upload".

### E1·6 · A6 — a tabela do §7 erra o V4: 503 → `UPLOAD_FAILED`, não `SCAN_FAILED`

Medido: `rg -n 503 mobile/flutter_app/lib` → **1 linha**, `evidence_upload.dart:261`.
`checklist_attachment_upload.dart:243-256` mapeia 400/413/422 e cai em `_ => 'UPLOAD_FAILED'`. Linha corrigida
da tabela do §7: **V1** 503 → `SCAN_FAILED`; **V4** 503 → `UPLOAD_FAILED` (indistinguível de erro de rede para o
técnico). O invariante **não** muda (blob preservado nos dois; `delete` só em `_isStoredStatus`). Com E1·5,
**todo anexo de checklist em staging aparecerá como falha genérica** até o AV real. Origem: `c0630fa`,
2026-08-01, #321 — pré-existente; entra como item da pendência `P-O6R-B07B-MOBILE-RETRY-PERMANENTE`
("unificar o mapeamento dos dois arquivos: 503 → `SCAN_FAILED`, 415/422 → estado terminal com revisão").

### E1·7 · A7 — a promessa "caminho novo sem gate não compila" ganha fronteira escrita; o censo declara seu alcance

Medido: `tsconfig.json` `include: ["src/**/*.ts"]`; `lint` == `check` == `tsc -p tsconfig.json --noEmit`
(**não há ESLint**); `build` = `tsc -p` (emite só `src`). A frase do §3.4 fica **EMENDADA** para o que o arnês
garante de fato, em três camadas com alcance declarado:

1. **Tipo (build/check):** todo `.ts` em `src/**` que chame `save()` dos 2 providers de checklist ou `store()`
   do provider de evidência **sem `verification`** falha o `tsc` — **só isso**. Não cobre: `tests/**` (fora do
   `tsconfig`), `.js`/`.mjs` em `src/` (include é `*.ts`), `scripts/**`, e qualquer escritor que **não** passe
   pelos 3 providers.
2. **Runtime (providers):** `assertUploadVerification` nos 3 `save`/`store` — pega teste, JS e cast; é a
   camada que responde por "quem burla o compilador não grava" (agora com identidade por instância, E1·3).
   Não cobre quem escreve fora dos providers.
3. **Censo C5 (tripwire de TEXTO, não prova):** alcance **`src/**`** (igual à C1 — a divergência
   `src/modules/**` × `src/**` acaba) e padrões ampliados: `writeFile(`, `writeFileSync(`, `appendFile(`,
   `appendFileSync(`, `copyFile(`, `copyFileSync(`, `createWriteStream(`, `rename(` de temporário,
   `fs.promises.`, `PutObjectCommand`, `Upload` de `@aws-sdk/lib-storage`, `UploadPartCommand`. Allowlist
   nominal = os 3 providers. **Pontos cegos declarados:** acesso dinâmico (`fs[nome]`), alias de import
   (`import * as x from "node:fs"` + `x.writeFile`), código em `scripts/`. Cada padrão novo tem mutação
   própria (arquivo temporário com o padrão → C5 vermelho nomeando-o).

A frase que a junta vai citar passa a ser: **"quem chama os providers sem marca não passa no `tsc` nem grava;
quem escreve fora dos providers é pego pelo censo C5 — que é tripwire de texto com os pontos cegos acima, não
prova"**. O bloco continua estrutural para o caminho que existe (providers); não promete o que não mede.

### E1·8 · A8 — UM piso, rótulos corrigidos, e as erratas nominais ao corpo (nada reescrito)

- **Piso único:** **N ≈ 20** (estática do §2.6, re-medida por execução na abertura) → **meta M ≥ 2N = ≥ 40**
  (mínimo contratual). **Piso de projeto (soma das seções, o número que a C3 confere):** §6.1 **32** · §6.2
  **20** (B1 = **9** casos: 4 assinaturas positivas + 5 negativas `MZ`/`<html`/`GIF8`/`<svg`/`PK`; B2–B6 = 5;
  B7–B12 = 6) · §6.3 **7** (M-B7 ×3 + M-B8/b/c ×3 + A11) · §6.4 **24** (15 + T1–T8 + E5) · §6.5 **6** →
  **≥ 89**. Publicar o real, não o piso.
- **Erratas nominais (linha do corpo → texto que vale):** l.35 "≥40" = a META (fica) · l.185 "(§6 soma ≥ 44)" =
  **resíduo de versão anterior, SEM efeito** — vale ≥ 89 · l.506 "≥ 65" = **superado** por ≥ 89 · l.423 "a
  mutação M-D3 do §6" → **"a mutação D6 do §6.4"** (a de desligar `xContentTypeOptions` em `app.ts`; nunca
  entra no diff) · §6.2 "Piso: ≥ 12" → **≥ 20** com a decomposição acima.
- Duas notas do parecer (§4, item 7) que viram texto do plano: (i) `tests/owner-portal-photos.test.ts:150-166`
  chama `saveAttachmentFile` direto → precisa da marca (**"troca de marca"**, não de fixture) — entra
  nominalmente no §5.10 (E1·9); (ii) **D4** (nome com acento/emoji/CRLF) só é alcançável **semeando a linha**
  (`sanitizeFileName` reduz o nome a `[A-Za-z0-9._-]` no upload, `attachment.storage.ts:211-215`) — o caso é
  declarado assim para não virar teatro.

### E1·9 · Escopo EMENDADO (§5) — só o que esta emenda acrescenta; tudo o mais do §5 segue igual

**PERMITIDO, a mais:** `src/modules/evidence/storage-key-scope.ts` (NOVO — guard de prefixo de tenant, E1·2) ·
nos 4 `*.storage.ts` já permitidos, **também** os `resolve*Download` (l.196/187/207/201) para chamar o guard
ANTES do `getObject` · `tests/owner-portal-photos.test.ts` — **SÓ** (a) a marca no `saveAttachmentFile` de
l.150-166 ("troca de marca") e (b) **1** caso novo: chave alheia → `not_found` (E1·2). Nenhuma outra linha
desse arquivo. · `.env.example:42` pode ganhar o MESMO comentário do item novo (allowlist ⊂ sniffável).
**PROIBIDO, reafirmado:** `src/modules/owner-portal/**` (E5 fica protegido por herança, E1·2) ·
`src/modules/impound/**` (M2/M5 → pendência) · válvula de `noop` em produção (E1·5).

### E1·10 · Aceites NOVOS — cada um com a mutação que o deixa vermelho (A4/A5 usam a mutação do crítico)

| # | Caso | Verde exigido | Mutação / vermelho-controle |
|---|---|---|---|
| **B7** | **spread do crítico**: `{ ...marcaLegítima, sha256: sha(bufHostil), sizeBytes: bufHostil.length }` passado ao provider com `bufHostil` | provider lança `upload_not_verified:brand`; **0** escritas | **M-B9**: identidade por conteúdo (propriedade/`Symbol` no objeto em vez de `registry.get`) → B7 ACEITA os bytes → vermelho. Base `e55245a`: não há gate (vermelho por ausência) |
| B8 | `Object.assign({}, marca)` | lança `:brand` | M-B9 |
| B9 | `Object.create(marca)` | lança `:brand` | M-B9 (prototype não é identidade) |
| B10 | `structuredClone(marca)` e `JSON.parse(JSON.stringify(marca))` | lançam `:brand` | M-B9 |
| B11 | `new Proxy(marca, {})` | lança `:brand` | M-B9 |
| B12 | marca legítima + MESMOS bytes, chamada 2× | aceita 2× (a marca não é de uso único; idempotência de retry) | regressão — e mutação "one-shot" (apagar do registro após o 1º uso) o derruba |
| **M-B8** | `CHECKLIST_ATTACHMENT_ALLOWED_MIME_TYPES=image/png,image/svg+xml`, chave nova AUSENTE, `NODE_ENV` qualquer | `envSchema.parse` **falha** nomeando `image/svg+xml` e o nome legado | refinamento lendo só a chave nova → passa → vermelho. Base: passa (sem refinamento) |
| M-B8b | as duas setadas; legado com svg, nova sem | parse passa (precedência `??`) | documenta a precedência; mutação: refinamento validando a UNIÃO das duas → falha indevida |
| M-B8c | chave nova com svg | falha | base: passa |
| **A11** | gate de boot removido por mutação + allowlist com svg + upload SVG declarado `image/svg+xml` (V2) | **415** `content_unrecognized`; nada persistido | sniff devolvendo o declarado quando não reconhece → 201 → vermelho |
| **T1–T8** | nos 4 resolvers: linha do tenant A com `storageKey = "tenantB/…"` (objeto existente em B) → download; e chave própria → download | alheia → **404** `attachment_file_not_found`, corpo vazio; própria → 200 | guard removido → 200 com bytes de B. Base: 200 (vermelho-controle) |
| **T9 (E5)** | `owner-portal-photos.test.ts`: foto do processo com `storage_key` de outro tenant | `not_found`; log `PHOTO_VIEWED`/`NOT_FOUND` | base: 200 com a foto alheia re-codificada (vermelho-controle) — prova de que E5 herdou o guard sem ser tocado |
| T10 | S3 fake (`checklist-storage.test.ts:133` idioma) com `CHECKLIST_STORAGE_S3_PREFIX="p/q"` e chave `p/q/tenantA/run/obj` | passa o guard | prefixo não removido → 404 indevido → vermelho |

Contagem: B7–B12 = 6 · M-B8/b/c = 3 · A11 = 1 · T1–T10 = 10 → **+20** sobre o corpo (já dentro do ≥ 89 do E1·8;
T10 entra em §6.4 no lugar de um dos casos genéricos de peek — o dev publica a soma real).

### E1·11 · Registro EMENDADO (§9/§12) — o achado fecha como `parcialmente_superado`, e as pendências mudam de nome

- **`Ω6R-SEC-004` → `parcialmente_superado`** (formato QUA-004/SEC-002 do ciclo 2 do 07a), não `fechado`. O
  crítico está certo (parecer §4, item 3): com `noop` sendo o default de `development`/`test` **por desenho**,
  o primeiro dos três mecanismos do achado ("scanner default sempre clean") só deixa de ser verdade em
  produção. `supersedido.por` = "B-O6R-07b (PR #<n>)"; `componente_superado` = sniff nas 5 vias + gate único
  com marca + egresso endurecido (E1–E4) + fail-closed em produção/staging + guard de prefixo de tenant nos 4
  resolvers; `componentes_abertos` = **["antivírus real em produção — serviço externo, junta-5; até lá
  produção/staging recusam upload com 503 (P-O6R-B07B-SCANNER-AV-REAL)"]**. O fechamento a `fechado` é
  contrato do bloco de AV. `REGISTRO_ACHADOS_O6R.md` l.701 segue a forma que o 07a usou para o SEC-002.
- **KPI (§9) em consequência:** SEC-004 **NÃO** entra em `production_readiness.aguardando_merge` (não se
  aguarda merge do que não se declara fechado — C2·2 item 3 do plano-mãe); `p1_fechados` segue 2; `findings`
  espelha `parcialmente_superado`; `blocks_completed` 160→161 e o resto do §9 inalterados.
- **`P-O6R-B07`:** linha `- status: FECHADA — 1 P0 + 2 P1: SEC-002 parcialmente superado no 07a (#369;
  residual em P-O6R-SUBRECURSO-OBJECT-SCOPE) · SEC-003 fechado no 07a (#369) · SEC-004 parcialmente superado
  no 07b (PR #<n>; residual em P-O6R-B07B-SCANNER-AV-REAL)` — mesma contabilidade que o 07a usou para o
  parcial; o `Bloqueia` de evidências/anexos/upload mobile cai; gate da CHECKLIST P1 passa a depender só de
  `B-O6R-06`.
- **Pendências (§12) — o que muda:** (2) **renomeada** `P-O6R-B07B-ATTACHMENT-STORED-DO-CLIENTE` (classe M2+M5,
  E1·1/E1·2) · (5) `MOBILE-RETRY-PERMANENTE` ganha o item de mapeamento 503 divergente (E1·6) · (6)
  **reescrita** `P-O6R-B07B-STAGING-SEM-UPLOAD` (E1·5) · (1) `SCANNER-AV-REAL` passa a bloquear também "staging
  com upload" e a ser o dono do fechamento do SEC-004 · (11) `P-GOV-FILA-P1-ANTES-DE-P0` ganha o item 2 (demo/
  staging sem upload até o AV). Nova, BAIXA: **`P-O6R-B07B-S3-PREFIXO-LEGADO`** (chave S3 com prefixo antigo →
  404 sob o guard; S3 não está em uso — E1·2).

### E1·12 · Junta e ata — o que esta emenda acrescenta ao §11; prova de append-only

- A **C1 (`agente-secops`)** re-executa **B7 e M-B9 com o script do crítico** (`brand-spread.mjs`, réplica do
  desenho) contra o gate real — não contra uma réplica — e M-B8 com o nome legado; a **C3** confere T9 (E5
  protegido sem diff em `owner-portal/**`) e as erratas nominais do E1·8. O parecer do crítico é insumo
  obrigatório do briefing (§C7.1-bis: presente nos ciclos ≥1 deste bloco).
- Itens que vão à ata como **informação ao humano** (§C7.2): staging/demo sem upload até o AV (E1·5);
  `Ω6R-SEC-004` fecha só como parcial; a decisão de fila `P-GOV-FILA-P1-ANTES-DE-P0`.
- Respostas §C7.4-bis para este ciclo de emenda: (a) a composição cobre a competência? — sim, com a C1 em
  `agente-secops` e o crítico como insumo; (b) quem achou consertou? — não: o crítico não escreveu esta
  emenda nem escreverá código; (c) dado podre? — as 4 premissas falsas que ele apontou (E1 serve M2; censo de
  4; marca por conteúdo; staging condicional) estão corrigidas com arquivo:linha re-lido por mim, não
  herdadas do parecer.
- **Prova de append-only desta emenda:** `git diff --numstat 221843c -- agent-orchestration/omega/planos/B-O6R-07b-plano.md`
  = **`N 0`** (só adições). O corpo do plano (766 linhas) permanece byte-idêntico ao commit `03f136e`.

— fim da EMENDA E1 —
