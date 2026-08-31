# dev-log — SAN2-3 (`dev-san2-3`)

Worktree `.claude/worktrees/san2-r` · branch `chore/san2-3-obituario-especialistas` · head inicial `f56e453`.
Plano: `agent-orchestration/omega/planos/SAN2-3-plano.md` (308 linhas). Papel: **desenvolvedor** — não achou,
não planejou, não vota (§C7.4-bis). Regra: escrever **após cada passo** (comando → saída → estado).

---

## P0 — Leitura do plano e estado inicial

- `git status --short` → só `?? agent-orchestration/omega/planos/SAN2-3-plano.md` (o plano, untracked, é o
  único delta; árvore limpa).
- `git rev-parse HEAD` → `f56e453af6df8c0759d38d311eedff45b74e045d`; `git branch --show-current` →
  `chore/san2-3-obituario-especialistas`. **Bate com o mandato.**
- Plano lido inteiro (§1 a §8). Entregas: obituário 15+2 · 2–4 linhas no inspetor · backfill #363 ·
  dono real SAN2-5 nas 2 pendências · entrada KPI · ZERO descarte físico.
- `mkdir -p agent-orchestration/omega/juntas/votos/SAN2-3` → OK.

**Confirmação da reserva (mandato: "confirme os dois por leitura"), `J-B-O6R-ARNES.md` l.51-56, verbatim:**
> "O inspetor **BLOQUEOU** na 1ª passada: o corpo dele é o contrato de **outra junta** — mandato do ciclo 5
> do `B-O6R-02` (…). O titular novo nasceu em `bd0d700`; `jurado-c5-arnes-catalogo-postgres` ficou
> **intocado e reservado** para a junta do ciclo 5."

Estado: **reserva de `jurado-c5-arnes-catalogo-postgres` CONFIRMADA na fonte.** Falta confirmar
`critico-c5-adversarial` (§P1).

---

## P1 — Diagnóstico reconferido pelo executor (não copiado do plano)

**P1.1 — Onde vivem os arquivos.**
- `git ls-tree -r --name-only demo/investidor -- .claude/agents/especialistas/` → **17 arquivos**
- `git ls-tree -r --name-only demo/investidor -- .agents/agents/ | grep especialistas` → **os mesmos 17**
- `git ls-tree -r --name-only HEAD -- .claude/agents/ .agents/agents/ | grep -c especialistas` → **0**
Estado: §2.1/§2.2 do plano **CONFIRMADOS**. Descarte físico na `main` = no-op (nada existe lá).

**P1.2 — Commits de origem (`git log demo/investidor --diff-filter=A --name-only`), 5 commits:**
`1736727` 2026-08-25 (5 titulares c4) · `160a87f` 2026-08-28 (4 suplentes c4) · `77ead96` 2026-08-28
(`critico-c5-adversarial` + `jurado-c5-arnes-catalogo-postgres`) · `e74b469` 2026-08-28 (2 titulares + 3
suplentes ARNES) · `bd0d700` 2026-08-28 (`jurado-arnes-catalogo-postgres`, o titular que substituiu a
cadeira bloqueada). **5+4+2+5+1 = 17.**

**P1.3 — Mapa de participação (`grep -rl <nome> agent-orchestration/omega/`, os 17, um a um).** Resultado
integral colado na tabela do obituário. Achados relevantes:
- **`jurado-c5-arnes-catalogo-postgres` — RESERVADA, reconfirmada por segunda fonte.** Aparece em
  `votos/B-O6R-ARNES/01-jurado-arnes-catalogo.json` **l.2**, mas como MENÇÃO, não como autor. Verbatim do
  campo `"jurado"`: *"jurado-arnes-catalogo-postgres (TITULAR, identidade nova; …; a cadeira anterior
  jurado-c5-arnes-catalogo-postgres foi recusada pelo inspetor de terreno — contrato de outra junta (ciclo
  5 do B-O6R-02) — e **permanece reservada àquela junta**; nada dela foi herdado…)"*. **Nunca votou.**
- **`critico-c5-adversarial` — RESERVADA, e a evidência é MAIS FORTE do que o plano previa.** O §2.4 do
  plano diz que o `grep` só o acha no parecer do porteiro do #363. Medi também **4 ocorrências em
  `agent-orchestration/omega/planos/B-O6R-02-ciclo5-plano.md`** (l.10, 171, 230, 301), onde ele é o crítico
  nomeado do ciclo 5 que ainda não rodou. **Mesma conclusão (RESERVADA), evidência dobrada** — registrado
  como divergência-a-favor, não como contradição.
- **Ciclo 5 não rodou:** `ls juntas/ | grep -i ciclo5` → vazio; `ls votos/ | grep -i ciclo5` → vazio.
  Sepultar as duas reservadas destruiria a composição pronta do próximo bloco financeiro. **Não serão.**

**P1.4 — Vereditos dos dois casos, lidos na fonte.**
- `J-B-O6R-ARNES.md` l.3: **"APROVADO por maioria — 3 APROVADO · 0 REPROVADO"**, head `d4cf978` → final
  `0c37fa2`, PR #359, concluída 2026-08-28. Votos `01`/`02`/`03` em disco.
- `J-B-O6R-02-ciclo4.md` l.3: **"REPROVADO. Placar 4 APROVADO · 1 REPROVADO"**, head `12c3825`, concluída
  2026-08-28. Votos em disco: `01` (titular `fail-closed-enumeracao`) + `02`/`03`/`04`/`05` (4 suplentes) —
  **os outros 4 titulares caíram sem votar e foram substituídos**, exatamente como o plano mediu.

**Conta final conferida pelo executor: 15 SEPULTADAS (6 ARNES + 9 c4) + 2 RESERVADAS = 17.** A lista
herdada "16 queimados + 1 preservado" está **errada em 1 identidade**.

---

## TROCA DE EXECUTOR — o `dev-san2-3` anterior caiu por `server_error`

Sucessor assume em 2026-08-30, mesmo worktree (`san2-r`), mesma branch, head `f56e453`. **Termina**, não
recomeça. Conferência de herança feita antes de qualquer escrita:
- `git status --short` → 2 modificados (`.claude/agents/` + `.agents/agents/` do inspetor) e 3 untracked
  (`OBITUARIO-IDENTIDADES.md`, `votos/SAN2-3/`, `planos/SAN2-3-plano.md`). **Nada mais tocado** — KPI,
  `pendencias.md`, `decisoes.md` e o índice ainda intactos.
- `OBITUARIO-IDENTIDADES.md`: 144 linhas, 17 linhas numeradas na tabela — **15 `SEPULTADA` (6 ARNES +
  9 c4) + 2 `RESERVADA`**. As duas reservadas são as certas (`jurado-c5-arnes-catalogo-postgres` §3.3 l.92
  e `critico-c5-adversarial` l.93), cada uma com a citação literal da fonte. **Conta do §3.1: OK.**

## P2 — Compressão da inserção no inspetor (a pendência aberta na queda)

Estado herdado: `git diff --numstat .claude/agents/` → **`5 0`**; o §3.3 do plano manda **2–4 linhas**.
Reescrevi o 3.1-bis de 4 linhas de texto para **3**, preservando as cinco cláusulas: (1) o obituário é
**fonte primeira**, (2) lido **ANTES** do `grep`, (3) `SEPULTADA` = **BLOQUEADO**, (4) `RESERVADA` só na
junta da própria linha (fora dela e sepultá-la também **BLOQUEADO**), (5) ausência **não absolve** e o
`grep` nas atas **segue obrigatório**. Só o adjetivo redundante caiu ("atalho barato, não dispensa
(fail-closed)") — a cláusula 5 já é a definição de fail-closed.

```
node scripts/sync-agent-agents.mjs          → "espelhados 23 agentes ... README preservado"
node scripts/sync-agent-agents.mjs --check  → "OK — 23 agentes, espelho consistente."  exit=0
git diff --numstat -- .claude/agents/ .agents/agents/
  → 4  0  .agents/agents/inspetor-de-terreno-da-junta.md
    4  0  .claude/agents/inspetor-de-terreno-da-junta.md
```
Estado: **+4/−0 nas duas pontas, dentro do 2–4 do plano. Sem divergência a registrar.** Espelho **gerado
por script**, nunca editado à mão (§5).

## P3 — Baseline das duas suítes que este PR exerce (ANTES das edições de KPI)

```
node --test --import tsx tests/agents-mirror-guard.test.ts    → exec 1: tests 12 · pass 12 · fail 0 · skipped 0
                                                                exec 2: tests 12 · pass 12 · fail 0 · skipped 0
node --test --import tsx tests/kpi-dashboard-charts.test.ts   → exec 1: tests 16 · pass 16 · fail 0 · skipped 0
```
`node_modules` do worktree conferido **real, não junction** (`os.path.islink` → False) — a armadilha do
`D-JUNTA-ESCOPO-E-CALIBRACAO`(c) não se aplica aqui. N = **28 casos** (12+16), execução real.

## P4 — Dono REAL nas duas pendências (§3.5) + regeneração do índice

Editado **só o campo de dono**, 1 linha cada, sem mexer no cabeçalho `## P-` (por isso os números de linha
do índice não andam):
- `pendencias.md` l.4400 — `P-SAN2-2-INDICE-DONO-SEMPRE-SIM`: `a atribuir — bloco que possa tocar …` →
  **bloco SAN2-5, parte 2** (as duas faltas do classificador de dono).
- `pendencias.md` l.4499 — `P-KPI-PAINEL-NAO-RENDERIZA-SUMMARY`: `a atribuir — próximo bloco que puder …` →
  **bloco SAN2-5, parte 1** (`Kpis/app.js` + `index.html` renderizam `release.summary`/`description`).

**Placar do índice, ANTES e DEPOIS — regenerado 2× pelo script existente (não consertado, §5):**
```
python agent-orchestration/controle/gerar-indice-pendencias.py   (1ª e 2ª execução, saída IDÊNTICA)
  → indice: 233 cabecalhos / 225 IDs | {'FECHADA': 47, 'ABERTA': 186}
            | baldes {'-': 47, 'C': 77, 'B': 77, 'A': 32} | diferidas-materiais 2
```
Antes: 233 / 225 / 186 abertas / 47 fechadas / 0 contraditórias · Depois: **os mesmos números**.

**DIVERGÊNCIA MEDIDA vs. o §4 do plano ("o diff do índice muda SÓ as linhas esperadas").**
O diff do índice é **VAZIO** — nenhuma linha mudou. Medido eol-neutro, como o mandato exige:
```
md5 EOL-NEUTRO antes  = ac409fbf8ae2f41270ae8bcfac584698   (36421 bytes, 310 CRLF)
md5 EOL-NEUTRO depois = ac409fbf8ae2f41270ae8bcfac584698   (36111 bytes,   0 CRLF)  ← conteúdo IDÊNTICO
diff <(tr -d '\r' antes) <(tr -d '\r' depois)  → sem saída  ("IDENTICOS (eol-neutro)")
git diff --exit-code -- .../pendencias-indice.md            → 0  (git: SEM mudança de conteúdo)
git status --porcelain -- .../pendencias-indice.md          → " M"  ← MENTIRA de stat sob autocrlf
```
**Isto não é falha do bloco: é o defeito `P-SAN2-2-INDICE-DONO-SEMPRE-SIM` reproduzido AO VIVO.** O
classificador é `dono = re.search(r'\*\*dono:\*\*\s*(?!a atribuir)', body, re.I) or …` — com `\s*` podendo
casar zero espaços, o lookahead negativo é avaliado no espaço logo após `**dono:**` e **nunca** vê
`a atribuir`: a coluna dizia `sim` com dono ausente e continua dizendo `sim` com dono nomeado. As duas
linhas (índice l.93 e l.94) agora exibem um **`sim` VERDADEIRO** — mesma célula, valor de verdade oposto.
Os ~89 falsos-sim restantes ficam para o **SAN2-5**, dito e não escondido.

Índice deixado nos **bytes do checkout** (`git checkout --` após a 2ª geração): conteúdo idêntico ao gerado
(md5 eol-neutro igual), CRLF restaurado só para não deixar um " M" fantasma no `git status` da junta.
Idempotência do script: **provada** (2ª execução = 1ª, byte a byte).

## P5 — Registro §A2 em `controle/decisoes.md` (§3.6)

Entrada aditiva `REGISTRO-SAN2-3-OBITUARIO`, **+46/−0**, rotulada **REGISTRO DE CONFLITO MEDIDO, não decisão
do dono** (o obituário §5 já a apontava pelo nome — agora ela existe). Cobre (a) o descarte físico como
no-op na `main` e (b) a conta 15+2, com os comandos e as citações. CRLF preservado (1866→1912 linhas, todas
CRLF).

## P6 — KPI: backfill do #363 + entrada SAN2-3 (§3.4)

Edição **cirúrgica em texto bruto** (script próprio, não `json.dump` sobre o arquivo inteiro — reformatar
320 KB mataria o diff): preserva CRLF, indentação e ordem de chaves; toda troca é asserida em contagem 1 e
o resultado é reparseado e comparado entrada a entrada com o original.

**Backfill §C3.5 do #363, na entrada `SAN2-2` (a `[-2]` depois do append):**
`pr` null→**363** · `merge_commit` null→**"d283903"** · `approved_head` null→**"c8dc716"**.
Os três conferidos na fonte antes de escrever: `git log -1 d283903` = *"…(SAN2-2) (#363)"*; `J-SAN2-2.md`
l.5 = *"**Head julgado:** `c8dc716`"*; `e4926bd` existe e é *"docs(junta): SAN2-2 APROVADO 4x0…"* — a ata
pós-voto, **não** o head julgado. A armadilha nomeada pelo porteiro (B7) foi evitada, e o porquê ficou
escrito **dentro** da própria `description` da entrada, não só aqui.

**Entrada nova `SAN2-3`** (append, 147ª): nulls na autoria (§C3.5), `blocks_completed` **152→153** (o merge
do SAN2-2, exatamente como a entrada anterior declarou: *"sobe para 153 so quando este bloco mergear"*),
`backend_tests` 2607/2609 · `frontend_smoke_tests` 1126/1126 · `flutter_tests` 864/864 **CARREGADOS com
marcador §C3.3**, `mvp_demo`/`mvp_vendavel` **INTOCADOS** (99%/88%, asserido).
`kpis-latest.json`: `version` SAN2-3, `release` novo (block/title/summary/backfill_note), mesmos 4
marcadores §C3.3 nas notas das métricas carregadas, `blocks_completed` 153. `description` do history e
`summary` do release são **o mesmo texto** (6827 chars), asserido por igualdade.

**Erro meu, achado por mim e corrigido antes da junta:** a 1ª redação dizia *"os 7 arquivos do PR"* — número
**estimado**, não medido. A lista real tem **11**: 2 de papel de agente (fonte + espelho gerado), 3 de
`Kpis/` (2 JSON + a linha `var FROZEN` do `app.js`) e 6 de `agent-orchestration/` (obituário, plano,
dev-log, `decisoes.md`, `pendencias.md` e o parecer do porteiro do #363 já commitado em `f56e453`). Corrigido
nos dois lugares, `kpi-freeze` refeito e os 16 casos do painel reexecutados **depois** da correção.

**`Kpis/index.html` NÃO foi tocado** — é `PROIBIDO` no §5 e não precisa: o painel **hidrata em runtime** dos
JSON (§C3.0) e o `app.js` só carrega a cópia congelada, **gerada** pelo `kpi-freeze` (diff de 1 linha).

## P7 — Bateria do §6, na ordem exata

| # | Comando | Resultado |
|---|---|---|
| 1 | `node scripts/sync-agent-agents.mjs` | espelhados **23 agentes**, README preservado |
| 2 | `node scripts/sync-agent-agents.mjs --check` | `OK — 23 agentes, espelho consistente` · **exit 0** |
| 3 | `node --test --import tsx tests/agents-mirror-guard.test.ts` | **12 pass / 0 fail / 0 skip**, N=2 (e N=2 antes das edições) |
| 4 | `node scripts/kpi-freeze.mjs` → `--check` | reinjetado (58566 bytes) → **"em dia"**, exit 0 |
| 5 | `node --test --import tsx tests/kpi-dashboard-charts.test.ts` | **16 pass / 0 fail / 0 skip**, N=2 **depois** do freeze |
| 6 | `node --check Kpis/app.js` | OK |
| 7 | `gerar-indice-pendencias.py` 2× | 2ª = 1ª byte a byte; diff **vazio** (ver P4) |
| 8 | prova do obituário, 17 identidades | `git ls-tree … \| grep -c especialistas` → **0**; as 2 reservadas **nunca assinaram voto** |
| 9 | leitura JSON `[-2]`/`[-1]` | `(363, d283903, c8dc716)` e `(None, None, None)` + `blocks 153` — **todas as asserções OK** |
| 10 | `git diff --check` | **exit 0** |
| 11 | diff em `src/ prisma/ migrations/ frontend/ mobile/ tests/ scripts/ .github/ CLAUDE.md AGENTS.md Kpis/index.html` | **VAZIO** no commitado E na árvore |

**Prova do item 8, o que importa:** `grep -rl critico-c5-adversarial agent-orchestration/omega/` devolve
**5** arquivos — obituário, dev-log e plano **deste bloco**, o parecer do porteiro do #363 e
`planos/B-O6R-02-ciclo5-plano.md`. **Zero votos, zero atas de caso concluído.**
`jurado-c5-arnes-catalogo-postgres` aparece em 3 arquivos de voto do ARNES, mas **como menção**: o campo
`jurado` do `01-jurado-arnes-catalogo.json` nomeia `jurado-arnes-catalogo-postgres` (o titular novo) e diz,
na mesma linha, que a cadeira anterior *"permanece reservada àquela junta"*. **As duas RESERVADAS estão
corretamente fora do sepultamento.**

## Fechamento

**Escopo:** os 11 arquivos do PR estão **todos** dentro da lista fechada do §5; nenhum caminho proibido
tocado; **zero descarte físico** em qualquer branch; `demo/investidor` intocada; `erp-postgres`/`erp-redis`
não foram sequer consultados (o bloco não precisa de banco).
**Divergências registradas:** uma só — a do §4 do plano sobre o índice (P4), que virou evidência do defeito
já nomeado, não achado novo. A compressão do inspetor fechou em **+4**, dentro do teto; **nenhuma
divergência ali**.
**Limpeza §C5:** removidos os 4 scripts temporários do scratchpad da sessão e as 4 cópias de comparação
(`indice-antes`, `indice-depois1`, `hist-antes`, `latest-antes`); nada rastreado apagado, nenhum
`node_modules` tocado.
**Não commitado**, como o mandato manda: a árvore fica para a junta ler.
