# Roadmap Scale / Enterprise — ERP TechSolutions (Item 3b)

**Data:** 2026-07-19 · **Contexto:** o MVP (mvp_demo 99% / mvp_vendável 88%) está entregue — Core SaaS, Cadastros,
OS/hub, Frota, Financeiro do tenant (Ω4), Mapa, Mobile offline. O que resta é **Scale/Enterprise** (os ~12% do vendável)
+ dívidas de completude. Cada linha abaixo é um **programa multi-PR** (padrão das rodadas Ω: recon → ataque de desenho →
implementar → junta → merge → pós). Ordenado por **valor ÷ esforço** e por dependência.

## Onda 1 — Quick wins (baixo esforço, backend em grande parte já existe)
1. **Ligar as 8 telas "casca" a dados reais** (cruza com `docs/frontend-fidelity-audit.md`): `approvals`/`approvalDetail`
   (API de aprovações + useParams + Aprovar/Recusar), `pedidos` (purchase-orders), `auditTenant` (audit-logs por tenant),
   `dispatchConsole`/`fieldOperators` (agregados reais + org do contexto), `reports`/`invoices` (dependem de backend novo →
   ondas 3/2). **Valor alto, esforço baixo** onde o backend já existe.
2. **P-Ω3F6-COMISSAO** — comissões consomem `financial_cancellation_decision` (DESBLOQUEADO pelo item 1): suprimir
   remuneração de OS cancelada com `zero`/`keep_unpaid`; tratar NULL-legado (P-Ω3F6-LEGACY-NULL) como "segurar p/ revisão".
3. **`logisticsRoutes`** — criar a tela de Rotas Logísticas do protótipo (KPIs Rotas/Paradas/Km/Atrasos) + item de nav.
4. **Hardening de atomicidade financeira** (não-bloqueante, mas antes de escala): $transaction + lock nos write-paths
   (P-Ω4-4-LIQUID-ATOMIC, P-Ω4-3-INVOICE-ATOMIC, P-Ω4-6-CLOSE-RACE, P-Ω3F6-CANCEL-RACE).

## Onda 2 — Financeiro avançado (alto valor de venda; alavanca o Ω4)
5. **Pré-faturamento** — fila de OS pendentes de faturar (candidatas a `POST /invoice`), com filtros e ação em lote.
6. **Margem por OS** — receita × custo × margem por cliente/viatura/filial (usa o Financeiro do tenant + Frota).
7. **Detecção de inconsistências** — títulos/lançamentos incongruentes por severidade (extrato × título × OS).
8. **Conciliação bancária em LOTE** (P-Ω4-5-BATCH) — importar CSV/OFX + matching automático de N lançamentos.
9. **NF-e** (`invoices` real) — **PARADA ESTRUTURAL declarada**: emissão de nota fiscal exige integração fiscal externa
   (certificado, SEFAZ) — fora do v1, requer PD + junta + provavelmente provedor tarifado. Só depois da ativação cloud.

## Onda 3 — Relatórios & Analytics
10. **Relatórios exportáveis** (PDF/planilha) + agendamento — a tela `reports` já é a casca; falta o backend de geração.
11. **Dashboards** executivo/equipe/SLA/produtividade/margem (composição sobre os agregados já existentes).
12. **BI / Data Warehouse** (Enterprise) — pipeline de dados + ferramenta externa.

## Onda 4 — Estoque avançado (Frota)
13. **Estoque por viatura/embarcado** + transferência p/ viatura + consumo do estoque da viatura.
14. **Reposição automática** gerando **ordem de compra REAL** (hoje só sugere; ligar ao módulo purchase-orders).

## Onda 5 — Integrações & Automação (Scale/Enterprise)
15. **Hub de integrações por tenant** — webhooks, APIs externas, logs/retries, financeiro externo.
16. **Push notifications reais** (hoje as notificações são internas) — provedor externo (FCM/APNs).
17. **Despacho inteligente / IA** — sugestão por distância/SLA/custo/habilidade; previsão de demanda; manutenção preditiva;
    recomendação de rota/equipe. Depende de dados históricos + provável serviço de IA tarifado (PD + junta).

## Onda 6 — Governança Enterprise
18. **SSO / federação** (SAML/OIDC), **isolamento premium** (schema ou banco por tenant), **ESG/carbono** (km evitado/emissão),
    telemetria/rastreadores.

## Dívidas transversais (encaixar em qualquer onda)
- **Fidelidade fina** (DIVERGE_MENOR de 17 telas — `docs/frontend-fidelity-audit.md`): rótulos/acentos/cópia. Lote de polish.
- **Mobile**: checklist markers/divergência/ack/anexos em lote; presigned URL + storage protegido; antivírus real; push real;
  remover afordância de cancelar no app (feito no item 1); piloto Android em dispositivo físico.
- **Segurança/infra**: RLS enforçada em runtime dev (app como não-superuser, P-INFRA-RLS); magic-bytes no upload (P-018).
- **Multi-moeda / TZ**: alinhar work-order-financials ao BRL v1 ou câmbio (P-Ω4-3-CURRENCY-BRL); overdue no fuso (P-Ω4-OVERDUE-TZ).
- **RBAC**: `purchase_orders:read`/`reports:read` no catálogo; conceder no seed os `*:read` ao auditor (P-027/P-033).

## Recomendação de sequência
**Onda 1 primeiro** (quick wins + comissões desbloqueadas + hardening) — máximo valor com o backend existente e sem
dependência externa. **Onda 2** (financeiro avançado) é o maior diferencial de venda e alavanca o Ω4. **NF-e, IA, integrações
e push** dependem de decisões de provedor/serviço externo → só após a **ativação cloud** (`docs/go-live-readiness.md`).
Cada onda entra como um programa Ω governado por juntas.
