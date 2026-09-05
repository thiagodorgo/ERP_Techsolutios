# BRIEFING — junta do PR #373 (`B-O6R-07a`, ressalvas R1+R2 do porteiro do #369)

> **Head a julgar:** MEÇA VOCÊ MESMO (`git rev-parse HEAD` no worktree `r07a`) · **Base:** `origin/main` =
> `cae6086` · **Branch:** `chore/o6r07a-ressalvas` · **CI: 7/7 verde.**
> **QUÓRUM: MAIORIA DE 3** (§C7.1-ter(b)) — o PR **não toca** dinheiro, segurança, permissão nem perda de
> dado: **zero `src/`, zero teste, zero migration**. É registro.
> **Este briefing é insumo, não veredito. Re-meça tudo.**

---

## 1 · Por que este PR existe

O `porteiro-pos-merge` do **#369** deixou **duas ressalvas** que "viajam para o próximo PR que mergear".
Este é esse PR. Nada aqui é feature; tudo é **fechar dívida de registro** — que é, por sinal, a **classe
dominante de defeito desta rodada**.

## 2 · O diff (3 arquivos — re-meça)

```
 5   5  Kpis/kpis-history.json
30   0  agent-orchestration/controle/pendencias.md
32  32  docs/revisoes/O6R/achados.jsonl
```

## 3 · O que cada cadeira julga (≤3 itens — P4)

### C1 — `jurado-r07a-decima-via` (R1)
1. **`componentes_abertos` foi de 9 para 10?** A entrada nova descreve o `POST /api/v1/mobile/sync/work-order-actions` com `work_order.mileage`, com **forma `execucao`**, origem `eed6240` (2026-07-17, #197) e escopo `pre-existente`? **Confira a origem por `git log`**, não pelo texto.
2. **O efeito declarado é verdadeiro?** *"técnico não atribuído escreve km em OS alheia — HTTP 200, `accepted 1`, km `null → 111111`"*. O roteiro está em `votos/O6R-07a/11-c2-autorizacao-evidencia.md` (§S4) e no `00c-porteiro-pos-merge-369.md` (G1.8). **Re-execute** — se o efeito não reproduzir, o registro está publicando execução que não ocorre.
3. **A `contagem_aberta` desarma o número?** Ela tem de dizer que "9" media **o que dois routers expõem**, não *"tudo que o técnico alcança"*, e tornar **vinculante** que o `07c` cense o sync. **E o apenso na pendência dona (`P-O6R-SUBRECURSO-OBJECT-SCOPE`) diz o mesmo?** Paridade entre os dois artefatos — se divergirem, é achado.

### C2 — `jurado-r07a-backfill` (R2)
1. **Os hashes.** Entrada `B-O6R-07a`: `merge_commit dc8168b`, `approved_head` **`null`**. Entrada `B-O6R-07a-ciclo2`: `merge_commit dc8168b`, `approved_head` **`9989c62`**. **Confira contra o git e contra a ata `J-O6R-07a-ciclo2.md`** — o precedente (3 de 3: #363/#364/#366) manda gravar **o head da ATA**, nunca o `headRefOid`. O head final `0a7f5fd` está **declarado ao lado**?
2. **O `null` do ciclo 1 é justificado ou é omissão?** A nota diz que **não se fabrica aprovação para um ciclo que a junta REPROVOU** (2×1). **Confira na ata do ciclo 1** que ele foi mesmo reprovado. Se a razão não estiver escrita **na própria entrada**, é achado.
3. **`blocks_completed` ficou INTOCADO?** O porteiro do #369 mandou `158 → 159`; o orquestrador **não cumpriu**, porque a sessão vizinha mediu que o `158` conta o **SAN2-6** e que `159`+`160` foram pagos no **#372**. **Meça a trilha do `blocks_completed` na `main` e julgue quem está certo.** Se o orquestrador errou ao não cumprir a ressalva, é achado contra ele.

### C3 — `jurado-r07a-escopo-guards` (escopo e derivados)
1. **Só 3 arquivos?** Nada de `src/`, `tests/`, `prisma/`, `.github/`, `frontend/`, `mobile/`, `CLAUDE.md`/`AGENTS.md`, `scripts/`. **Prove por mutação**, não por diff vazio.
2. **`achados.jsonl` saiu `32/32` por reserialização** — o orquestrador afirma que **só o `SEC-002`** mudou de conteúdo. **Confira registro a registro**: se qualquer outro achado mudou (status, texto, campo), é achado grave, porque seria mutação silenciosa no razão de achados.
3. **Guards e derivados.** `kpi-freeze --check` · `node --check Kpis/app.js` · `kpi-achados-paridade` · `kpi-dashboard-charts` · `git diff --check`. **E o ponto sensível:** `pendencias-indice.md` **NÃO** está no diff, de propósito — o orquestrador mediu que o gerador o move de `252/243/55` para `261/250/62` e que **a causa é o #371/#372**, que mudaram 660 linhas de `pendencias.md` sem regenerar. **Verifique as duas afirmações:** (a) que o apenso dele é **neutro** para o índice (zero `## P-`, zero IDs novos); (b) que a defasagem **pré-existe** a este PR. Se o apenso dele mover o placar, ele devia ter levado o índice.

## 4 · O que a junta deve saber sobre o histórico

- O `B-O6R-07a` foi **REPROVADO 2×1** no ciclo 1 e **APROVADO 3×0** no ciclo 2 (teto).
- A décima via foi achada **por execução** pela cadeira C1-v2 e **re-confirmada** pelo porteiro com drill próprio de 24 medições — não é afirmação do orquestrador.
- **Refutação já registrada contra o orquestrador:** ele publicou que o `blocks_completed` devia ir a 159; estava errado.
- **Outra sessão trabalha no mesmo repositório agora** (PR #374). O `pendencias-indice.md` é **dela** por combinação.

## 5 · Protocolo (§C7.7 — P1/P2/P4)

Evidência incremental em `votos/O6R-07a-ressalvas/<cadeira>-evidencia.md`, **gravando ao medir**; voto em `<cadeira>-voto.json` **antes** da mensagem final; mensagem final = **1 linha**. Voto declara `gravidade` **e** `escopo` (`dentro-do-bloco`|`pre-existente`) **com evidência de data/origem** — sem evidência é tratado como `dentro-do-bloco`. **"Não consigo medir" = REPROVADO.** Você **não propõe correção** (§C7.4-bis) e **não commita**.

## 6 · Terreno

Base viva `erp-postgres` (5432) / `erp-redis` (6379) **INTOCÁVEL, nem leitura** — este PR não precisa de banco. Worktree descartável próprio para drill, com **`git -c core.longpaths=true`**; **nunca** junction de `node_modules`; **nunca 55432**. **Não toque** em nada da outra sessão (worktrees/containers que não levem `o6r07a` ou `r07a` no nome) — regra `P-JUNTA-RECURSO-EFEMERO-POR-BLOCO`. Nada de `reset`/`stash`/`checkout -- .`/`rm` de lock/`gc`/`prune`/`--force`.

## 7 · Armadilhas (medidas)

`grep -c $'\r'` **não conta CR** (use `tr -cd '\r' | wc -c`) · `md5sum`/`git status` **mentem** sob `autocrlf` · `sed -i` **PROIBIDO** em `pendencias.md` (**EOL misto**) · **`git archive`+`tar` PROIBIDO** · heredoc com aspas **quebra** (use `Write`) · backtick vira **substituição de comando** · `$!` não é PID do Windows · **`Edit`/`Write` recebem caminho ABSOLUTO e não herdam o `cd`**.
