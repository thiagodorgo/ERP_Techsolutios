# PLANO ciclo 2 — `planejador-mestre` (Fable) · evidência incremental (P1, §C7.7)

**Papel:** quem PLANEJA (§C7.4-bis). Não achei nada; não implemento. Insumos: ata, 3 votos + 3 evidências,
homologação nº 1, plano do ciclo 1. Worktree: `.claude/worktrees/gov-elenco` (sempre `git -C`/absoluto).
Árvore principal (`demo/investidor`) **não lida** — é o dado podre do §C7.4-bis(c).

## 0 · Terreno na entrada

```
$ git -C <wt> rev-parse --short HEAD        -> c520b80f
$ git -C <wt> branch --show-current         -> chore/gov-auditoria-elenco
$ git -C <wt> status --short                -> (vazio)
$ ls votos/B-GOV-ELENCO/                    -> 00*, 99-cadeira-permanente{,-evidencia}.md, C{1,2,3}-{voto.json,evidencia.md}
```
Conclusão parcial: head `c520b80f` confirmado; árvore limpa; os 9 insumos da junta existem e foram lidos por inteiro.

## 1 · Insumos lidos por inteiro e fatos RE-MEDIDOS por mim (não herdados da ata)

Lidos: `J-B-GOV-ELENCO.md` · `C{1,2,3}-voto.json` · `C{1,2,3}-evidencia.md` · `99-cadeira-permanente{,-evidencia}.md` ·
`B-GOV-ELENCO-plano.md` · `BRIEFING-B-GOV-ELENCO.md` · `scripts/audit-agents-skills.mjs` (283 linhas) ·
`cadeira-permanente-backend-review.md` · `porteiro-pos-merge.md` · `inspetor-de-terreno-da-junta.md` · `CLAUDE.md`
l.225-240/370-410/420-450/479-520 · `decisoes.md` l.1748-1800/1900-2045 · `pendencias.md` l.7258-7360 ·
`.agents/agents/README.md` · `TEMPLATE-J-ata.md` l.50-95 · `SKILL.md` (backend-review) l.20-40 · `Kpis/*` · `scripts/kpi-freeze.mjs`.

```
$ node --version                                   -> v20.19.5
$ git -C <wt> config core.autocrlf                 -> true
$ node scripts/audit-agents-skills.mjs             -> 24 agentes · 12 skills · OK · ec=0
$ node scripts/audit-agents-skills.mjs --ref fe2748c8 -> 6 BLOQUEIA (5×C6 + 1×C10 "15 especialistas, ~19.8 KB") · ec=1
$ regex JULGA verbatim × 24 nomes                  -> casam 11 · Bash entre os que casam 11/11 · Bash total 21/24 · sem tools 0
$ tools com Write/Edit                             -> 4: agente-devops-provisionador, agente-fabrica (sem Bash), dev-mapas, frontend-pixel-master
   => papéis FORA da allowlist de escrita com Bash = 21 − 3 = 18 (17 sem o assento)
$ chaves de frontmatter em uso (24 agentes)        -> name 24 · description 24 · tools 24 · model 5 — NENHUMA chave fora do padrão
   => acrescentar chave nova (ex. `papel:`) é comportamento NÃO testado neste repo; o desenho evita chave nova
$ Kpis/kpis-latest.json                            -> blocks_completed {value:162, display:"161"}; as demais 9 métricas têm display coerente
$ Kpis/app.js l.1047-1051 metricDisplay            -> imprime `display` quando existe; FROZEN em l.1623; regenerado por scripts/kpi-freeze.mjs (tem --check)
$ tests/kpi-dashboard-charts.test.ts l.165         -> compara a SÉRIE com o JSON; nenhuma asserção card×value (confirma C1-01 silencioso)
$ literais da enumeração de veredito               -> 9 (L1 assento l.170-181 · L2 espelho · L3 porteiro l.48 · L4 espelho · L5 SKILL l.32 ·
                                                      L6 CLAUDE.md l.232 e l.382 · L7 AGENTS.md l.260 e l.410 · L8 decisoes l.1948-1951 · L9 TEMPLATE l.86)
$ decisoes.md                                      -> D-QUORUM-B-GOV-ELENCO (l.2020) REGISTRADA: "ciclo 2 mantém unanimidade de 3"
$ omega/reprovacoes/                               -> NÃO existe R-B-GOV-ELENCO-ciclo1.md (o §C7.4 manda registrar; caminho fora do §5 do ciclo 1)
$ OBITUARIO §4                                     -> papéis permanentes não se sepultam; inelegibilidade por CASO (votante do ciclo anterior, planejador, dev)
$ git diff --name-status -M fe2748c8..25c0112a     -> 12 A · 30 D (15 especialistas × 2) · 12 M · 32 R100 — particionável em fatia A / fatia B (ver plano §5)
$ Kpis/kpis-history.json                           -> precedente de MESMO bloco em dois PRs sem incrementar: B-O6R-07a (158) e B-O6R-07a-ciclo2 (158)
```
Conclusão parcial: os cinco bloqueantes reproduzem-se na leitura direta do código/texto (não dependi da ata); os números
publicados errados (C1-02/03) estão em 4 lugares (plano §4.1/§4.2, script l.10, history description, decisoes l.1992);
existe caminho de registro obrigatório (`omega/reprovacoes/`) fora do §5 do ciclo 1 — o ciclo 2 tem de acrescentá-lo.

## 2 · §0–§3 escritos (objetivo/contrato · fatiar × misturar · papéis · mapa achado→correção)

O que medi para decidir: `git diff --name-status -M fe2748c8..25c0112a` → 12 A · 30 D · 12 M · 32 R100; particionado à mão:
**9 arquivos inteiros + hunks aditivos em 6 arquivos** pertencem só ao assento (fatia B); o acoplamento A↔B é 1 linha de
`MODELO_FIXADO`, 1 prefixo em `JULGA()` (que morre), 1 seção do README e 1 parágrafo de KPI. Precedente de KPI sem incremento:
history `B-O6R-07a` = 158 e `B-O6R-07a-ciclo2` = 158. Quórum: `D-QUORUM-B-GOV-ELENCO` l.2020 ("ciclo 2 mantém unanimidade de 3").
Inelegibilidade: obituário §4 (permanentes não se sepultam; por caso) + votantes do ciclo 1 = `validador-mestre`,
`guardiao-fail-closed`, `agente-ci-doutor`. Cadeiras escolhidas por competência, todas permanentes e fora do ciclo 1:
`agente-secops`, `inspetor-de-arnes-concorrente`, `coordenador-de-acessos`, `agente-dba-guardiao`; `critico-adversarial` só ataca o
desenho da B (não vota).
**Conclusão parcial:** FATIAR (custo 2× junta; benefício: zero reféns sob "não há ciclo 3"); fatiar não compra ciclo nem bloco;
papéis distribuídos em 4 agentes distintos; perguntas (a)(b)(c) do §C7.4-bis respondidas por escrito no §2.

## 3 · §4–§5 escritos (desenho da fatia A · escopo exato)

```
$ chaves de frontmatter (24 agentes)     -> name/description/tools/model apenas  => sem chave nova; allowlist no script
$ tools dos 20 não-escritores             -> ⊂ {Read, Grep, Glob, Bash, WebFetch, WebSearch}  (WebSearch/WebFetch só em critico-adversarial e avaliador-mapas)
$ scripts/kpi-freeze.mjs l.13-14, l.38   -> tem modo --check ("em dia" / ec=1 se defasado)  => critério A-23 executável
$ README l.5-6/75 (23/24), l.90-93 (assento), l.135-136 (tabela vazia), l.138-141 (nota 34/11)  -> alvos das edições de 4.3
$ ls omega/reprovacoes/ | grep GOV       -> nenhum R-B-GOV-ELENCO-*  => caminho acrescentado ao §5.1/5.2
```
**Conclusão parcial:** os cinco bloqueantes cabem no §5 (script, `.claude/agents/**`, `CLAUDE.md`/`AGENTS.md`, `Kpis/*`);
nada do §5-bis é necessário; as três deferências (parser de veredito, guard de KPI, regressão do auditor) nomeadas com dono.

## 4 · §6 escrito (desenho da fatia B) — comandos TESTADOS no scratchpad, não de cabeça

```
$ for f in a b c d e f g: tail -n1 $f.md | grep -Eq '^HOMOLOGADO( COM RESSALVA)?:'; echo ec
   a "HOMOLOGADO: ok"                      -> ec=0  (libera)
   b "HOMOLOGADO COM RESSALVA: ok | y"     -> ec=0  (libera)
   c "SUSPENSO POR QUORUM INVALIDO: 2 de 3"-> ec=1  (nega — a 5ª string da C2)
   d "HOMOLOGADO SOB PROTESTO: z"          -> ec=1  (nega)
   e "homologado: z"                       -> ec=1  (nega)
   f "HOMOLOGADO: ok" + linha em branco    -> ec=1  (nega — "nada depois dela" é literal)
   g "HOMOLOGADO: ok\r\n" (CRLF)           -> ec=0  (libera — a regex não ancora o fim)
$ teto: for f in votos/99*-cadeira-permanente.md; do tail -n1 "$f" | grep -Eq '^HOMOLOGADO( COM RESSALVA)?:' || echo "$f"; done | wc -l
   com 99=c, 99b=d, 99c=a                  -> 2   (esperado 2; grep -L daria o mesmo aqui, mas conta o arquivo inteiro — por isso o plano usa a última linha)
$ marcador: grep -c '^ASSENTO-PERMANENTE:' br.md -> 1 ; ocorrências fora do marcador e fora de "HOMOLOGA" -> 0 ; com o assento numa linha de cadeira -> 1 (acúmulo detectado)
```
Literais da enumeração: 9 → L1/L2 (sync na CI), L6/L7 (pendência pre-existente), L8 (registro datado); L3/L4/L5/L9 passam a referir.
**Conclusão parcial:** enumeração fechada de 7 com cláusula de fechamento; teto = 1 com artefato contável; três pontas ditas com
honestidade (a do meio é passo humano com artefato; o executável é `P-GOV-VEREDITO-SEM-PARSER`). Os comandos citados em §6 e nos
critérios B-3/B-5/B-6 são os que rodaram acima.

## 5 · §7–§11 escritos (critérios · bateria · junta · por construção · riscos)

N=10 (A1–A10 do ciclo 1) → M=45 (30 A + 15 B), cada linha com a mutação que a deixa vermelha. Mandatos com 3 itens (P4).
Briefing ganha o item "corpo carregado × corpo julgado" — lacuna real do ciclo 1: ninguém mediu qual corpo de agente rodou, e a
sessão do orquestrador opera a partir de `demo/investidor` (não medi a árvore principal; o inspetor mede por md5, item 9.4.4).
14 itens de reprovação por construção; 8 riscos com rollback = `git revert` puro (sem dado, sem migration).

## 6 · §12–§14 escritos · fechamento (P2: arquivo antes da mensagem final)

Correção apanhada na releitura: §1.2 dizia "13 arquivos inteiros + 5 compartilhados"; a partição medida (§5.3) é
**9 inteiros + 6 com hunks aditivos + 4 compartilhados** — corrigido por `sed` no plano (1 ocorrência; resíduo 0).
```
$ wc -l plano                     -> 579 linhas · 15 seções (§0–§14) · critérios A=30, B=15 (M=45 ≥ 2N, N=10)
$ grep -c $'\r' / $'\t' plano     -> 0 / 0
$ scratchpad                      -> peças p02..p14, rx/ e t1/t2 removidos (§C5, 1 linha: só temporários meus)
```
Pendências que o plano abre/fecha/atualiza: §12. Sequência de execução com a cirurgia git: §13. Apensos: §14 (vazio; recebe a
defesa ao crítico da B).
**Papéis (§C7.4-bis):** este arquivo foi escrito por `planejador-mestre` (Fable), que não achou e não implementa. Nenhum arquivo
do repositório além do plano e desta evidência foi tocado — `git -C <wt> status --porcelain` abaixo.
?? agent-orchestration/omega/juntas/votos/B-GOV-ELENCO/PLANO-C2-evidencia.md
?? agent-orchestration/omega/planos/B-GOV-ELENCO-ciclo2-plano.md
