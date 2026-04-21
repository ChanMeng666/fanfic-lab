/**
 * Crop helpers built on top of the browser canvas API.
 *
 * react-easy-crop tells us the pixel rectangle the user picked; we read
 * the source image, draw that rectangle onto an offscreen canvas, and
 * export it as a square Blob the upload route can accept directly.
 */

export interface PixelArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("无法读取图片"));
    img.src = src;
  });
}

/**
 * Crop the pixel rectangle out of `imageSrc` and return a square JPEG blob
 * sized to `outputSize` x `outputSize`. We always emit JPEG to keep the
 * payload small and consistent with the existing avatar pipeline.
 */
export async function getCroppedBlob(
  imageSrc: string,
  area: PixelArea,
  outputSize = 512,
  quality = 0.92
): Promise<Blob> {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("浏览器不支持 canvas");

  ctx.drawImage(
    img,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    outputSize,
    outputSize
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("裁剪失败"));
      },
      "image/jpeg",
      quality
    );
  });
}
