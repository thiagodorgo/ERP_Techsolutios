# Crítica adversarial do plano B-SAN3-12 (v2), rodada 2 (a última)

> **SUBSTITUIÇÃO DECLARADA.** Quem assina é **`crit-san312-opus-r2`**: Claude **Opus** (`claude-opus-5-5`), nível menor e identidade
> NOVA. O mandato (`prompts/crit-san3-12-r2-pro.md`) previa `crit-san312-pro-r2`, Gemini 3.1 Pro, que caiu pela cota da API sem gravar
> nada. O crítico da r1 foi `crit-san312-pro`, Gemini, e eu não sou ele. Papel: `critico-adversarial` (corpo lido em
> `git show origin/main:.agents/agents/critico-adversarial.md`). Ataco o PLANO. Não escrevo o plano e não proponho conserto
> (§C7.4-bis). Onde digo "o plano precisa decidir X", isso é a propriedade que falta, não a solução.
>
> **Ref medida.** O PR #456 **NÃO entrou**: `gh pr view 456` deu `state: OPEN`, `mergedAt: null`, `headRefOid: bb3cbd6c`.
> Medi no ramo `origin/fix/cheque-x-baixa` **`bb3cbd6c`**, e não no `a0f5aabc` do mandato, que ficou velho. O ramo andou
> `a0f5aabc → d3aa1875` (ata da junta do B-SAN3-20) e depois `→ bb3cbd6c` (merge da `main` `c76ec481`), e
> `git diff --stat a0f5aabc bb3cbd6c -- src tests prisma` saiu vazio. Logo **o código é o mesmo que o plano mediu**.
> **Terreno:** worktree próprio `C:/Users/AMP/w-crit312r2`, criado a partir de `origin/main` e posto em detached no
> `bb3cbd6c`, com `npm ci` próprio (326 pacotes, 47 s) e `prisma generate` com uma URL fictícia. Não usei Docker nem a base
> viva. Duas sondas mexeram por instantes em `catalog.ts` e `cheque.repository.ts` **no meu worktree descartável**, e as duas
> foram restauradas por `git checkout`. As sondas estão copiadas em
> `C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/crit312r2-sondas/`
> (`probe.ts`, `parity.ts`, `tz.ts`). O worktree foi removido ao fim (`git worktree remove --force`; `git worktree list` sem ele).

## Parte 1. A v2 fecha os dois achados da r1?

| Achado r1 | Situação na v2 | Evidência executada / lida |
|---|---|---|
| **CRIT-12-03** (a mutação do A1 não derruba o teste) | **FECHADO para A1 e A3.** **Renasce no A4** (ver R2-02) | **A1:** o construtor aceita `resolveUow` (`financial-entry.service.ts:148`), então dá para injetar no UoW um contador de `uow.run`. Sem o fast-fail, o período aberto deixa a baixa chegar ao `uow.run` (`:447-450`) e o contador vai a 1, ficando vermelho. **A3:** sem o fast-fail, `assertPeriodOpen` (`:447`) dispara **antes** do `uow.run`, e a fixture "cheque pendente + período fechado" passa a responder `period_closed`, também vermelho. O molde K4 existe (`tests/cheque-title-link.test.ts:270-274`) |
| **CRIT-12-02** (CAS opcional) | **Fechado na intenção, não no mecanismo** (ver R2-05) | O campo ficou obrigatório (400/409). Mas a igualdade sobre `updated_at` em milissegundos não entrega o "o 2º recebe 409 **sempre**" do §4.6: o carimbo repetiu em 290 de 300 casos na memória |

## Parte 2. Ataques (achado, id, gravidade, escopo com evidência, evidência executada, motivo)

### R2-01 · BLOQUEIA · escopo `dentro-do-bloco`: permissão nova sem migração quebra o guard do repositório (premissa falsa do §5.1, do §5.2 e da H2)
- **Escopo, com evidência:** são o §5.1 ("nenhuma migração"), o §5.2 ("Sem migração de dados") e o §7.4 (`prisma/**`, `migrations/**` PROIBIDOS) **deste plano**. O guard é anterior a ele: nasceu na "FRONTEIRA HISTÓRICA — CONGELADA em 2026-08-10 (... PR #344)", conforme o comentário em `tests/permission-catalog-migration-parity.test.ts`.
- **Evidência executada:** no meu worktree, pus `cheques:unlink_title` e `financial_entries:unreconcile` em `catalog.ts:152` e rodei os guards (depois restaurei):
  - `node --test --import tsx tests/permission-catalog-migration-parity.test.ts tests/core-saas.test.ts tests/core-saas-role-authority.test.ts` deu **3 vermelhos**:
    - `not ok — permissão acrescentada ao catálogo chega ao banco por migração (fronteira)`;
    - `not ok — mantem catalogo de permissoes integro` (`core-saas.test.ts:257`, `deepEqual` com `expectedPermissionCatalog`);
    - `not ok — contrato do consumidor de deploy: snapshot dos valores exportados` (`tests/fixtures/role-catalog-contract.snapshot.json`).
  - Sem a mudança, os mesmos três ficam verdes (com a URL fictícia de banco).
  - `parity.ts`: catálogo 198, linha de base 189, `TAMANHO_CONGELADO = 189`. As 9 chaves fora da linha de base **todas** pagaram migração. Nenhuma das duas chaves novas está na base nem em `.sql`, e o resultado é `guard VERMELHO`.
- **Motivo:** o guard exige, para toda chave nova, uma **migração de dados aditiva** em `prisma/migrations/` ("Entregue no MESMO PR uma migração aditiva e idempotente, no padrão de 20260861000000_grant_checklist_run_reopen_permission"). E a linha de base **não pode crescer** (`TAMANHO_CONGELADO`; o próprio comentário diz que crescê-la "deve ser reprovado na revisão"). Assim, com o escopo como está, o 12a não tem caminho verde: ou o `npm test` fica vermelho, ou o dev toca `prisma/**`, que é proibido (§C4, sem autorização nominal), ou faz a base crescer, que é proibido pelo guard. Somam-se `tests/core-saas.test.ts` e `tests/fixtures/role-catalog-contract.snapshot.json`, que também precisam mudar e **não estão** no PERMITIDO do §7.1. A H2 foi dada como "sustentada" olhando só o provisionamento da CI, não este guard. **O plano precisa decidir** como as duas permissões chegam ao banco, com a autorização de escopo correspondente (pergunta nova ao dono se for migração, §C4).

### R2-02 · BLOQUEIA · escopo `dentro-do-bloco`: o A4 testa uma corrida que o re-check não decide, e a mutação dele não fica vermelha (mesma classe da CRIT-12-03, recriada pela v2)
- **Escopo:** o §4.2 ("Re-check sob o lock (fecha a corrida `pay × clear`)") e o §8.1 A4 da v2.
- **Evidência (leitura do código, comando a comando):**
  - O conjunto "cheque pendente do título" (`status ∈ {registered, deposited}`, `title_id = T`) só **cresce** por `create` com `title_id` (`cheque.service.ts:113-133`) e por `update` com `title_id` (`:144-167`). `deposit` fica dentro do conjunto. `clear`, `bounce` e `cancel` saem dele (`LEGAL_TRANSITIONS`, `:79-85`).
  - Logo, na fixture do A4 (cheque já vinculado, `clear × pay` em paralelo), uma de duas coisas acontece:
    - (i) o fast-fail do `pay` lê o cheque como `deposited`, porque o `clear` ainda não commitou (READ COMMITTED), e responde 422 `title_has_pending_cheque`;
    - (ii) o `clear` commitou antes, e o `assertPayable` (`financial-entry.service.ts:436` → `financial-title.service.ts:371`) responde 422 `title_already_paid`.
  - **Em nenhuma intercalação** o re-check encontra um pendente que o fast-fail não viu. Sem o re-check, o resultado é idêntico, e a mutação "remover só o re-check" deixa o A4 **verde**.
  - Além disso, o conjunto de respostas esperado pelo A4 ("`title_has_pending_cheque` ou `overpayment`") **não inclui `title_already_paid`**, que é a resposta correta de (ii) quando o cheque cobre o título inteiro. Conforme a ordem que a barreira impuser, o critério fica **vermelho com o código certo**.
- **A corrida que o re-check mira de fato é `pay × vincular`, e ele não a fecha:**
  - O vínculo passa por `validateTitleLink` → `assertPayable`, uma leitura sem trava, e por um `UPDATE` só em `cheques` (`cheque.service.ts:144-167`, `:388-406`). **Não toca a linha do título.** Por isso o `findByIdForUpdate` do título dentro da tx do `pay` não serializa com ele.
  - Se o vínculo commitar depois da leitura do re-check e antes do commit do `pay`, os dois commitam.
  - Na memória o vínculo nem passa pelo mutex: o comentário em `financial-uow.ts`, dentro de `assertPeriodOpenShared`, diz que "escrita direta no repositório não passa por ele".
- **Motivo:** o §4.2 vende o re-check como fecho de uma corrida que ele não decide, e o A4 fica sem mutação observável. É o mesmo defeito que a r1 bloqueou no A1. **O plano precisa dizer** qual corrida o re-check fecha, com um teste cuja mutação seja observável.

### R2-03 · BLOQUEIA · escopo `dentro-do-bloco`: a regra "qualquer cheque pendente vinculado → 422" quebra o cheque PARCIAL, e o caminho que sobra erra dinheiro
- **Escopo:** a regra do §4.2 é código novo do 12a. O vínculo parcial é permitido pelo #456 (`validateTitleLink` → `assertPayable(actor, titleId, amount)` só exige `amount ≤ saldo aberto`).
- **Evidência executada (`probe.ts`, P1, memória, ramo `bb3cbd6c`):**
  ```
  P1 link parcial 40/100 -> status registered titleId=title? true
  P1 pay 60 pix HOJE -> entry true title partially_paid 60 | cheque pendente? true
  P1 unlink+clear -> cheque cleared | title partially_paid 60 / 100
  P1 fechar o título com +40 manual -> title paid 100 | caixa in = 140 (título vale 100)
  ```
- **Motivo:** o título de R$ 100 tem um cheque de R$ 40 vinculado e o cliente paga R$ 60 por Pix. Isso é **complemento**, não "trocar a vinculação do cheque por outro meio de pagamento", que é o literal do dono no §2.2. Mesmo assim, a regra do §4.2 recusa os R$ 60. A única saída que o plano oferece é o administrador desvincular. Feito isso, o cheque compensa como caixa **sem título** (`reserved.titleId` nulo, `cheque.service.ts:305-320`) e sobram duas saídas, ambas erradas:
  - o título fica `partially_paid` 60/100 para sempre, com R$ 40 "a receber" que já entraram;
  - ou alguém baixa os R$ 40 de novo, e o caixa registra **R$ 140 para um título de R$ 100**.

  O `details.pendingAmount` do 422 mostra que o plano conhece o valor do cheque, mas ele não decide o caso parcial. **O plano precisa decidir** (com o dono, se for regra nova) o que acontece quando `pago + pendente_vinculado + valor_da_baixa ≤ valor do título`.

### R2-04 · BLOQUEIA · escopo `dentro-do-bloco`: a "troca da vinculação com privilégio alto" é contornável pelo Financeiro com CANCELAR ou EXCLUIR o cheque
- **Escopo:** o §4.3 "Fecho do bypass" e o A6 deste plano, que fecham só o `PATCH`.
- **Evidência executada (`probe.ts`, P2, ator `finance` só com `cheques:update`, sem `unlink_title`):**
  ```
  P2 cancel por finance (sem unlink_title) -> cancelled titleId mantém? true pendente? false
  P2 pay 100 pix depois do cancel -> true
  P2 delete por finance -> deletedAt? true pendente? false
  ```
  Rotas: `POST /cheques/:id/cancel` e `DELETE /cheques/:id` exigem só `cheques:update` (`cheque.routes.ts`, blocos "DELETE lógico usa a permissão de update" e "DEPOSITAR / CANCELAR"). `registered → cancelled` é transição legal (`cheque.service.ts:80`). O `findPendingByTitle` do §4.2 filtra `status IN (registered, deposited) AND deleted_at IS NULL`.
- **Motivo:** o dono decidiu que a troca "requer privilégios altos". Mas o Financeiro cancela (ou exclui) o cheque `registered` vinculado e baixa por Pix em seguida, ou seja, faz a troca **sem** `cheques:unlink_title`, **sem** justificativa e **sem** o evento `cheque.title_unlinked` crítico do A7. O §4.3 afirma "Sem isto, qualquer Financeiro desvincularia pelo PATCH", mas deixa abertas duas portas equivalentes. **O plano precisa dizer** se cancelar ou excluir um cheque vinculado é troca (e então que privilégio exige) ou não.

### R2-05 · AJUSTE · escopo `dentro-do-bloco`: o CAS por igualdade de `updated_at` (em ms) não garante o "2º recebe 409 sempre"
- **Evidência executada (`probe.ts`, P3, memória):** `P3 memória: reconcile com updatedAt IGUAL ao da leitura anterior em 290/300`. O repositório em memória carimba `updatedAt: new Date()` (`financial-entry.repository.ts:258`). No Prisma, o `@updatedAt` também é carimbado pelo cliente com precisão de ms (`schema.prisma` → `updated_at ... @updatedAt @db.Timestamptz(6)`), e a coluna aceita µs.
- **Motivo:**
  - Duas escritas no mesmo milissegundo deixam o mesmo `updated_at`, e quem leu antes da primeira passa no CAS da segunda (ABA). Na memória isso é a regra (97%), não a exceção. Assim, os casos não-`-db` do A13 ("defasado → 409") ficam vermelhos com o código certo, a menos que o teste espere o relógio virar, e a mutação "tirar `updated_at` do WHERE" não é observável lá.
  - O §4.6 diz "Memória: comparação sob o mutex do tenant", mas o `reconcile` não roda dentro do `uow.run` (`financial-entry.service.ts:399` chama `this.repository.reconcile` direto), e o repositório tem um `await` entre ler e gravar (`financial-entry.repository.ts:245-260`).
  - Em produção a colisão é rara, mas o plano a apresenta como impossível. E qualquer linha gravada pelo `DEFAULT now()` do banco, em µs (hoje só os `-db` que fazem `INSERT` cru, como `tests/financial-entry-delete-reverse-race-db.test.ts:131`), **nunca** casaria com um ISO em ms: a resposta seria 409 eterno.

### R2-06 · BLOQUEIA · escopo `dentro-do-bloco`: o agregado agrupa por dia e mês em UTC, mas a competência e o resumo usam o fuso do negócio (premissa falsa do §4.5 e do R6)
- **Evidência executada (`tz.ts`):**
  ```
  2026-10-31T23:30:00-03:00 | competencia(negocio) = 2026-10 | mes UTC = 2026-11 | dia UTC = 2026-11-01
  2026-10-24T22:15:00-03:00 | competencia(negocio) = 2026-10 | mes UTC = 2026-10 | dia UTC = 2026-10-25
  ```
  `deriveCompetencia` usa `BUSINESS_TIMEZONE = "America/Sao_Paulo"` (`src/config/business-time.ts:10-31`). O `cashFlow` do resumo agrupa por `competencia`, e o comentário diz em letra expressa "NÃO o mês UTC" (`financial-summary.compute.ts:75-99`).
- **Motivo:** o §4.5 afirma "bucket por `occurred_at` em UTC (mesma base da `competencia`)", e isso é falso.
  - Na **mesma tela**, "Entradas × saídas · 6 meses" (pelo resumo, na competência) e "Movimento por mês nesta conta" (pelo agregado, em UTC) mostram totais **diferentes** para quem lançou entre 21:00 e 24:00 do último dia do mês.
  - As barras de 14 dias da aparência C deslocam para o dia seguinte **todo** lançamento feito depois das 21:00 BRT.
  - O A14 (paridade memória × Prisma) não pega o erro, porque os dois lados usam UTC.

  É dinheiro exibido errado, que é a classe que bloqueia até no ciclo 3.

### R2-07 · AJUSTE · escopo `dentro-do-bloco`: o re-check do §4.2 não compila sem tocar `src/modules/financial-uow/**` (PROIBIDO no §7.4)
- **Evidência executada:** acrescentei `findPendingByTitle` à interface `ChequeRepository` (`cheque.repository.ts:16`) e rodei `npx tsc --noEmit -p tsconfig.json`. Além dos erros esperados nas implementações de `cheques/`, saem **2 erros em `src/modules/financial-uow/financial-uow.ts`**: `TS1360 ... does not satisfy the expected type "Record<keyof ChequeRepository, UowMemberKind>"` (`CHEQUE_REPO_KIND`, `:221-232`) e `TS2741 Property "findPendingByTitle" is missing` (`journaledCheques`, `:357`). Depois restaurei.
- **Motivo:** o §4.2 manda pôr o método "no `ChequeRepository`, memória e Prisma" e lê-lo por `ctx.cheques` dentro da unidade. Só que a classificação de membros do UoW é exaustiva por tipo, e `financial-uow/**` está proibido. O escopo do 12a se contradiz.

### R2-08 · AJUSTE · escopo `dentro-do-bloco`: o validador "só para esta chave" (A12) não cabe só em `tenant-setting.validators.ts`
- **Evidência:** `parseValue(value)` não recebe a chave (`tenant-setting.validators.ts`), e `upsert` chama `parseValue(body.value)` sem a chave (`tenant-setting.service.ts`, método `upsert`). O §7.1 permite **só** `tenant-setting.validators.ts`.
- **Motivo:** para recusar com 400 um valor fora de `true|false` **dessa chave**, é preciso mudar o serviço, que está fora do PERMITIDO. O A12 não tem caminho dentro do escopo.

### R2-09 · AJUSTE · escopo `dentro-do-bloco`: o CAS obrigatório quebra chamadores fora do inventário e do escopo do §4.6
- **Evidência:** a busca `git grep -n -F ".reconcile(" -- tests src` (sem `tests/financial-entries.test.ts`) achou:
  - `tests/financial-period-closes.test.ts:141` (`{ reconciled: true, divergence_type: "value" }`);
  - `tests/financial-entry-reverse-restore-db.test.ts:342` (`{ reconciled: true }`, `-db`);
  - `tests/cheques.test.ts:484`, este sim permitido;
  - `tests/financial-uow-journal-classification.test.ts:326`, no nível do repositório.

  Hoje os testes de memória estão verdes.
- **Motivo:** o §4.6 diz que "os casos de `tests/financial-entries.test.ts` ... passam a enviá-lo". Os dois primeiros arquivos acima passariam a receber 400 `expected_updated_at_required` e **não estão** no §7.1. **Clientes** não quebram: `git grep -i reconcil` em `frontend/src`, `mobile/flutter_app/lib` e nos portais só acha homônimos (`ProcessingChip`, `reconciliationPending` dos Pátios), e nenhuma chamada à rota. Isso confirma a medição do plano (item (2) do mandato: nenhum cliente quebra).

### R2-10 · AJUSTE · escopo `dentro-do-bloco`: incoerências internas que restaram da v1 e chegariam ao prompt do dev
- O §3, linha 1, ainda diz "§4.6 CAS **opcional** da conciliação".
- O F18 ainda diz "conciliar de novo (**200 sem CAS** / 409 com CAS)", e o "200 sem CAS" não existe mais: é 400.
- A "lista fechada" de códigos tem três números diferentes: **20** na tabela de resposta à r1, **31** no §4.1 e no F4, e **27** quando se contam os códigos realmente enumerados no §4.1 (17 existentes + 10 novos). O F4 ("cada código ... mensagem distinta") fica sem uma lista verificável.
- `RBAC_MATRIX.md:128` diz que o `reconcile` "reusa a perm — **sem permissão nova**". A emenda do §5.5 só toca a l.49 e a lista da l.95+, então o arquivo-base passa a se contradizer (é conflito registrável pela §A2).

### R2-11 · NOTA · escopo `dentro-do-bloco`: consequência não declarada do gate de desfazer
- `RBAC_MATRIX.md:128`: "`reverse` agora chama assertMutable → estornar lançamento CONCILIADO → 422 (desconcilie antes)". O `delete` de um lançamento conciliado também dá 422 (`entry_reconciled`, precedência em `financial-entry.service.ts:250-262`). Com o §4.4, o Financeiro sem delegação **não consegue mais estornar nem excluir** um lançamento conciliado sem o administrador. Pode ser exatamente o que o dono quer, mas o plano não o diz, e a tela (F7) não o mostra.

### R2-12 · NOTA (positivo): o que resistiu ao ataque
- **Portas que liquidam o título** (item 1 do mandato): `PATCH /status` não chega a `paid`/`partially_paid` (`financial-title.service.ts:301`). O lançamento avulso ignora `title_id` (`financial-entry.service.ts:185-186`). `FinancialTitleService.applyPayment` não tem chamador HTTP (`git grep "\.applyPayment("` → só testes). O estorno só **devolve** pagamento. Sobram `/pay` e `/clear`, e o §4.2 mira a porta certa. O risco está na regra e na corrida (R2-02 a R2-04), não numa porta esquecida.
- **`unlink-title × clear`** (A5-bis): o CAS na mesma linha de `cheques` mais o `reserved.titleId` devolvido pelo `UPDATE` (`cheque.service.ts:292-320`) fazem a corrida ter um vencedor só, como a r1 disse.
- **Delegação fail-closed:** `TenantSettingService.get` lança 404 quando a chave falta (`tenant-setting.service.ts`, método `get`), e "ausente = false" fecha por padrão. `tenant_settings:update` não está com `finance` (`catalog.ts`: as concessões a papéis nas l.421 e 972 são só `:read`).
- **Estado intermediário na `main`:** sem cliente da rota (R2-09), o 12a sozinho só endurece a API. A CRIT-12-04 se mantém.

## Parte 3. Item 3 do mandato: as mutações do 12a, pelo código

| Critério | Mutação listada | Fica vermelho? | Por quê |
|---|---|---|---|
| A1 | remover as duas checagens → 201; remover só o fast-fail → `uow.run` = 1 | **sim** | o contador é injetável pelo `resolveUow` (`:148`), e o período aberto deixa a baixa chegar ao `uow.run` (`:449-450`) |
| A3 | remover só o fast-fail → `period_closed` | **sim** | `assertPeriodOpen` (`:447`) corre antes do `uow.run` |
| A4 | remover só o re-check → "os dois vencem" | **não** | R2-02: nenhuma intercalação de `clear × pay` chega ao re-check com um pendente novo |
| A6 | remover a comparação com o `title_id` atual | sim | mas o bypass sobrevive por `cancel` e `DELETE` (R2-04) |
| A13 (memória) | aceitar ausente / tirar `updated_at` do WHERE | **instável** | R2-05: 290 de 300 escritas no mesmo ms |
| A14 | somar em `Number` / tirar `deleted_at` | sim | mas não pega o erro de fuso (R2-06) |
| A18 | conceder ao `finance` | sim | mas três guards de catálogo ficam vermelhos com o código **certo** (R2-01) |

**Divisão em 3 PRs:** nenhum estado intermediário inseguro na `main` (R2-12). O risco está dentro do 12a (R2-01, R2-07, R2-08), cujo escopo não fecha verde.

## Veredito

**VOLTA AO PLANO.**

São quatro bloqueantes: **R2-01** (premissa "sem migração" contra o guard de catálogo, com execução vermelha), **R2-02** (A4 sem mutação observável e o re-check vendido como fecho da corrida errada), **R2-03** (cheque parcial: a regra força um caminho que dá R$ 140 para um título de R$ 100) e **R2-04** (privilégio da troca contornável por cancelar ou excluir). A eles se somam o **R2-06** (fuso do agregado; também bloqueia, porque exibe dinheiro errado) e cinco ajustes (R2-05, R2-07 a R2-10).

Esta foi a **última rodada** (corpo do `critico-adversarial`: no máximo 2). Pela regra do papel, **o que sobreviveu vira requisito explícito do plano**: cada item bloqueante e cada ajuste acima precisa aparecer no plano como decisão escrita (do dono, onde for regra nova ou autorização de `prisma/**`) ou como critério com mutação observável, antes de o dev do 12a abrir o ramo (`D-EMENDA-ANTES-DO-CODIGO`).

VOLTA AO PLANO · ENTREGA-CONCLUIDA
