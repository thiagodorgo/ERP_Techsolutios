import {
  Bell,
  Blocks,
  Building2,
  CheckSquare,
  KeyRound,
  Link2,
  Palette,
  ShieldCheck,
  UserRoundCog,
} from "lucide-react";

import type { TenantSettingsCategory, TenantSettingsTheme } from "./types";

export const tenantSettingsCategories: TenantSettingsCategory[] = [
  {
    id: "general",
    title: "Geral",
    description: "Dados básicos da empresa, unidades, contatos e informações fiscais.",
    items: ["Empresa", "Filiais", "Dados fiscais", "Contatos"],
    status: "active",
    icon: Building2,
  },
  {
    id: "appearance",
    title: "Aparência",
    description: "Personalização visual da experiência da empresa.",
    items: ["Tema visual", "Logo", "Densidade da interface", "Preferências visuais"],
    status: "active",
    icon: Palette,
  },
  {
    id: "access",
    title: "Usuários e Acesso",
    description: "Controle de usuários, papéis, permissões e acesso por filial.",
    items: ["Usuários", "Papéis", "Permissões", "Convites", "Filiais por usuário"],
    status: "active",
    icon: UserRoundCog,
  },
  {
    id: "modules",
    title: "Módulos",
    description: "Visualização dos módulos e recursos disponíveis para a empresa conforme plano/assinatura.",
    items: ["Módulos ativos", "Features habilitadas", "Plano atual", "Recursos disponíveis"],
    status: "active",
    icon: Blocks,
  },
  {
    id: "checklists",
    title: "Checklists",
    description: "Configuração de checklists publicados e consumidos por Web/Mobile.",
    items: ["Templates", "Componentes", "Publicações", "Execuções", "Evidências"],
    status: "active",
    icon: CheckSquare,
    path: "/administrator/checklists",
    ctaLabel: "Abrir W02A",
  },
  {
    id: "notifications",
    title: "Notificações",
    description: "Canais e eventos de comunicação da operação.",
    items: ["E-mail", "Push", "Eventos", "WhatsApp futuro"],
    status: "planned",
    icon: Bell,
  },
  {
    id: "integrations",
    title: "Integrações",
    description: "Conectores técnicos e automações externas.",
    items: ["APIs", "Webhooks", "Storage", "Correios/frete futuro"],
    status: "planned",
    icon: Link2,
  },
  {
    id: "security",
    title: "Segurança e Auditoria",
    description: "Políticas de sessão, logs, LGPD e retenção de dados.",
    items: ["Sessões", "Políticas", "Logs", "LGPD", "Retenção de dados"],
    status: "planned",
    icon: ShieldCheck,
  },
];

export const tenantSettingsThemes: TenantSettingsTheme[] = [
  {
    key: "enterprise_blue",
    label: "enterprise_blue",
    use: "gestão administrativa, financeiro, dashboard executivo",
    profile: "seguro, corporativo e limpo",
    colors: ["#12385c", "#1f7bb6", "#eef6fb"],
  },
  {
    key: "tech_dark",
    label: "tech_dark",
    use: "operação técnica, dashboards, supervisório",
    profile: "moderno, técnico e de alto contraste",
    colors: ["#111827", "#38bdf8", "#f8fafc"],
  },
  {
    key: "green_operations",
    label: "green_operations",
    use: "estoque, logística, campo, manutenção e checklists",
    profile: "operacional, prático e orientado à execução",
    colors: ["#14532d", "#22c55e", "#ecfdf5"],
  },
];

export const tenantSettingsPermissionNote = {
  permission: "tenant:manage",
  plannedPermission: "tenant_settings:read",
  icon: KeyRound,
};
