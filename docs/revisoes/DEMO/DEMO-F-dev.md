# Relatório DEV — Bloco DEMO-F: Respostas da vistoria visíveis no detalhe da OS na web (AC-13)

- **Data:** 2026-10-26
- **Agente:** `dev-demo-f-agy-flash` (Gemini 3.8 Flash pelo Antigravity)
- **Ramo:** `feat/demo-vistoria-na-os`
- **Base:** `origin/main` @ `c9a2d036`
- **Worktree:** `C:/Users/AMP/w-demo-f`

---

## 1. Análise Prévia (Passo 1 do Mandato)

### 1.1 Onde o backend guarda as respostas da vistoria
- As execuções de checklist vinculadas a uma Ordem de Serviço são persistidas no banco na tabela `checklist_runs` (modelo Prisma `ChecklistRun`), com `related_entity_type = "work_order"` e `related_entity_id = <workOrderId>`.
- As respostas de cada item preenchido pelo técnico no app são gravadas na tabela `checklist_run_answers` (modelo Prisma `ChecklistRunAnswer`), associadas a `run_id` e `component_id`.
- Os templates de checklist ficam em `checklist_templates` e seus componentes em `checklist_template_components` (com `id`, `label`, `type`, `order`, etc.).

### 1.2 Verificação de rotas de leitura existentes e permissão do papel `manager`
- Rota para listar as execuções de checklist de uma OS:
  - `GET /api/v1/mobile/checklist-runs?workOrderId=:id`
  - Controller: `checklistController.listRunsForWorkOrder`
  - Permissão exigida: `checklist_runs:read`
- Rota para obter o detalhe da execução com respostas e template:
  - `GET /api/v1/mobile/checklist-runs/:runId/comparison`
  - Controller: `checklistController.compareChecklistRun`
  - Retorna `run`, `template` (com `components`), `answers` (com `componentId`, `value`, `createdAt`), `markers`, `attachments`.
  - Permissão exigida: `checklist_runs:read`
- Verificação em `RBAC_MATRIX.md` e `src/modules/core-saas/permissions/catalog.ts`:
  - O papel `manager` possui explicitamente a permissão `checklist_runs:read` (catalog.ts linha 568).
  - Portanto, a rota de leitura EXISTE e o gestor (`manager`) tem permissão de leitura sobre ela.
  - Veredito do Passo 1: **A rota existe.** Procedendo para implementação apenas no frontend (`frontend/`), respeitando as regras do `CLAUDE.md`.

---

## 2. Implementação (Passo 2 do Mandato)

### 2.1 Arquivos criados e alterados
1. `frontend/src/modules/work-orders/inspection.service.ts` (CRIADO):
   - Função `fetchWorkOrderInspection(workOrderId, context)`: busca a lista de execuções via `GET /api/v1/mobile/checklist-runs?workOrderId=...` e obtém os dados comparativos via `GET /api/v1/mobile/checklist-runs/:runId/comparison`.
   - Normaliza opções de request com `toRequestOptions` (garantindo compatibilidade estrita de token e branchId).
   - Formatação amigável de valores (`formatInspectionValue`) e status (`formatInspectionStatusLabel`).
   - Formatação de data/hora no padrão brasileiro estrito `dd/mm/aaaa hh:mm` (`Intl.DateTimeFormat("pt-BR", ...)`).
   - **Regra de Segurança de Fotos:** componentes de foto e evidência (`photo_upload`, `evidence`) são estritamente filtrados e ignorados na renderização (`isPhotoComponent`), pois o servidor rejeita upload de arquivos enquanto não há antivírus.
2. `frontend/src/modules/work-orders/components/tabs/WorkOrderInspectionCard.tsx` (CRIADO):
   - Exporta componente puro `WorkOrderInspectionView` e componente com ciclo de vida `WorkOrderInspectionCard`.
   - Card padronizado intitulado **"Vistoria"**, integrado à identidade visual do ERP (`DESIGN_SYSTEM.md`, `COMPONENT_LIBRARY.md`).
   - Estados obrigatórios tratados:
     - `loading`: skeleton acessível com indicador visual `Carregando dados da vistoria...`.
     - `empty`: estado vazio amigável ("Sem vistoria nesta OS") com mensagem contextual.
     - `error`: estado de erro amigável ("Não foi possível carregar a vistoria.") com botão de retry ("Tentar novamente").
     - `forbidden`: bloqueio honrado quando o ator não possui `checklist_runs:read` ("Você não tem permissão para visualizar a vistoria desta ordem de serviço.").
   - Vocabulário 100% aderente ao §3 do `CLAUDE.md` (sem termos técnicos vazados para a interface).
   - Uso de `data-inspection-state` para isolamento de estados DOM.
3. `frontend/src/modules/work-orders/components/tabs/GeneralInfoTab.tsx` (ALTERADO):
   - Adicionada prop `permissions?: string[]`.
   - Inserido `<WorkOrderInspectionCard workOrderId={workOrder.id} permissions={permissions} />` na coluna esquerda, logo abaixo de `WorkOrderRegistryLinksCard` e antes de `Histórico`.
4. `frontend/src/modules/work-orders/pages/WorkOrderDetailPage.tsx` (ALTERADO):
   - Repassado `permissions={permissions}` para `<GeneralInfoTab ... />`.
5. `frontend/package.json` (ALTERADO):
   - Adicionado `tests/work-order-inspection.smoke.test.tsx` ao script `test:smoke`.

---

## 3. Testes Automatizados (Passo 3 do Mandato)

- Arquivo criado: `frontend/tests/work-order-inspection.smoke.test.tsx`
- 10 subtestes cobrindo exaustivamente:
  1. Estado vazio: renderiza aviso "Sem vistoria nesta OS" quando não há execuções.
  2. Estado sem permissão: exibe bloqueio amigável quando falta a permissão `checklist_runs:read`.
  3. Estado de erro: exibe mensagem amigável e botão "Tentar novamente".
  4. Exibição de itens preenchidos: rótulo, valor formatado e data formatada `dd/mm/aaaa hh:mm`.
  5. Filtro de fotos: componentes do tipo `photo_upload` e `evidence` são omitidos.
  6. Conformidade com §3: nenhum termo técnico proibido é exposto ao usuário.
  7. Formatação de valores: booleanos (Sim/Não), seleções e campos vazios ("Não informado").
  8. Integração em GeneralInfoTab: componente Vistoria presente na aba Informações Gerais com permissão.
  9. Integração em GeneralInfoTab sem permissão: exibe aviso de permissão sem quebrar o layout.
  10. Estado de carregamento: skeleton presente durante a requisição.

---

## 4. Prova por Mutação (Passo 4 do Mandato)

Foram executadas 4 mutações direcionadas com quebra comprovada (RED) e restauração comprovada (GREEN):

### Mutação 1: Remoção do título do card "Vistoria"
- **Arquivo:** `frontend/src/modules/work-orders/components/tabs/WorkOrderInspectionCard.tsx`
- **Mutação:** alterado `<h3 ...>Vistoria</h3>` para `<h3 ...>Inspeção Técnica</h3>`.
- **Resultado do teste (RED):**
  ```
  not ok 1 - WorkOrderInspectionCard: renderiza estado vazio quando não há vistoria vinculada
    AssertionError [ERR_ASSERTION]: The input did not match the regular expression /Vistoria/.
  ```
- **Restauração (GREEN):** Revertido para `Vistoria`. Testes passaram 10/10.

### Mutação 2: Desativação do filtro de fotos
- **Arquivo:** `frontend/src/modules/work-orders/inspection.service.ts`
- **Mutação:** alterado `if (isPhotoComponent(component.type)) continue;` para `if (false) continue;`.
- **Resultado do teste (RED):**
  ```
  not ok 5 - WorkOrderInspectionCard: itens de foto/evidência são filtrados e não entram no card
    AssertionError [ERR_ASSERTION]: The input was expected to not match the regular expression /Foto do Painel/.
  ```
- **Restauração (GREEN):** Revertido filtro de fotos. Testes passaram 10/10.

### Mutação 3: Quebra da formatação da data/hora (dd/mm/aaaa hh:mm)
- **Arquivo:** `frontend/src/modules/work-orders/inspection.service.ts`
- **Mutação:** alterado `formatInspectionDate` para retornar `isoString` cru sem formatação brasileira.
- **Resultado do teste (RED):**
  ```
  not ok 4 - WorkOrderInspectionCard: exibe itens de vistoria com rótulo, valor e data formatada
    AssertionError [ERR_ASSERTION]: The input did not match the regular expression /\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/.
  ```
- **Restauração (GREEN):** Revertida formatação de data para `Intl.DateTimeFormat`. Testes passaram 10/10.

### Mutação 4: Desativação da verificação de permissão `checklist_runs:read`
- **Arquivo:** `frontend/src/modules/work-orders/components/tabs/WorkOrderInspectionCard.tsx`
- **Mutação:** alterado `hasPermission = permissions ? permissions.includes("checklist_runs:read") : true;` para forçar sempre `true`.
- **Resultado do teste (RED):**
  ```
  not ok 2 - WorkOrderInspectionCard: exibe aviso quando usuário não possui permissão checklist_runs:read
    AssertionError [ERR_ASSERTION]: The input did not match the regular expression /Você não tem permissão para visualizar a vistoria/.
  ```
- **Restauração (GREEN):** Revertida checagem de permissão. Testes passaram 10/10.

---

## 5. Bateria de Verificação Executada

1. **Checagem de tipos TypeScript:**
   - Comando: `npm --prefix frontend run check` (`tsc -b --noEmit`)
   - Resultado: Sucesso (0 erros).
2. **Suíte de fumaça completa:**
   - Comando: `npm --prefix frontend run test:smoke`
   - Resultado: **1378 testes executados, 1378 aprovados, 0 falhas** (duração: 234.78s).
3. **Build de produção:**
   - Comando: `npm --prefix frontend run build` (`tsc -b && vite build`)
   - Resultado: Sucesso (construído em 12.81s, zero erros).
4. **Verificação de diff e espaços em branco:**
   - Comando: `git -C C:/Users/AMP/w-demo-f diff --check`
   - Resultado: Vazio (0 erros de formatação ou marcadores residuais).
5. **Espaço em disco mantido:**
   - Verificado: 8.7 GB livres no drive C (> limite de 8 GB).
