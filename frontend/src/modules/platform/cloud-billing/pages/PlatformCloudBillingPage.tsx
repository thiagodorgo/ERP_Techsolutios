import {
  AlertTriangle,
  Calculator,
  CloudCog,
  DollarSign,
  FileDown,
  Gauge,
  Play,
  RefreshCcw,
  Save,
  Settings2,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { KpiCard } from "../../../../components/erp";
import { Alert, Badge, Button, Card, Checkbox, EmptyState, ErrorState, Input, Select, Skeleton, Table, Tabs } from "../../../../components/ui";
import { usePermissions } from "../../../../providers/PermissionProvider";
import {
  calculateCloudCharges,
  createCloudChargeRule,
  getCloudAllocationSummary,
  getCloudChargeSummary,
  getCloudCostSummary,
  getCloudUsageSummary,
  importCloudCosts,
  listCloudAllocationRuns,
  listCloudChargeRules,
  listCloudChargeRuns,
  listCloudCostImports,
  runCloudAllocation,
  updateCloudChargeRule,
} from "../cloud-billing.service";
import type {
  CloudAllocationRun,
  CloudAllocationSummary,
  CloudBillingTenantHealth,
  CloudChargeRule,
  CloudChargeRun,
  CloudChargeRuleMetric,
  CloudChargeSummary,
  CloudCostImport,
  CloudCostSummary,
  CloudProvider,
  CloudUsageSummary,
  UpsertCloudChargeRuleInput,
} from "../cloud-billing.types";

type TabId = "overview" | "usage" | "costs" | "allocation" | "charges" | "rules" | "runs";

const tabItems: Array<{ id: TabId; label: string; permissions: string[] }> = [
  {
    id: "overview",
    label: "Visao geral",
    permissions: [
      "platform:cloud-usage:read",
      "platform:cloud-costs:read",
      "platform:cloud-cost-allocation:read",
      "platform:cloud-charges:read",
    ],
  },
  { id: "usage", label: "Uso", permissions: ["platform:cloud-usage:read"] },
  { id: "costs", label: "Custos AWS", permissions: ["platform:cloud-costs:read"] },
  { id: "allocation", label: "Rateio", permissions: ["platform:cloud-cost-allocation:read"] },
  { id: "charges", label: "Cobranca", permissions: ["platform:cloud-charges:read"] },
  { id: "rules", label: "Regras", permissions: ["platform:cloud-charge-rules:read"] },
  {
    id: "runs",
    label: "Runs",
    permissions: ["platform:cloud-cost-allocation:read", "platform:cloud-charges:read"],
  },
];

const emptyRuleForm: UpsertCloudChargeRuleInput = {
  name: "",
  provider: "aws",
  metric: "allocated_cost",
  markupPercent: 25,
  active: true,
};

export function PlatformCloudBillingPage() {
  const { hasAny, can } = usePermissions();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [usage, setUsage] = useState<CloudUsageSummary | null>(null);
  const [costs, setCosts] = useState<CloudCostSummary | null>(null);
  const [costImports, setCostImports] = useState<CloudCostImport[]>([]);
  const [allocation, setAllocation] = useState<CloudAllocationSummary | null>(null);
  const [allocationRuns, setAllocationRuns] = useState<CloudAllocationRun[]>([]);
  const [charges, setCharges] = useState<CloudChargeSummary | null>(null);
  const [chargeRuns, setChargeRuns] = useState<CloudChargeRun[]>([]);
  const [rules, setRules] = useState<CloudChargeRule[]>([]);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleForm, setRuleForm] = useState<UpsertCloudChargeRuleInput>(emptyRuleForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadCloudBilling();
  }, []);

  const activeTabDefinition = tabItems.find((tab) => tab.id === activeTab) ?? tabItems[0];
  const canViewActiveTab = hasAny(activeTabDefinition.permissions);
  const totals = useMemo(
    () => ({
      tenants: usage?.tenants.length ?? 0,
      totalCost: costs?.totalCost ?? 0,
      margin: charges?.marginPercent ?? 0,
      unallocated: allocation?.unallocatedCost ?? 0,
    }),
    [allocation, charges, costs, usage],
  );
  const overviewRows = useMemo(() => buildOverviewRows(usage, costs, allocation, charges), [allocation, charges, costs, usage]);

  async function loadCloudBilling() {
    setLoading(true);
    setError(null);
    try {
      const [usageSummary, costSummary, imports, allocationSummary, allocationRunList, chargeSummary, chargeRunList, ruleList] =
        await Promise.all([
          getCloudUsageSummary(),
          getCloudCostSummary(),
          listCloudCostImports(),
          getCloudAllocationSummary(),
          listCloudAllocationRuns(),
          getCloudChargeSummary(),
          listCloudChargeRuns(),
          listCloudChargeRules(),
        ]);

      setUsage(usageSummary);
      setCosts(costSummary);
      setCostImports(imports);
      setAllocation(allocationSummary);
      setAllocationRuns(allocationRunList);
      setCharges(chargeSummary);
      setChargeRuns(chargeRunList);
      setRules(ruleList);
    } catch (item) {
      setError(item instanceof Error ? item.message : "Nao foi possivel carregar Cloud Billing.");
    } finally {
      setLoading(false);
    }
  }

  async function handleImportCosts() {
    setActionMessage(null);
    const imported = await importCloudCosts();
    setCostImports((current) => [imported, ...current]);
    setActionMessage("Importacao manual de custos AWS enfileirada.");
  }

  async function handleRunAllocation() {
    setActionMessage(null);
    const run = await runCloudAllocation();
    setAllocationRuns((current) => [run, ...current]);
    setActionMessage("Run de rateio iniciado.");
  }

  async function handleCalculateCharges() {
    setActionMessage(null);
    const sourceAllocationRunId = allocationRuns.find((run) => run.status === "completed")?.id ?? allocationRuns[0]?.id;
    if (!sourceAllocationRunId) {
      setActionMessage("Execute um run de rateio antes de calcular cobranca.");
      return;
    }
    const run = await calculateCloudCharges(sourceAllocationRunId);
    setChargeRuns((current) => [run, ...current]);
    setActionMessage("Calculo de cobranca iniciado.");
  }

  async function handleSaveRule() {
    setFormError(null);
    if (!ruleForm.name.trim()) {
      setFormError("Informe o nome da regra.");
      return;
    }
    if (!Number.isFinite(ruleForm.markupPercent) || ruleForm.markupPercent < 0) {
      setFormError("Markup deve ser maior ou igual a zero.");
      return;
    }

    const saved = editingRuleId
      ? await updateCloudChargeRule(editingRuleId, ruleForm)
      : await createCloudChargeRule(ruleForm);

    setRules((current) => (editingRuleId ? current.map((rule) => (rule.id === saved.id ? saved : rule)) : [saved, ...current]));
    setRuleForm(emptyRuleForm);
    setEditingRuleId(null);
    setActionMessage(editingRuleId ? "Regra atualizada." : "Regra criada.");
  }

  function editRule(rule: CloudChargeRule) {
    setEditingRuleId(rule.id);
    setRuleForm({
      name: rule.name,
      provider: rule.provider,
      metric: rule.metric,
      markupPercent: rule.markupPercent,
      active: rule.active,
      appliesToTenantIds: rule.appliesToTenantIds,
    });
    setActiveTab("rules");
  }

  return (
    <section className="page-stack cloud-billing-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>P04 Console da Plataforma</span>
          <h1>Cloud Billing</h1>
          <p>Uso, custo, rateio e cobranca cloud em escopo exclusivo da plataforma.</p>
        </div>
        <Button variant="secondary" onClick={loadCloudBilling}>
          <RefreshCcw size={16} />
          Atualizar
        </Button>
      </header>

      {actionMessage ? (
        <Alert title="Acao registrada" tone="info">
          {actionMessage}
        </Alert>
      ) : null}

      {loading ? <Skeleton lines={8} /> : null}
      {error ? <ErrorState title="Falha ao carregar Cloud Billing" detail={error} /> : null}

      {!loading && !error ? (
        <>
          <section className="kpi-grid">
            <KpiCard label="Tenants medidos" value={String(totals.tenants)} delta="uso consolidado" tone="info" />
            <KpiCard label="Custo cloud" value={formatMoney(totals.totalCost)} delta="AWS CUR" tone="default" />
            <KpiCard label="Margem media" value={`${formatPercent(totals.margin)}`} delta="cobranca" tone={totals.margin < 10 ? "warning" : "success"} />
            <KpiCard label="Nao rateado" value={formatMoney(totals.unallocated)} delta="exige regra" tone={totals.unallocated > 0 ? "warning" : "success"} />
          </section>

          <Tabs tabs={tabItems} active={activeTab} onChange={(id) => setActiveTab(id as TabId)} />

          {!canViewActiveTab ? <PermissionDenied permissions={activeTabDefinition.permissions} /> : null}
          {canViewActiveTab && activeTab === "overview" ? <OverviewTab rows={overviewRows} /> : null}
          {canViewActiveTab && activeTab === "usage" ? <UsageTab usage={usage} /> : null}
          {canViewActiveTab && activeTab === "costs" ? (
            <CostsTab costs={costs} imports={costImports} canImport={can("platform:cloud-costs:import")} onImport={handleImportCosts} />
          ) : null}
          {canViewActiveTab && activeTab === "allocation" ? (
            <AllocationTab allocation={allocation} canRun={can("platform:cloud-cost-allocation:run")} onRun={handleRunAllocation} />
          ) : null}
          {canViewActiveTab && activeTab === "charges" ? (
            <ChargesTab charges={charges} canCalculate={can("platform:cloud-charges:calculate")} onCalculate={handleCalculateCharges} />
          ) : null}
          {canViewActiveTab && activeTab === "rules" ? (
            <RulesTab
              rules={rules}
              form={ruleForm}
              formError={formError}
              editingRuleId={editingRuleId}
              canWrite={can("platform:cloud-charge-rules:write")}
              onEdit={editRule}
              onSave={handleSaveRule}
              onFormChange={setRuleForm}
              onCancel={() => {
                setEditingRuleId(null);
                setRuleForm(emptyRuleForm);
                setFormError(null);
              }}
            />
          ) : null}
          {canViewActiveTab && activeTab === "runs" ? <RunsTab allocationRuns={allocationRuns} chargeRuns={chargeRuns} /> : null}
        </>
      ) : null}
    </section>
  );
}

function OverviewTab({ rows }: { rows: OverviewRow[] }) {
  if (rows.length === 0) {
    return <EmptyState title="Nenhum dado consolidado" detail="Execute importacao, rateio e calculo para preencher a visao geral." />;
  }

  return (
    <>
      <Alert title="Boundary de plataforma" tone="info">
        Margem, custo e regras de cobranca ficam restritos ao Console da Plataforma e nao aparecem nas telas tenant.
      </Alert>
      <Card title="Saude financeira por tenant">
        <Table
          rows={rows}
          keyForRow={(row) => row.tenantId}
          columns={[
            { key: "tenant", header: "Tenant", render: (row) => <strong>{row.tenantName}</strong> },
            { key: "usage", header: "Uso", render: (row) => `${formatNumber(row.computeHours)} h / ${formatNumber(row.storageGb)} GB` },
            { key: "cost", header: "Custo", render: (row) => formatMoney(row.cost) },
            { key: "allocated", header: "Rateado", render: (row) => formatMoney(row.allocatedCost) },
            { key: "amount", header: "Cobranca", render: (row) => formatMoney(row.amount) },
            { key: "margin", header: "Margem", render: (row) => <Badge tone={row.marginPercent < 10 ? "warning" : "success"}>{formatPercent(row.marginPercent)}</Badge> },
            { key: "health", header: "Estado", render: (row) => <HealthBadge health={row.health} /> },
          ]}
        />
      </Card>
    </>
  );
}

function UsageTab({ usage }: { usage: CloudUsageSummary | null }) {
  if (!usage) return <EmptyState title="Sem resumo de uso" detail="Nenhum dado de uso foi encontrado para o periodo." />;

  return (
    <Card title={`Uso consolidado ${usage.period}`}>
      <Table
        rows={usage.tenants}
        keyForRow={(row) => row.tenantId}
        columns={[
          { key: "tenant", header: "Tenant", render: (row) => <strong>{row.tenantName}</strong> },
          { key: "compute", header: "Compute", render: (row) => `${formatNumber(row.computeHours)} h` },
          { key: "storage", header: "Storage", render: (row) => `${formatNumber(row.storageGb)} GB` },
          { key: "requests", header: "Requests", render: (row) => formatNumber(row.requests) },
          { key: "health", header: "Estado", render: (row) => <HealthBadge health={row.health} /> },
        ]}
      />
    </Card>
  );
}

function CostsTab({
  costs,
  imports,
  canImport,
  onImport,
}: {
  costs: CloudCostSummary | null;
  imports: CloudCostImport[];
  canImport: boolean;
  onImport: () => Promise<void>;
}) {
  return (
    <>
      <Card
        title="Custos AWS"
        action={
          <Button size="sm" disabled={!canImport} onClick={onImport}>
            <FileDown size={14} />
            Importar CUR
          </Button>
        }
      >
        {costs ? (
          <Table
            rows={costs.tenants}
            keyForRow={(row) => row.tenantId}
            columns={[
              { key: "tenant", header: "Tenant", render: (row) => <strong>{row.tenantName}</strong> },
              { key: "cost", header: "Custo", render: (row) => formatMoney(row.cost) },
              { key: "margin", header: "Margem", render: (row) => formatPercent(row.marginPercent) },
              { key: "health", header: "Estado", render: (row) => <HealthBadge health={row.health} /> },
            ]}
          />
        ) : (
          <EmptyState title="Sem custos AWS" detail="Nenhum resumo de custo foi encontrado." />
        )}
      </Card>
      <Card title="Importacoes">
        <Table
          rows={imports}
          keyForRow={(row) => row.id}
          columns={[
            { key: "file", header: "Arquivo", render: (row) => <strong>{row.fileName}</strong> },
            { key: "period", header: "Periodo", render: (row) => row.period },
            { key: "provider", header: "Provider", render: (row) => row.provider.toUpperCase() },
            { key: "records", header: "Registros", render: (row) => formatNumber(row.records) },
            { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
            { key: "error", header: "Erro", render: (row) => row.errorMessage ?? "-" },
          ]}
        />
      </Card>
    </>
  );
}

function AllocationTab({
  allocation,
  canRun,
  onRun,
}: {
  allocation: CloudAllocationSummary | null;
  canRun: boolean;
  onRun: () => Promise<void>;
}) {
  return (
    <Card
      title="Rateio de custos"
      action={
        <Button size="sm" disabled={!canRun} onClick={onRun}>
          <Play size={14} />
          Rodar rateio
        </Button>
      }
    >
      {allocation ? (
        <Table
          rows={allocation.tenants}
          keyForRow={(row) => row.tenantId}
          columns={[
            { key: "tenant", header: "Tenant", render: (row) => <strong>{row.tenantName}</strong> },
            { key: "allocated", header: "Custo rateado", render: (row) => formatMoney(row.allocatedCost) },
            { key: "rule", header: "Regra", render: (row) => row.ruleKey ?? "Sem regra" },
            { key: "health", header: "Estado", render: (row) => <HealthBadge health={row.health} /> },
          ]}
        />
      ) : (
        <EmptyState title="Sem rateio" detail="Nenhum resumo de rateio foi encontrado." />
      )}
    </Card>
  );
}

function ChargesTab({
  charges,
  canCalculate,
  onCalculate,
}: {
  charges: CloudChargeSummary | null;
  canCalculate: boolean;
  onCalculate: () => Promise<void>;
}) {
  return (
    <Card
      title="Cobranca cloud"
      action={
        <Button size="sm" disabled={!canCalculate} onClick={onCalculate}>
          <Calculator size={14} />
          Calcular cobranca
        </Button>
      }
    >
      {charges ? (
        <Table
          rows={charges.tenants}
          keyForRow={(row) => row.tenantId}
          columns={[
            { key: "tenant", header: "Tenant", render: (row) => <strong>{row.tenantName}</strong> },
            { key: "amount", header: "Valor", render: (row) => formatMoney(row.amount) },
            { key: "cost", header: "Custo", render: (row) => formatMoney(row.netCost) },
            { key: "margin", header: "Margem", render: (row) => <Badge tone={row.marginPercent < 10 ? "warning" : "success"}>{formatPercent(row.marginPercent)}</Badge> },
            { key: "health", header: "Estado", render: (row) => <HealthBadge health={row.health} /> },
          ]}
        />
      ) : (
        <EmptyState title="Sem cobranca" detail="Nenhum resumo de cobranca foi encontrado." />
      )}
    </Card>
  );
}

function RulesTab({
  rules,
  form,
  formError,
  editingRuleId,
  canWrite,
  onEdit,
  onSave,
  onFormChange,
  onCancel,
}: {
  rules: CloudChargeRule[];
  form: UpsertCloudChargeRuleInput;
  formError: string | null;
  editingRuleId: string | null;
  canWrite: boolean;
  onEdit: (rule: CloudChargeRule) => void;
  onSave: () => Promise<void>;
  onFormChange: (form: UpsertCloudChargeRuleInput) => void;
  onCancel: () => void;
}) {
  return (
    <div className="cloud-billing-rules">
      <Card title="Regras de cobranca">
        {rules.length === 0 ? (
          <EmptyState title="Nenhuma regra cadastrada" detail="Crie uma regra para habilitar calculos de cobranca." />
        ) : (
          <Table
            rows={rules}
            keyForRow={(row) => row.id}
            columns={[
              { key: "name", header: "Regra", render: (row) => <strong>{row.name}</strong> },
              { key: "provider", header: "Provider", render: (row) => row.provider.toUpperCase() },
              { key: "metric", header: "Metrica", render: (row) => row.metric },
              { key: "markup", header: "Markup", render: (row) => formatPercent(row.markupPercent) },
              { key: "active", header: "Status", render: (row) => <Badge tone={row.active ? "success" : "default"}>{row.active ? "ativa" : "inativa"}</Badge> },
              {
                key: "actions",
                header: "Acoes",
                render: (row) => (
                  <Button size="sm" variant="secondary" disabled={!canWrite} onClick={() => onEdit(row)}>
                    <Settings2 size={14} />
                    Editar
                  </Button>
                ),
              },
            ]}
          />
        )}
      </Card>
      <Card title={editingRuleId ? "Editar regra" : "Nova regra"}>
        {formError ? (
          <Alert title="Validacao" tone="warning">
            {formError}
          </Alert>
        ) : null}
        <div className="cloud-billing-form">
          <Input
            label="Nome"
            value={form.name}
            disabled={!canWrite}
            onChange={(event) => onFormChange({ ...form, name: event.target.value })}
          />
          <Select
            label="Provider"
            value={form.provider}
            disabled={!canWrite}
            onChange={(event) => onFormChange({ ...form, provider: event.target.value as CloudProvider })}
          >
            <option value="aws">AWS</option>
            <option value="azure">Azure</option>
            <option value="gcp">GCP</option>
          </Select>
          <Select
            label="Metrica"
            value={form.metric}
            disabled={!canWrite}
            onChange={(event) => onFormChange({ ...form, metric: event.target.value as CloudChargeRuleMetric })}
          >
            <option value="allocated_cost">Custo rateado</option>
            <option value="compute_hours">Compute hours</option>
            <option value="storage_gb">Storage GB</option>
            <option value="requests">Requests</option>
          </Select>
          <Input
            label="Markup %"
            type="number"
            min={0}
            value={String(form.markupPercent)}
            disabled={!canWrite}
            onChange={(event) => onFormChange({ ...form, markupPercent: Number(event.target.value) })}
          />
          <Checkbox
            label="Regra ativa"
            checked={form.active}
            disabled={!canWrite}
            onChange={(event) => onFormChange({ ...form, active: event.target.checked })}
          />
          <div className="cloud-billing-form__actions">
            <Button disabled={!canWrite} onClick={onSave}>
              <Save size={14} />
              Salvar regra
            </Button>
            {editingRuleId ? (
              <Button variant="secondary" onClick={onCancel}>
                Cancelar
              </Button>
            ) : null}
          </div>
        </div>
      </Card>
    </div>
  );
}

function RunsTab({ allocationRuns, chargeRuns }: { allocationRuns: CloudAllocationRun[]; chargeRuns: CloudChargeRun[] }) {
  const rows = [
    ...allocationRuns.map((run) => ({
      id: run.id,
      type: "Rateio",
      status: run.status,
      period: run.period,
      startedAt: run.startedAt,
      result: `${formatMoney(run.allocatedCost)} rateado`,
      errorMessage: run.errorMessage,
    })),
    ...chargeRuns.map((run) => ({
      id: run.id,
      type: "Cobranca",
      status: run.status,
      period: run.period,
      startedAt: run.startedAt,
      result: `${formatMoney(run.grossAmount)} calculado`,
      errorMessage: run.errorMessage,
    })),
  ].sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  return (
    <Card title="Runs operacionais">
      <Table
        rows={rows}
        keyForRow={(row) => row.id}
        columns={[
          { key: "type", header: "Tipo", render: (row) => row.type },
          { key: "period", header: "Periodo", render: (row) => row.period },
          { key: "started", header: "Inicio", render: (row) => formatDateTime(row.startedAt) },
          { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
          { key: "result", header: "Resultado", render: (row) => row.result },
          { key: "error", header: "Erro", render: (row) => row.errorMessage ?? "-" },
        ]}
      />
    </Card>
  );
}

function PermissionDenied({ permissions }: { permissions: string[] }) {
  return (
    <ErrorState
      title="Permissao insuficiente"
      detail={`Esta aba exige uma destas permissoes: ${permissions.join(", ")}.`}
    />
  );
}

function HealthBadge({ health }: { health: CloudBillingTenantHealth }) {
  const data: Record<CloudBillingTenantHealth, { label: string; tone: "success" | "warning" | "danger" | "pending" }> = {
    healthy: { label: "saudavel", tone: "success" },
    high_cost: { label: "custo alto", tone: "warning" },
    unallocated: { label: "nao rateado", tone: "pending" },
    missing_rule: { label: "sem regra", tone: "danger" },
  };
  return <Badge tone={data[health].tone}>{data[health].label}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const tone = status === "completed" ? "success" : status === "failed" ? "danger" : "pending";
  return <Badge tone={tone}>{status}</Badge>;
}

type OverviewRow = {
  tenantId: string;
  tenantName: string;
  computeHours: number;
  storageGb: number;
  cost: number;
  allocatedCost: number;
  amount: number;
  marginPercent: number;
  health: CloudBillingTenantHealth;
};

function buildOverviewRows(
  usage: CloudUsageSummary | null,
  costs: CloudCostSummary | null,
  allocation: CloudAllocationSummary | null,
  charges: CloudChargeSummary | null,
): OverviewRow[] {
  return (usage?.tenants ?? []).map((tenant) => {
    const cost = costs?.tenants.find((item) => item.tenantId === tenant.tenantId);
    const allocated = allocation?.tenants.find((item) => item.tenantId === tenant.tenantId);
    const charge = charges?.tenants.find((item) => item.tenantId === tenant.tenantId);

    return {
      tenantId: tenant.tenantId,
      tenantName: tenant.tenantName,
      computeHours: tenant.computeHours,
      storageGb: tenant.storageGb,
      cost: cost?.cost ?? 0,
      allocatedCost: allocated?.allocatedCost ?? 0,
      amount: charge?.amount ?? 0,
      marginPercent: charge?.marginPercent ?? cost?.marginPercent ?? 0,
      health: readWorstHealth([tenant.health, cost?.health, allocated?.health, charge?.health]),
    };
  });
}

function readWorstHealth(values: Array<CloudBillingTenantHealth | undefined>): CloudBillingTenantHealth {
  const order: CloudBillingTenantHealth[] = ["missing_rule", "unallocated", "high_cost", "healthy"];
  return order.find((health) => values.includes(health)) ?? "healthy";
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatPercent(value: number): string {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value)}%`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value);
}

function formatDateTime(value: string): ReactNode {
  return new Date(value).toLocaleString("pt-BR");
}
