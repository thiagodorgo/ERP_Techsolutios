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
