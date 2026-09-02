# SAN2-4a · MEDIÇÃO 2 — as duas listas da "bateria barata" (`P-REG-BATERIA-BARATA-DUAS-LISTAS`)

> **Diário de execução**, escrito **incrementalmente** (§3.0.5 do plano: cada tabela vai a disco ao fim
> de cada forma; o que fica só em contexto não sobrevive). Executor: instância `dev-san2-4a`, designada
> pelo orquestrador. Plano: `agent-orchestration/omega/planos/SAN2-4a-plano.md` **§3.2** (alvo 2).
> **Mandato: MEDIÇÃO 2 apenas.** Alvo 1 (`authority-portal`) e alvo 3 (`rls_test_`) NÃO são deste diário.
>
> **REGRA DO BLOCO, repetida onde o executor a lê: o 4a NÃO CONSERTA NADA** (§0/§5.2). Se a medição
> apontar qual lista corrigir, o achado vira **observação para o 4b** — nunca conserto aqui.

**Divergência de caminho, declarada (§A2, não escolhida em silêncio):** o plano §5.1 nomeia
`agent-orchestration/omega/medicoes/SAN2-4a-medicao.md` como relatório canônico das três medições. O
mandato do orquestrador partiu o bloco por medição e nomeou **este** caminho
(`omega/juntas/votos/SAN2-4a/medicao-2-bateria-barata.md`), que está dentro de
`agent-orchestration/omega/juntas/**` — também permitido pelo §5.1. Este diário é a **medição 2**; a
consolidação no relatório canônico é de quem reunir as três. Nada foi apagado nem reescrito.

---

## §T · Terreno (§3.0, fail-closed) — executado ANTES de qualquer rodada

Todas as saídas abaixo são transcritas da execução, não de memória.

### T1 · Ambiente

| Item | Valor medido | Comando |
|---|---|---|
| Node | **v20.19.5** | `node -v` |
| Worktree | `.claude/worktrees/san2-r` | — |
| Branch | `chore/san2-4a-medir-arnes` | `git branch --show-current` |
| Head | `116aa4644be9d4f933295c451e55ba5330abe396` | `git rev-parse HEAD` |
| `git status --porcelain` | **vazio** (árvore limpa no início) | — |
| `prisma/migrations` | **103** | `ls prisma/migrations \| wc -l` |
| `node_modules` | **diretório real** — `dir /AL` não acusou JUNCTION/SYMLINK | `cmd /c dir /AL node_modules` |

O check de `node_modules` é a proibição de 26/08 (`D-JUNTA-ESCOPO-E-CALIBRACAO` §(c)) sendo **executada**,
não citada: junction entre worktrees é proibida, e este worktree tem instalação própria.

### T2 · Portas — `netsh` consultado ANTES de fixar (§3.0.1)

`netsh interface ipv4 show excludedportrange protocol=tcp` (saída integral transcrita):

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

**Veredito de porta:** **56432** (Postgres) e **56379** (Redis) **não caem em nenhuma faixa listada** —
a maior faixa abaixo delas termina em 55452 e a próxima só começa em 63148. Portas confirmadas, sem
necessidade de alternativa. E a faixa `55353–55452` **reproduz por execução** o motivo de
`P-SAN2-2-PORTA-55432-RESERVADA`: a 55432 está viva dentro dela nesta máquina, hoje.

### T3 · Base viva — INTOCADA

`docker ps` no início:

```
erp-postgres    0.0.0.0:5432->5432/tcp    Up 2 days (healthy)
erp-redis       0.0.0.0:6379->6379/tcp    Up 2 days (healthy)
```

**Nenhum comando desta medição toca `erp-postgres`/`erp-redis`, nem leitura** (§5.2). `DATABASE_URL` e
`REDIS_URL` são exportadas explicitamente por rodada apontando para os descartáveis — jamais herdadas
de `.env`.

---

## §L · As três listas em disputa, transcritas da fonte (leitura, antes da execução)

**Lista-7** — `agent-orchestration/docs/status-geral.md` l.33, com contagem por arquivo:

| # | Arquivo | Contagem declarada |
|---|---|---|
| 1 | `tests/audit-security.test.ts` | 1 |
| 2 | `tests/auth-identity-backfill-db.test.ts` | 6 |
| 3 | `tests/auth-identity-link-events-db.test.ts` | 5 |
| 4 | `tests/auth-identity-role-real-db.test.ts` | 10 |
| 5 | `tests/impound-process-checklist-link-schema.test.ts` | 5 |
| 6 | `tests/rls-tenant-isolation.test.ts` | 1 |
| 7 | `tests/vehicle-identity-schema.test.ts` | 9 |
| | **soma declarada** | **37** |

E a sentença que a execução tem de confirmar ou derrubar: *"São **sete** arquivos, não seis — o rótulo
anterior dizia '6 arquivos escritores de catálogo' e **nenhuma combinação de 6 que contenha as vítimas
nomeadas fecha 37**."*

**Lista-6** — `agent-orchestration/controle/pendencias.md` l.3440-3448 (EMENDAS do B-O6R-ARNES),
**sem** contagem por arquivo, com denominador 37: `audit-security` · `auth-identity-backfill-db` ·
**`auth-identity-links-db`** · `rls-tenant-isolation` · `vehicle-identity-schema` ·
`impound-process-checklist-link-schema`. Forma declarada lá: `DATABASE_URL`→:55950, `REDIS_URL`→:56950,
cluster `arnes-dev-pg` com 103 migrations, Node v20.19.5, **N=13 PRÉ 7/13 vermelhas + 1 queda 37→32**,
**N=13 PÓS 13/13 ec=0, denominador 37 idêntico**.

**Lista-6 (segunda ocorrência)** — `agent-orchestration/omega/planos/B-O6R-02-ciclo5-plano.md` §0.a:
**a mesma lista de 6**, forma `DATABASE_URL`→:55801, `REDIS_URL`→:56801, N=13, com a tabela rodada a
rodada — **`tests=37` em 12 das 13** (a r13 caiu a 32 por aborto). O §14 do mesmo plano repete
*"forma barata 6-arquivos = 37 testes"*.

**Portanto são TRÊS registros vivos, dois deles a mesma lista-6.** Os quatro arquivos em disputa
existem todos em disco no head `116aa46` (`ls -la` conferido: `auth-identity-links-db` 19136 B ·
`auth-identity-link-events-db` 11324 B · `auth-identity-role-real-db` 26616 B ·
`auth-identity-backfill-db` 14718 B).

**A aritmética que a execução decide** (hipótese do plano §2.2, rotulada como hipótese até a sonda):
os 5 arquivos comuns às duas listas somam, pela lista-7, `1+6+1+9+5 = 22`. Se
`auth-identity-links-db` medir **15**, a lista-6 também fecha 37 — e então as listas **não são
contraditórias**, são duas partições válidas do mesmo total, e a única sentença falsa é a do
`status-geral.md`. Se medir diferente de 15, uma das listas está errada e a medição diz qual.

**Contagem estática é declarada NÃO-PROVA** (§4.6): `grep -cE '^\s*(test|it)\(' ` nos candidatos
devolve números que contradizem os declarados (subtestes aninhados são invisíveis ao grep). Nenhum
número deste diário vem de grep — **todos vêm do sumário de execução do runner**
(`[run-backend-tests] N arquivo(s) · M teste(s) · pass … · fail … · skipped …`, emitido em stderr
na l.412-413 de `scripts/run-backend-tests.mjs`).

---

## §F4 · Denominador POR ARQUIVO (N=3 por arquivo; N=5 se variar)

**Forma (idêntica nas 24 rodadas):** `node scripts/run-backend-tests.mjs <arquivo>` ·
`DATABASE_URL=postgresql://san2:san2@127.0.0.1:56432/san2` (cluster descartável `san2-4a-pg`,
postgres:16, **103 migrations** aplicadas com `npx prisma migrate deploy` ec=0) ·
`REDIS_URL=redis://127.0.0.1:56379` (`san2-4a-redis`) · `CORE_SAAS_PERSISTENCE` **não exportada**
(o runner declarou por si `CORE_SAAS_PERSISTENCE=memory — padrão do runner`, transcrito do stderr) ·
Node **v20.19.5** · head `116aa46` · rodadas **sequenciais**, uma por processo.
Denominador lido do sumário do runner, nunca de grep. Logs: `f4-<slug>-r0N.log` no scratchpad.

**Resultado — 24 rodadas, 24 com `ec=0`, `fail=0`, `skipped=0`, `xx000=0`, e denominador CONSTANTE
nas 3 rodadas de cada arquivo** (por isso N permaneceu 3: o gatilho de N=5 do §3.2 é a variação, que
não ocorreu em nenhum dos 8):

| Arquivo | r01 | r02 | r03 | **denominador medido** | declarado na lista-7 | bate? | dur. típica |
|---|---|---|---|---|---|---|---|
| `tests/audit-security.test.ts` | 1 | 1 | 1 | **1** | 1 | ✅ | 1 s |
| `tests/auth-identity-backfill-db.test.ts` | 6 | 6 | 6 | **6** | 6 | ✅ | 1-2 s |
| `tests/auth-identity-link-events-db.test.ts` | 5 | 5 | 5 | **5** | 5 | ✅ | 13-32 s |
| `tests/auth-identity-links-db.test.ts` | 15 | 15 | 15 | **15** | *(ausente da lista-7)* | — | 14 s |
| `tests/auth-identity-role-real-db.test.ts` | 10 | 10 | 10 | **10** | 10 | ✅ | 14-15 s |
| `tests/impound-process-checklist-link-schema.test.ts` | 5 | 5 | 5 | **5** | 5 | ✅ | 1 s |
| `tests/rls-tenant-isolation.test.ts` | 1 | 1 | 1 | **1** | 1 | ✅ | 3 s |
| `tests/vehicle-identity-schema.test.ts` | 9 | 9 | 9 | **9** | 9 | ✅ | 2 s |

**Dois fatos que a tabela entrega de imediato:**

1. **As sete contagens por arquivo do `status-geral.md` l.33 estão TODAS corretas** — conferidas uma a
   uma por execução, 3× cada. O registro que contém a sentença falsa acertou todos os seus números.
2. **`auth-identity-links-db` mede 15**, exatamente o valor que a hipótese §2.2 do plano previu como
   condição para as duas listas fecharem 37. A hipótese estava rotulada como hipótese; **a sonda F4 a
   confirmou por execução** — 3/3 rodadas, denominador idêntico.

**Aritmética das duas listas, com os denominadores medidos (não declarados):**

- **Lista-7** (`status-geral.md` l.33): `1 + 6 + 5 + 10 + 5 + 1 + 9` = **37** ✅
- **Lista-6** (`pendencias.md` l.3440 + ciclo-5 §0.a): `1 + 6 + 15 + 1 + 9 + 5` = **37** ✅

As duas fecham 37 pela soma dos denominadores medidos por arquivo. A confirmação **por execução da
lista inteira** (que é o que prova que o runner não altera a contagem ao agregar arquivos) é a F5.

## §F5 · As listas completas, por REGISTRO (N=5 cada) — **re-executadas pelo sucessor**

> **Nota de sucessão (R2/`D-JUNTA-RESILIENTE`).** A instância anterior de `dev-san2-4a` executou a F5
> e **caiu (`server_error`) ao escrever este fecho**. A conclusão dela ("ambas fecham 37, 5/5 cada")
> chegou **sem tabela em disco** — e conclusão sem registro **não é insumo**. O que sobreviveu foi o
> **comando** (`f5.sh`, no scratchpad) e os **logs** (`f5-lista6-r0N.log`, `f5-lista7-r0N.log`) — que
> são insumo. Portanto esta seção **RE-EXECUTA** a forma registrada e **compara**; não a redescobre e
> não herda número. Logs do sucessor têm prefixo próprio (`f5b-`) — **nada do antecessor foi
> sobrescrito**, para que um terceiro possa conferir as duas passadas.

**São TRÊS registros vivos e DUAS listas de fato.** O §L já dizia; a execução **prova** por
comparação de conjuntos (`recon.mjs`, saída transcrita no §R): os registros **B** e **C** são o
**mesmo conjunto**, arquivo por arquivo (`B === C → true`), inclusive na mesma ordem. O registro
**A** é um conjunto **diferente** (`A === B → false`). Por isso a medição rodou **os três**, e não
dois: um registro que replica outro só é *replica* depois de conferido, não antes.

| Registro | Fonte | Arquivos | Lista |
|---|---|---|---|
| **A** | `agent-orchestration/docs/status-geral.md` **l.33** | **7** | lista-7 |
| **B** | `agent-orchestration/controle/pendencias.md` l.3440-3448 (EMENDAS B-O6R-ARNES) | **6** | lista-6 |
| **C** | `agent-orchestration/omega/planos/B-O6R-02-ciclo5-plano.md` **§0.a** | **6** | lista-6 (≡ B) |

**Forma (idêntica nas 15 rodadas, e idêntica à da F4):** `node scripts/run-backend-tests.mjs <lista>` ·
`DATABASE_URL=postgresql://san2:san2@127.0.0.1:56432/san2` (cluster descartável `san2-4a-pg`,
postgres:16, **103 migrations** — conferidas por `select count(*) from _prisma_migrations where
finished_at is not null` = **103**) · `REDIS_URL=redis://127.0.0.1:56379` (`san2-4a-redis`, `PING`→`PONG`) ·
`CORE_SAAS_PERSISTENCE` **não exportada** (o runner declarou por si `CORE_SAAS_PERSISTENCE=memory —
padrão do runner`) · Node **v20.19.5** · head **`116aa46`** · rodadas **sequenciais**, uma por processo,
**sem carga sintética**. Denominador lido do sumário do runner
(`[run-backend-tests] N arquivo(s) · M teste(s) · pass … · fail … · skipped …`), **nunca de grep**.
Script: `f5b.sh`; resultados: `f5b-resultados.tsv`; listas passadas por rodada: `f5b-listas.txt`.

### F5.1 — Registro A (lista-7), N=5 — **medição do sucessor**

| Rodada | ec | arquivos | tests | pass | fail | skipped | XX000 | unhandledRejection | dur. | log |
|---|---|---|---|---|---|---|---|---|---|---|
| r01 | 0 | 7 | **37** | 37 | 0 | 0 | 0 | 0 | 18 s | `f5b-regA-lista7-r01.log` |
| r02 | 0 | 7 | **37** | 37 | 0 | 0 | 0 | 0 | 18 s | `f5b-regA-lista7-r02.log` |
| r03 | 0 | 7 | **37** | 37 | 0 | 0 | 0 | 0 | 18 s | `f5b-regA-lista7-r03.log` |
| r04 | 0 | 7 | **37** | 37 | 0 | 0 | 0 | 0 | 19 s | `f5b-regA-lista7-r04.log` |
| r05 | 0 | 7 | **37** | 37 | 0 | 0 | 0 | 0 | 18 s | `f5b-regA-lista7-r05.log` |

### F5.2 — Registro B (lista-6, `pendencias.md`), N=5 — **medição do sucessor**

| Rodada | ec | arquivos | tests | pass | fail | skipped | XX000 | unhandledRejection | dur. | log |
|---|---|---|---|---|---|---|---|---|---|---|
| r01 | 0 | 6 | **37** | 37 | 0 | 0 | 0 | 0 | 16 s | `f5b-regB-lista6-pend-r01.log` |
| r02 | 0 | 6 | **37** | 37 | 0 | 0 | 0 | 0 | 16 s | `f5b-regB-lista6-pend-r02.log` |
| r03 | 0 | 6 | **37** | 37 | 0 | 0 | 0 | 0 | 17 s | `f5b-regB-lista6-pend-r03.log` |
| r04 | 0 | 6 | **37** | 37 | 0 | 0 | 0 | 0 | 17 s | `f5b-regB-lista6-pend-r04.log` |
| r05 | 0 | 6 | **37** | 37 | 0 | 0 | 0 | 0 | 17 s | `f5b-regB-lista6-pend-r05.log` |

### F5.3 — Registro C (lista-6, plano do ciclo 5 §0.a), N=5 — **medição do sucessor**

| Rodada | ec | arquivos | tests | pass | fail | skipped | XX000 | unhandledRejection | dur. | log |
|---|---|---|---|---|---|---|---|---|---|---|
| r01 | 0 | 6 | **37** | 37 | 0 | 0 | 0 | 0 | 16 s | `f5b-regC-lista6-c5-r01.log` |
| r02 | 0 | 6 | **37** | 37 | 0 | 0 | 0 | 0 | 16 s | `f5b-regC-lista6-c5-r02.log` |
| r03 | 0 | 6 | **37** | 37 | 0 | 0 | 0 | 0 | 17 s | `f5b-regC-lista6-c5-r03.log` |
| r04 | 0 | 6 | **37** | 37 | 0 | 0 | 0 | 0 | 17 s | `f5b-regC-lista6-c5-r04.log` |
| r05 | 0 | 6 | **37** | 37 | 0 | 0 | 0 | 0 | 17 s | `f5b-regC-lista6-c5-r05.log` |

### F5.4 — A passada do ANTECESSOR, comparada (não herdada)

Os logs e o TSV do antecessor sobreviveram à queda dele e estão íntegros no scratchpad
(`f5-resultados.tsv`, 10 linhas). Comparação célula a célula com a minha passada:

| Lista | Passada | N | ec=0 | `tests` | XX000 | unhandled | Divergência |
|---|---|---|---|---|---|---|---|
| lista-7 | antecessor (`f5-lista7-r01..r05`) | 5 | 5/5 | 37 em 5/5 | 0 | 0 | — |
| lista-7 | **sucessor** (`f5b-regA-*`) | 5 | 5/5 | 37 em 5/5 | 0 | 0 | **nenhuma** |
| lista-6 | antecessor (`f5-lista6-r01..r05`) | 5 | 5/5 | 37 em 5/5 | 0 | 0 | — |
| lista-6 | **sucessor** (`f5b-regB-*` + `f5b-regC-*`) | 10 | 10/10 | 37 em 10/10 | 0 | 0 | **nenhuma** |

**Divergência entre as duas passadas: ZERO.** A conclusão do antecessor, que chegou sem tabela,
**é confirmada por re-execução independente** — e passa a valer por esta passada, não pela dele.
**N acumulado de mesma forma e mesmo head: lista-7 = 10 · lista-6 = 15.** Publico como medição de
record os meus N=5 por registro (o mandato e o plano §3.2 pedem N=5); o acumulado é dito porque
**rodada não se descarta**, nem a de quem morreu.

### F5.5 — Achado de forma: **0 `XX000` e 0 queda de denominador em 25 rodadas**

Em nenhuma das 15 rodadas minhas (nem nas 10 do antecessor) apareceu `XX000` ou
`unhandledRejection`, e o denominador **não caiu** uma vez sequer. Pelo §3.2 do plano, `XX000` ou
queda de denominador **seria ACHADO** (a classe teria voltado). **Não é o caso** — mas o que isto
prova tem tamanho declarado, e está dito no §V.4: rodadas **sequenciais, sem contenção, numa
máquina**, contra uma classe que é fenômeno de **concorrência**. Verde aqui **não é** prova de
extinção da classe; é ausência sob ESTA forma, com este N.

## §R · Reconciliação aritmética F4 × F5

**O que esta seção decide** (plano §3.2, "Reconciliação aritmética"): *a soma dos denominadores F4
dos membros tem de bater com o denominador F5 da lista. Se não bater, o paralelismo do runner
interfere na contagem — achado próprio, com N elevado a 10 na lista divergente antes de publicar.*

### R.1 — Os denominadores por arquivo, **re-conferidos pelo sucessor** (N=2, sobre o N=3 da F4)

Antes de somar, re-executei os **8** candidatos sozinhos, mesma forma da F4, **N=2 cada**
(`f4b-resultados.tsv`, logs `f4b-<slug>-r0N.log`), para que a aritmética do §R repouse em execução
minha e não em número herdado:

| Arquivo | F4 (antecessor, N=3) | **F4b (sucessor, N=2)** | N acumulado | bate? |
|---|---|---|---|---|
| `tests/audit-security.test.ts` | 1 · 1 · 1 | **1 · 1** | 5 | ✅ |
| `tests/auth-identity-backfill-db.test.ts` | 6 · 6 · 6 | **6 · 6** | 5 | ✅ |
| `tests/auth-identity-link-events-db.test.ts` | 5 · 5 · 5 | **5 · 5** | 5 | ✅ |
| `tests/auth-identity-links-db.test.ts` | 15 · 15 · 15 | **15 · 15** | 5 | ✅ |
| `tests/auth-identity-role-real-db.test.ts` | 10 · 10 · 10 | **10 · 10** | 5 | ✅ |
| `tests/impound-process-checklist-link-schema.test.ts` | 5 · 5 · 5 | **5 · 5** | 5 | ✅ |
| `tests/rls-tenant-isolation.test.ts` | 1 · 1 · 1 | **1 · 1** | 5 | ✅ |
| `tests/vehicle-identity-schema.test.ts` | 9 · 9 · 9 | **9 · 9** | 5 | ✅ |

**16 rodadas, 16 com ec=0, fail=0, skipped=0, XX000=0, denominador CONSTANTE em todas.** Zero
divergência contra a F4. Os oito denominadores estão agora medidos em **N=5 cada**, mesma forma,
mesmo head — e o gatilho de N=5 do §3.2 (variação entre rodadas) **nunca disparou**, porque variação
nunca houve.

### R.2 — A conta, executada (`recon.mjs`, saída transcrita)

```
B === C (conjunto identico)? true
A === B ? false
soma A = 37 | soma B = 37 | soma C = 37

comuns(5) = audit-security(1) + auth-identity-backfill-db(6) + impound-process-checklist-link-schema(5) + rls-tenant-isolation(1) + vehicle-identity-schema(9) = 22
so em A(2)  = auth-identity-link-events-db(5) + auth-identity-role-real-db(10) = 15
so em B(1)  = auth-identity-links-db(15) = 15
coincidencia exata? so-em-A == so-em-B : true
```

### R.3 — O veredito da reconciliação: **BATE nas duas listas**

| Lista | Soma dos denominadores F4/F4b (por arquivo) | Denominador F5 (lista inteira, executada) | Reconcilia? |
|---|---|---|---|
| **lista-7** (registro A) | `1+6+5+10+5+1+9` = **37** | **37** em 5/5 (e 5/5 do antecessor) | ✅ |
| **lista-6** (registros B ≡ C) | `1+6+15+1+9+5` = **37** | **37** em 10/10 (e 5/5 do antecessor) | ✅ |

**Consequência que o plano §3.2 mandava tirar:** a soma por arquivo bate com a execução da lista
inteira nas **duas** listas. Logo **o runner NÃO altera a contagem ao agregar arquivos** — o
paralelismo dele não interfere no denominador. Não houve divergência, portanto **não se aplica** a
escalada a N=10 que o plano reservava para esse caso.

### R.4 — A pergunta do mandato: as listas são contraditórias ou são partições?

**São partições diferentes do mesmo total. Não são contraditórias.** A conta mostra exatamente
onde elas se separam e por que o total sobrevive:

- **22 testes são COMUNS** — os 5 arquivos que as duas listas compartilham.
- A lista-7 completa os 15 restantes com **dois** arquivos: `auth-identity-link-events-db` (5) +
  `auth-identity-role-real-db` (10) = **15**.
- A lista-6 completa os mesmos 15 restantes com **um** arquivo: `auth-identity-links-db` (**15**).
- `5 + 10 == 15` — **coincidência aritmética exata**, confirmada por execução (`coincidencia exata?
  … : true`), e é ela, sozinha, que faz as duas listas fecharem o mesmo 37 com contagens de arquivos
  diferentes (6 e 7).

A hipótese §2.2 do plano (rotulada como hipótese até a sonda) previu precisamente isto sob a
condição *"se `auth-identity-links-db` medir 15"*. Mediu — **5 rodadas, 15 em todas**. A hipótese
está **confirmada por execução**, não por leitura.

### R.5 — Enumeração exaustiva (o que derruba a sentença do `status-geral.md`)

A sentença da l.33 é uma afirmação de **impossibilidade** — *"nenhuma combinação de 6 que contenha
as vítimas nomeadas fecha 37"* — e afirmação de impossibilidade se derruba por **exibição de
contraexemplo**. As "vítimas nomeadas" são as 4 medidas na bateria pré-correção e nomeadas em
`pendencias.md` l.3446-3448 e no §0.a do plano do ciclo 5: **`rls-tenant-isolation` (3×)** e
**`auth-identity-backfill-db`** (via `createEphemeralRole`, 1× — as duas que **TOMAVAM** o lock),
**`audit-security`** (3×) e **`vehicle-identity-schema`** (3×). Somam `1+6+1+9` = **17**.

Enumerando **todos** os subconjuntos de tamanho 6 dos 8 candidatos que contenham as 4 vítimas e
somem 37 (`recon.mjs`, saída transcrita):

```
combinacoes de 6 (dos 8) que contem as 4 vitimas E fecham 37: 2
  - [outra] audit-security(1) + auth-identity-backfill-db(6) + auth-identity-link-events-db(5) + auth-identity-links-db(15) + rls-tenant-isolation(1) + vehicle-identity-schema(9)
  - [= a lista-6 dos registros B/C] audit-security(1) + auth-identity-backfill-db(6) + auth-identity-links-db(15) + impound-process-checklist-link-schema(5) + rls-tenant-isolation(1) + vehicle-identity-schema(9)
```

**Não é uma que fecha 37: são DUAS.** E uma delas **é literalmente a lista-6** dos registros B e C —
a que `pendencias.md` mediu em N=13 e o plano do ciclo 5 declara como forma do D29, e que eu acabei
de executar **10/10 com `tests=37`**. A sentença de impossibilidade está **derrubada por execução**,
com contraexemplo executado, não só por aritmética de papel.

## §V · Veredito, errata e o que a medição NÃO cobre

### V.1 — Veredito, em uma frase por item

1. **Quantas listas são, de fato: DUAS** — em **três** registros. Os registros **B**
   (`pendencias.md` l.3440-3448) e **C** (`B-O6R-02-ciclo5-plano.md` §0.a) são o **mesmo conjunto**,
   provado por comparação (`B === C → true`); o registro **A** (`status-geral.md` l.33) é o outro.
2. **Quais fecham 37: as DUAS.** lista-7 = 37 em **10 rodadas** (5 minhas + 5 do antecessor);
   lista-6 = 37 em **15 rodadas** (10 minhas + 5 do antecessor). Nenhuma rodada vermelha, nenhuma
   queda de denominador, 0 `XX000`.
3. **Não são contraditórias — são partições diferentes do mesmo total** (§R.4), unidas por uma
   coincidência aritmética exata: `link-events(5) + role-real(10) == links(15)`.
4. **As sete contagens por arquivo do `status-geral.md` l.33 estão TODAS corretas** — conferidas uma
   a uma, N=5 por arquivo (§F4 + §R.1).
5. **A sentença de impossibilidade da l.33 é FALSA** — e é o único conteúdo falso encontrado no
   registro A. Derrubada por contraexemplo executado; e os contraexemplos são **dois** (§R.5).
6. **A pendência `P-REG-BATERIA-BARATA-DUAS-LISTAS` está descrita de forma que a medição NÃO
   sustenta** — ver V.2. **Muda de natureza:** não é conflito entre registros a arbitrar, é uma
   sentença falsa a corrigir num deles.

### V.2 — ERRATA: onde o registro não sobrevive à execução

> **Regra §A2 observada:** o que segue é **errata**, para ser **apensada com data** pelo bloco que
> tiver o caminho no escopo. **Nenhum texto original é apagado ou reescrito** — e o 4a **não editou
> nenhum dos arquivos abaixo** (§5.2: o 4a não conserta nada, e `status-geral.md`/`pendencias.md`
> não estão no mandato desta medição, que toca **apenas** este diário).

**E-1 · `agent-orchestration/docs/status-geral.md` l.33 — sentença falsa.**
Texto atual, transcrito: *"São **sete** arquivos, não seis — o rótulo anterior dizia «6 arquivos
escritores de catálogo» e **nenhuma combinação de 6 que contenha as vítimas nomeadas fecha 37**."*
(as aspas simples do original foram trocadas por «» só nesta transcrição, para não confundir a
citação com o texto do diário; o original permanece intocado).
**A segunda metade é falsa por execução.** Existem **duas** combinações de 6 que contêm as 4 vítimas
nomeadas e fecham 37, e **uma delas é a lista-6 que `pendencias.md` e o plano do ciclo 5 já
declaravam** — medida por mim em 10/10 rodadas com `tests=37` (§F5.2/F5.3, §R.5). A primeira metade
(*"são sete arquivos, não seis"*) também não se sustenta como **exclusão**: sete é *uma* forma
válida, não *a* forma. As **contagens por arquivo da mesma linha estão todas certas** (§R.1) — o
defeito é a inferência, não os números.

**E-2 · a premissa de reprodutibilidade da mesma l.33 — insuficiente, e este é o achado que
interessa ao ciclo 5.**
A linha afirma que a lista *"é parte da FORMA e sem a qual o denominador 37 não é reproduzível por
terceiro"*. A execução mostra o problema **maior**: **o denominador 37 não IDENTIFICA a lista.** Duas
listas diferentes, com **contagens de arquivos diferentes** (6 e 7), produzem **o mesmo 37**. Um
terceiro a quem se diga apenas *"deu 37"* **não consegue inferir qual bateria rodou** — e o critério
do **D29** do plano do ciclo 5 (*"denominador idêntico"*) é, sozinho, **insuficiente** para provar
que a mesma forma foi reproduzida.
**O discriminador medido é o PAR `(arquivos, testes)`**, que o próprio runner já imprime no sumário:
`(6, 37)` para a lista-6 · `(7, 37)` para a lista-7. O par **melhora** sobre o total — separa a
lista-6 da lista-7, que o `37` sozinho confunde.

> #### ⚠ E-2 · ERRATA DA ERRATA (2026-08-31, pós-junta do #365 — achado **C2-A1**, gravidade `atenção`, escopo `dentro-do-bloco`)
>
> **A conclusão original desta E-2 dizia:** *"Publicar/conferir o par — e não só o total — é o que
> torna a bateria barata reproduzível por terceiro."* **Essa frase é FALSA e está retirada.** A
> medição que a antecede continua **inteira e correta** (o `37` sozinho não identifica a lista; o par
> discrimina a lista-6 da lista-7); errado era o **alcance** que a conclusão deu ao par.
>
> **Contraexemplo, executado pela cadeira C2 da junta** (`02-medicoes-2-3-voto.json`, item
> `C2-1e`/achado `C2-A1`): **TRÊS listas de 6 arquivos distintas produzem `(6, 37)`** — enumeradas
> sobre os denominadores por arquivo que a própria C2 mediu, e as três **EXECUTADAS** por ela
> (`lista6` 3/3 · `lista6alt` 3/3 · `lista6alt2` 2/2), imprimindo as três exatamente
> `6 arquivo(s) - 37 teste(s)`. Um terceiro a quem se diga `(6, 37)` **continua sem saber qual das
> três rodou**.
>
> **O contraexemplo já estava impresso NESTE documento, três parágrafos acima.** O §R.5 enumerou a
> segunda combinação de 6 que fecha 37 e a rotulou `[outra]` — e o laço com esta E-2 não foi
> fechado. (O §R.5 enumera **sob o filtro** "contém as 4 vítimas nomeadas" e acha **2**; a C2
> enumerou **sem** esse filtro e achou **3**. As duas contagens são compatíveis: `2 ⊂ 3`. O filtro
> não salva a frase — bastava **uma** segunda lista para derrubá-la, e o próprio §R.5 exibiu essa
> segunda.)
>
> **Conclusão corrigida:** o par `(arquivos, testes)` é **NECESSÁRIO e INSUFICIENTE**. Necessário
> porque o total sozinho nem sequer fixa a cardinalidade; insuficiente porque a cardinalidade mais o
> total ainda admitem ≥ 3 listas distintas. **A receita reprodutível por terceiro exige NOMEAR os 6
> arquivos** — que é exatamente o que o **§V.3 deste mesmo documento já faz**, com os seis nomes, o
> par, o N, a forma, a versão do Node e o head.
>
> **Para o ciclo 5, sem ambiguidade: o critério do D29 é o §V.3 — a lista NOMEADA —, NÃO esta E-2.**
> A observação **O-2** (que mandava apensar a E-2 ao critério do D29) fica **emendada**: o que se
> apensa ao D29 é o **§V.3**. Apensar a E-2 como estava daria ao D29 um critério que **não pina a
> forma**, que é precisamente o defeito que o D29 existe para fechar.
>
> Correção aplicada por agente que **não** achou o defeito (§C7.4-bis); a medição não foi tocada.

**E-3 · nada a corrigir em `pendencias.md` l.3440-3448 nem no ciclo 5 §0.a.** As duas declarações da
lista-6 sobrevivem à execução: lista correta, denominador 37 correto, forma declarada. Ficam
**registradas como a mesma lista** (não como dois registros independentes que se confirmam) — B ≡ C
é replicação, e replicação não é corroboração.

### V.3 — A linha que o ciclo 5 pediu (receita de reprodutibilidade)

> **A forma do D29 é a lista-6** — `tests/audit-security.test.ts` · `tests/auth-identity-backfill-db.test.ts` ·
> `tests/auth-identity-links-db.test.ts` · `tests/rls-tenant-isolation.test.ts` ·
> `tests/vehicle-identity-schema.test.ts` · `tests/impound-process-checklist-link-schema.test.ts` —
> com denominador **`(6 arquivos, 37 testes)`**, medido em **N=5 por lista (sucessor) + N=5 (antecessor)
> + N=3 e N=2 por arquivo**, forma: `node scripts/run-backend-tests.mjs <lista>`, `CORE_SAAS_PERSISTENCE`
> **não exportada**, `DATABASE_URL`/`REDIS_URL` para cluster descartável próprio com **103 migrations**,
> Node **v20.19.5**, rodadas **sequenciais**, head **`116aa46`**.
> **A lista-7 é forma alternativa EQUIVALENTE em total** — `(7 arquivos, 37 testes)` — **e não
> intercambiável**: mede arquivos diferentes. Conferir **o par**, nunca só o 37.

Canônica recomendada: **a lista-6**, porque é a que o plano do ciclo 5 já declara no §0.a, a que
`pendencias.md` mediu em N=13, e a que tem o vermelho-controle histórico (5/13 e 7/13 pré-correção)
— trocar a canônica agora invalidaria a comparabilidade com esse vermelho-controle.

### V.4 — O que esta medição **NÃO** cobre (dito com todas as letras, §4.7 do plano)

1. **Não mede a base viva do dono.** `erp-postgres`/`erp-redis` não receberam **nenhum comando, nem
   leitura** (§5.2). Tudo aqui é do cluster descartável `san2-4a-pg` (:56432).
2. **Não re-verifica os vermelhos históricos.** O `7/13` (`pendencias.md`) e o `5/13` mais a queda
   `37→32` (ciclo 5 §0.a) são **CARREGADOS** — de outras portas (:55950, :55801), outro cluster
   (`arnes-dev-pg`), outro head, **pré-correção do arnês**. Não os reproduzi e este bloco não podia.
3. **Não prova que a classe `XX000` está extinta.** 0/25 rodadas verdes aqui são **sequenciais, sem
   contenção, numa máquina**, contra um fenômeno de **concorrência**. Ausência sob esta forma não é
   ausência. O `N` e a forma estão declarados exatamente para que ninguém leia mais do que há.
4. **Não mede sob a forma dos jurados** (suíte inteira, máquinas deles), nem sob paralelismo do
   `node --test` entre arquivos além do que o runner já faz por padrão.
5. **Não audita se os 8 candidatos são o universo completo** de escritores de catálogo. Tomei como
   dado a **união das duas listas registradas**; se existir outro escritor fora dos dois registros,
   ele não entrou nesta conta.
6. **Não decide governança.** Qual lista vira canônica no registro, e quem apensa a errata E-1/E-2,
   **não é decisão do 4a** — é do 4b e da junta (§V.5).
7. **Não cobre os alvos 1 e 3** (`authority-portal`, `rls_test_`): este diário é a **medição 2** e
   só ela.

### V.5 — Observações para o **SAN2-4b** (achados, NÃO consertos — §0/§5.2)

O 4a **não corrigiu nada** e não vai corrigir. Registro o que a medição apontou, com dono sugerido:

| # | Achado | Onde | Sugestão de dono |
|---|---|---|---|
| **O-1** | Apensar **errata E-1** (sentença de impossibilidade falsa, com os 2 contraexemplos) | `agent-orchestration/docs/status-geral.md` l.33 | **SAN2-4b** |
| **O-2** *(emendada em 2026-08-31 pelo achado **C2-A1**)* | Apensar **errata E-2** (o 37 não identifica a lista). **O que se apensa ao critério do D29 é o §V.3 — a lista NOMEADA —, NÃO o par `(arquivos, testes)`:** o par é necessário e **insuficiente** (três listas de 6 distintas dão `(6, 37)`, executadas pela cadeira C2). Ver a *errata da errata* na E-2 | `status-geral.md` l.33 **e** o critério do **D29** no plano do ciclo 5 | **SAN2-4b** + junta do ciclo 5 |
| **O-3** | Registrar que **B ≡ C** (mesma lista em dois lugares) — replicação, não corroboração | `pendencias.md` (apenso na pendência) | **SAN2-4b** |
| **O-4** | `P-REG-BATERIA-BARATA-DUAS-LISTAS` **muda de natureza**: não há conflito a arbitrar; há **uma sentença falsa a corrigir**. Fecha por esta medição, com a errata como condição de fechamento | `pendencias.md` | **SAN2-4b** |

**Nenhum defeito de PRODUTO foi encontrado por esta medição** — os 8 arquivos passam, com
denominador estável, em 41 execuções (25 de lista + 16 por arquivo). O que a medição achou é
**defeito de REGISTRO**, e é `pre-existente` por construção: a sentença da l.33 é anterior a este
bloco, e o diff de código deste bloco é **vazio** (§6.1 do plano).

### V.6 — Fecho da medição 2

**`P-REG-BATERIA-BARATA-DUAS-LISTAS`: MEDIDA, com veredito.** As duas listas são válidas e fecham
37; a única afirmação que a execução derruba é a sentença de impossibilidade do `status-geral.md`
l.33; e a lição que o ciclo 5 leva é que **denominador igual não prova forma igual** — confira o par
`(arquivos, testes)`. Todos os números deste diário carregam **N, forma, env, Node, head e log
nomeado**; nenhum veio de `grep`; nenhuma rodada foi descartada; e a passada do antecessor foi
**re-executada e comparada**, não herdada.

---

## §T4 · Teardown (parte da medição, §3.4 — não cortesia)

`docker rm -f san2-4a-pg san2-4a-redis` executado ao fim da medição 2. Conferência transcrita:

```
$ docker ps -a --filter "name=san2-4a" --format "{{.Names}}"
(vazio)

$ docker ps
NAMES          PORTS                                         STATUS
erp-postgres   0.0.0.0:5432->5432/tcp, [::]:5432->5432/tcp   Up 2 days (healthy)
erp-redis      0.0.0.0:6379->6379/tcp, [::]:6379->6379/tcp   Up 2 days (healthy)
```

**Nenhum container `san2-4a-*` sobrou.** E o `Up 2 days (healthy)` de `erp-postgres`/`erp-redis` é a
prova de que a base viva **não foi tocada nem reiniciada** durante toda a medição (§5.2) — o uptime
atravessa o bloco inteiro.

**Estado da árvore ao fim:** head `116aa46` **inalterado**; `git status --porcelain` acusa **apenas**
este diário (untracked, **não commitado** — o mandato proíbe commit); diff de código contra a
working tree **e** contra `main...HEAD` em `src tests scripts prisma frontend mobile portals .github
package.json package-lock.json .claude/agents .agents Kpis` = **VAZIO** nas duas pontas;
`git diff --check` ec=0. **O 4a não consertou nada** (§0/§5.2).

**Limpeza §C5:** clusters descartáveis removidos (`san2-4a-pg`, `san2-4a-redis`); logs desta medição
(`f5b-*.log`, `f4b-*.log`, `recon.mjs`, `f5b-resultados.tsv`, `f4b-resultados.tsv`) permanecem no
**scratchpad da sessão**, que morre com o bloco — são a evidência nomeada que o §4.1 exige enquanto
a junta não votar. Nada rastreado foi apagado.
