# PLANO DE CORREÇÃO — B-O6R-01 · ciclo 2 · v1

**Papel:** planejador (Fable — `D-PLANEJADOR-MODELO-FABLE`, obrigatório na revalidação de código corrigido).
**Entrada principal:** [`R-B-O6R-01-ciclo1.md`](../reprovacoes/R-B-O6R-01-ciclo1.md) — 6 bloqueantes, 5 confirmados não-bloqueantes.
**Entrega corrigida:** `8371c07`, branch `feat/o6r-b01-identity-authority`.

**Separação de papéis (`D-JUNTA-SEPARACAO-DE-PAPEIS`):** o planejador **não achou** nenhum destes defeitos e
**não implementa**. O implementador do ciclo 2 **não é** o do ciclo 1 e **não julga** achado.

**Este plano NÃO reabre desenho.** Nenhuma decisão fechada do v6 volta à mesa (identidade global, religação
neste bloco, Forma B, arbitragem do C6, reportado-nunca-contado). Ele corrige **prova, fonte única,
determinismo e honestidade de artefato**.

---

## §0. Disciplina, e o dado podre que este plano se recusa a herdar

Valem as quatro regras do §0 do v6. Rótulos: **[medido — R-ciclo1]** · **[medido — planejamento]** ·
**[condicional]** (duas pontas escritas) · **[não medido — medir na implementação]**.

Nenhuma frase deste plano afirma resultado de execução futura. Onde diz *"fica vermelho"*, há um **drill de
mutação** que o PR executa e anexa.

**Afirmações herdadas que o plano NOMEIA e nas quais NÃO se apoia:**

| # | Onde | Afirma | A execução produz |
|---|---|---|---|
| 1 | `decisoes.md:1501-1503` | o gancho é *"provado sob role efêmera NOSUPERUSER (onde a trilha lê zero)"* num teste nomeado | o teste **não cria role efêmera**; roda como `postgres`, trilha lê 217 linhas |
| 2 | `decisoes.md:1486-1487` · `migration.sql:40-42` | o trigger vincula **qualquer** role; contorno **único** = `replica`, só superusuário | o **dono NOSUPERUSER** desliga o trigger com `ALTER TABLE … DISABLE TRIGGER` |
| 3 | `API_CONTRACTS.md:130` | login com `tenantId` é **byte-idêntico** ao histórico | o token ganhou claim e o login grava 3 linhas |
| 4 | `Kpis/kpis-latest.json:30-33` | `2547/2556 · fail 0` | reexecução: `2542/2552 · fail 1 · exit 1` |
| 5 | `auth-identity-fixture.ts:14-16` | a ordem do teardown é disciplina do autor, não imposição do banco | fora do modo `replica`, a **FK `RESTRICT` impõe** |

---

## §1. Objetivo

Tornar verdadeiras as garantias que o bloco **afirma** e que a execução não produz:

**(a)** a prova da terceira armadilha sob role real **existe** e vira guarda de regressão ·
**(b)** a allowlist de papéis fica **fail-closed por construção**, com **uma** fonte de autoridade ·
**(c)** o caminho **Prisma** (produção) tem teste que morre se a validação sair ·
**(d)** a bateria `-db` fica **determinística** e o KPI publica número que reproduz ·
**(e)** os artefatos param de afirmar o que a execução desmente.

**Nenhum fluxo de produto muda.**

---

## §2. As correções — mecanismo e prova

### C1 · B-1 — a prova passa a existir; o registro vira errata

**Decisão: tornar a afirmação verdadeira criando a prova que falta** — não removê-la e esquecer. O mecanismo
está certo [medido — R-ciclo1: o achador executou sob role efêmera, trilha lê 0, gancho decide certo], e a
guarda de regressão é o que impede a armadilha de reabrir em silêncio.

1. Caso novo em **`tests/auth-identity-role-real-db.test.ts`** — e **não** na `revocation-db`: a role-real
   **já cria** a role efêmera, então a prova entra com **zero `CREATE ROLE` novo** (o contrário pioraria o A-1).
   Dirigindo o serviço com o client `NOSUPERUSER`: braço **(a)** vínculo `attached_via='religacao'` +
   identidade com 2+ vínculos → troca de senha → **desvincula** + sessões revogadas; braço **(b)** vínculo
   `'backfill'` → **não** desvincula + sessões revogadas. E, no mesmo caso, `SELECT count(*)` na trilha **pela
   conexão efêmera = 0** — a asserção que faz do teste uma guarda.
2. **Errata em `decisoes.md`**, citando arquivo + caso reais, com a nota: *"corrigido no ciclo 2: a prova
   citada não existia em `8371c07` (R-B-O6R-01-ciclo1, B-1)"*. Sem reescrita silenciosa (§A2). A frase só
   entra **depois** de o caso rodar verde.

**Drill 1:** trocar a fonte de decisão do gancho de `attached_via` para contagem na trilha → o braço (a)
**deve falhar** → restaurar. Saída anexada.

### C2 · B-2 + B-3 — enumeração fail-closed com FONTE ÚNICA

**O defeito nos dois lados:** derivação **por exclusão** (`catalog.ts:314-316`) faz papel novo cair
**atribuível** por omissão; o guard de tipo (`:323-331`) é **tautológico** — `TenantAssignableRole =
Exclude<Role, PlatformRole>` torna a partição verdadeira **por definição**, e não existe estado que a faça
falhar; e a autoridade está **duplicada** (`PLATFORM_ROLES` × o literal `platformRoles` de
`platform-permissions.ts:29`, que o v6 §9 mandava importar e a entrega não importou).

**Mecanismo — inverter a direção da derivação:**

1. **`ROLE_AUTHORITY`**: mapa `{ papel: "platform" | "tenant" }` cobrindo os 13 papéis, com
   `as const satisfies Record<Role, "platform" | "tenant">`. Papel novo sem classificação = **erro de
   compilação** (chave faltante). **Não existe default:** a decisão é obrigatória no ponto da declaração.
2. `PLATFORM_ROLES` e `TENANT_ASSIGNABLE_ROLES` passam a derivar **por INCLUSÃO** do mapa; os tipos derivam
   por mapped type da mesma fonte. **Apagar** o guard tautológico — ele afirma prova que não produz, a mesma
   classe do B-1, em tipo.
   Fail-closed **triplo** para papel não classificado: não compila; se compilar (sem o `satisfies`), fica fora
   dos **dois** conjuntos → `assertAssignableRole` → **403**; e o teste de partição fica vermelho.
3. `platform-permissions.ts:29` **perde o literal** e importa a constante.
4. **Valores preservados byte a byte** (contrato do consumidor de deploy, v6 §4), **pinados por snapshot** que
   fica vermelho se a refatoração alterar um byte.

**Provas:** fixtures `@ts-expect-error` em `catalog.type-check.ts` (em `src/**`, que é o que o `tsconfig`
cobre) · partição não-tautológica em runtime · **concordância middleware × catálogo para os 13 papéis** ·
guards **10a** (literal de papel em `src/modules/platform/**` = 0) e **10b** (o `satisfies` não pode sumir).

**Drill 2:** papel hipotético sem entrada no mapa → `npm run check` **deve falhar**.
**Drill 3:** literal independente no middleware → concordância **deve falhar**.

### C3 · B-4 — o caminho Prisma (produção) ganha o teste que morre

Suíte nova **`tests/core-saas-role-authority-db.test.ts`** (auto-skip sem `DATABASE_URL`, entra na `SUITES`
sob o guard de zero pulos), espelho de `core-saas-persistence-restart-db.test.ts`:
`tenant_admin` → `POST /users` com `platform_admin` → **403** · `PATCH` para `super_admin` → **403** ·
controle **positivo** com `manager` → sucesso (prova que o 403 vem da allowlist) · pós-403, **nenhum**
assignment de plataforma no banco.

**Drill 4:** comentar `assertAssignableRole` em `prisma-core-saas.service.ts:147` e `:313` → **≥2 falhas
obrigatórias** → restaurar.

### C4 · A-1 + B-5 + B-6 — determinismo, lixo com privilégio, KPI que reproduz

**Causa raiz [medida]:** `CREATE ROLE` + 4 `GRANT` por arquivo, em paralelo, disputando linhas de catálogo →
`XX000 tuple concurrently updated`, ~25%, com arquivos abortando e rodando **menos testes**.

1. Toda a sequência de catálogo passa a rodar numa transação com **`pg_advisory_xact_lock`** — lock **do
   servidor**, cross-processo (o paralelismo do `node --test` é entre processos; mutex em JS não alcançaria).
   Espelho da casa: `provision-rbac.ts:120`. Constante **distinta** da de provisioning. `drop()` entra no mesmo
   lock. Timeout da transação **explícito** [condicional: se 7 arquivos enfileirarem, o default de 5s do
   Prisma viraria flake novo — por isso o parâmetro].
2. `rls-tenant-isolation.test.ts` — o **quarto** escritor de catálogo do batch — toma o mesmo lock.
3. **Sweep de órfãs** na abertura, dentro do lock: roles `o6r_b01_%` com timestamp > 60 min → `DROP OWNED BY`
   + `DROP ROLE`. Escopo = **exclusivamente o prefixo do próprio arnês** + idade — é teardown do próprio
   namespace, não mass-delete ad-hoc (lição de `feedback-no-adhoc-mass-delete-live-db`). A listagem do que foi
   dropado vai anexada.
4. **Residual declarado, com as duas pontas:** o lock serializa os escritores **conhecidos**; se outro
   concorrer (autovacuum na mesma tupla), o `XX000` **pode** reaparecer. Se as 10 execuções não mostrarem, o
   residual é aceitável; se mostrarem, a cadeira de concorrência reavalia. **Alternativa recusada com motivo:**
   `--test-concurrency=1` mascara a causa, pune a suíte inteira e não conserta o `npm test` local.

**Prova:** o batch `-db` **na forma exata do job `backend-postgres`**, **10× consecutivas**, exigindo 10 verdes
**e contagem de testes idêntica nas 10** — o modo de falha era *"menos testes com total plausível"*.
O exercício de 8 criações concorrentes é **rotulado honestamente** como tripwire **probabilístico**, não
guarda determinística.

**KPI:** republicado da execução real, com nota no history dizendo que os números do ciclo 1 não reproduziam.

### C5 · M-1/M-2 — o append-only para de prometer mais do que impõe

1. **Header da migração:** *"contorno único"* vira enumeração honesta — (a) `session_replication_role=replica`
   (só superusuário); (b) **o DONO, mesmo NOSUPERUSER, desliga o trigger**. E na topologia em que quem migra é
   quem serve, **a aplicação nasce dona e pode desligar o próprio trigger**: a inviolabilidade é **da topologia
   dono ≠ app**, não do trigger. Mesma qualificação na errata do `decisoes.md`.
2. **Edição de migração aplicada — condicional [não medido]:** o arquivo muda **só em comentário**, zero DDL.
   *Se* o `migrate deploy` recusar por checksum no dev, o procedimento documentado ressincroniza a linha em
   `_prisma_migrations` (tabela de controle do Prisma, **não** dado de domínio), com before/after anexado;
   *se não recusar*, nada a fazer. CI cria banco do zero. **A parada de migração destrutiva não é disparada.**
3. **Caracterização executada:** tabela-rascunho com o mesmo trigger, dono = role efêmera; conectado como dono,
   `DISABLE TRIGGER` **funciona**. Pina o resíduo sem tocar as tabelas reais.
4. **Discriminante no runbook:** dono efetivo das três tabelas ≠ role da aplicação, medido na ativação.
5. **Guard 10c:** `DISABLE TRIGGER` em `src/**` — baseline **0**.

### C6 · B-7 — validação na borda; nenhum erro cru do Postgres em corpo público

A rota só faz `trim()`; o serviço casta `::uuid`; e o fallback de `sendRouteError` devolve `error.message`
cru — é por aí que a mensagem do Postgres vaza [medido].

`reauthTenantId` malformado → **400** (o `UUID_PATTERN` já existente no arquivo, hoje aplicado só ao POST) ·
`:id` malformado → **404** uniforme com alheio/inexistente (id malformado não pode existir; sem oráculo de
forma). Validação **antes** de tocar o banco. **Não** mexer em `sendRouteError` — a classe inteira é bloco
próprio, vira pendência.

### C7 · B-8 + B-9 — os artefatos param de afirmar o que a execução desmente

`API_CONTRACTS.md` troca *"byte-idêntico"* pelo que a execução produz, com as diferenças declaradas ·
comentários de `app.ts` e `identity-links.routes.ts` reescritos para o alcance real · comentário do arnês
corrigido (a FK impõe). **Varredura limitada aos artefatos deste bloco** — não caça infinita.

---

## §3. Contrato

Só **endurecimento de erro, aditivo**, nas rotas do bloco. Nenhum código novo, nenhuma rota nova, nenhum
payload de sucesso muda. Frontend e mobile **não mudam**.

## §4. Modelagem

**Nenhuma migração nova. Nenhum DDL muda.** `schema.prisma` intocado.

## §6. Testes

**Baseline das 5 suítes editadas: 34 casos**, todos preservados. **≥ 20 casos novos.**

**Desvio declarado da regra M ≥ 2N:** este é ciclo de **correção** sobre um bloco que já entregou ~4N na
superfície; 2N=68 seria inflação. A meta substituta é **cobertura: cada bloqueante com prova que fica
vermelha**, mais os **4 drills executados e anexados**. **A junta ratifica o desvio ou exige a conta cheia.**

## §7. Bateria

`check` · `lint` · `test` (2×; o 2º é o publicado) · `build` · **os 4 drills de mutação** (mutar → rodar →
vermelho obrigatório → reverter) · o batch `-db` **10×** com contagem idêntica · frontend · `git diff --check`
(que **prova** que os drills foram revertidos).

## §9. O que fecha · o que NÃO fecha

**Fecha:** B-1 · B-2/B-3 · B-4 · A-1/B-5 · B-6 · M-1/M-2 · B-7 · B-8/B-9 · as 18 roles órfãs.

**Não fecha, com motivo:** literais de papel nos 4 arquivos de **feature** (não são o gate de autoridade;
mexer agora é risco fora do foco) → `P-O6R-B01-ROLE-LITERAIS` · a classe `error.message` cru no
`sendRouteError` (compartilhado por dezenas de módulos) → `P-O6R-B01-ROUTE-ERROR-LEAK` · mudar a topologia
dono ≠ app (é runbook/ativação; ambientes inexistentes) · os 3 assignments de `super_admin` da base demo
(decisão da junta, v6 §12.1).

## §10. Para a junta, com as duas cadeiras novas

**A ratificar:** constante do advisory lock · idade do sweep (60 min) · timeout da transação (30s) ·
404 para `:id` malformado · **o desvio da meta M ≥ 2N**.

**Ataques convidados** — à **`inspetor-de-arnes-concorrente`**: a suficiência do lock (residual do autovacuum,
o exercício probabilístico, a alternativa de retry, o quarto escritor). À **`guardiao-fail-closed`**: o desenho
do `ROLE_AUTHORITY` (o `satisfies` é forcing suficiente? a fronteira estreita do guard 10a? a derivação
preserva o contrato do `provision-rbac`?).

Toda premissa carrega rótulo; as **não medidas** estão em §2·C5.2, §2·C7 e na constante do lock — **nenhuma
sustenta mecanismo sem o passo de medição escrito**.
