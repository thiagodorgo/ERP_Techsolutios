# R-B-O6R-02/F6 · ciclo 1 — regressão de fixture financeira legada

> Registro do protocolo de dificuldade (§C7.4) e da separação de alçadas
> `D-JUNTA-SEPARACAO-DE-PAPEIS-TODO-FLUXO`. Este documento preserva a evidência bruta recebida pelo
> `agente-fabrica`; **não analisa o mérito do teste e não propõe correção**.

## Identidade das alçadas

| Alçada | Agente/pessoa | Estado neste registro |
|---|---|---|
| Quem achou | `/root/dev_f6` | Registrou a falha durante a bateria de autoria; não pode planejar, corrigir nem votar este achado |
| Agente-fábrica | `/root/fabrica_f6_ciclo1` | Criou a cadeira especializada; não planeja, não corrige e não revisa o código |
| Quem planejará | **A designar** | Deve ser agente novo e distinto de `/root/dev_f6`, `/root/fabrica_f6_ciclo1` e dos revisores/votantes |
| Quem corrigirá | **A designar** | Deve ser outro agente novo, distinto do achador, da fábrica, do planejador e dos revisores/votantes |
| Especialista/revisor | Definição `inspetor-fixtures-financeiras-legadas`; instância a designar | Somente acha/verifica e vota; não planeja nem corrige |

O ciclo não pode avançar para planejamento, correção ou votação enquanto as instâncias ainda “a designar”
não forem nomeadas de forma compatível com a separação acima.

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

**SIM quanto à cadeira técnica que faltava:** foi criada uma definição especializada em compatibilidade e
regressão de fixtures financeiras, com prova simultânea de `title_has_payments` e `title_restore_conflict`.
A composição operacional do ciclo ainda está **incompleta**, pois planejador, corretor e instância revisora
permanecem a designar; isso é gate explícito, não autorização para acumular papéis.

### (b) Quem achou é quem consertou?

**NÃO.** `/root/dev_f6` apenas reportou a evidência bruta e está impedido de corrigir este achado. O corretor
permanece a designar e deverá ser distinto de todas as alçadas anteriores.

### (c) O planejador está usando dado podre?

**NÃO AVALIÁVEL AINDA:** não existe planejador designado neste ciclo. O futuro planejador deverá medir a
premissa no HEAD corrente e distinguir evidência reexecutada de afirmação herdada; até isso ocorrer, o relato
acima permanece fato bruto atribuído ao achador, não premissa técnica ratificada.

## Especialista criado

- Nome: `inspetor-fixtures-financeiras-legadas`
- Fonte Claude Code: `.claude/agents/especialistas/inspetor-fixtures-financeiras-legadas.md`
- Espelho Codex: `.agents/agents/especialistas/inspetor-fixtures-financeiras-legadas.md`
- Missão: verificar compatibilidade/regressão da fixture sem enfraquecer DIN-004 e sem perder a prova
  `title_restore_conflict`.
- Ferramentas mínimas: `Read`, `Grep`, `Bash` no agente-fonte; nenhuma ferramenta de escrita.
- Limite: acha/verifica/vota; não planeja, não implementa, não edita e não propõe correção.

## Estado do ciclo

**ABERTO — aguardando novo planejador, novo desenvolvedor da correção e instância revisora independentes.**

Não houve alteração de código funcional, teste, KPI, push, PR ou merge nesta alçada.
