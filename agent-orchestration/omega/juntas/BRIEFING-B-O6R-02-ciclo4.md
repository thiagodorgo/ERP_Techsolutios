# BRIEFING DA JUNTA 5/5 — B-O6R-02 · ciclo 4 · atomicidade do financeiro

> Insumo conferível de cada jurado (exigido pelo `inspetor-de-terreno-da-junta`, B3, e pela
> `D-INSTANCIA-NOVA-COM-AUDITORIA`). Cada afirmação herdada de ata anterior está marcada
> **[A RE-VERIFICAR]** — nenhuma entra como fato. Foi uma afirmação herdada como fato (a premissa
> birth-fixed) que contaminou o ciclo 3.

## Head a julgar

`12c3825` · `feat/o6r-b02-financial-uow` · base `origin/main` = `6efe5ad` · head anterior `eb98b0b`.

**md5 do pristino (confira antes de medir; se divergir, o terreno está sujo — pare):**
```
9887150b28118aa7292d894e3391cc37  src/modules/financial-entries/financial-entry-undo-owners.ts
78b9279dcf4bed2550663780adae859b  src/modules/financial-entries/financial-entry.service.ts
```
Worktree do dev (na branch, com `node_modules`): `.claude/worktrees/agent-af6ea607f3ddf8efd`.

> **Terreno Windows (medido 2026-08-28, `core.autocrlf=true`): o md5 do ARQUIVO no worktree NÃO bate com o md5 do
> blob mesmo com a árvore limpa** — o checkout grava CRLF (245 e 685 linhas terminadas em `\r`) e `git show` devolve LF.
> Confira o pristino de um destes dois jeitos, nunca por `md5sum <arquivo>` cru:
> `git -C <worktree> hash-object <caminho>` = `git rev-parse 12c3825:<caminho>` (blobs `e352c6c…` e `9be7caf…`),
> ou `sed 's/\r$//' <worktree>/<caminho> | md5sum` = os md5 acima. Depois de MUTAR e restaurar, use a mesma forma.
> Um md5 cru divergente aqui é fim de linha, não mutação — mas `git status --porcelain` sujo continua sendo mutação.
**Se você MUTAR arquivo, crie worktree próprio** (`git worktree add`) — não meça no compartilhado.

## Composição (5 cadeiras, unanimidade, todas frescas)

| Cadeira | Agente | Veto | Cobre |
|---|---|---|---|
| Banco, locks, triggers | `jurado-c4-banco-triggers` | ✓ | C1 camada de banco |
| Ataque ao dinheiro | `jurado-c4-ataque-ao-dinheiro` | ✓ | B-1 pela rota HTTP |
| Arnês concorrente | `jurado-c4-arnes-concorrente` | | forma da medição, 2 ordens |
| Fail-closed / enumeração | `jurado-c4-fail-closed-enumeracao` | | C2 (deriva do mapa ou teatro?) |
| Validador diff × plano | `jurado-c4-validador-diff-plano` | ✓ | §5, divergência, propriedades |

**Suplentes nomeados** (se uma cadeira cair por erro de infra, o suplente re-executa o briefing
inteiro; voto perdido NUNCA conta — a junta só fecha com 5 votos válidos): a `agente-fabrica` cria um
suplente sob medida da mesma competência, com identidade nova. Nenhum re-disparo de identidade queimada.

## Insumos (todos commitados, árvore limpa)

1. Ata do ciclo 3: `agent-orchestration/omega/juntas/J-B-O6R-02-ciclo3.md`
2. Parecer do crítico: `agent-orchestration/omega/reprovacoes/R-B-O6R-02-ciclo3-premissa.md`
3. Pesquisa: `docs/omega-pd.md` → `PD-O6R-B02-EXAUSTIVIDADE` (24 fontes)
4. Plano do ciclo 4: `agent-orchestration/omega/planos/B-O6R-02-ciclo4-plano.md`
5. **Divergência registrada pelo dev:** `agent-orchestration/controle/pendencias.md →
   D-DIVERGENCIA-C4-PONTA-AUSENTE` — o C4.1 reabre um teste do ciclo 3; o dev implementou o plano e
   registrou para a junta decidir. **Não é defeito de terreno; é insumo de julgamento.**

## O que o ciclo 4 promete fechar (as 5 propriedades) — TODAS [A RE-VERIFICAR]

- **C1 (B-1):** a corrida `delete×reverse` não fabrica mais dinheiro. O dev reporta **19/20 → 0/30 nas
  duas ordens de disparo**. [A RE-VERIFICAR por execução sua, nas DUAS ordens — uma ordem só dá
  verde-cego.]
- **C2 (B-2):** os detectores derivam de `FINANCIAL_ENTRY_FIELD_CLASS` (o valor da classificação ganhou
  consumidor). [A RE-VERIFICAR: classifique errado e meça se nasce permitido.]
- **C3 (B-3-novo):** o harness assere prova de vida da fixture (no-op fica vermelho). [A RE-VERIFICAR.]
- **C4 (B-4):** ponta declarada ausente do razão = ERRO nos 5 status. [A RE-VERIFICAR — passava em 4/5.]
- **C5 (B-5):** o contrato datado só afirma o que a execução sustenta; o KPI falso do `node --test
  <inexistente>` foi corrigido com a FORMA. [A RE-VERIFICAR: é exit 1 no Node 20, não exit 0.]

## Afirmações da ata do ciclo 3 que você NÃO herda como fato

- **"A premissa birth-fixed se sustenta / pre-checks livres de corrida por construção"** (ata do ciclo
  2): **FALSA**, o crítico e o dba a derrubaram por execução. [A RE-VERIFICAR se o ciclo 4 fechou.]
- **"B-3 fechado"** (job seedless passa): reportado 2745/2743/0/2 na forma canônica 3. [A RE-VERIFICAR.]

## Regras de execução (não são decorativas)

- Nenhuma afirmação de comportamento sem execução. Mutação restaurada com **md5**.
- `comando | tail` devolve o código do `tail` — redirecione para arquivo (`cmd > arq 2>&1; ec=$?`).
- **N e forma sempre juntos.** Node **20.19.5** (o da CI); outro Node, declare.
- Banco: **cluster descartável seu**, derrubado no fim; a base viva `erp-postgres` não é alvo.
- Voto **APROVADO** ou **REPROVADO**, com evidência que VOCÊ executou. Unanimidade 5/5 — seu voto
  sozinho reprova. Não proponha correção (§C7.4-bis).
