"use client";

import { useRef, useState, useTransition } from "react";
import { uploadBlob } from "@/actions/blob-actions";

interface UploadBlobDialogProps {
  containers: string[];
}

export function UploadBlobDialog({ containers }: UploadBlobDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState(containers[0] ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleSubmit() {
    const file = fileRef.current?.files?.[0];
    if (!file || !selectedContainer) return;

    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      try {
        const result = await uploadBlob(selectedContainer, formData);
        setSuccess(`Uploaded "${result.blobName}" to ${result.containerName}`);
        if (fileRef.current) fileRef.current.value = "";
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/20 transition-all hover:from-blue-500 hover:to-blue-600"
      >
        Upload File
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-blue-700/30 bg-gradient-to-br from-blue-900 to-slate-900 p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-white">Upload File</h3>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-blue-200">
              Container
            </label>
            <select
              value={selectedContainer}
              onChange={(e) => setSelectedContainer(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-blue-700/30 bg-blue-950/50 px-3 py-2 text-sm text-white shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {containers.map((c) => (
                <option key={c} value={c} className="bg-blue-950">
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-200">
              File
            </label>
            <input
              ref={fileRef}
              type="file"
              className="mt-1 block w-full text-sm text-blue-200 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
          {success && (
            <p className="text-sm text-green-400">{success}</p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={() => {
              setOpen(false);
              setError(null);
              setSuccess(null);
            }}
            className="rounded-lg border border-blue-700/30 px-4 py-2 text-sm font-medium text-blue-200 transition-colors hover:bg-blue-800/30 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/20 transition-all hover:from-blue-500 hover:to-blue-600 disabled:opacity-50"
          >
            {isPending ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
