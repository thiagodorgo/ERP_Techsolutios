# J-OMEGA3A — Ata da junta Ω3-a (ServiceQuote / Orçamento com congelamento de preço)

## Composição (5 agentes com poder de veto) + login real :3000
| Agente | Ciclo 1 | Ciclo 2 (protocolo v3) |
|---|---|---|
| master-teste-telas-rotas | **APROVADO** (41/41 back + 31/31 front rodados; 11 cadastros intactos; sem coluna morta) | — |
| inspetor-de-rotas | **APROVADO** (5 endpoints 403-sem-auth/404-inexistente vivos; contrato body/query alinhado) + report finance-menu | — |
| validador-mestre | **APROVADO** condicionado (achado MÉDIA: quantity sem teto) | achado **corrigido** |
| cognicao-visual | **REPROVADO** (coluna Serviço/OS = UUID cru; busca só casa UUID) | **APROVADO** (14/14 smoke) |
| coordenador-de-acessos | **REPROVADO** (V1 inventory vê item sem permissão; V2 finance não vê; V3 matrizes) | **APROVADO** (V1/V2/V3 vivos) |

**Veredito final: 5/5 APROVADO** (ciclo 2). Reprovação registrada em `reprovacoes/R-omega3a-1.md`.

## Correções do ciclo 1 → 2
1. **quantity overflow (validador):** `assertMoneyInRange(quantity)` no create e no PATCH → 422 (paridade
   InMemory×Prisma; antes 1e11 daria 500 no Postgres). +2 testes de regressão.
2. **rótulos humanos (cognicao — B1):** `useServiceQuoteReferences` resolve nome do serviço/cliente e
   código da OS; colunas mostram NOME (UUID no title), busca casa os rótulos, modal virou selects. +
   coluna Cliente. +2 testes.
3. **visibilidade governada (coordenador):** V1 `/operations/quotes` no `navigation.registry.ts`
   (governado → escondido de inventory/support, provado vivo); V2 "Orçamentos" no OPERAÇÃO do finance;
   V3 linha em `docs/navigation-matrix.md` + bullet em `RBAC_MATRIX.md` (divergência ZERO na matriz viva).

## Evidência de invariante (anti-refaturamento) — HTTP vivo
`POST /service-quotes {service}` → 201 congela 175.55 (frozenTotal 351.1, BRL, sourceTariffId). Mudei a
Tarifa fonte para 999 → `GET /service-quotes/:id` = **175.55** (o congelamento não relê a Tarifa).

## Bateria final (verde)
- Backend `check`/`build` verde · service-quotes **29/29** + routes **14/14** + core-saas 26 + tariffs 19 +
  price-tables 11 = **99/99** no conjunto tocado. Migration up/down/re-up OK (RLS+FK+índice parcial).
- Frontend `check`/`build` verde · `test:smoke` **362/362**.
- Live: 201/400/409/422(x2)/403 + congelamento + governança de menu (inventory oculto, finance visível).

## Cota de teste
Back: **43 novos** (29 unit + 14 rota) ≥ meta 40. Front: **14 novos** smoke. Total ciclo: 57 novos.

## Pendências (não-veto) — `controle/pendencias.md` P-Ω3a
- Aditivo `quotes[]` no detalhe da OS → Ω3-e.
- Degradação graciosa: finance tem quotes:read sem service_catalog:read/customers:read → colunas caem no
  fallback shortRef (decidir conceder as leituras a finance ou aceitar).
