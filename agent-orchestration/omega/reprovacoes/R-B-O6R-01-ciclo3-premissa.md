# R-B-O6R-01 · ciclo 3 — a premissa reaberta, e a decisão de escopo

> §C7.4: no ciclo 3 o crítico **reabre a premissa desde o objetivo**. Ele achou e enunciou propriedades;
> **não escreveu correção**. A decisão de escopo abaixo é do orquestrador, e está registrada porque muda a
> forma da entrega.
>
> PD com **9 fontes** (3 primárias) registrado em `docs/omega-pd.md` → `PD-O6R-B01-ISOLAMENTO`.

## O veredito do crítico: o defeito é de ARRANJO, e todo lock é remendo

Dois ciclos trataram isto como problema de sincronização. A pergunta que faltava era se suítes que criam
roles, escrevem catálogo e rodam backfill sobre a base inteira **deveriam estar num lote paralelo contra um
banco compartilhado**.

### A prova que dispensa vermelho

Sonda **somente-leitura** executando só o `SELECT` do CTE `missing` do backfill, classificando o alvo por dono:

| Arranjo | Amostras | Instantes com linha de TERCEIRO no alvo | Pico |
|---|---:|---:|---|
| lote dos 23 (`backend-postgres`) | 6.659 | **2.589 — 38,9%** | 22 linhas, **100% de terceiros** |
| suíte inteira, 246 arquivos (`backend`) | 9.206 | **934 — 10,1%** | 16 linhas, de **≥8 suítes** |

*"Escreve fora do próprio escopo"* deixa de depender de um vermelho ocasional: é o **conjunto-alvo do
statement**, medido.

### O dano é PERMANENTE, não flake

`auth_identity_link_events` na base do dono: **508 linhas, 231 (45,5%) apontando para organização que não
existe mais** — e as 231 são todas `event='backfill'`, zero de `religacao`/`desvinculo`. Nas 12 rodadas do
crítico: 12 linhas criadas, **12 órfãs (100%)**, ≈1 linha indelével por rodada.

**A tabela é append-only por trigger: nenhum teardown a conserta, por desenho.** O artefato que este bloco
criou para ser inviolável está **45% preenchido por escrita fora de escopo**.

### Uma terceira causa, ANTERIOR ao bloco

`tests/checklist-applicability-prisma-db.test.ts:355/373` faz `ALTER TABLE … RENAME COLUMN` sobre tabela
**compartilhada**, dentro do lote, enquanto duas suítes irmãs do **mesmo lote** usam essa tabela. Medido:
19.081 amostras, **6 janelas de 17–20 ms em que a coluna não existia** (`42703`), ≈1 por rodada.

### Seis prefixos de role; o varredor conhece um

| Prefixo | Toma o lock? | Varrido? | Órfãs vivas |
|---|---|---|---:|
| `o6r_b01_` | **sim** | **sim** | 0 |
| `rls_test_` | **sim** | não | **68, todas com LOGIN** |
| `o6r_clone_owner_` | não | não | 5 |
| `vid_link_rls_` | não | não | 1, com LOGIN |
| `audit_rls_` · `vid_rls_test_` | não | não | 0 |

**81 roles não-sistema vivas, 74 com LOGIN, até 460 privilégios de tabela cada.**

### O plano vinculante contém a contradição que gerou a caçada

O v6 §7 **exige** role efêmera `NOSUPERUSER` — que só existe mudando catálogo —, proíbe `DISABLE TRIGGER`
justamente por *"catálogo global + paralelismo do `npm test`"*, e na linha 277 afirma **"nenhuma suíte muda
catálogo"**. Ao pé da letra, falsa. **E foi essa leitura que o desenvolvedor do ciclo 2 tinha diante de si
quando escreveu "quatro escritores".** O plano previu este modo de falha na mesma frase em que o proibiu.

### Honestidade do próprio crítico

Ele **não reproduziu o veto**: 12/12 verde, zero `XX000`/`23503`/`23505`. E nomeia a provável razão — **ele
não rodou `db:seed`; a cadeira rodou**. Não mediu a CI, não mediu o custo real das alternativas, não
discriminou a origem das 68 roles. Diz isso antes de qualquer conclusão.

---

## DECISÃO DE ESCOPO (orquestrador)

O crítico recomendou **dividir a entrega**. Adoto **em parte**, e a diferença importa:

**O que FICA no B-O6R-01 — porque o bloco introduziu:**
1. o backfill sem escopo (`auth-identity-backfill-db.test.ts`) — **nasceu aqui**;
2. o quinto escritor fora do lock (`auth-login-candidates-fn-db.test.ts`) — **nasceu aqui**;
3. o prefixo `o6r_clone_owner_` sem varredor — **nasceu aqui**;
4. as **231 linhas órfãs** que este bloco despejou na própria trilha append-only.

Não é aceitável mergear um bloco que deixa a CI vermelha em 1 de 3 por defeito que ele **criou**, nem que
polui de forma **irreversível** o artefato que ele mesmo criou para ser prova.

**O que SAI para bloco próprio — porque antecede o bloco e é do repositório:**
- o `ALTER TABLE … RENAME COLUMN` sobre tabela compartilhada (trilha de checklists);
- os cinco prefixos de role pré-existentes sem varredor, e as **68 roles `rls_test_` com LOGIN**;
- a pergunta de arranjo (banco/cluster por worker) e o grau de paralelismo não declarado;
- a divergência entre as três formas de execução (`backend`, `backend-postgres`, `npm test` local).

**Motivo da divisão:** o B-O6R-01 fecha os dois piores achados de segurança da auditoria e já teve o desenho
ratificado. Carregar dentro dele a correção de um defeito de arranjo que ele não criou — que atinge seis
suítes de quatro trilhas e já reincidiu uma vez (`ci.yml:106-111` documenta a reincidência) — garante que
**cada ciclo reencontre um escritor novo**. O ciclo 4 acharia o sexto prefixo, ou o `RENAME COLUMN`, ou o job
`backend`, que ninguém mediu.

**Registrado como pendência:** `P-O6R-ARNES-ISOLAMENTO`, com o PD como entrada.

---

## As 9 propriedades que faltam (do crítico, verbatim em substância)

**P1** — o grau de paralelismo tem de ser **declarado**, não função do hardware (`availableParallelism()-1`;
7 nesta máquina, não fixado em lugar nenhum).
**P2** — statement sem cláusula de escopo **roda sozinho, ou não é o statement que está sendo provado**.
**P3** — objeto de **cluster** não pode ser criado por suíte que compartilha cluster, a menos que **todas** as
criadoras concordem num mecanismo único. Hoje **nada fica vermelho** quando uma suíte nova escreve catálogo
fora do lock.
**P4** — nenhuma suíte altera **esquema** de tabela compartilhada enquanto o lote roda.
**P5** — toda role efêmera é recolhida por varredor que conheça o prefixo, **inclusive quando o processo morre**.
**P6** — a escrita fora de escopo **não pode ser irreversível**.
**P7** — a prova é verde ou vermelha **pelo mesmo motivo nas três formas** em que roda.
**P8** — *"verde em N execuções"* não é prova sem **N e forma declarados**. Hoje: 12/12 verde na forma exata em
que a cadeira mediu 4/12 vermelho. **Nenhum dos dois números está errado — o arranjo é que não tem veredito.**
**P9** — o plano não afirma propriedade que a entrega não tem (a frase *"nenhuma suíte muda catálogo"*).

## O que a pesquisa fecha

**Nenhuma técnica isolada cobre as três classes.** Transação-com-rollback não serve a nada que este bloco
prova. Schema-por-worker não isola `pg_authid` nem alcança `public.users` literal. Banco-por-worker resolve
`23503`/`23505` e **não** resolve o `XX000` — catálogo de role é de **cluster**. Só cluster/contêiner por
worker isola catálogo. E o advisory lock é, na palavra da fonte primária, um *workaround* — que falha
exatamente pelo lado que a junta pegou: **quem não sabe que deveria tomá-lo.**
