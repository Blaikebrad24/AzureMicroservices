"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { BlobMetadata } from "@/types/api";
import { formatBytes, formatDate } from "@/lib/utils";
import { deleteBlob, getBlobMetadata } from "@/actions/blob-actions";
import {
  MoreHorizontal,
  Download,
  FileSearch,
  Copy,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function BlobActions({ blob }: { blob: BlobMetadata }) {
  const [metadataOpen, setMetadataOpen] = useState(false);
  const [metadata, setMetadata] = useState<BlobMetadata | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDownload = () => {
    // Use the nginx-proxied blob-service endpoint
    const url = `/api/blobs/${blob.containerName}/${encodeURIComponent(blob.name)}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = blob.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleViewMetadata = async () => {
    setMetaLoading(true);
    try {
      const meta = await getBlobMetadata(blob.containerName, blob.name);
      setMetadata(meta);
      setMetadataOpen(true);
    } catch {
      setMetadata(blob);
      setMetadataOpen(true);
    } finally {
      setMetaLoading(false);
    }
  };

  const handleCopyName = async () => {
    await navigator.clipboard.writeText(`${blob.containerName}/${blob.name}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${blob.name}" from ${blob.containerName}?`)) return;
    try {
      await deleteBlob(blob.containerName, blob.name);
      window.location.reload();
    } catch {
      alert("Failed to delete blob");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48 border-blue-700/30 bg-blue-950"
        >
          <DropdownMenuLabel className="text-blue-200">
            Actions
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-blue-800/30" />
          <DropdownMenuItem
            onClick={handleDownload}
            className="text-blue-100 focus:bg-blue-800/30 focus:text-white"
          >
            <Download className="mr-2 h-4 w-4" />
            Download
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleViewMetadata}
            disabled={metaLoading}
            className="text-blue-100 focus:bg-blue-800/30 focus:text-white"
          >
            <FileSearch className="mr-2 h-4 w-4" />
            {metaLoading ? "Loading..." : "View Metadata"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleCopyName}
            className="text-blue-100 focus:bg-blue-800/30 focus:text-white"
          >
            <Copy className="mr-2 h-4 w-4" />
            {copied ? "Copied!" : "Copy Path"}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-blue-800/30" />
          <DropdownMenuItem
            onClick={handleDelete}
            className="text-red-400 focus:bg-red-500/10 focus:text-red-300"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Metadata modal */}
      {metadataOpen && metadata && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setMetadataOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-blue-700/30 bg-gradient-to-br from-blue-900 to-slate-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white">Blob Metadata</h3>
            <div className="mt-4 space-y-3 text-sm">
              <MetaRow label="Name" value={metadata.name} />
              <MetaRow label="Container" value={metadata.containerName} />
              <MetaRow label="Size" value={formatBytes(metadata.contentLength)} />
              <MetaRow label="Content Type" value={metadata.contentType} />
              <MetaRow
                label="Last Modified"
                value={metadata.lastModified ? formatDate(metadata.lastModified) : "—"}
              />
              {metadata.metadata &&
                Object.keys(metadata.metadata).length > 0 && (
                  <div>
                    <p className="mb-1 font-medium text-blue-200">
                      Custom Metadata
                    </p>
                    {Object.entries(metadata.metadata).map(([k, v]) => (
                      <MetaRow key={k} label={k} value={v} />
                    ))}
                  </div>
                )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setMetadataOpen(false)}
                className="rounded-lg border border-blue-700/30 px-4 py-2 text-sm font-medium text-blue-200 transition-colors hover:bg-blue-800/30 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="shrink-0 text-blue-300">{label}</span>
      <span className="truncate text-right text-white">{value}</span>
    </div>
  );
}

export const blobColumns: ColumnDef<BlobMetadata>[] = [
  {
    accessorKey: "name",
    header: "Name",
    size: 280,
    cell: ({ row }) => (
      <span className="font-medium truncate block max-w-[260px]">
        {row.getValue("name")}
      </span>
    ),
  },
  {
    accessorKey: "containerName",
    header: "Container",
    size: 120,
  },
  {
    accessorKey: "contentLength",
    header: "Size",
    size: 90,
    cell: ({ row }) => formatBytes(row.getValue("contentLength")),
  },
  {
    accessorKey: "contentType",
    header: "Type",
    size: 130,
    cell: ({ row }) => (
      <span className="truncate block max-w-[120px]">
        {row.getValue("contentType")}
      </span>
    ),
  },
  {
    accessorKey: "lastModified",
    header: "Last Modified",
    size: 170,
    cell: ({ row }) => {
      const value = row.getValue("lastModified") as string;
      return value ? formatDate(value) : "\u2014";
    },
  },
  {
    id: "actions",
    size: 50,
    cell: ({ row }) => <BlobActions blob={row.original} />,
  },
];
