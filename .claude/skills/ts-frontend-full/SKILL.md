---
name: ts-frontend-full
description: "Engenharia frontend e mobile de produção para o ERP Techsolutions: React 18 + TypeScript + Vite + Tailwind (web) e Flutter 3.x (app de campo offline-first). Usar ao implementar, revisar, corrigir ou otimizar páginas, componentes, services/repositories, conectividade REST, estados assíncronos, tabelas operacionais densas, dashboards, KPIs e telas Flutter. Cobre tipagem estrita, camadas de rede resilientes, performance e interpretação de dados de negócio."
---

# TS Frontend Full — Edição ERP Techsolutions

## REGRA ZERO — O repositório manda
- A arquitetura de pastas é a QUE EXISTE no repo. Web:
  frontend/src/{pages, modules/<domínio>, components, navigation,
  services, layouts}. Mobile: mobile/flutter_app/lib/{app, core,
  features/<domínio>, shared}. PROIBIDO introduzir estrutura nova
  (atomic design, feature-sliced etc.).
- Antes de criar qualquer arquivo, espelhar o equivalente existente:
  página de lista → WorkOrdersListPage.tsx; service → 
  frontend/src/modules/operations/dispatches/dispatches.service.ts;
  feature Flutter → a feature mais próxima em lib/features/.
- Precedência em conflito: prompt em execução e arquivos do repo
  (DESIGN_SYSTEM.md, COMPONENT_LIBRARY.md, mobile-sync-contracts.md)
  > esta skill > julgamento próprio.
- Design system congelado: zero decisão de estilo aqui (ver skill
  ui-ux-pro-max). Fidelidade visual mobile = docs/claude-code-handoff/
  ERP Mobile.dc.html; web = padrões das páginas existentes.

## Contrato de saída
1. Diagnóstico: o que está errado, faltando ou arriscado.
2. Estratégia: plano de correção/implementação ancorado em arquivos reais.
3. Código: pronto para produção, no padrão do repo.
Direto, sem introdução longa; decisões técnicas comparadas em tabela curta.

## Inegociáveis
- Tipagem estrita: sem `any` (TS) e sem `dynamic` (Dart), salvo boundary
  de parsing com validação imediata.
- UI nunca faz fetch direto: UI → hook → service (módulo) → API.
  No Flutter: UI → controller/notifier → repository → service → DTO.
- Toda operação de rede trata: loading, empty, error com retry, timeout,
  cancelamento/stale-guard em telas com troca rápida.
- Estados assíncronos como discriminated union:
  type LoadState<T> = { status:"idle" } | { status:"loading" }
    | { status:"success"; data:T } | { status:"empty" }
    | { status:"error"; message:string; retryable:boolean };
- Erro normalizado para mensagem segura; logs sem token, PII ou payload
  sensível; nada de dado técnico cru (UUID, enum interno) na UI.
- Dependência nova = condição de parada (perguntar antes; nunca instalar
  por conta própria).

## React/TypeScript — regras de implementação
- Container separado de apresentação quando houver IO/estado complexo.
- Hooks específicos por domínio (useCustomers, useDispatches), não hooks
  genéricos inchados.
- useMemo/useCallback só com custo real medido ou identidade necessária.
- Virtualização em listas/tabelas operacionais grandes (50+ itens).
- Re-render em cascata: fatiar contexto, selectors, props estáveis.
- Tabelas densas: número tabular em colunas de valor/data, ordenação,
  paginação, filtros preservados ao voltar (state preservation).
- Paginação/busca/filtros de listas novas seguem o MESMO padrão de query
  dos módulos existentes (conferir antes; não inventar convenção).

## Flutter — app de campo
- Estado e navegação: seguir o padrão JÁ USADO em lib/ (inspecionar
  antes; não trocar de biblioteca de estado).
- Offline-first é primeira classe: fila local, idempotência, retry com
  limite (nunca infinito), estado de conflito explícito, indicador de
  sync visível. Sync sem idempotência = bug, não feature.
- Parsing de JSON nunca na UI; DTO/mapper na fronteira.
- Widgets pequenos e nomeados; regra de negócio fora do widget.
- Dados sensíveis em storage seguro; logs sanitizados.

## Conectividade REST
- Cliente com timeout definido, retry com limite/backoff quando seguro,
  interceptor de auth (claims fixas: sub, tenant_id, tenant_role,
  tenant_roles, permissions, email, scope), envelope parsing explícito.
- Claims moldam UX mas NUNCA autorizam sozinhas — o backend é a
  autoridade final; a UI apenas esconde/mostra conforme permissão.
- Contrato de cada rota documentado no plano-mestre ANTES do código
  (formato do prompt em execução), com exemplos request/response.

## KPIs, relatórios e dashboards
- Todo número na tela vem de endpoint real (regra SERVIÇO COMPLETO do
  projeto — nunca constante local, nunca mock).
- Todo KPI declarado com: definição, fórmula, granularidade, fonte de
  dados (tabela/rota), limites/vieses e ação que ele sustenta.
- Escolha de gráfico pelo dado: tendência → série temporal; comparação →
  barras; meta → bullet (gauge com cautela); densidade → heatmap;
  dispersão/SLA → boxplot; causas → Pareto; etapas/perdas → funil.
- KPIs operacionais do domínio (serviços de campo): TMC (tempo médio de
  conclusão) = Σ(concluída−iniciada)/concluídas; SLA = concluídas no
  prazo/total; retrabalho = reabertas/total; throughput = concluídas por
  período; km percorridos a partir de FieldOperatorLocation.
  Cada um sempre com período explícito ("hoje", "no mês").

## Modo revisão (ordem de prioridade dos achados)
1. Bug funcional ou quebra de contrato;
2. Segurança/privacidade/vazamento de tenant;
3. Regressão visual ou de acessibilidade;
4. Performance; 5. Testabilidade; 6. Organização.
Cada achado: severidade, arquivo/trecho, impacto, correção, teste.

## Checklist de entrega
- [ ] UI sem fetch direto; camadas respeitadas
- [ ] Sem any/dynamic indevido; DTOs estritos na fronteira
- [ ] loading/empty/error+retry/success implementados
- [ ] Timeout, retry limitado, auth e cancelamento na rede
- [ ] Filtros/scroll preservados; tabelas ordenáveis/paginadas
- [ ] Zero número inventado: todo KPI ligado a endpoint real
- [ ] Nenhuma dependência nova sem aprovação
- [ ] Testes proporcionais ao risco (cota 150% do prompt em execução)