# C1 — `auditor-da-medicao-1` — evidência executada (SAN2-4a, PR #365, head `4199b92`)

Identidade NOVA. Junta de 3, maioria. Julgo o **mérito da medição 1** (`medicao-1-authority-portal.md`).
Voto-esqueleto criado ANTES de medir (P2): `01-medicao1-voto.json`, 3 itens `EM APURACAO`.
Apenso abaixo, após CADA item: comando · saída · veredito parcial.

- Worktree: `.claude/worktrees/san2-r` · branch `chore/san2-4a-medir-arnes`
- Criado em: 2026-08-31T15:34:16Z

---

## Item 0 — verificação de terreno mínima (head, e containers intocados)

```
$ git rev-parse HEAD                    -> 4199b9224035826facead204e84c2c31049f5105
$ git rev-parse --abbrev-ref HEAD       -> chore/san2-4a-medir-arnes
$ docker ps --format '{{.Names}}\t{{.Status}}'
erp-postgres    Up 2 days (healthy)
erp-redis       Up 2 days (healthy)
```
Head confere com o briefing. **Containers `Up 2 days` — nenhum comando foi enviado a eles por esta
cadeira** (só listagem de nomes/status); o uptime que atravessa o bloco fica **preservado** (§5).

**Conserto escondido na área que julgo — medido eol-neutro (§5), não por `git status`/`md5sum`:**
```
$ git -c core.autocrlf=false diff --exit-code main...HEAD -- src/ tests/ scripts/
rc=0 (VAZIO)
$ git -c core.autocrlf=false log --oneline main..HEAD --name-only -- src/modules/authority/ tests/authority-portal.test.ts
(vazio — nunca tocados na branch)
```
**Veredito parcial:** o alvo da medição 1 (`src/modules/authority/authority-password.ts` e
`tests/authority-portal.test.ts`) está **intocado**. A alegação "só mede, não conserta" resiste na
minha área. (O escopo do diff inteiro é da cadeira C3.)

---

## Item C1-1 — A causa `1/256` se sustenta?

### (a) Leitura do alvo no head (não citada do documento)

`tests/authority-portal.test.ts` l.45: `const FAST_PARAMS: ScryptParams = { N: 2**10, r: 8, p: 1, keylen: 32 };`
l.160-162 (o tamper e a asserção):
```ts
const tampered = hash.slice(0, -1) + (hash.at(-1) === "A" ? "B" : "A");
assert.equal(await verifyPassword("senha-forte-123", tampered), false);
```
`src/modules/authority/authority-password.ts` — os dois pontos que a cadeia acusa, conferidos na fonte:
```ts
l.58  return `scrypt$${params.N}$${params.r}$${params.p}$${salt.toString("base64")}$${derived.toString("base64")}`;
l.79  return { params: { N, r, p, keylen: hash.length }, salt, hash };   // <- keylen VEM DO STORED
l.90  if (derived.length !== parsed.hash.length) return false;
l.91  return timingSafeEqual(derived, parsed.hash);
```
Confere: o `keylen` é **relido do stored adulterado** (l.79), e o único guard antes do
`timingSafeEqual` é o de **comprimento** (l.90).

### (b) Aritmética reproduzida por execução própria (sonda minha, N=200.000, sem importar nada do repo)

`node scratchpad/c1-aritmetica.mjs`:
```json
{ "N": 200000,
  "hashB64_termina_em_igual": 200000,
  "ternario_viu_A_alguma_vez": 0,
  "distribuicao_ultimo_char_do_stored": { "=": 200000 },
  "decodificou_33_bytes": 200000,
  "primeiros_32_bytes_INTACTOS": 200000,
  "byte32_do_stored_adulterado_eh_zero": 200000,
  "distribuicao_byte32": { "0": 200000 } }
```
Os elos 1–3 **não são probabilísticos, são aritmética fechada**, e a minha execução independente
confirma nas 200.000: 32 B → 44 chars base64 com **exatamente um `=`** (32 mod 3 = 2 → 1 padding),
o ternário **nunca** vê `"A"` (0/200.000), e 44 chars **sem padding** = 264 bits = **33 bytes** cujo
último é `0x00` — porque o 43.º char carrega 2 bits finais **nulos** por construção do base64
canônico, e `"A"` vale 0. Prefixo de 32 B intacto em 200.000/200.000.

### (c) Elos 4–7 contra o `verifyPassword` REAL de `src/` (sonda minha, N=40.000, import por `file://`, zero edição)

`tsx scratchpad/c1-real.mts` (Node v20.19.5):
```json
{ "N": 40000, "concorrencia": 8, "dur_ms": 177919,
  "verifyPassword_real_devolveu_true": 150,
  "previsao_byte_a_byte_true": 150,
  "previsao_bateu_com_o_real": 40000,
  "previsao_errou": 0,
  "taxa_real": 0.00375,  "um_sobre_256": 0.00390625,
  "byte33_derivado_igual_a_zero": 150,
  "prefixo_scrypt_estavel_33_vs_32": 40000, "prefixo_instavel": 0,
  "ctrl_pos_senha_certa_true": 40000, "ctrl_neg_senha_errada_false": 40000,
  "excecoes": 0, "distinct_byte33_valores": 256 }
```
- **Elo 5** (prefixo-estabilidade do scrypt com `keylen=33` vs `32`): **40.000/40.000 estável**, 0
  instável. Não é coincidência — é propriedade do PBKDF2-HMAC-SHA256 de 1 iteração que fecha o
  scrypt: `keylen=33` = bloco T1 (32 B) + 1.º byte de T2; os 32 primeiros **não podem** mudar.
- **Elo 6** (`true` **sse** o 33.º byte derivado é `0x00`): `byte33_derivado_igual_a_zero = 150` e
  `verifyPassword_real_devolveu_true = 150` — **o mesmo número**, e a previsão acertou caso a caso.
  O byte 33 assumiu **256 valores distintos** → uniforme sobre um byte, que é de onde sai o 1/256.
- **Elo 7** (o que transforma hipótese em causa): **previsão byte a byte bateu com o veredito real
  em 40.000/40.000, `previsao_errou = 0`** — reproduzido por mim, em identidade nova, com sonda
  própria. Controles + e − limpos (40.000/40.000 cada), **0 exceções**.

### (d) A taxa medida bate com 1/256?

`node scratchpad/c1-stats.mjs` — z contra p = 1/256 = 0,390625 %:
```
E1 (doc)        5/1000    taxa=0.5000% esperado=3.906    z=+0.554  COMPATIVEL
E2 (doc)      390/100000  taxa=0.3900% esperado=390.625  z=-0.032  COMPATIVEL
E3 (doc)       93/20000   taxa=0.4650% esperado=78.125   z=+1.686  COMPATIVEL
SOMA doc      483/120000  taxa=0.4025% esperado=468.750  z=+0.659  COMPATIVEL
C1 PROPRIA    150/40000   taxa=0.3750% esperado=156.250  z=-0.501  COMPATIVEL
```
Os quatro z do documento **reproduzem ao milésimo**. A E2 (maior N) esperava 390,625 e observou
**390**. A minha execução independente cai do outro lado do valor teórico (z = −0,501) e também é
compatível — cinco medições, duas instâncias, nenhuma |z| ≥ 1,96.

**VEREDITO PARCIAL C1-1 — SUSTENTA-SE.** A causa não é só plausível: é **aritmeticamente fechada**
nos elos 1–3, **estruturalmente necessária** no elo 5 (PBKDF2 prefixo-estável) e **verificada
caso a caso** no elo 7, agora em duas instâncias independentes (20.000/20.000 do bloco + 40.000/40.000
minhas). A taxa 390/100.000 = 0,390 % contra 1/256 = 0,3906 % é a concordância mais forte do lote.
O documento **não arredondou a favor**: publicou E1 (0,50 %) e E3 (0,465 %), ambas acima do teórico,
em vez de esconder atrás da E2. Nenhum achado.

---

## Item C1-2 — O cálculo de poder está certo, e os verdes foram tratados honestamente?

### (a) A aritmética do poder, recalculada (`node scratchpad/c1-stats.mjs`)

```
n= 10  P(0 falhas)=96.162%   poder=3.84%
n= 30  P(0 falhas)=88.921%   poder=11.08%
n= 40  P(0 falhas)=85.508%   poder=14.49%
n=765  P(0 falhas)=5.008%    poder=94.99%
n=766  P(0 falhas)=4.988%    poder=95.01%
n para 95% de poder = ln(0.05)/ln(255/256) = 765.41 -> ceil = 766
P(>=1 falha em 2 execucoes) = 0.7797%
```
Confere **item a item** com o publicado: 88,92 % / 96,16 % / **85,51 %** (o "85,5 %" do briefing),
poder 11,1 % e 3,8 %, e **≈766** execuções para 95 % — o teto está certo, e é apertado (765 dá
94,99 %, 766 dá 95,01 %); quem arredondasse para 765 erraria. O `0,780 %` do §4.7-2 também confere
(0,7797 %). **Nenhum número de poder do documento está errado.**

Conferi ainda a **premissa** do cálculo, que é o que o tornaria falso: o `P(0 em n)` só vale se a
asserção rodar **uma vez por execução do arquivo**. Lido na fonte: `tests/authority-portal.test.ts`
tem **um** `test(...)` de hashing com **uma** `assert.equal(await verifyPassword(..., tampered), false)`
(l.161-162). Uma asserção por execução — a ponte F3→F1/F2 é válida.

Sobre somar F1+F2 = 40 para o poder: é legítimo **aqui** e não contradiz o "formas não somadas".
A taxa continua publicada **por forma** (0/30 e 0/10 separados); o 40 aparece só na frase de
**poder**, que soma *oportunidades de observar* — e isso exige que a taxa não dependa da forma, que
é exatamente o que a causa estabelece (cadeia sem nenhum elo temporal, elos 1-7). E o documento
publica `P(0 em 30)` e `P(0 em 10)` **separadamente** também, de modo que cada forma pode ser
conferida sozinha. Cuidadoso, não frouxo.

### (b) A ressalva foi mantida sem suavizar — ou virou "não reproduz, pendência fechada"?

**Mantida, e endurecida.** Verbatim do §4.7-1: *"nada aqui refuta aquilo — a ressalva do antecessor
quanto a F1/F2 permanece **inteira**"*. E o §4.7-2 vai além do exigido, declarando contra o próprio
resultado: sob 1/256, ver ≥1 falha em 2 execuções tem **0,780 %**, logo *"ou o jurado teve azar de
1-em-128, ou **existe uma segunda contribuição presente apenas no arranjo de suíte inteira**. Estas
medições **não decidem** entre as duas hipóteses"*. Isso é o oposto de suavizar: a causa nomeada
**não é vendida como explicação completa** do vermelho original.

A **forma** do vermelho original foi conferida na fonte primária, não aceita do documento —
`pendencias.md:3890-3896`: *"falhou com `ERR_ASSERTION true !== false` em **1 de 2** rodadas da
**suíte inteira** do jurado"*. Confere: forma diferente (suíte inteira × arquivo isolado), máquina
diferente. A alegação de não-refutação está correta na sua premissa.

**A pendência NÃO foi fechada** — conferido no head, não no documento:
```
$ git -c core.autocrlf=false diff --exit-code main...HEAD -- agent-orchestration/controle/pendencias.md
rc=0 (intocada)
$ sed -n '3898,3899p' agent-orchestration/controle/pendencias.md
- **status:** ABERTA · **severidade:** MEDIA · **dono:** a atribuir
```
Continua **ABERTA**, com o mesmo dono a atribuir. O bloco mediu, nomeou a causa e **deixou a
pendência de pé** para o 4b — que é o padrão 4a/4b funcionando.

Ainda a favor da honestidade: a **OBS-3** vira a crítica contra o próprio critério que teria
absolvido o bloco — *"N = 10 tem 96,2 % de chance de sair verde com o defeito presente… o critério
de N da pendência era, ele próprio, cego para a classe de defeito que ela perseguia"*. Quem quisesse
enterrar o assunto tinha aqui o álibi perfeito (*"rodei o N≥10 que a pendência pediu, deu verde"*) e
fez o contrário: publicou que o álibi não vale.

**VEREDITO PARCIAL C1-2 — CORRETO E HONESTO.** Aritmética de poder exata (inclusive o teto 766, que
é apertado); premissa da ponte conferida na fonte; ressalva preservada **inteira** e reforçada com o
número que a explica; a segunda hipótese (contribuição só na suíte inteira) fica **declarada como
não decidida** em vez de descartada; pendência **aberta**. Nenhum achado.

---

## Item C1-3 — A contenção da F2 foi provada ou apenas afirmada?

### (a) As durações, recalculadas das próprias tabelas (`node scratchpad/c1-dur.mjs`)

```
F1: {"n":30,"min":2637,"max":2765,"media":2703.83}   amplitude = 128
F2: {"n":10,"min":3902,"max":4797,"media":4375}
sobreposicao das faixas? maxF1=2765  minF2=3902 -> NENHUMA (disjuntas)
```
A transcrição do documento é **exata**: N=30 e N=10, mín/máx das duas formas e a amplitude 128 da F1
conferem com as 40 linhas das tabelas. **A contenção está PROVADA, e por uma via mais forte do que a
percentagem que o documento escolheu citar:** as duas faixas são **disjuntas** — a rodada F2 **mais
rápida** (3 902 ms) é 41,1 % mais lenta que a rodada F1 **mais lenta** (2 765 ms). Não há uma única
rodada F2 que pudesse ser confundida com uma rodada F1. Isso é medição, não intenção.

### (b) Mas o "+78 %" não sai de nenhum pareamento declarado — ACHADO

```
min/min        : 48.0%   <- o "+48 %" e EXATO
max/max        : 73.5%
maxF2/mediaF1  : 77.4%
maxF2/minF1    : 81.9%
minF2/maxF1    : 41.1%
```
O limite inferior **+48 %** é exato (mín F2 ÷ mín F1). O **+78 %** não corresponde a nenhum
pareamento: o par natural do intervalo citado (máx↔máx) dá **73,5 %**, e o pareamento mais generoso
ainda defensável (máx F2 ÷ **média** F1) dá **77,4 %** — que arredonda para 77 %, não 78 %. O
documento apresenta um intervalo `2 637–2 765 → 3 902–4 797` e logo em seguida `+48 % a +78 %`, o
que faz o leitor parear extremo com extremo; nesse pareamento o número é **73,5 %**. **A fórmula do
segundo limite não está declarada** — que é exatamente o padrão "número sem forma" que o resto deste
documento cumpre com rigor incomum (§F3 declara N, forma, z e IC de cada execução).

**Origem/data (§C7.1-ter):** a frase está em `medicao-1-authority-portal.md:129` e `:229`, arquivo que
**não existe na `main`** e nasceu no commit `116aa46` (2026-08-31) **desta branch** →
escopo **`dentro-do-bloco`**. **Gravidade BAIXA:** não altera conclusão nenhuma — a contenção está
sobre-provada pelas faixas disjuntas, o limite inferior está certo, e nenhum resultado da medição
(0/10, denominador 12, causa 1/256) depende desse segundo limite. É imprecisão de redação de um
número, não medição errada. **Não proponho correção** (§C7.4-bis); registro para o 4b.

### (c) Os processos de carga sobraram na máquina?

Conferido **agora, por instrumento independente do usado pelo bloco** (o bloco usou `kill -0` do Git
Bash; eu fui ao nível do Windows, justamente porque o próprio bloco publicou que PID de Git Bash não
é PID do Windows):
```
PID 17126..17132 -> MORTO (os 7)
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | ? { $_.CommandLine -match 'busy' }
  -> NENHUM (0 sobreviventes)
total de node.exe vivos agora: 2
```
A segunda checagem é a decisiva e **não depende do namespace de PID**: varre **todos** os `node.exe`
da máquina pela linha de comando e não acha nenhum busy-loop. **0 sobreviventes CONFIRMADO por esta
cadeira**, não herdado do documento. A máquina do dono ficou limpa.

A coluna `carga viva 7/7` é medição **por rodada** (`kill -0` antes de cada uma), como o documento
afirma — e `kill -0` sobre processo que o próprio shell criou é uso legítimo do PID de Git Bash
(a armadilha do `$!` que o bloco documentou na M3 é outra: correlacionar com o mundo Windows).

**VEREDITO PARCIAL C1-3 — PROVADA (não apenas afirmada), com 1 achado BAIXA.** A contenção é real e
está provada por faixas de duração **disjuntas** (mín F2 > máx F1 em 41,1 %), com carga conferida
rodada a rodada; os 7 PIDs estão mortos e **0 busy-loops sobreviveram**, confirmado por mim em
instrumento independente. O único reparo é o **+78 %** sem pareamento declarado (o valor máx↔máx é
**73,5 %**) — BAIXA, `dentro-do-bloco`, sem efeito sobre nenhuma conclusão.

---

## FECHO — voto da cadeira C1

**APROVADO.** Os três itens foram medidos por **execução própria**, não por leitura do documento:
a causa `1/256` é aritmeticamente fechada e foi reproduzida contra o `verifyPassword` **real**
(previsão 40.000/40.000, `previsao_errou = 0`); o cálculo de poder confere item a item, inclusive o
teto apertado de 766; a ressalva de que F1/F2 **não refutam** o vermelho 1/2 foi mantida **inteira** e
endurecida, com a pendência deixada **ABERTA**; e a contenção da F2 está provada por faixas
disjuntas, com 0 sobreviventes confirmados em instrumento independente.

**1 achado, BAIXA, `dentro-do-bloco`, não bloqueia:** `C1-A1` — o limite superior "+78 %" da
contenção não corresponde a pareamento declarado (máx↔máx = **73,5 %**). Origem provada: commit
`116aa46` (2026-08-31), arquivo inexistente na `main`. **Não proponho correção** (§C7.4-bis).

**Nada foi commitado.** Escrevi **apenas** os dois artefatos desta cadeira
(`01-medicao1-voto.json`, `01-medicao1-evidencia.md`). Sondas próprias ficaram no scratchpad da
sessão (`c1-aritmetica.mjs`, `c1-real.mts`, `c1-stats.mjs`, `c1-dur.mjs`), **fora do repositório**,
para reprodutibilidade por terceiro. `erp-postgres`/`erp-redis` **intocados** (`Up 2 days`).
