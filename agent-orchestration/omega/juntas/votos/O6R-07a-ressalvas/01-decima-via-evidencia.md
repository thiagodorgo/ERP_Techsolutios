# 01 — `jurado-r07a-decima-via` (cadeira C1) · PR #373 (`B-O6R-07a`, ressalvas R1+R2) · EVIDÊNCIA

> Identidade nova. Julgo o mérito; não proponho correção (§C7.4-bis). Não commito.
> Evidência gravada **ao medir**, item N antes do N+1. 2026-09-05.

## 0 · Âncoras medidas por mim

| o quê | comando | saída |
|---|---|---|
| head julgado | `git rev-parse HEAD` | **`533cefd14dd69e0f63bdc480a0674c1aa38676b1`** |
| branch | `git branch --show-current` | `chore/o6r07a-ressalvas` |
| base real | `git rev-parse origin/main` | **`3c29189351541e082d218ff510a7bc4de174776a`** |
| merge-base | `git merge-base origin/main HEAD` | `cae6086` |
| merge limpo? | `git merge-tree --write-tree origin/main HEAD` | `ec=0`, tree `ca4bda8d` — **sem conflito** |

**DESVIO DE ÂNCORA (nota, não achado contra o PR):** o corpo do briefing diz base `cae6086`; a
ERRATA E-1 corrige para `1a7ad4d`; **eu meço `3c29189`** — o **#376** mergeou depois da errata. A base
moveu **três vezes** (`cae6086` → `1a7ad4d` → `3c29189`). O merge continua limpo contra a `main` de agora,
então o desvio não afeta o mérito; registro para a ata.

**HEAD tambem moveu:** o inspetor mediu `039c2dc`; eu meço `533cefd` — o commit da própria ERRATA
(`docs(junta): errata do briefing…`), que também versionou os 2 arquivos do inspetor. Diff medido por mim
contra `origin/main` (`git diff --numstat origin/main...HEAD`), **7 arquivos**:

```
 5   5  Kpis/kpis-history.json
30   0  agent-orchestration/controle/pendencias.md
127  0  agent-orchestration/omega/juntas/BRIEFING-O6R-07a-ressalvas.md
63   0  .../votos/O6R-07a-ressalvas/00a-inspetor-evidencia.md
34   0  .../votos/O6R-07a-ressalvas/00a-inspetor-parecer.md
184  0  .../votos/O6R-07a/00c-porteiro-pos-merge-369.md
32  32  docs/revisoes/O6R/achados.jsonl
```

Os **3 de registro** batem com o §2 do briefing (`5/5`, `30/0`, `32/32`). Os outros 4 são docs de
governança inertes (a errata E-4 previa 5; hoje são 7 pelo commit da errata). **Zero `src/`, zero
`tests/`, zero `prisma/`.** (O escopo é matéria da C3; anoto só porque muda a âncora dela.)

---

## J1 — `componentes_abertos` 9 → 10, e a entrada nova é honesta? · **CONFORME**

### J1.1 · O número foi mesmo de 9 para 10

Parse do **blob** (não do worktree) nas duas pontas, com
`node scratchpad/r07a-c1-sec002.mjs`:

| ponta | `total_linhas_jsonl` | `componentes_abertos.length` |
|---|---|---|
| `origin/main` (`3c29189`) | 32 | **9** (todas `string`) |
| `HEAD` (`533cefd`) | 32 | **10** (9 `string` + 1 **objeto**) |

### J1.2 · A entrada nova, verbatim do blob do head

```json
{
 "via": "POST /api/v1/mobile/sync/work-order-actions  {work_order.mileage}",
 "efeito": "tecnico NAO atribuido escreve quilometragem em OS ALHEIA — HTTP 200, summary {received 1, accepted 1, rejected 0}; km null -> 111111/222222",
 "forma": "execucao",
 "causa": "superficie de SYNC MOBILE — caminho de escrita paralelo aos routers de OS, com fila offline e replay",
 "origem": "eed6240 (2026-07-17, PR #197)",
 "escopo": "pre-existente",
 "achado_por": "cadeira C1-v2 da junta do ciclo 2 do B-O6R-07a (S-A1), por ATAQUE HTTP; re-confirmado independentemente pelo porteiro pos-merge do #369 (drill proprio, item G1.8)"
}
```

Endpoint ✔ · campo `work_order.mileage` ✔ · `forma: execucao` ✔ · origem `eed6240 (2026-07-17, #197)` ✔ ·
`escopo: pre-existente` ✔ — todos os campos que o mandato exige estão presentes.

### J1.3 · A origem, conferida por `git log`/`git show` (não pelo texto) — **VERDADEIRA**

```
$ git log -1 --format='%H%n%ad%n%an%n%s' --date=iso eed6240
eed62405d7f0e13df113a1f2fb0a419e4d0df1be
2026-07-17 14:17:26 -0300
thiagodorgo
feat(work-orders): Ω3F-7a — quilometragem (app preenche, base corrige) (#197)
```

- **Data bate:** 2026-07-17. **PR bate:** o assunto do squash termina em `(#197)`.
- **E o commit é mesmo a causa**, não só um vizinho de data: `git show --stat eed6240` lista
  `src/modules/mobile/mobile-work-order-sync.ts | 19 +` — a superfície nomeada. O corpo do próprio
  commit descreve o mecanismo e o gate:
  > *"Sync do app: ação `work_order.mileage` (**work_orders:status** — técnico de campo tem; a base é
  > quem corrige) → source='app'."*

  Isto **corrobora** a via: a chave que abre o caminho é `work_orders:status`, que o técnico de campo
  porta — e o `escopo: pre-existente` está **evidenciado por data e origem** (§C7.1-ter(a)): a via
  nasceu em 2026-07-17, ~7 semanas antes deste bloco.

### J1.4 · Contraprova — o PR mexeu em mais alguma coisa do razão de achados?

`node scratchpad/r07a-c1-diff9.mjs` (base × head, campo a campo do `SEC-002`):

```
entradas 0..8 comparadas; divergentes=0
supersedido.componentes_abertos :: MUDOU   (9 -> 10, só o índice [9] é novo)
supersedido.contagem_aberta     :: MUDOU
supersedido.ressalva_r1         :: MUDOU   (campo NOVO)
supersedido.{por,componente_superado,pendencia_dona,verificado_em} :: IGUAL
topo.{id,severidade,categoria,modulo,lente,local,descricao,evidencia,impacto,
      correcao,teste,confianca,status,votacao,fase_descoberta} :: IGUAL
```

**As 9 vias antigas são byte-idênticas**; nada foi reescrito por baixo. `status` continua
`parcialmente_superado` e `severidade` continua `P0` — o PR **não** afrouxou o achado.

**J1 = CONFORME.** Nenhum achado.

---

## J2 — O efeito declarado é verdadeiro? · **REPRODUZ — 3/3** (item central)

### J2.0 · Terreno, medido antes de executar (vinculante, R4 do inspetor)

| exigência | comando | medido |
|---|---|---|
| worktree próprio, nome com `r07a`, sob `.claude/worktrees/` | `pwd` | `/c/.../.claude/worktrees/r07a` ✔ |
| sem `.env` | `ls -la .env` | `No such file or directory` ✔ |
| `CORE_SAAS_PERSISTENCE` não exportada | `echo "[${CORE_SAAS_PERSISTENCE}]"` | `[]` ✔ |
| pacotes resolvem (a lição do `ERR_MODULE_NOT_FOUND dotenv`) | `ls -d node_modules` / `ls -d ../../../node_modules/dotenv` | local **ausente**; resolve por **subida** para a árvore principal ✔ |
| junction? | — | **nenhuma criada**; nada de `npm ci` novo, nada de link ✔ |
| banco/porta/container | arnês `CORE_SAAS_PERSISTENCE=memory` fixado **dentro** do drill | **zero porta fixa, zero container, base viva não tocada** ✔ |

Drill escrito **por mim** a partir do roteiro registrado (§S4 da C1-v2 + G1.8 do porteiro), em
`tests/zz-r07a-c1-drill.test.ts` — **untracked e não commitado** (confirmado no fecho).

### J2.1 · A medição — `node --test --import tsx tests/zz-r07a-c1-drill.test.ts`, **N=3**

Saída **verbatim** da execução 1 (as 3 execuções deram linha por linha o mesmo; `ec=0` nas três):

```
# [C1] km ANTES  : {"start":null,"end":null,"source":null}
# [C1] RESPOSTA : 200 {"received":1,"accepted":1,"rejected":0,"conflicts":0,"already_applied":0}
# [C1] rejected : []
# [C1] km DEPOIS: {"start":111111,"end":222222,"source":"app"}
ok 1 - R07A-C1 · DECIMA VIA — tecnico nao atribuido escreve km em OS alheia pela via de sync
# tests 3 · pass 3 · fail 0 · skipped 0   (ec=0)
```

**Arranjo:** OS criada pelo `manager` e **atribuída ao perfil do técnico B**
(`POST /work-orders/:id/assign {operatorId: perfilB}`); ator do ataque = **técnico A**
(`x-role: field_technician`, user id próprio, **não atribuído**), mesma organização.

**Confronto declaração × medição, campo a campo:**

| o registro publica | eu medi | bate? |
|---|---|---|
| `HTTP 200` | `200` | ✔ |
| `summary {received 1, accepted 1, rejected 0}` | `received 1 · accepted 1 · rejected 0` | ✔ |
| `km null -> 111111/222222` | `{null,null,null}` → `{111111, 222222, "app"}` | ✔ |
| "escreve km em OS **alheia**" | a OS lida de volta pela gestão está mutada | ✔ |

> **Nota de método (por que uma asserção minha falhou na 1ª tentativa e isso NÃO é achado):** eu
> comparei o `summary` por igualdade profunda e o objeto real traz **dois campos a mais**
> (`conflicts: 0`, `already_applied: 0`). Isso mede o **meu** enunciado, não o do registro — que
> nomeia três campos e os três batem. Corrigi para asserir os três campos nomeados. Registro o
> tropeço porque ele é a diferença entre "o registro mente" e "o jurado escreveu a asserção errada".

### J2.2 · Controles na MESMA execução — é isto que o separa de falso-positivo

```
# [C1] ctrl PATCH /:id/mileage : 403 {"code":"FORBIDDEN","reason":"permission_required",
       "message":"One of these permissions is required: work_orders:mileage_correct."}
# [C1] ctrl sync status_change : 200 summary{accepted 0, rejected 1} ·
       rejected[0].error {"code":"WORK_ORDER_NOT_ASSIGNED","reason":"not_assigned_to_actor"}
# [C1] ctrl sync CROSS-TENANT  : 200 summary{accepted 0, rejected 1} ·
       rejected[0].error {"code":"WORK_ORDER_NOT_FOUND","reason":"not_found"}
# [C1] ctrl PROPRIA (positivo) : 200 summary{received 1, accepted 1, rejected 0}
```

1. **A rota do censo recusa a mesma mutação** (`403 permission_required`, chave dedicada
   `work_orders:mileage_correct`) — a assimetria porta-da-frente × porta-lateral é **real**.
2. **O guard DESTE bloco alcança a via de sync** (`status_change` → `not_assigned_to_actor`): a
   superfície **não** é inalcançável por desenho; é `setMileage` que não chama o guard.
3. **Cross-tenant continua 404** — o achado não é vazamento de organização; é escopo por objeto
   **dentro** da mesma organização.
4. **Controle positivo:** o técnico **atribuído** escreve na **própria** OS pela mesma via
   (`accepted 1`). Sem ele, um "recusa tudo" passaria nos negativos.

### J2.3 · A causa, medida no produto (não inferida do texto)

```
# [C1] call sites de assertMutationObjectScope: [852,1319]
# [C1] setMileage declarado na linha: 1247
```

Duas chamadas do guard (`update` l.852, `changeStatus` l.1319); **`setMileage` não é uma delas**. E
o gate da ação de sync, lido em `src/modules/mobile/mobile-work-order-sync.ts:245-258`, é
`requireActionPermission(actor, action, "work_orders:status")` — chave que o técnico de campo
**porta**. A explicação registrada bate com o código.

**J2 = O EFEITO DECLARADO É VERDADEIRO.** O registro **não** publica execução que não ocorre — que
era a classe-mãe que este item existia para caçar. Nenhum achado.

## J3 — A `contagem_aberta` desarma o número, e os dois artefatos concordam? · **CONFORME**, com 2 notas

### J3.0 · ARMADILHA QUE QUASE ME PEGOU — registro porque é a lição de método

Meu **primeiro** comando foi `git diff origin/main HEAD -- …/pendencias.md` (**dois pontos**). Ele
mostrou o PR **REMOVENDO** blocos inteiros de `pendencias.md` — inclusive duas linhas de status
`ABERTA` acrescentadas pelo #375 e a nota de fechamento do `P-O6R-B02-…`. Lido de afogadilho, isso
seria um **achado gravíssimo** ("o PR apaga registro alheio"). **É artefato do meu comando:** a `main`
andou (#374/#375/#376) depois do merge-base, e o dois-pontos exibe o avanço da `main` como remoção.
O que **este PR** faz mede-se em **três pontos** (contra o merge-base `cae6086`):

```
$ git diff --numstat origin/main...HEAD -- agent-orchestration/controle/pendencias.md
30      0      agent-orchestration/controle/pendencias.md      <- puramente ADITIVO
```

Registro isto porque a errata E-3 avisou de **uma** armadilha de fabricação de achado falso (contar
CR no worktree); esta é uma **segunda**, da mesma família, e não estava escrita em lugar nenhum.

### J3.1 · Onde o apenso caiu (medido no blob, não no worktree)

```
$ git show HEAD:…/pendencias.md | grep -n '^## ' | awk -F: '$1<6389' | tail -2
6312:## P-O6R-SUBRECURSO-OBJECT-SCOPE (registro 2/7, 2026-09-03) — 9 rotas mutantes … — **ALTA**
```

O apenso ocupa as linhas **6359-6388**, **dentro** da `P-O6R-SUBRECURSO-OBJECT-SCOPE` (6312 → 6389).
É a **pendência dona** nomeada no campo `pendencia_dona` do achado. ✔

**EOL medido no BLOB** (errata E-3), com `git show … | cat -A`: as linhas do apenso terminam em `$`,
**zero `^M`**. Contagem programática sobre o diff: **`CR nas linhas adicionadas = 0`**. *(No worktree
o mesmo arquivo tem 6.527 CR por `autocrlf` — medir ali "acharia" injeção inexistente.)*

### J3.2 · A `contagem_aberta` desarma o número? — **SIM, nos três pontos exigidos**

Texto no blob do head, verbatim:

> `"10 vias: 9 rotas mutantes dos DOIS ROUTERS de OS (3 execucao · 4 leitura · 2 env) + 1 via na
> superficie de SYNC MOBILE (execucao). ATENCAO: o numero NAO e exaustivo — mede o que os routers de
> OS e o sync expoem, nao \"tudo que o tecnico nao atribuido alcanca\". O B-O6R-07c CENSA a
> superficie de sync antes de declarar este P0 fechado."`

| exigência do mandato | está lá? |
|---|---|
| dizer que o "9" media **o que dois routers expõem** | ✔ *"9 rotas mutantes dos **DOIS ROUTERS** de OS"* |
| **negar** *"tudo que o técnico não atribuído alcança"* | ✔ negado **verbatim e entre aspas** |
| tornar **vinculante** o censo do sync pelo `07c` antes de fechar o P0 | ✔ *"O `B-O6R-07c` **CENSA** a superfície de sync **antes de declarar este P0 fechado**"* — presente do indicativo, obrigação, não sugestão |

Comparo com o texto **anterior** (blob de `origin/main`), que abria *"**9 rotas mutantes alcançáveis
pelo técnico sobre OS alheia**"* — número **sem qualificador na abertura**, exatamente o defeito que
a C1-v2 nomeou. O novo texto põe o qualificador **antes** do número e o `ATENCAO` logo em seguida.

### J3.3 · Paridade entre os DOIS artefatos — **concordam em 6/6**

| afirmação | `achados.jsonl` (entrada [9]) | apenso em `pendencias.md` | bate? |
|---|---|---|---|
| via | `POST /api/v1/mobile/sync/work-order-actions {work_order.mileage}` | idem, na tabela | ✔ |
| efeito | HTTP 200 · `{received 1, accepted 1, rejected 0}` · km `null → 111111/222222` | idem, verbatim | ✔ |
| forma | `execucao` | **execução** | ✔ |
| escopo/origem | `pre-existente` · `eed6240 (2026-07-17, PR #197)` | `pre-existente` · `eed6240`, **2026-07-17**, PR **#197** | ✔ |
| quem achou | C1-v2 (`S-A1`) + porteiro do #369 (G1.8) | idem, com "drill próprio de 24 medições" | ✔ |
| **o vínculo para o `07c`** | *"O `B-O6R-07c` CENSA a superfície de sync antes de declarar este P0 fechado"* | *"**Item vinculante** para o plano do `B-O6R-07c`: censar a superfície de sync antes de declarar o `Ω6R-SEC-002` fechado"* | ✔ (**"este P0" = `Ω6R-SEC-002`** — mesmo sujeito) |

**Teste do mandato — "o planejador do `07c` pode ler só um":** lendo **só** o `achados.jsonl`, ele
recebe *número não exaustivo* + *censar o sync antes de fechar*. Lendo **só** o apenso, recebe *"9"
não é exaustivo* + *censar o sync antes de fechar*. **Nenhum dos dois, lido sozinho, o leva ao erro
que a ressalva R1 existe para impedir.** Não há divergência de efeito.

### J3.4 · Duas NOTAS (não reprovam; registro para a ata e para o `07c`)

**NOTA-1 · o `contagem_aberta` diz que o número "mede o que os routers de OS *e o sync* expõem"; o
apenso diz que "*nenhum censo deste bloco percorreu*" o sync.** Lidas ao pé da letra há tensão: a
superfície de sync **não** foi censada — mediu-se **uma ação** (`work_order.mileage`) por ataque, e a
própria C1-v2 declarou às claras que as demais (`checklist-actions`, `evidence-actions`,
`checklist-runs/*`) ela **só leu**. Não classifico como achado porque a frase **seguinte** ordena o
censo, e é ela que governa a conduta do `07c`: a leitura "o sync já está medido" não sobrevive à
sentença que manda medi-lo. Fica como **nota de precisão de linguagem**, `dentro-do-bloco`.

**NOTA-2 · o TÍTULO da pendência continua dizendo "9 rotas".** É o que aparece no
`pendencias-indice.md`, que é a superfície que se **escaneia**. Não é omissão: a **primeira linha** do
apenso reconcilia explicitamente — *"O título desta pendência diz '9 rotas', e as 9 são escopadas aos
dois routers… Existe uma décima"* — e não reescrever o histórico é a convenção §A2 da casa. Registro
para que o `07c` não pare no título. `dentro-do-bloco`, `nota`.

### J3.5 · Contraprova — o apenso move o placar do índice?

O apenso é **neutro** para `gerar-indice-pendencias.py`, medido, não suposto
(`scratchpad/r07a-c1-apenso.py` sobre o diff de três pontos):

```
linhas adicionadas = 30
cabecalhos "## " = 0
cabecalhos "## P-" = 0
linhas de status (regex LINHA do gerador) = 0
CR nas linhas adicionadas = 0
```

Zero cabeçalho novo (o gerador fatia por `l.startswith('## ')`, l.84) e zero linha que a regex
`LINHA` (l.45-47) leia como status. **O apenso não cria nem fecha pendência: não move o placar.**

Sub-verificação de forma, porque eu vi e conferi: o apenso termina **sem linha em branco** antes do
`## P-AUTH-KDF-ROTACAO-V2` (confirmado no blob com `cat -A`). **Não quebra o gerador** — a detecção é
`startswith('## ')` por linha, sem exigência de linha em branco anterior — e o cabeçalho seguinte
continua sendo contado. Fica como observação de forma, sem efeito medido. *(A neutralidade na árvore
mesclada e o placar `pendencias-indice.md` são item da cadeira C3; meço aqui só o que toca o número
que eu julgo.)*

**J3 = CONFORME.** Nenhum achado; 2 notas.

---

## Veredito da cadeira

**APROVADO.** Os três itens do meu mandato passam por execução e por medição em blob:

- **J1** — 9 → 10 confirmado no blob; a entrada nova traz `via/efeito/forma/causa/origem/escopo/
  achado_por`; a origem `eed6240 (2026-07-17, #197)` **confere no `git log` e no `git show`** (o
  commit criou a própria ação de sync); e as 9 vias antigas + 15 campos de topo do achado ficaram
  **byte-idênticos** — nada foi afrouxado por baixo.
- **J2** (central) — **o efeito declarado É verdadeiro**, reproduzido **3/3** em drill próprio, com
  4 controles na mesma execução e a causa medida no produto (guard com 2 call sites, `setMileage`
  fora deles). **O registro não publica execução que não ocorre.**
- **J3** — a `contagem_aberta` desarma o número nos três pontos exigidos e os dois artefatos
  **concordam em 6/6**; o apenso está na pendência dona e é **neutro** para o índice.

Nenhum achado `bloqueia`. Duas notas, ambas `dentro-do-bloco`, ambas sem efeito medido sobre a
conduta do `B-O6R-07c`.

---

## Limpeza (1 linha)

Removidos: `tests/zz-r07a-c1-drill.test.ts` (drill, **nunca commitado**) e os 5 temporários
`r07a-*` do scratchpad compartilhado; **zero worktree criado**, zero container, zero porta fixa, base
viva `erp-postgres`/`erp-redis` **não lida**; **nenhum arquivo de nome alheio tocado**
(`o6r-b02-cond5`, `gov-descuido`, `san2-r` e os 11 arquivos de agentes da árvore principal ficam como
estavam — resíduo alheio se reporta, não se varre). Ficam meus 2 untracked desta cadeira
(`01-decima-via-evidencia.md`, `01-decima-via-voto.json`).
