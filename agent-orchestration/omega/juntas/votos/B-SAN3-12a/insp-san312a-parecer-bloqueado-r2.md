# Parecer — inspetor de terreno — B-SAN3-12a (PR #459, ciclo 1, junta de DINHEIRO)

- Papel: `inspetor-de-terreno-da-junta` · identidade `inspetor-san312a-opus` (nova) · executor: subagente genérico (o tipo não está carregado nesta sessão; corpo lido do blob do objeto, EOL-neutro IDENTICO `cbbed450…`) · modelo **Claude Opus 5.5, nível menor DECLARADO**, cobrindo o Codex.
- Objeto: `5efc99e26144fd83c76be49200e0ba6f4ff4cf1e` (merge da `origin/main` no ramo `feat/web-financeiro-baixa-e-contas-12a`) · mandato `inspetor-san312a.md`, md5 sem CR `8ad2e6860c556c76c0428e17ad7bff92`, PRE-VOO OK.
- Régua: dinheiro + permissão → unanimidade de 3 com veto; ciclo 1 (§C7 item 8(1)(2)); `arquivos_medidos` em todo voto (§C7 item 9 (0)). Os comandos e as saídas estão em `insp-san312a-evidencia.md`.

## Item 1 de 3: objeto, CI, delta, merge, mandatos, corpos, S0. VERDE
- O objeto foi resolvido por 3 fontes (`git ls-remote`, `gh pr view 459` e o HEAD do worktree): todas dão `5efc99e2…`. O PR está OPEN, não é rascunho e está `MERGEABLE CLEAN`.
- O objeto é um merge com 2 pais.
  - A cerca é `<objeto>~2`. Da cerca ao 1º pai há 1 commit, que traz só os 6 corpos (`jurado-san312a-c{1,2,3}` nos dois espelhos). Nenhum caminho fica fora.
  - O head-base do bloco é `<objeto>~13`, que é a merge-base dos dois pais. A merge-base com a `origin/main` é o 2º pai, `b2f8e6cf`, que é a `origin/main` de agora.
- O merge não tem conteúdo próprio. O objeto, comparado com o merge automático (`git merge-tree --write-tree O^1 O^2`), difere só em 4 arquivos de registro. Nos arquivos de append, nenhum pai perde linha. As 2 linhas do 1º pai que saem do `pendencias.md` são linhas que a própria `main` tirou ("fora das que a main tirou" = 0).
- check-runs (`gh api …/commits/<objeto>/check-runs`): 14 no total, todos concluídos e todos `success`. São 7 jobs, em 2 runs: `ci pull_request completed success` e `ci push completed success`.
- A trava `migration-transaction-guard.mjs` do #458 está no objeto e não estava no 1º pai. Executada, deu `migrações: 117 · novas: 5 · violações: 0` (ec=0). A migração do bloco, `<carimbo>_grant_finance_unreconcile_and_cheque_unlink_permissions`, aparece como nova, com 0 violação. É fato do terreno para a C3.
- Pré-voo dos 4 mandatos: `PRE-VOO OK`, ec=0 em todos. Os md5 conferem com o redator r2. Nenhuma unidade MEDIDO está sem saída colada: c1 19/0, c2 21/0, c3 21/0, inspetor 23/0.
- Espelho: os 3 corpos são IDENTICOS entre `.claude` e `.agents` no blob, EOL-neutro e sem o bloco Codex. O disco do worktree é igual ao blob. **No diretório da sessão os 3 corpos estão AUSENTES.** Por isso cada cadeira só pode rodar como subagente genérico que lê o corpo do blob do objeto, nunca por `subagent_type`.
- S0: rodei `sync-agent-agents.mjs --check` num worktree descartável meu, `C:/Users/AMP/j12a-insp2-s0`. Saída: `OK — 88 agentes, espelho consistente.` (ec=0). O worktree foi removido.
- O objeto da junta é este merge. **Head que andar depois dele bloqueia até novo pré-voo.**

## Item 2 de 3: identidades, papéis, composição, cobertura, briefing. VERMELHO
- **Inelegíveis.** Regenerei a lista por comando meu e ela bate com a do mandato: `planejador-mestre`, `planejador-san312-e1-fable`, `crit-san312-pro`, `crit-san312-opus-r2`, `crit-san312-pro-r2`, `crit-san3-12-r2-pro`, `crit-san312a-e1-opus`, `dev-san312a-opus`, `fab-red-san312a-opus`, `redator-san312a-r2-opus` e o orquestrador. As 4 identidades da junta não colidem com nenhum desses nomes nem entre si. Elas também não aparecem no `OBITUARIO-IDENTIDADES.md` (0) nem em `J-*` ou `R-*` (0).
- **Separação de papéis (§C7.4-bis).** Quem achou (os críticos, e o dev nas F1 a F9) ≠ quem planejou (topo Fable) ≠ quem desenvolveu (`dev-san312a-opus`) ≠ quem julga. O dev achou as F1 a F9 e implementou a E1, mas o plano da correção é de outra identidade e passou por crítica. Isso não é ciclo de reprovação e não colide com quem julga.
- **Monocultura, declarada.** As 4 identidades rodam em Claude Opus, o mesmo modelo do dev e do crítico da E1. O §10 do plano punha Codex Sol na C2, e o Codex está sem limite: a divergência está declarada. Nenhuma cadeira é Gemini, então a `D-GEMINI-SEGUNDO-REVISOR` está cumprida.
- **Briefing presente.**
  - No plano: a Emenda E1 e a E1-bis.
  - No relatório do dev: as etapas E10 a E14.
  - As críticas r1, r2, v2 e a da E1.
  - As divergências §A2 registradas nos 3 mandatos e nos 3 corpos.
- **Cobertura da E1b.6 (piso).** Completa: C1 com A27, A28 e D1; C2 com A27 por ator, A6-bis, D1, F5, A7 e B2; C3 com B1, B2, F3, A17-bis e os 409 do A27 no contrato.
- **Cobertura dos R-res e do §12.1 (o mandato manda: "sem dono bloqueia o start").** Estão cobertos o R-res-1 (C1), o R-res-2 (C2 item 3, mutação Rres2), o R-res-3 (C1), o R-res-7 (C2 item 2) e o A5, que fecha a `P-SAN3-20-DESVINCULAR-DEPOSITADO` (C2 item 1). Os R-res-6 e R-res-8 são do 12b. **Ficam sem cadeira dona, nos 3 mandatos e nos 3 corpos:**
  1. **R-res-5.** O agregado novo `GET /financial-entries/aggregate` usa `$queryRaw` para o bucket diário. Ele só não vaza entre organizações se rodar dentro de `withTenantRls`; o próprio diff diz: "fora dela a RLS não filtraria (R-res-5)". O plano diz "Quem mede: C2", com teste cross-tenant e a mutação que tira o `withTenantRls`. O A14 (paridade e "cross-tenant não vaza") também caiu. É risco de **vazamento entre organizações** e não tem jurado.
  2. **R-res-4 e A13.** O R-res-4 é o ABA residual do CAS da conciliação, e o A13 é o `reconciliation_stale` 409, que é invariante de dinheiro. O plano diz "Quem mede: C3, opcional". O corpo da C1 diz que o A13 e o A14 "só entram se o mandato o nomear", e nenhum mandato os nomeia. Não há cadeira nem registro de que não serão medidos.
  3. **A21 (`P-SAN3-20-DELETE-TITULO-COM-CHEQUE`, §12.1).** O A21 é o `PATCH {amount}` e o `DELETE` de título com cheque pendente → 422 `title_has_pending_cheque`. Nenhum mandato o mede; o item 2 da C3 só delimita o hunk do serviço de títulos.
  4. **A16 (`P-SAN3-20-RESUMO-CHEQUE-VINCULADO`, §12.1).** O A16 é o `linkedPendingAmount` do resumo. O corpo da C3 diz "A16 não está nos seus itens", e nenhum mandato o mede.

  O índice diz que as duas pendências do §12.1 "mudam no merge do 12a, pelo porteiro". Então o critério delas precisa ser julgado antes do merge. Hoje os testes delas só passam como regressão dentro do `npm test` da C3, sem mutação nem vermelho-controle de cadeira.

## Item 3 de 3: terreno. VERDE COM RESSALVA
- O worktree `C:/Users/AMP/w-san312a` está no objeto, com 0 modificação rastreada. O único não rastreado é o diretório de votos desta junta. O `node_modules` é um diretório comum, sem junction (`fsutil reparsepoint query`).
- Baseline honesto: `npm run check` (`tsc --noEmit`) com ec=0, medido por variável. A árvore continuou limpa depois.
- Resíduo:
  - Nenhum container `j12a*`, `jur-*` ou `crit-*`, e nenhum caminho `C:/Users/AMP/j12a*`.
  - O `agv3-proxy` está parado (Exited). É alheio e inerte.
  - Os worktrees `w-agapi2`, `w-med03` e `w-san322` são alheios: reportados, não varridos.
- Docker: 1 trabalho vivo fora de `erp-*` (`dev-san322-pg` em 127.0.0.1:55432 e `dev-san322-redis`). **Com a cadeira, ficam 2, que é o teto.** Se surgir um terceiro, a cadeira espera.
- Disco C: 12 GB livres (≥ 7). Memória de commit livre: 14,15 GB (≥ 4 GB, P8 (c)). O `du` do `node_modules` não concluiu em 120 s, e por isso **o tamanho de um `npm ci` não está medido**. A C3 faz dois `npm ci` (`j12a-c3-wt` e `j12a-c3-wtb`) e tem de re-medir o disco antes de cada um; abaixo de 7 GB, PARE.
- Portas dos mandatos: 47713 e 47714 (C1), 47723 e 47724 (C2), 47733 e 47734 (C3). Todas estão fora das faixas reservadas do Windows e sem escuta. Ficam proibidas 5432, 6379, 3000, 5173, 5050, 8899, 55432, 55412 e 55413, e a base viva `erp-*` não é alvo de ninguém.
- O plano de isolamento está escrito nos 3 mandatos:
  - worktrees `j12a-c1-wt`, `j12a-c2-wt`, `j12a-c3-wt` e `j12a-c3-wtb`;
  - `npm ci` próprio e junction proibida;
  - containers `j12a-c1-pg`, `j12a-c1-redis`, `j12a-c2-pg`, `j12a-c2-redis`, `j12a-c3-pg` e `j12a-c3-redis`, só em 127.0.0.1;
  - derrubada do que cada cadeira subiu antes da seguinte.
- Plano de perda de jurado: sucessor P3 com identidade Opus nova e declarada; Opus esgotado = PARA (§C7.6-bis). A P5 fica mais estreita pela ordem do dono: **uma cadeira por vez**.
- **Ordem aprovada: C2 → C1 → C3.** A C3, a mais pesada (dois worktrees e a suíte inteira duas vezes), vai por último, depois que C1 e C2 derrubaram o que subiram.

## Veredito
**BLOQUEADO.** O terreno está limpo (itens 1 e 3), mas o tabuleiro está incompleto: há quatro critérios do 12a sem cadeira que os julgue (item 2). Para limpar, o orquestrador faz uma de duas coisas, e não me cabe escolher:

- **Dar dono.** Põe cada um dos 4 critérios num mandato de cadeira, respeitando o limite de 3 itens (P4) e o pré-voo de novo: R-res-5 e A14 (cross-tenant do agregado, com a mutação do `withTenantRls`); R-res-4 e A13; A21; A16.
- **Registrar.** Registra em `agent-orchestration/controle/`, com §A2 e dono, que esses critérios não são julgados por esta junta, e por quê. Para o R-res-5, que é vazamento entre organizações num bloco de unanimidade, recomendo dar cadeira, não só registrar.

Depois disso, me chamem de novo, ou chamem outra identidade de inspetor: muda mandato, então há novo pré-voo.

**Ressalvas para o briefing quando for liberado:**
- Monocultura Opus.
- Docker no teto com o `dev-san322` vivo.
- Tamanho do `npm ci` não medido, a ser re-medido pela C3.
- Corpos ausentes no diretório da sessão: cada cadeira roda como subagente genérico que lê o blob.
- Head que andar depois do objeto bloqueia.

Sobre a `P-SAN3-12A-PLANO-FALSIFICADO-ESCOPO`, que o porteiro do #460 pôs como bloqueio **do merge**: ela tem dona, o item 2 da C3. Ela não bloqueia o start da junta, e o fechamento dela é matéria de mérito da C3.

Limpeza: criei e removi o worktree `C:/Users/AMP/j12a-insp2-s0`. O log temporário do `check`, no scratchpad, foi apagado. Não subi container, não toquei arquivo rastreado e não commitei.

BLOQUEADO
