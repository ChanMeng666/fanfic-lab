"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Crop, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getCroppedBlob, type PixelArea } from "@/lib/canvas-crop";
import { toast } from "sonner";
import { formatError } from "@/lib/format-error";

interface AvatarCropDialogProps {
  /**
   * Source File the user picked. The dialog renders this as an object URL
   * inside react-easy-crop so the user can position a 1:1 crop window.
   */
  file: File | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Called with the cropped JPEG blob when the user confirms. The parent
   * is responsible for uploading it; the dialog only handles cropping.
   */
  onConfirm: (blob: Blob) => Promise<void> | void;
}

export function AvatarCropDialog({
  file,
  open,
  onOpenChange,
  onConfirm,
}: AvatarCropDialogProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<PixelArea | null>(null);
  const [working, setWorking] = useState(false);

  // Build / dispose object URL with the file. Resetting crop / zoom on each
  // new file avoids leaking the previous picture's framing into the next.
  useEffect(() => {
    if (!file) {
      setImageSrc(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea(null);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedArea(areaPixels);
  }, []);

  async function handleConfirm() {
    if (!imageSrc || !croppedArea) return;
    setWorking(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedArea, 512);
      await onConfirm(blob);
      onOpenChange(false);
    } catch (err) {
      toast.error(formatError(err, "裁剪失败"));
    } finally {
      setWorking(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (working) return;
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crop className="size-4 text-primary" />
            调整头像
          </DialogTitle>
          <DialogDescription>
            拖动图片选择头像位置，滚轮或滑块缩放。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative h-64 w-full bg-muted rounded-xl overflow-hidden">
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>

          <div className="space-y-1">
            <label
              htmlFor="zoom"
              className="text-xs text-muted-foreground flex items-center justify-between"
            >
              <span>缩放</span>
              <span className="font-mono">{zoom.toFixed(2)}×</span>
            </label>
            <input
              id="zoom"
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-primary"
              aria-label="缩放"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={working}
            className="gap-1.5"
          >
            <X className="size-3.5" />
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={working || !croppedArea}
            className="gap-1.5"
          >
            <Check className="size-3.5" />
            {working ? "处理中…" : "应用"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
