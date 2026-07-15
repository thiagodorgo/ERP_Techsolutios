# Junta J-OMEGA3F-4C — Ω3F-4c · Front do Orçamento (fecha Ω3F-4)

- **Data:** 2026-07-15 · **Bloco:** Ω3F-4c · **Branch:** `feat-omega3f-4c-quote-front` · **HEAD:** `7a09d77` (+ polimento)
- **Baseline:** front `check` + `test:smoke` **405/405**; back `CORE_SAAS_PERSISTENCE=memory ... $(ls tests/*.test.ts)` **893/887/0/6**

## Escopo
Aba **Orçamento** no Hub (QuoteTab, espelho do FinancialTab): flip C2 `orcamento` visible + requiredPermission service_quotes:read; lista os orçamentos DA OS com número/situação/validade/total (do backend) + linhas; Aprovar (draft+service_quotes:approve→cria OS, link «abrir OS») e Compartilhar (:update→link copiável). OrcamentosPage: Aprovar→endpoint real approve; Compartilhar. Rename front `ServiceQuoteItem`→`ServiceQuoteRow`. B1: list DTO backend passou a emitir number/issuedAt/validUntil/createdWorkOrderId.

## Votos
| Agente | Veredito |
|---|---|
| coordenador-de-acessos (veto) | **APROVADO** — cadeia de acesso íntegra (aba governada service_quotes:read; Aprovar só draft+approve; Compartilhar só :update; backend é autoridade; sem órfão). |
| fid-avaliador (veto) | **APROVADO_CONDICIONADO** — #7/#8 fiéis, total do backend, C2 ok. Condição não-bloqueante C-Ω3F-4C-1: approve sem diálogo de modo de acionamento → **P-Ω3F4C-ACTIVATION-PROMPT** (follow-up). |
| cognicao-visual (veto) | **APROVADO_CONDICIONADO** — tela viva, §11 ok. 2 condições não-bloqueantes: título caía em UUID-curto + UUID no hover; copiar sem feedback. **AMBAS CORRIGIDAS** (título neutro "Orçamento sem número", sem hover de UUID; "Copiado!"). |

## Resultado
**APROVADO por maioria (3/3 favoráveis).** Condições de cognicao corrigidas no PR; condição do fid registrada como follow-up (P-Ω3F4C-ACTIVATION-PROMPT). **Ω3F-4 (Orçamento) COMPLETO** (4a #189 + 4b #190 + 4c este PR).

## KPI
D-Ω3F-KPI-RELATORIO: não toca Kpis/*.

## Rastreabilidade
- Próximo: **Ω3F-5** (Comentários + Arquivos na OS; TagAssignment polimórfico D2).
