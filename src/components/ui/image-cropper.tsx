"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, RefreshCw, RotateCw } from "lucide-react";

type Rect = { x: number; y: number; w: number; h: number };

type DragMode =
  | "move"
  | "nw"
  | "ne"
  | "sw"
  | "se"
  | null;

const MIN_PCT = 5;

/**
 * Lightweight image cropper. Shows a draggable / resizable rectangle over
 * the source image and returns a cropped JPEG blob.
 */
export function ImageCropper({
  src,
  onCrop,
  onCancel,
  aspect,
}: {
  src: string;
  onCrop: (blob: Blob) => void;
  onCancel: () => void;
  /** Optional fixed aspect ratio (w/h). If omitted, crop is free-form. */
  aspect?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Crop rectangle stored in % of the rendered image area.
  const [rect, setRect] = useState<Rect>({ x: 10, y: 10, w: 80, h: 80 });
  const [drag, setDrag] = useState<{
    mode: DragMode;
    startX: number;
    startY: number;
    startRect: Rect;
  } | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    if (!imgLoaded) return;
    if (aspect) {
      // Center a crop that fits the aspect ratio inside the image.
      const img = imgRef.current;
      if (!img) return;
      const iw = img.clientWidth;
      const ih = img.clientHeight;
      if (!iw || !ih) return;
      const imgAspect = iw / ih;
      let w = 80;
      let h = 80;
      if (aspect > imgAspect) {
        w = 90;
        h = (w * imgAspect) / aspect;
      } else {
        h = 90;
        w = (h * aspect) / imgAspect;
      }
      setRect({ x: (100 - w) / 2, y: (100 - h) / 2, w, h });
    }
  }, [imgLoaded, aspect]);

  function clientToPct(clientX: number, clientY: number) {
    const img = imgRef.current;
    if (!img) return { x: 0, y: 0 };
    const r = img.getBoundingClientRect();
    return {
      x: ((clientX - r.left) / r.width) * 100,
      y: ((clientY - r.top) / r.height) * 100,
    };
  }

  function onPointerDown(mode: DragMode) {
    return (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as Element).setPointerCapture?.(e.pointerId);
      const p = clientToPct(e.clientX, e.clientY);
      setDrag({
        mode,
        startX: p.x,
        startY: p.y,
        startRect: { ...rect },
      });
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag) return;
    const p = clientToPct(e.clientX, e.clientY);
    const dx = p.x - drag.startX;
    const dy = p.y - drag.startY;
    const s = drag.startRect;
    let next: Rect = { ...s };

    if (drag.mode === "move") {
      next.x = clamp(s.x + dx, 0, 100 - s.w);
      next.y = clamp(s.y + dy, 0, 100 - s.h);
    } else {
      // Resize from a corner. Compute new bounds, then enforce min size + image bounds.
      let left = s.x;
      let top = s.y;
      let right = s.x + s.w;
      let bottom = s.y + s.h;

      if (drag.mode === "nw") {
        left = clamp(s.x + dx, 0, right - MIN_PCT);
        top = clamp(s.y + dy, 0, bottom - MIN_PCT);
      } else if (drag.mode === "ne") {
        right = clamp(s.x + s.w + dx, left + MIN_PCT, 100);
        top = clamp(s.y + dy, 0, bottom - MIN_PCT);
      } else if (drag.mode === "sw") {
        left = clamp(s.x + dx, 0, right - MIN_PCT);
        bottom = clamp(s.y + s.h + dy, top + MIN_PCT, 100);
      } else if (drag.mode === "se") {
        right = clamp(s.x + s.w + dx, left + MIN_PCT, 100);
        bottom = clamp(s.y + s.h + dy, top + MIN_PCT, 100);
      }

      next = { x: left, y: top, w: right - left, h: bottom - top };

      if (aspect && imgRef.current) {
        const iw = imgRef.current.clientWidth;
        const ih = imgRef.current.clientHeight;
        // Lock aspect: keep width, derive height (in image-pixel space).
        const pxW = (next.w / 100) * iw;
        const pxH = pxW / aspect;
        const pctH = (pxH / ih) * 100;
        if (drag.mode === "nw" || drag.mode === "ne") {
          // Anchor bottom
          const bot = next.y + next.h;
          next.h = pctH;
          next.y = clamp(bot - pctH, 0, 100 - pctH);
        } else {
          // Anchor top
          next.h = clamp(pctH, MIN_PCT, 100 - next.y);
        }
      }
    }
    setRect(next);
  }

  function onPointerUp() {
    setDrag(null);
  }

  async function doCrop() {
    const img = imgRef.current;
    if (!img) return;
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    const sx = Math.round((rect.x / 100) * natW);
    const sy = Math.round((rect.y / 100) * natH);
    const sw = Math.round((rect.w / 100) * natW);
    const sh = Math.round((rect.h / 100) * natH);

    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    canvas.toBlob(
      (blob) => {
        if (blob) onCrop(blob);
      },
      "image/jpeg",
      0.92
    );
  }

  function resetCrop() {
    setRect({ x: 5, y: 5, w: 90, h: 90 });
  }

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="relative w-full max-w-md select-none overflow-hidden rounded-md border bg-black/90"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={src}
          alt="Captured"
          className="block w-full"
          onLoad={() => setImgLoaded(true)}
          draggable={false}
        />
        {imgLoaded && (
          <>
            {/* Dim overlay outside crop box */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: `linear-gradient(rgba(0,0,0,.5),rgba(0,0,0,.5))`,
                clipPath: `polygon(
                  0 0, 100% 0, 100% 100%, 0 100%, 0 0,
                  ${rect.x}% ${rect.y}%,
                  ${rect.x}% ${rect.y + rect.h}%,
                  ${rect.x + rect.w}% ${rect.y + rect.h}%,
                  ${rect.x + rect.w}% ${rect.y}%,
                  ${rect.x}% ${rect.y}%
                )`,
              }}
            />
            {/* Crop rectangle */}
            <div
              className="absolute cursor-move border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,.4)]"
              style={{
                left: `${rect.x}%`,
                top: `${rect.y}%`,
                width: `${rect.w}%`,
                height: `${rect.h}%`,
              }}
              onPointerDown={onPointerDown("move")}
            >
              {/* Corner handles */}
              <Handle pos="nw" onDown={onPointerDown("nw")} />
              <Handle pos="ne" onDown={onPointerDown("ne")} />
              <Handle pos="sw" onDown={onPointerDown("sw")} />
              <Handle pos="se" onDown={onPointerDown("se")} />
            </div>
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={doCrop}>
          <Check className="h-4 w-4" /> Save Crop
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={resetCrop}>
          <RotateCw className="h-4 w-4" /> Reset
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          <RefreshCw className="h-4 w-4" /> Retake
        </Button>
      </div>
    </div>
  );
}

function Handle({
  pos,
  onDown,
}: {
  pos: "nw" | "ne" | "sw" | "se";
  onDown: (e: React.PointerEvent) => void;
}) {
  const map: Record<string, string> = {
    nw: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize",
    ne: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize",
    sw: "left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize",
    se: "right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize",
  };
  return (
    <div
      onPointerDown={onDown}
      className={`absolute h-3 w-3 rounded-sm border border-black bg-white ${map[pos]}`}
    />
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
