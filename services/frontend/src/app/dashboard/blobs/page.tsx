import { listContainers, listBlobsPaginated } from "@/actions/blob-actions";
import RoleGate from "@/components/role-gate";
import { UploadBlobDialog } from "@/components/upload-blob-dialog";
import { BlobTableClient } from "@/components/data-table/blob-table-client";
import type { BlobMetadata, Page } from "@/types/api";

export default async function BlobsPage() {
  let containers: string[] = [];
  let initialData: Page<BlobMetadata> = {
    content: [],
    totalElements: 0,
    totalPages: 0,
    number: 0,
    size: 20,
    first: true,
    last: true,
  };

  try {
    containers = await listContainers();
  } catch {
    // Service may not be available yet
  }

  try {
    initialData = await listBlobsPaginated(0, 20, "lastModified", "desc");
  } catch {
    // Service may not be available yet
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Blob Storage</h2>
        <RoleGate allowedRoles={["admin", "editor"]}>
          <UploadBlobDialog containers={containers} />
        </RoleGate>
      </div>

      <div className="mt-6">
        {containers.length === 0 && initialData.content.length === 0 ? (
          <p className="text-sm text-gray-500">
            No containers found. Ensure the blob-service is running and Azurite
            is seeded.
          </p>
        ) : (
          <BlobTableClient
            containers={containers}
            initialData={initialData}
          />
        )}
      </div>
    </div>
  );
}
