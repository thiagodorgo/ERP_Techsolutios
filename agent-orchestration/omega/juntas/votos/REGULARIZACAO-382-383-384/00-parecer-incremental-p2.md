# PARECER DE REGULARIZACAO — porteiro-pos-merge — #382 / #383 / #384
Ref medida: main @ a01fc014 (worktree gov-elenco). Data: 2026-09-09.

## NOTA DE MODELO (obrigatoria)
Frontmatter fixa `model: fable`. Cota do Fable ESGOTADA nesta conta (HTTP 429, medido hoje).
Excecao do contrato §C7.6 / D-FALLBACK-MODELO-FABLE-OPUS: rodei em **Opus**. Nota registrada.

## NOTA DE CONTAMINACAO — EU SOU A QUARTA INSTANCIA (medida, nao herdada)
`git show a01fc014:CLAUDE.md | grep -c "1-quater. ASSENTO PERMANENTE"` -> **0**
`grep -c "C7.1-quater" <arvore principal>/CLAUDE.md` -> **0**
`git show origin/chore/gov-elenco-fatia-b:CLAUDE.md | grep -c ...` -> **1** (branch REPROVADA, nunca mergeada)
O CLAUDE.md carregado no MEU prompt tem §C7.1-quater. Ele so existe em fatia-b/25c0112a.
Aplicando o §A7 da ref: **norma que nao existe na ref julgada NAO se aplica** -> nao exigi assento permanente.
Item 3.3 aplicado a mim: meu CORPO bate com a ref (5/5 frases; 0 mencoes ao assento). O contrato e que nao.

## 0. TERRENO
main remota a01fc014; 3 merges MERGED, merge_commit confere; CI 7/7 SUCCESS nos tres.
gov-elenco limpo antes e depois de tudo que rodei. Sem `git clean`. Base viva nao tocada.

## 1..3 PROMESSA x ENTREGUE  (ver secoes no parecer final)
`git diff --numstat 90d30f8a a01fc014 -- src tests prisma frontend mobile .github` -> VAZIO.

## 4. KPI — contagens REEXECUTADAS (log de CI do run 34286402713, head do #384)
backend        # tests 2938 / # pass 2936 / # fail 0 / # skipped 2   -> declarado 2936/2938  CONFERE
frontend smoke # tests 1126 / # pass 1126                            -> declarado 1126/1126  CONFERE
flutter        +864: All tests passed!                               -> declarado 864/864    CONFERE
backend-postgres 225/225, 0 skipped (guard de zero pulos mordendo)
FROZEN == kpis-latest.json (semantico) -> True. node --check Kpis/app.js ec=0.
#381 backfill: merge_commit 90d30f8a (real), approved_head 81b977f3; blob do script auditado
IDENTICO em 9c0e6ac9 / 81b977f3 / 90d30f8a (c82c5928) -> justificativa do #382 CONFERE.
#382/#383/#384 NAO tem entrada propria de KPI (declararam "sem KPI novo"; §C3 nao os alcanca).

## 5. JUNTA — nenhum dos tres tem ata. Nenhum precisava de junta de merito (registro puro /
decisao do dono / skill a pedido do dono). §C7.1-quater NAO se aplica (ver nota de contaminacao).

## 6. PENDENCIAS — ACHADO PROPRIO (G-3)
Gerador real executado em scratch: 224 abertas / balde A 54 / 296 cab / 285 IDs / 3 SEM STATUS
Indice commitado:                 208         / 41        / 277     / 266     / 0
`P-GOV-WORKTREES-NAO-IGNORADAS` (#382) e `P-GOV-CAMINHO-REPO-SESSAO` (#383): cabecalho diz FECHADA,
linha canonica diz `**status:** ABERTA` -> gerador as conta ABERTAS balde A. Contradicao INVISIVEL
(CABEC exige **FECHADA** em negrito; os cabecalhos escrevem sem negrito) -> CONTRADITORIAS = 0.
`P-GOV-INSPETOR-33-SEM-NORMA`: `**status:** REBAIXADA` esta fora do vocabulario -> SEM STATUS,
severidade ainda lida ALTA do cabecalho (o #382 prometeu BAIXA).

## 7. LIMPEZA §C5
3 branches remotas dos PRs apagadas; 2 preservadas por declaracao presentes; 0 branches locais
mergeadas pendentes; arvore principal: 0 arquivos rastreados apagados (' D' -> ec=1);
6 ' M': 4 residuo alheio REAL (+86/+96 nos dois espelhos, reproduz o #383 a linha) e 2 FANTASMA.
Disco: 22 GB livres de 238 GB (acima do limiar de ~10 GB) -> DEEP_CLEAN nao requerido.
B1 do orquestrador: nenhum dos 4 caminhos era rastreado em d1fab3bc (0/0/0/0); a skill esta
RASTREADA na main (3+3 arquivos); o corpo e recuperavel de 25c0112a, contido em
origin/chore/gov-elenco-fatia-b. NADA rastreado perdido.

## 8. START
Proximo alvo B-O6R-06 (`fix/billing-durability`). Nenhuma pendencia BLOQUEIA-o.
Ja em voo: cc579302, 22 commits, iniciado em 2026-09-06 — e o 1o commit (dd16beb1) E o parecer
do porteiro do #380 "LIBERADO COM RESSALVA para o B-O6R-06". O start dele TEVE gate.

## VEREDITO
#382 LIBERADO COM RESSALVA | #383 LIBERADO COM RESSALVA | #384 LIBERADO COM RESSALVA
CONSOLIDADO: LIBERADO COM RESSALVA — repositorio DESTRAVADO.
