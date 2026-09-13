# J-SAN3-plano-ciclo2 — junta do PR #386, ciclo 2 (plano SAN3 v5 + registro + fechamento do B-O6R-06)

**Veredito: REPROVADO · Placar 1 × 2** (unanimidade de 3 exigida) — 5 achados `bloqueia`, todos dentro do que o PR
escreveu (C1: 3; C2: 2); a C3 aprovou. **Era o último ciclo antes do teto (`D-TETO-DOIS-CICLOS`): o PR para e vai ao
dono** — `agent-orchestration/omega/reprovacoes/DOSSIE-SAN3-plano-parada.md`.
**Conteúdo julgado:** `ecc32712b626d836c661dfd28b2172fb75a1d475` · **head do PR na junta:**
`03e4977afdbddc670634f244833651eb914fd24d` (entre os dois só o briefing) · **base:** `origin/main@15ef3fbe` ·
**CI no head:** 7/7 verde (`gh pr checks 386`). Ciclo 1: `J-SAN3-plano-ciclo1.md` (REPROVADO 0 × 3).

## 1. Composição, modelo e papéis no caso

| Cadeira | Titular | Suplente | Modelo que rodou | Corpo aplicado | Voto |
|---|---|---|---|---|---|
| C1 — cobertura de fluxo prometido, agenda e viabilidade | `jurado-san3c2-cobertura-de-fluxo` | `jurado-san3c2-suplente-cobertura-de-fluxo` | Opus 5 | carregado = ref (hash, inspetor 3.3) | **REPROVADO** |
| C2 — gate de módulo, escopo por objeto e controles de segurança | `guardiao-fail-closed` | `agente-secops` | Opus 5 | carregado = ref | **REPROVADO** |
| C3 — diff × regras, KPI, registro e números | `agente-ci-doutor` | `agente-dba-guardiao` | Opus 5 | carregado = ref | **APROVADO** |

Nenhuma queda e nenhum suplente entrou (`votos/SAN3-plano-ciclo2/00-quedas.md`). C1 e C2 rodaram em paralelo; a C3
entrou quando a C2 terminou — nunca mais de 2 em paralelo (P5). Nenhum dos corpos fixa modelo (R8 do inspetor). A C3
não soube dos votos das outras cadeiras antes de votar.

**Participação prévia declarada (R3 do inspetor).** `guardiao-fail-closed`, `agente-ci-doutor` e `agente-dba-guardiao`
foram suplentes nomeados no ciclo 1 e nunca instanciados — 0 votos, 0 achados (medido pelo inspetor: 0 ocorrências nos
votos e atas do caso). Elegíveis (obituário §4; precedente `J-B-GOV-ELENCO-ENXUTO.md` l.95). As duas cadeiras que
votaram declararam isso no voto.

**Separação de papéis (§C7.4-bis).** Achadores do ciclo 1: `estrategista`, `coordenador-de-acessos`,
`validador-mestre`. Planejador da correção: o orquestrador (`agent-orchestration/omega/planos/SAN3-plano-ciclo2-correcao.md`).
Desenvolvedor: um agente `general-purpose` distinto, que não achou nem planejou (`votos/SAN3-plano-ciclo2/00-aplicador.md`).
A `agente-fabrica` criou os dois jurados de cobertura de fluxo (§C7.4, ciclo 1 → 2). No terreno do ciclo 2, quem achou o
placeholder do `R-` do ciclo 1 (R6) foi o inspetor; quem corrigiu foi o orquestrador, e o inspetor re-verificou o
delta. As cadeiras mediram e julgaram; nenhuma propôs correção.

## 2. Gate de início

`inspetor-de-terreno-da-junta` (Fable 5.1, sem fallback; aplicou o corpo da ref `f84bc634`, porque o carregado pela
sessão diverge — R1): **LIBERADO COM RESSALVA** (R1–R9) — `votos/SAN3-plano-ciclo2/00b-inspetor-terreno.md`. A R6 foi
corrigida em `ecc32712` (objeto re-apontado de `f84bc634`) e o inspetor re-verificou o delta — veredito mantido.
R2–R9 foram para o §6 do briefing (`03e4977a`) e para o prompt de cada cadeira.

**Lacunas declaradas.** Não há cadeira de invariante financeiro (R4): a C3 conferiu a C3-01 pelo texto de
`decisoes.md:607-608` e pelo índice `financial_titles_wo_direction_active_key`, sem julgar o mérito financeiro da troca
do índice. E nenhuma cadeira tinha no mandato a exatidão da matriz RBAC contra o catálogo — lacuna apontada pela C1,
que deixou as divergências anteriores ao PR como pendência (§4).

## 3. Os bloqueantes

| Achado | Cadeira | Escopo | Defeito |
|---|---|---|---|
| C1-A1 | C1 | dentro | Conciliação prometida pelo painel e pelo `API_CONTRACTS.md:435`: a rota existe, sem chamador na web e no app e sem bloco no plano |
| C1-A2 | C1 | dentro | Faturar sem porta para o papel Financeiro mesmo depois do `B-SAN3-25`: a aba da OS exige `work_orders:read`, e o `finance` só tem `os.read` |
| C1-A3 | C1 | dentro | O teste do `B-SAN3-08` cita "Financeiro cria orçamento com as permissões do banco" — passo sem construtor |
| C2c2-01 | C2 | dentro | Gate de módulo do backend (`B-SAN3-18`) sem enumeração rota → módulo: o guard fica vermelho para entrada nova do menu e verde para rota ou router novos |
| C2c2-03 | C2 | dentro | `Ω6R-SEC-002` (item 11) e item 51 fecham por dono e por piso de teste, não por escopo provado: rotas mutantes que o técnico alcança ficam sem escopo com a suíte verde |

Os cinco foram **conferidos pelo orquestrador por comando próprio** antes do dossiê — a tabela com o que cada
conferência mediu está no `R-SAN3-plano-ciclo2.md`.

## 4. Ajustes e notas

**C1:** C1-A4 (ajuste — dois pares de frentes tocam o mesmo arquivo sem trava que os ordene: `07c` × `SAN3-26`,
`B-O6R-12` × `SAN3-11`); C1-A5 a C1-A7 (notas); C1-A8 (nota, **pré-existente** → emenda na
`P-FIELD-LOCATION-SEM-CONSENTIMENTO-NO-BACKEND`). A agenda do §6 e o §9 conferiram número a número.
**C2:** C2c2-02 (ajuste — o 38 do item 16 é 40 pela definição do próprio item); C2c2-04 (ajuste — o `prisma/seed.ts`
fora da fronteira do `B-SAN3-18`: CI, e2e e demo nascem sem as chaves novas); C2c2-07 (ajuste — o check-in tem duas
entradas no servidor e a OS pode não ter placa); C2c2-05 (ajuste, **pré-existente** →
`P-NAV-MODULOS-NAO-RESOLVIDOS-LIBERA-MENU`); C2c2-06 e C2c2-08 (notas).
**C3:** C3c2-01 (ajuste — 14 ponteiros do registro apontam itens do plano pela numeração antiga; o bloco dono está certo
em todos); C3c2-02 (nota — o teste (g) do `B-SAN3-10` parafraseia o critério da `P-KPI-ROADMAP-CONGELADO` e perde a
metade por bloco); C3c2-03 (nota — a errata da aposentadoria vivia só no corpo do PR: registrada no §5 desta ata);
C3c2-04 (nota, **pré-existente** → emenda na `P-KPI-RECENT-CONGELADO`); C3c2-05 (nota, **pré-existente** →
`P-SAN3-INDICE-ITEM-DO-GATE-SO-PELA-HOSPEDEIRA`).
**Lacuna da C1:** quatro células da matriz RBAC sem permissão no catálogo → `P-RBAC-MATRIZ-X-CATALOGO-QUATRO-CELULAS`.

Nenhum ajuste é aplicado neste ciclo: é o teto. Todos seguem, com os bloqueantes, para a decisão do dono. O texto
integral de cada achado está no voto da cadeira.

## 5. Divergência registrada (§A2) — a aposentadoria das duas identidades novas

O §1 do briefing do ciclo 2 — que está no objeto julgado — diz que as duas `jurado-san3c2-*` são "sepultadas e
aposentadas **no mesmo PR** em que a junta fechar". A `D-APOSENTADORIA-ELENCO-EFEMERO` (`decisoes.md:1916+`) manda
aposentar só com "ata fechada **e PR mergeado**" — "cadeira de bloco em voo nunca sai". **Vale a decisão.** O
sepultamento entra neste PR (obituário §3.6, regra §1.5); a aposentadoria entra no primeiro PR depois do merge do
#386, com o corpo lível no squash. A divergência foi achada pelo orquestrador ao preparar o fechamento, declarada na
descrição do PR e confirmada pela C3 (C3c2-03); nada foi feito pela regra errada.

## 6. O que acontece agora

- `D-TETO-DOIS-CICLOS`, item 3: **para**. Registro: `agent-orchestration/omega/reprovacoes/R-SAN3-plano-ciclo2.md`;
  dossiê ao dono: `agent-orchestration/omega/reprovacoes/DOSSIE-SAN3-plano-parada.md`.
- As duas identidades novas estão **sepultadas** (obituário §3.6). As cópias que o orquestrador pôs na árvore da sessão
  para o registro de agentes carregá-las foram removidas (não rastreadas, idênticas à ref, 0 arquivo rastreado apagado).
- Pendências registradas a partir dos votos: `P-NAV-MODULOS-NAO-RESOLVIDOS-LIBERA-MENU`,
  `P-RBAC-MATRIZ-X-CATALOGO-QUATRO-CELULAS`, `P-SAN3-INDICE-ITEM-DO-GATE-SO-PELA-HOSPEDEIRA`, e duas emendas.
- O PR segue em rascunho; nenhum bloco do plano começa; o Traccar espera o gate.
