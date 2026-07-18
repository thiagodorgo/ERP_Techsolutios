# Junta J-Ω4-8b — Dashboard financeiro real (front consome /financial-summary)

**Bloco:** Ω4-8b · **PR:** #224 · **Branch:** feat-omega4-8b-dashboard · **Data:** 2026-07-18 · **CI:** 4/4 verde.

## Vereditos (2 vetos — mudança de UI)

| Agente | Veredito | Resumo |
|---|---|---|
| **cognicao-visual** (fidelidade §11) | **APROVADO_CONDICIONADO → APROVADO** | Reproduz fielmente financeiro.png: grid 4 KPIs com cores semânticas corretas, gráfico entradas×saídas, tabela de recentes com chip coerente. PT-BR/acentuação ok, SEM andaime de dev, id nunca renderizado. Estados loading/fallback/vazio honestos (D-007). |
| **wiring-acessos** (dados/acesso) | **APROVADO_CONDICIONADO → APROVADO** | D-007 honrado (mock/catch → zerado com source/fallbackReason); adapter lê {data} defensivo snake+camel; hook igual ao irmão; a página NUNCA soma no cliente (chartMax é escala, percent é razão de agregados prontos); não renderiza UUID; sem divisão por zero. |

**Resultado após correção: 2/2 APROVADO.**

## Condições e tratamento
- **MÉDIA (convergente, os dois vetos) — CORRIGIDA antes do merge:** o adapter não normalizava status/direction
  dos recentTitles; a página fazia `getTitleStatusTone(status as FinancialTitleStatus)` (lookup SEM fallback) → um
  status fora dos 6 valores numa linha não-vencida retornaria `tone=undefined` e `tone.bg` quebraria o render.
  **Fix:** normalização no adapter (whitelist do enum, fallback seguro "open"/"receivable") — fonte única. +teste.
- **MÉDIA (fidelidade) — registrada P-Ω4-8-DASHBOARD-FIDELITY:** tabela perdeu a coluna DOCUMENTO (o DTO não expõe
  documento) e o header expõe só "Atualizar" (não há fluxo de criação de lançamento). Reduções HONESTAS de escopo
  (não fabricam dado); follow-up registrado.
- **BAIXA:** re-etiquetagem de KPI ("aberto" em vez de "30d" etc.) é MAIS honesta aos agregados reais (D-007), mantida;
  inadimplência% nunca passa de 100% (o backend garante vencido ⊆ aberto); loading indefinido sem org ativa é idêntico
  ao irmão useFinancialTitles (cosmético).

Re-validado: frontend check verde; adapter 4→5; test:smoke inclui o teste.

## Merge
2/2 APROVADO (condição MÉDIA endereçada) + CI verde = merge autorizado (§C7). Fecha o **Ω4 Financeiro (8/8 agregados)**.
