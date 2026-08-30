# Quedas do bloco SAN2-2 (registro P6)

| # | agente | modelo | mandato | fase da morte | erro | custo do redo |
|---|---|---|---|---|---|---|
| 1 | `planejador-mestre` (plano) | Fable (contrato) | 8 seções | meio — §6 | connection lost | §1–§5 preservados (191 linhas) |
| 2 | `planejador-mestre` (sucessor) | Fable (contrato) | 3 seções | meio — §8 | connection lost | §6–§7 preservados (356 linhas) |
| 3 | `dev-san2-2` (Fase 1) | herdado da sessão | 4 itens | meio — provando que o teste morde | connection lost | conserto + 12 casos preservados; **script restaurado antes de cair** |
| 4 | `dev-san2-2` (sucessor) | herdado da sessão | 4 itens | meio — "causa identificada, escrevendo o Passo 4" | response stopped | **Passo 4 perdido** — a causa que ele identificou morreu com ele |

**Total do dia: 11 quedas** (7 no gate do #362 + 4 aqui).

**A queda 4 é a segunda do dia com perda real de conteúdo, e pela MESMA forma da queda 6 do gate:** o agente
**identificou** algo ("cause identified") e morreu **na transição para escrever**. O P1 exige escrita após
cada passo, mas o vão entre *descobrir* e *registrar* continua sendo o ponto de perda — e é irredutível por
regra: nenhuma cláusula faz o agente escrever antes de saber o que escrever.

**O que isso ensina, e não é o que parecia.** A lição de 29/08 dizia "medir sem escrever é não ter medido" —
verdadeira, mas incompleta. O padrão real destas 11 quedas é mais estreito: **morre-se na fronteira entre
formar a conclusão e persisti-la**. Mandato curto não elimina essa fronteira; só a torna mais frequente e
mais barata. A mitigação que sobrou é granularidade: quanto menor o passo, menor o que se perde na
fronteira — foi o que transformou 320 → 460 → 70 linhas salvas nas outras cadeiras.

**Fatiamento aplicado após esta queda:** o restante da Fase 1 (passo do CI · Drill A · Drill B) vai em
mandatos de **um item cada**, em vez de um mandato de quatro. O passo do CI é edição mecânica de 2 linhas;
os drills exigem worktree descartável. Não há razão para expor os três ao mesmo stream.

| 5 | `dev-san2-2` (passo do CI) | herdado da sessão | **1 item** (edição de 2 linhas) | **mensagem 1** | response stopped | zero (nada havia começado) |

**A queda 5 fecha a discussão sobre tamanho de mandato.** Mandato de **um item**, edição mecânica de duas
linhas, morte **antes de ler o primeiro arquivo**. É a quinta morte na mensagem 1 registrada nas duas séries
(as outras quatro estão no `POSTMORTEM-QUEDAS-2026-08-29.md`) e confirma o **F2** do postmortem: a falha é
**por request**, não por carga. Mandato curto continua sendo a prática certa — mas pelo motivo que o F2
nomeia (reduz exposição e barateia a perda), **não** porque mandato grande cause a queda.

**Consequência prática:** não há mais fatiamento a fazer. Um item já é o piso. O que resta contra a janela
ruim é a **pausa do P5** (F6: as quedas agrupam no tempo) — aplicada aqui em dose maior por serem três
quedas em sequência curta.

**Fronteira que o orquestrador NÃO atravessou, declarada:** seria trivial eu mesmo aplicar as duas linhas do
`ci.yml`. Não o fiz. O §2.4 do plano me registra como quem **confirmou o item 1 por execução**, e o passo do
CI é parte da correção do item 1 (§3.1c) — escrevê-lo me tornaria achador e corretor do mesmo item, que é
exatamente o que o §C7.4-bis proíbe e o que contaminou o ciclo do painel de KPI. A junta julga o diff; um
hunk assinado por quem confirmou o defeito envenena o voto. Espera-se a janela em vez de furar a regra.
