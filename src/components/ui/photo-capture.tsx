"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, Upload, X, Loader2, Crop } from "lucide-react";
import { ImageCropper } from "@/components/ui/image-cropper";

export function PhotoCapture({
  value,
  onChange,
  folder = "customers",
  label = "Customer Photo",
}: {
  value?: string;
  onChange: (url: string | undefined) => void;
  folder?: string;
  label?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [liveOpen, setLiveOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
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
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      setLiveOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);
    } catch (e: any) {
      toast.error(e?.message || "Cannot access camera");
    }
  }

  function closeCamera() {
    stopStream();
    setLiveOpen(false);
  }

  async function captureFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        // Stop the camera and open the cropper instead of uploading immediately.
        stopStream();
        setLiveOpen(false);
        setEditSrc(URL.createObjectURL(blob));
      },
      "image/jpeg",
      0.92
    );
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
      onChange(json.data.url);
      toast.success("Photo saved");
    } finally {
      setUploading(false);
    }
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = "";
    // Send through the cropper too.
    setEditSrc(URL.createObjectURL(f));
  }

  async function handleCropDone(blob: Blob) {
    const url = editSrc;
    setEditSrc(null);
    if (url) URL.revokeObjectURL(url);
    await uploadBlob(blob, "photo.jpg");
  }

  function handleCropCancel() {
    if (editSrc) URL.revokeObjectURL(editSrc);
    setEditSrc(null);
  }

  async function editExisting() {
    if (!value) return;
    try {
      const res = await fetch(value);
      const blob = await res.blob();
      setEditSrc(URL.createObjectURL(blob));
    } catch {
      toast.error("Could not load image for editing");
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">{label}</div>

      {editSrc ? (
        <ImageCropper
          src={editSrc}
          aspect={3 / 4}
          onCrop={handleCropDone}
          onCancel={handleCropCancel}
        />
      ) : value ? (
        <div className="flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Captured"
            className="h-36 w-28 rounded-md border object-cover"
          />
          <div className="flex flex-col gap-2">
            <Button type="button" variant="outline" size="sm" onClick={startCamera}>
              <RefreshCw className="h-4 w-4" /> Retake
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={editExisting}>
              <Crop className="h-4 w-4" /> Edit / Crop
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(undefined)}
            >
              <X className="h-4 w-4" /> Remove
            </Button>
          </div>
        </div>
      ) : liveOpen ? (
        <div className="space-y-2">
          <video
            ref={videoRef}
            playsInline
            muted
            className="aspect-[4/3] w-full max-w-sm rounded-md border bg-black"
          />
          <div className="flex gap-2">
            <Button type="button" onClick={captureFrame} disabled={uploading}>
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              Capture
            </Button>
            <Button type="button" variant="outline" onClick={closeCamera}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={startCamera} disabled={uploading}>
            <Camera className="h-4 w-4" /> Live Capture
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Upload Photo
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileChange}
          />
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
