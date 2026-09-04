# EVIDENCIA — C1 auditor-da-correcao-de-produto (SAN2-4b, PR #366, head 2d2d16d)

Identidade NOVA. Quorum UNANIMIDADE de 3. Registro incremental: cada item e apensado ao ser medido.

## ITEM 1 — a correcao do `src/` resolve a CAUSA? (vermelho-controle REEXECUTADO por esta cadeira)

**Metodo declarado.** Nao reusei a sonda do dev. Escrevi sonda propria
(`scratchpad/c1-jurado/jurado-c1-probe.mts`, 88 linhas) que importa o modulo alvo por `file://` URL —
**zero edicao do repo** — e mede **9 vetores** + 2 controles. O modulo nao tem import relativo
(so `node:crypto`), entao a copia pre-fix roda fora da arvore sem tocar nada.

Alvos, por sha256:
```
git show 45c3b97:src/modules/authority/authority-password.ts > prefix-authority-password.ts
sha256  da4a192e85682177b0f53063747709db654a22a6bbfdccca285e87bd5b62e085  prefix (SEM a C1)
sha256  f68bcfd01390dfdefa5f9e2973ed8685196e97dbf0b57ad17926355d3dc3ecb1  src/ do head 2d2d16d (COM a C1)
grep no prefix -> `79:  return { params: { N, r, p, keylen: hash.length }, salt, hash };`
                  (sem isCanonicalBase64, sem pino — controle limpo)
```

**A leitura do codigo.** A causa nomeada e `keylen: hash.length` (l.79 do pre-fix): o tamanho da chave
derivada era **funcao do dado de entrada**. O conserto (l.92-93 do head) faz duas coisas: rejeita
`hash.length !== AUTHORITY_SCRYPT_PARAMS.keylen` **e** devolve `keylen: AUTHORITY_SCRYPT_PARAMS.keylen`.
Depois disso, `derive()` produz **sempre 32 bytes** e `timingSafeEqual` compara **os 32 inteiros** — o
scrypt prefixo-estavel deixa de ter prefixo a comparar. Isso e conserto **estrutural da causa**, nao
mascara do sintoma: o valor deixa de vir do input, em vez de o input ser filtrado caso a caso.

### R1 — VERMELHO-CONTROLE (`prefix`, sem a C1) · conc 8 · Node v20.19.5 · dur 134 931 ms
```
v1_padding_trocado        aceitos=   75/ 20000  exc=0  naoCanon=0     comp={"33":20000}
v2_estendido_33_aleatorio aceitos=   83/ 20000  exc=0  naoCanon=0     comp={"33":20000}
v3_truncado_31            aceitos= 5000/  5000  exc=0  naoCanon=0     comp={"31":5000}
v4_padding_removido       aceitos= 5000/  5000  exc=0  naoCanon=5000  comp={"32":5000}
v5_salt_sem_padding       aceitos= 5000/  5000  exc=0  naoCanon=0     comp={"32":5000}
v6_dado_1o_char           aceitos=    0/  5000  exc=0  naoCanon=0     comp={"32":5000}
v7_truncado_1             aceitos= 5000/  5000  exc=0  naoCanon=0     comp={"1":5000}
v8_whitespace             aceitos= 5000/  5000  exc=0  naoCanon=5000  comp={"32":5000}
v9_base64url              aceitos= 5000/  5000  exc=0  naoCanon=3654  comp={"32":5000}
ctrl+ 5000/5000  |  ctrl- 0/5000
```
**A SONDA ACUSA.** v1 = 0,375 % e v2 = 0,415 % — os dois indistinguiveis de 1/256 = 0,3906 %
(|z| = 0,25 e 0,17). O bloco publicou 79/20 000 e 18/5 000; **reproduzi a mesma ordem de grandeza com
sonda independente**. So depois disto o verde significa algo.

### G1 — VERDE (`src/` do head `2d2d16d`, com a C1) · dur 274 629 ms
```
v1_padding_trocado        aceitos=    0/100000     v2_estendido_33  aceitos=    0/100000
v3_truncado_31            aceitos=    0/ 10000     v4_padding_removido aceitos= 0/ 10000
v5_salt_sem_padding       aceitos=    0/ 10000     v6_dado_1o_char  aceitos=    0/ 10000
v7_truncado_1             aceitos=    0/ 10000     v8_whitespace    aceitos=    0/ 10000
v9_base64url              aceitos= 2630/ 10000  (ver E1 abaixo — sao os NO-OP, nao bypass)
ctrl+ 10000/10000  |  ctrl- 0/10000  |  excecoes 0 em TODAS as fases
```

### E1/E2/E3 — checagens dirigidas (`jurado-c1-extra.mts`)
```
POS E1 base64url: EFETIVOS    0/1484 aceitos | NO-OP(identidade) 516/516 aceitos
PRE E1 base64url: EFETIVOS 1468/1468 aceitos | NO-OP(identidade) 532/532 aceitos
POS E3 salt canonico de 17B -> false      PRE E3 -> false
POS/PRE E2  N=2^30 | N=1000 | r=2^20 | p=2^30 -> *** LANCOU *** ERR_CRYPTO_INVALID_SCRYPT_PARAMS
POS/PRE E2  N=2 -> retornou false
```
O `2630/10000` do v9 **nao e bypass**: quando o hash nao contem `+` nem `/`, a troca por `-`/`_` e
**identidade** e o stored e o legitimo (P(sem +//) = (62/64)^43 = 0,26, e 2630/10000 = 0,263 — bate).
Isolando so as transformacoes efetivas: **0/1484 pos-fix contra 1468/1468 pre-fix**. Vetor fechado.
E3 mostra que o salt **nao pinado** (ressalva §7.6 do dev) **nao e buraco**: salt diferente = derivacao
diferente = `false`.

### O par lado a lado — 8 vetores, nao 2
| vetor | PRE (sem C1) | POS (com C1) |
|---|---|---|
| v1 padding trocado (33 B) | **75/20 000** (0,375 %) | **0/100 000** |
| v2 extensao canonica 33 B | **83/20 000** (0,415 %) | **0/100 000** |
| v3 truncado a 31 B | **5 000/5 000 = 100 %** | **0/10 000** |
| v4 padding do hash removido | **5 000/5 000 = 100 %** | **0/10 000** |
| v5 padding do salt removido | **5 000/5 000 = 100 %** | **0/10 000** |
| v7 truncado a **1 byte** | **5 000/5 000 = 100 %** | **0/10 000** |
| v8 whitespace injetado | **5 000/5 000 = 100 %** | **0/10 000** |
| v9 base64url (efetivos) | **1 468/1 468 = 100 %** | **0/1 484** |
| ctrl + / ctrl − | 5 000/5 000 · 0/5 000 | 10 000/10 000 · 0/10 000 |

**ACHADO A FAVOR DO BLOCO, e contra a sua propria narrativa: a classe era PIOR do que "1/256".**
O `keylen` vindo do input tornava **qualquer prefixo do hash** uma credencial valida —
**um unico byte** autenticava, 5 000/5 000. O bloco so mediu os dois vetores raros (1/256) e descreve a
classe por eles; os vetores **deterministicos de 100 %** (v3, v4, v5, v7, v8, v9) estao nomeados no
comentario do teste da C2 mas **nao entram na caracterizacao do briefing** ("de ~1/256 para 100 %").
Isso **subdimensiona** o defeito corrigido — nao o superdimensiona. Nao e conclusao alem da medicao;
e medicao **aquem** do que o proprio conserto entrega. Registro como observacao, `nao-bloqueia`.

**Nenhum vetor escapou.** Motivo de mecanismo, nao de amostra: com `keylen` constante, todo stored ou
tem 32 bytes canonicos (e ai `timingSafeEqual` compara os 32 inteiros) ou e rejeitado **antes de
qualquer derivacao**. Os dois guards pegam conjuntos **disjuntos** e nao redundantes — v4/v5/v8/v9 so
morrem pela canonicidade (32 === 32 para o pino); v1/v2/v3/v7 so morrem pelo pino (v2 e canonico
20 000/20 000). **Nenhuma das duas validacoes sozinha fecharia a classe** — o que confirma, por
execucao independente, a errata do dev ao §3-C1.1 do plano.

**Ressalva pre-existente, nomeada, NAO bloqueante:** `verifyPassword` **LANCA**
`ERR_CRYPTO_INVALID_SCRYPT_PARAMS` para stored com `N`/`r`/`p` fora de faixa (E2), identico **antes e
depois** — origem: o parse de `N/r/p` e do Ω5P PR-18a e as l.74-77 estao **intocadas** no diff
(`git diff 45c3b97 2d2d16d`). Nao falsifica o comentario reescrito, que promete `false` para
"malformado, nao-canonico ou de comprimento errado" — e um stored com N=2^30 **passa** no `parseStored`,
logo nao e "malformado" no sentido do proprio codigo. `escopo: pre-existente` · `gravidade: baixa`.

**VEREDITO DO ITEM 1: APROVADO.** A correcao ataca a causa (o `keylen` deixa de ser funcao do input),
o vermelho-controle foi **reexecutado por esta cadeira com sonda propria** e **acusou**, e o verde cobre
**6 vetores a mais** do que o bloco mediu.

---

## ITEM 2 — o teste MORDE? (e o achado central se sustenta?)

**Metodo.** `tests/authority-portal.test.ts` do head `2d2d16d`, **inalterado**, rodado contra quatro
versoes diferentes do `src/`. Troca por `cp` com `trap EXIT` e sha256 conferido **nas tres sessoes**:
`ANTES = f68bcfd01390dfdefa5f9e2973ed8685196e97dbf0b57ad17926355d3dc3ecb1` = `DEPOIS`, `git status
--porcelain -- src/ tests/` **vazio** ao final de cada uma. **Nao commitei.**

### Baseline — `src/` do head (COM a C1)
```
ec=0 | # tests 14 | # pass 14 | # fail 0 | # skipped 0 | # cancelled 0 | not ok = 0
ok 4 - hashing: stored com base64 NÃO-CANÔNICO é rejeitado (SAN2-4b — classe do padding)
ok 5 - hashing: hash canônico de comprimento diferente do keylen é rejeitado (SAN2-4b — pino do keylen)
```
Denominador **14** confirmado por execucao (12 -> 14 = os dois guards novos, casos **4** e **5**).

### VERMELHO — mesmo teste, `src/` SEM a C1 (blob `45c3b97`) · **5 execucoes**
```
verm-r1 | ec=1 | # tests 14 | # pass 12 | # fail 2 | falharam=[4,5]
verm-r2 | ec=1 | # tests 14 | # pass 12 | # fail 2 | falharam=[4,5]
verm-r3 | ec=1 | # tests 14 | # pass 12 | # fail 2 | falharam=[4,5]
verm-r4 | ec=1 | # tests 14 | # pass 12 | # fail 2 | falharam=[4,5]
verm-r5 | ec=1 | # tests 14 | # pass 12 | # fail 2 | falharam=[4,5]
asseracoes:  expected: false / actual: true / operator: 'strictEqual'   (x2)
```
**O teste morde, e morde DETERMINISTICAMENTE (5/5), nao a 1/256.** As duas falhas sao **exatamente**
os dois guards novos — nenhum outro caso do arquivo se mexeu. Motivo de mecanismo (item 1): os vetores
que abrem os casos 4 e 5 sao os **100 %** (v4 `semPadding` e v3 `truncado_31`), nao os 1/256.

### O ACHADO CENTRAL — **SUSTENTA-SE**, confirmado por duas testemunhas independentes
`# pass 12` no vermelho significa que o **caso 1** — o que carrega o **tamper corrigido** — **PASSOU**
contra o `src/` defeituoso, nas 5 execucoes. Segunda testemunha, independente do runner: a minha sonda
mediu o mesmo vetor isolado, `v6_dado_1o_char` = **0/5 000 aceitos contra o blob pre-fix**. O tamper
corrigido e rejeitado pelo codigo defeituoso **por construcao** — ele adultera DADO dentro de 32 bytes,
que o `timingSafeEqual` sempre pega, com ou sem o defeito.

E a testemunha antiga desaparece: o tamper velho (o `=` -> `A`, unico ponto do repositorio que percorria
a classe, a 1/256) foi **substituido**. Conferi que nao ha outra: `grep -rn verifyPassword tests/` da
**4 arquivos**, e fora do `authority-portal` os unicos usos sao stored **legitimo**
(`authority-credential.test.ts:39/55/70`) e um `"invalid-hash"` de outro modulo
(`auth-credentials.test.ts:37`, `src/modules/auth`). **`authority-portal.test.ts` e a UNICA testemunha
da classe no repositorio inteiro.** Logo: **C2 sem os dois guards = deteccao ZERO, pior que 1/256.**
A conclusao do bloco **nao e retorica; e o que a execucao mostra.**

### A prova contra "correcao que mascara": **MUTACAO DE UMA METADE DE CADA VEZ**
Construi dois meio-consertos a partir do `src/` do head (ancoras conferidas por `assert` — a mutacao
**mutou**, 136 -> 135 linhas, sha256 distintos):
- **M1 = so a canonicidade** (pino removido, `keylen: hash.length` de volta)
- **M2 = so o pino** (guard de canonicidade removido)
```
M1-so-canonicidade | # pass 13 | # fail 1 | falharam=[5]    (3 execucoes: r1, bis, ter — identicas)
M2-so-pino         | # pass 13 | # fail 1 | falharam=[4]    (3 execucoes: r1, bis, ter — identicas)
verde-controle (head inteiro) | ec=0 | # tests 14 | # pass 14 | # fail 0
```
**Cada metade sozinha deixa a outra metade da classe VIVA, e o teste diz QUAL.** Os dois guards pegam
conjuntos **disjuntos**: nenhum e redundante, nenhum e teatro. Um bloco que tivesse feito so metade do
conserto **teria sido pego por este proprio arquivo de teste** — que e o oposto de mascarar. Isto
confirma por execucao independente a **errata do dev ao §3-C1.1 do plano** (o tamper antigo NAO morre
pela canonicidade; morre pelo pino) — errata que o bloco registrou por escrito no corpo do commit em
vez de esconder.

**VEREDITO DO ITEM 2: APROVADO.** Denominador 14 por execucao; vermelho 5/5 com `# fail 2` nos guards
4 e 5; achado central confirmado por duas testemunhas; e a correcao parcial provada insuficiente pelos
dois meio-mutantes.

---

## ITEM 3 — a classe esta REALMENTE fechada? (vetores nomeados testados por mim + caca a fuga)

### 3.1 — Os dois vetores que o bloco nomeia, medidos por esta cadeira
| vetor nomeado | PRE (blob 45c3b97) | POS (head 2d2d16d) |
|---|---|---|
| **`=` removido** (43 chars, mesmos 32 bytes, nao-canonico) | **5 000/5 000 = 100 %** | **0/10 000** |
| **hash truncado a 31 bytes** (canonico) | **5 000/5 000 = 100 %** | **0/10 000** |

Os dois sao **deterministicos**, nao 1/256 — confirmados. E o truncamento nao para em 31:
**1 byte tambem autenticava** (`v7`, 5 000/5 000).

### 3.2 — A deteccao: de **~1/256 por execucao** para **100 %, deterministica por mecanismo** — CONFIRMADO
- **Antes.** Li o teste **antigo** (`git show 45c3b97:tests/authority-portal.test.ts`, l.152-166): a UNICA
  asseracao que percorria a classe era o tamper da l.161; o caso 2 so mede `length === 32` sobre stored
  **legitimo** e nao toca a classe. Como essa asseracao roda **uma vez por execucao**, a taxa de deteccao
  por execucao **e igual** a taxa de aceitacao do vetor, que medi em **75/20 000 = 0,375 %**, ou ~1/267.
  **Metodo declarado:** derivei o numero da taxa de aceitacao medida em N=20 000, **nao** rodei o arquivo
  antigo 20 000 vezes — e aritmeticamente a mesma quantidade, a 1/1000 do custo, e digo isso para que
  ninguem leia como execucao de arquivo.
- **Depois.** **5/5 execucoes** vermelhas com `# fail 2`, sempre os casos **4 e 5** (item 2). Deterministico
  **por mecanismo**: os vetores que abrem esses casos sao os de **100 %** (`semPadding` e `truncado_31`),
  medidos 5 000/5 000 e 10 000/10 000 — nao dependem de sorte.

### 3.3 — Caca a vetor de FUGA (12 formas novas, alem das 9 do item 1)
```
                                             POS-FIX    PRE-FIX
  W01 payload vazio                          false      false
  W02 '=' extra no fim                       false      TRUE
  W03 '=' no MEIO do payload                 false      TRUE
  W04 salt vazio                             false      false
  W05 CR/LF no fim do payload                false      TRUE
  W06 char fora do alfabeto (*) injetado     false      TRUE
  W07 estendido 32+8 bytes canonico          false      false
  W08 N com espaco ' 1024'                   TRUE       TRUE   <-- unico sobrevivente
  W09 prefixo 'scrypt' em caixa alta         false      false
  W10 salt canonico truncado a 8B            false      false
  W11 stored legitimo com keylen=16          false      TRUE
  W11 stored legitimo com keylen=64          false      TRUE
  W12 caminho feliz (keylen=32)              TRUE       TRUE
```
**21 vetores testados no total (9 + 12). Um unico sobrevive, e nao e da classe.**

**W08 — `scrypt$ 1024$8$1$...` verifica `true`.** `Number(" 1024") === 1024` em JS, entao o campo `N`
aceita espaco (e tambem `0x400`, `1e3`). **Nao e bypass de credencial:** a senha CORRETA continua exigida,
os 32 bytes continuam comparados inteiros, e alterar o VALOR de `N` quebra a verificacao (medido: `N=2`
-> `false`). E laxidez de **canonicalizacao do campo numerico**, cosmetica, exploravel apenas por quem ja
tem escrita no banco.
- `escopo`: **pre-existente**, com evidencia de origem: a linha `const N = Number(parts[1])` esta
  **INTOCADA** no diff (`git diff 45c3b97 2d2d16d -- ...authority-password.ts | grep 'Number(parts'` =
  **vazio**) e nasce em **`5a6a91b`, 2026-07-28** ("Ω5P PR-18a — authority-portal FUNDACAO", #306).
  Comportamento **identico** antes e depois do bloco.
- `gravidade`: **baixa** · **NAO bloqueia** · vira pendencia nomeada, dono a definir.

**W11 — a pergunta do lockout, respondida.** Pos-fix, um stored legitimo com `keylen` != 32 passa a ser
**rejeitado**. Nenhuma credencial viva e afetada, conferido na origem e nao suposto: o unico produtor de
stored do `authority` e `AuthorityCredentialService`, cujo `scryptParams` **default e
`AUTHORITY_SCRYPT_PARAMS`** (l.26), e **todo literal de `keylen` do repositorio e 32**
(`grep -rn keylen src/ tests/ scripts/ prisma/`). O comentario novo do codigo ja diz que rotacionar
`keylen` exige **versao nova do formato** — declaracao correta e honesta. **Sem achado.**
`src/modules/auth/services/password.service.ts` tem `hashPassword`/`parseScryptHash` **proprios**
(formato de 7 campos, outro modulo) — nao alcancados pela C1, como o dev declarou.

### 3.4 — Armadilhas do §4 do briefing: checadas, nenhum achado falso fabricado
- `git status --porcelain` mostrou ` M agent-orchestration/controle/pendencias-indice.md`, que **nao existia
  na minha abertura e que eu NAO toquei**. Medi eol-neutro antes de chamar de achado:
  `git diff --exit-code -- .../pendencias-indice.md` -> **ec=0**, `core.autocrlf` = **true**. E o **fantasma
  de CRLF** que o §4 nomeia — **nao e achado**, e nao e defasagem.
- `git diff --exit-code -- src/ tests/` -> **ec=0**: a arvore que julguei e byte-a-byte a do head.
- **Base viva PRESERVADA:** `docker ps` (listagem do daemon, **zero comandos a container**) ->
  `erp-postgres | Up 2 days (healthy)` · `erp-redis | Up 2 days (healthy)` — o mesmo uptime que atravessou
  o bloco. Nao subi cluster (nada aqui precisa de banco: `CORE_SAAS_PERSISTENCE=memory`).
- `git rev-parse HEAD` = `2d2d16db69afa22682866b8bb414e8afc35a5e80`, **nao commitei**; `git diff --check` ec=0.

**VEREDITO DO ITEM 3: APROVADO.** A classe esta fechada por **mecanismo**, nao por amostra: com `keylen`
constante do sistema, todo stored ou tem 32 bytes canonicos — e ai o `timingSafeEqual` compara os 32
inteiros — ou morre **antes de qualquer derivacao**. 21 vetores testados, 20 fechados, e o unico
sobrevivente e pre-existente, de outra classe e sem bypass.
