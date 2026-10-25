executor: Antigravity (agy) · identidade: insp-trc02-c2-argon · modelo: gemini-4-argon (esforço medium, nível menor declarado, §C7.6) · objeto: 42800d0dcece29c7e3a39476c9b40c917a66dfd0 · mandato_md5 (tr -d '\r' | md5sum): 8ab80732175f83810ca17725d197e3c6 · corpo: blob fab12796092a848d9395f9fef0830126a4883550 (git show 42800d0dcece29c7e3a39476c9b40c917a66dfd0:.claude/agents/inspetor-de-terreno-da-junta.md, IDENTICO ao espelho .agents/ pelo S0) · início 2026-10-24T19:58Z

# Evidência incremental (P1) — inspetor de terreno B-TRC-02 ciclo 2

## E0 — estado de partida e cabeçalho
- cmd: `tr -d '\r' < .../00-mandatos/inspetor-trc02-c2.md | md5sum; for f in .../00-mandatos/*.md; do ...; done; git -C C:/Users/AMP/w-trc02 rev-parse 42800d0dcece29c7e3a39476c9b40c917a66dfd0:.claude/agents/inspetor-de-terreno-da-junta.md; git -C C:/Users/AMP/w-trc02 rev-parse HEAD; git -C C:/Users/AMP/w-trc02 status --porcelain; docker ps`
- saída:
  - `inspetor-trc02-c2.md` md5=`8ab80732175f83810ca17725d197e3c6` (396 linhas)
  - `cadeira-a.md` md5=`f55e1e5e4dbe176bd522e6e7dd2f4de5` (315 linhas)
  - `cadeira-b.md` md5=`e78c4a96377341a8c082eb311248c2ad` (344 linhas)
  - `cadeira-c.md` md5=`a8df20ae2eb3cdaf9697af032c61f12c` (287 linhas)
  - blob do corpo `.claude/agents/inspetor-de-terreno-da-junta.md` no objeto: `fab12796092a848d9395f9fef0830126a4883550` (`model: opus` no frontmatter; executor efetivo = Antigravity `gemini-4-argon`, divergência declarada no mandato sob ordem do dono de 24/10 "use o Argon")
  - `HEAD` de `C:/Users/AMP/w-trc02`: `42800d0dcece29c7e3a39476c9b40c917a66dfd0`
  - `git status --porcelain`: apenas `?? agent-orchestration/omega/juntas/votos/B-TRC-02-ciclo2/`
  - `docker ps`: apenas `erp-postgres` (Up 3h, healthy, 5432) e `erp-redis` (Up 3h, healthy, 6379)
- veredito parcial: Estado inicial íntegro; esqueleto do parecer criado antes do Item 1.

## Item 1 de 3 — objeto, CI, mandatos, corpos, carimbos, S0
- cmd: `git -C C:/Users/AMP/w-trc02 ls-remote origin refs/heads/feat/traccar-b-trc-02; gh pr view 454 --repo thiagodorgo/ERP_Techsolutios --json headRefOid,mergeable,mergeStateStatus,state,isDraft`
  - saída: `42800d0dcece29c7e3a39476c9b40c917a66dfd0` nas duas fontes · `state: "OPEN"` · `isDraft: false` · `mergeable: "MERGEABLE"` · `mergeStateStatus: "CLEAN"`. O objeto não andou desde a redação dos mandatos.
- cmd: `gh api repos/thiagodorgo/ERP_Techsolutios/commits/42800d0dcece29c7e3a39476c9b40c917a66dfd0/check-runs --jq '.total_count, ([.check_runs[] | select(.status != "completed" or .conclusion != "success")] | length), ([.check_runs[] | "\(.name):\(.status)/\(.conclusion)"] | sort | join(", "))'`
  - saída: `total_count = 14`, fora de `completed/success = 0`; jobs (7 × 2 gatilhos `push` e `pull_request`): `authority-portal:completed/success (×2), backend-postgres:completed/success (×2), backend:completed/success (×2), docker:completed/success (×2), flutter:completed/success (×2), frontend:completed/success (×2), owner-portal:completed/success (×2)`.
- cmd: comparação das ferramentas do pré-voo em `C:/Users/AMP/erp-pausa-2026-10-03/redator-trc02-c2/` contra `origin/chore/mandato-refs-e-preflight` e contra `redator-trc02-v2/` (ciclo 1)
  - saída: `mandato-preflight.sh` tem `linhas-diferentes=2` contra o ramo (`< RAIZ="$(cd "$(dirname "$0")/.." && pwd)"` / `> RAIZ=C:/Users/AMP/w-trc02`) e é byte-idêntico ao do ciclo 1 (`cmp -s`); `mandato-refs.sh` tem `linhas-diferentes=0` e é byte-idêntico ao do ciclo 1.
- cmd: `cd C:/Users/AMP/w-trc02 && MANDATO_REFS=C:/Users/AMP/erp-pausa-2026-10-03/redator-trc02-c2/mandato-refs.sh bash C:/Users/AMP/erp-pausa-2026-10-03/redator-trc02-c2/mandato-preflight.sh .../00-mandatos/<m> 454` para `inspetor-trc02-c2.md`, `cadeira-a.md`, `cadeira-b.md`, `cadeira-c.md`
  - saída: `PRE-VOO OK` e `ec=0` nos 4 mandatos (`COLAGEM` dos refs do PR #454 e do PR #426 confere com a saída atual nos 4). Em todos os 4 consta o `AVISO` esperado do `mandato-refs.sh 454` (`ec=3`, `approved_head NAO DETERMINAVEL` — a ata `J-B-TRC-02-ciclo1.md` cita #454 no corpo com `approved_head: nenhum — REPROVADO (ciclo 1)`, mas a ferramenta não a reconhece como ata declarada sobre o PR — R7 do plano do ciclo 2) e os `AVISO`s de corrida hex em caminhos de migração (`20260878000000`, `20260879000000`, `20260880000000`).
- cmd: conferência EOL-neutra dos 3 corpos de especialistas entre `.claude/agents/especialistas/` e `.agents/agents/especialistas/` no objeto (descontados frontmatter e bloco `Papel para o Codex`), igualdade com `<objeto>~5` (ciclo 1) e presença nos mandatos da instrução de carregamento pelo blob do objeto novo (corpo item 3.3)
  - saída:
    - `a-banco-rls-arnes`: `IDENTICO` (blob `.claude` = `649c6f80`, md5 EOL-neutro completo = `147850658e1d5974b058ab147dd0ca1c`; menções a `v2.3|v2.4|migration-drill|T-M(` = 0; linhas que citam `M-E16` = 3)
    - `b-superficie-escopo-registro`: `IDENTICO` (blob `.claude` = `3fa735d1`, md5 EOL-neutro completo = `2bea60cd0b00640c29c7068c17e11062`; menções a `v2.3|v2.4|drill|T-M(` = 0; linhas que citam `M-E16` = 3)
    - `c-contrato-evento-unidades`: `IDENTICO` (blob `.claude` = `2b749424`, md5 EOL-neutro completo = `706f8d58dad7d864a533592a4f2e775f`; menções a `v2.3|v2.4|drill|T-M(` = 0; linhas que citam `M-E16` = 16)
    - `git diff --quiet 42800d0dcece29c7e3a39476c9b40c917a66dfd0~5 42800d0dcece29c7e3a39476c9b40c917a66dfd0 -- .claude/agents/especialistas .agents/agents/especialistas` → `especialistas iguais aos do objeto do ciclo 1` (ec=0).
    - Na árvore principal (`C:/Users/AMP/Documents/GitHub/ERP_Techsolutios`, `main`), os 3 corpos de especialistas estão `AUSENTES` (só existem no ramo do bloco); o corpo do inspetor na árvore principal tem md5 EOL-neutro `cbbed45074c7098081a9c51d47f3e373`, idêntico ao do objeto. Os 3 mandatos de cadeira (`cadeira-a.md` l.281, `cadeira-b.md` l.313, `cadeira-c.md` l.258) mandam carregar o corpo diretamente do blob do objeto novo (`git show 42800d0d...:.claude/agents/especialistas/jurado-trc02-<x>.md`) e declarar `IDENTICO/DIVERGE` EOL-neutro na 1ª linha da evidência → item 3.3 satisfeito por construção.
- cmd: conferência EOL-neutra (corpo item 1.1) dos arquivos centrais no worktree `C:/Users/AMP/w-trc02` contra o blob do objeto
  - saída: `traccar-ingestion.service.ts` (`a9aa2688476cb2dcb17c54f0f11db2a4`), `mutations.mjs` (`f0d5b14b22fd40995809c2cfaf9f2371`), `B-TRC-02-dev.md` (`fba49b574415f09255d1ae44873996ff`), `pendencias.md` (`a9bf83419f7d2e8dbda1dcbf0a99fa7b`) — todos `equal=YES`.
- cmd: S0 num worktree descartável meu (`git worktree add --detach C:/Users/AMP/w-insp-trc02c2 42800d0dcece29c7e3a39476c9b40c917a66dfd0; node C:/Users/AMP/w-insp-trc02c2/scripts/sync-agent-agents.mjs --check; git worktree remove --force C:/Users/AMP/w-insp-trc02c2`)
  - saída: `[agents-sync] OK — 79 agentes, espelho consistente.`, `s0_ec=0`, `worktree descartavel C:/Users/AMP/w-insp-trc02c2 removido`.
- cmd: carimbos de migração (plano v2 item (ii))
  - saída: `duplicados: 0`; `_invoice_complementary_title 1`, `_vehicle_telemetry_events 1`, `_validate_receipt_message_kind_check 1`; maior carimbo do merge-base `7ab2fe71` = `20260878000000_invoice_complementary_title`; os dois do bloco (`20260879000000_vehicle_telemetry_events` e `20260880000000_validate_receipt_message_kind_check`) são maiores que todo carimbo do merge-base; migrações novas desde o objeto do ciclo 1 (`<objeto>~5`) = `0`.
- cmd: teste H8 (plano v2 item (iii)) no objeto e nos logs dos 2 check-runs `backend` (`120967925108` e `120967916287`)
  - saída: `tests/traccar-event-topology.test.ts` l.234 `test("evento: as 5 fixtures de evento estão sanitizadas (dado pessoal sintético, coordenada na caixa sintética)"...)`; nos 2 jobs `backend`: `ok 3095 - evento: as 5 fixtures de evento estão sanitizadas (dado pessoal sintético, coordenada na caixa sintética)` e `# tests 3865 / # pass 3863 / # fail 0 / # skipped 2`.
- cmd: baseline `npm run check` no objeto (`C:/Users/AMP/w-trc02`, árvore limpa)
  - saída: `tsc -p tsconfig.json --noEmit` → `check_ec=0`; `git status --porcelain` permanece só com `?? agent-orchestration/omega/juntas/votos/B-TRC-02-ciclo2/`.
- **veredito parcial Item 1:** **VERDE**.

## Item 2 de 3 — identidades, papéis, composição, briefing e divergências
- cmd: leitura de `agent-orchestration/omega/juntas/OBITUARIO-IDENTIDADES.md` no objeto (corpo 3.1-bis)
  - saída: `grep -c -i 'trc02'` = `0`; `RESERVADA` = `11` (nenhuma de `trc02`).
- cmd: regeneração da lista de identidades com radical `trc02` (sobre o diff `7ab2fe71..42800d0d` no objeto + `C:/Users/AMP/erp-pausa-2026-10-03/revisoes/B-TRC-02-*` + `planos/B-TRC-02-*`) e contagem da família `B-TRC-01`
  - saída: 56 tokens `trc02` (os 49 do objeto — piso do mandato — mais os de `erp-pausa-2026-10-03` que nomeiam a composição final e o redator do ciclo 2) e 68 da família `B-TRC-01`.
  - Papéis efetivamente EXERCIDOS no bloco (inelegíveis):
    - Ciclo 1: `inspetor-trc02-opus`, `jurado-trc02-a-opus`, `jurado-trc02-b-opus`, `jurado-trc02-c-opus`, `dev-trc02-opus`, `dba-trc02-opus`, `registrador-trc02-opus`, `fabrica-trc02-opus`, `fabrica-trc02b-opus`;
    - Redatores: `redator-trc02-opus`, `redator-trc02-v2`, `redator-trc02-cdx`, `red-trc02-arg`, `redator-trc02-c2-opus` (que cobriu `redator-trc02-c2-sol`, em limite de uso, e escreveu estes mandatos);
    - Planejadores e críticos: `planejador-trc02-fable`, `planejador-trc02-v2-fable`, `planejador-trc02-emenda-fable`, `planejador-trc02-escopo-fable`, `planejador-trc02-v23-fable`, `planejador-trc02-v24-fable`, `planejador-trc02-c2-fable`, `critico-trc02-opus`, `critico-trc02-flash`, `critico-trc02-r2-opus`, `prerev-trc02-flash`;
    - Dev do ciclo 2: `dev-trc02-c2-argon`;
    - Nomeados no plano do ciclo 2 e trocados antes de exercer papel (não se reaproveitam): `insp-trc02-c2-sol`, `jurado-trc02-c2-a-sol`, `jurado-trc02-c2-c-sol`, `redator-trc02-c2-sol`;
    - Orquestrador da sessão e família `B-TRC-01` inteira (68 nomes).
- cmd: busca no objeto (`git grep -l -i -F <id> 42800d0d...`) das 4 identidades desta junta e das trocadas/redatores
  - saída:
    - `insp-trc02-c2-argon` → `[NENHUM]`
    - `jurado-trc02-c2-a-pro` → `[NENHUM]`
    - `jurado-trc02-c2-b-argon` → `[docs/revisoes/TRACCAR/B-TRC-02-ciclo2-auditoria-e-plano.md]` (apenas nomeação prospectiva na tabela §4 do plano do ciclo 2)
    - `jurado-trc02-c2-c-opus` → `[NENHUM]`
    - `insp-trc02-c2-sol`, `jurado-trc02-c2-a-sol`, `jurado-trc02-c2-c-sol`, `redator-trc02-c2-sol` → `[docs/revisoes/TRACCAR/B-TRC-02-ciclo2-auditoria-e-plano.md]`
    - `redator-trc02-c2-opus` → `[NENHUM]`
  - Pares próximos conferidos: `jurado-trc02-c2-c-opus` (ciclo 2) ≠ `jurado-trc02-c-opus` (ciclo 1, inelegível) e `jurado-trc02-c2-c-opus` ≠ `redator-trc02-c2-opus` (redator destes mandatos, inelegível) — mesmo modelo (Claude Opus), identidades distintas. Nenhuma das 4 identidades desta junta exerceu papel anterior, nem colide entre si ou com qualquer inelegível.
- cmd: conferência do §C7.4-bis e de `D-TOPO-E-O-CLAUDE` no objeto
  - saída:
    - Achou: `jurado-trc02-b-opus` (`agent-orchestration/omega/juntas/votos/B-TRC-02/cadeira-b-voto.json`, achado `b-1`, `bloqueia`, `dentro-do-bloco`, `não grave`);
    - Planejou: `planejador-trc02-c2-fable` (Fable, `claude-fable-5-1`, topo — `docs/revisoes/TRACCAR/B-TRC-02-ciclo2-auditoria-e-plano.md` l.3–4);
    - Desenvolveu: `dev-trc02-c2-argon` (Antigravity `gemini-4-argon` — `docs/revisoes/TRACCAR/B-TRC-02-dev.md` l.568–570);
    - Julgam: `jurado-trc02-c2-a-pro`, `jurado-trc02-c2-b-argon`, `jurado-trc02-c2-c-opus` (3 cadeiras novas).
    - `D-TOPO-E-O-CLAUDE`: gravada em `agent-orchestration/controle/decisoes.md` l.3902 com as palavras literais do dono (`"sempre trocar o astra por vc"`, `"vc tambem cobre que cair por limite"`).
- cmd: conferência da COMPOSIÇÃO FINAL do ciclo 2 nos 4 mandatos (`inspetor-trc02-c2.md` l.375/379, `cadeira-a.md` l.281, `cadeira-b.md` l.313, `cadeira-c.md` l.258)
  - saída: todos os 4 mandatos trazem a composição final consistente (sem o texto antigo de monocultura do ciclo 1):
    - Inspetor: `insp-trc02-c2-argon`, Antigravity (`agy`), `gemini-4-argon` (medium, nível menor declarado);
    - Cadeira (a): `jurado-trc02-c2-a-pro`, Gemini CLI pela API (`run-gemini-visivel.ps1 -Model gemini-3.1-pro-preview`), teto de US$ 5 por disparo (`D-GEMINI-PRO-NIVEL-CODEX`, `D-GEMINI-PRO-API-TETO`);
    - Cadeira (b): `jurado-trc02-c2-b-argon`, Antigravity (`agy`), `gemini-4-argon` (`agy models` antes);
    - Cadeira (c): `jurado-trc02-c2-c-opus`, Claude Code (subagente do orquestrador, `model: "opus"` explícito), cobrindo o Codex (`jurado-trc02-c2-c-sol`) em limite de uso, a cadeira não-Gemini com veto na unanimidade;
    - Coincidências de modelo declaradas para a ata: Argon em `insp-trc02-c2-argon`, `jurado-trc02-c2-b-argon` e `dev-trc02-c2-argon` (identidades distintas; inspetor não julga mérito; R6 do plano do ciclo 2); Claude Opus em `redator-trc02-c2-opus` e `jurado-trc02-c2-c-opus` (identidades distintas, cobrindo limite do Codex); duas das três cadeiras são da família Gemini (`gemini-3.1-pro-preview` e `gemini-4-argon`), sustentadas pela leitura do orquestrador de `D-GEMINI-SEGUNDO-REVISOR` ("nunca revisor único", unanimidade de 3 executores com veto da cadeira Claude Opus).
- cmd: conferência dos insumos do briefing (no objeto e fora dele) e de cercas vazias nos 4 mandatos
  - saída:
    - Todos os 15 insumos no objeto (`PRESENTE`), cópia de `B-TRC-02-ciclo2-auditoria-e-plano.md` no objeto `IDENTICO` EOL-neutro ao original em `C:/Users/AMP/erp-pausa-2026-10-03/planos/`, `porteiro-426-parecer.md` com `72:LIBERADO COM RESSALVA` (e a cerca nos 3 mandatos de cadeira tem a saída preenchida: `empty_fences=0` nos 4 mandatos — R-1 do ciclo 1 sanada), `B-TRC-02-dba-parecer.md` fora do objeto com `Veredito final (rodada 2, 46dd99d1): FAVORÁVEL` sobre `<objeto>~5~5` e `diff prisma` desde então = `0`.
    - Nos 3 mandatos de cadeira, todos os insumos (plano v2, emendas v2.1–v2.4, respostas do dono, relatório do dev com seção do ciclo 2, parecer do DBA, pré-revisão Flash, parecer do porteiro do 426, plano do ciclo 2, ata e reprovação do ciclo 1) estão listados como **A RE-VERIFICAR**.
- cmd: conferência por `grep -c` das divergências (ciclo 1 + ciclo 2), régua do ciclo 2, item 9 e roteiro P3 nos 3 mandatos de cadeira
  - saída:
    - Comuns às 3: corpos anteriores a `v2.3`/`v2.4`, DBA fora do objeto, `D-TRC02-C10-EVENTO-SEM-DESPACHO-GUARDA`, `D-MIGRACAO-COM-TRANSACAO-EXPLICITA`, `D-TOPO-E-O-CLAUDE`, (i) `M-E16′` → `M-E16″` (propriedade no corpo × âncora no passo 5 no catálogo do objeto), (ii) `phaseTwoSteps` sem `let binding`/`locked` (`5 7`), (iii) `merge-base` novo (`7ab2fe71`) deixando o merge da `main` fora do laço por construção, régua do ciclo 2 (§C7 item 8(2): último ciclo em que `bloqueia` `dentro-do-bloco` não grave reprova), §C7 item 9 (nenhum voto carregado, 3 cadeiras `refeita`, `arquivos_medidos` obrigatório) e roteiro P3 com os caminhos das sondas do ciclo 1 (`C:/Users/AMP/erp-pausa-2026-10-03/jtrc02-{a,b,c}/`);
    - Específicas: em `cadeira-a.md` (`G9=3`, `463=4`, `NOVAS=3`, `C5=4`); em `cadeira-b.md` (base do laço recalculada, `PERMITIDO=2` somando registro do ciclo, `P-MIGRACOES-ANTERIORES=7`, foco item 9(3) em `b-1=2` com controle positivo em `<objeto>~5`, `b-3=5` gravada no commit `<objeto>`, `b-4=3` `SUPERADO`); em `cadeira-c.md` (`M-E09=6` re-especificada em `<objeto>~5~1`, `E8=8`).
- **veredito parcial Item 2:** **VERDE** (com as declarações de composição para a ata registradas como ressalva informativa).

## Item 3 de 3 — terreno, isolamento, P3/P5/P8, baseline e ordem de disparo
- cmd: `git -C C:/Users/AMP/w-trc02 rev-parse HEAD; git status --short -uno | wc -l; git status --short; find C:/Users/AMP/w-trc02 -maxdepth 3 \( -name 'jur-probe*' -o -name '*-probe.ts' -o -name 'zz-jtrc*' -o -name 'zz-jt2c2*' \)`
  - saída: `HEAD = 42800d0dcece29c7e3a39476c9b40c917a66dfd0`; modificados rastreados = `0`; não rastreado = apenas `?? agent-orchestration/omega/juntas/votos/B-TRC-02-ciclo2/`; arquivos de sonda soltos na árvore = `0`.
- cmd: `git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios worktree list; ls -d C:/Users/AMP/w-jt2c2-* C:/Users/AMP/erp-pausa-2026-10-03/jt2c2-*; for d in jtrc02-a jtrc02-b jtrc02-c; do ls C:/Users/AMP/erp-pausa-2026-10-03/$d | wc -l; done`
  - saída:
    - Worktrees vivos na máquina (6): `C:/Users/AMP/Documents/GitHub/ERP_Techsolutios` (`539b078e [main]`), `C:/Users/AMP/w-agapi2` (`f2ece5da [chore/agente-api-2]`), `C:/Users/AMP/w-kpi24` (`b9e5e953 [chore/kpi-marco-2026-10-24]`), `C:/Users/AMP/w-plan21` (`7ab2fe71 (detached HEAD)`), `C:/Users/AMP/w-san320` (`a0f5aabc [fix/cheque-x-baixa]`), `C:/Users/AMP/w-trc02` (`42800d0d [feat/traccar-b-trc-02]`). Resíduo alheio reportado, não varrido.
    - `nenhum w-jt2c2-* nem jt2c2-* ainda` (nascem com cada cadeira).
    - Pastas de sondas do ciclo 1 (roteiro P3, somente leitura): `jtrc02-a arquivos=56`, `jtrc02-b arquivos=19`, `jtrc02-c arquivos=2`.
- cmd: conferência de junctions (`Get-Item -Force <worktree>/node_modules | Select LinkType, Attributes`, §C7.1-ter(c))
  - saída: `LinkType=` vazio (`Attributes=Directory`) em `w-agapi2\node_modules`, `w-kpi24\node_modules`, `w-plan21\node_modules`, `w-san320\node_modules`, `w-trc02\node_modules` e `ERP_Techsolutios\frontend\node_modules` → **zero junction**.
- cmd: `docker ps -a --format '{{.Names}}\t{{.Status}}\t{{.Ports}}'; docker network ls; docker network inspect jtrc02-a-tl-net --format '{{len .Containers}}'; docker volume ls | grep -i -E 'jur|crit|tl[0-9]|jtrc|jt2c2'`
  - saída:
    - Contêineres: apenas `erp-postgres` (`Up 3 hours (healthy)`, `5432`) e `erp-redis` (`Up 3 hours (healthy)`, `6379`) — base viva do dono, proibida a qualquer jurado. `0` contêineres órfãos de jurado, `0` trabalhos Docker alheios vivos.
    - Volumes de jurado: `0`.
    - Redes: além de `bridge`, `host`, `none` e `erp_techsolutions_local`, existe `jtrc02-a-tl-net` (`bridge`, `0` contêineres conectados) — resíduo inerte do ciclo 1, sem privilégio nem mutação e com prefixo distinto de `jt2c2-*` (registrado como ressalva para remoção pelo orquestrador com `docker network rm jtrc02-a-tl-net`).
- cmd: medição de memória de commit, RAM, disco livre em `C:` e portas TCP em `Listen`
  - saída:
    - `commit_free_gb = 13.33` GB (acima do piso P8 de `≥ 4 GB`); `ram_free_gb = 8.9` GB.
    - `disk_free_gb = 9.2` GB (`Get-PSDrive C`; `9.3G` na redação dos mandatos) — **abaixo de 10 GB**: pelo mandato (`inspetor-trc02-c2.md` l.381) e pelo R4 do plano do ciclo 2, exige `DEEP_CLEAN=1` (`DEEP_CLEAN=1 bash scripts/post-merge-cleanup.sh`) pelo orquestrador **antes** do lançamento e de cada subida das cadeiras (pois os mandatos das cadeiras exigem `≥ 10 GB` antes de cada `npm ci` e subida de contêiner). Registrado como Ressalva R-1 em destaque.
    - Portas proibidas: `5432` e `6379` `OCUPADA` (base viva, proibida); `3000`, `3200`, `5173`, `5050`, `8899`, `8082`, `5055` `LIVRE` (proibidas).
    - Portas altas candidatas em `127.0.0.1`: `55431`, `55432`, `55433`, `56371`, `56372`, `56373` todas `LIVRE`.
- cmd: conferência nos 3 mandatos de cadeira do plano de isolamento (corpo 1.2), P3, P5, P7 e P8
  - saída: cada mandato exige worktree exclusivo (`C:/Users/AMP/w-jt2c2-<a|b|c>`), `npm ci` próprio sem junction, remoção só por `git worktree remove --force` com 0 processos; Postgres 16 e Redis 7 descartáveis (`jt2c2-<a|b|c>-pg` e `jt2c2-<a|b|c>-redis`, rede `jt2c2-<a|b|c>-`, bases `jt2c2_<a|b|c>_<caso>`) publicados só em `127.0.0.1` em porta alta testada antes, ou cópia de `C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh` em `C:/Users/AMP/erp-pausa-2026-10-03/jt2c2-<a|b|c>/` com `ID` trocado para `jt2c2-<a|b|c>-tl<n>`; sondas novas em `C:/Users/AMP/erp-pausa-2026-10-03/jt2c2-<a|b|c>/` sem escrever em `jtrc02-<a|b|c>/`; protocolo P1/P2/P3/P4/P7, P5 (máx 2 jurados em paralelo), P6 (`00-quedas.md`) e P8 (`commit livre ≥ 4 GB`, `≤ 2` trabalhos Docker, `disco ≥ 10 GB`).
- **veredito parcial Item 3:** **VERDE COM RESSALVA** (R-1: disco em 9,2 GB < 10 GB exigindo `DEEP_CLEAN=1` antes do lançamento das cadeiras; R-2: rede Docker órfã inerte `jtrc02-a-tl-net`).

## Fechamento e limpeza
- cmd: conferência de limpeza do inspetor (`git -C C:/Users/AMP/w-trc02 status --porcelain; git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios worktree list | grep -c insp-trc02c2; docker ps -a --format '{{.Names}}' | grep -c insp-trc02c2`)
  - saída: worktree descartável `C:/Users/AMP/w-insp-trc02c2` removido (`0`); contêineres `insp-trc02c2-*` = `0`; arquivos temporários (`insp-check.log`, `ineleg-trc02.txt`) removidos; em `C:/Users/AMP/w-trc02`, nada rastreado editado e nada commitado (apenas `insp-trc02-c2-evidencia.md` e `insp-trc02-c2-parecer.md` adicionados em `agent-orchestration/omega/juntas/votos/B-TRC-02-ciclo2/`).
- **veredito final:** **LIBERADO COM RESSALVA**.
