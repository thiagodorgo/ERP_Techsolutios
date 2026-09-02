# BRIEFING DA JUNTA — SAN2-2 (guard do espelho + lista de suítes do CI + contrato canônico)

> **Bloco:** SAN2-2 · **Branch:** `fix/san2-2-guard-espelho-ci` · **Base:** `main`
> **Plano:** `agent-orchestration/omega/planos/SAN2-2-plano.md` — este briefing **implementa o §8**
> (l.357–453). Onde o §8 for omisso, está dito no texto que é omisso; nada aqui reinventa o desenho.
> **Diários com a evidência:** `agent-orchestration/omega/juntas/votos/SAN2-2/`
> **Commits:** `a3afdb1` (trilha do gate) · `db2d291` (F1) · `02ced85` (F2) · `2e4985b` (F3) · `12ff986` (F4)
> **Fase 4 commitada em `12ff986`** (o marcador `<FASE-4>` do rascunho foi substituído pelo hash real
> antes da liberação da inspeção de terreno).

---

## 1. O que o bloco entrega, fase a fase (números medidos)

Todos os números abaixo vêm de **execução registrada nos diários** de
`agent-orchestration/omega/juntas/votos/SAN2-2/`, com comando e saída. Nenhum é herdado de ata anterior.
A junta trata cada um como **afirmação a re-verificar**, não como fato — é essa a regra que as cadeiras
do §3 aplicam.

### F1 — O guard do espelho parou de mentir (commit `db2d291`, diário `dev-fase1-log.md`)

O defeito de origem (`P-REG-S0-GUARD-FALSO-VERMELHO`, achado pelo inspetor do B-O6R-REG): sob
`core.autocrlf=true` e **sem `.gitattributes`**, o checkout materializa CRLF nas duas pontas, os blobs são
LF, e o `--check` do `scripts/sync-agent-agents.mjs` acusava **os 22 papéis** como divergentes. Como a fatia
S0 do §C7.1-bis é justamente esse `--check` num checkout fresco, o gate fail-closed de toda junta futura
reprovava sempre — e um vermelho que sempre acende não informa nada.

- **Conserto (§3.1a):** 1 hunk em `scripts/sync-agent-agents.mjs`, **7 inserções / 1 remoção**, dentro de
  `if (CHECK)` — normalização `
 → 
` **só do alvo da comparação**. Script na branch: sha1
  `afb94f1ed97c`; na `main`: blob `4b5d32c07c92`.
- **Teste permanente novo:** `tests/agents-mirror-guard.test.ts` — **12 casos** (o §3.1b pedia ≥6),
  `12 pass · 0 fail · 0 skipped`. Cada caso monta árvore sintética em `os.tmpdir()` e **copia o script REAL
  em runtime** (nunca snapshot embutido — é a defesa contra o risco (g) do §7); teardown escopado em
  `finally`. Blocos: B1 falso-vermelho morto (3 casos), B2 o guard ainda morde (5), B3 a normalização é eol e
  **só** eol (3), B4 `model: fable` preservada no espelho (`D-PLANEJADOR-MODELO-FABLE`).
- **Drill A (par antes/depois, worktree fresco, mesma máquina e mesmo `core.autocrlf=true`):**
  **22 DIVERGE → 0**, `exit 1 → exit 0`, `FALTA=0`, `SOBRA=0` nas duas pontas. A única variável entre as duas
  medições foi o script. Se houvesse um drift de conteúdo real escondido entre os 22, ele sobreviveria à
  normalização e apareceria no DEPOIS — apareceram **zero**.
- **Drill B (o guard ainda morde):** o mandato pedia 4 mutações; foram executadas **8 mutações, 8 vermelhas**,
  na **árvore real de 22 papéis** com o **script real** — V1 `DIVERGE` (1 byte no espelho) · V2 `FALTA`
  (arquivo removido) · V3 `SOBRA` (arquivo a mais, fora do KEEP) · V4a/V4b/V4c **não-eol** (espaço no fim de
  linha na fonte, caixa trocada, linha em branco a mais) · V5 `model:` arrancado. **Zero mutações verdes**;
  cada vermelho nomeia **um** arquivo e deixa os outros 21 em paz; os três rótulos seguem distintos; o
  `README.md` continua KEEP. A insensibilidade comprada é exatamente `
` vs `
`, nada mais.
- **Divergência de número registrada, não maquiada:** o §6 Fase 1 do plano esperava **23 agentes**
  (22 + inspetor); na Fase 1 isolada a árvore tem **22**, porque o inspetor só nasce no §3.3.3, que é da
  Fase 3. O esperado do plano vale para o **head do PR**; para a fatia isolada, 22 é o número honesto.

### F2 — Quatro suítes de banco entram na lista curada do CI (commit `02ced85`, diário `dev-fase2-log.md`)

Classe do defeito, **medida por execução e não citada de ata**: as 4 suítes rodavam fora da lista `SUITES` do
job `backend-postgres`; sem `DATABASE_URL` elas **não falham — pulam**, `exit 0`, e os **22 casos viram 4
pulos** com o job verde. Verde-cego puro: perda de sinal de teste = perda do dado de medição.

- **Elegibilidade pelo §3.2b — 3 execuções × 0 falha × 0 pulo**, em Postgres/Redis **descartáveis** próprios
  (`san2-2-pg` / `san2-2-redis`), com a env exata do job (`ci.yml` l.108–120). Denominador **constante nas
  três rodadas, caso a caso**: `impound-custody-history-db` 3/3 · `vehicle-identity-merge-db` 5/5 ·
  `work-order-checklists-freeze-links-db` 6/6 · `work-order-checklists-sticky-db` 8/8 = **22 casos**.
  Zero intermitência observada. A rodada 2 e a 3 correram **sobre o estado que a anterior deixou** — o
  cenário mais hostil para dependência de banco virgem.
- **Prova de que a escrita bateu no descartável:** `pg_stat_user_tables` do `san2-2-pg` mostra inserts
  cumulativos reais nas 4 tabelas de negócio e `count(*)` de volta a zero (teardown das suítes;
  `tenants=1` é o do seed). A não-reconciliação 1:1 de `inserts − deletes` com `count(*)` foi **registrada
  como divergência**, não escondida: o contador é cumulativo e aproximado.
- **Efeito no `ci.yml`:** lista **23 → 27** suítes, sem duplicata, +22 casos sob o guard de zero pulos
  (l.204–209, **intocado** — `git diff` de linhas com `skipped|pulad` sai vazio). YAML revalidado (7 jobs).
- **Âncora do plano estava errada e a correção do crítico se confirmou:** o §3.2 mandava inserir "após a
  l.202" (meio do bloco de auth); o bloco `SUITES=` termina na **l.207**, e foi lá que a inserção entrou.
- **Proveniência declarada:** o `dev-san2-2` caiu (`server_error`) **depois** de editar o `ci.yml` e antes de
  registrar; o diff é dele, e o registro das medições sobre o resultado é do orquestrador. Isso **não** é
  verificação de mérito — a cadeira **C2** reexecuta por conta própria.
- **Achado de terreno, virou pendência:** `P-SAN2-2-PORTA-55432-RESERVADA` (BAIXA, escopo `pre-existente`).
  A porta 55432 do plano cai na faixa 55353–55452 reservada pelo Windows/Hyper-V nesta máquina; o par subiu
  em **56432/56379**. Nada no produto nem no CI depende disso (o job usa 5432 em service containers).

---

## 2. Quórum: UNANIMIDADE de 4

**Decidido no §8.1 do plano, não em aberto: UNANIMIDADE. Aqui são 4 cadeiras — logo, 4×0.**

A régua é o §C7.1-ter-b: unanimidade de 3 quando o bloco toca **dinheiro, segurança, permissão ou perda
de dado**; maioria de 3 no resto; unanimidade de 5 só para as decisões críticas do §C7.1 (produção,
dependência nova, serviço externo pago) — que **não** é o caso aqui.

**O contra-argumento honesto, registrado e não escondido** (o §8.1 o escreve; este briefing o repete
porque a junta tem de julgá-lo, não recebê-lo pronto): pela letra estrita da régua, este bloco cairia em
**maioria**. Ele **não toca `src/**` nem dado de cliente**, não move dinheiro, não altera permissão de
usuário e não pode perder registro de ninguém; e cada uma das três correções reverte com ~1 linha
(§7a/b/c do plano). Um jurado que queira sustentar "maioria bastava" tem base textual para isso, e a ata
deve registrar se algum sustentar.

**Por que ele perde — três fatos, na ordem do §8.1:**

1. O bloco **reescreve o gate fail-closed S0 de toda junta futura**. Defeito aqui não é bug de produto: é
   **gate que mente**. E o modo de falha é **silencioso** — um falso-verde não acende vermelho em lugar
   nenhum depois; a detecção vive **só nesta junta**.
2. Altera o **contrato canônico** (`CLAUDE.md`/`AGENTS.md`), que define o que todo agente tem permissão de
   fazer. O risco (d) do plano é reabrir **em silêncio** um protocolo revogado — e "revert de 1 linha" não
   vale nada para contaminação que ninguém detecta, porque ninguém vai saber que precisa reverter.
3. Mexe na **lista curada do CI**, cujo modo de falha é exatamente **verde-cego**: perda do sinal de teste
   = perda do dado de medição (foi o que a F2 mediu — 22 casos virando 4 pulos com `exit 0`).

As categorias do 1-ter leem-se **pelo raio de estrago da falha silenciosa**, não pelo diretório tocado.
Aqui o raio é **todas as juntas e todos os merges futuros**. Daí UNANIMIDADE.

**O custo em atrito está limitado por dois freios já escritos**, e a junta deve usá-los:
- **`D-TETO-DOIS-CICLOS`** (§C7.4, 2026-08-29): máximo **2 ciclos** antes de dossiê ao dono. Não há ciclo 3.
- **§C7.1-ter-a**: achado **`pre-existente` com evidência NÃO reprova** — vira **pendência nomeada com bloco
  dono**, e o número afetado é publicado com **N, forma e causa**. Escopo declarado **sem** evidência de data
  ou origem é tratado como `dentro-do-bloco`.

**Aritmética do veredito:** 4 votos, todos com veto (§3). `APROVADO` exige **4 × APROVADO**. Um único
`REPROVADO` com escopo `dentro-do-bloco` e gravidade `bloqueia` reprova o bloco e abre o ciclo 2 — que é o
último. `REPROVADO` cujo achado seja `pre-existente` **com evidência** não reprova: vira pendência.
"Não consigo medir" = **REPROVADO** (não é abstenção; abstenção não existe nesta junta).

---

## 3. As 4 cadeiras — o que cada uma julga e o que reexecuta sozinha

Composição do §8.2: **4 cadeiras votantes, todas com veto**. O piso do §C7.1-ter-b é 3; o bloco exige 4
competências distintas, e **fundir duas cadeiras para fechar a aritmética em 3 seria teatro de quórum** —
unanimidade de 4 é mais estrita que o piso, nunca menos. **Sem cadeira de `critico-adversarial`:** não é
bloco de invariante financeiro (§C7.1-ter-b).

**Identidades: todas NOVAS e efêmeras.** Especificação de cada cadeira e votos em
`agent-orchestration/omega/juntas/votos/SAN2-2/`. **Nenhum arquivo novo em `.claude/agents/`** — o §5 do
plano só permite o inspetor; jurado não vira agente versionado neste bloco.

**Duas regras valem para as quatro, sem exceção:**

- **Nenhuma aceita saída de terceiro.** Todo número deste briefing — inclusive os da seção 1 — é
  **afirmação a re-verificar**, não fato. Diário do dev, log do orquestrador e ata anterior são *pistas de
  onde olhar*, nunca evidência. Conclusão sem comando registrado **não é insumo** (`D-JUNTA-RESILIENTE`).
- **Todo voto declara `gravidade` E `escopo` com evidência** (§C7.1-ter-a). `escopo` ∈
  {`dentro-do-bloco`, `pre-existente`}, e `pre-existente` exige **evidência de data ou origem** (data do
  arquivo, blob, commit que introduziu). **Escopo sem evidência é tratado como `dentro-do-bloco`.**

---

### C1 — `provador-de-mutacao-do-espelho` (veto: sim)

**Julga:** o **item 1 inteiro** — a normalização do §3.1a é **eol-neutra e SÓ eol** (risco (a) do plano);
o teste permanente `tests/agents-mirror-guard.test.ts` tem **≥6 casos e 0 skip** (a entrega afirma 12),
incluindo o caso `model: fable` preservada no espelho — a regra de `D-PLANEJADOR-MODELO-FABLE` não pode
sofrer drift; e o **risco (g)**: o teste roda a **cópia** e o passo do CI roda o **original**, e as duas
pontas se cobrem.

**Reexecuta sozinha, do zero:**
1. **Drill A** — worktree **fresco próprio**, mesma máquina, `core.autocrlf=true`, par **antes/depois**
   (script da `main` × script da branch), medindo `DIVERGE`/`FALTA`/`SOBRA` e o exit code nas duas pontas.
   A afirmação a bater é 22 DIVERGE → 0, `exit 1 → exit 0`. **Se houvesse drift de conteúdo real entre os
   22, ele sobreviveria à normalização e apareceria no DEPOIS** — é esse o teste, não o número.
2. **Drill B** — o mandato do §8.2 pede **4 mutações → 4 vermelhas com o rótulo certo**; a entrega afirma
   **8 mutações → 8 vermelhas**. A C1 **executa as suas**, na **árvore real de 22 papéis** com o **script
   real**: piso de 4, e as 8 da entrega só contam se ela mesma as reproduzir. Verifica que cada vermelho
   **nomeia um** arquivo e deixa os outros em paz, que os três rótulos seguem **distintos**, e que o
   `README.md` continua KEEP.
3. **O teste permanente**, executado por ela — contando casos e skips na saída real, e confirmando que o
   arquivo **lê o script em runtime** e não um snapshot embutido.

**É esta cadeira, e só ela, que prova o mérito do item 1** — não o `LIBERADO` do inspetor (§5).

### C2 — `curador-da-lista-suites-ci` (veto: sim)

**Julga:** o **item 2** — o passo novo do `--check` no job `backend` **sem `continue-on-error` e sem exit
code engolido** (§7b: recuo assim é **PROIBIDO**); as **4 linhas novas** da lista `SUITES`; que a suíte do
financeiro **NÃO** entrou, com comentário-reserva no `ci.yml` e dono reatribuído na pendência (§3.2a); o
**guard de zero pulos** (l.204–209) **intacto**.

**Reexecuta sozinha:**
1. As **3 execuções × 0 falha × 0 pulo** das 4 suítes, em **Postgres/Redis descartáveis próprios** (não os
   do dev, não `erp-postgres`/`erp-redis`), com a env exata do job. **Denominador constante nas três
   rodadas, caso a caso** — risco (c): **intermitência local desqualifica a linha**, e denominador que
   varia entre execuções é achado, não ruído.
2. O **TAP do job `backend-postgres` do próprio PR**: 27 suítes, `testes pulados: 0`.
3. A **régua da contagem** da lista — ver §6: contar por `grep -cE '^\s*SUITES='` (23→27), **nunca** por
   `grep -c "test.ts"` (24→29, número errado publicado).
4. A **âncora**: a inserção entrou no fim do bloco `SUITES=` (l.207), não "após a l.202" como o §3.2 dizia.

**Proveniência que obriga esta cadeira:** o `dev-san2-2` caiu (`server_error`) **depois** de editar o
`ci.yml` e **antes** de registrar; o diff é dele, e o registro das medições é do orquestrador. Isso **não
é verificação de mérito** — por isso a C2 mede por conta própria, do zero.

### C3 — `zelador-do-contrato-canonico` (veto: sim)

**Julga:** o **item 3** — e o §7d do plano **já nomeia esta cadeira**: ela **não aceita afirmação**.

**Reexecuta sozinha as 3 camadas do §7d:**
1. **Inserção pura** — 0 linhas removidas no diff do contrato.
2. **Marcadores do §C7.4 antigo** com **contagem idêntica à da `main` pré-PR** (o discriminador correto
   está no §6: `ciclo 5 falho`, **nunca** "ciclos 4–5").
3. **Extração por faixa fechada** do trecho alterado.

**E mais, por execução própria:** paridade dos fragmentos **CLAUDE × AGENTS** (`D-INTEROP-CLAUDE-CODEX` —
diferença permitida **só** quando estritamente de ferramenta, e listada na ata); **inspetor verbatim**
(diff vazio contra o blob da demo, com `MSYS_NO_PATHCONV=1`); **nada mais da demo no diff** (nem
`especialistas/`); as **3 pendências no estado certo** (FECHADA / FECHADA / **ABERTA-reatribuída**); e o
**índice regenerado pelo script, não digitado**.

**Armadilha de medição desta cadeira (§6):** `md5sum` e `git status` **fabricam divergência** sob
`core.autocrlf=true`. Medir eol-neutro — ou a cadeira inventa o mesmo achado falso que o bloco conserta.

### C4 — `auditor-do-kpi-honesto` (veto: sim)

**Julga:** as **ressalvas do porteiro no KPI** — backfill do **#362** (`merge_commit 87f6ae6`,
`approved_head 4cd0867`, nota dos +2 commits pós-voto); a **entrada SAN2-2 com contagens de EXECUÇÃO
REAL**; `kpi-freeze.mjs` rodado + `--check` `exit 0`; guard `tests/kpi-dashboard-charts.test.ts` verde;
trilhas **não tocadas** carregando o último valor oficial **com nota explícita** (§C3.3).

**Reexecuta sozinha:** **reconta do TAP da Fase 5** — **não aceita número copiado**. O piso é **≥2601 com
delta explicado**, e os **2 não-pass do baseline têm de ser OS MESMOS** (mesmos nomes, não só mesma
contagem). Roda o `--check` do freeze e o guard do painel ela mesma. `mvp_demo`/`mvp_vendavel` só se movem
se o PR **mover escopo** (§C3.4) — este não move.

---

**Dev do bloco (§C7.4-bis, prometido no cabeçalho do plano):** identidade nova **`dev-san2-2`** —
implementa o §3, **não achou nada do §2, não planejou e não vota**. A separação dos três papéis (quem
acha ≠ quem planeja ≠ quem desenvolve) está registrada e é conferível na ata.

---

## 4. Inelegibilidades (§8.3, por nome)

Base: **§C7.4-bis** (quem acha não conserta e não julga o próprio achado) + **pool queimado**. O
`inspetor-de-terreno-da-junta` **confere esta lista por nome antes do `LIBERADO`** (§C7.1-bis) — não é
declaração de boa-fé, é item de checklist com nome próprio.

1. **`inspetor-de-terreno-da-junta`, na instância do B-O6R-REG (R1).** Achou o item 1
   (`P-REG-S0-GUARD-FALSO-VERMELHO`). **Não ocupa cadeira de mérito**; e o papel de terreno **desta** junta
   exige **instância NOVA** (§5 / §8.4) — a do REG não serve nem para o terreno.
2. **Orquestrador da sessão.** Confirmou o item 1 **por execução** (§2.4 do plano) e registrou as medições
   da F2 sobre o resultado do dev caído. É **revisor de ações sinalizadas, não jurado**.
3. **`planejador-mestre` (o agente que escreveu o plano deste bloco).** Planejou o bloco (§C7.4-bis) **e**
   re-reproduziu o item 1 (§2.1): **duplamente contaminado** — é achador e planejador ao mesmo tempo.
4. **Quem assinou a validação A5 e quem operou o arnês #6 do `B-O6R-02`.** Acharam o item 2. **Qualquer
   identidade que tenha assinado esses dois artefatos está fora**, mesmo que sob outro nome de cadeira.
5. **O condutor do gate do #362** e o **`porteiro-pos-merge` do #362.** Acharam/confirmaram o item 3; o
   porteiro, além disso, **emitiu o `LIBERADO COM RESSALVA` que este bloco quita** — julgaria as próprias
   ressalvas. É exatamente a C4 que revisa o trabalho dele, e por isso ele não pode ser a C4.
6. **`dev-san2-2`.** **Desenvolve, não julga** (§C7.4-bis). Nem como suplente, nem como consultor de
   cadeira.
7. **Pool queimado (regra geral).** **Nenhuma** identidade que votou nas juntas do **`B-O6R-02`** (as **16
   inelegíveis** + os **14 especialistas criados lá**), do **`B-O6R-REG`**, do **`B-O6R-ARNES`**, do
   **`SAN2-R`** ou do **`SAN2-1R`** senta cadeira aqui. As **4 cadeiras do §3 nascem novas para este
   bloco**.

**Substituição de jurado caído (plano de perda declarado, §8.4.4):** cadeira perdida no meio do ciclo →
**`agente-fabrica` cria substituto NOVO com a mesma especificação da cadeira**, e o substituto **herda o
roteiro de evidência registrado, nunca a conclusão** (`D-JUNTA-RESILIENTE`). **Voto não se herda.** O
substituto entra sujeito a esta mesma lista de 7.

---

## 5. Bootstrap do inspetor de terreno (§8.4) e anti-circularidade

**O problema, em uma frase:** o §C7.1-bis exige o inspetor **ANTES** da junta; a `main` **não o tem**
(§2.3 do plano) — **mas o HEAD DO PR tem**, porque o transporte do §3.3.3 faz parte do **diff que esta
junta julga**. O instrumento do gate **nasce dentro do próprio bloco que ele vai liberar**. A resolução do
§8.4 preserva o fail-closed inteiro:

**1. Instância NOVA, instanciada do arquivo do HEAD DO PR.** Não da demo diretamente; **não** da instância
inelegível do B-O6R-REG (§4, item 1).
> **Pré-condição de validade:** diff **vazio** entre o arquivo do head e o blob
> `demo/investidor:.claude/agents/inspetor-de-terreno-da-junta.md` — a **mesma prova da Fase 3** —, com o
> **hash consignado na ata**. **Divergência = inspeção inválida = a junta não começa.**
> Medir com `MSYS_NO_PATHCONV=1` e de forma **eol-neutra** (§6): `md5sum`/`git status` fabricam
> divergência sob `core.autocrlf=true`, e um falso positivo aqui **trava a junta por nada**.

**2. A fatia S0 que ele executa usa o script JÁ CORRIGIDO, no arranjo que hoje mente** — checkout fresco
sob `core.autocrlf=true`. **E é esse o ponto do bloco:** a primeira junta a se beneficiar do conserto é a
dele mesma. **`exit ≠ 0` → sem `LIBERADO` → volta ao dev, sem voto.** **O fail-closed não ganha exceção de
bootstrap** — nem "é o primeiro", nem "o instrumento é novo", nem "o vermelho deve ser do ambiente".

**3. ANTI-CIRCULARIDADE — por escrito na ata, não subentendida.**

> **O verde do inspetor NÃO é prova de mérito do item 1.**

Ele julga **tabuleiro, não mérito** (§C7.1-bis). A ata **marca literalmente**: *"instrumento e fatia S0
nascem neste bloco"*. Se ficasse implícito, a junta leria o `LIBERADO` como "o guard funciona" — e o
`LIBERADO` significa apenas "o tabuleiro está limpo o bastante para votar", medido **com** o instrumento
sob julgamento.

**Quem prova o mérito é a C1**, que **reexecuta os Drills A e B por conta própria**, **sem herdar** o
resultado da inspeção (afirmação anterior = **a re-verificar**). E o caso decisivo: **se o conserto tiver
trocado falso-vermelho por verde-cego, quem pega é o Drill B** (mutações → vermelhos com o rótulo certo),
**não o `LIBERADO` do inspetor** — um guard cego passa na S0 exatamente como um guard bom. É por isso que
o Drill B não é opcional e não pode ser aceito de terceiro.

**4. O resto do checklist do §C7.1-bis vale sem adaptação:**
- **Worktree próprio para cada jurado que muta** (a C1 muta: Drill A e Drill B). Junction/symlink de
  `node_modules` entre worktrees é **PROIBIDA** (§C7.1-ter-c) — cada worktree roda `npm ci` próprio;
  remoção só por `git worktree remove --force`.
- **Banco descartável onde houver banco** (a C2). **Nenhuma cadeira toca `erp-postgres`/`erp-redis`.**
- **Inelegibilidade do §4 conferida por nome.**
- **Baseline honesto medido** e **plano de perda de jurado declarado** (§4, último parágrafo).
- **Árvore sem mutação viva** no momento em que a junta começa.

---

## 6. O que atacar com mais força — armadilhas medidas neste bloco

Seis armadilhas, todas **medidas neste bloco** — nenhuma é hipótese. Cada uma vem escrita como **alvo de
ataque**: o que o atacante precisa derrubar, **o comando que mede** e **o comando que engana**. Rodar o
comando que engana e reportar a saída dele é, por si só, a classe de defeito que este bloco conserta.

### 6.1 VERDE-CEGO — o alvo número 1 (cadeira C1, veto)

**O ataque:** o conserto do guard pode ter trocado **falso-vermelho por um guard que não acusa mais nada**.
Sair de "acusa o que não devia" para "não acusa coisa alguma" **também** deixa a S0 verde — e S0 verde é
exatamente o que o bloco promete entregar. Um guard cego e um guard bom são **indistinguíveis pelo verde**.

**A defesa entregue:** **Drill B — 8 mutações → 8 vermelhas**, cada uma nomeando **1 arquivo** e **não os
outros 21**. O rótulo é a prova: guard cego fica **verde**; guard grosseiro acusa **os 22 de uma vez**. Só a
mutação separa os três casos.

**A regra da cadeira:** a **C1 reexecuta os Drills A e B por conta própria**. **Não aceita a saída registrada**
no diário do dev, nem deriva mérito do `LIBERADO` do inspetor (§5.3 — um guard cego passa na S0 igual a um
guard bom). Saída registrada por terceiro é **afirmação a re-verificar**, nunca insumo.

### 6.2 O §C7.4 ANTIGO voltando de carona no transporte (cadeira C3, veto)

**O ataque:** o transporte da Fase 3 traz arquivos da `demo/investidor`, onde o §C7.4 ainda carrega o teto de
**5 ciclos** — **revogado** na `main` pelo `D-TETO-DOIS-CICLOS`. Um arquivo transportado com o texto antigo
reescreve a governança por dentro de um PR de guard, sem nunca se anunciar.

- **Comando que discrimina:** `grep -c "ciclo 5 falho"` → **0 na `main`, 1 na `demo`**. A string existe **só**
  no texto revogado.
- **Comando que engana:** qualquer busca por **"ciclos 4–5"**. Ela aparece **nos dois textos** e **não
  discrimina** — devolve o mesmo resultado no caso bom e no caso ruim. **Nunca** use essa régua.

### 6.3 `md5sum` e `git status` FABRICAM divergência sob `core.autocrlf=true`

**O ataque:** concluir "o índice de pendências está defasado" comparando md5, ou tratar arquivo listado em
`git status` como prova de conteúdo alterado.

**O fato medido neste bloco:** o índice de pendências **muda de md5 ao ser regenerado**, com **`git diff`
vazio**. O que muda é o CR na normalização, não o conteúdo. Quem parar no md5 reporta **"índice defasado"** e
**inventa um achado falso** — a mesma classe de defeito (instrumento que mente sobre o que mede) que este
bloco existe para consertar.

**Medir eol-neutro, sempre:** `git diff`/`git diff --stat` como veredito, `git -c core.autocrlf=false checkout
<head> -- <caminhos>` ou o **blob** via `git show` para comparar conteúdo. **Nunca** o md5 do arquivo no
working tree; **nunca** `git status` como prova de que o conteúdo mudou.

### 6.4 `sed` NÃO edita os contratos

`sed` abre o arquivo em **modo texto e remove o CR**; ao reescrever, converteria **497 linhas de CRLF para
LF**. O resultado é uma **mudança de massa disfarçada de inserção de uma linha** — o diff aparece como
"arquivo inteiro alterado", e é exatamente dentro dessa massa que o **§C7.4 antigo (6.2) poderia voltar
escondido**, sem ninguém enxergar. Contrato se edita com ferramenta que **preserva o EOL**; o diff de um
contrato tem de mostrar **as linhas que mudaram**, não 497.

### 6.5 `grep -c $'\r'` é INÚTIL no Git Bash desta máquina

O MSYS **esvazia o padrão**, e padrão vazio casa com **toda linha**: o comando reporta **497 num arquivo de
497 linhas**. Isso não significa "todas as linhas têm CR" — significa "o padrão virou nada". A armadilha é que
o número **parece** a confirmação que se procurava. Contar CR por outro caminho (`file`, `od -c`,
`git ls-files --eol`), nunca por esse.

### 6.6 A régua da lista `SUITES` (cadeira C2, veto)

- **Comando certo:** `grep -cE '^\s*SUITES='` → **23 → 27**. Conta **entradas da lista**.
- **Comando que engana:** `grep -c "test.ts"` → **24 → 29**. Conta ocorrências que **não são** entradas e
  **publica número errado** no KPI.

O erro **aconteceu de verdade neste bloco** — foi pego e corrigido na Fase 4. A cadeira confere **qual das
duas réguas** o número publicado usou, e reexecuta a certa.

---

## 7. O que o bloco NÃO fechou (declarado)

Nada nesta seção é surpresa para a junta: **está declarado antes do voto**, com **dono nomeado** e
**severidade**. A distinção que vale (§C7.1-ter-a): item **declarado aqui** é **pendência** e **não reprova**;
item **omitido aqui** e descoberto por uma cadeira é achado **`dentro-do-bloco`** e reprova. A cadeira confere
se a declaração **bate com o terreno** — declaração que não bate é a pior das duas.

### 7.1 A suíte de corrida do financeiro NÃO entrou na lista `SUITES` — e não podia entrar

`P-O6R-B02-SUITES-LIST-CI` segue **ABERTA**. O motivo é medido, não opinião: a suíte **não existe na `main`**
— ela vive em `feat/o6r-b02-financial-uow`, blob **`e5295083`**. Acrescentar a linha agora faria o runner
curado apontar para um arquivo inexistente e **quebraria o CI** no primeiro push.

O que este bloco mudou é o essencial: a pendência **ganhou dono nomeado** — **o PR que mergear o B-O6R-02**,
que traz o arquivo e a linha **no mesmo diff**. Pendência sem dono é pendência que ninguém fecha.

### 7.2 `P-SAN2-2-INDICE-DONO-SEMPRE-SIM` (MÉDIA, aberta) — o índice mente sobre dono

A coluna `dono` do índice de pendências marca **"sim"** para **91 de 108** registros cujo campo diz
literalmente **"a atribuir"**. São **dois defeitos independentes** no classificador — ambos registrados no
achado, **nenhum corrigido aqui**.

**Não consertado por decisão, não por esquecimento:** o script está **fora do escopo permitido** do bloco, e
**quem acha não conserta** (§C7.4-bis).

**A ironia, registrada para não se perder:** o defeito torna **invisível** exatamente a **re-atribuição de
dono feita neste PR** (7.1). O índice exibe "dono: sim" antes e depois — a régua que deveria mostrar o
trabalho é a mesma que o esconde.

### 7.3 `P-SAN2-2-PORTA-55432-RESERVADA` (BAIXA, aberta)

A faixa **55353–55452** está **excluída pelo Windows** nesta máquina, **confirmado por `netsh`** — e a
**55432** cai dentro dela. Consequência prática **para esta junta**: cadeira que suba **cluster Postgres
descartável não pode assumir a 55432**; escolhe porta **fora** da faixa excluída e registra qual usou. Não
consertado: é configuração de máquina, **fora do diff**.

### 7.4 `P-O6R-B02-RUNNER-SUMICO-SEM-SKIP` — aberta, `pre-existente`, agora com a causa medida

Segue **ABERTA** e segue classificada como **`pre-existente`** (§C7.1-ter-a: **não reprova** este bloco). O
que mudou é que a **causa saiu do escuro**: **crash de módulo em `src/database/prisma.ts:12`**.

E o **piso de denominador do #359 já morde** — a **detecção** existe e funciona. O que permanece aberto é a
**causa**, não a **detecção**. Cadeira que tratar isso como defeito novo deste bloco está fora de escopo, e a
classificação `pre-existente` vem com evidência de origem, como o §C7.1-ter-a exige.

### 7.5 Painel de KPI — duas defasagens conhecidas (cadeira C4)

**"Últimas demandas" está três blocos atrás** e o **`as_of` não é renderizado**. Declarado **antes** do voto.
A C4 julga se o **número deste PR** é de execução real e honesto; não julga se o painel **já estava** defasado
antes dele — essa defasagem é anterior e está nomeada aqui.

---

## 8. Protocolo de junta resiliente (P1–P6) — mandato para colar em cada cadeira

O texto abaixo vai **colado, verbatim, no prompt de cada uma das 4 cadeiras** — e no do inspetor de terreno.
Não é anexo nem preâmbulo: é **condição de o voto existir**. Diretório de votos desta junta:
`agent-orchestration/omega/juntas/votos/SAN2-2/` (os caminhos abaixo são relativos a ele).

```text
MANDATO DE JUNTA RESILIENTE (P1-P6) — vale para todas as cadeiras, sem exceção.

P1. EVIDENCIA INCREMENTAL, POR ITEM.
    Antes de passar para o item seguinte, grave o que acabou de medir em
    votos/SAN2-2/<cadeira>-evidencia.md: o COMANDO exato, a SAIDA relevante e a
    CONCLUSAO. Um append por item concluido — nunca um dump no final.
    Se voce cair no item 2, o item 1 ja esta no disco e serve ao seu sucessor.

P2. VOTO-ARQUIVO ANTES DA MENSAGEM FINAL.
    Grave votos/SAN2-2/<cadeira>-voto.json com: veredito, gravidade, escopo
    (dentro-do-bloco | pre-existente, este ultimo COM evidencia de data ou origem —
    escopo declarado sem evidencia e tratado como dentro-do-bloco) e a lista dos
    itens medidos. SO DEPOIS escreva a mensagem final.
    O ARQUIVO E O VOTO; a mensagem e apenas o aviso de que ele existe.
    Cadeira que cai DEPOIS de gravar o arquivo VOTOU. Cadeira que cai antes, nao.

P3. MENSAGEM FINAL = 1 LINHA.
    "APROVADO|REPROVADO — voto em votos/SAN2-2/<cadeira>-voto.json".
    Nenhum relatorio na mensagem final. O relatorio longo no fim e o ponto exato
    em que as sessoes morreram hoje, com o trabalho inteiro dentro delas.

P4. MAXIMO 3 ITENS POR CADEIRA.
    Escolha os 3 que decidem o seu voto e pare. Quarto item = cadeira nova, nao
    item extra. Escopo grande nao vira voto melhor: vira queda antes do voto.

P5. SUCESSOR RE-EXECUTA O ROTEIRO DO CAIDO.
    Se voce substitui alguem que caiu, leia o -evidencia.md dele para saber O QUE
    FALTA — e RE-EXECUTE os comandos registrados por conta propria.
    CONCLUSAO SEM COMANDO REGISTRADO NAO E INSUMO: trate como nao dita.
    Voce herda o ROTEIRO, jamais o VEREDITO.

P6. REGISTRO DE QUEDAS.
    Toda queda entra em votos/SAN2-2/00-quedas.md: cadeira, item em que caiu, e se
    o voto-arquivo ja existia no momento da queda. Sem esse registro a junta nao
    sabe em que ciclo esta — e o teto de ciclos (D-TETO-DOIS-CICLOS) conta ciclos.
```

**Por que isso não é formalidade — o dado que justifica cada uma das seis regras:** **cerca de 23 agentes
caíram hoje** por **erro de infraestrutura** — limite de sessão, interrupção, ambiente. **Nenhum caiu por
julgar mal.** O que sobreviveu a eles foi, sem exceção, **o que já estava em disco no instante da queda**;
o que estava só no contexto morreu junto.

O P1–P6 é o que fez este bloco chegar inteiro até a junta, com as quatro fases medidas e este briefing
escrito. **Cadeira que trata o mandato como burocracia e guarda tudo para a mensagem final não devolve um
voto ruim — não devolve voto nenhum**, e a junta recomeça do zero com um sucessor que herda contexto vazio.
