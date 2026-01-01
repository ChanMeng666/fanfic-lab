/**
 * Cloudinary Integration for FanFic Lab
 * Handles image upload, transformation, and management
 */

import { v2 as cloudinary, UploadApiResponse } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export type ImageType = "cover" | "portrait" | "illustration" | "avatar";

interface UploadOptions {
  type: ImageType;
  storyId?: string;
  characterId?: string;
  userId?: string;
}

interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
}

/**
 * Upload an image to Cloudinary
 */
export async function uploadImage(
  imageData: string | Buffer,
  options: UploadOptions
): Promise<UploadResult> {
  const folder = getFolderPath(options);

  const uploadOptions = {
    folder,
    resource_type: "image" as const,
    transformation: getTransformations(options.type),
    tags: [options.type],
    ...getPublicIdOptions(options),
  };

  let result: UploadApiResponse;

  if (typeof imageData === "string" && imageData.startsWith("data:")) {
    // Base64 encoded image
    result = await cloudinary.uploader.upload(imageData, uploadOptions);
  } else if (typeof imageData === "string") {
    // URL
    result = await cloudinary.uploader.upload(imageData, uploadOptions);
  } else {
    // Buffer - convert to base64
    const base64 = `data:image/png;base64,${imageData.toString("base64")}`;
    result = await cloudinary.uploader.upload(base64, uploadOptions);
  }

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
  };
}

/**
 * Delete an image from Cloudinary
 */
export async function deleteImage(publicId: string): Promise<boolean> {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === "ok";
  } catch (error) {
    console.error("Failed to delete image:", error);
    return false;
  }
}

/**
 * Generate a signed URL for secure upload
 */
export function generateUploadSignature(options: UploadOptions): {
  signature: string;
  timestamp: number;
  cloudName: string;
  apiKey: string;
  folder: string;
} {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const folder = getFolderPath(options);

  const paramsToSign = {
    timestamp,
    folder,
    tags: options.type,
  };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET!
  );

  return {
    signature,
    timestamp,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    folder,
  };
}

/**
 * Get optimized image URL with transformations
 */
export function getOptimizedUrl(
  publicId: string,
  options?: {
    width?: number;
    height?: number;
    crop?: "fill" | "fit" | "scale" | "thumb";
    quality?: "auto" | number;
    format?: "auto" | "webp" | "jpg" | "png";
  }
): string {
  return cloudinary.url(publicId, {
    transformation: [
      {
        width: options?.width,
        height: options?.height,
        crop: options?.crop || "fill",
        quality: options?.quality || "auto",
        fetch_format: options?.format || "auto",
      },
    ],
    secure: true,
  });
}

/**
 * Get thumbnail URL for an image
 */
export function getThumbnailUrl(publicId: string, size: number = 150): string {
  return cloudinary.url(publicId, {
    transformation: [
      {
        width: size,
        height: size,
        crop: "fill",
        gravity: "face",
        quality: "auto",
        fetch_format: "auto",
      },
    ],
    secure: true,
  });
}

/**
 * Get cover image URL with standard dimensions
 */
export function getCoverUrl(publicId: string): string {
  return cloudinary.url(publicId, {
    transformation: [
      {
        width: 600,
        height: 900,
        crop: "fill",
        gravity: "auto",
        quality: "auto:good",
        fetch_format: "auto",
      },
    ],
    secure: true,
  });
}

/**
 * Get character portrait URL
 */
export function getPortraitUrl(publicId: string, size: "small" | "medium" | "large" = "medium"): string {
  const sizes = {
    small: 200,
    medium: 400,
    large: 800,
  };

  return cloudinary.url(publicId, {
    transformation: [
      {
        width: sizes[size],
        height: sizes[size],
        crop: "fill",
        gravity: "face",
        quality: "auto:good",
        fetch_format: "auto",
      },
    ],
    secure: true,
  });
}

// Helper functions

function getFolderPath(options: UploadOptions): string {
  const basePath = "fanfic-lab";

  switch (options.type) {
    case "cover":
      return `${basePath}/covers${options.storyId ? `/${options.storyId}` : ""}`;
    case "portrait":
      return `${basePath}/portraits${options.characterId ? `/${options.characterId}` : ""}`;
    case "illustration":
      return `${basePath}/illustrations${options.storyId ? `/${options.storyId}` : ""}`;
    case "avatar":
      return `${basePath}/avatars${options.userId ? `/${options.userId}` : ""}`;
    default:
      return `${basePath}/misc`;
  }
}

function getTransformations(type: ImageType) {
  switch (type) {
    case "cover":
      return [
        { width: 600, height: 900, crop: "fill", gravity: "auto" },
        { quality: "auto:good", fetch_format: "auto" },
      ];
    case "portrait":
      return [
        { width: 512, height: 512, crop: "fill", gravity: "face" },
        { quality: "auto:good", fetch_format: "auto" },
      ];
    case "illustration":
      return [
        { width: 1200, height: 800, crop: "fit" },
        { quality: "auto:good", fetch_format: "auto" },
      ];
    case "avatar":
      return [
        { width: 200, height: 200, crop: "fill", gravity: "face" },
        { quality: "auto:good", fetch_format: "auto" },
      ];
    default:
      return [{ quality: "auto", fetch_format: "auto" }];
  }
}

function getPublicIdOptions(options: UploadOptions): { public_id?: string } {
  if (options.type === "avatar" && options.userId) {
    return { public_id: `avatar_${options.userId}` };
  }
  return {};
}

// Export cloudinary instance for advanced usage
export { cloudinary };
