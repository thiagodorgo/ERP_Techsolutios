# Parecer da cadeira permanente — junta do `B-O6R-06` (`fix/billing-durability`)

**Assento:** `cadeira-permanente-backend-review` · **Head medido:** `005b522c` · head de código `0f0a872a`
(provado por mim) · base que a junta julgou `fe2748c8` · **`origin/main` HOJE: `90d30f8a`** ·
**Veredito da junta:** APROVADO 3×0 · **Quórum:** unanimidade de 3.
**Medições brutas:** `99-medicoes-brutas-b06.md` (ao lado, P1 — apensadas item a item durante a apuração).
**Fronteira:** não julguei a entrega. Julguei o **ato de julgar**. Nada aqui aprova nem reprova o bloco.

---

## VEREDITO: HOMOLOGADO COM RESSALVA
*(linha formal, verbatim, no fim do arquivo)*

---

## 0 · Nota de modelo — obrigatória

Meu frontmatter fixa **`model: fable`** (`D-CADEIRA-PERMANENTE-JUNTA`, 2026-09-07). A **primeira convocação de
hoje caiu antes de medir qualquer coisa**, com **HTTP 429** — cota do Fable esgotada na conta. O próprio
contrato prevê a exceção: *"indisponibilidade do modelo vira nota na ata"*. **Este parecer roda em Opus.**
**Nenhuma medição foi herdada da convocação que caiu** — ela não produziu artefato, comando nem linha de
evidência. Tudo abaixo foi medido nesta convocação, por mim.

**Segunda anomalia, declarada de saída: eu sou retroativa aqui.** A `D-CADEIRA-PERMANENTE-JUNTA` é de
**2026-09-07** e esta junta votou **antes** de a norma existir. O dono determinou por escrito que eu entrasse
**validando o alegado**. Registro para que ninguém leia isto como falha da junta: **não é omissão de ninguém** —
é norma que nasceu depois, e o `inspetor-de-terreno-da-junta` desta junta **não podia** ter bloqueado por falta
de convocação minha.

---

## 1 · Cadeira × voto ganho

| cadeira | executou? | N e forma? | escopo com evidência? | veredito |
|---|---|---|---|---|
| **C1** `jurado-06-banco-atomicidade-rls` | **SIM** — mecanismo provado pelo **SQL que o servidor recebeu** (log_statement=all no cluster dela + `docker logs`), não por leitura de código; 6 suítes com `ec` por variável e contagem lida do TAP; **17 mutações**, 1 hunk cada, todas revertidas e conferidas por hash. **Eu reexecutei 6 das suítes dela** | **SIM** — N por suíte, ec por variável, Node v20.19.5, cluster próprio :57432, junction ausente. *Falta `core.autocrlf`* | **SIM** — 3 `dentro-do-bloco`; o único `pre-existente` datado na migration `20260611000000` (**eu confirmei: `0648a8e1`, 2026-06-08**), com ausência de chamador provada **por presença** | **GANHO** |
| **C2** `jurado-06-invariante-financeiro-rateio` | **SIM** — fixture própria de **N=10.001**; referência em **BigInt de micro-unidades sobre `unblended_cost::text`** em 21 páginas, tolerância **zero**; versão do Prisma pinada **por execução** (`require(...).version` → 7.8.0), não por leitura do `package.json`; spy sobre o cliente real. **Eu reexecutei as 2 suítes de resumo** | **SIM** — N, faixa, forma da referência, tempo (3345 ms), Node v20.19.5, cluster próprio :58432 + redis :58379. *Falta `core.autocrlf`* | **SIM** — 1 `dentro-do-bloco`; 2 `pre-existente` datados (`6f27faae` e `0648a8e1`, ambos **2026-06-08** — **eu confirmei os dois**), anteriores à branch | **GANHO** |
| **C3** `jurado-06-contrato-regressao-kpi` | **SIM** — baseline e head em cluster próprio; ordem contrato×drill medida por `git log`; pegou sozinha o `ci.yml` 3×4; **declarou o próprio erro de método** em vez de reprovar o bloco. **Eu reproduzi o Δ=+54 e o absoluto 2992** | **PARCIAL** — N, banco pristino, Node v20.19.5 **e `core.autocrlf`** (única das três); **mas o `0 fail` é N=1 e a forma omite o paralelismo**, que é a variável que decide o resultado | **SIM** — 4 achados, todos `dentro-do-bloco`, cada um com o comando e a contra-medição | **GANHO, com ressalva de forma** |

**Nenhum voto é prosa.** Os três se ancoram em terreno próprio (worktree detached + `npm ci` próprio + cluster
descartável) e os três provaram o head de código pelo pathspec — refiz e bate (`0f0a872a` ≡ `005b522c` fora de
registro; árvores `bb42086c` e `413a304f`, comparadas por `rev-parse ^{tree}`, **não** por `--is-ancestor`).
**Nenhum herdou afirmação de ata alheia como fato** (ciclo 1; as três declaram re-execução integral do briefing).
**Nenhuma cadeira escreveu "não consigo medir" e aprovou** — o caso do §1.6 não ocorre.

**Denominador:** reproduzi **os dois** números da C3 — o **Δ=+54**, somando as 7 suítes novas uma a uma
(15+6+10+6+6+4+7), **e o absoluto `# tests 2992`**, rodando o `npm test` inteiro no meu cluster.

### 1.1 · O único ponto em que eu NÃO reproduzi a C3 — e o que ele é de fato

A C3 publicou, no head, **`2992 · 2990 pass · 0 fail · ec=0`**. Rodei `npm test` **duas vezes**, em dois
clusters meus: **1 falha** (banco reusado) e **3 falhas** (banco **pristino** — container novo, `migrate
deploy`, nenhuma passada anterior). O **denominador é idêntico** nas duas; o **`0 fail` não reproduz**.

Fui atrás do **mecanismo antes de creditar** qualquer coisa a qualquer lado:

1. A falha central que peguei tem a **forma exata** que a C3 descreve na ata §4: `S1` esperando `10001` e
   recebendo **`10002`** — uma linha a mais. A C3 atribuiu isso a **resíduo da própria passada anterior** e
   concluiu *"em banco novo: zero falhas"*.
2. **Meu banco era novo e a falha veio assim mesmo.** A atribuição da ata está, portanto, **incompleta**.
3. O mecanismo real está escrito **no próprio repositório**, em `.github/workflows/ci.yml`: *"sentinela que o
   paralelismo do `npm test` polui (várias suítes criam papéis)"*. O `npm test` roda os arquivos **em paralelo
   contra um banco só**; a suíte do bloco **assere contagem global** (10.001) e lê a referência em **21 páginas
   de 500** (teto 10.500). Qualquer outra suíte que escreva uma linha na janela produz "exatamente uma a mais"
   — **com banco novo ou velho**.
4. **`npm test` + `DATABASE_URL` não é a forma de nenhum job:** o job `backend` roda **sem** `DATABASE_URL` (as
   `-db` auto-pulam) e o `backend-postgres` roda um **subconjunto curado** com guard anti-verde-cego.
5. **Medi a forma canônica:** schema recriado do zero + `migrate deploy`, as 4 suítes do bloco numa invocação
   só, como o `backend-postgres` faz → **`tests 37 · pass 37 · fail 0 · skipped 0 · ec=0`** (37 = 15+6+6+10).
   **As suítes do bloco são verdes na forma em que o CI as roda.**

**Conclusão, e ela é de forma, não de mérito:** os números que a C3 entrega ao KPI **reproduzem**; as suítes do
bloco **reproduzem verdes** onde o CI as roda. O que não se sustenta **como prova** é o `0 fail` do `npm test`
inteiro: foi **N=1**, numa forma que o repositório documenta como instável, e a **forma publicada** ("cluster
próprio, banco pristino") **omite justamente a variável que decide o resultado** — o paralelismo. É o
`verde-cego` do §1.2 na sua versão mais fina: não um verde sem execução, mas um verde cuja forma não basta para
repeti-lo. **Não desfaz o voto** — desfaria se os números não batessem, e eles batem. **Vira ressalva nomeada**,
porque a lição como está escrita na ata ensinaria a próxima cadeira que **banco novo basta**. Não basta, e eu
provei que não.

### 1.2 · Por que 11 achados e zero `bloqueia` NÃO é carimbo aqui

É a pergunta que me põe nesta cadeira, então respondo com medida, não com impressão:

1. **Os 11 têm comando.** Cada achado nomeia arquivo:linha, mutação ou execução, e a contra-medição. Carimbo
   produz achado sem comando; não há nenhum.
2. **Três dos 11 são contra a própria casa** — a C3 acha contra o registro do bloco (lista do §6 incompleta;
   narrativa 10 × registro 11; pendência-mãe `ABERTA` × `status-geral`) e ainda registra o erro de método dela.
3. **Os `pre-existente` não são fuga.** Os três têm data anterior à branch, **conferida por mim**, e o da C2
   ainda **publica o N do efeito** (4,285714 deslocados entre organizações, 7,5% de storage+jobs) — exatamente
   o que o §C7.1-ter(a) exige e quase nunca se vê.
4. **A falsificação existe.** As 17 mutações da C1 ficaram **todas** ec=1 no alvo, e eu medi que uma `-db` sem
   `DATABASE_URL` sai **verde e vazio** (`tests=1 pass=0 skip=1 ec=0`) — as cadeiras mediram **com** cluster.
   O verde não é cego.

O que eu **não** digo: que nenhum dos 11 deveria bloquear. Isso é mérito, e não é meu. Digo que cada um foi
**medido antes de ser calibrado** — e é isso que separa junta calibrada de carimbo.

---

## 2 · Achado bloqueante × legitimidade

**NÃO SE APLICA — não há veto.** Os três votos são `APROVADO` e os 11 achados são `nota` no JSON. Conferi que
**nenhuma evidência contradiz a própria gravidade**: procurei linguagem de reprovação nas três evidências e a
única ocorrência é a C3 narrando que *teria* reprovado por sujeira própria — e não reprovou. **Sem veto, não há
veto ilegítimo a declarar.**

**A checagem espelhada — reprovação por construção — também não ocorreu, e foi ativamente evitada:** as três
cadeiras **enumeraram por escrito** o que **não** estavam cobrando (o ramo `completed` do script de
reconciliação e a série K, bloqueados pelo crítico em R2-A; `I2` reescrita, R2-B; migration; `mobile/**`; o
piso `≥90`; dependência nova). E medi o risco clássico: **existe UMA só cópia do plano** (1153 linhas,
`d64ca5ca`, com a `EMENDA E1` na l.777) — a armadilha das 307 × 847 linhas não tinha como se repetir aqui.

---

## 3 · Quórum

| | |
|---|---|
| **Exigido pelo risco (§C7.1-ter(b))** | **unanimidade de 3** — o bloco toca **dinheiro** nos dois lados: o total que o painel publica e a base sobre a qual o custo é rateado |
| **É caso de 5/5?** | **Não**, e medi as três condições eu mesma: `package.json`/`package-lock.json` = **0 arquivo** no diff (sem dependência nova); `frontend`/`mobile`/`src/infra` = **0 arquivo**; `ci.yml` = **+8/−0** acrescentando suítes a um job de teste, **não é deploy**; nenhum serviço externo pago |
| **Aplicado** | unanimidade de 3 (3×0) |
| **Bate?** | **SIM.** Nem abaixo nem **acima** — não houve a escalada-por-reprovação que a auditoria de 28/08 mediu |

**Voto perdido:** `00-quedas.md` **não existe** nesta junta e a ata **não consigna "quedas: 0"** (P6 do
`D-JUNTA-RESILIENTE`). **Não aceitei o silêncio:** apurei por **contagem de identidades** — 3 votos, 3
identidades distintas, corpos criados em `e35492ef` (2026-09-07), nenhuma delas em qualquer outra ata.
**Quórum materialmente íntegro**; falta a linha de registro.

---

## 4 · Papéis do §C7.4-bis

**Presentes e nomeados** — a ata §1 traz a tabela dos sete papéis e o §7 responde (a), (b) e (c) por escrito.
Conferi **por nome**, não pela tabela:

- **(a) A composição cobre a competência?** Sim, e verifiquei o que ela alega: C1 mediu **sob os dois papéis**
  de banco (o defeito do canário é **invisível** sob `NOBYPASSRLS` — a RLS recorta e o teste passa **com o
  defeito presente**); C2 trouxe referência aritmética de **família diferente** (BigInt) da do artefato medido;
  C3 reproduziu a baseline que o inspetor não conseguiu.
- **(b) Quem achou é quem consertou?** **Não.** Achado: auditoria Ω6R + `critico-adversarial`. Plano:
  `planejador-mestre`. Código: dev `general-purpose`. Julgamento: três jurados de identidade nova, com corpos
  criados **depois** do código (`e35492ef` posterior a `0f0a872a`). **Cinco papéis, cinco identidades** —
  confirmado por `git log`.
- **(c) O planejador usou dado podre?** **Usou, e foi pego duas vezes antes da primeira linha de código** — a
  invariante `I1` era falsa por construção e o `createMany` fazia o oposto do suposto. As PDs e o crítico
  corrigiram **no plano**, não no conserto. É o §C7.4-bis funcionando como desenhado.

**Sou inelegível para cadeira de mérito neste bloco e não ocupei nenhuma:** não julguei atomicidade, valor,
rateio, contrato nem KPI como mérito. Reexecutei números só para saber se os votos os ganharam.

---

## 5 · Série entre juntas — o que só esta cadeira vê

Acervo medido: **97 atas `J-*`** e **34 `R-*`**.

**Padrões que eu procurava e NÃO encontrei nesta junta:**
- *Cadeira que já votou sem executar, mais de uma vez* — **não se aplica**: as três identidades nasceram em
  `e35492ef` (2026-09-07) e o `grep` nas 97 atas devolve **só** `J-B-O6R-06.md`. Sem histórico, sem reincidência.
- *`pre-existente` sem evidência, em blocos diferentes* — 12 atas citam `pre-existente`; nesta, os **três**
  carregam data e eu reconferi os **três** por `git log`. **Nenhuma instância nova.**
- *Plano cobrado além do que escreveu* — 8 atas já citam "por construção", padrão **já documentado** pela
  auditoria de 28/08, **não novo**. Aqui as cadeiras enumeraram o que não cobravam. **Sem instância nova.**

**UM padrão novo, com duas instâncias medidas neste bloco e uma anterior — e eu o nomeio como padrão pela
primeira vez:**

> **A lista fechada do §6 nunca enumera os artefatos que a própria junta produz.**
> **Instância 1** — o achado 1 da C3: `votos/B-O6R-07b/05-porteiro-pos-merge-fe2748c.md` (140/0) entra no diff
> e o §6 não o previa, **embora o §C2.8 o exija para o bloco poder começar**.
> **Instância 2 (minha, que ninguém podia ter visto)** — **12 corpos de jurado**
> (`.claude/agents/especialistas/jurado-06-*` e o espelho `.agents/`) entram no merge e **não estão** na lista
> do §6. São **estruturalmente invisíveis à C3**, que ancorou em `0f0a872a`: os corpos nasceram em `e35492ef`,
> **depois** do head de código.
> **Instância anterior** — o #381 (`B-GOV-ELENCO-ENXUTO`) carregou corpos de jurado pelo mesmo caminho.
> **Não é defeito de cadeira nenhuma. É defeito do molde de plano** — e por isso reaparece a cada bloco.

**A minha própria pendência anterior, cobrada:** na homologação nº 1 deixei escrito *"próximos votos publicam
versão do Node e autocrlf"*. Medi: **Node — fechada, 3/3**. **`core.autocrlf` — 1/3** (só a C3). **Fechamento
parcial**, e volto a nomeá-la. É exatamente por isso que a cadeira é permanente: uma cadeira descartável não
teria como cobrar a dívida que ela própria deixou.

---

## 6 · A minha série — e a correção que ela obriga

O despacho me informou **`homologadas 0 / anuladas 0`** e disse que esta seria a minha **primeira**
homologação. **Medi, e não é.** Existe em `origin/main`, mergeado pelo **#381**:

`agent-orchestration/omega/juntas/votos/B-GOV-ELENCO/99-cadeira-permanente.md` — auto-declarada
**"homologação nº 1"**, veredito **`HOMOLOGADO COM RESSALVA`** sobre a junta do `B-GOV-ELENCO` (que havia
**REPROVADO 3×0**).

| | antes deste parecer | depois deste parecer |
|---|---|---|
| **Homologadas** | **1** (com ressalva) | **2** |
| **Anuladas** | **0** | **0** |

**Registro a assimetria enquanto ela ainda é pequena:** 2 de 2 homologadas, 0 anuladas. Duas juntas não fazem
tendência e **não vou fabricar uma**. Mas é esta linha que faz carimbo aparecer na série **antes** de aparecer
no dano, e ela só significa alguma coisa se for publicada **inclusive quando é favorável**. Deixo o
contraditório explícito para o `porteiro-pos-merge`: das duas juntas que homologuei, **uma havia reprovado e a
outra aprovou** — não estou correlacionada com o lado do veredito, e sim com a existência de execução. Se a
terceira também sair homologada, a pergunta vira legítima, e quem deve fazê-la é o porteiro.

**Correção de registro obrigatória:** o briefing da próxima junta **não pode repetir `0/0`**. A série é do
**assento**, não da instância.

---

## 7 · Pendências que eu abro (nenhuma é voto meu)

**Defeito de produto que eu tenha visto e não seja das cadeiras: NENHUM.**

| # | pendência | gravidade | bloco dono |
|---|---|---|---|
| **1** | **`origin/main` moveu depois do voto e o merge CONFLITA.** A junta ganhou o veredito contra `fe2748c8`; `origin/main` é hoje **`90d30f8a`** (#381, mergeado **depois** do voto). `git merge-tree --write-tree origin/main 005b522c` → **ec=1, 5 conflitos de conteúdo**: `Kpis/app.js`, `Kpis/kpis-history.json`, `Kpis/kpis-history.md`, `Kpis/kpis-latest.json`, `agent-orchestration/controle/pendencias.md`. Quem resolver estará **autorando conteúdo de KPI que cadeira nenhuma validou** — e o §C3.0 faz do painel a **entrega**. | **ALTA** | o próprio merge do `B-O6R-06`; conferência do `porteiro-pos-merge` |
| **2** | **Publicar a forma que reproduz o verde.** O `0 fail` do `npm test` é N=1 e não reproduziu comigo (2 tentativas, 1 e 3 falhas, banco pristino inclusive). A forma canônica das `-db` é o subconjunto do `backend-postgres` (medi: **37/37, ec=0**). **A lição da ata §4 deve ser corrigida:** o mecanismo não é (só) resíduo — é **paralelismo do `npm test` contra um banco só**, e **banco novo não cura**. | **ALTA** | fechamento desta ata + próximas medições de KPI |
| **3** | **12 corpos de jurado fora da lista fechada do §6** (`.claude/agents/especialistas/jurado-06-*` + espelho `.agents/`), estruturalmente invisíveis à C3. Append puro, zero produto. **Classe recorrente** (§5) — o remédio é o molde de plano, não este bloco. | MÉDIA | molde de plano / próximo bloco de governança |
| **4** | **A minha série estava errada no despacho** (`0/0` × real `1/0`). Corrigir no briefing da próxima junta. | MÉDIA | orquestrador |
| **5** | **A ata não transcreve os dois hashes que o §5 do plano manda registrar** (`API_CONTRACTS.md` × drill). A **ordem está correta** — a C3 mediu e eu confirmei (`c5535470` depois de `b5f2f0e9`/`706dbf77`/`a618bc83`) —, falta a transcrição. | BAIXA | fechamento desta ata |
| **6** | **A ata escreve "LIBERADO" onde o inspetor escreveu "LIBERADO COM RESSALVA"** (§2.7 × parecer l.350). As ressalvas eram erros de briefing já corrigidos (`416a5687`); ainda assim, **ata não encurta veredito de gate**. | BAIXA | fechamento desta ata |
| **7** | **`00-quedas.md` ausente e a ata sem a linha "quedas: 0"** (P6). Apurei o quórum por contagem de identidades; o registro não fecha sozinho. | BAIXA | fechamento desta ata |
| **8** | **`core.autocrlf` publicado por 1 das 3 cadeiras** — reincidência parcial da minha pendência nº 8 da homologação nº 1. Node fechou (3/3). | BAIXA | próximas juntas |

**Reclassificações de achado: NENHUMA.** Os 3 `pre-existente` foram declarados **com** evidência de data e eu
confirmei os 3 — não há o caso do §C7.1-ter(a) (escopo sem evidência vira `dentro-do-bloco`). Os 8
`dentro-do-bloco` permanecem como estão: são `nota`, e recalibrar gravidade de achado provado seria julgar
mérito.

---

## 8 · Verificações que eu executei (N=1 salvo onde indicado)

**Terreno meu:** worktree `b06` (só leitura de git e execução de teste), **clusters descartáveis próprios**
(`cadeira-perm-b06-pg` :59432 e `cadeira-perm-b06-pg2` :59433, `postgres:16-alpine`, `migrate deploy` ec=0),
Node **v20.19.5**, `core.autocrlf=true`. **A base viva `erp-postgres`/`erp-redis` não recebeu um comando, nem
de leitura.** Árvore principal e os worktrees `gov-descuido`/`gov-elenco` **não tocados**.

**Git (leitura):** `git diff --numstat 0f0a872a 005b522c` com o pathspec da ata → **vazio** · árvores por
`rev-parse ^{tree}` (**não** por `--is-ancestor`, que mente sob squash) · `merge-base` → `fe2748c8` ·
`rev-parse origin/main` → **`90d30f8a`** · `git log fe2748c..origin/main` → 1 commit (#381) · escopo congelado
por `--numstat` **com caminho** (nunca `rev-parse <rev>:<path>`, que falha em silêncio) → 0 arquivo ·
`git log -1` de `6f27faae`, `0648a8e1` e da migration `20260611000000` → **2026-06-08** nos três · `git log` de
`API_CONTRACTS.md` × drills → ordem correta · `git merge-tree --write-tree --name-only origin/main 005b522c` →
**ec=1, 5 conflitos** · `--name-only` do merge completo × do head de código → **21 arquivos a mais**, 12 deles
corpos de jurado.

**Execução (reexecução dos votos):**
- **Sem banco:** `o6r06-usage-atomic` 6/6 · `o6r06-cost-summary-sum` 4/4 · `o6r06-billing-census` 7/7 ·
  `cloud-usage-checklist-reopen` 4/4 — ec=0, zero skip.
- **No meu cluster:** `o6r06-usage-atomic-db` 15/15 · `o6r06-cost-summary-sum-db` 6/6 ·
  `o6r06-allocation-basis-rls-db` 10/10 · `o6r06-usage-fault-injection` 6/6 — ec=0, zero skip.
  **Soma das 7 novas = 54 = o Δ que a C3 publicou.**
- **Fail-open do arnês, medido:** `o6r06-cost-summary-sum-db` **sem** `DATABASE_URL` → `tests=1 pass=0 skip=1
  ec=0`. É o que torna a alegação "zero skip" das cadeiras **carregada**, e não decorativa.
- **`npm test` completo, N=2:** banco reusado → `2992 · 2989 · fail 1`; banco **pristino** → `2992 · 2987 ·
  fail 3 · skip 2`. **Denominador 2992 nas duas.**
- **Forma canônica do `backend-postgres`** (schema recriado + as 4 suítes numa invocação) → **37/37, ec=0**.

**Por presença (nunca por ausência de grep):** `ON CONFLICT (tenant_id, idempotency_key) WHERE ... DO NOTHING`
em `cloud-usage.capture.ts:191` · `export const CLOUD_COST_ALLOCATION_LINE_ITEM_CAP = 100_000` em
`cloud-cost-allocation-prisma.repository.ts:30` · as ocorrências de `?? 0` no caminho do total (uma é
comentário, a outra é inicializador de `Map` **fora** do diff) · cópia **única** do plano (1153 linhas,
`d64ca5ca`, `EMENDA E1` na l.777) · corpos das 3 cadeiras criados em `e35492ef` e presentes em **nenhuma**
outra ata.

**Limpeza (§C5), executada e conferida:** ambos os containers removidos · volumes dangling **0** · os **25
diretórios** que as minhas execuções criaram em `storage/checklist-attachments/` removidos, com o `.gitkeep`
**rastreado** intacto · `git status --porcelain --ignored` de volta a exatamente `node_modules/` e
`frontend/node_modules/`, como eu encontrei · `git worktree list` inalterado (4). **Não gravei nada no
repositório.**

**O que eu NÃO executei, dito explicitamente:**
- **Não rodei a baseline `2938`** em `fe2748c` (exigiria `npm ci` e cluster de uma segunda árvore). Aferi o Δ
  pelo **caminho por arquivo** e o absoluto **do head**; a baseline segue com as duas fontes da ata (dev e C3).
- **Não reexecutei as 17 mutações da C1** nem a fixture de 10.001 linhas da C2 — reexecutei as **suítes** que
  elas sustentam e as afirmações centrais **por presença**.
- **Não julguei** atomicidade, valor, rateio, contrato nem KPI **como mérito**.
- **Não li voto a voto** as 97 atas do acervo; a série do §5 é por presença de nome e por classe de achado.

---

HOMOLOGADO COM RESSALVA: APROVADO 3×0 vale — os três votos foram GANHOS (execução registrada, N e forma publicados, escopo com evidência de data que eu reconferi nos três `pre-existente`), não há veto a examinar, e o quórum aplicado é o do risco (unanimidade de 3, com as três condições de 5/5 medidas por mim como ausentes) | a fechar: (1) **ALTA** — `origin/main` moveu para `90d30f8a` (#381) **depois** do voto e o merge conflita em 5 arquivos (4 de `Kpis/` + `pendencias.md`); a resolução autora conteúdo de KPI que cadeira nenhuma validou, e os números têm de ser re-derivados na base nova antes de o painel mergear; (2) **ALTA** — publicar a forma que reproduz o verde e corrigir a lição da ata §4: o `0 fail` do `npm test` é N=1, não reproduziu comigo em 2 tentativas (banco pristino inclusive), e o mecanismo não é resíduo — é o paralelismo do `npm test` contra um banco só, que banco novo não cura; na forma canônica do `backend-postgres` as suítes do bloco são 37/37 ec=0; (3) 12 corpos de jurado entram no merge fora da lista fechada do §6 — classe recorrente, dono é o molde de plano; (4) a minha série é 1 homologada / 0 anuladas, não 0/0 — corrigir no próximo briefing; (5) ata sem os dois hashes que o §5 do plano manda registrar; (6) ata escreve "LIBERADO" onde o inspetor escreveu "LIBERADO COM RESSALVA"; (7) sem `00-quedas.md` nem linha "quedas: 0" — apurei o quórum contando identidades; (8) `core.autocrlf` publicado por 1 das 3 cadeiras, reincidência parcial da minha pendência nº 8.
