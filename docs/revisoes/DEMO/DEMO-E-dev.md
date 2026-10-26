# Relatório DEV — Bloco DEMO-E: Nome do Guincheiro e Horários do Despacho (AC-16 + AC-19)

> **Executor:** `dev-demo-e-agy-flash` (DEV, Gemini 3.8 Flash via Antigravity, abaixo do nível menor declarado).  
> **Data:** 2026-10-26  
> **Ramo:** `feat/demo-despachos-nome-e-horarios`  
> **Worktree:** `C:/Users/AMP/w-demo-e`  
> **Base:** `origin/main` @ `c9a2d036`  

---

## 1. Contexto e Retomada

- A identidade anterior (`dev-demo-e-agy-opus`) foi interrompida às 21:35Z.
- Verificação do worktree `C:/Users/AMP/w-demo-e`: havia uma modificação pendente em `src/modules/field-dispatch/field-dispatch.types.ts` (`operatorName?: string`).
- **Medição e descarte:** Conforme a instrução estrita do mandato ("Descarte o que for horário na lista com `git checkout -- <arquivo>`" e "Só front: se o AC-16 exigir mudança no servidor (`src/`) para trazer o nome do técnico, PARE e registre no relatório"), o arquivo foi restaurado para a versão limpa de `origin/main`.
- **Análise do Backend (`src/`):**
  - O endpoint de detalhe de despacho (`GET /api/v1/operations/dispatches/:id`) já retorna todos os horários do ciclo de vida: `acceptedAt`, `onRouteAt`, `arrivedAt`, `inServiceAt`, `completedAt` (`field-dispatch.dto.ts`). A lista (`GET /api/v1/operations/dispatches`) de propósito não expõe esses horários para evitar vazamento em massa para técnicos que listam despachos (AC-19 preservado sem alteração em `src/`).
  - O endpoint `GET /api/v1/users` é estritamente isolado por organização (`actor.tenantId`), requer `users.read` (já possuído por `manager` e `tenant_admin`), e o frontend já dispõe da função padrão `listTenantUsers(context)` em `src/modules/registry/teams/teams.service.ts` (já usada em Remunerações, Multas, Equipes e formulário de OS).
  - Conclusão: **NENHUMA alteração no backend (`src/`) é necessária.** O AC-16 e o AC-19 foram entregues 100% no frontend, mantendo zero risco de exposição de dados e isolamento multi-tenant íntegro.

---

## 2. O que foi Implementado

### AC-19 (Linha do Tempo na Aba Mobile da OS — Só Front)
- Arquivo alterado: `frontend/src/modules/work-orders/components/tabs/MobileTab.tsx`
- **Problema anterior:** `MobileTab` consultava apenas a listagem (`listDispatchesFromApi`), que não traz os horários intermediários (`acceptedAt`, `onRouteAt`, `arrivedAt`, `inServiceAt`, `completedAt`). Por isso, a aba exibia apenas "Enviado ao app" (derivado de `createdAt`).
- **Solução implementada:** Ao localizar o despacho vinculado à OS, `MobileTab` agora consulta o endpoint de detalhe via `getDispatchFromApi(context, target.id)`. O detalhe devolve todos os timestamps reais das transições de status (`acceptedAt`, `onRouteAt`, `arrivedAt`, `inServiceAt`, `completedAt`), alimentando a `MobileTimeline` com a linha do tempo completa (aceite, saída, chegada, atendimento e conclusão) e mantendo "Aguardando" para etapas pendentes.

### AC-16 (Nome do Técnico na Coluna "Operador" e Lista de OS)
- Arquivos alterados:
  - `frontend/src/modules/operations/dispatches/components/DispatchesTable.tsx`
  - `frontend/src/modules/operations/dispatches/components/DispatchesFilters.tsx`
  - `frontend/src/modules/operations/dispatches/components/DispatchDetailPanel.tsx`
  - `frontend/src/modules/operations/dispatches/pages/OperationsDispatchesPage.tsx`
  - `frontend/src/modules/work-orders/components/WorkOrdersTable.tsx`
  - `frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx`
- **Resolução de Identidade por Organização:**
  - `OperationsDispatchesPage` e `WorkOrdersPage` carregam os usuários da organização autenticada via `listTenantUsers(context)`. Como a consulta bate em `GET /api/v1/users` com o token da sessão, apenas usuários do mesmo tenant são resolvidos.
  - O mapa `operatorNameById` associa `userId -> user.name`.
  - Na tabela de Despachos (`DispatchesTable`), a coluna "Operador" renderiza `operatorNameById.get(item.operatorUserId) ?? item.operatorUserId`.
  - No filtro de Despachos (`DispatchesFilters`), o seletor `<Select label="Operador">` exibe o nome legível nas opções.
  - No painel de detalhes (`DispatchDetailPanel`), o campo "Operador" renderiza o nome do técnico.
  - Na página de Ordens de Serviço (`WorkOrdersPage`), a célula TÉCNICO renderiza o nome do técnico atribuído em vez de apenas o texto genérico "Atribuído", degradando com segurança para "Atribuído" caso o nome ainda não tenha sido resolvido.
  - Na tabela de Ordens de Serviço (`WorkOrdersTable`), a coluna "Operador" renderiza o nome do técnico correspondente a `assignedOperatorId ?? assignedUserId`, e "Nao atribuido" quando ausente.

---

## 3. Testes e Mutações

### 3.1 Testes Unitários e de Integração
Criado o arquivo de testes `frontend/tests/demo-e-despachos.test.tsx` com 8 testes cobrindo os critérios de aceite:
1. `[AC-16] DispatchesTable: exibe o nome do operador quando resolvido por operatorNameById`
2. `[AC-16] DispatchesTable: degrada honestamente para o ID quando não resolvido no mapa`
3. `[AC-16] DispatchesFilters: opções do seletor exibem o nome do operador`
4. `[AC-16] DispatchDetailPanel: exibe nome do operador se fornecido`
5. `[AC-16] WorkOrdersTable: exibe o nome do operador na lista de OS quando atribuído`
6. `[AC-16] WorkOrdersTable: OS sem operador exibe 'Nao atribuido'`
7. `[AC-19] MobileTimeline: exibe as 6 etapas na linha do tempo com datas formatadas`
8. `[AC-19] MobileTimeline: etapas ainda não alcançadas exibem 'Aguardando'`

Integrado ao script `test:smoke` do `frontend/package.json`.

### 3.2 Mutações Realizadas

#### Mutação 1 (AC-16):
- **Mutação:** Em `DispatchesTable.tsx`, forçada a renderização da coluna Operador para sempre exibir o ID bruto `item.operatorUserId`, ignorando `operatorNameById`.
- **Execução:** Teste falhou com `AssertionError: Não deve exibir o identificador técnico cru na célula`.
- **Restauração:** Código revertido para usar `operatorNameById?.get(item.operatorUserId) ?? item.operatorUserId`.
- **Resultado pós-restauração:** 8/8 testes passaram (VERDE).

#### Mutação 2 (AC-19):
- **Mutação:** Em `MobileTab.tsx`, alterado o label da etapa em `STAGE_DEFS` de `"Aceito pelo técnico"` para `"Aceito (desconhecido)"`.
- **Execução:** Teste falhou com `AssertionError: The input did not match the regular expression /Aceito pelo técnico/`.
- **Restauração:** Código revertido para `"Aceito pelo técnico"`.
- **Resultado pós-restauração:** 8/8 testes passaram (VERDE).

---

## 4. Bateria de Verificação

- `npm run check` (root): **VERDE** (0 erros, `tsc -p tsconfig.json --noEmit`)
- `npm run lint` (root): **VERDE**
- `npm run build` (root): **VERDE** (0 erros, `tsc -p tsconfig.json`)
- `npm --prefix frontend run check`: **VERDE** (0 erros, `tsc -b --noEmit`)
- `npm --prefix frontend run test:smoke`: **VERDE** (1376 testes passando, 0 falhas)
- `npm --prefix frontend run build`: **VERDE** (0 erros, `tsc -b && vite build`)
- `git diff --check`: **VERDE** (nenhum erro de whitespace ou formatação)

---

## 5. Arquivos Tocados

- `frontend/package.json`
- `frontend/src/modules/operations/dispatches/components/DispatchDetailPanel.tsx`
- `frontend/src/modules/operations/dispatches/components/DispatchesFilters.tsx`
- `frontend/src/modules/operations/dispatches/components/DispatchesTable.tsx`
- `frontend/src/modules/operations/dispatches/pages/OperationsDispatchesPage.tsx`
- `frontend/src/modules/work-orders/components/WorkOrdersTable.tsx`
- `frontend/src/modules/work-orders/components/tabs/MobileTab.tsx`
- `frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx`
- `frontend/tests/demo-e-despachos.test.tsx`
- `docs/revisoes/DEMO/DEMO-E-dev.md`

`src/`, `prisma/**`, `migrations/**` e `Kpis/**` permaneceram 100% intocados.
