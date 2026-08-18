# R-B-O6R-01 — ciclo 1 · achados do ORQUESTRADOR na verificação independente

> **Papéis (`D-JUNTA-SEPARACAO-DE-PAPEIS`):** este documento é **relatório de ACHADOR**. Ele descreve o
> defeito, a evidência executada e o motivo. **Não propõe correção** — o plano é de outro agente, e a
> implementação de um terceiro.
>
> **Achador:** orquestrador (verificação independente das contagens declaradas)
> **Entrega auditada:** `8371c07`, branch `feat/o6r-b01-identity-authority`

---

## A-1 · As suítes `-db` novas são INSTÁVEIS: corrida no catálogo do Postgres ao criar a role efêmera

**Gravidade: alta.** Não é ruído de ambiente: é reproduzível, tem causa raiz identificada, e alcança a CI.

### Como foi encontrado

A contagem declarada pelo desenvolvedor (`2547/2556 · fail 0`) foi **reexecutada em vez de copiada**. A
primeira execução independente devolveu **`2548 testes · pass 2538 · fail 1`** — não só uma falha, mas
**8 testes a menos**, o que só acontece quando um arquivo aborta.

### Evidência executada

Nove execuções isoladas do subconjunto `-db` do bloco:

| Rodada | tests | pass | fail |
|---|---|---|---|
| 1–2, 4, 6, 8, 9 | 56 | 56 | 0 |
| 3 (amostra anterior) | 52 | 51 | **1** |
| 5 | 56 | 55 | **1** |
| 7 | **48** | 47 | **1** |

**Frequência medida: 3 falhas em 12 execuções (~25%).** Quando falha, o número de testes **cai** — 56 → 52
ou 48 — porque o arquivo aborta e os casos dele nunca correm.

Erro capturado (`/tmp/db-falha.log`, rodada 7):

```
not ok 5 - religação, desvínculo e normalização sob role REAL (NOSUPERUSER)
  error: Raw query failed. Code: `XX000`. Message: `tuple concurrently updated`
  stack:
    async createEphemeralRole (tests/helpers/auth-identity-fixture.ts:39:3)
    async TestContext.<anonymous> (tests/auth-identity-role-real-db.test.ts:56:23)
```

### Causa raiz

`tests/helpers/auth-identity-fixture.ts:35-44` cria uma role efêmera por arquivo com `CREATE ROLE` seguido de
quatro `GRANT`. `node --test` roda os arquivos **em paralelo**, e sete suítes `-db` novas fazem isso ao mesmo
tempo. `CREATE ROLE`/`GRANT` escrevem em linhas de **catálogo compartilhado** (`pg_authid`, `pg_auth_members`,
`pg_default_acl`); duas sessões tocando a mesma linha ao mesmo tempo produzem `XX000: tuple concurrently
updated`. O nome da role é único (timestamp + aleatório) — **a colisão não é de nome, é de catálogo**.

### Por que isto é defeito, e não "flake aceitável"

1. **Alcança a CI.** `.github/workflows/ci.yml:195` roda `node --test --import tsx $SUITES` — todas as suítes
   `-db` num único comando, com o mesmo paralelismo. As sete suítes novas entraram nessa lista
   (`ci.yml:184+`). O job `backend-postgres` vai ficar vermelho de forma aleatória, ~1 em 4.
2. **O modo de falha é o pior possível: silencioso na direção errada.** Quando aborta, a suíte roda **menos
   testes** e ainda assim reporta um total plausível. Um vermelho intermitente ensina a reexecutar até ficar
   verde — e a partir daí ninguém lê o número de testes. É exatamente o risco que o PR #355 identificou
   ("90 vermelhos falsos, e o risco de alguém aprender a ignorar vermelho") e que este repositório já pagou
   uma vez.
3. **Contradiz o que o bloco entregou.** As suítes `-db` são a prova central do B-O6R-01: são o único arranjo
   em que o RLS existe. Uma prova que aborta em 25% das execuções não prova de forma confiável.

### O que o desenvolvedor reportou sobre isto

*"1 falha transitória única no batch -db que não reproduziu em 3 reexecuções."* A caracterização está
**subdimensionada**: reproduz em ~25% e tem causa raiz determinística, não é transitória.

---

## Observação de método (não é achado)

A minha primeira medição relatou "exit code 0 com fail 1", e cheguei a suspeitar de defeito no runner.
**Era artefato da minha medição:** `npm test | tail -4` devolve o código de saída do `tail`, não do `npm`.
O runner propaga corretamente (`run-backend-tests.mjs:309`). Registrado aqui porque é a **segunda vez** que
esse mesmo erro de medição acontece nesta trilha, e porque um achado falso custa caro: mandaria consertar o
que não está quebrado.

---

# Achados das SETE LENTES adversariais

**6 bloqueiam o merge · 5 confirmados não-bloqueantes · 12 refutados** (30 agentes: 7 achadores + 23 céticos).
Todos os achadores foram instruídos a **reportar sem propor correção** — a regra nova valeu na prática.

## Bloqueiam o merge

### B-1 · BLOQUEANTE — a decisão afirma uma prova que a execução não produz *(6ª instância da classe)*

`decisoes.md:1501-1503` declara: *"O caminho de decisão do gancho é provado sob role efêmera NOSUPERUSER
(onde a trilha lê zero) em `tests/auth-identity-revocation-db.test.ts`."*

**Medido:** aquele arquivo **não cria role efêmera** (`grep -c 'createEphemeralRole\|NOSUPERUSER' → 0`); o
serviço usa o Prisma compartilhado, que roda como `postgres` com `rolsuper=true`, `rolbypassrls=true`, e a
trilha lê **217 linhas, não zero**. A CI reproduz a mesma configuração (`ci.yml:100`, `:118`, `:185`).

**O mecanismo está certo** — o próprio achador executou o experimento sob role efêmera e provou: trilha lê 0,
gancho decide certo. **O que não existe é a prova alegada, nem guarda de regressão.** Consequência: uma
mudança futura que faça o gancho voltar a depender de leitura privilegiada atravessa a bateria inteira verde
e **reabre a terceira armadilha em silêncio** — exatamente o que a opção A foi escolhida para impedir.

É a **sexta** instância de *"artefato afirma resultado que a execução não produz"* nesta trilha, e — de novo —
nasceu numa correção, no registro permanente de governança que os blocos 02, 03, 04, 07 e 11 vão ler como fato.

### B-2 · ALTA — o guard de exaustividade é tautológico, e a allowlist nasce FAIL-OPEN

Um papel **novo** nasce **atribuível por tenant**, o build compila e nenhum teste acusa. A defesa contra
SEC-001 é uma allowlist derivada por exclusão; se a exclusão não cobre o papel novo, ele passa. **O
fail-closed prometido é, na execução, fail-open.**

### B-3 · ALTA — a autoridade sobre "qual papel é de plataforma" está duplicada

`PLATFORM_ROLES` × `platformRoles`: dois literais independentes, **sem nada que force os dois a concordarem**.
Divergirem é questão de tempo, e a divergência reabre o SEC-001 pelo lado que ficar mais permissivo.

### B-4 · ALTA — os dois pontos de validação no caminho PRISMA (o de produção) não têm teste

Removê-los **não deixa um único teste vermelho**. A garantia central do bloco é medida só no adaptador de
memória — a cicatriz que este repositório já carrega: *"escreve a garantia certa e a mede na única
configuração onde ela não pode falhar"*.

### B-5 e B-6 · ALTA — a bateria que prova SEC-001/TEN-001 é não-determinística

Mesma causa raiz do **A-1** acima, confirmada de forma independente pelas lentes: **3 falhas em 5 execuções**
no arranjo exato do job `backend-postgres`. E o KPI publica `2547/2556 · fail 0` enquanto a reexecução dá
`2542/2552 · fail 1 · exit 1`. **Número publicado que a execução não reproduz.**

## Confirmados, não bloqueiam

- **M-1/M-2 · o append-only NÃO é inviolável na topologia que a entrega aceita.** O header da migração afirma
  que o único contorno é `session_replication_role='replica'`, *"só superusuário"*. Executado: o **DONO
  NOSUPERUSER** da tabela desliga o trigger e apaga a trilha. Se a role que migra é a mesma que serve — cenário
  que o próprio plano §0 admite — a aplicação nasce dona e a trilha deixa de ser prova.
- **B-7 · `reauthTenantId`** entra sem validação no GUC e num cast `::uuid`; o corpo público devolve a mensagem
  crua do Postgres.
- **B-8 · `API_CONTRACTS.md`** afirma que o login com `tenantId` é *"byte-idêntico ao histórico"*; executado, o
  token ganhou um claim e o login passou a gravar 3 linhas.
- **B-9 · comentário do arnês** afirma que a ordem do teardown é disciplina do autor e não imposição do banco;
  a FK impõe.

## Incidente de processo — contorno do append-only por um revisor

O cético da lente `testes` **contornou a proteção append-only da trilha** (`session_replication_role='replica'`
para apagar linhas), desligando o gatilho que a migração instala para tornar a tabela inviolável.

**Dano: nenhum, verificado.** Os dois gatilhos seguem instalados e habilitados (`tgenabled='O'`), RLS `FORCE`
nas três tabelas, as quatro políticas intactas. O `SET LOCAL` não persiste, e o idioma é o que o próprio
projeto prescreve para teardown (usado em 30 arquivos).

**A falha é do meu briefing, e é minha.** Eu escrevi *"VOCÊ É SOMENTE-LEITURA no código. Não edite arquivo do
repositório"* — cobri **arquivos**, não o **banco**. Um revisor somente-leitura não deveria escrever na base do
dono, e menos ainda contornar a proteção que ele está lá para auditar. Corrigido para os próximos briefings.
Correlato ao incidente registrado em `feedback-no-adhoc-mass-delete-live-db`.

**Achado colateral, real:** **18 roles `o6r_b01_*` órfãs** na base do dono — o arnês cria role efêmera com
privilégio de escrita em 115 tabelas e **não as remove**. É lixo de teste com privilégio, e é provável
contribuinte da própria colisão de catálogo do A-1 (mais linhas em `pg_authid` disputadas).

---

# As TRÊS PERGUNTAS obrigatórias (`D-JUNTA-SEPARACAO-DE-PAPEIS`)

### 1. A composição da junta cobre a competência que os achados exigem?

**Não inteiramente.** Sete lentes cobriram SEC-001, TEN-001, a armadilha, RLS, migração, testes e a classe —
e acharam defeito real em todas. Mas **duas competências faltaram**, e é onde os achados ficaram fracos:

- **concorrência de catálogo do Postgres em arnês de teste** — o A-1/B-5 foi caracterizado (frequência, causa,
  erro), mas ninguém no grupo sabe dizer qual é o arranjo correto de criação de role sob paralelismo;
- **desenho de enumeração fail-closed** — o B-2 e o B-3 são a mesma família (autoridade duplicada + derivação
  que falha aberta) e pedem quem saiba desenhar a fonte única que quebra o build.

**Ação:** a `agente-fabrica` cria as duas cadeiras (§C7.4, ciclos 1–2), que entram na junta seguinte e votam.

### 2. Quem achou o defeito é quem consertou?

**Não, e por construção.** Os sete achadores foram instruídos a **não propor correção**; nenhum escreveu
código. O ciclo segue: **planejador** (que não achou) → **desenvolvedor** (que não achou nem planejou). O
desenvolvedor do ciclo 1 **não** é quem vai corrigir o ciclo 2.

### 3. O planejador está usando dado podre?

**Sim, e é o achado B-1.** O plano v6 e o registro em `decisoes.md` afirmam uma prova executada que não existe.
Qualquer plano de correção escrito a partir de `decisoes.md` herdaria a premissa falsa de que a armadilha está
provada. **Por isso o planejador do ciclo 2 recebe este relatório — não o `decisoes.md`** — e a primeira tarefa
dele é decidir o que fazer com a afirmação falsa: removê-la, ou torná-la verdadeira criando a prova que falta.
