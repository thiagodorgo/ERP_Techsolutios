# B-GOV-CICLOS-RESIDUAIS — PLANO — ciclo 1

- **Papel:** `planejador-mestre` (identidade nova para este bloco) · **Modelo:** Fable 5.1 (`claude-fable-5-1`) —
  o corpo fixa Fable (`D-PLANEJADOR-MODELO-FABLE`); **sem substituição** · **Corpo aplicado:**
  `.claude/agents/planejador-mestre.md` @ `3b1fe0f9`, md5 EOL-neutro `4c912f69a93f07b14d8fd1c49539c778` (= o
  esperado pelo mandato). O espelho `.agents/agents/planejador-mestre.md` tem md5 `9ef61338…` **porque é o
  formato transformado** (preâmbulo Codex + sem `tools:`), não divergência: `sync-agent-agents.mjs --check` → ec=0.
- **Separação de papéis (§C7.4-bis):** eu **planejo; não desenvolvo, não voto**. Quem achou os defeitos que este
  bloco fecha são as cadeiras C1/C2/C3 do #394, o porteiro do #394 e o orquestrador (na ata) — nenhum deles
  desenvolve nem julga aqui (§10). Nenhuma linha deste plano escreve redação final de contrato: dá a **propriedade**
  que a redação tem de satisfazer, a **mutação** que a deixaria vermelha, e quem decide o que não é do bloco.
- **TERRENO DECLARADO — a premissa "piloto na nuvem" foi FALSIFICADA para esta execução.** `uname -a` →
  `MINGW64_NT-10.0-22631 N3SOH82 … x86_64 Msys`: esta sessão rodou **na máquina Windows do dono** (usuário `AMP`,
  worktree `C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/agent-ae8f5e83dd3d027e5`), não na
  nuvem. Consequências: (i) tudo que este plano mede sobre Windows (CRLF, Docker Desktop, base viva) **é medição
  local**, não prova de que a nuvem mede; (ii) o registro `D-NUVEM-FABLE-CREDITOS` (§4) **não pode citar este plano
  como evidência de execução na nuvem**; (iii) o primeiro run na nuvem, quando houver, **re-mede o §0 no seu próprio
  terreno**.
- **Insumos lidos integralmente, do clone em `3b1fe0f9` (nada herdado como fato):** `CLAUDE.md` (676 l.) e
  `AGENTS.md` (725 l.); `docs/revisoes/SAN3/B-GOV-SEM-TETO-plano.md` (modelo de forma); `J-B-GOV-SEM-TETO.md`;
  `votos/B-GOV-SEM-TETO/{00-inspetor-terreno,C1-evidencia,C2-evidencia,C3-evidencia,PORTEIRO-394}.md` (trechos dos
  ajustes e ressalvas, por `grep -n`); `decisoes.md` l.2633–2737 (`D-SEM-TETO-AUDITORIA-NO-3` inteira) e
  l.2049–2075 (`D-FALLBACK-MODELO-FABLE-OPUS`, modelo de forma para registro de decisão do dono); `pendencias.md`
  l.9770–9867 (as sete pendências); os corpos `inspetor-de-terreno-da-junta`, `validador-mestre`,
  `critico-adversarial`, `avaliador-mapas`, `agente-fabrica`, `planejador-mestre`; `scripts/sync-agent-agents.mjs`;
  `scripts/audit-agents-skills.mjs` (cabeçalho, `MODELO_FIXADO`, C1–C10); `tests/agents-mirror-guard.test.ts`;
  `agent-orchestration/controle/gerar-indice-pendencias.py`; `EXECUTION_MODEL.md` l.255–334; `PROJECT_MEMORY.md`
  l.1–60; `.agents/agents/README.md` (linhas com `ciclo`, índice de papéis, seção de gates); `Kpis/kpis-latest.json`
  (cabeçalho) e `kpis-history.json` (2 últimas entradas); `status-geral.md` (cauda).

---

## §0 — Terreno e LINHA DE BASE (medido por mim; comando → saída)

Forma: cwd no worktree acima; `timeout` em todo script do repo; comparação **EOL-neutra** (`tr -d '\r' | md5sum`),
porque `git config core.autocrlf` → `true`. O sandbox desta sessão recusou comandos compostos (subshell, `for`,
`${PIPESTATUS}`, `{{…}}`); tudo abaixo foi re-executado em forma plana — limite da ferramenta, não do repositório.

### 0.1 Head, base, remoto, ramo — MEDIDO

| item | comando | saída |
|---|---|---|
| fetch | `git fetch origin` | ec=0 |
| base | `git rev-parse origin/main` | `3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c` (= o esperado pelo mandato) |
| head do clone | `git rev-parse HEAD` | `3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c` — ancestral de `origin/main`: `merge-base --is-ancestor` ec=0 |
| commit da base | `git log -1 --format='%H %ci %s' origin/main` | `2026-09-28 17:38:22 -0300 docs(registro): votos, inspetor e porteiro do #394 versionados, e o backfill dele (#395)` |
| remoto | `git remote -v` | `origin https://github.com/thiagodorgo/ERP_Techsolutios.git` (fetch e push) |
| ramo alvo antes deste plano | `git ls-remote origin docs/plano-gov-ciclos-residuais` | **vazio**, ec=0 — o ramo nasce com este commit |
| identidade git | `git config user.name` / `user.email` | `thiagodorgo` / `42915563+thiagodorgo@users.noreply.github.com` |
| `gh` | `gh --version`; `gh auth status` | `2.89.0`; logado como `thiagodorgo` (keyring), escopos `gist, read:org, repo, workflow` |
| últimos merges | `git log --oneline -8 origin/main` | `3b1fe0f9 (#395)` · `b3f0af5f (#394)` · `fc3363e3 (B-SAN3-00)` · `b8cd22df (B-SAN3-B1)` · `aadaa6d5 (B-SAN3-04a)` · `83a3c68c (B-SAN3-01)` · `02bd7dab (#386)` · `15ef3fbe (#385)` |

### 0.2 Plataforma e ferramentas — MEDIDO

| item | comando | saída |
|---|---|---|
| SO | `uname -a` | `MINGW64_NT-10.0-22631 N3SOH82 3.6.6-1cdd4371.x86_64 2026-01-15 22:20 UTC x86_64 Msys` (Windows 11 Pro do dono) |
| node | `node --version` | `v20.19.5` |
| git | `git --version` | `git version 2.53.0.windows.2` |
| python | `python --version` | `Python 3.13.14` |
| docker | `docker --version` · `docker info` | `Docker version 29.6.1` · `Server Version: 29.6.1 · Operating System: Docker Desktop · OSType: linux` |
| Postgres nativo | `which psql pg_ctl postgres` | **nenhum no PATH** |
| Postgres 16 descartável | `docker images postgres` · `timeout 120 docker run --rm postgres:16 postgres --version` | imagem `postgres:16` já em cache (642 MB; também `16-alpine`) · `postgres (PostgreSQL) 16.14 (Debian 16.14-1.pgdg13+1)`, ec=0 — **dá para subir** sem instalar nada |
| base viva | `docker ps` | `erp-postgres` (`postgres:16`, `0.0.0.0:5432`, Up 2 days, healthy) e `erp-redis` (`redis:7`, `6379`) — **não é alvo de ninguém** (§C7.1-bis) |
| `node_modules` neste worktree | `ls -d node_modules` | **ausente** → quem for executar `npm run check`/guards precisa de `npm ci` **próprio** (sem junction — §C7.1-ter(c)) |

### 0.3 Espelhos e guards de governança no head — MEDIDO

- `timeout 120 node scripts/sync-agent-agents.mjs --check` → `[agents-sync] OK — 26 agentes, espelho consistente.` ec=0.
  Contagem: `.claude/agents/*.md` = **23** + `especialistas/` = **3** (`jurado-semteto-c{1,2,3}-*`, cadeiras do #394,
  bloco encerrado); `.agents/agents/*.md` = 24 (23 + `README.md`, KEEP) + 3.
- `timeout 120 node scripts/audit-agents-skills.mjs` → `26 agentes · 12 skills · 0 BLOQUEIA · 2 AVISO` (C4-bis Bash
  tolerado por `P-GOV-BASH-EM-QUEM-JULGA`; **C10: 3 especialistas, ~3,3 KB de description, ~834 tokens em toda
  sessão**), ec=0. `MODELO_FIXADO` do script (l.127–131) lista **3** papéis: `planejador-mestre`, `porteiro-pos-merge`,
  `inspetor-de-terreno-da-junta` (l.127–132); papel **não listado** com `model:` não é conferido (l.448–449:
  `modeloExigido && …`). O script não confere o índice do README (só C0–C10; o README entra só como KEEP em C9).
- `timeout 120 node scripts/kpi-freeze.mjs --check` → `kpi-freeze: em dia (snapshot 2026-09-28).` ec=0.
- `timeout 120 python agent-orchestration/controle/gerar-indice-pendencias.py` → `421 cabecalhos / 410 IDs |
  FECHADA 110, ABERTA 311 | baldes - 110, C 69, B 103, A 139 | diferidas-materiais 13`, ec=0; `git diff --stat --
  pendencias-indice.md` → **vazio** (o índice commitado é exatamente o que o gerador produz; árvore restaurada).

### 0.4 As sete pendências — onde estão (`grep -n` em `pendencias.md`, 9867 linhas, md5 `ee2cef66…`) — MEDIDO

| pendência | linha | dono declarado | neste bloco? |
|---|---|---|---|
| `P-GOV-CICLOS-CORPOS-ORFAOS` | 9773 | orquestrador → bloco de governança próprio (`B-GOV-CICLOS-RESIDUAIS`) | **SIM** |
| `P-GOV-AUDITORIA-MAQUINA-PECAS-ABERTAS` | 9788 | orquestrador → mesmo bloco; M-05 e prazo de M-04 **ao dono** | **SIM** (com §3) |
| `P-GOV-SEM-TETO-AJUSTES-DA-JUNTA` | 9803 | `B-GOV-CICLOS-RESIDUAIS` | **SIM** |
| `P-GOV-CORPOS-EM-VOO-COM-TETO-REVOGADO` | 9827 | `B-O6R-04a` (#389) e `B-O6R-11` (#388) | **NÃO** (§5) |
| `P-GOV-INSPETOR-CICLO-DECLARADO-NAO-DERIVADO` | 9839 | `B-GOV-CICLOS-RESIDUAIS` | **SIM** |
| `P-GOV-PROJECT-MEMORY-TETO-VELHO` | 9849 | `B-GOV-CICLOS-RESIDUAIS` | **SIM** |
| `P-CHORE-CLEANUP-DESCE-EM-WORKTREES` | 9859 | orquestrador → bloco de ferramenta próprio | **NÃO** (§5) |

### 0.5 As cinco regras órfãs, re-medidas por mim (linha · espelho · origem por `git log -S`) — MEDIDO

| # | arquivo:linha (`.claude`) | espelho `.agents` | texto vivo | origem (`git log -S … --reverse`) |
|---|---|---|---|---|
| V-07 | `validador-mestre.md:100–101` | `:106` | *"Máximo 2 ciclos de reprovação por PR; na 3ª falha = CONDIÇÃO DE PARADA da rodada (reportar ao humano)."* | `bed17db3` 2026-07-08 (#141) |
| V-08 | `critico-adversarial.md:3` (description) e `:6` (corpo) | `:3`, `:13` | *"Nos ciclos 4–5 do protocolo de reprovação (6 especialistas não resolveram): … reabra o plano desde o objetivo, … mín. 5 fontes novas …"* | `21fdf516` 2026-07-10 (#158) |
| V-09 | `avaliador-mapas.md:17` | `:24` | *"ciclo 3 reabre premissa com pesquisa ≥5 fontes"* | `56a6077b` 2026-07-13 (#178) |
| V-10 | `agente-fabrica.md:8` | `:15` | *"Especialistas do ciclo 3 do protocolo de reprovação em `.claude/agents/especialistas/<tema>.md`"* | `21fdf516` 2026-07-10 (#158) |
| V-11 | `EXECUTION_MODEL.md:268–278` | — | tabela: *"1–2 … · 3 … (teto 6 agentes) · 4–5 junta ampliada · **após 5 falho → parada + dossiê ao humano**"* | `39eb46cc` 2026-07-28 (#303); último commit no arquivo `7fada65e` 2026-08-15 |
| + | `PROJECT_MEMORY.md:37` | — | *"🚧 ciclo 5 — **teto do §C7.4**"* (snapshot datado) | último commit `74430cc1` 2026-08-29 |

Os md5 EOL-neutros no head, para o "corpo julgado" do inspetor 3.3: `validador-mestre` `804d89f0…` ·
`critico-adversarial` `ae0a0461…` · `avaliador-mapas` `c78797ec…` · `agente-fabrica` `b5a365a1…` ·
`inspetor-de-terreno-da-junta` `de80b2a9…` (último commit `b3f0af5f`, #394) · `EXECUTION_MODEL.md` `69ffbd7b…` ·
`PROJECT_MEMORY.md` `a7c519bb…` · `CLAUDE.md` `08ab684a…` · `AGENTS.md` `5573177a…` · `decisoes.md` `e20b9696…`.

### 0.6 ONDE MORA A PROPRIEDADE — população gerada, lida linha a linha — MEDIDO

**Propriedade:** *regra viva que limita ou condiciona o número de ciclos de reprovação* (teto por contagem; parada
por N-ésima falha; passo obrigatório de um protocolo revogado num ciclo numerado). *Regra viva* pelo critério do plano
do #394 §3: contratos, companheiros nomeados pelo `CLAUDE.md`, corpos nos dois espelhos, protocolo de emulação Codex,
`PROTOCOLO-JUNTA-RESILIENTE.md`, skills, e `PROJECT_MEMORY.md` (leitura obrigatória antes de todo bloco).

**Gerador primário — `grep -rn -i 'ciclo'` (caixa-insensível), toda linha lida:**

| população | linhas | classificação (o que cada linha É) |
|---|---|---|
| `.claude/agents/**` (12 arquivos com ocorrência) | **70** | **5 = V-07…V-10** (validador 1, crítico 2, avaliador 1, fábrica 1) · 47 em `especialistas/` (as 3 cadeiras do #394, que citam tetos como **objeto de julgamento**, não como regra) · 13 no inspetor (2.1/2.2/2.3/3.1 = a regra nova + narrativa) · 3 narrativa de origem ("nasceu no ciclo 1": guardião 1, arnês 2) · 1 `planejador-mestre` ("ciclos de reprovação" como insumo) · 1 `agente-secops` ("não passa por ciclo") — soma 70 |
| `.agents/agents/**` (mesmos + README) | **84** | espelho 1:1 dos 70 (gerado) + README **14** (passo 5 = regra nova, l.59–65; tabela l.124/128 "a cada ciclo"; adendos datados) — **0** limitantes |
| `CLAUDE.md` | 29 | item 4 (regra nova, l.413–444), §C7.1-bis l.395, 4-bis, C2 "ciclo de vida", 1-ter narrativa — **0** limitantes |
| `AGENTS.md` | 29 | idem (l.441–472 / 423) — **0** |
| `EXECUTION_MODEL.md` | 9 | l.268–278 = **V-11** (tabela de 5 ciclos); l.60 "ciclo de vida"; l.301–326 exemplos datados (narram ciclo 1/2 de um PR) — **1 regra** |
| `comando-template.md` | 1 | "ciclo de vida C2" — 0 |
| `PROTOCOLO-JUNTA-RESILIENTE.md` | 2 | l.5 ("identidade nova por ciclo"), l.43 (narrativa) — 0 |
| `.claude/skills/**` + espelho | 3 + 3 | "ciclo de junta"/"ciclo de reprovação" como contexto de conduta — 0 |
| `PROJECT_MEMORY.md` | 2 | **l.37 = teto do §C7.4** (histórico em leitura obrigatória); l.112 "ciclo/estados" da OS — 1 |

**Resultado:** as únicas linhas que **limitam ou condicionam o número de ciclos** são **V-07…V-11** (11 linhas físicas
contando os espelhos) e **`PROJECT_MEMORY.md:37`**. Confere com a pendência e com a C2 do #394 (que mediu população
138 sob outro recorte); a diferença de população é recorte (eu incluí `especialistas/`, skills e `PROJECT_MEMORY`), não
de achado.

**Controle de recall (segundo gerador, independente do primeiro):** `grep -rn -i -E 'teto|m[aá]x(imo)?\.? ?(de
)?[0-9]|[0-9] ?[ªº] ?(falha|reprova)|[uú]ltim[ao] (tentativa|ciclo)|dossi[eê] ao|ap[oó]s [0-9]+ falh|n[aã]o h[aá]
ciclo'` nos mesmos arquivos (sem as 3 cadeiras do #394) → **15 linhas distintas**: item 4 do contrato 4 + 4 nos dois
espelhos (regra nova), `EXECUTION_MODEL.md:276` (parte de V-11), `PROJECT_MEMORY.md:37`, README l.59 (regra nova), e 4
falsos positivos ("sem teto" numa skill sobre outra coisa; "arquiteto" ×3). **0 linha nova** fora do gerador primário. *Este controle é lista de
termos e é usado só como controle de recall — não define a propriedade.* **Mutação que engana os dois geradores:** uma
regra escrita *"depois de duas reprovações, pare"* (sem "ciclo", "teto", "falha", "máx"). Por isso o critério de aceite
(§2.1) é **leitura de cada linha da população pela junta**, e o mecanismo permanente é o **inspetor lendo os corpos das
cadeiras** (§2.4, item 3.4), não um regex.

**Fora da população, por decisão declarada:** `docs/claude-code-handoff/{CLAUDE,EXECUTION_MODEL,PROJECT_MEMORY}.md` —
cópias **datadas** do pacote de handoff (último commit `361f2c18`, 2026-07-13, **anteriores** ao protocolo de 5 ciclos
de 2026-07-28); md5 diferem da raiz (`09766c77…` × `08ab684a…`; `dea477dd…` × `69ffbd7b…`); `grep -n -i -E
'teto|após 5|ciclos 4|na 3ª|dossiê ao|D-TETO|Não há ciclo'` → **0 linhas** para a propriedade. São pacote, não regra
viva (o `CLAUDE.md` raiz é o carregado); estão defasadas em **outros** assuntos (README do pacote: "KPIs só após
avaliação humana", política revogada) — **não é deste bloco** (§12). A junta pode reclassificar.

### 0.7 Estado do contrato, do gate e do registro que este bloco emenda — MEDIDO

- `CLAUDE.md` §C7.4 item 4 = l.413–444 (33 linhas); `AGENTS.md` = l.441–472. §C7.1-bis: `CLAUDE.md` l.391–409, a frase
  do insumo em l.395–396 (`AGENTS.md` l.423–424). §C7.4-bis: l.446–458 / 474–486. §C7.6-bis (precedente de **marca
  local** "fato dito pelo dono × derivado"): l.509–521.
- `inspetor-de-terreno-da-junta.md` (165 l., `b3f0af5f`): §2 l.66–79 (2.1 l.68–71; **2.2 l.73–76**; 2.3 l.78–79); §3
  l.81–118 (3.1 l.83–85; 3.1-bis l.87–89; 3.2 l.91–93; **3.3 l.95–118**, a frase "Cláusula inexistente = o item que a
  cita NÃO se aplica" em l.111–112); §4 l.120–141; §5 l.143–148. **Nenhum item deriva o número do ciclo** (`grep -n -E
  'R-<entrega>|contar|deriv' ` no corpo → só o caminho do 2.2, l.74).
- `decisoes.md` (2737 l.): última entrada `D-SEM-TETO-AUDITORIA-NO-3` l.2633–2737, com a emenda de 28/09 (T-21…T-25,
  mapa M-01…M-10) em l.2674–2737. `grep -n -i -E 'nuvem|cloud|cr[eé]dit'` → **0** entradas sobre nuvem/créditos (as 4
  ocorrências são de outros assuntos): **`D-NUVEM-FABLE-CREDITOS` não existe** — nasce neste bloco (§4).
- `EXECUTION_MODEL.md` l.268–278 (V-11); l.280–281 = paradas irredutíveis (**ficam**); l.283–326 exemplos datados (ficam).
- `PROJECT_MEMORY.md` l.37 (V-+); §0 "Governança que mudou e vale daqui em diante" l.48–60 — **sem** a
  `D-SEM-TETO-AUDITORIA-NO-3`.
- `.agents/agents/README.md`: seção "Gates fail-closed" l.106–110 lista `inspetor-de-terreno-da-junta` e
  `porteiro-pos-merge`; o auditor da máquina (M-02) **não tem linha** — coerente com não existir corpo.
- Registro `omega/reprovacoes/` (44 entradas): a grafia do ciclo **varia** — `R-B-O6R-02-ciclo4.md`,
  `R-B-O6R-02-ciclo2` (**diretório**), `R-B-O6R-01-ciclo3-premissa.md`, `R-omega3a-1.md`, `R-nav-menu-platform-2.md`,
  e (no ramo do #393) `R-B-GOV-MANDATO-1/2.md`. O contrato prescreve `R-<entrega>-<ciclo>.md`. **Isto condiciona o
  desenho do §2.4.**

### 0.8 KPI e PRs em voo — MEDIDO

- `Kpis/kpis-latest.json`: `version B-GOV-SEM-TETO · pr 394 · merge_commit b3f0af5f… · approved_head 7ad08690… ·
  blocks_completed 168`; history: última entrada `pr 394 · blocks_completed 168 · flutter 864/864 · backend 3052/3054 ·
  smoke 1202/1202`, com o backfill do #394 pago pelo #395 (nota na própria entrada). O #395 **não tem entrada própria**
  (PR de registro sem ID de bloco — precedente #386/#382); não há backfill pendente.
- `gh pr view` → **#393** `OPEN/DRAFT` head `ade74d09` (andou desde o porteiro do #394: `e4aa7592` → `ade74d09`);
  **#388** `a24f58b5`; **#389** `bc3e736b` — nenhum mergeado. `gh pr list --state open` → só esses três.
  Consequência (§7): `blocks_completed` **168 → 169** se este mergear primeiro; **recontado no pré-merge**.

### 0.9 Pré-condição do start que NÃO está no repositório — MEDIDO-AUSENTE → HIPÓTESE

`grep -rl '#395' agent-orchestration/omega/juntas agent-orchestration/docs/status-geral.md
agent-orchestration/controle/pendencias.md` → **0 arquivos**; `ls omega/juntas | grep -i PORTEIRO` → nenhum;
`votos/B-GOV-SEM-TETO/` só tem `PORTEIRO-394.md`. **O parecer do `porteiro-pos-merge` do #395 (último merge) não
está versionado.** §C2.8: *"Sem parecer dele, nenhum bloco novo começa."* **HIPÓTESE H1:** o parecer existe fora do
repositório (scratchpad do orquestrador) ou não foi produzido. **Comando que a derruba:** o orquestrador aponta o
arquivo e o versiona (§C7.7 P1) antes de lançar o dev; se não existe, o porteiro do #395 nasce **antes** do dev deste
bloco. Isto é pré-condição do **start do dev**, não deste plano.

### 0.10 O que ficou HIPÓTESE além de H1

- **H2 — as palavras cruas do dono de 29/09 (nuvem/créditos).** Não estão em arquivo rastreado; chegaram a mim
  parafraseadas pelo mandato. Derruba: o orquestrador cola o literal no `D-NUVEM-FABLE-CREDITOS` com proveniência
  (§4), ou o dono confirma (Q3, §3).
- **H3 — "nuvem não mede comportamento de Windows".** É a delimitação que o mandato deu; nesta sessão **não pude
  medir a nuvem** (rodei no Windows). Derruba: primeiro run na nuvem publica o seu `uname -a`, `git config
  core.autocrlf`, `docker --version` no §0 do artefato que produzir.
- **H4 — os 3 PRs em voo não integram a `main` antes deste merge.** Medido agora (0.8); muda a qualquer hora.
  Derruba: `gh pr view 393 388 389 --json state` no pré-merge (recontagem C1-A3).

---

## §1 — Objetivo · ator · fluxo · contrato

- **Objetivo:** fechar as **cinco** pendências que o #394 deixou com dono `B-GOV-CICLOS-RESIDUAIS`, de modo que
  **nenhuma regra viva** — corpo de agente, companheiro do contrato, memória de leitura obrigatória — continue limitando
  ou condicionando o número de ciclos; que o gatilho do ciclo 3 ganhe as peças que o orquestrador pode desenhar (e que o
  dono decida as dele); que a trava do ciclo 4 funcione contra **qualquer** ref julgada e com o **número do ciclo medido**;
  e registrar a decisão do dono de 29/09 (`D-NUVEM-FABLE-CREDITOS`) com o que ela **não** autoriza.
- **Ator:** o dev do bloco (identidade nova; **não** o orquestrador, que é parte — autor do texto de 27/09 e das
  pendências). **Consumidores:** todo agente que lê `CLAUDE.md`/`AGENTS.md`; os quatro gates; o Codex via `.agents/`.
- **Fluxo origem→destino:** pendências (dono nomeado) + votos/ata do #394 (onde cada ajuste está medido) → este plano →
  crítico (§10) → dev → junta → merge → porteiro. Palavras do dono (§3, se houver resposta) → `decisoes.md` →
  contrato, **nessa ordem**.
- **Contrato (o que a entrega tem de satisfazer):** (i) cada pendência SIM da tabela 0.4 tem **teste de encerramento
  executado** e sai `FECHADA`, ou sai `PARCIAL` **só** pelo que depende do dono (§3), com a pergunta transcrita;
  (ii) toda linha nova de contrato/corpo é **mecanismo do transcritor declarado** (T-26…T-33, §2.7), nunca vestida de
  palavra do dono (C1-A1); (iii) espelho `CLAUDE.md` ↔ `AGENTS.md` idêntico nas regiões tocadas, `.agents/agents/`
  **só pelo `sync`**; (iv) `--check` ec=0, auditor 0 BLOQUEIA, índice de pendências pelo gerador; (v) KPI por PR (§C3);
  (vi) registro do bloco.
- Sem rotas/payloads/HTTP; sem migration; **sem PD** (§C7.3): não há dúvida técnica — há decisões do dono a
  registrar e mecanismo de gate a completar com maquinaria que já existe.

---

## §2 — As cinco pendências: conserto · critério de aceite · mutação que deixa vermelho

Convenção: **conserto** = a propriedade que o texto do dev tem de satisfazer (a redação é dele); **aceite** = o que a
junta mede; **mutação** = a alteração que, feita numa cópia fora do repositório, tem de deixar o aceite vermelho
(vermelho-controle obrigatório).

### 2.1 `P-GOV-CICLOS-CORPOS-ORFAOS` — V-07…V-11

**Propriedade comum:** a linha deixa de limitar/condicionar o número de ciclos e passa a apontar para o §C7.4 item 4
(`D-SEM-TETO-AUDITORIA-NO-3`); **todo o resto do arquivo é byte-idêntico** (diff confinado às linhas nomeadas, hunks
contados); espelho `.agents/` **regenerado pelo `sync`**, nunca à mão.

| # | conserto (propriedade) | o que NÃO mexer |
|---|---|---|
| V-07 `validador-mestre.md:100–101` | a regra de conduta passa a dizer: reprovação **abre o ciclo seguinte** (§C7.4 item 4); não há teto por contagem; o validador **reporta achados, não conta ciclos**; no ciclo 3 com `bloqueia`, a auditoria da máquina precede o ciclo 4 | as demais regras de conduta (l.98–99, 102); "reportar ao humano" sai **só** onde estava amarrado à 3ª falha — as paradas do §C7.5 não são deste arquivo |
| V-08 `critico-adversarial.md:3` e `:6` | sai *"Nos ciclos 4–5 … (6 especialistas não resolveram)"*; o gatilho de **reabrir a premissa** passa a ser o sinal que o contrato já tem — o relato do orquestrador de **classe repetida sem informação nova** (item 4) ou o parecer da auditoria da máquina apontando premissa herdada/dado podre —, mantendo pesquisa ≥5 fontes (PD) e as três saídas (reduzir escopo, trocar abordagem, dividir) | **"Máx 2 rodadas de ataque/defesa"** fica — são rodadas de ataque ao **plano**, não ciclos de junta (classificação da C2 do #394, que eu confirmo pela leitura: l.6 primeira frase) |
| V-09 `avaliador-mapas.md:16–18` | o parêntese passa a: fábrica cria especialista **a cada ciclo**; **sem teto por contagem** (§C7.4 item 4); reabertura de premissa segue o `critico-adversarial` | o checklist (1)–(8) e "Não corrijo código" |
| V-10 `agente-fabrica.md:8` | *"Especialistas do ciclo 3 do protocolo de reprovação"* → *"Especialistas de ciclo de reprovação (a cada ciclo, §C7.4 item 4)"* | os outros dois tipos de agente e o rodapé |
| V-11 `EXECUTION_MODEL.md:268–278` | o cabeçalho + a tabela de 5 ciclos dão lugar a um resumo **coerente com o item 4**: sem teto por contagem; cada ciclo registrado em `R-<entrega>-<ciclo>.md`; fábrica cria especialistas por ciclo; §C7.4-bis (três papéis); **ciclo 3 com `bloqueia` → auditoria da máquina antes do ciclo 4** (parecer em `R-<entrega>-ciclo3-auditoria.md`; inspetor não libera ciclo ≥4 sem ele) | l.280–281 (paradas irredutíveis) e l.283–326 (exemplos datados: narram, não limitam) |

**Aceite (C1):** (a) gerador primário do §0.6 re-executado no head (`grep -rn -i ciclo` na população, **cada linha
lida e classificada no voto**) → **0** linhas que limitem/condicionem ciclos; (b) controle de recall → 0 novas;
(c) `git diff origin/main...HEAD -- <corpo>` = hunks **1 · 2 · 1 · 1 · 1** (validador · crítico · avaliador · fábrica ·
EXECUTION_MODEL), só nas linhas nomeadas; (d) `sync --check` ec=0; (e) `grep -c 'D-SEM-TETO-AUDITORIA-NO-3'` ≥ 1 em
cada um dos cinco. **Mutação:** reinserir *"na 3ª falha = CONDIÇÃO DE PARADA"* numa cópia do `validador-mestre` → o
gerador a lista como limitante (vermelho); espelhar só um lado → `--check` `DIVERGE` (vermelho).

**Teste de encerramento da pendência (o dela, executado):** busca pela propriedade, `-i`, nos dois espelhos e no
`EXECUTION_MODEL.md` → 0 linhas vivas; vermelho-controle acima.

### 2.2 `P-GOV-AUDITORIA-MAQUINA-PECAS-ABERTAS` — M-02 · M-04 (resto) · M-05 · M-06 · M-09

A pendência divide: **M-02, M-06, M-09** são padronização (dono: este bloco); **M-04 (resto)** é meio deste bloco
(executor, atestação) e meio do dono (prazo); **M-05** é do dono. **Este plano desenha só o que a pendência entregou ao
bloco; o que é do dono vai para o §3 como pergunta, e o dev não decide.**

**M-02 — corpo, papel e modelo do auditor.** Conserto: nasce **`.claude/agents/auditor-da-maquina.md`** (+ espelho pelo
`sync`; + **uma linha** na tabela "Gates fail-closed" de `.agents/agents/README.md` l.106–110, porque o README é KEEP
e o índice divergente do diretório é defeito medido pelo cabeçalho de `audit-agents-skills.mjs`). Propriedades do corpo:
frontmatter `name: auditor-da-maquina` (= arquivo, C2 do auditor), `description` ≥ 40 chars e **curta** (C10: pesa em
toda sessão), `tools: Read, Grep, Glob, Bash`, **`model: fable`** com o bloco de fallback `D-FALLBACK-MODELO-FABLE-OPUS`
verbatim dos outros gates (é gate: o parecer dele condiciona o ciclo 4 — mesmo tratamento do inspetor e do porteiro);
**nasce quando o orquestrador o convoca** (ciclo 3 reprovado por `bloqueia` que reprova, §C7.1-ter(a)) e **morre ao
entregar**; **identidade nova por bloco**; inelegível quem votou, planejou ou desenvolveu no bloco (por nome, contra
`OBITUARIO-IDENTIDADES.md` e as atas); responde **(a)–(e) do item 4, cada uma com o comando executado e a saída** —
(a) re-executa a evidência registrada (P1) de **cada** achado `bloqueia` dos ciclos 1–3 (não amostra: "amostra do
próprio autor" é classe de defeito) e classifica *defeito real* × *artefato de processo*; (b) composição × inelegibilidade
por nome; (c) as premissas do §0 de cada plano de ciclo re-medidas; (d) o mandato do orquestrador conferido antes do voto
(pelo pré-voo por máquina se existir na `main`, senão por leitura registrada); (e) parecer do inspetor de **cada** ciclo
presente e `LIBERADO`; veredito **`máquina sã`** | **`máquina defeituosa`** (com cada defeito nomeado por
`arquivo:linha` e comando); grava **`omega/reprovacoes/R-<entrega>-ciclo3-auditoria.md`** por P1/P2 (esqueleto
primeiro); **não conserta, não vota, não planeja**. O item 4 do contrato passa a **nomear** o corpo (*"Conduz a
auditoria o `auditor-da-maquina` (identidade nova por bloco; Fable por contrato)"*), nos dois espelhos.
**Aceite:** corpo nos dois espelhos (`git ls-tree HEAD`, `--check` ec=0); `audit-agents-skills.mjs` 0 BLOQUEIA;
linha no README; `grep -c auditor-da-maquina CLAUDE.md AGENTS.md` ≥ 1 cada; as cinco perguntas com ≥1 comando cada no
corpo (C1 item 3 conta). **Mutação:** apagar o comando de uma pergunta → a contagem cai; trocar `model: fable` por
`opus` → **o auditor de agentes NÃO acusa** (`MODELO_FIXADO` não o lista; `scripts/**` é PROIBIDO aqui) → a junta
confere por `grep` e o dev abre **`P-GOV-AUDITOR-DA-MAQUINA-FORA-DO-MODELO-FIXADO`** (BAIXA; dono: bloco de ferramenta
que edite `scripts/audit-agents-skills.mjs`) — nada em silêncio.

**M-04 (resto) — quem confere que o conserto consertou, e o que limita a espera.** Conserto (parte do bloco):
(i) **executor** do conserto = um bloco de governança (`B-GOV-*`) com junta própria, desenvolvido por identidade que
**não auditou** (§C7.4-bis) — o item 4 diz isso no ramo "máquina defeituosa"; (ii) **atestação** = o **mesmo
`auditor-da-maquina`** (mesma identidade) re-executa a(s) pergunta(s) que reprovou depois do conserto mergeado e apensa
*"conserto verificado — máquina sã"* ao **mesmo** `R-<entrega>-ciclo3-auditoria.md`; o inspetor **2.2** passa a exigir
**essa linha** (hoje exige só o "registro do conserto"). (iii) **prazo e desfecho alternativo** → **dono (Q2, §3)**;
até a resposta, o contrato diz explicitamente *"sem prazo, por decisão pendente do dono"* (declarado, não escondido —
é a C1-A2 do #394 dita por inteiro). **Aceite:** o ramo "máquina defeituosa" (`CLAUDE.md` l.432–435 / `AGENTS.md`
l.460–463) nomeia **executor** e **atestação**; o inspetor 2.2 cita a linha de atestação; o prazo tem **ou** a resposta
do dono transcrita **ou** a frase de pendência declarada. **Mutação:** apagar a frase do executor → o gerador de "caminhos
até parada" da C1 do #394 volta a classificar o ramo como *PRÉ-CONDIÇÃO SEM SAÍDA* (8 → 8+); apagar a exigência da
atestação no 2.2 → cenário "defeituosa + conserto registrado sem verificação" sai `satisfeito` (vermelho).

**M-05 — recorrência.** **Do dono (Q1, §3).** O dev **não** escreve regra de recorrência. Se houver resposta:
transcrita verbatim em `decisoes.md` (entrada própria, §2.7) e depois no item 4. Se não houver: a pendência fecha
**PARCIAL** por M-05 (o gerador do índice trata PARCIAL como aberta — l.27 do script — e é isso que se quer).

**M-06 — o relato "classe repetida sem informação nova": onde fica, quem lê, consequência.** Conserto: **onde** = seção
obrigatória no `R-<entrega>-<ciclo>.md` de **todo ciclo ≥ 2** (*"Classe repetida sem informação nova? sim/não — classe
nomeada, achado do ciclo anterior citado"*), escrita pelo orquestrador (é o dever que o item 4 já lhe dá); **quem lê**
= o `auditor-da-maquina` (é o insumo direto da pergunta (a)) e o inspetor **2.1** (o `R-*` do ciclo anterior tem de
carregar a seção); **consequência** = ausência da seção é **ressalva forte** na junta do ciclo 2 e **`BLOQUEADO`** da
junta do ciclo 3 em diante (sem ela, a auditoria do ciclo 3 não tem o seu insumo). Não é teto: não conta ciclos —
exige um relato que o dono mandou fazer. Texto em `CLAUDE.md` l.441–442 (+ espelho) e no inspetor 2.1.
**Aceite:** `arquivo:linha` no item 4 e no 2.1; o simulador da C2 (§2.4) com `R-*` do ciclo anterior sem a seção →
`BLOQUEADO` em ciclo 3, ressalva em ciclo 2. **Mutação:** apagar a cláusula do 2.1 → cenário sai `satisfeito`.

**M-09 — (b)/(c) da auditoria × (a)/(b)/(c) do §C7.4-bis: somam ou substituem?** Conserto: **SOMAM** — as respostas do
§C7.4-bis são **auto-atestação do orquestrador, por ciclo, na ata**; as (b)/(c) da auditoria **verificam por execução**,
por identidade independente, as três atas de uma vez. Uma frase no item 4, logo após (e), nos dois espelhos.
**Aceite:** `grep -n 'somam' CLAUDE.md AGENTS.md` (ou o verbo que o dev escolher, publicado) ≥ 1 cada, na região do
item 4. **Mutação:** apagar → a tabela `arquivo:linha` da C3 fica com M-09 vazio.

**Teste de encerramento da pendência (o dela):** cada uma das cinco tem `arquivo:linha` no contrato ou no corpo de um
gate que a responde, **ou** decisão do dono em `decisoes.md` que a dispensa. Com Q1/Q2 respondidas → `FECHADA`; sem →
`PARCIAL` (M-05; prazo de M-04), com as perguntas literais dentro da pendência.

### 2.3 `P-GOV-SEM-TETO-AJUSTES-DA-JUNTA` — C1-A1 · C1-A2 · C2-3-1 · C3-A1

**C1-A1 — marca local que separa palavra do dono de mecanismo do transcritor, no ponto de leitura.** Conserto:
o item 4 ganha **marca local por unidade normativa** (bullet/frase), com duas classes: `[dono W-n]` (só as seis
proposições W1–W6 do plano do #394 §2, na forma citada) e `[mecanismo T-nn]` (tudo o mais, com o número da elaboração
em `decisoes.md`); o cabeçalho do item 4 diz a convenção em uma linha (precedente **§C7.6-bis l.518–520**: *"A linha do
Astra é fato dito pelo dono; a do Sol é derivada"* — a separação **dentro** do contrato). As linhas que este bloco
acrescenta (§2.2, §2.4) nascem marcadas `[mecanismo T-26…T-33]`. **A marca não muda conteúdo normativo:** o gerador de
proposições (o `item2.py` da C1 do #394, ou equivalente publicado) tem de devolver **o mesmo N** de proposições antes e
depois, salvo as que este bloco acrescenta (declaradas). **Aceite (C3 item 1):** gerador sobre o item 4 do head → **0
unidades sem marca**; `[dono]` só nas seis W; N antes/depois publicado; md5 EOL-neutro do item 4 `CLAUDE.md` =
`AGENTS.md`. **Mutação:** apagar uma marca → 1 unidade sem marca (vermelho); trocar `[mecanismo]` por `[dono]` numa
T-nn → `[dono]` > 6 (vermelho).

**C1-A2 — o "continuaremos" no ramo "máquina defeituosa" depende de conserto sem executor, sem prazo e sem desfecho
alternativo.** Conserto: coberto por **M-04 (§2.2)** — executor e atestação são mecanismo deste bloco; **prazo e
desfecho alternativo são Q2 (§3)**. Aceite e mutação: os de M-04.

**C2-3-1 — contra uma ref julgada anterior ao #394, o item 3.3 ("cláusula inexistente na ref = o item não se aplica")
desliga a trava do 2.2.** Conserto: o inspetor **3.3** ganha a distinção que faltava: **norma de PROCESSO** (o §C7 do
`CLAUDE.md` e os corpos de gate) é lida **da `origin/main` no momento da inspeção** (`git show origin/main:CLAUDE.md`)
e vale para **toda** junta, independentemente de a ref julgada carregar o contrato; *"cláusula inexistente na ref"*
aplica-se à **norma de PRODUTO/ESCOPO** (o que o bloco prometeu no plano dele), **nunca ao §C7**; e o **2.2** diz entre
parênteses *"(regra da `origin/main`, não da ref julgada)"*. O §C7.1-bis (`CLAUDE.md` l.395; `AGENTS.md` l.423) ganha
as mesmas quatro palavras, para contrato = corpo. **Aceite (C2 item 1):** simulador que **lê o texto do corpo** (como
o `trava.py` da C2 do #394, publicado no voto): cenário S1 = ciclo 4, ref julgada com o `CLAUDE.md` **pré-#394**
(ex.: `bc3e736b`), sem parecer → **`BLOQUEADO` nas duas leituras** (cláusula e seção); regressões: 2.1 sem ata →
`BLOQUEADO`; 2.3 sem plano → `BLOQUEADO`; S5 ciclo 3 → "não se aplica". **Mutação:** apagar a frase da distinção no 3.3
→ as duas leituras voltam a divergir (`LIBERADO` × `BLOQUEADO`) — vermelho.

**C3-A1 — a emenda do #394 cruzou o §6 do plano dele sem registrar a divergência.** Conserto: **parágrafo datado dentro
da entrada `D-SEM-TETO-AUDITORIA-NO-3`** (append-only, `decisoes.md` após l.2737, antes de qualquer `##` novo):
*"Divergência registrada (§A2, <data>): a emenda de 2026-09-28 acrescentou ao item 4 T-21, T-22, T-24 e T-25 além do
que o §6 do plano `B-GOV-SEM-TETO-plano.md` permitia; o plano não foi emendado; a cadeira C3 a declarou (C3-A1,
`J-B-GOV-SEM-TETO.md`); consolidada aqui pelo `B-GOV-CICLOS-RESIDUAIS`."* **Aceite:** `grep -c 'C3-A1'
decisoes.md` ≥ 1 **dentro** da entrada (entre l.2633 e o próximo `##`). **Mutação:** apagar o parágrafo → 0.

**Teste de encerramento da pendência (o dela):** (C1-A1) toda proposição do item 4 que não é palavra do dono tem marca
local; (C1-A2) executor/atestação nomeados e prazo respondido **ou** declarado pendente; (C2-3-1) ref pré-#394 →
`BLOQUEADO` por mutação; (C3-A1) parágrafo presente.

### 2.4 `P-GOV-INSPETOR-CICLO-DECLARADO-NAO-DERIVADO` — o número do ciclo vem do repositório

Conserto: **item 2.0 novo** no inspetor, antes do 2.1 — *"O número do ciclo é DERIVADO do repositório, nunca lido do
briefing. N = 1 + maior k entre os registros `omega/reprovacoes/R-<entrega>-(ciclo)?<k>*` da entrega (arquivo **ou
diretório**; as duas grafias existem no registro: `R-B-O6R-02-ciclo4.md`, `R-B-GOV-MANDATO-2.md`). Registro da
entrega que **não case o padrão** = `BLOQUEADO` até o orquestrador o nomear no briefing com o seu k. Briefing que
declare N diferente do derivado = `BLOQUEADO`. Os itens 2.1, 2.2 e a trava do ciclo 4 usam o N derivado."* O §C7.1-bis
ganha *"(número do ciclo derivado do registro `R-*`, não declarado)"*, nos dois espelhos. O `R-<entrega>-ciclo3-auditoria.md`
**não** conta como ciclo (k não é número) — dito no item.
**Aceite (C2 item 2):** simulador: briefing "ciclo 3" com `R-<e>-1.md`, `R-<e>-2.md`, `R-<e>-ciclo3.md` presentes →
**`BLOQUEADO`** (é o vermelho-controle da pendência); com 1 e 2 → item satisfeito e N=3; registro `R-<e>-premissa.md`
(sem k) → `BLOQUEADO`; entrega sem `R-*` → N=1, nada bloqueia; `R-<e>-ciclo3-auditoria.md` presente não altera N.
**Mutação:** apagar o 2.0 → o cenário "ciclo 3 com três R-*" volta a passar (vermelho).

**Mecanismo permanente que este bloco acrescenta ao mesmo corpo — item 3.4 (novo), declarado T-32:** *"Os corpos das
cadeiras desta junta, nos dois espelhos, não carregam regra que limite ou condicione o número de ciclos: `grep -n -i
ciclo` em cada corpo, **cada linha lida**; linha que limita/condiciona = `BLOQUEADO`; citação de teto como objeto de
julgamento não é regra."* É o executor do teste de encerramento de `P-GOV-CORPOS-EM-VOO-COM-TETO-REVOGADO` (que
continua **dos blocos #388/#389** — §5) e a resposta à mutação do §0.6 que engana os geradores. **Aceite (C2 item 3):**
corpo de cadeira semeado com *"CICLO 2 — o ÚLTIMO"* numa cópia → `BLOQUEADO`; corpo que cita *"o teto revogado
`D-TETO-DOIS-CICLOS`"* como objeto → não bloqueia. **Mutação:** apagar o 3.4 → o semeado passa.

**Fronteira do inspetor, por diff:** hunks **só** em 2.0 (novo), 2.1 (cláusula M-06), 2.2 (origem da norma + atestação),
3.3 (distinção processo/produto) e 3.4 (novo) — **≤ 5 hunks**; `grep -c BLOQUEADO` cresce **só** pelo que os itens novos
acrescentam (publicar antes/depois); §1, §4, §5 e "Como você entrega" byte-idênticos.

### 2.5 `P-GOV-PROJECT-MEMORY-TETO-VELHO` — l.37

Conserto: a célula de l.37 passa a **histórico marcado** — *"🚧 ciclo 5 em 2026-08-28 (histórico: então sob o teto do
§C7.4, revogado por `D-SEM-TETO-AUDITORIA-NO-3`, 2026-09-27)"* — e a lista "Governança que mudou e vale daqui em
diante" (l.48–60) ganha **um bullet** para a `D-SEM-TETO-AUDITORIA-NO-3` (sem teto de ciclos; ciclo 3 com `bloqueia` →
auditoria da máquina antes do ciclo 4; revoga `D-TETO-DOIS-CICLOS`). Nada mais no arquivo: é snapshot datado
(28/08) e refrescá-lo é outro trabalho (§12). **Aceite:** `grep -n -i teto PROJECT_MEMORY.md` → só linhas marcadas
"histórico" ou que nomeiem a revogação; 2 hunks. **Mutação:** restaurar a célula antiga → `teto do §C7.4` sem marca.

### 2.6 O que o `.agents/agents/README.md` NÃO precisa

Medido (§0.6): o README já diz "a cada ciclo" (l.124, l.128) e o passo 5 já é a regra nova. Toca-se **uma linha** (a
do `auditor-da-maquina` na tabela de gates) e nada mais. Se o dev achar outra linha do README que a propriedade alcance,
**registra** (não corrige em silêncio) — é fora do §6.

### 2.7 Elaborações deste bloco, numeradas para a C3 julgar (nenhuma é palavra do dono)

| # | onde | o quê | classe |
|---|---|---|---|
| T-26 | item 4 + corpo novo | o auditor tem corpo, nome, modelo Fable, identidade nova por bloco (M-02) | `[acrésc]` — peça entregue ao bloco pela pendência |
| T-27 | item 4 ramo "defeituosa" + inspetor 2.2 | executor (bloco de governança, identidade que não auditou) e atestação pelo mesmo auditor (M-04) | `[acrésc]` |
| T-28 | item 4 + inspetor 2.1 | o relato de classe repetida vive no `R-*` do ciclo; lido pelo auditor e pelo inspetor; ausência bloqueia de ciclo 3 em diante (M-06) | `[acrésc]` |
| T-29 | item 4 | (b)/(c) da auditoria **somam** às do §C7.4-bis (M-09) | `[interp]` |
| T-30 | inspetor 2.0 + §C7.1-bis | número do ciclo derivado do registro | `[acrésc]` |
| T-31 | inspetor 3.3 + 2.2 + §C7.1-bis | norma de processo lida da `origin/main`; "cláusula inexistente" só para produto/escopo | `[acrésc]` |
| T-32 | inspetor 3.4 | corpos das cadeiras sem regra de ciclos, lidos pelo inspetor | `[acrésc]` |
| T-33 | item 4 | marcas locais `[dono]`/`[mecanismo]` — forma, sem conteúdo normativo (C1-A1) | `[forma]` |

Todas entram no **parágrafo datado** da entrada `D-SEM-TETO-AUDITORIA-NO-3` (junto do C3-A1), como o #394 fez com
T-21…T-25. **Se o dono responder Q1/Q2**, as respostas entram em entrada própria
(`D-AUDITORIA-MAQUINA-RECORRENCIA-E-PRAZO (decisão do dono, <data>)`), **verbatim, com proveniência**, e só depois no
item 4 — marcadas `[dono]`.

---

## §3 — Perguntas para o DONO (escritas como ele vai ler; o plano NÃO decide por ele)

O orquestrador leva **antes** de lançar o dev. Resposta = decisão do dono (§A1.1), transcrita verbatim. **Sem resposta,
o bloco entrega sem decidir**: M-05 e o prazo de M-04 ficam abertos, a pendência 2.2 sai `PARCIAL`, e o contrato diz
"pendente do dono" onde couber. Nada aqui bloqueia o resto do bloco.

> **Q1 — Auditoria de novo, ou só uma vez? (M-05)**
> Hoje a regra diz: se um bloco reprovar três vezes, auditamos a orquestração e a junta antes do 4º ciclo, e o parecer
> dessa auditoria vale para os ciclos seguintes. Se o mesmo bloco continuar reprovando — 4º, 5º, 6º ciclo — a auditoria
> se repete? Se sim, quando: a cada ciclo, de três em três, ou quando o orquestrador relatar de novo que a mesma classe
> de defeito voltou sem informação nova? Se não, o parecer do 3º ciclo vale para o bloco inteiro.

> **Q2 — Quanto se espera pelo conserto da máquina? (prazo de M-04 / C1-A2)**
> Quando a auditoria disser "máquina defeituosa", o conserto passa a ser condição para o 4º ciclo abrir. Existe um
> limite para essa espera? E se o conserto não vier dentro do limite, o que acontece com o bloco: fica parado até vir,
> você é chamado, ou o 4º ciclo abre com a máquina como está e a ressalva escrita na ata?

> **Q3 (opcional) — As suas palavras sobre a nuvem (29/09).**
> O registro `D-NUVEM-FABLE-CREDITOS` vai citar a sua decisão de usar créditos da Anthropic para rodar agentes na
> nuvem, começando pelo planejador em Fable. Quer que entre o seu texto literal (cole-o), ou basta a descrição do
> orquestrador marcada como paráfrase?

---

## §4 — `D-NUVEM-FABLE-CREDITOS` — como se registra, e o que NÃO autoriza

- **Onde:** `agent-orchestration/controle/decisoes.md`, entrada nova após a `D-SEM-TETO-AUDITORIA-NO-3` (append-only),
  no formato do precedente `D-FALLBACK-MODELO-FABLE-OPUS` (l.2049+): título com "(decisão do dono, 2026-09-29)";
  **Status · Origem · Impacto**; **"A ordem que a originou"** com as palavras do dono **como transmitidas pelo
  orquestrador e assim rotuladas** (H2: o literal não está em arquivo; se Q3 trouxer o texto, entra como "nas palavras
  dele"; senão, "paráfrase do orquestrador" — a lição T-01 do #394: não normalizar sob rótulo de literal).
- **O que decide (fonte §A1.1, não junta):** créditos da Anthropic podem ser usados para rodar agentes de junta/gate na
  nuvem; o **Fable como `planejador-mestre`** é o primeiro papel, e o piloto é este bloco.
- **O que NÃO autoriza (escrito na entrada):** (1) agente na nuvem **não mergeia**; (2) **não empurra `main`** — só ramo
  de bloco (`push -u origin <ramo>`), nunca `--force`; (3) **não mede comportamento de Windows** — afirmação feita de um
  run na nuvem sobre CRLF/`autocrlf`, junction, caminhos longos, `.claude/worktrees/`, Docker Desktop ou base viva é
  **HIPÓTESE** até ser medida na máquina do dono. E o que **não muda**: §C7.6/§C7.6-bis (modelos fixados, fallback
  Fable→Opus→PARA, declaração de substituição) — a nuvem é **lugar de execução**, não regra; por isso **`CLAUDE.md` não
  é tocado por esta decisão** (nenhum agente age diferente ao lê-la; quem a aplica é o orquestrador ao lançar).
- **Registro do piloto, medido, obrigatório na entrada:** *"O plano do `B-GOV-CICLOS-RESIDUAIS` (primeiro artefato
  do piloto) foi produzido numa sessão que rodou na máquina Windows do dono (`uname`: `MINGW64_NT-10.0-22631
  N3SOH82`), não na nuvem — a entrada não o cita como evidência de execução na nuvem; o primeiro run na nuvem publica o
  seu próprio terreno."* (é o §0 deste plano; sem esta linha a entrada fabricaria um fato).
- **Aceite (C3 item 1):** entrada presente; três "não autoriza"; palavras do dono com proveniência declarada; nota do
  terreno do piloto presente; `CLAUDE.md`/`AGENTS.md` sem `D-NUVEM` (`grep -c` = 0). **Mutação:** apagar a nota do
  terreno → a entrada afirma piloto na nuvem que este plano falsificou (vermelho); acrescentar `D-NUVEM` ao contrato
  → fora do §6 (vermelho de escopo).

---

## §5 — O que fica FORA deste bloco (dito por escrito, com dono)

- **`P-GOV-CORPOS-EM-VOO-COM-TETO-REVOGADO`** — as 6 cadeiras dos PRs **#389** (`B-O6R-04a`) e **#388** (`B-O6R-11`)
  vivem nos ramos deles, não na `main` (medido: `gh pr view` OPEN; corpos não estão em `3b1fe0f9`). ERRATA e
  versionamento são **daqueles blocos, antes das juntas deles**. Este bloco entrega o **executor** do teste de
  encerramento (inspetor 3.4), não o conserto.
- **`P-CHORE-CLEANUP-DESCE-EM-WORKTREES`** — `scripts/post-merge-cleanup.sh:39`; `scripts/**` é PROIBIDO; bloco de
  ferramenta próprio (`B-CHORE-CLEANUP-FRONTEIRA`), como a pendência já diz.
- **Aposentadoria das 3 cadeiras `jurado-semteto-c{1,2,3}-*`** (bloco encerrado, `D-APOSENTADORIA-ELENCO-EFEMERO`,
  ~834 tokens por sessão medidos pelo auditor C10) — rotina do orquestrador em `controle/aposentadoria-especialistas.md`,
  não deste bloco; **não tocar** os corpos.
- **`scripts/audit-agents-skills.mjs` `MODELO_FIXADO`** para o `auditor-da-maquina` — pendência nova nomeada em §2.2.
- **Parecer do porteiro do #395** — pré-condição do start (H1), do orquestrador.

---

## §6 — Escopo (§C4) — PERMITIDO e PROIBIDO, caminhos exatos

**PERMITIDO**
- `CLAUDE.md` — **§C7.4 item 4** (l.413–444: marcas locais T-33; nome do auditor T-26; executor/atestação T-27 no ramo
  l.432–435; relato T-28 em l.441–442; frase T-29 após (e); "sem prazo, pendente do dono" ou a resposta Q2);
  **§C7.1-bis** l.395–396 (T-30, T-31 — poucas palavras). Nada fora dessas duas regiões.
- `AGENTS.md` — espelho das **mesmas** regiões (l.441–472; l.423–424), **mesmo commit**.
- `.claude/agents/inspetor-de-terreno-da-junta.md` — **só** itens 2.0 (novo), 2.1, 2.2, 3.3, 3.4 (novo) — §2.4.
- `.claude/agents/validador-mestre.md` l.100–101 · `.claude/agents/critico-adversarial.md` l.3, l.6 ·
  `.claude/agents/avaliador-mapas.md` l.16–18 · `.claude/agents/agente-fabrica.md` l.8 — §2.1.
- `.claude/agents/auditor-da-maquina.md` — **novo** (§2.2, M-02).
- `.agents/agents/**` — **somente por `node scripts/sync-agent-agents.mjs`** (nunca à mão), **exceto**
  `.agents/agents/README.md` l.106–110: **uma linha** na tabela de gates.
- `EXECUTION_MODEL.md` l.268–278 (§2.1 V-11).
- `PROJECT_MEMORY.md` l.37 e um bullet após l.60 (§2.5).
- `agent-orchestration/controle/decisoes.md` — append-only: parágrafo datado dentro de `D-SEM-TETO-AUDITORIA-NO-3`
  (C3-A1 + T-26…T-33); entrada `D-NUVEM-FABLE-CREDITOS`; se houver resposta do dono, entrada
  `D-AUDITORIA-MAQUINA-RECORRENCIA-E-PRAZO`.
- `agent-orchestration/controle/pendencias.md` — as cinco pendências SIM (status `FECHADA`/`PARCIAL` + "fechada por PR
  #n, teste de encerramento executado: …"); a pendência nova de §2.2; **índice `pendencias-indice.md` pelo gerador**.
- `Kpis/kpis-latest.json` · `Kpis/kpis-history.json` · `Kpis/kpis-history.md` · `Kpis/app.js` (**só** via
  `node scripts/kpi-freeze.mjs`).
- `docs/revisoes/SAN3/B-GOV-CICLOS-RESIDUAIS-plano.md` (este) · `agent-orchestration/omega/juntas/BRIEFING-B-GOV-CICLOS-RESIDUAIS.md`
  · `J-B-GOV-CICLOS-RESIDUAIS.md` · `votos/B-GOV-CICLOS-RESIDUAIS/**` (únicos arquivos que uma cadeira escreve) ·
  `agent-orchestration/docs/status-geral.md` · `agent-orchestration/codex/log-execucao.md`.
- `.claude/agents/especialistas/<3 cadeiras + 1 crítico>.md` + espelho (`git add -f` nos dois: o ignore global cobre
  `.claude/` e `.agents/`; o `sync` é recursivo).
- Opcional: `agent-orchestration/codex/comandos/B-GOV-CICLOS-RESIDUAIS.md` (§C1). Na ausência, **este plano é o comando**.

**PROIBIDO**
- `src/**` · `tests/**` · `prisma/**` · `migrations/**` · `frontend/**` · `mobile/**` · `.github/**` · `infra/**` ·
  `.env*` · lockfiles · **`scripts/**`** (inclusive `audit-agents-skills.mjs`, `post-merge-cleanup.sh`,
  `sync-agent-agents.mjs`) · `docs/omega-pd.md` · `Kpis/index.html` · `Kpis/styles.css` · `Kpis/README.md` ·
  `comando-template.md` · `docs/revisoes/SAN3/PLANO_SAN3.md` · `docs/claude-code-handoff/**`.
- `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md` · `OBITUARIO-IDENTIDADES.md` ·
  `controle/aposentadoria-especialistas.md` · `omega/reprovacoes/**` (nenhum ciclo aqui).
- **Qualquer linha do inspetor fora de 2.0/2.1/2.2/3.3/3.4**; os corpos `porteiro-pos-merge`, `planejador-mestre` e
  todo corpo não nomeado acima; `.claude/agents/especialistas/jurado-semteto-*` (não tocar); as 6 cadeiras de #388/#389.
- `.agents/agents/**` **à mão** (salvo a linha do README); qualquer regra de **recorrência** de auditoria ou **prazo** de
  conserto que não seja transcrição de resposta do dono (§3); qualquer `D-NUVEM` no contrato.
- `J-*`/`R-*`/`BRIEFING-*`/votos de **outro** bloco.

---

## §7 — Modelagem · baseline N · KPI

- **Modelagem:** não há (documental + corpos de agente). Sem migration; rollback = `git revert` do squash (as
  pendências reabrem com o revert, porque a mudança de status é texto do mesmo PR).
- **Baseline N de testes do bloco:** **N = 0** (sem código, sem teste). Meta **M ≥ 2N = 0**, por construção. O
  executável que existe: `sync --check`, `audit-agents-skills.mjs`, `kpi-freeze --check`, os 3 guards de KPI, o gerador
  do índice e os simuladores de mutação das cadeiras (fora do repo). **Sem guard novo de regex, por decisão declarada:**
  "guarda que reconhece forma em vez de enunciar propriedade" é a classe (a) da própria auditoria do item 4; o mecanismo
  permanente é o inspetor 3.4 (leitura) e o gerador da junta.
- **KPI — SIM, este PR atualiza `Kpis/*` (§C3.1; precedentes #394, #392, #391, #381):**
  1. `blocks_completed` **168 → 169**, **recontado no pré-merge** da `origin/main` (H4: se #393/#388/#389 mergear antes,
     é 170…); nota de 1 linha no history.
  2. `backend_tests 3052/3054` · `frontend_smoke_tests 1202/1202` · `flutter_tests 864/864` **carregados com nota**
     (§C3.3: o PR não toca código nem teste). Re-executar a suíte é confirmação, não medição (precedente #392) — se o
     dev o fizer, diz N e forma e não muda a natureza.
  3. `mvp_demo`/`mvp_vendavel` **intocados** (§C3.4).
  4. `pr` preenchido após `gh pr create`; `merge_commit`/`approved_head` **`null` na autoria** (§C3.5). **Nenhum backfill
     devido**: o do #394 foi pago pelo #395; o #395 não tem entrada (sem ID de bloco).
  5. `Kpis/app.js` por `node scripts/kpi-freeze.mjs`; guards `kpi-dashboard-charts` / `-contraste` / `kpi-achados-paridade`
     (referência do #394, **a re-verificar**: 17/17 · 6/6 · 6/6).
  6. Nota da métrica `agents` (se o history a carregar): `sync --check` **26 → 31** agentes (auditor + 3 cadeiras + 1
     crítico) — publicar o N real.

---

## §8 — Arquivos tocados (quem · prova)

| arquivo | entrega | quem | prova |
|---|---|---|---|
| `CLAUDE.md` (l.413–444 · 395–396) · `AGENTS.md` (l.441–472 · 423–424) | §2.2 §2.3 §2.4 | dev | md5 EOL-neutro das regiões iguais; gerador de marcas 0 sem marca |
| `.claude/agents/inspetor-de-terreno-da-junta.md` (2.0, 2.1, 2.2, 3.3, 3.4) + espelho | §2.2 §2.3 §2.4 | dev | ≤5 hunks; simulador (3 cenários + regressões); `--check` ec=0 |
| `validador-mestre` · `critico-adversarial` · `avaliador-mapas` · `agente-fabrica` + espelhos | §2.1 | dev | hunks 1·2·1·1; gerador 0 limitantes |
| `.claude/agents/auditor-da-maquina.md` + espelho + linha no README | §2.2 M-02 | dev (corpo pode ser escrito pela `agente-fabrica`; **o dev versiona**) | `ls-tree`; auditor 0 BLOQUEIA; 5 perguntas × comando |
| `EXECUTION_MODEL.md` l.268–278 | §2.1 V-11 | dev | 1 hunk; l.280–326 intactas |
| `PROJECT_MEMORY.md` l.37 + bullet | §2.5 | dev | 2 hunks; `grep -i teto` só histórico |
| `decisoes.md` (parágrafo datado + `D-NUVEM` + resposta do dono se houver) | §2.3 §2.7 §4 | dev | `grep -c` marcadores; só acréscimo (`+N/−0`) |
| `pendencias.md` + `pendencias-indice.md` | §2 | dev | 5 status + 1 nova; índice = gerador (diff vazio após rodar) |
| `Kpis/*` | §7 | dev | §9 itens 14–15 |
| plano · briefing · corpos das cadeiras e do crítico | §10 | planejador (eu) · orquestrador · fábrica | `git ls-tree HEAD` os lista antes do inspetor |
| `J-*` · `votos/**` · `status-geral.md` · `log-execucao.md` | registro | orquestrador · cadeiras | ata com `Objeto julgado` e `approved_head` |

---

## §9 — Bateria de validação (§9 do contrato), com a FORMA declarada

Cwd = worktree do bloco em **caminho curto** (`C:/Users/AMP/w-cr`, `git worktree add --detach`, `npm ci` próprio, sem
junction); `export MSYS_NO_PATHCONV=1`; **ec por variável** (`cmd > "$TEMP/x.txt" 2>&1; ec=$?`), nunca por pipe;
`timeout` em todo script do repo. `HEAD` = o head que a ata nomear.

1. `git status --porcelain` → **vazio**; `git rev-parse HEAD` = head da ata.
2. `git diff --check origin/main...HEAD` → **ec=0**.
3. `timeout 120 node scripts/sync-agent-agents.mjs --check` → **ec=0**, "espelho consistente" — publicar N (esperado 31).
4. `timeout 120 node scripts/audit-agents-skills.mjs` → **0 BLOQUEIA** (publicar os AVISO; C10 cresce com as cadeiras).
5. **Espelho:** md5 EOL-neutro do item 4 e do §C7.1-bis extraídos por âncora (`^4\. \*\*Protocolo de dificuldade` até a
   linha anterior a `^4-bis`; `^   \*\*1-bis\.` até a linha anterior a `^2\. O humano`) iguais em `CLAUDE.md` e
   `AGENTS.md`; `diff` vazio.
6. **Negativo pela PROPRIEDADE (`-i`):** gerador primário do §0.6 na população inteira → **0** linhas limitantes, com a
   classificação de **cada** linha publicada; controle de recall → **0** novas. (Hoje: 11 + 1.)
7. **Positivos:** `grep -c 'D-SEM-TETO-AUDITORIA-NO-3'` ≥ 1 em `validador-mestre`, `critico-adversarial`,
   `avaliador-mapas`, `agente-fabrica`, `EXECUTION_MODEL.md`, `PROJECT_MEMORY.md`; `grep -c 'D-NUVEM-FABLE-CREDITOS'
   decisoes.md` ≥ 1 e **= 0** em `CLAUDE.md`/`AGENTS.md`; `grep -c 'C3-A1' decisoes.md` ≥ 1 (hoje **0**); `grep -c
   auditor-da-maquina CLAUDE.md AGENTS.md .agents/agents/README.md` ≥ 1 cada (hoje **0 · 0 · 0**).
8. **Diff confinado por arquivo:** `git diff origin/main...HEAD -- <f> | grep -c '^@@'` = validador 1 · crítico 2 ·
   avaliador 1 · fábrica 1 · `EXECUTION_MODEL` 1 · `PROJECT_MEMORY` 2 · inspetor ≤ 5 · README 1.
9. **Simulador do inspetor (cópias fora do repo, apagadas ao fim):** S1 ref pré-#394 → `BLOQUEADO` ×2 leituras; briefing
   "ciclo 3" com 3 `R-*` → `BLOQUEADO`; registro sem k → `BLOQUEADO`; corpo de cadeira com *"CICLO 2 — o ÚLTIMO"* →
   `BLOQUEADO`; `R-*` do ciclo anterior sem a seção de classe repetida → `BLOQUEADO` (ciclo 3) / ressalva (ciclo 2);
   "defeituosa + conserto sem atestação" → `BLOQUEADO`; regressões 2.1/2.3 → `BLOQUEADO`. Cada um com o vermelho-controle
   (mutação do §2) executado.
10. **Marcas locais:** gerador de proposições sobre o item 4 → 0 unidades sem marca; `[dono]` = 6; N antes/depois
    publicado.
11. `timeout 120 python agent-orchestration/controle/gerar-indice-pendencias.py` → `git diff --stat --
    agent-orchestration/controle/pendencias-indice.md` **vazio** (o commitado é o gerado).
12. **CRLF-neutro:** para cada arquivo tocado, `tr -d '\r' < f | md5sum` = `git show HEAD:f | md5sum`.
13. **Check-runs** (inspetor 4.3): `gh api repos/thiagodorgo/ERP_Techsolutios/commits/<head>/check-runs --jq
    '"\(.total_count) \([.check_runs[]|select(.conclusion!="success")]|length)"'` → `N 0`, N > 0.
14. **Baseline do inspetor 4.2:** `npm ci` próprio → `npm run check` **ec=0**.
15. `node --check Kpis/app.js` ec=0 · `timeout 120 node scripts/kpi-freeze.mjs --check` ec=0 ·
    `node -e "require('./Kpis/kpis-latest.json');require('./Kpis/kpis-history.json')"` ec=0 · guards
    `node --test --import tsx tests/kpi-dashboard-charts.test.ts tests/kpi-dashboard-contraste.test.ts
    tests/kpi-achados-paridade.test.ts` → pass/fail com N.
16. **Conflito (informativo):** `git merge-tree --write-tree --name-only HEAD origin/chore/mandato-refs-e-preflight`
    (e os heads de #388/#389) → esperado `decisoes.md`, `pendencias.md`, `pendencias-indice.md`, `Kpis/*`,
    `status-geral.md`. Só declara; resolve-se pela `main` (C1-A3).
17. Antes do merge, **não antes do voto:** `gh pr view <n> --json isDraft -q .isDraft` → `false`.
18. Limpeza §C5: worktrees de jurado por `git worktree remove --force`; cópias de mutação apagadas; **uma linha** no
    fechamento.

---

## §10 — Junta (§C7) — crítico, composição, quórum, papéis, isolamento, perda

- **Crítico antes do dev (ordem que o mandato fixa: plano → crítico → dev).** §C7.1-ter(b) reserva o `critico-adversarial`
  aos blocos de invariante; aqui ele **não é obrigatório pelo contrato** — e o corpo permanente é **objeto** deste bloco
  (V-08), logo **parte por interesse**. Recomendo **identidade nova da fábrica** (`critico-ciclos-residuais`, corpo em
  `especialistas/`, versionado nos dois espelhos), **máx. 2 rodadas**, com estas linhas de ataque **mínimas**: (i) o
  gerador do §0.6 reconhece forma? qual regra passaria por ele e pelo 3.4?; (ii) o 2.0 bloqueia junta legítima por
  irregularidade de nome no registro (§0.7)? a saída "orquestrador nomeia k no briefing" basta?; (iii) T-26 (corpo do
  auditor) e T-28 (ausência do relato = `BLOQUEADO` de ciclo 3 em diante) legislam além do que a pendência entregou ao
  bloco? T-28 é teto disfarçado (dispara por presença de relato, não por contagem — provar)?; (iv) as marcas `[dono]`/
  `[mecanismo]` mudam alguma proposição (N antes/depois)?; (v) a nota de terreno do §4 é suficiente para a entrada
  `D-NUVEM` não fabricar fato? O orquestrador decide e escreve na ata; se dispensar o crítico, escreve por quê.
- **Quórum: MAIORIA DE 3** (§C7.1-ter(b) literal: nenhum de dinheiro, segurança, permissão, perda de dado —
  `src prisma frontend mobile .github` são **PROIBIDOS**, diff = 0 por construção; precedentes `D-QUORUM-B-GOV-ELENCO` e
  #394, que editou o mesmo gate sob maioria de 3). A edição de gates aqui **retira** tetos e **acrescenta** checagens
  fail-closed; não cria poder sobre dinheiro/segurança. **Se o orquestrador discordar, sobe para unanimidade de 3 ANTES
  do inspetor** — quórum não muda em voo. Sem veto individual.
- **Três cadeiras, identidades NOVAS da fábrica, corpos versionados nos dois espelhos ANTES do inspetor** (`git add -f`;
  o inspetor 3.3 confere md5 EOL-neutro contra o head). Nomes sugeridos: `jurado-cr-c1-regras-vivas-e-corpos` ·
  `jurado-cr-c2-gate-por-mutacao` · `jurado-cr-c3-contrato-registro-escopo` (`cr` = ciclos-residuais; remoção por
  identificador de **bloco**, nunca por nome de cadeira). **P4: 3 itens por cadeira.**

| cadeira | competência | os 3 itens |
|---|---|---|
| **C1 — regras vivas e corpos** | população pela propriedade; diff de corpos; corpo novo | (1) gerador primário + recall no head, **cada linha lida**, 0 limitantes, vermelho-controle §2.1; (2) as 5 edições confinadas (hunks §9.8), `--check` ec=0, README só 1 linha; (3) `auditor-da-maquina`: 5 perguntas × comando, `model: fable`, fallback verbatim, descrição curta (C10 publicado), auditor 0 BLOQUEIA, pendência do `MODELO_FIXADO` aberta |
| **C2 — gate por mutação** | inspetor 2.0/2.1/2.2/3.3/3.4 | (1) C2-3-1: S1 ref pré-#394 → `BLOQUEADO` ×2 + regressões; (2) 2.0: ciclo derivado (3 `R-*` × briefing "3"; sem k; auditoria não conta); (3) 3.4 + 2.1 + 2.2: corpo semeado → `BLOQUEADO`; relato ausente → `BLOQUEADO`/ressalva; conserto sem atestação → `BLOQUEADO` — cada um com o vermelho-controle |
| **C3 — contrato, registro, escopo, KPI** | marcas locais; decisões; §6; §C3 | (1) marcas `[dono]`/`[mecanismo]` (0 sem marca; 6 `[dono]`; N igual), M-04/M-06/M-09 com `arquivo:linha`, espelho md5, parágrafo C3-A1, entrada `D-NUVEM` com os 3 "não autoriza" **e a nota de terreno**, `D-NUVEM` = 0 no contrato; (2) perguntas ao dono: respostas verbatim em `decisoes.md` **ou** pendência `PARCIAL` com as perguntas literais — **nada decidido pelo dev**; (3) diff = §6 por **laço** `git diff --name-only`, índice = gerador, KPI (169 recontado, notas, `mvp_*` intocados, `null` na autoria), 5 pendências com teste de encerramento **executado** e a nova bem-formada |

- **Votam JUNTAS, nunca 2+1.** Cada cadeira resolve o head por conta própria (`git rev-parse` + `gh pr view`) e declara
  modelo e md5 do corpo aplicado.
- **Inelegíveis por nome (§C7.4-bis; inspetor 3.1/3.1-bis contra `OBITUARIO-IDENTIDADES.md` e as atas):** o
  **orquestrador** (autor do texto de 27/09, das pendências e transmissor das palavras do dono); **eu**; a
  **`agente-fabrica`**; **`dev-semteto-emenda`** (autor de T-21…T-25, objeto de C1-A1); as três cadeiras do #394
  (`jurado-semteto-c1-fidelidade-transcricao`, `-c2-consistencia-normativa`, `-c3-escopo-registro` — **achadoras** dos
  ajustes que este bloco conserta); o **dev deste bloco**. O `porteiro-pos-merge` (achador de R3/R4/R6) e o
  `inspetor-de-terreno-da-junta` são gates, não cadeiras — o inspetor **desta** junta roda o corpo da `origin/main`
  (regra vigente) enquanto o head carrega o corpo emendado: **declarar no parecer**; quem julga o corpo emendado é a C2.
- **Isolamento (inspetor 1.2), por escrito:** cadeiras **somente-leitura** — escrevem **apenas**
  `votos/B-GOV-CICLOS-RESIDUAIS/<cadeira>-evidencia.md` e `<cadeira>-voto.json`. Leitura do head por `git show
  <head>:<caminho>` ou **worktree próprio e descartável** em caminho curto (`git worktree add --detach
  C:/Users/AMP/w-jcr<n> <head>`; remoção **só** por `git worktree remove --force`; **sem junction**). **Nenhuma cadeira
  precisa de banco**; **`erp-postgres` (5432) / `erp-redis` (6379) não são alvo de ninguém**; sem Docker. C3 precisa de
  `npm ci` **próprio** (guards de KPI). Mutações (C1/C2/C3) **só em cópia fora do repo**, apagadas ao fim.
- **Perda de jurado (inspetor 5.1; §C7.7 P1–P6):** queda por infra **relança a MESMA identidade**; voto perdido **nunca**
  conta como aprovação; **a junta não fecha com menos de 3 votos de mérito**; evidência incremental (P1); voto-arquivo
  primeiro (P2); disparo ≤2 em paralelo (P5); `00-quedas.md` (P6); sem suplente.
- **Regra de voto:** `gravidade` (`bloqueia`/`ajuste`/`nota`) **e** `escopo` (`dentro-do-bloco`/`pre-existente` com
  evidência de data ou origem; sem evidência = `dentro-do-bloco`). **"Não consigo medir" = REPROVADO.** **Nenhuma cadeira
  propõe correção.** Afirmações deste plano, do briefing e da fábrica são **hipóteses**.
- **§C7.4-bis, por escrito (ciclo 1, preventivo):** (a) composição cobre a competência? **Sim** — regras vivas/corpos,
  gate por mutação, contrato/registro/escopo; (b) quem achou consertou? **Não se aplica ainda** — se reprovar, o dev do
  ciclo 2 é identidade nova e **não** o orquestrador; (c) dado podre? **tudo do §0 medido**; hipóteses H1–H4 nomeadas.
- **Gatilho do §C7.4 item 4 sobre ESTE bloco:** se o ciclo 3 reprovar com `bloqueia`, a auditoria da máquina é
  conduzida por identidade nova (o corpo `auditor-da-maquina` **ainda não está na `main`** — vale o item 4 da
  `origin/main`, que só exige "não votou, não planejou, não desenvolveu"), e a trava 2.2 do corpo da `origin/main` vale
  para a junta do ciclo 4 (§2.3 C2-3-1 aplica-se por conduta do orquestrador até este merge: o head integra a `main`
  pós-#394 — já integra: nasce dela).

---

## §11 — Riscos e rollback

| risco | mitigação / rollback |
|---|---|
| O dono não responde Q1/Q2 antes do dev | entrega `PARCIAL` declarada; nada inventado; a pendência guarda as perguntas literais; **não é defeito do bloco** |
| T-26 (corpo do auditor) lido como legislar além do dono | a pendência entregou M-02 ao bloco; declarado `[mecanismo T-26]` em `decisoes.md` e no item 4; C3 item 1 julga; se a junta reprovar por isso, o ciclo 2 reduz o auditor a "identidade nova + as 5 perguntas" sem corpo permanente |
| 2.0 bloqueia junta legítima por nome irregular no registro (§0.7) | a saída é nomear k no briefing (não renomear registro); crítico (ii) ataca; C2 item 2 mede os 4 cenários |
| T-28 é lido como teto disfarçado | não conta ciclos; exige um relato que o item 4 já manda; crítico (iii) prova ou derruba |
| Marcas `[dono]`/`[mecanismo]` mudam sentido | N de proposições antes/depois igual (C3 item 1); mutação obrigatória |
| Auditor de agentes não confere `model:` do auditor novo (`MODELO_FIXADO` não o lista; `scripts/**` PROIBIDO) | junta confere por `grep`; pendência nova com dono (§2.2) — nada em silêncio |
| Concorrência com #393/#388/#389 em `decisoes.md`/`pendencias.md`/`Kpis/*` | resolvido pela `main` na integração de quem chegar depois; recontagem C1-A3; §9.16 declara |
| Inspetor desta junta roda o corpo antigo enquanto o head tem o novo | declarado no parecer; C2 julga o novo por simulador; é a regra vigente que libera a junta |
| Porteiro do #395 ausente (H1) | pré-condição do start; orquestrador versiona ou convoca antes do dev |
| Este plano foi produzido no Windows, não na nuvem | dito na 1ª página e no §4; o registro `D-NUVEM` não o cita como run na nuvem |
| Corpos das cadeiras não versionados → inspetor `BLOQUEADO` (2× em 2026-09-20) | `git add -f` nos dois espelhos + `--check` **antes** do inspetor |
| CRLF lido como mutação viva | comandos EOL-neutros no briefing (§0, §9.12) |
| Rollback | `git revert` do squash; só texto, corpos e KPI mudam; as pendências reabrem com o revert |

---

## §12 — O que este plano NÃO pega (por escrito)

- As ERRATAs das 6 cadeiras de #388/#389 (§5) — só o executor do teste delas (3.4).
- `post-merge-cleanup.sh` (P-CHORE) e `audit-agents-skills.mjs` (`MODELO_FIXADO`) — `scripts/**`.
- Um **guard mecânico permanente** (teste) contra linguagem de teto — recusado por desenho (§7); se a casa quiser um
  **ratchet** (toda linha nova com `ciclo` em corpo de agente exige classificação humana num arquivo de dados), é bloco
  próprio com `tests/**` permitido — a pendência que o proponha é do orquestrador, não deste plano.
- Refresco do `PROJECT_MEMORY.md` além de l.37 e um bullet (o snapshot é de 28/08; o corpo é de 28/07).
- O pacote `docs/claude-code-handoff/**` (defasado em outros assuntos; 0 linhas para a propriedade).
- Aposentadoria das 3 cadeiras do #394 (rotina do orquestrador).
- Verificar as palavras cruas do dono de 29/09 (H2) — ninguém consegue sem o dono (Q3).
- Medir a nuvem (H3) — esta sessão não rodou nela.

---

## §13 — A linha

Cinco pendências, uma decisão do dono a registrar, e uma premissa falsificada. **Decisões deste plano:** as cinco regras
órfãs (V-07…V-11) e a linha 37 da memória viram texto que aponta para o item 4, com diff confinado e espelho gerado; o
gatilho do ciclo 3 ganha **corpo de auditor**, **executor e atestação do conserto**, **lugar e leitor do relato de classe
repetida** e a frase de que a auditoria **soma** ao §C7.4-bis — tudo marcado `[mecanismo T-26…T-33]`, e **recorrência e
prazo ficam com o dono** (Q1, Q2), sem que o dev decida; o inspetor passa a **derivar o ciclo do registro**, a ler a
**norma de processo da `origin/main`** (a trava vale contra qualquer ref) e a **ler os corpos das cadeiras**; o item 4
ganha **marca local** que separa palavra do dono de mecanismo; a `D-NUVEM-FABLE-CREDITOS` entra em `decisoes.md` com o que
**não** autoriza e com a nota de que **este piloto rodou no Windows do dono, não na nuvem**. Maioria de 3, três cadeiras
de 3 itens, crítico de identidade nova antes do dev, nada no contrato além das duas regiões nomeadas — e o que não é do
bloco está escrito com dono.
