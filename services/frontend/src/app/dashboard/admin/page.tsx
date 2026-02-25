import { requireRole } from "@/lib/auth";

export default async function AdminPage() {
  const user = await requireRole("admin");

  return (
    <div>
      <h2 className="text-2xl font-bold text-white">Admin Panel</h2>
      <p className="mt-1 text-sm text-blue-200">
        Logged in as {user.username} with admin privileges
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* User Management */}
        <div className="rounded-xl border border-blue-700/30 bg-gradient-to-br from-blue-900/40 to-slate-900/40 p-6 backdrop-blur-sm">
          <h3 className="text-lg font-medium text-white">
            User Management
          </h3>
          <p className="mt-1 text-sm text-blue-200">
            Manage users and roles via Keycloak admin console
          </p>
          <a
            href="http://localhost:8080/admin/app-realm/console/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-sm font-medium text-blue-400 hover:text-blue-300"
          >
            Open Keycloak Admin →
          </a>
        </div>

        {/* System Health */}
        <div className="rounded-xl border border-blue-700/30 bg-gradient-to-br from-blue-900/40 to-slate-900/40 p-6 backdrop-blur-sm">
          <h3 className="text-lg font-medium text-white">System Health</h3>
          <p className="mt-1 text-sm text-blue-200">
            Monitor backend service health endpoints
          </p>
          <div className="mt-4 space-y-2 text-sm">
            <ServiceHealth name="Blob Service" url="/api/blobs/containers" />
            <ServiceHealth name="Reports Service" url="/api/reports" />
            <ServiceHealth name="Data Service" url="/api/data?size=1" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ServiceHealth({ name, url }: { name: string; url: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-blue-100">{name}</span>
      <span className="text-xs text-blue-400">{url}</span>
    </div>
  );
}
