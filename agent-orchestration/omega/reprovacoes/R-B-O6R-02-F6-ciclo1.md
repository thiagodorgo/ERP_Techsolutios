# R-B-O6R-02/F6 · ciclo 1 — regressão de fixture financeira legada

> Registro do protocolo de dificuldade (§C7.4) e da separação de alçadas
> `D-JUNTA-SEPARACAO-DE-PAPEIS-TODO-FLUXO`. Este documento preserva a evidência bruta recebida pelo
> `agente-fabrica`; **não analisa o mérito do teste e não propõe correção**.

## Identidade das alçadas

| Alçada | Agente/pessoa | Estado neste registro |
|---|---|---|
| Quem achou | `/root/dev_f6` | Registrou a falha durante a bateria de autoria; não pode planejar, corrigir nem votar este achado |
| Agente-fábrica | `/root/fabrica_f6_ciclo1` | Criou a cadeira especializada; não planeja, não corrige e não revisa o código |
| Quem planejou | `/root/planejador_f6_ciclo1` | Planejou somente a correção documental; não implementa, não revisa/vota nem atua como porteiro |
| Quem corrigirá | **A designar** | Deve ser outro agente novo, distinto do achador, da fábrica, do planejador e dos revisores/votantes |
| Especialista/revisor | `/root/inspetor_fixture_f6` (`inspetor-fixtures-financeiras-legadas`) | Executou a inspeção e vetou; não planeja nem corrige |

O planejamento foi concluído. O ciclo não pode avançar para correção enquanto o novo desenvolvedor ainda
“a designar” não for nomeado de forma compatível com a separação acima.

## Evidência bruta recebida

Fonte: relato de `/root/dev_f6` ao orquestrador durante a execução da suíte completa da F6.

```text
tests/financial-entries.test.ts (fora da allowlist v3) contém um cenário legado que, após pagar um título,
chama titles.delete; a F6 agora devolve 422 title_has_payments, e a full suite ficou
2615 pass / 2 fail / 10 skip.
```

A segunda falha informada é de paridade de KPI ainda não consolidada. Ela foi registrada pelo relato, mas
fica expressamente fora da competência do especialista criado neste ciclo.

Este registro não reexecutou a suíte, não inspecionou o mérito do cenário e não deduz causa além do fato bruto
acima. A reexecução e a qualificação técnica pertencem às alçadas independentes posteriores.

## Perguntas obrigatórias de contaminação

### (a) A composição cobre a competência que o achado exige?

**SIM quanto às competências de achado, inspeção e planejamento:** `/root/inspetor_fixture_f6` mediu a
compatibilidade das fixtures e `/root/planejador_f6_ciclo1` consolidou o plano. A composição operacional do
ciclo ainda está **incompleta**, pois o novo desenvolvedor e os demais revisores/votantes permanecem a
designar; isso é gate explícito, não autorização para acumular papéis.

### (b) Quem achou é quem consertou?

**NÃO.** `/root/dev_f6` apenas reportou a evidência bruta e está impedido de corrigir este achado. O corretor
permanece a designar e deverá ser distinto de todas as alçadas anteriores.

### (c) O planejador está usando dado podre?

**NÃO.** O planejador usou a execução independente de `/root/inspetor_fixture_f6`: routes 15/15 provaram
`title_has_payments`; `financial-entries.test.ts` teve 66/67 e parou no DELETE 422 antes de alcançar
`entries.reverse`. A inspeção do HEAD confirmou a porta de UoW injetável e o ramo
`title_restore_conflict`; números herdados não foram convertidos em aprovação.

## Especialista criado

- Nome: `inspetor-fixtures-financeiras-legadas`
- Fonte Claude Code: `.claude/agents/especialistas/inspetor-fixtures-financeiras-legadas.md`
- Espelho Codex: `.agents/agents/especialistas/inspetor-fixtures-financeiras-legadas.md`
- Missão: verificar compatibilidade/regressão da fixture sem enfraquecer DIN-004 e sem perder a prova
  `title_restore_conflict`.
- Ferramentas mínimas: `Read`, `Grep`, `Bash` no agente-fonte; nenhuma ferramenta de escrita.
- Limite: acha/verifica/vota; não planeja, não implementa, não edita e não propõe correção.

## Estado do ciclo

### Parecer executado do inspetor

- `npm test -- tests/financial-titles-routes.test.ts`: 15/15, zero fail/skip, exit 0; DELETE público pago
  respondeu `422 FINANCIAL_TITLE_UNPROCESSABLE/title_has_payments`.
- `npm test -- tests/financial-entries.test.ts`: 67 total, 66 pass, 1 fail, zero skip, exit 1; o cenário
  falhou em `titles.delete` antes de chamar `entries.reverse` e não alcançou `title_restore_conflict`.
- Não foi encontrada porta de teste/env no diff.
- Veredito: **VOTO CONTRA — `title_restore_conflict` não alcançado**.

### Plano de correção

Vigente em
[`B-O6R-02-F6-ciclo1-plano.md`](../planos/B-O6R-02-F6-ciclo1-plano.md): usar somente a injeção de UoW já
suportada pelo desenho para um fault double local ao teste, sem excluir título pago e sem tocar produção.

**PLANEJADO — aguardando novo desenvolvedor da correção e revisores/votantes independentes.**

Não houve alteração de código funcional, teste, KPI, push, PR ou merge nesta alçada.
