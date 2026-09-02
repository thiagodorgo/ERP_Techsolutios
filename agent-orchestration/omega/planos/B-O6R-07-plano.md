# PLANO B-O6R-07 — `fix/authorization-and-uploads` (Ω6R-SEC-002 P0 · SEC-003 P1 · SEC-004 P1)

**Papel:** `planejador-mestre` (Fable — `D-PLANEJADOR-MODELO-FABLE`). **Data:** 2026-09-01.
**Terreno medido:** worktree `.claude/worktrees/san2-r`, branch `docs/san2-6-contrato-p1p6-teto`, head `53e44d3`
(SAN2-6, PR #368 aberto); `origin/main` = `e6a6461` (SAN2-5, #367). **Quem executa: OUTRO agente** (§C7.4-bis —
quem planeja não desenvolve nem vota). **Paralelismo declarado:** o ciclo 5 do `B-O6R-02` roda no Codex, em
branch própria, AO MESMO TEMPO — a matriz de convivência está no §7.1.

---

## §1 · Objetivo, ator, fluxo — e os achados que este bloco fecha

**Objetivo:** fechar a trilha *"autorização e uploads"* do plano Ω6R (linha 7 de `docs/revisoes/O6R/PLANO_O6R.md`:
`B-O6R-07 fix/authorization-and-uploads — SEC-002, SEC-003, SEC-004 — dep. 1`). A dependência (B-O6R-01,
`fix/identity-authority`) está **FECHADA** (#357, seção "Pendências derivadas do B-O6R-01" em
`agent-orchestration/controle/pendencias.md` l.2428) — o bloco está **livre** e é o único da fila vinculante
(J-CHK-04C: 05 → 01 → 02 → 07 → 06) que não espera ninguém. Ele também **destrava**: a CHECKLIST P1 fica
bloqueada até `B-O6R-06` **E** `B-O6R-07` mergearem (deliberação J-6R, `J-CHK-04C-EMENDA-deliberacao-j6r.md` l.89).

**Atores do fluxo corrigido:** técnico de campo (`field_technician`/`technician`) — deixa de decidir aprovação e
de mutar OS alheia; gestor (`manager`)/`tenant_admin` — passam a ser os únicos decisores da aprovação
operacional; qualquer credencial anônima — passa a armar lockout e deixar rastro; qualquer cliente de upload
(web, mobile) — passa por sniff de magic bytes e scanner fail-closed; qualquer consumidor de download — recebe
`nosniff` + disposition segura.

### Os 3 achados (lidos de `docs/revisoes/O6R/achados.jsonl` l.9/28/29 — todos `status: "ativo"`)

| ID | Sev | O que afirma | Estado MEDIDO por mim no head (§2) |
|---|---|---|---|
| **Ω6R-SEC-002** | **P0** (votação "P0 mantido 5×0") | approve/reject usam `work_orders:update`, que o técnico tem; services filtram só tenant/id/estado → técnico decide aprovação tenant-wide e altera OS alheia, sem escopo por objeto, alçada ou SoD | **ATIVO, integral** — §2.1 |
| **Ω6R-SEC-003** | P1 | login lê `locked_until` mas falha só incrementa; sem threshold, sem escrita de lock, sem rate-limit | **PARCIALMENTE FECHADO pelo B-O6R-01** (o UPDATE atômico threshold→lock JÁ existe — §2.2). RESTAM: caminho anônimo sem lockout/rastro (`P-O6R-B01-ANONIMO-SEM-LOCKOUT`, ALTA, "dono natural: B-O6R-07") e rate-limit por IP (`P-O6R-B01-RATE-LIMIT-IP` "(→ B-O6R-07)") |
| **Ω6R-SEC-004** | P1 | scanner default devolve `clean` sempre; MIME vem do cliente; download `inline` com esse MIME | **ATIVO, integral** — e a classe existe em **DUAS vias a mais** que o achado não cita (checklists, damages) + work-order-attachments — §2.3 |

**Mais dois insumos vinculantes:** (a) a emenda J-CHK-04C item (iii) — *"B-O6R-07 entrega teste negativo de
papel em `POST /approvals/:id/approve` e `/reject`"* — é obrigação de aceite, não sugestão; (b) a **classe irmã
do SAN2-4b** procurada por ordem do briefing: o defeito exato (`keylen` do dado) **não** está no login de
tenant (`SCRYPT_KEY_LENGTH` é pinado em 64 e o parse rejeita hash de outro tamanho), **mas `N/r/p` vêm do
stored sem pino nem teto** (`password.service.ts:96-141` aceita qualquer inteiro positivo) — a MESMA família
que `authority-password.ts:89-93` acabou de pinar. **Entra no escopo** (§3.6): é a superfície que o bloco já
toca, o diff é ~5 linhas, e deixá-la seria repintar o buraco que a junta do 4b acabou de fechar.

### Pendência-mãe

`P-O6R-B07` (`agent-orchestration/controle/pendencias.md` l.2766-2813), lida inteira: *"Bloco 7 do plano
(depende do B01). Aceite: escopo por objeto e SoD, lockout atômico, scanner fail-closed com magic bytes."*
Campo **Bloqueia:** — no título: *"**BLOQUEIA OS/aprovações/RBAC, auth e anexos**"*; no corpo do SEC-002:
*"feature nova em ordens de serviço, aprovações e RBAC"* (com atenção do porteiro: fatia de CHECKLIST P1 que
amplie superfície de OS/aprovação cai na trava; `P-013` e `P-WO-LIST-TECH-NAME` afetadas); no corpo conjunto
SEC-003/004: *"feature em auth (SEC-003) e em evidências/anexos/upload mobile (SEC-004) — P1 antes de feature
no módulo, por deliberação"*. Status: *"ABERTA — 1 P0 + 2 P1"*.

### Decisão de fatiamento — DOIS sub-blocos, 1 PR cada (precedente SAN2-4a/4b)

O briefing manda considerar o padrão 4a/4b. Aqui **medir já está feito** (auditoria O6R + este §2); o corte
útil é por **superfície e competência**: **`B-O6R-07a` `fix/o6r07a-authorization`** (SEC-002 integral +
residuais do SEC-003 + pino N/r/p — módulos work-orders/core-saas/auth) e **`B-O6R-07b` `fix/o6r07b-uploads`**
(SEC-004 nas 5 vias — módulos evidence/attachments/mobile/checklists/damages/work-orders-attachment). Motivo:
(i) o P0 (SEC-002) não fica refém de debate sobre política de scanner; (ii) juntas menores com mandato ≤3
itens (P4) e teto de 2 ciclos POR PR; (iii) arquivos disjuntos → um reprovado não trava o outro. `1 bloco = 1
branch = 1 PR` preservado por sub-bloco (precedente da casa: SAN2-4a/#365 e 4b/#366). O gate da CHECKLIST P1
("até B-O6R-07 mergear") só se satisfaz com **os dois** mergeados — registrado em `pendencias.md` no PR do 07a.
**Ordem: 07a primeiro** (P0 antes de P1); 07b pode desenvolver em paralelo em worktree próprio (arquivos
disjuntos), mas as juntas serializam (P5).

---

## §2 · Diagnóstico MEDIDO por mim (head `53e44d3`, 2026-09-01) — com os comandos

Forma: leitura direta dos arquivos (Read) + `rg` (padrões abaixo). Nenhuma afirmação herdada de ata sem
re-leitura; onde o achado de 2026-08-14 divergiu do terreno de hoje, está dito.

### 2.1 · SEC-002 — ATIVO, integral

- `rg -n requirePermission src/modules/work-orders/work-order.routes.ts` + leitura l.60-129:
  `POST /approvals/:approvalId/approve` (l.78-84) e `/reject` (l.86-92) exigem
  `requirePermission(WORK_ORDER_PERMISSIONS.update)` — a MESMA guarda do `PATCH /work-orders/:workOrderId`
  (l.118-124). As constantes vivem no próprio `work-order.routes.ts` (l.28); `requirePermission` em
  `src/modules/core-saas/middleware/rbac.middleware.ts:6`.
- `rg -n work_orders:update src/modules/core-saas/permissions/catalog.ts`: **`technician` (l.598) e
  `field_technician` (l.916) têm `work_orders:update` e `work_orders:status`** (as linhas 784-820 citadas
  pelo achado sofreram drift — o conteúdo mudou de posição, não de substância).
- `approval.service.ts` l.61-118 (approve/reject/decide): valida SÓ tenant (findById com tenantId)
  e estado pending_approval (409). **Zero** verificação de papel, **zero** SoD (`requestedByUserId` existe
  no agregado — `approval.types.ts:26` — e não é comparado ao ator), **zero** escopo por objeto.
- **Alçada monetária NÃO tem âncora neste agregado:** `approval.types.ts` inteiro lido — entityType é
  work_order | checklist_run | evidence, **nenhum campo de valor**. Logo o "alçada" do achado se satisfaz no
  nível papel-política (RBAC_MATRIX/APPROVAL_LIMITS); alçada por valor não é implementável aqui sem inventar
  modelo — fora do bloco, dito às claras (§3.1).
- Política-alvo já escrita nos arquivos-base (medida): `RBAC_MATRIX.md:46` Workflow/approvals →
  manager **full**, operator **request**, finance/inventory **approval-by-policy**, field_technician
  **request/ack**; `RBAC_MATRIX.md:45` work orders → field_technician **execute/update-assigned**;
  `APPROVAL_LIMITS.md:38-42` manager = aprovador default; l.59-62 field_technician "not act as default
  approver"; l.44-47 operator "cannot silently bypass approval paths". **A matriz NÃO muda neste bloco — o
  código é que passa a cumpri-la.**
- Precedente interno de guarda dedicada, no MESMO arquivo: `work-order.routes.ts:137` (comentário do
  `mileage_correct`) — a casa já usa permissão dedicada quando `:update` é largo demais.
- Âncoras para escopo por objeto, medidas: OS tem `assigned_operator_id` + `team_id`
  (`work-order-prisma.repository.ts:125,747`); OperatorProfile é 1:1 (tenant_id,user_id) com lookup por
  user (`operator-profile-prisma.repository.ts:59`) — o mapeamento ator→perfil de campo existe.

### 2.2 · SEC-003 — o núcleo JÁ FOI fechado pelo B-O6R-01; restam os dois residuais nomeados

- `local-auth-credential.repository.ts:106-122`: `incrementFailedAttempts` é **UM UPDATE atômico** com
  CASE WHEN failed_attempts + 1 >= LOGIN_LOCKOUT_MAX_FAILED_ATTEMPTS THEN now() + 15min — o comentário no
  código data a correção: "B-O6R-01 (§6.4.1 do plano)… Antes deste bloco o incremento existia mas
  locked_until nunca era escrito". `markSuccessfulLogin` (l.137-149) zera contador e lock.
  `local-auth-login.service.ts:140-147` recusa `locked` ANTES do scrypt. O par de campos existe no schema
  (`rg -n locked_until prisma/schema.prisma` → l.266-267) → **ZERO migration neste bloco**. O
  `achados.jsonl` ainda diz `status: ativo` para o SEC-003 — a metade viva são os dois residuais abaixo; o
  fechamento do achado no 07a cita esta medição como causa (não se re-implementa o que o B01 já entregou).
- **Residual 1 — caminho anônimo:** `local-auth-login.service.ts:209-213` — comentário explícito: "falha
  anônima não incrementa contador de candidato nem audita" (desenho §6.4.3 do plano do B01).
  `P-O6R-B01-ANONIMO-SEM-LOCKOUT` (pendencias.md l.3347-3362, ABERTA/ALTA): 12 tentativas medidas em banco
  real, contador parado, zero auditoria; "dono natural: B-O6R-07".
- **Residual 2 — IP:** `anonymous-login.service.ts:80-124` tem balde por E-MAIL (HMAC + TokenBucket de
  `portal-shared/token-bucket.js`); o próprio cabeçalho (l.33-34) declara: "fecho por IP/distribuído é o
  B-O6R-07 (P-O6R-B01-RATE-LIMIT-IP)". No login com organização não há balde nenhum. Residuais nomeados na
  pendência (l.2434-2436): enumeração via 400 TENANT_ID_REQUIRED, amplificação distribuída, rotação de
  e-mails.

### 2.3 · SEC-004 — ATIVO nas 2 vias citadas + 3 vias irmãs medidas

- `evidence-storage.ts:50-54`: NoopEvidenceScanner.scan() devolve status clean incondicional — e é o
  **default** em `mobile-evidence-upload.ts:54` e `attachment.storage.ts:53`.
- MIME do cliente: `attachment.storage.ts:99-106` — mimeType = info.mimeType do busboy, e a allowlist
  (`config.allowedMimeTypes`, de `env.CHECKLIST_STORAGE_ALLOWED_MIME_TYPES` via
  `checklist-storage.factory.ts:28-29`) valida **o que o cliente declarou**, não os bytes.
  `rg -n -i "magic|sniff|file-type" src/` → **zero** — não há verificação de conteúdo em lugar nenhum.
- Download: `attachment.routes.ts:71-86` — Content-Type = MIME armazenado (do cliente) e
  Content-Disposition inline. Sem X-Content-Type-Options.
- **Classe irmã (o achado não cita, eu medi):** `rg -n allowedMimeTypes src/` → o MESMO bloco busboy
  confia-no-cliente existe em `checklists/checklist-attachment.storage.ts:95`,
  `damages/damage-attachment.storage.ts:105` e `work-orders/work-order-attachment.storage.ts:99`. Pelo
  §C7.1-ter(a) são pré-existentes e não citadas — mas são a mesma classe, na trilha que o bloco já corrige:
  **entram no 07b** via helper compartilhado (§3.8), com esta declaração de origem como evidência.
- O arnês já modela o mundo-alvo: FakeEvidenceScanner existe (`evidence-storage.ts:56-62`) e é usado em 4
  suítes (`rg -l FakeEvidenceScanner tests/`); o contrato B-108 já reserva os estados
  rejected/scan_failed/pending_review com blob preservado (CLAUDE.md B§6).

### 2.4 · Classe irmã do SAN2-4b (ordem do briefing) — presente, em forma atenuada

`password.service.ts` (lido inteiro): keylen é **pinado** (l.9,77: SCRYPT_KEY_LENGTH=64; o parse rejeita
hash de tamanho diferente em l.117) — o defeito EXATO do authority-password não está aqui. **Mas N, r e p
são lidos do stored e aceitos para QUALQUER inteiro positivo** (l.96-141) e alimentam o scrypt (l.79-81).
A emissão só produz N=16384, r=8, p=1 (l.6-8) — aceitar outra coisa é aceitar dado não-canônico; um stored
corrompido/forjado com N alto estoura maxmem (64 MiB, l.10) e o erro **propaga sem catch** → 500 no login.
Mesma família ("parâmetro do KDF vem do dado, não do sistema") que `authority-password.ts:89-107` fechou
com pino + comentário-lição. Nota de colisão: o ciclo 5 absorve `authority-password.ts` do #366 — por isso
`src/modules/authority/**` é PROIBIDO aqui (§5/§7.1); o pino do 07a é em
`auth/services/password.service.ts`, módulo distinto, sem colisão.

### 2.5 · Detecção hoje = ZERO, e a baseline de testes

- A suíte completa está VERDE no head defeituoso (`Kpis/kpis-latest.json`: backend_tests 2609/2611, última
  execução real no #366) → **nenhum dos defeitos acima é detectado por teste existente**. É o cenário exato
  do vermelho-controle: sonda que nunca ficou vermelha não prova ausência.
- Testes-alvo (contagem ESTÁTICA por grep de aberturas de caso — subconta subtests; o dev re-mede por
  execução na abertura, §4): approval-routes 2 · approval 2 · approval-frontend-contract 1 ·
  attachments-crud 11 · work-order-attachments 8 · work-order-attachments-routes 12 · auth-login 2 ·
  auth-login-anonymous 10 · auth-login-anonymous-db 2 · auth-credentials 8 (soma estática 58) + a fatia de
  evidência de `mobile-backend-contracts`.

---

## §3 · Correção proposta, item a item (o COMO detalhado é do dev; aqui vai o QUÊ + critério)

### Sub-bloco 07a — `fix/o6r07a-authorization` (SEC-002 + residuais SEC-003 + pino KDF)

**3.1 · Permissão dedicada de decisão de aprovação.** Nova constante `approve: "work_orders:approve"` em
`WORK_ORDER_PERMISSIONS` (`work-order.routes.ts:28`); as rotas approve/reject (l.78-92) passam a exigi-la.
No catálogo (`core-saas/permissions/catalog.ts`): concedida a `manager` e `tenant_admin` (+ admins de
plataforma SE o padrão da casa conceder por herança — o dev mede como super/platform_admin recebem os
demais `work_orders:*` e segue o padrão). **NÃO** concedida a technician, field_technician, operator,
field_dispatcher, auditor, support. Finance/inventory ("approval-by-policy" na matriz): **não** recebem
neste bloco — não existe política monetária ancorada (§2.1); vira pendência nomeada
`P-O6R-B07-APPROVAL-BY-POLICY` (conceder quando a política de valor existir). Concessão mínima primeiro.
GET pending/detail permanecem em `work_orders:read` (leitura não decide).

**3.2 · SoD no decide.** Em `approval.service.ts` decide(): se `actor.userId === current.requestedByUserId`
→ `403 APPROVAL_SELF_DECISION` (ApprovalError novo). Vale para approve E reject. Auditoria da recusa segue
o padrão allowlist do módulo (sem PII nova).

**3.3 · Escopo por objeto no caminho do técnico.** Em `work-order.service.ts` (update/status): quando o
ator só alcança a OS por papel de campo (technician/field_technician — sem permissão de gestão), a mutação
exige `assigned_operator_id` == OperatorProfile do ator (lookup 1:1 por user_id, §2.1). OS de outro
operador ou sem atribuição → `403 WORK_ORDER_NOT_ASSIGNED` (não 404: o objeto existe no tenant do ator —
404 permanece reservado a cross-tenant, contrato vigente). Manager/tenant_admin/operator (papéis de
gestão/despacho com update pela matriz l.45: full/create-edit) seguem tenant-wide. A regra nasce no
SERVICE (autoridade backend), não na UI; team_id NÃO entra como critério neste bloco (sem modelo de
membership de equipe medido) — dito às claras, pendência se a junta exigir.

**3.4 · Caminho anônimo arma o lockout e deixa rastro.** `verifyAnonymousCandidate` (falha de senha de um
candidato) passa a chamar o MESMO `incrementFailedAttempts` atômico do B01 (nenhum contador novo, nenhum
read-modify-write novo) + 1 linha de auditoria de falha anônima (allowlist: sem enumerar organizações na
resposta; o rastro é interno). A RESPOSTA anônima segue 401 uniforme — o 423 NUNCA vaza no caminho anônimo
(preserva o anti-enumeração do B01; candidato em lock já vira reason locked achatado, l.211). Trade-off
declarado para a junta: armar lockout por via anônima cria vetor de negação de acesso à conta com custo
baixo — mitigações: TTL de 15 min (medido no repositório), balde por e-mail existente, rastro auditável; a
alternativa (não armar) mantém força bruta ilimitada sem rastro, que é o achado. Decisão é da junta com o
trade-off à vista.

**3.5 · Rate-limit por IP, in-process.** TokenBucket EXISTENTE (`portal-shared/token-bucket.ts` — reuso,
zero dependência) com chave = HMAC(subchave derivada de JWT_SECRET, ip) — mesmo idioma do balde de e-mail
(`anonymous-login.service.ts:84`) — aplicado às DUAS rotas de login (com organização e anônima) em
`auth.routes.ts`. Estouro → `429 RATE_LIMITED` (código já mapeado no app Flutter — kpis nota do B01: 429
existe no contrato do login sem organização). Parâmetros injetáveis para teste; IP extraído do socket (o
padrão de proxy/X-Forwarded-For é decisão de infra FORA do bloco — registrar em
`P-O6R-B07-RATE-LIMIT-DISTRIBUIDO`, junto com o fecho multi-réplica via Redis).

**3.6 · Pino N/r/p no parse do scrypt de tenant.** `parseScryptHash` (`password.service.ts:96-129`) aceita
SOMENTE N=16384, r=8, p=1 (as constantes de emissão do formato v=1); qualquer outro trio → undefined →
invalid_credentials, sem rodar scrypt. Rotação de parâmetros = versão nova do formato (v=2), como o
comentário-lição do authority-password prescreve. Comentário no código aponta a lição do SAN2-4b.

### Sub-bloco 07b — `fix/o6r07b-uploads` (SEC-004, 5 vias)

**3.7 · Scanner fail-closed por ambiente.** O default deixa de ser Noop incondicional: uma factory resolve
o scanner por env (`EVIDENCE_SCANNER`): em produção, scanner ausente/indisponível ⇒ upload NÃO persiste —
`503 SCAN_UNAVAILABLE`, blob do cliente preservado por contrato (B§6: erro/timeout preservam o blob local;
`pending_review` não é usado aqui porque não existe fluxo de revisão implementado — dito às claras);
`infected` ⇒ recusa nomeada + auditoria + nada persistido. Noop segue permitido APENAS fora de produção,
por env explícita (dev/test) — e os testes que hoje dependem do default Noop passam a declará-lo. Aplica-se
às 5 vias (§2.3): mobile evidence, attachments, checklists, damages, work-order-attachments.

**3.8 · Magic bytes (sniff in-house, ZERO dependência nova).** Helper compartilhado (novo arquivo, ex.:
`src/modules/evidence/mime-sniff.ts`): tabela de assinaturas para a allowlist configurada (jpeg FFD8FF ·
png 89504E47 · webp RIFF..WEBP · pdf 25504446 · gif GIF8 · heic/heif ftyp — o conjunto EXATO segue o
default de `CHECKLIST_STORAGE_ALLOWED_MIME_TYPES`, que o dev mede). Regra nas 5 vias: o tipo EFETIVO é o
sniffado; declarado ≠ sniffado ⇒ 415; tipo fora da allowlist (pelo sniffado) ⇒ 415; bytes sem assinatura
reconhecida ⇒ 415. Uma dependência nova (ex.: file-type) exigiria junta-5 — por isso in-house, e a tabela
é pequena porque a allowlist é pequena.

**3.9 · Download endurecido.** `attachment.routes.ts` sendResult (e as vias irmãs de download, se o dev
medir que existem): `X-Content-Type-Options: nosniff` SEMPRE; `Content-Disposition: attachment` por
default; `inline` só para tipos de imagem VERIFICADOS por sniff no upload (jpeg/png/webp — preserva
preview do console sem servir HTML/SVG/PDF inline); Content-Type servido = tipo verificado, nunca o
declarado pelo cliente.

### 3.10 · Contrato e modelagem (consolidados do molde)

**Contrato (delta em API_CONTRACTS.md, versionado por bloco):** approve/reject passam a exigir
`work_orders:approve` (403 para papéis de campo — teste da emenda J-CHK-04C iii) · `403
APPROVAL_SELF_DECISION` · `403 WORK_ORDER_NOT_ASSIGNED` · `429 RATE_LIMITED` nos logins · `503
SCAN_UNAVAILABLE` e `415` por sniff nos uploads · downloads com nosniff/attachment. Preservados: 404
cross-tenant, 409 APPROVAL_ALREADY_DECIDED, 422/423 vigentes, 401 uniforme anônimo.
**Modelagem:** ZERO migration, zero campo novo (locked_until/failed_attempts existem — §2.2); Decimal/
timestamptz/delete lógico N/A (nenhum modelo novo). Permissão nova é catálogo em CÓDIGO; se a paridade
RBAC persistente exigir seed, o teste de paridade da casa acusa e o seed correspondente entra no diff do
07a (o dev mede com RBAC_DB_PARITY — premissa declarada, não presumida como fato).

---

## §4 · Prova de cada correção — vermelho-controle obrigatório e N por poder, não por hábito

**Regra-mãe (método consolidado na rodada):** nenhuma correção é aceita por "ficou verde". Para CADA sonda
nova, o dev registra no arquivo de evidência (P1) a execução da MESMA sonda contra o **head-base** (ou com a
correção revertida por injeção) ficando **VERMELHA, com ec e trecho de saída** — só então o verde pós-correção
vale como prova de ausência. Sonda sem vermelho-controle registrado = não-prova (foi assim que o SAN2-4b
descobriu que consertar só o tamper levava a detecção a zero). §2.5 mediu: detecção-base dos defeitos = 0.

| # | Correção | Casos mínimos (piso) | N exigido e o PORQUÊ | Vermelho-controle (o que TEM de falhar no base) |
|---|---|---|---|---|
| 1 | 3.1 permissão | ≥6: manager 200 · tenant_admin 200 · technician 403 · field_technician 403 · operator 403 · auditor 403 (obrigação J-CHK-04C iii) | Determinístico (guarda de rota, sem relógio/corrida) → **N=3** execuções do arquivo, denominador idêntico 3/3 (flake do arnês, não do caso) | technician recebe **200** no base (ec≠0 na sonda) |
| 2 | 3.2 SoD | ≥2: solicitante decide → 403 · outro decisor → 200 (approve E reject) | Determinístico → N=3 | autoaprovação retorna **200** no base |
| 3 | 3.3 objeto | ≥4: técnico A → OS de B 403 · OS sem atribuição 403 · própria 200 · manager → qualquer 200 | Determinístico → N=3 | técnico A muta OS de B com **200** no base |
| 4 | 3.4 lockout anônimo | ≥3: 5 falhas anônimas → login direto 423/locked · senha certa sob lock → locked · pós-TTL volta (relógio injetado) — re-executa a medição do secops (12 tentativas) como sonda | Fluxo sequencial determinístico → N=3. **Concorrência: N=25** no caso de 2 falhas anônimas simultâneas com barreira, SÓ se o diff introduzir escrita nova fora do UPDATE atômico do B01 (o plano PROÍBE: reuso obrigatório — o caso então vira guarda de regressão com N=25; poder: perda-de-incremento em read-modify-write tem p por execução tipicamente ≥0,12 no arnês -db da casa — 25 execuções dão ≥95% de detecção; o dev publica o p MEDIDO na evidência, não o assume) | 12 falhas anônimas **não movem** failed_attempts no base (contador parado — reprodução da medição do secops) |
| 5 | 3.5 rate-limit IP | ≥3: estouro → 429 · e-mails diferentes/mesmo IP → 429 (fecha rotação por IP único) · IPs distintos não compartilham balde | Determinístico (bucket e relógio injetados) → N=3 | inexistência de 429 por volume no base |
| 6 | 3.6 pino KDF | ≥3: stored N=32768 → invalid_credentials SEM derivar (espião de scrypt, idioma do B01 §6.4.4) · N gigante → recusa limpa (sem 500) · round-trip canônico verde | Determinístico → N=3 | base **aceita e deriva** com N do dado (espião conta 1 scrypt; e N gigante → erro não tratado) |
| 7 | 3.7 fail-closed | ≥5 (1 por via): scanner indisponível → 503 + NADA persistido (assert: storage root sem blob novo + registro ausente) · infected → recusa + auditoria | Determinístico (scanner injetado) → N=3 | no base, upload persiste como stored **sem scanner algum ter rodado** |
| 8 | 3.8 magic bytes | ≥4 na via principal + tabela do helper: PNG declarado jpeg → 415 · MZ (exe) declarado png → 415 · caso limpo → 200 · sem assinatura → 415; vias irmãs ≥1 caso cada | Determinístico → N=3 | base aceita MZ como image/png (200, persiste) |
| 9 | 3.9 download | ≥3: pdf → attachment+nosniff · imagem verificada → inline permitido · Content-Type = verificado | Determinístico → N=3 | base serve inline com MIME do cliente e sem nosniff |

**Metas:** baseline N re-medido POR EXECUÇÃO na abertura da branch (lista exata do §2.5; publicar o número
real — a estática 58 subconta). **M ≥ 29 casos novos permanentes** (soma dos pisos acima; ≥20 no 07a, ≥9 no
07b), TODOS com vermelho-controle registrado. Bateria plena: suíte backend completa **ec=0, 1×** por PR
(denominador publicado = 2611+Δ, Δ nomeado por arquivo) + arquivos novos **3/3 com denominador idêntico** +
o caso de corrida (se existir) 25/25. Contagem só vale com N e forma declarados (lição da casa).

---

## §5 · Escopo — caminhos exatos

### PERMITIDO — 07a (`fix/o6r07a-authorization`)
- `src/modules/work-orders/work-order.routes.ts` · `approval.service.ts` · `approval.controller.ts` ·
  `approval.types.ts` · `work-order.service.ts` · `work-order.types.ts` (só se o contexto do ator exigir)
- `src/modules/core-saas/permissions/catalog.ts` (+ arquivo de seed de paridade RBAC SE o teste de paridade
  exigir — premissa §3, declarar no PR qual arquivo foi)
- `src/modules/auth/services/local-auth-login.service.ts` · `anonymous-login.service.ts` ·
  `password.service.ts` · `src/modules/auth/routes/auth.routes.ts` · constantes de lockout/balde do módulo auth
- `tests/` NOVOS: `tests/o6r07a-approval-permission.test.ts` · `o6r07a-approval-sod.test.ts` ·
  `o6r07a-wo-object-scope.test.ts` · `o6r07a-anon-lockout.test.ts` (e variante -db se preciso) ·
  `o6r07a-login-rate-limit.test.ts` · `o6r07a-scrypt-pin.test.ts`; EDIÇÃO dos existentes SÓ nos citados no
  §2.5 e SÓ se o contrato novo os quebrar (403 novo) — mudança mínima, justificada linha a linha
- `API_CONTRACTS.md` (delta §3) · `Kpis/kpis-latest.json` + `kpis-history.json` + `kpis-history.md` +
  `index.html` (§C3) · `agent-orchestration/controle/pendencias.md` · `docs/revisoes/O6R/achados.jsonl` +
  `REGISTRO_ACHADOS_O6R.md` · `agent-orchestration/docs/status-geral.md` · `agent-orchestration/codex/log-execucao.md`

### PERMITIDO — 07b (`fix/o6r07b-uploads`)
- `src/modules/evidence/evidence-storage.ts` (+ novo `mime-sniff.ts` e factory de scanner) ·
  `src/modules/mobile/mobile-evidence-upload.ts` · `src/modules/attachments/attachment.storage.ts` +
  `attachment.routes.ts` + controller do módulo · `src/modules/checklists/checklist-attachment.storage.ts` ·
  `src/modules/damages/damage-attachment.storage.ts` · `src/modules/work-orders/work-order-attachment.storage.ts`
- arquivo de env da casa para a var do scanner (o dev localiza o módulo de config; `.env` REAL proibido —
  só `.env.example`/schema de env versionados)
- `tests/` NOVOS: `tests/o6r07b-scanner-failclosed.test.ts` · `o6r07b-mime-sniff.test.ts` ·
  `o6r07b-download-disposition.test.ts`; EDIÇÃO dos testes de attachments/evidence citados no §2.5 só onde o
  contrato novo os quebrar (415/503/attachment) — justificada
- `API_CONTRACTS.md` · `Kpis/*` (os 4) · `pendencias.md` · `achados.jsonl` + `REGISTRO` · `status-geral.md` ·
  `log-execucao.md`

### PROIBIDO (ambos — colisão com o ciclo 5 e rails da casa)
**Tudo que o §5 do plano do ciclo 5 toca:** `tests/audit-security.test.ts` ·
`tests/vehicle-identity-schema.test.ts` · `tests/impound-process-checklist-link-schema.test.ts` ·
`tests/helpers/auth-identity-fixture.ts` (IMPORTAR pode; EDITAR não) · `tests/db-catalog-write-guard.test.ts` ·
`tests/core-saas-role-authority-db.test.ts` · `tests/npm-test-runner-guard.test.ts` ·
`tests/financial-entry-delete-reverse-race-db.test.ts` · `scripts/**` (executar pode; editar não).
**Mais:** `prisma/**` INTEIRO (schema E migrations — zero migration neste bloco, §2.2) ·
`src/modules/authority/**` (ciclo 5 absorve o authority-password do #366) · `src/modules/financial-*/**` e
qualquer módulo financeiro · `.github/**` · `frontend/**` · `mobile/**` · `CLAUDE.md`/`AGENTS.md` · `.env` ·
lockfiles · `RBAC_MATRIX.md`/`APPROVAL_LIMITS.md` (o código converge PARA eles; eles não se movem) ·
`docs/revisoes/O6R/PLANO_O6R.md` · junction/symlink de `node_modules` · mass-delete ad-hoc na base viva ·
`erp-postgres`/`erp-redis` (nem leitura). **Arquivo fora das listas → o dev PARA e devolve ao planejador.**

---

## §6 · Bateria de validação + armadilhas MEDIDAS desta rodada (vinculantes para o dev)

**Base da branch:** `origin/main` (`e6a6461`). O #368 (SAN2-6) é 100% documental — nada dele é dependência de
código; quando mergear, `git pull --rebase origin main` antes de abrir o PR. Worktree PRÓPRIO por dev (um para
07a, outro para 07b se paralelos), `npm ci` próprio — **junction/symlink de node_modules PROIBIDA**; remoção
só por `git worktree remove --force`.

**Cluster descartável próprio (a base viva `erp-postgres`/`erp-redis` é INTOCÁVEL, nem leitura):** portas
**56432+**, escolhidas DEPOIS de `netsh interface ipv4 show excludedportrange protocol=tcp` **E** de
`docker ps` (o ciclo 5 roda em paralelo nesta máquina e pode estar com 56432/56379 ocupadas — sugerido:
`o6r07-pg` :56434, `o6r07-redis` :56381). Derrubar os containers ao final (§C5). Nunca 55432
(`P-SAN2-2-PORTA-55432-RESERVADA`).

**Bateria (por PR):**
1. `npm run check` · `npm run lint` · `npm test` (forma canônica do runner com DATABASE_URL/REDIS_URL do
   cluster descartável — a MESMA forma declarada na nota de KPI do #366) · `npm run build`
2. Focados: `node --test --import tsx tests/o6r07*-*.test.ts` (N=3, denominador idêntico) + os arquivos-alvo
   do §2.5 (re-medição do baseline por execução)
3. Contrato mobile: `node --test --import tsx tests/mobile-backend-contracts.test.ts` (07b toca a via de
   evidência — o contrato B-108 não pode regredir)
4. Regressão frontend SEM tocar frontend: `npm --prefix frontend run check` + build — e a suíte backend
   inteira de novo se algum teste-contrato de front (`approval-frontend-contract` lê .tsx) acusar o delta de
   permissão; o .tsx NÃO muda neste bloco
5. `node --check Kpis/app.js` + guard `tests/kpi-dashboard-charts.test.ts` + `node scripts/kpi-freeze.mjs`
   (executar scripts PODE; editar não)
6. `git diff --check` · limpeza §C5 (1 linha no fechamento)

**Armadilhas medidas nesta rodada — transcritas porque cada uma já queimou alguém:** `grep -c` de CR não
conta (use `tr -cd` + `wc -c`) · `md5sum`/`git status` MENTEM sob `core.autocrlf=true` (compare por
`git show`/`git -c core.autocrlf=false checkout <head> -- <caminho>`; NUNCA `git archive`+`tar`) · `sed`/
`perl -i` NÃO editam arquivo CRLF de contrato (convertem EOL em massa disfarçada de edição) · `$!` não é PID
utilizável no Windows/Git Bash · heredoc com aspas QUEBRA no arnês desta sessão (visto DUAS vezes na escrita
deste próprio plano: chunks grandes falham com unexpected EOF — escrever arquivos grandes em pedaços ≤40
linhas, e conteúdo de teste vai em arquivo-fonte, não em heredoc de shell) · o `--check` do espelho
(`sync-agent-agents.mjs`) é CEGO a subdiretório (`especialistas/`) — ec=0 dele não prova paridade dos corpos
de jurado · sem mass-delete ad-hoc (teardown escopado apenas) · disparo de jurados ≤2 em paralelo (P5).

---

## §7 · Riscos e rollback

### 7.1 · Colisão com o ciclo 5 (roda em PARALELO, noutra branch, no Codex) — MEDIDA, não presumida

| Superfície | Ciclo 5 (plano §5 dele, lido) | Este bloco | Veredito |
|---|---|---|---|
| `src/**` | **PROIBIDO INTEIRO para o c5** ("nenhuma linha de produto muda neste ciclo") | é onde este bloco vive | **ZERO colisão em src** — por construção |
| `tests/**` | 8 arquivos nomeados + helpers | só arquivos NOVOS `o6r07*` + edições nos do §2.5 (disjuntos dos 8) | zero colisão; `auth-identity-fixture.ts` só IMPORTADO |
| `prisma/migrations/**` | UMA migration nova (FK reversal_of) | ZERO migration | zero colisão |
| `scripts/run-backend-tests.mjs` | edita | só executa | zero colisão de diff; se o c5 mergear primeiro, re-rodar a bateria na forma NOVA do runner |
| **Registro compartilhado**: `Kpis/*` (4) · `pendencias.md` · `achados.jsonl` · `REGISTRO_ACHADOS` · `status-geral.md` · `log-execucao.md` · `API_CONTRACTS.md` | edita | edita | **CONFLITO TEXTUAL CERTO para o segundo a mergear** — remédio: rebase + re-append (history é append-only), re-medição das contagens (o denominador 2611 MUDA se o c5 somar casos) e `kpi-freeze` re-rodado. Mecânico, não substantivo |
| Dívida do backfill #368 | o `kpis-latest` do SAN2-6 atribui ao "PR seguinte, que é o ciclo 5" | o briefing do dono atribui a ESTE bloco | **Regra do primeiro-que-merge:** quem mergear primeiro paga (backfill §C3.5 do #368: pr/merge_commit/approved_head da entrada SAN2-6 + `blocks_completed` 157→158); o outro VERIFICA e não duplica. Reatribuição registrada com §A2 em `pendencias.md` no PR do 07a (precedente: SAN2-5 e SAN2-6 fizeram o mesmo) |

### 7.2 · Riscos de produto e execução

| Risco | Mitigação / rollback |
|---|---|
| Manager com token emitido antes do deploy fica 403 em approve até renovar (claims defasados, janela ≤15 min) | declarado no PR; sem ação — janela curta e o 403 é o contrato novo |
| `attachment` default quebra preview de imagem no console | §3.9 preserva inline para imagem VERIFICADA; smoke frontend na bateria pega regressão |
| Lockout via anônimo vira vetor de DoS de conta | trade-off à vista da junta (§3.4): TTL 15 min + 401 uniforme + rastro; decisão consignada em ata |
| Fail-closed trava upload em produção sem scanner real | não há produção ativa (go-live readiness pendente); env explícita documentada; recusa é DECLARADA (503 nomeado), nunca perda silenciosa — blob preservado por contrato |
| Correção-que-nasce-defeito (a classe da D-JUNTA-SEPARACAO-DE-PAPEIS) | papéis separados (§8), vermelho-controle por sonda (§4), teto de 2 ciclos com identidade nova |
| Guard de objeto (3.3) esconder OS legítima de papel misto (usuário com 2 papéis) | resolução de permissão é por UNIÃO de papéis (padrão da casa) — quem tem papel de gestão não cai no guard; caso de teste explícito para ator com 2 papéis |
| IP única atrás de NAT corporativo → 429 para inocentes | parâmetros do balde generosos e injetáveis; fecho fino é o residual distribuído (`P-O6R-B07-RATE-LIMIT-DISTRIBUIDO`) |
| **Rollback** | revert do squash-merge restaura as guardas antigas por inteiro; ZERO migration → zero down; permissão `work_orders:approve` órfã pós-revert é inerte (nenhuma rota a exige) |

---

## §8 · Junta e quórum — decidido com argumento, não por reflexo

**Quórum: UNANIMIDADE DE 3, nos dois PRs (07a e 07b).** Fundamento §C7.1-ter(b): o gatilho não é "toca algo
sensível em algum lugar" — é que **segurança e permissão são o NÚCLEO do diff**, dois dos quatro gatilhos da
regra de uma vez. O teste do contrário, para não ser reflexo: se maioria bastasse, um voto vencido em
mudança de catálogo de permissão viraria merge — exatamente a classe que a J-6R votou P0 **5×0** (SEC-002).
O 07b, isoladamente, poderia parecer "só upload"; não é: scanner fail-closed e sniff decidem **o que entra e
o que é servido** ao usuário — superfície de segurança por definição do próprio achado (bytes hostis
entregues inline). **NÃO é junta-5:** sem deploy de produção, sem dependência nova (sniffer in-house §3.8;
TokenBucket reutilizado §3.5; scanner plugável sem serviço externo), sem serviço pago — os três gatilhos de
5/5 não ocorrem. **`critico-adversarial` ataca ESTE PLANO antes do código do 07a** (§C7.1-ter(b): bloco de
invariante — aqui, invariante de permissão; precedente da casa: Ω5P PR-03, onde o crítico pegou 3 defeitos
que a junta técnica não viu).

**Composição (identidades novas, elegibilidade conferida pelo inspetor):**
- **Junta 07a** — C1 segurança/authz adversarial (ataca SEC-002: papel, SoD, objeto, bypass por status);
  C2 auth/criptografia (lockout anônimo, rate-limit, pino KDF — re-executa a sonda das 12 tentativas);
  C3 contrato/regressão (delta API_CONTRACTS × diff real, KPI com N e forma, escopo §5 arquivo a arquivo,
  paridade RBAC_MATRIX).
- **Junta 07b** — C1 segurança de conteúdo (sniff/polyglot/disposition); C2 contrato mobile B-108
  (blob preservado, estados, idempotência da via de evidência); C3 contrato/regressão (idem acima).
- Mandato ≤3 itens por cadeira (P4) · evidência incremental (P1) · voto-esqueleto antes da mensagem final
  (P2) · suplente re-executa comandos registrados (P3) · disparo ≤2 (P5) · quedas em `00-quedas.md` (P6).
- **Inspetor-de-terreno** LIBERA antes de cada junta (fail-closed §C7.1-bis) — inclui conferir que o worktree
  do jurado não é o do ciclo 5 e que os clusters não colidem em porta. **Porteiro pós-merge** após cada merge.
- **Separação de papéis (§C7.4-bis):** planejei EU (planejador-mestre desta sessão) — **não desenvolvo, não
  voto**; quem achou (auditoria O6R + secops do B01 + as medições deste plano) não conserta; o dev não julga
  a validade dos achados. Teto de **2 ciclos** por PR (`D-TETO-DOIS-CICLOS`): reprovou no 2º → PARA, dossiê
  ao dono. Todo voto declara `gravidade` E `escopo` com evidência (§C7.1-ter(a)) — as 3 vias irmãs do §2.3 e
  o pino do §2.4 já vêm com a declaração de origem pronta para o jurado citar.

**Registro e dívidas (no PR, não depois):**
1. Backfill §C3.5 do **#368** + `blocks_completed` **157→158** — pela regra do primeiro-que-merge (§7.1);
   se o ciclo 5 pagar antes, o 07a VERIFICA (gh pr view 368 + ata) e consigna, sem duplicar. O 07b conta
   **158→159** com justificativa de sub-bloco pleno (precedente SAN2-4a/4b, um incremento por PR mergeado).
2. `achados.jsonl` + `REGISTRO_ACHADOS_O6R.md`: SEC-002 → `fechado` no 07a · SEC-003 → `fechado` no 07a
   **com a causa em duas partes** (núcleo pelo B-O6R-01 #357, medição §2.2; residuais por este PR) ·
   SEC-004 → `fechado` no 07b. Quem registra não vota.
3. `pendencias.md`: `P-O6R-B07` fecha em duas etapas (07a: SEC-002+SEC-003; 07b: SEC-004 — o título "1 P0 +
   2 P1" só zera com os dois) · `P-O6R-B01-ANONIMO-SEM-LOCKOUT` fecha no 07a · `P-O6R-B01-RATE-LIMIT-IP`
   fecha no 07a COM residual re-nomeado `P-O6R-B07-RATE-LIMIT-DISTRIBUIDO` (multi-réplica/Redis + política
   de X-Forwarded-For + enumeração do 400 TENANT_ID_REQUIRED, que este bloco NÃO fecha) · nova
   `P-O6R-B07-APPROVAL-BY-POLICY` (finance/inventory quando houver política de valor) · registro §A2 da
   reatribuição da dívida do #368 (§7.1) · gate da CHECKLIST P1 = 07a **E** 07b mergeados (+ B-O6R-06).
4. KPI (§C3): 4 arquivos no MESMO PR, contagens de execução real com N e forma, `pr`/`merge_commit`/
   `approved_head` null na autoria; `mvp_demo`/`mvp_vendavel` INTOCADOS (correção de segurança não move
   escopo de produto — justificativa de 1 linha no history).

**Sem plano = veto automático. Este é o plano; a junta do 07a o revisa (com o parecer do crítico) antes da
primeira linha de código.**

— fim —
