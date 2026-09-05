# VOTO C2 — jurado-c5-banco-fk-triggers · B-O6R-02 ciclo 5 (TETO) · head 2709f4b

- **Cadeira:** C2, TITULAR, identidade NOVA (nunca votou/planejou/desenvolveu nesta trilha).
  Absorveu o núcleo de `jurado-c5-ataque-ao-dinheiro` (fundida — D2/E1.1 do SAN2-5-plano).
  Corpo `ab726a8`, conferido pelo inspetor contra E1.8. Suplente nomeado:
  `jurado-c5-suplente-banco-fk-triggers`.
- **Quórum:** UNANIMIDADE DE 3 (§C7.1-ter(b) — dinheiro). Veto desta cadeira não alcança
  achado `pre-existente` com evidência.
- **Registro incremental (P1):** este arquivo cresce a cada item medido, na ordem em que medi.
  Nenhuma afirmação sem comando executado.
- **Data:** 2026-09-03

## ESQUELETO

- [ ] T — terreno (worktree próprio, npm ci, cluster próprio, porta via netsh, 106 migrations, Node)
- [ ] M1.1 — FK no catálogo (pg_constraint/pg_attribute/pg_indexes; aditividade)
- [ ] M1.2 — sondas (v)/(vii) nas DUAS direções + SALDO + teardown idiomático
- [ ] M1.3 — par cross-tenant + MATCH SIMPLE
- [ ] M2.4 — D35 up→down→re-up com série de pg_constraint + duração do VALIDATE
- [ ] M2.5 — censo fail-closed nas duas condições (base limpa / órfão semeado)
- [ ] M2.6 — idioma replica não vaza (sessão, caminho de falha, teardown escopado)
- [ ] M3.7 — suíte -db baseline + [RLS] real asserido + D34 (triggers no down → vermelho; re-up verde)
- [ ] M3.8 — re-ataque de SALDO com FK instalada (SQL cru + serviço + endpoint HTTP real)
- [ ] M3.9 — contrato frase-a-frase contra a tabela de ataque
- [ ] AFIRMAÇÕES HERDADAS confrontadas · ACHADOS · TEARDOWN · VOTO

---

## T — TERRENO · medido

- Worktree PRÓPRIO: `git worktree add --detach .claude/worktrees/jur-c5-banco-fk 2709f4b` →
  `git rev-parse --short HEAD` = **2709f4b**, `git status --porcelain` = **0 linhas**. Node **v20.19.5**.
  Nome distinto do worktree do suplente e do worktree do bloco. `npm ci --no-audit --no-fund` próprio
  (sem junction — §C7.1-ter(c)).
- Porta conferida ANTES por `netsh interface ipv4 show excludedportrange protocol=tcp` (saída
  transcrita no diário da sessão): faixas reservadas hoje = 2869 · 5357 · 49698–50559 · 53295–53494 ·
  54183–54382 · 54517–54616 · 54893–55092 · 60413–61012. Escolhidas **15501** (pg) e **15502** (redis)
  — fora de todas, distintas de 5432/6379 (base viva, INTOCADA) e de 15432 (vizinho, já morto).
- Clusters descartáveis PRÓPRIOS: `jur-c5-bfk-pg` (postgres:16, `--rm`, :15501) e `jur-c5-bfk-redis`
  (redis:7, `--rm`, :15502). A base viva `erp-postgres`/`erp-redis` não recebeu comando algum, nem leitura.
- Âncoras do produto no head, por `git rev-parse HEAD:<caminho>`:
  `financial-entry-undo-owners.ts` = **e352c6c** · `financial-entry.service.ts` = **9be7caf** —
  batem com a tabela re-medida do terreno pós-absorção §2. `src/**` não foi re-lido além disso.
- **Aditividade textual da migration nova:** `git ls-tree HEAD:prisma/migrations` = **106** dirs;
  `git diff --name-status 84bb90b HEAD -- prisma/migrations/` = exatamente
  `A prisma/migrations/20260871000000_add_reversal_pair_fk/migration.sql` (1 arquivo, ADDED);
  `git diff 12c3825 HEAD -- prisma/migrations/20260870000000_.../` = **0 linhas** (cabeçalho intocado);
  `git diff 84bb90b HEAD -- prisma/schema.prisma` = **0**. Nenhum DROP/ALTER de coluna, TRUNCATE ou
  DELETE de dado no arquivo da migration (64 linhas, lidas): censo `DO` + `ADD CONSTRAINT NOT VALID` +
  `VALIDATE`. **Não é destrutiva — sem parada §C7.5.**
- Greps herdados RE-VERIFICADOS no head: `REFERENCES|FOREIGN KEY` sobre `reversal_of` fora da migration
  nova = **0**; `.delete(` em `src/modules/financial-entries/**` = só a rota→`service.delete` (soft) e o
  `Map.delete` do repositório de memória — **0 DELETE físico**.

## M1.1 — A FK NO CATÁLOGO, NÃO NO TEXTO · **VERDE**

Cluster próprio :15501, pós-`migrate deploy` ec=0 (**106** migrations aplicadas — contadas no log
por `grep -c "^Applying migration"`; o caminho feliz do censo `$censo_fk$` em base limpa fica provado
de carona: o deploy inclui a 20260871 e fechou ec=0). Dump executado por `psql` no container:

```
conname   = financial_entries_reversal_pair_fk
contype   = f · convalidated = t · confdeltype = r (RESTRICT) · confupdtype = r (RESTRICT)
conrelid  = financial_entries · confrelid = financial_entries
conkey    = {2,13}  → pg_attribute: 2=tenant_id, 13=reversal_of
confkey   = {2,1}   → pg_attribute: 2=tenant_id, 1=id
conindid  → financial_entries_tenant_id_id_key (índice ÚNICO pré-existente,
            nascido na migration 20260812000000_add_financial_entries — conferido por grep)
pg_get_constraintdef = FOREIGN KEY (tenant_id, reversal_of)
  REFERENCES financial_entries(tenant_id, id) ON UPDATE RESTRICT ON DELETE RESTRICT
```

- `pg_constraint` da tabela = **5** (pkey + 3 FKs herdadas + a nova) — o "5" da série publicada confere.
- `pg_indexes` de `financial_entries` = **8** índices, todos pré-existentes; a FK **não criou índice**
  (prova cruzada no D35: a lista é idêntica com a constraint dropada).
- attnums resolvidos por `pg_attribute`, não por nome. **RESTRICT dos dois lados, não NO ACTION** (`r`,
  não `a`), **validada** (`convalidated=t` — o VALIDATE cobriu as linhas existentes).
- Triggers de usuário na tabela: exatamente os 2 da 20260870 (`block_orphan_on_delete`,
  `block_orphan_on_reversal`).

## M1.2 + M1.3 — SONDAS CRUAS COM A FK · MATCH SIMPLE · CROSS-TENANT · **VERDE**

Forma: `psql` no container próprio, `VERBOSITY verbose` (SQLSTATE colado), par vivo semeado por SQL cru
(out 100 + estorno in 100 via trigger B), tenant/conta PRÓPRIOS. Log `m12-m13-sondas.log` no scratchpad.
Nota de método: stderr (erros) e stdout (echo/result) intercalam no arquivo; a atribuição é pelo
`DETAIL` de cada erro, que carrega a chave exata — inequívoca em todos.

| sonda | com FK | SQLSTATE | constraint nomeada | efeito |
|---|---|---|---|---|
| (v) DELETE físico do original c/ estorno vivo | **RECUSADA** | **23503** | `financial_entries_reversal_pair_fk` | par intacto |
| (vii) UPDATE id (rename PK) do original | **RECUSADA** | **23503** | `financial_entries_reversal_pair_fk` | par intacto |
| SALDO DB após as duas recusas | — | — | — | vivas=**2**, saldo=**0.00** |
| INSERT reversal_of NULL (MATCH SIMPLE) | **ACEITA** | — | — | lançamento comum passa; a FK só é checada com o par preenchido |
| cross-tenant INSERT (estorno em A → id vivo de B), triggers LIGADOS | **RECUSADA** | P0001 | trigger B (`Ω6R-DIN-002`) | defesa em profundidade: o trigger chega antes |
| cross-tenant INSERT, `DISABLE TRIGGER USER` (só o catálogo responde) | **RECUSADA** | **23503** | `financial_entries_reversal_pair_fk` — `Key (tenant_id, reversal_of)=(A, idB) is not present` | **é a propriedade que SÓ a FK COMPOSTA dá** — FK simples `(reversal_of)→(id)` aceitaria |
| UPDATE tenant_id do ORIGINAL (separar o par) | **RECUSADA** | **23503** | `financial_entries_reversal_pair_fk` (still referenced) | ON UPDATE RESTRICT morde na chave referenciada |
| UPDATE tenant_id da CONTRAPARTIDA | **RECUSADA** | **23503** | `financial_entries_tenant_id_account_id_fkey` (conta composta chega primeiro; a pair-FK seria backstop — (B, orig-A) inexistente) | par não se separa por tenant |
| teardown idiomático: DELETE do par inteiro em 1 statement | **ACEITA** | — | — | `DELETE 3`, sobraram 0 — FK não quebra limpeza de suíte |

Triggers re-habilitados ao fim (`tgenabled=O` nos 2, conferido por catálogo). O `DISABLE TRIGGER USER`
foi só no MEU cluster descartável, para atribuição, e durou 1 statement.
**Falta o vermelho-controle (aceitação no down) — é o M2.4/M2.5 abaixo; sem ele isto ainda não é prova.**

## M2.4 — D35: UP→DOWN→RE-UP COM O CATÁLOGO CONTADO · **VERDE**
## M2.5 — CENSO FAIL-CLOSED NAS DUAS CONDIÇÕES · **VERDE**

Executado no meu cluster (log `m24-d35.log`); o re-up usa o ARQUIVO da migration extraído por
`git show HEAD:prisma/migrations/20260871000000_add_reversal_pair_fk/migration.sql` (eol-neutro,
nunca cópia digitada). Série REAL medida:

| passo | comando | ec | pg_constraint | nota |
|---|---|---|---|---|
| 0 · up (estado pós-deploy) | — | — | **5** | idx-up/cols-up snapshotados |
| 1 · down (rodapé) | `DROP CONSTRAINT IF EXISTS` | **0** | **4** | diff pg_indexes up/down = **0** · diff colunas = **0** — a migration não deixa NADA além da constraint |
| 2 · sonda (v) NO DOWN | `DELETE` físico do original | **0 = ACEITA** | — | `DELETE 1`; SALDO DB do par = **+100.00** — dinheiro fabricado SEM a FK (o vermelho-controle do efeito) |
| 2 · sonda (vii) NO DOWN | `UPDATE id` do original | **0 = ACEITA** | — | id renomeado; **2 referências penduradas** criadas |
| 3 · re-up COM órfão semeado | arquivo da migration | **3 = ABORTA** | **4** (inalterado) | `RAISE EXCEPTION` nomeando **P-O6R-B02-ORFAOS-LEGADOS**, publica SÓ a contagem (2), nunca tenant_id; linhas da tabela **4→4 (zero mutação)** |
| 4 · limpeza ESCOPADA | `DELETE ... id IN (3 ids próprios)` | 0 | — | nunca curinga; penduradas → 0 |
| 5 · re-up LIMPO | arquivo da migration | **0** | **5** · `convalidated=t` | duração total do arquivo (censo+ADD+VALIDATE) = **290 ms** |
| 6 · 2ª volta down→up | ADD `NOT VALID` + VALIDATE isolado | **0** | 4→**5** | **VALIDATE = 6.934 ms** (`\timing`; base quase vazia — forma declarada) |

- Diff `pg_indexes` up/final = **0**; diff de colunas = **0**. **Aditiva pura provada por catálogo**, não
  só pelo texto.
- As duas direções das sondas estão fechadas: **recusadas com 23503 com a FK (M1.2) e ACEITAS no down
  (passo 2)** — a recusa é atribuível à FK, não a trigger/permissão/RLS/arranjo.
- Censo nas duas condições: base limpa → aplica (ec=0, duas vezes: `migrate deploy` e passo 5); órfão
  semeado ANTES → **aborta sem mutar**, nomeando a pendência. Higiene não foi feita pela migration
  (decisão humana §C7.5) — a limpeza do passo 4 foi MINHA, escopada por id, no MEU cluster.
- Divergência com a série publicada: nenhuma (5→4→5 confere). Duração do VALIDATE publicada pelo bloco
  (3.635 ms / 217 ms na sonda §0.d) vs minha (6.934 ms): mesma ordem de grandeza, formas distintas
  (bases distintas) — não comparável por forma, sem achado.

## M2.6 — O IDIOMA DO SEED (`session_replication_role='replica'`) NÃO VAZA · **VERDE**

- Grep na suíte: exatamente **2** ocorrências (l.493 `SET ... 'replica'`, l.498 `SET ... DEFAULT`) —
  **SET de sessão**; `ALTER DATABASE`/`ALTER SYSTEM` = **0** ocorrências.
- Falha injetada entre o SET e o restore (probe meu, `m26-replica.log`): o erro NÃO restaura sozinho
  (`SHOW` segue `replica` na mesma sessão) — mas o caminho de falha da suíte cai no
  `finally { raw.end() }` (l.529-531), que FECHA a sessão; **sessão nova conferida = `origin`**
  (medido). O GUC morre com a conexão; não há como vazar para outra sessão nem para o banco.
- O client `raw` é dedicado ao caso (aberto/fechado dentro dele); o pool Prisma nunca recebe o GUC.
- Teardown da suíte: 6 sentenças, TODAS com `where tenant_id = $1`/`id = $1` — **nenhum curinga,
  nenhum mass-delete** (l.601-606, lidas).
- No meu uso próprio do idioma: nenhum — semeei órfão no down da FK (M2.4 passo 2), sem replica.

## M3.7 — SUÍTE -DB · [RLS] REAL · D34 NAS DUAS PONTAS · **VERDE**

Forma: `node --test --import tsx tests/financial-entry-delete-reverse-race-db.test.ts`, worktree
próprio, head 2709f4b, Node v20.19.5, `DATABASE_URL`=:15501 (meu), `REDIS_URL`=:15502 (meu),
`CORE_SAAS_PERSISTENCE` fixada em `prisma` pela própria suíte, cluster com **106** migrations.
Exit por variável; contagens lidas do TAP no arquivo. Logs `m37-*.log` no scratchpad.

| rodada | arranjo | ec | tests/pass/fail | vermelhos |
|---|---|---|---|---|
| baseline | tudo aplicado | **0** | 9/9/0 | — · greps `40P01`=0 `XX000`=0 `unhandledRejection`=0 |
| **D34 down** | 4 DROPs do rodapé da 20260870 (ec=0; triggers=0 no catálogo) | **1** | 9/5/**4** | not ok 3 (trigger B) · 4 (trigger A) · 5 (barrier) · **8 — `[C10/P14][db][RLS real]`** |
| D34 re-up | arquivo da 20260870 via `git show HEAD:` (ec=0; triggers=2) | **0** | 9/9/0 | — |
| **FK down** | `DROP CONSTRAINT financial_entries_reversal_pair_fk` | **1** | 9/7/**2** | **exatamente not ok 6 e 7 — os 2 casos C9**; os outros 7 verdes (a afirmação publicada pelo bloco, re-executada por mim) |
| FK re-up | arquivo da 20260871 via `git show HEAD:` | **0** | 9/9/0 | catálogo final: 5 constraints, `convalidated=t` |

- **O caso `[RLS]` agora discrimina:** com os triggers derrubados ele fica **VERMELHO**, e na asserção
  certa — `Missing expected rejection: soft-delete do original com estorno vivo tem de ser recusado
  pelo Trigger A sob o papel RLS-real` (extraído do TAP). No ciclo 4 este caso ficava VERDE com os
  triggers no down (`ok 6`) — a propriedade P14 está entregue e provada na quebra.
- **Identidade da conexão asserida DENTRO do caso, na conexão sob teste** (l.367-372 da suíte, e o caso
  passou no meu cluster — logo a asserção executou e segurou): `SELECT rolsuper, rolbypassrls FROM
  pg_roles WHERE rolname = current_user` → `rolsuper=f`, `rolbypassrls=f`; e a política MORDENDO:
  `semContexto=0` / `comContexto=1` sob o papel efêmero (FORCE RLS).
- O negativo B do caso é deliberadamente FK-indiferente (original soft-deletado EXISTE fisicamente) —
  é o que faz o D34 separar trigger de FK, e a execução confirmou: FK no down não o derruba.

## M3.8 — RE-ATAQUE DE SALDO COM A FK INSTALADA · **VERDE (0 fabricado nos vetores guardados)**

Forma: script próprio (`node --import tsx`, arquivo em `node_modules/` do MEU worktree — gitignored,
removido no teardown), app REAL (`createApp(new PrismaCoreSaasService())`, `CORE_SAAS_PERSISTENCE=prisma`)
ouvindo em porta efêmera sobre o MEU cluster; SALDO lido pelas DUAS portas a cada vetor: serviço
(`entryService.balance`) e **endpoint real `GET /api/v1/financial-accounts/:id/balance`** (sanidade A0:
status 200, svc=ep=0 com par legítimo). Log `m38-ataque.log`. `git status --porcelain` do worktree = 0
depois de tudo.

| caminho | camada | N | fabricados | SALDO (svc/ep) | veredicto da recusa |
|---|---|---|---|---|---|
| DELETE físico do ORIGINAL c/ estorno vivo | SQL cru | 10 | **0** | 0 / 0 | 10×**23503** (FK) |
| DELETE físico da CONTRAPARTIDA | SQL cru | 1 | 1 | **−100 / −100** | ACEITO — **LIMITE NOMEADO no contrato** (l.438-441) |
| soft-delete cru do ORIGINAL c/ estorno vivo | SQL cru | 1 | **0** | 0 / 0 | P0001 `Ω6R-DIN-002` (Trigger A — quem responde é o trigger, não a FK, como o desenho manda) |
| soft-delete cru da CONTRAPARTIDA | SQL cru | 1 | 0* | −100 / −100 | ACEITO — não produz metade órfã: vira o estado legítimo "nunca estornado" (ver nota N1) |
| UPDATE amount cru da contrapartida (100→200) | SQL cru | 1 | 1 | **+100 / +100** | ACEITO — **LIMITE NOMEADO** |
| estorno DUPLO raw do mesmo original (sequencial) | SQL cru | 10 | **0** | 0 / 0 | 10×**23505** (`financial_entries_reversal_of_active_key`) |
| estorno duplo raw sob CORRIDA (2 conexões) | SQL cru | 20 | **0** | 0 / 0 | exatamente 1 vencedor por iteração (wins=20/40); perdedor 23505; **40P01=0** |
| estorno raw de original SOFT-deletado | SQL cru | 1 | **0** | 0 / 0 | P0001 (Trigger B — o caso FK-indiferente) |
| corrida delete×reverse pelo ENDPOINT (reverse-first) | endpoint | 20 | **0** | 0 / 0 · maxAbs=0 | ambos-2xx=0; statuses 200×16/201×4/404×16/422×4; 0×5xx |
| corrida delete×reverse pelo ENDPOINT (delete-first) | endpoint | 20 | **0** | 0 / 0 · maxAbs=0 | ambos-2xx=0; statuses 200×11/201×9/404×11/422×9; 0×5xx |
| cross-tenant HTTP (balance/delete/reverse de A com ator B) | endpoint | 3 | **0** | 0 / 0 (saldo de A intacto) | **404/404/404** `account_not_found`/`entry_not_found` — X-Tenant-Id resolve org e NUNCA autoriza; 404 antes de regra |

- Greps no log: `XX000`=0 · `unhandledRejection`=0 · `40P01` real=0 (a única ocorrência da string é o
  meu próprio rótulo `40P01=0`) · nenhum status 5xx.
- O "B-1 fechado" do ciclo 4 NÃO foi herdado: a corrida delete×reverse foi re-atacada POR MIM, neste
  head, com a FK instalada, pelo endpoint real, nas duas ordens, N=20 cada — 0 fabricado em 40.
- (*) fabricados=0 no soft-delete da contrapartida porque o estado resultante (−100) é alcançável
  legitimamente (lançamento nunca estornado) — não é dinheiro criado; é edição crua de história, mesma
  classe do DELETE físico da contrapartida que o contrato nomeia.

## M3.9 — O CONTRATO, FRASE A FRASE, CONTRA A MINHA TABELA · **VERDE com 1 nota**

`API_CONTRACTS.md` l.399-448, `financial_entry_undo@2026-09-02.b-o6r-02-c5`:

| frase do contrato | minha execução que a sustenta |
|---|---|
| "DELETE e reverse do MESMO par nunca comprometem ambas sob concorrência — efeito líquido 0, ou uma recusa, SEMPRE" | suíte C1/P9 (2 ordens × 20, service) 9/9 verde no meu cluster + **meu A7 pelo endpoint (2×20, ambos-2xx=0, saldo 0)** |
| "metade órfã por SOFT-delete/estorno é recusada pelo par de triggers ... inclusive sob papel NOBYPASSRLS com a política aplicada" | A3-original P0001 · A6 P0001 · caso `[C10]` verde com postura asserida · **D34: vermelho com triggers no down** |
| "separação CRUA do par — DELETE físico do original e rename da PK — recusada por construção pela FK composta ... SQLSTATE 23503" | M1.2 (23503×2 nomeando a constraint) · A1 (10×23503) · **aceitas no down (M2.4 passo 2)** — a atribuição é da FK |
| "O limite que resta, nomeado: UPDATE amount/account_id, DELETE físico da CONTRAPARTIDA — permanecem possíveis ... nenhum desenho de par as fecha" | A2 (aceito, −100) e A4 (aceito, +100) — **o limite declarado é real e foi reproduzido; o texto não promete o que eu fabricei** |
| censo WARNING da 20260870 + censo fail-closed da 20260871 | caso `[A6]` verde (WARNING nomeado + controle mudo) · M2.5 (aborta com órfão, ec=3, zero mutação) |
| "as suítes nomeadas ficam vermelhas se a invariante regredir" | D34 (4 vermelhos) e FK-down (2 vermelhos exatos) — as suítes mordem na quebra; `financial-entries.test.ts` contém as 2 ordens (grep `reverse-first|delete-first` > 0) |

**N1 (nota, não veto):** a lista exemplificativa do limite nomeia `UPDATE amount/account_id` e "DELETE
físico da contrapartida", mas não nomeia a variante **soft-delete cru da contrapartida** (mesma classe,
mesmo efeito líquido de des-estornar, medida por mim: aceita, −100). Não é over-claim — o estado
resultante não é metade órfã e o guarda-chuva "edições cruas fora da classe do par" a cobre por classe —
mas o exemplo explícito pouparia o próximo leitor. Gravidade: nota · escopo: dentro-do-bloco.

## AFIRMAÇÕES HERDADAS — CONFRONTADAS UMA A UMA

| afirmação | origem | meu resultado |
|---|---|---|
| ADD `NOT VALID`+`VALIDATE` ec=0; (v)/(vii) recusadas com FK, aceitas sem | plano §0.d | **CONFIRMADA por execução** (M1.2, M2.4 passo 2) |
| índice `financial_entries_tenant_id_id_key` já existe; FK não exige índice novo | plano §0.d | **CONFIRMADA**: `conindid` aponta o índice da 20260812000000; diff `pg_indexes` up/down/final = 0 |
| 0 `REFERENCES/FK` sobre `reversal_of`; 0 DELETE físico em `src/**` | greps do planejador | **CONFIRMADA** por grep meu no head (T) |
| caso `[RLS]` rodava como `postgres` (título > execução) | plano §0.e | **SUPERADA no head**: caso reformulado; postura asserida na conexão sob teste; **D34 executado por MIM discrimina** (vermelho na quebra, na asserção certa) |
| migrations 105 → **106** com a FK | SAN2-5 §2.4 | **CONFIRMADA**: deploy aplicou 106; `ls-tree` = 106 |
| âncoras `e352c6c`/`9be7caf` intactas | terreno pós-absorção | **CONFIRMADA** por `git rev-parse HEAD:<caminho>` |
| série D35 `5→4→5`; "só os 2 C9 caem no down da FK" | diário do bloco | **RE-EXECUTADA e CONFIRMADA** (M2.4, M3.7) |
| "B-1 FECHADO por 3 cadeiras" | ata c4 (outro head) | **NÃO HERDADA** — re-atacado por mim neste head, endpoint real, 2 ordens × 20: 0 fabricado (M3.8 A7) |
| "15/25 DIVERGE" do espelho Codex | ata c4/plano §0.c | não é matéria desta cadeira; fechada por não-reprodução (ERRATA S0); **não usei como insumo** |

## ACHADOS

1. **N1** · defeito: a lista exemplificativa do limite do contrato (l.438-441) não nomeia a variante
   "soft-delete cru da contrapartida" (mesma classe e mesmo efeito líquido do DELETE físico da
   contrapartida, que ela nomeia). · evidência: M3.8 A3 (aceito, SALDO −100/−100 svc/ep) ×
   `API_CONTRACTS.md` l.438-441. · gravidade: **nota** · escopo: **dentro-do-bloco** · propriedade:
   *o exemplo publicado cobre por classe, não por enumeração; nenhuma garantia afirmada é violada —
   o estado resultante não é metade órfã e é alcançável por fluxo legítimo.* Não propõe conserto.

Nenhum achado `bloqueia`. Nenhum caminho fabricou saldo por vetor que a migration nova abriu; nenhum
40P01; nenhuma migration destrutiva; nenhum verde durante quebra.

## O QUE NÃO JULGO (cadeiras nomeadas)

- **C1 `jurado-c5-arnes-catalogo-postgres`**: canônica 3 N≥10 com denominador idêntico (2771),
  vaza-metro por rodada, D29 pela lista-6 nomeada, D33, ratchet do catálogo.
- **C3 `jurado-c5-validador-diff-plano`**: escopo §5 arquivo a arquivo (inclusive `Kpis/app.js` da nota
  R5b), pisos §6, canônicas 1 e 2 com N e forma, **ordem do contrato (D36)** — meu julgamento foi de
  CONTEÚDO do contrato, não de ordem —, KPI, registro §12 (inclui fechamento de
  `P-O6R-B02-OVERCLAIM-ORFA-SQL-CRU` e o ACHADO-2 do crítico).

## PENDÊNCIAS QUE ACEITO

- R3 do inspetor (espelho Codex de `especialistas/` ausente na main) — `pre-existente` provado por
  `ls-tree f895dd2`, dono a nomear; não é matéria de banco.
- `P-O6R-ARNES-ISOLAMENTO` (vazamento +5/+5 da canônica 3; ACHADO-4 do crítico já emendou a frase) —
  bloco dono `B-O6R-ARNES`; fora da minha cadeira.
- `P-SYNC-AGENTS-NAO-RECURSIVO` — pre-existente, com a nota do inspetor de que o script já é recursivo.
- ACHADO-1/ACHADO-2 do crítico (registro/processo) — matéria da C3 e da ata.

## TEARDOWN (executado e conferido)

Criei: worktree `jur-c5-banco-fk` (npm ci próprio, sem junction) · containers `jur-c5-bfk-pg`/`jur-c5-bfk-redis`
(`--rm`, :15501/:15502) · 2 tenants por psql + ~14 tenants efêmeros do script de ataque (todos com
teardown escopado por tenant_id dentro do script) · 1 probe `.mts` DENTRO de `node_modules/` (gitignored)
· logs no scratchpad, fora da árvore · este arquivo de voto (entregável).
Derrubei: probe removido; worktree pristino (`git status --porcelain`=0) e removido por
`git worktree remove --force` + `prune` (conferido em `git worktree list`); containers removidos
(`docker ps -a` resta: base viva + clusters de OUTRAS cadeiras, intocados); volumes com meu prefixo = 0.
Mutações em arquivo rastreado: **zero** (nenhum hash a restaurar). `session_replication_role`: usei só
em sessão psql de probe, morta com a conexão; nova sessão conferida `origin`. `DISABLE TRIGGER USER`:
1 statement no meu cluster, re-habilitado e conferido (`tgenabled=O`), cluster destruído depois.
Base viva `erp-postgres`/`erp-redis`: **nenhum comando, nem leitura**.

---

# VEREDITO

VOTO: APROVADO — a metade órfã é impossível por construção do banco e não fabriquei um centavo com a FK instalada (FK provada em pg_constraint com conkey/confkey resolvidos por attnum, RESTRICT/RESTRICT, convalidated=t, conindid no índice pré-existente; (v)/(vii)/cross-tenant recusadas com 23503 e ACEITAS no down — vermelho-controle medido por mim; D35 5→4→5 com censo abortando sobre órfão sem mutar; D34 vermelho na quebra e verde no re-up, com postura NOBYPASSRLS asserida na conexão sob teste; SALDO=0 em 11 combinações de ataque pelo serviço E pelo endpoint real, N=97 operações adversariais no total, 0 40P01, 0 XX000; os 2 limites nomeados do contrato reproduzidos exatamente como declarados)
