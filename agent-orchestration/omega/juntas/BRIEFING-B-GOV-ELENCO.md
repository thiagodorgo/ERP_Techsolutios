# BRIEFING — junta do bloco `B-GOV-ELENCO`

> **PASSADA 2.** A passada 1 foi **BLOQUEADA** pelo `inspetor-de-terreno-da-junta`
> (`votos/B-GOV-ELENCO/00-inspetor-terreno-passada1.md`): item **1.2** — três jurados apontados para um único
> worktree, com uma bateria que **exige injeção de defeito** (A4, C2, C3). Isso é a contaminação dos ciclos
> 2 e 3 armada de antemão. Corrigido no **§7** abaixo. As ressalvas **R1–R5** dele estão incorporadas e
> marcadas.

**Branch:** `chore/gov-auditoria-elenco` · **Base:** `origin/main` = `fe2748c8` · **Worktree:**
`.claude/worktrees/gov-elenco`
**Plano (§5 escopo, §5-bis proibido, §6 critérios A1–A10, §8 quórum):**
`agent-orchestration/omega/planos/B-GOV-ELENCO-plano.md`
**Quórum:** **unanimidade de 3** — justificado no §8 do plano.

**Head a julgar (R1).** É o **head da branch no momento do seu voto** — meça-o você mesmo
(`git -C <wt> rev-parse HEAD`) e **registre o hash no seu voto**. Um briefing não pode nomear o commit que o
contém, e por isso a numeração de commit de registro se move. O que está **medido e fixo**: o head de
**código e elenco** é `25c0112a`; tudo depois dele é **registro** (briefing, ata, votos). Se
`git -C <wt> diff --name-only 25c0112a..$(git -C <wt> rev-parse HEAD)` mostrar **qualquer** caminho fora de
**`agent-orchestration/`**, isso é achado `dentro-do-bloco` e **bloqueia**.

> **Correção da passada 3 (o inspetor pegou, e o erro era meu).** Esta regra dizia
> `agent-orchestration/omega/juntas/` — prefixo **falso**, porque o próprio commit `23285d2d` mexeu em
> `agent-orchestration/controle/pendencias.md` para registrar `P-GOV-AUDITOR-FORA-DA-CI`, que nasceu da
> ressalva R3 do inspetor. Aplicada como escrita, ela mandaria vocês reprovarem um caminho que o §5 do
> plano **permite** — reprovação por construção, a classe de bloqueante que a auditoria de 28/08 mediu
> em **11 de 16**. O prefixo correto é `agent-orchestration/` (registro do bloco: plano, briefing, atas,
> votos, decisões e pendências). Medido no head desta passada: **0 caminhos fora dele**.

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

Documentados **no corpo do script**; confira que o conserto é real, não texto:

- **CRLF.** Em JavaScript `.` **não casa `\r`**; `/(.*)$/` sem flag `m` falha em linha CRLF. A v1 reportou
  "sem `name`/`description`/`model`" em `planejador-mestre.md` e `porteiro-pos-merge.md` — **6 falsos-positivos**.
- **Bloco cercado.** A varredura de links pegava links dentro de ```` ```markdown ```` do `skill-creator`, que
  são **exemplos de documentação** — **6 falsos-positivos**.

**Achado falso é pior que achado nenhum.** Terceira classe de falso-positivo = achado `dentro-do-bloco` que
**bloqueia**.

## 3 · Critérios de aceite — §6 do plano, A1..A10

Publique **N e forma** de cada medição. "Verde" sem N e sem forma não é prova.

**A4 tem forma obrigatória (R5).** A prova de que o C8 ainda pega link quebrado de verdade é: numa **cópia
isolada** (§7), acrescentar a UMA `SKILL.md` a linha `[teste](references/NAO-EXISTE.md)`, rodar o auditor,
exigir **exatamente 1** achado `C8 link quebrado` nomeando aquele arquivo; desfazer; rodar de novo e exigir
**0**. Publique os dois números. O mesmo padrão vale para as mutações de C2 e C3.

**Controle já medido pelo inspetor, que você pode repetir:** o auditor contra a **base**
(`node scripts/audit-agents-skills.mjs --ref fe2748c8`) sai **ec=1 com 6 BLOQUEIA** — prova que ele *vê* o
defeito que o bloco corrige, e não que ficou verde por não olhar.

## 4 · Onde os gates rodam — CORRIGIDO (R3)

A versão anterior deste briefing afirmava que o auditor roda em CI. **Falso, e medido:**
`.github/workflows/ci.yml` l.69-70 roda **somente** `node scripts/sync-agent-agents.mjs --check`;
`grep -c 'audit-agents-skills\|sync-agent-skills' .github/workflows/ci.yml` → **0**.

Portanto, hoje: **`sync-agent-agents --check` é gate de CI**; **`audit-agents-skills.mjs` e
`sync-agent-skills --check` são gates MANUAIS**. `.github/**` está no escopo **PROIBIDO** (§5-bis), então
este bloco não pode colocá-los lá — virou `P-GOV-AUDITOR-FORA-DA-CI`. **Se isso basta ou não é MÉRITO** (é
pergunta legítima para C3): julgue e vote. O que não se admite é receber a afirmação errada como fato.

## 5 · Reprovação POR CONSTRUÇÃO (cobrar isto é reprovar sem defeito)

- **`.gitignore`** — proibido (§5-bis), embora a auditoria tenha achado que `.claude/worktrees/` não é
  ignorado. Mexer nele afeta os **dois worktrees de outras sessões vivos agora**. Virou
  `P-GOV-WORKTREES-NAO-IGNORADAS`.
- **`.github/**`** — proibido. Ver §4: pôr o auditor na CI é o próximo bloco, não este.
- **`src/`, `tests/`, `prisma/`, `frontend/`, `mobile/`** — proibidos. Exigir teste novo em `tests/` é
  reprovar sem defeito.
- **`npm run check`/`test`/`build` locais** — o §7 do plano declara por que não rodam aqui. O inspetor,
  ainda assim, executou os **4 testes que leem artefatos tocados** (`kpi-dashboard-charts` 16/16,
  `kpi-achados-paridade` 6/6, `kpi-dashboard-contraste` 6/6, `agents-mirror-guard` 12/12, ec=0 nos quatro),
  usando o `tsx` da árvore principal **por caminho absoluto**, sem instalar nada e sem junction. Você pode
  repetir; cobrar `npm ci` no worktree é cobrar o que §C7.1-ter(c) desaconselha e o disco não comporta.
- **`blockchain-developer`** voltou a carregar e não tem relação com o produto — `P-GOV-SKILLS-RELEVANCIA`,
  decisão do dono; remover skill instalada não é ato de agente.

## 6 · Declare `escopo` em todo achado

`dentro-do-bloco` | `pre-existente`, **com evidência de data ou origem** (§C7.1-ter(a)). Escopo sem evidência
é tratado como `dentro-do-bloco`. **"Não consigo medir" = REPROVADO.** Não proponha correção (§C7.4-bis) —
reporte defeito, evidência executada e motivo.

## 7 · ISOLAMENTO — obrigatório, e o que destravou a passada 2

**O worktree `.claude/worktrees/gov-elenco` é SOMENTE-LEITURA para todo jurado.** Ali você lê, roda o auditor
sem mutar, e mede. **Nenhum jurado escreve nele — com UMA exceção: os seus próprios arquivos em**
`agent-orchestration/omega/juntas/votos/<bloco>/`, que o P1/P2 do §C7.7 **mandam** você escrever.
(Correção pós-homologação nº 1: a redação anterior dizia "nenhum jurado escreve" sem ressalva e
contradizia o protocolo que obriga o jurado a gravar evidência e voto. O assento permanente pegou.)

**Publique no seu voto a versão do Node e o `core.autocrlf`** — nenhuma das três cadeiras do ciclo 1
publicou a versão do Node, e "N sem forma" é a metade do que o §C7.7 chama de verde-cego. Ao terminar, `git -C <wt> status --porcelain` tem de estar
**vazio** — se você o encontrar sujo, **pare e reporte anomalia de terreno**; não contorne e não limpe: pode
ser mutação viva de outro jurado.

**Toda prova por mutação roda em CÓPIA ISOLADA E PRÓPRIA.** O auditor deriva `ROOT` de `import.meta.url`
(`scripts/audit-agents-skills.mjs`), então uma cópia autocontida audita a si mesma. Receita:

```bash
WT=/c/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/gov-elenco
MEU=$(mktemp -d)                       # fora do repo, só seu
mkdir -p "$MEU/scripts"
cp "$WT/scripts/audit-agents-skills.mjs" "$MEU/scripts/"
cp -r "$WT/.claude" "$WT/.agents" "$MEU/"
cd "$MEU" && node scripts/audit-agents-skills.mjs      # baseline da SUA cópia: ec=0
# ... mute o que precisar aqui dentro, meça, e no fim:
rm -rf "$MEU"
```

**Sem `git worktree add`** para isto: worktree extra tem o risco de remoção que já mutilou `node_modules`
nesta máquina (§C7.1-ter(c)), e a cópia por `cp` resolve o mesmo problema com `rm -rf` de um diretório fora
do repo. **Sem junction, sem symlink, sem `npm ci`.** Declare no seu voto **onde** você mutou.

**Duas precisões medidas pelo inspetor na passada 2** (ele executou a receita: `0 → 1 → 0` na cópia,
`0 → 0 → 0` no worktree): (a) rode a receita **a partir do worktree** — ali `.claude/` tem só `agents/` e
`skills/`; a partir da árvore principal, `cp -r .claude` arrastaria `.claude/worktrees/` inteiro. (b) A cópia
leva só o que o auditor **lê**; se a sua mutação for em `CLAUDE.md`, `AGENTS.md` ou `Kpis/*`, copie-os também.

## 8 · Plano de perda de jurado (R2)

Quórum é **unanimidade de 3**: um voto perdido não é aprovação nem reprovação. Se uma cadeira cair por infra
(limite de sessão, rede, API):

1. **Re-disparo da MESMA identidade**, uma vez — o corpo é permanente e não há memória de bloco a perder.
2. Caindo de novo, o orquestrador **registra o voto perdido na ata**, nomeando a cadeira e o erro.
3. **A junta NÃO fecha com menos de 3 votos de mérito.** Sem os três, o bloco não merga — não existe
   "aprovado por maioria dos presentes" sob unanimidade.
4. O `cadeira-permanente-backend-review` **homologa depois**, e a perda entra na medição dele.

## 9 · Papéis (§C7.4-bis)

| Papel | Quem |
|---|---|
| Quem ACHOU | o auditor novo + o orquestrador que o rodou |
| Quem PLANEJOU | orquestrador (plano nasceu da medição; as 2 decisões foram do dono) |
| Quem DESENVOLVEU | orquestrador |
| Quem JULGA | **C1** `validador-mestre` · **C2** `guardiao-fail-closed` · **C3** `agente-ci-doutor` |
| Quem HOMOLOGA | `cadeira-permanente-backend-review` (§C7.1-quater — primeira aplicação real) |

> **Nota de composição, confirmada pelo inspetor:** achar/planejar/desenvolver caíram no **mesmo
> orquestrador**. O §C7.4-bis exige a separação em três agentes **no ciclo de REPROVAÇÃO** ("todo ciclo de
> reprovação distribui…"); este é o **ciclo 1**, o fluxo normal do §C2, e a proteção que a regra busca existe
> aqui: **nenhuma das quatro cadeiras escreveu uma linha deste diff**. Duas condições ficam registradas:
> (i) **se a junta reprovar, a correção vai para agente distinto do orquestrador**; (ii) esta nota entra na
> ata. Registre-se também que o "achador" é **em parte a própria ferramenta sob julgamento** — motivo a mais
> para a cadeira C3 existir.

> **R4 — o rascunho ao lado.** A árvore principal (`demo/investidor`, `d1fab3bc`) tem 14 ` M` + 45 `??`,
> e 9 dos ` M` são mutações reais, **incluindo uma versão RASCUNHO do próprio §C7.1-quater**. É o que o §2(a)
> do plano mandou não confiar. **Todo comando seu usa `git -C <wt>` ou caminho absoluto**, e seu voto registra
> o `rev-parse` que você mediu. Não toque naquela árvore.
