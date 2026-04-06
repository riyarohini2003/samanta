"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, Trash2, Upload } from "lucide-react";

export function ProfilePhotoCard({
  initialUrl,
}: {
  initialUrl: string | null;
}) {
  const [photoUrl, setPhotoUrl] = useState(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    // Validate on client side
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPG, PNG, and WebP images are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }

    setUploading(true);
    try {
      // Step 1: Upload to Cloudinary via /api/v1/uploads
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "profile-photos");
      const uploadRes = await fetch("/api/v1/uploads", {
        method: "POST",
        body: fd,
      });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) {
        toast.error(uploadJson.error || "Upload failed");
        return;
      }

      const url: string = uploadJson.data.url;

      // Step 2: Save URL to user profile
      const saveRes = await fetch("/api/v1/auth/profile-photo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl: url }),
      });
      const saveJson = await saveRes.json();
      if (!saveRes.ok) {
        toast.error(saveJson.error || "Failed to save photo");
        return;
      }

      setPhotoUrl(url);
      toast.success("Profile photo updated");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      const res = await fetch("/api/v1/auth/profile-photo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl: null }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to remove photo");
        return;
      }
      setPhotoUrl(null);
      toast.success("Profile photo removed");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setRemoving(false);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  }

  const busy = uploading || removing;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          <CardTitle>Profile Photo</CardTitle>
        </div>
        <CardDescription>
          Upload a profile photo. JPG, PNG, or WebP up to 5 MB.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* Avatar preview */}
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-border bg-muted">
            {photoUrl ? (
              <Image
                src={photoUrl}
                alt="Profile photo"
                fill
                className="object-cover"
                sizes="96px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-muted-foreground">
                ?
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="gap-2"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {photoUrl ? "Change Photo" : "Upload Photo"}
            </Button>

            {photoUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={handleRemove}
                className="gap-2 text-destructive hover:text-destructive"
              >
                {removing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Remove
              </Button>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onFileChange}
          />
        </div>
      </CardContent>
    </Card>
  );
}
