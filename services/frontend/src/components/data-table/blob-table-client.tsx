"use client";

import { useCallback, useState, useTransition } from "react";
import { listBlobsPaginated } from "@/actions/blob-actions";
import type { BlobMetadata, Page } from "@/types/api";
import { DataTable } from "./data-table";
import { blobColumns } from "./columns";

interface BlobTableClientProps {
  containers: string[];
  initialData: Page<BlobMetadata>;
}

const PAGE_SIZE = 20;

export function BlobTableClient({
  containers,
  initialData,
}: BlobTableClientProps) {
  const [data, setData] = useState(initialData);
  const [page, setPage] = useState(initialData.number);
  const [container, setContainer] = useState("");
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const fetchPage = useCallback(
    (newPage: number, newContainer: string, newSearch: string) => {
      startTransition(async () => {
        try {
          const result = await listBlobsPaginated(
            newPage,
            PAGE_SIZE,
            "lastModified",
            "desc",
            newContainer || undefined,
            newSearch || undefined
          );
          setData(result);
          setPage(newPage);
        } catch {
          // Keep current data on error
        }
      });
    },
    []
  );

  const handleContainerChange = (value: string) => {
    setContainer(value);
    fetchPage(0, value, search);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    fetchPage(0, container, value);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Search blobs..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="h-10 w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        />
        <select
          value={container}
          onChange={(e) => handleContainerChange(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <option value="" className="bg-blue-950">All containers</option>
          {containers.map((c) => (
            <option key={c} value={c} className="bg-blue-950">
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className={isPending ? "opacity-50" : ""}>
        <DataTable columns={blobColumns} data={data.content} />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {data.number + 1} of {data.totalPages || 1} ({data.totalElements}{" "}
          total)
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => fetchPage(page - 1, container, search)}
            disabled={data.first || isPending}
            className="inline-flex h-9 items-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => fetchPage(page + 1, container, search)}
            disabled={data.last || isPending}
            className="inline-flex h-9 items-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
