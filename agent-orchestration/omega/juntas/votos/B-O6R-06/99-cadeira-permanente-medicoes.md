# Parecer da cadeira permanente — B-O6R-06

## VEREDITO: EM APURACAO

## 0. Nota de modelo — OBRIGATORIA
Meu frontmatter fixa `model: fable` (D-CADEIRA-PERMANENTE-JUNTA, 2026-09-07). A primeira convocacao
de hoje CAIU ANTES DE MEDIR QUALQUER COISA, com HTTP 429 (cota Fable esgotada na conta). O contrato
preve a excecao: "indisponibilidade do modelo vira nota na ata". Este parecer roda em OPUS.
NENHUMA medicao foi herdada da convocacao caida — ela nao produziu nenhum artefato, nenhum comando,
nenhuma linha de evidencia. Tudo abaixo foi medido nesta convocacao.

Segunda anomalia, declarada: sou RETROATIVA nesta junta. A D-CADEIRA-PERMANENTE-JUNTA e de 2026-09-07;
esta junta votou em 2026-09-07 antes da norma existir. O dono determinou por escrito que eu entrasse
validando o ja alegado. Isto NAO e omissao da junta nem do inspetor-de-terreno — a norma nasceu depois,
e o inspetor desta junta nao podia ter bloqueado por falta de convocacao minha.

## 1 · Cadeira × voto ganho

| cadeira | executou? | N e forma? | escopo com evidência? | veredito |
|---|---|---|---|---|
| **C1** `jurado-06-banco-atomicidade-rls` | SIM — mecanismo provado pelo **SQL que o servidor recebeu** (`log_statement='all'` + `docker logs`), não por leitura; 6 suítes com ec por variável e contagem lida do TAP; **17 mutações** revertidas e conferidas por `git hash-object`. **Eu reexecutei** 6 das suítes dela | SIM — N por suíte, ec por variável, Node v20.19.5, cluster próprio :57432, junction ausente. **Falta `core.autocrlf`** | SIM — 3 `dentro-do-bloco`; o único `pre-existente` datado na migration `20260611000000` (**eu confirmei**: `0648a8e1`, 2026-06-08) + ausência de chamador provada por presença | **GANHO** |
| **C2** `jurado-06-invariante-financeiro-rateio` | SIM — fixture própria de **N=10.001**, referência em **BigInt de micro-unidades sobre `unblended_cost::text`** em 21 páginas, tolerância zero; versão do Prisma pinada **por execução** (`require(...).version` → 7.8.0), não por leitura do `package.json`; spy sobre o cliente real. **Eu reexecutei** as 2 suítes de resumo | SIM — N, faixa, forma da referência, tempo (3345 ms), Node v20.19.5, cluster próprio :58432. **Falta `core.autocrlf`** | SIM — 1 `dentro-do-bloco`; 2 `pre-existente` datados (`6f27faae` e `0648a8e1`, ambos **2026-06-08** — **eu confirmei os dois**), anteriores à branch | **GANHO** |
| **C3** `jurado-06-contrato-regressao-kpi` | SIM — baseline e head em cluster próprio e banco pristino; ordem contrato×drill medida por `git log`; **declarou o próprio erro de método** (4 falhas de resíduo dela mesma) em vez de reprovar o bloco. **Eu reproduzi o Δ=+54** por caminho independente | SIM — N, forma, banco pristino, Node v20.19.5 **e `core.autocrlf`** (única das três) | SIM — 4 achados, todos `dentro-do-bloco`, cada um com o comando e a contra-medição | **GANHO** |

**Nenhum voto é prosa.** Os três se ancoram em terreno próprio (worktree detached + `npm ci` próprio + cluster
descartável), e os três provaram o head de código com o pathspec — eu refiz e bate (`0f0a872a` ≡ `005b522c` fora
de registro; árvores `bb42086c`/`413a304f`).
**Nenhum herdou afirmação de ata alheia como fato** (ciclo 1; as três declaram re-execução integral do briefing).
**Nenhuma cadeira escreveu "não consigo medir" e aprovou** — o caso do §1.6 não ocorre.
**Denominador:** reproduzi o **Δ=+54** somando as 7 suítes novas uma a uma no meu cluster
(15+6+10+6+6+4+7). Ver §8 para o absoluto.

### Por que 11 achados e zero `bloqueia` NÃO é carimbo aqui
É a pergunta que me põe nesta cadeira, então respondo com medida, não com impressão:
1. **Os 11 têm comando.** Cada achado nomeia arquivo:linha, mutação ou execução, e a contra-medição. Carimbo
   produz achado sem comando; não há nenhum.
2. **Três dos 11 são contra a própria casa** — a C3 acha contra o registro do bloco (lista do §6 incompleta,
   narrativa 10 × registro 11, mãe `ABERTA` × status-geral) e ainda registra o erro de método dela.
3. **Os `pre-existente` não são fuga.** Os três têm data anterior à branch, **conferida por mim**, e o da C2
   ainda **publica o N do efeito** (4,285714 deslocados entre organizações, 7,5% de storage+jobs) — que é
   exatamente o que o §C7.1-ter(a) exige e quase nunca se vê.
4. **A falsificação existe.** As 17 mutações da C1 ficaram **todas** ec=1 no alvo; o `-db` sem `DATABASE_URL`
   sai **verde e vazio** (medi: `tests=1 pass=0 skip=1 ec=0`), e as cadeiras mediram **com** cluster. O verde
   não é cego.
O que eu **não** digo: que nenhum dos 11 deveria bloquear. Isso é mérito e não é meu. O que digo é que cada um
foi **medido antes de ser calibrado** — e é isso que separa junta calibrada de carimbo.

## 2 · Achado bloqueante × legitimidade

**NÃO SE APLICA — não há veto.** Os três votos são `APROVADO`; os 11 achados são `nota` no JSON, e
**nenhuma evidência contradiz a própria gravidade**: procurei nas três evidências por linguagem de reprovação
e a única ocorrência é a C3 narrando que *teria* reprovado por sujeira própria e não reprovou.
Sem veto, não há veto ilegítimo a declarar.

**A checagem espelhada — reprovação por construção — também não ocorreu**, e foi ativamente evitada: as três
cadeiras **enumeraram por escrito** o que não estavam cobrando (o ramo `completed` do script de reconciliação e
a série K, bloqueados pelo crítico em R2-A; `I2'` reescrita, R2-B; migration; `mobile/**`; o piso `≥90`;
dependência nova). Medi o risco clássico: **só existe UMA cópia do plano** (1153 linhas, `d64ca5ca`, com a
`EMENDA E1` na l.777) — a armadilha das 307 × 847 linhas não tinha como se repetir aqui.

## 3 · Quórum

| | |
|---|---|
| **Exigido pelo risco (§C7.1-ter(b))** | **unanimidade de 3** — o bloco toca **dinheiro** nos dois lados (o total que o painel publica e a base sobre a qual o custo é rateado) |
| **É caso de 5/5?** | **Não**, e medi as três condições eu mesma: `package.json`/`package-lock.json` = **0 arquivo** no diff (sem dependência nova); `frontend`/`mobile`/`src/infra` = **0 arquivo**; `ci.yml` = **+8/−0** acrescentando suítes a um job de teste, **não é deploy**; nenhum serviço externo pago |
| **Aplicado** | unanimidade de 3 (3×0) |
| **Bate?** | **SIM.** Nem abaixo nem **acima** — não houve a escalada-por-reprovação que a auditoria de 28/08 mediu |

**Voto perdido:** `00-quedas.md` **não existe** nesta junta e a ata **não consigna "quedas: 0"** (P6 do
`D-JUNTA-RESILIENTE`). Não aceitei o silêncio: apurei por **contagem de identidades** — 3 votos, 3 identidades
distintas, corpos criados em `e35492ef` (2026-09-07), nenhuma delas em qualquer outra ata. **Quórum
materialmente íntegro**; a linha de registro é que falta.

## 4 · Papéis do §C7.4-bis

**Presentes e nomeados** — a ata §1 traz a tabela dos sete papéis e o §7 responde (a), (b) e (c) por escrito.
Conferi **por nome**, não por leitura da tabela:

- **(a) A composição cobre a competência?** Sim, e verifiquei o que ela alega: C1 mediu **sob os dois papéis**
  de banco (o defeito do canário é invisível sob `NOBYPASSRLS` — a RLS recorta e o teste passa **com o defeito
  presente**); C2 trouxe referência aritmética de **família diferente** (BigInt) da do artefato medido; C3
  reproduziu a baseline que o inspetor não conseguiu.
- **(b) Quem achou é quem consertou?** **Não.** Achado: auditoria Ω6R + `critico-adversarial`. Plano:
  `planejador-mestre`. Código: dev `general-purpose`. Julgamento: três jurados de identidade nova criados
  **depois** do código (`e35492ef` > `0f0a872a`). Cinco papéis, cinco identidades — confirmado por `git log`.
- **(c) O planejador usou dado podre?** **Usou, e foi pego duas vezes antes da primeira linha de código** —
  a invariante `I1` era falsa por construção e o `createMany` fazia o oposto do suposto. As PDs e o crítico
  corrigiram no plano, não no conserto. **É o §C7.4-bis funcionando como desenhado.**

**Eu sou inelegível para cadeira de mérito neste bloco** e não ocupei nenhuma: não julguei atomicidade, valor,
rateio, contrato nem KPI de produto — reexecutei números apenas para aferir se os votos os ganharam.

## 5 · Série entre juntas — o que só esta cadeira vê

Acervo medido: **97 atas `J-*`** e **34 `R-*`**.

**Padrões que eu procurava e NÃO encontrei nesta junta:**
- *Cadeira que já votou sem executar mais de uma vez* — **não se aplica**: as três identidades nasceram em
  `e35492ef` (2026-09-07) e `grep` nas 97 atas devolve **só** `J-B-O6R-06.md`. Sem histórico, sem reincidência.
- *`pre-existente` sem evidência em blocos diferentes* — 12 atas citam `pre-existente`; nesta, os **três**
  carregam data e eu reconferi os **três** por `git log`. **Nenhuma instância nova do padrão.**
- *Plano cobrado além do que escreveu* — 8 atas já citam "por construção", padrão **já documentado** pela
  auditoria de 28/08, **não novo**. Aqui as cadeiras enumeraram o que não cobravam. Sem instância nova.

**UM padrão novo, com duas instâncias medidas neste bloco e uma anterior — e eu o nomeio como padrão pela
primeira vez:**

> **A lista fechada do §6 nunca enumera os artefatos que a própria junta produz.**
> Instância 1: o achado 1 da C3 — `votos/B-O6R-07b/05-porteiro-pos-merge-fe2748c.md` (140/0) entra no diff e o
> §6 não o previa, **embora o §C2.8 o exija para o bloco poder começar**.
> Instância 2 (**minha, que ninguém podia ter visto**): **12 corpos de jurado** (`.claude/agents/especialistas/jurado-06-*`
> e o espelho `.agents/`) entram no merge e **não estão** na lista do §6. São estruturalmente invisíveis à C3,
> que ancorou em `0f0a872a` — os corpos nasceram em `e35492ef`, **depois** do head de código.
> Instância anterior: o #381 (`B-GOV-ELENCO-ENXUTO`) carregou corpos de jurado pelo mesmo caminho.
> **Não é defeito de cadeira nenhuma. É defeito do molde de plano**, e por isso reaparece a cada bloco.

**A minha própria pendência anterior, cobrada:** na homologação nº 1 eu deixei escrito *"próximos votos
publicam versão do Node e `autocrlf`"*. Medi: **Node — fechada, 3/3**. **`autocrlf` — 1/3** (só a C3).
Fechamento **parcial**, e volto a nomeá-la. É a razão de a cadeira ser permanente: uma cadeira descartável não
teria como cobrar a dívida que ela própria deixou.

## 6 · A minha série — e a correção que ela obriga

O despacho me informou `homologadas 0 / anuladas 0` e disse que esta seria a minha **primeira** homologação.
**Medi, e não é.** Existe em `origin/main`, mergeado pelo **#381**:

`agent-orchestration/omega/juntas/votos/B-GOV-ELENCO/99-cadeira-permanente.md` — auto-declarada
**"homologação nº 1"**, veredito **`HOMOLOGADO COM RESSALVA`** sobre a junta do `B-GOV-ELENCO`
(que havia **REPROVADO 3×0**).

| | antes deste parecer | depois deste parecer |
|---|---|---|
| **Homologadas** | **1** (1 com ressalva) | **2** |
| **Anuladas** | **0** | **0** |

**Registro a assimetria enquanto ela ainda é pequena:** 2 de 2 homologadas, 0 anuladas. Duas juntas não fazem
tendência e eu **não vou fabricar uma**. Mas é exatamente esta linha que faz carimbo aparecer na série antes
de aparecer no dano, e ela só significa alguma coisa se for publicada **inclusive quando é favorável**.
Deixo o contraditório explícito para o `porteiro-pos-merge`: das duas juntas que homologuei, **uma havia
reprovado e outra aprovou** — não estou correlacionada com o lado do veredito, e sim com a existência de
execução. Se a terceira também sair homologada, a pergunta vira legítima e quem deve fazê-la é o porteiro.

**Correção de registro obrigatória:** o briefing da próxima junta **não** pode repetir `0/0`. A série é do
**assento**, não da instância.

## 7 · Pendências que eu abro (nenhuma é voto meu)

**Defeito de produto que eu tenha visto e não seja das cadeiras: NENHUM.**

| # | pendência | gravidade | bloco dono |
|---|---|---|---|
| **1** | **`origin/main` moveu depois do voto e o merge CONFLITA.** A junta ganhou o veredito contra `fe2748c8`; `origin/main` é hoje **`90d30f8a`** (#381, mergeado **depois**). `git merge-tree --write-tree origin/main 005b522c` → **ec=1, 5 conflitos de conteúdo**: `Kpis/app.js`, `Kpis/kpis-history.json`, `Kpis/kpis-history.md`, `Kpis/kpis-latest.json`, `agent-orchestration/controle/pendencias.md`. Quem resolver estará **autorando conteúdo de KPI que cadeira nenhuma validou** — e o §C3.0 faz do painel a **entrega**. | **ALTA** | o próprio merge do B-O6R-06; conferência do `porteiro-pos-merge` |
| **2** | **12 corpos de jurado fora da lista fechada do §6** (`.claude/agents/especialistas/jurado-06-*` + espelho `.agents/`), estruturalmente invisíveis à C3. Append puro, zero produto. **Classe recorrente** (ver §5) — o remédio é o molde de plano, não este bloco. | MÉDIA | molde de plano / próximo bloco de governança |
| **3** | **A ata não transcreve os dois hashes que o §5 do plano manda registrar** (`API_CONTRACTS.md` × drill). A **ordem está correta** — C3 mediu e eu confirmei (`c5535470` depois de `b5f2f0e9`/`706dbf77`/`a618bc83`) —, falta a transcrição. | BAIXA | fechamento desta ata |
| **4** | **A ata escreve "LIBERADO" onde o inspetor escreveu "LIBERADO COM RESSALVA"** (§2.7 × parecer l.350). As ressalvas eram erros de briefing já corrigidos (`416a5687`); ainda assim, ata não encurta veredito de gate. | BAIXA | fechamento desta ata |
| **5** | **`00-quedas.md` ausente e a ata sem a linha "quedas: 0"** (P6 do `D-JUNTA-RESILIENTE`). Apurei o quórum por contagem de identidades; o registro é que não fecha sozinho. | BAIXA | fechamento desta ata |
| **6** | **`core.autocrlf` publicado por 1 das 3 cadeiras** — reincidência parcial da minha pendência nº 8 da homologação nº 1. Node fechou (3/3). | BAIXA | próximas juntas |
| **7** | **A minha série estava errada no despacho** (`0/0` × real `1/0`). Corrigir o briefing da próxima junta. | MÉDIA | orquestrador |

**Reclassificações de achado:** **nenhuma.** Os 3 `pre-existente` foram declarados **com** evidência de data e
eu confirmei os 3 — não há o caso do §C7.1-ter(a) (`escopo sem evidência → tratado como dentro-do-bloco`).
Os 8 `dentro-do-bloco` permanecem como estão: são `nota`, e recalibrar gravidade de achado provado seria
julgar mérito.

## 8. Verificacoes executadas
(pendente)

---
## MEDICOES BRUTAS (apensadas ao vivo, P1)

M1. Head de codigo: `git diff --numstat 0f0a872a 005b522c -- . ':!agent-orchestration' ':!.claude' ':!.agents' ':!docs'` => VAZIO, ec=0.
    Arvores: 0f0a872a^{tree}=bb42086c / 005b522c^{tree}=413a304f (diferentes; a diferenca e so registro). Alegacao da ata CONFIRMADA.
M2. merge-base(HEAD, origin/main) = fe2748c84cc1. CONFIRMADA.
M3. **origin/main HOJE = 90d30f8a** (#381 B-GOV-ELENCO-ENXUTO), NAO fe2748c8. fe2748c e ancestral (SIM).
    O #381 mergeou DEPOIS do voto. A junta julgou contra fe2748c; o merge cai em 90d30f8a.
M4. Escopo congelado (prisma/ package.json package-lock.json src/infra frontend mobile) = 0 arquivo. CONFIRMADA (C1 item 10).
M5. ci.yml: 8 linhas +, 0 -. CONFIRMADA (nao e deploy => nao dispara 5/5).
M6. Datas dos `pre-existente`:
    - C2 achado2 origem 6f27faae = 2026-06-08 "feat: add cloud cost allocation engine" CONFIRMADA
    - C2 achado3 origem 0648a8e1 = 2026-06-08 "feat: add cloud usage metering foundation" CONFIRMADA
    - C1 achado3 migration 20260611000000 = introduzida em 0648a8e1, 2026-06-08 CONFIRMADA
    Todas ANTERIORES a branch. Nenhum `pre-existente` sem evidencia de data.
M7. C3 achado1 (arquivo B-O6R-07b no diff): 140/0, novo. CONFIRMADA por numstat.
M8. **CONFLITO DE MERGE REAL** — `git merge-tree --write-tree --name-only origin/main 005b522c` ec=1, 5 conflitos de conteudo:
    Kpis/app.js · Kpis/kpis-history.json · Kpis/kpis-history.md · Kpis/kpis-latest.json · agent-orchestration/controle/pendencias.md
M9. **A MINHA SERIE NAO E 0/0.** `git show origin/main:agent-orchestration/omega/juntas/votos/B-GOV-ELENCO/99-cadeira-permanente.md`
    existe e se declara "homologacao no 1": HOMOLOGADO COM RESSALVA (junta B-GOV-ELENCO, REPROVADO 3x0), ja mergeada no #381.
    Serie real ANTES deste parecer: homologadas 1 / anuladas 0.

M10. Reexecucao PROPRIA das 7 suites NOVAS (worktree b06, Node v20.19.5, autocrlf=true,
     cluster descartavel MEU cadeira-perm-b06-pg :59432, prisma migrate deploy ec=0):
       o6r06-usage-atomic-db      15/15 fail0 skip0 ec0
       o6r06-cost-summary-sum-db   6/6  fail0 skip0 ec0
       o6r06-allocation-basis-rls-db 10/10 fail0 skip0 ec0
       o6r06-usage-fault-injection 6/6  fail0 skip0 ec0
       o6r06-usage-atomic          6/6  fail0 skip0 ec0
       o6r06-cost-summary-sum      4/4  fail0 skip0 ec0
       o6r06-billing-census        7/7  fail0 skip0 ec0
       cloud-usage-checklist-reopen 4/4 (modificado, nao novo)
     SOMA DOS 7 NOVOS = 15+6+10+6+6+4+7 = **54**. Delta +54 da C3 REPRODUZIDO por caminho independente.
M11. Fail-open do arnes medido por MIM: sem DATABASE_URL, `o6r06-cost-summary-sum-db` sai
     tests=1 pass=0 skip=1 **ec=0** (SKIP declarado). Logo a alegacao "ZERO skip" da C1/C3 e CARREGADA,
     nao decorativa: sem cluster o verde e vazio.
M12. C1 central por PRESENCA: cloud-usage.capture.ts:191 tem `ON CONFLICT (tenant_id, idempotency_key)
     WHERE idempotency_key IS NOT NULL DO NOTHING`. CONFIRMADA.
M13. C2 central por PRESENCA: `export const CLOUD_COST_ALLOCATION_LINE_ITEM_CAP = 100_000` em
     cloud-cost-allocation-prisma.repository.ts:30. CONFIRMADA. `?? 0`: aws-cur.service.ts:97 e COMENTARIO;
     cloud-cost-allocation.service.ts:150 e inicializador de Map, FORA do diff. CONFIRMADA.
M14. Copia do plano: **UMA SO** (1153 linhas, sha d64ca5ca), EMENDA E1 na l.777. A armadilha 307x847
     NAO se aplica: nao ha segunda copia para a cadeira medir contra plano vencido.
M15. Ordem do §5 (contrato DEPOIS do drill): API_CONTRACTS.md so em c5535470; drills em b5f2f0e9,
     706dbf77, a618bc83 — todos anteriores. CONFIRMADA. **Mas a ata NAO transcreve os dois hashes**,
     que o §5 do plano manda registrar. C3 mediu (evidencia §3(a)); a ata omitiu.
M16. ci.yml: 4 suites acrescentadas (o §6 dizia 3). C3 PEGOU (evidencia l.161-162) e classificou append
     puro. Confirmo: 8 linhas +, 0 -, e a 4a (fault-injection) tem caso que exige banco (3 tests/1 skip sem
     DATABASE_URL, 6 com) — o guard fica MAIS FORTE, como declarado.
M17. **21 arquivos entram no merge que a C3 NAO mediu** (ela ancorou em 0f0a872a): 12 corpos de jurado
     (.claude + .agents, commit e35492ef, POSTERIOR ao head de codigo) + 9 de registro da junta.
     Os 9 estao no §6; os 12 NAO estao na lista fechada. Mesma classe do achado 1 da C3.
M18. Inspetor: veredito real = "LIBERADO COM RESSALVA" (l.350). A ata §2.7 escreve so "LIBERADO".
M19. `00-quedas.md` AUSENTE nesta junta e a ata nao consigna "quedas: 0" (P6 do D-JUNTA-RESILIENTE).
     Quorum aferido por mim CONTANDO IDENTIDADES: 3 votos, 3 identidades distintas. Materialmente integro.
M20. Node publicado por 3/3 cadeiras; `core.autocrlf` publicado por 1/3 (so a C3).
M21. As 3 cadeiras sao identidades NOVAS: corpos criados em e35492ef (2026-09-07); os nomes aparecem
     em NENHUMA outra ata (grep em juntas/J-*.md => so J-B-O6R-06.md). Sem padrao de reincidencia.
M22. Serie do acervo: 97 atas J-*, 34 R-*. "por construcao" citado em 8 atas (padrao ja documentado
     pela auditoria de 28/08, NAO novo). "pre-existente" em 12 atas.
M23. Nenhuma cadeira escreveu "nao consigo medir"/"nao pude medir" e aprovou. Nao ha o caso do item 1.6.

M24. DENOMINADOR ABSOLUTO, reexecutado por MIM (`npm test`, cluster proprio :59432, Node v20.19.5):
     **tests 2992** · pass 2989 · fail 1 · skipped 2 · ec=1.
     - **2992 CONFERE exatamente** com o denominador que a C3 publicou para o head.
     - 2 skips = `permission-catalog-db-parity` x2 (RBAC_DB_PARITY nao ligado) — mesma dupla que a C3 nomeou.
     - **1 falha: `S3' · referencia em BigInt sobre 21 paginas de 500`** em o6r06-cost-summary-sum-db.
       actual 9901010039010001n x expected 9900999999010001n. **Delta = 10.040.000000 EXATO, redondo.**
       Diagnostico pela FORMA do numero (metodo da C3, ata §4): delta inteiro e redondo => LINHAS A MAIS,
       nao deriva aritmetica. Eu havia rodado essa MESMA suite sozinha, antes, NO MESMO BANCO — a referencia
       le 21 paginas de 500 (teto 10.500) e o SUM le TUDO: residuo alem do teto faz actual > expected.
       **E residuo MEU, a mesma armadilha que a C3 documentou.** Repetido em banco PRISTINO: ver M25.

M25. `npm test` em banco PRISTINO (cluster novo :59433, migrate deploy, nenhuma passada anterior):
     **tests 2992 · pass 2987 · fail 3 · skipped 2 · ec=1**. As 3 falhas:
       (1) `cross-tenant: outbox de A nao aparece na varredura de B (RLS)` — impound-outbox.test.ts,
           erro `Transaction API error: Unable to start a transaction in the given time` NO TEARDOWN => pool/tempo
       (2) `S1 · a 10.001a linha ENTRA no total` — **10002 !== 10001**, a MESMA forma que a C3 relatou
       (3) `S3' · referencia em BigInt sobre 21 paginas`
     **Banco novo NAO curou.** Logo o mecanismo NAO e (so) residuo de passada anterior, como a ata §4 conclui.
M26. MECANISMO, provado por documento do proprio repo + execucao:
     - `.github/workflows/ci.yml` (job backend-postgres) diz, textual: *"sentinela que o paralelismo do
       `npm test` polui (varias suites criam papeis)"*. O repo JA SABE que `npm test` roda arquivos em paralelo
       contra UM banco.
     - A suite do bloco assere CONTAGEM GLOBAL (10.001 linhas) e le a referencia em 21 paginas de 500
       (teto 10.500): qualquer outra suite que escreva uma linha na janela produz "exatamente uma a mais".
     - `npm test` COM DATABASE_URL nao e a forma de NENHUM job: o job `backend` roda sem DATABASE_URL
       (as -db auto-pulam) e o `backend-postgres` roda um SUBCONJUNTO curado + guard anti-verde-cego.
M27. **FORMA CANONICA, medida por mim** (schema recriado do zero + migrate; as 4 suites do bloco numa
     invocacao so, como o job backend-postgres faz):
       `node --test --import tsx o6r06-usage-atomic-db + -fault-injection + -cost-summary-sum-db + -allocation-basis-rls-db`
       => **tests 37 · pass 37 · fail 0 · skipped 0 · ec=0**  (37 = 15+6+6+10)
     **As suites do bloco sao VERDES na forma que o CI usa.** O vermelho que eu vi so existe na forma
     `npm test`+DATABASE_URL, que o proprio repo documenta como poluida.
