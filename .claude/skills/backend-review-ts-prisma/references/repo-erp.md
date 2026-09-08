# O terreno deste repositório — arnês, comandos e armadilhas já medidas

> **Toda contagem aqui é datada e tem ref (§A7 do `CLAUDE.md`).** Os números foram medidos em
> **`main@72fcdcde`, 2026-09-08** — e envelhecem. Antes de citar um deles como fato, **re-meça na ref que
> você está julgando**: `git ls-tree`, `git show <ref>:<caminho>`, nunca o disco de uma sessão que pode
> estar noutra branch. Foi exatamente assim que uma pendência falsa nasceu nesta casa.

Cada item aqui custou pelo menos um ciclo de reprovação ou uma pendência. Todos são verificáveis no repo; onde a fonte for o próprio arquivo, ela está nomeada. Se uma afirmação daqui divergir do repo hoje, **vale o repo** — e a divergência vira registro em `agent-orchestration/controle/` (§A2), não correção silenciosa.

## 1. O arnês de teste — onde o verde mente

**`npm test` = `node scripts/run-backend-tests.mjs`, nunca `node --test tests/*.test.ts`.**
Quem expande glob é o shell. No Windows o npm chama `cmd.exe`, que não expande: o `node --test` recebia a string literal, não achava arquivo e **nenhum teste rodava** — verde vazio por meses, visível só na máquina do dono (o cabeçalho do runner documenta o caso inteiro). O runner expande em JS, força relatório TAP e tem dois guards monotônicos: zero arquivo casado → falha; TAP sem `# tests` ou com `# tests 0` → falha.

**`node --test <diretório>` também não serve:** no Node 20 os padrões default de descoberta não incluem `.ts` — zero arquivo, o mesmo verde vazio com outra roupa.

**Modo de persistência.** `src/config/env.ts` carrega o `.env` e **congela** o snapshot no import; como ESM hasteia imports, teste que escreve `process.env.CORE_SAAS_PERSISTENCE` no próprio corpo chega tarde. O runner resolve isso passando o modo no `env` do processo filho: sem variável exportada → `memory` (o que a CI faz); com variável exportada → respeita. `CORE_SAAS_PERSISTENCE=prisma npm test` faz falhas de fixture voltarem, e isso é correto, não regressão.

**Dois jobs de CI, e só um exercita o Postgres:**

| job | persistência | o que roda |
|---|---|---|
| `backend` | `memory` | a suíte inteira; teste `-db` **se auto-pula** |
| `backend-postgres` | `prisma` | **só a lista `SUITES`** de `.github/workflows/ci.yml`, contra Postgres 16 + Redis, com guard de **zero pulos** |

> **Armadilha nº 1 de teste de banco:** criar `tests/algo-db.test.ts`, ver verde e **não acrescentar o arquivo à lista `SUITES`**. O teste nunca roda contra Postgres em CI nenhuma — auto-pula no job `backend` e não existe no `backend-postgres`. Ao revisar PR que adiciona teste `-db`, **confira o diff de `.github/workflows/ci.yml`**. Ausência é achado.

O guard de zero pulos (`Fail on skipped tests (green-blind guard)`) lê `# skipped` do TAP e reprova com qualquer valor diferente de 0 — inclusive quando não consegue ler a contagem. Teste que "se declara pulado" no subconjunto Postgres derruba o job de propósito.

## 2. RLS — o superusuário ignora tudo

O isolamento vive em `src/database/rls.ts`: GUC `app.current_tenant_id` (`setTenantRlsContext` / `withTenantRls`) e GUC de identidade `app.current_identity_id` (`IDENTITY_RLS_GUC`, `setIdentityRlsContext` — que **re-resolve** a identidade sob o braço de tenant; o claim do token é dica, nunca fonte).

**O `DATABASE_URL` de dev e de CI conecta como `postgres` — superusuário, que ignora RLS.** Consequências ao revisar:

- Teste que "prova isolamento" rodando como `postgres` **não prova nada**. O único arranjo em que o RLS existe é uma role `NOSUPERUSER NOBYPASSRLS` (é assim que as suítes de identidade rodam — ver os comentários da lista `SUITES`). Falha ao criar essa role é vermelho, **nunca skip**.
- Código que confia **só** na RLS para filtrar tenant funciona em produção e **vaza em dev/CI**: um `groupBy`/`aggregate` sem `tenant_id` explícito soma a base de todas as organizações num balde só. Já aconteceu nesta base, em caminho de rateio financeiro. **Filtro explícito por `tenant_id` na query + RLS** — cinto e suspensório, não um ou outro.
- Helper de varredura multi-tenant pode ser fail-closed na **escrita** e fail-**open** na **leitura**. Verifique o canário de contexto nos dois lados.

## 3. Prisma 7 nesta base

- `$queryRaw`/`$executeRaw` com template tag parametrizado: **27 arquivos** em `src/` usam (medido em `main@72fcdcde`, 2026-09-08). **`$queryRawUnsafe` tem exatamente uma ocorrência legítima** (`src/routes/health.routes.ts`, literal `SELECT 1`). Qualquer segunda ocorrência com entrada externa é achado **Crítico**.
- **`createMany({ skipDuplicates })`:** o Prisma emite `ON CONFLICT DO NOTHING` **sem alvo explícito** — o que faz o `INSERT` engolir conflito de *qualquer* constraint, não só a que você pretendia. Onde a idempotência é a regra (chave de idempotência, outbox, rateio), prefira `$executeRaw` com `ON CONFLICT (col, ...) DO NOTHING` **nomeando o alvo**. Prove olhando o SQL emitido (`DEBUG=prisma:query`), não a intenção do código.
- Erro conhecido do Prisma: trate por `code` (`P2002`, `P2025`, …), nunca por texto de mensagem.
- Transação: a regra atômica inteira dentro dela; nada de HTTP/fila demorada no meio. Read-modify-write precisa de `SELECT ... FOR UPDATE` (`findByIdForUpdate`) ou constraint — não de "ninguém faz isso ao mesmo tempo".

## 4. Dinheiro e números

- **`|| 0` e `?? 0` incondicionais são proibidos por precedente**: nesta base um deles fabricou pico num painel, transformando "sem dado" em "zero real". Distinga ausência de zero — `_count._all` como discriminador, tipo nulável no contrato. `lineItemCount > 0` com `total === null` é combinação impossível: erre alto.
- **Acumular dinheiro em `number` (float) diverge.** Com ~10 mil linhas a divergência medida foi ~1,1e-3 — três ordens de grandeza acima da tolerância antiga. Referência em `BigInt` micro-unidades ou `Decimal`; se o contrato expõe `number`, documente-o como lossy e ofereça o exato ao lado.
- Agregação com `take` implícito, ou soma em JS do que o banco somaria: achado. `SUM`/`GROUP BY` no banco.
- Delete físico de dado de negócio é proibido (desativação lógica) — a auditoria exige histórico.

## 5. Concorrência de catálogo Postgres

`node --test` roda os arquivos **em paralelo**. Suíte que cria/derruba `ROLE`, schema, extensão ou objeto global disputa o catálogo e produz `XX000 tuple concurrently updated` de forma intermitente. Sinal de diagnóstico: **o número de testes varia entre execuções do mesmo comando**. Ao revisar:

- Denominador que muda entre rodadas é achado, mesmo com 0 falhas.
- Teardown tem de sobreviver ao aborto (`assert.fail`, SIGKILL) — conte roles/grants/linhas antes e depois ("vaza-metro").
- "Verde em N execuções" **sem N e sem a forma** (paralelismo, versão do Node, ordem) não é prova.

## 6. Ambiente e disco

- **Junction/symlink de `node_modules` entre worktrees é PROIBIDA** (§C7.1-ter(c)): em 26/08 remover um worktree apagou o `node_modules` do worktree do dev por dentro da junction e mutilou o da árvore principal. Cada worktree roda `npm ci` próprio; remoção só por `git worktree remove --force`.
- Três arquivos aparecem como ` M` no `git status` sendo **byte-idênticos** (stat-cache sob `autocrlf`): `.claude/agents/planejador-mestre.md`, `.claude/agents/porteiro-pos-merge.md`, `scripts/sync-agent-agents.mjs`. Não os reporte como mutação viva sem `git diff` confirmando.
- Disco é escasso. Nada de gerar artefato pesado na revisão; se gerar, limpe e diga em uma linha (§C5).

## 7. O que a revisão também tem de olhar num PR

- **KPI (§C3):** todo PR que altera código, teste ou escopo atualiza `Kpis/kpis-latest.json`, `Kpis/kpis-history.*` e `Kpis/index.html` **no mesmo PR**, com contagem de **execução real** (N e forma). Trilha não tocada carrega o último valor **com nota**. `merge_commit`/`approved_head` são `null` na autoria — isso **não** é achado.
- **Escopo do bloco:** o comando declara permitido e proibido com caminhos exatos. Fora de autorização: `prisma/**`, `migrations/**`, `infra/**`, `.env`, lockfiles. Toque em proibido é achado alto.
- **Contrato:** mudança de resposta REST reflete em `API_CONTRACTS.md`, e o contrato nunca vai à frente do teste que o sustenta.
- **Auditoria (§2.8):** nunca `token`, `path`, `bucket`, storage key, base64, binário ou `tenant_id` externo em resposta pública ou metadado de auditoria.
