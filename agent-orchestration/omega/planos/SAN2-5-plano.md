# PLANO SAN2-5 — preparar o ciclo 5 do financeiro: a única tentativa do B-O6R-02 não pode gastar-se com o que já era evitável hoje

**Papel:** `planejador-mestre`, instância própria, em Fable por contrato (`D-PLANEJADOR-MODELO-FABLE`).
Não achei defeito, não desenvolvo, não voto, não sou porteiro; encerro a participação ao entregar este
plano (§C7.4-bis). **Branch:** `chore/san2-5-preparar-ciclo5` · head **`44a30e4`** (medido:
`git branch --show-current` + `git rev-parse HEAD`), criada de `df496d2` (= main) + o parecer do
porteiro do #366. **Worktree:** `.claude/worktrees/san2-r`.

**A restrição que governa o desenho (medida em §2.0):** o `B-O6R-02` está no **ciclo 5, que é o TETO**
— `D-TETO-DOIS-CICLOS`, `agent-orchestration/controle/decisoes.md` l.1790-1791: *"o ciclo 5 já é a
última tentativa sob qualquer das duas regras. Se reprovar, **para**"*. Uma reprovação encerra o bloco e
vira dossiê ao dono. Logo: **tudo que puder ser resolvido ANTES do ciclo 5 se resolve AQUI** — e, pela
mesma moeda, **nada daqui pode fazer o trabalho DELE** (cada linha a mais neste PR é superfície de
reprovação na frente do ciclo-teto; a fronteira exata está em §3-D4 e no risco R1 do §7).

## §1 · Objetivo, ator, fluxo, contrato, modelagem

**Objetivo:** entregar ao ciclo 5 um tabuleiro em que a junta ABRE e o critério não reprova o bloco por
construção: (i) composição da junta pós-emenda **nomeada** em arquivo (hoje: nenhum arquivo a nomeia —
B1); (ii) corpos das cadeiras **na linhagem** e **conformes ao contrato vigente** §C7.1-ter(a) (hoje: só
existem em `demo/investidor`, e o corpo reservado cita quórum 5/5 e vota sem campo `escopo` — B2);
(iii) a contradição `ci.yml` × plano do ciclo 5 **decidida por escrito** (B3); (iv) o §8 do plano do
ciclo 5 **re-baseado em fatos medidos** — a main moveu 8 commits, e o critério de âncoras/`src`-diff
atual reprovaria o próprio bloco (B4); (v) dívidas de KPI do #366 pagas; (vi) as pendências cujo dono
nominal é `SAN2-5` decididas uma a uma, com razão escrita.

**Ator:** desenvolvedor único, instância nova, nominalmente designado; `agente-fabrica` para os corpos
novos (quem cria jurado é a fábrica, §C7.4); orquestrador convoca. Quem planeja (eu) não executa.

**Fluxo origem→destino:** este plano → dev executa E1–E7 (§3, na ordem F do §3.9) → bateria §6 →
`inspetor-de-terreno-da-junta` (fail-closed) → junta do SAN2-5 (§8, maioria de 3) → PR → porteiro
pós-merge → **só então** o ciclo 5 começa (S0 de absorção executado pelo ORQUESTRADOR do ciclo 5, sob o
apenso E4 — não por este bloco).

**Contrato REST: N/A por construção.** Nenhuma rota, payload ou código HTTP muda — o bloco não toca
`src/**` nem contratos; 404 cross-tenant / 422 transição / 409 duplicidade ficam intocados, e o
critério é mecânico: diff de `src/**` e de `API_CONTRACTS.md` contra a base do PR **vazio** (§6.8).

**Modelagem: N/A por construção.** Nenhuma migration, nenhum model, nenhum dado muda (`prisma/**`
proibido, §5). Decimal para dinheiro, timestamptz e delete lógico seguem como estão — intocados.

## §2 · Diagnóstico MEDIDO (comandos que EU rodei nesta sessão, no worktree `san2-r`; nada herdado)

> A revisão adversarial de prontidão (6 agentes) que motivou este bloco **não tem artefato no
> repositório** (grep de "prontidao" em `agent-orchestration/omega/**/*.md` devolve só
> `lista-execucao-omega3f.md` e `B-O6R-01-plano-v6-aprovado.md`, alheios). Portanto **nenhuma conclusão
> dela é insumo**: os quatro bloqueios abaixo foram re-medidos por mim, comando a comando. Onde o
> briefing divergiu do medido, está dito (§2.6).

**2.0 — Terreno e teto.** `git branch --show-current` devolve `chore/san2-5-preparar-ciclo5`;
`git rev-parse HEAD` devolve `44a30e48…` (`44a30e4` = parecer do porteiro do #366, sobre `df496d2` =
merge do #366). `sed -n '1785,1795p'` em `controle/decisoes.md` devolve a frase do teto transcrita no
preâmbulo, literal (`D-TETO-DOIS-CICLOS`).

**2.1 — B1 CONFIRMADO: a composição da junta do ciclo 5 pós-emenda não existe em arquivo nenhum.**
Li `B-O6R-02-ciclo5-plano.md` inteiro (341 linhas por `wc -l`). A EMENDA do orquestrador (l.314-341,
apensada por §A2) diz no item 4, l.335: a junta "passa a ser de 3 unânimes (toca dinheiro), não 7 —
regra nova do §C7.1-ter". O §13.3 (l.266) nomeia 6 cadeiras votantes. Varredura por
`jurado-c5-banco`, `jurado-c5-validador`, `jurado-c5-ataque`, `jurado-c5-denominador`,
`jurado-c5-vaza` em todos os `*.md` do repo, excluído o próprio plano: **0 resultados**. Cruzando as 6
cadeiras do §13.3 com a EMENDA: `jurado-c5-denominador-runner` (D32/D26/piso do runner) e
`jurado-c5-vaza-metro-teardown` (D31/D33, teardown/sweep) julgam matéria que o item 1 da EMENDA moveu
para o `B-O6R-ARNES` — mergeado no #359 (`f081b5d`); `jurado-c5-arnes-catalogo-postgres` teve a
matéria de MECANISMO movida, mas a de NÚMERO mantida (item 3: "o bloco re-mede numa base limpa");
`jurado-c5-ataque-ao-dinheiro` re-ataca um `src/` que o próprio plano congela (§5 l.134: qualquer diff
em `src/` = violação) e cujo B-1 o §10.1 manda não reabrir ("FECHADO por 3 cadeiras"). O inspetor é
fail-closed sobre "inelegibilidade conferida por nome" (§C7.1-bis): **sem nomes, a junta não abre.**

**2.2 — B2 CONFIRMADO: corpos fora da linhagem; o que existe viola o contrato vigente.**
Contagem por `git ls-tree -r` de `.claude/agents/especialistas`: `df496d2` = 0 · `44a30e4` = 0 ·
`12c3825` = 3 (`especialista-arnes-postgres-node`, `especialista-maquinas-de-desfazer`,
`inspetor-fixtures-financeiras-legadas` — dos ciclos anteriores, inelegíveis) · `demo/investidor` = 17.
As 2 identidades RESERVADAS ao ciclo 5 (`critico-c5-adversarial.md`,
`jurado-c5-arnes-catalogo-postgres.md`) **só existem em `demo/investidor`** (conferi também que a
árvore de trabalho da raiz == blob da branch, por `git diff --quiet`). No corpo do jurado (308
linhas): l.79-80 — "Regra da junta: **unanimidade 5/5** (invariante financeiro, §C7.1) ou a regra que
o plano fixar" — e o schema de voto (l.295) tem `"gravidade"` **sem o campo `escopo`**, obrigatório
desde §C7.1-ter(a) (`d283903`, #363, mergeado). O molde correto existe e eu li:
`demo/investidor : .claude/agents/especialistas/jurado-arnes-catalogo-postgres.md` (~l.349):
`"escopo": "dentro-do-bloco | pre-existente"` + exigência de evidência de data/origem no motivo. O
corpo do crítico (271 linhas) também carrega premissa SUPERADA: a description e as l.100/165 mandam
atacar a deliberação "(A) × (B) × (C)" e a escolha do híbrido — o dono já decidiu **(B)** (EMENDA de
2026-08-28, `D-JUNTA-ESCOPO-E-CALIBRACAO`). **O achado que barateia:** `scripts/sync-agent-agents.mjs`
l.66 usa `readdirSync(SRC)` com filtro por sufixo `.md` — leitura **plana, sem recursão**: o
subdiretório `especialistas/` é invisível ao espelho. Consequência dupla: restaurar os corpos **não
quebra o S0**, e **o ec=0 do S0 não prova NADA sobre os jurados** (conforto falso) — a conferência
deles tem de ser própria (E2e). **Fato novo, medido:** o espelho Codex em `demo/investidor` TEM
`.agents/agents/especialistas/` (17 de 41 arquivos) — espelhado por mecanismo que a main não tem;
divergência de convenção registrada em E2d, não resolvida em silêncio (§A2).

**2.3 — B3 CONFIRMADO: dois textos mergeados mandam o dev do ciclo 5 fazer coisas opostas.**
`git show df496d2 : .github/workflows/ci.yml` (sem espaços; grafado assim aqui só para não quebrar o
gerador), l.217-220: "Sua inclusão é **DoD do PR que mergear o B-O6R-02 (ciclo 5 financeiro)**; a
pendência `P-O6R-B02-SUITES-LIST-CI` segue ABERTA, **com esse PR como dono**" — texto escrito pelo
#363 (`d283903`, 2026-08-30), mergeado, com o "LUGAR RESERVADO" preparado exatamente para a linha da
suíte. O plano do ciclo 5 diz o oposto em três lugares: §5 l.134 (`ci.yml` no PROIBIDO + "Arquivo fora
das listas → o dev PARA e devolve"), §10.5 l.234 ("PROIBIDO; `P-O6R-B02-SUITES-LIST-CI` é do bloco
seguinte"), §12 l.256 ("Manter abertas: … bloco seguinte, `ci.yml`"). Um dev despachado hoje viola um
dos dois, faça o que fizer. Decisão por escrito em §3-E3.

**2.4 — B4 CONFIRMADO: o §8 do plano do ciclo 5 instrui sobre fato falso, e dois critérios dele
reprovariam o próprio bloco por construção.** Medido: `git rev-parse origin/main main` → **`df496d2`**
nos dois; `git rev-list --count 6efe5ad..df496d2` → **8** (#359–#366); `git merge-base --is-ancestor
12c3825 df496d2` → **NÃO-ancestral**. O §8 do plano diz "rebase NÃO — `origin/main` = `6efe5ad` não
moveu" — **falso hoje**. Âncoras do §0: no head `12c3825` as 5 CONFEREM com o plano (por `git
ls-tree`: `financial-entry-undo-owners.ts` = `e352c6c` e `financial-entry.service.ts` = `9be7caf` —
caminho real `src/modules/financial-entries/`, não `financial/`; `auth-identity-fixture.ts` =
`131eb0e`; `audit-security.test.ts` = `ba85452`; `run-backend-tests.mjs` = `28a589b`); na **main**, as
3 do arnês divergem (`b12b25f` / `0a4f812` / `335f6a1` — reescritas por #359/#366). Simulei a absorção
com `git merge-tree --write-tree df496d2 12c3825`: **9 arquivos em conflito**, nomeados —
`.github/workflows/ci.yml` · `Kpis/app.js` · `Kpis/kpis-history.json` · `Kpis/kpis-latest.json` ·
`controle/decisoes.md` · `controle/pendencias.md` · `docs/status-geral.md` ·
`scripts/run-backend-tests.mjs` · `tests/npm-test-runner-guard.test.ts` — e as **2 âncoras de `src/`
SOBREVIVEM intactas** no resultado do merge (`e352c6c`/`9be7caf`; a main nunca as tocou: `service.ts`
na main = `fcccb36` = blob da base `6efe5ad`; `undo-owners.ts` nem existe na main). Migrations por
`git ls-tree -d` de `prisma/migrations`: `6efe5ad` = **103** · `df496d2` = **103** · `12c3825` =
**105** — as 2 extra são do próprio bloco (`20260869000000_add_financial_invariants`,
`20260870000000_add_reversal_pair_atomicity`); a FORMA da receita canônica do D29 ("cluster
descartável com **103** migrations", apenso §V.3 do plano do c5) **muda por construção** na branch:
105 (+1 quando a migration da FK nascer). E o §9.9 ("diff de `src/**` contra `12c3825` vazio")
reprovaria o bloco pós-absorção **por construção**: a absorção traz
`src/modules/authority/authority-password.ts` do #366 para dentro de `src/**`. Decisões em §3-E4.

**2.5 — Dívidas herdadas, conferidas.** Ata `J-SAN2-4b.md` l.6: head julgado **`2d2d16d`** —
CONFIRMADO por leitura (o briefing pedia; li). `Kpis/kpis-latest.json`: `release.pr` /
`release.merge_commit` / `release.approved_head` = **null** (autoria SAN2-4b); history com **149**
entradas, a última com `blocks_completed` = **155** e a condição literal "sobe para 156 SÓ QUANDO ESTE
BLOCO MERGEAR" — e o #366 mergeou. O parecer do porteiro
(`votos/SAN2-4b/00c-porteiro-pos-merge-366.md`, item B.10 e parecer final) atribui a dívida dupla ao
**"PR do ciclo 5"** — este plano a REATRIBUI ao SAN2-5 com registro (§3-E5): o SAN2-5 entrou na fila
ANTES do ciclo 5 e publica entrada de KPI própria; publicá-la sobre um history com o backfill do #366
em aberto quebraria a ordem que os backfills #362–#366 preservam. Ressalva C.10 do porteiro (worktree
próprio por cadeira que muta) → vai para o apenso de composição (E1.4).

**2.6 — As pendências com dono `SAN2-5` são QUATRO, não três.** `grep -n "SAN2-5"` em
`controle/pendencias.md` devolve: `P-SAN2-2-INDICE-DONO-SEMPRE-SIM` (status l.4621) ·
`P-KPI-PAINEL-NAO-RENDERIZA-SUMMARY` (l.4722) · `P-KPI-RECENT-CONGELADO` (l.5001) · **e a parte 3** —
segunda passada do obituário derivada das ATAS (l.4815), que o briefing não listou. As quatro lidas
por inteiro; decisão uma a uma em §3-E6. Baseline da área de painel que E6 toca: grep de `recent` e
`summary` em `tests/kpi-dashboard-charts.test.ts` → **0 ocorrências** — nenhum caso exerce as duas
seções hoje (o arquivo tem 19 chamadas `test(` por grep; o TAP decide o denominador na hora).

**2.7 — O que está SÃO (para não consertar o que não quebrou).** `sync-agent-agents.mjs --check` na
main = ec=0 "23 agentes" (porteiro B.5; e este bloco não toca corpo espelhável). A lista-6 do D29 está
FIXADA por nome no apenso do plano do ciclo 5 (l.167-199) e **nenhum dos 6 arquivos está entre os 9
conflitos** da absorção. Os 3 casos C5.3 do runner-guard da branch **já vivem na main** — "3 portados
verbatim do guard de skip C5.3", nota de `backend_contract_tests_focused` 34/34 em
`Kpis/kpis-latest.json` — o que sustenta a política main-integral do E4.

## §3 · O que fazer — quatro decisões e sete entregas

### As quatro decisões que o briefing exigiu, decididas com argumento

**D1 — A branch de insumo ABSORVE a main? Sim, obrigatoriamente; por MERGE; e quem executa é o S0 do
ciclo 5, não este bloco.** Absorver é obrigatório porque a premissa "base limpa" da EMENDA (item 3)
EXIGE o #359 dentro da branch: os 3 blobs do arnês em `12c3825` ainda são os da classe `XX000`
(medido, §2.4) — sem absorção, a canônica 3 do ciclo 5 re-mediria a classe que o #359 já matou, e o
número não sobreviveria à forma por razão alheia ao bloco. Por MERGE e nunca rebase: `12c3825` é head
julgado, citado por atas, âncoras e pendências — reescrevê-lo quebraria toda a cadeia de auditoria.
O tamanho foi MEDIDO (§2.4): 9 conflitos, todos de classe registro/harness; política de resolução:
**versão da main, integral, nos 9** — com a verificação nomeada de que nenhuma linha exclusiva da
branch nesses 9 é insumo vivo do ciclo 5 (a evidência de que é seguro: os 3 casos C5.3 do runner-guard
já vivem na main portados verbatim, §2.7; os 2 arquivos de `src/` financeiro sobrevivem intactos por
construção, §2.4). Quem executa: o ORQUESTRADOR no S0 do ciclo 5, sob o apenso E4 — porque (i) este
bloco não pode mutar a branch de insumo (o PR dele não a contém; §5 proíbe), (ii) a política é
mecânica e escrita, e (iii) falha no S0 **devolve ao planejador SEM consumir a tentativa única**:
ciclo se conta por voto de junta, não por preparo de terreno.

**D2 — Quais cadeiras o ciclo 5 precisa? Três, nomeadas em E1**, porque a EMENDA fixa "3 unânimes"
(l.335) e o §C7.1-ter(b) fixa unanimidade de 3 para bloco que toca dinheiro — manter uma 4ª cadeira
além do quórum escrito reintroduziria a classe "quórum não-escrito" que reprovou quatro ciclos e que o
1-ter(b) existe para matar. O corte, cadeira a cadeira, está em E1.1 com a matéria de cada uma.

**D3 — Como corrigir os corpos reservados sem invalidar a reserva? Correção cirúrgica + apenso datado,
por agente que não votará.** Identidade queima por SERVIR em junta (obituário §1.2); nenhuma das duas
serviu — corrigir o corpo antes do primeiro serviço não queima a reserva. O que a preserva de fato:
quem corrige é o dev do SAN2-5 (que não vota no ciclo 5), o diff é auditável neste PR, a junta do
SAN2-5 valida a correção contra o contrato mergeado (`d283903`), e o inspetor do ciclo 5 confere o
hash publicado (E2e). O corpo NÃO é reescrito: as 308/271 linhas ficam; muda-se o mínimo (E2a/E2b).

**D4 — O que fica para o ciclo 5 (a fronteira deste bloco).** TUDO isto é DELE, e o SAN2-5 não faz
nada disto: executar a absorção (S0) e publicar o terreno pós-absorção; re-medir a bateria barata e as
âncoras; criar a migration da FK e o caso RLS real; re-versionar o contrato; rodar canônicas e drills;
escrever o briefing da junta dele; designar o dev dele; fechar `P-O6R-B02-SUITES-LIST-CI` (a linha do
`ci.yml` entra no PR dele, E3); e o KPI dele. Este bloco entrega TEXTO (apensos), CORPOS, PAINEL e
REGISTRO — nenhum comando na branch `feat/o6r-b02-financial-uow` (que está em `12c3825` local e
remota, medido).

### E1 — Apenso de COMPOSIÇÃO ao plano do ciclo 5 (fecha B1)

Apenso único, datado, **append-only** ao fim de `agent-orchestration/omega/planos/
B-O6R-02-ciclo5-plano.md` (baseline 341 linhas; nenhuma linha existente muda — critério mecânico em
§4.1). Conteúdo:

1. **As 3 cadeiras votantes, nomeadas** (quórum: **unanimidade de 3** — EMENDA item 4 + §C7.1-ter(b);
   toda cadeira tem veto por construção):
   - **C1 `jurado-c5-arnes-catalogo-postgres`** (identidade RESERVADA, corpo corrigido em E2a) — o
     NÚMERO sobrevive à forma na base limpa: canônica 3 N≥10 com denominador idêntico, vaza-metro por
     rodada, D29 pela lista-6 NOMEADA (apenso §V.3), D33. Herda o veto do ciclo 4. Não julga mais o
     mecanismo do arnês (matéria do #359, mergeada) — julga o que o item 3 da EMENDA manteve.
   - **C2 `jurado-c5-banco-fk-triggers`** (fábrica cria, E2b) — FK composta e D35 (up→down→re-up),
     sondas cruas (v)/(vii) nas duas direções, caso `[RLS]` real sob NOBYPASSRLS e D34, censo A6,
     migration aditiva única; e o re-ataque de SALDO com a FK instalada — **absorve o núcleo do
     `ataque-ao-dinheiro`**: com `src/**` congelado (§5 l.134 do plano do c5) e B-1 fechado por 3
     cadeiras (§10.1), o único vetor novo de ataque é o SQL cru contra a FK, matéria desta cadeira.
   - **C3 `jurado-c5-validador-diff-plano`** (fábrica cria, E2b) — escopo §5/PROIBIDO (incluindo diff
     de `src/**` vazio contra o head PÓS-ABSORÇÃO, E4.3), pisos §6, canônicas 1/2 publicadas com N,
     ordem do contrato (D36), registro §12, KPI; e confere que o diff do `ci.yml` é EXATAMENTE a linha
     única do lugar reservado (E3).
   - **Cortadas, com razão escrita:** `jurado-c5-denominador-runner` e `jurado-c5-vaza-metro-teardown`
     — matéria mergeada no #359 (C7/C8 saíram do bloco pela EMENDA item 1; runner/teardown/sweep são
     código de main com guards próprios: 29 casos runner-guard + 5 db-catalog, 34/34 medidos); o que
     resta de vaza-metro (Δroles/Δlinhas por rodada) é parte da medição da C1.
     `jurado-c5-ataque-ao-dinheiro` — fundida na C2 pela razão acima.
2. **Não-votantes:** `critico-c5-adversarial` (corpo corrigido em E2a; ataca o plano COMO EMENDADO,
   máx. 2 rodadas — bloco de invariante, §C7.1-ter(b) última frase); `inspetor-de-terreno-da-junta`
   (instância nova, Fable, fail-closed); dev (instância nova, designação nominal no S0, auditoria
   própria §13.1 mantida); porteiros. O §13.1 (auditoria do dev) segue valendo com os ajustes do E4.
3. **Suplentes nomeados ANTES do início** (D-JUNTA-RESILIENTE): 1 por cadeira votante + 1 do crítico
   (E2b); jurado caído → suplente re-executa o briefing INTEIRO; voto perdido nunca conta.
4. **Regras de terreno consignadas:** worktree próprio para TODA cadeira com mandato de mutação
   (ressalva C.10 do porteiro do #366) + cluster descartável por jurado em porta própria (conferida em
   `netsh interface ipv4 show excludedportrange` — lição `P-SAN2-2-PORTA-55432-RESERVADA`) + proibição
   de junction de `node_modules` (§C7.1-ter(c)) + protocolo P1–P6 (evidência incremental; voto em
   arquivo antes da mensagem final; ≤2 disparos em paralelo; `00-quedas.md`). Modelo dos jurados: o da
   sessão, salvo o que a série P6 do dia disser — a hipótese de pinar modelo tem n pequeno e a série
   decide (D-JUNTA-RESILIENTE, "hipótese em aberto").
5. **Inelegibilidade re-listada por nome** (herda o §13.0 do plano e ACRESCENTA: os 3 especialistas de
   `12c3825`, todos os `jurado-arnes-*`/suplentes que assinaram atas de #359/#365/#366, inspetores e
   porteiros que já serviram, o planejador e o dev do SAN2-5) — e a regra fail-closed do obituário
   §1.4: nome ausente do obituário NÃO absolve; a conferência é por grep nas atas.
6. **A tabela de hashes dos corpos** (E2e) — é ELA que o inspetor do ciclo 5 confere, não o S0.

### E2 — Corpos das cadeiras na linhagem, conformes ao contrato (fecha B2)

- **E2a — Trazer e corrigir os 2 reservados.** Restaurar de `demo/investidor` pelo blob (`git show`
  ou `git cat-file`, LF puro — NUNCA `git archive`+`tar`, lição §C7.1-ter(c) e ERRATA S0 do plano do
  c5), criando `.claude/agents/especialistas/` na linhagem. Correções cirúrgicas:
  - `jurado-c5-arnes-catalogo-postgres.md`: (i) l.79-80 — quórum passa a "unanimidade de 3
    (§C7.1-ter(b); EMENDA item 4)", morre o "5/5"; (ii) o schema de voto (l.295) ganha o campo
    `"escopo": "dentro-do-bloco | pre-existente"` com exigência de evidência de data/origem no motivo
    (molde: `jurado-arnes-catalogo-postgres.md` de `demo/investidor`, ~l.349) e `pendencias_que_aceito`
    ganha "achados pre-existentes que viram pendência nomeada"; (iii) APENSO datado ao final do corpo:
    a matéria de mecanismo (C6/C7/C8) saiu do bloco pela EMENDA — a cadeira julga o NÚMERO na base
    limpa (canônica 3 N≥10, denominador, vaza-metro, D29 pela lista-6), e o vermelho-controle
    histórico 5/13 vale como referência de espécie, não de forma (E4.4).
  - `critico-c5-adversarial.md`: APENSO datado — a deliberação entre as opções A/B/C foi decidida
    pelo dono: **B**, em `D-JUNTA-ESCOPO-E-CALIBRACAO` (fonte §A1.1 — decisão do dono não é matéria
    de ataque); o ataque passa a mirar o plano COMO EMENDADO + os apensos E1/E3/E4; os itens do corpo
    que atacam a escolha do híbrido ficam como histórico não-operante, nomeados no apenso.
- **E2b — Fábrica cria os corpos que faltam** (identidade nova; forma pelo molde com `escopo`; quórum
  3-unânimes escrito): `jurado-c5-banco-fk-triggers.md` · `jurado-c5-validador-diff-plano.md` ·
  `jurado-c5-suplente-arnes-catalogo-postgres.md` · `jurado-c5-suplente-banco-fk-triggers.md` ·
  `jurado-c5-suplente-validador-diff-plano.md` · `suplente-critico-c5-adversarial.md`. Cada corpo com
  mandato ≤3 itens de medição por vez (P4), briefing conferível e a linha final VOTO no formato do
  molde. **8 corpos no total** em `.claude/agents/especialistas/`.
- **E2c — Guard permanente da classe** que o B2 pegou (corpo de jurado contradizendo o contrato de
  voto): novo `tests/junta-voto-escopo-guard.test.ts` — para todo `.claude/agents/especialistas/*.md`
  que declare schema de voto (contém `"gravidade"`), exigir `"escopo"` no mesmo schema; ≥2 casos:
  fixture-vermelho (gravidade sem escopo → falha nomeando o arquivo) e repo-verde (os 8 corpos reais
  passam). Sem banco, sem rede.
- **E2d — Espelho Codex: NÃO espelhar aqui; registrar.** Pendência nova
  `P-SYNC-AGENTS-NAO-RECURSIVO` (MÉDIA, `pre-existente`; evidência: leitura plana na l.66 do sync;
  demo tem 17 espelhados sob subdir por mecanismo ausente na main; S0 ec=0 cego a `especialistas/`),
  dono = o bloco que for autorizado a tocar `scripts/sync-agent-agents.mjs` (a atribuir, candidato
  nomeado). Espelhar à mão reproduziria à mão a transformação do script (preâmbulo/frontmatter) —
  a classe de erro que o script existe para evitar; e editar o script aqui é `scripts/**`, proibido.
- **E2e — Conferência própria, sem S0:** o apenso E1 publica a tabela `git hash-object` dos 8 corpos
  como mergeados; o inspetor do ciclo 5 confere hash a hash (forma LF pura). É a resposta ao "ec=0
  não prova nada" (§2.2).

### E3 — Decisão B3 por escrito: VALE O `ci.yml`; o plano do c5 é emendado (apenso, nunca reescrita)

**Decisão: o lado errado é o do plano do ciclo 5.** Razões: (1) o texto do `ci.yml` é **mergeado e
mais novo** (#363, 2026-08-30, contra plano de 2026-08-27/28) e foi escrito por quem CRIOU o lugar
reservado, nomeando o PR do ciclo 5 como dono da pendência; (2) a justificativa original do PROIBIDO
("uma linha a mais de superfície de falha não entra no ciclo-teto", deliberação l.93 do plano) foi
escrita QUANDO adicionar a linha quebraria o CI — o arquivo não existia na main; o #363 inverteu o
risco: NÃO adicionar a linha no PR que traz o arquivo deixa a suíte fora do CI para sempre, o exato
verde-cego que o guard existe para matar; (3) o pipefail já contém o risco do tee (§0.f do plano,
medido por leitura). **O apenso emenda §5, §10.5 e §12 do plano do c5:** a única mudança permitida em
`.github/workflows/ci.yml` no PR do ciclo 5 é UMA linha no LUGAR RESERVADO — a linha SUITES que
acrescenta `tests/financial-entry-delete-reverse-race-db.test.ts`, no formato das linhas vizinhas
l.213-216 — no MESMO PR que traz o arquivo; `P-O6R-B02-SUITES-LIST-CI` FECHA nesse PR; todo o resto
do `ci.yml` segue proibido, e "arquivo fora das listas → PARA e devolve" fica de pé para o resto.
Registro: emenda na própria pendência em `controle/pendencias.md` nomeando a contradição e a
resolução (§A2). **Este bloco NÃO toca o `ci.yml`** — resolve por texto.

### E4 — Decisão B4 por escrito: apenso de TERRENO ao plano do c5 (absorção, âncoras, forma D29)

O apenso substitui a instrução falsa do §8 pelos fatos medidos (§2.4) e dá ao S0 do ciclo 5 o roteiro:
1. **S0-zero novo — absorção por MERGE** de `origin/main` (= `df496d2` hoje; o S0 re-mede na hora) em
   `feat/o6r-b02-financial-uow`, pelo orquestrador: nos 9 arquivos de conflito nomeados (§2.4), a
   resolução é **versão da main, integral** (checkout dos 9 a partir de `origin/main` durante o
   merge); em seguida a verificação nomeada: o diff exclusivo do lado-branch nesses 9 é lido uma vez —
   se alguma linha for insumo vivo do ciclo 5, **PARA e devolve ao planejador** (expectativa medida:
   nenhuma é — §2.7). O commit de merge preserva `12c3825` na história; NENHUM rebase (D1).
2. **S0-zero-b — terreno pós-absorção PUBLICADO** (em
   `omega/planos/B-O6R-02-ciclo5-terreno-pos-absorcao.md`): o novo head; a tabela de âncoras
   RE-MEDIDA — esperado: `e352c6c`/`9be7caf` intactas (provado no merge simulado, §2.4) e as 3 do
   arnês = blobs da main (`b12b25f`/`0a4f812`/`335f6a1`); qualquer outra coisa → PARA. Bateria barata
   da lista-6 NOMEADA (§V.3 — a lista NÃO muda) re-executada N≥13 em cluster descartável próprio:
   re-declara o par (6, total) e a FORMA — **105 migrations** (as 2 do bloco, nomeadas em §2.4; vira
   106 quando a migration da FK nascer), head novo, Node e env como no §0.a do plano do c5.
   Expectativa pós-#359: 13/13 verdes, 0 XX000 — **XX000 remanescente é ACHADO NOVO e devolve ao
   planejador antes de qualquer código.**
3. **Critérios re-baseados:** o §9.9 passa de "diff de `src/**` contra `12c3825` vazio" para "contra
   o head pós-absorção vazio" (o critério antigo reprovaria o bloco por construção — §2.4); o §7
   ("âncora divergente = violação") passa a apontar a tabela do S0-zero-b.
4. **Comparabilidade dita por extenso:** o vermelho-controle histórico do D29 (5/13 em `12c3825`;
   7/13 em `pendencias.md` pré-correção do arnês) fica como referência de ESPÉCIE (a classe existia),
   não de FORMA (heads e migrations diferem) — o número novo não continua a série antiga.

### E5 — KPI: as dívidas do #366 pagas + entrada própria (§C3)

Backfill §C3.5 do #366 na entrada SAN2-4b do history: `pr` 366 · `merge_commit` `df496d2` ·
`approved_head` **`2d2d16d`** (head julgado da ata l.6 — NÃO o headRefOid `6b284f4`; delta medido
pelo porteiro: 17 arquivos, 100% agent-orchestration), com a nota de reatribuição: o porteiro nomeou
o PR do ciclo 5; o SAN2-5 entrou na fila antes e paga para preservar a ordem dos backfills (§A2).
`blocks_completed` **155 → 156** (condição literal da entrada SAN2-4b, cumprida pelo merge do #366).
Entrada própria SAN2-5 no latest + history (append) com `pr`/`merge_commit`/`approved_head` null na
autoria e a condição "sobe para 157 SÓ QUANDO ESTE BLOCO MERGEAR"; `mvp_demo`/`mvp_vendavel`
INTOCADOS (nenhum escopo de produto move); trilhas não tocadas CARREGADAS com marcador §C3.3 e prova
de diff vazio; FROZEN do painel regenerado (executar `scripts/kpi-freeze.mjs` — não editá-lo).

### E6 — As 4 pendências com dono `SAN2-5`, decididas uma a uma

- **E6a `P-KPI-PAINEL-NAO-RENDERIZA-SUMMARY` — FAZ AQUI.** `Kpis/app.js` + `Kpis/index.html`: seção
  que renderiza o `release.summary` do latest (e/ou a `description` da entrada corrente do history) —
  o texto onde o bloco declara o que NÃO fechou passa a ter consumidor no artefato principal
  (`D-KPI-INDEX-PAINEL`). Sem dado real, a seção fica ESCONDIDA — painel não inventa (D-007).
  Critério de fechamento: o da própria pendência (l.4626-4722).
- **E6b `P-KPI-RECENT-CONGELADO` — FAZ AQUI.** "Últimas demandas" passa a DERIVAR do history (as N
  últimas entradas), OU guard permanente que fica vermelho quando o PR-topo de `recent` está atrás do
  PR-topo do history — critério literal da pendência: abrir com dado real mostra #364/#365/#366;
  prova por mutação. **Razão além do dono nominal:** este PR appenda entrada nova ao history —
  entregá-la com o painel afirmando que a última entrega é o #359 seria REPRODUZIR a classe da
  pendência dentro do PR que é dono dela.
- **E6c `P-SAN2-2-INDICE-DONO-SEMPRE-SIM` — FAZ AQUI.** `controle/gerar-indice-pendencias.py`: o
  classificador de dono passa a decidir pelo TEXTO DO VALOR (captura o valor após o rótulo e testa se
  é "a atribuir"), morrem o lookahead furado e o "or" sem filtro — as duas faltas medidas na
  pendência; prova por mutação transcrita (a mesma entrada com dono nomeado sai "sim"; com
  "a atribuir" sai "a atribuir"); `pendencias-indice.md` regenerado 2× (idempotência: 2ª rodada =
  diff vazio); antes/depois publicado (hoje: 108 "sim", 91 falsos — re-medir na hora, não copiar).
  Razão: este PR emenda `pendencias.md` e regenera o índice — regenerá-lo com o classificador
  mentindo reproduziria a mentira.
- **E6d parte 3 (obituário derivado das atas) — NÃO FAZ; reatribui com registro (§A2).** Razões:
  custo alto (varredura de todas as atas/votos + reconciliação de placar), benefício ZERO para o
  ciclo 5 — o §1.4 fail-closed do obituário + o bloco 3.1-bis do inspetor JÁ obrigam o grep nas atas
  na composição ("a lacuna não vira passe livre", texto da própria pendência); e cada frente a mais é
  superfície de reprovação na frente do ciclo-teto (risco R1, §7). Emenda na pendência: dono
  re-atribuído ao bloco sucessor **`SAN2-6`** (nomeado), mantendo "se o dono humano redirecionar,
  re-atribui-se com registro". A junta do SAN2-5 valida a reatribuição; o humano audita a posteriori
  (§C7.2).

### E7 — Registro

`docs/status-geral.md` (estado: SAN2-5 em autoria; ciclo 5 aguardando o porteiro deste bloco) ·
`codex/log-execucao.md` (linha do bloco) · emendas de pendências citadas em E3/E2d/E6 ·
`omega/juntas/J-SAN2-5.md` + `votos/SAN2-5/**` (pela junta, não pelo dev).

### §3.9 · Ordem interna (F-fatias; commit por fatia)

**F1** E2a+E2b (corpos) → **F2** E1+E3+E4 (os apensos — dependem dos hashes de F1 para a tabela E2e)
→ **F3** E2c (guard) → **F4** E5 (KPI/backfill) → **F5** E6a+E6b (painel) + E6c (índice) → **F6** E6d
+ E7 (registro). Lane A (F1–F4, prontidão do ciclo 5) fecha ANTES de lane B (F5–F6, registro
honesto): se a junta reprovar algo de lane B, o replanejamento (Fable, §C7.4) pode destacar lane B em
bloco próprio sem re-litigar lane A — o precedente é a própria EMENDA (B) do dono.

## §4 · Como provar, entrega a entrega (e o baseline N → meta M)

**4.1 — Apensos são APPEND-ONLY, provado por mecânica.** Para
`agent-orchestration/omega/planos/B-O6R-02-ciclo5-plano.md` (baseline **341 linhas**, medido) e para
os 2 corpos reservados corrigidos fora das 3 linhas-alvo: `git diff` do PR nesse arquivo não contém
NENHUMA linha removida de conteúdo (a contagem de linhas iniciadas por "-" no diff, descontado o
cabeçalho, é 0 para o plano do c5; para os corpos, só as linhas nomeadas em E2a mudam). Quem confere:
a C1 da junta (§8) e o validador.

**4.2 — Corpos × contrato.** Para cada um dos 8 corpos: grep transcrito da linha de quórum
("unanimidade de 3") e da linha `"escopo":` no schema de voto; o guard E2c verde na suíte; a tabela
`hash-object` do apenso E1 bate com os arquivos do PR (conferência re-executável por qualquer
jurado). Contra-prova: o fixture-vermelho do guard falha nomeando o arquivo.

**4.3 — Decisões B3/B4 verificáveis por leitura dupla.** O apenso E3 cita `ci.yml` l.217-220 e as 3
linhas do plano que emenda (l.134/l.234/l.256); o apenso E4 cita os 9 conflitos e a tabela de âncoras
esperada — ambos conferíveis contra o §2 deste plano SEM re-executar nada, e re-executáveis pelos
comandos transcritos no §2.

**4.4 — KPI.** `node scripts/kpi-freeze.mjs --check` ec=0 após regen; leitura estruturada dos 2 JSON:
entrada SAN2-4b com o trio 366/`df496d2`/`2d2d16d`; `blocks_completed` 156; entrada SAN2-5 com nulls
de autoria e a condição do 157; guards do painel verdes (§6.4).

**4.5 — Painel (E6a/E6b), prova por mutação como os guards existentes:** com dado real, a seção nova
renderiza o summary e "Últimas demandas" mostra #364/#365/#366 derivadas do history; MUTAÇÃO
(entrada removida do history de teste / recent-topo atrás do history-topo) → caso vermelho; sem dado
real → seção escondida. **Baseline N e meta M, medidos e honestos:** na área tocada do painel, N =
**0** casos exercem `recent`/`summary` hoje (grep §2.6 — é por isso que congelou); meta M = **≥6
casos permanentes novos** (≥2 recent, ≥2 summary, ≥2 guard E2c) — M≥2N cumprido por construção, dito
sem teatro; o denominador global da suíte (hoje 2611) cresce exatamente pelos casos novos e é
publicado com N e forma (§6.2).

**4.6 — Índice (E6c):** prova por mutação transcrita no PR + idempotência (2ª regeneração = diff
vazio) + antes/depois dos números do índice re-medidos na hora.

## §5 · Escopo — caminhos exatos

**PERMITIDO (e nada além):**
- `.claude/agents/especialistas/` — SOMENTE os 8 arquivos nomeados em E2a/E2b (diretório novo na
  linhagem).
- `agent-orchestration/omega/planos/B-O6R-02-ciclo5-plano.md` — apensos E1/E3/E4, append-only.
- `agent-orchestration/omega/planos/SAN2-5-plano.md` — este plano.
- `Kpis/kpis-latest.json` · `Kpis/kpis-history.json` · `Kpis/kpis-history.md` · `Kpis/app.js` ·
  `Kpis/index.html` (E5/E6a/E6b; o FROZEN de `app.js` via script, nunca à mão).
- `tests/junta-voto-escopo-guard.test.ts` (NOVO, E2c) · `tests/kpi-dashboard-charts.test.ts`
  (ESTENDER com os casos E6a/E6b; nenhum caso existente removido — os 16-19 atuais são baseline).
- `agent-orchestration/controle/pendencias.md` (emendas E3/E2d/E6d + pendência nova E2d) ·
  `agent-orchestration/controle/pendencias-indice.md` (regenerado por script) ·
  `agent-orchestration/controle/gerar-indice-pendencias.py` (E6c, o classificador de dono).
- `agent-orchestration/docs/status-geral.md` · `agent-orchestration/codex/log-execucao.md` (E7).
- `agent-orchestration/omega/juntas/J-SAN2-5.md` + `agent-orchestration/omega/juntas/votos/SAN2-5/**`
  (junta/inspetor, não o dev).

**PROIBIDO (violação = veto do validador):** `src/**` INTEIRO · `prisma/**` · `migrations/**` ·
`.github/workflows/ci.yml` (a contradição B3 se resolve por apenso, não tocando o arquivo aqui) ·
`API_CONTRACTS.md` · `CLAUDE.md`/`AGENTS.md` (diff vazio contra a main é critério) · `.env` ·
lockfiles · `frontend/**` · `mobile/**` · `infra/**` · `scripts/**` (executar `kpi-freeze`/`sync`/
`run-backend-tests` sim; EDITAR não) · `.agents/**` (espelho intocado por construção; qualquer
DIVERGE no check = PARA) · os 23 corpos-base em `.claude/agents/*.md` · demais `tests/**` ·
**a branch `feat/o6r-b02-financial-uow`** (NENHUM commit, push, checkout ou mutação — a absorção é do
S0 do ciclo 5, D1) · a base viva `erp-postgres`/`erp-redis` (nem leitura) · `mvp_*` · junction/
symlink de `node_modules` · heredoc de shell para conteúdo de arquivo rastreado (lição das quedas
desta sessão: conteúdo por arquivo/patch, não por here-doc gigante) · `git checkout/stash/clean/
reset --hard` na árvore principal. **Arquivo fora das listas → o dev PARA e devolve.**

## §6 · Bateria (forma declarada; exit por variável; contagens lidas do TAP em arquivo)

1. `npm run check` · `npm run lint`.
2. **Canônica 3, N=1 rodada completa** em cluster descartável PRÓPRIO (postgres:16, **103**
   migrations — main; par de portas conferido em `netsh interface ipv4 show excludedportrange`
   ANTES — lição `P-SAN2-2-PORTA-55432-RESERVADA`; `CORE_SAAS_PERSISTENCE` ausente; Node v20.19.5):
   `npm test` com `DATABASE_URL`/`REDIS_URL` no par descartável — publica
   arquivos/testes/pass/fail/skip/ec/duração. Esperado: denominador 2611 + casos novos (E2c + E6),
   skip=2 nomeados, fail=0. A base viva não recebe NENHUM comando, nem leitura.
3. **Casos novos isolados, N=3 cada:** `tests/junta-voto-escopo-guard.test.ts` e
   `tests/kpi-dashboard-charts.test.ts` — denominador constante 3/3, transcrito.
4. `node --check Kpis/app.js` · `node scripts/kpi-freeze.mjs --check` (após regen) · guards do painel
   (o `kpi-dashboard-charts` já entra no item 2; aqui fica o registro de que TODOS os casos legados
   seguem verdes — nenhum removido).
5. **Índice:** `python agent-orchestration/controle/gerar-indice-pendencias.py` 2× — a 2ª execução
   com diff vazio (idempotência); prova por mutação do classificador transcrita (E6c).
6. `node scripts/sync-agent-agents.mjs --check` → ec=0, "23 agentes" (espelho INALTERADO — este bloco
   não toca corpo espelhável; qualquer DIVERGE = PARA e devolve).
7. `npm run build`.
8. **Prova mecânica do escopo:** `git diff --name-only` do PR não contém `src/`, `prisma/`,
   `.github/`, `frontend/`, `mobile/`, `scripts/`, `.agents/`, `API_CONTRACTS.md`, `CLAUDE.md`,
   `AGENTS.md`; e `git branch -v` mostra `feat/o6r-b02-financial-uow` AINDA em `12c3825` (a prova de
   que este bloco não a mutou).
9. **Append-only do plano do c5:** diff do PR em `B-O6R-02-ciclo5-plano.md` sem linha de conteúdo
   removida (§4.1); as 341 primeiras linhas idênticas às da main.
10. `git diff --check` · limpeza §C5 executada (containers do bloco derrubados; linha de limpeza no
    fechamento).

## §7 · Riscos e rollback

| # | Risco | Contenção |
|---|---|---|
| R1 | **Preparar demais e invadir o ciclo 5** — a tentação de "já fazer" a absorção, o briefing da junta do c5 ou a migration | Fronteira escrita (D4) + prova mecânica §6.8 (a branch de insumo continua em `12c3825`) + veto do validador; quem executa a absorção é o S0 do c5, com devolução fail-closed que NÃO consome a tentativa única |
| R2 | Correção de corpo que nasce defeituosa (a classe da `D-JUNTA-SEPARACAO-DE-PAPEIS`: quem corrige se convence do conserto) | Correções mínimas nomeadas por linha (E2a); guard E2c executa a propriedade em vez de confiar na releitura; a C1 da junta confere corpo × contrato `d283903` linha a linha |
| R3 | Lane B (painel/índice) reprovar e atrasar o ciclo-teto | Ordem F (§3.9): lane A fecha antes; commit por fatia permite destacar lane B em replanejamento (precedente: EMENDA (B)); e este bloco nasce sob teto de 2 ciclos (`D-TETO-DOIS-CICLOS`) — reprovou 2×, para e vira dossiê |
| R4 | Apenso que reescreve em vez de apensar (§A2) | Critério mecânico §4.1/§6.9 — as 341 linhas do plano do c5 intocadas por construção |
| R5 | Quedas por `server_error` no meio da junta (dezenas nesta sessão) | P1–P6 integral: evidência incremental em arquivo, voto em arquivo ANTES da mensagem final, ≤2 disparos paralelos, suplente nomeado antes, `00-quedas.md` |
| R6 | Reatribuições contestadas (dívida do porteiro E5; dono da parte 3 E6d) | Cada uma com registro §A2 no lugar próprio + razão; são matéria de AJUSTE para a junta, não de veto — e o humano audita a posteriori (§C7.2) |
| R7 | A convenção do espelho de especialistas divergir em silêncio (demo espelha, main não) | E2d registra a pendência com evidência e dono candidato — nem espelha à mão, nem conserta o script fora de escopo, nem cala (§A2) |
| R8 | O guard E2c dar falso-vermelho em corpo legítimo sem schema de voto | O guard só exige `escopo` onde há `"gravidade"` (schema declarado); corpo sem schema não é alcançado; fixture de controle verde prova |

**Rollback:** revert do PR único; nenhuma migration, nenhum dado, nenhuma rota; o painel volta ao
FROZEN anterior; os corpos saem da linhagem sem afetar `demo/investidor`; os apensos somem com o
revert e o plano do c5 volta ao estado atual (que é exatamente o estado que ESTE plano provou ser
inexecutável — por isso o revert é o último recurso, não o caminho).

## §8 · Junta do SAN2-5 — quórum decidido com argumento (`D-JUNTA-ESCOPO-E-CALIBRACAO`)

**Quórum: MAIORIA de 3.** Argumento: o §C7.1-ter(b) calibra pelo que o bloco **TOCA** — e o diff
deste bloco não toca dinheiro, segurança, permissão nem perda de dado (`src/`, `prisma/`, rotas e
RBAC intocados, provado mecanicamente em §6.8; o que muda é governança de junta, painel de KPI e
registro). A matéria REFERIDA é o ciclo financeiro, mas elevar quórum por referência recriaria a
regra não-escrita ("parece financeiro, logo 5/5") que reprovou quatro ciclos e que o 1-ter(b) matou.
**Sem `critico-adversarial`:** não é bloco de invariante (1-ter(b), última frase). **Votos com campo
`escopo` obrigatório** — esta junta estreia o guard E2c em si mesma.

**Cadeiras (identidade nova; inelegíveis: todos que serviram nas juntas SAN2-2/3/4a/4b, os nomes do
obituário com conferência por grep nas atas — regra fail-closed §1.4 —, os 3 especialistas de
`12c3825`, e eu, o planejador):**
- **C1 `governanca-de-juntas`** — corpos × contrato `d283903` (quórum, `escopo`, evidência), a
  composição E1 × EMENDA/decisões, inelegibilidade por atas, apensos append-only (§4.1), a fronteira
  D4 respeitada.
- **C2 `painel-e-registro-kpi`** — re-executa os guards do painel e o E2c, prova por mutação E6a/E6b,
  backfill 366/`df496d2`/`2d2d16d` × ata, freeze, índice E6c (mutação + idempotência), entrada
  SAN2-5.
- **C3 `validador-diff-escopo`** — bateria §6 re-executada por amostragem dirigida (itens 6.6, 6.8,
  6.9 SEMPRE; demais por risco), limpeza §C5, diff do PR arquivo a arquivo contra o §5.
**Suplente nomeado por cadeira ANTES do início** (D-JUNTA-RESILIENTE); jurado que MUTA (C2, nas
provas por mutação) trabalha em worktree próprio — a regra do incidente do #366, que este plano já
carimba para o ciclo 5 em E1.4, vale primeiro para nós. **Inspetor de terreno ANTES da junta,
fail-closed** (§C7.1-bis), com a fatia S0 (item 6.6) e a conferência por hash dos 8 corpos (E2e).
Ata `J-SAN2-5.md` responde (a)/(b)/(c) do §C7.4-bis e registra quem ocupou cada papel.

---

**O que eu medi está no §2, comando a comando; o que eu decidi está no §3, razão a razão. Nenhuma
afirmação sobre comportamento futuro é fato — são critérios de aceitação com juiz nomeado. O ciclo 5
tem uma tentativa; este bloco existe para que ela seja gasta com o mérito do financeiro, e com mais
nada.**

*Plano gravado em 2026-08-31 por `planejador-mestre` (Fable), worktree `san2-r`, head `44a30e4`.
Limpeza da minha sessão: nenhum container criado, nenhuma mutação fora deste arquivo, base viva não
tocada (nem leitura); o merge simulado do §2.4 usou `git merge-tree` (in-memory, sem tocar a árvore).*
