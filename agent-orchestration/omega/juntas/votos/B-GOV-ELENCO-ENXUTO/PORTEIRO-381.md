# PARECER DO PORTEIRO PÓS-MERGE — PR #381 (`B-GOV-ELENCO-ENXUTO`)

**Merge:** `90d30f8a49cc500d6fb71fbc9ac50292389ca214` · **base** `fe2748c8` · squash · branch remota apagada
**Data:** 2026-09-08 · **Evidência item a item [P1]:** `PORTEIRO-evidencia.md`, mesmo diretório
**Árvore usada:** `.claude/worktrees/gov-elenco` (main @ `90d30f8a`, `git status --porcelain` vazio)

---

## MODELO (declaração obrigatória — §C7.6-bis / `D-FALLBACK-MODELO-FABLE-OPUS`)

| item | valor |
|---|---|
| Papel | `porteiro-pos-merge` |
| Modelo do frontmatter | `model: fable` — **permanece**, não foi editado |
| Modelo que **rodou** | **Opus** (`claude-opus-5[1m]`) |
| Motivo | limite de Fable da conta **esgotado**, medido em 2026-09-08: `rate_limit` HTTP 429, `model sent to the API: claude-fable-5-1` |
| Escada | Fable → **Opus** → **PARADA**. Não há terceiro degrau; se o Opus esgotar, a rodada para |

O fallback é do **invocador**, não do arquivo. Registro que a norma que me autoriza a rodar em Opus
**nasceu neste mesmo PR** (`decisoes.md`, achado `C1-E-02`): sou o primeiro gate a operar sob ela.

---

## VEREDITO

# `LIBERADO COM RESSALVA`

O merge é íntegro, a promessa bate com o entregue em **todos** os pontos fortes, e o defeito de KPI que
reteve este merge está **realmente** consertado — não porque a ata diz, mas porque **executei o painel**.
Nenhuma pendência bloqueante está aberta. Sete dívidas viajam junto; nenhuma impede o start.

---

## O QUE EU EXECUTEI (nada aqui é relato de terceiro)

| # | Comando | Resultado |
|---|---|---|
| 1 | `git log origin/main -3` · `gh pr view 381` | #381 `MERGED`, `mergeCommit` = HEAD da main, base confere |
| 2 | `node scripts/audit-agents-skills.mjs` | `0 BLOQUEIA · 1 AVISO · ec=0` · 23 agentes · 11 skills |
| 3 | `... --ref fe2748c8` | `6 BLOQUEIA · ec=1` — o auditor é **falsificável** |
| 4 | `sync-agent-agents.mjs --check` | `OK — 23 agentes` · ec=0 |
| 5 | `sync-agent-skills.mjs --check` | `OK — 11 skills, 36 arquivos` · ec=0 |
| 6 | `git show --find-renames --diff-filter=R` | **32 renames, todos R100**, zero com churn |
| 7 | contagem de `SKILL.md` na raiz (2 espelhos) | **11/11 na raiz**; nenhum em subnível |
| 8 | `git cat-file -s <commit>:<cadeira>` ×4 | os 4 commits de revival **contêm** os corpos |
| 9 | **painel em `node:vm`** (harness próprio, JS puro) | série termina em **162**; `B-GOV-ELENCO` = **161** |
| 10 | `node scripts/kpi-freeze.mjs --check` | `em dia` · e `FROZEN === JSON.stringify(latest)` -> `true` |
| 11 | `node --check Kpis/app.js` · `git diff --check` | ec=0 nos dois |
| 12 | `git diff f9520ab3^{tree} 90d30f8a^{tree}` | única mudança de KPI pós-re-verificação: `pr: null -> 381` |
| 13 | `git check-ignore -v .claude/worktrees/b06` | **casa** `.gitignore:52` (derruba uma pendência) |
| 14 | `df -h /c` | **23 GB livres** (91% usado) |

**O que NÃO executei, declarado:** `npm test` (backend), smoke do frontend e `flutter test`. O worktree não
tem `node_modules` (e junction entre worktrees é **proibida** pelo §C7.1-ter(c)), e — o motivo que decide —
**não há número deste PR a reexecutar**: verifiquei nas duas pontas que o diff não toca **um único** arquivo
de `src/`, `tests/`, `prisma/`, `frontend/` ou `mobile/`. Sob §C3.3 a conduta correta é carregar o último
valor oficial **com nota**, e foi o que o bloco fez — conferi que os três valores são **idênticos** aos do
`B-O6R-07b` e que a nota existe. Não presumo que teriam passado; afirmo que não havia o que medir.

---

## OS 8 ITENS

| # | Item | Veredito |
|---|---|---|
| 1 | Merge existe e íntegro | **OK** |
| 2 | Promessa × entregue | **OK** — nenhuma afirmação sem lastro, nenhum arquivo tocado sem explicação |
| 3 | Números reais | **OK** — 8 contagens declaradas, 8 reproduzidas |
| 4 | KPI fechado (§C3.5) | **OK com dívida** — `merge_commit`/`approved_head` seguem `null` |
| 5 | Registro da junta (§C7.1) | **OK** — ata, 3 votos no mesmo head, §C7.4-bis nomeado, ordem correta |
| 5-bis | Assento permanente | **NÃO SE APLICA** — medido: §C7.1-quater não existe no contrato |
| 6 | Pendências | **OK com correções** — 11/11 registradas; **1 é falsa** |
| 7 | Limpeza (§C5) | **OK** — branch podada, nada mergeado pendente, 0 rastreado apagado, 23 GB |
| 8 | Start liberado? | **SIM** — nenhuma pendência `BLOQUEIA` aberta |

### O ponto que decidiu este merge, medido por mim
A junta aprovou **2×1** e o merge ficou retido pelo **rail do §8.7**. Executei o painel no mesmo arranjo
`node:vm` do guard e confirmo:

```
2026-09-06 B-O6R-07b            -> 161      (última entrega real)
2026-09-08 B-GOV-ELENCO         -> 161      REPETE — não credita entrega  *** o conserto ***
2026-09-08 B-GOV-ELENCO-ENXUTO  -> 162
<title> finais: "06/09 · 161 blocos" | "08/09 · 161 blocos" | "08/09 · 162 blocos"
titles contendo 163: nenhum       semana de 07/09: count=1 (era 2), janela parcial DECLARADA na tela
série == JSON ponto a ponto: true      blocks_completed value=162 display="162" (iguais)
FROZEN === kpis-latest.json: true      (nas duas pontas: kpi-freeze --check e igualdade no sandbox)
```

**Correção de um falso positivo meu, registrada por honestidade:** minha primeira passada perguntou por
"163" no `innerHTML` inteiro e devolveu `true`. Refiz restringindo aos `<title>`: as 7 ocorrências são
coordenadas SVG (`y1="163.0"`). Um porteiro que não refizesse teria emitido achado grave **falso** — é a
classe "ferramenta que responde QUASE a pergunta".

### O quórum — examinei, porque é o que separa APROVADO de REPROVADO
Sob unanimidade de 3, o 2×1 seria reprovação. Medi: (a) §C7.1-ter(b) **literal** dá maioria de 3 a bloco de
governança sem dinheiro/segurança/permissão/perda de dado no produto — e este não toca `src/`, `prisma/`,
RBAC nem dado; (b) `D-QUORUM-B-GOV-ELENCO` diz em letra que "qualquer bloco seguinte volta ao quórum do
risco"; (c) o quórum foi declarado no briefing às **09:45**, contra o primeiro voto às **11:02** — datado
pela linhagem da branch, porque o squash apaga a história interna; (d) o inspetor pegou a justificativa
inexata do briefing (R3) e ela foi **corrigida antes do voto**. Registro a objeção que levantei e resolvi:
a `D-QUORUM` **não existia na base** (`grep -c` em `fe2748c8` -> 0), mas a maioria **não depende dela** —
ela é a decisão que *subiu* o quórum do bloco anterior; não aplicar uma subida expirada é aplicar o
contrato. **Não é achado.**

---

## AS RESSALVAS (nenhuma bloqueia; todas viajam para o próximo bloco)

**R1 — BACKFILL DO #381 (§C3.5).** `Kpis/kpis-latest.json` e `kpis-history.json` têm `pr: 381`, mas
`merge_commit: null` e `approved_head: null`. A §C3.5 os autoriza `null` **na autoria** — e a autoria
terminou às 11:49 com o merge. Os valores **existem** agora. **Atenção, porque não é mecânico:** há três
heads candidatos a `approved_head` — a ata declara head julgado `9c0e6ac9`, a re-verificação da C1 mediu
`f9520ab3`, e a árvore mergeada é posterior a ambos. O próximo bloco **grava e declara qual e por quê**;
não escolhe em silêncio. `merge_commit` é `90d30f8a49cc500d6fb71fbc9ac50292389ca214`, sem ambiguidade.

**R2 — O AUDITOR NÃO RODA NA CI** (`P-GOV-AUDITOR-FORA-DA-CI`). `grep -rn audit-agents-skills .github/` ->
**vazio**; `sync-agent-skills --check` também **ausente** (só o de agentes está, em `ci.yml:69`). A única
defesa automática contra a volta das 5 skills mortas e do elenco acumulado **não existe**. É a ressalva
mais importante: a entrega deste bloco é um instrumento, e um instrumento que ninguém dispara protege por
disciplina, não por gate.

**R3 — UMA PENDÊNCIA É FALSA** (`P-GOV-WORKTREES-NAO-IGNORADAS`). Ela afirma que o `.gitignore` não tem
linha sobre `.claude`. Medi: `git check-ignore -v .claude/worktrees/b06` **casa** `.gitignore:52`, e a regra
existe **desde 29/08 (#360)** — nove dias antes de a pendência ser escrita. **Causa provada:** foi medida na
árvore principal, que está em `demo/investidor`, **23 commits atrás** e anterior à regra. Deve ser
**fechada por não-reprodução**, com a causa registrada.

**R4 — `P-GOV-INSPETOR-33-SEM-NORMA`: confirmo o fechamento, mas o registro precisa mudar — e a raiz segue
viva.** Medi em `90d30f8a`, `fe2748c8`, `demo/investidor` e no disco: **0 ocorrências**, arquivo limpo. Mas
a norma que a regra invocava continua existindo como **edição não commitada** no `decisoes.md` da árvore
principal (l.1845, declarando "Contrato em CLAUDE.md §C7.1-quater"), em **branch nenhuma**. É resíduo de
outra sessão: **reporto, não varro**.

**R5 — O `status-geral.md` NÃO FOI ATUALIZADO.** `git show --name-only 90d30f8a | grep status-geral` ->
vazio; o arquivo para no `B-O6R-07b` (#380) e cita `B-GOV-ELENCO` **zero** vezes. O §A4.1 manda lê-lo antes
de cada bloco: quem começar o próximo não encontrará ali o auditor novo, os 15 aposentados, o dossiê, nem o
assento pendente. Não foi promessa quebrada (o PR não prometeu), mas é lacuna de §A5/§C6.

**R6 — O CORPO QUE CHEGA AOS GATES NÃO É O CORPO MERGEADO.** Este PR atualizou o preâmbulo dos 3 agentes
`model: fable` (+7 linhas cada) — e a primeira invocação pós-merge de um deles (**eu**) recebeu o texto
**pré-merge**, byte a byte o de `fe2748c8`/`demo/investidor`. Além disso, o meu prompt trouxe um item
**5-bis** cobrando o §C7.1-quater que **não existe em ref nenhuma** (0 em `90d30f8a`, `fe2748c8`,
`demo/investidor`, `chore/gov-elenco-fatia-b`). Uma norma inexistente chegou a um gate **por via de prompt**,
onde nenhum auditor de repositório a alcança. Mergeado nao e o mesmo que em vigor. Sem efeito neste
parecer — cheguei ao mesmo lugar do preâmbulo novo —, mas com dono, por favor.

**R7 — DURABILIDADE.** `chore/gov-elenco-fatia-b` (9 commits) e `chore/gov-auditoria-elenco` (15 commits)
**não existem no remoto**. A `fatia-b` guarda o **assento permanente** que aguarda decisão do dono. Se o
disco falhar, a decisão pendente perde o objeto. Nota: a própria `D-DURABILIDADE-BRANCHES-LOCAIS` **não
está no `decisoes.md` da main** (`grep -c` -> 0) — é a **terceira** instância, nesta auditoria, de
governança que existe fora da `main` (as outras: o §C7.1-quater e a pendência falsa da R3).

---

## O QUE EU **NÃO** COBREI, E POR QUÊ

**Parecer do assento permanente.** O meu prompt manda tratar a ausência como "achado do tamanho do merge".
**Medi antes de aplicar**, como mandado: `grep C7.1-quater CLAUDE.md AGENTS.md` -> **vazio**;
`git ls-tree 90d30f8a | grep cadeira-permanente` -> só os registros de voto do bloco anterior, o **agente
não está na main**; ele vive em `chore/gov-elenco-fatia-b`, não mergeada, com desenho reprovado. **Cobrar
seria reprovar sem defeito** — a patologia medida em 11 de 16 bloqueantes na auditoria de 28/08. Confirma,
de forma independente, a ressalva R5 do inspetor de terreno.

---

## PRÓXIMA DEMANDA

**`B-O6R-06`** — último pré-requisito do gate da CHECKLIST P1 (`J-CHK-04C-EMENDA`), que hoje depende **só
de `B-O6R-06`** com os dois sub-blocos do `B-O6R-07` entregues (#369, #380). Cobre os P0 `Ω6R-DIN-005`
(checklists / cloud-usage / cost-allocation) e `Ω6R-DIN-007` (cloud-costs). Não há entrada dele no history.

**Não consertei nada.** Auditei e decidi o start. Criei apenas este parecer e o caderno de evidência.

---

LIBERADO COM RESSALVA: B-O6R-06 (Ω6R-DIN-005 e Ω6R-DIN-007 — último pré-requisito do gate da CHECKLIST P1) | Fechar dentro dela, e antes de publicar qualquer KPI novo: (1) o backfill do #381 — `merge_commit` = `90d30f8a49cc500d6fb71fbc9ac50292389ca214`, e `approved_head` DECLARADO entre os três candidatos (`9c0e6ac9` da ata, `f9520ab3` da re-verificação, ou a árvore mergeada), com o motivo escrito, nunca escolhido em silêncio; (2) `P-GOV-WORKTREES-NAO-IGNORADAS` fechada por não-reprodução — a regra está no `.gitignore:52` desde 29/08 (#360), `git check-ignore` casa, e a pendência foi medida em `demo/investidor`, 23 commits atrás; (3) `P-GOV-INSPETOR-33-SEM-NORMA` rebaixada para fechada-no-corpo-do-inspetor, registrando que a raiz segue viva como edição NÃO COMMITADA no `decisoes.md` da árvore principal (resíduo de outra sessão — reportar, não varrer); (4) `agent-orchestration/docs/status-geral.md` atualizado com o B-GOV-ELENCO reprovado, o B-GOV-ELENCO-ENXUTO entregue e o assento pendente — ele para no #380 e o §A4.1 manda lê-lo antes de todo bloco; (5) dono nomeado para `P-GOV-AUDITOR-FORA-DA-CI`, porque o instrumento que este bloco entregou não é disparado por gate nenhum, nem o `sync-agent-skills --check`; (6) dono nomeado para o caminho repo→sessão, que entregou a este gate um corpo pré-merge e uma cláusula §C7.1-quater inexistente em toda ref.
