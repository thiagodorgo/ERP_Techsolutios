# BRIEFING — junta do bloco `B-GOV-ELENCO`

**Head a julgar:** `25c0112a` · **Base:** `origin/main` = `fe2748c8`
**Branch:** `chore/gov-auditoria-elenco` · **Worktree:** `.claude/worktrees/gov-elenco`
**Plano (com §5 escopo e §6 critérios):** `agent-orchestration/omega/planos/B-GOV-ELENCO-plano.md`
**Quórum:** **unanimidade de 3** — justificado no §8 do plano (o bloco reescreve a regra da própria junta e
remove 15 arquivos; não é dinheiro/segurança/permissão/perda de dado no produto, mas o quórum sobe por
decisão registrada, não por interpretação silenciosa).

> **Rode tudo a partir do worktree** `.claude/worktrees/gov-elenco`. Ele **não tem `node_modules`** — e isso
> é deliberado: junction/symlink de `node_modules` entre worktrees é **PROIBIDA** (§C7.1-ter(c); em 26/08 a
> remoção de um worktree apagou o `node_modules` do dev por dentro de uma junction). O auditor deste bloco
> usa **só builtins do Node e o Git**. Se você precisar de `npm`, **isso é achado, não conserto**: reporte.

---

## 1 · O que o bloco fez, em uma frase por peça

1. **`scripts/audit-agents-skills.mjs`** — auditor mecânico do elenco e das skills, 10 checagens C1–C10, zero
   dependência, lendo **BLOB** do Git quando o alvo é um commit.
2. **5 skills achatadas** — tinham `SKILL.md` em `.claude/skills/X/X/`, e por isso **nunca carregaram**.
3. **15 especialistas aposentados** — blocos `B-O6R-02` (#371) e `B-O6R-07b` (#380), encerrados. Registro
   nominal em `agent-orchestration/controle/aposentadoria-especialistas.md`.
4. **Assento permanente** — `cadeira-permanente-backend-review` + `CLAUDE.md` §C7.1-quater / §C2.6-bis
   (espelhados em `AGENTS.md`), com as duas travas fail-closed (`inspetor` 3.3, `porteiro` 5-bis).
5. **Índice do Codex reconciliado** — `.agents/agents/README.md`: 24 listados = 24 arquivos.
6. **KPI** — `blocks_completed` 161→162, backfill do `B-O6R-07b`, `FROZEN` regenerado.

## 2 · Os dois defeitos que a própria ferramenta teve — e que já estão consertados

Estão documentados **no corpo do script**, e você deve conferir que o conserto é real, não texto:

- **CRLF.** Em JavaScript `.` **não casa `\r`**; `/(.*)$/` sem flag `m` falha em linha CRLF. A v1 reportou
  "sem `name`/`description`/`model`" em `planejador-mestre.md` e `porteiro-pos-merge.md` — dois agentes
  válidos, só CRLF no disco sob `core.autocrlf=true`. **6 falsos-positivos.**
- **Bloco cercado.** A varredura de links pegava links dentro de ```` ```markdown ```` do `skill-creator`, que
  são **exemplos de documentação**. **6 falsos-positivos.**

**Achado falso é pior que achado nenhum** — entra em ata com a mesma cara de um verdadeiro. Se você achar uma
terceira classe de falso-positivo, é achado `dentro-do-bloco` e **bloqueia**.

## 3 · Critérios de aceite — §6 do plano, A1..A10

Publique **N e forma** de cada medição. "Verde" sem N e sem forma não é prova.

## 4 · Reprovação POR CONSTRUÇÃO (cobrar isto é reprovar sem defeito)

- **`.gitignore`** está no escopo **PROIBIDO** (§5-bis do plano), embora a auditoria tenha achado que
  `.claude/worktrees/` não é ignorado. Virou `P-GOV-WORKTREES-NAO-IGNORADAS`. Mexer nele afetaria os dois
  worktrees de outras sessões que estão vivos agora.
- **`src/`, `tests/`, `prisma/`, `frontend/`, `mobile/`, `.github/`** — proibidos. Exigir teste novo em
  `tests/` é reprovar sem defeito; o guard deste bloco **é o próprio auditor**, e ele roda em CI pelo
  `sync-agent-agents --check` já existente mais o comando do §6.
- **`npm run check`/`test`/`build`** não rodaram localmente, e o §7 do plano diz por quê (worktree sem
  `node_modules`, disco escasso, e **zero arquivo de `src/`/`tests/` tocado** — provado, não afirmado).
  Cobrar a suíte local é cobrar o que o plano declarou que não faria; a suíte roda na CI do PR.
- **`blockchain-developer`** voltou a carregar e não tem relação com este produto — está em
  `P-GOV-SKILLS-RELEVANCIA`, é decisão do dono, e **remover skill instalada não é ato de agente**.

## 5 · Declare `escopo` em todo achado

`dentro-do-bloco` | `pre-existente`, **com evidência de data ou origem** (§C7.1-ter(a)). Escopo sem evidência
é tratado como `dentro-do-bloco`. **"Não consigo medir" = REPROVADO.** Não proponha correção (§C7.4-bis) —
reporte defeito, evidência executada e motivo.

## 6 · Papéis (§C7.4-bis)

| Papel | Quem |
|---|---|
| Quem ACHOU | o auditor novo + o orquestrador que o rodou |
| Quem PLANEJOU | orquestrador (plano nasceu da medição; as 2 decisões foram do dono) |
| Quem DESENVOLVEU | orquestrador |
| Quem JULGA | **C1** `validador-mestre` · **C2** `guardiao-fail-closed` · **C3** `agente-ci-doutor` |
| Quem HOMOLOGA | `cadeira-permanente-backend-review` (§C7.1-quater — primeira aplicação real) |

> **Nota honesta de composição, para a ata:** achar, planejar e desenvolver caíram no **mesmo orquestrador**
> — o §C7.4-bis separa esses papéis **no ciclo de reprovação**, e este é o ciclo 1. É exatamente por isso que
> as três cadeiras de mérito **e** o assento permanente são independentes: nenhuma delas escreveu uma linha
> deste diff. Se a junta reprovar, a correção **vai para outro agente**.
