# Ata da J-571: junta completa do PR #571 (B-SEC-LOG-SANITIZA: a fábrica única de log; o `sendRouteError` e o ramo genérico dos syncs sem texto de driver)

**Orquestrador:** Claude Opus 5.5, em 15/11 por volta das 08:35 SP (hora medida).
**Fluxo:** rápido (§C7 10(3)), uma votação só.
**Objeto:** `2fda18ab936e0de1a860eccb1276694f18f7112e`, que é a `main` `026d5fd2` absorvida mais a Emenda 1.6.
**Quórum:** unanimidade de 3.

## Terreno
O inspetor `insp-571-cl` deu **LIBERADO COM RESSALVA** (R1 a R7). As ressalvas foram gravadas no ADENDO do briefing antes do disparo.

## Cadeiras e votos
| Cadeira | Identidade | Corpo · modelo | Voto | Graves | Não graves |
|---|---|---|---|---|---|
| C1 · logs e boot | `j571-c1-logs-boot` | `agente-secops` · Claude Opus 5.5, declarado | **APROVA** | 0 | C1-A1, C1-A2 (no bloco) |
| C2 · contrato HTTP e sigilo | `j571-c2-contrato-http` | `guardiao-fail-closed` · Claude Opus 5.5, declarado | **REPROVA** | 0 | C2-A1, C2-A2, C2-A3, C2-A4 (no bloco) |
| C3 · catraca e cobertura | `j571-c3-catraca` | `guardiao-fail-closed` · Claude Opus 5.5, declarado | **REPROVA** | 0 | C3-A1, C3-A2 (no bloco) |

- **Cruzamento:** nenhum, e isso está declarado no ADENDO (§C7 11(2)). A pré-revisão foi do DeepSeek, outra casa, e deu APROVADO sem achados.
- **Quedas:** nenhuma.
- **Papéis (§C7.4-bis):** as cadeiras acharam, o orquestrador triou, um dev que não achou conserta e um verificador que não consertou confere.

**O que todas mediram verde, por execução:**
- a Emenda 1.6 morde;
- 24 de 24 mutações da C3 morrem, e 13 de 13 da C1;
- o aceite de boot vigente (md5 `48937a33`) dá VERDE no objeto e VERMELHO no head-base;
- B1 a B4 ficam `ok` no CI e na execução própria;
- em toda mutação da C2, o corpo saiu `sent=0`.

## Triagem (§C7 10(3)), pelo orquestrador
**Nenhum grave.** Nenhum achado mostra vazamento vivo hoje: todos são caminhos que um código futuro ou uma regressão abriria sem que um teste ficasse vermelho.

Mesmo assim, o motivo de existir deste bloco é fechar o texto de driver na saída **por construção**. Por isso, os 6 achados de trava e de cobertura entram na leva A.

### A. Conserta agora (um dev que não achou, com teste que fica vermelho sem o conserto)
| Id | O defeito | O aceite |
|---|---|---|
| **C2-A1** | As frases de queda do `pg` vivem em 2 literais, o do `pg` e o `PG_CONNECTION_LOST_MESSAGES`, e o K1 itera a própria constante. | Um teste lê as frases na FONTE do `pg`/`pg-pool` instalado (ou provoca o erro real) e falha se uma frase do saneador não existir mais lá. A mutação da C2 sobre `node_modules/pg/lib/client.js` (trocar a frase) fica VERMELHA. |
| **C2-A2** | O mesmo vale para o `Redis command timed out.`, com 3 cópias. | O teste usa a constante ou o erro real de `redis.client.ts`. A mutação da C2 (trocar o texto em `redis.client.ts`) fica VERMELHA. |
| **C2-A3** | O caminho `opaque` dos 4 syncs e do custo de nuvem não tem trava. | Um caso por sync (os 4) e um pelo custo de nuvem alimentam um erro `opaque` sem marca de texto: arquivo, bucket, Redis e o detalhe do `pg` com e-mail. A mensagem que sai tem de ser a fixa. A mutação da C2 sobre `publicErrorMessage` (`!== "text"` → `=== "infra_down"`) fica VERMELHA. |
| **C2-A4** | O `API_CONTRACTS.md` diz "500 fixo nas três" no tratador final, e o código devolve o 4xx do body-parser (400, 413 e 415) com mensagem fixa. | O texto diz o que o código faz, que é o passo 3 do H3. O `conf-textos.sh` vigente segue verde. |
| **C1-A1** | O trecho de `sanitizeLogArgs` que limpa os argumentos depois do 1º (`%s`, `%o` e o resto quando o 1º argumento é um `Error`) não tem teste. | Um teste com sentinela nos argumentos de formatação. As 2 mutações próprias da C1 (`mut/PROPRIA-1a.diff` e `PROPRIA-1b.diff`) ficam VERMELHAS. |
| **C3-A1** | A catraca trata o símbolo NÃO resolvido como permitido (`saidaProibida` devolve `undefined`). Por isso, 5 formas com o tipo apagado, como `(globalThis as any).console` e o `createRequire` sobre `any`, compilam e passam. | Fail-closed: não resolvido e com forma de saída (acesso a `console`, `stdout`/`stderr` ou carga dinâmica) fica VERMELHO, salvo numa lista de exceção explícita e vazia. As 8 formas da C3 (`votos/j571-c3-catraca/formas/c3f_[a-h]_*.ts`) ficam VERMELHAS, e o `src/` de hoje segue verde. |
| **C3-A2** | A G4 enumera 2 apps por nome. Um `express()` novo nasce sem o tratador final, e o tratador padrão do Express escreve o `err.stack` cru. | A G4 passa a enumerar TODO `express()` de `src/` pela propriedade (AST ou checker) e exige o tratador final em cada um. O `c3-app-novo.ts` da C3 fica VERMELHO. **Se a enumeração nova acusar um app que já existe** (por exemplo, `src/integrations/traccar/traccar-ingest.app.ts`), o dev PARA e escreve o caso: tocar a ingestão do Traccar pede uma emenda, porque está fora do PERMITIDO. |

### B. Vira pendência com dono
| Id | Pendência | Dono | Critério |
|---|---|---|---|
| **C1-A2** | `P-SECLOG-ACEITE-DIAGNOSTICO-TRAVA-FUSO`: com o banco fora, a trava de fuso do #554 recusa a subida antes do `listen`. O helper do aceite e o B1/B2 tratam um defeito real (a linha positiva calada) como "ambiente" (`INCONCLUSIVO`). A trava continua fail-closed. | o próximo bloco que tocar o aceite de boot ou o helper `sec-log-boot` | com a linha positiva calada, o resultado é VERMELHO com a causa, e não INCONCLUSIVO |
| (R2 do inspetor) | as 10 pendências e o `B-SYNC-INFRA-503` que o corpo do PR cita | o orquestrador | entram no próximo PR de registro |

## O que vem depois
1. **O conserto da leva A,** por um dev que não achou: o `dev-571-abs-cl`, que fez a absorção e não é cadeira.
   - Antes de mexer, o dev re-executa o comando de cada achado.
   - Depois de consertar, faz push e lê o CI das 2 rodadas.
   - O corpo do PR troca a seção "Números medidos" pelos números do head novo.
2. **A conferência,** por um verificador que não consertou. Ele roda o comando de cada achado da leva A, confere o vermelho sem o conserto e lê o CI inteiro.
3. **O merge e a porteira.**

**Nenhuma cadeira se refaz (§C7 10(4)):** o conserto não muda regra de dinheiro, de permissão nem de isolamento.

## Adendo do registro (`reg-1611-cl`, 16/11)
As horas são de São Paulo; o merge e o head vêm de `gh pr view`, e a CI do merge, de `gh run list --commit`. O resto vem do diário do orquestrador, fora do repositório.
- **Emenda 1.7 (15/11 08:47):** a G4 nova acusou o app da ingestão do Traccar, em arquivo PROIBIDO; a trava passou a ter uma lista FECHADA de exceções, com caminho e função, e trava também a exceção órfã.
- **Conserto:** `dev-571-abs-cl`, head `2f581aa2`, 15 arquivos, nenhum em `src/`; os 7 itens ficam vermelhos sem o conserto e verdes com ele.
- **Conferência:** `conf-571-cl` (Claude, sem cruzamento, declarado), CONFERIDO COM AJUSTES: a CONF571-A1 vira `P-SECLOG-G4E-TIPO-APAGADO`; a CONF571-A2 é só o texto do E-11 no corpo do PR.
- **Merge:** squash `5366d5a2` (15/11 10:47), do head `50708786` (atualizado por `gh pr update-branch`, delta só da `main`); CI do merge `43720807642`.
- **Porteira:** `porteiro-571-cl`, LIBERADO COM RESSALVA (15/11 11:14), 0 grave. A dívida de registro (as 8 pendências do corpo do PR, o dono de 3, o fechamento da `P-LOGIN-READINESS-VAZA-HOST-NO-ERRO`, o critério da `P-569-TEXTO-DRIVER-NA-RESPOSTA` e o alvo novo de 2) entra no registro de 16/11.
