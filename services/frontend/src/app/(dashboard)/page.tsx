import { getCurrentUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">
        Welcome, {user?.username ?? "User"}
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        Data & Engineering Team Dashboard
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Blob Storage Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-medium text-gray-900">Blob Storage</h3>
          <p className="mt-1 text-sm text-gray-500">
            Manage files in Azure Blob Storage
          </p>
          <a
            href="/dashboard/blobs"
            className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            View Storage →
          </a>
        </div>

        {/* Reports Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-medium text-gray-900">Reports</h3>
          <p className="mt-1 text-sm text-gray-500">
            Generate and download reports
          </p>
          <a
            href="/dashboard/reports"
            className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            View Reports →
          </a>
        </div>

        {/* Data Management Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-medium text-gray-900">Data</h3>
          <p className="mt-1 text-sm text-gray-500">
            Browse and manage data records
          </p>
          <a
            href="/dashboard/data"
            className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            View Data →
          </a>
        </div>
      </div>
    </div>
  );
}
