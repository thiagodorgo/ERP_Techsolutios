# J-O6R-07a — ata da junta do bloco `B-O6R-07a`, **CICLO 1** (PR #369)

> **Quórum: UNANIMIDADE DE 3** (§C7.1-ter(b) — o bloco toca **segurança e permissão**).
> **Head julgado:** `fb6618b` (C1 e C3) · a C2 abriu em `fb6618b` e fechou em `abb0cbd`, **medindo e
> declarando** que o delta era só voto de junta (`git diff --name-only -- src/ tests/ prisma/` **vazio**).
> **Base:** `origin/main` = `f895dd2` · **CI: 7/7** · **Terreno:** `LIBERADO COM RESSALVA` (R1–R4).
> **Quedas de agente: ZERO.** **Votos perdidos: ZERO.**

## Votos

| Cadeira | Veredito | Achados |
|---|---|---|
| **C1 — `jurado-b07a-autorizacao-e-alcada`** (VETO) | **REPROVADO** | 1 `bloqueia` · 3 `alta` |
| **C2 — `jurado-b07a-auth-e-kdf`** (VETO) | **REPROVADO** | 1 `bloqueia` · 1 `pre-existente` · 2 `nota` |
| **C3 — `jurado-b07a-migracao-escopo-registro`** (VETO) | **APROVADO** | 2 `baixa` · 4 `nota` |

**RESULTADO: REPROVADO 2×1.** O quórum exigia unanimidade; dois vetos foram exercidos.
**Este é o CICLO 1. O ciclo 2 é a ÚLTIMA tentativa** (`D-TETO-DOIS-CICLOS` — reprovou no ciclo 2,
**para**, e vira **dossiê ao dono**; não há ciclo 3).

---

## Os dois `bloqueia`

### `C1-A1` — o P0 é declarado **fechado** enquanto segue aberto

O guard de escopo por objeto tem **2 call sites** (`WorkOrderService.update` e `changeStatus`) num módulo
de **14 rotas mutantes**. Um `field_technician`, **com as chaves que ele já tem**, altera a OS de outro
técnico da mesma organização por três rotas, medidas **por efeito**:

| Rota | Resultado |
|---|---|
| `POST /work-orders/:id/attachments` | **201** |
| `DELETE /work-orders/:id/attachments/:aid` | **204** — apaga a evidência alheia, blob removido do storage |
| `POST /work-orders/:id/comments` | **201** |

Lista do anexo **antes 1 → depois 0**; download **200 → 404**.

**A imputação é precisa, e a ata a preserva porque ela é o coração do achado:** a cadeira **não** cobra do
bloco o conserto dessas rotas — elas estão fora do §5 dele e nasceram em `bf456b0`, **2026-07-13**, PR #173.
Cobra a **DECLARAÇÃO de fechamento** de um P0 que segue aberto, *"que tira o achado do razão e faz com que
ninguém volte a ele"*. O critério de aceite está escrito **no próprio achado**: *"Técnico A não altera OS de
B nem decide aprovação"* — **sem ressalva de campo inócuo**. E o flip `ativo → fechado` está **no diff deste
PR**, num arquivo do §5 **permitido** dele: por isso `dentro-do-bloco`.

### `C2-A1` — o incremento roda **por candidato**, e o uso CORRETO tranca o próprio dono

O incremento do §3.4 foi plugado **dentro de `verifyAnonymousCandidate`**, que roda **por candidato** num
laço **sem curto-circuito**. Três custos medidos por execução, **nenhum deles no trade-off que o plano
mandou a junta ratificar**:

1. **Negação de acesso autoinfligida pelo uso correto.** O dono da conta com o mesmo e-mail em duas
   organizações e senhas distintas — **exatamente o cenário para o qual esta funcionalidade existe**
   (`MAX_LOGIN_CANDIDATES=3`, `409 TENANT_SELECTION_REQUIRED`) — **tranca a si mesmo na segunda organização
   ao logar CORRETAMENTE 5× na primeira**: `{"ok":false,"reason":"locked"}` **com a senha certa**. Nenhuma
   mitigação declarada (TTL 15 min, balde por e-mail, balde por IP, rastro) alcança esse caso, **porque a
   vítima não é o atacante**.
2. **Amplificação.** 1 requisição anônima = **N** incrementos + **N** linhas de auditoria; **5 requisições
   trancam todas as organizações** sem o atacante conhecer nenhuma.
3. **Auditoria falsa.** Todo login **bem-sucedido** grava um `auth.login.failed` contra a organização irmã.

**E o arnês do PR é MONO-ORGANIZAÇÃO:** nenhum teste exerce a forma multi-org, que é onde o defeito vive.

---

## As decisões que a junta tomou, além do veredito

**Trade-off do lockout anônimo (o plano mandou a junta decidir, e ela decidiu):**
> **RATIFICO ARMAR; REPROVO ESTE ARRANJO.** *"Se a pergunta fosse só 'armar ou não', meu voto seria
> ARMAR"* — não armar mantém força bruta ilimitada e sem rastro, que é o próprio `Ω6R-SEC-003`.
> O que se reprova é **onde** o incremento foi plugado.

**Divergência `D-DIVERGENCIA-B07A-A3-METODO-DA-PROVA`: VALIDADA, com reparo obrigatório na justificativa —
e o reparo é contra o orquestrador.**
A testemunha de efeito **como entregue** (só o valor de retorno) é **estritamente mais fraca** que o espião
em **um** caminho: uma implementação que **derivasse primeiro e pinasse depois**, com N válido abaixo do
`maxmem` (ex.: 32768), devolveria `false` **sem lançar** — e só o contador veria a derivação.
A cadeira **fechou esse buraco de fora, com ZERO alteração de produção**: montou um **espião de TEMPO** em
~30 linhas — canônico **49,08 ms** × todo trio fora do pino **0,04–0,40 ms** (razão **≥120×**), inclusive o
próprio N=32768 em **0,09 ms**.
**Logo a premissa que o orquestrador aceitou — *"o espião exigiria alargar `password.service.ts`"* — é
FALSA:** era **desnecessário** por dentro, **não impossível**. A **decisão** de não alargar estava **certa**
(alargar a primitiva de senha só para o arnês é a classe do `SAN2-4b`, que este bloco existe para não
repetir); a **razão** estava errada. A ata registra a correção **porque razão errada, virando precedente,
autoriza abandonar o espião onde nenhuma testemunha externa exista**.
**Recomendação da cadeira:** emendar o §4 do plano para exigir **a propriedade com margem publicada**, não
o **mecanismo**.

---

## Os demais achados

| # | Cadeira | Grav. | Escopo | O quê |
|---|---|---|---|---|
| **C1-A2** | C1 | **alta** | `dentro-do-bloco` | A caracterização levada à junta — *"técnico não atribuído perde TODA mutação, inclusive a inócua"* — é **falsa por medição**: ele mantém anexar, **apagar anexo alheio** e comentar. **A junta ia deliberar sobre uma descrição mais forte do que a execução entrega**, e era sobre ela que o §6 item 3 do briefing pedia decisão. **Material do orquestrador** |
| **C1-A4** | C1 | **alta** | `dentro-do-bloco` | A tensão do `assigned_operator_id` é **real e operacional**: `work-order.service.ts:1670` grava `operatorId ?? userId`, então atribuir mandando `userId` — **que é o que o app Flutter faz** (`Ω6R-QUA-004`, ainda ABERTO) — escreve um id de **usuário** no campo de perfil. O técnico **legitimamente atribuído** passa a receber `403` no PATCH **e no PATCH `/status`, que é o caminho da fila offline do mobile**. Fail-closed, por isso não bloqueia; mas **trava fluxo de campo real** e o bloco **não abriu pendência própria** |
| **C1-A3** | C1 | alta | `pre-existente` (`bf456b0`, 13/07, #173) | As rotas de sub-recurso **não têm guard de objeto nem de autoria**: `assertWorkOrder()` só chama `workOrderService.get` (escopo de **tenant**), e `deleteAttachment` **não confere quem enviou** o anexo nem a quem a OS está atribuída |
| **C2-A2** | C2 | — | `pre-existente` | Rotação de parâmetros para `v=2` é **promessa sem mecanismo** |
| **C3-A1** | C3 | baixa | `pre-existente` | `Kpis/kpis-history.md` (espelho Markdown) não apensado — **mas o próprio bloco declara isso** na `description`, com evidência de origem: não esconde |
| **C3-A2** | C3 | baixa | `dentro-do-bloco` | O `§Fechamento` do diário de KPI diz *"42 arquivos"*; o distinto é **41** (`pendencias.md` contado duas vezes). **A `description` NÃO repete o erro** — o painel não publica número errado |
| **C3-A3** | C3 | nota | `dentro-do-bloco` | `Kpis/app.js` não é nominado no §5, mas a mudança é **uma linha** (`var FROZEN`) e o **§C3.0 EXIGE** essa paridade. **Regra da casa > omissão do §5** — é lacuna de redação da lista, não da entrega |
| **C3-A4 · C3-A5** | C3 | nota | — | O runbook de `down` reverte os **dados** (executado, `ec=0`), mas não avisa que `_prisma_migrations` **continua marcando a migração como aplicada**; e num banco provisionado **só** por migração, `roles` fica vazia e a migração concede **0 grants** |
| **C3-A6** | C3 | nota | — | **Auto-errata da própria cadeira**: o guard de paridade saiu vermelho e a causa **era ela**, que havia injetado uma role no próprio cluster. Derrubou o contaminado, subiu limpo, re-mediu 2/2. Vira **evidência a favor do bloco**: o guard pega deriva de papel de verdade |

---

## O que a junta confirmou que está CERTO (e provou por mutação)

- **A permissão consulta a chave, não um papel cravado.** C1 concedeu `work_orders:approve` a `technician`
  em runtime e a rota **abriu** (403 → 200 em approve e reject); restaurou e **fechou**.
- **Distribuição bate com a `RBAC_MATRIX.md`** papel a papel; negativos ampliados de 4 para **9 papéis × 2
  verbos = 18/18** em `403 permission_required`.
- **Fronteira preservada:** `403 WORK_ORDER_NOT_ASSIGNED` na mesma organização × `404 WORK_ORDER_NOT_FOUND`
  para técnico de outra — o bloco podia ter borrado e não borrou.
- **União de papéis vence:** mesmo `x-user-id` com `field_technician,manager` recebe 200; só
  `field_technician` recebe 403. A diferença é o papel, não a pessoa.
- **SoD vem ANTES do `409 already_decided`** — o solicitante não aprende o estado da pendência.
- **Auditoria da recusa na allowlist**, sem `token`/`path`/`bucket`/`storage_key`/`base64`.
- **Lockout: reuso fiel** do `UPDATE` atômico do B01, ancorado no par `l.152`/`l.261` (**as duas linhas são
  byte-idênticas**, e medir por texto simples pegaria a errada). 3 escritas novas e só; auditoria
  append-only.
- **Pino KDF provado por execução**, com vermelho-controle próprio: os trios forjados **casam senha↔hash** e
  ainda assim são recusados.
- **Migração idempotente rodando 3×**; distribuição conferida **por consulta**; runbook de `down`
  **executado**; escopo provado **por mutação** nas três pernas proibidas; índice regenerado **sha256
  idêntico**; backfill do #368 com **os dois hashes**.

---

## §C7.4-bis — separação de papéis, respondida por escrito

- **(a) A composição cobre a competência que o achado exige?** **Sim, e a prova é que as três cadeiras
  acharam coisas disjuntas** — C1 no plano de autorização, C2 no laço de candidatos, C3 no registro. Os dois
  `bloqueia` vieram de cadeiras diferentes, por caminhos diferentes, e **nenhum dos dois seria encontrado
  por releitura**: um exigiu atacar 14 rotas, o outro exigiu montar o cenário multi-organização que o arnês
  do PR não tem.
- **(b) Quem achou é quem consertou?** **Não** — as três cadeiras reportaram sem propor correção. O ciclo 2
  vai para **planejador e dev de identidades novas**, nenhuma delas jurada aqui.
- **(c) O planejador usou dado podre?** **Sim, uma vez, e a junta pegou.** O `§6 item 3` do briefing — que
  transcrevia a `EMENDA E2` — afirmava que o técnico não atribuído *"perde TODA mutação"*. **Falso por
  medição** (C1-A2). O material do orquestrador entrou na junta com uma premissa não medida, e a junta
  deliberaria sobre ela. Registrado como achado `alta`, não como nota de rodapé.

---

## O que o CICLO 2 tem de resolver (e é a última tentativa)

1. **`C1-A1`** — ou o P0 **não é declarado fechado** (e o registro diz com precisão o que fechou e o que
   resta), ou o escopo é estendido às rotas de sub-recurso — o que **exige emenda nominal ao §5**, porque
   `work-order-attachment.service.ts` e `work-order-comments/` estão fora dele.
2. **`C2-A1`** — o incremento tem de sair de dentro do laço por candidato. **Ratificado armar; reprovado
   este arranjo.** A forma nova precisa de **teste multi-organização**, que o arnês do PR não tem.
3. **`C1-A2`** — corrigir a caracterização no material do bloco (briefing/emenda), porque ela é falsa.
4. **`C1-A4`** — a tensão do `assigned_operator_id` precisa de **pendência própria com dono**, no mínimo.
5. **Reparo da justificativa da divergência A3** na `pendencias.md`, com a medição do espião de tempo.
6. Os `baixa`/`nota` de C3 — decidir quais entram e quais viram pendência nomeada.

**Ninguém que votou nesta junta participa da correção.** As cadeiras do ciclo 2 são **identidades novas**
nas duas que reprovaram (C1 e C2), como manda o `D-TETO-DOIS-CICLOS`.
