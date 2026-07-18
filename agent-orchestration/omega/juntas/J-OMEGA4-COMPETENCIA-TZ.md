# Junta J-Ω4-COMPETENCIA-TZ — PRÉ-Ω4-6 · Fix de competência no fuso de negócio

- **Data:** 2026-07-18 · **Branch:** `fix-omega4-competencia-tz` · **Orquestração:** WORKFLOW (wf_ff6600b6-cae)
- **Fluxo:** Implementar → Verificar (validador + critico em paralelo). Money-crítico (alimenta a trava do Ω4-6). SEM migration.

## Escopo
Resolve **P-Ω4-COMPETENCIA-TZ**: `deriveCompetencia` usava `getUTCMonth` → título/lançamento de fim de mês em horário BR
caía no mês errado (alimenta a trava retroativa e o relatório). Novo `src/config/business-time.ts` (compartilhado):
- `deriveCompetencia` formata em **America/Sao_Paulo** (Intl, IANA — acompanha DST se voltar).
- `parseBusinessDate` (usado por parseIssueDate + parseOccurredAt): date-only → meia-noite BR-local; datetime sem
  offset → BR-local; com Z/offset → como está; **round-trip rejeita dia fora de range** (caso d).

## Votos (verify paralelo, saída estruturada)
| Agente | Veredito |
|---|---|
| validador-mestre | **APROVADO_CONDICIONADO** — fix correto e completo; 3 fronteiras confirmadas em execução independente (31/07 23h BRT→2026-07; instante julho-UTC que é junho BR→2026-06; date-only 2026-07-01→2026-07); helper único; determinístico (Intl com timeZone); 118+16 testes verdes; nenhum teste existente dependia do bug. Sem VETO/ALTA. BAIXA: fechar a pendência + manter o irmão isTitleOverdue rastreado → **cumprido**. |
| critico-adversarial | **APROVADO_CONDICIONADO** — núcleo DST-robusto (offset de verão -02:00 < -03:00 → âncora sempre no MESMO dia civil BR mesmo se DST voltar). **ALTA (caso d):** date-only com dia fora de range (2026-06-31, 2026-02-30, 2026-02-29 não-bissexto) passava no regex, virava Date NÃO-NaN e ROLAVA silenciosamente p/ o mês seguinte → misclassificava a competência (furava/bloqueava errado o chokepoint) → **CORRIGIDO** (round-trip da data civil BR → 400). MÉDIA (caso e): datetime sem offset = fuso do servidor → **CORRIGIDO** (BR-local). BAIXA (caso h): parseDueDate desalinhado + isTitleOverdue ~27h cedo → **registrado** P-Ω4-OVERDUE-TZ. |

## Resultado
**APROVADO (verify 2/2), nenhum REPROVADO.** Condição ALTA do critico (caso d — rolagem de mês silenciosa) e MÉDIA
(caso e) **cumpridas no branch**; testes adicionados (dia fora de range→400; datetime sem offset BR-local). P-Ω4-COMPETENCIA-TZ
marcado RESOLVIDO; P-Ω4-OVERDUE-TZ (irmão: isTitleOverdue fim-do-dia BR + parseDueDate consistência) segue aberto (BAIXA).

## Cota de teste
+8 (financial-titles + financial-entries): 3 fronteiras de deriveCompetencia, date-only não-cruza-o-dia, fim-a-fim via
service.create, **dia fora de range→400**, datetime sem offset BR-local. Suíte 1163→1171.

## Rastreabilidade
Pré-requisito do **Ω4-6 Fechamento** cumprido (competência agora classifica corretamente no fuso de negócio → a trava
retroativa opera no mês certo). Próximo: Ω4-6 (honrar D-Ω4-5-RECONCILE-META + P-Ω4-6-READINESS M1/M2). D-Ω4-KPI-RELATORIO.
