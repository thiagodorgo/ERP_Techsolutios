import { Info } from "lucide-react";
import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";

import { Alert, Button, Checkbox, Chip, Input, Modal, Select } from "../../../components/ui";
import { usePermissions } from "../../../providers/PermissionProvider";
import { INVENTORY_ITEM_TYPE_OPTIONS, interpretInventoryItemSubmitError, parsePtBrNumber, validateInventoryItem } from "../inventory.adapter";
import { createInventoryItem, updateInventoryItem } from "../inventory.service";
import type {
  InventoryApiContext,
  InventoryItem,
  InventoryItemCreatePayload,
  InventoryItemDraft,
  InventoryItemField,
  InventoryItemType,
} from "../inventory.types";
import { ItemMovimentacaoTab } from "./ItemMovimentacaoTab";
import { ItemResumoTab } from "./ItemResumoTab";

// F7a — cadastro/edição de item de estoque. Ω4C PR-08: modal "Item" com abas Editar | Resumo |
// Movimentação (na edição), campos AutEM do item (tipo, compra/venda, descrição, combustível) e
// inativar no rodapé. SEM campo de saldo (derivado das movimentações — R7.1).
const FIELD_ID: Record<string, string> = {
  sku: "inventory-item-field-sku",
  name: "inventory-item-field-name",
  unit: "inventory-item-field-unit",
  minQuantity: "inventory-item-field-min",
  maxQuantity: "inventory-item-field-max",
  leadTimeDays: "inventory-item-field-lead-time",
  safetyStock: "inventory-item-field-safety-stock",
  itemType: "inventory-item-field-type",
  purchasePrice: "inventory-item-field-purchase-price",
  salePrice: "inventory-item-field-sale-price",
  description: "inventory-item-field-description",
};

type ItemTab = "editar" | "resumo" | "movimentacao";

const gridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--space-12)" };
const fullWidth: CSSProperties = { gridColumn: "1 / -1" };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)", flexWrap: "wrap" };
const tabBarStyle: CSSProperties = { display: "flex", gap: 2, background: "var(--surface-panel-muted)", borderRadius: 10, padding: 4, marginBottom: "var(--space-16)", width: "fit-content" };
const statusRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)", marginBottom: "var(--space-12)" };
const noteStyle: CSSProperties = {
  ...fullWidth,
  display: "flex",
  alignItems: "center",
  gap: "var(--space-8)",
  marginTop: "var(--space-12)",
  padding: "var(--space-10)",
  borderRadius: "var(--radius-6)",
  background: "var(--surface-panel-muted)",
  border: "1px solid var(--border-subtle)",
  color: "var(--text-secondary)",
  fontSize: "var(--text-sm)",
};

function tabButtonStyle(active: boolean): CSSProperties {
  return {
    padding: "6px 14px",
    border: "none",
    borderRadius: 7,
    fontSize: 12.5,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    whiteSpace: "nowrap",
    background: active ? "#2563EB" : "transparent",
    color: active ? "#fff" : "var(--text-secondary)",
  };
}

function toNumberInputValue(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "";
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

export function InventoryItemFormModal({
  item,
  context,
  onClose,
  onSaved,
}: {
  readonly item: InventoryItem | null;
  readonly context: InventoryApiContext;
  readonly onClose: () => void;
  readonly onSaved: (saved?: InventoryItem) => void;
}) {
  const { can } = usePermissions();
  const isEdit = Boolean(item);
  const canCreateMovement = can("stock_movements:create");

  const [tab, setTab] = useState<ItemTab>("editar");
  const [sku, setSku] = useState(item?.sku ?? "");
  const [name, setName] = useState(item?.name ?? "");
  const [unit, setUnit] = useState(item?.unit ?? "");
  const [minQuantity, setMinQuantity] = useState(toNumberInputValue(item?.minQuantity));
  const [maxQuantity, setMaxQuantity] = useState(toNumberInputValue(item?.maxQuantity));
  const [leadTimeDays, setLeadTimeDays] = useState(item?.leadTimeDays != null ? String(item.leadTimeDays) : "");
  const [safetyStock, setSafetyStock] = useState(toNumberInputValue(item?.safetyStock));
  const [itemType, setItemType] = useState<InventoryItemType>(item?.itemType ?? "product");
  const [isFuel, setIsFuel] = useState(item?.isFuel ?? false);
  const [purchasePrice, setPurchasePrice] = useState(toNumberInputValue(item?.purchasePrice));
  const [salePrice, setSalePrice] = useState(toNumberInputValue(item?.salePrice));
  const [description, setDescription] = useState(item?.description ?? "");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<InventoryItemField, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);

  const isProduct = itemType === "product";

  function buildDraft(): InventoryItemDraft {
    return {
      sku: sku.trim(),
      name: name.trim(),
      unit: unit.trim(),
      minQuantity: parsePtBrNumber(minQuantity),
      maxQuantity: parsePtBrNumber(maxQuantity),
      leadTimeDays: parsePtBrNumber(leadTimeDays),
      safetyStock: parsePtBrNumber(safetyStock),
      itemType,
      isFuel,
      // EQUIPAMENTO oculta/limpa Compra/Venda (§11); só valida preço quando é PRODUTO.
      purchasePrice: isProduct ? parsePtBrNumber(purchasePrice) : undefined,
      salePrice: isProduct ? parsePtBrNumber(salePrice) : undefined,
      description: description.trim() || undefined,
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const draft = buildDraft();
    const errors = validateInventoryItem(draft);
    if (errors.length > 0) {
      setFieldErrors(Object.fromEntries(errors.map((error) => [error.field, error.message])) as Partial<Record<InventoryItemField, string>>);
      focusField(errors[0].field);
      return;
    }
    setFieldErrors({});

    const payload: InventoryItemCreatePayload = {
      sku: draft.sku,
      name: draft.name,
      unit: draft.unit,
      minQuantity: draft.minQuantity,
      maxQuantity: draft.maxQuantity,
      leadTimeDays: draft.leadTimeDays,
      safetyStock: draft.safetyStock,
      itemType,
      isFuel,
      // Preços em Decimal(12,2); EQUIPAMENTO grava null (não tem compra/venda).
      purchasePrice: isProduct ? draft.purchasePrice ?? null : null,
      salePrice: isProduct ? draft.salePrice ?? null : null,
      description: draft.description ?? null,
    };

    setSaving(true);
    try {
      if (isEdit && item) {
        const updated = await updateInventoryItem(context, item.id, payload);
        onSaved(updated ?? undefined);
      } else {
        const created = await createInventoryItem(context, payload);
        onSaved(created ?? undefined);
      }
    } catch (error) {
      // 409 duplicate_sku → mensagem sob o SKU (+ Alerta).
      const feedback = interpretInventoryItemSubmitError(error);
      if (feedback.field) {
        setFieldErrors((prev) => ({ ...prev, [feedback.field as InventoryItemField]: feedback.message }));
        focusField(feedback.field as InventoryItemField);
      }
      setServerError(feedback.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive() {
    if (!item) return;
    setTogglingActive(true);
    setServerError(null);
    try {
      const updated = await updateInventoryItem(context, item.id, { isActive: !item.isActive });
      onSaved(updated ?? undefined);
    } catch {
      setServerError(`Não foi possível ${item.isActive ? "inativar" : "reativar"} o item. Tente novamente.`);
    } finally {
      setTogglingActive(false);
    }
  }

  const title = isEdit ? "Item" : "Novo item";

  return (
    <Modal title={title} open onClose={onClose}>
      {isEdit && item ? (
        <>
          <div style={statusRowStyle}>
            <Chip tone={item.isActive ? "success" : "default"}>{item.isActive ? "Ativo" : "Inativo"}</Chip>
            <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}>{item.sku}</span>
          </div>
          <div style={tabBarStyle} role="tablist" aria-label="Seções do item">
            <button type="button" role="tab" aria-selected={tab === "editar"} style={tabButtonStyle(tab === "editar")} onClick={() => setTab("editar")}>
              Editar
            </button>
            <button type="button" role="tab" aria-selected={tab === "resumo"} style={tabButtonStyle(tab === "resumo")} onClick={() => setTab("resumo")}>
              Resumo
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "movimentacao"}
              style={tabButtonStyle(tab === "movimentacao")}
              onClick={() => setTab("movimentacao")}
            >
              Movimentação
            </button>
          </div>
        </>
      ) : null}

      {tab === "resumo" && item ? <ItemResumoTab item={item} /> : null}
      {tab === "movimentacao" && item ? <ItemMovimentacaoTab item={item} context={context} canCreateMovement={canCreateMovement} /> : null}

      {tab === "editar" ? (
        <form onSubmit={handleSubmit} noValidate>
          {serverError ? (
            <Alert title="Não foi possível salvar" tone="danger">
              {serverError}
            </Alert>
          ) : null}

          <div style={gridStyle}>
            <Field
              id={FIELD_ID.sku}
              label="Código (SKU)"
              required
              value={sku}
              onChange={setSku}
              error={fieldErrors.sku}
              maxLength={60}
              helper="Código único do item nesta organização. Ex.: ELE-0021"
            />

            <div>
              <Select
                id={FIELD_ID.itemType}
                label="Tipo *"
                value={itemType}
                onChange={(event) => setItemType(event.target.value as InventoryItemType)}
              >
                {INVENTORY_ITEM_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>

            <div style={fullWidth}>
              <Field
                id={FIELD_ID.name}
                label="Nome"
                required
                value={name}
                onChange={setName}
                error={fieldErrors.name}
                maxLength={160}
                helper="Nome do item como aparece nas listas e movimentações."
              />
            </div>

            <Field
              id={FIELD_ID.unit}
              label="Unidade"
              required
              value={unit}
              onChange={setUnit}
              error={fieldErrors.unit}
              maxLength={12}
              helper="Ex.: un, m, kg, L"
            />

            <Field
              id={FIELD_ID.minQuantity}
              label="Estoque mínimo"
              value={minQuantity}
              onChange={setMinQuantity}
              error={fieldErrors.minQuantity}
              maxLength={16}
              inputMode="decimal"
              helper="Abaixo deste saldo o item entra em reposição."
            />

            <Field
              id={FIELD_ID.maxQuantity}
              label="Estoque máximo"
              value={maxQuantity}
              onChange={setMaxQuantity}
              error={fieldErrors.maxQuantity}
              maxLength={16}
              inputMode="decimal"
              helper="Opcional. Teto de armazenagem."
            />

            {isProduct ? (
              <>
                <Field
                  id={FIELD_ID.purchasePrice}
                  label="Compra (R$)"
                  value={purchasePrice}
                  onChange={setPurchasePrice}
                  error={fieldErrors.purchasePrice}
                  maxLength={16}
                  inputMode="decimal"
                  helper="Opcional. Preço de compra do item."
                />
                <Field
                  id={FIELD_ID.salePrice}
                  label="Venda (R$)"
                  value={salePrice}
                  onChange={setSalePrice}
                  error={fieldErrors.salePrice}
                  maxLength={16}
                  inputMode="decimal"
                  helper="Opcional. Preço de venda do item."
                />
              </>
            ) : null}

            <Field
              id={FIELD_ID.leadTimeDays}
              label="Lead time (dias)"
              value={leadTimeDays}
              onChange={setLeadTimeDays}
              error={fieldErrors.leadTimeDays}
              maxLength={5}
              inputMode="numeric"
              helper="Opcional. Prazo médio de reposição."
            />

            <Field
              id={FIELD_ID.safetyStock}
              label="Estoque de segurança"
              value={safetyStock}
              onChange={setSafetyStock}
              error={fieldErrors.safetyStock}
              maxLength={16}
              inputMode="decimal"
              helper="Opcional. Reserva contra variação de demanda."
            />

            <div style={fullWidth}>
              <label className="ui-field">
                <span>Descrição</span>
                <textarea
                  id={FIELD_ID.description}
                  className="ui-input"
                  style={{ minHeight: 64, padding: "var(--space-10)", resize: "vertical" }}
                  rows={2}
                  value={description}
                  maxLength={2000}
                  onChange={(event) => setDescription(event.target.value)}
                />
                <small>Opcional.</small>
              </label>
            </div>

            <div style={fullWidth}>
              <Checkbox label="É combustível" checked={isFuel} onChange={(event) => setIsFuel(event.target.checked)} />
            </div>

            <p style={noteStyle}>
              <Info size={16} aria-hidden /> O saldo é calculado pelas movimentações (não é editável aqui) e o custo médio é atualizado a cada
              entrada. Cadastrar um item não cria saldo — o saldo só entra por uma Entrada.
            </p>
          </div>

          <footer style={footerStyle}>
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving || togglingActive}>
              Cancelar
            </Button>
            {isEdit && item ? (
              <Button type="button" variant="secondary" onClick={() => void toggleActive()} disabled={saving || togglingActive}>
                {togglingActive ? "Salvando…" : item.isActive ? "Inativar" : "Reativar"}
              </Button>
            ) : null}
            <Button type="submit" disabled={saving || togglingActive}>
              {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar item"}
            </Button>
          </footer>
        </form>
      ) : null}
    </Modal>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  required,
  maxLength,
  inputMode,
  helper,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string;
  readonly required?: boolean;
  readonly maxLength?: number;
  readonly inputMode?: "numeric" | "decimal";
  readonly helper?: string;
}) {
  return (
    <div>
      <Input
        id={id}
        label={required ? `${label} *` : label}
        value={value}
        maxLength={maxLength}
        inputMode={inputMode}
        helper={helper}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? (
        <small className="form-error" id={`${id}-error`}>
          {error}
        </small>
      ) : null}
    </div>
  );
}

function focusField(field: InventoryItemField) {
  if (typeof document === "undefined" || typeof document.getElementById !== "function") return;
  const id = FIELD_ID[field];
  if (!id) return;
  const element = document.getElementById(id);
  if (element && typeof (element as HTMLElement).focus === "function") {
    (element as HTMLElement).focus();
  }
}

export default InventoryItemFormModal;
