import { requireRole } from "@/lib/auth";

export default async function AdminPage() {
  const user = await requireRole("admin");

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Admin Panel</h2>
      <p className="mt-1 text-sm text-gray-500">
        Logged in as {user.username} with admin privileges
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* User Management */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-medium text-gray-900">
            User Management
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Manage users and roles via Keycloak admin console
          </p>
          <a
            href="http://localhost:8080/admin/app-realm/console/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            Open Keycloak Admin →
          </a>
        </div>

        {/* System Health */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-medium text-gray-900">System Health</h3>
          <p className="mt-1 text-sm text-gray-500">
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
      <span className="text-gray-700">{name}</span>
      <span className="text-xs text-gray-400">{url}</span>
    </div>
  );
}
