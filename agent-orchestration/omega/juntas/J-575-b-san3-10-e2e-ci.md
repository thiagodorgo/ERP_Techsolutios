# Ata da J-575: junta completa do PR #575 (B-SAN3-10-E2E-CI, item 42: os testes de navegador no gate obrigatório do CI)

**Orquestrador:** Claude Opus 5.5, em 15/11 por volta das 05:55 SP (hora medida).
**Fluxo:** rápido (§C7 10(3)), com uma votação só.
**Objeto:** `f64f0713` (Emenda 2.3: a `main` absorvida e o teste 9 reescrito). Cada cadeira confirmou o objeto pelo `ls-remote`.
**Quórum:** unanimidade de 3.

## Terreno
- O inspetor `insp-575-cl` deu **LIBERADO COM RESSALVA** (R1 a R6).
- A R1 (a `main` andou e o teste 9 virou uma asserção vazia) mudou o objeto antes do disparo, pela Emenda 2.3 do orquestrador. O ADENDO do briefing trouxe o objeto novo e as ressalvas R2 a R6.

## Cadeiras e votos
| Cadeira | Identidade | Modelo | Voto | Graves | Não graves |
|---|---|---|---|---|---|
| C1 · a esteira | `j575-c1-esteira` (`guardiao-fail-closed`) | Claude Opus 5.5, declarado | **REPROVA** | 0 | C1-1, C1-2 (no bloco) |
| C2 · os testes | `j575-c2-testes` (`validador-mestre`) | Claude Opus 5.5, declarado | **APROVA** | 0 | 0 (3 observações) |
| C3 · as telas e o freio | `j575-c3-telas` (`master-teste-telas-rotas`) | Claude Opus 5.5, declarado | **APROVA** | 0 | C3-A1 (pré-existente), C3-A2 (fora do objeto) |

- **Cruzamento:** declarado no ADENDO (§C7 11(2)): não havia crédito externo. As fatias F0 a F2 são do Codex, e para elas as cadeiras Claude cruzam.
- **Quedas:** nenhuma.
- **Papéis (§C7.4-bis):** as cadeiras acharam; o orquestrador triou; o `dev-42-cl` conserta (ele não achou); um verificador que não consertou confere.

## Triagem (§C7 10(3)), pelo orquestrador
**Nenhum grave.** O bloco não toca dinheiro, permissão, isolamento nem dado.

Mesmo assim, o motivo de existir deste PR é que o portão não fique verde sem rodar (plano v2 §8). Por isso os 2 achados da C1, que são formas de fazer exatamente isso, entram na leva A.

### A. Conserta agora
| Id | O defeito | O aceite |
|---|---|---|
| **C1-1** | O envelope do job `e2e` é uma lista negra. O TD2 confere o TEXTO dos 2 corpos, mas não QUEM os executa nem a lista de passos. Um `defaults: run: shell: cat {0}`, no job ou no topo do workflow, deixa o TD2 com 5/5, e o canário e a suíte saem 0 sem rodar. Um passo novo no job também passa sem ser visto. | O guarda passa a usar uma LISTA DE PERMISSÃO para o envelope: as chaves do job são exatamente as do plano; não há `defaults` no job nem no topo do workflow, ou, se houver, ele é exatamente o do plano; nenhum passo vigiado tem `shell:`; e a lista de passos do job é EXATAMENTE a do plano, em nomes e em ordem. **Mutações:** o `defaults.run.shell` da C1, no job e no topo, um passo a mais e um `shell:` num passo vigiado. As 4 ficam VERMELHAS. |
| **C1-2 (parte)** | A G1, "relatório ausente", não tem teste-dono. A cadeia de 3 linhas da C1 (o config sem o relator `json`, o `testMatch` do chromium sem casamento e a l.40 desligada) deixa o job verde rodando 1 de 14. | (1) Um caso vermelho que exija a linha VERMELHO da G1 com o relatório ausente. (2) O TD2, ou um teste novo, confere no `playwright.config.ts` que a CI tem o relator `json` e que o `testMatch` do projeto chromium casa com os 13 arquivos. **Mutações:** a G1 desligada e o relator `json` tirado do config ficam VERMELHAS. |
| **C3-A1** | Cada rodada do e2e sobe também o portal público em `PORTAL_PORT`, cujo padrão é a 3100 (`src/server.ts:41-42`, `src/config/env.ts:310`), em `0.0.0.0`, porque o `webServer` do `playwright.config.ts` não define essa variável. Fora da CI, o e2e ocupa a porta da pilha viva do dono, e duas rodadas em paralelo disputam a porta. | O `webServer` define `PORTAL_PORT` por variável (`E2E_PORTAL_PORT`, com um padrão fora de 3000, 3100 e 5173). A CI segue verde, e o e2e local roda 2 vezes em paralelo sem colisão. Nada muda em `src/`. |

### B. Vira pendência com dono
| Id | Pendência | Dono | Critério |
|---|---|---|---|
| **C1-2 (resto)** | `P-E2E-GUARDA-RELATORIO-POR-PROPRIEDADE`: de 33 chamadas `reprovar(` em `scripts/e2e-report-guard.mjs`, 17 podem ser desligadas com o TD2 e o TD3 verdes. O conserto da A3 foi por instância (G2, G3 e G4) e não pela propriedade. | o próximo bloco que tocar os guardas do e2e | um teste enumera cada ramo `reprovar(` e exige um caso que o deixe vermelho; desligar qualquer um deles fica vermelho |
| **C3-A2** | O briefing herdou do inspetor uma premissa errada: "os blobs estão em CRLF", quando estão em LF. Não muda nenhuma mutação. | o orquestrador (lição de processo) | — |

## O que vem depois
1. O conserto da leva A, pelo `dev-42-cl`.
2. A conferência, por um verificador que não consertou: as mutações da leva A como estão escritas, e o CI inteiro nas 2 rodadas.
3. O merge e a porteira, que diz se o item 42 fecha.

Nenhuma cadeira se refaz (§C7 10(4)): o conserto não muda regra de dinheiro, de permissão nem de isolamento.

## Adendo do registro (`reg-1611-cl`, 16/11)
As horas são de São Paulo; o merge e o head vêm de `gh pr view`, e a CI do merge, de `gh run list --commit`. O resto vem do diário do orquestrador, fora do repositório.
- **Conserto:** `dev-42-cl`, head `15b76dc1`, com a `main` absorvida; CI 9/9 nas 2 rodadas (e2e 14 passed); as 11 mutações vermelhas.
- **Conferência:** `conf-575-cx3` (Codex 3, com cruzamento), CONFERIDO COM AJUSTES. A CONF-575-1 é artefato do mandato do orquestrador, não defeito; a lição: "vermelho sem o conserto" se pede por mutação da propriedade quando o conserto é um teste novo sobre código que já estava certo. A CONF-575-2 vira `P-E2E-SESSAO-POR-RODADA`.
- **Merge:** squash `6e1eb06d` (15/11 07:32), do head `b3a67395` (`gh pr update-branch`, delta só em `Kpis/**`); CI do merge `43704605376`.
- **Porteira:** `porteiro-575-cl`, LIBERADO COM RESSALVA (15/11 08:05): "**O #575 FECHA o item 42.** Fecha a parte (a)." A parte (b) segue pela `P-SAN3-10-E2E-PERSONAS`.
