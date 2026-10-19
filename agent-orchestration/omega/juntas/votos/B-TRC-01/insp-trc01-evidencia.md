# Evidência incremental — inspetor-trc01-cdx — B-TRC-01

- Papel: `inspetor-de-terreno-da-junta`
- Modelo: `GPT-5.6 Sol (high)` — nível menor do contrato
- Corpo EOL-neutro (`origin/main`): `89b4563001df748a4016ae57b05fbd20`
- Mandato MD5 cru: `6d8dc6de14a4cf7a2206c5922a9c2fb8`
- Estado: `CONCLUÍDO — LIBERADO COM RESSALVA`

## Item 0 — integridade do corpo e mandato

- Comando: `git fetch -q origin && git show origin/main:.claude/agents/inspetor-de-terreno-da-junta.md | tr -d '\r' | md5sum`; MD5 cru do mandato via `System.Security.Cryptography.MD5`.
- Saída resumida: corpo `89b4563001df748a4016ae57b05fbd20`; mandato `6d8dc6de14a4cf7a2206c5922a9c2fb8`; ambos iguais aos hashes do disparo.
- Veredito parcial: `VERDE` — corpo e mandato íntegros; inspeção autorizada.

## Item 1 — isolamento

### 1.1 Head e árvore

- Comando: `git worktree add --detach C:/Users/AMP/w-insp-trc01 5abdf83...`; `git -C ... status --porcelain`; no worktree do PR, laço `git show HEAD:<arquivo> | tr -d '\r' | md5sum` × arquivo em disco para cada ` M` reportado.
- Saída resumida: worktree detached em `5abdf83...`, status vazio. O worktree do PR aponta ao mesmo SHA; seu status traz 52 ` M` em `.agents/agents/**`, mas `git diff` é vazio e os 52 conteúdos têm hash EOL-neutro idêntico ao blob (`divergentes=0`): fantasmas de stat-cache, não mutação de conteúdo. Os únicos untracked relevantes são `.npmtest-503.log`, os dois artefatos da 1ª inspeção e os dois artefatos desta inspeção.
- Veredito parcial: `VERDE` — objeto limpo no worktree detached e nenhum conteúdo rastreado divergente no worktree do dev.

### 1.2 Plano de isolamento

- Comando: leitura integral dos mandatos `cadeira-a.md`, `cadeira-b.md`, `cadeira-c.md` no head.
- Saída resumida: cada cadeira recebe worktree detached próprio (`w-jtrc-a/b/c`), `npm ci` próprio sem junction, Postgres/Redis Linux descartáveis com prefixos exclusivos `jtrc01-a/b/c-`, porta alta apenas em loopback, digest fixo do Traccar, limpeza por nome/perfis; proíbe base viva, portas 5432/6379/3000/5173/5050, servidores públicos e worktree do dev. As cadeiras executarão uma por vez; P5 limita a no máximo 2.
- Veredito parcial: `VERDE` — isolamento escrito e verificável.

### 1.3 Resíduos e capacidade

- Comando: `docker ps -a`, `docker network ls`, `docker compose ls -a`, `git worktree list --porcelain`, busca de `jur-probe*`/`*-probe.ts`/`*probe*.mjs`, processo `node.exe` por linha de comando, `Get-PSDrive C`.
- Saída resumida: zero container/rede/projeto/worktree com prefixo `trc01-*`, `jtrc01-*`, `jur-*`, `crit-*` ou `w-jtrc-*`; zero probe; zero processo Node ligado a `w-trc01`/`w-jtrc`. `j03a-c2-pg` e `w-j03a-c2` pertencem à junta paralela explicitamente fora do alvo. Containers exited de outros contextos são inertes. Disco livre: `11,77 GB` (≥10 GB).
- Veredito parcial: `VERDE` — sem resíduo ativo desta junta; capacidade mínima satisfeita.

### Objeto da junta

- Comando: `git fetch -q origin`; `git rev-parse refs/remotes/origin/feat/traccar-b-trc-01`; `git rev-parse 5abdf83...`; `gh pr view 426 --json ...`; `gh api repos/thiagodorgo/ERP_Techsolutios/commits/5abdf83.../check-runs`.
- Saída resumida: Git remoto, SHA nomeado pelo disparo e GitHub PR `headRefOid` convergem em `5abdf83bfcfcac9f70cb1e1aad1c7a7a7cecbf91`; PR aberto, não draft. Há 14 check-runs; todos `status=completed` e `conclusion=success` (duas execuções de `backend`, `backend-postgres`, `frontend`, `flutter`, `owner-portal`, `authority-portal` e `docker`).
- Veredito parcial: `VERDE` — objeto resolvido por Git e GitHub, com check-runs existentes e concluídos. O head `e38b47...` colado na seção MEDIDO do mandato está obsoleto e foi tratado apenas como insumo a re-verificar.

## Item 2 — insumos do briefing

### 2.1 Ata anterior / fatos herdados

- Comando: `git ls-tree -r --name-only HEAD agent-orchestration/omega/juntas agent-orchestration/omega/reprovacoes | grep -Ei 'B-TRC-01|TRC-01'`; grep das cláusulas `A RE-VERIFICAR`, `Nada entra como fato` e `herdar invalida` nos três corpos.
- Saída resumida: no head só existem os quatro mandatos; nenhuma ata, reprovação ou voto de mérito anterior do B-TRC-01. É ciclo 1. Os três corpos marcam relatório do dev, plano e parecer do inspetor como roteiro/hipótese `A RE-VERIFICAR` e ordenam reexecução própria. A 1ª inspeção untracked foi reexecutada, não herdada.
- Veredito parcial: `VERDE`; auditoria de máquina do ciclo 3 é `N/A`.

### 2.3 Plano, escopo, bateria e insumos novos

- Comando: leitura do `README.md`, `PLANO_TRACCAR.md` §8 inteiro, emendas v2.2/v2.3, comando do bloco, relatório do dev e decisão T13; `wc -l`; greps de §8.3/§8.8/§8.10 e das Retomadas 3–7.
- Saída resumida: todos os insumos existem no head. Plano v2.1: 1.995 linhas; emendas: 224/281; relatório do dev: 871; decisão T13: 61; comando: 158. §8.3 declara permitido/proibido; §8.8 declara comandos, ambiente e forma; §8.10 declara competências e unanimidade 3/3. O relatório contém a porta de commit/503 (Retomadas 3–6) e os dois testes da Retomada 7, presentes no código nas linhas 545 (`traccar-position-ingestion-db`) e 151 (`traccar-rate-limit`). A decisão T13 e os literais 111/118 estão na ref.
- Veredito parcial: `VERDE COM RESSALVAS`: (R-CICLO) os corpos dizem que o mandato declara o ciclo, mas os mandatos só declaram o teto; a medição prova ciclo 1. (R-DBA) a aprovação separada do `agente-dba-guardiao`, exigida pelo DoD de §8.10, ainda não existe; o relatório do dev registra que não foi convocado. Isso não impede o start da junta, mas impede fechar o DoD/merge até existir.

## Item 3 — papéis

### 3.1 / 3.1-bis Inelegibilidade

- Comando: leitura integral de `OBITUARIO-IDENTIDADES.md` antes do grep; busca exata das três identidades no obituário, atas e reprovações; busca nominal de planejadores, críticos, dev original, devs do 503 e revisor da API.
- Saída resumida: zero colisão das três identidades com `SEPULTADA`/`RESERVADA`, atas ou reprovações. `dev-trc01-claude`, `dev-trc01-503-agy`, `dev-trc01-503-gemini`, `dev-trc01-503-flash`, `rev-503-delta`, `planejador-traccar-01/02` e `critico-traccar-r1/r2` existem nas fontes e nenhum coincide com `jurado-trc01-a/b/c`. Os corpos também listam esses papéis/identidades como inelegíveis.
- Veredito parcial: `VERDE`.

### 3.2 Competência

- Comando: leitura de §8.10 e dos frontmatters/mandatos das três cadeiras.
- Saída resumida: (a) cobre PostgreSQL/RLS/unicidade/atomicidade/pool/503; (b) cobre listener/superfície/segredo/log/limitador/503; (c) cobre contrato/idempotência/quarentena/atribuição/resolução/503. A composição cobre os riscos centrais. A revisão adicional da migração pelo `agente-dba-guardiao` permanece pendente e foi nomeada em R-DBA.
- Veredito parcial: `VERDE COM RESSALVA R-DBA`.

### 3.3 Corpo carregado × corpo julgado

- Comando: hash EOL-neutro via `git show HEAD:.claude/agents/especialistas/<nome>.md | tr -d '\r' | md5sum`; conferência do diretório da sessão; `node scripts/sync-agent-agents.mjs --check`; verificação das cláusulas/decisões citadas no `CLAUDE.md` e `decisoes.md` do head.
- Saída resumida: corpos julgados: (a) `725c583fc448803e57251e33bb05ba07`; (b) `b7c63c7d058361a4dddb31b3f2191037`; (c) `e1d8770fa15e8b6984da8cf52ea1dff9`. Eles não existem no diretório da sessão (`origin/main`), portanto não podem ser carregados por nome dali. Os mandatos determinam explicitamente disparo general-purpose com o blob `.claude` do head e comparação MD5 antes do voto. S0 confirma os espelhos Codex recursivos; o `.agents` inclui o preâmbulo Codex e por isso não tem o mesmo hash do corpo `.claude`. As normas citadas existem na ref; `D-DISPATCH-REASSIGN-NAO-ATOMICO` foi apenas falso positivo de regex sobre a pendência `P-FIELD-DISPATCH-...`, não norma aplicada.
- Veredito parcial: `VERDE COM RESSALVA R-CORPO` — cada disparo deve colar o blob do head e conferir o MD5 acima; divergência, sobretudo em cadeira de veto, bloqueia o voto.

## Item 4 — fatias de orquestração

### 4.1 S0

- Comando: `node scripts/sync-agent-agents.mjs --check` no worktree detached do head.
- Saída resumida: `[agents-sync] OK — 55 agentes, espelho consistente.`; as três cadeiras existem nos dois espelhos.
- Veredito parcial: `VERDE`.

### 4.2 Baseline

- Comando: `npm ci --no-audit --no-fund` próprio; `DATABASE_URL=postgresql://u:p@127.0.0.1:1/x npx prisma generate`; `timeout -k 15 600 npm run check > log 2>&1; ec=$?`; status final.
- Saída resumida: 326 pacotes instalados; Prisma Client gerado sem conexão a banco; `npm run check` (`tsc --noEmit`) terminou `check_ec=0`; worktree permaneceu limpo. Aviso conhecido: dependência pede Node ≥22, executor está em Node 20.19.5, sem falha.
- Veredito parcial: `VERDE`.

### 4.3 Check-runs

- Comando: `gh api repos/thiagodorgo/ERP_Techsolutios/commits/5abdf83.../check-runs --paginate`.
- Saída resumida: 14 check-runs, todos `completed/success`; nenhum zero, queued, in_progress ou cancelled.
- Veredito parcial: `VERDE`.

## Item 5 — quórum

- Comando: grep/leitura das seções `Quórum, ciclo, queda e PAUSA` nos três corpos e §8.10 do plano.
- Saída resumida: unanimidade 3/3 com veto; a junta não fecha com menos de três votos; voto perdido não conta; queda retoma a mesma identidade e mandato, reexecutando P1; P6 registra em `00-quedas.md`. Disparo escalonado: uma cadeira por vez, máximo contratual de 2.
- Veredito parcial: `VERDE`; ressalva R-CICLO permanece porque o número `ciclo 1` deve constar no disparo.

## Limpeza

- Comando: validação do alvo absoluto `C:\Users\AMP\w-insp-trc01`; `git worktree remove --force C:\Users\AMP\w-insp-trc01`; conferência por existência e `git worktree list`; remoção nominal dos dois logs `/tmp/insp-trc01-check*.log`.
- Saída resumida: worktree existia no alvo exato, foi removido; `exists_after=False`, `listed_after=0`; logs temporários ausentes. Nenhum container, rede ou volume foi criado. Base viva, portas do dono e recursos da junta paralela não foram tocados.
- Veredito parcial: `VERDE`.

## Revalidação final

- Comando: novo `git fetch`; `git rev-parse origin/feat/traccar-b-trc-01`; `gh pr view 426`; resumo de check-runs.
- Saída resumida: head permaneceu `5abdf83bfcfcac9f70cb1e1aad1c7a7a7cecbf91`; PR `OPEN`, não draft, `MERGEABLE`; check-runs `[total=14, pendentes=0, não-success=0]`.
- Veredito parcial: `VERDE`.

## Veredito consolidado

`LIBERADO COM RESSALVA` — a junta pode iniciar somente com R-CICLO e R-CORPO destacadas no disparo; R-DBA precisa ser satisfeita antes de fechar DoD/merge.
