/** Shared viewfinder geometry — preview clip and OCR crop use the same ratios. */
export const PLATE_VIEWFINDER = {
  marginX: 0.12,
  marginY: 0.32,
  width: 0.76,
  height: 0.36,
} as const;

export type ViewfinderCrop = {
  originX: number;
  originY: number;
  width: number;
  height: number;
};

/**
 * Crops the captured photo to match what the user sees inside the viewfinder.
 * Preview uses cover inside the clip box, so we center-crop with the same aspect ratio.
 */
export function resolveViewfinderCrop(imageWidth: number, imageHeight: number): ViewfinderCrop {
  const viewfinderAspect = PLATE_VIEWFINDER.width / PLATE_VIEWFINDER.height;

  let cropHeight = Math.max(1, Math.round(imageHeight * PLATE_VIEWFINDER.height));
  let cropWidth = Math.max(1, Math.round(cropHeight * viewfinderAspect));

  if (cropWidth > imageWidth) {
    cropWidth = Math.max(1, Math.round(imageWidth * PLATE_VIEWFINDER.width));
    cropHeight = Math.max(1, Math.round(cropWidth / viewfinderAspect));
  }

  cropWidth = Math.min(cropWidth, imageWidth);
  cropHeight = Math.min(cropHeight, imageHeight);

  const originX = Math.max(0, Math.round((imageWidth - cropWidth) / 2));
  const originY = Math.max(0, Math.round((imageHeight - cropHeight) / 2));

  return {
    originX,
    originY,
    width: cropWidth,
    height: cropHeight,
  };
}
