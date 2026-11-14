# Parecer do porteiro pós-merge — PR #561 (B-MOBILE-GATE-CHAVE, item 66)

> **Cópia no repositório** pelo PR de registro de 14/11 tarde (`reg-1411b-cl`), ao lado da ata `J-561-b-mobile-gate-chave.md`. O conteúdo é o do parecer de fora do repositório (`revisoes/j561/porteiro-561-parecer.md`); só os caminhos de máquina foram trocados por descrição. A dívida que viaja entrou neste registro: O1 e O2 viraram a `P-GATE-CHAVE-T4-VARREDURA-SEM-CANARIO` e a `P-GATE-CHAVE-ARNES-ACEITA-PORTA-NA-QUERY`; a linha 66 do `PLANO_SAN3.md` ficou FECHADA; a nota "9 classes" foi corrigida por acréscimo.


- **Papel · modelo que rodou:** porteiro pós-merge (`porteiro-561-cl`), identidade nova · Claude Opus 5.5, nível menor, DECLARADO.
- **Tipo do agente:** `general-purpose`. O tipo `porteiro-pos-merge` não está no registro desta sessão. O corpo foi lido de `origin/main:.claude/agents/porteiro-pos-merge.md` e seguido como mandato.
- **Merge auditado:** squash `e6f3c425754ba217bf43b7138d51bc9a73d12e02`, às 10:40 SP de 14/11 · head aprovado `8fd50887d0b68a2aecc7c083fb111be61c4a1399`.
- **Evidência (P1):** `revisoes/j561/porteiro-561-evidencia.md` (fora do repositório), com o comando e a saída de cada item.
- **Estado:** COMPLETO. Nasceu como esqueleto às 10:47 SP e fechou às 11:23 SP.

## 1. O merge existe e está íntegro
- **Executado:** `git log origin/main -4` e `gh pr view 561`.
  - Resultado: `MERGED`, `mergeCommit` = `e6f3c425…`, `headRefOid` = `8fd50887…`.
- **Executado:** `git rev-parse 'e6f3c425^{tree}' '8fd50887^{tree}'`.
  - Resultado: as duas árvores são `8359aeec20077fe10762edac5c94ae43c5455ef2`.
  - **Iguais:** o squash é byte a byte o head conferido.

## 2. A promessa × o entregue
- **Executado:** `git show --stat e6f3c425`, mais o diff de `src/` e a conferência contra o PERMITIDO e o PROIBIDO do comando do bloco.
  - O diff tem 39 arquivos, todos dentro do escopo. O arnês em `tests/helpers/` está autorizado pela E2.2 e pela triagem da J-561.
  - O servidor só ganhou exports, com os mesmos valores.
  - O registro só cresceu por acréscimo.
- **Achados**, todos não graves:
  - **A2-1:** o corpo do PR (`gh pr view 561 --json body`) ficou no estado de "Rascunho / não está pronto", de antes da junta.
    - Os números dele são antigos: +119, +1360, 9/9 e "canário das 9 classes".
    - Ele não cita o arnês, a ata, o C2B-02/C2B-04 nem as pendências da triagem.
    - A mensagem do squash, que é o que fica no repositório, está correta e completa.
  - **A2-2:** `docs/revisoes/SAN3/PLANO_SAN3.md`, linha do item 66: ainda diz "PR em rascunho; pré-revisão e junta … a seguir".
  - **A2-3:** `agent-orchestration/controle/pendencias.md:13881`: o fechamento da `P-MOBILE-GATE-CHAVE-FORA-DO-CATALOGO` cita o "canário das 9 classes", e o código tem 11.
  - **A2-4 (= O2):** `tests/helpers/mobile-gate-chave-platform-admin.ts:9-11` promete "fora da porta 5432 … qualquer outra coisa sai com RECUSADO".
    - Medi pelo caminho real, sem conectar: trava → `withUtcSessionTimezone` → `ConnectionParameters` do `pg` 8.21.0.
    - Com `?…&port=5432` e com `&host=localhost&port=5432`, a trava **ACEITA**, e o `pg` conectaria na **5432**.

## 3. Os números são reais
Reexecutei num worktree destacado meu, em `e6f3c425`, com `npm ci` e `flutter pub get` próprios:

| O que rodei | Resultado | Reproduz o declarado? |
|---|---|---|
| `npm run check` | exit 0 | sim |
| testes do bloco no backend (`tests/mobile-gate-chave-matriz.test.ts` e `tests/mobile-gate-chave-catalogo.test.ts`, memória) | **11/11** (`# tests 11 # pass 11 # fail 0`) | sim |
| teste Flutter do bloco (`bmobile_gate_chave_test.dart`) | **+126** (T1 63, T3 52, C2B-02 5, T5 5, fixture 1) | sim |
| suíte Flutter inteira | **+1367**, All tests passed | sim |
| `flutter analyze` | No issues found | sim |

- **Não executei** o `npm test` inteiro (precisa de banco e Redis) nem o `dart format` 3.47.5. Os dois estão cobertos pela CI da `main`, logo abaixo.

## 3b. A CI da `main` no `e6f3c425`
- **Executado:** `gh run list --branch main --limit 3`, e esperei a rodada concluir.
- A rodada `ci` push `43600960034` deu **success** às 11:02, na tentativa 1, com 8 de 8 jobs verdes.
- Pelo log de cada job:

| Job | Resultado |
|---|---|
| backend | `5731 / pass 5729 / fail 0 / skipped 2`, com os 11 casos do bloco `ok` (3119–3129) |
| backend-postgres | 621/621 |
| flutter | `Formatted 273 files (0 changed)`, `No issues found!`, `+1367` |
| docker | ok |

## 4. KPI (§C3.5)
- Congelado (`D-GOV-PROPORCIONAL`), e o `Kpis/**` está no PROIBIDO do bloco.
- **Executado:** `git diff --name-only 14b693e4 e6f3c425 -- Kpis/`. Resultado: 0 arquivos.
- Não se cobra.

## 5. A junta (§C7.1) e a conferência `ver-561-cl`
- **A ata:** `agent-orchestration/omega/juntas/J-561-b-mobile-gate-chave.md` existe no squash e é idêntica à de `revisoes/j561` (`diff` vazio).
  - O veredito dela bate com o que aconteceu: a C2b reprovou sem defeito grave; houve triagem, um conserto e a conferência; depois, o merge.
- **O incidente das duas cópias (P1):** a evidência da conferência registra o comando de **cada** item.
  - Os catálogos têm 27, 8, 8 e 4 itens, todos com comando e com a saída guardada em `out/`.
- Ficam **4 inconsistências de redação** na evidência, que não afetam o mergeado (a conferência foi só leitura, e a árvore do squash é a do head):
  - **(a)** as duas cópias se atribuem o `fast shutdown` das 10:20:54 e a API das 10:21:09 de formas que se contradizem;
  - **(b)** a seção `## PAUSA` continua dizendo "cluster não apagado" e "nenhum voto escrito";
  - **(c)** o `exit 137` das 10:27 ficou sem causa; foi restaurado, com blob e md5 conferidos;
  - **(d)** a "re-verificação da O2 pelo `createPrismaClient`" ficou aberta. Eu a fechei: ver A2-4.
- **A O1, reproduzida por mim:**
  - **Controle:** um G6 em `inventory_list_screen.dart` deixa o T4 **vermelho** (`not ok 6`).
  - **Volta:** com a varredura de `lerRegras` estreitada para `[GATES_DART]`, o T4 fica **verde** (6/6), mesmo com o G6 lá.
  - O código entregue está correto; o que falta é o canário.
- **Refazer cadeira:** nenhuma. As regras dos 5 gates não mudaram, e não restou defeito grave.

## 6. Pendências
- **A fechada:** `P-MOBILE-GATE-CHAVE-FORA-DO-CATALOGO`, conferida por amostragem no código.
  - **Executado:** `git grep` das 8 chaves inventadas em `mobile/flutter_app/lib`. Resultado: 0 ocorrências.
  - As 6 chaves das 5 regras existem no `catalog.ts`.
  - **"FECHADA" é verdade.**
- **As abertas:** as 8 (as 3 do dev, as 4 da triagem e a da Emenda 3) estão no `pendencias.md` e no índice. Todas têm dono e gravidade, e nenhuma bloqueia.
- **O1 e O2: SEM DONO E FORA DO REGISTRO.** Busquei em `pendencias.md` (na `main` e na cópia de trabalho) e em `decisoes.md`, e não estão em nenhum dos dois.
  - Só o `status-geral.md` local, não commitado, diz que elas "viram pendências".
  - Esta é a dívida que viaja.

## 7. Limpeza (§C5)
- **O que foi conferido:**
  - a branch remota foi apagada: `ls-remote` vazio, e a API responde 404;
  - não há branch local, worktree (`w-fix561`, `w-ver561`, `w-m16`, `w-gate66*`), cluster (`pg-fix561`, `pg-ver561`, `pg-gate66p`), processo ou porta do bloco;
  - o disco tem 141,9 GB livres, sem necessidade de `DEEP_CLEAN`.
- **Resíduos ALHEIOS**, reportados sem mexer:
  - ` D` de `J-515-b-ass-06.md` e de `reg-noite-0911-dev.md` no checkout principal. Isso é anterior ao merge, e os dois arquivos existem na `origin/main`;
  - 6 branches `api-*` já mergeadas.
- **O meu desmonte:**
  - `git worktree remove --force` do worktree próprio (`w-por561`), exit 0;
  - o `checkup-conclusao.sh por561` respondeu "nada a limpar";
  - não rodei `prune` nem usei curinga.

## 8. O próximo bloco pode começar?
- **Executado:** uma varredura das pendências ABERTAS com `bloqueia:` diferente de "não".
  - Nenhuma veio do #561.
  - Nenhuma nomeia o início dos alvos da fila de retomada: a J-565, o SEC-LOG `wf_522c835a-375`, as emendas P-4 e P-5 do 08c1b, a junta do #566, os devs do 10b e do 17, e o `fix-564`.
- O start não é negado.

## O que viaja como dívida (corrigir no próximo PR de registro)
1. **O1** vira pendência com dono (BAIXA): o canário da varredura de `lerRegras` sobre todo o `lib/`.
   - Critério: com a varredura estreitada para `mobile_gates.dart` e um gate em outro arquivo, o T4 fica vermelho.
   - Dono proposto: o próximo bloco que tocar `tests/mobile-gate-chave-catalogo.test.ts`.
2. **O2** vira pendência com dono (MÉDIA, porque é a trava da base viva): a trava do arnês confere host, porta e banco EFETIVOS do `pg`, ou recusa todo parâmetro de consulta fora de `schema` e `options`. O comentário das `:9-11` fica fiel ao código.
   - Critério: as 2 URLs O2 da evidência dão RECUSA.
   - Dono proposto: o próximo bloco que tocar `tests/helpers/`, ou o `B-FERR-AGENTES`.
3. **A2-2:** a linha do item 66 no `PLANO_SAN3.md` passa a registrar o merge do #561 (`e6f3c425`).
4. **A2-3:** a nota de fechamento da `P-MOBILE-GATE-CHAVE-FORA-DO-CATALOGO` passa de "9 classes" para "11 classes".
5. **A2-1:** o corpo do PR #561 fica como está, porque a mensagem do squash é o registro fiel. Recomendo, sem exigir, uma nota no PR apontando para a ata e para o conserto.

LIBERADO COM RESSALVA: a próxima demanda da fila de retomada (J-565 e seguintes) | no próximo PR de registro: O1 e O2 viram pendências com dono e critério (a O2, trava do arnês que aceita `?port=5432`, é MÉDIA), e a linha 66 do PLANO_SAN3 e a nota "9 classes" da P-MOBILE-GATE-CHAVE-FORA-DO-CATALOGO são atualizadas
