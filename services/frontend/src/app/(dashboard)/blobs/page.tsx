import { listContainers, listBlobs } from "@/actions/blob-actions";
import { formatBytes, formatDate } from "@/lib/utils";
import RoleGate from "@/components/role-gate";
import type { BlobMetadata } from "@/types/api";

export default async function BlobsPage() {
  let containers: string[] = [];
  try {
    containers = await listContainers();
  } catch {
    // Service may not be available yet
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Blob Storage</h2>
        <RoleGate allowedRoles={["admin", "editor"]}>
          <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Upload File
          </button>
        </RoleGate>
      </div>

      {containers.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          No containers found. Ensure the blob-service is running and Azurite is
          seeded.
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          {containers.map((container) => (
            <ContainerSection key={container} containerName={container} />
          ))}
        </div>
      )}
    </div>
  );
}

async function ContainerSection({
  containerName,
}: {
  containerName: string;
}) {
  let blobs: BlobMetadata[] = [];
  try {
    blobs = await listBlobs(containerName);
  } catch {
    // Service may not be available
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-6 py-4">
        <h3 className="text-lg font-medium text-gray-900">{containerName}</h3>
        <p className="text-sm text-gray-500">{blobs.length} files</p>
      </div>
      {blobs.length > 0 && (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-500">
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Size</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Last Modified</th>
            </tr>
          </thead>
          <tbody>
            {blobs.map((blob) => (
              <tr
                key={blob.name}
                className="border-b border-gray-50 text-sm text-gray-700"
              >
                <td className="px-6 py-3 font-medium">{blob.name}</td>
                <td className="px-6 py-3">
                  {formatBytes(blob.contentLength)}
                </td>
                <td className="px-6 py-3">{blob.contentType}</td>
                <td className="px-6 py-3">
                  {blob.lastModified ? formatDate(blob.lastModified) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
