# R-SAN3-plano-ciclo1 — reprovação do ciclo 1 da junta do PR #386 (plano SAN3)

**Objeto julgado:** `a143d2c33674cc2c3562de40cc9d3a95350cabe5` (plano v4 + registro + fechamento do B-O6R-06).
**Quórum:** unanimidade de 3. **Placar: 0 × 3** — C1 `estrategista` **REPROVADO** · C2 `coordenador-de-acessos`
**REPROVADO** · C3 `validador-mestre` **REPROVADO**. **O ciclo 1 está reprovado.** Todos os votos em Opus 5 (os três
papéis não fixam modelo); nenhuma queda.
Votos e evidências: `agent-orchestration/omega/juntas/votos/SAN3-plano/`.

## 1. Os bloqueantes

| Achado | Cadeira | Escopo | O defeito | Medido pelo orquestrador antes de planejar |
|---|---|---|---|---|
| C1-02 | C1 | dentro-do-bloco | O bloco que fecha o gate (`B-SAN3-10`) exige "faturar" pela web; a web não fatura OS e nenhum dos 34 blocos constrói a ação | sim: rota em `work-order-financial.routes.ts:78`; 0 chamada na web; `FinancialTab.tsx` só lança; `InvoicesPage.tsx:53` afirma o contrário |
| C2-01 | C2 | dentro-do-bloco | O check-in do app (controle de segurança) ficou fora do gate por mitigação — exceção que o §2 do plano proíbe | sim: `work_order_detail_screen.dart:918-931` compara com o código da OS; o backend não confere |
| C2-02 | C2 | dentro-do-bloco | O item 16 conta 27 caminhos fora do gate de módulo; são 38. O guard proposto passa verde com o defeito e a fronteira não inclui o catálogo de módulos | sim: 11 entradas sem `requiredModules`; `hasModule` libera tudo o que não tem módulo; `platform-modules.service.ts` sem chave de Pátios/Telemetria/Frota |
| C2-09 | C2 | **pre-existente** | Técnico responde, conclui e dá ciência em vistoria de OS alheia | sim: rotas de vistoria só por permissão; nenhuma checagem de atribuição |
| C3-01 | C3 | dentro-do-bloco | O `REGISTRO-SAN3-CONFLITOS` e o plano atribuem o conflito do faturamento à `D-Ω4-C1` (carimbo); o índice "um título ativo por OS e direção" é a `D-Ω4-C2` (idempotência) — a junta do bloco seria instruída a rever a decisão errada, num invariante financeiro | sim: `decisoes.md:607` (C2) × `:608` (C1) |
| C3-02 | C3 | dentro-do-bloco | O `status-geral.md` publica 103 FECHADAS / 260 ABERTAS na mesma frase que diz 72 → 105; o gerador dá 105 / 258 | sim: a frase nasceu certa em `544ab67f` e a v4 mudou metade dela |
| C3-03 | C3 | dentro-do-bloco | `P-KPI-ROADMAP-CONGELADO` e `P-KPI-RECENT-CONGELADO` marcadas FECHADA sem cumprir o critério de fechamento que elas mesmas registram (guard provado por mutação); o `roadmap.as_of` nem foi atualizado | sim: critérios nas próprias entradas; `roadmap.as_of` = 2026-08-19 |

O C2-09 **não reprova** este PR (a classe antecede o plano: #320 e #344), mas entra no gate pela regra única do §2 —
é item medido que viola o critério 3.

## 2. As três perguntas obrigatórias (§C7.4-bis)

**(a) A composição cobre a competência que os achados exigem?** Sim. C1-02 é cobertura de fluxo prometido × blocos
(ordem e dependência — a cadeira de estratégia o achou); C2-01, C2-02 e C2-09 são da cadeia papel → permissão → menu →
rota → backend (a cadeira de acessos os achou); C3-01, C3-02 e C3-03 são de registro, decisão e painel conferidos por
execução (a cadeira de validação os achou). A competência que faltava estava **no plano**, não na junta.

**(b) Quem achou é quem consertou?** Não. Quem achou: C1, C2 e C3. Quem planeja a correção: o orquestrador, autor do
plano, que escreve o plano de correção (`agent-orchestration/omega/planos/SAN3-plano-ciclo2-correcao.md`) a partir dos
votos, **depois de conferir cada achado no código**. Quem aplica a correção ao `PLANO_SAN3.md`, ao registro, ao painel
e aos números: um agente distinto, que não achou nem planejou (relatório:
`agent-orchestration/omega/juntas/votos/SAN3-plano-ciclo2/00-aplicador.md`). O registro das 3 pendências novas e das 6
emendas foi feito pelo orquestrador como **registro** do que as cadeiras mediram (texto das cadeiras, com a
conferência), não como correção do plano.

**(c) O planejador usou dado podre?** Sim, em três classes:
- **Contagem derivada de método inadequado.** O "27" do item 16 veio de `MVP_NAV_PATHS` menos registro, que por
  construção não enxerga entrada registrada sem módulo. O número estava certo para o método e errado para a pergunta
  (C2-02).
- **Premissa de teste não medida.** O teste de encerramento do `B-SAN3-10` pressupôs que o passo "faturar" existe na web.
  Nenhuma medição do plano o conferiu — a fatia AUSENTES mediu a baixa (`P-WEB-FIN-BAIXA-E-CONTA-SEM-TELA`), e o
  plano estendeu a conclusão ao faturamento sem medir (C1-02).
- **Afirmação herdada e não verificada.** A atribuição do conflito do faturamento à `D-Ω4-C1` veio do parecer da rodada
  2 do crítico e entrou no plano e no `REGISTRO-SAN3-CONFLITOS` sem que o orquestrador lesse `decisoes.md:607-608`
  (C3-01); e a frase de números do `status-geral.md` foi editada pela metade, sem conferir contra o gerador (C3-02).
- E duas regras aplicadas pela metade: o §2 proíbe exceção por mitigação, e o check-in ficou fora por "o GPS coexiste"
  (C2-01); e as duas pendências do painel foram fechadas sem o critério de fechamento que elas mesmas registram (C3-03).

## 3. O que o protocolo manda agora (§C7.4, ciclo 1)

- **Especialista sob medida para o ciclo 2:** a `agente-fabrica` cria **1** especialista com a competência que o
  ciclo 1 mostrou faltar ao plano — **cobertura de fluxo prometido**: todo fluxo que o produto diz entregar (notas do
  `mvp_*`, textos de tela, contratos) tem bloco que o constrói ou o conserta, e todo teste de encerramento que cita um
  passo o encontra no código ou num bloco. Ele entra na junta do ciclo 2 e vota, com um suplente.
- **Identidades novas no ciclo 2:** as três cadeiras do ciclo 1 não votam no ciclo 2 (frescura da identidade). As
  outras duas cadeiras do ciclo 2 vêm de papéis permanentes que não atuaram neste caso.
- **Teto:** `D-TETO-DOIS-CICLOS` — se o ciclo 2 reprovar, dossiê ao dono.

## 4. Trilha

| Quando | O quê |
|---|---|
| 2026-09-12 | Ciclo 1: inspetor LIBERADO COM RESSALVA; C1, C2 e C3 reprovam — placar 0 × 3 (26 achados, 7 `bloqueia`) |
| 2026-09-12 | Correção planejada pelo orquestrador e aplicada por agente distinto → plano v5 (`f84bc634`); os dois jurados do ciclo 2 criados pela `agente-fabrica` |
| 2026-09-12 | Inspetor do ciclo 2 (ressalva R6): esta trilha tinha `C3 <A PREENCHER>`, e as perguntas (a)/(b)/(c) omitiam a C3 — completadas no commit seguinte a `f84bc634`, antes da junta do ciclo 2 |
