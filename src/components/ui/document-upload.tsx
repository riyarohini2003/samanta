"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Upload, X, FileText, Loader2, Camera, Crop } from "lucide-react";
import { ImageCropper } from "@/components/ui/image-cropper";

export type UploadedDoc = {
  type: string;
  url: string;
  name?: string;
};

/** Single fixed-slot document uploader (e.g. "Aadhaar Front") with optional live capture. */
export function DocumentSlot({
  label,
  type,
  value,
  onChange,
  folder = "customer-docs",
  accept = "image/*,application/pdf",
  allowCapture = false,
}: {
  label: string;
  type: string;
  value?: UploadedDoc;
  onChange: (doc: UploadedDoc | undefined) => void;
  folder?: string;
  accept?: string;
  /** Show a "Live Capture" button to take a photo with the camera */
  allowCapture?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [editSrc, setEditSrc] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      stopStream();
      if (editSrc) URL.revokeObjectURL(editSrc);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function startCamera() {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error("Camera not supported in this browser");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);
    } catch (err: any) {
      toast.error(err?.message || "Cannot access camera");
    }
  }

  function closeCamera() {
    stopStream();
    setCameraOpen(false);
  }

  async function captureFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        stopStream();
        setCameraOpen(false);
        setEditSrc(URL.createObjectURL(blob));
      },
      "image/jpeg",
      0.92
    );
  }

  async function handleCropDone(blob: Blob) {
    const url = editSrc;
    setEditSrc(null);
    if (url) URL.revokeObjectURL(url);
    await uploadBlob(blob, `${type.toLowerCase()}_capture.jpg`);
  }

  function handleCropCancel() {
    if (editSrc) URL.revokeObjectURL(editSrc);
    setEditSrc(null);
  }

  async function editExisting() {
    if (!value?.url) return;
    try {
      const res = await fetch(value.url);
      const blob = await res.blob();
      setEditSrc(URL.createObjectURL(blob));
    } catch {
      toast.error("Could not load image for editing");
    }
  }

  async function uploadBlob(blob: Blob, filename: string) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", blob, filename);
      fd.append("folder", folder);
      const res = await fetch("/api/v1/uploads", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Upload failed");
        return;
      }
      onChange({ type, url: json.data.url, name: filename });
      toast.success(`${label} captured`);
    } finally {
      setUploading(false);
    }
  }

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
      {editSrc ? (
        <ImageCropper
          src={editSrc}
          onCrop={handleCropDone}
          onCancel={handleCropCancel}
        />
      ) : value ? (
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
          {isImage && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={editExisting}
              title="Edit / crop"
            >
              <Crop className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(undefined)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : cameraOpen ? (
        <div className="space-y-2">
          <video
            ref={videoRef}
            playsInline
            muted
            className="aspect-video w-full rounded-md border bg-black"
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={captureFrame} disabled={uploading}>
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              Capture
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={closeCamera}>
              Cancel
            </Button>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
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
          {allowCapture && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={startCamera}
              disabled={uploading}
            >
              <Camera className="h-4 w-4" />
              Live Capture
            </Button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={onFile}
          />
        </div>
      )}
    </div>
  );
}
