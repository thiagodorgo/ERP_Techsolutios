# Registro de quedas — bloco `B-O6R-07a` (formato P6)

| # | agente | modelo | mandato | fase da morte | erro | custo do redo |
|---|---|---|---|---|---|---|
| 1 | `dev-o6r07a-auth-residuais` | gp (endpoint da sessão) | 3 itens (A1/A2/A3) | **restaurando a correção depois do vermelho-controle final do A1** — código dos 3 itens no disco, evidência parada no baseline | `server_error` — *No response from API* (família streaming) | **código PRESERVADO; PROVA PERDIDA** — o sucessor refaz os 3 vermelhos-controle |

## O estado em que ele deixou a árvore — medido pelo orquestrador, não presumido

A mensagem de morte foi *"Vermelho-controle final do A1 confirmado. **Restaurando a correção**"* — o ponto
mais perigoso possível, porque o vermelho-controle funciona **injetando a reversão** da correção para provar
que a sonda morde, e depois **restaurando**. Morrer nesse vão pode deixar o código revertido.

**Não deixou.** Verificado por leitura direta do código, item a item:

| item | marcador procurado | onde está | veredito |
|---|---|---|---|
| **A1** | `verifyAnonymousCandidate` chamando o `incrementFailedAttempts` atômico do B01 | `local-auth-login.service.ts:261` (comentário do reuso em l.216) | **restaurado** |
| **A2** | `TokenBucket` reusado de `portal-shared` + balde por IP | `auth.routes.ts:113` (`loginIpBucket`), import em l.11-14 | **restaurado** |
| **A3** | pino do trio N/r/p no parse | `password.service.ts:135` (`parsed.N !== SCRYPT_N \|\| parsed.r !== …`) | **restaurado** |

`git diff --numstat` de `src/modules/auth/`: `16 0` · `57 1` · `16 3` · `35 5` · `17 0` — **adições
dominantes, nenhuma remoção em massa**, o que é consistente com correção presente e não com reversão viva.

## A não-conformidade com o P1 — e é ela que custou, não a morte

O arquivo `dev-a1-a3-auth.md` foi escrito às **14:46** com o `§0 Baseline` completo, e **nunca mais**.
Os 4 arquivos de teste que ele criou têm carimbo de **14:48 a 15:02**, e a morte veio depois. Ou seja:
**ele mediu A1, A2 e A3 sem gravar nenhum deles**, deixando os três em `EM APURAÇÃO`.

O P1 diz, desde a lição da queda #1 do `SAN2-1R`: *"escreva a entrada do item N **antes** de iniciar o
item N+1 — medir sem escrever é não ter medido"*. E o P3 fecha a porta: **conclusão sem comando registrado
não é insumo, inclusive parcial favorável.**

**Consequência prática, e ela é assimétrica:** o **código sobrevive** (está no disco, é auditável, e a junta
o julgará pelo que ele é). A **prova não** — os três vermelhos-controle têm de ser refeitos do zero pelo
sucessor. Não porque duvidamos do caído, mas porque *"o vermelho-controle é o que separa uma correção
provada de uma correção que apenas passou"*, e dele não sobrou comando nenhum para re-executar barato.

Contraste que mede o valor do protocolo: na queda da cadeira C3 do `J-SAN2-6`, **hoje**, o P1 foi cumprido e
o custo foi **1/3 do mandato**. Aqui, com o P1 descumprido, o custo é **3/3 das provas**.

## O que o caído entregou de bom, e que o sucessor herda como ROTEIRO (P3)

O `§0 Baseline` está completo e re-executável — e traz duas medições que valem por si:

1. **As 4 falhas conhecidas, confirmadas por execução própria** na forma canônica do runner:
   `251 arquivos · 2622 testes · pass 2616 · fail 4 · skipped 2`, com os 4 `not ok` transcritos por número
   de linha. É o denominador contra o qual o sucessor prova que não nasceu uma quinta.
2. **Ele NÃO confiou na porta que o mandato sugeriu — re-mediu, e ainda bem:** a `56434` **já estava
   ocupada** por `pm-e2-pg`, container do outro dev que roda em paralelo, subido ~1 min antes. Ele subiu em
   **`:56438`** e `:56381`. É a regra *"meça a porta, não herde a porta"* funcionando no caso real que ela
   previa.

## Correção que o caído fez CONTRA o orquestrador, e que procede

O mandato que escrevi citava o head `c453454`; o head real era **`2d54ea2`** — porque **eu** emendei aquele
commit para consertar um backtick que a shell havia comido na mensagem, e **não atualizei o mandato**.
Ele registrou a divergência em vez de escondê-la e trabalhou sobre o head real. **Terceira vez nesta sessão
que passo um número de head defasado a um agente.** A prática que passa a valer, e que já apliquei ao dev
seguinte: **não citar head no mandato — mandar o agente medir o próprio head.**

## Ação do orquestrador

- Sucessor `dev-o6r07a-auth-provas`, identidade nova, mandato **P3**: **verificar** o estado dos 3 itens,
  **refazer os 3 vermelhos-controle** e fechar a evidência. Não reescrever código que já está de pé, salvo
  se a verificação mostrar que está errado.
- **P5 não disparou:** 1 queda nesta janela (a da cadeira C3 do `J-SAN2-6` foi horas antes). Sem pausa.
- Nenhuma conclusão do caído é herdada como fato — só o `§0 Baseline`, que tem comandos, serve de roteiro.

---

## ERRATA (orquestrador, pós-execução do sucessor) — a frase "não sobrou comando nenhum" é FALSA

O sucessor `dev-o6r07a-auth-provas` **achou um erro neste registro**, e ele procede.

Onde eu escrevi *"dele não sobrou comando nenhum para re-executar barato"*, a medição mostra que
**sobrou saída BRUTA** no scratchpad da sessão — **9 arquivos**: `red-a1-mem.txt`, `red-a1-db.txt`,
`red-a1-final.txt`, `red-a2-probe.ts`, `red-a2-probe.mts`, `red-a3.txt`, `green-n1.txt`, `green-n2.txt`,
`green-n3.txt`. Conferidos por `ls` pelo orquestrador.

**O que muda e o que NÃO muda:**

- **A premissa era imprecisa** — eu afirmei ausência sem ter varrido o scratchpad. É exatamente a classe
  *"afirmação publicada sem medir"* que esta rodada combate, cometida por mim, no registro que existe
  para registrar exatamente isso.
- **A conclusão continua correta, e por outro motivo:** saída bruta **sem comando, sem head e sem
  atribuição** não é roteiro re-executável — é log órfão. O **P3** exige *"re-roda cada comando
  registrado e compara a saída"*, e não há comando registrado. Logo os três vermelhos-controle tinham
  mesmo de ser refeitos do zero. **O custo de 3/3 das provas estava certo; a razão que eu dei, não.**
- **Conduta do sucessor, que é o padrão a seguir:** ele **não usou** os arquivos (não são insumo pelo P3)
  e **não os apagou** (não eram comprovadamente dele). Declarou os dois lados.

**A lição fica mais afiada, não mais fraca:** o P1 não pede que o agente *produza saída* — pede que ele
**grave comando + saída + veredito no arquivo de evidência**. O caído produziu saída e não a ancorou; por
isso ela existe e não vale. **Log órfão é indistinguível de log inventado**, e é por isso que o protocolo
exige o par comando↔saída no mesmo lugar.

---

| # | agente | modelo | mandato | fase da morte | erro | custo do redo |
|---|---|---|---|---|---|---|
| 2 | `dev-o6r07a-ciclo2` | gp (endpoint da sessão, `claude-fable-5`) | 3 itens (D1/D2/D3) | **entre a correção do D1 e a medição do verde** — subindo o cluster para o caso `-db`; os **QUATRO vermelhos-controle já gravados** | **`rate_limit` HTTP 429 — teto de sessão** | **cauda apenas**: as 4 provas de vermelho sobrevivem íntegras; falta medir o verde, e o D2/D3 inteiros |

## Esta é a queda mais bem-conformada da rodada — e o contraste com a #1 é a prova do P1

O `dev-o6r07a-ciclo2` fez **tudo** o que o protocolo pede, e por isso a morte custou pouco:

1. **Esqueleto criado ANTES de qualquer edição**, com D1/D2/D3 e o D1 já **fatiado** em `D1.a`…`D1.h`.
2. **Cada vermelho-controle gravado AO SER MEDIDO, antes da correção** — comando, `ec` e **trecho da
   saída**:
   - **M1** (`ec=1`): *"uso CORRETO na org A não pode mover o contador da org B"* · `5 !== 0` — a sonda 2
     da C2 **reproduzida por um agente que não é ela**;
   - **M2** (`ec=1`): 1 linha `auth.login.failed` contra a org irmã **num login de SUCESSO** · `1 !== 0`;
   - **M3** (`ec=1`): `2 !== 1` — o head cobra **por candidato**;
   - **M4** na **base `f895dd2`**, em worktree descartável próprio com `npm ci` próprio: `0 !== 5` — **o
     contador parado da medição original do secops**, reproduzido.
3. **Declarou o placar de cada execução** (`pass 2/fail 3` no head; `pass 3/fail 2` na base) e explicou
   **por que** cada caso cai de um lado: na base não há efeito colateral, logo não há contaminação da irmã.
4. **M5 declarado como regressão, não como sonda** — exatamente como o plano manda, sem inventar um
   vermelho que não existe.
5. **Terreno limpo antes de morrer:** o worktree `dev-c2-base` **foi removido** (`git worktree list`
   confirma a ausência).

**Custo real, medido:** as **quatro** provas de vermelho estão íntegras e são **roteiro re-executável**
(P3). A correção está no disco (`auth-runtime` 7/0 · `auth.routes` 3/0 · `anonymous-login.service` 39/0 ·
`local-auth-login.service` 56/27 · `-db` 76/0 · mono-org 11/12) mas **não foi verificada verde**, e o
`D1.f` está `(a registrar)`. **D2 e D3 não começaram.**

**O contraste que mede o protocolo, dentro do mesmo bloco:** a queda #1 (`dev-o6r07a-auth-residuais`)
mediu três itens **sem gravar** e custou **3/3 das provas**. Esta gravou tudo ao medir e custou **a cauda**.
Mesma família de trabalho, mesma classe de morte, **um terço do custo** — porque um cumpriu o P1 e o outro
não.

## Resíduo a varrer (não é do sucessor decidir sozinho)

Container **`dev-c2-pg`** ficou de pé (Up 2h). É dele; o sucessor derruba ao final, ou o orquestrador
varre. **Nenhum container que não seja do bloco é tocado** — `erp-postgres`/`erp-redis` são a base viva.

## Ponto que o sucessor DEVE auditar, e não herdar

`tests/o6r07a-anon-lockout.test.ts` saiu **11/12** — ou seja, **12 remoções**. O C2·5 item 7 permite nesse
arquivo *"SÓ o ajuste mecânico que a assinatura interna exigir (justificado linha a linha; asserções
mono-org **não afrouxam**)"*. **Doze remoções sem justificativa registrada é exatamente o que a junta do
ciclo 2 vai procurar.** O sucessor confere linha a linha se é assinatura ou se alguma asserção afrouxou —
e, se afrouxou, **reporta como achado contra a correção**, não conserta em silêncio.

---

| # | agente | modelo | mandato | fase da morte | erro | custo do redo |
|---|---|---|---|---|---|---|
| 3 | `dev-o6r07a-ciclo2-b` (sucessor) | gp (endpoint da sessão, `claude-opus-5`) | 3 itens (V1/V2/V3) | **indo rodar o guard de paridade**, com V1 e V3-parcial **gravados** e o **V2 feito no disco mas NÃO gravado** | **`server_error` HTTP 522** (Cloudflare — TCP à origem) | **cauda curta**: falta gravar o D2, fazer `D3.d`/`D3.e` e a bateria |

## Terceira classe de erro distinta na série — e isso já é um dado

As três quedas deste bloco têm **três causas diferentes**: `server_error` de streaming (#1), `rate_limit`
de cota (#2), `server_error` **522 de rede** (#3, Cloudflare não estabeleceu TCP com a origem). A série do
P6 existia para decidir a hipótese *"endpoint pinado × endpoint da sessão"*; ela agora mostra outra coisa,
mais útil: **as quedas não têm uma causa só, logo não têm um remédio só.** O que protege contra as três é
o mesmo — **gravar ao medir** —, e não a escolha de modelo.

## O que este caído fez bem, e o que não fez

**Bem — e este é o padrão que o bloco deve seguir:**

- **Auditou a correção do antecessor item a item contra o C2·3, ANTES de rodar qualquer coisa**, e
  registrou a tabela pergunta × código × veredito. Não herdou o código como bom.
- **Resolveu, com prova, o ponto que o orquestrador mandou auditar e não herdar:** o `11/12` do arquivo
  mono-org **não afrouxou nada** — `grep -c "^test("` dá **7** no blob de `9d44989` **e** na árvore; as 12
  remoções estão dentro dos corpos; as três asserções que sustentam *"1 falha mono-org = 1 incremento +
  1 linha"* são **idênticas** antes e depois.
- **Foi medir dois pontos que não aceitou por leitura**, e declarou que cada um seria achado se desse o
  contrário — entre eles o mais fino: **`registerFailure` é dep OPCIONAL**, logo a cobrança sumiria em
  silêncio (**fail-open**) se algum sítio não a injetasse; foi contar os sítios de construção.
- **Rodou regressão de vizinhos que ninguém pediu** (os outros sítios que constroem o service): 16/16.
- Provou `D1.g` (verde N=3, denominador idêntico), `D1.h`, `D3.a` (os 3 vermelhos do dual-match no código
  pré-correção), `D3.b` e `D3.c` (migração: cabeçalho `--`, corpo byte-idêntico, idempotência re-provada).

**Não fez — e é não-conformidade com o P1, a mesma da queda #1, em escala menor:** o **D2 inteiro está no
disco e não no diário**. `achados.jsonl` (1/1), `REGISTRO_ACHADOS_O6R.md` (66/24) e `kpis-latest.json`
(3/8) foram **editados**, e os quatro sub-itens `D2.a`–`D2.d` seguem `(a registrar)`. Ele morreu indo rodar
o guard de paridade — provavelmente pretendia registrar depois de confirmar. **O P1 existe exatamente
contra esse "depois".**

**Consequência, e ela é assimétrica de novo:** o trabalho do D2 **existe e é auditável pelo diff**, mas
**não é insumo** enquanto não houver comando registrado (P3). O próximo sucessor **re-verifica o D2 e o
grava** — não o assume.

## Resíduo

- Worktree **`dev-c2b-red`** (detached em `9d44989`) — **de pé**; era o terreno dos vermelhos. Remover só
  por `git worktree remove --force`.
- Container **`dev-c2-pg`** (Up 7h) — resíduo da queda #2, ainda não varrido.
- Ambos são do bloco. `erp-postgres`/`erp-redis` são a **base viva** e não se tocam.
