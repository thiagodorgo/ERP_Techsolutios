# SAN2-4a · MEDIÇÃO 3 — censo do MECANISMO das roles `rls_test_` (`P-O6R-ARNES-ISOLAMENTO` / `P-ARNES-RLS-TEST-FORA-DO-SWEEP`)

> **Diário de execução**, escrito **incrementalmente** (§3.0.5 do plano: cada tabela vai a disco ao fim
> de cada forma; o que fica só em contexto não sobrevive). Executor: instância `dev-san2-4a`, designada
> pelo orquestrador. Plano: `agent-orchestration/omega/planos/SAN2-4a-plano.md` **§3.3** (alvo 3).
> **Mandato: MEDIÇÃO 3 apenas.** Alvo 1 (`authority-portal`, medição 1) e alvo 2 (bateria barata,
> medição 2) já estão fechados em diários próprios nesta mesma pasta e **não** são reabertos aqui.
>
> **REGRA DO BLOCO, repetida onde o executor a lê: o 4a NÃO CONSERTA NADA** (§0/§5.2). Se o mecanismo
> revelar a correção óbvia, ela vira **observação nomeada para o 4b** — nunca conserto aqui.
>
> **O QUE ESTA MEDIÇÃO NÃO MEDE, dito antes de tudo:** o número **68** de `P-O6R-ARNES-ISOLAMENTO`
> permanece **CARREGADO, não remedido** (§3.3-F10). Contá-lo exigiria consultar `erp-postgres`, que é
> **intocável por regra deste bloco, nem para leitura**. O que se mede aqui é o **MECANISMO**, em
> cluster descartável próprio.

**Divergência de caminho, declarada (§A2, não escolhida em silêncio):** o plano §5.1 nomeia
`agent-orchestration/omega/medicoes/SAN2-4a-medicao.md` como relatório canônico das três medições. O
mandato do orquestrador partiu o bloco por medição e nomeou **este** caminho
(`omega/juntas/votos/SAN2-4a/medicao-3-censo-roles.md`), que está dentro de
`agent-orchestration/omega/juntas/**` — também permitido pelo §5.1. Este diário é a **medição 3**; a
consolidação das três no relatório canônico é de quem as reunir. Nada foi apagado nem reescrito.

---

## §T · Terreno (§3.0, fail-closed) — executado ANTES de qualquer rodada

Todas as saídas abaixo são transcritas da execução, não de memória.

### T1 · Ambiente

| Item | Valor medido | Comando |
|---|---|---|
| Node | **v20.19.5** | `node -v` |
| Worktree | `.claude/worktrees/san2-r` | — |
| Branch | `chore/san2-4a-medir-arnes` | `git branch --show-current` |
| Head | `1949c6a3657dd38b9dbe5c3cd9efa792e656e019` | `git rev-parse HEAD` |
| `git status --porcelain` | **vazio** (árvore limpa no início) | — |
| `prisma/migrations` | **103** | `ls prisma/migrations \| wc -l` |
| `node_modules` | **diretório real** — `dir /AL node_modules` não listou JUNCTION/SYMLINK | `cmd /c dir /AL node_modules` |
| SO / host | Windows 11 Pro 10.0.22631 | — |

O check de `node_modules` é a proibição de 26/08 (`D-JUNTA-ESCOPO-E-CALIBRACAO` §(c)) sendo
**executada**, não citada.

### T2 · Portas — `netsh` consultado ANTES de fixar (§3.0.1)

`netsh interface ipv4 show excludedportrange protocol=tcp` (saída integral transcrita, ec=0):

```
Porta Inicial    Porta Final
      5357        5357
     49698       49797
     49798       49897
     49898       49997
     50000       50059     *
     50160       50259
     50260       50359
     54183       54282
     54283       54382
     54517       54616
     54893       54992
     54993       55092
     55253       55352
     55353       55452     <== a faixa que engoliu a 55432 (P-SAN2-2-PORTA-55432-RESERVADA)
     63148       63247
     63248       63347
     63348       63447
     63448       63547
     63755       63854
     63855       63954
     63955       64054
     64055       64154
```

**Veredito de porta:** o plano §3.0.2 reserva a **porta B** ao cluster do alvo 3 (`san2-4a-pg2`).
**56433 não cai em nenhuma faixa listada** — a faixa imediatamente abaixo termina em 55452 e a próxima
só começa em 63148. Porta confirmada, sem necessidade de alternativa. A medição 2 já havia confirmado
a 56432 pelo mesmo critério; a faixa `55353–55452` **reproduz por execução, hoje, nesta máquina**, o
motivo de `P-SAN2-2-PORTA-55432-RESERVADA`.

### T3 · Base viva — INTOCADA (a regra mais dura deste alvo)

`docker ps` no início da medição 3:

```
NAMES          PORTS                                         STATUS
erp-postgres   0.0.0.0:5432->5432/tcp, [::]:5432->5432/tcp   Up 2 days (healthy)
erp-redis      0.0.0.0:6379->6379/tcp, [::]:6379->6379/tcp   Up 2 days (healthy)
```

**Nenhum comando desta medição toca `erp-postgres`/`erp-redis`, nem leitura** (§5.2). Este é o alvo
mais perigoso do bloco justamente porque a pergunta natural ("quantas órfãs existem hoje?") só teria
resposta lá. **A resposta é: não se pergunta.** `DATABASE_URL` é exportada explicitamente por comando,
apontando para `san2-4a-pg2` (:56433) — jamais herdada de `.env`. O `Up 2 days` acima é o marcador de
prova: ele tem de continuar contando ao fim (§T4).

---

## §F6 · Censo do MECANISMO, por leitura com linha citada (§3.3-F6)

Re-conferido no head **`1949c6a`** por esta instância — não herdado do §2.3 do plano.

### F6.1 · Quem cita `rls_test_` no repositório (enumeração completa)

`grep -rn "rls_test_" tests/ src/ scripts/` — ec=0, **12 ocorrências em 4 arquivos**, transcritas:

| Arquivo:linha | Papel da ocorrência | É criador? |
|---|---|---|
| `tests/rls-tenant-isolation.test.ts:25` | `const roleName = \`rls_test_${Date.now()}_${Math.random().toString(16).slice(2)}\`` | **SIM — o único** |
| `tests/db-catalog-write-guard.test.ts:88` | string de `reason` na allowlist do ratchet | não |
| `tests/db-catalog-write-guard.test.ts:119` | `reason` de `vid_rls_test_` (família **diferente**) | não |
| `tests/db-catalog-write-guard.test.ts:450` | comentário sobre o corte de 60 min | não |
| `tests/helpers/auth-identity-fixture.ts:47` | comentário — enumera o arquivo como 2º escritor | não |
| `tests/helpers/auth-identity-fixture.ts:55` | comentário — cita `vid_rls_test_` | não |
| `tests/helpers/auth-identity-fixture.ts:94` | comentário — **"`rls_test_` FICA DE FORA — decisão CONSCIENTE"** | não |
| `tests/helpers/auth-identity-fixture.ts:116-118` | comentário — a ancoragem `^` do regex | não |
| `tests/vehicle-identity-schema.test.ts:12, 204` | família **`vid_rls_test_`**, outra família | não |

**Fato de nomenclatura que a medição precisa fixar antes de contar qualquer coisa:** `vid_rls_test_`
**não** é membro de `rls_test_`. Tanto o `LIKE 'rls_test_%'` quanto o regex do varredor ancoram no
**início** do nome (`^`), e o comentário das l.116-118 do fixture já registra as duas direções. Quem
contar por substring conta errado nos dois sentidos — e a família `vid_rls_test_` **é varrida**,
enquanto a `rls_test_` não é.

**Criador único: `tests/rls-tenant-isolation.test.ts:25`.** Nenhum código de `src/` ou `scripts/` cria
a família — ela é exclusivamente de arnês de teste.

### F6.2 · O privilégio concedido (l.31-42, transcrição literal)

Tudo dentro de `withRoleCatalogLock` (l.31), 4 sentenças:

| l. | Sentença | Efeito |
|---|---|---|
| 32-34 | `CREATE ROLE "<nome>" LOGIN PASSWORD '…' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT` | **role com LOGIN** — autentica |
| 35 | `GRANT USAGE ON SCHEMA public TO "<nome>"` | enxerga o schema |
| 36-38 | `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public` | **DML completo em TODAS as tabelas** |
| 39-41 | `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public` | usa as sequências |

O `LOGIN` é o que transforma resíduo em **superfície**: uma órfã não é um nome morto no catálogo, é
uma credencial válida com DML em todo o schema `public` — desde que quem a use saiba a senha, que é
`rls-${Date.now()}-${random}` e vive apenas na memória do processo que morreu. **Nuance registrada, não
suavizada:** a senha não sobrevive ao processo, então a órfã não é uma credencial *utilizável* por
terceiro; o que sobrevive é a role com LOGIN e o conjunto de ACLs em cada tabela (`pg_class.relacl`).

### F6.3 · Quem derruba — e a resposta medida por leitura

**Único caminho de derrubada: o `finally` do próprio teste, l.3145-3152:**

```
await client.$disconnect();
await withRoleCatalogLock(adminClient, async (tx) => {
  await tx.$executeRawUnsafe(`DROP OWNED BY "${roleName}"`);
  await tx.$executeRawUnsafe(`DROP ROLE IF EXISTS "${roleName}"`);
});
await adminClient.$disconnect();
```

Está no **mesmo lock** do CREATE (l.31), o que fecha a corrida de catálogo — mas **não** é resiliente:
diferente das outras famílias, este teardown **não** usa `dropEphemeralRoleResilient`
(`tests/helpers/auth-identity-fixture.ts:251`), o helper que o B-O6R-ARNES criou justamente para que
um `DROP OWNED` que falhe por concorrência não derrube o `DROP ROLE` junto. **Achado registrado como
observação para o 4b (O-3), não consertado.**

**DUPLA exclusão do varredor — a parte que o plano previa, e uma que ele não nomeava:**

1. **Exclusão por família (conhecida, escrita).** `SWEPT_ROLE_FAMILIES`
   (`tests/helpers/auth-identity-fixture.ts:105-111`) = `o6r_b01 · o6r_clone_owner · audit_rls ·
   vid_rls_test · vid_link_rls`. **`rls_test_` não está lá**, por decisão consciente documentada na
   l.94 — o motivo escrito é o incidente de mass-delete de 26/07 e as 68 órfãs vivas de dono
   desconhecido.
2. **Exclusão por chamador (nova nesta medição).** `sweepOrphanEphemeralRoles`
   (l.138) é chamado de **exatamente um lugar**: `createEphemeralRole`, l.310 — conferido por
   `grep -rn "sweepOrphanEphemeralRoles" tests/ src/ scripts/`, que devolve **2 linhas: a definição
   (l.138) e a chamada (l.310)**. E `tests/rls-tenant-isolation.test.ts` importa **só**
   `withRoleCatalogLock` (l.6) — **nunca chama `createEphemeralRole`**. Logo, o arquivo que cria a
   família `rls_test_` **não invoca o varredor em nenhum momento da sua execução**.

**Consequência mensurável:** mesmo que `rls_test_` fosse acrescentada a `SWEPT_ROLE_FAMILIES`, rodar
`tests/rls-tenant-isolation.test.ts` **sozinho** continuaria sem varrer nada — o sweep só roda quando
alguma das 4 suítes que usam `createEphemeralRole` (`auth-identity-backfill-db`,
`auth-identity-link-events-db`, `auth-identity-role-real-db`, `auth-login-candidates-fn-db`) executa.
Isto é **observação para o 4b (O-1)**, não conserto: quem for fechar a exclusão precisa decidir as
DUAS pontas, não só a lista.

### F6.4 · Como nasce a órfã (mecanismo, antes da execução que o mede)

CREATE (l.31-42) e DROP (l.3148-3151) estão no mesmo `finally` de um único `test()`. Entre eles roda o
corpo inteiro da suíte. Portanto a órfã nasce **exclusivamente** quando o processo morre entre os dois
pontos sem executar o `finally`:

| Caminho | O `finally` roda? | Órfã? |
|---|---|---|
| Sucesso | sim | não |
| `assert.fail` / exceção dentro do `try` | **sim** (é `finally`) | não |
| `SIGKILL` / crash do processo | **não** | **SIM** |
| `SIGINT`/`SIGTERM` sem handler no Node | **não** (encerra sem rodar `finally`) | **SIM** |
| Falha *dentro* do próprio teardown (ex.: `DROP OWNED` colidindo) | parcial | **SIM** — e é a ponta que o teardown não-resiliente deixa aberta (O-3) |

O corte de idade de 60 min (`ORPHAN_ROLE_MAX_AGE_MS`, l.85) e o `Date.now()` embutido no nome (l.25)
valem para a família — o que permite **datar** qualquer órfã pelo nome, sem consultar o catálogo. Esse
é o fato que torna a recontagem supervisionada das 68 possível **sem** varredura destrutiva: cada nome
carrega a própria data de nascimento.

**F6: CONCLUÍDA por leitura, no head `1949c6a`.**

---

## §C · Cluster descartável `san2-4a-pg2` (:56433) — o alvo 3 não compartilha catálogo com ninguém

| Passo | Comando | Resultado medido |
|---|---|---|
| Subida | `docker run -d --name san2-4a-pg2 … -p 56433:5432 postgres:16` | ec=0, container `facecd9dbbc6` |
| Prontidão | `docker exec san2-4a-pg2 pg_isready -U postgres` | `accepting connections`, ec=0 |
| Migrations | `DATABASE_URL=…:56433/erp npx prisma migrate deploy` | `All migrations have been successfully applied.` **EC=0** |
| Conferência | `SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL` | **103** — bate com `ls prisma/migrations \| wc -l` |
| Baseline de catálogo | `SELECT rolname FROM pg_roles WHERE rolname NOT LIKE 'pg\_%'` | **só `postgres`** → **0 roles não-sistema** |

Isolamento por desenho (§3.0.2 / §4.3): este é o cluster **exclusivo do alvo 3**, sujo por construção
(é aqui que se fabrica órfã). A medição 2 usou `san2-4a-pg` (:56432), já removido; nenhum catálogo é
compartilhado entre os dois alvos, e a base viva não é alcançável por nenhum deles.

**Vaza-metro (`snap.sh`)** — o instrumento de delta, transcrito porque a medição depende dele:

```sql
SELECT r.rolname, r.rolcanlogin,
       (SELECT count(*) FROM information_schema.role_table_grants g WHERE g.grantee = r.rolname) AS tgrants
FROM pg_roles r WHERE r.rolname NOT LIKE 'pg\_%' AND r.rolname <> 'postgres' ORDER BY r.rolname;
```

---

## §F7 · Caminho feliz não vaza (§3.3-F7) — **N=10**, em duas passadas com formas declaradas

Forma comum: `node scripts/run-backend-tests.mjs tests/rls-tenant-isolation.test.ts`, `DATABASE_URL`
→ `postgresql://postgres:***@127.0.0.1:56433/erp?schema=public` (cluster `san2-4a-pg2`),
`CORE_SAAS_PERSISTENCE` **não exportada** (o runner a fixa em `memory` por padrão próprio, transcrito
no log), Node **v20.19.5**, rodadas **sequenciais**, head `1949c6a`. Snapshot do vaza-metro **antes e
depois de cada rodada**.

### F7-A · r01-r05 — delta medido, **controle de aparição AUSENTE (declarado)**

A primeira passada rodou com o poller quebrado: `ERR_MODULE_NOT_FOUND: Cannot find package 'pg'` —
o script vivia no scratchpad e o ESM resolve `node_modules` pela **localização do script**, não pelo
cwd. As 5 rodadas são publicadas assim mesmo (rodada não se descarta), com a limitação dita: elas
medem o **delta**, e não provam que a role chegou a existir.

| Rodada | EC | Duração | antes | depois | Δ | Sumário do runner | Log |
|---|---|---|---|---|---|---|---|
| r01 | **0** | 2899 ms | 0 | 0 | **0** | 1 arq · 1 teste · pass 1 · fail 0 · skip 0 | `f7-r01.log` |
| r02 | **0** | 2839 ms | 0 | 0 | **0** | 1 · 1 · pass 1 · fail 0 · skip 0 | `f7-r02.log` |
| r03 | **0** | 2749 ms | 0 | 0 | **0** | 1 · 1 · pass 1 · fail 0 · skip 0 | `f7-r03.log` |
| r04 | **0** | 2749 ms | 0 | 0 | **0** | 1 · 1 · pass 1 · fail 0 · skip 0 | `f7-r04.log` |
| r05 | **0** | 2736 ms | 0 | 0 | **0** | 1 · 1 · pass 1 · fail 0 · skip 0 | `f7-r05.log` |

*(Houve ainda uma rodada-piloto anterior a r01, idêntica em forma e resultado — EC=0, Δ=0, 1/1 —
disparada para conferir a subida do cluster. Está registrada aqui para não haver execução omitida;
não entra no N por ser anterior à forma fixada.)*

### F7-B · r06-r10 — delta **+ controle de aparição** (poller a ~16 Hz)

Poller corrigido (import de `pg` por caminho absoluto do `node_modules` do worktree), amostrando
`SELECT rolname FROM pg_roles WHERE rolname LIKE 'rls\_test\_%'` a cada 50 ms — **taxa aferida: 20
amostras em 1240 ms = 16,1 Hz**, dentro da faixa 10-20 Hz que o plano pede.

| Rodada | EC | Duração | Δ | Role vista (controle) | aparece em | some em | **janela** |
|---|---|---|---|---|---|---|---|
| r06 | **0** | 2763 ms | **0** | `rls_test_1788186224202_db47ee9c7527a` | 691 ms | 2633 ms | **1942 ms** |
| r07 | **0** | 2750 ms | **0** | `rls_test_1788186227742_18bff8876ec7b` | 685 ms | 2568 ms | **1883 ms** |
| r08 | **0** | 2754 ms | **0** | `rls_test_1788186231232_27002a5a2302c` | 626 ms | 2589 ms | **1963 ms** |
| r09 | **0** | 2800 ms | **0** | `rls_test_1788186234779_3236f8ff3d36f` | 752 ms | 2642 ms | **1890 ms** |
| r10 | **0** | 2821 ms | **0** | `rls_test_1788186238287_4e358065a3ada` | 684 ms | 2654 ms | **1970 ms** |

**Controle verde 5/5:** a role **aparece e desaparece** em toda rodada. Sem isto, os dez `Δ=0` seriam
compatíveis com "o teste nunca tocou este cluster" — que é exatamente o modo de falha que um
vaza-metro sem controle não distingue de "não vazou". O controle também prova, por execução, que a
`DATABASE_URL` exportada mandou no lugar do `.env` (o teste faz `import "dotenv/config"` na l.1, e
`dotenv` não sobrescreve variável já presente no ambiente).

### F7 · veredito

**10/10 rodadas com Δ = 0 · EC = 0 · denominador `(1 arquivo, 1 teste)` constante.** No caminho feliz o
teardown das l.3148-3151 recolhe a role **sempre**, nesta forma. **Nenhum vazamento no caminho feliz.**

**Janela de exposição medida (o insumo que a F8 precisa): 1883-1970 ms**, média **1930 ms**, sobre
~2,78 s de execução total — ou seja, a role vive durante **~70 % do tempo de vida do processo**. Uma
morte de processo em instante uniformemente sorteado tem, portanto, probabilidade ≈ 0,70 de cair
dentro da janela. **A janela é larga, não estreita** — este é o fato que decide o desenho da F8, e
contradiz a hipótese natural ("órfã é rara porque a janela é apertada").

**O que a F7 NÃO prova:** que o caminho feliz não vaza **sob paralelismo** ou **sob contenção**. As 10
rodadas são **sequenciais, com um único arquivo, numa máquina**. Zero vazamento nesta forma não é zero
vazamento em qualquer forma — a mesma ressalva que a medição 2 fez sobre os `XX000`.

---

## §F8 · Gênese do órfão, por execução (§3.3-F8)

### F8.0 · Duas falhas de INSTRUMENTO, publicadas porque mudam a leitura dos números

Nenhuma das duas é resultado do produto; as duas produziram "0 órfãs" ou "5 órfãs" espúrios e teriam
virado número publicado se não fossem caçadas. Ficam registradas para que ninguém releia as tabelas
abaixo como se a primeira forma tivesse valido.

**I-1 · `$!` do Git Bash não é o PID do Windows.** Primeira tentativa (5 disparos): o runner ia para
segundo plano no shell e o `taskkill /F /T /PID` recebia o PID do MSYS. Saída medida, nas 5:
`ERRO: o processo "20323" não foi encontrado.` **O processo nunca foi morto** — as 5 execuções
terminaram normalmente, `Δ = 0` nas 5. **Aquele `0/5` é falha de instrumento, não janela estreita**, e
está descartado **por escrito** (§7 do plano: descarte registrado, nunca silenciado). Correção: a F8
passou a **spawnar o runner de dentro do Node** (`f8.mjs`), onde `child.pid` é o PID real do Windows, e
`taskkill /T` mata a **árvore** — necessário porque `run-backend-tests.mjs` spawna um filho
`node --test` que é quem detém a conexão.

**I-2 · contaminação por órfã anterior.** Com o instrumento corrigido, o disparo **t1 produziu órfã** —
e os disparos t2-t5 então **viam a órfã de t1** em ~11 ms e matavam o filho **antes de ele criar a
própria role**. As 4 tentativas seguintes são **INVÁLIDAS** (mediram a sobrevivente, não a gênese) e
**não entram no N**; o `depois=1` delas é a mesma role de t1, não quatro órfãs. Correção: `f8v2.mjs`
tira um **baseline** de `rls_test_%` antes do spawn e só considera nome **novo**.

### F8.1 · A órfã produzida em t1 — caracterizada (a primeira gênese medida por execução deste bloco)

Nome: **`rls_test_1788186498149_8e4709d6db7e3`**, morta a ~747 ms de execução, 1 ms depois de a role
aparecer no catálogo; filho saiu com `code 1` a 917 ms sem rodar o `finally`.

| Propriedade | Valor medido | Como |
|---|---|---|
| `rolcanlogin` | **`t`** — **tem LOGIN** | `pg_roles` |
| `rolsuper` / `rolcreatedb` / `rolcreaterole` / `rolinherit` / `rolbypassrls` | `f` / `f` / `f` / `f` / `f` | `pg_roles` |
| `rolvaliduntil` | **NULL — não expira** | `pg_roles` |
| Privilégios de tabela | **460** | `information_schema.role_table_grants` |
| Decomposição | **115 SELECT + 115 INSERT + 115 UPDATE + 115 DELETE** | `GROUP BY privilege_type` |
| Tabelas distintas | **115** | `count(DISTINCT table_name)` |
| `USAGE` em `public` | **`t`** | `has_schema_privilege` |
| Data embutida no nome | **2026-08-31T14:28:18.149Z** | `new Date(1788186498149)` |

**O 460 não é coincidência: é o mesmo número de `P-O6R-ARNES-ISOLAMENTO`** ("até 460 privilégios de
tabela cada", 2026-08-18), e o **115** é a mesma contagem que a junta do ciclo 3 registrou ("uma role
com LOGIN e escrita em 115 tabelas"). A gênese medida hoje **reproduz a assinatura** do lixo que a
pendência descreve — é a evidência que liga o mecanismo medido aqui às 68 declaradas lá, sem precisar
contar as 68.

**Datação por nome, confirmada por execução:** o `Date.now()` embutido (l.25) decodifica para o
instante exato da criação. **Cada uma das 68 órfãs da base viva pode ser datada pelo nome, sem
consultar privilégio nem catálogo** — insumo direto para a recontagem supervisionada que
`P-ARNES-RLS-TEST-FORA-DO-SWEEP` reserva à junta.

### F8.2 · A órfã SOBREVIVE — prova por execução nos dois caminhos

Com a órfã de t1 viva no cluster, `DATABASE_URL` → `san2-4a-pg2`:

| Passada | Comando | EC | Sumário | Órfã depois |
|---|---|---|---|---|
| Estado inicial | `snap.sh` | — | — | `rls_test_1788186498149_…\|t\|460` |
| **S1 · caminho do próprio criador** | `run-backend-tests.mjs tests/rls-tenant-isolation.test.ts` | **0** | 1 arq · 1 teste · pass 1 | **SOBREVIVE**, `t\|460` |
| **S2 · caminho do VARREDOR** | `run-backend-tests.mjs tests/auth-identity-backfill-db.test.ts` (usa `createEphemeralRole`, o único chamador do sweep) | **0** | 1 arq · **6** testes · pass 6 | **SOBREVIVE**, `t\|460` |

`grep -c "o6r-arnes] sweep" f8-surv-s2.log` = **0** — o varredor **não emitiu uma linha sequer** sobre
esta role. As duas passadas confirmam a leitura da F6: nem o criador recolhe o que ficou para trás
(ele só derruba a role da própria execução, pelo nome que tem em memória), nem o varredor a alcança.

**Ressalva de honestidade sobre esta prova:** a órfã de t1 tinha ~5 min de idade, e o corte do
varredor é de **60 min** (`ORPHAN_ROLE_MAX_AGE_MS`, l.85). Logo S2, sozinho, **não separa** "não foi
varrida porque a família está fora" de "não foi varrida porque é nova demais". **É a F9 que separa** —
com role retrodatada além do corte. Publicar S2 como prova da exclusão de família, sem a F9, seria
exatamente o tipo de conclusão que esta rodada existe para não produzir.

*(Nota lateral, dado de execução real: `auth-identity-backfill-db` mede **6** testes, idêntico ao que
o `status-geral.md` l.33 declara — coerente com a medição 2 deste bloco.)*

---

### F8.3 · Bateria válida — **N=5, 5/5 órfãs produzidas**

Forma: `f8v2.mjs` — spawn de `node scripts/run-backend-tests.mjs tests/rls-tenant-isolation.test.ts`
com `cwd` no worktree e `DATABASE_URL` → `san2-4a-pg2`; poller a ~16 Hz **com baseline de exclusão**;
`taskkill /F /T /PID <child.pid>` no primeiro nome NOVO visto (atraso 0 ms); espera de 2,5 s; snapshot.
**Entre tentativas, a órfã produzida é derrubada por teardown ESCOPADO ao nome exato** — nunca
curinga, nunca em massa (§5.2; o incidente de 26/07 é a regra).

| # | Órfã produzida | aparece | kill | filho sai | `rolcanlogin` | privilégios | Órfã? |
|---|---|---|---|---|---|---|---|
| t1 | `rls_test_1788186676905_becfe5bff098d` | 751 ms | +1 ms | code 1 @ 911 ms | **`t`** | **460** | **SIM** |
| t2 | `rls_test_1788186681109_e46dd247128fb` | 782 ms | +1 ms | code 1 @ 927 ms | **`t`** | **460** | **SIM** |
| t3 | `rls_test_1788186685365_e535649888119` | 767 ms | +1 ms | code 1 @ 911 ms | **`t`** | **460** | **SIM** |
| t4 | `rls_test_1788186689595_c69df0899737c` | 760 ms | +1 ms | code 1 @ 901 ms | **`t`** | **460** | **SIM** |
| t5 | `rls_test_1788186693802_820923e34f25d` | 753 ms | +1 ms | code 1 @ 910 ms | **`t`** | **460** | **SIM** |

**Taxa de gênese: 5/5 = 100 %** quando o SIGKILL cai dentro da janela. Todas as cinco nascem
**idênticas em privilégio**: LOGIN, sem expiração, 460 grants (115 tabelas × 4), USAGE em `public`.

**Controle do teardown escopado (anti-mass-delete), executado:** `drop-exato.sh postgres` →
`RECUSADO: postgres fora dos prefixos permitidos`, **ec=2**. O instrumento de limpeza recusa nome fora
dos três prefixos que ele próprio fabricou; o `DROP OWNED`/`DROP ROLE` só corre para nome exato.
Estado final do cluster após a bateria: **0 roles não-sistema**.

### F8.4 · O que a taxa 5/5 significa — e o que ela **não** significa

**Significa:** a gênese **não** depende de sorte de temporização fina. A janela medida na F7 é de
~1,93 s sobre ~2,78 s de execução (**~70 %** do tempo de vida do processo), e dentro dela a produção é
determinística — CREATE já commitado, teardown ainda longe. `1 ms` de atraso entre ver e matar bastou
nas 5.

**NÃO significa** "toda morte de processo produz órfã": as 5 tentativas **miraram** a janela por
polling. A taxa incondicional depende de **quando** o processo morre, e o número honesto para isso é a
fração de janela da F7 (**~0,70** para morte em instante uniformemente sorteado) — não os 5/5, que são
**condicionais a acertar a janela**. Confundir os dois seria publicar 100 % de uma coisa que se mediu
de outra.

**NÃO mede** frequência real de morte de processo em uso normal (quantas vezes por semana alguém
Ctrl-C uma bateria, a CI mata por timeout, a máquina desliga). Isso é **taxa de exposição**, não está
neste bloco, e é o que faltaria para converter "5/5 quando morre na janela" em "N órfãs por mês".

**Caminho NÃO exercitado por execução:** `assert.fail`/exceção dentro do `try`. Pela leitura (F6.4) o
`finally` roda e não há órfã, e as 10 rodadas verdes da F7 exercitam o `finally` no caminho de sucesso
— mas o caminho de **falha de asserção** não foi disparado aqui. Fica **declarado como não medido**.

---

## §F9 · Nenhum mecanismo derruba a família — prova COM contraprova (§3.3-F9), **N=2**

Forma: roles sintéticas criadas por **SQL direto** no `san2-4a-pg2` (`CREATE ROLE … NOLOGIN
NOSUPERUSER NOBYPASSRLS`), com o timestamp do nome **retrodatado em 2 h** — além do corte de 60 min do
varredor, de modo que a idade **deixa de ser explicação possível**. O varredor é invocado pelo seu
**único chamador real** (`createEphemeralRole`, F6.3), executando
`node scripts/run-backend-tests.mjs tests/auth-identity-backfill-db.test.ts`.

Quatro famílias na mesa de propósito — duas registradas, uma não registrada e a alvo:

| Família | Registrada em `SWEPT_ROLE_FAMILIES`? | Papel no experimento |
|---|---|---|
| `audit_rls_` | **sim** | **vermelho-controle** — TEM de ser recolhida, senão a sonda não invocou o sweep |
| `vid_rls_test_` | **sim** | controle da ancoragem: contém `rls_test` como substring |
| `rls_test_` | **NÃO** | **o alvo** |
| `zzz_probe_` | **NÃO** (prefixo de sonda, l.428) | contraprova anti-mass-delete |

### F9 · rodada 1 — timestamp `1788179560018` (2026-08-31T12:32:40.018Z, 2 h de idade)

Catálogo **antes**: `audit_rls_…deadbeef` · `rls_test_…deadbeef` · `vid_rls_test_…deadbeef` ·
`zzz_probe_…deadbeef` (4 roles). Execução: **EC=0**, `1 arquivo · 6 testes · pass 6 · fail 0 · skip 0`.

Linhas do varredor, transcritas do log `f9-r1.log`:

```
# [o6r-arnes] sweep dropou 2 role(s) órfã(s) das famílias registradas (o6r_b01, o6r_clone_owner, audit_rls, vid_rls_test, vid_link_rls) com mais de 60 min:
# [o6r-arnes]   audit_rls_1788179560018_deadbeef
# [o6r-arnes]   vid_rls_test_1788179560018_deadbeef
```

Catálogo **depois**: `rls_test_1788179560018_deadbeef` · `zzz_probe_1788179560018_deadbeef`.

### F9 · rodada 2 — sintéticas novas, timestamp `1788179637321`

Execução: **EC=0**, `1 arquivo · 6 testes · pass 6`. Log `f9-r2.log`:

```
# [o6r-arnes] sweep dropou 2 role(s) órfã(s) das famílias registradas (…) com mais de 60 min:
# [o6r-arnes]   audit_rls_1788179637321_cafe01
# [o6r-arnes]   vid_rls_test_1788179637321_cafe01
```

Catálogo **depois**: de novo apenas `rls_test_1788179560018_deadbeef` e `zzz_probe_…deadbeef`.

### F9 · veredito, item a item

| Afirmação | Resultado | N |
|---|---|---|
| **Vermelho-controle:** `audit_rls_` (registrada, >60 min) **é recolhida** | **SIM, 2/2** — a sonda invocou o sweep de verdade | 2 |
| **`rls_test_` SOBREVIVE ao varredor** | **SIM, 2/2** — nomeada em nenhuma das linhas de sweep | 2 |
| **Idade não é a explicação** | **provado** — a `rls_test_` sobrevivente tem **2 h**, e as recolhidas na mesma passada tinham a **mesma idade** | 2 |
| **Contraprova anti-mass-delete:** `zzz_probe_` (prefixo não registrado) sobrevive | **SIM, 2/2** — o varredor não é curinga | 2 |
| **Ancoragem por prefixo, por execução:** `vid_rls_test_` **é** varrida enquanto `rls_test_` **não é** | **SIM, 2/2** | 2 |

A última linha é a que fecha a armadilha de nomenclatura da F6.1 **por execução, não por leitura de
regex**: as duas famílias compartilham a substring `rls_test`, e mesmo assim uma cai e a outra fica —
porque `LIKE` e regex ancoram no **início** do nome. Quem for recontar ou varrer a família por
substring erra nas duas direções.

**A `rls_test_` sobrevivente acumulou, neste bloco: 2 invocações do varredor (F9 r1/r2) + 1 passada do
próprio criador (F8.2 S1) + 1 passada da suíte do varredor (F8.2 S2). Quatro oportunidades de ser
recolhida, zero recolhimentos.** Combinado com a F6.3 (dupla exclusão: família não registrada **e**
criador que nunca chama o sweep), a resposta à pergunta "quem derruba a família `rls_test_`?" é, medida
por execução: **ninguém, exceto o `finally` do próprio processo que a criou — e é exatamente esse
`finally` que a órfã, por definição, não executou.**

---

## §F10 · O número vivo — **CARREGADO, não remedido** (§3.3-F10)

**Este é o ponto em que a medição se recusa a medir, e o diz com todas as letras.**

| Grandeza | Valor | Data | Fonte | Status nesta medição |
|---|---|---|---|---|
| Roles `rls_test_` órfãs na base do dono | **68** | **2026-08-18** | `P-O6R-ARNES-ISOLAMENTO` l.3296-3298; reafirmado em 28/08 por `P-ARNES-RLS-TEST-FORA-DO-SWEEP` | **CARREGADO — NÃO re-verificado** |
| Roles não-sistema na base do dono | **81** (74 com LOGIN) | 2026-08-18 | idem | **CARREGADO — NÃO re-verificado** |
| Privilégios de tabela por órfã | **até 460** | 2026-08-18 | idem | **CONFIRMADO POR MECANISMO** — a gênese medida hoje produz exatamente 460 (115×4), 5/5 |

**Por que não foi remedido:** contar as 68 exigiria consultar `erp-postgres`, e o §5.2 do plano proíbe
**qualquer comando, inclusive leitura**, nessa base. O bloco cumpriu a proibição — a prova está no §T4.

**O que seria necessário para remedi-lo, nomeado para a junta:** uma **recontagem supervisionada
única**, fora de lote de teste, com `DATABASE_URL` conferida à mão, **somente SELECT**, produzindo por
role: nome, `rolcanlogin`, contagem de grants e **a data decodificada do timestamp embutido** — que a
F8.1 provou ser decodificável (`1788186498149` → `2026-08-31T14:28:18.149Z`). Essa decisão é de
`P-ARNES-RLS-TEST-FORA-DO-SWEEP` e da junta, **não do 4a**.

**Publicar "68" como número de hoje seria a classe exata que esta rodada existe para exterminar.** O 68
é de 13 dias atrás; entre 18/08 e hoje o mecanismo medido aqui continuou capaz de produzir órfãs a
100 % quando um processo morre na janela, e nada as recolhe. O número **de hoje** é, portanto,
**desconhecido e ≥ 68 apenas por argumento — não por medição**. Fica assim declarado.

---

## §V · Veredito da MEDIÇÃO 3 — o censo do MECANISMO, com N, forma e causa

### V.1 · As quatro perguntas do mandato, respondidas por execução

| Pergunta | Resposta medida | N / forma |
|---|---|---|
| **Quem CRIA** as `rls_test_`? | **`tests/rls-tenant-isolation.test.ts:25`, criador único.** Nenhum código de `src/` ou `scripts/` cria a família — é exclusivamente arnês de teste. `CREATE ROLE … LOGIN` + 3 GRANTs, l.31-42, dentro de `withRoleCatalogLock` | F6, leitura no head `1949c6a`, `grep` completo transcrito |
| **Quem as DERRUBA** — e onde o teardown NÃO roda? | **Só o `finally` do próprio teste** (l.3148-3151). **Não roda** em SIGKILL/crash nem em SIGINT/SIGTERM sem handler. **Roda** em `assert.fail`/exceção (é `finally`). O varredor **nunca** as alcança, por **dupla** exclusão: família fora de `SWEPT_ROLE_FAMILIES` (l.94, l.105-111) **e** criador que nunca chama `sweepOrphanEphemeralRoles` (chamador único: `createEphemeralRole`, l.310) | F6 + F9 (N=2, controle verde 2/2) + F8.2 |
| **Quantas ficam órfãs por execução, e com que privilégio?** | **1 por execução morta na janela; 5/5 tentativas** produziram órfã. Privilégio **idêntico nas 5**: `rolcanlogin=t`, sem expiração, `USAGE` em `public`, **460 privilégios de tabela = 115 tabelas × 4 (SELECT/INSERT/UPDATE/DELETE)** | F8.3, N=5, forma `f8v2.mjs` |
| **Sobra lixo com privilégio após uma bateria?** (vaza-metro) | **No caminho feliz, NÃO: 10/10 rodadas com Δ=0**, com controle de aparição verde 5/5. **Na morte de processo, SIM: 100 % quando o kill cai na janela** — e a janela é **~70 % do tempo de vida do processo** (1930 ms de ~2780 ms) | F7 N=10 + F8 N=5 |

### V.2 · A causa, nomeada por execução (não por hipótese)

**A órfã não é produto de uma corrida fina nem de um teardown que falha: é produto de um teardown que
depende inteiramente de o processo continuar vivo.** CREATE e DROP são as duas pontas de um
`try/finally` separadas por **~1,93 s** de suíte — 70 % da execução. Não existe, em lugar nenhum do
repositório, mecanismo de recolhimento posterior para esta família: nem no criador (que só conhece o
nome que tem em memória, perdido com o processo), nem no varredor (que não a lista e cujo único
chamador o criador não invoca). Medido: **4 oportunidades de recolhimento, 0 recolhimentos.**

O `LOGIN` e os 460 grants não são agravante retórico — são o que a execução mediu, 5 vezes, idêntico.
Ressalva já feita na F6.2 e repetida aqui para não inflar o achado: a **senha** da role morre com o
processo, então a órfã não é credencial utilizável por terceiro; o que persiste é **role com LOGIN,
sem expiração, com ACL em 115 tabelas** — resíduo de catálogo, não porta aberta pronta.

### V.3 · O que esta medição **NÃO** cobre (dito com esta letra — §4.7 do plano)

1. **NÃO mede a base viva do dono.** `erp-postgres`/`erp-redis` não receberam **nenhum comando, nem
   leitura**. O **68** segue **CARREGADO** (§F10), com data (18/08) e fonte. O número de hoje é
   **desconhecido**.
2. **NÃO mede a taxa incondicional de órfãs.** O 5/5 é **condicional a o kill cair na janela** (o
   poller mirou). O número honesto para morte em instante sorteado é a **fração de janela ≈ 0,70** da
   F7 — e nem esse é "órfãs por semana", porque **a frequência de morte de processo não foi medida**.
3. **NÃO exercita o caminho `assert.fail`/exceção** por execução. A leitura (F6.4) diz que o `finally`
   roda; as 10 rodadas verdes da F7 exercitam o `finally` só no caminho de sucesso.
4. **NÃO mede sob paralelismo nem contenção.** Tudo aqui é **sequencial, um arquivo por vez, uma
   máquina** (Node v20.19.5, Windows 11 Pro 10.0.22631). Os `Δ=0` da F7 não valem como "não vaza sob
   `node --test` paralelo" — a mesma ressalva que a medição 2 fez sobre os `XX000`.
5. **NÃO rodou a suíte inteira.** A F8.2 usou o caminho do criador e o caminho do varredor
   (`auth-identity-backfill-db`), não o lote completo — custo proibitivo e contaminação do N pelos
   defeitos já medidos do lote (mesmo critério da medição 1).
6. **NÃO audita se `rls_test_` é a única família órfã sem varredor.** Mediu-se a família nomeada no
   mandato; `zzz_probe_` entrou só como contraprova. Outras famílias legadas na base viva ficam fora.
7. **NÃO decide governança.** Se `rls_test_` deve entrar no sweep, se as 68 devem ser recontadas ou
   removidas, e quem apensa cada errata — **não é decisão do 4a** (§V.4).
8. **NÃO cobre os alvos 1 e 2** (`authority-portal`, bateria barata): este diário é a **medição 3** e
   só ela; os outros dois estão fechados em diários próprios nesta pasta.

### V.4 · Observações para o **SAN2-4b** — achados, **NENHUM conserto aplicado** (§0/§5.2, §C7.4-bis)

Sou *achador*; achador não conserta. Registro defeito, evidência executada e motivo — e **não** escrevo
nem proponho a correção. **Não toquei `tests/`, `scripts/`, `src/`, `.github/`, `Kpis/` nem contratos**
(§T4 prova por diff). Todos os itens abaixo são de escopo **`pre-existente`** por construção: o diff de
código deste bloco é vazio, e o mecanismo antecede o bloco (a família é do `B-O6R-01`, a exclusão do
sweep é de 28/08, o 68 é de 18/08).

| # | Achado | Evidência executada | Onde | Dono sugerido |
|---|---|---|---|---|
| **O-1** | **A exclusão é DUPLA, e só a primeira metade está registrada.** Acrescentar `rls_test_` a `SWEPT_ROLE_FAMILIES` **não bastaria**: `sweepOrphanEphemeralRoles` tem **um único chamador** (`createEphemeralRole`, l.310) e `tests/rls-tenant-isolation.test.ts` **não o usa** (importa só `withRoleCatalogLock`, l.6). Rodar o criador sozinho continuaria sem varrer nada | F6.3 (grep devolve 2 linhas: definição l.138 + chamada l.310) + F8.2 S1 (órfã sobrevive à passada do próprio criador) | `tests/helpers/auth-identity-fixture.ts` l.94 e l.105-111 | **SAN2-4b** |
| **O-2** | **O teardown de `rls_test_` NÃO é resiliente**, ao contrário do das outras famílias. As l.3148-3151 chamam `DROP OWNED`+`DROP ROLE` crus dentro do lock; não usam `dropEphemeralRoleResilient` (l.251), o helper que o B-O6R-ARNES criou justamente para que um `DROP OWNED` que falhe por concorrência **não leve o `DROP ROLE` junto**. É uma **terceira** porta de gênese, além de SIGKILL e SIGINT | Leitura F6.3 no head `1949c6a`; contraste com l.251 e com o comentário C-B do fixture ("o próprio arnês usa o teardown resiliente — a propriedade não pode valer só para os outros") | `tests/rls-tenant-isolation.test.ts:3148-3151` | **SAN2-4b** |
| **O-3** | **A recontagem das 68 é possível sem varredura destrutiva** — cada nome carrega a própria data. Decodificação confirmada por execução | F8.1: `1788186498149` → `2026-08-31T14:28:18.149Z` | `P-ARNES-RLS-TEST-FORA-DO-SWEEP` | **junta** (recontagem supervisionada, só SELECT) |
| **O-4** | **Armadilha de nomenclatura, provada por execução:** `vid_rls_test_` **é** varrida e `rls_test_` **não é**, apesar de uma conter a outra como substring. Quem contar ou varrer a família por substring erra nas duas direções | F9 r1 e r2: as duas famílias, mesma idade, mesma passada — uma cai, a outra fica (2/2) | qualquer registro ou script que venha a contar a família | **SAN2-4b** + junta |
| **O-5** | **A assinatura do lixo bate com a da pendência**: 460 = 115×4, LOGIN, sem expiração — idêntica em 5/5 gêneses medidas hoje e igual ao "até 460 privilégios" de 18/08. Liga o mecanismo medido às 68 declaradas **sem** contá-las | F8.1 + F8.3 | `P-O6R-ARNES-ISOLAMENTO` l.3296-3298 (emenda) | **SAN2-4b** |

**Nota de calibração para a junta, que não é conserto:** a l.94 do fixture registra que um sweep
alcançando `rls_test_` "seria exatamente a classe do incidente de mass-delete de 26/07 caso alguém
apontasse `DATABASE_URL` para a base errada". Esta medição **não contradiz** esse argumento — ele segue
de pé, e o `zzz_probe_` sobrevivente (F9, 2/2) mostra o varredor se comportando como allowlist
ancorada, não como curinga. O que a medição acrescenta é o **preço** medido da decisão: 100 % de gênese
na janela, 0 recolhimentos em 4 oportunidades, 460 privilégios por órfã. **O custo-benefício é da
junta; o número é meu.**

### V.5 · Fecho da medição 3

**O MECANISMO está medido, com N, forma e causa.** Criador nomeado por arquivo e linha; privilégio
contado; janela cronometrada; gênese reproduzida 5/5 com caracterização idêntica; a inexistência de
recolhedor provada com **vermelho-controle verde 2/2** e **contraprova anti-mass-delete 2/2**. Duas
falhas de instrumento foram caçadas e **publicadas** em vez de virarem número. Nenhuma rodada foi
descartada para maquiar resultado; as descartadas (I-1, I-2) estão nominadas com o motivo. **O 68
continua CARREGADO** — e é o item que esta medição mais deliberadamente **não** entrega.
**O 4a não consertou nada.**

---

## §T4 · Teardown (parte da medição, §3.4 — não cortesia)

**Limpeza de catálogo — escopada, nunca em massa (§5.2; o incidente de 26/07 é a regra):**

- Cada órfã da F8.3 foi derrubada por **nome exato** logo após ser caracterizada (5 drops).
- As 2 sintéticas sobreviventes da F9 (`rls_test_…deadbeef`, `zzz_probe_…deadbeef`) idem, ao final.
- **Nenhum `LIKE`, nenhum curinga, nenhum `DROP` em lote** foi executado em base alguma.
- **Controle do próprio instrumento de limpeza, executado:** `drop-exato.sh postgres` →
  `RECUSADO: postgres fora dos prefixos permitidos`, **ec=2**.
- Catálogo do `san2-4a-pg2` ao final: **0 roles não-sistema**.

**Containers:**

```
$ docker rm -f san2-4a-pg2
san2-4a-pg2                       (ec=0)

$ docker ps -a --filter "name=san2-4a" --format "{{.Names}}"
(vazio)

$ docker ps
NAMES          PORTS                                         STATUS
erp-postgres   0.0.0.0:5432->5432/tcp, [::]:5432->5432/tcp   Up 2 days (healthy)
erp-redis      0.0.0.0:6379->6379/tcp, [::]:6379->6379/tcp   Up 2 days (healthy)
```

**Nenhum container `san2-4a-*` sobrou.** E o `Up 2 days (healthy)` de `erp-postgres`/`erp-redis` é o
marcador de prova do §T3: o uptime **atravessou a medição 3 inteira sem reiniciar**, e nenhum comando —
nem de leitura — foi disparado contra eles (§5.2). No alvo mais perigoso do bloco, a base viva ficou
literalmente fora do alcance: toda `DATABASE_URL` desta medição apontou para `127.0.0.1:56433`.

**Estado da árvore ao fim (verificado, não afirmado):**

| Verificação | Resultado |
|---|---|
| `git rev-parse HEAD` | `1949c6a3657dd38b9dbe5c3cd9efa792e656e019` — **inalterado** |
| `git status --porcelain` | **apenas** `?? agent-orchestration/omega/juntas/votos/SAN2-4a/medicao-3-censo-roles.md` (untracked, **não commitado** — o mandato proíbe commit) |
| diff de código, working tree, em `src tests scripts prisma frontend mobile portals .github package.json package-lock.json .claude/agents .agents Kpis` | **VAZIO** |
| o mesmo diff em `main...HEAD` | **VAZIO** |
| `git diff --check` | **ec=0** |
| `node_modules` do worktree | diretório real, não junction/symlink — nada criado nem removido |

**Limpeza §C5:** cluster descartável `san2-4a-pg2` removido; nenhuma porta ficou alocada. Os logs desta
medição (`f7-r01..r10*`, `f8b-t1..t5*`, `f8v2-t1..t5*`, `f9-r1/r2.log`, `f8-surv-s1/s2.log`) e as
sondas (`poll.mjs`, `f8.mjs`, `f8v2.mjs`, `snap.sh`, `drop-exato.sh`) permanecem no **scratchpad da
sessão**, que morre com o bloco — são a evidência nomeada que o §4.1 exige enquanto a junta não votar.
Nada rastreado foi apagado; **um único arquivo tocado nesta sessão: este diário**.

## §E · Estado

**MEDIÇÃO 3 (alvo 3, §3.3): CONCLUÍDA.** Critério de "medição suficiente" do plano, item a item:
criadores enumerados com arquivo e linha (**F6**); **F7** com N=10 e deltas publicados, com controle de
aparição verde 5/5; **5 órfãs produzidas e caracterizadas** em **F8** (N=5 — muito além do "1 ou mais"
exigido), com a janela cronometrada em 1883-1970 ms; **F9** com contraprova verde (2/2) e
vermelho-controle verde (2/2); e o **CARREGADO do F10 rotulado como carregado**. As medições 1 e 2 já
estavam fechadas em diários próprios nesta pasta — **as três medições do SAN2-4a estão completas**.
**Nenhum conserto foi aplicado em nenhuma delas.**

### §T4-bis · ERRATA datada ao §T4 (2026-08-31, minutos após a tabela acima) — **não reescrevo, aponho**

A linha `git status --porcelain` da tabela do §T4 dizia "**apenas** o diário da medição 3". Isso era
verdade no instante em que foi medida e **deixou de ser** poucos minutos depois. Re-medido:

```
 M Kpis/kpis-history.json
?? agent-orchestration/omega/juntas/votos/SAN2-4a/kpi-backfill-log.md
?? agent-orchestration/omega/juntas/votos/SAN2-4a/medicao-3-censo-roles.md
```

**Nada disso é meu, e a evidência é o conteúdo, não a minha palavra.** O diff de `Kpis/kpis-history.json`
é de **3 linhas**, na última entrada (SAN2-3): `pr: null → 364`, `merge_commit: null → "c9fd3a1"`,
`approved_head: null → "23d9227"`. É **exatamente** o backfill que o **§1.6 do plano** prescreve como
obrigação do PR, com o head da ata (`23d9227`) e não o headRefOid do GitHub — trabalho de **outra
instância operando neste mesmo worktree em paralelo**, com o seu próprio diário
(`kpi-backfill-log.md`, mtime 11:42:10). Meu mandato é a medição 3 e **não inclui `Kpis/`** (§5.1 do
mandato: "toque apenas o diário da medição 3").

**Re-verificado após a mudança, e é o que importa para o meu escopo:**
`git diff --name-only -- src tests scripts prisma frontend mobile portals .github package.json
package-lock.json .claude/agents .agents` = **VAZIO**. O `Kpis/` sai da minha lista de conferência
justamente porque **outro dono legítimo está nele** — e é por isso que a linha do §T4 o citava junto
dos caminhos de código, o que agora fica corrigido: **o diff de CÓDIGO segue vazio; o `Kpis/` mudou, e
não fui eu.**

Registro isto em vez de editar a linha original porque uma medição que corrige o próprio passado em
silêncio perde o direito de cobrar errata dos outros (§A2, e é a mesma regra que a medição 2 aplicou ao
`status-geral.md`). **Nenhum arquivo além deste diário foi tocado por esta instância**, antes ou depois
da errata.
