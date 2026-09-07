# Parecer do `critico-adversarial` — ATAQUE AO PLANO `B-O6R-07b` (antes do código)

**Papel:** `critico-adversarial` (§C7.1-ter(b) — bloco de SEGURANÇA; ataco o plano, **não voto**).
**Data:** 2026-09-06. **Alvo:** `agent-orchestration/omega/planos/B-O6R-07b-plano.md` (766 l., commit `03f136e`)
+ o plano-mãe `B-O6R-07-plano.md`. **Terreno:** worktree `.claude/worktrees/o6r07b`
(`fix/o6r07b-uploads`), medido em LEITURA + execução local.

**Prova de que o terreno é a base do bloco:** `git diff --stat e55245a HEAD` no worktree devolve **1 arquivo,
766 inserções — só o plano**; `git diff --stat e55245a HEAD -- src/ tests/ frontend/ mobile/ prisma/` devolve
**vazio**. Logo tudo que li de `src/`, `tests/`, `frontend/` e `mobile/` **é** `e55245a`, o head que o plano
declara ter medido. Não fiz checkout, não toquei a árvore principal (`demo/investidor`), não toquei
`gov-descuido`/`san2-r`/`status-read`, não encostei em `erp-postgres`/`erp-redis`, não escrevi em `src/`.

## VEREDITO: **PLANO ROBUSTO COM RESSALVA**

O **desenho** sobrevive aos dois ataques: gate único + marca no tipo do storage + re-derivação do tipo nos
bytes no egresso é coerente, e o achado mais forte do plano (**V4 e V5 não têm scanner NENHUM**) é
**VERDADEIRO** — confirmei por leitura exaustiva, não por grep de ausência. O que **não** sobrevive são
**medições e falsificabilidade**, em 8 pontos numerados abaixo. Dois deles (A4, A5) são aceites que ficam
**VERDES com o defeito presente** — que é a definição de aceite não-falsificável — e um (A1) é a repetição
exata da classe que reprovou o `B-O6R-07a`: censo declarado completo que não estava.

Nenhum dos 8 exige reabrir o objetivo do bloco nem trocar a abordagem técnica: são emendas a §2.3, §3.3, §6 e
§12, todas escrevíveis antes da primeira linha de código. Por isso **não** abri PD de premissa (§C7.3 não é
disparado: não há dúvida técnica não pesquisada, há afirmação medida errado). **Ressalva vinculante:** os 8
viram requisito explícito no plano antes de o dev começar; A1, A2, A4 e A5 **bloqueiam** o start (são o
mecanismo central e o censo), A3/A6/A7/A8 são obrigações de escrita.

## §1 · Método — e o que ele NÃO decide

1. **Censo refeito do zero**, por padrão de código e não pela lista do plano: `Busboy(` · `import ... busboy` ·
   `multipart` · `Buffer.from(...,"base64")` · `writeFile|PutObjectCommand|createWriteStream` (ingresso e
   escrita) · `Content-Disposition` · `setHeader("Content-Type"` · `.pipe(response)` · `response.send(` ·
   `.type(` (egresso) · `fileUrl|file_url` por módulo · `attachment.create(` (metadado).
2. Onde a conclusão dependeria de "não existe X", **não** parei no grep: li o caminho inteiro (ex.: o
   registro de descriptors do download, os 3 sítios de `.scan(`, os 2 arquivos Dart de upload).
3. O que **não** medi por execução, e digo: não rodei `npm test` (sem worktree com `npm ci` próprio — o custo
   não se justificava para o que ataco, que é o PLANO). Tudo que afirmo é (a) leitura de código com
   arquivo:linha, (b) `git log --diff-filter=A` para datar origem, ou (c) execução local isolada (A4).
   **Nenhuma afirmação minha depende de um número de suíte.**

## §2 · O que ATACOU e NÃO CAIU — a defesa do plano, confirmada por medição minha

Registro isto primeiro porque é o que impede a junta de reprovar por suspeita: **atacado, o plano se
sustenta nestes pontos.**

| # | Afirmação do plano | Minha medição independente | Veredito |
|---|---|---|---|
| D1 | **V4 e V5 não têm scanner nenhum** (errata 1 ao plano-mãe) | `grep -rni "scan" src/modules/checklists/ src/modules/damages/` → **zero linhas**. E, pelo lado positivo: `.scan(` sobre `EvidenceScanner` existe em **exatamente 3** sítios em todo o `src/` — `attachment.service.ts:71`, `mobile-evidence-upload.ts:133`, `work-order-attachment.service.ts:59`. Li os dois caminhos inteiros: `checklist.service.ts:387-401` (`createUploadedAttachment` → `assertRunComponent` → `saveChecklistAttachmentFile`) e `damage.service.ts:307-321` (`getEntity` → `saveDamageAttachmentFile`) — nenhum scanner no meio | **VERDADEIRO. Não é over-claim** — é o achado mais forte do bloco e sobe a gravidade real do SEC-004 |
| D2 | Ingresso de bytes = **5 vias** | 5 sítios de `Busboy(` em todo `src/` (attachment/checklist/damage/work-order/mobile-evidence storage), 5 `import Busboy`. Byte por outra porta: `Buffer.from(x,"base64")` em `src/` só em `authority-password.ts:81-82` (KDF, não é arquivo). Escrita de blob: **3** sítios (`local-checklist-storage.provider.ts:28`, `s3-...:54`, `evidence-storage.ts:83`) | **Não achei V6.** O número e a composição estão certos |
| D3 | Egresso de bytes = **5 rotas**, `inline` em **4 routers** (errata 3) | Três padrões independentes convergem: `.pipe(response)` (4), `response.send(result.file.body)` (4), `setHeader("Content-Type", result.file.mimeType)` (4) + `owner-portal.routes.ts:52` (`.type(...).send(Buffer)`). `Content-Disposition` aparece em 4 arquivos, todos `inline`. Nenhuma rota de export CSV/PDF no backend | **Não achei E6** |
| D4 | `helmet()` é global → `nosniff` já existe (errata 2) | `src/app.ts:101` e `src/portal-app.ts:24`, **antes** de todos os routers; `helmet@8.1.0` instalado; `node_modules/helmet/index.mjs:241` = `res.setHeader("X-Content-Type-Options","nosniff")` | **VERDADEIRO** — o plano-mãe (l.130) estava errado, a errata está certa |
| D5 | Web e Flutter **ignoram** `Content-Disposition` (errata 3c) — *"mediu ou inferiu?"* | **Mediu, e eu re-medi por 5 padrões**: em `frontend/src` não há `window.open`, `<iframe`/`<embed`/`<object`, `location.href=`/`assign`/`replace`, nem `href={...api...}`; todo consumo é `fetch`→blob→`createObjectURL` (attachments/checklists/damages/work-orders). No Flutter: `Image.network`/`Image.memory` = **zero**, e `ChecklistApiPaths.downloadAttachment` (`api_contracts.dart:99-100`) é **declarado e nunca usado** em `lib/` | **VERDADEIRO** (para o Flutter, verdadeiro por vacuidade — vale dizer isso na ata) |
| D6 | E5 (owner-portal) tem tipo **fixo pelo servidor** | `owner-portal.photo-pipeline.ts:78` — `image.getBuffer("image/jpeg")` e `return { buffer, contentType: "image/jpeg" }`; todo caminho de erro vira `PhotoPipelineError`. Não há ramo que devolva o tipo do banco | **VERDADEIRO** — E5 fora de escopo é legítimo |
| D7 | Ordem "409 antes do gate; nada persistido" (A8) | `attachment.service.ts:53-88`: descriptor → permissão → posse → **409 idempotência** → `scan` → `saveAttachmentFile`. O store é DEPOIS do scan | **VERDADEIRO**; "nada persistido" é asserível |
| D8 | Fixtures a trocar (§5.10) | `attachments-crud.test.ts:58` e `work-order-attachments.test.ts:33` são **literalmente** `Buffer.from([0x89,0x50,0x4e,0x47])` (4 bytes, quebram no PNG de 8); `mobile-backend-contracts.test.ts:1886` é `Buffer.from("fake-jpeg-bytes")` | **Citações exatas.** A regra "fixture = bytes; asserção nova = caso novo" é auditável |
| D9 | Blob local preservado em 415/422/503 (§7) | `evidence_upload.dart:196-215` e `checklist_attachment_upload.dart:171-217`: `_blobStore.delete(blobRef)` ocorre **só** dentro do ramo `_isStoredStatus`. Todo `ApiError` e todo `catch(_)` caem em `SyncStatus.failed` **sem** delete | **VERDADEIRO — não achei caminho que apague evidência.** O invariante do B-108 aguenta os 3 códigos novos |
| D10 | Nomes de evento de V1 | `mobile-evidence-upload.ts:148` `evidence.upload.scan_failed`; `:369` `evidence.upload.rejected`; o 400 de MIME declarado está mesmo na `l.117` | **Citações exatas** |
| D11 | Piso ≥65 é inflado? | Conferi a aritmética: §6.1 = 15+5+2+5+2+3 = **32** ✓; §6.4 = 4+4+1+1+4+1 = **15** ✓; §6.5 = C1..C6 = **6** ✓ | **Tem lastro caso a caso**, com UMA exceção (A8 abaixo) |

## §3 · Achados

### A1 · O censo de METADADO está incompleto: existe **M5** — e é a mesma classe do M2 · gravidade **ALTA** · escopo **dentro-do-bloco** (a falha é do plano, não do código)

O §2.3 abre com *"Censo feito ANTES de declarar o número, como manda `P-O6R-SUBRECURSO-OBJECT-SCOPE`"* e
declara **4** superfícies (M1–M4). São **5**. Falta:

**M5 — `POST /api/v1/impound-processes/:processId/notifications/:notificationId/issue`** (rota em
`impound.routes.ts:175`), campo *comprovante*:
- `impound.notifications.validators.ts:78-92` (`parseOptionalAttachment`) aceita do CORPO: `file_url`
  (≤2000 chars, sem validação de esquema), `file_name`, **`content_type`**, `checksum_sha256`,
  **`storage_provider`** e **`storage_key`** (≤512);
- `impound.notifications-prisma.repository.ts:116-134` grava com esses valores uma linha
  `attachment` com **`status: "stored"`**, `entity_type: "process_notification"`.

É **byte-a-byte o mecanismo do M2** (`impound-prisma.repository.ts:533-544`, `entity_type:
"impound_intake_inspection"`): tipo, provedor e chave declarados pelo cliente, linha nascendo `stored`. O
plano nomeia o M2 numa pendência ALTA e **não enxerga a irmã**. Verifiquei que não há uma sexta: só **3**
sítios de `attachment.create(` em todo o `src/` (o V2 legítimo + esses dois), e `file_url|fileUrl` só
aparece em 7 módulos, cujos arquivos li.

**Motivo (por que isso reprova a afirmação, não o desenho):** foi **exatamente** um censo declarado completo
e incompleto — 2 routers, a décima via no `POST /mobile/sync/work-order-actions` — que reprovou o
`B-O6R-07a`. O plano herda a lição no texto e repete o erro na execução. E a consequência é operacional: a
pendência que o 07b entrega ao `B-O6R-07c` (`P-O6R-B07B-IMPOUND-PHOTO-KEY-DO-CLIENTE`) descreve **uma** rota;
quem a fechar fecha metade e marcará a classe como resolvida.

**Origem (evidência de data, para a metade que é código):** `git log --diff-filter=A` →
`impound.notifications-prisma.repository.ts` e `...validators.ts` nasceram em **2026-07-27**, `398a19d`,
*"feat(omega5p): PR-09 — trilha de notificações legais (I6)"* (#290). **Pré-existente** como defeito de
código; **dentro-do-bloco** como falha do censo, que é entregável deste plano.

### A2 · "M2 é servível por **E1**" é **FALSO** — e por isso a mitigação declarada é vazia · gravidade **ALTA** · escopo **dentro-do-bloco**

§2.3 (M2) afirma: *"é servível por **E1** (`/attachments/:id/download` só exige tenant da LINHA + `stored`)"*,
e §3.5/§11.4 concluem que *"o 07b **neutraliza a metade 'tipo'** (E1 passa a servir o tipo dos bytes,
`attachment`)"*. **E1 nunca serve essas linhas.**

Caminho lido inteiro, não grep de ausência:
1. `attachment.service.ts:129-136` (`getAttachmentDownload`) → `loadOwnedAttachment`;
2. `attachment.service.ts:142-159`: carrega a linha e chama `this.resolver.descriptorFor(attachment.entityType)`;
   **se `undefined` → `throw AttachmentError(404, "ATTACHMENT_NOT_FOUND")`** (comentário no próprio código:
   *"Integridade: row gravada com um entity_type fora da allow-list vigente"*);
3. o registro é **um só** e tem **exatamente 4** entradas — `attachment-entity-resolver.ts:83/98/113/128`:
   `damage`, `fine`, `insurance_policy`, `maintenance_order`. `grep -rn "registry.set" src/` devolve essas 4 e
   nada mais; os dois únicos construtores do serviço (`attachment.service.ts:191` e `:215`) usam
   `createDefaultAttachmentEntityResolver()`.
4. `impound_intake_inspection` (M2) e `process_notification` (M5) **não estão** no registro → **404**.

**Onde a exposição REALMENTE vive** (e o plano põe fora de escopo): `owner-portal.service.ts:417-441` monta um
`Attachment` sintético com `storageProvider`/**`storageKey` da linha** e chama `resolveAttachmentDownload` —
isto é, **E5 lê o objeto pela chave que o cliente escreveu**. E o provider local
(`local-checklist-storage.provider.ts:67-84`, `resolveSafeStoragePath`) só impede sair do diretório-base: **não
confere prefixo de tenant**. A metade "tipo" é inerte em E5 (Jimp re-codifica), mas a metade "chave" — a que o
plano diz não tratar — é servida justamente pela rota que §5 declara intocável.

**Motivo:** o plano compra crédito por uma mitigação que não alcança o alvo ("neutraliza a metade tipo") e
entrega ao 07c uma pendência com o **mecanismo errado**. Um jurado que confira a mitigação por leitura do §3.5
vai concordar; só a leitura do resolver mostra o 404. Nada aqui é defeito de código NOVO — é premissa falsa,
e premissa falsa é o que o `D-INSPETOR-TERRENO-JUNTA` mandou parar de herdar.

### A3 · Staging **não é condicional**: `NODE_ENV="production"` já está lá, e o remédio escrito na pendência é a própria pane · gravidade **ALTA** · escopo **dentro-do-bloco**

§8.3(b) manda o dev *"medir qual `NODE_ENV` roda lá"* e §12.6 abre `P-O6R-B07B-STAGING-SCANNER-ENV` como
**"condicional (só se §8.3(b) medir staging ≠ production)"**, com *"o valor a setar:
`EVIDENCE_SCANNER=unavailable`"*. Medi agora:

- **`fly.staging.toml:31` → `NODE_ENV = "production"`** (e os comentários l.9-12 do mesmo arquivo já dizem
  *"regra geral: TODO ambiente com NODE_ENV=production, staging incluso"*). `Dockerfile:25` idem na imagem
  final. Nenhum workflow sobrescreve (`grep NODE_ENV .github/workflows/` só acha um comentário no de produção).

Consequências que o plano não escreve:
1. A condição **já está resolvida como VERDADEIRA**: no dia do deploy, **staging responde 503 a TODO upload**
   nas 5 vias — evidência mobile, anexo genérico, anexo de OS, anexo de checklist e foto de dano.
2. O remédio da pendência está **invertido**: `EVIDENCE_SCANNER=unavailable` **é** o default que produz o 503;
   setá-lo não conserta nada. E o refinamento de boot do §3.2 (`production` + `noop` → `addIssue`) fecha a
   única saída barata: staging **não sobe** com `noop`. Ou seja, a pendência prescreve o que já acontece e
   proíbe o que resolveria.
3. Há uma branch `demo/investidor` viva neste repositório. Se a demonstração roda sobre staging, ela para de
   aceitar foto no dia do merge. Isso é uma decisão de negócio — e §C7.2 diz que o humano é **informado**;
   informar exige que esteja escrito.

**Motivo:** não é o fail-closed que ataco (§3.2 é honesto e o ataque 2 do planejador está bem respondido: a
alternativa é AV real, que é junta-5). Ataco **a medição adiada e o remédio errado**: uma pendência
"condicional" cujo gatilho já disparou vira uma pendência que ninguém abre.

### A4 · A marca **É** burlável — terceiro atalho, sem `as`, com censo C6 verde · gravidade **ALTA** · escopo **dentro-do-bloco**

O §11 pede que eu ataque isto primeiro e diz: *"se ele achar um terceiro atalho, é caso novo"*. Achei, e é
**executado**, não raciocinado. Repliquei o desenho do §3.1/§3.4 (Symbol privado do módulo + `sha256` +
`sizeBytes`, com `Object.freeze` na origem) e rodei os três ataques:

```
$ node brand-spread.mjs ; echo "ec=$?"
M-B4: bloqueado -> upload_not_verified:bytes          # reuso de marca de outro buffer  -> o plano pega
B5 : bloqueado -> upload_not_verified:brand           # marca forjada {}                -> o plano pega
SPREAD: PASSOU -> bytes NAO verificados aceitos pelo provider
  symbol sobreviveu ao spread? true | Object.freeze na origem nao impede o clone
ec=0
```

O ataque é uma linha, **sem nenhum cast**:
`{ ...marcaLegítima, sha256: sha(bufferHostil), sizeBytes: bufferHostil.length }`. O *spread* de objeto copia
propriedades próprias **enumeráveis, inclusive as de chave `Symbol`** — a marca viaja junto. Resultado:
`tsc` verde (o tipo é o mesmo), **censo C6 verde** (não há `as UploadVerification` nem
`as unknown as UploadVerification` em lugar nenhum), `assertUploadVerification` **verde** (a marca está lá e
o sha bate com os bytes hostis) e o provider grava.

**Motivo:** o §3.4 vende o desenho como *"um que burle o compilador não grava"*, e o §6.3 só instrumenta as
duas rotas fáceis (M-B3 cast, M-B4 reuso). O plano **não diz** se a propriedade de marca é enumerável, nem se
a identidade é por conteúdo ou por instância — e é essa omissão, não a ideia, que abre o buraco. Como está,
**C6 é um aceite que fica verde com o defeito presente**: cai no item 13 do mandato. A pergunta que o plano
tem de responder por escrito, e provar com um caso, é: *um objeto derivado de uma marca legítima por clonagem
é aceito pelo provider?* Hoje a resposta medida é **sim**.

### A5 · O gate de boot da allowlist cobre **um** dos **dois** nomes de env — e M-B8 prova o nome errado · gravidade **MÉDIA-ALTA** · escopo **dentro-do-bloco**

§3.3 exige: *"toda entrada de `CHECKLIST_STORAGE_ALLOWED_MIME_TYPES` ∉ `SNIFFABLE_MIME_TYPES` → `addIssue`"*,
e M-B8 mutila exatamente essa chave. Só que a allowlist efetiva tem **dois** nomes:

```
env.ts:241  CHECKLIST_STORAGE_ALLOWED_MIME_TYPES: z.string().trim().min(1).optional(),
env.ts:245  CHECKLIST_ATTACHMENT_ALLOWED_MIME_TYPES: z.string().trim().min(1).optional(),
env.ts:548-551  CHECKLIST_STORAGE_ALLOWED_MIME_TYPES:
                  parsedEnv.CHECKLIST_STORAGE_ALLOWED_MIME_TYPES ??
                  parsedEnv.CHECKLIST_ATTACHMENT_ALLOWED_MIME_TYPES ?? "image/jpeg,...,application/pdf",
```

O nome legado **está documentado e vivo**: `.env.example:42`. E o refinamento roda no `superRefine` sobre o
objeto **cru** (idioma existente, `env.ts:296-315` — os gates de `JWT_SECRET`/CORS leem `value.<CHAVE>`), ou
seja **antes** do `??` da l.550. Quem escrever `CHECKLIST_ATTACHMENT_ALLOWED_MIME_TYPES=image/png,image/svg+xml`
liga SVG na allowlist efetiva **sem tropeçar no gate**, e M-B8 continua verde.

**Motivo:** o próprio §3.3 declara o objetivo — *"ninguém liga `image/svg+xml`, `text/html` ou `image/heic`
por env"*. Como especificado, alguém liga. É o segundo aceite que passa com o defeito presente.

### A6 · A tabela do §7 erra o V4: **503 → `SCAN_FAILED` não existe no anexo de checklist** · gravidade **MÉDIA** · escopo: premissa **dentro-do-bloco**, código **pré-existente**

§7 declara *"Anexo de checklist: `checklist_attachment_upload.dart:185-240` — **mesma família** (…) e **mesmo
`mapDioError`**"* e a tabela cruza **503 → `SCAN_FAILED`** como se valesse para as duas vias do app (V1 e V4).
Medido:

```
$ grep -rn "503" mobile/flutter_app/lib/
mobile/flutter_app/lib/core/evidence/evidence_upload.dart:261:    ApiServerError(:final statusCode) when statusCode == 503 => 'SCAN_FAILED',
```

**Uma linha em todo o app.** `checklist_attachment_upload.dart:243-256` mapeia 400/413/422 e cai em
`_ => 'UPLOAD_FAILED'` — **não tem ramo 503**. (`serviceUnavailable`/`HttpStatus` não aparecem em `lib/`.)
`mapDioError` é de fato compartilhado (`http_client.dart:70-88`), mas ele só produz `ApiServerError(503)`;
quem traduz é a função de cada arquivo, e elas **divergem**.

O que **não** cai: o invariante do B-108. Nos dois arquivos o `delete` do blob vive só dentro de
`_isStoredStatus`, e 503 vira `SyncStatus.failed` **com blob preservado**. **Não achei caminho que apague
evidência do usuário** — a conclusão de segurança do §7 sobrevive; a **medição** não.

O que muda de fato: como A3 mostra que produção/staging vão responder 503 em **todo** upload, **todo** anexo
de checklist aparecerá ao técnico como falha genérica `UPLOAD_FAILED`, indistinguível de erro de rede —
enquanto a evidência mobile mostrará `SCAN_FAILED`. **Origem do código:**
`checklist_attachment_upload.dart` nasceu em **2026-08-01**, `c0630fa` (#321) — pré-existente.

### A7 · "Caminho novo sem gate **não compila**" é over-claim; as cláusulas do censo são guards de texto com furos conhecidos · gravidade **MÉDIA** · escopo **dentro-do-bloco**

§3.4 afirma: *"um sexto parser que apareça amanhã e chame `provider.save(...)` sem o gate **não compila**"*.
Verdadeiro — **e só isso**. Medido:
- `tsconfig.json` → `"include": ["src/**/*.ts"]`, e `npm run lint` **é** `npm run check` **é**
  `tsc -p tsconfig.json --noEmit` (package.json l.18-20, 33). Não há ESLint: **nenhuma regra de lint pode
  reforçar nada**; a barreira de build é só o tipo.
- Quem escrever bytes **sem** passar pelos 3 providers compila normalmente. A cláusula C5 do §3.6 é a única
  rede, e ela é texto: `writeFile(` **não casa** `writeFileSync(`, `createWriteStream(`, `appendFile(`,
  `copyFile(` nem um `Upload` do `@aws-sdk/lib-storage`; e o escopo escrito é `src/modules/**`, enquanto o da
  C1 é `src/**` — um arquivo em `src/lib/` escapa da C5 e não da C1.

**Motivo:** a frase do §3.4 é o argumento central de que o bloco é estrutural e não pontual; a junta vai citá-la.
Ela precisa vir com a fronteira escrita ("compila-quebra vale para quem chama os providers; fora disso quem
guarda é a C5, cujo alcance é este"), senão o próximo bloco herda uma garantia que não existe.

### A8 · Piso e rótulos: três números para o mesmo piso, e um rótulo de mutação que não existe · gravidade **BAIXA** · escopo **dentro-do-bloco**

O piso **≥65 tem lastro** (aritmética conferida em D11), mas o plano diz três coisas diferentes:
`≥40` (§0, l.35) · `"§6 soma ≥ 44"` (§2.6, l.185) · `≥65` (§6.5, l.506). O parêntese da l.185 é resíduo de
versão anterior e é justamente o número que a cadeira C3 vai conferir. Além disso, **§6.2 é o único piso sem
lastro item a item**: nomeia B1–B6 (6 casos) e declara `≥12` — chegar lá exige quebrar B1 em um caso por
formato, o que o plano não diz. E §5 (l.423) manda preservar *"a mutação **M-D3** do §6"* — **não existe M-D3
no §6**; a mutação de `app.ts` é a **D6** (l.499). Rótulo errado em lista de escopo é como o dev decide o que
pode tocar.

## §4 · Os outros ataques que o planejador pediu — respondidos

| Ataque (numeração do §11) | Meu veredito |
|---|---|
| 3 · sniff não pega poliglota nem JS em PDF | **Defesa aceita.** O plano declara em voz alta que garante TIPO, não inocuidade, e `attachment`+`nosniff` fecham a execução no navegador. **Ressalva de honestidade:** o campo `teste` do achado é *"Infected, MIME divergente e scanner down não persistem nem baixam"* — com `noop` ainda sendo o default em `development`/`test`, o primeiro dos três mecanismos do SEC-004 continua verdadeiro **fora de produção**. O fallback QUA-004 (`supersedido` + `componentes_abertos`) que o próprio §12 já redigiu é a leitura defensável; escolher `fechado` sem escrever isso é a leitura que a junta terá de bancar |
| 5 · legado mentiroso no banco | **Resolve, não esconde** — mas por um motivo mais forte do que o plano diz: o tipo do banco **não é lido** no egresso (`resolveAttachmentDownload` já hoje faz `object.mimeType ?? attachment.contentType ?? octet-stream`, e o provider local `getObject` **não devolve `mimeType`** — `local-checklist-storage.provider.ts:41-53` — logo hoje o tipo servido é sempre o da linha; com o peek, passa a ser sempre o dos bytes). O gravado fica mentiroso e a pendência `LEGADO-MIME` é o lugar certo |
| 6 · 400 × 415 no V4 | **Não é problema deste bloco.** O `400 mime_type_not_allowed` nasce no parser (`checklist-attachment.storage.ts:95`), o app mapeia 400→`UPLOAD_VALIDATION` e 415→`UPLOAD_FAILED`, **ambos preservam o blob**. Pendência BAIXA é a calibragem certa |
| 7 · fixtures editados para passar | **Regra sólida e auditável** (D8). Duas notas: (i) `owner-portal-photos.test.ts` chama o provider direto e vai precisar da marca — cai em "troca de marca" do §5.10, mas **não** é "troca de fixture"; convém nomeá-lo, porque §5 manda o dev PARAR diante de arquivo fora das listas; (ii) `sanitizeFileName` (`attachment.storage.ts:211-215`) já reduz o nome a `[A-Za-z0-9._-]` no upload — o caso D4 (acento/emoji/CRLF) **só é alcançável semeando a linha**, e o plano deve dizer isso para o caso não virar teatro |

## §5 · O que sobrevive vira REQUISITO do plano (obrigação, não conserto — §C7.4-bis)

Não proponho correção, não desenho solução e não escrevo código: nomeio **a obrigação** que o plano precisa
passar a carregar. Quem planeja emenda; quem desenvolve implementa; eu não faço nem um nem outro.

**Bloqueiam o start (A1, A2, A4, A5):**
1. §2.3 passa a enumerar **M5** com rota, arquivo:linha, data de origem e dono — e a pendência de impound
   passa a nomear **a classe** (chave/tipo/provedor declarados pelo cliente em linha `attachment` `stored`),
   não uma rota.
2. §2.3/§3.5/§11.4 param de afirmar que E1 serve as linhas de impound. O plano tem de declarar, com o
   caminho lido, **qual** egresso serve cada superfície de metadado e **o que o 07b alcança de fato** — sem
   crédito por mitigação que não chega ao alvo.
3. §3.1/§3.4 respondem por escrito se a marca é forjável por **derivação de uma marca legítima** (enumerabilidade
   / identidade), e §6.2 ganha o caso correspondente **com o vermelho-controle**. Enquanto a resposta não
   estiver escrita e provada, C6 não pode ser contada como prova de nada.
4. §3.3/§6.3 tratam a allowlist pelos **dois** nomes de env (`CHECKLIST_STORAGE_*` e o legado
   `CHECKLIST_ATTACHMENT_*`, `.env.example:42`), e M-B8 passa a mutilar o nome que hoje escapa.

**Obrigações de escrita (A3, A6, A7, A8):**
5. §8.3(b)/§12.6 deixam de ser condicionais: `fly.staging.toml:31` já é `NODE_ENV="production"`. O plano
   escreve a consequência ("staging recusa todo upload no dia do merge"), diz que `EVIDENCE_SCANNER=unavailable`
   **não** é remédio, e leva o ponto à ata para o humano ser **informado** (§C7.2) — inclusive quanto à
   `demo/investidor`.
6. §7 corrige a linha 503 do V4 e registra a divergência de mapeamento entre os dois arquivos Dart, mantendo
   (porque é verdade e eu confirmei) que **nenhum** caminho apaga blob.
7. §3.4 escreve a fronteira do "não compila" e a C5 declara seu alcance real (aliases de escrita + `src/**` × `src/modules/**`).
8. §0/§2.6/§6.5 convergem para **um** piso; §6.2 mostra como 6 casos nomeados viram ≥12; l.423 troca `M-D3` por `D6`.

## §6 · Escopo dos achados (§C7.1-ter(a)) — o que NÃO reprova

**`pre-existente`, com evidência de origem — vira pendência nomeada, não reprovação:**
- **Chave/tipo/provedor do cliente em linha `attachment stored`** — M2 (`impound-prisma.repository.ts:533-544`)
  e **M5** (`impound.notifications-prisma.repository.ts:116-134`). Origem datada: `398a19d`, **2026-07-27**,
  #290 (M5); o arquivo do M2 nasceu em `574a1d2`, **2026-07-26**, #285. Servível por **E5**
  (`owner-portal.service.ts:417-441` lê pela `storageKey` da linha) e **não** por E1 (A2); o provider local só
  barra fuga do diretório-base, não o prefixo de tenant (`local-checklist-storage.provider.ts:67-84`).
- **Ausência do ramo 503 no upload de anexo de checklist** — `checklist_attachment_upload.dart`, origem
  `c0630fa`, **2026-08-01**, #321.
- **`400` onde as irmãs usam `415`/`413` no V4** e **data-URI em `value` de resposta (M3)** — como o plano já classifica.

**`dentro-do-bloco`:** A1, A2, A3, A4, A5, A7, A8 e a metade "tabela §7" do A6 — todos são **afirmações deste
plano**, e o plano é o entregável que estou julgando. Nenhum deles é defeito de código introduzido pelo bloco
(não há código ainda); todos são falhas de censo, de premissa ou de falsificabilidade que, se passarem, o
código herda.

## §7 · Encerramento

**Rodadas: 2 de 2** (rodada 1 = os 7 ataques que o próprio planejador antecipou, conferidos um a um: 5
sobrevivem à defesa dele, 2 caem — A2 e A4; rodada 2 = censo e medições próprias, §3). **Não reabri a premissa
do bloco** e portanto não abri PD com ≥5 fontes: o objetivo (fechar o `Ω6R-SEC-004`), o fatiamento e a
abordagem técnica continuam de pé, e as duas PDs que o §11 já pede (`MAGIC-BYTES`, `DISPOSITION`) seguem
necessárias e suficientes para o que dependem.

**Veredito: PLANO ROBUSTO COM RESSALVA.** O desenho aguenta; o censo e a falsificabilidade, não — em 8 pontos,
2 dos quais deixam aceites verdes com o defeito presente. Cumpridos os requisitos do §5 (1–4 antes do start),
o plano fica em condição de ir à junta.

**Papéis (§C7.4-bis):** eu **acho** e **não conserto** — não escrevi plano, não escrevi código, não votei, e
não toquei `src/`. Meu único arquivo neste worktree é este parecer.

— `critico-adversarial`, 2026-09-06

---

# RODADA 2 (2026-09-06) — verificação da `EMENDA E1` (teto do §C7.4 atingido; encerro aqui)

**Alvo:** `B-O6R-07b-plano.md` l.770–1054, commit **`2b9003a`**. **Escopo:** só os 8 achados da rodada 1 +
a decisão nova que a emenda tomou (`parcialmente_superado`). Não re-litigo o que já validei em §2 (D1–D11).

**Terreno, provado por mim e não herdado do coordenador:**
- `git diff -U0 03f136e HEAD -- <plano>` → **um único hunk**: `@@ -766,0 +767,288 @@`; `--numstat` → `288  0`.
- `git show 03f136e:<plano> | head -766 | sha256sum` **==** `git show HEAD:<plano> | head -766 | sha256sum`
  (`93e18953effa1c0d…`). **Append-only comprovado** (§A2): o corpo não foi reescrito para caber na emenda.
- `git diff --stat e55245a HEAD -- src/ tests/ frontend/ mobile/ prisma/` = **vazio**. Continua sem código.
- `git status --short` limpo. Não toquei `demo/investidor`, `gov-descuido`, `san2-r`; nada em `src/`.

## VEREDITO DA RODADA 2: **PLANO ROBUSTO** — o bloco pode gerar a primeira linha de código

Os **8 achados fecham**, e os dois que passavam verdes com o defeito presente (A4, A5) fecham **por execução
minha, não por promessa do plano**. Três notas residuais ficam registradas abaixo; nenhuma delas deixa aceite
verde com defeito presente, nenhuma é premissa falsa, e nenhuma bloqueia o start.

| # | Achado (rodada 1) | Rodada 2 | Como verifiquei |
|---|---|---|---|
| A1 | censo sem M5 | **FECHADO** | M5 entra com arquivo:linha e origem; pendência renomeada para a CLASSE; a alegação "M5 sem leitor" é **verdadeira** (medida por mim) |
| A2 | "M2 servível por E1" falso; mitigação vazia | **FECHADO** | crédito retirado nominalmente; guard de tenant nos **4** resolvers, e provei que **não há caminho para `getObject` fora deles** |
| A3 | staging condicional / remédio invertido | **FECHADO** | `fly.staging.toml:31` assumido; remédio errado removido; e as **duas** alegações novas da emenda conferem |
| A4 | marca burlável por derivação | **FECHADO (executado)** | 6 rotas de clonagem recusadas contra o desenho novo; M-B9 reproduz o meu ataque de rodada 1 |
| A5 | gate de boot lê 1 de 2 nomes de env | **FECHADO (executado por leitura de cadeia)** | equivalência do `??` provada; M-B8 é **a minha** mutação, não uma variante mais fácil |
| A6 | tabela §7 erra o V4 | **FECHADO** | linha corrigida exatamente como medi |
| A7 | "não compila" over-claim | **FECHADO** | fronteira escrita em 3 camadas; e medi que o C5 emendado **não gera falso-positivo** em `src/` hoje |
| A8 | três pisos + rótulo M-D3 | **FECHADO COM NOTA** | piso único ≥89 confere na soma; a frase-ponte "+20 sobre o corpo" não reconcilia com o ≥65 |

## R2·1 · A4 — **executado contra o desenho novo: os seis atalhos morrem, e o vermelho-controle funciona**

Repliquei o desenho da E1·3 (objeto opaco `Object.freeze({})` sem propriedade nem `Symbol` em runtime +
`WeakMap` privado + fatos lidos do **registro** + providers usando o **retorno**) e rodei contra ele o meu
ataque de rodada 1 e os cinco irmãos:

```
$ node brand-weakmap.mjs ; echo "ec=$?"
B7  spread          : recusado -> upload_not_verified:brand      <-- o MEU ataque da rodada 1
B8  Object.assign   : recusado -> upload_not_verified:brand
B9  Object.create   : recusado -> upload_not_verified:brand
B10 structuredClone : recusado -> upload_not_verified:brand
B10 JSON round-trip : recusado -> upload_not_verified:brand
B11 Proxy(marca,{}) : recusado -> upload_not_verified:brand
B12 reuso 2x mesmos : ACEITOU (mimeType=image/png)               <-- verde ESPERADO (marca não é one-shot)
X1  marca de A + bufB: recusado -> upload_not_verified:bytes
M-B9 spread (antigo): ACEITOU (mimeType=image/png)               <-- vermelho-controle: o desenho de conteúdo cai
ec=0
```

Leitura: identidade por **instância** fecha a classe inteira de derivação — spread, `Object.assign`,
`Object.create` (prototype não é identidade), `structuredClone`, round-trip JSON e `Proxy` (o proxy **é** outra
chave de `WeakMap`). E **M-B9 é vermelho de verdade**: com a checagem por propriedade/`Symbol`, o meu spread
volta a aceitar bytes hostis — ou seja, o aceite B7 não é decorativo, ele mede o que mudou.

**Procurei o quarto atalho e não achei um que valha bloqueio.** Testei os dois candidatos que eu tinha:
- **`Proxy` sobre o BUFFER** (hash veria A, escrita veria B): `createHash().update(proxy)` → **`TypeError:
  The "data" argument must be … Buffer, TypedArray, or DataView`**. Não é vetor.
- **Janela verify→write:** o assert é síncrono; o `writeFile` do provider acontece depois de um `await`
  (`mkdir`). Medi que, se o MESMO `Buffer` for mutado nessa janela, grava-se conteúdo diferente do verificado
  (`bytes gravados == verificados? false`, arquivo começando com `MZ`). **Não é achado**: em nenhuma das 5 vias
  existe segundo detentor do buffer (busboy monta um por requisição). Registro como propriedade a declarar —
  a marca prova *"estes bytes foram verificados no ato da chamada"*, não *"estes bytes foram gravados"* —,
  não como defeito.

## R2·2 · A5 — a cadeia é a mesma, o nome legado está coberto, e **M-B8 é a minha mutação, não uma mais fácil**

Confirmei a equivalência que a emenda promete, por leitura da cadeia inteira:
- `env.ts:520` — `const parsedEnv = envSchema.parse(process.env)`; o `superRefine` está em `env.ts:283`, no
  MESMO schema. Logo o `value` do refinamento **é** o objeto que vira `parsedEnv`: a cadeia
  `NEW ?? LEGACY ?? DEFAULT` que a emenda manda usar é byte-a-byte a de `l.548-551`. Não há transformação
  entre uma e outra que pudesse divergir (`""` é impossível: as duas chaves são `.trim().min(1).optional()`).
- **Não há terceiro nome:** `grep -rn CHECKLIST_ATTACHMENT_ALLOWED_MIME_TYPES src/` → **2 linhas**, a do
  schema (`:245`) e a do `??` (`:550`). Nenhum consumidor lê a chave legada por fora.
- **M-B8 é a minha mutação:** legado com `image/svg+xml` **e a chave nova AUSENTE** → parse tem de falhar. Essa
  é exatamente a configuração que eu disse que escapava. A mutação antiga (chave nova com svg) foi rebaixada a
  **M-B8c**, e M-B8b documenta a precedência. **Não é variante mais fácil — é a mais difícil das três.**

**Nota residual (BAIXA, não bloqueia): normalização.** Quem consome a allowlist normaliza —
`checklist-storage.factory.ts:29-32` faz `.split(",").map(trim().toLowerCase()).filter(Boolean)`. A emenda
especifica o refinamento como "⊂ `SNIFFABLE_MIME_TYPES`" **sem dizer** que aplica a mesma normalização; assim
como está, `IMAGE/SVG+XML` ou `" image/svg+xml "` passa o gate de boot e chega normalizado à allowlist
efetiva. Os três casos (M-B8/b/c) usam minúscula, então o aceite não veria isso. **Por que é nota e não
achado:** a segunda camada que a própria emenda escreveu absorve — `sniffMimeType` nunca devolve tipo fora do
conjunto sniffável, então SVG na allowlist é entrada morta e o upload dá 415 (`content_unrecognized`), que é o
caso **A11**. O gate de boot existe para ser barulhento; ficar mudo num caso de caixa-alta não abre buraco de
bytes. Registrar em 1 linha ("compara com a MESMA normalização do consumidor") resolve.

## R2·3 · A2 — **fechou**, e a pergunta decisiva tem resposta medida: não há caminho para o `getObject` fora dos 4 resolvers

A pergunta era: *"herança por chamada é prova suficiente, ou existe caminho para o `getObject` que não passa
pelos 4 resolvers?"* Medi por **presença**, enumerando todos os sítios:

```
$ grep -rn "getObject(" src/ --include=*.ts        → 7 ocorrências
  checklist-storage.types.ts:42          (declaração da interface)
  local-checklist-storage.provider.ts:41 (implementação)
  s3-checklist-storage.provider.ts:82    (implementação)
  attachment.storage.ts:202              ← dentro de resolveAttachmentDownload            (def :196)
  work-order-attachment.storage.ts:193   ← dentro de resolveWorkOrderAttachmentDownload   (def :187)
  damage-attachment.storage.ts:217       ← dentro de resolveDamageAttachmentDownload      (def :207)
  checklist-attachment.storage.ts:212    ← dentro de resolveChecklistAttachmentDownload   (def :201)
```

**4 chamadores, 4 resolvers, correspondência 1:1** — li os corpos das quatro funções para confirmar que a
chamada está dentro delas e não numa função vizinha. E `owner-portal.service.ts:417-441` alcança o objeto por
`resolveAttachmentDownload` (importado em `:2`), não por provider próprio: **E5 herda o guard sem uma linha em
`owner-portal/**`**. O §5 não precisou afrouxar.

Dois pontos que a emenda **não** afirmou e que eu confiro porque decidiam a viabilidade:
1. **O guard tem de onde tirar o tenant sem mudar assinatura.** Os quatro tipos carregam
   `readonly tenantId: string` — `Attachment` (`attachment.types.ts`), `ChecklistAttachment`, `DamageAttachment`,
   `WorkOrderAttachment`. Logo `assertStorageKeyWithinTenant` é chamável **dentro** dos resolvers, sem tocar
   nenhum chamador — inclusive sem encostar em `checklist.service.ts` fora do trecho permitido (o §5 do corpo
   só libera `createUploadedAttachment` l.387-415; o download vive noutro método). **Não há PARA escondido aqui.**
2. **O formato da chave sustenta "primeiro segmento = tenant".** Local: `path.posix.join(tenantId, runId, obj)`
   (`local-checklist-storage.provider.ts:24`). S3: `[normalizedPrefix, tenantId, runId, obj].filter(Boolean)`
   (`s3-checklist-storage.provider.ts:118-123`) — daí o T10 do prefixo. E a via V2, que usa o slot `runId` como
   `${entityType}/${entityId}` (`attachment.storage.ts:166-168`), continua com **tenantId no primeiro
   segmento** (4 segmentos, não 3). O guard vale para as quatro.

**Nota residual (a única estrutural, não bloqueia): o censo cobre ESCRITA, não LEITURA.** A doutrina do §3.6 é
*"parser novo que apareça em `src/` sem estar no censo derruba o guard"*, e a C5 emendada (E1·7) lista padrões
de **escrita**. Não há cláusula para `getObject(`. Hoje isso é inofensivo — os 4 sítios são os 4 resolvers —,
mas um quinto leitor amanhã passa por fora de `assertStorageKeyWithinTenant` **em silêncio**, e o T1–T9 não
pega (eles exercitam os 4 que existem). Peço, sem bloquear, o mesmo tratamento que a emenda deu ao A7:
**declarar o alcance** ("o guard de leitura vive em 4 sítios nominais; não há tripwire para um quinto").

## R2·4 · A1 — M5 fora do código é **escopo legítimo**, não a esquiva que acusei; e a alegação "sem leitor" é verdadeira

A pergunta do coordenador é a certa: por que isto não é a mesma esquiva do meu achado A2 da rodada 1? Porque
**a esquiva de lá era crédito por mitigação que não alcança o alvo**; aqui o crédito é verificável e eu
verifiquei. Confiro os três pilares da decisão:

1. **"`process_notification` não tem leitor em `src/`" — VERDADEIRO.** `grep -rn process_notification src/`
   devolve 8 linhas: o writer (`impound.notifications-prisma.repository.ts:120`), 3 comentários, 2
   `resourceType` de auditoria (`impound.notifications.controller.ts:31,51`) e uma tabela SQL homônima
   (`process_notifications`, l.62/386 — outra coisa). **Nenhum leitor de `attachment` por esse `entity_type`.**
   Confirmado pelos dois lados: E1 devolve 404 (registro de 4 descriptors) e o único leitor de anexo de
   impound é `getInspectionPhotoAttachmentForPortal` (`impound.service.ts:153`), que filtra
   `entity_type: "impound_intake_inspection"` (`impound-prisma.repository.ts:569`). Egresso de M5 hoje = **zero**.
2. **A metade alcançável fecha aqui, para as duas rotas.** O guard de prefixo de tenant é no READ, nos 4
   resolvers — vale para M2 (que É lido, por E5) e valeria para qualquer leitor futuro de M5.
3. **A metade que fica tem dono, origem datada e enunciado de CLASSE.** `impound/**` é PROIBIDO no §5 do
   corpo; a origem é anterior ao bloco (`574a1d2` 2026-07-26 #285; `398a19d` 2026-07-27 #290) → §C7.1-ter(a)
   manda pendência nomeada, não reprovação. E a pendência deixou de ser "a rota da foto" para ser a classe
   (`P-O6R-B07B-ATTACHMENT-STORED-DO-CLIENTE`), com "quem fechar prova por presença (3 sítios → 1)" — que é o
   critério que impede fechar metade e declarar a classe resolvida. Era exatamente a minha objeção. **Fechado.**

## R2·5 · A3, A6, A7, A8 — obrigação escrita com alcance honesto

**A3 · FECHADO.** A condição virou fato (`fly.staging.toml:31`), o remédio invertido saiu, a pendência foi
reescrita como `P-O6R-B07B-STAGING-SEM-UPLOAD` e a agenda vai ao dono com três caminhos nomeados. Conferi as
**duas alegações novas** que a emenda introduziu, porque afirmação nova é afirmação a medir:
- *"o smoke do deploy não faz upload → o job fica verde e a pane só é visível a quem usa"* — `scripts/smoke-staging.mjs`
  existe e **não contém** `multipart`, `evidence-uploads` nem `attachments`. **Verdadeira, e é a parte mais
  desconfortável do achado**: o CI não vai avisar.
- *"nenhum workflow nem `fly*.toml` referencia `demo/investidor`"* — `grep` em `.github/`, `fly.staging.toml`,
  `fly.production.toml`, `docker-compose*.yml` → **zero**. **Verdadeira** (o risco da demo é de uso, não de pipeline).

**A6 · FECHADO.** A linha do §7 passa a dizer V1 503→`SCAN_FAILED`, V4 503→`UPLOAD_FAILED` — que é o que medi
(`rg -n 503 mobile/flutter_app/lib` = 1 linha) — mantendo o invariante do B-108, que continua verdadeiro. O
item entrou na pendência de mobile com o enunciado certo (unificar o mapeamento), sem tocar `mobile/**`.

**A7 · FECHADO — e a nova frase promete o que mede.** Verifiquei as duas coisas que decidem isso:
- **O ponto cego declarado está vazio hoje:** `find src -name "*.js" -o -name "*.mjs" -o -name "*.cjs"` → **nada**.
  Declarar um ponto cego que não existe ainda é conservador, não é desculpa.
- **A C5 emendada não gera falso-positivo** — e isso importa, porque tripwire ruidoso vira allowlist inchada:
  rodei o conjunto de padrões novo (`writeFile(|writeFileSync(|appendFile(|appendFileSync(|copyFile(|copyFileSync(|createWriteStream(|rename(|fs.promises.|PutObjectCommand|UploadPartCommand`)
  sobre `src/**` **excluindo os 3 providers**: **zero ocorrências**. Só 3 arquivos de `src/` sequer importam
  `node:fs` (os 2 providers de escrita + `cloud-costs/aws-cur.importer.ts`, que não casa nenhum padrão).
  A allowlist nominal de 3 é suficiente e não precisará crescer.
- A frase final ("quem chama os providers sem marca não passa no `tsc` nem grava; quem escreve fora é pego
  pelo censo C5 — tripwire de texto, não prova") é **exatamente** o alcance medido. Over-claim removido.

**A8 · FECHADO COM NOTA.** O piso único **≥89 confere na soma**: 32 + 20 + 7 + 24 + 6 = 89, e cada parcela tem
decomposição (B1 = 9; §6.3 = M-B7×3 + M-B8/b/c×3 + A11; §6.4 = 15 + T1–T8 + T9). `M-D3` → `D6` corrigido; as
notas do meu §4 item 7 (owner-portal-photos = "troca de marca", D4 só por semeadura) viraram texto.
**Nota:** a frase-ponte do E1·10 — *"+20 sobre o corpo (já dentro do ≥89)"* — **não reconcilia**: 6+3+1+10 = 20,
mas o próprio texto diz que T10 **substitui** um caso genérico (net +19), e o ≥65 do corpo nunca contou o §6.3
e usava §6.2 mais grosso (12, não 14). 65+19 = 84 ≠ 89. O número que a C3 deve conferir é **89, a soma das
seções** — a frase-ponte não é fonte. É a mesma classe do A8 (número que não fecha na subtração), agora
inofensiva porque o piso absoluto está decomposto; registro para não virar discussão na junta.

## R2·6 · A decisão nova: `Ω6R-SEC-004` fecha como `parcialmente_superado` — **é honestidade, e eu provo por três lados**

**Veredito: honestidade. Não é o bloco entregando menos do que o nome promete.**

1. **Conta dos mecanismos.** A `descricao` do achado afirma três fatos. Depois do bloco: *"MIME vem do
   cliente"* morre em **todo** ambiente (sniff nas 5 vias, tipo gravado = verificado); *"download inline com
   esse MIME"* morre em **todo** ambiente (tipo dos bytes + `attachment` + `nosniff` em E1–E4). *"Scanner
   default sempre clean"* morre em produção/staging e **sobrevive por desenho** em `development`/`test`. Dois
   de três em todo lugar, o terceiro onde importa. Declarar `fechado` seria afirmar o que não é verdade num
   `NODE_ENV` que o próprio plano escolhe manter — foi a ressalva que levantei na rodada 1 (§4, item 3), e a
   emenda a adotou em vez de contorná-la.
2. **O bloco PAGA por isso, visivelmente.** Conferi o guard: `tests/kpi-achados-paridade.test.ts:172-173`
   classifica como fechado **só** `status === "fechado"`; `:186-189` conta `p1_fechados` só com hash de merge;
   `:192-196` exige que `aguardando_merge` seja **exatamente** os fechados-na-autoria. Com
   `parcialmente_superado`, o achado **não pode** entrar em `aguardando_merge` e **não** move `p1_fechados` —
   que é precisamente o que a E1·11 escreve. Ou seja: o formato do KPI que a emenda adota é o **único** que o
   guard aceita, e o preço é o painel não mostrar avanço de P1 neste PR. **Esquiva não paga preço visível.**
   (E `parcialmente_superado` não é dimensão nova: já ocorre 2× em `achados.jsonl` — sem §C3.0 pendente.)
3. **Não havia opção barata em escopo.** Matar o mecanismo (1) em dev/test exigiria ou AV real (serviço novo →
   junta-5, fora) ou recusar upload também em dev/test (quebraria a suíte e toda máquina de desenvolvimento).
   A terceira via — uma flag "permitir noop em produção" — é o achado com outro nome, e a emenda a proíbe
   nominalmente (E1·9). O residual está nomeado, com dono (`P-O6R-B07B-SCANNER-AV-REAL`) e com o contrato de
   quem o fecha.

**O que precisa ficar na ata para isto continuar honesto:** `fechado` só quando o bloco de AV existir. Se
alguém promover o achado a `fechado` no backfill pós-merge sem o AV, o guard **não** pega (ele só exige hash de
merge, não exige AV) — essa é a única porta por onde a honestidade de hoje pode ser desfeita amanhã.

## R2·7 · Encerramento — teto de 2 rodadas cumprido

**Rodada 1:** 8 achados, 4 bloqueantes. **Rodada 2:** os 8 fecham; A4 e A5 — os dois que passavam verdes com o
defeito presente — fecham **por execução minha contra o desenho novo**, não por promessa. Procurei o quarto
atalho da marca e não encontrei um que sustente bloqueio (dois candidatos testados, ambos não-vetores).

**Três notas residuais, todas BAIXA, nenhuma bloqueia** — para a ata, não para o start:
1. **Sem tripwire de LEITURA:** o guard de tenant vive em 4 sítios nominais; o censo cobre escrita. Declarar o
   alcance, como o A7 declarou o dele (R2·3).
2. **Normalização da allowlist:** o refinamento deve comparar com a mesma normalização do consumidor
   (`trim().toLowerCase()`), senão o gate de boot fica mudo em caixa-alta — absorvido pela segunda camada (R2·2).
3. **Frase-ponte do piso:** o número a conferir é **89** (soma das seções); o "+20 sobre o corpo" não
   reconcilia com o ≥65 (R2·5).
4. **Propriedade a declarar, não defeito:** a marca prova *"estes bytes foram verificados no ato da chamada"*,
   não *"estes bytes foram gravados"* — há um `await` entre o assert e a escrita. Sem detentor concorrente do
   buffer nas 5 vias, não há exploit (R2·1).

**VEREDITO FINAL: PLANO ROBUSTO.** O desenho sobrevive, as premissas falsas foram corrigidas com
arquivo:linha re-lido, e os aceites voltaram a ser falsificáveis — inclusive os dois que não eram. **O bloco
pode gerar a primeira linha de código.**

**Papéis (§C7.4-bis), nesta rodada:** continuo só achando. Não escrevi a emenda, não escreverei código, não
voto. Os dois scripts que rodei são réplicas do desenho (`brand-weakmap.mjs`, `brand-buffer-probes.mjs`) em
scratchpad de sessão, fora do repositório; nada além deste parecer foi escrito no worktree —
`git status --short` = só `votos/B-O6R-07b/`.

— `critico-adversarial`, 2026-09-06 (rodada 2 de 2 — encerrado)
