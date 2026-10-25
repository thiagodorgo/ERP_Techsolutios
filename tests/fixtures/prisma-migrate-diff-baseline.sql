-- DropForeignKey
ALTER TABLE "financial_entries" DROP CONSTRAINT "financial_entries_reversal_pair_fk";

-- DropForeignKey
ALTER TABLE "financial_titles" DROP CONSTRAINT "financial_titles_parent_title_fkey";

-- DropForeignKey
ALTER TABLE "service_quote_items" DROP CONSTRAINT "service_quote_items_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "service_quote_items" DROP CONSTRAINT "service_quote_items_tenant_id_price_table_id_fkey";

-- DropForeignKey
ALTER TABLE "service_quote_items" DROP CONSTRAINT "service_quote_items_tenant_id_service_quote_id_fkey";

-- DropForeignKey
ALTER TABLE "service_quote_items" DROP CONSTRAINT "service_quote_items_tenant_id_tariff_id_fkey";

-- DropForeignKey
ALTER TABLE "service_quotes" DROP CONSTRAINT "service_quotes_tenant_id_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "service_quotes" DROP CONSTRAINT "service_quotes_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "service_quotes" DROP CONSTRAINT "service_quotes_tenant_id_service_catalog_id_fkey";

-- DropForeignKey
ALTER TABLE "service_quotes" DROP CONSTRAINT "service_quotes_tenant_id_source_price_table_id_fkey";

-- DropForeignKey
ALTER TABLE "service_quotes" DROP CONSTRAINT "service_quotes_tenant_id_source_tariff_id_fkey";

-- DropForeignKey
ALTER TABLE "service_quotes" DROP CONSTRAINT "service_quotes_tenant_id_work_order_id_fkey";

-- DropForeignKey
ALTER TABLE "tag_assignments" DROP CONSTRAINT "tag_assignments_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "tag_assignments" DROP CONSTRAINT "tag_assignments_tenant_id_tag_id_fkey";

-- DropForeignKey
ALTER TABLE "work_order_comments" DROP CONSTRAINT "work_order_comments_tenant_id_author_user_id_fkey";

-- DropForeignKey
ALTER TABLE "work_order_comments" DROP CONSTRAINT "work_order_comments_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "work_order_comments" DROP CONSTRAINT "work_order_comments_tenant_id_work_order_id_fkey";

-- DropForeignKey
ALTER TABLE "work_order_financial_items" DROP CONSTRAINT "work_order_financial_items_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "work_order_financial_items" DROP CONSTRAINT "work_order_financial_items_tenant_id_price_table_id_fkey";

-- DropForeignKey
ALTER TABLE "work_order_financial_items" DROP CONSTRAINT "work_order_financial_items_tenant_id_tariff_id_fkey";

-- DropForeignKey
ALTER TABLE "work_order_financial_items" DROP CONSTRAINT "work_order_financial_items_tenant_id_work_order_id_fkey";

-- DropIndex
DROP INDEX "impound_processes_tenant_id_identity_id_idx";

-- AlterTable
ALTER TABLE "cloud_charge_calculation_runs" ALTER COLUMN "metadata" DROP DEFAULT;

-- AlterTable
ALTER TABLE "cloud_charge_rules" ALTER COLUMN "metadata" DROP DEFAULT;

-- AlterTable
ALTER TABLE "cloud_cost_allocation_runs" ALTER COLUMN "metadata" DROP DEFAULT;

-- AlterTable
ALTER TABLE "cloud_cost_imports" ALTER COLUMN "metadata" DROP DEFAULT;

-- AlterTable
ALTER TABLE "cloud_cost_line_items" ALTER COLUMN "metadata" DROP DEFAULT;

-- AlterTable
ALTER TABLE "cloud_usage_daily_aggregates" ALTER COLUMN "metadata" DROP DEFAULT;

-- AlterTable
ALTER TABLE "cloud_usage_events" ALTER COLUMN "metadata" DROP DEFAULT;

-- AlterTable
ALTER TABLE "commission_basis_events" ALTER COLUMN "payload" DROP DEFAULT;

-- AlterTable
ALTER TABLE "commission_calculations" ALTER COLUMN "calculation_snapshot" DROP DEFAULT;

-- AlterTable
ALTER TABLE "commission_policy_rules" ALTER COLUMN "conditions" DROP DEFAULT;

-- AlterTable
ALTER TABLE "expense_policies" ALTER COLUMN "category_rules" DROP DEFAULT,
ALTER COLUMN "limits" DROP DEFAULT,
ALTER COLUMN "approval_rules" DROP DEFAULT,
ALTER COLUMN "receipt_rules" DROP DEFAULT;

-- AlterTable
ALTER TABLE "field_dispatch_events" ALTER COLUMN "metadata" DROP DEFAULT;

-- AlterTable
ALTER TABLE "field_dispatches" ALTER COLUMN "metadata" DROP DEFAULT;

-- AlterTable
ALTER TABLE "field_operator_locations" ALTER COLUMN "metadata" DROP DEFAULT;

-- AlterTable
ALTER TABLE "notifications" ALTER COLUMN "metadata" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_cloud_charges" ALTER COLUMN "metadata" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_cloud_cost_allocations" ALTER COLUMN "source_cost_line_item_ids" DROP DEFAULT,
ALTER COLUMN "metadata" DROP DEFAULT;

-- AlterTable
ALTER TABLE "work_order_assignments" ALTER COLUMN "metadata" DROP DEFAULT;

-- AlterTable
ALTER TABLE "work_order_events" ALTER COLUMN "metadata" DROP DEFAULT;

-- RenameForeignKey
ALTER TABLE "checklist_applicability_rules" RENAME CONSTRAINT "checklist_applicability_rules_tenant_id_service_catalog_i_fkey" TO "checklist_applicability_rules_tenant_id_service_catalog_id_fkey";

-- RenameForeignKey
ALTER TABLE "impound_process_checklist_links" RENAME CONSTRAINT "impound_process_checklist_links_tenant_id_checklist_run_i_fkey" TO "impound_process_checklist_links_tenant_id_checklist_run_id_fkey";

-- RenameForeignKey
ALTER TABLE "tenant_cloud_cost_allocations" RENAME CONSTRAINT "tenant_cloud_cost_allocations_run_id_fkey" TO "tenant_cloud_cost_allocations_allocation_run_id_fkey";

-- RenameIndex
ALTER INDEX "audit_logs_tenant_entity_idx" RENAME TO "audit_logs_tenant_id_entity_entity_id_created_at_idx";

-- RenameIndex
ALTER INDEX "checklist_runs_tenant_id_related_entity_type_related_entity_id_" RENAME TO "checklist_runs_tenant_id_related_entity_type_related_entity_idx";

-- RenameIndex
ALTER INDEX "checklist_template_components_tenant_id_template_id_component_k" RENAME TO "checklist_template_components_tenant_id_template_id_compone_key";

-- RenameIndex
ALTER INDEX "cloud_charge_calculation_runs_period_idx" RENAME TO "cloud_charge_calculation_runs_period_start_period_end_idx";

-- RenameIndex
ALTER INDEX "cloud_charge_calculation_runs_source_allocation_run_idx" RENAME TO "cloud_charge_calculation_runs_source_allocation_run_id_idx";

-- RenameIndex
ALTER INDEX "cloud_charge_rules_effective_idx" RENAME TO "cloud_charge_rules_effective_from_effective_until_idx";

-- RenameIndex
ALTER INDEX "cloud_charge_rules_tenant_idx" RENAME TO "cloud_charge_rules_tenant_id_idx";

-- RenameIndex
ALTER INDEX "cloud_cost_allocation_runs_period_idx" RENAME TO "cloud_cost_allocation_runs_period_start_period_end_idx";

-- RenameIndex
ALTER INDEX "cloud_cost_imports_period_idx" RENAME TO "cloud_cost_imports_period_start_period_end_idx";

-- RenameIndex
ALTER INDEX "cloud_cost_line_items_billing_period_idx" RENAME TO "cloud_cost_line_items_billing_period_start_billing_period_e_idx";

-- RenameIndex
ALTER INDEX "cloud_usage_daily_aggregates_tenant_date_metric_unit_source_key" RENAME TO "cloud_usage_daily_aggregates_tenant_id_date_metric_key_unit_key";

-- RenameIndex
ALTER INDEX "commission_statements_tenant_id_payee_id_period_start_period_en" RENAME TO "commission_statements_tenant_id_payee_id_period_start_perio_key";

-- RenameIndex
ALTER INDEX "field_operator_locations_tenant_id_operator_user_id_recorded_at" RENAME TO "field_operator_locations_tenant_id_operator_user_id_recorde_idx";

-- RenameIndex
ALTER INDEX "impound_process_checklist_links_tenant_id_process_id_chec_key" RENAME TO "impound_process_checklist_links_tenant_id_process_id_checkl_key";

-- RenameIndex
ALTER INDEX "portal_access_logs_tenant_fp_idx" RENAME TO "portal_access_logs_tenant_id_query_fingerprint_occurred_at_idx";

-- RenameIndex
ALTER INDEX "portal_access_logs_tenant_ip_idx" RENAME TO "portal_access_logs_tenant_id_ip_hash_occurred_at_idx";

-- RenameIndex
ALTER INDEX "tag_assignments_tenant_entity_tag_key" RENAME TO "tag_assignments_tenant_id_entity_type_entity_id_tag_id_key";

-- RenameIndex
ALTER INDEX "tariffs_natural_key" RENAME TO "tariffs_tenant_id_price_table_id_service_catalog_id_custome_key";

-- RenameIndex
ALTER INDEX "tenant_cloud_charges_calculation_run_idx" RENAME TO "tenant_cloud_charges_calculation_run_id_idx";

-- RenameIndex
ALTER INDEX "tenant_cloud_charges_period_idx" RENAME TO "tenant_cloud_charges_period_start_period_end_idx";

-- RenameIndex
ALTER INDEX "tenant_cloud_charges_rule_idx" RENAME TO "tenant_cloud_charges_cloud_charge_rule_id_idx";

-- RenameIndex
ALTER INDEX "tenant_cloud_charges_run_tenant_key" RENAME TO "tenant_cloud_charges_calculation_run_id_tenant_id_key";

-- RenameIndex
ALTER INDEX "tenant_cloud_charges_source_allocation_run_idx" RENAME TO "tenant_cloud_charges_source_allocation_run_id_idx";

-- RenameIndex
ALTER INDEX "tenant_cloud_charges_tenant_idx" RENAME TO "tenant_cloud_charges_tenant_id_idx";

-- RenameIndex
ALTER INDEX "tenant_cloud_cost_allocations_period_idx" RENAME TO "tenant_cloud_cost_allocations_period_start_period_end_idx";

-- RenameIndex
ALTER INDEX "tenant_cloud_cost_allocations_run_idx" RENAME TO "tenant_cloud_cost_allocations_allocation_run_id_idx";

-- RenameIndex
ALTER INDEX "tenant_cloud_cost_allocations_run_tenant_service_usage_category" RENAME TO "tenant_cloud_cost_allocations_allocation_run_id_tenant_id_s_key";

-- RenameIndex
ALTER INDEX "tenant_cloud_cost_allocations_tenant_idx" RENAME TO "tenant_cloud_cost_allocations_tenant_id_idx";
