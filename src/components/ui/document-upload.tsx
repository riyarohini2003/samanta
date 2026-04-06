"use client";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Upload, X, FileText, Loader2 } from "lucide-react";

export type UploadedDoc = {
  type: string;
  url: string;
  name?: string;
};

/** Single fixed-slot document uploader (e.g. "Aadhaar Front"). */
export function DocumentSlot({
  label,
  type,
  value,
  onChange,
  folder = "customer-docs",
  accept = "image/*,application/pdf",
}: {
  label: string;
  type: string;
  value?: UploadedDoc;
  onChange: (doc: UploadedDoc | undefined) => void;
  folder?: string;
  accept?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("folder", folder);
      const res = await fetch("/api/v1/uploads", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Upload failed");
        return;
      }
      onChange({ type, url: json.data.url, name: f.name });
      toast.success(`${label} uploaded`);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  const isImage = value?.url && /\.(jpg|jpeg|png|webp|gif)$/i.test(value.url);

  return (
    <div className="rounded-md border p-3">
      <div className="mb-2 text-sm font-medium">{label}</div>
      {value ? (
        <div className="flex items-start gap-3">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value.url}
              alt={label}
              className="h-20 w-20 rounded border object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded border bg-muted">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 text-xs">
            <div className="truncate">{value.name || "Uploaded"}</div>
            <a
              href={value.url}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline"
            >
              View
            </a>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(undefined)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Upload
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={onFile}
          />
        </>
      )}
    </div>
  );
}
