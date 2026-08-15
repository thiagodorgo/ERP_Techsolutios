-- CHECKLIST P1 PR-04c-A (D-CHK-P1-APPLICABILITY-BINDING) — a VISTORIA passa a carregar a FASE com que nasceu.
--
-- O QUE RESOLVE. Hoje não há como saber, olhando uma vistoria executada, se ela foi a da COLETA ou a da
-- ENTREGA: o aplicativo carrega essa informação só na navegação (`?kind=`), e ela morre ali. O dossiê de
-- custódia vincula TODAS as vistorias da ordem sem filtro justamente porque não tem por onde distinguir — e o
-- comentário de `impound-prisma.repository.ts:190-192` já cravou o eixo por escrito: a fase vive na REGRA de
-- aplicabilidade (`role`), não em `checklist_templates.type`. A pendência P-CHK-AUTOLINK-FASE-REAL pede a fase
-- "viajando na própria run — não inferida". É esta coluna.
--
-- POR QUE COLUNA, E NÃO DERIVAÇÃO EM LEITURA (a partir da junção `work_order_checklists`):
--   1. a junção é SOFT-REMOVÍVEL — derivar mudaria retroativamente a fase de uma vistoria já concluída, e
--      vistoria concluída é prova imutável (D-CHK-P1-RUN-LIFECYCLE);
--   2. existem vistorias SEM linha de junção: as legadas e as criadas offline pelo aplicativo;
--   3. a fase precisa ser o que a vistoria era quando nasceu, não o que a configuração diz hoje.
--
-- NULL É ACEITÁVEL POR DESENHO, e isto é uma declaração, não um descuido. Sem backfill (decisão do dono), as
-- vistorias já existentes ficam com `role = NULL` — inclusive 100% das que estiverem em voo no dia do deploy.
-- Carimbar `generic` nelas seria FABRICAR DADO (D-007): afirmaria uma fase que ninguém resolveu, num registro
-- que pode ser lido por autoridade. NULL diz a verdade: "esta vistoria nasceu antes de existir fase". Todo
-- consumidor futuro precisa tratar NULL como "fase desconhecida", nunca como um valor implícito.
--
-- ESTA FATIA CRIA E CARIMBA A COLUNA, MAS NÃO A EXPÕE. `toChecklistRunDto` continua sem campo de fase (guard
-- de ausência no PR): o enum do aplicativo conhece apenas `collection|delivery` e manda todo o resto para
-- `unknown`, e a tela de comparação RECUSA comparar quando vê `unknown` ("Atualize o aplicativo" — mensagem
-- falsa e inacionável num app atualizado). Expor `generic` ou `null` hoje travaria a comparação da organização
-- inteira. A exposição é de outro PR, com contrato versionado (§C6) e o tratamento do aplicativo junto.
--
-- ADITIVA E NÃO-DESTRUTIVA (§C4/§C7.5): apenas ADD COLUMN nullable sem default (backfill implícito NULL, sem
-- reescrita de linha) + um CHECK satisfeito por TODAS as linhas existentes (todas ficam NULL), então a
-- validação é trivial e não há varredura pesada.
--
-- RLS: HERDADA. `checklist_runs` já tem ENABLE + FORCE ROW LEVEL SECURITY + policy de isolamento por tenant
-- (20260608000000_enable_tenant_rls). Adicionar coluna/CHECK não altera a policy (ela filtra por `tenant_id`,
-- que continua presente). Nada a re-emitir aqui.
--
-- ROLLBACK (runbook — seguro a qualquer momento nesta fatia: nada lê a coluna, o DTO não a expõe e nenhum
-- índice depende dela; o custo do DOWN é perder a proveniência de fase das vistorias criadas após o deploy):
--   ALTER TABLE "checklist_runs" DROP CONSTRAINT IF EXISTS "checklist_runs_role_chk";
--   ALTER TABLE "checklist_runs" DROP COLUMN IF EXISTS "role";

-- AlterTable
ALTER TABLE "checklist_runs" ADD COLUMN "role" TEXT;

-- VOCABULÁRIO DE FASE — o MESMO conjunto de `checklist_applicability_rules_role_chk` (20260864000000) e de
-- `work_order_checklists_role_chk` (20260865000000). Fonte única: a união TypeScript
-- `CHECKLIST_APPLICABILITY_ROLES` (src/modules/checklists/applicability/checklist-applicability.types.ts).
--
-- O `role IS NULL OR` é EXPLÍCITO DE PROPÓSITO, e não porque seja necessário: em SQL um CHECK que avalia para
-- NULL é considerado SATISFEITO (lógica de 3 valores), então `role IN (...)` sozinho já deixaria NULL passar —
-- em silêncio, por um mecanismo que só quem conhece a armadilha enxerga. Escrito assim, quem ler a constraint
-- vê que a ausência de fase é PERMITIDA POR DESENHO (o legado, acima), e não um furo que ninguém notou. O que o
-- CHECK de fato barra é o valor INVENTADO: um `custody_yard` gravado antes de o eixo estar decidido seria uma
-- fase que metade do sistema não entende — melhor recusar na porta do que descobrir na comparação.
--
-- CAMINHO DE EXTENSÃO: 1 linha na união TypeScript + 1 migração que refaz os TRÊS CHECKs (regra, junção, run).
-- O guard de paridade reprova quem estender só um lado.
ALTER TABLE "checklist_runs"
  ADD CONSTRAINT "checklist_runs_role_chk"
  CHECK ("role" IS NULL OR "role" IN ('collection', 'delivery', 'generic'));
