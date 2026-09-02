# Registro de quedas — junta SAN2-6 (formato P6)

| # | agente | modelo | mandato | fase da morte | erro | custo do redo |
|---|---|---|---|---|---|---|
| 1 | C3 — `conferente-do-kpi-e-das-dividas` | gp (endpoint da sessão, `claude-opus-5`) | 3 itens | **transição C3-1 → C3-2**, com o C3-1 **inteiro no disco** e os dois itens seguintes já em esqueleto `EM APURAÇÃO` | **`rate_limit` HTTP 429 — "session limit"**, não `server_error` de streaming | **1/3 do mandato**: C3-1 re-executável pelo roteiro (P3); C3-2 e C3-3 por medir |

## O que esta queda diz à série — e é a primeira do gênero

**Classe de erro NOVA.** As 14 quedas do `POSTMORTEM-QUEDAS-2026-08-29.md` e todas as registradas depois são
da mesma família: corte de streaming do lado do serviço (`connection lost` / `the response stopped
arriving`). Esta é **`rate_limit` / HTTP 429 — teto de sessão**. Consequências para as hipóteses que a série
P6 existe para decidir:

- **Não alimenta o discriminador de endpoint** (`endpoint pinado × endpoint da sessão`, hipótese que a série
  do `SAN2-1R` levantou e a do `Ω6R` refinou). Teto de sessão é **cota**, não estabilidade de conexão:
  entra na série como linha própria e **não** deve ser somada às quedas de streaming, sob pena de
  contaminar o numerador que decide a hipótese.
- **É previsível, ao contrário das outras.** Cota se acumula ao longo da sessão; streaming cai
  aleatoriamente. Isto muda o que o orquestrador pode fazer a respeito: **ordem de disparo importa**. A
  cadeira mais cara (aqui a C3, com 5 sub-provas e dois drills de worktree descartável) foi disparada
  **por último**, depois de ~338k tokens de subagente gastos pelas outras duas — e foi ela que bateu no
  teto. Regra que esta queda sugere à série, ainda como hipótese e não como norma: **em junta de 3, dispare
  a cadeira mais cara primeiro**, não por último.

## O que esta queda diz sobre o P1/P2 — e é a evidência mais limpa até agora

Esta é a **primeira queda da série em que o protocolo funcionou exatamente como desenhado**, sem
não-conformidade a registrar:

1. A cadeira **criou o esqueleto antes de medir** (emenda voto-esqueleto de `J-SAN2-2`): os três itens
   nasceram `EM APURAÇÃO`, e o C3-3 nasceu **fatiado em 5 sub-provas** (`3a`…`3e`) — *a granularidade do
   registro acompanhou a da medição*.
2. Ela **escreveu o C3-1 completo ao terminá-lo**, com comando e saída de cada sub-prova (1a…1d), antes de
   iniciar o C3-2.
3. Morreu **na transição** — o vão exato que matou cinco cadeiras no `J-SAN2-2`.

**Resultado: 124 linhas de evidência sobreviveram, e o C3-1 saiu com veredito parcial `APROVADO` e zero
achado.** Sob a R2 original (*"parcial não é insumo, o suplente refaz tudo"*), isso seria descartado; sob a
**emenda P3**, é **roteiro de re-execução barata** — o sucessor re-roda os comandos registrados, compara as
saídas, e só então mede a cauda. Custo real da queda: **1/3 do mandato**, e a fração barata.

E o que o C3-1 já entregou não é trivial: provou, **em 3 de 3 precedentes onde os dois hashes divergem**
(#363, #364, #366), que `approved_head` grava **o head da ata**, nunca o `headRefOid` do PR — e provou que
as **149 entradas anteriores do history não sofreram nenhuma alteração**. Essa é a prova que o
`approved_head` `5256b49` (e não `657928f`) é o valor certo.

## Ação do orquestrador

- Suplente `suplente-conferente-do-kpi-e-das-dividas` despachado com **identidade nova**, mandato P3
  explícito: **re-executar cada comando registrado do C3-1 e comparar**, depois medir C3-2 e C3-3.
- **P5 não disparou:** 1 queda, não 2 em 30 minutos. Sem pausa de janela instável.
- Nenhuma conclusão do caído é herdada como fato — só os **comandos** dele são reaproveitados.
