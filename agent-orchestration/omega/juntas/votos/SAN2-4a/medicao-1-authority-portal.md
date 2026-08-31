# SAN2-4a — MEDIÇÃO 1: intermitência do `authority-portal`

> **Diário de execução**, gravado incrementalmente (§3.0.5 do plano — "o que fica só em contexto não
> sobrevive"). Agente: `dev-san2-4a` (identidade nova; não achou nada em ciclo anterior, não vota —
> §C7.4-bis). Mandato: **a MEDIÇÃO 1 apenas** (§3.1 do plano `SAN2-4a-plano.md`).
> **Este bloco NÃO CONSERTA NADA** (§0/§5.2). Correção identificada = observação registrada, nunca
> aplicada.

## 0. Divergência mandato × plano (registrada, §A2)

O plano §1.3/§5.1 nomeia como relatório canônico
`agent-orchestration/omega/medicoes/SAN2-4a-medicao.md` (arquivo NOVO, diretório NOVO), com "toda a
tabela rodada-a-rodada". O mandato desta instância manda escrever **este** arquivo
(`agent-orchestration/omega/juntas/votos/SAN2-4a/medicao-1-authority-portal.md`) e **tocar apenas
ele**. Caminho coberto pelo §5.1 (`agent-orchestration/omega/juntas/**`), mas o parentético daquele
item diz "criados pelos papéis dela, não pelo dev".
**Resolução adotada:** obedecer ao mandato quanto ao CAMINHO (escrevo só aqui) e ao plano quanto ao
CONTEÚDO (tabela rodada-a-rodada, N, forma, causa, logs nomeados). Quem consolidar o
`SAN2-4a-medicao.md` copia daqui verbatim. Divergência registrada, não escolhida em silêncio.

## 1. Terreno declarado (transcrito, não lembrado)

| Item | Valor medido | Comando |
|---|---|---|
| Worktree | `c:\Users\AMP\Documents\GitHub\ERP_Techsolutios\.claude\worktrees\san2-r` | `pwd` |
| Branch | `chore/san2-4a-medir-arnes` | `git rev-parse --abbrev-ref HEAD` |
| Head | `26ede7301a54277b19baec56cc77499b70177039` (= `26ede73`, o do plano) | `git rev-parse HEAD` |
| Working tree | limpo salvo `?? agent-orchestration/omega/planos/SAN2-4a-plano.md` (o plano, untracked) | `git status --porcelain` |
| Node | **v20.19.5** | `node -v` |
| npm | 11.7.0 | `npm -v` |
| `node_modules` | diretório REAL do worktree (222 entradas); `fsutil reparsepoint query node_modules` → "não é um ponto de nova análise" ⇒ **não é junction/symlink** (proibição de 26/08 respeitada) | `ls -ld` + `fsutil` |
| Containers vivos | `erp-postgres`, `erp-redis` — **nenhum comando contra eles**; a MEDIÇÃO 1 não usa banco (o arquivo-alvo seta `CORE_SAAS_PERSISTENCE=memory` na l.7 e não lê `DATABASE_URL`) | `docker ps --format '{{.Names}}'` (daemon, não `exec`/`psql`) |
| Cluster descartável | **nenhum criado** — §3.1 do plano: "O alvo 1 não usa banco nenhum" | — |
| Logs | `…/scratchpad/san2-4a/san2-4a-alvo1-F<N>-r<NN>.log` | — |

## 2. O alvo, lido no head desta branch (não citado de memória)

- `tests/authority-portal.test.ts` l.7: `process.env.CORE_SAAS_PERSISTENCE = "memory";` — sem
  `DATABASE_URL` em nenhum ponto do arquivo.
- l.45: `const FAST_PARAMS: ScryptParams = { N: 2 ** 10, r: 8, p: 1, keylen: 32 };`
- l.161: `const tampered = hash.slice(0, -1) + (hash.at(-1) === "A" ? "B" : "A");`
- l.162: `assert.equal(await verifyPassword("senha-forte-123", tampered), false);` ← **a linha que a
  pendência `P-ARNES-AUTHORITY-PORTAL-INTERMITENTE` nomeia** (`ERR_ASSERTION true !== false`).
- l.164-165: os dois malformados (`"not-a-scrypt-hash"`, `"scrypt$1024$8$1$onlyfourfields"`).

## 3. Rodadas — tabelas por forma

_(preenchido incrementalmente; ver seções F1, F2, F3 abaixo)_

---

## F1 — isolado, forma canônica do runner · **N=30** · CONCLUÍDA

**Comando (verbatim, repetido 30×, sequencial):**
```
cd <worktree>; unset DATABASE_URL CORE_SAAS_PERSISTENCE
node scripts/run-backend-tests.mjs tests/authority-portal.test.ts
```
Env declarada: `DATABASE_URL` **não exportada** (medida vazia antes da 1ª rodada), `CORE_SAAS_PERSISTENCE` **não exportada** — o runner declarou em cada rodada
`[run-backend-tests] CORE_SAAS_PERSISTENCE=memory — padrão do runner (nada exportado no ambiente…)`.
Node **v20.19.5** · Windows 11 Pro 10.0.22631 · host `N3SOH82`. Logs: `san2-4a-alvo1-F1-r<NN>.log` (30 arquivos, TAP completo).

| rodada | ec | # tests | # pass | # fail | # skipped | # cancelled | linhas `not ok` | dur (ms) |
|---|---|---|---|---|---|---|---|---|
| r01 | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 2755 |
| r02 | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 2689 |
| r03 | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 2672 |
| r04 | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 2637 |
| r05 | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 2658 |
| r06 | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 2651 |
| r07 | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 2668 |
| r08 | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 2731 |
| r09 | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 2726 |
| r10 | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 2710 |
| r11 | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 2765 |
| r12 | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 2711 |
| r13 | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 2666 |
| r14 | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 2726 |
| r15 | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 2714 |
| r16 | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 2711 |
| r17 | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 2729 |
| r18 | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 2707 |
| r19 | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 2743 |
| r20 | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 2731 |
| r21 | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 2741 |
| r22 | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 2728 |
| r23 | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 2640 |
| r24 | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 2718 |
| r25 | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 2744 |
| r26 | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 2668 |
| r27 | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 2736 |
| r28 | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 2673 |
| r29 | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 2650 |
| r30 | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 2717 |

**Agregado F1:** falhas **0/30**. `ec=0` em 30/30. Denominador **constante em 12** nas 30 (nenhuma variação — o piso de denominador do runner não teve o que reclamar). `# fail 0`, `# skipped 0`, `# cancelled 0` em 30/30; **zero** linhas `not ok` no TAP das 30.

**Nota de forma (não maquiagem):** houve uma rodada-**ensaio** anterior à r01, com o MESMO comando, também verde (ec=0, 12/12), que durou **33 144 ms** contra os ~2 700 ms das 30 medidas — a diferença é o cache frio do `tsx` na primeira transpilação do processo. Ela **não** entra no N (foi ensaio de forma, não rodada da bateria) e está declarada aqui exatamente para que ninguém leia a distribuição de duração como estável desde o disco frio. Log: `trial.log`.
Duração F1: mín 2 637 ms (r04) · máx 2 765 ms (r11) · amplitude 128 ms — nenhuma rodada destoante que sugerisse timeout/starvation.

---

## F2 — sob contenção DECLARADA · **N=10** · CONCLUÍDA

**Máquina:** `availableParallelism()` = **8** · `os.cpus().length` = 8 · RAM 23,7 GB ·
`UV_THREADPOOL_SIZE` **não exportada** (default 4 — relevante porque `scrypt` do `node:crypto` roda no threadpool do libuv).

**Carga sintética:** **7 processos** `node` em busy-loop puro de CPU (`availableParallelism()-1`), sem I/O e sem alocação crescente
(`busy.js`: `while (Date.now() < until) { for (let i=0;i<5e6;i++) x=(x+i)%2147483647; }`). Subiram **antes** da r01 e foram mortos **depois** da r10.
**PIDs:** `17126 17127 17128 17129 17130 17131 17132`. A coluna `carga viva` é conferida por `kill -0` **imediatamente antes de cada rodada** — não é promessa, é medição por rodada.

**Comando por rodada:** idêntico ao da F1 (mesmo binário, mesma env, `DATABASE_URL`/`CORE_SAAS_PERSISTENCE` não exportadas). Logs `san2-4a-alvo1-F2-r<NN>.log`.

| rodada | ec | # tests | # pass | # fail | # skipped | # cancelled | linhas `not ok` | dur (ms) | carga viva |
|---|---|---|---|---|---|---|---|---|---|
| r01 | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 3902 | 7/7 |
| r02 | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 4107 | 7/7 |
| r03 | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 4098 | 7/7 |
| r04 | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 4381 | 7/7 |
| r05 | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 4498 | 7/7 |
| r06 | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 4526 | 7/7 |
| r07 | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 4797 | 7/7 |
| r08 | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 4702 | 7/7 |
| r09 | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 4486 | 7/7 |
| r10 | 0 | 12 | 12 | 0 | 0 | 0 | 0 | 4253 | 7/7 |

**Agregado F2:** falhas **0/10**. `ec=0` em 10/10, denominador **constante em 12**, `# fail 0` / `# skipped 0` / `# cancelled 0` em 10/10, zero `not ok`.

**A contenção foi REAL, e isto é a prova (não a intenção):** a duração subiu de **2 637–2 765 ms** (F1, máquina livre) para **3 902–4 797 ms** (F2), **+48,0 % a +73,5 %** — **pareamento declarado: percentis homólogos** (mín F2 ÷ mín F1 e máx F2 ÷ máx F1); ver a **errata E-1** no §8, que retira o antigo "+78 %" — a carga de fato disputou CPU com a suíte. Carga viva 7/7 nas 10 rodadas. Ao final, `kill -9` nos 7 PIDs e conferência: **0 processos sobreviventes** (nenhum busy-loop deixado na máquina do dono).

**Diferença de forma, dita sem disfarce (§4.7):** a medição vermelha da pendência (1/2) veio da **suíte inteira**, na máquina do jurado do B-O6R-ARNES. A F2 é **starvation de CPU declarada sobre o arquivo isolado** — NÃO é a suíte inteira (custo proibitivo, e contaminaria o N com os defeitos já medidos do lote, §3.1 do plano). Quem comparar F2 com o 1/2 do jurado precisa saber que **as formas diferem**; a F2 não refuta o 1/2, e a F1 tampouco.

---

> **Troca de instância (registrada, §7 do plano).** O `dev-san2-4a` que executou F1/F2 e disparou as
> sondas da F3 caiu por `server_error` **ao computar as estatísticas da F3**. Esta instância é a
> sucessora: **não recomeçou** F1/F2/F3 — conferiu o que estava gravado em disco (logs + JSON,
> §3.0.5) e executou o que faltava, que era **a estatística agregada e o fecho**. O que foi
> reconferido e como está no §F3.0 abaixo.

## F3.0 — Conferência do que o antecessor deixou gravado (não é "confiei na tabela")

| O que | Como foi reconferido nesta instância | Resultado |
|---|---|---|
| F1 e F2, 40 logs TAP | `grep -h '^# tests \|^# fail \|^# skipped \|^# cancelled ' san2-4a-alvo1-F*.log \| sort \| uniq -c` sobre os **40** arquivos | `40 × "# tests 12"` · `40 × "# fail 0"` · `40 × "# skipped 0"` · `40 × "# cancelled 0"` — bate com as duas tabelas acima |
| Linhas `not ok` | `grep -h '^not ok ' san2-4a-alvo1-F*.log \| wc -l` | **0** nos 40 |
| Contagem de logs | `ls san2-4a-alvo1-F1-r*.log \| wc -l` / idem F2 | **30** e **10** — nenhum log faltando, nenhuma rodada descartada |
| Carga sintética da F2 | `kill -0` nos 7 PIDs `17126–17132` | os **7 mortos**; `grep -c '[b]usy.js'` = **0** — 0 sobreviventes confirmado por esta instância, não herdado |
| Terreno | `git rev-parse HEAD` = `26ede7301a54277b19baec56cc77499b70177039`; `node -v` = **v20.19.5** | inalterados |

---

## F3 — sonda de causa (sem banco, importando de `src/` sem editar nada) · CONCLUÍDA

**O que a sonda é.** `f3-probe.mts` importa `hashPassword`/`verifyPassword` **do arquivo real**
`src/modules/authority/authority-password.ts` (import por `file:///…`, **zero edição** — §5.2) e
replica **byte a byte** as l.153-165 do teste com os `FAST_PARAMS` da l.45
(`{ N: 2**10, r: 8, p: 1, keylen: 32 }`), senha `"senha-forte-123"`, tamper **verbatim** da l.161.
`f3b-mecanismo.mts` é a segunda sonda: para cada iteração ela **prevê** o resultado byte a byte a
partir dos buffers e compara a previsão com o **veredito real** do `verifyPassword` importado —
é o que transforma hipótese em causa nomeada.

### F3 — tabela execução a execução (N declarado por execução; nenhuma somada a outra)

| # | sonda | N (iterações) | concorrência | dur (ms) | `verifyPassword(tampered)` devolveu `true` | taxa | ctrl + (senha certa → `true`) | ctrl − (senha errada → `false`) | log |
|---|---|---|---|---|---|---|---|---|---|
| E1 | `f3-probe.mts` (calibração de forma) | **1 000** | 8 | 2 316 | **5** | 0,5000 % | 1000/1000 ✔ | 1000/1000 ✔ | `f3-calib.json` |
| E2 | `f3-probe.mts` (bateria principal) | **100 000** | 8 | 256 835 | **390** | **0,3900 %** | 100000/100000 ✔ | 100000/100000 ✔ | `san2-4a-alvo1-F3-100k.json` |
| E3 | `f3b-mecanismo.mts` (sonda de mecanismo) | **20 000** | 8 | 38 490 | **93** | 0,4650 % | (controles próprios abaixo) | — | `san2-4a-alvo1-F3b-mecanismo.json` |

Node **v20.19.5** · `UV_THREADPOOL_SIZE` não exportada (default 4) · Windows 11 Pro 10.0.22631 ·
host `N3SOH82`. **Nenhuma execução foi descartada** — E1 saiu antes de E2 e está publicada com o N
dela, não absorvida pelo 100 k (§4.2: rodada que saiu, conta).

**Malformados das l.164-165** (medidos junto, na mesma sonda): `"not-a-scrypt-hash"` → `true` em
**0** de 10 000 (E2) + 0 de 200 (E1); `"scrypt$1024$8$1$onlyfourfields"` → `true` em **0** de 10 000
+ 0 de 200; **0 exceções lançadas** em ambos. As duas asserções malformadas **não são** fonte de
intermitência.

### F3 — a causa, NOMEADA POR EXECUÇÃO (cada elo com o número que o prova)

| # | Elo da cadeia | Medido | Evidência |
|---|---|---|---|
| 1 | `hashPassword` devolve `derived.toString("base64")` com `keylen=32` → **44 chars terminados em `=`** | último char do hash = `=` em **100 000/100 000** (E2) e **1 000/1 000** (E1); nenhum outro valor apareceu | `distribuicao_ultimo_char_do_hash: { "=": 100000 }` |
| 2 | O ternário da l.161 (`hash.at(-1) === "A" ? "B" : "A"`) **nunca** vê `"A"` — logo o char final vira **sempre `"A"`**: o tamper troca o **padding**, não o payload | último char do `tampered` = `"A"` em **25/25** dos achados capturados; e é consequência aritmética do elo 1 | achados de `san2-4a-alvo1-F3-100k.json` |
| 3 | 44 chars base64 **sem padding** = 264 bits = **33 bytes**, cujos **32 primeiros são o hash íntegro** e o **33.º é `0x00`** | comprimento 33 em **20 000/20 000**; byte[32] do stored adulterado = 0 em **20 000/20 000**; prefixo de 32 B idêntico em **20 000/20 000** | E3 + prova aritmética independente (`Buffer.from(b64.slice(0,-1)+"A","base64")` → 33 B, prefixo idêntico, byte[32]=0) |
| 4 | `parseStored` (`src/modules/authority/authority-password.ts:79`) deriva **`keylen: hash.length`** — ou seja, **33**, tirado do próprio stored adulterado | leitura da linha + E3 (a previsão só bate se for isso) | `return { params: { N, r, p, keylen: hash.length }, salt, hash };` |
| 5 | scrypt com `keylen=33` devolve os **mesmos 32 bytes** + 1 byte novo (a saída é prefixo-estável) | estável em **20 000/20 000** | `prefixo_scrypt_estavel_keylen33_vs_hash32: { estavel: 20000, instavel: 0 }` |
| 6 | O guard `derived.length !== parsed.hash.length` **não pega** (33 === 33); sobra `timingSafeEqual`, que devolve `true` **se e somente se o 33.º byte derivado for `0x00`** — probabilidade **1/256** | 33.º byte derivado = 0 em **93/20 000** (0,4650 %; 1/256 = 0,3906 %) — e `verifyPassword` devolveu `true` **exatamente nessas 93** | E3 |
| **7** | **A previsão byte a byte bateu com o veredito REAL do `verifyPassword` em 20 000/20 000, com 0 divergências** | `previsao_byte_a_byte_bateu_com_o_real: 20000` · `previsao_errou: 0` | E3 |

**Concordância com 1/256 (= 0,390 63 %), por execução:**

| execução | k/N | taxa | z contra 1/256 | IC 95 % (Wilson) |
|---|---|---|---|---|
| E1 (1 000) | 5/1 000 | 0,5000 % | **+0,554** | 1/467,8 – 1/85,8 |
| E2 (100 000) | 390/100 000 | 0,3900 % | **−0,032** | 1/283,1 – 1/232,2 |
| E3 (20 000) | 93/20 000 | 0,4650 % | **+1,686** | 1/263,3 – 1/175,7 |

As três são compatíveis com 1/256 (nenhum |z| ≥ 1,96). A E2, com o maior N, cai praticamente em
cima do valor teórico (esperado 390,625; observado **390**). *(Linha de concordância estatística,
**não** uma taxa de forma: as três somadas dão 483/120 000 = 0,4025 %, z = +0,659 — publicada aqui
só como conferência da hipótese 1/256, jamais como "a taxa da F3".)*

### F3 — o que a causa implica para os zeros da F1 e da F2 (e por que 0/40 não refuta nada)

O teste executa a asserção da l.162 **uma vez por execução do arquivo**. Sob a taxa medida de
**1/256 por execução**:

- P(0 falhas em **30** execuções) = **88,92 %** → o `0/30` da F1 é o desfecho **mais provável**.
- P(0 falhas em **10** execuções) = **96,16 %** → idem para o `0/10` da F2.
- P(0 falhas em **40**) = **85,51 %** → **0/40 não é evidência de ausência**; é o resultado esperado.
- Para ter **95 %** de chance de capturar ao menos uma falha seriam necessárias **≈ 766 execuções**
  do arquivo (≈ 34 min a ~2,7 s/execução). **Nenhum N ≤ 40 poderia** ter pego isto — e o N ≥ 10 que
  a própria pendência exigia teria **96,2 %** de chance de sair verde mesmo com o defeito presente.

Ou seja: **a F1 e a F2 não refutam a medição vermelha do jurado — e agora se sabe por quê, com
número.** O poder delas contra um defeito de frequência 1/256 é de 11,1 % e 3,8 %.

---

# FECHO DA MEDIÇÃO 1 (§3.1 do plano — desfecho (i): falha capturada, causa nomeada)

## 1. Taxa medida, com N declarado, **por forma** (formas NÃO somadas entre si)

| Forma | O que é | N | Falhas | Taxa | Como ler |
|---|---|---|---|---|---|
| **F1** | `node scripts/run-backend-tests.mjs tests/authority-portal.test.ts`, isolado, máquina livre, sem `DATABASE_URL`/`CORE_SAAS_PERSISTENCE` | **30 execuções** | **0** | **0/30** | denominador constante em 12; `ec=0` 30/30; zero `not ok` |
| **F2** | idêntica à F1, sob **starvation de CPU declarada** (7 busy-loops, carga viva conferida por `kill -0` a cada rodada) | **10 execuções** | **0** | **0/10** | contenção **provada pela duração**: 2 637–2 765 ms → 3 902–4 797 ms (**+48,0 % a +73,5 %**, pareamento **mín↔mín / máx↔máx** — errata E-1, §8) |
| **F3·E1** | sonda de causa (calibração) — `verifyPassword` real de `src/`, tamper verbatim da l.161 | **1 000 iterações** | 5 | **5/1 000** = 0,5000 % | controles + e − 1000/1000 |
| **F3·E2** | sonda de causa (bateria principal), mesma sonda | **100 000 iterações** | 390 | **390/100 000** = **0,3900 %** | controles + e − 100000/100000 |
| **F3·E3** | sonda de **mecanismo** — prevê byte a byte e compara com o veredito real | **20 000 iterações** | 93 | **93/20 000** = 0,4650 % | **previsão bateu 20 000/20 000, 0 erros** |

**Três N, três formas, três taxas.** F1 e F2 medem **execuções do arquivo de teste**; F3 mede
**iterações da função** — grandezas diferentes, publicadas separadas de propósito. A ponte entre
elas é aritmética e está no §F3: 1 asserção por execução, logo a taxa da F3 é a taxa de falha
esperada por execução do arquivo.

## 2. A forma predominante da falha

**Não houve falha nas formas F1 e F2** (0/40). A falha existe e foi capturada **483 vezes** na
forma F3, e a forma dela é **única** — não apareceu uma segunda:

> **`verifyPassword("senha-forte-123", tampered)` devolve `true` onde a l.162 assere `false`, em
> aproximadamente 1 execução a cada 256, sem qualquer dependência de carga, paralelismo, banco ou
> relógio.**

Que **não** depende de contenção está medido: F1 (máquina livre) e F2 (7 busy-loops) deram
denominador idêntico, `ec=0` idêntico e 0 falhas idênticas — a única diferença foi a duração. E a
cadeia causal do §F3 não tem nenhum elo temporal: é aritmética de base64 mais um byte de scrypt.

## 3. A causa, **NOMEADA** (nomeável porque os 7 elos foram medidos, não deduzidos)

**O tamper do próprio teste não adultera o hash — ele remove o padding do base64.**

1. `hashPassword` com `keylen=32` produz payload base64 de 44 chars **terminado em `=`**
   (100 000/100 000).
2. A l.161 faz `hash.at(-1) === "A" ? "B" : "A"`. Como o último char é **sempre `=`** e nunca `"A"`,
   o ramo escolhido é **sempre `"A"`**. O teste acredita estar virando um char do hash; está
   **trocando o caractere de padding**.
3. Os 44 chars base64 **sem padding** somam 264 bits = **33 bytes**: os **32 bytes originais
   intactos** mais um **`0x00`** (20 000/20 000).
4. `parseStored` (`src/modules/authority/authority-password.ts:79`) tira o `keylen` **do próprio
   stored**: `keylen: hash.length`, ou seja **33**.
5. scrypt com `keylen=33` devolve os mesmos 32 bytes mais 1 (saída prefixo-estável, 20 000/20 000).
6. O guard de comprimento (`derived.length !== parsed.hash.length`) **não pega**: 33 === 33. Sobra o
   `timingSafeEqual`, que passa **se e somente se o 33.º byte derivado for `0x00`** — **1/256**.
7. **Prova de que a causa é esta e não outra:** a previsão feita só com esses elos acertou o
   veredito real do `verifyPassword` em **20 000 de 20 000**, com **0 divergências**.

A assinatura que isso produz é `assert.equal(true, false)`, ou seja **`ERR_ASSERTION true !== false`
em `tests/authority-portal.test.ts:162`** — **exatamente** a assinatura que
`P-ARNES-AUTHORITY-PORTAL-INTERMITENTE` registra.

**Não é intermitência de arnês.** Não é concorrência de catálogo, não é starvation, não é ordem de
arquivo, não é banco (o arquivo não usa banco). É um **defeito determinístico-probabilístico do
próprio caso de teste**, de taxa fixa 1/256 por execução, presente desde que a linha existe.

## 4. Ressalva de escopo — o que estas medições **NÃO** cobrem (§4.7)

1. **A suíte inteira não foi medida.** F1/F2/F3 medem o **arquivo isolado** e a **função isolada**.
   A medição vermelha original (**1/2**) veio da **suíte inteira**, na **máquina do jurado do
   B-O6R-ARNES**. As formas **diferem**; nada aqui refuta aquilo — a ressalva do antecessor quanto a
   F1/F2 permanece **inteira**, agora com o número que a explica (P(0 em 40) = 85,5 %).
2. **A causa nomeada explica a assinatura, mas não explica sozinha a taxa de 1/2 do jurado.** Sob
   1/256 por execução, ver ao menos 1 falha em 2 execuções tem probabilidade **0,780 %**. Ou o
   jurado teve azar de 1-em-128, ou **existe uma segunda contribuição presente apenas no arranjo de
   suíte inteira**. **Estas medições não decidem entre as duas hipóteses**, e este bloco não podia
   decidir: medir a suíte inteira está fora da forma prescrita (§3.1 do plano — custo proibitivo e
   contaminação do N pelos defeitos já medidos do lote).
3. **Nenhuma falha do arquivo real de teste foi capturada** — 0/40. O elo 7 fecha a cadeia com o
   `verifyPassword` **real** importado de `src/`, restando apenas o `assert.equal`, que é
   tautológico. Quem quiser a reprodução direta no arquivo: **N ≈ 766 execuções** para 95 % de
   chance (≈ 34 min). Fica **declarado como não medido** — não como impossível.
4. **Outra máquina ou outro Node não foram medidos.** Tudo aqui é Node **v20.19.5**, Windows 11 Pro
   10.0.22631, host `N3SOH82`. A cadeia causal não tem elo dependente de plataforma, mas isso é
   argumento — não medição.
5. **Alvos 2 e 3 do plano (denominadores da bateria barata; censo `rls_test_`) não foram tocados**
   por esta instância: o mandato era a MEDIÇÃO 1. Nenhum cluster descartável foi criado, nenhuma
   porta foi alocada, e `erp-postgres`/`erp-redis` não receberam **nenhum** comando.

## 5. Observações para o **SAN2-4b** — achado reportado, **NENHUM conserto aplicado** (§0/§5.2, §C7.4-bis)

Sou *achador*; achador não conserta. Registro defeito, evidência e motivo — e **não** proponho nem
escrevo a correção. Não toquei `tests/`, `scripts/`, `src/`, `.github/`, `Kpis/` nem contratos.

- **OBS-1 · `tests/authority-portal.test.ts:161` — escopo `pre-existente`, gravidade ALTA para o
  arnês.** O tamper não exercita o que o teste diz exercitar ("hash adulterado → false"): ele remove
  o padding do base64, e o caminho resultante passa 1 vez a cada 256. **Evidência:** §F3, elos 1-7;
  483 `true` capturados em 120 000 iterações da função real; previsão 20 000/20 000. **Origem:** a
  linha antecede este bloco — o diff de código do SAN2-4a é vazio por construção (§6.1 do plano).
  **Dono do conserto: SAN2-4b.**
- **OBS-2 · `src/modules/authority/authority-password.ts` (l.79 e o comentário das l.82-84) —
  escopo `pre-existente`, para a junta calibrar.** `parseStored` deriva o `keylen` **do comprimento
  do stored recebido**, então um stored que seja **extensão em comprimento** de um válido é aceito
  sempre que os bytes extras coincidirem com a continuação do fluxo scrypt — **medido: 1/256 para 1
  byte extra**. O comentário das l.82-84 afirma que *um stored corrompido simplesmente falha*; **a
  execução contradiz essa afirmação** para esta classe de corrupção. Isto é **fato medido**, não
  juízo de risco (quem escreve um stored já escreve no banco); a junta é que decide se há
  consequência de produto. **Não proponho alteração de `src/`.** **Dono: a junta do SAN2-4a
  designa** — candidatos naturais, o 4b ou uma pendência própria.
- **OBS-3 · método, para o registro.** `P-ARNES-AUTHORITY-PORTAL-INTERMITENTE` exigia *N maior ou
  igual a 10, isolado, antes de qualquer correção*. **N = 10 tem 96,2 % de chance de sair verde com
  o defeito presente**, e N = 30 tem 88,9 %. O critério de N da pendência era, ele próprio, cego
  para a classe de defeito que ela perseguia. Quem reusar esse tipo de critério precisa derivar o N
  do **poder** pretendido, não de um número redondo.

## 6. Terreno e limpeza (§C5 e §3.4 do plano)

- **Base viva intocada:** `erp-postgres` e `erp-redis` não receberam nenhum comando, nem de leitura.
  A MEDIÇÃO 1 não usa banco — `tests/authority-portal.test.ts:7` seta `CORE_SAAS_PERSISTENCE=memory`
  e o arquivo não lê `DATABASE_URL`.
- **Nenhum container `san2-4a-*` foi criado** (o alvo 1 não usa cluster) — nada a derrubar.
- **Nenhuma porta alocada**; o `netsh` não precisou ser consultado nesta medição.
- **Carga sintética da F2:** os 7 PIDs (`17126`–`17132`) foram mortos pelo antecessor e
  **reconferidos mortos por esta instância** (`kill -0` nos 7, mais contagem de `busy.js` = 0).
  **0 sobreviventes.**
- **`node_modules`** do worktree é diretório real, não junction/symlink — proibição de 26/08
  respeitada; nada foi criado nem removido.
- **Sem commit** (mandato). **Um único arquivo tocado nesta sessão: este diário.** O `git status`
  segue mostrando apenas os dois untracked de sempre (`agent-orchestration/omega/juntas/votos/SAN2-4a/`
  e o plano).
- **Logs preservados** em `scratchpad/san2-4a/` (40 TAP completos, 3 JSON de sonda e os fontes das
  sondas), porque as tabelas acima os citam por nome e a reprodutibilidade por terceiro (§4.9)
  depende deles. Varrer o scratchpad é a limpeza do **fechamento do PR**, não desta medição.

## 7. Estado

**MEDIÇÃO 1 (alvo 1, §3.1): CONCLUÍDA** — desfecho (i) do critério de "medição suficiente": falha
capturada (483 em 120 000, forma única), asserção exata transcrita, inputs capturados (25 achados da
E2 mais 5 exemplos da E3, com hash, tampered e comprimentos) e **causa nomeada por execução**, com
previsão que acertou 20 000/20 000. **Nenhum conserto foi aplicado.** As medições 2 e 3 do plano
(denominadores da bateria barata; censo `rls_test_`) permanecem **não iniciadas**.

---

## 8. ⚠ E-1 · ERRATA ao limite superior da contenção da F2

> **Datada `2026-08-31`, pós-junta do PR #365 · achado **C1-A1** (cadeira C1, auditor da medição 1) ·
> gravidade `baixa` · escopo `dentro-do-bloco`.** Escrita por quem **conserta**, não por quem achou
> (§C7.4-bis). **Aponho — não reescrevo em silêncio** (§A2).

**A frase retirada, na íntegra:** *"a duração subiu de **2 637–2 765 ms** (F1, máquina livre) para
**3 902–4 797 ms** (F2), **+48 % a +78 %**"*.

**O defeito:** o `+78 %` **não deriva de nenhum pareamento declarado**. Os dados publicados são F1
`n=30 · mín 2637 · máx 2765 · média 2703,83` e F2 `n=10 · mín 3902 · máx 4797 · média 4375` — os
mesmos das tabelas §F1/§F2 acima, não recalculados a partir de nada novo. Recomputei **todos** os
pareamentos possíveis entre esses seis números (aritmética reconferida por esta instância,
independente da C1):

| Pareamento | Conta | Resultado |
|---|---|---|
| **mín ↔ mín** (homólogo) | 3902 ÷ 2637 | **+48,0 %** |
| **máx ↔ máx** (homólogo) | 4797 ÷ 2765 | **+73,5 %** |
| média ↔ média | 4375 ÷ 2703,83 | +61,8 % |
| máx F2 ÷ mín F1 (envelope máximo) | 4797 ÷ 2637 | +81,9 % |
| mín F2 ÷ máx F1 (envelope mínimo) | 3902 ÷ 2765 | +41,1 % |
| máx F2 ÷ média F1 (o mais generoso defensável) | 4797 ÷ 2703,83 | +77,4 % |

**Nenhum dá 78.** O `+48 %` do limite inferior **é exato** (mín↔mín, +47,97 % arredondado) — o
defeito é **só** no limite superior, e a forma dele é aritmeticamente diagnosticável: o par que o
`+48 %` inaugura é o **homólogo**, e o homólogo do topo é **+73,5 %**. Para `+78 %` fechar sob esse
mesmo pareamento, o máximo da F2 teria de ter sido **4 922 ms** — e foi **4 797 ms** (r07, tabela
§F2). A C1 chegou a esse mesmo 4 922 por caminho próprio; as duas contas batem.

**A correção aplicada:** as **duas** ocorrências (a do corpo da F2 e a da coluna "Como ler" da
tabela do §1 do Fecho) passam a dizer **`+48,0 % a +73,5 %`**, e ambas **declaram o pareamento**
(mín↔mín e máx↔máx), que era exatamente o que faltava — o mandato admitia as duas saídas (corrigir
o número **ou** declarar o pareamento) e esta errata faz **as duas**, porque um intervalo sem
pareamento declarado é irreproduzível mesmo quando os extremos estão certos.

**O que NÃO muda, e é o que a medição afirmava:** a **contenção foi real** e segue provada pela
duração — sob a leitura mais conservadora possível (`mín F2 ÷ máx F1`) a F2 ainda é **+41,1 %** mais
lenta que a F1, com **zero sobreposição** entre os dois intervalos (`[2637, 2765]` e `[3902, 4797]`
são disjuntos, com folga de 1 137 ms). Nenhuma conclusão da medição 1 depende de o topo ser 73,5 ou
78: as taxas publicadas (**F1 0/30 · F2 0/10 · F3 483/120 000**), a causa nomeada e a previsão
20 000/20 000 ficam **intocadas**. Este é um defeito de **relato**, não de medição — e por isso a C1
aprovou com gravidade `baixa`.
