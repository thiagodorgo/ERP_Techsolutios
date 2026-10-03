# VOTO-393-J3-C3 — evidência incremental
Início da instância: 2026-09-30T08:58:36Z
Papel: cadeira C3‴ (fronteira, número, registro, ordem dos commits) · junta 3 · B-GOV-MANDATO · PR #393 ciclo 3
Identidade: jurado-mandato-c3c-fronteira-numero-registro · modelo: Opus 5.5 (claude-opus-5-5), rodando como general-purpose (corpo: model opus)
Corpo aplicado: git show 28b4defdc067387f384e06614e033e0976e9912b:.claude/agents/especialistas/jurado-mandato-c3c-fronteira-numero-registro.md · md5 EOL-neutro (tr -d '\r' | md5sum) = f12be57049331266226d2d89d01935e0 (esperado f12be57049331266226d2d89d01935e0 — CONFERE) · 576 linhas
Regra de terreno: E-11 prevalece sobre l.187 do corpo — NUNCA export MSYS_NO_PATHCONV; prefixo por comando só onde ref:caminho com '/'.
Workdir de medição: $S/j3c3/

## Ambiente (E-11) — medido antes de qualquer artefato
env | grep -c '^MSYS_NO_PATHCONV=' = 0 · git version 2.53.0.windows.2 · node v20.19.5 · uname -srm = MINGW64_NT-10.0-22631 3.6.6-1cdd4371.x86_64 x86_64

## 0. Legalidade do ciclo 3 (em origin/main, não pelo ramo)
git fetch origin ec=0 · origin/main = 3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c
MSYS_NO_PATHCONV=1 git show origin/main:agent-orchestration/controle/decisoes.md → show ec=0
grep -n: l.2633 "## `D-SEM-TETO-AUDITORIA-NO-3` — o teto de ciclos cai; no ciclo 3 audita-se a MÁQUINA (decisão do dono, 2026-09-27)" — PRESENTE
controle positivo: grep -c D-TETO-DOIS-CICLOS = 9 (arquivo certo)
gh pr view 394: MERGED 2026-09-28T19:55:12Z mergeCommit b3f0af5f82aca23502326f18b644a28df3236b5a
gh pr view 395: MERGED 2026-09-28T20:38:23Z mergeCommit 3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c (registro do #394) = origin/main
→ ciclo 3 LEGAL; segue ao mérito.

## Objeto
git rev-parse origin/chore/mandato-refs-e-preflight = 28b4defdc067387f384e06614e033e0976e9912b
gh pr view 393 headRefOid = 28b4defdc067387f384e06614e033e0976e9912b · OPEN · draft=true
(= o que o inspetor liberou, 28b4defd)
bash scripts/mandato-refs.sh 393 (no worktree, sem MSYS_NO_PATHCONV) → ec=3 (approved_head NAO DETERMINAVEL — esperado: PR não aprovado); "head do PR: 28b4defdc067387f384e06614e033e0976e9912b", "merge-base: 3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c", check-runs total=14 nao-verdes=0
Blobs no head 28b4defd: scripts/mandato-refs.sh 474c7521f97dc64d936ecd3751932bda70a6e526 · scripts/mandato-preflight.sh faa408c8e14665c232be518eced6adbfffe3ee7d · tests/mandato-refs.test.ts d455ae1acc639b8b02ab00ea3d86a40329dde1fc · tests/mandato-preflight.test.ts 7a52d37c3a704263ae639d8fa52d07525c9f2a03 · scripts/mandato-mutantes.sh 375492620c64f8bc3b1cc9e61c5f46bbb56a2131
(= triplas declaradas nas ERRATAs E-9(c)/E-10(a): refs 474c7521/d455ae1a/37549262; preflight faa408c8/7a52d37c/37549262)

## Terreno
git worktree add --detach C:/Users/AMP/w-j3c3 28b4defd → ec=0; ls -d OK; HEAD=28b4defd; status --porcelain 0 linhas (antes do 1º cd)
Worktrees alheios presentes (só reportados, não tocados): árvore principal (demo/investidor, 4 M de outra sessão), .claude/worktrees/{b04a,b11,gov-descuido,gov-elenco}, C:/Users/AMP/w-devs393 (d222ce7c), w-devt393 (4ad4ba9f), w-mandato (28b4defd, branch)
MB = git merge-base origin/main 28b4defd = 3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c == git rev-parse origin/main (após fetch) → E-4(a) CUMPRIDA
git merge-base --is-ancestor 3b1fe0f9 28b4defd → ec=0 (E-7(a))
Commits de merge em MB..head (e desde fc3363e3): UM só — 7d02d8daaa0e20a36a6792a8f0af419da5021352, pais e27fbe14649525d92a68ff10bf6d79319b146837 (1º, ramo) e 3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c (2º, main) — "chore(integracao): main (3b1fe0f9) no B-GOV-MANDATO por merge, antes da junta 3"
npm ci --no-audit --no-fund (próprio, no w-j3c3) → ec=0, 326 pacotes; node_modules NÃO é ponto de reparse (fsutil reparsepoint query → "não é um ponto de nova análise") — sem junction
DATABASE_URL=postgresql://x:x@127.0.0.1:1/x npx prisma generate (só no env) → ec=0; git status --porcelain = 0
Contêineres próprios: docker run -d --name pg-j3c3 -p 55433:5432 postgres:16 (ec=0) · docker run -d --name redis-j3c3 -p 56380:6379 redis:7 (ec=0)
  porta livre ANTES: netstat -ano | grep -cE ':(55433|56380) ' = 0
  prova de que ligou: docker exec pg-j3c3 pg_isready → "127.0.0.1:5432 - accepting connections"; redis-cli ping → PONG;
  netstat: "TCP 0.0.0.0:55433 LISTENING" e "TCP 0.0.0.0:56380 LISTENING"; node net.connect 127.0.0.1:55433/56380 → "tcp connect ok" nos dois
  base viva erp-postgres(5432)/erp-redis(6379): nunca alvo (apenas listada por docker ps)
DATABASE_URL=postgresql://postgres:***@127.0.0.1:55433/erp_j3c3 npx prisma migrate deploy → ec=0 "All migrations have been successfully applied." (forma canônica 3 do runner: banco descartável MIGRADO — scripts/run-backend-tests.mjs l.73-74)
KPI 2× lançado em background: $S/j3c3/run-kpi.sh (cwd w-j3c3, CORE_SAAS_PERSISTENCE e MSYS_NO_PATHCONV unset, DATABASE_URL→55433, REDIS_URL→56380), logs npm-test-{1,2}.log, runs.log

## Item 4 — ordem dos commits (base MB=3b1fe0f9)
4a. git log --reverse MB..28b4defd: 74 commits (73 não-merge + 1 merge 7d02d8da). Tabela pos|sha8|classe|nf|t|s ($S/j3c3/class.txt):
    1 f8d5a2c8 TS nf=3 t=1 s=2 | chore(orquestracao): o mandato do orquestrador passa a ser verificavel por maquina
    2 1ae82626 S nf=2 t=0 s=2 | fix(orquestracao): a extracao de SHA colava os SHAs num so, e a mensagem dizia menos do que o script faz
    3 485932a6 R nf=3 t=0 s=0 | docs(orquestracao): comando do B-GOV-MANDATO e a pendencia que a sonda da H3 achou
    4 488ce4d0 R nf=4 t=0 s=0 | chore(kpi): B-GOV-MANDATO com backend REEXECUTADO, e o backfill do #392 pago pela ferramenta nova
    5 203ef750 R nf=2 t=0 s=0 | docs(trilha): B-GOV-MANDATO na trilha — 8 itens de MEDIDO, 4 hipoteses, e a que caiu
    6 1c5437da R nf=1 t=0 s=0 | docs(trilha): limpeza §C5 em 1 linha — e o deslize de ter levado um rastreado junto
    7 e361407b R nf=1 t=0 s=0 | docs(junta): briefing do B-GOV-MANDATO — 3 cadeiras, maioria de 3, e a inelegibilidade do proprio orquestrador
    8 7462b75b R nf=7 t=0 s=0 | chore(junta): os 3 corpos de jurado do B-GOV-MANDATO, e o briefing para de cravar SHA
    9 1b66b444 R nf=1 t=0 s=0 | docs(junta): ata do B-GOV-MANDATO — REPROVADO 2x1, e a ferramenta fabricou o approved_head que existe para impedir
    10 2404e441 R nf=1 t=0 s=0 | docs(reprovacao): R-B-GOV-MANDATO-1 — a classe unica por tras dos 4 bloqueantes, e os 3 erros do orquestrador
    11 8ae12edb R nf=1 t=0 s=0 | docs(decisao): D-NOITE-SEM-TETO — teto de ciclos suspenso nesta noite, com escopo e o que NAO muda
    12 fd36ae08 R nf=1 t=0 s=0 | docs(decisao): D-NOITE-SEM-TETO estreitada as palavras do dono — amanha de manha o teto volta
    13 58801bf0 R nf=1 t=0 s=0 | docs(decisao): D-NOITE-SEM-TETO expira as 07:00 (10:00Z) — hora marcada e regra de corte
    14 d2ae17d3 R nf=2 t=0 s=0 | chore(junta): medidor-de-cobertura-do-artefato — o especialista do ciclo 2 (§C7.4)
    15 ca5e1071 R nf=1 t=0 s=0 | docs(plano): B-GOV-MANDATO ciclo 2 — 5 entregas, 26 criterios com 27 mutacoes, 9 itens saem com dono
    16 43981556 R nf=1 t=0 s=0 | docs(plano): adendo A1 — ata reprovada unica nao vira approved_head; LIDO exige linha explicita (0/107 hoje)
    17 9aa8fc7e R nf=1 t=0 s=0 | docs(ata): titulo do J-B-GOV-MANDATO nomeia o PR #393 — caso vivo do C8, veredito intocado
    18 307b6bf9 S nf=1 t=0 s=1 | fix(gov): mandato-refs.sh — approved_head em TRES estados, insumo validado e saida honesta
    19 cea715da S nf=1 t=0 s=1 | fix(gov): mandato-preflight.sh — cada checagem enuncia a PROPRIEDADE, nao a forma da linha
    20 7b2e9c51 T nf=2 t=2 s=0 | test(gov): os guards passam a exercitar o .sh de verdade, nunca uma replica
    21 3421840e R nf=5 t=0 s=0 | docs(gov): emenda do ciclo 2 no comando, uma pendencia fechada e tres abertas com dono
    22 1c8aab48 R nf=4 t=0 s=0 | chore(kpi): B-GOV-MANDATO ciclo 2 — backend 3103/3105 reexecutado, N=2 (§C3)
    23 eec2deb4 R nf=4 t=0 s=0 | chore(kpi): N=4 no denominador e o CI verde no head final; +2 fronteiras que o dogfooding mediu
    24 80a1c5f1 R nf=1 t=0 s=0 | docs(gov): fronteira 8 — um md5 tem 32 hex e cai na faixa de SHA da checagem 4
    25 5ea761a6 R nf=1 t=0 s=0 | docs(plano): B-GOV-ATA-CABECALHO e B-GOV-MANDATO-2 entram na fila — divida D-4 que o dev devolveu
    26 29a4f76b R nf=2 t=0 s=0 | docs(pendencia): P-GOV-MANDATO-2-FRONTEIRAS conta oito e numera em ordem — ressalva R3 do inspetor
    27 ec425eee R nf=2 t=0 s=0 | chore(junta): jurado-mandato-c3b-fronteira-numero-registro — cadeira C3 nova, a do ciclo 1 foi bloqueada por contaminacao
    28 4beee694 R nf=1 t=0 s=0 | docs(junta): briefing do ciclo 2 — os 3 enunciados que so existiam no chat, e por que a C3 do ciclo 1 saiu
    29 4c8819ef R nf=1 t=0 s=0 | docs(junta): CORRECAO — a 5432 e a base viva deste projeto, nao de outro; e a faixa 58284-58483 nao e excluida
    30 34969a81 R nf=1 t=0 s=0 | docs(junta): ata do ciclo 2 — REPROVADO 2x1; o conserto do C2-02 nao tem teste, e removê-lo ressuscita a fabricacao
    31 5bd54f03 R nf=1 t=0 s=0 | docs(plano): B-GOV-MANDATO ciclo 3 — 5 entregas, e os 5 mecanismos contra o remedio nascer com a doenca
    32 b334c3b9 R nf=6 t=0 s=0 | docs(errata): as duas falsidades de terreno retratadas NOS CORPOS, nao so no briefing — achado C3b-02
    33 61302337 R nf=2 t=0 s=0 | docs(reprovacao): R-B-GOV-MANDATO-2 e a errata C3b-03 — houve informacao nova entre os ciclos, e isso importa para o gatilho
    34 cb9c360a R nf=1 t=0 s=0 | docs(plano): ciclo 3 v2 — approved_head vira TOKEN RESERVADO, e particao so e segura para regra universal
    35 7ec2576b R nf=1 t=0 s=0 | docs(plano): ciclo 3 v3 — quem move a fronteira e o autor, nos DOIS sentidos; e as linhas que o slicing apagou voltaram
    36 6c8fb3e8 T nf=1 t=1 s=0 | test(gov): E1 — as 7 clausulas de validacao de insumo do refs ganham insumo e caso (V1..V15)
    37 4ad4ba9f T nf=1 t=1 s=0 | test(gov): E3 — o laco de FORMAS, os fixtures das duas rodadas do critico, e 13 sondas que nao discriminavam
    38 f35fc028 R nf=1 t=0 s=0 | docs(plano): emenda §12 — 5 divergencias do Dev-T acatadas, contrato de mensagens, e o buraco da E2.b que a leitura dos testes revelou
    39 33356358 S nf=1 t=0 s=1 | feat(gov): pre-voo v3 — oraculo unico, agregacao por estrutura e approved_head como token reservado (B-GOV-MANDATO ciclo 3, E2)
    40 616fd4fa S nf=1 t=0 s=1 | feat(gov): E4 — cobertura por mutacao virou comando, com os controles que a impedem de ser teatro
    41 72214ff7 S+outros nf=5 t=0 s=1 | docs(gov): KPI do ciclo 3 por execucao real, a contradicao [B8b] aberta com dono, e a nona fronteira
    42 1466c7d9 S+outros nf=4 t=0 s=1 | fix(gov): os dois controles da E4 acharam defeito NA PROPRIA E4, e os dois consertos tem a prova
    43 714d4815 R nf=5 t=0 s=0 | docs(gov): a matriz de mutacao do refs COMPLETA (89%), os 5 buracos com nome, e o custo do pre-voo medido
    44 d222ce7c R nf=6 t=0 s=0 | fix(kpi): o custo do pre-voo era PROJECAO minha, nao medicao — o unitario medido estoura o plano em 2,5x
    45 b757e278 R nf=1 t=0 s=0 | docs(plano): correcao do D-4 — 3 falsos VERMELHOS e 1 falso VERDE no pre-voo, medidos por comm entre TAPs (estava presa no disco)
    46 399ce357 R nf=1 t=0 s=0 | docs(plano): §13 — [B8b] errado por transcricao da E2.b, o detector do ciclo 2 sai, Dev-T-3 e Dev-S-2 nomeados, E4 do zero com base 0
    47 9d3de5dd T nf=2 t=2 s=0 | test(gov): Dev-T-3 — [B8a..c] na semantica v3 (token reservado), [B8d] novo, e os 5 nao-cobertos do refs ganham caso (V16..V19)
    48 c32f77b5 S nf=2 t=0 s=2 | fix(gov): Dev-S-2 — o detector do ciclo 2 sai do pre-voo, e a E4 aborta com linha de base suja
    49 e4aa7592 R nf=6 t=0 s=0 | docs(junta): as 3 cadeiras da junta 3 do B-GOV-MANDATO, nos dois espelhos
    50 4e70d343 R nf=1 t=0 s=0 | docs(plano): §14 do ciclo 3 do B-GOV-MANDATO — emenda pos-fabrica
    51 e27fbe14 R nf=6 t=0 s=0 | docs(junta): ERRATAs E-1..E-6 do plano §14.13 nos 3 corpos da junta 3, dois espelhos
    52 7d02d8daaa0e20a36a6792a8f0af419da5021352 MERGE np=2 | chore(integracao): main (3b1fe0f9) no B-GOV-MANDATO por merge, antes da junta 3
    53 c7eef1fd R nf=1 t=0 s=0 | docs(plano): §14.14 do ciclo 3 — as ressalvas do porteiro do #395 no escopo do #393
    54 f8d84376 R nf=2 t=0 s=0 | docs(junta): ERRATA E-7 do plano §14.14 no corpo da C3''', dois espelhos
    55 395d07c9 T nf=1 t=1 s=0 | test(mandato): [V18b]/[V18c] cobrem l.119 e l.116 do refs tambem em win32
    56 cffc4401 R nf=1 t=0 s=0 | docs(plano): §14.15 do ciclo 3 — o mutante da l.161 que nao termina, e o protocolo para ele
    57 ade74d09 R nf=4 t=0 s=0 | docs(junta): ERRATA E-8 do plano §14.15 nos corpos da C2''' e da C3''', dois espelhos
    58 a737250a R nf=10 t=0 s=0 | docs(registro): K1 do ciclo 3 — KPI do #393 recontado pos-integracao, R-A/R-B do #395 e as pendencias do §14.12
    59 ea716ad4 R nf=1 t=0 s=0 | docs(plano): §14.16 do ciclo 3 — o [V18] deixa de pular no win32 antes da junta
    60 190e2300 T nf=1 t=1 s=0 | test(mandato): [V18] roda em toda plataforma, sem skip em win32 (plano §14.16)
    61 66fa980e R nf=1 t=0 s=0 | docs(plano): §14.17 do ciclo 3 — o comentario do guard que ficou falso com o T5
    62 396643aa T nf=1 t=1 s=0 | test(mandato): o comentario do bloco do Dev-T-4 deixa de dizer que o [V18] pula no win32
    63 dcbe56a8 R nf=1 t=0 s=0 | docs(plano): §14.18 do ciclo 3 — os 16 nao-cobertos do pre-voo, um a um
    64 9e8cf1cd T nf=1 t=1 s=0 | test(mandato): os 13 nao-cobertos do pre-voo ganham caso, um por ponto (plano §14.18)
    65 371961ac R nf=1 t=0 s=0 | docs(registro): K2a do ciclo 3 — os 3 mutantes equivalentes do pre-voo (245, 318, 336), no formato da ferramenta
    66 4794169a R nf=4 t=0 s=0 | chore(kpi): K1b do ciclo 3 — backend 3403/3405 recontado apos T5/T6/T7, ec=0 e sem o guard de skip
    67 83ca98b3 R nf=1 t=0 s=0 | docs(plano): §14.19 do ciclo 3 — o ambiente da medicao entra na identidade da matriz
    68 4b164396 R nf=6 t=0 s=0 | docs(junta): ERRATAs E-9, E-10 v2 e E-11 nos corpos da junta 3, dois espelhos
    69 7e4ac5d1 R nf=10 t=0 s=0 | docs(registro): K2b do ciclo 3 — matrizes publicadas (refs-3 e pre-voo A+B com lema), [M-1]=0 derivado, fronteiras 26 e 27
    70 af8b4eac R nf=2 t=0 s=0 | docs(junta): registro da junta 3 do B-GOV-MANDATO — briefing do ciclo 3 e o parecer do porteiro do #395
    71 1f0d0e11 R nf=1 t=0 s=0 | docs(plano): §14.20 do ciclo 3 — fronteira 28, o equivalente contado sem conferir id
    72 ebcc8fdf R nf=4 t=0 s=0 | docs(junta): ERRATA E-12 do plano §14.20 nos corpos da C2''' e da C3''', dois espelhos
    73 cac98ded R nf=4 t=0 s=0 | docs(registro): K2c do ciclo 3 — a fronteira 28 numerada nos tres lugares (mutantes §7 item 10, P-GOV-MANDATO-3-FRONTEIRAS, Emenda 7)
    74 28b4defd R nf=1 t=0 s=0 | docs(junta): briefing do ciclo 3 acompanha a §14.20 — ERRATA E-12 e fronteira 28
4b. SHAs curtos do plano resolvidos por git rev-parse --verify (todos 'commit', nenhum ambíguo): 6c8fb3e8→6c8fb3e8817dd11dca2c8bbdeaab83d446b21ea0 · 4ad4ba9f→4ad4ba9f52c6668e676a069d66e1a56ef67618b5 · 33356358→33356358ff444a20e34df93986a7ae50851612a4 · 616fd4fa→616fd4faf2ab1375983ae255d18cddba8ce139b1 · 9d3de5dd→9d3de5dd08b1b6b18021ad045acdc82eb918abed · c32f77b5→c32f77b5b36f49b3cf9951a481caaab0efa35a4f · 1466c7d9→1466c7d9f43b207e9dae1f167d697a0c47ace279 · 7d02d8da→7d02d8daaa0e20a36a6792a8f0af419da5021352
  Identificação dos papéis: pela trilha (grep do SHA nos relatórios do scratchpad) + pelo que tocam + worktrees:
   Dev-T: 6c8fb3e8, 4ad4ba9f (DEV-T-CICLO3.md; worktree w-devt393@4ad4ba9f) — T,T
   Dev-S: 33356358, 616fd4fa (DEV-S-CICLO3.md.bak, 1ª instância, l.14/179); 72214ff7,1466c7d9,714d4815,d222ce7c (2ª instância: consecutivos 41-44, d222ce7c = "head do PR" no DEV-S-CICLO3.md l.357; worktree w-devs393@d222ce7c) — S,S,S+outros,S+outros,R,R
   Dev-T-3: 9d3de5dd (DEV-T3-CICLO3.md) — T · Dev-S-2: c32f77b5 (DEV-S2-CICLO3.md) — S; K1 a737250a, K2a 371961ac, K1b 4794169a, K2b 7e4ac5d1, K2c cac98ded (DEV-S2-K1/K1b/K2b/K2c) — R
   Dev-T-4: 395d07c9 (T4), 396643aa (T6) — T · Dev-T-5: 190e2300 (T5) — T · Dev-T-6: 9e8cf1cd (T7) — T  (classe T sem par de script: E-4(c), E-9(b), E-10(b))
  Ordem por par (posição no log E ancestralidade no DAG):
   OK 6c8fb3e8(36)/4ad4ba9f(37) antes de 33356358(39)/616fd4fa(40); merge-base --is-ancestor nos 4 pares ec=0, inverso ec=1
   OK 9d3de5dd(47) antes de c32f77b5(48); is-ancestor ec=0, inverso ec=1 → "ORDEM POR PAR: CUMPRIDA"
  ⇄ vermelho-controle: cópia da tabela com 4ad4ba9f↔616fd4fa trocados → "INVERTIDO 4ad4ba9f(pos 40) depois de 33356358(pos 39)", "ORDEM POR PAR: VIOLADA"; cópia com 9d3de5dd↔c32f77b5 → "INVERTIDO … [Dev-T-3 -> Dev-S-2]", VIOLADA. ACUSOU.
4c. Papel de teste (7 commits) scripts=0 em todos; papel de script/registro (12 commits) tests=0 em todos.
   TS entre não-merge MB..head: UM — f8d5a2c8 (2026-09-25 16:35, ciclo 1, "chore(orquestracao): o mandato do orquestrador passa a ser verificavel por maquina", A scripts/mandato-preflight.sh, A scripts/mandato-refs.sh, A tests/mandato-refs.test.ts). É o commit de nascimento do bloco (ciclo 1), anterior à regra §8.2/§4 do ciclo 3 (que é "Regras para os dois devs" Dev-T/Dev-S) e anterior ao mecanismo 1 do §0.5; nenhum commit do ciclo 3 é TS. → nota (C3c-N1)
   ⇄ vermelho-controle: o classificador marca TS em f8d5a2c8 (acima) e no commit histórico da main aadaa6d5 (t=10 s=1). ACUSOU.
   Merge 7d02d8da: julgado pela resolução (ver seção merge) — remerge-diff toca 9 arquivos, nenhum em tests/ ou scripts/.
4d. git merge-base --is-ancestor <sha> 28b4defd: 4ad4ba9f ec=0 · 616fd4fa ec=0 · 1466c7d9 ec=0. Controle: origin/fix/inventory-consistency (bc3e736b) → ec=1. Integração por merge (1 commit de merge, 2 pais) — não rebase.

## Item 1a — lista proibida GERADA (nunca digitada)
Fonte 1: git show 28b4defd:CLAUDE.md | awk '/^## C4\./,/^## C5\./' → trecho 'não tocar:' extraído por sed:  `prisma/**`, `migrations/**`, `infra/**`, `.env`, lockfiles JS, `pubspec.yaml/lock`, Figma.
  backticks (5): prisma/** migrations/** infra/** .env pubspec.yaml/lock · prosa (2): lockfiles JS, Figma
Fonte 2: plano §4, parágrafo que começa em '**PROIBIDO (a todos):**' (8 linhas, awk até linha vazia) → 27 itens entre crases (nl): src/** prisma/** migrations/** frontend/** mobile/** .github/** infra/** .env pubspec.yaml pubspec.lock CLAUDE.md AGENTS.md .gitattributes scripts/* tests/* omega/juntas/ TEMPLATE-J-ata.md docs/revisoes/SAN3/PLANO_SAN3.md B-GOV-MANDATO-2 b04a b11 gov-descuido gov-elenco w-mandato w-teto tests/** scripts/**
Classificação: pathspec testável = src/** prisma/** migrations/** frontend/** mobile/** .github/** infra/** .env pubspec.yaml pubspec.lock CLAUDE.md AGENTS.md .gitattributes TEMPLATE-J-ata.md PLANO_SAN3.md; prosa convertida por enumeração: lockfiles JS = ls-tree MB (frontend/package-lock.json package-lock.json portals/authority-portal/package-lock.json portals/owner-portal/package-lock.json) · arquivos-base da raiz = PRODUCT_CONTEXT/RBAC_MATRIX/APPROVAL_LIMITS/DESIGN_SYSTEM/COMPONENT_LIBRARY.md (CLAUDE.md §A1.2, presentes em MB) · 'as 107 outras atas' = J-*.md em MB = 108 (0 são J-B-GOV-MANDATO; eram 107 em fc3363e3; head tem 109 — o '107' do plano é retrato de fc3363e3) · 'outro scripts/*' = scripts/** menos os 3 nomeados (:(exclude)) · 'outro tests/*' = tests/** menos os 2 nomeados · Figma = :(glob)**/*.fig · worktrees b04a/b11/gov-descuido/gov-elenco = .claude/worktrees/** · 'corpos das 6 cadeiras' = por blob (abaixo) · 'tests/** p/ Dev-S e scripts/** p/ Dev-T' = por commit (item 4c)
NÃO TESTADAS (declaradas, com nome): 'B-GOV-MANDATO-2' (não é caminho — é contexto da prosa do PLANO_SAN3) · worktrees w-mandato e w-teto (fora da árvore do repositório; não há pathspec) · 'omega/juntas/' cru (convertido na enumeração das atas; o diretório inteiro NÃO é proibido — a ata e o briefing do bloco estão PERMITIDOS)
Laço contra git diff --name-only MB 28b4defd ($S/j3c3/laco.sh) — entrada | N:
    src/**                                        | 0
    prisma/**                                     | 0
    migrations/**                                 | 0
    frontend/**                                   | 0
    mobile/**                                     | 0
    .github/**                                    | 0
    infra/**                                      | 0
    .env                                          | 0
    pubspec.yaml                                  | 0
    pubspec.lock                                  | 0
    CLAUDE.md                                     | 0
    AGENTS.md                                     | 0
    .gitattributes                                | 0
    TEMPLATE-J-ata.md                             | 0
    docs/revisoes/SAN3/PLANO_SAN3.md              | 1
    PROSA lockfiles JS                            | 0
    PROSA Figma                                   | 0
    PROSA arquivos-base da raiz                   | 0
    PROSA as 107 outras atas                      | 0
    PROSA outro scripts/*                         | 0
    PROSA outro tests/*                           | 0
    PROSA worktrees alheios b04a/b11/gov-descuido/gov-elenco | 0
⇄ vermelho-controle (i): lista + 'CONTROLE scripts/' → N=3. ACUSOU.
⇄ vermelho-controle (ii): o MESMO laço sobre o par histórico A=0a398246 (git rev-list -1 origin/main -- src/app.ts), A^..A → src/** 34, prisma/** 2, migrations/** 1, frontend/** 1→3, mobile/** 2, .github/** 1, atas 3, outro scripts/* 2, outro tests/* 19. ACUSOU (o ** extraído é pathspec que o git entende; :(exclude) funciona).
Único casamento > 0: docs/revisoes/SAN3/PLANO_SAN3.md = 1 → blob MB fe1e8910 · 34969a81 0e8f5018 · head 0e8f5018 (IGUAL ao ciclo 2); tocado só por 5ea761a6 (2026-09-26, ciclo 2, +2 linhas: B-GOV-ATA-CABECALHO e B-GOV-MANDATO-2 na fila); autorizado pelo plano do ciclo 2 l.546 e pelo comando l.255; o PROIBIDO do ciclo 3 diz 'nada a fazer' e o ciclo 3 nada fez → coberto (1b).
Corpos das 3 cadeiras SEM falsidade (blob 34969a81 = head, 2 espelhos): c1-prevoo .claude 8def941f=8def941f, .agents 5dec4221=5dec4221 · c2-pergunta .claude bb63924e=, .agents cf9ce349= · guardiao-fail-closed .claude 06a39978=, .agents 9290443e= (e = MB). Controle: medidor (com ERRATA) 398f84cc ≠ 4ddacba8 — a comparação discrimina.
(correção de digitação minha na linha do controle (ii) acima: frontend/** = 3 no par histórico; o "1→3" foi erro de escrita, não de medição — a saída bruta está em $S/j3c3/ e é reproduzível)

## Item 3a — índice pelo gerador
git ls-files | grep -i indice → agent-orchestration/controle/gerar-indice-pendencias.py (NÃO em scripts/), agent-orchestration/controle/pendencias-indice.md
Gerador lê/escreve caminhos RELATIVOS ao cwd (l.41-42: P='agent-orchestration/controle/pendencias.md', O='…/pendencias-indice.md'). Rodado sobre cópia do blob do head em $S/j3c3/gen/ (git cat-file -p 28b4defd:… ; python 3.13.14) → ec=0, "indice: 429 cabecalhos / 418 IDs | {'FECHADA': 115, 'ABERTA': 314}"
norm() { tr -d '\r' < "$1" | md5sum | cut -d' ' -f1; }: gerado=7ec424c0df1a56d35e292c7812748ae3 · blob head=7ec424c0df1a56d35e292c7812748ae3 · árvore do worktree=7ec424c0df1a56d35e292c7812748ae3 → índice = saída do gerador
⇄ vermelho-controle (i): 1ª tentativa NÃO acusou — a minha fixture usou '## `P-…`' com crases e o gerador casa '## (P-…)' (l.87); erro MEU de fixture, registrado. 2ª com o formato da fonte ('## P-CONTROLE-J3C3-INEXISTENTE (2026-09-30) — … — BAIXA'): "430 cabecalhos / 419 IDs", md5 5062d410… ≠ 7ec424c0… → ACUSOU
⇄ vermelho-controle (ii): cópia com EOL trocado (67654 → 68171 bytes, od -c mostra \r) → mesmo md5 (neutra); cópia com 1 caractere alterado na l.1 (Indice→Indicf, diff não vazio) → md5 diferente (discriminante). ACUSOU nas duas direções.
(Reexecução dentro do próprio worktree com restauração fica para depois do KPI, para não escrever na árvore com a suíte rodando.)

## Item 3c — cada fronteira: pendência × cabeçalho (lista GERADA do plano do head, tr -d '\r')
Gerada por script: §3 tabela (awk entre '## §3 ' e '## §4 ', linhas '| N |') → 9 10 11 13 14 15 16 17 18 19 20 (+5, que é da P-GOV-MANDATO-2-FRONTEIRAS item 5, vigente) · §13.7 parágrafo 'Fronteiras novas desta emenda' → 21 22 23 · §14 menções 'fronteira N' → 23 24 25 26 27 28 (+18 citada, +99 = o controle do §14.20.3). A 12 não existe (§3 l.863 'não existe na v3').
Critério (E-2/E-8/E-10/E-12): 9–11, 13–22, 24–28 NA PENDÊNCIA; 23 como retirada; cabeçalho = fato com linha; ausência no cabeçalho tem de estar no item 'cabeçalho congelado'.
Pendência P-GOV-MANDATO-3-FRONTEIRAS = l.9891 do pendencias.md do head. Cabeçalhos: pré-voo l.1-117 (1ª não-comentário l.118 'set -u'), mutantes l.1-69, refs l.1-90. Tabela (fr | bullet na pendência | retirada | cab.pré-voo 'fronteira N' | cab.mutantes | cab.refs):
    fr | pendencia(bullet) | retirada | cab.pre-voo (fronteira N) | cab.mutantes | cab.refs
    9 | 9896 | - | 0 | 0 | 0
    10 | 9897 | - | 60, | 0 | 0
    11 | 9898 | - | 109, | 0 | 0
    13 | 9899 | - | 0 | 0 | 0
    14 | 9900 | - | 0 | 0 | 0
    15 | 9901 | - | 0 | 0 | 0
    16 | 9902 | - | 96, | 0 | 0
    17 | 9903 | - | 20, | 0 | 0
    18 | 9904 | - | 106, | 0 | 0
    19 | 9905 | - | 0 | 0 | 0
    20 | 9906 | - | 110, | 0 | 0
    21 | 9907 | - | 0 | 0 | 0
    22 | 9908 | - | 0 | 0 | 0
    23 | AUSENTE | 9914 | 0 | 0 | 0
    24 | 9909 | - | 0 | 0 | 0
    25 | 9910 | - | 0 | 0 | 0
    26 | 9911 | - | 0 | 0 | 0
    27 | 9912 | - | 0 | 0 | 0
    28 | 9913 | - | 0 | 0 | 0
    99 | AUSENTE | - | 0 | 0 | 0
Por CONTEÚDO (não por número) no cabeçalho do pré-voo, conferido lendo a linha: 13 → l.107 '`###` dentro das secoes e isento da checagem 3 (e SO dela)' · 21 → l.69 '`caixa-exata:` isenta as invocacoes DO SEGMENTO QUE O CONTEM' · 19 parcial → l.94 '(parcial, editado ou DESATUALIZADO: o head andou)' — batem com o que a tabela da pendência declara (l.60/109/107/96/20/106/94/110/69).
Item 'cabeçalho congelado' (l.9915) nomeia, por contagem de ocorrência do número (excluídos §x e l.x): 9✓ 14✓ 15✓ 19✓ 22✓ 24✓ 25✓ 26✓ 27✓ 28✓ · 13 e 21 não nomeados porque presentes por conteúdo (plano §14.2 'por conteúdo também 13 (l.107), 21 (l.69)'). Toda ausência por número/conteúdo está nomeada → critério E-2 CUMPRIDO.
23: bullet AUSENTE, 'retirada — a 23' l.9914 ([V18b]/[V18c], 395d07c9) — conforme E-2.
⇄ vermelho-controle: 99 injetado na lista gerada → AUSENTE na pendência, 0 nos três cabeçalhos. ACUSOU.
Fronteira 28 nos três lugares (§14.20.3), git grep -n 'fronteira 28' 28b4defd: ciclo3-mutantes.md l.883 · pendencias.md l.9913 · comando l.390 · controle 'fronteira 99' → 0 ocorrências (git grep sem saída) nos três.

## Item 3b — pendências (pendencias.md do head, blob via git cat-file; índice do head)
| ID | l. | status | sev | dono | índice (seção) |
| P-GOV-MANDATO-3-FRONTEIRAS | 9891 | ABERTA (K1, Dev-S-2) | BAIXA | B-GOV-MANDATO-2 | ABERTAS · balde B |
| P-GOV-MANDATO-3-B8B-CONTRADICAO | 9842 | FECHADA 2026-09-29 (K1) | ALTA | papel do guard | FECHADAS |
| P-GOV-MANDATO-3-MUTANTES-REFS | 9856 | FECHADA 2026-09-30 (K2b) | MÉDIA | papel do guard do refs | FECHADAS |
| P-GOV-MANDATO-3-MUTANTES-PREFLIGHT | 9874 | FECHADA 2026-09-30 (K2b) | MÉDIA | B-GOV-MANDATO ciclo 3 (K2) | FECHADAS |
| P-GOV-MANDATO-2-FRONTEIRAS | 9823 | ABERTA | BAIXA | B-GOV-MANDATO-2 | ABERTAS · balde B |
| P-KPI-NOTAS-CARREGADAS-REGRESSAO-392 | 9987 | FECHADA 2026-09-29 (K1) | BAIXA | #393 | FECHADAS |
Todas presentes nos DOIS lugares (pendência e índice) — nenhuma presente num e ausente no outro.
Escopo: MUTANTES-REFS declara escopo por ponto (l.379 dentro-do-bloco; 4 de ambiente pre-existente "preâmbulo de ambiente do script desde o ciclo 1"); KPI-NOTAS declara pre-existente COM evidência (difflib b8cd22df #391 × fc3363e3 #392). FRONTEIRAS, B8B e MUTANTES-PREFLIGHT não têm linha 'escopo:' — a origem (data + ciclo 3 do bloco) está na linha de status/cabeçalho; sem declaração contam como dentro-do-bloco, que é o que são. → nota (C3c-N2)
B8B — teste de encerramento REEXECUTADO como a pendência o escreve, parte (2) (a parte (1) é o TAP da suíte, item 2):
  fixture minha "- approved_head: `111…1` medido por: true" (## MEDIDO/## HIPOTESE), shims MEUS no formato do guard (l.54-100), bash scripts/mandato-preflight.sh <fx> 393, timeout 60:
    refs-nd     | head faa408c8 | ec=1 | REJ=1 | 'token reservado'=1 | 'fora da colagem'=1 | msg velha 'rotula … como approved_head'=0
    refs-lido-A | head          | ec=1 | REJ=1 | 1 | 1 | 0
    refs-lido-B | head          | ec=1 | REJ=1 | 1 | 1 | 0
  ⇄ vermelho-controle (o pai de c32f77b5, blob do pré-voo antes da remoção do detector): ND → REJ=2 msg velha=1 · LIDO-A → REJ=1 · LIDO-B → REJ=2 msg velha=1 (bate com a tabela do §13.1). ACUSOU.
  grep -cE 'rotulo_ah|LIDOSHA|EST7' no head = 0 · no pai de c32f77b5 = 11.
MUTANTES-REFS — registro × arquivo (…-mutantes.md §3, blob do head): tripla 474c7521/d455ae1a/37549262, base fail=0 de tests=39, skipped 0; contagem por script da §3.2 verbatim: 99 linhas = VERMELHO 46 · NÃO-COBERTO 0 · EXCLUIDO 52 · ANOMALIA 1 (l.164) = "N=46 K=46 NAO-COBERTOS=0 EXCLUIDOS=52 ANOMALIAS=1". Por linha: 115 M1 fail=1 VERMELHO · 116 M3 fail=1 VERMELHO · 119 M3 fail=1 VERMELHO · 160 M1 fail=1 VERMELHO · 379 M3 fail=1 VERMELHO — a pendência lista 116 e 119 como DOIS pontos e a matriz também (dois VERMELHOS); o "ou 1, o l.116/119" do §13.4 está revogado (E-4(e)); fechada com NC=0. Registro = arquivo.
MUTANTES-PREFLIGHT — [M-1] REFEITO POR CONJUNTOS (E-12), da matriz verbatim do head (…-mutantes.md §4.1 l.297-512 = A; §4.3 l.534-589 = B):
  A (162 linhas): VERMELHO 87 · NÃO-COBERTO 16 · EXCLUIDO 57 · ANOMALIA 2 (161 ANOMALIA-DENOMINADOR = TIMEOUT; 340 ANOMALIA-DIFF)
  NÃO-COBERTOS de A = 165 182 187 188 189 190 245 249 255 318 336 393 514 515 520 523 (16) · pontos de B = os mesmos 16 → diff VAZIO
  B: VERMELHO 13 · NÃO-COBERTO 3 = 245 318 336
  diff <(ids de docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-equivalentes.txt, blob 9c691363 | sort -n) <(NÃO-COBERTOS de B) → VAZIO
  ⇄ vermelho-controle: cópia do arquivo + '999: x (f)' → diff acusa "< 999" (ec=1); a contagem que a ferramenta usa (l.311, grep -cE '^[0-9]+:.*\(.+\)') vai de 3 para 4 e não confere id — é a fronteira 28 vista. ACUSOU.
  DERIVADO por mim: N=103 K=100 NAO-COBERTOS=3 (equivalentes conferidos por id: 3) EXCLUIDOS=57 ANOMALIAS=2 → [M-1] = 3 − |ids ∩ NC| = 0 — IGUAL ao publicado (…-mutantes.md l.289 e l.623; pendência; Emenda 7; history).
  Premissas do lema (E-10(b)), por execução: (a) pré-voo faa408c8 e ferramenta 37549262 em c32f77b5 (A), 4794169a (B) e no head; guard 3d875a54 em A, 7a52d37c em B e no head · (b) git diff --numstat 3d875a54 7a52d37c = "245 0" · (c) declarações de topo duplicadas em 7a52d37c = 0 (controle: duplicar uma 'function' existente numa cópia → 1, ACUSOU) · (d) 59 linhas '+' de coluna 0: 13 test( (0 nomes pré-existentes em 3d875a54), 3 function (cercaForaDasSecoes, foraListadas, tipoNaRaiz — 0 ocorrências em 3d875a54), 24 '//' + 3 '/** */' comentários, 16 fechamentos ('});'×13, '}'×3); 0 const/let/var · (e) "LINHA DE BASE medida na copia pristina: fail=0 de tests=312" consta no verbatim de B (a reexecução de B é da C2‴).
P-GOV-MANDATO-2-FRONTEIRAS: anotação do ciclo 3 item 2 presente (--ignore-case reconhecido, "fecha PELA METADE", Select-String/findstr seguem, contagem OITO inalterada) — E5 cumprida.
P-KPI-NOTAS-CARREGADAS-REGRESSAO-392 (E-4(f)): FECHADA; kpis-latest.json do head — as 4 métricas (backend_contract_tests_focused 34 ← #359, flutter_modules 17 ← #98, mobile_backend_contracts 18 ← #103, mobile_core_saas_contracts 21 ← #103) têm nota "[B-GOV-MANDATO ciclo 3 … CARREGADO sem reexecução neste PR (#393); último valor oficial: PR #n …]".

## Merge de integração 7d02d8da — conferido contra os DOIS pais (§14.6.3 + E-4(b) + E-7(c))
M=7d02d8daaa0e20a36a6792a8f0af419da5021352 · M^1=e27fbe14649525d92a68ff10bf6d79319b146837 (ramo) · M^2=3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c (main) · MB_antes=git merge-base M^1 M^2=fc3363e38aabd77f54e6b53034128182f8000571 · único commit de merge em MB..head
Arquivos resolvidos MEDIDOS (git show --remerge-diff --name-only M): 9 = Kpis/app.js, Kpis/kpis-history.json, Kpis/kpis-history.md, Kpis/kpis-latest.json, agent-orchestration/codex/log-execucao.md, controle/decisoes.md, controle/pendencias-indice.md, controle/pendencias.md, docs/status-geral.md — = os 9 da E-7(c) (os 7 do §14.6 + log-execucao + status-geral). Nenhum em tests/ ou scripts/ → a regra "nenhum commit toca tests/** e scripts/** juntos" aplicada pela resolução: cumprida.
(1) git diff --name-only M^2 M = 37 arquivos (o delta do bloco contra a main no ato); -- CLAUDE.md AGENTS.md = 0, controle -- scripts tests = 5.
(2) git diff --name-only M^1 M (32) ⊆ git diff --name-only MB_antes M^2 (32): comm -23 = vazio — nada entrou pelo merge além do que a main tem.
(3) Trazidos pela main SEM conflito (32−9=23): blob(M) = blob(M^2) nos 23 (git rev-parse), 0 DIFERE.
(4) Nos 9: marcadores de conflito ^(<<<<<<<|=======|>>>>>>>) = 0 em todos; kpis-history.json e kpis-latest.json em M parseiam (JSON.parse OK).
    União por conjuntos (cabeçalhos ^#{1,4} únicos, tr -d '\r'): decisoes.md p1=118 p2=118 M=119 perdidos 0/0 novos 0 · pendencias.md 517/518/525 0/0/0 · kpis-history.md 136/134/137 0/0/0 · log-execucao.md 265/259/266 0/0/0 · status-geral.md 279/277/280 0/0/0
    kpis-history.json (chave pr|snapshot_date|version): p1=166 p2=164 M=167, perdidas 0/0, novas 0; só no ramo: 393×3; só na main: 394|2026-09-28|B-GOV-SEM-TETO; pr394 em M com merge_commit b3f0af5f…
    Única escolha de conteúdo dentro de um campo: backfill_note da entrada pr 392 — o ramo dizia "PAGO pelo B-GOV-MANDATO (#393) em 2026-09-25", a main "PAGO pelo #394"; M ficou com o da main. merge_commit/approved_head da entrada pr 392 idênticos nos dois pais (fc3363e3…/7822deaf…) — a resolução não mudou valor, e o texto do ramo tinha deixado de ser verdade (o #394 mergeou primeiro). Não é perda de entrada. → nota (C3c-N3)
    pendencias-indice.md em M = saída do gerador em M (cópia; gerador 53e94d89 igual em M^1/M^2/M/head): md5 EOL-neutro 00bc7a5e… = 00bc7a5e… 
    Kpis/kpis-latest.json em M = blob de M^2 (69548794 = 69548794; M^1 = e516ff54) · Kpis/app.js em M = blob de M^2 (e2d7b996 = e2d7b996; M^1 = 198882b4) → E-4(b) CUMPRIDA
    kpi-freeze --check em M (cópia de scripts/kpi-freeze.mjs + Kpis/{kpis-latest.json,app.js} de M) → ec=0 "em dia (snapshot 2026-09-28)"; no head → ec=0 "em dia (snapshot 2026-09-30)"
(5) remerge-diff publicado em $S/j3c3/remerge-diff.txt (382 linhas; por arquivo: history.md +4/−7, history.json +2/−6, índice +15/−34, decisoes +1/−3, latest.json +1/−34, log −3, pendencias −3, app.js −4, status −3 — marcadores e o lado não escolhido do latest/app.js).
⇄ vermelho-controle: cópia dos cabeçalhos de M do decisoes.md sem o de D-SEM-TETO-AUDITORIA-NO-3 → "perdidos de p2 = 1" (o cabeçalho). Cópia das chaves do history.json de M sem a entrada 394 → "perdidas p2 = 1". ACUSOU.
⇄ vermelho-controle kpi-freeze: cópia do latest do head com "value": 3403 → 3404 (diff prova l.30) → --check ec=1 "DIVERGE". ACUSOU. (1ª tentativa com o padrão sem espaço não substituiu — diff vazio, descartada antes de ler a cor.)

## Item 1b — do DIFF para a declaração (git diff --name-status MB 28b4defd = 41 arquivos; 3-dot origin/main...head = 41)
Por arquivo: blob em 34969a81 (fim do ciclo 2) × head, e os commits first-parent de 34969a81..head que o tocaram ($S/j3c3/diff-c3.txt):
 IGUAIS ao ciclo 2 (o ciclo 3 não tocou; autorização é a do ciclo que os criou): c1-prevoo ×2, c2-pergunta ×2 (corpos do ciclo 1 — o §4 do ciclo 3 os reconhece no PROIBIDO "os corpos das 6 cadeiras"); J-B-GOV-MANDATO.md (d0adc0f0); R-B-GOV-MANDATO-1.md; PLANO_SAN3.md (5ea761a6, ciclo 2 — plano do ciclo 2 l.546 + comando l.255).
 Mudaram no ciclo 3, com a linha que autoriza:
  c1c/c2c/c3c ×2 espelhos (novos) — §4 orquestrador "3 corpos novos" + ERRATAs (e4aa7592, e27fbe14, f8d84376, ade74d09, 4b164396, ebcc8fdf)
  c3-escopo, c3b, medidor ×2 — §4 "só a ERRATA prefixada, nos 3 que carregam falsidade" (b334c3b9) → conferido em 3d
  Kpis/app.js, kpis-history.json, kpis-history.md, kpis-latest.json — §4 Dev-S "só por kpi-freeze" (72214ff7, 714d4815, d222ce7c, a737250a, 4794169a, 7e4ac5d1) + merge; linha #394 do .md — §14.14 R-A + Emenda 6
  comando — §4 Dev-S (EMENDA ciclo 3) (1466c7d9, a737250a, 7e4ac5d1, cac98ded)
  log-execucao.md, status-geral.md — §4 Dev-S trilha
  decisoes.md — o ciclo 3 NÃO acrescentou linha: blob 34969a81 = blob M^1 (09338c5a), M..head sem diff; as 49 linhas do bloco sobre MB = só D-NOITE-SEM-TETO (ciclos 1/2; §4 "autorizado nominalmente (C3b-01): já contém D-NOITE-SEM-TETO"); a mudança no ciclo 3 é só a RESOLUÇÃO do merge
  pendencias.md / pendencias-indice.md — §4 Dev-S (+ gerador) + R-B nominal (Emenda 6)
  BRIEFING-B-GOV-MANDATO.md — §4 orquestrador (af8b4eac, 28b4defd)
  votos/B-GOV-SEM-TETO/PORTEIRO-395.md — §14.14 R-D/R-E + Emenda 6; md5 EOL-neutro do blob = 9cd7cb00020f0577044eb2ed3de4e3b8 (controle PORTEIRO-394 = c99c94d5…); citado na mensagem de af8b4eac (1×) e no corpo do PR (1×)
  R-B-GOV-MANDATO-2.md — §4 orquestrador (61302337)
  ciclo2-plano.md — §4 "só a linha de ERRATA no fim" (61302337) → conferido em 3d
  ciclo3-equivalentes.txt — §14.18(1) + E-10(b) + Emenda 7 (371961ac)
  ciclo3-mutantes.md — §4 Dev-S + Emenda 6
  ciclo3-plano.md — §4 "(este)"
  scripts/mandato-mutantes.sh — §4 Dev-S, divergência declarada + Emenda 6 (616fd4fa, 1466c7d9, c32f77b5)
  scripts/mandato-preflight.sh — §4 Dev-S E2 (33356358) + §13.1 Dev-S-2 (c32f77b5)
  scripts/mandato-refs.sh — §4 "sem mudança de comportamento; cabeçalho/comentário" (72214ff7): diff 34969a81..head = 21 linhas +, 0 −, TODAS comentário (grep -v '^[-+]#' vazio)
  tests/mandato-refs.test.ts — §4 Dev-T só adições + §13.2/§13.4 (9d3de5dd) + §14.4 (395d07c9) + §14.16 (190e2300) + §14.17 (396643aa) — numstat 494/0
  tests/mandato-preflight.test.ts — §4 Dev-T + §13.1/13.2 (9d3de5dd) + §14.18 (9e8cf1cd) — ver 1e
 Autorizações nominais que o corpo exige TAMBÉM na EMENDA — CICLO 3 do comando (git cat-file do head, l.259-390): mutantes.sh (Emenda 6 l.332) ✓ · ciclo3-mutantes.md (l.333) ✓ · linhas novas de decisoes.md: não há (0) — nada a declarar ✓ · PORTEIRO-395.md (l.336) ✓ · linha #394 do kpis-history.md (l.337) ✓ · dd79c96f → b3f0af5f em pendencias.md (l.338) ✓ · ciclo3-equivalentes.txt (Emenda 7 l.379) ✓.
 Fato: os commits de teste T5 (190e2300), T6 (396643aa) e T7 (9e8cf1cd) não são nomeados na Emenda 6/7 do comando (a linha de tests/mandato-preflight.test.ts da Emenda 6 descreve só o escopo do Dev-T-3); a permissão por ARQUIVO existe no comando (PERMITIDO l.78 + Emenda 1 do ciclo 2) e o papel vive no plano §14.16-§14.18 → nota (C3c-N4)
 Meu N de divergências declaradas (lado declaração × lado arquivo): mutantes.sh (Emenda 6 "Diverge da linha do Escopo PROIBIDO") × scripts/mandato-mutantes.sh no diff — 1. Nenhum arquivo do diff sem linha de autorização nem divergência declarada → VERMELHO NÃO ocorre.
R-A: kpis-history.md do head l.3101 "| pr / merge_commit / approved_head | `394` / `b3f0af5f…` / `7ad08690…` — backfill §C3.5 do #394: JSON pago pelo #395, `.md` pago aqui pelo #393 …" (em MB l.2955 era `394`/null/null). R-B: git grep -c dd79c96f head -- pendencias.md = 0 (sem saída); b3f0af5f = 4 (≥ 2) ✓.

## Item 1c — corpos da junta nos dois espelhos
git ls-files -- '.claude/agents/especialistas/jurado-mandato-c[123]c-*' '.agents/agents/especialistas/jurado-mandato-c[123]c-*' → N=6 (c1c, c2c, c3c × 2 espelhos); controle 'c9c' → 0. node scripts/sync-agent-agents.mjs --check → ec=0 "[agents-sync] OK — 34 agentes, espelho consistente." (a 1ª invocação caiu por um $S vazio no meu shell — erro de variável meu, refeita). O meu corpo no head: blob 997375fb, md5 EOL-neutro f12be570… = o que apliquei.

## Item 1d — quórum no diff (base MB, não fc3363e3)
git diff --name-only MB head -- src prisma frontend mobile .github = 0 · controle -- scripts tests = 5 (mesmo par). → maioria de 3 se aplica.
(Lido literalmente com fc3363e3: -- CLAUDE.md AGENTS.md = 2 — é o #394 que a main trouxe; é a violação fabricada pela base velha que o §14.6 previu, A5. Não é escopo do #393.)

## Item 1e — [P-0] dos guards
numstat 34969a81..head: tests/mandato-refs.test.ts 494/0 (só adições) ✓ · tests/mandato-preflight.test.ts 1559/15
^test( só cresce: refs 18 → 39 · pré-voo 33 → 117 ✓
Mapeamento POR SCRIPT (hunkmap.mjs: cada hunk com '-' → o test( do arquivo antigo que contém as linhas removidas), git diff -U0 34969a81 head:
   -179,1 [B1-correto] (forma) · -300,1 [B5e] (forma) · -379,5 [B8a] + 1 linha de comentário de seção imediatamente acima dele · -386,4 [B8b] · -392,4 [B8c]  → 5 hunks com remoção, exatamente os 5 casos do [P-0] v3/§13.1; [B8d] é adição.
   A linha de fora de caso: l.379 do ciclo 2 "// --- checagem 7: rotular é afirmar (adendo A1) ---" — o cabeçalho de seção da semântica v2 revogada, no mesmo hunk do [B8a], trocado pelo cabeçalho v3. Não é caso nem asserção. → nota (C3c-N5)
§13.2(3): git diff 4ad4ba9f 9d3de5dd -- tests/mandato-preflight.test.ts = 52/13, 3 hunks, todos com remoção: [B8a](+seção), [B8b], [B8c]; o [B8d] é adição dentro do hunk do [B8c] (-395,4 +418,20) → "só os 4 hunks nomeados" ✓
Não vieram pela main: git diff M^1 M -- tests/mandato-refs.test.ts tests/mandato-preflight.test.ts = 0 · controle -- Kpis = 4.
⇄ vermelho-controle: (arnês) git diff --no-index c2 × head pristino reproduz 5 hunks; cópia do head com UMA linha a mais alterada dentro de [B3-neg] (l.245, '// ctl'; --stat 1+/1−) → 6 hunks, um em "[B3-neg]" — fora dos cinco. ACUSOU. (1ª tentativa com GNU diff -U0 deu 13 hunks por alinhamento diferente do git — ferramenta vizinha, A5; descartada e refeita com o mesmo algoritmo.)

## Inelegibilidade (por nome, no head)
jurado-mandato-c3c-fronteira-numero-registro: J-B-GOV-MANDATO.md 0 (controle c3b=1, guardiao=1) · R-1 0 (controle guardiao=1) · R-2 0 (controle guardiao=1) · votos versionados do bloco: 0 arquivos (git ls-tree … votos/ | grep GOV-MANDATO). No briefing ciclo 3: só na tabela como C3‴ (l.29 da seção). Nenhum dos 14 inelegíveis (6 cadeiras, 5 slugs de dev, 2 ids de dev dos ciclos 1/2, planejador-mestre) ocupa cadeira na tabela "As três cadeiras" (0 cada). Primeiro achado de terreno: nenhum.

## Item 3d — dívidas do orquestrador
C3b-02 (ERRATA nos 6 blobs): cadeias EXTRAÍDAS do plano por script (grep -o "git grep -l -e '…' -e '…'" do plano do head) → E1='de outro projeto', E2='58284'.
  git grep -l -e E1 -e E2 28b4defd -- .claude/agents .agents/agents → 12 arquivos: os 6 esperados (c3-escopo, c3b, medidor × 2 espelhos) + 6 jurado-semteto-c{1,2,3}-* × 2 espelhos. Os 6 semteto vieram pela MAIN (#394, introduzidos em b3f0af5f; blob no head = blob em 3b1fe0f9; 0 deles no git diff MB..head) — registro de outro bloco, E-7(d) por analogia; citam a faixa 58284–58483 no contexto de "porta provada ligada". Restrito ao diff do bloco (MB..head): exatamente os 6 esperados. Controle positivo: a mesma busca em 34969a81 → 6.
  Em cada um dos 6: git diff 34969a81 head = 1 hunk, 26 inserções / 0 remoções; posição do hunk derivada do '@@' (não digitada): .claude após l.7 (head l.8-33), .agents após l.13 (head l.14-39); 1ª 'ERRATA' = 1ª linha do bloco inserido, ANTES da 1ª ocorrência das cadeias (.claude l.8 < l.15; .agents l.14 < l.21); texto ACIMA do bloco: hash IDÊNTICO ao do c2; texto ABAIXO (head l.K_h.. × c2 l.K_c.., K por @@): hashes IDÊNTICOS (c3-escopo ab42f3ca, c3b acad033e, medidor f8d7539b, iguais nos dois espelhos). ⇄ controle: a cauda do c2 com 1 byte trocado → ba7be964 ≠ f8d7539b (a comparação discrimina). sync --check ec=0 (item 1c). DÍVIDA PAGA.
  (1ª tentativa com K = linha do 1º texto após o frontmatter falhou no espelho .agents porque o preâmbulo do espelho precede a ERRATA — K mal derivado por mim, refeito pela posição do hunk.)
C3b-03: docs/revisoes/SAN3/B-GOV-MANDATO-ciclo2-plano.md — numstat 34969a81..head = 17/0, 1 hunk "@@ -752,0 +753,17 @@": l.1-752 do head = blob do c2 (hash 9fe893e1 = 9fe893e1); o acréscimo é uma SEÇÃO de 17 linhas ("## ERRATA C3b-03 — 2026-09-27, orquestrador": §7.3 → §5.3; "106" → 107), não "uma linha" como o §4/E5 descrevem — conteúdo certo, forma maior → nota (C3c-N6). Emenda do comando traz a errata 106 → 107 (cmd l.353-357, "leia-se **107**", e acrescenta 108 sobre o MB atual). B-GOV-MANDATO-2 localizado PELO ID no PLANO_SAN3.md do head: l.269, sob "### 5.3 Frente 3 — web e antivírus" (§5.3, não §7.3). DÍVIDA PAGA.
Dívida nº 5: git cat-file -e head:…/R-B-GOV-MANDATO-2.md ec=0 (controle R-1 ec=0; R-9 ec=128). Tabela "Separação de papéis para o ciclo 3" (l.33-39): quem achou = C1′ (guardiao-fail-closed) e C2′ (medidor-de-cobertura-do-artefato); quem planeja = planejador-mestre (Fable); quem desenvolve = "dev **novo**" — papel por CONDIÇÃO, sem identidade (escrito em 61302337, antes dos devs existirem; nunca atualizado; mesmo formato do R-1). As 7 identidades de dev do ciclo 3 estão no briefing (l.193-200) e no plano §14.9, não no R-2 → nota (C3c-N7)
C3b-01: o ciclo 3 NÃO acrescentou linha em decisoes.md (medido: 34969a81 = M^1 = 09338c5a; M..head vazio). O §4 do plano (l.894-895) autoriza nominalmente e só exige declaração na emenda "se houver linha nova neste ciclo" — não há. MAS o E5 (l.769) e o mapa (l.795) dizem "e a emenda do comando repete" a autorização: git cat-file do comando no head | grep -i -E 'decis|NOITE-SEM-TETO|C3b-01' → só "pontos de decisão" (falso positivo) — a emenda NÃO repete. A autorização das 49 linhas (D-NOITE-SEM-TETO, ciclos 1/2) vive só no plano → parte de C3c-A1
C2′-07 (corpo do PR): ver item "corpo do PR" abaixo (depende das contagens por arquivo).

## Item 3e — trilha e emenda do comando
status-geral.md / log-execucao.md (adições MB..head): nomeiam o ciclo 3 (7/6 ocorrências) e Dev-T (5/5), Dev-S (3/3), Dev-T-3 (1/1), Dev-S-2 (3/3), Dev-T-4 (2/2); K1b/K2b registrados (3403/3405 presente 2×); Dev-T-5/Dev-T-6/T7/K2c: 0 ocorrências (T5 citado 1×).
Linha de limpeza §C5 nas seções do ciclo 3 da trilha versionada: 0 (a única do bloco é a do ciclo 1, log l.82 das adições; o ciclo 2 também não tem). Os relatórios dos devs no scratchpad (não versionados) trazem a linha (8 de 12). §C5 manda a linha "no fechamento do bloco", que ainda não houve → nota (C3c-N8)
EMENDA — CICLO 3 do comando (l.259-390 do head, 132 linhas) × o que o E5 do plano (l.752-754) manda o Dev-S escrever nela:
  escopo E4 nominal ✓ (Emenda 6) · promessas novas dos artefatos ✓ (Emenda 1) · errata 106 → 107 ✓ (l.353-357)
  bateria (§8): 'bateria' 0 ocorrências, 'mandato-mutantes.sh refs|preflight' 0, '--jobs' 0, 'kpi-freeze.mjs --check' 0, 'sync-agent-agents' 0 → AUSENTE
  códigos de saída inalterados: 'digos de sa' 0 → AUSENTE (a ferramenta nova tem ec=2 de linha de base suja — c32f77b5 — e ec=1/0 do [M-1], nenhum registrado no comando)
  "dois devs": Dev-S nomeado (Emenda 6); o Dev-T do ciclo 3 (6c8fb3e8/4ad4ba9f) 0 ocorrências → AUSENTE
  ⇄ controle positivo: os mesmos greps na EMENDA — CICLO 2 (l.188-258) → 'Bateria' 1, 'digos de sa' 1 (a busca acha quando existe).
  → C3c-A1 (ajuste)

## Registro dentro do artefato congelado — o cabeçalho do refs
scripts/mandato-refs.sh (blob 474c7521, congelado pela identidade da matriz §14.2.1), seção "O QUE MUDOU NO CICLO 3" (l.17-38), nascida em 72214ff7 (2026-09-28, git log -S):
  l.22-24 "O guard deste artefato passou de 18 para 33 casos … Os 33 exercitam o .sh" — o head tem 39 (^test( = 39; TAP 39, item 2b)
  l.32-35 "a cláusula ver() … sobrevive à mutação com o guard 33/33 verde — nenhum caso exercita 'o gh não está instalado' … tem dono na pendência do ciclo 3" — no head o [V17] (tests/mandato-refs.test.ts l.762, "⇄ l.115 (`|| parado` -> `|| true`)") exercita exatamente isso, a E4-refs-3 dá l.115 M1 fail=1 VERMELHO e a pendência P-GOV-MANDATO-3-MUTANTES-REFS está FECHADA.
  Nada no registro declara que esse cabeçalho ficou falso (git grep no head por "18 para 33"/"33/33 verde" em agent-orchestration/ e docs/ acha só narrativas datadas da trilha e a pendência fechada); o item "cabeçalho congelado" de P-GOV-MANDATO-3-FRONTEIRAS só trata números de fronteira.
  É a mesma classe que o plano §14.17 mandou consertar no guard (T6) antes da junta ("afirmação falsa no presente, num artefato rastreado"); no script ela não pode ser consertada sem refazer a matriz do refs — o que falta é a DECLARAÇÃO. → C3c-A2 (ajuste; a C1‴ tem o item comentários × asserção — se ela o tiver, o achado é um só)

## Ata do bloco no head
J-B-GOV-MANDATO.md no head = blob d0adc0f0 = o do fim do ciclo 2 (34969a81); seções: ciclo 1 (l.10 Objeto julgado 7462b75b…) e ciclo 2 (l.96 Objeto julgado 4c8819ef…); "ciclo 3" 0 ocorrências. O §14.12 passo 6 do plano lista "seção ciclo 3 da ata (esqueleto com `Objeto julgado`)" no registro da junta (antes do inspetor); não está no ramo. A ata do ciclo é escrita depois do voto e o objeto é resolvido por cada cadeira — sem efeito no que se julga → nota (C3c-N9)
ERRATAs nos 3 corpos (git cat-file do head, '^> - ERRATA E-N'): c1c E-1,2,6,9,10,11 · c2c E-1,3,5,6,8,9,10,11,12 · c3c E-1,2,4,6,7,8,9,10,11,12 → 12 IDs distintos (o corpo do PR diz "12 ERRATAs nos corpos").
CI no head 28b4defd: gh pr checks 393 → 14 check-runs pass (2 eventos: push e pull_request, headSha 28b4defd nos dois); log do job backend (109804147634): "# tests 3405 / # pass 3403 / # fail 0 / # skipped 2", 0 linhas GUARD DE SKIP.
