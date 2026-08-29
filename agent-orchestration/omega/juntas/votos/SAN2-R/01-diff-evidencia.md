# Evidência — cadeira 1 (DIFF, ESCOPO e ESPELHO) — junta SAN2-R

**Jurado:** identidade nova, cadeira de diff/escopo/espelho (veto) · **head julgado:** `48dc863` · base `74430cc` · 2026-08-29.
Nota de terreno: o head subiu de `4b547e3` (medido pelo inspetor) para `48dc863`; delta medido = só o parecer
do inspetor + apenso de evidência (registro de junta puro, padrão R1/R3 do parecer). `git merge-base
--is-ancestor 4b547e3 48dc863` → ec=0 (história linear).

## Item 1 — diff de código de produto VAZIO

- `git diff 74430cc..48dc863 --stat -- src prisma tests scripts frontend mobile .github package-lock.json`
  → **saída vazia, exit 0**. Zero código de produto: o quórum maioria-de-3 sustenta-se no head REAL da junta.
- `git diff 74430cc..48dc863 --name-status` → **12 arquivos**, todos nas classes permitidas:
  - `M` CLAUDE.md · AGENTS.md (contratos espelhados)
  - `M` Kpis/app.js · Kpis/kpis-history.json · Kpis/kpis-latest.json
  - `M` agent-orchestration/controle/decisoes.md
  - `A` agent-orchestration/omega/POSTMORTEM-QUEDAS-2026-08-29.md
  - `A` agent-orchestration/omega/juntas/BRIEFING-SAN2-R.md · PROTOCOLO-JUNTA-RESILIENTE.md
  - `A` agent-orchestration/omega/juntas/votos/SAN2-R/{00-quedas.md, 00a-inspetor-evidencia.md, 00a-inspetor-parecer.md}
- Nada fora de `agent-orchestration/**`, `Kpis/*`, `CLAUDE.md`, `AGENTS.md`. Nenhum lockfile, nenhum
  `prisma/**`, nenhum `.github/**`.

**Veredito parcial item 1: PASSA.**

## Item 2 — os dois contratos dizem a mesma coisa

- **§C7.7** extraído dos dois contratos em `48dc863` (awk do marcador `7. **Protocolo de junta resiliente`
  até `5. **Paradas imediatas`, 26 linhas cada — o bloco arrasta o §C7.4-bis junto, pois no arquivo o item 7
  foi inserido entre o 4 e o 4-bis): `diff` → **VAZIO, ec=0. Byte-idênticos**, §C7.4-bis incluído.
- **§C7.4 (teto de DOIS ciclos)**: presente nos DOIS (`D-TETO-DOIS-CICLOS` → 1 hit em cada). `diff` dos dois
  blocos §C7.4 → **1 divergência de redação**: CLAUDE.md diz "A `agente-fabrica`"; AGENTS.md diz "A fábrica
  de agentes" (+ requebra de linha). Julgamento: `agente-fabrica` é subagente de `.claude/agents/` —
  mecanismo específico do Claude Code; a regra de espelhamento (§A2/D-INTEROP) permite diferença
  **estritamente específica da ferramenta (invocação de subagentes)**. Conteúdo normativo idêntico.
  **Não bloqueia** (achado menor registrado no voto).
- **Teto antigo de 5 sumiu dos DOIS**: `grep -nE "ciclo 5 falho|teto 6 agentes|CRIAR AGENTES ANTES DE
  PARAR|junta ampliada replaneja"` → **ec=1 (zero hits) nos dois**. Os únicos hits de "ciclo 5" restantes
  são a menção histórica DENTRO do §C7.4 novo ("REVOGA o teto de 5 ciclos…", "o B-O6R-02 chegou ao ciclo 5"),
  conferida por leitura do contexto (CLAUDE.md:335-355; AGENTS.md:363-380) — é justificativa, não norma.

**Veredito parcial item 2: PASSA** (1 achado menor, não bloqueante).

## Item 3 — decisões existem e apontam certo

- `git ls-tree 48dc863` → **existem no commit**: `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md`
  e `agent-orchestration/omega/POSTMORTEM-QUEDAS-2026-08-29.md` (cabeçalhos lidos; um referencia o outro).
- `decisoes.md@48dc863`: **`D-TETO-DOIS-CICLOS`** (linha 1748, decisão literal do dono + revogação explícita
  do teto de 5) e **`D-JUNTA-RESILIENTE`** (linha 1794, P1–P6 + errata de lição) — entradas completas, não
  menções soltas. Ambas apontam para os artefatos certos.
- **§C7.7 referencia pelos caminhos certos**: `PROTOCOLO-JUNTA-RESILIENTE.md` com o caminho explícito
  `agent-orchestration/omega/juntas/` (bate com o ls-tree) e o postmortem como
  `omega/POSTMORTEM-QUEDAS-2026-08-29.md` — atalho `omega/…` relativo a `agent-orchestration/`, a MESMA
  convenção que o §C7.4 já usa (`omega/reprovacoes/R-<entrega>-<ciclo>.md`); resolve para o arquivo existente.

**Veredito parcial item 3: PASSA.**

## Conclusão da cadeira

3/3 itens PASSAM por execução. 1 achado menor não bloqueante (redação `agente-fabrica` × "fábrica de
agentes" no §C7.4 — classe de diferença permitida pela regra de espelhamento: invocação de subagente é
mecanismo específico do Claude Code). Voto: `01-diff-voto.json`.
