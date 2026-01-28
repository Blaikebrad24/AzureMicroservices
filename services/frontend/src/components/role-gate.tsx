import { getCurrentUser } from "@/lib/auth";
import type { UserRole } from "@/types";

interface RoleGateProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default async function RoleGate({
  allowedRoles,
  children,
  fallback,
}: RoleGateProps) {
  const user = await getCurrentUser();

  if (!user) {
    return fallback ?? null;
  }

  const hasAccess = user.roles.some((role) => allowedRoles.includes(role));

  if (!hasAccess) {
    return fallback ?? (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <p className="text-sm text-yellow-800">
          You do not have permission to view this content.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
