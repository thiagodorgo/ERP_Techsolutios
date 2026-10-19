papel: cadeira (a) | identidade: jurado-trc01-a-rls-e-banco-cdx3 | modelo: GPT-5.6 Sol (medium; nível menor, §C7.6; substituição P3: sucessor novo de cdx2, que caiu após gravar legalidade e medições parciais) | mandato_md5: da17d197c18015c148710cda5ab10771 cru (declarado no disparo: da17d197c18015c148710cda5ab10771) | corpo_md5: 725c583fc448803e57251e33bb05ba07 EOL-neutro do blob .claude no objeto (recebido no prompt: n/a; carregado do blob)

# Evidência — cadeira (a), B-TRC-01, ciclo 1

Sucessão P3: a identidade anterior não deixou comando registrado nem conclusão utilizável. Esta identidade mede tudo do zero; nada do esqueleto anterior foi herdado como fato.

## Legalidade e leituras obrigatórias

- comando: `MSYS_NO_PATHCONV=1 git -C C:/Users/AMP/w-trc01 show 5abdf83bfcfcac9f70cb1e1aad1c7a7a7cecbf91:.claude/agents/especialistas/jurado-trc01-a-rls-e-banco.md | tr -d '\r' | md5sum`
  saída resumida: `725c583fc448803e57251e33bb05ba07`; corpo lido integralmente do mesmo blob em faixas de linhas.
  veredito parcial: `R-CORPO atendida`; a cadeira pode prosseguir.

- comando: `md5sum C:/Users/AMP/w-trc01/.../00-mandatos/cadeira-a.md` e `tr -d '\r' < ... | md5sum`; leitura integral por `sed`.
  saída resumida: cru `da17d197c18015c148710cda5ab10771`; EOL-neutro `0353fc6a4bda90dbb876ed6ff2aa958c`; 74 linhas; PRE-VOO OK no texto.
  veredito parcial: mandato íntegro; diferença entre hashes é somente CRLF e coincide com as duas formas medidas.

- comando: `sed` integral de `C:/Users/AMP/w-trc01/CLAUDE.md` (803 linhas), `PROJECT_MEMORY.md` (234 linhas), `insp-trc01-parecer.md` (43 linhas), e das skills/referências `backend-review-ts-prisma` e `saas-multi-tenant`.
  saída resumida: contrato canônico e memória lidos; parecer `LIBERADO COM RESSALVA`, objeto declarado `5abdf83b...`, ciclo 1, CI 14/14; R-DBA externa e ainda ausente.
  veredito parcial: legalidade documental apta, condicionada à resolução própria de objeto/CI/identidade e à medição integral dos três itens.

- comando: `df -h /c` seguido de inspeções de worktree/containers/obituário (primeira tentativa, timeout externo de ~10 s).
  saída resumida: somente o marcador `DF`; a tentativa não produziu medição utilizável.
  veredito parcial: falha de infraestrutura ainda não atribuída ao objeto; reexecução isolada obrigatória antes de criar worktree.

- comando: `MSYS_NO_PATHCONV=1 timeout -k 2 10 df -h /c; ec=$?`.
  saída resumida: processo `df` morto após timeout; `ec=137`.
  veredito parcial: segunda falha do `df /c`; medir espaço por forma equivalente e registrar a divergência antes do worktree.

- comando: PowerShell `Get-PSDrive -Name C` e `Test-Path` para `C:\Users\AMP\w-jtrc-a`/`w-jtrc-a2`.
  saída resumida: `C:` livre `10,76 GB`, usado `226,76 GB`; `w-jtrc-a=True`, `w-jtrc-a2=False`.
  veredito parcial: piso de 10 GB atendido por margem de 0,76 GB; `w-jtrc-a` é resíduo alheio/da instância caída e não será tocado; esta identidade usará `C:/Users/AMP/w-jtrc-a2`.

- comando: `git ls-remote origin refs/heads/feat/traccar-b-trc-01`; `gh pr view 426 --json headRefOid,baseRefName,state,isDraft,mergeable`; `rev-parse origin/main`; `merge-base`; `git diff --name-only e38b47... 5abdf83...`.
  saída resumida: Git remoto e GitHub convergem em `5abdf83bfcfcac9f70cb1e1aad1c7a7a7cecbf91`; PR aberto, não draft, mergeable; `origin/main=d81c971a1b445f97d14862f87bc0ca2f31e75595`; merge-base `9566d55bd719ce7d7a545281c57923a25f883ed3`; delta do pai contém somente os quatro mandatos.
  veredito parcial: objeto fixado e HC=H0 satisfeita pela ressalva do inspetor; base e main registradas.

- comando: hashes EOL-neutros dos blobs `.claude`/`.agents`, contagem da identidade no obituário e `gh api .../check-runs` no objeto.
  saída resumida: `.claude=725c583fc448803e57251e33bb05ba07`; `.agents=c5cbd9f764db5d5992a3d39bccb22910` (preambulo Codex esperado); identidade `jurado-trc01-a-rls-e-banco-cdx2` ocorre 0 vezes no obituário; 14 check-runs, todos `completed/success`; `backend-postgres` 2/2 `completed/success`.
  veredito parcial: identidade elegível, dois espelhos presentes e CI concluída/verde; legalidade do start confirmada.

- comando: laço `git show <ref>:CLAUDE.md | grep -Fc <âncora>` e equivalente em `decisoes.md`, para objeto e `origin/main`; `cat-file -e`/`grep` da decisão T13.
  saída resumida: A7, C5, C7.1-bis, C7.1-ter, C7.5, C7.6, C7.6-bis, C7.7 e C7 item 8 deram 1 em ambas as refs; a âncora abreviada de C7.4-bis deu 0 e será reexecutada com o título completo; decisões Traccar deram objeto/main respectivamente `1/1`, `2/3`, `1/1`, `1/1`; decisão T13 existe e contém opção (i), `NOVAS`, `WRAPPERS` intocada, julgamento da cadeira (a) e literal `109→111`.
  veredito parcial: normas aplicadas existem na ref julgada; diferença de quantidade no registro de 11/10 não muda a regra citada; falta apenas corrigir a forma da busca de C7.4-bis.

- comando: busca exata `grep -Fc 'SEPARAÇÃO DE PAPÉIS NA CORREÇÃO'` em `CLAUDE.md` do objeto e de `origin/main`.
  saída resumida: `1` no objeto e `1` na main.
  veredito parcial: C7.4-bis existe nas duas refs; legalidade normativa fechada.

- comando: `git worktree add --detach C:/Users/AMP/w-jtrc-a2 5abdf83...`; provas de `.git`, ausência de `.env`, HEAD e status.
  saída resumida: `add_ec=0`, `.git` existe, `.env` ausente, HEAD exato `5abdf83bfcfcac9f70cb1e1aad1c7a7a7cecbf91`, status vazio.
  veredito parcial: terreno próprio detached criado sem tocar o resíduo `w-jtrc-a`; pronto para dependências próprias.

- comando: em `C:/Users/AMP/w-jtrc-a2`, `timeout -k 15 900 npm ci --no-audit --no-fund; ec=$?`.
  saída resumida: 326 pacotes instalados em 4 min; aviso `EBADENGINE` transitivo (`@prisma/streams-local`, Node >=22) sem falha; `npm_ci_ec=0`.
  veredito parcial: dependências próprias instaladas, sem junction/symlink compartilhado.

- comando: PowerShell `Get-PSDrive C` e `Get-Item C:\Users\AMP\w-jtrc-a2\node_modules` (atributos/link/target).
  saída resumida: `10,25 GB` livres; `node_modules` é `Directory`, sem `LinkType` e sem `Target`.
  veredito parcial: piso ainda atendido e proibição de junction/symlink comprovada.

- comando: `DATABASE_URL=postgresql://build:***@127.0.0.1:1/build?schema=public timeout -k 15 300 npx prisma generate` no worktree próprio.
  saída resumida: Prisma schema carregado; client v7.8.0 gerado em 4,25 s; `ec=0`.
  veredito parcial: artefato de client pronto sem conexão à base viva.

- comando: `netsh ... excludedportrange`, `Get-NetTCPConnection` para 47461/47471 e `docker ps -a` filtrado.
  saída resumida: portas candidatas não constam nas exclusões nem têm listener; Docker respondeu `failed to connect ... dockerDesktopLinuxEngine` porque o daemon não está rodando.
  veredito parcial: portas aptas, mas infraestrutura Docker indisponível na primeira tentativa; reexecução após diagnóstico/start local é obrigatória, sem atribuir ao objeto.

- comando: PowerShell `Get-Process` Docker, `Get-Service com.docker.service`, `Test-Path Docker Desktop.exe`.
  saída resumida: nenhum processo Docker ativo; serviço `com.docker.service` parado/manual; executável existe.
  veredito parcial: causa ambiental identificada; iniciar Docker Desktop localmente e reexecutar a prova.

- comando: `Start-Process 'C:\Program Files\Docker\Docker\Docker Desktop.exe' -WindowStyle Hidden`.
  saída resumida: processo lançado (`started`).
  veredito parcial: aguardando daemon local; nenhuma base ou container alvo tocado.

- comando: laço limitado a 60 s de `docker version --format '{{.Server.Version}}'`.
  saída resumida: daemon respondeu em ~9 s; versão servidor `29.6.1`, `ec=0`.
  veredito parcial: falha ambiental sanada; Docker apto para cluster descartável próprio.

- comando: `docker ps -a` filtrado por prefixos da rodada e `docker image inspect postgres:16 redis:7`.
  saída resumida: existem `jtrc01-a-pg` em `127.0.0.1:47461` e `jtrc01-a-redis` em `127.0.0.1:47471`, resíduos da identidade caída/alheios a cdx2; imagens Postgres 16 e Redis 7 já locais.
  veredito parcial: não tocar nem remover os resíduos; esta identidade escolherá nomes/portas novos e exclusivos.

- comando: exclusões/listeners/nome de container para portas `47462/47472` e prefixo `jtrc01-a-cdx2-`.
  saída resumida: nenhuma exclusão correspondente, nenhum listener e nenhum container com o novo prefixo.
  veredito parcial: portas e nomes exclusivos aptos.

- comando: `mktemp -d C:/Users/AMP/AppData/Local/Temp/jtrc01-a2-XXXXXX`.
  saída resumida: scratch `C:/Users/AMP/AppData/Local/Temp/jtrc01-a2-EM6Pp8`, `ec=0`.
  veredito parcial: scratch exclusivo criado para logs/sondas/senha temporária; será removido no teardown.

- comando: gerar senha aleatória em arquivo do scratch; `docker run` Postgres 16/Redis 7 com nomes `jtrc01-a-cdx2-*` e binds explícitos; `pg_isready`; `docker port`.
  saída resumida: ambos `run_ec=0`; Postgres pronto na 2ª sondagem; PG `127.0.0.1:47462→5432`, Redis `127.0.0.1:47472→6379`; ambos `Up`.
  veredito parcial: cluster próprio e exclusivo ativo, somente loopback; resíduos alheios e base viva intocados.

- comando: `DATABASE_URL=postgresql://postgres:***@127.0.0.1:47462/erp?schema=public timeout -k 15 300 npx prisma migrate deploy`; depois `SELECT version()`, última migração e `redis-cli ping`.
  saída resumida: `migrate_ec=0`, todas as migrações aplicadas; PostgreSQL `16.14`; última `20260875000000_validate_location_source_check`; Redis `PONG`.
  veredito parcial: objeto aplicado no banco próprio PostgreSQL 16 e Redis 7 operacional.

- comando: inventário do diff de `tests/*-db.test.ts`, busca `rg` das mutações/CI e leitura de scripts do `package.json`.
  saída resumida: 7 testes `-db` alterados/listados (runtime-role + 6 Traccar); `rg` não existe neste Git Bash, portanto as duas buscas falharam explicitamente; `npm test` resolve para `node scripts/run-backend-tests.mjs`.
  veredito parcial: lista-base identificada; repetir buscas com `grep` por indisponibilidade do `rg`, sem tratar a falha como dado do objeto.

- comando: `grep -En` para MUT-04/05/06/12/34/35/40/41, lista CI e `createEphemeralRole` nos seis testes Traccar `-db`.
  saída resumida: catálogo de mutações localizado com propriedade/edição/teste; busca literal dos seis nomes no CI não retornou linhas (forma precisa ser inspecionada); contagens `createEphemeralRole`: binding=2, idempotency=2, ingest-pool=0, position-ingestion=2, quarantine=2, resolution-race=2.
  veredito parcial: mutações ancoradas; `ingest-pool-db` exige inspeção do client/papel e a lista CI exige leitura da construção de `SUITES`, ainda sem conclusão.

- comando: `timeout -k 15 400 node scripts/san3-05-acessos-de-plataforma.mjs . > .../t13-object.log`.
  saída resumida: a chamada inicial não devolveu saída dentro da janela de 30 s e o wrapper não preservou o identificador da sessão; resultado ainda não utilizável.
  veredito parcial: não iniciar segunda instância; primeiro conferir processo/log e só então concluir ou repetir.

- comando: PowerShell `Get-CimInstance Win32_Process` filtrado pelo gerador e `Get-Item t13-object.log`.
  saída resumida: nenhum processo do gerador permanece; log existe com 11.653 bytes e timestamp final.
  veredito parcial: a execução terminou; ler o log produzido sem repetir o comando.

- comando: `grep` dos resumos e das seis formas Traccar em `t13-object.log`.
  saída resumida: execução direta no objeto: `L0 ENABLE=108 FORCE=108 acessores=108`, `OPS=17`, 793 arquivos, 0 erros sintáticos; inventário `62 chaves`, sha1 `5755edd...`; as seis chaves K1–K6 aparecem exatamente nas formas previstas.
  veredito parcial: inventário do objeto medido; o `111` não é o argv direto e será medido com o argv virtual exato do subteste, conforme o corpo.

- comando: `git worktree add --detach C:/Users/AMP/w-jtrc-a2-base 9566d55...`; provas de HEAD, ausência de `.env` e status.
  saída resumida: `ec=0`, HEAD exato da merge-base, `.env` ausente, status vazio.
  veredito parcial: worktree-base próprio criado somente para comparação do gerador/catálogo, sem dependências compartilhadas.

- comando: prova de diff do gerador e execução do gerador do objeto com raiz absoluta da base.
  saída resumida: gerador intocado (`git diff --quiet ec=0`); execução na base falhou `ec=2`, log de 1 linha, sem métricas.
  veredito parcial: condição “gerador intocado” confirmada; falha da invocação-base precisa ser lida e reexecutada em forma válida.

- comando: leitura integral de `t13-base.log`.
  saída resumida: `# erro: OPS não derivado do client gerado (N=0)`.
  veredito parcial: a base precisa de dependências/client próprios; não é falha do objeto nem resultado do inventário.

- comando: `timeout -k 15 900 bash .../teste-linux.sh C:/Users/AMP/w-jtrc-a2-base "node scripts/san3-05-acessos-de-plataforma.mjs ." > t13-base-linux.log`.
  saída resumida: runner Linux isolado terminou `ec=0` em ~3 min.
  veredito parcial: execução-base válida produzida com dependências próprias; ler o resumo do log antes de comparar.

- comando: extração/sort/`comm` das chaves L1+L2 dos logs base e objeto.
  saída resumida: base `56` chaves, L0 direto `106/106/106`, OPS 17; objeto `62`, L0 direto `108/108/108`; `objeto−base` contém exatamente K1–K6; `base−objeto` vazio; total conferido 56/62.
  veredito parcial: T13-0a satisfeito; seis chaves novas exatas e nenhuma sumida. O delta direto L0 é +2, enquanto o literal virtual `111` ainda será medido pelo argv do subteste.

- comando: leitura das seções `SUITES`, `L0 exato`, `NOVAS` e diff base→objeto do teste T13.
  saída resumida: o diff T13 contém somente K1–K6 e literal `109→111`; argv L0 exato é `--schema-extra c2-f2-schema --migration-extra c2-f2-migration --mutant c2-f2-reader`; porém nenhum dos seis testes Traccar `-db` aparece na lista `SUITES` do job `backend-postgres` (busca literal vazia e seção termina na linha 278).
  veredito parcial: condições T13-0b conferem; nasce suspeita bloqueante de arnês/CI dentro do bloco — os seis testes novos auto-pulam no job backend e não são roteados ao job Postgres. Confirmar por diff/origem e execução antes de classificar.

- comando: diff do workflow, `git log --diff-filter=A` e `git cat-file -e` na base para os seis testes.
  saída resumida: workflow CI sem diff; os seis testes nasceram juntos no commit do bloco `d5a4f25b...` em 2026-10-11; todos são ausentes na merge-base (`cat-file ec=128`).
  veredito parcial: eventual verde-cego é `dentro-do-bloco` por origem demonstrada, embora o arquivo CI em si não tenha sido tocado.

- comando: runner Linux isolado `npm test -- tests/san3-05-acessos-de-plataforma-guard.test.ts`, timeout 1200 s.
  saída resumida: execução terminou `ec=0` em ~3,5 min; log integral em scratch.
  veredito parcial: T13 executou; contagens e subtestes precisam ser extraídos do TAP antes do veredito.

- comando: extração TAP do log T13 e busca da senha temporária.
  saída resumida: `35 tests, 35 pass, 0 fail, 0 skipped`, duração 56.989 ms; subteste `L0 exato` ok; T13 inteiro ok; senha própria ocorre 0 vezes no log.
  veredito parcial: T13-0c caminho verde e literal `111` coberto por execução; controles mutantes específicos ainda pendentes.

- comando: execução direta do gerador com argv virtual L0 usando caminho de fixture inferido `tests/fixtures/san3-05/...`.
  saída resumida: `ec=1`; nenhum resumo L0, porque os caminhos inferidos não foram confirmados.
  veredito parcial: tentativa inválida; localizar `FIXTURES_DIR`/blobs exatos e repetir, sem usar este resultado.

- comando: `grep FIXTURES_DIR` no teste e `git ls-files '*c2-f2*'`.
  saída resumida: diretório correto `tests/fixtures/san3-05-mutacoes`; três fixtures exatas presentes.
  veredito parcial: argv exato resolvido; repetir o gerador.

- comando: gerador com argv exato do subteste L0 (`--schema-extra`, `--migration-extra`, `--mutant` C2-F2).
  saída resumida: `ec=0`; `ENABLE=111 FORCE=111 acessores=111`, OPS 17, 794 arquivos/1 virtual/0 erro; lista FORCE inclui `vehicle_tracking_bindings` e `traccar_ingress_receipts`; três acessores C2 presentes.
  veredito parcial: literal L0 `111` confirmado pelo mesmo argv do teste; delta de catálogo/modelos ainda pendente.

- comando: leitura integral de `teste-linux.sh` fornecido pelo ambiente.
  saída resumida: o runner cria rede, Postgres 16 e Redis 7 próprios sem portas; monta worktree somente leitura; copia sem `.git`/`node_modules`; roda `npm ci`, `prisma generate`, `migrate deploy`; injeta `DATABASE_URL`, `REDIS_URL`, `CI=true`; remove tudo por nome no trap.
  veredito parcial: runner satisfaz a exigência Linux/isolamento e pode executar a série sem tocar base viva nem os containers das juntas.

- comando: runner Linux, uma invocação conjunta dos seis testes Traccar `-db`, timeout 1200 s.
  saída resumida: processo terminou `ec=0` em ~2,5 min; TAP em `db6-baseline.log`.
  veredito parcial: baseline produziu verde de processo; extrair denominador/pulos e casos antes de aceitar.

- comando: extração TAP/falhas/segredo do baseline dos seis `-db`.
  saída resumida: `44 tests, 44 pass, 0 fail, 0 skipped`, duração 19.067 ms; casos de 503 sem commit (posição/recibo/evento/quarentena/conflito) e lock de 4 s passaram; nenhum P2028/not-ok/timeout; senha própria 0 ocorrências.
  veredito parcial: baseline Linux verde com denominador 44 e nenhum pulo; alegação antiga 42 ficou obsoleta pelos 2 testes da pré-revisão, como ressalvado.

- comando: runner Linux dos mesmos seis arquivos após `unset DATABASE_URL` (controle da forma do job backend).
  saída resumida: processo terminou `ec=0` em ~4,5 min; TAP em `db6-no-db.log`.
  veredito parcial: processo verde sem banco confirmado; extrair contagem de pulos para fechar o controle de CI.

- comando: extração TAP do controle sem `DATABASE_URL`.
  saída resumida: `6 tests, 0 pass, 0 fail, 6 skipped`, duração 958 ms; cada arquivo vira exatamente um caso `# SKIP exige DATABASE_URL`; processo permanece `ec=0`.
  veredito parcial: ACHADO CONFIRMADO — os seis testes `-db` nascidos neste bloco não entram em `backend-postgres`; no job backend, todos auto-pulam e deixam verde. Gravidade `bloqueia`, escopo `dentro-do-bloco`, classe `não grave`, ciclo 1. CI 14/14 não exercitou estes 44 casos contra banco.

- comando: runner Linux único com laço das rodadas 2–10 dos seis `-db`, cada rodada em uma invocação `npm test`, timeout 2400 s.
  saída resumida: comando agregado terminou `ec=0` em ~4,3 min; resumos por rodada em `db6-rounds2-10.log`.
  veredito parcial: série completou em processo; conferir os nove denominadores/pulos/durações antes de aceitar N=10.

- comando: extração dos resumos `ROUND=` do log das rodadas 2–10.
  saída resumida: rodadas 2–10, todas `ec=0 tests=44 pass=44 fail=0 skipped=0`; durações ms: 24293, 18940, 18701, 18593, 18750, 18658, 18475, 19457, 18254. Somada à rodada 1 (`44/44`, 19067 ms): N=10, denominador constante, 440/440, pulos 0.
  veredito parcial: requisito N≥10 satisfeito; arnês é estável quando explicitamente executado com banco, mas continua ausente do job CI Postgres.

- comando: leitura dos 44 nomes TAP e rastreio estático de `createEphemeralRole`/client nos seis arquivos.
  saída resumida: os 44 casos cobrem U1/U2/U3, FORCE/runtime guard, atomicidade/falhas, isolamento A/B, pool/teto, 503 sem commit e corridas; cinco suítes entregam `role.client` ao serviço (role efêmera), enquanto `traccar-ingest-pool-db` documenta e usa URL administrativa apenas para medir número/application_name do pool, não RLS.
  veredito parcial: as provas de RLS/ingestão nas cinco suítes rodam por client efêmero no código; a suíte de pool é controle de topologia e não pretende provar RLS. Confirmação por log de servidor ainda pendente.

### Item 1 — catálogo

- comando: consultas `pg_class`, `pg_policies`, `pg_indexes`, `pg_rules`, `information_schema.columns` e `pg_proc` no Postgres próprio migrado.
  saída resumida: vínculo e recibo `ENABLE=t/FORCE=t`; quarentena `f/f`; políticas ALL têm USING e WITH CHECK pelo GUC; uniques globais de dispositivo e recibo omitem `tenant_id`; unique de vínculo ativo tem predicado `valid_to IS NULL`; zero rules; zero SECURITY DEFINER relacionado a Traccar; quarentena não tem tenant/coordenada/payload bruto, apenas `last_payload_digest`.
  veredito parcial: catálogo atende isolamento/unicidade global e exceção global da quarentena; digest não é payload.

- comando: criar role exata `jtrc01_a_cdx2_role LOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT`, grants DML equivalentes ao runtime, fixtures A/B; depois `SET ROLE` e consultas sem GUC/com GUC A.
  saída resumida: setup `ec=0`; papel reporta `rolsuper=f`, `rolbypassrls=f`; sem GUC vê 0 vínculos; com GUC A vê exatamente 1 e tenant A; admin semeou duas linhas A/B.
  veredito parcial: vermelho-controle RLS discrimina e prova o papel correto; fixtures nomeadas para teardown exato.

- comando: sob role sem bypass, (1) insert B com GUC A, (2) mesmo dispositivo de A em B, (3) mesma colisão com `ON CONFLICT DO NOTHING`.
  saída resumida: (1) falha `new row violates row-level security policy`, ec=1; (2) falha pela unique global `vehicle_tracking_bindings_active_device_key`, ec=1 (SQLSTATE 23505 confirmado pela suíte); (3) retorna contagem 0, ec=0.
  veredito parcial: controle WITH CHECK, U1/U2 e semântica ON CONFLICT provados; RLS não impede a constraint global de falhar fechado.

- comando: três pares de sessões reais: holder sob role/GUC A com `FOR SHARE`, `FOR KEY SHARE` e sem lock, seguido de desativação concorrente; cronômetro monotônico por `date +%s%3N`.
  saída resumida: `FOR SHARE=2820 ms`; `FOR KEY SHARE=475 ms`; sem lock `392 ms`; todos ec=0 e fixture restaurada ativa.
  veredito parcial: vermelho-controle discrimina a trava; somente `FOR SHARE` segura a desativação pelo intervalo esperado. U4/U4d confirmados e MUT-05 tem propriedade observável.

- comando: leitura por linha de `rls.ts`, fase 2, quarentena sem tenant, descoberta e `git grep` de `findOperatorsForVehicleAt`.
  saída resumida: `withTenantRlsBudget` chama setter na primeira instrução do callback e só então timeouts/work(tx); fase 2 instancia repositórios/localização/operador no mesmo `tx`; recibo, localização e attach ficam no callback; quarentena sem tenant usa client raiz só na tabela global; descoberta troca GUC antes de cada probe e aplica canário; único chamador produtivo de `findOperatorsForVehicleAt` é a fase 2.
  veredito parcial: motivos textuais K1–K6 conferem no objeto e são coerentes com os 44 casos executados; falta apenas o log SQL por transação exigido pelo corpo para aceitar definitivamente as chaves.

### Item 3 — configuração de produção

- comando: leitura de constantes/orçamentos, bootstrap, `traccar-db.ts` e busca de timeout HTTP.
  saída resumida: discovery `250/1000`, fase 2 `250/1750`; lock/statement `1000/1500`; fábrica de produção não injeta orçamento alternativo; pool próprio cria `PrismaClient` com `max`, `application_name=erp-traccar-ingest`, e `URL.searchParams.set` substitui parâmetro prévio.
  veredito parcial: defaults e pool próprio estão no caminho de produção; timeout HTTP precisa de busca corrigida/execução, e MUT-40/41 seguem pendentes.

- comando: runner Linux sem comando (forma CI `npm test`) no objeto, Postgres/Redis próprios, timeout 3000 s.
  saída resumida: suíte inteira terminou `ec=1` após ~7 min; log integral `full-suite-linux.log`.
  veredito parcial: suíte completa vermelha; extrair denominador, arquivos/códigos e datar causa antes de atribuir ao bloco.

- comando: extração de summary/not-ok/contextos da suíte completa.
  saída resumida: 3.418 testes, 3.405 pass, 11 fail contados pelo TAP (inclui parent+child), 2 skipped; duração 394.130 ms. Falhas reais: T15 do runtime guard (`processo filho não encerrou em 8586ms`) e 9 casos `traccar-dev-topology` por `spawnSync docker ENOENT` dentro da imagem do runner. Todos os 44 casos Traccar de banco passaram sob carga, inclusive 503/lock/pool; nenhum P2028 do Traccar.
  veredito parcial: a suíte inteira é vermelha, mas as 9 falhas de topologia são limitação do runner fornecido (sem Docker CLI), não comportamento do objeto; T15 é instabilidade conhecida e precisa ser reexecutado isoladamente/datado. Reexecutar topologia onde Docker existe e runtime guard isolado.

- comando: host com Docker disponível, `REDIS_URL` próprio e `node --test --import tsx tests/traccar-dev-topology.test.ts`.
  saída resumida: `12 tests, 12 pass, 0 fail, 0 skipped`, duração 2.316 ms, ec=0.
  veredito parcial: as 9 falhas de topologia da suíte completa são ambientais (`docker ENOENT` no runner), não defeito do objeto; reexecução independente verde.

- comando: runner Linux isolado `npm test -- tests/san3-05-runtime-role-guard-db.test.ts`.
  saída resumida: execução isolada terminou `ec=0`; log em scratch.
  veredito parcial: extrair TAP e datar origem para classificar T15 da suíte sob carga.

- comando: extração TAP do runtime guard, `git log -1` e diff-stat base→objeto do arquivo.
  saída resumida: isolado `12 tests, 12 pass, 0 fail, 0 skipped`, T15 verde, duração 16.614 ms; arquivo tem diff mínimo 1+/1− no bloco, portanto a origem da linha T15 precisa de blame/diff antes de declarar preexistente.
  veredito parcial: falha da suíte completa é sensível à carga e não reproduz isolada; classificação de escopo pendente da linha tocada.

- comando: diff integral base→objeto e `git blame -L 520,545` na área do timeout T15.
  saída resumida: bloco alterou somente literal de contagem `115→118` na linha ~1012; helper `waitForCloseCode` e erro de timeout vêm de `a9fbe2834` em 2026-10-09, antes do bloco.
  veredito parcial: T15 sob carga é `pre-existente`, classe não grave, não reprova; reexecução isolada verde. Suíte completa vermelha reportada com N/forma/causa, sem imputá-la ao objeto.

- comando: runner Linux descartável com cópia adaptada do runner de mutações para env próprio; MUT-05/06/35/40/41; restauração por hash e status final.
  saída resumida: comando agregado terminou `ec=0`; JSONL/progresso em `mutations-nonmigration.log`.
  veredito parcial: ler cada mutação, motivo do vermelho, TAP e restauração antes de aceitar.

- comando: extração dos registros JSONL/progresso/status das mutações não migratórias.
  saída resumida: MUT-05 vermelho 2 casos de corrida (5 tests, 3 pass/2 fail); MUT-06 vermelho por dica envenenada/tenant certo (26, 24/2); MUT-35 vermelho nos dois controles de rollback atômico (8, 6/2); MUT-40 vermelho no caso lock 4 s→503<3 s (5, 4/1); MUT-41 vermelho nos dois casos de pool (2, 0/2). Todos skipped=0, todos `restoredOk=true`; status final sem modificação rastreada.
  veredito parcial: MUT-05/06/35/40/41 acusam exatamente as propriedades indicadas, não erro de compilação/P2028/timeout alheio; restauração provada.

- comando: runner Linux com cópia adaptada do runner para `psql $DATABASE_URL`, banco `trc01_mut` e env próprio; MUT-04/12/34.
  saída resumida: agregado terminou `ec=0`; `psql` disponível; JSONL/progresso em `mutations-migration.log`.
  veredito parcial: ler migrate status, TAP, motivo do vermelho e restauração antes de aceitar.

## Item 1 — REPROVADO

- comando: conjunto das medições acima — catálogo PostgreSQL 16.14; baseline Linux 44/44; T13 objeto; controles L0/RLS; MUT-04/05/06.
  saída resumida: unicidade global, FORCE, trava e autoridade da confirmação ficaram verdes; K1/K2/K5/K6 aparecem exatamente no inventário e suas propriedades acusam nas mutações. Porém os testes que provam isso têm 0 ocorrências no job PostgreSQL e auto-pulam 6/6 no job sem banco.
  veredito parcial: `REPROVADO` por achado `bloqueia · dentro-do-bloco · não grave` no ciclo 1: o CI 14/14 não executa as provas de banco/RLS do item.

## Item 2 — REPROVADO

- comando: baseline 44/44; catálogo/L0; MUT-12/34/35; controle FORCE→110/T13 vermelho.
  saída resumida: recibo global, atomicidade exercitada, FORCE e L0 acusaram corretamente; K3/K4 constam no inventário e o baseline cobre falhas sem commit/quarentena. Migração aditiva/rollback e `pg_terminate_backend` próprios não foram reexecutados pela cdx3; a aprovação DBA continua externa/ausente.
  veredito parcial: `REPROVADO`: o mesmo verde-cego da CI alcança as provas deste item; adicionalmente, os subitens de rollback/terminação não medidos não podem ser aprovados pelo protocolo.

## Item 3 — REPROVADO

- comando: baseline + N=10 (`440/440`, skipped 0), MUT-40/41 e controle 4 s→503<3 s.
  saída resumida: denominador constante e orçamentos/pool acusam nas mutações; execução explícita é estável. A CI não chama os seis arquivos e, sem banco, eles dão verde com 6 pulos.
  veredito parcial: `REPROVADO` pelo achado único de roteamento/verde-cego, `bloqueia · dentro-do-bloco · não grave`, que no ciclo 1 reprova.

## Sucessor 2026-10-16T01:30:06Z (Codex 3)

- comando: `git show OBJ:.claude/... | tr -d CR | md5sum`; `md5sum 00-mandatos/cadeira-a.md`; leitura integral do corpo, mandato e parecer.
  saída resumida: corpo `.claude=725c583fc448803e57251e33bb05ba07`; mandato cru `da17d197c18015c148710cda5ab10771`; ambos coincidem com o disparo; parecer `LIBERADO COM RESSALVA` lido integralmente.
  veredito parcial: reexecução P3 da integridade coincide com cdx2; R-CORPO e mandato atendidos.

- comando: `df -h C:/`; `git rev-parse HEAD`; `git ls-remote`; `gh pr view`; `gh api check-runs` (comando agregado, limite externo de 30 s).
  saída resumida: disco `12G` livre; HEAD local `5abdf83bfcfcac9f70cb1e1aad1c7a7a7cecbf91`; a chamada bloqueou em `git ls-remote` e foi terminada pelo limite antes de Git remoto/GitHub/CI.
  veredito parcial: piso de 10 GB e HEAD local reexecutados e coincidem; resolução remota/CI ainda não conta e será repetida isoladamente.

- comando: `gh pr view 426 --repo thiagodorgo/ERP_Techsolutios ...`; `gh api repos/.../commits/OBJ/check-runs`.
  saída resumida: GitHub head `5abdf83bfcfcac9f70cb1e1aad1c7a7a7cecbf91`, base `main`, OPEN, não draft, MERGEABLE; check-runs `14 total / 0 não-verdes / 0 pendentes`; dois runs cujo nome contém `backend-postgres`.
  veredito parcial: objeto e CI reexecutados e coincidem com cdx2/inspetor; CI 14/14 concluída e verde.

- comando: `git ls-remote origin refs/heads/feat/traccar-b-trc-01`; `git rev-parse origin/main`; `git merge-base OBJ origin/main`; `git diff --name-only e38b47... OBJ`; md5 EOL-neutro do espelho `.agents`; busca nominal no obituário.
  saída resumida: remoto=`5abdf83bfcfcac9f70cb1e1aad1c7a7a7cecbf91`; `origin/main=4fe7524ecbcc68b3e69336453cc774ed5937cb1c` (avançou desde cdx2); merge-base permanece `9566d55bd719ce7d7a545281c57923a25f883ed3`; delta do pai são só quatro mandatos; `.agents=c5cbd9f764db5d5992a3d39bccb22910`; identidade cdx3 tem 0 ocorrências no obituário.
  veredito parcial: legalidade P3 fechada; objeto estável por Git e GitHub, espelhos presentes, identidade nova elegível. A main andou, sem alterar a base histórica do objeto.

### Item 1 — terreno cdx3

- comando: verificação de caminhos/portas; `git worktree add --detach C:/Users/AMP/w-jtrc-a3 OBJ`; provas de `.git`, ausência de `.env`, status; `timeout -k 15 900 npm ci --no-audit --no-fund`.
  saída resumida: caminhos a3/a4 ausentes, portas 47463/47473 sem listener ou container correspondente; worktree criado no head exato, `.git` presente, `.env` ausente, status vazio; `npm_ci_ec=0` com dependências próprias.
  veredito parcial: terreno novo e isolado pronto; nenhum worktree/container cdx2 ou da outra junta foi tocado.

- comando: scratch/senha aleatória; `docker run` com nomes `jtrc01-a-cdx3-*`, Postgres 16 e Redis 7 em `127.0.0.1:47463/47473`; `npx prisma migrate deploy`; consultas de versão/última migração; Redis PING.
  saída resumida: containers criados somente no prefixo cdx3; binds `127.0.0.1:47463→5432` e `127.0.0.1:47473→6379`; primeira sonda de prontidão ainda rejeitou, mas a migração subsequente concluiu `ec=0`; PostgreSQL `16.14`, última migração `20260875000000_validate_location_source_check`; Redis `PONG`.
  veredito parcial: cluster cdx3 próprio migrado e operacional; base viva e portas proibidas não foram tocadas.

- comando: runner Linux isolado obrigatório, uma invocação dos seis testes Traccar `-db` do objeto (`npm test -- tests/traccar-binding-uniqueness-db.test.ts ... tests/traccar-resolution-race-db.test.ts`).
  saída resumida: `ec=0`; `44 tests / 44 pass / 0 fail / 0 skipped`, duração TAP `20507 ms`; casos de 503 sem commit, atomicidade e vínculo preso por 4 s→503<3 s passaram; nenhum `not ok`, `P2028` ou timeout alheio.
  veredito parcial: baseline executável cdx3 coincide com cdx2 (mesmo denominador 44, pulos 0); propriedades ainda exigem controles/mutações do item antes de fechamento.

- comando: leitura do blob da migração do objeto, linhas de tabelas/índices/RLS/políticas/rollback.
  saída resumida: vínculo e recibo têm `ENABLE`+`FORCE`, políticas `USING`/`WITH CHECK` pelo GUC; unique ativo de dispositivo e unique de recibo são globais sem `tenant_id`; quarentena é global sem RLS/tenant/coordenada/payload; rollback explícito no topo; CHECK `source` ampliado por DROP+ADD NOT VALID e validado na migração seguinte.
  veredito parcial: desenho estático coincide com o catálogo esperado; a execução no catálogo/role sem bypass segue necessária.

- comando: sonda SQL `zz-jtrc01a-catalog.sql` (md5 `0eef321b67478f759fc85bf67c1028fb`) via psql 16 no cluster cdx3.
  saída resumida: `ec=3`; antes do erro de `ORDER BY` da própria sonda, catálogo confirmou vínculo/recibo `true|true`, quarentena `false|false` e as duas políticas ALL com `USING`+`WITH CHECK` pelo GUC. Índices/rules/secdef/colunas não foram executados.
  veredito parcial: medição parcial utilizável somente para flags/políticas; corrigir a sonda e repetir o restante, sem atribuir o erro ao objeto.

- comando: sonda SQL corrigida `zz-jtrc01a-catalog.sql` (md5 `cc623f51c3f9b2080d5c7fd0ead814af`) via psql 16.
  saída resumida: `ec=0`; vínculo/recibo `ENABLE=true/FORCE=true`, quarentena `false/false`; políticas ALL com USING/WITH CHECK pelo GUC; uniques globais de dispositivo ativo e evento de recibo omitem tenant; `rules=0`, `secdef Traccar=0`; quarentena tem digest, sem tenant/coordenada/payload bruto.
  veredito parcial: item 1(a) verde no catálogo real; unicidade global e RLS estão presentes na migração aplicada.

- comando: runner de mutações em cópia Linux descartável, catálogo do objeto, `MUT-05,MUT-06`; adaptação somente de URLs para env do cluster isolado; restauração SHA pelo próprio runner.
  saída resumida: MUT-05 `5 tests / 3 pass / 2 fail / 0 skipped`, vermelha exatamente nos dois casos de corrida/espera; MUT-06 `26 / 24 / 2 / 0`, vermelha na organização certa após troca e na dica envenenada; ambas `restoredOk=true`, sem P2028/compilação/timeout.
  veredito parcial: MUT-05 e MUT-06 acusam as propriedades do item 1 pelo caso indicado; bytes restaurados na cópia descartável.

- comando: primeira adaptação Linux do runner para MUT-04 (migração em banco novo, psql em vez de Docker-in-Docker).
  saída resumida: `ec=1` antes de aplicar mutação; `/tmp/run.mjs` inválido por erro de sintaxe na adaptação da constante `MUT_DB` (`Unexpected token const`).
  veredito parcial: tentativa não mede MUT-04 nem o objeto; corrigir o runner temporário e repetir. Nenhum arquivo do worktree foi mutado.

- comando: segunda adaptação Linux de MUT-04, com `node --check` e psql no banco administrativo.
  saída resumida: runner externo `ec=0`, porém registro interno contém `error=CREATE DATABASE falhou: invalid URI query parameter schema`; mutação não chegou ao teste; arquivo restaurado com SHA `0d5aa32...`, `restoredOk=true`.
  veredito parcial: ainda não mede MUT-04; o runner original mascara erro interno com exit 0, portanto só `red=true` sem `error` contará. Repetir removendo `?schema=public` da URL passada ao psql administrativo.

- comando: terceira adaptação Linux de MUT-04; banco `trc01_mut` criado por psql, migração mutante aplicada, teste indicado executado, banco removido e bytes restaurados.
  saída resumida: `migrateStatus=0`; `6 tests / 4 pass / 2 fail / 0 skipped`; vermelha exatamente na colisão global 23505 invisível a B e no `ON CONFLICT DO NOTHING`; `error` ausente; `red=true`; migração restaurada SHA `0d5aa32...`, `restoredOk=true`.
  veredito parcial: MUT-04 acusa a unicidade global pelo caso indicado; todas MUT-04/05/06 do item 1 têm vermelho válido e restauração provada.

- comando: busca literal dos seis testes Traccar `-db` no blob `.github/workflows/ci.yml` do objeto; diff do workflow base→objeto; `git cat-file -e base:<teste>` para cada teste.
  saída resumida: cada um dos seis nomes ocorre `0` vezes no workflow; workflow tem diff vazio; os seis arquivos são ausentes na merge-base (`ec=128` cada).
  veredito parcial: suspeita de verde-cego confirmada estaticamente e datada `dentro-do-bloco`; falta reexecutar a forma sem DATABASE_URL para provar o auto-skip verde.

- comando: runner Linux isolado dos seis testes Traccar `-db` após `unset DATABASE_URL` (forma efetiva do job backend que não injeta banco).
  saída resumida: processo `ec=0`; `6 tests / 0 pass / 0 fail / 6 skipped`; cada arquivo virou um único caso `# SKIP exige DATABASE_URL`; duração `1028 ms`.
  veredito parcial: ACHADO BLOQUEANTE CONFIRMADO — os seis testes novos, ausentes de `backend-postgres`, deixam o CI backend verde sem executar nenhum dos 44 casos de banco/RLS. Escopo `dentro-do-bloco` (arquivos ausentes na base); classe `não grave`; ciclo 1 reprova.

### Itens 2 e 3 — mutações obrigatórias

- comando: runner Linux descartável adaptado para psql/env próprios, banco mutante separado quando aplicável; `MUT-12,MUT-34,MUT-35,MUT-40,MUT-41`; restauração SHA e status final.
  saída resumida: MUT-12 `8/7/1/0` vermelha no recibo global entre organizações; MUT-34 `6/5/1/0` vermelha no catálogo FORCE; MUT-35 `8/6/2/0` vermelha nos dois rollbacks de recibo/localização; MUT-40 `5/4/1/0` vermelha no vínculo preso 4 s→503<3 s; MUT-41 `2/0/2/0` vermelha no isolamento/teto do pool. Todas sem `error`, sem P2028, `red=true`, `restoredOk=true`; migrações mutantes aplicaram com status 0.
  veredito parcial: todas as oito mutações obrigatórias MUT-04/05/06/12/34/35/40/41 acusam a propriedade indicada e restauram bytes; nenhum achado de produto nasceu delas.

- comando: série Linux, rodadas 2–10 dos seis testes `-db` numa invocação do runner; somada ao baseline cdx3 como rodada 1.
  saída resumida: rodadas 2–10 todas `ec=0 tests=44 pass=44 fail=0 skipped=0`; durações ms `28455,20728,19364,20463,19783,19284,20446,19315,20893`; com R1 `20507 ms`: N=10, denominador constante, `440/440`, pulos 0.
  veredito parcial: arnês explícito é estável sob banco; isto não sana o achado de que a CI não o convoca.

- comando: gerador T13 direto e com argv virtual L0 no worktree cdx3 antes de `prisma generate`.
  saída resumida: direto `ec=2` com `OPS não derivado do client gerado (N=0)`; virtual `ec=1` sem métrica utilizável.
  veredito parcial: falha ambiental do terreno cdx3, não do objeto; gerar o client sem conexão e repetir.

- comando: `prisma generate` sem conexão e repetição do gerador T13 direto/virtual.
  saída resumida: generate `ec=0`; direto `ec=0`, `L0=108/108/108`, OPS 17, 793 arquivos, inventário 62 e as seis chaves K1–K6 exatas; virtual `ec=1` porque os nomes de fixture usados tinham sufixos inexistentes `.txt`.
  veredito parcial: inventário e K1–K6 reexecutados; argv L0 ainda inválido por erro da chamada, localizar nomes exatos e repetir.

- comando: gerador com fixtures exatas `c2-f2-schema.prisma`, `c2-f2-migration.sql`, `c2-f2-reader.fixture.tsx`.
  saída resumida: `ec=0`; `ENABLE=111 FORCE=111 acessores=111`, OPS 17, 794 arquivos/1 virtual/0 erro.
  veredito parcial: literal L0 111 confirmado na forma exata do subteste.

- comando: controle restaurável: remover somente `FORCE` do recibo no worktree próprio; provar diff `0/1`; gerador virtual; T13 Linux; restaurar por checkout do arquivo exato; comparar hash-object com blob.
  saída resumida: gerador caiu para `ENABLE=111 FORCE=110 acessores=110`; T13 ficou vermelho `35 tests / 33 pass / 2 fail / 0 skipped`, especificamente no subteste `L0 exato` (esperava 111/111/111); migração restaurada e `hash-object=blob=25efd23e...`. Dois logs untracked criados por uma chamada exploratória do runner permanecem identificados para remoção no teardown.
  veredito parcial: vermelho-controle L0 acusa a perda de FORCE; a régua é viva e o literal 111 acompanha a propriedade.

## Teardown e resolução final

- comando: remover os dois containers exatos `jtrc01-a-cdx3-*` com volumes; confirmar processos do worktree=0; `git worktree remove --force C:/Users/AMP/w-jtrc-a3`; medir ocorrência da senha sem imprimi-la; apagar scratch validado; resolver head/PR/main e disco.
  saída resumida: senha em evidência/logs `0`; containers cdx3 após remoção `0`; worktree ausente; scratch/senha ausentes; migração restaurada antes da remoção; PR/head final `5abdf83bfcfcac9f70cb1e1aad1c7a7a7cecbf91`; `origin/main=4fe7524ecbcc68b3e69336453cc774ed5937cb1c`; C: livre `10,70 GB`; em `w-trc01`, as únicas saídas cdx3 são estes dois arquivos untracked.
  veredito parcial: limpeza cdx3 concluída; resíduos de identidades anteriores/outras juntas não foram alvo; base viva e portas proibidas nunca foram tocadas.
