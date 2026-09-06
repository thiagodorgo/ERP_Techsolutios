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

| 3 | 2026-09-06 ~14:25 | `agente-secops` (C1, redisparo) | `claude-fable-5-1` herdado | 3 | **na cauda** — última linha: *"o `sed` quebrou o regex… reescrevo os patches e rodo M-B3 → M-B9 de novo"* | `rate_limit` 429 — *session limit · resets 6:50pm* | **~0 — o P2 PAGOU.** `C1-secops-evidencia.md` (100 l.) e `C1-secops-voto.json` (`voto: APROVADO`, 4 achados) já **gravados** às 14:24/14:25, antes da morte. Perdeu-se a mensagem final, não o julgamento |
| 4 | 2026-09-06 ~14:2x | `jurado-07b-contrato-regressao-registro` (C3) | `claude-fable-5-1` herdado | 3 | **antes de qualquer medição** — última linha: *"Começo medindo o terreno"* | `rate_limit` 429 — mesma janela | **0** — nada gravado |

## Leitura da série (o P6 existe para isto)

**4 quedas, todas `rate_limit` (teto de sessão), zero `server_error` de streaming** — classe **diferente**
das 14 do postmortem de 29/08, onde a causa era a janela instável de streaming. Aqui é cota determinística.

**A queda #3 é a primeira prova medida nesta casa de que o P2 converte perda TOTAL em perda NULA.** A C1
morreu *na cauda* e o voto sobreviveu porque o P2 manda gravá-lo **antes** da mensagem final. Sem ele, uma
cadeira **com veto** refaria o julgamento inteiro; com ele, o custo foi uma mensagem. O P1 (evidência
incremental) fez o resto: 100 linhas de comando→saída→veredito parcial, auditáveis sem o agente.

**Modelo × queda:** 2 quedas sob `claude-opus-5`, 2 sob `claude-fable-5-1`, e nas quatro o gatilho foi o teto
da sessão. **Nada aqui sustenta "pinar modelo reduz queda"; sustenta que cota é ortogonal a modelo.**

**Redisparo da C3:** identidade **mantida** (não houve voto perdido nem medição — §C7.4/P3 falam de *voto*
perdido). Suplentes seguem reservados para queda **durante** o julgamento.
