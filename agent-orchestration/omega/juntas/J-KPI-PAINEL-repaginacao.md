# J-KPI-PAINEL — repaginação do painel de KPI (artefato principal, público investidor)

- **Data:** 2026-08-17 · **Objeto:** reconstrução do zero de `Kpis/index.html`, `Kpis/app.js`,
  `Kpis/styles.css`, mais a reconciliação do registro da auditoria Ω6R.
- **Pedido do dono, verbatim:** *"esqueça o padrão que tem lá, quero gráficos de desempenho e conclusão, as
  últimas demandas e bugs achados/adiados/corrigidos, qual o progresso atual, quais demandas e cronograma
  completo com checklist"* + *"preciso mostrar para os investidores"*.
- **Restrição do dono:** os JSON de `Kpis/` são **indeléveis, edição só incremental**. Cumprida e provada:
  os 137 registros do `kpis-history.json` estão byte a byte idênticos ao `HEAD`; a entrega acrescentou 1.
- **Composição:** 6 lentes de auditoria independentes + 30 céticos adversariais (1 por achado), em duas
  rodadas — a segunda sobre as **correções** da primeira.

---

## 1. Resultado

**37 achados levantados · 19 confirmados por cético · 19 corrigidos.** Mais 2 que o cético havia **refutado**
e que a medição mostrou reais (corrigidos mesmo assim, ver §4).

Bateria: **backend 2437/2446 → 2457/2466**, 0 falhas, execução real. Os **+20 testes** não são enfeite de
contagem: cada um nasceu de um defeito concreto deste PR.

## 2. Os dois piores achados eram regressões desta própria reconstrução

Registrado aqui porque é o que a ata precisa dizer e o autor não diria sozinho.

### 2.1 A ressalva de "estimativa" saiu da tela, e o número virou manchete

`metrics.mvp_vendavel` declara, no próprio dado: *"Percentual estimado, sujeito a revisão humana."* O painel
**anterior** renderizava essa frase como **texto visível** no cartão — provado executando `git show
HEAD:Kpis/app.js` no mesmo sandbox e comparando o HTML produzido.

A reconstrução:
- moveu a ressalva para um campo (`note`) que a tela **não lê** — a única ocorrência de `.note` no arquivo
  virava dica de ferramenta, invisível em captura, impressão ou PDF;
- **e**, no mesmo movimento, promoveu o número de um cartão de 14px entre seis para a **manchete de 44px com
  barra de progresso preenchida a 88%**.

Resultado: um palpite declarado ganhou a mesma gramática visual de *"2 de 15 achados críticos corrigidos"*,
que é contagem real — numa página cujo público declarado é investidor. O cético tentou derrubar o achado por
cinco caminhos e todos falharam; o quinto (que o auditor não tinha visto) foi provar que era **regressão**.

### 2.2 O gráfico de "ritmo de entrega" media outra coisa e errava nas duas direções

Contava **registros de KPI publicados** por semana, sob o título "Desempenho / Ritmo de entrega":

| Semana | O gráfico dizia | O git diz |
|---|---|---|
| 06/07/2026 | **0 entregas** | **45 PRs mergeados** |
| 27/07/2026 | **42 entregas** | 42 registros, **15 PRs** |

O zero não era ausência de entrega: era ausência de **registro** — as rodadas daquele período adiaram a
publicação de KPI de todos os seus PRs para um snapshot único, e o próprio `description` dos registros diz
isso. E o `title` no SVG, o rótulo da barra e a tabela acessível repetiam o número errado.

**O agravante:** o teste-guarda que este autor escreveu para proteger este gráfico afirmava, com todas as
letras, que a semana vazia era *"zero VERDADEIRO, não invenção"*. É a classe de defeito que este repositório
persegue há rodadas — *um artefato afirma um resultado que a execução não produz* — cometida **dentro da
própria defesa contra ela**.

Substituído pelo **delta do acumulado `blocks_completed`** entre pontos medidos, que é medição real: semana
sem medição devolve `null` e vira faixa, nunca zero; barra que acumula um intervalo sem medição leva
asterisco e explicação.

## 3. Consertar reintroduziu a mesma classe duas vezes

Vale mais como lição do que os achados originais:

1. O `caveat` **novo**, escrito para corrigir §2.1, terminava com *"está reprovada até os achados críticos
   fecharem"* — cláusula presa ao estado atual, que é exatamente o achado nº 5 da mesma lista. Pego pelo
   teste de mutação (fechar os 15 críticos e ver o que a página passa a dizer), não por leitura.
2. A faixa que substituiu o zero falso em §2.2 nasceu **sem regra de CSS**. O navegador pinta `<rect>` sem
   `fill` de **preto**: a marca de "semana sem medição" virou a **maior barra do gráfico** — pior do que o
   zero que ela substituiu, porque se lê como o valor mais alto. Nenhum teste de dado pegaria; virou o guard
   *"toda classe de marca SVG tem regra no CSS"*.

**Conclusão operacional:** a segunda passada adversarial sobre as *correções* não é zelo excessivo. Nas duas
vezes, a correção de um defeito de honestidade criou outro defeito de honestidade.

E a segunda passada confirmou o padrão em escala: **15 dos 17 achados dela eram regressões das correções da
primeira.** A lição que este bloco deixa para os próximos, e que não estava escrita em lugar nenhum:

> **Revisar o código é metade do trabalho; revisar a correção é a outra metade.** Neste bloco, a taxa de
> defeito introduzido POR conserto foi maior que a de defeito original — três rodadas, e todas as três
> acharam a mesma classe. O motivo é estrutural, não descuido: quem conserta acabou de convencer a si mesmo
> de qual é o problema, e escreve o texto do conserto com a mesma confiança que produziu o erro. Nenhuma
> releitura pega isso; **só execução pega.**

## 3b. Segunda passada: 17 confirmados, **15 deles regressões das correções**

A segunda rodada adversarial atacou as *correções* da primeira. Resultado: **37 achados levantados, 17
confirmados, 5 bloqueando publicação** — e quinze deles nasceram no conserto, não no código original.

**O pior fechou só metade.** A correção que trouxe *"Percentual ESTIMADO"* para o 88% deixou o **99%
(`mvp_demo`) sem ressalva alguma**, no mesmo cartão, abaixo de um divisor tracejado que o separa em
compartimento próprio. Efeito medido: o número **mais alto e mais lisonjeiro** da página passou a parecer,
por contraste, o **mais sólido** — pior do que antes da correção, quando os dois estavam igualmente sem
ressalva. E o guard novo passava verde, porque a asserção era uma busca global que o 88% satisfazia sozinho.

**A terceira ocorrência da classe estava dentro do teste escrito para matá-la.** A mensagem de falha do
guard afirmava que o `caveat` *"chega à tela"*; para `mvp_demo` não chegava. O comentário dizia *"este guard
fecha a classe"*; fechava para uma métrica só, e por acidente. Corrigido para asserção **por métrica**, e
provado por mutação: removida a linha da correção, a asserção muda de estado.

Outras confirmadas, todas da mesma família:

| O que afirmava | O que a execução produzia |
|---|---|
| `*` = "inclui o trabalho da semana sem medição" | na semana de 13/07 o intervalo sem medição contribuiu **zero**; a bandeira mede **janela**, não conteúdo |
| motivo da quebra: "o 44 estava congelado" | o 44 era contagem **completa e real** de 5 arquivos em 05/07; a suíte foi a 62 sem ninguém reler a métrica |
| cabeçalho do `app.js`: "semana sem registro é zero VERDADEIRO" | sobreviveu à correção do código e continuava descrevendo a versão anterior |
| cabeçalho do guard: "três novos invariantes" | entraram **nove**; um dos nomeados não existia e outro já existia |
| `README`: "os dois guards", 11 testes | são **três** guards e **15** testes naquele arquivo |
| tipo `weeks: { count: number }` | a execução produz `count: number \| null` + `medido`/`spansGap` |
| comentário do CSS: faixa "hachurada, atrás da grade" | o desenho é chapado e vem **depois** da grade |
| `.chart rect.bar:hover` | as barras são `<path class="bar">` — o seletor nunca casou |
| "Sem registros no histórico." | falso com 135 registros e nenhuma medição de blocos |

**Uma barra de um dia encerrava a série lendo-se como colapso.** A última semana tinha **1 de 7 dias
medidos** e era desenhada com a mesma largura, cor e gramática de uma semana inteira — num gráfico que já
se comprometera a marcar as outras duas situações em que a barra não é semana limpa. Ganhou marca `†`,
opacidade menor e nota, derivadas **da própria série** e nunca do relógio: usar `Date.now()` faria a marca
aparecer e sumir sozinha conforme o dia em que alguém abrisse a página, e o guard não poderia prová-la.

## 3c. Terceira passada: a **quarta ocorrência** estava na correção da segunda

Rodada estreita, só sobre o que a segunda correção tocou, com a instrução explícita de achar a quarta
ocorrência da classe. **Achou** — e ela é a marca de "semana parcial" que a segunda rodada criou.

**"Semana ainda em curso" é afirmação sobre o relógio, produzida por um cálculo que se recusa a olhar o
relógio.** O comentário do próprio código declarava a recusa, com bom motivo (usar `Date.now()` faria a
marca aparecer e sumir sozinha conforme o dia em que alguém abrisse a página, e nenhum teste poderia
prová-la). O texto então afirmava o fato de que a decisão abriu mão de saber.

Hoje a frase é verdadeira **por coincidência**. O cético provou que ela é falsa em estados reais do
projeto: truncando o histórico **real** no último snapshot antes da lacuna de 17 dias de junho, o painel
afirma *"ainda em curso"* sobre uma semana encerrada havia até 12 dias. E mediu a frequência: em **35 de 35**
cortes reais de publicação o gatilho dispara, e **7 dos 34** intervalos entre publicações cruzam fronteira de
semana. O erro **adula** — converte "faz duas semanas que ninguém publica" em "a semana mal começou, a barra
pequena é normal", que numa página para investidor é leitura material errada de ritmo, na direção favorável.

**Duas ocorrências na mesma frase.** `diasMedidos` era o span de dias de calendário desde a segunda-feira,
não a contagem de dias com medição — na semana de 15/06 o rótulo dizia 4 e havia snapshot em 3.

**E a marca era assimétrica sem razão:** só a última semana era marcada. A **primeira** da série publicada é
igualmente recortada pela borda e era desenhada como semana cheia.

Corrigido para afirmar só o que o dado sustenta — **cobertura de janela**, com as datas que a produziram,
aplicada às duas pontas: *"a série publicada começa em DD/MM e para em DD/MM"*. Sem relógio, reprodutível,
e verdadeira em qualquer dia em que a página for aberta.

**O quarto gráfico obrigatório estava faltando.** O `CLAUDE.md` §C3.0 lista quatro; o painel novo tinha três.
Portado o *entregas por rodada* do painel anterior, com as duas ressalvas que ele já carregava e que agora
aparecem na tela: a rodada é lida do **nome da versão** (não é campo declarado) e o gráfico **corta em
19/07/2026**, quando o registro virou contínuo — antes disso uma rodada inteira cabia num snapshot, e
comparar os dois regimes mentiria. O guard exige que soma das barras + recortados feche com o total.

## 4. Dois refutados que a medição mostrou reais

O cético refutou; medir foi mais barato do que discutir, e a medição contrariou a refutação:

- **série do app de campo a 2,74:1** sobre o painel claro — abaixo do piso de 3:1 para objeto gráfico. O
  comentário do arquivo afirmava que os três tons haviam sido validados contra aquele fundo.
- **alvo de toque de 31px** nos filtros, sem nenhuma media query aumentando no telefone — a DoD do projeto
  (§10) exige ≥44px, e o dono abre este painel no celular.

Ambos corrigidos. Registrado porque *"o cético refutou"* não é evidência: medição é.

## 5. Achados que o trabalho descobriu FORA do painel

- **`Ω6R-DAT-004` estava aberto e sem bloco de correção.** O `PLANO_O6R.md` é de 11/08 e cobria os 29
  achados de então; o DAT-004 nasceu na reconciliação de 14/08 e ficou **órfão** — aberto, e invisível para
  quem lesse o plano. Virou `B-O6R-12`, marcado como adendo pós-junta, com critério de aceite **provisório**
  até a junta do próprio bloco. Encontrado pelo guard de paridade, na **primeira execução**.
- **O registro da auditoria dizia 29 ativos** enquanto os 2 fechados pelo #353 já tinham rastro no JSONL.
  Reconciliado, com a Fase 6 registrada.
- **Uma afirmação do autor estava inflada e o registro o corrigiu:** o `recent` dizia que o #351 *fechou*
  `Ω6R-QUA-004`. Fechou só o componente da linha do tempo; o achado é **parcialmente superado**. Corrigido
  no dado antes de virar tela.

## 6. Mecanismos permanentes (o que impede a volta)

**26 testes**, todos derivados de defeito real:

| Arquivo | O que trava |
|---|---|
| `tests/kpi-achados-paridade.test.ts` (5) | registro ↔ painel ↔ cronograma contam a mesma história; todo achado aberto tem bloco; **zerar o contador de críticos NÃO libera produção** — trocar o veredito exige junta nova registrada em `fonte_veredito` |
| `tests/kpi-dashboard-charts.test.ts` (15) | série ponto a ponto contra o JSON; **mutar o histórico tem de mover a curva**; lacuna não vira zero nem pico; quebra de medida desenhada; `fetch` que **rejeita** (o `file://` real, que o guard antigo nunca exercitou); cópia congelada idêntica ao JSON; ressalva de estimativa chegando à tela; página não anuncia destravamento |
| `tests/kpi-dashboard-contraste.test.ts` (6) | contraste **medido** nos dois temas; nenhuma cor nasce dentro de bloco de tema; cor literal fora dos tokens; **classe de marca SVG sem regra no CSS** |
| `scripts/kpi-freeze.mjs` | a cópia congelada do `file://` é **gerada, nunca digitada** |

## 7. O que esta junta NÃO decidiu

- **Não liberou deploy.** O bloqueio da J-6R segue integral: **13 dos 15 críticos abertos**.
- **Não reclassificou achado** nem mexeu em severidade.
- **Não mudou `mvp_demo`/`mvp_vendavel`.** Nenhum escopo se moveu neste PR, e a política só permite mudá-los
  quando isso acontece. Seria fácil "corrigir" o 88% para baixo agora que a auditoria existe — seria inventar
  uma medida sem base. O que mudou foi **dizer o que ele mede**, ao lado da dimensão que faltava.
- **Não aprovou o critério de aceite do `B-O6R-12`** — ele é provisório, e a junta daquele bloco o revisa.
