import type { LucideIcon } from "lucide-react";

import {
  // Core / Navegação
  Home,
  LayoutDashboard,
  Menu,
  Search,
  Bell,
  Settings,
  LogOut,
  CircleHelp,
  LifeBuoy,

  // Cadastros / Pessoas
  Building2,
  Users,
  UserRound,
  UserCog,
  Contact,
  IdCard,
  BadgeCheck,

  // Segurança / Permissões
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  LockKeyhole,

  // Estoque / Produtos
  Package,
  Boxes,
  Warehouse,
  Tags,
  Barcode,
  Archive,

  // Vendas / Comercial
  ShoppingCart,
  ShoppingBasket,
  ReceiptText,
  ClipboardList,
  HandCoins,

  // Compras / Fornecedores
  Truck,
  FileCheck2,
  ClipboardCheck,

  // Financeiro
  CircleDollarSign,
  Banknote,
  Wallet,
  CreditCard,
  Landmark,
  Receipt,

  // Relatórios / BI
  ChartColumn,
  ChartPie,
  TrendingUp,
  FileText,
  FileSpreadsheet,
  NotebookText,

  // Operacional / Processos
  Workflow,
  Network,
  Layers,
  Kanban,
  FolderKanban,
  ListChecks,
  History,

  // Tecnologia / Sistema
  Database,
  Server,
  Cloud,
  Cpu,
  Monitor,
  Smartphone,
  Wifi,
  PlugZap,

  // Agenda / Comunicação
  CalendarDays,
  Mail,
  Phone,
  MapPin,
  Globe,

  // Estados / Feedback
  CircleAlert,
  TriangleAlert,
  CheckCircle2,
  XCircle,
  Info,
  LoaderCircle,

  // Ações CRUD
  Plus,
  Pencil,
  Trash2,
  Eye,
  Save,
  Download,
  Upload,
  Filter,
  SlidersHorizontal,
  RefreshCcw,

  // Setas / UI
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  MoreHorizontal,
  MoreVertical,
  X,
  Check,
} from "lucide-react";

export const appIcons = {
  // Navegação principal
  home: Home,
  dashboard: LayoutDashboard,
  menu: Menu,
  search: Search,
  notifications: Bell,
  settings: Settings,
  logout: LogOut,
  help: CircleHelp,
  support: LifeBuoy,

  // Módulos ERP
  companies: Building2,
  customers: Users,
  users: UserRound,
  userSettings: UserCog,
  contacts: Contact,
  documents: IdCard,
  approvals: BadgeCheck,

  // Segurança
  permissions: ShieldCheck,
  securityAlert: ShieldAlert,
  accessKey: KeyRound,
  locked: LockKeyhole,

  // Estoque
  products: Package,
  stock: Boxes,
  warehouse: Warehouse,
  categories: Tags,
  barcode: Barcode,
  archive: Archive,

  // Vendas
  sales: ShoppingCart,
  orders: ShoppingBasket,
  invoices: ReceiptText,
  proposals: ClipboardList,
  commissions: HandCoins,

  // Compras
  suppliers: Truck,
  purchaseOrders: FileCheck2,
  receiving: ClipboardCheck,

  // Financeiro
  finance: CircleDollarSign,
  cash: Banknote,
  wallet: Wallet,
  payments: CreditCard,
  bank: Landmark,
  receipts: Receipt,

  // Relatórios
  reports: ChartColumn,
  analytics: ChartPie,
  growth: TrendingUp,
  textReport: FileText,
  spreadsheet: FileSpreadsheet,
  notes: NotebookText,

  // Processos
  workflow: Workflow,
  network: Network,
  layers: Layers,
  kanban: Kanban,
  projects: FolderKanban,
  tasks: ListChecks,
  history: History,

  // Sistema / Tecnologia
  database: Database,
  server: Server,
  cloud: Cloud,
  cpu: Cpu,
  desktop: Monitor,
  mobile: Smartphone,
  connection: Wifi,
  integration: PlugZap,

  // Comunicação
  calendar: CalendarDays,
  email: Mail,
  phone: Phone,
  location: MapPin,
  global: Globe,

  // Estados
  warning: TriangleAlert,
  alert: CircleAlert,
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  loading: LoaderCircle,

  // Ações
  add: Plus,
  edit: Pencil,
  delete: Trash2,
  view: Eye,
  save: Save,
  download: Download,
  upload: Upload,
  filter: Filter,
  adjust: SlidersHorizontal,
  refresh: RefreshCcw,

  // UI
  chevronDown: ChevronDown,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  arrowLeft: ArrowLeft,
  arrowRight: ArrowRight,
  moreHorizontal: MoreHorizontal,
  moreVertical: MoreVertical,
  close: X,
  confirm: Check,
} satisfies Record<string, LucideIcon>;

export type AppIconName = keyof typeof appIcons;