# J-SAN2-R — junta do protocolo de junta resiliente (2026-08-29)

**VEREDITO: APROVADO por maioria — 3 APROVADO · 0 REPROVADO · 0 voto perdido.** Nenhum veto exercido.
**Ciclo 1 de 2** (`D-TETO-DOIS-CICLOS`). Quórum: maioria de 3 (diff de código de produto **vazio**,
confirmado por medição da cadeira 1 e do inspetor).

## 1. Cadeia de hashes

`74430cc` (base, #360) → `9fd6ac6` (cherry-pick `D-TETO-DOIS-CICLOS`) → `f8e84de` (conteúdo do bloco) →
`edafadf` (briefing; **terreno inspecionado aqui**) → `4b547e3` (registro da queda 1) → **`48dc863`
(parecer do inspetor sucessor; head julgado pelas 3 cadeiras)**. Deltas pós-briefing: só papelada de junta
em `votos/SAN2-R/` — medido pelo sucessor e pela cadeira 1.

## 2. A PRIMEIRA JUNTA SOB O PRÓPRIO PROTOCOLO — a medição que ela veio fazer

| Métrica | Ontem (postmortem) | Esta junta |
|---|---|---|
| Quedas por disparo | ~50% (14/28) | **20% (1/5)** |
| Votos/pareceres perdidos em streaming | 3 (mortes #8, #10, #13) | **0** — voto-arquivo-primeiro (P2) |
| Custo de uma morte na reta final | mandato **inteiro** refeito | **re-executar 9 comandos, 139 s** (P1+P3) |
| Achado de agente morto que chegou à junta | 0 (evaporava) | **2** — o `app.js`×`index.html` e o drift de head |

A queda desta junta foi **exatamente a classe mais cara de ontem** (inspetor morto escrevendo o parecer,
como a #8 do postmortem) — e o protocolo a absorveu no primeiro uso: a evidência dos 3 itens sobreviveu em
arquivo, o sucessor re-executou o roteiro (**9/9 confirmados**) e o achado póstumo foi julgado pela cadeira
de KPI (veredito: legítimo — o `FROZEN` regenerado não viola o §C3; nenhuma dimensão nova inaugurada).

## 3. Os votos

| Cadeira | Veredito | Achados |
|---|---|---|
| 1 · diff/escopo/espelho (veto) | **APROVADO** | 1 nota (A1: redação `agente-fabrica`×"fábrica de agentes" no `AGENTS.md` — diferença específica-de-ferramenta permitida pela regra de espelhamento) |
| 2 · forense (veto) | **APROVADO** | 3 baixos: FOR-1 ("6 comandos" era estimativa escrita antes da medição — **corrigido no `00-quedas.md` com errata**); FOR-2 (retórica do P2 sobre a morte #8); FOR-3 (denominadores de F5 não auditáveis por terceiro — reforça que F5 é hipótese, nunca conclusão) |
| 3 · KPI/registro | **APROVADO** | **zero** — bateria reexecutada bate (16/16, 6/6, freeze em dia), backfill do #360 confere contra o git, métricas intocadas, `blocks_completed` = 152 |

Votos e evidências item a item em `votos/SAN2-R/` (`01/02/03-*-voto.json` + `*-evidencia.md`) — todos
escritos **em arquivo antes da mensagem final**, conforme o protocolo em julgamento.

## 4. §C7.4-bis, respondido

**(a)** As 3 cadeiras cobrem a competência (contrato/espelho · forense · KPI) — cada uma pegou o que só ela
veria. **(b)** Quem achou não consertou: FOR-1 foi achado pela forense e corrigido pelo orquestrador, com
errata; os achados do inspetor caído foram **julgados** pela cadeira de KPI, não por quem os registrou.
**(c)** Dado podre: a forense auditou especificamente as contagens do postmortem (4 mortes na mensagem 1;
1 pin fable + 13 herdadas = 14) — fecham por contagem executada.

## 5. Registro honesto do que fica

- **FOR-3 fica como limitação declarada:** os denominadores da hipótese F5 (1/5 vs ~13/23) vêm da sessão e
  não são auditáveis por terceiro a partir do repo — mais um motivo para a série do P6 ser quem decide.
- A **prova real de custo** do protocolo ainda é n=1 (esta junta). A segunda medição é a re-junta do resgate
  do `SAN2-1` (opção C do dono).

**Merge autorizado** (§C7.1). Segue para PR; após o merge, `porteiro-pos-merge` decide o start seguinte.
