# SAN2-4b — DIÁRIO DO DEV · correções **C5** (registro) e **C6** (KPI)

> Instância **`dev-san2-4b`** (sucessor, 4ª e última do bloco). Mandato: **§3-C5 e §3-C6** do
> `agent-orchestration/omega/planos/SAN2-4b-plano.md` — as duas últimas correções. **Não reverto C1–C4,
> não toco `.github/` nem contratos, não commito.** Escrito **incrementalmente** (`D-JUNTA-RESILIENTE`):
> cada seção é gravada quando o passo termina, não no fim.

---

## §0 — Terreno declarado (transcrito na abertura, não lembrado)

```
$ git rev-parse HEAD              -> ecfdb24894ca461e3468fcd40a859b1440db95e2
$ git branch --show-current       -> fix/san2-4b-corrigir-arnes
$ git status --short              -> (VAZIO — árvore limpa; C1..C4 já commitadas)
$ node -v                         -> v20.19.5
$ hostname                        -> N3SOH82
$ git config core.autocrlf        -> true      (md5/`git status` MENTEM; medir EOL-neutro)
$ df -h /c                        -> 238G total, 18G livres (93% usado)  -> acima dos ~10G do §7.7
$ docker ps
NAMES          STATUS                PORTS
erp-postgres   Up 2 days (healthy)   0.0.0.0:5432->5432/tcp
erp-redis      Up 2 days (healthy)   0.0.0.0:6379->6379/tcp
```

**`erp-postgres` / `erp-redis`: `Up 2 days` na abertura.** O §5.2 do plano proíbe **qualquer** comando
nessas bases, inclusive leitura. O uptime tem de atravessar este trabalho inteiro — é conferido de novo
no §8.

**Diff acumulado do bloco contra a `main` (`45c3b97`), na abertura:**

```
agent-orchestration/omega/juntas/votos/SAN2-4a/00c-porteiro-pos-merge-365.md
agent-orchestration/omega/juntas/votos/SAN2-4b/dev-c1-parsestored.md
agent-orchestration/omega/juntas/votos/SAN2-4b/dev-c2-tamper-guard.md
agent-orchestration/omega/juntas/votos/SAN2-4b/dev-c3-sweep.md
agent-orchestration/omega/juntas/votos/SAN2-4b/dev-c4-teardown.md
agent-orchestration/omega/planos/SAN2-4b-plano.md
src/modules/authority/authority-password.ts
tests/authority-portal.test.ts
tests/db-catalog-write-guard.test.ts
tests/helpers/auth-identity-fixture.ts
tests/rls-tenant-isolation.test.ts
```

11 arquivos, **todos** dentro do §5.1. Nenhum `Kpis/**` nem `agent-orchestration/controle/**` ainda —
são exatamente o que este mandato acrescenta.

---

## §1 — O que os 4 diários entregaram (lido, não refeito)

| Correção | Commit | O que ficou provado | Log/diário |
|---|---|---|---|
| **C1** `parseStored` | `f6631d0` | keylen pinado em `AUTHORITY_SCRYPT_PARAMS.keylen` + rejeição de base64 não-canônico. Vermelho-controle **79/20 000** e **18/5 000** → **0/100 000**; controle positivo 100 000/100 000; OWASP 3/3 | `dev-c1-parsestored.md` |
| **C2** tamper + guard | `f6631d0` | tamper passa a adulterar DADO; 2 testes novos (denominador **12 → 14**). **30/30 VERMELHAS** sem a C1 → **30/30 VERDES** com ela. Detecção **1/256 → 100%** | `dev-c2-tamper-guard.md` |
| **C3** as 2 portas | `ecfdb24` | família registrada **e** criador invoca o sweep. Vermelho 2/2 sobreviveu nas duas portas → verde 2/2 recolhido. Mutação M1/M2 provou que **meia correção não resolve** (2/2 sobreviveu em cada) | `dev-c3-sweep.md` |
| **C4** teardown | `ecfdb24` | `dropEphemeralRoleResilient` no `finally`. Forma crua **10/10 órfãs** → resiliente **0/10**; vaza-metro Δ=0 em 10/10 | `dev-c4-teardown.md` |

**Achados que os diários deixaram NOMEADOS e sem dono** (insumo direto do C5 — os três que o mandato
cobra por nome, mais os que os diários acrescentaram):

1. **68 CARREGADO** — não recontado (medicao-3 O-3; base viva proibida; dono = junta de
   `P-ARNES-RLS-TEST-FORA-DO-SWEEP`).
2. **Ratchet por CONTAGEM é cego à troca SQL→prosa** (achado da C3 §4: total 8→8 com o `DROP ROLE`
   virando comentário). Fora do §5.1, sem correção proposta (§C7.4-bis).
3. **`npm run check`/`lint` não fazem typecheck de `tests/`** (achado da C2 §3/§6.8). Pré-existente.
4. **Salt sem pino de comprimento** (C1 §7.6 e C2 §6.3) — só o hash é pinado.
5. **`src/modules/auth/services/password.service.ts:96`** tem um `parseScryptHash` próprio (formato de
   7 campos) **não lido em busca da mesma classe** (C1 §7.7) — fronteira de escopo declarada.
6. **4 stored escritos à mão** em `tests/` (C1 §3), agora inequivocamente inválidos — sem impacto medido
   (nenhum deles chama `verifyPassword`).
7. **Errata ao §3-C1.1 do PLANO** (C2 §8.1): quem mata o tamper antigo é o **pino do keylen**, não a
   rejeição canônica — 44 chars sem padding re-encodam para os mesmos 44 chars (canônico 5000/5000).

---

## §2 — Baseline do índice de pendências, medido ANTES de eu editar uma linha

O mandato exige regenerar o índice por script e publicar o placar **antes e depois**. Antes de qualquer
coisa, medi se o índice **já estava** defasado — porque um "depois" só significa alguma coisa contra um
"antes" honesto.

```
$ cp agent-orchestration/controle/pendencias-indice.md $SCRATCH/indice-ANTES.md
$ python agent-orchestration/controle/gerar-indice-pendencias.py
indice: 234 cabecalhos / 226 IDs | {'FECHADA': 47, 'ABERTA': 187}
        | baldes {'-': 47, 'C': 77, 'B': 77, 'A': 33} | diferidas-materiais 2
ec=0
```

**Placar ANTES (sem nenhuma edição minha): 234 cabeçalhos · 226 IDs · 187 ABERTAS · 47 FECHADAS ·
0 CONTRADITÓRIAS · baldes A=33 / B=77 / C=77 · diferidas-materiais 2.**

### O índice NÃO estava defasado — e a prova precisou ser EOL-neutra, como o mandato avisa

Comparação byte a byte após normalizar `\r\n` → `\n`:

```
$ python -c "... a=ANTES.replace(CRLF,LF); b=REGERADO.replace(CRLF,LF); print(a==b)"
IDENTICO      len antes: 36268   len depois: 36268
```

**E o `git status` MENTIU sobre isso, exatamente como o mandato previu:**

```
$ git status --short   ->   M agent-orchestration/controle/pendencias-indice.md
$ git diff --quiet agent-orchestration/controle/pendencias-indice.md ; echo $?   ->   0
$ git diff --stat  (cru)              ->  (vazio)
$ git diff --ignore-cr-at-eol --stat  ->  (vazio)
$ contagem de bytes:   ANTES  CRLF=311  36579 bytes
                       DEPOIS CRLF=  0  36268 bytes   (311 CR a menos = 311 linhas)
```

O script escreve **LF**; a árvore de trabalho carrega **CRLF** sob `core.autocrlf=true`. `git status`
marca ` M` porque o arquivo **em disco** mudou de bytes; `git diff --quiet` sai **ec=0** porque o
**conteúdo** não mudou. Um agente que lesse só o `git status` concluiria "o índice estava defasado" e
publicaria uma correção que não corrigiu nada. **Restaurei o arquivo CRLF** (`cp` de volta) para deixar a
árvore limpa antes de editar a `pendencias.md`; `git status --short` voltou a não listá-lo.

**Consequência para o §9 da bateria:** a comparação do índice regenerado no fim é feita **EOL-neutra**, e
o placar depois é o do próprio stdout do script — não de `git status`.

---

## §3 — C5 aplicada: o que FECHOU, o que ficou ABERTO, e as 7 linhas que eu ALTEREI

### §3.1 — A forma que já custou duas reprovações nesta rodada, resolvida por precedente

O mandato é explícito: **só a linha de status decide**. O classificador confirma, por leitura do próprio
código (`gerar-indice-pendencias.py`): `LINHA.search(body)` casa a **primeira** linha que comece por
`status:`/`Estado:` na seção, e o comentário do script diz por quê — *"a linha de status vence o
cabeçalho; o cabeçalho NUNCA fecha nada"*.

Isso cria uma tensão real com o §5.2 do plano (*"nenhuma linha existente de `pendencias.md` é apagada ou
alterada — só apenso/errata datados"*): **um apenso no fim da seção não fecha nada**, porque a primeira
linha de status continua sendo a antiga. Fechar por apenso puro produziria uma pendência que **se declara
fechada na prosa e continua ABERTA no índice** — exatamente a classe que esta rodada existe para
exterminar.

**Não resolvi isso por gosto: procurei o precedente no próprio arquivo.** `P-REG-S0-GUARD-FALSO-VERMELHO`
foi fechada pelo `SAN2-2` em 2026-08-30 assim, e é o molde que segui:

1. **blockquote de fechamento no topo da entrada**, logo após o cabeçalho (a prosa original fica intocada,
   abaixo);
2. **sufixo no cabeçalho** (`— **FECHADA em <data>**`), sem apagar o cabeçalho;
3. **linha de status atualizada** — é **campo**, não narrativa;
4. **`<sub>` da triagem SAN2-1** ganha um colchete datado apensado, com o texto original preservado.

**Declaro por extenso as 7 linhas que ALTEREI** (`git diff -U0 | grep '^-'` transcrito; nenhuma outra):

| # | linha | natureza da alteração |
|---|---|---|
| 1 | cabeçalho `P-ARNES-AUTHORITY-PORTAL-INTERMITENTE` | **sufixo** ` — **FECHADA em 2026-08-31**` |
| 2 | `- **status:** ABERTA · MEDIA · a atribuir` (mesma entrada) | **campo** → `FECHADA` + dono + ponteiro |
| 3 | `<sub>Triagem SAN2-1…` (mesma entrada) | **colchete datado apensado**, texto original íntegro |
| 4 | cabeçalho `P-REG-BATERIA-BARATA-DUAS-LISTAS` | **sufixo** ` — **FECHADA em 2026-08-31**` |
| 5 | `- **status:** ABERTA · MEDIA · declarado acima` | **campo** → `FECHADA` |
| 6 | cabeçalho `P-SAN2-2-PORTA-55432-RESERVADA` | **sufixo** ` — **FECHADA em 2026-08-31**` |
| 7 | `- **status:** ABERTA · BAIXA · a atribuir` | **campo** → `FECHADA` |

`git diff --stat` nos 4 arquivos de registro = **402 inserções / 7 deleções**. As 7 são estas; **nenhuma
linha de prosa foi removida** e nenhum texto histórico foi reescrito. O script de edição conferiu **9
âncoras** por prefixo antes de tocar em qualquer coisa (aborta se alguma tivesse mudado) e operou por
índice de linha, de baixo para cima, preservando CRLF.

### §3.2 — O que este bloco FECHOU (3), com o lastro de cada fechamento

| Pendência | Item do plano | Lastro do fechamento |
|---|---|---|
| `P-ARNES-AUTHORITY-PORTAL-INTERMITENTE` | §3-C5.2 | A entrada exigia **atribuir por execução (N≥10)** antes de consertar; o 4a atribuiu (1/256, 7 elos) e este bloco corrigiu (C1+C2). Vermelho-controle **79/20 000** → **0/100 000**; arquivo **30/30 vermelho** → **30/30 verde** |
| `P-REG-BATERIA-BARATA-DUAS-LISTAS` | §3-C5.3 | Mudou de natureza: não havia conflito a arbitrar, havia **uma sentença falsa** — corrigida por errata E-1 no `status-geral.md`. Fechamento **diferido ao 4b por escrito** (medicao-2 l.497 + porteiro §7.2) |
| `P-SAN2-2-PORTA-55432-RESERVADA` | §3-C5.6 | O **critério escrito na própria entrada** cumprido nas duas metades: `netsh` executado e transcrito **2×** pelo 4a (medicao-2 §T2, medicao-3 §T2), e o §6 do `SAN2-2-plano.md` recebeu a errata |

Nos três, o fechamento cita o critério **que a própria entrada** declarava — não inventei critério novo
para poder fechar.

### §3.3 — O que NÃO fechou, com a razão (os três que o mandato cobra por nome)

**1. As 68 seguem CARREGADAS — `P-ARNES-RLS-TEST-FORA-DO-SWEEP` continua ABERTA.** Apenso aplicado
(§3-C5.4), estado **inalterado**; o índice confirma — a entrada segue no balde A, linha 3473. Razão:
recontar exige `erp-postgres`, e o §5.2 proíbe **qualquer** comando nessa base, **inclusive leitura**; e o
dono designado pela medicao-3 (O-3) é **a junta da pendência**, em recontagem supervisionada só-`SELECT`.
O apenso registra o que a C3 muda no **cálculo** dela (gatilhos **5 → 6**; órfã nova morre em ≤60 min) e o
**risco residual §7.3** para a junta dona pesar. **O 68 é o número de 18/08 e não foi re-verificado por
mim.**

**2. Ratchet por CONTAGEM cego à troca SQL→prosa** → nasce como
`P-ARNES-RATCHET-POR-CONTAGEM-CEGO-A-PROSA`, **ABERTA**, escopo `pre-existente` com evidência de origem (o
ratchet é do `B-O6R-ARNES`, 28/08, anterior a esta branch). Evidência transcrita da C3:
`rls-tenant-isolation.test.ts` **8 → 8**, composição idêntica, embora a C4 tenha **removido** o
`DROP ROLE IF EXISTS` do SQL e a prosa que explica a migração **mencione** `DROP ROLE`. **Sem correção
proposta** (§C7.4-bis — quem acha não conserta); dono deixado como **a atribuir**, com o candidato natural
nomeado em prosa, porque não combinei compromisso com ninguém.

**3. `npm run check`/`lint` não fazem typecheck de `tests/`** → nasce como
`P-REG-BATERIA-NAO-TYPECHECA-TESTS`, **ABERTA**, escopo `pre-existente` (o `include: ["src/**/*.ts"]` já
estava no `tsconfig.json`, que **não aparece no diff deste bloco**). Evidência da C2:
`npx tsc -p tsconfig.json --noEmit --listFiles | grep -c authority-portal.test.ts` = **0**.
`tsconfig.json` é **explicitamente proibido** pelo §5.2. **Sem correção proposta.**

**Severidade das duas entradas novas: `a classificar`.** O mandato proíbe carimbar severidade não
verificada, e eu medi **mecanismo**, não impacto. Consequência mecânica no índice: sem palavra de
severidade no corpo, as duas caem no **balde B (processo/registro)**, não no A — que é a leitura honesta,
e está dita aqui para ninguém a ler como minimização.

### §3.4 — Os demais itens do §3-C5, um a um

| item | destino | estado |
|---|---|---|
| 1 | errata **E-1** no `status-geral.md` l.33 | **feito** pela instância anterior deste mandato — **conferi contra a fonte** (medicao-2 §V.2/§V.3 e §V.5 O-1): as duas combinações de 6, as três listas da cadeira C2, as 7 contagens certas e a coincidência `link-events(5)+role-real(10)==links(15)` batem com o diário |
| 2 | fechamento `P-ARNES-AUTHORITY-PORTAL-INTERMITENTE` | **feito** |
| 3 | fechamento `P-REG-BATERIA-BARATA-DUAS-LISTAS` | **feito** |
| 4 | apenso `P-ARNES-RLS-TEST-FORA-DO-SWEEP` (fica ABERTA) | **feito** |
| 5 | emenda `P-O6R-ARNES-ISOLAMENTO` | **feito** — cabeçalho NOVO na série de emendas (molde dos ciclos 3 e 4), trazendo os **denominadores por arquivo** que o plano do 4a §5.1 previa e **nunca** foram aplicados (o 4a não tocou `pendencias.md`) |
| 6 | fechamento `P-SAN2-2-PORTA-55432-RESERVADA` + errata ≤5 linhas no §6 do `SAN2-2-plano.md` | **feito** — a errata é **1 linha** de bloco `>`, dentro do teto de 5 |
| 7 | apenso ao critério **D29** do `B-O6R-02-ciclo5-plano.md` | **feito** — a receita é o **§V.3** (lista NOMEADA de 6), **não** o par `(6,37)`, que é necessário e **insuficiente** (três listas de 6 dão `(6,37)`) |
| 8 | diários de `votos/SAN2-4a/` declarados **registro canônico** em cada apenso | **feito** nos 5 apensos + no D29 |
| 9 | índice regenerado por script (o script **não** foi editado — o falso-sim tem dono próprio, SAN2-5) | **feito** — §3.5 |
| 10 | parágrafo de estado no `status-geral.md` | **feito** pela instância anterior; conferido contra os 4 diários |

**Nota sobre o item 9 e o "dono: sim" do índice.** Todas as minhas entradas novas saem com `dono` = **sim**
no índice mesmo declarando `**dono:** a atribuir`. Isso **não** é afirmação minha: é o defeito conhecido do
regex do script (`\s*` retrocede e derrota o *negative lookahead*), registrado em
`P-SAN2-2-INDICE-DONO-SEMPRE-SIM` com dono próprio. O §3-C5.9 do plano manda **não** editar o script, e não
editei.

### §3.5 — O placar do índice, ANTES e DEPOIS, com a previsão declarada antes de rodar

O baseline do §2 **não foi herdado**: re-executei o comando registrado (P3) e obtive o mesmo número.

```
ANTES   indice: 234 cabecalhos / 226 IDs | {'FECHADA': 47, 'ABERTA': 187}
              | baldes {'-': 47, 'C': 77, 'B': 77, 'A': 33} | diferidas-materiais 2      ec=0
        git diff --quiet pendencias-indice.md -> ec=0   (o índice NÃO estava defasado)

DEPOIS  indice: 237 cabecalhos / 228 IDs | {'FECHADA': 50, 'ABERTA': 187}
              | baldes {'-': 50, 'C': 77, 'B': 79, 'A': 31} | diferidas-materiais 2      ec=0
```

**Previsão que escrevi ANTES de rodar o script, e que bateu nos 8 campos:** +3 cabeçalhos (1 emenda de
`P-O6R-ARNES-ISOLAMENTO` + 2 pendências novas) → **237**; **+2 IDs** (a emenda reusa ID existente) →
**228**; três fechamentos e três aberturas → **ABERTA fica em 187**; FECHADA 47→**50**; balde A **−2** (as
duas fechadas eram MÉDIA) → **31**; balde B **−1** (a PORTA era BAIXA) **+3** (as três novas sem
severidade) → **79**; C e diferidas-materiais intactos. **Soma de conferência:** 50+77+79+31 = **237** ✔.

**`ABERTA` não se moveu, e isso não é o índice mentindo** — é a conta real: fechei três e abri três. Quem
ler só o total conclui que nada aconteceu; a leitura certa está nos baldes (**A: 33 → 31**) e nas linhas
nominais. Digo isto aqui exatamente para o número não ser lido como estagnação nem como progresso.

**Conferência nominal no índice regenerado:** as três fechadas aparecem na seção `FECHADAS`
(linhas 307/311/314 do índice); a emenda e as duas pendências novas, em `ABERTAS · balde B`
(173/176/177); e `P-ARNES-RLS-TEST-FORA-DO-SWEEP` segue em `ABERTAS · balde A` (82).

**Comparação EOL-neutra, como o mandato avisa.** O script escreve **LF**; a árvore vive em **CRLF** sob
`core.autocrlf=true`. Reconverti o índice regenerado para CRLF (**314** linhas, 37 039 bytes) para a árvore
ficar como um `checkout` a produziria, e o `git diff` do índice mostra **só** as mudanças de conteúdo
previstas: placar, linhas nominais e a renumeração da coluna `linha:` pelo deslocamento das inserções.
`git diff --check` → **ec=0**.

---

## §4 — C6: o KPI (backfill do #365 · blocks 155 · entrada nova com execução real)

### §4.1 — Terreno da medição, escolhido e não lembrado

O §6.0 do plano manda consultar as faixas excluídas **antes** de fixar a porta — a lição de
`P-SAN2-2-PORTA-55432-RESERVADA`, que este mesmo bloco fecha no C5. Consultei:

```
$ netsh interface ipv4 show excludedportrange protocol=tcp
      5357        5357
     55253       55352
     55353       55452      <- é aqui que a 55432 do plano do SAN2-2 morre
     … (22 faixas lidas ao todo)

$ (varredura das 22 faixas contra 56432 e 56379)  ->  nenhuma COLIDE
```

```
$ docker run -d --name san2-4b-pg    … -p 56432:5432 postgres:16
$ docker run -d --name san2-4b-redis      -p 56379:6379 redis:7
$ npx prisma migrate deploy                    -> "All migrations have been successfully applied."
$ psql -tAc "select count(*) from _prisma_migrations where finished_at is not null;"   -> 103
```

**103 migrations**, como o §6.0 exige — conferidas por `SELECT`, não pela saída do Prisma.

### §4.2 — `backend_tests`: execução real na canônica 3, com N e forma

**Forma exata**, transcrita do comando: `npm test` (= `node scripts/run-backend-tests.mjs`), com
`DATABASE_URL`/`REDIS_URL` apontando o par descartável `:56432`/`:56379`, e —
o ponto que define a canônica 3 — **`CORE_SAAS_PERSISTENCE` e `RBAC_DB_PARITY` AUSENTES**, removidas do
ambiente com `env -u` em vez de "não exportadas por acaso". Node **v20.19.5**. N=1 rodada completa.

```
# tests 2611 · # pass 2609 · # fail 0 · # cancelled 0 · # skipped 2 · # todo 0
# duration_ms 223480.7733
[run-backend-tests] 248 arquivo(s) · 2611 teste(s) · pass 2609 · fail 0 · skipped 2
SUITE_EC=0        (zero `not ok` no log inteiro: grep -c '^not ok' -> 0)
```

**Publicado: `2609/2611`** — `pass/tests`, a mesma régua da entrada anterior (`2607/2609`).

**O delta é +2 e tem causa nomeada, conferida pelos dois lados.** Os +2 são os dois casos que a correção
C2 acrescentou a `tests/authority-portal.test.ts`. Medi o arquivo isolado, mesma forma, **N=3**:

```
r1 ec=0 :: 1 arquivo(s) · 14 teste(s) · pass 14 · fail 0 · skipped 0
r2 ec=0 :: 1 arquivo(s) · 14 teste(s) · pass 14 · fail 0 · skipped 0
r3 ec=0 :: 1 arquivo(s) · 14 teste(s) · pass 14 · fail 0 · skipped 0
```

**12 → 14, constante 3/3.** `2607 + 2 = 2609` e `2609 + 2 = 2611`: a conta fecha nas duas colunas, e
nenhum outro arquivo mudou de denominador. Não publiquei "a suíte ficou verde" — publiquei o número, o N,
a forma e **de onde vieram os dois testes a mais**.

**§4-INV corroborado por instância independente.** O diário da C4 mediu a lista-6 do §V.3 em 3/3; como eu
acabei de apensar essa receita ao critério **D29** do ciclo 5, re-executei uma vez, no meu cluster:

```
[run-backend-tests] 6 arquivo(s) · 37 teste(s) · pass 37 · fail 0 · skipped 0     ec=0
```

**`(6 arquivos, 37 testes)` intacto.** Isso importa porque as correções C3/C4 tocaram **dois membros da
lista** (`rls-tenant-isolation.test.ts` e o fixture que todos importam) — se o par tivesse se movido, o
D29 perderia a comparabilidade com o vermelho-controle histórico (5/13 e 7/13) e o apenso que escrevi no
C5 estaria vendendo uma receita quebrada.

### §4.3 — Backfill §C3.5 do #365, e a diferença honesta em relação ao backfill anterior

Aplicado na entrada **SAN2-4a** do `kpis-history.json`: `pr` **365** · `merge_commit` **`45c3b97`** ·
`approved_head` **`4199b92`**.

**Li a ata antes de gravar, como o mandato exige** — `J-SAN2-4a.md` l.4: *"**Head julgado:** `4199b92`"*,
quórum MAIORIA de 3, APROVADO 3×0. **Não** usei o `headRefOid` `aa22b7f` do GitHub: gravá-lo declararia
que a junta aprovou um commit que ela nunca viu (mesma lógica dos #362/#363/#364).

**Mas encontrei uma diferença real em relação ao backfill do #364, e ela vai escrita no registro em vez
de omitida.** Medi o delta `4199b92..aa22b7f`: são **15 arquivos**, zero em `src/`, `tests/`, `scripts/`,
`prisma/` ou `.github/` — até aí igual ao precedente. Só que **os 15 INCLUEM `Kpis/kpis-history.json`,
`Kpis/kpis-latest.json` e `Kpis/app.js`**, e a checagem por parser mostra por quê:

```
4199b92 -> 147 entradas; ultima = SAN2-3
aa22b7f -> 148 entradas; ultima = SAN2-4a
45c3b97 -> 148 entradas; ultima = SAN2-4a
```

Ou seja: **no head julgado, a entrada de KPI do SAN2-4a não existia.** Isso **não** é divergência
escondida — é literalmente o achado **C3-A1** da cadeira de escopo/KPI, consignado na ata l.59
(*"a entrada de KPI do próprio SAN2-4a não existe"*, MÉDIA, `dentro-do-bloco`), cujo tratamento pós-voto
criou a entrada. **A junta viu a AUSÊNCIA, apontou e mandou criar.** Registrei o fato na `description` da
entrada e no `release.backfill_note`, para quem auditar o par *(approved_head, conteúdo)* no futuro não
concluir que alguém gravou número que a junta não viu. Isto é o oposto de carimbar: é dizer onde o
carimbo tem limite.

### §4.4 — `blocks_completed` 154 → 155, pela condição literal

A entrada do SAN2-4a escreveu, com estas letras: *"sobe para 155 **so quando o SAN2-4a mergear**"*. Ele
mergeou em `45c3b97` (`measure(arnes): as tres medicoes do arnes … (#365)`, 31/08). O número sobe.
Escrevi a **mesma condição para o 156** na entrada nova, para a dívida não se repetir: na autoria fica em
155, e só sobe quando **este** bloco mergear. Essas duas coisas — o backfill (a) e o 155 (b) — são
exatamente a **dívida dupla** que o porteiro pós-merge do #365 nomeou no item 4.5. As duas estão pagas.

### §4.5 — A entrada nova, e o que NÃO se moveu

| campo | valor | lastro |
|---|---|---|
| `version` | `SAN2-4b` | — |
| `pr` / `merge_commit` / `approved_head` | **null / null / null** | §C3.5 — na autoria não existem |
| `backend_tests` | **2609/2611** | execução real, §4.2 |
| `blocks_completed` | **155** | condição literal do 4a, §4.4 |
| `flutter_tests` | 864/864 **CARREGADO** | §C3.3 |
| `frontend_smoke_tests` | 1126/1126 **CARREGADO** | §C3.3 |
| `backend_contract_tests_focused` e os 3 contratos mobile | **CARREGADOS** | §C3.3 |
| `mvp_demo` 99% · `mvp_vendavel` 88% | **INTOCADOS** | o PR não move escopo (§C3.4) |

**A prova do "não tocou" é medida nas DUAS pontas, não afirmada:**

```
mobile/ -> commitado:0  arvore:0        prisma/     -> 0 / 0     .github/  -> 0 / 0
frontend/ -> commitado:0  arvore:0      migrations/ -> 0 / 0     scripts/  -> 0 / 0
tsconfig.json -> 0 / 0                  package.json -> 0 / 0

git diff --name-only 45c3b97...HEAD -- src/ tests/   ->   5 arquivos (1 em src/, 4 em tests/)
```

`mvp_*` intocados porque o bloco **conserta arnês e endurece um primitivo de autenticação** — não entrega
funcionalidade nova. Mover o percentual aqui seria inventar escopo.

**Fora do meu escopo, e por quê:** o §5.1 do plano lista, para KPI, **exatamente três** arquivos —
`kpis-history.json`, `kpis-latest.json` e `app.js` (só a linha FROZEN, via script). Não toquei
`Kpis/index.html` nem `Kpis/kpis-history.md`. Isso é coerente com a prática medida: `git show --stat` dos
merges do **#365** e do **#364** mostra os **mesmos três** arquivos e nenhum outro. O painel hidrata dos
JSON em runtime (`D-KPI-INDEX-PAINEL`), então editar os JSON **já move o painel**.

### §4.6 — O guard mordeu, e está provado nos dois sentidos

O mandato pede prova de que a trava funciona, não a alegação. Registrei os quatro estados, em ordem:

```
[1] ANTES de qualquer edição   node scripts/kpi-freeze.mjs --check  -> "em dia"       ec=0
[2] DEPOIS de editar os JSON   node scripts/kpi-freeze.mjs --check  -> "DIVERGE"      ec=1   <- MORDEU
[3] reinjeção                  node scripts/kpi-freeze.mjs          -> "reinjetada (61672 bytes)"  ec=0
[4] DEPOIS do freeze           node scripts/kpi-freeze.mjs --check  -> "em dia"       ec=0
```

O estado [1] importa tanto quanto o [2]: sem ele, um `ec=1` no passo [2] poderia ser defasagem herdada, e
não a **minha** edição. `[1] ec=0 → [2] ec=1 → [4] ec=0` é o par vermelho→verde do guard, causado por
mim. A linha FROZEN **nunca foi digitada** — `git diff -U0 Kpis/app.js` mostra **1 linha `+` e 1 linha
`-`**, ambas `var FROZEN = …`, e nada mais no arquivo.

### §4.7 — Bateria final (§4-C6 e §6.8–§6.11), ec um a um

```
node scripts/run-backend-tests.mjs tests/kpi-dashboard-charts.test.ts
        -> 1 arquivo(s) · 16 teste(s) · pass 16 · fail 0 · skipped 0      ec=0
node --check Kpis/app.js                                                  ec=0
parser §4-C6 (node -e com 18 asserts: backfill 365/45c3b97/4199b92,
        3 nulls do 4b, blocks 155, backend 2609/2611, mvp_* intactos,
        notas §C3.3 presentes)      -> "TODAS as asserções passaram"      ec=0
npm run check                                                             ec=0
node scripts/sync-agent-agents.mjs --check -> "OK — 23 agentes, espelho consistente."  ec=0
git diff --check                                                          ec=0
```

**Escopo (§6.10).** A união de `git diff --name-only 45c3b97...HEAD` com `git status --porcelain` dá
**20 caminhos**, e os 20 estão na lista fechada do §5.1: os **5** de código (1 `src/` + 4 `tests/`), os
**6** de registro (`pendencias.md`, `pendencias-indice.md`, `status-geral.md`, os dois planos alheios e o
próprio `SAN2-4b-plano.md`), os **3** de KPI e os **6** diários/pareceres sob
`agent-orchestration/omega/juntas/**`. **Nada de `prisma/`, `migrations/`, `.github/`, `frontend/`,
`mobile/`, `scripts/`, `package.json`, `tsconfig.json` ou `.env`.** Conforme instruído, **não commitei**.

**Teardown (§6.11) e limpeza §C5.**

```
$ docker rm -f san2-4b-pg san2-4b-redis
$ docker ps -a | grep san2-4b   ->  nenhum container san2-4b-* (removidos)
$ docker ps | grep erp-
erp-postgres   Up 2 days (healthy)
erp-redis      Up 2 days (healthy)
```

**`Up 2 days` na abertura (§0) e `Up 2 days` no fechamento: o uptime atravessou o trabalho inteiro.** A
base viva não recebeu **nenhum** comando, nem de leitura — toda `DATABASE_URL`/`REDIS_URL` deste mandato
foi explícita para `:56432`/`:56379`, nunca herdada de `.env`. Nenhum `DELETE` em massa em base alguma.
Limpeza: containers `san2-4b-*` removidos; artefatos regeneráveis não foram gerados (não rodei build); o
scratchpad da sessão guarda os logs da suíte, das sondas e os dois scripts de edição, e morre com o
bloco.

### §4.8 — O que eu NÃO fiz, dito antes que perguntem

1. **Não recontei as 68** (base viva proibida) — §3.3.
2. **Não corrigi** o ratchet nem o `tsconfig.json` — os dois viraram pendência nomeada, `pre-existente`,
   **sem correção proposta** (§C7.4-bis).
3. **Não reverti nada de C1–C4**: o diff de código do bloco continua sendo os mesmos 5 arquivos, e
   `npm run check` e a suíte completa rodaram **sobre** eles.
4. **Não medi a hipótese da segunda contribuição** do 1/2 do jurado (§2.9 do plano) — custaria ~766
   execuções da suíte inteira contra um objeto que, pós-correção, já é outro. A ressalva está escrita por
   extenso no apenso de fechamento, não escondida atrás do fechamento.
5. **Não editei `gerar-indice-pendencias.py`** (o falso-sim do `dono` tem dono próprio, SAN2-5) nem
   `Kpis/index.html` / `Kpis/kpis-history.md` (fora da lista fechada do §5.1).
6. **Não commitei** e **não abri PR** — conforme o mandato.

---

**Fecho do mandato C5+C6.** O registro fechou três pendências com o critério que cada uma já declarava,
manteve aberta a única que depende da base viva, e transformou em pendência nomeada os dois limites de
instrumento que as correções expuseram. O KPI pagou a dívida dupla do porteiro do #365 e publicou um
`backend_tests` cujo delta **+2** tem causa nomeada e conferida pelos dois lados. Onde a evidência tinha
limite — o head julgado sem a entrada de KPI, a ressalva do 1/2, o 68 não recontado — o limite está
escrito, e não coberto pelo número.
