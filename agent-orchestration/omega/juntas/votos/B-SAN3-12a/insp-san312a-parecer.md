# Parecer — inspetor de terreno — B-SAN3-12a (PR #459, ciclo 1, junta de DINHEIRO) — 2ª passada

- Papel: `inspetor-de-terreno-da-junta`.
- Identidade: `inspetor-san312a-opus`, 2ª passada. Executor: subagente genérico, porque o tipo não está carregado na sessão. O corpo foi lido do blob do objeto e é IDENTICO ao carregado (EOL-neutro, `cbbed450…`).
- Modelo: **Claude Opus 5.5, nível menor DECLARADO**, cobrindo o Codex.
- Objeto: `04b8a667780930050c8af2c77c323b81fe8794bb`.
- Mandato: md5 sem CR `b638e1c0ca7be63207eccd280b2d529e`, PRE-VOO OK.
- A 1ª passada (BLOQUEADO por cobertura) está preservada em `insp-san312a-parecer-bloqueado-r2.md` e `insp-san312a-evidencia-r2.md`. Nada dela foi herdado; tudo foi re-medido. Os comandos e as saídas estão em `insp-san312a-evidencia.md`.
- Régua: dinheiro e permissão, **unanimidade das 4 cadeiras com veto**, ciclo 1, `arquivos_medidos` em todo voto.

## Item 1 de 3: objeto, CI, delta, merge, mandatos, corpos, S0. VERDE
- **Objeto.** As 3 fontes dão `04b8a667`: `git ls-remote`, `gh pr view 459` e o HEAD do worktree. O PR está OPEN, não é rascunho e está `MERGEABLE CLEAN`.
- **Delta.**
  - O objeto tem 1 pai e só traz o corpo da C4, nos dois espelhos.
  - `<objeto>~1` é o merge de 2 pais e é igual ao `5efc99e2` da passada anterior.
  - A cerca é `<objeto>~3`. De lá até `<objeto>~2` há 1 commit, com só os 6 corpos C1–C3 e nenhum caminho fora.
- **Merge sem conteúdo próprio.** O `<objeto>~1`, comparado com o merge automático dos seus pais, difere só nos 4 arquivos de registro, e nenhum pai perde linha. As 2 linhas do 1º pai que saem são linhas que a própria `main` tirou.
- **Bases.** O head-base do bloco é `<objeto>~14`, a merge-base dos dois pais. A merge-base com a `origin/main` é o 2º pai do merge, `b2f8e6cf`, que é a `origin/main` de agora.
- **CI.** São 14 check-runs, todos concluídos e `success` (7 jobs). Os dois runs são `ci push` e `ci pull_request`, os dois `completed success`.
- **Trava do #458** no objeto: `migrações: 117 · novas: 5 · violações: 0` (ec=0). É fato do terreno para a C3.
- **Mandatos.** O pré-voo dos 5 mandatos dá `PRE-VOO OK` com ec=0, e os md5 conferem com o relatório r3. Nenhuma unidade MEDIDO está sem saída colada: c1 19/0, c2 21/0, c3 21/0, c4 23/0, inspetor 23/0.
- **Corpos.** Os 4 corpos são IDENTICOS nos dois espelhos e o disco é igual ao blob. **No diretório da sessão os 4 estão AUSENTES.** Por isso cada cadeira roda como subagente genérico que lê o blob do objeto.
- **S0.** Num worktree descartável meu, `C:/Users/AMP/j12a-insp3-s0`, já removido: `OK — 89 agentes, espelho consistente.` (ec=0).

## Item 2 de 3: identidades, papéis, composição, cobertura, briefing. VERDE
- **Inelegíveis.** Gerei a lista por comando meu e ela bate com a do mandato, inclusive `fab-red-san312a-r3-opus` e `redator-san312a-r2-opus`.
- **Identidades da junta.** As 5 (o inspetor e `jurado-san312a-c1/c2/c3/c4-opus`) não colidem com ninguém nem entre si. Também não aparecem no obituário (0), nas atas `J-*` e `R-*` (0, no objeto e na `origin/main`) nem no registro fora dos corpos (0).
- **§C7.4-bis.** São pessoas diferentes: quem achou (os críticos, e o dev nas F1 a F9), quem planejou (topo Fable), quem desenvolveu (`dev-san312a-opus`) e quem julga (as 4 cadeiras novas).
- **Cobertura, sem nenhum critério sem dono.**
  - A E1b.6 está completa: A27, A28, D1, A6-bis, F5, B1, B2, F3 e A17-bis.
  - R-res-1 e R-res-3 estão na C1.
  - R-res-2 está na C2 (bounce com motivo, mutação Rres2).
  - R-res-7 está na C2, item 2. O token não aparece, mas o conteúdo sim: posição das 2 chaves, mutação de ordem e `core-saas-role-authority`.
  - A5 está na C2.
  - **Os 4 critérios que estavam sem dono na 1ª passada agora estão na C4**: R-res-5 e A14 (item 1, com sonda cross-tenant sob superusuário e sob `j12a_c4_rt`, e as mutações M5a/b/c); R-res-4 e A13 (item 2); A21 e A16 (item 3, que fecham as duas pendências do §12.1). Cada um tem mutação e vermelho-controle.
  - R-res-6 e R-res-8 são do 12b.
- **Composição.**
  - São 4 cadeiras, com unanimidade e veto.
  - **Monocultura, declarada:** as 5 identidades rodam em Claude Opus, o mesmo modelo do dev e do crítico da E1.
  - Divergências do §10 do plano, registradas em §A2 nos mandatos e no corpo da C4: a C2 seria Codex Sol, que está sem limite; o R-res-5 era da C2 e o R-res-4 da C3, e agora os dois estão na C4.
  - Nenhuma cadeira é Gemini, então a `D-GEMINI-SEGUNDO-REVISOR` está cumprida.
- **Briefing presente:** as Emendas E1 e E1-bis, as etapas E10 a E14 do dev, as críticas e as divergências §A2 em todos os mandatos e corpos.

## Item 3 de 3: terreno. VERDE COM RESSALVA
- **Worktree.** `C:/Users/AMP/w-san312a` está no objeto, com 0 modificação rastreada. O único não rastreado é o diretório desta junta. O `node_modules` não é junction. Baseline: `npm run check` deu ec=0.
- **Resíduo.**
  - Nenhum container nem caminho `j12a*`, e nenhuma sonda solta.
  - O `agv3-proxy` está parado (Exited); é alheio e inerte.
  - Os worktrees `w-agapi2`, `w-med03` e `w-san322` são alheios: reportados, não varridos.
- **Docker.** Há 1 trabalho vivo fora de `erp-*`: `dev-san322-pg` em 127.0.0.1:55432 e `dev-san322-redis`. **Com a cadeira, ficam 2, que é o teto.** Se surgir um terceiro, a cadeira espera.
- **Disco e memória.** O disco tem 12 GB livres (≥ 7) e a memória de commit livre é 13,98 GB (≥ 4). **O tamanho de um `npm ci` não está medido.** A C3 faz dois (`j12a-c3-wt` e `j12a-c3-wtb`) e re-mede o disco antes de cada um; abaixo de 7 GB, PARA.
- **Portas.** As das cadeiras estão fora das faixas reservadas do Windows e sem uso: 47713 e 47714 (C1), 47723 e 47724 (C2), 47733 e 47734 (C3), 47743 e 47744 (C4). Continuam proibidas 5432, 6379, 3000, 5173, 5050, 8899, 55432, 55412 e 55413, e a base viva `erp-*` não é alvo.
- **Isolamento**, escrito nos 4 mandatos:
  - worktrees `j12a-c1-wt`, `j12a-c2-wt`, `j12a-c4-wt`, `j12a-c3-wt` e `j12a-c3-wtb`;
  - `npm ci` próprio, sem junction;
  - Postgres e Redis descartáveis `j12a-cN-pg` e `j12a-cN-redis`, só em 127.0.0.1;
  - cada cadeira derruba o que subiu antes da seguinte.
- **Perda de jurado (P3).** Entra um sucessor Opus com identidade nova e declarada. Opus esgotado = PARA (§C7.6-bis).
- **Ordem aprovada: C2 → C4 → C1 → C3, uma cadeira por vez.** A C3, a mais pesada, vai por último, com o disco re-medido.

## Veredito
**LIBERADO COM RESSALVA.** Leve estas ressalvas para o briefing das cadeiras, em destaque:
1. **Monocultura Opus** nas 5 identidades, igual à do dev e à do crítico da E1.
2. **Docker no teto (2)** enquanto o `dev-san322` estiver vivo. Cada cadeira re-mede o Docker antes de subir e espera se houver um terceiro trabalho.
3. **O tamanho do `npm ci` não foi medido.** A C3 re-mede o disco antes de cada um dos seus dois `npm ci` e PARA abaixo de 7 GB. Toda cadeira re-mede disco e memória antes de subir.
4. **Os corpos não estão no diretório da sessão.** Cada cadeira é lançada como subagente genérico que lê o corpo do blob do objeto `04b8a667`, nunca por `subagent_type`.
5. **O objeto é `04b8a667`.** Um head que andar depois dele bloqueia o início até novo pré-voo.
6. A `P-SAN3-12A-PLANO-FALSIFICADO-ESCOPO`, que o porteiro do #460 apontou, bloqueia o **merge**, não o start. A dona é a C3, no item 2.

Limpeza: criei e removi o worktree `C:/Users/AMP/j12a-insp3-s0`. O log temporário do `check` foi apagado. Não subi container, não toquei arquivo rastreado e não fiz commit.

LIBERADO COM RESSALVA
