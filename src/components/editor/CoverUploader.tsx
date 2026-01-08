"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, X, ImageIcon, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CoverUploaderProps {
  storyId: string;
  onUploadComplete: (url: string) => void;
  onUploadError?: (error: string) => void;
  existingCoverUrl?: string;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function CoverUploader({
  storyId,
  onUploadComplete,
  onUploadError,
  existingCoverUrl,
}: CoverUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingCoverUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(!!existingCoverUrl);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Please upload a JPG, PNG, or WebP image";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "Image must be less than 5MB";
    }
    return null;
  };

  const handleFile = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        onUploadError?.(validationError);
        return;
      }

      setError(null);
      setIsUploading(true);
      setUploadComplete(false);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      try {
        // Upload to Cloudinary via API route
        const formData = new FormData();
        formData.append("file", file);
        formData.append("storyId", storyId);

        const response = await fetch("/api/upload/cover", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Upload failed");
        }

        const data = await response.json();
        setUploadComplete(true);
        onUploadComplete(data.url);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setError(message);
        onUploadError?.(message);
        setPreviewUrl(null);
      } finally {
        setIsUploading(false);
      }
    },
    [storyId, onUploadComplete, onUploadError]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleRemove = () => {
    setPreviewUrl(null);
    setUploadComplete(false);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    // Notify parent that cover was removed
    onUploadComplete("");
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">
        Cover Image <span className="text-destructive">*</span>
      </label>

      {previewUrl ? (
        // Preview state
        <div className="relative">
          <div className="aspect-[2/3] max-w-[180px] mx-auto rounded-xl overflow-hidden border border-border bg-surface">
            <img
              src={previewUrl}
              alt="Cover preview"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Status overlay */}
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl max-w-[180px] mx-auto aspect-[2/3]">
              <div className="text-center text-white">
                <Loader2 className="size-8 animate-spin mx-auto mb-2" />
                <p className="text-sm">Uploading...</p>
              </div>
            </div>
          )}

          {uploadComplete && !isUploading && (
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-success text-white px-2 py-1 rounded-full text-xs" style={{ right: "calc(50% - 90px + 8px)" }}>
              <Check className="size-3" />
              Ready
            </div>
          )}

          {/* Remove button */}
          {!isUploading && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute top-2 size-7 p-0"
              style={{ left: "calc(50% - 90px + 8px)" }}
              onClick={handleRemove}
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      ) : (
        // Upload zone
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "aspect-[2/3] max-w-[180px] mx-auto rounded-xl border-2 border-dashed",
            "flex flex-col items-center justify-center cursor-pointer transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-surface",
            error && "border-destructive bg-destructive/5"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            onChange={handleInputChange}
            className="hidden"
          />

          <div className="flex items-center justify-center size-12 rounded-xl bg-secondary mb-3">
            <ImageIcon className="size-6 text-muted-foreground" />
          </div>

          <p className="text-sm font-medium text-foreground mb-1">
            {isDragging ? "Drop image here" : "Upload cover"}
          </p>
          <p className="text-xs text-muted-foreground text-center px-4">
            Drag & drop or click
            <br />
            JPG, PNG, WebP (max 5MB)
          </p>
        </div>
      )}

      {/* Error message */}
      {error && <p className="text-sm text-destructive text-center">{error}</p>}

      {/* Dimension hint */}
      <p className="text-xs text-muted-foreground text-center">
        Recommended: 600 x 900 pixels (2:3 ratio)
      </p>
    </div>
  );
}
