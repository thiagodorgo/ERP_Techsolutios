# ESTUDO Ω6R — Revisão Total

## Sumário executivo

**Veredito: REPROVADO PARA PRODUÇÃO (5×0).** A auditoria confirmou 29 defeitos acionáveis: 15 P0 e 14 P1. Os bloqueadores não são cosméticos: administrador de organização promove-se a administrador global; troca de organização confia em e-mail; pagamentos, estornos, cheques, despesas, fechamento e estoque rompem atomicidade; custos AWS são truncados; workers financeiros/legais estão desligados nos manifests; mobile expõe fluxos de sync incompatíveis ou não autenticados.

O padrão causal predominante é fronteira transacional curta demais: cada repositório abre sua própria transação RLS, mas comandos de negócio atravessam módulos. O barramento não é Outbox genérico, a fila Redis perde job depois do `LPOP`, e os testes financeiros usam Memory, mascarando as corridas Prisma. A correção recomendada começa por identidade/autoridade, unidade de trabalho financeira, locks de inventário/fechamento, workers e contratos mobile. Nenhuma contratação externa é necessária.

KPIs: 70/70 unidades e 8/8 transversais concluídas; 403 endpoints classificados quanto a authn/publicidade; 30/30 achados consistentes entre Markdown, JSONL e relatórios. Detalhes em `KPI_O6R.md`.

**Reconciliação pós-merge (2026-08-14), sobre `origin/main` `e80430a`.** Três correções na própria auditoria,
porque ela afirmava o que não sustentava: (1) a matriz marcava `jurisdiction` ✅ nas cinco lentes sem relatório
e sem nenhum achado citando o módulo — ele foi então revisado de fato, o relatório existe e a revisão levantou
**`Ω6R-DAT-004`** (P1: editar o perfil normativo re-tempera custódias em curso e a auditoria não registra o que
mudou), elevando o total para **30 (15 P0 + 15 P1)**; o achado **não** passou pela votação da J-6R, que
deliberou sobre 29. (2) A baseline declarada no inventário era um hash pré-squash inalcançável da `main` —
substituída pelo commit alcançável de mesma árvore. (3) `Ω6R-QUA-004` está **parcialmente superado**: o PR #351
corrigiu o componente *timeline*; detalhe, status e assign seguem abertos, e o achado permanece ativo. Nada
disso altera o veredito da `ATA_J6R.md`, que fica intacta como registro do que a junta votou.

## Top 10 riscos

1. Ω6R-SEC-001 — escalada tenant→plataforma.
2. Ω6R-TEN-001 — tomada de conta homônima cross-tenant.
3. Ω6R-DIN-001 — pagamento duplica lançamento/saldo.
4. Ω6R-DIN-002 — estorno deixa título pago.
5. Ω6R-DIN-003 — cheque deixa dinheiro órfão.
6. Ω6R-DIN-008 — writer atravessa fechamento.
7. Ω6R-DIN-009 — despesa duplica efeito antes do receipt.
8. Ω6R-DAT-002/003 — estoque negativo e contagem duplicada/parcial.
9. Ω6R-DIN-006 — workers financeiros/legais desligados.
10. Ω6R-DAT-001 — produção pode aceitar persistência volátil.

## Mapa de calor

| Área | P0 | P1 | Estado |
|---|---:|---:|---|
| Financeiro/custos | 9 | 1 | crítico |
| Identidade/RBAC/tenancy | 4 | 1 | crítico |
| Estoque | 2 | 1 | crítico |
| Infra/jobs/realtime | 1 | 6 | alto |
| Mobile/contratos | 0 | 5 | alto |
| Upload/portal | 0 | 2 | alto |
| Custódia/regulatório | 0 | 1 | alto |

A linha "Custódia/regulatório" (`Ω6R-DAT-004`) entrou na reconciliação pós-merge; as demais são o mapa que a
J-6R votou.

## Consolidação por categoria

- SEC/TEN: Ω6R-SEC-001..004, Ω6R-TEN-001.
- DIN/DAT: Ω6R-DIN-001..009, Ω6R-DAT-001..004.
- ARQ/PERF: Ω6R-ARQ-001..004, Ω6R-PERF-001..003.
- QUA: Ω6R-QUA-001..005.

Os 30 blocos completos, com evidência ≤10 linhas, impacto, correção e teste, permanecem em `REGISTRO_ACHADOS_O6R.md`. Hipóteses abaixo de 0,6 não foram promovidas. Dívidas observadas: dispatcher/Inbox ausente, lint sem ESLint e dependências sem exploit produtivo confirmado.
