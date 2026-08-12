# J-CHK-P1-PR04C — a identidade da junção: o mesmo formulário pode servir coleta E entrega?

- **Bloco:** CHECKLIST P1 PR-04c (aplicabilidade ligada de ponta a ponta)
- **Data:** 2026-08-12
- **Composição (3, §C7.1 — maioria simples):** `critico-adversarial` · `coordenador-de-acessos` ·
  `agente-dba-guardiao`
- **Resultado: opção A, 3×0 (UNÂNIME)** — **PERMITIR** o mesmo modelo em duas fases.

---

## De onde nasceu a pergunta

Não de um planejamento: do **BLOQUEANTE 1** do ataque adversarial ao plano v1 do PR-04c. Ao desenhar a
identidade da junção `(organização, ordem, modelo)`, o crítico percebeu que ela tornava **impossível** um caso
que o aplicativo já pressupõe — e que o código mergeado no **#345** já vinha impondo sem que ninguém tivesse
decidido.

O trecho responsável (`checklist-applicability.resolution.ts`, na versão do #345) deduplicava o resultado por
`templateId`: duas regras apontando para o mesmo modelo em fases diferentes produziam **um** match, e a
segunda virava sombreamento.

## A pergunta posta à junta

> Uma ordem de serviço pode ter o **mesmo modelo de vistoria** em **duas fases** (coleta e entrega)?
>
> **(A) PERMITIR** — a identidade da junção passa a incluir a FASE, e o dedup do #345 é corrigido para
> deduplicar por fase.
> **(B) PROIBIR e registrar** — mantém o dedup por modelo; quem quiser comparação usa DOIS modelos, e o plano
> escreve o destino da tela de comparação.

## O que decidiu (argumentos que sobreviveram)

**O caso de uso central do aplicativo depende do par.** A tela de comparação carrega **UM** schema
(`checklist_comparison_screen.dart`, `getSchema(widget.checklistId)`) e confronta a execução de coleta contra
a de entrega. O resultado é o **resumo de divergências** — o que a ata do bloco anterior chama de prova
jurídica do estado do veículo. "Um formulário, duas fases" não é conveniência de configuração: é o desenho
que a comparação exige.

**A alternativa tinha armadilha silenciosa.** Sob (B), a organização com um único formulário precisaria
duplicá-lo em dois modelos. Os dois divergem com o tempo (alguém edita um e esquece o outro), os
`componentId` deixam de casar, e a comparação passa a produzir divergências **vazias ou falsas** — sem erro,
sem aviso, dentro do artefato que serve de prova.

**A proteção original não se perde.** Deduplicar por fase preserva exatamente o que o dedup por modelo
queria: a mesma vistoria nunca é pedida duas vezes **no mesmo momento**. Só o eixo muda.

**O custo de mudar é assimétrico no tempo.** Corrigir agora é **uma linha**, antes de existir qualquer junção
gravada — a tabela `work_order_checklists` nem existe. Depois seria migração sobre dado real de ordens de
serviço já criadas, num vínculo que é sticky e sem backfill.

## Consequências aplicadas

| Onde | O que muda |
|---|---|
| `checklist-applicability.resolution.ts` | o `Set` de deduplicação passa de `templateId` para `role` |
| `tests/checklist-applicability-resolution.test.ts` | o teste que afirmava o oposto foi **superseded** e substituído por dois: um provando que coleta+entrega do mesmo modelo saem como duas vistorias, outro provando que duas regras da MESMA fase continuam recusando duplicata |
| Identidade da junção (PR-04c-A) | `(tenant_id, work_order_id, checklist_id, role)`, único parcial em `removed_at IS NULL`. `role` é NOT NULL, então duas linhas `generic` do mesmo modelo ainda colidem |
| `client_run_key` do despacho | precisa incluir a fase — e com **fallback à chave legada** (senão um re-despacho de ordem em voo cria run nova e **dobra a métrica faturada**; achado separado do mesmo ataque) |

## Correção de registro (§A2)

A `D-CHK-P1-APPLICABILITY` (decisão do dono) **não** trata do eixo de deduplicação — ela cravou os eixos de
serviço/cliente/fase e a precedência dentro do eixo de serviço. O dedup por modelo foi uma escolha de
implementação minha no #345, apresentada no código como "proteção anti-duplicata", **sem decisão por trás**.
Esta ata é o registro que faltava; o ponto correspondente em `decisoes.md` recebe a nota de superseder.

**Como isso passou batido no #345:** o plano justificou o índice dizendo que era "a chave anti-duplicata que
a própria resolução já anuncia" — argumento circular, porque a resolução deduplicava assim **porque a chave
tinha sido assumida**. Citar a consequência como fundamento da causa foi o mecanismo exato pelo qual o caso
"mesmo modelo em duas fases" desapareceu sem ninguém decidir.
