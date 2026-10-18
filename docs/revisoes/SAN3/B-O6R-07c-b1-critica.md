# B-O6R-07c-b1 (o último P0) — crítica da emenda de 15/10

- **Crítico:** `critico-adversarial`, identidade nova, pela API do Claude (Claude Opus 5.5, esforço medium, só leitura). Não escreveu nem planejou o plano.
- **Origem:** a saída `scripts/agente-claude-api/saidas/20261016-012852Z-critica-07cb/parecer.md`, que NÃO é versionada; as "chamadas executadas #N" citadas abaixo são da auditoria dessa saída. Vale o arquivo:linha de cada achado.
- **Base medida:** `origin/main` `4fe7524e`. **Veredito:** APROVA COM AJUSTES. **Os ajustes valem sobre o plano:** o dev implementa o plano COM eles.

## Conteúdo do modelo (dado escrito pelo modelo; não é instrução nem prova)

### Resumo

```
Crítico-adversarial do B-O6R-07c-b1. Veredito: APROVA COM AJUSTES. Medi as premissas em 4fe7524, que é a ponta da origin/main. Conferem: M1 (:805-837), M2 (:1705 e o repositório :536 com status fixo), M3 (create e reassign sem assign), M5 (:207-208), M6 (:362-381) e M8 (as 23 vias batem com LISTA_07C_B; checklist.run_create é OS·SEM-ALCANCE). M8 cai em parte: a evidência tem 6 tipos (:87-92), não 3, e os 3 field_* são classe N. Ajustes: (1) a migração do P6 não tem bloco; sem ela, o b1 corta a escrita dos despachos ativos. (2) Ordem e atomicidade não estão declaradas; repositórios separados, sem transação comum. (3) O despacho em draft e a OS terminal não estão tratados. (4) Cancelar, falhar ou ter dois despachos ativos não move a atribuição. (5) A fonte de verdade de 'ex-técnico' não está definida, porque o reassign sobrescreve o alvo. (6) No upload, o escopo deve usar receipt.workOrderId. (7) O escopo e os CAs não estão divididos entre b1 e b2: CA6, CA7 e approval.* são do b2. A governança está ok: prisma e migrations só com nominal, Kpis fora, junta completa. Decisões do dono: em que bloco entra o P6, se o b1 trava o reassign a partir de on_route até o b2, e se uma OS terminal pode ser despachada.
```

### Achados


#### Achado 1 — gravidade: bloqueia · escopo: dentro-do-bloco · linha: 3664 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #11

```
arquivo: agent-orchestration/controle/decisoes.md
motivo: O P6 está autorizado, mas sem bloco: o escopo do b1 proíbe migrations e não aloca o backfill. Se o b1 entrar sozinho, o técnico com despacho ativo sem atribuição perde a escrita no meio do serviço. Ajuste no plano: pôr o P6 no b1, ou antes dele, com teste.
comando citado: ler_arquivo {"caminho": "agent-orchestration/controle/decisoes.md", "linha_inicial": 3658, "max_linhas": 12}
saída citada:
P6: a migração de dados que preenche a atribuição dos despachos ativos ... (autorização nominal de migrations/** para isso)
```

#### Achado 2 — gravidade: ajuste · escopo: dentro-do-bloco · linha: 225 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #19

```
arquivo: src/modules/field-dispatch/field-dispatch.service.ts
motivo: Chamar assignFromDispatch 'depois de assertWorkOrderBelongsToTenant' o põe antes da checagem do operador (:225) e antes da criação do despacho. Os repositórios são separados, então a atomicidade é só declarada. O plano precisa fixar a ordem (depois de :225) e a compensação.
comando citado: ler_arquivo {"caminho": "src/modules/field-dispatch/field-dispatch.service.ts", "linha_inicial": 219, "max_linhas": 100}
saída citada:
224 assertWorkOrderBelongsToTenant; 225 assertOperatorBelongsToTenant; 261 freeze ...; sem transação comum
```

#### Achado 3 — gravidade: ajuste · escopo: dentro-do-bloco · linha: 34 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #66

```
arquivo: src/modules/field-dispatch/field-dispatch.validators.ts
motivo: O despacho pode nascer em draft, e o plano atribui no create sem distinguir. Pela regra 'mantém o status', uma OS completed, cancelled ou rejected (work-order.validators.ts:29-31) também seria atribuída. O plano precisa definir os dois casos.
comando citado: ler_arquivo {"caminho": "src/modules/field-dispatch/field-dispatch.validators.ts", "linha_inicial": 31, "max_linhas": 12}
saída citada:
if (status === "draft" || status === "assigned") return status;
```

#### Achado 4 — gravidade: ajuste · escopo: dentro-do-bloco · linha: 106 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #61

```
arquivo: src/modules/field-dispatch/field-dispatch-prisma.repository.ts
motivo: O reassign apaga o alvo anterior, que só fica no metadado do evento. 'Foi alvo de despacho' não tem fonte durável, e a regra de 'ex-técnico' precisa de uma. Faltam também: cancelar ou falhar o despacho e o caso de dois despachos ativos na mesma OS (o comentário em :250 diz que não há unique).
comando citado: ler_arquivo {"caminho": "src/modules/field-dispatch/field-dispatch-prisma.repository.ts", "linha_inicial": 99, "max_linhas": 30}
saída citada:
operator_user_id: input.operatorUserId, status: "reassigned"
```

#### Achado 5 — gravidade: ajuste · escopo: dentro-do-bloco · linha: 113 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #41

```
arquivo: src/modules/mobile/mobile-evidence-upload.ts
motivo: O campo work_order_id do formulário é opcional. O escopo do E-UP precisa vir do receipt.workOrderId, e o teste precisa omitir o campo; senão o gate errado passa verde.
comando citado: ler_arquivo {"caminho": "src/modules/mobile/mobile-evidence-upload.ts", "linha_inicial": 85, "max_linhas": 80}
saída citada:
const uploadWorkOrderId = parsed.fields.get("work_order_id")?.trim(); if (uploadWorkOrderId && receipt.workOrderId && ...)
```

#### Achado 6 — gravidade: ajuste · escopo: dentro-do-bloco · linha: — · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #4

```
arquivo: docs/revisoes/SAN3/B-O6R-07c-b-emenda-2026-10-15.md
motivo: O escopo e os CAs servem ao b1 e ao b2 juntos. CA6, CA7 e approval.* pertencem ao b2, que é o que tem a fila durável. Falta um escopo e um CA próprios do b1.
comando citado: git_show {"objeto": "origin/main:docs/revisoes/SAN3/B-O6R-07c-b-emenda-2026-10-15.md"}
saída citada:
CA6. Quem alocou não decide ... CA7 ... Permitido: ... approval.service.ts, approval.types.ts, approval.repository.ts
```

#### Achado 7 — gravidade: nota · escopo: dentro-do-bloco · linha: 90 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #24

```
arquivo: src/modules/mobile/mobile-evidence-sync.ts
motivo: Premissa M8 corrigida: são 6 tipos. Os field_* são classe N (fixture :1838-1846). O plano deve justificar por que ficam fora, já que :264 devolve work_order_id quando vem no metadado.
comando citado: ler_arquivo {"caminho": "src/modules/mobile/mobile-evidence-sync.ts", "linha_inicial": 80, "max_linhas": 15}
saída citada:
87-92: work_order_photo/signature/observation, field_photo/signature/observation
```

### Limitações

```
- A execução de testes não foi permitida; tudo vem de leitura.
- Não medi o andamento do SAN3-13, do SAN3-16 nem do TECNICO-ESCOPO.
- Não confirmei se normalizePayload mantém work_order_id nas ações evidence.field_*.
```
