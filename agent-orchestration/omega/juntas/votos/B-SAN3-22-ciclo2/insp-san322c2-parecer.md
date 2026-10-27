# Parecer — inspetor de terreno — B-SAN3-22, ciclo 2 (PR #464)

- Identidade: `inspetor-san322-c2` · executor: subagente Claude Code · modelo: Claude Opus 5.5 · nível menor DECLARADO.
- Objeto: `6b03e44d8136792398f521ccaf85d8dd45168a6d`.
- Veredito: **LIBERADO COM RESSALVA** (6 ressalvas; a 1 é obrigatória no disparo da C2)

## Item 1 de 3 — objeto, CI, mapa, mandatos, corpos, S0
**VERDE.**
- Objeto por duas fontes: `git ls-remote origin refs/heads/fix/checklist-trava-versao` = `gh pr view 464 --json headRefOid` = HEAD do `w-san322` = `6b03e44d8136792398f521ccaf85d8dd45168a6d`; PR OPEN, CLEAN, não rascunho. Não está atrás: `git rev-list --count <O>..origin/main` = 0 (merge-base = origin/main = c9a2d036).
- check-runs: `gh api …/commits/<O>/check-runs` → total=14, 14 `completed success`; `backend`, `backend-postgres` e `frontend` presentes e verdes nos dois gatilhos (`gh run list --commit`: `ci push` e `ci pull_request`, ambos completed success). Nenhum queued/cancelled.
- Mapa re-medido: `<objeto>~8` = 44d9cbb3 = objeto dos 3 votos do ciclo 1 e do R-; `<objeto>~9` merge com 2 pais e 2º pai = merge-base; `<objeto>~21` = b08c7557 (head-base do backend no R-); `<objeto>~14` = d7483c28 (partida da fatia web no relatório do dev). Confere com o mandato.
- PRE-VOO OK nos 4 mandatos (inspetor-san322c2, cadeira-c2r2, cadeira-c1rev, cadeira-c3rev), ec=0, colagem do refs atual; ferramentas iguais às do ciclo 1 e ao ramo salvo a linha `RAIZ`. Toda unidade MEDIDO tem saída colada (22/26/22/22). Dos 103 caminhos absolutos citados, 11 não existem e todos são benignos (prefixo truncado, saída a nascer, sonda apagada citada como histórico).
- corpos: o conserto não tocou `.claude`/`.agents` (`git diff --name-only <O>~8 <O>` = 0); os 3 corpos de cadeira IDENTICOS nos dois espelhos (EOL-neutro, descontado o bloco Codex); blob `<O>~8` = blob `<O>` = disco do w-san322. O diretório da sessão está em `main` 539b078e (não é o objeto) e NÃO tem os 3 corpos → o corpo de cada cadeira tem de vir do blob do objeto, como os 3 mandatos já mandam (ver ressalva 1).
- espelho / S0: `sync-agent-agents.mjs --check` num worktree descartável meu no objeto (`C:/Users/AMP/j22r2-insp-wt`) → OK, 92 agentes, ec=0; removido.

## Item 2 de 3 — regra do §C7 item 9, identidades, papéis, cobertura, briefing
**VERDE, com a monocultura declarada.**
- **regra (1) / arquivos_medidos / interseção.** Recalculei por script meu (`git diff --name-only <objeto>~8..<objeto>` = 25 caminhos × o `arquivos_medidos` de cada voto do ciclo 1, lido do blob):
  - C1 APROVADO, interseção 2 (`checklist.service.ts`, `checklist-template-lock-db.test.ts`): não carrega.
  - C3 APROVADO com `**`: escopo total, não carrega.
  - C2 REPROVADO, interseção 9: vermelha.

  O resultado é igual ao do redator. Nenhuma cadeira CARREGA o voto. A única carga é parcial e fica dentro da C2 refeita: o veredito do CE-33 sobre os hunks do ciclo 1, que só vale "com o comando que prova que eles não mudaram".
- **Composição.** A **C2 é REFEITA pela regra (3)**: mesmo corpo do blob, foco em C2-01, C2-06 e C2-08, mais a regressão dos itens dela. **A C1 e a C3 são REVALIDADAS pela regra (2)**: cada uma re-executa os comandos registrados em `c1-evidencia.md` ou `c3-evidencia.md` do ciclo 1 e mede a cauda nova. Para a C1, a cauda é E4-01 no `-db`, E4-04, E4-05 e E4-06; para a C3, E4-08 e E4-09. Isso confere com a E4.5.
- **P4:** cada mandato tem 3 itens.
- **Inelegíveis por nome.** A lista é igual nos 4 mandatos (21 nomes, mesmo md5) e inclui `dev-san322-c2-opus`, `red-san322-c2-opus` e o orquestrador. Ela cobre:
  - a lista do §4 do R-;
  - TODA linha do bloco no registro de agentes vivos (`agentes-vivos.tsv`, fonte independente);
  - o OBITUARIO, que não tem nenhuma linha do bloco.

  As identidades deste ciclo (`jurado-san322-c2-r2-*`, `jurado-san322-c1-r2-*`, `jurado-san322-c3-r2-opus`, `inspetor-san322-c2`) não coincidem com a lista nem entre si.
- **§C7.4-bis (4-bis).** Os papéis estão separados: quem achou (`jurado-san322-c2-opus`), quem planejou (`planejador-san322-c1rep-fable`), quem desenvolveu (`dev-san322-c2-opus`), quem redigiu (`red-san322-c2-opus`) e quem julga (as identidades r2 novas).
- **Gemini:** nenhuma cadeira. A C3 é só Claude.
- **MONOCULTURA declarada.** No disparo atual, as 3 cadeiras e o inspetor rodam em Claude Opus. O Codex Sol pode assumir a C1 ou a C2 depois de 01:39Z (ver Item 3: ordem).
- **Cobertura.** O comando do mandato re-executado dá `faltando: (fim)`. A lista E4-01…E4-11, GERADA do plano do objeto, também dá `faltando` vazio.
- **Briefing completo.** Os mandatos citam o registro da reprovação, a E4 (plano), o relatório do dev com o ciclo 2 e as evidências do ciclo 1 no objeto. O arquivo do ciclo 1 fora do repositório é igual (EOL-neutro) às cópias do objeto, nos 8 arquivos comparados.

## Item 3 de 3 — terreno
**VERDE COM RESSALVA.** A ressalva 1 é obrigatória no disparo da C2.

**Árvore e baseline.**
- O `w-san322` está no objeto, sem mutação viva: `git status --porcelain --untracked-files=no` dá 0, e o único não rastreado é o diretório do ciclo 2.
- Comparei 4 arquivos centrais do conserto, blob contra disco, EOL-neutro: IGUAL nos 4.
- O `node_modules` da raiz e o do frontend não são junction (`LinkType` vazio).
- Baseline honesto: `npm run check` no objeto deu exit 0. A CI do objeto tem 14/14 em success.

**Resíduo.**
- 0 containers `j22`, `dev-san322`, `jur-` ou `crit-`, e 0 caminhos `C:/Users/AMP/j22*`.
- Nenhum worktree do bloco além do `w-san322`, e 0 pastas `j22r2*`.
- Único container fora de `erp-`: o `agv3-proxy`, parado há 34 h. É inerte e alheio ao bloco; fica reportado, não varrido.

**Isolamento declarado nos mandatos.**

| Cadeira | Worktree | `npm ci` | Containers e portas | Ferramentas do ciclo 1 |
|---|---|---|---|---|
| C2 | `j22r2-c2-wt` | raiz | `j22r2-c2-redis` em 48032 | — |
| C1 | `j22r2-c1-wt` | raiz | `j22r2-c1-pg` e `j22r2-c1-redis` descartáveis, em 48021 e 48022, banco `j22r2_c1` | cópia de `j22-c1o` com worktree, portas, banco, saída e objeto do restauro trocados, e o diff da cópia publicado |
| C3 | `j22r2-c3-wt` | raiz e frontend | nenhum container; `vite` em 48041 | cópia de `j22-c3` com worktree, porta, saída e objeto do restauro trocados, e o diff publicado; o `restore` original nunca roda no lugar |

- Nas três cadeiras: junction proibida, tudo em 127.0.0.1, remoção só por `worktree remove --force`.
- A base viva `erp-` (5432/6379) e as demais portas proibidas ficam fora dos mandatos.
- As portas candidatas estão fora das faixas reservadas (0 faixas em 48000–48100) e sem escuta.
- As imagens `postgres:16` e `redis:7` já são locais, sem pull.

**Recursos agora (01:3xZ).**
- Commit livre: **9,09 GB**, acima do mínimo de **4 GB** da P8 (c).
- Trabalhos Docker fora de `erp-`: 0.
- disco: **10,1 GB livres**. A medida oscilou nesta sessão (7,7 → 7,8 → 11 → 10 GB): há outro consumidor no disco.

**Disco por cadeira, medido.** A árvore tem 80 MB, o `node_modules` da raiz 447 MB e o do frontend 197 MB. Daí:

| Cadeira | Custo estimado |
|---|---|
| C1 | ≈ 0,65 GB (com os dados do PG) |
| C2 | ≈ 0,55 GB (0,75 GB se instalar o frontend) |
| C3 | ≈ 0,8 GB (dois `npm ci`) |
| As 3 juntas | ≈ 2,2 GB |

**Ordem.**
- **Com 10 GB, a ordem da E4.5 cabe:** C2 e C1 em paralelo (2 trabalhos Docker, que é o teto; 2 em paralelo pela P5; 2 subagentes Claude, com o inspetor já encerrado) deixam ≈ 8,7 GB.
- **A C3 entra depois** que uma das duas concluir e remover o worktree dela, e o disco fica em ≈ 8,4 GB.
- **Com os ~7,7 GB do instante da redação, NÃO cabe:** uma cadeira sozinha já baixaria para ≤ 7,15 GB, abaixo do piso de 7,5.
- **Regra de lançamento:** antes de cada cadeira, medir o livre e lançar só se livre ≥ 7,5 GB + custo da cadeira. Isso dá ≥ 8,9 GB para C2 + C1 em paralelo, ≥ 8,2 GB para a C1 sozinha, ≥ 8,1 GB para a C2 e ≥ 8,3 GB para a C3.
- **Se não houver espaço para o paralelo:** uma cadeira por vez, na ordem **C2 → C1 → C3**, cada uma derrubando os containers e o worktree antes da seguinte.
- **Abaixo de 7 GB, PARE.**

**P3 e perda de jurado.** Os três mandatos trazem P3 (sucessor de identidade nova re-executa a evidência do caído), P7 e "esgotado o modelo declarado, PARE sem votar" (§C7.6-bis). A queda vai para `00-quedas.md` do ciclo 2 pela P6.

**Ressalva das ferramentas da C2 (a ressalva 1).**
- Os scripts `j22-c2/ce13.sh`, `ce13b.sh`, `drill.sh` e `silent.sh` têm FIXOS o worktree `C:/Users/AMP/j22-c2-wt`, o Redis na porta 47932 e `OBJ=44d9cbb3…`, que é o objeto do ciclo 1.
- O restauro deles é `git checkout -q $OBJ -- tests`, `-- src/modules/checklists` e `-- "$f"`.
- O mandato `cadeira-c2r2.md` (l.399) cita esses scripts só como roteiro, "instrumento seu", e não declara os valores fixos.
- **Risco:** uma cópia com só o worktree trocado restauraria sobre o worktree da C2 os testes e o `checklist.service.ts` do ciclo 1, e a C2 mediria código antigo sem perceber. Rodar no lugar falha fechado, porque o worktree não existe.

## Veredito
**LIBERADO COM RESSALVA**, para as duas famílias de executor:
- **Claude Opus:** C2, C1 e C3, agora.
- **Codex GPT-5.6 Sol:** só a C1 ou a C2, depois de 01:39Z. Os mandatos dessas duas aceitam Sol; a C3 é só Claude. O Codex lê o corpo do blob, e os espelhos `.agents` e `.claude` são IDENTICOS.

O tabuleiro está limpo. A junta pode começar, desde que as ressalvas abaixo entrem em destaque no briefing.

**Ressalvas:**
1. **Obrigatória no disparo da C2.** Os scripts `C:/Users/AMP/erp-pausa-2026-10-03/j22-c2/{ce13,ce13b,drill,silent}.sh` restauram do objeto do ciclo 1 (`OBJ=44d9cbb3…`), com worktree `j22-c2-wt` e porta 47932 fixos.
   - Se a C2 reaproveitar qualquer um, copia para a pasta própria (`j22r2-c2/`) e troca o worktree, a porta **e o OBJ** (para `6b03e44d…`), publicando o diff da cópia na evidência.
   - Nunca roda o script no lugar.
   - O disparo da C2 tem de dizer isso em uma linha. Sem essa linha, a C2 não começa.
2. **Disco é condição de lançamento, não fato desta hora.** Hoje há 10,1 GB, e a medida oscilou entre 7,7 e 11 GB nesta sessão.
   - Lançar só com livre ≥ 7,5 GB + o custo da cadeira: C2 + C1 em paralelo ≥ 8,9 GB; C1 ≥ 8,2 GB; C2 ≥ 8,1 GB; C3 ≥ 8,3 GB.
   - Sem espaço para o paralelo: uma por vez, na ordem C2 → C1 → C3, derrubando containers e worktree entre elas.
   - Abaixo de 7 GB, PARE.
   - A memória de commit livre (≥ 4 GB) e o teto de 2 trabalhos Docker também se medem de novo a cada lançamento.
3. **MONOCULTURA.** Se as 3 cadeiras rodarem em Opus, a ata registra isso. Uma troca da C1 ou da C2 para o Sol quebra a monocultura e é permitida.
4. **O diretório da sessão não serve de fonte para os corpos.** Ele está em `main` 539b078e, não no objeto, e não tem os 3 corpos de cadeira. Cada cadeira carrega o corpo do blob do objeto (os mandatos já mandam) e declara IDENTICO/DIVERGE na 1ª linha da evidência (§A7).
5. **O prompt do meu disparo citava o objeto do ciclo 1.** Ele mandava criar o worktree do inspetor em `44d9cbb3…`, que é o `<objeto>~8`. Medi no objeto do ciclo 2 (`6b03e44d…`), que é o julgado. O orquestrador confere que o disparo das cadeiras cite `6b03e44d…`.
6. **Head que andar invalida a liberação.** Se o head do PR #464 sair de `6b03e44d…` antes da junta, este parecer cai: pré-voo e inspeção de novo.

**Limpeza:**
- O worktree descartável `C:/Users/AMP/j22r2-insp-wt` foi criado e removido por `git worktree remove --force`.
- Nenhum container, nenhum `npm ci`, nenhuma base viva.
- Os temporários meus no scratchpad da sessão (`cruz.mjs`, `inel-*.txt`, `check.log`) foram apagados.
- No `w-san322` escrevi apenas `insp-san322c2-evidencia.md` e `insp-san322c2-parecer.md` (sem commit).
