# VOTO-393-J3-C1 — C1‴ invariância de forma · junta 3 · B-GOV-MANDATO · PR #393 · ciclo 3

C1‴ · jurado-mandato-c1c-invariancia-de-forma · 2ª INSTÂNCIA · modelo Opus 5.5 (claude-opus-5-5; frontmatter do corpo: model: opus) · md5 EOL-neutro do corpo aplicado = 35765f76d40f9c775c571d67799544b8 (blob 28b4defd:.claude/agents/especialistas/jurado-mandato-c1c-invariancia-de-forma.md)

Início da 2ª instância: 2026-09-30T16:14:38Z (local 13:14). Arquivo SOBRESCRITO por ordem do orquestrador (o parcial da 1ª instância está preservado fora deste caminho; não foi aberto nem herdado).
Nota de terreno: roda como general-purpose (tem Write/Edit que o corpo nega) — não escreve/edita nada no repositório nem em worktree alheio; único arquivo escrito = este + arnês próprio em $S/j3c1b/.
ERRATA E-11 prevalece sobre a l.166 do corpo: NUNCA export MSYS_NO_PATHCONV=1; prefixo por comando só em ref:caminho.

## §0 Corpo (13:14)
comando: MSYS_NO_PATHCONV=1 git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios show 28b4defdc067387f384e06614e033e0976e9912b:.claude/agents/especialistas/jurado-mandato-c1c-invariancia-de-forma.md | tr -d "\r" | md5sum
resultado: 35765f76d40f9c775c571d67799544b8 (confere com o esperado) · 450 linhas

## §1 Legalidade do ciclo 3 em origin/main (13:15)
cwd árvore principal (só leitura) · git fetch origin main ec=0 · origin/main = 3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c
MSYS_NO_PATHCONV=1 git show origin/main:agent-orchestration/controle/decisoes.md > $W/decisoes-main.md → ec=0
grep -n D-SEM-TETO-AUDITORIA-NO-3 → l.2633: '## `D-SEM-TETO-AUDITORIA-NO-3` — o teto de ciclos cai; no ciclo 3 audita-se a MÁQUINA (decisão do dono, 2026-09-27)'
controle positivo: grep -c D-TETO-DOIS-CICLOS = 9 (o arquivo lido é o certo)
gh pr view 394: state MERGED, mergedAt 2026-09-28T19:55:12Z, mergeCommit b3f0af5f82aca23502326f18b644a28df3236b5a
→ ciclo 3 LEGAL. Sigo para o mérito.

## §2 Objeto (13:15)
git ls-remote origin refs/heads/chore/mandato-refs-e-preflight = 28b4defdc067387f384e06614e033e0976e9912b
git rev-parse origin/chore/mandato-refs-e-preflight (pós-fetch) = 28b4defdc067387f384e06614e033e0976e9912b
gh pr view 393 --json headRefOid = 28b4defdc067387f384e06614e033e0976e9912b (state OPEN, isDraft true)
= o que o inspetor liberou (28b4defd). Não andou até aqui.

## §3 Terreno (13:17)
git worktree add --detach C:/Users/AMP/w-j3c1 28b4defd… → ec=0 (não existia ao nascer: ls -d falhou antes); status --porcelain vazio; HEAD = 28b4defdc067387f384e06614e033e0976e9912b
Ambiente: env | grep -c '^MSYS_NO_PATHCONV=' = 0 · git version 2.53.0.windows.2 · node v20.19.5 · MINGW64_NT-10.0-22631 3.6.6-1cdd4371.x86_64 x86_64
npm ci --no-audit --no-fund (próprio) ec=0 (added 326 packages) · DATABASE_URL=postgresql://x:x@127.0.0.1:1/x npx prisma generate ec=0 · node_modules LinkType=[] (diretório real, sem junction)
Base viva erp-postgres/erp-redis: nenhum comando meu abre conexão (itens sem banco).
Blobs no head (git rev-parse H:arq · hash-object na árvore):
  scripts/mandato-refs.sh 474c7521f97dc64d936ecd3751932bda70a6e526 wt-hash-object=474c7521f97dc64d936ecd3751932bda70a6e526
  scripts/mandato-preflight.sh faa408c8e14665c232be518eced6adbfffe3ee7d wt-hash-object=faa408c8e14665c232be518eced6adbfffe3ee7d
  tests/mandato-refs.test.ts d455ae1acc639b8b02ab00ea3d86a40329dde1fc wt-hash-object=d455ae1acc639b8b02ab00ea3d86a40329dde1fc
  tests/mandato-preflight.test.ts 7a52d37c3a704263ae639d8fa52d07525c9f2a03 wt-hash-object=7a52d37c3a704263ae639d8fa52d07525c9f2a03
  scripts/mandato-mutantes.sh 375492620c64f8bc3b1cc9e61c5f46bbb56a2131 wt-hash-object=375492620c64f8bc3b1cc9e61c5f46bbb56a2131
bash scripts/mandato-refs.sh 393 (sem MSYS_NO_PATHCONV) → ec e saída:
  # refs do PR #393 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
  # gerado em: 2026-09-30T16:17Z · repo: thiagodorgo/ERP_Techsolutios
  
  ramo:            chore/mandato-refs-e-preflight
  base:            origin/main
  estado:          OPEN | rascunho=true | MERGEABLE
  head do PR:      28b4defdc067387f384e06614e033e0976e9912b
  merge-base:      3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c
  merge commit:    <ainda nao mergeado>
  check-runs:      total=14 nao-verdes=0 pendentes=0
  approved_head:   NAO DETERMINAVEL (a ata casa o PR mas NAO declara aprovacao: nenhuma linha '- **approved_head:**')
                   objeto declarado 7462b75bfb7768556a2da2ee13f9ac92e9198872 (agent-orchestration/omega/juntas/J-B-GOV-MANDATO.md:10 @head-do-PR) — aprovacao nao legivel por maquina
                   objeto declarado 4c8819effd0b9f7a1ef8040eaa1707ca8342fdad (agent-orchestration/omega/juntas/J-B-GOV-MANDATO.md:96 @head-do-PR) — aprovacao nao legivel por maquina
                   agent-orchestration/omega/juntas/J-B-GOV-SEM-TETO.md (mencao no corpo) @head-do-PR
                   NAO invente: sem a linha '- **approved_head:**' numa ata que se declare
                   sobre este PR, a ferramenta NAO afirma qual head a junta aprovou.
  

## §4 Inelegibilidade (13:19)
cwd w-j3c1 · ls agent-orchestration/omega/reprovacoes/ | grep R-B-GOV-MANDATO → R-B-GOV-MANDATO-1.md, R-B-GOV-MANDATO-2.md; não há votos/B-GOV-MANDATO/ no head.
  files: agent-orchestration/omega/juntas/J-B-GOV-MANDATO.md agent-orchestration/omega/reprovacoes/R-B-GOV-MANDATO-1.md
  agent-orchestration/omega/reprovacoes/R-B-GOV-MANDATO-2.md 
  agent-orchestration/omega/juntas/J-B-GOV-MANDATO.md self=0 ctrl_c1=0 ctrl_guardiao=1
  agent-orchestration/omega/reprovacoes/R-B-GOV-MANDATO-1.md self=0 ctrl_c1=0 ctrl_guardiao=1
  agent-orchestration/omega/reprovacoes/R-B-GOV-MANDATO-2.md self=0 ctrl_c1=0 ctrl_guardiao=1
→ meu nome 0× na ata e nos dois R-*; controle positivo (guardiao-fail-closed, cadeira do ciclo 2) 1× em cada arquivo no MESMO laço.
Onde meu nome aparece no repo (grep -rli em agent-orchestration docs):
  agent-orchestration/omega/juntas/BRIEFING-B-GOV-MANDATO.md
  agent-orchestration/omega/juntas/BRIEFING-B-GOV-SEM-TETO.md
  docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-plano.md
  docs/revisoes/SAN3/B-GOV-SEM-TETO-plano.md
Briefing ciclo 3 l.177-181: as três cadeiras são c1c/c2c/c3c — nenhuma da lista de inelegíveis (l.189-204). Sem divergência.

## §5 Arnês e controles (13:40)
- Arnês $W=scratchpad/j3c1b. Três raízes, cada uma repo git próprio (git init + commit) com scripts/mandato-preflight.sh (variante), scripts/mandato-refs.sh e docs/sub/existe.md:
  hH = git show 28b4defd:scripts/mandato-preflight.sh → hash-object --no-filters faa408c8e14665c232be518eced6adbfffe3ee7d = blob do head
  h2 = git show 34969a81:… → 68fe23c9e75a7e6bd72404bd7db1ebe4d45676bc = blob de 34969a81 (vermelho-controle histórico)
  hP = git show c32f77b5^:… (c32f77b5^ = 9d3de5dd08b1b6b18021ad045acdc82eb918abed) → 3ff7d78c6a97343df5f7dc095108a1cc83084dc7 (pré-Dev-S-2, item 8)
  git log -S rotulo_ah -- scripts/mandato-preflight.sh → c32f77b5 (remoção, Dev-S-2) e cea715da; nascimento: git log --diff-filter=A → f8d5a2c8 2026-09-25 (neste bloco); git diff --name-status 3b1fe0f9 28b4defd → A scripts/mandato-preflight.sh
- Shim PRÓPRIO $W/shim/refs.sh (não o do guard): PRs 4100/4101 ND ec=3, 4102/4104 LIDO ec=0 (approved_head = head), 4103 AUSENTE, 4198/4199 mortos ec=1/2; estado por arquivo (state/<N>.head muda o head = colagem velha; state/<N>.dead mata). Toda colagem é GERADA chamando esse mesmo shim (função gen), nunca escrita à mão. MANDATO_REFS = esse shim em toda rodada.
- Execução: MANDATO_REFS=$SHIM timeout 60 bash <raiz>/scripts/mandato-preflight.sh <fixture> [PR] > out/<raiz>.<nome>.txt; ec por variável; rej = grep -c '^REJEITADO  ' do ARQUIVO.
- Diferencial A11 (item 1, 53 fixtures): tree (C:/Users/AMP/w-j3c1, RAIZ = worktree real) × hH: diff de (nome, ec, rej) e das mensagens → IDÊNTICOS nas 53 comuns (a única linha a mais em hH é uma fixture que não rodei na árvore: j10-h2-fora-par, par inválido descartado). O arnês não é a variável.

## §6 Item 1 — [F-EXT] fronteira e JUNTAR (13:40)
Formato: fixture | head (hH=tree) ec rej · mensagem | 34969a81 (h2) ec rej. Fixtures em $W/fx/, saídas em $W/out/. PR 4102 onde há SHA/token.
  fr1-vazia                    head ec=1 rej=1 | ciclo2 ec=1 rej=1
  fr1-vazia-par                head ec=0 rej=0 | ciclo2 ec=0 rej=0
  fr2-secao                    head ec=1 rej=2 | ciclo2 ec=1 rej=2
  fr2-secao-par                head ec=0 rej=0 | ciclo2 ec=0 rej=0
  fr3-cerca                    head ec=1 rej=2 | ciclo2 ec=1 rej=1
  fr3-cerca-par                head ec=0 rej=0 | ciclo2 ec=0 rej=0
  fr4-eof                      head ec=1 rej=1 | ciclo2 ec=1 rej=1
  fr4-eof-par                  head ec=0 rej=0 | ciclo2 ec=0 rej=0
  g-par-controle               head ec=0 rej=0 | ciclo2 ec=0 rej=0
  g1-escape-md                 head ec=1 rej=1 | ciclo2 ec=0 rej=0
  g2-espacado                  head ec=1 rej=1 | ciclo2 ec=0 rej=0
  g3-partido-enfase            head ec=1 rej=1 | ciclo2 ec=0 rej=0
  g4-entidade-html             head ec=0 rej=0 | ciclo2 ec=0 rej=0
  j1-indent-apos               head ec=1 rej=1 | ciclo2 ec=0 rej=0
  j1-indent-apos-par           head ec=1 rej=5 | ciclo2 ec=1 rej=5
  j10-h2-fora                  head ec=0 rej=0 | ciclo2 ec=0 rej=0
  j10-h2-fora-par2             head ec=1 rej=1 | ciclo2 ec=1 rej=1
  j10b-h2-antes                head ec=0 rej=0 | ciclo2 ec=0 rej=0
  j10b-h3-antes-ctrl           head ec=1 rej=1 | ciclo2 ec=0 rej=0
  j11-sha-dois-pontos          head ec=0 rej=0 | ciclo2 ec=0 rej=0
  j11-sha-dois-pontos-par      head ec=1 rej=1 | ciclo2 ec=1 rej=1
  j11c-fake-caminho            head ec=0 rej=0 | ciclo2 ec=0 rej=0
  j2-cerca-afirm               head ec=0 rej=0 | ciclo2 ec=0 rej=0
  j2-cerca-afirm-par           head ec=1 rej=1 | ciclo2 ec=0 rej=0
  j3-tabela-indent             head ec=1 rej=1 | ciclo2 ec=0 rej=0
  j3-tabela-indent-par         head ec=0 rej=0 | ciclo2 ec=0 rej=0
  j4-2grep-seg                 head ec=0 rej=0 | ciclo2 ec=0 rej=0
  j4-2grep-seg-par             head ec=1 rej=2 | ciclo2 ec=1 rej=1
  j5-sha-colado                head ec=1 rej=1 | ciclo2 ec=0 rej=0
  j5-sha-colado-par            head ec=1 rej=1 | ciclo2 ec=1 rej=1
  j6-hip-em-cerca              head ec=1 rej=1 | ciclo2 ec=0 rej=0
  j6-hip-em-cerca-par          head ec=0 rej=0 | ciclo2 ec=0 rej=0
  j7-ctrl-sem-token            head ec=1 rej=2 | ciclo2 ec=1 rej=1
  j7-token-em-cerca            head ec=0 rej=0 | ciclo2 ec=0 rej=0
  j7-token-em-cerca-par        head ec=0 rej=0 | ciclo2 ec=0 rej=0
  j7b-grep-colado              head ec=0 rej=0 | ciclo2 ec=0 rej=0
  j7c-cerca-solta              head ec=0 rej=0 | ciclo2 ec=0 rej=0
  j7c-cerca-solta-ctrl         head ec=1 rej=2 | ciclo2 ec=1 rej=1
  j8-afirm-no-cabecalho        head ec=0 rej=0 | ciclo2 ec=0 rej=0
  j8-afirm-no-cabecalho-par    head ec=1 rej=1 | ciclo2 ec=1 rej=1
  j8b-hip-cabecalho            head ec=0 rej=0 | ciclo2 ec=0 rej=0
  j9-grep-no-cabecalho         head ec=0 rej=0 | ciclo2 ec=0 rej=0
  j9-grep-no-cabecalho-par     head ec=1 rej=1 | ciclo2 ec=1 rej=1
  s3-neg                       head ec=1 rej=1 | ciclo2 ec=1 rej=1
  s3-pos                       head ec=0 rej=0 | ciclo2 ec=0 rej=0
  s4-neg                       head ec=1 rej=1 | ciclo2 ec=1 rej=1
  s4-pos                       head ec=0 rej=0 | ciclo2 ec=0 rej=0
  s5-neg                       head ec=1 rej=1 | ciclo2 ec=1 rej=1
  s5-pos                       head ec=0 rej=0 | ciclo2 ec=0 rej=0
  s6-neg                       head ec=1 rej=1 | ciclo2 ec=1 rej=1
  s6-pos                       head ec=0 rej=0 | ciclo2 ec=0 rej=0
  s7-neg                       head ec=1 rej=1 | ciclo2 ec=0 rej=0
  s7-pos                       head ec=0 rej=0 | ciclo2 ec=1 rej=1
Mensagens do head (verbatim, cortadas em 230 col):
  hH   g4-entidade-html                   ec=0 rej=0 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|
  hH   j1-indent-apos                     ec=1 rej=1 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: unidade de MEDIDO sem 'medido por: <comando>' — l.4:   - 3103/3105 verde 1 (li
  hH   j1-indent-apos-par                 ec=1 rej=5 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: unidade de MEDIDO sem 'medido por: <comando>' — l.4: - 3103/3105 verde 1 (linh
  hH   j10-h2-fora                        ec=0 rej=0 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|
  hH   j10-h2-fora-par                    ec=0 rej=0 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|
  hH   j10-h2-fora-par2                   ec=1 rej=1 | REJEITADO: linha(s) de conteudo fora de MEDIDO/HIPOTESE:|AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|
  hH   j10b-h2-antes                      ec=0 rej=0 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|
  hH   j10b-h3-antes-ctrl                 ec=1 rej=1 | REJEITADO: linha(s) de conteudo fora de MEDIDO/HIPOTESE:|AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|
  hH   j11-sha-dois-pontos                ec=0 rej=0 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|
  hH   j11-sha-dois-pontos-par            ec=1 rej=1 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: SHA 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef' nao esta na saida de mandato-refs
  hH   j11c-fake-caminho                  ec=0 rej=0 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|
  hH   j2-cerca-afirm                     ec=0 rej=0 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|
  hH   j2-cerca-afirm-par                 ec=1 rej=1 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: unidade de MEDIDO sem 'medido por: <comando>' — l.4:   3103/3105 verde (linha 
  hH   j3-tabela-indent                   ec=1 rej=1 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: unidade de MEDIDO sem 'medido por: <comando>' — l.6:   CI 14/14 (linha apos o 
  hH   j3-tabela-indent-par               ec=0 rej=0 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|
  hH   j4-2grep-seg                       ec=0 rej=0 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|AVISO: caixa-exata: isenta 2 invocacao(oes) sem -i — l.3|
  hH   j4-2grep-seg-par                   ec=1 rej=2 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: invocacao de grep/rg SEM -i (e o segmento nao declara 'caixa-exata:') — l.3: -
  hH   j5-sha-colado                      ec=1 rej=1 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: corrida hexadecimal de 80 caracteres (SHAs colados?) — l.3|
  hH   j5-sha-colado-par                  ec=1 rej=1 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: SHA 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef' nao esta na saida de mandato-refs
  hH   j6-hip-em-cerca                    ec=1 rej=1 | REJEITADO: falta a secao '## HIPOTESE' — a unica ocorrencia esta DENTRO de cerca, l.6|AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|
  hH   j6-hip-em-cerca-par                ec=0 rej=0 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|
  hH   j7-ctrl-sem-token                  ec=1 rej=2 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: unidade de MEDIDO sem 'medido por: <comando>' — l.3: - cobertura 87,4% em 12 d
  hH   j7-token-em-cerca                  ec=0 rej=0 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|
  hH   j7-token-em-cerca-par              ec=0 rej=0 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|
  hH   j7b-grep-colado                    ec=0 rej=0 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|
  hH   j7c-cerca-solta                    ec=0 rej=0 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|
  hH   j7c-cerca-solta-ctrl               ec=1 rej=2 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: unidade de MEDIDO sem 'medido por: <comando>' — l.3: ```|REJEITADO: saida cola
  hH   j8-afirm-no-cabecalho              ec=0 rej=0 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|
  hH   j8-afirm-no-cabecalho-par          ec=1 rej=1 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: unidade de MEDIDO sem 'medido por: <comando>' — l.3: cobertura 87,4% em 12 de 
  hH   j8b-hip-cabecalho                  ec=0 rej=0 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|
  hH   j9-grep-no-cabecalho               ec=0 rej=0 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|
  hH   j9-grep-no-cabecalho-par           ec=1 rej=1 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: invocacao de grep/rg SEM -i (e o segmento nao declara 'caixa-exata:') — l.3: m
Na árvore (RAIZ = w-j3c1, onde 34969a81 resolve), PR 4102:
  tree j11b-sha-velho-caminho             ec=0 rej=0 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|
  tree j11b-sha-velho-caminho-par         ec=1 rej=1 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: SHA '34969a811a25c0a1faa438bc384846c1e8b019c6' nao
  tree j11c-fake-caminho                  ec=0 rej=0 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|
  tree j11d-sha-velho-nome                ec=0 rej=0 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|
Medição do mecanismo (cwd w-j3c1): git rev-parse --verify --quiet <deadbeef×5, 40 hex> → ec=0 (imprime o próprio hex); <deadbeef, 8 hex> → ec=1; '<40hex>^{object}' → ec=1; git cat-file -e <40hex> → ec=1; no repo do arnês hH também ec=0. Ou seja: 'rev-parse --verify' NÃO confere existência de SHA completo.

Fixtures-chave (conteúdo, LF — conferido por od -c nas de EOL):
  --- j7-token-em-cerca.md
    | ## MEDIDO
    | 
    | - cobertura 87,4% em 12 de 13 rotas
    |   ```
    |   medido por: true
    |   ```
    | 
    | ## HIPOTESE
    | 
    | - nada aqui. derruba com: true
  --- j7-ctrl-sem-token.md
    | ## MEDIDO
    | 
    | - cobertura 87,4% em 12 de 13 rotas
    |   ```
    |   saida
    |   ```
    | 
    | ## HIPOTESE
    | 
    | - nada aqui. derruba com: true
  --- j7b-grep-colado.md
    | ## MEDIDO
    | 
    | - 12 unidades sem evidencia no mandato antigo
    |   ```
    |   l.14: - suite verde, medido por: npm test
    |   ```
    | 
    | ## HIPOTESE
    | 
    | - nada aqui. derruba com: true
  --- j8-afirm-no-cabecalho.md
    | ## MEDIDO — cobertura 87,4% em 12 de 13 rotas
    | 
    | - a, medido por: true
    | 
    | ## HIPOTESE
    | 
    | - nada aqui. derruba com: true
  --- j9-grep-no-cabecalho.md
    | ## MEDIDO medido por: grep -c "naoaparece" CLAUDE.md
    | 
    | - a, medido por: true
    | 
    | ## HIPOTESE
    | 
    | - nada aqui. derruba com: true
  --- j10b-h2-antes.md
    | ## Resumo — suite 3103/3105 verde e CI 14/14
    | ## Resumo 2 — o approved_nada 87%
    | 
    | ## MEDIDO
    | 
    | - a, medido por: true
    | 
    | ## HIPOTESE
    | 
    | - nada aqui. derruba com: true
  --- j10b-h3-antes-ctrl.md
    | ### Resumo — suite 3103/3105 verde e CI 14/14
    | 
    | ## MEDIDO
    | 
    | - a, medido por: true
    | 
    | ## HIPOTESE
    | 
    | - nada aqui. derruba com: true
  --- j11-sha-dois-pontos.md
    | ## MEDIDO
    | 
    | - o objeto julgado e deadbeefdeadbeefdeadbeefdeadbeefdeadbeef:CLAUDE.md, medido por: true
    | 
    | ## HIPOTESE
    | 
    | - nada aqui. derruba com: true
  --- j11-sha-dois-pontos-par.md
    | ## MEDIDO
    | 
    | - o objeto julgado e deadbeefdeadbeefdeadbeefdeadbeefdeadbeef CLAUDE.md, medido por: true
    | 
    | ## HIPOTESE
    | 
    | - nada aqui. derruba com: true
  --- j11c-fake-caminho.md
    | ## MEDIDO
    | 
    | - o objeto julgado e deadbeefdeadbeefdeadbeefdeadbeefdeadbeef:scripts/mandato-preflight.sh, medido por: true
    | 
    | ## HIPOTESE
    | 
    | - nada aqui. derruba com: true
  --- g4-entidade-html.md
    | ## MEDIDO
    | 
    | - o campo approved&#95;head vale x, medido por: true
    | 
    | ## HIPOTESE
    | 
    | - nada aqui. derruba com: true

Leitura do item 1 (contra o inventário E2.i e as fronteiras §3/§13.7/P-GOV-MANDATO-3-FRONTEIRAS):
  - As seis junções do §10: j1 (5 indentadas após o token) REJ 1 'apos o comando' (≥1, nunca 0) — conforme; ciclo 2 = 0 (discrimina). j2 (afirmações em cerca sob token) OK de propósito (fr. 18) — conforme; par não cercado REJ 1. j3 (linha de tabela + 3 indentadas) REJ 1 — conforme; ciclo 2 = 0. j4 (2 grep no mesmo segmento + caixa-exata:) AVISO 'isenta 2' — conforme (fr. 20); par sem declaração REJ 2 (por invocação). j5 (80 hex) REJ 'corrida hexadecimal de 80' — conforme; ciclo 2 = 0. j6 (## HIPOTESE em cerca) REJ 'DENTRO de cerca, l.6' — conforme; ciclo 2 = 0.
  - Fronteira (partir): fr1 (linha vazia) REJ 1 / par 0; fr2 (seção) REJ 2 / par 0; fr3 (cerca antes de token não indentado) REJ 2 / par indentado 0; fr4 (EOF sem \n) REJ 1 / par 0 — partir é seguro nas quatro.
  - Grafias: g1 'approved\_head', g2 letras espaçadas, g3 'APPROVED' + '**HEAD**' em 2 linhas → REJ 1 cada (ciclo 2 = 0). g4 'approved&#95;head' (referência de caractere HTML) → ec=0 nos dois: a normalização alfanumérica mantém '95' → ESCAPE (adversarial, vizinho da fronteira 15 que só nomeia homoglifos/largura zero).
  - JUNÇÕES MINHAS com veredito ≠ inventário (achados, ver JSON):
    · j7: afirmação FORA da cerca + 'medido por:' só DENTRO da cerca → ec=0; o par de controle (mesma cerca com 'saida') → ec=1 rej=2 (REJ3M + 'saida colada sem comando'). O único byte que muda é o conteúdo da cerca. j7b (saída de grep colada contendo 'medido por:') e j7c (cerca solta com 'medido por:' dentro) → ec=0. A cerca, que o inventário declara SAÍDA (I19/fr.18: 'afirmações digitadas DENTRO de cerca não são cobradas'), é usada como COMANDO e absolve a afirmação que está FORA dela, e silencia a I19 ('saida colada sem comando'). Ciclo 2: j7 0 também (a classe não é nova do ciclo 3, mas o artefato nasceu neste bloco).
    · j8/j8b/j9: texto colado na LINHA de cabeçalho '## MEDIDO …'/'## HIPOTESE …' (afirmação, ou grep sem -i) → ec=0; o mesmo texto na linha seguinte → REJ (chk 3 / chk 5). A linha de cabeçalho é pulada pelas checagens 3 e 5 (HD=1, l.389) e o reconhecedor é por PREFIXO (l.168-169).
    · j10/j10b: '## <qualquer coisa>' FORA das seções (antes de ## MEDIDO ou depois do fim) → ec=0; o controle '### <a mesma coisa>' fora → REJ chk 2; '## Conclusao' + conteúdo na linha seguinte → REJ chk 2. O oráculo nunca emite FORA para a linha '## ' (l.170). O inventário só isenta '# título' (I8).
    · j11/j11c/j11b/j11d: SHA JUNTADO a nome/caminho por ':' ('<sha>:CLAUDE.md', '<sha>:scripts/mandato-preflight.sh') → ec=0 com SHA FABRICADO (deadbeef×5) e com SHA real fora da proveniência (34969a81…); o par separado por espaço → REJ 'SHA … nao esta na saida'. O token inteiro deixa de ser hex (chk 4 não o vê) e a chk 6 aceita porque 'git rev-parse --verify' aceita qualquer 40-hex.

## §7 Item 3 — colagens próprias, GERADAS do shim (13:48)
PR 4102 em todas; 4104 morto por state/4104.dead durante c-morto; c-velha: state/4102.head alterado DEPOIS de gerar o bloco, e restaurado.
  hH   c-ok-1                             ec=0 rej=0 | COLAGEM: l.4-18: refs do PR #4101 confere com a saida atual|
  hH   c-ok-2prs                          ec=0 rej=0 | COLAGEM: l.4-18: refs do PR #4101 confere com a saida atual|COLAGEM: l.21-35: refs do PR #4102 confere com a saida atual|
  hH   c-parcial                          ec=1 rej=3 | REJEITADO: l.4-17: bloco '# refs do PR #4102' NAO bate com a saida atual de mandato-refs.sh 4102 (parcial, edi|AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/ma
  hH   c-abuso-acima                      ec=1 rej=1 | COLAGEM: l.5-19: refs do PR #4102 confere com a saida atual|REJEITADO: l.3: token reservado approved_head fora da colagem da ferramenta|
  hH   c-abuso-abaixo                     ec=1 rej=1 | COLAGEM: l.4-18: refs do PR #4102 confere com a saida atual|REJEITADO: l.19: token reservado approved_head fora da colagem da ferramenta|
  hH   c-abuso-dentro                     ec=1 rej=5 | REJEITADO: l.4-19: bloco '# refs do PR #4102' NAO bate com a saida atual de mandato-refs.sh 4102 (parcial, edi|AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/ma
  hH   c-sem-cabecalho                    ec=1 rej=2 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: caminho citado nao existe: agent-orchestration/omega/juntas/J-4102.md (conferido
  hH   c-2x                               ec=0 rej=0 | COLAGEM: l.4-18: refs do PR #4102 confere com a saida atual|COLAGEM: l.21-35: refs do PR #4102 confere com a saida atual|
  hH   c-prosa-sha-com                    ec=0 rej=0 | COLAGEM: l.6-20: refs do PR #4101 confere com a saida atual|
  hH   c-prosa-sha-sem                    ec=1 rej=1 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: SHA 'c0de4101c0de4101c0de4101c0de4101c0de4101' nao esta na saida de mandato-refs
  hH   c-gerado-em-inj                    ec=0 rej=0 | COLAGEM: l.4-19: refs do PR #4102 confere com a saida atual|
  hH   c-gerado-em-edit                   ec=0 rej=0 | COLAGEM: l.4-18: refs do PR #4102 confere com a saida atual|
  hH   c-gerado-em-lava                   ec=0 rej=0 | COLAGEM: l.4-19: refs do PR #4102 confere com a saida atual|
  hH   c-gerado-em-lava-par               ec=1 rej=1 | COLAGEM: l.6-20: refs do PR #4102 confere com a saida atual|REJEITADO: SHA 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef' nao esta na saida de mandato-refs.sh 4102 (resolver |
  hH   c-info-string                      ec=0 rej=0 | COLAGEM: l.4-18: refs do PR #4102 confere com a saida atual|
  hH   c-info-string-par                  ec=0 rej=0 | COLAGEM: l.4-18: refs do PR #4102 confere com a saida atual|
  hH   c-morto                            ec=1 rej=5 | COLAGEM: l.4-18: refs do PR #4101 confere com a saida atual|REJEITADO: l.21-35: referencias indisponiveis para #4104 (mandato-refs.sh ec=1) — nada foi verificado|REJEITADO: SH
  c-velha (head do shim movido): 0 — ver abaixo; com o head restaurado: COLAGEM l.4-18 confere, ec=0 (legítimo com head inalterado é ACEITO).
  Detalhe (verbatim):
  == c-parcial
     REJEITADO  l.4-17: bloco '# refs do PR #4102' NAO bate com a saida atual de mandato-refs.sh 4102 (parcial, editado ou DESATUALIZADO: o head andou?)
     AVISO      sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)
     REJEITADO  caminho citado nao existe: agent-orchestration/omega/juntas/J-4102.md (conferido em $RAIZ/ e em $RAIZ/mobile/flutter_app/ — nao ha busca por basename)
     REJEITADO  l.14: token reservado approved_head fora da colagem da ferramenta
  == c-abuso-dentro
     REJEITADO  l.4-19: bloco '# refs do PR #4102' NAO bate com a saida atual de mandato-refs.sh 4102 (parcial, editado ou DESATUALIZADO: o head andou?)
     AVISO      sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)
     REJEITADO  SHA 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef' nao esta na saida de mandato-refs.sh 4102 (resolver nao basta — e pode ser SHA VELHO: o ramo anda)
     REJEITADO  caminho citado nao existe: agent-orchestration/omega/juntas/J-4102.md (conferido em $RAIZ/ e em $RAIZ/mobile/flutter_app/ — nao ha busca por basename)
     REJEITADO  l.12: token reservado approved_head fora da colagem da ferramenta
     REJEITADO  l.16: token reservado approved_head fora da colagem da ferramenta
  == c-sem-cabecalho
     AVISO      sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)
     REJEITADO  caminho citado nao existe: agent-orchestration/omega/juntas/J-4102.md (conferido em $RAIZ/ e em $RAIZ/mobile/flutter_app/ — nao ha busca por basename)
     REJEITADO  l.14: token reservado approved_head fora da colagem da ferramenta
  == c-morto
     COLAGEM    l.4-18: refs do PR #4101 confere com a saida atual
     REJEITADO  l.21-35: referencias indisponiveis para #4104 (mandato-refs.sh ec=1) — nada foi verificado
     REJEITADO  SHA '0b1e41040b1e41040b1e41040b1e41040b1e4104' nao esta na saida de mandato-refs.sh 4102 (resolver nao basta — e pode ser SHA VELHO: o ramo anda)
     REJEITADO  SHA 'c0de4104c0de4104c0de4104c0de4104c0de4104' nao esta na saida de mandato-refs.sh 4102 (resolver nao basta — e pode ser SHA VELHO: o ramo anda)
     REJEITADO  caminho citado nao existe: agent-orchestration/omega/juntas/J-4104.md (conferido em $RAIZ/ e em $RAIZ/mobile/flutter_app/ — nao ha busca por basename)
     REJEITADO  l.32: token reservado approved_head fora da colagem da ferramenta
  Conforme o contrato E2.b/M5: ok-1, 2 PRs, 2×, abuso acima/abaixo (REJ só a linha estranha, COLAGEM do bloco mantida), abuso dentro (NAO bate + DESATUALIZADO + #4102 + token + SHA), parcial, sem cabeçalho (não é colagem → token/caminho REJ + AVISO), morto (REJ '#4104 … nada foi verificado', sem 'falsa'; 4101 continua COLAGEM), F-4d com/sem bloco (OK / REJ), velha (REJ).
  ATAQUES DE JUNTAR À COLAGEM (meus) — a linha fica DENTRO do bloco verificado e herda a isenção I1:
   · c-gerado-em-inj: linha '  # gerado em: o approved_head verdadeiro e <deadbeef×5>' INSERIDA no bloco 4102 → COLAGEM confere, ec=0. Par c-abuso-dentro: a mesma inserção SEM o prefixo '# gerado em:' → ec=1 rej=5 (NAO bate/token/SHA). O prefixo é a única variável.
   · c-gerado-em-edit: a linha '# gerado em:' do próprio bloco EDITADA para 'approved_head = <deadbeef×5> (fabricado)' → ec=0.
   · c-gerado-em-lava: <deadbeef×5> injetado numa linha '# gerado em:' do bloco + prosa FORA do bloco '- o head verdadeiro e <deadbeef×5>, medido por: true' → ec=0 — o SHA fabricado entra na proveniência (PROVCOL, l.262-263, lê o bloco.raw inteiro) e absolve a linha de prosa fora do bloco. Par c-gerado-em-lava-par (mesma prosa, bloco sem injeção) → ec=1 'SHA deadbeef… nao esta na saida'.
   · c-info-string: abertura da cerca do bloco verificado '  ```approved_head <deadbeef×5>' → ec=0 (a linha de abertura não entra na comparação — bloco.raw é ini+1..fim-1, l.241 — mas entra em EXENTAS, l.260-261, de ini a fim). Par c-info-string-par ('```text') → ec=0 (legítimo).
  2ª execução em raiz distinta (árvore real w-j3c1): os 4 ataques ec=0 e os 2 pares ec=1 — IDÊNTICO (item3-tree.txt).
  Vermelho-controle 34969a81 (h2): os 4 ataques → ec=1 (h2 não tinha isenção de colagem). A brecha NASCE no ciclo 3, com a isenção I1.
  Origem do 'grep -v ^# gerado em:': git log -S → 33356358 2026-09-28 00:37:18 -0300 feat(gov): pre-voo v3 — oraculo unico, agregacao por estrutura e approved_head como token reservado (B-GOV-MANDATO ciclo 3, E2) 
     h2   c-ok-1                             ec=1 rej=3 | REJEITADO: SHA '0b1e41010b1e41010b1e41010b1e41010b1e4101' nao esta na saida de mandato-refs.sh 4102 (resolver |REJEITADO: SHA 'c0de4101c0de4101c0de
     h2   c-abuso-dentro                     ec=1 rej=3 | REJEITADO: SHA 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef' nao esta na saida de mandato-refs.sh 4102 (resolver |REJEITADO: caminho citado nao existe
     h2   c-gerado-em-inj                    ec=1 rej=2 | REJEITADO: SHA 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef' nao esta na saida de mandato-refs.sh 4102 (resolver |REJEITADO: caminho citado nao existe
     h2   c-gerado-em-edit                   ec=1 rej=3 | REJEITADO: SHA 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef' nao esta na saida de mandato-refs.sh 4102 (resolver |REJEITADO: caminho citado nao existe
     h2   c-gerado-em-lava                   ec=1 rej=2 | REJEITADO: SHA 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef' nao esta na saida de mandato-refs.sh 4102 (resolver |REJEITADO: caminho citado nao existe
     h2   c-info-string                      ec=1 rej=2 | REJEITADO: SHA 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef' nao esta na saida de mandato-refs.sh 4102 (resolver |REJEITADO: caminho citado nao existe
     tree c-gerado-em-inj                    ec=0 rej=0 | COLAGEM: l.4-19: refs do PR #4102 confere com a saida atual|
     tree c-gerado-em-edit                   ec=0 rej=0 | COLAGEM: l.4-18: refs do PR #4102 confere com a saida atual|
     tree c-gerado-em-lava                   ec=0 rej=0 | COLAGEM: l.4-19: refs do PR #4102 confere com a saida atual|
     tree c-info-string                      ec=0 rej=0 | COLAGEM: l.4-18: refs do PR #4102 confere com a saida atual|
     tree c-abuso-dentro                     ec=1 rej=5 | REJEITADO: l.4-19: bloco '# refs do PR #4102' NAO bate com a saida atual de mandato-refs.sh 4102 (parcial, edi|AVISO: sem colagem da ferramenta (co
     tree c-gerado-em-lava-par               ec=1 rej=1 | COLAGEM: l.6-20: refs do PR #4102 confere com a saida atual|REJEITADO: SHA 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef' nao esta na saida de mandato-
  Fixtures dos ataques (conteúdo):
   --- c-gerado-em-inj.md
     | ## MEDIDO
     | 
     | - referencias do #4102, medido por: bash scripts/mandato-refs.sh 4102
     |   ```
     |   # refs do PR #4102 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
     |   # gerado em: 2026-09-30T16:33:27Z-82661 · repo: t/t
     |   # gerado em: o approved_head verdadeiro e deadbeefdeadbeefdeadbeefdeadbeefdeadbeef
     | 
     |   ramo:            fix/j3c1-4102
     |   base:            origin/main
     |   estado:          OPEN | rascunho=false | UNKNOWN
     |   head do PR:      c0de4102c0de4102c0de4102c0de4102c0de4102
     |   merge-base:      0b1e41020b1e41020b1e41020b1e41020b1e4102
     |   merge commit:    <ainda nao mergeado>
     |   check-runs:      total=14 nao-verdes=0 pendentes=0
     |   approved_head:   c0de4102c0de4102c0de4102c0de4102c0de4102
     |                    ^ LIDO DA ATA: agent-orchestration/omega/juntas/J-4102.md:4 @head-do-PR
     | 
     |   ```
     | 
     | ## HIPOTESE
     | 
     | - nada aqui. derruba com: true
   --- c-info-string.md
     | ## MEDIDO
     | 
     | - referencias do #4102, medido por: bash scripts/mandato-refs.sh 4102
     |   ```approved_head deadbeefdeadbeefdeadbeefdeadbeefdeadbeef
     |   # refs do PR #4102 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
     |   # gerado em: 2026-09-30T16:33:31Z-83460 · repo: t/t
     | 
     |   ramo:            fix/j3c1-4102
     |   base:            origin/main
     |   estado:          OPEN | rascunho=false | UNKNOWN
     |   head do PR:      c0de4102c0de4102c0de4102c0de4102c0de4102
     |   merge-base:      0b1e41020b1e41020b1e41020b1e41020b1e4102
     |   merge commit:    <ainda nao mergeado>
     |   check-runs:      total=14 nao-verdes=0 pendentes=0
     |   approved_head:   c0de4102c0de4102c0de4102c0de4102c0de4102
     |                    ^ LIDO DA ATA: agent-orchestration/omega/juntas/J-4102.md:4 @head-do-PR
     | 
     |   ```
     | 
     | ## HIPOTESE
     | 
     | - nada aqui. derruba com: true

## §8 Item 2 — cerca e oráculo: F-8 + 2 variantes próprias (M0, M1) (13:50)
Formato: fixture | head ec rej | 34969a81 ec rej.
  f2c-cerca-antes                head ec=1 rej=1 | ciclo2 ec=1 rej=1
  f8a-aberta-eof                 head ec=1 rej=1 | ciclo2 ec=0 rej=0
  f8a-aberta-eof-par             head ec=0 rej=0 | ciclo2 ec=0 rej=0
  f8b-paridade                   head ec=1 rej=3 | ciclo2 ec=0 rej=0
  f8c-4crases                    head ec=0 rej=0 | ciclo2 ec=0 rej=0
  f8d-til                        head ec=0 rej=0 | ciclo2 ec=0 rej=0
  f8v1-fecho-com-texto           head ec=1 rej=2 | ciclo2 ec=0 rej=0
  f8v1-fecho-com-texto-par       head ec=0 rej=0 | ciclo2 ec=0 rej=0
  f8v2-til-curto                 head ec=1 rej=1 | ciclo2 ec=0 rej=0
  f8v2-til-curto-par             head ec=0 rej=0 | ciclo2 ec=0 rej=0
  f8v3-inline-3crases            head ec=0 rej=0 | ciclo2 ec=0 rej=0
  f8v3-inline-3crases-par        head ec=1 rej=2 | ciclo2 ec=1 rej=1
  hH   f1d-medido-so-em-cerca             ec=1 rej=2 | REJEITADO: falta a secao '## MEDIDO' — a unica ocorrencia esta DENTRO de cerca, l.3|REJEITADO: linha(s) de conteudo fora de MEDIDO/HIPOTESE:|AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/
  h2   f1d-medido-so-em-cerca             ec=1 rej=1 | REJEITADO: linha(s) de conteudo fora de MEDIDO/HIPOTESE:|
  hH   f1d-medido-so-em-cerca-par         ec=1 rej=1 | REJEITADO: linha(s) de conteudo fora de MEDIDO/HIPOTESE:|AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|
  h2   f1d-medido-so-em-cerca-par         ec=1 rej=1 | REJEITADO: linha(s) de conteudo fora de MEDIDO/HIPOTESE:|
  Mensagens do head:
   hH   f8a-aberta-eof                     ec=1 rej=1 | REJEITADO: cerca aberta desde l.10 (` x3) sem fechamento ate o fim do arquivo|AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|
   hH   f8a-aberta-eof-par                 ec=0 rej=0 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|
   hH   f8b-paridade                       ec=1 rej=3 | REJEITADO: cerca aberta desde l.14 (` x3) sem fechamento ate o fim do arquivo|AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: un
   hH   f8c-4crases                        ec=0 rej=0 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|
   hH   f8d-til                            ec=0 rej=0 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|
   hH   f8v1-fecho-com-texto               ec=1 rej=2 | REJEITADO: falta a secao '## HIPOTESE' — a unica ocorrencia esta DENTRO de cerca, l.8|REJEITADO: cerca aberta desde l.4 (` x3) sem fechamento ate o fim do arquivo|AVISO: sem c
   hH   f8v1-fecho-com-texto-par           ec=0 rej=0 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|
   hH   f8v2-til-curto                     ec=1 rej=1 | REJEITADO: cerca aberta desde l.10 (~ x4) sem fechamento ate o fim do arquivo|AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|
   hH   f8v2-til-curto-par                 ec=0 rej=0 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|
   hH   f8v3-inline-3crases                ec=0 rej=0 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|
   hH   f8v3-inline-3crases-par            ec=1 rej=2 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: unidade de MEDIDO sem 'medido por: <comando>' — l.4:   `a` (linha apos o coman
   hH   f1d-medido-engolido                ec=0 rej=0 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|
   hH   f2c-cerca-antes                    ec=1 rej=1 | REJEITADO: linha(s) de conteudo fora de MEDIDO/HIPOTESE:|AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|
  Leitura: F-8a (aberta no EOF) REJ 'cerca aberta desde l.10 (` x3)'; F-8b (paridade invertida) REJ nomeando a abertura l.14; ```` e ~~~ envolvendo ``` → OK. Variante própria V1 (fechamento com texto '``` fim' — não fecha pela regra do oráculo, l.179) → REJ 'falta a secao ## HIPOTESE — DENTRO de cerca, l.8' + 'cerca aberta desde l.4'; V2 (~~~~ "fechada" por ~~~, mais curta) → REJ 'cerca aberta desde l.10 (~ x4)'. F-1d próprio (## MEDIDO só dentro de cerca) → REJ 'DENTRO de cerca, l.3' + FORA; ciclo 2 só FORA. Pares OK. Ciclo 2 = 0 em F-8a/b, V1, V2 → discriminam.
  Um só reconhecedor: li as duas passadas — a 2ª (REC) só consome FE/SC/HD do arquivo do oráculo (l.336) e BLOCO/FORA/SWALLOW vêm dele; não achei 2º reconhecedor de seção/cerca.
  Terceira variante (divergência do oráculo com a CommonMark que o cabeçalho l.37 invoca): f8v3 — linha '  ```a```' (em CommonMark NÃO abre cerca: info string de crase não pode conter crase; é código em linha) → o oráculo ABRE cerca, e a afirmação '- suite 3103/3105 verde e CI 14/14' na linha seguinte vira 'saída' → ec=0; o par com crase simples → REJ 2. Registro como NOTA (o contrato E2.a enuncia só 'abre com ≥3 crases ou tils', e o script segue o enunciado).

## §9 Item 4 — F-AGG / F-ISO / F-SM com amostras próprias, em par (13:50)
  agg2-prosa-antes                 head ec=0 rej=0 | ciclo2 ec=0 rej=0
  agg2-prosa-antes-par             head ec=1 rej=2 | ciclo2 ec=1 rej=2
  agg3-saida-cercada               head ec=0 rej=0 | ciclo2 ec=0 rej=0
  agg4-saida-nao-cercada           head ec=1 rej=1 | ciclo2 ec=0 rej=0
  agg8-prosa-apos                  head ec=1 rej=1 | ciclo2 ec=0 rej=0
  agg8-prosa-apos-par              head ec=0 rej=0 | ciclo2 ec=0 rej=0
  iso10-vazia-em-cerca             head ec=0 rej=0 | ciclo2 ec=0 rej=0
  iso10-vazia-em-cerca-sem-token   head ec=0 rej=0 | ciclo2 ec=0 rej=0
  iso11-fgrep                      head ec=1 rej=1 | ciclo2 ec=0 rej=0
  iso11-fgrep-par                  head ec=0 rej=0 | ciclo2 ec=0 rej=0
  iso11-grep-caminho               head ec=0 rej=0 | ciclo2 ec=0 rej=0
  iso11-grep-caminho-par           head ec=1 rej=1 | ciclo2 ec=1 rej=1
  iso11-grep-exe                   head ec=0 rej=0 | ciclo2 ec=0 rej=0
  iso2-entre-unidades              head ec=1 rej=1 | ciclo2 ec=1 rej=1
  iso2-intra-linha-g               head ec=1 rej=1 | ciclo2 ec=0 rej=0
  iso2-intra-linha-h               head ec=1 rej=1 | ciclo2 ec=0 rej=0
  iso2-intra-unidade               head ec=1 rej=1 | ciclo2 ec=0 rej=0
  iso2-intra-unidade-par           head ec=0 rej=0 | ciclo2 ec=0 rej=0
  iso5-pseudo-sep                  head ec=1 rej=1 | ciclo2 ec=1 rej=1
  iso5-pseudo-sep-par              head ec=0 rej=0 | ciclo2 ec=0 rej=0
  iso7-h3-chk3                     head ec=0 rej=0 | ciclo2 ec=0 rej=0
  iso7-h3-chk46                    head ec=1 rej=2 | ciclo2 ec=1 rej=2
  iso7-h3-chk5                     head ec=1 rej=1 | ciclo2 ec=0 rej=0
  sm3-indent-sem-pai               head ec=1 rej=1 | ciclo2 ec=1 rej=1
  sm4-celula-vazia-indent          head ec=1 rej=2 | ciclo2 ec=1 rej=1
  sm4-par                          head ec=0 rej=0 | ciclo2 ec=0 rej=0
  sm4-pipe-apos-nao-tabela         head ec=1 rej=1 | ciclo2 ec=1 rej=1
  sm4-pipe-escapado                head ec=0 rej=0 | ciclo2 ec=0 rej=0
  sm4-pipe-escapado-par            head ec=1 rej=1 | ciclo2 ec=1 rej=1
  Mensagens do head (as que rejeitam):
   hH   agg2-prosa-antes-par               ec=1 rej=2 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: unidade de MEDIDO sem 'medido por: <comando>' — l.3: - reivindicacao em tres l
   hH   agg4-saida-nao-cercada             ec=1 rej=1 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: unidade de MEDIDO sem 'medido por: <comando>' — l.4:   # tests 3058 (linha apo
   hH   agg8-prosa-apos                    ec=1 rej=1 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: unidade de MEDIDO sem 'medido por: <comando>' — l.4:   e isso prova que o cach
   hH   iso2-intra-unidade                 ec=1 rej=1 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: invocacao de grep/rg SEM -i (e o segmento nao declara 'caixa-exata:') — l.3: -
   hH   iso2-entre-unidades                ec=1 rej=1 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: invocacao de grep/rg SEM -i (e o segmento nao declara 'caixa-exata:') — l.5: -
   hH   iso2-intra-linha-g                 ec=1 rej=1 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: invocacao de grep/rg SEM -i (e o segmento nao declara 'caixa-exata:') — l.3:  
   hH   iso2-intra-linha-h                 ec=1 rej=1 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: invocacao de grep/rg SEM -i (e o segmento nao declara 'caixa-exata:') — l.3: -
   hH   iso5-pseudo-sep                    ec=1 rej=1 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: unidade de MEDIDO sem 'medido por: <comando>' — l.3: |--- 87% ---||
   hH   iso7-h3-chk5                       ec=1 rej=1 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: invocacao de grep/rg SEM -i (e o segmento nao declara 'caixa-exata:') — l.3: #
   hH   iso7-h3-chk46                      ec=1 rej=2 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: SHA 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef' nao esta na saida de mandato-refs
   hH   iso11-fgrep                        ec=1 rej=1 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: invocacao de grep/rg SEM -i (e o segmento nao declara 'caixa-exata:') — l.3:  
   hH   iso11-grep-caminho-par             ec=1 rej=1 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: invocacao de grep/rg SEM -i (e o segmento nao declara 'caixa-exata:') — l.3: -
   hH   sm3-indent-sem-pai                 ec=1 rej=1 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: unidade de MEDIDO sem 'medido por: <comando>' — l.3:   - 3103/3105 verde (recu
   hH   sm4-celula-vazia-indent            ec=1 rej=2 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: unidade de MEDIDO sem 'medido por: <comando>' — l.5: | suite 3103/3105 |  ||RE
   hH   sm4-pipe-escapado-par              ec=1 rej=1 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: unidade de MEDIDO sem 'medido por: <comando>' — l.5: | suite 3103/3105 e CI 14
   hH   sm4-pipe-apos-nao-tabela           ec=1 rej=1 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: unidade de MEDIDO sem 'medido por: <comando>' — l.8: | suite 3103/3105 |  | (l
  Leitura por caso:
   F-AGG-2 (prosa ANTES do token) OK / par em coluna 0 REJ 2 — fr.17, conforme. F-AGG-3 OK. F-AGG-4 REJ 1 'apos o comando' (ciclo 2: 0). F-AGG-8 REJ 1 (ciclo 2: 0) / par (prosa antes) OK. F-AGG-1/5/6/7: ver item 1 (j1, j3, j7-ctrl, j2).
   F-ISO-2=F-5f nos DOIS lados: intra-unidade (caixa-exata: na l.2, grep sem -i na l.1 da mesma unidade) → REJ da l.1 (ciclo 2: 0); ambas declaradas → 2 AVISO 'isenta 1'; entre unidades → REJ l.5; intra-linha F-5g → REJ do 2º segmento, F-5h → REJ do 1º (ciclo 2: 0 e 0). Disparo × sobre-isenção: a isenção I2 não passa do segmento — conforme.
   F-ISO-5 '|--- 87% ---|' → REJ (não é separador); par separador real → OK. F-ISO-7: '### 3103/3105 verde' → OK (I7, fr.13, de propósito); '### … grep -c' → REJ chk 5 (ciclo 2: 0); '### … caminho + SHA' → REJ 2 (chk 4 e 6) — a I7 isenta SÓ a chk 3, conforme.
   F-ISO-10: linha vazia DENTRO de cerca não fecha a unidade → OK; F-ISO-11: 'cat f | fgrep "x" ; rg -i y g' → REJ só o fgrep; par com -i → OK.
   F-SM-3: indentada sem pai → REJ 1. F-SM-4: célula vazia + 1 indentada → REJ 2 (a linha e a unidade nova; ciclo 2: 1); '|' após linha sem '|' → REJ 1 (tabCol zerado).
   ACHADOS deste item (ver JSON): (a) iso10-vazia-em-cerca-sem-token — '- a' + cerca com linha vazia e 'medido por: true' DENTRO → OK: mesma classe do j7 (o token DENTRO da cerca satisfaz a unidade). (b) iso11-grep-caminho '/usr/bin/grep -c …' e iso11-grep-exe 'grep.exe -c …' → ec=0 nos dois ciclos; par 'grep -c …' → REJ: a família 'nome que TERMINA em grep' não reconhece o nome precedido de '/' nem seguido de '.exe' (contaGrep, l.290). (c) sm4-pipe-escapado '| suite 3103/3105 \| CI 14/14 |  |' → ec=0 (a crase-barra é célula literal em GFM; o split por '|' da l.312/317 lê a cauda da afirmação como célula de evidência cheia); par sem '\|' → REJ.
  ERRATA de redação (minha, 13:50): no item 4(c) acima, leia-se 'a barra-invertida antes do pipe (\|) é pipe LITERAL dentro da célula em GFM' — não 'crase-barra'.

## §10 Item 5 — fixtures das duas rodadas do crítico (amostra mínima) (14:06)
crit393c/B/*.md (corpos, sem seções) embrulhados como o guard faz (## MEDIDO + corpo + ## HIPOTESE mínima), PR 393, MANDATO_REFS=$W/shim/crit.sh (MEU: --sha-only = os 2 SHAs do tool.txt dele, 7e42f338… e 6852cd84…, ec=3; saída ND) — assim a chk 4 não interfere. crit393d/fx/*.md copiados byte a byte (cmp ok) e rodados como documentos inteiros.
  hH   crit1-f-bullet                     ec=1 rej=1 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|AVISO: approved_head NAO DETERMINAVEL (mandato-refs.sh ec=3) 
  hH   crit1-f-heading                    ec=1 rej=1 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|AVISO: approved_head NAO DETERMINAVEL (mandato-refs.sh ec=3) 
  hH   crit1-f-paste-puro                 ec=1 rej=3 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: unidade de MEDIDO sem 'medido por: <comando>' — 
  hH   crit1-f-prosa                      ec=1 rej=1 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|AVISO: approved_head NAO DETERMINAVEL (mandato-refs.sh ec=3) 
  hH   crit1-f-quebra                     ec=1 rej=1 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|AVISO: approved_head NAO DETERMINAVEL (mandato-refs.sh ec=3) 
  hH   crit1-f-tabela                     ec=1 rej=3 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: unidade de MEDIDO sem 'medido por: <comando>' — 
  hH   crit1-x-cerca-apos                 ec=1 rej=3 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: unidade de MEDIDO sem 'medido por: <comando>' — 
  hH   crit1-x-citacao-apos               ec=1 rej=2 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: unidade de MEDIDO sem 'medido por: <comando>' — 
  hH   crit1-x-definicao-frouxa           ec=1 rej=2 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: unidade de MEDIDO sem 'medido por: <comando>' — 
  hH   crit1-x-details                    ec=1 rej=5 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: unidade de MEDIDO sem 'medido por: <comando>' — 
  hH   crit1-x-lista-frouxa               ec=1 rej=2 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: unidade de MEDIDO sem 'medido por: <comando>' — 
  hH   crit1-x-paste-abuso                ec=1 rej=5 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: unidade de MEDIDO sem 'medido por: <comando>' — 
  hH   crit2-m3-cerca-engole              ec=1 rej=1 | REJEITADO: falta a secao '## HIPOTESE' — a unica ocorrencia esta DENTRO de cerca, l.8|AVISO: sem colagem da ferramenta (cole a saida de: bash scr
  hH   crit2-m3-controle-sem-cerca        ec=1 rej=1 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: unidade de HIPOTESE sem 'derruba com: <comando>' �
  hH   crit2-m4-caixa-exata-2grep         ec=1 rej=1 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: invocacao de grep/rg SEM -i (e o segmento nao decl
  hH   crit2-m4-controle-sem-caixa        ec=1 rej=2 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: invocacao de grep/rg SEM -i (e o segmento nao decl
  hH   crit2-m5-controle-unidade-normal   ec=1 rej=1 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: unidade de MEDIDO sem 'medido por: <comando>' — 
  hH   crit2-m5-uok-continuacao           ec=1 rej=1 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: unidade de MEDIDO sem 'medido por: <comando>' — 
  hH   crit2-m5b-celula-vazia             ec=1 rej=2 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: unidade de MEDIDO sem 'medido por: <comando>' — 
  hH   crit2-m5c-uok-3-afirmacoes         ec=1 rej=1 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: unidade de MEDIDO sem 'medido por: <comando>' — 
  hH   crit2-m6-controle                  ec=1 rej=1 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: caminho citado nao existe: docs/nao/existe/plano.m
  hH   crit2-m6-isencoes-chk6             ec=0 rej=0 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|
  hH   crit2-m7-chk6-fora-do-inventario   ec=0 rej=0 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|
  hH   crit2-m7-controle-com-barra        ec=1 rej=1 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: caminho citado nao existe: dir/naoexiste-xyz.md (c
  hH   crit2-m8-agrega-cerca              ec=0 rej=0 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|
  hH   crit2-m8-agrega-indent             ec=1 rej=1 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: unidade de MEDIDO sem 'medido por: <comando>' — 
  hH   crit2-m8-controle-nao-indent       ec=1 rej=5 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: unidade de MEDIDO sem 'medido por: <comando>' — 
  Qual checagem rejeitou (rodada 1):
   crit1-f-bullet: chk7 l.3 
   crit1-f-heading: chk7 l.3 
   crit1-f-paste-puro: chk3 l.3 chk3 l.4 chk7 l.4 
   crit1-f-prosa: chk7 l.3 
   crit1-f-quebra: chk7 l.3 
   crit1-f-tabela: chk3 l.3 chk3 l.5 chk7 l.5 
   crit1-x-cerca-apos: chk3 l.5 I19 l.5 chk7 l.3 
   crit1-x-citacao-apos: chk3 l.5 chk7 l.3 
   crit1-x-definicao-frouxa: chk3 l.3 chk7 l.3 
   crit1-x-details: chk3 l.3 chk3 l.4 chk3 l.6 chk3 l.8 chk7 l.4 
   crit1-x-lista-frouxa: chk3 l.3 chk7 l.3 
   crit1-x-paste-abuso: chk3 l.4 chk3 l.5 chk4 deadbeef chk7 l.3 chk7 l.5 
  Esperado v3 × obtido:
   · F-7a (guard l.978-999: status 1 + /token reservado|fora da colagem/) — as 10 (f-bullet/heading/prosa/quebra/tabela, x-lista-frouxa/details/definicao-frouxa/citacao-apos/cerca-apos) → ec=1 com chk7 presente em TODAS; nas frouxas e em f-tabela a chk 3 também rejeita (A14: a chk 7 fala em todas, e é a que o guard assere). CONFORME.
   · f-paste-puro e x-paste-abuso NÃO estão no guard (grep do nome = 0). Derivação pelo contrato E2.b: sem cerca e sem 1ª linha '# refs do PR #N' → não é colagem → token REJ + chk 3 nas linhas sem 'medido por:'; x-paste-abuso ainda chk4 do deadbeef. Obtido: f-paste-puro chk3×2 + chk7 (ec=1); x-paste-abuso chk3×2 + chk4 + chk7×2 (ec=1). CONFORME à derivação.
   · Rodada 2 com esperado no guard: m3-cerca-engole REJ 'DENTRO de cerca, l.8' (F-1c) ✓; m4-caixa-exata-2grep REJ 1 no 2º grep (F-5f) ✓; m5-controle-unidade-normal REJ 1 'apos o comando' (F-AGG-8) ✓; m5b-celula-vazia REJ 2 (F-SM-4) ✓; m5c REJ 1 (F-AGG-5, guard ≥1) ✓; m8-agrega-cerca OK (F-AGG-7) ✓; m8-agrega-indent REJ 1 (F-AGG-1) ✓; m8-controle-nao-indent REJ 5 ✓.
   · Rodada 2 SEM o nome no guard — derivação: m4-controle-sem-caixa (2 grep sem -i, sem declaração) → REJ 2 ✓; m5-uok-continuacao (linha de tabela cheia + indentada) → REJ 1 (I12/F-AGG-5) ✓; m6-controle (docs/nao/existe/plano.md) → REJ chk6 ✓; m6-isencoes-chk6 (placeholder <…>, sem extensão, razão) → OK (I16/I14/I15) ✓; m7-chk6-fora-do-inventario → OK (I13/I14/I15, fronteiras 3/4; o conteúdo é o do F-6f) ✓; m7-controle-com-barra → REJ ✓.
   · m3-controle-sem-cerca (arquivo do crítico) → ec=1 rej=1, REJ3H 'unidade de HIPOTESE sem derruba com' na l.8 — o arquivo NÃO tem 'derruba com:' na hipótese. O guard [F-1c-controle] (l.1023-1037) diz 'a MESMA fixture … (m3-controle do critico)' e usa verbatim(), mas acrescenta '. derruba com: true' à l.8 → ali dá OK. O veredito do head sobre o arquivo verbatim é o do contrato (chk 3 em HIPOTESE); a divergência é do guard (ver item 9).
  Conclusão item 5: 27 fixtures, 0 divergência do script contra o esperado v3/derivado; 8 dos 27 não estão no guard por nome (f-paste-puro, x-paste-abuso, m4-controle-sem-caixa, m5-uok-continuacao, m6-controle, m6-isencoes-chk6, m7-chk6-fora-do-inventario, m7-controle-com-barra; o conteúdo de m7 aparece no F-6f).

## §11 Item 7 — [F-EOL] (14:06)
CRLF gerado por script (sed 's/$/\r/') a partir das fixtures LF; CR provado por od -An -tx1 (contagem de 0d = contagem de 0a): eol-s3-neg 7/7, eol-s7-pos 22/22, eol-c-ok-2prs 39/39. (grep -c $'\r' deu 0 na mesma fixture — cego, como o corpo avisa.)
  LF × CRLF (head):
   s3-neg LF[ec=1 rej=1] CRLF[ec=1 rej=1]
   s3-pos LF[ec=0 rej=0] CRLF[ec=0 rej=0]
   s4-neg LF[ec=1 rej=1] CRLF[ec=1 rej=1]
   s4-pos LF[ec=0 rej=0] CRLF[ec=0 rej=0]
   s5-neg LF[ec=1 rej=1] CRLF[ec=1 rej=1]
   s5-pos LF[ec=0 rej=0] CRLF[ec=0 rej=0]
   s6-neg LF[ec=1 rej=1] CRLF[ec=1 rej=1]
   s6-pos LF[ec=0 rej=0] CRLF[ec=0 rej=0]
   s7-neg LF[ec=1 rej=1] CRLF[ec=1 rej=1]
   s7-pos LF[ec=0 rej=0] CRLF[ec=0 rej=0]
   c-ok-2prs LF[ec=0 rej=0] CRLF[ec=0 rej=0]
   c-ok-1 LF[ec=0 rej=0] CRLF[ec=0 rej=0]
  → as 10 pontas das sementes S3–S7 e as 2 colagens (1 e 2 PRs): MESMO veredito em CRLF; colagem CRLF → COLAGEM confere. CONFORME ao [F-EOL] do contrato.
  Extensão minha — CR SOLITÁRIO (fim de linha pela CommonMark: 'a carriage return not followed by a newline'): '- suite 3103/3105 verde<CR>- CI 14/14, medido por: true' (od: 1 CR, 7 LF)
   hH   eol-cr-solitario                   ec=0 rej=0 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|
   h2   eol-cr-solitario                   ec=0 rej=0 | 
   hH   eol-cr-solitario-par-lf            ec=1 rej=1 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: unidade de MEDIDO sem 'medido por: <comando>' — 
   h2   eol-cr-solitario-par-lf            ec=1 rej=1 | REJEITADO: unidade de MEDIDO sem 'medido por: <comando>' — l.3: - suite 3103/3105 verde|
   hH   eol-cr-solitario-par-crlf          ec=1 rej=1 | AVISO: sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)|REJEITADO: unidade de MEDIDO sem 'medido por: <comando>' — 
   h2   eol-cr-solitario-par-crlf          ec=1 rej=1 | REJEITADO: unidade de MEDIDO sem 'medido por: <comando>' — l.3: - suite 3103/3105 verde|
  → com CR solitário ec=0; as mesmas duas linhas em LF e em CRLF → ec=1 REJ 'l.3: - suite 3103/3105 verde'. O 'tr -d \r' (l.137) JUNTA as duas linhas numa só, e o 'medido por:' da segunda absolve a primeira. Ciclo 2 idem (a classe é do awk com RS=\n). Num terminal, 'cat' desse arquivo sobrescreve a 1ª linha com a 2ª.

## §12 Item 8 — [B8b] por PROPRIEDADE (14:06)
Shims MEUS: b8v2-nd (ND, ec=3), b8v2-lido-a (approved_head = SA + linha '^ LIDO DA ATA'), b8v2-lido-b (= SB); todos com --sha-only = SA e SB (a chk 4 fica fora). SA=5a×20, SB=5b×20. PR 4242. Fixtures: b8-lista '- approved_head: `SA` medido por: true'; b8-tabela (cabeçalho nomeando a coluna + linha 'approved_head `SA` | true'); b8-prosa; controle sem token.
  hH  nd      b8-lista               ec=1 rej=1 tokenres=1 foracol=1 rotula_velha=0 | l.3: token reservado approved_head fora da colagem da ferramenta|
  hH  nd      b8-tabela              ec=1 rej=1 tokenres=1 foracol=1 rotula_velha=0 | l.5: token reservado approved_head fora da colagem da ferramenta|
  hH  nd      b8-prosa               ec=1 rej=1 tokenres=1 foracol=1 rotula_velha=0 | l.3: token reservado approved_head fora da colagem da ferramenta|
  hH  nd      b8-controle-sem-token  ec=0 rej=0 tokenres=0 foracol=0 rotula_velha=0 | 
  hH  lido-a  b8-lista               ec=1 rej=1 tokenres=1 foracol=1 rotula_velha=0 | l.3: token reservado approved_head fora da colagem da ferramenta|
  hH  lido-a  b8-tabela              ec=1 rej=1 tokenres=1 foracol=1 rotula_velha=0 | l.5: token reservado approved_head fora da colagem da ferramenta|
  hH  lido-a  b8-prosa               ec=1 rej=1 tokenres=1 foracol=1 rotula_velha=0 | l.3: token reservado approved_head fora da colagem da ferramenta|
  hH  lido-a  b8-controle-sem-token  ec=0 rej=0 tokenres=0 foracol=0 rotula_velha=0 | 
  hH  lido-b  b8-lista               ec=1 rej=1 tokenres=1 foracol=1 rotula_velha=0 | l.3: token reservado approved_head fora da colagem da ferramenta|
  hH  lido-b  b8-tabela              ec=1 rej=1 tokenres=1 foracol=1 rotula_velha=0 | l.5: token reservado approved_head fora da colagem da ferramenta|
  hH  lido-b  b8-prosa               ec=1 rej=1 tokenres=1 foracol=1 rotula_velha=0 | l.3: token reservado approved_head fora da colagem da ferramenta|
  hH  lido-b  b8-controle-sem-token  ec=0 rej=0 tokenres=0 foracol=0 rotula_velha=0 | 
  hP  nd      b8-lista               ec=1 rej=2 tokenres=1 foracol=1 rotula_velha=1 | l.3: token reservado approved_head fora da colagem da ferramenta|l.3: o mandato rotula 5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a como approved_head, mas a ferramenta diz NAO DETERMINAVEL|
  hP  nd      b8-tabela              ec=1 rej=1 tokenres=1 foracol=1 rotula_velha=0 | l.5: token reservado approved_head fora da colagem da ferramenta|
  hP  nd      b8-prosa               ec=1 rej=1 tokenres=1 foracol=1 rotula_velha=0 | l.3: token reservado approved_head fora da colagem da ferramenta|
  hP  nd      b8-controle-sem-token  ec=0 rej=0 tokenres=0 foracol=0 rotula_velha=0 | 
  hP  lido-a  b8-lista               ec=1 rej=1 tokenres=1 foracol=1 rotula_velha=0 | l.3: token reservado approved_head fora da colagem da ferramenta|
  hP  lido-a  b8-tabela              ec=1 rej=1 tokenres=1 foracol=1 rotula_velha=0 | l.5: token reservado approved_head fora da colagem da ferramenta|
  hP  lido-a  b8-prosa               ec=1 rej=1 tokenres=1 foracol=1 rotula_velha=0 | l.3: token reservado approved_head fora da colagem da ferramenta|
  hP  lido-a  b8-controle-sem-token  ec=0 rej=0 tokenres=0 foracol=0 rotula_velha=0 | 
  hP  lido-b  b8-lista               ec=1 rej=2 tokenres=1 foracol=1 rotula_velha=1 | l.3: token reservado approved_head fora da colagem da ferramenta|l.3: o mandato rotula 5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a como approved_head, mas a ferramenta LEU 5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5|
  hP  lido-b  b8-tabela              ec=1 rej=1 tokenres=1 foracol=1 rotula_velha=0 | l.5: token reservado approved_head fora da colagem da ferramenta|
  hP  lido-b  b8-prosa               ec=1 rej=1 tokenres=1 foracol=1 rotula_velha=0 | l.3: token reservado approved_head fora da colagem da ferramenta|
  hP  lido-b  b8-controle-sem-token  ec=0 rej=0 tokenres=0 foracol=0 rotula_velha=0 | 
  Head: nos 3 estados, lista/tabela/prosa → ec=1, EXATAMENTE 1 REJ, 'token reservado' e 'fora da colagem' presentes, mensagem velha 'rotula … como approved_head' AUSENTE; o controle sem token → 0. Tabela e prosa = mesmo veredito da lista ([B8d]).
  Vermelho-controle no pré-Dev-S-2 (hP = c32f77b5^ = 9d3de5dd, blob 3ff7d78c): lista ND → 2, LIDO-A → 1, LIDO-B → 2 — é a tabela do §13.1 (2/1/2). ACUSOU nos dois sentidos.
  Declaração de processo: minha 1ª tentativa (shims sem a linha '^ LIDO DA ATA', out/*.lido-a.txt) deu 2/2/2 no hP porque o detector velho classificava o estado como 'desconhecido' (hP l.560-563) — o fixture NÃO reproduzia o insumo do §13.1; refiz os shims no formato real e só a 2ª rodada (item8v2.txt) conta.

## §13 Item 6 — tentativa de isenção NÃO inventariada (14:10)
Método: li o script inteiro (541 l., blob faa408c8) e listei TODO ponto em que uma linha, token ou bloco sai de uma checagem sem REJ; cada um foi casado contra I1–I20/M0–M6 da E2.i. Controle do método: o 'continue' da l.400 ('### …', comentário '# I7') casa com a linha I7 do inventário e é reconhecido como INVENTARIADO; medido: '### 3103/3105 verde' → ec=0 (isenção da chk 3) e '### … grep -c' → REJ chk 5, '### … caminho + SHA' → REJ chk 4 e 6 (item 4) — exatamente o escopo 'só a chk 3' que a I7 declara. O método distingue.
Pontos de saída sem REJ e o dono no inventário:
  l.173 '# ' fora das seções → I8 · l.240/245/248 bloco sem corpo/sem 1ª linha/sem N → 'não é colagem' (E2.b) · l.260-261 linhas do bloco igual → I1 · l.349 '(novo)' → I3 · l.353 '..' → I9/partição · l.364 >40 hex → REJ · l.371-377 → I13–I17 (I18 l.374) · l.389 'HD==1 continue' → NENHUMA · l.390 fora de M/H → chk 2 · l.399 branco → I10 · l.400 '###' → I7 · l.402 separador → I5 · l.403-406 cabeçalho de tabela → I6 removida (é unidade) · l.407-409 linha de tabela → I12 · l.411-413 indentada antes do token → I20 · l.520-524 '<rev>:<caminho>' → I4 · oráculo l.170 '## ' → sec=X SEM 'FORA' → NENHUMA.
  → DUAS classes de linha puladas sem entrada no inventário, ambas a LINHA DE CABEÇALHO '## …': (a) oráculo l.170 — a linha '## <qualquer texto>' nunca é 'FORA' (a chk 2 só vê o conteúdo ABAIXO dela); (b) REC l.389 — a linha de cabeçalho '## MEDIDO …'/'## HIPOTESE …' é pulada pelas chk 3 e 5 (o reconhecedor é por PREFIXO, l.168-169, então o texto depois de 'MEDIDO' é aceito). A M2 declara '## OUTRA' → X e a M0 'cabeçalho repetido', nenhuma declara que o TEXTO da linha de cabeçalho é isento; a I8 isenta só '# título'. Medido (item 1): j8 '## MEDIDO — cobertura 87,4% em 12 de 13 rotas' → ec=0 (par na linha seguinte → REJ 1); j8b '## HIPOTESE — o cache cai em 3 de 5 rodadas' → ec=0; j9 '## MEDIDO medido por: grep -c "naoaparece" CLAUDE.md' → ec=0 (par → REJ chk 5); j10 '## Conclusao — suite 3103/3105 verde e CI 14/14' depois do fim → ec=0 (par com o texto na linha seguinte → REJ chk 2); j10b dois '## Resumo …' ANTES de '## MEDIDO' → ec=0 (controle '### Resumo …' → REJ chk 2, como o plano §0.6(e) exige para '###'). Ciclo 2: 0 nos mesmos (a classe atravessou os ciclos; nasceu no bloco).
  Duas isenções INVENTARIADAS que absolvem mais do que o escopo declarado (matéria dos itens 3/4, registradas aqui porque o método as achou): I1 (bloco verificado) inclui a linha de abertura da cerca e as linhas '# gerado em:' que a comparação ignora; I4 ('<rev>:<caminho>' só se o prefixo resolve) usa 'git rev-parse --verify', que aceita QUALQUER 40-hex sem conferir existência.

## §14 Item 9 — título × asserção (A14) (14:15)
Leitura: extraí título + asserções de 75 casos da minha competência (F-1/2/4/5/7/8, F-AGG, F-ISO, F-SM, F-EXT, F-EOL, B8a–d) para $W/guard-asserts.txt (awk sobre o guard do head, blob 7a52d37c). Os casos de contagem sem mensagem (F-5a/b/c/e, F-SM-3, F-EXT/fronteira-1) têm fixture sem outra fonte de REJ — a contagem exata discrimina; F-4a/b casam o SHA que só a mensagem da chk 4 imprime (a unidade tem token). Suspeitos executados:
Arnês do guard: $W/gh = git archive 28b4defd das dependências DECLARADAS no cabeçalho de scripts/mandato-mutantes.sh (scripts tests src/config mobile/…/sync_action_store.dart docs/revisoes/SAN3 CLAUDE.md package.json), git init + commit (336 rastreados); hash-object --no-filters por caminho absoluto: script faa408c8 = blob, guard 7a52d37c = blob; LF (0 bytes 0d). Guard rodado com cwd = w-j3c1 (tsx do npm ci próprio) sobre o caminho absoluto do guard do arnês, como a E4 faz.
Controle DIFERENCIAL (A11) no subconjunto '--test-name-pattern=F-EXT/fronteira|F-1c|F-1d|F-EXT/juntar-3': árvore × arnês → '# tests 312 # pass 7 # fail 0 # skipped 305' nos DOIS, e a lista ok/not ok idêntica (diff ec=0). 2º subconjunto 'F-1e-linha|F-1f': arnês 312/2/0/310. (A rodada COMPLETA sem padrão, lançada às 13:28 em paralelo com as minhas rodadas, estourou o timeout de 1500 s nos DOIS lados — ec=124, sumário idêntico 'tests 1 fail 1' de cancelamento; relançada, ver §15.)
Mutantes (1 linha cada, em cópias $W/mA|mB|mC do arnês; diff provado = 1 linha; bash -n ok; pristino intacto faa408c8):
  mA l.168: 'vistoM=1; sec="M";' → 'sec=(vistoM?"Z":"M"); vistoM=1;' (o 2º '## MEDIDO' passa a PERDER o conteúdo em silêncio). Comportamento ANTES da cor: g9-fext3-sem-token (unidade sem token depois do cabeçalho repetido) pristino REJ 1 → mA 0.
  mB l.187: SWALLOW MEDIDO removido. Comportamento: g9-f1d → mensagem perde 'DENTRO de cerca'.
  mC l.188: SWALLOW HIPOTESE removido. Comportamento: g9-juntar3 → mensagem perde 'DENTRO de cerca'.
  Cores (subconjunto 1): mA → só 'not ok [F-EXT/fronteira-2]' — o [F-EXT/fronteira-3] ('cabecalho de secao REPETIDO … SEM PERDER CONTEUDO') fica VERDE: a asserção dele é só status 0 sobre uma fixture cuja unidade repetida TEM token; a propriedade do título é cobrada por outro caso. mB → 7/7 VERDES, inclusive [F-1d] ('REJ pela MESMA razao'), que só assere 'falta a secao ## MEDIDO' sem 'DENTRO de cerca'; subconjunto 2: mB → 'not ok [F-1e-linha]' (a propriedade é coberta ali, com l.7 exata). mC → 'not ok [F-1c]', e [F-EXT/juntar-3] fica VERDE (assere /HIPOTESE/, que a mensagem sem o engolido ainda contém); subconjunto 2: mC → 'not ok [F-1f]'.
  [F-6d] '<rev>:<caminho> com rev que resolve: aceita' — fixture 'HEAD:package.json' não tem '/', logo nem vira caminho (I13): 'NAOEXISTE-QQ:package.json' → ec=0 também (item9-f6d.txt); só com barra a rev decide ('NAOEXISTE-QQ:scripts/mandato-refs.sh' → REJ). Passa por OUTRA causa (A14); a propriedade é coberta por [F-6i/520]/[F-6i/523].
  [F-1c-controle] 'a MESMA fixture sem a cerca (m3-controle do critico)' usa verbatim() mas acrescenta '. derruba com: true' à l.8 — o arquivo do crítico (crit393d/fx/m3-controle-sem-cerca.md) sem isso dá REJ3H (item 5). O par F-1c × F-1c-controle difere em DUAS variáveis (cerca e 'derruba com:').
  [F-7a] assere status 1 + /token reservado|fora da colagem/ (alternância, sem contagem) contra '(os dois)' do §12.3; ambos os ramos são da mensagem nova, e a antiga não contém nenhum — não passa por outra causa. Sem achado.
  Leitura: título × asserção divergem em 4 casos ([F-EXT/fronteira-3], [F-1d], [F-EXT/juntar-3], [F-6d]) e o rótulo 'MESMA fixture' do [F-1c-controle] é falso; em TODOS a propriedade do título é cobrada por outro caso do guard (fronteira-2, F-1e-linha, F-1c/F-1f, F-6i) — mutação morta. Classifico como NOTA (sem buraco de cobertura; matéria de cobertura é da C2‴).

## §15 Classificação dos achados (§1.1) — antes do veredito
Regra do fim da §1.1: (i) reproduz na cópia pristina verificada · (ii) comportamento muda ANTES de olhar cor de guard · (iii) sobrevive à 2ª execução em cwd/arnês distinto · (iv) nenhum controle A1–A14 o dissolve. Escopo: `scripts/mandato-preflight.sh` nasceu NESTE bloco (`git log --diff-filter=A` → f8d5a2c8, 2026-09-25; `git diff --name-status 3b1fe0f9 28b4defd` → `A`); linha de história usada = a do PRÓPRIO ramo (não mergeado; sem squash a apagar nada). Logo nenhum defeito do script é `pre-existente`.

- **C1c-01 · bloqueia · dentro-do-bloco (nasce no ciclo 3, 33356358 — `git log -S "grep -v '^# gerado em:'"`)** — a isenção I1 (colagem verificada) absolve um objeto MAIOR do que o que ela verificou: (a) as linhas `# gerado em:` são ignoradas na igualdade (l.235) mas ficam isentas das chk 4/5/6/7 (l.260-261) e entram na proveniência (l.262-263) — uma linha `# gerado em: <afirmação/token/SHA fabricado>` inserida ou editada dentro de um bloco legítimo sai `COLAGEM … confere` e ec=0, e o SHA fabricado passa a absolver PROSA FORA do bloco; (b) a linha de ABERTURA da cerca (info string) não é comparada (bloco.raw = ini+1..fim-1, l.241) mas é isenta (EXENTAS de ini a fim). Controles: A1 (hH = blob faa408c8), A2 (injeção provada: `grep -n` mostra a l.7 inserida; o par sem prefixo muda o veredito), A3 (LF, od), A11 (árvore = arnês), A14 (o que libera é o caminho COLAGEM, e o par sem `# gerado em:` cai com NAO bate/DESATUALIZADO/token/SHA). (i) sim · (ii) sim (saída do artefato, sem guard) · (iii) sim (w-j3c1) · (iv) nenhum controle dissolve. Coluna ◐ do E2.b: "artefato se a fixture de colagem foi escrita à mão ou o shim ≠ MANDATO_REFS" — o bloco foi GERADO pelo mesmo shim do MANDATO_REFS e só a linha injetada difere → **defeito real**. Vermelho-controle 34969a81: os 4 ataques REJ (a brecha nasce com a isenção nova — "o remédio nasce com a doença").
- **C1c-02 · bloqueia · dentro-do-bloco (classe presente desde o ciclo 1/2; artefato do bloco)** — a checagem 4 não é invariante a JUNTAR: o SHA colado a nome/caminho por `:` deixa de ser SHA para o tokenizador (l.343-377) — `<fabricado 40-hex>:CLAUDE.md` passa em TUDO (sem `/` nem é caminho); `<fabricado 40-hex>:scripts/mandato-preflight.sh` passa porque a chk 6 decide "revisão" por `git rev-parse --verify --quiet` (l.522), que aceita QUALQUER 40-hex sem conferir existência (medido: ec=0 para deadbeef×5; ec=1 para 8 hex, para `^{object}` e para `cat-file -e`); com SHA real e velho (34969a81…) idem. O par separado por espaço → `REJEITADO SHA … nao esta na saida`. A forma `git show <sha>:<caminho>` é a citação corrente da casa (o próprio corpo desta cadeira a usa). A fronteira 1 declara "SHA dentro de URL"; a I4 declara "o prefixo que RESOLVE" — o escape é mais largo que as duas. A §0.5 analisou JUNTAR para SHA só como `<40><40>` (A13, uma direção). Controles: A1, A5 (zero informativo com controle positivo no mesmo laço: o par REJ), A11 (árvore com SHA real; arnês com fabricado), A14 (a REJ do par é a mensagem da chk 4). (i)–(iv) sim → **defeito real**.
- **C1c-03 · bloqueia · dentro-do-bloco (I19 é do ciclo 3)** — a cerca, que I19/fronteira 18 declaram SAÍDA, é usada como COMANDO: `satisfeita()` (l.322) procura o token em `utext`, que inclui as linhas cercadas (l.394). Uma afirmação FORA da cerca + `medido por:` só DENTRO dela → ec=0; o par (a mesma cerca com `saida`) → REJ 2 (chk 3 + `saida colada sem comando`). Forma realista: saída de `grep` colada que contém a string `medido por:` (j7b) → a afirmação acima dela passa sem comando; e a própria I19 é silenciada pelo conteúdo. É o exemplo literal de vermelho do item 1 do meu corpo ("a cerca absolvendo o que está fora dela"). Controles: A1, A11, A14. (i)–(iv) sim → **defeito real**.
- **C1c-04 · bloqueia · dentro-do-bloco (classe desde o ciclo 1/2)** — classe de linha pulada FORA do inventário: a LINHA DE CABEÇALHO `## …`. Oráculo l.170: `## <texto>` nunca é FORA → afirmação escrita como `##` antes/depois das seções passa a chk 2 (controle `###` → REJ). REC l.389 + reconhecedor por prefixo l.168-169: texto na própria linha `## MEDIDO …`/`## HIPOTESE …` escapa das chk 3 e 5. Nenhuma I1–I20/M0–M6 declara isso (I8 = `# título`; M2 = `## OUTRA` → X). E2 regra 3: "Isenção ou estado fora do inventário = divergência não autorizada". Controles: A1, A11, A14 (pares na linha seguinte caem com a mensagem da checagem certa). (i)–(iv) sim → **defeito real**.
- **C1c-05 · ajuste · dentro-do-bloco** — a família da chk 5 ("nome que TERMINA em grep ou rg") não reconhece `/usr/bin/grep -c …` nem `grep.exe -c …` (contaGrep l.290 exige, antes do nome, caractere fora de `[A-Za-z0-9_./-]` e, depois, espaço/fim): ec=0; par `grep -c …` → REJ. Ambos os ciclos.
- **C1c-06 · ajuste · dentro-do-bloco** — M4/I12: pipe escapado `\|` (literal na célula em GFM) é lido como fronteira de célula (split l.312/317): `| suite 3103/3105 \| CI 14/14 |  |` → a cauda da afirmação vira "célula de evidência cheia" → ec=0; par sem `\|` → REJ. Caso não previsto da M4 sem saída fail-closed. Ambos os ciclos.
- **C1c-07 · ajuste · dentro-do-bloco** — [F-EOL] fora do CRLF: CR SOLITÁRIO (fim de linha na CommonMark) é APAGADO por `tr -d '\r'` (l.137) e JUNTA duas linhas; `- suite 3103/3105 verde<CR>- CI 14/14, medido por: true` → ec=0, contra ec=1 em LF e em CRLF. O critério escrito ([F-EOL] = `\r\n`) passa; a propriedade enunciada no cabeçalho (l.133-135, "o CR de fim de linha é ruído") não vale para CR solitário.
- **C1c-08 · nota · dentro-do-bloco** — `approved&#95;head` (referência de caractere HTML) escapa do token reservado (a normalização mantém `95`). Codificação adversarial, vizinha da fronteira 15, que nomeia só homoglifos/largura zero.
- **C1c-09 · nota · dentro-do-bloco** — o oráculo abre cerca em `` ```a``` `` (crase no info string), que a CommonMark citada no cabeçalho (l.37) NÃO trata como cerca; a afirmação seguinte vira "saída" (ec=0; par com crase simples → REJ 2). O contrato E2.a enuncia a regra simplificada e o script a segue.
- **C1c-10 · nota · dentro-do-bloco** — título × asserção no guard: [F-EXT/fronteira-3] (título "sem perder conteúdo", asserção só status 0 — mA verde), [F-1d] ("pela MESMA razão", não assere `DENTRO de cerca` — mB verde), [F-EXT/juntar-3] (/HIPOTESE/ fraco — mC verde), [F-6d] (passa por I13, não pela rev — `NAOEXISTE-QQ:package.json` → ec=0); [F-1c-controle] não é o fixture do crítico (acrescenta `derruba com:`). Em todos a propriedade é cobrada por OUTRO caso (fronteira-2, F-1e-linha, F-1c/F-1f, F-6i) — nenhuma mutação sobrevive ao guard inteiro. Item 5: 8 dos 27 fixtures do crítico não estão no guard por nome (veredito derivado confere). Cobertura é da C2‴.

Critérios que não puderam falhar: nenhum. O vermelho-controle em 34969a81 ACUSOU onde o plano diz que o ciclo 2 escapava (j1, j3, j5, j6, s7-neg, g1–g3, F-8a/b, V1, V2, F-AGG-4/8, F-5f/g/h, ### + grep, '### …' fora das seções); o do §13.1 no pré-Dev-S-2 acusou 2/1/2 (depois de eu refazer o shim — declarado no §12).

## §16 Guard inteiro — diferencial A11 e linha de base (14:57)
Relançado 14:14:55, árvore (cwd w-j3c1, guard do head) e arnês \$W/gh em paralelo, `timeout 2700`, TAP para arquivo: árvore terminou 14:57:40 ec=0, arnês 14:57:45 ec=0. Sumário lido DO ARQUIVO: `# tests 312 # pass 312 # fail 0 # cancelled 0 # skipped 0 # todo 0` nos DOIS; diff do sumário ec=0 e da lista ok/not ok ec=0 → o arnês reproduz a árvore caractere a caractere. (A 1ª rodada, 13:28, estourou 1500 s nos dois lados — ec=124 — sob carga: nesta máquina rodavam ao mesmo tempo os `mandato-mutantes.sh` e guards de OUTRAS cadeiras — w-j3c2/w-j3c3, /tmp/j3c2i2-arn…, /tmp/tmp.2xJOzYpJte — resíduo vivo alheio, só reportado.) Fato relevante: o guard do head está 312/312 VERDE com os quatro `bloqueia` acima presentes — nenhum caso cobre essas formas (matéria de cobertura da C2‴).

## §17 Teardown (14:58-14:59)
- Head re-medido no fim: `git ls-remote` = 28b4defdc067387f384e06614e033e0976e9912b (NÃO andou durante o voto); blobs dos 5 artefatos iguais aos do início (hash-object = rev-parse HEAD:<arq>, 14:17).
- Processos: PowerShell Get-CimInstance filtrando '*w-j3c1*' e '*j3c1b*' → "NENHUM"; `ps -ef` casou só a própria cadeia bash do comando de limpeza (a linha de comando dela continha o texto) e, relido depois, 0.
- `git -C C:/Users/AMP/w-j3c1 status --porcelain` = 0 linhas, HEAD 28b4defd → `git worktree remove --force C:/Users/AMP/w-j3c1` ec=0; `ls -d` → não existe; `git worktree list` sem w-j3c1. Nenhum outro worktree tocado (w-j3c2, w-j3c2h, w-j3c3, w-devs393, w-devt393, w-mandato, w-conh e .claude/worktrees/* são alheios — só reportados).
- Mutações SÓ em arnês no scratchpad (\$W/mA|mB|mC, cópias de \$W/gh); nenhum arquivo rastreado tocado (worktree limpo ao remover). Base viva erp-postgres/erp-redis nunca tocada (nenhum comando abriu conexão; nenhum contêiner criado). Ficam como evidência reexecutável em \$W=scratchpad/j3c1b: fx/ (fixtures), out/ (saídas), shim/ (shims próprios), hH/h2/hP (as três variantes do script), gh + mA/mB/mC (arnês do guard), *.tap, lib.sh.
- Nota sobre o arquivo: o corpo manda acréscimo; o orquestrador mandou SOBRESCREVER (parcial da 1ª instância preservado em outro lugar) — segui o orquestrador na 1ª escrita e acrescentei daqui em diante.

## §18 Parecer (JSON)

```json
{
 "jurado": "jurado-mandato-c1c-invariancia-de-forma — 2a INSTANCIA (identidade NOVA; nenhuma amostra, numero ou conclusao herdados do plano, dos devs, das atas, de outra cadeira ou da 1a instancia, cujo parcial nao foi aberto) · modelo Opus 5.5 · corpo md5 EOL-neutro 35765f76d40f9c775c571d67799544b8 (28b4defd:.claude/agents/especialistas/jurado-mandato-c1c-invariancia-de-forma.md) · roda como general-purpose; nada escrito fora do scratchpad",
 "cadeira": "C1‴ — invariancia de forma: fronteiras E agregacao; isencoes exatamente do inventario",
 "legalidade_ciclo_3": "origin/main 3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c · D-SEM-TETO-AUDITORIA-NO-3 PRESENTE (decisoes.md l.2633; T-24 l.2713) · controle positivo D-TETO-DOIS-CICLOS contado 9x · gh pr view 394: MERGED 2026-09-28T19:55:12Z, mergeCommit b3f0af5f",
 "head_medido": "28b4defdc067387f384e06614e033e0976e9912b por git ls-remote, git rev-parse origin/chore/mandato-refs-e-preflight e gh pr view 393 --json headRefOid (= o liberado pelo inspetor); bash scripts/mandato-refs.sh 393 -> head do PR 28b4defd, ec=3 (approved_head NAO DETERMINAVEL). Blobs: mandato-refs.sh 474c7521 · mandato-preflight.sh faa408c8 · mandato-refs.test.ts d455ae1a · mandato-preflight.test.ts 7a52d37c · mandato-mutantes.sh 37549262. Re-medido 14:58: nao andou.",
 "voto": "REPROVADO",
 "justificativa": "Terreno: worktree proprio detached C:/Users/AMP/w-j3c1 (nao existia ao nascer), npm ci proprio sem junction, prisma generate com URL falsa, MSYS_NO_PATHCONV exportadas=0, git 2.53.0.windows.2, node v20.19.5; tres raizes de script por blob (head faa408c8, ciclo 2 68fe23c9, pre-Dev-S-2 3ff7d78c), shim PROPRIO com colagens GERADAS dele; diferencial A11 arvore x arnes identico no item 1 (53 fixtures) e no guard inteiro (312/312/0 nos dois). Item 1: as seis juncoes do §10 dao o veredito do inventario e discriminam contra 34969a81; partir (vazia, secao, cerca, EOF) e seguro; 3 de 4 grafias REJ. Mas juncoes minhas mudam o veredito fora de isencao nomeada (C1c-02 SHA:caminho; C1c-03 token dentro da cerca; C1c-04 texto na linha '## ...'). Item 2: F-8a-e + 2 variantes proprias (fecho com texto; ~~~~ fechado por ~~~) REJ nomeando a abertura; um so reconhecedor. Item 3: as colagens do contrato conferem (parcial, velha, abuso acima/abaixo/dentro, sem cabecalho, 2 PRs, 2x, morto, F-4d), mas a isencao I1 absolve linha '# gerado em:' injetada/editada e a abertura da cerca, e lava SHA fabricado para a prosa (C1c-01, nova no ciclo 3). Item 4: F-AGG/F-ISO/F-SM proprios conformes nos dois sentidos e dois lados; ajustes C1c-05/06. Item 5: 27 fixtures do critico, 0 divergencia do script. Item 6: a linha de cabecalho '## ...' e classe pulada sem inventario (C1c-04); o metodo reconhece a I7. Item 7: CRLF = LF nas 10 pontas e 2 colagens; CR solitario junta linhas (C1c-07). Item 8: [B8b] fechado por propriedade (1/1/1, lista=tabela=prosa) e vermelho-controle 2/1/2 no pre-Dev-S-2. Item 9: 4 titulos mais fortes que a assercao, todos com a propriedade coberta por outro caso (nota). Limpeza: worktree removido pelo nome, 0 processo meu, nada rastreado tocado, base viva intocada, residuo alheio so reportado.\nVOTO: REPROVADO — a checagem nao e invariante a fronteira quando o autor JUNTA: (a) a isencao I1 absolve linhas que a igualdade nao verificou ('# gerado em:' e a abertura da cerca) e lava SHA fabricado para fora do bloco; (b) juntar o SHA a nome/caminho por ':' tira-o da checagem 4 (e rev-parse --verify aceita qualquer 40-hex); (c) o conteudo da cerca, declarado SAIDA, satisfaz o comando da afirmacao que esta fora dela; (d) a linha de cabecalho '## ...' e isenta das checagens 2, 3 e 5 sem entrada no inventario | escopo: dentro-do-bloco (script nasceu no bloco, f8d5a2c8; (a) nasce no ciclo 3, 33356358) | evidencia: fx c-gerado-em-inj/c-gerado-em-lava/c-info-string, j11/j11c, j7/j7b, j8/j9/j10b — ec=0 contra pares ec=1 que diferem so na variavel atacada, reproduzidos na arvore | controle §1.1: A1, A2, A3, A5, A11, A14 — (i)-(iv) sim nos quatro",
 "o_que_executei": [
  { "comando": "MANDATO_REFS=$W/shim/refs.sh timeout 60 bash <raiz>/scripts/mandato-preflight.sh $W/fx/<nome>.md [4102]", "forma": "raizes hH (faa408c8), h2 (34969a81 -> 68fe23c9), hP (c32f77b5^ -> 3ff7d78c), arvore w-j3c1; ~140 fixtures proprias LF (CRLF/CR provados por od -tx1); shim proprio com estado por arquivo", "resultado": "ec e mensagens lidas de $W/out/<raiz>.<nome>.txt; tabelas em item1-hH.txt, item1-h2.txt, item1-tree.txt, item24-*.txt, item3-*.txt, item5-hH.txt, item7-hH.txt, item8v2.txt" },
  { "comando": "git rev-parse --verify --quiet <deadbeef x5> / deadbeef / '<40hex>^{object}' ; git cat-file -e <40hex>", "forma": "cwd w-j3c1 e repo do arnes hH", "resultado": "ec=0 / 1 / 1 / 1 — --verify nao confere existencia de SHA completo" },
  { "comando": "node --test [--test-name-pattern=...] --import tsx --test-reporter=tap <guard>", "forma": "cwd w-j3c1; guard da arvore x guard do arnes $W/gh (git archive das dependencias declaradas no cabecalho de mandato-mutantes.sh) x mutantes mA/mB/mC (1 linha cada)", "resultado": "guard inteiro 312/312/0 identico nos dois; subconjunto 312/7/0/305 identico; mA -> so F-EXT/fronteira-2 vermelho; mB -> verde no subconjunto 1, F-1e-linha vermelho no 2; mC -> F-1c e F-1f vermelhos" }
 ],
 "achados": [
  { "id": "C1c-01", "defeito": "A isencao I1 (colagem verificada) absolve mais do que verificou: linhas '# gerado em:' sao ignoradas na igualdade (l.235) mas isentas das chk 4/5/6/7 (l.260-261) e lidas para a proveniencia (l.262-263); a linha de abertura da cerca nao e comparada (l.241) mas e isenta.", "evidencia": "c-gerado-em-inj ('  # gerado em: o approved_head verdadeiro e deadbeef x5' inserida no bloco 4102) -> COLAGEM confere, ec=0; par c-abuso-dentro (mesma insercao sem o prefixo) -> ec=1 rej=5; c-gerado-em-edit -> ec=0; c-gerado-em-lava (deadbeef numa linha '# gerado em:' + prosa fora do bloco citando-o) -> ec=0, par sem injecao -> ec=1 'SHA deadbeef... nao esta na saida'; c-info-string ('  ```approved_head deadbeef x5') -> ec=0. Arvore idem. 34969a81: os 4 -> ec=1.", "gravidade": "bloqueia", "escopo": "dentro-do-bloco — git log -S \"grep -v '^# gerado em:'\" e -S 'EXENTAS=\"$EXENTAS$i:\"' -> 33356358 (2026-09-28, E2 do ciclo 3, linha de historia do proprio ramo, nao mergeado)", "motivo": "a isencao absolve um objeto maior do que o que ela nomeia ('as linhas do bloco igual'): linha nao conferida herda a isencao e alimenta a proveniencia de linhas FORA do bloco", "controle_1_1": "A1 (hash-object = blob faa408c8), A2 (injecao provada por grep -n; o par muda so o prefixo), A3 (LF, od), A11 (arvore = arnes), A14 (o que libera e o caminho COLAGEM; o par cai pelas mensagens NAO bate/DESATUALIZADO/token/SHA) — (i) sim, (ii) sim, (iii) sim, (iv) nenhum dissolve", "leitura_da_coluna_discriminacao": "defeito real: o ◐ do E2.b diz 'artefato se a colagem foi escrita a mao ou o shim != MANDATO_REFS' — o bloco foi gerado pelo mesmo shim do MANDATO_REFS e so a linha atacada difere" },
  { "id": "C1c-02", "defeito": "A checagem 4 nao e invariante a JUNTAR o SHA a nome/caminho por ':' — o token deixa de ser hex e a chk 4 nao o ve; sem '/' nem e caminho; com '/' a chk 6 aceita porque 'git rev-parse --verify' (l.522) aceita qualquer 40-hex.", "evidencia": "j11 '- o objeto julgado e deadbeef x5:CLAUDE.md, medido por: true' PR 4102 -> ec=0; par com espaco -> ec=1 'SHA deadbeef... nao esta na saida'; j11c 'deadbeef x5:scripts/mandato-preflight.sh' -> ec=0; j11b '34969a811a25...:scripts/mandato-preflight.sh' (real, fora da proveniencia) -> ec=0, par -> REJ; j11d '34969a81...:x' -> ec=0. rev-parse --verify <deadbeef x5> ec=0. Script de 34969a81: j11/j11c ec=0 tambem.", "gravidade": "bloqueia", "escopo": "dentro-do-bloco — o script nasceu no bloco (git log --diff-filter=A -> f8d5a2c8, 2026-09-25; git diff --name-status 3b1fe0f9 28b4defd -> A); nao declarado: fronteira 1 = 'SHA dentro de URL', I4 = 'o prefixo que RESOLVE'", "motivo": "a checagem nao e invariante a fronteira do token: juntar o SHA a um caminho muda o veredito da mesma citacao; a classificacao I9 e a I4 absolvem um SHA fabricado", "controle_1_1": "A1, A5 (controle positivo no mesmo laco: o par separado REJ), A11 (arvore com SHA real, arnes com fabricado), A14 (a REJ do par e a mensagem da chk 4) — (i) sim, (ii) sim, (iii) sim, (iv) nenhum dissolve", "leitura_da_coluna_discriminacao": "defeito real: o comportamento e do tokenizador e do rev-parse, reproduzido em dois RAIZ distintos; nao ha fixture a mao nem CR envolvido" },
  { "id": "C1c-03", "defeito": "A cerca, declarada SAIDA (I19/fronteira 18), e usada como COMANDO: satisfeita() (l.322) busca o token em utext, que inclui as linhas cercadas (l.394) — uma afirmacao FORA da cerca e satisfeita por 'medido por:' DENTRO dela, e 'saida colada sem comando' e silenciada.", "evidencia": "j7 '- cobertura 87,4% em 12 de 13 rotas' + cerca com 'medido por: true' -> ec=0; par j7-ctrl-sem-token (mesma cerca com 'saida') -> ec=1 rej=2 (REJ3M + saida colada sem comando); j7b (saida de grep colada contendo 'medido por:') -> ec=0; j7c (cerca solta com o token) -> ec=0; iso10-vazia-em-cerca-sem-token -> ec=0. Arvore idem.", "gravidade": "bloqueia", "escopo": "dentro-do-bloco — a I19 e a mensagem 'saida colada sem comando' sao do ciclo 3 (ausentes em 34969a81: j7-ctrl da 1 REJ la); o script nasceu no bloco (f8d5a2c8)", "motivo": "'OK de proposito' mais largo que a fronteira declarada: a cerca absolve o que esta FORA dela (exemplo literal de vermelho do item 1)", "controle_1_1": "A1, A11, A14 (o par cai pelas duas mensagens certas; o OK nao passa por outra isencao) — (i) sim, (ii) sim, (iii) sim, (iv) nenhum dissolve", "leitura_da_coluna_discriminacao": "defeito real: o ◐ do E2.g diz 'artefato se a fixture mistura TAB/espacos ou a cerca nao fecha (F-8a)' — cerca fechada, so espacos, e a unica variavel do par e o conteudo da cerca" },
  { "id": "C1c-04", "defeito": "Classe de linha pulada sem entrada no inventario: a LINHA DE CABECALHO '## ...' — o oraculo nunca a emite como FORA (l.170) e a REC a pula das chk 3 e 5 (l.389), com reconhecedor por prefixo (l.168-169).", "evidencia": "j8 '## MEDIDO — cobertura 87,4% em 12 de 13 rotas' -> ec=0 (par na linha seguinte -> REJ 1); j8b '## HIPOTESE — o cache cai em 3 de 5 rodadas' -> ec=0; j9 '## MEDIDO medido por: grep -c \"naoaparece\" CLAUDE.md' -> ec=0 (par -> REJ chk 5); j10 '## Conclusao — suite 3103/3105 verde e CI 14/14' apos o fim -> ec=0 (par com o texto na linha seguinte -> REJ chk 2); j10b dois '## Resumo ...' antes de ## MEDIDO -> ec=0 (controle '### Resumo ...' -> REJ chk 2). Arvore idem; 34969a81 idem (0).", "gravidade": "bloqueia", "escopo": "dentro-do-bloco — script nascido no bloco (f8d5a2c8); nenhuma I1-I20/M0-M6 o declara (I8 = '# titulo'; M2 = '## OUTRA' -> X)", "motivo": "isencao/estado fora do inventario: juntar a afirmacao a linha de cabecalho a tira das checagens 2, 3 e 5 (E2 regra 3: divergencia nao autorizada)", "controle_1_1": "A1, A11, A14 (cada par cai pela mensagem da checagem certa) — (i) sim, (ii) sim, (iii) sim, (iv) nenhum dissolve", "leitura_da_coluna_discriminacao": "defeito real: nao ha cerca, CR nem shim envolvidos; o controle '###' mostra que a regra da chk 2 existe e so a linha '##' escapa" },
  { "id": "C1c-05", "defeito": "A familia da chk 5 ('nome que TERMINA em grep/rg') nao reconhece '/usr/bin/grep' nem 'grep.exe' (contaGrep l.290).", "evidencia": "iso11-grep-caminho '/usr/bin/grep -c \"naoaparece\" CLAUDE.md' -> ec=0; iso11-grep-exe -> ec=0; par 'grep -c ...' -> REJ. Arvore idem; 34969a81 idem.", "gravidade": "ajuste", "escopo": "dentro-do-bloco (script nascido no bloco, f8d5a2c8)", "motivo": "a invocacao por caminho ou com extensao escapa da familia declarada", "controle_1_1": "n/a (ajuste) — reproduzido em hH e na arvore", "leitura_da_coluna_discriminacao": "defeito real (forma de nome, sem artefato de processo)" },
  { "id": "C1c-06", "defeito": "M4/I12: pipe escapado '\\|' (literal na celula em GFM) e lido como fronteira de celula (split l.312/317) e a cauda da afirmacao vira celula de evidencia cheia.", "evidencia": "sm4-pipe-escapado '| suite 3103/3105 \\| CI 14/14 |  |' sob cabecalho que nomeia a coluna -> ec=0; par sem '\\|' -> REJ 1. Arvore idem; 34969a81 idem.", "gravidade": "ajuste", "escopo": "dentro-do-bloco (f8d5a2c8)", "motivo": "caso nao previsto da maquina de tabela sem saida fail-closed: a celula que satisfaz nao e a coluna de evidencia", "controle_1_1": "n/a (ajuste)", "leitura_da_coluna_discriminacao": "defeito real" },
  { "id": "C1c-07", "defeito": "CR solitario (fim de linha pela CommonMark) e apagado por 'tr -d \\r' (l.137) e JUNTA duas linhas; o veredito muda com o fim de linha. O [F-EOL] escrito (CRLF) passa.", "evidencia": "eol-cr-solitario '- suite 3103/3105 verde<CR>- CI 14/14, medido por: true' (od -tx1: 1x0d, 7x0a) -> ec=0; as mesmas linhas em LF e CRLF -> ec=1 REJ l.3. Arvore idem; 34969a81 idem.", "gravidade": "ajuste", "escopo": "dentro-do-bloco (f8d5a2c8)", "motivo": "a normalizacao de EOL junta o que o leitor ve como duas linhas", "controle_1_1": "n/a (ajuste) — A3 aplicado: CR provado por od antes do veredito", "leitura_da_coluna_discriminacao": "defeito real fora do criterio literal [F-EOL] (que so nomeia \\r\\n)" },
  { "id": "C1c-08", "defeito": "Referencia de caractere HTML 'approved&#95;head' escapa do token reservado (a normalizacao mantem '95').", "evidencia": "g4-entidade-html -> ec=0 (head e 34969a81); g1 'approved\\_head', g2 espacado, g3 partido com enfase -> REJ 1 cada.", "gravidade": "nota", "escopo": "dentro-do-bloco (f8d5a2c8)", "motivo": "codificacao adversarial nao nomeada pela fronteira 15 (que declara homoglifos e largura zero)", "controle_1_1": "n/a (nota)", "leitura_da_coluna_discriminacao": "real, adversarial" },
  { "id": "C1c-09", "defeito": "O oraculo abre cerca em '```a```' (crase no info string), que a CommonMark citada no cabecalho (l.37) nao trata como cerca.", "evidencia": "f8v3-inline-3crases -> ec=0 (a afirmacao seguinte vira 'saida'); par com crase simples -> REJ 2.", "gravidade": "nota", "escopo": "dentro-do-bloco (f8d5a2c8)", "motivo": "o oraculo diverge da CommonMark que invoca; o contrato E2.a enuncia so a regra simplificada, que o script segue", "controle_1_1": "n/a (nota)", "leitura_da_coluna_discriminacao": "real, de baixa probabilidade" },
  { "id": "C1c-10", "defeito": "Guard: [F-EXT/fronteira-3], [F-1d], [F-EXT/juntar-3] e [F-6d] asseram menos do que o titulo; [F-1c-controle] nao e o fixture do critico (acrescenta 'derruba com:'); 8 de 27 fixtures do critico nao estao no guard por nome.", "evidencia": "mA (l.168) deixa [F-EXT/fronteira-3] verde; mB (l.187) deixa [F-1d] verde; mC (l.188) deixa [F-EXT/juntar-3] verde; 'NAOEXISTE-QQ:package.json' -> ec=0 (F-6d passa por I13). Em todos, outro caso mata o mutante (fronteira-2, F-1e-linha, F-1c/F-1f, F-6i).", "gravidade": "nota", "escopo": "dentro-do-bloco (guard do bloco)", "motivo": "o caso passa por outra causa que nao a do titulo (A14), sem buraco de cobertura", "controle_1_1": "n/a (nota) — A11: subconjunto arvore = arnes (312/7/0/305)", "leitura_da_coluna_discriminacao": "defeito de redacao do guard; cobertura e da C2‴" }
 ],
 "criterios_que_nao_puderam_falhar": [],
 "pendencias_que_aceito": [
  "fronteiras declaradas com dono B-GOV-MANDATO-2 (9-11, 13-22, 24-28; 1-8 de P-GOV-MANDATO-2): exercitadas como OK de proposito onde cabia (fr.17 agg2, fr.18 j2, fr.20 j4, fr.13 iso7, I13-I16 m6/m7) — nao cobradas",
  "C2‴: cobertura — o guard 312/312 verde nao pega C1c-01..04; C3‴: escopo, KPI, registro e ordem de commits — nao medidos por mim"
 ],
 "evidencia_incremental": "C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/VOTO-393-J3-C1.md (arnes e saidas em .../scratchpad/j3c1b/)",
 "teardown": "processos vivos no worktree: nenhum (Get-CimInstance '*w-j3c1*'/'*j3c1b*' -> NENHUM) · worktree removido por git worktree remove --force C:/Users/AMP/w-j3c1 (ec=0; status --porcelain 0 antes) · mutacoes so em arnes no scratchpad · base viva nunca tocada, nenhum conteiner · residuo ALHEIO (w-j3c2, w-j3c2h, w-j3c3, rodadas de mandato-mutantes de outras cadeiras) apenas reportado"
}
```

VOTO: REPROVADO — a checagem nao e invariante a fronteira quando o autor JUNTA: (a) a isencao I1 absolve linhas que a igualdade nao verificou ('# gerado em:' e a abertura da cerca) e lava SHA fabricado para fora do bloco; (b) juntar o SHA a nome/caminho por ':' tira-o da checagem 4; (c) o conteudo da cerca, declarado SAIDA, satisfaz o comando da afirmacao que esta fora dela; (d) a linha de cabecalho '## ...' e isenta das checagens 2, 3 e 5 sem entrada no inventario | escopo: dentro-do-bloco | evidencia: pares ec=0 x ec=1 que diferem so na variavel atacada, reproduzidos na arvore | controle §1.1: A1, A2, A3, A5, A11, A14 — (i)-(iv) sim
