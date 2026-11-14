# Parecer do porteiro pós-merge — PR #564 (B-SAN3-15b, itens 35 e 36)

> **Cópia no repositório** pelo PR de registro de 14/11 tarde (`reg-1411b-cl`), ao lado da ata `J-564-b-san3-15b.md`. O conteúdo é o do parecer de fora do repositório (`revisoes/j564/porteiro-564-parecer.md`); só os caminhos de máquina foram trocados por descrição. As ressalvas PORT564-01 a 05 entraram neste registro como diz o pós-junta da ata.


**Papel · modelo:** porteiro pós-merge (`porteiro-564-cl`) · Claude Opus 5.5, DECLARADO. Corpo lido às 12:48 SP de
`origin/main:.claude/agents/porteiro-pos-merge.md`. Nasci como `general-purpose`, e isso fica declarado. Sem cruzamento.
**Objeto:** o squash `eeac48a35e2bcfa81609c376965de0248a5d8f74` (12:47:30 SP, 14/11) e o head conferido `6bb27da9`.
**Evidência:** `porteiro-564-evidencia.md`, nesta pasta, com comando, saída e veredito de cada item.
**Esqueleto** às 12:49 SP; **preenchido** às 13:22 SP (medido com `date`). Não consertei nada.

## 1. O merge está íntegro
- O PR #564 está `MERGED`, com o `mergeCommit` `eeac48a3`, que é a `refs/heads/main`. O `headRefOid` é `6bb27da9`.
- **A árvore do squash é a árvore do head:** as duas dão `5f7ec8b5…`. O pai é o `e6f3c425` (#561), que é ancestral do head.
- A `main` não andou durante a verificação (`eeac48a3` às 13:20).

## 2. Promessa × entregue
- P7, P8, P9, P11, a opção A e os consertos C3-01, C3-02 e C3-03 estão no código, com arquivo:linha na evidência.
- `.has(` em `lib/`: 0. Os caminhos que o corpo diz intocados (`prisma/**`, `.github/**`, `Kpis/**`, `router.dart`,
  `sync_providers.dart` e `sync_replay_service.dart`): 0.
- **PORT564-01 (registro, BAIXA):** o corpo do PR parou no `598f972b`. A tabela das fatias não tem os 7 commits do
  conserto e da fusão, e a seção de CI ainda dá `5558` e `+1312`. A mensagem do squash lista os 16 commits, então a
  `main` tem o registro; só o corpo do PR ficou velho.

## 3. Os números, reexecutados num worktree MEU (`w-port564`, destacado em `eeac48a3`, com `npm ci` e `flutter pub get` próprios)
| O quê | Reexecutado | Declarado |
|---|---|---|
| a suíte Flutter inteira | **`+1444: All tests passed!`** (12:50-12:55) | `+1444` |
| os 8 arquivos novos do bloco | **`+77`** | 71 + 6 = 77 |
| os arquivos tocados e as guardas (b119, b120, migrações, `bsan319b_*`, `bmobile_gate_chave`) | **`+186`** | — |
| o servidor do bloco (`bsan315-service-kind`) | **4/4** | 4 |
| `npm run check` | **exit 0** | verde |
| o T2 do #561, 3 vezes | **5/5, 5/5 e 5/5** | instável |

- **A C3 refeita, reexecutada:**
  - a sonda de estados, com as 54 capturas da C3B como referência de pixel, deu **`+28`, com as 54 telas idênticas**;
  - o C3B-01 se reproduz (20 leituras do texto genérico, nas 10 situações × 2 larguras), e o C3B-03 também;
  - a sonda de fluxo deu `+1`, e o C3B-02 se reproduz (`seta_voltar=0`, nada se perde);
  - a sonda do servidor deu **0 divergências**: o botão nunca fica ativo onde o servidor recusa. **Nenhum grave.**
- **A CI da `main` no `eeac48a3`** (rodada 43612069075, push, concluída às 13:07 SP) deu **8/8 `success`**. Pela linha de
  resumo: backend 5735/0 falhas/2 pulos, backend-postgres 621/0, Flutter `+1444` com formato e analyze limpos,
  frontend 1806/0 e antivirus 8/0. Bate com a CI do head.

## 4. KPI
Não há nada a cobrar: a `D-GOV-PROPORCIONAL` (5) congela o KPI (`CLAUDE.md:833`), e o PR não toca `Kpis/**`. A última
entrada do histórico (#559) tem os 3 campos preenchidos.

## 5. O registro da junta
- **PORT564-02 (registro, MÉDIA):** a ata existe (`agent-orchestration/omega/juntas/J-564-b-san3-15b.md`), mas para na
  triagem das 08:37. Nem ela nem a cópia local registram o que veio depois:
  - o conserto `fix-564-cl`;
  - a conferência `ver-564-cl` (CONFERIDO COM RESSALVA, VER-564-01);
  - a conferência visual do orquestrador (CONFERIDA);
  - a C3 refeita `j564-c3b-cl` (REPROVA, com 3 não graves e nenhum grave);
  - a triagem pelo §C7 10(4) e o merge.

  O único registro escrito disso é a linha das 12:48 do `REGISTRO-PENDENTE.md`, fora do repositório.
- **A decisão de mergear tem base,** e eu a reproduzi: `CLAUDE.md:906` diz que *"Defeito não grave que sobra depois da
  conferência vira pendência com dono, e o bloco segue."*
- A ata final tem de dizer também que a C3 foi refeita pela condição da própria ata, que é mais larga que os 2 casos do
  `CLAUDE.md:906`.

## 6. Pendências
- **As 4 que o bloco fecha** estão FECHADAS. Conferi uma por amostra, a `P-MOBILE-MATERIAL-E-FILA-NAO-ATOMICOS`: no código,
  a peça e a fila ficam numa `_db.transaction` dentro da cauda da fila, e fora disso a gravação recusa antes de gravar.
  **É verdade.**
- **PORT564-03 (registro, MÉDIA): os achados que sobraram não estão no `pendencias.md` da `main`.**
  - **C3B-01** → `P-15B-CONCLUSAO-CARTAO-GENERICO` e **C3B-02** → `P-15B-CONCLUSAO-PAUSADA-SEM-ACAO`: **têm dono**, o
    `B-SAN3-15c`, mas só no registro local (linha das 12:48). Falta o PR-alvo, e o `B-SAN3-15c` ainda não existe em plano
    nem no `PLANO_SAN3.md`.
  - **C3B-03** (a tela aberta não relê a situação), que eu reproduzi: **sem destino nenhum.** Precisa de pendência com dono.
  - **`StateError`/'Tenant mismatch' em inglês** (`P-WO-REPO-ERROS-EM-INGLES`): **sem dono explícito.** Também se
    sobrepõe à `P-MOBILE-TEXTO-TECNICO-INTERPOLADO` (dono `B-SAN3-19c`), que já cita o 'Tenant mismatch' em `:884`. No
    `eeac48a3` ele está em `:930`, e as 6 `'WorkOrder … not found'` em `:576`, `:644`, `:712`, `:843`, `:928` e `:1006`.
    Decidir entre um apenso na que já existe ou um ID novo com o vínculo declarado.
  - **O T2 do #561** (`tests/mobile-gate-chave-matriz.test.ts`): **sem ID nem dono.** Deu 1 vermelha em 14 rodadas
    medidas, com o motivo nunca capturado. O critério tem de pedir a captura do motivo.
- **PORT564-04 (registro, BAIXA):** das 6 BAIXA que o bloco abriu, 5 estão com `dono: a nomear pelo orquestrador`, e
  nenhuma das 6 tem PR-alvo.

## 7. Limpeza
- O que é do bloco está limpo:
  - o ramo remoto e o local saíram;
  - os 7 worktrees da junta e do conserto (`w-15b2`, `w-fix564`, `w-j564c1`, `w-j564c2`, `w-j564c3`, `w-j564c3b` e
    `w-ver564`) não existem mais;
  - não ficou banco, container nem porta;
  - há 147 GB livres.
- **PORT564-05 (limpeza, BAIXA):** o worktree `w-15b` (ramo local `fix/mobile-prestador-porta-e-conclusao` em
  `ef4e98e7`, já na `main`, sem ramo remoto) está preservado desde 12/11 para o dev do 15b, e esse motivo acabou com o
  merge. Ele guarda um diário não rastreado de 12/11 (`docs/revisoes/SAN3/B-SAN3-15b-dev.md`, 4564 B), diferente do que
  entrou na `main`. Copiar o diário para fora, tirar o `w-15b` de `worktrees-preservar.txt` e remover. A decisão é do
  orquestrador.
- Os 2 ` D` do checkout principal vêm de antes deste merge e já foram relatados pelos porteiros do #554 e do #561.
- **O meu worktree** saiu por `git worktree remove --force`, com 0 processos vivos, sem `prune` e sem `rm -rf` com curinga.

## 8. O próximo bloco pode começar?
- **Sim.** Nenhuma pendência bloqueante aponta para o 15c, o 17, o 16 ou o 04b.
- A peça `MobileExpandableRow`, que a ata manda repassar ao 17, já está no ramo do 17 (#568, `fff3990a` absorveu o
  `eeac48a3`), idêntica à da `main`.
- **Observação:** o `dev-16-cl` começou às 13:03, antes deste parecer. Nada do que achei vetaria esse começo.

## O que ficou sem executar
- A suíte de backend inteira e o `backend-postgres` não rodaram no meu worktree, porque eu não tinha banco. Valem pela CI
  da `main`, lida pela linha de resumo.
- A conferência visual contra a opção A, que é do orquestrador, e a medição em aparelho e no iOS também ficaram de fora.

## Veredito
Não há nada grave. Os números reproduzem, as árvores são iguais e a CI da `main` está verde. As dívidas são de registro e
viajam juntas: PORT564-02 e PORT564-03 (MÉDIA), e PORT564-01, PORT564-04 e PORT564-05 (BAIXA).

LIBERADO COM RESSALVA: a próxima demanda da fila (o B-SAN3-15c de acabamento, o 17 do #568 e o 16 seguem) | no próximo PR de registro: a ata da J-564 completa (conserto, ver-564, conferência visual, C3 refeita, triagem pelo §C7 10(4), merge e porteiro); C3B-01 e C3B-02 no pendencias.md com o dono B-SAN3-15c e o PR-alvo; C3B-03, o T2 do #561 e os erros em inglês do work_order_repository.dart com ID, dono e PR-alvo (os erros conciliados com a P-MOBILE-TEXTO-TECNICO-INTERPOLADO); dono e PR-alvo nas 6 BAIXA abertas pelo bloco; o w-15b com o diário salvo e removido
