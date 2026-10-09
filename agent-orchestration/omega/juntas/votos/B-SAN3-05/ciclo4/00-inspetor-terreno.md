papel: inspetor-de-terreno-da-junta · modelo: Claude Opus 5.5 (claude-opus-5-5), substituição declarada §C7.6-bis — Fable só em bloco de dinheiro (decisão do dono 2026-10-08), este bloco não toca dinheiro · mandato_md5: 7c4abde86fe3de0420457a901ab95419 · corpo_md5 (EOL-neutro, origin/main a9bbde38): de80b2a9d4fc7edd7b9a26e2d601f97d

# Parecer — Inspeção de terreno — junta 4 do B-SAN3-05 (PR 405, ciclo 4)

- Aberto: 2026-10-09T19:14Z
- Fechado: 2026-10-09T19:28Z (`date -u`)
- Veredito: **LIBERADO COM RESSALVA** (R1–R4 na seção Veredito)
- Forma: cada item registra comando → saída resumida → veredito parcial, gravado ao ser medido (P1/P2).

## 0. Identidade e insumos
- Objeto julgado por esta inspeção: `2400049bf8ec421c3f65a07884c6394d4ab208bc` (head do PR 405 por `gh pr view` e por `git ls-remote`; re-resolvido no fim, 19:27Z por `date -u`: igual); `origin/main` = `a9bbde382213627545e9d229c9ab616d83a0a840` (fetch 19:14Z).
- Corpo do inspetor: `git show origin/main:.claude/agents/inspetor-de-terreno-da-junta.md | tr -d '\r' | md5sum` = `de80b2a9d4fc7edd7b9a26e2d601f97d` (= o esperado no disparo; 164 linhas), lido inteiro.
- Mandato: `git -C C:/Users/AMP/w-o05 show HEAD:agent-orchestration/omega/juntas/votos/B-SAN3-05/00-mandatos/inspetor-c4.md | tr -d '\r' | md5sum` = `7c4abde86fe3de0420457a901ab95419` (= o esperado; 70 linhas; pré-voo OK no head `737e8cf3` às 19:03Z segundo o próprio arquivo; HC→H0: o head andou para `2400049b`, delta só registro — 4.3).
- Lidos como roteiro (não como fato): plano `docs/revisoes/SAN3/B-SAN3-05-plano.md` §"Ciclo 4" (l.2167-2355), `ciclo4/DEV-relatorio.md` (215 linhas), `ciclo4/FABRICA-relatorio.md` (72 linhas — **11** divergências numeradas, não 9 como diz o mandato; a 10 está superada pelo `2400049b`, ver 2.1), ata `J-B-SAN3-05.md`, `R-B-SAN3-05-3.md`, `decisoes.md` (R3/R4 l.3003-3011, `D-405-PROIBIR-VIEWS` l.3013-3020), os três corpos das cadeiras e os mandatos `C1c4`/`C2c4` em preparo.
- Ambiente: Git Bash (MSYS) no Windows 11 + Docker Desktop (WSL2). Nenhuma variável exportada; `MSYS_NO_PATHCONV=1` só como prefixo por comando. Escrevo só este arquivo no `w-o05`; meu worktree `C:/Users/AMP/w-insp405c4` (detached) e container `insp405c4-node`.

## 1. Isolamento (1.1 head e árvore · 1.2 plano de isolamento · 1.3 resíduos)
### 1.1 Head e árvore
- Objeto resolvido por mim: `2400049bf8ec421c3f65a07884c6394d4ab208bc` (head do PR = `ls-remote`; ver 4.3). Plano do ciclo (C4.6): "objeto = head do dev empurrado com check-runs concluídos". Cadeia do ciclo 4 sobre o disparo `37c83064` (`git merge-base --is-ancestor 37c83064 2400049b` → 0): `7c63f920` plano · `a10fc267` esqueleto · `afb575b4` fix · `d66eb178`/`941c9ea7`/`2fee8d28`/`737e8cf3` evidência e registro do dev · `2400049b` registro do orquestrador (fora do escopo do dev por desenho; só corpos, ata, R-3, fábrica e mandato — 0 arquivo de `src/`, `tests/`, `scripts/`).
- Meu worktree: `git worktree add --detach C:/Users/AMP/w-insp405c4 2400049b` → `rev-parse HEAD` = `2400049b…`; `git status --porcelain | wc -l` = **0**.
- Worktree do orquestrador `C:/Users/AMP/w-o05` (HEAD `2400049b`): `git status --porcelain` = 37 linhas — **33 ` M`** e 4 `??`. `git diff --quiet; echo $?` = **0** e `git diff --name-only | wc -l` = **0**: os 33 ` M` são fantasmas de stat-cache sob `core.autocrlf=true` (conteúdo idêntico ao índice), não mutação viva. Os 4 `??`: `00-mandatos/C1c4.md`, `00-mandatos/C2c4.md` (mandatos das cadeiras em preparo pelo orquestrador, não versionados), este parecer, e `scratchpad/` (278 arquivos de 08/10 do planejador do ciclo 2 — `pl05c2`, `pl05c2s`; inerte, ver 1.3).
- Veredito parcial: VERDE. Nenhum arquivo rastreado do objeto difere do blob; jurado nenhum julga a partir do `w-o05` (C4.6: um worktree por cadeira).
### 1.2 Plano de isolamento declarado
- Plano C4.6 (blob do objeto, l.2319-2320): "mandato forma A com pré-voo, HC = H0; P1–P7; máx. 3 itens; uma cadeira por vez no Claude; prefixos `j05c4-c1-/c2-/c3-`, sem porta no host".
- Corpos das 3 cadeiras no objeto (`grep -nE 'w-j05c4|j05c4-c[123]-|erp-postgres'`): cada um declara **worktree próprio detached** (`C:/Users/AMP/w-j05c4c1`, `w-j05c4c2`, `w-j05c4c3`; sufixo `b` se o caminho existir), `npm ci` próprio e **junction proibida**; **containers próprios** com o prefixo da cadeira, **rede própria sem porta publicada no host** (C2 ainda `j05c4-c2-b7-pg` com `log_statement=all`; C3 `j05c4-c3-redis` só para a suíte, processo `src/server.ts` dentro do container); **`erp-postgres` (5432), `erp-redis` (6379) e `erp-postgres-alt` (55432) nunca alvo, nem de leitura**; senha só por ambiente; remoção só pelo nome, contagem de processos vivos antes de remover o worktree.
- Mandatos das cadeiras em preparo no `w-o05` (não versionados ainda — `C1c4.md` md5 EOL-neutro `d5848406ab33b7aa0aa192a6328e590c`, `C2c4.md` `bfeb025fa6154f817436a42c03104712`; pré-voo OK no head `2400049b` às 19:15Z segundo o próprio arquivo) repetem o terreno: worktree `w-j05c4c1`, container `j05c4-c1-`, "a base viva erp-postgres e erp-redis e as portas 5432 e 6379 nunca alvo", "nunca volume prune (há volumes órfãos de outras sessões)". O de C3 (`C3c4.md`) não estava no `git status` da primeira medição (perto de 19:14Z) e apareceu depois: md5 EOL-neutro `833b319da996789e790aa2428f55733d`, pré-voo OK no head `2400049b` às 19:15:35Z segundo o arquivo, com worktree `w-j05c4c3` e prefixo `j05c4-c3-`. Os três mandatos declaram o mesmo terreno.
- Veredito parcial: VERDE para o plano escrito (plano + corpos commitados). Os corpos medem o mandato pelo disco (`tr -d '\r' < <mandato> | md5sum`); se os mandatos forem versionados num head novo, vale a R4 do Veredito.
### 1.3 Resíduos no terreno
- `docker ps -a` → 4 containers, todos parados e nenhum de jurado: `erp-postgres` (Exited 255, 29 h — base viva DESLIGADA), `erp-redis` (Exited 255, 29 h), `erp-postgres-alt` (Exited 255, 3 semanas), `pastrack-teste-banco-teste-1` (outro projeto). Contagem por prefixo `^(jur|crit|j05c4|dv05c4|pl05c4|insp|pg16r)` = **0**; o dev usou `dev05c4-` (divergência 8 da fábrica): `grep -c 'dev05c4\|dv05c4'` = **0** containers e 0 worktrees — o teardown que o `DEV-relatorio.md` declara (l.189-193) confere no terreno. Redes: `bridge`, `erp_techsolutions_local`, `host`, `none`, `pastrack-teste_default` — nenhuma de rodada.
- `docker volume ls` → 20 volumes; `-f dangling=true` → **18 anônimos órfãos** (hash de 64 hex) de sessões anteriores. **Reportados, não apagados** (mandato). Inertes; não colidem com nenhum prefixo das cadeiras. Os 2 nomeados `erp_techsolutios_erp_postgres_data`/`_redis_data` são da base viva.
- Imagem `erp-junta-node20-pg16:local` (`4203157f95ea`, 4 dias) presente; receita `C:/Users/AMP/erp-terreno/` (ver 4.2).
- Worktrees (`git worktree list`): principal `a9bbde38 [main]`, `.claude/worktrees/{b04a,b11,gov-descuido}`, `w-06b`, `w-mandato`, `w-o05`, `w-pvnuv`, `w-pvpr` (detached `2400049b` — pré-voo do orquestrador), `w-pvreg`, e o meu `w-insp405c4`. **Nenhum** `w-j05c4c*` (`ls -d` → inexistente: os caminhos das cadeiras estão livres) e nenhuma árvore `C:/Users/AMP/t-*` (resto de receita) no disco.
- Sondas rastreadas no objeto (`git ls-files | grep -ciE 'jur-probe|-probe\.ts$'`) = **0**. No `w-o05`, `scratchpad/` não rastreado (278 arquivos, 08/10, `pl05c2`/`pl05c2s` do planejador do ciclo 2): sondas `.sh` e logs inertes; as URLs com credencial nele (`grep -rhoE`) são só `${PGPW…}`, `<48 chars>` (já redigida), `u:p` e `unused:unused` — nenhum segredo real.
- Disco `df -h /c`: **11 GB livres** (96% usado). Acima do piso de ~2 GB dos corpos, mas uma suíte inteira (C3) + 3 `npm ci` em worktrees de cadeira consomem vários GB: o orquestrador deve medir entre cadeiras (C4.6 já manda uma por vez).
- Veredito parcial: VERDE com **ressalva inerte** — 18 volumes Docker órfãos e o `scratchpad/` do ciclo 2 no `w-o05` (nenhum com privilégio, nenhum alvo de cadeira); disco 11 GB a vigiar.
### 1.1-bis Arquivos centrais no worktree do dev × blob
- No `w-o05`, md5 EOL-neutro disco × `git show 2400049b:<f>` e `git hash-object <f>` × `git rev-parse 2400049b:<f>`: `src/database/runtime-role.ts` `9efee03d…` = `9efee03d…` (hash igual) · `scripts/db-runtime-role.sh` `5cab4f63…` = `5cab4f63…` (hash igual) · `tests/san3-05-runtime-role-guard-db.test.ts` `57ab4744…` = `57ab4744…` (hash igual) · `tests/db-catalog-write-guard.test.ts` `2f1333c8…` = `2f1333c8…` (hash igual) · `docs/deployment.md` `1f700ff1…` = `1f700ff1…` (hash igual).
- Veredito parcial: VERDE — nenhuma mutação viva nos arquivos que o ciclo 4 mudou.

## 2. Insumos do briefing (2.1 ata anterior · 2.2 auditoria ciclo 3 · 2.3 plano do ciclo)
### 2.1 Ata do ciclo anterior e afirmações herdadas
- `git diff 737e8cf3 2400049b -- agent-orchestration/omega/juntas/J-B-SAN3-05.md` → +27 linhas: seção "Ciclo 3 — junta 3 (2026-10-09)" com veredito REPROVADO pela C1 (`jurado-san305-c3-trava-de-views`: C1-c3-01, C1-c3-02 graves; notas C1-c3-03/04), C2 e C3 não votaram por decisão do dono, e as respostas (a)(b)(c) do §C7.4-bis. `R-B-SAN3-05-3.md` (8 linhas) existe no objeto. A divergência 10 da fábrica ("ata só até o ciclo 2, sem R-3") está **superada** pelo `2400049b`.
- Os três corpos no objeto marcam a trilha como roteiro: `grep -c 'RE-VERIFICAR'` = 1 em cada, `grep -ci roteiro` = 6/5/4, e cada um tem "**Nada entra como fato.** Cada número, SHA, linha e trecho do plano, do relatório do dev, do parecer do inspetor, do corpo do PR e deste corpo é **hipótese**" (C1 l.150, C2 l.144, C3 l.143). O C1 manda o vermelho-controle de discriminação contra o head do disparo (não herda "C1-c3-01/02 reproduzem").
- Os mandatos em preparo (C1c4/C2c4) dizem "queda relança a mesma identidade, que não herda conclusão" e mandam o mérito por execução.
- Veredito parcial: VERDE. Nenhuma conclusão da junta 3, do plano ou do dev chega às cadeiras como fato.

### 2.2 Auditoria da máquina (ciclo ≥ 4)
- O corpo do inspetor (2.2) exige `R-<entrega>-ciclo3-auditoria.md` no ciclo ≥ 4. `ls agent-orchestration/omega/reprovacoes/ | grep SAN3-05` → só `R-B-SAN3-05-1.md`, `-2.md`, `-3.md`: **não há** arquivo de auditoria.
- Norma da ref julgada: `git show 2400049b:CLAUDE.md` l.627 — §C7 item 8(2): "A auditoria obrigatória da máquina no ciclo 3 (`D-SEM-TETO-AUDITORIA-NO-3`) deixa de ser obrigatória", e o item 8 declara que "onde divergir de … §C7.1-bis, §C7.4 … vale este item". `CLAUDE.md` do objeto = `origin/main` (md5 EOL-neutro `a9419a55a77ea2adfd61a6ce80e77a27` nos dois).
- Veredito parcial: **NÃO SE APLICA** (§A7 / item 3.3 do corpo: cláusula revogada na ref julgada não bloqueia). Sem ressalva.

### 2.3 Plano do ciclo
- `docs/revisoes/SAN3/B-SAN3-05-plano.md` no objeto: 2355 linhas (= o medido no mandato); seção "## Ciclo 4" (l.2167-2355): C4.1 vermelho-controle no `37c83064`; C4.2 propriedade e trechos; C4.3 testes e mutações M4a/b/c; **C4.4 PERMITIDO/PROIBIDO com caminhos exatos**; **C4.5 bateria com forma declarada** (container, `timeout` 600/900/2400 s, N de linha de base 12·12·35·13·5, D0–D10); C4.6 junta, cadeiras, inelegíveis, reprovação por construção, papéis, rollback.
- Head: o plano nomeia o objeto do planejador (`37c83064`) e define o da junta como "head do dev empurrado com check-runs concluídos" — resolvido em 4.3 (`2400049b`, delta de `737e8cf3` só registro).
- Decisões citadas, medidas **no objeto** (`decisoes.md`): `D-405-PROIBIR-VIEWS` obj=1 (l.3013) / origin/main=0; leitura R3 obj=1 (l.3004) / main=0; R4 obj=1 (l.3009) / main=0; `D-FABLE-ASTRA-SO-DINHEIRO` obj=2 / main=1. As três normas do ciclo existem **na ref julgada** e ainda não na `main` (o ramo não mergeou) — as cadeiras têm de medir no objeto, não na `origin/main` (o C1 manda isso; ver 3.3).
- Veredito parcial: VERDE.

## 3. Papéis (3.1 inelegibilidade · 3.1-bis obituário · 3.2 competência · 3.3 corpo carregado × julgado)
### 3.1-bis Obituário (fonte primeira)
- `OBITUARIO-IDENTIDADES.md` no objeto e na `origin/main`: 301 linhas nas duas; 34 `SEPULTADA`, 7 `RESERVADA`. `grep -c` de cada nome novo (`jurado-san305-c4-catalogo-de-views`, `-c4-credencial-arnes-escopo`, `-c4-boot-e-suite`) = **0**; `grep -ciE 'san305|SAN3-05|c4-catalogo|c4-credencial|c4-boot'` = **0** nas duas refs.
- Veredito parcial: VERDE (nenhum dos três sepultado nem reservado para outra junta).

### 3.1 Inelegibilidade por nome
- `git grep -l <nome>` no objeto, fora de `.claude/agents` e `.agents/agents`: os três nomes aparecem **só** no plano (C4.6, designação), no `ciclo4/FABRICA-relatorio.md` e no meu mandato — nunca como votante, achador, planejador ou dev. Nas atas `J-*.md`, em `omega/reprovacoes/` e em `docs/juntas/`: **0** ocorrências de cada. Na `origin/main` inteira: **0** de cada.
- Lista de inelegíveis do C4.6 (l.2328-2333): `agente-dba-guardiao`, `agente-secops`, `guardiao-fail-closed`, `jurado-san305-c2-*` (3), `jurado-san305-c3-*` (3), inspetores 1–3, `critico-b-san3-05`, os planejadores e os devs. Nenhum coincide com os três nomes novos (prefixo `c4-` distinto, competências declaradas nos corpos). Os corpos repetem a lista e acrescentam a `agente-fabrica`, o orquestrador, as outras duas cadeiras e **o inspetor desta junta** (eu não voto).
- Especialistas não rastreados de nome parecido na árvore principal (`git status --porcelain --ignored -- .claude/agents .agents/agents`): 31 corpos (`jurado-06-*`, `jurado-07b-*`, `jurado-c5-*`, `jurado-mandato-*`, `jurado-o6r04a-*`, `jurado-o6r11-*`, `jurado-san3-01c2-*`, `medidor-de-cobertura-do-artefato`, `suplente-critico-c5-adversarial`) — **nenhum** `san305` nem `c4-`. Sem colisão de nome.
- Veredito parcial: VERDE.

### 3.2 Competência × achados
- Achados em julgamento: C1-c3-01/02 (privilégio de coluna em view → leitura/escrita entre organizações) e a regra nova `D-405-PROIBIR-VIEWS`; sinal de não-convergência = cobertura do `pg_depend` pelo `view_walk`. **C1** (`catalogo-de-views`) cobre: PostgreSQL 16, views/matviews, `pg_rewrite`/`pg_depend`, FORCE RLS, privilégio tabela × coluna, com forma própria obrigatória. **C2** cobre B1 (senha/SCRAM no log), B2 (arnês N=3) e escopo. **C3** cobre boot de produção real e suíte inteira.
- Veredito parcial: VERDE — toda classe em julgamento tem cadeira.

### 3.3 Corpo carregado × corpo julgado
- md5 EOL-neutro no objeto (`git show 2400049b:<corpo> | tr -d '\r' | md5sum`), `.claude/agents/especialistas/`: C1 `45b6126fee088767c15f736f0b1c717e` (562 linhas) · C2 `3363eb094cdf49a3534a73321b7d1d2f` (516) · C3 `093e4690131a30b24c3e30ec2751252a` (487). **Conferem** com os md5 do disparo (C1 45b6…, C2 3363…, C3 093e…). O espelho `.agents/` difere em md5 (`f6e0b15b…`, `4b34813d…`, `2c86c959…`) só pelo cabeçalho Codex — `diff` do C3: sai a linha `tools:` e entra o bloco "Papel para o Codex"; o resto verbatim (é a transformação do `sync-agent-agents.mjs`, ver 4.1).
- Diretório de agentes da SESSÃO (árvore principal `a9bbde38`): `ls .claude/agents/especialistas | grep -iE 'san305|c4'` → **vazio**, idem `.agents/`. As cadeiras **não** podem ser carregadas por nome; os mandatos em preparo já declaram o disparo como `general-purpose` com o corpo tirado do blob do objeto e "se o md5 EOL-neutro do corpo recebido divergir do publicado no disparo a cadeira não vota". Portanto o corpo carregado é o colado pelo orquestrador: ele tem de ser o blob do `2400049b` (md5 acima) — o corpo manda a cadeira declarar os dois md5.
- Normas citadas pelos corpos (§A1, §A1.1, §A2, §A7, §C4, §C5, §C7, §C7.1-bis, §C7.1-ter(a)(b)(c), §C7.4-bis, §C7.5, §C7.6-bis, §C7.7/P7, §C7 item 8(1)(2)(5), `D-MEDIR-NA-REF-ALVO`, `D-PAUSA-GRAVA-E-PARA`): todas presentes no `CLAUDE.md` do objeto (`grep -nE` — 1-ter l.361, 1-bis l.393, 4-bis l.450, 6-bis l.480; demais com N ≥ 1). Nenhuma cláusula inexistente (nenhum `§C7.1-quater` ou similar). `D-405-PROIBIR-VIEWS`, R3 e R4 vivem em `decisoes.md` **do objeto** (não na `main` ainda) — os corpos mandam conferir no objeto: correto pelo §A7.
- Veredito parcial: VERDE, com **nota para o disparo**: lançar cada cadeira como `general-purpose` com o corpo do blob `2400049b` e o md5 declarado no prompt; divergência no corpo de quem tem veto = cadeira não vota.

## 4. Fatias (4.1 S0 espelho · 4.2 baseline · 4.3 check-runs)
### 4.3 Objeto com check-runs concluídos
- `gh pr view 405 --json headRefOid,state,isDraft,mergeable` → head do PR = `2400049bf8ec421c3f65a07884c6394d4ab208bc`, OPEN, rascunho, CONFLICTING; `git ls-remote origin refs/heads/fix/runtime-role-sem-bypass` = o mesmo SHA.
- O mandato mediu `737e8cf3` às 19:02Z; o orquestrador empurrou `2400049b` depois (o commit que traz o próprio mandato). `git diff --name-status 737e8cf3 2400049b` = 10 arquivos, todos de registro/corpos (6 corpos `jurado-san305-c4-*` nos dois espelhos, `J-B-SAN3-05.md`, `00-mandatos/inspetor-c4.md`, `ciclo4/FABRICA-relatorio.md`, `R-B-SAN3-05-3.md`) — nenhum em `src/`, `tests/`, `scripts/`, `prisma/`. O código julgado é o mesmo nos dois SHAs.
- `gh api repos/thiagodorgo/ERP_Techsolutios/commits/<sha>/check-runs`:
  - `2400049b`: total=7 — docker, owner-portal, authority-portal, flutter, backend-postgres, frontend, backend — todos `completed | success` (último: docker 19:13:57Z).
  - `737e8cf3`: total=7 — os mesmos 7, todos `completed | success` (docker 18:41:59Z).
- Veredito parcial: VERDE. Objeto da junta = `2400049b` (head do PR), com 7/7 concluídos e verdes, inclusive o job docker. Fato conferido: "dev empurrou 737e8cf3 com CI 7/7; orquestrador acrescentou 2400049b, CI 7/7" — CONFERE.
### 4.1 Fatia S0 — espelho Codex
- `timeout 60 node scripts/sync-agent-agents.mjs --check` no meu worktree (objeto `2400049b`, árvore limpa) → **ec=0**, "`[agents-sync] OK — 42 agentes, espelho consistente.`"; `git status --porcelain | wc -l` depois = 0 (o `--check` não escreveu).
- Recursivo: `git ls-files .claude/agents | grep -c '\.md$'` = 42, `.agents/agents` = 43 (42 + `README.md`); `especialistas/` 19 = 19; `diff` dos conjuntos de nomes (sem o README) → vazio (ec=0). Os três `jurado-san305-c4-*` rastreados nos **dois** espelhos (entraram no `2400049b`, `git diff --name-status 737e8cf3 2400049b` = 6 `A`).
- Veredito parcial: VERDE.
### 4.2 Baseline honesto, medido agora
- Terreno: container `insp405c4-node` (imagem `erp-junta-node20-pg16:local` `sha256:4203157f95ea`; `node v20.20.2`, `npm 10.8.2`, `psql 16.14`; `uname` Linux 6.18.33.2-microsoft-standard-WSL2), sem porta, sem banco (o `check` não usa banco). Árvore do objeto por `git -c core.autocrlf=false archive 2400049b` em `/c/Users/AMP/t-insp405c4`: `blobs=3770 byte_identicos=3770` (`git hash-object --no-filters` × `ls-tree`); `md5sum -c --quiet` de 3770 arquivos dentro do container → ec=0, 0 divergência; árvore temporária removida (`ls -d` → inexistente).
- `npm ci --no-audit --no-fund` → ec=0 ("added 326 packages in 21s"); `npx prisma generate` (DATABASE_URL fictícia `nobody:nobody@127.0.0.1:1`, só no ambiente) → ec=0 (Prisma Client v7.8.0).
- `npm run check > check.log 2>&1; ec=$?` → **ec=0** (`tsc -p tsconfig.json --noEmit`, 0 erro).
- Vermelho-controle: apenso `export const __insp405c4_ctl: number = "nao-numero";` a `/work/src/database/runtime-role.ts` (só no container, `.pristino` antes; `diff` = 3 linhas) → `npm run check` **ec=2**, `src/database/runtime-role.ts(163,14): error TS2322`. Restauro por `cp` do `.pristino`: md5 container `9efee03db097f54e73178e1ec4c740d9` = `git cat-file blob 2400049b:src/database/runtime-role.ts | md5sum` `9efee03d…`; `npm run check` de novo → ec=0.
- Terreno das cadeiras disponível: `postgres:16` (`sha256:be01cf82fc7d`), `redis:7` (`sha256:b2b95679e3b4`) e a imagem da receita presentes; `receita-pg16.sh` md5 EOL-neutro `9861a2aaa55fc49fcf1c4263261a3668` (= o citado no C4.1); `TERRENO-PG16.md` `457291dd…` (§6 declara que a receita derruba tudo no `trap EXIT` — os corpos mandam condutor próprio).
- Veredito parcial: VERDE (baseline verde e não-vácuo).

## 5. Quórum e PAUSA (5.1)
### 5.1 Plano de perda de jurado, quórum e PAUSA
- Nos três corpos (`grep -c`, 1 em cada): "Queda por infra relança a MESMA identidade, você (P3)" (re-executa o registrado e mede a cauda), "Voto perdido **nunca** conta como aprovação", "A junta não fecha com menos de 3 votos de mérito", "Unanimidade de 3, com veto"; P7 com a seção `## PAUSA <hora UTC>` (3 ocorrências em cada) e quedas registradas pelo orquestrador em `votos/B-SAN3-05/ciclo4/00-quedas.md` (P6). Sem suplente nomeado (`grep -ci suplente` = 0): a perda se resolve relançando a mesma identidade — plano declarado e coerente com o C4.6 ("uma cadeira por vez no Claude", dentro do P5).
- Quórum medido na ref julgada: §C7 item 8(1) (junta completa em segurança/permissão, unanimidade) e 8(2) (do ciclo 3 em diante só defeito grave de produto bloqueia) no `CLAUDE.md` do objeto = `origin/main`. Leitura R3/R4 em `decisoes.md` do objeto (registrada como conflito §A2 e leitura adotada, não como decisão do dono) — os corpos a copiam verbatim e a aplicam; os mandatos `C1c4`/`C2c4` também.
- Segredo no tabuleiro: `git diff $(git merge-base origin/main HEAD) HEAD | grep '^+'` → URLs com credencial só `erp:erp`, `postgres:postgres`, `same_role:same_role` (dev local/fixture), `erp_runtime:local-prod-validation-db-runtime-not-a-secret`, `<senha>`, `<aleatória>`; hash SCRAM completo = 0; `PGPASSWORD=` com valor = 0; senha hex ≥ 40 = 0. Nenhum segredo real.
- Veredito parcial: VERDE.

## Veredito
**LIBERADO COM RESSALVA** — junta 4 do B-SAN3-05 (PR 405, ciclo 4), objeto `2400049bf8ec421c3f65a07884c6394d4ab208bc`.

Nenhum item bloqueia: objeto com 7/7 check-runs concluídos e verdes (inclusive `docker` e `backend-postgres`); delta `737e8cf3..2400049b` só registro; árvore limpa e arquivos centrais do dev = blob; baseline `npm run check` ec=0 com vermelho-controle ec=2; S0 `sync-agent-agents.mjs --check` ec=0 (42, recursivo); três corpos commitados nos dois espelhos com os md5 do disparo; inelegibilidade e obituário limpos; isolamento, perda e PAUSA declarados; auditoria do ciclo 3 não exigida pela ref julgada (§C7 item 8(2)).

**O que esta inspeção libera, por cadeira** (o que cada corpo manda conferir na legalidade):

| cadeira | identidade | corpo no objeto, md5 EOL-neutro (`.claude/`) · espelho `.agents/` | worktree | containers |
|---|---|---|---|---|
| C1 | `jurado-san305-c4-catalogo-de-views` | `45b6126fee088767c15f736f0b1c717e` · rastreado (`f6e0b15b…`, cabeçalho Codex) | `C:/Users/AMP/w-j05c4c1` (livre) | `j05c4-c1-*`, rede própria, sem porta |
| C2 | `jurado-san305-c4-credencial-arnes-escopo` | `3363eb094cdf49a3534a73321b7d1d2f` · rastreado (`4b34813d…`) | `C:/Users/AMP/w-j05c4c2` (livre) | `j05c4-c2-*` (inclusive `j05c4-c2-b7-pg`), sem porta |
| C3 | `jurado-san305-c4-boot-e-suite` | `093e4690131a30b24c3e30ec2751252a` · rastreado (`2c86c959…`) | `C:/Users/AMP/w-j05c4c3` (livre) | `j05c4-c3-*` (inclusive `j05c4-c3-redis`), sem porta |

**Ressalvas — para o briefing, em destaque:**

- **R1 — resíduo alheio, inerte (reportado, não varrido).** 18 volumes Docker anônimos órfãos (`docker volume ls -f dangling=true`) e `C:/Users/AMP/w-o05/scratchpad/` (278 arquivos de 08/10, `pl05c2`/`pl05c2s`, sem segredo real). Nenhum com privilégio, nenhum colide com `j05c4-`. Cadeira nenhuma faz `volume prune`.
- **R2 — disco.** 11 GB livres em `C:` (96% usado). Cada cadeira faz `npm ci` próprio e sobe containers; a C3 roda a suíte inteira. Uma cadeira por vez (C4.6) e o livre medido entre cadeiras; os corpos param abaixo de ~2 GB.
- **R3 — disparo por `general-purpose`.** O diretório de agentes da sessão (árvore principal `a9bbde38`) não tem nenhum `jurado-san305-*`: as cadeiras não carregam pelo nome. Colar no prompt o corpo do blob `2400049b` e declarar o md5 acima; corpo recebido com md5 diferente = a cadeira não vota (os mandatos já dizem isso).
- **R4 — objeto que andar.** Liberei `2400049b`. Se este parecer e os mandatos `C1c4`/`C2c4`/`C3c4` (hoje não versionados, pré-voo OK em `2400049b`) forem commitados num head novo, cada cadeira publica `git diff --name-only 2400049b <objeto>` (só registro) e só começa com os check-runs do head novo **concluídos** (ausente, `queued`, `in_progress` ou `cancelled` = não começa).

**Notas (não ressalvas):** o relatório da fábrica tem **11** divergências numeradas (o mandato diz nove); a 10 está superada pelo `2400049b`; as leituras 1–3 ficaram para o orquestrador e os mandatos adotam a R4 dos corpos. A R3/R4 está em `decisoes.md` como conflito registrado (§A2) e leitura adotada, não como decisão do dono; `D-405-PROIBIR-VIEWS`, R3 e R4 existem só no objeto (ainda não na `main`): as cadeiras conferem no objeto (§A7).

## Limpeza
Criado para medir e derrubado, pelo nome: container `insp405c4-node` → `docker rm -f -v` ec=0 (sem montagem; `docker ps -a --filter name=insp405c4` = 0, redes `insp405c4` = 0, volumes órfãos seguem 18 — nenhum meu); árvore temporária `/c/Users/AMP/t-insp405c4` removida (`ls -d` → inexistente); worktree `C:/Users/AMP/w-insp405c4` → processos vivos com o caminho = 0, `git worktree remove --force` ec=0, `git worktree list | grep -c insp405c4` = 0; arquivos auxiliares no scratchpad da sessão apagados ao fim. Base viva (`erp-postgres`, `erp-redis`, 5432/6379/55432) nunca tocada. No `w-o05`, o único arquivo escrito é este parecer (não commitado). Disco: 11 GB livres no início e no fim.
