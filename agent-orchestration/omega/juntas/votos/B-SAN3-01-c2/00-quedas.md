# B-SAN3-01 — registro de quedas (P6) — **CICLO 2**

> Achado **A7** do porteiro pós-merge do #387: a 1ª instância da cadeira C4 do ciclo 2 caiu por 429 e **nada
> registrava a queda** — a seção "Ciclo 2" da ata não tinha linha de quedas, e o único arquivo de quedas na pasta
> (`00-quedas-ciclo1.md`) é cópia byte-a-byte do registro do CICLO 1 (blob `076a431e`, md5 `982a023d…`, idêntico
> a `votos/B-SAN3-01/00-quedas.md` — remedido por mim, `git show HEAD:<caminho> | md5sum` nos dois). Este arquivo
> paga a dívida. Escrito no pré-merge do `B-SAN3-04a` (2026-09-20) a partir dos arquivos que sobreviveram, **sem
> herdar afirmação**: cada linha aponta a evidência em disco ou no tree.

| # | Papel | Instância | Quando | Causa | O que deixou | Conta como voto? |
|---|---|---|---|---|---|---|
| 1 | `planejador-mestre` (Fable 5.1) — replanejamento do ciclo 2 | 1ª | 2026-09-18 ~12:21 (fuso local) | HTTP 429 | só o §0 do plano gravado; cópias `PLANO-B-SAN3-01-ciclo2.parcial-instancia1.md` e `…parcial-anterior.md`, **11.827 B cada**, `cmp` idêntico; usadas como ROTEIRO pela 2ª, que reexecutou toda medição | não vota |
| 2 | C4 `jurado-san3-01c2-fail-closed-web` (Opus 5, 1M) | 1ª | ver a divergência de horário abaixo | HTTP 429, limite de sessão | evidência parcial **2.645 B** + esqueleto de voto **204 B** (`veredito: "EM APURAÇÃO"`, `achados: []`), copiados para `C4-…-evidencia.parcial-instancia1.md` e `C4-…-voto.parcial-instancia1.json` no scratchpad da sessão; worktree `.claude/worktrees/j-bsan301-c4c2` criado e `npm ci` feito | **não** — o voto que conta é o da 2ª |

**Evidência (medida por mim, não copiada).**
- Planejador: `agent-orchestration/omega/planos/B-SAN3-01-ciclo2-plano.md:3-7` (rastreado) — "A 1ª caiu por 429 às
  ~12:21 com só o §0 gravado … 11.827 B cada, `cmp` idêntico … nenhum número foi herdado".
- C4: `votos/B-SAN3-01-c2/C4-jurado-san3-01c2-fail-closed-web-evidencia.md:3-5` (rastreado) — "**2ª instância**
  (a 1ª caiu por 429 em 2026-09-18T23:16Z; o parcial dela está em `*.parcial-instancia1.*` e serviu só de ROTEIRO —
  tudo abaixo foi re-executado por mim)". Tamanhos e conteúdo do parcial: `stat` nos dois arquivos do scratchpad
  (2.645 B e 204 B, mtime `2026-09-19 06:58:17 -0300` = a hora da **cópia** pelo orquestrador, não a da escrita).

**Divergência de horário, declarada em vez de harmonizada (§A2).** O cabeçalho da 2ª instância data a queda da 1ª em
`2026-09-18T23:16Z`; o próprio parcial da 1ª carrega medições **posteriores** a essa hora — `M0 — Terreno
(2026-09-19T02:10Z–02:12Z UTC)` e `M1 — Baseline no objeto (02:13Z–02:16Z)`, com `tsc` ec=0, bloco 67/67 e smoke
1193/1193. Ou a hora do cabeçalho está errada, ou houve mais de uma interrupção. Não dá para decidir com o que
sobrou, e chutar aqui seria exatamente o defeito que o P6 existe para evitar. O que é certo e basta para o registro:
**a 1ª instância da C4 não votou, o parcial dela só serviu de roteiro, e a 2ª reexecutou tudo** — o M0 da 2ª está
datado `2026-09-19T10:00Z`, dois minutos depois da cópia do parcial (09:58Z), na ordem que a regra manda
(*medir → copiar → só então lançar*).

**Não caíram:** C1 `validador-mestre`, C2 `master-teste-telas-rotas` e C3 `frontend-pixel-master` — 1ª instância cada,
sem `*.parcial-instancia*` na pasta do ciclo 2 (`git ls-files votos/B-SAN3-01-c2/` = 10 arquivos, nenhum parcial).
Nenhum suplente foi acionado no ciclo 2.

**Lição que este registro deixa.** A pasta de votos de um ciclo nasce com o arquivo de quedas do ciclo — vazio se não
houve queda, dizendo "sem quedas". Copiar o do ciclo anterior para a pasta nova produz o pior dos mundos: parece
registro e não registra nada, e o `--check` de ninguém pega isso.
