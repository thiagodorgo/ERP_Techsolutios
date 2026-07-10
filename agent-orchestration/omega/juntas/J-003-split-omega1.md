# J-003 — Divisão de Ω1 em Ω1a (mapa dos operadores) e Ω1b (pins de chamado geocodificados)

**Tema:** entregar o Mapa Operacional em uma PR só ou dividir?

**Junta (≥3):** planejador-mestre · estrategista · critico-adversarial

**Contexto:** os operadores em campo já têm `latitude/longitude` reais (`FieldLocationItem`), então o mapa dos
operadores sai 100% no frontend. Já os pins de **chamado (OS)** exigem coordenada — as OS guardam endereço textual,
não lat/lng — logo dependem de **migration aditiva em `work_orders`** + geocodificação (Nominatim dev, PD-002).

| Agente | Voto | Justificativa |
|---|---|---|
| planejador-mestre | DIVIDIR | Migration toca `prisma/**` (gate up/down próprio) e é risco independente do render do mapa. Misturar atrasa a PRIORIDADE ZERO. |
| estrategista | DIVIDIR | Ω1a é o caminho crítico (tela de venda) e sai imediatamente; Ω1b entra logo depois sem bloquear a demonstração. |
| critico-adversarial | DIVIDIR c/ trava | Aceito desde que a pendência Ω1b seja **declarada em 3 lugares** (task-history, lista, omega-pd) — nunca silenciada — e que Ω1a não finja ter pins de chamado. |

**Veredito:** **APROVADO 3/3 — DIVIDIR.** Ω1a = esta PR (mapa real dos operadores). Ω1b = próxima PR (migration
`work_orders` lat/lng/geocoded_at/geocode_source + Nominatim dev + painel "Sem localização"). Trava do crítico
cumprida: pendência registrada em `T-001` §Pendência, `lista-execucao.md` e `docs/omega-pd.md#PD-002`.
