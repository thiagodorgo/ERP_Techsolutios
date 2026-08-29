# Registro de quedas — junta SAN2-1R (formato P6)

| # | agente | modelo | mandato | fase da morte | erro | custo do redo |
|---|---|---|---|---|---|---|
| 1 | inspetor de terreno (1ª) | pin `fable` | 3 itens | após medir o item 1, **ANTES de apensar a evidência** — arquivo vazio | connection lost | item 1 remedido do zero (barato); **perda total do medido, por não-conformidade com o P1** |

> **Lição para a série, a primeira contra o próprio protocolo:** o P1 diz "após CADA item, apense" — e o
> caído mediu primeiro, morreu no intervalo, e o arquivo ficou **vazio**. A evidência que não foi escrita
> não existe. O mandato do sucessor (e os templates futuros) passam a dizer: **"escreva a entrada do item N
> ANTES de iniciar o item N+1 — medir sem escrever é não ter medido"**. A queda custou pouco (item 1 é
> barato), mas a mesma não-conformidade num jurado de 3 itens caros custaria o mandato inteiro de novo.
| 2 | inspetor de terreno (sucessor) | pin `fable` | 3 itens | **largada — nenhuma mensagem, nada escrito** | connection lost | itens 1–3 seguem por medir. Classe "mensagem 1" do postmortem: independe de conduta |

> **P5 DISPARADO (2026-08-29 ~19:4x):** duas quedas em <30 min (19:40 e ~19:44) → **pausa de ~15 min**
> antes de qualquer redisparo, conforme o protocolo. Primeira aplicação real da regra de janela instável.
| 3 | inspetor de terreno (3ª, pós-pausa P5) | pin `fable` | 3 itens | entre medir o item 1 e escrever — arquivo vazio de novo | connection lost | itens 1–3 por medir |

> **NOTA CONTRATUAL — exceção de indisponibilidade de modelo invocada (2026-08-29 ~20:0x).** A série P6 do
> dia, sob o protocolo: **pinados em `fable` = 5 quedas em 7 corridas** (inspetor SAN2-R, porteiro #361,
> inspetor SAN2-1R ×3); **`general-purpose` herdando `fable-5[1m]` da sessão = 0 quedas em 4**. O pin
> `model: fable` resolve para endpoint distinto do da sessão, e é ele o instável hoje. O contrato
> (`D-PLANEJADOR-MODELO-FABLE`, aplicável por analogia aos papéis pinados) prevê: *"a única exceção é
> indisponibilidade do modelo, que vira nota no registro da junta"* — três quedas consecutivas no mesmo gate
> É indisponibilidade na prática. **A 4ª tentativa roda o mandato do inspetor em `general-purpose`
> (herdando `fable-5[1m]`), com esta nota como registro.** Sobre o P5: a pausa das 19:45–20:00 **zera o
> contador** — desde ela houve 1 queda, não 2, então o redisparo imediato respeita a letra da regra.
> Esta observação também **atualiza a hipótese F5**: não é "fable × herdado" — é **endpoint pinado ×
> endpoint da sessão**, e a série continua decidindo.
| 4 | jurado KPI/registro | gp (endpoint da sessão) | 3 itens | após medir a bateria do item 1, antes de escrever — **de novo o vão medir→escrever** | connection lost | item 1 remedido (bateria é barata, ~6 s); itens 2–3 do zero. Primeira queda do endpoint da sessão sob o protocolo (série: 6 conclusões / 1 queda) — o discriminador de endpoint segue válido, mas não é imunidade |
