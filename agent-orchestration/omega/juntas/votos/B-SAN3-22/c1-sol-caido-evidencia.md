papel: cadeira C1 | identidade: jurado-san322-c1-sol | executor: Codex CLI | corpo: jurado-san322-c1-banco-e-concorrencia | modelo: GPT-5.6 Sol (esforço medium; nível menor, §C7.6; substituição: nenhuma) | objeto: 44d9cbb3874e45340ca43c934364c3d0103c53b8 | mandato_md5: ee09ec6b87d68859240e658fbc552b05 (EOL-neutro) | corpo carregado × blob do objeto: IDENTICO (EOL-neutro)

## Pré-voo e legalidade

- comando: `gh pr view 464 --json headRefOid,state,url`; `git rev-parse origin/main`; `git rev-parse <objeto>~13`; `git merge-base <objeto> origin/main`
- saída resumida: PR OPEN, head `44d9cbb3874e45340ca43c934364c3d0103c53b8`; `origin/main` e merge-base `c9a2d036c1aaff21df92817525d7f9c92cbbe272`; head-base backend `<objeto>~13` = `b08c755719a6cb0ed192fa04e549ac5fc67a3e67`.
- veredito parcial: objeto estável e bases resolvidas na ref julgada.

- comando: leitura integral de `insp-san322-parecer.md`, mandato C1, corpo C1 do blob, críticas R1/E3 e revisões de maquete exigidas pela ressalva 5.
- saída resumida: inspetor `inspetor-san322`, Claude Opus 5.5 nível menor, `LIBERADO COM RESSALVA`; ressalvas R1–R7 incorporadas; identidade `jurado-san322-c1-sol` não aparece na lista de inelegíveis, acrescida de `med-bsan322-pro`, `rev2-maquete22-argon`, `fab-red-san322-opus` e `inspetor-san322`; não li `c2-*` nem `c3-*`.
- veredito parcial: legalidade satisfeita para C1; head que andar encerra a medição.

- comando: MD5 EOL-neutro (`tr -d '\r' | md5sum`) do mandato e dos blobs `.claude`/`.agents`; comparação EOL-neutra dos corpos conforme o parecer.
- saída resumida: mandato `ee09ec6b87d68859240e658fbc552b05`; `.claude` completo `8fca8229f50e7c04d5ed8739bc39c243`; `.agents` completo `bf78eebf06ddba916bf09d9e238bd2ad`; payload canônico sem frontmatter/adaptação Codex `440ea193` nos dois espelhos, conforme comando reexecutado pelo inspetor; corpo carregado diretamente do blob `.claude` do objeto, portanto IDENTICO.
- veredito parcial: corpo canônico válido e espelhamento EOL-neutro confirmado.

- comando: `Get-PSDrive C`; memória de commit; `docker ps`; `node -v`; `docker version`.
- saída resumida: C: 10,45 GB livres; memória de commit livre 11,43 GB; trabalhos Docker fora de `erp-*`: 0; base viva `erp-postgres`/`erp-redis` identificada e proibida; Node `v20.19.5`; Docker Server `29.6.1`; scratch `C:/Users/AMP/erp-pausa-2026-10-03/j22-c1/`; worktree alvo `C:/Users/AMP/j22-c1-wt`; containers próprios `j22-c1-pg`/`j22-c1-redis`; portas `127.0.0.1:47921/47922`; bancos extras prefixo `j22_c1_`; junction proibida; piso 4 GB memória e 7 GB disco observado.
- veredito parcial: terreno comporta a cadeira; base viva e portas 5432/6379 permanecem fora do alvo.

## Item 1 — EM APURAÇÃO

- comando: `CORE_SAAS_PERSISTENCE=prisma node --test --import tsx tests/checklist-template-lock-db.test.ts`, três rodadas no Postgres próprio migrado.
- saída resumida: rodadas 1–3 idênticas, cada uma `tests 9 | pass 9 | fail 0 | skipped 0`; casos 1–9: CE-12-forma, CE-4/5, CE-6/7/8, CE-10-db, CE-12-db, CE-22/23, CE-22 inativado, CE-24, CE-25, todos `ok`.
- veredito parcial: bateria nominal verde e denominador constante; ainda não basta sem os controles mutantes e sondas próprias.

- comando: `gh run view 40324613418 --log` (pull_request) e `gh run view 40324606772 --log` (push), ambos do objeto; busca no job `backend`.
- saída resumida: nos dois runs, job `backend`, aparecem `ok 578 - CE-12-db`, `ok 579 - CE-22/23`, `ok 580 - CE-22` e `ok 581 - CE-24`; o resumo do job tem `# skipped 2`, mas nenhuma dessas quatro linhas está marcada `SKIP`.
- veredito parcial: condição (i) da E3-22 satisfeita nos dois gatilhos; `.github/workflows/ci.yml` exporta `DATABASE_URL` no job backend, enquanto a guarda de zero-pulo está no backend-postgres.

- comando: mutação restaurável no `lockTemplateForMutation`: remover somente `tenant_id = ${tenantId}` do `WHERE` do `SELECT … FOR UPDATE`; prova `git diff --numstat = 1/2`; reexecutar o arquivo `-lock-db` completo.
- saída resumida: mutante carregou, mas o resultado permaneceu `tests 9 | pass 9 | fail 0 | skipped 0`; tanto `CE-12-forma` quanto `CE-12-db` ficaram verdes. O arquivo foi restaurado por patch inverso; hash será conferido antes do fechamento.
- veredito parcial: VERMELHO-CONTROLE AUSENTE. O CE-12-forma usa regex ampla que encontra outro `WHERE tenant_id` adiante e não prova cada sentença; o CE-12-db também não acusa a ausência isolada no lock. `criterio_que_nao_pode_falhar`: a mutação obrigatória desta cadeira não fica vermelha.

## Item 2 — EM APURAÇÃO

## Item 3 — EM APURAÇÃO
