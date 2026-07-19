# Junta J-ws-rbac-gating-checklists — WS-RBAC-GATING-CHECKLISTS

- **Data:** 2026-07-19
- **Entrega:** revisão RBAC ator-por-ator (mandato do dono: "existe telas que tem todas as opcoes para perfis"). As 2 telas
  REAIS de checklist deixam de expor ações de ESCRITA a papéis de leitura.
- **Tipo:** bloco normal (frontend, RBAC/UI) → **maioria de ≥3**.
- **Branch:** `feat/frontend-ws-rbac-gating-checklists`.

## Escopo
- `TenantChecklistsPage`: `usePermissions` + gates — "Novo checklist" (`tenant_checklists:create`), "Publicar" linha+builder
  (`publish`), "Ativar/Inativar" (`update`), "Salvar builder" (`update`, pois só PATCHea). "Visualizar" (leitura) sempre visível.
- `ChecklistRunsPage`: "Iniciar execução" gated em `checklist_runs:create`.
- +teste de render `checklists-access-gating.smoke.test.tsx` (2 casos) no script `test:smoke`.
- **DEFERIDO:** as 3 telas-casca MOCK (DispatchConsole/TablePage/Pedidos) → WS-SCALE-8TELAS (gate-on-wiring, P-RBAC-GATING-MOCKSHELLS).

## Composição e votos
| Agente | Lente | Veredito |
|---|---|---|
| coordenador-de-acessos | cadeia papel→permissão→UI→backend | **APROVADO** |
| validador-mestre | regras/DoD/cobertura | **APROVADO_CONDICIONADO** |
| cognicao-visual | fidelidade §11 pós-gating | **APROVADO** (2ª rodada — o 1º voto voltou degenerado e foi re-executado) |

**Resultado: 2 APROVADO + 1 APROVADO_CONDICIONADO — 0 BLOQUEIA, 0 REPROVADO. Maioria APROVADO → MERGE após sanar condições.**

Confirmações: coordenador validou que as permissões casam com cada ação, que NÃO há over-gating (catalog.ts dá
create/update/publish de templates só a tenant_admin/super; esconder de manager/operator é correto), que o backend enforça 403
real (`requireChecklistPermission` + `rbac.middleware.ts`), e que "Visualizar" fica aberto à leitura. cognicao confirmou por CSS
que nenhuma área de ações vira caixa vazia visível (`.platform-actions` colapsa 0×0) nem botão esticado (`.ui-button` é inline-flex).

## Condições sanadas
- **BAIXA (coordenador) — "Salvar builder" gated por create||update:** afinado para `canUpdate` (a ação só PATCHea).
- **MEDIA (validador) — lacuna de teste:** adicionado teste de render que prova botão de escrita OCULTO p/ só-leitura e
  VISÍVEL p/ create (516/516; incluído no `test:smoke`).
- **MEDIA (validador) — registrar deferral das 3 cascas mock:** `P-RBAC-GATING-MOCKSHELLS`.
- **BAIXA (cognicao) — rodapé do builder órfão:** `.checklist-builder-footer` inteiro (texto de ajuda + ações) agora some para
  papel sem update/publish.

## Condições DEFERIDAS (pendências registradas)
- **BAIXA (coordenador) — divergência pré-existente catalog×RBAC_MATRIX** (manager tem checklist_runs:create vs matriz;
  finance/inventory sem tenant_checklists:read) → `P-RBAC-CATALOG-MATRIZ` (reconciliar em WS-SCALE-8TELAS).
- **BAIXA (validador) — builder interativo no view p/ só-leitura** (mutações locais, sem persistência) → `P-CHECKLIST-BUILDER-READONLY`.
- **BAIXA (cognicao) — `{item.status}` cru na cópia** de ChecklistRunsPage (pré-existente, fora do diff) → `P-CHECKLIST-RUNS-STATUS-COPY`.

## Rastreabilidade
- ID: WS-RBAC-GATING-CHECKLISTS · PR: (após `gh pr create`) · merge_commit/approved_head: null na autoria (backfill pós-merge).
- Ata da junta: `wf_f70da314-c4a`; re-execução da fidelidade: agente `cognicao-visual` (2ª rodada).
- KPI: frontend_smoke 514→516. `.claude/skills/*` untracked EXCLUÍDOS do commit.
