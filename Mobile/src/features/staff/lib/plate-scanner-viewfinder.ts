/** Screen share reserved for the floating close/title row. */
export const PLATE_SCANNER_HEADER_RESERVE = 0.10;

/**
 * Screen share reserved for the bottom HUD + tab bar.
 * Keep this ≥ real HUD height so the card never covers the viewfinder.
 */
export const PLATE_SCANNER_HUD_RESERVE = 0.42;

/** Shared viewfinder geometry — preview clip and OCR crop use the same ratios. */
export const PLATE_VIEWFINDER = {
  marginX: 0.1,
  width: 0.8,
  height: 0.24,
} as const;

/** Vertically centers the frame between header and HUD zones. */
export function getPlateViewfinderMarginTop(): number {
  const usable =
    1 - PLATE_SCANNER_HEADER_RESERVE - PLATE_SCANNER_HUD_RESERVE - PLATE_VIEWFINDER.height;
  return PLATE_SCANNER_HEADER_RESERVE + Math.max(usable, 0) / 2;
}

/** Bottom of the clear scan band (just above the HUD). */
export function getPlateViewfinderScanBandBottom(): number {
  return 1 - PLATE_SCANNER_HUD_RESERVE;
}

export function getPlateViewfinderFrameBottom(): number {
  return getPlateViewfinderMarginTop() + PLATE_VIEWFINDER.height;
}

export type ViewfinderCrop = {
  originX: number;
  originY: number;
  width: number;
  height: number;
};

/**
 * Crops the captured photo to match what the user sees inside the viewfinder.
 * Preview uses cover inside the clip box, so we center-crop horizontally with the same aspect ratio.
 */
export function resolveViewfinderCrop(imageWidth: number, imageHeight: number): ViewfinderCrop {
  const viewfinderAspect = PLATE_VIEWFINDER.width / PLATE_VIEWFINDER.height;
  const marginTop = getPlateViewfinderMarginTop();

  let cropHeight = Math.max(1, Math.round(imageHeight * PLATE_VIEWFINDER.height));
  let cropWidth = Math.max(1, Math.round(cropHeight * viewfinderAspect));

  if (cropWidth > imageWidth) {
    cropWidth = Math.max(1, Math.round(imageWidth * PLATE_VIEWFINDER.width));
    cropHeight = Math.max(1, Math.round(cropWidth / viewfinderAspect));
  }

  cropWidth = Math.min(cropWidth, imageWidth);
  cropHeight = Math.min(cropHeight, imageHeight);

  const originX = Math.max(0, Math.round((imageWidth - cropWidth) / 2));
  const originY = Math.max(0, Math.round(imageHeight * marginTop));

  return {
    originX,
    originY,
    width: cropWidth,
    height: cropHeight,
  };
}
