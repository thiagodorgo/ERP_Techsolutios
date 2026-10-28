# Parecer — inspetor de terreno — B-SAN3-12b, junta de DINHEIRO, ciclo 3 (PR #469)

- identidade: `inspetor-san312b-ciclo3-opus` · subagente Claude Code · Claude Opus · nível menor DECLARADO
- objeto: `cfb19fd115bac02ef65eb94202b01a64e6730854`
- mandato_md5 (sem CR): `4e86365c9136f2f900a81a978159908c` · corpo carregado × blob: IDENTICO (EOL-neutro)
- evidência: `insp-san312b-c3-evidencia.md` (mesmo diretório)
- aberto em: 2026-10-28T04:24:47Z

## Item 1 de 3 — objeto, CI, árvore e S0 — VERDE
- Objeto `cfb19fd1` = head do PR (`gh pr view`) = ramo remoto (`git ls-remote`); PR OPEN, MERGEABLE, não rascunho.
- Check-runs: 14, todos `completed/success`; backend, backend-postgres e frontend com 2 runs cada; 0 queued/in_progress.
- origin/main = merge-base = `f0769739`, ancestral do objeto: a main não andou; nada de E2.5/R-E3-1 a repetir.
- `w-san312b` no objeto, 0 rastreado modificado, sem merge em curso; só o diretório não rastreado do ciclo 3.
- Disco C 13 GB (piso 7,5 ✔; 8,8 ✔); memória de commit livre 12,36 GB (piso 4 ✔).
- S0 em worktree descartável no objeto: `sync-agent-agents.mjs --check` ec=0, 95 agentes consistentes; corpos do inspetor e das 3 cadeiras IDENTICOS `.claude`×`.agents` (EOL-neutro); worktree removido.

## Item 2 de 3 — briefing, composição e identidade — VERDE (ressalva 1)
- 4 mandatos re-passados no pré-voo agora: `PRE-VOO OK` e colagem de refs conferida nos 4; md5 sem CR iguais aos do redator.
- Parecer do ciclo 2 com §1–§5 no objeto; E3 do plano versionado IDENTICA à do parecer (E3.1–E3.6, R-E3-1..7); ratificações e E2 no plano versionado.
- Relatório do dev: RETOMADAS 10–13 (4) e `## Ciclo 3` (1) presentes.
- Votos do ciclo 2 tratados como insumo a re-verificar (c1r3, c3r3, explícito); a C2 re-executa e compara (regra (2)/P3), não herda.
- Composição: C1 e C3 refeitas pela regra (3); C2 revalidada pela regra (2), provada: `git diff --name-only cfb19fd1~6 cfb19fd1` × `arquivos_medidos` (37, sem `**`) do voto da C2 do ciclo 2 (objeto `e77a5ac1` = `cfb19fd1~6`) = 4 caminhos ≠ ∅.
- Inelegibilidade por nome: 0 colisões entre as identidades do ciclo 3 e os 39 inelegíveis; obituário sem entrada do bloco; as identidades só aparecem como reserva no R- §4. C1 é Claude Opus obrigatório.
- Corpos das 3 cadeiras IDENTICOS (blob `.claude` × `.agents`, EOL-neutro), mas AUSENTES no `.claude/agents` da sessão → ressalva 1.

## Item 3 de 3 — isolamento e plano de perda — VERDE (ressalvas 2 e 3)
- Worktrees exclusivos nomeados nos mandatos e livres agora: `C:/Users/AMP/j12b-c3-c1r3-wt`, `C:/Users/AMP/j12b-c3-c2rev3-wt`, `C:/Users/AMP/j12b-c3-c3r3-wt` (nenhum `j12b*` existe; nenhum worktree de jurado dos ciclos 1/2 sobrando). Cada um com `npm ci` próprio e zero junction (0 junction/symlink medido em w-san312b e w-trc02).
- Nenhuma base viva: C1 sem banco; C2 com backend em memória e REDIS_URL para porta fechada; C3 com a CI (`backend`, `backend-postgres`, 2 runs verdes) como régua. Portas altas em 127.0.0.1.
- Diretório de saída do ciclo 3: só os mandatos e os 2 arquivos deste inspetor.
- Mandatos com P1/P2/P3/P4/P7, voto-esqueleto com `arquivos_medidos`, sucessor de identidade nova que re-executa o registrado.
- Recursos (04:33:39Z): disco C 13 GB livres, memória de commit livre 12,6 GB.

**Ordem de disparo (uma tarefa por braço; o Codex roda uma cadeira por vez; P8: no máximo 3 subagentes Claude):**
1. Agora: **C1** no Claude Opus (obrigatório).
2. Por volta de 05:31Z, quando o Codex voltar: **C3** no Codex Sol. Ela corre junto com a C1 só se a medição feita logo antes der disco ≥ 8,8 GB e memória de commit ≥ 4 GB. Se não der, espera a C1 acabar.
3. Quando a C3 acabar: **C2** no Codex Sol.

Se a C1 acabar antes de 05:31Z, o braço Claude pode pegar a C3 (Opus, declarado), e o Codex fica com a C2 às 05:31Z.

**Piso:** com menos de 7,5 GB livres, PARE. Antes de cada disparo, mede-se de novo: disco ≥ 7,5 GB (≥ 8,8 GB se outra cadeira estiver viva) e memória de commit ≥ 4 GB.

## Veredito
**LIBERADO COM RESSALVA**: a junta do ciclo 3 pode começar. Coloque as ressalvas abaixo, em destaque, no briefing das cadeiras.

**Ressalva 1: como disparar as cadeiras.** Os corpos `especialistas/jurado-san312b-c1-tela-e-fidelidade.md`, `-c2-cadeia-de-acesso.md` e `-c3-dinheiro-e-contrato.md` estão IDENTICOS no objeto (`.claude` × `.agents`, EOL-neutro). Mas eles NÃO estão no `.claude/agents/` do diretório da sessão (`ERP_Techsolutios` @539b078e), então não dá para disparar as cadeiras pelo tipo de agente da sessão. Dispare cada cadeira como subagente genérico. Ela lê o corpo com `git show cfb19fd1:.claude/agents/especialistas/<x>.md`, como os mandatos mandam, e declara na 1ª linha da evidência IDENTICO, comparando EOL-neutro com o blob. Uma cadeira que declarar DIVERGE fica inválida.

**Ressalva 2: plano de perda de jurado, para pôr no briefing.** Os mandatos já preveem o sucessor de identidade nova (P3), mas não dizem onde registrar a queda nem qual regra de quórum vale. O briefing deve dizer:
- toda queda vira 1 linha em `agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo3/00-quedas.md`, preenchida pelo orquestrador (P6);
- o voto perdido não conta;
- o sucessor recebe um nome novo, nunca o do caído (sufixo `-s2`, …), e re-executa o `<cadeira>-evidencia.md` do caído antes de medir a cauda;
- a unanimidade de 3 exige os 3 votos sobre o objeto final `cfb19fd1`;
- se o Codex cair por limite, o Claude Opus cobre, declarado. Abaixo do Opus, PARE (§C7.6-bis).

**Ressalva 3: Postgres local da C3, autorização condicional.** A régua da C3 é a CI. Ela só pode criar um Postgres descartável se cumprir tudo isto:
- antes de criar, `docker ps -a --filter name=j12b-c3` vazio. Não medi isso, porque este mandato proíbe o Docker;
- nome `j12b-c3-c3r3-pg-*`, porta alta em 127.0.0.1 (nunca 5432) e nunca `erp-postgres`;
- disco ≥ 8,8 GB e memória de commit ≥ 4 GB medidos na hora;
- no máximo 2 trabalhos Docker no total;
- no teardown, removê-lo e provar a remoção com `docker ps -a`.

Se a C1 e a C2 correrem ao mesmo tempo, cada uma usa uma porta alta diferente, declarada na própria evidência.

**Limpeza:** criei o worktree `C:/Users/AMP/j12b3-insp-wt` (S0) e o removi com `git worktree remove --force` (diretório ausente; `git worktree list` sem ele). Nos arquivos temporários do scratchpad, apaguei só os que criei. Não usei Docker, banco nem npm, e não fiz commit. Fora do diretório do ciclo 3, w-san312b e w-trc02 não foram alterados (porcelain 0 rastreado).

Fechado em: 2026-10-28T04:36:28Z
