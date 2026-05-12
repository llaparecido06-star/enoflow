import type { AdminRole } from "@/hooks/useAdminAuth";

/**
 * Capability-based permission matrix.
 * Each capability maps to the minimum role allowed to use it.
 * Use `can(role, capability)` to gate UI items and actions.
 */
export type Capability =
  | "dashboard.view"
  | "wines.view" | "wines.manage"
  | "packages.view" | "packages.manage"
  | "menu.view" | "menu.manage"
  | "stock.view" | "stock.adjust" | "stock.manage"
  | "finance.view"
  | "reservations.view" | "reservations.manage"
  | "crm.view" | "crm.manage"
  | "reviews.view" | "reviews.respond"
  | "loyalty.view" | "loyalty.manage"
  | "events.view" | "events.manage"
  | "import.manage"
  | "staff.view" | "staff.manage"
  | "campaigns.view" | "campaigns.manage"
  | "vouchers.issue"
  | "config.view" | "config.manage_basic" | "config.manage_full"
  | "training.view"
  | "performance.view"
  | "audit.view"
  | "checkin.use";

const HIERARCHY: AdminRole[] = ["staff", "sales", "manager", "owner", "master"];
const rank = (r: AdminRole) => HIERARCHY.indexOf(r);

const MATRIX: Record<Capability, AdminRole> = {
  "dashboard.view": "staff",

  "wines.view": "staff",
  "wines.manage": "manager",
  "packages.view": "staff",
  "packages.manage": "manager",
  "menu.view": "staff",
  "menu.manage": "manager",

  "stock.view": "staff",
  "stock.adjust": "staff", // staff can do +/− on sales only
  "stock.manage": "manager", // full manage / tracking / bulk

  "finance.view": "manager",

  "reservations.view": "staff",
  "reservations.manage": "manager",

  "crm.view": "staff",
  "crm.manage": "manager",

  "reviews.view": "staff",
  "reviews.respond": "manager",

  "loyalty.view": "staff",
  "loyalty.manage": "manager",

  "events.view": "staff",
  "events.manage": "manager",

  "import.manage": "owner",

  "staff.view": "manager",
  "staff.manage": "owner",

  "campaigns.view": "manager",
  "campaigns.manage": "manager",

  "vouchers.issue": "staff",

  "config.view": "manager",
  "config.manage_basic": "manager", // hours, contact
  "config.manage_full": "owner", // branding, languages, LGPD

  "training.view": "staff",
  "performance.view": "manager",
  "audit.view": "owner",
  "checkin.use": "staff",
};

export function can(role: AdminRole | undefined, cap: Capability): boolean {
  if (!role) return false;
  if (role === "master") return true;
  return rank(role) >= rank(MATRIX[cap]);
}

/** Human-readable permission matrix for display in Equipe page */
export const ROLE_LABELS: Record<AdminRole, string> = {
  staff: "Funcionário",
  sales: "Atendente",
  manager: "Gerente",
  owner: "Dono",
  master: "Master",
};

export const PERMISSION_GROUPS: Array<{
  label: string;
  caps: Array<{ key: Capability; label: string }>;
}> = [
  {
    label: "Operacional",
    caps: [
      { key: "dashboard.view", label: "Dashboard / KPIs" },
      { key: "vouchers.issue", label: "Emitir vouchers" },
      { key: "reservations.view", label: "Reservas (visualizar)" },
      { key: "reservations.manage", label: "Reservas (gerenciar slots)" },
      { key: "stock.adjust", label: "Estoque — ajuste de venda" },
      { key: "stock.manage", label: "Estoque — controle total" },
    ],
  },
  {
    label: "Comercial",
    caps: [
      { key: "crm.view", label: "CRM — leads atribuídos" },
      { key: "crm.manage", label: "CRM — todos leads" },
      { key: "campaigns.manage", label: "Campanhas WhatsApp" },
      { key: "events.manage", label: "Eventos" },
      { key: "loyalty.manage", label: "Fidelidade / Pontos" },
    ],
  },
  {
    label: "Catálogo",
    caps: [
      { key: "wines.manage", label: "Vinhos" },
      { key: "packages.manage", label: "Pacotes de degustação" },
      { key: "menu.manage", label: "Cardápio" },
      { key: "reviews.respond", label: "Responder avaliações" },
    ],
  },
  {
    label: "Administração",
    caps: [
      { key: "finance.view", label: "Financeiro" },
      { key: "staff.manage", label: "Equipe" },
      { key: "import.manage", label: "Importação CSV" },
      { key: "config.manage_basic", label: "Config. — horários/contato" },
      { key: "config.manage_full", label: "Config. — marca / idioma / LGPD" },
    ],
  },
];
