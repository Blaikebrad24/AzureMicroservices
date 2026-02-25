import { listData } from "@/actions/data-actions";
import { formatDate } from "@/lib/utils";
import RoleGate from "@/components/role-gate";
import type { DataEntity, Page } from "@/types/api";

export default async function DataPage() {
  let data: Page<DataEntity> | null = null;
  try {
    data = await listData(0, 20);
  } catch {
    // Service may not be available
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Data Management</h2>
        <RoleGate allowedRoles={["admin", "editor"]}>
          <button className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/20 transition-all hover:from-blue-500 hover:to-blue-600">
            Create Record
          </button>
        </RoleGate>
      </div>

      <div className="mt-6 rounded-xl border border-blue-700/30 bg-gradient-to-br from-blue-900/40 to-slate-900/40 backdrop-blur-sm">
        {!data || data.content.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-blue-200">
            No data records found. Create a record to get started.
          </p>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-blue-700/30 text-left text-xs font-medium uppercase text-blue-300">
                  <th className="px-6 py-3">ID</th>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {data.content.map((entity) => (
                  <tr
                    key={entity.id}
                    className="border-b border-blue-800/20 text-sm text-blue-100"
                  >
                    <td className="px-6 py-3 font-mono text-xs text-blue-300">
                      {entity.id}
                    </td>
                    <td className="px-6 py-3 font-medium text-white">{entity.name}</td>
                    <td className="px-6 py-3">{entity.category ?? "—"}</td>
                    <td className="px-6 py-3 max-w-xs truncate">
                      {entity.description ?? "—"}
                    </td>
                    <td className="px-6 py-3">
                      {formatDate(entity.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-blue-700/30 px-6 py-3 text-sm text-blue-200">
              Page {data.number + 1} of {data.totalPages} ({data.totalElements}{" "}
              total records)
            </div>
          </>
        )}
      </div>
    </div>
  );
}
