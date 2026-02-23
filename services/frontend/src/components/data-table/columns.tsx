"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { BlobMetadata } from "@/types/api";
import { formatBytes, formatDate } from "@/lib/utils";

export const blobColumns: ColumnDef<BlobMetadata>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("name")}</span>
    ),
  },
  {
    accessorKey: "containerName",
    header: "Container",
  },
  {
    accessorKey: "contentLength",
    header: "Size",
    cell: ({ row }) => formatBytes(row.getValue("contentLength")),
  },
  {
    accessorKey: "contentType",
    header: "Type",
  },
  {
    accessorKey: "lastModified",
    header: "Last Modified",
    cell: ({ row }) => {
      const value = row.getValue("lastModified") as string;
      return value ? formatDate(value) : "\u2014";
    },
  },
];
