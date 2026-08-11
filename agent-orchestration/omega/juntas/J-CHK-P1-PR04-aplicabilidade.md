# J-CHK-P1-PR04 — Aplicabilidade: qual vistoria se aplica a qual ordem de serviço

- **Bloco:** CHECKLIST P1 PR-04a — fundação da regra de aplicabilidade (`D-CHK-P1-APPLICABILITY`,
  §D-CHK-P1-APPLICABILITY-SEMANTICA)
- **Branch:** `feat/chk-p1-pr04a-aplicabilidade`
- **Data:** 2026-08-10
- **Composição (3, §C7.1):** `planejador-mestre` · `critico-adversarial` · `coordenador-de-acessos`
- **Veredito do plano (antes de qualquer código):** **PLANO APROVADO COM CORREÇÕES** pelo
  `critico-adversarial` — 4 bloqueantes, mais achados ALTA/MÉDIA (todos com destino abaixo).
- **Decisões da junta:** **D1 — `generic` é FALLBACK (2×1)** · **D2 — CLIENTE domina a precedência
  (3×0, unânime)**.

---

## Por que esta junta existiu (e por que ela não podia ser adiada)

A `D-CHK-P1-APPLICABILITY` cravou 4 pontos do dono, mas **duas perguntas ficaram sem resposta sem
ambiguidade** — e as duas são decididas **no momento da criação da ordem de serviço**, com vínculo
**STICKY** e **SEM backfill** (o próprio texto da decisão diz "FORA de escopo confirmado:
re-resolução/backfill de OSs já criadas").

Consequência: **errar aqui congela a vistoria errada naquela ordem para sempre.** Não é uma
configuração que se corrige na tela depois — é um dado que nasce junto com a ordem, é preenchido em
campo, é assinado e vira prova jurídica do estado do veículo. Por isso as duas foram a voto **antes**
de existir código, e não depois.

---

## Rodada de plano — o ataque do `critico-adversarial`

### Bloqueantes (4)

| # | Achado | Destino (verificado no repositório) |
|---|---|---|
| **A1** | A semântica de `generic` **não estava declarada** no plano. O plano dizia "resolve por fase" sem dizer o que acontece quando existe fase concreta **e** genérico ao mesmo tempo — o comportamento sairia por acidente de implementação, sticky e irreversível | **FECHADO nesta fatia** pela **DECISÃO 1** (FALLBACK). Implementado em `checklist-applicability.resolution.ts` (uma linha, comentada como tal) e provado por 4 dos 14 testes (`junta D1: …`) |
| **A2** | A **factory de memória era impossível** sob a cerca de escopo do próprio plano — o plano proibia tocar os pontos de composição e ao mesmo tempo mandava registrar o repositório | **DISSOLVIDO pela reestruturação de escopo:** a PR-04a **não tem factory nem fiação**. Os dois lados do repositório (memória e Prisma) existem para nascerem em paridade, mas **nada os compõe**: verificado nesta data — `src/app.ts` intocado, nenhum serviço/controller/rota, e a única referência ao módulo fora dele é o `export *` do barrel de `checklists` (rotulado como inerte no próprio arquivo). A composição nasce **junto com o consumidor** (PR-04c) |
| **A3** | **Custódia** — o AUTO-link do dossiê varre **todas** as vistorias da ordem, sem filtro de tipo ou fase, para dentro de um arquivo que é **prova jurídica** (`impound-prisma.repository.ts`, `findMany` por `related_entity_id` + `createLink` para cada uma, na mesma transação da abertura). Quando o sticky ligar, todo processo de custódia passa a receber vínculos a mais, e **ninguém decidiu isso** | **EM ABERTO, com dono e PR-alvo:** `P-CHK-CUSTODIA-AUTOLINK-SEM-FILTRO` — **BLOQUEIA a PR-04b**. A PR-04a não é afetada (nasce inerte). Verificado por leitura direta do repositório nesta data |
| **A4** | A precedência **cliente × serviço** proposta no plano **contradizia a frase do dono** e o precedente que a própria decisão manda ancorar | **FECHADO nesta fatia** pela **DECISÃO 2** (CLIENTE DOMINA, unânime) |

### Demais achados do ataque (ALTA/MÉDIA)

| Achado | Destino (verificado) |
|---|---|
| O plano **nomeava o papel errado** no RBAC | **EM ABERTO, PR-04c.** Nenhuma permissão foi criada nesta fatia — `src/modules/core-saas/permissions/catalog.ts` está intocado (escopo proibido). Quando o CRUD existir, a nomeação se reconcilia com a `RBAC_MATRIX.md` **e** a permissão precisa chegar ao **banco** (`npm run db:provision-rbac` + os dois guards de paridade) — senão nasce morta em produção, o padrão de `P-RBAC-CATALOGO-NAO-CHEGA-AO-BANCO`. A família natural é a que já governa os modelos (`tenant_checklists:*`), mas isso **não está decidido** |
| O plano propunha **carregar todos os componentes de todos os modelos publicados** só para extrair ids | **ENDEREÇADO no contrato, não na consulta:** `resolveChecklistApplicability` recebe `publishedTemplateIds: ReadonlySet<string>` — só o conjunto de ids, nunca o modelo inteiro. **Não há consulta nesta fatia**; a obrigação de a consulta ser enxuta é da PR-04c, e o contrato da função já a força |
| O plano reservava **`custody_yard`** no CHECK **antes** de a decisão do eixo existir (o ponto 3 da decisão do dono deixa em aberto se a custódia de pátio é valor de `role` ou discriminador próprio) | **FECHADO:** o CHECK aceita exatamente `collection`/`delivery`/`generic`. O motivo está escrito no cabeçalho da migração — reservar agora congelaria a escolha do eixo antes da decisão; estender depois é aditivo e barato |

---

## DECISÃO 1 — `generic` é **FALLBACK**, não parcela que soma

**A pergunta:** existindo regra de fase concreta (coleta/entrega) **e** regra genérica casando a mesma
ordem, o genérico **soma** (o guincheiro faz as duas) ou **fica de fora** (as concretas vencem)?

| Agente | Voto |
|---|---|
| `planejador-mestre` | **FALLBACK** |
| `critico-adversarial` | **FALLBACK** |
| `coordenador-de-acessos` | IRMÃO que soma (**voto vencido**) |

**Resultado: FALLBACK, 2×1.**

### Argumentos que decidiram

1. **Cada vistoria a mais é trabalho real do guincheiro em campo** — não é uma linha a mais numa
   tabela. Somar por padrão transforma uma configuração descuidada em minutos de pátio, na chuva, com
   o cliente esperando.
2. **Vistorias sobrepostas pedindo as mesmas fotos degradam o valor probatório de TODAS.** Pedir duas
   vezes a mesma evidência produz "tudo OK" em série — o preenchimento vira ritual, e a prova que
   deveria proteger a organização numa disputa perde exatamente a qualidade que a torna prova.
3. **A assimetria do arrependimento é decisiva** (o argumento que fechou o voto): FALLBACK → soma é
   **aditivo depois** — no dia em que se decidir que o genérico soma, ordens novas passam a nascer com
   as duas e nada do passado precisa mudar. Soma → FALLBACK seria **retroativo** sobre ordens já
   criadas, com vistoria já assinada e imutável (PR-03): não há como "desassinar" nem re-vistoriar um
   veículo entregue. Entre os dois erros, escolhe-se o que tem volta.

### O voto vencido, com os argumentos dele (§A2 — nada de consolidação silenciosa)

O `coordenador-de-acessos` votou **IRMÃO** com um argumento que a maioria **não refutou**, apenas
aceitou como custo:

> **Ação à distância no tempo.** Sob FALLBACK, a regra genérica **para de se aplicar sem que ninguém a
> edite**. Basta alguém cadastrar, semanas depois, uma regra de fase concreta para o mesmo bucket: a
> vistoria genérica — que vinha sendo feita em toda ordem — simplesmente deixa de aparecer, e a causa
> está numa **outra** regra, criada por **outra** pessoa, numa **outra** tela. Quem administra vê um
> efeito sem causa visível.

**Mitigação que entrou por causa desse voto** (e é o que o torna suportável, não o que o refuta): a
resolução devolve `shadowed` — **toda regra que casava e perdeu**, incluindo explicitamente o genérico
que ficou de fora por haver fase concreta. Sem esse rastro, a promessa "o operador ajusta no envio"
seria ficção: para ajustar, é preciso **perceber**. O caso está coberto por teste
(`junta D1: o genérico NÃO soma quando uma fase concreta casou — ele é rede de segurança`).

**E o voto vencido trouxe um achado que virou bloqueador** — ver `P-CHK-FLUTTER-KIND-COLAPSA` na
seção "Em aberto".

---

## DECISÃO 2 — **CLIENTE** domina a precedência (unânime)

**A pergunta:** quando uma regra do **cliente** e uma regra do **serviço** casam a mesma ordem, qual
vence?

| Agente | Voto |
|---|---|
| `planejador-mestre` | **CLIENTE DOMINA** |
| `critico-adversarial` | **CLIENTE DOMINA** |
| `coordenador-de-acessos` | **CLIENTE DOMINA** |

**Resultado: 3×0, unânime.** Ordem total final:
**(cliente nomeado > cliente qualquer) → (serviço concreto > tipo > qualquer) → `createdAt` desc →
`id` asc.**

### Argumentos

1. **O precedente que a decisão do dono manda ancorar já resolve assim.** A `D-CHK-P1-APPLICABILITY`
   ancora o desenho em Tarifas, e o **primeiro** critério de desempate de `pickApplicableTariff`
   (`src/modules/tariffs/tariff.repository.ts:158`) é o **cliente**: *"cliente-específico vence tarifa
   padrão"*. O plano citava o precedente **para contrariá-lo** — inverter a chave primária do
   comparador e continuar dizendo que espelha o Tariff seria usar a autoridade do precedente contra o
   próprio precedente.
2. **Nenhuma palavra do dono é descartada.** A frase *"serviço concreto > tipo > any(NULL)"* é ordem
   **DENTRO do eixo de serviço**, não ranking **entre eixos**. Sob CLIENTE DOMINA ela sobrevive
   **intacta** como segunda chave — e está provada exatamente assim em teste
   (`junta D2: dentro do mesmo cliente, a precedência do dono sobrevive intacta (concreto > tipo >
   qualquer)`). O dono também escreveu *"vai depender do tipo do serviço ou **exigência** do
   cliente"* — "exigência" é vocabulário contratual, e exigência contratada não perde em silêncio para
   convenção interna.
3. **Assimetria do erro** (mesma lógica da D1, aplicada ao outro eixo): cliente-domina, no pior caso,
   **coleta prova A MAIS** onde bastaria menos — desperdício recuperável. Serviço-domina deixa **o
   cliente que pagou pela exigência sem a prova contratada**, e isso é irrecuperável: não se
   re-vistoria um veículo já entregue, e backfill está fora de escopo por decisão do dono.

---

## O que a PR-04a entrega — e por que ela **nasce inerte**

**Não existe serviço, controller nem rota nesta fatia.** Decisão tomada com o dono durante a
execução: publicar um CRUD de regras que não afeta ordem de serviço nenhuma seria **"controle que
parece funcionar e não faz nada"** — exatamente a acusação do achado A11 do `critico-adversarial` e a
mesma doença já registrada em `P-CHK-CHIPS-SEM-CONSUMIDOR` (o inspector grava configuração que nenhum
consumidor lê). O CRUD entra na **PR-04c, junto com o consumidor**, para o recurso ligar inteiro.

Verificado no repositório nesta data: `src/app.ts` sem alteração; nenhum `*.routes.ts` /
`*.controller.ts` / `*.service.ts` novo ou tocado; `catalog.ts` de permissões intocado; nada em `src/`
importa o módulo novo.

| Camada | O que entrou |
|---|---|
| Banco | `20260864000000_add_checklist_applicability_rules` — tabela nova; **índice único PARCIAL** (`WHERE is_active AND deleted_at IS NULL`) com **`NULLS NOT DISTINCT`** por bucket (organização × serviço × tipo × cliente × fase); 3 CHECKs (eixo de serviço mutuamente exclusivo `<= 1`, fase ∈ {coleta, entrega, genérico}, tipo de serviço não-vazio); FKs **compostas tenant-first RESTRICT**; RLS ENABLE + FORCE + policy |
| Schema | `ChecklistApplicabilityRule` + 4 back-relations; `prisma validate` OK, `migrate status` sem drift |
| Domínio | `checklist-applicability.types.ts` (domínio, fases, erros de negócio em PT-BR) · `.resolution.ts` (resolução **pura**) · `.repository.ts` (interface + implementação em memória + `applicabilityBucketKey`) · `-prisma.repository.ts` (o outro lado, para os dois nascerem em paridade) |

**Nota sobre o `NULLS NOT DISTINCT`** — é o **oposto** do índice de reabertura de vistoria do PR-03, e
de propósito: lá os NULLs **precisam** ser distintos (senão toda vistoria não-reaberta colidiria com
as outras); aqui `NULL` é **valor de negócio** ("vale para qualquer cliente"), e duas regras curinga
no mesmo bucket são precisamente a ambiguidade que o índice existe para tornar impossível. Com o
padrão do PostgreSQL, N regras curinga conviveriam e o desempate cairia todo no JS — rede furada.

### Provas executadas (números reais, medidos nesta data)

| Prova | Resultado |
|---|---|
| `tests/checklist-applicability-resolution.test.ts` (resolução pura, em memória) | **14/14**, 0 falhas, 0 pulos |
| `tests/checklist-applicability-schema-db.test.ts` (estrutura contra o **PostgreSQL real**, cada caso em transação com **ROLLBACK**) | **11/11**, 0 falhas, 0 pulos |
| `tests/checklist-applicability-repository.test.ts` (bucket/tri-state em memória) | **20/20**, 0 falhas, 0 pulos |
| `tests/checklist-applicability-prisma-db.test.ts` (repositório Prisma contra o **PostgreSQL real**, inclui concorrência no mesmo bucket, §2.8 e um caso de **paridade memória × Prisma**) | **13/13**, 0 falhas, 0 pulos (o 13º caso nasceu de um achado do verificador — ver abaixo) |
| `npm run check` | verde |
| **MUTAÇÃO da guarda do banco** — **reexecutada de primeira mão por esta frente de registro**, dentro de transação com ROLLBACK (o índice real volta intacto; `11/11` reconferido depois) | HEAD, com `NULLS NOT DISTINCT`: a 2ª regra curinga do mesmo bucket **colide** ✔. Com o índice trocado pelo **padrão do PostgreSQL**: **não colide** e **2 regras curinga passam a conviver no mesmo bucket** — a ambiguidade que o índice existe para tornar impossível. A asserção do teste é **carga, não decoração** |
| CI | a suíte de estrutura entrou no job `backend-postgres` (`.github/workflows/ci.yml`), onde qualquer teste **pulado derruba o job** — a defesa anti-verde-cego criada no PR-03 |

As duas suítes de banco têm ainda um caso extra que **só roda quando `DATABASE_URL` está ausente**: ele
aparece como pulo explicado, para que "sem banco" nunca se pareça com "verde".

**Estes números foram medidos por esta frente em 2026-08-10, com as frentes de código ainda em execução
paralela no mesmo repositório.** A bateria consolidada do PR é a do fechamento do bloco; o que está aqui
é o que **eu** executei e vi.

---

## Reestruturação da sequência (decidida com o dono)

A "PR-04" da decisão original vira **três**:

| Fatia | O que faz | Estado |
|---|---|---|
| **PR-04a** | Fundação **inerte**: banco + domínio + resolução, **sem superfície HTTP** | **esta** |
| **PR-04b** | Fecha os **2 bloqueadores** abaixo (são pré-requisito de merge, não backlog) | próxima |
| **PR-04c** | CRUD + vínculo N:N + sticky na criação + ajuste do operador no envio — **tudo junto**: o recurso liga inteiro | depois |

O motivo é um só: **publicar tela de regra antes do consumidor seria configurar e nada acontecer.**

---

## Em aberto (com dono e PR-alvo) — nada aqui está "fechado"

| Item | Por quê | Alvo |
|---|---|---|
| `P-CHK-FLUTTER-KIND-COLAPSA` | `MobileChecklistRunKind.fromApiValue` colapsa **qualquer valor desconhecido em `collection`** (`checklist_models.dart`, o `_ =>` do switch). Com `getRunByKind` usando `.firstOrNull`, duas vistorias tidas como coleta na mesma ordem tornam a **tela de comparação** não-determinística: ela pode confrontar a entrega contra a vistoria errada e produzir **divergência falsa** — que dispara a ciência do cliente e vira prova jurídica. **Prova fabricada por colapso de enum.** Não explode hoje (nenhuma fase `generic` chega ao app, e o FALLBACK da D1 torna genérico e fase concreta mutuamente exclusivos por ordem), mas volta a ser alcançável pelo vínculo manual do operador somado ao `work_orders.checklist_id` legado. Achado do **voto vencido** | **BLOQUEIA a PR-04b** |
| `P-CHK-CUSTODIA-AUTOLINK-SEM-FILTRO` | A3 acima: o AUTO-link varre tudo, sem filtro, para dentro do dossiê jurídico. A aplicabilidade é um **multiplicador de vistorias por ordem** — no dia em que a PR-04b ligar, todo processo de custódia recebe vínculo a mais. Precisa de **voto de junta registrado** decidindo se `autoLinkChecklistRuns` passa a filtrar por fase/tipo | **BLOQUEIA a PR-04b** |
| Permissão do CRUD de regras | nenhuma permissão nasceu nesta fatia; a nomeação correta e a chegada ao **banco** (provisionamento convergente + guards de paridade) são condição para o CRUD não nascer morto em produção | PR-04c |
| **Memória é mais PERMISSIVA que o banco** em dois pontos | há um teste de **paridade** memória × Prisma para o roteiro normal (passa), mas o `checklist-applicability-repository.test.ts` documenta duas divergências reais, em testes nomeados `DIVERGÊNCIA memória × banco`: **tipo de serviço em branco** e **os dois eixos de serviço juntos** — o Postgres **recusa** por CHECK, a memória **aceita**. Hoje é inofensivo (nada escreve por ali), mas no dia em que o CRUD existir o mesmo payload dá **201 em memória e erro no Postgres**: a família de bug do PR-03 (`P-RBAC-CATALOGO-NAO-CHEGA-AO-BANCO`, hotfix #341) de novo, invertida. A validação de entrada precisa nascer **antes** do repositório, não dentro dele | PR-04c |
| `checklist-applicability-prisma-db.test.ts` **fora do job `backend-postgres`** | **CORRIGIDO — e o motivo originalmente escrito aqui era FALSO** (achado do verificador). A ata dizia que no job `backend` "sem `DATABASE_URL`" a suíte viraria pulo; medido em `.github/workflows/ci.yml`, o job `backend` **define** `DATABASE_URL` no `env:`, tem o passo "Guard required env" que derruba o job se ela faltar, roda `prisma migrate deploy` e o glob de `npm test` **pega o arquivo** — a suíte já rodava contra Postgres. Acrescentá-la ao `backend-postgres` continua valendo como **defesa em profundidade** (lá, teste pulado derruba o job), mas pelo motivo certo, não pelo inventado | **FEITO nesta PR** |
| Separador `\|` do `applicabilityBucketKey` é **forjável** | também documentado em teste: `(tipo="b\|c", cliente="d")` e `(tipo="b", cliente="c\|d")` produzem a **mesma** chave em memória e buckets **diferentes** no banco. Não é explorável hoje porque cliente e serviço são colunas UUID (UUID não contém `\|`) — é **carga estrutural** que nada no módulo enforça, e que quebra no dia em que a 04c aceitar identificador de cliente que não seja UUID | PR-04c |
| A implementação em memória usa um **byte NUL literal** como sentinela | a escolha do **valor** U+0000 é correta e está provada em teste (nenhum administrador digita NUL, e o Postgres não o armazena em `TEXT`/`UUID`). O problema é a **forma**: o byte cru no arquivo faz o **git tratá-lo como binário** — medido, `git diff` mostra `Bin 0 -> 6481 bytes` / "Binary files differ", e o `grep`/`rg` pula o arquivo. Consequência de processo direta: **o arquivo não é revisável no diff do PR** (§C7.1 — a junta precisa poder ler o que aprova) e buscas futuras por `applicabilityBucketKey` não acham a definição. Correção de **um caractere**, sem mudança de comportamento: escrever a sentinela como escape `"\u0000"` | **CORRIGIDO nesta PR** — sentinela reescrita como escape `" "`; valor em runtime idêntico, arquivo volta a ser texto e revisável no diff (`file` → `JavaScript source, UTF-8 text`) |
| **Ramo genérico do sanitizador §2.8 sem cobertura** | achado do verificador: as provas cobriam unicidade, FK e CHECK — todas **classificadas**. O ramo que existe justamente para o erro NÃO previsto não era exercido por caso nenhum: dava para trocá-lo por `return error` (devolvendo o `DriverAdapterError` cru, com caminho do servidor e a linha que falhou) e a suíte seguia verde. É o ramo de MAIOR risco §2.8, porque é o único que recebe o inesperado | **CORRIGIDO nesta PR** — 13º caso: renomeia uma coluna no meio da operação (o que acontece de verdade num deploy com migração pendente), exige `ChecklistApplicabilityError` com 500/503 e sem vazamento. Provado por mutação: com o ramo devolvendo o erro cru, o caso **cai** |
| **Repositório Prisma no barrel estático** | achado do verificador: `src/app.ts` importa o barrel de checklists, então o `export *` do repositório Prisma fazia o módulo ser avaliado no boot de **todo processo**, inclusive em `CORE_SAAS_PERSISTENCE=memory`, que não tem banco — contrariando o próprio comentário que declarava o subdiretório inerte. A convenção do módulo é o oposto: `checklist-prisma.repository.ts` também fica fora do barrel e é carregado por `import()` dinâmico | **CORRIGIDO nesta PR** — repositório Prisma fora do barrel, com o porquê escrito |
| **Comentário afirmava causalidade falsa** | achado do verificador: o comentário dizia que o `?? null` do `create` "é o que faz duas regras curinga colidirem no Postgres". Medido: removendo os três `??` a suíte segue verde — quem faz colidir é o `NULLS NOT DISTINCT` do índice. Mesma categoria que já reprovou este bloco uma vez (promessa que o código não cumpre) | **CORRIGIDO nesta PR** — comentário reescrito dizendo o que o código realmente faz e por que a explicitação fica |
| **Divergências memória × banco: 5, não 2** | achado do verificador. Além das duas já registradas (tipo de serviço em branco; dois eixos juntos), o Prisma também recusa `role` inválido em runtime, `templateId` inexistente e `update` pondo os dois eixos — em todos, a memória **aceita**. Reforça a conclusão já registrada: a validação de entrada precisa nascer **antes** do repositório | PR-04c |
| `custody_yard` / eixo da custódia | o ponto 3 da decisão do dono deixa em aberto se é valor de `role` ou discriminador próprio; o CHECK **não** o reservou de propósito | decisão futura (extensão aditiva) |

---

## Rastreabilidade

- **Decisão do dono:** `D-CHK-P1-APPLICABILITY` (`controle/decisoes.md`)
- **Decisão desta junta:** `D-CHK-P1-APPLICABILITY-SEMANTICA` (`controle/decisoes.md`)
- **Pendências criadas por esta junta:** `P-CHK-FLUTTER-KIND-COLAPSA`,
  `P-CHK-CUSTODIA-AUTOLINK-SEM-FILTRO` (ambas **bloqueiam a PR-04b**)
- **Pendência que esta fatia evita repetir:** `P-CHK-CHIPS-SEM-CONSUMIDOR` (controle sem consumidor)
- **API_CONTRACTS.md — não alterado, e o motivo faz parte do registro:** aquele arquivo é o índice dos
  **contratos REST**, fundado nas rotas reais (`src/modules/**/*.routes.ts` + `src/app.ts`). Esta
  fatia **não cria, não altera e não remove nenhum endpoint** — a superfície REST continua
  byte-idêntica, então o documento continua **exato como está**. Anotar ali uma capacidade de domínio
  que não tem endpoint colocaria um não-contrato dentro de um índice de contratos: seria plantar no
  documento o mesmo engano ("parece que existe") que esta fatia foi desenhada para evitar. A
  aplicabilidade entra no `API_CONTRACTS.md` **na PR-04c**, quando tiver rota de verdade.
- **KPIs:** `Kpis/kpis-latest.json` + `kpis-history.json` no próprio PR (§C3); `pr`/`merge_commit`/
  `approved_head` **null na autoria**, com backfill pós-merge (§C3.5)
