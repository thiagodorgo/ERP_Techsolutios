# C1 · secops — evidência incremental (P1) — junta B-O6R-07b

- Agente: `agente-secops` · modelo `claude-fable-5-1` (herdado; redisparo após queda #1/429, custo de redo 0 — nada a re-executar, P3)
- Worktree de leitura: `.claude/worktrees/o6r07b` (branch `fix/o6r07b-uploads`)
- Head de registro `cec77b40` · head de CÓDIGO `a2988b5` · base `e55245a`

## 0. Âncoras (conferidas, não herdadas)

- `git diff --stat a2988b5 HEAD -- src tests prisma` → **vazio** (ec 0). Head de código = `a2988b5` confirmado.
- Esqueleto do voto gravado ANTES de medir (`C1-secops-voto.json`, 3 itens `EM APURAÇÃO`).

## Terreno próprio

- `git worktree add --detach .claude/worktrees/o6r07b-jur-c1 a2988b5` → head `a2988b5`; `npm ci` próprio (326 pacotes, ec 0, sem junction); `npx prisma generate` (ec 0). Sem cluster Postgres: nenhuma das 7 suítes do meu mandato abre banco (grep `DATABASE_URL|PrismaClient` nas 7 → só `scanner-failclosed` cita a string num fixture de env). `erp-postgres`/`erp-redis` não foram tocados.
- Baseline no MEU worktree, runner canônico `node scripts/run-backend-tests.mjs tests/<f>.test.ts`, um a um:
  `upload-gate 21/21` · `upload-gate-census 8/8` · `content-sniff 19/19` · `scanner-failclosed 13/13` · `download-hardened 23/23` · `mime-sniff-routes 36/36` · `owner-portal-photos 18/18` — **138 pass · 0 fail**, ec 0 em todos. Bate com a decomposição do inspetor (21·8·19·13·23·36·18).
- `npm run check` → ec **0**.

## Item 1 — GATE e MARCA

### 1.a Leitura do desenho (arquivo:linha no head a2988b5)
- `src/modules/evidence/upload-gate.ts:71` `const registry = new WeakMap<object, VerifiedFacts>()` privado; `:180-188` marca = `Object.freeze({})` + `registry.set`; `:199-214` `assertUploadVerification` → `typeof` guard → `registry.get(value)` → compara `sizeBytes` e `sha256(buffer)` com os fatos DO REGISTRO → devolve fatos.
- Providers (3, os únicos `implements ChecklistStorageProvider|EvidenceStorageProvider` em `src/`): `local-checklist-storage.provider.ts:24-28`, `s3-checklist-storage.provider.ts:52-56`, `evidence-storage.ts:92-94` — todos chamam `assertUploadVerification(input.verification, input.buffer)` ANTES de escrever e usam `facts.mimeType` (campo `mimeType` removido de `SaveChecklistStorageObjectInput` e `EvidenceStorageInput`).
- 5 vias chamam `verifyUploadContent` (V1 `mobile-evidence-upload.ts`, V2 `attachment.service.ts`, V3 `work-order-attachment.service.ts`, V4 `checklist.service.ts`, V5 `damage.service.ts`) e passam a marca ao `save*File`, que re-assere e repassa ao provider. Tipo persistido = `stored.mimeType`/`stored.contentType` = `facts.mimeType` (V2 `attachment.storage.ts:196`, V3/V4/V5 `createAttachment` lê `stored.mimeType`).
- Ordem nas vias: V2/V3 = permissão → posse → 409 idempotência → gate → save (comentário + diff); V1 = 400 sha/tamanho → 409 recibo → gate; V4 = `assertRunComponent` → gate; V5 = `getEntity` → gate. Gate interno: sniff → allowlist da via → declarado==sniffado → scanner (`upload-gate.ts:149-177`).

### 1.b Ataque à marca contra o gate REAL (script `brand-attack.ts`, tsx, no meu worktree; sem mutação)
- Comando: `CORE_SAAS_PERSISTENCE=memory npx tsx .c1-scratch/brand-attack.ts` (ec 0). Marca legítima obtida por `verifyUploadContent` (PNG, V2).
- Os 6 do crítico: B7 spread+sha/size hostis → `:brand` · B8 `Object.assign` → `:brand` · B9 `Object.create` → `:brand` · B10 `structuredClone` e JSON → `:brand` · B11 `Proxy` → `:brand` · B12 reuso 2× → ACEITA (esperado) · B4 marca A + bytes B → `:bytes`.
- 15 candidatos ao 7º: `Object.setPrototypeOf({},m)` → `:brand` · `Reflect.construct` c/ proto=m → `:brand` · Proxy c/ get-trap → `:brand` · `Symbol` → `:brand` · função → `:brand` · `WeakRef(m).deref()` → ACEITA (é a MESMA instância, não é atalho) · `Buffer.from(PNG)` cópia → ACEITA (bytes iguais, sha igual — correto) · 1 bit trocado (mesmo tamanho) → `:bytes` · PNG||MZ cauda → `:bytes` · Proxy sobre o BUFFER → `TypeError` no `createHash` (não é vetor) · `Uint8Array` mesmos bytes → ACEITA (bytes iguais) · `{length:N}` → `TypeError` · declarado `'  IMAGE/PNG '` → marca (normalização `trim().toLowerCase()`, correto) · declarado `image/png; charset=x` → `content_type_mismatch` · **TOCTOU: mesmo Buffer mutado após a marca → `:bytes`** (o assert re-hasheia no provider).
- **Veredito parcial 1.b:** sétimo atalho por derivação/identidade NÃO encontrado. Tudo que é aceito é a mesma instância com os mesmos bytes. A janela declarada (R2·1: entre o assert do provider e o `writeFile`) continua sendo a única fronteira, e ela não é alcançável de fora (busboy monta um buffer por requisição; nenhuma via tem segundo detentor).

### 1.c Mutações executadas no MEU worktree (cada uma aplicada por script, medida e revertida por `git checkout --`; `git status --short src` = 0 ao fim de cada)
- **M-B3** (`damage.service.ts`: `verification: {} as unknown as typeof verification`, a grafia exata do dev): `npm run check` → **ec 0** (o cast passa) · censo → **8/8 VERDE** (C6 não casa a grafia — confirma o §6.1 do briefing) · `mime-sniff-routes` → **35/36, ec 1**: `not ok 20 - A3 [V5] PNG válido declarado image/png → 201` com corpo `{"error":{"code":"BAD_REQUEST","reason":"invalid_request","message":"upload_not_verified:brand"}}`. O runtime pegou; nada gravado (o assert precede o `save`).
- **M-B9** (`upload-gate.ts`: marca = objeto congelado COM `Symbol` + fatos no próprio objeto; assert lê `value[BRAND_SYM]` e `value.sha256`): `upload-gate` → **15/21, ec 1** — vermelhos: **B7 (spread do crítico)**, B8, B9, B11, "marca opaca", "helper de teste". B10 (`structuredClone`/JSON) segue verde porque não copiam `Symbol` — coerente com o desenho antigo. O aceite B7 mede o que promete.
- **M-B1** (arquivo novo `src/modules/zz-c1-probe/probe.storage.ts` chamando `provider.save({...})` sem `verification`): `npm run check` → **ec 2**, `error TS2345 … not assignable to parameter of type 'SaveChecklistStorageObjectInput'`. Build quebra antes de teste.
- **M-B5 / M-B6** (arquivo novo com `Busboy(` e `new NoopEvidenceScanner(` em código): censo → **6/8, ec 1**: `not ok 1 - C1` e `not ok 3 - C3`, ambos nomeando `zz-c1-probe/parser.ts`.
- A8–A10 (ordem): passam na suíte de rotas (36/36) — corpo lido em 2.x abaixo.

### 1.d Juízo sobre a decisão exposta (briefing §6.1 — C6 verde na M-B3, guard NÃO apertado)
- **Decisão CORRETA.** A E1·3 já rebaixou C6 a higiene; a barreira que vale é a de runtime, e ela ficou vermelha na M-B3 (35/36, `upload_not_verified:brand`) sem depender de grafia. Apertar o regex para `as unknown as typeof verification` caçaria UMA grafia; a classe (`as any`, `<T>x`, `satisfies`, variável `any`) é ilimitada em texto. Prova ≠ tripwire; o dev escreveu isso no próprio censo (`o6r07b-upload-gate-census.test.ts:192-197`).
- Consequência a consignar: o "dois vermelhos independentes" do corpo do plano (§6.3, M-B3) vale como **um vermelho** (runtime) sob a E1 — o segundo (C6) foi rebaixado por escrito, não escondido.

### Veredito parcial — Item 1: **APROVADO**. Sem achado de gravidade. Observações (não bloqueiam):
- (BAIXA, `dentro-do-bloco`, informativa) `UploadGateError` lançado de `save*File` fora do `.catch` do gate sai como `400 BAD_REQUEST/invalid_request` com a mensagem crua `upload_not_verified:brand` (M-B3). Só alcançável por defeito de código (cast), nunca por cliente; não vaza path/token/tenant. Registro para a ata, não como pendência.

## Item 2 — SNIFF

### 2.a Sonda própria contra `sniffMimeType` (script `sniff-probe.ts`, tsx, 39 casos; ec 0)
- Poliglotas: `x`+`%PDF-` → undefined · 1024 bytes de espaço + `%PDF-` → undefined · BOM+`%PDF-` → undefined · NUL+`%PDF-` → undefined · `%pdf-` minúsculo → undefined · `%!PS` → undefined · JPEG hdr + `%PDF-` em 3 → **image/jpeg** · JPEG hdr + `<script>` → **image/jpeg** · PNG hdr + `<svg` → **image/png** (tipo, não inocuidade — declarado em `content-sniff.ts:34-38` e no nome do teste).
- Truncados: `FF D8 FF` (3 B) → image/jpeg (WHATWG) · `FF D8` → undefined · PNG 8 B exatos → png · PNG c/ byte 5 = 0x0A (corrupção modo-texto) → undefined · WebP 13 B → undefined · 14 B → webp · `%PDF` (4 B) → undefined · vazio → undefined · 1 MB de 0xFF → undefined · `FF D8 FF`+1 MB zeros → image/jpeg.
- WebP: `VP8 `/`VP8L`/`VP8X` → webp · `VPZZ` → webp (o WHATWG exige só `VP` em 12-13; fourCC inválido não é scriptável) · `VQ8 ` → undefined · `ALPH` em 12 → undefined · RIFF/WAVE → undefined.
- Nunca reconhecidos: GIF89a, BMP, TIFF, HEIC, AVIF, ICO, JP2, SVG (c/ BOM, c/ decl XML, c/ espaços), HTML (c/ BOM/espaços), MZ, ELF, ZIP.
- **Veredito parcial 2.a:** nenhum aceite promete mais do que entrega — os nomes dos testes em `o6r07b-content-sniff.test.ts` dizem "garante TIPO, não inocuidade" (l.108-112) e o poliglota com carga ANEXADA é declarado como aceito. As 4 âncoras em offset 0 são mutuamente exclusivas (medido: nenhum buffer devolveu 2 tipos).

### 2.b SVG por env — M-B8 com o NOME LEGADO (E1·12 pede à C1)
- Suíte `o6r07b-scanner-failclosed` no meu worktree: **13/13** (inclui M-B8 legado+svg com chave nova AUSENTE → recusa nomeando `CHECKLIST_ATTACHMENT_ALLOWED_MIME_TYPES` e `image/svg+xml`; M-B8b precedência; M-B8c; normalização ` IMAGE/SVG+XML `).
- **Mutação da E1** (refinamento lendo SÓ a chave nova, `env.ts` cadeia `??` sem o legado; `git diff --numstat` = `0 1`): `scanner-failclosed` → **11/13, ec 1** — `not ok 7 - M-B8 … nome LEGADO` e `not ok 13 - o gate vale FORA de produção`. Revertido (0 mods). O aceite mede o que promete.
- Segunda camada: A11 (gate, allowlist com svg + bytes SVG → `content_unrecognized`) e A11-rota (parser 415; gate 415) passam (21/21 · 36/36). Sniff nunca devolve tipo fora de `SNIFFABLE_MIME_TYPES` (`content-sniff.ts:124-139`, tabela fechada).
- Fontes da allowlist por via (presença): V2/V3 `readChecklistStorageConfig()` e V4/V5 `config.allowedMimeTypes` derivam de `env.CHECKLIST_STORAGE_ALLOWED_MIME_TYPES` (`checklist-storage.factory.ts:29`), que é a cadeia `NOVA ?? LEGADA ?? DEFAULT` validada pelo gate de boot; V1 usa `EVIDENCE_ALLOWED_MIME_TYPES` fixa (jpeg/png).

### Veredito parcial — Item 2: **APROVADO**. Sem achado. Nota de ata (BAIXA): `FF D8 FF` com 3 bytes e `RIFF…WEBPVP??` com fourCC inválido são aceitos como tipo — conforme WHATWG e coerente com "tipo, não inocuidade"; servidos como `attachment`+`nosniff`+CSP sandbox, inertes.

## Item 3 — EGRESSO

### 3.a Congelados intocados (medido por árvore, não por ausência de grep)
- `git diff --name-only e55245a a2988b5 -- <dir> | wc -l` → owner-portal **0** · impound **0** · auth **0** · prisma **0** · mobile **0** · frontend **0**.
- `git rev-parse e55245a:src/modules/owner-portal` == `git rev-parse a2988b5:src/modules/owner-portal` = `69304ac3…` (hash da subárvore idêntico).
- `getObject(` em `src/**/*.ts`: **7 sítios de código** (interface `checklist-storage.types.ts:60`; impls local `:46` e s3 `:87`; 4 chamadas, uma por resolver: `attachment.storage.ts:224`, `work-order-attachment.storage.ts:209`, `damage-attachment.storage.ts:229`, `checklist-attachment.storage.ts:224`) + 1 comentário em `storage-key-scope.ts:21`. Bate com o crítico (R2·3).
- E5 alcança o objeto por `resolveAttachmentDownload` (`owner-portal.service.ts:2` import, `:442` chamada) → herda o guard. T9 (`owner-portal-photos.test.ts:377`) verde no baseline (18/18) e **vermelho** quando removi o guard do resolver V2 (17/18, `not ok 8 - T9`). Herança por chamada PROVADA por execução.

### 3.b D1–D6 e header injection no `filename`
- `o6r07b-download-hardened` 23/23 no meu worktree (D1, D1b, D2, D3, D4/b/c/d, D5/b/c, D6/b; T1–T8, T10). As 4 rotas trocaram o bloco `inline`+tipo-da-linha por `void sendVerifiedFile(response, result.file)` (diff lido nos 4 `*.routes.ts`); `VerifiedFileToSend` não tem campo de tipo (prova estrutural D2).
- Fuzz próprio de `buildContentDisposition` (script `cd-fuzz.ts`, 38 nomes hostis; critério: regex estrito `attachment; filename="[\x20-\x7e]*"; filename*=UTF-8''[A-Za-z0-9%._~-]*` + `http.validateHeaderValue` + sem C0/C1/U+2028/9 + fallback sem `"`/`\`/`%`, ≤100): **36 ok**. CRLF/LF/CR/NUL/TAB/VT/DEL removidos; NEL/CSI/U+2028/U+2029/zero-width/RTL-override → `_` no fallback e %XX no `filename*`; `"` de fechamento + parâmetro forjado → `_` (quoted-string íntegra); traversal unix/win → basename; CON/com1 → `arquivo[.ext]`; `'()*` → %27 %28 %29 %2A. Nenhuma injeção de header em 38.
- **2 exceções (ambas BAIXA, `dentro-do-bloco` — função nova `serve-verified-file.ts:55-91`):**
  (i) extensão > 100 chars: `fallback.slice(0, 100 - extension.length)` fica NEGATIVO e o fallback passa de 100 (`a.`+300×`b` → 402 chars; alcançável por upload: `sanitizeFileName` V2–V5 permite 120 chars, ex. `a.`+118×`b` → fallback 220). Só ASCII, sem injeção — teto cosmético furado.
  (ii) lone surrogate (`\ud800`) no nome → `encodeURIComponent` lança `URIError: URI malformed` → `sendVerifiedFile` cai no `catch` e `response.destroy()` (conexão derrubada, nenhum header emitido — fail-closed). Alcançabilidade: upload multipart sanitiza a `[A-Za-z0-9._-]`; só JSON (`\ud800` escapado) em memória; no Postgres o driver substitui por U+FFFD. Informativo.

### 3.c T1–T8 EXECUTADOS ao nível do RESOLVER (script `resolver-probe.ts`): objeto REAL gravado sob o tenant B pelo provider local; linha do tenant A apontando para ele → os 4 resolvers respondem **404 `attachment_file_not_found`** (`AttachmentError`/`WorkOrderAttachmentError`/`DamageError`/`ChecklistError`); linha de B com a mesma chave → **33 bytes** servidos. 8/8. Objeto apagado ao fim.

### 3.d Mutação "guard removido" por resolver → o que fica VERMELHO por execução
- Guard removido em **V2** (`attachment.storage.ts`): `owner-portal-photos` **17/18** (`not ok 8 - T9`) · censo **7/8** (C7) · `download-hardened` 23/23 · `mime-sniff-routes` 36/36.
- Guard removido em **V5** (`damage-attachment.storage.ts`): censo **7/8** (C7) · `download-hardened` 23/23 · `mime-sniff-routes` 36/36 · `owner-portal-photos` 18/18. **Nenhum teste executado fica vermelho.**
- Guard removido em **V4** (`checklist-attachment.storage.ts`): censo **7/8** (C7) · `download-hardened` 23/23 · `mime-sniff-routes` 36/36 · `owner-portal-photos` 18/18 · `checklist-attachments` 2/2 · `checklist-routes` 15/15. **Nenhum teste executado fica vermelho.**
- Leitura: T1–T8 (`download-hardened.test.ts:198-283`) exercitam a função de DECISÃO `isStorageKeyWithinTenant`, não os resolvers; o cabeçalho do arquivo (l.25-27) diz que "os casos EM ROTA dos 4 resolvers vivem em `mime-sniff-routes` (D1 por rota)" — D1 é o caminho feliz, não a chave alheia. Só V2 tem falsificação executada (T9, por E5). O log do dev declara 3 divergências (A11, D6, A5.2); esta não está entre elas.

### 3.e M1 → E4: o ramo JSON do checklist aceita `metadata.storageKey` do CORPO, e E4 lê por ela (prova EM ROTA)
- Código (head a2988b5, tudo pré-existente): `checklist.validator.ts:222-231` `parseCreateChecklistAttachmentDto` → `metadata: jsonRecordSchema` (`z.record(z.unknown())`, l.15-18); `checklist.service.ts:372-375` repassa `input` ao repositório; `checklist-prisma.repository.ts:853/884/913` grava `metadata: data.metadata`; `checklist-attachment.storage.ts:279-283` `readStorageProvider(metadata)` lê `metadata.storageProvider ?? metadata.storageDriver`, e `:212` lê `metadata.storageKey`. Origem: `bfc5c7f7` **2026-06-07** (DTO com metadata), `2530850a` **2026-06-07** (resolver lê `metadata.storageKey`), `9e31a245` **2026-06-08** (`readStorageProvider`). A branch do bloco começou em 2026-09-06.
- Sonda EM ROTA (`e4-probe.test.ts` = cópia do arnês de `checklist-attachments.test.ts` + 1 caso; `node --test --import tsx --test-name-pattern "C1 M1"`; persistência memory, storage local em tmpdir):
  1. tenant B sobe PNG por multipart → chave `B/<run>/<uuid>-b.png` no disco;
  2. tenant A (admin) `POST /api/v1/mobile/checklist-runs/:runId/attachments` **JSON** com `metadata: { storageDriver: "local", storageKey: <chave de B> }` → **201** (DTO não ecoa a chave);
  3. `GET …/attachments/:id/download` como A — **HEAD (guard ligado): 404** `bytes=127 content-type=application/json`. **Guard da V4 removido: 200, 12 bytes, `image/png`, corpo == objeto de B (true)** — vermelho-controle do MECANISMO, executado;
  4. mesmo tenant, chave de objeto de OUTRA run de A → **200** nos dois casos (object-scope intra-tenant; classe `P-O6R-SUBRECURSO-OBJECT-SCOPE`, pré-existente, fora do bloco).
- Consequência: a premissa do plano §2.3 **M1** ("cria anexo SEM `storageKey` → E4 responde 404") e da pendência `P-O6R-B07B-CHECKLIST-JSON-FILEURL` (`controle/pendencias.md:7007-7011`, "Cria anexo sem `storageKey`") é **FALSA**: o cliente escreve a chave em `metadata`. A classe "linha `stored` com chave do cliente" tem um **terceiro** membro (M1, tabela `checklist_attachments`) que o critério de fechamento de `P-O6R-B07B-ATTACHMENT-STORED-DO-CLIENTE` ("3 sítios de `attachment.create(` → 1") **não conta** — quem fechar M2+M5 declarará a classe resolvida com M1 aberto: exatamente o argumento do A1 do crítico, agora pela terceira vez no mesmo bloco (07a: 10ª via; 07b plano: M5; 07b código: M1).
- O que o bloco FECHA aqui, provado: a metade cross-tenant de M1 (guard em E4 → 404). O que fica: WRITE (cliente escreve chave) e object-scope intra-tenant.

### Veredito parcial — Item 3: **APROVADO com achados** (nenhum atinge VETO do contrato secops: sem segredo, sem gate afrouxado, sem CORS/TLS, sem PII/path em resposta — `storageKey` não é ecoado no DTO, medido).
- **[F3.1] ALTA · escopo MISTO:** defeito = `pre-existente` (M1 grava chave do cliente desde 2026-06-07, evidência acima) → pendência nomeada, não reprovação; **censo/registro = `dentro-do-bloco`** (plano §2.3 M1 e as 2 pendências carregam premissa falsa e critério de fechamento que deixa M1 de fora). Motivo: registro que fecha a classe pela metade é a lição já paga duas vezes nesta rodada.
- **[F3.2] MÉDIA · `dentro-do-bloco`:** o guard de E4 — o único resolver (além de E5) onde o cliente escreve a chave hoje — e os de E2/E3 só são falsificados por TEXTO (C7); a E1·10 (T1–T8) prometia "guard removido → 200 com bytes de B" nos 4 resolvers, e o cabeçalho de `download-hardened.test.ts:25-27` afirma casos em rota que não existem para chave alheia. Divergência não declarada pelo dev. Código correto (3.c: 4/4 resolvers recusam por execução).
- **[F3.3] BAIXA · `dentro-do-bloco`:** `buildContentDisposition` — teto de 100 furado quando a extensão excede 100 (slice negativo); lone surrogate → `URIError` → `response.destroy()` (fail-closed). Ver 3.b.
