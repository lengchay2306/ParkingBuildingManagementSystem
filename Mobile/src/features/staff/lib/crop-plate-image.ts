import * as ImageManipulator from "expo-image-manipulator";

import { resolveViewfinderCrop } from "@/features/staff/lib/plate-scanner-viewfinder";

export async function cropImageToViewfinder(
  uri: string,
  imageWidth: number,
  imageHeight: number,
): Promise<string> {
  if (!imageWidth || !imageHeight || imageWidth < 32 || imageHeight < 32) {
    return uri;
  }

  try {
    const crop = resolveViewfinderCrop(imageWidth, imageHeight);
    if (crop.width < 8 || crop.height < 8) {
      return uri;
    }

    const result = await ImageManipulator.manipulateAsync(uri, [{ crop }], {
      compress: 0.85,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return result.uri;
  } catch {
    return uri;
  }
}
