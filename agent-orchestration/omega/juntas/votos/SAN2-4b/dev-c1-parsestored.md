# SAN2-4b — DIÁRIO DO DEV · correção **C1** (`parseStored` + pino de `keylen`)

> **Instância:** `dev-san2-4b` — identidade **nova**. Não achei nada, não voto, não julgo a validade
> do achado (§C7.4-bis: quem acha não conserta; quem desenvolve não julga). **Papel: quem desenvolve.**
> **Mandato:** a correção **C1 apenas** — `src/modules/authority/authority-password.ts`
> (`parseStored` + comentário l.82-85) e este diário.
> **Plano obrigatório:** `agent-orchestration/omega/planos/SAN2-4b-plano.md` §3-C1 (o quê), §4-C1 (a
> prova, com o N exigido), §5 (escopo), §7 (riscos). **Onde o mandato divergir do plano, o plano vence**
> — e a divergência fica registrada (§5 deste diário).
> **Escrita incremental** (`D-JUNTA-RESILIENTE`): cada passo é gravado ao terminar — comando, saída, estado.
> Sucessor de queda re-executa a **forma inteira** interrompida, nunca herda metade.

---

## §0 — Terreno declarado (transcrito na abertura, não lembrado)

| Item | Valor conferido por execução |
|---|---|
| Worktree | `c:\Users\AMP\Documents\GitHub\ERP_Techsolutios\.claude\worktrees\san2-r` |
| Branch | `fix/san2-4b-corrigir-arnes` (`git rev-parse --abbrev-ref HEAD`) |
| HEAD na abertura | `fca131adf84820503f57cd2383876222aa091cf7` |
| `git status --short` na abertura | **1 untracked**: `agent-orchestration/omega/planos/SAN2-4b-plano.md` — árvore sem mutação viva |
| Node | **v20.19.5** (`node --version`) |
| Host | `N3SOH82` · Windows 11 Pro 10.0.22631 |
| Base viva | `docker ps`: `erp-postgres` **Up 2 days (healthy)** · `erp-redis` **Up 2 days (healthy)** — **nenhum comando enviado a nenhum dos dois em todo este trabalho** (§5.2 do plano) |
| Banco necessário para a C1 | **NENHUM.** `authority-password.ts` é `node:crypto` puro; a sonda e o `authority-portal.test.ts` rodam com `CORE_SAAS_PERSISTENCE=memory` (l.7 do teste) |
| `node_modules` do worktree | diretório real, **não** junction/symlink (proibição de 26/08) |
| Scratchpad | `…/45ec3bf3-…/scratchpad/san2-4b/` — sondas e logs; morre com o bloco |

**Fatos do §2.12 do plano re-conferidos por esta instância antes de editar (leitura/execução, zero edição):**

- `parseStored` l.63-80 e o comentário l.82-85 **exatamente** como o plano os descreve.
- `grep -rn "keylen" --include=*.ts src/ tests/` → **todos os usos são 32**: `AUTHORITY_SCRYPT_PARAMS`
  (l.37, produção OWASP), `FAST_PARAMS` de `authority-portal.test.ts:45`, `authority-credential.test.ts:20`
  e `authority-portal-rls.test.ts:82`. **Nenhum outro keylen existe no repositório** — o pino em 32 não
  invalida nenhum caminho vivo.
- **Superfície de regressão de `authority-password.ts`** (`grep -rn "authority-password"`): consumidores
  de `src/` = `authority-credential.service.ts` (só `hashPassword`/`generateInitialPassword`) e
  `authority-portal.service.ts` (`verifyPassword`/`verifyPasswordDummy`); reexport em
  `authority/index.ts`. Testes que exercitam = `authority-portal.test.ts`, `authority-credential.test.ts`,
  `authority-portal-rls.test.ts`. **`parseStored` NÃO é exportada** — o único caminho até ela é
  `verifyPassword`.
- `tests/authority-portal.test.ts:161` (o tamper da OBS-1) segue **intocado** — é a correção **C2**,
  de outro agente. Eu apenas o **executo** como regressão.

---

## §1 — Baseline de abertura (medido, não copiado)

| # | Comando | Saída | ec |
|---|---|---|---|
| B1 | `node scripts/run-backend-tests.mjs tests/authority-portal.test.ts` | `# tests 12` · `# pass 12` · `# fail 0` · `# skipped 0` · `# cancelled 0` · `grep -c '^not ok '` = **0** | **0** |

**Denominador do `authority-portal` na abertura = 12** — igual ao da F1 do 4a (30/30 execuções com
`# tests 12`). A C1 **não altera este denominador** (não toco `tests/`); quem o move é a C2, de outro agente.

---

## §2 — A SONDA (§4-C1): o que ela é, e por que o vermelho-controle vem ANTES

**O que a sonda é.** `c1-probe.mts` (scratchpad) importa `hashPassword`, `verifyPassword` e
`AUTHORITY_SCRYPT_PARAMS` do **arquivo real** `src/modules/authority/authority-password.ts` por
`file://` URL sob `tsx` — **zero edição pela sonda**, forma da F3 do 4a. Sem banco, sem rede.
`FAST_PARAMS = { N: 2**10, r: 8, p: 1, keylen: 32 }` e senha `"senha-forte-123"`, iguais aos do teste
(l.45). Concorrência 8. Quatro fases:

1. **tamper-padding** — o tamper **verbatim** da l.161 (`hash.slice(0,-1) + (hash.at(-1)==="A" ? "B" : "A")`);
   na MESMA iteração medem-se o **controle +** (senha certa → deve ser `true`) e o **controle −**
   (senha errada → deve ser `false`).
2. **malformados** — os dois stored das l.164-165 do teste.
3. **OWASP** — `hashPassword`/`verifyPassword` com `AUTHORITY_SCRYPT_PARAMS` reais (N=2^17), caminho de produção.
4. **pino de keylen** — stored com hash base64 **canônico** de **33 bytes** (`derivado32 || randomBytes(1)`).
   O 33.º byte é **aleatório**: sem o pino, o parse deriva `keylen=33` e o `timingSafeEqual` passa sse o
   byte derivado coincidir → **1/256**. A sonda **assere a canonicidade do b64 por iteração**
   (`b64_nao_canonico`), para que a rejeição só possa vir do **PINO**, jamais do round-trip canônico —
   sem isso as duas metades da OBS-2 ficariam indistinguíveis.

> **Por que o vermelho-controle é obrigatório.** Uma sonda que devolve 0 pode estar provando a correção
> **ou** estar cega. O 0/100.000 do §4-C1 só significa alguma coisa depois de a MESMA sonda, no MESMO
> arquivo **não corrigido**, ter enxergado o defeito. É o par vermelho→verde que prova, não o verde.

### R0 · calibração de forma, **código NÃO corrigido** · log `R0-calibracao-pre-fix.json`

| fase | N | resultado | leitura |
|---|---|---|---|
| tamper-padding | **1 000** | **3** `true` — taxa **0,3000 %** | compatível com 1/256 = 0,3906 % |
| ctrl + (senha certa) | 1 000 | **1000** `true` | aceitação sadia intacta |
| ctrl − (senha errada) | 1 000 | **0** `true` | nenhum falso positivo |
| último char do hash | 1 000 | `{"=": 1000}` | **elo 1 do 4a reproduzido por esta instância**: o hash SEMPRE termina em `=`, logo o ternário nunca vê `"A"` e o tamper troca **padding**, não dado |
| malformados | 200 cada | 0 `true`, 0 exceções | as l.164-165 não são fonte de intermitência |
| OWASP (N=2^17) | 1 | 1 `true`, 0 exceções | caminho de produção sadio |
| **pino de keylen** | **500** | **2** `true` — taxa **0,4000 %** · `b64_nao_canonico` = **0** · `comprimento_33` = 500/500 | a segunda metade da OBS-2 existe e é **independente** do padding: b64 perfeitamente canônico, rejeitado por nada |

**Achado literal capturado (input completo, reprodutível por terceiro):**
`scrypt$1024$8$1$EEi5zsky2vUlFTM8/orkhw==$UT/tJxPsjFqMLs7v3gwnLFX3Fa2EaEJDyLvT5SAngLQA` →
`verifyPassword("senha-forte-123", …)` devolveu **`true`** com o código não corrigido.

**Conclusão da calibração: a sonda ENXERGA as duas metades da OBS-2.** Segue o vermelho-controle com N maior.

### R1 · **VERMELHO-CONTROLE**, código NÃO corrigido · log `R1-vermelho-controle-pre-fix.json`

Node **v20.19.5** · conc **8** · `SRC_PATH` = `src/modules/authority/authority-password.ts` no head `fca131a`, **sem uma linha alterada**.

| fase | N | `true` | taxa | esperado sob 1/256 | z | dur (ms) |
|---|---|---|---|---|---|---|
| **tamper-padding** | **20 000** | **79** | **0,3950 %** | 78,125 | **+0,10** | 61 527 |
| ctrl + (senha certa) | 20 000 | **20 000** | 100 % | — | — | (mesma passada) |
| ctrl − (senha errada) | 20 000 | **0** | 0 % | — | — | (mesma passada) |
| **pino de keylen** (33 B canônicos) | **5 000** | **18** | **0,3600 %** | 19,53 | **−0,35** | 8 098 |
| malformado `not-a-scrypt-hash` | 10 000 | 0 | 0 % | — | — | 7 |
| malformado `scrypt$1024$8$1$onlyfourfields` | 10 000 | 0 | 0 % | — | — | 10 |
| OWASP N=2^17 (produção) | 3 | 3 `true` | 100 % | — | — | 2 841 |

- `distribuicao_ultimo_char_do_hash` = `{"=": 20000}` — **20 000/20 000**. O elo 1 do 4a fica reproduzido
  por esta instância, com N próprio: o tamper da l.161 **jamais** toca dado.
- `b64_nao_canonico` = **0/5 000** e `comprimento_33_conferido` = **5 000/5 000** na fase do pino: os
  stored de 33 bytes são base64 **impecavelmente canônico**. Logo, o que os aceitava **não era** falta de
  round-trip — era o `keylen` derivado do input. **As duas metades da OBS-2 estão medidas separadamente.**
- **0 exceções** em todas as fases (o contrato "nunca lança" já valia antes e precisa continuar valendo).

**Ambas as taxas são estatisticamente indistinguíveis de 1/256** (|z| < 0,4 nas duas). **A sonda enxerga o
defeito.** É contra este vermelho que o verde do §4 vai significar alguma coisa.

---

## §3 — Achado de terreno ANTES de editar: os 4 stored ESCRITOS À MÃO (o risco §7.2 do plano, materializado)

O §7.2 do plano declara como risco residual "stored **escrito à mão** fora do `hashPassword`". Fui procurar
antes de mexer — `grep -rn 'scrypt\$' src/ tests/ scripts/ prisma/`. **Existem, e são 4, todos em `tests/`:**

| Arquivo | Linha | Literal |
|---|---|---|
| `tests/authority-release-approval.test.ts` | 105 | `scrypt$1024$8$1$c2FsdA$aGFzaA` |
| `tests/authority-removal.test.ts` | 86 | `scrypt$1024$8$1$c2FsdA$aGFzaA` |
| `tests/authority-release-approval-rls.test.ts` | 279 | idem (via `INSERT INTO authority_credentials`) |
| `tests/authority-removal-rls.test.ts` | 221 | idem (via `INSERT`) |

Decodificados por execução: `c2FsdA` → 4 bytes (`"salt"`), **não canônico** (canônico seria `c2FsdA==`);
`aGFzaA` → 4 bytes (`"hash"`), **não canônico**, e **4 ≠ 32**. Ou seja: **a C1 os rejeita pelas DUAS
validações novas.**

**Isto muda o comportamento deles? NÃO — conferido, não suposto:**
`grep -ic "verifypassword|/portal/v1/authority/login|AuthorityPortalService"` nos dois `-rls` = **0**; nos
dois em memória, o literal aparece **só** como valor de `passwordHash:` na montagem da fixture. **Nenhum dos
quatro verifica senha** — são preenchimento de coluna `NOT NULL` para testes de aprovação de liberação e de
remoção. Em `src/`, o **único** chamador de `verifyPassword` é `authority-portal.service.ts:139` (login), e
**`parseStored` não é exportada**: não há terceiro caminho.

**Consequência registrada, sem conserto** (não é meu papel, e está fora do meu escopo — §5.1 dá esses arquivos
à C2/C3, não a mim): depois da C1, esses 4 stored deixam de ser "aceitáveis a 1/256" e passam a ser
**inequivocamente inválidos** — que é o comportamento correto para um placeholder de 4 bytes. Regressão
executada no §6 abaixo.

**Vizinho NÃO tocado, declarado:** `src/modules/auth/services/password.service.ts:96` tem um `parseScryptHash`
**próprio e diferente** (formato de **7** campos, `algorithm$version$N$r$p$salt$hash`) para as credenciais
locais de `auth`. **Não é o alvo deste mandato nem do §5.1 do plano** — não o li em busca da mesma classe e
não o toquei. Fica dito para a junta decidir se quer dono; **não é achado meu**, é fronteira de escopo.

---

## §4 — A CORREÇÃO C1 aplicada (§3-C1 do plano, item a item)

**Arquivo único: `src/modules/authority/authority-password.ts`.** `git diff --stat` = **1 arquivo,
29 inserções, 5 remoções**. Nada mais foi tocado.

| Item do §3-C1 | O que entrou | Onde |
|---|---|---|
| **1. Rejeição de base64 não-canônico** | helper `isCanonicalBase64(raw, decoded)` (round-trip `decoded.toString("base64") === raw`) aplicado a **`parts[4]` (salt) E `parts[5]` (hash)** → `undefined` | novo helper acima de `parseStored`; guard novo dentro dela |
| **2. Pino do keylen** | `if (hash.length !== AUTHORITY_SCRYPT_PARAMS.keylen) return undefined;` e o retorno passa a carregar `keylen: AUTHORITY_SCRYPT_PARAMS.keylen` — **não mais `hash.length`** | `parseStored` |
| **3. Comentário l.82-85 corrigido** | bloco reescrito: diz o que o código **agora** garante, nomeia a medição de origem (`medicao-1 §F3`, OBS-2), o mecanismo (prefixo-estável + guard 33≡33) e o **vermelho medido** (79/20 000 e 18/5 000) como o motivo de as DUAS validações existirem | acima de `verifyPassword` |

**Decisões de implementação, declaradas (para a cadeira de segurança atacar):**

1. **Por que round-trip e não regex de alfabeto.** `Buffer.from(x,"base64")` do Node é **leniente**: aceita
   padding faltando, ignora caracteres fora do alfabeto e **quase nunca lança** — o `try/catch` que já existia
   nunca foi validação de verdade. O round-trip é o teste de canonicidade mais barato que existe, e é
   **identidade** para tudo que `hashPassword` emite (`Buffer.toString("base64")`, canônico por construção).
2. **O pino é contra a CONSTANTE do sistema, não contra `32` cravado**, para que uma rotação futura de
   `AUTHORITY_SCRYPT_PARAMS.keylen` não deixe a validação em silêncio contradizendo o resto do módulo. Está
   escrito no código que rotacionar keylen exige **versão nova do formato**, e que `N/r/p` seguem
   self-describing — a rotação de **custo** continua possível, como sempre foi.
3. **Ordem dos guards:** canonicidade **antes** do pino, e ambos **antes** de qualquer `scrypt`. O caminho
   rejeitado não deriva nada — é mais barato que o de antes, não mais caro.
4. **`salt.length === 0 || hash.length === 0` foi mantido** embora o pino já subsuma o `hash.length === 0`:
   diff mínimo, e a metade do `salt` continua sendo dele.
5. **O que eu NÃO fiz, de propósito:** não pinei o **comprimento do salt** (16 B). O §3-C1 do plano pede duas
   validações, e só duas; o §5.1 me dá `parseStored` "SOMENTE" para elas. O vetor do salt curto **já cai** no
   round-trip canônico quando não-canônico. Um salt canônico de comprimento diferente segue aceito — **fica
   dito, não escondido**, para a junta decidir se quer dono. Não é achado meu; é o limite do meu mandato.
6. **Oráculo de timing:** o caminho novo retorna `false` sem derivar, para stored não-canônico ou de
   comprimento errado. Isso **não é classe nova** — `parseStored` já retornava `undefined` sem derivar para
   todo stored malformado (l.65/69/78 originais). E o `stored` vem do **banco**, não do atacante: quem se
   autentica controla a senha. Escrito no comentário do código.

---

## §5 — A PROVA (§4-C1): G1 · **VERDE**, código corrigido · log `G1-verde-pos-fix.json`

**Mesma sonda, mesmo arquivo, mesma máquina, mesmo Node — só o `src/` mudou.** Node **v20.19.5** · conc **8**.

| Exigência do §4-C1 | N exigido | N executado | Resultado | Exigido | ✔ |
|---|---|---|---|---|---|
| **Tamper-padding** (o vetor medido) | 100 000 | **100 000** | **0** `true` | 0/100 000 | **✔** |
| **Controle positivo** (anti-regressão de aceitação) | 100 000 | **100 000** | **100 000** `true` | 100 000/100 000 | **✔** |
| **Controle negativo** (senha errada) | 100 000 | **100 000** | **0** `true` | 0/100 000 | **✔** |
| **Malformado** `not-a-scrypt-hash` | 10 000 | **10 000** | 0 `true`, **0 exceções** | 0 e 0 | **✔** |
| **Malformado** `scrypt$1024$8$1$onlyfourfields` | 10 000 | **10 000** | 0 `true`, **0 exceções** | 0 e 0 | **✔** |
| **Caminho de produção** (OWASP N=2^17) | 3 | **3** | **3** `true`, 0 exceções | 3/3 | **✔** |
| **Pino de comprimento** (33 B canônicos) | 1 000 | **5 000** | **0** `true` | 0 | **✔** |

**Todas as sete exigências do §4-C1 batidas. Zero exceções em qualquer fase** (o contrato "nunca lança" segue valendo).

### O par vermelho→verde, lado a lado — é ISTO que prova, não o verde sozinho

| vetor | ANTES (R1, mesmo arquivo sem a correção) | DEPOIS (G1) |
|---|---|---|
| tamper-padding | **79/20 000** = 0,3950 % (z = +0,10 contra 1/256) | **0/100 000** |
| pino de keylen (33 B canônicos) | **18/5 000** = 0,3600 % (z = −0,35 contra 1/256) | **0/5 000** |
| ctrl + | 20 000/20 000 | **100 000/100 000** |
| ctrl − | 0/20 000 | **0/100 000** |

### O que cada N COMPRA, em poder (o §4 manda declarar; não é enfeite)

- **0/100 000 no tamper-padding.** Se o 1/256 persistisse, P(0 em 100 000) = (255/256)^100000 =
  e^−391,4 ≈ **10^−170**. A hipótese "o defeito continua na taxa medida" está refutada com margem absurda.
  **O que o 0 NÃO diz:** não prova taxa **zero**, prova taxa **pequena**. Pela regra de três, o limite
  superior de 95 % para um residual é **3/100 000 = 1/33 333** — isto é, ao menos **130× menor** que o
  1/256 de antes, com 95 % de confiança. Afirmar "zero absoluto" seria exatamente o erro de método que a
  OBS-3 do 4a nomeou; o mecanismo é que é determinístico (o guard roda antes de qualquer derivação), e é
  disso que vem a confiança, não do número redondo.
- **0/5 000 no pino** (o plano exigia 1 000). P(0 em 5 000 | 1/256) = e^−19,57 = **3,2 × 10⁻⁹**. Rodei
  5 000 e não 1 000 para **parear com o N do vermelho-controle** — comparar 0/1 000 com 18/5 000 seria
  comparar N diferente. O N do plano está contido e superado.
- **100 000/100 000 no controle positivo** é a resposta ao **risco §7.2** ("C1 rejeitar stored legítimo").
  Pela regra de três, uma taxa de rejeição indevida de stored legítimo é < **3/100 000** a 95 %. O argumento
  do plano ("`hashPassword` emite base64 canônico por construção") deixa de ser argumento e vira **controle
  executado** — que era exatamente a exigência.
- **30 execuções de arquivo NÃO provariam isto.** Sob 1/256, 30 verdes têm poder de **11,1 %** e
  P(0 em 40) = 85,5 % (medição 1 do 4a). Nenhuma bateria de arquivo cabível neste bloco distinguiria
  "consertei" de "tive sorte" — a prova mora na sonda, e é por isso que ela existe.

**Assinatura de mecanismo, de brinde (não pedida, mas ela cai do log):** a fase do pino caiu de **8 098 ms**
(R1) para **3 298 ms** (G1) e a do padding de 3,08 ms/iteração para 1,92 ms/iteração — porque o stored
rejeitado **não deriva mais nada**. O caminho corrigido é mais **barato**, não mais caro; e a queda de custo
é observável, o que é uma segunda testemunha independente de que os guards novos estão de fato disparando.

---

## §6 — Regressão: o que a C1 poderia ter quebrado, executado

| # | Comando | Resultado | ec |
|---|---|---|---|
| V1 | `npm run check` (`tsc -p tsconfig.json --noEmit`) | sem erro | **0** |
| V2 | `npm run lint` | **este script cai no mesmo `tsc --noEmit`** (o `package.json` aponta `lint` para `check`) — dito por honestidade: **não** houve uma segunda ferramenta de análise, foi o mesmo typecheck | **0** |
| V3 | `run-backend-tests.mjs tests/authority-credential.test.ts` (usa `verifyPassword` direto) | `# tests 6 · # pass 6 · # fail 0 · # skipped 0` | **0** |
| V4 | `run-backend-tests.mjs tests/authority-release-approval.test.ts` (**carrega o stored escrito à mão**) | `# tests 14 · # pass 14 · # fail 0 · # skipped 0` | **0** |
| V5 | `run-backend-tests.mjs tests/authority-removal.test.ts` (**idem**) | `# tests 10 · # pass 10 · # fail 0 · # skipped 0` | **0** |
| V6 | `run-backend-tests.mjs tests/authority-portal.test.ts` × **30 execuções** | **30/30 `ec=0`**; TAP agregado dos 30 logs: `30 × "# tests 12"`, `30 × "# fail 0"`, `30 × "# skipped 0"`, `30 × "# cancelled 0"`; linhas `not ok` nos 30 = **0**; **30 logs** em disco (`ap-r01…ap-r30.log`), nenhuma rodada descartada | **0** |

**V4/V5 fecham o risco §7.2 na prática:** os dois arquivos que carregam `scrypt$1024$8$1$c2FsdA$aGFzaA` —
stored que a C1 **passa a rejeitar categoricamente** — seguem **14/14** e **10/10**. Confirma por execução o
que a leitura do §3 já dizia: nenhum deles verifica senha.

> **⚠ Leia o V6 pelo que ele é.** As 30 execuções são **regressão de forma e pino de denominador**, **não** a
> prova da correção: sob 1/256, 30 verdes têm poder de **11,1 %**, e o arquivo saía verde 30/30 **antes** da
> C1 também (F1 do 4a). Quem ler "30/30" como prova comete exatamente o erro que a OBS-3 nomeou. A prova é o
> §5. O que o V6 estabelece é que a C1 **não quebrou nada** e que o denominador segue **12**.
> (Efeito colateral que a junta pode querer saber: com a C1 aplicada, a asserção da l.162 deixou de ser 1/256
> e passou a ser **determinística** — o stored com padding removido agora é rejeitado sempre. O teste virou
> verde **honesto**, embora ainda não exercite o que diz exercitar; isso é a C2.)

---

## §7 — O QUE ESTA PROVA **NÃO** COBRE (ressalvas explícitas — a parte que não se omite)

1. **⚠ A MAIS IMPORTANTE — a C1 sozinha deixa a classe SEM exercício permanente.** O único código do
   repositório que percorria o caminho padding-removido era o tamper da l.161, e ele é **de teste, não de
   guarda**: agora que a C1 o rejeita determinísticamente, **nada na suíte falharia se alguém revertesse a
   C1** — voltaria a ser 1/256, e 30 execuções de CI teriam 11 % de chance de notar. **Minha sonda é
   scratchpad e morre com o bloco.** O guard permanente da classe são os **casos novos do §3-C2.2 e do
   §3-C2.3** do plano, que pertencem à correção **C2** — outro agente, e **eu não posso tocar
   `tests/authority-portal.test.ts`** (mandato e §5.1). **Enquanto a C2 não entrar no MESMO commit, a entrega
   está incompleta pelo desenho do próprio plano** (§7.1: "o teste que vai ficar verde não pode ser a única
   testemunha do `src/` que o deixava passar" — e, neste instante intermediário, não há testemunha nenhuma).
   Registro isto como condição de fechamento do bloco, não como juízo sobre o achado.
2. **Suíte completa (`npm test`) NÃO foi executada.** É o §6.6 da bateria do bloco, exige cluster descartável
   `san2-4b-*` e **não é deste mandato** (C1 apenas). Executei os **4 arquivos** que exercitam
   `verifyPassword` ou carregam stored escrito à mão **e** rodam em memória.
3. **`tests/authority-release-approval-rls.test.ts` e `tests/authority-removal-rls.test.ts` NÃO foram
   executados** — exigem Postgres, e o §5.2 do plano **proíbe** `erp-postgres` (nem leitura); subir cluster é
   passo da bateria do bloco, não deste mandato. **Conferência foi por LEITURA:** nenhum dos dois chama
   `verifyPassword` nem faz login (grep = 0); o stored escrito à mão só preenche coluna no `INSERT`.
   **Leitura, não execução — declarado como tal.**
4. **A ressalva herdada do §2.9 do plano continua aberta:** o **1/2 do jurado** na suíte inteira **não** fica
   explicado por este trabalho. A sonda mede a **função isolada**, não o arranjo de suíte completa. Sob
   1/256, ver ≥1 falha em 2 execuções tem P = 0,78 % — ou foi azar de 1-em-128, ou há uma segunda
   contribuição só naquele arranjo. **Nada aqui decide entre as duas.**
5. **Uma máquina, um Node, um SO:** `N3SOH82`, **v20.19.5**, Windows 11 Pro 10.0.22631. O mecanismo corrigido
   é determinístico e não depende de plataforma — mas isso é **argumento**, não medição, e segue argumento
   (mesma honestidade da medicao-1 §4.4).
6. **O comprimento do SALT não é pinado** (só o do hash). Um salt **canônico** de comprimento ≠ 16 continua
   aceito. Está **fora** do que o §3-C1 pede (duas validações, e só duas) e fora do meu mandato. **Fica dito.**
7. **`src/modules/auth/services/password.service.ts`** (o `parseScryptHash` próprio das credenciais locais de
   `auth`, formato de **7** campos) **não foi lido em busca da mesma classe nem tocado** — outro módulo, fora
   do §5.1. Fronteira de escopo, não achado meu.

---

## §8 — Escopo, terreno de saída e estado

**Escopo — conferido por execução, não por promessa:**

```
git diff --name-only  ->  src/modules/authority/authority-password.ts     (UNICO rastreado alterado)
git status --short    ->   M src/modules/authority/authority-password.ts
                           ?? agent-orchestration/omega/juntas/votos/SAN2-4b/    (este diario)
                           ?? agent-orchestration/omega/planos/SAN2-4b-plano.md  (ja estava; e o plano)
git diff --check      ->  ec=0  (sem espaco em branco defeituoso)
git rev-parse HEAD    ->  fca131adf84820503f57cd2383876222aa091cf7   (INALTERADO: nenhum commit, por mandato)
git diff --stat       ->  1 arquivo, 29 insercoes, 5 remocoes
```

- **NÃO toquei:** `tests/authority-portal.test.ts` (C2), `tests/helpers/auth-identity-fixture.ts` (C3),
  `tests/rls-tenant-isolation.test.ts` (C3/C4), `tests/db-catalog-write-guard.test.ts` (C3), `scripts/**`,
  `.github/**`, `Kpis/**`, `prisma/**`, contratos, `pendencias.md`, `status-geral.md`, planos alheios,
  `.claude/agents/**`, `.agents/**`. Nada de registro (§3-C5) nem de KPI (§3-C6) — não é o meu mandato.
- **`erp-postgres` / `erp-redis`: ZERO comandos, nem de leitura.** `docker ps` na saída:
  **`erp-postgres` Up 2 days (healthy)** · **`erp-redis` Up 2 days (healthy)** — o mesmo uptime da abertura,
  **atravessado inteiro** por este trabalho. Nenhum container `san2-4b-*` criado (a C1 não usa banco);
  **nenhuma porta alocada**, logo o `netsh` não foi necessário.
- **Nenhuma branch além de `fix/san2-4b-corrigir-arnes` foi tocada**; `demo/investidor` intocada.
- **Limpeza (§C5):** o trabalho não gerou artefato de build (`tsc --noEmit` não emite; nenhum `npm run build`,
  nenhum `dist/`). Os **logs e a sonda ficam preservados** em `scratchpad/san2-4b/` — `c1-probe.mts`, 3 JSON
  (`R0`, `R1`, `G1`), 30 TAP do `authority-portal`, 3 TAP de regressão e o baseline — porque **as tabelas
  deste diário os citam por nome** e a reprodutibilidade por terceiro depende deles. Varrer o scratchpad é a
  limpeza do **fechamento do PR**, não deste passo. Nada rastreado apagado; `node_modules` intocado.

**Divergências mandato × plano (declaradas; nenhuma silenciosa):**

1. **Pino de keylen rodado com N = 5 000, não 1 000.** O plano exige 1 000; rodei 5× mais para **parear com o
   N do vermelho-controle** (comparar 0/1 000 com 18/5 000 seria comparar N diferente). Exigência **contida e
   superada** — desvio de N para cima, não de conteúdo.
2. **Acrescentei o vermelho-controle R0/R1**, que o §4-C1 não pede explicitamente. Justificativa no §2: sem
   ele, o 0/100 000 não distingue "corrigi" de "sonda cega". Custo: ~70 s.
3. **A C1 acrescentou um helper novo** (`isCanonicalBase64`) além de editar o corpo de `parseStored`. O §5.1
   diz "SOMENTE `parseStored` + comentário l.82-85"; entendo o helper como **parte da validação 1** que o
   §3-C1.1 manda criar — mesmo arquivo, usado só por `parseStored`. **Se a cadeira de escopo discordar, é
   inline-ável em uma linha.** Está dito para ser julgado, não para passar despercebido.

**ESTADO: correção C1 CONCLUÍDA e PROVADA no N exigido.** As sete exigências do §4-C1 batidas
(**0/100 000** no tamper-padding · **100 000/100 000** no controle positivo · **0/100 000** no negativo ·
**0/10 000** em cada malformado, sem exceção · **3/3** OWASP · **0/5 000** no pino), contra um
vermelho-controle de **79/20 000** e **18/5 000** medido pela mesma sonda, no mesmo arquivo, sem a correção.
**Não commitei** (mandato). **Bloco NÃO fechado:** faltam C2, C3, C4, o registro (§3-C5), o KPI (§3-C6) e a
bateria completa (§6) — e o item 1 do §7 acima é a condição que a **C2 precisa cumprir no MESMO commit** para
que esta correção não fique sem testemunha permanente.
