import { Role } from "@prisma/client";

export type DashboardSection = "owner" | "purchase" | "production" | "dispatch";

export function getDashboardSectionsForRole(role: Role): DashboardSection[] {
  switch (role) {
    case "ADMIN":
    case "OWNER":
      return ["owner", "purchase", "production", "dispatch"];
    case "PURCHASE_COORDINATOR":
      return ["purchase"];
    case "PRODUCTION_MANAGER":
      return ["production"];
    case "DISPATCH_MANAGER":
      return ["dispatch"];
    case "ORDER_MANAGER":
    default:
      return [];
  }
}
