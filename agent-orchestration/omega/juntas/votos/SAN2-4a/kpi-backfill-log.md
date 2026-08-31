# Diário do backfill de KPI do #364 (dívida do SAN2-3)

> Bloco: **SAN2-4a** (worktree `.claude/worktrees/san2-r`, branch `chore/san2-4a-medir-arnes`,
> head de partida `1949c6a`). Mandato de **UM item**: pagar a dívida de KPI do bloco anterior e
> fazer o painel espelhar o que está **de fato mergeado** na `main`.
>
> Este arquivo é apensado **junto** com as edições, uma de cada vez — não escrito no fim. Dezenas
> de agentes caíram hoje na transição "medi tudo, agora escrevo"; a ordem aqui é deliberada.

---

## 0. Terreno, antes de tocar em qualquer arquivo

| Medição | Comando | Resultado |
|---|---|---|
| Branch / head | `git rev-parse --abbrev-ref HEAD` / `git rev-parse HEAD` | `chore/san2-4a-medir-arnes` · `1949c6a3657dd38b9dbe5c3cd9efa792e656e019` |
| Topo da `main` | `git log origin/main --oneline -1` | `c9fd3a1 docs(obituario): as identidades queimadas viram registro — e a conta era 15+2, nao 16+1 (SAN2-3) (#364)` |
| Árvore | `git status --porcelain` | só `?? agent-orchestration/omega/juntas/votos/SAN2-4a/medicao-3-censo-roles.md` (arquivo de **outro agente**, medindo agora — intocado) |
| **Guard de KPI ANTES de eu editar** | `node scripts/kpi-freeze.mjs --check` | `kpi-freeze: em dia (snapshot 2026-08-30).` · **EXIT=0** |

O último item é o baseline honesto: a cópia congelada do `app.js` estava **em dia** com o
`kpis-latest.json` antes de eu encostar. Sem esse ponto de partida, o `exit 0` do fim não prova nada
— poderia ser um guard que nunca morde.

### Fidelidade de round-trip dos JSON (como eu decidi editar)

Antes de escolher o instrumento, medi se os dois JSON são exatamente a saída de
`JSON.stringify(obj, null, 2) + "\n"`:

```
Kpis/kpis-latest.json   roundtrip-identical(LF-normalizado) = true   (64596 == 64596 chars)
Kpis/kpis-history.json  roundtrip-identical(LF-normalizado) = true   (325716 == 325716 chars)
```

São. Logo: **parse → altera o campo → re-serializa** produz um diff que contém **apenas** a minha
alteração, sem reformatação parasita. E como os dois arquivos estão em **CRLF no disco**
(`kpis-latest.json` 708 CRLF / 0 LF-só; `kpis-history.json` 2269 / 0 — `core.autocrlf=true`), o
script de edição **reconverte para CRLF ao gravar**, para não trocar 2977 linhas de EOL por acidente.
Medição de EOL feita contando `\r\n` e `\n`-sem-`\r` no buffer — **não** por `md5sum` nem por
`git status`, que mentem sob `autocrlf` (armadilha registrada pelo próprio SAN2-3), e **não** por
`grep -c $'\r'`, que é inútil aqui porque conta linhas, não ocorrências.

---

## 1. Os dois defeitos, confirmados por mim (não herdados da ordem de serviço)

### Defeito 1 — o backfill §C3.5 do #364 não foi feito

Entrada `SAN2-3` de `Kpis/kpis-history.json`, como estava:

```json
"version": "SAN2-3",
"pr": null,
"merge_commit": null,
...
"approved_head": null
```

São valores **de autoria** (§C3.5: `merge_commit`/`approved_head` nascem `null` porque só existem
pós-merge). Mas o bloco **mergeou**. Os três valores verdadeiros, cada um com a sua fonte:

| Campo | Valor | Fonte verificada por mim |
|---|---|---|
| `pr` | `364` | título do squash na `main`: `… (SAN2-3) (#364)` |
| `merge_commit` | `c9fd3a1` | `git log origin/main --oneline -1` → `c9fd3a1` |
| `approved_head` | `23d9227` | **ata** `agent-orchestration/omega/juntas/J-SAN2-3.md` l.4: "**Head julgado:** `23d9227`" — e `git cat-file -t 23d9227` = `commit`, `git log --oneline -1 23d9227` = `docs(obituario): as identidades queimadas viram registro — e a conta era 15+2, nao 16+1 (SAN2-3)` |

O `approved_head` sai da **ata**, não do GitHub — é a regra que os dois backfills anteriores já
seguiram (#362: `4cd0867` ≠ `55aa8a3`; #363: `c8dc716` ≠ `e4926bd`). Detalhe na §3.

### Defeito 2 — `blocks_completed` está um merge atrás

`Kpis/kpis-latest.json` publica `metrics.blocks_completed = 153`, e a `description` da própria
entrada `SAN2-3` diz, textualmente: *"`blocks_completed` 152 -> 153: o merge do SAN2-2 (#363) … sobe
para 154 só quando o SAN2-3 mergear"*. Ele mergeou, em `c9fd3a1`. O valor verdadeiro é **154**.

---

## 2. Registro das edições (apensado a cada gravação)

### Edição 1 — `Kpis/kpis-history.json`, campos estruturados do backfill (GRAVADA)

Entrada `SAN2-3` (a **última** do array — conferido por `arr.at(-1).version === "SAN2-3"` antes de
escrever; o script **aborta** se algum dos três campos já não fosse `null`, para não sobrescrever
backfill alheio):

```
L2260  - "pr": null,               →  + "pr": 364,
L2261  - "merge_commit": null,     →  + "merge_commit": "c9fd3a1",
L2267  - "approved_head": null     →  + "approved_head": "23d9227"
```

**3 linhas divergentes, 2270 linhas antes e depois** — comparação linha a linha do arquivo inteiro,
LF-normalizada, feita pelo próprio script. `git diff --numstat` = `3  3`. EOL intacto: **2269 CRLF /
0 LF-só**, os mesmos de antes. Reparse do arquivo gravado devolve `SAN2-3 364 c9fd3a1 23d9227`.

**Ainda não** publiquei o *porquê* na `description` nem o `blocks_completed` — cada coisa na sua
gravação, e este diário é apensado entre elas.

### Edição 2 — `Kpis/kpis-history.json`, `blocks_completed` e o porquê na `description` (GRAVADA)

Mesma entrada `SAN2-3`. Duas linhas:

- **L2265** `"blocks_completed": 153` → `154`.
- **L2266** `description` de 6855 → 8656 caracteres (apenso ao fim, nada removido — o script aborta
  se o apenso já existisse, e exige `pr === 364` para provar que a edição 1 está aplicada).

**2 linhas divergentes** nesta gravação; `git diff --numstat` acumulado do arquivo = `5  5`
(3 da edição 1 + 2 desta). EOL intacto: 2269 CRLF / 0 LF-só. Reparse: `SAN2-3 364 c9fd3a1 23d9227
blocks=154`.

**Forma do apenso — imitando o backfill do #363** (que vive na entrada `SAN2-2` e diz: *"BACKFILL
§C3.5 APLICADO PELO SAN2-3 … `pr` 363, `merge_commit` d283903, `approved_head` c8dc716. O
`approved_head` e o head JULGADO, consignado na ata … NAO e o headRefOid e4926bd que o GitHub
registra: o delta … e a propria ata mais o registro pos-voto, sem uma linha de codigo"*). O apenso
novo carrega, na mesma ordem: **os três campos**, **a fonte de cada um**, **o porquê de o
`approved_head` não ser o head do GitHub** com o delta medido, e o **precedente** dos dois backfills
anteriores.

**Por que `approved_head` = `23d9227` e não `4083146`** (o `headRefOid` que o `gh pr view 364`
devolve): o delta `23d9227..4083146` é **um único commit**, `docs(junta): SAN2-3 APROVADO 3x0 — e o
obituario cobre quem tinha ARQUIVO, nao quem VOTOU`, com **14 arquivos, todos em
`agent-orchestration/`** — a ata, os votos e evidências das 3 cadeiras, o parecer do inspetor de
terreno, o briefing, o dev-log, o pos-voto-log e as duas de `controle/pendencias*`. **Zero** em
`Kpis/`, `src/`, `tests/`, `scripts/` ou `.github/` (`git diff --name-only 23d9227 4083146`).
É registro **pós-voto**: gravar `4083146` declararia que a junta aprovou um commit que ela nunca viu.
Mesma lógica já aplicada em #362 (`4cd0867` ≠ `55aa8a3`) e #363 (`c8dc716` ≠ `e4926bd`).

**Justificativa do `blocks_completed` (1 linha):** o SAN2-3 mergeou em `c9fd3a1` (#364), que é
exatamente a condição escrita na própria `description` da entrada — *"sobe para 154 só quando o
SAN2-3 mergear"* — logo o número passa a refletir o estado **mergeado** da `main` em vez do estado de
autoria.

**Por que o 154 entra também na entrada de histórico, e não só no `latest`:** o cartão do painel lê
`kpis-latest.json`; o **último ponto** do gráfico "Blocos de trabalho entregues" lê a última entrada
de `kpis-history.json` (`buildChartSeries` → `rows.map(r => r.blocks_completed)`, `Kpis/app.js`
l.255). Mover só um dos dois faria o painel exibir **cartão 154 sobre um gráfico que termina em
153** — a divergência entre duas moradas do mesmo número que a `D-KPI-INDEX-PAINEL` existe para
proibir. Efeito colateral conferido no gráfico de ritmo: `buildDelivery` soma **deltas** entre pontos
medidos (`app.js` l.129-145), então a semana de 2026-08-30 passa de +1 para +2 e a asserção do guard
(`soma das semanas == último − primeiro`) continua fechando — não há entrega inventada nem perdida.
