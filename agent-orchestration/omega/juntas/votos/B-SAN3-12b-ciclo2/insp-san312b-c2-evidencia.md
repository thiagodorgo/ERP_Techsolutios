executor=inspetor-san312b-c2-sol | modelo=Codex GPT-5.6 Sol | nível=menor DECLARADO | objeto=e77a5ac14e6ca8021ee5fb5ff4ba2f839675ead2 | mandato_md5=6936654a62aa2d1da75ce1de6f68493f | corpo carregado × blob=IDENTICO (EOL-neutro)

# Evidência incremental — inspeção de terreno B-SAN3-12b ciclo 2

Objeto sob inspeção: `e77a5ac14e6ca8021ee5fb5ff4ba2f839675ead2` (PR #469).
Papel: inspetor de terreno; não julga mérito.

## Item 1 — objeto, CI, árvore, recursos e S0 — VERDE

**Comandos executados (Git Bash `-lc`):** `gh pr view 469 --json ... --jq ...`; `git ls-remote origin refs/heads/{feat/web-financeiro-baixa-e-contas,main}`; `git merge-base`/`--is-ancestor`; `gh api repos/thiagodorgo/ERP_Techsolutios/commits/e77a5ac1.../check-runs --jq ...`; `git status --porcelain --untracked-files=no`; `git rev-parse -q --verify MERGE_HEAD`; `df -Pk /c`; consulta de memória de commit pelo PowerShell chamado de dentro do Bash; `git worktree add --detach C:/Users/AMP/j12b2-insp-wt e77a5ac1`; `node scripts/sync-agent-agents.mjs --check`; comparação EOL-neutra dos três corpos especialistas descontando frontmatter/preambulo Codex; `git worktree remove --force`.

**Saída resumida:** PR #469 `OPEN`, `isDraft=false`, `MERGEABLE`; head do PR e ramo remoto = `e77a5ac14e6ca8021ee5fb5ff4ba2f839675ead2`. `origin/main` remoto = merge-base = `f076973921539165df8d406b8c061dbf4e4ee127`, ancestral do objeto. Check-runs: `14`, pendentes `0`, conclusões não-success `0`; `backend`, `backend-postgres` e `frontend` têm 2 runs cada, todos `completed/success`. Worktree nomeado: head correto, `0` mudanças rastreadas, nenhum merge em curso. Recursos: `12,66 GB` livres em C (piso `7,5 GB`) e `13,26 GB` de memória de commit livre (piso `4 GB`). S0: `[agents-sync] OK — 95 agentes`; os três corpos julgados são `IDENTICOS` aos espelhos Codex após normalização EOL e retirada do preâmbulo; worktree descartável removido (`exit 0`, alvo ausente).

**Nota de execução:** a primeira formulação tentou `jq`, ausente no Git Bash, e comparou indevidamente os arquivos inteiros dos espelhos (incluindo o preâmbulo Codex); não foi usada como evidência. A reexecução acima usou `gh --jq` e a comparação canônica de corpos, terminando `ITEM1_FAIL=0`.

**Veredito parcial:** VERDE. Objeto/CI/árvore/recursos/S0 permitem prosseguir à inspeção do briefing.

## Item 2 — briefing, composição e identidades — VERDE

**Comandos executados (Git Bash `-lc`):** quatro execuções de `mandato-preflight.sh <mandato> 469`, com `MANDATO_REFS=.../mandato-refs.sh`; `git show e77a5ac1:<caminho>`/`git cat-file` sobre o R- §4, plano versionado, relatório do dev, votos e evidências C1/C2/C3; contagens por `grep`; `git rev-parse e77a5ac1~13`; `git diff --name-only e77a5ac1~13..e77a5ac1 -- <arquivos_medidos C2>`; leitura PRIMEIRA do `OBITUARIO-IDENTIDADES.md` e depois `git grep` nominal no objeto; comparação EOL-neutra dos quatro corpos já registrada no item 1.

**Saída resumida:** os quatro mandatos retornaram `PRE-VOO OK`. O R- §4 existe e determina C1/C3 refeitas e C2 revalidada; votos anteriores: C1 `REPROVADO`, C2 `APROVADO`, C3 `REPROVADO`, todos com `arquivos_medidos`, `o_que_executei` e evidência presentes. `e77a5ac1~13` = objeto original `fc5ead6c...`; o diff até o objeto novo intersecta `15` caminhos do escopo medido pela C2, logo o verde não pode carregar e exige regra (2), identidade nova e reexecução dos comandos. O plano do objeto contém 2 cabeçalhos de ratificação que materializam 3 ajustes (arquivo permitido; F4=32; F8-trava), uma E2 com 7 subseções e R1–R14. O relatório tem RETOMADAS 1–9, referências D-1 a D-9 e **zero** marcador `D-C2`; portanto a nomenclatura válida é R1–R14/D-1–D-9, sem norma fabricada.

**Identidades e composição:** C1 `jurado-san312b-ciclo2-c1-opus`, executor Claude Opus (autorização explícita do dono e `D-DESIGN-SO-CLAUDE`); C2 `jurado-san312b-c2-r2-sol`, Codex GPT-5.6 Sol; C3 `jurado-san312b-c3-r2-sol`, Codex GPT-5.6 Sol; inspetor `inspetor-san312b-c2-sol`. Nenhum consta como `SEPULTADA`/`RESERVADA` no obituário; nenhum coincide com planejadores, críticos, devs (incluindo todos os executores das RETOMADAS 1–9), fábrica/redatores, inspetor anterior, jurados do ciclo 1 ou orquestrador. A única ocorrência prévia do nome da C1 é a **reserva nominal no próprio plano do ciclo 2**, não uso anterior. Corpos do inspetor/C1/C2/C3: `IDENTICOS` ao objeto em comparação EOL-neutra (os especialistas foram comprovados no item 1).

**Veredito parcial:** VERDE. Composição correta para junta de DINHEIRO, unanimidade de 3; ciclo 2 é o último em que achado não grave reprova.

## Item 3 — isolamento, ordem e plano de perda — VERDE COM RESSALVA

**Comandos executados (Git Bash `-lc`):** `grep` dos três mandatos por worktree/dependências/junction/banco/portas/limiares/P1–P7; `find` do diretório de votos e da árvore por artefatos de cadeira/probes; testes de existência dos três worktrees; `git worktree list --porcelain`; `git status --short`; `df -Pk /c`; memória de commit; `Get-NetTCPConnection` chamado de dentro do Bash para portas 48121–48125.

**Saída resumida:** nenhum artefato de cadeira existe antes do start (`chair_outputs_present=0`), nenhum dos três worktrees nomeados existe/está registrado (`named_worktrees_present=0`), nenhum `jur-probe*`/`*-probe.ts[x]` solto (`loose_probes=0`) e nenhuma mutação rastreada; só o diretório de mandatos/inspeção está untracked. Os mandatos exigem worktrees exclusivos detached no objeto, dependências próprias, zero junction, portas altas em `127.0.0.1`, teardown e pisos de `7,5 GB`/`4 GB`. Portas 48121–48125 livres. Recursos finais: `12,65 GB` de disco e `13,21 GB` de memória de commit.

**Plano vinculante de isolamento:**

- C1: `C:/Users/AMP/j12b-c2-c1r2-wt`, Claude Opus; dependências próprias/zero junction; servidor local `127.0.0.1:48121`; **sem banco**.
- C2: `C:/Users/AMP/j12b-c2-c2rev-wt`, Codex GPT-5.6 Sol; dependências próprias/zero junction; backend somente em memória em `127.0.0.1:48122` (frontend/sonda, se necessário, `48123`), Redis apontado a porta fechada; **sem Docker e sem base viva**.
- C3: `C:/Users/AMP/j12b-c2-c3r2-wt`, Codex GPT-5.6 Sol; dependências próprias/zero junction; usa `backend-postgres` concluído como insumo. Este mandato proíbe Docker/base viva nesta inspeção; se a cadeira optar por recurso local, só recurso descartável próprio autorizado no start, nome exclusivo e porta `48124` (app `48125`), nunca `erp-postgres`, com teardown. Não é requisito para iniciar/votar pela forma atual.

**Ordem compatível com “uma tarefa de cada braço por vez”:** braço Codex: C2 e depois C3, nunca simultâneas. Braço Claude: C1 pode correr junto com C2. Como o disco medido garante com folga **uma** cadeira, mas não prova o custo combinado de duas instalações próprias, a forma segura é: iniciar C1; medir novamente após suas dependências; iniciar C2 em paralelo somente se ainda houver `≥7,5 GB` e `≥4 GB`; caso contrário terminar/derrubar C1 antes de C2; C3 só depois do teardown de C2. Toda cadeira revalida os pisos imediatamente antes de criar dependências/processos.

**Plano de perda:** cada cadeira cria `*-evidencia.md` e `*-voto.json` esqueleto (`EM APURAÇÃO`, `arquivos_medidos`) antes de medir; P1 após cada item, P2 antes da mensagem, máximo 3 itens (P4), P7 em pausa. Queda vai para `00-quedas.md`; sucessor de identidade nova reexecuta cada comando registrado (P3) antes da cauda. Ausência atual de `00-quedas.md` significa zero queda antes do start, não omissão do plano.

**Veredito parcial:** VERDE COM RESSALVA 1 — paralelismo C1+C2 é permitido por braços, mas condicionado à rechecagem dos pisos após a primeira instalação; com o espaço atual, a única capacidade incondicionalmente provada é uma cadeira por vez.

## Veredito final — LIBERADO COM RESSALVA

1. **Disco/paralelismo:** não lançar a segunda cadeira concorrente sem revalidar `disco ≥7,5 GB` e `memória de commit ≥4 GB` depois de materializar as dependências da primeira. Se o piso cair, executar totalmente em série.

O tabuleiro está limpo para o start sob essa trava. Junta de DINHEIRO: unanimidade de 3; ciclo 2 é o último em que achado não grave reprova. Nenhuma cadeira começa sem ler este parecer.

**Limpeza:** o único worktree criado pelo inspetor (`C:/Users/AMP/j12b2-insp-wt`) foi removido por `git worktree remove --force`; alvo ausente, nenhum container/Docker/base viva invocado e nenhum temporário de sonda deixado.
