# Parecer do porteiro-pos-merge — PR #362 (SAN2-1R, squash `87f6ae6`)

- **Cadeira:** iniciado pelo sexto sucessor (itens 0, 1, 2, 7 + E0–E2); **fechado pelo sétimo** (itens 3, 4, 5, 6, 8, 9, achados e veredito). Cinco cadeiras anteriores caíram por infraestrutura; a quinta morreu com tudo medido e nada escrito — este parecer foi escrito item a item, por mandato.
- **Data:** 2026-08-28
- **Worktree:** `.claude/worktrees/san2-r` (na `main` = `87f6ae6`)
- **Roteiro (nunca veredito):** `00c-porteiro-evidencia.md` — itens 1a–1f e 2 medidos por cadeiras caídas; seção 3 + `3a-ERRATA` medidas pelo orquestrador (parte interessada). Minha medição prevalece; divergência é achado.

## Itens

| # | Item | Resultado medido | Status |
|---|------|------------------|--------|
| 0 | Merge íntegro: PR #362 merged, squash `87f6ae6` na `origin/main` | `gh pr view 362`: state=MERGED (2026-08-29T23:39Z), mergeCommit=`87f6ae6` = HEAD de `origin/main` = HEAD do worktree. **Mas `headRefOid`=`55aa8a3` ≠ `4cd0867` do roteiro** → apurar no item 8 | **OK** (com divergência encaminhada ao item 8) |
| 1 | `3a-ERRATA`: bloqueantes reais = 8 pelo campo `**Bloqueia:**`? Nenhum alcança `scripts/`, `.github/workflows/`, `.claude/agents/`? | **8 CONFIRMADO por medição própria** (`B03,B04,B06,B07,B08,B09,B10,B11`, todas feature de produto; alcance de scripts/CI/agents = zero nas 8). Contabilidade da errata corrigida: **12** seções têm o campo (não 13), **2** fechadas (`B01` FECHADA 2026-08-18, `B05` FECHADA 2026-08-15/#353 — não 3), **2** negadas (`B12` "nada"; `ARNES-ISOLAMENTO` "nada diretamente" — a errata disse que ARNES não tinha o campo; **tem**, negado) | **OK** (número-fim bate; 3 erros de contabilidade na errata, sem efeito no veredito) |
| 2 | Limpeza §C5: `git ls-remote --heads origin \| grep -iE "resgate\|san2"` · `git worktree list` · `df -h /c` | **Medido pelo 6º sucessor (E2 abaixo; mantenho):** `chore/san2-1-resgate` VIVA no remoto (dívida §C5 → item 7) · 5 worktrees · **19 GB livres** (acima do piso ~10 GB; sem `DEEP_CLEAN` obrigatório) · nenhum rastreado apagado (`^ D` vazio) · untracked = só artefatos desta junta | **OK com dívida** (branch remota viva → itens 7 e Achados) |
| 3 | Branch parada `chore/san2-1-triagem-pendencias`: 0 arquivos exclusivos (`git diff --name-only --diff-filter=A main <branch>`)? Removível? | **Re-medido por mim (7º sucessor):** `--diff-filter=A` → **0 arquivos exclusivos** · upstream → `fatal: no upstream` · `ls-remote` com "triagem" → **0 refs** · 13 commits à frente (só neste disco; conteúdo superado — 3e do roteiro mediu delta zero em contratos e zero `## P-` novos) | **OK — removível com segurança** (`git branch -D` na próxima faxina; confirma 3e) |
| 4 | Trilha do SAN2-1 na `main` (amostra de 3 arquivos) | **Re-medido por mim:** `git cat-file -e main:<f>` → **as 3 presentes** — `omega/juntas/J-SAN2-1R.md` (53 linhas) · `omega/reprovacoes/DOSSIE-SAN2-1-parada.md` (105) · `controle/pendencias-indice.md` (306). Contagens idênticas às do 3d do roteiro | **OK** (confirma 3d) |
| 5 | Amostra de 1e/1f/2 do roteiro (o que der para reexecutar) | **1e re-medido:** `D-SAN2-OPCAO-C` na linha **1847** de `decisoes.md` (idêntico ao roteiro). **1f re-medido:** bloco do item 7 extraído dos dois contratos → 12 linhas cada, `diff` vazio, **md5 `0844dc70286611bc49033afd7742f24b` em AMBOS** (idêntico ao roteiro). **Item 2 re-EXECUTADO (não copiado):** `node --test --import tsx tests/kpi-dashboard-charts.test.ts` → **16/16, 0 fail, 0 skip, 0 todo** · `node scripts/kpi-freeze.mjs --check` → `em dia (snapshot 2026-08-29)`, exit 0. Ambos idênticos a 2a/2b do roteiro | **OK** (3 amostras reexecutadas, 3 batem) |
| 6 | Achado `P-C7-BIS-TER-FORA-DA-MAIN`: §C7.1-bis/§C7.1-ter fora da `main` (confirmar ou derrubar) | **CONFIRMADO por medição própria, nos 4 pontos:** `git show main:CLAUDE.md \| grep -c "1-bis\|1-ter"` → **0** · `main:AGENTS.md` → **0** · `demo/investidor:CLAUDE.md` → **2** · `demo/investidor:AGENTS.md` → **2**. §C7.1-bis (inspetor de terreno) e §C7.1-ter (escopo/calibração) existem só na branch demo — fora dos DOIS contratos da `main`. **Escopo: pré-existente** (§1f do roteiro provou que `74430cc` já media 0; #362 não removeu nada). **Agravante:** o ID `P-C7-BIS-TER-FORA-DA-MAIN` NÃO tem entrada em `pendencias.md`/`pendencias-indice.md` — vive só nos 3 artefatos untracked desta junta, neste disco | **CONFIRMADO** — trabalho do SAN2-2, que deve FORMALIZAR a pendência ao abrí-la/fechá-la |
| 7 | Achado `chore/san2-1-resgate` viva no remoto pós-merge | **CONFIRMADO por medição própria**: `git ls-remote --heads origin` → `55aa8a3 refs/heads/chore/san2-1-resgate`. E `55aa8a3` = `headRefOid` do PR #362 (a ponta que o GitHub mergeou) | **CONFIRMADO** — dívida §C5 p/ próxima faxina |
| 8 | Backfill §C3.5: `merge_commit 87f6ae6` / `approved_head 4cd0867` nos KPIs — devido no próximo PR | **Re-medido por mim, confirma 3f:** `4cd0867` é ancestral de `55aa8a3` e o delta são **2 commits de registro puro pós-voto** (`3d85618` ata + `55aa8a3` nº do PR no KPI); a ata na `main` consigna `4cd0867` como "head julgado pelas 3 cadeiras" (linhas 14–15). History hoje: **#361 backfillado** (`a0a1075`/`48dc863`) · **#362 com `null`/`null`** — estado correto na autoria (§C3.5), vira dívida nomeada. **O backfill grava `approved_head = 4cd0867`** (head julgado), NÃO o `headRefOid 55aa8a3` — gravar 55aa8a3 declararia que a junta aprovou 2 commits que nunca viu. Não esquecer o `kpis-latest.json` (2c-α) | **OK** — dívida de backfill nomeada p/ o PR do SAN2-2 |
| 9 | Durabilidade: 460 linhas de evidência só neste disco, em worktree sobre a `main` — vira ressalva? | **Medido:** 3 untracked em `votos/SAN2-1R/` — `00-quedas-pos-merge.md` (124 linhas) · `00c-porteiro-evidencia.md` (488) · este parecer (~90 ao fechar) ≈ **700 linhas só neste disco**, num worktree na `main` (que não recebe commit direto — §8.4). É a trilha §C7.1 do gate pós-merge do #362, incluindo a ÚNICA existência do achado `P-C7-BIS-TER-FORA-DA-MAIN` e da apuração 3f do backfill. Um `rm` de worktree ou falha de disco apaga o parecer que autoriza o start | **VIRA RESSALVA** — o PR do SAN2-2 commita os 3 arquivos (registro, não conserto: é trilha do bloco seguinte por natureza, como todo backfill §C3.5) |

## Evidência executada (sexto sucessor)

### E0. Merge íntegro
```
$ git log origin/main -3 --format='%h %s'
87f6ae6 docs(resgate): ... (SAN2-1R) (#362)
a0a1075 ... (SAN2-R) (#361)
74430cc ... (B-O6R-REG) (#360)
$ gh pr view 362 --json state,mergedAt,mergeCommit,headRefOid
state=MERGED · mergedAt=2026-08-29T23:39:35Z · merge=87f6ae6 · head=55aa8a3
```
Merge existe e está íntegro. O `headRefOid` registrado pelo GitHub (`55aa8a3`) difere do `approved_head` que o roteiro manda backfillar (`4cd0867`) — apuração no item 8.

### E1. `3a-ERRATA` re-medida com régua própria
```
$ node (parser por seção `## P-` sobre pendencias.md; campo /**Bloqueia:**/i por seção)
12 seções com o campo (14 ocorrências — B01 e B07 têm 2 cada):
  afirmativas ABERTAS  = 8  -> B03,B04,B06,B07,B08,B09,B10,B11 (índice: todas abertas, dono "a atribuir")
  afirmativas FECHADAS = 2  -> B01 ("FECHADA 2026-08-18 — B-O6R-01"), B05 ("FECHADA 2026-08-15, PR #353 a8901ff")
  negadas              = 2  -> B12 ("**Bloqueia:** nada"), ARNES-ISOLAMENTO ("**Bloqueia:** nada diretamente")
alcance scripts//.github/workflows//.claude/agents//sync-agent-agents//ci.yml nas 8: NENHUM
(só ARNES-ISOLAMENTO cita ci.yml/scripts/ — campo negado, dono = bloco próprio SAN2-4)
```
O número honesto do orquestrador (**8**) sobrevive à minha régua. A errata em si carrega 3 erros próprios de contabilidade (13→12 com campo; 3→2 fechadas; "ARNES sem campo"→tem, negado) — mesma classe de doença (régua frouxa), sem efeito no veredito. As 8 bloqueiam **feature de produto**; SAN2-2 (guard/CI) e SAN2-3 (obituários) não são feature: **start livre por este critério**.

### E2. Limpeza §C5
```
$ git ls-remote --heads origin | grep -iE "resgate|san2"
55aa8a3  refs/heads/chore/san2-1-resgate          <- VIVA (dívida §C5)
$ git worktree list -> 5 (principal demo/investidor · agent-af6ea… · gov-descuido · san2-1 [chore/san2-1-resgate] · san2-r [main])
$ df -h /c -> 238G total · 19G livres (93%)     <- acima do piso ~10 GB; sem DEEP_CLEAN obrigatório
$ git status --porcelain | grep "^ D" -> (nenhum rastreado apagado)
untracked: 00-quedas-pos-merge.md · 00c-porteiro-evidencia.md · 00c-porteiro-pos-merge-362.md (artefatos desta junta)
```

## Evidência executada (sétimo sucessor)

### E3–E9. Comandos dos itens 3, 4, 5, 6, 8 e 9
```
[item 3] git diff --name-only --diff-filter=A main chore/san2-1-triagem-pendencias -> 0 arquivos
         upstream -> fatal: no upstream · ls-remote "triagem" -> 0 refs · rev-list -> 13 commits
[item 4] git cat-file -e main:{J-SAN2-1R.md, DOSSIE-SAN2-1-parada.md, pendencias-indice.md} -> 3x PRESENTE (53/105/306 linhas)
[item 5] grep D-SAN2-OPCAO-C decisoes.md -> 1847 · md5 bloco C7.7 CLAUDE==AGENTS (0844dc70…, 12 linhas)
         node --test tests/kpi-dashboard-charts.test.ts -> 16/16 pass, 0 fail/skip/todo
         node scripts/kpi-freeze.mjs --check -> "em dia (snapshot 2026-08-29)", exit 0
[item 6] git show main:CLAUDE.md|AGENTS.md grep -c "1-bis\|1-ter" -> 0 e 0 · demo/investidor -> 2 e 2
         grep -rln P-C7-BIS-TER-FORA-DA-MAIN agent-orchestration/ -> SÓ os 3 artefatos untracked desta junta
[item 8] merge-base --is-ancestor 4cd0867 55aa8a3 -> SIM · log 4cd0867..55aa8a3 -> 2 commits de registro
         (3d85618 ata · 55aa8a3 nº do PR no KPI) · ata na main linhas 14-15: "4cd0867 … head julgado"
         history: #361 = a0a1075/48dc863 (backfillado) · #362 = null/null (dívida)
[item 9] git status --porcelain votos/SAN2-1R/ -> 3 untracked (124 + 488 + ~90 linhas) · worktree na main
```

## Achados

1. **CONFIRMADO — `P-C7-BIS-TER-FORA-DA-MAIN` (pré-existente, não reprova o #362).** §C7.1-bis e §C7.1-ter
   fora dos DOIS contratos da `main` (`main:CLAUDE.md` e `main:AGENTS.md` → 0 ocorrências; `demo/investidor`
   → 2 em cada). **Agravante:** o ID não tem entrada em `controle/pendencias.md` nem no índice — existe só
   nos artefatos untracked desta junta. O SAN2-2 (dono natural: é o bloco de contrato+espelho) formaliza a
   pendência e a fecha no mesmo PR.
2. **Dívida §C5 (herdada do item 7 + item 3, sem efeito no start):** `chore/san2-1-resgate` viva no remoto
   (`55aa8a3`; o `--delete-branch` não foi aplicado ao #362) e `chore/san2-1-triagem-pendencias` local
   removível (0 exclusivos, sem upstream, 0 refs remotas). Faxina: remover o worktree `san2-1` (aponta para a
   resgate) via `git worktree remove`, `git push origin --delete chore/san2-1-resgate`,
   `git branch -D chore/san2-1-triagem-pendencias`. Disco 19 GB — sem `DEEP_CLEAN` obrigatório.
3. **Dívida de backfill §C3.5 (item 8):** próximo PR grava `merge_commit 87f6ae6` +
   **`approved_head 4cd0867`** (head julgado, consignado na ata — NÃO o `headRefOid 55aa8a3`, cujo delta são
   2 commits pós-voto de registro puro) na entrada 362 do `Kpis/kpis-history.json`, sem esquecer o
   `kpis-latest.json` (sub-achado 2c-α).
4. **Durabilidade (item 9) — vira ressalva:** ~700 linhas de trilha do gate (§C7.1) untracked, só neste
   disco, em worktree na `main`: `00-quedas-pos-merge.md`, `00c-porteiro-evidencia.md` e este parecer.
   O PR do SAN2-2 os commita.
5. **Notas menores mantidas (não bloqueiam):** 1d-α (âncora ao teto de 5 revogado em
   `P-SAN2-LEITURA-DAS-79`) · 3 erros de contabilidade na `3a-ERRATA` (régua frouxa, registrados no item 1) ·
   erros do orquestrador em 3e/3a auto-registrados no roteiro.

## Não executado (declarado, não presumido)

- **`scripts/sync-agent-agents.mjs --check`** — PROIBIDO pelo mandato (falso-vermelho conhecido,
  `P-REG-S0-GUARD-FALSO-VERMELHO`); consertá-lo é o item 1 do próprio SAN2-2. A paridade do §C7.7 foi
  verificada por md5 direto da árvore (item 5), não pelo guard.
- **Suíte backend completa (2595/2597) e suíte Flutter (864/864)** — não reexecutadas por mim: o #362 é
  docs-only (item 1a do roteiro: diff de código base→head VAZIO, re-confirmado pelos sucessores 1–2), essas
  trilhas carregam o último valor oficial com nota (§C3.3). O que o bloco exerceu de executável — guard de
  KPI e freeze-check — EU reexecutei (16/16 e exit 0).
- **Banco/containers** — mandato proíbe tocar `erp-postgres`/`erp-redis`; nenhum item deste bloco documental
  exigia banco.
- **`gh pr view 362`** — não re-rodei; mantido do item 0 (sexto sucessor), com a divergência de head apurada
  e resolvida no item 8.

## O próximo bloco pode começar?

**SIM, para os dois alvos.** As **8** pendências `**Bloqueia:**` afirmativas e abertas (item 1, re-medidas
por mim contra a errata) bloqueiam exclusivamente **feature de produto** (`P-O6R-B03/B04/B06/B07/B08/B09/
B10/B11`) e nenhuma alcança `scripts/`, `.github/workflows/` ou `.claude/agents/`:

- **SAN2-2** (guard do espelho + suíte de corrida no `ci.yml` + §C7.1-bis/1-ter nos contratos): as duas
  pendências que tocam esses alvos são o próprio trabalho (`P-REG-S0-GUARD-FALSO-VERMELHO`) ou têm bloco
  dono próprio (`P-O6R-ARNES-ISOLAMENTO` → SAN2-4). Start livre, carregando as ressalvas 1–4 dos Achados.
- **SAN2-3** (obituário dos 16 especialistas): documental; nenhum bloqueio o alcança.

## VEREDITO

LIBERADO COM RESSALVA: SAN2-2 (guard do espelho + suíte de corrida no ci.yml + §C7.1-bis/1-ter) | dentro do
PR do SAN2-2: (1) commitar os 3 artefatos untracked desta junta (durabilidade §C7.1); (2) backfill §C3.5 —
merge_commit 87f6ae6 + approved_head 4cd0867 (não 55aa8a3) no history E no latest; (3) formalizar
P-C7-BIS-TER-FORA-DA-MAIN em pendencias.md ao fechá-la; (4) faxina §C5 — remover worktree san2-1, apagar
chore/san2-1-resgate no remoto e chore/san2-1-triagem-pendencias local.
