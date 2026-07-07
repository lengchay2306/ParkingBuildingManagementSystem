const OCR_SPACE_ENDPOINT = "https://api.ocr.space/parse/image";
const DEFAULT_CLOUD_KEY = "337599973a88957";

export type OcrScanResult =
  | { ok: true; text: string }
  | { ok: false; message: string };

function getCloudApiKey(): string {
  return import.meta.env.VITE_OCR_SPACE_API_KEY?.trim() || DEFAULT_CLOUD_KEY;
}

export async function recognizeImageWithOcrSpace(imageBlob: Blob): Promise<OcrScanResult> {
  try {
    const formData = new FormData();
    formData.append("apikey", getCloudApiKey());
    formData.append("language", "eng");
    formData.append("OCREngine", "2");
    formData.append("isOverlayRequired", "false");
    formData.append("detectOrientation", "true");
    formData.append("scale", "true");
    formData.append("file", imageBlob, "plate.jpg");

    const response = await fetch(OCR_SPACE_ENDPOINT, {
      method: "POST",
      body: formData,
    });

    if (response.status === 429) {
      return { ok: false, message: "OCR quá tải — thử lại sau vài giây." };
    }

    if (!response.ok) {
      return { ok: false, message: `OCR lỗi HTTP ${response.status}` };
    }

    const payload = (await response.json()) as {
      IsErroredOnProcessing?: boolean;
      ErrorMessage?: string | string[];
      ParsedResults?: Array<{ ParsedText?: string }>;
    };

    if (payload.IsErroredOnProcessing) {
      const message = Array.isArray(payload.ErrorMessage)
        ? payload.ErrorMessage.join(", ")
        : (payload.ErrorMessage ?? "OCR thất bại");
      return { ok: false, message };
    }

    const text =
      payload.ParsedResults?.map((item) => item.ParsedText ?? "").join("\n").trim() ?? "";

    if (!text) {
      return { ok: false, message: "Không đọc được chữ trên ảnh." };
    }

    return { ok: true, text };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Lỗi kết nối OCR.",
    };
  }
}
