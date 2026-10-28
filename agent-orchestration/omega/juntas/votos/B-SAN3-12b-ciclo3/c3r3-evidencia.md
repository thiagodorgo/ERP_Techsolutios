papel: cadeira C3 | identidade: jurado-san312b-ciclo3-c3-sol | executor: Codex CLI | corpo: jurado-san312b-c3-dinheiro-e-contrato | modelo: GPT-5.6 Sol, esforço medium (nível menor, §C7.6; substituição: nenhuma) | objeto: cfb19fd115bac02ef65eb94202b01a64e6730854 | mandato_md5: 3f8d189297173dda540e3e92b932e90e (declarado: não declarado) | corpo_md5: 3edfee9fdffd5ebd1a64620072eaad3d (recebido: n/a) | corpo carregado × blob do objeto: IDENTICO

# Evidência — B-SAN3-12b ciclo 3, cadeira c3r3

## Prova anterior a qualquer item — hora da primeira execução não capturada

- Comando: `docker version --format '{{.Server.Version}}'`; Node por caminho absoluto resolvido por `command -v node`; `gh --version | head -1`, todos via `C:/Program Files/Git/bin/bash.exe -lc`.
- Saída resumida: `docker=29.6.1 | node_path=/c/nvm4w/nodejs/node | node=v20.19.5 | gh=gh version 2.89.0 (2026-03-26)`.
- Veredito parcial: prova de ferramentas obtida antes dos itens; Node 20 medido pelo caminho absoluto `/c/nvm4w/nodejs/node`. A primeira execução não imprimiu a hora; nenhuma hora foi estimada.

### Reexecução da prova com hora capturada — 2026-10-28T12:33:57Z

- Comando: mesma prova, agora precedida por `date -u +%FT%TZ`, via Git Bash obrigatório.
- Saída resumida: `utc=2026-10-28T12:33:57Z | docker=29.6.1 | node_path=/c/nvm4w/nodejs/node | node=v20.19.5 | gh=gh version 2.89.0 (2026-03-26)`.
- Veredito parcial: ferramentas disponíveis; hora real capturada pelo comando.

## Pré-voo inicial — 2026-10-28T12:33:24Z

- Comando: resolução do objeto do PR #469, espaço de C:, MD5 EOL-neutro do mandato e corpo, comparação EOL-neutra corpo carregado × blob, contagem de linhas e existência dos artefatos.
- Saída resumida: `free_C=11G`; `repo_head=pr469_head=cfb19fd115bac02ef65eb94202b01a64e6730854`; `mandato_md5_eol=3f8d189297173dda540e3e92b932e90e`; `body_md5_eol=3edfee9fdffd5ebd1a64620072eaad3d`; corpo `IDENTICO`; corpo 403 linhas; mandato 244 linhas; evidência/voto não existiam.
- Veredito parcial: piso inicial de disco atendido; objeto estabilizado; corpo válido; identidade nova e não inelegível.

## Legalidade antes do mérito — 2026-10-28T12:34:36Z

- Comando: leitura integral de `insp-san312b-c3-parecer.md`; reexecução de `git ls-remote`, `gh pr view`, check-runs, `origin/main`, merge-base, resíduos de worktree/container, trabalhos Docker e recursos.
- Saída resumida: inspetor `inspetor-san312b-ciclo3-opus`, `LIBERADO COM RESSALVA`; autoriza a identidade C3 Codex Sol e o worktree `C:/Users/AMP/j12b-c3-c3r3-wt`; ramo remoto = PR = objeto; PR OPEN/não rascunho/MERGEABLE; `backend`, `backend-postgres`, `frontend` = `completed/success`; check-runs `14 total | 0 não-verdes | 0 pendentes`; `origin/main=merge-base=f076973921539165df8d406b8c061dbf4e4ee127`; worktree ausente; containers próprios 0; trabalhos Docker fora de `erp-*` 0; C: 11G. O subcomando de memória falhou (`ec=1`) exclusivamente porque o Bash expandiu `$o` antes do PowerShell (`unbound variable`).
- Veredito parcial: legalidade e CI verdes; ressalvas aceitas (corpo genérico carregado do blob; plano de queda; Postgres só condicional). Memória ainda a reexecutar corretamente antes da instalação; nenhum item de mérito iniciado.

### Recursos e runtimes antes da instalação — 2026-10-28T12:35:26Z

- Comando: `df -BG /c`; memória de commit livre via PowerShell invocado dentro do Git Bash; inspeção e execução dos binários absolutos de Node 22 e npm.
- Saída resumida: C: `11G`; memória de commit livre `12,97 GB`; `C:/Users/AMP/AppData/Local/nvm/v22.14.0/node.exe` = `v22.14.0`; npm CLI absoluto = `10.9.2`.
- Veredito parcial: pisos de 8,8 GB e 4 GB atendidos; Node 20 e Node 22 disponíveis por caminhos absolutos; `nvm use` não foi usado.

### Worktree e dependências próprias — 2026-10-28T12:39:06Z

- Comando: `git worktree add --detach C:/Users/AMP/j12b-c3-c3r3-wt cfb19fd1`; prova de `.git`, `.env` e links; `npm ci` raiz e frontend com Node 22/npm CLI por caminhos absolutos.
- Saída resumida: head `cfb19fd115bac02ef65eb94202b01a64e6730854`; `.git` presente; `.env` ausente; junctions/symlinks `0`; raiz `326` pacotes; frontend `103` pacotes; `ec=0`; status Git `0`; C: `10G` ao fim. O npm reportou vulnerabilidades já representadas pelos lockfiles; nenhum `audit fix` foi executado.
- Veredito parcial: terreno exclusivo pronto, sem junction, sem mutação rastreada e acima do piso de disco. Base viva não foi tocada; Postgres local não foi criado, pois a CI é a régua autorizada.

## Item 1 — R-E3-2 / C3R2-01: trava F8 pela propriedade

### Baseline e primeira contagem — comando parcial

- Comando: guard F8 no objeto com Node 20 absoluto; `git grep` do F8 em `<objeto>~6` e nos diretórios do bloco, sob `set -euo pipefail`.
- Saída resumida: baseline `tests 6 | pass 6 | fail 0 | skipped 0`; `<objeto>~6` tem `8` ocorrências do inventário e `0` em `accounts/`, `entries/`, `pages/`. O comando encerrou `ec=1` após imprimir esse zero, pois `git grep` sem match retorna 1 sob `pipefail`; nenhuma mutação havia começado.
- Veredito parcial: baseline verde; zero esperado confirmado no objeto do ciclo 2; restante da contagem e mutações ainda em apuração.

### Contagem, inventário, resíduos e seis mutações — 2026-10-28T12:42:01Z

- Comando: contagem F8 por `git grep` no objeto e `<objeto>~6`; comparação das 8 linhas; leitura de `FROZEN_REDUCE_TOKENS`; censo de `reduceRight`, `["reduce"]`, `.reduce.call`; runner próprio `mutar.mjs` com cinco receptores e entrada falsa.
- Saída resumida: objeto e `<objeto>~6` = `8` ocorrências, `0` em `accounts/`, `entries/`, `pages/`; diff das 8 linhas `0`; `FROZEN_REDUCE_TOKENS=6`; resíduos no produto `0`. Mutações `filter`, `Object.values`, `(list ?? [])`, `arr[0]`, `items?.reduce` = cada uma `tests 6 | pass 3 | fail 3 | skipped 0`; entrada falsa = `6 | 4 | 2 | 0`; todas VERMELHAS, `numstat` não vazio, restauro `hash igual`; status final `0`.
- Veredito parcial: o guard do objeto acusa todas as formas exigidas e a entrada morta. Os três resíduos declarados têm N atual zero; são limitação de forma futura, não defeito grave de produto no objeto.

### Vermelho-controle no guard de `<objeto>~6` — 2026-10-28T12:42:58Z

- Comando: checkout controlado apenas do guard em `<objeto>~6`; runner adaptado para tolerar somente essa diferença conhecida; quatro primeiras mutações; restauração do guard no objeto e prova por hash/status.
- Saída resumida: `filter`, `Object.values`, agrupamento e índice = cada um `tests 4 | pass 4 | fail 0 | skipped 0`, VERDE no guard antigo; fontes restauradas por hash. Guard final `hash_equal=yes`; árvore rastreada `0`.
- Veredito parcial: controle distingue a correção — as quatro formas escapavam no ciclo 2 e são acusadas no objeto atual.

### Regressões F8/R12/F9/F10/F14/R4/F20/F22 — 2026-10-28T12:43:20Z

- Comando: nove mutações isoladas com runner Node 20, TAP por caso e restauração por hash.
- Saída resumida: R4-M1 `33|0|1|32`; R4-M2 `33|0|1|32`; R12-M1 `6|4|2|0`; F8 `6|3|3|0`; F8b `6|4|2|0`; F9 `33|0|1|32`; F10 `33|0|2|31`; F22 `33|1|1|31`; F20 `13|12|1|0`. Todas VERMELHAS pelo caso nomeado, `numstat` não vazio, restauro `hash igual`; árvore final limpa.
- Veredito do Item 1: **FECHADO — APROVADO**. C3R2-01/R-E3-2 resolvido e regressões presas. Gravidade: nenhuma falha grave; escopo medido `dentro-do-bloco`; classe residual `não grave`, N atual `0`, forma `reduceRight`/chamada computada/`.reduce.call`; não reprova pela régua do ciclo 3.

## Item 2 — R-E3-1 / C3R2-02: registro e propriedade de três vias

### Propriedade A/B — primeira execução parcial

- Comando: A/B extraídos de `git diff <objeto>~26 <objeto>~19` e `comm` contra `<objeto>~6` e o objeto.
- Saída resumida: `A=15`, `B=2`; `<objeto>~6`: `comm-23=4`, `comm-12=2`; objeto: `comm-23=0`, `comm-12=0`.
- Veredito parcial: C3R2-02 não se reproduz no objeto. A bateria parou em seguida por SIGPIPE do extrator de seção sob `pipefail`; nenhuma mutação havia sido aplicada e o restante segue em apuração.

### Três vias, seções, desconto D-8, índice e pendências — 2026-10-28T12:46:52Z

- Comando: `item2.sh` no scratch; A/B/HEAD; extração EOL-neutra das seções; `git log/show` da D-8; gerador do índice em cópia; censo das 5 pendências E3.4 e comparação das 6 preexistentes; E3 plano × parecer; diff `<objeto>~6..<objeto>`; M-E3-1 em cópia.
- Saída resumida: `A=15`, `B=2`; `<objeto>~6` = `comm-23 4`, `comm-12 2`; objeto = `0/0`. As duas seções fechadas são iguais às de `<objeto>~19`. D-8: `dev_A=216`, desconto `comm-23=2`, `comm-12=0`; `bb4f0680` é ancestral e seu diff substitui nominalmente as 2 linhas antigas por D-8 corrigida/Node 22 medido. Índice regenerado EOL-neutro: `diff=0`, placar `675 cabeçalhos / 664 IDs`, 160 FECHADAS, 511 ABERTAS, 4 SEM-STATUS. Cinco pendências novas: 1 cabeçalho, dono e critério em cada. Cinco das seis preexistentes byte-iguais; `P-SAN3-12-CE4-BRACO1-NA-CI` difere somente por uma linha em branco terminal (conteúdo/status/dono/critério idênticos). D-6 superada: 3 menções; E3 = 6 seções/7 requisitos e igual ao parecer. Diff do ciclo 3: 25 caminhos; 10 do permitido E3 e 15 artefatos de registro da junta do ciclo 2; proibidos `src=0 prisma=0 .github=0 Kpis=0 frontend/package.json=0`. M-E3-1: `comm-23=1`, `comm-12=1`, índice muda 50 linhas. Worktree final limpo.
- Veredito do Item 2: **FECHADO — APROVADO**. C3R2-02/R-E3-1 resolvido; as propriedades acusam o controle. Nenhuma perda de dado, vazamento, quebra de permissão ou erro de dinheiro. A linha em branco e os 15 artefatos de processo são classe `não grave`, sem efeito no produto, e não reprovam no ciclo 3.

## Item 3 — R-E3-7, backend e baixa

### Sonda da baixa e mutações R5-M1/R6-M1 — 2026-10-28T12:49:13Z

- Comando: cópia temporária de `zz-j12bc3r2-sonda.test.tsx`; Node 20 com padrão `C3R2`; mutações isoladas; remoção da sonda; reexecução das mutações nos testes-dono.
- Saída resumida: sonda `tests 38 | pass 5 | fail 0 | skipped 33`. Primeira redução: R5-M1 ficou verde nos 3 casos `C3R2-1*` porque a sonda não exercita `deposited`; R6-M1 ficou vermelho. Reexecução correta nos testes-dono: R5-M1 `33|2|1|30` vermelho no R5(b); R6-M1 `33|1|1|31` vermelho no R6. Ambos restaurados por hash; sonda removida; árvore limpa.
- Veredito parcial: regressão comportamental F1–F5/F21/R5/R6 verde na forma 5/5 do roteiro; as duas mutações exigidas ficam vermelhas no teste que enuncia sua propriedade. A redução de amostra foi declarada e corrigida, não ocultada.

### Bateria R-E3-7 — 2026-10-28T12:49:20Z a 2026-10-28T13:00:38Z

- Comando: `bateria.sh` no worktree exclusivo: frontend check; recortes com/sem `pattern-css-guard`; smoke Node 20 e Node 22; frontend build; raiz check/lint/build; `git diff --check`. Depois, `prisma generate` com URL sintética e Node 22 absoluto e reexecução dos três comandos da raiz.
- Saída resumida: frontend check `ec=0`; recorte com pattern `122|122|0|0`; sem pattern `119|119|0|0`; smoke Node 20 `1482|1482|0|0`; smoke Node 22.14.0 `1482|1482|0|0`; frontend build `ec=0`; diff-check `ec=0`. Primeira execução raiz: check/lint/build `ec=2`, todos pelo mesmo motivo de terreno — cliente Prisma ainda não gerado (`@prisma/client` sem `Prisma`/`PrismaClient`). `prisma generate` v7.8.0 com `DATABASE_URL` sintética, sem conexão; reexecução: raiz check `ec=0`, lint `ec=0`, build `ec=0`. Status rastreado final `0`, C: 10G.
- Reduções declaradas: não rodei `npm test` da raiz nem Postgres local porque o mandato do ciclo 3 pede check/lint/build e define a CI (`backend`/`backend-postgres`) como régua; nenhum resultado de banco antigo foi herdado. A sonda usou filtro (5 pass/33 skip) e as mutações foram confirmadas nos testes-dono.

### Backend, CI e estabilidade final — 2026-10-28T13:01:17Z

- Comando: diff `<objeto>~6..<objeto>` em `src prisma scripts`; check-runs obrigatórios; resolução final de ramo remoto/PR/worktree/origin-main/merge-base.
- Saída resumida: backend diff `0`; Node 22 log `v22.14.0`; 2× `backend`, 2× `backend-postgres`, 2× `frontend`, todos `completed/success`. Ramo remoto = PR = worktree = `cfb19fd115bac02ef65eb94202b01a64e6730854`; `origin/main=merge-base=f076973921539165df8d406b8c061dbf4e4ee127`; status `0`; C: 10G.
- Veredito do Item 3: **FECHADO — APROVADO**. Bateria verde após preparo obrigatório do cliente Prisma; baixa/regressões verdes; backend intocado e CI verde. Nenhuma classe grave de produto encontrada.

## RETOMADA 2026-10-28T21:10:58Z

- Identidade retomada: `jurado-san312b-ciclo3-c3-sol` · Codex CLI · GPT-5.6 Sol · esforço medium · nível menor declarado. A evidência acima foi relida integralmente antes desta amostragem P3. Docker permaneceu desligado e não foi invocado.
- Comando 1: `gh pr view 469 --json headRefOid,statusCheckRollup`, via `C:/Program Files/Git/bin/bash.exe -lc`.
- Saída resumida: `headRefOid=cfb19fd115bac02ef65eb94202b01a64e6730854`; 14 check-runs, todos `COMPLETED/SUCCESS`.
- Comparação: objeto idêntico ao registrado e não andou; resultado dos checks idêntico ao da seção `Backend, CI e estabilidade final`.
- Comando 2: consulta registrada de check-runs por `gh api repos/thiagodorgo/ERP_Techsolutios/commits/cfb19fd115bac02ef65eb94202b01a64e6730854/check-runs`, com lista única e filtro dos obrigatórios não-verdes.
- Saída resumida: `authority-portal`, `backend`, `backend-postgres`, `docker`, `flutter`, `frontend` e `owner-portal` = `completed/success`; `obrigatorios-nao-verdes=0`.
- Comparação: saída igual à registrada no mandato e compatível com a evidência anterior (as duplicatas por rodada colapsam para os mesmos 7 nomes).
- Comando 3: amostra registrada de `pendencias.md` e do escopo do ciclo 3 por `git show`/`git diff`: status dos dois fechamentos, censo das cinco pendências E3.4, cabeçalhos em `<objeto>~6` e no objeto, e pathspec proibido (`src prisma .github Kpis frontend/package.json`).
- Saída resumida: os dois status continuam `FECHADA`; cada uma das cinco pendências aparece `1` vez; cabeçalhos `670 -> 675`; caminhos proibidos `0`.
- Comparação: saída idêntica à registrada em `Três vias, seções, desconto D-8, índice e pendências` e no mandato. A correção de registro continua presente no objeto.
- Veredito da retomada: os três itens permanecem **FECHADOS — APROVADOS**. Nenhum defeito grave de produto (perda de dado, vazamento entre organizações, quebra de permissão ou erro de dinheiro) apareceu na amostragem; pela régua do ciclo 3, voto final `APROVADO`.
- Teardown revalidado: `C:/Users/AMP/j12b-c3-c3r3-wt` ausente no disco e no registro de `git worktree`; processos estranhos com esse caminho `0`; nenhum container foi criado ou consultado nesta retomada; nenhum commit foi feito.

