# R-omega3a-1 — Reprovação (protocolo v3, ciclo 1) — Ω3-a ServiceQuote

## Junta ciclo 1 (5 agentes, login real :3000)
- **master-teste-telas-rotas** — APROVADO (41/41 back + 31/31 front rodados; 11 cadastros intactos; sem coluna morta pela régua estrita; cobertura bate com o task-history).
- **inspetor-de-rotas** — APROVADO (5 endpoints montados, 403 sem auth / 404 path inexistente ao vivo; contrato body/query alinhado; menu↔rota↔guard coerentes). *Report não-veto:* `finance` tem `service_quotes:*` mas não vê o item "Orçamentos" no sidebar (grupo OPERAÇÃO de finance = só Aprovações).
- **cognicao-visual** — **REPROVADO** (1 bloqueante).
- **validador-mestre** — (pendente/registrar).
- **coordenador-de-acessos** — (pendente/registrar).

## VETO — cognicao-visual (B1, dado técnico cru na UI)
A coluna **Serviço** (identidade principal da linha) e a coluna **OS** exibem **UUID cru** truncado
(`shortRef(serviceCatalogId)` / `shortRef(workOrderId)`) — o list DTO só emite `serviceCatalogId`,
sem `serviceName`. Para o usuário de negócio a coluna é ilegível. Agravante: o placeholder de busca
promete "Buscar por OS, serviço…" mas `filterServiceQuotes` só casa o UUID. Mesma classe de bug que
reprovou Tarifas/POI/Profissionais (coluna morta pelo lado do leitor), aqui "campo presente porém cru".

Precedente: **Tarifas foi aprovada** porque resolve o rótulo client-side via `useTariffReferences`
(`serviceLabelById.get(id)`), renderizando o NOME e não o UUID. Quotes deve seguir a mesma régua.

## CORREÇÃO (ciclo 1 → 2)
1. Novo hook `useServiceQuoteReferences` (espelho de `useTariffReferences`) — carrega serviços,
   clientes e ordens de serviço; expõe `serviceLabelById`/`customerLabelById`/`workOrderLabelById`
   + arrays de opção para o modal. D-007 (mock/erro → vazio).
2. `OrcamentosPage`: coluna **Serviço** renderiza o NOME (UUID só no `title`); coluna **OS** renderiza
   o CÓDIGO da OS (ou "Avulso"); busca passa a casar os rótulos resolvidos (não o UUID).
3. `ServiceQuoteFormModal`: serviço/cliente/OS viram **selects** (mata o input de UUID; melhor UX),
   props opcionais (default []) para não quebrar o smoke que renderiza sem referências.
4. (report do inspetor) `appSidebarNav`: incluir "Orçamentos" no grupo OPERAÇÃO do RoleKind `finance`
   (finance tem create/update na matriz — descoberta pelo menu).
5. Ajuste documental: task-history "smoke 13" → **12** (contagem real do arquivo).

## RE-VERIFICAÇÃO
Após a correção, reverificar com o **autor do veto (cognicao-visual)** — protocolo v3.
