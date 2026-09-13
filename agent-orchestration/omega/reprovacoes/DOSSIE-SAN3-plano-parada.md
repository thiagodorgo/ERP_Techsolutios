# DOSSIÊ AO DONO — PR #386 (plano SAN3) PARADO no teto de dois ciclos (2026-09-12)

> Segundo dossiê sob a `D-TETO-DOIS-CICLOS`. O PR foi reprovado no ciclo 1 (0 × 3), corrigido, e **reprovado de novo
> no ciclo 2 (1 × 2)**. A regra manda parar e te chamar — **não há ciclo 3**. Nenhum dos 37 blocos do plano começou, e o
> Traccar continua esperando o gate, como você mandou.

## 1. O que o PR entregou, e o que disso sobrevive

| Entrega | Estado nas juntas |
|---|---|
| Fechamento do `B-O6R-06` — backfill §C3.5 do #385, obituário (§3.4/§3.5), aposentadoria rodada 2 (12 cadeiras) | **aprovado** pela C3 do ciclo 2 (0 `bloqueia`) |
| Inventário SAN3 — 231 IDs + 32 achados Ω6R + 140 candidatos, medidos pelo código em `15ef3fbe` | não contestado nos dois ciclos |
| Registro corrigido — 52 status errados (22,5%), 49 pendências ausentes registradas; índice byte-idêntico ao gerador | **aprovado** pela C3 (os bloqueios C3-02/C3-03 do ciclo 1 resolvidos); 1 ajuste: 14 ponteiros apontam itens do plano pela numeração antiga, com o bloco dono certo |
| Decisões — `D-TRACCAR-HTTP-PRIVADO-AWS`, `REGISTRO-SAN3-CONFLITOS` (o C3-01 do ciclo 1 corrigido para `D-Ω4-C2`); PD do antivírus | **aprovado** pela C3 |
| Viabilidade das 48 h — **não cabe** (melhor caso ≈ 120–130 h; realista ≈ 14 dias com 4 frentes, ≈ 20,5–21 com 2) | agenda do §6 e números do §9 **conferidos** pela C1, número a número |
| Plano v5 — 54 bloqueantes, 37 blocos, 6 atos do dono | **reprovado** — pela C2 no desenho de dois blocos e pela C1 em três fluxos |

## 2. O que cada junta achou

### Ciclo 1 — REPROVADO 0 × 3 (26 achados, 7 `bloqueia`: 6 dentro, 1 pré-existente)

- **C1-02** — o bloco que fecha o gate exige "faturar" pela web; a web não fatura OS e nenhum bloco construía a ação.
- **C2-01** — o check-in do app ficou fora do gate por mitigação, que o §2 do plano proíbe.
- **C2-02** — o item 16 contava 27 caminhos fora do gate de módulo; eram 38; o guard proposto passava verde com o defeito.
- **C2-09** *(pré-existente)* — técnico responde e conclui vistoria de OS alheia.
- **C3-01** — o conflito do faturamento atribuído à `D-Ω4-C1`; é a `D-Ω4-C2`.
- **C3-02** — `status-geral.md` com números de dois estados na mesma frase.
- **C3-03** — duas pendências do painel fechadas sem cumprir o próprio critério.

### Ciclo 2 — REPROVADO 1 × 2 (21 achados, 5 `bloqueia`, todos dentro do que o PR escreveu)

**C1 (`jurado-san3c2-cobertura-de-fluxo`, a cadeira criada para a competência que faltou) — REPROVADO, 3 `bloqueia`**
(os três conferidos por mim, por comando próprio):

- **C1-A1 — conciliação prometida, sem tela e sem bloco.** As notas `mvp_demo`/`mvp_vendavel` e o
  `API_CONTRACTS.md:435` prometem a conciliação; a rota `PATCH /financial-entries/:id/reconcile` existe e **não tem
  chamador** na web nem no app; a palavra não aparece no plano. O defeito de produto é de 2026-07-18; a omissão é do
  plano.
- **C1-A2 — faturar não tem porta para o papel Financeiro, mesmo depois do `B-SAN3-25`.** A ação vai para a aba da OS,
  que carrega `GET /work-orders/:id` sob `work_orders:read`; o `finance` tem `os.read`, e o backend compara a permissão
  exata, sem apelido. Quem lê a frase "o faturamento continua disponível no Financeiro" (`InvoicesPage.tsx:53`) é
  justamente o `finance`: hoje só o `tenant_admin` fatura e abre a OS.
- **C1-A3 — o teste do `B-SAN3-08` depende de um passo que ninguém entrega.** "Financeiro cria orçamento com as
  permissões do banco": o formulário lê clientes, catálogo de serviços e OS, e o `finance` não tem nenhuma das três
  leituras; o `B-SAN3-04a`, que o plano nomeia como construtor, não as cobre no teste.
- A agenda e o §9 **conferem**. Ajuste: dois pares de blocos de frentes diferentes tocam o mesmo arquivo sem trava que
  os ordene.

**C2 (`guardiao-fail-closed`) — REPROVADO, 2 `bloqueia`** (conferidos por mim):

- **C2c2-01 — o gate de módulo do backend (`B-SAN3-18`) não tem enumeração fechada rota → módulo.** O guard do plano
  fica vermelho para entrada nova do **registro do menu** (provado por mutação), mas **verde para endpoint novo e para
  router novo** — rotas não são entrada do guard. Hoje, 73 dos 125 endpoints de Pátios e Frota não têm módulo associado;
  Frota tem **0** entradas no registro.
- **C2c2-03 — o `Ω6R-SEC-002` (item 11) e o item 51 fecham por dono, não por escopo provado.** A regra de saída é
  "todas as vias do censo têm dono" e o teste tem piso "1, 2 e 10". Na leitura estrita do piso, dez rotas mutantes que o
  técnico alcança ficam sem escopo com a suíte verde — 5 de comentário, 2 de geocode e 3 de vistoria (anexo, avaria,
  divergência); **as 10 existem e o técnico tem a permissão de cada uma**. Na leitura mais generosa, sobram as 3 de
  vistoria: o teste do item 51 cobre responder, concluir e dar ciência, não anexar, marcar avaria e registrar
  divergência.
- Ajustes: o 38 do item 16 é **40** pela definição do próprio item; a fronteira do `B-SAN3-18` não alcança o
  `prisma/seed.ts` (CI, e2e e demo nascem sem as chaves novas); o check-in tem duas entradas no servidor e a OS pode
  não ter placa.

**C3 (`agente-ci-doutor`) — APROVADO, 0 `bloqueia`.** Diff sem código; 3 guards de KPI 28/28; `kpi-freeze`, `app.js`,
espelho de agentes e `npm run check` verdes; os bloqueios C3-01 e C3-03 do ciclo 1 resolvidos no que prometiam; índice
byte-idêntico ao gerador; os mesmos números no plano, no `status-geral`, no log, no painel e na descrição do PR. Um
ajuste (os 14 ponteiros) e quatro notas, duas pré-existentes.

**Pendências pré-existentes que as cadeiras nomearam, já registradas:** `P-NAV-MODULOS-NAO-RESOLVIDOS-LIBERA-MENU`
(dono `B-SAN3-18`), `P-RBAC-MATRIZ-X-CATALOGO-QUATRO-CELULAS` (dono `B-SAN3-04a`),
`P-SAN3-INDICE-ITEM-DO-GATE-SO-PELA-HOSPEDEIRA` (dono `B-REG-GERADOR`), e duas emendas.

## 3. Por que a correção não bastou — a leitura honesta

O ciclo 2 resolveu os bloqueantes do ciclo 1 **no que cada um nomeava**: a C2 confirma o C2-01 (item 53 +
`B-SAN3-26`) e o C2-09 (item 51 na fronteira do `07c`); a C1 confirma a agenda e o §9 refeitos por script; a C3 confirma
o C3-01, o C3-02 e o C3-03; e o `B-SAN3-25` existe por causa do C1-02. Os cinco bloqueios novos têm duas naturezas.

**(a) Correção por instância, não pela propriedade.** Três deles são a mesma classe do ciclo 1, do outro lado da
fronteira que eu corrigi:

- O C2-02 dizia "o guard passa verde com o defeito" — no menu. Eu corrigi o menu; o backend, que é o que o
  `B-SAN3-18` promete, ficou sem enumeração (C2c2-01). E cheguei ao 38 somando pelo **nome** as 11 que o jurado do
  ciclo 1 listou, não pela propriedade: são 13 entradas sem módulo, 40 no total.
- O C2-08 dizia "vias do censo fora da fronteira". Eu acrescentei as vias que a cadeira citou e uma regra de dono; a
  propriedade — toda rota mutante que o técnico alcança tem escopo provado por teste — não ficou escrita (C2c2-03).
- O C1-02 dizia "a web não fatura". Eu criei o bloco que põe a ação na tela e não perguntei **quem** a aciona: o papel
  a quem a tela promete o faturamento não tem a permissão de abrir a OS (C1-A2).

> **Eu corrigi as instâncias que os achadores nomearam, não a propriedade que elas violavam.** Fail-closed é
> propriedade da enumeração inteira, e "fluxo coberto" é propriedade do par tela × papel; cada correção minha fechou a
> lista que me deram. É o parente próximo do que parou o `SAN2-1` (asserção coletiva não verificada item a item).

**(b) Cobertura que nenhum dos dois ciclos tinha medido.** A conciliação (C1-A1) e o orçamento pelo Financeiro
(C1-A3) não estavam em nenhum achado do ciclo 1: quem os achou foi a cadeira criada para cobertura de fluxo — que é
exatamente para o que a `agente-fabrica` a criou. E aqui há **decisão de produto sua**, não texto meu (§4).

**Por que a separação de papéis não pegou antes da junta:** o aplicador aplica o plano de correção fielmente, e o
defeito estava no plano de correção — que é meu —, não na aplicação. Quem pega isso é a junta, e ela pegou.

## 4. As opções, com custo

**Duas perguntas de produto que só você responde** — as opções B e C pressupõem a resposta:

- **P1.** O papel `finance` passa a ler OS (`work_orders:read`), para faturar pela aba da OS? Ou o faturamento ganha uma
  porta no próprio módulo Financeiro, sem abrir a OS? (A `RBAC_MATRIX.md` dá `read` em OS ao `finance`; o catálogo não.)
- **P2.** O Financeiro monta orçamento — e então lê clientes e catálogo de serviços? Ou orçamento pelo Financeiro sai do
  escopo, e o `B-SAN3-08` perde essa metade? (A matriz dá `none` em Clientes e Serviços; a `P-Ω3a` pede "decidir" desde a
  rodada Ω3.)

| | O que é | Custo | O que você ganha / perde |
|---|---|---|---|
| **B** *(recomendada)* | **Você aprova o plano por decisão sua (§A1.1), com os 5 bloqueios escritos como condição de entrada dos blocos afetados**: `B-SAN3-18` (enumeração rota → módulo com guard sobre as montagens do `app.ts`, negando por padrão); `B-O6R-07c` (toda rota mutante que o técnico alcança com escopo provado por teste e vermelho-controle); `B-SAN3-25` (a porta do Financeiro, pela P1); conciliação (bloco novo ou o `B-SAN3-12` ampliado); `B-SAN3-08`/`B-SAN3-04a` (as permissões, pela P2). Os 6 ajustes e os 14 ponteiros entram como texto; a sua decisão vai para `decisoes.md`, e uma cadeira de registro confere a aplicação — não é ciclo de mérito. | ≈ 1,5–2 h até o merge (texto, conferência, CI, porteiro) | Ganha: a execução começa pela ordem de risco, ainda hoje. Perde: a correção não é reverificada pela junta do plano — quem a verifica é o planejador em Fable, o crítico, o inspetor e a junta com unanimidade de cada bloco, **antes do código**. |
| **C** | **Exceção ao teto: um ciclo 3**, só com os 5 bloqueios e os ajustes, identidade nova nas cadeiras que reprovaram, mesma unanimidade. | ≈ 3–4 h (medido neste PR: correção ≈ 1 h, inspeção ≈ 15 min, junta ≈ 1–1,5 h) | Ganha: verificação independente da correção antes do merge. Risco medido: 26 achados no ciclo 1, 21 no ciclo 2 — cada ciclo acha a próxima instância, e é isso que o teto existe para evitar. |
| **A** | **Mergear o que passou e deixar o plano como rascunho**: registro, inventário, fechamento do `B-O6R-06`, decisões e KPI entram na `main`, com o plano marcado "não aprovado — dossiê". | ≈ 2–3 h + 1 junta | Ganha: o registro deixa de estar 22,5% errado na `main` e o `B-O6R-06` fecha formalmente. Não destrava nenhum bloco. |
| **D** | Arquivar o plano e executar pelo `PLANO_O6R` antigo. | 0 agora | Perde o inventário como gate: 49 pendências novas e 54 bloqueantes voltam a ficar fora da conta. Não recomendo. |

**Minha recomendação é B, com as suas respostas a P1 e P2.** Três razões, todas medidas neste PR:

1. O que é do PR como um todo **passou**: a C3 confirmou registro, painel e números sem nenhum bloqueio, e a C1 conferiu
   a agenda e o §9 número a número.
2. Os cinco bloqueios são do **desenho de cinco blocos que ainda não começaram**, e cada um deles passa, antes de
   qualquer linha de código, por planejador em Fable, crítico, inspetor de terreno e junta com unanimidade. Escritos
   como condição de entrada, não podem ser esquecidos — e dois deles dependem da sua resposta, não de texto meu.
3. Um ciclo 3 custa ≈ 3–4 h e, pelo padrão medido aqui, tende a achar a próxima instância — é exatamente o que a sua
   regra do teto evita.

Se você prefere que uma junta confira a correção antes do merge, a opção é **C**. Em qualquer opção, P1 e P2 são suas.

## 5. O que o terreno deixou registrado

- **Nenhuma queda neste ciclo.** Inspetor ≈ 14 min (+ 2 min para re-verificar o delta do re-apontamento), C1 ≈ 38,5
  min, C2 ≈ 31,5 min, C3 ≈ 27 min.
- **Erros meus, pegos no caminho e declarados:** a mensagem do commit `f84bc634` dizia "9 bloqueantes do ciclo 1" (são
  7 — errata na descrição do PR); o briefing do ciclo 2 mandava aposentar as identidades novas no mesmo PR, contra a
  `D-APOSENTADORIA-ELENCO-EFEMERO` (vale a decisão — §5 da ata); o §6 do briefing descrevia o delta do re-apontamento
  contra o commit errado (corrigido antes da convocação); e, conferindo a C1, minha busca solta por "reconcile" achou 5
  arquivos que eram estado de processamento, não chamada — a busca estrita confirmou a C1.
- **Corpos defasados na sessão (R1 do inspetor):** a árvore da sessão carrega versões antigas do inspetor, do
  planejador e do porteiro. O inspetor aplicou o corpo da ref, e o porteiro do próximo merge recebe o corpo da ref no
  prompt.
- **Prazo:** a janela de 48 h, contada do primeiro commit deste PR (11/09, 14:54 UTC), fecha em ≈ 17 h; nenhum bloco
  começou. O plano já registrava, desde a primeira versão, que ela não cabia (§9).
