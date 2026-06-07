# API x Telas

Este documento mapeia telas Web/Mobile para endpoints planejados. O prefixo final deve seguir o versionamento do backend vigente quando a implementacao for criada.

## tenant_checklist

Feature configuravel por tenant. A plataforma fornece componentes permitidos; o tenant cria e publica checklists combinando esses componentes.

### W02A · Administrador — Checklists

Objetivo: listar, criar, editar, ativar/inativar, configurar componentes e publicar checklists do tenant.

Permissoes:

- `tenant_checklists:read`
- `tenant_checklists:create`
- `tenant_checklists:update`
- `tenant_checklists:publish`

Endpoints esperados:

```http
GET    /tenant/checklists
POST   /tenant/checklists
GET    /tenant/checklists/:checklistId
PATCH  /tenant/checklists/:checklistId
DELETE /tenant/checklists/:checklistId
GET    /tenant/checklist-components
GET    /tenant/checklists/templates
POST   /tenant/checklists/:checklistId/publish
```

Regras:

- `tenant_id` deve vir do contexto autenticado.
- O body nao deve ser fonte confiavel de `tenant_id`.
- Checklist deve ter tipo `towing_collection`, `towing_delivery`, `technical_evidence` ou `custom`.
- O tenant configura obrigatoriedade de fotos, observacoes, marcadores e ciencia.
- Publicacao deve versionar o schema consumido por Web/Mobile.

## Mobile Checklists

M10, M11 e M12 devem renderizar schema retornado pela API, evitando hardcode de campos no cliente.

Permissoes:

- `checklist_runs:read`
- `checklist_runs:create`
- `checklist_runs:update`
- `checklist_runs:complete`

Endpoints esperados:

```http
GET    /mobile/checklists/available
GET    /mobile/checklists/:checklistId/render
POST   /mobile/checklist-runs
PATCH  /mobile/checklist-runs/:runId
POST   /mobile/checklist-runs/:runId/attachments
POST   /mobile/checklist-runs/:runId/markers
POST   /mobile/checklist-runs/:runId/complete
GET    /mobile/checklist-runs/:runId/comparison
POST   /mobile/checklist-runs/:runId/divergence
POST   /mobile/checklist-runs/:runId/acknowledgement
```

### M10 · Checklist de coleta

Tipo: `towing_collection`.

Uso: guincho/reboque, coleta, selecao de tipo de veiculo e marcacao de avarias.

### M11 · Checklist de entrega

Tipo: `towing_delivery`.

Uso: guincho/reboque, entrega, nova vistoria e comparacao com a coleta.

Regra de divergencia:

- se a comparacao com M10 detectar divergencia, exigir observacao obrigatoria;
- exigir ciencia de responsabilidade antes da conclusao quando configurado.

### M12 · Evidencia tecnica antes/depois

Tipo: `technical_evidence`.

Uso: reparo, construcao, manutencao ou servicos internos/externos.

M12 nao pertence ao escopo de guincho/reboque e nao deve reutilizar a semantica de coleta/entrega.
