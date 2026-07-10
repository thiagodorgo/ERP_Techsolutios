# J-005 — Divisão de Ω1b em Ω1b-1 (pins) e Ω1b-2 (geocodificação)

**Tema:** entregar Ω1b (chamados no mapa + geocodificação) em uma PR ou dividir?

**Junta (≥3):** planejador-mestre · critico-adversarial · estrategista

**Contexto:** o recon mostrou que `work_orders` já tem `service_latitude/longitude` e que o pipeline de
coordenadas existe ponta a ponta — falta só a lista (`toWorkOrderListDto`) emitir a coord e o mapa desenhar
os pins. Já a geocodificação (Nominatim) traz risco real levantado pelo critico-adversarial: hang do `fetch`
sem timeout travando a fila (A3), geocoding no caminho crítico do `create` (A4), 404 em RETURNING vazio (A10),
proibição de bulk/prod no Nominatim público (A11) — cada um exige guarda dedicada + migration de metadados.

| Agente | Voto | Justificativa |
|---|---|---|
| planejador-mestre | DIVIDIR | Pins não precisam de migration nem de rede — fatia frontend + DTO minúsculo, baixo risco, alto valor visual. Geocodificação é backend com migration e cliente HTTP: merece PR e gate próprios. |
| critico-adversarial | DIVIDIR | Meus blockers A1/A2 pertencem aos PINS (entram em Ω1b-1). A3/A4/A10/A11 pertencem à GEOCODIFICAÇÃO — não misturar risco de rede com o render. Aprovo desde que Ω1b-2 seja declarado, não silenciado. |
| estrategista | DIVIDIR | Ω1b-1 destrava a demonstração já (OS-0001 tem coord). Ω1b-2 entra logo depois com o serviço gated OFF por default (CI-safe). |

**Veredito:** **APROVADO 3/3 — DIVIDIR.** Ω1b-1 = esta PR (pins, sem migration/Nominatim). Ω1b-2 = próxima
(migration de metadados + Nominatim dev gated OFF + endpoint + botão). Requisitos R1/R2/R5/R6/R7/R8 em Ω1b-1;
R3/R4/R9/R10/R11/R12/R13 em Ω1b-2. Pendência registrada em `T-002` §Pendência e `docs/omega-pd.md`.
