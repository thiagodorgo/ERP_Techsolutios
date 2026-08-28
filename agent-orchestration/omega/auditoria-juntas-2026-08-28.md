# Auditoria do esquema de juntas — 2026-08-28

> Levantamento **por execução e leitura integral do repositório**, pedido pelo dono ("audite o esquema
> das juntas"). Duas varreduras independentes: o **inventário quantitativo** de todas as juntas já
> realizadas e a **evolução das regras** com o custo de cada uma. Este documento é a base de evidência
> da decisão `D-JUNTA-ESCOPO-E-CALIBRACAO`.
>
> **Convenção declarada:** 1 junta = 1 painel deliberativo que emitiu 1 veredito sobre 1 objeto. Um
> bloco com 4 ciclos de reprovação conta 4 juntas. Ciclos internos (voto → condição → re-voto) contam
> 1 junta com N ciclos. Onde a ata não está na árvore de `demo/investidor`, o hash do histórico está
> citado.

---

## 1. O esquema funciona — e os números dizem quanto

| Medida | Valor |
|---|---|
| Juntas realizadas (todas as rodadas) | **≈ 155** |
| Aprovaram de primeira, sem ciclo de reprovação | **≈ 102** |
| Aprovaram após ≥ 1 ciclo | **≈ 44** |
| Veredito final REPROVADO (nada mergeou) | **9** |
| Ciclos de reprovação, no total | **≈ 66**, sobre ≈ 45 objetos |

**Distribuição dos ciclos — a cauda é o problema, não a média:**

| Ciclos até fechar | Blocos | Observação |
|---|---|---|
| 1 | ≈ 33 | o caso normal: a junta pega, o dev corrige, fecha |
| 2 | 6 | |
| 3 | 4 | inclui `B-O6R-01` (código) e `GOV-PORTEIRO` (que terminou em redesenho) |
| **4+** | **2** | **`B-O6R-02`: 4 ciclos fechados, ciclo 5 aberto, nunca fechou** · `B-O6R-01` (plano): **5 rodadas antes da primeira linha de código** |

**Os três blocos mais caros somam ≈ 16 dos 66 ciclos (24%) — e neles o bloqueante final foi
processo/medição em 11 dos 16.**

## 2. O que as juntas pegaram: 34 defeitos reais de produto

Razão geral **≈ 34 produto : ≈ 19 processo (64% / 36%)**. Os de produto incluem defeitos que teriam
custado dinheiro ou aberto o sistema:

- **Dinheiro:** dois `approve` concorrentes sem CAS geravam **2 OSs = duplo-faturamento** (Ω3F-4b) ·
  `ADJUSTMENT` com `-0,01` por insider zerava dívida (Ω5P PR-10a) · `recordSale` validava a rodada do
  **body**, não a lotada (Ω5P PR-13b) · a corrida `delete × reverse` fabricava saldo — `/balance`
  devolvia 100 onde o correto era 0, em 5 de 20 iterações contra o app real (B-O6R-02 c3).
- **Segurança e permissão:** bypass do 2º fator (Renavam) por normalização vazia numa superfície
  pública anônima (Ω5P PR-16) · `POST /cancel` devolvia 403 mas `PATCH /status` cancelava com decisão
  financeira nula, em 4 papéis (Ω3F-6a) · escalada de privilégio na visibilidade de notificação
  (Ω4C PR-06) · premissa de RBAC **falsa afirmada em 4 lugares**, com o técnico forjando `source=base`
  (Ω3F-7a) · opt-in ausente em middleware global (nav-menu c1).
- **Dados e prova:** re-despacho apagava o formulário congelado — prova jurídica (CHK P1 PR-04c-A c2) ·
  `@media print` global quebrava **todos** os fluxos de impressão do app (Ω-VID PR-10) · selo "Sem CNH"
  falso em toda linha, dado sensível LGPD (Ω2c).

**Conclusão desta seção: o esquema paga o que custa no caso normal.** O que não paga é a cauda.

## 3. Onze falsos-verdes registrados

O maior de todos: a **J-6R** reprovou **5×0 para produção**, em 11/08, um produto que já havia
passado por **≈ 120 juntas** — com 7 achados P0 (bypass de autorização, persistência volátil,
corrupção e duplicação de dinheiro e estoque). Nenhuma daquelas juntas pegou.

Outros: o painel de KPI aprovado em 04/08 foi **reconstruído do zero 13 dias depois**, e a nova junta
achou 37 defeitos — os dois piores sendo regressões da própria reconstrução; a **errata §8** dessa ata
registra que **a própria ata publicou números que a execução não produz**, e quem achou foi o
*porteiro pós-merge*, não a junta; a ata do ciclo 2 do `B-O6R-02` afirmou que a premissa *birth-fixed*
se sustenta e o ciclo 3 a **falsificou por execução**; a junta do CHK P1 PR-04c-A fechou o ciclo 1
"provado por mutação" (11 mutações, 2289 testes, 0 fail) e o ciclo 2 achou bloqueante, e o ciclo 3
achou bloqueante **na correção do ciclo 2**.

## 4. Quinze falhas do esquema por causa do próprio esquema

**O custo dominante não é julgar — é o processo cair.**

| Classe | Ocorrências |
|---|---|
| **Limite de sessão / cota derrubando agente** | Ω2-b · Ω2-d (junta de 5 fechou com **3 votos**) · Junta de Mapas · Ω4C PR-05 (dev cortado deixou andaime morto → **um ciclo inteiro de reprovação só para terminar o trabalho interrompido**) · Ω4C PR-11 · CHK P1 PR-02a · B-O6R-05 (**cota do Fable esgotou**, plano escrito em outro modelo, exceção registrada em ata) · CHK P1 PR-04c-A c3 (**cota esgotou no meio do ciclo** → o orquestrador escreveu a correção à mão: autor e medidor viraram a mesma parte) · **B-O6R-02 c4: 4 das 5 cadeiras caíram sem votar**, e o re-disparo das mesmas identidades morreu em 2 minutos |
| **Contaminação de terreno** | B-O6R-02 c3: *"contaminação cruzada entre jurados, viva"* — 3 jurados flagraram mutação não-commitada de outro jurado no worktree compartilhado · B-O6R-02 c4: a limpeza de worktrees órfãos **apagou, por dentro de uma junction, o `node_modules` do worktree do dev e mutilou o da árvore principal** (26/08, descoberto em 28/08) |
| **Falha de orquestração** | B-O6R-02 c1: o orquestrador levou **premissa falsa** à junta ("8 críticos P0"; o real eram 5 + 1 P1) · c3: fatia S0 não executada — *"erro de orquestração nº 2 da ata do ciclo 2, repetido"* · c4: inspetor de terreno **BLOQUEOU** a 1ª passada e a junta não pôde nem disparar |
| **Queima de identidade** | só no `B-O6R-02`: **16 identidades inelegíveis** para o ciclo 5, incluindo **a única competência que o achado do ciclo 4 exige** — a ata registra que a cadeira de arnês *"está queimada"* |

## 5. O que o levantamento das regras encontrou

**5.1 O contrato existe em quatro versões divergentes.** `decisoes.md` tem **1480** linhas em
`origin/main`, **1606** em `demo/investidor`, **1649** na branch do financeiro e **1664** na de
governança, com o §C7 reescrito de formas materialmente diferentes. `D-CONTRATOS-FORA-DO-PR-FINANCEIRO`
determina que **vale o `origin/main` até reconciliar** — e nele **não existem** a cláusula §C7.1-bis
(inspetor de terreno) nem `D-INSPETOR-TERRENO-JUNTA`. As juntas estão sendo governadas por um texto
que não é o de registro.

**5.2 A regra que reprovou quatro ciclos não está escrita.** O §C7.1 lista exaustivamente o que exige
unanimidade de 5: deploy de produção, dependência nova, serviço externo pago. **"Invariante
financeiro" não aparece no `CLAUDE.md`, no `AGENTS.md` nem no `EXECUTION_MODEL.md`** — só nos corpos
dos jurados e nas atas.

**5.3 O piso de agentes por bloco é 8, e sobe.** Planejador · crítico · dev · inspetor de terreno ·
≥3 jurados · porteiro — mais fábrica, pesquisador e revisores por risco. Medido no ciclo 4 real do
`B-O6R-02`: **15 instâncias**. Artefatos obrigatórios por bloco: **≈ 19**.

**5.4 Gates que se sobrepõem.** Quatro vetos permanentes se dizem obrigatórios em "toda PR" sem que o
§C7.1 os cite (`validador-mestre`, `inspetor-de-rotas`, `master-teste-telas-rotas`, `avaliador-mapas`),
e três papéis de porta reexecutam as mesmas verificações (inspetor de terreno, porteiro,
validador-mestre). No ciclo 4 o `validador-mestre` chegou a ser **duplicado por um especialista
efêmero** porque ficou inelegível.

**5.5 O porteiro está em dois lugares ao mesmo tempo** — pós-merge no texto vigente, pré-merge no da
governança — e a decisão que registra o conflito **explicitamente não escolhe**.

**5.6 O que acontece depois do teto é indefinido.** O §C7.4 termina em "parada + dossiê ao dono": não
há formato, nem lugar, nem alçada, nem o que a resposta do dono destrava, nem se as inelegibilidades
zeram. O `B-O6R-02` está **no** teto agora.

**5.7 Os efêmeros de bloco não têm data de saída.** As rodadas Ω4C e Ω5P deletaram seus agentes
efêmeros com registro nominal em ata. Os **14 especialistas** criados para o `B-O6R-02` não têm
cláusula nenhuma de descomissionamento.

**5.8 `scripts/limpar-residuo-de-junta.sh` existe e nenhum documento do repositório o cita** — mediu
15 volumes órfãos, 1,03 GB.

---

## 6. O caso que motivou a decisão

**`B-O6R-02`, ciclo 4 (28/08): 4 cadeiras aprovaram, 1 reprovou, o bloco não fechou.**

O dinheiro foi provado fechado por três cadeiras independentes (590 + 140 + 66 iterações, saldo 0 em
todas, com vermelho-controle de 60/60 fabricados ao derrubar os triggers). A cadeira que reprovou
julgou **o número, não o produto**: a bateria canônica fica verde em 7 de 10 execuções.

E os dois produtores desse defeito **antecedem o bloco**: `tests/audit-security.test.ts` é de
**08/06** e `tests/helpers/auth-identity-fixture.ts` nasceu no bloco anterior em **19/08** — a branch
do financeiro começou em **20/08**. O §5 do plano do ciclo 4 **proibia** o bloco de tocar `tests/**`
alheio.

**O bloco foi reprovado por um defeito que não criou e estava proibido de consertar.** É a situação
que a decisão `D-JUNTA-ESCOPO-E-CALIBRACAO` resolve.

---

## 7. Ressalva metodológica

Os totais dependem da convenção declarada no topo. Painéis pequenos (2–3 vetos, comuns em Ω3F/Ω4) e
painéis de 5 unânimes (Ω1/Ω2/SAN/O6R) estão contados igualmente. As atas dos ciclos 1 e 2 do
`B-O6R-02` e as do porteiro pré-merge **não estão na árvore de `demo/investidor`** — vivem em
`feat/o6r-b02-financial-uow` e `docs/governanca-porteiro-pre-merge-sol`, acessíveis por
`git show 733d747:…`, `4cd0baa:…`, `e69fe4d:…`, `2fc39ce:…`.
