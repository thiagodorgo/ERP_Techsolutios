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
