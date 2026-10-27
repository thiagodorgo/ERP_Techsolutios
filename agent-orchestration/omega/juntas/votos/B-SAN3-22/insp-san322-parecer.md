# Parecer — inspetor-san322 — junta do B-SAN3-22 (PR #464), ciclo 1

Executor: Claude Opus 5.5 (subagente genérico, identidade `inspetor-san322`), nível menor DECLARADO. Objeto: `44d9cbb3874e45340ca43c934364c3d0103c53b8`.

## Item 1 de 3 — objeto, CI, mapa, mandatos, corpos, S0 — VERDE

- **Objeto:** `git ls-remote origin refs/heads/fix/checklist-trava-versao` = `gh pr view 464 --json headRefOid` = `44d9cbb3…`. PR OPEN, não rascunho, MERGEABLE. O head não andou depois do disparo.
- **Cerca:** o objeto tem 1 pai. `<objeto>~1` é merge (2 pais), e o 2º pai é `c9a2d036` (a merge-base, igual à ponta da `main` remota agora). `git diff --name-status <objeto>~1 <objeto>` traz só os 6 `A`, os 3 corpos `jurado-san322-*` em cada espelho.
- **Mapa das bases (re-medido):** a merge-base dos pais de `<objeto>~9` é `<objeto>~13`, o head-base do backend. `<objeto>~6` = `d7483c28`, o mesmo "Objeto de partida" do relatório do dev, e é o head-base da fatia web.
- **check-runs:** `gh api …/commits/<objeto>/check-runs` dá total=14, todos `completed/success`. São 7 jobs em 2 suítes: `backend`, `backend-postgres`, `frontend`, `docker`, `flutter`, `authority-portal` e `owner-portal`. `gh run list --commit` mostra `ci push completed success` e `ci pull_request completed success`, com os três jobs da E3-17 presentes nos dois gatilhos.
- **PRE-VOO:** os 4 mandatos (cadeira-c1, c2, c3 e inspetor-san322) dão `PRE-VOO OK` com `ec=0`, rodando as ferramentas da pasta `redator-san322/`.
- **sem saída:** pelo awk "linha `medido por:` → bloco ``` não vazio", as unidades sem saída são 0 em 19, 20, 21 e 21. Os caminhos absolutos citados que não existem são só as saídas a criar, os worktrees e as pastas de sonda a criar, e o `RAIZ` `C:/Users/AMP/w-trc02`, que já era declarado ausente. Nenhum insumo falta.
- **corpos:** comparação EOL-neutra, sem o frontmatter e sem o bloco Codex. Os espelhos são IDENTICOS nos 3 (c1 `440ea193`, c2 `7930ff1c`, c3 `e2c9e7ed`). O disco do `w-san322` é igual ao blob nos 3. O `.claude/agents` da sessão (HEAD `539b078e`) não tem os 3 corpos. Por isso as cadeiras têm de nascer como **subagente genérico com o corpo lido do blob do objeto**, que é o que os 3 mandatos mandam ("vale este mandato" onde o corpo divergir). Isso vira a ressalva 1.
- **S0:** `node scripts/sync-agent-agents.mjs --check` rodou no worktree próprio `C:/Users/AMP/j22-insp-wt` (HEAD = objeto, status 0) e deu `OK — 92 agentes, espelho consistente.` com `ec=0`. O conjunto recursivo de `.md` dos dois espelhos é igual (`especialistas/` incluído; o único extra é o README Codex).
- **baseline:** `npm run check` no `w-san322` dá `ec=0`, e `git status` antes e depois fica igual.

## Item 2 de 3 — identidades, papéis, composição, cobertura, briefing — VERDE COM RESSALVAS

- **Inelegíveis (lista regenerada por mim).** Fontes: plano, relatório do dev, `pendencias.md` e comando do bloco, lidos no objeto, mais os `revisoes/` e `prompts/` do bloco fora do repo. Nomes que saem: `planejador-mestre`/`planejador-san322-fable` (Fable, quem planejou), `crit-san322-opus-r1`, `crit-san322-e3-opus`, `dev-san322-sol`, `dev-san322-opus`, `dev-san322-web-opus`, `rev-maq22-sol`, `rev-visual-san322-opus`, `fab-red-san322-opus` e o orquestrador (autor da maquete). A lista do redator não pegava 2 nomes exatos, que só aparecem nos cabeçalhos: **`med-bsan322-pro`** (Gemini 3.1 Pro, a instância da medição inicial) e **`rev2-maquete22-argon`** (Gemini 4 Argon, 2º revisor da maquete). Os mandatos das cadeiras citam os dois só por descrição ("o revisor Argon", "a instância da medição"); ver a ressalva 2.
- **Colisão:** o OBITUÁRIO no objeto tem 0 linhas com `san3-22` ou `maq22`. O `git grep` de `inspetor-san322|jurado-san322-c[123]-(opus|sol)` nas atas `J-*`, nas `reprovacoes/` e em `docs/juntas/` dá 0, tanto no objeto quanto na `origin/main`. Também dá 0 no repo inteiro (fora dos 6 corpos) e fora do repo. Nenhuma identidade da junta (nem `inspetor-san322`, nem `jurado-san322-cN-opus`, nem `jurado-san322-cN-sol`) coincide com quem planejou, criticou, desenvolveu, mediu, revisou, fabricou ou redigiu, nem as identidades da junta entre si. A §C7.4-bis está cumprida por nome.
- **Composição (E3.5 + E3b.5):** cada cadeira tem 3 itens (P4 ok).
  - C1 cobre banco e concorrência (CE-4/5/6/7-db/8-db/10-db/12-db/22/23/24 e E3-22).
  - C2 cobre classificador, contrato e consumidores (CE-18a–g, CE-37, D-W1, REST, E3-20, CE-13/E3-03, CE-33 e `API_CONTRACTS`).
  - C3 cobre tela × referência na lente `cognicao-visual`: CE-30, E3-04…E3-11 nos sub-itens 2.1–2.8, E3-19/Q5, E3b-*, CE-33/36 e D-W2/3/4/5/7/10/12, com `**` declarado.

  A competência que o bloco exige está coberta.
- **Monocultura, DECLARADA:** com Opus, as 3 cadeiras rodam no mesmo modelo de `dev-san322-opus`, `dev-san322-web-opus` e dos 2 críticos. Com Sol, rodam no mesmo modelo de `dev-san322-sol`. As identidades são distintas nos dois casos. Nenhuma cadeira é Gemini, então `D-GEMINI-SEGUNDO-REVISOR` é cumprida. Sobre `D-DESIGN-SO-CLAUDE`, ver a ressalva 3.
- **Cobertura:** a lista do redator, re-executada, dá `faltando: (fim)`, vazio. Meu gerador cruzou todos os 43 `E3-NN`/`E3b-NN` da E3 até a ratificação com os 3 mandatos. Todo critério de produto tem dono: por intervalo (E3-05…10 dentro de "E3-04 a E3-11") ou por equivalência (E3-01/02/21 → CE-33; E3-14 → CE-30; E3-15 → CE-32; E3-16 → bateria da C3; E3b-02 → CE-37; E3b-20 → esqueleto 2.1–2.8). Ficam sem cadeira nomeada só a **E3-18**, que é registro (fechar `P-B-SAN3-22-FRONT-TOKEN-E-3-APARENCIAS` e a linha em `P-APARENCIA-POR-USUARIO`), e os nomes **D-W9** e **D-W11**, cujos temas, a mutação de `userId` do CE-30 e o E3b-08 "forma", estão na C3, mas sem o rótulo. A D-W6 está fechada pela ratificação de 12:30Z. Ver a ressalva 4.
- **briefing:** o plano (com E3, E3-bis, Q5 e a ratificação), o relatório do dev (W1–W9) e a medição são citados nos 3 mandatos de cadeira. As **2 críticas** (`B-SAN3-22-critica-r1.md`, `-E3-critica.md`) e as **3 revisões da maquete** existem, mas nenhum mandato de cadeira as cita (0 menções nos 3). Ver a ressalva 5.

## Item 3 de 3 — terreno — VERDE

- **Árvore** `C:/Users/AMP/w-san322`: HEAD = objeto, 0 rastreado modificado. O único não rastreado é o diretório de votos `B-SAN3-22/`. Não há mutação viva.
- **Resíduo:** 0 container `j22`, 0 pasta `j22` no diretório de pausa e 0 trabalho Docker vivo fora de `erp-*`. O único worktree `j22` é o meu, `j22-insp-wt`, removido no fim (ver a linha de limpeza). Há também `agv3-proxy`, `Exited (0) 22 hours ago`: é resíduo **inerte e alheio**, foi reportado e não foi varrido. A base viva (`erp-postgres`, `erp-redis`) está de pé e é proibida às cadeiras.
- **Isolamento (corpo 1.2), escrito nos 3 mandatos:**
  - worktree próprio por cadeira (`j22-c1-wt`, `j22-c2-wt`, `j22-c3-wt`, cada um só no mandato da própria cadeira), removido por `worktree remove`;
  - `npm ci` próprio e proibição de junction;
  - C1 com Postgres 16 `j22-c1-pg` (superusuário, que a CE-12-db exige) e Redis 7 `j22-c1-redis`, ambos descartáveis, nas portas 47921 e 47922;
  - C2 só com Redis 7 `j22-c2-redis`, porta 47932;
  - C3 sem container, com `vite` na porta 47941 e navegador headless;
  - tudo em `127.0.0.1`, a base viva proibida e cada cadeira derruba o que subiu.

  O `node_modules` do `w-san322` não é junction (`LinkType` vazio).
- **Portas:** 47921, 47922, 47932 e 47941 estão livres. Não há faixa reservada do Windows entre 47000 e 48500. Das proibidas, só 5432 e 6379 estão em uso, pela base viva.
- **Orçamento (P8 (c) e a ordem do orquestrador):**
  - **memória de commit livre:** 13,33 GB, acima dos **4 GB** exigidos;
  - **Docker:** 0 trabalho vivo fora de `erp-*`;
  - **disco:** C: tem **12 GB** livres. Medi o `node_modules` da raiz (~0,41 GB) e o do frontend (~0,18 GB), e a árvore tem 80 MB. As imagens `postgres:16` e `redis:7` já estão locais, sem pull. O custo estimado é ~0,5 GB na C1, ~0,5 GB na C2 e ~0,7 GB na C3 (dois `npm ci`); com as 3 juntas, ~1,7 GB. **Comporta**: o livre fica perto de 10 GB, acima do limite de **7 GB**. Cada cadeira mede de novo antes de subir e PARA abaixo de 7 GB (cláusula presente nos 3 mandatos).
- **baseline honesto:** `npm run check` com `ec=0` (item 1) e CI 14/14 `success` no objeto, nos dois gatilhos.
- **Perda de jurado (corpo 5.1):** os 3 mandatos têm `[P3]` (o sucessor re-executa a evidência do caído), `[P7]`, sucessor de identidade nova e declarada, e "Opus esgotado: PARE sem votar" (§C7.6-bis). A P6 (`00-quedas.md`) fica com o orquestrador.
- **ordem:** a ordem do redator, **C2 → C1 → C3**, está correta. Pela P5, no máximo 2 em paralelo. C2 e C1 juntas dão exatamente 2 trabalhos Docker, que é o teto da P8 (c), e cabem na memória medida. A C3 (sem Docker, a mais pesada em disco e memória) só começa quando uma das duas concluir e derrubar o que subiu. Se a memória cair abaixo de 4 GB ou o disco abaixo de 7 GB, roda-se uma por vez.

## Veredito — LIBERADO COM RESSALVA

Vale para as duas famílias de executor, Claude Opus (`jurado-san322-cN-opus`) e Codex GPT-5.6 Sol (`jurado-san322-cN-sol`). A ressalva 3 restringe a C3 na família Codex.

Ressalvas (o orquestrador as põe em destaque no disparo):

1. **Corpo carregado.** Os 3 corpos `jurado-san322-*` não existem no `.claude/agents` da sessão (HEAD `539b078e`). Cada cadeira nasce como **subagente genérico** e lê o corpo do blob do objeto (`git -C C:/Users/AMP/w-san322 show 44d9cbb3…:.claude/agents/especialistas/jurado-san322-<cN>.md`), declarando IDENTICO pela comparação EOL-neutra. Nunca se dispara pelo tipo da sessão. No Codex vale o espelho `.agents/agents/especialistas/`, idêntico ao blob, descontado o bloco Codex.
2. **Inelegíveis pelo nome exato.** O disparo de cada cadeira acrescenta **`med-bsan322-pro`** (a medição inicial, Gemini 3.1 Pro) e **`rev2-maquete22-argon`** (2º revisor da maquete). Os mandatos só os descrevem. Nenhum dos dois colide com as identidades propostas.
3. **C3 na família Codex.** O mandato da C3 diz "nunca Gemini: julgamento de tela é só Claude, `D-DESIGN-SO-CLAUDE`" e, na mesma frase, admite Codex Sol. Para não contrariar o próprio mandato, a **C3 roda em Claude Opus** (`jurado-san322-c3-opus`) mesmo que C1 e C2 vão para o Codex Sol. Se o orquestrador puser a C3 em Sol, tem de declarar por escrito, no disparo, a leitura de que `D-DESIGN-SO-CLAUDE` só exclui o Gemini (o precedente é `rev-maq22-sol`, que revisou a maquete).
4. **Itens sem rótulo de dono.** A **E3-18** (fechar `P-B-SAN3-22-FRONT-TOKEN-E-3-APARENCIAS` e a linha em `P-APARENCIA-POR-USUARIO`, que é registro) não está em cadeira nenhuma. O disparo da C3 (item 3, registro e escopo) a nomeia, ou o orquestrador a declara conferência própria; pela §C7 item 8(1)(3), registro não é defeito de produto. As divergências **D-W9** (mutação de `userId` do CE-30 não executada) e **D-W11** (o E3b-08 é teste de forma) têm o tema dentro da C3, mas não o nome: o disparo da C3 as nomeia como roteiro de método. A D-W6 está fechada pela ratificação de 12:30Z.
5. **Briefing.** As 2 críticas (`erp-pausa-2026-10-03/revisoes/B-SAN3-22-critica-r1.md` e `B-SAN3-22-E3-critica.md`) e as 3 revisões da maquete (`-maquete-revisao-visual.md`, `-revisao-2-argon.md` e `-revisao-orquestrador.md`) existem, mas nenhum mandato de cadeira as cita. O disparo de cada cadeira as aponta como insumo **A RE-VERIFICAR**. O plano, o relatório do dev e a medição já estão nos mandatos.
6. **Resíduo inerte alheio:** o container `agv3-proxy` está `Exited` há 22 h. Não ocupa nome nem porta da junta. Foi reportado e não foi varrido.
7. **Head que andar** depois deste parecer anula o LIBERADO até um novo pré-voo. O objeto re-medido às 13:36Z é `44d9cbb3874e45340ca43c934364c3d0103c53b8`, pelas duas fontes.

## Limpeza

O que criei para medir foi o worktree `C:/Users/AMP/j22-insp-wt`, removido com `git worktree remove --force` (0 worktree `j22` depois), e os temporários do meu scratchpad, apagados. Não subi container nem rodei `npm ci`, e não toquei na base viva. Os únicos arquivos que gravei são `insp-san322-evidencia.md` e este parecer, sem commit. Às 13:36Z o head remoto continuava `44d9cbb3…`.
