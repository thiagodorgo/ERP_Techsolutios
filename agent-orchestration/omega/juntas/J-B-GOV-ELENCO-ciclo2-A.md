# J-B-GOV-ELENCO-ciclo2-A — ata da junta do `B-GOV-ELENCO`, ciclo 2, fatia A

> **Quórum:** unanimidade de 3 (`D-QUORUM-B-GOV-ELENCO`) · **Head de código:** `7facc396` ·
> **Head julgado:** `d2d25f6b` · **Base:** `origin/main` = `fe2748c8` · **Terreno:** `LIBERADO COM RESSALVA`
> (R1–R3 fechadas antes do disparo das cadeiras) · **Quedas:** 2, ambas de infraestrutura (ver §3).

---

## §1 · VEREDITO

**REPROVADO — 2×1.** Sob unanimidade de 3, um voto contrário reprova.

| Cadeira | Papel | Voto | Achados |
|---|---|---|---|
| **A-C1** `agente-secops` | escopo · registro · KPI | **APROVADO** | 1 `BAIXA` (`A-C1-01`) |
| **A-C2** `inspetor-de-arnes-concorrente` | o auditor mede o que diz? | **REPROVADO** | **`A-C2-02` e `A-C2-03` bloqueiam** · +1 `MÉDIA` · +2 `BAIXA` |
| **A-C3** `coordenador-de-acessos` | separação de poderes | **APROVADO** | 2 `MÉDIA` (`A-C3-01`, `A-C3-02`) |

**Este é o ciclo 2.** Pelo `D-TETO-DOIS-CICLOS` **não há ciclo 3**: a fatia A **para**, a fatia B (que
depende dela) **não começa**, e o desfecho é **dossiê ao dono** — `DOSSIE-B-GOV-ELENCO.md`.

---

## §2 · OS DOIS BLOQUEANTES

Os dois são `dentro-do-bloco` com evidência de origem executada pela própria cadeira: o script **não existe**
em `fe2748c8` (`git cat-file -e` falha) e nasce inteiro em `25c0112a`. Ambos com **prevalência 0 no head** —
são defeitos **latentes** do guard, não falhas ativas.

### `A-C2-02` · a recusa nomeada que o bloco prometeu não acontece — e o furo cai no `C4`

Uma linha `tools:` com **comentário no fim** (`Read, Grep, Glob, Bash  # só leitura`) produz:

```
[BLOQUEIA] C4 §C7.4-bis · .claude/agents/estrategista.md — ferramenta `Bash  # só leitura`
não é somente-leitura e o papel não está na allowlist de escrita
```

O nome de ferramenta reportado **inclui o comentário e não existe**. O esperado era a **recusa nomeada** —
*"não consigo ler o frontmatter, linha N"* — que o próprio plano promete no §3 e que a `description` do KPI
publica como entregue. Construção fora do subconjunto YAML declarado **não produz recusa: produz diagnóstico
falso**. A cadeira registra a atenuante: a direção da falha é **fail-closed** (vermelho falso, nunca verde
falso).

### `A-C2-03` · link CommonMark válido, para arquivo que EXISTE, reportado como quebrado

Destino entre `<` e `>` — **forma normativa do CommonMark 6.3** — é tratado como caminho literal, com os
sinais inclusos, e acusado. Instância irmã: destino com *query string* apontando para arquivo existente
também gera 1 `BLOQUEIA`. O plano §4.1.3 declara a gramática e **uma** limitação (recuo ≥ 4, que o §10.9
torna reprovação-por-construção); **a forma entre `<>` não aparece em lugar nenhum**.

### Por que bloqueiam, e por que a cadeira estava certa em fazê-lo

O briefing do ciclo 1 fixou — e o do ciclo 2 manteve — que **classe nova de falso-positivo é achado
`dentro-do-bloco` que bloqueia**. Foi por essa regra que o `C3-A4` bloqueou no ciclo 1, também com
prevalência 0. Aplicá-la agora é coerência; afrouxá-la porque desta vez ela dói **seria** mover a trave.

---

## §3 · O QUE PASSOU, E QUE A REPROVAÇÃO NÃO APAGA

**`A-C1` (escopo · registro · KPI) — APROVADO.** Mediu o head por conta própria (0 caminhos fora de
`agent-orchestration/` depois de `7facc396`), conferiu os 32 renames por hash de blob, amostrou as
aposentadorias, confirmou que a **ordem do dono não sumiu** entre fatias (`D-FALLBACK-MODELO-FABLE-OPUS`
presente em `chore/gov-elenco-fatia-b`; `D-QUORUM` mantida na A), e publicou **forma completa: Node
v20.19.5, `core.autocrlf=true`** — o que **nenhuma cadeira do ciclo 1 fez**, e que era ressalva do assento.

**`A-C3` (separação de poderes) — APROVADO**, com dois achados que valem mais que o voto:
- **`A-C3-01`** — a allowlist de escrita isenta `agente-devops-provisionador`, que **se auto-descreve como
  votante das juntas de infra** desde 2026-07-13. Existe, portanto, **um papel que julga e pode escrever** —
  a violação de SoD que eu pedi que ela procurasse. E o `N` publicado do aviso do `Bash` cai de **17 para
  16** quando se conta assim. `pre-existente` no mecanismo, `dentro-do-bloco` na publicação.
- **`A-C3-02`** — a **`EMENDA 2` é ato de planejamento assinado por quem não é o planejador** (o
  orquestrador). Ela reexecutou 4 mutações e confirmou: **não afrouxou propriedade nenhuma**. Fica o
  acúmulo de papel, não o dano.

**As três cadeiras concordaram no ponto que mais importava:** a `EMENDA 2` **não moveu a trave**. A `A-C1`
provou pelo caminho decisivo — o artefato passa no critério **antigo e no novo**; a `A-C2` reproduziu
34/6/1; a `A-C3` reexecutou 4 mutações. Se a emenda tivesse afrouxado, o artefato passaria só no novo.

**E o conserto central funcionou:** a `A-C2` mediu que o **default-deny fecha o `C3-A1` em 16 mutações** —
papel de nome qualquer com ferramenta de escrita **nasce negado**; ferramenta desconhecida é negada, não
ignorada.

---

## §4 · §C7.4-bis — QUEM OCUPOU CADA PAPEL (e desta vez os papéis foram distintos)

| Papel | Quem | Verificado por |
|---|---|---|
| Quem ACHOU | `validador-mestre`, `guardiao-fail-closed`, `agente-ci-doutor` (ciclo 1) + o assento | inelegíveis aqui; conferido por nome pelo inspetor |
| Quem PLANEJOU | `planejador-mestre` (**Fable**) | não implementou, não votou |
| Quem DESENVOLVEU | `dev-gov-elenco-c2` — **não é o orquestrador** | `A-C3` item 3 |
| Quem JULGOU | `agente-secops` · `inspetor-de-arnes-concorrente` · `coordenador-de-acessos` | nenhum votou no ciclo 1 |
| Gate | `inspetor-de-terreno-da-junta` — **rodou em Opus** (§5) | — |
| Orquestrador | briefing, ata, e **assinou a `EMENDA 2`** | `A-C3-02` registra o acúmulo |

**(a) A composição cobre a competência?** Sim, e provou-se: a cadeira que reprovou é justamente a de
**medição de arnês** — a competência que o achado exigia. **(b) Quem achou é quem consertou?** **Não.** O dev
é identidade distinta, não julgou achado nenhum, e **devolveu três decisões ao orquestrador** em vez de
resolvê-las sozinho. **(c) Dado podre?** Não: o dev mediu o estado em vez de presumir, e recusou-se a fazer
`semCodeSpans` ignorar linha que pareça cerca — seria código escrito para o teste.

---

## §5 · MODELO E QUEDAS (`D-FALLBACK-MODELO-FABLE-OPUS`, estreia)

O `inspetor-de-terreno-da-junta` é `model: fable` por contrato. **O limite de Fable da conta esgotou** no meio
da junta: o primeiro disparo morreu com `rate_limit` HTTP 429 (`model sent to the API: claude-fable-5-1`).
Aplicou-se a decisão do dono de 2026-09-07: **redisparo em Opus, declarado** — o parecer dele abre com a
seção "Modelo" registrando papel · modelo que rodou · motivo, e o `model: fable` **permanece no frontmatter**,
porque o fallback é do invocador. **Primeira aplicação real da política.**

Antes disso, o **dev da fatia A** caiu por limite de sessão em `claude-opus-5`, e foi retomado a partir da
própria `DEV-A-evidencia.md` — o P1/P3 do §C7.7 funcionando: a queda custou a cauda, não o trabalho.

**Nota que o dossiê leva ao dono:** batemos no limite do Fable **e** no do Opus na mesma rodada. A política
tem **um degrau só**; o que fazer quando o Opus acabar não está escrito.

---

## §6 · CONSEQUÊNCIA

`D-TETO-DOIS-CICLOS`, literal: *"Reprovou no ciclo 2 → PARA. Não há ciclo 3."* A fatia A **não merga**; a
fatia B **não começa**. Registro da reprovação em `omega/reprovacoes/R-B-GOV-ELENCO-ciclo2-A.md`; dossiê ao
dono em `agent-orchestration/omega/DOSSIE-B-GOV-ELENCO.md`, com o que foi entregue, o que cada junta achou, o
que foi corrigido, **por que a correção não bastou**, e as opções com custo.

**Nada foi pushado e nenhum PR foi aberto.** O trabalho vive em `chore/gov-auditoria-elenco` (`d2d25f6b`) e no
superset `chore/gov-elenco-fatia-b` (`c0cbfe10`), com o histórico inteiro preservado para a decisão do dono.
