# BRIEFING — junta do bloco `B-O6R-07a` (PR #369)

> **Head a julgar:** `7c248c9` · **Base:** `origin/main` = `f895dd2` (#368) · **Branch:**
> `fix/o6r07a-authorization` · **Worktree:** `.claude/worktrees/b07` · **CI: 7/7 verde.**
> **QUÓRUM: UNANIMIDADE DE 3** (§C7.1-ter(b) — o bloco toca **segurança e permissão**; o gatilho é
> escrito). **Cada cadeira tem veto: um voto sozinho reprova.**
> **Este briefing é insumo, não veredito.** Toda afirmação aqui é do orquestrador e **deve ser
> re-medida**. Nada abaixo conta como fato provado.

---

## 1 · O que o bloco fecha

| Achado | Sev | Estado |
|---|---|---|
| **Ω6R-SEC-002** | **P0** | approve/reject exigiam `work_orders:update`, que o **técnico tem** → ele decidia aprovação tenant-wide e alterava OS alheia, sem escopo por objeto nem SoD |
| **Ω6R-SEC-003** (residuais) | P1 | login anônimo não armava lockout nem deixava rastro; sem rate-limit por IP; `parseScryptHash` honrava N/r/p vindos do dado armazenado |
| **Ω6R-SEC-004** | P1 | **NÃO entra** — é o `07b`, PR próprio |

## 2 · O diff, medido (re-meça)

**41 arquivos · 5.822 adições · 294 remoções.** Código e migration:

```
47  0  prisma/migrations/20260871000000_grant_work_orders_approve_permission/migration.sql
16  0  src/modules/auth/anonymous-login.constants.ts
57  1  src/modules/auth/routes/auth.routes.ts
16  3  src/modules/auth/services/anonymous-login.service.ts
35  5  src/modules/auth/services/local-auth-login.service.ts
17  0  src/modules/auth/services/password.service.ts
13  0  src/modules/core-saas/permissions/catalog.ts
39  0  src/modules/work-orders/approval.service.ts
11  2  src/modules/work-orders/approval.types.ts
10  2  src/modules/work-orders/work-order.routes.ts
69  1  src/modules/work-orders/work-order.service.ts
61  0  src/modules/work-orders/work-order.types.ts
```

**Bateria declarada:** `255 arquivos · 2647 testes · pass 2645 · fail 0 · skipped 2`, `ec=0`.
`check`/`lint`/`build`/`git diff --check` = 0. Contrato mobile B-108 **25/25**. Frontend `check`+`build` = 0
(**depois de `npm ci` no worktree** — sem ele dá erro de módulo; é ambiente, e o bloco não toca `frontend/`).
**Baseline do bloco: 251/2622/fail 4 → 255/2647/fail 0.**

## 3 · O plano e as DUAS emendas — leia as três, nesta ordem

`agent-orchestration/omega/planos/B-O6R-07-plano.md`: corpo (`planejador-mestre`, Fable) + **EMENDA E1** +
**EMENDA E2**, ambas apenso append-only, ambas de identidade distinta.

**A E1 corrigiu o próprio plano três vezes, por medição:** o corpo dizia *"ciclo 5 tem UMA migration"* (tem
**duas**); dizia *"este bloco = ZERO migration → zero colisão"* (essa linha morreu); e o §3.10 dizia que o
instrumento era o **seed** (é **migração** — produção nunca semeia). Mediu a colisão com o ciclo 5 em
cluster descartável **com a mesma versão do prisma CLI do repo**: pendentes fora de ordem aplicam `ec=0`.

**A E2 decidiu uma questão de contrato pela FONTE:** `RBAC_MATRIX.md:45` dá a `field_technician`
`execute/update-assigned` — o poder de update **já era escopado à OS atribuída**, por escrito, na fonte que
o §5 congela. Logo o guard **cumpre** a matriz; o **`200` antigo é que a contrariava**, porque o arranjo do
teste nunca atribuía a OS. **O defeito era do arranjo.** A E2 **superou o E3.4 da E1** e mandou reverter a
mudança de asserção já entregue.

## 4 · A regra-mãe da prova: VERMELHO-CONTROLE em todos

Nenhuma correção foi aceita por "ficou verde". O §2.5 do plano mediu: **detecção-base = 0**. O que ficou
vermelho na base, por item — **re-execute o que quiser; os comandos estão nos diários**:

| Sonda | Vermelho na base |
|---|---|
| permissão | `technician` recebia **200** no approve |
| SoD | autoaprovação retornava **200** |
| escopo por objeto | técnico A mutava OS de B com **200** |
| lockout anônimo | **12 falhas anônimas não moviam `failed_attempts`** |
| rate-limit | `401 !== 429` nas duas vias |
| pino KDF | base **derivava com `N=2`** vindo do dado |
| arranjo do sticky | `403 !== 409` na l.620 |

## 5 · O que cada cadeira julga (mandato ≤3 itens — **P4**)

### C1 — `jurado-b07a-autorizacao-e-alcada` · **VETO**
1. **A permissão está distribuída certo?** `work_orders:approve` concedida a `manager` e `tenant_admin`
   (+ herança de plataforma); **negada** a technician, field_technician, operator, field_dispatcher,
   auditor, support. **Confira contra `RBAC_MATRIX.md`**, não contra o plano — a matriz é fonte de verdade
   §A1 e o §5 a congela. GET pending/detail seguem em `work_orders:read`. **Prove por mutação**, não por
   leitura: conceda a chave a um papel que não devia tê-la e meça a rota abrir.
2. **SoD e escopo por objeto valem COMO ENUNCIADOS?** `403 APPROVAL_SELF_DECISION` em approve **e**
   reject; `403 WORK_ORDER_NOT_ASSIGNED` (**não 404** — 404 segue reservado a cross-tenant) quando o ator
   só alcança a OS por papel de campo. **A regra nasce no SERVICE?** Ataque pelas **rotas HTTP reais**, não
   só pelo serviço. Caso do **ator com dois papéis** (união de papéis — quem tem papel de gestão não cai no
   guard): existe e passa?
3. **O P0 fecha de verdade, ou fecha pela metade?** `Ω6R-SEC-002` diz *"Técnico A não altera OS de B"*,
   **sem ressalva de campo inócuo**. Procure o caminho que sobrou: outro verbo, outra rota, outro campo,
   outro papel de campo. **Se você achar uma via aberta, o bloco não fecha o P0.**

### C2 — `jurado-b07a-auth-e-kdf` · **VETO**
1. **O lockout anônimo reusa, não reinventa.** O plano **proíbe** contador novo e read-modify-write novo:
   tem de ser o **mesmo `incrementFailedAttempts` atômico do B01**. Confira no diff. **Armadilha medida e
   que te atinge:** essa linha existe **DUAS vezes** no arquivo (l.152 = caminho **direcionado** do B01,
   intocável; l.261 = o anônimo) e são **byte-a-byte idênticas** — medição por texto simples pega a errada.
2. **O anti-enumeração do B01 sobreviveu?** A resposta anônima tem de seguir **401 uniforme**: o **423
   NUNCA** pode vazar no caminho anônimo. E o **trade-off que o plano mandou trazer à junta, e que é
   VOSSO para decidir:** armar lockout por via anônima cria **vetor de negação de acesso à conta**.
   Mitigações medidas: TTL 15 min, balde por e-mail, rastro auditável. A alternativa (não armar) mantém
   **força bruta ilimitada sem rastro**, que é o achado. **Decidam com o trade-off à vista.**
3. **O pino KDF, e a DIVERGÊNCIA DE MÉTODO que o orquestrador aceitou e vos devolve.**
   `parseScryptHash` aceita só N=16384/r=8/p=1. **Mas:** o §4 do plano pedia **espião de scrypt**; a prova
   saiu por **testemunha de efeito**, porque o espião exigiria **alargar `password.service.ts` só para o
   arnês** — a classe exata do `SAN2-4b`. Registrado em
   `D-DIVERGENCIA-B07A-A3-METODO-DA-PROVA` (`controle/pendencias.md`). **Validem ou reprovem:** a
   testemunha é **≥** o espião em poder de detecção, ou há caminho que só o contador pegaria?

### C3 — `jurado-b07a-migracao-escopo-registro` · **VETO**
1. **A migração.** Aditiva e idempotente (`ON CONFLICT DO NOTHING` nas duas pontas)? Distribuição **no
   banco** correta (`super_admin`, `tenant_admin`, `manager` — `platform_admin` **não existe como role no
   banco**)? Runbook de `down` no cabeçalho, na ordem que a FK exige? **Os DOIS guards de paridade verdes
   e RODANDO, não `skipped`** — um guard que pula não é guard. **Aplique-a em cluster descartável seu** e
   confira o efeito, não a intenção. **Armadilha medida:** editar migração **já aplicada** é **no-op
   silencioso** — o deploy não re-aplica e não acusa checksum.
2. **Disciplina de escopo, com DUAS emendas em jogo.** O diff cabe no §5 **como emendado** por E1 e E2 —
   nada além dos 4 caminhos nominais da E1 e das 4 edições nominais da E2? **O PROIBIDO ficou intocado**:
   `.github/`, `frontend/`, `mobile/`, `CLAUDE.md`/`AGENTS.md`, `RBAC_MATRIX.md`, lockfiles, `scripts/`, e
   **os 8 arquivos de teste do ciclo 5** (que roda **em paralelo, no Codex, com UMA tentativa** — colisão
   aqui custa a tentativa dele). **Prove por mutação**, não por diff vazio.
3. **O registro diz o que a execução diz?** KPI com **contagem de execução real** e **§C3.3 nas métricas
   não exercidas** (frontend_smoke, flutter) — **na mesma forma literal em todas**, que foi achado no
   `J-SAN2-6`. `mvp_*` intocados. **Backfill do #368** (`pr 368` · `f895dd2` · `approved_head d90fbbb`) com
   a razão transcrita. `blocks_completed` 157→158. Índice **regenerado pelo gerador**, placar conferido.
   E a `description` da entrada 152 **inventaria o PR inteiro** — foi a omissão disso que rendeu ao #368 um
   achado **alta** de duas cadeiras independentes.

## 6 · O que vai à junta DECLARADO, não resolvido por baixo do pano

1. **`D-DIVERGENCIA-B07A-A3-METODO-DA-PROVA`** — item 3 da C2.
2. **A tensão sobre a semântica de `assigned_operator_id`** (E1/E4): atribuição por user id grava id que
   não é de perfil → **atribuído legítimo pode receber 403**. A E2 diz que o escopo por objeto **amplia** o
   alcance dessa tensão. **É vossa para decidir**, e o orquestrador não a resolveu.
3. **O que se PERDE com o escopo por objeto**, dito pela E2: técnico **não atribuído** perde **toda**
   mutação, inclusive a inócua; o fluxo *"editar antes de ser formalmente atribuído"* vira 403.
   **É fail-closed** — recusa a mais, nunca permissão a mais.
4. **Residuais com dono:** `P-O6R-B07-RATE-LIMIT-DISTRIBUIDO` (fecho multi-réplica via Redis; proxy/XFF é
   decisão de infra), `P-O6R-B07-APPROVAL-BY-POLICY` (finance/inventory só quando existir política de valor
   ancorada — hoje o agregado **não tem campo de valor**).

## 7 · Protocolo obrigatório (§C7.7 — P1…P6, inline no `CLAUDE.md`)

```
Após CADA item: apense a votos/O6R-07a/<NN>-<cadeira>-evidencia.md
  -> comando executado · saída resumida · veredito parcial.                       [P1]
O arquivo NASCE como esqueleto com os 3 itens em EM APURAÇÃO, e cada um é
  gravado AO SER MEDIDO. Item grande também se fatia.        [P2, emenda voto-esqueleto]
ANTES da mensagem final: escreva votos/O6R-07a/<NN>-<cadeira>-voto.json.
  Mensagem final = 1 LINHA apontando o arquivo.                                   [P2]
Máximo 3 itens. Logs longos só no arquivo de evidência.                           [P4]
Se você substitui um caído: re-execute cada comando do -evidencia.md dele e
  compare, depois meça a cauda. Conclusão sem comando registrado NÃO é insumo.    [P3]
```

**Voto** (`.json`): `cadeira` · `veredito` · `head_julgado` · `achados[]` com `id`, `gravidade`
(`bloqueia`|`alta`|`media`|`baixa`|`nota`) e **`escopo`** (`dentro-do-bloco`|`pre-existente`) **com
evidência de data ou origem** — §C7.1-ter(a): **escopo sem evidência é tratado como `dentro-do-bloco`**.
`pre-existente` **não reprova**: vira pendência nomeada com bloco dono.
**"Não consigo medir" = REPROVADO.** Você **não propõe correção** (§C7.4-bis).

## 8 · Inelegibilidade (confira por nome)

Não pode votar quem participou deste bloco: `planejador-mestre` (corpo, E1, E2), `dev-o6r07a-autorizacao`,
`dev-o6r07a-provisionamento`, `dev-o6r07a-auth-residuais`, `dev-o6r07a-auth-provas`,
`dev-o6r07a-arranjo-sticky`, `dev-o6r07a-kpi-registros`. **E as 8 identidades reservadas ao ciclo 5**
(`.claude/agents/especialistas/`: `jurado-c5-*`, `critico-c5-*`, `suplente-critico-c5-*`) —
**queimá-las aqui custaria a tentativa única do `B-O6R-02`, que roda AGORA em paralelo.**

## 9 · Banco e terreno

**A base viva `erp-postgres` (5432) e `erp-redis` (6379) é INTOCÁVEL — nem leitura.** Cada cadeira que
precisar de banco sobe **cluster descartável próprio**; **meça as portas** (`docker ps` +
`netsh interface ipv4 show excludedportrange protocol=tcp`) — as faixas do Hyper-V **rotacionam a cada
boot**, e o Codex roda em paralelo nesta máquina. **Nunca 55432.** Derrube o que subir (§C5).
**Nunca** junction/symlink de `node_modules`. **Nada de `git reset`/`checkout -- .`/`stash`/`rm` de lock/
`gc`/`prune`/`pack-refs`/`--force`** — o Codex usa o mesmo `.git`; erro de `.lock` = espere e repita.

## 10 · Armadilhas de máquina (medidas nesta rodada; ignorá-las fabrica achado falso)

1. `grep -c $'\r'` **não conta CR** — use `tr -cd '\r' | wc -c`.
2. `md5sum` e `git status` **mentem** sob `core.autocrlf=true` — meça eol-neutro ou sobre o blob.
3. `sed -i`/`perl -i` **convertem EOL em massa** disfarçado de edição. `pendencias.md` tem **EOL misto**
   (5.689 linhas / 5.654 CR).
4. `git checkout -- <arq>` **re-materializa CRLF** mesmo com blob LF (medido: 0 → 1.301 CR).
5. **`git archive`+`tar` PROIBIDO** para medir conteúdo de commit — use `git show` do blob.
6. **Heredoc com aspas QUEBRA** neste arnês — escreva arquivos com `Write`.
7. **Backtick em string de shell vira substituição de comando** — nesta branch já comeu um trecho de
   mensagem de commit.
8. **`Edit`/`Write` recebem CAMINHO ABSOLUTO e NÃO herdam o `cd` do Bash** — um dev editou a árvore
   principal por engano exatamente assim, porque a âncora era idêntica nas duas versões.
9. `$!` não é o PID do Windows.
10. `frontend/node_modules` **não existe** neste worktree por padrão — `npm --prefix frontend run check`
    dá erro de módulo **sem** um `npm ci` antes. É ambiente, não regressão.

## 11 · Histórico do bloco que a junta deve conhecer

**Uma queda de agente** (`server_error`), em `votos/O6R-07a/00-quedas.md`: o dev de auth morreu
**restaurando a correção depois do vermelho-controle**. O código sobreviveu; **as provas não**, porque ele
**mediu sem gravar** — e as três foram **refeitas do zero** por um sucessor que escreveu **zero linha de
produção**. O `00-quedas.md` tem uma **errata do orquestrador** contra si mesmo.

**Dois devs PARARAM e devolveram** ao encontrar arquivo fora do escopo, em vez de contornar — um deles com
o SQL da migração escrito na evidência e **o arquivo não gravado**.

**Separação de papéis (§C7.4-bis) em quatro voltas:** quem achou não emendou; quem emendou não codou; quem
codou não rejulgou. Os diários estão em `agent-orchestration/omega/juntas/votos/O6R-07a/`.

---

## ERRATA (orquestrador, após a inspeção de terreno) — duas defasagens minhas, achadas pelo inspetor

**E-1 · O head do cabeçalho está DEFASADO em 1 commit.** O cabeçalho diz `7c248c9`; o head real do PR e do
worktree é **`e9a9caa`**, e o delta é **exatamente este briefing** (+206 linhas, 1 arquivo). Causa: escrevi
o briefing citando o head vigente e **commitei o briefing em seguida**, movendo a branch.
**As cadeiras registram `head_julgado = e9a9caa`.** Todo número de diff de **código** vale idêntico nos
dois heads (o inspetor conferiu: blob do plano idêntico, numstat de código igual).
**É a QUARTA vez nesta sessão que passo head defasado a um agente** — e a quarta em que um agente me
corrige. A prática que já vale para os mandatos: **não citar head; mandar medir.** O cabeçalho de briefing
ainda escapava dessa regra; passa a não escapar.

**E-2 · A armadilha 10 do §10 está MORTA.** Ela diz que `frontend/node_modules` não existe neste worktree e
que o check falha sem `npm ci`. **Verdade quando escrevi; falsa agora** — eu mesmo rodei `npm --prefix
frontend ci` ao fechar a bateria, e o inspetor mediu: `check` e `build` passam com `ec=0` **sem** `npm ci`.
**Consequência para o voto: nenhuma cadeira pode declarar item de frontend "não medido por ambiente".**
Se rodar vermelho para você, é achado — não é o ambiente.

**E-3 · Precisão sobre a ressalva R2 do inspetor, que eu devo à junta.** Ele registra "mutação viva na
árvore principal" para `planejador-mestre.md`, `porteiro-pos-merge.md` e `scripts/sync-agent-agents.mjs`.
A conduta que ele prescreve (**nenhum jurado escreve na árvore principal**) está **certa e vale**. Mas a
caracterização merece precisão, porque **a mesma premissa já foi falsa uma vez nesta rodada**: em 02/09,
no `SAN2-6`, um inspetor leu esse mesmo ` M` como mutação viva, e o **porteiro do #368 mediu depois** que
os três arquivos são **byte-idênticos ao HEAD eol-neutro** (sha256 iguais par a par, `git diff --numstat`
vazio, `core.filemode=false`). É **stat-cache preso sob `core.autocrlf=true`**, não edição.
**Para a junta:** trate R2 como **regra de conduta** (não escreva lá), **não** como fato sobre o conteúdo.
Se alguma cadeira precisar afirmar algo sobre esses arquivos, **meça eol-neutro** antes.

**R4 permanece integralmente:** portas rotacionam por boot; **re-meça** antes de subir cluster. Ocupadas na
medição do inspetor: `5432`/`6379` (base viva, **intocável**) e `32769`/`32770` (**cluster do ciclo 5, que
roda AGORA no Codex — intocável**). `55432` proibida por regra. Drill de mutação **nunca** no `b07`:
worktree próprio a partir de `e9a9caa`, `npm ci` próprio, remoção só por `git worktree remove --force`.
O caminho `agent-af6ea607f3ddf8efd` **não aparece em comando de jurado**.
