# R-Ω3F-3b (ciclo 1) — capacidade #6 (item da tabela) ausente na UI

- **Data:** 2026-07-15 · **Bloco:** Ω3F-3b · **Branch:** `feat-omega3f-3b-financial-tab`
- **HEAD reprovado:** `905728c` · **HEAD corrigido:** (commit desta correção)
- **Quem reprovou:** `fid-avaliador` (VETO de fidelidade) na junta J-OMEGA3F-3B.

## Furo (correto)
A `FinancialTab` entregava o chip de origem **"Tabela"** e o subtítulo "Serviços da tabela de valores
do cliente…", mas **não havia caminho na UI para lançar um item da tabela** — só o item avulso operava.
`createTariffFinancialItem` (front) existia como **código morto** (0 usos). Capacidade **#6** (itens da
tabela + total) ficava funcionalmente inacessível; contradiz o vídeo §1.1 0:24–1:08 e o plano
("'lançar item' — escolhe tarifa do cliente **OU** avulso"). Selo "Tabela" sem produtor = tela que se
auto-desmente (§11).

## Correção (ciclo 1 — sem criar agentes; a correção era clara, orquestrador não estava bloqueado)
1. **Fluxo "Lançar da tabela"** na `FinancialTab`: botão dedicado → painel com **seletor de serviço**
   (carrega o catálogo ativo do cliente via `listServiceCatalogFromApi`) + quantidade + observação →
   chama `createTariffFinancialItem` (POST `source: "tariff"`). O backend resolve a tarifa vigente do
   cliente e **congela** o valor (anti-refaturamento). Erro 422 (sem tarifa vigente) → mensagem clara.
   O botão "Item avulso" continua para o pedágio etc.
2. Teste front atualizado: exige a presença de **"Lançar da tabela"** + "Item avulso" (gating por
   `work_order_financials:create`), travando a regressão da capacidade #6.

## Condição da cognicao-visual (APROVADO_CONDICIONADO) — também resolvida
`OperationalApprovalCard.tsx` era **órfão** (0 usos; substituído pelo `ApprovalPanel` inline no
GeneralInfoTab) e vazava o token técnico `work_orders:update` na copy + strings sem acento. **Removido**
o componente órfão (recomendação da cognicao), eliminando o vazamento na origem.

## Validação pós-correção
Front `check` + `test:smoke` **400/400**; front `build` OK; back suíte **841/835/0-fail/6-skip**;
`git diff --check` limpo. Re-submetido à junta (fid-avaliador + cognicao-visual re-votam).
