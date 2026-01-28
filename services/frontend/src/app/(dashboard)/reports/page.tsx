import { listReports } from "@/actions/report-actions";
import { formatDate } from "@/lib/utils";
import RoleGate from "@/components/role-gate";
import type { Report } from "@/types/api";

function StatusBadge({ status }: { status: Report["status"] }) {
  const styles: Record<Report["status"], string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    PROCESSING: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}

export default async function ReportsPage() {
  let reports: Report[] = [];
  try {
    reports = await listReports();
  } catch {
    // Service may not be available
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Reports</h2>
        <RoleGate allowedRoles={["admin", "editor"]}>
          <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Generate Report
          </button>
        </RoleGate>
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white">
        {reports.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-gray-500">
            No reports found. Generate a report to get started.
          </p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase text-gray-500">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Created</th>
                <th className="px-6 py-3">Generated</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr
                  key={report.id}
                  className="border-b border-gray-50 text-sm text-gray-700"
                >
                  <td className="px-6 py-3 font-medium">{report.name}</td>
                  <td className="px-6 py-3">{report.type}</td>
                  <td className="px-6 py-3">
                    <StatusBadge status={report.status} />
                  </td>
                  <td className="px-6 py-3">{formatDate(report.createdAt)}</td>
                  <td className="px-6 py-3">
                    {report.generatedAt
                      ? formatDate(report.generatedAt)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
