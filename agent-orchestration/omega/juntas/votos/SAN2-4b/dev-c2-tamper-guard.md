# SAN2-4b — DIÁRIO DO DEV · correção **C2** (tamper do teste + guard da classe padding)

> **Instância:** `dev-san2-4b` (**sucessor**) — identidade que **não achou** nada e **não julga** a
> validade do achado (§C7.4-bis). **Papel: quem desenvolve.**
> **Mandato:** a correção **C2 apenas** — `tests/authority-portal.test.ts` (tamper da l.161 + guard da
> classe padding) e este diário. **NÃO reverto nem altero a C1**, que já está no worktree.
> **Plano obrigatório:** `agent-orchestration/omega/planos/SAN2-4b-plano.md` §3-C2 (o quê), §4-C2 (a
> prova e o N), §5 (escopo). **Onde o mandato divergir do plano, o plano vence** — divergências no §8.
> **Escrita incremental** (`D-JUNTA-RESILIENTE`): cada passo é gravado ao terminar — comando, saída,
> estado. Sucessor de queda re-executa a **forma inteira** interrompida, nunca herda metade.

---

## §0 — Terreno declarado (transcrito na abertura, não lembrado)

| Item | Valor conferido por execução |
|---|---|
| Worktree | `c:\Users\AMP\Documents\GitHub\ERP_Techsolutios\.claude\worktrees\san2-r` |
| Branch | `fix/san2-4b-corrigir-arnes` |
| HEAD na abertura | `fca131adf84820503f57cd2383876222aa091cf7` (**nenhum commit** foi feito pela C1 — por mandato) |
| `git status --short` na abertura | ` M src/modules/authority/authority-password.ts` (a **C1**, do antecessor) · `?? …/votos/SAN2-4b/` · `?? …/planos/SAN2-4b-plano.md` |
| `git diff --stat` na abertura | `1 arquivo, 29 inserções, 5 remoções` — **idêntico ao que o diário da C1 registrou no §8**: a C1 chegou íntegra até mim |
| Node | **v20.19.5** |
| Base viva | `docker ps`: `erp-postgres` **Up 2 days (healthy)** · `erp-redis` **Up 2 days (healthy)** — **nenhum comando enviado a nenhum dos dois em todo este trabalho** |
| Banco necessário para a C2 | **NENHUM.** `authority-portal.test.ts` roda com `CORE_SAAS_PERSISTENCE=memory` (l.7) |
| Scratchpad | `…/scratchpad/san2-4b-c2/` |
| Alvo | `tests/authority-portal.test.ts:161` — `const tampered = hash.slice(0, -1) + (hash.at(-1) === "A" ? "B" : "A");` (conferido por `grep -n`, é a l.161 mesma) |

**A C1 que herdei, conferida por leitura antes de eu escrever uma linha** (`git diff` do arquivo):
duas validações novas em `parseStored` — **(1)** round-trip de canonicidade
(`isCanonicalBase64(raw, decoded)`) sobre `parts[4]` (salt) **e** `parts[5]` (hash); **(2)** pino
`hash.length !== AUTHORITY_SCRYPT_PARAMS.keylen → undefined`, e o retorno passa a carregar
`keylen: AUTHORITY_SCRYPT_PARAMS.keylen` em vez de `hash.length`. **Não toquei nada disso.**

---

## §1 — Baseline de abertura (medido, não copiado)

| # | Comando | Saída | ec |
|---|---|---|---|
| B1 | `node scripts/run-backend-tests.mjs tests/authority-portal.test.ts` | `# tests 12` · `# pass 12` · `# fail 0` · `# cancelled 0` · `# skipped 0` · `grep -c '^not ok '` = **0** | **0** |

**Denominador na abertura = 12** — igual ao da F1 do 4a e ao B1 do diário da C1. Log: `B1-baseline.log`.
Note-se que o arquivo já saía **verde com a C1 aplicada** — é exatamente o problema: a l.162 asseria
`false` sobre um stored que a C1 passou a rejeitar por outro motivo. **Verde não é testemunha.**

---

## §2 — A ARITMÉTICA, medida antes de eu escrever uma linha de teste (sonda `c2-arith.mts`)

Não dá para escolher um tamper novo sem saber o que cada mutação do base64 **faz**. A sonda importa
os **dois** módulos reais por `file://` sob `tsx` — `authority-password.PRE-FIX.ts` (o blob do HEAD
`fca131a`, com `keylen: hash.length` na l.79) e `authority-password.WITH-C1.ts` (cópia byte-exata do
worktree, sha256 `f68bcfd0…`) — e mede **6 vetores** na mesma iteração. Zero edição, zero banco.
`FAST_PARAMS` e senha idênticos aos do teste (l.45). Log: `A1-aritmetica-N5000.json`.

**N = 5 000 · Node v20.19.5 · `distribuicao_ultimo_char_do_payload` = `{"=": 5000}` — 5 000/5 000.**

| vetor | chars | bytes | canônico | difere do original | **PRE-FIX aceitou** | **COM C1** | exc |
|---|---|---|---|---|---|---|---|
| **V0** original (controle +) | 44 | 32 | 5000/5000 | 0/5000 | 5000 (**100 %**) | **5000** | 0 |
| **V1** tamper **ANTIGO** (`=` → `A`) | 44 | **33** | **5000/5000** | 5000/5000 | **24 (0,4800 %)** | 0 | 0 |
| **V2** padding **REMOVIDO** (43 chars) | **43** | **32** | **0/5000** | **0/5000** | **5000 (100 %)** | 0 | 0 |
| **V3** 33 bytes canônicos | 44 | 33 | 5000/5000 | 5000/5000 | **12 (0,2400 %)** | 0 | 0 |
| **V4** 31 bytes canônicos (**truncado**) | 44 | **31** | 5000/5000 | 5000/5000 | **5000 (100 %)** | 0 | 0 |
| **V5** tamper **NOVO** (1.º char `A↔B`) | 44 | 32 | 5000/5000 | **5000/5000** | **0 (0 %)** | 0 | 0 |

### O que esta tabela estabelece (e o que ela CORRIGE no plano)

1. **O elo 1 do 4a reproduzido por esta instância:** o payload termina em `=` em **5 000/5 000**, logo
   o ternário da l.161 **nunca** vê `"A"` e sempre devolve `"A"` — troca **padding**, não dado. **V1
   difere do original em bytes 5000/5000**, mas *só porque ganhou um 33.º byte*: os 32 originais ficam
   intactos. Era isso que o tornava aceitável a 1/256, não uma adulteração de verdade.
2. **⚠ ERRATA AO §3-C1.1 DO PLANO (mecanismo, não conclusão).** O plano afirma que o vetor do tamper
   antigo morre pela **rejeição canônica** — *"44 chars sem `=` → re-encode devolve com `=` → ≠ input"*.
   **Medido, é falso:** 44 chars sem padding decodificam para **33 bytes**, e 33 bytes re-encodam para
   **44 chars sem padding** — round-trip **idêntico**, `canônico 5000/5000`. Quem mata o V1 é o **PINO
   DO KEYLEN** (33 ≠ 32), não o round-trip. A **conclusão** do plano (V1 → `false`) está certa e a C1
   entrega; só a atribuição do mecanismo estava trocada. Registro como errata porque um jurado que
   confira "o round-trip pega o V1" não vai encontrar isso — e porque decide **quais casos** o guard
   precisa ter para cobrir as **duas** validações (item 4).
3. **As duas validações da C1 pegam vetores DISJUNTOS** — nenhuma é redundante, e cada uma precisa de
   testemunha própria: o **round-trip** é o único que pega o **V2**; o **pino** é o único que pega
   **V1/V3/V4**.
4. **Dois buracos do PRE-FIX são DETERMINÍSTICOS, não 1/256** — e é isto que dá dentes ao guard:
   - **V2** (`=` removido, 43 chars): decodifica para **os mesmos 32 bytes** (`difere 0/5000`), texto
     **não-canônico**, e o código pré-C1 **autenticava 5 000/5 000 = 100 %**.
   - **V4** (hash **truncado** para 31 bytes canônicos): pré-C1 **autenticava 5 000/5 000 = 100 %**.
     scrypt é prefixo-estável e o `keylen` vinha do input, então **qualquer prefixo** do hash
     armazenado autenticava. É a forma mais severa da OBS-2, e ela **não é probabilística**.
   Consequência para o meu mandato: um guard que inclua V2 e V4 **reprova em 100 % das execuções** se
   alguém reverter a C1 — não em 1/256. O 85,5 % de P(0 em 40) que o mandato cita deixa de valer para
   este teste.
5. **O tamper NOVO (V5) é a escolha certa, medida:** 44 chars, **32 bytes**, **canônico 5000/5000**,
   **difere do original em bytes 5000/5000** — ou seja, ele **atravessa** os dois guards novos da C1 e
   vai até a derivação e o `timingSafeEqual`, que é o caminho que a asserção "senha adulterada é
   rejeitada" *diz* exercitar. E é rejeitado **0 aceitos em 5 000 nas DUAS versões do módulo** —
   pré-C1 inclusive. **Não introduzi um tamper novo com intermitência nova.**

### §2-bis — SALT e PENÚLTIMO char, medidos porque eu ia afirmá-los num comentário de código

Sonda `c2-arith2.mts`, **N = 500**, mesmos dois módulos. Log: `A2-salt-e-penultimo-N500.json`.

| afirmação | medida |
|---|---|
| salt = 16 bytes → 24 chars terminando em `==` | `chars [24]` · `bytes [16]` · `terminação {"==": 500}` — **500/500** |
| salt **sem padding** decodifica para os mesmos 16 bytes | **500/500**, e é **não-canônico 0/500** |
| salt sem padding, **PRE-FIX** | **aceitou 500/500 = 100 %** · **com C1: 0** |
| penúltimo char (só os **2 bits baixos**) decodifica para os **mesmos 32 bytes** | **500/500** · não-canônico **0/500** |
| penúltimo char, **PRE-FIX** | **aceitou 500/500 = 100 %** · **com C1: 0** |
| 1.º char do payload assume quantos valores distintos | **64** (os dois ramos do ternário `A↔B` se exercitam) |

Duas consequências:
1. **A canonicidade do SALT também é um buraco determinístico** no pré-C1 (100 %), e a C1 valida
   `parts[4]` além de `parts[5]`. O guard cobre essa metade — senão a validação do salt fica sem
   testemunha.
2. **O plano estava certo em vetar o penúltimo char como tamper, e o motivo medido é ainda mais forte
   do que o escrito:** ele decodifica para os **mesmos 32 bytes** (500/500), então não é adulteração de
   dado nenhuma. Hoje ele é rejeitado — mas por **não ser canônico**, não por "a senha estar
   adulterada". Como tamper, seria um teste que passa pelo motivo errado outra vez.

---

## §3 — A CORREÇÃO C2 aplicada (§3-C2 do plano, item a item)

**Arquivo único: `tests/authority-portal.test.ts`.** `git diff --stat` do arquivo = **82 inserções,
2 remoções** (o total do worktree passa a `2 arquivos, 109 inserções, 7 remoções` — os outros
`29/5` são a C1, **intocada**: sha256 `f68bcfd0…` conferido depois da minha edição, idêntico ao da
abertura).

| Item do §3-C2 | O que entrou |
|---|---|
| **1. Tamper da l.161 vira adulteração de DADO** | passa a trocar o **1.º char do payload** (`parts[5]`), `A↔B` — 6 bits do byte 0. Vem com **4 asserções novas que pinam que o tamper morde**: mesmo comprimento, **canônico**, **32 bytes**, e `!bytesAdulterados.equals(bytesOriginais)`. O comentário explica a aritmética (por que não o último char, por que não o penúltimo) para o próximo leitor |
| **2. Caso NOVO da classe padding** | `test("… base64 NÃO-CANÔNICO … (SAN2-4b — classe do padding)")` — 3 vetores: **(a)** `=` **removido** do hash (43 chars, mesmos 32 bytes), **(b)** o **tamper antigo** preservado como caso (`=`→`A`, 33 bytes), **(c)** o **salt** sem padding |
| **3. Caso NOVO de comprimento** | `test("… comprimento diferente do keylen … (SAN2-4b — pino do keylen)")` — **(a)** extensão a 33 bytes canônicos, **(b)** **truncamento** a 31 bytes canônicos, **(c)** o caminho feliz continua `true` |
| **4. Denominador medido e publicado** | **12 → 14** (dois `test()` novos), pinado por execução no §5 |

**Por que DOIS `test()` e não um:** as duas validações da C1 pegam vetores **disjuntos** (§2, item 3).
Um teste por validação faz a falha **nomear a própria classe** — quem reverter só o round-trip vê
falhar o teste do padding; quem reverter só o pino vê falhar o do keylen. Num bloco só, a mensagem de
falha não distinguiria as duas. O §3-C2.4 do plano previa 13-14 "conforme a implementação agrupar";
**agrupei em 2, logo 14**.

**Decisões de implementação, declaradas (para a cadeira de segurança atacar):**

1. **O tamper novo é `A↔B` no PRIMEIRO char, como o plano manda** — e a escolha está **medida** (§2,
   V5), não argumentada: canônico 5000/5000, 32 bytes, bytes diferentes 5000/5000, e **0 aceitos em
   5 000 nas duas versões do módulo**. Não troquei uma intermitência por outra.
2. **Acrescentei 4 asserções de FORMA ao tamper** (canonicidade, comprimento, bytes diferentes). O
   §3-C2.1 pede só a troca do char. Elas existem porque o defeito original **não era o valor da
   asserção** — era ninguém verificar que o tamper de fato adulterava. Sem essas 4, uma edição futura
   pode devolver o tamper ao padding e o teste segue verde. **É o guard do guard.** Declarado como
   acréscimo ao plano no §8.
3. **Preservei o tamper ANTIGO como caso (b) do teste de padding**, em vez de apagá-lo. Ele é o vetor
   histórico que o SAN2-4a mediu; jogado fora, a classe perde o caso que a nomeia.
4. **Incluí o vetor do SALT** (caso (c)). A C1 valida `parts[4]` **e** `parts[5]`; sem este caso, a
   metade do salt fica sem testemunha — e ela era um buraco de **100 %** (§2-bis).
5. **Incluí o TRUNCAMENTO (31 bytes)** além da extensão (33 bytes) que o plano cita. Motivo medido: a
   extensão é 1/256, o truncamento é **100 %**. É o truncamento que dá dentes determinísticos ao pino.
6. **Não toquei em mais nada do arquivo** — os outros 12 testes seguem byte a byte como estavam
   (backup `authority-portal.test.ORIG.ts`, sha256 `81e01aca…`).

### ⚠ Achado de terreno sobre a BATERIA (não é achado meu, é fronteira; declarado por honestidade)

`npm run check` e `npm run lint` são **o mesmo comando** (`lint` → `check` → `tsc -p tsconfig.json
--noEmit`), e o `tsconfig.json` tem **`"include": ["src/**/*.ts"]`**. Conferido por execução:
`npx tsc -p tsconfig.json --noEmit --listFiles | grep -c authority-portal.test.ts` = **0**. Ou seja:
**a bateria do repositório NÃO faz typecheck de `tests/`** — erro de tipo em teste só apareceria em
runtime (o `tsx` transpila sem checar). É **pré-existente** e fora do meu escopo (§5.1 não me dá
`tsconfig.json`). Para não entregar código não-checado, rodei o typecheck **avulso** do arquivo com
as mesmas `compilerOptions` (`strict`, `NodeNext`, `types node`): **ec=0, zero erros**
(log `T1-typecheck-teste.log`).

---

## §4 — ⚠ PROCEDIMENTO DE RISCO CONTROLADO: o vermelho-controle exige rodar o teste contra o `src/` SEM a C1

**Se eu morrer no meio deste passo, o sucessor restaura a C1 assim** (é a única janela em que o
worktree fica sem ela):

```
cp  <scratchpad>/san2-4b-c2/authority-password.WITH-C1.ts  src/modules/authority/authority-password.ts
sha256sum src/modules/authority/authority-password.ts   # DEVE ser f68bcfd01390dfdefa5f9e2973ed8685196e97dbf0b57ad17926355d3dc3ecb1
git diff --stat src/modules/authority/authority-password.ts   # DEVE voltar a 29 insercoes, 5 remocoes
```

O backup foi tirado **antes** de qualquer troca e teve o sha256 conferido contra o arquivo vivo. O
`src/` pré-fix vem de `git show HEAD:…` (o blob do `fca131a`), não de edição minha.

---

## §5 — A PROVA (§4-C2 + a exigência do mandato): o teste corrigido **MORDE**

> O mandato é explícito: *"um teste que passa pelo motivo errado é pior que um que falha"*. Verde não
> prova nada sozinho. O par é **vermelho→verde**, na **mesma** máquina, **mesmo** Node, **mesmo**
> arquivo de teste — só o `src/` muda.

### R2 · **VERMELHO-CONTROLE** — teste CORRIGIDO × `src/` **SEM a C1** · logs `red/red-r01…r30.log`

Script `vermelho-controle.sh` (restaura a C1 no `trap EXIT`, em qualquer caminho). `src/` posto no blob
do HEAD `fca131a` por `git checkout HEAD --`, **conferido durante a rodada**:
`grep -c 'keylen: hash.length'` = **1** · `grep -c 'isCanonicalBase64'` = **0** — era mesmo o pré-fix.

| medida | resultado |
|---|---|
| **execuções VERMELHAS (ec≠0)** | **30 / 30** |
| execuções verdes | **0 / 30** |
| agregado TAP dos 30 logs | `# tests 14` **30×** · `# pass 12` **30×** · `# fail 2` **30×** |
| **quais testes falharam** | `hashing: … base64 NÃO-CANÔNICO … (SAN2-4b — classe do padding)` → **30/30** · `hashing: … comprimento diferente do keylen … (SAN2-4b — pino do keylen)` → **30/30** |
| C1 restaurada no fim | sha256 `f68bcfd0…` ✔ (o próprio trap imprime) |

### R3 · **VERDE** — teste CORRIGIDO × `src/` **COM a C1** · logs `green/ap-r01…r30.log`

`sha256` do `src/` conferido **antes** da bateria: `f68bcfd0…`.

| medida | resultado |
|---|---|
| **execuções verdes (ec=0)** | **30 / 30** |
| agregado TAP dos 30 logs | `# tests 14` **30×** · `# pass 14` **30×** · `# fail 0` **30×** · `# skipped 0` **30×** · `# cancelled 0` **30×** |
| linhas `not ok` nos 30 logs | **0** |
| logs em disco | **30** (nenhuma rodada descartada) |
| **denominador novo, pinado por execução** | **14** — constante nas 30 (12 → 14, §3-C2.4 do plano) |

### O que estes dois números COMPRAM, em poder (o §4 manda declarar; não é enfeite)

1. **A detecção passou de ~0,39 % para 100 % por execução.** O arranjo antigo detectava um `src/`
   defeituoso a **1/256** por execução: P(0 em 40) = **85,5 %**, e eram precisas **~766** execuções
   para 95 % de poder. O arranjo novo detectou em **30/30**. Pela regra de três, a taxa de ESCAPE do
   teste corrigido é **< 3/30 = 10 %** a 95 % só com a bateria de arquivo — e **< 3/5 000 = 0,06 %**
   quando somada à sonda §2, que mediu os dois vetores determinísticos em **5 000/5 000** cada.
   **De ~766 execuções para 1.**
2. **A detecção é determinística por MECANISMO, não por sorte de N** — e é daí que vem a confiança,
   não do 30. Os dois vetores que reprovam (`=` removido → 100 %; truncamento a 31 B → 100 %) eram
   aceitos **sempre** pelo código pré-C1, porque decodificam para bytes que o pré-fix considerava
   válidos por construção. Não há moeda a girar.
3. **⚠ O TAMPER CORRIGIDO, SOZINHO, NÃO DETECTARIA A REVERSÃO DA C1 — e o vermelho PROVA isso.** No
   R2, `# pass 12` em 30/30: o teste do tamper (o (1) HASHING) **passou** contra o `src/` defeituoso,
   nas 30 execuções. É o comportamento correto de um teste de adulteração — o tamper novo adultera
   DADO, e dado adulterado era rejeitado antes e depois. **Mas significa que, se a C2 tivesse feito só
   o §3-C2.1 (trocar o char) e não os casos novos, a classe teria ficado com detecção ZERO** — pior
   que os 1/256 de antes, porque o único código que tropeçava nela teria parado de tropeçar. É
   exatamente o **risco nº 1 do §7 do plano**, medido em vez de temido, e é a resposta ao aviso que o
   antecessor deixou no §7.1 do diário da C1.
4. **As duas testemunhas são independentes e nenhuma é redundante:** no R2 falham **as duas**, e cada
   uma nomeia sua própria validação. Reverter só o round-trip derruba o teste do padding; reverter só
   o pino derruba o do keylen (§2, item 3 — vetores disjuntos, medidos).

### Invariantes de terreno conferidos (para a cadeira de escopo)

- **A lista-6 do §V.3 NÃO contém `authority-portal.test.ts`** — ela é `audit-security` ·
  `auth-identity-backfill-db` · `auth-identity-links-db` · `rls-tenant-isolation` ·
  `vehicle-identity-schema` · `impound-process-checklist-link-schema` (medicao-2 §V.3, l.454-456).
  Logo o **`(6, 37)` que o D29 do ciclo 5 vai consumir NÃO se move** com os meus +2 (§4-INV do plano).
- **Nenhum guard de contagem referencia este arquivo:** `grep -rn "authority-portal"` em
  `tests/db-catalog-write-guard.test.ts`, `tests/npm-test-runner-guard.test.ts` e `scripts/` = **vazio**.
  A `FROZEN_ALLOWLIST` do ratchet não é afetada (o arquivo não escreve catálogo).
- **Superfície de regressão da C2 = o próprio arquivo.** Nenhum outro teste ou script importa ou lê
  `tests/authority-portal.test.ts`; os outros 12 testes dele passam 14/14 nas 30 execuções verdes.

---

## §6 — O QUE ESTA PROVA **NÃO** COBRE (ressalvas explícitas — a parte que não se omite)

1. **Os testes exercitam `verifyPassword` por IMPORT DIRETO, não a rota HTTP de login.** Os stored
   malformados entram como argumento de função, não por `POST /portal/v1/authority/login`. Em produção
   o `stored` vem do **banco** e nenhum caminho deixa um cliente fornecê-lo (o único chamador em `src/`
   é `authority-portal.service.ts`, e `parseStored` não é exportada — conferido no §0 do diário da C1).
   O guard prova a **unidade**, e a ameaça que ele modela é **regressão do código**, não ataque pela
   rota. **Não medi a rota.**
2. **O guard pina a CLASSE por 5 vetores NOMEADOS, não por enumeração exaustiva do não-canônico.**
   Ficam **fora** do que asserto: base64url (`-` e `_`), espaço em branco embutido, `=` a mais. Caem na
   mesma validação de round-trip e devem ser rejeitados pelo mesmo mecanismo — mas **isso é argumento,
   não medição**, e segue argumento.
3. **O comprimento do SALT continua sem pino** (só o do hash). Um salt **canônico** de comprimento
   diferente de 16 segue aceito. É ressalva **herdada da C1** (§7.6 do diário do antecessor), não coisa
   que a C2 possa fechar: meu guard só pode testemunhar validação que exista. **Fica dito, de novo.**
4. **Suíte completa (`npm test`) NÃO foi executada** — é o §6.6 da bateria do BLOCO, exige cluster
   descartável `san2-4b-*` e não é deste mandato (C2 apenas). **Nenhum container foi criado**
   (`docker ps -a --filter name=san2-4b` = vazio).
5. **Os testes de authority que dependem de Postgres não foram executados**
   (`authority-portal-rls`, `authority-release-approval-rls`, `authority-removal-rls`) — o §5.2 do
   plano **proíbe** `erp-postgres`, inclusive leitura. Não há impacto esperado: minha edição é
   confinada a `tests/authority-portal.test.ts`, que **nenhum** outro arquivo importa (conferido).
   **Leitura/raciocínio, não execução — declarado como tal.**
6. **Uma máquina, um Node, um SO:** `N3SOH82`, **v20.19.5**, Windows 11 Pro 10.0.22631. O mecanismo é
   determinístico e independente de plataforma — **argumento**, não medição.
7. **A ressalva do §2.9 do plano (o 1/2 do jurado na suíte inteira) continua aberta** e este trabalho
   não a toca. Meço a função e o arquivo isolados, nunca o arranjo de suíte completa.
8. **`tests/` não é typechecked pela bateria do repositório** (§3, achado de terreno). Rodei o
   typecheck avulso do meu arquivo (ec=0), mas **a bateria oficial continua não pegando** erro de tipo
   em teste nenhum. Pré-existente, fora do §5.1, **não consertado por mim** — fronteira de escopo, não
   achado meu.
9. **O BLOCO NÃO ESTÁ FECHADO.** A C2 fecha a dívida que o §7.1 do diário da C1 apontou (a classe
   agora tem testemunha permanente, e C1+C2 estão na mesma árvore, prontas para o mesmo commit).
   **Faltam:** C3 (as duas portas do varredor), C4 (teardown resiliente), o registro §3-C5, o KPI
   §3-C6 e a bateria completa §6.

---

## §7 — Escopo, terreno de saída e estado

**Escopo — conferido por execução, não por promessa:**

```
git diff --name-only  ->  src/modules/authority/authority-password.ts   (a C1, INTOCADA por mim)
                          tests/authority-portal.test.ts                (a C2, MINHA unica edicao)
git status --short    ->   M src/modules/authority/authority-password.ts
                           M tests/authority-portal.test.ts
                           ?? agent-orchestration/omega/juntas/votos/SAN2-4b/   (diarios C1 e C2)
                           ?? agent-orchestration/omega/planos/SAN2-4b-plano.md (ja estava; e o plano)
git diff --stat       ->  2 arquivos, 109 insercoes, 7 remocoes
                          (teste 82+/2- = C2  |  src 29+/5- = C1, identico a abertura)
git diff --check      ->  ec=0
git rev-parse HEAD    ->  fca131adf84820503f57cd2383876222aa091cf7  (INALTERADO: nenhum commit, por mandato)
```

- **A C1 chegou e saiu intacta:** sha256 `f68bcfd01390dfdefa5f9e2973ed8685196e97dbf0b57ad17926355d3dc3ecb1`
  na abertura, **o mesmo** depois da minha edição, **o mesmo** depois do vermelho-controle (que a
  removeu por 30 execuções e a devolveu pelo `trap`). Conferido **três vezes**, por sha256, não por
  memória. `git diff --stat` do arquivo segue `29 inserções, 5 remoções`.
- **Remoções no arquivo de teste: exatamente 2 linhas** (o comentário antigo + a l.161 do tamper). Todo
  o resto do diff é **adição**. Os outros 12 testes seguem byte a byte como estavam (backup
  `authority-portal.test.ORIG.ts`, sha256 `81e01aca…`).
- **NÃO toquei:** `src/**` (a C1 é do antecessor; apenas a restaurei ao estado dela),
  `tests/helpers/auth-identity-fixture.ts` (C3), `tests/rls-tenant-isolation.test.ts` (C3/C4),
  `tests/db-catalog-write-guard.test.ts` (C3), `scripts/**`, `.github/**`, `Kpis/**`, `prisma/**`,
  contratos, `pendencias.md`, `status-geral.md`, planos alheios, `tsconfig.json`, `.claude/agents/**`,
  `.agents/**`.
- **`erp-postgres` e `erp-redis`: ZERO comandos, nem de leitura.** `docker ps` na saída:
  **`erp-postgres` Up 2 days (healthy)** e **`erp-redis` Up 2 days (healthy)** — o **mesmo uptime da
  abertura, atravessado inteiro** por este trabalho. Nenhum container `san2-4b-*` criado; **nenhuma
  porta alocada**, logo o `netsh` não foi necessário.
- **Nenhuma branch além de `fix/san2-4b-corrigir-arnes` foi tocada**; `demo/investidor` intocada.
- **Limpeza (§C5):** nenhum artefato de build gerado (`tsc --noEmit` não emite; nenhum `npm run build`,
  nenhum `dist/`). O scratchpad (**3,8 MB**) fica preservado — `c2-arith.mts`, `c2-arith2.mts`, 2 JSON
  de sonda, `T1-typecheck-teste.log`, `B1-baseline.log`, `G0-primeira-verde.log`, **30 logs vermelhos**
  e **30 verdes**, os 3 backups (`WITH-C1`, `PRE-FIX`, `test.ORIG`) e os 3 scripts — porque **as
  tabelas deste diário os citam por nome** e a reprodutibilidade por terceiro depende deles. Varrer o
  scratchpad é a limpeza do **fechamento do PR**, não deste passo. Nada rastreado apagado;
  `node_modules` intocado.

---

## §8 — Divergências mandato × plano (declaradas; nenhuma silenciosa)

1. **⚠ ERRATA AO §3-C1.1 DO PLANO — atribuição de mecanismo, medida.** O plano diz que o tamper antigo
   morre pela rejeição canônica (*"44 chars sem `=` → re-encode devolve com `=`"*). **Falso por
   execução:** 44 chars sem padding decodificam para **33 bytes**, que re-encodam para os **mesmos 44
   chars** — `canônico 5000/5000`. Quem o mata é o **pino do keylen**. A **conclusão** do plano
   (→ `false`) está certa; só o mecanismo estava trocado. Consequência prática: sem esta correção, um
   guard escrito para "cobrir a canonicidade" usando o vetor do tamper antigo **não cobriria** a
   canonicidade — foi por isso que incluí o `=` **removido** (43 chars), que é o vetor que a
   canonicidade pega sozinha. **Não é juízo sobre achado alheio; é medição sobre o texto do plano.**
2. **Acrescentei 4 asserções de FORMA ao tamper** (comprimento, canonicidade, 32 bytes, bytes
   diferentes). O §3-C2.1 pede só a troca do char. Sem elas, uma edição futura devolve o tamper ao
   padding e o teste segue verde — o defeito recomeça. **É o guard do guard**; se a cadeira de escopo
   discordar, são 4 linhas removíveis.
3. **Acrescentei o vetor do SALT** (caso (c) do teste de padding). O §3-C2.2 fala do hash; a C1 valida
   os **dois** campos, e o salt sem padding era buraco de **100 %** (§2-bis). Sem ele, metade da
   validação (1) fica sem testemunha.
4. **Acrescentei o TRUNCAMENTO a 31 bytes** além da extensão a 33 que o §3-C2.3 exemplifica ("ex.: 33
   bytes"). Está dentro do que o item pede (*comprimento diferente de 32*), e é o vetor que torna o
   guard **determinístico** (100 % contra 1/256) — é dele que vem quase todo o poder de detecção do §5.
5. **Preservei o tamper ANTIGO como caso (b)** em vez de descartá-lo: é o vetor histórico que o
   SAN2-4a mediu, e a classe perde o nome sem ele.
6. **Rodei o VERMELHO-CONTROLE (N=30), que o §4-C2 não pede.** O §4-C2 exige só as 30 verdes e manda
   declarar que 30 verdes têm poder de 11,1 % — o vermelho é **exigência do mandato**, e a razão de ser
   do bloco: sem ele, 30/30 verde não distingue "o guard morde" de "o guard é decorativo". Custo: ~30
   execuções. **Ele mudou a conclusão do §5** (item 3): foi o vermelho que mostrou que o tamper
   corrigido, sozinho, não detectaria a reversão da C1.
7. **Rodei um typecheck AVULSO do arquivo de teste**, fora da bateria do plano, porque medi que
   `npm run check` e `npm run lint` **não olham `tests/`** (§3). Sem isso, eu estaria entregando
   TypeScript que nada checou.
8. **Denominador: 14, não "13-14".** O §3-C2.4 deixa a escolha ao dev; agrupei em **2** `test()` (um
   por validação) para que a falha **nomeie a classe** — no vermelho-controle isso se pagou: dá para
   ler nos logs qual das duas validações caiu.

---

**ESTADO: correção C2 CONCLUÍDA e PROVADA acima do N exigido.**
Tamper corrigido para adulterar **DADO** (escolha medida: canônico, 32 bytes, bytes diferentes
5 000/5 000; **0 aceitos em 5 000 nas duas versões do módulo**) e **2 testes novos** pinando as duas
validações da C1 por vetores **disjuntos**. Prova: **30/30 VERMELHAS** contra o `src/` sem a C1
(`# fail 2` em 30/30, os dois guards nomeados) e **30/30 VERDES** com ela (`# tests 14` constante,
0 `not ok`). **A detecção da classe passou de ~1/256 por execução (≈766 execuções para 95 % de poder)
para 100 % por execução — determinística por mecanismo.** A dívida que o §7.1 do diário da C1 apontou
está paga: **C1 e C2 estão na mesma árvore, prontas para o MESMO commit**, e a classe tem testemunha
permanente. **Não commitei** (mandato). **Bloco NÃO fechado:** faltam C3, C4, §3-C5, §3-C6 e a
bateria §6.
