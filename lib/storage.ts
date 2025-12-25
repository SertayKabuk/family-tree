import { mkdir, writeFile, unlink, readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { nanoid } from "nanoid";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

export type MediaType = "profile" | "photos" | "documents" | "audio";

export interface UploadResult {
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

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
  file: File
): Promise<UploadResult> {
  const uploadPath = getUploadPath(treeId, memberId, type);

  // Ensure directory exists
  if (!existsSync(uploadPath)) {
    await mkdir(uploadPath, { recursive: true });
  }

  // Generate unique filename
  const extension = getFileExtension(file.type) || path.extname(file.name);
  const uniqueName = `${nanoid(12)}${extension}`;
  const fullPath = path.join(uploadPath, uniqueName);

  // Convert File to Buffer and write
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(fullPath, buffer);

  // Return relative path for storage in database
  const relativePath = path.join(treeId, memberId, type, uniqueName);

  return {
    filePath: relativePath.replace(/\\/g, "/"), // Normalize path separators
    fileName: sanitizeFileName(file.name),
    fileSize: file.size,
    mimeType: file.type,
  };
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

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  profile: 4 * 1024 * 1024, // 4MB
  photos: 8 * 1024 * 1024, // 8MB
  documents: 16 * 1024 * 1024, // 16MB
  audio: 32 * 1024 * 1024, // 32MB
};
