papel: porteiro-pos-merge · modelo: Fable (claude-fable-5-1, o do frontmatter; sem fallback) · mandato_md5: d937cf1c42f30094b1a31076ec2619c9 (confere com o medido pelo orquestrador; EOL-neutro = cru, arquivo sem CR) · corpo_md5 (origin/main 513937b0, .claude/agents/porteiro-pos-merge.md, blob 00d75b02, EOL-neutro): 374b1b0d091a85cddf1733d3e51456ae

# PARECER DO PORTEIRO PÓS-MERGE — PR 397 (B-GOV-PAUSA)

Instância nova, nascida no merge do PR 397. Aberto em 2026-10-01T20:52Z (UTC). Parecer incremental: cada item é gravado ao ser medido (P1/P2); itens não medidos ficariam marcados como em apuração — ao encerramento, nenhum restou.

Ambiente declarado: Windows 11, Git Bash (MINGW64), `MSYS_NO_PATHCONV` NÃO exportada (o `git show ref:caminho` sofre conversão de caminho — contornado por `git ls-tree` + `git cat-file` do blob). Base viva 5432/6379 não é alvo. Medição em worktree detached próprio `C:/Users/AMP/w-port397` (removido pelo nome ao fim).

## 0. Identidade e mandato — MEDIDO 20:52Z

- `tr -d '\r' < .../00-mandatos/porteiro.md | md5sum` → `d937cf1c42f30094b1a31076ec2619c9` — IGUAL ao declarado pelo orquestrador. Cru = EOL-neutro (arquivo sem CR).
- `git ls-tree origin/main -- .claude/agents/porteiro-pos-merge.md` → blob `00d75b02bfd0eeb5632e571d58d8f4782c75e5ef`; `git cat-file -p | tr -d '\r' | md5sum` → `374b1b0d091a85cddf1733d3e51456ae`. Espelho Codex `.agents/agents/porteiro-pos-merge.md` → blob `6e37494c`, md5 `ba73d1d6afafc5b5a49d163e1a09c7d0` (difere do `.claude` por construção: o espelho carrega o protocolo de emulação).
- Frontmatter do corpo em origin/main: `model: fable`, `tools: Read, Grep, Glob, Bash`. Esta instância roda em Fable — sem substituição a declarar.
- `git fetch origin --prune` executado 20:52Z; `origin/main` = `513937b0555e2a6175e7e89d8ae9e44dbc995f8a`.

## 1. O merge existe e está íntegro — MEDIDO 20:56Z · CONFERE

- `git log origin/main -3`: `513937b0` (2026-10-01T17:48:32-03:00, "...(B-GOV-PAUSA) (#397)") → `5b6e1036` (#396) → `3b1fe0f9` (#395). Pai único de `513937b0` = `5b6e1036` (squash, 1 parent).
- `gh pr view 397 --json state,mergeCommit,headRefOid,mergedAt`: `state=MERGED`, `mergeCommit.oid=513937b0555e2a6175e7e89d8ae9e44dbc995f8a`, `headRefOid=5fed0a55458d2a9dd731f3eeb15ee59830f16c76`, `mergedAt=2026-10-01T20:48:32Z`, `mergedBy=thiagodorgo`, base `main`, ramo `docs/gov-pausa-grava-e-para`. BATE com o mandato (l.13-15).
- Absorção do squash provada por ÁRVORE, não por diff com pathspec: `5fed0a55^{tree}` = `513937b0^{tree}` = `d3de28228725110de972fecad545cfaab4f2f620`; `git diff --stat 5fed0a55 513937b0` → vazio. Absorção integral.
- `git merge-base --is-ancestor 67c2c280 5fed0a55` → SIM. `git log 67c2c280..5fed0a55` → exatamente 1 commit: `5fed0a55 docs(junta): ata da junta do B-GOV-PAUSA (APROVADO 3x0), votos, evidencias e parecer do inspetor`. `git diff --stat 67c2c280 5fed0a55` → 9 arquivos, todos em `agent-orchestration/omega/juntas/` (ata, inspetor, quedas, C1/C2/C3 evidência+voto), 1397 inserções, 0 remoções — o objeto julgado (`67c2c280`) chegou à main sem alteração; só o registro da própria junta entrou depois do voto, como a §C7.1 exige.
- `git merge-base 5fed0a55 5b6e1036` = `5b6e1036` → o PR partiu da main imediatamente anterior ao merge (sem rebase pendente).
- `refs/pull/397/head` buscado → `FETCH_HEAD=5fed0a55` (confirma o head pelo GitHub, não só pelo objeto local).
- Worktree próprio: `git worktree add --detach C:/Users/AMP/w-port397 513937b0` → HEAD `513937b0`, `git status --porcelain` vazio.

## 2. Promessa × entregue — MEDIDO 21:03Z · CONFERE COM 1 RESSALVA (corpo do PR desatualizado)

Corpo do PR (`gh pr view 397 --json body`) × `git show --stat 513937b0` (37 arquivos, +5065 −37), medido no worktree `w-port397` @ `513937b0`:

| Promessa no corpo | No diff? | Como medi |
|---|---|---|
| `CLAUDE.md` §C7.7 bullet P7 + linha `[P7]` no modelo de mandato + item do orquestrador | SIM | `grep -n 'P7 — Pausa ordenada' CLAUDE.md` → l.566; `grep -n '\[P7\]'` → l.597 |
| `AGENTS.md` mesmo hunk byte a byte | SIM | `diff <(git show 513937b0 -- CLAUDE.md \| grep '^[+-]'…) <(…AGENTS.md…)` → vazio, IDENTICOS, 38 linhas de hunk cada |
| `PROTOCOLO-JUNTA-RESILIENTE.md` seção P7 | SIM | l.82 `## P7 — Pausa ordenada…`; `[P7]` em l.125 |
| `decisoes.md` entrada `D-PAUSA-GRAVA-E-PARA` append-only | SIM | `grep -n '^## D-PAUSA-GRAVA-E-PARA'` → l.2825; stat `+84 −0` |
| `conhecimento-de-terreno.md` §2.2 lição | SIM | diff +7 (a lição da pausa) |
| "`Kpis/*` intocados" (seção *O que NÃO muda*) | **NÃO — o diff TOCA `Kpis/app.js`, `kpis-history.json`, `kpis-history.md`, `kpis-latest.json`** | stat do merge; `blocks_completed` 168→169, `version` B-GOV-PAUSA, `pr 397` |
| "Junta ainda não convocada" | **NÃO — o merge contém a ata `J-B-GOV-PAUSA.md` (APROVADO 3×0), 3 votos, 3 evidências, inspetor, quedas** | stat do merge; commit `5fed0a55` |
| CRLF preservado (contagem CR = linhas) | SIM | CLAUDE.md 704/704 · AGENTS.md 753/753 · PROTOCOLO 150/150 · decisoes.md 2907/2907 |
| `git diff --check` | SIM, com as 4 exceções que a ata declara | `git diff --check 5b6e1036 513937b0` → exatamente `C2-evidencia.md:106,107,109 trailing whitespace` e `C3-evidencia.md:266 new blank line at EOF`; nada fora de `votos/` |

Arquivos no diff que o corpo NÃO menciona (escopo que cresceu depois do corpo ser escrito): os 6 corpos de jurado `jurado-pausa-c{1,2,3}-*` nos dois espelhos (`.claude/agents/especialistas/` e `.agents/agents/especialistas/`), `.agents/agents/README.md` (+P7 no lado Codex — a emenda S-03 do plano), `Kpis/*` (4), `pendencias.md`/`pendencias-indice.md` (2 pendências novas, índice 421→423 cabeçalhos / 310→312 abertas), `status-geral.md` (+16), `BRIEFING-B-GOV-PAUSA.md`, `docs/revisoes/SAN3/B-GOV-PAUSA-plano.md`, os 7 mandatos em `00-mandatos/`, e os 9 arquivos de registro da junta. Todos eles estão cobertos pelo **plano do bloco** e pela **ata** (C3 mediu "28 arquivos do diff dentro das 23 entradas do §7 do plano, nada na lista proibida") — ou seja, o escopo cresceu de forma **registrada no plano/ata**, mas **não no corpo do PR**, que ficou na versão de antes da junta e afirma o contrário do que o diff tem em dois pontos ("Kpis/* intocados"; "junta ainda não convocada").

- Espelho Codex: `node scripts/sync-agent-agents.mjs --check` → `OK — 29 agentes, espelho consistente`, ec=0. md5 EOL-neutro dos 3 corpos `.claude` = `5107a493…` / `facd19fd…` / `06172f52…` — IGUAIS aos da ata (l.21-23).
- Comentário/documento afirmando comportamento que o código não tem: não se aplica a código (o bloco é de contrato); o único texto que afirma o que o diff não tem é o **corpo do PR**, acima.

**Achado A1 (RESSALVA, não grave):** corpo do PR 397 desatualizado em relação ao head mergeado — diz "`Kpis/*` intocados" e "junta ainda não convocada", mas o merge traz `Kpis/*` (4 arquivos) e a junta registrada. O conteúdo real está certo e documentado na ata e no plano; o defeito é o corpo público do PR mentir por omissão de atualização. Corrige-se com uma edição do corpo (`gh pr edit 397 --body`) ou com nota no PR de registro.

## 3. Os números são reais (reexecução) — MEDIDO 21:08Z · CONFERE

O bloco não toca código nem teste (stat do merge: nenhum arquivo em `src/ tests/ frontend/ mobile/ prisma/ scripts/ .github/`). O que há para reexecutar são os **guards de KPI** (o que o bloco tocou foi `Kpis/*`) e a **contagem de blocos**; as três trilhas são CARREGADAS com nota (§C3.3), e a verificação cabível é se o valor carregado é mesmo o último oficial.

- `npm ci` próprio no worktree `w-port397` (sem junction; `node_modules` ausente antes → 326 pacotes em 27 s, ec=0; `dir /AL` no raiz do worktree vazio).
- `node --check Kpis/app.js` → ec=0.
- `node scripts/kpi-freeze.mjs --check` → `kpi-freeze: em dia (snapshot 2026-10-01)`, ec=0 (o `FROZEN` embutido do `app.js` bate com o `kpis-latest.json`).
- `node --test --import tsx tests/kpi-dashboard-charts.test.ts` → **17/17** pass, 0 fail, ec=0.
- `node --test --import tsx tests/kpi-achados-paridade.test.ts` → **6/6** pass, ec=0.
- `node --test --import tsx tests/kpi-dashboard-contraste.test.ts` → **6/6** pass, ec=0.
  → A ata publica "guards 17/6/6" (l.48): **reproduz**.
- `blocks_completed`: `kpis-latest.json` em `5b6e1036` (main anterior, blob por `git ls-tree`) = **168** (`version B-GOV-SEM-TETO`, `pr 394`); em `513937b0` = **169**. 168+1 = 169 — o declarado (history.md "168 → 169", ata l.47) **reproduz**.
- Trilhas carregadas: `5b6e1036` → backend `3052/3054` · smoke `1202/1202` · flutter `864/864`; `513937b0` → os mesmos três valores, com `note` `[B-GOV-PAUSA §C3.3 (2026-10-01): valor CARREGADO, SEM reexecução — este PR não toca código nem teste…]` em cada métrica. Entrada do #394 no history: `3052/3054 · 1202/1202 · 864/864`. Carregado = último oficial, com nota explícita: **conforme §C3.3**. Eu **não** reexecutei backend/smoke/Flutter: o bloco não os tocou e o contrato manda reexecutar "o que o bloco tocou"; fica declarado como não executado, não como presumido.
- `Kpis/kpis-history.json`: `git diff --numstat 5b6e1036 513937b0 -- Kpis/kpis-history.json` → `13 0`; linhas `-` no diff = 0; prefixo das 164 entradas antigas idêntico (comparação com os dois lados decodificados em UTF-8), 1 entrada nova (`pr 397`, `bc 169`). **Append puro** (ata l.48 "164→165": reproduz). *Nota de método:* a minha primeira comparação acusou "prefixo diferente" porque o blob antigo entrou por stdin decodificado em cp1252 e o novo em UTF-8 — a ferramenta respondeu quase a pergunta; o `--numstat` e a releitura em UTF-8 desfizeram o falso achado. Registro para que ninguém herde o "False".
- Índice de pendências: `pendencias-indice.md` 421→**423** cabeçalhos, 410→**412** IDs, 310→**312** abertas, balde B 103→**105** — bate com os 2 cabeçalhos `## P-` novos no diff de `pendencias.md` e com o `status-geral.md` (+16: "423 cabeçalhos / 412 IDs, 111 FECHADAS, 312 ABERTAS").

## 4. KPI fechado (§C3.5) — MEDIDO 21:08Z · DÍVIDA DECLARADA, COM DONO

- `Kpis/kpis-latest.json` @ `513937b0`: `release.pr=397`, `release.merge_commit=null`, `release.approved_head=null`, `status=published_per_pr`, `snapshot_date=2026-10-01`, `version=B-GOV-PAUSA`. `backfill_note` presente ("null NA AUTORIA por contrato (§C3.5) e recebem backfill…").
- `Kpis/kpis-history.json` última entrada: `pr 397`, `merge_commit null`, `approved_head null`. Entrada anterior (`pr 394`): `merge_commit b3f0af5f`, `approved_head 7ad08690` — já pagos pelo #395 (precedente: o PR de registro seguinte paga o backfill).
- Depois do merge, `null` nos dois campos é **dívida** (§C3.5, corpo do porteiro item 4). O valor REAL a gravar: `merge_commit = 513937b0555e2a6175e7e89d8ae9e44dbc995f8a`, `approved_head = 67c2c280612cb644f246af0b5410cab59afe028d` (§1, §5).
- Onde a dívida vai ser paga: a ata l.98-100 nomeia "o PR de registro seguinte ao merge (o que versiona o parecer do porteiro e paga o backfill de `merge_commit`/`approved_head` deste PR)". Esse ramo existe: `docs/registro-397` em `C:/Users/AMP/w-reg397`, head `db2bc81d` = `origin/main` + 2 commits (esqueleto do parecer `bc1ae0ed` + mandato do porteiro `db2bc81d`), porcelain 0, merge-base = `origin/main`. Medido nele: `latest release: pr 397 merge_commit None approved_head None`; history `pr 397: (None, None)` → **o backfill ainda NÃO está no ramo** (esperado: o ramo está no começo; o mandato l.44 diz que é ele que paga).
- `Kpis/index.html`/`app.js`: `FROZEN` atualizado para `snapshot_date 2026-10-01 / version B-GOV-PAUSA` (diff de 2 linhas), `kpi-freeze --check` em dia (§3).

**Achado A2 (RESSALVA, viaja para o PR de registro):** `merge_commit`/`approved_head` `null` em `origin/main` pós-merge. Dono nomeado pela ata: `docs/registro-397`. Valores a gravar acima.

## 5. Registro da junta (§C7.1) — MEDIDO 21:07Z · CONFERE

- Ata existe na main: `agent-orchestration/omega/juntas/J-B-GOV-PAUSA.md` (100 linhas, entrou no commit de registro `5fed0a55`, absorvido pelo squash `513937b0` — árvore idêntica, §1). Veredito registrado: **APROVADO 3×0**, objeto `67c2c280`, approved_head `67c2c280`, base `5b6e1036`, quórum "maioria de 3, sem veto, sem crítico" com a justificativa §C7.1-ter(b) (diff em `src prisma frontend mobile .github tests scripts infra` = 0 — eu confirmo: o stat do merge não tem nenhum desses caminhos).
- Votos em arquivo (P2) — `C1-voto.json`, `C2-voto.json`, `C3-voto.json`: `voto=APROVADO` nos três; `head_medido=67c2c280…` nos três (C1 às 18:32Z e 19:25Z, C2 18:32Z e 19:21Z, C3 até 20:29Z — nenhuma viu o head andar, como a ata diz); `mandato_md5` 75c80a58… / becd53d8… / 6bb2ccfd… e `corpo_md5` 5107a493… / facd19fd… / 06172f52… — IGUAIS à tabela da ata (l.21-23) e aos blobs que eu medi em `513937b0` (§2); modelo Opus 5.5 nos três (jurado não é gate de modelo fixado; o inspetor e o planejador rodaram em Fable 5.1 — §C7.4-bis da ata). Achados: C1 2 ajuste + 2 nota; C2 4 nota; C3 1 nota; **0 bloqueia** — bate com a ata. `pausa: "nenhuma"` nos três (primeira junta sob P7).
- `00-quedas.md`: tabela vazia (0 quedas) — bate com a ata ("Quedas: nenhuma").
- `00-inspetor-terreno.md` l.1: `papel=inspetor-de-terreno-da-junta · modelo=Fable (claude-fable-5-1…) · mandato_md5=d264e3ec… · corpo_md5=de80b2a9…`; l.123 `# VEREDITO: **LIBERADO COM RESSALVA**` — bate com a ata (l.11-15: 0 bloqueios, 4 ressalvas, Fable, corpo `de80b2a9…`, mandato `d264e3ec…`).
- §C7.4-bis: a ata nomeia quem ocupou cada papel (autor E1 = orquestrador; plano = `planejador-b-gov-pausa` Fable; emenda = `dev-pausa-emenda`; corpos = `agente-fabrica`; inspetor; C1–C3) e responde (a)(b)(c). Ata com registro de papéis → ciclo válido.
- Separação "objeto aprovado × objeto mergeado": `git diff --stat 67c2c280 5fed0a55` = só os 9 arquivos de registro da junta (§1). A promessa da ata l.98-100 ("difiram só pelo registro da própria junta") é verdadeira.
- Exceções ao `--check` declaradas na ata l.33-35 = exatamente as 4 que o `git diff --check 5b6e1036 513937b0` acusa (§2). Nenhuma outra.

## 6. Pendências — MEDIDO 21:11Z · CONFERE (as do PR) · DÍVIDA DECLARADA (as da ata)

**As que o bloco abriu** — `git show 513937b0 -- agent-orchestration/controle/pendencias.md` → `+20 −0`, 2 cabeçalhos `## P-` novos, 0 linhas `-`, 0 ocorrências de `FECHAD|RESOLVID` nas linhas `+`:
- `P-GOV-OBITUARIO-SEMTETO (2026-10-01) — BAIXA`: `status: ABERTA`; prova com N e forma (`grep -c -i semteto …OBITUARIO-IDENTIDADES.md = 0` × ata `J-B-GOV-SEM-TETO.md` l.21-23); `escopo: pre-existente` com evidência de data (voto 2026-09-28; OBITUÁRIO parado em 2026-09-20 `aadaa6d5`); `dono: o próximo bloco de registro (sepultamento…)`; `bloqueia: não`; teste de encerramento declarado. Conforme §C7.1-ter(a).
- `P-GOV-PAUSA-ESCADA-C76BIS (2026-10-01) — BAIXA`: `status: ABERTA`; prova (N=2 regras, forma `tr … grep -o`); escopo "nota S-10 do plano" (a C3 notou que não usa o vocabulário `dentro-do-bloco`/`pre-existente` — nota, não ajuste); `dono: B-GOV-CICLOS-RESIDUAIS`; `bloqueia: não`; teste de encerramento declarado.
- Índice regenerado coerente (§3): 423/412/312, balde B 105, as duas linhas na tabela.

**As que o bloco fechou:** nenhuma (0 linhas `-`, 0 `FECHAD|RESOLVID`). Amostragem de "RESOLVIDA" **não se aplica** — não há o que amostrar.

**As que a ATA manda abrir** (l.53-67, l.96-100) — `P-GOV-PAUSA-ELABORACOES-DO-TRANSCRITOR` (dono `B-GOV-CICLOS-RESIDUAIS`) e `P-GOV-PAUSA-CASO-SEM-FONTE` (dono: o PR de registro que versiona o porteiro do #397): a ata diz explicitamente "no PR de registro seguinte ao merge — não neste PR". Medido:
- `origin/main` @ `513937b0`: `grep -n 'P-GOV-PAUSA-ELABORACOES-DO-TRANSCRITOR\|P-GOV-PAUSA-CASO-SEM-FONTE' pendencias.md` → aparecem só na ata (`J-B-GOV-PAUSA.md` l.62, l.66) e no `status-geral.md`; **não há cabeçalho `## P-` para nenhuma das duas** no `pendencias.md`.
- ramo `docs/registro-397` @ `db2bc81d` (`w-reg397`): o mesmo `grep` em `pendencias.md` → vazio. **Ainda não abertas** — o ramo tem só o esqueleto do parecer e o mandato do porteiro.

**Achado A3 (RESSALVA, viaja para o PR de registro):** os dois ajustes da C1 (C1-A1 "61 elaborações sob o rótulo Decisão sem marca de transcritor"; C1-A3 "caso do Dev-T4 chamado de medido sem fonte rastreada") ainda não têm cabeçalho em `pendencias.md` nem na main nem no ramo de registro. A ata os destina ao PR de registro — o mesmo que paga o backfill (A2). A conformidade com §C7.1-ter(a) ("vira pendência nomeada com bloco dono") fica condicionada a esse PR abri-las com `dono`, `prova`, `escopo: dentro-do-bloco`, `bloqueia` e teste de encerramento, e regenerar o índice pelo gerador (→ 425 cabeçalhos / 414 IDs / 314 abertas, se nada mais mudar).

## 7. Limpeza (§C5) — MEDIDO 20:59Z–21:14Z · CONFERE

Medido na árvore principal (`C:/Users/AMP/Documents/GitHub/ERP_Techsolutios`, `main` @ `513937b0`):
- Branch remota do PR: `git ls-remote origin refs/heads/docs/gov-pausa-grava-e-para | wc -l` → **0** (apagada).
- Branch local do PR: `git branch --list "docs/gov-pausa*"` → vazio.
- Locais já mergeadas: `git branch --merged main` filtrando `main` → vazio.
- Rastreado apagado: `git status --porcelain | grep "^ D"` → vazio.
- Refs remotas mortas: `git remote prune origin --dry-run` → vazio. `git fetch origin --prune` já rodado às 20:52Z.
- `main` local = `origin/main` = `513937b0` (main local avançada, como o mandato declara).
- Worktrees dos jurados (`w-jur-pz1/2/3`): `git worktree list | grep -iE "pz|pausa"` → nenhum (removidos pelo nome, como a ata diz). Os 16 worktrees vivos listados são de outros blocos em voo (b04a, b11, gov-descuido, devs393/devs4/devt393/devt4/dv4a, mandato, nuv05/09/11, pvnuv, pvreg, reg397) — resíduo alheio, reportado, não varrido.
- Artefatos de build na árvore principal: `frontend/dist`, `dist`, `coverage`, `.vite`, `*.tsbuildinfo` → todos ausentes.
- Base viva: `docker ps` → só `erp-postgres` (5432) e `erp-redis` (6379), `Up 4 days (healthy)`; nenhum container de teste sobrou; o bloco não mexeu em banco (nenhum caminho de `prisma/` ou `src/` no diff) → sem resíduo de teste a conferir na base viva. `docker volume ls -q | wc -l` = 27 (não medi o conteúdo: não é alvo).
- `scripts/post-merge-cleanup.sh` **não rodou** (declaração do orquestrador no mandato l.46-48: o `docker volume prune` derrubaria o cluster de KPI de um dev vivo do PR 393). Eu não o executo (não conserto). O que o script faria de relevante para §C5 — branches mergeadas, prune, artefatos — está **medido limpo** acima; o que falta é só a parte de docker, que é a razão declarada. Sem dívida de resultado.
- Disco: `df -h /c` → **19 GB livres** (93% usado). Acima do piso de ~10 GB → `DEEP_CLEAN=1` **não** é exigido agora; fica a nota de que está a 9 GB do piso.
- Meu próprio worktree `C:/Users/AMP/w-port397` (detached @ `513937b0`, `npm ci` próprio sem junction): removido pelo nome ao fim (`git worktree remove --force C:/Users/AMP/w-port397`) — resultado na linha "Teardown" após o veredito.

## 8. O próximo bloco pode começar? — MEDIDO 21:05Z–21:14Z · SIM, com ressalvas que viajam

Próximos alvos (mandato l.49): **(a) o ciclo 4 do PR 393 (`B-GOV-MANDATO`)** e **(b) as tarefas de nuvem dos blocos `B-SAN3-05`, `B-SAN3-09` e `B-SAN3-11`**. "Nuvem" medido = sessões em claude.ai/code (`D-DEMO-UX-NUVEM`, `decisoes.md:2777`; `conhecimento-de-terreno.md` §1.2 l.28-35: "a nuvem vê só o GitHub… o merge acontece só pela sessão local") — é desenvolvimento, não deploy em produção; o `PLANO_SAN3.md` l.192-193 separa "script testado (`B-SAN3-09`)" de "executá-lo em produção" (este último continua sob §C7.1 junta 5 unânime / §C7.5, mas não é o alvo de agora).

**Pendências que BLOQUEIAM os alvos** — enumerado por script sobre os 423 cabeçalhos de `pendencias.md` @ `513937b0`:
- Cabeçalhos com `**BLOQUEIA**`: 16. FECHADAS/DECIDIDAS: `P-CHK-CUSTODIA-AUTOLINK-SEM-FILTRO`, `P-O6R-B01` (auth/RBAC), `P-O6R-B02`, `P-O6R-B05` (**deploy produtivo** — FECHADA #353), `P-O6R-B06`, `P-O6R-B07A-*` ×2. ABERTAS: `P-O6R-B03` (despesas/RDV mobile), `P-O6R-B04` (estoque), `P-O6R-B07` (PARCIAL — residual SEC-002 dono `B-O6R-07c`, SEC-004 dono `B-AV-REAL`; "feature em auth (SEC-003)" está FECHADO), `P-O6R-B08` (jobs), `P-O6R-B09` (dispatch/mapa), `P-O6R-B10` (web/owner-portal), `P-O6R-B11` (mobile). **Nenhuma nomeia o ciclo 4 do #393 nem `B-SAN3-05/09/11` como alvo bloqueado.**
- Pendências que nomeiam `#393`/`B-GOV-MANDATO`/`ciclo 4`: 22; as 5 de governança do #394 (`P-GOV-CICLOS-CORPOS-ORFAOS`, `P-GOV-AUDITORIA-MAQUINA-PECAS-ABERTAS`, `P-GOV-SEM-TETO-AJUSTES-DA-JUNTA`, `P-KPI-NOTAS-CARREGADAS-REGRESSAO-392`, `P-GOV-INSPETOR-CICLO-DECLARADO-NAO-DERIVADO`) trazem `bloqueia: não` / "não bloqueia o #394 nem a junta 3 do #393"; as demais são de outros blocos (CHK, O6R-B02, ARNES), sem campo `bloqueia`. **Nenhuma bloqueia o ciclo 4.**
- Pendências que nomeiam `B-SAN3-05/09/11`: `P-INFRA-RLS` e `P-O6R-B06-LEITURA-PLATAFORMA-SOB-FORCE-RLS` (dono `B-SAN3-05`), `P-SAN-PROD-BOOTSTRAP` (dono `B-SAN3-09`), `P-CHK-DOSSIE-VERSAO-NA-UI` (dono `B-SAN3-11`) — todas os nomeiam como **dono** (o bloco que as fecha), nenhuma como alvo bloqueado. **Nenhuma bloqueia.**
- As 2 pendências que o #397 abriu: `bloqueia: não` (§6).

**Pré-requisitos de contrato para o ciclo 4 do #393 (não são pendências; são do inspetor daquela junta):** o head do #393 (`26730e2b`, OPEN, draft, `mergeable`, merge-base com a main = `513937b0` — já absorveu este merge às 21:07Z) carrega `omega/reprovacoes/R-B-GOV-MANDATO-ciclo3-auditoria.md` com veredito, `## 8. Conserto da máquina (plano)` e `### 8.6 Condições de abertura do ciclo 4 — o que o inspetor confere (fail-closed)`. Não julgo o mérito disso (não é meu merge); registro que o insumo que o §C7.4/§C7.1-bis exige **existe no objeto**, e que quem libera a junta 4 é o `inspetor-de-terreno-da-junta` dela.

**Informativo que vira ressalva para o #393 (ata l.76-78):** o history no head do #393 tem **170** entradas, com as duas entradas próprias (`pr 393`, `blocks_completed 169`, 2026-09-29 e 09-30) **antes** da entrada do #397 (`pr 397`, 169); o `kpis-latest.json` desse head publica `version B-GOV-PAUSA / pr 397 / 169`. O #393 **mergeia segundo e reconta para 170**, com a entrada própria por último e o `latest` em `pr 393` — trabalho do ciclo 4 dele, não trava de start.

**Pausa (P7):** nenhuma `PAUSA` recebida durante este parecer.

## Executado (resumo)

Ambiente: Windows 11, Git Bash; `MSYS_NO_PATHCONV` não exportada (o `git show ref:caminho` sofreu conversão de caminho — contornado por `git ls-tree` + `git cat-file -p <blob>`); `PYTHONIOENCODING=utf-8` só inline nos comandos de leitura de JSON/MD (não exportado); `timeout` em tudo que executa; nenhum `tail -f`; base viva 5432/6379 nunca alvo; nada escrito no repositório (só este parecer e arquivos-parte no scratchpad).

1. `tr -d "\r" < …/00-mandatos/porteiro.md | md5sum` → `d937cf1c…` (confere) · `git ls-tree origin/main -- .claude/agents/porteiro-pos-merge.md` → blob `00d75b02` · `git cat-file -p | tr -d "\r" | md5sum` → `374b1b0d…`.
2. `git fetch origin --prune` · `git log origin/main -3` · `git cat-file -p 513937b0` (1 pai) · `gh pr view 397 --json state,mergeCommit,headRefOid,mergedAt,…` · `git fetch origin refs/pull/397/head` · `git rev-parse 5fed0a55^{tree}` = `513937b0^{tree}` · `git diff --stat 5fed0a55 513937b0` (vazio) · `git merge-base --is-ancestor 67c2c280 5fed0a55` · `git log 67c2c280..5fed0a55` · `git diff --stat 67c2c280 5fed0a55`.
3. `git worktree add --detach C:/Users/AMP/w-port397 513937b0` · `npm ci` próprio (326 pacotes, 27 s, sem junction).
4. `gh pr view 397 --json body` · `git show --stat 513937b0` · diff-dos-diffs CLAUDE.md × AGENTS.md · `grep` dos 3 comandos de "Como testar" · `git diff --check 5b6e1036 513937b0` (4 violações = as 4 exceções da ata) · contagem CR/LF nos 4 textos · `node scripts/sync-agent-agents.mjs --check` (OK 29) · md5 dos 3 corpos de jurado.
5. `node --check Kpis/app.js` · `node scripts/kpi-freeze.mjs --check` · `node --test --import tsx tests/kpi-dashboard-charts.test.ts` (17/17) · `…kpi-achados-paridade…` (6/6) · `…kpi-dashboard-contraste…` (6/6) · `blocks_completed` em `5b6e1036` (168) × `513937b0` (169) · trilhas carregadas × entrada #394 · `git diff --numstat … Kpis/kpis-history.json` (13/0) + prefixo das 164 entradas idêntico (UTF-8).
6. Ata `J-B-GOV-PAUSA.md`; `C{1,2,3}-voto.json` (voto, head_medido, mandato_md5, corpo_md5, modelo, achados, pausa); `00-quedas.md`; `00-inspetor-terreno.md` l.1 e l.123; `gh api …/commits/<sha>/check-runs` para `67c2c280` (14/14), `5fed0a55` (14/14), `513937b0` (8: 7 success + deploy=skipped).
7. `git show 513937b0 -- pendencias.md` (+20/−0, 2 cabeçalhos, 0 FECHAD/RESOLVID) e `pendencias-indice.md`; corpo das 2 pendências; `grep` das 2 pendências da ata em `origin/main` e em `w-reg397` (`docs/registro-397` @ `db2bc81d`, porcelain 0, merge-base = origin/main; latest/history ainda `null`).
8. Limpeza: `git ls-remote origin refs/heads/docs/gov-pausa-grava-e-para` (0) · `git branch --list` · `git branch --merged main` · `git status --porcelain | grep "^ D"` · `git remote prune origin --dry-run` · `git worktree list` · artefatos de build · `docker ps` · `docker volume ls -q | wc -l` · `df -h /c` (19 GB).
9. §8: enumeração por script dos cabeçalhos `## P-` com `BLOQUEIA`/`bloqueia:` e dos que nomeiam os alvos; `PLANO_SAN3.md` l.120-123, 167, 192-193, 253-271; `decisoes.md:2777` (`D-DEMO-UX-NUVEM`); `conhecimento-de-terreno.md` §1.2; `gh pr view 393`; `git fetch origin refs/pull/393/head` → `26730e2b`; `git ls-tree -r` do head do 393 (auditoria ciclo 3, §8, §8.6); `kpis-latest/history` desse head.
10. Teardown: `git worktree remove --force C:/Users/AMP/w-port397` + `git worktree prune` — resultado na linha "Teardown" após o veredito.

**Não executado (declarado, não presumido):** suítes backend (`npm test`), smoke do frontend e Flutter — o bloco não tocou nenhuma dessas trilhas (stat do merge sem `src/ tests/ frontend/ mobile/ prisma/ scripts/ .github/`) e os valores são CARREGADOS com nota por §C3.3; `scripts/post-merge-cleanup.sh` (não é do porteiro executar; o resultado que ele produziria em branches/prune/artefatos está medido limpo); conteúdo dos 27 volumes docker (não é alvo).

## Achados

- **A1 (RESSALVA — corpo do PR):** o corpo público do PR 397 diz "`Kpis/*` intocados" e "junta ainda não convocada"; o merge traz `Kpis/app.js`, `kpis-history.json`, `kpis-history.md`, `kpis-latest.json` e a junta inteira (ata + 3 votos + 3 evidências + inspetor + quedas). O entregue está certo e documentado na ata/plano; o corpo ficou na versão pré-junta. Onde: `gh pr view 397 --json body`, seções "O que NÃO muda" e "Junta". Correção: `gh pr edit 397 --body` com nota datada, ou nota no PR de registro.
- **A2 (RESSALVA — §C3.5):** `Kpis/kpis-latest.json` `release.merge_commit`/`release.approved_head` = `null` e a entrada `pr 397` do `kpis-history.json` idem, em `origin/main` pós-merge. Valores reais: `merge_commit = 513937b0555e2a6175e7e89d8ae9e44dbc995f8a`, `approved_head = 67c2c280612cb644f246af0b5410cab59afe028d`. Dono nomeado pela ata l.98-100: `docs/registro-397`. Ainda não pago no ramo (`db2bc81d`).
- **A3 (RESSALVA — §C7.1-ter(a)):** os dois ajustes da C1 (C1-A1 elaborações do transcritor sem marca; C1-A3 caso do Dev-T4 "medido" sem fonte) ainda não têm cabeçalho `## P-` em `pendencias.md` (nem em `origin/main`, nem em `docs/registro-397`). A ata os destina ao PR de registro — `P-GOV-PAUSA-ELABORACOES-DO-TRANSCRITOR` (dono `B-GOV-CICLOS-RESIDUAIS`) e `P-GOV-PAUSA-CASO-SEM-FONTE` (dono: o PR de registro).
- **A4 (RESSALVA — para o #393, não para este merge):** o #393 publica `blocks_completed 169` nas suas entradas, já com a do #397 (169) atrás delas no history do seu head; reconta para 170 com a entrada própria por último (ata l.76-78).
- **Nota de método (sem consequência):** minha primeira comparação do history acusou "prefixo diferente" por decodificar o blob antigo em cp1252; o `--numstat 13/0` e a releitura em UTF-8 desfizeram — registrado para ninguém herdar o falso achado.
- **Nenhum achado grave.** Merge íntegro; objeto aprovado = objeto mergeado + registro da junta; números reproduzem (guards 17/6/6, 168→169, append puro); ata completa com os 3 votos e papéis; pendências abertas com dono e `bloqueia: não`; limpeza §C5 limpa; disco 19 GB; nenhuma pendência BLOQUEIA os próximos alvos.

## Veredito

Encerrado em 2026-10-01T21:14Z (UTC); carimbos por item = hora da gravação, ao minuto. Nenhuma `PAUSA` recebida.

Teardown (medido 21:14:30Z): `git worktree remove --force C:/Users/AMP/w-port397` ec=0 · `git worktree prune` · diretório ausente · 0 entradas `w-port397` em `git worktree list` · árvore principal em `513937b0`, 0 rastreados apagados · processos no caminho: não medido (PowerShell indisponível no shell; a remoção foi forçada só sobre o meu próprio worktree, criado nesta sessão).

LIBERADO COM RESSALVA: ciclo 4 do PR 393 (B-GOV-MANDATO) e as tarefas de nuvem de B-SAN3-05, B-SAN3-09 e B-SAN3-11 | no PR de registro `docs/registro-397` (o que versiona este parecer): (1) backfill §C3.5 em `Kpis/kpis-latest.json` e na entrada `pr 397` de `kpis-history.json` — `merge_commit 513937b0555e2a6175e7e89d8ae9e44dbc995f8a`, `approved_head 67c2c280612cb644f246af0b5410cab59afe028d`; (2) abrir `P-GOV-PAUSA-ELABORACOES-DO-TRANSCRITOR` e `P-GOV-PAUSA-CASO-SEM-FONTE` em `pendencias.md` com dono, prova, escopo, `bloqueia` e teste de encerramento, índice pelo gerador; (3) corrigir ou anotar o corpo do PR 397 ("Kpis/* intocados" e "junta ainda não convocada" contradizem o diff). E, no #393 antes do merge dele: recontar `blocks_completed` para 170 com a entrada própria por último.
