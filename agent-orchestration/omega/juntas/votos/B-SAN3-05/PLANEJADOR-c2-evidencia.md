# Evidencia — planejador-ciclo2-b-san3-05-sucessor (Opus, substituicao declarada)

Objeto: cd267978eb44a195497b2dfec6f663e96df06f79 (HEAD local = ls-remote; codigo = c251c9b7, delta so o plano)

## B1 (re-execucao P3) — 2026-10-08T~15:20Z
- comando: `timeout 600 bash scratchpad/pl05c2s/probe-b1.sh` (postgres:16 descartavel `pl05c2s-b1-*`, script = blob cd267978 md5 810c1c4a montado ro, senha so por env `-e NOME`)
- saida: txsample ec=0 senha_server_log=1 · durationsample ec=0 senha_server_log=1 · log_statement=all ec=3 MODO0 senha=0 · controle allow=1 ec=0 senha=1 · defaults ec=0 senha=0 · terminal 0 em todas · residuo 0
- veredito parcial: REPRODUZ (e amplia: o antecessor registrou so a variante txsample; a durationsample, achada por C1/C2, tambem reproduz)
- viabilidade do remedio (nao e produto): `timeout 300 bash scratchpad/pl05c2s/probe-b1-viab.sh` (postgres:16 com log_statement=all) -> `printf ... | setsid -w psql -c '\password <papel>'` sem tty: ec=0, senha_server_log=0, 1 linha `ALTER USER ... PASSWORD 'SCRAM-SHA-256$4096:<verificador>'`, login com a senha OK. Ferramentas presentes no postgres:16: openssl, perl, setsid. Residual: o verificador SCRAM no log permite ataque de dicionario offline (PBKDF2 4096) -> senha tem de ser aleatoria e longa; se password_encryption=md5, o \password gera md5 (pass-the-hash sob auth md5) -> o plano exige SCRAM na sessao.
## B2 (re-execucao P3)
- comando: `timeout 5000 bash scratchpad/pl05c2s/run-b2.sh` = 3x `OUT_BASE=b2-rN timeout 1500 bash receita-pl05c2s.sh cd267978… normal` (receita-pg16.sh com prefixo pl05c2s e REPO=w-o05)
- saida: r1 19/19 · r2 19/19 · r3 19/19 (PG 16.14; 3652/3652 blobs; residuo 0/0/0; teardown 0)
- veredito parcial: o SINTOMA nao reproduziu em N=3 (antecessor 19/16/19; inspetor 2/6; C1 2/9). Causa estrutural re-medida estaticamente no blob: as 15 chamadas a runRoleScript (l.538-722, 748) ficam fora de withRoleCatalogLock; limpeza do MODO 6 fora de finally; janela da trava timeout 30 s x filho spawnSync 60 s.
- comando: `timeout 300 bash scratchpad/pl05c2s/probe-b2-canario.sh` (postgres:16 `pl05c2s-b2-canario`; canario segura pg_advisory_lock(20268801) 25 s)
- saida: trava_segura=1 · controle (escritor que respeita a trava) = lock timeout em 4 s · script do objeto ec=0 em <1 s com a trava ainda segura · papel criado=1 · GRANT USAGE public=t · residuo 0
- veredito parcial: CAUSA do B2 REPRODUZ de forma deterministica (a escrita de catalogo do script ignora a exclusao mutua do arnes)
- comando: `LOOP=10 OUT_BASE=b2-loop timeout 2400 bash receita-pl05c2s-loop.sh cd267978… normal` (mesmo container/banco; npm ci uma vez; residuo conferido entre iteracoes)
- saida: 10/10 iteracoes 19/19 ec=0; residuo papeis/views s305% = 0 em todas; XX000 no TAP = 1 (iteracao 1): teardown do arnes `DROP OWNED BY "o6r_b01_…"` (arquivo leituras-db, DENTRO da trava) recebeu `XX000 tuple concurrently updated`, re-tentou e removeu o papel (absorvido)
- veredito parcial: suite vermelha 0/13 no total (3 receitas + 10 iteracoes) — o SINTOMA (vermelho) NAO reproduziu; a COLISAO reproduziu 1/10 do lado da vitima que tem re-tentativa; a CAUSA reproduz deterministicamente (canario). Consequencia para o aceite: contar XX000 no TAP inteiro (inclusive o absorvido pelo arnes), nao so testes vermelhos.
## B3 (re-execucao P3)
- comando: `timeout 1200 bash scratchpad/pl05c2s/probe-b3.sh` (container `pl05c2s-b3-gen`, arvore = git archive cd267978 sem filtro EOL, gerador md5 81d92595 = blob; npm ci + prisma generate)
- saida: BASE 53 chaves sha1 79e1d86e (L0 ENABLE=106 FORCE=106 acessores=106; L1=725); C3A 53/79e1d86e (call-site INJETADO, sem chave) · C3B 53/79e1d86e (2 call-sites INJETADO) · C3C 53/79e1d86e · C3D controle 54 chaves (L2 `new ZzRepoD(prisma) CRU`) · C3E 53/79e1d86e e 0 call-site
- veredito parcial: C3-F1 (A, B, C) e C3-F1b REPRODUZEM; o antecessor registrou A, D e E — B e C (da C3) tambem reproduzem
- comando: `timeout 1200 bash scratchpad/pl05c2s/probe-b3-f2.sh` (esquema + migracao descartaveis so na copia do container)
- saida: L0 FORCE 106->108 (captura `zzforceb` minusculo, que nenhum model mapeia, e `zz_force_c`; `public.zz_force_a` nao casa a regex), acessores 107; leitor: zzForceA 0 linhas, zzForceB 0 linhas, zzForceC (controle) 2 linhas CRU; inventario 54 / d2276311
- veredito parcial: C3-F2 REPRODUZ (qualificada por schema e model sem @@map nascem permitidos)
- comando: `timeout 900 bash scratchpad/pl05c2s/probe-b3-ops.sh` (diagnostico: laco l.96-99 verbatim contra o index.d.ts gerado)
- saida: 114 interfaces *Delegate, 0 no topo, 114 dentro de namespace; laco verbatim coleta OPS=0 (o `else` liga ao `if` interno e a recursao nunca desce no namespace) -> fallback "lista embutida" SEMPRE; com chaves no if externo coleta 17 (= lista embutida)
- veredito parcial: J17/R2(3) e real e permanente: a derivacao de OPS que o plano v3 afirma nunca rodou; o T13 so poe o stderr em t.diagnostic (l.159), o aviso passa calado
## B4 (re-execucao P3)
- comando: `timeout 5000 bash scratchpad/pl05c2s/run-b4.sh` = 3x `MUT=<mut> timeout 1500 bash receita-pl05c2s-surface.sh cd267978… normal` (so o arquivo leituras-db; mutacao aplicada na copia efemera dentro do container, ancoras exatas, falha fechado se a ancora nao casar)
- saida: E1 controle (rota crua SEM etiqueta) -> 9/11, not ok T11d (enumeracao viva) · E2 (rota crua etiquetada FORCE-SEM-TENANT "S1 — T11a", sem cenario) -> 11/11 ec=0 · E3 (ramo com tenantId de RlsPrismaCloudUsageRepository.listEvents le cru) -> 11/11 ec=0 · residuo 0, teardown 0
- veredito parcial: C3-F3 REPRODUZ nas duas formas (E2 = a do antecessor; E3 = a da C3, que o antecessor nao re-mediu); o controle E1 prova que a mutacao esta viva
## B3(f) — igualdade L0 x catalogo, por nome (medicao nova do sucessor)
- comando: `OUT_BASE=b3-l0 timeout 1500 bash receita-pl05c2s-l0.sh cd267978… normal` (banco migrado 107 migracoes; `b3/l0-compare.mjs` = linhas 52-67 do gerador verbatim x `pg_class.relforcerowsecurity` por psql)
- saida: L0 FORCE=106 catalogo FORCE=106 so_no_L0=0 so_no_catalogo=0; tabelas FORCE sem model com @@map=0; models sem @@map=0; teardown 0
- veredito parcial: no objeto a igualdade por NOME vale (o aceite (f) e satisfazivel); o C3-F2 e sobre o proximo membro, como a C3 calibrou
## B4 — viabilidade do remedio (medicao nova do sucessor, nao e produto)
- comando: `MUT=mut-p4.mjs OUT_BASE=b4-p4 timeout 1500 bash receita-pl05c2s-surface.sh cd267978… normal` (acrescenta ao laco de medicao, na copia do container, as 3 rotas GET FORCE-POR-TENANT sem medida e um subteste que compara super x efemero)
- saida: 12/12; GET /cloud-usage/tenants/:A/summary 200/200 iguais (242 chars, metrics nao vazio); GET /tenants/:A/detail 200/200 iguais (1249); GET /cloud-cost-allocations/summary 200/200 iguais (564, totalAllocatedCost 40); teardown 0
- veredito parcial: o remedio do B4 nao encontra defeito pre-existente nessas 3 rotas; NAO medidos: POST /cloud-cost-allocations/runs, jobs cloud-charges.calculate e cloud-cost-allocation.run (efeito colateral) -> risco nomeado no fecho
## B3 — tamanho do remedio fail-closed (medicao nova)
- comando: `timeout 900 bash scratchpad/pl05c2s/probe-b3-semnew.sh` (copia do gerador SO no container + sonda que conta pares (classe injetada, idx) sem `new` resolvido em src)
- saida: inventario 53/79e1d86e; classes injetadas=72; pares sem new em src=0; call-sites afetados=0; chaves novas se fail-closed=0
- veredito parcial: o remedio do C3-F1 nao infla o inventario hoje; crescimento possivel so pela relacao aninhada (C3E), nao medido (exige o remedio)
