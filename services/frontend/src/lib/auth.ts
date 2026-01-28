import { headers } from "next/headers";
import type { AuthUser, UserRole } from "@/types";

export async function getCurrentUser(): Promise<AuthUser | null> {
  const headersList = await headers();
  const username = headersList.get("x-auth-user");
  const rolesHeader = headersList.get("x-auth-roles");

  if (!username) {
    return null;
  }

  const roles = rolesHeader
    ? (rolesHeader.split(",").filter(Boolean) as UserRole[])
    : [];

  return { username, roles };
}

export async function hasRole(role: UserRole): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  return user.roles.includes(role);
}

export async function requireRole(role: UserRole): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Authentication required");
  }
  if (!user.roles.includes(role)) {
    throw new Error(`Role '${role}' required`);
  }
  return user;
}
