# Evidência da cadeira FORENSE — junta SAN2-R (2026-08-29)

Identidade nova: `jurado-forense-san2r-c1-2026-08-29` · head julgado: `48dc863` · ciclo 1 de 2.

## Item 1 — Consistência interna do postmortem (tabela × 6 fatos)

**Comandos executados** (sobre `omega/POSTMORTEM-QUEDAS-2026-08-29.md`):

```
$ grep -cE '^\| [0-9]+ \|' POSTMORTEM  → 14 linhas de queda (total bate)
$ grep 'mensagem 1' nas linhas de queda → 4 linhas, exatamente #3, #4, #7, #12  (F2 confere)
$ grep 'pin `fable`' → 1 linha, exatamente #8  (F5: "1 em 5" — a única queda pinada)
$ grep 'herdado'     → 13 linhas  (F5: "~13 em 23" — e 1+13=14 fecha com o total)
$ linhas #8/#10/#13  → "fase de limpeza — inspeção pronta" · "indo escrever o voto" ·
                       "logo após ACHAR um defeito real"  (F3: as três marcadas como morte no fim)
$ linhas #1/#5/#6/#7 → Explore ×3 + Plan ×1  (F1: agentes que não leem arquivo de junta)
```

**Aritmética conferida:** 14/28 = 50% (taxa declarada "~50%") · 1/5 = 20% · 13/23 = 56,5% ≈ "~57%" ·
14 mortes + 14 sobreviventes = 28 = 5 pinados + 23 herdados. Tudo fecha.

**Resultado:** os 6 fatos são sustentados pela tabela. F2: exatamente 4 mortes na mensagem 1, as citadas.
F3: #8/#10/#13 marcadas no fim, como citado. F5: exatamente 1 pin `fable` (#8) e 13 herdadas; 1+13=14.
F5 corretamente declarado como HIPÓTESE (n pequeno) — nota: os denominadores 5/23 não são itemizáveis
pela tabela (só as mortes são listadas; sobreviventes ficam em agregado), o que reforça a necessidade do
P6 e impede que F5 vire conclusão — o texto respeita isso.

**Veredito parcial: VERDE.** Nenhuma inconsistência interna; um ponto de atenção menor (denominadores de
F5 em agregado) já tratado pelo próprio texto como hipótese.

## Item 2 — O protocolo responde fato a fato (P1–P6 × F1–F6)

**Conferido:** leitura integral de `juntas/PROTOCOLO-JUNTA-RESILIENTE.md` contra a tabela §4 do postmortem.

| F | P alegado | O P ataca o F? |
|---|---|---|
| F3 (morte no fim perde tudo) | P1 + P2 | SIM — P1 persiste por item (morte custa só a cauda); P2 grava o voto/parecer ANTES da mensagem final |
| F4 (R2 amplifica custo) | P3 | SIM — emenda cirúrgica: mantém "nada conta sem re-execução própria" e distingue medição registrada (roteiro barato) de afirmação herdada (proibida) — exatamente a distinção que F4 nomeia |
| F2 (exposição × taxa, não mandato) | P4 | SIM — ≤3 itens reduz exposição E custo por perda; o "por quê" do P4 repete a correção da errata (mandato longo não mata) |
| F6 (janelas ruins agrupam) | P5 | SIM — máx 2 em paralelo + pausa de 15 min após 2 quedas em 30 min ataca os dois multiplicadores nomeados por F6 (streams expostos + redisparo imediato) |
| F5 (hipótese de modelo) | P6 | SIM — série padronizada de quedas com coluna modelo (pin/herdado) é o único desenho que resolve a hipótese sem pinar por palpite |
| F1 (não há bug de orquestração) | — | Coerente: F1 é achado negativo; justifica o protocolo ser de RESILIÊNCIA e não de caça a bug. Ausência de P para F1 é correta |

**P órfão?** Nenhum — P1–P6 mapeiam todos em F2–F6; nenhum P sem F que o justifique.

**Imprecisão achada (não muda a norma):** o "por quê" do P2 diz que as quedas "#8, #10, #13" morreram
"streamando o voto" e "teriam custado zero" sob P2. #8 morreu na FASE DE LIMPEZA com a inspeção pronta —
não streamando parecer; sob o desenho (limpeza antes da mensagem final), quem zeraria a perda de #8 é
P1+P3 (evidência persistida + re-execução barata), não P2 sozinho. O próprio postmortem (F3) descreve #8
com precisão; a imprecisão é só do "por quê" do P2. Gravidade baixa: a prescrição normativa de P2 fica
correta e necessária de qualquer jeito.

**Veredito parcial: VERDE** — resposta fato a fato completa, sem F órfão e sem P sem justificativa; 1
imprecisão de retórica no "por quê" do P2 (achado FOR-2, baixa).

## Item 3 — A prova viva (queda #1 da SAN2-R sob o protocolo)

**Comandos executados (re-verificação própria, não herança):**

```
$ git rev-parse --short HEAD → 48dc863 (bate com o mandato)
$ git log --oneline 74430cc..48dc863 → 5 commits, cadeia linear:
    9fd6ac6 → f8e84de → edafadf → 4b547e3 → 48dc863
$ git diff 74430cc..edafadf --name-status → os MESMOS 9 arquivos registrados pelo caído (byte a byte)
$ git diff 74430cc..48dc863 --stat -- src prisma tests scripts frontend mobile .github package-lock.json
    → VAZIO (escopo "zero código de produto" vale até o head atual)
$ cat votos/SAN2-R/00-quedas.md · 00a-inspetor-evidencia.md · 00a-inspetor-parecer.md
```

**A história bate com os arquivos:**
- P1 exercido pelo caído: `00a-inspetor-evidencia.md` tem os 3 itens, cada um com comando → saída →
  veredito parcial, ANTES da morte (que veio na fase de escrever o parecer — mesma classe da queda #8
  do postmortem). Inclui o achado real (Kpis/index.html ausente do diff) e a divergência de head já
  medida — exatamente o que `00-quedas.md` narra.
- P3 exercido pelo sucessor: seção "Re-execução pelo sucessor" apensada ao MESMO arquivo; 9/9 comandos
  re-executados e comparados; drift de head (edafadf→4b547e3) fechado com 4 medições NOVAS; nada herdado
  sem comando. Parecer (`00a-inspetor-parecer.md`) emitido pelo sucessor com tabela registrado × re-executado
  e ressalvas R1–R3 — coerente com a evidência.
- P6 exercido pelo orquestrador: `00-quedas.md` no formato de colunas do protocolo; a queda registra
  modelo "pin fable" — ponto de dado que ALIMENTA a hipótese F5 na direção contrária ao palpite (pin não
  imuniza), exatamente o que a série existe para decidir. O registro não esconde isso.

**Discrepância achada (FOR-1):** `00-quedas.md` declara custo do redo "re-executar 6 comandos do roteiro";
o roteiro persistido tem 9 comandos e o sucessor reporta "9/9 CONFIRMADOS". O registro P6 subestima o
roteiro em 3 comandos. Gravidade baixa: erro de estimativa numa nota de custo; evidência e parecer (os
registros com autoridade) estão corretos entre si; a conclusão ("~minutos contra mandato inteiro") não muda.

**A primeira medição sustenta ou desmente o protocolo?** SUSTENTA. Morte na mesma classe da mais cara do
postmortem (#8) custou re-execução de 9 comandos + composição do parecer, contra mandato inteiro refeito
no regime antigo. P1 e P3 pagaram o próprio custo na primeira utilização; P6 já capturou o primeiro ponto
da série de F5 — inclusive um ponto desfavorável à hipótese, registrado sem maquiagem.

**Veredito parcial: VERDE** com 1 achado baixo (FOR-1, contagem 6×9 no registro de quedas).
