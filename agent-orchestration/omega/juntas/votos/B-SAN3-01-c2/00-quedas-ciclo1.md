# B-SAN3-01 — registro de quedas da junta (P6) — **CICLO 1**

> **Este arquivo é do CICLO 1, não do ciclo 2.** É cópia byte-a-byte de
> `votos/B-SAN3-01/00-quedas.md` (md5 `982a023d…`), deixada nesta pasta por engano no PR #387: a pasta
> `votos/B-SAN3-01-c2/` é a do ciclo 2, e nada aqui descreve queda do ciclo 2. O registro P6 do ciclo 2
> está ao lado, em `00-quedas.md` — achado **A7** do porteiro pós-merge do #387, pago pelo `B-SAN3-04a`.

| # | Cadeira | Papel | Instância | Quando | Causa | O que deixou | Conta como voto? |
|---|---|---|---|---|---|---|---|
| 1 | C1 | `validador-mestre` | 1ª | 2026-09-18 ~01:16 | HTTP 429, limite de sessão (reset 04:30) | esqueleto do voto (174 B) e da evidência (271 B), sem medição; cópias `*.parcial-instancia1.*`; nenhum worktree nem contêiner criado | não |
| 2 | C4 | `guardiao-fail-closed` | 1ª | 2026-09-18 ~01:16 | HTTP 429, limite de sessão | nada no disco | não |
| 3 | C2 | `master-teste-telas-rotas` | 1ª e 2ª (dentro do workflow `wf_9f1821c5-103`) | 2026-09-18, manhã | queda do agente e retomada pelo runtime do workflow | a 1ª deixou parcial (cópias `C2-*.parcial-instancia1.*`, 2,4 KB + 10 KB); **a 3ª sobrescreveu sem cópia o parcial da 2ª** (declarado pela própria 3ª no voto); o voto final é o da 3ª, completo | só o da 3ª |

Medido pelo orquestrador às 09:26: `git worktree list` sem `j-bsan301-*`; `docker ps -a` sem `j-bsan301-*`. Decisão: relançar os
titulares (2ª instância) uma vez; se caírem de novo, entra o suplente nomeado, que re-executa o mandato inteiro.

**Resultado do ciclo 1:** C1 (2ª instância) e C4 (2ª instância) votaram; a C3 votou na 1ª; nenhum suplente foi acionado. Lição
do incidente da C2: o runtime do workflow relança o agente caído sem a checagem "medir → copiar → lançar"; o parcial da 2ª
instância se perdeu. Nas próximas juntas por workflow, o prompt da cadeira manda copiar o próprio parcial antes de sobrescrever.
