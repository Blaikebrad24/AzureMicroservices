"use client";

import { useRef, useState, useTransition } from "react";
import { importSchedule } from "@/actions/calendar-actions";
import type { ScheduleUploadRequest } from "@/types/api";
import { Upload } from "lucide-react";

export function ScheduleUploadDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ScheduleUploadRequest | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);
    setPreview(null);
    setParsed(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (!json.weekOf || !Array.isArray(json.shifts)) {
          setError('Invalid format. Expected { "weekOf": "YYYY-MM-DD", "shifts": [...] }');
          return;
        }
        setParsed(json as ScheduleUploadRequest);
        setPreview(`${json.shifts.length} shifts for week of ${json.weekOf}`);
      } catch {
        setError("Invalid JSON file. Please check the format.");
      }
    };
    reader.readAsText(file);
  }

  function handleSubmit() {
    if (!parsed) return;

    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        await importSchedule(parsed);
        setSuccess(`Imported ${parsed.shifts.length} shifts successfully!`);
        setParsed(null);
        setPreview(null);
        if (fileRef.current) fileRef.current.value = "";
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Import failed");
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/20 transition-all hover:from-blue-500 hover:to-blue-600"
      >
        <Upload className="h-4 w-4" />
        Import Schedule
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-blue-700/30 bg-gradient-to-br from-blue-900 to-slate-900 p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-white">Import Schedule</h3>
        <p className="mt-1 text-sm text-blue-300/60">
          Upload a JSON file to replace shifts for a week.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-blue-200">
              Schedule File (.json)
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="mt-1 block w-full text-sm text-blue-200 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-500"
            />
          </div>

          {preview && (
            <div className="rounded-lg border border-blue-500/30 bg-blue-950/30 p-3">
              <p className="text-sm text-blue-200">{preview}</p>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
          {success && <p className="text-sm text-green-400">{success}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={() => {
              setOpen(false);
              setError(null);
              setSuccess(null);
              setPreview(null);
              setParsed(null);
            }}
            className="rounded-lg border border-blue-700/30 px-4 py-2 text-sm font-medium text-blue-200 transition-colors hover:bg-blue-800/30 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || !parsed}
            className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/20 transition-all hover:from-blue-500 hover:to-blue-600 disabled:opacity-50"
          >
            {isPending ? "Importing..." : "Import"}
          </button>
        </div>
      </div>
    </div>
  );
}
