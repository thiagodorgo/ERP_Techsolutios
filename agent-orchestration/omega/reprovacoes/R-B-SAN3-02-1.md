# R-B-SAN3-02-1 — reprovação do ciclo 1: auditoria de topo e plano do ciclo 2

> Registro do orquestrador (2026-10-20). Quem achou: `jurado-san302-c2-opus`. Quem auditou e planejou: `planejador-san302-ciclo2-fable` (Fable, sem fallback). Ata: `agent-orchestration/omega/juntas/J-B-SAN3-02-ciclo1.md`. Abaixo, o arquivo do planejador na íntegra.

---

# B-SAN3-02 — Ciclo 2: auditoria da reprovação do ciclo 1 e plano de resolução

**Identidade:** `planejador-san302-ciclo2-fable` (nova; não votou, não planejou, não desenvolveu o ciclo 1).
**Modelo:** Fable (frontmatter do `planejador-mestre`; `D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`).
**Objeto julgado:** PR #448, head `8e6a6c29b8a0aced5bf3968383aa9ef247019f46`, worktree `C:/Users/AMP/w-san3-02` (só leitura; não tocado).
**Início:** 2026-10-20 00:57 BRT (retomada após renovação de limite); 2ª retomada 01:25 BRT (VS Code reiniciado com o esqueleto gravado). Cada seção é gravada ao ser medida (P1/P2); `EM APURAÇÃO` = ainda não medida.

## §0. Insumos lidos e head medido

**Head/objeto (medido em `C:/Users/AMP/w-san3-02`):** `git rev-parse HEAD` → `8e6a6c29b8a0aced5bf3968383aa9ef247019f46`. `git log --oneline origin/main -- prisma/migrations/20260878000000_invoice_complementary_title` → **vazio** (a migração nunca entrou na `main`); no ramo, único commit que a toca: `6ee9bb6d feat(financeiro)…`. Blobs: migração `aca531da`, `schema.prisma` `d4dd5dbe` (os mesmos que a C2 restaurou). `git status --short`: só ` M` fantasmas de EOL em `.agents/`/`.claude/` (já medidos pelo inspetor) — nada meu.

**Lidos inteiros:** `c1-voto.json` (APROVADO, 0 achados) e `c1-evidencia.md`; `c2-voto.json` (REPROVADO, achado C2-01) e `c2-evidencia.md`; `dba-parecer.md` (FAVORÁVEL COM RESSALVA, head `be344c85`); `insp-san302-parecer.md` (LIBERADO COM RESSALVA); `00-mandatos/cadeira-c2.md`; corpo `jurado-san302-c2-complementar-e-indice.md` (blob do objeto); a migração (46 linhas); `tests/work-order-invoicing-migration-drill-db.test.ts` (308 linhas); plano v2 §0.2/§5/§6/§7.5/§7.6/§11/§12 e Anexos A/B/C (por `sed -n`); `B-SAN3-02-dev.md` e críticas (grep); logs da C2 (`lote1.log` seção 3, `lote2.log` seção I, `lote/lote1.sh`, `lote/lote2.sh`); `prisma.config.ts`; `package.json`; `node_modules/@prisma/adapter-pg/dist/index.mjs` l.710-719; `node_modules/@prisma/engines/`; `.github/workflows/ci.yml` l.300-301; `pendencias.md` l.11396-11412; `docs/deployment.md` l.241-252 (Runbook A).

**C3 do ciclo 1 (`jurado-san302-c3-argon`): NÃO votou** — a API do Gemini atingiu o teto mensal (429) às 02:39Z (fato do orquestrador, 01:25 BRT). Sem `c3-evidencia.md`/`c3-voto.json` no diretório de votos (listado). É QUEDA (P6) e o redo é integral; a junta do ciclo 1 fica com 2 votos (1 veto da C2 — reprova de qualquer modo). Este plano cobre o C2-01 e nomeia a C3 do ciclo 2 (§9).

**Prisma medido:** `package.json` → `prisma ^7.8.0`, `@prisma/client ^7.8.0`, `@prisma/adapter-pg ^7.8.0`; `prisma.config.ts` → `datasource.url = env("DATABASE_URL")`, **sem adapter de migração** → o `migrate deploy` roda no schema-engine Rust (`node_modules/@prisma/engines/schema-engine-*`; versão lida no contêiner: `schema-engine-cli 3c6e1927…`); o erro no `lote1.log` l.102 tem a forma `DbError { … file: Some("namespace.c") }` = tokio-postgres. `npx prisma migrate deploy --help` (URL inerte) → opções `--config` e `--schema`. Precedentes no repo: **0** migrações (de 113) com `BEGIN`/`COMMIT`/`DO $$`.

**Experimento próprio (resultados no §5):** projeto mínimo copiado para o scratchpad (`package*.json`, `prisma.config.ts`, `prisma/` — `git hash-object` da migração e do schema = `git rev-parse 8e6a6c29:…`), rodado por `bash C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh <scratchpad>/psan302 "bash exp/exp.sh"` (cluster descartável; worktree não tocado). Roteiros e logs em `C:/Users/AMP/erp-pausa-2026-10-03/psan302-c2/` (`exp.sh`, `exp.log`, `exp2.sh`, `exp2.log`). Pré-subida 1: Docker 1 grupo alheio (`dtrc02-…`, 2 com o meu); commit livre 4,37 GB; disco 14 GB. Pré-subida 2: 0 alheios; 5,64 GB; 13 GB. Teardown: `bases psan302_*=0`, contêineres/redes removidos pela ferramenta (`docker ps` só `erp-*`).

## §1. Auditoria (a) — defeito real do produto ou artefato do processo?

**Veredito: defeito REAL do produto (classe "integridade operacional da migração"), não grave, reproduzido por mim — e, ao lado dele, UM artefato do processo que explica por que chegou até a junta: uma hipótese sem derrubador (H10) que virou garantia escrita no artefato.** Não é "critério impossível de passar": o §5 mostra, por execução, que a mesma migração PODE ser atômica no mesmo `migrate deploy`.

**O que a C2 mediu (c2-evidencia.md l.49 e l.105-117; lote1.log l.85-123; lote2.log l.330-359):** cópia da migração com `ALTER TABLE "jsan302_c2_nao_existe" ADD COLUMN "x" INT;` depois da sentença k, base no nível da `main` (112), `prisma migrate deploy` 7.8.0 → em k=1..6: ec=1 (P3018/42P01), sentenças 1..k **commitadas**, `_prisma_migrations` com `finished=false rolled_back=false`; backstop presente em 6/6 (antigo até k=4; antigo+novo em k=5; só o novo em k=6). Recuperação (base `px5`): `migrate deploy` → **P3009**; `resolve --rolled-back` → ec 0; `migrate deploy` → **P3018/42701** (`column "parent_title_id" already exists`).

**Reproduzido por mim (P3 — comando registrado re-executado), `exp.log` l.22-31:** arquivo do objeto, falha depois da sentença 3 → `deploy ec=1`, `P3018`, `42P01`; catálogo `coluna=1 aux=1 fk+check=1 backstop=…active_key`; registro `finished=false rolled_back=false steps=0 logs=true`. **Idêntico ao da C2.**

**Logo:** (i) o deploy do objeto não é atômico; (ii) a migração não é reaplicável sobre o próprio parcial; (iii) a recuperação exige limpeza manual do catálogo. **Nunca há janela sem backstop** (6/6) porque o CREATE do novo precede o DROP do velho e não há sentença de dado — por isso **não perde dado, não vaza entre organizações, não quebra permissão, não erra dinheiro**.

**Por que é defeito do PRODUTO e não só do ambiente:** o comportamento sentença-a-sentença é do runner do Prisma 7.8 (ambiente), mas a **migração deste bloco** (a) escreve no próprio comentário (l.4-5) uma garantia falsa — "na mesma transação do `migrate deploy`" — e (b) é o único artefato do bloco cuja **recuperação de falha** depende dessa garantia: um deploy interrompido (lock timeout, queda de conexão, `statement_timeout`) deixa a base num estado que o `migrate deploy` seguinte **não conserta** (42701) e que o Runbook A (`docs/deployment.md` l.250-252: `migrate resolve --rolled-back` às cegas em produção é proibido) não cobre. Escopo `dentro-do-bloco`, com evidência: migração e comentário nascem em `6ee9bb6d` (2026-10-19); nenhuma das 112 migrações anteriores tem `BEGIN`/`COMMIT` nem faz "CREATE novo → DROP velho" dependente de transação única (a `20260811` está intacta — C2 e DBA).

**Mecanismo, medido no código instalado (não suposto):** `node_modules/@prisma/adapter-pg/dist/index.mjs` l.710-719 — `executeScript(script)` faz `script.split(";")` e `await this.client.query(stmt)` **uma a uma**; é o caminho dos driver adapters (não é o deste repo), mas mostra a filosofia do Prisma 7: **o runner não envolve o script numa transação**. No caminho usado aqui (engine Rust), a C2 mediu o mesmo efeito (6/6) e eu reproduzi (k=3). O `applied_steps_count` do objeto é 1 (`exp.log` l.177) — o engine registra o script como um passo e, mesmo assim, o executa sentença a sentença.

**Gravidade e régua:** `bloqueia` no ciclo 1 (toda `bloqueia` `dentro-do-bloco` reprova — §C7 item 8(2)); do ciclo 3 em diante não bloquearia (não é "perde dado, vaza, quebra permissão ou erra dinheiro"). O voto da C2 classificou exatamente assim (`classe`, N=6, forma declarada), com vermelho-controle vivo (classificador e leitor acusam fabricados; R2 do DBA re-medida). **Achado honesto, bem medido, com comando registrado.** "Se está encontrando erro está tudo certo": a junta funcionou.

**O artefato de processo que explica o achado (sem absolvê-lo):** a H10 nunca teve um comando que a derrubasse (§3). O critério "transação única" entrou no corpo da C2 (fábrica, commit `6e1074e1`) com derrubador executável ("cópia com uma instrução que falha no fim… o catálogo fica inteiro") — e foi **aí**, e só aí, que a hipótese foi executada. O processo pegou o defeito no último gate; deveria tê-lo pego no plano.

## §2. Auditoria (b) — composição e inelegibilidade

**Composição do ciclo 1 (insp-san302-parecer item 2, re-lido):** C1 `jurado-san302-c1-opus` (Claude Opus, nível menor declarado), C2 `jurado-san302-c2-opus` (Claude Opus), C3 `jurado-san302-c3-argon` (Gemini 4 Argon, nível menor por leitura do orquestrador — R2 do inspetor; **caiu sem votar**, 429 da API às 02:39Z), inspetor `inspetor-san302-opus`, DBA-guardião `dba-san302-opus` (parecer, não voto). Inelegíveis conferidos por nome pelo inspetor: 16 (`critico-san3-02-opus*`, `dba-san302-opus`, `dev-san3-02-{cdx,opus,fix-cdx,fix-agyopus}`, `fabrica-san3-02-{gemini,opus}`, `planejador-san3-02-{astra,fable}`, `planejador-san302-b4-fable`, `rev-san3-02-cdx`, `redator-san302-opus`) → **0 colisões**; a C2 re-conferiu o próprio nome (c2-evidencia l.9). **§C7.4-bis no ciclo 1:** quem achou (críticos r1/r2, `rev-san3-02-cdx`) ≠ quem planejou ≠ quem desenvolveu ≠ quem votou — conferido pelo inspetor.

**A composição cobria a competência que o achado exige? SIM.** O corpo da C2 lista "`prisma migrate deploy` em transação única" como competência e como item 3 ("Idempotência e transação única") com derrubador executável; a cadeira o executou e achou. Não foi falha de composição — foi a composição funcionando.

**Por que o DBA-guardião não pegou (dba-parecer item 1):** (i) o mandato dele não pedia falha injetada no `migrate deploy` (itens: aditiva/limpa, restore, rollback, catálogo); (ii) mediu o lock "em transação com ROLLBACK" **própria** (`BEGIN … pg_locks … ROLLBACK`) — o instrumento **impôs** a atomicidade que depois foi dada como premissa; (iii) escreveu "o CONCURRENTLY é vedado na transação do `migrate deploy` (H10)" — herdou a H10 como fato. É a classe "amostra do próprio autor / premissa herdada como fato" (§C7.4(a)), **no parecer de apoio, não na cadeira com veto**. A C2 registrou a divergência no campo `dba_guardiao` (§A2) — correto.

**Queda da C3 (P6 — o orquestrador grava em `votos/B-SAN3-02/00-quedas.md`):** `jurado-san302-c3-argon | Gemini 4 Argon (pin, API) | 3 itens | antes de gravar evidência (sem c3-evidencia.md nem c3-voto.json) | 429 teto mensal da API Gemini, 02:39Z | redo integral dos 3 itens por sucessor de identidade nova (P3: sem comando registrado, nada se herda)`. Consequência: a junta do ciclo 1 **não fecha** com 2 votos (unanimidade de 3), mas o veto da C2 já a reprova; a C3 do ciclo 2 roda em **Opus** (Argon bloqueado; nunca Flash — §C7.6-bis).

**Separação de papéis para o ciclo 2 (obrigatória, §C7.4-bis):**
- **quem achou:** `jurado-san302-c2-opus` — não planeja, não desenvolve, não volta à cadeira;
- **quem planeja:** `planejador-san302-ciclo2-fable` (esta identidade; Fable) — não desenvolve, não vota;
- **quem desenvolve:** identidade NOVA (`dev-san302-c2-opus`, §9) — não julga o achado;
- **inelegíveis para dev, revisor, inspetor e cadeiras NOVAS do ciclo 2:** os 16 do ciclo 1 **+** `jurado-san302-c1-opus` (voto CARREGADO pela `D-JUNTA-SO-CADEIRA-VERMELHA`, §9-bis — não ocupa cadeira nova), `jurado-san302-c2-opus`, `jurado-san302-c3-argon`, `inspetor-san302-opus`, `planejador-san302-ciclo2-fable`. O inspetor do ciclo 2 regenera a lista por comando (não copia esta).

## §3. Auditoria (c) — dado podre no planejamento: a H10 foi medida ou herdada? Por que o DBA não pegou?

**Herdada, nunca medida — em cinco lugares, nenhum com execução:**

| onde | comando | o que diz | medida? |
|---|---|---|---|
| plano **v1** §0.2 l.88 | `grep -n H10 docs/revisoes/SAN3/B-SAN3-02-plano-v1.md` | H10 "`prisma migrate deploy` aplica a migração nova numa única transação…"; derrubador: "T-D confere `pg_indexes` só **depois** do deploy; a C2 confere o SQL (sem `CONCURRENTLY`)" | **não** — o derrubador só olha o estado final e a ausência de `CONCURRENTLY`; não injeta falha |
| plano **v2** §0.2 l.109, §5 l.256, §11 R3 | `grep -n -i "H10\|mesma transação" …plano.md` | mesma H10, mesmo derrubador; §5 "na mesma transação do `migrate deploy` — H10"; R3 "dentro da transação do `migrate deploy`" | **não** (passou intacta v1 → v2; os Anexos A/B mediram drift, não atomicidade) |
| críticas r1 (Opus, Gemini) e r2; revisão `rev-san3-02-cdx` | `grep -n -i "H10\|transação única\|única transação" …critica-*.md …revisao-dev-cdx.md` | **0 ocorrências** | ninguém a contestou |
| migração l.4-5 (dev `dev-san3-02-opus`) | `sed -n '3,5p' prisma/migrations/20260878…/migration.sql` | "o velho só sai DEPOIS de o novo existir, **na mesma transação do `migrate deploy`**" | **não** — `dev.md` não tem uma linha sobre transação do deploy (grep acha só nomes de arquivo) |
| DBA `dba-san302-opus` item 1 | `grep -n H10 …dba-parecer.md` | "o CONCURRENTLY é vedado na transação do `migrate deploy` (H10)"; lock medido em `BEGIN … ROLLBACK` próprio | **não** — mediu dentro da própria transação |

**Diagnóstico:** a H10 é **folclore de ferramenta** — verdadeira para runners que mandam o script inteiro numa só mensagem `simple_query` (o Postgres executa uma mensagem multi-sentença numa transação implícita), **falsa** para o runner do Prisma 7.8, que executa sentença a sentença (prova: `executeScript` do adapter l.710-719; medição da C2 no engine Rust; minha reprodução no §1). O plano a tabelou como hipótese **sem derrubador real**, e dali ela desceu como fato para o §5, para o comentário da migração e para o parecer do DBA. É o "dado podre" do §C7.4(c), **com origem na v1 e propagação por cópia** — não na C2, a única que a executou. Esta auditoria **não** atribui o defeito ao dev (seguiu o plano) nem ao DBA (seguiu o mandato): atribui ao **plano** (identidades `planejador-san3-02-fable`/`-astra`) o derrubador vazio, e ao processo a ausência da regra "hipótese que vira garantia escrita no artefato exige derrubador executável".

**Consequência para o ciclo 2 (registro não se reescreve — §6.2 do plano): a H10 fica FALSIFICADA por apensamento.** Este arquivo vira **Anexo D** do plano (append), com o fato novo **F-H10**: "o `migrate deploy` 7.8.0 executa sentença a sentença; atomicidade só com `BEGIN`/`COMMIT` explícitos no script (medido no §5, 6/6 prefixos)". O comentário da migração l.3-5 é **reescrito no ciclo 2** (é código do bloco, não registro). O §11 R3 do plano é corrigido por apensamento no Anexo D. Lição de processo para a ata: **"toda H do §0.2 cujo enunciado vire texto de artefato (comentário, runbook, decisão) tem derrubador que EXECUTA a propriedade, não que inspeciona o resultado"**.

## §4. Plano do ciclo 2 — objetivo, ator, fluxo

**Objetivo (uma propriedade):** a migração `20260878000000_invoice_complementary_title` é **atômica no `prisma migrate deploy` 7.8** — falha em qualquer das 6 sentenças deixa o catálogo exatamente como antes (índice antigo presente; sem coluna, FK, CHECK nem índices novos) e o redeploy **converge** (`resolve --rolled-back` + `deploy` → catálogo inteiro, `migrate status` "up to date") — **sem mudar o catálogo final** (igual ao do objeto, medido), sem tocar `src/`, `schema.prisma` nem nada que C1, C2 (itens 2 e 3) e o DBA confirmaram. Conserto: **transação explícita no próprio script** (`BEGIN;` antes da sentença 1, `COMMIT;` depois da 6) — medido no §5 em 6/6 prefixos. Nada de "migração nova": a atomicidade da primeira não se conserta por uma segunda (§7).

**Ator:** operação (quem roda `migrate deploy` em staging/produção — hoje só dev e CI, §7) e a CI (`backend-postgres` e `backend`, que já rodam o drill). **Nenhum usuário final; nenhuma rota, DTO, permissão ou alçada muda.** Contrato REST intacto (C3: "o contrato não muda para quem já usa").

**Fluxo origem → destino (do deploy, que é o contrato deste ciclo):**

| estado de origem | comando | destino esperado | código/sinal |
|---|---|---|---|
| base no nível da `main` (112; índice antigo) | `migrate deploy` | head (113): coluna + aux + FK + CHECK + índice de originais; antigo ausente; `_prisma_migrations` `finished_at` preenchido, 1 linha | ec 0, "All migrations have been successfully applied" |
| idem, com falha em qualquer sentença k=1..6 | `migrate deploy` | **catálogo = origem** (0 objetos novos, antigo presente); linha de `20260878` com `finished_at IS NULL`, `rolled_back_at IS NULL`, `logs` NULL | ec 1, "current transaction is aborted…" (a causa real vai ao log do servidor Postgres — risco R1, §10) |
| base com a linha falha | `migrate deploy` | nada aplicado | ec 1, **P3009** |
| base com a linha falha | `migrate resolve --rolled-back 20260878000000_invoice_complementary_title` | linha marcada `rolled_back_at` | ec 0, "marked as rolled back" |
| base com a linha revertida | `migrate deploy` | head (113), 2ª linha `finished_at` preenchido | ec 0; `migrate status` ec 0 "up to date" |
| base que já aplicou a **versão antiga** do arquivo (checksum `c03477dc…`) | `migrate deploy` / `migrate status` | inerte | ec 0 "No pending migrations" / ec 0 "up to date" (medido, §5 item 7) |
| base no head, falha injetada **depois** do `COMMIT` (controle da mutação M29b) | `migrate deploy` | 6 sentenças aplicadas, linha falha com `logs` | ec 1, P3018 — é o que T-D(f) acusa quando o `COMMIT` está no lugar errado |

**Modelagem:** inalterada — a coluna (`UUID` anulável), a chave auxiliar, a FK de 4 colunas `ON DELETE RESTRICT ON UPDATE CASCADE`, o CHECK e o índice parcial de originais são **os mesmos** (snapshot de catálogo variante A = objeto, §5 item 5; RLS e policies iguais). Decimal/timestamptz/delete lógico: nada muda. Migração continua **aditiva** (as 6 sentenças são as mesmas; `BEGIN`/`COMMIT` não criam nem removem objeto). Down: o mesmo rodapé, manual, duas pontas (T-D(d)), agora com a **invocação** escrita no cabeçalho do down (`psql -v ON_ERROR_STOP=1 --single-transaction -f …`, R2 do DBA) — 1 linha de comentário, nenhuma sentença a mais.

## §5. Conserto mínimo — atomicidade (ou reaplicabilidade) da migração no `prisma migrate deploy`: MEDIDO

**Pergunta decisiva:** o schema-engine do Prisma 7.8.0 (`schema-engine-cli 3c6e1927…`, Rust) honra `BEGIN;`/`COMMIT;` escritos no próprio `migration.sql`? **Resposta: SIM, em 6/6 prefixos — logo o conserto é a transação EXPLÍCITA no script, 2 linhas. A alternativa "idempotente/reaplicável" (IF NOT EXISTS + DROP/ADD CONSTRAINT) NÃO é necessária e não se adota** (seria mais invasiva: 6 sentenças mudariam de texto e a FK/CHECK ganhariam um DROP).

**Variante A medida** = arquivo do objeto + `BEGIN;` antes da 1ª sentença (l.8) + `COMMIT;` depois da 6ª (l.37); 8 sentenças sem comentários; as 6 DDL byte-iguais. Falha injetada = `ALTER TABLE "psan302_nao_existe" ADD COLUMN "x" INT;` depois da sentença k. Base por k = `CREATE DATABASE … TEMPLATE psan302_main` (nível da `main`, 112). Comandos e saídas integrais em `C:/Users/AMP/erp-pausa-2026-10-03/psan302-c2/exp.log` e `exp2.log` (k=4 re-medido com o padrão de injeção corrigido — o 1º run não injetou em k=4, `exp.log` l.89 `ocorrencias=0`; registro honesto, não se herdou).

| k | deploy | catálogo depois da falha (coluna · aux · FK+CHECK · backstop) | `_prisma_migrations` | redeploy | `resolve --rolled-back` | deploy final | `status` | log |
|---|---|---|---|---|---|---|---|---|
| 1 | ec 1 | 0 · 0 · 0 · **só o antigo** | linha `finished=false rolled_back=false logs=false` | P3009 | ec 0 | ec 0, 1·1·2·só o novo | ec 0 "up to date" | exp.log l.34-51 |
| 2 | ec 1 | 0 · 0 · 0 · só o antigo | idem | P3009 | ec 0 | ec 0, inteiro | ec 0 | l.52-69 |
| 3 | ec 1 | 0 · 0 · 0 · só o antigo | idem | P3009 | ec 0 | ec 0, inteiro | ec 0 | l.70-87 |
| 4 | ec 1 | 0 · 0 · 0 · só o antigo | idem | P3009 | ec 0 | ec 0, inteiro | ec 0 | **exp2.log** l.14-45 |
| 5 | ec 1 | 0 · 0 · 0 · só o antigo | idem | P3009 | ec 0 | ec 0, inteiro | ec 0 | exp.log l.106-123 |
| 6 | ec 1 | 0 · 0 · 0 · só o antigo | idem | P3009 | ec 0 | ec 0, inteiro | ec 0 | l.124-141 |

**Controles (vermelho vivo):** (i) arquivo do **objeto** (sem BEGIN/COMMIT), falha em k=3 → `coluna=1 aux=1 fk+check=1`, registro falho com `logs=true` (exp.log l.22-31) e em k=4 → `1·1·2`, backstop antigo (exp2.log l.47-56): **o C2-01 reproduzido**. (ii) variante A com a falha **depois do `COMMIT`** → 6 sentenças aplicadas (`1·1·2·só o novo`), registro falho (exp.log l.143-151): é o que a mutação M29b produz e o T-D(f) acusa.

**Caminho feliz e invariantes preservados:** deploy da variante A ec 0, `applied_steps_count=1`, 2º deploy "No pending migrations", `status` ec 0 (exp.log l.153-162); **snapshot de catálogo (índices com `indexdef`, constraints com `pg_get_constraintdef`, RLS/FORCE, policies, colunas) variante A = objeto** (l.163); **delta de drift do Anexo B §3** = exatamente `ALTER TABLE "financial_titles" DROP CONSTRAINT "financial_titles_parent_title_fkey"` só no head, nada só na main (l.165-171); **legado** (2 títulos da mesma OS, 1 removido) → deploy ec 0, md5 das linhas sem a coluna nova igual, `com_pai=0` (l.187-193, H5 continua); **base que já aplicou a versão antiga** (checksum `c03477dc`) + arquivo novo (`a5b4f1d4`) → deploy "No pending", status "up to date", linha intacta (l.173-185) — reescrever é inerte para quem já aplicou.

**Mecanismo observado (para o comentário da migração e o risco R1):** com a transação explícita, a sentença que falha deixa a conexão em "aborted transaction"; o engine tenta gravar `logs` em `_prisma_migrations` na **mesma conexão** e recebe `25P02` — por isso o CLI mostra **"Error: ERROR: current transaction is aborted, commands ignored until end of transaction block"** (saída completa em exp2.log l.26-38) e **não** a causa original (42P01), e a coluna `logs` fica NULL. A linha "started" persiste (foi gravada em autocommit antes do `BEGIN`) → P3009 no redeploy → `resolve --rolled-back` → deploy limpo. A causa real fica no **log do servidor Postgres**. Custo aceito e declarado (§10 R1); o T-D(f) assere **estado**, nunca a mensagem.

**Texto exato do conserto (as 6 sentenças e as 6 do down não mudam um byte):**
```sql
-- (cabeçalho reescrito, l.3-5 → ver §7.1(b))
-- TRANSAÇÃO EXPLÍCITA (ciclo 2, achado C2-01 da junta de 2026-10-20): o `prisma migrate deploy` 7.8 executa o script
-- sentença a sentença, em autocommit — NÃO numa transação única (medido: falha depois da sentença k deixava 1..k
-- aplicadas, P3018, e o redeploy quebrava em 42701). Por isso o corpo vai entre BEGIN e COMMIT: falha em qualquer
-- sentença → nada aplicado, índice antigo intacto (T-D(f)). Deploy falho: o CLI mostra só "current transaction is
-- aborted" (a causa real está no log do servidor Postgres); recuperação = `prisma migrate resolve --rolled-back
-- 20260878000000_invoice_complementary_title` e `prisma migrate deploy` de novo (converge; T-D(f)). Sem CONCURRENTLY.
BEGIN;

-- (1) … ALTER TABLE "financial_titles" ADD COLUMN "parent_title_id" UUID;
-- (2)…(5) inalteradas
-- (6) só depois de o novo existir: o antigo sai.
DROP INDEX IF EXISTS "financial_titles_wo_direction_active_key";

COMMIT;

-- RLS: (inalterado)
-- down (MANUAL, nunca automático; invocar `psql -v ON_ERROR_STOP=1 --single-transaction -f <down.sql>` — sem ON_ERROR_STOP o psql segue no 23505 e derruba coluna e backstop com ec 0, R2 do DBA; provado no drill: up → down → re-up; DUAS PONTAS, como 20260869):
--   (as 6 sentenças do down, inalteradas)
```

## §6. Testes que prendem a propriedade + mutações que os deixam vermelhos

**Arquivo:** `tests/work-order-invoicing-migration-drill-db.test.ts` (o drill existente; molde dele mesmo — `inventory-migration-drill-db` é o avô). Baseline **N = 5** (T-D(a)–(e), medido 5/5 pela C2 e pelo dev). Meta: **6 testes nomeados + 6 sub-asserções por prefixo** (k=1..6 dentro de T-D(f)) → cobertura da migração 5 → 6 casos, 11 pontos de medição; as mutações sobem de 24 → **27** (M29, M29b, M29c). "M ≥ 2N" do plano v2 (§12) já estava cumprido (54 ≥ 32); o ciclo 2 não reduz nenhum número.

**(1) Ajuste dos ajudantes (forma do arquivo):**
- `rawStatements()` (novo): o corpo sem comentários, dividido por `;` de fim de sentença, **sem** asserção de forma — devolve a lista crua (esperado no objeto novo: `["BEGIN", d1, …, d6, "COMMIT"]`, 8 itens).
- `upStatements()` (existente, usado por T-D(b) e T-D(d) para o replay): passa a exigir `raw[0] === "BEGIN"`, `raw.at(-1) === "COMMIT"` e **6** sentenças DDL entre eles; devolve só as 6 (o replay pelo cliente Prisma roda cada DDL em autocommit — é replay de forma, não a prova de atomicidade). Mensagem de erro cita a contagem achada, como hoje (`l.97`).
- `downStatements()`: **inalterado** (o cabeçalho `-- down …` é excluído pelo `findIndex(/^-- down/)`; a nota de invocação vai NESSA linha — ver §7 — e as 6 sentenças seguem como hoje).

**(2) T-D(f) — "deploy atômico por prefixo e recuperação convergente" (o teste que prende a propriedade; comportamento, não forma):**
```
[T-D(f)] para k = 1..6: migrate deploy com falha injetada depois da k-ésima DDL deixa o catálogo
          como antes (0 objetos novos, índice antigo presente, linha falha em _prisma_migrations);
          resolve --rolled-back + deploy convergem (catálogo inteiro, status up to date)
```
Roteiro (tudo em base própria, dentro do cluster da suíte; nunca o arquivo real da migração):
1. **base `<drill>_main`** (nível da `main`): copia `prisma/migrations` para um diretório temporário **sem** o `20260878…`, escreve um `prisma.config.mjs` temporário (`schema` = caminho absoluto de `prisma/schema.prisma`; `migrations.path` = o diretório temporário; `datasource.url = process.env.DATABASE_URL`; `import { defineConfig } from "<file URL absoluto de ROOT/node_modules/prisma/config.js>"`), `CREATE DATABASE`, `migrate deploy --config <tmp>` (ec 0). Diretório temporário em `os.tmpdir()`; se o `--config` não carregar dali (medir no 1º run), usar `<ROOT>/node_modules/.cache/san302-drill/<uuid>/` — gitignored por construção. Removido no `after` (`rmSync` recursivo).
2. **para cada k** (sequencial): `CREATE DATABASE <drill>_k<k> TEMPLATE <drill>_main` (nenhuma conexão aberta na template — o admin fica na base de manutenção); grava no temporário o `20260878…/migration.sql` **variante** = `rawStatements()` do arquivo real com `ALTER TABLE "drill_nao_existe" ADD COLUMN "x" INT` inserida **depois da k-ésima DDL** (conta só sentenças que não são `BEGIN`/`COMMIT`; BEGIN/COMMIT ficam onde o arquivo os tem — assim M29/M29b/M29c são acusadas pelo comportamento, não pela forma); `migrate deploy --config <tmp>` → **espera ec ≠ 0** (`execFileSync` lança; capturar);
   asserções: `parent_title_id` ausente; `financial_titles_tenant_wo_direction_id_key` ausente; FK e CHECK ausentes; `financial_titles_wo_direction_original_active_key` ausente; `financial_titles_wo_direction_active_key` **presente**; `_prisma_migrations`: 1 linha de `20260878…` com `finished_at IS NULL AND rolled_back_at IS NULL`;
   recuperação: restaura o arquivo limpo no temporário; `migrate deploy --config` → ec ≠ 0 e stderr contém `P3009`; `migrate resolve --rolled-back 20260878000000_invoice_complementary_title --config` → ec 0; `migrate deploy --config` → ec 0; asserções: `indexNames()` = `NEW_INDEXES`; coluna, FK e CHECK presentes; `_prisma_migrations`: 1 linha `finished_at IS NOT NULL`, 1 linha `rolled_back_at IS NOT NULL`; `migrate status --config` → ec 0.
3. teardown: `DROP DATABASE … WITH (FORCE)` de `_main` e `_k1..6` no `after` (prefixo do drill, já derivado da `DATABASE_URL`); nunca skip: sem permissão de `CREATE DATABASE` = vermelho (H8).
Custo medido no meu terreno: ~7 s por k (deploy falho + P3009 + resolve + deploy + status) → ~45 s; o `_main` ~5 s. Aceito na CI (`backend-postgres` e `backend`, que já listam o drill, `ci.yml` l.300-301).

**(3) Mutações (vermelho-controle obrigatório, uma por vez, restauro por `git hash-object` = blob; o dev registra `comando → saída → veredito` por mutação):**

| M | mutação na migração | quem morre | por quê (medido) |
|---|---|---|---|
| **M29** | remover `BEGIN;` e `COMMIT;` (= o objeto do ciclo 1) | T-D(f) em **6/6** k (coluna=1 em todo k; redeploy após resolve → 42701); T-D(b)/(d) por forma (`upStatements` acha 6 sem BEGIN/COMMIT) | `exp.log` l.22-31 (k=3); `lote2.log` l.330-359 (k=1..5) |
| **M29b** | mover `COMMIT;` para **antes** da sentença (6) `DROP INDEX` | T-D(f) em k=6 (6 sentenças aplicadas, linha falha com `logs`, backstop só o novo); T-D(b)/(d) por forma (último ≠ COMMIT) | `exp.log` l.143-151 (controle k=7 = falha depois do COMMIT) |
| **M29c** | mover `BEGIN;` para **depois** da sentença (1) `ADD COLUMN` | T-D(f) em k=1 (coluna=1 commitada antes do BEGIN); T-D(b)/(d) por forma (primeiro ≠ BEGIN) | análogo ao k=1 do objeto (`lote2.log` l.334) |

As 24 mutações do plano v2 **não se re-executam no ciclo 2** (nenhum arquivo que elas tocam muda) — exceto **M11b/M28/M22** (migração): o dev as re-roda 1× porque o arquivo da migração foi editado (restauro provado; vermelho esperado idêntico ao do ciclo 1).

## §7. Escopo PERMITIDO / PROIBIDO (caminhos exatos) e decisão: reescrever × migração nova

**Decisão: REESCREVER a mesma migração `20260878000000_invoice_complementary_title/migration.sql`. Não há migração nova.** Fundamentos, todos medidos:
1. **Nunca entrou na `main`:** `git log --oneline origin/main -- prisma/migrations/20260878000000_invoice_complementary_title` → vazio; existe só no ramo do PR #448 (`6ee9bb6d`). A regra "histórico só-apensar" (plano §6.2, forward-only P-007) protege migrações **publicadas**; esta não é.
2. **Nenhum ambiente além de dev/CI a aplicou:** AWS não provisionada (dba-parecer item 2; `D-INFRA-PROVIDER-AWS`; créditos da nuvem anterior encerrados em 03/10 — memória do projeto); a CI usa Postgres efêmero por job; os clusters das cadeiras foram descartados (teardown 0 bases). A base viva `erp-postgres` do dono **não foi consultada** (porta proibida) — se tiver a versão antiga aplicada, o `migrate deploy`/`status` são **inertes** (medido, §5 item 7); só `migrate dev` a apontaria como "modificada" (dev-only; nota no relatório do dev).
3. **Uma migração nova não conserta a primeira:** a 20260878 continuaria não atômica; empilhar uma segunda só mudaria o nome do problema.
4. **O catálogo final é o mesmo** (§5 item 5) e o delta de drift do Anexo B §3 permanece exatamente `DROP CONSTRAINT "financial_titles_parent_title_fkey"` (§5 item 6) — logo `schema.prisma` **não muda**.

### 7.1 PERMITIDO (caminhos exatos; nada mais)

| caminho | o que muda |
|---|---|
| `prisma/migrations/20260878000000_invoice_complementary_title/migration.sql` | (a) `BEGIN;` como **1ª sentença** (antes do `ALTER TABLE … ADD COLUMN`), `COMMIT;` como **última** (depois do `DROP INDEX IF EXISTS …active_key`); (b) cabeçalho l.3-5 reescrito: tira "na mesma transação do `migrate deploy`" e escreve o fato (deploy 7.8 executa sentença a sentença; por isso a transação é explícita; recuperação = `resolve --rolled-back` + `deploy`; a causa real de uma falha está no log do servidor); (c) a linha `-- down (…)` ganha a invocação `psql -v ON_ERROR_STOP=1 --single-transaction -f <down.sql>` e a razão (R2 do DBA) — **na mesma linha do cabeçalho do down**, para o parser do drill (`/^-- down/`) continuar excluindo-a; as 6 sentenças do up e as 6 do down são **byte-iguais** às do objeto |
| `tests/work-order-invoicing-migration-drill-db.test.ts` | `rawStatements()`, `upStatements()` com forma, **T-D(f)**, teardown das bases novas (§6) |
| `docs/revisoes/SAN3/B-SAN3-02-dev.md` | **APPEND** "Ciclo 2": comando → saída → veredito por passo, hashes antes/depois, mutações M29/M29b/M29c (+ M11b/M28/M22 re-rodadas) |
| `docs/revisoes/SAN3/B-SAN3-02-plano.md` | **APPEND** `# ANEXO D — Ciclo 2 (auditoria e plano)` = este arquivo, versionado pelo orquestrador (H10 falsificada; R3 do §11 corrigido) |
| `agent-orchestration/omega/juntas/votos/B-SAN3-02/` | mandatos, evidências e votos do ciclo 2; `00-quedas.md` (linha da C3); ata — pelo orquestrador/inspetor/cadeiras |
| `agent-orchestration/controle/pendencias.md`, `docs/status-geral.md`, `codex/log-execucao.md` | **APPEND only**, se o registro do ciclo 2 exigir (ex.: nota na `P-SAN3-02-DOWN-COM-COMPLEMENTAR` de que a invocação já está no cabeçalho do down) |

### 7.2 PROIBIDO (nominal; fora disto vale o §C4 e o §6.2 do plano v2 por inteiro)

`src/**` (**nenhuma linha de aplicação muda no ciclo 2**) · `prisma/schema.prisma` · qualquer outra migração · `prisma/seed*.ts` · `tests/work-order-invoicing-atomic-db.test.ts`, `tests/work-order-invoicing.test.ts`, `tests/work-order-financials*.test.ts`, `tests/financial-*.test.ts` · `tests/helpers/**` · `.github/workflows/ci.yml` (o drill já está nas `SUITES`, l.300-301) · `docs/deployment.md` (o runbook de recuperação fica no comentário da migração e no Anexo D; mudar o Runbook A é pós-gate) · `package.json`, lockfiles, `.env*`, `infra/**`, `scripts/**` · `RBAC_MATRIX.md` · `Kpis/**` (congelado) · `.claude/agents/**` e `.agents/agents/**` (os corpos do ciclo 1 servem; divergência corpo × plano vai no mandato, como no ciclo 1) · reescrever texto antigo de qualquer registro · **mudar a ordem, o texto ou o número das 6 sentenças do up ou das 6 do down**.

**Travas de mesmo arquivo (SAN3 §6):** inalteradas (`SAN3-20`, `SAN3-23`, `B-O6R-12` esperam este merge).

## §8. Bateria de validação (o dev registra `comando → saída → veredito` por passo, no APPEND de `B-SAN3-02-dev.md`)

**Terreno:** worktree do ramo `fix/faturamento-atomico-e-delta` (`C:/Users/AMP/w-san3-02`, ou próprio em caminho curto com `npm ci` próprio, sem junction — §C7.1-ter(c)); banco **só** pelo `teste-linux.sh` (Postgres 16 descartável; ID `tl…` registrado como do dev); antes de cada subida: Docker alheios ≤ 1 (2 na máquina contando o seu), commit livre ≥ 3 GB, disco ≥ 10 GB; nunca 5432/6379/3000/5173/5050/8899, nunca a base viva, nunca `prune`. `timeout` em tudo; sem `tail -f`.

```bash
# 0. baseline ANTES de editar (objeto 8e6a6c29): hashes e drill
git rev-parse HEAD; git hash-object prisma/migrations/20260878000000_invoice_complementary_title/migration.sql   # aca531da
git hash-object tests/work-order-invoicing-migration-drill-db.test.ts
bash C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh <wt> "node --test --import tsx --test-reporter=tap tests/work-order-invoicing-migration-drill-db.test.ts"   # 5/5, 0 skip
npm run check
# 1. edição (§7.1): migração (BEGIN/COMMIT + cabeçalho + linha do down) e drill (rawStatements/upStatements/T-D(f))
# 2. forma: as 6 sentenças do up e as 6 do down byte-iguais às do objeto (comparar listas normalizadas, sem comentários)
diff <(git show HEAD:prisma/migrations/20260878000000_invoice_complementary_title/migration.sql | grep -v '^\s*--' | grep -v '^\s*$') <(grep -v '^\s*--' prisma/migrations/20260878000000_invoice_complementary_title/migration.sql | grep -v '^\s*$')   # só +BEGIN; e +COMMIT;
# 3. drill 3x no contêiner: 6/6 (T-D(a)–(f)), 0 skip, denominador constante; T-D(f) com 6 prefixos
bash …/teste-linux.sh <wt> "for i in 1 2 3; do node --test --import tsx --test-reporter=tap tests/work-order-invoicing-migration-drill-db.test.ts; done"
# 4. regressão -db do bloco (a migração mudou; a suíte faz migrate deploy no contêiner): 17/17
bash …/teste-linux.sh <wt> "node --test --import tsx --test-reporter=tap tests/work-order-invoicing-atomic-db.test.ts"
# 5. vermelho-controle (uma por vez, só na CÓPIA do contêiner ou no worktree com restauro provado por git hash-object = blob):
#    M29, M29b, M29c → T-D(f) vermelho (k conforme §6); M11b, M28, M22 → vermelhas como no ciclo 1 (T-D(b)/(d), (c), (a)/(e))
# 6. memória, build, guardas
npm run check && npm run lint && npm test && npm run build && git diff --check
# 7. commit único + push; CI 14/14 (push + pull_request) no novo head; KPI: CONGELADO (não tocar Kpis/*)
git commit -m "fix(financeiro): migração 20260878 em transação explícita — deploy atômico no Prisma 7.8 e drill T-D(f) (B-SAN3-02, ciclo 2)"
```

**Critério de aceite do dev (antes de chamar o revisor):** drill **6/6 × 3**, atômica **17/17**, M29/M29b/M29c **vermelhas**, M11b/M28/M22 **vermelhas**, `check/lint/test/build` verdes, `git diff --stat HEAD~1` = **2 arquivos de código** (+ `dev.md`), hashes do restauro iguais aos blobs, limpeza §C5 em 1 linha (contêineres `tl…` removidos pelo trap; `git status` limpo).

## §9. Papéis do ciclo 2 (quem achou ≠ quem planeja ≠ quem desenvolve) e executores

**Executores disponíveis (orquestrador, 01:25 BRT):** Claude Opus subagente; Claude Opus pelo Antigravity (pode cair por crédito em tarefa longa); **Codex fora** até 24/10 20:38; **Gemini API bloqueada** (teto mensal). Logo: todo papel do ciclo 2 roda em **Opus, declarado** (§C7.6); Fable só neste plano. Nunca Sonnet/Haiku/Flash (§C7.6-bis). Composição da junta pela `D-JUNTA-SO-CADEIRA-VERMELHA` — ver §9-bis.

| papel | identidade | executor | mandato |
|---|---|---|---|
| quem achou | `jurado-san302-c2-opus` (ciclo 1) | — | **não** planeja, não desenvolve, não volta à cadeira |
| quem planeja | `planejador-san302-ciclo2-fable` | Fable | este arquivo; não vota, não desenvolve |
| **dev** | `dev-san302-c2-opus` (nova) | Claude Opus **subagente** (precisa de Bash + Docker: a bateria é no contêiner; por isso não é o Antigravity) | §5 texto, §6 testes/mutações, §7 escopo, §8 bateria; prompt simples com as referências (`D-GOV-PROPORCIONAL` (3)); não julga o achado |
| **revisor independente** (antes da junta) | `rev-san302-c2-agyopus` (nova) | Claude Opus pelo **Antigravity** (tarefa curta: ler o diff de 2 arquivos, re-rodar o drill 1× no contêiner, conferir §7.2) — se cair por crédito, sucessor `rev-san302-c2-opus` subagente | diff = 2 arquivos de código + registro; 6 sentenças byte-iguais; T-D(f) mede estado e não mensagem; M29/M29b/M29c vermelhas re-executadas |
| inspetor | `inspetor-san302-c2-opus` (nova) | Opus subagente | forma A com pré-voo; regenera inelegíveis (§2); objeto = novo head com 14/14 check-runs; **confere o §9-bis(1)** por `git diff --name-only 8e6a6c29..<objeto novo>`; R4/R5/R6 do ciclo 1 continuam |
| **C1 — CARREGADA** | `jurado-san302-c1-opus` (voto do ciclo 1 sobre `8e6a6c29`) | — | não se refaz: o conserto não toca arquivo que ela mediu (§9-bis). Só se o inspetor achar interseção, entra `jurado-san302-c1b-opus` (nova) re-executando **só** os comandos de `c1-evidencia.md` no objeto novo (P3 barato) |
| **C2′** | `jurado-san302-c2b-opus` (nova) | Opus subagente | item 1 **inteiro** no novo objeto: falha injetada por prefixo k=1..6 **com injeção própria** (não a do teste), recuperação convergente, **snapshot de catálogo = objeto do ciclo 1** (fecha a dependência indireta da C1, §9-bis), delta de drift Anexo B §3, T-D 6/6, M29/M29b/M29c/M11b/M28/M22 vermelhas, R2 do DBA no cabeçalho do down; itens 2 e 3: re-executa os comandos de `c2-evidencia.md` (roteiro P3) e mede a cauda |
| **C3′** | `jurado-san302-c3b-opus` (nova) | Opus subagente (Argon bloqueado) | mandato integral da C3 do ciclo 1 (regressão por nome, escopo/registro/espelho/mutações, contrato) — **redo integral** (a C3 caiu sem evidência; nada se herda) + a tabela de escopo do ciclo 2 (§7) |
| DBA-guardião | — | — | **sem parecer novo**: o do ciclo 1 segue como insumo A RE-VERIFICAR com a divergência §A2 registrada; a C2′ cobre a atomicidade com veto |

**Régua da junta do ciclo 2:** dinheiro → unanimidade de 3 com veto (C1 carregada + C2′ + C3′ sobre o objeto final); inspetor libera antes; **ciclo 2 é o último em que achado não grave reprova** (§C7 item 8(2)) — por isso o ciclo 2 fecha também os não-graves conhecidos (comentário l.4-5 falso; invocação do down, R2) e não deixa "pendência fácil" para a C2′ apontar. Do ciclo 3 em diante só reprova "perde dado, vaza entre organizações, quebra permissão, erra dinheiro".

**Do orquestrador:** P5 (≤ 2 cadeiras em paralelo; ≤ 2 trabalhos Docker; pausa de 15 min após 2 quedas em 30 min); grava `00-quedas.md` com a linha da C3 (§2) **antes** de abrir o ciclo 2; commita evidência/voto após cada conclusão; ata nomeia quem ocupou cada papel (§C7.4-bis), o modelo declarado e **qual cadeira foi carregada e por qual conferência**; o `planejador-mestre` **não** é chamado de novo salvo nova reprovação de junta (aí, identidade nova em Fable).

## §9-bis. Governança da junta do ciclo 2 — `D-JUNTA-SO-CADEIRA-VERMELHA` (dono, 20/10; PR #451 em revisão; vale desde já, §A1.1)

**(1) Escopo de arquivos do conserto previsto (§7.1):** código = `prisma/migrations/20260878000000_invoice_complementary_title/migration.sql` e `tests/work-order-invoicing-migration-drill-db.test.ts`; registro = `docs/revisoes/SAN3/B-SAN3-02-dev.md` (append), `docs/revisoes/SAN3/B-SAN3-02-plano.md` (Anexo D, append), `agent-orchestration/omega/juntas/votos/B-SAN3-02/**` e, se necessário, `pendencias.md`/`status-geral.md`/`log-execucao.md` (append). **Nada em `src/`, `schema.prisma`, `atomic-db`, `invoicing.test.ts`, `helpers/`, `ci.yml`.**

**(2) Toca o escopo da C1? NÃO.** Arquivos que a C1 mediu (medido em `c1-evidencia.md` + `C:/Users/AMP/erp-pausa-2026-10-03/jsan302-c1/run2-all.log` HASHCHECK 12/12): `src/modules/work-order-financials/{work-order-financial.service.ts, work-order-financial-prisma.repository.ts, work-order-financial.repository.ts, work-order-financial.controller.ts}`, `src/modules/financial-titles/{financial-title.service.ts, financial-title-prisma.repository.ts, financial-title.repository.ts, financial-title.dto.ts, financial-title.types.ts}`, `src/modules/financial-uow/{financial-uow.ts, financial-uow-prisma.ts, index.ts}`, suítes `tests/work-order-invoicing.test.ts` (35/35) e `tests/work-order-invoicing-atomic-db.test.ts` (17/17), sondas próprias `tests/jsan302-c1-*`. **Interseção com o conserto: vazia** → pela regra (1), a C1 **carrega** o voto; o inspetor do ciclo 2 confere por `git diff --name-only 8e6a6c29..<objeto novo>` contra esta lista (regenerada da evidência, não copiada daqui).

**Dependência indireta, declarada para não virar premissa herdada:** o cluster da C1 foi migrado pelo `migrate deploy` (que aplica esta migração) e a mutação M5b dela removeu o índice criado por ela. O conserto muda o **arquivo**, não o **catálogo** (snapshot variante A = objeto, §5 item 5). Quem fecha isso no objeto final é a **C2′** (asserção "snapshot de catálogo = objeto do ciclo 1", com veto) e a bateria do dev (atômica 17/17 no contêiner migrado pelo arquivo novo, §8 passo 4). Se o inspetor medir interseção (ex.: o dev tocar algo fora do §7.1), aplica-se a regra (2): `jurado-san302-c1b-opus` re-executa **só** os comandos de `c1-evidencia.md` no objeto novo.

**(3) Cadeiras que se refazem:** **C2** (REPROVOU) → `jurado-san302-c2b-opus`, identidade e executor novos (Opus subagente); **C3** (não votou — teto do Gemini, queda P6) → `jurado-san302-c3b-opus`, identidade e executor novos (Opus subagente), mandato integral.

**(4) Composição resultante e veredito:** {C1 carregada (`jurado-san302-c1-opus`, voto de `8e6a6c29` estendido ao objeto final pela conferência do inspetor) · C2′ · C3′} — **unanimidade do conjunto sobre o objeto final**; qualquer veto reprova; a ata registra a conferência do inspetor (comando + lista) como condição da carga da C1.

## §10. Riscos, rollback e régua do ciclo 2

| risco | mitigação | residual |
|---|---|---|
| **R1 — mensagem mascarada:** num deploy falho o CLI mostra "current transaction is aborted…" e `logs` fica NULL (o engine grava o erro na conexão abortada — medido, exp2.log l.26-38) | comentário da migração manda ler o **log do servidor Postgres**; T-D(f) assere estado, não mensagem; a recuperação (`resolve --rolled-back` + `deploy`) é a mesma para qualquer causa | o operador precisa do log do servidor para saber **por que** falhou; aceito e declarado |
| **R2 — versão futura do Prisma envolver o script numa transação própria** | `BEGIN` aninhado dá só `WARNING: there is already a transaction in progress`; o `COMMIT` interno encerra a externa cedo — desfecho igual (atômico). Não há caminho em que a forma nova seja **menos** atômica que a do objeto | nenhum |
| **R3 — `migrate dev` numa base de dev que aplicou a versão antiga** (checksum `c03477dc`) | `deploy`/`status` são inertes (medido); só `migrate dev` apontaria "modificada" e proporia reset — base de dev, decisão do dono; **nunca** reset na base viva por agente (lição "sem mass-delete na base viva") | nota no relatório do dev; nada em produção (não existe) |
| **R4 — lock:** antes, cada sentença liberava o `AccessExclusiveLock` entre si; agora ele é segurado da sentença 1 ao `COMMIT` (≈1 s a 200k linhas, DBA item 1) | tabela pequena; janela ≈ a soma já medida; `NOT VALID`/`VALIDATE` segue como R1 do DBA se a tabela crescer a milhões | ms a mais de contenção num deploy; aceito |
| **R5 — tempo da CI:** T-D(f) soma ~50 s ao drill (`backend-postgres` e `backend`) | 6 prefixos sequenciais, bases por `TEMPLATE` (ms), nunca skip | aceito |
| **R6 — `--config` temporário não carregar na CI** (caminho/ESM) | 1ª opção: `os.tmpdir()` + import por file URL absoluto de `node_modules/prisma/config.js`; fallback: `<ROOT>/node_modules/.cache/san302-drill/<uuid>/`; o dev mede no 1º run e registra qual ficou | nenhum (um dos dois carrega; se nenhum, é vermelho de arnês, não de produto — lição do 03a) |
| **R7 — a C3′ encontrar achado próprio** (a C3 do ciclo 1 nunca votou) | o escopo deste ciclo não cresce por antecipação; achado da C3′ é tratado pela régua: grave → ciclo 3 com topo; não grave no ciclo 2 → reprova (régua) — por isso o dev entrega **exatamente** o §7.1 e nada mais, e o revisor confere o `--stat` | possível ciclo 3 por matéria da C3; declarado |

**Rollback do ciclo 2:** `git revert` do commit do ciclo 2 devolve os 2 arquivos ao estado do objeto (`aca531da`, drill 5 casos) — nenhum dado, nenhum catálogo muda (o catálogo final é o mesmo nas duas formas). Rollback da **migração** em base que a aplicou: inalterado (down manual, duas pontas, T-D(d); `P-SAN3-02-DOWN-COM-COMPLEMENTAR`).

**O que fica fora (dito):** runbook de recuperação em `docs/deployment.md` (pós-gate, junto do runbook da ponta B); migrações anteriores (nenhuma precisa de transação explícita — nenhuma faz troca "CREATE novo → DROP velho"); regra geral "toda migração multi-sentença leva BEGIN/COMMIT" — **não** se decide aqui (vira PD/decisão do dono se alguém quiser; registro na ata como pergunta, não como regra).

**Régua e sinal de não-convergência (§C7.4):** classe do defeito = "integridade operacional da migração"; se a C2′ reprovar pela **mesma classe sem informação nova**, o orquestrador relata não-convergência; se reprovar por classe nova e não grave, o ciclo 3 já mergeia com pendência (item 8(2)).

## Resumo para a ata e para o briefing

1. **C2-01 é defeito REAL do produto, não grave, reproduzido** (k=3 e k=4 no meu terreno): o `migrate deploy` 7.8 executa a 20260878 sentença a sentença; falha deixa parcial (P3018), redeploy não converge (42701). Sem perda de dado/dinheiro (backstop em 6/6). A junta funcionou; a C3 (Argon) **caiu sem votar** (429, 02:39Z) — linha P6 no §2.
2. **Dado podre: H10** nasceu na v1 (l.88) com derrubador que não derruba, passou à v2, ao comentário da migração (l.4-5) e ao parecer do DBA (que mediu dentro da própria transação); ninguém a executou antes da C2. Fica **falsificada por apensamento** (Anexo D = este arquivo).
3. **Conserto (medido, 6/6 prefixos):** `BEGIN;` antes da sentença 1 e `COMMIT;` depois da 6 na **mesma** migração (nunca entrou na `main`; nenhum ambiente além de dev/CI); catálogo final, RLS, drift (Anexo B §3) e legado **iguais** ao objeto; base que já aplicou a versão antiga: inerte. Cabeçalho reescrito; linha do down ganha a invocação (R2 do DBA).
4. **Testes:** T-D(f) (falha injetada após cada DDL k=1..6 → catálogo inteiro; `resolve --rolled-back` + deploy convergem; `status` ec 0) + forma em `upStatements()`; mutações **M29/M29b/M29c** vermelhas; M11b/M28/M22 re-rodadas. Drill 5 → 6 casos; mutações 24 → 27.
5. **Escopo:** 2 arquivos de código (`migration.sql`, `…migration-drill-db.test.ts`) + registro APPEND; **`src/`, `schema.prisma` e demais suítes PROIBIDOS**.
6. **Junta (`D-JUNTA-SO-CADEIRA-VERMELHA`, §9-bis):** o conserto **não toca** arquivo medido pela C1 → **C1 carregada** (inspetor confere por `git diff --name-only`); refazem-se **C2′** `jurado-san302-c2b-opus` e **C3′** `jurado-san302-c3b-opus` (identidade e executor novos, Opus); unanimidade do conjunto no objeto final. Dev `dev-san302-c2-opus` (subagente), revisor `rev-san302-c2-agyopus` (Antigravity; sucessor subagente), inspetor `inspetor-san302-c2-opus`. Quem achou não planeja nem desenvolve.
7. **Risco declarado:** o CLI mascara a causa de um deploy falho ("current transaction is aborted"; `logs` NULL) — causa no log do servidor; T-D(f) assere estado. Ciclo 2 = último em que não-grave reprova: por isso fecha também os não-graves conhecidos.
8. **Terreno:** nada tocado no repositório; experimento em cluster descartável (`teste-linux.sh`), teardown 0 bases, 0 contêineres; roteiros e logs em `C:/Users/AMP/erp-pausa-2026-10-03/psan302-c2/`.
