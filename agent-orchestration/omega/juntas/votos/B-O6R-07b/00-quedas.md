# Quedas — junta do B-O6R-07b (P6, `D-JUNTA-RESILIENTE`)

Uma linha por queda. Colunas fixas do §C7.7.

| # | quando (local) | agente | modelo (pin/herdado) | mandato (nº itens) | fase da morte | erro | custo do redo |
|---|---|---|---|---|---|---|---|
| 1 | 2026-09-06 ~12:xx | `agente-secops` (C1) | `claude-opus-5` herdado da sessão | 3 | **antes de qualquer medição** — última linha: "Let me read the core security files" | `rate_limit` HTTP 429 — *You've hit your session limit · resets 1:40pm* | **0** — nenhuma evidência gravada, nenhum voto-esqueleto, nenhum worktree/container/porta deixado |
| 2 | 2026-09-06 ~12:xx | `jurado-07b-contrato-mobile-b108` (C2) | `claude-opus-5` herdado da sessão | 3 | **antes de qualquer medição** — última linha: "Vou começar lendo o briefing" | `rate_limit` HTTP 429 — mesmo limite, mesma janela | **0** — idem |

## Gatilho do P5 e a decisão de redisparar

**P5 disparou:** 2 quedas em < 30 min. A regra manda pausa de ~15 min *antes de qualquer redisparo*,
registrada aqui. **Causa medida:** as duas quedas são o **mesmo evento** — teto de sessão (429
`session limit`), não `server_error` de streaming como as 14 do postmortem de 29/08. O teto foi
**resetado pelo dono** ("limites resetados") e a sessão mudou de modelo para `claude-fable-5-1` a
seguir. **Decisão do orquestrador:** a janela instável que o P5 protege não existe aqui — a causa é
determinística e foi removida —, então o redisparo segue **sem a pausa**, e esta linha é o registro
exigido. Se a série mostrar que estou errado (nova queda na mesma classe em < 30 min), aplico a pausa.

## Redisparo

- C1 e C2 redisparadas em paralelo (≤ 2, P5) com **os mesmos corpos** — não há voto perdido, não há
  identidade queimada (§C7.4/P3 falam de *voto* perdido; aqui não houve medição). Suplentes seguem
  reservados para queda **durante** o julgamento.
- Modelo dos redisparos: **herdado da sessão = `claude-fable-5-1`** (fica registrado para a série
  "pin × queda", que o P6 existe para alimentar).
- Ordem de disparo: C1 + C2 agora; **C3 só quando uma concluir** (P5).
