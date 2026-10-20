# Parecer — inspetor de terreno — junta B-SAN3-02 ciclo 1 (DINHEIRO, unanimidade de 3 com veto)

Papel: `inspetor-de-terreno-da-junta` · identidade `inspetor-san302-opus` · modelo Claude Opus (nível menor, DECLARADO) · objeto `8e6a6c29b8a0aced5bf3968383aa9ef247019f46` (PR #448) · mandato_md5 `adc4d61dca1bced5554cd1a4aa234f90`.

## Item 1 — objeto, CI (check-runs), mandatos (PRE-VOO), corpos/espelho, S0
**VERDE, com 1 ressalva.**
- Objeto: `8e6a6c29b8a0aced5bf3968383aa9ef247019f46` por duas fontes (`git ls-remote` do ramo e `gh pr view 448 --json headRefOid`), igual ao head do worktree; PR OPEN, não rascunho, MERGEABLE. Head não andou desde a redação.
- check-runs: `gh api …/commits/8e6a6c29…/check-runs` → **14/14 concluídos, 14 `success`**, 0 queued/cancelled (7 jobs × push+pull_request: docker, owner-portal, flutter, backend-postgres, frontend, authority-portal, backend).
- PRE-VOO dos 4 mandatos com as ferramentas de `C:/Users/AMP/erp-pausa-2026-10-03/redator-san302/` (refs idêntico a `origin/chore/mandato-refs-e-preflight` 4af61a41; preflight difere só na l.211 `RAIZ`): **PRE-VOO OK ec=0** em inspetor-san302, cadeira-c1, cadeira-c2, cadeira-c3 (4 AVISOs "corrida hex" = timestamps de migration, inertes). Logs em `C:/Users/AMP/erp-pausa-2026-10-03/insp-san302/`.
- Corpos: os 3 corpos `jurado-san302-c{1,2,3}-*` são IDÊNTICOS entre `.claude/agents/especialistas/` e `.agents/agents/especialistas/` no objeto (EOL-neutro, descontados frontmatter e bloco de adaptação Codex); disco do worktree = blob nos 6 arquivos. Corpo do inspetor: sessão = objeto (EOL-neutro).
- S0: `sync-agent-agents.mjs --check` em worktree descartável no objeto → `OK — 73 agentes, espelho consistente`, ec=0 (recursivo: 50 especialistas em cada espelho). Worktree removido.
- **RESSALVA R1 (corpo carregado × julgado, item 3.3):** os corpos `jurado-san302-*` **não existem** no diretório da sessão (`C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/agents/especialistas/`, medido: 0 arquivos). O orquestrador tem de entregar a cada cadeira o corpo **lido do blob do objeto** (`git -C C:/Users/AMP/w-san3-02 show 8e6a6c29:.claude/agents/especialistas/jurado-san302-<c>.md`), nunca de outro diretório; cada cadeira declara IDENTICO/DIVERGE na linha 1 da evidência (já exigido nos mandatos), e DIVERGE em cadeira com veto invalida a cadeira.

## Item 2 — identidades, inelegibilidade, §C7.4-bis, briefing
**VERDE, com 2 ressalvas.**
- OBITUÁRIO (3.1-bis), no objeto e em origin/main: 0 linha com `san302`/`san3-02`; nenhuma identidade da junta SEPULTADA ou RESERVADA.
- Inelegíveis (lista regenerada por comando próprio sobre TODO o diff do bloco + registros fora do repo; o piso do redator bate 13/13): `critico-san3-02-opus` (`-r`, `-r1`, `-r2-`), `dba-san302-opus`, `dev-san3-02-cdx`, `dev-san3-02-opus`, `fabrica-san3-02-gemini`, `fabrica-san3-02-opus`, `planejador-san3-02-astra`, `planejador-san3-02-fable`, `planejador-san302-b4-fable`, `rev-san3-02-cdx`, mais `dev-san3-02-fix-cdx` e `dev-san3-02-fix-agyopus` (confirmados em `C:/Users/AMP/erp-pausa-2026-10-03/revisoes/`) e `redator-san302-opus`. O crítico Gemini da r1 não tem nome registrado.
- Junta: C1 = `jurado-san302-c1-opus` (Claude Opus), C2 = `jurado-san302-c2-opus` (Claude Opus), C3 = `jurado-san302-c3-argon` (Gemini 4 Argon via Gemini CLI), inspetor = `inspetor-san302-opus`. Cruzamento com os 16 inelegíveis → **0 colisões**; entre si → 0 duplicatas; `git grep` dos nomes no objeto e na main → 0; nos registros fora do repo → 0.
- §C7.4-bis por nome: quem achou (críticos r1/r2, `rev-san3-02-cdx`) ≠ quem planejou (`planejador-san3-02-astra`, `-fable`, `planejador-san302-b4-fable`) ≠ quem desenvolveu (`dev-san3-02-opus`, `dev-san3-02-fix-cdx`, `dev-san3-02-fix-agyopus`; `dev-san3-02-cdx` caiu antes de começar) ≠ quem vota. Nenhum papel acumulado.
- Briefing (§9 do plano, "Pré-voo do inspetor"), presente nos 3 mandatos de cadeira: plano v2 com Anexo A, Anexo B e Anexo C; críticas r1 (Opus e Gemini) e r2; relatório do dev (no objeto: "30/30 mutações vermelhas", l.149/l.200); `D-SAN3-02-TITULO-COMPLEMENTAR` com a Q4 apensada (decisoes.md l.3770 e l.3789–3791); parecer do DBA; revisão independente `rev-san3-02-cdx` fora do repo — todos marcados **A RE-VERIFICAR**.
- Divergência corpo × plano (§A2), declarada em cada mandato e re-medida por mim: C1 (T-A4 409→201 complementar; T-Z/M19 ausentes do corpo), C2 (FK 2→4 colunas pela Q4; drift por `--shadow-database-url` → delta de uma sentença), C3 (18→30 mutações; precedência idêntica, sem `P-SAN3-02-PRECEDENCIA-PERIOD-CLOSED`; executor). Mérito não julgado.
- Competência (3.2): atomicidade/corrida, banco/migração/índice, regressão/escopo/contrato — cobre as três frentes do §9.
- **RESSALVA R2:** o Gemini 4 Argon não aparece na tabela de níveis do §C7.6 (Opus / GPT-5.6 Sol). O nível menor dele vem de leitura do orquestrador, declarada (`D-GEMINI-ARGON-USO`, existe no objeto e na main), e não de equivalência dita pelo dono. A ata deve registrar isso. Argon esgotado → PARA e entra sucessor P3; nunca Flash (já no mandato c3).
- **RESSALVA R3:** a C3 tem de rodar numa sessão nova da Gemini CLI, sem `--resume`/`--conversation` de sessão de crítico ou de fábrica Gemini deste bloco (o crítico Gemini da r1 e `fabrica-san3-02-gemini` usam o mesmo provedor). A ata deve registrar o id da sessão.

## Item 3 — terreno (árvore, worktrees, Docker, memória, portas, P3/P5, baseline)
**VERDE, com 3 ressalvas (uma forte).**
- Árvore `C:/Users/AMP/w-san3-02` no objeto `8e6a6c29`. Os 70 ` M` são todos fantasmas de EOL em `.agents/`/`.claude/`: 0 arquivo com conteúdo diferente, conferido arquivo a arquivo, sem contar CR. Nada staged. Não rastreados: só este diretório de votos. `node_modules` é diretório real, **não junction**.
- Resíduos: nenhum worktree `w-jsan302-*`, nenhum contêiner `jur-*`/`crit-*`/`jsan302-*`, nenhum probe solto.
- Baseline honesto: `npm run check` no objeto → **ec=0** (exit lido de variável). A árvore não mudou depois da execução. CI 14/14 success.
- Docker às 01:49Z, excluindo `erp-*`: **1 grupo alheio** (`dtrc02-179246012121570`, B-TRC-02, sem porta publicada). Às 01:08Z eram 4. A VM Docker tem ~9,7 GiB (`.wslconfig` aplicado). A base viva `erp-postgres`/`erp-redis` (5432/6379) segue viva e não é alvo de ninguém.
- `teste-linux.sh`: 3 `docker run`, nenhum `-p`/`--publish`, rede própria `tl<epoch><pid>`, worktree montado `:ro`. O isolamento por cadeira está escrito nos 3 mandatos: worktree próprio `C:/Users/AMP/w-jsan302-c1-`, `-c2-`, `-c3-` e `-c3b-` (merge-base), cada um com `npm ci` próprio e zero junction; banco descartável por `teste-linux.sh`, com o ID `tl…` registrado como da cadeira; prefixo `jsan302-<c>-`/`jsan302_c2_` para o que nascer fora da ferramenta; portas 5432, 6379, 3000, 5173, 5050 e 8899 proibidas; nunca `prune`.
- **RESSALVA R4 (FORTE) — memória de commit livre:** 3,74 GB às 01:44Z, **2,98 GB às 01:49Z e 2,91 GB às 01:50Z**. Está **abaixo do piso de 3 GB** agora. Até uma medição dar ≥ 3 GB, **nenhuma cadeira sobe banco nem roda `npm ci`**. A cadeira mede antes de CADA subida e espera (os mandatos já mandam). O orquestrador não dispara a segunda cadeira enquanto a memória estiver abaixo do piso.
- **RESSALVA R5 — Docker serializado:** com 1 grupo alheio vivo, o teto de 2 deixa **UMA cadeira com banco por vez**. A C3 roda base e objeto (`c3b`/`c3`) em sequência, nunca juntas. Se o `dtrc02` acabar, cabem duas.
- **RESSALVA R6 — disco:** 14 GB livres (95% usado), e há 4 worktrees com `npm ci` mais as camadas dos contêineres. Abaixo de ~10 GB, pausar a subida seguinte e limpar só o que é da junta (§C5).
- **P3 (perda de jurado):** voto perdido não conta. O sucessor é de identidade nova, conferida contra a lista do item 2, e re-executa os comandos do `<c>-evidencia.md` do caído antes de medir a cauda. Como a regra é unanimidade de 3, a junta **não fecha com 2 votos**: sem sucessor, não há veredito. Argon esgotado ou indisponível → a C3 PARA (nunca Flash nem outro modelo) e entra um sucessor P3. Opus esgotado → PARA (§C7.6-bis). Queda vai para `00-quedas.md` (P6, do orquestrador).
- **P5 e ordem de disparo:** no máximo 2 cadeiras vivas ao mesmo tempo e no máximo 1 com banco enquanto o `dtrc02` viver. Ordem sugerida: **C1 (Opus) + C3 (Argon, cota separada) primeiro**. A C3 começa pelos itens em memória e pela montagem dos worktrees; a primeira subida de banco é de quem medir Docker ≤ 2 e commit ≥ 3 GB, e a outra espera. **C2 entra quando a primeira das duas concluir.** 2 quedas em menos de 30 min → pausa de ~15 min.

## Veredito
**LIBERADO COM RESSALVA** — 2026-10-20T01:52Z, `inspetor-san302-opus`, Claude Opus (nível menor, DECLARADO).

A junta do B-SAN3-02, ciclo 1 (DINHEIRO, unanimidade de 3 com veto), pode começar sobre o objeto `8e6a6c29b8a0aced5bf3968383aa9ef247019f46`: 14/14 check-runs success, PRE-VOO OK nos 4 mandatos, S0 verde, inelegibilidade sem colisão, briefing completo, isolamento declarado e baseline `check` ec=0. **Liberados por nome:** C1 `jurado-san302-c1-opus` (Claude Opus, `w-jsan302-c1-`, banco `teste-linux.sh`/`tl…`), C2 `jurado-san302-c2-opus` (Claude Opus, `w-jsan302-c2-`, banco `teste-linux.sh`/`tl…` + bases `jsan302_c2_*`) e C3 `jurado-san302-c3-argon` (Gemini 4 Argon via Gemini CLI, `w-jsan302-c3-` + `w-jsan302-c3b-`, banco `teste-linux.sh`/`tl…`).

Ressalvas, a pôr em destaque no briefing:
1. **R4 (forte):** memória de commit livre em **2,91 GB, abaixo do piso de 3 GB**. Nenhuma subida de banco nem `npm ci` antes de uma medição ≥ 3 GB.
2. **R5:** uma cadeira com banco por vez enquanto o `dtrc02-179246012121570` viver. A C3 roda base e objeto em sequência.
3. **R1:** o corpo de cada cadeira sai do blob do objeto (`git -C C:/Users/AMP/w-san3-02 show 8e6a6c29:.claude/agents/especialistas/jurado-san302-<c>.md`). Ele NÃO existe no diretório da sessão. A linha 1 da evidência de cada cadeira declara IDENTICO ou DIVERGE; DIVERGE invalida a cadeira (todas têm veto).
4. **R2:** o nível menor do Argon é leitura do orquestrador (`D-GEMINI-ARGON-USO`), não equivalência dita pelo dono no §C7.6. A ata registra isso.
5. **R3:** a C3 roda em sessão nova da Gemini CLI, sem retomar conversa de crítico ou de fábrica Gemini. A ata registra o id da sessão.
6. **R6:** 14 GB de disco livres. Abaixo de ~10 GB, pausar e limpar só o que é da junta.

Se o head andar, o objeto muda e é preciso novo pré-voo antes de qualquer voto.

**Limpeza:** worktree `C:/Users/AMP/w-insp302-s0` criado e removido. O `du` que eu tinha em segundo plano foi morto. Não criei contêiner, rede nem base. Tudo o que é meu está em `C:/Users/AMP/erp-pausa-2026-10-03/insp-san302/`. Não commitei nada.
