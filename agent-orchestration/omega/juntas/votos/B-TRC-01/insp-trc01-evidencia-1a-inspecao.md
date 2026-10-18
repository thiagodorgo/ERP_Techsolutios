# Evidência incremental (P1) — inspetor-de-terreno-da-junta — B-TRC-01 (PR 426)

papel: inspetor-de-terreno-da-junta (identidade nova) · modelo que rodou: Claude Opus 5.5 (nível menor, DECLARADO — D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO)
início: 2026-10-11T23:40:42Z

## 0. Corpo e mandato (2026-10-11T23:40Z)
- comando: `git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios fetch -q origin && git show origin/main:.claude/agents/inspetor-de-terreno-da-junta.md | tr -d '\r' | md5sum`
- saída: `89b4563001df748a4016ae57b05fbd20` · origin/main = `684e9afd7710486682992ee9fb464db17256e68a`
- comando: `md5sum .../00-mandatos/inspetor-trc01.md` → `5d47fef07d2f9d9e166d4adc48d55346`
- veredito parcial: corpo e mandato CONFEREM com o disparo. Segue-se o corpo inteiro.

## 1.1 Head e árvore (gravado às 23:42:31Z, medido por `date -u` logo após a escrita)
- comando: `gh pr view 426 --json headRefOid,...` → headRefOid `31cdd0300b653b50b9ebd795c294ccdb37442491`, OPEN, não rascunho, base main, mergeable UNKNOWN
- comando: `git ls-remote origin refs/heads/feat/traccar-b-trc-01` → `31cdd030…` ; `git -C w-trc01 rev-parse HEAD` → `31cdd030…` (três fontes iguais)
- o mandato foi gerado em `0cccacbc` (23:26Z); `git diff --stat 0cccacbc 31cdd030` → só os 4 mandatos (`00-mandatos/*.md`, 291 inserções). Delta nomeado arquivo a arquivo; nenhum arquivo de produto.
- merge-base com origin/main = `9566d55b` (origin/main agora = `684e9afd`, 1 commit à frente: #427, só teste web).
- comando: `git --no-optional-locks status --porcelain` em w-trc01 → 52 ` M` (todos `.agents/agents/**`) + 2 `??` (os meus 2 arquivos de saída).
- comando: laço `git show HEAD:<f> | md5sum` × `md5sum < <f>` nos 52 → `divergentes_byte_cru=0`; EOL-neutro também 0; `git diff --quiet` ec=0; `ls-files --eol` i/lf w/lf. São ` M` FANTASMA de stat-cache (mtime 20:25:20 -0300 = a escrita do sync no commit 0cccacbc), byte-idênticos ao blob. NÃO é mutação viva.
- mandatos no disco × blob do head: md5 cru difere (disco `w/mixed`, 22–26 CR; blob LF); EOL-neutro IGUAL nos 4 (inspetor 5fae110a…, a e8492c97…, b 30b1b53f…, c 1dc181d7…). O md5 cru do disparo (5d47fef0…) é o do disco misto; o conteúdo é o do blob.
- veredito parcial: VERDE — head 31cdd030 por 3 fontes; árvore sem mutação de conteúdo (52 fantasmas byte-idênticos + 2 arquivos meus). Nota: mandatos no disco com EOL misto (conteúdo igual ao blob).

## 4.3 Check-runs do objeto (hora do item NÃO medida — escrevi estimativa adiantada; janela real 23:42Z–23:54Z, ver correção no fim)
- comando: `git log --oneline 9566d55b..origin/main` → só `684e9afd` (#427); `git diff --stat` → 1 arquivo `frontend/tests/field-operators.smoke.test.tsx` (+3 −1). A main andou só no teste web.
- comando: `gh api repos/thiagodorgo/ERP_Techsolutios/commits/31cdd0300b653b50b9ebd795c294ccdb37442491/check-runs --paginate --jq '.total_count, …'` → **total_count=14**, todos `completed`/`success`, head_sha 31cdd030, concluídos entre 23:27:52Z e 23:40:00Z.
- comando: `gh run list --commit 31cdd030… --json event,workflowName,…` → 2 runs do workflow `ci`: `push` 38184334677 success · `pull_request` 38184337296 success; 7 jobs em cada (authority-portal, backend, backend-postgres, docker, flutter, frontend, owner-portal).
- veredito parcial: VERDE — 14/14 concluídos e verdes; nenhum cancelado/queued. O CI do orquestrador (14/14 success) confere. Os vermelhos "conhecidos" citados no mandato (T15, A11, relógio do Console/#427) NÃO aparecem neste head.

## 4.1 Fatia S0 — espelho Codex (hora do item NÃO medida — escrevi estimativa adiantada; janela real 23:42Z–23:54Z, ver correção no fim)
- terreno: worktree próprio `git worktree add --detach C:/Users/AMP/w-insp-trc01 31cdd030…` → HEAD 31cdd030, status vazio.
- comando: `node scripts/sync-agent-agents.mjs --check` (em w-insp-trc01, exit por variável) → `ec=0`, `[agents-sync] OK — 55 agentes, espelho consistente.`
- comando: `git ls-tree -r --name-only HEAD .claude/agents` × `.agents/agents` (só `.md`, recursivo) → 55 × 56; `diff` → única diferença `README.md` (protocolo de emulação Codex, esperado). O script é recursivo de propósito (l.66-71 "Recursivo DE PROPOSITO … `especialistas/`").
- comando: `git ls-tree 31cdd030` nas 3 cadeiras → rastreadas nos DOIS espelhos (`.claude/agents/especialistas/` e `.agents/agents/especialistas/`).
- veredito parcial: VERDE.

## 3.3 Corpo carregado × corpo julgado (hora do item NÃO medida — escrevi estimativa adiantada; janela real 23:42Z–23:54Z, ver correção no fim)
- comando: `ls C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/agents/especialistas/ | grep -c trc01` → **0**. O diretório da SESSÃO (main 684e9afd) NÃO tem os 3 corpos: eles não carregam por nome. Os mandatos (cadeira-a/b/c l.35-39) declaram o caminho certo: "corpo tirado do blob do objeto …, disparado como general-purpose limitado por escrito a Read, Grep, Glob e Bash; se o md5 EOL-neutro do corpo recebido divergir do publicado no disparo, a cadeira não vota".
- comando: `git show HEAD:.claude/agents/especialistas/<x>.md | tr -d '\r' | md5sum` (blob LF, CR=0, cru = EOL-neutro):
  - jurado-trc01-a-rls-e-banco → `725c583fc448803e57251e33bb05ba07` (611 linhas)
  - jurado-trc01-b-superficie-e-segredo → `b7c63c7d058361a4dddb31b3f2191037` (518 linhas)
  - jurado-trc01-c-contrato-e-atribuicao → `e1d8770fa15e8b6984da8cf52ea1dff9` (549 linhas)
  - os mesmos 3 valores no disco de w-trc01 e de w-insp-trc01 (EOL-neutro).
- inspetor (eu): head = merge-base 9566d55b = origin/main 684e9afd = disco da sessão = `89b4563001df748a4016ae57b05fbd20` (EOL-neutro). O PR não toca o corpo do inspetor.
- norma citada existe? comando: extração de `§C…/§A…` dos 3 corpos → `§A2 §A7 §C5 §C7 §C7.1-bis §C7.1-ter(a) §C7.1-ter(c) §C7.4 §C7.4-bis §C7.5 §C7.6 §C7.6-bis §C7.7`; todas presentes no `CLAUDE.md` do head (l.59 A2, l.103 A7, l.341 C5, l.379 C7, l.421 1-bis, l.389/394/412 1-ter(a)(c), item 4, l.485 4-bis, l.499 item 5, item 6, l.529 6-bis, l.578 item 7, l.661 item 8). `CLAUDE.md` head = origin/main (`f6704aa4…` EOL-neutro).
- comando: laço `grep -c <D-…>` em `decisoes.md`/`CLAUDE.md` do head para os IDs `D-*` dos 3 corpos → todos presentes (D-GOV-PROPORCIONAL, D-MEDIR-NA-REF-ALVO, D-PAUSA-GRAVA-E-PARA, D-TOPO-…, D-TRACCAR-HTTP-PRIVADO-AWS, D-TRC-ARQUITETURA-2026-10-11, D-TRC-CELULAR-PELO-APP, D-TRC-DECISOES-DO-DONO-2026-10-11, D-TRC-PD-APROVADA-2026-10-11). O único "ausente" do laço era falso positivo da minha regex (`P-FIELD-DISPATCH-…` casou `D-DISPATCH-…`); a pendência existe em `pendencias.md:10761`.
- veredito parcial: VERDE, com a condição de disparo: o orquestrador cola o blob do head e confere contra os 3 md5 acima. Os corpos não têm `model:` no frontmatter → rodam no modelo passado (Opus, declarado).

## 3.1 / 3.1-bis Inelegibilidade por nome (hora do item NÃO medida — escrevi estimativa adiantada; janela real 23:42Z–23:54Z, ver correção no fim)
- FONTE PRIMEIRA: `git show HEAD:agent-orchestration/omega/juntas/OBITUARIO-IDENTIDADES.md` (301 linhas; head = origin/main, md5 EOL-neutro b3b11247…) → `grep -niE 'trc|traccar'` = 0 linhas; 34 menções `SEPULTADA`, 7 `RESERVADA` (todas do B-O6R-02; tabela-resumo diz RESERVADAS = 0). Nenhuma das 3 cadeiras está lá.
- comando: `git grep -l -E 'jurado-trc01-(a|b|c)' HEAD` → só os 6 corpos (2 espelhos) e os 4 mandatos de `votos/B-TRC-01/00-mandatos/`. Zero ocorrência em atas `J-*`, `R-*`, `docs/juntas`, `omega/reprovacoes`.
- comando: `git grep -n -E 'J-B-TRC-01|R-B-TRC-01|J-TRC-01' HEAD` → só o comando do bloco (l.142, molde `J-B-TRC-01-ciclo<n>.md`); `ls-tree omega/reprovacoes | grep -i trc` → nada. Não há junta anterior deste bloco → CICLO 1 de fato.
- identidades inelegíveis medidas nas fontes: `planejador-traccar-01`, `planejador-traccar-02` (PLANO l.3-8), `critico-traccar-r1` (CRITICA-r1), `critico-traccar-r2` (CRITICA-r2), agente da API `claude-opus-5-5` (emendas v2.2/v2.3), `dev-trc01-claude` (B-TRC-01-dev.md l.2), `dev-trc01-codex` (prompts/dev-btrc01.txt l.1), orquestrador (DECISAO-T13). Nenhuma = jurado-trc01-a/b/c.
- os 3 corpos listam por nome os inelegíveis (cadeira-a l.69-85: planejadores, API, críticos, pesquisador da PD, dev Claude e Codex, orquestrador, fábrica, a instância do dba-guardiao, porteiros 405/411/414, este inspetor, as outras 2 cadeiras, e obituário).
- veredito parcial: VERDE — sem colisão.

## 3.2 Competência × achados (hora do item NÃO medida — escrevi estimativa adiantada; janela real 23:42Z–23:54Z, ver correção no fim)
- comando: `sed -n '1632,1655p' PLANO_TRACCAR.md` (§8.10) → (a) RLS/unicidade/banco; (b) superfície/segredo; (c) contrato/atribuição. Emendas v2.2/v2.3 não mudam §8.10 (`grep -nE '8\.10|cadeira|MUT-|junta|quórum'` → só G-TRC-PD e G-TRC-NLB).
- conta das MUT por cadeira: (a) 8 = 04-06,12,34,35,40,41; (b) 16 = 01-03,15-19,28,30-33,37-39; (c) 17 = 07-11,13,14,20-24,36,42-45. União = 41 de 45. FORA de toda cadeira: **MUT-25** (nós→m/s), **MUT-26** (Traccar sem porta no host), **MUT-27** (SSE sem coordenada, regressão), **MUT-29** (fix inválido). O mínimo do próprio plano (§8.9 l.1580: 01-15, 17-22, 30-45) está todo coberto; 25/26/27/29 estão fora do mínimo por desenho do plano. MUT-26 e MUT-27 tocam regra do dono (porta pública) e dado de localização.
- veredito parcial: VERDE com NOTA nomeada (MUT-26/27 fora de cadeira; a cadeira (b) cobre "nenhuma porta fora de 127.0.0.1" pelo mandato).

## 2.1 / 2.2 / 2.3 Insumos (hora do item NÃO medida — escrevi estimativa adiantada; janela real 23:42Z–23:54Z, ver correção no fim)
- 2.1: ciclo 1 (sem ata anterior). Premissas de terceiros (relatório do dev, decisão T13, plano) entram como hipótese: corpos l."Nada entra como fato … Re-meça … herdar invalida o voto" (cadeira-b l.~118). VERDE.
- 2.2: N/A (ciclo < 4).
- 2.3: plano no ramo — `PLANO_TRACCAR.md` 1995 linhas (v2.1) + `PLANO_TRACCAR-EMENDA-v2.2.md` (224) + `-v2.3.md` (281) + `README.md` (ordem de leitura) + `B-TRC-01-dev.md` (672) + `B-TRC-01-DECISAO-T13.md` (61). §8.3 (permitido/proibido) l.1266, §8.8 bateria l.1525 com forma declarada ("suíte inteira nas duas formas canônicas do runner (sem banco; e com banco, como o job backend da CI)"), §8.9 MUT l.1574. Head nomeado nos mandatos (0cccacbc; o head 31cdd030 só soma os mandatos).
- LACUNA: nenhum mandato nem corpo declara o NÚMERO do ciclo (`grep -noiE 'ciclo'` nos mandatos → só "teto de 2 ciclos"; nos corpos "O mandato declara o ciclo"). Sem efeito na régua (ciclos 1 e 2 têm a mesma), mas o corpo o espera.
- LACUNA: a aprovação da migração aditiva pelo `agente-dba-guardiao` (§8.10 DoD; mandato l.49) NÃO existe na ref (`git grep -i dba-guardiao` só acha o checklist do comando l.147 desmarcado e o dev l.644 "não convocado por mim"). É item de DoD do merge, não pré-condição de start da junta.
- veredito parcial: VERDE com 2 ressalvas nomeadas (ciclo não declarado; dba-guardiao pendente).

## 1.2 Plano de isolamento (hora do item NÃO medida — escrevi estimativa adiantada; janela real 23:42Z–23:54Z, ver correção no fim)
- comando: leitura dos 3 mandatos l.56-60 → cada cadeira: "worktree proprio detached C:/Users/AMP/w-jtrc-{a,b,c}, npm ci proprio sem junction; Postgres e Redis descartaveis em container Linux proprio com prefixo jtrc01-{a,b,c}-, porta alta so em 127.0.0.1 testada antes, REDIS_URL proprio …, imagem do Traccar so por digest, docker compose down -v sempre com os --profile; nunca a base viva nem as portas do servidor do dono nem servidor publico de demonstracao; containers trc01-* e de outras cadeiras nao sao alvo; remocao so pelo nome, nunca prune". Escrita só nos 2 arquivos próprios em `votos/B-TRC-01/`; "ninguem roda ferramenta no worktree do dev".
- veredito parcial: VERDE.

## 5.1 Plano de perda de jurado (hora do item NÃO medida — escrevi estimativa adiantada; janela real 23:42Z–23:54Z, ver correção no fim)
- comando: `grep -niE 'queda|P3|voto perdido'` nos 3 corpos → seção "Quórum, ciclo, queda e PAUSA" (a l.110, b l.101, c l.109): "A junta não fecha com menos de 3 votos de mérito. Voto perdido nunca conta como aprovação. Queda (P3): a retomada é da mesma identidade, pelo mesmo mandato…"; quedas em `votos/B-TRC-01/00-quedas.md` pelo orquestrador (P6). Unanimidade 3/3 com veto declarada.
- veredito parcial: VERDE.

## 1.3 Resíduos no terreno (hora do item NÃO medida — escrevi estimativa adiantada; janela real 23:42Z–23:54Z, ver correção no fim)
- comando: `docker ps -a --format '{{.Names}} {{.Status}} {{.Ports}} {{.Image}}'` → 4 containers: `erp-postgres` e `erp-redis` (base viva do dono, Up — NÃO são alvo), `erp-postgres-alt` (Exited 255 há 3 semanas, 127.0.0.1:55432), `pastrack-teste-banco-teste-1` (Exited 0 há 2 semanas, outro projeto). **Zero** `trc01-*` (os do dev já não existem), zero `jtrc01-*`, zero `jur-*`/`crit-*`.
- comando: `docker network ls | grep -ciE 'trc|traccar|jtrc'` → 0; `docker compose ls -a` → só `erp_techsolutios` e `pastrack-teste` (nenhum projeto do Traccar de pé).
- comando: `docker images --digests | grep traccar` → `traccar/traccar` `sha256:03ebb7ed…51951eda` = o digest do `docker-compose.traccar.yml:45` e de `decisoes.md` (2 menções) no head. Imagem aprovada já em cache (economiza download; não é resíduo com privilégio).
- comando: `ls -d C:/Users/AMP/w-*` → w-03a, w-agapi2, w-arnes2, w-insp-03a, w-insp-trc01 (meu), w-planos, w-port424, w-pvpr, w-trc01. Nenhum `w-jtrc-*` pré-existente (os worktrees das cadeiras ainda não nasceram — terreno livre para eles). `w-03a`/`w-insp-03a` são da junta paralela (PR 425), não alvo. `w-port424` (detached 9566d55b) e `w-pvpr` (detached 0cccacbc, arnês do pré-voo) são resíduos do orquestrador, inertes para esta junta.
- comando: `git --no-optional-locks status --porcelain --ignored` em w-trc01 (sem ` M` fantasmas e sem node_modules) → só os meus 2 arquivos `??`; nenhum `dist/`, `coverage/`, `.env` ou artefato ignorado solto. `find … -name 'jur-probe*' -o -name '*-probe.ts' -o -name '*probe*.mjs'` → nada.
- comando (PowerShell): `Get-CimInstance Win32_Process | ? CommandLine -match 'w-trc01|w-jtrc|jtrc01|trc01-'` → `processos=0`. Nenhum processo vivo no worktree do dev.
- veredito parcial: VERDE (resíduos inertes de outros contextos: erp-postgres-alt e pastrack exited; w-port424/w-pvpr detached — nota, não ressalva).

## 4.2 Baseline no head, árvore limpa (hora do item NÃO medida — escrevi estimativa adiantada; janela real 23:42Z–23:54Z, ver correção no fim)
- terreno: w-insp-trc01 (detached 31cdd030), `npm ci --no-audit --no-fund` próprio (sem junction) → ec=0, 326 pacotes (aviso EBADENGINE de dependência pede node ≥22; rodou em node v20.19.5, o mesmo aviso que a CI tolera).
- comando: `DATABASE_URL='postgresql://u:p@127.0.0.1:1/x' npx prisma generate` (variável só no env, porta 1 inexistente — nenhum banco tocado) → ec=0.
- comando: `npm run check > check.txt 2>&1; ec=$?` → **ec=0** (`tsc -p tsconfig.json --noEmit`, zero diagnóstico). `lint` = `npm run check` (package.json).
- comando: `git status --porcelain` em w-insp-trc01 depois → vazio (nada mutado pelo baseline).
- extra: `git diff --check 9566d55b 31cdd030` → ec=0; `git diff --name-only 9566d55b 31cdd030 | wc -l` = 67 (63 do mandato + 4 mandatos); `grep -c '^Kpis/'` = 0.
- veredito parcial: VERDE — baseline honesto, medido antes de qualquer jurado.

## 1.1-bis Arquivos centrais no worktree do dev × blob do head (hora do item NÃO medida — escrevi estimativa adiantada; janela real 23:42Z–23:54Z, ver correção no fim)
- comando: laço `git show HEAD:<f> | tr -d '\r' | md5sum` × `tr -d '\r' < <f> | md5sum` em w-trc01 para `src/integrations/traccar/**` (13), as 2 migrações, `prisma/schema.prisma`, `src/database/rls.ts`, `src/server.ts`, `src/config/env.ts`, `docker-compose.traccar.yml`, e os 2 testes do ratchet T13 → `centrais=21 divergentes_eol_neutro=0`.
- veredito parcial: VERDE — nenhuma mutação viva nos arquivos centrais.

## Insumos da decisão T13 (hora do item NÃO medida — escrevi estimativa adiantada; janela real 23:42Z–23:54Z, ver correção no fim)
- comando: `grep -nE '109|111|115|118' docs/revisoes/TRACCAR/B-TRC-01-DECISAO-T13.md` → l.42 (109), l.47 ("para 111 nos três números"), l.54 (CI vermelho em d77a9e32 no T14a/b), l.61 ("o literal passa de 115 para 118. As cadeiras (a) e (c) julgam se o papel de runtime DEVE ter DML na traccar_quarantine_items"). No head: `tests/san3-05-acessos-de-plataforma-guard.test.ts:241` (`ENABLE=111 FORCE=111 … FORCE=111`) e `tests/san3-05-runtime-role-guard-db.test.ts:1013` (`…|118$`).
- veredito parcial: insumo PRESENTE na ref; o mérito (L0 +2, tabelas_com_dml +3) é das cadeiras (a) e (c), e o autor da decisão (orquestrador) está na lista de inelegíveis.

## Re-medição final antes do veredito (23:53:54Z, medido)
- comando: `gh pr view 426 --json headRefOid,state` → `31cdd0300b653b50b9ebd795c294ccdb37442491 OPEN` (head não andou).
- comando: `gh api …/commits/31cdd030…/check-runs --jq '[.total_count, ([…select(.status!="completed" or .conclusion!="success")]|length)]'` → `14	0`.

## Correção de hora (23:53:45Z, medido)
- Os cabeçalhos dos itens de 4.3 em diante traziam horas que eu ESTIMEI e não medi (iam até "00:13Z"); `date -u` às 23:53:45Z provou que estavam adiantadas. Substituí-as pela janela real medida: o item 1.1 foi gravado às 23:42:31Z e a última gravação antes da correção às ~23:53Z. O conteúdo dos itens (comandos e saídas) não muda.

## Limpeza (23:54:17Z, medido)
- `git worktree remove --force C:/Users/AMP/w-insp-trc01` → ec=0; `ls -d` → não existe; `git worktree list | grep -c w-insp-trc01` → 0. Junto saíram o `node_modules` e o client Prisma gerados nele.
- Um `du -sh node_modules` meu (tarefa em segundo plano parada pelo TaskStop) sobreviveu como órfão (PID 18528): encerrado por PID depois de conferir a linha de comando. O outro `du` vivo (PID 28320, `/c/Users/AMP/w-insp-03a/node_modules`) é da junta paralela e não foi tocado.
- Arquivos temporários meus no scratchpad (sync-check, ca, aa, refs, dec, cl, npmci, gen, check) removidos pelo nome → 0 restante. `/tmp/ca.txt` (criado por engano) removido → não existe.
- Nenhum container, rede ou volume criado por mim. Base viva (`erp-postgres`, `erp-redis`) e portas do dono não tocadas. Disco: 16G livres.
- No worktree do PR (w-trc01) escrevi SÓ `insp-trc01-evidencia.md` e `insp-trc01-parecer.md`. O meu `git status` inicial (sem `--no-optional-locks`) pode ter regravado o stat-cache do índice de w-trc01. É metadado do índice, não conteúdo.
