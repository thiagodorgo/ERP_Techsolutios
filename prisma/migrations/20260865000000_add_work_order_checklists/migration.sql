-- CHECKLIST P1 PR-04c-A (D-CHK-P1-APPLICABILITY-BINDING) — a ORDEM DE SERVIÇO passa a carregar um CONJUNTO
-- de vistorias, e não uma só.
--
-- O QUE RESOLVE. Hoje `work_orders.checklist_id` aponta UM modelo, escolhido à mão. A decisão do dono (ponto 2)
-- pede N:N — "vai depender do tipo do serviço ou exigência do cliente" — e o fluxo central do aplicativo de
-- campo é justamente DUAS vistorias na mesma ordem: a da COLETA e a da ENTREGA. O confronto entre as duas é o
-- resumo de divergências que vira prova jurídica do estado do veículo. Com uma coluna singular, esse par não
-- tem onde existir.
--
-- A IDENTIDADE DA JUNÇÃO INCLUI A FASE (junta do PR-04c, 3×0 — ata J-CHK-P1-PR04C-identidade-da-juncao.md).
-- A chave é (organização, ordem, modelo, FASE), não (organização, ordem, modelo). O caso que essa decisão
-- protege é o mais comum de todos: a organização tem UM formulário de vistoria e o usa nas duas pontas
-- (`coleta → T`, `entrega → T`). Com a fase fora da chave, a segunda linha colidiria e a entrega nunca
-- existiria — e a alternativa que sobraria (duplicar o formulário em dois modelos) faria os dois divergirem
-- com o tempo, os `component_key` deixarem de casar e a tela de comparação produzir divergências VAZIAS OU
-- FALSAS, em silêncio. Prova jurídica errada é pior que prova ausente.
--
-- ADITIVA E NÃO-DESTRUTIVA (§C4/§C7.5). Tabela nova + um índice único aditivo numa tabela existente. NENHUM
-- DROP, nenhum rename, nenhuma reescrita de linha. `work_orders.checklist_id` e `work_orders.checklist_snapshot`
-- ficam INTACTOS e continuam sendo o espelho da linha primária do conjunto (§5.3 do plano) — todo consumidor de
-- hoje (aplicativo de campo, despacho, dossiê de custódia, web) segue lendo o que sempre leu.
--
-- SEM BACKFILL (decisão do dono). Ordens de serviço existentes ficam com junção VAZIA; a leitura cai na visão
-- SINTÉTICA derivada do `checklist_id` legado (nunca gravada). A materialização da linha legada é PREGUIÇOSA e
-- por-ordem, disparada pela primeira escrita de junção naquela ordem — o oposto de uma varredura de tabela.
--
-- ROLLBACK (runbook — o DOWN só é seguro enquanto nenhuma ordem tiver mais de uma vistoria viva; com N > 1 o
-- conjunto se perde ao dropar a tabela, porque o espelho guarda apenas a primária. Exporte antes):
--   DROP TABLE IF EXISTS "work_order_checklists";
--   DROP INDEX IF EXISTS "checklist_applicability_rules_tenant_id_id_key";

-- ─────────────────────────────────────────────────────────────────────────────
-- PRÉ-REQUISITO — habilita a FK composta tenant-first para a REGRA de aplicabilidade.
--
-- `checklist_applicability_rules` nasceu (20260864000000) só com dois `@@index` e a PK simples: não havia
-- unicidade em (tenant_id, id), e sem ela o PostgreSQL RECUSA uma FK composta apontando para esse par. Sem
-- este índice a única FK possível seria a simples em `rule_id`, que permitiria a linha de uma organização
-- citar a regra de OUTRA — exatamente o vazamento que a disciplina tenant-first do repositório existe para
-- tornar estrutural, e não só filtrado na aplicação.
--
-- ADITIVO PURO: `id` é PK, então (tenant_id, id) já é único hoje; a criação não pode falhar por dado
-- existente. Nome = default do Prisma para `@@unique([tenant_id, id])` (mesmo padrão de
-- `users_tenant_id_id_key`, `checklist_templates_tenant_id_id_key`, `work_orders_tenant_id_id_key`).
CREATE UNIQUE INDEX "checklist_applicability_rules_tenant_id_id_key"
  ON "checklist_applicability_rules"("tenant_id", "id");

-- ─────────────────────────────────────────────────────────────────────────────
-- CreateTable
CREATE TABLE "work_order_checklists" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "work_order_id" UUID NOT NULL,
    -- O MODELO de vistoria (template). Mesmo nome de `work_orders.checklist_id`, de propósito: é o mesmo
    -- conceito, agora em N linhas em vez de uma coluna.
    "checklist_id" UUID NOT NULL,
    -- FASE da vistoria dentro do serviço. NOT NULL com default: `generic` é um VALOR de negócio ("vale para
    -- a ordem toda"), não ausência de dado — e ser NOT NULL é o que mantém duas linhas `generic` do mesmo
    -- modelo COLIDINDO no índice de identidade abaixo. Se fosse NULL, cada NULL seria distinto no Postgres e
    -- a mesma vistoria entraria N vezes na mesma ordem.
    "role" TEXT NOT NULL DEFAULT 'generic',
    -- PROVENIÊNCIA: a vistoria entrou porque uma REGRA a resolveu (`resolved`) ou porque uma pessoa a
    -- escolheu (`manual`). Nome verbatim da decisão do dono (decisoes.md:1055). É por LINHA: acrescentar uma
    -- vistoria à mão não transforma as resolvidas em manuais — cada uma continua explicada pela sua origem.
    "checklist_source" TEXT NOT NULL,
    -- A regra que resolveu esta linha. NULL em linha manual (CHECK biconditional abaixo).
    "rule_id" UUID,
    -- Ordem de apresentação e, sobretudo, de DESEMPATE: a linha viva de menor `order_index` é a PRIMÁRIA, e é
    -- ela que o espelho `work_orders.checklist_id` reproduz. Vistoria acrescentada depois recebe `max+1` e por
    -- isso NUNCA vira primária enquanto uma linha anterior viver — é o que impede que uma adição pós-despacho
    -- troque, por baixo, o formulário que o despacho já congelou e prometeu ao técnico.
    "order_index" INTEGER NOT NULL DEFAULT 0,
    -- CÓPIA IMUTÁVEL do modelo no instante do despacho (freeze Ω3-c E1/E3), por LINHA. Editar o modelo depois
    -- não altera o que foi ao campo. NULL antes do despacho. O provisionamento RECUSA linha com snapshot NULL:
    -- mandar a campo um formulário que o freeze nunca viu quebra a garantia inteira.
    "checklist_snapshot" JSONB,
    "added_by" UUID,
    -- REMOÇÃO É SOFT, e os três campos existem por um motivo concreto: numa disputa sobre o veículo, "por que
    -- esta vistoria não aconteceu" é a pergunta que se faz — e um DELETE apaga a resposta. A linha removida
    -- também LIBERA o par (organização, ordem, modelo, fase) no índice parcial, permitindo re-adicionar.
    "removed_at" TIMESTAMPTZ(6),
    "removed_by" UUID,
    "removed_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "work_order_checklists_pkey" PRIMARY KEY ("id")
);

-- IDENTIDADE DA JUNÇÃO — com a FASE dentro (junta do PR-04c, opção A).
--
-- O mesmo formulário PODE servir coleta E entrega na mesma ordem: é o par que alimenta a tela de comparação.
-- O que continua IMPOSSÍVEL é a mesma vistoria duas vezes na MESMA fase — inclusive duas `generic`, porque
-- `role` é NOT NULL e portanto não há NULL "distinto de si mesmo" para escapar do índice.
--
-- PARCIAL (`WHERE removed_at IS NULL`): a remoção é soft. Sem o predicado, retirar uma vistoria e depois
-- devolvê-la exigiria APAGAR a linha — perdendo quem removeu, quando e por quê, que é justamente a informação
-- que a auditoria precisa.
--
-- SQL BRUTO: o Prisma não expressa índice parcial (mesma razão do `checklist_applicability_rules_bucket_key` e
-- do `work_orders` `client_action_id`). Este índice vive SÓ aqui — não há linha correspondente no schema.
CREATE UNIQUE INDEX "work_order_checklists_unique"
  ON "work_order_checklists"("tenant_id", "work_order_id", "checklist_id", "role")
  WHERE "removed_at" IS NULL;

-- CreateIndex (tenant_id 1º; nomes = default do Prisma para os `@@index` declarados no schema)
CREATE INDEX "work_order_checklists_tenant_id_work_order_id_idx"
  ON "work_order_checklists"("tenant_id", "work_order_id");
CREATE INDEX "work_order_checklists_tenant_id_rule_id_idx"
  ON "work_order_checklists"("tenant_id", "rule_id");

-- VOCABULÁRIO DE FASE — o MESMO conjunto de `checklist_applicability_rules_role_chk` e de
-- `checklist_runs_role_chk` (20260866000000). A fonte única é a união TypeScript
-- `CHECKLIST_APPLICABILITY_ROLES` (src/modules/checklists/applicability/checklist-applicability.types.ts).
--
-- CAMINHO DE EXTENSÃO (o dono já antecipou `custody_field`/`custody_yard` — decisoes.md:1049-1052):
-- estender = 1 linha na união TypeScript + 1 migração que refaz os TRÊS CHECKs (regra, junção, run). O guard
-- de paridade reprova quem estender só um lado — e é bom que reprove: estender só o CHECK faz a resolução
-- receber uma fase que ela não conhece e DESCARTAR a regra em silêncio; estender só o TypeScript faz o INSERT
-- estourar em produção com erro cru de driver.
ALTER TABLE "work_order_checklists"
  ADD CONSTRAINT "work_order_checklists_role_chk"
  CHECK ("role" IN ('collection', 'delivery', 'generic'));

ALTER TABLE "work_order_checklists"
  ADD CONSTRAINT "work_order_checklists_source_chk"
  CHECK ("checklist_source" IN ('resolved', 'manual'));

-- PROVENIÊNCIA NÃO MENTE (biconditional, mesmo padrão de
-- 20260856000000_add_identity_canonical_biconditional_chk e do vínculo de reabertura da run).
--
-- `resolved` sem regra seria uma linha afirmando "o sistema decidiu isto" sem poder dizer qual política
-- decidiu — e é exatamente essa cadeia que a tela de sombreamento e uma eventual disputa contratual leem.
-- `manual` COM regra é o espelho: alguém escolheu à mão, mas a linha se apresenta como decisão automática.
-- Nesta fatia nenhuma linha pode nascer `resolved` (não existe rota que crie regra), então a cadeia entra em
-- produção impossível de mentir.
--
-- Sem lógica de 3 valores: `checklist_source` é NOT NULL e `IS NOT NULL` nunca devolve NULL, então os dois
-- lados da igualdade são booleanos definidos (a armadilha que derrubou o CHECK de cancelamento no PÓS-Ω4).
ALTER TABLE "work_order_checklists"
  ADD CONSTRAINT "work_order_checklists_provenance_chk"
  CHECK (("checklist_source" = 'resolved') = ("rule_id" IS NOT NULL));

-- REMOÇÃO COERENTE (biconditional): ou a linha está viva (os dois campos nulos), ou foi retirada por alguém
-- identificado. `removed_at` sem `removed_by` é uma retirada anônima sobre um documento que pode virar prova;
-- `removed_by` sem `removed_at` é uma linha que se apresenta como viva mas carrega carimbo de remoção — e o
-- índice parcial de identidade acima decide pelo `removed_at`, então essa linha ocuparia o par sem que
-- ninguém entendesse por quê.
ALTER TABLE "work_order_checklists"
  ADD CONSTRAINT "work_order_checklists_removal_chk"
  CHECK (("removed_at" IS NULL) = ("removed_by" IS NULL));

-- FKs COMPOSTAS TENANT-FIRST: a referência cruzada de organização é estruturalmente impossível, não apenas
-- barrada por filtro de aplicação.
--
-- `work_orders` é a ÚNICA com CASCADE: esta tabela é filha da ordem de serviço, e uma junção órfã de ordem não
-- significa nada (mesmo tratamento de `work_order_events`). Todo o resto é RESTRICT: apagar um modelo, uma
-- regra ou um usuário que ainda explica uma vistoria viva é erro de integridade — não uma cascata silenciosa
-- que muda qual formulário o guincheiro preenche ou apaga quem retirou a vistoria do conjunto.
ALTER TABLE "work_order_checklists" ADD CONSTRAINT "work_order_checklists_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "work_order_checklists" ADD CONSTRAINT "work_order_checklists_tenant_id_work_order_id_fkey"
  FOREIGN KEY ("tenant_id", "work_order_id") REFERENCES "work_orders"("tenant_id", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "work_order_checklists" ADD CONSTRAINT "work_order_checklists_tenant_id_checklist_id_fkey"
  FOREIGN KEY ("tenant_id", "checklist_id") REFERENCES "checklist_templates"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "work_order_checklists" ADD CONSTRAINT "work_order_checklists_tenant_id_rule_id_fkey"
  FOREIGN KEY ("tenant_id", "rule_id") REFERENCES "checklist_applicability_rules"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "work_order_checklists" ADD CONSTRAINT "work_order_checklists_tenant_id_added_by_fkey"
  FOREIGN KEY ("tenant_id", "added_by") REFERENCES "users"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "work_order_checklists" ADD CONSTRAINT "work_order_checklists_tenant_id_removed_by_fkey"
  FOREIGN KEY ("tenant_id", "removed_by") REFERENCES "users"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS (cópia literal do padrão de 20260864000000_add_checklist_applicability_rules). Habilitar SEM política
-- negaria tudo — pior que não ter; FORCE é o que impede o dono da tabela de ignorar a política.
ALTER TABLE "work_order_checklists" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "work_order_checklists" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "work_order_checklists_tenant_isolation" ON "work_order_checklists";
CREATE POLICY "work_order_checklists_tenant_isolation" ON "work_order_checklists"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
