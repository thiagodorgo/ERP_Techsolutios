# O caso que motivou a P7 — a trilha da sessão, versionada (registro do #397, ajuste C1-A3)

> Fonte do caso citado em `D-PAUSA-GRAVA-E-PARA` e no `PROTOCOLO-JUNTA-RESILIENTE.md` §P7. A C1 da junta do #397 mediu que
> nenhum arquivo rastreado narrava o evento (ajuste C1-A3). O evento vive na trilha de custo da sessão do orquestrador
> (`CUSTO-AGENTES.md`, no scratchpad da sessão, nunca versionado); as linhas abaixo são **cópia literal** dela, e a medição da
> retomada é a que o orquestrador fez às 10:23 local antes de reanimar o agente. Isto paga o "sem fonte"; o conflito de
> números (~20–40 min × ~30 min) é texto do autor e fica em `P-GOV-PAUSA-CASO-SEM-FONTE`, com dono que não é o autor.

## Linhas da trilha (verbatim; horas locais, UTC−3)

```
- [ ] 01/10 06:42 — PAUSA pelo dono (limite perto do teto). Parado: vigia do T4c e o Dev-T4 (mid-E1; parcial preservado em w-devt4 — 2 arquivos de teste modificados, sem commit — e em scratchpad/devt4c + DEVT4C.md). RETOMADA: relancar a MESMA identidade dev-tests-ciclo4-b-gov-mandato a partir de 00-mandatos/dev-tests.md (md5 1af9e7fc…), re-executando os comandos do DEVT4C.md (P3), nao herdando conclusao; depois: versionar os 8 corpos + gerar mandato dev-scripts no head do T4c → Dev-S4 → E4 (rodar-e4f.sh) → K4b → conferente → registro → §9 → inspetor → junta 4
- [ ] 01/10 10:36 — RETOMADA (modelo da sessao trocado pelo dono para Opus 5.5; gates seguem Fable por frontmatter/model explicito). Dev-T4 reanimado por SendMessage (mesma instancia, contexto intacto; parcial medido: 0 processos, 2 testes em CRLF consistente, vc 347/324/23). 8 corpos versionados em wip/b-gov-mandato-c4-corpos @ 987cde17 (ramo do PR intacto em 335cf09d para o ff do T4c). #397: arnes w-pv397 (pre-voo faa408c8 + refs 474c7521 do ramo do #393), mandato do planejador-b-gov-pausa versionado c9eda7bb (md5 d8507e81…, PRE-VOO OK), planejador lancado (Fable)
| 01/10 | dev-tests-ciclo4-b-gov-mandato (Opus; pausado 06:45, retomado 10:23 mesma instancia) | 562.347 | 3h46 | T4c 5b6f4f4a + T4c-2 738f0736 (errata 15.14): 41 casos (36+5), vc = 24 exatos, 0 existentes mudam contra o head; falsificou 3 premissas do plano por medicao |
```

## A medição da retomada (01/10, 10:23 local), antes de reanimar a mesma instância

```
processos vivos com w-devt4 na linha de comando: (nenhum)
w-devt4: detached em 335cf09d, " M tests/mandato-preflight.test.ts" (+526/-6) e " M tests/mandato-refs.test.ts" (+137), sem commit
EOL: tests/mandato-preflight.test.ts linhas=2485 CR=2485 semCR=0 ; tests/mandato-refs.test.ts linhas=1093 CR=1093 semCR=0
     (o blob do HEAD guarda LF; o worktree e CRLF por autocrlf) — a conversao LF->CRLF interrompida TERMINARA
DEVT4C.md: ultima secao "09:38Z — vermelho-controle historico do pre-voo" (347 casos, 324 ok, 23 not ok)
```

**O que a medição diz sobre o texto:** o parcial **não** ficou inconsistente de EOL (o texto da P7 diz "parcial *possivelmente*
inconsistente" — é o que se sabia no instante do corte; a medição posterior mostrou que a conversão tinha terminado). O redo
efetivo: o agente retomado re-executou as medições a partir das 10:42 (`redo.sh`) e chegou à bateria às 11:11 — ordem de 30 a
50 minutos de relógio, não medidos como "redo" isolado. Nenhum dos dois números do texto (~20–40 / ~30) tem medição própria.
