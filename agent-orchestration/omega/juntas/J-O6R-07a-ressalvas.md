# J-O6R-07a-ressalvas — ata da junta do PR #373

> **Quórum: MAIORIA DE 3** (§C7.1-ter(b)) — registro puro: **zero `src/`, zero teste, zero migration**.
> **Head julgado:** `533cefd` — as **três** cadeiras mediram o próprio.
> **Base:** `origin/main` = `3c29189` na medição de C2 e C3 — **a base moveu QUATRO vezes durante a junta**
> (#374, #375, #376 e mais um), o que matou a errata E-1 antes de a última cadeira votar.
> **Terreno:** `LIBERADO COM RESSALVA` (8 ressalvas) · **CI 7/7** · **Quedas: ZERO.**

## Votos

| Cadeira | Veredito | Achados |
|---|---|---|
| **C1 — `jurado-r07a-decima-via`** | **APROVADO** | 3 `nota` |
| **C2 — `jurado-r07a-backfill`** | **APROVADO** | 1 `media` · 1 `baixa` · 3 `nota` |
| **C3 — `jurado-r07a-escopo-guards`** | **APROVADO** | 2 `baixa` · 3 `nota` |

**RESULTADO: APROVADO 3×0.** Zero `bloqueia`.

---

## O que cada cadeira mediu por conta própria

**C1 — o efeito reproduziu, e é isso que valida o registro.** Não aceitou o texto: montou drill próprio e
mediu **3/3** — `HTTP 200`, `received 1 / accepted 1 / rejected 0`, km **`null → 111111/222222`**, com
**4 controles**. Confirmou o mecanismo: **`setMileage` está fora dos dois call sites do guard**. A origem
`eed6240` (2026-07-17, #197) bate no `git log`. A `contagem_aberta` desarma o número **nos 3 pontos**, com
**paridade 6/6** com o apenso na pendência dona.

**C2 — o item que apontava contra o orquestrador, resolvido a favor dele.**
> **"O orquestrador está certo e a ressalva R2 do porteiro estava errada no instrumento."**

`blocks_completed` é **instantâneo da autoria**; o incremento é pago pela entrada **seguinte**; e o **#372**
— que é a merge-base — **já pagou 159+160** com razão publicada. **Não cumprir a ressalva foi o certo.**
Os hashes conferem contra o git **e** contra a ata; o precedente 3/3 foi **re-executado**, não aceito; o
`null` do ciclo 1 tem a razão **dentro da própria entrada** (ata l.17, *"REPROVADO 2×1"*).

**C3 — as duas afirmações do orquestrador, medidas separadamente.**
- **(a) O apenso é NEUTRO para o placar** — `263/252`, baldes idênticos. **Confirmada.**
- **(b) "A defasagem do índice pré-existe" — MORTA.** A `main` está em **sincronia perfeita desde o #374**.
  A afirmação era verdadeira quando medida contra `cae6086` e **deixou de ser** enquanto a junta corria.
- **`achados.jsonl` sem mutação silenciosa:** 32→32, **31 de 32 idênticos por valor**, só o `Ω6R-SEC-002`
  alterado. Afirmação do orquestrador **confirmada por comparação registro a registro**.
- Escopo provado **por mutação** (`ec` 0→1→0); guards **5/5** no head e **4/4** na árvore mesclada.

---

## Os achados (nenhum bloqueia)

| # | Cadeira | Grav. | Escopo | O quê |
|---|---|---|---|---|
| **C2·J3-A1** | C2 | **media** | `pre-existente` | A entrada 153 (`B-O6R-02-ciclo5`, do #372) **grava `blocks_completed` 160 no campo enquanto a própria `description` diz 158**, e não justifica o `+2`. É registro que não acompanha o próprio número — **na entrada que existe para corrigir exatamente isso** |
| **C3·J3-A1** | C3 | baixa | `dentro-do-bloco` | Com a `main` em sincronia, o apenso de 30 linhas **desloca em +30 os números de linha** de 5 citações do índice. Não muda o placar; muda âncoras |
| **C2·J3-A2** | C2 | baixa | `dentro-do-bloco` | As **duas cláusulas da MESMA ressalva** do porteiro do #369 foram registradas de forma **assimétrica** |
| **C3·J2-N1** | C3 | baixa | `dentro-do-bloco` | A reserialização fez o numstat sair `32/32`: o diff textual **repinta as 32 linhas e esconde visualmente** qual mudou. O conteúdo está certo (C3 provou), mas o diff **não deixa ver** |
| **C1·J3-N2** | C1 | nota | `dentro-do-bloco` | **O TÍTULO da pendência dona continua dizendo "9 rotas mutantes"** — e o título é o que aparece no índice. O corpo diz 10; a vitrine diz 9 |
| **C1·J3-N1** | C1 | nota | `dentro-do-bloco` | Tensão de linguagem entre os dois artefatos sobre o que o número "mede" |
| **C2·J3-N1** | C2 | nota | `pre-existente` | **O #370 mergeou tocando dois arquivos de TESTE sem deixar entrada de KPI** — §C3 pela natureza, não pelo tamanho |
| **C3·J1-N1** | C3 | nota | `dentro-do-bloco` | O *"5 arquivos"* da errata **envelheceu para 7** no head julgado. **A errata estava certa quando escrita** |
| **C3·J3-A2 · C1·J0-N3 · C2·T1/T2** | — | nota | terreno | A base e o head **moveram durante a junta**; as cadeiras mediram os próprios e **declararam** o desvio de âncora |

---

## As três armadilhas de medição que esta junta descobriu — e é o que ela deixa de mais útil

1. **`git diff` de DOIS PONTOS em arquivo que a `main` avançou** exibe **o avanço da `main` como remoção
   pelo PR**. A C1 registrou que isso **teria fabricado um achado gravíssimo** — o PR pareceria apagar
   centenas de linhas alheias. Use **três pontos** (`base...head`).
2. **Contar CR no ARQUIVO em vez do BLOB** (errata E-3): o blob de `pendencias.md` tem **0 CR**, o worktree
   tem **6.527** por `autocrlf`. Acharia injeção de CR inexistente. **O próprio orquestrador publicou
   "CRLF preservado 6527/6527" medindo o objeto errado.**
3. **`echo ec=$?` depois de um PIPE** mede o **último** comando do pipe, não o que interessa (C3·J0-N1).

**E uma quarta, de processo:** `grep` de `blocks_completed` num JSON grande casa **dentro de `description`**
e confunde texto com campo.

---

## §C7.4-bis — separação de papéis

- **(a) Composição adequada?** **Sim.** Três cadeiras, três competências disjuntas (efeito, hashes, escopo),
  e **duas delas com mandato apontando contra o orquestrador**. As duas o **absolveram por medição**, não
  por deferência — e a C3 **matou uma afirmação dele** no processo.
- **(b) Quem achou é quem consertou?** **Não.** As cadeiras não propuseram correção. O PR é execução das
  ressalvas de um **porteiro** que não participou desta junta.
- **(c) O planejador usou dado podre?** **Sim, e foi corrigido antes do voto.** O briefing tinha **cinco**
  premissas erradas — base defasada, "3 arquivos" (eram 5, depois 7), "EOL misto" medido no objeto errado,
  "CI 7/7" antecipado, e a defasagem do índice. **O inspetor pegou as cinco; a errata as corrigiu; e a C3
  ainda matou uma delas de novo**, porque a realidade mudou entre a errata e o voto.

---

## Quedas (P6)

**ZERO.** Primeira junta desta sessão sem nenhuma perda — depois de **6 quedas** em 3 classes
(streaming · cota · rede) nos blocos anteriores.

---

## O que este PR entrega

**R1** — a décima via (`POST /mobile/sync/work-order-actions` com `work_order.mileage`) entra em
`componentes_abertos` (**9 → 10**) e na pendência dona, com N/forma/causa. A `contagem_aberta` **desarma o
número** e torna **vinculante** que o `B-O6R-07c` **cense a superfície de sync** antes de declarar o
`Ω6R-SEC-002` fechado.

**R2** — backfill §C3.5 do #369: `merge_commit dc8168b` nas duas entradas; `approved_head` **`9989c62`** no
ciclo 2 (head da ata, precedente 3/3) com `0a7f5fd` declarado ao lado; e **`null` no ciclo 1**, porque **não
se fabrica aprovação para um ciclo que a junta reprovou**.

**O que NÃO entra, com razão medida:** `blocks_completed` (a ressalva do porteiro estava errada no
instrumento — C2) e `pendencias-indice.md` (o apenso é neutro, e a `main` está em sincronia — C3).

---

## ADENDO PÓS-MERGE (2026-09-05) — ressalvas **D2** e **D3**, medidas depois do merge

Acrescentado pelo PR de registro consolidado do `B-O6R-02` ciclo 5. **Nada acima foi alterado** (§A2): a
ata registra o que a junta viu; este adendo registra o que a execução mostrou depois.

### D2 — a ata diz que o PR **não** toca `pendencias-indice.md`, e ele toca

O §"O que NÃO entra" afirma: *"`pendencias-indice.md` (o apenso é neutro, e a `main` está em sincronia)"*.
Medido no merge do próprio PR (**#373**, `0afedf8`):

```
agent-orchestration/controle/pendencias-indice.md  |  10 +-
```

**As duas metades da frase não têm o mesmo valor de verdade.** *"O apenso é neutro"* **procede** — nenhuma
coluna de **estado**, **severidade** ou **dono** mudou. *"Não entra no PR"* **não procede**: o apenso somou
30 linhas ao `pendencias.md`, e o índice carrega o **número da linha** de cada entrada, então regenerá-lo
reescreveu **10 células de número**. O erro é de classe conhecida nesta rodada — *neutro no conteúdo* foi
lido como *ausente do diff*. Um arquivo **gerado** entra no diff sempre que a **fonte** se desloca, mesmo
quando nada que ele afirma muda.

### D3 — o head julgado (`533cefd`) é órfão, e **não** é o head que mergeou

| fato | medida |
|---|---|
| `533cefd` existe como objeto | `git cat-file -t` → `commit` |
| alcançável de quantos refs | **0** (`git for-each-ref --contains`) — órfão, sujeito a GC |
| é ancestral do head mergeado? | **NÃO** (`git merge-base --is-ancestor 533cefd 7e0a378` → falso) |
| head que o GitHub mergeou | `headRefOid` = **`7e0a378`** — também alcançável de **0** refs |
| merge commit (durável) | **`0afedf8`**, na `main` |
| `7e0a378^{tree}` vs `0afedf8^{tree}` | **IDÊNTICAS** (`f8afbcf…`) — o squash preservou a árvore inteira |

**Consequência, dita sem suavizar:** a ata ancora seu veredito em `533cefd`, um commit que (a) não é
alcançável de nenhuma referência, (b) **não está na cadeia** do que foi mergeado, e (c) difere do que
entrou na `main` em **11 arquivos**, incluindo `pendencias.md` (**+110 −3**) e `pendencias-indice.md`. Um
leitor futuro **não consegue reconstruir** o que as três cadeiras leram: o objeto morre no próximo `gc` e
já não corresponde ao conteúdo publicado.

**O que é auditável e deve ser citado no lugar dele:** o merge commit **`0afedf8`**, cuja árvore é
byte-idêntica à do head realmente mergeado (`7e0a378`). O `achados.jsonl` — o artefato central do voto —
é **idêntico** entre `533cefd` e a `main`, então o objeto do julgamento sobreviveu; o que não sobreviveu
foi a **âncora**.

**Isto não reabre o veredito** — quem registra não julga (§C7.4-bis). Registra-se para que a próxima ata
ancore no que dura: `merge_commit`, ou um head **empurrado** para o remoto. É a `D-DURABILIDADE-BRANCHES-LOCAIS`
outra vez, agora em cima de um head de ata, e na mesma semana em que este bloco a pagou com dois pareceres
que só existiam em disco (ressalva **R1**).
