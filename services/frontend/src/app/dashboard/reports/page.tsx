import { listReports } from "@/actions/report-actions";
import { formatDate } from "@/lib/utils";
import RoleGate from "@/components/role-gate";
import type { Report } from "@/types/api";

function StatusBadge({ status }: { status: Report["status"] }) {
  const styles: Record<Report["status"], string> = {
    PENDING: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
    PROCESSING: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
    COMPLETED: "bg-green-500/20 text-green-300 border border-green-500/30",
    FAILED: "bg-red-500/20 text-red-300 border border-red-500/30",
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
        <h2 className="text-2xl font-bold text-white">Reports</h2>
        <RoleGate allowedRoles={["admin", "editor"]}>
          <button className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/20 transition-all hover:from-blue-500 hover:to-blue-600">
            Generate Report
          </button>
        </RoleGate>
      </div>

      <div className="mt-6 rounded-xl border border-blue-700/30 bg-gradient-to-br from-blue-900/40 to-slate-900/40 backdrop-blur-sm">
        {reports.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-blue-200">
            No reports found. Generate a report to get started.
          </p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-blue-700/30 text-left text-xs font-medium uppercase text-blue-300">
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
                  className="border-b border-blue-800/20 text-sm text-blue-100"
                >
                  <td className="px-6 py-3 font-medium text-white">{report.name}</td>
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
