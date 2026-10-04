inspetor-de-terreno-da-junta | Opus 5.5 (claude-opus-5-5), substituicao declarada: decisao do dono 2026-10-03, Fable so em blocos que tocam dinheiro | mandato_md5 69beed567692ea3c583a1c5ec3225ffd | corpo_md5 de80b2a9d4fc7edd7b9a26e2d601f97d

# Parecer do inspetor de terreno — junta 4 do B-GOV-MANDATO (PR 393) — instância SUCESSORA (b)

Instância sucessora (P3) da instância caída por limite de sessão da conta (~05:40Z), cujo parcial está preservado em
`scratchpad/preservado-1113/INSPETOR-393-J4.md` (seções 0 a 4.5). **Nada dele conta sem re-execução própria**: ele é
roteiro. Por item, este parecer declara **RE-EXECUTADO** (comando do caído rodado de novo e saída comparada) ou
**MEDIDO DE NOVO** (cauda que o caído não mediu). Parecer incremental (P1/P2); `EM APURAÇÃO` = ainda não medido.
Hora UTC em cada seção. Eu não escrevo no repositório e não commito; o orquestrador versiona.

## 0. Identidade, modelo e insumos — 2026-10-03T11:19Z — RE-EXECUTADO

- **Modelo (§C7.6-bis):** papel `inspetor-de-terreno-da-junta` · rodou em **Opus 5.5** (`claude-opus-5-5`) · por que o
  Fable faltou: **substituição declarada pelo invocador**, citando decisão do dono de 2026-10-03 ("Fable agora só em
  blocos que toquem em dinheiro até segunda ordem"); o B-GOV-MANDATO não toca dinheiro. A presença dessa decisão na
  ref é medida no item 0.1. O frontmatter do corpo continua `model: fable`.
- `git fetch origin` → ec=0; `git rev-parse origin/main` → `b404815ce3d1f1b8e5121bd1526978f7222e7479` (igual ao do caído).
- Corpo: `MSYS_NO_PATHCONV=1 git show 'origin/main:.claude/agents/inspetor-de-terreno-da-junta.md' | tr -d '\r' | md5sum`
  → `de80b2a9d4fc7edd7b9a26e2d601f97d`; `tr -d '\r' < scratchpad/corpos/inspetor-de-terreno-da-junta.md | md5sum`
  → `de80b2a9d4fc7edd7b9a26e2d601f97d`. **IGUAL** (EOL-neutro). Igual ao que o caído registrou.
- Mandato: `MSYS_NO_PATHCONV=1 git -C w-mandato show '47d113fb:agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/inspetor.md' | tr -d '\r' | md5sum`
  → `69beed567692ea3c583a1c5ec3225ffd`; arquivo em disco (EOL-neutro) → `69beed567692ea3c583a1c5ec3225ffd`. **IGUAL.**
- Ambiente de quem mede: `env | grep -c '^MSYS_NO_PATHCONV='` → **0** (nunca exportada; uso só por comando).
- **Nota de terreno (nova):** as linhas "derruba com" do mandato apontam para `scratchpad/INSPETOR-393-J4.md` (o arquivo
  da instância caída). Por instrução do orquestrador este parecer é um arquivo NOVO (`INSPETOR-393-J4-b.md`); os
  falsificadores do mandato valem para este arquivo por substituição de nome, que declaro aqui.

### 0.1 A decisão do dono citada para o Opus está na ref? — 2026-10-03T11:22Z — MEDIDO DE NOVO
- `for ref in origin/main d042a78d; do MSYS_NO_PATHCONV=1 git show "$ref:agent-orchestration/controle/decisoes.md" | grep -n -iE '2026-10-03|fable.{0,80}dinheiro|dinheiro.{0,80}fable'; done`
  → **0 linhas nas duas refs**; `git log --all --since=2026-10-02 -- agent-orchestration/controle/decisoes.md` → 0 commits.
- Fato: a decisão do dono que motiva a substituição Fable→Opus **não está registrada** em `decisoes.md` em ref nenhuma
  medida; é declaração do invocador. O Opus é o único substituto que o §C7.6-bis admite para este papel, e a
  substituição está declarada (papel · modelo · motivo) na 1ª linha deste parecer.
- Veredito parcial: **RESSALVA R-01** (não bloqueia o terreno; é o meu próprio modelo): a ata da junta 4 consigna
  papel · modelo · motivo desta substituição, e o registro da decisão do dono em `decisoes.md` é ato do orquestrador
  (§A5) — até lá, a única fonte da decisão é o disparo deste agente.

### 0.2 Anomalia de terreno `core.autocrlf` (informada pelo orquestrador às ~11:38Z) — 2026-10-03T11:39Z — MEDIDO DE NOVO
- Relato do orquestrador (registrado, não herdado): das 05:46:00Z às 11:20:32Z o `core.autocrlf` efetivo foi `false` em todos os
  worktrees (outro agente rodou `git config core.autocrlf false` sem `--worktree` com `extensions.worktreeConfig=true`); consertado.
- Conferido por mim às 11:39:15Z: `git config --show-origin --get-all core.autocrlf` (árvore principal) → `file:C:/Program Files/Git/etc/gitconfig	true`;
  `extensions.worktreeConfig` → `true`; efetivo em `w-insp4` = `true` e em `w-mandato` = `true`, sem valor por `--worktree` em nenhum dos dois.
- O que eu medi **dentro** da janela: só o item 0 (11:19:10Z) e o 1.1 (~11:20Z). O item 0 é EOL-neutro dos dois lados (`git show` do blob ×
  `tr -d '\r' < arquivo`), mas **refiz** às 11:39Z: corpo `de80b2a9…` = `de80b2a9…`; mandato `69beed56…` = `69beed56…` — **idênticos**. Do 1.1, o
  que depende de EOL é o `status --porcelain`: refeito às 11:39Z → `w-insp4` **0**, `w-mandato` **0**. Tudo o mais (baseline 11:23Z+, replay
  11:27Z+, worktrees `w-i4b-A*` criados 11:27Z+) rodou **depois** do conserto.
- Prova de que a árvore do `w-insp4` é o objeto sob a configuração atual: `git hash-object <f>` (com filtros) = `git rev-parse HEAD:<f>` em
  **7/7** (refs.sh `e1ed8f0d`, preflight.sh `093499a8`, mutantes.sh `373e5728`, refs.test `a8bd601b`, preflight.test `47cfaeba`, equivalentes
  `123e6afd`, corpo c1d `3866d02b`), com CR no disco (402 · 695 · 613 · 1093 · 2685 · 34 · 502 — o checkout normal sob `autocrlf=true`). O
  `w-insp4` foi criado pelo caído às 05:34Z, antes da janela; nenhum arquivo rastreado foi reescrito depois (`porcelain` 0).

## 1. Isolamento

### 1.1 Head a julgar — 2026-10-03T11:20Z — RE-EXECUTADO — VERDE
- `gh pr view 393 --json headRefOid,headRefName,state,isDraft,mergeable,baseRefName` →
  `d042a78d1c614294de701c1b06387d2afb62aaf8 · chore/mandato-refs-e-preflight · OPEN · isDraft=true · MERGEABLE · base main`.
- `git ls-remote origin refs/heads/chore/mandato-refs-e-preflight` → `d042a78d1c61…`; `git rev-parse origin/chore/mandato-refs-e-preflight`
  → `d042a78d1c61…`; `git -C w-mandato rev-parse HEAD` → `d042a78d1c61…`. **Quatro fontes concordam: OBJETO = `d042a78d1c614294de701c1b06387d2afb62aaf8`**
  (igual ao do caído; o head não andou entre 05:34Z e 11:20Z).
- Worktree do dev `w-mandato`: ramo `chore/mandato-refs-e-preflight`, HEAD = objeto, `status --porcelain | wc -l` → **0** (sem mutação viva).
- Worktree de inspeção `w-insp4` (herdado do caído, medido antes de usar): `rev-parse HEAD` → `d042a78d…` (detached);
  `status --porcelain | wc -l` → **0**; `status --porcelain --ignored` → só `!! node_modules/`;
  `fsutil reparsepoint query w-insp4\node_modules` → "não é um ponto de nova análise" (**diretório real, 0 junction**);
  222 entradas em `node_modules`, `.package-lock.json` presente, `.prisma/client` gerado. Processos vivos que citam
  `w-insp4|insp4` (Win32_Process por CommandLine) → **0**.
- Veredito parcial 1.1: **VERDE**.

### 1.2 Plano de isolamento — gravado ~2026-10-03T11:34Z — MEDIDO DE NOVO — VERDE
- Briefing ciclo 4, "Ambiente de quem mede" (l.412-418): "base viva nunca é alvo; worktree próprio em caminho curto, removido pelo
  nome depois de conferir que nenhum processo seu está vivo nele; nunca `tail -f`; timeout em tudo o que executa artefato mutado".
- Mandatos das cadeiras (`grep -n -iE 'w-j4c|worktree|cluster|descart|5432|6379'`): c1d l.99 `C:/Users/AMP/w-j4c1` detached, `npm ci`
  próprio sem junction; c2d l.99 `w-j4c2` + arnês próprio; c3d l.99 `w-j4c3`; c1d/c2d l.123/132 "a base viva erp-postgres 5432 e
  erp-redis 6379 nunca como alvo (este papel não precisa de banco)"; c3d l.109 "backend_tests … num cluster Postgres e Redis descartável
  próprio em portas livres provadas (pg_isready e netstat), CORE_SAAS_PERSISTENCE não exportado" e l.136 "(cluster descartável próprio,
  removido pelo nome)". → cada cadeira que muta tem worktree próprio nomeado; a única que precisa de banco tem cluster descartável
  próprio; a base viva não é alvo de ninguém.
- Colisão de nome: `ls -d C:/Users/AMP/w-j4c*` → **não existe nenhum** (os três caminhos estão livres; nenhum worktree compartilhado).

### 1.3 Resíduo de jurado anterior — gravado ~2026-10-03T11:34Z (medições 11:31Z–11:33Z) — MEDIDO DE NOVO — VERDE com resíduo alheio reportado
- `docker ps -a --format '{{.Names}}\t{{.Status}}'` → `erp-postgres` e `erp-redis` (Up, base viva — não tocadas), `erp-postgres-alt`
  (Exited 2 semanas), `pastrack-teste-banco-teste-1` (Exited 8 dias, outro projeto). **0 contêiner `jur-*`/`crit-*`**; os dois parados
  são inertes e alheios — reportados, não tocados.
- `git worktree list` (11:20Z): além de `w-insp4` (meu, herdado) e `w-mandato` (dev, = objeto, `porcelain` 0), existem
  `.claude/worktrees/{b04a,b11,gov-descuido}`, `w-nuv05`, `w-nuv05d`, `w-nuv09`, `w-nuv11`, `w-pvnuv`, `w-pvpr`, `w-pvreg` (os mesmos que a
  §9.4 do parecer listou) **e dois novos desde 05:18Z: `w-dc2` e `w-dc2lf`** em `a73fb35f` (`fix(test): B-SAN3-11 ciclo 2 …`, outro
  bloco; `porcelain` 0 nos dois; há processo vivo **alheio** em `w-dc2lf`: `npm --prefix frontend run check` + `tsc -b --noEmit`, por
  `Win32_Process.CommandLine`). Nenhum é de cadeira do B-GOV-MANDATO (`w-j3*`, `w-j4c*` → 0). **Reportados, não varridos.**
- Arquivos de sonda: `git ls-files -o --exclude-standard` na árvore principal e em `w-mandato` com `probe|jur-` → **0**;
  `find w-insp4 w-mandato -maxdepth 3 -name 'jur-probe*' -o -name '*-probe.ts'` (fora de `node_modules`) → **0**.
- Temporários em `%TEMP%` (`mandato-refs-*`, `mandato-preflight-*`, `tmp.*`) às 11:33Z: **42**, dos quais **40** anteriores a 11:23Z
  (alheios, de rodadas passadas — lista em `insp4b/tmp-antes.txt`, reportados e não tocados) e 2 posteriores (dos guards que eu rodava;
  conferidos na limpeza).

## 2. Insumos do briefing
### 2.1 Ata anterior "A RE-VERIFICAR" — gravado ~2026-10-03T11:35Z — MEDIDO DE NOVO — VERDE com ressalva
- Briefing ciclo 4, l.283: "Nada deste briefing é fato herdado: cada número tem a fonte nomeada, e a cadeira mede de novo"; l.407:
  "A cadeira mede de novo e compara com esses números". A ata do ciclo 3 (`J-B-GOV-MANDATO.md` l.213-325) não é repassada como conclusão:
  o briefing cita fatos com a fonte (commit, arquivo) e manda re-medir.
- Corpos das cadeiras: c1d l.60 "**[A RE-VERIFICAR]**. Você gera as suas amostras" e l.75 "o que ele afirma em `## MEDIDO` é colagem a
  re-verificar"; c2d l.63 "… é **[A RE-VERIFICAR]**. A matriz publicada é o **objeto** da sua comparação" e l.79; c3d l.40, l.47, l.68
  ("… das atas e dos mandatos são **[A RE-VERIFICAR]**"). (`grep -icE 're-verific'` = 2 · 4 · 8.)
- **RESSALVA R-02 — o esqueleto da ata do ciclo 4 pré-preenche o md5 do corpo com valores superados.** `J-B-GOV-MANDATO.md` l.341-342:
  C1⁗ `fa887726…` e C2⁗ `0bb59aa2…` — são os md5 **anteriores à emenda 1-quater** (`git show 95a8d071^:… | md5sum`, §2.2); no objeto os
  corpos são `7b13b3f1…` (c1d) e `e59abf6b…` (c2d). O esqueleto diz que toda linha é preenchida "com o que as cadeiras … gravaram", mas
  esta coluna não está `EM APURAÇÃO`. A ata tem de registrar o md5 que cada cadeira **declarar** (o do objeto), não o pré-preenchido.
### 2.2 Auditoria da máquina (ciclo ≥ 4) + conserto + 7 condições da §8.6 — 2026-10-03T11:31Z — MEDIDO DE NOVO (o caído não chegou aqui)

Mapa das sete condições da §8.6 → onde cada uma é medida neste parecer: **1** aqui · **2** §5 · **3** §2.3 + §6 · **4** aqui · **5** §5 ·
**6** §4.4 (VERDE) · **7** §3.1.

- **Condição 1 — §8 e §9 no parecer, §9 com `CONSERTO VERIFICADO`:** em `w-insp4` @objeto,
  `grep -c '^## 8\. Conserto da máquina' R-B-GOV-MANDATO-ciclo3-auditoria.md` → **1**; `grep -c '^## 9\.' …` → **1** (o mandato,
  medido às 04:44Z no head `d031518d`, dizia §9 = 0 — a §9 entrou depois, em `d042a78d`, o próprio objeto: `git log -- <R>` →
  `d042a78d docs(auditoria): §9 … atestacao CONSERTO VERIFICADO` · `94620131 … plano do conserto (§8)` · `968d15b4 … parecer … MAQUINA
  DEFEITUOSA`); `tail -n 1 <R> | tr -d '\r'` → **`CONSERTO VERIFICADO — máquina sã para o ciclo 4`**. As outras ocorrências de
  `CONSERTO VERIFICADO` (3) e a única de `CONSERTO INSUFICIENTE` (l.357) estão no texto da §8.7 que define os dois desfechos — não são
  veredito. Identidade da §9 = `auditor-maquina-b-gov-mandato-c3` (a mesma dos §0–§7, como a §8.7 manda), modelo Fable sem substituição.
  → **VERDE.**
- **Condição 4 — corpos das cadeiras nos 2 espelhos com os três itens:** por corpo, em `w-insp4` @objeto (`grep -ic` no arquivo;
  md5 EOL-neutro do blob `HEAD:`; `git ls-files --error-unmatch`):

  | corpo | md5 `.claude` · `.agents` | "morte interna" | "dois lados" | `mandato_md5` | versionado (2 espelhos) |
  |---|---|---|---|---|---|
  | c1d (C1⁗) | `7b13b3f1…` · `81db2cc2…` | 6 · 6 | 2 · 2 | 4 · 4 | sim · sim |
  | c2d (C2⁗) | `e59abf6b…` · `9d46cfa9…` | 1 · 1 | 8 · 8 | 4 · 4 | sim · sim |
  | c3d (C3⁗) | `34aac689…` · `07b7d75a…` | 3 · 3 | 2 · 2 | 8 · 8 | sim · sim |
  | conferente | `c4bef537…` · `444c8986…` | 1 · 1 | 5 · 5 | 3 · 3 | sim · sim |

  O que a condição exige por corpo está presente: "morte interna" na cadeira de fail-closed (c1d, 6), "dois lados" na de cobertura
  (c2d, 8), `mandato_md5` nas três (≥ 4). S0 verde (§4.1). Os md5 do briefing (tabela §15.9) para c1d/c2d são os **pré-1-quater**,
  como o próprio briefing declara — conferido: `git show 95a8d071^:<corpo> | tr -d '\r' | md5sum` → c1d `fa887726…`/`ad7ff64d…`,
  c2d `0bb59aa2…`/`ff00d3d2…` = a tabela; c3d não foi emendado na 1-quater e bate com a tabela (`34aac689…`/`07b7d75a…`). Histórico dos
  corpos: c1d e c2d `8859c142 → e3133ab4 → 441b0b31 → 95a8d071`; c3d `8859c142 → e3133ab4`; conferente `8859c142`.
  "Briefing instrui o inspetor a executar 2.4": `sed -n '279,$p' BRIEFING-B-GOV-MANDATO.md | grep -n -iE 'inspetor|2\.4|replay|mandato'`
  → a seção do ciclo 4 **não** traz a instrução 2.4 literal; traz (l.282) "O desenho do ciclo está na §15 do plano … e nas §8 e §9" e
  (l.401-403) o critério do **replay**. A instrução ao inspetor está versionada em dois artefatos que o briefing incorpora ou que nasceram
  como P2a: o plano §15.9 ("o inspetor re-executa o pré-voo de cada mandato …", critério emendado pela §15.15(b)) e o mandato
  `00-mandatos/inspetor.md` (`47d113fb`, hipótese do replay). A propriedade que o §8.3(ii) queria — instrução **versionada, não só no
  chat** — está satisfeita; a forma (o texto literal no briefing) não. **Nota N-01** (não ressalva). Execução do 2.4: §5. → **VERDE.**
### 2.3 Plano do ciclo + condição 3 da §8.6 (leitura) — gravado ~2026-10-03T11:35Z — MEDIDO DE NOVO — VERDE com ressalva
- O plano do ciclo 4 é a §15 de `docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-plano.md` (l.1701-2231 no objeto): nomeia o objeto do
  planejamento (`1d3b5e66`, l.1695), o escopo PERMITIDO/PROIBIDO com caminhos exatos por papel (§15.6, l.1871-1876) e a bateria com
  **forma declarada** (§15.8, l.1884-1914: worktree próprio, TAP em arquivo, `ec` por variável, `timeout`, N=2 no KPI).
- **§15.0(d)** presente (l.1747): semente **`20261001393`**, identidade `planejador-ciclo4-b-gov-mandato` ≠ runner da E4 (orquestrador)
  ≠ devs da ferramenta (Dev-S/Dev-S-2), 20 VERMELHOS sorteados + 100 % dos VERDES (245 318 336), comando e saída colados. A re-execução
  de 1 ponto de cada lado está no §6.
- **§15.1** presente (l.1797-1817): A1–A15 com a coluna "papel por artefato" (matriz · KPI/contagem · veredito do pré-voo); a **A15**
  tem papel nas três colunas. Células das colunas matriz e KPI lidas por parse (o `\|` escapado de A3 conferido à parte): **0 célula em
  branco**; **4 células "—"**: A13 (matriz **e** KPI), A6 (KPI), A2 (KPI, com a razão escrita "não há mutação").
- Requisitos do pré-voo e da ferramenta na §15.2 (l.1819-1862, `grep -ic`): `pipefail` 1 · `status` 2 · `MUTANTE-INVALIDO` 3 · `causa` 2 ·
  `fronteira 28` 1 · `equivalentes` 5 · `compila` 1 · `A15` 4.
- **RESSALVA R-03 — as células "—" de A6 e A13.** A literalidade da condição 3 ("sem célula vazia") está cumprida — nenhuma célula
  em branco. Mas o P1c do §8.2 diz que "classe sem papel para um artefato = o artefato não é insumo da junta", e só a A2 escreve por que
  não se aplica. Se A6 (sonda fraca) e A13 (operador numa direção só) se aplicam à matriz/ao KPI é pergunta de **mérito** (C2⁗/C3⁗), não
  de terreno; vai ao briefing em destaque para que a cadeira decida com execução, não para que herde o "—".

## 3. Papéis
### 3.1 / 3.1-bis Inelegibilidade por nome (condição 7 da §8.6) — gravado ~2026-10-03T11:35Z — MEDIDO DE NOVO — VERDE
- **Obituário primeiro:** `agent-orchestration/omega/juntas/OBITUARIO-IDENTIDADES.md` @objeto (301 l.; placar: 33 SEPULTADAS, 0 RESERVADAS):
  `grep -n -i` por `jurado-mandato-c1d-invariancia-e-morte-interna`, `…-c2d-cobertura-e-dois-lados`, `…-c3d-escopo-kpi-registro-mandato`,
  `conferente-dois-lados-b-gov-mandato-c4` → **0 linhas** cada (nem SEPULTADA nem RESERVADA). `grep -iE 'SEPULTADA|RESERVADA' | grep -i mandato`
  → 0: as cadeiras dos ciclos 1–3 do B-GOV-MANDATO **não** estão no obituário — pela regra 5 dele o sepultamento entra "no mesmo PR em
  que a junta fecha", e este PR ainda não fechou (**nota N-02**: dívida de registro a pagar no fechamento, não colisão). Ausência não
  absolve → grep nas atas:
- **Grep nas atas e votos:** `git grep -n -E 'jurado-mandato-c[123]d' HEAD -- 'agent-orchestration/omega/juntas/J-*.md' 'agent-orchestration/omega/reprovacoes/R-*.md'`
  → só `J-B-GOV-MANDATO.md` l.341-343 (o **esqueleto do ciclo 4**, `EM APURAÇÃO`) e `R-…-ciclo3-auditoria.md` l.447 (a §9 medindo o corpo
  da C1⁗). Em `votos/B-GOV-MANDATO-ciclo3/` → 0. Fora do B-GOV-MANDATO, nenhuma ata cita os três nomes. **Nenhum dos três votou, achou,
  planejou ou desenvolveu** em ciclo anterior.
- **Inelegíveis do §15.9 nos corpos:** os 15 nomes (9 cadeiras dos ciclos 1–3, `auditor-maquina-b-gov-mandato-c3`,
  `planejador-conserto-maquina-b-gov-mandato`, `planejador-ciclo4-b-gov-mandato`, `dev-tests-ciclo4-…`, `dev-scripts-ciclo4-…`,
  `conferente-dois-lados-b-gov-mandato-c4`) estão citados em **15/15** em cada um dos três corpos (`grep -qi` por nome); a seção de
  inelegibilidade do briefing contém os três nomes novos **0** vezes (não há auto-colisão). Esta instância do inspetor é **sucessora** da
  instância caída da junta 4 (mesmo papel, P3), e não é a da junta 3.

### 3.2 Composição × competência — gravado ~2026-10-03T11:35Z — MEDIDO DE NOVO — VERDE
- Bloqueantes do ciclo 3 (mandato, medido por `grep` nos JSON de evidência): C1c-01 C1c-02 C1c-03 C1c-04 (forma do pré-voo) + C2c-01 C2c-02
  (honestidade da ferramenta de mutação) + a lacuna A15 (morte interna) e D-M1 (dois lados) do parecer.
- Cobertura: **C1⁗** (c1d) — forma × propriedade + morte interna, com o item "mata cada componente — sobre `faa408c8` PRIMEIRO" (corpo
  l.342, §9.3 do parecer); **C2⁗** (c2d) — cobertura por mutação, honestidade da matriz e dois lados ("dois lados" 8×); **C3⁗** (c3d) —
  escopo por geração, KPI, registro e mandatos como artefato (`mandato_md5` 8×; replay 4d). Todo bloqueante tem cadeira que o cobre.
### 3.3 Corpo carregado × corpo julgado + norma citada existe — gravado ~2026-10-03T11:38Z — MEDIDO DE NOVO — VERDE com ressalva de início
- **Diretório de agentes da sessão** (árvore principal, `main` @`b404815c`): `ls .claude/agents/especialistas/ | grep -i mandato` →
  só `c1`, `c2`, `c3`, `c3b` (ciclos 1–2). **Os corpos c1d/c2d/c3d NÃO existem no diretório da sessão** (nem em `origin/main`): nenhuma
  cadeira pode ser carregada por nome, logo o harness não pode entregar um corpo velho — o carregamento será por leitura do blob do
  objeto (o briefing l.313-314 já o diz). `scratchpad/corpos/` também não tem cópia dos três (só a do conferente, `c4bef537…` = objeto,
  e a minha). Não há, portanto, "corpo carregado" a comparar **agora**; o que posso provar é qual corpo é o certo:
  **c1d** `.claude` `7b13b3f196de8626c0529c8142260b95` · `.agents` `81db2cc2358ab5ce8b02fcba6dcfea5f`;
  **c2d** `.claude` `e59abf6b4355503f985967fbdeec4e59` · `.agents` `9d46cfa98c7dda38083963d0b5eede7d`;
  **c3d** `.claude` `34aac6893fc0c488914f56d5fdc7fc0a` · `.agents` `07b7d75ac003d6e508d0292399f4f742` (EOL-neutros, `git show HEAD:<corpo> | tr -d '\r' | md5sum`).
- **RESSALVA R-04 (condição de início, forte):** o `corpo_md5` que cada cadeira declarar na 1ª linha tem de ser o do objeto acima. Os
  valores `fa887726…` (C1⁗) e `0bb59aa2…` (C2⁗) — os que estão pré-preenchidos no esqueleto da ata e na tabela do briefing — são os
  **pré-1-quater** e, se aparecerem como declarados, a cadeira aplicou corpo superado (a classe `P-GOV-CAMINHO-REPO-SESSAO`). Sem veto
  individual nesta junta, divergência = ressalva nomeada no voto daquela cadeira e na ata (item 3.3 do corpo).
- **Meu corpo:** carregado `scratchpad/corpos/inspetor-de-terreno-da-junta.md` = `de80b2a9…`; `HEAD:` (objeto) = `de80b2a9…`; `origin/main` = `de80b2a9…`. **Igual nas três.**
- **Norma citada existe na ref julgada:** cláusulas do contrato citadas pelos três corpos (`grep -oE '§C[0-9]+…'`): §C7.4-bis (9), §C5 (9),
  §C7.1-ter(c) (5), §C7.1-ter(b) (3), §C3.5 (2), §C3.4 (2), §C4 (1), §C3.3 (1) — todas presentes em `HEAD:CLAUDE.md` (C3 itens 3/4/5 l.291-295
  da seção; C4 l.303; C5 l.311; C7 "1-ter" l.359 com (b) l.374 e (c) l.382; "4-bis" l.446). Decisões citadas: `D-MANDATO-FORMA`
  (`origin/main:decisoes.md` `^## D-MANDATO-FORMA` = 1), `D-SEM-TETO-AUDITORIA-NO-3` (= 1 em `origin/main`), `D-TETO-DOIS-CICLOS` (usada só
  como **controle positivo** de leitura, l.88/102 da c1d etc., não como regra em vigor); os `D-M1/D-M2/D-M3` extraídos são parte dos ids
  `P-GOV-MAQUINA-393-D-M{1,2,3}-…`, presentes em `pendencias.md` (3 cabeçalhos). **Nenhuma cláusula inexistente.**

## 4. Fatias de orquestração

Ambiente de quem mede (11:24Z, antes de medir): `env | grep -c '^MSYS_NO_PATHCONV='` = **0** · `git version 2.53.0.windows.2` ·
`node v20.19.5` · `MINGW64_NT-10.0-22631 3.6.6-1cdd4371.x86_64 x86_64` · GNU Awk 5.3.2. `node_modules` do `w-insp4` (herdado do
caído) conferido antes de usar: `timeout 120 npm ls --depth=0` → **ec=0**, 0 linhas `missing|invalid|extraneous`;
`git diff --quiet HEAD -- package-lock.json` → igual ao head. **Completo — não refiz `npm ci`** (diretório real, 0 junction, 1.1).

### 4.1 Fatia S0 — 2026-10-03T11:28Z — RE-EXECUTADO — VERDE
- `cd w-insp4 && timeout 300 node scripts/sync-agent-agents.mjs --check` → **ec=0**, `[agents-sync] OK — 42 agentes, espelho consistente.`
  (igual ao do caído; log `insp4b/s0.log`).
- Recursivo (MEDIDO DE NOVO): `ls .claude/agents/*.md` = 23 + `especialistas/` 19 = **42**; `diff` das listas `.claude/agents/especialistas/`
  × `.agents/agents/especialistas/` → **iguais** (19 = 19); raiz idem (23 = 23, fora o `README.md` do Codex); `git ls-files` de
  `especialistas/` = 19 em cada espelho (todo corpo em disco está versionado no objeto). Os 4 corpos novos: do 1º `# ` em diante o
  md5 EOL-neutro é **igual** nos dois espelhos (c1d `4f80d87d…`, c2d `21cacc10…`, c3d `25b79090…`, conferente `ae571c5f…`) — diferem só
  no frontmatter Codex (D-INTEROP).
### 4.2 Baseline honesto no objeto — 2026-10-03T11:37Z — RE-EXECUTADO (check) e MEDIDO DE NOVO (guards: o caído não os concluiu) — VERDE
- `scratchpad/insp4b/baseline.sh` em `w-insp4` @`d042a78d`, `porcelain` 0 antes e depois (log `insp4b/guards/00-log.txt`):
  - `DATABASE_URL='postgresql://insp:insp@127.0.0.1:1/insp_ficticio' timeout 600 npx prisma generate` (URL fictícia **só no ambiente do
    comando**, porta 1) → **ec=0** (11:23:07Z→11:23:42Z).
  - `timeout 1500 npm run check` (`tsc -p tsconfig.json --noEmit`) → **ec=0** (→11:25:08Z), 0 linha de erro. Igual ao do caído.
  - `TMPDIR=<meu> timeout -k 30 1200 node --test --import tsx --test-reporter=tap tests/mandato-refs.test.ts > refs.tap` → **ec=0**;
    TAP: `# tests 44 · pass 44 · fail 0 · cancelled 0 · skipped 0`, 0 `not ok`, stderr 0 B (→11:29:01Z).
  - `TMPDIR=<meu> timeout -k 30 2700 node --test --import tsx --test-reporter=tap tests/mandato-preflight.test.ts > pre.tap` → **ec=0**;
    TAP: `# tests 356 · pass 356 · fail 0 · cancelled 0 · skipped 0`, 0 `not ok`, stderr 0 B, o caso `[V263]` presente (→11:36:57Z).
  - `ec` lido por variável, TAP em arquivo, nunca por cano. Iguais aos números que o registro declara (refs 44, pré-voo 356) — agora
    medidos por mim, não herdados.

### 4.3 Check-runs CONCLUÍDOS no head — 2026-10-03T11:26Z — RE-EXECUTADO — VERDE
- `gh api repos/thiagodorgo/ERP_Techsolutios/commits/d042a78d1c614294de701c1b06387d2afb62aaf8/check-runs --jq '.total_count, (.check_runs[] | [.name,.status,.conclusion,.completed_at] | @tsv)'`
  → **total_count=14**, 14/14 `completed · success` (docker ×2, owner-portal ×2, authority-portal ×2, backend ×2, backend-postgres ×2,
  flutter ×2, frontend ×2; `completed_at` 05:21:23Z → 05:31:14Z). 0 `queued`/`in_progress`/`cancelled`. **Igual ao do caído.**
  O vermelho intermitente de `backend-postgres` que o briefing nomeia (pré-existente) não aparece neste head.

### 4.4 D-M4 / condição 6 da §8.6 — 2026-10-03T11:26Z — RE-EXECUTADO — VERDE
- `grep -n 'Limpeza §C5 do ciclo 3' agent-orchestration/codex/log-execucao.md` em `w-insp4` @objeto → **1 ocorrência, l.5059**
  ("**Limpeza §C5 do ciclo 3 (registrada em 30/09 pelo orquestrador, condição 6 da §8.6 do parecer da auditoria — era a lacuna D-M4):**
  removidos pelo nome, com 0 processo vivo …"). Igual ao do caído. Nota (informação): o plano §15.7/§15.9 cita "l.4982"; no objeto é
  l.5059 (o log cresceu com as integrações da `main`).

### 4.5 Blobs das triplas publicadas × objeto — 2026-10-03T11:27Z — RE-EXECUTADO — VERDE
- `MSYS_NO_PATHCONV=1 git rev-parse HEAD:<f> | cut -c1-8` em `w-insp4` @objeto: refs.sh **e1ed8f0d** · preflight.sh **093499a8** ·
  mutantes.sh **373e5728** · refs.test **a8bd601b** · equivalentes **123e6afd** = cabeçalho E4F da matriz (`…-ciclo4-mutantes.md`
  l.30-35) e a tabela do briefing. preflight.test no objeto = **47cfaeba** (último commit que o toca: `faf87d8c` T4c-5).
- `git diff --numstat 9483be74 47cfaeba` → `30 0`; linhas `-` (`git diff -U0 … | grep -cE '^-[^-]'`) → **0**;
  `git diff --numstat 2275bea0 47cfaeba` → `111 0`; linhas `-` → **0**. O guard do objeto só **acrescenta** casos sobre os dois guards
  das matrizes (K4 `2275bea0`, delta E4G `9483be74`, cabeçalho l.610) — a identidade das matrizes não é afetada (§15.17).
- Matriz no objeto: blob `c34e052a` (a conferência cita `557dbfd7` @`a0845328`; o briefing declara os apensos K4b-3 §4.3 e K4b-4 depois).
  Igual ao do caído.

## 5. Mandatos como artefato e pré-voo por REPLAY (condições 2 e 5 da §8.6; 2.4; errata §15.15(b)) — gravado ~2026-10-03T11:38Z (replay 11:27:14Z–11:37:29Z) — RE-EXECUTADO

O caído deixou o roteiro (`scratchpad/insp4/replay.sh`, `insp4/replay/00-resumo.psv`) e morreu antes de gravar o resultado. Re-executei a
mesma lógica com caminhos e worktrees meus (`scratchpad/insp4b/replay.sh`; worktrees `C:/Users/AMP/w-i4b-A<8>`, removidos pelo nome), e o
stub `replay-refs.sh` **extraído verbatim do plano no objeto** (l.2081-2104, 24 l., `bash -n` ok, md5 `0d198ab5fb38567db3789b949d784863` =
o do caído = o da §9.1 do parecer).

**5.1 Um arquivo por papel, versionado antes do papel (condição 2).** 21 mandatos em `00-mandatos/`, cada um com **1 commit** (nunca editado
depois). Para os 17 papéis que já produziram artefato, `A` (commit que versionou o mandato) é **ancestral estrito** do 1º artefato do papel
(`git merge-base --is-ancestor A <artefato>` e `A ≠ artefato`): planejador `1d3b5e66`→`f013c61e` (§15) · planejador-errata `60f4f79f`→`0f044fa3` ·
errata2 `8dc14144`→`82bab561` · errata3 `43501c21`→`891dc04f` · errata4 `8849b1cd`→`49fe307f` · dev-tests `335cf09d`→`5b6f4f4a` (T4c) ·
dev-tests-t4c5 `b567a42a`→`faf87d8c` · dev-scripts `8dc14144`→`2ca15eb0` (S4a) · k4b3 `6db0aab8`→`e92f04e7` · k4b4 `92f7ae86`→`95bd6f96` ·
fabrica `335cf09d`→`8859c142` · 1bis `2bfd830c`→`e3133ab4` · 1ter `88ae30d2`→`441b0b31` · 1quater `b567a42a`→`95a8d071` · conferente
`a0845328`→`8849b1cd` · reconferência `b3205ac9`→`1bc0150f` · auditor-atestação `47d113fb`→`d042a78d` (§9) → **17/17 ANTERIOR**. Os 4
restantes (c1d, c2d, c3d, inspetor) nasceram em `47d113fb` e ainda não têm artefato. Cerca do veredito: `tail -n 10` com `ec=`, `head=`,
`utc=` em **21/21**.
- **RESSALVA R-05 — a cerca não grava o blob do instrumento.** O §8.3 P2b e o §15.9 descrevem a cerca como "(`ec`, head, blob do pré-voo,
  UTC)"; em **21/21** a cerca tem `ec`, `head` e `utc`, e **nenhuma** linha de blob. A propriedade que o blob serviria (qual instrumento deu
  o veredito) é **derivável** de `head=` e foi provada por execução: `git rev-parse <HC>:scripts/mandato-preflight.sh` = `<A>:…` em
  **21/21** (`faa408c8` nos 6 anteriores ao S4a; `093499a8` nos 15 posteriores) e o PRE2 do replay (`git diff --quiet HC A -- scripts/mandato-{preflight,refs}.sh`)
  OK em 21/21. Não bloqueia (a prova da condição 2, "`tail -n 8` mostra a cerca", passa); é forma × especificação, para a C3⁗ (mandatos como artefato).

**5.2 Replay do pré-voo em `A` (critério da errata §15.15(b)) — condição 5.** Por mandato: `A` por `git log --diff-filter=A`; PRE1
(`H0` ancestral de `A` e do objeto), PRE2 (instrumento de `HC` = de `A`), P-b (blob do objeto = blob de `A`); worktree detached em `A`;
`REPLAY_REV=$A REPLAY_M=$M MANDATO_REFS=<stub> timeout -k 10 300 bash scripts/mandato-preflight.sh "$M" 393`, `ec` em arquivo
(11:27:14Z → 11:30:14Z; `insp4b/replay/00-resumo.psv`):
```
21 mandatos · ncommits=1 em 21/21 · PRE1 OK 21/21 · PRE2 OK 21/21 · P-b OK 21/21 · cerca 21/21 · stderr do artefato 0 B em 21/21
PRE-VOO OK ec=0 em 20/21 (cada um com `COLAGEM l.11-NN: refs do PR #393 confere` + 1 AVISO `approved_head NAO DETERMINAVEL (ec=3)`, 21 de cada)
ec=1 em 1/21 — planejador-errata (A=60f4f79f, H0=335cf09d, HC=987cde17): REJEITADO SHA '987cde178d349d71e690f6f7238069af6683b202' nao esta na saida de mandato-refs.sh 393
nascidos DEPOIS da errata (A descende de 82bab561): 15 — HC=H0 e ec=0 em 15/15 (auditor-atestacao c1d c2d c3d conferente conferente-reconferencia
   dev-scripts-k4b3 dev-scripts-k4b4 dev-tests-t4c5 fabrica-1bis fabrica-1ter fabrica-1quater inspetor planejador-errata3 planejador-errata4)
anteriores à errata: 6 — 5 com HC=H0 e ec=0; o 6º é o planejador-errata
```
`diff` do meu `00-resumo.psv` com o do caído, colunas 1-12 → **idêntico** (RE-EXECUTADO, mesma saída); e igual à §9.1 do parecer (20/21).
Worktrees de replay: 14 criados, 14 removidos pelo nome (`restantes … 0 em disco: 0`).
- **Controle extra (MEDIDO DE NOVO):** os 6 mandatos anteriores ao S4a foram aprovados pelo instrumento `faa408c8` — o que tem o fail-open
  da A15 (awk morto ⇒ `PRE-VOO OK`). (i) stderr 0 B nos 6 replays → nenhum componente morreu; (ii) os mesmos 6 re-executados com o
  instrumento **consertado** do objeto (`093499a8`, em `w-insp4`, mesmo stub/colagem de `A`): dev-scripts, dev-tests, fabrica, planejador,
  planejador-errata2 → `PRE-VOO OK` ec=0, stderr 0 B; planejador-errata → ec=1, o mesmo REJ `987cde17`. O veredito não dependeu do fail-open.
- **Leitura pela regra escrita.** A errata §15.15(b)(iii) (no objeto) diz: "qualquer REJ no replay dos mandatos **desses papéis** [os que
  nascem depois dela: conferente, cadeiras, inspetor, auditor] é `bloqueia` (C3⁗) / `BLOQUEADO` (inspetor)"; e, sobre o `planejador-errata`,
  "(i) é achado `dentro-do-bloco` com causa nomeada … a gravidade é da C3⁗, com esta evidência". Nos 15 posteriores: **0 REJ** → nada a
  bloquear. O único REJ é o do mandato anterior à errata, **já publicado com causa** (§15.15(b), briefing "Dívida do orquestrador",
  §9.1 do parecer; commit preservado em `wip/c4-cerca-mandato-errata-987cde17`) — **não é BLOQUEADO do inspetor; é insumo da C3⁗**, que
  classifica a gravidade (**RESSALVA R-06**, para o briefing em destaque).

**5.3 Re-execução VIVA no objeto (registro, não critério — §15.15(b)).** `timeout -k 10 300 bash scripts/mandato-preflight.sh <m> 393` em
`w-insp4` @objeto, 11:30:14Z → 11:37:29Z: **21/21 ec=1**, 1ª REJ = `l.11-NN: bloco '# refs do PR #393' NAO bate com a saida atual` (a
colagem envelheceu: o head andou), 0 `referencias indisponiveis` (a ferramenta viva não morreu), stderr 0 B. É o esperado "por construção" que
a errata nomeia.
- **Os mandatos das cadeiras e o objeto.** c1d/c2d/c3d/inspetor/auditor colaram `head do PR = d031518d`; o objeto é `d042a78d`.
  `git log d031518d..d042a78d` = `47d113fb` (versiona os 5 mandatos) + `d042a78d` (apensa a §9 do parecer); `git diff --stat` = só os 5 mandatos
  (+ 701 l.) e +63 l. no parecer; `git diff --quiet d031518d d042a78d -- scripts tests Kpis src prisma frontend mobile .github docs .claude .agents CLAUDE.md AGENTS.md`
  → **iguais**. O produto julgado, os corpos e o plano são os mesmos do instante dos mandatos; o único `MEDIDO` superado neles é "§9 = 0",
  e os próprios mandatos (l.93-96) mandam a cadeira conferir a §9 antes do mérito. Ordem estrutural (o auditor precisa do mandato antes de
  escrever a §9), não mandato velho.
## 6. Amostra dos dois lados: 1 ponto de cada lado da §15.0(d) e 1 de cada lado da conferência do ciclo 4 (condição 3; §15.5) — MEDIDO DE NOVO (o caído não chegou aqui)

Escolhi pontos **diferentes** dos que a §9.2 do parecer já reproduziu (298/245), para que a amostra acrescente informação.

### 6.1 Lado A — a §15.0(d) do plano (matriz composta do ciclo 3) — gravado ~2026-10-03T11:45Z — VERDE
- **Insumos pelo blob, nunca digitados:** `git cat-file -p faa408c8` (pré-voo do ciclo 3; `hash-object --no-filters` = `faa408c8`, CR 0,
  541 l.) e `git cat-file -p 37549262` (ferramenta do ciclo 3); `aplica()` extraído **verbatim** (l.161-213, md5 `67ecec65…` = o mesmo trecho
  do blob). Arnês: `insp4b/ladoa/arn/{pris,m195,m318}/scripts/mandato-preflight.sh` (a `RAIZ` do script é `dirname $0/..`), cwd = `w-insp4`,
  `MANDATO_REFS=/bin/false`, `timeout -k 5 60`, 12 fixtures **minhas**, LF, sem PR (`insp4b/ladoa/fx/`: válido, sem HIPOTESE, tabela cheia,
  células a mais, células a menos, célula vazia, pipe literal que encurta, MEDIDO sem token, HIPOTESE sem token, cabeçalho com texto, ordem
  invertida, tabela curta em HIPOTESE). Pristino 2× → **IGUAL 12/12** (determinístico); stderr 0 B em todas as 48 execuções.
- **Lado VERMELHO — ponto 195** (sorteado na §15.0(d): `195 | M10 | PROGRAMA | DIFERE | b01-ok-bullets (ec 0->1)`):
  `source aplica-37549262.sh; aplica <cópia> 195` → **M10**; `diff` = 1 linha (`195c195`: `if (vistoH) print "SEC", "HIPOTESE", …` →
  `if (0) print …`); `bash -n` ok; hash `b3c9492f`. **Programa** (stderr 0 B, nenhum diagnóstico de interpretador). **Comportamento DIFERE
  em 11/12** — `f01-valido`: pristino `PRE-VOO OK` ec=0 → mutante `REJEITADO falta a secao '## HIPOTESE'` ec=1 (idem f07, f10, f11 com ec 0→1;
  nas outras 7 a saída ganha a mesma REJ). **Reproduz a linha publicada** (PROGRAMA · DIFERE · ec 0→1 num documento válido).
- **Lado VERDE — ponto 318** (VERDE/equivalente declarado na §15.0(d): `318 | M10 | PROGRAMA | IGUAL ← resiste`): `aplica <cópia> 318` →
  **M10**; `diff` = 1 linha (`if (idx < 2 || idx > n) return 0` → `if (0) return 0`, em `celulaCheia`); `bash -n` ok; hash `d9ed9e76`; programa.
  **IGUAL em 12/12**, inclusive nas 4 fixtures que passam pelo ramo `idx > n` (f05: cabeçalho com a evidência na coluna 5 e linhas de 4, 3 e
  2 células → as mesmas 3 REJ `unidade de MEDIDO sem 'medido por:'` l.5/6/7 nos dois; f06, f07, f12). Razão estrutural, lida na fonte:
  `colunaDeEvidencia` só devolve `i ∈ [2, n−1]` (l.311-314) → `idx < 2` é inalcançável; e com `idx > n` o `c[idx]` não existe, vale `""`,
  e `~ /[^[:space:]]/` dá 0 = o `return 0`. **Equivalente: CONFERE** (a mesma construção do 441 do ciclo 4).

### 6.2 Lado B — a conferência do ciclo 4 — comportamento gravado ~2026-10-03T11:50Z; cor do guard gravada 2026-10-03T11:58Z — VERDE (CONFERE nos dois lados)
- **Cor do guard** (`insp4b/ladob/guards.sh`: para `t ∈ {p, m240, m441}`, `cd w-insp4 && TMPDIR=<arn/t>/tmp timeout -k 30 3000 node --test
  --import tsx --test-reporter=tap <arn/t>/tests/mandato-preflight.test.ts > guard-t.tap`, os três em paralelo, 11:46:07Z → 11:57:25Z, `ec` e TAP em
  arquivo; guard = `2275bea0`, o da matriz completa do K4):
  ```
  p     pre-voo 093499a8  # tests 352 · pass 352 · fail 0  · not ok 0 · ec=0 · stderr 0 B   ← linha de base própria (= "fail=0/352" da conferência)
  m240  pre-voo 5cfc809c  # tests 352 · pass 350 · fail 2  · ec=1 · stderr 0 B
        not ok 247 - [F-8b] cerca `~~~` aberta no fim: REJ (CommonMark: fecha so com o MESMO caractere)
        not ok 250 - [F-8e] os dois contornos honestos: ```` e ~~~ envolvendo ``` colada — PRE-VOO OK nos dois
  m441  pre-voo adc04cb3  # tests 352 · pass 352 · fail 0  · not ok 0 · ec=0 · stderr 0 B   ← VERDE
  ```
  **240 = VERMELHO `fail=2`, 1º `not ok` = `[F-8b]`** — exatamente a linha publicada (matriz e conferência §6.1: `fail 2 / 2 · [F-8b]`), depois de
  provado programa e comportamento diferente. **441 = VERDE** com comportamento IGUAL em 17/17 fixtures minhas e razão estrutural na fonte —
  equivalente, como declarado. Arneses intactos depois das rodadas (`hash-object --no-filters`: guard `2275bea0` nos três; pré-voo `093499a8` /
  `5cfc809c` / `adc04cb3`). **A conferência reproduz nos dois lados por caminho próprio: nada a `DIVERGE`.**
- **Conferência versionada, semente e identidade:** `tail -n 1 00-conferencia-dois-lados.md` → `CONFERIDO — ponto 263 (reconferência T4c-5,
  passo 6-bis da §15.17): …` (a errata 15.17 exigia exatamente isto); semente **`2026100211`** (l.37; ≠ a do planejador `20261001393`);
  identidade `conferente-dois-lados-b-gov-mandato-c4` (Fable), ≠ runner (orquestrador) ≠ devs (Dev-T4/Dev-S4), conferida por nome na
  l.16 e por mim no §3.1. A 1ª passada deu `DIVERGE 263` (l.219) e a reconferência fechou com `CONFERIDO` (l.327) — **última linha = CONFERIDO**.
- **Arnês K4 pelos comandos dela:** `git -C w-insp4 -c core.autocrlf=false archive -o k4.tar bb641b77… scripts tests src/config
  mobile/flutter_app/lib/core/sync/sync_action_store.dart docs/revisoes/SAN3 CLAUDE.md package.json` → `tar -x` → `git init` + commit
  (`insp4b/ladob/arn/p`): **339** rastreados (= os 339 da conferência); `hash-object --no-filters` = blob de `bb641b77` em **6/6** (refs
  `e1ed8f0d`, pré-voo `093499a8`, ferramenta `373e5728`, guard-refs `a8bd601b`, guard-pré-voo `2275bea0`, equivalentes `123e6afd`), CR 0 nos 6.
  `aplica()` da ferramenta do ciclo 4 extraído verbatim (l.395-449; md5 `c957171c` = o que a conferência declarou, l.22). Cópias
  `arn/{m240,m441}` com o mesmo `.git` (`porcelain` = só `M scripts/mandato-preflight.sh`).
- **Lado VERMELHO — ponto 240** (sorteado pela conferência, §6.1 l.53: `240 | M4(sim>nao) | … | 1/53 f09-cerca-til-fechada-com-crase |
  fail 2/2 | [F-8b] | CONFERE`): `aplica` → **M4(sim>nao)**; `diff` = 1 linha (`marcaChar`: `c!="~"` → `c!="!~"` — a cerca de til deixa de ser
  cerca); `bash -n` ok; hash `5cfc809c`; programa (stderr 0 B nas 17 fixtures). **Comportamento DIFERE em 5/17** — as 5 fixtures minhas com
  cerca `~~~` (válida, fechada com crase, que engole `## HIPOTESE`, indentada de 4 tis, aberta): em `g01-til-valido` o pristino dá
  `PRE-VOO OK` ec=0 e o mutante `REJEITADO unidade de MEDIDO sem 'medido por:' — l.4: ~~~ (linha apos o comando fora de cerca …)` + l.5 + l.6,
  ec=1; IGUAL nas 12 sem til. Cor do guard: abaixo.
- **Lado VERDE — ponto 441** (equivalente declarado em `…-ciclo4-equivalentes.txt`, o único com fixture; conferência §7 l.101 "equivalente
  CONFERE"): `aplica` → **M10**; `diff` = 1 linha (`if (idx < 2 || idx > n) return 0` → `if (0) return 0`, em `celulaCheia`); `bash -n` ok;
  hash `adc04cb3`; programa. **IGUAL em 17/17** (ec, stdout **e** stderr), inclusive nas fixtures que exercem `idx > n` (f05: as mesmas 3 REJ
  l.5/6/7) e o pipe escapado `\|` que o `gsub` da l.439 neutraliza (f07). Mesma razão estrutural do 318 (§6.1). Pristino 2× IGUAL 17/17.
- Incidental (informação): `f10-cabecalho-com-texto` (texto na linha `## MEDIDO …`) passava no pré-voo do ciclo 3 (`faa408c8`, ec=0 — a C1c-04)
  e é rejeitado no do objeto (`093499a8`, ec=1).

## 7. Quórum e plano de perda de jurado — gravado ~2026-10-03T11:51Z — MEDIDO DE NOVO — VERDE
- Briefing ciclo 4 l.299-300: "**Quórum:** maioria de 3, sem veto, sem suplente (§15.9). Queda relança a **mesma** identidade, que não herda
  nada como conclusão; voto perdido nunca conta como aprovação; evidência incremental a cada item; PAUSA pela P7." Os três mandatos de cadeira
  repetem a regra (c1d l.116, c2d l.125, c3d l.129). **Plano de perda declarado.**
- Base do quórum (§C7.1-ter(b): unanimidade só se o bloco toca dinheiro, segurança, permissão ou perda de dado): `git merge-base origin/main HEAD`
  = `b404815c` = `origin/main`; `git diff --name-only <MB> HEAD -- src prisma frontend mobile .github` → **0**; controle `-- scripts tests` → **5**
  (os 3 scripts e os 2 guards do mandato); 85 arquivos no diff ao todo (registro, KPI, corpos, mandatos, plano). **Maioria de 3 é o quórum
  escrito para este diff**; o `critico-adversarial` não é exigido (não é bloco de invariante — §15.9).
- Disparo (P5): no máximo 2 jurados em paralelo — o orquestrador declara a ordem; o limite de sessão da conta já caiu 4 vezes nesta rodada
  (relato do orquestrador), então a P1/P2 (evidência e voto incrementais) é o que reduz o custo de cada queda.

## 8. O que acontece com o objeto quando este parecer for versionado — gravado ~2026-10-03T11:52Z — MEDIDO DE NOVO
- Os mandatos das três cadeiras (c1d/c2d/c3d l.93-96, versionados em `47d113fb`) mandam a cadeira conferir, **antes do mérito**, que
  `agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-inspetor-terreno.md` existe e diz LIBERADO — "faltando um dos dois, a cadeira
  não vota". O meu mandato diz que este parecer é versionado pelo orquestrador nesse caminho. O orquestrador declarou, no disparo, que "o ramo
  não recebe commit antes da junta, para não mover o head dos mandatos".
- As duas coisas não cabem juntas: (a) **se o parecer for versionado antes da junta**, o head anda de `d042a78d` para um commit novo — o objeto
  da junta passa a ser **esse** SHA, e pelo item 4.3 do meu corpo a junta só começa quando ele tiver check-runs **concluídos** (o gatilho `push`
  do ramo dispara o CI; `queued`/`in_progress` conta como ausente); (b) **se não for versionado**, a hipótese l.93-96 dos três mandatos cai e as
  cadeiras não votam. Os mandatos das cadeiras **não** precisam ser refeitos por isso: o critério deles é o replay em `A` (errata §15.15(b)), e
  um commit só de registro não muda o que eles colaram nem o produto julgado — como já não mudaram os dois commits entre `d031518d` e `d042a78d`
  (§5.3).
- **RESSALVA R-07 (condição de início, forte):** o orquestrador escolhe (a) ou (b) e registra a escolha na ata. Em (a), o delta
  `git diff --name-only d042a78d <novo head>` tem de ser **só registro** (`00-inspetor-terreno.md` e, se for o caso, `00-quedas.md`) e o novo
  head tem de ter check-runs concluídos antes de qualquer cadeira nascer; as cadeiras resolvem esse head por `git` + `gh`, como os mandatos
  mandam. Este LIBERADO é sobre `d042a78d` e se estende ao novo head **só** sob essas duas condições.

## 9. Sucessão (P3) — o que foi re-executado e o que foi medido de novo — gravado 2026-10-03T11:59Z

| item | parcial do caído (`preservado-1113/INSPETOR-393-J4.md`) | nesta instância |
|---|---|---|
| 0 identidade/md5 | gravado | **RE-EXECUTADO** (mesmos md5; refeito de novo às 11:39Z, depois do conserto do `autocrlf`) |
| 0.1 decisão do dono na ref | — | MEDIDO DE NOVO |
| 0.2 anomalia `autocrlf` | — | MEDIDO DE NOVO |
| 1.1 head | gravado | **RE-EXECUTADO** (mesmo objeto `d042a78d`; re-medido às 11:58Z: não andou) |
| 1.2, 1.3 | `EM APURAÇÃO` | MEDIDO DE NOVO |
| 2.1, 2.2 (7 condições), 2.3 | `EM APURAÇÃO` | MEDIDO DE NOVO |
| 3.1, 3.2, 3.3 | `EM APURAÇÃO` | MEDIDO DE NOVO |
| 4.1 S0 | gravado | **RE-EXECUTADO** (ec=0, 42) + recursivo medido de novo |
| 4.2 baseline | `check` gravado; guards "lançados", sem resultado | `check` **RE-EXECUTADO** (ec=0); guards **MEDIDOS DE NOVO** (44/44, 356/356) |
| 4.3 check-runs | gravado | **RE-EXECUTADO** (14/14 `success`) |
| 4.4 D-M4 | gravado | **RE-EXECUTADO** (l.5059) |
| 4.5 triplas | gravado (com "numstat a re-medir") | **RE-EXECUTADO** + numstat medido |
| 5 replay dos mandatos | script e `00-resumo.psv` em disco, **sem registro no parecer** | **RE-EXECUTADO** pelo roteiro dele (saída idêntica, colunas 1-12) + controle extra medido de novo |
| 6 dois lados | — | MEDIDO DE NOVO (195/318; 240/441) |
| 7 quórum, 8 sequência do versionamento | `EM APURAÇÃO` | MEDIDO DE NOVO |

Falhas da API por sobrecarga nesta instância: **0** até 11:59Z.

## Veredito — 2026-10-03T11:59Z — **LIBERADO COM RESSALVA**

**Objeto:** `d042a78d1c614294de701c1b06387d2afb62aaf8` (PR 393, `chore/mandato-refs-e-preflight`; quatro fontes; 14/14 check-runs `completed · success`;
`merge-base` = `origin/main` `b404815c`). **As sete condições da §8.6 do parecer estão presentes**, cada uma medida por execução: (1) §8 e §9 com
`CONSERTO VERIFICADO` na última linha; (2) 21 mandatos-artefato, cada um anterior ao 1º artefato do seu papel e com cerca; (3) §15.0(d) e §15.1 no
plano, e 1 ponto de cada lado da §15.0(d) (195 vermelho, 318 verde) e da conferência do ciclo 4 (240 vermelho `fail=2 [F-8b]`, 441 verde)
**reproduzidos por caminho próprio**, com a conferência terminando em `CONFERIDO`; (4) os 4 corpos nos 2 espelhos com os três itens, S0 verde;
(5) replay do pré-voo em `A`: 20/21 OK, os 15 mandatos posteriores à errata com `HC = H0` e OK; (6) a linha §C5 do ciclo 3 na trilha (l.5059);
(7) inelegibilidades por nome (obituário + atas), sem colisão. Além delas: terreno sem mutação viva, isolamento por cadeira declarado (`w-j4c1/2/3`,
cluster descartável só na C3⁗), sem resíduo de jurado, baseline honesto (`check` ec=0; guards 44/44 e 356/356), normas citadas existentes,
quórum de maioria de 3 com plano de perda declarado. **Nenhum `BLOQUEADO`.**

**Ressalvas — para o briefing dos jurados, em destaque:**
- **R-04 (forte, condição de início) — corpo aplicado.** O `corpo_md5` que cada cadeira declarar tem de ser o do objeto: c1d `7b13b3f1…`, c2d
  `e59abf6b…`, c3d `34aac689…` (`.claude`; ou `81db2cc2…` / `9d46cfa9…` / `07b7d75a…` no espelho `.agents`). Os três corpos **não existem** no
  diretório de agentes da sessão: cada cadeira nasce lendo o blob do objeto. `fa887726…`/`0bb59aa2…` declarados = corpo pré-1-quater aplicado.
- **R-07 (forte, condição de início) — versionar este parecer move o objeto.** Os mandatos das cadeiras exigem `00-inspetor-terreno.md` no ramo
  dizendo LIBERADO; versioná-lo cria um head novo. Então: delta `d042a78d → novo` **só registro**, e o novo head com check-runs **concluídos**
  antes de qualquer cadeira nascer. Sem versionar, as cadeiras não votam (mandatos l.93-96). O orquestrador escolhe e registra na ata (§8).
- **R-06 — o REJ do `planejador-errata`.** O único `ec=1` do replay (cerca `head=987cde17`, não empurrado) é anterior à errata §15.15 e já
  publicado com causa; pela própria errata, a gravidade é da **C3⁗**, não do inspetor. Vai como insumo dela, com a evidência do §5.2.
- **R-02 — esqueleto da ata.** `J-B-GOV-MANDATO.md` l.341-342 pré-preenchem o md5 de C1⁗/C2⁗ com os valores pré-1-quater; a ata registra o que
  cada cadeira declarar.
- **R-03 — "—" na §15.1.** A13 (matriz e KPI), A6 (KPI) e A2 (KPI, com a razão escrita). Nenhuma célula em branco; se A6/A13 se aplicam a esses
  artefatos é mérito da C2⁗/C3⁗ (P1c: classe sem papel tira o artefato de insumo).
- **R-05 — cerca sem o blob do instrumento** em 21/21 (o §8.3 P2b/§15.9 a descrevem com blob). A identidade do instrumento foi provada por
  derivação de `head=` e pelo PRE2 em 21/21; forma × especificação, para a C3⁗.
- **R-01 — o meu modelo.** Rodei em Opus 5.5 por substituição declarada pelo invocador (decisão do dono de 2026-10-03, Fable só em blocos que
  tocam dinheiro), decisão que **não está** em `decisoes.md` em ref nenhuma; a ata consigna papel · modelo · motivo, e o registro é do orquestrador.

**Notas (informação):** N-01 a instrução do 2.4 ao inspetor está no plano §15.9 e no mandato versionado, não literal no briefing (§2.2); N-02 as
cadeiras dos ciclos 1–3 ainda não estão sepultadas no obituário — a regra 5 dele as manda entrar no PR em que a junta fecha (§3.1). Resíduo alheio,
**reportado e não tocado:** worktrees `w-dc2`/`w-dc2lf` (B-SAN3-11, com processo vivo alheio em `w-dc2lf`), `w-nuv05`, `w-nuv05d`, `w-nuv09`,
`w-nuv11`, `w-pvnuv`, `w-pvpr`, `w-pvreg`, `.claude/worktrees/{b04a,b11,gov-descuido}`; contêineres parados `erp-postgres-alt` e
`pastrack-teste-banco-teste-1`; 40 temporários em `%TEMP%` anteriores a 11:23Z; 55 não rastreados na árvore principal (53 corpos de outros blocos
em `.claude|.agents/agents/especialistas/`, `TEMPLATE-J-ata.md`, `results.txt`).

**Nota de honestidade (horas):** ao gravar as seções 3.3, 5, 6.1, 7 e 8 escrevi horas à frente do relógio (11:50Z, 11:52Z, 11:58Z, 11:52Z,
11:54Z); corrigi-as pelas horas reais dos comandos (`date -u`) às 11:46Z e 11:52Z. Nenhuma medição dependeu dessas horas.

## Limpeza (§C5, 1 linha) — 2026-10-03T11:59:24Z

`bash scratchpad/insp4b/limpeza.sh` (→ `insp4b/limpeza.log`): processos com `w-insp4|w-i4b-|insp4b` na linha de comando **0** (antes de remover); worktree
`C:/Users/AMP/w-insp4` (herdado do caído, `porcelain` 0, head `d042a78d`) removido por `git worktree remove --force` (ec=0; na lista 0, em disco não),
o `node_modules` dele junto; os 14 worktrees de replay `w-i4b-A*` já removidos pelo nome às 11:30Z (lista 0, disco 0); arneses `insp4b/ladob/arn`
(~30 MB: K4 pristino + m240 + m441) e `insp4b/ladoa/arn` apagados, e os `TMPDIR` dos guards; temporários meus em `%TEMP%`: os 2 nascidos às 11:29Z
já tinham sido removidos pelos próprios testes (0 novos; restam os 40 alheios anteriores); 0 contêiner criado; base viva `erp-postgres`/`erp-redis`
nunca alvo (só `DATABASE_URL` fictícia na porta 1, no ambiente do `prisma generate`); `MSYS_NO_PATHCONV` exportada 0; nada escrito no repositório
(árvore principal sem rastreado modificado, `w-mandato` `porcelain` 0); ficam no scratchpad, como evidência reexecutável, `insp4b/` (1,2 MB: scripts,
stub `replay-refs.sh`, logs e `00-resumo.psv` do replay e da viva, `replay-novo/`, fixtures `ladoa/fx` e `ladob/fx`, saídas `out/`/`bout/`, TAPs dos
guards); resíduo alheio reportado no veredito, não varrido; nenhum `git clean`, `git stash` ou `tail -f`.

Falsificadores do mandato, rodados sobre este arquivo às 12:00:40Z: `head -1 | grep -ic mandato_md5` = 1 · `grep -ic 'condicao\|condição'` = 16 ·
`grep -ic lado` = 29 · `grep -ic 'S0\|sync-agent-agents'` = 6 · `grep -icE 'LIBERADO|BLOQUEADO'` = 7 · `grep -ic 'medido por'` = 3. O da 2ª hipótese
(`git worktree list | grep -ic w-insp4`) deu 1 durante a inspeção (§1.1, 11:20Z) e dá 0 agora, depois da remoção pelo nome que o mesmo mandato manda.
