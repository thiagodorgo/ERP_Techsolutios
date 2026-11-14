# Ata da J-554 (PR #554, B-DB-FUSO-UTC: o fuso da conexão fixo em UTC e a trava de boot fail-closed; PERDA DE DADO e DINHEIRO, junta completa, unanimidade de 3)

**Fluxo rápido (§C7 10(3)).** Ata do orquestrador (Claude Opus 5.5), escrita em 13/11 18:46 SP; transcrita para o repositório pelo PR de registro de 13/11 noite (`reg-1311n-cl`). As fontes ficam no diretório de revisões do orquestrador, fora do repositório (`revisoes/j554/`).

**O PR #554 continua ABERTO** (rascunho, head `a3d3aeae`) quando esta ata entra. Este PR de registro grava só a junta; as pendências que o bloco registra (entre elas a `P-LOGIN-READINESS-VAZA-HOST-NO-ERRO`) estão no ramo do #554 e entram com ele.

## Objeto, pré-revisão e inspetor
- **Objeto:** `a586ddaa`, com 16 check-runs verdes.
- **Pré-revisão:** `prerev-554-cl` (Claude; casa oposta à do código, que é DeepSeek e Codex), **APROVADO COM AJUSTES**, sem grave e com 4 não graves (A1: o G1/G2 lia texto e um import por alias escapava; A2: uma `options` repetida furava o conflito; A3: o B6 lia texto e a linha comentada passava; A4: na árvore mesclada com a `main`, a catraca G3 dava 221 contra o teto de 217). Consertados pela Emenda 3 do fuso, pelo `fix-554-cl` (head `a586ddaa`).
- **Inspetor:** `insp-554-cl` (Claude, gate Opus), **LIBERADO COM RESSALVA** (R1 a R4, incorporadas às 17:24 SP):
  - R1: na forma real, nunca o compose do repositório (ele sobe a base viva); a C1 e a C2 com `PORTAL_PORT` próprio e `REDIS_URL` declarado;
  - R2: os inelegíveis `inv-543-fuso`, `j543-c1-dp` e `porteiro-543-dp`;
  - R3: um cluster inerte de um dev caído, cuja porta estava no mandato de outra tarefa, removido pelo orquestrador;
  - R4: uma falha local do `san3-05` só conta como ambiente depois de conferida a linha `ok` no TAP.

## Os votos (unanimidade de 3)
| Cadeira | Identidade | Modelo | Cruzamento | Voto | Achados |
|---|---|---|---|---|---|
| C1, dado e dinheiro | `j554-c1-cdx2` | Codex 2 (Sol) | sim | **APROVA** | nenhum |
| C2, boot e vazamento | `j554-c2-cdx3` | Codex 3 (Sol) | sim | **APROVA** | 2 não graves (A1, A3) e 1 **grave `pre-existente`** (A2) |
| C3, cobertura e catraca | `j554-c3-dp` | DeepSeek Pro | parcial, declarado | **APROVA** | 1 não grave (A1) |

**Resultado: APROVADO por unanimidade.** O único grave é `pre-existente`, com evidência de origem: a linha é do #357, de 19/08 (`git blame`), e o arquivo não muda no bloco (`git diff --quiet 3309ba7d..a586ddaa -- src/modules/auth/services/login-readiness.ts` retornou 0). Pelo §C7.1-ter(a), ele não reprova: vira pendência nomeada com bloco dono.

- **O que a C1 mediu:** R-1 a R-4 e a E3.2 vermelhas; a sonda própria em banco com fuso de SP abriu a sessão em UTC com todas as variações de `options`; no R-9, 0 s de diferença entre o anunciado e o gravado; a R-1 na suíte em SP deu 5 de 6 vermelhos; o T8 e o A23 verdes em SP.
- **Quedas:** nenhuma.

## Triagem (§C7 10(3)3)
| Achado | Decisão |
|---|---|
| **C2-A1:** a trava aceita `utc` e `etc/utc` (normaliza com `toUpperCase`), e o plano diz só os literais `UTC` e `Etc/UTC` | **conserta:** comparação exata depois do `trim`; teste com `utc` recusado; mutação de volta ao `toUpperCase` → vermelho |
| **C2-A3:** o B6 pela AST não resolve a ligação do identificador; uma declaração local homônima dentro de `main` desliga a trava e o B6 fica verde | **conserta:** o B6 confere, pelo checker do TypeScript, que o identificador chamado resolve para o import do bootstrap de fuso; mutação da C2 → vermelho |
| **C3-A1:** o G1 não acusa `pg.Pool`/`pg.Client` cru com `options` em `src/` | **conserta:** o G1 acusa import ou require do módulo `pg` em `src/` fora de uma lista fechada, medida no objeto, com o motivo de cada uso; mutação com `new Pool({ connectionString })` → vermelho |
| **C2-A2 (grave, `pre-existente`):** no erro de conexão real, a sonda de login (`login-readiness.ts:192`, `logger.error({ err: error })`) serializa o erro do Prisma com host, porta, usuário e banco | **pendência ALTA** `P-LOGIN-READINESS-VAZA-HOST-NO-ERRO` (desde o #357). **Dono:** `B-SEC-LOG-SANITIZA` (bloco novo). Não segura o merge do fuso |

## Papéis do ciclo (§C7.4-bis)
| Papel | Quem |
|---|---|
| Achou | `j554-c2-cdx3` e `j554-c3-dp` |
| Triou | o orquestrador (esta ata) |
| Conserta | `fix-554b-cl` (Claude Opus, identidade nova; as Codex estavam em juntas, declarado) |
| Confere | uma identidade de outra casa: o comando de cada achado, o vermelho sem o conserto e o CI |
| Depois | o merge e o porteiro, de outra casa |

## Depois da junta (13/11, até 21:50 SP)
- **Emenda 3.2 do fuso** (orquestrador, 18:49 SP): o merge do #551 trouxe 1 `new PrismaPg(` em `tests/b-material-sync-db.test.ts:58`, e a catraca G3 ficou em 218/217. O teto não sobe: a linha migra para a fábrica, só na construção, com 0 asserção mudada.
- **Conserto:** `fix-554b-cl`, head `a3d3aeae`: C2-A1 (só `UTC` e `Etc/UTC` depois do `trim`; o teste novo vermelho em 5 casos), C2-A3 (o B6 pelo checker; a sombra local vermelha), C3-A1 (o G1 acusa o `pg` cru, com lista fechada vazia e um controle do detector) e a E3.2 (a catraca em 217). TAP das rodadas verdes: backend 5591/5589/0/2, backend-postgres 621/621 com RC3 = 11, frontend 1788, flutter +1241.
- **O CI do head travou:** o job `backend` travou em **3 de 6 rodadas** no `a3d3aeae` (2 de 2 verdes no `a586ddaa`, 3 de 3 na `main`). A assinatura é sempre a mesma: 10 `not ok` em `tests/b-o6r-12-regime-migration-drill-db.test.ts` (#539), o 1º um `ENOENT` no `mkdir` do diretório temporário do drill; depois o passo não termina. O check do PR está `cancelled`.
- **Investigação em curso** (`inv-554-cl`, corpo `agente-ci-doutor`, com um cético que tenta derrubar a causa por execução; quem acha não conserta). A causa e o escopo seguem **EM APURAÇÃO**: a pendência do CI só se registra depois do investigador, e a relação com o bloco não está descartada.
- **Ainda não houve** conferência de outra casa, merge nem porteiro.
