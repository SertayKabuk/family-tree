import { mkdir, writeFile, unlink, readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { nanoid } from "nanoid";
import sharp from "sharp";
import { env } from "@/lib/env";
import {
  FILE_SIZE_LIMITS,
  formatSizeLimitMb,
} from "@/lib/upload-constraints";

const UPLOAD_DIR = env.UPLOAD_DIR;

export { FILE_SIZE_LIMITS } from "@/lib/upload-constraints";

export type MediaType = "profile" | "photos" | "documents" | "audio";

type ImageOptimizationPreset = "profile" | "photos" | "import";

export interface UploadResult {
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface PreparedUploadFile {
  buffer: Buffer;
  fileName: string;
  fileSize: number;
  mimeType: string;
  originalFileSize: number;
  optimized: boolean;
}

const IMAGE_OPTIMIZATION_PRESETS: Record<
  ImageOptimizationPreset,
  {
    maxOutputSize: number;
    maxWidth: number;
    maxHeight: number;
    qualitySteps: number[];
    scaleSteps: number[];
  }
> = {
  profile: {
    maxOutputSize: FILE_SIZE_LIMITS.profile,
    maxWidth: 1200,
    maxHeight: 1200,
    qualitySteps: [86, 78, 70, 62, 54],
    scaleSteps: [1, 0.85, 0.7],
  },
  photos: {
    maxOutputSize: FILE_SIZE_LIMITS.photos,
    maxWidth: 2200,
    maxHeight: 2200,
    qualitySteps: [86, 80, 74, 68, 60],
    scaleSteps: [1, 0.9, 0.8, 0.7],
  },
  import: {
    maxOutputSize: FILE_SIZE_LIMITS.photos,
    maxWidth: 2600,
    maxHeight: 2600,
    qualitySteps: [92, 86, 80, 74, 68],
    scaleSteps: [1, 0.92, 0.84, 0.76],
  },
};

const STATIC_OPTIMIZABLE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function getUploadPath(treeId: string, memberId: string, type: MediaType): string {
  return path.join(UPLOAD_DIR, treeId, memberId, type);
}

function sanitizeFileName(fileName: string): string {
  // Remove path traversal attempts and special characters
  return fileName.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 100);
}

function getFileExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "audio/mpeg": ".mp3",
    "audio/wav": ".wav",
    "audio/webm": ".webm",
    "audio/ogg": ".ogg",
  };
  return extensions[mimeType] || "";
}

export async function uploadFile(
  treeId: string,
  memberId: string,
  type: MediaType,
  file: File | PreparedUploadFile
): Promise<UploadResult> {
  const uploadPath = getUploadPath(treeId, memberId, type);

  // Ensure directory exists
  if (!existsSync(uploadPath)) {
    await mkdir(uploadPath, { recursive: true });
  }

  const preparedFile =
    file instanceof File
      ? {
          buffer: Buffer.from(await file.arrayBuffer()),
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          originalFileSize: file.size,
          optimized: false,
        }
      : file;

  // Generate unique filename
  const extension =
    getFileExtension(preparedFile.mimeType) || path.extname(preparedFile.fileName);
  const uniqueName = `${nanoid(12)}${extension}`;
  const fullPath = path.join(uploadPath, uniqueName);

  await writeFile(fullPath, preparedFile.buffer);

  // Return relative path for storage in database
  const relativePath = path.join(treeId, memberId, type, uniqueName);

  return {
    filePath: relativePath.replace(/\\/g, "/"), // Normalize path separators
    fileName: sanitizeFileName(preparedFile.fileName),
    fileSize: preparedFile.fileSize,
    mimeType: preparedFile.mimeType,
  };
}

export async function optimizeImageUpload(
  file: File,
  presetName: ImageOptimizationPreset
): Promise<PreparedUploadFile> {
  const inputBuffer = Buffer.from(await file.arrayBuffer());
  const preset = IMAGE_OPTIMIZATION_PRESETS[presetName];
  const fallbackUpload: PreparedUploadFile = {
    buffer: inputBuffer,
    fileName: file.name,
    fileSize: inputBuffer.length,
    mimeType: file.type,
    originalFileSize: file.size,
    optimized: false,
  };

  if (!STATIC_OPTIMIZABLE_IMAGE_TYPES.has(file.type)) {
    if (inputBuffer.length <= preset.maxOutputSize) {
      return fallbackUpload;
    }

    throw new Error(
      `Image could not be optimized below ${formatSizeLimitMb(preset.maxOutputSize)}MB. Please crop or resize it and try again.`
    );
  }

  const metadata = await sharp(inputBuffer, { animated: true }).metadata();
  if ((metadata.pages ?? 1) > 1) {
    if (inputBuffer.length <= preset.maxOutputSize) {
      return fallbackUpload;
    }

    throw new Error(
      `Animated images must be under ${formatSizeLimitMb(preset.maxOutputSize)}MB. Please reduce the file size and try again.`
    );
  }

  let bestCandidate: Buffer | null = null;

  for (const scale of preset.scaleSteps) {
    const width = Math.max(640, Math.round(preset.maxWidth * scale));
    const height = Math.max(640, Math.round(preset.maxHeight * scale));

    for (const quality of preset.qualitySteps) {
      const candidate = await sharp(inputBuffer)
        .rotate()
        .resize({
          width,
          height,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality, effort: 4 })
        .toBuffer();

      if (!bestCandidate || candidate.length < bestCandidate.length) {
        bestCandidate = candidate;
      }

      if (candidate.length <= preset.maxOutputSize) {
        return {
          buffer: candidate,
          fileName: file.name,
          fileSize: candidate.length,
          mimeType: "image/webp",
          originalFileSize: file.size,
          optimized: true,
        };
      }
    }
  }

  if (inputBuffer.length <= preset.maxOutputSize && (!bestCandidate || bestCandidate.length >= inputBuffer.length)) {
    return fallbackUpload;
  }

  throw new Error(
    `Image could not be optimized below ${formatSizeLimitMb(preset.maxOutputSize)}MB. Please crop or resize it and try again.`
  );
}

export async function deleteFile(filePath: string): Promise<void> {
  const fullPath = path.join(UPLOAD_DIR, filePath);

  try {
    if (existsSync(fullPath)) {
      await unlink(fullPath);
    }
  } catch (error) {
    console.error("Error deleting file:", error);
    // Don't throw - file might already be deleted
  }
}

export async function getFile(filePath: string): Promise<Buffer | null> {
  const fullPath = path.join(UPLOAD_DIR, filePath);

  try {
    if (existsSync(fullPath)) {
      return await readFile(fullPath);
    }
    return null;
  } catch (error) {
    console.error("Error reading file:", error);
    return null;
  }
}

export function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".webm": "audio/webm",
    ".ogg": "audio/ogg",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

// Validate file types
export function isValidImageType(mimeType: string): boolean {
  return ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mimeType);
}

export function isValidDocumentType(mimeType: string): boolean {
  return [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ].includes(mimeType);
}

export function isValidAudioType(mimeType: string): boolean {
  return ["audio/mpeg", "audio/wav", "audio/webm", "audio/ogg"].includes(mimeType);
}
