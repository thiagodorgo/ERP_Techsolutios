# Parecer do inspetor de terreno, J-B-AV-REAL (PR #477)

Papel: `inspetor-j-avreal` (corpo `inspetor-de-terreno-da-junta` lido em `origin/main`). Modelo que rodou: Claude Opus, nível menor, declarado. Medido em 31/10, 18:30 a 18:50 SP. Não vota, não julga mérito, não conserta.

Objeto: `2746eb6055abcdab863a2d1ce3c7cb2a8a5f6c77`. `origin/main`: `e78e3968`. Toda afirmação de contrato abaixo foi medida nessas refs (§A7); a árvore da sessão está em `main@2b65f51a`, atrás da `origin/main`.

## 1. Isolamento

**1.1 Objeto e árvore: VERDE.**
- `git cat-file -t <objeto>` → `commit`. `git ls-remote origin feat/evidence-clamav-scanner` → o objeto, medido no início e no fim. `gh pr view 477` → aberto, `headRefOid` = objeto, `MERGEABLE`.
- `git rev-list --left-right --count origin/main...<objeto>` → `0 24`; a base está 0 à frente, como o mandato diz.
- `git -C C:/Users/AMP/w-avreal status --porcelain` → vazio, HEAD = objeto. Comparação EOL-neutra de `clamav-scanner.ts`, `upload-gate.ts` e `ci.yml` contra o blob → iguais.
- Árvore principal: `git status --porcelain` só mostra 3 caminhos não rastreados (`.history-memo/`, `TEMPLATE-J-ata.md`, `votos/B-SAN3-06a/`). Nenhum rastreado modificado; ela não é terreno de cadeira.

**1.2 Plano de isolamento: VERDE.** `mandatos.md` l.20: worktree próprio detached com `npm ci` próprio, sem junction, remoção por `git worktree remove --force`; `clamd` em projeto `-p j-avreal-c<n>`, por nome de serviço, `--no-deps`; nunca `erp-postgres`/`erp-redis` nem as portas vivas; banco próprio em porta alta. `Test-Path` de `w-jav1`, `w-jav2`, `w-jav3` → `False`; os caminhos estão livres. Portas 3310 e 3311 sem ouvinte.

**1.3 Resíduos: RESSALVA, nenhum com privilégio ou mutação.**
- **Árvore de teste viva há ~32 h, em `w-avreal`.** PIDs `13416, 19116` (bash), `10500` (sh), `17080, 21344, 17920, 23224, 26848`, criados em 30/10 09:53, com a linha `npm test -- tests/avreal-scanner-failures.test.ts tests/avreal-scanner-protocol.test.ts > /tmp/avreal-f3-red.log` e o rótulo `F3_RED_CONTROL_EXIT`. O `26848` ouve em `127.0.0.1:51016` e tem conexão consigo mesmo. CPU em 10 s: 26,625 → 26,625, delta zero. O log parou em 30/10 09:54:03. Depois do `npm test`, a linha de comando só faz `tail` e `echo`, sem restauração pendente, e `w-avreal` está limpo. **Classificação: resíduo inerte.** Não foi morto por mim. A causa do travamento não foi medida.
- Volumes parados: `prav-avreal_erp_clamav_db`, `w-avreal_erp_clamav_db`, `w-avreal_erp_clamav_limits_db`. As cadeiras usam projeto próprio, então não os herdam.
- `agv3-proxy`, parado há 6 dias, `Privileged=false`.
- Worktrees de outros blocos: `w-agapi2` (1 não rastreado), `w-democ`, `w-democ-app`, `w-trc02` (limpos).
- Bancos antigos dentro do cluster vivo: `erp_o6r_junta_nonseed`, `erp_o6r_junta_backendjob`.
- Sem container `jur-*`/`crit-*`. Único outro processo em laço: `codex-uso-loop.sh`, não toca as árvores do bloco pela linha de comando.

**1.4 Base viva, disco e memória: VERDE.**
- `docker inspect`: `erp-postgres` e `erp-redis` iniciados em 30/10 12:19Z, 0 reinícios. `docker compose ls -a`: só `erp_techsolutios`, com 2 serviços.
- `pg_stat_database` de `erp_techsolutions` (consulta só de leitura): `tup_inserted/updated/deleted = 0/0/0`, nas duas amostras. `xact_commit` foi de 13751 a 13842 entre elas, sem escrita de linha; a origem dessas transações não foi atribuída. Conexões em `pg_stat_activity` na primeira amostra: só a minha.
- **Referência para comparar depois da junta:** `erp_techsolutions|13842|0|0|0`.
- Disco: 23,86 GB livres (piso do mandato: 7,5). Commit livre: 12,41 GB (piso: 4). Imagem do `clamd` local, com o digest fixado no compose (`982e28f9…`), sem download. Docker de pé; `flutter` no PATH.

## 2. Insumos

**2.1 Ata anterior: VERDE, não se aplica.** `git ls-tree -r <objeto> agent-orchestration/omega/juntas agent-orchestration/omega/reprovacoes` sem `AV-REAL`/`avreal`: é a primeira votação. O mandato l.7 marca o contexto como "a medir e não herdar", inclusive os commits do orquestrador.

**2.2 Auditoria de ciclo ≥ 4: não se aplica.** Ciclo 1.

**2.3 Plano: VERDE.** `docs/revisoes/SAN3/B-AV-REAL-plano.md` existe no objeto, com §2 (caminhos permitidos), §3 (R1 a R13) e §5 (bateria com forma e distribuição das cadeiras). Todos os R1 a R13 têm dono no mandato. As emendas v2.8 e v2.9 estão no plano.

## 3. Papéis

**3.1 Inelegibilidade: RESSALVA, cruzamento dos nomes das cadeiras NÃO executado.**
- Obituário em `origin/main`: `git grep` por `avreal` e `j-avreal` sem ocorrência. Nada sepultado ou reservado para este bloco.
- Identidades medidas no objeto e em `agentes-vivos.tsv` que não podem votar: `planejador-avreal-astra`, `planejador-avreal-v2-fable`, `rev-plano-avreal-sol`, `crit-avreal-v2-sol`, `dev-avreal-sol`, `dev-avreal-docker-sol`, `prerev-avreal-sol`, `fix-avreal-opus` e o orquestrador.
- O mandato l.5 cobre planejador (sem nomear os dois), devs, pré-revisor, conserto e orquestrador. **Não nomeia `rev-plano-avreal-sol` nem `crit-avreal-v2-sol`,** que acharam defeitos no plano.
- **O mandato não dá nome às cadeiras,** só C1, C2 e C3. Em `ferramentas/` não há nome; duas buscas mais largas estouraram o tempo e não trouxeram resposta. Logo, o que está provado é a lista de inelegíveis, não a ausência de colisão. Fecha-se conferindo o campo `identidade` de cada voto contra a lista acima, com o comando na ata.

**3.2 Competência: RESSALVA.** C1 segurança/protocolo (`agente-secops` existe em `origin/main`), C2 contratos/superfície, C3 operação/daemon real. Cruzando `git diff --name-only origin/main...<objeto>` com os `arquivos_medidos`, ficam sem cadeira:
- `.env.example`
- `.gitattributes` (o S4 de C3 depende dele)
- `API_CONTRACTS.md`
- `tests/o6r07b-upload-gate-census.test.ts`
- `tests/avreal-clamd.integration.ts` (ver ressalva 1)

**3.3 Corpo carregado × julgado: VERDE.** Comparação EOL-neutra de `inspetor-de-terreno-da-junta` e `agente-secops`: `origin/main` = objeto = disco da sessão. `git diff --stat 2b65f51a origin/main -- .claude/agents .agents/agents CLAUDE.md AGENTS.md` e `git diff --stat origin/main...<objeto> -- .claude .agents CLAUDE.md AGENTS.md`: vazios. O §C7 item 10 existe em `CLAUDE.md:841` nas duas refs e no disco; a norma citada pelo mandato está escrita.

## 4. Fatias e objeto

**4.1 Fatia S0: VERDE.** Worktree limpo e descartável `C:/Users/AMP/w-javinsp`, detached no objeto: `node scripts/sync-agent-agents.mjs --check` → `[agents-sync] OK — 95 agentes, espelho consistente.`, exit 0. Status vazio antes e depois. Removido.

**4.2 Baseline: VERDE, com pré-requisito (ressalva 2).** Mesmo worktree, exit por variável, log em `00-inspetor-baseline.log`:
- `npm ci` → exit 0.
- `npm run check` → **exit 2**, 273 erros TS. As primeiras linhas acusam `@prisma/client` sem `Prisma`/`PrismaClient`; o restante é de tipos derivados (`unknown`, `any`).
- `DATABASE_URL='postgresql://gerar:gerar@127.0.0.1:1/gerar' npm run db:generate` → exit 0.
- `npm run check` → **exit 0**. Status vazio.

**4.3 Check-runs: VERDE.** `gh api repos/thiagodorgo/ERP_Techsolutios/commits/<objeto>/check-runs` → `total_count` 16, todos `completed`/`success`, com `head_sha` no objeto: `backend`, `backend-postgres`, `frontend`, `authority-portal`, `owner-portal`, `flutter`, `docker`, `antivirus`, 2 de cada. Nenhum `cancelled` ou `queued`.

**4.4 Verificador `B-GOV-MANDATO`: REGISTRADO, não bloqueia.** `git ls-tree` e `git grep` em `scripts`, `tests` e `.github`, nas duas refs: sem verificador de mandato. `CLAUDE.md:771` o declara congelado; PR #393 aberto em rascunho. A forma A com pré-voo continua no §C7 item 8(3) e no plano §5, para inspetor e cadeiras, mas nada a verifica por máquina, e `mandatos.md` não traz seção de pré-voo. Conferido aqui só o que é medível: modelo P1 a P7, ≤3 itens, formato do voto.

## 5. Quórum e disparo

**5.1 Plano de perda de cadeira: VERDE.** `mandatos.md` l.13 (P3): sucessor re-executa os comandos registrados do caído e mede a cauda; conclusão sem comando não é insumo. Quórum de unanimidade de 3 em l.3; "não consigo medir" = reprova em l.18. O registro `00-quedas.md` (P6) ainda não existe; ele nasce na primeira queda, pelo orquestrador.

**5.2 Mandato ≤3 itens e P5: VERDE, com observação.**
- C1, C2 e C3 têm 3 itens cada. Os itens são compostos; o maior é C3.3 (script, job inteiro, digest, registro, documentação). A emenda do P2 manda gravar por sub-passo, e isso vale aqui.
- P5: `agentes-vivos.tsv` declara `workflow junta-b-av-real (inspetor, C1, C2, C3, um por vez)`. O `mandatos.md` não repete. A porta fixa 3310/3311 do serviço `erp-clamav` também torna o paralelismo uma colisão, então o "um por vez" é necessário, não só prudente.

## 6. Voto carregado

**VERDE, não se aplica.** Primeira votação; nenhuma cadeira carregada.

## Ressalvas para pôr no briefing das cadeiras

1. **Caminho errado no mandato de C3.** `mandatos.md` l.44 lista `tests/avreal-clamd-integration.test.ts`, que **não existe** no objeto (`git cat-file -e` falha). O real é `tests/avreal-clamd.integration.ts`, como dizem o plano (l.20 e l.244) e `scripts/avreal-integration.mjs:16`. O voto de C3 tem de declarar o caminho real, senão `arquivos_medidos` não alcança a suíte que ele mede.
2. **`npm ci` sozinho dá baseline vermelho falso.** Cada cadeira precisa de `npm run db:generate`, com `DATABASE_URL` falsa, antes de `check` ou de teste. **Nunca copiar a URL do `ci.yml`** (`ci.yml:40` e `:134`): ela aponta para `localhost:5432/erp_techsolutions`, que nesta máquina é a base viva.
3. **Nomes das cadeiras não declarados e 2 inelegíveis fora da lista** (item 3.1). Conferir a `identidade` de cada voto contra os 8 nomes e o orquestrador antes de contar o voto.
4. **5 arquivos do diff sem cadeira** (item 3.2).
5. **Resíduo inerte vivo em `w-avreal`** (item 1.3). Cadeira nenhuma usa esse worktree. Insumo a re-verificar, sem conclusão daqui: um vermelho-controle de `avreal-scanner-failures.test.ts` ficou 32 h sem terminar. Antes de remover `w-avreal` no fechamento, esses processos precisam sair.
6. **Forma A sem verificador** (item 4.4).

**Limpeza:** criei `C:/Users/AMP/w-javinsp`, removido por `git worktree remove --force` (exit 0, `Test-Path` falso, ausente de `git worktree list`). Nenhum container, volume ou rede criado. Busca em segundo plano encerrada. Fica nesta pasta `00-inspetor-baseline.log`, evidência.

LIBERADO COM RESSALVA: tabuleiro limpo e objeto com 16 check-runs verdes, mas o mandato de C3 cita um arquivo que não existe, as cadeiras precisam de `db:generate` com URL falsa, os nomes delas não foram declarados (identidade a conferir em cada voto) e há um teste travado inerte em `w-avreal`
