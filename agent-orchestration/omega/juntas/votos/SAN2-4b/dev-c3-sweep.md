# SAN2-4b — DIÁRIO DO DEV · correção **C3** (as DUAS portas do varredor de órfãs)

> **Instância:** `dev-san2-4b` (sucessor) — identidade **nova**. Não achei nada, não voto, não julgo a
> validade do achado (§C7.4-bis). **Papel: quem desenvolve.**
> **Mandato:** as correções **C3 e C4**. Este diário é o da **C3** — as duas portas do sweep
> (`tests/helpers/auth-identity-fixture.ts` + `tests/rls-tenant-isolation.test.ts` +
> `tests/db-catalog-write-guard.test.ts`). A C4 tem diário próprio (`dev-c4-teardown.md`).
> **Plano obrigatório:** `agent-orchestration/omega/planos/SAN2-4b-plano.md` §3-C3, §4-C3, §5, §7.
> **Onde o mandato divergir do plano, o plano vence** — e a divergência fica registrada (§8).
> **Escrita incremental** (`D-JUNTA-RESILIENTE`): cada passo gravado ao terminar.
> **A lição herdada da C1/C2:** *o verde não prova; o vermelho-controle prova.*

---

## §0 — Terreno declarado (transcrito na abertura, não lembrado)

| Item | Valor conferido por execução |
|---|---|
| Worktree | `c:\Users\AMP\Documents\GitHub\ERP_Techsolutios\.claude\worktrees\san2-r` |
| Branch | `fix/san2-4b-corrigir-arnes` |
| HEAD na abertura | `f6631d0e2e972e725cd34fc153c0b6f91f472e87` (= C1+C2 commitadas) |
| `git status --short` na abertura | **VAZIO** — árvore limpa, sem mutação viva |
| Node | **v20.19.5** |
| Host | Windows 11 Pro 10.0.22631 |
| Base viva | `docker ps`: `erp-postgres` **Up 2 days (healthy)** · `erp-redis` **Up 2 days (healthy)** — **nenhum comando enviado a nenhum dos dois** (§5.2 do plano) |
| Disco livre | **18 GB** (`df -h /c`) — acima do piso de ~10 GB do §7.7 |
| `netsh interface ipv4 show excludedportrange protocol=tcp` | faixas excluídas transcritas: 5357 · 49698-49997 · 50000-50059\* · 50160-50359 · 54183-54382 · 54517-54616 · 54893-55092 · **55253-55452** · 63148-63547 · 63755-64154. **55432 cai em 55353-55452 (proibida)**; **56432 está FORA de toda faixa** → porta escolhida |
| Cluster descartável | `san2-4b-pg` (postgres:16) em **56432** — criado neste bloco, morto no fim |
| `node_modules` do worktree | diretório real, **não** junction/symlink (proibição de 26/08) |
| Scratchpad | `…/45ec3bf3-…/scratchpad/san2-4b-c34/` — sondas e logs |

---
## §1 — Cluster descartável e baseline (medido, não copiado)

| # | Comando | Saída | ec |
|---|---|---|---|
| T1 | `netsh interface ipv4 show excludedportrange protocol=tcp` | faixas transcritas no §0. **55432 ∈ 55353-55452 → proibida.** **56432 ∉ toda faixa → escolhida** | 0 |
| T2 | `docker run -d --name san2-4b-pg -p 56432:5432 postgres:16` | `21a2932e2bd0…` · `docker ps` → `san2-4b-pg  Up  0.0.0.0:56432->5432/tcp` | 0 |
| T3 | `docker exec san2-4b-pg pg_isready` | `accepting connections` (1 s) | 0 |
| T4 | `DATABASE_URL=…56432… npx prisma migrate deploy` | `All migrations have been successfully applied.` | **0** |
| T5 | `SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL` | **103** (o número que o §6.0 do plano exige) | 0 |
| T6 | `SELECT count(*) … tables WHERE table_schema='public'` | **115** — o `115` de `460 = 115 × 4` da assinatura da órfã (medicao-3 §F10) | 0 |
| B1 | `run-backend-tests.mjs tests/rls-tenant-isolation.test.ts` | `# tests 1 · # pass 1 · # fail 0 · # skipped 0 · # cancelled 0` | **0** |
| B2 | `run-backend-tests.mjs tests/db-catalog-write-guard.test.ts` | `# tests 5 · # pass 5 · # fail 0 · # skipped 0 · # cancelled 0` | **0** |

**Denominadores de abertura: `rls-tenant-isolation` = 1 · `db-catalog-write-guard` = 5.** A C3 e a C4
**não podem movê-los** (§3-C3.3 do plano: laço interno, sem `test()` novo) — pinados no §5.

---

## §2 — O VERMELHO-CONTROLE (antes de eu editar uma linha)

**Por que ele vem primeiro.** A lição que a C2 deixou: o verde não prova, o vermelho prova. Um drill
que, depois da correção, mostra "órfã recolhida" pode estar medindo a correção **ou** estar cego.
Só o par vermelho→verde, com a MESMA sonda no MESMO cluster, significa alguma coisa.

### A órfã plantada reproduz a assinatura MEDIDA pelo 4a — conferido, não suposto

`plant.sh` emite a sequência **verbatim** do criador (`tests/rls-tenant-isolation.test.ts:31-41`):
`CREATE ROLE … LOGIN PASSWORD … NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT` + `GRANT USAGE ON
SCHEMA public` + `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES` + `GRANT USAGE, SELECT ON ALL
SEQUENCES`. Medido numa role plantada:

```
rolcanlogin = t · rolvaliduntil IS NULL = t (sem expiração)
SELECT count(*) FROM information_schema.role_table_grants WHERE grantee = <role>  ->  460
```

**460 grants = 115 tabelas × 4 privilégios** — a assinatura idêntica à das 68 da base viva
(medicao-3 §F10). O objeto que eu meço é o objeto que o 4a mediu.

### Arranjo de cada rodada (forma F9 do 4a) — 4 roles por rodada, 4 perguntas

| papel | nome plantado | o que a resposta significa |
|---|---|---|
| **alvo** | `rls_test_<agora−2 h>_<hex>` | a órfã que a correção tem de passar a recolher |
| **vermelho-controle** | `audit_rls_<agora−2 h>_<hex>` | família **já registrada** → se ela NÃO morrer, o sweep não rodou e a rodada é cega |
| **contraprova anti-mass-delete** | `zzz_probe_<agora−2 h>_<hex>` | prefixo **não registrado** → tem de sobreviver SEMPRE |
| **controle de execução corrente** | `rls_test_<agora>_<hex>` | timestamp novo → o corte de 60 min tem de protegê-la (senão o varredor mataria a role dos processos irmãos) |

### R1 · **VERMELHO**, PORTA 1 — gatilho de sweep = `db-catalog-write-guard.test.ts`, código NÃO corrigido

| rodada | trigger ec | denominador | **alvo `rls_test_` velho** | ctrl `audit_rls_` velho | sonda `zzz_probe_` | `rls_test_` novo |
|---|---|---|---|---|---|---|
| r01 | 0 | `# tests 5 · # pass 5` | **SOBREVIVEU** | **recolhido** | sobreviveu | sobreviveu |
| r02 | 0 | `# tests 5 · # pass 5` | **SOBREVIVEU** | **recolhido** | sobreviveu | sobreviveu |

**Leitura: 2/2 sobreviveu — e o `audit_rls_` morrendo nas duas rodadas prova que o sweep RODOU.**
O defeito não é "o varredor não passou"; é "o varredor passou ao lado". É a **porta 1** (a família
fora de `SWEPT_ROLE_FAMILIES`), isolada de todo o resto.

### R2 · **VERMELHO**, PORTA 2 — o CRIADOR rodando SOZINHO (`rls-tenant-isolation.test.ts`), código NÃO corrigido

| rodada | trigger ec | denominador | **alvo `rls_test_` velho** | **ctrl `audit_rls_` velho** | sonda | `rls_test_` novo |
|---|---|---|---|---|---|---|
| r01 | 0 | `# tests 1 · # pass 1` | **SOBREVIVEU** | **SOBREVIVEU** | sobreviveu | sobreviveu |
| r02 | 0 | `# tests 1 · # pass 1` | **SOBREVIVEU** | **SOBREVIVEU** | sobreviveu | sobreviveu |

**Este é o achado que separa as duas portas, e é mais forte do que eu esperava.** Na porta 1 o
`audit_rls_` MORRE (o sweep rodou e pulou o alvo). Na porta 2 **nem o `audit_rls_` morre** — porque
o criador da família **não invoca o varredor de forma alguma**: ele importa só `withRoleCatalogLock`
(l.6). Rodar o criador sozinho não varre **nada**, de nenhuma família.

> **Consequência medida, e é o coração do §2.4 do plano:** se eu fechasse **só** a porta 1, este
> segundo quadro continuaria idêntico — rodar o criador sozinho seguiria deixando a órfã viva. Se eu
> fechasse **só** a porta 2, o criador passaria a varrer `audit_rls_`/`vid_*` e **continuaria pulando
> a própria família**. **Nenhuma das duas metades, sozinha, muda o comportamento observável do alvo.**
> Não é retórica do plano: são estes dois quadros, executados no mesmo cluster, com 2 rodadas cada.

**Estado após o §2: 8 roles plantadas, 8 removidas por nome exato** (`drop.sh` recusa nome fora do
namespace `rls_test_`/`audit_rls_`/`zzz_probe_` com `exit 2` — controle anti-mass-delete exercitado
em cada uma das 16 chamadas). Nenhum `DELETE`/`DROP` por curinga em nenhum momento.

---
## §3 — A CORREÇÃO C3 aplicada (§3-C3 do plano, item a item)

| Item do §3-C3 | O que entrou | Onde |
|---|---|---|
| **1. Porta 1 — família registrada** | `"rls_test"` entra em `SWEPT_ROLE_FAMILIES`; o comentário das l.94-101 é **reescrito** com a decisão NOVA, datada (2026-08-31), citando o preço medido pela medição 3 (5/5 de gênese na janela, 0 recolhimentos em 4 oportunidades, LOGIN + 460 grants) e dizendo por extenso **o que a entrada NÃO decide** (as 68 da base viva seguem com a junta de `P-ARNES-RLS-TEST-FORA-DO-SWEEP`, que fica ABERTA) | `tests/helpers/auth-identity-fixture.ts` |
| **2. Porta 2 — o criador varre** | `sweepOrphanEphemeralRoles` passa a ser **exportada**, com contrato de uso escrito (só de dentro de `withRoleCatalogLock`); `tests/rls-tenant-isolation.test.ts` a invoca **dentro do lock que já detinha**, antes do `CREATE ROLE` — mesmo desenho de `createEphemeralRole` l.310 | fixture + `rls-tenant-isolation.test.ts` |
| **3. Drills do guard estendidos** | `"rls_test"` entra no laço de famílias do drill "recolhe o que deve"; o drill "não toca no que não deve" ganha um `rls_test_<timestamp NOVO>` que **tem de sobreviver**. **Sem `test()` novo** — os laços são internos | `tests/db-catalog-write-guard.test.ts` |
| **4. Ratchet atualizado conscientemente** | ver §4 abaixo — a contagem **não se moveu**, e é justamente isso que precisou de registro | `FROZEN_ALLOWLIST` |

**Decisões de implementação, declaradas (para a cadeira de catálogo atacar):**

1. **Export direto de `sweepOrphanEphemeralRoles`, não wrapper.** O §3-C3.2 deixa a escolha ao dev.
   Optei pelo export direto: a assinatura já exige `Prisma.TransactionClient`, que neste arnês **só
   existe dentro de `withRoleCatalogLock`** — o tipo já é o guard-rail que um wrapper fino tentaria
   ser, e um wrapper criaria uma segunda porta de entrada para a mesma verdade. O contrato de uso
   ficou **escrito no código**, não só aqui.
2. **`"rls_test"` entrou por ÚLTIMO na lista.** A alternância do regex é ordenada, mas está
   **ancorada em `^`**: `rls_test` não pode casar uma string que começa com `vid_`. A ordem é
   indiferente por construção — e o drill do §3-C3.3 mantém `rls_test` e `vid_rls_test` **no mesmo
   laço** justamente para que a armadilha de substring (M3-O-4) fique exercitada por execução, em
   vez de confiada ao raciocínio.
3. **Não toquei** o corpo de `sweepOrphanEphemeralRoles`, o regex, o corte de 60 min nem
   `dropEphemeralRoleResilient` (§5.1 os interdita).

---

## §4 — O RATCHET: a contagem NÃO se moveu, e por isso precisou de registro

O §3-C3.4 manda atualizar cada entrada afetada com o número **medido**. Medi com as regexes do
próprio guard, no head base e no estado corrigido:

| arquivo | base `f6631d0` | com C3+C4 | composição base | composição atual |
|---|---|---|---|---|
| `rls-tenant-isolation.test.ts` | **8** | **8** | CREATE ROLE 2 · DROP ROLE 2 · GRANT 4 | CREATE ROLE 2 · DROP ROLE 2 · GRANT 4 |
| `helpers/auth-identity-fixture.ts` | **30** | **30** | CR 9 · DR 8 · GRANT 10 · REVOKE 1 · OWNER TO 2 | idem |

**O total idêntico é COINCIDÊNCIA de composição, não ausência de mudança** — e essa é exatamente a
classe de coisa que um ratchet por contagem não enxerga. A C4 **removeu** o `DROP ROLE IF EXISTS`
do SQL do arquivo; a prosa que explica a migração **menciona** `DROP ROLE`, e a regex conta as duas
do mesmo jeito. Total 2 → 2, com o SQL virando comentário.

**Registrei isso na `reason` da entrada** (formato do precedente escrito no repo — *"5 -> 4 porque o
DROP ROLE saiu daqui para o teardown resiliente do arnês"*), dizendo que a contagem continua 8, **por
que** continua, e a composição medida. Deixar a `reason` antiga ("escritor DENTRO do lock (role
rls_test_ …)") seria um registro **estale**: o arquivo não emite mais aquele `DROP ROLE` como SQL, e
o próximo auditor leria "8" e concluiria que nada aconteceu.

> **Fica dito como limite do instrumento, não como achado meu:** o ratchet por CONTAGEM é cego a
> troca de SQL por prosa em quantidade igual. Não é do meu escopo consertá-lo (§5.1), e não proponho
> correção (§C7.4-bis) — mas a junta merece saber que a trava não teria pego esta migração sozinha.

`npm run check` (`tsc --noEmit`) → **ec=0** com a correção aplicada.

---

## §5 — A PROVA (§4-C3): o par vermelho→verde nas DUAS portas

### G1 · **VERDE**, PORTA 1 — gatilho `db-catalog-write-guard.test.ts`

| rodada | trigger ec | denominador | **alvo `rls_test_` velho** | ctrl `audit_rls_` | sonda `zzz_probe_` | `rls_test_` novo |
|---|---|---|---|---|---|---|
| r01 | 0 | `# tests 5 · # pass 5` | **RECOLHIDO** | recolhido | **sobreviveu** | **sobreviveu** |
| r02 | 0 | `# tests 5 · # pass 5` | **RECOLHIDO** | recolhido | **sobreviveu** | **sobreviveu** |

### G2 · **VERDE**, PORTA 2 — o CRIADOR rodando SOZINHO

| rodada | trigger ec | denominador | **alvo `rls_test_` velho** | **ctrl `audit_rls_`** | sonda | `rls_test_` novo |
|---|---|---|---|---|---|---|
| r01 | 0 | `# tests 1 · # pass 1` | **RECOLHIDO** | **recolhido** | **sobreviveu** | **sobreviveu** |
| r02 | 0 | `# tests 1 · # pass 1` | **RECOLHIDO** | **recolhido** | **sobreviveu** | **sobreviveu** |

### As exigências do §4-C3, uma a uma

| exigência do plano | N exigido | N executado | vermelho (antes) | verde (depois) | ok |
|---|---|---|---|---|---|
| Porta 1: órfã `rls_test_<menos 2 h>` recolhida | 2 | **2** | sobreviveu 2/2 | **recolhida 2/2** | **sim** |
| Porta 1: vermelho-controle `audit_rls_` recolhida (prova que o sweep rodou) | 2 | **2** | recolhida 2/2 | recolhida 2/2 | **sim** |
| Contraprova anti-mass-delete: prefixo NÃO registrado sobrevive | 2 | **8** (2 por arranjo × 4 arranjos) | sobreviveu | **sobreviveu 8/8** | **sim** |
| Controle de execução corrente: `rls_test_<agora>` sobrevive | 2 | **8** | sobreviveu | **sobreviveu 8/8** | **sim** |
| Porta 2: criador SOZINHO recolhe a órfã | 2 | **2** | sobreviveu 2/2 | **recolhida 2/2** | **sim** |

---

## §6 — A prova de que **fechar UMA porta não resolve** (mutação)

O vermelho-controle já sugeria (na porta 2 o sweep não rodava **de forma alguma**), mas afirmação
dessa força merece execução direta. Mutei **uma metade de cada vez**, no arranjo em que a órfã
nasce — o criador rodando sozinho — e restaurei por cópia com **md5 conferido**.

| estado | família em `SWEPT_ROLE_FAMILIES`? | criador chama o sweep? | **alvo `rls_test_` velho** | ctrl `audit_rls_` velho |
|---|---|---|---|---|
| **base** (nenhuma correção) | não | não | **sobreviveu 2/2** | **sobreviveu 2/2** |
| **M1** — só a porta 2 fechada | **não** | sim | **sobreviveu 2/2** | recolhido 2/2 |
| **M2** — só a porta 1 fechada | sim | **não** | **sobreviveu 2/2** | **sobreviveu 2/2** |
| **C3 completa** — as duas | sim | sim | **RECOLHIDO 2/2** | recolhido 2/2 |

**As duas meias-correções deixam o alvo vivo, 2/2 cada.** Só a linha de baixo recolhe. E as duas
falham por motivos **diferentes**, o que é o ponto: em M1 o varredor roda e passa ao lado (o
`audit_rls_` morre); em M2 o varredor não roda (nem o `audit_rls_` morre). Um dev que fechasse uma
porta e medisse só o `audit_rls_` teria visto verde em M1 e concluído que estava feito.

**Integridade da mutação, conferida:** `md5sum` dos dois arquivos após a restauração é **idêntico**
ao snapshot tirado antes (`8841b55e…` e `8f979473…`); `grep -c "MUTACAO M2"` = **0**.

**Nota de honestidade sobre um erro meu.** A primeira tentativa da mutação M1 (via `perl -0pi`)
**não pegou** — o arquivo tem terminadores CRLF e o padrão não casou. Rodei duas rodadas achando
que estava mutado e saíram verdes; **percebi pelo `grep -c` que a linha ainda estava lá**, descartei
as duas rodadas e refiz com `sed -i '123d'`, conferindo a lista impressa antes de medir. As rodadas
M1 da tabela são as **da mutação conferida**. Registro o erro porque uma mutação que não muta nada é
a forma mais fácil de fabricar um verde — e foi o `grep`, não o resultado, que o pegou.

---
## §7 — Escopo, terreno de saída e estado (vale para C3 **e** C4)

**Escopo — conferido por execução, não por promessa:**

```
git diff --name-only  ->  tests/db-catalog-write-guard.test.ts
                          tests/helpers/auth-identity-fixture.ts
                          tests/rls-tenant-isolation.test.ts
git status --short    ->   M tests/db-catalog-write-guard.test.ts
                           M tests/helpers/auth-identity-fixture.ts
                           M tests/rls-tenant-isolation.test.ts
                           ?? agent-orchestration/omega/juntas/votos/SAN2-4b/dev-c3-sweep.md
                           ?? agent-orchestration/omega/juntas/votos/SAN2-4b/dev-c4-teardown.md
git diff --stat       ->  3 arquivos, 88 insercoes, 14 remocoes
git diff --check      ->  ec=0
git rev-parse HEAD    ->  f6631d0e2e972e725cd34fc153c0b6f91f472e87  (INALTERADO: nenhum commit, por mandato)
node scripts/sync-agent-agents.mjs --check  ->  "OK - 23 agentes, espelho consistente"  ec=0 (fatia S0)
```

Os **3 arquivos** são exatamente os que o §5.1 do plano dá a C3/C4. **NÃO toquei:**

- `src/modules/authority/authority-password.ts` e `tests/authority-portal.test.ts` — **C1/C2, já
  commitadas em `f6631d0`. Não revertidas, não editadas, sequer abertas para escrita.**
- `Kpis/**`, `.github/**`, `scripts/**` (o runner e o `sync-agent-agents` foram **executados**,
  nunca editados), `prisma/**`, `migrations/**`, contratos, `frontend/**`, `mobile/**`,
  `package.json`/`package-lock.json`, `.claude/agents/**`, `.agents/**`, `.env`.
- **Registro (§3-C5) e KPI (§3-C6): intocados** — `pendencias.md`, `status-geral.md`, planos alheios.
  Não são deste mandato.
- Os outros 4 gatilhos de sweep foram **executados como regressão**, nunca editados.

**Base viva — a prova que atravessa o trabalho inteiro:**

```
docker ps (abertura)  ->  erp-postgres  Up 2 days (healthy)   erp-redis  Up 2 days (healthy)
docker ps (saida)     ->  erp-postgres  Up 2 days (healthy)   erp-redis  Up 2 days (healthy)
```

**ZERO comandos enviados a `erp-postgres`/`erp-redis`, nem de leitura.** Toda `DATABASE_URL` deste
trabalho foi `postgresql://…@localhost:56432/erp` — env **explícita** em cada invocação, jamais
herdada de `.env`. Nenhuma outra branch tocada; `demo/investidor` intocada.

**Controle anti-mass-delete — exercitado, não prometido.** Todo teardown das roles plantadas passou
por `drop.sh`, que **recusa** (`exit 2`) qualquer nome fora de `rls_test_`/`audit_rls_`/`zzz_probe_`
e dropa **um nome exato por vez**. Nenhum `DROP`/`DELETE` por curinga, em nenhuma base, em nenhum
momento. E o próprio desenho corrigido carrega as duas contraprovas na suíte permanente: prefixo não
registrado sobrevive, timestamp novo sobrevive.

**Limpeza (§C5):** cluster `san2-4b-pg` derrubado ao final (`docker rm -f`), `docker ps` conferido
sem nenhum `san2-4b-*`; `.tmp-c4-probe.mts` (sonda temporária que precisava viver na raiz do
worktree para resolver `@prisma/client`) **apagada** — `git status` acima a confirma ausente.
Nenhum artefato de build gerado (`tsc --noEmit` não emite; nenhum `npm run build`). Logs e sondas
ficam no scratchpad porque as tabelas deste diário os citam por nome; varrer o scratchpad é a
limpeza do fechamento do PR. Nada rastreado apagado; `node_modules` intocado.

---

## §8 — Divergências mandato × plano (declaradas; nenhuma silenciosa)

1. **Acrescentei a prova de mutação do §6** (M1/M2), que o §4-C3 não pede. Justificativa: o plano
   **afirma** que fechar uma porta não resolve; eu preferi **executar** a afirmação a herdá-la.
   Custo: ~4 min. Achado dela: as duas meias-correções falham por motivos diferentes, e M1 daria
   verde para quem medisse só o vermelho-controle `audit_rls_`.
2. **Rodei 8 observações da contraprova anti-mass-delete e 8 do controle de execução corrente**
   (o §4-C3 exige 2 de cada) — são 4 arranjos × 2 rodadas. Desvio de N para cima, não de conteúdo.
3. **A `reason` da entrada `rls-tenant-isolation.test.ts` na `FROZEN_ALLOWLIST` foi editada com a
   contagem INALTERADA (8).** O §3-C3.4 fala em "atualizada com o número MEDIDO"; o número medido
   é o mesmo, e mesmo assim editei o motivo — porque a composição mudou e a prosa antiga viraria
   registro estale. Se a cadeira de escopo entender que entrada com contagem inalterada não deveria
   ser tocada, o argumento está no §4 para ser derrubado.
4. **Usei um arquivo temporário na raiz do worktree** (`.tmp-c4-probe.mts`) em vez de sonda 100% em
   scratchpad, porque a sonda da C4 importa `@prisma/client` (bare specifier), que não resolve de
   fora do worktree. Foi apagado; `git status` o confirma. A sonda em si está preservada em
   scratchpad (`c4-probe.mts`).
5. **Não executei `npm test` completo nem `npm run build`** — §6.6 da bateria do bloco, fora do
   mandato C3/C4. Declarado no §5 do diário da C4 como ressalva, não como omissão.

**ESTADO: correções C3 e C4 CONCLUÍDAS e PROVADAS no N exigido.** C3: vermelho **2/2 sobreviveu**
nas duas portas → verde **2/2 recolhido** nas duas, com os 4 controles batidos e as duas
meias-correções refutadas por mutação. C4: **10/10 sobreviveu** (forma crua) → **0/10** (helper),
vaza-metro **Δ=0 em 10/10** com lista ordenada idêntica. `(6, 37)` da lista-6 **intacto 3/3**.
**Não commitei** (mandato). **Bloco NÃO fechado:** faltam o registro (§3-C5), o KPI (§3-C6) e a
bateria completa (§6) — e o commit único que o §7.1 do plano exige com C1+C2+C3+C4 juntas.
