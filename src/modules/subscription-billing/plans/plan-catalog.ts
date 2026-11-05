// B-ASS-02 — FONTE ÚNICA do catálogo de planos (dev seed) e das chaves de módulo válidas.
// Os 6 planos são SEM versão e SEM preço (preço é do dono, cadastrado na tela T1 — §4.2).
// `prisma/seed.ts` consome SUBSCRIPTION_PLAN_SEEDS; a migração de dados M1-d usa a mesma lista
// literal e foi autorizada pelo dono em 05/11 (~02:00 SP). As chaves de módulo vêm do moduleCatalog da
// plataforma (fonte única de key→label) via mapTenantModuleFlags([]), sem duplicar a lista.

import { mapTenantModuleFlags } from "../../platform/platform-modules.service.js";
import type { PlanKind } from "./plan-types.js";

export type SubscriptionPlanSeed = {
  readonly code: string;
  readonly kind: PlanKind;
  readonly name: string;
  readonly description: string;
  readonly active: boolean;
};

export const SUBSCRIPTION_PLAN_SEEDS: readonly SubscriptionPlanSeed[] = [
  {
    code: "starter",
    kind: "base",
    name: "Starter",
    description: "Core, cadastros, ordens de servico, painel basico, financeiro basico e relatorios basicos.",
    active: true,
  },
  {
    code: "professional",
    kind: "base",
    name: "Professional",
    description: "Mobile, estoque, frota, checklists, orcamento, faturamento e alertas.",
    active: true,
  },
  {
    code: "business",
    kind: "base",
    name: "Business",
    description: "Estoque por viatura, manutencao, multas, remuneracoes, pre-faturamento e integracoes.",
    active: true,
  },
  {
    code: "enterprise",
    kind: "base",
    name: "Enterprise",
    description: "IA, SSO, auditoria avancada, BI, isolamento premium, regras complexas e ESG.",
    active: true,
  },
  {
    code: "tracking_basic",
    kind: "addon_tracking",
    name: "Rastreamento Basico",
    description: "Add-on de rastreamento com posicao.",
    active: true,
  },
  {
    code: "tracking_plus",
    kind: "addon_tracking",
    name: "Rastreamento Plus",
    description: "Add-on de rastreamento com eventos e telemetria.",
    active: true,
  },
];

// Chaves de módulo VÁLIDAS — derivadas do moduleCatalog da plataforma (uma fonte, sem divergência).
// `mapTenantModuleFlags([])` devolve o catálogo inteiro com a flag enabled=false; extraímos as chaves.
export const PLAN_MODULE_KEYS: readonly string[] = mapTenantModuleFlags([]).map((module) => module.key);

export const PLAN_MODULE_KEY_SET: ReadonlySet<string> = new Set(PLAN_MODULE_KEYS);
