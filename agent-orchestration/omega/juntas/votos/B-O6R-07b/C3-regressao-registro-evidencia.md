# C3 · contrato / regressao / registro — evidencia incremental (P1)

Identidade nova. Nada de ata, plano, briefing ou parecer alheio entrou como fato.
Cadeira com VETO. Quorum: unanimidade de 3 (nao 5/5). O veto NAO alcanca `pre-existente`.

## Terreno medido por mim (2026-09-06)

- `git rev-parse HEAD` = `91b8cdf184da84230e965b68bde33f881c2f15aa` (branch `fix/o6r07b-uploads`)
- `git rev-parse origin/main` = `e55245a782e0d287a39e9b0438df846251b3f668`
- `git merge-base origin/main HEAD` = `e55245a782e0d287a39e9b0438df846251b3f668` (base = main de verdade)
- **Head de CODIGO = `a2988b5d`**, provado: `git diff --stat a2988b5 HEAD -- src tests prisma frontend mobile .github scripts Kpis docs API_CONTRACTS.md` -> **VAZIO** (ec=0).
  `git diff --name-only a2988b5 HEAD` devolve **15 arquivos, todos de registro de junta**
  (`.agents/agents/especialistas/jurado-07b-*`, `.claude/agents/especialistas/jurado-07b-*`,
  `BRIEFING-B-O6R-07b.md`, `votos/B-O6R-07b/00-inspetor-terreno.md`, `00-quedas.md`,
  `C1-secops-*`, `C2-mobile-b108-*`). Nenhum toca produto.
- Worktree: `.claude/worktrees/o6r07b` (o do bloco). `node_modules` proprio, **nao e junction**
  (`dir /AL node_modules` sem entrada de link).

---

# ITEM 1 · Escopo §5 COMO EMENDADO (E1·9) — arquivo a arquivo e hunk a hunk

## 1.0 A REGUA QUE APLIQUEI, por extenso (para a junta contestar a regua, nao so o veredito)

Fonte: `agent-orchestration/omega/planos/B-O6R-07b-plano.md` **do head** — `wc -l` = **1054**,
`grep -c 'EMENDA E1'` = **3** (idem em `git show a2988b5:<plano>`). **NAO** usei a copia solta de 509
linhas da arvore principal.

**PERMITIDO — codigo** (§5.1-8 + E1·9): (NOVOS) `src/modules/evidence/{upload-gate,content-sniff,
evidence-scanner.factory,serve-verified-file}.ts` **+ `storage-key-scope.ts` (E1·9)** ·
`evidence/evidence-storage.ts` · `mobile/mobile-evidence-upload.ts` · `attachments/attachment.storage.ts`
(+ `resolveAttachmentDownload`, E1·9) · `attachment.service.ts` SO o trecho do gate ·
`attachment.routes.ts` SO o ramo `if (result.file)` de `sendResult` · `work-orders/
work-order-attachment.storage.ts` (+resolve) · `work-order-attachment.service.ts` SO o trecho ·
`work-order.routes.ts` SO o ramo de arquivo · `checklists/checklist-attachment.storage.ts` (+resolve) ·
`checklist.service.ts` SO `createUploadedAttachment` · `checklist.routes.ts` SO o ramo de arquivo ·
`checklists/storage/{checklist-storage.types,local-checklist-storage.provider,s3-checklist-storage.provider}.ts`
· `damages/damage-attachment.storage.ts` (+resolve) · `damage.service.ts` SO `createUploadedAttachment` ·
`damage.routes.ts` SO o ramo de arquivo · `src/config/env.ts` · `.env.example`.
**PERMITIDO — testes** (§5.9-10 + E1·9): 6 `tests/o6r07b-*.test.ts` NOVOS + `tests/helpers/upload-fixtures.ts`
NOVO; EDICOES nominais so de fixture/marca em `attachments-crud`, `work-order-attachments`,
`mobile-backend-contracts`, `checklist-storage`; `owner-portal-photos.test.ts` **SO** (a) a marca no
`saveAttachmentFile` e (b) **1** caso novo.
**PERMITIDO — registro** (§5.11): `API_CONTRACTS.md` · `docs/api.md` · `Kpis/{kpis-latest.json,
kpis-history.json,kpis-history.md,index.html,app.js(so FROZEN)}` · `pendencias.md` (SO APPEND) ·
`achados.jsonl` + `REGISTRO_ACHADOS_O6R.md` · `status-geral.md` · `log-execucao.md` · `docs/omega-pd.md` ·
o proprio plano · registros da junta.

## 1.1 Diff medido — base `origin/main` = `e55245a`, three-dot, head de codigo `a2988b5`

`git diff origin/main...a2988b5 --shortstat` = **50 files changed, 5644 insertions(+), 185 deletions(-)**.
Re-medido por mim; coincide com o numero do inspetor, mas o numero e meu.

Os **50** arquivos, um a um, cabem na regua acima. Nenhum fora da lista. Numstat integral abaixo.

```
10   0  .env.example                                     [§5.8]
60   0  API_CONTRACTS.md                                 [§5.11]
 1   1  Kpis/app.js                                      [§5.11 — so FROZEN, ver 1.4]
13   0  Kpis/kpis-history.json                           [§5.11 append]
36   0  Kpis/kpis-history.md                             [§5.11]
29  29  Kpis/kpis-latest.json                            [§5.11]
58   0  agent-orchestration/codex/log-execucao.md        [§5.11]
230  0  agent-orchestration/controle/pendencias.md       [§5.11 — 0 delecoes = APPEND puro]
35   0  agent-orchestration/docs/status-geral.md         [§5.11]
558  0  omega/juntas/votos/B-O6R-07b/01-critico-adversarial.md [§5.11 registro de junta]
1054 0  omega/planos/B-O6R-07b-plano.md                  [§5.11 o proprio plano]
 1   1  docs/api.md                                      [§5.11]
393  0  docs/omega-pd.md                                 [§5.11 as 2 PDs]
34   0  docs/revisoes/O6R/REGISTRO_ACHADOS_O6R.md        [§5.11]
 1   1  docs/revisoes/O6R/achados.jsonl                  [§5.11 linha SEC-004]
88   1  src/config/env.ts                                [§5.8]
 5  10  src/modules/attachments/attachment.routes.ts     [§5.4 ramo if(result.file)]
41  19  src/modules/attachments/attachment.service.ts    [§5.4 trecho do gate]
30   8  src/modules/attachments/attachment.storage.ts    [§5.4 + E1·9 resolve]
14   2  src/modules/checklists/checklist-attachment.storage.ts [§5.6 + E1·9]
 5  15  src/modules/checklists/checklist.routes.ts       [§5.6 ramo de arquivo]
42   0  src/modules/checklists/checklist.service.ts      [§5.6 createUploadedAttachment]
19   1  .../storage/checklist-storage.types.ts           [§5.6]
 6   1  .../storage/local-checklist-storage.provider.ts  [§5.6]
 7   2  .../storage/s3-checklist-storage.provider.ts     [§5.6]
14   2  src/modules/damages/damage-attachment.storage.ts [§5.7 + E1·9]
 5  15  src/modules/damages/damage.routes.ts             [§5.7 ramo de arquivo]
38   0  src/modules/damages/damage.service.ts            [§5.7 createUploadedAttachment]
144  0  src/modules/evidence/content-sniff.ts            [§5.1 NOVO]
56   0  src/modules/evidence/evidence-scanner.factory.ts [§5.1 NOVO]
32   3  src/modules/evidence/evidence-storage.ts         [§5.2]
213  0  src/modules/evidence/serve-verified-file.ts      [§5.1 NOVO]
96   0  src/modules/evidence/storage-key-scope.ts        [E1·9 NOVO]
231  0  src/modules/evidence/upload-gate.ts              [§5.1 NOVO]
46  32  src/modules/mobile/mobile-evidence-upload.ts     [§5.3]
38  19  src/modules/work-orders/work-order-attachment.service.ts [§5.5]
24   8  src/modules/work-orders/work-order-attachment.storage.ts [§5.5 + E1·9]
 5  10  src/modules/work-orders/work-order.routes.ts     [§5.5 ramo de arquivo]
 5   1  tests/attachments-crud.test.ts                   [§5.10 fixture]
 8   2  tests/checklist-storage.test.ts                  [§5.10 marca]
73   0  tests/helpers/upload-fixtures.ts                 [§5.9 NOVO]
 7   1  tests/mobile-backend-contracts.test.ts           [§5.10 fixture]
134  0  tests/o6r07b-content-sniff.test.ts               [§5.9 NOVO]
287  0  tests/o6r07b-download-hardened.test.ts           [§5.9 NOVO]
642  0  tests/o6r07b-mime-sniff-routes.test.ts           [§5.9 NOVO]
177  0  tests/o6r07b-scanner-failclosed.test.ts          [§5.9 NOVO]
235  0  tests/o6r07b-upload-gate-census.test.ts          [§5.9 NOVO]
300  0  tests/o6r07b-upload-gate.test.ts                 [§5.9 NOVO]
60   0  tests/owner-portal-photos.test.ts                [E1·9 marca + 1 caso]
 4   1  tests/work-order-attachments.test.ts             [§5.10 fixture]
```

## 1.2 PROIBIDO — provado por HASH DE ARVORE / BLOB, nao por ausencia de grep

`git rev-parse e55245a:<caminho>` == `git rev-parse a2988b5:<caminho>` em **todos**:

```
OK  prisma                    be98074af9123b1548406d5127ae8f0c07ebf177
OK  mobile                    3a2ac02813c2c079296d7bac832cc57a2ff7d8a5
OK  frontend                  24be761ec4b5a46269d25b44a59e6cd4522c967a
OK  .github                   638395976fc1e21006eded36197e9af4e65e4394
OK  scripts                   08de36f3648fc80c3f85fc5450193dfffd58961d
OK  src/modules/impound       12ec97afe3ad79b4941175c4ab4325be46d8116b
OK  src/modules/owner-portal  69304ac3689ead9168e7045348d69483a1bb42bf
OK  src/modules/auth          1c2619d72c87908b2169ea0a78c2e8ad56f35166
OK  src/modules/authority     a0a22ad4a235a368609e10756eb05d7899b6dae6
OK  src/modules/core-saas     22c71cdf3a6245d48ac085e9c53e3cf5fad0f473
```

Blobs (todos **iguais** base==head): `package.json` · `package-lock.json` · `CLAUDE.md` · `AGENTS.md` ·
`RBAC_MATRIX.md` · `APPROVAL_LIMITS.md` · `Dockerfile` · `docker-compose.yml` · **`src/app.ts`** ·
**`src/portal-app.ts`** (a mutacao **D6** do helmet nao entrou no diff — errata E1·8 confirmada) ·
`src/modules/work-orders/work-order.service.ts` · `docs/revisoes/O6R/PLANO_O6R.md` · **os 8 arquivos de
teste do antigo "ciclo 5"**. `src/modules/financial-*`, `approval.*`, `work-order-comment*`,
`mobile-*-sync.ts`, `mobile.routes.ts`: ausentes do `--name-only` inteiro (colado em 1.1) — enumerei os
50 caminhos, nao usei ausencia de grep.

**CATEGORIA DO BLOCO CONFIRMADA COMO JUNTA-3, nao junta-5:** `package-lock.json` e `package.json`
byte-identicos -> **zero dependencia nova**; `.github` e `Dockerfile`/`docker-compose` intocados ->
**zero passo de deploy**; nenhum cliente de servico externo pago no diff (o AV real e explicitamente
DEFERIDO a `P-O6R-B07B-SCANNER-AV-REAL`, junta-5). Nao medi nenhuma das tres presentes.

## 1.3 Hunks dos escopos SUB-ARQUIVO (git diff -U0, ancorados por NOME DE FUNCAO)

| arquivo | trecho autorizado | hunks medidos | veredito |
|---|---|---|---|
| attachment.routes.ts | so ramo `if (result.file)` de `sendResult` | import de `sendVerifiedFile`; comentario + substituicao das 10 linhas do ramo por `void sendVerifiedFile(...)` | **DENTRO** |
| work-order.routes.ts | so ramo de arquivo | idem (import + ramo). **Nenhuma outra linha do router** — territorio do 07a/07c intocado | **DENTRO** |
| checklist.routes.ts | so ramo de arquivo | import + ramo + remocao de `escapeHeaderFileName` | **DENTRO** (nota N1) |
| damage.routes.ts | so ramo de arquivo | idem checklist | **DENTRO** (nota N1) |
| attachment.service.ts | trecho do gate no lugar do scan | imports; bloco do scan -> `verifyUploadContent`; `saveAttachmentFile` recebe `verification`; helper NOVO `toAttachmentGateError` no fim do arquivo | **DENTRO** |
| work-order-attachment.service.ts | l.57-75 | idem, com `toWorkOrderAttachmentGateError` | **DENTRO** |
| checklist.service.ts | SO `createUploadedAttachment` | `@@ -393,0 +396,18` e `@@ -397,0 +418` (dentro de `createUploadedAttachment`, l.387-415) + 2 imports + helper NOVO em `@@ -821,0 +843,21` (fim do arquivo) | **DENTRO** |
| damage.service.ts | SO `createUploadedAttachment` | `@@ -313,0 +316,18` e `@@ -317,0 +338` (dentro de l.307-335) + 2 imports + helper NOVO em `@@ -641,0 +663,17` | **DENTRO** |
| 4x `*.storage.ts` | registro do scanner + `save*File` recebe a marca + (E1·9) `resolve*Download` | hunks so em: imports/tipos, `configure/reset/get*Scanner`, corpo de `save*File`, corpo de `resolve*Download` | **DENTRO** |

**N1 (nota, nao achado):** em `checklist.routes.ts` e `damage.routes.ts` o hunk final remove a funcao
`escapeHeaderFileName`, que e top-level e portanto **fora** do literal "ramo `if (result.file)`". Medi a
procedencia: `git grep -n escapeHeaderFileName e55245a` mostra que na base ela tinha **exatamente um
chamador em cada arquivo — a linha do Content-Disposition DENTRO desse ramo**; no head,
`git grep -n escapeHeaderFileName a2988b5 -- src` volta **vazio**. E codigo morto por consequencia do
ramo autorizado, nao territorio novo. Classifico como **nota**, nao bloqueia.

## 1.4 Kpis/app.js — so a paridade `var FROZEN`

`git diff origin/main...a2988b5 -- Kpis/app.js`: **um unico hunk**, `@@ -1620,7 +1620,7 @@`, 1 linha
adicionada / 1 removida, e a linha e `var FROZEN = {...}`. Nenhuma outra linha do painel tocada. Cumpre
§C3.0 / C3-A3 do 07a.

## 1.5 Edicoes nominais de teste — fixture x assercao, LINHA A LINHA

| arquivo | fixture? | marca? | assercao nova? | assercao afrouxada? | caso sumido? | veredito |
|---|---|---|---|---|---|---|
| attachments-crud.test.ts | **SIM** (4 bytes 89 50 4E 47 -> `PNG_BYTES` via helper) | nao | nao | **NAO** | **0** (11 -> 11) | conforme §5.10 |
| work-order-attachments.test.ts | **SIM** (mesma troca) | nao | nao | **NAO** | **0** (8 -> 8) | conforme §5.10 |
| mobile-backend-contracts.test.ts | **SIM** ("fake-jpeg-bytes" -> `JPEG_BYTES`) | nao | nao | **NAO** | **0** (25 -> 25) | conforme §5.10 |
| checklist-storage.test.ts | nao | **SIM** (`mimeType` sai do input do provider; entra `verification: createUploadVerificationForTests(...)`) | nao | **NAO** — a assercao de `ContentType === "image/webp"` no `PutObjectCommand` fica **identica**; so a procedencia do valor mudou | **0** (4 -> 4) | conforme §5.10 |
| owner-portal-photos.test.ts | nao | **SIM** (marca no `saveAttachmentFile` do harness `seedPhoto`) | **SIM — exatamente 1**: `T9 ... storage_key de OUTRO tenant -> not_found` | **NAO** | **0** (17 -> 18) | conforme **E1·9** (a)+(b), nem uma linha a mais |

Metodo: `comm -13` entre as listas de nomes de test( / it( extraidas de `git show e55245a:<f>` e de
`git show a2988b5:<f>`. **SUMIDOS nos 5 arquivos: NENHUM.** Unico NOVO: o T9. Zero caso que passasse a
esperar 415/422/503 onde esperava 201 em arquivo antigo; zero assert.ok no lugar de igualdade; zero caso
comentado; zero .skip.

**T9 conferido por leitura integral (exigencia nominal do E1·12 a esta cadeira):** o caso grava um objeto
REAL sob a chave de outro tenant, aponta a linha do processo para ela e exige **404** + **corpo sem os
bytes alheios**. E5 (`owner-portal`) herda o guard **por chamada** — `git rev-parse` de
`src/modules/owner-portal` e **identico** entre base e head (1.2). A heranca esta provada por execucao, nao
por afirmacao.

## 1.6 Higiene do diff e a clausula C4

- `git diff --check origin/main...a2988b5` -> **ec=0**, saida vazia.
- `git merge-base --is-ancestor origin/main a2988b5` -> **ec=0** (a base do PR e a main de verdade).
- `git status --porcelain` no worktree: so os **meus** dois arquivos C3-*. Nenhum ` M` fantasma.
- Artefatos de drill no diff (.log, tmp, node_modules, fixture-dir, storage/): **NENHUM**.
- .skip( / .only( / todo: nos 6 arquivos novos + helper: **NENHUM** (git grep no head).
- **C4 — `createUploadVerificationForTests` nao vazou para src:** por **grep** no head,
  `git grep -n createUploadVerificationForTests a2988b5 -- src` devolve **uma unica linha**, a
  **definicao** em `src/modules/evidence/upload-gate.ts:221`; **zero consumidores** em src. (A prova por
  **execucao** do censo vem no item 2. Declaro qual usei para que: grep = enumeracao de sitios; execucao
  = o laco do proprio guard.)
- `.env.example` +10/-0 = 1 var (`EVIDENCE_SCANNER`) + 9 linhas de comentario. Cabe em §5.8 + E1·9.
  **`.env` real: ausente do diff.**
- `src/config/env.ts` +88/-1: schema (`EVIDENCE_SCANNER` opcional, SEM `.default()`), 2 refinamentos no
  superRefine (G-EVIDENCE-SCANNER e G-EVIDENCE-SNIFFABLE, este lendo a cadeia NOVA ?? LEGADA ?? DEFAULT
  com `trim().toLowerCase()`) e o export com default por NODE_ENV. Exatamente §5.8 + E1·4. **Nenhuma
  valvula de noop em producao** (E1·9): o unico caminho e o superRefine que RECUSA o boot.

## VEREDITO PARCIAL — ITEM 1: **PASSA**

Nenhum arquivo fora da §5 emendada; PROIBIDO vazio por hash de arvore/blob; todo hunk sub-arquivo dentro
do trecho autorizado (com a nota N1); edicoes de teste sao fixture/marca com **zero** assercao afrouxada e
**zero** caso sumido; app.js so a `var FROZEN`; **zero dependencia nova** -> a categoria junta-3 do §11 se
sustenta na minha medicao.

---

# ITEM 3 · Contrato x diff, pendencias, achados.jsonl + REGISTRO (parte estatica)

## 3a.1 ORDEM — o contrato entrou DEPOIS dos drills que o sustentam

`git log --format='%h %ad %s' --date=iso --reverse origin/main..a2988b5 -- <caminho>`:

```
API_CONTRACTS.md : a2988b5d  2026-09-06 11:20:20 -0300
docs/api.md      : a2988b5d  2026-09-06 11:20:20 -0300
src + tests      : b18fc201  2026-09-06 10:24:30  (gate unico)
                   835dbbb9  2026-09-06 10:34:11  (egresso + fixtures)
                   126b7178  2026-09-06 10:52:25  (6 arquivos de aceite + T9)
```

O texto do contrato e **56 minutos posterior** ao ultimo commit de teste e **1h56 posterior** ao primeiro
commit de codigo. **Contrato NAO esta a frente da execucao.**

## 3a.2 Delta do contrato x DIFF, linha por linha (conferido no codigo, nao na promessa)

| O que o contrato afirma | Onde conferi | Bate? |
|---|---|---|
| V1 415 `UNSUPPORTED_MEDIA_TYPE`; 422 `evidence_rejected`; 503 `evidence_scan_failed` | `mobile-evidence-upload.ts:169,174` | **SIM** |
| V2 415 `ATTACHMENT_UNSUPPORTED_MEDIA_TYPE` / 422 `ATTACHMENT_REJECTED` / 503 `ATTACHMENT_SCAN_UNAVAILABLE` | `attachment.service.ts:232,235,237` | **SIM** |
| V3 415/422/503 `WORK_ORDER_ATTACHMENT_*` | `work-order-attachment.service.ts:202,205,207` | **SIM** |
| V4 415/422/503 `CHECKLIST_ATTACHMENT_*` (422/503 NOVOS) | `checklist.service.ts:857,860,862` | **SIM** |
| V5 415/422/503 `DAMAGE_ATTACHMENT_*` (422/503 NOVOS) | `damage.service.ts:673,676,678` | **SIM** |
| `reason` = `error.kind` do gate nas 5 vias (mesmos tres reasons) | as 5 linhas de 415 acima passam `error.kind` | **SIM** |
| Egresso: `Content-Type` dos BYTES ou `application/octet-stream` | `serve-verified-file.ts:143,145` | **SIM** |
| `Content-Disposition: attachment; filename=…; filename*=` | `serve-verified-file.ts:150` + `buildContentDisposition` | **SIM** |
| `X-Content-Type-Options: nosniff` explicito | `serve-verified-file.ts:149` | **SIM** |
| CSP `default-src 'none'; sandbox allow-downloads`; CORP `same-origin`; `Cache-Control: private, no-store` | `serve-verified-file.ts:154,155,157` | **SIM** |
| `Content-Length` quando conhecido, com `strictContentLength` | `serve-verified-file.ts:159,164` | **SIM** |
| Guard de chave: fora do tenant devolve o MESMO 404 de "sem chave" | `storage-key-scope.ts:89-94` (`assertStorageKeyWithinTenant(input, notFound)`) e os 4 resolvers passam o **mesmo** construtor de erro | **SIM** |
| E5 inalterado | `git rev-parse` de `src/modules/owner-portal` identico base==head (§1.2) | **SIM** |
| Corpo 201 de V1 inalterado em forma; versao do contrato nao muda | nenhum campo/status novo no diff de `mobile-evidence-upload.ts`; `mobile-backend-contracts.test.ts` sem assercao mudada (§1.5) | **SIM** |
| `docs/api.md` — paragrafo B-108 "default Noop" -> forma nova | +1/-1 no paragrafo l.243 | **SIM** |

**Nao achei linha do contrato que o codigo nao sustente.** O `400 mime_type_not_allowed` de V4 esta
declarado como inconsistencia **pre-existente** com pendencia nomeada — declarado, nao escondido.

## 3c.1 `achados.jsonl` + `REGISTRO_ACHADOS_O6R.md` — forma e coerencia

- `achados.jsonl`: **+1/-1**, uma unica linha (a do `Ω6R-SEC-004`). `status` vai de `"ativo"` para
  **`"parcialmente_superado"`** — **exatamente o que a E1·11 manda; NAO `fechado`**. Ganha
  `supersedido.por` = `"B-O6R-07b (PR na autoria; nº e hash no backfill pós-merge — §C3.5)"`,
  `componente_superado` (os 3 mecanismos + as 5 vias + o egresso + o guard de prefixo) e
  `componentes_abertos` (**antivirus real**, com o 503 declarado, e **quarentena**). Forma identica a que
  o 07a usou para o SEC-002.
- `REGISTRO_ACHADOS_O6R.md`: **+34/-0** (append puro), secao l.699 espelhando o JSONL + paragrafo de
  atualizacao. **Registra explicitamente a porta que o critico nomeou:** *"se alguem promover o achado a
  `fechado` no backfill pos-merge SEM o antivirus real, o guard NAO pega (ele so exige hash de merge, nao
  exige AV)"*. Exigencia do meu mandato **cumprida no proprio registro**.
- **Guard executado por mim:** `node --test --import tsx tests/kpi-achados-paridade.test.ts` ->
  **ec=0**, `# tests 6 · # pass 6 · # fail 0 · # skipped 0`. Node v20.19.5.
- Coerencia aritmetica conferida por leitura do `kpis-latest.json` do head: `p1_fechados` = **2** (nao se
  moveu), `p1_abertos` = **13**, `aguardando_merge` = **[]** (SEC-004 **NAO** entrou),
  `fechados` **sem** SEC-004. **E o que a E1·11 manda, e o guard fica verde com isso.**

## 3b.1 A QUESTAO QUE A C1 LEVANTOU (M1) — medida por mim, do zero

**O que eu medi, nao o que li no voto dela.**

1. **Sitios de `attachment.create(` em `src/`** — `grep -rn 'attachment\.create(' src --include=*.ts`:
   ```
   src/modules/attachments/attachment-prisma.repository.ts:16      (V2 legitimo)
   src/modules/impound/impound-prisma.repository.ts:533            (M2)
   src/modules/impound/impound.notifications-prisma.repository.ts:117 (M5)
   ```
   **Sao 3.** O criterio de fechamento de `P-O6R-B07B-ATTACHMENT-STORED-DO-CLIENTE` ("3 sitios -> 1")
   **fecha exatamente sobre a classe que a propria pendencia enuncia** (linha do modelo `attachment` com
   `status: "stored"` e chave do corpo, nas duas rotas de patio). **Nao "declara a classe resolvida
   deixando um membro aberto"**: M1 nao e desse modelo — e `checklistAttachment.create(`
   (`checklist-prisma.repository.ts:844`), tabela diferente, sem coluna `status`. A pendencia da classe
   esta bem-formada; **respondo NAO a "fecha a classe pela metade"**.

2. **MAS o M1 e real, e a pendencia que o possui erra o mecanismo.** Medi o caminho inteiro:
   - **WRITE (ramo JSON):** `parseCreateChecklistAttachmentDto` (`checklist.validator.ts:222-231`) aceita
     `metadata: jsonRecordSchema` — **registro JSON arbitrario do corpo** — e
     `checklist-prisma.repository.ts:844-856` grava `metadata: data.metadata` **sem nenhum campo do
     servidor**. (No ramo MULTIPART, `checklist.service.ts:422-432` escreve
     `{ ...upload.metadata, storageProvider, storageKey }`, com os valores do servidor por ultimo — la o
     cliente nao vence.)
   - **READ:** `resolveChecklistAttachmentDownload` (`checklist-attachment.storage.ts`) le
     **`metadata.storageKey`** e **`readStorageProvider(metadata)`** e chama `getObject`.
   - **Logo:** pelo ramo JSON o cliente **PODE** gravar `metadata.storageKey`, e a rota de download **LE**
     essa chave. A frase que o plano §2.3 (linha M1) e a pendencia
     `P-O6R-B07B-CHECKLIST-JSON-FILEURL` escrevem — *"cria anexo **sem `storageKey`**, entao a rota de
     download responde 404 `attachment_file_not_found`"* — **e FALSA como enunciado geral**: so vale se o
     cliente **omitir** a chave.

3. **Datacao da ORIGEM (evidencia de escopo, exigida):**
   - `git log -S 'parseCreateChecklistAttachmentDto' --reverse -- checklist.validator.ts` ->
     **`bfc5c7f7` 2026-06-07** "feat: implement tenant checklist backend".
   - `git log -S 'metadata.storageKey' --reverse -- checklist-attachment.storage.ts` ->
     **`2530850a` 2026-06-07** "feat: add checklist attachment storage".
   O **DEFEITO** e de **junho/2026** — tres meses antes deste bloco. **`pre-existente`**, e
   `src/modules/checklists/checklist.validator.ts` / `checklist-prisma.repository.ts` nao estao no §5.

4. **O que este bloco fez com o M1, e que o registro NAO credita:** `resolveChecklistAttachmentDownload`
   e um dos 4 resolvers, e **recebeu o guard** (`assertStorageKeyWithinTenant`, l. do trecho novo). Ou
   seja: a metade **cross-tenant** do M1 **este bloco fechou**, exatamente como fechou M2/M5. O residual
   real do M1 e **intra-tenant** (chave `<tenantProprio>/<objeto de outra run>`), que e a mesma metade
   WRITE dos outros dois.

5. **Consequencia sobre o bloco.** Confrontei a frase falsa contra o que o bloco **afirma** em
   `componente_superado`, no `API_CONTRACTS.md` e no `REGISTRO`: nenhum dos tres afirma nada que o M1
   falsifique (o contrato diz "guard nas 4 rotas", e as 4 incluem esta; o `componente_superado` diz
   "guard de prefixo de tenant nos 4 resolvers", verdadeiro). **Nao ha promessa excedida.** O que ha e
   **uma pendencia que descreve o proprio mecanismo de forma que subestima o residual** — e ela e
   `MEDIA` justamente por causa dessa descricao.
   **Propriedade ausente, nomeada sem conserto:** *a pendencia dona do M1 afirma como medida uma
   propriedade do codigo ("cria anexo sem storageKey; download 404") que a execucao do proprio caminho
   nao sustenta, e por isso a gravidade e o residual que ela publica nao correspondem ao que o proximo
   bloco encontrara.* **gravidade: `ajuste` · escopo: `dentro-do-bloco`** (as 230 linhas de
   `pendencias.md` sao deste PR) — o **defeito** por tras e `pre-existente` com origem datada acima.
   Nao reprova: a classe tem ID, dono (trilha CHECKLIST), status ABERTA e severidade; a metade
   cross-tenant esta fechada e provada; e a metade que resta e pre-existente e fora do §5.

---

# ITEM 2 · KPI — N, forma, Delta por arquivo, FROZEN e `aguardando_merge`

## 2.1 A suite plena, RODADA POR MIM (nao copiada)

**Terreno:** worktree `.claude/worktrees/o6r07b` (o do bloco), `node_modules` **proprio, sem junction**
(`dir /AL` sem entrada de link). Node **v20.19.5**, npm 11.7.0. **Cluster descartavel PROPRIO:**
`c3-o6r07b-pg` :**56501** (postgres:16-alpine) e `c3-o6r07b-redis` :**56502** (redis:7-alpine) — portas
escolhidas **depois** de `netsh interface ipv4 show excludedportrange protocol=tcp` (56501/56502 fora de
toda faixa) e de `docker ps` (so `erp-postgres`:5432 e `erp-redis`:6379 de pe). **Nunca 55432. A base viva
NAO foi alvo, nem de leitura.** `npx prisma generate` ec=0 e `npx prisma migrate deploy` ec=0 no MEU
cluster. O worktree **nao tem `.env`**, entao o snapshot de env nasce limpo.

**Forma canonica, N=1 suite plena:** `node scripts/run-backend-tests.mjs` (= `npm test`),
`DATABASE_URL`/`REDIS_URL` exportadas para o meu cluster, `CORE_SAAS_PERSISTENCE` **nao exportada** (o
runner declara `memory` no filho, como o job `backend` do CI), `RBAC_DB_PARITY` **ausente**. `ec` lido
**por variavel**; contagens lidas do TAP **no arquivo de log**, nunca de pipe.

```
SUITE_HEAD_EC=0
# tests 2938
# suites 0
# pass 2936
# fail 0
# cancelled 0
# skipped 2
# todo 0
# duration_ms 251458.9205
```

**BATE EXATAMENTE com o publicado: 2936/2938.** Os **2** skips sao os **dois legitimos**, lidos do TAP
nominalmente (l.10919 e l.10924 do log): `permission-catalog-db-parity` x2, motivo
`# SKIP RBAC_DB_PARITY nao e "1"`. **Zero auto-pulo silencioso.**

## 2.2 Delta DECOMPOSTO POR ARQUIVO — cada um rodado por mim pelo runner canonico

| arquivo | `# tests` | pass | fail | skipped | ec |
|---|--:|--:|--:|--:|--:|
| `tests/o6r07b-content-sniff.test.ts` | **19** | 19 | 0 | 0 | 0 |
| `tests/o6r07b-upload-gate.test.ts` | **21** | 21 | 0 | 0 | 0 |
| `tests/o6r07b-scanner-failclosed.test.ts` | **13** | 13 | 0 | 0 | 0 |
| `tests/o6r07b-mime-sniff-routes.test.ts` | **36** | 36 | 0 | 0 | 0 |
| `tests/o6r07b-download-hardened.test.ts` | **23** | 23 | 0 | 0 | 0 |
| `tests/o6r07b-upload-gate-census.test.ts` | **8** | 8 | 0 | 0 | 0 |
| **soma dos 6 NOVOS** | **120** | | | | |
| `tests/owner-portal-photos.test.ts` | **18** (base 17, T9 novo) | 18 | 0 | 0 | 0 |
| **DELTA TOTAL** | **121** | | | | |

**Controle de que nenhum caso antigo morreu** (o outro lado da conta): rodei tambem os 4 arquivos de
edicao nominal — `attachments-crud` **11/11**, `work-order-attachments` **8/8**,
`mobile-backend-contracts` **25/25**, `checklist-storage` **4/4**, todos ec=0 e **identicos** as contagens
de nomes que extrai da base em §1.5.

**A conta fecha pelos dois lados:** denominador do head **2938**; delta nomeado por arquivo **121**; logo a
base tem de ser **2817** — e nenhum caso antigo desapareceu (§1.5, `comm -13` vazio nos 5 arquivos). O
numero publicado (2936/2938, base 2815/2817, delta +121) **decompoe por arquivo**, e cada parcela e minha.
**O que NAO executei, e por que:** nao re-rodei a suite plena da BASE num worktree separado — a conta
fecha por aritmetica fechada mais zero casos sumidos, e um `npm ci` de worktree extra e custo sem
informacao nova. Fica declarado.

## 2.3 Piso: EXECUCAO x GREP, e a diferenca explicada

Re-somei o piso da **E1·8** por mim: 32 + 20 + 7 + 24 + 6 = **89**. (O `>=65` de l.506, o `(soma >= 44)` de
l.185 e o `>=40` de l.35 — que e a META `M >= 2N` — estao **superados** pela errata do E1·8; nao os cobro.)

| medida | valor |
|---|--:|
| **EXECUCAO** (TAP, 6 arquivos novos) | **120** |
| **GREP** (`grep -cE` de test(/it( em inicio de linha, 6 arquivos novos) | **99** |
| diferenca | **+21 a favor da execucao** |

**A diferenca e, ela propria, medida e explicada — e esta na direcao SEGURA.** Ela vive inteira em
`o6r07b-mime-sniff-routes.test.ts` (grep 15, execucao 36): o arquivo tem **4 lacos**
`for (const via of [...])` (l.40, 81, 131 sobre V1-V5; l.156 sobre V4/V5) que **parametrizam** casos —
A1/A2/A4 x5 = 15, A3 x5 = 5, A6 x5 = 5, A7 x2 = 2, mais 9 casos soltos = **36**. Somei a expansao a mao e
bate com o TAP.
**O sentido perigoso — `it()` dentro de `describe.skip`, que conta no grep e nao na execucao — NAO
ocorre:** `git grep` de `.skip(`/`.only(`/`todo:` nos 6 arquivos novos + helper volta **vazio**, e a
execucao reporta `skipped 0` em cada um dos seis.

**PISO: 121 casos novos permanentes por EXECUCAO, contra >= 89.** E o PR declara **121** — **execucao e
declaracao COINCIDEM.** Nao ha a divergencia "PR diz 6, execucao mostra 4".

## 2.4 Arquivos de KPI, FROZEN, `aguardando_merge` e os guards rodados por mim

- **Arquivos no MESMO PR:** `kpis-latest.json` (29/29) · `kpis-history.json` (13/0, **append**) ·
  `kpis-history.md` (36/0) · `app.js` (1/1, **so `var FROZEN`**, §1.4). **`Kpis/index.html`: SEM diff** —
  ver a nota N2.
- **`backend_tests`** publicado **com N e forma**: a nota do JSON declara N=1 suite plena, o comando, as
  env, o cluster, as portas, o baseline e a decomposicao por arquivo. **Auditavel — e eu auditei.**
- **`frontend_smoke_tests` 1126/1126** e **`flutter_tests` 864/864** **CARREGADOS com nota explicita**
  (`[B-O6R-07b: valor CARREGADO — NAO reexecutado por este PR (§C3.3)]`, com a prova nas duas pontas de
  que `frontend/` e `mobile/` nao entram no diff). **§C3.3 cumprido** — nao e numero inventado, e exigir
  reexecucao de trilha nao tocada seria erro meu.
- **`blocks_completed` 160 -> 161**, com justificativa de 1 linha no history (sub-bloco pleno, precedente
  SAN2-4a/4b). **`mvp_demo` 99 e `mvp_vendavel` 88 INTOCADOS**, cada um com a linha
  `[B-O6R-07b: INTOCADO — o bloco nao move escopo de produto (§C3.4)]`.
- **`pr`/`merge_commit`/`approved_head` = `null` na autoria** — §C3.5, **nao bloqueia**; cobra-lo seria
  erro meu.
- **`production_readiness`:** `aguardando_merge` = **`[]`**, `p1_fechados` = **2** (nao se moveu),
  `p1_abertos` = **13**, `fechados` **sem** SEC-004. **Exatamente a consequencia aritmetica da E1·11.**
- **Guards RODADOS POR MIM** (`ec` por variavel):
  - `node --test --import tsx tests/kpi-achados-paridade.test.ts` -> **ec=0**, 6/6, fail 0, skipped 0.
    **O guard fica VERDE com `parcialmente_superado` + `aguardando_merge` vazio — nao ha inconsistencia
    entre o que eu vejo e o que ele afirma.**
  - `node scripts/kpi-freeze.mjs --check` -> **ec=0**, saida `kpi-freeze: em dia (snapshot 2026-09-06).`
  - `node --check Kpis/app.js` -> **ec=0**.
  - `node --test --import tsx tests/kpi-dashboard-charts.test.ts` -> **ec=0**, **16/16**, fail 0.
- **Dimensao nova:** este PR **nao inaugura metrica nova** (nenhuma chave nova em `metrics`), logo **nao
  exige grafico novo** — exigir um seria erro meu.

**N2 (nota, com evidencia de precedente — NAO achado que reprova):** `Kpis/index.html` nao aparece no
diff. Medi o precedente antes de chamar de defeito: o ultimo toque foi **2026-08-18 (#356)**, e desde
entao **cinco PRs** atualizaram `kpis-latest.json` sem toca-lo (#369 `dc8168b9`, #371 `99f18403`,
#372 `cae60863`, #374 `066b47ea`, #378 `ed0a692a`). E coerente com `D-KPI-INDEX-PAINEL`/§C3.0 — o painel
**hidrata em runtime dos JSON** — e com o §9 do plano, que escreve `index.html (hidrata dos JSON)`. O
guard que mede se o painel defasou roda **verde** por mim. **nota**, escopo `pre-existente` (pratica de
18/08/2026, cinco PRs antes deste bloco).

## VEREDITO PARCIAL — ITEM 2: **PASSA**

Suite plena reexecutada por mim bate 2936/2938, ec=0, 2 skips nomeados; delta +121 **decomposto por
arquivo por execucao minha**, fechando pelos dois lados; piso 121 >= 89 com a diferenca grep x execucao
medida e explicada na direcao segura; os 4 arquivos + `app.js` presentes com `FROZEN` conferido por
execucao; `aguardando_merge` vazio e `p1_fechados` = 2 **coerentes com `parcialmente_superado`**.

---

# ITEM 3 (continuacao) · pendencias, registro, ata, bateria — e a ADENDA de terreno

## 3b.2 As 12 pendencias da E1·11, uma a uma, conferidas por presenca

`git diff origin/main...HEAD -- pendencias.md | grep '^+## '` devolve **12 cabecalhos**, e sao
exatamente os que a E1·11 nomeia:

| # | ID | severidade | presente? | o que conferi no corpo |
|---|---|---|---|---|
| 1 | `P-O6R-B07B-SCANNER-AV-REAL` | ALTA | SIM | **BLOQUEIA: go-live de upload E staging com upload** · junta-5 nomeada · **"quem fechar esta entrada e quem promove o achado a `fechado`"** — e a dona do fechamento do SEC-004, como a E1·11 manda |
| 2 | `P-O6R-B07B-STAGING-SEM-UPLOAD` | MEDIA-ALTA | SIM | **REESCRITA**: diz com todas as letras que a versao antiga (que prescrevia `EVIDENCE_SCANNER=unavailable`) estava "duplamente errada" — **a frase-remedio SUMIU** e o texto explica que aquele valor **e o que produz a pane**. Os **tres caminhos** da E1·5 estao nomeados (a)/(b)/(c) |
| 3 | `P-O6R-B07B-ATTACHMENT-STORED-DO-CLIENTE` | ALTA | SIM | **RENOMEADA** e enuncia a **CLASSE** M2+M5 com as duas rotas, arquivo:linha, **origem datada** (`574a1d2` 2026-07-26 / `398a19d` 2026-07-27), o **egresso real de cada uma**, o que o 07b fechou no READ e o que resta no WRITE, e o criterio "3 sitios -> 1" |
| 4 | `P-O6R-B07B-CHECKLIST-JSON-FILEURL` | MEDIA | SIM | ver o achado A2 abaixo |
| 5 | `P-O6R-B07B-DATAURI-NO-VALUE` | MEDIA | SIM | arquivo:linha + o teto do `express.json` |
| 6 | `P-O6R-B07B-MOBILE-RETRY-PERMANENTE` | MEDIA | SIM | **com o item do 503 divergente (E1·6)**: `evidence_upload.dart:261` mapeia 503, `checklist_attachment_upload.dart:243-256` **nao tem ramo 503**; origem `c0630fa` 2026-08-01 #321. E reafirma que o invariante do B-108 nao cai |
| 7 | `P-O6R-B07B-LEGADO-MIME` | BAIXA | SIM | |
| 8 | `P-O6R-B07B-REJEICAO-SEM-AUDIT-LOG` | BAIXA | SIM | |
| 9 | `P-O6R-B07B-CODIGOS-INCONSISTENTES` | BAIXA | SIM | e a que o contrato cita ao declarar o `400 mime_type_not_allowed` de V4 |
| 10 | `P-O6R-B07B-RECEIPT-CONTENT-TYPE` | BAIXA | SIM | |
| 11 | `P-O6R-B07B-S3-PREFIXO-LEGADO` | BAIXA | SIM | **nova pela E1·2** |
| 12 | `P-GOV-FILA-P1-ANTES-DE-P0` | MEDIA | SIM | **com o item 2** (demo/staging sem upload ate o AV), e "nenhuma decisao de fila e tomada por agente" |

**Forma:** todas carregam **ID, data, severidade, status, escopo e dono**; as `pre-existente` carregam
**evidencia de origem datada** (hash + data). **APPEND-ONLY provado contra a BASE CERTA:**
`git diff --numstat origin/main...HEAD -- pendencias.md` = **`263  0`** — **zero delecoes**. Nenhuma linha
que existia na `main` foi tocada; nao ha reescrita de EOL em massa, renumeracao nem remocao. §A2 cumprido.
(Cuidado de medicao que registro: entre dois commits DA BRANCH o mesmo arquivo mostra `37 4`, porque o
commit `4a24a074` reescreve duas linhas de `- status: ABERTA` que o **proprio bloco** havia acrescentado em
`a2988b5`. Contra a `main`, que e a base do PR, o saldo e append puro.)

**Fechamentos:** `P-O6R-B07` recebe **append** com a contabilidade do parcial e a nota `§A2` explicita de
que a linha `- status: ABERTA` acima **fica preservada**; o `Bloqueia` de evidencias/anexos/upload mobile
cai; o gate da CHECKLIST P1 (`J-CHK-04C-EMENDA`) passa a depender **so de `B-O6R-06`**. **Nenhuma pendencia
fechada em silencio** e **nenhuma mantida aberta com o trabalho ja feito** que eu tenha encontrado.

**O "gerador do placar":** enumerei `scripts/` inteiro — **nao existe** script gerador de placar de
pendencias neste repo (14 `.mjs`/`.sh`, nenhum toca `pendencias.md`). O gerador que EXISTE e conta o balde
do achado e `tests/kpi-achados-paridade.test.ts`, e eu o **rodei** (§3c.1). O `pendencias-indice.md` e o
placar **derivado** — ver o achado A1.

## 3d Registro, insumos e os DOIS itens de "olhar de frente"

- **`status-geral.md`** (+35/-0) tem a entrada do bloco, com a consequencia operacional **declarada**:
  *"a partir do merge, producao e staging respondem 503 a todo upload ate existir antivirus real"*, com as
  duas pendencias nomeadas. **`log-execucao.md`** (+58/-0) reconciliado com ela.
- **Insumos do briefing conferidos por presenca:** parecer do critico em **2 rodadas**
  (`votos/B-O6R-07b/01-critico-adversarial.md`, +558) e as **2 PDs** em `docs/omega-pd.md` (+393):
  `PD-O6R-B07B-MAGIC-BYTES` (l.537, declara **11 fontes**, com secao "### 3. Fontes" enumerada) e
  `PD-O6R-B07B-DISPOSITION` (l.728, declara **13 fontes**). **Ambas >= 5.**
- **Composicao efetiva = 3 cadeiras** (C1 secops, C2 contrato mobile B-108, C3 esta), quorum
  **unanimidade de 3** — nao 5/5, e eu confirmei a categoria por medicao (§1.2: zero dependencia nova,
  zero deploy, zero servico externo pago no diff).

**OLHAR DE FRENTE 1 — o censo C6 verde na M-B3, com o guard NAO apertado.** O que e meu:
- **(a) a limitacao esta escrita no proprio arquivo do censo?** **SIM** —
  `tests/o6r07b-upload-gate-census.test.ts:192-197`: *"ATENCAO ao que esta clausula vale: depois do E1·3 ela
  e HIGIENE, nao prova. O ataque que quebrou o desenho original (spread de uma marca legitima) nao usava
  cast NENHUM e passava por este guard tranquilo. Quem prova a marca sao B7-B12 + a mutacao M-B9"*. E na
  ata/registro: `log-execucao.md:4190-4191` — *"Guard de texto e tripwire, nao prova, e aperta-lo para cacar
  uma grafia especifica seria teatro. Esta escrito no proprio arquivo do censo."*
- **(b) alguem apresenta C6 como PROVA da marca?** **NAO.** `grep -rn 'C6'` em `API_CONTRACTS.md`,
  `REGISTRO_ACHADOS_O6R.md`, `achados.jsonl`, `status-geral.md` e `pendencias.md`: **zero** ocorrencia
  referente a este censo (a unica linha e um `§C6` de outro plano). E o `REGISTRO_ACHADOS_O6R.md:720`
  nomeia como prova **"7 mutacoes registradas, entre elas a M-B9, que reabre o ataque de clonagem da
  marca"** — exatamente a prova que a E1·3 manda, nao o C6. **O merito da marca e da C1; o registro,
  que e meu, esta completo.**
  Bonus medido: a clausula **C7** do mesmo censo **declara o proprio alcance** ("um QUINTO leitor que
  aparecer amanha passa por fora em silencio", R2·3 do critico) — a mesma higiene, escrita.

**OLHAR DE FRENTE 2 — 503 em todo upload de producao/staging.** O que e meu (que esteja na ata como
informacao ao humano, §C7.2, e nas pendencias certas): **SIM, nos cinco lugares** —
`status-geral.md` (paragrafo "Consequencia operacional declarada") · `achados.jsonl`
(`componentes_abertos`, com o 503 escrito) · `REGISTRO_ACHADOS_O6R.md` (secao l.699 + paragrafo de
atualizacao) · `API_CONTRACTS.md` (bloco **Env**, ultimo paragrafo do delta) · e as **tres pendencias**
exigidas: `SCANNER-AV-REAL` (bloqueia tambem staging com upload; dona do fechamento),
`STAGING-SEM-UPLOAD` **reescrita sem a frase-remedio errada**, e `P-GOV-FILA-P1-ANTES-DE-P0` **com o item
2** e os tres caminhos. **O bloco prometeu informar, e informou.**
**Fato de terreno que aceito do briefing e NAO repito** (medido pelo orquestrador, nao por mim): o merge
na `main` **nao dispara** deploy em staging (`STAGING_DEPLOY_ENABLED` ausente; 5 runs `skipped`). Isso
**nao muda o merito** — e o `4a24a074` ja escreve isso dentro da propria pendencia, corrigindo a redacao
que a descrevia como pane iminente. Registro que a correcao foi feita **na direcao certa** (a pane e
**latente**, com o gatilho nomeado), sem apagar o texto anterior.

**Ata (`J-B-O6R-07b.md`):** **nao existe no head** — e nao pode existir antes do 3o voto, que e este.
Nao a meco; **nomeio as propriedades que ela tem de carregar** para o ciclo ser valido (§C7.4-bis):
(a) a composicao cobre a competencia? (b) quem achou e quem consertou? (c) o planejador usou dado podre? —
mais **quem ocupou cada papel** (achador = auditoria O6R/SEC-004 + o `critico-adversarial`; planejador =
`planejador-mestre`; dev = `general-purpose`, identidade distinta), os **dois itens de olhar de frente**
acima e as **3 notas residuais** do critico (sem tripwire de LEITURA; normalizacao da allowlist; a
frase-ponte do piso — todas BAIXA, que **nao** bloqueiam e cobra-las como veto seria erro meu).

## 3e Bateria por amostragem dirigida — `ec` POR VARIAVEL, rodada por mim

| comando | ec |
|---|--:|
| `npm run check` | **0** |
| `npm run lint` | **0** |
| `npm run build` | **0** |
| `npm --prefix frontend run check` | **0** |
| `npm --prefix frontend run build` | **0** (`built in 24.69s`) |
| `node --check Kpis/app.js` | **0** |
| `git diff --check origin/main...HEAD` | **0** (vazio) |
| `node scripts/kpi-freeze.mjs --check` | **0** (`em dia (snapshot 2026-09-06)`) |
| `node --test tests/kpi-achados-paridade.test.ts` | **0** (6/6) |
| `node --test tests/kpi-dashboard-charts.test.ts` | **0** (16/16) |
| `node scripts/run-backend-tests.mjs` (plena) | **0** (2936/2938, 2 skips nomeados) |

**`sync-agent-agents.mjs --check`: EU RODEI, e explico por que.** O meu mandato diz que ele "nao se aplica
ao diff de codigo" — mas o diff **do PR** carrega **8 corpos de agente** (`.claude/agents/especialistas/
jurado-07b-*.md` x4 e os espelhos `.agents/agents/especialistas/*` x4, commit `37a2c465`), e a regra e:
"se corpos de agente entrarem no PR, ai sim ele passa a valer". Resultado: **ec=0**,
`[agents-sync] OK — 38 agentes, espelho consistente`. E o guard permanente
`tests/agents-mirror-guard.test.ts`: **ec=0, 12/12**.

## 3f ADENDA DE TERRENO — o head se moveu DURANTE a minha medicao, e eu re-medi

Anomalia registrada porque jurado anota anomalia de terreno mesmo sem efeito no merito.

- Abri a cadeira em `HEAD = 91b8cdf1`. Enquanto eu rodava a suite plena, o orquestrador commitou
  `4a24a074` ("decisao do dono fecha as duas pendencias de fila e agenda"). **Nao fui eu** — eu nao
  commito (P2: `VOCE NAO COMMITA`). Os meus dois arquivos `C3-*` entraram nesse commit.
- **Re-medi tudo contra a base certa.** `git diff --stat a2988b5 HEAD -- src tests prisma frontend mobile
  .github scripts Kpis docs API_CONTRACTS.md` continua **VAZIO (ec=0)**: **o head de CODIGO segue
  `a2988b5`**, e itens 1 e 2 nao mudam nem uma linha.
- **O que mudou** (`git diff --numstat 91b8cdf 4a24a074`): `pendencias.md` `37 4` (as duas linhas de
  status das pendencias de fila/agenda, ambas escritas por ESTE bloco em `a2988b5` — contra a `main` o
  saldo continua **263 0**, append puro) e **`pendencias-indice.md` `109 97`** — ver o achado **A1**.
- Diff do PR **agora**: `git diff --shortstat origin/main...HEAD` = **68 files changed, 10187 insertions,
  282 deletions** (os 50 de codigo/registro do bloco + 18 de registro de junta: briefing, 8 corpos de
  agente das cadeiras, pareceres, votos e o indice).
- **Efeito no meu voto: nenhum sobre itens 1 e 2; um achado `ajuste` no item 1 (A1).** As duas pendencias
  fechadas por decisao do dono estao **bem-formadas** (status FECHADA com data, `fechado por`, severidade,
  escopo e dono preservados; corpo anterior **intacto** acima) — e o fechamento e por **decisao do dono**,
  fonte §A1.1, com o gatilho (`STAGING_DEPLOY_ENABLED`) nomeado para quem o ligar amanha.

---

# ACHADOS — os quatro, com gravidade e escopo

**A1 · `ajuste` · `dentro-do-bloco`.** `agent-orchestration/controle/pendencias-indice.md` (**+109/-97**
contra `origin/main`) esta no diff do PR e **nao consta da lista fechada do §5, como emendada pela E1·9**
— nem em §5.11 (que nomeia `pendencias.md`, e so ele, em `controle/`), nem no plano em lugar nenhum
(`grep -n 'pendencias-indice' <plano>` -> **vazio**; idem no briefing).
*Evidencia:* `git diff --numstat origin/main...HEAD -- agent-orchestration/controle/pendencias-indice.md`
-> `109 97`; introduzido pelo commit `4a24a074` (2026-09-06, desta branch).
*Propriedade ausente:* **ha arquivo no diff que a lista fechada do plano, como emendado, nao autoriza.**
*Por que `ajuste` e nao `bloqueia`:* o arquivo e o **placar derivado** do unico arquivo de `controle/` que
o §5 autoriza, regenerado para refleti-lo (265->277 cabecalhos, 198->208 abertas, 67->69 fechadas); nao
toca produto, contrato, KPI, seguranca nem territorio congelado (todos provados intocados por hash em
§1.2); e o repo tem pendencia nomeada `P-DERIVADO-ESQUECIDO` justamente sobre **nao** atualizar derivado.
O risco que o §5 protege e zero aqui. Registro a deviacao sem propor conserto.

**A2 · `ajuste` · registro `dentro-do-bloco`; defeito `pre-existente` (2026-06-07).**
`P-O6R-B07B-CHECKLIST-JSON-FILEURL` — a pendencia **dona do M1** — afirma como medido que o ramo JSON
*"cria anexo **sem `storageKey`**, entao a rota de download responde 404"*. **A execucao do caminho nao
sustenta:** `parseCreateChecklistAttachmentDto` (`checklist.validator.ts:222-231`) aceita
`metadata: jsonRecordSchema` **arbitrario do corpo**, `checklist-prisma.repository.ts:844-856` grava
`metadata: data.metadata` **sem campo do servidor**, e `resolveChecklistAttachmentDownload` **le
`metadata.storageKey`** e chama `getObject`. Logo o cliente **pode** por a chave, e o download **a le**.
*Evidencia de data/origem:* `git log -S 'parseCreateChecklistAttachmentDto' --reverse` -> `bfc5c7f7`
**2026-06-07**; `git log -S 'metadata.storageKey' --reverse` -> `2530850a` **2026-06-07**. Bloco dono:
trilha CHECKLIST (nomeado na propria pendencia).
*Propriedade ausente:* **a pendencia afirma como medida uma propriedade do codigo que a execucao do
proprio caminho nao sustenta — e por isso a gravidade e o residual que ela publica nao correspondem ao
que o proximo bloco encontrara.**
*Por que nao reprova:* (i) a metade **cross-tenant** do M1 **este bloco fechou** — o guard esta no
resolver e a chave alheia da 404; (ii) o residual e **intra-tenant**, a mesma metade WRITE de M2/M5, e o
arquivo e `pre-existente` e **fora do §5**; (iii) **nenhuma promessa do bloco e excedida**: contrato,
`componente_superado` e REGISTRO dizem "guard nos 4 resolvers", e sao os 4, este incluso.
*E a pergunta que me foi feita, respondida:* o criterio "3 sitios de `attachment.create(` -> 1" de
`P-O6R-B07B-ATTACHMENT-STORED-DO-CLIENTE` **NAO** alcanca o M1 — mas tambem **nao precisa**: medi os
sitios (`grep -rn 'attachment\.create(' src` -> **3**, exatamente os que ela lista) e o M1 e
`checklistAttachment.create(` (`checklist-prisma.repository.ts:844`), **outro modelo, sem coluna
`status`**, com pendencia propria. **A classe que ela enuncia nao e fechada pela metade.**

**A3 · `nota` · `dentro-do-bloco`.** N1 (§1.3): a remocao de `escapeHeaderFileName` em
`checklist.routes.ts` e `damage.routes.ts` cai fora do literal "ramo `if (result.file)`" — e codigo morto
por consequencia do ramo autorizado (unico chamador estava dentro dele; `git grep` no head volta vazio).

**A4 · `nota` · `pre-existente` (pratica de 2026-08-18, #356; cinco PRs desde entao).** `Kpis/index.html`
sem diff (§2.4, N2). Coerente com `D-KPI-INDEX-PAINEL`/§C3.0 e com o §9 do plano; o guard do painel roda
verde por mim.

---

# VEREDITO FINAL — **APROVADO**

Itens 1, 2 e 3 **PASSAM**. Nenhum `bloqueia`. Dois `ajuste` e duas `nota`, todos nomeados acima como
**propriedade ausente**, **sem conserto proposto** (§C7.4-bis).
