# C3 — auditor-do-registro-e-kpi · evidencia incremental (SAN2-3, PR #364, head 23d9227)

Identidade NOVA. Voto criado como esqueleto ANTES de medir (P2+). Cada item apensado apos medir (P1).

## I1 — Backfill §C3.5 do #363 · **APROVADO** (gravidade: nenhuma · escopo: dentro-do-bloco)

**Comandos executados**

```
node -e '<le Kpis/kpis-history.json, filtra pr=363>'
git cat-file -t d283903 / c8dc716 / e4926bd    -> commit, commit, commit
git log --oneline c8dc716..e4926bd
git rev-list --count c8dc716..e4926bd
git diff --name-status c8dc716 e4926bd
git diff -U0 c8dc716 e4926bd -- Kpis/app.js
git diff --word-diff=plain -U0 c8dc716 e4926bd -- Kpis/app.js
<diff dos campos numericos de kpis-latest.json entre os dois heads>
sed -n '1,12p' agent-orchestration/omega/juntas/J-SAN2-2.md
grep -n 'c8dc716\|e4926bd' agent-orchestration/omega/juntas/J-SAN2-2.md
git branch -a --contains d283903 ; git log -1 --format='%s' d283903
```

**Saida resumida**

- Entrada `pr: 363` existe **1 vez** no history: `merge_commit "d283903"` · `approved_head "c8dc716"`. Bate
  com o mandato.
- `d283903` esta na `main` e titula `... (SAN2-2) (#363)` — **e o squash merge do PR #363**.
- **`git rev-list --count c8dc716..e4926bd` = 1.** O unico commit e `e4926bd`
  *"docs(junta): SAN2-2 APROVADO 4x0 — e os dois achados que a cadeira de KPI trouxe"*.
- Os **18 arquivos** do delta sao **todos de registro**: `J-SAN2-2.md` (A), os 4 votos + 4 evidencias da
  junta SAN2-2 (A), parecer + evidencia do inspetor (A), `pos-voto-log.md` (A), `00-quedas.md` (M),
  `pendencias.md` + `pendencias-indice.md` (M) e `Kpis/{app.js, kpis-latest.json, kpis-history.json}` (M).
  **Zero** em `src/`, `tests/`, `scripts/`, `.github/`, `frontend/`, `mobile/`.
- **O teste que decide:** o diff dos **campos numericos** de `kpis-latest.json` entre `c8dc716` e `e4926bd`
  saiu **VAZIO**. Nenhum numero se moveu depois do voto — a junta aprovou exatamente os numeros que
  mergearam.
- `Kpis/app.js` mudou **1 linha**, a constante de dados `FROZEN`. Word-diff:
  `[-16 arquivos:-]` -> `{+25 arquivos no head julgado c8dc716, medidos por git diff --name-only main...c8dc716 | wc -l+}`
  — e a correcao **A-1** da cadeira C4, ancorando o numero no commit. **Texto, nao logica.**
- Ata `J-SAN2-2.md` **l.5**: `**Head julgado:** \`c8dc716\`` — literal. E **l.100**: *"Consignado aqui porque
  o head julgado e c8dc716: o que vier depois e esta ata..."*.
- Precedente do **#362** alegado na description **confere por leitura propria**: `merge_commit 87f6ae6` !=
  `approved_head 4cd0867`. Mesma logica, ja aplicada antes.

**O porque ficou EXPLICITO, nao implicito.** A `description` escreve, com todas as letras, que o
`approved_head` e o head **julgado** (consignado na ata l.5 e no §Delta pos-voto), que **nao** e o
`headRefOid e4926bd` do GitHub, que o delta e "a propria ata mais o registro pos-voto", e cita o precedente
do #362. Gravar `e4926bd` declararia que a junta aprovou a ata que a registrou.

**Observacao (NAO e achado).** A description diz *"sem uma linha de codigo"* e o delta toca `Kpis/app.js`,
que e um `.js`. Medido: a linha e a constante de dados `FROZEN` — o fallback congelado de `file://` previsto
no §C3.1 — e o que mudou dentro dela e texto de `description`. Nenhuma logica no delta. A substancia da
afirmacao se sustenta; registro como observacao para a ata, nao como defeito.

**Veredito parcial: APROVADO.**

## I2 — Entrada de KPI do SAN2-3 · **APROVADO** (gravidade: nenhuma · escopo: dentro-do-bloco)

**Comandos executados**

```
git diff --name-only main...HEAD                              -> 11 arquivos
git diff --name-only main...HEAD -- frontend/ mobile/         -> VAZIO
git diff --name-only main...HEAD -- src/ tests/ scripts/ prisma/ .github/ -> VAZIO
git status --porcelain -- src/ tests/ scripts/ prisma/ migrations/ frontend/ mobile/ .github/ -> VAZIO
node -e '<le a ultima entrada de Kpis/kpis-history.json>'
node -e '<extrai as notas por metrica de Kpis/kpis-latest.json e busca o marcador §C3.3>'
git show main:Kpis/kpis-latest.json  vs  git show HEAD:Kpis/kpis-latest.json   (mvp_* e blocks)
node scripts/kpi-freeze.mjs --check
node --test --import tsx tests/kpi-dashboard-charts.test.ts
node --check Kpis/app.js
node --test --import tsx tests/agents-mirror-guard.test.ts
```

**Saida resumida**

- **O numero publicado hoje e o MEDIDO.** `git diff --name-only main...HEAD | wc -l` = **11**, e a lista
  confere item a item com a composicao que a `description` declara: 2 de papel de agente
  (`.claude/agents/` + espelho `.agents/agents/`), 3 de `Kpis/` (2 JSON + `app.js`) e 6 de
  `agent-orchestration/` (obituario, plano, dev-log, `decisoes.md`, `pendencias.md`, parecer do porteiro do
  #363). A estimativa de "7 arquivos" foi corrigida **antes** do voto; **11** e o que esta publicado e **11**
  e o que eu medi.
- **Trilhas nao tocadas, com prova propria:** `frontend/` e `mobile/` saem **vazios** no diff commitado; e
  `src/`, `tests/`, `scripts/`, `prisma/`, `.github/` tambem. O `git status --porcelain` nesses caminhos e
  **vazio** — a afirmacao da nota de que "a arvore de trabalho tambem" se sustenta.
- As **4 metricas carregadas** trazem marcador **§C3.3 nominal do SAN2-3**, cada uma com a prova citada e
  cada uma dizendo, com todas as letras, que *"a nota acima descreve execucao de bloco anterior, NAO deste
  PR"*. Valores carregados **identicos ao ultimo oficial** (SAN2-2): `2607/2609`, `1126/1126`, `864/864`.
- `pr` / `merge_commit` / `approved_head` = **null na autoria** (§C3.5). Correto.
- `mvp_demo` **99** e `mvp_vendavel` **88** — **identicos** entre `main` e `HEAD`. Intocados.
- `blocks_completed` **152 (main) -> 153 (HEAD)**, exatamente como a entrada anterior havia se comprometido
  ("sobe para 153 so quando este bloco mergear").
- **Guards reexecutados por mim, nao copiados:**
  - `node scripts/kpi-freeze.mjs --check` -> `kpi-freeze: em dia (snapshot 2026-08-30).` **EXIT=0**
  - `node --test --import tsx tests/kpi-dashboard-charts.test.ts` -> **16 tests / 16 pass / 0 fail / 0 skip**, EXIT=0
  - `node --check Kpis/app.js` -> **EXIT=0**
  - `node --test --import tsx tests/agents-mirror-guard.test.ts` -> **12 / 12 / 0 / 0**, EXIT=0
  - Os numeros **12** e **16** declarados na `description` batem **exatamente** com a minha execucao
    independente. Contagem de execucao real, nao de memoria.

**Veredito parcial: APROVADO.**

## I3 — Dono real no lugar de "a atribuir" · **APROVADO COM ACHADO NAO-BLOQUEANTE** (gravidade: baixa · escopo: dentro-do-bloco)

**Comandos executados**

```
grep -n "^## P-KPI-PAINEL-NAO-RENDERIZA-SUMMARY" / "^## P-SAN2-2-INDICE-DONO-SEMPRE-SIM" pendencias.md
<extrai o bloco de cada pendencia e lista as linhas "dono:">
git diff main...HEAD -- agent-orchestration/controle/pendencias.md | grep -E "^[+-].*dono:"
<lista TODAS as ocorrencias de "a atribuir" dentro de cada bloco, com contexto>
<mapeia a estrutura de cabecalhos ### da pendencia do painel>
git status --porcelain -- agent-orchestration/controle/pendencias-indice.md      (antes: VAZIO)
git diff --name-only main...HEAD -- .../pendencias-indice.md                     (VAZIO: fora do PR)
python agent-orchestration/controle/gerar-indice-pendencias.py
git diff --exit-code -- agent-orchestration/controle/pendencias-indice.md
git checkout -- agent-orchestration/controle/pendencias-indice.md                (restaura)
```

**Saida resumida**

- **O campo canonico esta certo nos DOIS.** O diff do PR mostra as duas linhas de status migrando de
  "dono: a atribuir" para "dono: bloco **SAN2-5**", com a justificativa anexa ("dono NOMEADO pelo `SAN2-3`,
  §3.5 do plano, quitando a ressalva do porteiro do #363; se o dono humano redirecionar, re-atribui-se com
  registro"). **Nenhum "a atribuir" sobrou no campo `dono:`** de qualquer uma das duas.
- **A armadilha nao me pegou.** Um `grep` bruto por "a atribuir" no bloco de
  `P-SAN2-2-INDICE-DONO-SEMPRE-SIM` acende **7 vezes** — e as 7 sao **prosa descrevendo o proprio defeito**
  (o regex do classificador, o placar de 91 falsos-sim, a reproducao isolada). A leitura do **campo** desfez
  o falso-positivo. Registro porque quase virou achado inventado.
- **Indice medido EOL-neutro, como mandado.** Regenerei com o script **existente**. `git diff --exit-code`
  saiu **0** -> **conteudo identico, diff VAZIO**.
- **A armadilha reproduziu exatamente como registrada:** 36421 bytes / 310 CRLF -> 36111 bytes / 0 CRLF;
  md5 bruto f508593d... -> ac409fbf...; e `git status` exibindo " M" **com o diff vazio**. O md5 EOL-neutro
  **ac409fbf8ae2f41270ae8bcfac584698** e o placar **233 cabecalhos / 225 IDs / 186 ABERTAS / 47 FECHADAS**
  batem **caractere a caractere** com o que o dev registrou.
- **Diff vazio aqui e a pendencia se manifestando, nao indice defasado.** Nao reporto defasagem.
- **Arvore restaurada** por `git checkout --` ao estado pristino (36421 bytes, f508593d...); nenhum arquivo
  rastreado ficou mutado por mim.

### Achado A-1 — `baixa` · `dentro-do-bloco` · **NAO bloqueia**

Em `P-KPI-PAINEL-NAO-RENDERIZA-SUMMARY`, a secao narrativa **"### Dono e o que falta"** continua abrindo com
**"Dono: a atribuir"** depois de o campo canonico ter passado a `SAN2-5`. A mesma pendencia declara **dois
donos diferentes**.

- **Evidencia de origem (escopo):** quem editou a linha de status desta pendencia foi **este bloco**
  (`git diff main...HEAD -- .../pendencias.md`), e a secao narrativa do mesmo texto ficou intocada. Ate a
  `main` os dois lugares diziam "a atribuir" e **concordavam** — a divergencia nasce da edicao deste bloco.
  Por isso `dentro-do-bloco`, e nao `pre-existente`.
- **Nao e citacao verbatim.** A estrutura da pendencia e: "### A medicao da C4, citada como ela a registrou"
  (l.15) · "### Re-medicao propria" (l.31) · "### Por que importa" (l.57) · "### Severidade" (l.71) ·
  "### Dono e o que falta" (l.80) · linha de status (l.95). A secao l.80 esta **fora** do bloco citado da C4
  (que termina em l.31): e texto do proprio registrador do SAN2-2, em primeira pessoa — "Nao nomeio bloco
  existente: nomear compromisso que nao combinei...".
- **Impacto medido: NENHUM no indice.** O classificador casa "**dono:**" e, na segunda alternativa,
  "**Dono**"/"**Dono:**"; a linha narrativa e "**Dono: a atribuir**", que **nao casa nenhum dos dois** (apos
  "**Dono:" vem espaco, nao asterisco). O dano e de **leitura humana**.
- **Motivo:** o bloco atualizou o campo que a **maquina** le e nao o paragrafo que a **pessoa** le.
- **Por que nao bloqueia (§C7.1-ter):** o que o mandato pede — o `dono:` canonico — esta **correto nos
  dois**. Divergencia de prosa, gravidade baixa, sem efeito em numero, indice, produto, dinheiro, seguranca,
  permissao ou dado, em bloco documental sob quorum de **MAIORIA**.
- **Nao proponho correcao** (§C7.4-bis): defeito + evidencia executada + motivo, e so.

**Veredito parcial: APROVADO com achado nao-bloqueante.**

---

# VEREDITO FINAL DA CADEIRA C3 — **APROVADO**

| Item | Veredito | Gravidade | Escopo |
|---|---|---|---|
| I1 — backfill §C3.5 do #363 (d283903 / c8dc716) | **APROVADO** | nenhuma | dentro-do-bloco |
| I2 — entrada de KPI do SAN2-3 | **APROVADO** | nenhuma | dentro-do-bloco |
| I3 — dono real SAN2-5 + indice eol-neutro | **APROVADO** c/ achado | baixa | dentro-do-bloco |

Os tres itens foram **medidos por execucao propria**, nao herdados do dev nem da ata. Os guards foram
**reexecutados** (kpi-freeze --check exit 0 · kpi-dashboard-charts 16/16/0/0 · node --check app.js exit 0 ·
agents-mirror-guard 12/12/0/0) e os numeros publicados batem com o que eu medi. O backfill grava o head
**julgado**, e a prova esta no delta de 1 commit, com **zero** campo numerico movido pos-voto. O numero de
arquivos publicado hoje (**11**) e o **medido**, nao a estimativa de 7. Um achado baixa / dentro-do-bloco /
nao-bloqueante fica registrado para a ata.
