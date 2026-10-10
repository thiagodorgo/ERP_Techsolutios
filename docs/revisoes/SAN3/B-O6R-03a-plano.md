Papel: planejador-mestre · Modelo: GPT-6 Astra (Codex, conforme alocação informada no disparo desta instância; sem telemetria independente do provedor) · Ref medida: 94002580a318df3f907a4690b72aa65d3d09459b.

# B-O6R-03a — Plano v2: replay atômico, compatibilidade legada e prova vinculada ao ator

Identidade nova: `planejador-b-o6r-03a-v2-codex`. Corpo lido integralmente por `git show origin/main:.agents/agents/planejador-mestre.md`, com `origin/main = 9b611468902f3984d7704ef2dd6e3ad1d0c08b3a`. Produto, v1 e crítica medidos em `94002580`, branch `fix/expense-sync-atomic`, worktree `C:/Users/AMP/w-03a`; árvore inicialmente limpa. A v1 permanece no git. A declaração de modelo registra a alocação informada pelo invocador; as ferramentas não oferecem certificação independente do runtime.

## Veredito no topo

**PLANO v2 PRONTO PARA O CRÍTICO.** O remédio de A-01/A-02 cabe no módulo e nas colunas existentes; não exige migração (§2, E07/E11/E13). Isso é veredito de **planejamento**, não aprovação do produto ainda não implementado.

**Parada preservada:** se o remédio exigir `prisma/**` ou `migrations/**`, **BLOCO PARA: exige migração**; o dono decide. O fato de a tabela hoje não ser compartilhada não revoga essa condição de `PLANO_SAN3.md:243`. Nenhuma migração é autorizada por este plano.

## Mudanças da v2

| Achado/parte da v1 | Mudança da v2 | Teste e mutação decisivos |
|---|---|---|
| **A-01 — bloqueia, dentro-do-bloco**: fallback opcional, censo por ':', replay antigo reexecuta | leitura legada sempre ativa; dono conferido; sem prova de payload → conflito manual, zero escrita de domínio; K2 em namespace disjunto de todo id legado válido. Censo deixa de habilitar compatibilidade | A11/B6 com `local:42` matam **M11**; A11b/A11c/A11d cobrem outro ator, colisões e inconsistência; M12/M13 atacam formato e promoção indevida |
| **A-02 — bloqueia, dentro-do-bloco**: evento de u1 autentica u2 | hash v2 inclui tenant/ator/id/tipo/comando; WHERE exige ator e agregado original; recibo também exige dono | A12/B7 matam **M10 combinado**; A12b mata remoção isolada do filtro; C3 mata remoção do ator no hash |
| **A-03 — nota**: promessas confundíveis com execução | separar sondas SQL próprias E10–E14, baseline real E15 e testes/mutações ainda a implementar. Vermelho de import não conta | dev publica assertion funcional de M10/M11 e verde após restauro |
| Rollback v1 admitia reexecução | retirar autorização de rollback simples com rota aberta; drenar writers antigos no upgrade e preservar compatibilidade ou fechar sync no rollback | drill de versão §10.5, conferido por C1/C2 |
| Lacunas de consistência interna | chave não passa por trim/slice do id externo; A10 verifica ausência de callback, não só rollback; memória serializa snapshots; E1 de workOrder cobre create e update; contagens corrigidas | A10/B5/A7b/C7; meta explícita de 44 casos, sem contagem global herdada |

**Mantido após remedição:** uso da tabela restrito ao módulo (E04); claim como primeira escrita, efeito/recibo/eventos numa transação e PK serializando concorrentes (E06/E13); P2002 relido só após rollback; RLS (E14); conflito por ação no lote 200 compatível com consumidor atual; correções nominais da regex e do agregado do evento de item (E05/E07/E08). Nenhuma mudança de permissão, schema ou KPI.

## §0 Onde mora a propriedade?

### 0.1 Pelo enunciado

**P-03a:** para cada (organização, ator autenticado, id local normalizado), uma ação nova bem-sucedida produz um único efeito com recibo e eventos no mesmo commit. Repetição fiel devolve esse resultado; divergência não produz efeito nem se faz passar por sucesso. Recibo pré-deploy do mesmo ator impede novo efeito, mesmo quando não permite autenticar o payload. Dois atores com a mesma chave local são ações diferentes. Falha de transação não deixa claim durável.

| Parte da propriedade | Âncora existente medida em 94002580 | O que falta |
|---|---|---|
| Exclusão concorrente | PK `(tenant_id, client_action_id)`, schema:2865 | chave interna injetiva com usuário e namespace disjunto do legado |
| Tudo ou nada | `withTenantRls` → transação interativa | ligar **todos** os repositórios do efeito ao mesmo `tx` |
| Prova de payload e dono | `expense_events.payload_hash` e `actor_user_id` | fingerprint versionado com identidade; consulta com ator, agregado e tipo do evento |
| Compatibilidade | recibo antigo contém `actor_user_id`, `action_type`, `result_ref` | leitura da chave crua **sempre ativa** e resposta conservadora |
| Organização | filtros tenant-first e RLS FORCE existentes | manter filtro explícito e provar sob papel sem BYPASSRLS |

O evento antigo calcula hash de `{type, clientActionId}`; não contém prova do valor monetário. Nenhum algoritmo recupera essa informação a partir do hash. A v2 não transforma payload reenviado em evidência retrospectiva.

### 0.2 Pelo remédio

- Claim como primeira **escrita**, dentro de uma única transação (leituras e GUC podem antecedê-lo): A1/A5/A6.
- Recibo, relatório/item/total/status, evento de domínio e evento de fingerprint na mesma transação: A2/A2b/A2c, para os três tipos.
- Chave nova em namespace que nenhum id legado válido consegue ocupar; lookup cru com dono conferido: A11/A11b/A11c e M11/M12.
- Fingerprint inclui tenant, ator, chave crua, tipo e comando normalizado; busca exige o mesmo ator **também no predicado**: A12 e M10.
- Replay não executa novamente regras de transição do agregado já submetido; validação sintática antes de escrever e autorização de leitura mantida: A7/A4.
- `SyncClaim` limita chamadas acidentais, mas **não prova atomicidade em runtime**. A prova decisiva é falha injetada e contagem persistida, não marca de TypeScript.

Não existe migração planejada. A exclusividade atual de uso da tabela elimina uma aresta de implementação, mas **não revoga a condição de parada** da l.243.

## §1 MEDIDO × HIPÓTESE

Todas as medições abaixo foram reexecutadas nesta instância. `git show 94002580:<arquivo>` foi usado para fonte; leituras da árvore foram feitas após comprovar HEAD e diff de produto vazio. Comandos externos foram limitados com `subprocess.run(..., timeout=20/30/120/180)`; as sondas Node foram enviadas por stdin, sem arquivo de código criado.

### 1.1 Ref, contratos e escopo

- **E01:** `git rev-parse HEAD origin/main` → `94002580a318df3f907a4690b72aa65d3d09459b` / `9b611468902f3984d7704ef2dd6e3ad1d0c08b3a`; `git status --short` inicialmente vazio. `git diff --stat 9b611468 94002580 -- src tests prisma` → vazio. A crítica julgou `7ed1a7ca`; esta v2 mede o head solicitado, sem herdar a conclusão dela.
- **E02:** lidos integralmente papel em origin/main, `CLAUDE.md`, `PROJECT_MEMORY.md`, v1 e crítica r1; consultados status, decisões, pendências e log. `decisoes.md:3132–3157` fixa topo no plano e em reprovação de junta, demais papéis no nível menor. Esta instância nova no topo foi pedida **explicitamente** pelo dono mesmo sendo devolução de crítico; não se infere uma regra geral nova.
- **E03:** `git show 94002580:docs/revisoes/SAN3/PLANO_SAN3.md`, l.243: caminho preferido dentro do módulo; mudança necessária da chave do model exige parada e arestas com 07c/SAN3-16/04b. A premissa de compartilhamento foi reavaliada por E04, não usada para apagar a parada.
- **E04:** `git grep -n -E 'mobileActionReceipt|MobileActionReceipt|mobile_action_receipts' 94002580 -- src tests` → cinco arquivos, todos em `src/modules/expense-management/`; nenhum teste. Chamador efetivo: serviço; Prisma find/create no repositório; controller só rótulo de auditoria. `git ls-tree -r --name-only 94002580 tests/expense-sync-atomic-db.test.ts tests/expense-sync-fingerprint.test.ts` → vazio.

### 1.2 Fonte de produto reexecutada

- **E05:** `git show 94002580:src/modules/expense-management/expense-management.service.ts`, l.155–213: busca crua sem ator, executa efeito, grava recibo e depois evento; só create/item/submit. L.269–275: hash do evento antigo recebe somente tipo e id, **não payload**. Create devolve relatório; item devolve item, embora o evento exija relatório.
- **E06:** `git show 94002580:src/modules/expense-management/expense-management-prisma.repository.ts`, l.150–180/238–279, e `src/database/rls.ts:29–39`: find-then-create e uma transação RLS por método. O callback de `withTenantRls` permite um repositório ligado à mesma tx, sem editar helper.
- **E07:** schema l.2834–2870 e migração `20260619000000_add_expense_management_foundation` l.168–205: PK tenant+texto, ator no recibo e evento, `payload_hash TEXT`, FK do agregado para relatório, status limitado a processed/failed/conflict. Nenhuma coluna nova é necessária ao desenho.
- **E08:** validador l.10/27–35: regex UUID malformada; `assertNonEmptyString` faz trim e **slice(0,160)**, não rejeita excesso. Assim o domínio legado é de strings normalizadas de até 160 unidades UTF-16, incluindo `:`. A v2 mantém essa normalização; o namespace interno terá prefixo ASCII de 161 caracteres e jamais será uma chave crua produzida pela versão antiga.
- **E09:** repositório em memória l.160–204 tem os cinco mapas e lookup sem ator. O rollback por snapshot precisa também serializar callbacks concorrentes; snapshot isoladamente pode apagar commit de outra chamada. Sem nova biblioteca.

### 1.3 Execução própria, PostgreSQL 16 descartável

Comandos de preparo: `docker run --detach --name pl03a2-pg --publish 127.0.0.1:58423:5432 --env POSTGRES_PASSWORD=<senha-descartável> --env POSTGRES_DB=pl03a2 postgres:16`; `DATABASE_URL=<somente pl03a2-pg> node node_modules/prisma/build/index.js migrate deploy` → ec 0. Query `SELECT count(*) FROM _prisma_migrations` → **108**; `SHOW default_transaction_isolation` → **read committed**. Apenas migrations já existentes foram aplicadas ao banco descartável; nenhum arquivo em prisma foi editado.

Sondas via `node --input-type=module`, pacote `pg` já instalado, timeout 100 s. Fixture: um tenant, dois usuários, um relatório e recibo cru `local:42`, com colunas obrigatórias reais. A primeira tentativa falhou no INSERT da fixture com **42P08** (parâmetro UUID também concatenado como texto); corrigido o parâmetro de slug e reexecutada a sonda completa, **ec 0**. Isso não é defeito de produto.

| Evidência | Comando/consulta executada | Saída e limite da prova |
|---|---|---|
| **E10 / M11** | `SELECT count(*) total, count(*) FILTER (WHERE position(':' in client_action_id)=0) FROM mobile_action_receipts WHERE tenant_id=$1`; lookup `actor + ':local:42'`; dentro de BEGIN, segundo relatório+recibo, seguido de ROLLBACK | **total 1 / censo v1 0 / lookup v1 0 / simulação 2 recibos e 2 efeitos**. Reproduz A-01; o segundo efeito simulado não ficou persistido. |
| **E11 / remédio A-01** | lookup `tenant_id=$1 AND client_action_id='local:42'`, comparação de `actor_user_id`; depois mesma query filtrada pelo outro ator | dono verdadeiro; `processed` e resultado presentes; outro ator **0**. Lookup compatível é possível no schema atual. INSERT de chave com prefixo de 161 chars + JSON do par ator/id → **212 chars / 212 bytes**, aceito pela PK atual. Não foi executado serviço v2 inexistente. |
| **E12 / M10** | dois eventos no mesmo tenant/relatório/tipo, atores u1/u2, hashes H1/H2; `SELECT count(*) loose, count(*) FILTER (WHERE actor_user_id=$4) owned FROM expense_events WHERE tenant_id=$1 AND aggregate_id=$2 AND event_type='expense_report.synced_from_mobile' AND payload_hash=$3` para H1/u2 | **loose 1 / owned 0**: o predicado da v1 aceita prova do outro dono; o predicado com ator não. Reprodução da consulta, não mutação de produção. |
| **E13 / PK** | duas conexões, `SET ROLE pl03a2_probe` (NOSUPERUSER NOBYPASSRLS), BEGIN + GUC; A insere claim, B tenta mesma PK; observador consulta `pg_stat_activity` por application_name=pl03a2-b e wait_event_type=Lock | B observado em **Lock:transactionid**; commit de A → B recebe **23505**. Segunda rodada: rollback de A → B insere e commita. Portão causal, sem espera fixa para ordenar transações. |
| **E14 / RLS e constraints** | sob papel acima, GUC de outro tenant, `SELECT count(*) FROM mobile_action_receipts`; `pg_get_constraintdef` sobre a tabela | outro tenant **0**; PK e CHECK exatamente como E07. Não é teste fim a fim do futuro serviço. |

### 1.4 Baseline e limites

- **E15:** Node **v20.19.5**; `CORE_SAAS_PERSISTENCE=memory DATABASE_URL=<pl03a2-pg> REDIS_URL=<loopback descartável sem serviço> node scripts/run-backend-tests.mjs tests/expense-management-routes.test.ts`, timeout 120 s → **6 testes / 6 pass / 0 fail / 0 skipped**, ec 0, ~31,96 s. Modo foi **exportado** nesta medição, não default herdado do runner.
- **E16:** `node --import tsx --input-type=module` por stdin, timeout 30 s, importando validadores e ROLE_PERMISSIONS reais do head: manager tem read+sync (**true/true**); `assertNonEmptyString(' local:42 ',...,160)` → `local:42`; 200 caracteres → **160**; UUID canônico → **EXPENSE_INVALID/invalid_uuid**. Sonda do encoding proposto com seis ids (':', UUID prefixado, limite, aspas, Unicode e prefixo parecido): prefixo **161**, seis chaves distintas, round-trip verdadeiro, mínimo 212 caracteres, maior amostra 524 bytes. Prova do encoding proposto, não função de produção existente.
- **E17:** releitura no head do consumidor Flutter (`sync_replay_service.dart:125,215–219`) confirma errorCode e conflict→SyncStatus.conflict; catálogo mantém receipt.attach entre tipos do app, ausente no serviço. CI tem inventory-migration-drill em l.277 e guard de zero skipped em l.283–288; helpers de barreira/roles e lista de transientes foram reconsultados. `git grep` no módulo não achou delete de relatório/evento; H3 ainda pede varredura de todo src pelo dev. Os seis corpos-base da junta em §8 existem pelo `git ls-tree` medido.
- A contagem global da v1 (3237 em outra ref) **não é baseline desta v2**. Suíte integral fica para o dev antes/depois, na mesma forma. T-A/T-C não existem; nenhum vermelho dessas suítes é alegado aqui.
- Não se consultou staging, produção, `erp-postgres` ou `erp-redis`. Censo real de legado desconhecido **não condiciona** a compatibilidade entregue.
- **H1 retirada:** supor inexistência de recibos antigos deixou de ser requisito.
- **H2:** nenhum escritor antigo ativo quando a versão nova começar a atender sync. Deve ser provado no procedimento de publicação (§10.5); sem isso, não abrir a rota.
- **H3:** recibos/eventos novos não são apagados nem reescritos por outro processo. Dev reexecuta busca DML pelo tipo/tabela em `src/`; escritor externo encontrado exige rever o plano.
- **H4:** concorrência termina dentro do timeout operacional. A9 mede a contenção real; o prazo excedido responde 503 sem escrita parcial, nunca sucesso inventado.

## §2 Decisão da linha 243 e compatibilidade legada

**Decisão: o remédio cabe no módulo, sem mudança de schema, PK, índice ou migração.** A parada da l.243 não foi acionada pelas medições E04/E07/E11/E13. Se o dev/crítico demonstrar que a solução precisa alterar `prisma/**` ou `migrations/**`, **o bloco PARA**, o topo do plano muda para **BLOCO PARA: exige migração**, e o dono decide. Não cabe substituir essa decisão por autorização implícita da junta.

### 2.1 A-01: compatibilidade entregue, sempre ligada

1. **Identidade externa:** id normalizado pelo validador existente (trim/slice 160). O DTO sempre devolve esse id externo; nunca chave interna.
2. **Chave interna nova K2:** `P + JSON.stringify([actorUserId, clientActionId])`, onde `P = "expense-sync-v2/".padEnd(161, "~")` é uma constante ASCII de **161** caracteres. Ator é a identidade canônica da autenticação (UUID canônico no Prisma); não vem de payload. O par em JSON evita ambiguidade por separador; prefixo maior que o limite legado torna os domínios **disjuntos**, inclusive para `local:42`, `<uuid>:x`, espaços, aspas, Unicode e ids de 160 unidades. A coluna é TEXT; E11 provou INSERT de 212 caracteres. Não usar apenas `v2:` nem `<ator>:`: ambas as formas cabem em ids antigos válidos.
   K2 é um valor interno: **nunca passar por assertNonEmptyString/trim/slice de 160**. O decoder confere prefixo exato, JSON do par, ator e reconstrução byte a byte; origem de lookup legado não é inferida por aparência. C7 deve matar a truncagem acidental de K2.
3. **Lookup:** buscar no mesmo tenant a K2 exata **e** a chave crua. Classificar pela busca realizada, não por `includes(':')`. A linha crua só representa a ação se `actor_user_id === actor.userId`. Se for de outro ator, não devolver seu resultado nem promovê-la: a ação do ator atual pode usar sua K2 independente.
4. **Legado do próprio ator:** não criar recibo novo, não mover/deletar chave, não executar efeito, não anexar hash calculado a partir do pedido atual. Mesmo payload aparentemente igual recebe **200 por lote, `status: conflict`, `replayed: true`, `errorCode: legacy_payload_unverifiable`**, `resultRef` do recibo próprio quando houver. Se tipo divergir, `payload_mismatch`; se recibo incompleto/failed/conflict, continuar recusando sem efeito. O evento antigo não prova payload: responder `processed` seria autenticação falsa. É uma limitação **explícita e segura**, a ser consumida pelo 03b como resolução manual.
5. **Recibo K2:** conferir dono, tipo, status processed e resultado não nulo. Inconsistência → conflito `receipt_unverifiable`, sem escrita. Se coexistirem recibos cru e K2 do mesmo ator/chave (estado não produzido pela v2), retornar `receipt_ambiguous`, sem escolher um efeito arbitrariamente.
6. **Ausência de ambos:** pode tentar claim K2 na transação. Repetir lookup compatível dentro da transação antes da primeira escrita; colisão K2 segue o caminho de rollback/releitura. Linhas legadas não são modificadas. A segurança de coexistência com **binários antigos escrevendo** não se deduz desse lookup: publicação exige drenar esses escritores (§10.5).

**Censo:** o remédio não tem feature flag nem depende de haver zero linhas. Se houver inventário operacional, contar **toda** `mobile_action_receipts` no escopo autorizado e reconciliar a soma de categorias (legado, K2 validada por decoder+round-trip, inconsistente). `position(':')` nunca discrimina versão. Papel sujeito a RLS não pode declarar contagem global zero. Não há consulta à base viva autorizada nesta tarefa.

### 2.2 A-02: prova pertence à ação e ao ator

Fingerprint v2 = SHA-256 de JSON canônico de **`{v:2, tenantId, actorUserId, clientActionId, type, normalized}`**. Usar campos explícitos; não espalhar payload capaz de sobrescrever identidade. Normalização é a mesma que alimenta o efeito.

Evento de sync continua `expense_report.synced_from_mobile`; a versão fica dentro do hash e a chave K2 identifica recibos novos. Consulta exige **tenantId + actorUserId + aggregateId + eventType + payloadHash**, e o recibo precisa pertencer a esse ator. Campo `actor_user_id` nulo ou de outro usuário **não serve de prova**, mesmo se o hash coincidir. A busca por agregado não usa apenas o reportId fornecido pelo replay: deriva o agregado original do recibo (create/submit → resultRef; item → item persistido daquele tenant → reportId) e compara o reportId normalizado do pedido com ele.

**M10 obrigatório em duas formas:** (a) comportamento alcançável: u1 e u2, mesma chave, mesmo relatório, valores 10 e 20; replay de u2 com 10 → conflito; (b) prova adulterada: único evento com hash esperado de u2 está sob u1/NULL → conflito. A segunda forma mata a remoção **isolada** do filtro de ator, mesmo com hash v2 contendo ator. Também testar hash sem ator como mutante próprio da função pura.

### 2.3 O que permaneceu e arestas

Claim não durável com status processed e resultado temporariamente nulo **somente dentro da tx**; completar antes do commit. Não inventar status processing. RLS, Decimal e timestamps existentes ficam intactos. A tabela só é usada pelo módulo no head; 07c/SAN3-16/04b não recebem mudança de código. O contrato de conflito/503 e resolução de legado deve chegar ao **B-O6R-03b**. A dependência de SAN3-02 pela trava de prisma não é ocupada por este desenho; o orquestrador registra isso, sem editar PLANO_SAN3 nesta sessão.

## §3 Critérios, testes e mutações

**Status:** especificação a implementar e executar; as únicas provas já rodadas são E10–E15. Teste que não importa/compila por API nova ausente não conta como vermelho funcional. Nenhuma mutação abaixo é declarada morta antes de execução pelo dev.

Suítes: **T-A** `tests/expense-sync-atomic-db.test.ts` (Postgres real, dois clientes/papéis sem BYPASSRLS, sem skip com DATABASE_URL); **T-B** `tests/expense-management-routes.test.ts` (HTTP/memória, preserva os seis atuais); **T-C** `tests/expense-sync-fingerprint.test.ts` (puro). Barreira causal por `application_name`/helper `waitForOwnBlockedStatement`, não sleeps de ordenação. Contagens incluem recibos, relatórios, itens, eventos de domínio/sync e total monetário; auditoria de requisição do controller segue sua política e não entra no “zero escrita de domínio”.

| Critério | Teste e asserção decisiva | Mutação que deve torná-lo vermelho |
|---|---|---|
| Arnês realmente exerce banco/RLS | **A0**: conexão, application_name propagado, roles sem super/bypass; falha de setup = fail | rodar como superuser deve falhar a asserção de postura |
| Mesma chave/ator concorrente tem um efeito | **A1**: A pausa depois do claim; B observado bloqueado na PK; soltar A; um não-replay + um replay, mesmo resultado, 1 efeito, zero 25P02/40P01 | remover claim; ou consultar dentro da tx abortada |
| Crash depois do efeito | **A2**: decorator lança antes de complete; matriz create/item/submit restaura contagens, total/status e recibo; retry executa uma vez | efeito ou claim em transação separada |
| Crash depois de completar recibo / depois de inserir evento | **A2b**: lançar em createEvent e, em variante, chamar insert real e depois lançar; nenhum evento/efeito persiste | evento fora da tx |
| Crash depois de claim | **A2c**: lançar antes do efeito; nenhum recibo persiste | claim autocommit |
| Dois atores são duas ações | **A3**, **B1**: mesmo id, dois reports e recibos próprios; resposta devolve id cru | remover ator da chave |
| Divergência de valor, período, reportId ou tipo | **A4**, **B2**: conflito/payload_mismatch, resultado original próprio, contagens e dinheiro inalterados | ignorar hash; excluir campo consumido do normalizado |
| Equivalência semântica do payload | **A4b**, T-C: aliases camel/snake aceitos, datas equivalentes, ordem, defaults, envelope/campos ignorados → mesmo hash/replay | hash dos bytes/JSON não canônico |
| A falha libera concorrente | **A5**: B observado bloqueado; rollback de A; B vence, um efeito | claim durável fora da tx |
| Estresse replica o aceite | **A6**: 10 replays × 5 rodadas, exatamente um não-replay por chave | find-then-create sem exclusão atômica |
| Três tipos funcionam e replayam | **A7**, **B3**: create → item (total recalculado, agregado do evento = report) → submit; replay de submit já submetido não refaz transição | regex velha; agregado=item; aplicar regra de transição antes de reconhecer replay |
| UUID corrigido não expõe FK | **A7b**: create **e update REST**, workOrder inexistente/cross-tenant → 404 work_order_not_found, nada alterado; **B3b**: contrato HTTP com erro de repositório injetado | remover mapeamento P2003 específico da FK de workOrder |
| Isolamento entre organizações | **A8**: T1/T2/T3, mesma chave/ator onde fixture permite; recibo/evento/relatório ocultos; **B atual** ignora tenant no payload | tirar GUC/filtro tenant |
| Contenção expirada é reenvio seguro | **A9**: segurar PK em sessão própria até timeout; 503 sync_busy; sem efeito parcial; subcasos de códigos transitórios | remover mapeamento P2028/P2034/P2024/40P01/40001/55P03 |
| Entrada inválida não abre escrita | **A10**, **B4**: tipo não suportado (inclusive receipt.attach) e payload inválido → 400; spy comprova **zero chamadas** de withSyncTransaction/claim para erro sintático | mover parse para dentro do callback (rollback sozinho não mataria esse mutante) |
| Memória tem rollback honesto | **B5**: snapshot dos cinco mapas; duas callbacks sobrepostas, uma falha e outra confirma, confirmação sobrevive | retirar restore **ou** serialização de transações em memória |
| **A-01 / legado com dois-pontos** | **A11**, **B6**: seed old `local:42` + efeito; replay próprio igual/divergente (inclusive várias repetições) → conflict legado/payload_mismatch, 1 efeito, 1 recibo cru, zero K2/evento novo; snapshot antes/depois igual | **M11**: ignorar lookup legado ou só fazê-lo se id não contiver ':' → segundo efeito; variante que aceita sem hash → processed indevido |
| Legado de outro ator não autentica nem bloqueia ação nova | **A11b**: recibo cru de u1; u2 mesma chave → um efeito próprio K2; replay u1 permanece conflito; sem resultado de u1 para u2 | omitir comparação de dono; copiar resultRef legado para u2 |
| Espaços de chave não colidem | **A11c**, T-C: legado cujo id é `<uuid-do-outro>:x`, ids com ':' e 160 chars, prefixos parecidos; ação distinta x continua distinta; K2 nunca é id cru válido | **M12**: voltar a `actor + ':' + raw` ou prefixo curto; assert de disjunção/round-trip falha e fixture colide |
| Estado inconsistente falha fechado | **A11d**: ambos cru/K2 do mesmo dono, resultado nulo, status failed/conflict, ator inválido → conflito apropriado, zero escrita | tratar ausência de prova como ação nova, promover hash do replay ou escolher qualquer dos dois recibos |
| **A-02 / mesmo agregado, dois gestores** | **A12**, **B7**: u1 adiciona 10; u2 adiciona 20; mesma chave crua/relatório; replay u2 com 10 → conflict, com 20 → processed/replayed; 2 itens, total 30, recibo/resultRef próprios preservados | **M10 combinado**: hash sem ator + lookup sem ator → replay divergente aceito |
| Ator do evento é condição independente do hash | **A12b**: mover evento esperado de u2 para u1 e depois NULL, preservando hash/aggregate; nenhuma outra prova válida → conflict; restaurar dono → replay fiel | **M10 isolado**: tirar só actorUserId do WHERE → processed indevido; mata o filtro ausente mesmo com hash contendo ator |
| Recibo aponta ao agregado original | **A13**: alterar reportId no replay do item; evento de outro report com hash semelhante não autentica; item/resultRef original resolve report correto | confiar só no reportId do pedido para procurar prova |

**T-C — oito casos mínimos nomeados:** C1 ordenação recursiva/datas; C2 campos consumidos alteram hash; C3 ator e tenant alteram hash (para isolar o ator, usar comando de item idêntico, sem createdBy no normalizado); C4 tipo e id alteram hash; C5 aliases/defaults normalizados; C6 envelope/campos ignorados não alteram; C7 K2 é injetiva/disjunta com round-trip (inclui ':' e strings de limite); C8 hashes legados nunca promovem replay a prova v2.

**Vermelho-controle:** antes do conserto, exercitar rotas/serviço antigos por interfaces que já existem para reproduzir colisão u1/u2, divergência silenciosa, UUID inválido e crash após efeito. Para A-01/A-02, o defeito nasce no desenho v1, não no head antigo: aplicar M10/M11 **ao código v2 implementado** em worktree isolado; exigir vermelho pela asserção de negócio, restaurar diff, repetir verde. Não exigir que o head antigo falhe o teste de duplicação por troca de chave que ele ainda não faz.

## §4 Desenho: objetivo, ator, fluxo, contrato e modelagem

### 4.1 Objetivo, ator e fluxo

Fechar Ω6R-DIN-009: efeito monetário e prova de replay atômicos, identidade por organização/usuário/id, compatibilidade com ações antigas e conflito explícito para payload não comprovado.

Ator autenticado com `expense_sync:write` (técnico e gestores conforme catálogo); autorização existente para relatório próprio/ou leitura ampla permanece. M10 é alcançável por gestores com `expense_report:read` e `expense_sync:write`. Não se escolhe perfil pelo payload.

Fila offline → `POST /api/v1/mobile/sync/expense-actions` → controller atual → serviço → porta `withSyncTransaction` → `withTenantRls` existente → repositório Prisma ligado ao tx → banco. Sem HTTP/outbox/serviço pago dentro da transação.

### 4.2 Contrato

Request permanece `{actions:[{clientActionId,type,payload}]}`; aliases já aceitos permanecem. Tenant/ator vêm exclusivamente da sessão. Envelope `tenantId/retryCount/createdAt` não autentica nada.

Resposta 200 permanece `{data:{results:[...]}}`; item contém `clientActionId` cru normalizado, `type` solicitado, `status`, `resultRef`, `replayed`, **`errorCode` (null no sucesso)**:

| Situação | Resultado por ação |
|---|---|
| Nova válida | processed, replayed=false, resultRef novo |
| K2 fiel e prova completa do próprio ator | processed, replayed=true, resultRef original |
| K2 com comando/tipo diferente | conflict, replayed=true, payload_mismatch, resultRef original próprio |
| Legado próprio sem prova do payload | conflict, replayed=true, legacy_payload_unverifiable, resultRef próprio existente ou null |
| Prova/recibo K2 incompleto ou contraditório | conflict, replayed=true, receipt_unverifiable; sem expor resultado de outro ator |
| Recibos cru e K2 próprios coexistem | conflict, replayed=true, receipt_ambiguous, resultRef=null |

Conflito não aborta lote nem grava mudança de domínio. Não atualizar recibo para status conflict: essa é a resposta da tentativa, não o estado da ação original. A auditoria de request já feita pelo controller continua.

Erros do lote: 400 EXPENSE_SYNC_INVALID (invalid_actions/invalid_action/unsupported_action); 400 EXPENSE_INVALID para sintaxe; 404 EXPENSE_NOT_FOUND para recurso de outra organização/inexistente; manter 403 de leitura sem permissão no mesmo tenant; 409 EXPENSE_REPORT_LOCKED para status_not_editable/status_not_submittable; 422 EXPENSE_REPORT_INVALID/empty_report; novo **503 EXPENSE_SYNC_UNAVAILABLE/sync_busy** para transitórios. Não converter todas as transições em 422 nem duplicidade fiel em 409: o contrato de sync usa replay.

Uma transação **por ação**, não por lote. Erro em k deixa 1..k-1 confirmadas, como hoje; reenvio dessas ações deve reconhecê-las. Erro sintático é validado antes de abrir tx da própria ação; existência/permissão/estado dependentes do banco são medidos dentro da tx quando há efeito.

### 4.3 Porta e algoritmo

No repositório: `withSyncTransaction`, lookup compatível com origem discriminada `legacy|v2|ambiguous`, `claimMobileActionReceipt`, `completeMobileActionReceipt`, `findExpenseEvent` com **actorUserId obrigatório**, e resolução tenant-scoped do relatório original de um recibo (item → relatório). Remover o find-then-create atual. Tipos de lookup/claim/complete exigem tenant+ator+id. O método de mapear recibo recebe a chave externa/origem validada; **não faz strip genérico de ':'**.

Fluxo por ação:

1. Validar envelope/id/tipo e normalizar comando puro; calcular fingerprint v2.
2. Lookup compatível, usando tenant autenticado. Se existe, resolver legado/inconsistência ou replay v2; **não rodar efeito**.
3. Abrir `withSyncTransaction(tenantId, tx => ...)`. Repetir lookup compatível no tx; se existir, mesma resolução sem escrita.
4. Claim K2 como primeira escrita: INSERT puro, status processed, result_ref null transitório. P2002 da PK do claim → erro de domínio AlreadyClaimed; **relançar**, sem SQL adicional nesse tx.
5. Serviço construído com repositório tx executa comando normalizado. Create retorna report.id; item retorna item.id **e reportId**; submit retorna report.id. Eventos de domínio e recálculo usam o mesmo tx.
6. Completar recibo com resultRef e processedAt. Inserir evento de sync com agregado original do relatório, hash v2 e ator. Só então callback retorna e commita.
7. Fora de `$transaction`, capturar AlreadyClaimed, reler recibo/prova em nova transação RLS e resolver. Se não achar recibo completo, responder 503; nunca refazer efeito por “não achei depois da colisão”. Mapeamento transitório também fora do callback.

Preferir uma leitura RLS consistente para resolver recibo+evento+agregado. Verificar dono do recibo antes de devolver resultRef e autorização de leitura atual do agregado quando necessário; um hash não concede permissão. `actionType` persistido deve corresponder ao pedido antes de aceitar processed.

A porta ligada ao tx executa `work(this)`; wrapper externo chama `withTenantRls(client, tenantId, tx => work(new PrismaExpenseManagementRepository(tx)))`. Não abrir transação aninhada nas rotinas internas. `SyncClaim` só nasce do INSERT bem-sucedido e não é reutilizado após o callback.

Memória: fila/mutex por instância do repositório para `withSyncTransaction`, snapshot dos cinco mapas, restore em throw, liberação em finally. Repositório ligado ao callback não readquire a fila. Dados mutáveis precisam clone adequado; não permitir que restore de A apague commit de B.

### 4.4 Normalização e fingerprint

Extrair rotinas puras com o mesmo parse que alimenta REST e sync: create com empregado resolvido por permissão; item com reportId; submit com reportId. Datas como ISO, defaults explícitos, aliases unificados; JSON recursivo com chaves ordenadas, arrays preservados, undefined omitido. Os cortes atuais de strings/policyFlags e campos descartados são parte do efeito existente; não alterar a normalização neste bloco.

Identidade do fingerprint é externa normalizada, não K2. Não incluir createdAt do servidor nem timestamp gerado a cada tentativa. `amount`, advanceAmount, currency, categoria, datas, notas e todo campo realmente consumido entram no normalizado. Usar SHA-256 já disponível em node:crypto, sem dependência nova. Não reutilizar canonicalJson que rejeita frações.

M10 requer as **duas** proteções: ator no hash e ator no WHERE. O resultado original/aggregate vem do recibo e da relação persistida, não de confiança no novo payload. Evento ausente ou ator errado produz conflito, não novo efeito.

### 4.5 Modelagem e correções nominais preservadas

Nenhuma mudança em Prisma/migrations; up/down de schema **não se aplicam**. Decimal, datas e delete lógico atuais ficam; não ampliar este bloco para aritmética monetária geral.

- Corrigir **uma linha** de uuidPattern para grupos 8-4-4-4-12 (versões aceitas 1–5 e variante atual).
- Evento de sync de item referencia **relatório**, não item (FK existente).
- Regex abre workOrderId no create/update REST e sync: mapear P2003 **da FK workOrder** para 404 work_order_not_found nos dois métodos Prisma, sem mascarar outras FKs. Memória não prova FK real; A7b é obrigatório em PostgreSQL, B3b prova apenas transporte do erro.

### 4.6 Regra do espelho

Unidade de trabalho: `src/modules/financial-uow/financial-uow-prisma.ts` e `src/modules/inventory/inventory-uow-prisma.ts`. Transientes: classificador de códigos/nesting de `inventory-prisma.repository.ts`, inclusive DriverAdapterError e P2010, sem importar o módulo de estoque inteiro. Concorrência: `tests/financial-pay-title-atomic-db.test.ts`, `tests/helpers/pg-barrier.ts`; falha: `tests/o6r06-usage-fault-injection.test.ts`; roles: `tests/helpers/auth-identity-fixture.ts`. São referências de desenho, não provas herdadas de que o novo código está correto. Caminhos editáveis exatos em §6.

## §5 Garantia por construção e execução

**Mantida a decisão de não criar guard estático de forma.** A classe transversal permanece em B-GOV-GUARDA-POR-PROPRIEDADE. `SyncClaim` e parâmetros obrigatórios ajudam a construir corretamente; quem usar cast ou repositório externo ainda pode quebrar a transação. A2/A2b/A2c devem exercer **cada um dos três tipos atuais**, não só criação de relatório.

| Mutação da v1/v2 | Expectativa e prova |
|---|---|
| m1 retirar marca SyncClaim | pode sobreviver: proteção estática de uso futuro; não fingir que é mutante financeiro morto |
| m2 claim autocommit pelo wrapper externo | A2/A2c falham por recibo órfão |
| m3 eliminar fronteira transacional | A2/A2b falham por escrita parcial |
| m4 efeito usa repositório externo | nos três tipos atuais, A2/A2b/A2c falham por efeito fora da tx; tipo futuro sem teste continua risco do bloco transversal |
| m5 releitura depois de P2002 no tx abortado | A1 falha/25P02; exige captura fora |
| m6 efeito antes do claim, mas ainda tudo no mesmo tx | propriedade pode sobreviver; não tratar como defeito monetário só por ordem. Claim-primeiro evita trabalho inútil e facilita exclusão causal |
| m7 claim processing | CHECK recusa; A1/A2 falham |
| m8 JSON cru/sem canonicalização | A4b e C1/C5/C6 falham |
| m9 regex antiga ou aggregate=item | A7 falha por 400/FK |
| **M10**, da crítica: prova de u1 autentica u2 | **A12** (combinação de remoções); **A12b** (só filtro removido); **C3** (só ator retirado do hash). Nenhuma das proteções pode esconder a ausência da outra na bateria |
| **M11**, da crítica: legado local:42 omitido | **A11/B6**: segundo efeito ou sucesso sem prova deixa vermelho. Reproduzir também censo v1 total=1/filtrado=0; o tratamento novo não depende do censo |
| M12 namespace curto/strip por ':' | A11c/C7: colisão entre id legado válido e chave nova, ou id de resposta corrompido |
| M13 promover legado usando hash do replay | A11/A11d/C8: fingerprint novo ou processed indevido é vermelho |
| M14 snapshot sem serialização | B5: commit de outra chamada some, vermelho |

Cada mutação é aplicada **isoladamente** no arquivo de produção em worktree próprio do executor; registrar diff, comando, exit code, teste/assertion que falhou, restauro e verde de retorno. M10 combinado é adicional aos mutantes isolados. Erro de import/compilação não substitui a falha financeira esperada. Sondas SQL desta v2 reproduzem estados e semântica da PK; não substituem esta rodada no código real.

## §6 Escopo permitido e proibido

### 6.1 Esta tarefa de planejamento

**Único arquivo autorizado para escrita:** `C:/Users/AMP/w-03a/docs/revisoes/SAN3/B-O6R-03a-plano.md`, gravado por seção. Sem código, commit, push, alteração de contrato-base ou de registro externo. Banco apenas `pl03a2-*`; não usar base viva, prune, git clean/stash/reset --hard/add -A, tail -f ou npm install. Todo comando externo com timeout. Nenhum subagente de junta/dev é convocado por esta entrega de plano.

### 6.2 Implementação futura do bloco, depois do crítico

| Caminho permitido | Mudança delimitada |
|---|---|
| `src/modules/expense-management/expense-sync.ts` (novo) | normalização/tipos auxiliares, chave K2 e decoder, fingerprint/canonicalização, erro de claim/transientes |
| `src/modules/expense-management/expense-management.repository.ts` | porta de tx/claim/complete/lookup legado/evento escopado; memória serializada com rollback |
| `src/modules/expense-management/expense-management-prisma.repository.ts` | métodos ligados ao tx, lookup dual, evento com ator, resolução do agregado original, mapeamento FK/transientes |
| `src/modules/expense-management/expense-management.service.ts` | parse separado do efeito; fluxo §4; resolução de replay; rotinas internas compartilhadas |
| `src/modules/expense-management/expense-management.types.ts` | tipos de claim/completion, origem do recibo, errorCode |
| `src/modules/expense-management/expense-management.dto.ts` | errorCode ou null; somente id externo |
| `src/modules/expense-management/expense-management.validators.ts` | somente regex UUID da l.10 |
| `src/modules/expense-management/index.ts` | export do novo módulo |
| `tests/expense-sync-atomic-db.test.ts` (novo) | T-A, inclusive legado/M10/M11 |
| `tests/expense-sync-fingerprint.test.ts` (novo) | T-C |
| `tests/expense-management-routes.test.ts` | acrescentar T-B; preservar asserções dos seis existentes |
| `.github/workflows/ci.yml` | uma entrada SUITES de T-A + comentário, após inventory-migration-drill-db; sem reformular workflow |
| `API_CONTRACTS.md` | nota da rota de despesa: §4.2, legado, conflitos e 503 |
| `docs/revisoes/SAN3/B-O6R-03a-plano.md` | emendas identificadas após esta v2 |
| `agent-orchestration/controle/pendencias.md` | append dos registros §9 pelo executor autorizado |
| `docs/revisoes/O6R/REGISTRO_ACHADOS_O6R.md` | status sob Ω6R-DIN-009 **depois** da implementação validada |
| `agent-orchestration/omega/juntas/**` | atas/evidências do orquestrador/cadeiras |

**Proibidos:** `prisma/**`, `migrations/**`, `infra/**`, `.env*`, `package.json`, lockfiles JS, pubspec.yaml/lock, Figma, `Kpis/**`, `mobile/**`, `frontend/**`, `src/database/**`, `src/modules/mobile/**`, outros módulos, `expense-management.controller.ts`, `expense-management.routes.ts`, `scripts/**`, outros testes, `.claude/agents/**` e `.agents/**` pelo dev. Corpos da junta são responsabilidade do orquestrador/fábrica em mandato próprio.

Terreno do dev/jurados: dependências próprias por worktree, **sem junction**. Em w-03a elas já existem: não reinstalar. Postgres próprio por executor, porta alta só 127.0.0.1, fora de 5432/6379/3000/5173/5050 e das reservas Windows. Setup de teste apenas no cluster descartável; teardown pelo tenant/ordem FK ou remoção do próprio container pelo nome. Nenhuma mudança em banco real faz parte deste plano.

## §7 Rodada do crítico

R1 está concluída com **VOLTA AO PLANO**: A-01/A-02 bloqueiam o desenho v1; A-03 é nota. Esta v2 é o plano substituto solicitado, não uma ata de aprovação. Próximo: crítico independente em nível menor (GPT-5.6 Sol no Codex, conforme D-TOPO), identidade `critico-b-o6r-03a-r2`, parecer próprio. Máximo de duas rodadas de crítica do plano; achado financeiro grave não desaparece por contagem de rodadas.

Ordem de ataque:

1. **A-01/M11 e namespace:** tentar um id antigo válido que seja K2, ids com ':' e limites; repetir legado próprio/terceiro, ambos os recibos e recibo incompleto. Provar que nenhuma leitura promove payload atual a prova passada. Criticar explicitamente a resposta legacy_payload_unverifiable e o fluxo manual do app.
2. **A-02/M10:** mesmo agregado, dois gestores, mesma chave, valores distintos. Atacar separadamente hash sem ator, WHERE sem ator, ator NULL, reportId divergente e resultado de outra ação. A12 sozinho não mata remoção do WHERE com hash seguro; **A12b é obrigatório**.
3. **Transação e atualização de versão:** efeito/evento/claim realmente no mesmo tx, perdedor relê após rollback, memória não perde commit alheio. Tentar corrida com writer antigo vivo; o desenho proíbe esse estado na publicação, e o crítico confere a condição executável de drenagem (§10.5).

Também conferir normalização consumida pelo efeito (cortes, defaults, datas), E1 de workOrder nos dois métodos, 400 antes da tx por spy, 503 e catálogo/consumidor de conflict. Não tratar a ausência de schema novo como autorização para aceitar incompatibilidade legada.

O crítico pode contestar **qualquer** premissa, inclusive a parada da l.243. Retira-se a frase da v1 “o crítico não precisa atacar a parada”: evidência nova de migração necessária deve aparecer e parar o bloco.

Parecer: id, gravidade, escopo, ref, comando→saída, motivo. Não escreve o conserto. Dev distinto de ambos os planejadores e dos críticos; esta instância não se torna dev nem jurado. Nenhuma nova crítica/junta foi disparada durante a escrita deste arquivo.

## §8 Junta

**Dinheiro: inspetor + três cadeiras, unanimidade.** §C7.8 governa: ciclos 1 e 2 normais; a partir do 3 só defeito grave de produto (perda/vazamento/permissão/dinheiro) bloqueia, não qualquer rótulo “P0” de processo. A-01/A-02 são defeitos monetários do desenho, não dívida burocrática. D-TOPO exige auditoria e plano no topo em **toda reprovação de junta**, identidade nova; o resto roda no nível menor e declara modelo.

### 8.1 Composição proposta, ainda não convocada

Os corpos-base abaixo existem em `94002580`, confirmado por `git ls-tree -r --name-only 94002580 .agents/agents`. A existência de corpos novos de cadeira **não** é alegada; fábrica/orquestrador nomeiam e versionam antes do inspetor.

| Cadeira nova | Corpos-base | Mandato: até três itens |
|---|---|---|
| C1 `jurado-o6r03a-v2-banco` | agente-dba-guardiao + inspetor-de-arnes-concorrente | (1) sondas próprias A1/A5/A6 de commit/rollback com barreira; (2) crash nos três tipos e três pontos, contagens/valores; (3) tenant-first/RLS e integridade da PK sem schema novo |
| C2 `jurado-o6r03a-v2-replay` | guardiao-fail-closed | (1) legado, namespace e M11/M12/M13, inclusive rollout/rollback; (2) identidade da prova, A12/A12b e M10 isolado/combinado; (3) contrato/normalização e 400/403/404/409/422/503 |
| C3 `jurado-o6r03a-v2-regressao` | agente-ci-doutor + validador-mestre | (1) baseline/bateria completa e CI -db sem skip; (2) escopo, memória/restore e mutações restantes; (3) registro, evidência real e fechamento parcial DIN-009/QUA-001, sem KPI |

Cada cadeira mede em seu worktree e Postgres próprios. Quem muta nunca usa a árvore compartilhada do dev. Testes do autor são insumo; as cadeiras também criam sondas próprias dentro do mandato.

### 8.2 Inelegibilidade

Inelegíveis nesta junta: `planejador-b-o6r-03a` (v1), `planejador-b-o6r-03a-v2-codex` (esta v2), `critico-b-o6r-03a-r1`, `critico-b-o6r-03a-r2`, dev(s) deste bloco e quem já achou/corrigiu a mesma classe nos termos do contrato. O inspetor confere **nominalmente**, nas atas da ref julgada, B-O6R-02/06/04a e as identidades históricas enumeradas na v1. Essa lista histórica **não foi revalidada integralmente nesta v2** e não pode virar veto por herança; a ata registra nome, participação e motivo comprovado. Reusar corpo-base não é reusar identidade. Porteiro não vota.

### 8.3 Pré-voo do inspetor

- Objeto é **SHA completo do PR implementado**, com check-runs concluídos (`gh api repos/<owner>/<repo>/commits/<sha>/check-runs`); queued/cancelled/ausente não libera. CI vermelho concluído é insumo de julgamento, nunca autorização de merge.
- Plano v2/críticas/dev presentes, vermelho-controle e M10/M11 **executados no código**, modelo declarado, nomes elegíveis, `sync-agent-agents.mjs --check` e espelhos dos corpos julgados medidos EOL-neutros.
- Árvores sem mutação viva; cluster descartável/papel sem bypass por executor; sem acesso à base viva; plano de perda de jurado e evidências parciais presentes. Não cobrar “censo por ':' = 0”: esse critério da v1 foi retirado.

P1–P7: evidência a cada item, voto-arquivo-primeiro, sucessor reexecuta, mandatos ≤3 itens, **máximo duas cadeiras simultâneas**, quedas registradas e PAUSA grava estado/pendência/próximo comando e para. Modelos de inspetor/cadeiras/fábrica/dev/porteiro: GPT-5.6 Sol (Codex) ou Opus (Claude), por D-TOPO; topo Fable/Astra para auditoria/replano após reprovação.

Ata do orquestrador: `agent-orchestration/omega/juntas/J-B-O6R-03a-ciclo<n>.md`; evidências/votos em `agent-orchestration/omega/juntas/votos/B-O6R-03a/`. Registra quem achou, planejou, desenvolveu e votou; não inventa approved_head/merge_commit antes de existirem. Aprovação unânime + CI verde → merge no head conferido, limpeza e porteiro de produto. Este plano não autoriza deploy de produção; continua sujeito à decisão/junta crítica aplicável.

## §9 Registro

**Nesta sessão nenhum desses registros é editado:** somente este plano. Os textos seguintes são entregáveis futuros do dev/orquestrador **depois da evidência**, não afirmações de fechamento atual. KPI continua congelado; `Kpis/*` e `achados.jsonl` ficam fora deste PR conforme a delimitação mantida da v1. Não declarar o P0 fechado só porque existe plano.

### 9.1 Registro de Ω6R-DIN-009

Texto a completar em `docs/revisoes/O6R/REGISTRO_ACHADOS_O6R.md`, sob o achado:

> Status: fechado NA AUTORIA do B-O6R-03a, PR #<n>, head <sha>, após testes <comandos/N/ec>. Efeito, recibo e eventos usam uma transação por ação, claim como primeira escrita e releitura da colisão após rollback. Chave K2 separa usuário em namespace disjunto do id cru legado, sem migração. Lookup legado sempre ativo impede novo efeito e responde conflito quando falta prova histórica. Fingerprint v2 inclui organização/ator/id/tipo/comando e só é aceito por evento do mesmo ator e agregado original. M10 e M11 ficaram vermelhas por <asserções>, com retorno verde após restauro. UUID e agregado do evento de item corrigidos nominalmente. Publicação exige retirar writers antigos; rollback não reabre a versão antiga do sync.

### 9.2 P-O6R-B03: fechamento parcial

> Status: PARCIAL em <data>, após validação/PR #<n>. DIN-009 fechado na autoria conforme evidência acima; QUA-001 permanece ABERTO, dono B-O6R-03b. O 03b consome status conflict por ação, payload_mismatch/legacy_payload_unverifiable/receipt_unverifiable/receipt_ambiguous e 503 sync_busy. Dado legado não comprovado exige resolução manual, sem trocar automaticamente o id para tentar pagar de novo.

### 9.3 Pendências nominais

| ID | Estado/dono depois da implementação comprovada | Encerramento |
|---|---|---|
| P-O6R-B03-UUID-PATTERN-INVALIDO | fechada na autoria / 03a; defeito já presente em 94002580 | A7/A7b/B3, regex e FK workOrder sem mensagem interna |
| P-O6R-B03-EVENTO-DE-ITEM-VIOLA-FK | fechada na autoria / 03a; preexistente no head medido | A7 com agregado=relatório e zero P2003 |
| P-O6R-B03-COMPATIBILIDADE-LEGADA | fechada na autoria somente com A11–A11d/M11/M12/M13 executados / 03a | zero segundo efeito para recibo anterior ao deploy, incluindo ':' |
| P-O6R-B03-PROVA-DE-REPLAY-POR-ATOR | fechada na autoria somente com A12/A12b/M10/C3 / 03a | evento de outro ator/NULL não autentica replay |
| P-O6R-B03-APP-RECEIPT-ATTACH-NAO-SUPORTADO | aberta / 03b, preexistente | app não enfileira tipo recusado ou suporte contratado; lote drena |
| P-O6R-B03-CONTRATO-CONFLITO-POR-ACAO | aberta / 03b | Flutter preserva ação em conflito/manual, diferencia 503 e não perde intenção |
| P-O6R-B03-TRANSIENT-CODES-DUPLICADOS | aberta / B-ARNES-2 (confirmar dono na ata) | helper compartilhado em bloco próprio; duplicação **nasce neste bloco**, embora lista de referência seja preexistente |
| P-O6R-B03-PUBLICACAO-SEM-WRITER-ANTIGO | aberta / orquestrador de publicação | evidência de drenagem, substituição de todas as réplicas, drill de replay e rollback seguro; bloqueia ativação da versão, não desenvolvimento |

**Retirado da v1:** P-O6R-B03-CENSO-RECIBOS-LEGADOS como condição para “ligar fallback em outro PR”. Se essa minuta tiver sido copiada a outro registro, o orquestrador apensa errata; não apaga histórico. A compatibilidade vem no próprio 03a e nenhum censo por ':' autoriza reexecução.

### 9.4 Guard transversal

Apensar em P-BLOCO-GOV-GUARDA-POR-PROPRIEDADE: “03a testa por falha injetada todos os três tipos atuais com o mesmo cliente tx. Caminho futuro de sync deve incluir essa matriz. Marca de tipo não garante conexão; avaliar propriedade de identidade transacional sem detector textual de nomes.” Não afirmar que um mutante atual m4 pode passar sem consequência: a matriz atual tem de pegá-lo.

### 9.5 Conflitos e rastreabilidade para a ata

- A l.243 descreve compartilhamento da tabela; E04 mostra uso somente no módulo. Isso corrige a premissa de arestas, **não cancela a parada por necessidade de migração**.
- D-TOPO prevalece sobre modelo fixado antigo dos gates; o pedido expresso desta sessão determinou a instância nova no topo para v2. Não modificar corpos/contratos nesta tarefa.
- A-01/A-02 são de desenho introduzido na v1, ambos dentro-do-bloco. A-03 mantém a distinção entre especificação e execução.
- PR #, merge_commit, approved_head e gate serão os **reais** do bloco; ainda não existem como entrega validada nesta sessão. Registro não substitui junta nem congela o modelo antigo de rollback.

## §10 Baseline, bateria, riscos e rollback

### 10.1 Baseline e meta

**N local reexecutado = 6**, T-B 6/6 pass, 0 fail/skip (E15). **M planejado ≥44 casos nomeados**: T-A **22** (A0–A13 com sufixos da tabela), T-B **14** (6 existentes + B1/B2/B3/B3b/B4/B5/B6/B7), T-C **8**. Logo M ≥ 2N=12; isso é meta, **não contagem publicada de execução**. Subcasos parametrizados podem elevar o total; reportar o TAP real.

Baseline global não medido nesta instância. Antes de editar produto, o dev roda suíte integral em 94002580 com Postgres descartável; depois repete na mesma forma. Não copiar 3237 da v1 nem prometer suíte global verde por herança.

### 10.2 Bateria exata do dev

Os comandos abaixo são em Git Bash com GNU timeout; em PowerShell usar wrapper de processo com prazo e código de saída equivalentes. URLs somente dos containers próprios, definidas no ambiente do **processo filho**; nunca ler/usar a URL da base viva por default. Instalações já existentes em w-03a são preservadas.

```sh
timeout 20 git rev-parse HEAD
timeout 20 git status --short
# Preparo: somente cluster descartável previamente identificado
DATABASE_URL=<db-proprio> timeout 180 node node_modules/prisma/build/index.js migrate deploy
# generate só se o cliente local estiver ausente/desatualizado; não reinstalar dependências
DATABASE_URL=<db-proprio> timeout 120 node node_modules/prisma/build/index.js generate

# Baseline, antes de alterar src: modo memory explícito, DB real para suítes gated
CORE_SAAS_PERSISTENCE=memory DATABASE_URL=<db-proprio> REDIS_URL=<redis-proprio-ou-sem-servico> timeout 1800 node scripts/run-backend-tests.mjs

# Vermelho-controle pelo serviço/HTTP antigo e, após implementação, mutações §5.
# Registrar command/exit/assertion, sem contar falha de import como vermelho funcional.

timeout 300 npm run check
timeout 300 npm run lint
timeout 300 npm run build
CORE_SAAS_PERSISTENCE=memory DATABASE_URL=<db-proprio> timeout 300 node scripts/run-backend-tests.mjs tests/expense-management-routes.test.ts
timeout 300 node --test --import tsx tests/expense-sync-fingerprint.test.ts
DATABASE_URL=<db-proprio> timeout 600 node --test --import tsx tests/expense-sync-atomic-db.test.ts
# Repetir T-A mais duas vezes, com fixtures/roles próprias e cleanup verificado.
CORE_SAAS_PERSISTENCE=memory DATABASE_URL=<db-proprio> REDIS_URL=<redis-proprio-ou-sem-servico> timeout 1800 node scripts/run-backend-tests.mjs
timeout 20 git diff --check
timeout 20 git diff --name-only 94002580
```

- Se a suíte global precisar de Redis, criar container **próprio** com porta alta local; não usar erp-redis. Sem esse requisito satisfeito, registrar falha de ambiente, não verde.
- T-A: três execuções verdes consecutivas, **zero skipped**, denominador estável, sem 25P02/40P01 escapado. A9 pode consumir segundos de timeout: duração declarada, sem limite arbitrário de 60 s para toda a suíte.
- CI backend-postgres: entrada explícita de T-A na lista SUITES, PostgreSQL 16 e guard de zero skips. Re-medido no head: referência inventory-migration-drill está na **l.277**, não l.278 herdada.
- Suíte global: orçamento do runner medido no arquivo é **2 skips nomeados de parity RBAC** quando RBAC_DB_PARITY não está ligado. Falhas/skips novos se investigam; não transformar um baseline vermelho herdado em “verde por exceção”. Publicar N/pass/fail/skip antes/depois, causas datadas e jobs reais.
- Conferir diff permitido (§6), seis testes antigos sem enfraquecimento, nenhum schema/migration/KPI modificado, nenhum escritor da tabela fora do módulo. Buscar DML externo antes de afirmar H3.
- Executar M10, M11, M12 e M13, além da matriz §5; exigir retorno verde após cada restauro. O planejador não as executou porque o código ainda não existe.
- Limpar apenas build/temporários produzidos pelo executor após verificar caminhos/arquivos rastreados. Remover cada container pelo nome, nunca prune; preservar node_modules e arquivos de outras sessões.

### 10.3 Estimativa

Escopo **M/G**: compatibilidade, prova escopada e matriz adversarial tornam a v2 maior que a v1. Estimativa de trabalho do dev: 1–2 dias, testes/mutações incluídos; crítico + junta acrescentam suas medições. Não há prazo garantido de aprovação. Dev é identidade nova, nível menor; planejamento não consome a cadeira de dev.

### 10.4 Riscos, limites e parada

| Risco | Tratamento/limite |
|---|---|
| Legado não tem payload original comprovável | conflito manual explícito; nunca adivinhar hash pelo estado atual do relatório, que pode ter mudado |
| Efeito antigo ficou sem recibo por crash pré-deploy | não é recuperável por lookup de recibo inexistente; reconciliação histórica tem dono operacional, sem promessa de reparação retroativa |
| Writer antigo continua ativo | publicação bloqueada até drenagem; leitura dual não serializa com implementação antiga que escreve efeito antes do recibo |
| Retorno da versão antiga sobre K2 | rollback simples foi retirado; manter sync indisponível ou preservar leitor compatível validado |
| Timeout real difere da expectativa | A9 mede; erro transitório vira 503; não alterar helper global nem inferir sucesso |
| Hash/predicado omite ator | M10 isolado e combinado, A12/A12b/C3 |
| Chave precisa de novo índice/coluna/PK, ou exigência de processing durável | **BLOCO PARA: exige migração**, dono decide; sem “pequena migração” por conta própria |
| Falha preexistente da suíte global | evidência na mesma ref/forma e pendência com dono; não copiar diagnóstico antigo sem reproduzir |
| Queda/PAUSA | salvar seção concluída; PAUSA salva head, feito, falta e próximo comando e interrompe |

### 10.5 Publicação e rollback seguros

**Sem migração não significa sem dado novo.** K2 e hashes v2 são dados de protocolo. Reverter o squash e deixar o endpoint antigo atendendo **pode duplicar dinheiro**; nunca é “aceitável por emergência”.

Procedimento para publicação futura, sob autorização operacional apropriada:

1. Suspender ingresso de sync de despesas e drenar requisições em voo **em todas as réplicas** da versão antiga. Não basta a fila mobile estar quieta. Confirmar processos/versões e transações encerradas; se não houver bloqueio seletivo já disponível, manter API parada durante a troca. Este bloco não cria infraestrutura de manutenção.
2. Substituir todas as réplicas pelo binário compatível; nenhum writer antigo pode voltar ao pool. A leitura legada fica sempre ligada, com qualquer quantidade de recibos.
3. Em ambiente descartável, o drill de versão precisa demonstrar: recibo antigo local:42 + efeito sobrevivem à troca com conflito/zero novo efeito; K2 criada na nova versão reconhece replay após reinício; tentativa de voltar ao binário antigo mantém a rota inacessível e não altera contagens. Registrar procedimento e resultados na evidência do dev/C1.
4. Reabrir tráfego somente após validação de versão e replay. Inventário/censo auxilia observação, **não habilita fallback nem substitui o drill**.

Rollback: primeiro fechar ingresso e drenar a versão nova. Pode reverter código para recuperar outros endpoints **mantendo sync de despesas fechado**, ou aplicar correção que preserve integralmente leitura K2/legado, identidade e atomicidade. Nunca apagar/renomear recibos, limpar eventos, restaurar snapshot antigo de banco ou reabrir writer antigo como atalho. Reabrir sync exige versão compatível validada. A disponibilidade temporária é sacrificada para não reexecutar ações já efetivadas; nenhuma operação real de publicação/rollback foi feita nesta sessão.

### 10.6 Fechamento desta execução de planejamento

Container `pl03a2-pg` removido com `docker rm -f pl03a2-pg` (timeout 30 s, ec 0). Nenhum Redis foi criado, nenhuma dependência instalada, nenhum build de produto gerado; sondas somente por stdin. Nenhum acesso à base viva.

Verificação final: HEAD continua `94002580a318df3f907a4690b72aa65d3d09459b`; `git diff --check` ec 0; `git status --short` mostra **somente** `M docs/revisoes/SAN3/B-O6R-03a-plano.md`; `docker ps -a --filter name=pl03a2- --format '{{.Names}}'` vazio. Onze seções §0–§10, seção Mudanças da v2 e junta presentes. Sem commit/push. **PLANO v2 PRONTO PARA O CRÍTICO.**
