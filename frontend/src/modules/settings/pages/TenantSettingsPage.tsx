import { ArrowRight, Building2 } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge, Card, Chip } from "../../../components/ui";
import {
  tenantSettingsCategories,
  tenantSettingsPermissionNote,
  tenantSettingsThemes,
} from "../settings.mock";

export function TenantSettingsPage() {
  const PermissionIcon = tenantSettingsPermissionNote.icon;

  return (
    <div className="page-stack tenant-settings-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>W03 · Administrador</span>
          <h1>Configurações</h1>
          <p>Centralize preferências, acessos, módulos e padrões operacionais da empresa.</p>
        </div>
        <Badge tone="info">Configuração da empresa</Badge>
      </header>

      <section className="tenant-settings-overview">
        <Card>
          <div className="tenant-settings-callout">
            <Building2 size={24} />
            <div>
              <strong>Central do tenant</strong>
              <p>W03 organiza a navegação de configuração sem duplicar telas especializadas como W02A Checklists.</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="tenant-settings-callout">
            <PermissionIcon size={24} />
            <div>
              <strong>RBAC atual</strong>
              <p>
                Acesso protegido por <code>{tenantSettingsPermissionNote.permission}</code>. Permissão dedicada{" "}
                <code>{tenantSettingsPermissionNote.plannedPermission}</code> fica como pendência backend.
              </p>
            </div>
          </div>
        </Card>
      </section>

      <section className="tenant-settings-grid">
        {tenantSettingsCategories.map((category) => {
          const Icon = category.icon;
          return (
            <article key={category.id} className="tenant-settings-card">
              <header>
                <div>
                  <Icon size={20} />
                  <strong>{category.title}</strong>
                </div>
                <Chip tone={category.status === "active" ? "info" : "pending"}>
                  {category.status === "active" ? "MVP" : "Planejado"}
                </Chip>
              </header>
              <p>{category.description}</p>
              <ul>
                {category.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              {category.path ? (
                <Link to={category.path} className="tenant-settings-link">
                  {category.ctaLabel ?? "Abrir"}
                  <ArrowRight size={14} />
                </Link>
              ) : null}
            </article>
          );
        })}
      </section>

      <Card title="Aparência planejada">
        <div className="tenant-settings-theme-grid">
          {tenantSettingsThemes.map((theme) => (
            <article key={theme.key} className="tenant-settings-theme-card">
              <header>
                <strong>{theme.label}</strong>
                <Chip tone="pending">Visual</Chip>
              </header>
              <div className="tenant-settings-swatches" aria-label={`Paleta ${theme.label}`}>
                {theme.colors.map((color) => (
                  <span key={color} style={{ backgroundColor: color }} />
                ))}
              </div>
              <p>
                <strong>Uso:</strong> {theme.use}.
              </p>
              <p>
                <strong>Perfil:</strong> {theme.profile}.
              </p>
            </article>
          ))}
        </div>
      </Card>
    </div>
  );
}
