# R-B-GOV-ELENCO-ciclo1 — registro da reprovação do ciclo 1 (§C7.4 item 3)

> **Bloco:** `B-GOV-ELENCO` (governança do elenco de agentes e das skills) · **Ciclo:** 1 ·
> **Data do voto:** 2026-09-07 · **Ata:** `agent-orchestration/omega/juntas/J-B-GOV-ELENCO.md` ·
> **Head julgado:** `918f5a01` (código do elenco em `25c0112a`) · **Base:** `origin/main` = `fe2748c8` ·
> **Veredito:** **REPROVADO 3×0** (unanimidade de 3, `D-QUORUM-B-GOV-ELENCO`) · **Homologação do assento:**
> HOMOLOGADO COM RESSALVA (5 ressalvas).
>
> **Por que este arquivo existe, e por que ele não existia.** O §C7.4 manda registrar cada ciclo de
> reprovação em `omega/reprovacoes/R-<entrega>-<ciclo>.md`. O ciclo 1 **não criou o dele** — e a causa é
> mecânica, não descuido: o §5 do plano do ciclo 1 não listava `agent-orchestration/omega/reprovacoes/**`
> no escopo permitido, então criar o arquivo teria sido violação de escopo. O plano do ciclo 2 corrigiu o
> §5.1 e este arquivo é a primeira consequência.

---

## 1 · O que o ciclo 1 entregou

| Frente | Entrega |
|---|---|
| Skills | 5 `SKILL.md` que estavam **um nível fundo** (`.claude/skills/X/X/SKILL.md`) achatados por `git mv` — 32 renames R100 nas duas árvores, provados por hash de blob |
| Elenco efêmero | 15 especialistas de blocos encerrados aposentados (30 deleções), com registro nominal em `agent-orchestration/controle/aposentadoria-especialistas.md` |
| Índice do Codex | `.agents/agents/README.md` reconciliado |
| Ferramenta | `scripts/audit-agents-skills.mjs` — 10 checagens C1–C10, sem dependência nova, lendo BLOB do Git |
| Governança | assento permanente da junta (`D-CADEIRA-PERMANENTE-JUNTA`), com hunks em `CLAUDE.md`, `AGENTS.md`, `inspetor-de-terreno-da-junta`, `porteiro-pos-merge` |
| KPI | `blocks_completed` 161 → 162 |

**O que passou inteiro nas três cadeiras:** os critérios A1–A10 do briefing, 118 caminhos sem um fora do
§5, 32/32 renames verificados por hash, 15/15 aposentadorias conferidas contra o commit citado.

## 2 · O que cada cadeira achou (o que reprovou)

| Cadeira | Identidade | Achados que pesaram |
|---|---|---|
| **C1** | `validador-mestre` | `C1-01` (ALTA) o painel se contradiz na mesma carga: `blocks_completed` com `value: 162` e `display: "161"` — o card que o dono abre dizia 161, o gráfico 162; o FROZEN propagava o erro para `file://` e nenhum guard compara card × value. `C1-02`/`C1-03`/`C1-04` (BAIXA): "5 de 12 skills" atribuído a uma base que tem 11; "6,6 KB" que não se reproduz por método nenhum; tabela de especialistas com cabeçalho e zero linhas. `C1-05` (MÉDIA, **pre-existente**): nota do README medindo `34 agentes` em 2026-09-05 e publicando como "medido neste head" |
| **C2** | `guardiao-fail-closed` | `C2-02` (BLOQUEIA) três desfechos do assento sem veredito definido, e "não medi" roteado para o lado permitido. `C2-01` (ALTA, textual) a negação nomeava só `ANULADO` — denylist onde tinha de haver allowlist. `C2-06` anulação sem teto. `C2-03` merge sem guarda no meio. `C2-04` trava 3.3 sem artefato |
| **C3** | `agente-ci-doutor` | `C3-A1` (BLOQUEIA) a checagem C4 — a única que faz cumprir o §C7.4-bis — reconhecia papel por **regex de prefixo de nome**: via 11 dos 24 e era cega a 13, **inclusive à própria cadeira que julgava o bloco**; a mutação `Write, Edit, NotebookEdit` em `agente-ci-doutor.md` saiu `OK`, `ec=0`. `C3-A4` (BLOQUEIA) terceira classe de falso-positivo (cerca recuada, cerca de til, code span, YAML multi-linha). `C3-A2` (ALTA) escrita medida por lista fechada de 3 nomes, e o §4.4 do plano publicando "§C7.4-bis respeitado **por construção**" a partir desse instrumento cego. `C3-A3`, `C3-A5`, `C3-A6`, `C3-A7` |

**A classe do defeito, em uma frase:** o bloco entregou uma ferramenta de medição e **afirmou, com base
nela, coisas que ela não media**. Foi isso que reprovou — não a faxina.

## 3 · Quem ocupou cada papel no ciclo 1 (§C7.4-bis)

| Papel | Quem |
|---|---|
| Planejou | orquestrador |
| Desenvolveu | orquestrador |
| Achou | `validador-mestre` (C1) · `guardiao-fail-closed` (C2) · `agente-ci-doutor` (C3) |
| Gate de terreno | `inspetor-de-terreno-da-junta` — **3 passadas**: BLOQUEADO, correção, `LIBERADO` |
| Homologou | `cadeira-permanente-backend-review` (primeira aplicação real do assento) |

**A resposta honesta à pergunta (b) do §C7.4-bis:** no ciclo 1, **quem planejou foi quem desenvolveu**. É
exatamente a configuração que o §C7.4-bis existe para desfazer, e o ciclo 2 a desfaz: planejador
(`planejador-mestre`, Fable), dev (`dev-gov-elenco-c2`, identidade nova, não-orquestrador) e cadeiras de
mérito novas, nenhuma delas votante do ciclo 1.

## 4 · O que o ciclo 2 faz

O plano é `agent-orchestration/omega/planos/B-GOV-ELENCO-ciclo2-plano.md`. Duas decisões estruturais:

1. **FATIAR** (§1 do plano). O ciclo 1 misturou a faxina — que passou inteira nas três cadeiras — com o
   desenho do assento e o instrumento, que foram reprovados. Sob `D-TETO-DOIS-CICLOS` ("não há ciclo 3"),
   deixar a parte provada refém da parte reprovada é assimetria de risco sem contrapartida. **Fatia A**
   (esta): faxina + auditor corrigido + KPI. **Fatia B**: o assento, com PR, crítico e junta próprios.
2. **Todo critério de aceite acompanhado da mutação que o deixa vermelho** (§7 do plano). O ciclo 1 caiu
   por afirmação que não sobreviveu à execução; verde sem controle deixou de valer.

**Teto.** As duas fatias são **o ciclo 2 do mesmo bloco**. Reprovação em qualquer uma = parada daquela
fatia e dossiê ao dono. **Não existe ciclo 3** (`D-TETO-DOIS-CICLOS`).

## 5 · Onde estão as provas

- Ata: `agent-orchestration/omega/juntas/J-B-GOV-ELENCO.md`
- Votos e evidências: `agent-orchestration/omega/juntas/votos/B-GOV-ELENCO/{C1,C2,C3}-voto.json` e `*-evidencia.md`
- Gate de terreno (3 passadas): `.../00-inspetor-terreno-passada1.md`, `.../00b-inspetor-passada2.md`, `.../00c-inspetor-passada3.md`
- Quedas de agente: `.../00-quedas.md`
- Homologação do assento: `.../99-cadeira-permanente.md` (+ evidência)
- Plano do ciclo 1 (com o **Apenso 1**, que corrige as afirmações que a junta derrubou): `agent-orchestration/omega/planos/B-GOV-ELENCO-plano.md`
- Evidência do dev do ciclo 2, fatia A: `.../votos/B-GOV-ELENCO/DEV-A-evidencia.md`
