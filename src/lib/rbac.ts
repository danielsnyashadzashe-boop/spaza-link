// Role based access control: the roles SpazaLink knows about and what each may do.
// Roles live in each Clerk user's publicMetadata.role (set by an admin, never by the user).

export const ROLES = {
  admin: {
    label: "Platform admin",
    live: true,
    can: ["See every shop, order, product and supplier", "Verify or reject wholesalers and products", "Add products and set prices", "Move orders along the delivery timeline"],
  },
  shop_owner: {
    label: "Shop owner",
    live: true,
    can: ["See and manage only their own shop", "Upload compliance documents", "Order from verified wholesalers", "Download their own Financial Health Report"],
  },
  wholesaler: {
    label: "Wholesaler",
    live: false,
    can: ["Manage their own catalogue and prices", "Update delivery status for their own orders"],
  },
  lender: {
    label: "Bank or lender",
    live: false,
    can: ["View Financial Health Reports a shop owner has chosen to share"],
  },
} as const;

export type Role = keyof typeof ROLES;

/** Anyone without an explicit role is a shop owner: the least privileged live role. */
export function roleOf(metadata: Record<string, unknown> | null | undefined): Role {
  const r = metadata?.role;
  return typeof r === "string" && r in ROLES ? (r as Role) : "shop_owner";
}
